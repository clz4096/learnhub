/**
 * Blind mixed review (assessment that proves learning, phase 1): generated problems from
 * several mastered topics, interleaved, with the topic's name hidden until the problem is
 * answered. Recognising which method a problem needs is part of knowing a topic, and a
 * review that names the topic first gives that away; an exam paper does not.
 *
 * Which topics: those the caller passes (the app passes mastered topics: drills passed and
 * the gate met), each with a memory state and at least one generator. They are scheduled
 * from memory state: the topic furthest through its review interval first (`mixedPriority`),
 * so due topics lead and a topic just reviewed comes last.
 *
 * What a result does (`recordMixed`): on a topic that is due, the answer is that topic's
 * review, with the review's full rule; on a topic not yet due it is a drill, with the gym's
 * rule for a drill (half a repetition banked when right, the review brought forward when
 * wrong). So mixed review never lets a due topic skip its review, and a topic is never
 * reviewed twice for one sitting.
 *
 * Every function is pure and takes the clock as `now`.
 */
import type { Topic } from './graph';
import { recordGym } from './gym';
import { recordReview, type MemoryMap, type MemoryParams, type MemoryState, type MemoryUpdate } from './memory';
import { mulberry32 } from './rng';

/** Fewer topics than this, and the hidden name is no secret: there is little to tell apart. */
export const MIXED_MIN_TOPICS = 3;
/** Problems in one mixed review: a short sitting, about the length of a session review block. */
export const MIXED_DEFAULT_COUNT = 6;

export interface MixedTopic {
  topicId: string;
  /** The topic's generator ids, in content order. */
  generatorIds: readonly string[];
}

export interface MixedItem {
  topicId: string;
  generatorId: string;
  /** The generator seed, unsigned 32 bit. */
  seed: number;
  /** The logged item id, as a drill's: "topic id/generator id". */
  id: string;
}

export interface MixedSelectInput {
  topics: readonly MixedTopic[];
  memory: MemoryMap;
  now: number;
  /** How many problems. */
  count: number;
  /** Seeds the order and the problems, so a plan is reproducible. */
  seed: number;
}

/**
 * How far a topic is through its review interval: 0 just after a review, 1 when due, more
 * when overdue. An interval of no length (a state due at its last review) counts as due.
 */
export function mixedPriority(s: Readonly<MemoryState>, now: number): number {
  const span = s.due - s.lastReviewed;
  if (span <= 0) return now >= s.due ? 1 : 0;
  return (now - s.lastReviewed) / span;
}

const byId = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** The topics a mixed review may use, highest priority first, ties by id. */
export function mixedOrder(input: Pick<MixedSelectInput, 'topics' | 'memory' | 'now'>): MixedTopic[] {
  const seen = new Set<string>();
  const usable = input.topics.filter((t) => {
    if (seen.has(t.topicId) || t.generatorIds.length === 0 || input.memory[t.topicId] === undefined) return false;
    seen.add(t.topicId);
    return true;
  });
  const pr = (t: MixedTopic): number => mixedPriority(input.memory[t.topicId] as MemoryState, input.now);
  return usable.sort((a, b) => pr(b) - pr(a) || byId(a.topicId, b.topicId));
}

/**
 * Reorders `items` so no two neighbours share a topic, whenever that is possible (no topic
 * holds more than half the items, rounded up). Greedy: at each place, the topic with the
 * most items left that differs from the one before, ties by first appearance in `items`.
 * Stable within a topic.
 */
export function spreadTopics<T extends { topicId: string }>(items: readonly T[]): T[] {
  const queues = new Map<string, T[]>();
  for (const x of items) {
    const q = queues.get(x.topicId);
    if (q === undefined) queues.set(x.topicId, [x]);
    else q.push(x);
  }
  const order = [...queues.keys()];
  const out: T[] = [];
  let prev: string | null = null;
  while (out.length < items.length) {
    let pick: string | null = null;
    for (const id of order) {
      const n = (queues.get(id) as T[]).length;
      if (n === 0 || id === prev) continue;
      if (pick === null || n > (queues.get(pick) as T[]).length) pick = id;
    }
    // Only the previous topic has items left: a repeat cannot be avoided.
    if (pick === null) pick = prev as string;
    out.push((queues.get(pick) as T[]).shift() as T);
    prev = pick;
  }
  return out;
}

/**
 * The problems for one blind mixed review. Empty when fewer than `MIXED_MIN_TOPICS` topics
 * can be used. Topics are taken in priority order; with more problems than topics, the
 * highest-priority topics get the extra ones (round robin), each time from the topic's next
 * generator. The order is then shuffled from the seed and spread so no two neighbours
 * share a topic: the order gives no hint of the topic. Deterministic for its input.
 */
export function selectMixedReview(input: MixedSelectInput): MixedItem[] {
  const ranked = mixedOrder(input);
  const count = Math.max(0, Math.floor(input.count));
  if (ranked.length < MIXED_MIN_TOPICS || count === 0) return [];
  const rng = mulberry32(input.seed);
  const u32 = (): number => Math.floor(rng() * 0x1_0000_0000) >>> 0;
  // Each topic's generators start at a seeded offset, so two plans do not open alike.
  const next = new Map(ranked.map((t) => [t.topicId, Math.floor(rng() * t.generatorIds.length)] as const));
  const picked: MixedItem[] = [];
  for (let i = 0; i < count; i++) {
    const t = ranked[i % ranked.length] as MixedTopic;
    const k = next.get(t.topicId) as number;
    next.set(t.topicId, k + 1);
    const generatorId = t.generatorIds[k % t.generatorIds.length] as string;
    picked.push({ topicId: t.topicId, generatorId, seed: u32(), id: `${t.topicId}/${generatorId}` });
  }
  for (let i = picked.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [picked[i], picked[j]] = [picked[j] as MixedItem, picked[i] as MixedItem];
  }
  return spreadTopics(picked);
}

/** The topic's name to show for an item: null until the item is answered, so the name gives nothing away. */
export function mixedLabel(item: Pick<MixedItem, 'topicId'>, answered: boolean, titleOf: (topicId: string) => string): string | null {
  return answered ? titleOf(item.topicId) : null;
}

export interface MixedRecord {
  update: MemoryUpdate;
  /** The history kind to log the answer with: `quiz` when it was the topic's review, `drill` otherwise. */
  kind: 'quiz' | 'drill';
}

/**
 * One mixed review answer, applied to memory: the topic's review when it is due, else a
 * drill (see the file comment). A topic without a memory state is left alone, as a drill.
 */
export function recordMixed(
  memory: MemoryMap, topics: readonly Topic[], item: Pick<MixedItem, 'topicId'>, correct: boolean, now: number, p?: Partial<MemoryParams>,
): MixedRecord {
  const s = memory[item.topicId];
  if (s !== undefined && s.due <= now) return { update: recordReview(memory, topics, item.topicId, correct, now, p), kind: 'quiz' };
  return { update: recordGym(memory, topics, { kind: 'drill', topicId: item.topicId }, correct, now, p), kind: 'drill' };
}
