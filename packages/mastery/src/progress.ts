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
export const PROGRESS_VERSION = 6;

export interface Settings {
  budgetMinutes: number;
  implicitCredit: boolean;
  /** Course id to its share of new-lesson time; a course not listed weighs 1 (`planSession`). */
  courseWeights: Record<string, number>;
}

export const DEFAULT_SETTINGS: Readonly<Settings> = { budgetMinutes: 60, implicitCredit: true, courseWeights: {} };

/**
 * The choices that sync merges last-writer-wins, field by field: the three settings and
 * the chosen courses. Each has its own time of change in `changedAt`, so a new daily budget
 * chosen on the phone and a course weight changed on the Mac both survive a merge.
 */
export const CHOICE_FIELDS = ['budgetMinutes', 'implicitCredit', 'courseWeights', 'courses'] as const;
export type ChoiceField = (typeof CHOICE_FIELDS)[number];
/** ms since the epoch the learner last chose each field; 0 for a default nobody chose. */
export type ChoiceStamps = Record<ChoiceField, number>;

/** Course weights above this are a typo, not a preference: 100 to 1 is already all of the time. */
export const MAX_COURSE_WEIGHT = 100;

/**
 * `supervision`: an imported supervision result; `correct` is the mark's pass or fail (`SUPERVISION_PASS_MARK`).
 * Since version 5, one entry per answered item as well:
 * - `drill`: one generated problem in lesson practice or in a review (the lesson or review
 *   keeps its own entry for the run's result);
 * - `cambridge`: one answer to an auto-checked Cambridge problem, the evidence the mastery
 *   gate reads (gate.ts);
 * - `gym`: one gym item (gym.ts). Gym work feeds spaced review but never the gate.
 */
export const HISTORY_KINDS = ['placement', 'lesson', 'review', 'quiz', 'supervision', 'drill', 'cambridge', 'gym'] as const;
export type HistoryKind = (typeof HISTORY_KINDS)[number];

/** Upper bounds on item data: anything larger is a corrupt file, not a learner. */
export const MAX_ITEM_ID = 200;
export const MAX_ITEM_MS = 86_400_000;
export const MAX_ITEM_HINTS = 100;
export const MAX_ITEM_ATTEMPT = 10_000;

/**
 * What was answered, for per-item analysis (difficulty, time on task) and for the gate's
 * "unaided" rule. Recorded on `drill`, `cambridge`, `gym`, and `quiz` entries.
 */
export interface ItemData {
  /**
   * The item: a generator as "topic id/generator id", a Cambridge problem by its key
   * ("topic id/problem id", `PROBLEM_KEY_RE`), or a gym item id (`GymCandidate.id`).
   */
  id: string;
  /** The generator seed, when the item was generated. Unsigned 32 bit. */
  seed?: number;
  /** ms from the item being shown to the answer; absent when not measured. */
  ms?: number;
  /** Hints used before answering. 0 where none are offered. */
  hints: number;
  /**
   * 1 for the first answer to this item, 2 for the next, and so on. For a Cambridge problem
   * it counts every answer the document holds (`nextAttempt`), a "Show me the solution"
   * included; for a generated problem, the answers to that seed.
   */
  attempt: number;
  /**
   * Set on a `cambridge` entry when the worked solution was shown with it: "Show me the
   * solution", or any result once the solution had been seen. From that moment the problem
   * can no longer meet the gate (gate.ts). Absent otherwise; never false, so an entry has
   * one spelling.
   */
  solution?: true;
}

export interface HistoryEntry {
  /** ms since the epoch. */
  at: number;
  kind: HistoryKind;
  topicId: string;
  correct: boolean;
  item?: ItemData;
}

/**
 * The attempt number the next answer to `itemId` gets: one more than the entries of `kind` on
 * it. `resolve` maps an item id to its current one (a Cambridge problem that moved topic), so
 * answers under an old key count; the default leaves ids as they are.
 */
export function nextAttempt(
  history: readonly HistoryEntry[], kind: HistoryKind, itemId: string, resolve: (id: string) => string = (id) => id,
): number {
  const id = resolve(itemId);
  return history.filter((h) => h.kind === kind && h.item !== undefined && resolve(h.item.id) === id).length + 1;
}

/**
 * Entries that make a day count as studied for story REP's "days studied": everything but
 * placement and gym work, which earns REP at its own lower rate (`GYM_REP`).
 */
export function isStudyEntry(h: Readonly<HistoryEntry>): boolean {
  return h.kind !== 'placement' && h.kind !== 'gym';
}

export const SESSION_TASK_KINDS = ['review', 'lesson', 'quiz'] as const;
export type SessionTaskKind = (typeof SESSION_TASK_KINDS)[number];

/** One task of a stored session plan, with how it went. */
export interface SessionTask {
  kind: SessionTaskKind;
  /** One id for a review or lesson; the quiz items for a quiz. */
  topicIds: string[];
  minutes: number;
  reason: string;
  /** The course charged for a lesson, when the session has several courses. */
  course?: string;
  done: boolean;
  /** Null until done. */
  passed: boolean | null;
}

/**
 * The plan for one day, kept so a reload or a second device shows the same tasks instead
 * of a fresh plan from the changed memory.
 */
export interface SessionRecord {
  /** The learner's local calendar day, YYYY-MM-DD. */
  day: string;
  /** ms since the epoch; the plan was made for this time. */
  startedAt: number;
  tasks: SessionTask[];
}

/** Supervision marks are out of this, as Cambridge marks a question. */
export const SUPERVISION_MARK_MAX = 20;
/**
 * A mark at or above this counts as a passed review of the problem's topic, below it as a
 * missed one: 14 of 20 is 70 percent, roughly a first-class answer to one Tripos question.
 */
export const SUPERVISION_PASS_MARK = 14;
export const SUPERVISION_WEAK_POINTS = 3;
export const SUPERVISION_MAX_REDOS = 3;
export const MAX_WEAK_POINT = 400;
export const MAX_SUMMARY = 1000;
export const MAX_WRITE_UP = 20_000;

/**
 * A Cambridge problem's id across the whole app: its topic id and its id within the topic,
 * "prob.event-spaces/q4-definitions".
 */
export const PROBLEM_KEY_RE = /^[a-z][a-z0-9]*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)+\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** The letters of a supervision nonce: no I, L, O, U, 0, or 1, so it cannot be misread. */
export const NONCE_ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';
export const NONCE_LENGTH = 8;
export const NONCE_RE = /^[ABCDEFGHJKMNPQRSTVWXYZ23456789]{8}$/;

/** What a supervisor returned for one attempt. Only a pasted result block sets it; the learner never does. */
export interface SupervisionResult {
  /** Whole number, 0 to `SUPERVISION_MARK_MAX`. */
  mark: number;
  /** Exactly `SUPERVISION_WEAK_POINTS`, one line each. */
  weakPoints: string[];
  /** Problem keys to redo, at most `SUPERVISION_MAX_REDOS`. */
  redo: string[];
  summary: string;
  /**
   * The earlier topic (a graph id, `TOPIC_ID_RE`) whose missing skill caused a mark below
   * `SUPERVISION_PASS_MARK`, from the result's GAP line: proof writing, for example. Kept only
   * when that topic was not mastered when the result was imported; the result then does not
   * count as a lapse on its own topic, and the redo of its problem waits for that topic.
   */
  gap?: string;
}

/** One copy of a problem for supervision, and the result once it is pasted back. */
export interface SupervisionAttempt {
  /** The problem key (`PROBLEM_KEY_RE`). */
  problem: string;
  /** Random, printed in the copied block and echoed by the result, so a result is tied to this copy. */
  nonce: string;
  writeUp: string;
  /** ms since the epoch. */
  copiedAt: number;
  result: SupervisionResult | null;
  /** Null exactly when `result` is. */
  importedAt: number | null;
}

/** A problem a supervisor set to redo. It stays open until a later measured attempt on the problem. */
export interface Redo {
  problem: string;
  /** The nonce of the attempt whose result set it. */
  from: string;
  setAt: number;
  due: number;
  /** When a later attempt closed it; null while open. */
  doneAt: number | null;
}

export interface Progress {
  version: typeof PROGRESS_VERSION;
  /** The document's id: one learner, possibly several courses. */
  courseId: string;
  createdAt: number;
  updatedAt: number;
  settings: Settings;
  /** The chosen course ids, in the order the planner breaks ties. Empty until chosen. */
  courses: string[];
  /** Null until placement starts. */
  placement: { answers: PlacementAnswer[]; done: boolean } | null;
  memory: Record<string, MemoryState>;
  learnedSinceQuiz: string[];
  history: HistoryEntry[];
  /** Lesson minutes charged to each course so far: `planSession`'s `courseMinutes`. */
  courseMinutes: Record<string, number>;
  session: SessionRecord | null;
  /** Supervision copies and their results, oldest first. */
  supervision: SupervisionAttempt[];
  redos: Redo[];
  /** When each choice was last made, for the field-by-field merge (`mergeProgress`). */
  changedAt: ChoiceStamps;
  /**
   * When the learner last erased everything (Start over); 0 if never. A merge keeps only
   * the document with the later reset, so an erase reaches every synced device instead of
   * being undone by the other device's copy.
   */
  resetAt: number;
}

export type Result<T> =
  | { ok: true; value: T; warnings: string[] }
  | { ok: false; errors: string[] };

/** Upgrades a document from version n to n + 1. May throw; import catches it. */
export type Migration = (doc: Record<string, unknown>) => Record<string, unknown>;

/**
 * Version n to the migration from n to n + 1.
 * 1 to 2: several courses at once (design decision 14) added the chosen courses, course
 * weights, minutes per course, and the stored session; a version 1 document had none.
 * 2 to 3: supervision by copy and paste (DESIGN-CAMBRIDGE-CONTENT.md, build step 3) added
 * the supervision attempts and the redo list; a version 2 document had neither.
 * 3 to 4: sync between devices (DESIGN-CAMBRIDGE-CONTENT.md, build step 4) added the time
 * of each choice and of the last reset. A version 3 document cannot know when its choices
 * were made, so a choice that differs from the default is dated to the document's
 * `updatedAt` (an upper bound) and a default to 0: a device that chose beats a fresh one.
 * 4 to 5: the Cambridge gate and item data (mastery/TEACHING-STYLE.md, decisions of
 * 2026-10-05) added the `drill`, `cambridge`, and `gym` history kinds and the optional
 * `item` on an entry. Nothing in a version 4 document changes: its memory and review
 * schedule are kept, and its learned topics are re-gated because mastery is now read from
 * evidence (`gateStatus`), and a version 4 document holds no `cambridge` entry. Imported
 * supervision results it holds are evidence already, so one of 14 or more on a gate problem
 * still meets the gate. The bump is what keeps a version 4 build from loading a document
 * with the new kinds, which it would reject entry by entry.
 * 5 to 6: a missed Cambridge problem gives a nudge and hints, not the solution (mastery/
 * HOW-A-TOPIC-WORKS.md, rule 3), so a later right answer can still count; only seeing the
 * solution stops it (`ItemData.solution`). Every version 5 miss on a Cambridge problem showed
 * the solution, so the migration marks each one `solution: true`: a problem missed before
 * this build stays not counting, exactly as it did. The bump keeps a version 5 build, which
 * would drop the unknown field and so count a right answer after a revealed solution, from
 * loading the document.
 */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {
  1: (d) => {
    const settings = isObj(d.settings) ? { ...d.settings, courseWeights: {} } : d.settings;
    return { ...d, version: 2, settings, courses: [], courseMinutes: {}, session: null };
  },
  2: (d) => ({ ...d, version: 3, supervision: [], redos: [] }),
  3: (d) => {
    const at = isNum(d.updatedAt) && d.updatedAt > 0 ? d.updatedAt : 0;
    const s = isObj(d.settings) ? d.settings : {};
    const chose = (isDefault: boolean): number => (isDefault ? 0 : at);
    const changedAt: ChoiceStamps = {
      budgetMinutes: chose(s.budgetMinutes === DEFAULT_SETTINGS.budgetMinutes),
      implicitCredit: chose(s.implicitCredit === DEFAULT_SETTINGS.implicitCredit),
      courseWeights: chose(!isObj(s.courseWeights) || Object.keys(s.courseWeights).length === 0),
      courses: chose(!Array.isArray(d.courses) || d.courses.length === 0),
    };
    return { ...d, version: 4, changedAt, resetAt: 0 };
  },
  4: (d) => ({ ...d, version: 5 }),
  5: (d) => ({ ...d, version: 6, history: Array.isArray(d.history) ? d.history.map(solutionSeen) : d.history }),
};

/** A version 5 history entry as version 6 reads it: a Cambridge miss showed the solution. */
function solutionSeen(h: unknown): unknown {
  if (!isObj(h) || h.kind !== 'cambridge' || h.correct !== false || !isObj(h.item)) return h;
  return { ...h, item: { ...h.item, solution: true } };
}

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
  const s = withDefaults(DEFAULT_SETTINGS, settings);
  return {
    version: PROGRESS_VERSION, courseId, createdAt: now, updatedAt: now,
    // A copy, so documents never share the default's weights object.
    settings: { ...s, courseWeights: { ...s.courseWeights } },
    courses: [], placement: null, memory: {}, learnedSinceQuiz: [], history: [], courseMinutes: {}, session: null,
    supervision: [], redos: [], changedAt: noChoices(), resetAt: 0,
  };
}

const noChoices = (): ChoiceStamps => ({ budgetMinutes: 0, implicitCredit: 0, courseWeights: 0, courses: 0 });

/** Start over: a blank document that, merged with any older copy, replaces it. */
export function resetProgress(courseId: string, now: number): Progress {
  return { ...newProgress(courseId, now), resetAt: now };
}

export interface Choices {
  budgetMinutes?: number;
  implicitCredit?: boolean;
  courseWeights?: Record<string, number>;
  courses?: string[];
}

/**
 * Applies the learner's choices and dates each one that changed, so a merge can tell the
 * newer choice. A field set to its current value keeps its old date: saving the settings
 * form unchanged on one device must not override a real change made on another.
 */
export function withChoices(p: Readonly<Progress>, c: Readonly<Choices>, now: number): Progress {
  const changedAt = { ...p.changedAt };
  const settings = { ...p.settings, courseWeights: { ...p.settings.courseWeights } };
  let courses = [...p.courses];
  const same = (x: unknown, y: unknown): boolean => JSON.stringify(x) === JSON.stringify(y);
  if (c.budgetMinutes !== undefined && c.budgetMinutes !== settings.budgetMinutes) {
    settings.budgetMinutes = c.budgetMinutes;
    changedAt.budgetMinutes = now;
  }
  if (c.implicitCredit !== undefined && c.implicitCredit !== settings.implicitCredit) {
    settings.implicitCredit = c.implicitCredit;
    changedAt.implicitCredit = now;
  }
  if (c.courseWeights !== undefined && !same(sortedRecord(c.courseWeights), sortedRecord(settings.courseWeights))) {
    settings.courseWeights = { ...c.courseWeights };
    changedAt.courseWeights = now;
  }
  if (c.courses !== undefined && !same(c.courses, courses)) {
    courses = [...c.courses];
    changedAt.courses = now;
  }
  return { ...p, settings, courses, changedAt, updatedAt: now };
}

const sortedRecord = <T>(r: Readonly<Record<string, T>>): [string, T][] => Object.entries(r).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

/** Pretty-printed, so an exported file can be read and diffed by hand. */
export function exportProgress(p: Readonly<Progress>): string {
  return `${JSON.stringify(p, null, 2)}\n`;
}

// Same shape as the graph's topic ids. Also rules out "__proto__" as a memory key, which
// would otherwise set the record's prototype when copied.
export const TOPIC_ID_RE = /^[a-z][a-z0-9]*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)+$/;
// Course ids are kebab case, like `ia-probability`; this also rules out "__proto__".
const COURSE_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_REASON = 2000;

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

function checkCourseId(c: Checker, x: unknown, path: string): x is string {
  return c.need(typeof x === 'string' && COURSE_ID_RE.test(x) && x.length <= 100, path, 'a course id like "ia-probability"', x);
}

/** A record of course id to a finite number in [0, max]; bad entries are errors. */
function checkCourseNumbers(c: Checker, x: unknown, path: string, max: number, what: string): Record<string, number> {
  const out: Record<string, number> = {};
  if (!c.need(isObj(x), path, 'an object', x)) return out;
  for (const [k, v] of Object.entries(x as Obj)) {
    const p = `${path}[${JSON.stringify(k)}]`;
    if (!checkCourseId(c, k, `${p} key`)) continue;
    if (c.need(isNum(v) && v >= 0 && v <= max, p, what, v)) out[k] = v as number;
  }
  return out;
}

function checkSession(c: Checker, x: unknown): SessionRecord | null {
  if (x === null) return null;
  if (!c.need(isObj(x), '$.session', 'an object or null', x)) return null;
  const o = x as Obj;
  c.extraKeys(o, ['day', 'startedAt', 'tasks'], '$.session');
  c.need(typeof o.day === 'string' && DAY_RE.test(o.day), '$.session.day', 'a day like "2026-10-04"', o.day);
  c.need(isNum(o.startedAt), '$.session.startedAt', 'a time in ms', o.startedAt);
  const tasks: SessionTask[] = [];
  if (c.need(Array.isArray(o.tasks), '$.session.tasks', 'an array', o.tasks)) {
    (o.tasks as unknown[]).forEach((t, i) => {
      const path = `$.session.tasks[${i}]`;
      if (!c.need(isObj(t), path, 'an object', t)) return;
      const k = t as Obj;
      c.extraKeys(k, ['kind', 'topicIds', 'minutes', 'reason', 'course', 'done', 'passed'], path);
      const ids = Array.isArray(k.topicIds) ? (k.topicIds as unknown[]) : null;
      const ok = [
        c.need((SESSION_TASK_KINDS as readonly unknown[]).includes(k.kind), `${path}.kind`, SESSION_TASK_KINDS.join(', '), k.kind),
        c.need(ids !== null && ids.length > 0, `${path}.topicIds`, 'a non-empty array', k.topicIds)
          && (ids as unknown[]).map((id, j) => checkId(c, id, `${path}.topicIds[${j}]`)).every(Boolean),
        c.need(isNum(k.minutes) && k.minutes > 0 && k.minutes <= 24 * 60, `${path}.minutes`, 'minutes in (0, 1440]', k.minutes),
        c.need(typeof k.reason === 'string' && k.reason.length <= MAX_REASON, `${path}.reason`, `text of at most ${MAX_REASON} characters`, k.reason),
        k.course === undefined || checkCourseId(c, k.course, `${path}.course`),
        c.need(typeof k.done === 'boolean', `${path}.done`, 'true or false', k.done),
        c.need(k.passed === null || typeof k.passed === 'boolean', `${path}.passed`, 'true, false, or null', k.passed),
      ].every(Boolean);
      if (!ok) return;
      const task: SessionTask = {
        kind: k.kind as SessionTaskKind, topicIds: [...(ids as string[])], minutes: k.minutes as number, reason: k.reason as string,
        done: k.done as boolean, passed: k.passed as boolean | null,
      };
      if (k.course !== undefined) task.course = k.course as string;
      tasks.push(task);
    });
  }
  return { day: o.day as string, startedAt: o.startedAt as number, tasks };
}

const oneLine = (x: unknown, max: number): x is string => typeof x === 'string' && x.trim() !== '' && x.length <= max && !/[\r\n]/.test(x);

function checkProblemKey(c: Checker, x: unknown, path: string): x is string {
  return c.need(typeof x === 'string' && PROBLEM_KEY_RE.test(x) && x.length <= 200, path, 'a problem id like "prob.event-spaces/q4-definitions"', x);
}

function checkResult(c: Checker, x: unknown, path: string): SupervisionResult | null {
  if (x === null) return null;
  if (!c.need(isObj(x), path, 'an object or null', x)) return null;
  const o = x as Obj;
  c.extraKeys(o, ['mark', 'weakPoints', 'redo', 'summary', 'gap'], path);
  const weak = Array.isArray(o.weakPoints) ? (o.weakPoints as unknown[]) : null;
  const redo = Array.isArray(o.redo) ? (o.redo as unknown[]) : null;
  const ok = [
    c.need(Number.isInteger(o.mark) && (o.mark as number) >= 0 && (o.mark as number) <= SUPERVISION_MARK_MAX, `${path}.mark`, `a whole number from 0 to ${SUPERVISION_MARK_MAX}`, o.mark),
    c.need(weak !== null && weak.length === SUPERVISION_WEAK_POINTS, `${path}.weakPoints`, `${SUPERVISION_WEAK_POINTS} weak points`, o.weakPoints)
      && (weak as unknown[]).map((w, i) => c.need(oneLine(w, MAX_WEAK_POINT), `${path}.weakPoints[${i}]`, `one line of at most ${MAX_WEAK_POINT} characters`, w)).every(Boolean),
    c.need(redo !== null && redo.length <= SUPERVISION_MAX_REDOS, `${path}.redo`, `an array of at most ${SUPERVISION_MAX_REDOS} problem ids`, o.redo)
      && (redo as unknown[]).map((r, i) => checkProblemKey(c, r, `${path}.redo[${i}]`)).every(Boolean),
    c.need(oneLine(o.summary, MAX_SUMMARY), `${path}.summary`, `one line of at most ${MAX_SUMMARY} characters`, o.summary),
    o.gap === undefined || c.need(typeof o.gap === 'string' && TOPIC_ID_RE.test(o.gap) && o.gap.length <= 200, `${path}.gap`, 'a topic id like "proof.direct"', o.gap),
  ].every(Boolean);
  if (!ok) return null;
  const result: SupervisionResult = { mark: o.mark as number, weakPoints: [...(weak as string[])], redo: [...(redo as string[])], summary: o.summary as string };
  if (o.gap !== undefined) result.gap = o.gap as string;
  return result;
}

const ITEM_KEYS = ['id', 'seed', 'ms', 'hints', 'attempt', 'solution'] as const;

/** An entry's item data, or null (with errors) when it does not validate. */
function checkItem(c: Checker, x: unknown, path: string): ItemData | null {
  if (!c.need(isObj(x), path, 'an object', x)) return null;
  const o = x as Obj;
  c.extraKeys(o, ITEM_KEYS, path);
  const ok = [
    c.need(oneLine(o.id, MAX_ITEM_ID), `${path}.id`, `one line of at most ${MAX_ITEM_ID} characters`, o.id),
    o.seed === undefined || c.need(isNat(o.seed) && (o.seed as number) <= 0xffffffff, `${path}.seed`, 'an unsigned 32-bit integer', o.seed),
    o.ms === undefined || c.need(isNum(o.ms) && o.ms >= 0 && o.ms <= MAX_ITEM_MS, `${path}.ms`, `ms in [0, ${MAX_ITEM_MS}]`, o.ms),
    c.need(isNat(o.hints) && (o.hints as number) <= MAX_ITEM_HINTS, `${path}.hints`, `a whole number from 0 to ${MAX_ITEM_HINTS}`, o.hints),
    c.need(Number.isInteger(o.attempt) && (o.attempt as number) >= 1 && (o.attempt as number) <= MAX_ITEM_ATTEMPT, `${path}.attempt`, `a whole number from 1 to ${MAX_ITEM_ATTEMPT}`, o.attempt),
    o.solution === undefined || c.need(o.solution === true, `${path}.solution`, 'true, or no field', o.solution),
  ].every(Boolean);
  if (!ok) return null;
  const item: ItemData = { id: o.id as string, hints: o.hints as number, attempt: o.attempt as number };
  if (o.seed !== undefined) item.seed = o.seed as number;
  if (o.ms !== undefined) item.ms = o.ms as number;
  if (o.solution === true) item.solution = true;
  return item;
}

function checkSupervision(c: Checker, x: unknown): SupervisionAttempt[] {
  const out: SupervisionAttempt[] = [];
  if (!c.need(Array.isArray(x), '$.supervision', 'an array', x)) return out;
  const nonces = new Set<string>();
  (x as unknown[]).forEach((a, i) => {
    const path = `$.supervision[${i}]`;
    if (!c.need(isObj(a), path, 'an object', a)) return;
    const o = a as Obj;
    c.extraKeys(o, ['problem', 'nonce', 'writeUp', 'copiedAt', 'result', 'importedAt'], path);
    const result = checkResult(c, o.result, `${path}.result`);
    const ok = [
      checkProblemKey(c, o.problem, `${path}.problem`),
      c.need(typeof o.nonce === 'string' && NONCE_RE.test(o.nonce), `${path}.nonce`, `${NONCE_LENGTH} letters and digits`, o.nonce),
      c.need(typeof o.writeUp === 'string' && o.writeUp.length <= MAX_WRITE_UP, `${path}.writeUp`, `text of at most ${MAX_WRITE_UP} characters`, o.writeUp),
      c.need(isNum(o.copiedAt), `${path}.copiedAt`, 'a time in ms', o.copiedAt),
      o.result === null || result !== null,
      c.need(o.result === null ? o.importedAt === null : isNum(o.importedAt), `${path}.importedAt`, o.result === null ? 'null, as there is no result' : 'a time in ms', o.importedAt),
    ].every(Boolean);
    if (!ok) return;
    if (nonces.has(o.nonce as string)) {
      c.errors.push(`${path}.nonce: ${JSON.stringify(o.nonce)} is used twice`);
      return;
    }
    nonces.add(o.nonce as string);
    out.push({
      problem: o.problem as string, nonce: o.nonce as string, writeUp: o.writeUp as string, copiedAt: o.copiedAt as number,
      result, importedAt: o.importedAt as number | null,
    });
  });
  return out;
}

function checkRedos(c: Checker, x: unknown): Redo[] {
  const out: Redo[] = [];
  if (!c.need(Array.isArray(x), '$.redos', 'an array', x)) return out;
  (x as unknown[]).forEach((r, i) => {
    const path = `$.redos[${i}]`;
    if (!c.need(isObj(r), path, 'an object', r)) return;
    const o = r as Obj;
    c.extraKeys(o, ['problem', 'from', 'setAt', 'due', 'doneAt'], path);
    const ok = [
      checkProblemKey(c, o.problem, `${path}.problem`),
      c.need(typeof o.from === 'string' && NONCE_RE.test(o.from), `${path}.from`, 'the nonce of the attempt that set it', o.from),
      c.need(isNum(o.setAt), `${path}.setAt`, 'a time in ms', o.setAt),
      c.need(isNum(o.due), `${path}.due`, 'a time in ms', o.due),
      c.need(o.doneAt === null || isNum(o.doneAt), `${path}.doneAt`, 'a time in ms or null', o.doneAt),
    ].every(Boolean);
    if (ok) out.push({ problem: o.problem as string, from: o.from as string, setAt: o.setAt as number, due: o.due as number, doneAt: o.doneAt as number | null });
  });
  return out;
}

function checkV6(c: Checker, d: Obj, known: ReadonlySet<string> | null): Progress | null {
  const TOP = [
    'version', 'courseId', 'createdAt', 'updatedAt', 'settings', 'courses', 'placement', 'memory', 'learnedSinceQuiz', 'history',
    'courseMinutes', 'session', 'supervision', 'redos', 'changedAt', 'resetAt',
  ];
  c.extraKeys(d, TOP, '$');
  c.need(typeof d.courseId === 'string' && d.courseId.trim() !== '' && d.courseId.length <= 200, '$.courseId', 'a non-empty string', d.courseId);
  c.need(isNum(d.createdAt), '$.createdAt', 'a time in ms', d.createdAt);
  c.need(isNum(d.updatedAt), '$.updatedAt', 'a time in ms', d.updatedAt);

  let settings: Settings = { ...DEFAULT_SETTINGS, courseWeights: {} };
  if (c.need(isObj(d.settings), '$.settings', 'an object', d.settings)) {
    const s = d.settings as Obj;
    c.extraKeys(s, ['budgetMinutes', 'implicitCredit', 'courseWeights'], '$.settings');
    c.need(isNum(s.budgetMinutes) && s.budgetMinutes > 0 && s.budgetMinutes <= 24 * 60, '$.settings.budgetMinutes', 'minutes in (0, 1440]', s.budgetMinutes);
    c.need(typeof s.implicitCredit === 'boolean', '$.settings.implicitCredit', 'true or false', s.implicitCredit);
    const courseWeights = checkCourseNumbers(c, s.courseWeights, '$.settings.courseWeights', MAX_COURSE_WEIGHT, `a weight in [0, ${MAX_COURSE_WEIGHT}]`);
    settings = { budgetMinutes: s.budgetMinutes as number, implicitCredit: s.implicitCredit as boolean, courseWeights };
  }

  const courses: string[] = [];
  if (c.need(Array.isArray(d.courses), '$.courses', 'an array', d.courses)) {
    (d.courses as unknown[]).forEach((id, i) => {
      if (!checkCourseId(c, id, `$.courses[${i}]`)) return;
      if (courses.includes(id)) c.errors.push(`$.courses[${i}]: ${JSON.stringify(id)} is listed twice`);
      else courses.push(id);
    });
  }
  const courseMinutes = checkCourseNumbers(c, d.courseMinutes, '$.courseMinutes', Number.MAX_SAFE_INTEGER, 'minutes, 0 or more');
  const session = checkSession(c, d.session);

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
      c.extraKeys(o, ['at', 'kind', 'topicId', 'correct', 'item'], path);
      const item = o.item === undefined ? undefined : checkItem(c, o.item, `${path}.item`);
      const ok = [
        c.need(isNum(o.at), `${path}.at`, 'a time in ms', o.at),
        c.need((HISTORY_KINDS as readonly unknown[]).includes(o.kind), `${path}.kind`, HISTORY_KINDS.join(', '), o.kind),
        // History is a log: entries for removed topics stay, they are still what happened.
        checkId(c, o.topicId, `${path}.topicId`),
        c.need(typeof o.correct === 'boolean', `${path}.correct`, 'true or false', o.correct),
        item !== null,
      ].every(Boolean);
      if (!ok) return;
      const entry: HistoryEntry = { at: o.at as number, kind: o.kind as HistoryKind, topicId: o.topicId as string, correct: o.correct as boolean };
      if (item !== undefined && item !== null) entry.item = item;
      history.push(entry);
    });
  }

  const supervision = checkSupervision(c, d.supervision);
  const redos = checkRedos(c, d.redos);

  const changedAt = noChoices();
  if (c.need(isObj(d.changedAt), '$.changedAt', 'an object', d.changedAt)) {
    const o = d.changedAt as Obj;
    c.extraKeys(o, CHOICE_FIELDS, '$.changedAt');
    for (const f of CHOICE_FIELDS) {
      if (c.need(isNum(o[f]) && (o[f] as number) >= 0, `$.changedAt.${f}`, 'a time in ms, 0 or more', o[f])) changedAt[f] = o[f] as number;
    }
  }
  c.need(isNum(d.resetAt) && d.resetAt >= 0, '$.resetAt', 'a time in ms, 0 or more', d.resetAt);

  if (c.errors.length > 0) return null;
  return {
    version: PROGRESS_VERSION, courseId: d.courseId as string, createdAt: d.createdAt as number, updatedAt: d.updatedAt as number,
    settings, courses, placement, memory, learnedSinceQuiz, history, courseMinutes, session, supervision, redos,
    changedAt, resetAt: d.resetAt as number,
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
    const p = checkV6(c, d, known);
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
