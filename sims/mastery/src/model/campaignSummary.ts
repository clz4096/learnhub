/**
 * Everything the Campaign and Report screens show, computed in one place from the campaign,
 * the progress document, and the day planner's log. Also the planner's inputs from the
 * campaign (`campaignPlanInputs`).
 */
import type { Progress } from '@learnhub/mastery';
import {
  activeEffects, acts, choiceLocks, currentAct, lettersDue, paperName, stats,
  type Act, type ActInputs, type Admissions, type Campaign, type EffectRule, type LetterId, type Locks, type Stat, type StatInputs,
} from './campaign';
import {
  EARLIEST_ENTRY, cycle, daysStudied, nextTimed, pace, passed, project, remainingHours, weekHours,
  type CampaignPlanInputs, type Cycle, type Pace, type Projection, type TimedBlock,
} from './campaignCalendar';
import { closureTopics } from './courses';
import { planDate, type FixedBlock } from './day';
import type { DayLog } from './dayLog';

export interface CourseInputs extends ActInputs, StatInputs {
  lessonMinutesLeft: number;
  /** Plan dates with a lesson, review, quiz, or supervision in the history. */
  historyDates: string[];
}

/** What the campaign reads from the progress document: the current course's topics. */
export function courseInputs(p: Progress): CourseInputs {
  const ts = closureTopics(p.courses);
  const done = (id: string): boolean => p.memory[id] !== undefined;
  return {
    lessons: { mastered: ts.filter((t) => done(t.id)).length, total: ts.length },
    topics: ts.map((t) => ({ area: t.area, mastered: done(t.id) })),
    lessonMinutesLeft: ts.filter((t) => !done(t.id)).reduce((a, t) => a + t.estMinutes, 0),
    historyDates: p.history.filter((h) => h.kind !== 'placement').map((h) => planDate(h.at)),
  };
}

export interface Summary {
  acts: Act[];
  /** 1 to 5, or 6 once matriculated. */
  act: number;
  stats: Stat[];
  effects: EffectRule[];
  remaining: number[];
  pace: Pace;
  projection: Projection;
  /** The target cycle: the projected entry year, or the earliest when none fits. */
  cycle: Cycle;
  locks: Locks;
  lettersDue: LetterId[];
  next: TimedBlock | null;
  today: string;
  daysStudied: number;
  weekHours: number;
}

export function summarize(adm: Admissions, c: Campaign, p: Progress, log: DayLog, nowMs: number): Summary {
  const inputs = courseInputs(p);
  const list = acts(adm, c, inputs);
  const act = currentAct(list);
  const st = stats(adm, c, inputs);
  const today = planDate(nowMs);
  const remaining = remainingHours(adm, c, list, inputs.lessonMinutesLeft);
  const pc = pace(log, today);
  const projection = project(remaining, pc.hoursPerWeek, today, c.tmuaSitting);
  const cy = cycle(projection.entry ?? EARLIEST_ENTRY, c.tmuaSitting);
  return {
    acts: list, act, stats: st, effects: activeEffects(st), remaining, pace: pc, projection, cycle: cy,
    locks: choiceLocks(c, act, passed(cy, today)), lettersDue: lettersDue(c, list), next: nextTimed(adm, c, list), today,
    daysStudied: daysStudied(log, inputs.historyDates, planDate(c.startedAt)), weekHours: weekHours(log, today),
  };
}

/**
 * The day planner's inputs from the campaign: the timed paper due (for a morning block) and
 * the stat effects in force. `campaignFixed` turns them into the planner's fixed blocks.
 */
export function campaignPlanInputs(adm: Admissions, c: Campaign, p: Progress): CampaignPlanInputs {
  const inputs = courseInputs(p);
  const list = acts(adm, c, inputs);
  return { timed: nextTimed(adm, c, list), effects: activeEffects(stats(adm, c, inputs)) };
}

/** A drill is one STEP question to the clock: a 3-hour paper is six answers, so 30 minutes each. */
export const DRILL_MINUTES = 30;

/**
 * The campaign's fixed blocks for the planner on a date: today only (later days are not
 * known yet). The open act's next timed paper, unless a paper was already sat that day,
 * and the daily timed drill while its effect is in force.
 */
export function campaignFixed(adm: Admissions, c: Campaign, p: Progress, date: string, today: string): FixedBlock[] {
  if (date !== today) return [];
  const { timed, effects } = campaignPlanInputs(adm, c, p);
  const out: FixedBlock[] = [];
  const running = c.sittings.find((s) => s.finishedAt === null);
  const satToday = c.sittings.some((s) => s.finishedAt !== null && planDate(s.finishedAt) === date);
  if (running !== undefined) {
    const paper = adm.registryPaper(running.paperId);
    if (paper !== undefined) out.push({ minutes: paper.duration_minutes, title: `Timed paper: ${paperName(paper)}`, detail: 'Running now, no pause', to: { view: 'paper', paperId: paper.id } });
  } else if (timed !== null && !satToday) {
    out.push({ minutes: timed.minutes, title: `Timed paper: ${timed.title}`, detail: 'From the campaign, to the clock', to: { view: 'paper', paperId: timed.paperIds[0] as string } });
  }
  if (effects.some((e) => e.id === 'timed-drill')) {
    out.push({ minutes: DRILL_MINUTES, title: 'Timed drill', detail: 'One past-paper question to the clock (Under time is below 40)' });
  }
  return out;
}
