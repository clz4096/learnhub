/**
 * Everything the Campaign and Report screens show, computed in one place from the campaign,
 * the progress document, and the day planner's log. Also the planner's inputs from the
 * campaign (`campaignPlanInputs`).
 */
import { isStudyEntry, type Progress } from '@learnhub/mastery';
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
import { RUNG_NAMES, activeAttempt, rungMinutes, rungSets, type LadderAttempt } from './ladder';
import { ladderNext, partName } from './ladderNext';
import { readiness } from './readiness';

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
    // Gym work earns its own, lower REP (GYM_REP), so a gym-only day is not a study day.
    historyDates: p.history.filter(isStudyEntry).map((h) => planDate(h.at)),
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
 * known yet). Campaign timed work goes through the timed ladder (ladder.ts): the block is
 * the next rung that is open on the exam of the open act's next timed paper, on that paper
 * when it has a set left on the rung. Nothing is scheduled until the exam's topics are
 * ready (readiness.ts): before then the day is lessons, practice, and review. A sitting or
 * rung already running is shown as it is; none is added once timed work finished that day.
 * The daily timed drill, while its effect is in force, also waits for readiness.
 */
export function campaignFixed(
  adm: Admissions, c: Campaign, p: Progress, date: string, today: string, attempts: readonly LadderAttempt[] = [],
): FixedBlock[] {
  if (date !== today) return [];
  const { timed, effects } = campaignPlanInputs(adm, c, p);
  const out: FixedBlock[] = [];
  const running = c.sittings.find((s) => s.finishedAt === null);
  const rung = activeAttempt(attempts);
  const satToday = c.sittings.some((s) => s.finishedAt !== null && planDate(s.finishedAt) === date)
    || attempts.some((a) => a.finishedAt !== null && planDate(a.finishedAt) === date);
  const paper = timed === null ? undefined : adm.registryPaper(timed.paperIds[0] as string);
  const exam = paper?.exam ?? null;
  const ready = exam === null ? null : readiness(p, exam);
  if (running !== undefined) {
    const sat = adm.registryPaper(running.paperId);
    if (sat !== undefined) out.push({ minutes: sat.duration_minutes, title: `Timed paper: ${paperName(sat)}`, detail: 'Running now, no pause', to: { view: 'paper', paperId: sat.id } });
  } else if (rung !== undefined) {
    const on = adm.registryPaper(rung.paperId);
    if (on !== undefined) {
      out.push({ minutes: Math.round(rungMinutes(on, rung.rung)), title: `Timed ladder: ${partName(on, rung.rung, rung.questions)}`, detail: 'Running now, no pause', to: { view: 'ladder', exam: on.exam } });
    }
  } else if (timed !== null && paper !== undefined && exam !== null && ready !== null && !satToday) {
    const n = ladderNext(adm, c, attempts, exam, ready);
    if (n !== null && n.state === 'sit') {
      if (n.rung === 'full') {
        out.push({ minutes: timed.minutes, title: `Timed ladder: ${timed.title}`, detail: `${RUNG_NAMES.full}, from the campaign, to the clock`, to: { view: 'paper', paperId: paper.id } });
      } else {
        // The campaign's own paper when it still has a set on this rung; else the ladder's choice.
        const used = new Set(attempts.filter((a) => a.rung === n.rung && a.paperId === paper.id).map((a) => a.questions.join(',')));
        const set = rungSets(paper, n.rung).find((q) => !used.has(q.join(',')));
        const title = set === undefined ? n.title : partName(paper, n.rung, set);
        const minutes = set === undefined ? n.minutes ?? 0 : rungMinutes(paper, n.rung);
        out.push({ minutes: Math.round(minutes), title: `Timed ladder: ${title}`, detail: `${RUNG_NAMES[n.rung]}, from the campaign, to the clock`, to: { view: 'ladder', exam } });
      }
    }
  }
  if (effects.some((e) => e.id === 'timed-drill') && readiness(p, exam ?? 'STEP').ready) {
    out.push({ minutes: DRILL_MINUTES, title: 'Timed drill', detail: 'One past-paper question to the clock (Under time is below 40)' });
  }
  return out;
}
