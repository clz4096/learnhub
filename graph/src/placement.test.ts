import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PLACEMENT_OPTIONS, classify, frontier, isAncestorClosed, isDescendantClosed, measurePlacement,
  mulberry32, nextProbe, placementGraph, placementResult, randomKnownSet, runPlacement,
  type PlacementAnswer, type PlacementStrategy, type Topic,
} from '@learnhub/mastery';
import { courseById, coursesTopics } from './courses';
import { topics } from './topics';

// Placement measured on real content: the probstats slice (IA Probability's closure).
const probstats = coursesTopics(topics, [courseById('ia-probability')]);
const A = (topicId: string, correct: boolean): PlacementAnswer => ({ topicId, correct, at: 0 });

describe('classify on the probstats graph', () => {
  it('keeps known closed under ancestors and unknown under descendants for any answer sequence', () => {
    const pg = placementGraph(probstats);
    const rng = mulberry32(7);
    for (let n = 0; n < 200; n++) {
      const answers = Array.from({ length: 1 + Math.floor(rng() * 20) }, () => A(pg.order[Math.floor(rng() * pg.order.length)] as string, rng() < 0.5));
      const c = classify(pg, answers);
      const known = new Set([...c].filter(([, s]) => s === 'known').map(([id]) => id));
      const unknown = new Set([...c].filter(([, s]) => s === 'unknown').map(([id]) => id));
      expect(isAncestorClosed(probstats, known)).toBe(true);
      expect(isDescendantClosed(probstats, unknown)).toBe(true);
    }
  });
});

describe('budget and stopping', () => {
  const g = placementGraph(probstats);

  it('stops at the budget and treats unclassified topics as not known', () => {
    for (const budget of [0, 1, 5, 12]) {
      const { answers, result } = runPlacement(g, () => true, 0, { budget });
      expect(answers.length).toBeLessThanOrEqual(budget);
      expect(result.questions).toBe(answers.length);
      expect(nextProbe(g, answers, { budget })).toBeNull();
      for (const id of result.unclassified) expect(result.mastered).not.toContain(id);
    }
  });

  it('stops before the budget once everything is classified', () => {
    const { answers, result } = runPlacement(g, () => false, 0);
    expect(result.mastered).toEqual([]);
    expect(result.unclassified).toEqual([]);
    expect(answers.length).toBeLessThan(DEFAULT_PLACEMENT_OPTIONS.budget);
    expect(nextProbe(g, answers)).toBeNull();
  });

  it('never probes the same topic twice', () => {
    for (const strategy of ['split', 'entry-points'] as const) {
      const rng = mulberry32(3);
      const { answers } = runPlacement(g, () => rng() < 0.5, 0, { strategy, budget: 60 });
      expect(new Set(answers.map((a) => a.topicId)).size).toBe(answers.length);
    }
  });

  it('records the injected time on every answer', () => {
    const { answers } = runPlacement(g, () => true, 1234, { budget: 3 });
    expect(answers.every((a) => a.at === 1234)).toBe(true);
  });

  it('result frontier matches the graph frontier of the mastered set', () => {
    const answers = [A('prob.binomial-distribution', true), A('prob.poisson-distribution', false)];
    const r = placementResult(g, answers);
    expect(r.frontier).toEqual(frontier(probstats, new Set(r.mastered)));
    expect(r.mastered).toContain('comb.combinations');
    expect(r.mastered).not.toContain('prob.poisson-distribution');
  });
});

describe('entry points on the probstats graph', () => {
  const g = placementGraph(probstats);
  // From reviews/probstats-slice.md, "Placement test entry points", with the topics
  // each correct answer credits (the probe plus its ancestors).
  const review: [string, number][] = [
    ['prob.poisson-distribution', 15], ['prob.binomial-distribution', 10], ['prob.counting-probability', 8],
    ['prob.conditional-formula', 8], ['comb.binomial-theorem', 7], ['an.exp-limit', 7],
    ['calc.integration-by-parts', 6], ['prob.inclusion-exclusion-three', 6], ['comb.binomial-identities', 6],
    ['alg.proof-by-induction', 5], ['comb.repeated-arrangements', 5],
  ];

  it('are the 11 topics REVIEW.md lists, largest credit first', () => {
    expect(new Set(g.entries)).toEqual(new Set(review.map(([id]) => id)));
    const credited = g.entries.map((id) => (g.anc.get(id)?.size ?? 0) + 1);
    expect([...credited].sort((a, b) => b - a)).toEqual(credited);
    for (const [id, n] of review) expect((g.anc.get(id)?.size ?? 0) + 1, id).toBe(n);
  });

  it('cover every pre-A-level, A-level, and STEP topic', () => {
    const low = new Set(probstats.filter((t) => ['pre-a-level', 'a-level', 'step'].includes(t.level)).map((t) => t.id));
    const covered = new Set(g.entries.flatMap((id) => [id, ...(g.anc.get(id) ?? [])]));
    expect(covered).toEqual(low);
  });

  it('the entry-points strategy opens at the first entry point and searches down after a miss', () => {
    const opts = { strategy: 'entry-points' as const };
    expect(nextProbe(g, [], opts)).toBe('prob.poisson-distribution');
    const after = nextProbe(g, [A('prob.poisson-distribution', false)], opts) as string;
    expect(g.anc.get('prob.poisson-distribution')?.has(after)).toBe(true);
  });

  it('a miss at the bottom of a branch reaches the pre-A-level roots', () => {
    const { answers } = runPlacement(g, () => false, 0, { strategy: 'entry-points', budget: 60 });
    const levels = new Set(answers.map((a) => probstats.find((t) => t.id === a.topicId)?.level));
    expect(levels.has('pre-a-level')).toBe(true);
  });
});

describe('simulated learners on the probstats graph', { timeout: 60_000 }, () => {
  const g = placementGraph(probstats);
  const profiles: [string, (t: Topic) => boolean][] = [
    ['nothing', () => false],
    ['pre-A-level only', (t) => t.level === 'pre-a-level'],
    ['through A-level', (t) => t.level === 'pre-a-level' || t.level === 'a-level'],
    ['through STEP', (t) => t.level !== 'tripos-ia'],
    ['everything', () => true],
  ];

  for (const strategy of ['split', 'entry-points'] as PlacementStrategy[]) {
    for (const [name, knows] of profiles) {
      it(`${strategy}: a truthful learner who knows ${name} is placed exactly within the default budget`, () => {
        const known = new Set(probstats.filter(knows).map((t) => t.id));
        const { result } = runPlacement(g, (id) => known.has(id), 0, { strategy });
        expect(new Set(result.mastered)).toEqual(known);
        expect(result.questions).toBeLessThanOrEqual(DEFAULT_PLACEMENT_OPTIONS.budget);
      });
    }
  }

  it('the random learners are closed under ancestors', () => {
    const rng = mulberry32(11);
    for (let i = 0; i < 100; i++) expect(isAncestorClosed(probstats, randomKnownSet(g, rng))).toBe(true);
  });

  it('every truthful random learner is placed exactly with an unlimited budget', () => {
    for (const strategy of ['split', 'entry-points'] as PlacementStrategy[]) {
      const m = measurePlacement(probstats, { learners: 500, errorRate: 0, budget: probstats.length, strategy, seed: 1 });
      expect(m.exact, strategy).toBe(1);
      expect(m.maxQuestions).toBeLessThanOrEqual(probstats.length);
    }
  });

  it('every truthful random learner is placed exactly within the default budget', () => {
    for (const seed of [1, 2]) {
      const m = measurePlacement(probstats, { learners: 500, errorRate: 0, budget: DEFAULT_PLACEMENT_OPTIONS.budget, strategy: 'split', seed });
      expect(m.exact).toBe(1);
      expect(m.maxQuestions).toBeLessThanOrEqual(DEFAULT_PLACEMENT_OPTIONS.budget);
    }
  });

  // Measured 89%: the shortfall is all under-placement, because unclassified topics count as unknown.
  it('at a budget of 25, split places at least 85% exactly and never over-places', () => {
    const m = measurePlacement(probstats, { learners: 500, errorRate: 0, budget: 25, strategy: 'split', seed: 1 });
    expect(m.exact).toBeGreaterThanOrEqual(0.85);
    expect(m.meanOverPlaced).toBe(0);
    expect(m.maxQuestions).toBeLessThanOrEqual(25);
  });

  it('split places more truthful learners exactly than entry-points at 25 questions', () => {
    const split = measurePlacement(probstats, { learners: 500, errorRate: 0, budget: 25, strategy: 'split', seed: 1 });
    const entry = measurePlacement(probstats, { learners: 500, errorRate: 0, budget: 25, strategy: 'entry-points', seed: 1 });
    expect(split.exact).toBeGreaterThan(entry.exact);
  });

  // With error rate e and about 22 questions, a run with no wrong answer has probability
  // (1 - e)^22: 32% at e = 5%. So exactness drops; the bound is on how far off it is.
  it('with a 5% error rate, misplacement stays bounded', () => {
    const m = measurePlacement(probstats, { learners: 500, errorRate: 0.05, budget: DEFAULT_PLACEMENT_OPTIONS.budget, strategy: 'split', seed: 1 });
    expect(m.meanWrong).toBeLessThanOrEqual(3);
    expect(m.meanOverPlaced).toBeLessThanOrEqual(1.5);
    expect(m.maxQuestions).toBeLessThanOrEqual(DEFAULT_PLACEMENT_OPTIONS.budget);
  });

  it('with a 10% error rate, misplacement stays bounded', () => {
    const m = measurePlacement(probstats, { learners: 500, errorRate: 0.1, budget: DEFAULT_PLACEMENT_OPTIONS.budget, strategy: 'split', seed: 1 });
    expect(m.meanWrong).toBeLessThanOrEqual(5);
    expect(m.meanOverPlaced).toBeLessThanOrEqual(2.5);
  });
});
