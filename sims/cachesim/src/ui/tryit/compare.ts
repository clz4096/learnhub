/**
 * Measured vs. simulated ratios between a benchmark's variants. Pure: the model side
 * is only described here (which workload params to run); model.ts runs it.
 *
 * Every model setup matches src/verify/trends.test.ts, so the panel shows the same
 * model numbers as VERIFY.md. Sizes differ from the benchmarks because the model runs
 * one access at a time and the benchmarks need large inputs to time reliably.
 */
import type { Params } from '@/workloads/types';
import type { ResultRow } from '@/ui/tryit/results';

/** Picks benchmark rows: a variant, and optionally a param prefix (strided's "16(" for stride 16). */
export interface RowSelector {
  variant: string;
  param?: string;
}

export interface ModelRun {
  params: Params;
  /** Engine preset id; Intel Coffee Lake (the machine VERIFY.md measured) by default. */
  preset?: string;
  cores?: number;
  /** Stride prefetch on, as in trends.test.ts, for workloads where hardware prefetch decides the trend. */
  prefetch?: boolean;
}

export interface ModelSpec {
  num: ModelRun;
  den: ModelRun;
  /**
   * 'amat' compares cycles per access, for runs of different sizes with one access per
   * element; 'cycles' compares total time, for runs over the same elements.
   */
  metric: 'amat' | 'cycles';
  /** The model's setup in plain words. */
  note: string;
}

export interface Comparison {
  id: string;
  /** Plain label: "first vs second". The ratio is first ÷ second. */
  label: string;
  /** CSV bench name when it differs from BENCH_NAMES (strided reports strided_i32). */
  bench?: string;
  num: RowSelector;
  den: RowSelector;
  /** null when the simulator has no matching setup; `why` says so in the table. */
  model: ModelSpec | null;
  why?: string;
}

const STRIDES = [2, 4, 8, 16, 32, 64];
const LIST_N = 1 << 20;

export const COMPARISONS: Record<string, Comparison[]> = {
  'seq-sum': [
    {
      id: 'l2-l1', label: 'Array in L2 vs array in L1', num: { variant: 'sum_L2' }, den: { variant: 'sum_L1' },
      model: { num: { params: { N: 32768, passes: 4 } }, den: { params: { N: 4096, passes: 4 } }, metric: 'amat', note: '128 KiB vs 16 KiB, 4 passes' },
    },
    {
      id: 'l3-l1', label: 'Array in L3 vs array in L1', num: { variant: 'sum_L3' }, den: { variant: 'sum_L1' },
      model: { num: { params: { N: 262144, passes: 4 } }, den: { params: { N: 4096, passes: 4 } }, metric: 'amat', note: '1 MiB vs 16 KiB, 4 passes' },
    },
    {
      id: 'dram-l1', label: 'Array in main memory vs array in L1', num: { variant: 'sum_DRAM' }, den: { variant: 'sum_L1' },
      model: null, why: 'too many accesses for the simulator (about 64 million)',
    },
  ],
  strided: STRIDES.map((s) => ({
    id: `stride${s}`,
    label: `Stride ${s} vs stride 1 (touches ${s * 4} B apart vs 4 B)`,
    bench: 'strided_i32',
    num: { variant: 'stride', param: `${s}(` },
    den: { variant: 'stride', param: '1(' },
    model: {
      num: { params: { N: 262144, stride: s, elem: 'int32' } },
      den: { params: { N: 262144, stride: 1, elem: 'int32' } },
      metric: 'amat' as const, note: '262,144 int32 elements',
    },
  })),
  'matrix-traverse': [
    {
      id: 'col-row', label: 'Column order vs row order', num: { variant: 'col_major' }, den: { variant: 'row_major' },
      model: {
        num: { params: { N: 1024, order: 'col' }, prefetch: true }, den: { params: { N: 1024, order: 'row' }, prefetch: true },
        metric: 'cycles', note: '1024 x 1024, prefetch on',
      },
    },
  ],
  matmul: [16, 32, 64].map((t) => ({
    id: `naive-t${t}`, label: `Naive vs tiled with ${t} x ${t} tiles`, num: { variant: 'naive_ijk' }, den: { variant: `tiled_T${t}` },
    // Only T=16 has a model setup: a Coffee Lake run at hardware sizes is billions of
    // accesses, and the textbook preset's 8 KiB L2 cannot hold one 32 x 32 tile of
    // doubles, so its T=32 ratio (1.00x) would compare cache sizes, not tiling.
    model: t !== 16 ? null : {
      num: { params: { N: 64, variant: 'naive' }, preset: 'textbook' },
      den: { params: { N: 64, variant: 'tiled', tile: t }, preset: 'textbook' },
      metric: 'cycles' as const, note: 'textbook preset, 64 x 64',
    },
    why: t === 64 ? 'the simulator offers tiles up to 32'
      : t === 32 ? 'the small preset the simulator uses here cannot hold a 32 x 32 tile' : undefined,
  })),
  'list-vs-vector': [
    ['ordered-vector', 'List in address order vs vector', 'list_ordered', 'vector', 'list-in-order', 'vector'],
    ['shuffled-vector', 'Shuffled list vs vector', 'list_shuffled', 'vector', 'list-shuffled', 'vector'],
    ['shuffled-ordered', 'Shuffled list vs list in address order', 'list_shuffled', 'list_ordered', 'list-shuffled', 'list-in-order'],
  ].map(([id, label, num, den, mNum, mDen]) => ({
    id: id!, label: label!, num: { variant: num! }, den: { variant: den! },
    model: {
      num: { params: { N: LIST_N, variant: mNum! }, prefetch: true },
      den: { params: { N: LIST_N, variant: mDen! }, prefetch: true },
      // Cycles, not AMAT: a list costs two accesses per element (value, next), a vector one.
      metric: 'cycles' as const, note: '1M nodes (16 MiB), prefetch on',
    },
  })),
  'aos-soa': [
    {
      id: 'aos-soa', label: 'Array of structs vs struct of arrays', num: { variant: 'aos' }, den: { variant: 'soa' },
      model: { num: { params: { N: 262144, layout: 'aos' } }, den: { params: { N: 262144, layout: 'soa' } }, metric: 'cycles', note: '262,144 particles, 32 B struct' },
    },
  ],
  'false-sharing': [
    {
      id: 'packed-padded', label: 'Counters on one line vs padded apart', num: { variant: 'packed' }, den: { variant: 'padded' },
      model: {
        num: { params: { iterations: 4096, threads: 2, layout: 'packed' }, cores: 2 },
        den: { params: { iterations: 4096, threads: 2, layout: 'padded' }, cores: 2 },
        metric: 'cycles', note: '2 threads',
      },
    },
  ],
  'spsc-ring': [
    {
      id: 'plain-padded-packed', label: 'Padded vs packed indices, plain ring', num: { variant: 'padded_nocache' }, den: { variant: 'packed_nocache' },
      model: {
        num: { params: { items: 16384, layout: 'separate-lines' }, cores: 2 },
        den: { params: { items: 16384, layout: 'same-line' }, cores: 2 },
        metric: 'cycles', note: '2 cores, 16 slots',
      },
    },
    {
      id: 'cached-padded-packed', label: 'Padded vs packed indices, cached ring', num: { variant: 'padded' }, den: { variant: 'packed' },
      model: null, why: 'the simulated ring has no cached indices',
    },
  ],
};

/* ───────────────────────── measured side ───────────────────────── */

export interface MeasuredRatio {
  /** The size or setting both rows ran at, or "<num> vs <den>" when they differ. */
  param: string;
  ratio: number;
}

function matches(row: ResultRow, bench: string, sel: RowSelector): boolean {
  return row.bench === bench && row.variant === sel.variant && (sel.param === undefined || row.param.startsWith(sel.param));
}

/**
 * Measured ratios for one comparison: time per access of `num` divided by `den`.
 * Rows pair up by param (matrix_traverse at N=2048 with N=2048). When the variants
 * ran at different sizes by design (seq_sum's one size per level, strided's one
 * stride per row), the single rows pair directly.
 */
export function measuredRatios(rows: ResultRow[], benchName: string, cmp: Comparison): MeasuredRatio[] {
  const bench = cmp.bench ?? benchName;
  const nums = rows.filter((r) => matches(r, bench, cmp.num));
  const dens = rows.filter((r) => matches(r, bench, cmp.den));
  const out: MeasuredRatio[] = [];
  for (const n of nums) {
    // First row per param wins if a file repeats one.
    const d = dens.find((x) => x.param === n.param);
    if (d && !out.some((o) => o.param === n.param)) out.push({ param: n.param, ratio: n.nsPerAccess / d.nsPerAccess });
  }
  if (out.length === 0 && nums.length === 1 && dens.length === 1) {
    const n = nums[0]!;
    const d = dens[0]!;
    out.push({ param: n.param === d.param ? n.param : `${n.param} vs ${d.param}`, ratio: n.nsPerAccess / d.nsPerAccess });
  }
  return out;
}

/** True when the file has any row for this benchmark. */
export function hasBench(rows: ResultRow[], benchName: string): boolean {
  return rows.some((r) => r.bench === benchName || r.bench.startsWith(benchName + '_'));
}

/* ───────────────────────── verdict ───────────────────────── */

export type Direction = 'slower' | 'faster' | 'even';

/** Within 2 % of 1x counts as even, so rounding noise does not flip a direction. */
export const EVEN_BAND = 0.02;

export function direction(ratio: number): Direction {
  if (ratio > 1 + EVEN_BAND) return 'slower';
  if (ratio < 1 / (1 + EVEN_BAND)) return 'faster';
  return 'even';
}

export interface TableRow {
  comparison: Comparison;
  measured: MeasuredRatio;
  model: number | null;
  /** null when there is no model ratio to compare with. */
  agrees: boolean | null;
}

export function buildRows(rows: ResultRow[], benchName: string, comparisons: Comparison[], model: Record<string, number> | null): TableRow[] {
  const out: TableRow[] = [];
  for (const c of comparisons) {
    const m = model?.[c.id] ?? null;
    for (const measured of measuredRatios(rows, benchName, c)) {
      out.push({ comparison: c, measured, model: m, agrees: m === null ? null : direction(measured.ratio) === direction(m) });
    }
  }
  return out;
}

export type Verdict = 'same direction' | 'different';

/** "same direction" when every row with a model ratio agrees; null when no row has one. */
export function verdict(rows: TableRow[]): Verdict | null {
  const judged = rows.filter((r) => r.agrees !== null);
  if (judged.length === 0) return null;
  return judged.every((r) => r.agrees) ? 'same direction' : 'different';
}

export function formatRatio(r: number): string {
  return r >= 100 ? `${r.toFixed(0)}x` : r >= 10 ? `${r.toFixed(1)}x` : `${r.toFixed(2)}x`;
}
