/**
 * Choosing problems: which generator and seed comes next in practice, a review, a quiz,
 * or placement, and the mastery rule's bookkeeping. Seeds mix the topic, the occasion,
 * and the attempt number, so a problem is reproducible from its record but fresh on
 * another day.
 */
import type { Instance, MasteryRule, TopicContent } from '@learnhub/content';

/** FNV-1a over the parts, as an unsigned 32-bit seed. */
export function seedFor(...parts: readonly (string | number)[]): number {
  let h = 0x811c9dc5;
  for (const ch of parts.join('|')) {
    h ^= ch.codePointAt(0) as number;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Problem k of a run: the generators in turn, so practice covers every skill of the topic. */
export function instanceAt(c: TopicContent, salt: string | number, k: number): Instance {
  const g = c.generators[k % c.generators.length];
  if (g === undefined) throw new Error(`${c.topicId} has no generators`);
  return g.instance(seedFor(c.topicId, salt, k));
}

export interface PracticeState {
  /** Problems answered so far. */
  attempts: number;
  /** Right answers in a row, ending with the latest. */
  streak: number;
  results: boolean[];
}

export type PracticeOutcome = 'continue' | 'mastered' | 'not-yet';

export const freshPractice = (): PracticeState => ({ attempts: 0, streak: 0, results: [] });

/** Records one answer. Mastered when the streak reaches the rule; not yet once the problems run out first. */
export function answer(s: PracticeState, correct: boolean, rule: MasteryRule): { state: PracticeState; outcome: PracticeOutcome } {
  const state: PracticeState = { attempts: s.attempts + 1, streak: correct ? s.streak + 1 : 0, results: [...s.results, correct] };
  if (state.streak >= rule.correctInARow) return { state, outcome: 'mastered' };
  // Stop once even a perfect run of the problems left could not reach the streak.
  if (state.attempts + (rule.correctInARow - state.streak) > rule.maxProblems) return { state, outcome: 'not-yet' };
  return { state, outcome: 'continue' };
}

/** A review is two problems from different skills; it passes when both are right. */
export const REVIEW_PROBLEMS = 2;
