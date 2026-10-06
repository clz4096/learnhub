/**
 * Gym mode's model in the app (decision 3 of 2026-10-05): the gym items a topic's content
 * offers, and the plan for one gym window. The rules (what is offered, in what order, what
 * each item does to spaced review, and its REP) are the engine's (packages/mastery gym.ts);
 * recording a done item is `completeGymItem` (learner.ts). The gym screens are built on these.
 */
import type { TopicContent } from '@learnhub/content';
import { GYM_MINUTES, gymItemId, selectGym, type GymCandidate, type Progress } from '@learnhub/mastery';

/**
 * Every gym item a topic's content offers: its review, one quick drill per generator
 * flagged `quick`, each proof-order puzzle, each recall card, and the lesson to listen to.
 */
export function gymCandidates(c: TopicContent): GymCandidate[] {
  const item = (kind: GymCandidate['kind'], part?: string | number): GymCandidate => ({ kind, topicId: c.topicId, id: gymItemId(kind, c.topicId, part), minutes: GYM_MINUTES[kind] });
  return [
    item('review'),
    ...c.generators.filter((g) => g.quick === true).map((g) => item('drill', g.id)),
    ...(c.proofOrder ?? []).map((_, i) => item('order', i)),
    ...(c.recall ?? []).map((_, i) => item('recall', i)),
    item('listen'),
  ];
}

/** The ids of gym items done today: the `gym` history entries since `dayStart`. */
export function gymDoneSince(p: Progress, dayStart: number): string[] {
  return p.history.flatMap((h) => (h.kind === 'gym' && h.at >= dayStart && h.item !== undefined ? [h.item.id] : []));
}

/**
 * The items for a gym window of `minutes`, from the topics whose content is loaded, leaving
 * out what was done since `dayStart`. Pure: the caller loads the content and reads the clock.
 */
export function planGym(p: Progress, contents: readonly TopicContent[], now: number, minutes: number, dayStart: number): GymCandidate[] {
  return selectGym({ candidates: contents.flatMap(gymCandidates), memory: p.memory, now, minutes, done: gymDoneSince(p, dayStart) });
}
