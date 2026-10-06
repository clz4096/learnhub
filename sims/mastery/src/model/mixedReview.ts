/**
 * Blind mixed review in the app: the engine's rules (packages/mastery mixed.ts) applied to
 * the learner's mastered topics and their downloaded content. Problems from several topics,
 * interleaved, with the topic hidden until each is answered; the topics are chosen from
 * memory state, most overdue first. Pure: the caller loads the content and reads the clock.
 */
import { hasContent, type Instance, type TopicContent } from '@learnhub/content';
import {
  MIXED_DEFAULT_COUNT, MIXED_MIN_TOPICS, mixedLabel, nextAttempt, recordMixed, selectMixedReview,
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

// ---------------------------------------------------------------- the day's sitting

/**
 * Minutes a mixed review takes in the day planner: an assumption of two and a half minutes
 * for each of `MIXED_DEFAULT_COUNT` generated problems, answered without hints.
 */
export const MIXED_MINUTES = 15;

/** Mastered topics with content: what a mixed review can draw on, known without downloading any content. */
export function masteredWithContent(p: Progress): string[] {
  return Object.keys(p.memory).filter((id) => hasContent(id) && isMastered(p, id)).sort();
}

/** Whether a mixed review is worth offering: at least `MIXED_MIN_TOPICS` mastered topics with content. */
export function mixedReady(p: Progress): boolean {
  return masteredWithContent(p).length >= MIXED_MIN_TOPICS;
}

/**
 * One day's mixed review, kept so a reload resumes it: the planned items (planned once,
 * since recording an answer changes the memory the plan is chosen from), the result of each
 * answered so far, in order, and whether a whole review was finished that day.
 */
export interface MixedSitting {
  day: string;
  items: MixedItem[];
  results: boolean[];
  done: boolean;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isItem = (v: unknown): v is MixedItem => isObj(v) && typeof v.topicId === 'string' && typeof v.generatorId === 'string'
  && typeof v.id === 'string' && typeof v.seed === 'number' && Number.isInteger(v.seed) && v.seed >= 0 && v.seed <= 0xffff_ffff;

/** A stored sitting, or null when the text is missing, unreadable, or not well formed. */
export function parseMixedSitting(raw: string | null): MixedSitting | null {
  if (raw === null) return null;
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObj(v) || typeof v.day !== 'string' || !Array.isArray(v.items) || !Array.isArray(v.results) || typeof v.done !== 'boolean') return null;
  if (!v.items.every(isItem) || !v.results.every((x) => typeof x === 'boolean') || v.results.length > v.items.length) return null;
  return { day: v.day, items: v.items.map((x) => ({ ...(x as MixedItem) })), results: [...(v.results as boolean[])], done: v.done };
}

/** The sitting with one more answer; finishing the last item marks the day done. */
export function answerMixed(s: MixedSitting, correct: boolean): MixedSitting {
  if (s.results.length >= s.items.length) return s;
  const results = [...s.results, correct];
  return { ...s, results, done: s.done || results.length === s.items.length };
}

/** Whether today's mixed review was finished, from the stored sitting. */
export const mixedDoneOn = (s: MixedSitting | null, day: string): boolean => s !== null && s.day === day && s.done;
