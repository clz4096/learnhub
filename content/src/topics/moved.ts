/**
 * Cambridge problems that moved to another topic. Learner history names a problem by the key
 * "topicId/problemId" (supervision attempts, results, redo lists), so a problem that changes
 * topic changes key even when its id stays. This maps each old key to the current one, so old
 * history still finds its problem. The content checks emit it into the catalog
 * (`MOVED_PROBLEMS`, with `currentProblemKey`), which the app loads without any lesson.
 *
 * Rule 1 (how-a-topic-works, 2026-10-08): every Cambridge problem sits in the earliest topic
 * where everything it needs has been taught. The written proofs that topics before the first
 * proof lesson set moved to the proof topic whose lesson teaches the method they use. Three
 * were copies of an exercise already set there (Set notation's 5.1.6 and Subsets' 5.2.3, both
 * proof.set-proofs gates, and Sequences' 1.3.1(d), the same exercise as Algebraic argument's),
 * so their old keys map to that one problem.
 *
 * The rest of Rule 1 (2026-10-08) moved every other problem whose needs named a topic later in the book,
 * of any kind and into any topic, to the earliest topic that teaches all of them. Seven were copies of an
 * exercise already set there, so their old keys map to that problem. Four of those had a different id:
 * Normal distribution's Sheet 4 Q6(b) is lim.clt's ia-s4-q6-b, Mutually exclusive's Assignment 12 Q3(ii)
 * is Counting probability's a12-q3-ii-show, Telescoping's Assignment 24 Q3 write-up is Integration by
 * parts' a24-q3, and Quadratic equations' STEP 2 Statistics Q5 write-up is Poisson rates' s2-q5-george.
 * Three more have no entry, since where Rule 1 puts them they are worked examples, not problems: Quadratic
 * equations' Assignment 2 Q2(vi) (fn.quadratic-graphs), Surds' Assignment 14 Q2(ii)
 * (alg.geometric-sum-to-infinity), and Quadratic equations' Mildred's first text (prob.poisson-rates).
 *
 * Otherwise every id is unchanged; only the topic moves. Never remove an entry: history is kept forever.
 */
export const MOVED_PROBLEMS: Readonly<Record<string, string>> = {
  // To proof.direct.
  'pre.fractions/step00-q1-unit': 'proof.direct/step00-q1-unit',
  'pre.indices/ns2-q12-ii': 'proof.direct/ns2-q12-ii',
  'pre.algebraic-manipulation/a7-q2-i-ii': 'proof.direct/a7-q2-i-ii',
  'pre.algebraic-manipulation/a7-q2-iv': 'proof.direct/a7-q2-iv',
  'alg.surds/a2-q1-iii': 'proof.direct/a2-q1-iii',
  'ineq.linear-quadratic/a1-q3': 'proof.direct/a1-q3',
  'ineq.linear-quadratic/stepspec-q1-i': 'proof.direct/stepspec-q1-i',
  'geom.straight-lines/step04-q6': 'proof.direct/step04-q6',
  'pre.sequences/sw-1-3-1-d': 'proof.direct/sw-1-3-1-d',
  'alg.arithmetic-series/sw-1-3-1-e': 'proof.direct/sw-1-3-1-e',
  'alg.arithmetic-series/sw-1-3-1-f-proof': 'proof.direct/sw-1-3-1-f-proof',
  'alg.geometric-series/sw-4-2-1-a-proof': 'proof.direct/sw-4-2-1-a-proof',
  'alg.geometric-series/sw-4-2-1-b-proof': 'proof.direct/sw-4-2-1-b-proof',
  'pre.remainders/a3-q4-i': 'proof.direct/a3-q4-i',
  'pre.remainders/ns2-q13': 'proof.direct/ns2-q13',
  'pre.remainders/ns2-q12-i': 'proof.direct/ns2-q12-i',
  'pre.algebraic-argument/a12-q1-ii-six': 'proof.direct/a12-q1-ii-six',
  'pre.algebraic-argument/ns1-q4-proof': 'proof.direct/ns1-q4-proof',
  'pre.algebraic-argument/sw-1-3-1-d': 'proof.direct/sw-1-3-1-d',
  'fn.floor-function/a3-q3': 'proof.direct/a3-q3',
  'logic.implication/notes-54-thm11': 'proof.direct/notes-54-thm11',
  'pre.product-rule/a7-q4-i-a': 'proof.direct/a7-q4-i-a',
  'pre.product-rule/a7-q4-i-c-show': 'proof.direct/a7-q4-i-c-show',
  'pre.product-rule/a7-q4-ii-b-show': 'proof.direct/a7-q4-ii-b-show',
  'num.number-systems/sw-1-1-6': 'proof.direct/sw-1-1-6',
  'logic.negating-quantifiers/lp-ex-16': 'proof.direct/lp-ex-16',
  // To the later proof topics.
  'pre.algebraic-argument/ns1-q1': 'proof.cases/ns1-q1',
  'logic.nested-quantifiers/lp-ex-12-why': 'proof.counterexample/lp-ex-12-why',
  'logic.quantifiers/sw-1-3-2': 'proof.quantifier-patterns/sw-1-3-2',
  'logic.quantifiers/sw-1-2-10': 'proof.quantifier-patterns/sw-1-2-10',
  'logic.iff/sw-1-1-3': 'proof.contrapositive/sw-1-1-3',
  'num.number-systems/step08-q1': 'proof.contradiction/step08-q1',
  'pre.set-notation/ns1-q6': 'proof.set-proofs/ns1-q6',
  'pre.set-notation/ns1-q13': 'proof.set-proofs/ns1-q13',
  'pre.set-notation/sw-5-1-6': 'proof.set-proofs/sw-5-1-6',
  'sets.comprehension/notes-205-equality': 'proof.set-proofs/notes-205-equality',
  'sets.subsets/sw-5-2-2-proof': 'proof.set-proofs/sw-5-2-2-proof',
  'sets.subsets/sw-5-2-3': 'proof.set-proofs/sw-5-2-3',
  'sets.cartesian-product/sw-5-2-4-proof': 'proof.set-proofs/sw-5-2-4-proof',
  'sets.cartesian-product/notes-353-prop109': 'proof.set-proofs/notes-353-prop109',
  'sets.indexed/sw-5-2-6': 'proof.set-proofs/sw-5-2-6',
  'sets.indexed/sw-5-2-7': 'proof.set-proofs/sw-5-2-7',
  'sets.indexed/sw-5-3-1': 'proof.set-proofs/sw-5-3-1',
  // Rule 1, the rest (2026-10-08): every Cambridge problem whose needs named a later topic, set in the
  // earliest topic that teaches all of them.
  'pre.algebraic-manipulation/a7-q3': 'alg.polynomials/a7-q3',
  'comb.factorial/gs-3-1-7': 'pre.probability-scale/gs-3-1-7',
  'pre.indices/a12-q1-iii': 'proof.cases/a12-q1-iii',
  'pre.sequences/sw-1-3-1-c': 'proof.cases/sw-1-3-1-c',
  'logic.implication/notes-50-prop10': 'proof.direct/notes-50-prop10',
  'num.number-systems/sw-3-2-5': 'num.euclid-theorem/sw-3-2-5',
  'alg.sigma-notation/sw-4-3-2-d': 'comb.binomial-theorem/sw-4-3-2-d',
  'logic.iff/sw-1-2-2': 'num.divisibility/sw-1-2-2',
  'logic.iff/sw-1-2-7': 'num.divisibility/sw-1-2-7',
  'logic.quantifiers/notes-72-prop18': 'num.divisibility/notes-72-prop18',
  'proof.direct/ns2-q15': 'pre.hcf-lcm/ns2-q15',
  'logic.equivalences/cst-lemma-43-equivalences': 'logic.negating-quantifiers/cst-lemma-43-equivalences',
  'proof.cases/sw-2-3-1': 'num.congruence/sw-2-3-1',
  'proof.cases/sw-3-2-7': 'num.congruence/sw-3-2-7',
  'alg.proof-by-induction/ia-q10-proof': 'pre.tree-diagrams/ia-q10-proof',
  'proof.infinitely-many-primes/ns2-q6': 'alg.proof-by-induction/ns2-q6',
  'num.congruence/sheet-3-2-4': 'num.euclid-theorem/sheet-3-2-4',
  'num.modular-inverse/sheet-3-2-12-inverse': 'num.modular-exponentiation/sheet-3-2-12-inverse',
  'rv.expectation/s3-q1-ii-u3': 'prob.first-step/s3-q1-ii-u3',
  'rv.cdf-method/s2-q4-cdf': 'prob.poisson-distribution/s2-q4-cdf',
  'rv.expectation-algebra/s3-q3-ii-c': 'rv.indicators/s3-q3-ii-c',
  'rv.indicators/sheet2-q12': 'prob.independence/sheet2-q12',
  'prob.exponential-distribution/ia4-q4-which': 'rv.joint-densities/ia4-q4-which',
  'alg.surds/a1-q1-iv': 'pre.quadratic-equations/a1-q1-iv',
  'ineq.linear-quadratic/step06-q3': 'proof.counterexample/step06-q3',
  'geom.straight-lines/a2-q2-iii': 'fn.modulus/a2-q2-iii',
  'fn.quadratic-graphs/a2-q2-vii': 'fn.modulus/a2-q2-vii',
  'pre.primes-and-factors/a10-q3-iii': 'pre.prime-factorisation/a10-q3-iii',
  'pre.primes-and-factors/a10-q3-i-b': 'pre.prime-factorisation/a10-q3-i-b',
  'calc.derivatives/a9-q2-ii': 'calc.stationary-points/a9-q2-ii',
  'calc.stationary-points/a7-q1-i': 'fn.rational-functions/a7-q1-i',
  'calc.curve-sketching/a22-q4': 'calc.differentiation-rules/a22-q4',
  'alg.telescoping/a24-q3': 'calc.standard-integrals/a24-q3',
  'fp.expressions/focs-1-6': 'fp.recursion/focs-1-6',
  'fp.functors/cs3110-9-functorized-bst': 'fp.binary-search-trees/cs3110-9-functorized-bst',
  'geom.euclidean-proof/a21-q4': 'geom.circles/a21-q4',
  'geom.euclidean-proof/a21-q4-ii': 'geom.circles/a21-q4-ii',
  'trig.compound-angles/step07-q2': 'trig.radians-and-graphs/step07-q2',
  'trig.compound-angles/step10-q3': 'trig.radians-and-graphs/step10-q3',
  'trig.compound-angles/step07-q2-pq': 'trig.radians-and-graphs/step07-q2-pq',
  'trig.double-angle/step05-q4': 'trig.radians-and-graphs/step05-q4',
  'trig.double-angle/step11-q3': 'trig.radians-and-graphs/step11-q3',
  'trig.double-angle/step05-q4-tan': 'trig.radians-and-graphs/step05-q4-tan',
  // Copies of an exercise already set in the topic where Rule 1 puts it: the old key reads as that problem.
  'pre.algebraic-manipulation/a7-q3-show': 'alg.roots-coefficients/a7-q3-show',
  'alg.polynomials/a18-q3': 'calc.definite-integrals/a18-q3',
  'fp.trees/focs-7-6': 'fp.binary-search-trees/focs-7-6',
  'prob.normal-distribution/ia4-q6-b': 'lim.clt/ia-s4-q6-b',
  'pre.mutually-exclusive/a12-q3-ii': 'prob.counting-probability/a12-q3-ii-show',
  'alg.telescoping/a24-q3-proof': 'calc.integration-by-parts/a24-q3',
  'pre.quadratic-equations/s2-q5-show': 'prob.poisson-rates/s2-q5-george',
};
