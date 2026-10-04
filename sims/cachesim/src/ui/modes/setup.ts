/**
 * A named simulator configuration (preset + edits + workload + params + view toggles),
 * shared by Guided lessons and glossary "see it" links. Pure: no signals, no DOM, so
 * tests can run a setup through the engine and check every number a lesson quotes.
 */
import {
  Simulator, breakdown, cloneConfig, presetById,
  type AccessOutcome, type HierarchyConfig, type LevelStats, type MissKind, type PrefetchConfig,
  type ReplacementPolicy, type Source, type Stats,
} from '@/engine';
import { workloadById } from '@/workloads';
import { defaultParams, type Params } from '@/workloads/types';

export interface Setup {
  preset: string;
  /** Edits on top of the preset. Omitted fields keep the preset's values. */
  cores?: number;
  prefetch?: PrefetchConfig;
  l1dWays?: number;
  /** Replacement policy for every level. */
  policy?: ReplacementPolicy;
  workload: string;
  /** Overrides on top of the workload's defaults. */
  params?: Params;
  arrows?: boolean;
  breakdown?: boolean;
}

export function configFor(s: Setup): HierarchyConfig {
  const p = presetById(s.preset);
  if (!p) throw new Error(`unknown preset "${s.preset}"`);
  const c = cloneConfig(p.config);
  if (s.cores !== undefined) c.cores = s.cores;
  if (s.prefetch) c.prefetch = { ...s.prefetch };
  if (s.l1dWays !== undefined) c.l1d.ways = s.l1dWays;
  if (s.policy) for (const l of [c.l1d, c.l1i, c.l2, c.l3]) if (l) l.policy = s.policy;
  return c;
}

export function paramsFor(s: Setup): Params {
  const w = workloadById(s.workload);
  if (!w) throw new Error(`unknown workload "${s.workload}"`);
  return { ...defaultParams(w), ...s.params };
}

/** Run a setup through the engine (same trace context as the worker). */
export function runSetup(s: Setup, opts: { limit?: number; keep?: readonly number[] } = {}): { stats: Stats; outcomes: Map<number, AccessOutcome>; config: HierarchyConfig } {
  const config = configFor(s);
  const w = workloadById(s.workload)!;
  const sim = new Simulator(config);
  const keep = new Set(opts.keep ?? []);
  const outcomes = new Map<number, AccessOutcome>();
  sim.run(w.trace(paramsFor(s), { lineBytes: config.l1d.lineBytes, cores: config.cores, seed: config.seed }), opts.limit ?? Infinity,
    (o) => { if (keep.has(o.index)) outcomes.set(o.index, o); });
  return { stats: sim.stats(), outcomes, config };
}

/* ───────────────────────── claims ───────────────────────── */

type LevelName = 'L1d' | 'L2' | 'L3';
type LevelKey = Extract<keyof LevelStats, 'hits' | 'misses' | 'compulsory' | 'capacity' | 'conflict' | 'coherence' | 'invalidations'>;
export type Metric =
  | 'amat' | 'cycles' | 'accesses' | 'invalidationsSent' | 'peerTransfers'
  | `${LevelName}.${LevelKey}` | `servedBy.${Source}`;

/** A number a lesson states, checked against the engine by lessons.test.ts. */
export interface StatClaim {
  kind: 'stat';
  setup: Setup;
  metric: Metric;
  value: number;
  /** Decimal places the UI shows (AMAT: 2); the check rounds to the same. */
  digits?: number;
}

/** Facts about one access, as the current-access and breakdown panels show them. */
export interface AccessClaim {
  kind: 'access';
  setup: Setup;
  index: number;
  expect: {
    addr?: number;
    servedBy?: Source;
    cycles?: number;
    /** The L1d set, tag, and offset of the address. */
    set?: number;
    tag?: number;
    offset?: number;
    /** Miss kind on the accessing core's L1d, or 'hit'. */
    l1d?: MissKind | 'hit';
  };
}

export type Claim = StatClaim | AccessClaim;

export function metricValue(s: Stats, m: Metric): number {
  if (m === 'amat') return s.amat;
  if (m === 'cycles') return s.cycles;
  if (m === 'accesses') return s.accesses;
  if (m === 'invalidationsSent' || m === 'peerTransfers') return s.cores.reduce((n, c) => n + c[m], 0);
  const [a, b] = m.split('.') as [string, string];
  if (a === 'servedBy') return s.cores.reduce((n, c) => n + c.servedBy[b as Source], 0);
  return s.levels[a]?.[b as LevelKey] ?? 0;
}

export function round(v: number, digits = 0): number {
  return Number(v.toFixed(digits));
}

/** What the engine actually says for a claim, in the claim's own terms. */
export function evaluateClaim(c: Claim): number | AccessClaim['expect'] {
  if (c.kind === 'stat') return round(metricValue(runSetup(c.setup).stats, c.metric), c.digits ?? 0);
  const { outcomes, config } = runSetup(c.setup, { limit: c.index + 1, keep: [c.index] });
  const o = outcomes.get(c.index);
  if (!o) throw new Error(`access #${c.index} is past the end of the trace`);
  const sets = config.l1d.sizeBytes / (config.l1d.lineBytes * config.l1d.ways);
  const b = breakdown(o.access.addr, config.l1d.lineBytes, sets);
  // Cache ids: per core, L1d then (L1i) then private L2; L1d of core c is the first private cache.
  const perCore = 1 + (config.l1i ? 1 : 0) + (config.l2.scope === 'core' ? 1 : 0);
  const l1Id = o.access.core * perCore;
  const ev = o.events.find((e) => e.cache === l1Id && e.line === b.line && (e.kind === 0 || e.kind === 1));
  const l1d: MissKind | 'hit' | undefined = ev ? (ev.kind === 0 ? 'hit' : ev.miss) : undefined;
  return { addr: o.access.addr, servedBy: o.servedBy, cycles: o.cycles, set: b.set, tag: b.tag, offset: b.offset, l1d };
}

/** Format a claim's value the way the UI shows it. */
export function fmt(c: StatClaim): string {
  return c.digits ? c.value.toFixed(c.digits) : c.value.toLocaleString('en-US');
}
