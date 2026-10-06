/**
 * The book: the whole degree read term by term (mastery/DESIGN-BOOK.md, "Revision
 * (2026-10-05)"). Years (Preparation, Part IA, IB, II) hold terms, terms hold the
 * chapters of two tracks, a chapter is a course, and its sections are the course's own
 * schedule sections, all from `curriculum.json`. Graph topics are the steps inside a
 * section; `PLACEMENT` puts each topic that exists today in exactly one section.
 *
 * Book order is years, terms, then chapters as `curriculum.json` lists them (Mathematics
 * before Computer Science within a term, except that CS-0 Proof follows STEP Foundation Block
 * 1, because Block 2 on uses its logic and proof), then sections, then steps. Terms are order, not
 * time. The checks in book.test.ts hold the rules: each topic appears once, every
 * prerequisite of a placed topic comes earlier (or is listed in `PREREQ_FLAGS` with the
 * reason), and every graph topic is placed.
 */
import curriculumJson from './curriculum.json';

export type Track = 'Maths' | 'CS';
/** core: studied; opt: optional, folded; overlap: taught by another chapter; out: left out. */
export type CourseStatus = 'core' | 'opt' | 'overlap' | 'out';

export interface BookStep {
  topicId: string;
  /** Written from first principles because the source assumes it (DESIGN-BOOK rule 3). */
  bridge: boolean;
}

export interface BookSection {
  /** `<chapter id>.<1-based index>`. */
  id: string;
  title: string;
  lectures: number | null;
  steps: readonly BookStep[];
}

export interface BookChapter {
  /** Kebab case from the year and the title; stable, used in routes. */
  id: string;
  yearId: string;
  termName: string;
  track: Track;
  title: string;
  status: CourseStatus;
  /** course, practical, lectures, module, or project, as the source lists it. */
  kind: string;
  lectures: number | null;
  /** Why the course is optional or left out, or what teaches it instead. */
  why: string;
  /** How it overlaps another chapter. */
  overlap: string;
  /** A note on when it runs, for example "Michaelmas (continuing in Lent)". */
  runs: string;
  sections: readonly BookSection[];
}

export interface BookTerm {
  name: string;
  chapters: readonly BookChapter[];
}

export interface BookYear {
  id: string;
  label: string;
  /** Part IA and later open when the Preparation campaign is complete (a label, not a block). */
  afterPreparation: boolean;
  terms: readonly BookTerm[];
}

interface RawSection { t: string; n: string | number; lh: string }
interface RawCourse {
  tr: string; title: string; lec: string | number; st: string; why: string; ov: string;
  sec: RawSection[]; kind: string; term: string; tn: string;
}
interface RawYear { id: string; label: string; terms: { name: string; courses: RawCourse[] }[] }

const RAW = curriculumJson as unknown as readonly RawYear[];

/** The data carries an en dash in one title; the app's text uses none. */
const clean = (s: string): string => s.replace(/[\u2013\u2014]/g, '-').trim();
/** Lecture counts are numbers, numeric strings, or empty in the data. */
const lectures = (s: string | number): number | null => {
  const n = typeof s === 'number' ? s : /^\d+(\.\d+)?$/.test(s.trim()) ? Number(s) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
};
export const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

type StepSpec = string | BookStep;
/** A bridge step (see `BookStep.bridge`). */
const b = (topicId: string): BookStep => ({ topicId, bridge: true });

/**
 * Where today's topics go: `<year id>/<chapter title>` to a section key to the steps, in
 * order. A section key is the section's title, or the part of it before a colon
 * ("Assignment 6"). The placement follows the revision and the Preparation map
 * (graph/reviews/cambridge-prep.md): the school maths, calculus, logic, and proof that the
 * Preparation sources teach are placed there, CS-0 Proof comes straight after STEP Foundation
 * Block 1 (see `curriculum.json`), and IA Discrete Mathematics, Proof is then recall. IA
 * Analysis I keeps the rigorous analysis and IA Probability its own topics. A foundation goes
 * into the first section that needs it, as a bridge when the source does not teach it.
 */
export const PLACEMENT: Readonly<Record<string, Readonly<Record<string, readonly StepSpec[]>>>> = {
  'prep/STEP Foundation, Block 1: Algebra and graphs': {
    'Assignment 1': ['pre.fractions', 'pre.indices', 'pre.algebraic-manipulation', 'alg.surds', 'pre.quadratic-equations', 'ineq.linear-quadratic'],
    'Assignment 2': ['geom.straight-lines', 'fn.quadratic-graphs'],
    'Assignment 3': [
      'pre.sequences', 'alg.sigma-notation', 'alg.arithmetic-series', 'alg.geometric-series', 'alg.geometric-sum-to-infinity',
      // The floor function and the linear Diophantine equation need whole numbers, which STEP assumes.
      b('pre.primes-and-factors'), b('pre.remainders'), b('pre.algebraic-argument'), 'fn.floor-function', 'num.linear-diophantine',
    ],
    'Assignment 4': ['geom.euclidean-proof', 'alg.polynomials', 'ineq.polynomial-regions'],
  },
  // Book of Proof and the TMUA notes teach the logic and proof that STEP Foundation uses from Block 2 on.
  'prep/CS-0 Proof': {
    'TMUA Notes on Logic and Proof': ['logic.connectives', 'logic.implication', 'logic.iff', 'logic.equivalences'],
    'Book of Proof 1 and 2': [
      'pre.set-notation', 'sets.comprehension', 'sets.subsets', b('pre.product-rule'), 'sets.cartesian-product', 'sets.indexed',
      'num.number-systems', 'logic.quantifiers', 'logic.nested-quantifiers', 'logic.negating-quantifiers',
    ],
    'Book of Proof 4 to 7': [
      'proof.direct', 'proof.cases', 'proof.counterexample', 'proof.quantifier-patterns', 'num.divisibility', 'proof.contrapositive',
      'proof.contradiction', b('pre.prime-factorisation'), 'proof.infinitely-many-primes',
    ],
    'Book of Proof 8 and 9': ['proof.set-proofs', 'proof.disproof'],
    'Book of Proof 10': ['alg.proof-by-induction', 'proof.strong-induction', 'proof.smallest-counterexample'],
  },
  'prep/STEP Foundation, Block 2: Trig, counting, probability': {
    'Assignment 5': ['trig.right-triangle', 'trig.sine-cosine-rules', 'geom.3d-coordinates', 'comb.pigeonhole'],
    'Assignment 6': [
      'alg.simultaneous-equations', 'comb.factorial', b('comb.permutations'), 'comb.combinations', 'comb.repeated-arrangements',
      b('pre.probability-scale'), b('pre.mutually-exclusive'), b('prob.addition-rule'), 'pre.sample-spaces', 'pre.tree-diagrams',
      'pre.two-way-tables', b('prob.conditional-formula'), 'prob.bayes-two-events',
    ],
    // Q1 asks for the turning points of x + 1/x: the first STEP use of differentiation, which it assumes.
    'Assignment 7': [
      b('alg.exp-and-ln'), b('calc.derivatives'), 'calc.stationary-points', 'fn.rational-functions', 'ineq.rational', 'alg.roots-coefficients',
    ],
    'Assignment 8': ['ineq.am-gm', 'geom.circles', 'geom.intersections'],
  },
  'prep/STEP Foundation, Block 3: Proof and functions': {
    'Assignment 9': ['calc.curve-sketching'],
    'Assignment 10': ['trig.compound-angles', 'trig.double-angle', b('pre.hcf-lcm')],
    'Assignment 11': ['fn.functions', 'alg.exponential-equations', 'alg.surd-equations'],
    'Assignment 12': ['prob.counting-probability', 'prob.independent-events'],
  },
  'prep/STEP Foundation, Block 4: Sequences and number': {
    'Assignment 13': ['calc.convexity', 'calc.inflection-points', 'fn.graph-transformations'],
    'Assignment 14': ['alg.factorisations', 'alg.fibonacci'],
    'Assignment 15': ['an.sequence-limits', 'alg.recurrence-sequences', 'alg.telescoping'],
    'Assignment 16': ['trig.radians-and-graphs', 'trig.equations'],
    'Assignment 17': ['alg.partial-fractions', 'alg.sums-of-powers', 'num.division-theorem', 'num.congruence', 'num.modular-arithmetic'],
  },
  'prep/STEP Foundation, Block 5: Toward calculus': {
    'Assignment 19': [
      'trig.small-angles', 'geom.loci', 'comb.binomial-theorem', 'alg.binomial-rational', b('prob.discrete-distributions'), 'prob.binomial-distribution',
    ],
    'Assignment 20': ['calc.first-principles'],
    'Assignment 21': ['fn.modulus', 'fn.modulus-regions', 'calc.hyperbolic'],
  },
  'prep/STEP Foundation, Block 6: Calculus': {
    'Assignment 22': ['calc.differentiation-rules', 'an.exp-series'],
    'Assignment 24': ['calc.definite-integrals', 'calc.integration-by-parts', 'trig.reciprocal-functions', 'calc.standard-integrals'],
    'Assignment 25': ['calc.substitution', 'calc.symmetry-integrals'],
  },
  'prep/CS-0 Maths': {
    'NST Maths Workbook: vectors, differentiation, integration, differential equations': [
      'geom.vectors', 'geom.vector-lines', 'calc.implicit-differentiation', 'calc.separable-odes',
    ],
    'NST Maths Workbook: complex numbers, matrices, series, induction, hyperbolic functions': ['cx.complex-numbers', 'mat.matrices'],
  },
  'prep/CS-0 Functional programming': {
    'OCaml Programming 2 and 3': [
      'fp.expressions', 'fp.functions', 'fp.recursion', 'fp.lists', 'fp.polymorphism', 'fp.records-tuples', 'fp.variants', 'fp.exceptions', 'fp.trees',
    ],
    'OCaml Programming 4 and 5': ['fp.higher-order', 'fp.map-filter-fold', 'fp.complexity', 'fp.modules', 'fp.functional-queues', 'fp.functors'],
    'OCaml Programming 8 and 9': [
      'fp.specifications-testing', 'fp.equational-reasoning', 'fp.structural-induction', 'fp.references', 'fp.hash-tables',
      'fp.binary-search-trees', 'fp.red-black-trees', 'fp.lazy-sequences',
    ],
    'FoCS 2025-26 lecture notes, read ahead': ['fp.sorting', 'fp.search'],
  },
  // STEP 2 Calculus (improper integrals), then Mixed STEP 1 Statistics and the STEP 2 module
  // (graph/reviews/cambridge-batch-2.md, chapter 5.2).
  'prep/STEP 2 modules': {
    Calculus: ['calc.improper-integrals'],
    Statistics: [
      'rv.expectation', 'rv.tail-sum', 'comb.restricted-arrangements', 'prob.first-step', 'rv.variance', 'rv.pdf', 'rv.continuous-summaries',
      'rv.cdf-method', 'prob.normal-distribution', 'prob.normal-approximation',
    ],
  },
  'prep/STEP 3 modules': {
    Statistics: ['rv.expectation-algebra', 'rv.indicators', 'alg.arithmetico-geometric'],
  },
  // Proof is recall here: its topics are taught in CS-0 Proof. Numbers keeps the number
  // theory that the Preparation sources do not teach.
  'IA/Discrete Mathematics': {
    Numbers: [
      'comb.binomial-identities', 'comb.binomial-theorem-proof', 'num.modular-integers', 'num.gcd', 'num.euclid-algorithm', 'num.euclid-theorem',
      'num.fundamental-theorem', 'num.prime-binomial', 'num.fermat-little', 'num.extended-euclid', 'num.modular-inverse',
      'num.modular-exponentiation', 'num.diffie-hellman',
    ],
  },
  'IA/Analysis I': {
    'Limits and convergence': [
      'an.epsilon-limit', 'an.limit-algebra', 'an.monotone-convergence', 'an.series-convergence', 'an.nonnegative-series', 'an.absolute-convergence',
    ],
    Differentiability: ['an.exp-limit'],
    'Power series': ['an.power-series'],
  },
  'IA/Probability': {
    'Basic concepts': ['prob.classical-probability', 'prob.sampling-models', 'prob.stirling-log', 'prob.stirling-formula'],
    'Axiomatic approach': [
      'sets.countable-unions', 'prob.event-spaces', 'prob.axioms', 'prob.axiom-consequences', 'prob.inclusion-exclusion-three',
      'prob.inclusion-exclusion', 'prob.continuity', 'prob.subadditivity', 'prob.independence', 'prob.conditional-probability',
      'prob.total-probability', 'prob.bayes-formula', 'prob.simpsons-paradox',
    ],
    'Discrete random variables': [
      'prob.point-mass-spaces', 'prob.geometric-distribution', 'prob.poisson-distribution', 'prob.poisson-binomial-limit',
      // STEP 2 Statistics uses Poisson rates, but they need the Poisson distribution and the binomial theorem, both taught here or earlier.
      'prob.poisson-rates', 'rv.random-variables', 'rv.expectation-general', 'rv.independence', 'rv.covariance',
      'rv.conditional-expectation', 'gf.pgf', 'gf.random-sums', 'gf.combinatorial', 'alg.linear-recurrences',
      'rw.gamblers-ruin', 'rw.absorption-time', 'bp.extinction',
    ],
    'Continuous random variables': [
      'prob.exponential-distribution', 'rv.joint-densities', 'rv.transformations', 'prob.geometric-probability',
      'rv.simulation', 'rv.bivariate-normal',
    ],
    'Inequalities and limits': ['ineq.markov-chebyshev', 'ineq.jensen', 'lim.weak-law', 'gf.mgf', 'lim.clt'],
  },
  'IA/Vector Calculus': {
    'Integration in R^2 and R^3': ['calc.double-integrals', 'calc.jacobians'],
  },
};

export interface PrereqFlag {
  prereq: string;
  why: string;
}

/**
 * Known exceptions to "prerequisites come earlier", topic to each later prerequisite and
 * why. The test fails on any gap not listed here, and on any listed gap that has closed.
 */
export const PREREQ_FLAGS: Readonly<Record<string, readonly PrereqFlag[]>> = {
  'prob.normal-approximation': [{
    prereq: 'prob.poisson-distribution',
    why: 'STEP 2 Statistics approximates the Poisson distribution, which IA Probability, Discrete random variables teaches.',
  }],
  // IA Vector Calculus follows IA Probability in the Lent term.
  'rv.joint-densities': [{
    prereq: 'calc.double-integrals',
    why: 'IA Probability uses double integrals before IA Vector Calculus, Integration in R^2 and R^3, teaches them in the same term.',
  }],
  'rv.transformations': [{
    prereq: 'calc.jacobians',
    why: 'IA Probability uses the Jacobian before IA Vector Calculus, Integration in R^2 and R^3, teaches change of variables in the same term.',
  }],
};

/** Whether the gap from `topicId` to `prereq` is listed in `PREREQ_FLAGS`. */
export function isFlagged(topicId: string, prereq: string): boolean {
  return (PREREQ_FLAGS[topicId] ?? []).some((f) => f.prereq === prereq);
}

const sectionMatches = (title: string, key: string): boolean => title === key || title.startsWith(`${key}:`);

function buildBook(): BookYear[] {
  const used = new Set<string>();
  const years = RAW.map((y, yi): BookYear => ({
    id: y.id,
    label: clean(y.label),
    afterPreparation: yi > 0,
    terms: y.terms.map((t): BookTerm => ({
      name: clean(t.name),
      chapters: t.courses.map((c): BookChapter => {
        const title = clean(c.title);
        const key = `${y.id}/${title}`;
        const place = PLACEMENT[key];
        if (place !== undefined) used.add(key);
        const id = slug(`${y.id}-${title}`);
        const sections = c.sec.map((s, si): BookSection => {
          const st = clean(s.t);
          const keys = place === undefined ? [] : Object.keys(place).filter((k) => sectionMatches(st, k));
          const specs = keys.flatMap((k) => place?.[k] ?? []);
          return {
            id: `${id}.${si + 1}`,
            title: st,
            lectures: lectures(s.n),
            steps: specs.map((x) => (typeof x === 'string' ? { topicId: x, bridge: false } : x)),
          };
        });
        if (place !== undefined) {
          for (const k of Object.keys(place)) {
            const n = c.sec.filter((s) => sectionMatches(clean(s.t), k)).length;
            if (n !== 1) throw new Error(`book: section key "${k}" of ${key} matches ${n} sections`);
          }
        }
        return {
          id, yearId: y.id, termName: clean(t.name), track: c.tr === 'CS' ? 'CS' : 'Maths', title,
          status: (['core', 'opt', 'overlap', 'out'] as const).find((x) => x === c.st) ?? 'core',
          kind: c.kind, lectures: lectures(c.lec), why: clean(c.why), overlap: clean(c.ov), runs: clean(c.tn), sections,
        };
      }),
    })),
  }));
  for (const key of Object.keys(PLACEMENT)) if (!used.has(key)) throw new Error(`book: no chapter ${key}`);
  return years;
}

export const BOOK: readonly BookYear[] = buildBook();

/** Every chapter, in book order. */
export const CHAPTERS: readonly BookChapter[] = BOOK.flatMap((y) => y.terms.flatMap((t) => t.chapters));

const CHAPTER_BY_ID: ReadonlyMap<string, BookChapter> = new Map(CHAPTERS.map((c) => [c.id, c] as const));

export function chapterById(id: string): BookChapter | undefined {
  return CHAPTER_BY_ID.get(id);
}

export function yearById(id: string): BookYear | undefined {
  return BOOK.find((y) => y.id === id);
}

export interface StepPlace {
  chapter: BookChapter;
  section: BookSection;
  step: BookStep;
  /** Position in book order, from 0. */
  order: number;
}

/** Every step, in book order. */
export const BOOK_STEPS: readonly StepPlace[] = CHAPTERS.flatMap((chapter) =>
  chapter.sections.flatMap((section) => section.steps.map((step) => ({ chapter, section, step, order: 0 }))),
).map((s, order) => ({ ...s, order }));

/** Topic ids in book order. A topic placed twice appears twice; the checks forbid that. */
export const BOOK_ORDER: readonly string[] = BOOK_STEPS.map((s) => s.step.topicId);

const PLACE_BY_TOPIC: ReadonlyMap<string, StepPlace> = new Map(
  [...BOOK_STEPS].reverse().map((s) => [s.step.topicId, s] as const),
);

/** Where a topic is taught: its first placement. */
export function placeOf(topicId: string): StepPlace | undefined {
  return PLACE_BY_TOPIC.get(topicId);
}

export interface PrereqGap {
  topicId: string;
  prereq: string;
  /** later: placed after the topic; unplaced: not in the book at all. */
  kind: 'later' | 'unplaced';
}

/** Every prerequisite of a placed topic that is not placed before it. */
export function prerequisiteGaps(topics: readonly { id: string; prereqs: readonly string[] }[]): PrereqGap[] {
  const gaps: PrereqGap[] = [];
  for (const t of topics) {
    const at = placeOf(t.id);
    if (at === undefined) continue;
    for (const pre of t.prereqs) {
      const p = placeOf(pre);
      if (p === undefined) gaps.push({ topicId: t.id, prereq: pre, kind: 'unplaced' });
      else if (p.order >= at.order) gaps.push({ topicId: t.id, prereq: pre, kind: 'later' });
    }
  }
  return gaps;
}

/** Display names of the tracks and statuses. */
export const TRACK_NAMES: Readonly<Record<Track, string>> = { Maths: 'Mathematics', CS: 'Computer Science' };
