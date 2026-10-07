/**
 * The standup's settings in the learner envelope (`mastery.standupcfg.v1`;
 * model/standupStore.ts): on or off, the start time, and read aloud muted. Each field is its
 * own register, last writer wins: turning standups off on the phone and moving the time on
 * the Mac both survive the merge.
 *
 * Per field, the later stamp wins; on a tie, the larger value as canonical JSON, so the
 * order is total and the merge is a join (idempotent, commutative, associative). A field is
 * stamped when this device's stored value differs from the envelope's (`stampAfter`, so a
 * change beats the value it replaced even when the clock has gone back).
 *
 * Unsafe case: two devices changing the same field while apart keep only the later change
 * by device clock; with a skewed clock the earlier change in real time can win.
 */
import {
  DEFAULT_STANDUP, parseStandupSettings, validMinutes, type StandupSettings,
} from '@/model/standupSettings';
import { canonicalJson, isObj, isTime, maxBy, stampAfter } from './join';

/** A last-writer-wins register. */
export interface Lww<T> {
  value: T;
  at: number;
}

export interface StandupCfgSync {
  minutes: Lww<number>;
  muted: Lww<boolean>;
  enabled: Lww<boolean>;
}

const FIELDS = ['minutes', 'muted', 'enabled'] as const;
type Field = (typeof FIELDS)[number];

const VALID: Readonly<Record<Field, (x: unknown) => boolean>> = {
  minutes: validMinutes,
  muted: (x) => typeof x === 'boolean',
  enabled: (x) => typeof x === 'boolean',
};

/** The defaults, stamped 0: any setting the learner made beats them. */
export const emptyStandupCfgSync = (): StandupCfgSync => ({
  minutes: { value: DEFAULT_STANDUP.minutes, at: 0 },
  muted: { value: DEFAULT_STANDUP.muted, at: 0 },
  enabled: { value: DEFAULT_STANDUP.enabled, at: 0 },
});

function mergeField<T>(a: Lww<T>, b: Lww<T>): Lww<T> {
  const w = maxBy(a, b, (r) => [r.at, canonicalJson(r.value)]);
  return { value: w.value, at: w.at };
}

export function mergeStandupCfg(a: StandupCfgSync, b: StandupCfgSync): StandupCfgSync {
  return { minutes: mergeField(a.minutes, b.minutes), muted: mergeField(a.muted, b.muted), enabled: mergeField(a.enabled, b.enabled) };
}

export const normalizeStandupCfg = (s: StandupCfgSync): StandupCfgSync => mergeStandupCfg(s, s);

function observeField<T>(r: Lww<T>, v: T, now: number): Lww<T> {
  return r.value === v ? r : { value: v, at: stampAfter(now, r.at) };
}

/** Takes this device's stored settings in: each field that differs is stamped `now`. */
export function observeStandupCfg(s: StandupCfgSync, v: StandupSettings, now: number): StandupCfgSync {
  const c = parseStandupSettings(v);
  return { minutes: observeField(s.minutes, c.minutes, now), muted: observeField(s.muted, c.muted, now), enabled: observeField(s.enabled, c.enabled, now) };
}

export function standupSettingsOf(s: StandupCfgSync): StandupSettings {
  return { minutes: s.minutes.value, muted: s.muted.value, enabled: s.enabled.value };
}

/**
 * The part from untrusted JSON. Missing (an envelope from a build before the settings
 * synced) is the defaults; not an object refuses the envelope; a bad field is its default.
 */
export function parseStandupCfgSync(x: unknown): StandupCfgSync | null {
  if (x === undefined) return emptyStandupCfgSync();
  if (!isObj(x)) return null;
  const out = emptyStandupCfgSync() as unknown as Record<Field, Lww<unknown>>;
  for (const f of FIELDS) {
    const r = x[f];
    if (isObj(r) && isTime(r.at) && VALID[f](r.value)) out[f] = { value: r.value, at: r.at };
  }
  return out as unknown as StandupCfgSync;
}
