/**
 * Merging two copies of the progress document, for sync between devices.
 *
 * The learner studies on a Mac and a phone, sometimes offline, so two copies diverge and
 * each holds work the other lacks. `mergeProgress` combines them so that no work is lost
 * and every device ends with the same document whatever order the copies meet in. That
 * needs the merge to be a join: idempotent, commutative, and associative. Each field is
 * therefore merged by a rule that is itself a join (a maximum under a total order, a
 * union, or a per-key combination of those), and the document is the field-by-field
 * product, which is again a join.
 *
 * The rules, field by field:
 * - Start over (`resetAt`): the document with the later reset wins whole. An erase must
 *   reach the other device; work done there since its last sync is lost, by design.
 * - Memory, per topic: the newer review wins (later `lastReviewed`, then more `reps`).
 * - History and placement answers: unioned. An entry's id is its content (time, kind,
 *   topic, result): two devices cannot log the same answer at the same millisecond, and a
 *   copy that holds an entry twice keeps it twice (a multiset union, by the larger count).
 * - Supervision attempts, by nonce: an attempt with a result beats one without, so an
 *   imported result is never lost; two results for one nonce keep the earlier import.
 * - Redos, by problem and the nonce that set them: a done redo beats an open one, so a
 *   done redo stays done.
 * - Settings and chosen courses: last writer wins, field by field (`changedAt`).
 * - Lesson minutes per course: the larger count. Minutes spent on both devices offline
 *   are under-counted, never double counted.
 * - Topics learned since the last quiz: unioned. A quiz taken on one device does not clear
 *   the other's list; the cost is a topic quizzed once more, never one left unquizzed.
 * - Today's session: the later day wins; on the same day the earlier plan wins (the first
 *   plan of the day is the one both devices should show), and its tasks are merged index
 *   by index, a done task staying done.
 *
 * Where a rule needs a last resort to stay deterministic (two different values with the
 * same time), it compares canonical JSON, which is arbitrary but the same on every device.
 *
 * Both inputs must be current-version documents: import (and so migrate) a copy before
 * merging it. The output lists are in a canonical order, so merging a document with
 * itself returns it in that order (equal to the input for a document built by the app).
 */
import type { MemoryState } from './memory';
import {
  CHOICE_FIELDS, PROGRESS_VERSION,
  type ChoiceField, type HistoryEntry, type Progress, type Redo, type SessionRecord, type SessionTask, type SupervisionAttempt,
} from './progress';
import type { PlacementAnswer } from './placement';

/** JSON with object keys sorted, so equal values always print alike. */
export function canonicalJson(x: unknown): string {
  if (Array.isArray(x)) return `[${x.map(canonicalJson).join(',')}]`;
  if (x !== null && typeof x === 'object') {
    const keys = Object.keys(x).filter((k) => (x as Record<string, unknown>)[k] !== undefined).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson((x as Record<string, unknown>)[k])}`).join(',')}}`;
  }
  return JSON.stringify(x) ?? 'null';
}

const cmp = (a: number | string, b: number | string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Compares two keys lexicographically, element by element. */
function cmpKeys(a: readonly (number | string)[], b: readonly (number | string)[]): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const c = cmp(a[i] as number | string, b[i] as number | string);
    if (c !== 0) return c;
  }
  return a.length - b.length;
}

/** The larger under `key`; the key must end in a value that tells any two different inputs apart. */
function maxBy<T>(a: T, b: T, key: (x: T) => (number | string)[]): T {
  return cmpKeys(key(a), key(b)) >= 0 ? a : b;
}

/** Unions two lists keyed by `id`, joining items that share an id with `join`. */
function unionBy<T>(a: readonly T[], b: readonly T[], id: (x: T) => string, join: (x: T, y: T) => T): T[] {
  const out = new Map<string, T>();
  for (const x of [...a, ...b]) {
    const k = id(x);
    const seen = out.get(k);
    out.set(k, seen === undefined ? x : join(seen, x));
  }
  return [...out.values()];
}

/**
 * Multiset union: each distinct entry appears as many times as in the copy that holds it
 * most often. Sorted by time, then content.
 */
function unionEntries<T extends { at: number }>(a: readonly T[], b: readonly T[]): T[] {
  const count = (xs: readonly T[]): Map<string, { x: T; n: number }> => {
    const m = new Map<string, { x: T; n: number }>();
    for (const x of xs) {
      const k = canonicalJson(x);
      const e = m.get(k);
      if (e === undefined) m.set(k, { x, n: 1 });
      else e.n++;
    }
    return m;
  };
  const ca = count(a);
  const cb = count(b);
  const out: { x: T; k: string }[] = [];
  for (const k of new Set([...ca.keys(), ...cb.keys()])) {
    const ea = ca.get(k);
    const eb = cb.get(k);
    const x = (ea ?? eb)!.x;
    for (let i = 0; i < Math.max(ea?.n ?? 0, eb?.n ?? 0); i++) out.push({ x, k });
  }
  return out.sort((p, q) => p.x.at - q.x.at || cmp(p.k, q.k)).map((e) => e.x);
}

function mergeMemory(a: Readonly<Record<string, MemoryState>>, b: Readonly<Record<string, MemoryState>>): Record<string, MemoryState> {
  const out: Record<string, MemoryState> = {};
  for (const id of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) {
    const x = a[id];
    const y = b[id];
    out[id] = x === undefined ? y! : y === undefined ? x : maxBy(x, y, (m) => [m.lastReviewed, m.reps, canonicalJson(m)]);
  }
  return out;
}

/** Ordered by the last passed lesson on the topic (the order the app appends them in), then id. */
function mergeLearned(a: readonly string[], b: readonly string[], history: readonly HistoryEntry[]): string[] {
  const lastPass = new Map<string, number>();
  for (const h of history) if (h.kind === 'lesson' && h.correct) lastPass.set(h.topicId, Math.max(lastPass.get(h.topicId) ?? -Infinity, h.at));
  const at = (id: string): number => lastPass.get(id) ?? -Infinity;
  return [...new Set([...a, ...b])].sort((x, y) => at(x) - at(y) || cmp(x, y));
}

function mergeNumbers(a: Readonly<Record<string, number>>, b: Readonly<Record<string, number>>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) out[k] = Math.max(a[k] ?? -Infinity, b[k] ?? -Infinity);
  return out;
}

function mergePlacement(a: Progress['placement'], b: Progress['placement']): Progress['placement'] {
  if (a === null && b === null) return null;
  // One side alone still goes through the union, which puts its answers in the canonical order.
  return { answers: unionEntries<PlacementAnswer>(a?.answers ?? [], b?.answers ?? []), done: (a?.done ?? false) || (b?.done ?? false) };
}

/** Not done, skipped (done, no result), failed, passed: a later state never goes back. */
const taskRank = (t: SessionTask): number => (!t.done ? 0 : t.passed === null ? 1 : t.passed ? 3 : 2);

function mergeSession(a: SessionRecord | null, b: SessionRecord | null): SessionRecord | null {
  if (a === null || b === null) return a ?? b;
  if (a.day !== b.day) return a.day > b.day ? a : b;
  if (a.startedAt !== b.startedAt) return a.startedAt < b.startedAt ? a : b;
  // The same plan, possibly extended (`planMore`) or worked on differently on each device.
  const tasks: SessionTask[] = [];
  for (let i = 0; i < Math.max(a.tasks.length, b.tasks.length); i++) {
    const x = a.tasks[i];
    const y = b.tasks[i];
    tasks.push(x === undefined ? y! : y === undefined ? x : maxBy(x, y, (t) => {
      const { done: _d, passed: _p, ...plan } = t;
      return [canonicalJson(plan), taskRank(t), canonicalJson(t)];
    }));
  }
  return { day: a.day, startedAt: a.startedAt, tasks };
}

function mergeAttempt(a: SupervisionAttempt, b: SupervisionAttempt): SupervisionAttempt {
  // Earlier import first: negated so that the larger key is the earlier time.
  return maxBy(a, b, (x) => [x.result === null ? 0 : 1, -(x.importedAt ?? 0), canonicalJson(x)]);
}

function mergeRedo(a: Redo, b: Redo): Redo {
  return maxBy(a, b, (x) => [x.doneAt === null ? 0 : 1, -(x.doneAt ?? 0), canonicalJson(x)]);
}

function choiceValue(p: Readonly<Progress>, f: ChoiceField): unknown {
  return f === 'courses' ? p.courses : p.settings[f];
}

/** The newer of each choice; on a tie of times, the larger canonical value. */
function mergeChoices(a: Readonly<Progress>, b: Readonly<Progress>): Pick<Progress, 'settings' | 'courses' | 'changedAt'> {
  const pick = (f: ChoiceField): Readonly<Progress> =>
    maxBy(a, b, (p) => [p.changedAt[f], canonicalJson(choiceValue(p, f))]);
  const from = Object.fromEntries(CHOICE_FIELDS.map((f) => [f, pick(f)])) as Record<ChoiceField, Readonly<Progress>>;
  return {
    settings: {
      budgetMinutes: from.budgetMinutes.settings.budgetMinutes,
      implicitCredit: from.implicitCredit.settings.implicitCredit,
      courseWeights: { ...from.courseWeights.settings.courseWeights },
    },
    courses: [...from.courses.courses],
    changedAt: {
      budgetMinutes: from.budgetMinutes.changedAt.budgetMinutes,
      implicitCredit: from.implicitCredit.changedAt.implicitCredit,
      courseWeights: from.courseWeights.changedAt.courseWeights,
      courses: from.courses.changedAt.courses,
    },
  };
}

function mergeSameEpoch(a: Readonly<Progress>, b: Readonly<Progress>): Progress {
  const history = unionEntries(a.history, b.history);
  const supervision = unionBy(a.supervision, b.supervision, (x) => x.nonce, mergeAttempt)
    .sort((x, y) => x.copiedAt - y.copiedAt || cmp(x.nonce, y.nonce));
  const redos = unionBy(a.redos, b.redos, (x) => `${x.problem} ${x.from}`, mergeRedo)
    .sort((x, y) => x.setAt - y.setAt || cmp(x.problem, y.problem) || cmp(x.from, y.from));
  return {
    version: PROGRESS_VERSION,
    courseId: a.courseId <= b.courseId ? a.courseId : b.courseId,
    createdAt: Math.min(a.createdAt, b.createdAt),
    updatedAt: Math.max(a.updatedAt, b.updatedAt),
    ...mergeChoices(a, b),
    placement: mergePlacement(a.placement, b.placement),
    memory: mergeMemory(a.memory, b.memory),
    learnedSinceQuiz: mergeLearned(a.learnedSinceQuiz, b.learnedSinceQuiz, history),
    history,
    courseMinutes: mergeNumbers(a.courseMinutes, b.courseMinutes),
    session: mergeSession(a.session, b.session),
    supervision,
    redos,
    resetAt: a.resetAt,
  };
}

/**
 * Merges two copies of the learner's progress. Pure and deterministic; see the file
 * comment for the rules. Neither input is changed.
 */
export function mergeProgress(a: Readonly<Progress>, b: Readonly<Progress>): Progress {
  if (a.resetAt !== b.resetAt) {
    const w = a.resetAt > b.resetAt ? a : b;
    return mergeSameEpoch(w, w);
  }
  return mergeSameEpoch(a, b);
}

/** True when two documents hold the same data (field order aside). */
export function sameProgress(a: Readonly<Progress>, b: Readonly<Progress>): boolean {
  return canonicalJson(a) === canonicalJson(b);
}
