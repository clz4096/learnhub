/** Blind mixed review in the app: mastered topics only, the topic hidden until answered, and the record. */
import { describe, expect, it } from 'vitest';
import { gateOf, grade, type TopicContent } from '@learnhub/content';
import { TOPIC_CONTENT } from '@learnhub/content/all';
import { DAY_MS, GYM_CREDIT, newMemory, type Progress } from '@learnhub/mastery';
import { titleOf } from '@/model/courses';
import { DEFAULT_COURSES, recordCambridgeAnswer, startLearner } from '@/model/learner';
import { mixedHeading, mixedInstance, mixedTopics, planMixedReview, recordMixedAnswer } from '@/model/mixedReview';

const T0 = new Date(2026, 9, 5, 14, 0).getTime();
/** Topics with generators and a gate, so they can be mastered. */
const CONTENTS: TopicContent[] = TOPIC_CONTENT.filter((c) => c.generators.length > 0 && gateOf(c.topicId).length > 0).slice(0, 5);

/** Learned at T0 - 3 days; the first `gated` also meet their gate. The first is due, the rest not. */
function learner(gated: number): Progress {
  let p = startLearner(T0 - 3 * DAY_MS, DEFAULT_COURSES, 60);
  const memory: Progress['memory'] = {};
  CONTENTS.forEach((c, i) => { memory[c.topicId] = { ...newMemory(T0 - 3 * DAY_MS), intervalDays: 10, due: i === 0 ? T0 - DAY_MS : T0 + (i + 1) * DAY_MS }; });
  p = { ...p, memory };
  for (const c of CONTENTS.slice(0, gated)) p = recordCambridgeAnswer(p, `${c.topicId}/${gateOf(c.topicId)[0]}`, true, { hints: 0 }, T0 - 2 * DAY_MS);
  return p;
}

describe('mixed review in the app', () => {
  it('uses mastered topics only: learned and gated', () => {
    expect(CONTENTS).toHaveLength(5);
    expect(mixedTopics(learner(4), CONTENTS).map((t) => t.topicId)).toEqual(CONTENTS.slice(0, 4).map((c) => c.topicId));
    expect(mixedTopics(learner(0), CONTENTS)).toEqual([]);
  });

  it('plans nothing with fewer than three mastered topics', () => {
    expect(planMixedReview(learner(2), CONTENTS, T0, 1)).toEqual([]);
    expect(planMixedReview(learner(4), CONTENTS, T0, 1)).toHaveLength(6);
  });

  it('every planned item is a real problem, and its heading hides the topic until answered', () => {
    const items = planMixedReview(learner(5), CONTENTS, T0, 3, 8);
    items.forEach((item, i) => {
      const inst = mixedInstance(CONTENTS, item);
      expect(inst).toBeDefined();
      expect(grade(inst!.problem, inst!.reference).correct).toBe(true);
      expect(mixedHeading(item, i, items.length, false)).toBe(`Problem ${i + 1} of 8`);
      expect(mixedHeading(item, i, items.length, true)).toBe(`Problem ${i + 1} of 8: ${titleOf(item.topicId)}`);
    });
    expect(mixedInstance(CONTENTS, { ...items[0]!, generatorId: 'nope' })).toBeUndefined();
  });

  it('records a due topic as its review (a quiz entry) and another as a drill', () => {
    const p = learner(5);
    const [due, later] = [CONTENTS[0]!.topicId, CONTENTS[1]!.topicId];
    const g = (id: string): string => CONTENTS.find((c) => c.topicId === id)!.generators[0]!.id;
    const a = recordMixedAnswer(p, { topicId: due, generatorId: g(due), seed: 9, id: `${due}/${g(due)}` }, true, 30_400.6, T0);
    expect(a.history.at(-1)).toEqual({ at: T0, kind: 'quiz', topicId: due, correct: true, item: { id: `${due}/${g(due)}`, seed: 9, hints: 0, attempt: 1, ms: 30_401 } });
    expect(a.memory[due]!.reps).toBe(1);
    expect(a.memory[due]!.due).toBeGreaterThan(T0);
    expect(a.updatedAt).toBe(T0);
    const b = recordMixedAnswer(a, { topicId: later, generatorId: g(later), seed: 4, id: `${later}/${g(later)}` }, true, undefined, T0 + 1);
    expect(b.history.at(-1)?.kind).toBe('drill');
    expect(b.history.at(-1)?.item).toEqual({ id: `${later}/${g(later)}`, seed: 4, hints: 0, attempt: 1 });
    expect(b.memory[later]!.implicitCredit).toBe(GYM_CREDIT.drill);
  });
});
