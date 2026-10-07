/**
 * The standup's settings: on or off, the start time, and read aloud muted or not. Pure and
 * free of the cohort model, so sync (sync/learner/standupCfg.ts) can read them cheaply.
 */

/** The standup's start, in New York minutes after midnight: 10:00 am. */
export const STANDUP_DEFAULT = 600;
export const STANDUP_LENGTH = 15;
/** The earliest and latest start allowed in settings: 7:00 am to 6:00 pm. */
export const STANDUP_EARLIEST = 420;
export const STANDUP_LATEST = 1080;

export interface StandupSettings {
  /** The start, New York minutes after midnight. */
  minutes: number;
  /** Never read the updates aloud. */
  muted: boolean;
  /** Off: no standup is held, planned, or missed (Albert away from the cohort). */
  enabled: boolean;
}

export const DEFAULT_STANDUP: Readonly<StandupSettings> = { minutes: STANDUP_DEFAULT, muted: false, enabled: true };

/** A start time a setting may hold: on the quarter hour, from 7:00 am to 6:00 pm. */
export function validMinutes(m: unknown): m is number {
  return typeof m === 'number' && Number.isInteger(m) && m >= STANDUP_EARLIEST && m <= STANDUP_LATEST && m % 15 === 0;
}

/** Settings from untrusted JSON: each valid field is kept, any other is the default. */
export function parseStandupSettings(x: unknown): StandupSettings {
  const st: StandupSettings = { ...DEFAULT_STANDUP };
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return st;
  const o = x as Record<string, unknown>;
  if (validMinutes(o.minutes)) st.minutes = o.minutes;
  if (typeof o.muted === 'boolean') st.muted = o.muted;
  if (typeof o.enabled === 'boolean') st.enabled = o.enabled;
  return st;
}
