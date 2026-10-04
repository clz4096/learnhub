/**
 * Downsampled time series for the charts. Shared by the worker (run to end) and the
 * main thread (playback), so both produce the same shape.
 *
 * Keeps at most MAX_POINTS points: a new point is taken only when the access index
 * has moved at least `stride` past the last point; on overflow every other point is
 * dropped and the stride doubles. Memory and chart cost stay bounded at any trace length.
 */
import type { HierarchyConfig, Stats } from '@/engine/types';

export const MAX_POINTS = 600;

export interface HistoryPoint {
  /** Accesses completed when the point was taken. */
  i: number;
  /** Cumulative demand hit rate (0 to 1) per level, NaN before the first access there. */
  l1: number;
  l2: number;
  l3: number;
  cycles: number;
  amat: number;
}

export interface HistoryState {
  points: HistoryPoint[];
  stride: number;
}

/** Level names to chart, in order L1, L2, L3 (L3 may be absent). */
export interface LevelNames { l1: string; l2: string; l3?: string }

export function levelNames(cfg: HierarchyConfig): LevelNames {
  return { l1: cfg.l1d.name, l2: cfg.l2.name, l3: cfg.l3?.name };
}

function rate(s: Stats, name: string | undefined): number {
  const l = name ? s.levels[name] : undefined;
  return l && l.accesses > 0 ? l.hits / l.accesses : NaN;
}

export function historyPoint(s: Stats, names: LevelNames): HistoryPoint {
  return {
    i: s.accesses,
    l1: rate(s, names.l1),
    l2: rate(s, names.l2),
    l3: rate(s, names.l3),
    cycles: s.cycles,
    amat: s.amat,
  };
}

export function emptyHistory(): HistoryState {
  return { points: [], stride: 1 };
}

/** True when a point at access index `i` would be kept. Cheap; call before computing stats. */
export function wantsPoint(h: HistoryState, i: number): boolean {
  const last = h.points[h.points.length - 1];
  return !last || i - last.i >= h.stride;
}

/** Appends `p` if due; returns true if the history changed. */
export function offerPoint(h: HistoryState, p: HistoryPoint): boolean {
  if (!wantsPoint(h, p.i)) return false;
  h.points.push(p);
  if (h.points.length > MAX_POINTS) {
    h.points = h.points.filter((_, k) => k % 2 === 0);
    h.stride *= 2;
  }
  return true;
}
