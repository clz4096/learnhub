/**
 * Cambridge batch 1 citations: where each topic is taught or practised in the sources of
 * the first batch, from the reviewed source-to-topic map (graph/reviews/cambridge-batch-1.md,
 * decisions of 2026-10-05). Kept in one table so it can be checked against the map line by
 * line; `topics/index.ts` appends these to each topic's own `sources`.
 *
 * The `section` is the location in the document: an assignment and question for STEP
 * Support, a question for the IA example sheet, printed page numbers (the slide numbers;
 * the PDF page is one more) for the CST notes, exercise numbers for the CST supervision
 * sheet, and section and exercise numbers for Book of Proof and the TMUA notes (whose
 * pages are the PDF's). The map was built by reading each fetched source. Book of Proof
 * Chapter 7 is cited only for its gcd material (exercises 28 to 36 and page 164), by
 * decision 5.
 */
import type { TopicSource } from '@learnhub/mastery';
import { CAMBRIDGE_COURSE, type CambridgeDoc } from '../sources';

const c = (doc: CambridgeDoc, section: string, note?: string): TopicSource =>
  note === undefined
    ? { doc, course: CAMBRIDGE_COURSE[doc], section, verified: true }
    : { doc, course: CAMBRIDGE_COURSE[doc], section, note, verified: true };

const notes = (pages: string, what: string): TopicSource => c('cst-dm-notes', `${what}, printed pages ${pages}`);
const sheet = (where: string, note?: string): TopicSource => c('cst-dm-sw1', where, note);
const sheet1 = (where: string, note?: string): TopicSource => c('ia-prob-sheet-1', where, note);
const bop = (where: string, note?: string): TopicSource => c('bop', where, note);
const tmua = (where: string, note?: string): TopicSource => c('tmua-logic-proof', where, note);

export const CAMBRIDGE_BATCH_1: Readonly<Record<string, readonly TopicSource[]>> = {
  // ---------------------------------------------------------------- foundations
  'pre.fractions': [
    c('step-f06', 'Assignment 6, Q1(i)', 'Cancel a product of fractions to 9, then to 2n + 1 in general.'),
    c('step-f12', 'Assignment 12, Q2(i)', 'Express sums and products of algebraic fractions as single fractions.'),
  ],
  'pre.algebraic-manipulation': [
    c('step-f07', 'Assignment 7, Q2 and Q3', 'Roots and coefficients by expanding and substituting; identity versus equation.'),
    c('step-f12', 'Assignment 12, Q1(ii) and Q2(i)'),
    tmua('Exercise Q, page 73'),
  ],
  'pre.indices': [c('step-f12', 'Assignment 12, Q1(iv)', 'Rewrite 2^(2n) as 4^n.')],
  'pre.sequences': [
    c('step-f06', 'Assignment 6, Q1(i)', 'The general term of a product, from its first cases.'),
    sheet('Exercises 1, 1.3.1(a), (b)'),
  ],
  'pre.product-rule': [
    c('step-f06', 'Assignment 6, Q5(i)', 'Claire: 6 choices, then 5, down to 1.'),
    c('step-f07', 'Assignment 7, Q4', 'Bachet\'s weights: each weight in or out gives 2^n loads; with two pans, 3^n.'),
  ],
  'comb.factorial': [
    c('step-f06', 'Assignment 6, Q2(i) and Q5(i)'),
    c('step-f12', 'Assignment 12, Q4', 'The discussion of change ringing: an extent on 5 bells is 5! changes.'),
  ],
  'comb.repeated-arrangements': [c('step-f06', 'Assignment 6, Q2(ii) to (v), Q3, and Q5(ii), (iii)')],
  'comb.combinations': [
    sheet1('Q1, Q7, Q12'),
    bop('Chapter 4, exercises 22, 23, 25'),
  ],
  'comb.binomial-identities': [
    notes('265 to 282', 'Mathematical induction, Pascal\'s triangle'),
    bop('Chapter 4, exercises 22, 23, 25; Chapter 5, exercises 26, 27; Chapter 10, exercises 24, 31, 35 to 41'),
  ],
  'comb.binomial-theorem': [notes('122 to 124', 'A little arithmetic, the Binomial Theorem')],
  'comb.binomial-theorem-proof': [
    notes('265 to 282', 'Mathematical induction'),
    bop('Chapter 10, exercise 23'),
  ],
  'comb.pigeonhole': [
    c('step-f05', 'Assignment 5, Q4', 'Socks in two colours: 3 for a pair, 5 for two pairs, 2n + 1 for n pairs.'),
    c('step-f08', 'Assignment 8, Q4', 'Socks in three colours: 4, 6, and 2n + 2.'),
    notes('87', 'Existential quantification, Example: The Pigeonhole Principle'),
  ],
  'pre.set-notation': [
    bop('Sections 1.1 and 1.5 to 1.7, with the exercises for Sections 1.5, 1.6, and 1.7', 'Added to the batch by decision 9.'),
    tmua('Making new statements, pages 12 to 20 (diagrams for not, and, or)'),
  ],
  'sets.comprehension': [
    notes('198 to 206', 'Sets: membership, defining sets, set comprehension, set equality'),
    sheet('Exercises 3, 3.1.1'),
  ],
  'sets.countable-unions': [sheet1('Q6')],
  'pre.algebraic-argument': [
    c('step-f12', 'Assignment 12, Q1'),
    bop('Sections 4.1 to 4.5; Chapter 4, exercises 1 to 5'),
  ],
  'pre.prime-factorisation': [c('step-f12', 'Assignment 12, Q4', 'Ages with product 2450, listed systematically.')],

  // ---------------------------------------------------------------- probability
  'pre.probability-scale': [
    c('step-f06', 'Assignment 6, Q4(i), footnote', '"Random means that any person has the same probability of being picked as any other person."'),
    c('step-f12', 'Assignment 12, Q2(iii)(a)'),
  ],
  'pre.sample-spaces': [c('step-f19', 'Assignment 19, Q4')],
  'pre.tree-diagrams': [
    c('step-f06', 'Assignment 6, Q4(i)'),
    c('step-f12', 'Assignment 12, Q2(ii), (iii)'),
  ],
  'pre.two-way-tables': [c('step-f06', 'Assignment 6, Q4(i)', 'The population of 100 people the question suggests.')],
  'prob.conditional-formula': [
    c('step-f06', 'Assignment 6, Q4(i)(c), (e)'),
    c('step-f12', 'Assignment 12, Q3'),
    c('step-f19', 'Assignment 19, Q4(i)'),
  ],
  'prob.bayes-two-events': [
    c('step-f06', 'Assignment 6, Q4 and Discussion', 'Reverse a conditional by a population of 100 or 100,000; false positives and negatives; P(+ | D) is not P(D | +).'),
  ],
  'prob.counting-probability': [c('step-f12', 'Assignment 12, Q2(ii) and Q3')],
  'prob.independent-events': [c('step-f12', 'Assignment 12, Q2(iv)')],
  'prob.binomial-distribution': [c('step-f19', 'Assignment 19, Q4(ii)')],
  'prob.classical-probability': [sheet1('Q1, Q2, Q3, Q11')],
  'prob.sampling-models': [sheet1('Q2, Q12, Q13')],
  'prob.stirling-formula': [sheet1('Q3, Q14')],
  'prob.event-spaces': [sheet1('Q4', 'State what it means for F to be a sigma-algebra; show from the definition that the empty set, finite unions, and countable intersections are events.')],
  'prob.axioms': [sheet1('Q4')],
  'prob.axiom-consequences': [sheet1('Q4(b) to (e), Q5(a)')],
  'prob.continuity': [sheet1('Q4(f), Q6')],
  'prob.subadditivity': [sheet1('Q6')],
  'prob.inclusion-exclusion-three': [sheet1('Q5')],
  'prob.inclusion-exclusion': [sheet1('Q7')],
  'prob.total-probability': [sheet1('Q8, Q9')],
  'prob.bayes-formula': [sheet1('Q8, Q9')],
  'prob.conditional-probability': [sheet1('Q10')],
  'prob.independence': [sheet1('Q11')],

  // ---------------------------------------------------------------- logic and proof
  'logic.connectives': [
    notes('77 to 84, 104 to 115, 133 to 137', 'Conjunction, disjunction, negation'),
    bop('Sections 2.1, 2.2, 2.3, 2.5; exercises for Sections 2.1, 2.2, 2.5'),
    tmua('Statements and making new statements, pages 8 to 24; exercises A to D, L'),
  ],
  'logic.implication': [
    notes('42 to 56', 'Implication'),
    bop('Sections 2.3, 2.5, 2.11; exercises for Sections 2.3, 2.5, 2.9'),
    tmua('Language and implication, pages 25 to 37 and 50; exercises E, H, J'),
  ],
  'logic.iff': [
    notes('57 to 62', 'Bi-implication'),
    sheet('Exercises 1, 1.1.3, 1.2.7, 1.3.1(c)'),
    bop('Section 2.4; exercises for Sections 2.3, 2.4'),
    tmua('If, only if, if and only if, pages 25 to 37; necessary and sufficient, pages 51 to 55; exercises G, I'),
  ],
  'logic.equivalences': [
    notes('133 to 153', 'Negation, proof by contradiction, proof by contrapositive'),
    sheet('Exercises 1, 1.3.2'),
    bop('Section 2.6; exercises for Section 2.6'),
    tmua('Revisiting equivalence, pages 21 to 24; converse and contrapositive, pages 38 to 49; exercises E, F, K'),
  ],
  'logic.quantifiers': [
    notes('63 to 76, 85 to 103', 'Universal quantification, existential quantification'),
    sheet('Exercises 1, 1.2.10, 1.3.2'),
    bop('Section 2.7; exercises for Sections 2.7 and 2.9'),
    tmua('Quantifiers, pages 56 to 63; exercise M'),
  ],
  'logic.nested-quantifiers': [
    bop('Sections 2.7 to 2.9; exercises for Sections 2.7 and 2.9'),
    tmua('Combining quantifiers, pages 56 to 63; exercise N'),
  ],
  'logic.negating-quantifiers': [
    sheet('Exercises 1, 1.1.5'),
    bop('Section 2.10; exercises for Section 2.10'),
    tmua('Negating quantifiers, pages 56 to 63'),
  ],
  'proof.direct': [
    notes('11 to 56', 'Preliminaries, proofs in practice, mathematical jargon, implication'),
    sheet('Exercises 1, 1.1.6'),
    bop('Sections 2.12, 4.1 to 4.3; Chapter 4, exercises 1 to 13, 18 to 20, 24'),
    tmua('Proof, pages 64 to 71; identifying errors in proofs, pages 72 to 74'),
  ],
  'proof.cases': [
    c('step-f05', 'Assignment 5, Q4(iii)'),
    c('step-f06', 'Assignment 6, Q3'),
    c('step-f08', 'Assignment 8, Q4(iii)'),
    c('step-f12', 'Assignment 12, Q1, Q3(ii), (iii)'),
    notes('104 to 115', 'Disjunction'),
    sheet('Exercises 1 to 3: 1.1.8, 1.2.8, 2.2.3, 2.3.1, 3.2.7'),
    bop('Section 4.5; Chapter 4, exercises 14 to 17; Chapter 5, exercises 17, 28'),
  ],
  'proof.counterexample': [
    sheet('Exercises 1 and 2: 1.1.1, 1.1.5, 1.2.3, 1.2.5, 1.2.9, 2.2.1'),
    tmua('Proof by counterexample, pages 64 to 71; exercise P'),
  ],
  'proof.contrapositive': [
    notes('133 to 153', 'Proof by contrapositive'),
    sheet('Exercises 1 and 4: 1.1.2, 1.1.3, 1.1.8, 4.2.1'),
    bop('Sections 5.1 and 5.3; Chapter 5, exercises 1 to 16, 25'),
    tmua('Converse and contrapositive, pages 38 to 49; exercise K'),
  ],
  'proof.contradiction': [
    notes('133 to 153', 'Proof by contradiction'),
    sheet('Exercises 2, 2.3.2'),
    bop('Sections 6.1 to 6.4; Chapter 6, exercises 1 to 13, 16, 18, 20 to 24'),
    tmua('Proof by contradiction, pages 64 to 71; exercise O'),
  ],
  'proof.quantifier-patterns': [
    notes('63 to 103', 'Universal and existential quantification, unique existence'),
    sheet('Exercises 1, 1.1.4, 1.1.7, 1.3.1'),
    bop('Chapter 4, exercise 26'),
  ],
  'proof.strong-induction': [
    notes('283 to 305', 'Induction from a basis, strong induction, the Fundamental Theorem of Arithmetic'),
    sheet('Exercises 1 and 4: 1.2.10, 4.2.3, 4.3.1'),
    bop('Sections 10.2, 10.3; Chapter 10, exercises 25 to 30, 32, 42'),
  ],
  'proof.infinitely-many-primes': [
    notes('306 to 308', 'Euclid\'s infinity of primes'),
    bop('Section 6.1'),
  ],
  'alg.proof-by-induction': [
    notes('265 to 290', 'Mathematical induction, induction from a basis'),
    sheet1('Q10'),
    sheet('Exercises 4, 4.1.1, 4.1.2, 4.2.2, 4.2.3, 4.3.2'),
    bop('Sections 10.1 to 10.3; Chapter 10, exercises 1 to 22, 33, 34, 43'),
  ],
  'alg.arithmetic-series': [sheet('Exercises 1, 1.3.1')],
  'alg.geometric-series': [sheet('Exercises 4, 4.2.1')],
  'alg.sigma-notation': [
    sheet('Exercises 4, 4.3.2'),
    bop('Chapter 10, exercises 1 to 8, 15, 20, 34'),
  ],

  // ---------------------------------------------------------------- numbers
  'num.number-systems': [
    notes('158 to 175', 'Natural numbers (N starts at 0, page 158) and number systems'),
    sheet('Exercises 1 and 3: 1.1.6, 1.2.3, 3.2.5'),
    bop('Section 1.9'),
  ],
  'num.divisibility': [
    notes('57 to 62, 77 to 103', 'Divisibility (Definition 14), Theorem 19, Theorem 23'),
    c('step-f12', 'Assignment 12, Q1'),
    sheet('Exercises 1 and 3: 1.2.1 to 1.2.9, 3.3.2'),
    bop('Section 4.2 (definitions); Chapter 4, exercises 6 to 11, 19, 20; Chapter 5, exercises 1 to 13; Chapter 6, exercises 10, 11, 15, 17, 19'),
  ],
  'num.congruence': [
    notes('57 to 62', 'Congruence (Definition 14)'),
    sheet('Exercises 2 and 3: 2.1.1, 3.2.4'),
    bop('Section 5.2; Chapter 5, exercises 18 to 24, 32'),
  ],
  'num.modular-arithmetic': [
    notes('104 to 115, 188 to 197', 'Proposition 25; modular arithmetic'),
    sheet('Exercises 2 and 3: 2.1.2, 2.1.3, 2.2.1 to 2.2.4, 2.3.1, 2.3.2, 3.2.7'),
    bop('Chapter 5, exercises 17, 28; Chapter 6, exercises 15, 17'),
  ],
  'num.modular-integers': [
    notes('188 to 197', 'Modular arithmetic, Z_m, the tables for Z_4 and Z_5'),
    sheet('Exercises 2, 2.1.4 and 2.2.6'),
    bop('Section 11.5; exercises for Section 11.5'),
  ],
  'num.modular-exponentiation': [sheet('Exercises 2, 2.2.5')],
  'num.division-theorem': [
    notes('176 to 187', 'The Division Theorem and Algorithm'),
    sheet('Exercises 2, 2.1.3'),
    bop('Section 1.9 (Fact 1.5); Chapter 7, exercise 28'),
  ],
  'num.gcd': [
    notes('207 to 237', 'Greatest common divisor, Key Lemma 72, Lemma 81'),
    sheet('Exercises 3, 3.1.1, 3.1.3, 3.2.1, 3.2.3, 3.2.6, 3.2.9'),
    bop('Chapter 4, exercises 27, 28; Chapter 5, exercises 29 to 31; Chapter 7, exercises 31 to 33, 35, 36'),
  ],
  'num.euclid-algorithm': [
    notes('215 to 237', 'Euclid\'s algorithm, Theorem 79'),
    sheet('Exercises 3 and 4: 3.1.2, 3.3.3, 4.2.3, 4.3.1'),
  ],
  'num.euclid-theorem': [
    notes('238 to 243', 'Coprimality, Euclid\'s Theorem 83, Corollary 84'),
    sheet('Exercises 1 to 3: 1.2.9, 2.2.8, 2.2.9, 3.1.6, 3.2.2 to 3.2.5, 3.2.7, 3.3.1, 3.3.2'),
    bop('Chapter 7, exercises 29, 30, 34; exercises for Section 11.5, 5, 6'),
  ],
  'num.extended-euclid': [
    notes('245 to 258', 'Extended Euclid\'s algorithm, Theorem 88, Theorem 92'),
    sheet('Exercises 3, 3.1.4, 3.1.5, 3.2.10'),
    bop('Section 7.4, page 164'),
  ],
  'num.modular-inverse': [
    notes('244 to 258', 'Fields of modular arithmetic; Corollary 93'),
    sheet('Exercises 2 and 3: 2.2.6, 3.2.10 to 3.2.12'),
  ],
  'num.prime-binomial': [
    notes('116 to 121, 238 to 243', 'A little arithmetic, Lemmas 27 and 28'),
    bop('Chapter 4, exercise 21'),
  ],
  'num.fermat-little': [
    notes('11 to 17, 125 to 131, 238 to 243, 278 to 282', 'The pirates puzzle; Fermat\'s Little Theorem, parts 1 and 2; by induction'),
    sheet('Exercises 2 and 3: 2.2.4, 2.2.5, 2.2.7 to 2.2.9, 3.2.8'),
  ],
  'num.diffie-hellman': [notes('259 to 264', 'Diffie-Hellman key exchange; RSA as an aside')],
  'num.fundamental-theorem': [
    notes('291 to 305', 'Fundamental Theorem of Arithmetic'),
    bop('Section 10.4'),
  ],
};
