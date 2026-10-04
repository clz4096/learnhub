/**
 * Replays a trace on the main thread to answer Explain mode's "why" questions: which
 * access filled a slot, the replacement order in a set, and, for one line, its reuse
 * distance in each cache (how many distinct lines came between two uses).
 *
 * Everything is derived from the engine's own events, so it matches what the worker
 * ran: the engine touches a slot (LRU stamp, PLRU bits) exactly on Hit, Fill, and
 * Prefetch events, and its shadow LRU sees exactly the Hit and demand-Fill events.
 * (Exception: a miss in a victim-policy L3 updates the shadow without an event, so
 * reuse distances at a victim L3 can read low.)
 */
import { Simulator, EventKind, type Access, type AccessOutcome, type HierarchyConfig } from '@/engine';

/** Replays beyond this many accesses wait for an explicit click (main-thread cost). */
export const AUTO_REPLAY_LIMIT = 300_000;
/** Hard cap for a requested replay. */
export const MAX_REPLAY = 5_000_000;

export interface CacheTrack {
  /** Access index whose events filled each slot, or -1. */
  fillIndex: Float64Array;
  /** 1 when that fill was a prefetch. */
  fillPrefetch: Uint8Array;
  /** Access index of the most recent touch (hit or fill). */
  lastUse: Float64Array;
  /** Global touch order within this cache (LRU order). */
  seq: Float64Array;
  /** Replica of the engine's tree-PLRU bits, (ways - 1) per set. */
  plru: Uint8Array;
  policy: 'lru' | 'plru' | 'random';
  clock: number;
}

export interface LineHistory {
  cache: number;
  line: number;
  /** Access index of the previous demand use of the line in this cache, or -1. */
  lastUse: number;
  /** Access index of the most recent prefetch of the line into this cache, or -1. */
  prefetched: number;
  /** Distinct other lines this cache was asked for since lastUse. */
  distinct: number;
  /** How many of those map to the same set as the line. */
  distinctSameSet: number;
  /** Most recent invalidation of the line in this cache, before the target access. */
  invalidated: { index: number; core: number } | null;
  /** Most recent eviction of the line from this cache, and the line that replaced it. */
  evicted: { index: number; by: number | null } | null;
}

export interface ReplayResult {
  /** Accesses applied (the last one is index count - 1). */
  count: number;
  /** The outcome at the target index, if it was reached. */
  outcome: AccessOutcome | null;
  sim: Simulator;
  tracks: CacheTrack[];
  /** Per cache, for the focus line (empty without a focus line). */
  history: Map<number, LineHistory>;
}

function effectivePolicy(policy: CacheTrack['policy'], ways: number): CacheTrack['policy'] {
  const pow2 = (ways & (ways - 1)) === 0;
  return policy === 'plru' && (!pow2 || ways < 2) ? 'lru' : policy;
}

function plruTouch(bits: Uint8Array, ways: number, set: number, way: number): void {
  const base = set * (ways - 1);
  let node = 0;
  let lo = 0;
  let hi = ways;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    const goRight = way >= mid;
    bits[base + node] = goRight ? 0 : 1;
    node = 2 * node + (goRight ? 2 : 1);
    if (goRight) lo = mid; else hi = mid;
  }
}

export function plruVictim(bits: Uint8Array, ways: number, set: number): number {
  const base = set * (ways - 1);
  let node = 0;
  let lo = 0;
  let hi = ways;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    const right = bits[base + node] === 1;
    node = 2 * node + (right ? 2 : 1);
    if (right) lo = mid; else hi = mid;
  }
  return lo;
}

/** The access at `index`, without simulating (a trace is deterministic). */
export function accessAt(trace: Iterable<Access>, index: number): Access | null {
  let i = 0;
  for (const a of trace) {
    if (i === index) return a;
    i++;
  }
  return null;
}

/**
 * Simulate accesses 0..upto (inclusive). With `focusLine`, also track that line's
 * reuse history in every cache up to (not including) the target access.
 */
export function replay(cfg: HierarchyConfig, trace: Iterable<Access>, upto: number, focusLine?: number): ReplayResult {
  const sim = new Simulator(cfg);
  const tracks: CacheTrack[] = sim.infos.map((info) => {
    const n = info.sets * info.ways;
    const policy = effectivePolicy(info.policy, info.ways);
    return {
      fillIndex: new Float64Array(n).fill(-1),
      fillPrefetch: new Uint8Array(n),
      lastUse: new Float64Array(n).fill(-1),
      seq: new Float64Array(n),
      plru: new Uint8Array(policy === 'plru' ? info.sets * (info.ways - 1) : 0),
      policy,
      clock: 0,
    };
  });
  const focus = focusLine !== undefined;
  const history = new Map<number, LineHistory>();
  const since = new Map<number, Set<number>>();
  let outcome: AccessOutcome | null = null;
  let count = 0;

  for (const a of trace) {
    if (count > upto) break;
    const o = sim.access(a);
    count++;
    const target = o.index === upto;
    if (target) outcome = o;
    const lastFillAt: Array<{ slot: number; line: number } | undefined> = [];
    for (const ev of o.events) {
      const info = sim.infos[ev.cache]!;
      const t = tracks[ev.cache]!;
      const slot = ev.set * info.ways + ev.way;
      const touch = ev.kind === EventKind.Hit || ev.kind === EventKind.Fill || ev.kind === EventKind.Prefetch;
      if (touch) {
        t.lastUse[slot] = o.index;
        t.seq[slot] = ++t.clock;
        if (t.policy === 'plru') plruTouch(t.plru, info.ways, ev.set, ev.way);
      }
      if (ev.kind === EventKind.Fill || ev.kind === EventKind.Prefetch) {
        t.fillIndex[slot] = o.index;
        t.fillPrefetch[slot] = ev.kind === EventKind.Prefetch ? 1 : 0;
        lastFillAt[ev.cache] = { slot, line: ev.line };
      }
      // History describes the line before the target access, so the target is excluded.
      if (!focus || target) continue;
      const demand = ev.kind === EventKind.Hit || (ev.kind === EventKind.Fill && ev.miss !== undefined);
      let h = history.get(ev.cache);
      // A prefetch starts the history too, so a later miss can say no access used the line.
      if (!h && ev.line === focusLine && (demand || ev.kind === EventKind.Prefetch)) {
        history.set(ev.cache, (h = { cache: ev.cache, line: focusLine, lastUse: -1, prefetched: -1, distinct: 0, distinctSameSet: 0, invalidated: null, evicted: null }));
      }
      if (ev.kind === EventKind.Prefetch && ev.line === focusLine) h!.prefetched = o.index;
      if (demand) {
        if (ev.line === focusLine) {
          h!.lastUse = o.index;
          since.set(ev.cache, new Set());
        } else {
          since.get(ev.cache)?.add(ev.line);
        }
      }
      if (ev.line === focusLine && h) {
        if (ev.kind === EventKind.Invalidate) h.invalidated = { index: o.index, core: a.core };
        if (ev.kind === EventKind.Evict) {
          const f = lastFillAt[ev.cache];
          h.evicted = { index: o.index, by: f && f.slot === slot ? f.line : null };
        }
      }
    }
    if (target) break;
  }

  if (focus) {
    for (const [cache, h] of history) {
      const s = since.get(cache);
      if (!s) continue;
      const sets = sim.infos[cache]!.sets;
      const set = focusLine! % sets;
      h.distinct = s.size;
      let same = 0;
      for (const l of s) if (l % sets === set) same++;
      h.distinctSameSet = same;
    }
  }
  return { count, outcome, sim, tracks, history };
}

export interface VictimPrediction {
  policy: CacheTrack['policy'];
  /** Empty ways in the set (filled before anything is evicted). */
  empty: number;
  /** LRU: ways used less recently than this one. */
  older: number;
  /** PLRU: the way the tree points at now (evicted on the next miss into a full set). */
  plruWay: number;
  ways: number;
  /** The way the prediction is about. */
  way: number;
}

/** What the replacement policy would do next in the slot's set. */
export function predictVictim(r: ReplayResult, cache: number, set: number, way: number): VictimPrediction {
  const info = r.sim.infos[cache]!;
  const t = r.tracks[cache]!;
  const lines = r.sim.caches[cache]!.lines;
  const base = set * info.ways;
  let empty = 0;
  let older = 0;
  const mine = t.seq[base + way]!;
  for (let w = 0; w < info.ways; w++) {
    if (lines[base + w]! < 0) { empty++; continue; }
    if (w !== way && t.seq[base + w]! < mine) older++;
  }
  const plruWay = t.policy === 'plru' ? plruVictim(t.plru, info.ways, set) : -1;
  return { policy: t.policy, empty, older, plruWay, ways: info.ways, way };
}
