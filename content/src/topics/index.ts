/** Every topic with content, keyed by its graph id. One file per topic. */
import type { TopicContent } from '../topic';
import { algebraicArgument } from './algebraic-argument';
import { algebraicManipulation } from './algebraic-manipulation';
import { arithmeticSeries } from './arithmetic-series';
import { bayesTwoEvents } from './bayes-two-events';
import { binomialIdentities } from './binomial-identities';
import { combinations } from './combinations';
import { connectives } from './connectives';
import { countableUnions } from './countable-unions';
import { directProof } from './direct-proof';
import { eventSpaces } from './event-spaces';
import { factorialTopic } from './factorial';
import { fractions } from './fractions';
import { geometricSeries } from './geometric-series';
import { iff } from './iff';
import { implication } from './implication';
import { indices } from './indices';
import { nestedQuantifiers } from './nested-quantifiers';
import { numberSystems } from './number-systems';
import { pigeonhole } from './pigeonhole';
import { primeFactorisation } from './prime-factorisation';
import { probabilityScale } from './probability-scale';
import { productRule } from './product-rule';
import { quantifiers } from './quantifiers';
import { sampleSpaces } from './sample-spaces';
import { sequences } from './sequences';
import { setBuilder } from './set-builder';
import { setNotation } from './set-notation';
import { sigmaNotation } from './sigma-notation';
import { treeDiagrams } from './tree-diagrams';

/**
 * The first ten topics the engine schedules for a learner who places at nothing and takes
 * both courses at the even split (gate 3), in that order; then the new topics of Cambridge
 * batch 1 (graph/reviews/cambridge-batch-1.md); then batch 2: the topics the batch 1 map
 * cites sources for, in the order the engine schedules them for the same learner.
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
];
