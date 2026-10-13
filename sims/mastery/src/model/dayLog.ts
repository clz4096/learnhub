/**
 * Each day's wake time and ticked-off blocks, kept in localStorage. Not part of the progress
 * document; sync carries it in the learner envelope (sync/learner). A plan is
 * rebuilt from its date and wake time, so only those, the ticks (slot start times), and any
 * replans (when, and the ticks then) are stored. Old days are dropped; the week view needs
 * the last seven.
 *
 * A day and each replan also keep the anchors they were made with (`DayAnchors`), when
 * they are not the defaults: a plan is rebuilt on every view, so the anchors in Settings
 * must not move a day already planned, or its ticks would name blocks that moved. New
 * anchors reach a planned day through Plan from now. Absent anchors are the defaults, which
 * every day stored before anchors could change was made with.
 */
import {
  DEFAULT_ANCHORS, anchorsProblem, isDate, parseClock, planFor, replanDay, sameAnchors, type DayAnchors, type DayPlan, type FixedBlock,
} from './day';
import { learnerChanged } from './learnerChange';

export const DAY_KEY = 'mastery.day.v1';
/** Days kept; sync keeps the same number. */
export const KEEP_DAYS = 21;

export interface DayEntry {
  /** HH:MM, as the time input gives it. */
  wake: string;
  ticks: number[];
  /** Replan from now, in order: the plan minute it was pressed and the ticks at that moment. */
  replans?: Replan[];
  /** The anchors the day was planned with; absent for the defaults. */
  anchors?: DayAnchors;
}

export interface Replan {
  at: number;
  ticks: number[];
  /** The anchors the rest of the day was planned with; absent for the defaults. */
  anchors?: DayAnchors;
}

/** `{ anchors }` to spread into an entry or a replan, or nothing for the defaults. */
export const withAnchors = (a: Readonly<DayAnchors>): { anchors?: DayAnchors } =>
  (sameAnchors(a, DEFAULT_ANCHORS) ? {} : { anchors: { gymStart: a.gymStart, dinner: a.dinner, bed: a.bed } });

/** Stored anchors, if they make a day and are not the defaults; otherwise absent (the defaults). */
export function parseAnchors(v: unknown): { anchors?: DayAnchors } {
  if (typeof v !== 'object' || v === null) return {};
  const { gymStart, dinner, bed } = v as Record<string, unknown>;
  const a = { gymStart, dinner, bed } as DayAnchors;
  return anchorsProblem(a) === null ? withAnchors(a) : {};
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

/** Days from parsed JSON; anything malformed is skipped. */
export function parseDayLog(v: unknown): DayLog {
  const out: DayLog = {};
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return out;
  for (const [date, e] of Object.entries(v as Record<string, unknown>)) {
    if (!isDate(date) || typeof e !== 'object' || e === null) continue;
    const { wake, ticks } = e as { wake?: unknown; ticks?: unknown };
    if (typeof wake !== 'string' || parseClock(wake) === null || !Array.isArray(ticks)) continue;
    const entry: DayEntry = { wake, ticks: ints(ticks), ...parseAnchors((e as { anchors?: unknown }).anchors) };
    const replans = (e as { replans?: unknown }).replans;
    if (Array.isArray(replans)) {
      entry.replans = replans
        .filter((r): r is { at: number; ticks: unknown[]; anchors?: unknown } =>
          typeof r === 'object' && r !== null && Number.isInteger((r as { at?: unknown }).at) && Array.isArray((r as { ticks?: unknown }).ticks))
        .map((r) => ({ at: r.at, ticks: ints(r.ticks), ...parseAnchors(r.anchors) }));
    }
    out[date] = entry;
  }
  return out;
}

/** The stored days; anything malformed is skipped. */
export function loadDays(): DayLog {
  try {
    const raw = store()?.getItem(DAY_KEY);
    if (raw === null || raw === undefined) return {};
    return parseDayLog(JSON.parse(raw));
  } catch {
    // Unreadable: start with no days.
    return {};
  }
}

/**
 * Saves one day and returns the log as saved. Keeps the most recent days only. The days
 * stored now are the base, over the caller's copy: sync or another tab may have written
 * days since the caller read them, and those must not be overwritten by a stale copy.
 */
export function saveDay(log: DayLog, date: string, entry: DayEntry): DayLog {
  const next: DayLog = { ...log, ...loadDays(), [date]: entry };
  const kept = Object.keys(next).sort().slice(-KEEP_DAYS);
  const out: DayLog = Object.fromEntries(kept.map((d) => [d, next[d] as DayEntry]));
  try {
    store()?.setItem(DAY_KEY, JSON.stringify(out));
  } catch {
    // Not saved; the plan lasts for this page.
  }
  learnerChanged('day');
  return out;
}

/** A day's plan from its stored wake time and replans, or null if the wake time is not a time. */
export function planOf(date: string, entry: DayEntry, fixed: readonly FixedBlock[] = []): DayPlan | null {
  const wake = parseClock(entry.wake);
  if (wake === null) return null;
  let plan = planFor(date, wake, fixed, entry.anchors ?? DEFAULT_ANCHORS);
  for (const r of entry.replans ?? []) plan = replanDay(plan, r.at, r.ticks, fixed, r.anchors ?? DEFAULT_ANCHORS);
  return plan;
}
