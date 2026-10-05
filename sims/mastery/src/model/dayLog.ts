/**
 * Each day's wake time and ticked-off blocks, kept in localStorage in this browser only.
 * Not part of the progress document, so its schema and sync are unchanged. A plan is
 * rebuilt from its date and wake time, so only those and the ticks (slot start times) are
 * stored. Old days are dropped; the week view needs the last seven.
 */
import { isDate, parseClock } from './day';

export const DAY_KEY = 'mastery.day.v1';
const KEEP_DAYS = 21;

export interface DayEntry {
  /** HH:MM, as the time input gives it. */
  wake: string;
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
      out[date] = { wake, ticks: ticks.filter((t): t is number => Number.isInteger(t)) };
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
