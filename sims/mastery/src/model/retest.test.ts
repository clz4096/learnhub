// Rule 6 (mastery/HOW-A-TOPIC-WORKS.md), as a learner meets it: master a topic, pass the cold
// retest at 7 days, miss the one at 30 days, see "needs review", and master it again.
import { describe, expect, it } from 'vitest';
import { catalogProblem, gateOf } from '@learnhub/content';
import { DAY_MS, RETEST_DAYS, newMemory, type Progress } from '@learnhub/mastery';
import { RETEST_MINUTES, dayItems } from './dayQueue';
import { isMastered, masteryOf, recordCambridgeAnswer, retestOf, startLearner, statusMap, DEFAULT_COURSES } from './learner';
import { ALL_TOPICS, titleOf, topicOf } from './courses';

const T0 = new Date(2026, 9, 5, 9, 0).getTime();

/** A topic with three auto-checked gate problems, found in the catalog so the test follows the content. */
const TOPIC = ALL_TOPICS.map((t) => t.id).find((id) => gateOf(id).filter((g) => catalogProblem(id, g)?.mode === 'auto').length >= 3) as string;
const GATE = gateOf(TOPIC).filter((g) => catalogProblem(TOPIC, g)?.mode === 'auto');
const key = (id: string): string => `${TOPIC}/${id}`;

const answer = (p: Progress, problemId: string, correct: boolean, at: number): Progress =>
  recordCambridgeAnswer(p, key(problemId), correct, { hints: correct ? 0 : 1 }, at);

const retestsToday = (p: Progress, at: number) => dayItems(p, at).filter((x) => x.kind === 'retest');

describe('a learner through the cold retests', () => {
  it('there is a topic to walk through', () => {
    expect(TOPIC).toBeDefined();
    expect(GATE.length).toBeGreaterThanOrEqual(3);
  });

  it('master, pass at 7 days, miss at 30 days, needs review, mastered again', () => {
    let p: Progress = { ...startLearner(T0, DEFAULT_COURSES, 60), memory: { [TOPIC]: { ...newMemory(T0), intervalDays: 100, due: T0 + 100 * DAY_MS } } };
    const first = GATE[0] as string;

    // Day 0: the first gate problem solved unaided. Mastered; nothing to retest today.
    p = answer(p, first, true, T0 + 60_000);
    expect(masteryOf(p, TOPIC).stage).toBe('mastered');
    expect(retestsToday(p, T0 + 120_000)).toEqual([]);

    // Day 7: "Retest: <topic>" on Today, a different problem, opened alone (no lesson first).
    const day7 = T0 + RETEST_DAYS[0] * DAY_MS + 60_000;
    const [r7] = retestsToday(p, day7);
    expect(r7).toMatchObject({ title: `Retest: ${titleOf(TOPIC)}`, kind: 'retest', minutes: RETEST_MINUTES, done: false });
    expect(r7?.to.view).toBe('problem');
    const p7 = r7?.to.view === 'problem' ? r7.to.problemId : '';
    expect(p7).not.toBe(first);
    expect(GATE).toContain(p7);

    // Passed: still mastered, and the item is ticked off for the rest of the day.
    p = answer(p, p7, true, day7 + 600_000);
    expect(isMastered(p, TOPIC)).toBe(true);
    expect(retestsToday(p, day7 + 700_000)).toMatchObject([{ title: `Retest: ${titleOf(TOPIC)}`, done: true }]);
    expect(retestOf(p, TOPIC).log.map((r) => r.outcome)).toEqual(['passed']);

    // Day 30: the second retest, on a problem other than the one just passed.
    const day30 = T0 + RETEST_DAYS[1] * DAY_MS + 60_000;
    const [r30] = retestsToday(p, day30);
    expect(r30?.done).toBe(false);
    const p30 = r30?.to.view === 'problem' ? r30.to.problemId : '';
    expect(p30).not.toBe(p7);

    // Missed: the topic needs review, shown plainly, and no longer counts as mastered.
    p = answer(p, p30, false, day30 + 600_000);
    expect(masteryOf(p, TOPIC).stage).toBe('needs-review');
    expect(isMastered(p, TOPIC)).toBe(false);
    expect(statusMap(p, day30 + 700_000, [topicOf(TOPIC)!]).get(TOPIC)).toBe('review');
    const review = retestsToday(p, day30 + 700_000).find((x) => !x.done);
    expect(review).toMatchObject({ title: `Needs review: ${titleOf(TOPIC)}`, to: { view: 'problem', topicId: TOPIC, problemId: p30 } });

    // Hints as usual, then the right answer: mastered again, and the retests start over.
    const again = day30 + 3_600_000;
    p = answer(p, p30, true, again);
    expect(masteryOf(p, TOPIC).stage).toBe('mastered');
    expect(retestsToday(p, again + 60_000).some((x) => !x.done)).toBe(false);
    expect(retestOf(p, TOPIC).next?.due).toBe(again + RETEST_DAYS[0] * DAY_MS);
    expect(retestOf(p, TOPIC).log.map((r) => r.outcome)).toEqual(['passed', 'missed']);
  });
});
