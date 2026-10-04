import { describe, it, expect } from 'vitest';
import type { Level, Topic } from './graph';
import { classify, nextProbe, placementGraph, runPlacement, type PlacementAnswer } from './placement';

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

