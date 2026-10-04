/**
 * Simulator predictions for each workload's variants: the model side of VERIFY.md.
 * Pure: runs workloads through the engine with a preset and reports cycles, AMAT,
 * and per-level miss rates, so tests can assert each trend's direction.
 */
import { Simulator, presetById, cloneConfig, type HierarchyConfig, type PrefetchConfig } from '@/engine';
import { workloadById } from '@/workloads';
import { defaultParams, type Params } from '@/workloads/types';

export interface Prediction {
  workload: string;
  label: string;
  accesses: number;
  cycles: number;
  amat: number;
  l1MissRate: number;
  llcMissRate: number;
  coherenceMisses: number;
}

/** Stride prefetch, degree 2: closest to real hardware, where prefetchers are always on. */
export const HW_PREFETCH: PrefetchConfig = { enabled: true, kind: 'stride', degree: 2 };

export function predict(
  workloadId: string, overrides: Params, label: string, presetId = 'intel-coffee-lake', cores?: number,
  prefetch?: PrefetchConfig,
): Prediction {
  const w = workloadById(workloadId);
  if (!w) throw new Error('no workload ' + workloadId);
  const cfg: HierarchyConfig = cloneConfig(presetById(presetId)!.config);
  if (cores) cfg.cores = cores;
  if (prefetch) cfg.prefetch = prefetch;
  const params = { ...defaultParams(w), ...overrides };
  const ctx = { lineBytes: cfg.l1d.lineBytes, cores: cfg.cores, seed: 1 };
  const sim = new Simulator(cfg);
  sim.run(w.trace(params, ctx));
  const s = sim.stats();
  const l1 = s.levels['L1d']!;
  const llcName = cfg.l3 ? cfg.l3.name : cfg.l2.name;
  const llc = s.levels[llcName]!;
  return {
    workload: workloadId, label, accesses: s.accesses, cycles: s.cycles, amat: s.amat,
    l1MissRate: l1.accesses ? l1.misses / l1.accesses : 0,
    llcMissRate: llc.accesses ? llc.misses / llc.accesses : 0,
    coherenceMisses: s.levels['L1d']!.coherence,
  };
}
