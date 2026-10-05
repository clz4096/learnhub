/**
 * Topic content on demand. Each topic module is its own dynamic import, so a bundler puts
 * every lesson in a chunk of its own and the app downloads a lesson only when it opens
 * it. What the app needs about all topics at once (which have content, the titles of
 * their Cambridge problems) is in the generated catalog, which loads no lesson.
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

export type { CatalogProblem };
