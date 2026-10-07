/**
 * The standup's settings (on or off, its time, read aloud muted or not) and Albert's
 * attendance, in one signal.
 *
 * The settings are kept in localStorage (`mastery.standupcfg.v1`) and synced in the learner
 * envelope, each field last writer wins (sync/learner/standupCfg.ts). Attendance is not
 * stored here: a date counts as attended when the standup log (standupLog.ts, also synced)
 * has a submitted entry for it, so attendance follows the learner to every device.
 *
 * `since` is the first day this browser knew about standups: a standup before it is not
 * counted as missed, so the feature does not open with a beat for days nobody could attend.
 * It stays on this device and is not synced.
 */
import { signal } from '@preact/signals';
import { addDays, isDate } from './day';
import type { FixedBlock } from './day';
import { learnerChanged } from './learnerChange';
import { standupBlock } from './standup';
import { loadStandups } from './standupLog';
import { DEFAULT_STANDUP, parseStandupSettings, type StandupSettings } from './standupSettings';

export { validMinutes } from './standupSettings';

export const STANDUP_CFG_KEY = 'mastery.standupcfg.v1';
/** How far back a standup can count as missed: enough for any beat's look back. */
export const KEEP_ATTENDED = 120;

/** What `mastery.standupcfg.v1` holds. */
export interface StandupCfg extends StandupSettings {
  /** The first day this browser counted standups from; null until set. */
  since: string | null;
}

export interface StandupState extends StandupCfg {
  /** Days Albert gave his update (the log's dates), YYYY-MM-DD, oldest first. */
  attended: string[];
}

export function emptyStandup(): StandupState {
  return { ...DEFAULT_STANDUP, attended: [], since: null };
}

export function parseStandupCfg(raw: string | null): StandupCfg {
  let v: unknown = null;
  if (raw !== null) {
    try {
      v = JSON.parse(raw);
    } catch {
      v = null;
    }
  }
  const since = typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>).since : undefined;
  return { ...parseStandupSettings(v), since: typeof since === 'string' && isDate(since) ? since : null };
}

function store(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function loadCfg(): StandupCfg {
  try {
    return parseStandupCfg(store()?.getItem(STANDUP_CFG_KEY) ?? null);
  } catch {
    return parseStandupCfg(null);
  }
}

function writeCfg(c: StandupCfg): boolean {
  try {
    const s = store();
    if (s === null) return false;
    const { minutes, muted, enabled, since } = c;
    s.setItem(STANDUP_CFG_KEY, JSON.stringify({ minutes, muted, enabled, since }));
    return true;
  } catch {
    return false;
  }
}

/** The dates with a submitted standup in the log, oldest first. */
function attendedDates(): string[] {
  return Object.keys(loadStandups()).sort();
}

export function loadStandup(): StandupState {
  return { ...loadCfg(), attended: attendedDates() };
}

export const standup = signal<StandupState>(loadStandup());

/** Reads the settings and the log again: after a standup is submitted, or sync wrote either. */
export function reloadStandup(): void {
  standup.value = loadStandup();
}

const settingsOf = ({ minutes, muted, enabled }: StandupSettings): StandupSettings => ({ minutes, muted, enabled });
const sameSettings = (a: StandupSettings, b: StandupSettings): boolean =>
  a.minutes === b.minutes && a.muted === b.muted && a.enabled === b.enabled;

/** The settings as stored now, for sync. */
export function loadStandupSettings(): StandupSettings {
  return settingsOf(loadCfg());
}

/** Writes the settings as sync merged them, keeping this device's `since`. Does not report a change. */
export function storeStandupSettings(s: StandupSettings): boolean {
  const ok = writeCfg({ ...settingsOf(s), since: loadCfg().since });
  reloadStandup();
  return ok;
}

/**
 * Saves the settings and `since` from `next` (attendance comes from the log, so `attended`
 * is ignored), and reports a settings change to sync. False when the browser would not keep it.
 */
export function saveStandup(next: StandupState): boolean {
  const before = loadCfg();
  const ok = writeCfg(next);
  standup.value = { ...settingsOf(next), since: next.since, attended: attendedDates() };
  if (ok && !sameSettings(before, next)) learnerChanged('standupCfg');
  return ok;
}

/** Sets `since` to `today` the first time; later calls keep it. Returns the day standups count from. */
export function ensureSince(today: string): string {
  const st = standup.peek();
  if (st.since !== null) return st.since;
  saveStandup({ ...st, since: today });
  return today;
}

/** Days standups count as missed from: `since`, but never more than KEEP_ATTENDED days back. */
export function countFrom(st: StandupState, today: string): string {
  const floor = addDays(today, -KEEP_ATTENDED + 1);
  const since = st.since ?? today;
  return since > floor ? since : floor;
}

/** The planner's standup block on `date`, from the stored settings. */
export function standupFixed(date: string): FixedBlock[] {
  const b = standupBlock(date, standup.value);
  return b === null ? [] : [b];
}

/** A planner's fixed blocks with the standup first: a `fixed` function for the day planner. */
export function withStandup(fixedFor: (date: string) => readonly FixedBlock[]): (date: string) => readonly FixedBlock[] {
  return (date) => [...standupFixed(date), ...fixedFor(date)];
}
