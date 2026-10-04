import { describe, it, expect } from 'vitest';
import {
  ancestors, courseClosure, measurePlacement, placementGraph, runPlacement, simulate,
} from '@learnhub/mastery';
import { courseById, coursesTopics } from './courses';
import { topics } from './topics';

const probstats = coursesTopics(topics, [courseById('ia-probability')]);
const NOW = Date.UTC(2026, 9, 4);

describe('a Bayes course inside the probstats graph', () => {
  it('on probstats, Bayes needs exactly its ancestors', () => {
    const c = courseClosure(probstats, ['prob.bayes-formula']);
    expect(c).toEqual(new Set([...ancestors(probstats, 'prob.bayes-formula'), 'prob.bayes-formula']));
    expect(c.size).toBeLessThan(probstats.length);
  });
  it('on probstats, a Bayes course places truthful random learners exactly and stays inside its closure', () => {
    const targets = ['prob.bayes-formula'];
    const m = measurePlacement(probstats, { learners: 300, errorRate: 0, budget: 30, strategy: 'split', seed: 3, targets });
    expect(m.exact).toBe(1);
    const closure = courseClosure(probstats, targets);
    const { answers } = runPlacement(placementGraph(probstats, { targets }), () => false, NOW);
    for (const a of answers) expect(closure.has(a.topicId)).toBe(true);
  });
});

describe('simulation over a course', () => {
  it('masters the Bayes closure and nothing outside it', { timeout: 30_000 }, () => {
    const targets = ['prob.bayes-formula'];
    const closure = courseClosure(probstats, targets);
    const r = simulate({ topics: probstats, targets, seed: 1, days: 40 });
    expect(r.dayAllMastered).not.toBeNull();
    const last = r.days[r.days.length - 1];
    expect(last?.mastered).toBe(closure.size);
  });
});
