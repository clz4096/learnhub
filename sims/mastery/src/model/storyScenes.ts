/**
 * The scenes, in story order (mastery/DESIGN-STORY.md, "The storyline"): the Prologue,
 * then Book One: Preparation. Written scenes carry a script; the rest are listed with
 * their real triggers and stay locked until they are written (build step 2).
 */
import { slug } from '@learnhub/content/book';
import { TARGET_WEEK_HOURS } from './campaignCalendar';
import { relationWord, repLevel, type EndContext, type EndItem, type Scene, type StoryNumbers } from './story';

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

function moved(c: EndContext, who: 'priya'): string {
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

type StubSpec = Pick<Scene, 'id' | 'chapter' | 'title' | 'place' | 'cast' | 'trigger'>;
const stub = (s: StubSpec): Scene => ({ ...s, book: 1, kicker: `Chapter ${s.chapter}`, art: null, script: null });

/** Book One after its first scene: listed with real triggers, not yet written. */
const BOOK_ONE_STUBS: readonly Scene[] = ([
  { id: 'proof', chapter: 2, title: 'Proof', place: 'Brooklyn, late', cast: [], trigger: { kind: 'chapter', chapterId: CS0_PROOF, name: 'CS-0 Proof' } },
  {
    id: 'long-winter', chapter: 3, title: 'The Long Winter (or Momentum)', place: 'Brooklyn, February', cast: [],
    trigger: { kind: 'termHalf', term: STAGE_A, name: 'Stage A' },
  },
  { id: 'act-1', chapter: 4, title: 'Act I: Recent Qualifications', place: 'Brooklyn', cast: [], trigger: { kind: 'act', n: 1, name: 'Act I, Recent qualifications,' } },
  { id: 'act-2', chapter: 5, title: 'Act II: The Admissions Test', place: 'An exam hall in Manhattan', cast: [], trigger: { kind: 'act', n: 2, name: 'Act II, The admissions test,' } },
  { id: 'act-3', chapter: 6, title: 'Act III: The Application', place: 'Brooklyn', cast: [], trigger: { kind: 'act', n: 3, name: 'Act III, The application,' } },
  { id: 'act-4', chapter: 7, title: 'Act IV: The Interview', place: 'A video call', cast: ['lambda'], trigger: { kind: 'act', n: 4, name: 'Act IV, The interview,' } },
  { id: 'the-offer', chapter: 8, title: 'The Offer', place: 'Brooklyn', cast: [], trigger: { kind: 'letter', id: 'offer', name: 'the offer letter' } },
  { id: 'results-day', chapter: 9, title: 'Results Day', place: 'Brooklyn', cast: [], trigger: { kind: 'letter', id: 'results', name: 'the results letter' } },
  { id: 'matriculation', chapter: 10, title: 'Matriculation', place: 'Euclid College', cast: [], trigger: { kind: 'act', n: 5, name: 'Act V, The offer and results,' } },
] satisfies StubSpec[]).map(stub);

/** Every scene, in story order. */
export const SCENES: readonly Scene[] = [PROLOGUE, FIRST_LIGHT, ...BOOK_ONE_STUBS];

export const BOOKS: readonly { n: number; title: string }[] = [
  { n: 0, title: 'Prologue' },
  { n: 1, title: 'Book One: Preparation' },
];

/** The books after Book One, named so the Story tab shows where the story goes. */
export const LATER_BOOKS: readonly string[] = ['Book Two: Part IA', 'Book Three: Part IB', 'Book Four: Part II'];

export function sceneById(id: string): Scene | undefined {
  return SCENES.find((s) => s.id === id);
}
