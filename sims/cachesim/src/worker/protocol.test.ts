import { describe, expect, it } from 'vitest';
import { EventKind, Mesi, type SimEvent } from '@/engine/types';
import { Simulator, presetById, cloneConfig } from '@/engine';
import { decodeAccess, decodeEvents, encodeOutcomes, type OutcomeLike, type Reply } from '@/worker/protocol';
import { SimRunner } from '@/worker/runner';
import { MAX_POINTS, emptyHistory, offerPoint, type HistoryPoint } from '@/worker/history';

describe('protocol encoding', () => {
  it('round-trips accesses and every event field', () => {
    const big = 2 ** 40 + 3;
    const events: SimEvent[] = [
      { cache: 0, set: 3, way: 1, kind: EventKind.Fill, line: big, miss: 'conflict', state: Mesi.E },
      { cache: 0, set: 3, way: 1, kind: EventKind.Evict, line: 7, state: Mesi.I },
      { cache: 2, set: 100, way: 11, kind: EventKind.Hit, line: 9 },
      { cache: 1, set: 0, way: 0, kind: EventKind.Invalidate, line: 4, state: Mesi.I },
      { cache: 1, set: 0, way: 0, kind: EventKind.StateChange, line: 4, state: Mesi.M },
      { cache: 3, set: 1, way: 2, kind: EventKind.Prefetch, line: 5 },
      { cache: 3, set: 1, way: 2, kind: EventKind.Writeback, line: 5, miss: 'coherence' },
    ];
    const outs: OutcomeLike[] = [
      { index: 0, access: { addr: big * 64 + 5, kind: 'W', core: 3, src: 12 }, servedBy: 'peer', cycles: 62, events: events.slice(0, 2) },
      { index: 1, access: { addr: 0, kind: 'R', core: 0 }, servedBy: 'L1', cycles: 4, events: [] },
      { index: 2, access: { addr: 64, kind: 'I', core: 1, src: 1 }, servedBy: 'DRAM', cycles: 200, events: events.slice(2) },
    ];
    const b = encodeOutcomes(outs);
    expect(b.count).toBe(3);
    outs.forEach((o, i) => {
      expect(decodeAccess(b, i)).toEqual({
        index: o.index, addr: o.access.addr, core: o.access.core, kind: o.access.kind,
        src: o.access.src ?? 0, servedBy: o.servedBy, cycles: o.cycles,
      });
      expect(decodeEvents(b, i)).toEqual(o.events);
    });
  });

  it('round-trips real simulator outcomes', () => {
    const cfg = cloneConfig(presetById('textbook')!.config);
    cfg.prefetch = { enabled: true, kind: 'next-line', degree: 2 };
    const sim = new Simulator(cfg);
    const outs = [];
    for (let i = 0; i < 300; i++) outs.push(sim.access({ addr: (i * 136) % 20000, kind: i % 3 ? 'R' : 'W', core: i % 2, src: 1 }));
    const b = encodeOutcomes(outs);
    outs.forEach((o, i) => expect(decodeEvents(b, i)).toEqual(o.events));
  });
});

describe('history downsampling', () => {
  it('never exceeds MAX_POINTS and keeps increasing indexes', () => {
    const h = emptyHistory();
    const p = (i: number): HistoryPoint => ({ i, l1: 0.5, l2: NaN, l3: NaN, cycles: i, amat: 1 });
    for (let i = 1; i <= 100_000; i++) offerPoint(h, p(i));
    expect(h.points.length).toBeLessThanOrEqual(MAX_POINTS);
    expect(h.points.length).toBeGreaterThan(MAX_POINTS / 2);
    for (let k = 1; k < h.points.length; k++) expect(h.points[k]!.i).toBeGreaterThan(h.points[k - 1]!.i);
  });
});

describe('SimRunner', () => {
  const setup = () => {
    const replies: Reply[] = [];
    const r = new SimRunner((m) => replies.push(m), () => Promise.resolve());
    return { r, replies };
  };
  const cfg = () => cloneConfig(presetById('textbook')!.config);

  it('configures, steps, and reports done on the last batch', async () => {
    const { r, replies } = setup();
    await r.receive({ type: 'configure', gen: 1, config: cfg(), workloadId: 'custom', params: {}, traceText: '0x0 R 0\n0x40 W 1\nbad line' });
    const c = replies[0]!;
    expect(c.type).toBe('configured');
    if (c.type !== 'configured') return;
    expect(c.estimate).toBe(2);
    expect(c.traceErrors[0]).toMatch(/^line 3:/);
    await r.receive({ type: 'step', gen: 1, n: 5 });
    const b = replies[1]!;
    expect(b.type).toBe('batch');
    if (b.type !== 'batch') return;
    expect(b.count).toBe(2);
    expect(b.done).toBe(true);
    expect(b.stats.accesses).toBe(2);
  });

  it('turns an invalid config into a readable error reply', async () => {
    const { r, replies } = setup();
    const bad = cfg();
    bad.l1d.ways = 3;
    await r.receive({ type: 'configure', gen: 4, config: bad, workloadId: 'seq-sum', params: {} });
    expect(replies[0]).toMatchObject({ type: 'error', gen: 4 });
    if (replies[0]!.type === 'error') expect(replies[0]!.message).toMatch(/L1d/);
  });

  it('runTo end sends a fast batch with history and a matching snapshot', async () => {
    const { r, replies } = setup();
    await r.receive({ type: 'configure', gen: 1, config: cfg(), workloadId: 'seq-sum', params: { N: 2048, passes: 2 } });
    await r.receive({ type: 'step', gen: 1, n: 3 });
    await r.receive({ type: 'runTo', gen: 2, index: 'end' });
    const fast = replies.find((m) => m.type === 'batch' && m.fast);
    const snap = replies.find((m) => m.type === 'snapshot');
    expect(fast && fast.type === 'batch' && fast.done).toBe(true);
    if (!fast || fast.type !== 'batch' || !snap || snap.type !== 'snapshot') throw new Error('missing replies');
    expect(fast.stats.accesses).toBe(4096);
    expect(fast.count).toBe(1);
    expect(decodeAccess(fast, 0).index).toBe(4095);
    expect(fast.history!.points.length).toBeGreaterThan(10);
    expect(snap.caches.length).toBeGreaterThan(0);
    expect(snap.caches[0]!.state.some((s) => s !== 0)).toBe(true);
  });

  it('a newer configure cancels a running runTo', async () => {
    const replies: Reply[] = [];
    let release: () => void = () => {};
    const r = new SimRunner((m) => replies.push(m), () => new Promise<void>((res) => { release = res; }));
    await r.receive({ type: 'configure', gen: 1, config: cfg(), workloadId: 'seq-sum', params: { N: 1 << 20, passes: 1 } });
    const run = r.receive({ type: 'runTo', gen: 2, index: 'end' });
    await Promise.resolve();
    const next = r.receive({ type: 'configure', gen: 3, config: cfg(), workloadId: 'seq-sum', params: { N: 256, passes: 1 } });
    release();
    await run;
    await next;
    expect(replies.some((m) => m.type === 'snapshot')).toBe(false);
    expect(replies.some((m) => m.type === 'progress' && m.gen === 2)).toBe(true);
    expect(replies[replies.length - 1]).toMatchObject({ type: 'configured', gen: 3 });
  });

  it('runTo after playback drained the trace still reports the last access', async () => {
    const { r, replies } = setup();
    await r.receive({ type: 'configure', gen: 1, config: cfg(), workloadId: 'custom', params: {}, traceText: '0x0 R 0\n0x40 W 1\n0x80 R 0' });
    await r.receive({ type: 'step', gen: 1, n: 10 });
    await r.receive({ type: 'runTo', gen: 2, index: 'end' });
    const fast = replies.find((m) => m.type === 'batch' && m.fast);
    if (!fast || fast.type !== 'batch') throw new Error('missing fast batch');
    expect(fast.count).toBe(1);
    expect(decodeAccess(fast, 0)).toMatchObject({ index: 2, addr: 0x80 });
    expect(fast.done).toBe(true);
  });

  it('reset reuses the parsed custom trace and its errors', async () => {
    const { r, replies } = setup();
    await r.receive({ type: 'configure', gen: 1, config: cfg(), workloadId: 'custom', params: {}, traceText: '0x0 R 0\nbad' });
    await r.receive({ type: 'step', gen: 1, n: 5 });
    await r.receive({ type: 'reset', gen: 2 });
    const c = replies[replies.length - 1]!;
    expect(c).toMatchObject({ type: 'configured', gen: 2, estimate: 1 });
    if (c.type === 'configured') expect(c.traceErrors[0]).toMatch(/^line 2:/);
    await r.receive({ type: 'step', gen: 2, n: 5 });
    expect(replies[replies.length - 1]).toMatchObject({ type: 'batch', count: 1 });
  });

  it('a configure that fails leaves no stale run to step', async () => {
    const { r, replies } = setup();
    await r.receive({ type: 'configure', gen: 1, config: cfg(), workloadId: 'seq-sum', params: {} });
    await r.receive({ type: 'configure', gen: 2, config: cfg(), workloadId: 'no-such-workload', params: {} });
    await r.receive({ type: 'step', gen: 2, n: 1 });
    expect(replies.slice(-2).map((m) => m.type)).toEqual(['error', 'error']);
  });
});
