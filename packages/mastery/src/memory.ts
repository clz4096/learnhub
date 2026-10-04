/**
 * Spaced review: one memory state per mastered topic, and the rules that move it.
 *
 * A topic is mastered exactly when it has a memory state. Explicit reviews stretch or
 * shrink the interval. Practicing a topic also gives fractional review credit to the
 * topics it encompasses, and on down the graph (Math Academy's Fractional Implicit
 * Repetition), so advanced practice keeps the foundations fresh without separate reviews.
 *
 * Every function is pure: it takes the clock as `now` (ms since the epoch) and returns a
 * new memory map, leaving its input untouched.
 */
import type { Topic } from './graph';
import { withDefaults } from './options';

export const DAY_MS = 86_400_000;

export interface MemoryState {
  /** Successful repetitions, explicit or converted from implicit credit, less one per lapse. */
  reps: number;
  intervalDays: number;
  /** When the next review is due, ms since the epoch. */
  due: number;
  /** The last explicit or implicit repetition, ms since the epoch. */
  lastReviewed: number;
  lapses: number;
  /** Fractional repetitions banked from practicing encompassing topics, in [0, 1). */
  implicitCredit: number;
}

/** Topic id to memory state. A plain record so progress serializes as JSON unchanged. */
export type MemoryMap = Readonly<Record<string, MemoryState>>;

export interface MemoryParams {
  /** Interval after the lesson is passed. */
  firstIntervalDays: number;
  /** Growth while `reps` (before the success) is below `earlyReps`. */
  earlyGrowth: number;
  earlyReps: number;
  /** Growth after that: the design's interval doubling. */
  lateGrowth: number;
  /** Interval multiplier on a failed review. */
  failShrink: number;
  minIntervalDays: number;
  maxIntervalDays: number;
  /** Path weights below this stop flowing; they are too small to matter. */
  creditCutoff: number;
  /** A failed topic flags the topics it encompasses at least this strongly. */
  checkWeight: number;
  /** Turns implicit credit off, for the with and without comparison. */
  implicitCredit: boolean;
}

/**
 * Starting constants, to be tuned from real review data (the design says so).
 *
 * Intervals after learning, if every review succeeds: 1, 3, 9, 18, 36, 72, 144, 180 days.
 * The first two successes triple the interval because the early days decide whether a
 * topic stuck; after that it doubles. A failure halves the interval, never below a day,
 * so a lapse costs a few extra reviews rather than starting over.
 */
export const DEFAULT_MEMORY_PARAMS: Readonly<MemoryParams> = {
  firstIntervalDays: 1,
  earlyGrowth: 3,
  earlyReps: 2,
  lateGrowth: 2,
  failShrink: 0.5,
  minIntervalDays: 1,
  maxIntervalDays: 180,
  creditCutoff: 0.1,
  checkWeight: 0.5,
  implicitCredit: true,
};

/** Placed topics have no review history; spread their first reviews so they do not land on one day. */
export const PLACED_FIRST_REVIEW_DAYS = 3;
export const PLACED_PER_DAY = 6;

function params(p?: Partial<MemoryParams>): MemoryParams {
  return withDefaults(DEFAULT_MEMORY_PARAMS, p);
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

/** State for a topic whose lesson and practice were just passed. */
export function newMemory(now: number, p?: Partial<MemoryParams>): MemoryState {
  const q = params(p);
  return {
    reps: 0,
    intervalDays: q.firstIntervalDays,
    due: now + q.firstIntervalDays * DAY_MS,
    lastReviewed: now,
    lapses: 0,
    implicitCredit: 0,
  };
}

/** One successful repetition, explicit or converted from credit. */
export function afterSuccess(s: Readonly<MemoryState>, now: number, p?: Partial<MemoryParams>): MemoryState {
  const q = params(p);
  const growth = s.reps < q.earlyReps ? q.earlyGrowth : q.lateGrowth;
  const intervalDays = clamp(s.intervalDays * growth, q.minIntervalDays, q.maxIntervalDays);
  return { ...s, reps: s.reps + 1, intervalDays, due: now + intervalDays * DAY_MS, lastReviewed: now };
}

/**
 * A failed explicit review. Banked credit is dropped: it was earned before evidence that
 * the topic has slipped, so it should not cancel the next review.
 */
export function afterFailure(s: Readonly<MemoryState>, now: number, p?: Partial<MemoryParams>): MemoryState {
  const q = params(p);
  const intervalDays = clamp(s.intervalDays * q.failShrink, q.minIntervalDays, q.maxIntervalDays);
  return {
    ...s,
    reps: Math.max(0, s.reps - 1),
    intervalDays,
    due: now + intervalDays * DAY_MS,
    lastReviewed: now,
    lapses: s.lapses + 1,
    implicitCredit: 0,
  };
}

/**
 * Credit that one successful practice of `sourceId` gives each topic below it: the largest
 * product of encompass weights over any path, dropping paths once they fall below the cutoff.
 *
 * The largest path, not the sum over paths: one problem exercises a prerequisite once, and
 * summing would let a well-connected topic earn more than a full repetition from it.
 * Weights are at most 1, so a product never grows along a path and the relaxation ends.
 */
export function implicitCredits(
  topics: readonly Topic[],
  sourceId: string,
  cutoff: number = DEFAULT_MEMORY_PARAMS.creditCutoff,
): Map<string, number> {
  const byId = new Map(topics.map((t) => [t.id, t] as const));
  const best = new Map<string, number>();
  const stack: [string, number][] = [[sourceId, 1]];
  while (stack.length > 0) {
    const [id, w] = stack.pop() as [string, number];
    for (const [e, ew] of Object.entries(byId.get(id)?.encompasses ?? {})) {
      const c = w * ew;
      if (c < cutoff || e === sourceId || c <= (best.get(e) ?? 0)) continue;
      best.set(e, c);
      stack.push([e, c]);
    }
  }
  return best;
}

export interface MemoryUpdate {
  memory: MemoryMap;
  /** Topics whose credit reached a whole repetition, in conversion order. */
  converted: string[];
  /** Topics pulled due now for a check after a failure. */
  flagged: string[];
}

/** Banks credit on every mastered topic below `sourceId`; credit that reaches 1 becomes a repetition. */
function flowCredit(
  memory: Record<string, MemoryState>,
  topics: readonly Topic[],
  sourceId: string,
  now: number,
  q: MemoryParams,
): string[] {
  if (!q.implicitCredit) return [];
  const converted: string[] = [];
  for (const [id, c] of implicitCredits(topics, sourceId, q.creditCutoff)) {
    let s = memory[id];
    // Unmastered topics have no schedule to move; their credit is not banked.
    if (s === undefined) continue;
    s = { ...s, implicitCredit: s.implicitCredit + c };
    while (s.implicitCredit >= 1) {
      s = { ...afterSuccess(s, now, q), implicitCredit: s.implicitCredit - 1 };
      converted.push(id);
    }
    memory[id] = s;
  }
  return converted;
}

/**
 * Failing a topic is evidence against the topics it leans on hardest, but weak evidence
 * against any one of them. So the rule is cheap and reversible: each mastered topic it
 * encompasses directly with weight at least `checkWeight` becomes due now, with no lapse
 * and no change to its interval. The check review then settles it; if that fails too, it
 * flags its own prerequisites in turn, so the search follows evidence down the graph
 * instead of guessing several levels at once.
 */
function flagChecks(
  memory: Record<string, MemoryState>,
  topics: readonly Topic[],
  failedId: string,
  now: number,
  q: MemoryParams,
): string[] {
  const t = topics.find((x) => x.id === failedId);
  const flagged: string[] = [];
  for (const [e, w] of Object.entries(t?.encompasses ?? {})) {
    const s = memory[e];
    if (s === undefined || w < q.checkWeight) continue;
    if (s.due > now) memory[e] = { ...s, due: now };
    flagged.push(e);
  }
  return flagged;
}

/** The lesson for `id` was passed: the topic becomes mastered, and its practice credits what it encompasses. */
export function recordLesson(
  memory: MemoryMap,
  topics: readonly Topic[],
  id: string,
  now: number,
  p?: Partial<MemoryParams>,
): MemoryUpdate {
  const q = params(p);
  const m: Record<string, MemoryState> = { ...memory, [id]: newMemory(now, q) };
  const converted = flowCredit(m, topics, id, now, q);
  return { memory: m, converted, flagged: [] };
}

/** The lesson for `id` was not passed. It stays unmastered; its strong prerequisites get a check. */
export function recordLessonFailure(
  memory: MemoryMap,
  topics: readonly Topic[],
  id: string,
  now: number,
  p?: Partial<MemoryParams>,
): MemoryUpdate {
  const q = params(p);
  const m: Record<string, MemoryState> = { ...memory };
  return { memory: m, converted: [], flagged: flagChecks(m, topics, id, now, q) };
}

/**
 * An explicit review (or quiz item) of a mastered topic. Success counts as a repetition and
 * credits the topics below it; failure is a lapse and flags checks below it.
 * Throws if `id` is not mastered: reviewing an unlearned topic is a caller bug.
 */
export function recordReview(
  memory: MemoryMap,
  topics: readonly Topic[],
  id: string,
  correct: boolean,
  now: number,
  p?: Partial<MemoryParams>,
): MemoryUpdate {
  const q = params(p);
  const s = memory[id];
  if (s === undefined) throw new Error(`recordReview: ${id} is not mastered`);
  const m: Record<string, MemoryState> = { ...memory };
  if (correct) {
    // The review itself is the repetition, so banked credit carries on toward the next one.
    m[id] = afterSuccess(s, now, q);
    return { memory: m, converted: flowCredit(m, topics, id, now, q), flagged: [] };
  }
  m[id] = afterFailure(s, now, q);
  return { memory: m, converted: [], flagged: flagChecks(m, topics, id, now, q) };
}

/**
 * Memory for topics credited by placement. They have no history, so each starts as one
 * repetition old. First reviews are spread `PLACED_PER_DAY` to a day starting
 * `PLACED_FIRST_REVIEW_DAYS` out, highest topics first: low topics are the ones new
 * lessons will review implicitly, so they can wait longest.
 * `ids` must be in topological order (prerequisites first), as `topoOrder` returns.
 */
export function placedMemory(ids: readonly string[], now: number): Record<string, MemoryState> {
  const out: Record<string, MemoryState> = {};
  const highestFirst = [...ids].reverse();
  highestFirst.forEach((id, i) => {
    const intervalDays = PLACED_FIRST_REVIEW_DAYS + Math.floor(i / PLACED_PER_DAY);
    out[id] = { reps: 1, intervalDays, due: now + intervalDays * DAY_MS, lastReviewed: now, lapses: 0, implicitCredit: 0 };
  });
  return out;
}

/** Mastered topics whose review is due at `now`, most overdue first, ties by id. */
export function dueTopics(memory: MemoryMap, now: number): string[] {
  return Object.entries(memory)
    .filter(([, s]) => s.due <= now)
    .sort(([a, x], [b, y]) => x.due - y.due || (a < b ? -1 : a > b ? 1 : 0))
    .map(([id]) => id);
}
