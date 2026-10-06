/**
 * Blind mixed review in the app: the engine's rules (packages/mastery mixed.ts) applied to
 * the learner's mastered topics and their downloaded content. Problems from several topics,
 * interleaved, with the topic hidden until each is answered; the topics are chosen from
 * memory state, most overdue first. Pure: the caller loads the content and reads the clock.
 */
import type { Instance, TopicContent } from '@learnhub/content';
import {
  MIXED_DEFAULT_COUNT, mixedLabel, nextAttempt, recordMixed, selectMixedReview,
  type HistoryEntry, type ItemData, type MixedItem, type MixedTopic, type Progress,
} from '@learnhub/mastery';
import { ALL_TOPICS, titleOf } from './courses';
import { isMastered } from './learner';

/** The mastered topics among `contents` that have generators, as the engine takes them. */
export function mixedTopics(p: Progress, contents: readonly TopicContent[]): MixedTopic[] {
  return contents
    .filter((c) => c.generators.length > 0 && isMastered(p, c.topicId))
    .map((c) => ({ topicId: c.topicId, generatorIds: c.generators.map((g) => g.id) }));
}

/** The problems for one blind mixed review; empty when fewer than three mastered topics have content. */
export function planMixedReview(p: Progress, contents: readonly TopicContent[], now: number, seed: number, count = MIXED_DEFAULT_COUNT): MixedItem[] {
  return selectMixedReview({ topics: mixedTopics(p, contents), memory: p.memory, now, count, seed });
}

/** The problem an item names, from its topic's content; undefined when the content or the generator is missing. */
export function mixedInstance(contents: readonly TopicContent[], item: MixedItem): Instance | undefined {
  return contents.find((c) => c.topicId === item.topicId)?.generators.find((g) => g.id === item.generatorId)?.instance(item.seed);
}

/** The heading over an item: "Problem 2 of 6", with the topic once answered. */
export function mixedHeading(item: MixedItem, index: number, total: number, answered: boolean): string {
  const label = mixedLabel(item, answered, titleOf);
  return `Problem ${index + 1} of ${total}${label === null ? '' : `: ${label}`}`;
}

/**
 * Records one answer: the engine's `recordMixed` on memory, and one history entry with the
 * item data (a `quiz` entry when it was the topic's review, a `drill` entry otherwise).
 * No hints are offered in a blind review, so `hints` is 0.
 */
export function recordMixedAnswer(p: Progress, item: MixedItem, correct: boolean, ms: number | undefined, now: number): Progress {
  const { update, kind } = recordMixed(p.memory, ALL_TOPICS, item, correct, now);
  const data: ItemData = { id: item.id, seed: item.seed, hints: 0, attempt: nextAttempt(p.history, kind, item.id) };
  if (ms !== undefined) data.ms = Math.max(0, Math.round(ms));
  const entry: HistoryEntry = { at: now, kind, topicId: item.topicId, correct, item: data };
  return { ...p, memory: { ...update.memory }, history: [...p.history, entry], updatedAt: now };
}
