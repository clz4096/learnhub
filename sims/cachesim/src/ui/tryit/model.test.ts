import { describe, it, expect, vi } from 'vitest';
import { predict, HW_PREFETCH, type Prediction } from '@/verify/predict';
import { computeModelRatios, type PredictFn } from '@/ui/tryit/model';
import { COMPARISONS } from '@/ui/tryit/compare';

const fake = (amat: number, cycles: number): Prediction =>
  ({ workload: '', label: '', accesses: 1, cycles, amat, l1MissRate: 0, llcMissRate: 0, coherenceMisses: 0 });

describe('computeModelRatios', () => {
  it('matches predict() for false sharing (the setup in trends.test.ts)', () => {
    const packed = predict('false-sharing', { iterations: 4096, threads: 2, layout: 'packed' }, '', 'intel-coffee-lake', 2);
    const padded = predict('false-sharing', { iterations: 4096, threads: 2, layout: 'padded' }, '', 'intel-coffee-lake', 2);
    const r = computeModelRatios('false-sharing');
    expect(r['packed-padded']).toBeCloseTo(packed.cycles / padded.cycles, 9);
    expect(r['packed-padded']).toBeGreaterThan(5);
  });

  it('runs each shared baseline once and passes preset, cores, and prefetch through', () => {
    const run = vi.fn<PredictFn>((_w, params) => fake(Number(params.stride ?? 1), 1));
    const r = computeModelRatios('strided', run);
    // 6 strides plus one shared stride-1 baseline.
    expect(run).toHaveBeenCalledTimes(7);
    expect(r['stride16']).toBe(16);
    const lv = vi.fn<PredictFn>(() => fake(1, 1));
    computeModelRatios('list-vs-vector', lv);
    expect(lv.mock.calls[0]![3]).toBe('intel-coffee-lake');
    expect(lv.mock.calls[0]![5]).toEqual(HW_PREFETCH);
    const mm = vi.fn<PredictFn>(() => fake(1, 1));
    computeModelRatios('matmul', mm);
    expect(mm.mock.calls.every((c) => c[3] === 'textbook')).toBe(true);
  });

  it('uses the metric each comparison names', () => {
    const r = computeModelRatios('aos-soa', (_w, params) => (params.layout === 'aos' ? fake(2, 30) : fake(1, 10)));
    expect(r['aos-soa']).toBe(3); // cycles
    const s = computeModelRatios('seq-sum', (_w, params) => (Number(params.N) > 4096 ? fake(2, 999) : fake(1, 1)));
    expect(s['l2-l1']).toBe(2); // amat
    // A list makes two accesses per element and a vector one, so per-element time is cycles.
    const l = computeModelRatios('list-vs-vector', (_w, params) => (params.variant === 'vector' ? fake(5, 100) : fake(5, 200)));
    expect(l['ordered-vector']).toBe(2);
  });

  it('skips comparisons with no model setup', () => {
    const r = computeModelRatios('spsc-ring', () => fake(1, 1));
    expect(Object.keys(r)).toEqual(['plain-padded-packed']);
    expect(COMPARISONS['spsc-ring']!.length).toBe(2);
    expect(computeModelRatios('no-such-workload')).toEqual({});
  });
});
