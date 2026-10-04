/**
 * Playback math, kept pure for testing.
 *
 * At 1× the simulator plays ACCESSES_PER_SECOND accesses per second: slow enough to
 * read each access's path through the hierarchy, fast enough to see a pattern form
 * within a few seconds. Speeds scale that rate (0.5× = 10/s, 8× = 160/s).
 */
export const ACCESSES_PER_SECOND = 20;
export const SPEEDS = [0.5, 1, 2, 4, 8] as const;
export type Speed = (typeof SPEEDS)[number];

/** Longest frame gap credited; a backgrounded tab must not dump seconds of accesses at once. */
export const MAX_DT_MS = 250;
/** Most accesses applied in one frame; bounds per-frame work regardless of speed. */
export const MAX_PER_FRAME = 8;

export interface Advance {
  /** Fractional accesses carried to the next frame, in [0, 1). */
  carry: number;
  /** Whole accesses due this frame. */
  due: number;
}

/** Accumulate `dtMs` of playback at `speed`; returns whole accesses due and the remainder. */
export function advance(carry: number, dtMs: number, speed: number, rate = ACCESSES_PER_SECOND): Advance {
  const dt = Number.isFinite(dtMs) ? Math.min(Math.max(dtMs, 0), MAX_DT_MS) : 0;
  const s = Number.isFinite(speed) ? Math.max(speed, 0) : 0;
  const c = Number.isFinite(carry) ? Math.max(carry, 0) : 0;
  const total = c + (dt * rate * s) / 1000;
  const due = Math.floor(total);
  return { carry: total - due, due };
}

/**
 * Accesses per worker request: about 100 ms of playback, at least 1. Small batches
 * keep the stats (which arrive once per batch) within a fraction of a second of the
 * animation.
 */
export function batchSize(speed: number, rate = ACCESSES_PER_SECOND): number {
  return Math.max(1, Math.round((rate * speed) / 10));
}

/** Keep about one second of playback buffered (and at least 4 accesses) so frames never wait. */
export function lowWater(speed: number, rate = ACCESSES_PER_SECOND): number {
  return Math.max(4, Math.ceil(rate * speed));
}
