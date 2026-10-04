/**
 * One set-associative cache instance: lookup, replacement (LRU, tree pseudo-LRU,
 * random), fill/evict, and 3C+coherence miss classification.
 *
 * Storage is flat typed arrays indexed by slot = set * ways + way, so a 9 MiB L3
 * (147k lines) costs a few MB, not 147k objects. A Map from line to slot makes
 * lookup O(1) instead of scanning the set.
 */
import type { CacheInfo, LevelStats, MissKind, ReplacementPolicy } from '@/engine/types';
import { Prng } from '@/engine/prng';

export function emptyLevelStats(): LevelStats {
  return {
    accesses: 0, hits: 0, misses: 0,
    compulsory: 0, capacity: 0, conflict: 0, coherence: 0,
    evictions: 0, writebacks: 0, invalidations: 0,
    prefetchFills: 0, prefetchUseful: 0, servedCycles: 0,
  };
}

export interface Victim {
  line: number;
  state: number;
  wasPrefetched: boolean;
}

export class Cache {
  readonly info: CacheInfo;
  readonly sets: number;
  readonly ways: number;
  /** Policy actually applied (pseudo-LRU needs power-of-two ways; otherwise LRU). */
  readonly effectivePolicy: ReplacementPolicy;
  /** Line number held in each slot; -1 = empty. */
  readonly lines: Float64Array;
  /** 0 = invalid. Private caches: MESI (1 S, 2 E, 3 M). Shared caches: 1 clean, 3 dirty. */
  readonly state: Uint8Array;
  /** 1 while a prefetched line has not yet been used by a demand access. */
  readonly prefetched: Uint8Array;
  stats: LevelStats = emptyLevelStats();

  private readonly slotOf = new Map<number, number>();
  private readonly stamp: Float64Array; // LRU: last-use time per slot
  private readonly plruBits: Uint8Array; // tree-PLRU: (ways - 1) bits per set
  private readonly rng: Prng;
  private clock = 0;

  // Miss classification (Hill's 3C model, plus coherence):
  //   compulsory: this cache has never held the line;
  //   coherence:  the line left only because another core's write invalidated it;
  //   capacity:   a fully associative LRU cache of the same size would also miss;
  //   conflict:   otherwise (the set mapping caused it).
  private readonly seen = new Set<number>();
  private readonly invalidated = new Set<number>();
  // Shadow LRU: line -> stamp of its last use, plus a FIFO of (line, stamp) uses.
  // Evicting pops stale FIFO entries until one matches the map. Amortized O(1).
  // (Map insertion order with keys().next() eviction goes quadratic in V8: deleted
  // entries stay at the front of the table and every eviction rescans them.)
  private readonly shadow = new Map<number, number>();
  private readonly shadowCapacity: number;
  private qLine: number[] = [];
  private qStamp: number[] = [];
  private qHead = 0;
  private shadowClock = 0;

  constructor(info: CacheInfo, seed: number) {
    this.info = info;
    this.sets = info.sets;
    this.ways = info.ways;
    const n = info.sets * info.ways;
    this.lines = new Float64Array(n).fill(-1);
    this.state = new Uint8Array(n);
    this.prefetched = new Uint8Array(n);
    this.stamp = new Float64Array(n);
    const pow2 = (info.ways & (info.ways - 1)) === 0;
    this.effectivePolicy = info.policy === 'plru' && (!pow2 || info.ways < 2) ? 'lru' : info.policy;
    this.plruBits = new Uint8Array(this.effectivePolicy === 'plru' ? info.sets * (info.ways - 1) : 0);
    this.rng = new Prng(seed);
    this.shadowCapacity = n;
  }

  setOf(line: number): number {
    return line % this.sets;
  }

  /** Slot holding `line`, or -1. */
  find(line: number): number {
    const s = this.slotOf.get(line);
    return s === undefined ? -1 : s;
  }

  /** Classify a demand miss. Call BEFORE noteDemand() for the same access. */
  classify(line: number): MissKind {
    if (!this.seen.has(line)) return 'compulsory';
    if (this.invalidated.has(line)) return 'coherence';
    if (!this.shadow.has(line)) return 'capacity';
    return 'conflict';
  }

  /** Record a demand access in the shadow fully associative LRU (for capacity vs conflict). */
  noteDemand(line: number): void {
    this.seen.add(line);
    const t = ++this.shadowClock;
    this.shadow.set(line, t);
    this.qLine.push(line);
    this.qStamp.push(t);
    while (this.shadow.size > this.shadowCapacity) {
      const l = this.qLine[this.qHead]!;
      const st = this.qStamp[this.qHead]!;
      this.qHead++;
      if (this.shadow.get(l) === st) this.shadow.delete(l);
    }
    if (this.qHead > 4096 && this.qHead * 2 > this.qLine.length) {
      this.qLine = this.qLine.slice(this.qHead);
      this.qStamp = this.qStamp.slice(this.qHead);
      this.qHead = 0;
    } else if (this.qLine.length - this.qHead > 2 * this.shadowCapacity + 4096) {
      // A working set that fits never evicts, so nothing pops and stale entries
      // pile up. Rebuild from the live entries; amortized O(log n) per access.
      const live = [...this.shadow].sort((a, b) => a[1] - b[1]);
      this.qLine = live.map((e) => e[0]);
      this.qStamp = live.map((e) => e[1]);
      this.qHead = 0;
    }
  }

  /** Update replacement state for a use of `slot`. */
  touch(slot: number): void {
    this.stamp[slot] = ++this.clock;
    if (this.effectivePolicy === 'plru') this.plruTouch(slot);
  }

  /**
   * Put `line` into its set with `state`, evicting if needed. Returns the slot and
   * the victim (if a valid line was displaced).
   */
  fill(line: number, state: number, isPrefetch: boolean): { slot: number; victim: Victim | null } {
    const set = this.setOf(line);
    const way = this.chooseWay(set);
    const slot = set * this.ways + way;
    let victim: Victim | null = null;
    const old = this.lines[slot]!;
    if (old >= 0) {
      victim = { line: old, state: this.state[slot]!, wasPrefetched: this.prefetched[slot] === 1 };
      this.slotOf.delete(old);
      this.stats.evictions++;
    }
    this.lines[slot] = line;
    this.state[slot] = state;
    this.prefetched[slot] = isPrefetch ? 1 : 0;
    this.slotOf.set(line, slot);
    this.invalidated.delete(line);
    if (isPrefetch) {
      this.seen.add(line); // a prefetched line is no longer "never seen"
      this.stats.prefetchFills++;
    }
    this.touch(slot);
    return { slot, victim };
  }

  /** Remove `line` (coherence invalidation or inclusion back-invalidation). Returns its old state. */
  remove(line: number, byCoherence: boolean): { slot: number; state: number } | null {
    const slot = this.find(line);
    if (slot < 0) return null;
    const st = this.state[slot]!;
    this.lines[slot] = -1;
    this.state[slot] = 0;
    this.prefetched[slot] = 0;
    this.stamp[slot] = 0;
    this.slotOf.delete(line);
    if (byCoherence) {
      this.invalidated.add(line);
      this.stats.invalidations++;
    }
    return { slot, state: st };
  }

  private chooseWay(set: number): number {
    const base = set * this.ways;
    for (let w = 0; w < this.ways; w++) if (this.lines[base + w]! < 0) return w; // empty way first
    switch (this.effectivePolicy) {
      case 'random':
        return this.rng.int(this.ways);
      case 'plru':
        return this.plruVictim(set);
      default: {
        let best = 0;
        let bestStamp = Infinity;
        for (let w = 0; w < this.ways; w++) {
          const t = this.stamp[base + w]!;
          if (t < bestStamp) { bestStamp = t; best = w; }
        }
        return best;
      }
    }
  }

  // Tree pseudo-LRU: a binary tree of (ways - 1) bits per set. Bit 0 means "the
  // victim is in the left subtree", 1 means right. Using a way flips each bit on its
  // path to point AWAY from it, so the victim walk finds a not-recently-used way.
  private plruTouch(slot: number): void {
    const set = Math.floor(slot / this.ways);
    const way = slot - set * this.ways;
    const base = set * (this.ways - 1);
    let node = 0;
    let lo = 0;
    let hi = this.ways;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      const goRight = way >= mid;
      this.plruBits[base + node] = goRight ? 0 : 1; // point the victim the other way
      node = 2 * node + (goRight ? 2 : 1);
      if (goRight) lo = mid; else hi = mid;
    }
  }

  private plruVictim(set: number): number {
    const base = set * (this.ways - 1);
    let node = 0;
    let lo = 0;
    let hi = this.ways;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      const right = this.plruBits[base + node] === 1;
      node = 2 * node + (right ? 2 : 1);
      if (right) lo = mid; else hi = mid;
    }
    return lo;
  }
}
