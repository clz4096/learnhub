/**
 * Each day's wake time and ticked-off blocks, kept in localStorage in this browser only.
 * Not part of the progress document, so its schema and sync are unchanged. A plan is
 * rebuilt from its date and wake time, so only those, the ticks (slot start times), and any
 * replans (when, and the ticks then) are stored. Old days are dropped; the week view needs
 * the last seven.
 */
import { isDate, parseClock, planFor, replanDay, type DayPlan, type FixedBlock } from './day';

export const DAY_KEY = 'mastery.day.v1';
const KEEP_DAYS = 21;

export interface DayEntry {
  /** HH:MM, as the time input gives it. */
  wake: string;
  ticks: number[];
  /** Replan from now, in order: the plan minute it was pressed and the ticks at that moment. */
  replans?: Replan[];
}

export interface Replan {
  at: number;
  ticks: number[];
}

export type DayLog = Record<string, DayEntry>;

function store(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

const ints = (xs: readonly unknown[]): number[] => xs.filter((t): t is number => Number.isInteger(t));

/** The stored days; anything malformed is skipped. */
export function loadDays(): DayLog {
  const out: DayLog = {};
  try {
    const raw = store()?.getItem(DAY_KEY);
    if (raw === null || raw === undefined) return out;
    const v: unknown = JSON.parse(raw);
    if (typeof v !== 'object' || v === null || Array.isArray(v)) return out;
    for (const [date, e] of Object.entries(v as Record<string, unknown>)) {
      if (!isDate(date) || typeof e !== 'object' || e === null) continue;
      const { wake, ticks } = e as { wake?: unknown; ticks?: unknown };
      if (typeof wake !== 'string' || parseClock(wake) === null || !Array.isArray(ticks)) continue;
      const entry: DayEntry = { wake, ticks: ints(ticks) };
      const replans = (e as { replans?: unknown }).replans;
      if (Array.isArray(replans)) {
        entry.replans = replans
          .filter((r): r is { at: number; ticks: unknown[] } =>
            typeof r === 'object' && r !== null && Number.isInteger((r as { at?: unknown }).at) && Array.isArray((r as { ticks?: unknown }).ticks))
          .map((r) => ({ at: r.at, ticks: ints(r.ticks) }));
      }
      out[date] = entry;
    }
  } catch {
    // Unreadable: start with no days.
  }
  return out;
}

/** Saves one day and returns the log as saved. Keeps the most recent days only. */
export function saveDay(log: DayLog, date: string, entry: DayEntry): DayLog {
  const next: DayLog = { ...log, [date]: entry };
  const kept = Object.keys(next).sort().slice(-KEEP_DAYS);
  const out: DayLog = Object.fromEntries(kept.map((d) => [d, next[d] as DayEntry]));
  try {
    store()?.setItem(DAY_KEY, JSON.stringify(out));
  } catch {
    // Not saved; the plan lasts for this page.
  }
  return out;
}

/** A day's plan from its stored wake time and replans, or null if the wake time is not a time. */
export function planOf(date: string, entry: DayEntry, fixed: readonly FixedBlock[] = []): DayPlan | null {
  const wake = parseClock(entry.wake);
  if (wake === null) return null;
  let plan = planFor(date, wake, fixed);
  for (const r of entry.replans ?? []) plan = replanDay(plan, r.at, r.ticks, fixed);
  return plan;
}
