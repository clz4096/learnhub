import { describe, it, expect } from 'vitest';
import type { Level, Topic } from './graph';
import {
  DEFAULT_PLACEMENT_OPTIONS, classify, graphBudget, nextProbe, placementBudget, placementGraph, placementResult, runPlacement, type PlacementAnswer,
} from './placement';
import { measurePlacement } from './simulate';

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
    expect([51, 60, 61, 62, 98, 200].map(placementBudget)).toEqual([30, 30, 31, 31, 49, 100]);
  });

  it('never exceeds the number of topics, since each question classifies at least one', () => {
    expect([0, 1, 10, 29, 30, 31].map(placementBudget)).toEqual([0, 1, 10, 29, 30, 30]);
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

describe('probeable: placement asks only about topics it can measure', () => {
  // A chain of 15 where only even-numbered topics have a real problem.
  const topics = chain(15);
  const even = (id: string): boolean => Number(id.slice(3)) % 2 === 0;
  const g = placementGraph(topics, { probeable: even });
  const probed = g.order.filter(even);

  it('keeps the whole closure for the frontier but probes only the probeable topics', () => {
    expect(g.order).toHaveLength(15);
    expect([...g.probeable]).toEqual(probed);
    expect(probed).toHaveLength(8);
  });

  it('classifies unprobeable topics as unknown from the start, and no answer spreads to them', () => {
    const c = classify(g, [A('t.c8', true)]);
    expect(g.order.filter((id) => c.get(id) === 'known')).toEqual(['t.c0', 't.c2', 't.c4', 't.c6', 't.c8']);
    for (const id of g.order.filter((x) => !even(x))) expect(c.get(id)).toBe('unknown');
  });

  it('ignores answers about unprobeable topics, so old self-reported answers count for nothing', () => {
    const c = classify(g, [A('t.c13', true)]);
    expect(g.order.filter((id) => c.get(id) === 'known')).toEqual([]);
  });

  // Truthful learners know a prefix of the chain; placement must get every probeable topic right.
  for (let k = 0; k <= 15; k++) {
    it(`a learner who knows the first ${k} is placed exactly on the probeable topics, asked only about them`, () => {
      const { answers, result } = runPlacement(g, (id) => Number(id.slice(3)) < k, 0);
      for (const a of answers) expect(even(a.topicId)).toBe(true);
      expect(result.mastered).toEqual(probed.filter((id) => Number(id.slice(3)) < k));
      expect(result.unclassified).toEqual([]);
      expect(result.notProbed).toEqual(g.order.filter((id) => !even(id)));
      // Binary search over 8 probeable topics: at most ceil(log2(9)) = 4 questions.
      expect(result.questions).toBeLessThanOrEqual(4);
    });
  }

  it('sizes the default budget by the probeable topics, not the closure', () => {
    const roots = Array.from({ length: 98 }, (_, i) => T(`t.r${i}`));
    const g10 = placementGraph(roots, { probeable: (id) => Number(id.slice(3)) < 10 });
    expect(graphBudget(g10)).toBe(10);
    const { answers } = runPlacement(g10, () => true, 0);
    expect(answers).toHaveLength(10);
    expect(placementResult(g10, answers).mastered).toHaveLength(10);
  });

  it('the exactness measurement counts probeable topics only', () => {
    const m = measurePlacement(topics, { learners: 200, errorRate: 0, budget: graphBudget(g), strategy: 'split', seed: 1, probeable: even });
    expect(m.exact).toBe(1);
    expect(m.maxQuestions).toBeLessThanOrEqual(4);
  });

  it('with every topic probeable, nothing changes', () => {
    const all = placementGraph(topics);
    expect(all.probeable.size).toBe(15);
    expect(graphBudget(all)).toBe(15);
  });
});
