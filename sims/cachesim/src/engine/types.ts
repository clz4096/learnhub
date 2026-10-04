/**
 * Engine types: the frozen contract between the simulation engine, the workload
 * trace generators, the Web Worker, and the UI. The engine has no UI imports and
 * no DOM dependency; it runs the same in Node (tests), a worker, or the main thread.
 */

export type ReplacementPolicy = 'lru' | 'plru' | 'random';

/** One cache level's geometry and behavior. */
export interface LevelConfig {
  /** Display name, e.g. "L1d", "L2", "L3". */
  name: string;
  sizeBytes: number;
  /** Bytes per cache line. All levels in one hierarchy use the same line size. */
  lineBytes: number;
  /** Ways per set. ways === sizeBytes / lineBytes means fully associative. */
  ways: number;
  policy: ReplacementPolicy;
  /** Load-to-use latency, in core cycles, for a hit at this level. */
  latency: number;
  /** 'core' = one private instance per core; 'shared' = one instance for all cores. */
  scope: 'core' | 'shared';
  /**
   * Shared levels only. 'inclusive': filled on every miss and evicting a line
   * removes it from all private caches (back-invalidation). 'non-inclusive': filled
   * on every miss, no back-invalidation. 'victim': filled only with lines evicted
   * from private caches (AMD Zen L3). Default 'inclusive'.
   */
  inclusion?: 'inclusive' | 'non-inclusive' | 'victim';
}

export interface PrefetchConfig {
  enabled: boolean;
  /** next-line: on an L1 miss, also fetch line+1. stride: detect a constant stride per core. */
  kind: 'next-line' | 'stride';
  /** How many lines ahead to fetch. */
  degree: number;
}

export interface HierarchyConfig {
  /** 1 to 8 cores. */
  cores: number;
  l1d: LevelConfig;
  /** Optional instruction cache; only accesses of kind 'I' use it. */
  l1i?: LevelConfig;
  l2: LevelConfig;
  /** Optional: Apple's preset uses a shared L2 and a system-level cache here. */
  l3?: LevelConfig;
  /** DRAM latency in core cycles. */
  dramLatency: number;
  /**
   * Extra cycles to move a line from another core's private cache (a coherence
   * transfer), added on top of the shared level's latency.
   */
  coherencePenalty: number;
  prefetch: PrefetchConfig;
  /** Seed for every random choice (random replacement), so runs are reproducible. */
  seed: number;
}

export type AccessKind = 'R' | 'W' | 'I';

/** One memory access in a trace. */
export interface Access {
  /** Byte address. Must be a non-negative integer below 2^53. */
  addr: number;
  kind: AccessKind;
  core: number;
  /** 1-based line in the workload's C++ source that issued this access (0 = none). */
  src?: number;
}

/** MESI coherence states. Shared caches store 1 = valid clean, 3 = valid dirty. */
export const enum Mesi {
  I = 0,
  S = 1,
  E = 2,
  M = 3,
}

export type MissKind = 'compulsory' | 'capacity' | 'conflict' | 'coherence';

/** What happened at one cache during one access (or prefetch). */
export const enum EventKind {
  Hit = 0,
  /** The line was missing and has been filled into (set, way). */
  Fill = 1,
  /** A line was evicted from (set, way) to make room. */
  Evict = 2,
  /** Another core's write invalidated this line (MESI). */
  Invalidate = 3,
  /** A prefetch filled (set, way). */
  Prefetch = 4,
  /** A dirty line was written back toward memory. */
  Writeback = 5,
  /** A MESI state changed without a fill (for example S to M on an upgrade). */
  StateChange = 6,
}

export interface SimEvent {
  /** Index into Simulator.caches. */
  cache: number;
  set: number;
  way: number;
  kind: EventKind;
  /** Line number (addr / lineBytes) involved. For Evict, the line that left. */
  line: number;
  /** Miss classification, on Fill events from demand misses. */
  miss?: MissKind;
  /** MESI state after the event (private caches). */
  state?: Mesi;
}

/** Where a demand access was finally served from. */
export type Source = 'L1' | 'L2' | 'L3' | 'DRAM' | 'peer';

export interface AccessOutcome {
  /** Sequence number of this access since the last reset (0-based). */
  index: number;
  access: Access;
  servedBy: Source;
  cycles: number;
  events: SimEvent[];
}

/** Describes one physical cache instance, for rendering and stats. */
export interface CacheInfo {
  id: number;
  /** "L1d", "L1i", "L2", "L3". */
  level: string;
  /** Owning core, or -1 for a shared cache. */
  core: number;
  sets: number;
  ways: number;
  lineBytes: number;
  sizeBytes: number;
  latency: number;
  policy: ReplacementPolicy;
}

export interface LevelStats {
  accesses: number;
  hits: number;
  misses: number;
  compulsory: number;
  capacity: number;
  conflict: number;
  coherence: number;
  evictions: number;
  writebacks: number;
  invalidations: number;
  prefetchFills: number;
  /** Prefetched lines later hit by a demand access before eviction. */
  prefetchUseful: number;
  /** Cycles of the accesses this cache served (DRAM and peer transfers count toward no cache). */
  servedCycles: number;
}

export interface CoreStats {
  accesses: number;
  reads: number;
  writes: number;
  cycles: number;
  /** Served by another core's private cache (coherence transfer). */
  peerTransfers: number;
  /** Invalidations this core's writes caused in other cores. */
  invalidationsSent: number;
  servedBy: Record<Source, number>;
}

export interface Stats {
  accesses: number;
  cycles: number;
  /** Average memory access time in cycles = cycles / accesses. */
  amat: number;
  /** Per cache instance, indexed like Simulator.caches. */
  caches: LevelStats[];
  /** Per level name, summed over instances (L1d, L1i, L2, L3). */
  levels: Record<string, LevelStats>;
  cores: CoreStats[];
  dramReads: number;
  dramWrites: number;
}
