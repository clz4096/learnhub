import { describe, it, expect } from 'vitest';
import {
  LEVELS, ancestors, courseClosure, formatIssues, frontier, roots, topoOrder, validateGraph,
} from '@learnhub/mastery';
import { COURSES, courseById, courseTargets, coursesClosure, coursesTopics, type Course } from './courses';
import { SOURCE_DOCS } from './sources';
import { AREAS, topics } from './topics';

const byId = new Map(topics.map((t) => [t.id, t]));

describe('the shared graph', () => {
  const result = validateGraph(topics);

  it('passes the validator with zero errors', () => {
    expect(formatIssues(result.errors)).toBe('');
  });

  it('has zero warnings', () => {
    // No prerequisite edge is implied by another and every source has been read.
    expect(formatIssues(result.warnings)).toBe('');
  });

  it('cites only known documents', () => {
    for (const t of topics) for (const s of t.sources) expect(Object.keys(SOURCE_DOCS), t.id).toContain(s.doc);
  });

  it('never cites the same document, course, and section twice on one topic', () => {
    for (const t of topics) {
      const keys = t.sources.map((s) => `${s.doc}|${s.course}|${s.section}`);
      expect(new Set(keys).size, t.id).toBe(keys.length);
    }
  });

  it('keeps topics to one idea, 10 to 25 minutes', () => {
    for (const t of topics) {
      expect(t.estMinutes, t.id).toBeGreaterThanOrEqual(10);
      expect(t.estMinutes, t.id).toBeLessThanOrEqual(25);
    }
  });

  it('puts each topic in the file of its area', () => {
    for (const [area, ts] of Object.entries(AREAS)) for (const t of ts) expect(t.area, t.id).toBe(area);
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

describe('courses', () => {
  it('have unique ids, and every course is cited by at least one topic', () => {
    expect(new Set(COURSES.map((c) => c.id)).size).toBe(COURSES.length);
    for (const c of COURSES) {
      expect(topics.some((t) => t.sources.some((s) => s.doc === c.doc && s.course === c.course)), c.id).toBe(true);
    }
  });

  it('name only known extra targets, none of which already cite the course', () => {
    for (const c of COURSES as readonly Course[]) {
      for (const id of c.extraTargets ?? []) {
        const t = byId.get(id);
        expect(t, id).toBeDefined();
        expect(t?.sources.some((s) => s.doc === c.doc && s.course === c.course), id).toBe(false);
      }
    }
  });

  it('courseById throws on an unknown id', () => {
    expect(() => courseById('nope')).toThrow(/unknown course id: nope/);
  });

  it('a course closure is the engine closure of its targets', () => {
    for (const c of COURSES) {
      expect(coursesClosure(topics, [c])).toEqual(courseClosure(topics, courseTargets(topics, c)));
    }
  });
});

describe('the probstats slice (IA Probability)', () => {
  const ia = courseById('ia-probability');
  const probstats = coursesTopics(topics, [ia]);

  it('is the reviewed 60 topics, in the reviewed order', () => {
    // The order is what keeps SIMULATION.md byte-identical; see topics/index.ts.
    expect(probstats).toHaveLength(60);
    expect(probstats.map((t) => t.id).slice(0, 3)).toEqual(['pre.fractions', 'pre.algebraic-manipulation', 'pre.indices']);
    expect(probstats[probstats.length - 1]?.id).toBe('prob.simpsons-paradox');
    for (const t of probstats) expect(LEVELS.indexOf(t.level)).toBeLessThanOrEqual(LEVELS.indexOf('tripos-ia'));
  });

  it('covers every item of IA Probability "Basic concepts" and "Axiomatic approach"', () => {
    const cited = courseTargets(topics, ia).filter((id) => byId.get(id)?.level === 'tripos-ia');
    for (const id of [
      'prob.classical-probability', 'prob.sampling-models', 'prob.stirling-log', 'prob.stirling-formula',
      'prob.axioms', 'prob.point-mass-spaces', 'prob.inclusion-exclusion', 'prob.continuity', 'prob.subadditivity',
      'prob.independence', 'prob.binomial-distribution', 'prob.poisson-distribution', 'prob.geometric-distribution',
      'prob.poisson-binomial-limit', 'prob.conditional-probability', 'prob.bayes-formula', 'prob.simpsons-paradox',
    ]) expect(byId.has(id), id).toBe(true);
    expect(cited.length).toBeGreaterThanOrEqual(15);
  });

  it('puts every prerequisite of Bayes\'s formula below it in topological order', () => {
    const order = topoOrder(probstats);
    const at = order.indexOf('prob.bayes-formula');
    for (const a of ancestors(probstats, 'prob.bayes-formula')) expect(order.indexOf(a)).toBeLessThan(at);
  });

  it('opens the frontier at its own roots', () => {
    expect(frontier(probstats, new Set())).toEqual(roots(probstats));
  });
});
