/** Every topic with content, keyed by its graph id. One file per topic. */
import type { TopicContent } from '../topic';
import { absorptionTime } from './absorption-time';
import { algebraicArgument } from './algebraic-argument';
import { algebraicManipulation } from './algebraic-manipulation';
import { arithmeticSeries } from './arithmetic-series';
import { arithmeticoGeometric } from './arithmetico-geometric';
import { axiomConsequences } from './axiom-consequences';
import { axioms } from './axioms';
import { bayesFormula } from './bayes-formula';
import { bayesTwoEvents } from './bayes-two-events';
import { binomialDistribution } from './binomial-distribution';
import { binomialIdentities } from './binomial-identities';
import { binomialTheorem } from './binomial-theorem';
import { binomialTheoremProof } from './binomial-theorem-proof';
import { bivariateNormal } from './bivariate-normal';
import { cdfMethod } from './cdf-method';
import { classicalProbability } from './classical-probability';
import { clt } from './clt';
import { combinations } from './combinations';
import { conditionalExpectation } from './conditional-expectation';
import { conditionalFormula } from './conditional-formula';
import { conditionalProbability } from './conditional-probability';
import { congruence } from './congruence';
import { connectives } from './connectives';
import { continuity } from './continuity';
import { continuousSummaries } from './continuous-summaries';
import { contradiction } from './contradiction';
import { contrapositive } from './contrapositive';
import { countableUnions } from './countable-unions';
import { counterexample } from './counterexample';
import { countingGf } from './counting-gf';
import { countingProbability } from './counting-probability';
import { covariance } from './covariance';
import { densityFunctions } from './density-functions';
import { diffieHellman } from './diffie-hellman';
import { directProof } from './direct-proof';
import { divisibility } from './divisibility';
import { divisionTheorem } from './division-theorem';
import { equivalences } from './equivalences';
import { euclidAlgorithm } from './euclid-algorithm';
import { euclidTheorem } from './euclid-theorem';
import { eventSpaces } from './event-spaces';
import { expectation } from './expectation';
import { expectationAlgebra } from './expectation-algebra';
import { expectationGeneral } from './expectation-general';
import { exponentialDistribution } from './exponential-distribution';
import { extendedEuclid } from './extended-euclid';
import { extinctionTopic } from './extinction';
import { factorialTopic } from './factorial';
import { fermatLittle } from './fermat-little';
import { firstStep } from './first-step';
import { fractions } from './fractions';
// Preparation group E: functional programming 1
import { fpExpressions } from './fp-expressions';
import { fpFunctions } from './fp-functions';
import { fpRecursion } from './fp-recursion';
import { fpLists } from './fp-lists';
import { fpPolymorphism } from './fp-polymorphism';
import { fpRecordsTuples } from './fp-records-tuples';
import { fpVariants } from './fp-variants';
import { fpExceptions } from './fp-exceptions';
import { fpTrees } from './fp-trees';
import { fpSpecificationsTesting } from './fp-specifications-testing';
import { fpEquationalReasoning } from './fp-equational-reasoning';
import { fpStructuralInduction } from './fp-structural-induction';
// End of Preparation group E imports
import { fundamentalTheorem } from './fundamental-theorem';
import { gamblersRuin } from './gamblers-ruin';
import { gcdTopic } from './gcd';
import { geometricDistribution } from './geometric-distribution';
import { geometricProbability } from './geometric-probability';
import { geometricSeries } from './geometric-series';
import { iff } from './iff';
import { implication } from './implication';
import { inclusionExclusion } from './inclusion-exclusion';
import { inclusionExclusionThree } from './inclusion-exclusion-three';
import { independence } from './independence';
import { independentEvents } from './independent-events';
import { indicators } from './indicators';
import { indices } from './indices';
import { infinitelyManyPrimes } from './infinitely-many-primes';
import { jensen } from './jensen';
import { jointDensities } from './joint-densities';
import { linearRecurrences } from './linear-recurrences';
import { markovChebyshev } from './markov-chebyshev';
import { mgf } from './mgf';
import { modularArithmetic } from './modular-arithmetic';
import { modularExponentiation } from './modular-exponentiation';
import { modularIntegers } from './modular-integers';
import { modularInverse } from './modular-inverse';
import { negatingQuantifiers } from './negating-quantifiers';
import { nestedQuantifiers } from './nested-quantifiers';
import { normalApproximation } from './normal-approximation';
import { normalDistribution } from './normal-distribution';
import { numberSystems } from './number-systems';
import { pgf } from './pgf';
import { pigeonhole } from './pigeonhole';
import { pointMassSpaces } from './point-mass-spaces';
import { poissonBinomialLimit } from './poisson-binomial-limit';
import { poissonDistribution } from './poisson-distribution';
import { poissonRates } from './poisson-rates';
import { primeBinomial } from './prime-binomial';
import { primeFactorisation } from './prime-factorisation';
import { probabilityScale } from './probability-scale';
import { productRule } from './product-rule';
import { proofByInduction } from './proof-by-induction';
import { proofCases } from './proof-cases';
import { quadraticEquations } from './quadratic-equations';
import { quantifierPatterns } from './quantifier-patterns';
import { quantifiers } from './quantifiers';
import { randomSums } from './random-sums';
import { randomVariables } from './random-variables';
import { repeatedArrangements } from './repeated-arrangements';
import { restrictedArrangements } from './restricted-arrangements';
import { rvIndependence } from './rv-independence';
import { sampleSpaces } from './sample-spaces';
import { samplingModels } from './sampling-models';
import { sequences } from './sequences';
import { setBuilder } from './set-builder';
import { setNotation } from './set-notation';
import { sigmaNotation } from './sigma-notation';
import { simulation } from './simulation';
import { stirlingFormula } from './stirling-formula';
import { strongInduction } from './strong-induction';
import { subadditivity } from './subadditivity';
import { tailSum } from './tail-sum';
import { totalProbability } from './total-probability';
import { transformations } from './transformations';
import { treeDiagrams } from './tree-diagrams';
import { twoWayTables } from './two-way-tables';
import { varianceTopic } from './variance';
import { weakLaw } from './weak-law';
// Preparation, group C imports (begin)
import { derivatives } from './derivatives';
import { stationaryPoints } from './stationary-points';
import { rationalFunctions } from './rational-functions';
import { curveSketching } from './curve-sketching';
import { convexity } from './convexity';
import { inflectionPoints } from './inflection-points';
import { graphTransformations } from './graph-transformations';
import { firstPrinciples } from './first-principles';
import { hyperbolic } from './hyperbolic';
import { differentiationRules } from './differentiation-rules';
import { expSeries } from './exp-series';
import { definiteIntegrals } from './definite-integrals';
import { integrationByParts } from './integration-by-parts';
import { standardIntegrals } from './standard-integrals';
import { substitution } from './substitution';
import { symmetryIntegrals } from './symmetry-integrals';
import { implicitDifferentiation } from './implicit-differentiation';
import { separableOdes } from './separable-odes';
import { improperIntegrals } from './improper-integrals';
// Preparation, group C imports (end)
// Prep D imports
import { geometricSumToInfinity } from './geometric-sum-to-infinity';
import { subsetsTopic } from './subsets';
import { cartesianProduct } from './cartesian-product';
import { indexedSets } from './indexed-sets';
import { setProofs } from './set-proofs';
import { disproof } from './disproof';
import { smallestCounterexample } from './smallest-counterexample';
import { permutations } from './permutations';
import { mutuallyExclusive } from './mutually-exclusive';
import { additionRule } from './addition-rule';
import { amGm } from './am-gm';
import { fibonacci } from './fibonacci';
import { sequenceLimits } from './sequence-limits';
import { recurrenceSequences } from './recurrence-sequences';
import { telescoping } from './telescoping';
import { sumsOfPowers } from './sums-of-powers';
import { binomialRational } from './binomial-rational';
import { discreteDistributions } from './discrete-distributions';
import { matrices } from './matrices';
// end Prep D imports
// Preparation, group F: functional programming 2
import { higherOrder } from './higher-order';
import { mapFilterFold } from './map-filter-fold';
import { complexity } from './complexity';
import { modules } from './modules';
import { functionalQueues } from './functional-queues';
import { functors } from './functors';
import { references } from './references';
import { hashTables } from './hash-tables';
import { binarySearchTrees } from './binary-search-trees';
import { redBlackTrees } from './red-black-trees';
import { lazySequences } from './lazy-sequences';
import { sorting } from './sorting';
import { search } from './search';

// Preparation, group A: begin
import { surds } from './surds';
import { linearQuadraticInequalities } from './linear-quadratic-inequalities';
import { straightLines } from './straight-lines';
import { quadraticGraphs } from './quadratic-graphs';
import { primesAndFactors } from './primes-and-factors';
import { remainders } from './remainders';
import { floorFunction } from './floor-function';
import { linearDiophantine } from './linear-diophantine';
import { polynomials } from './polynomials';
import { polynomialRegions } from './polynomial-regions';
import { simultaneousEquations } from './simultaneous-equations';
import { expAndLn } from './exp-and-ln';
import { rationalInequalities } from './rational-inequalities';
import { rootsCoefficients } from './roots-coefficients';
import { hcfLcm } from './hcf-lcm';
import { functionsTopic } from './functions';
import { exponentialEquations } from './exponential-equations';
import { surdEquations } from './surd-equations';
import { factorisations } from './factorisations';
import { partialFractions } from './partial-fractions';
import { modulus } from './modulus';
import { modulusRegions } from './modulus-regions';
// Preparation, group A: end
// Preparation group B imports start
import { euclideanProof } from './euclidean-proof';
import { rightTriangle } from './right-triangle';
import { sineCosineRules } from './sine-cosine-rules';
import { coordinates3d } from './coordinates-3d';
import { circles } from './circles';
import { intersections } from './intersections';
import { compoundAngles } from './compound-angles';
import { doubleAngle } from './double-angle';
import { radiansAndGraphs } from './radians-and-graphs';
import { trigEquations } from './trig-equations';
import { smallAngles } from './small-angles';
import { loci } from './loci';
import { reciprocalFunctions } from './reciprocal-functions';
import { vectors } from './vectors';
import { vectorLines } from './vector-lines';
import { complexNumbers } from './complex-numbers';
// Preparation group B imports end
/**
 * The first ten topics the engine schedules for a learner who places at nothing and takes
 * both courses at the even split (gate 3), in that order; then the new topics of Cambridge
 * batch 1 (graph/reviews/cambridge-batch-1.md); then batches 2 to 4: the topics the batch 1
 * map cites sources for, in the order the engine schedules them for the same learner; then
 * batch 5: the Part V topics of Cambridge batch 2 (graph/reviews/cambridge-batch-2.md), which
 * are not course targets yet, in book order (book/book.ts). The app loads each topic on demand
 * through load.ts; keep the two lists in the same order.
 */
export const TOPIC_CONTENT: readonly TopicContent[] = [
  fractions,
  setNotation,
  productRule,
  connectives,
  algebraicManipulation,
  setBuilder,
  factorialTopic,
  indices,
  sequences,
  probabilityScale,
  pigeonhole,
  bayesTwoEvents,
  eventSpaces,
  // Batch 2
  sampleSpaces,
  implication,
  primeFactorisation,
  treeDiagrams,
  algebraicArgument,
  numberSystems,
  sigmaNotation,
  combinations,
  countableUnions,
  iff,
  quantifiers,
  directProof,
  arithmeticSeries,
  nestedQuantifiers,
  geometricSeries,
  binomialIdentities,
  // Batch 3
  twoWayTables,
  binomialTheorem,
  equivalences,
  proofCases,
  negatingQuantifiers,
  counterexample,
  contradiction,
  repeatedArrangements,
  proofByInduction,
  countingProbability,
  contrapositive,
  independentEvents,
  inclusionExclusionThree,
  quantifierPatterns,
  classicalProbability,
  infinitelyManyPrimes,
  // Batch 4
  binomialTheoremProof,
  strongInduction,
  divisibility,
  conditionalFormula,
  divisionTheorem,
  binomialDistribution,
  congruence,
  gcdTopic,
  modularArithmetic,
  euclidAlgorithm,
  samplingModels,
  modularIntegers,
  modularExponentiation,
  extendedEuclid,
  euclidTheorem,
  diffieHellman,
  stirlingFormula,
  modularInverse,
  axioms,
  fundamentalTheorem,
  axiomConsequences,
  primeBinomial,
  fermatLittle,
  inclusionExclusion,
  continuity,
  conditionalProbability,
  subadditivity,
  totalProbability,
  independence,
  bayesFormula,
  // Batch 5: Part V, in book order (not course targets yet)
  expectation,
  tailSum,
  restrictedArrangements,
  firstStep,
  quadraticEquations,
  varianceTopic,
  densityFunctions,
  continuousSummaries,
  cdfMethod,
  normalDistribution,
  normalApproximation,
  expectationAlgebra,
  indicators,
  arithmeticoGeometric,
  pointMassSpaces,
  geometricDistribution,
  poissonDistribution,
  poissonBinomialLimit,
  poissonRates,
  randomVariables,
  expectationGeneral,
  rvIndependence,
  covariance,
  conditionalExpectation,
  pgf,
  randomSums,
  countingGf,
  linearRecurrences,
  gamblersRuin,
  absorptionTime,
  extinctionTopic,
  exponentialDistribution,
  jointDensities,
  transformations,
  geometricProbability,
  simulation,
  bivariateNormal,
  markovChebyshev,
  jensen,
  weakLaw,
  mgf,
  clt,
  // Preparation, group A: begin
  surds,
  linearQuadraticInequalities,
  straightLines,
  quadraticGraphs,
  primesAndFactors,
  remainders,
  floorFunction,
  linearDiophantine,
  polynomials,
  polynomialRegions,
  simultaneousEquations,
  expAndLn,
  rationalInequalities,
  rootsCoefficients,
  hcfLcm,
  functionsTopic,
  exponentialEquations,
  surdEquations,
  factorisations,
  partialFractions,
  modulus,
  modulusRegions,
  // Preparation, group A: end
  // Preparation, group C (begin)
  derivatives,
  stationaryPoints,
  rationalFunctions,
  curveSketching,
  convexity,
  inflectionPoints,
  graphTransformations,
  firstPrinciples,
  hyperbolic,
  differentiationRules,
  expSeries,
  definiteIntegrals,
  integrationByParts,
  standardIntegrals,
  substitution,
  symmetryIntegrals,
  implicitDifferentiation,
  separableOdes,
  improperIntegrals,
  // Preparation, group C (end)
  // Preparation, group D: sequences, series, sets, and proof, in book order
  geometricSumToInfinity,
  subsetsTopic,
  cartesianProduct,
  indexedSets,
  setProofs,
  disproof,
  smallestCounterexample,
  permutations,
  mutuallyExclusive,
  additionRule,
  amGm,
  fibonacci,
  sequenceLimits,
  recurrenceSequences,
  telescoping,
  sumsOfPowers,
  binomialRational,
  discreteDistributions,
  matrices,
  // end Prep D
  // Preparation group E: functional programming 1, in book order
  fpExpressions,
  fpFunctions,
  fpRecursion,
  fpLists,
  fpPolymorphism,
  fpRecordsTuples,
  fpVariants,
  fpExceptions,
  fpTrees,
  fpSpecificationsTesting,
  fpEquationalReasoning,
  fpStructuralInduction,
  // Preparation, group F: functional programming 2, in book order
  higherOrder,
  mapFilterFold,
  complexity,
  modules,
  functionalQueues,
  functors,
  references,
  hashTables,
  binarySearchTrees,
  redBlackTrees,
  lazySequences,
  sorting,
  search,
  // Preparation, group B start
  euclideanProof,
  rightTriangle,
  sineCosineRules,
  coordinates3d,
  circles,
  intersections,
  compoundAngles,
  doubleAngle,
  radiansAndGraphs,
  trigEquations,
  smallAngles,
  loci,
  reciprocalFunctions,
  vectors,
  vectorLines,
  complexNumbers,
  // Preparation, group B end
];
