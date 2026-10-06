/**
 * Gym mode (decision 3 of 2026-10-05): short, phone-friendly work for the gym blocks of the
 * day planner. It keeps learned topics fresh between sessions; it never teaches a new
 * topic and never meets the Cambridge gate (gate.ts reads no `gym` entry).
 *
 * The items, each on a learned topic (one with a memory state):
 * - `review`: a due review, the same two problems as a session review, and the same rule.
 * - `drill`: one problem from a generator flagged `quick`.
 * - `order`: a tap-to-order proof puzzle (`TopicContent.proofOrder`).
 * - `recall`: a recall card for a definition or a theorem statement, marked by the learner.
 * - `listen`: the lesson read aloud.
 *
 * What each does to spaced review (`recordGym`): a review counts in full, as anywhere
 * else. A drill or a proof order is measured but small, so it banks `GYM_CREDIT` of a
 * repetition (the same banking as implicit credit), and a miss brings the topic due now
 * for a real review, with no lapse. Recall cards and listening are not measured (the
 * learner's own mark, or nothing to mark), and nothing is taken on the learner's word
 * (design decisions 11 and 18), so they move no schedule.
 *
 * REP: gym work earns `GYM_REP.points` per item done right, at most `GYM_REP.dailyCap`
 * items a day, and a gym-only day is not a day studied (`isStudyEntry`).
 *
 * Every function is pure and takes the clock as `now`.
 */
import type { Topic } from './graph';
import { afterSuccess, DEFAULT_MEMORY_PARAMS, recordReview, type MemoryMap, type MemoryParams, type MemoryState, type MemoryUpdate } from './memory';
import { withDefaults } from './options';
import type { HistoryEntry } from './progress';

export const GYM_KINDS = ['review', 'drill', 'order', 'recall', 'listen'] as const;
export type GymKind = (typeof GYM_KINDS)[number];

export interface GymCandidate {
  kind: GymKind;
  topicId: string;
  /**
   * Unique among the candidates, and the `ItemData.id` the attempt is logged with:
   * "review:topic", "drill:topic/generator", "order:topic#i", "recall:topic#i",
   * "listen:topic" (`gymItemId`).
   */
  id: string;
  /** Expected minutes; `GYM_MINUTES[kind]` unless the item knows better. */
  minutes: number;
}

/** Expected minutes per item: a review is the session's 3, a recall card half a minute, the lesson read aloud about 5. */
export const GYM_MINUTES: Readonly<Record<GymKind, number>> = { review: 3, drill: 1.5, order: 2, recall: 0.5, listen: 5 };

/** The share of a repetition one gym item banks when right. A review is a full repetition; unmeasured items bank nothing. */
export const GYM_CREDIT: Readonly<Record<GymKind, number>> = { review: 1, drill: 0.5, order: 0.5, recall: 0, listen: 0 };

/**
 * Story REP for gym work, for the REP table (model/story.ts): points per gym item done
 * right, capped per day, so a full gym block earns at most what a day studied earns (10)
 * and a fifth of a section mastered (50).
 */
export const GYM_REP = { source: 'gymItems', label: 'Gym items done', points: 1, dailyCap: 10 } as const;

/** The id of a gym item, as `GymCandidate.id` and the logged `ItemData.id`. */
export function gymItemId(kind: GymKind, topicId: string, part?: string | number): string {
  switch (kind) {
    case 'review':
    case 'listen': return `${kind}:${topicId}`;
    case 'drill': return `drill:${topicId}/${String(part)}`;
    case 'order':
    case 'recall': return `${kind}:${topicId}#${String(part)}`;
  }
}

export interface GymSelectInput {
  /** Everything the content offers; `selectGym` keeps only what suits the learner now. */
  candidates: readonly GymCandidate[];
  memory: MemoryMap;
  now: number;
  /** The window, in minutes. */
  minutes: number;
  /** Item ids already done in this window or today; not offered again. */
  done?: Iterable<string>;
}

const byId = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/**
 * The items for a gym window, in the order to do them. Pure and deterministic.
 *
 * 1. Due reviews, most overdue first: they are what spaced review needs today.
 * 2. Then drills, proof orders, and recall cards, mixed across topics (one item per topic
 *    in turn, as an exam paper mixes them), topics due soonest first: practice just before
 *    a review is due is worth the most.
 * 3. Then listening, if a whole lesson still fits: it is long and passive.
 * Only learned topics are offered, and a review only when due. An item that does not fit
 * the time left is skipped for a shorter one. The total never exceeds `minutes`.
 */
export function selectGym(input: GymSelectInput): GymCandidate[] {
  const { memory, now } = input;
  const done = new Set(input.done ?? []);
  const seen = new Set<string>();
  const usable = input.candidates.filter((c) => {
    if (seen.has(c.id) || done.has(c.id) || !(c.minutes > 0)) return false;
    seen.add(c.id);
    const s = memory[c.topicId];
    return s !== undefined && (c.kind !== 'review' || s.due <= now);
  });
  let left = input.minutes;
  const out: GymCandidate[] = [];
  const take = (c: GymCandidate): void => {
    if (c.minutes > left) return;
    out.push(c);
    left -= c.minutes;
  };
  const dueOf = (id: string): number => (memory[id] as MemoryState).due;

  usable.filter((c) => c.kind === 'review').sort((a, b) => dueOf(a.topicId) - dueOf(b.topicId) || byId(a.id, b.id)).forEach(take);

  // Round robin over topics, soonest due first; within a topic, drills, then orders, then cards.
  const RANK: Partial<Record<GymKind, number>> = { drill: 0, order: 1, recall: 2 };
  const queues = new Map<string, GymCandidate[]>();
  for (const c of usable) {
    if (RANK[c.kind] === undefined) continue;
    const q = queues.get(c.topicId);
    if (q === undefined) queues.set(c.topicId, [c]);
    else q.push(c);
  }
  for (const q of queues.values()) q.sort((a, b) => (RANK[a.kind] as number) - (RANK[b.kind] as number) || byId(a.id, b.id));
  const topics = [...queues.keys()].sort((a, b) => dueOf(a) - dueOf(b) || byId(a, b));
  for (let round = 0, any = true; any; round++) {
    any = false;
    for (const id of topics) {
      const c = (queues.get(id) as GymCandidate[])[round];
      if (c === undefined) continue;
      any = true;
      take(c);
    }
  }

  usable.filter((c) => c.kind === 'listen').sort((a, b) => dueOf(a.topicId) - dueOf(b.topicId) || byId(a.id, b.id)).forEach(take);
  return out;
}

/**
 * One gym item's result, applied to memory. A topic without a memory state is left alone
 * (it has no schedule); see the file comment for what each kind does.
 */
export function recordGym(
  memory: MemoryMap,
  topics: readonly Topic[],
  item: Pick<GymCandidate, 'kind' | 'topicId'>,
  correct: boolean,
  now: number,
  p?: Partial<MemoryParams>,
): MemoryUpdate {
  const s = memory[item.topicId];
  const unchanged: MemoryUpdate = { memory: { ...memory }, converted: [], flagged: [] };
  if (s === undefined) return unchanged;
  if (item.kind === 'review') return recordReview(memory, topics, item.topicId, correct, now, p);
  const credit = GYM_CREDIT[item.kind];
  if (credit === 0) return unchanged;
  const q = withDefaults(DEFAULT_MEMORY_PARAMS, p);
  const m: Record<string, MemoryState> = { ...memory };
  if (!correct) {
    // Evidence the topic slipped, but one small item: bring a real review forward, no lapse.
    if (s.due > now) m[item.topicId] = { ...s, due: now };
    return { memory: m, converted: [], flagged: [item.topicId] };
  }
  let next: MemoryState = { ...s, implicitCredit: s.implicitCredit + credit };
  const converted: string[] = [];
  while (next.implicitCredit >= 1) {
    next = { ...afterSuccess(next, now, q), implicitCredit: next.implicitCredit - 1 };
    converted.push(item.topicId);
  }
  m[item.topicId] = next;
  return { memory: m, converted, flagged: [] };
}

/**
 * Gym REP units: gym entries answered right, at most `GYM_REP.dailyCap` a day. `dayOf` maps a
 * time to the learner's calendar day (the story's own day function), so the cap follows
 * the learner's days, not UTC's.
 */
export function gymRepUnits(history: readonly HistoryEntry[], dayOf: (ms: number) => string): number {
  const perDay = new Map<string, number>();
  for (const h of history) {
    if (h.kind !== 'gym' || !h.correct) continue;
    const d = dayOf(h.at);
    perDay.set(d, (perDay.get(d) ?? 0) + 1);
  }
  let units = 0;
  for (const n of perDay.values()) units += Math.min(n, GYM_REP.dailyCap);
  return units;
}

/** Gym REP points: `gymRepUnits` times `GYM_REP.points`. */
export const gymRep = (history: readonly HistoryEntry[], dayOf: (ms: number) => string): number => gymRepUnits(history, dayOf) * GYM_REP.points;
