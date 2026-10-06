/**
 * The day log in the learner envelope, day by day (the last `KEEP_DAYS` dates, as the app
 * keeps them).
 *
 * A day's wake time is last writer wins. Its ticks and replans are a last-writer-wins set,
 * each element tagged with the wake time it was made under: a tick names a block by its
 * start minute, and a new wake time moves every block, so ticks made under one wake time
 * mean nothing under another. The day shows the elements of the winning wake time. So two
 * devices that tick different blocks of the same plan offline keep both ticks, and an
 * untick is a later "out" mark that wins over the earlier tick.
 *
 * Changing the wake time on a device marks the old wake time's ticks and replans out (the
 * app clears them), so going back to it later does not bring them back.
 */
import { isDate, parseClock } from '@/model/day';
import { KEEP_DAYS, type DayEntry, type DayLog, type Replan } from '@/model/dayLog';
import {
  canonicalJson, cmp, isObj, isTime, markTo, maxBy, mergeMarks, parseMarks, put, rec, sortedRec, stampAfter, type MarkSet,
} from './join';

export interface DaySyncEntry {
  wake: string;
  /** When the wake time was set. */
  wakeAt: number;
  /** `t|<wake>|<start minute>` for a tick, `r|<wake>|<replan JSON>` for a replan. */
  marks: MarkSet;
}

export interface DaySync {
  days: Record<string, DaySyncEntry>;
}

export const emptyDaySync = (): DaySync => ({ days: rec() });

const tKey = (wake: string, start: number): string => `t|${wake}|${start}`;
const rKey = (wake: string, r: Replan): string => `r|${wake}|${canonicalJson({ at: r.at, ticks: r.ticks })}`;
const ofWake = (wake: string) => (k: string): boolean => k.startsWith(`t|${wake}|`) || k.startsWith(`r|${wake}|`);

/** The day as the app stores it: the winning wake time's ticks and replans. */
export function dayEntryOf(e: DaySyncEntry): DayEntry {
  const ticks: number[] = [];
  const replans: Replan[] = [];
  const tp = `t|${e.wake}|`;
  const rp = `r|${e.wake}|`;
  for (const [k, m] of Object.entries(e.marks)) {
    if (!m.on) continue;
    if (k.startsWith(tp)) {
      const n = Number(k.slice(tp.length));
      if (Number.isInteger(n)) ticks.push(n);
    } else if (k.startsWith(rp)) {
      try {
        const r: unknown = JSON.parse(k.slice(rp.length));
        if (isObj(r) && Number.isInteger(r.at) && Array.isArray(r.ticks) && r.ticks.every((t) => Number.isInteger(t))) {
          replans.push({ at: r.at as number, ticks: [...(r.ticks as number[])] });
        }
      } catch {
        // Not a replan: skipped.
      }
    }
  }
  const entry: DayEntry = { wake: e.wake, ticks: ticks.sort((a, b) => a - b) };
  if (replans.length > 0) entry.replans = replans.sort((x, y) => x.at - y.at || cmp(canonicalJson(x), canonicalJson(y)));
  return entry;
}

export function dayLogOf(s: DaySync): DayLog {
  const out: DayLog = {};
  for (const d of Object.keys(s.days).sort()) out[d] = dayEntryOf(s.days[d] as DaySyncEntry);
  return out;
}

/** The last `KEEP_DAYS` dates, in order. */
export function normalizeDay(s: DaySync): DaySync {
  const days = rec<DaySyncEntry>();
  for (const d of Object.keys(s.days).sort().slice(-KEEP_DAYS)) {
    const e = s.days[d] as DaySyncEntry;
    put(days, d, { wake: e.wake, wakeAt: e.wakeAt, marks: sortedRec(e.marks) });
  }
  return { days };
}

export function mergeDay(a0: DaySync, b0: DaySync): DaySync {
  const a = normalizeDay(a0);
  const b = normalizeDay(b0);
  const days = rec<DaySyncEntry>();
  for (const d of new Set([...Object.keys(a.days), ...Object.keys(b.days)])) {
    const x = a.days[d];
    const y = b.days[d];
    if (x === undefined || y === undefined) {
      put(days, d, (x ?? y)!);
      continue;
    }
    const w = maxBy(x, y, (e) => [e.wakeAt, e.wake]);
    put(days, d, { wake: w.wake, wakeAt: w.wakeAt, marks: mergeMarks(x.marks, y.marks) });
  }
  return normalizeDay({ days });
}

/** Takes this device's stored days into the state: changed wake times, ticks, and replans are stamped `now`. Missing days are kept. */
export function observeDay(s0: DaySync, cur: DayLog, now: number): DaySync {
  const s = normalizeDay(s0);
  const days = rec<DaySyncEntry>();
  for (const d of Object.keys(s.days)) put(days, d, s.days[d] as DaySyncEntry);
  for (const [d, e] of Object.entries(cur)) {
    const want = new Set([...e.ticks.map((t) => tKey(e.wake, t)), ...(e.replans ?? []).map((r) => rKey(e.wake, r))]);
    const was = days[d];
    if (was === undefined) {
      put(days, d, { wake: e.wake, wakeAt: now, marks: markTo(rec(), want, () => false, now) });
      continue;
    }
    const moved = was.wake !== e.wake;
    const scope = moved ? (k: string): boolean => ofWake(was.wake)(k) || ofWake(e.wake)(k) : ofWake(e.wake);
    put(days, d, { wake: e.wake, wakeAt: moved ? stampAfter(now, was.wakeAt) : was.wakeAt, marks: markTo(was.marks, want, scope, now) });
  }
  return mergeDay(s, { days });
}

export function parseDaySync(x: unknown): DaySync | null {
  if (!isObj(x) || !isObj(x.days)) return null;
  const days = rec<DaySyncEntry>();
  for (const [d, e] of Object.entries(x.days)) {
    if (!isDate(d) || !isObj(e) || typeof e.wake !== 'string' || parseClock(e.wake) === null || !isTime(e.wakeAt)) continue;
    put(days, d, { wake: e.wake, wakeAt: e.wakeAt, marks: parseMarks(e.marks) });
  }
  return normalizeDay({ days });
}
