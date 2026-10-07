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

  it('is the reviewed 60 topics, the two of Cambridge batch 1, and the 28 of the gatefit prerequisites, in the reviewed order', () => {
    // The order keeps SIMULATION.md stable; see topics/index.ts. Batch 1 added
    // prob.bayes-two-events and prob.event-spaces (graph/reviews/cambridge-batch-1.md, changes 2 and 3).
    // The gatefit prerequisites (2026-10-06, graph/reviews/probstats-slice.md) brought 28 ancestors in,
    // 20 of them through prob.point-mass-spaces, whose gate needs unique factorisation.
    const GATEFIT = new Set([
      'alg.fibonacci', 'alg.surds', 'calc.differentiation-rules', 'logic.connectives', 'logic.implication', 'logic.quantifiers',
      'num.congruence', 'num.divisibility', 'num.division-theorem', 'num.euclid-algorithm', 'num.euclid-theorem', 'num.fundamental-theorem',
      'num.gcd', 'num.number-systems', 'pre.algebraic-argument', 'pre.hcf-lcm', 'pre.prime-factorisation', 'pre.primes-and-factors',
      'pre.quadratic-equations', 'pre.remainders', 'proof.counterexample', 'proof.direct', 'proof.quantifier-patterns', 'proof.strong-induction',
      'rv.expectation', 'rv.expectation-algebra', 'rv.variance', 'sets.comprehension',
    ]);
    expect(probstats).toHaveLength(90);
    const reviewed = probstats.filter((t) => !GATEFIT.has(t.id));
    expect(reviewed).toHaveLength(62);
    expect(reviewed.map((t) => t.id)).toEqual(expect.arrayContaining(['prob.bayes-two-events', 'prob.event-spaces']));
    expect(reviewed.map((t) => t.id).slice(0, 3)).toEqual(['pre.fractions', 'pre.algebraic-manipulation', 'pre.indices']);
    expect(reviewed[reviewed.length - 1]?.id).toBe('prob.simpsons-paradox');
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

describe('Cambridge batch 1 citations', () => {
  it('name only graph topics, and cite each document by its batch source id', async () => {
    const { CAMBRIDGE_BATCH_1 } = await import('./topics/cambridge-batch-1');
    const { readFileSync } = await import('node:fs');
    const batch = JSON.parse(readFileSync(new URL('../../scripts/sources/batch-1.json', import.meta.url), 'utf8')) as { sources: { id: string; url: string }[] };
    const urls = new Map(batch.sources.map((s) => [s.id, s.url]));
    for (const [id, cites] of Object.entries(CAMBRIDGE_BATCH_1)) {
      expect(byId.has(id), id).toBe(true);
      for (const s of cites) {
        expect(urls.get(s.doc), `${id}: ${s.doc}`).toBe((SOURCE_DOCS as Record<string, { url: string }>)[s.doc]?.url);
        expect(byId.get(id)?.sources, id).toContainEqual(s);
      }
    }
  });

  it('cite every new topic of the batch, and leave the course targets as they were', async () => {
    const { CAMBRIDGE_COURSE } = await import('./sources');
    for (const id of ['comb.pigeonhole', 'prob.bayes-two-events', 'prob.event-spaces']) {
      expect(byId.get(id)?.sources.some((s) => s.doc in CAMBRIDGE_COURSE), id).toBe(true);
    }
    const courses = new Set(COURSES.map((c) => c.course));
    for (const c of Object.values(CAMBRIDGE_COURSE)) expect(courses.has(c as never), c).toBe(false);
  });
});

describe('Cambridge batch 2 citations', () => {
  it('name only graph topics, and cite each document by its source id in the batch files', async () => {
    const { CAMBRIDGE_BATCH_2 } = await import('./topics/cambridge-batch-2');
    const { existsSync, readFileSync } = await import('node:fs');
    const read = (path: string): { sources: { id: string; url: string; status?: string }[] } =>
      JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8')) as { sources: { id: string; url: string; status?: string }[] };
    const batch2 = new Map(read('../../scripts/sources/batch-2.json').sources.map((s) => [s.id, s.url]));
    const batch1 = new Map(read('../../scripts/sources/batch-1.json').sources.map((s) => [s.id, s.url]));
    // The source cache is not committed; check it when it is present.
    const manifestUrl = new URL('../../sources/manifest.json', import.meta.url);
    const manifest = existsSync(manifestUrl) ? new Map(read('../../sources/manifest.json').sources.map((s) => [s.id, s])) : null;
    for (const [id, cites] of Object.entries(CAMBRIDGE_BATCH_2)) {
      expect(byId.has(id), id).toBe(true);
      for (const s of cites) {
        const url = (SOURCE_DOCS as Record<string, { url: string }>)[s.doc]?.url;
        // step-f19 is the one batch 1 document batch 2 cites (the bet in Assignment 19).
        expect(batch2.get(s.doc) ?? (s.doc === 'step-f19' ? batch1.get(s.doc) : undefined), `${id}: ${s.doc}`).toBe(url);
        if (manifest !== null) {
          expect(manifest.get(s.doc)?.url, `${id}: ${s.doc} in the manifest`).toBe(url);
          expect(manifest.get(s.doc)?.status, `${id}: ${s.doc} fetched`).toBe('ok');
        }
        expect(byId.get(id)?.sources, id).toContainEqual(s);
      }
    }
  });

  it('leave both course target sets as they were', () => {
    // Part V cites the IA Probability schedule under its own course name (IA_PROB_PART_V)
    // until the course is widened. Three of its STEP topics are in the probstats slice above
    // only as ancestors, through the gatefit prerequisites.
    const dm = courseById('cst-discrete-maths');
    for (const t of topics.filter((x) => ['random-variables', 'continuous', 'generating-functions', 'random-processes', 'limit-theorems'].includes(x.area))) {
      expect(courseTargets(topics, courseById('ia-probability')), t.id).not.toContain(t.id);
      expect(courseTargets(topics, dm), t.id).not.toContain(t.id);
    }
  });
});

describe('Preparation citations (Stage A, graph/reviews/cambridge-prep.md)', () => {
  type Batch = { sources: { id: string; url: string; status?: string }[] };

  it('name only graph topics, and cite each document by its source id in batch 6, or batch 1 for a Foundation assignment', async () => {
    const { CAMBRIDGE_PREP, PREP_NEW_TOPICS } = await import('./topics/cambridge-prep');
    const { existsSync, readFileSync } = await import('node:fs');
    const read = (path: string): Batch => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8')) as Batch;
    const batch6 = new Map(read('../../scripts/sources/batch-6.json').sources.map((s) => [s.id, s.url]));
    const batch1 = new Map(read('../../scripts/sources/batch-1.json').sources.map((s) => [s.id, s.url]));
    const manifestUrl = new URL('../../sources/manifest.json', import.meta.url);
    const manifest = existsSync(manifestUrl) ? new Map(read('../../sources/manifest.json').sources.map((s) => [s.id, s])) : null;
    const newTopics = new Set(PREP_NEW_TOPICS);
    for (const [id, cites] of Object.entries(CAMBRIDGE_PREP)) {
      expect(byId.has(id), id).toBe(true);
      for (const s of cites) {
        const url = (SOURCE_DOCS as Record<string, { url: string }>)[s.doc]?.url;
        const fromBatch1 = /^step-f\d\d$/.test(s.doc) ? batch1.get(s.doc) : undefined;
        expect(batch6.get(s.doc) ?? fromBatch1, `${id}: ${s.doc}`).toBe(url);
        // A batch 1 citation on an existing topic would change content.test's mapped-topic order check.
        if (fromBatch1 !== undefined) expect(newTopics.has(id), `${id}: batch 1 citation on an existing topic`).toBe(true);
        if (manifest !== null) {
          expect(manifest.get(s.doc)?.url, `${id}: ${s.doc} in the manifest`).toBe(url);
          expect(manifest.get(s.doc)?.status, `${id}: ${s.doc} fetched`).toBe('ok');
        }
        expect(byId.get(id)?.sources, id).toContainEqual(s);
      }
    }
  });

  it('cite a Cambridge or admissions document on every new topic, and leave both course target sets as they were', async () => {
    const { PREP_NEW_TOPICS } = await import('./topics/cambridge-prep');
    const { CAMBRIDGE_COURSE } = await import('./sources');
    expect(new Set(PREP_NEW_TOPICS).size).toBe(PREP_NEW_TOPICS.length);
    for (const id of PREP_NEW_TOPICS) {
      expect(byId.has(id), id).toBe(true);
      expect(byId.get(id)?.sources.some((s) => s.doc in CAMBRIDGE_COURSE), id).toBe(true);
    }
    // No new topic is a course target. The gatefit prerequisites (2026-10-06) made four of them
    // ancestors of one: alg.surds (for the sum to infinity) and alg.fibonacci (for Euclid's
    // algorithm) in both courses, and in Discrete Mathematics also mat.matrices and
    // alg.simultaneous-equations (for the binomial theorem proof over semirings).
    const ancestorsOnly: Readonly<Record<string, readonly string[]>> = {
      'ia-probability': ['alg.fibonacci', 'alg.surds'],
      'cst-discrete-maths': ['alg.fibonacci', 'alg.simultaneous-equations', 'alg.surds', 'mat.matrices'],
    };
    for (const c of COURSES) {
      const closure = coursesClosure(topics, [c]);
      expect(PREP_NEW_TOPICS.filter((id) => closure.has(id)).sort(), c.id).toEqual(ancestorsOnly[c.id]);
      for (const id of PREP_NEW_TOPICS) expect(courseTargets(topics, c), `${c.id}: ${id}`).not.toContain(id);
    }
  });
});
