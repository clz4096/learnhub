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
 * Every id is unchanged; only the topic moves. Never remove an entry: history is kept forever.
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
};
