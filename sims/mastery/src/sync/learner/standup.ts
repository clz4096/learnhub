/**
 * Standups in the learner envelope (`mastery.standup.v1`; model/standupLog.ts): one entry per
 * date. Never the audio, which stays on the device that recorded it.
 *
 * Per date, the entry submitted last wins (`checkedAt`); on a tie, the larger entry as
 * canonical JSON, so the order is total and the merge is a join. Then only the latest
 * `STANDUP_KEEP_DAYS` dates are kept: the top K keys of a union, which commutes with the
 * per-date maximum (a date dropped from one copy is below K dates of the union, so it is
 * dropped from the merge as well), so the merge stays idempotent, commutative, and
 * associative.
 */
import { keepRecent, parseStandupLog, type StandupEntry, type StandupLog } from '@/model/standupLog';
import { canonicalJson, isObj, maxBy, put, rec, type Key } from './join';

export interface StandupSync {
  entries: StandupLog;
}

export const emptyStandupSync = (): StandupSync => ({ entries: rec() });

const order = (e: StandupEntry): Key => [e.checkedAt, canonicalJson(e)];

export function mergeStandup(a: StandupSync, b: StandupSync): StandupSync {
  const out = rec<StandupEntry>();
  for (const d of [...new Set([...Object.keys(a.entries), ...Object.keys(b.entries)])].sort()) {
    // Own keys only: a log from the app may be a plain object.
    const x = Object.hasOwn(a.entries, d) ? a.entries[d] : undefined;
    const y = Object.hasOwn(b.entries, d) ? b.entries[d] : undefined;
    put(out, d, x === undefined ? y! : y === undefined ? x : maxBy(x, y, order));
  }
  return { entries: keepRecent(out) };
}

export const normalizeStandup = (s: StandupSync): StandupSync => mergeStandup(s, s);

/** Takes this device's stored log in. Each entry carries its own stamp, so `now` is not needed. */
export function observeStandup(s: StandupSync, v: StandupLog): StandupSync {
  return mergeStandup(s, { entries: v });
}

export function standupLogOf(s: StandupSync): StandupLog {
  return keepRecent(s.entries);
}

/**
 * The part from untrusted JSON. Missing (an envelope from a build before standups synced)
 * is empty; not an object refuses the envelope; bad entries are dropped.
 */
export function parseStandupSync(x: unknown): StandupSync | null {
  if (x === undefined) return emptyStandupSync();
  if (!isObj(x)) return null;
  return normalizeStandup({ entries: parseStandupLog(x.entries) });
}
