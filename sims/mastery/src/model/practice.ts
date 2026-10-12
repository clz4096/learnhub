/**
 * Choosing problems: the practice set of a lesson, the stream of more practice, the problem
 * of a review or a quiz, and the practice rule's bookkeeping (mastery/HOW-A-TOPIC-WORKS.md,
 * Rule 2). Seeds mix the topic, the occasion, and the problem's place, so a problem is
 * reproducible from its record but fresh on another day.
 */
import { mulberry32 } from '@learnhub/mastery';
import { practiceRule, type Generator, type GeneratorLevel, type Instance, type MasteryRule, type TopicContent } from '@learnhub/content';

/** FNV-1a over the parts, as an unsigned 32-bit seed. */
export function seedFor(...parts: readonly (string | number)[]): number {
  let h = 0x811c9dc5;
  for (const ch of parts.join('|')) {
    h ^= ch.codePointAt(0) as number;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Problem k of a run: the generators in turn, so a review or quiz covers the topic's skills. */
export function instanceAt(c: TopicContent, salt: string | number, k: number): Instance {
  const g = c.generators[k % c.generators.length];
  if (g === undefined) throw new Error(`${c.topicId} has no generators`);
  return g.instance(seedFor(c.topicId, salt, k));
}

// ---------------------------------------------------------------- the practice set

/** A generator's level; unset reads as standard (`GeneratorSpec.level`). */
export const levelOf = (g: Pick<Generator, 'level'>): GeneratorLevel => g.level ?? 'standard';

const LEVEL_RANK: Readonly<Record<GeneratorLevel, number>> = { easy: 0, standard: 1, harder: 2 };

/** One problem of a practice set: which generator, its skill and level, and the seed. */
export interface PracticeItem {
  generatorId: string;
  skill: string;
  level: GeneratorLevel;
  seed: number;
}

/** Each skill appears at least this many times in a set (Rule 2). */
export const SKILL_REPEATS = 2;

/** The distinct skills of a topic's generators, in the order they first appear. */
export function skillsOf(c: Pick<TopicContent, 'generators'>): string[] {
  return [...new Set(c.generators.map((g) => g.skill))];
}

/**
 * The set's size: the topic's rule (10 to 12), raised when it has so many skills that each
 * cannot appear twice otherwise. The every-skill-twice rule wins over "about 12".
 */
export function practiceSetSize(c: Pick<TopicContent, 'generators' | 'mastery'>): number {
  return Math.max(practiceRule(c.mastery).setSize, SKILL_REPEATS * skillsOf(c).length);
}

/**
 * A lesson's practice set (Rule 2) for one occasion (`salt`): every skill twice, the other
 * places spread over the generators least used so far, a level not yet in the set first, so
 * the set reaches from easy to harder where the topic has both. Ordered easy, standard,
 * harder; within a level the order is shuffled from the salt, with no generator twice in a
 * row where another is available. Deterministic in the content and the salt.
 */
export function practiceSet(c: TopicContent, salt: string | number): PracticeItem[] {
  const gens = c.generators;
  if (gens.length === 0) throw new Error(`${c.topicId} has no generators`);
  const rng = mulberry32(seedFor(c.topicId, salt, 'set'));
  // A fixed random order of the generators breaks every tie below.
  const order = new Map(gens.map((g) => [g.id, rng()]));
  const byOrder = (a: Generator, b: Generator): number => (order.get(a.id) as number) - (order.get(b.id) as number);
  const uses = new Map<string, number>();
  const picks: Generator[] = [];
  const pick = (g: Generator): void => {
    picks.push(g);
    uses.set(g.id, (uses.get(g.id) ?? 0) + 1);
  };
  for (const skill of skillsOf(c)) {
    const cands = gens.filter((g) => g.skill === skill).sort(byOrder);
    const first = cands[0] as Generator;
    pick(first);
    // A second generator of the skill when there is one, at another level where possible.
    const others = cands.slice(1);
    pick(others.find((g) => levelOf(g) !== levelOf(first)) ?? others[0] ?? first);
  }
  const size = practiceSetSize(c);
  while (picks.length < size) {
    const levels = new Set(picks.map(levelOf));
    const key = (g: Generator): [number, number] => [levels.has(levelOf(g)) ? 1 : 0, uses.get(g.id) ?? 0];
    const best = [...gens].sort((a, b) => {
      const [la, ua] = key(a);
      const [lb, ub] = key(b);
      return la - lb || ua - ub || byOrder(a, b);
    })[0] as Generator;
    pick(best);
  }
  const placed = picks.map((g) => ({ g, r: rng() })).sort((a, b) => LEVEL_RANK[levelOf(a.g)] - LEVEL_RANK[levelOf(b.g)] || a.r - b.r).map((x) => x.g);
  // The same generator twice in a row reads as a repeat: swap in a later one of the same level.
  for (let i = 1; i < placed.length; i++) {
    const prev = placed[i - 1] as Generator;
    const cur = placed[i] as Generator;
    if (cur.id !== prev.id) continue;
    const j = placed.findIndex((g, k) => k > i && levelOf(g) === levelOf(cur) && g.id !== cur.id);
    if (j > i) [placed[i], placed[j]] = [placed[j] as Generator, cur];
  }
  return placed.map((g, k) => ({ generatorId: g.id, skill: g.skill, level: levelOf(g), seed: seedFor(c.topicId, salt, k) }));
}

/**
 * The problem in one place of a set. `fresh` above 0 replaces a broken problem with another
 * from the same generator; the topic changed under a saved set (a generator removed) falls
 * back to the generators in turn.
 */
export function practiceInstance(c: TopicContent, item: PracticeItem, k: number, fresh = 0): Instance {
  const g = c.generators.find((x) => x.id === item.generatorId);
  if (g === undefined) return instanceAt(c, `${item.seed}.gone${fresh}`, k);
  return g.instance(fresh === 0 ? item.seed : seedFor(item.seed, 'fresh', fresh));
}

// ---------------------------------------------------------------- the pass rule

export interface PracticeState {
  /** Problems answered so far. */
  attempts: number;
  /** Right answers in a row, ending with the latest. Kept for runs saved before draft 4; it decides nothing now. */
  streak: number;
  /** Each answer in order: right on the first try. */
  results: boolean[];
  /** 2: the run follows Rule 2 of draft 4. Absent on a run saved under the right-in-a-row rule. */
  rule?: 2;
}

export type PracticeOutcome = 'continue' | 'passed' | 'not-yet';

export const freshPractice = (): PracticeState => ({ attempts: 0, streak: 0, results: [], rule: 2 });

/** Right answers needed out of `n`: the share, rounded up (8 of 10, 9 of 11, 10 of 12). */
export function passMark(n: number, share: number): number {
  return Math.ceil(n * share - 1e-9);
}

/** Where a run stands against its set: right answers, the mark, and the skills not yet right. */
export interface PracticeTally {
  right: number;
  mark: number;
  size: number;
  /** Skills of the set with no right answer yet, in set order. */
  skillsLeft: string[];
}

export function tallyOf(state: PracticeState, set: readonly PracticeItem[], rule: Readonly<MasteryRule>): PracticeTally {
  const results = state.results.slice(0, set.length);
  const rightSkills = new Set(set.filter((_, i) => results[i] === true).map((x) => x.skill));
  return {
    right: results.filter(Boolean).length,
    mark: passMark(set.length, practiceRule(rule).passShare),
    size: set.length,
    skillsLeft: [...new Set(set.map((x) => x.skill))].filter((s) => !rightSkills.has(s)),
  };
}

/**
 * Where a run stands (Rule 2): passed once the set is done with the mark reached and every
 * skill right at least once; not yet as soon as either can no longer happen (too many
 * misses, or a skill whose places are all used without a right answer). There is no "in a
 * row". A run saved under the old rule that had already met its streak stays passed.
 */
export function outcomeOf(state: PracticeState, set: readonly PracticeItem[], rule: Readonly<MasteryRule>): PracticeOutcome {
  if (state.rule === undefined && state.streak >= (rule.correctInARow ?? 3)) return 'passed';
  const t = tallyOf(state, set, rule);
  const done = Math.min(state.attempts, set.length);
  if (done >= set.length) return t.right >= t.mark && t.skillsLeft.length === 0 ? 'passed' : 'not-yet';
  if (t.right + (set.length - done) < t.mark) return 'not-yet';
  const ahead = new Set(set.slice(done).map((x) => x.skill));
  if (t.skillsLeft.some((s) => !ahead.has(s))) return 'not-yet';
  return 'continue';
}

/** Records one answer: right means right on the first try. */
export function answer(
  s: PracticeState, correct: boolean, set: readonly PracticeItem[], rule: Readonly<MasteryRule>,
): { state: PracticeState; outcome: PracticeOutcome } {
  const state: PracticeState = { attempts: s.attempts + 1, streak: correct ? s.streak + 1 : 0, results: [...s.results, correct], rule: 2 };
  return { state, outcome: outcomeOf(state, set, rule) };
}

// ---------------------------------------------------------------- more practice

/**
 * Problem k of a more-practice stream (Rule 2): the topic's generators in turn, each with a
 * fresh seed from the stream's salt. It counts toward nothing: no run, no schedule.
 */
export function moreInstance(c: TopicContent, salt: string | number, k: number): Instance {
  const g = c.generators[k % c.generators.length];
  if (g === undefined) throw new Error(`${c.topicId} has no generators`);
  return g.instance(seedFor(c.topicId, 'more', salt, k));
}

/** A review is two problems from different skills; it passes when both are right. */
export const REVIEW_PROBLEMS = 2;
