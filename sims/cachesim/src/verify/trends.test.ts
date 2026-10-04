/**
 * The model must predict each workload's real-hardware TREND (direction and rough
 * size). These are the simulator side of VERIFY.md; the measured side comes from
 * bench/. Coffee Lake preset (the machine the benchmarks ran on) unless noted.
 */
import { describe, it, expect } from 'vitest';
import { predict, HW_PREFETCH, type Prediction } from '@/verify/predict';

const rows: Prediction[] = [];
const p = (...a: Parameters<typeof predict>): Prediction => {
  const r = predict(...a);
  rows.push(r);
  return r;
};

describe('simulator predicts each trend', () => {
  it('1 sequential sum: time per access rises as the array outgrows L1, then L2', () => {
    const l1 = p('seq-sum', { N: 4096, passes: 4 }, '16 KiB (fits L1)');
    const l2 = p('seq-sum', { N: 32768, passes: 4 }, '128 KiB (fits L2)');
    const l3 = p('seq-sum', { N: 262144, passes: 4 }, '1 MiB (fits L3)');
    expect(l2.amat).toBeGreaterThan(l1.amat);
    expect(l3.amat).toBeGreaterThan(l2.amat);
  });

  it('2 strided: L1 miss rate climbs with stride until stride x 4 B reaches the 64 B line, then stays at 1', () => {
    const rates = [1, 2, 4, 8, 16, 32, 64].map((stride) => p('strided', { N: 262144, stride, elem: 'int32' }, `stride ${stride}`).l1MissRate);
    for (let i = 1; i < 5; i++) expect(rates[i]!).toBeGreaterThan(rates[i - 1]!);
    expect(rates[0]).toBeCloseTo(1 / 16, 2);
    for (const r of rates.slice(4)) expect(r).toBeCloseTo(1, 2);
  });

  it('3 matrix traversal: column-major is much slower than row-major (prefetch on, as on real hardware)', () => {
    // Row-major streams within a page, so the stride prefetcher hides DRAM; a
    // column step is 8 KiB, crosses a page every access, and gets no prefetch.
    const row = p('matrix-traverse', { N: 1024, order: 'row' }, 'row-major 1024x1024, prefetch', 'intel-coffee-lake', undefined, HW_PREFETCH);
    const col = p('matrix-traverse', { N: 1024, order: 'col' }, 'col-major 1024x1024, prefetch', 'intel-coffee-lake', undefined, HW_PREFETCH);
    expect(col.cycles / row.cycles).toBeGreaterThan(3);
    expect(col.l1MissRate).toBeGreaterThan(0.9);
  }, 60_000);

  it('4 matrix multiply: tiling cuts cycles once the matrices outgrow the cache (textbook preset)', () => {
    const naive = p('matmul', { N: 64, variant: 'naive' }, 'naive N=64', 'textbook');
    const tiled = p('matmul', { N: 64, variant: 'tiled', tile: 16 }, 'tiled 16 N=64', 'textbook');
    expect(tiled.cycles).toBeLessThan(naive.cycles);
  });

  it('5 pointer chasing: a shuffled list is far slower than a vector once it outgrows L3 (prefetch on)', () => {
    // 2^20 nodes x 16 B = 16 MiB, past the 9 MiB L3.
    const N = 1 << 20;
    const vec = p('list-vs-vector', { N, variant: 'vector' }, 'vector, 4 MiB, prefetch', 'intel-coffee-lake', undefined, HW_PREFETCH);
    const inorder = p('list-vs-vector', { N, variant: 'list-in-order' }, 'list in address order, prefetch', 'intel-coffee-lake', undefined, HW_PREFETCH);
    const shuffled = p('list-vs-vector', { N, variant: 'list-shuffled' }, 'list shuffled, prefetch', 'intel-coffee-lake', undefined, HW_PREFETCH);
    expect(shuffled.amat).toBeGreaterThan(5 * inorder.amat);
    expect(inorder.amat).toBeLessThan(2 * vec.amat);
  }, 120_000);

  it('6 AoS vs SoA: touching two fields of a wide struct costs more than two dense arrays', () => {
    const aos = p('aos-soa', { N: 262144, layout: 'aos' }, 'array of structs');
    const soa = p('aos-soa', { N: 262144, layout: 'soa' }, 'struct of arrays');
    expect(aos.cycles).toBeGreaterThan(soa.cycles);
  });

  it('7 false sharing: adjacent counters ping-pong; padded ones do not', () => {
    const packed = p('false-sharing', { iterations: 4096, threads: 2, layout: 'packed' }, 'packed, 2 threads', 'intel-coffee-lake', 2);
    const padded = p('false-sharing', { iterations: 4096, threads: 2, layout: 'padded' }, 'padded, 2 threads', 'intel-coffee-lake', 2);
    expect(packed.coherenceMisses).toBeGreaterThan(1000);
    expect(padded.coherenceMisses).toBe(0);
    expect(packed.cycles / padded.cycles).toBeGreaterThan(5);
  });

  it('8 SPSC ring: every item moves lines between cores in both layouts', () => {
    // In this lock-step schedule each side reads the index the other just wrote,
    // so padding alone does not remove transfers; it only stops the two indices
    // from invalidating each other. The model predicts no win from padding by
    // itself; VERIFY.md compares that with the measured result.
    const items = 16384;
    const same = p('spsc-ring', { items, layout: 'same-line' }, 'head/tail same line', 'intel-coffee-lake', 2);
    const sep = p('spsc-ring', { items, layout: 'separate-lines' }, 'head/tail separate lines', 'intel-coffee-lake', 2);
    expect(same.coherenceMisses).toBeGreaterThan(items);
    expect(sep.coherenceMisses).toBeGreaterThan(items);
  });

  it('9 hash table vs std::map: tree node walking misses more per lookup', () => {
    const hash = p('hash-vs-map', { N: 65536, lookups: 16384, variant: 'open-addressing' }, 'open addressing');
    const map = p('hash-vs-map', { N: 65536, lookups: 16384, variant: 'std-map' }, 'std::map');
    expect(map.cycles).toBeGreaterThan(hash.cycles);
  });

  it('prints the prediction table (for VERIFY.md)', () => {
    const fmt = (r: Prediction) =>
      `| ${r.workload} | ${r.label} | ${r.accesses} | ${r.amat.toFixed(2)} | ${(100 * r.l1MissRate).toFixed(1)}% | ${(100 * r.llcMissRate).toFixed(1)}% | ${r.coherenceMisses} | ${r.cycles} |`;
    console.log(['| workload | variant | accesses | AMAT (cycles) | L1d miss | LLC miss | coherence misses | cycles |', '|---|---|---|---|---|---|---|---|', ...rows.map(fmt)].join('\n'));
  });
});
