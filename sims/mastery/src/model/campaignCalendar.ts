/**
 * The application calendar (game system 1): the study pace from the day planner's log, the
 * hours left in each act, the date each act is projected to finish, and the first entry
 * year whose real deadlines those dates meet. Nothing is locked by a slip; it is shown.
 *
 * Dates. Only the 2027-entry January round is published (UCAS 13 January, My Cambridge
 * Application 20 January, St Edmund's interviews 30 March to 13 April, TMUA registration by
 * 21 December). Later cycles reuse those days a year on and say so. The TMUA sitting days,
 * STEP, and results day are approximate (the month is known, the day is not).
 *
 * Hours. Act I's chapters are the current course's lessons (their estimated minutes) until
 * the book is restructured; the other acts' chapters do not exist yet, so their hours are
 * labelled estimates in ESTIMATE_HOURS.
 */
import type { RegistryPaper } from '@learnhub/content/admissions';
import { addDays, parseClock, planFor, tickedMinutes, weekOf } from './day';
import type { DayLog } from './dayLog';
import {
  FINAL_A_LEVEL_PAPERS, marked, subjectOf,
  type Act, type Admissions, type Campaign, type EffectRule, type Subject, type TmuaSitting,
} from './campaign';

/** The earliest real cycle: the October 2026 TMUA booking has closed and Act I needs recent A levels. */
export const EARLIEST_ENTRY = 2028;
const LAST_ENTRY = EARLIEST_ENTRY + 10;
export const TARGET_WEEK_HOURS = 36;
export const PACE_DAYS = 14;

/** Hours for chapters the book does not have yet. Estimates, shown as such. */
export const ESTIMATE_HOURS = { tmuaNotes: 40, statement: 8, stageB: 120, stageC: 120 } as const;
/** A mock interview with its write-up, in hours. */
const INTERVIEW_HOURS = 1;

export interface CycleDate {
  label: string;
  /** YYYY-MM-DD. */
  date: string;
  /** 'shifted': a 2027-entry date a year (or more) on; 'approximate': only the month is known. */
  basis: 'published' | 'shifted' | 'approximate';
}

export interface Cycle {
  entry: number;
  tmuaRegister: CycleDate | null;
  tmua: CycleDate;
  ucas: CycleDate;
  mca: CycleDate;
  interviews: CycleDate;
  interviewsEnd: CycleDate;
  step: CycleDate;
  results: CycleDate;
}

export function cycle(entry: number, sitting: TmuaSitting): Cycle {
  const pub = entry === 2027 ? 'published' : 'shifted';
  return {
    entry,
    tmuaRegister: sitting === 'january' ? { label: 'TMUA registration closes', date: `${entry - 1}-12-21`, basis: pub } : null,
    tmua: sitting === 'january'
      ? { label: 'TMUA, January sitting', date: `${entry}-01-08`, basis: 'approximate' }
      : { label: 'TMUA, October sitting', date: `${entry - 1}-10-15`, basis: 'approximate' },
    ucas: { label: 'UCAS deadline', date: `${entry}-01-13`, basis: pub },
    mca: { label: 'My Cambridge Application', date: `${entry}-01-20`, basis: pub },
    interviews: { label: 'Interviews begin', date: `${entry}-03-30`, basis: pub },
    interviewsEnd: { label: 'Interviews end', date: `${entry}-04-13`, basis: pub },
    step: { label: 'STEP and final A levels', date: `${entry}-06-01`, basis: 'approximate' },
    results: { label: 'Results', date: `${entry}-08-13`, basis: 'approximate' },
  };
}

/** The date each act must be finished by in a cycle; Act I has none of its own (Act II follows it). */
export function actDeadlines(c: Cycle): (CycleDate | null)[] {
  return [null, c.tmua, c.mca, c.interviews, c.step];
}

export interface Pace {
  hoursPerWeek: number;
  /** False when no hours were ticked off in the window, so the 36-hour target stands in. */
  logged: boolean;
}

/** Hours ticked off per week over the last PACE_DAYS days of the planner's log. */
export function pace(log: DayLog, today: string, days = PACE_DAYS): Pace {
  let minutes = 0;
  for (let i = 0; i < days; i++) minutes += dayMinutes(log, addDays(today, -i));
  if (minutes === 0) return { hoursPerWeek: TARGET_WEEK_HOURS, logged: false };
  return { hoursPerWeek: (minutes / 60) * (7 / days), logged: true };
}

function dayMinutes(log: DayLog, date: string): number {
  const e = log[date];
  const w = e === undefined ? null : parseClock(e.wake);
  return e === undefined || w === null ? 0 : tickedMinutes(planFor(date, w), e.ticks);
}

/** Hours ticked off this week (Sunday to Saturday). */
export function weekHours(log: DayLog, today: string): number {
  return weekOf(today).reduce((a, d) => a + dayMinutes(log, d), 0) / 60;
}

/** Days with study since the campaign began: a ticked block, or a lesson, review, or quiz in the history. */
export function daysStudied(log: DayLog, historyDates: readonly string[], since: string): number {
  const days = new Set(historyDates.filter((d) => d >= since));
  for (const d of Object.keys(log)) if (d >= since && dayMinutes(log, d) > 0) days.add(d);
  return days.size;
}

const SUBJECT_PAPER_HOURS: Readonly<Record<Subject, number>> = { maths: 2, 'further-maths': 1.5, cs: 2.5 };

/** Hours left in each act: chapters (Act I from the course, the rest estimated) plus the papers still to sit. */
export function remainingHours(adm: Admissions, c: Campaign, list: readonly Act[], lessonMinutesLeft: number): number[] {
  const left = (a: Act | undefined, id: string): number => {
    const r = a?.requirements.find((x) => x.id === id);
    return r === undefined ? 0 : Math.max(0, r.need - r.done);
  };
  const [a1, a2, a3, a4, a5] = list;
  const h1 = a1?.complete === true ? 0
    : lessonMinutesLeft / 60 + c.aLevelOrder.reduce((s, sub) => s + left(a1, `a-${sub}`) * SUBJECT_PAPER_HOURS[sub], 0);
  const h2 = a2?.complete === true ? 0 : ESTIMATE_HOURS.tmuaNotes + left(a2, 'tmua') * 1.25;
  const h3 = a3?.complete === true ? 0 : ESTIMATE_HOURS.statement;
  const h4 = a4?.complete === true ? 0 : ESTIMATE_HOURS.stageB + (left(a4, 'interview-pre-reading') + left(a4, 'interview-induction')) * INTERVIEW_HOURS;
  const h5 = a5?.complete === true ? 0
    : c.route === 'maths' ? ESTIMATE_HOURS.stageC + (left(a5, 'step-2') + left(a5, 'step-3')) * 3
      : left(a5, 'final') * 2;
  return [h1, h2, h3, h4, h5].map((h) => Math.round(h * 10) / 10);
}

export interface Projection {
  /** The date each act is projected to finish, YYYY-MM-DD. */
  finishes: string[];
  /** The first entry year whose deadlines every projected finish meets; null beyond ten years. */
  entry: number | null;
  slipped: boolean;
  /** Acts that miss their deadline in the earliest cycle, the reason for a slip. */
  misses: { act: number; finish: string; deadline: CycleDate }[];
}

export function project(remaining: readonly number[], hoursPerWeek: number, today: string, sitting: TmuaSitting): Projection {
  let cum = 0;
  const finishes = remaining.map((h) => {
    cum += h;
    return hoursPerWeek <= 0 ? '9999-12-31' : addDays(today, Math.ceil((cum / hoursPerWeek) * 7));
  });
  const missesIn = (entry: number): Projection['misses'] => actDeadlines(cycle(entry, sitting)).flatMap((d, i) => {
    const finish = finishes[i] as string;
    return d !== null && finish > d.date ? [{ act: i + 1, finish, deadline: d }] : [];
  });
  let entry: number | null = null;
  for (let e = EARLIEST_ENTRY; e <= LAST_ENTRY && entry === null; e++) if (missesIn(e).length === 0) entry = e;
  return { finishes, entry, slipped: entry !== EARLIEST_ENTRY, misses: missesIn(EARLIEST_ENTRY) };
}

/** Whether the cycle's choice deadlines have passed on this date. */
export function passed(c: Cycle, today: string): { mca: boolean; tmua: boolean } {
  return { mca: today > c.mca.date, tmua: today > (c.tmuaRegister ?? c.tmua).date };
}

// ---------------------------------------------------------------- the planner's inputs

export interface TimedBlock {
  paperIds: string[];
  title: string;
  minutes: number;
}

export interface CampaignPlanInputs {
  /** The next timed paper the open act asks for, for a morning block; null when none is due. */
  timed: TimedBlock | null;
  /** The stat effects in force (EFFECT_RULES). */
  effects: EffectRule[];
}

/** The open act's next unsat paper: an A level in the chosen order, a TMUA sitting (both papers), or a STEP paper. */
export function nextTimed(adm: Admissions, c: Campaign, list: readonly Act[]): TimedBlock | null {
  const act = list.findIndex((a) => !a.complete) + 1;
  if (act === 0) return null;
  const sat = new Set(marked(adm, c).map((x) => x.paper.id));
  const unsat = (f: (p: RegistryPaper) => boolean): RegistryPaper[] => adm.registry.papers.filter((p) => f(p) && !sat.has(p.id) && p.gap === undefined);
  const one = (p: RegistryPaper | undefined, title: string): TimedBlock | null => (p === undefined ? null : { paperIds: [p.id], title, minutes: p.duration_minutes });
  const a = list[act - 1] as Act;
  const short = (id: string): boolean => a.requirements.some((r) => r.id === id && r.done < r.need);
  if (act === 1) {
    for (const sub of c.aLevelOrder) {
      if (!short(`a-${sub}`)) continue;
      const p = unsat((x) => subjectOf(x) === sub)[0];
      if (p !== undefined) return one(p, `${p.paper} ${p.series ?? p.year}`);
    }
    return null;
  }
  if (act === 2) {
    const p = unsat((x) => x.exam === 'TMUA')[0];
    if (p === undefined) return null;
    const pair = unsat((x) => x.exam === 'TMUA' && x.year === p.year);
    return { paperIds: pair.map((x) => x.id), title: `TMUA ${p.year}, ${pair.length === 2 ? 'Papers 1 and 2' : p.paper}`, minutes: pair.reduce((s, x) => s + x.duration_minutes, 0) };
  }
  if (act === 5 && c.route === 'maths') {
    for (const paper of ['STEP 2', 'STEP 3']) {
      if (!short(`step-${paper.slice(-1)}`)) continue;
      // The most recent year first: the closest to the real paper.
      const p = unsat((x) => x.exam === 'STEP' && x.paper === paper).sort((x, y) => y.year - x.year)[0];
      if (p !== undefined) return one(p, `${p.paper} ${p.year}`);
    }
    return null;
  }
  if (act === 5 && short('final')) {
    const done = marked(adm, c).filter((x) => x.paper.exam === 'A level' && x.s.act === 5).length;
    if (done >= FINAL_A_LEVEL_PAPERS) return null;
    const p = unsat((x) => x.exam === 'A level').sort((x, y) => y.year - x.year)[0];
    return one(p, p === undefined ? '' : `${p.paper} ${p.series ?? p.year}`);
  }
  return null;
}
