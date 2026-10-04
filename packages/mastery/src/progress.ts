/**
 * The learner's progress as one versioned JSON document, plus a storage interface.
 *
 * Progress lives in the browser and moves between devices as an exported file, so every
 * load is untrusted input: a truncated file, a hand edit, a file from a newer build. Import
 * therefore never throws. It returns a result with every problem found, so the UI can say
 * exactly what is wrong instead of losing the learner's history to a crash.
 */
import type { MemoryState } from './memory';
import { withDefaults } from './options';
import type { PlacementAnswer } from './placement';

/** Bump when the shape changes, and add the migration from the previous version. */
export const PROGRESS_VERSION = 1;

export interface Settings {
  budgetMinutes: number;
  implicitCredit: boolean;
}

export const DEFAULT_SETTINGS: Readonly<Settings> = { budgetMinutes: 60, implicitCredit: true };

export const HISTORY_KINDS = ['placement', 'lesson', 'review', 'quiz'] as const;
export type HistoryKind = (typeof HISTORY_KINDS)[number];

export interface HistoryEntry {
  /** ms since the epoch. */
  at: number;
  kind: HistoryKind;
  topicId: string;
  correct: boolean;
}

export interface Progress {
  version: typeof PROGRESS_VERSION;
  courseId: string;
  createdAt: number;
  updatedAt: number;
  settings: Settings;
  /** Null until placement starts. */
  placement: { answers: PlacementAnswer[]; done: boolean } | null;
  memory: Record<string, MemoryState>;
  learnedSinceQuiz: string[];
  history: HistoryEntry[];
}

export type Result<T> =
  | { ok: true; value: T; warnings: string[] }
  | { ok: false; errors: string[] };

/** Upgrades a document from version n to n + 1. May throw; import catches it. */
export type Migration = (doc: Record<string, unknown>) => Record<string, unknown>;

/** Version n to the migration from n to n + 1. Empty while version 1 is the only one. */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {};

export interface ImportOptions {
  /** Topic ids in the current course. Memory for other ids is dropped with a warning (a topic was removed). */
  knownTopicIds?: Iterable<string>;
  migrations?: Readonly<Record<number, Migration>>;
  /** Larger input is rejected before parsing. */
  maxBytes?: number;
}

/** Ten times a year of daily history; a real file is far smaller. */
export const MAX_IMPORT_BYTES = 20_000_000;

export function newProgress(courseId: string, now: number, settings: Partial<Settings> = {}): Progress {
  return {
    version: PROGRESS_VERSION, courseId, createdAt: now, updatedAt: now,
    settings: withDefaults(DEFAULT_SETTINGS, settings), placement: null, memory: {}, learnedSinceQuiz: [], history: [],
  };
}

/** Pretty-printed, so an exported file can be read and diffed by hand. */
export function exportProgress(p: Readonly<Progress>): string {
  return `${JSON.stringify(p, null, 2)}\n`;
}

// Same shape as the graph's topic ids. Also rules out "__proto__" as a memory key, which
// would otherwise set the record's prototype when copied.
const TOPIC_ID_RE = /^[a-z][a-z0-9]*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)+$/;

type Obj = Record<string, unknown>;

const isObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x);
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const isNat = (x: unknown): x is number => Number.isInteger(x) && (x as number) >= 0;
const show = (x: unknown): string => {
  if (typeof x === 'string') return JSON.stringify(x.length > 40 ? `${x.slice(0, 40)}...` : x);
  if (Array.isArray(x)) return 'an array';
  if (x === null) return 'null';
  return typeof x === 'object' ? 'an object' : String(x);
};

/** Collects every problem rather than stopping at the first, so one import shows them all. */
class Checker {
  readonly errors: string[] = [];
  readonly warnings: string[] = [];

  need(ok: boolean, path: string, what: string, got: unknown): boolean {
    if (!ok) this.errors.push(`${path}: expected ${what}, got ${show(got)}`);
    return ok;
  }

  extraKeys(o: Obj, allowed: readonly string[], path: string): void {
    for (const k of Object.keys(o)) if (!allowed.includes(k)) this.warnings.push(`${path}.${k}: unknown field, ignored`);
  }
}

const MEMORY_KEYS = ['reps', 'intervalDays', 'due', 'lastReviewed', 'lapses', 'implicitCredit'] as const;

function checkMemoryState(c: Checker, x: unknown, path: string): MemoryState | null {
  if (!c.need(isObj(x), path, 'an object', x)) return null;
  const o = x as Obj;
  c.extraKeys(o, MEMORY_KEYS, path);
  const ok = [
    c.need(isNat(o.reps), `${path}.reps`, 'a non-negative integer', o.reps),
    c.need(isNum(o.intervalDays) && o.intervalDays > 0, `${path}.intervalDays`, 'a positive number', o.intervalDays),
    c.need(isNum(o.due), `${path}.due`, 'a time in ms', o.due),
    c.need(isNum(o.lastReviewed), `${path}.lastReviewed`, 'a time in ms', o.lastReviewed),
    c.need(isNat(o.lapses), `${path}.lapses`, 'a non-negative integer', o.lapses),
    c.need(isNum(o.implicitCredit) && o.implicitCredit >= 0 && o.implicitCredit < 1, `${path}.implicitCredit`, 'a number in [0, 1)', o.implicitCredit),
  ].every(Boolean);
  if (!ok) return null;
  return {
    reps: o.reps as number, intervalDays: o.intervalDays as number, due: o.due as number,
    lastReviewed: o.lastReviewed as number, lapses: o.lapses as number, implicitCredit: o.implicitCredit as number,
  };
}

function checkId(c: Checker, x: unknown, path: string): x is string {
  return c.need(typeof x === 'string' && TOPIC_ID_RE.test(x), path, 'a topic id like "prob.bayes-formula"', x);
}

function checkV1(c: Checker, d: Obj, known: ReadonlySet<string> | null): Progress | null {
  const TOP = ['version', 'courseId', 'createdAt', 'updatedAt', 'settings', 'placement', 'memory', 'learnedSinceQuiz', 'history'];
  c.extraKeys(d, TOP, '$');
  c.need(typeof d.courseId === 'string' && d.courseId.trim() !== '' && d.courseId.length <= 200, '$.courseId', 'a non-empty string', d.courseId);
  c.need(isNum(d.createdAt), '$.createdAt', 'a time in ms', d.createdAt);
  c.need(isNum(d.updatedAt), '$.updatedAt', 'a time in ms', d.updatedAt);

  let settings: Settings = { ...DEFAULT_SETTINGS };
  if (c.need(isObj(d.settings), '$.settings', 'an object', d.settings)) {
    const s = d.settings as Obj;
    c.extraKeys(s, ['budgetMinutes', 'implicitCredit'], '$.settings');
    c.need(isNum(s.budgetMinutes) && s.budgetMinutes > 0 && s.budgetMinutes <= 24 * 60, '$.settings.budgetMinutes', 'minutes in (0, 1440]', s.budgetMinutes);
    c.need(typeof s.implicitCredit === 'boolean', '$.settings.implicitCredit', 'true or false', s.implicitCredit);
    settings = { budgetMinutes: s.budgetMinutes as number, implicitCredit: s.implicitCredit as boolean };
  }

  let placement: Progress['placement'] = null;
  if (d.placement !== null && c.need(isObj(d.placement), '$.placement', 'an object or null', d.placement)) {
    const p = d.placement as Obj;
    c.extraKeys(p, ['answers', 'done'], '$.placement');
    c.need(typeof p.done === 'boolean', '$.placement.done', 'true or false', p.done);
    const answers: PlacementAnswer[] = [];
    if (c.need(Array.isArray(p.answers), '$.placement.answers', 'an array', p.answers)) {
      (p.answers as unknown[]).forEach((a, i) => {
        const path = `$.placement.answers[${i}]`;
        if (!c.need(isObj(a), path, 'an object', a)) return;
        const o = a as Obj;
        c.extraKeys(o, ['topicId', 'correct', 'at'], path);
        const ok = [
          checkId(c, o.topicId, `${path}.topicId`),
          c.need(typeof o.correct === 'boolean', `${path}.correct`, 'true or false', o.correct),
          c.need(isNum(o.at), `${path}.at`, 'a time in ms', o.at),
        ].every(Boolean);
        if (ok) answers.push({ topicId: o.topicId as string, correct: o.correct as boolean, at: o.at as number });
      });
    }
    placement = { answers, done: p.done as boolean };
  }

  const memory: Record<string, MemoryState> = {};
  if (c.need(isObj(d.memory), '$.memory', 'an object', d.memory)) {
    for (const [id, s] of Object.entries(d.memory as Obj)) {
      const path = `$.memory[${JSON.stringify(id)}]`;
      if (!checkId(c, id, `${path} key`)) continue;
      const m = checkMemoryState(c, s, path);
      if (m === null) continue;
      if (known !== null && !known.has(id)) {
        c.warnings.push(`${path}: not in this course, dropped`);
        continue;
      }
      memory[id] = m;
    }
  }

  const learnedSinceQuiz: string[] = [];
  if (c.need(Array.isArray(d.learnedSinceQuiz), '$.learnedSinceQuiz', 'an array', d.learnedSinceQuiz)) {
    (d.learnedSinceQuiz as unknown[]).forEach((id, i) => {
      if (!checkId(c, id, `$.learnedSinceQuiz[${i}]`)) return;
      if (known !== null && !known.has(id)) c.warnings.push(`$.learnedSinceQuiz[${i}]: not in this course, dropped`);
      else learnedSinceQuiz.push(id);
    });
  }

  const history: HistoryEntry[] = [];
  if (c.need(Array.isArray(d.history), '$.history', 'an array', d.history)) {
    (d.history as unknown[]).forEach((h, i) => {
      const path = `$.history[${i}]`;
      if (!c.need(isObj(h), path, 'an object', h)) return;
      const o = h as Obj;
      c.extraKeys(o, ['at', 'kind', 'topicId', 'correct'], path);
      const ok = [
        c.need(isNum(o.at), `${path}.at`, 'a time in ms', o.at),
        c.need((HISTORY_KINDS as readonly unknown[]).includes(o.kind), `${path}.kind`, HISTORY_KINDS.join(', '), o.kind),
        // History is a log: entries for removed topics stay, they are still what happened.
        checkId(c, o.topicId, `${path}.topicId`),
        c.need(typeof o.correct === 'boolean', `${path}.correct`, 'true or false', o.correct),
      ].every(Boolean);
      if (ok) history.push({ at: o.at as number, kind: o.kind as HistoryKind, topicId: o.topicId as string, correct: o.correct as boolean });
    });
  }

  if (c.errors.length > 0) return null;
  return {
    version: PROGRESS_VERSION, courseId: d.courseId as string, createdAt: d.createdAt as number, updatedAt: d.updatedAt as number,
    settings, placement, memory, learnedSinceQuiz, history,
  };
}

/**
 * Parses and validates a progress document: a JSON string (an exported file or a stored
 * value) or an already parsed value. Older versions are migrated forward one step at a
 * time. Never throws.
 */
export function importProgress(input: unknown, options: ImportOptions = {}): Result<Progress> {
  try {
    let doc: unknown = input;
    if (typeof input === 'string') {
      const max = options.maxBytes ?? MAX_IMPORT_BYTES;
      if (input.length > max) return { ok: false, errors: [`input is ${input.length} characters, more than the ${max} allowed`] };
      try {
        doc = JSON.parse(input);
      } catch (e) {
        return { ok: false, errors: [`not valid JSON: ${e instanceof Error ? e.message : String(e)}`] };
      }
    }
    if (!isObj(doc)) return { ok: false, errors: [`$: expected a progress object, got ${show(doc)}`] };

    let d: Obj = doc;
    const v = d.version;
    if (!isNat(v)) return { ok: false, errors: [`$.version: expected a version number, got ${show(v)}`] };
    if (v > PROGRESS_VERSION) {
      return { ok: false, errors: [`$.version: ${v} was written by a newer build (this one reads up to ${PROGRESS_VERSION}); update the app`] };
    }
    const migrations = options.migrations ?? MIGRATIONS;
    for (let from = v; from < PROGRESS_VERSION; from++) {
      const m = migrations[from];
      if (m === undefined) return { ok: false, errors: [`$.version: no migration from version ${from}`] };
      try {
        d = m(d);
      } catch (e) {
        return { ok: false, errors: [`migration from version ${from} failed: ${e instanceof Error ? e.message : String(e)}`] };
      }
      if (!isObj(d) || d.version !== from + 1) {
        return { ok: false, errors: [`migration from version ${from} did not produce version ${from + 1}`] };
      }
    }

    const c = new Checker();
    const known = options.knownTopicIds === undefined ? null : new Set(options.knownTopicIds);
    const p = checkV1(c, d, known);
    return p === null ? { ok: false, errors: c.errors } : { ok: true, value: p, warnings: c.warnings };
  } catch (e) {
    // Validation is written not to throw; this is the backstop the contract promises.
    return { ok: false, errors: [`unexpected error while importing: ${e instanceof Error ? e.message : String(e)}`] };
  }
}

// ---------------------------------------------------------------- storage

/** Where progress is kept. Values are exported documents, so any key-value store will do. */
export interface ProgressStorage {
  get(key: string): Promise<string | undefined>;
  put(key: string, value: string): Promise<void>;
}

/** For tests, and as a fallback when the browser offers no storage. */
export class MemoryStorage implements ProgressStorage {
  private readonly data = new Map<string, string>();

  get(key: string): Promise<string | undefined> {
    return Promise.resolve(this.data.get(key));
  }

  put(key: string, value: string): Promise<void> {
    this.data.set(key, value);
    return Promise.resolve();
  }
}

/** Ok with null when nothing is stored yet. Never rejects. */
export async function loadProgress(storage: ProgressStorage, key: string, options?: ImportOptions): Promise<Result<Progress | null>> {
  let raw: string | undefined;
  try {
    raw = await storage.get(key);
  } catch (e) {
    return { ok: false, errors: [`storage read failed: ${e instanceof Error ? e.message : String(e)}`] };
  }
  if (raw === undefined) return { ok: true, value: null, warnings: [] };
  return importProgress(raw, options);
}

/** Validates before writing, so a bug upstream cannot persist a document that will not load. Never rejects. */
export async function saveProgress(storage: ProgressStorage, key: string, p: Readonly<Progress>): Promise<Result<void>> {
  const text = exportProgress(p);
  const check = importProgress(text);
  if (!check.ok) return { ok: false, errors: check.errors };
  try {
    await storage.put(key, text);
  } catch (e) {
    return { ok: false, errors: [`storage write failed: ${e instanceof Error ? e.message : String(e)}`] };
  }
  return { ok: true, value: undefined, warnings: [] };
}
