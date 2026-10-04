/**
 * Syllabus text of the course sections the graph covers, verbatim, with each item mapped to
 * the topics that teach it. Tests check that every item appears in the text as printed, that
 * every mapped topic cites the section, and that every topic citing the section is mapped,
 * so a citation is never unexplained and an item is never dropped.
 */
import { CST, CST_DM, CST_NUMBERS, CST_PROOF, type SourceDoc } from './sources';

export interface ScheduleItem {
  /** A phrase of the syllabus, verbatim (curly apostrophes included). */
  text: string;
  topics: readonly string[];
}

export interface ScheduleSection {
  doc: SourceDoc;
  course: string;
  section: string;
  lectures: number;
  /** The section's syllabus paragraph as printed, without the heading. */
  syllabus: string;
  items: readonly ScheduleItem[];
}

/** CST IA Discrete Mathematics 2026-27, the Proof and Numbers sections (the first slice). */
export const CST_DISCRETE_MATHS_SLICE: readonly ScheduleSection[] = [
  {
    doc: CST,
    course: CST_DM,
    section: CST_PROOF,
    lectures: 5,
    syllabus:
      'Proofs in practice and mathematical jargon. Mathematical statements: implication, bi-implication, universal quantification, ' +
      'conjunction, existential quantification, disjunction, negation. Logical deduction: proof strategies and patterns, scratch work, ' +
      'logical equivalences. Proof by contradiction. Divisibility and congruences. Fermat’s Little Theorem.',
    items: [
      { text: 'Proofs in practice and mathematical jargon', topics: ['proof.direct'] },
      { text: 'Mathematical statements: implication', topics: ['logic.implication'] },
      { text: 'bi-implication', topics: ['logic.iff'] },
      { text: 'universal quantification', topics: ['logic.quantifiers', 'logic.nested-quantifiers'] },
      { text: 'conjunction', topics: ['logic.connectives'] },
      { text: 'existential quantification', topics: ['logic.quantifiers', 'logic.nested-quantifiers'] },
      { text: 'disjunction', topics: ['logic.connectives', 'proof.cases'] },
      { text: 'negation', topics: ['logic.connectives', 'logic.negating-quantifiers'] },
      { text: 'Logical deduction: proof strategies and patterns', topics: ['proof.direct', 'proof.cases', 'proof.counterexample', 'proof.contrapositive', 'proof.quantifier-patterns'] },
      { text: 'scratch work', topics: ['proof.direct'] },
      { text: 'logical equivalences', topics: ['logic.equivalences', 'proof.contrapositive'] },
      { text: 'Proof by contradiction', topics: ['proof.contradiction'] },
      { text: 'Divisibility and congruences', topics: ['num.divisibility', 'num.congruence'] },
      { text: 'Fermat’s Little Theorem', topics: ['num.prime-binomial', 'num.fermat-little'] },
    ],
  },
  {
    doc: CST,
    course: CST_DM,
    section: CST_NUMBERS,
    lectures: 5,
    syllabus:
      'Number systems: natural numbers, integers, rationals, modular integers. The Division Theorem and Algorithm. Modular arithmetic. ' +
      'Sets: membership and comprehension. The greatest common divisor, and Euclid’s Algorithm and Theorem. The Extended Euclid’s ' +
      'Algorithm and multiplicative inverses in modular arithmetic. The Diffie-Hellman cryptographic method. Mathematical induction: ' +
      'Binomial Theorem, Pascal’s Triangle, Fundamental Theorem of Arithmetic, Euclid’s infinity of primes.',
    items: [
      { text: 'Number systems: natural numbers, integers, rationals', topics: ['num.number-systems'] },
      { text: 'modular integers', topics: ['num.modular-integers'] },
      { text: 'The Division Theorem and Algorithm', topics: ['num.division-theorem'] },
      { text: 'Modular arithmetic', topics: ['num.modular-arithmetic', 'num.modular-integers', 'num.modular-exponentiation'] },
      { text: 'Sets: membership and comprehension', topics: ['sets.comprehension'] },
      { text: 'The greatest common divisor', topics: ['num.gcd'] },
      { text: 'Euclid’s Algorithm and Theorem', topics: ['num.euclid-algorithm', 'num.euclid-theorem'] },
      { text: 'The Extended Euclid’s Algorithm', topics: ['num.extended-euclid'] },
      { text: 'multiplicative inverses in modular arithmetic', topics: ['num.modular-inverse'] },
      { text: 'The Diffie-Hellman cryptographic method', topics: ['num.diffie-hellman'] },
      { text: 'Mathematical induction', topics: ['alg.proof-by-induction', 'proof.strong-induction'] },
      { text: 'Binomial Theorem', topics: ['comb.binomial-theorem-proof'] },
      { text: 'Pascal’s Triangle', topics: ['comb.binomial-identities'] },
      { text: 'Fundamental Theorem of Arithmetic', topics: ['num.fundamental-theorem'] },
      { text: 'Euclid’s infinity of primes', topics: ['proof.infinitely-many-primes'] },
    ],
  },
];
