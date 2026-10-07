/**
 * The standup checked against the record: what the learner said, compared with what the
 * progress document and the learner's stores show since the last standup. Pure: the facts
 * are gathered from plain inputs (`gatherFacts`), then the transcript is read against them
 * (`checkStandup`).
 *
 * The reading is keyword matching, nothing cleverer. A claim is a past-tense "done" word
 * ("finished", "passed", "did") near words from a topic's title; the topic is the one whose
 * title shares the most words with the claim. A claim the record does not back is a gap,
 * worded with the learner's own words: "You said you finished sequences; its Cambridge
 * problem is still open." It also asks for whichever of the three standup questions
 * (yesterday, today, blocked on) the transcript does not touch.
 *
 * Speech recognition gives no punctuation, so a claim's reach is a window of words that
 * stops at a word that changes the subject ("but", "started", "today").
 */
import type { HistoryEntry, MasteryStage, Progress } from '@learnhub/mastery';
import type { Campaign } from './campaign';
import type { LadderAttempt } from './ladder';
import { topicOfLessonKey, type LessonStage, type PlaceMap } from './lessonState';

export const DAY_MS = 24 * 60 * 60 * 1000;

export interface TopicFact {
  id: string;
  title: string;
  stage: MasteryStage;
  /** The latest lesson run since the last standup, or null for none. */
  lesson: 'passed' | 'failed' | null;
  /** The lesson's place, when it is in progress and was touched since the last standup. */
  open: { stage: LessonStage; section: number | null } | null;
  /** Cambridge answers since the last standup: passed if any was right. */
  cambridge: 'passed' | 'failed' | null;
}

export interface TimedFact {
  id: string;
  label: string;
  finished: boolean;
}

export interface StandupFacts {
  since: number;
  until: number;
  /** Every topic the transcript may name. */
  topics: TopicFact[];
  /** Timed work started since the last standup: ladder attempts and campaign sittings. */
  timed: TimedFact[];
}

export interface FactInputs {
  progress: Pick<Progress, 'history' | 'memory'> | null;
  ladder: readonly LadderAttempt[];
  campaign: Pick<Campaign, 'sittings'> | null;
  places: Readonly<PlaceMap>;
  since: number;
  until: number;
}

export interface FactLookups {
  topics: readonly { id: string; title: string }[];
  /** Where a learned topic stands against the gate; called only for topics in the memory. */
  stageOf: (topicId: string) => MasteryStage;
  paperLabel: (paperId: string) => string;
}

/** Since the previous standup's check, or the 24 hours before `until` when there is none. */
export const sinceOf = (previousCheckedAt: number | null, until: number): number =>
  previousCheckedAt !== null && previousCheckedAt < until ? previousCheckedAt : until - DAY_MS;

export function gatherFacts(x: FactInputs, look: FactLookups): StandupFacts {
  const inWindow = (at: number): boolean => at > x.since && at <= x.until;
  const lessons = new Map<string, HistoryEntry>();
  const cambridge = new Map<string, boolean>();
  for (const h of x.progress?.history ?? []) {
    if (!inWindow(h.at)) continue;
    if (h.kind === 'lesson') {
      const was = lessons.get(h.topicId);
      if (was === undefined || h.at >= was.at) lessons.set(h.topicId, h);
    } else if (h.kind === 'cambridge') {
      cambridge.set(h.topicId, (cambridge.get(h.topicId) ?? false) || h.correct);
    }
  }
  const open = new Map<string, { at: number; stage: LessonStage; section: number | null }>();
  for (const k of Object.keys(x.places)) {
    const e = x.places[k];
    if (e === undefined || e.place === null || !inWindow(e.updatedAt)) continue;
    const id = topicOfLessonKey(k);
    const was = open.get(id);
    if (was === undefined || e.updatedAt > was.at) open.set(id, { at: e.updatedAt, stage: e.place.stage, section: e.place.section ?? null });
  }
  const memory = x.progress?.memory ?? {};
  const topics: TopicFact[] = look.topics.map((t) => {
    const l = lessons.get(t.id);
    const o = open.get(t.id);
    const c = cambridge.get(t.id);
    return {
      id: t.id,
      title: t.title,
      stage: Object.hasOwn(memory, t.id) ? look.stageOf(t.id) : 'unlearned',
      lesson: l === undefined ? null : l.correct ? 'passed' : 'failed',
      open: o === undefined ? null : { stage: o.stage, section: o.section },
      cambridge: c === undefined ? null : c ? 'passed' : 'failed',
    };
  });
  const timed: TimedFact[] = [
    ...x.ladder.filter((a) => inWindow(a.startedAt)).map((a) => ({ id: a.id, label: look.paperLabel(a.paperId), finished: a.finishedAt !== null })),
    ...(x.campaign?.sittings ?? []).filter((s) => inWindow(s.startedAt)).map((s) => ({ id: s.id, label: look.paperLabel(s.paperId), finished: s.finishedAt !== null })),
  ];
  return { since: x.since, until: x.until, topics, timed };
}

/** What the record shows since the last standup, one line each, for the learner to see beside the check. */
export function factLines(f: StandupFacts): string[] {
  const out: string[] = [];
  for (const t of f.topics) {
    if (t.lesson === 'passed') out.push(`Passed the lesson on ${t.title}.`);
    else if (t.lesson === 'failed') out.push(`Ran the lesson on ${t.title}; it did not pass.`);
    if (t.open !== null) out.push(`${t.title}: lesson in progress, ${whereIn(t.open)}.`);
    if (t.cambridge === 'passed') out.push(`Passed a Cambridge problem on ${t.title}.`);
    else if (t.cambridge === 'failed') out.push(`Tried a Cambridge problem on ${t.title}; not yet right.`);
  }
  for (const w of f.timed) out.push(`Timed: ${w.label}${w.finished ? '' : ' (not finished)'}.`);
  return out;
}

function whereIn(o: NonNullable<TopicFact['open']>): string {
  switch (o.stage) {
    case 'learn': return o.section === null ? 'reading' : `reading, section ${o.section + 1}`;
    case 'examples': return 'at the examples';
    case 'practice': return 'in practice';
    case 'cambridge': return 'waiting at its Cambridge problem';
  }
}

// ---------------------------------------------------------------- reading the transcript

export type StandupQuestion = 'yesterday' | 'today' | 'blocked';

export const QUESTION_PROMPTS: Readonly<Record<StandupQuestion, string>> = {
  yesterday: 'Say what you did yesterday.',
  today: 'Say what you will do today.',
  blocked: 'Say what is blocking you, or that nothing is.',
};

export interface StandupCheck {
  /** Claims the record does not back, in plain words. */
  gaps: string[];
  /** The standup questions the transcript does not touch. */
  missing: StandupQuestion[];
  /** Gaps, then prompts for the missing questions: what the log keeps. */
  flags: string[];
}

interface Word {
  /** As said, for quoting back. */
  raw: string;
  stem: string;
}

/** A crude stem, the same on both sides: "sequences" and "sequence" meet, "series" and "series" meet. */
export function stem(w: string): string {
  if (w.length > 4 && w.endsWith('ies')) return `${w.slice(0, -3)}y`;
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
}

function words(text: string): Word[] {
  const out: Word[] = [];
  for (const m of text.matchAll(/[A-Za-z0-9]+(?:['\u2019][A-Za-z]+)?/g)) {
    const raw = m[0];
    const lower = raw.toLowerCase();
    // "I'll" is a plan: read it as "will".
    const plain = /['’]ll$/.test(lower) ? 'will' : lower.replace(/['’]/g, '');
    out.push({ raw, stem: stem(plain) });
  }
  return out;
}

const set = (xs: string): ReadonlySet<string> => new Set(xs.split(' ').map(stem));

/** Words in titles that say nothing about which topic is meant. */
const GENERIC = set(
  'and the of a an to in on for with by from its their rule nth notation basic introduction intro part method using form general simple more how what into at as or vs two one i ii iii '
  + 'lesson problem cambridge paper section chapter today yesterday it that this all some',
);
/** Past-tense "done" words: a claim. The base forms ("finish") are left out, as they are mostly plans. */
const DONE = set('finished done completed mastered passed learned learnt covered wrapped nailed cleared solved did sat got');
const NEGATE = set('not no didnt dont havent hasnt never wasnt isnt couldnt');
/** Words before a "done" word that make it a plan, not a claim. */
const FUTURE = set('will going gonna plan want hope try need aim should');
/** Words that end a claim's reach. */
const BREAK = set('but then started start began begin starting today tomorrow will going stuck blocked struggling however except next plan');
const TIMED = set('timed mock tmua paper papers ladder');

const Q_YESTERDAY = set('yesterday last since finished done completed did worked studied covered passed learned learnt sat got');
const Q_TODAY = set('today tonight plan planning going gonna will next morning afternoon evening aim goal');
const Q_BLOCKED = set('block blocked blocker blockers blocking stuck struggling struggle struggled issue issues obstacle confused unclear nothing hard');

interface Claim {
  /** Positions of the words the claim reaches. */
  at: number[];
}

/** Each "done" word that is not negated or a plan, with the words it reaches. */
function claims(ws: readonly Word[]): Claim[] {
  const out: Claim[] = [];
  for (let i = 0; i < ws.length; i++) {
    if (!DONE.has(ws[i]!.stem)) continue;
    let plan = false;
    for (let j = i - 1; j >= 0 && j >= i - 5; j--) {
      const s = ws[j]!.stem;
      if (NEGATE.has(s) || FUTURE.has(s)) plan = true;
      if (plan || BREAK.has(s)) break;
    }
    if (plan) continue;
    // "got" claims only as "got through".
    if (ws[i]!.stem === 'got' && ws[i + 1]?.stem !== 'through') continue;
    const at: number[] = [];
    for (let j = i + 1; j < ws.length && j <= i + 8 && !BREAK.has(ws[j]!.stem); j++) at.push(j);
    for (let j = i - 1; j >= 0 && j >= i - 3 && !BREAK.has(ws[j]!.stem) && !DONE.has(ws[j]!.stem); j--) at.push(j);
    out.push({ at: at.sort((a, b) => a - b) });
  }
  return out;
}

const titleStems = new Map<string, ReadonlySet<string>>();
function stemsOf(title: string): ReadonlySet<string> {
  let s = titleStems.get(title);
  if (s === undefined) {
    s = new Set(words(title).map((w) => w.stem).filter((x) => x.length >= 3 && !GENERIC.has(x)));
    titleStems.set(title, s);
  }
  return s;
}

/** Recent activity first, then the record's order: the topic a tie most likely means. */
const active = (t: TopicFact): number => (t.lesson !== null || t.open !== null || t.cambridge !== null ? 1 : 0);

/** The gap for a claimed topic, or null when the record backs it. */
function gapFor(said: string, t: TopicFact): string | null {
  if (t.stage === 'mastered') return null;
  if (t.stage === 'needs-gate') return `You said you finished ${said}; its Cambridge problem is still open.`;
  if (t.open !== null) return `You said you finished ${said}; the lesson on ${t.title} is still in progress, ${whereIn(t.open)}.`;
  if (t.lesson === 'failed') return `You said you finished ${said}; the last lesson run on ${t.title} did not pass.`;
  return `You said you finished ${said}; nothing since your last standup shows ${t.title} done.`;
}

export function checkStandup(transcript: string, facts: StandupFacts): StandupCheck {
  const ws = words(transcript);
  const gaps: string[] = [];
  const add = (g: string | null): void => {
    if (g !== null && !gaps.includes(g)) gaps.push(g);
  };
  for (const c of claims(ws)) {
    // One claim may name several topics ("sequences and induction"): take the best match,
    // set its words aside, and look again.
    const reach = new Set(c.at.map((j) => ws[j]!.stem));
    for (;;) {
      let best: TopicFact[] = [];
      let score = 0;
      for (const t of facts.topics) {
        let n = 0;
        for (const s of stemsOf(t.title)) if (reach.has(s)) n++;
        if (n > score) {
          score = n;
          best = [t];
        } else if (n === score && n > 0) best.push(t);
      }
      if (score === 0) break;
      const t = [...best].sort((a, b) => active(b) - active(a))[0]!;
      const stems = stemsOf(t.title);
      const said = c.at.filter((j) => stems.has(ws[j]!.stem) && reach.has(ws[j]!.stem)).map((j) => ws[j]!.raw.toLowerCase()).join(' ');
      for (const s of stems) reach.delete(s);
      // Any matching topic already mastered backs the claim.
      if (!best.some((b) => b.stage === 'mastered')) add(gapFor(said, t));
    }
    if (c.at.some((j) => TIMED.has(ws[j]!.stem)) && !facts.timed.some((w) => w.finished)) {
      const running = facts.timed[0];
      add(running === undefined
        ? 'You mentioned timed work; none is logged since your last standup.'
        : `You mentioned timed work; ${running.label} is started but not finished.`);
    }
  }
  const stems = new Set(ws.map((w) => w.stem));
  const touches = (q: ReadonlySet<string>): boolean => [...q].some((s) => stems.has(s));
  const missing: StandupQuestion[] = [];
  if (!touches(Q_YESTERDAY)) missing.push('yesterday');
  if (!touches(Q_TODAY)) missing.push('today');
  if (!touches(Q_BLOCKED)) missing.push('blocked');
  return { gaps, missing, flags: [...gaps, ...missing.map((q) => QUESTION_PROMPTS[q])] };
}
