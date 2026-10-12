/**
 * Struggle as a signal (mastery/HOW-A-TOPIC-WORKS.md, Rule 9): how often the first answer
 * is right, per topic and per skill, from the item data the history already holds.
 *
 * Every generated problem answered in lesson practice, more practice, or a review is a
 * `drill` entry whose item id is "topic id/generator id" and whose `correct` is the first
 * answer (one more try after a miss does not change it). The skill is the generator's, read
 * from the topic's content, so nothing new is stored: the document's shape, and so its
 * merge, are unchanged. Gym drills and quizzes are not counted; they are other occasions.
 *
 * A skill is weak when, over its latest `RECENT_TRIES` first answers, at least
 * `WEAK_MIN_ATTEMPTS` were given and under `WEAK_BELOW` of them were right. The window lets
 * a skill that has since been learned stop being flagged ("stays weak").
 */
import type { HistoryEntry } from '@learnhub/mastery';
import { lessonSections, plain, type Block, type Rich, type TopicContent } from '@learnhub/content';
import { skillsOf } from './practice';

/** Under this share right on the first try, a skill is weak. */
export const WEAK_BELOW = 0.6;
/** A skill is judged on at least this many first answers. */
export const WEAK_MIN_ATTEMPTS = 5;
/** A skill is judged on at most its latest this many first answers. */
export const RECENT_TRIES = 20;

export interface Accuracy {
  right: number;
  attempts: number;
}

export const isWeak = (a: Accuracy): boolean => a.attempts >= WEAK_MIN_ATTEMPTS && a.right < WEAK_BELOW * a.attempts;

/** Whole percent, for display: 3 of 7 is 43. */
export const percentOf = (a: Accuracy): number => (a.attempts === 0 ? 0 : Math.round((100 * a.right) / a.attempts));

interface Try {
  at: number;
  correct: boolean;
}

/** First answers to generated problems, by topic, then by generator, in time order. */
export function firstTries(history: readonly HistoryEntry[]): Map<string, Map<string, Try[]>> {
  const out = new Map<string, Map<string, Try[]>>();
  for (const h of history) {
    if (h.kind !== 'drill' || h.item === undefined) continue;
    const prefix = `${h.topicId}/`;
    if (!h.item.id.startsWith(prefix)) continue;
    const gen = h.item.id.slice(prefix.length);
    let byGen = out.get(h.topicId);
    if (byGen === undefined) out.set(h.topicId, (byGen = new Map()));
    const list = byGen.get(gen) ?? [];
    list.push({ at: h.at, correct: h.correct });
    byGen.set(gen, list);
  }
  for (const byGen of out.values()) for (const list of byGen.values()) list.sort((a, b) => a.at - b.at);
  return out;
}

const tally = (tries: readonly Try[]): Accuracy => ({ right: tries.filter((x) => x.correct).length, attempts: tries.length });

/** A topic's first-try accuracy over every generated problem answered, generators since removed included. */
export function topicAccuracy(history: readonly HistoryEntry[], topicId: string): Accuracy {
  return tally([...(firstTries(history).get(topicId)?.values() ?? [])].flat());
}

export interface SkillStat extends Accuracy {
  skill: string;
  weak: boolean;
  /** The lesson section that teaches it (`lessonSections` index), or null when none can be told. */
  section: number | null;
}

/** Each skill of a topic's generators, judged on its latest first answers (`RECENT_TRIES`). */
export function skillStats(c: TopicContent, history: readonly HistoryEntry[], tries = firstTries(history)): SkillStat[] {
  const byGen = tries.get(c.topicId);
  return skillsOf(c).map((skill) => {
    const all = c.generators.filter((g) => g.skill === skill).flatMap((g) => byGen?.get(g.id) ?? []);
    const recent = all.sort((a, b) => a.at - b.at).slice(-RECENT_TRIES);
    const a = tally(recent);
    return { skill, ...a, weak: isWeak(a), section: skillSection(c, skill) };
  });
}

export const weakSkills = (c: TopicContent, history: readonly HistoryEntry[]): SkillStat[] => skillStats(c, history).filter((s) => s.weak);

// ---------------------------------------------------------------- skill to lesson section

const STOP = new Set([
  'the', 'and', 'for', 'two', 'its', 'are', 'one', 'any', 'all', 'not', 'but', 'how', 'can', 'may', 'has', 'was', 'use', 'out', 'own', 'way',
  'about', 'after', 'also', 'from', 'given', 'have', 'into', 'more', 'than', 'that', 'their', 'them', 'then', 'there', 'these', 'this', 'those',
  'what', 'when', 'where', 'which', 'with', 'without', 'each', 'every', 'both', 'such', 'other', 'only', 'same', 'some', 'step', 'steps',
]);

/** The content words of a text, lower case and roughly stemmed: "Adding fractions" gives add, fraction. */
export function stems(text: string): Set<string> {
  const out = new Set<string>();
  for (const w of text.toLowerCase().match(/[a-z]+/g) ?? []) {
    if (w.length < 3 || STOP.has(w)) continue;
    const stem = w.replace(/(?:ings?|ed|es|e|s)$/, '');
    out.add(stem.length >= 3 ? stem : w);
  }
  return out;
}

const isRich = (v: unknown): v is Rich =>
  Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === 'object' && x !== null && typeof (x as { text?: unknown }).text === 'string' && 'typed' in x);

/** The prose of some blocks (not their mathematics), for matching words. */
function prose(blocks: readonly Block[]): string {
  const out: string[] = [];
  const walk = (v: unknown): void => {
    if (isRich(v)) out.push(v.filter((s) => s.kind === 'text').map((s) => s.text).join(' '));
    else if (Array.isArray(v)) v.forEach(walk);
    else if (typeof v === 'object' && v !== null) Object.values(v).forEach(walk);
  };
  walk(blocks);
  return out.join(' ');
}

const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * The lesson section that teaches a skill, as an index into `lessonSections`:
 * 1. a Cambridge problem whose `uses.note` is the skill names its first section (`uses`);
 * 2. else the section whose title, then whose prose, shares the most words with the skill,
 *    each word weighed by how few sections have it;
 * 3. else null: the link goes to the lesson.
 */
export function skillSection(c: TopicContent, skill: string): number | null {
  const sections = lessonSections(c.lesson);
  const titles = sections.map((s) => (s.title === null ? '' : plain(s.title)));
  const index = (title: string): number | null => {
    const i = titles.findIndex((t) => norm(t) === norm(title));
    return i < 0 ? null : i;
  };
  for (const p of c.cambridge) {
    if (p.uses?.note === undefined || norm(plain(p.uses.note)) !== norm(skill)) continue;
    for (const t of p.uses.sections) {
      const i = index(t);
      if (i !== null) return i;
    }
  }
  const want = stems(skill);
  if (want.size === 0 || sections.length === 0) return null;
  const heads = titles.map(stems);
  const bodies = sections.map((s) => stems(prose(s.blocks)));
  // A shared word counts for less the more sections share it, so "fraction" in every title of
  // the Fractions lesson does not outweigh "add" in one; a word in every body counts for nothing.
  const weight = (w: string, sets: readonly Set<string>[], full: number): number => full / Math.max(1, sets.filter((x) => x.has(w)).length);
  let best: number | null = null;
  let bestScore = 0;
  for (let i = 0; i < sections.length; i++) {
    let score = 0;
    for (const w of want) {
      if ((heads[i] as Set<string>).has(w)) score += weight(w, heads, 3);
      if ((bodies[i] as Set<string>).has(w) && bodies.some((x) => !x.has(w))) score += weight(w, bodies, 1);
    }
    if (score > bestScore + 1e-9) {
      best = i;
      bestScore = score;
    }
  }
  return best;
}

// ---------------------------------------------------------------- lessons to revisit

export interface RevisitRow {
  topicId: string;
  /** First-try accuracy over the topic's generated problems. */
  accuracy: Accuracy;
  /** The weak skills, weakest first. */
  weak: SkillStat[];
}

/** Topics with enough first answers that a skill could be weak: the ones whose content the list must read. */
export function revisitCandidates(history: readonly HistoryEntry[]): string[] {
  const out: string[] = [];
  for (const [topicId, byGen] of firstTries(history)) {
    if ([...byGen.values()].reduce((n, l) => n + l.length, 0) >= WEAK_MIN_ATTEMPTS) out.push(topicId);
  }
  return out.sort();
}

/** The lessons to revisit (Rule 9): each topic, among `contents`, with at least one weak skill. */
export function revisitRows(history: readonly HistoryEntry[], contents: readonly TopicContent[]): RevisitRow[] {
  const tries = firstTries(history);
  const out: RevisitRow[] = [];
  for (const c of contents) {
    const weak = skillStats(c, history, tries).filter((s) => s.weak).sort((a, b) => a.right / a.attempts - b.right / b.attempts || b.attempts - a.attempts);
    if (weak.length === 0) continue;
    out.push({ topicId: c.topicId, accuracy: tally([...(tries.get(c.topicId)?.values() ?? [])].flat()), weak });
  }
  return out;
}

export type RevisitSort = 'accuracy' | 'attempts' | 'order';

/**
 * The list in an order: `accuracy`, lowest first; `attempts`, most first; `order`, the
 * order of `rank` (the book). Ties fall back to the topic id, so the order is total.
 */
export function sortRevisit(rows: readonly RevisitRow[], by: RevisitSort, rank: (topicId: string) => number = () => 0): RevisitRow[] {
  const share = (a: Accuracy): number => (a.attempts === 0 ? 1 : a.right / a.attempts);
  const cmp: Record<RevisitSort, (a: RevisitRow, b: RevisitRow) => number> = {
    accuracy: (a, b) => share(a.accuracy) - share(b.accuracy) || b.accuracy.attempts - a.accuracy.attempts,
    attempts: (a, b) => b.accuracy.attempts - a.accuracy.attempts || share(a.accuracy) - share(b.accuracy),
    order: (a, b) => rank(a.topicId) - rank(b.topicId),
  };
  return [...rows].sort((a, b) => cmp[by](a, b) || (a.topicId < b.topicId ? -1 : a.topicId > b.topicId ? 1 : 0));
}
