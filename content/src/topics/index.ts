/** Every topic with content, keyed by its graph id. One file per topic. */
import type { TopicContent } from '../topic';
import { algebraicManipulation } from './algebraic-manipulation';
import { bayesTwoEvents } from './bayes-two-events';
import { connectives } from './connectives';
import { eventSpaces } from './event-spaces';
import { factorialTopic } from './factorial';
import { fractions } from './fractions';
import { indices } from './indices';
import { pigeonhole } from './pigeonhole';
import { probabilityScale } from './probability-scale';
import { productRule } from './product-rule';
import { sequences } from './sequences';
import { setBuilder } from './set-builder';
import { setNotation } from './set-notation';

/**
 * The first ten topics the engine schedules for a learner who places at nothing and takes
 * both courses at the even split (gate 3), in that order; then the new topics of Cambridge
 * batch 1 (graph/reviews/cambridge-batch-1.md).
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
];
