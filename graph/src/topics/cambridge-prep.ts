/**
 * Preparation, Stage A citations: where each topic of STEP Support Foundation Blocks 1 to 6
 * and CS-0 (proof, maths, functional programming) is taught or practised, from the
 * source-to-topic map (graph/reviews/cambridge-prep.md, 2026-10-05). Same form as
 * `cambridge-batch-1.ts`; `topics/index.ts` appends these after each topic's own sources and
 * its batch 1 and batch 2 citations.
 *
 * Every `doc` is a source id of scripts/sources/batch-6.json (the hints files, the TMUA
 * specification and notes, the NST Maths Workbook, the CS3110 textbook and exercise pages, the
 * FoCS notes) or a STEP Support Foundation assignment of scripts/sources/batch-1.json, which
 * batch 1 fetched only as a scan. The `section` is an assignment and question for STEP Support,
 * "Assignment n hints" for its hints file, a specification heading and item for the TMUA
 * specification, a heading and printed pages for the TMUA notes, a section and question code
 * for the NST workbook, a section for the CS3110 textbook, exercise names for its exercise
 * pages, and a lecture for the FoCS notes.
 *
 * Existing topics cite only batch 6 documents here. A batch 1 citation would make a scheduled
 * topic count as mapped in content.test's batch order check, which lists the batch 1 topics
 * exactly; the assignment questions that practise existing topics are in the map instead.
 */
import type { TopicSource } from '@learnhub/mastery';
import { CAMBRIDGE_COURSE, type CambridgeDoc } from '../sources';

const c = (doc: CambridgeDoc, section: string, note?: string): TopicSource =>
  note === undefined
    ? { doc, course: CAMBRIDGE_COURSE[doc], section, verified: true }
    : { doc, course: CAMBRIDGE_COURSE[doc], section, note, verified: true };

type Assignment = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25;
type WithHints = 1 | 2 | 3 | 4 | 9 | 10 | 11 | 13 | 14 | 15 | 16 | 17 | 18 | 20 | 21 | 22 | 23 | 24 | 25;
const pad = (n: number): string => String(n).padStart(2, '0');
/** A question of a Foundation assignment (its batch 1 PDF). */
const step = (n: Assignment, where: string, note?: string): TopicSource => c(`step-f${pad(n)}` as CambridgeDoc, `Assignment ${n}, ${where}`, note);
/** The official hints and partial solutions for those questions (batch 6). */
const hints = (n: WithHints, where: string): TopicSource => c(`step-f${pad(n)}-hints` as CambridgeDoc, `Assignment ${n} hints, ${where}`);
const tmua = (where: string, note?: string): TopicSource => c('tmua-spec', where, note);
const tnotes = (where: string): TopicSource => c('tmua-maths-notes', where);
const nst = (where: string): TopicSource => c('nst-workbook', where);
const book = (where: string): TopicSource => c('cs3110-book', where);
const ex = (ch: 2 | 3 | 4 | 5 | 8 | 9, names: string): TopicSource => c(`cs3110-ex${ch}` as CambridgeDoc, `Chapter ${ch} exercises: ${names}`);
const focs = (lecture: string, note?: string): TopicSource => c('focs-notes', lecture, note);

const MM1 = 'MM1. Algebra and functions';
const MM2 = 'MM2. Sequences and series';
const MM3 = 'MM3. Coordinate geometry in the (x, y)-plane';
const MM4 = 'MM4. Trigonometry';
const MM5 = 'MM5. Exponentials and logarithms';
const MM6 = 'MM6. Differentiation';
const MM7 = 'MM7. Integration';
const MM8 = 'MM8. Graphs of functions';

/** The topics the Preparation map adds: 58 for STEP Foundation and CS-0 maths and proof, 25 for CS-0 functional programming. */
export const PREP_NEW_TOPICS: readonly string[] = [
  // number-and-algebra
  'alg.surds', 'alg.simultaneous-equations', 'alg.polynomials', 'alg.roots-coefficients', 'alg.factorisations', 'alg.partial-fractions',
  'alg.exponential-equations', 'alg.surd-equations',
  // sequences-and-series
  'alg.telescoping', 'alg.sums-of-powers', 'alg.recurrence-sequences', 'alg.fibonacci', 'alg.binomial-rational',
  // number-theory
  'num.linear-diophantine',
  // functions-and-graphs
  'ineq.linear-quadratic', 'fn.quadratic-graphs', 'fn.floor-function', 'ineq.polynomial-regions', 'fn.rational-functions', 'ineq.rational',
  'ineq.am-gm', 'fn.functions', 'fn.graph-transformations', 'fn.modulus', 'fn.modulus-regions',
  // coordinate-geometry
  'geom.straight-lines', 'geom.euclidean-proof', 'geom.circles', 'geom.intersections', 'geom.loci', 'geom.3d-coordinates', 'geom.vectors',
  'geom.vector-lines',
  // trigonometry
  'trig.right-triangle', 'trig.sine-cosine-rules', 'trig.radians-and-graphs', 'trig.compound-angles', 'trig.double-angle', 'trig.equations',
  'trig.reciprocal-functions', 'trig.small-angles',
  // calculus
  'calc.stationary-points', 'calc.curve-sketching', 'calc.inflection-points', 'calc.first-principles', 'calc.hyperbolic',
  'calc.standard-integrals', 'calc.symmetry-integrals', 'calc.implicit-differentiation', 'calc.separable-odes',
  // further-algebra
  'cx.complex-numbers', 'mat.matrices',
  // sets
  'sets.subsets', 'sets.cartesian-product', 'sets.indexed',
  // proof
  'proof.set-proofs', 'proof.disproof', 'proof.smallest-counterexample',
  // functional-programming
  'fp.expressions', 'fp.functions', 'fp.recursion', 'fp.complexity', 'fp.lists', 'fp.polymorphism', 'fp.records-tuples', 'fp.variants',
  'fp.exceptions', 'fp.trees', 'fp.higher-order', 'fp.map-filter-fold', 'fp.modules', 'fp.functional-queues', 'fp.functors',
  'fp.specifications-testing', 'fp.equational-reasoning', 'fp.structural-induction', 'fp.binary-search-trees', 'fp.red-black-trees',
  'fp.references', 'fp.hash-tables', 'fp.lazy-sequences', 'fp.sorting', 'fp.search',
];

export const CAMBRIDGE_PREP: Readonly<Record<string, readonly TopicSource[]>> = {
  // ---------------------------------------------------------------- existing topics (batch 6 documents only)
  'pre.quadratic-equations': [hints(1, 'Q1(iv)(b), Q2(ii)'), tmua(`${MM1}, MM1.3`), tnotes(`${MM1}, pages 6 to 46`), nst('Algebra, A3, A4')],
  'alg.geometric-sum-to-infinity': [hints(3, 'Q1(ii)'), tmua(`${MM2}, MM2.3`)],
  'pre.primes-and-factors': [hints(3, 'Q4')],
  'pre.hcf-lcm': [hints(10, 'Q2(iii)')],
  'alg.exp-and-ln': [tmua(`${MM5}, MM5.1, MM5.2`), tnotes(`${MM5}, pages 99 to 107`), nst('Functions and curve sketching, FC5')],
  'calc.derivatives': [hints(9, 'Q2(ii)'), tmua(`${MM6}, MM6.1, MM6.2`, 'TMUA excludes differentiation from first principles; calc.first-principles takes it.'), tnotes(`${MM6}, pages 108 to 117`)],
  'calc.convexity': [hints(13, 'Q1')],
  'calc.differentiation-rules': [hints(22, 'Q1'), hints(23, 'Q1'), nst('Differentiation, D3')],
  'calc.definite-integrals': [hints(24, 'Q1(i)'), tmua(`${MM7}, MM7.1, MM7.3`), tnotes(`${MM7}, pages 118 to 135`)],
  'calc.integration-by-parts': [hints(24, 'Q1(ii)')],
  'calc.substitution': [hints(25, 'Q1')],
  'an.sequence-limits': [hints(15, 'Q2')],
  'an.exp-series': [hints(22, 'Q2')],
  'comb.binomial-theorem': [tmua(`${MM2}, MM2.4`), nst('Sequences and series, SS2')],
  'alg.proof-by-induction': [hints(20, 'Q2'), nst('Section 2, Mathematical induction, IN1, IN2')],
  'num.division-theorem': [hints(17, 'Q1(i)')],
  'num.congruence': [hints(17, 'Q1')],
  'num.modular-arithmetic': [hints(17, 'Q1, Q4')],
  'logic.iff': [hints(10, 'Q2(iv), (v)'), tmua('Arg2', 'Paper 2: "Understand and use the terms necessary and sufficient."')],
  'logic.quantifiers': [tmua('Arg3', 'Paper 2: "Understand and use the terms for all, for some (meaning for at least one), and there exists."')],
  'logic.negating-quantifiers': [tmua('Arg4', 'Paper 2: "Be able to negate statements that use any of the above terms."')],

  // ---------------------------------------------------------------- number and algebra
  'alg.surds': [step(1, 'Q1'), hints(1, 'Q1'), step(10, 'Q4(iv)'), step(14, 'Q2(i)'), tmua(`${MM1}, MM1.2`)],
  'alg.simultaneous-equations': [
    step(6, 'Q1(ii)'), step(14, 'Q2(iii)'), step(17, 'Q2(i)'), step(19, 'Q2(iii)'), tmua(`${MM1}, MM1.4`),
  ],
  'alg.polynomials': [
    step(4, 'Q2(ii), Q3(i)'), hints(4, 'Q2(ii), Q3(i)'), step(15, 'Q1(ii)'), step(16, 'Q2(iii), (iv)'), hints(16, 'Q2(iii), (iv)'),
    tmua(`${MM1}, MM1.6`), nst('Algebra, A6'),
  ],
  'alg.roots-coefficients': [step(7, 'Q2, Q3', 'Roots and coefficients without the formula; the quartic of 2002 STEP I Q5.'), step(16, 'Q2(iv)')],
  'alg.factorisations': [step(14, 'Q1'), hints(14, 'Q1'), step(2, 'Q1(i), (iv)'), step(10, 'Q4(ii)'), nst('Algebra, A2')],
  'alg.partial-fractions': [step(17, 'Q2(iii), (iv)'), hints(17, 'Q2(iii), (iv)'), nst('Algebra, A7')],
  'alg.exponential-equations': [step(11, 'Q2(i), Q4'), hints(11, 'Q2(i), Q4'), tmua(`${MM5}, MM5.3`)],
  'alg.surd-equations': [step(11, 'Q2(ii), Q3'), hints(11, 'Q2(ii), Q3')],

  // ---------------------------------------------------------------- sequences and series
  'alg.telescoping': [step(15, 'Q1(iii)'), step(17, 'Q2(iii)'), step(24, 'Q2(iii)'), nst('Section 2, Series, SE2')],
  'alg.sums-of-powers': [step(17, 'Q3'), hints(17, 'Q3'), step(20, 'Q2(b)'), hints(20, 'Q2(b)'), nst('Section 2, Series, SE1')],
  'alg.recurrence-sequences': [
    step(15, 'Q2, Q3'), hints(15, 'Q2, Q3'), step(11, 'Q1(i)'), tmua(`${MM2}, MM2.1`), nst('Sequences and series, SS4'),
  ],
  'alg.fibonacci': [step(14, 'Q3'), hints(14, 'Q3'), step(20, 'Q3'), hints(20, 'Q3')],
  'alg.binomial-rational': [step(19, 'Q1(iv)'), step(20, 'Q1(iii)'), hints(20, 'Q1(iii)'), nst('Sequences and series, SS5, SS6')],
  'num.linear-diophantine': [
    step(3, 'Q4', 'The bananas: 8N = 81m + 65.'), hints(3, 'Q4'), step(13, 'warm down', 'Coins and notes: 4p + 5q = 54.'), hints(13, 'warm down'),
    step(19, 'Q2(v)', '(x + 2)(y + 3) = 60 in positive integers.'),
  ],

  // ---------------------------------------------------------------- functions, graphs, and inequalities
  'ineq.linear-quadratic': [step(1, 'Q2(iii)'), hints(1, 'Q2(iii)'), step(4, 'Q2(i)'), step(22, 'Q3(i)'), tmua(`${MM1}, MM1.5`), nst('Algebra, A5')],
  'fn.quadratic-graphs': [step(2, 'Q2, Q3'), hints(2, 'Q2, Q3'), tmua(`${MM1}, MM1.3`), nst('Algebra, A4')],
  'fn.floor-function': [step(3, 'Q2(ii) to (v), Q3', 'Q3 is 2004 STEP I Q2.'), hints(3, 'Q2, Q3')],
  'ineq.polynomial-regions': [step(4, 'Q2(ii) to (iv), Q3', 'Q3 is 1995 STEP I Q1.'), hints(4, 'Q2, Q3')],
  'fn.rational-functions': [step(7, 'Q1(i)'), step(18, 'Q1'), hints(18, 'Q1'), nst('Functions and curve sketching, FC7')],
  'ineq.rational': [step(7, 'Q1(ii)'), step(18, 'Q2(iii)'), hints(18, 'Q2(iii)')],
  'ineq.am-gm': [step(8, 'Q1', 'AM-GM for two, four, then three numbers (Cauchy\'s backward induction).')],
  'fn.functions': [
    step(11, 'Q1'), hints(11, 'Q1'), step(16, 'Q1'), hints(16, 'Q1'), step(21, 'Q1(i)'), tmua(`${MM1}, MM1.7`),
    nst('Functions and curve sketching, FC6'),
  ],
  'fn.graph-transformations': [step(13, 'Q2(ii)'), hints(13, 'Q2(ii)'), step(22, 'Q3(iv), Q4(ii)'), tmua(MM8), nst('Functions and curve sketching, FC2, FC3')],
  'fn.modulus': [step(21, 'Q2(i) to (iii)'), hints(21, 'Q2(i) to (iii)'), step(5, 'Q2(iii)'), nst('Functions and curve sketching, FC1')],
  'fn.modulus-regions': [step(21, 'Q2(iv), (v), Q3', 'Q3 is 1999 STEP I Q4.'), hints(21, 'Q2(iv), (v), Q3')],

  // ---------------------------------------------------------------- coordinate geometry
  'geom.straight-lines': [step(2, 'Q2(i) to (iii)'), step(19, 'Q2(i) to (iv)'), tmua(`${MM3}, MM3.1, MM3.2`), tnotes(`${MM3}, pages 63 to 78`)],
  'geom.euclidean-proof': [
    step(4, 'Q1'), hints(4, 'Q1'), step(9, 'Q1(i), Q4'), hints(9, 'Q1(i), Q4'), step(1, 'Q4', 'Holditch\'s theorem.'), step(16, 'Q4'),
    step(20, 'Q5'), step(21, 'Q4'), tmua(`${MM3}, MM3.3`), nst('Geometry, G1, G2'),
  ],
  'geom.circles': [step(8, 'Q2(i)'), step(23, 'Q3(i)'), hints(23, 'Q3(i)'), tmua(`${MM3}, MM3.2`)],
  'geom.intersections': [step(8, 'Q2(ii) to (iv), Q3', 'Q3 is 2002 STEP I Q1.'), step(23, 'Q2(ii), (iii), Q3(ii)'), hints(23, 'Q2(ii), (iii), Q3(ii)')],
  'geom.loci': [step(19, 'Q2(ii), Q3', 'Q3 is 2005 STEP I Q6, a circle of Apollonius.')],
  'geom.3d-coordinates': [step(5, 'Q2(ii), Q3', 'Q3 is 2006 STEP I Q8, the tetrahedron.')],
  'geom.vectors': [nst('Vectors, V1')],
  'geom.vector-lines': [nst('Section 2, Vectors, VE1')],

  // ---------------------------------------------------------------- trigonometry
  'trig.right-triangle': [step(5, 'Q1(i)'), tmua(`${MM4}, MM4.3, MM4.5`), tnotes(`${MM4}, pages 79 to 98`)],
  'trig.sine-cosine-rules': [step(5, 'Q1(ii), Q2(i)'), step(9, 'Q1(ii), (iii)'), hints(9, 'Q1(ii), (iii)'), tmua(`${MM4}, MM4.1`)],
  'trig.radians-and-graphs': [step(3, 'Q1(i)'), hints(3, 'Q1(i)'), step(16, 'Q2(ii)'), tmua(`${MM4}, MM4.2, MM4.4`)],
  'trig.compound-angles': [step(10, 'Q1(i), (ii)'), hints(10, 'Q1(i), (ii)'), step(16, 'Q2(i), Q3(i)'), hints(16, 'Q2(i), Q3(i)'), nst('Trigonometry, T2 to T6')],
  'trig.double-angle': [step(10, 'Q1(iii)'), hints(10, 'Q1(iii)'), step(23, 'Q1(ii), Q2(iv)'), step(25, 'Q2(v)')],
  'trig.equations': [step(16, 'Q2(ii), Q3', 'Q3 is 2015 STEP I Q2: a cubic solved with cos 3A.'), hints(16, 'Q2(ii), Q3'), tmua(`${MM4}, MM4.6`), nst('Trigonometry, T1, T7, T8')],
  'trig.reciprocal-functions': [step(24, 'Q2(ii)'), step(25, 'Q2(iii)'), hints(25, 'Q2(iii)')],
  'trig.small-angles': [step(19, 'Q1'), step(20, 'Q1(i)'), hints(20, 'Q1(i)')],

  // ---------------------------------------------------------------- calculus
  'calc.stationary-points': [step(7, 'Q1(i)'), step(9, 'Q2(ii)'), hints(9, 'Q2(ii)'), step(22, 'Q3(iii)'), tmua(`${MM6}, MM6.3`), nst('Differentiation, D1')],
  'calc.curve-sketching': [
    step(9, 'Q2(iii), (iv), Q3', 'Q3 is 1993 STEP I Q7.'), hints(9, 'Q2(iii), (iv), Q3'), step(13, 'Q2, Q3', 'Q3 is 2012 STEP I Q2.'), hints(13, 'Q2, Q3'),
    step(22, 'Q4', '2015 STEP I Q1.'), hints(22, 'Q4'),
  ],
  'calc.inflection-points': [step(13, 'Q1'), hints(13, 'Q1')],
  'calc.first-principles': [step(20, 'Q1'), hints(20, 'Q1'), step(21, 'Q1(ii)'), step(22, 'Q1'), nst('Differentiation, D2')],
  'calc.hyperbolic': [step(21, 'Q1', 'C(x) and S(x) built from a^x; with a = e they are cosh and sinh.'), hints(21, 'Q1'), nst('Section 2, Hyperbolic functions, H1, H2')],
  'calc.standard-integrals': [step(24, 'Q1(i), Q2(v)'), hints(24, 'Q1(i), Q2(v)'), step(25, 'Q4(ii)'), hints(25, 'Q4(ii)'), tmua(`${MM7}, MM7.3`, 'The Fundamental Theorem of Calculus; TMUA integrates only powers of x (MM7.2).'), nst('Integration, I1, I2')],
  'calc.symmetry-integrals': [step(25, 'Q2(vi), Q3, Q4(i)', 'Q3 is 1994 STEP I Q8.'), hints(25, 'Q2(vi), Q3, Q4(i)')],
  'calc.implicit-differentiation': [nst('Differentiation, D4, D5')],
  'calc.separable-odes': [nst('Differential equations, DE1'), tmua(`${MM7}, MM7.6`, 'TMUA sets only dy/dx = f(x), the case g(y) = 1.')],

  // ---------------------------------------------------------------- further algebra
  'cx.complex-numbers': [step(2, 'Q1(iv)', 'The four roots of x^4 + 1 = 0.'), step(14, 'Q1(iv)'), nst('Section 2, Complex numbers, C1, C2')],
  'mat.matrices': [nst('Section 2, Matrices')],

  // ---------------------------------------------------------------- functional programming
  'fp.expressions': [book('Section 2.3, Expressions'), ex(2, 'values, operators, equality, assert, if'), focs('Lecture 1: Introduction to Programming')],
  'fp.functions': [
    book('Section 2.4, Functions'), ex(2, 'double fun, more fun, RMS, date fun, divide, associativity, average'),
    focs('Lecture 1: Introduction to Programming'),
  ],
  'fp.recursion': [book('Section 2.4, Functions'), ex(2, 'fib, fib fast'), ex(3, 'take drop tail'), focs('Lecture 2: Recursion and Efficiency')],
  'fp.complexity': [focs('Lecture 2: Recursion and Efficiency'), book('Section 9.2, Amortized Analysis')],
  'fp.lists': [
    book('Section 3.1, Lists'), ex(3, 'list expressions, product, concat, patterns, library, library puzzle, take drop, unimodal, powerset, print int list rec, print int list iter'),
    focs('Lecture 3: Lists'),
  ],
  'fp.polymorphism': [book('Section 2.4, Functions'), ex(2, 'poly types'), focs('Lecture 4: More on Lists')],
  'fp.records-tuples': [book('Section 3.4, Records and Tuples'), ex(3, 'student, pokerecord, date before, earliest date, assoc list'), focs('Lecture 4: More on Lists')],
  'fp.variants': [
    book('Sections 3.2, 3.7, and 3.9, Variants, Options, Algebraic Data Types'), ex(3, 'safe hd and tl, pokefun, cards, matching, quadrant, quadrant when, quadrant poly'),
    focs('Lecture 6: Datatypes and Trees'),
  ],
  'fp.exceptions': [book('Section 3.10, Exceptions'), ex(3, 'list max exn, list max exn string'), focs('Lecture 6: Datatypes and Trees')],
  'fp.trees': [book('Section 3.11, Example: Trees'), ex(3, 'depth, shape'), focs('Lecture 6: Datatypes and Trees')],
  'fp.higher-order': [
    book('Sections 4.1 and 4.7, Higher-Order Functions, Currying'), ex(4, 'twice, no arguments, mystery operator 1, mystery operator 2, repeat, library uncurried'),
    focs('Lecture 8: Functions as Values'),
  ],
  'fp.map-filter-fold': [
    book('Sections 4.2 to 4.6, Map, Filter, Fold, Beyond Lists, Pipelining'),
    ex(4, 'product, terse product, sum_cube_odd, sum_cube_odd pipeline, exists, account balance, map composition, more list fun, association list keys, valid matrix, row vector add, matrix add, matrix multiply, pipeline fusion'),
    focs('Lecture 8: Functions as Values'),
  ],
  'fp.modules': [
    book('Sections 5.1 to 5.5 and 5.7, Module Systems to Compilation Units, Module Type Constraints'),
    ex(5, 'stack option, queue option, browser, helpdesk, complex synonym, complex encapsulation, first-class generators, fraction, fraction reduced, cached list pair, cached list nodes, cached list tradeoffs, implementation without interface, implementation with interface, implementation with abstracted interface'),
  ],
  'fp.functional-queues': [book('Section 5.6, Functional Data Structures'), ex(5, 'big list queue, big batched queue, queue efficiency'), focs('Lecture 10: Queues and Search Strategies')],
  'fp.functors': [
    book('Sections 5.8 and 5.9, Includes, Functors'),
    ex(5, 'make char map, char ordered, use char map, bindings, date order, calendar, print calendar, is for, first after, sets, ToString, Print, Print Int, Print String, Print Reuse, Print String reuse revisited, printer for date, refactor arith'),
    ex(9, 'functorial interface, functorized BST'),
  ],
  'fp.specifications-testing': [
    book('Sections 8.1 to 8.6, Specifications to Randomized Testing with QCheck'),
    ex(8, 'spec game, poly spec, poly impl, interval arithmetic, function maps, set black box, set glass box, random lists, qcheck odd divisor, qcheck avg'),
    ex(3, 'product test, library test, list max exn ounit'),
  ],
  'fp.equational-reasoning': [book('Section 8.7, Proving Correctness'), ex(8, 'exp, fibi, expsq, expsq simplified, mult')],
  'fp.structural-induction': [
    book('Sections 8.8 and 8.9, Structural Induction, Equational Specification'),
    ex(8, 'append nil, rev dist append, rev involutive, reflect size, fold theorem 2, propositions, list spec, bag spec'),
  ],
  'fp.binary-search-trees': [ex(3, 'is_bst'), ex(5, 'binary search tree map'), ex(9, 'efficient traversal'), focs('Lecture 7: Dictionaries and Functional Arrays')],
  'fp.red-black-trees': [book('Section 9.3, Red-Black Trees'), ex(9, 'RB draw complete, RB draw insert')],
  'fp.references': [book('Sections 6.1 to 6.3, Refs, Mutable Fields, Arrays and Loops'), focs('Lecture 11: Elements of Procedural Programming')],
  'fp.hash-tables': [
    book('Sections 9.1 and 9.2, Hash Tables, Amortized Analysis'),
    ex(9, 'hash insert, relax bucket RI, strengthen bucket RI, hash values, hashtbl usage, hashtbl stats, hashtbl bindings, hashtbl load factor, equals and hash, bad hash, linear probing'),
  ],
  'fp.lazy-sequences': [
    book('Section 9.4, Sequences'),
    ex(9, 'pow2, more sequences, nth, hd tl, filter, interleave, sift, primes, approximately e, better e, different sequence rep, lazy hello, lazy and, lazy sequence'),
    focs('Lecture 9: Sequences, or Lazy Lists'),
  ],
  'fp.sorting': [focs('Lecture 5: Sorting')],
  'fp.search': [focs('Lecture 10: Queues and Search Strategies')],
};
