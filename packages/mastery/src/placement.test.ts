import { describe, it, expect } from 'vitest';
import type { Level, Topic } from './graph';
import { DEFAULT_PLACEMENT_OPTIONS, classify, nextProbe, placementBudget, placementGraph, runPlacement, type PlacementAnswer } from './placement';

function T(id: string, prereqs: string[] = []): Topic {
  return {
    id, title: id, summary: `${id}.`, level: (prereqs.length === 0 ? 'pre-a-level' : 'step') as Level, area: 'x',
    prereqs, encompasses: {}, sources: [{ doc: 'd', course: 'c', section: 's', verified: true }], estMinutes: 15,
  };
}

const chain = (n: number): Topic[] => Array.from({ length: n }, (_, i) => T(`t.c${i}`, i === 0 ? [] : [`t.c${i - 1}`]));
const A = (topicId: string, correct: boolean): PlacementAnswer => ({ topicId, correct, at: 0 });

describe('classify', () => {
  const g = placementGraph(chain(5));

  it('a correct answer credits the topic and every ancestor', () => {
    const c = classify(g, [A('t.c2', true)]);
    expect([...c.values()]).toEqual(['known', 'known', 'known', 'unclassified', 'unclassified']);
  });

  it('a wrong answer marks the topic and every descendant unknown', () => {
    const c = classify(g, [A('t.c2', false)]);
    expect([...c.values()]).toEqual(['unclassified', 'unclassified', 'unknown', 'unknown', 'unknown']);
  });

  it('later answers override earlier ones and the sets stay closed', () => {
    const c = classify(g, [A('t.c3', true), A('t.c1', false)]);
    expect([...c.values()]).toEqual(['known', 'unknown', 'unknown', 'unknown', 'unknown']);
  });

  it('ignores answers about unknown ids', () => {
    expect([...classify(g, [A('nope', true)]).values()].every((s) => s === 'unclassified')).toBe(true);
  });

});

describe('placement on a chain is binary search', () => {
  const topics = chain(15);
  const g = placementGraph(topics);
  for (let k = 0; k <= 15; k++) {
    it(`a learner who knows the first ${k} is placed exactly in at most 4 questions`, () => {
      const { result } = runPlacement(g, (id) => Number(id.slice(3)) < k, 0);
      expect(result.mastered).toEqual(g.order.slice(0, k));
      expect(result.unclassified).toEqual([]);
      expect(result.questions).toBeLessThanOrEqual(4);
      expect(result.frontier).toEqual(k < 15 ? [`t.c${k}`] : []);
    });
  }
  it('opens at the midpoint', () => {
    expect(nextProbe(g, [])).toBe('t.c7');
  });
});


describe('the default budget scales with the closure', () => {
  it('is 30 up to 60 topics, then one question per two topics', () => {
    expect(DEFAULT_PLACEMENT_OPTIONS.budget).toBe(30);
    expect([1, 51, 60, 61, 62, 98, 200].map(placementBudget)).toEqual([30, 30, 30, 31, 31, 49, 100]);
  });

  // 98 unrelated roots: every answer classifies one topic, so only the budget stops placement.
  const roots = Array.from({ length: 98 }, (_, i) => T(`t.r${i}`));
  const g = placementGraph(roots);

  it('nextProbe uses it when no budget is given', () => {
    const { answers } = runPlacement(g, () => true, 0);
    expect(answers).toHaveLength(49);
    expect(nextProbe(g, answers.slice(0, 48))).not.toBeNull();
    expect(nextProbe(g, answers)).toBeNull();
  });

  it('an explicit budget still wins', () => {
    expect(runPlacement(g, () => true, 0, { budget: 30 }).answers).toHaveLength(30);
  });
});
