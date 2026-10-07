/**
 * The cohort: Albert's six classmates in the New York Mathematical Society programme, which
 * takes adults from unconventional paths and trains them for Cambridge admission. Each
 * classmate moves through the same book (BOOK_ORDER) and the same gate rule as Albert: a step is learned, and a gated topic is mastered some days later,
 * when its gate problem is done. Then they move through the admission campaign: some get
 * offers, some do not, some resit.
 *
 * Pure and reproducible: a classmate's day is a function of the cohort start, their seed,
 * and the book. No clock, storage, or DOM. Days are simulated from the start once and kept,
 * so a date's numbers are the same on every call and every device. When the book grows,
 * the curves stretch over the new steps (the same seeds, a longer road).
 *
 * The shape of a curve: a steady weekday pace scaled by the classmate's strength in the
 * step's subject, lighter weekends, stuck weeks (almost nothing moves), burst weeks, and
 * now and then a setback (a few topics lapse and come back over the next days). Mastery
 * only ever rises; topics learned dip in a setback and recover.
 */
import { gateOf } from '@learnhub/content';
import { BOOK_ORDER } from '@learnhub/content/book';
import type { CycleDate } from './campaignCalendar';
import { TOPIC_BY_ID } from './courses';
import { addDays, weekdayOf } from './day';
import { DOMAIN_IDS, RATING_AREAS, RATING_LABELS, type DomainId } from './ratings';

// ---------------------------------------------------------------- the programme

export const PROGRAMME = {
  society: 'New York Mathematical Society',
  name: 'New York Mathematical Society programme',
} as const;

/** The first day of the programme, a Tuesday (the Monday is Labor Day). */
export const COHORT_START = '2026-09-08';
/** The entry year the cohort applies for. */
export const COHORT_ENTRY = 2028;

// ---------------------------------------------------------------- the classmates

export type Pronoun = 'she' | 'he';

export interface Classmate {
  id: string;
  name: string;
  /** What the others call them in a standup. */
  first: string;
  pronoun: Pronoun;
  age: number;
  /** Where they live. */
  from: string;
  /** The road here, in one line. */
  background: string;
  /** The course they are applying for. */
  route: 'maths' | 'cs';
  /** Pace multiplier per subject, 0.6 to 1.4: above 1 a strength, below 1 a weakness. */
  strengths: Readonly<Record<DomainId, number>>;
  /** Book steps a steady weekday covers at strength 1. */
  pace: number;
  /** 0 to 1: how even the weeks are. Lower means more stuck weeks and more bursts. */
  consistency: number;
  /** The seed of every draw for this classmate. */
  seed: string;
  /** Speech: a voice's pitch and rate, and the voice names or languages to prefer, in order. */
  voice: { pitch: number; rate: number; prefer: readonly string[] };
}

const S = (analysis: number, algebra: number, probability: number, proof: number, programming: number): Record<DomainId, number> =>
  ({ analysis, algebra, probability, proof, programming });

export const CLASSMATES: readonly Classmate[] = [
  {
    id: 'marcus', name: 'Marcus Bell', first: 'Marcus', pronoun: 'he', age: 34, from: 'Parkchester, the Bronx',
    background: 'Eight years as an Army combat medic, then a paramedic on night shifts. Left school at seventeen.',
    route: 'maths', strengths: S(1.15, 1.0, 1.25, 0.85, 0.75), pace: 1.25, consistency: 0.85, seed: 'marcus-bell',
    voice: { pitch: 0.85, rate: 1.0, prefer: ['Daniel', 'Alex', 'en-US'] },
  },
  {
    id: 'rosa', name: 'Rosa Delgado', first: 'Rosa', pronoun: 'she', age: 29, from: 'Sunset Park, Brooklyn',
    background: 'Line cook, then sous chef at a restaurant in the West Village. Studies before the dinner shift.',
    route: 'maths', strengths: S(0.9, 1.3, 1.05, 0.8, 0.95), pace: 1.15, consistency: 0.45, seed: 'rosa-delgado',
    voice: { pitch: 1.1, rate: 1.08, prefer: ['Samantha', 'Paulina', 'en-US'] },
  },
  {
    id: 'wen', name: 'Wen Li', first: 'Wen', pronoun: 'she', age: 41, from: 'Flushing, Queens',
    background: 'Bookkeeper for a dozen small businesses on Main Street. Taught herself calculus from library books.',
    route: 'maths', strengths: S(0.8, 1.1, 1.0, 1.3, 0.9), pace: 1.05, consistency: 0.95, seed: 'wen-li',
    voice: { pitch: 1.0, rate: 0.95, prefer: ['Karen', 'Moira', 'en-AU', 'en-GB'] },
  },
  {
    id: 'grace', name: 'Grace Adeyemi', first: 'Grace', pronoun: 'she', age: 58, from: 'Crown Heights, Brooklyn',
    background: 'Thirty years a nurse, the last ten in intensive care. Retired last spring and wants the degree she put off.',
    route: 'maths', strengths: S(0.95, 0.95, 1.3, 1.05, 0.7), pace: 0.9, consistency: 0.9, seed: 'grace-adeyemi',
    voice: { pitch: 0.95, rate: 0.9, prefer: ['Tessa', 'Serena', 'en-ZA', 'en-GB'] },
  },
  {
    id: 'dev', name: 'Dev Kapoor', first: 'Dev', pronoun: 'he', age: 26, from: 'Journal Square, Jersey City',
    background: 'Self-taught programmer, five years at a logistics start-up. No degree; wants the proofs behind the code.',
    route: 'cs', strengths: S(0.75, 1.0, 0.95, 1.15, 1.4), pace: 1.35, consistency: 0.4, seed: 'dev-kapoor',
    voice: { pitch: 1.05, rate: 1.12, prefer: ['Rishi', 'Aaron', 'en-IN', 'en-US'] },
  },
  {
    id: 'jonah', name: 'Jonah Whitfield', first: 'Jonah', pronoun: 'he', age: 37, from: 'Harlem, Manhattan',
    background: 'Jazz bassist, twenty years of gigs and teaching. Came to maths through harmony and rhythm.',
    route: 'maths', strengths: S(1.2, 1.05, 0.8, 1.15, 0.8), pace: 1.0, consistency: 0.7, seed: 'jonah-whitfield',
    voice: { pitch: 0.8, rate: 0.92, prefer: ['Fred', 'Oliver', 'en-GB', 'en-US'] },
  },
];

export function classmateById(id: string): Classmate | undefined {
  return CLASSMATES.find((c) => c.id === id);
}

/** The classmate's two strongest and their weakest subject, as words. */
export function strengthWords(c: Classmate): { strong: string[]; weak: string } {
  const by = [...DOMAIN_IDS].sort((a, b) => c.strengths[b] - c.strengths[a] || a.localeCompare(b));
  return { strong: by.slice(0, 2).map((d) => RATING_LABELS[d]), weak: RATING_LABELS[by[by.length - 1] as DomainId] };
}

/** The initials for a monogram: "MB". */
export const initialsOf = (name: string): string => name.split(/\s+/).map((w) => w.charAt(0)).join('').slice(0, 2).toUpperCase();

// ---------------------------------------------------------------- draws

/** FNV-1a over the parts: a 32-bit hash, the same on every engine. */
function hash(parts: readonly (string | number)[]): number {
  let h = 0x811c9dc5;
  const s = parts.join('|');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // A final mix, so nearby keys ("week|3", "week|4") do not draw nearby numbers.
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** A draw in [0, 1) from a seed and a key: the same key always draws the same number. */
export function draw(seed: string, ...key: (string | number)[]): number {
  return hash([seed, ...key]) / 4294967296;
}

// ---------------------------------------------------------------- the book as the cohort reads it

const STEPS: readonly string[] = BOOK_ORDER;

const domainOfArea = (area: string): DomainId => DOMAIN_IDS.find((d) => RATING_AREAS[d].includes(area)) ?? 'algebra';
const STEP_DOMAIN: readonly DomainId[] = STEPS.map((id) => domainOfArea(TOPIC_BY_ID.get(id)?.area ?? ''));
const STEP_GATED: readonly boolean[] = STEPS.map((id) => gateOf(id).length > 0);
/** Topics in the book that can be mastered: those with a gate problem. */
export const GATEABLE = STEP_GATED.filter((x) => x).length;

/** The book's steps, in order, as the cohort walks them. */
export const cohortSteps = (): readonly string[] => STEPS;
export const stepDomain = (i: number): DomainId => STEP_DOMAIN[i] ?? 'algebra';

// ---------------------------------------------------------------- the simulation

/** How a day went: an even day, a stuck one, a burst, a setback (topics lapse), or the book finished. */
export type Mode = 'steady' | 'stuck' | 'burst' | 'setback' | 'review';

export interface CohortDay {
  date: string;
  /** Days since the cohort start, 0 on the first day. */
  day: number;
  mode: Mode;
  /** Steps reached through the book by the end of the day. */
  reached: number;
  /** Topics learned and holding: reached, less those lapsed in a setback. */
  learned: number;
  /** Topics mastered: learned and their gate problem done. Never falls. */
  gated: number;
  /** Indexes into the book of the steps first learned this day. */
  newSteps: number[];
  /** Topics lapsed and not yet back. */
  lapsed: number;
}

const MODE_FACTOR: Readonly<Record<Mode, number>> = { steady: 1, stuck: 0.08, burst: 1.8, setback: 0.3, review: 0 };
const WEEKEND = 0.4;
/** The first weeks are orientation for everyone: no stuck weeks and no setbacks yet. */
const SETTLING_WEEKS = 3;

interface Sim {
  days: CohortDay[];
  pos: number;
  lapsed: number;
  gated: number;
  gains: Map<number, number>;
  /** The day each step was first learned, or -1. */
  learnedOn: number[];
  gatedOn: number[];
}

const sims = new Map<string, Sim>();

/** The week's character, the same for every day of the week. */
export function weekMode(c: Classmate, week: number): 'steady' | 'stuck' | 'burst' {
  if (week < SETTLING_WEEKS) return 'steady';
  const r = draw(c.seed, 'week', week);
  const stuck = 0.06 + 0.12 * (1 - c.consistency);
  const burst = 0.08 + 0.14 * (1 - c.consistency);
  if (r < stuck) return 'stuck';
  if (r < stuck + burst) return 'burst';
  return 'steady';
}

/** The weekday (0 Sunday) of the week's setback, or null for a week without one. */
export function setbackDay(c: Classmate, week: number): number | null {
  if (week < SETTLING_WEEKS || draw(c.seed, 'setback', week) >= 0.07) return null;
  return 1 + Math.floor(draw(c.seed, 'setback-day', week) * 4);
}

function step(c: Classmate, s: Sim): void {
  const d = s.days.length;
  const date = addDays(COHORT_START, d);
  const week = Math.floor(d / 7);
  const dow = weekdayOf(date);
  const n = STEPS.length;
  let mode: Mode = weekMode(c, week);
  if (setbackDay(c, week) === dow && Math.floor(s.pos) > 6) mode = 'setback';
  if (s.pos >= n) mode = 'review';
  // A lapsed topic comes back each day, but not on the day of the setback itself.
  if (mode !== 'setback' && s.lapsed > 0) s.lapsed--;
  if (mode === 'setback') s.lapsed = Math.min(Math.floor(s.pos), s.lapsed + 2 + Math.floor(draw(c.seed, 'lapse', d) * 4));
  const newSteps: number[] = [];
  if (mode !== 'review') {
    const cur = Math.min(n - 1, Math.floor(s.pos));
    const noise = 0.75 + 0.5 * draw(c.seed, 'noise', d);
    const weekend = dow === 0 || dow === 6 ? WEEKEND : 1;
    const rate = c.pace * MODE_FACTOR[mode] * c.strengths[stepDomain(cur)] * noise * weekend;
    const before = Math.floor(s.pos);
    s.pos = Math.min(n, s.pos + rate);
    for (let i = before; i < Math.floor(s.pos); i++) {
      newSteps.push(i);
      s.learnedOn[i] = d;
      if (!STEP_GATED[i]) continue;
      // The gate comes later in a weak subject: more days of reviews before the problem falls.
      const lag = Math.max(1, Math.round(2 + 9 * draw(c.seed, 'gate', i) + 14 * Math.max(0, 1.15 - c.strengths[stepDomain(i)])));
      s.gatedOn[i] = d + lag;
      s.gains.set(d + lag, (s.gains.get(d + lag) ?? 0) + 1);
    }
  }
  s.gated += s.gains.get(d) ?? 0;
  s.gains.delete(d);
  const reached = Math.floor(s.pos);
  s.days.push({ date, day: d, mode, reached, learned: reached - Math.min(reached, s.lapsed), gated: s.gated, newSteps, lapsed: s.lapsed });
}

function simOf(c: Classmate, upTo: number): Sim {
  let s = sims.get(c.id);
  if (s === undefined) {
    s = { days: [], pos: 0, lapsed: 0, gated: 0, gains: new Map(), learnedOn: STEPS.map(() => -1), gatedOn: STEPS.map(() => -1) };
    sims.set(c.id, s);
  }
  while (s.days.length <= upTo) step(c, s);
  return s;
}

/** Days from the cohort start to `date`: 0 on the first day, negative before it. */
export function cohortDayOf(date: string): number {
  return Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${COHORT_START}T12:00:00Z`)) / 86_400_000);
}

/** A classmate's day, or null before the programme starts. */
export function classmateDay(c: Classmate, date: string): CohortDay | null {
  const d = cohortDayOf(date);
  if (d < 0) return null;
  return simOf(c, d).days[d] as CohortDay;
}

/** The step a classmate is on at the end of `date` (an index into the book), or null with the book done or before the start. */
export function currentStep(c: Classmate, date: string): number | null {
  const day = classmateDay(c, date);
  return day === null || day.reached >= STEPS.length ? null : day.reached;
}

/** Steps a classmate learned for the first time from `from` to `to`, inclusive, as book indexes. */
export function stepsLearned(c: Classmate, from: string, to: string): number[] {
  const a = Math.max(0, cohortDayOf(from));
  const b = cohortDayOf(to);
  if (b < a) return [];
  const s = simOf(c, b);
  return s.days.slice(a, b + 1).flatMap((x) => x.newSteps);
}

/** Topics mastered by the end of `date`; 0 before the start. */
export function gatedOn(c: Classmate, date: string): number {
  return classmateDay(c, date)?.gated ?? 0;
}

// ---------------------------------------------------------------- the calendar

export interface ProgrammeTerm {
  name: string;
  start: string;
  end: string;
}

/** The programme's terms, as published to the cohort. */
export const PROGRAMME_TERMS: readonly ProgrammeTerm[] = [
  { name: 'Autumn term 2026', start: '2026-09-08', end: '2026-12-17' },
  { name: 'Winter term 2027', start: '2027-01-11', end: '2027-03-25' },
  { name: 'Spring term 2027', start: '2027-04-12', end: '2027-06-24' },
  { name: 'Summer school 2027', start: '2027-07-12', end: '2027-08-19' },
  { name: 'Autumn term 2027', start: '2027-09-07', end: '2027-12-16' },
  { name: 'Winter term 2028', start: '2028-01-10', end: '2028-03-23' },
  { name: 'Spring term 2028', start: '2028-04-10', end: '2028-06-22' },
];

/** The term a date falls in, or null in a break. */
export function termOf(date: string): ProgrammeTerm | null {
  return PROGRAMME_TERMS.find((t) => t.start <= date && date <= t.end) ?? null;
}

export type MilestoneId = 'tmua' | 'mock-1' | 'ucas' | 'mca' | 'mock-2' | 'interviews' | 'decisions' | 'step' | 'results';

export interface Milestone extends CycleDate {
  id: MilestoneId;
}

/**
 * The admission dates the cohort works to: `cycle(COHORT_ENTRY, 'october')` from
 * campaignCalendar, written out so this module does not import the calendar (the day
 * planner reads the standup, which reads the cohort; a test holds them equal).
 */
export const COHORT_CYCLE = {
  tmua: { label: 'TMUA, October sitting', date: '2027-10-15', basis: 'approximate' },
  ucas: { label: 'UCAS deadline', date: '2028-01-13', basis: 'shifted' },
  mca: { label: 'My Cambridge Application', date: '2028-01-20', basis: 'shifted' },
  interviews: { label: 'Interviews begin', date: '2028-03-30', basis: 'shifted' },
  step: { label: 'STEP and final A levels', date: '2028-06-01', basis: 'approximate' },
  results: { label: 'Results', date: '2028-08-13', basis: 'approximate' },
} as const satisfies Record<string, CycleDate>;
const CY = COHORT_CYCLE;
/** When Cambridge's decisions reach the cohort: after the last interviews. Approximate. */
export const DECISIONS_DATE = '2028-04-27';
/** The resit year: STEP again in June, results in August. Approximate. */
export const RESIT_RESULTS = '2029-08-16';
export const RESIT_DECISIONS = '2029-04-26';

/** The programme's milestones toward October 2028 entry, in date order. */
export const MILESTONES: readonly Milestone[] = [
  { id: 'tmua', ...CY.tmua },
  { id: 'mock-1', label: 'Programme mock interview, first round', date: '2027-11-11', basis: 'published' },
  { id: 'ucas', ...CY.ucas, label: 'Application deadline (UCAS)' },
  { id: 'mca', ...CY.mca },
  { id: 'mock-2', label: 'Programme mock interview, second round', date: '2028-03-09', basis: 'published' },
  { id: 'interviews', ...CY.interviews, label: 'Cambridge interviews begin' },
  { id: 'decisions', label: 'Decisions from Cambridge', date: DECISIONS_DATE, basis: 'approximate' },
  { id: 'step', ...CY.step },
  { id: 'results', ...CY.results, label: 'Results day' },
];

// ---------------------------------------------------------------- the campaign

export type Decision = 'offer' | 'rejected';
export type Result = 'met' | 'missed';

/** How a classmate's application goes, decided by their progress at the deadline, their strengths, and their draws. */
export interface Outcome {
  /**
   * The programme record: the share of masterable topics mastered at the end of each term
   * before the application deadline, averaged. Early, steady work counts for most.
   */
  ready: number;
  decision: Decision;
  /** With an offer: the results against its conditions. */
  result: Result | null;
  /** Missed the conditions: sits STEP again a year on. Rejected: applies again a year on. */
  again: 'resit' | 'reapply' | null;
  /** The second year's outcome, when there is one: an offer met, or not. */
  second: 'met' | 'missed' | 'offer-met' | 'rejected' | null;
}

/** See `Outcome.ready`. */
export function recordOf(c: Classmate): number {
  const ends = PROGRAMME_TERMS.filter((t) => t.end < CY.ucas.date).map((t) => t.end);
  return ends.reduce((a, d) => a + gatedOn(c, d), 0) / Math.max(1, ends.length * GATEABLE);
}

const meanStrength = (c: Classmate): number => DOMAIN_IDS.reduce((a, d) => a + c.strengths[d], 0) / DOMAIN_IDS.length;

/** A classmate's whole admission story. Fixed for a given book: the dates are in the future of the simulation's start, not of the clock. */
export function outcomeOf(c: Classmate): Outcome {
  const ready = recordOf(c);
  const aptitude = Math.min(1, Math.max(0, (meanStrength(c) - 0.85) / 0.3));
  // The record against the cohort's usual range (three quarters to nine tenths mastered), then aptitude, then the day itself.
  const record = Math.min(1, Math.max(0, (ready - 0.75) / 0.15));
  const interview = 0.45 * record + 0.2 * aptitude + 0.35 * draw(c.seed, 'interview');
  const decision: Decision = interview >= 0.55 ? 'offer' : 'rejected';
  if (decision === 'offer') {
    const result: Result = 0.45 * aptitude + 0.55 * draw(c.seed, 'step') >= 0.47 ? 'met' : 'missed';
    if (result === 'met') return { ready, decision, result, again: null, second: null };
    return { ready, decision, result, again: 'resit', second: draw(c.seed, 'resit') >= 0.3 ? 'met' : 'missed' };
  }
  const reapply = draw(c.seed, 'reapply') < 0.75;
  if (!reapply) return { ready, decision, result: null, again: null, second: null };
  return { ready, decision, result: null, again: 'reapply', second: draw(c.seed, 'second') >= 0.45 ? 'offer-met' : 'rejected' };
}

export type CohortEventKind = 'offer' | 'rejected' | 'met' | 'missed' | 'resit-met' | 'resit-missed' | 'second-offer' | 'second-rejected';

export interface CohortEvent {
  /** `<kind>:<classmate id>`: the story's trigger reads it. */
  id: string;
  who: string;
  kind: CohortEventKind;
  date: string;
}

/** Every campaign event of the cohort, in date order, whether or not it has happened yet. */
export function campaignEvents(): CohortEvent[] {
  const out: CohortEvent[] = [];
  const ev = (who: string, kind: CohortEventKind, date: string): void => { out.push({ id: `${kind}:${who}`, who, kind, date }); };
  for (const c of CLASSMATES) {
    const o = outcomeOf(c);
    ev(c.id, o.decision, DECISIONS_DATE);
    if (o.result !== null) ev(c.id, o.result, CY.results.date);
    if (o.again === 'resit') ev(c.id, o.second === 'met' ? 'resit-met' : 'resit-missed', RESIT_RESULTS);
    if (o.again === 'reapply') ev(c.id, o.second === 'offer-met' ? 'second-offer' : 'second-rejected', RESIT_DECISIONS);
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

/** The cohort's campaign events on or before `date`. */
export function eventsBy(date: string): CohortEvent[] {
  return campaignEvents().filter((e) => e.date <= date);
}

// ---------------------------------------------------------------- the standing

export interface StandingRow {
  /** A classmate's id, or "albert". */
  id: string;
  name: string;
  gated: number;
  learned: number;
  /** 1 for the most topics mastered; equal counts share a rank. */
  rank: number;
}

/**
 * The cohort by topics mastered on `date`, most first, with Albert's own numbers in. Equal
 * counts share a rank (1, 2, 2, 4), and Albert is listed after classmates he ties with.
 */
export function standing(date: string, albert: { gated: number; learned: number }, name = 'Albert'): StandingRow[] {
  const rows = [
    ...CLASSMATES.map((c) => {
      const d = classmateDay(c, date);
      return { id: c.id, name: c.name, gated: d?.gated ?? 0, learned: d?.learned ?? 0 };
    }),
    { id: 'albert', name, gated: albert.gated, learned: albert.learned },
  ];
  rows.sort((a, b) => b.gated - a.gated || (a.id === 'albert' ? 1 : b.id === 'albert' ? -1 : b.learned - a.learned || a.name.localeCompare(b.name)));
  return rows.map((r) => ({ ...r, rank: 1 + rows.filter((x) => x.gated > r.gated).length }));
}

/** The middle of the classmates' mastered counts on `date` (the mean of the two middle values of six). */
export function cohortMedian(date: string): number {
  const xs = CLASSMATES.map((c) => gatedOn(c, date)).sort((a, b) => a - b);
  const m = xs.length / 2;
  return xs.length % 2 === 0 ? ((xs[m - 1] as number) + (xs[m] as number)) / 2 : (xs[Math.floor(m)] as number);
}

/** Far behind: four weeks in, with fewer than half the cohort's middle count of topics mastered. */
export const FAR_BEHIND_SHARE = 0.5;
export const FAR_BEHIND_AFTER_DAYS = 28;
export function farBehind(date: string, albertGated: number): boolean {
  if (cohortDayOf(date) < FAR_BEHIND_AFTER_DAYS) return false;
  const med = cohortMedian(date);
  return med >= 8 && albertGated < FAR_BEHIND_SHARE * med;
}
