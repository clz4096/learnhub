/**
 * One day as the planner shows it, computed once for Today's header (the Now card, Later
 * today, the side column) and for the full planner below it: the plan from the wake time,
 * the queue filled into its study blocks, what is still to do, and the block running now.
 *
 * The queue (`dayItems`) runs the scheduler round after round, so it is cached per
 * progress document, budget, and day; the header and the planner share one computation.
 */
import type { Progress } from '@learnhub/mastery';
import { CORE, fillBlocks, parseClock, planDate, planMinute, sunsetMinutes, tickedMinutes, weekOf, weekdayOf, addDays, type DayPlan, type FixedBlock, type Slot } from '@/model/day';
import { planOf, type DayEntry, type DayLog } from '@/model/dayLog';
import { dayItems, type DayItem } from '@/model/dayQueue';
import { localDay } from '@/model/learner';
import { mixedDoneOn } from '@/model/mixedReview';
import { loadMixed } from '@/model/mixedStore';

export const DEFAULT_WAKE = '09:00';
export const WEEK_TARGET_HOURS = 36;

/** One entry of Up next: a queue item, or a timed paper with its block. */
export type Next = { item: DayItem; slot: Slot | null } | { paper: Slot };

export interface DayView {
  date: string;
  isToday: boolean;
  entry: DayEntry;
  wake: number;
  plan: DayPlan;
  fixed: readonly FixedBlock[];
  /** Plan minutes now (past midnight runs over 1440). */
  nowMin: number;
  ticks: ReadonlySet<number>;
  /** The queue for today, with the moment it was planned. */
  queue: { at: number; items: DayItem[] };
  budget: number;
  studySlots: Slot[];
  fill: Map<Slot, DayItem[]>;
  left: DayItem[];
  /** Fill blocks with nothing in them, today. */
  dryBlocks: number;
  upNext: Next[];
  /** The block running now, today; never a break. */
  cur: Slot | undefined;
  /** Core study minutes done: ticked blocks whole, the running one by the clock. */
  coreDone: number;
}

/** Minutes the queue fills on a plan: its study and optional blocks, less timed papers. */
export const fillMinutes = (plan: DayPlan): number =>
  plan.slots.filter((s) => (s.kind === 'study' || s.kind === 'optional') && s.fixed === undefined).reduce((a, s) => a + s.end - s.start, 0);

const cache = new WeakMap<Progress, Map<string, { at: number; items: DayItem[] }>>();

/** `dayItems`, computed once per document, budget, day, and whether the mixed review is done; `at` is when it was first planned. */
export function cachedItems(p: Progress, t: number, budget: number): { at: number; items: DayItem[] } {
  let m = cache.get(p);
  if (m === undefined) {
    m = new Map();
    cache.set(p, m);
  }
  const day = localDay(t);
  const mixedDone = mixedDoneOn(loadMixed(), day);
  const key = `${budget}|${day}|${mixedDone ? 1 : 0}`;
  const hit = m.get(key);
  if (hit !== undefined) return hit;
  const q = { at: t, items: dayItems(p, t, budget, mixedDone) };
  m.set(key, q);
  return q;
}

/** The queue fills the day's study minutes, less redos and the mixed review. */
export function budgetFor(p: Progress, plan: DayPlan, t: number): number {
  const fixedItems = dayItems(p, t).filter((x) => x.kind === 'redo' || x.kind === 'mixed').reduce((a, x) => a + x.minutes, 0);
  return Math.max(0, fillMinutes(plan) - fixedItems);
}

export function dayView(p: Progress, log: DayLog, date: string, t: number, fixedFor: (date: string) => readonly FixedBlock[]): DayView {
  const today = planDate(t);
  const entry: DayEntry = log[date] ?? { wake: DEFAULT_WAKE, ticks: [] };
  const wake = parseClock(entry.wake) ?? (parseClock(DEFAULT_WAKE) as number);
  const fixed = fixedFor(date);
  const plan = planOf(date, entry, fixed) ?? (planOf(date, { wake: DEFAULT_WAKE, ticks: [] }, fixed) as DayPlan);
  const isToday = date === today;
  const nowMin = planMinute(t);
  const ticks = new Set(entry.ticks);
  const budget = isToday ? budgetFor(p, plan, t) : 0;
  const queue = isToday ? cachedItems(p, t, budget) : { at: t, items: [] };

  const studySlots = plan.slots.filter((s) => s.kind === 'study' || s.kind === 'optional');
  const fillSlots = studySlots.filter((s) => s.fixed === undefined);
  const { filled, left } = fillBlocks(fillSlots.map((s) => ({ minutes: s.end - s.start, heavy: s.heavy, optional: s.kind === 'optional' })), queue.items);
  const fill = new Map<Slot, DayItem[]>(fillSlots.map((s, i) => [s, filled[i] ?? []]));
  const dryBlocks = isToday ? fillSlots.filter((s) => (fill.get(s) ?? []).length === 0).length : 0;

  const upNext: Next[] = [];
  for (const s of studySlots) {
    if (s.fixed !== undefined) {
      if (!ticks.has(s.start) && !(isToday && s.end <= nowMin)) upNext.push({ paper: s });
      continue;
    }
    for (const x of fill.get(s) ?? []) if (!x.done) upNext.push({ item: x, slot: s });
  }
  for (const x of left) if (!x.done) upNext.push({ item: x, slot: null });

  const cur = isToday ? plan.slots.find((s) => s.kind !== 'break' && nowMin >= s.start && nowMin < s.end) : undefined;
  const coreDone = Math.min(CORE, plan.slots.filter((s) => s.kind === 'study').reduce((a, s) => {
    const len = s.end - s.start;
    if (ticks.has(s.start)) return a + len;
    return isToday ? a + Math.min(len, Math.max(0, nowMin - s.start)) : a;
  }, 0));
  return { date, isToday, entry, wake, plan, fixed, nowMin, ticks, queue, budget, studySlots, fill, left, dryBlocks, upNext, cur, coreDone };
}

/** Minutes ticked off on each day of the week holding `date`, Sunday first. */
export function weekMinutes(log: DayLog, date: string, fixedFor: (date: string) => readonly FixedBlock[]): { date: string; minutes: number }[] {
  return weekOf(date).map((d) => {
    const e = log[d];
    const dp = e === undefined ? null : planOf(d, e, fixedFor(d));
    return { date: d, minutes: e === undefined || dp === null ? 0 : tickedMinutes(dp, e.ticks) };
  });
}

/** This week's Shabbat: Friday's and Saturday's dates and sundowns, in plan minutes. */
export function shabbatOf(date: string): { fri: string; sat: string; begins: number; ends: number } {
  const dow = weekdayOf(date);
  const fri = dow === 6 ? addDays(date, -1) : addDays(date, 5 - dow);
  const sat = addDays(fri, 1);
  return { fri, sat, begins: sunsetMinutes(fri), ends: sunsetMinutes(sat) };
}

/**
 * Days in a row with study, ending today (or yesterday, when today has none yet): a day
 * counts with a study entry in the history (not gym work) or ticked hours in the planner.
 */
export function streakDays(p: Progress, log: DayLog, t: number, fixedFor: (date: string) => readonly FixedBlock[]): number {
  const days = new Set(p.history.filter((h) => h.kind !== 'placement' && h.kind !== 'gym').map((h) => planDate(h.at)));
  for (const [d, e] of Object.entries(log)) {
    const dp = planOf(d, e, fixedFor(d));
    if (dp !== null && tickedMinutes(dp, e.ticks) > 0) days.add(d);
  }
  let d = planDate(t);
  if (!days.has(d)) d = addDays(d, -1);
  let n = 0;
  while (days.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}
