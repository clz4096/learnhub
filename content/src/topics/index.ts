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
];
