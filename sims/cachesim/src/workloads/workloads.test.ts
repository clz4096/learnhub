import { describe, expect, it } from 'vitest';
import type { Access } from '@/engine/types';
import type { Region } from './alloc';
import * as aosSoa from './aos-soa';
import * as falseSharing from './false-sharing';
import * as hashVsMap from './hash-vs-map';
import { WORKLOADS, workloadById } from './index';
import * as listVsVector from './list-vs-vector';
import * as matmul from './matmul';
import * as matrixTraverse from './matrix-traverse';
import * as seqSum from './seq-sum';
import * as spscRing from './spsc-ring';
import * as strided from './strided';
import { defaultParams, type Params, type TraceContext, type Workload } from './types';

const CTX: TraceContext = { lineBytes: 64, cores: 8, seed: 42 };

type RegionsFn = (p: Params, ctx: TraceContext) => Region[];
const REGIONS: Record<string, RegionsFn> = {
  'seq-sum': seqSum.regions,
  strided: strided.regions,
  'matrix-traverse': matrixTraverse.regions,
  matmul: matmul.regions,
  'list-vs-vector': listVsVector.regions,
  'aos-soa': aosSoa.regions,
  'false-sharing': falseSharing.regions,
  'spsc-ring': spscRing.regions,
  'hash-vs-map': hashVsMap.regions,
};

function take(w: Workload, p: Params, ctx: TraceContext, n: number): Access[] {
  const out: Access[] = [];
  for (const a of w.trace(p, ctx)) {
    out.push(a);
    if (out.length >= n) break;
  }
  return out;
}

function all(w: Workload, p: Params, ctx: TraceContext = CTX): Access[] {
  return Array.from(w.trace(p, ctx));
}

function get(id: string): Workload {
  const w = workloadById(id);
  if (!w) throw new Error(id);
  return w;
}

/** Defaults crossed with every choice option and every listed int value. */
function variants(w: Workload): Params[] {
  let out: Params[] = [defaultParams(w)];
  for (const spec of w.params) {
    const vals = spec.kind === 'choice' ? spec.options?.map((o) => o.value) : spec.values;
    if (!vals) continue;
    out = out.flatMap((p) => vals.map((v) => ({ ...p, [spec.key]: v })));
  }
  return out;
}

const lineOfAddr = (a: number, line: number) => Math.floor(a / line);

describe('registry', () => {
  it('lists 10 workloads in spec order with unique ids', () => {
    expect(WORKLOADS.map((w) => w.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(new Set(WORKLOADS.map((w) => w.id)).size).toBe(10);
  });
});

describe.each(WORKLOADS.map((w) => [w.id, w] as const))('%s', (_id, w) => {
  it('is deterministic for the same params and context', () => {
    for (const p of variants(w)) expect(take(w, p, CTX, 5000)).toEqual(take(w, p, CTX, 5000));
  });

  it('estimateLength is within 1% of the default trace length', () => {
    const p = defaultParams(w);
    const actual = all(w, p).length;
    expect(Math.abs(w.estimateLength(p, CTX) - actual)).toBeLessThanOrEqual(actual * 0.01);
    if (w.id !== 'custom') {
      expect(actual).toBeGreaterThanOrEqual(10_000);
      expect(actual).toBeLessThanOrEqual(200_000);
    }
  });

  it('emits valid accesses', () => {
    for (const ctx of [CTX, { ...CTX, cores: 2 }])
      for (const a of take(w, defaultParams(w), ctx, 2000)) {
        expect(Number.isSafeInteger(a.addr) && a.addr >= 0).toBe(true);
        expect(a.core).toBeGreaterThanOrEqual(0);
        expect(a.core).toBeLessThan(ctx.cores);
      }
  });
});

describe.each(WORKLOADS.filter((w) => w.id !== 'custom').map((w) => [w.id, w] as const))(
  '%s source lines',
  (id, w) => {
    it('every src points at a line naming the accessed variable', () => {
      for (const lineBytes of [64, 128])
        for (const p of variants(w)) {
          const ctx = { ...CTX, lineBytes };
          const lines = w.source(p).code.split('\n');
          const regions = REGIONS[id]!(p, ctx);
          for (const a of take(w, p, ctx, 2000)) {
            const text = lines[(a.src ?? 0) - 1];
            expect(text?.trim(), `src ${a.src} in ${JSON.stringify(p)}`).toBeTruthy();
            const r = regions.find((g) => a.addr >= g.base && a.addr < g.base + g.bytes);
            expect(r, `addr 0x${a.addr.toString(16)} outside every region`).toBeDefined();
            const named = r!.idents.some((n) => new RegExp(`\\b${n}\\b`).test(text!));
            expect(named, `line ${a.src} "${text}" does not name ${r!.idents.join('|')}`).toBe(true);
          }
        }
    });
  },
);

describe('layout facts', () => {
  it('seq-sum: consecutive addresses differ by 4', () => {
    const t = take(get('seq-sum'), { N: 4096 }, CTX, 4096);
    for (let i = 1; i < t.length; ++i) expect(t[i]!.addr - t[i - 1]!.addr).toBe(4);
  });

  it('seq-sum: passes repeat the same addresses; length is N * passes', () => {
    const w = get('seq-sum');
    const p = { N: 4096, passes: 2 }; // 16 KiB: fits a 32 KiB L1
    const t = all(w, p);
    expect(t.length).toBe(8192);
    expect(w.estimateLength(p, CTX)).toBe(8192);
    expect(t.slice(4096)).toEqual(t.slice(0, 4096));
    expect(all(w, { N: 4096, passes: 1 }).length).toBe(4096);
  });

  it('strided: step is stride * element size and count is ceil(N / stride)', () => {
    const w = get('strided');
    const p = { N: 1000, stride: 16, elem: 'int64' };
    const t = all(w, p);
    expect(t.length).toBe(63);
    for (let i = 1; i < t.length; ++i) expect(t[i]!.addr - t[i - 1]!.addr).toBe(128);
  });

  it('matrix-traverse: column order steps by N * 8, row order by 8', () => {
    const w = get('matrix-traverse');
    const col = take(w, { N: 64, order: 'col' }, CTX, 63);
    for (let i = 1; i < col.length; ++i) expect(col[i]!.addr - col[i - 1]!.addr).toBe(64 * 8);
    const row = take(w, { N: 64, order: 'row' }, CTX, 63);
    for (let i = 1; i < row.length; ++i) expect(row[i]!.addr - row[i - 1]!.addr).toBe(8);
  });

  it('matmul: naive and tiled perform the same multiset of accesses', () => {
    const w = get('matmul');
    const key = (a: Access) => `${a.addr}:${a.kind}`;
    const naive = all(w, { N: 16, variant: 'naive' }).map(key).sort();
    const tiled = all(w, { N: 16, variant: 'tiled', tile: 8 }).map(key).sort();
    expect(naive.length).toBe(4 * 16 ** 3);
    expect(tiled).toEqual(naive);
  });

  it('list-vs-vector: shuffled list visits distinct, non-monotonic node addresses', () => {
    const t = all(get('list-vs-vector'), { N: 1024, variant: 'list-shuffled' }).filter((_, i) => i % 2 === 0);
    const addrs = t.map((a) => a.addr);
    expect(new Set(addrs).size).toBe(1024);
    const increasing = addrs.every((a, i) => i === 0 || a > addrs[i - 1]!);
    expect(increasing).toBe(false);
    const ordered = all(get('list-vs-vector'), { N: 1024, variant: 'list-in-order' }).filter((_, i) => i % 2 === 0);
    for (let i = 1; i < ordered.length; ++i) expect(ordered[i]!.addr - ordered[i - 1]!.addr).toBe(16);
  });

  it('list-vs-vector: a different seed gives a different shuffle', () => {
    const w = get('list-vs-vector');
    const p = { N: 1024, variant: 'list-shuffled' };
    expect(take(w, p, CTX, 100)).not.toEqual(take(w, p, { ...CTX, seed: 7 }, 100));
  });

  it('aos-soa: AoS strides 32 B per particle, SoA 4 B', () => {
    const w = get('aos-soa');
    const aos = take(w, { N: 64, layout: 'aos' }, CTX, 6);
    expect(aos.map((a) => a.kind).join('')).toBe('RRWRRW');
    expect(aos[1]!.addr - aos[0]!.addr).toBe(12);
    expect(aos[3]!.addr - aos[0]!.addr).toBe(32);
    const soa = take(w, { N: 64, layout: 'soa' }, CTX, 6);
    expect(soa[3]!.addr - soa[0]!.addr).toBe(4);
    expect(lineOfAddr(soa[0]!.addr, 64)).not.toBe(lineOfAddr(soa[1]!.addr, 64));
  });

  it.each([64, 128])('false-sharing: packed share a line, padded do not (%i B lines)', (lineBytes) => {
    const w = get('false-sharing');
    const ctx = { ...CTX, lineBytes };
    for (const layout of ['packed', 'padded']) {
      const t = take(w, { iterations: 4, threads: 2, layout }, ctx, 4);
      expect(t.map((a) => a.core)).toEqual([0, 0, 1, 1]);
      const same = lineOfAddr(t[0]!.addr, lineBytes) === lineOfAddr(t[2]!.addr, lineBytes);
      expect(same).toBe(layout === 'packed');
    }
  });

  it.each([64, 128])('spsc-ring: head/tail line equality by layout (%i B lines)', (lineBytes) => {
    const ctx = { ...CTX, lineBytes };
    for (const layout of ['same-line', 'separate-lines']) {
      const r = spscRing.regions({ layout }, ctx);
      const base = (n: string) => r.find((g) => g.name === n)!.base;
      const same = lineOfAddr(base('head'), lineBytes) === lineOfAddr(base('tail'), lineBytes);
      expect(same).toBe(layout === 'same-line');
      const t = all(get('spsc-ring'), { layout, items: 100, capacity: 4 }, ctx);
      expect(t.filter((a) => a.core === 0 && a.addr === base('tail') && a.kind === 'W').length).toBe(100);
      expect(t.filter((a) => a.core === 1 && a.addr === base('head') && a.kind === 'W').length).toBe(100);
    }
  });

  it('spsc-ring: the consumer never reads a slot before it is written', () => {
    const t = all(get('spsc-ring'), { items: 500, capacity: 2 }, CTX);
    const written = new Map<number, number>();
    const read = new Map<number, number>();
    for (const a of t) {
      if (a.core === 0 && a.kind === 'W') written.set(a.addr, (written.get(a.addr) ?? 0) + 1);
      if (a.core === 1 && a.kind === 'R' && written.has(a.addr) && a.src !== undefined) {
        read.set(a.addr, (read.get(a.addr) ?? 0) + 1);
        expect(read.get(a.addr)!).toBeLessThanOrEqual(written.get(a.addr)!);
      }
    }
  });

  it('hash-vs-map: probes stay in the table; map walks about log2 N nodes', () => {
    const w = get('hash-vs-map');
    const oa = all(w, { N: 1024, lookups: 1000, variant: 'open-addressing' });
    const valueLoads = oa.filter((a) => (a.addr - hashVsMap.regions({ N: 1024 }, CTX)[0]!.base) % 16 === 8);
    expect(valueLoads.length).toBe(1000); // every lookup hits exactly once
    expect(oa.length / 1000).toBeLessThan(4);
    const map = all(w, { N: 1023, lookups: 1000, variant: 'std-map' });
    // Perfect tree of 1023 nodes: 10 levels * (key + child) + final key + value.
    expect(map.length).toBe(1000 * 22);
  });
});

// These two estimate without running the generator, so check them away from the defaults.
describe('estimateLength without running the trace', () => {
  function count(w: Workload, p: Params, ctx: TraceContext): number {
    let n = 0;
    for (const _ of w.trace(p, ctx)) ++n;
    return n;
  }
  const near = (w: Workload, p: Params, ctx: TraceContext) => {
    const actual = count(w, p, ctx);
    expect(Math.abs(w.estimateLength(p, ctx) - actual), JSON.stringify(p)).toBeLessThanOrEqual(actual * 0.01);
  };

  it('spsc-ring matches across capacities, item counts, and layouts', () => {
    const w = get('spsc-ring');
    for (const capacity of [1, 2, 4, 16, 256])
      for (const items of [1, 64, 65, 1000, 4097])
        for (const layout of ['same-line', 'separate-lines'])
          near(w, { capacity, items, layout }, { lineBytes: capacity === 1 ? 128 : 64, cores: capacity === 2 ? 1 : 2, seed: 1 });
  });

  it('hash-vs-map matches across sizes, lookups, variants, and seeds', () => {
    const w = get('hash-vs-map');
    for (const variant of ['open-addressing', 'std-map'])
      for (const N of [64, 100, 1000, 5000, 65536])
        for (const lookups of [64, 777, 4096])
          for (const seed of [1, 42])
            near(w, { N, lookups, variant }, { ...CTX, seed });
  });
});
