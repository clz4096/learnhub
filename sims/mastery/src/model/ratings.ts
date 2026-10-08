/**
 * Player ratings, as in NBA 2K's MyCareer (mastery/DESIGN-STORY.md, "Mechanics"): six
 * attributes from 40 to 99 and an overall, read from real evidence only.
 *
 * - Analysis, Algebra, Probability, Proof, Programming: the graph's topics in each area.
 *   A topic's drills (a memory state, however earned, gym included) lift a rating at most
 *   `PRACTICE_POINTS`, so drills and gym alone stop at `DRILL_CAP`. Past that, only gated
 *   mastery (gate.ts `isMastered`: a gate problem done unaided or supervised at 14 of 20)
 *   and passed supervision marks count.
 * - Exam Temperament: timed papers only (full papers and timed halves, kept to time).
 *   Nothing else moves it.
 *
 * Memory strength weighs each topic by its review interval, not by the clock, so a rating
 * never decays while the learner sleeps; a lapse shortens the interval and can lower it.
 *
 * Monotonic in evidence: one more mastered topic, one more supervision result, or one more
 * timed paper never lowers a rating. Each part is a sum, or the mean of a fixed number of
 * best results with the missing ones counted as 0, so adding a result can only raise it.
 *
 * Never stored: a rating is a pure function of the progress document and the timed results,
 * so a merge of two documents needs no rule of its own, and two devices with the same
 * evidence show the same numbers.
 */
import { SUPERVISION_MARK_MAX, SUPERVISION_PASS_MARK, isMastered, sameKey, type GateDoc, type KeyResolver, type MemoryState } from '@learnhub/mastery';

export type DomainId = 'analysis' | 'algebra' | 'probability' | 'proof' | 'programming';
export type RatingId = DomainId | 'temperament';

export const RATING_IDS: readonly RatingId[] = ['analysis', 'algebra', 'probability', 'proof', 'programming', 'temperament'];
export const DOMAIN_IDS: readonly DomainId[] = ['analysis', 'algebra', 'probability', 'proof', 'programming'];

export const RATING_LABELS: Readonly<Record<RatingId, string>> = {
  analysis: 'Analysis',
  algebra: 'Algebra',
  probability: 'Probability',
  proof: 'Proof',
  programming: 'Programming',
  temperament: 'Exam Temperament',
};

/** Which graph areas feed each domain rating. Every area of the graph is in exactly one (a test checks). */
export const RATING_AREAS: Readonly<Record<DomainId, readonly string[]>> = {
  analysis: ['analysis', 'calculus', 'functions-and-graphs'],
  algebra: ['number-and-algebra', 'sequences-and-series', 'further-algebra', 'trigonometry', 'coordinate-geometry', 'number-theory'],
  probability: [
    'counting', 'elementary-probability', 'distributions', 'ia-basic-concepts', 'ia-axiomatic', 'conditioning',
    'random-variables', 'continuous', 'generating-functions', 'random-processes', 'limit-theorems',
  ],
  proof: ['logic', 'proof', 'sets'],
  programming: ['functional-programming'],
};

export const RATING_MIN = 40;
export const RATING_MAX = 99;
/** The most drills and gym can add: a domain with no gated evidence stops at `DRILL_CAP`. */
export const PRACTICE_POINTS = 15;
export const DRILL_CAP = RATING_MIN + PRACTICE_POINTS;
/** Gated mastery of every topic in the domain, each at full strength. */
export const MASTERY_POINTS = 34;
/** Passed supervisions in the domain: the mean of the best `SUPERVISION_BEST`, as a share of 20. */
export const SUPERVISION_POINTS = 10;
export const SUPERVISION_BEST = 3;
/** A review interval this long or longer counts as full strength: the fifth interval of a topic never missed (1, 3, 9, 18, 36). */
export const STRONG_INTERVAL_DAYS = 36;
/** Exam Temperament: the mean of the best `TIMED_BEST` timed papers. */
export const TIMED_BEST = 6;
/** A timed paper at this share of its marks or above counts in full: the app's pass mark, 14 of 20. */
export const TIMED_PAR = SUPERVISION_PASS_MARK / SUPERVISION_MARK_MAX;

const domainOf = (area: string): DomainId | null => DOMAIN_IDS.find((d) => RATING_AREAS[d].includes(area)) ?? null;
const clamp01 = (x: number): number => (Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0);

/** A topic's memory strength, 0 to 1, from its review interval alone (no clock). */
export function strengthOf(m: MemoryState | undefined): number {
  return m === undefined ? 0 : clamp01(m.intervalDays / STRONG_INTERVAL_DAYS);
}

/** The mean of the best `k` values, the missing ones counted as 0: adding a value never lowers it. */
export function bestMean(values: readonly number[], k: number): number {
  const best = [...values].sort((a, b) => b - a).slice(0, k);
  return best.reduce((a, x) => a + x, 0) / k;
}

/** One timed paper's result. Untimed work is left out before it gets here. */
export interface TimedResult {
  mark: number;
  max: number;
}

/** What one domain rating reads. */
export interface DomainEvidence {
  /** Topics of the graph in the domain. */
  topics: number;
  /** Learned topics (drills passed), each by its strength. */
  practice: number[];
  /** Mastered topics (gate met), each by its strength. */
  mastered: number[];
  /** Passed supervision marks on the domain's problems, out of 20. */
  supervision: number[];
}

/** Everything the ratings read: plain numbers, so the rules are testable without a document. */
export interface RatingInputs {
  domains: Readonly<Record<DomainId, DomainEvidence>>;
  timed: readonly TimedResult[];
}

export interface Rating {
  id: RatingId;
  label: string;
  /** A whole number from `RATING_MIN` to `RATING_MAX`. */
  value: number;
  /** True while drills and gym are all the rating has: it cannot pass `DRILL_CAP` (or 40 for Exam Temperament) until gated or timed work comes in. */
  capped: boolean;
}

export type RatingValues = Readonly<Record<RatingId | 'overall', number>>;

const toRating = (x: number): number => Math.min(RATING_MAX, Math.max(RATING_MIN, Math.round(x)));

/** A domain's rating before rounding. */
function domainScore(e: DomainEvidence): number {
  if (e.topics <= 0) return RATING_MIN;
  const sum = (xs: readonly number[]): number => xs.reduce((a, x) => a + clamp01(x), 0);
  const practice = Math.min(1, sum(e.practice) / e.topics);
  // Half credit for meeting the gate, half for keeping the topic strong.
  const mastery = Math.min(1, e.mastered.reduce((a, s) => a + 0.5 + 0.5 * clamp01(s), 0) / e.topics);
  const sup = bestMean(e.supervision.map((m) => clamp01(m / SUPERVISION_MARK_MAX)), SUPERVISION_BEST);
  return RATING_MIN + PRACTICE_POINTS * practice + MASTERY_POINTS * mastery + SUPERVISION_POINTS * sup;
}

function temperamentScore(timed: readonly TimedResult[]): number {
  const credit = timed.filter((t) => t.max > 0).map((t) => clamp01(t.mark / t.max / TIMED_PAR));
  return RATING_MIN + (RATING_MAX - RATING_MIN) * bestMean(credit, TIMED_BEST);
}

/** The six ratings, in `RATING_IDS` order. */
export function ratings(inp: RatingInputs): Rating[] {
  return RATING_IDS.map((id) => {
    if (id === 'temperament') {
      return { id, label: RATING_LABELS[id], value: toRating(temperamentScore(inp.timed)), capped: inp.timed.every((t) => t.max <= 0) };
    }
    const e = inp.domains[id];
    return { id, label: RATING_LABELS[id], value: toRating(domainScore(e)), capped: e.mastered.length === 0 && e.supervision.length === 0 };
  });
}

/** The overall: the mean of the six, rounded. */
export function overall(rs: readonly Rating[]): number {
  return rs.length === 0 ? RATING_MIN : toRating(rs.reduce((a, r) => a + r.value, 0) / rs.length);
}

/** The six and the overall by id, for triggers. */
export function ratingValues(rs: readonly Rating[]): RatingValues {
  const out = { overall: overall(rs) } as Record<RatingId | 'overall', number>;
  for (const id of RATING_IDS) out[id] = rs.find((r) => r.id === id)?.value ?? RATING_MIN;
  return out;
}

/** The topic id of a problem key ("topic id/problem id"). */
const topicOfKey = (key: string): string => key.slice(0, Math.max(0, key.indexOf('/')));

/**
 * The inputs from a progress document: `topics` are the graph's (id and area), `gateOf` a
 * topic's gate problem ids (the content catalog), `timed` the timed papers' results, `resolve`
 * the current key of a problem that moved topic (the catalog's `currentProblemKey`).
 */
export function ratingInputs(
  p: GateDoc, topics: readonly { id: string; area: string }[], gateOf: (topicId: string) => readonly string[], timed: readonly TimedResult[],
  resolve: KeyResolver = sameKey,
): RatingInputs {
  const empty = (): DomainEvidence => ({ topics: 0, practice: [], mastered: [], supervision: [] });
  const domains: Record<DomainId, DomainEvidence> = { analysis: empty(), algebra: empty(), probability: empty(), proof: empty(), programming: empty() };
  const domainById = new Map<string, DomainId>();
  for (const t of topics) {
    const d = domainOf(t.area);
    if (d === null) continue;
    domainById.set(t.id, d);
    const e = domains[d];
    e.topics++;
    const m = p.memory[t.id];
    if (m === undefined) continue;
    const s = strengthOf(m);
    e.practice.push(s);
    if (isMastered(p, t.id, gateOf(t.id), resolve)) e.mastered.push(s);
  }
  for (const a of p.supervision) {
    if (a.result === null || a.importedAt === null || a.result.mark < SUPERVISION_PASS_MARK) continue;
    const d = domainById.get(topicOfKey(resolve(a.problem)));
    if (d !== undefined) domains[d].supervision.push(a.result.mark);
  }
  return { domains, timed };
}
