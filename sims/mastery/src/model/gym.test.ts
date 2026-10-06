import { describe, expect, it } from 'vitest';
import { t, type TopicContent } from '@learnhub/content';
import { contentFor } from '@learnhub/content/all';
import { DAY_MS, GYM_MINUTES, gymRepUnits } from '@learnhub/mastery';
import { DEFAULT_COURSES, completeGymItem, completeLesson, masteryOf, startLearner } from '@/model/learner';
import { gymCandidates, gymDoneSince, planGym } from '@/model/gym';

const T0 = new Date(2026, 9, 5, 14, 0).getTime();
const base = contentFor('pre.fractions') as TopicContent;
/** pre.fractions with gym content: one quick generator, a proof order, and two recall cards. */
const withGym: TopicContent = {
  ...base,
  generators: base.generators.map((g, i) => (i === 0 ? { ...g, quick: true } : g)),
  proofOrder: [{ title: t`A product telescopes`, steps: [t`Write each factor as a fraction.`, t`Cancel each top with the next bottom.`, t`Read off what is left.`] }],
  recall: [{ front: t`What is a fraction?`, back: t`A ratio of two whole numbers.` }, { front: t`What is lowest terms?`, back: t`No common factor left.` }],
};

describe('gym candidates from content', () => {
  it('offer the review, quick drills only, each proof order and recall card, and listening', () => {
    const g0 = withGym.generators[0]?.id as string;
    expect(gymCandidates(withGym).map((c) => c.id)).toEqual([
      'review:pre.fractions', `drill:pre.fractions/${g0}`, 'order:pre.fractions#0', 'recall:pre.fractions#0', 'recall:pre.fractions#1', 'listen:pre.fractions',
    ]);
    // Content without gym fields offers only the review and listening.
    expect(gymCandidates(base).map((c) => c.kind)).toEqual(['review', 'listen']);
    for (const c of gymCandidates(withGym)) expect(c.minutes).toBe(GYM_MINUTES[c.kind]);
  });
});

describe('planning a gym window', () => {
  const learned = completeLesson(startLearner(T0, DEFAULT_COURSES, 60), 'pre.fractions', true, T0 - 3 * DAY_MS, null, 15);

  it('plans only for learned topics, within the window, and the review once it is due', () => {
    const plan = planGym(learned, [withGym], T0, 20, T0 - 1000);
    expect(plan.map((c) => c.kind)).toEqual(['review', 'drill', 'order', 'recall', 'recall', 'listen']);
    expect(plan.reduce((a, c) => a + c.minutes, 0)).toBeLessThanOrEqual(20);
    expect(planGym(startLearner(T0, DEFAULT_COURSES, 60), [withGym], T0, 20, T0)).toEqual([]);
  });

  it('leaves out what was done today, feeds spaced review, earns gym REP, and never meets the gate', () => {
    let p = completeGymItem(learned, { kind: 'review', topicId: 'pre.fractions', id: 'review:pre.fractions' }, true, { hints: 0, ms: 120_000 }, T0);
    p = completeGymItem(p, { kind: 'recall', topicId: 'pre.fractions', id: 'recall:pre.fractions#0' }, true, { hints: 0 }, T0 + 1);
    expect(gymDoneSince(p, T0 - 1000)).toEqual(['review:pre.fractions', 'recall:pre.fractions#0']);
    expect(planGym(p, [withGym], T0 + 2, 20, T0 - 1000).map((c) => c.id)).not.toContain('recall:pre.fractions#0');
    expect(p.memory['pre.fractions']?.reps).toBe((learned.memory['pre.fractions']?.reps ?? 0) + 1);
    expect(gymRepUnits(p.history, (ms) => new Date(ms).toDateString())).toBe(2);
    expect(masteryOf(p, 'pre.fractions').stage).toBe('needs-gate');
  });
});
