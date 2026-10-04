/**
 * The cache hierarchy simulator: private L1d/L1i (+ optional private L2) per core,
 * shared levels (shared L2 and/or L3), DRAM, MESI coherence between cores, optional
 * prefetchers, and full statistics.
 *
 * Model (what it does and deliberately does not do):
 *  - Each access is costed serially: the latency of the level that served it. No
 *    out-of-order overlap, no memory-level parallelism, no store buffer. Absolute
 *    cycles are therefore pessimistic; the TRENDS between access patterns are what
 *    the simulator teaches, and those are checked against real hardware (VERIFY.md).
 *  - A core's private caches are treated as one coherence unit: every private copy of
 *    a line shares one MESI state, kept in a directory (line -> state per core).
 *  - A private L2 is inclusive of that core's L1s. Shared levels follow their
 *    `inclusion` setting (inclusive with back-invalidation, non-inclusive, or victim).
 *  - Writes are write-back + write-allocate at every level.
 */
import { Cache, emptyLevelStats, type Victim } from '@/engine/cache';
import {
  EventKind, Mesi,
  type Access, type AccessOutcome, type CacheInfo, type CoreStats, type HierarchyConfig,
  type LevelConfig, type LevelStats, type MissKind, type SimEvent, type Source, type Stats,
} from '@/engine/types';
import { LIMITS } from '@/engine/limits';

type Inclusion = 'inclusive' | 'non-inclusive' | 'victim';

const PAGE_BYTES = 4096;

function emptyCoreStats(): CoreStats {
  return {
    accesses: 0, reads: 0, writes: 0, cycles: 0, peerTransfers: 0, invalidationsSent: 0,
    servedBy: { L1: 0, L2: 0, L3: 0, DRAM: 0, peer: 0 },
  };
}

/** Throws with a plain-English message if the configuration is impossible. */
export function validateConfig(cfg: HierarchyConfig): void {
  if (!Number.isInteger(cfg.cores) || cfg.cores < 1 || cfg.cores > 8) throw new Error('cores must be 1 to 8');
  const levels = [cfg.l1d, cfg.l1i, cfg.l2, cfg.l3].filter((l): l is LevelConfig => !!l);
  const line = cfg.l1d.lineBytes;
  for (const l of levels) {
    if (l.lineBytes !== line) throw new Error(`${l.name}: every level must use the same line size (${line} B)`);
    if ((line & (line - 1)) !== 0) throw new Error(`${l.name}: line size must be a power of two`);
    if (l.ways < 1 || !Number.isInteger(l.ways)) throw new Error(`${l.name}: ways must be a positive integer`);
    if (l.ways > LIMITS.maxWays) throw new Error(`${l.name}: at most ${LIMITS.maxWays} ways are supported`);
    if (l.sizeBytes / l.lineBytes > LIMITS.maxLinesPerLevel) {
      throw new Error(`${l.name}: at most ${LIMITS.maxLinesPerLevel} lines per level are supported (size / line size)`);
    }
    const sets = l.sizeBytes / (l.lineBytes * l.ways);
    if (!Number.isInteger(sets) || sets < 1) {
      throw new Error(`${l.name}: size ${l.sizeBytes} B is not a whole number of sets of ${l.ways} × ${l.lineBytes} B lines`);
    }
  }
  if (cfg.l1d.scope !== 'core' || (cfg.l1i && cfg.l1i.scope !== 'core')) throw new Error('L1 caches must be per core');
  if (cfg.l3 && cfg.l3.scope !== 'shared') throw new Error('L3 must be shared');
  if (cfg.l2.scope === 'shared' && !cfg.l3) {
    // fine: Apple-style shared L2 with no L3
  }
}

export class Simulator {
  readonly config: HierarchyConfig;
  /** Every cache instance; ids are indexes into this array. */
  readonly caches: Cache[] = [];
  readonly infos: CacheInfo[] = [];

  private readonly l1d: Cache[] = [];
  private readonly l1i: Array<Cache | null> = [];
  private readonly l2p: Array<Cache | null> = []; // private L2 per core, or null when shared
  private readonly shared: Cache[] = []; // shared levels, nearest first
  private readonly sharedInclusion: Inclusion[] = [];
  private readonly sharedSource: Source[] = [];
  private readonly lineBytes: number;
  private readonly dir = new Map<number, Uint8Array>();
  private readonly coreStats: CoreStats[] = [];
  private readonly pf: Array<{ last: number; delta: number }> = [];
  /** Miss kind per shared level for the access being resolved (used when filling). */
  private readonly pendingMiss: Array<MissKind | undefined> = [];
  private index = 0;
  private totalCycles = 0;
  private dramReads = 0;
  private dramWrites = 0;

  constructor(cfg: HierarchyConfig) {
    validateConfig(cfg);
    this.config = cfg;
    this.lineBytes = cfg.l1d.lineBytes;
    let seed = cfg.seed >>> 0;
    const make = (lc: LevelConfig, core: number): Cache => {
      const info: CacheInfo = {
        id: this.caches.length, level: lc.name, core,
        sets: lc.sizeBytes / (lc.lineBytes * lc.ways), ways: lc.ways,
        lineBytes: lc.lineBytes, sizeBytes: lc.sizeBytes, latency: lc.latency, policy: lc.policy,
      };
      const c = new Cache(info, (seed = (seed * 1664525 + 1013904223) >>> 0));
      this.caches.push(c);
      this.infos.push(info);
      return c;
    };
    for (let c = 0; c < cfg.cores; c++) {
      this.l1d.push(make(cfg.l1d, c));
      this.l1i.push(cfg.l1i ? make(cfg.l1i, c) : null);
      this.l2p.push(cfg.l2.scope === 'core' ? make(cfg.l2, c) : null);
      this.coreStats.push(emptyCoreStats());
      this.pf.push({ last: NaN, delta: 0 });
    }
    if (cfg.l2.scope === 'shared') {
      this.shared.push(make(cfg.l2, -1));
      this.sharedInclusion.push(cfg.l2.inclusion ?? 'inclusive');
      this.sharedSource.push('L2');
    }
    if (cfg.l3) {
      this.shared.push(make(cfg.l3, -1));
      this.sharedInclusion.push(cfg.l3.inclusion ?? 'inclusive');
      this.sharedSource.push('L3');
    }
  }

  get accessCount(): number {
    return this.index;
  }

  /** Line number for a byte address. */
  lineOf(addr: number): number {
    return Math.floor(addr / this.lineBytes);
  }

  /** MESI state of `line` in core `c`'s private caches. */
  coreState(line: number, c: number): Mesi {
    return (this.dir.get(line)?.[c] ?? Mesi.I) as Mesi;
  }

  /** Simulate one demand access. */
  access(a: Access): AccessOutcome {
    const c = a.core;
    if (!Number.isInteger(c) || c < 0 || c >= this.config.cores) throw new Error(`access core ${c} out of range`);
    if (!Number.isInteger(a.addr) || a.addr < 0 || a.addr > Number.MAX_SAFE_INTEGER) throw new Error(`bad address ${a.addr}`);
    const line = this.lineOf(a.addr);
    const isWrite = a.kind === 'W';
    const events: SimEvent[] = [];
    const cs = this.coreStats[c]!;
    cs.accesses++;
    if (isWrite) cs.writes++; else cs.reads++;

    const priv = this.privateLevels(c, a.kind);
    const missKind: Array<MissKind | undefined> = [];
    let hitIdx = -1;
    for (let i = 0; i < priv.length; i++) {
      const cache = priv[i]!;
      cache.stats.accesses++;
      const slot = cache.find(line);
      if (slot >= 0) {
        cache.stats.hits++;
        if (cache.prefetched[slot] === 1) {
          cache.prefetched[slot] = 0;
          cache.stats.prefetchUseful++;
        }
        cache.touch(slot);
        cache.noteDemand(line);
        events.push(this.ev(cache, slot, EventKind.Hit, line, undefined, this.coreState(line, c)));
        hitIdx = i;
        break;
      }
      const mk = cache.classify(line);
      cache.stats.misses++;
      cache.stats[mk]++;
      cache.noteDemand(line);
      missKind[i] = mk;
    }

    let cycles: number;
    let servedBy: Source;
    let server: Cache | null; // null when DRAM or a peer core supplied the data
    if (hitIdx >= 0) {
      server = priv[hitIdx]!;
      cycles = server.info.latency;
      servedBy = hitIdx === 0 ? 'L1' : 'L2';
      let st = this.coreState(line, c);
      for (let j = 0; j < hitIdx; j++) this.fillPrivate(c, priv[j]!, line, st, missKind[j], events, false);
      if (isWrite && st !== Mesi.M) {
        if (st === Mesi.S) {
          // Upgrade: invalidate every other copy before writing.
          cs.invalidationsSent += this.invalidateOthers(c, line, events);
          cycles += this.peerLatency();
        }
        st = Mesi.M; // E -> M is silent (no bus traffic)
        this.setCoreState(c, line, st, events, true);
      }
    } else {
      const r = this.privateMiss(c, line, isWrite, events);
      cycles = r.cycles;
      servedBy = r.servedBy;
      server = r.server;
      for (let j = 0; j < priv.length; j++) this.fillPrivate(c, priv[j]!, line, r.state, missKind[j], events, false);
      this.dirSet(line, c, r.state);
    }

    if (a.kind !== 'I' && this.config.prefetch.enabled) this.prefetch(c, line, hitIdx !== 0, events);

    cs.cycles += cycles;
    cs.servedBy[servedBy]++;
    if (server) server.stats.servedCycles += cycles;
    this.totalCycles += cycles;
    return { index: this.index++, access: a, servedBy, cycles, events };
  }

  /** Run many accesses; returns the number processed. Callback per outcome is optional. */
  run(trace: Iterable<Access>, limit = Infinity, onOutcome?: (o: AccessOutcome) => void): number {
    let n = 0;
    for (const a of trace) {
      if (n >= limit) break;
      const o = this.access(a);
      onOutcome?.(o);
      n++;
    }
    return n;
  }

  stats(): Stats {
    const caches = this.caches.map((c) => ({ ...c.stats }));
    const levels: Record<string, LevelStats> = {};
    for (const c of this.caches) {
      const agg = (levels[c.info.level] ??= emptyLevelStats());
      for (const k of Object.keys(agg) as Array<keyof LevelStats>) agg[k] += c.stats[k];
    }
    const accesses = this.index;
    return {
      accesses,
      cycles: this.totalCycles,
      amat: accesses ? this.totalCycles / accesses : 0,
      caches,
      levels,
      cores: this.coreStats.map((s) => ({ ...s, servedBy: { ...s.servedBy } })),
      dramReads: this.dramReads,
      dramWrites: this.dramWrites,
    };
  }

  /* ───────────────────────── internals ───────────────────────── */

  private privateLevels(c: number, kind: Access['kind']): Cache[] {
    const l1 = kind === 'I' && this.l1i[c] ? this.l1i[c]! : this.l1d[c]!;
    const l2 = this.l2p[c];
    return l2 ? [l1, l2] : [l1];
  }

  private allPrivate(c: number): Cache[] {
    const out = [this.l1d[c]!];
    if (this.l1i[c]) out.push(this.l1i[c]!);
    if (this.l2p[c]) out.push(this.l2p[c]!);
    return out;
  }

  private ev(cache: Cache, slot: number, kind: EventKind, line: number, miss?: MissKind, state?: Mesi): SimEvent {
    const set = Math.floor(slot / cache.ways);
    const e: SimEvent = { cache: cache.info.id, set, way: slot - set * cache.ways, kind, line };
    if (miss) e.miss = miss;
    if (state !== undefined) e.state = state;
    return e;
  }

  private dirSet(line: number, c: number, st: number): void {
    let entry = this.dir.get(line);
    if (st === Mesi.I) {
      if (!entry) return;
      entry[c] = Mesi.I;
      if (entry.every((s) => s === Mesi.I)) this.dir.delete(line);
      return;
    }
    if (!entry) this.dir.set(line, (entry = new Uint8Array(this.config.cores)));
    entry[c] = st;
  }

  /** Set the MESI state on every private copy of `line` in core c. */
  private setCoreState(c: number, line: number, st: Mesi, events: SimEvent[], emit: boolean): void {
    for (const cache of this.allPrivate(c)) {
      const slot = cache.find(line);
      if (slot >= 0) {
        cache.state[slot] = st;
        if (emit) events.push(this.ev(cache, slot, EventKind.StateChange, line, undefined, st));
      }
    }
    this.dirSet(line, c, st);
  }

  /**
   * Latency of a coherence transfer: the nearest shared level (where cores meet, e.g. a
   * shared L2 rather than an SLC behind it) plus the configured penalty.
   */
  private peerLatency(): number {
    const nearest = this.shared[0];
    return (nearest ? nearest.info.latency : this.config.l2.latency) + this.config.coherencePenalty;
  }

  /** Invalidate `line` in every core except c. Returns how many cores were invalidated. */
  private invalidateOthers(c: number, line: number, events: SimEvent[]): number {
    const entry = this.dir.get(line);
    if (!entry) return 0;
    let n = 0;
    for (let o = 0; o < this.config.cores; o++) {
      if (o === c || entry[o] === Mesi.I) continue;
      const wasM = entry[o] === Mesi.M;
      for (const cache of this.allPrivate(o)) {
        const r = cache.remove(line, true);
        if (r) events.push(this.ev(cache, r.slot, EventKind.Invalidate, line, undefined, Mesi.I));
      }
      if (wasM) this.writebackShared(line, events); // the dirty data goes to the shared level
      this.dirSet(line, o, Mesi.I);
      n++;
    }
    return n;
  }

  /** Demand miss in every private level of core c: coherence + shared levels + DRAM. */
  private privateMiss(c: number, line: number, isWrite: boolean, events: SimEvent[]): { cycles: number; servedBy: Source; state: Mesi; server: Cache | null } {
    const entry = this.dir.get(line);
    let peerHasData = false;
    let othersHold = false;
    if (entry) {
      for (let o = 0; o < this.config.cores; o++) {
        if (o === c) continue;
        if (entry[o] === Mesi.M || entry[o] === Mesi.E) peerHasData = true;
        if (entry[o] !== Mesi.I) othersHold = true;
      }
    }
    let state: Mesi;
    const cs = this.coreStats[c]!;
    const own = (entry?.[c] ?? Mesi.I) as Mesi;
    if (!isWrite && own !== Mesi.I) {
      // The core already holds the line in its other L1 (an I fetch of a line in L1d with
      // no private L2): keep its state, or a Modified line would silently become clean.
      state = own;
    } else if (isWrite) {
      cs.invalidationsSent += this.invalidateOthers(c, line, events); // read-for-ownership
      state = Mesi.M;
    } else if (othersHold) {
      for (let o = 0; o < this.config.cores; o++) {
        if (o === c || !entry || entry[o] === Mesi.I) continue;
        if (entry[o] === Mesi.M) this.writebackShared(line, events); // M -> S writes back
        if (entry[o] !== Mesi.S) this.setCoreState(o, line, Mesi.S, events, true);
      }
      state = Mesi.S;
    } else {
      state = Mesi.E;
    }

    if (peerHasData) {
      // Cache-to-cache transfer from the core that held it exclusively.
      cs.peerTransfers++;
      for (let k = 0; k < this.shared.length; k++) {
        if (this.sharedInclusion[k] !== 'victim' && this.shared[k]!.find(line) < 0) this.fillShared(k, line, 1, undefined, events, false);
      }
      return { cycles: this.peerLatency(), servedBy: 'peer', state, server: null };
    }

    // Probe shared levels nearest first.
    for (let k = 0; k < this.shared.length; k++) {
      const sc = this.shared[k]!;
      sc.stats.accesses++;
      const slot = sc.find(line);
      if (slot >= 0) {
        sc.stats.hits++;
        if (sc.prefetched[slot] === 1) { sc.prefetched[slot] = 0; sc.stats.prefetchUseful++; }
        sc.touch(slot);
        sc.noteDemand(line);
        events.push(this.ev(sc, slot, EventKind.Hit, line));
        // Fill nearer shared levels that missed (non-victim ones).
        for (let j = 0; j < k; j++) if (this.sharedInclusion[j] !== 'victim') this.fillShared(j, line, 1, this.pendingMiss[j], events, false);
        // A victim cache gives its line up to the private caches (exclusive). When other
        // cores still share it, keep it: the requester ends in S, so removing a dirty copy
        // here would leave no owner of the dirty data and lose the eventual DRAM write.
        if (this.sharedInclusion[k] === 'victim' && state !== Mesi.S) {
          const r = sc.remove(line, false);
          if (r) events.push(this.ev(sc, r.slot, EventKind.Evict, line));
          // The victim cache gives up its only copy: dirty data now lives in the core, so it holds the line Modified.
          if (r && r.state === 3 && state === Mesi.E) state = Mesi.M;
        }
        this.pendingMiss.length = 0;
        return { cycles: sc.info.latency, servedBy: this.sharedSource[k]!, state, server: sc };
      }
      const mk = sc.classify(line);
      sc.stats.misses++;
      sc.stats[mk]++;
      sc.noteDemand(line);
      this.pendingMiss[k] = mk;
    }
    this.dramReads++;
    for (let k = 0; k < this.shared.length; k++) {
      if (this.sharedInclusion[k] !== 'victim') this.fillShared(k, line, 1, this.pendingMiss[k], events, false);
    }
    this.pendingMiss.length = 0;
    return { cycles: this.config.dramLatency, servedBy: 'DRAM', state, server: null };
  }

  private fillPrivate(c: number, cache: Cache, line: number, st: Mesi, miss: MissKind | undefined, events: SimEvent[], isPrefetch: boolean): void {
    if (cache.find(line) >= 0) return;
    const { slot, victim } = cache.fill(line, st, isPrefetch);
    events.push(this.ev(cache, slot, isPrefetch ? EventKind.Prefetch : EventKind.Fill, line, miss, st));
    if (victim) {
      const set = Math.floor(slot / cache.ways);
      events.push({ cache: cache.info.id, set, way: slot - set * cache.ways, kind: EventKind.Evict, line: victim.line, state: Mesi.I });
      this.privateEvicted(c, cache, victim, events);
    }
  }

  /** A line left one private cache of core c. */
  private privateEvicted(c: number, cache: Cache, victim: Victim, events: SimEvent[]): void {
    const vLine = victim.line;
    const l2 = this.l2p[c];
    const isL1 = cache === this.l1d[c] || cache === this.l1i[c];
    if (isL1) {
      // Still held elsewhere privately (the inclusive L2, or the other L1)? Then the core keeps it.
      if (l2 && l2.find(vLine) >= 0) return;
      const otherL1 = cache === this.l1d[c] ? this.l1i[c] : this.l1d[c];
      if (otherL1 && otherL1.find(vLine) >= 0) return;
    } else {
      // Private L2 is inclusive of the L1s: back-invalidate them.
      for (const l1 of [this.l1d[c], this.l1i[c]]) {
        if (!l1) continue;
        const r = l1.remove(vLine, false);
        if (r) events.push(this.ev(l1, r.slot, EventKind.Evict, vLine, undefined, Mesi.I));
      }
    }
    const st = this.coreState(vLine, c);
    if (st === Mesi.M) {
      cache.stats.writebacks++;
      this.writebackShared(vLine, events);
    } else {
      this.victimInsert(vLine, false, events);
    }
    this.dirSet(vLine, c, Mesi.I);
  }

  /** Dirty data for `line` leaves a core: mark it dirty in the nearest shared level, or write DRAM. */
  private writebackShared(line: number, events: SimEvent[]): void {
    for (let k = 0; k < this.shared.length; k++) {
      const sc = this.shared[k]!;
      const slot = sc.find(line);
      if (slot >= 0) {
        sc.state[slot] = 3;
        events.push(this.ev(sc, slot, EventKind.Writeback, line));
        return;
      }
    }
    if (this.victimInsert(line, true, events)) return;
    if (this.shared.length) {
      // Non-inclusive levels accept the written-back line.
      this.fillShared(this.shared.length - 1, line, 3, undefined, events, false);
      return;
    }
    this.dramWrites++;
  }

  /** Insert a line leaving the private caches into a victim-policy shared level. */
  private victimInsert(line: number, dirty: boolean, events: SimEvent[]): boolean {
    for (let k = 0; k < this.shared.length; k++) {
      if (this.sharedInclusion[k] !== 'victim') continue;
      // Only if no core still holds it privately.
      const entry = this.dir.get(line);
      let held = 0;
      if (entry) for (const s of entry) if (s !== Mesi.I) held++;
      if (held > 1) return true; // another core keeps a copy; nothing to cache yet
      const sc = this.shared[k]!;
      const slot = sc.find(line);
      if (slot >= 0) {
        if (dirty && sc.state[slot] !== 3) {
          sc.state[slot] = 3;
          events.push(this.ev(sc, slot, EventKind.StateChange, line, undefined, Mesi.M));
        }
        return true;
      }
      this.fillShared(k, line, dirty ? 3 : 1, undefined, events, false);
      return true;
    }
    return false;
  }

  private fillShared(k: number, line: number, state: number, miss: MissKind | undefined, events: SimEvent[], isPrefetch: boolean): void {
    const sc = this.shared[k]!;
    if (sc.find(line) >= 0) return;
    const { slot, victim } = sc.fill(line, state, isPrefetch);
    events.push(this.ev(sc, slot, isPrefetch ? EventKind.Prefetch : EventKind.Fill, line, miss, state as Mesi));
    if (!victim) return;
    const set = Math.floor(slot / sc.ways);
    events.push({ cache: sc.info.id, set, way: slot - set * sc.ways, kind: EventKind.Evict, line: victim.line });
    let dirty = victim.state === 3;
    if (this.sharedInclusion[k] === 'inclusive') {
      // Inclusion: a line leaving this level must leave every private cache too.
      const entry = this.dir.get(victim.line);
      if (entry) {
        for (let o = 0; o < this.config.cores; o++) {
          if (entry[o] === Mesi.I) continue;
          if (entry[o] === Mesi.M) dirty = true;
          for (const cache of this.allPrivate(o)) {
            const r = cache.remove(victim.line, false);
            if (r) events.push(this.ev(cache, r.slot, EventKind.Evict, victim.line, undefined, Mesi.I));
          }
          this.dirSet(victim.line, o, Mesi.I);
        }
      }
    }
    if (dirty) {
      sc.stats.writebacks++;
      const below = this.shared[k + 1];
      if (below) {
        const s2 = below.find(victim.line);
        if (s2 >= 0) {
          below.state[s2] = 3;
          events.push(this.ev(below, s2, EventKind.Writeback, victim.line));
        } else this.fillShared(k + 1, victim.line, 3, undefined, events, false);
      } else {
        this.dramWrites++;
      }
    }
  }

  /** Hardware prefetchers (trained per core on data accesses). */
  private prefetch(c: number, line: number, l1Missed: boolean, events: SimEvent[]): void {
    const pf = this.config.prefetch;
    const det = this.pf[c]!;
    const targets: number[] = [];
    if (pf.kind === 'next-line') {
      if (l1Missed) for (let k = 1; k <= pf.degree; k++) targets.push(line + k);
    } else {
      const delta = line - det.last;
      if (Number.isFinite(delta) && delta !== 0 && delta === det.delta) {
        for (let k = 1; k <= pf.degree; k++) targets.push(line + delta * k);
      }
      if (Number.isFinite(delta) && delta !== 0) det.delta = delta;
    }
    det.last = line;
    // Real L1/L2 prefetchers work on physical addresses and stop at a 4 KiB page
    // boundary, since the next virtual page may map anywhere. Without this, a
    // column walk with a page-sized stride would be prefetched perfectly.
    const page = Math.floor((line * this.config.l1d.lineBytes) / PAGE_BYTES);
    for (const t of targets) {
      if (t >= 0 && Math.floor((t * this.config.l1d.lineBytes) / PAGE_BYTES) === page) this.prefetchLine(c, t, events);
    }
  }

  private prefetchLine(c: number, line: number, events: SimEvent[]): void {
    const l1 = this.l1d[c]!;
    if (l1.find(line) >= 0) return;
    const entry = this.dir.get(line);
    let othersHold = false;
    if (entry) {
      for (let o = 0; o < this.config.cores; o++) {
        if (o === c) continue;
        if (entry[o] === Mesi.M || entry[o] === Mesi.E) return; // don't steal exclusive lines
        if (entry[o] === Mesi.S) othersHold = true;
      }
    }
    const st = this.coreState(line, c) !== Mesi.I ? this.coreState(line, c) : othersHold ? Mesi.S : Mesi.E;
    const l2 = this.l2p[c];
    const inPrivate = l2 && l2.find(line) >= 0;
    if (!inPrivate) {
      let found = false;
      for (let k = 0; k < this.shared.length; k++) if (this.shared[k]!.find(line) >= 0) { found = true; break; }
      if (!found) {
        this.dramReads++;
        for (let k = 0; k < this.shared.length; k++) {
          if (this.sharedInclusion[k] !== 'victim') this.fillShared(k, line, 1, undefined, events, true);
        }
      }
      if (l2) this.fillPrivate(c, l2, line, st, undefined, events, true);
    }
    this.fillPrivate(c, l1, line, st, undefined, events, true);
    this.dirSet(line, c, st);
  }
}
