/**
 * The daily standup log: one entry per date (what the learner said, when it was checked
 * against the record, the gaps found, and how long the recording ran), kept in localStorage.
 * Sync carries it in the learner envelope (sync/learner/standup.ts). The audio is not here:
 * it stays on the device (standupAudio.ts) and is never synced or uploaded.
 */
import { isDate } from './day';
import { learnerChanged } from './learnerChange';

export const STANDUP_KEY = 'mastery.standup.v1';
/** Dates kept, here and in the synced envelope: a year of standups is a few hundred kilobytes at most. */
export const STANDUP_KEEP_DAYS = 366;
/** Longest transcript kept, in characters: 90 seconds of speech is well under 2,000. */
export const MAX_TRANSCRIPT = 10_000;
/** Longest recording counted, in seconds. */
export const MAX_DURATION = 600;
const MAX_FLAGS = 50;
const MAX_FLAG = 400;

export interface StandupEntry {
  date: string;
  transcript: string;
  /** When it was checked and submitted; a later submission for the same date wins a merge. */
  checkedAt: number;
  /** The gaps found, in plain words. */
  flags: string[];
  /** Seconds recorded; 0 when typed. */
  duration: number;
}

export type StandupLog = Record<string, StandupEntry>;

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

function rec<T>(): Record<string, T> {
  return Object.create(null) as Record<string, T>;
}
function put<T>(o: Record<string, T>, k: string, v: T): void {
  Object.defineProperty(o, k, { value: v, enumerable: true, writable: true, configurable: true });
}

/** An entry from untrusted JSON, or null. Copies only the known fields, clamped to their limits. */
export function parseStandupEntry(date: string, x: unknown): StandupEntry | null {
  if (!isDate(date) || !isObj(x)) return null;
  const { transcript, checkedAt, flags, duration } = x;
  if (typeof transcript !== 'string' || typeof checkedAt !== 'number' || !Number.isFinite(checkedAt)) return null;
  if (typeof duration !== 'number' || !Number.isFinite(duration) || duration < 0) return null;
  if (!Array.isArray(flags) || !flags.every((f) => typeof f === 'string')) return null;
  return {
    date,
    transcript: transcript.slice(0, MAX_TRANSCRIPT),
    checkedAt,
    flags: (flags as string[]).slice(0, MAX_FLAGS).map((f) => f.slice(0, MAX_FLAG)),
    duration: Math.min(Math.round(duration), MAX_DURATION),
  };
}

/** The last `STANDUP_KEEP_DAYS` dates, sorted, as a record with no prototype. */
export function keepRecent(log: Readonly<StandupLog>): StandupLog {
  const out = rec<StandupEntry>();
  for (const d of Object.keys(log).sort().slice(-STANDUP_KEEP_DAYS)) put(out, d, log[d] as StandupEntry);
  return out;
}

/** A log from untrusted JSON; malformed entries are dropped. */
export function parseStandupLog(x: unknown): StandupLog {
  const out = rec<StandupEntry>();
  if (!isObj(x)) return out;
  for (const [d, e] of Object.entries(x)) {
    const entry = parseStandupEntry(d, e);
    if (entry !== null) put(out, d, entry);
  }
  return keepRecent(out);
}

function store(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadStandups(): StandupLog {
  try {
    const raw = store()?.getItem(STANDUP_KEY);
    return raw === null || raw === undefined ? rec() : parseStandupLog(JSON.parse(raw));
  } catch {
    return rec();
  }
}

/** Writes the log as sync merged it. Does not report a change. */
export function storeStandups(log: Readonly<StandupLog>): boolean {
  try {
    const s = store();
    if (s === null) return false;
    s.setItem(STANDUP_KEY, JSON.stringify(keepRecent(log)));
    return true;
  } catch {
    return false;
  }
}

/** Saves one date's entry over the log as stored now (sync or another tab may have written since). */
export function saveStandup(entry: StandupEntry): boolean {
  const log = loadStandups();
  put(log, entry.date, entry);
  const ok = storeStandups(log);
  if (ok) learnerChanged('standup');
  return ok;
}

/** The latest entry before `date`, or null. */
export function previousStandup(log: Readonly<StandupLog>, date: string): StandupEntry | null {
  const before = Object.keys(log).filter((d) => d < date).sort();
  const d = before[before.length - 1];
  return d === undefined ? null : (log[d] as StandupEntry);
}
