/**
 * The book: the whole degree read term by term (mastery/DESIGN-BOOK.md, "Revision
 * (2026-10-05)"). Years (Preparation, Part IA, IB, II) hold terms, terms hold the
 * chapters of two tracks, a chapter is a course, and its sections are the course's own
 * schedule sections, all from `curriculum.json`. Graph topics are the steps inside a
 * section; `PLACEMENT` puts each topic that exists today in exactly one section.
 *
 * Book order is years, terms, then chapters as `curriculum.json` lists them (Mathematics
 * before Computer Science within a term), then sections, then steps. Terms are order, not
 * time. The checks in book.test.ts hold the rules: each topic appears once, every
 * prerequisite of a placed topic comes earlier (or is listed in `PREREQ_FLAGS` with the
 * reason), and every topic with a written lesson is placed.
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
 * ("Assignment 6"). The placement follows the revision: Part 0 foundations and the STEP
 * chapters into Preparation, Proof and Numbers into IA Discrete Mathematics, the analysis
 * toolkit into IA Analysis I, and IA Probability's own topics into its sections. A
 * foundation goes into the first section that needs it, as a bridge when the source does
 * not teach it.
 */
export const PLACEMENT: Readonly<Record<string, Readonly<Record<string, readonly StepSpec[]>>>> = {
  'prep/STEP Foundation, Block 1: Algebra and graphs': {
    'Assignment 1': ['pre.fractions', 'pre.indices', 'pre.algebraic-manipulation'],
    'Assignment 3': [
      'pre.sequences', 'alg.sigma-notation', 'alg.arithmetic-series', 'alg.geometric-series',
      // The linear Diophantine equation needs whole numbers, which STEP assumes.
      b('pre.primes-and-factors'), b('pre.remainders'), b('pre.algebraic-argument'),
    ],
  },
  'prep/STEP Foundation, Block 2: Trig, counting, probability': {
    'Assignment 5': [b('pre.product-rule'), 'comb.pigeonhole'],
    'Assignment 6': [
      'comb.factorial', b('comb.permutations'), 'comb.combinations', 'comb.repeated-arrangements',
      b('pre.set-notation'), b('pre.probability-scale'), b('pre.mutually-exclusive'), b('prob.addition-rule'),
      'pre.sample-spaces', 'pre.tree-diagrams', 'pre.two-way-tables', b('prob.conditional-formula'), 'prob.bayes-two-events',
    ],
  },
  'prep/STEP Foundation, Block 3: Proof and functions': {
    'Assignment 12': ['pre.prime-factorisation', 'prob.counting-probability', 'prob.independent-events'],
  },
  'prep/STEP Foundation, Block 5: Toward calculus': {
    'Assignment 19': [b('prob.discrete-distributions'), 'prob.binomial-distribution'],
  },
  // Mixed STEP 1 Statistics, then the STEP 2 module (graph/reviews/cambridge-batch-2.md, chapter 5.2).
  'prep/STEP 2 modules': {
    Statistics: [
      'rv.expectation', 'rv.tail-sum', 'comb.restricted-arrangements', 'prob.first-step',
      b('pre.quadratic-equations'), 'rv.variance', 'rv.pdf', 'rv.continuous-summaries', 'rv.cdf-method',
      'prob.normal-distribution', 'prob.normal-approximation',
    ],
  },
  'prep/STEP 3 modules': {
    Statistics: ['rv.expectation-algebra', 'rv.indicators', 'alg.arithmetico-geometric'],
  },
  'IA/Discrete Mathematics': {
    Proof: [
      'logic.connectives', 'logic.implication', 'proof.direct', 'logic.iff', 'sets.comprehension', 'logic.quantifiers',
      'logic.nested-quantifiers', 'proof.counterexample', 'proof.quantifier-patterns', 'num.divisibility', 'proof.cases',
      'logic.equivalences', 'logic.negating-quantifiers', 'proof.contradiction', 'proof.contrapositive',
    ],
    Numbers: [
      'num.number-systems', 'alg.proof-by-induction', 'proof.strong-induction', 'comb.binomial-theorem', 'comb.binomial-identities',
      'comb.binomial-theorem-proof', 'num.division-theorem', 'num.congruence', 'num.modular-arithmetic', 'num.modular-integers',
      b('pre.hcf-lcm'), 'num.gcd', 'num.euclid-algorithm', 'num.euclid-theorem', 'num.fundamental-theorem',
      'proof.infinitely-many-primes', 'num.prime-binomial', 'num.fermat-little', 'num.extended-euclid', 'num.modular-inverse',
      'num.modular-exponentiation', 'num.diffie-hellman',
    ],
  },
  'IA/Analysis I': {
    'Limits and convergence': [
      'an.sequence-limits', 'an.epsilon-limit', 'an.limit-algebra', 'an.monotone-convergence', 'alg.geometric-sum-to-infinity',
      'an.series-convergence', 'an.nonnegative-series', 'an.absolute-convergence',
    ],
    Differentiability: [b('alg.exp-and-ln'), 'calc.derivatives', 'calc.differentiation-rules', b('calc.convexity'), 'an.exp-limit'],
    'Power series': ['an.exp-series', 'an.power-series'],
    Integration: ['calc.definite-integrals', 'calc.integration-by-parts', b('calc.substitution'), 'calc.improper-integrals'],
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

/**
 * Known exceptions to "prerequisites come earlier", topic to the later prerequisite and
 * why. The test fails on any gap not listed here, and on any listed gap that has closed.
 */
export const PREREQ_FLAGS: Readonly<Record<string, { prereq: string; why: string }>> = {
  'comb.pigeonhole': {
    prereq: 'proof.cases',
    why: 'STEP Assignment 5 sets the socks problem in Preparation; proof by cases is taught in IA Discrete Mathematics, Proof.',
  },
  // Batch 2: STEP statistics sits in Preparation, but the analysis toolkit it leans on is in IA Analysis I.
  'prob.first-step': {
    prereq: 'alg.geometric-sum-to-infinity',
    why: 'Mixed STEP 1 Statistics Q12 sums a repeated experiment as a geometric series; the sum to infinity is taught in IA Analysis I, Limits and convergence.',
  },
  'rv.pdf': {
    prereq: 'calc.improper-integrals',
    why: 'STEP 2 Statistics integrates densities over infinite ranges; improper integrals are taught in IA Analysis I, Integration.',
  },
  'rv.cdf-method': {
    prereq: 'calc.differentiation-rules',
    why: 'STEP 2 and STEP 3 Statistics differentiate a distribution function by the chain rule; the rule is taught in IA Analysis I, Differentiability.',
  },
  'prob.normal-approximation': {
    prereq: 'prob.poisson-distribution',
    why: 'STEP 2 Statistics approximates the Poisson distribution, which IA Probability, Discrete random variables teaches.',
  },
  'alg.arithmetico-geometric': {
    prereq: 'alg.geometric-sum-to-infinity',
    why: 'STEP 3 Statistics Q2 sums n r^n from the geometric series; the sum to infinity is taught in IA Analysis I, Limits and convergence.',
  },
  // IA Vector Calculus follows IA Probability in the Lent term.
  'rv.joint-densities': {
    prereq: 'calc.double-integrals',
    why: 'IA Probability uses double integrals before IA Vector Calculus, Integration in R^2 and R^3, teaches them in the same term.',
  },
  'rv.transformations': {
    prereq: 'calc.jacobians',
    why: 'IA Probability uses the Jacobian before IA Vector Calculus, Integration in R^2 and R^3, teaches change of variables in the same term.',
  },
};

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
