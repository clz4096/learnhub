import { describe, it, expect } from 'vitest';
import macos from '@/ui/tryit/fixtures/macos-x86_64.results.csv?raw';
import { BENCH_NAMES } from '@/ui/bench';
import { workloadById } from '@/workloads';
import { parseResultsCsv } from '@/ui/tryit/results';
import {
  COMPARISONS, buildRows, direction, formatRatio, hasBench, measuredRatios, verdict, type Comparison,
} from '@/ui/tryit/compare';

const rows = parseResultsCsv(macos).rows;
const cmp = (w: string, id: string): Comparison => COMPARISONS[w]!.find((c) => c.id === id)!;
const ratios = (w: string, id: string) => measuredRatios(rows, BENCH_NAMES[w]!, cmp(w, id));

describe('comparisons', () => {
  it('cover every workload with a benchmark, and only those', () => {
    expect(Object.keys(COMPARISONS).sort()).toEqual(Object.keys(BENCH_NAMES).sort());
    for (const w of Object.keys(COMPARISONS)) expect(workloadById(w), w).toBeDefined();
  });

  it('every comparison matches at least one pair in a full macOS run', () => {
    for (const [w, list] of Object.entries(COMPARISONS)) {
      for (const c of list) expect(measuredRatios(rows, BENCH_NAMES[w]!, c).length, `${w}/${c.id}`).toBeGreaterThan(0);
    }
  });

  it('every comparison without a model says why', () => {
    for (const list of Object.values(COMPARISONS)) for (const c of list) if (!c.model) expect(c.why).toBeTruthy();
  });
});

describe('measuredRatios', () => {
  it('pairs rows at the same size (matrix traversal at N=2048 and 4096)', () => {
    const r = ratios('matrix-traverse', 'col-row');
    expect(r.map((x) => x.param)).toEqual(['N=2048', 'N=4096']);
    expect(r[0]!.ratio).toBeCloseTo(14.2298 / 1.1126, 6);
  });

  it('pairs single rows at different sizes (seq_sum: one size per level)', () => {
    const r = ratios('seq-sum', 'l3-l1');
    expect(r).toEqual([{ param: '4M vs 16K', ratio: 0.0958 / 0.0578 }]);
  });

  it('selects strided rows by stride, not by prefix collision (1 vs 16)', () => {
    const r = ratios('strided', 'stride16');
    expect(r).toHaveLength(1);
    expect(r[0]!.param).toBe('16(64B) vs 1(4B)');
    expect(r[0]!.ratio).toBeCloseTo(6.5757 / 0.4931, 6);
  });

  it('returns nothing when a variant is missing', () => {
    const only = rows.filter((x) => x.variant !== 'row_major');
    expect(measuredRatios(only, 'matrix_traverse', cmp('matrix-traverse', 'col-row'))).toEqual([]);
  });

  it('hasBench matches suffixed bench names (strided_i32) and nothing else', () => {
    expect(hasBench(rows, 'strided')).toBe(true);
    expect(hasBench(rows, 'seq_sum')).toBe(true);
    expect(hasBench(rows, 'hash_vs_map')).toBe(false);
  });
});

describe('verdict', () => {
  it('direction has a 2 % band around 1x', () => {
    expect(direction(1.5)).toBe('slower');
    expect(direction(0.6)).toBe('faster');
    expect(direction(1.01)).toBe('even');
    expect(direction(0.99)).toBe('even');
  });

  it('is "same direction" when every modeled row agrees', () => {
    const t = buildRows(rows, 'matrix_traverse', COMPARISONS['matrix-traverse']!, { 'col-row': 15.1 });
    expect(t.every((r) => r.agrees)).toBe(true);
    expect(verdict(t)).toBe('same direction');
  });

  it('is "different" when one row disagrees (padding hurts on hardware, model says it helps)', () => {
    const t = buildRows(rows, 'spsc_ring', COMPARISONS['spsc-ring']!, { 'plain-padded-packed': 0.7 });
    expect(t.find((r) => r.comparison.id === 'plain-padded-packed')!.agrees).toBe(false);
    expect(t.find((r) => r.comparison.id === 'cached-padded-packed')!.agrees).toBeNull();
    expect(verdict(t)).toBe('different');
  });

  it('is null with no model ratios, so the panel shows no verdict', () => {
    expect(verdict(buildRows(rows, 'aos_soa', COMPARISONS['aos-soa']!, null))).toBeNull();
  });

  it('formats ratios with sensible precision', () => {
    expect(formatRatio(1.234)).toBe('1.23x');
    expect(formatRatio(12.84)).toBe('12.8x');
    expect(formatRatio(372.4)).toBe('372x');
  });
});
