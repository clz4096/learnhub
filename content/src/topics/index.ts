/** Every topic with content, keyed by its graph id. One file per topic. */
import type { TopicContent } from '../topic';
import { algebraicArgument } from './algebraic-argument';
import { algebraicManipulation } from './algebraic-manipulation';
import { arithmeticSeries } from './arithmetic-series';
import { axiomConsequences } from './axiom-consequences';
import { axioms } from './axioms';
import { bayesFormula } from './bayes-formula';
import { bayesTwoEvents } from './bayes-two-events';
import { binomialDistribution } from './binomial-distribution';
import { binomialIdentities } from './binomial-identities';
import { binomialTheorem } from './binomial-theorem';
import { binomialTheoremProof } from './binomial-theorem-proof';
import { classicalProbability } from './classical-probability';
import { combinations } from './combinations';
import { conditionalFormula } from './conditional-formula';
import { conditionalProbability } from './conditional-probability';
import { congruence } from './congruence';
import { connectives } from './connectives';
import { continuity } from './continuity';
import { contradiction } from './contradiction';
import { contrapositive } from './contrapositive';
import { countableUnions } from './countable-unions';
import { counterexample } from './counterexample';
import { countingProbability } from './counting-probability';
import { diffieHellman } from './diffie-hellman';
import { directProof } from './direct-proof';
import { divisibility } from './divisibility';
import { divisionTheorem } from './division-theorem';
import { equivalences } from './equivalences';
import { euclidAlgorithm } from './euclid-algorithm';
import { euclidTheorem } from './euclid-theorem';
import { eventSpaces } from './event-spaces';
import { extendedEuclid } from './extended-euclid';
import { factorialTopic } from './factorial';
import { fermatLittle } from './fermat-little';
import { fractions } from './fractions';
import { fundamentalTheorem } from './fundamental-theorem';
import { gcdTopic } from './gcd';
import { geometricSeries } from './geometric-series';
import { iff } from './iff';
import { implication } from './implication';
import { inclusionExclusion } from './inclusion-exclusion';
import { inclusionExclusionThree } from './inclusion-exclusion-three';
import { independence } from './independence';
import { independentEvents } from './independent-events';
import { indices } from './indices';
import { infinitelyManyPrimes } from './infinitely-many-primes';
import { modularArithmetic } from './modular-arithmetic';
import { modularExponentiation } from './modular-exponentiation';
import { modularIntegers } from './modular-integers';
import { modularInverse } from './modular-inverse';
import { negatingQuantifiers } from './negating-quantifiers';
import { nestedQuantifiers } from './nested-quantifiers';
import { numberSystems } from './number-systems';
import { pigeonhole } from './pigeonhole';
import { primeBinomial } from './prime-binomial';
import { primeFactorisation } from './prime-factorisation';
import { probabilityScale } from './probability-scale';
import { productRule } from './product-rule';
import { proofByInduction } from './proof-by-induction';
import { proofCases } from './proof-cases';
import { quantifierPatterns } from './quantifier-patterns';
import { quantifiers } from './quantifiers';
import { repeatedArrangements } from './repeated-arrangements';
import { sampleSpaces } from './sample-spaces';
import { samplingModels } from './sampling-models';
import { sequences } from './sequences';
import { setBuilder } from './set-builder';
import { setNotation } from './set-notation';
import { sigmaNotation } from './sigma-notation';
import { stirlingFormula } from './stirling-formula';
import { strongInduction } from './strong-induction';
import { subadditivity } from './subadditivity';
import { totalProbability } from './total-probability';
import { treeDiagrams } from './tree-diagrams';
import { twoWayTables } from './two-way-tables';

/**
 * The first ten topics the engine schedules for a learner who places at nothing and takes
 * both courses at the even split (gate 3), in that order; then the new topics of Cambridge
 * batch 1 (graph/reviews/cambridge-batch-1.md); then batches 2 to 4: the topics the batch 1
 * map cites sources for, in the order the engine schedules them for the same learner. The app
 * loads each topic on demand through load.ts; keep the two lists in the same order.
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
];
