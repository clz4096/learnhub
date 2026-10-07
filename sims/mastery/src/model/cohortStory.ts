/**
 * The cohort in the story: short beats when Albert misses a standup or falls far behind the
 * cohort, and when a classmate hears from Cambridge or gets their results. The beats are
 * ordinary scenes (story.ts), triggered by the events `cohortEvents` lists; a classmate's
 * beats are made from their simulated campaign (cohort.ts), one per event, so only the
 * outcomes that happen have a scene. Titles name the classmate, never the outcome, so the
 * Story tab's locked list gives nothing away.
 */
import { isMastered, type GateDoc } from '@learnhub/mastery';
import { gateOf } from '@learnhub/content';
import { BOOK_ORDER } from '@learnhub/content/book';
import {
  CLASSMATES, campaignEvents, eventsBy, farBehind, standing,
  type Classmate, type CohortEvent, type CohortEventKind, type StandingRow,
} from './cohort';
import { addDays, weekdayOf } from './day';
import { missedStandups, type Schedule } from './standup';
import { repLevel, type EndContext, type EndItem, type Line, type Scene } from './story';

// ---------------------------------------------------------------- Albert against the cohort

/** Albert's book topics learned (drills passed) and mastered (gate met), counted as the cohort's are. */
export function albertCounts(p: GateDoc | null): { learned: number; gated: number } {
  if (p === null) return { learned: 0, gated: 0 };
  let learned = 0;
  let gated = 0;
  for (const id of BOOK_ORDER) {
    if (p.memory[id] === undefined) continue;
    learned++;
    if (isMastered(p, id, gateOf(id))) gated++;
  }
  return { learned, gated };
}

/** The cohort's standing on `date` with Albert in it. */
export function albertStanding(p: GateDoc | null, date: string): { rows: StandingRow[]; rank: number } {
  const rows = standing(date, albertCounts(p));
  return { rows, rank: rows.find((r) => r.id === 'albert')?.rank ?? rows.length };
}

// ---------------------------------------------------------------- the events

export const MISSED_ONE = 'missed-standup';
export const MISSED_THREE = 'missed-three';
export const FAR_BEHIND = 'far-behind';
/** Three standups missed within this many days plays the second beat. */
export const MISSED_WINDOW_DAYS = 14;
/** Falling behind takes time: Albert is not "far behind" until this many days after `since`, whatever the counts. */
export const BEHIND_GRACE_DAYS = 28;

export interface CohortInputs {
  p: GateDoc | null;
  /** Plan date and plan minute now. */
  today: string;
  nowMin: number;
  settings: Schedule;
  attended: ReadonlySet<string>;
  /** The first day standups count as missed from, and the day Albert's own pace is counted from. */
  since: string;
}

/** Every cohort event so far, as the story's triggers read them. */
export function cohortEvents(x: CohortInputs): string[] {
  const out = eventsBy(x.today).map((e) => e.id);
  const missed = missedStandups(x.since, x.today, x.nowMin, x.attended, x.settings);
  if (missed.length > 0) out.push(MISSED_ONE);
  for (let i = 2; i < missed.length; i++) {
    const span = (Date.parse(missed[i] as string) - Date.parse(missed[i - 2] as string)) / 86_400_000;
    if (span < MISSED_WINDOW_DAYS) {
      out.push(MISSED_THREE);
      break;
    }
  }
  if (x.today >= addDays(x.since, BEHIND_GRACE_DAYS) && farBehind(x.today, albertCounts(x.p).gated)) out.push(FAR_BEHIND);
  return out;
}

// ---------------------------------------------------------------- the scenes

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function repValue(c: EndContext): string {
  const gain = c.repBefore !== null && c.rep > c.repBefore ? ` (+${c.rep - c.repBefore})` : '';
  return `${c.rep} · ${repLevel(c.rep).name}${gain}`;
}

const card = (what: string, extra: EndItem[] = []): readonly EndItem[] => [
  ...extra,
  { label: 'REP', value: repValue },
  { label: 'Triggered by', value: () => what },
];

const beat = (id: string, title: string, place: string, event: string, name: string, lines: Line[], what: string, extra: EndItem[] = []): Scene => ({
  id, strand: 'beat', book: 1, chapter: 0, kicker: 'Beat', title, place, art: 'desk-night', cast: [],
  trigger: { kind: 'cohort', event, name },
  script: { lines, endCard: card(what, extra) },
});

export const BEAT_MISSED: Scene = beat(
  'cohort-missed-standup', 'The Empty Square', 'Brooklyn, 10:25 am, a Tuesday', MISSED_ONE, 'when you miss a standup',
  [
    { kind: 'narration', text: 'The call ended ten minutes ago. Six faces in a grid, and one square with his initials in it.' },
    { kind: 'message', speaker: 'Marcus', text: '"Missed you at standup. All good?"' },
    { kind: 'message', speaker: 'Grace', text: '"We saved you a square. Tomorrow."' },
    { kind: 'inner', speaker: 'Albert', text: 'Fifteen minutes. The one meeting a day he does not have to be clever in. Just honest.' },
  ],
  'A standup missed',
);

export const BEAT_MISSED_THREE: Scene = beat(
  'cohort-missed-three', 'A Note from the Programme', 'Brooklyn, 9:10 pm, a Wednesday', MISSED_THREE, 'when you miss three standups in two weeks',
  [
    { kind: 'narration', text: 'An email from the programme director, short and kind, which is worse.' },
    { kind: 'message', speaker: 'Ruth Halloran', text: '"Three standups in two weeks. Nobody is grading attendance. The cohort works because everyone shows up and says where they are stuck."' },
    { kind: 'message', speaker: 'Ruth Halloran', text: '"See you tomorrow morning. Say one true sentence. That is the whole job."' },
    { kind: 'inner', speaker: 'Albert', text: 'He sets an alarm for five minutes before standup and puts the phone face down.' },
  ],
  'Three standups missed in two weeks',
);

export const BEAT_FAR_BEHIND: Scene = beat(
  'cohort-far-behind', 'The Board', 'Brooklyn, 11:40 pm, a Monday', FAR_BEHIND, 'when you fall far behind the cohort',
  [
    { kind: 'narration', text: 'The programme keeps a shared board: each name, and the topics mastered beside it.' },
    { kind: 'narration', text: 'He scrolls to find his own. It is further down than he thought.' },
    { kind: 'inner', speaker: 'Albert', text: 'It is not a race. Except that the interviews are on the same day for all of us.' },
    { kind: 'inner', speaker: 'Albert', text: 'One gate problem tonight. Then another tomorrow.' },
  ],
  'Mastering fewer than half as many topics as the cohort\'s middle',
);

/** What a classmate's news sounds like, by the kind of event. */
function newsLines(c: Classmate, kind: CohortEventKind): Line[] {
  const him = c.pronoun === 'she' ? 'her' : 'him';
  const his = c.pronoun === 'she' ? 'her' : 'his';
  const he = c.pronoun;
  const msg = (text: string): Line => ({ kind: 'message', speaker: c.first, text: `"${text}"` });
  const albert = (text: string): Line => ({ kind: 'inner', speaker: 'Albert', text });
  const narr = (text: string): Line => ({ kind: 'narration', text });
  switch (kind) {
    case 'offer': return [
      narr('The cohort chat, just after seven in the evening. A photograph of a letter, the crest at the top.'),
      msg('Conditional offer. I read it four times. I still think they sent it to the wrong person.'),
      narr('Eleven replies in a minute, most of them just the word YES.'),
      albert(`He types "${c.first}, you earned every line of that" and means it.`),
    ];
    case 'rejected': return [
      narr('The cohort chat, just after seven in the evening. Nothing for an hour, then one message.'),
      msg('No place this year. They were kind about it. I need a day.'),
      albert(`He remembers ${his} standups: every one honest, even the stuck weeks.`),
      narr(`He writes to ${him} privately instead of in the chat. Three lines, no advice.`),
    ];
    case 'met': return [
      narr('Results morning. The cohort chat wakes up one name at a time.'),
      msg('Made the grades. It is real. I am going to Cambridge.'),
      albert(`Two years of ${his} standups, and ${he} never once said "nothing" when it was something.`),
    ];
    case 'missed': return [
      narr('Results morning. The cohort chat wakes up one name at a time, and then a gap.'),
      msg('Missed the offer by a grade. The College says sit again next June and they will look again.'),
      albert(`${c.first} will be at standup tomorrow. Albert would bet on it.`),
    ];
    case 'resit-met': return [
      narr('A year on, results morning again. The chat is quieter now; half the cohort is in Cambridge.'),
      msg('Resit grades are in. I made it. Tell everyone at standup I said thank you.'),
      albert('A second year of the same mornings, for one grade. He thinks he would have stopped. He is not sure.'),
    ];
    case 'resit-missed': return [
      narr('A year on, results morning again.'),
      msg('Not enough again. I am all right. I mean it this time. I learned the maths, and they cannot take that.'),
      albert(`He believes ${him}. He saves the message.`),
    ];
    case 'second-offer': return [
      narr('A year on, the cohort chat, a photograph of a letter.'),
      msg('Second time. An offer. Nobody told me the second letter would feel bigger than the first.'),
      albert('He reads it twice and then goes back to his own work, lighter.'),
    ];
    case 'second-rejected': return [
      narr('A year on, one short message in the cohort chat.'),
      msg('No again. I am done applying. Not done with maths.'),
      albert(`He thinks of ${his} first standup, two years ago, and how far ${he} has come anyway.`),
    ];
  }
}

const NEWS_TIME: Readonly<Record<CohortEventKind, string>> = {
  offer: '7:20 pm', rejected: '8:05 pm', met: '8:15 am', missed: '8:40 am',
  'resit-met': '8:20 am', 'resit-missed': '8:50 am', 'second-offer': '7:30 pm', 'second-rejected': '8:10 pm',
};

const NEWS_WHAT: Readonly<Record<CohortEventKind, string>> = {
  offer: 'a decision from Cambridge', rejected: 'a decision from Cambridge', met: 'results day', missed: 'results day',
  'resit-met': 'resit results', 'resit-missed': 'resit results', 'second-offer': 'a second decision', 'second-rejected': 'a second decision',
};

const newsTitle = (c: Classmate, kind: CohortEventKind): string => {
  if (kind === 'offer' || kind === 'rejected') return `Word from ${c.first}`;
  if (kind === 'met' || kind === 'missed') return `${c.first} on Results Day`;
  return `${c.first}, a Year On`;
};

/** A beat for one classmate's campaign event. */
function newsBeat(e: CohortEvent): Scene | null {
  const c = CLASSMATES.find((x) => x.id === e.who);
  if (c === undefined) return null;
  const day = DAY_NAMES[weekdayOf(e.date)] as string;
  return beat(
    `cohort-${e.kind}-${c.id}`, newsTitle(c, e.kind), `Brooklyn, ${NEWS_TIME[e.kind]}, a ${day}`, e.id,
    `when ${c.name} hears back`, newsLines(c, e.kind), `${c.name}, ${NEWS_WHAT[e.kind]}`,
    [{ label: 'Classmate', value: () => c.name }],
  );
}

/** Every cohort beat: Albert's three, then the classmates' news in date order. */
export const COHORT_SCENES: readonly Scene[] = [
  BEAT_MISSED, BEAT_MISSED_THREE, BEAT_FAR_BEHIND,
  ...campaignEvents().map(newsBeat).filter((s): s is Scene => s !== null),
];
