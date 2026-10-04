/**
 * The simulator's side of each comparison, computed with predict() (src/verify), the
 * same function behind VERIFY.md. Runs take up to several seconds, so the panel calls
 * this from model.worker.ts; tests call it directly.
 */
import { predict, HW_PREFETCH } from '@/verify/predict';
import { COMPARISONS, type ModelRun } from '@/ui/tryit/compare';

export type PredictFn = typeof predict;

const DEFAULT_PRESET = 'intel-coffee-lake';

/** Model ratio (first ÷ second) per comparison id, for comparisons that have a model setup. */
export function computeModelRatios(workloadId: string, run: PredictFn = predict): Record<string, number> {
  const memo = new Map<string, { amat: number; cycles: number }>();
  const measure = (m: ModelRun) => {
    // Comparisons share baselines (stride 1, the vector), so each setup runs once.
    const key = JSON.stringify([m.params, m.preset ?? DEFAULT_PRESET, m.cores ?? 0, !!m.prefetch]);
    let v = memo.get(key);
    if (!v) {
      const p = run(workloadId, m.params, key, m.preset ?? DEFAULT_PRESET, m.cores, m.prefetch ? HW_PREFETCH : undefined);
      v = { amat: p.amat, cycles: p.cycles };
      memo.set(key, v);
    }
    return v;
  };
  const out: Record<string, number> = {};
  for (const c of COMPARISONS[workloadId] ?? []) {
    if (!c.model) continue;
    const num = measure(c.model.num)[c.model.metric];
    const den = measure(c.model.den)[c.model.metric];
    if (den > 0) out[c.id] = num / den;
  }
  return out;
}
