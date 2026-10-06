/**
 * The scenes, in story order (mastery/DESIGN-STORY.md, "The storyline"): the Prologue,
 * then Book One: Preparation, each wired to the real progress or campaign milestone that
 * triggers it. A scene's variant and its end card read the real numbers copied when it
 * triggered (StoryNumbers), so a replay plays as it first did.
 *
 * No scene is set on Shabbat: every place card names a weekday from Sunday to Thursday.
 */
import { slug } from '@learnhub/content/book';
import { TARGET_WEEK_HOURS } from './campaignCalendar';
import {
  offerOutcome, relationWord, repLevel,
  type EndContext, type EndItem, type OfferOutcome, type RelId, type Relationships, type Scene, type StoryCampaign, type StoryNumbers,
} from './story';

/** A chapter's id from its year and title, as the book makes it; book order tests check each resolves. */
const chapter = (yearId: string, title: string): string => slug(`${yearId}-${title}`);

export const STEP_BLOCK_1 = chapter('prep', 'STEP Foundation, Block 1: Algebra and graphs');
export const CS0_PROOF = chapter('prep', 'CS-0 Proof');
export const STAGE_A = 'prep/Stage A: STEP Foundation and CS-0';

/** Hours to one decimal place, without a trailing ".0". */
export function fmtHours(h: number): string {
  return String(Math.round(h * 10) / 10);
}

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

function repValue(c: EndContext): string {
  const gain = c.repBefore !== null && c.rep > c.repBefore ? ` (+${c.rep - c.repBefore})` : '';
  return `${c.rep} · ${repLevel(c.rep).name}${gain}`;
}

const REP_ITEM: EndItem = { label: 'REP', value: repValue };

function moved(c: EndContext, who: RelId): string {
  const d = c.after[who] - c.before[who];
  if (d > 0) return `closer (${relationWord(c.after[who])})`;
  if (d < 0) return `cooler (${relationWord(c.after[who])})`;
  return 'unchanged';
}

/** First Light's variant: the week's ticked hours against the plan's target. */
export function firstLightVariant(n: StoryNumbers): 'full' | 'short' | 'unlogged' {
  if (n.weekHours >= TARGET_WEEK_HOURS) return 'full';
  return n.weekHours > 0 ? 'short' : 'unlogged';
}

export const PROLOGUE: Scene = {
  id: 'prologue',
  book: 0,
  chapter: 0,
  kicker: 'Prologue',
  title: 'The Kitchen Table',
  place: 'Brooklyn, 5:04 am',
  art: 'kitchen-night',
  cast: ['priya'],
  trigger: { kind: 'firstLaunch' },
  script: {
    lines: [
      { kind: 'narration', text: 'The radiator knocks twice. The city is still dark, except for the laptop.' },
      { kind: 'narration', text: 'On the screen: STEP 2005, Paper I, Question 1. Five-digit numbers whose digits add up to 43.' },
      { kind: 'inner', speaker: 'Albert', text: 'Six years of production C++. Race conditions, lock-free queues, a kernel bug nobody else could find.' },
      { kind: 'inner', speaker: 'Albert', text: 'And I can\'t remember the last time I proved anything.' },
      { kind: 'narration', text: 'In the drawer under the counter, beside the takeout menus, is a GED certificate from nineteen years ago.', fx: 'cert' },
      { kind: 'narration', text: 'The phone buzzes.', fx: 'buzz' },
      { kind: 'message', speaker: 'Priya', text: '"You up? I signed up for the STEP support thing. Misery loves company."' },
      {
        kind: 'choice',
        id: 'reply',
        options: [
          {
            id: 'already', text: '"Already on question one."', note: 'Priya will remember this', effects: { priya: 1 },
            reply: { kind: 'message', speaker: 'Priya', text: '"Of course you are. Send me case one when you have it."' },
          },
          {
            id: 'looking', text: '"Go back to sleep. I\'m only looking."', note: 'Keep your cards close',
            reply: { kind: 'message', speaker: 'Priya', text: '"Liar. Good luck."' },
          },
          { id: 'focus', text: 'Turn the phone face down. Open the paper.', note: 'Focus' },
        ],
      },
      { kind: 'narration', text: 'Nine is the biggest a digit can be. Five nines make 45, so the digits fall 2 short of the maximum.', fx: 's1' },
      { kind: 'inner', speaker: 'Albert', text: 'Two short. So one digit is a 7, or two digits are 8s. Everything else is a nine.', fx: 's2' },
      { kind: 'narration', text: 'By 6:30 he has the cases. By 7:00 he has the count. The radiator knocks again, and the sky over the Navy Yard turns the colour of a bruise healing.' },
      { kind: 'narration', text: 'In the real 2025 admissions cycle, 12.7% of applicants for Mathematics at Cambridge got a place.' },
      { kind: 'spoken', speaker: 'Albert', text: 'Then I need to be in the 12.7.' },
    ],
    endCard: [
      REP_ITEM,
      { label: 'Priya', value: (c) => moved(c, 'priya') },
      { label: 'Focus', value: (c) => (c.chosen.reply === 'focus' ? 'sharper' : 'unchanged') },
      { label: 'Triggered by', value: () => 'first launch' },
    ],
  },
};

export const FIRST_LIGHT: Scene = {
  id: 'first-light',
  book: 1,
  chapter: 1,
  kicker: 'Chapter 1',
  title: 'First Light',
  place: 'Brooklyn, 6:40 am, the morning after',
  art: 'kitchen-dawn',
  cast: ['priya'],
  trigger: { kind: 'chapter', chapterId: STEP_BLOCK_1, name: 'STEP Foundation, Block 1' },
  script: {
    variant: firstLightVariant,
    lines: [
      { kind: 'narration', text: 'The same table. The same radiator. This time the window goes pale before the coffee is gone.' },
      { kind: 'narration', text: 'On the screen, the contents of the book. Beside Block 1, where a count used to be, one word: done.', fx: 'done' },
      { kind: 'inner', speaker: 'Albert', text: 'Fractions, indices, the sums of series. Things they teach at fifteen.' },
      {
        kind: 'inner', speaker: 'Albert',
        text: ({ n }) => `${plural(n.sectionsMastered, 'section', 'sections')} of the book mastered. Nobody hands out a certificate for that.`,
      },
      {
        kind: 'inner', speaker: 'Albert', only: ['full'],
        text: ({ n }) => `${fmtHours(n.weekHours)} hours this week. The plan asked for ${TARGET_WEEK_HOURS}. The plan was right.`,
      },
      {
        kind: 'inner', speaker: 'Albert', only: ['short'],
        text: ({ n }) => `${fmtHours(n.weekHours)} hours this week, short of the ${TARGET_WEEK_HOURS} the plan asks for. Finished anyway.`,
      },
      { kind: 'narration', only: ['unlogged'], text: 'The day planner shows no hours ticked off this week. The chapter got done regardless.' },
      { kind: 'narration', text: 'The phone buzzes.', fx: 'buzz' },
      { kind: 'message', speaker: 'Priya', text: '"Well? Block 1. You said you would finish it by the weekend."' },
      {
        kind: 'choice',
        id: 'reply',
        options: [
          {
            id: 'straight', text: '"Done. Last night, just before one."', note: 'Tell her straight', effects: { priya: 1 },
            reply: { kind: 'message', speaker: 'Priya', text: '"Look at you. I\'m two assignments behind. Don\'t wait for me."' },
          },
          {
            id: 'down', text: '"Done. It was easy, honestly."', note: 'Play it down', effects: { priya: -1 },
            reply: { kind: 'message', speaker: 'Priya', text: '"Easy. Right. Some of us last did those sums in 2004."' },
          },
          {
            id: 'together', text: '"Done. Want to do Block 2 together? Thursday night?"', note: 'Priya will remember this', effects: { priya: 2 },
            reply: { kind: 'message', speaker: 'Priya', text: '"Thursday. Bring the coffee. I\'ll bring the probability."' },
          },
        ],
      },
      { kind: 'narration', text: 'It is a small thing, one chapter of a long book. He knows exactly how small. It is not nothing.' },
      { kind: 'inner', speaker: 'Albert', text: 'Six years of shipping code taught him this much. You never ship the system. You ship the next piece, and then the one after.' },
      { kind: 'narration', text: 'He opens Block 2. Trigonometry, counting, probability. The coffee has gone cold. He drinks it anyway.', fx: 'cold' },
    ],
    endCard: [
      { label: 'Sections mastered', value: (c) => String(c.n.sectionsMastered) },
      { label: 'Hours that week', value: (c) => fmtHours(c.n.weekHours) },
      REP_ITEM,
      { label: 'Priya', value: (c) => moved(c, 'priya') },
      { label: 'Triggered by', value: () => 'STEP Foundation, Block 1 complete' },
    ],
  },
};


// ---------------------------------------------------------------- reading the campaign

/** One decimal place, without a trailing ".0". */
const fmt1 = (x: number): string => String(Math.round(x * 10) / 10);

const A_ORDER: readonly string[] = ['A*', 'A', 'B', 'C', 'D', 'E', 'U'];

/** The three A levels, in the campaign's subject names, with the short name a scene says. */
const SUBJECTS: readonly { name: string; short: string }[] = [
  { name: 'A level Mathematics', short: 'Mathematics' },
  { name: 'A level Further Mathematics', short: 'Further Mathematics' },
  { name: 'A level Computer Science', short: 'Computer Science' },
];

/** The grade the typical offer asks for in an A level subject, from the offer's conditions. */
function aLevelNeed(c: StoryCampaign, subject: string): string {
  return c.conditions.find((x) => x.label === subject)?.need.split(' ')[0] ?? 'A';
}

/** Grades below the offer's need on a paper: 0 or less is at or above it. */
function aLevelGap(c: StoryCampaign, p: StoryCampaign['aLevels'][number]): number {
  return A_ORDER.indexOf(p.grade ?? 'U') - A_ORDER.indexOf(aLevelNeed(c, p.subject));
}

/** A subject's papers as "A* (84/100), A (70/100)", or "not sat". */
export function subjectGrades(c: StoryCampaign | null, subject: string): string {
  const ps = c?.aLevels.filter((p) => p.subject === subject) ?? [];
  return ps.length === 0 ? 'not sat' : ps.map((p) => `${p.grade ?? 'U'} (${p.mark}/${p.max})`).join(', ');
}

export type ALevelVariant = 'ahead' | 'close' | 'behind' | 'unknown';

/** Act I's variant: every A level paper against the grade the typical offer asks for in its subject. */
export function aLevelVariant(n: StoryNumbers): ALevelVariant {
  const c = n.campaign;
  if (c === null || c.aLevels.length === 0) return 'unknown';
  const gap = Math.max(...c.aLevels.map((p) => aLevelGap(c, p)));
  if (gap <= 0) return 'ahead';
  return gap === 1 ? 'close' : 'behind';
}

/** The subject furthest below the offer, by its short name. */
function weakestSubject(c: StoryCampaign | null): string {
  if (c === null || c.aLevels.length === 0) return 'one subject';
  const worst = c.aLevels.reduce((w, p) => (aLevelGap(c, p) > aLevelGap(c, w) ? p : w));
  return SUBJECTS.find((s) => s.name === worst.subject)?.short ?? worst.subject;
}

export type TmuaVariant = 'strong' | 'fair' | 'rough' | 'unknown';

/** Act II's variant: the share of TMUA marks scored across the papers sat (raw marks; the TMUA has no grades). */
export function tmuaVariant(n: StoryNumbers): TmuaVariant {
  const t = n.campaign?.tmua ?? [];
  if (t.length === 0) return 'unknown';
  const share = t.reduce((a, p) => a + p.mark, 0) / t.reduce((a, p) => a + p.max, 0);
  if (share >= 0.7) return 'strong';
  return share >= 0.5 ? 'fair' : 'rough';
}

function tmuaBest(n: StoryNumbers): string {
  const t = n.campaign?.tmua ?? [];
  if (t.length === 0) return 'none marked';
  const b = t.reduce((w, p) => (p.mark / p.max > w.mark / w.max ? p : w));
  return `${b.mark}/${b.max}, ${b.name}`;
}

/** The mean of the mock interview marks out of 20, or null with none recorded. */
export function interviewMean(n: StoryNumbers): number | null {
  const m = n.campaign?.interviews ?? [];
  return m.length === 0 ? null : m.reduce((a, x) => a + x, 0) / m.length;
}

export type InterviewVariant = 'strong' | 'steady' | 'shaky';

/** Act IV's variant from the real interview mark (the mean of the mocks): 15 or more strong, 12 to 14 steady, under 12 shaky. With none recorded, steady. */
export function interviewVariant(n: StoryNumbers): InterviewVariant {
  const m = interviewMean(n);
  if (m === null) return 'steady';
  if (m >= 15) return 'strong';
  return m >= 12 ? 'steady' : 'shaky';
}

/** Results Day's variant: the real results against the offer. With no results known, missed. */
export function resultsVariant(n: StoryNumbers): OfferOutcome {
  return n.campaign === null ? 'missed' : offerOutcome(n.campaign);
}

/** Matriculation's variant: Priya is there when the relationship is at least friendly. */
export function matriculationVariant(_n: StoryNumbers, rel: Readonly<Relationships>): 'priya' | 'alone' {
  return rel.priya >= 1 ? 'priya' : 'alone';
}

/** The results that decide the offer, as a sentence: STEP for Mathematics, the A levels for Computer Science. */
export function resultsLine(c: StoryCampaign | null): string {
  if (c === null) return 'No results on record.';
  if (c.route === 'maths' && c.step.length > 0) return c.step.map((p) => `${p.name}: ${p.mark} of ${p.max}, grade ${p.grade ?? 'U'}.`).join(' ');
  const rows = c.conditions.filter((x) => x.label.startsWith('A level'));
  return rows.map((x) => `${x.label.replace('A level ', '')}: ${x.status === 'met' ? 'met' : x.status === 'short' ? 'short' : 'not sat'}.`).join(' ');
}

function conditionsMet(c: StoryCampaign | null): string {
  if (c === null || c.conditions.length === 0) return 'none on record';
  return `${c.conditions.filter((x) => x.status === 'met').length} of ${c.conditions.length}`;
}

/** The one condition short in a narrow miss, as "STEP 3, by one grade". */
function shortCondition(c: StoryCampaign | null): string {
  const x = c?.conditions.find((y) => y.status !== 'met');
  return x === undefined ? 'one condition' : `${x.label}, by one grade`;
}

const COURSE: Readonly<Record<StoryCampaign['route'], string>> = { maths: 'Mathematics', cs: 'Computer Science' };

function longDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' });
}

const triggered = (what: string): EndItem => ({ label: 'Triggered by', value: () => what });
const relItem = (who: RelId, label: string): EndItem => ({ label, value: (c) => moved(c, who) });

// ---------------------------------------------------------------- Book One, chapters 2 to 10

export const PROOF: Scene = {
  id: 'proof',
  book: 1,
  chapter: 2,
  kicker: 'Chapter 2',
  title: 'Proof',
  place: 'Brooklyn, 1:12 am, a Tuesday',
  art: 'desk-night',
  cast: ['priya'],
  trigger: { kind: 'chapter', chapterId: CS0_PROOF, name: 'CS-0 Proof' },
  script: {
    lines: [
      { kind: 'narration', text: 'The kitchen is dark. The lamp on the desk in the corner of the bedroom makes a small yellow room of its own.' },
      { kind: 'narration', text: 'At the top of the legal pad, underlined twice: prove that the square root of 2 is irrational.', fx: 'q' },
      { kind: 'inner', speaker: 'Albert', text: 'He has used this fact a thousand times. He has never once had to earn it.' },
      { kind: 'inner', speaker: 'Albert', text: 'Suppose it is rational. Then it is p over q, in lowest terms.', fx: 'l1' },
      { kind: 'inner', speaker: 'Albert', text: 'Square both sides: p squared is 2 times q squared. So p squared is even.', fx: 'l2' },
      { kind: 'narration', text: 'He writes "so p is even" and then, in the margin, "why?". An odd number squared is odd. So yes. He crosses out the question.', fx: 'why' },
      { kind: 'inner', speaker: 'Albert', text: 'Then p is 2k, and 4k squared is 2q squared, so q squared is 2k squared. So q is even too.', fx: 'l3' },
      { kind: 'inner', speaker: 'Albert', text: 'Both even. But they were in lowest terms.', fx: 'l4' },
      { kind: 'narration', text: 'The contradiction sits on the page like a bug found at last: not clever, just there, where it always was.', fx: 'qed' },
      {
        kind: 'inner', speaker: 'Albert',
        text: ({ n }) => `CS-0 Proof, done. ${plural(n.sectionsMastered, 'section', 'sections')} of the book mastered, and this is the first that felt like mathematics.`,
      },
      { kind: 'narration', text: 'It is 1:40 am. He photographs the page.' },
      {
        kind: 'choice',
        id: 'send',
        options: [
          {
            id: 'priya', text: 'Send it to Priya: "My first real proof. Be kind."', note: 'Priya will remember this', effects: { priya: 1 },
            reply: { kind: 'message', speaker: 'Priya', text: '"It is 1:40 am. It is also correct. Go to sleep."' },
          },
          { id: 'pin', text: 'Pin the page above the desk.', note: 'Keep it to yourself' },
          {
            id: 'next', text: 'Turn the page and start the next one.', note: 'Momentum',
            reply: { kind: 'inner', speaker: 'Albert', text: 'Prove there are infinitely many primes. Euclid again. Fine.' },
          },
        ],
      },
      { kind: 'narration', text: 'The radiator knocks twice, as if it had been waiting up.' },
    ],
    endCard: [
      { label: 'Sections mastered', value: (c) => String(c.n.sectionsMastered) },
      REP_ITEM,
      relItem('priya', 'Priya'),
      triggered('CS-0 Proof complete'),
    ],
  },
};

/** The Long Winter or Momentum: two planned weeks below the target, or not. */
export function winterVariant(n: StoryNumbers): 'winter' | 'momentum' {
  return n.weeksShort >= 2 ? 'winter' : 'momentum';
}

const W = ['winter'] as const;
const M = ['momentum'] as const;

export const LONG_WINTER: Scene = {
  id: 'long-winter',
  book: 1,
  chapter: 3,
  kicker: 'Chapter 3',
  title: 'The Long Winter (or Momentum)',
  place: 'Brooklyn, 9:40 pm, a Wednesday in February',
  art: 'window-winter',
  cast: ['priya'],
  trigger: { kind: 'termHalf', term: STAGE_A, name: 'Stage A' },
  script: {
    variant: winterVariant,
    titles: { winter: 'The Long Winter', momentum: 'Momentum' },
    lines: [
      { kind: 'narration', only: W, fx: 'grey', text: 'The snow on Fulton Street has gone to slush. The plan on the fridge says 36 hours a week.' },
      { kind: 'inner', only: W, speaker: 'Albert', text: 'Two weeks running, nowhere near it. The planner does not argue. It just shows the gaps.' },
      { kind: 'narration', only: W, text: 'The Further Mathematics book is open at the same page as Sunday.' },
      { kind: 'narration', only: M, fx: 'clear', text: 'Cold and clear. The plan on the fridge says 36 hours a week, and for once the ticks agree with it.' },
      { kind: 'inner', only: M, speaker: 'Albert', text: 'Halfway through Stage A. Nobody grades the middle of anything. He is grading it anyway.' },
      { kind: 'narration', text: 'The phone rings. Home.', fx: 'call' },
      { kind: 'spoken', only: W, speaker: 'Mom', text: '"You sound tired. Are you eating?"' },
      { kind: 'spoken', only: W, speaker: 'Albert', text: '"I\'m behind. Not by much. Enough to notice."' },
      { kind: 'spoken', only: W, speaker: 'Mom', text: '"You were behind in tenth grade too. That time you left. This time you\'re still at the table."' },
      { kind: 'spoken', only: M, speaker: 'Mom', text: '"You sound awake. That\'s new."' },
      { kind: 'spoken', only: M, speaker: 'Albert', text: '"Halfway through the first stage. On schedule, for once."' },
      { kind: 'spoken', only: M, speaker: 'Mom', text: '"Don\'t say it out loud. Your grandfather never said it out loud."' },
      { kind: 'narration', text: 'After the call, a message.' },
      { kind: 'message', speaker: 'Priya', text: '"Library on Sunday? I need someone to be disappointed in me in person."' },
      {
        kind: 'choice',
        id: 'sunday',
        options: [
          {
            id: 'yes', text: '"Sunday, ten. Bring the problem sheets."', note: 'Priya will remember this', effects: { priya: 1 },
            reply: { kind: 'message', speaker: 'Priya', text: '"Ten. I\'ll be the one with the organic chemistry and the face."' },
          },
          {
            id: 'company', text: '"Sunday. And honestly, I could use the company."', note: 'Let her in', effects: { priya: 2 },
            reply: { kind: 'message', speaker: 'Priya', text: '"Me too. Don\'t tell anyone."' },
          },
          {
            id: 'solo', text: '"Not this week. Head down."', note: 'Keep your head down', effects: { priya: -1 },
            reply: { kind: 'message', speaker: 'Priya', text: '"OK. Offer stands."' },
          },
        ],
      },
      { kind: 'inner', only: W, speaker: 'Albert', text: 'Half the stage left. The same hours as the first half, and fewer excuses.' },
      { kind: 'narration', only: W, text: 'He sets the alarm for 5:00 and, for the first time in two weeks, plans tomorrow before he sleeps.' },
      { kind: 'narration', only: M, text: 'He ticks off the evening block, sets the alarm for 5:00, and is asleep before ten.' },
    ],
    endCard: [
      { label: 'Hours that week', value: (c) => fmtHours(c.n.weekHours) },
      { label: 'Planned weeks below target', value: (c) => `${c.n.weeksShort} of the last 2` },
      REP_ITEM,
      relItem('priya', 'Priya'),
      triggered('halfway through Stage A'),
    ],
  },
};

const AHEAD = ['ahead'] as const;
const CLOSE = ['close'] as const;
const BEHIND = ['behind'] as const;

export const ACT_ONE: Scene = {
  id: 'act-1',
  book: 1,
  chapter: 4,
  kicker: 'Chapter 4',
  title: 'Act I: Recent Qualifications',
  place: 'Brooklyn, 7:30 pm, a Sunday in June',
  art: 'kitchen-results',
  cast: ['priya'],
  trigger: { kind: 'act', n: 1, name: 'Act I, Recent qualifications,' },
  script: {
    variant: aLevelVariant,
    lines: [
      { kind: 'narration', text: 'Every A level paper sat at this table, to the clock, with the phone in the other room.' },
      { kind: 'narration', text: 'The marks are in. On the screen, each paper against that year\'s published grade boundaries.', fx: 'marks' },
      {
        kind: 'inner', speaker: 'Albert',
        text: ({ n }) => {
          const c = n.campaign;
          const parts = SUBJECTS.flatMap((s) => {
            const ps = c?.aLevels.filter((p) => p.subject === s.name) ?? [];
            return ps.length === 0 ? [] : [`${s.short}, ${ps.map((p) => p.grade ?? 'U').join(' and ')}`];
          });
          return parts.length === 0 ? 'The marks are on the screen. He reads them slowly.' : `${parts.join('. ')}.`;
        },
      },
      { kind: 'inner', only: AHEAD, speaker: 'Albert', text: 'Every paper at or above what the offer will ask for. He reads it twice anyway, looking for the mistake.' },
      {
        kind: 'inner', only: CLOSE, speaker: 'Albert',
        text: ({ n }) => `${weakestSubject(n.campaign)} is a grade short of what the offer will ask. Close enough to fix. Far enough to matter.`,
      },
      {
        kind: 'inner', only: BEHIND, speaker: 'Albert',
        text: ({ n }) => `${weakestSubject(n.campaign)} is more than a grade short of what the offer will ask. That is not a verdict. It is a list of chapters.`,
      },
      { kind: 'narration', text: 'In the drawer, the GED certificate. Nineteen years between that piece of paper and these.', fx: 'cert' },
      { kind: 'narration', text: 'The phone buzzes.', fx: 'buzz' },
      { kind: 'message', speaker: 'Priya', text: '"Well? Don\'t make me ask twice."' },
      {
        kind: 'choice',
        id: 'tell',
        options: [
          {
            id: 'all', text: 'Send her every grade, the low ones too.', note: 'Priya will remember this', effects: { priya: 1 },
            reply: { kind: 'message', speaker: 'Priya', text: '"Honest and good. Now help me with my chemistry."' },
          },
          {
            id: 'best', text: 'Send the best one.', note: 'Play it safe',
            reply: { kind: 'message', speaker: 'Priya', text: '"And the others?"' },
          },
          {
            id: 'later', text: '"Later. I want to sit with them first."', note: 'Keep your cards close', effects: { priya: -1 },
            reply: { kind: 'message', speaker: 'Priya', text: '"Fine. Sit."' },
          },
        ],
      },
      { kind: 'narration', text: 'Act I is done. The next thing on the plan is a test with no partial credit.' },
    ],
    endCard: [
      ...SUBJECTS.map((s): EndItem => ({ label: s.short, value: (c) => subjectGrades(c.n.campaign, s.name) })),
      REP_ITEM,
      relItem('priya', 'Priya'),
      triggered('Act I complete'),
    ],
  },
};

const STRONG = ['strong'] as const;
const FAIR = ['fair'] as const;
const ROUGH = ['rough'] as const;

export const ACT_TWO: Scene = {
  id: 'act-2',
  book: 1,
  chapter: 5,
  kicker: 'Chapter 5',
  title: 'Act II: The Admissions Test',
  place: 'The A train to Manhattan, 6:52 am, a Wednesday in January',
  art: 'train-hall',
  cast: ['priya'],
  trigger: { kind: 'act', n: 2, name: 'Act II, The admissions test,' },
  script: {
    variant: tmuaVariant,
    lines: [
      { kind: 'narration', text: 'The A train at 6:52 am, nearly empty. A nurse coming off nights. A man asleep against the window. Albert, with a printed confirmation he has checked four times.' },
      { kind: 'inner', speaker: 'Albert', text: 'Two papers. Seventy-five minutes each, twenty questions each. No calculator. No partial credit.' },
      { kind: 'narration', text: 'He got on at Euclid Avenue. He has decided not to read anything into that.' },
      { kind: 'message', speaker: 'Priya', text: '"Mine is at one. Yours is at nine. Text me when you\'re out."' },
      {
        kind: 'choice',
        id: 'train',
        options: [
          {
            id: 'luck', text: '"I will. Good luck at one."', note: 'Priya will remember this', effects: { priya: 1 },
            reply: { kind: 'message', speaker: 'Priya', text: '"Luck is for people who didn\'t do the papers."' },
          },
          {
            id: 'boring', text: '"Didn\'t sleep. Tell me something boring."', note: 'Let her in', effects: { priya: 2 },
            reply: { kind: 'message', speaker: 'Priya', text: '"The Krebs cycle has eight steps. You\'re welcome."' },
          },
          { id: 'off', text: 'Turn the phone off. Read the formula sheet once more.', note: 'Focus' },
        ],
      },
      { kind: 'narration', text: 'Lower Manhattan, 8:40 am. An exam hall of identical screens, and a proctor reading the rules in a voice that has read them ten thousand times.', fx: 'hall' },
      { kind: 'inner', speaker: 'Albert', text: 'Question 7 is a trap he has seen before. Question 14 is one he has not.' },
      { kind: 'narration', text: 'Out on Broadway at 11:50 am, the cold is a relief.', fx: 'out' },
      {
        kind: 'choice',
        id: 'out',
        options: [
          {
            id: 'honest', text: '"Out. Question 14 got me. Your turn: go and get them."', note: 'Priya will remember this', effects: { priya: 1 },
            reply: { kind: 'message', speaker: 'Priya', text: '"One question. Fine. Going in."' },
          },
          {
            id: 'fine', text: '"Out. Fine."', note: 'Keep it short',
            reply: { kind: 'message', speaker: 'Priya', text: '"Fine is not a number. Tell me tonight."' },
          },
          { id: 'forget', text: 'Forget to text. Walk toward the coffee cart.', note: 'Keep your cards close', effects: { priya: -1 } },
        ],
      },
      { kind: 'inner', only: STRONG, speaker: 'Albert', text: ({ n }) => `The marks, when he checks them against the key: best ${tmuaBest(n)}. Most of what he trained for showed up.` },
      { kind: 'inner', only: FAIR, speaker: 'Albert', text: ({ n }) => `The marks, against the key: best ${tmuaBest(n)}. Respectable. Not yet the number he wants.` },
      { kind: 'inner', only: ROUGH, speaker: 'Albert', text: ({ n }) => `The marks, against the key: best ${tmuaBest(n)}. The clock beat him more than the questions did.` },
      { kind: 'inner', only: ['unknown'], speaker: 'Albert', text: 'He will check the marks tonight. Not now. Now, coffee.' },
      { kind: 'narration', text: 'He buys a coffee from a cart on Broadway and drinks it standing up, the way everyone else does.' },
    ],
    endCard: [
      { label: 'TMUA papers', value: (c) => String(c.n.campaign?.tmua.length ?? 0) },
      { label: 'Raw marks', value: (c) => (c.n.campaign?.tmua.length ? c.n.campaign.tmua.map((p) => `${p.mark}/${p.max}`).join(', ') : 'none marked') },
      { label: 'Best', value: (c) => tmuaBest(c.n) },
      REP_ITEM,
      relItem('priya', 'Priya'),
      triggered('Act II complete'),
    ],
  },
};

export const ACT_THREE: Scene = {
  id: 'act-3',
  book: 1,
  chapter: 6,
  kicker: 'Chapter 6',
  title: 'Act III: The Application',
  place: 'Brooklyn, 10:50 pm, a Sunday in January',
  art: 'kitchen-apply',
  cast: ['priya'],
  trigger: { kind: 'act', n: 3, name: 'Act III, The application,' },
  script: {
    lines: [
      { kind: 'narration', text: 'The deadline is in two days. The statement has been finished for three; he has rewritten the first line eleven times.' },
      { kind: 'narration', text: 'On the screen, the colleges of the University of New Cambridge, and the few among them that take students like him.', fx: 'college' },
      { kind: 'inner', speaker: 'Albert', text: 'Euclid College. Older students, a smaller court, a reputation for second chances.' },
      { kind: 'inner', speaker: 'Albert', text: 'And a Director of Studies, Dr Ada Lambda, whose papers he has read twice and understood once.' },
      { kind: 'narration', text: 'The statement, open in the other window. One line still to choose: the first.', fx: 'statement' },
      {
        kind: 'choice',
        id: 'first-line',
        options: [
          {
            id: 'bug', text: 'Lead with the kernel bug: what a week of debugging taught him about proof.', note: 'Dr Lambda will read this', effects: { lambda: 1 },
            reply: { kind: 'inner', speaker: 'Albert', text: 'It is the truest thing he knows about himself. It goes first.' },
          },
          {
            id: 'plain', text: 'Lead with the numbers: six years shipping C++, the papers sat.', note: 'Play it safe',
            reply: { kind: 'inner', speaker: 'Albert', text: 'Facts first. Let them do the arguing.' },
          },
          {
            id: 'priya', text: 'Send the draft to Priya before deciding.', note: 'Priya will remember this', effects: { priya: 1 },
            reply: { kind: 'message', speaker: 'Priya', text: '"Cut the second paragraph. Keep the bug. Submit it."' },
          },
        ],
      },
      { kind: 'narration', text: 'Course, college, statement, references. 11:58 pm. Submit.', fx: 'sent' },
      { kind: 'narration', text: 'The phone buzzes almost at once.', fx: 'buzz' },
      { kind: 'message', speaker: 'UCAS', text: '"Your application has been sent to your chosen university."' },
      { kind: 'inner', speaker: 'Albert', text: 'Sent. Not read, not accepted. Sent. He has shipped enough software to know the difference.' },
      { kind: 'narration', text: 'He turns off the lamp. It is Monday.' },
    ],
    endCard: [
      { label: 'Course', value: (c) => (c.n.campaign === null ? 'not on record' : COURSE[c.n.campaign.route]) },
      { label: 'College', value: () => 'Euclid College' },
      { label: 'Filed', value: (c) => { const at = c.n.campaign?.filedAt ?? null; return at === null ? 'not on record' : longDate(at); } },
      { label: 'Papers sat', value: (c) => String(c.n.papersSat) },
      { label: 'Days studied', value: (c) => String(c.n.daysStudied) },
      REP_ITEM,
      relItem('lambda', 'Dr Lambda'),
      relItem('priya', 'Priya'),
      triggered('Act III complete'),
    ],
  },
};

const I_STRONG = ['strong'] as const;
const I_STEADY = ['steady'] as const;
const I_SHAKY = ['shaky'] as const;

/** The interview's maths: which is larger, e to the pi or pi to the e? (a classic interview-style comparison). */
export const ACT_FOUR: Scene = {
  id: 'act-4',
  book: 1,
  chapter: 7,
  kicker: 'Chapter 7',
  title: 'Act IV: The Interview',
  place: 'A video call, 10:00 am, a Tuesday in April',
  art: 'video-call',
  cast: ['lambda'],
  trigger: { kind: 'act', n: 4, name: 'Act IV, The interview,' },
  script: {
    variant: interviewVariant,
    lines: [
      { kind: 'narration', text: '9:52 am. The laptop on two cookbooks, so the camera meets his eyes. A clean shirt. A glass of water he will not touch.' },
      { kind: 'narration', text: 'At 10:00 exactly, a window opens on a book-lined room in New Cambridge, where it is three in the afternoon.', fx: 'join' },
      { kind: 'spoken', speaker: 'Dr Lambda', text: '"Mr Burt. Ada Lambda. Thank you for getting up early for us. Shall we just do some mathematics?"' },
      { kind: 'spoken', speaker: 'Dr Lambda', text: '"Which is larger: e to the pi, or pi to the e? No calculator. Talk me through it."', fx: 'q' },
      { kind: 'inner', speaker: 'Albert', text: 'Both are about 23. That is no help at all.' },
      {
        kind: 'choice',
        id: 'stuck',
        options: [
          {
            id: 'aloud', text: 'Think out loud: "Take logs. I am comparing pi with e times log pi."', note: 'Dr Lambda will remember this', effects: { lambda: 1 },
            reply: { kind: 'spoken', speaker: 'Dr Lambda', text: '"Good. Keep going."', fx: 'logs' },
          },
          {
            id: 'numbers', text: '"Could I estimate both numerically?"', note: 'Reach for the numbers',
            reply: { kind: 'spoken', speaker: 'Dr Lambda', text: '"You could. I would rather see the idea."' },
          },
          {
            id: 'silent', text: 'Work in silence for a full minute.', note: 'Keep your cards close', effects: { lambda: -1 },
            reply: { kind: 'spoken', speaker: 'Dr Lambda', text: '"I can only mark what I can hear, Mr Burt."' },
          },
        ],
      },
      // Strong: he finds the function himself.
      { kind: 'inner', only: I_STRONG, speaker: 'Albert', text: 'Divide through by pi times e. Log pi over pi, against log e over e. The same function at two points.', fx: 'f' },
      { kind: 'spoken', only: I_STRONG, speaker: 'Albert', text: '"Take f of x equal to log x over x. The derivative is one minus log x, over x squared. So f is largest at x equals e."', fx: 'deriv' },
      { kind: 'spoken', only: I_STRONG, speaker: 'Albert', text: '"Pi is past the peak, so f of pi is less than one over e. That gives e log pi less than pi, so pi to the e is smaller. E to the pi is larger."', fx: 'done' },
      { kind: 'spoken', only: I_STRONG, speaker: 'Dr Lambda', text: '"Good. Now: for which pairs a less than b is a to the b bigger than b to the a?"' },
      { kind: 'narration', only: I_STRONG, text: 'They spend twenty minutes there, and for long stretches it feels like work he would do for nothing.' },
      // Steady: one hint.
      { kind: 'narration', only: I_STEADY, text: 'He writes both sides, takes logs, and stalls.' },
      { kind: 'spoken', only: I_STEADY, speaker: 'Dr Lambda', text: '"You have log pi on one side and pi on the other. Can you make it look like the same thing twice?"', fx: 'f' },
      { kind: 'inner', only: I_STEADY, speaker: 'Albert', text: 'Divide by pi times e. Log pi over pi, against log e over e. One function, two points.' },
      { kind: 'spoken', only: I_STEADY, speaker: 'Albert', text: '"Log x over x. Its derivative is one minus log x, over x squared: the maximum is at e. Pi is past it, so e to the pi is larger."', fx: 'deriv' },
      { kind: 'spoken', only: I_STEADY, speaker: 'Dr Lambda', text: '"Yes. It took a moment, but yes."', fx: 'done' },
      // Shaky: she gives him the function.
      { kind: 'narration', only: I_SHAKY, text: 'The logs go on the page and stay there. Ninety seconds pass, then more.' },
      { kind: 'spoken', only: I_SHAKY, speaker: 'Dr Lambda', text: '"Consider the function log x over x."', fx: 'f' },
      { kind: 'inner', only: I_SHAKY, speaker: 'Albert', text: 'Of course. Of course it is.' },
      { kind: 'spoken', only: I_SHAKY, speaker: 'Albert', text: '"Its derivative is one minus log x, over x squared. Zero at e, so that is the maximum."', fx: 'deriv' },
      { kind: 'spoken', only: I_SHAKY, speaker: 'Dr Lambda', text: '"And so?"' },
      { kind: 'spoken', only: I_SHAKY, speaker: 'Albert', text: '"So f of pi is less than f of e, and e to the pi is larger."', fx: 'done' },
      { kind: 'narration', only: I_SHAKY, text: 'It is right. It is also late, and both of them know it.' },
      { kind: 'spoken', speaker: 'Dr Lambda', text: '"Before we stop: is there anything you would like to ask me?"' },
      {
        kind: 'choice',
        id: 'ask',
        options: [
          {
            id: 'quicker', text: '"Is there a quicker way to do the comparison?"', note: 'Dr Lambda will remember this', effects: { lambda: 1 },
            reply: { kind: 'spoken', speaker: 'Dr Lambda', text: '"A neater one. E to the x is at least one plus x. Put x equal to pi over e, minus one, and see what falls out."' },
          },
          {
            id: 'supervision', text: '"What does a supervision with you look like?"', note: 'Dr Lambda will remember this', effects: { lambda: 1 },
            reply: { kind: 'spoken', speaker: 'Dr Lambda', text: '"Much like this. Less polite, and longer."' },
          },
          {
            id: 'none', text: '"No, thank you. You have been very clear."', note: 'Play it safe',
            reply: { kind: 'spoken', speaker: 'Dr Lambda', text: '"Very well."' },
          },
        ],
      },
      { kind: 'spoken', speaker: 'Dr Lambda', text: '"Thank you, Mr Burt. You will hear from the College."' },
      { kind: 'narration', text: 'The window closes. The kitchen is very quiet.', fx: 'end' },
      { kind: 'inner', only: I_STRONG, speaker: 'Albert', text: 'He thinks it went well, and does not trust the thought.' },
      { kind: 'inner', only: I_STEADY, speaker: 'Albert', text: 'Somewhere in the middle he stopped being nervous. He hopes she noticed.' },
      { kind: 'inner', only: I_SHAKY, speaker: 'Albert', text: 'He replays the ninety seconds for the rest of the day.' },
    ],
    endCard: [
      { label: 'Interview marks', value: (c) => (c.n.campaign?.interviews.length ? `${c.n.campaign.interviews.join(' and ')} of 20` : 'not recorded') },
      { label: 'Mean', value: (c) => { const m = interviewMean(c.n); return m === null ? 'not recorded' : `${fmt1(m)} of 20, ${interviewVariant(c.n)}`; } },
      REP_ITEM,
      relItem('lambda', 'Dr Lambda'),
      triggered('Act IV complete'),
    ],
  },
};

export const THE_OFFER: Scene = {
  id: 'the-offer',
  book: 1,
  chapter: 8,
  kicker: 'Chapter 8',
  title: 'The Offer',
  place: 'Brooklyn, 6:12 am, a Thursday in late April',
  art: 'kitchen-offer',
  cast: ['priya'],
  trigger: { kind: 'letter', id: 'offer', name: 'the offer letter' },
  script: {
    variant: interviewVariant,
    lines: [
      { kind: 'narration', text: 'The email arrives at 11:02 am in New Cambridge. In Brooklyn it is 6:02, and he is already up.', fx: 'mail' },
      { kind: 'inner', only: I_STRONG, speaker: 'Albert', text: 'All week he has told himself not to expect anything. He has failed.' },
      { kind: 'inner', only: I_STEADY, speaker: 'Albert', text: 'He opens it the way he opens a production alert: fast, braced.' },
      { kind: 'inner', only: I_SHAKY, speaker: 'Albert', text: 'After the interview he decided it was over. He opens it anyway, to have it done.' },
      { kind: 'narration', text: 'A letter on the College\'s paper, with the University\'s arms at the top.', fx: 'offer-letter' },
      {
        kind: 'inner', speaker: 'Albert',
        text: ({ n }) => {
          const k = n.campaign?.conditions.length ?? 0;
          return k === 0 ? 'A conditional offer. He reads every word.' : `A conditional offer. ${plural(k, 'condition', 'conditions')}. He reads every one.`;
        },
      },
      {
        kind: 'inner', speaker: 'Albert',
        text: ({ n }) => (n.campaign?.route === 'cs'
          ? 'A star, A star, A. The papers he has been sitting at this table since the winter.'
          : 'Grade 1 in STEP 2 and STEP 3. The papers he started on at this table, in the dark.'),
      },
      { kind: 'narration', text: 'Signed by Dr E. Noether-Gauss, Admissions Tutor, Euclid College.' },
      { kind: 'inner', speaker: 'Albert', text: 'An offer, not a place. A promise with conditions, like every good contract.' },
      {
        kind: 'choice',
        id: 'tell',
        options: [
          {
            id: 'priya', text: 'Send Priya a photo of the letter.', note: 'Priya will remember this', effects: { priya: 1 },
            reply: { kind: 'message', speaker: 'Priya', text: '"!!! Now pass STEP. No pressure."' },
          },
          {
            id: 'lambda', text: 'Write two lines of thanks to Dr Lambda.', note: 'Dr Lambda will remember this', effects: { lambda: 1 },
            reply: { kind: 'narration', text: 'Two lines. He rewrites them four times and sends them anyway.' },
          },
          {
            id: 'home', text: 'Call home.', note: 'Family first',
            reply: { kind: 'spoken', speaker: 'Mom', text: '"Read it to me again. Slowly."' },
          },
        ],
      },
      { kind: 'narration', text: 'He closes the letter, opens a past STEP paper, and sets the timer for three hours.', fx: 'offer-away' },
    ],
    endCard: [
      { label: 'Conditions', value: (c) => String(c.n.campaign?.conditions.length ?? 0) },
      { label: 'Course', value: (c) => (c.n.campaign === null ? 'not on record' : COURSE[c.n.campaign.route]) },
      { label: 'Entry', value: (c) => { const y = c.n.campaign?.entry ?? null; return y === null ? 'not projected' : `October ${y}`; } },
      { label: 'Interview mean', value: (c) => { const m = interviewMean(c.n); return m === null ? 'not recorded' : `${fmt1(m)} of 20`; } },
      REP_ITEM,
      relItem('priya', 'Priya'),
      relItem('lambda', 'Dr Lambda'),
      triggered('the offer letter'),
    ],
  },
};

const R_MET = ['met'] as const;
const R_NARROW = ['narrow'] as const;
const R_MISSED = ['missed'] as const;
const R_PLACE = ['met', 'narrow'] as const;

export const RESULTS_DAY: Scene = {
  id: 'results-day',
  book: 1,
  chapter: 9,
  kicker: 'Chapter 9',
  title: 'Results Day',
  place: 'Brooklyn, 3:00 am, a Thursday in August',
  art: 'senate-board',
  cast: ['priya'],
  trigger: { kind: 'letter', id: 'results', name: 'the results letter' },
  script: {
    variant: resultsVariant,
    lines: [
      { kind: 'narration', text: 'At 8:00 am in New Cambridge, a porter pins the lists to the board in Senate Court.' },
      { kind: 'narration', text: 'In Brooklyn it is 3:00 am. He has been awake since two.', fx: 'phone' },
      { kind: 'inner', speaker: 'Albert', text: 'Refresh. Refresh.' },
      { kind: 'narration', text: ({ n }) => resultsLine(n.campaign), fx: 'grades' },
      { kind: 'inner', only: R_MET, speaker: 'Albert', text: 'Every condition. He reads it three times, then once more with the light on.' },
      { kind: 'narration', only: R_MET, text: 'The status changes from Conditional to Confirmed. The College has its answer, and so does he.', fx: 'confirm' },
      { kind: 'spoken', only: R_MET, speaker: 'Albert', text: '"OK." To nobody. Then again, louder: "OK."' },
      { kind: 'inner', only: R_NARROW, speaker: 'Albert', text: ({ n }) => `One condition short: ${shortCondition(n.campaign)}.` },
      { kind: 'narration', only: R_NARROW, text: 'The status says only: Conditional. Under review.' },
      { kind: 'narration', only: R_NARROW, text: 'He makes coffee. He does not drink it. He reads the offer letter again, as if the conditions might have changed overnight.' },
      { kind: 'narration', only: R_NARROW, text: 'At 9:40 am, Brooklyn time, the phone rings with a New Cambridge number.', fx: 'ring' },
      { kind: 'spoken', only: R_NARROW, speaker: 'Dr Noether-Gauss', text: '"Mr Burt. The Committee has looked at everything: the interview, the other papers, the statement. We are pleased to confirm your place."', fx: 'confirm' },
      { kind: 'inner', only: R_NARROW, speaker: 'Albert', text: 'Pleased. He writes the word down, so he will believe it later.' },
      { kind: 'inner', only: R_MISSED, speaker: 'Albert', text: 'Short on more than a college can overlook.' },
      { kind: 'narration', only: R_MISSED, text: 'At 10:15 am, Brooklyn time, a New Cambridge number.', fx: 'ring' },
      {
        kind: 'spoken', only: R_MISSED, speaker: 'Dr Noether-Gauss',
        text: '"Mr Burt. I am sorry: the conditions were not met this year. The College will hold a deferred place for you, on the same conditions, if you sit the papers again."',
      },
      { kind: 'inner', only: R_MISSED, speaker: 'Albert', text: 'Not a no. A year. He has spent nineteen of those already. He can find one more.' },
      { kind: 'spoken', only: R_MISSED, speaker: 'Albert', text: '"I will take it. Thank you."' },
      { kind: 'message', speaker: 'Priya', text: '"Results?"' },
      {
        kind: 'choice',
        id: 'priya',
        options: [
          {
            id: 'call', text: 'Call her. It is 3 am; she is awake too.', note: 'Priya will remember this', effects: { priya: 1 },
            reply: { kind: 'spoken', speaker: 'Priya', text: '"You first. No. Me first. No, you."' },
          },
          {
            id: 'text', text: 'Send the grades and nothing else.', note: 'Keep it short',
            reply: { kind: 'message', speaker: 'Priya', text: '"Mine are in too. Call me when you can talk."' },
          },
          {
            id: 'later', text: 'Not yet. Sit with it until the sun is up.', note: 'Keep your cards close', effects: { priya: -1 },
          },
        ],
      },
      { kind: 'narration', only: R_PLACE, text: 'Outside, the first train rattles over the bridge. In October he is going to New Cambridge.' },
      { kind: 'narration', only: R_MISSED, text: 'Outside, the first train rattles over the bridge. He opens next year\'s calendar and starts counting weeks.' },
    ],
    endCard: [
      { label: 'Results', value: (c) => resultsLine(c.n.campaign) },
      { label: 'Conditions met', value: (c) => conditionsMet(c.n.campaign) },
      {
        label: 'The College',
        value: (c) => {
          const v = resultsVariant(c.n);
          return v === 'met' ? 'place confirmed' : v === 'narrow' ? 'place confirmed after review' : 'deferred place, same conditions';
        },
      },
      REP_ITEM,
      relItem('priya', 'Priya'),
      triggered('the results letter'),
    ],
  },
};

const WITH_PRIYA = ['priya'] as const;
const ALONE = ['alone'] as const;

export const MATRICULATION: Scene = {
  id: 'matriculation',
  book: 1,
  chapter: 10,
  kicker: 'Chapter 10',
  title: 'Matriculation',
  place: 'Euclid College, 2:30 pm, a Monday in October',
  art: 'college-gate',
  cast: ['priya'],
  trigger: { kind: 'confirmed' },
  script: {
    variant: matriculationVariant,
    lines: [
      { kind: 'narration', text: 'The taxi from the station leaves him at the gate with one suitcase and a box of books he was told not to bring.' },
      { kind: 'narration', text: 'At the gate, in a gown that has seen forty Octobers, stands Dr E. Noether-Gauss.', fx: 'tutor' },
      { kind: 'spoken', speaker: 'Dr Noether-Gauss', text: '"Mr Burt. We have met on paper. Welcome to Euclid."' },
      {
        kind: 'choice',
        id: 'gate',
        options: [
          {
            id: 'lambda', text: '"Is Dr Lambda in today? I owe her a proof."', note: 'Dr Lambda will remember this', effects: { lambda: 1 },
            reply: { kind: 'spoken', speaker: 'Dr Noether-Gauss', text: '"She is. She has asked twice this morning whether you had arrived."' },
          },
          {
            id: 'paperwork', text: '"Thank you. I will try to be worth the paperwork."', note: 'Modest',
            reply: { kind: 'spoken', speaker: 'Dr Noether-Gauss', text: '"The best ones usually say that."' },
          },
        ],
      },
      { kind: 'narration', text: 'Through the arch: the court, a lawn nobody walks on, and a copper beech gone red.', fx: 'court' },
      { kind: 'narration', text: 'In the Porters\' Lodge, a gown on a hanger with his name on the tag. The sleeves are too long. He does not care.', fx: 'gown' },
      { kind: 'narration', only: WITH_PRIYA, text: 'Across the court, a familiar wave. Priya, in a gown of her own: Natural Sciences, the same year.', fx: 'priya' },
      { kind: 'spoken', only: WITH_PRIYA, speaker: 'Priya', text: '"You came. I had a bet with myself."' },
      { kind: 'spoken', only: WITH_PRIYA, speaker: 'Albert', text: '"Who won?"' },
      { kind: 'spoken', only: WITH_PRIYA, speaker: 'Priya', text: '"Both of us, apparently."' },
      { kind: 'narration', only: ALONE, text: 'Somewhere across the city, Priya is matriculating too. They have not said much since the spring. He sends her a photo of the gate.' },
      { kind: 'narration', text: 'The matriculation photograph, 4:00 pm. Three rows on the steps of Hall: freshers of nineteen, and in the back row a man from Brooklyn who is told twice to stop squinting.', fx: 'photo' },
      { kind: 'inner', speaker: 'Albert', text: ({ n }) => `${plural(n.daysStudied, 'day', 'days')} of study to get here. ${plural(n.papersSat, 'paper', 'papers')} sat to the clock. He counted.` },
      { kind: 'narration', text: 'Tomorrow, the first supervision. Tonight, Hall.' },
    ],
    endCard: [
      { label: 'Days studied', value: (c) => String(c.n.daysStudied) },
      { label: 'Sections mastered', value: (c) => String(c.n.sectionsMastered) },
      { label: 'Papers sat', value: (c) => String(c.n.papersSat) },
      REP_ITEM,
      relItem('priya', 'Priya'),
      relItem('lambda', 'Dr Lambda'),
      triggered('your place confirmed'),
    ],
  },
};

// ---------------------------------------------------------------- side scenes, unlocked by choices

/** Unlocked by First Light's "Want to do Block 2 together? Thursday night?". */
export const THURSDAY_NIGHT: Scene = {
  id: 'thursday-night',
  strand: 'side',
  book: 1,
  chapter: 1,
  kicker: 'Side scene',
  title: 'Thursday Night',
  place: 'Brooklyn, 7:30 pm, a Thursday',
  art: 'kitchen-night',
  cast: ['priya'],
  trigger: {
    kind: 'side', after: 'first-light', need: { kind: 'choice', scene: 'first-light', point: 'reply', option: 'together' },
    name: 'after First Light, if you asked Priya to study together',
  },
  script: {
    lines: [
      { kind: 'narration', text: 'Thursday, 7:30 pm. Priya arrives with two coffees, a stack of problem sheets, and the posture of someone used to twelve-hour shifts.' },
      { kind: 'spoken', speaker: 'Priya', text: '"Block 2. Three fair coins: what is the chance of at least one head? I keep getting three halves, which I am told is not allowed."' },
      { kind: 'inner', speaker: 'Albert', text: 'Three halves. She added the three chances, as if two heads could never land together.' },
      {
        kind: 'choice',
        id: 'explain',
        options: [
          {
            id: 'ask', text: '"Before any formula: how many ways can three coins land?"', note: 'Let her find it', effects: { priya: 2 },
            reply: { kind: 'spoken', speaker: 'Priya', text: '"Eight. And only one of them has no heads at all. Oh. Seven eighths."' },
          },
          {
            id: 'complement', text: 'Show her the complement: one minus the chance of no heads.', note: 'Priya will remember this', effects: { priya: 1 },
            reply: { kind: 'spoken', speaker: 'Albert', text: '"No heads means three tails: a half, cubed, is an eighth. So at least one head is one minus an eighth. Seven eighths."' },
          },
          {
            id: 'answer', text: '"Seven eighths. Next question?"', note: 'Keep it moving', effects: { priya: -1 },
            reply: { kind: 'spoken', speaker: 'Priya', text: '"I did not ask for the answer. I asked why."' },
          },
        ],
      },
      { kind: 'narration', text: 'By ten they have done the whole sheet. She is faster at the counting; he is faster at the algebra. Neither says so.' },
      { kind: 'spoken', speaker: 'Priya', text: '"Same time next week?"' },
      { kind: 'inner', speaker: 'Albert', text: ({ n }) => `${plural(n.sectionsMastered, 'section', 'sections')} of the book mastered, and for once somebody else at the table.` },
      { kind: 'narration', text: 'He washes two mugs instead of one.' },
    ],
    endCard: [
      { label: 'Sections mastered', value: (c) => String(c.n.sectionsMastered) },
      REP_ITEM,
      relItem('priya', 'Priya'),
      triggered('First Light, and the study night you asked for'),
    ],
  },
};

/** Unlocked after The Offer when Dr Lambda thinks well of him: two or more from his choices with her. */
export const A_REPLY: Scene = {
  id: 'a-reply',
  strand: 'side',
  book: 1,
  chapter: 8,
  kicker: 'Side scene',
  title: 'A Reply',
  place: 'Brooklyn, 9:15 pm, a Monday in May',
  art: 'desk-night',
  cast: ['lambda', 'priya'],
  trigger: {
    kind: 'side', after: 'the-offer', need: { kind: 'rel', who: 'lambda', atLeast: 2 },
    name: 'after The Offer, if Dr Lambda thinks well of you',
  },
  script: {
    lines: [
      { kind: 'narration', text: 'An email from the College, sent at 2:15 am in New Cambridge, an hour when nobody there should be awake.' },
      { kind: 'message', speaker: 'Dr Lambda', text: '"Mr Burt. Thank you for your note. Something for the summer, before October."' },
      { kind: 'message', speaker: 'Dr Lambda', text: '"Show that between any two different rational numbers there is an irrational one."', fx: 'q' },
      { kind: 'inner', speaker: 'Albert', text: 'He has proved exactly one number irrational in his life. One is enough, if he uses it well.' },
      { kind: 'inner', speaker: 'Albert', text: 'Take rationals a less than b. The gap, b minus a, is rational and positive. Divide it by root 2. If that were rational, root 2 would be the gap over a rational, so rational. It is not. So the step is irrational.' },
      { kind: 'inner', speaker: 'Albert', text: 'Then a plus the step is irrational too: subtract a from a rational and you get a rational. And root 2 is bigger than 1, so the step is smaller than the gap. It lands strictly between a and b.', fx: 'qed' },
      {
        kind: 'choice',
        id: 'send',
        options: [
          {
            id: 'clean', text: 'Sleep on it. Write it out clean in the morning, every step justified.', note: 'Dr Lambda will remember this', effects: { lambda: 1 },
            reply: { kind: 'narration', text: 'Her answer comes before lunch: "Correct, and properly written. See you in October."' },
          },
          {
            id: 'now', text: 'Send it tonight, as it stands.', note: 'Ship it',
            reply: { kind: 'narration', text: 'Her answer is waiting at 6:00 am: "Correct. Next time, write the reasons as sentences, not arrows."' },
          },
          {
            id: 'priya', text: 'Send it to Priya first, to read cold.', note: 'Priya will remember this', effects: { priya: 1 },
            reply: { kind: 'message', speaker: 'Priya', text: '"I understood every line. Either it is very good or I am getting smarter."' },
          },
        ],
      },
      { kind: 'narration', text: 'He prints the email and puts it in the drawer, on top of the GED certificate.' },
    ],
    endCard: [
      REP_ITEM,
      relItem('lambda', 'Dr Lambda'),
      relItem('priya', 'Priya'),
      triggered('The Offer, and Dr Lambda\'s regard'),
    ],
  },
};

// ---------------------------------------------------------------- beats, when a rating rises past a threshold

/** A beat's end card: the rating it marks, REP, and what triggered it. */
const beatCard = (label: string, at: number): readonly EndItem[] => [
  { label, value: () => `${at} reached` },
  REP_ITEM,
  triggered(`${label} reaching ${at}`),
];

export const BEAT_PROOF: Scene = {
  id: 'beat-proof-70',
  strand: 'beat',
  book: 1,
  chapter: 0,
  kicker: 'Beat',
  title: 'The Margin',
  place: 'Brooklyn, 11:20 pm, a Tuesday',
  art: 'desk-night',
  cast: [],
  trigger: { kind: 'rating', rating: 'proof', at: 70 },
  script: {
    lines: [
      { kind: 'narration', text: 'Filing old notes, he finds the page from the night he proved root 2 irrational.', fx: 'q' },
      { kind: 'narration', text: 'The "why?" is still in the margin, in red.', fx: 'why' },
      { kind: 'inner', speaker: 'Albert', text: 'He reads it as a stranger would. Two steps asserted, not shown. He would not let himself write them that way now.' },
      { kind: 'narration', text: 'He fills the gaps in pencil, in a neater hand than the original.', fx: 'qed' },
      { kind: 'inner', speaker: 'Albert', text: 'Proof, 70. It means one thing: he can see what is missing.' },
    ],
    endCard: beatCard('Proof rating', 70),
  },
};

export const BEAT_TEMPERAMENT: Scene = {
  id: 'beat-temperament-70',
  strand: 'beat',
  book: 1,
  chapter: 0,
  kicker: 'Beat',
  title: 'The Clock',
  place: 'Brooklyn, 8:05 am, a Sunday',
  art: 'kitchen-dawn',
  cast: [],
  trigger: { kind: 'rating', rating: 'temperament', at: 70 },
  script: {
    lines: [
      { kind: 'narration', text: 'Three hours on the timer. A past paper face down. The phone in the other room.' },
      { kind: 'inner', speaker: 'Albert', text: 'In the first months he looked at the clock after every question. Then after every page.' },
      { kind: 'narration', text: 'Today he looks up once, at the halfway mark, and he is where he planned to be.' },
      { kind: 'inner', speaker: 'Albert', text: 'Exam Temperament, 70. The clock is just a clock now.' },
    ],
    endCard: beatCard('Exam Temperament', 70),
  },
};

export const BEAT_OVERALL: Scene = {
  id: 'beat-overall-60',
  strand: 'beat',
  book: 1,
  chapter: 0,
  kicker: 'Beat',
  title: 'Sixty',
  place: 'Brooklyn, 6:15 am, a Wednesday',
  art: 'kitchen-night',
  cast: [],
  trigger: { kind: 'rating', rating: 'overall', at: 60 },
  script: {
    lines: [
      { kind: 'narration', text: 'On the Story tab, under six thin bars, one number: 60.' },
      { kind: 'inner', speaker: 'Albert', text: 'In the basketball video games he played at nineteen, a 60 was a bench player. Somebody who gets minutes because he earned them.' },
      { kind: 'inner', speaker: 'Albert', text: 'Nobody is drafted at 60. Nobody stays there either, unless they stop.' },
      { kind: 'narration', text: 'He opens the next lesson.' },
    ],
    endCard: beatCard('Overall rating', 60),
  },
};

/** Every scene: the main storyline in story order, then the side scenes and the beats. */
export const SCENES: readonly Scene[] = [
  PROLOGUE, FIRST_LIGHT, PROOF, LONG_WINTER, ACT_ONE, ACT_TWO, ACT_THREE, ACT_FOUR, THE_OFFER, RESULTS_DAY, MATRICULATION,
  THURSDAY_NIGHT, A_REPLY,
  BEAT_PROOF, BEAT_TEMPERAMENT, BEAT_OVERALL,
];

export const BOOKS: readonly { n: number; title: string }[] = [
  { n: 0, title: 'Prologue' },
  { n: 1, title: 'Book One: Preparation' },
];

/** The books after Book One, named so the Story tab shows where the story goes. */
export const LATER_BOOKS: readonly string[] = ['Book Two: Part IA', 'Book Three: Part IB', 'Book Four: Part II'];

export function sceneById(id: string): Scene | undefined {
  return SCENES.find((s) => s.id === id);
}
