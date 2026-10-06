import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PLACEMENT_OPTIONS, LEVELS, measurePlacement, placementBudget, placementGraph, runPlacement, type PlacementStrategy, type Topic,
} from '@learnhub/mastery';
import { courseById, courseTargets, coursesClosure } from './courses';
import { CST_DISCRETE_MATHS_SLICE } from './schedules';
import { topics } from './topics';
import { BATCH_2_NEW_TOPICS } from './topics/cambridge-batch-2';
import { PREP_NEW_TOPICS } from './topics/cambridge-prep';

/** Topics outside both courses: batch 2's Part V and toolkit, and the Preparation map's new topics. */
const NOT_TARGETS: readonly string[] = [...BATCH_2_NEW_TOPICS, ...PREP_NEW_TOPICS];

const byId = new Map(topics.map((t) => [t.id, t]));
const ia = courseById('ia-probability');
const dm = courseById('cst-discrete-maths');
const cites = (t: Topic, doc: string, course: string, section?: string): boolean =>
  t.sources.some((s) => s.doc === doc && s.course === course && (section === undefined || s.section === section));

describe('CST Discrete Mathematics, Proof and Numbers', () => {
  it('quotes every schedule item verbatim from its section', () => {
    for (const s of CST_DISCRETE_MATHS_SLICE) {
      for (const item of s.items) expect(s.syllabus, item.text).toContain(item.text);
    }
  });

  it('maps every schedule item to at least one topic that cites that section', () => {
    for (const s of CST_DISCRETE_MATHS_SLICE) {
      for (const item of s.items) {
        expect(item.topics.length, item.text).toBeGreaterThan(0);
        for (const id of item.topics) {
          const t = byId.get(id);
          expect(t, `${item.text}: ${id}`).toBeDefined();
          expect(cites(t as Topic, s.doc, s.course, s.section), `${id} cites ${s.section}`).toBe(true);
        }
      }
    }
  });

  it('maps every topic that cites a section to one of its items', () => {
    for (const s of CST_DISCRETE_MATHS_SLICE) {
      const mapped = new Set(s.items.flatMap((i) => i.topics));
      for (const t of topics) if (cites(t, s.doc, s.course, s.section)) expect(mapped.has(t.id), `${t.id} (${s.section})`).toBe(true);
    }
  });

  it('cites only the Proof and Numbers sections so far, and covers both', () => {
    const sections = new Set(topics.flatMap((t) => t.sources.filter((x) => x.doc === dm.doc && x.course === dm.course).map((x) => x.section)));
    expect(sections).toEqual(new Set(['Proof', 'Numbers']));
  });

  it('is about 2 to 3 Tripos topics per lecture', () => {
    const lectures = CST_DISCRETE_MATHS_SLICE.reduce((a, s) => a + s.lectures, 0);
    const tripos = [...coursesClosure(topics, [dm])].filter((id) => byId.get(id)?.level === 'tripos-ia').length;
    expect(lectures).toBe(10);
    expect(tripos / lectures).toBeGreaterThanOrEqual(2);
    expect(tripos / lectures).toBeLessThanOrEqual(3);
  });

  it('starts from scratch: its closure reaches down to pre-A-level and A-level roots', () => {
    const closure = [...coursesClosure(topics, [dm])].map((id) => byId.get(id) as Topic);
    const rootLevels = new Set(closure.filter((t) => t.prereqs.length === 0).map((t) => t.level));
    expect(rootLevels).toEqual(new Set(['pre-a-level', 'a-level']));
    for (const t of closure) expect(LEVELS.indexOf(t.level)).toBeLessThanOrEqual(LEVELS.indexOf('tripos-ia'));
  });

  it('reuses induction, Pascal\'s rule, and set notation instead of redefining them', () => {
    expect(cites(byId.get('alg.proof-by-induction') as Topic, dm.doc, dm.course, 'Numbers')).toBe(true);
    expect(cites(byId.get('comb.binomial-identities') as Topic, dm.doc, dm.course, 'Numbers')).toBe(true);
    expect(coursesClosure(topics, [dm]).has('pre.set-notation')).toBe(true);
    // fp.structural-induction (CS-0) builds on alg.proof-by-induction rather than redefining it.
    expect(topics.filter((t) => /induction/i.test(t.title)).map((t) => t.id).sort())
      .toEqual(['alg.proof-by-induction', 'comb.binomial-theorem-proof', 'fp.structural-induction', 'proof.strong-induction']);
  });
});

describe('the two courses share foundations', () => {
  const A = coursesClosure(topics, [ia]);
  const D = coursesClosure(topics, [dm]);

  it('overlap on exactly the shared foundations', () => {
    const shared = [...A].filter((id) => D.has(id)).sort();
    expect(shared).toEqual([
      'alg.arithmetic-series', 'alg.proof-by-induction', 'alg.sigma-notation',
      'comb.binomial-identities', 'comb.binomial-theorem', 'comb.combinations', 'comb.factorial',
      'pre.algebraic-manipulation', 'pre.fractions', 'pre.indices', 'pre.product-rule', 'pre.sequences', 'pre.set-notation',
    ]);
    for (const id of shared) expect(LEVELS.indexOf(byId.get(id)?.level as Topic['level'])).toBeLessThanOrEqual(LEVELS.indexOf('step'));
  });

  it('together cover the whole graph but batch 2 and the Preparation topics, each topic once', () => {
    // Batch 2's topics are not course targets yet (IA_PROB_PART_V in sources.ts); the
    // Preparation topics belong to no course (graph/reviews/cambridge-prep.md).
    const union = new Set([...A, ...D]);
    expect(topics.map((t) => t.id).filter((id) => !union.has(id)).sort()).toEqual([...NOT_TARGETS].sort());
    expect(union.size).toBe(topics.length - NOT_TARGETS.length);
    expect(A.size + D.size - union.size).toBe(13);
  });
});

describe('placement for both courses', { timeout: 60_000 }, () => {
  const targets = [...courseTargets(topics, ia), ...courseTargets(topics, dm)];
  const g = placementGraph(topics, { targets });
  const profiles: [string, (t: Topic) => boolean][] = [
    ['nothing', () => false],
    ['pre-A-level only', (t) => t.level === 'pre-a-level'],
    ['through A-level', (t) => t.level === 'pre-a-level' || t.level === 'a-level'],
    ['through STEP', (t) => t.level !== 'tripos-ia'],
    ['the probability slice only', (t) => coursesClosure(topics, [ia]).has(t.id)],
    ['everything', () => true],
  ];

  it('Discrete Mathematics alone: the entry points cover its whole layer at or below STEP', () => {
    const pg = placementGraph(topics, { targets: courseTargets(topics, dm) });
    const low = new Set(pg.topics.filter((t) => LEVELS.indexOf(t.level) <= LEVELS.indexOf('step')).map((t) => t.id));
    expect(new Set(pg.entries.flatMap((id) => [id, ...(pg.anc.get(id) ?? [])]))).toEqual(low);
    // 28 since batch 1 added comb.pigeonhole (STEP level).
    expect(low.size).toBe(28);
    expect(pg.entries).toHaveLength(9);
  });

  it('works on the union of the two closures, the whole graph but batch 2 and the Preparation topics', () => {
    expect(g.order.length).toBe(topics.length - NOT_TARGETS.length);
  });

  // Measured on the 101-topic graph of batch 1: split needs at most 41 questions for these learners, entry-points at most 42.
  for (const [strategy, most] of [['split', 42], ['entry-points', 45]] as [PlacementStrategy, number][]) {
    for (const [name, knows] of profiles) {
      it(`${strategy}: a truthful learner who knows ${name} is placed exactly within ${most} questions`, () => {
        const known = new Set(g.topics.filter(knows).map((t) => t.id));
        const { result } = runPlacement(g, (id) => known.has(id), 0, { strategy, budget: 60 });
        expect(new Set(result.mastered)).toEqual(known);
        expect(result.questions).toBeLessThanOrEqual(most);
      });
    }
  }

  // Measured (review call 12): 100% exact at 40 questions, 45% at a fixed 30. The default
  // budget scales with the closure, ceil(101 / 2) = 51 here (batch 1 added three topics), so it places everyone exactly.
  it('the default budget for both courses is 51', () => {
    expect(placementBudget(g.order.length)).toBe(51);
  });

  it('split places every truthful random learner exactly within the default budget, using at most 42 questions', () => {
    const m = measurePlacement(topics, { learners: 500, errorRate: 0, budget: placementBudget(g.order.length), strategy: 'split', seed: 1, targets });
    expect(m.exact).toBe(1);
    expect(m.maxQuestions).toBeLessThanOrEqual(42);
  });

  it('even at the old fixed 30 it never over-places', () => {
    const m = measurePlacement(topics, { learners: 500, errorRate: 0, budget: DEFAULT_PLACEMENT_OPTIONS.budget, strategy: 'split', seed: 1, targets });
    expect(m.meanOverPlaced).toBe(0);
  });

  it('is max(30, ceil(n / 2)) for one course: 31 for IA Probability (62 topics), 30 for Discrete Mathematics (52)', () => {
    expect(placementBudget(placementGraph(topics, { targets: courseTargets(topics, ia) }).order.length)).toBe(31);
    expect(placementBudget(placementGraph(topics, { targets: courseTargets(topics, dm) }).order.length)).toBe(30);
  });
});
