import { describe, it, expect } from 'vitest';
import { ancestors, formatIssues, frontier, roots, topoOrder, validateGraph } from '@learnhub/mastery';
import { SOURCE_DOCS, topics } from './topics';

const byId = new Map(topics.map((t) => [t.id, t]));

describe('probstats slice graph', () => {
  const result = validateGraph(topics);

  it('passes the validator with zero errors', () => {
    expect(formatIssues(result.errors)).toBe('');
  });

  it('has only the warnings listed in REVIEW.md', () => {
    // No prerequisite edge is implied by another and every source has been read.
    expect(formatIssues(result.warnings)).toBe('');
  });

  it('is the MVP size, 40 to 60 topics', () => {
    expect(topics.length).toBeGreaterThanOrEqual(40);
    expect(topics.length).toBeLessThanOrEqual(60);
  });

  it('cites only known documents', () => {
    for (const t of topics) expect(Object.keys(SOURCE_DOCS)).toContain(t.source.doc);
  });

  it('keeps topics to one idea, 10 to 25 minutes', () => {
    for (const t of topics) {
      expect(t.estMinutes, t.id).toBeGreaterThanOrEqual(10);
      expect(t.estMinutes, t.id).toBeLessThanOrEqual(25);
    }
  });

  it('covers every item of IA Probability "Basic concepts" and "Axiomatic approach"', () => {
    const ia = topics.filter((t) => t.level === 'tripos-ia' && t.source.course === 'IA Probability').map((t) => t.id);
    for (const id of [
      'prob.classical-probability', 'prob.sampling-models', 'prob.stirling-log', 'prob.stirling-formula',
      'prob.axioms', 'prob.point-mass-spaces', 'prob.inclusion-exclusion', 'prob.continuity', 'prob.subadditivity',
      'prob.independence', 'prob.binomial-distribution', 'prob.poisson-distribution', 'prob.geometric-distribution',
      'prob.poisson-binomial-limit', 'prob.conditional-probability', 'prob.bayes-formula', 'prob.simpsons-paradox',
    ]) expect(byId.has(id), id).toBe(true);
    expect(ia.length).toBeGreaterThanOrEqual(15);
  });

  it('puts every prerequisite of Bayes\'s formula below it in topological order', () => {
    const order = topoOrder(topics);
    const at = order.indexOf('prob.bayes-formula');
    for (const a of ancestors(topics, 'prob.bayes-formula')) expect(order.indexOf(a)).toBeLessThan(at);
  });

  it('opens the frontier at the roots', () => {
    expect(frontier(topics, new Set())).toEqual(roots(topics));
  });

  it('reaches every topic when all prerequisites are mastered in order', () => {
    const mastered = new Set<string>();
    for (const id of topoOrder(topics)) {
      expect(frontier(topics, mastered)).toContain(id);
      mastered.add(id);
    }
    expect(frontier(topics, mastered)).toEqual([]);
  });
});
