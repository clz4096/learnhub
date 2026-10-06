/**
 * Topic content on demand. Each topic module is its own dynamic import, so a bundler puts
 * every lesson in a chunk of its own and the app downloads a lesson only when it opens
 * it. What the app needs about all topics at once (which have content, the titles of
 * their Cambridge problems, which of them are gate problems) is in the generated catalog,
 * which loads no lesson.
 *
 * The app imports only this module's exports from `@learnhub/content`; the static list of
 * every topic (`@learnhub/content/all`) is for the content checks and tests.
 */
import { CATALOG, type CatalogProblem } from './catalog.generated';
import type { TopicContent } from './topic';

/** One loader per topic with content, in the order of `TOPIC_CONTENT`. The content checks compare the two. */
export const TOPIC_LOADERS: Readonly<Record<string, () => Promise<TopicContent>>> = {
  'pre.fractions': async () => (await import('./topics/fractions')).fractions,
  'pre.set-notation': async () => (await import('./topics/set-notation')).setNotation,
  'pre.product-rule': async () => (await import('./topics/product-rule')).productRule,
  'logic.connectives': async () => (await import('./topics/connectives')).connectives,
  'pre.algebraic-manipulation': async () => (await import('./topics/algebraic-manipulation')).algebraicManipulation,
  'sets.comprehension': async () => (await import('./topics/set-builder')).setBuilder,
  'comb.factorial': async () => (await import('./topics/factorial')).factorialTopic,
  'pre.indices': async () => (await import('./topics/indices')).indices,
  'pre.sequences': async () => (await import('./topics/sequences')).sequences,
  'pre.probability-scale': async () => (await import('./topics/probability-scale')).probabilityScale,
  'comb.pigeonhole': async () => (await import('./topics/pigeonhole')).pigeonhole,
  'prob.bayes-two-events': async () => (await import('./topics/bayes-two-events')).bayesTwoEvents,
  'prob.event-spaces': async () => (await import('./topics/event-spaces')).eventSpaces,
  // Batch 2
  'pre.sample-spaces': async () => (await import('./topics/sample-spaces')).sampleSpaces,
  'logic.implication': async () => (await import('./topics/implication')).implication,
  'pre.prime-factorisation': async () => (await import('./topics/prime-factorisation')).primeFactorisation,
  'pre.tree-diagrams': async () => (await import('./topics/tree-diagrams')).treeDiagrams,
  'pre.algebraic-argument': async () => (await import('./topics/algebraic-argument')).algebraicArgument,
  'num.number-systems': async () => (await import('./topics/number-systems')).numberSystems,
  'alg.sigma-notation': async () => (await import('./topics/sigma-notation')).sigmaNotation,
  'comb.combinations': async () => (await import('./topics/combinations')).combinations,
  'sets.countable-unions': async () => (await import('./topics/countable-unions')).countableUnions,
  'logic.iff': async () => (await import('./topics/iff')).iff,
  'logic.quantifiers': async () => (await import('./topics/quantifiers')).quantifiers,
  'proof.direct': async () => (await import('./topics/direct-proof')).directProof,
  'alg.arithmetic-series': async () => (await import('./topics/arithmetic-series')).arithmeticSeries,
  'logic.nested-quantifiers': async () => (await import('./topics/nested-quantifiers')).nestedQuantifiers,
  'alg.geometric-series': async () => (await import('./topics/geometric-series')).geometricSeries,
  'comb.binomial-identities': async () => (await import('./topics/binomial-identities')).binomialIdentities,
  // Batch 3
  'pre.two-way-tables': async () => (await import('./topics/two-way-tables')).twoWayTables,
  'comb.binomial-theorem': async () => (await import('./topics/binomial-theorem')).binomialTheorem,
  'logic.equivalences': async () => (await import('./topics/equivalences')).equivalences,
  'proof.cases': async () => (await import('./topics/proof-cases')).proofCases,
  'logic.negating-quantifiers': async () => (await import('./topics/negating-quantifiers')).negatingQuantifiers,
  'proof.counterexample': async () => (await import('./topics/counterexample')).counterexample,
  'proof.contradiction': async () => (await import('./topics/contradiction')).contradiction,
  'comb.repeated-arrangements': async () => (await import('./topics/repeated-arrangements')).repeatedArrangements,
  'alg.proof-by-induction': async () => (await import('./topics/proof-by-induction')).proofByInduction,
  'prob.counting-probability': async () => (await import('./topics/counting-probability')).countingProbability,
  'proof.contrapositive': async () => (await import('./topics/contrapositive')).contrapositive,
  'prob.independent-events': async () => (await import('./topics/independent-events')).independentEvents,
  'prob.inclusion-exclusion-three': async () => (await import('./topics/inclusion-exclusion-three')).inclusionExclusionThree,
  'proof.quantifier-patterns': async () => (await import('./topics/quantifier-patterns')).quantifierPatterns,
  'prob.classical-probability': async () => (await import('./topics/classical-probability')).classicalProbability,
  'proof.infinitely-many-primes': async () => (await import('./topics/infinitely-many-primes')).infinitelyManyPrimes,
  // Batch 4
  'comb.binomial-theorem-proof': async () => (await import('./topics/binomial-theorem-proof')).binomialTheoremProof,
  'proof.strong-induction': async () => (await import('./topics/strong-induction')).strongInduction,
  'num.divisibility': async () => (await import('./topics/divisibility')).divisibility,
  'prob.conditional-formula': async () => (await import('./topics/conditional-formula')).conditionalFormula,
  'num.division-theorem': async () => (await import('./topics/division-theorem')).divisionTheorem,
  'prob.binomial-distribution': async () => (await import('./topics/binomial-distribution')).binomialDistribution,
  'num.congruence': async () => (await import('./topics/congruence')).congruence,
  'num.gcd': async () => (await import('./topics/gcd')).gcdTopic,
  'num.modular-arithmetic': async () => (await import('./topics/modular-arithmetic')).modularArithmetic,
  'num.euclid-algorithm': async () => (await import('./topics/euclid-algorithm')).euclidAlgorithm,
  'prob.sampling-models': async () => (await import('./topics/sampling-models')).samplingModels,
  'num.modular-integers': async () => (await import('./topics/modular-integers')).modularIntegers,
  'num.modular-exponentiation': async () => (await import('./topics/modular-exponentiation')).modularExponentiation,
  'num.extended-euclid': async () => (await import('./topics/extended-euclid')).extendedEuclid,
  'num.euclid-theorem': async () => (await import('./topics/euclid-theorem')).euclidTheorem,
  'num.diffie-hellman': async () => (await import('./topics/diffie-hellman')).diffieHellman,
  'prob.stirling-formula': async () => (await import('./topics/stirling-formula')).stirlingFormula,
  'num.modular-inverse': async () => (await import('./topics/modular-inverse')).modularInverse,
  'prob.axioms': async () => (await import('./topics/axioms')).axioms,
  'num.fundamental-theorem': async () => (await import('./topics/fundamental-theorem')).fundamentalTheorem,
  'prob.axiom-consequences': async () => (await import('./topics/axiom-consequences')).axiomConsequences,
  'num.prime-binomial': async () => (await import('./topics/prime-binomial')).primeBinomial,
  'num.fermat-little': async () => (await import('./topics/fermat-little')).fermatLittle,
  'prob.inclusion-exclusion': async () => (await import('./topics/inclusion-exclusion')).inclusionExclusion,
  'prob.continuity': async () => (await import('./topics/continuity')).continuity,
  'prob.conditional-probability': async () => (await import('./topics/conditional-probability')).conditionalProbability,
  'prob.subadditivity': async () => (await import('./topics/subadditivity')).subadditivity,
  'prob.total-probability': async () => (await import('./topics/total-probability')).totalProbability,
  'prob.independence': async () => (await import('./topics/independence')).independence,
  'prob.bayes-formula': async () => (await import('./topics/bayes-formula')).bayesFormula,  // Batch 5: Part V, in book order
  'rv.expectation': async () => (await import('./topics/expectation')).expectation,
  'rv.tail-sum': async () => (await import('./topics/tail-sum')).tailSum,
  'comb.restricted-arrangements': async () => (await import('./topics/restricted-arrangements')).restrictedArrangements,
  'prob.first-step': async () => (await import('./topics/first-step')).firstStep,
  'pre.quadratic-equations': async () => (await import('./topics/quadratic-equations')).quadraticEquations,
  'rv.variance': async () => (await import('./topics/variance')).varianceTopic,
  'rv.pdf': async () => (await import('./topics/density-functions')).densityFunctions,
  'rv.continuous-summaries': async () => (await import('./topics/continuous-summaries')).continuousSummaries,
  'rv.cdf-method': async () => (await import('./topics/cdf-method')).cdfMethod,
  'prob.normal-distribution': async () => (await import('./topics/normal-distribution')).normalDistribution,
  'prob.normal-approximation': async () => (await import('./topics/normal-approximation')).normalApproximation,
  'rv.expectation-algebra': async () => (await import('./topics/expectation-algebra')).expectationAlgebra,
  'rv.indicators': async () => (await import('./topics/indicators')).indicators,
  'alg.arithmetico-geometric': async () => (await import('./topics/arithmetico-geometric')).arithmeticoGeometric,
  'prob.point-mass-spaces': async () => (await import('./topics/point-mass-spaces')).pointMassSpaces,
  'prob.geometric-distribution': async () => (await import('./topics/geometric-distribution')).geometricDistribution,
  'prob.poisson-distribution': async () => (await import('./topics/poisson-distribution')).poissonDistribution,
  'prob.poisson-binomial-limit': async () => (await import('./topics/poisson-binomial-limit')).poissonBinomialLimit,
  'prob.poisson-rates': async () => (await import('./topics/poisson-rates')).poissonRates,
  'rv.random-variables': async () => (await import('./topics/random-variables')).randomVariables,
  'rv.expectation-general': async () => (await import('./topics/expectation-general')).expectationGeneral,
  'rv.independence': async () => (await import('./topics/rv-independence')).rvIndependence,
  'rv.covariance': async () => (await import('./topics/covariance')).covariance,
  'rv.conditional-expectation': async () => (await import('./topics/conditional-expectation')).conditionalExpectation,
  'gf.pgf': async () => (await import('./topics/pgf')).pgf,
  'gf.random-sums': async () => (await import('./topics/random-sums')).randomSums,
  'gf.combinatorial': async () => (await import('./topics/counting-gf')).countingGf,
  'alg.linear-recurrences': async () => (await import('./topics/linear-recurrences')).linearRecurrences,
  'rw.gamblers-ruin': async () => (await import('./topics/gamblers-ruin')).gamblersRuin,
  'rw.absorption-time': async () => (await import('./topics/absorption-time')).absorptionTime,
  'bp.extinction': async () => (await import('./topics/extinction')).extinctionTopic,
  'prob.exponential-distribution': async () => (await import('./topics/exponential-distribution')).exponentialDistribution,
  'rv.joint-densities': async () => (await import('./topics/joint-densities')).jointDensities,
  'rv.transformations': async () => (await import('./topics/transformations')).transformations,
  'prob.geometric-probability': async () => (await import('./topics/geometric-probability')).geometricProbability,
  'rv.simulation': async () => (await import('./topics/simulation')).simulation,
  'rv.bivariate-normal': async () => (await import('./topics/bivariate-normal')).bivariateNormal,
  'ineq.markov-chebyshev': async () => (await import('./topics/markov-chebyshev')).markovChebyshev,
  'ineq.jensen': async () => (await import('./topics/jensen')).jensen,
  'lim.weak-law': async () => (await import('./topics/weak-law')).weakLaw,
  'gf.mgf': async () => (await import('./topics/mgf')).mgf,
  'lim.clt': async () => (await import('./topics/clt')).clt,
  // Preparation, group A: begin
  'alg.surds': async () => (await import('./topics/surds')).surds,
  'ineq.linear-quadratic': async () => (await import('./topics/linear-quadratic-inequalities')).linearQuadraticInequalities,
  'geom.straight-lines': async () => (await import('./topics/straight-lines')).straightLines,
  'fn.quadratic-graphs': async () => (await import('./topics/quadratic-graphs')).quadraticGraphs,
  'pre.primes-and-factors': async () => (await import('./topics/primes-and-factors')).primesAndFactors,
  'pre.remainders': async () => (await import('./topics/remainders')).remainders,
  'fn.floor-function': async () => (await import('./topics/floor-function')).floorFunction,
  'num.linear-diophantine': async () => (await import('./topics/linear-diophantine')).linearDiophantine,
  'alg.polynomials': async () => (await import('./topics/polynomials')).polynomials,
  'ineq.polynomial-regions': async () => (await import('./topics/polynomial-regions')).polynomialRegions,
  'alg.simultaneous-equations': async () => (await import('./topics/simultaneous-equations')).simultaneousEquations,
  'alg.exp-and-ln': async () => (await import('./topics/exp-and-ln')).expAndLn,
  'ineq.rational': async () => (await import('./topics/rational-inequalities')).rationalInequalities,
  'alg.roots-coefficients': async () => (await import('./topics/roots-coefficients')).rootsCoefficients,
  'pre.hcf-lcm': async () => (await import('./topics/hcf-lcm')).hcfLcm,
  'fn.functions': async () => (await import('./topics/functions')).functionsTopic,
  'alg.exponential-equations': async () => (await import('./topics/exponential-equations')).exponentialEquations,
  'alg.surd-equations': async () => (await import('./topics/surd-equations')).surdEquations,
  'alg.factorisations': async () => (await import('./topics/factorisations')).factorisations,
  'alg.partial-fractions': async () => (await import('./topics/partial-fractions')).partialFractions,
  'fn.modulus': async () => (await import('./topics/modulus')).modulus,
  'fn.modulus-regions': async () => (await import('./topics/modulus-regions')).modulusRegions,
  // Preparation, group A: end
  // Preparation, group C (begin)
  'calc.derivatives': async () => (await import('./topics/derivatives')).derivatives,
  'calc.stationary-points': async () => (await import('./topics/stationary-points')).stationaryPoints,
  'fn.rational-functions': async () => (await import('./topics/rational-functions')).rationalFunctions,
  'calc.curve-sketching': async () => (await import('./topics/curve-sketching')).curveSketching,
  'calc.convexity': async () => (await import('./topics/convexity')).convexity,
  'calc.inflection-points': async () => (await import('./topics/inflection-points')).inflectionPoints,
  'fn.graph-transformations': async () => (await import('./topics/graph-transformations')).graphTransformations,
  'calc.first-principles': async () => (await import('./topics/first-principles')).firstPrinciples,
  'calc.hyperbolic': async () => (await import('./topics/hyperbolic')).hyperbolic,
  'calc.differentiation-rules': async () => (await import('./topics/differentiation-rules')).differentiationRules,
  'an.exp-series': async () => (await import('./topics/exp-series')).expSeries,
  'calc.definite-integrals': async () => (await import('./topics/definite-integrals')).definiteIntegrals,
  'calc.integration-by-parts': async () => (await import('./topics/integration-by-parts')).integrationByParts,
  'calc.standard-integrals': async () => (await import('./topics/standard-integrals')).standardIntegrals,
  'calc.substitution': async () => (await import('./topics/substitution')).substitution,
  'calc.symmetry-integrals': async () => (await import('./topics/symmetry-integrals')).symmetryIntegrals,
  'calc.implicit-differentiation': async () => (await import('./topics/implicit-differentiation')).implicitDifferentiation,
  'calc.separable-odes': async () => (await import('./topics/separable-odes')).separableOdes,
  'calc.improper-integrals': async () => (await import('./topics/improper-integrals')).improperIntegrals,
  // Preparation, group C (end)
  // Preparation, group D
  'alg.geometric-sum-to-infinity': async () => (await import('./topics/geometric-sum-to-infinity')).geometricSumToInfinity,
  'sets.subsets': async () => (await import('./topics/subsets')).subsetsTopic,
  'sets.cartesian-product': async () => (await import('./topics/cartesian-product')).cartesianProduct,
  'sets.indexed': async () => (await import('./topics/indexed-sets')).indexedSets,
  'proof.set-proofs': async () => (await import('./topics/set-proofs')).setProofs,
  'proof.disproof': async () => (await import('./topics/disproof')).disproof,
  'proof.smallest-counterexample': async () => (await import('./topics/smallest-counterexample')).smallestCounterexample,
  'comb.permutations': async () => (await import('./topics/permutations')).permutations,
  'pre.mutually-exclusive': async () => (await import('./topics/mutually-exclusive')).mutuallyExclusive,
  'prob.addition-rule': async () => (await import('./topics/addition-rule')).additionRule,
  'ineq.am-gm': async () => (await import('./topics/am-gm')).amGm,
  'alg.fibonacci': async () => (await import('./topics/fibonacci')).fibonacci,
  'an.sequence-limits': async () => (await import('./topics/sequence-limits')).sequenceLimits,
  'alg.recurrence-sequences': async () => (await import('./topics/recurrence-sequences')).recurrenceSequences,
  'alg.telescoping': async () => (await import('./topics/telescoping')).telescoping,
  'alg.sums-of-powers': async () => (await import('./topics/sums-of-powers')).sumsOfPowers,
  'alg.binomial-rational': async () => (await import('./topics/binomial-rational')).binomialRational,
  'prob.discrete-distributions': async () => (await import('./topics/discrete-distributions')).discreteDistributions,
  'mat.matrices': async () => (await import('./topics/matrices')).matrices,
  // end Prep D
  // Preparation group E: functional programming 1, in book order
  'fp.expressions': async () => (await import('./topics/fp-expressions')).fpExpressions,
  'fp.functions': async () => (await import('./topics/fp-functions')).fpFunctions,
  'fp.recursion': async () => (await import('./topics/fp-recursion')).fpRecursion,
  'fp.lists': async () => (await import('./topics/fp-lists')).fpLists,
  'fp.polymorphism': async () => (await import('./topics/fp-polymorphism')).fpPolymorphism,
  'fp.records-tuples': async () => (await import('./topics/fp-records-tuples')).fpRecordsTuples,
  'fp.variants': async () => (await import('./topics/fp-variants')).fpVariants,
  'fp.exceptions': async () => (await import('./topics/fp-exceptions')).fpExceptions,
  'fp.trees': async () => (await import('./topics/fp-trees')).fpTrees,
  'fp.specifications-testing': async () => (await import('./topics/fp-specifications-testing')).fpSpecificationsTesting,
  'fp.equational-reasoning': async () => (await import('./topics/fp-equational-reasoning')).fpEquationalReasoning,
  'fp.structural-induction': async () => (await import('./topics/fp-structural-induction')).fpStructuralInduction,
  // Preparation, group F: functional programming 2, in book order
  'fp.higher-order': async () => (await import('./topics/higher-order')).higherOrder,
  'fp.map-filter-fold': async () => (await import('./topics/map-filter-fold')).mapFilterFold,
  'fp.complexity': async () => (await import('./topics/complexity')).complexity,
  'fp.modules': async () => (await import('./topics/modules')).modules,
  'fp.functional-queues': async () => (await import('./topics/functional-queues')).functionalQueues,
  'fp.functors': async () => (await import('./topics/functors')).functors,
  'fp.references': async () => (await import('./topics/references')).references,
  'fp.hash-tables': async () => (await import('./topics/hash-tables')).hashTables,
  'fp.binary-search-trees': async () => (await import('./topics/binary-search-trees')).binarySearchTrees,
  'fp.red-black-trees': async () => (await import('./topics/red-black-trees')).redBlackTrees,
  'fp.lazy-sequences': async () => (await import('./topics/lazy-sequences')).lazySequences,
  'fp.sorting': async () => (await import('./topics/sorting')).sorting,
  'fp.search': async () => (await import('./topics/search')).search,
  // Preparation, group B start
  'geom.euclidean-proof': async () => (await import('./topics/euclidean-proof')).euclideanProof,
  'trig.right-triangle': async () => (await import('./topics/right-triangle')).rightTriangle,
  'trig.sine-cosine-rules': async () => (await import('./topics/sine-cosine-rules')).sineCosineRules,
  'geom.3d-coordinates': async () => (await import('./topics/coordinates-3d')).coordinates3d,
  'geom.circles': async () => (await import('./topics/circles')).circles,
  'geom.intersections': async () => (await import('./topics/intersections')).intersections,
  'trig.compound-angles': async () => (await import('./topics/compound-angles')).compoundAngles,
  'trig.double-angle': async () => (await import('./topics/double-angle')).doubleAngle,
  'trig.radians-and-graphs': async () => (await import('./topics/radians-and-graphs')).radiansAndGraphs,
  'trig.equations': async () => (await import('./topics/trig-equations')).trigEquations,
  'trig.small-angles': async () => (await import('./topics/small-angles')).smallAngles,
  'geom.loci': async () => (await import('./topics/loci')).loci,
  'trig.reciprocal-functions': async () => (await import('./topics/reciprocal-functions')).reciprocalFunctions,
  'geom.vectors': async () => (await import('./topics/vectors')).vectors,
  'geom.vector-lines': async () => (await import('./topics/vector-lines')).vectorLines,
  'cx.complex-numbers': async () => (await import('./topics/complex-numbers')).complexNumbers,
  // Preparation, group B end
};

/** Every topic with content, in the order of `TOPIC_CONTENT`. */
export const CONTENT_IDS: readonly string[] = Object.keys(CATALOG);

/** Whether a topic's lesson and problems are written, without loading them. */
export function hasContent(topicId: string): boolean {
  return Object.hasOwn(CATALOG, topicId);
}

/** A topic's content, downloaded on first use; undefined when it is not written. A failed download rejects. */
export function loadTopicContent(topicId: string): Promise<TopicContent | undefined> {
  const load = Object.hasOwn(TOPIC_LOADERS, topicId) ? TOPIC_LOADERS[topicId] : undefined;
  return load === undefined ? Promise.resolve(undefined) : load();
}

/** A Cambridge problem's title (plain text) and mode, by topic and problem id, without loading the topic. */
export function catalogProblem(topicId: string, problemId: string): CatalogProblem | undefined {
  if (!Object.hasOwn(CATALOG, topicId)) return undefined;
  return CATALOG[topicId]?.find((p) => p.id === problemId);
}

/**
 * A topic's gate problem ids (`TopicContent.gate`), in the order of its Cambridge problems,
 * without loading the topic; empty for a topic without content or without a gate problem.
 */
export function gateOf(topicId: string): readonly string[] {
  if (!Object.hasOwn(CATALOG, topicId)) return [];
  return (CATALOG[topicId] ?? []).filter((p) => p.gate).map((p) => p.id);
}

export type { CatalogProblem };
