/**
 * The cohort's daily standup: when it is held, and what each classmate says.
 *
 * The schedule. Monday to Friday at a set time (10:00 am New York time unless changed in
 * You), 15 minutes, from the programme's first day. Never on Shabbat: a Friday standup set
 * late enough to reach sundown is not held. Nor on yom tov (holidays.ts), or past sundown
 * on its eve; callers may pass their own set of dates to skip instead (`holidays`).
 *
 * The updates. "Yesterday: ... Today: ... Blocked on: ..." from the classmate's simulated
 * days (cohort.ts): the topics learned since the last standup, the topic they are on, and a
 * stuck week, a burst, or a setback. Phrasing varies by a draw on the classmate and the date,
 * so a date always reads the same; each classmate has their own turns of phrase. Pure.
 */
import type { FixedBlock } from './day';
import { addDays, sunsetMinutes, weekdayOf } from './day';
import {
  CLASSMATES, COHORT_START, campaignEvents, classmateDay, cohortSteps, currentStep, draw, stepsLearned,
  type Classmate, type CohortEvent,
} from './cohort';
import { titleOf } from './courses';
import { YOM_TOV, type Holidays } from './holidays';
import { DEFAULT_STANDUP, STANDUP_LENGTH, type StandupSettings } from './standupSettings';

// ---------------------------------------------------------------- the schedule

export {
  DEFAULT_STANDUP, STANDUP_DEFAULT, STANDUP_EARLIEST, STANDUP_LATEST, STANDUP_LENGTH, type StandupSettings,
} from './standupSettings';

/** What the schedule reads: the time, and whether standups are on (absent: on). */
export type Schedule = Pick<StandupSettings, 'minutes'> & Partial<Pick<StandupSettings, 'enabled'>>;

/**
 * Whether a standup is held on `date`: a weekday from the programme's start, not a holiday
 * (yom tov by default), and over before sundown on the eve of Shabbat or a holiday.
 */
export function isStandupDay(date: string, s: Schedule = DEFAULT_STANDUP, holidays: Holidays = YOM_TOV): boolean {
  const dow = weekdayOf(date);
  if (s.enabled === false || date < COHORT_START || dow === 0 || dow === 6 || holidays.has(date)) return false;
  const eve = dow === 5 || holidays.has(addDays(date, 1));
  return !eve || s.minutes + STANDUP_LENGTH <= sunsetMinutes(date);
}

/** The standup on `date` as a block for the day planner, pinned at its time; null when none is held. */
export function standupBlock(date: string, s: Schedule = DEFAULT_STANDUP, holidays?: Holidays): FixedBlock | null {
  if (!isStandupDay(date, s, holidays)) return null;
  return { minutes: STANDUP_LENGTH, at: s.minutes, title: 'Standup', detail: 'The cohort, 15 minutes', to: { view: 'standup' } };
}

/** The last standup day before `date`, or null when there is none since the programme began. */
export function previousStandup(date: string, s: Schedule = DEFAULT_STANDUP, holidays?: Holidays): string | null {
  for (let d = addDays(date, -1); d >= COHORT_START; d = addDays(d, -1)) if (isStandupDay(d, s, holidays)) return d;
  return null;
}

/** The first standup day on or after `date`. */
export function nextStandup(date: string, s: Schedule = DEFAULT_STANDUP, holidays?: Holidays): string {
  let d = date < COHORT_START ? COHORT_START : date;
  // A holiday list can hold whole weeks; a year is far beyond any real gap.
  for (let i = 0; i < 366 && !isStandupDay(d, s, holidays); i++) d = addDays(d, 1);
  return d;
}

/**
 * Standups missed: days from `since` to `today` with a standup Albert did not give his
 * update at. Today's counts only once it is over (`nowMin` past its end).
 */
export function missedStandups(
  since: string, today: string, nowMin: number, attended: ReadonlySet<string>, s: Schedule = DEFAULT_STANDUP, holidays?: Holidays,
): string[] {
  const out: string[] = [];
  for (let d = since < COHORT_START ? COHORT_START : since; d <= today; d = addDays(d, 1)) {
    if (!isStandupDay(d, s, holidays) || attended.has(d)) continue;
    if (d === today && nowMin < s.minutes + STANDUP_LENGTH) continue;
    out.push(d);
  }
  return out;
}

// ---------------------------------------------------------------- the updates

export interface StandupUpdate {
  who: string;
  yesterday: string;
  today: string;
  blocked: string;
}

/** Each classmate's own turns of phrase. Plain words, no dashes. */
interface Voice {
  /** A good day's tag, after the topics. */
  good: readonly string[];
  /** A day that went nowhere. */
  slow: readonly string[];
  /** Asking for help when stuck. */
  ask: readonly string[];
  /** Nothing blocking. */
  clear: readonly string[];
  /** After the book: what a day of past papers is like. */
  papers: readonly string[];
}

const VOICES: Readonly<Record<string, Voice>> = {
  marcus: {
    good: ['Solid day.', 'Good day. Kept moving.', 'No complaints.'],
    slow: ['Slow going. I stayed on it.', 'Not much to show. I kept at it.'],
    ask: ['If someone has ten minutes after, I would take them.', 'I could use a second pair of eyes.'],
    clear: ['Nothing. Good to go.', 'Nothing right now.', 'Nothing blocking.'],
    papers: ['timed papers, then the marking. Treating it like drills.'],
  },
  rosa: {
    good: ['Big day. Everything came out of the oven at once.', 'Good night after service, actually.', 'Flew through it.'],
    slow: ['Double shift, so not much.', 'Kitchen ran late. I got one page in.'],
    ask: ['Can someone walk me through it after? I keep burning the same step.', 'I need somebody to taste this one with me.'],
    clear: ['Nothing.', 'Nothing today.', 'All clear.'],
    papers: ['past papers in the break before service.'],
  },
  wen: {
    good: ['Everything reconciled.', 'All the steps check out.', 'A tidy day.'],
    slow: ['I went line by line and it still does not balance.', 'Careful but slow.'],
    ask: ['I would like someone to check my working on it.', 'If anyone sees the error, tell me.'],
    clear: ['Nothing.', 'Nothing at the moment.', 'No blockers.'],
    papers: ['a full paper under time, then every line checked.'],
  },
  grace: {
    good: ['A good day, thank you.', 'Steady and good.', 'I am pleased with it.'],
    slow: ['A quiet day. I took it slowly.', 'I read more than I wrote.'],
    ask: ['If anyone has a gentle way of explaining it, I would be grateful.', 'I will ask the tutor, unless one of you gets there first.'],
    clear: ['Nothing, thank you.', 'Nothing today.', 'Nothing at present.'],
    papers: ['a paper a day now, and the marks are coming up.'],
  },
  dev: {
    good: ['Shipped a lot.', 'Big push. It all compiled, so to speak.', 'Good momentum.'],
    slow: ['Spent the day staring at it.', 'Zero progress, honestly.'],
    ask: ['Anyone free to pair on it after?', 'I would take a pairing session.'],
    clear: ['Nothing.', 'Nope.', 'Nothing blocking.'],
    papers: ['past papers, then fixing every mistake twice.'],
  },
  jonah: {
    good: ['It swung. Good day.', 'Found the groove.', 'Played well, I think.'],
    slow: ['Practising the same bar over and over.', 'Long day in the shed.'],
    ask: ['If someone could play it through with me after, that would help.', 'I need to hear somebody else do it once.'],
    clear: ['Nothing.', 'Nothing, man.', 'All good.'],
    papers: ['a timed paper, then slow practice on what I missed.'],
  },
};

const pick = <T>(xs: readonly T[], c: Classmate, date: string, slot: string): T => xs[Math.floor(draw(c.seed, 'say', date, slot) * xs.length)] as T;

const title = (i: number): string => titleOf(cohortSteps()[i] as string);

function list(xs: readonly string[]): string {
  if (xs.length <= 1) return xs[0] ?? '';
  return `${xs.slice(0, -1).join(', ')}${xs.length > 2 ? ',' : ''} and ${xs[xs.length - 1]}`;
}

/** What a classmate's campaign event sounds like at the standup after it. */
function eventLine(e: CohortEvent): string {
  switch (e.kind) {
    case 'offer': return 'The letter came. An offer.';
    case 'rejected': return 'The letter came. No place this year.';
    case 'met': return 'Results. I made the offer.';
    case 'missed': return 'Results. I missed the offer, so I sit the exams again next June.';
    case 'resit-met': return 'Results from the resit. I made it this time.';
    case 'resit-missed': return 'Results from the resit. Not enough again.';
    case 'second-offer': return 'Second try. An offer this time.';
    case 'second-rejected': return 'Second try. No place again.';
  }
}

/**
 * A classmate's update at the standup on `date`, or null when no standup is held there or
 * the programme has not started. "Yesterday" covers the days since the last standup.
 */
export function classmateUpdate(c: Classmate, date: string, s: Schedule = DEFAULT_STANDUP, holidays?: Holidays): StandupUpdate | null {
  if (!isStandupDay(date, s, holidays)) return null;
  const v = VOICES[c.id] as Voice;
  const prev = previousStandup(date, s, holidays);
  const yday = addDays(date, -1);
  const n = cohortSteps().length;
  if (prev === null) {
    const cur = currentStep(c, date);
    return {
      who: c.id,
      yesterday: 'Yesterday: orientation, and the reading list.',
      today: `Today: ${cur === null ? 'the first chapter' : title(cur)}.`,
      blocked: `Blocked on: ${pick(v.clear, c, date, 'clear')}`,
    };
  }
  const learned = stepsLearned(c, prev, yday);
  const before = classmateDay(c, yday);
  const now = classmateDay(c, date);
  const cur = currentStep(c, yday);
  const events = campaignEvents().filter((e) => e.who === c.id && e.date >= prev && e.date < date);
  const setback = stepsSince(c, prev, yday).some((d) => d === 'setback');

  let yesterday: string;
  if (events.length > 0) yesterday = `Yesterday: ${eventLine(events[events.length - 1] as CohortEvent)}`;
  else if (setback) {
    yesterday = 'Yesterday: a setback. I went back over older topics and found I had lost some of them.';
  } else if (learned.length === 0 && (before?.mode === 'review' || cur === null)) yesterday = `Yesterday: ${pick(v.papers, c, date, 'papers')}`;
  else if (learned.length === 0) yesterday = `Yesterday: ${cur === null ? 'reviews' : `still on ${title(cur)}`}. ${pick(v.slow, c, date, 'slow')}`;
  else if (learned.length <= 2) yesterday = `Yesterday: finished ${list(learned.map(title))}.${before?.mode === 'burst' ? ` ${pick(v.good, c, date, 'good')}` : ''}`;
  else yesterday = `Yesterday: ${learned.length} topics, through to ${title(learned[learned.length - 1] as number)}. ${pick(v.good, c, date, 'good')}`;

  let today: string;
  const mode = now?.mode;
  if (cur === null || mode === 'review') today = 'Today: a timed paper and reviews.';
  else if (mode === 'stuck') today = `Today: back at ${title(cur)}.`;
  else if (mode === 'burst' && cur + 2 < n) today = `Today: ${title(cur)}, then ${title(cur + 1)}. Maybe ${title(cur + 2)} too.`;
  else if (cur + 1 < n && draw(c.seed, 'say', date, 'two') < 0.5) today = `Today: ${title(cur)}, then ${title(cur + 1)}.`;
  else today = `Today: ${title(cur)}.`;

  let blocked: string;
  if (mode === 'stuck' && cur !== null) blocked = `Blocked on: ${title(cur)}. ${pick(v.ask, c, date, 'ask')}`;
  else if ((now?.lapsed ?? 0) > 0) blocked = `Blocked on: Nothing, but I am relearning ${now?.lapsed === 1 ? 'a topic' : `${now?.lapsed} topics`} I let slip.`;
  else blocked = `Blocked on: ${pick(v.clear, c, date, 'clear')}`;
  return { who: c.id, yesterday, today, blocked };
}

/** The modes of the days from `from` to `to`, inclusive. */
function stepsSince(c: Classmate, from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const x = classmateDay(c, d);
    if (x !== null) out.push(x.mode);
  }
  return out;
}

/** The order the classmates speak in on `date`: shuffled by the date, the same order every time. */
export function standupOrder(date: string): Classmate[] {
  return [...CLASSMATES].sort((a, b) => draw(a.seed, 'order', date) - draw(b.seed, 'order', date) || a.id.localeCompare(b.id));
}

/** Every classmate's update for `date`, in speaking order; empty when no standup is held. */
export function standupUpdates(date: string, s: Schedule = DEFAULT_STANDUP, holidays?: Holidays): StandupUpdate[] {
  return standupOrder(date).flatMap((c) => {
    const u = classmateUpdate(c, date, s, holidays);
    return u === null ? [] : [u];
  });
}

/** An update as one passage for reading aloud: "Marcus. Yesterday, ...". */
export function spokenText(c: Classmate, u: StandupUpdate): string {
  const say = (x: string): string => x.replace(/^(Yesterday|Today|Blocked on):/, '$1,');
  return `${c.first}. ${say(u.yesterday)} ${say(u.today)} ${say(u.blocked)}`;
}
