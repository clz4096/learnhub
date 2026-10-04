/**
 * Adaptive placement: find what the learner already knows in few questions.
 *
 * Knowing a topic implies knowing its prerequisites, so a correct answer classifies the
 * topic and every ancestor as known, and a wrong answer classifies the topic and every
 * descendant as unknown. Each probe is the topic that best splits what is still
 * unclassified, which is binary search generalized to the graph: it moves down after a
 * miss, all the way to the pre-A-level roots, and up into the Tripos after hits. The
 * probstats review plan (graph/reviews/probstats-slice.md: start at the top of the STEP layer) is the `entry-points`
 * strategy; it placed fewer simulated learners exactly, so it is not the default.
 *
 * The state is just the list of answers; every function recomputes from it, so the state
 * serializes trivially and a resumed test picks up where it stopped.
 *
 * Only `probeable` topics are asked about (design decisions 11 and 18: a course without a
 * real problem for a topic cannot measure it, and nothing is taken on the learner's word).
 * The others are never probed, are classified as not known from the start, and no answer
 * spreads to them. Answers still spread through them: a correct answer credits every
 * probeable ancestor, however many unprobeable topics lie in between, since the ancestor
 * relation is transitive. So placement runs on the probeable topics ordered by the
 * graph's ancestor relation, and every count below (the budget, the exactness
 * measurements) is over the probeable topics. With every topic probeable, the default,
 * nothing changes.
 */
import { courseTopics, type Targets } from './course';
import { withDefaults } from './options';
import { LEVELS, ancestors, descendants, frontier, topoOrder, type Level, type Topic } from './graph';

export interface PlacementAnswer {
  topicId: string;
  correct: boolean;
  /** When it was answered, ms since the epoch. */
  at: number;
}

export type Classification = 'known' | 'unknown' | 'unclassified';

export type PlacementStrategy = 'split' | 'entry-points';

export interface PlacementOptions {
  /** Questions before placement stops. Default `placementBudget` of the closure size. */
  budget: number;
  strategy: PlacementStrategy;
}

export interface PlacementGraphOptions {
  /** The course: placement covers these and their ancestors only. Default every topic. */
  targets?: Targets;
  /** Entry points are the highest topics at or below this level on each branch. */
  entryLevel?: Level;
  /**
   * Topics placement may ask about, for example those with a real problem written. The
   * rest are never probed and stay not known. Default every topic.
   */
  probeable?: (topicId: string) => boolean;
}

export const DEFAULT_ENTRY_LEVEL: Level = 'step';

/**
 * 30 questions. Measured on the probstats graph with truthful simulated learners: every
 * one was placed exactly within 27 questions, and 89% within 25 (the rest under-placed,
 * never over-placed). The design asked for about 25; 30 buys exactness for 5 more
 * questions. `split` is the default because it places more learners exactly than
 * starting at the entry points (see `bestSplit` and placement.test.ts).
 */
export const DEFAULT_PLACEMENT_OPTIONS: Readonly<PlacementOptions> = { budget: 30, strategy: 'split' };

/**
 * The default budget for `size` probeable topics (the whole closure when every topic is
 * probeable): one question per two topics, and never fewer than the 30 measured on the
 * probstats slice (60 topics), so a single course of that size keeps 30. Capped at `size`,
 * since each question classifies at least the topic it asks about and only unclassified
 * topics are asked: placement can never ask more, so a larger cap would only overstate
 * the length of the test (10 probeable topics take at most 10 questions, not 30).
 *
 * A fixed 30 placed only 45% of truthful simulated learners exactly over both courses at
 * once (98 topics, owner decision on CST review call 12). Measured on 1,000 truthful
 * learners, split strategy: the 98-topic union needs 40 for 100% exact (38 gives 97.5%),
 * so ceil(98 / 2) = 49 leaves 9 questions of margin. Discrete Mathematics alone (51
 * topics) needs 20 and gets 30. The budget is only a cap: a truthful learner stops as
 * soon as every topic is classified (32.7 questions on average over both courses), so
 * the margin costs a learner nothing unless their answers contradict each other. Those
 * measurements had every topic probeable; with fewer, they hold for the probeable
 * topics, ordered by ancestry in the full graph.
 */
export function placementBudget(size: number): number {
  return Math.min(Math.max(0, size), Math.max(DEFAULT_PLACEMENT_OPTIONS.budget, Math.ceil(size / 2)));
}

/** Precomputed ancestor and descendant sets over the course closure; placement asks for them on every step. */
export interface PlacementGraph {
  /** The course closure, in graph order. */
  topics: readonly Topic[];
  order: readonly string[];
  rank: ReadonlyMap<string, number>;
  anc: ReadonlyMap<string, ReadonlySet<string>>;
  desc: ReadonlyMap<string, ReadonlySet<string>>;
  entries: readonly string[];
  /** The topics placement may ask about, a subset of `order`. Placement sizes, budgets, and measurements count these. */
  probeable: ReadonlySet<string>;
}

/**
 * Placement works on the course closure only: a topic outside it is never probed or
 * classified. The closure is ancestor-closed, so a correct answer's ancestors are all in
 * it, and restricting descendants to it is exactly "descendants within this course".
 * Throws if the graph has a cycle (validate first) or a target is unknown.
 */
export function placementGraph(all: readonly Topic[], options: PlacementGraphOptions = {}): PlacementGraph {
  const topics = courseTopics(all, options.targets);
  const entryLevel = options.entryLevel ?? DEFAULT_ENTRY_LEVEL;
  const order = topoOrder(topics);
  const rank = new Map(order.map((id, i) => [id, i] as const));
  const anc = new Map(order.map((id) => [id, ancestors(topics, id)] as const));
  const desc = new Map(order.map((id) => [id, descendants(topics, id)] as const));
  const probeable = new Set(options.probeable === undefined ? order : order.filter(options.probeable));
  const entries = entryPoints(topics, entryLevel, anc, desc, rank, probeable);
  return { topics, order, rank, anc, desc, entries, probeable };
}

/** The default budget for this graph: `placementBudget` of its probeable topics. */
export function graphBudget(g: PlacementGraph): number {
  return placementBudget(g.probeable.size);
}

/**
 * Probeable topics at or below `entryLevel` with no probeable descendant at or below it:
 * the highest point of that layer on each branch that placement can ask about. Ordered by how many topics a correct answer credits, largest
 * first, ties by topological order.
 */
function entryPoints(
  topics: readonly Topic[],
  entryLevel: Level,
  anc: ReadonlyMap<string, ReadonlySet<string>>,
  desc: ReadonlyMap<string, ReadonlySet<string>>,
  rank: ReadonlyMap<string, number>,
  probeable: ReadonlySet<string>,
): string[] {
  const cap = LEVELS.indexOf(entryLevel);
  const levelOf = new Map(topics.map((t) => [t.id, LEVELS.indexOf(t.level)] as const));
  const low = (id: string): boolean => probeable.has(id) && (levelOf.get(id) ?? Infinity) <= cap;
  return topics
    .map((t) => t.id)
    .filter((id) => low(id) && ![...(desc.get(id) ?? [])].some(low))
    .sort((a, b) => (anc.get(b)?.size ?? 0) - (anc.get(a)?.size ?? 0) || (rank.get(a) ?? 0) - (rank.get(b) ?? 0));
}

/**
 * Replays answers in order; each one overrides earlier answers on the topics it covers.
 * That keeps the known set closed under ancestors and the unknown set closed under
 * descendants, among probeable topics, even when noisy answers contradict each other.
 * Topics that are not probeable are 'unknown' whatever the answers. Answers about ids not
 * in the graph, or not probeable, are ignored.
 */
export function classify(g: PlacementGraph, answers: readonly PlacementAnswer[]): Map<string, Classification> {
  const c = new Map<string, Classification>(g.order.map((id) => [id, g.probeable.has(id) ? 'unclassified' : 'unknown'] as const));
  for (const a of answers) {
    if (!g.probeable.has(a.topicId)) continue;
    const status: Classification = a.correct ? 'known' : 'unknown';
    const spread = a.correct ? g.anc.get(a.topicId) : g.desc.get(a.topicId);
    c.set(a.topicId, status);
    for (const id of spread ?? []) if (g.probeable.has(id)) c.set(id, status);
  }
  return c;
}

/**
 * The topic in `candidates` whose answer best balances the two outcomes: `up` is how many
 * candidates a correct answer classifies (the topic and its candidate ancestors), `down`
 * how many a wrong one does. The score is min(up, down) / max(up, down); on a chain the
 * midpoint wins, so this is binary search generalized to the graph. Ties go to the larger
 * up + down, then to topological order.
 *
 * Balance beat min(up, down), the harmonic mean, and the geometric mean in measurement:
 * at 25 questions it placed 89% of truthful simulated learners exactly against 75 to 82%
 * for the others, on the probstats graph (graph/src/placement.test.ts and graph/SIMULATION.md).
 */
function bestSplit(g: PlacementGraph, candidates: ReadonlySet<string>): string | null {
  let best: string | null = null;
  let bestScore = -1;
  let bestSum = -1;
  for (const id of g.order) {
    if (!candidates.has(id)) continue;
    let up = 1;
    let down = 1;
    for (const a of g.anc.get(id) ?? []) if (candidates.has(a)) up++;
    for (const d of g.desc.get(id) ?? []) if (candidates.has(d)) down++;
    const score = Math.min(up, down) / Math.max(up, down);
    if (score > bestScore || (score === bestScore && up + down > bestSum)) {
      best = id;
      bestScore = score;
      bestSum = up + down;
    }
  }
  return best;
}

/**
 * The next topic to probe, or null when placement is done (everything classified, or the
 * budget spent).
 *
 * `split`: always the best split of everything still unclassified.
 * `entry-points`: the probstats review plan. First, after a miss, the best split of the
 * unclassified ancestors of the latest miss that still has some, since the gap is down
 * that branch; then unclassified entry points in order; then the best split of the rest.
 */
export function nextProbe(
  g: PlacementGraph,
  answers: readonly PlacementAnswer[],
  options?: Partial<PlacementOptions>,
): string | null {
  const opts = withDefaults({ ...DEFAULT_PLACEMENT_OPTIONS, budget: graphBudget(g) }, options);
  if (answers.length >= opts.budget) return null;
  const c = classify(g, answers);
  const open = (id: string): boolean => c.get(id) === 'unclassified';

  if (opts.strategy === 'entry-points') {
    for (let i = answers.length - 1; i >= 0; i--) {
      const a = answers[i] as PlacementAnswer;
      if (a.correct || !c.has(a.topicId)) continue;
      const region = new Set([...(g.anc.get(a.topicId) ?? [])].filter(open));
      if (region.size > 0) return bestSplit(g, region);
    }
    const entry = g.entries.find(open);
    if (entry !== undefined) return entry;
  }

  return bestSplit(g, new Set(g.order.filter(open)));
}

export interface PlacementResult {
  /** Known topics, topological order. Closed under ancestors. */
  mastered: string[];
  /** Topics ready to learn given `mastered`. */
  frontier: string[];
  /** Probeable topics left unclassified when the budget ran out; treated as not known. */
  unclassified: string[];
  /** Topics that are not probeable, so never asked about and not known. Topological order. */
  notProbed: string[];
  questions: number;
}

/**
 * The placement outcome. Unclassified topics count as not known: teaching a topic the
 * learner knows costs one lesson, while skipping one they do not know breaks everything
 * above it.
 */
export function placementResult(g: PlacementGraph, answers: readonly PlacementAnswer[]): PlacementResult {
  const c = classify(g, answers);
  const mastered = g.order.filter((id) => c.get(id) === 'known');
  return {
    mastered,
    frontier: frontier(g.topics, new Set(mastered)),
    unclassified: g.order.filter((id) => c.get(id) === 'unclassified'),
    notProbed: g.order.filter((id) => !g.probeable.has(id)),
    questions: answers.length,
  };
}

/**
 * Runs placement to completion against an answering function. For simulations and tests;
 * the UI drives `nextProbe` one question at a time instead.
 */
export function runPlacement(
  g: PlacementGraph,
  answer: (topicId: string) => boolean,
  now: number,
  options?: Partial<PlacementOptions>,
): { answers: PlacementAnswer[]; result: PlacementResult } {
  const answers: PlacementAnswer[] = [];
  for (let id = nextProbe(g, answers, options); id !== null; id = nextProbe(g, answers, options)) {
    answers.push({ topicId: id, correct: answer(id), at: now });
  }
  return { answers, result: placementResult(g, answers) };
}
