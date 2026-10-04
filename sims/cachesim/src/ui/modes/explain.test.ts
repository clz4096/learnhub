import { describe, expect, it } from 'vitest';
import { Simulator, EventKind, type AccessOutcome, type HierarchyConfig } from '@/engine';
import type { Access } from '@/engine/types';
import { workloadById } from '@/workloads';
import { configFor, paramsFor, type Setup } from '@/ui/modes/setup';
import { accessAt, predictVictim, replay } from '@/ui/modes/replay';
import { explainAccess, explainCache, explainEvent, explainSet, explainSlot, type AccessView } from '@/ui/modes/explain';
import { TERM_IDS, markedTerms } from '@/ui/Term';

function traceOf(s: Setup): { cfg: HierarchyConfig; trace: () => Iterable<Access> } {
  const cfg = configFor(s);
  const w = workloadById(s.workload)!;
  const p = paramsFor(s);
  return { cfg, trace: () => w.trace(p, { lineBytes: cfg.l1d.lineBytes, cores: cfg.cores, seed: cfg.seed }) };
}

function view(o: AccessOutcome): AccessView {
  return { index: o.index, addr: o.access.addr, core: o.access.core, kind: o.access.kind, servedBy: o.servedBy, cycles: o.cycles, events: o.events };
}

const DASHES = /[\u2013\u2014]/;
const SEQ: Setup = { preset: 'textbook', workload: 'seq-sum', params: { N: 256, passes: 1 } };
const FS: Setup = { preset: 'textbook', workload: 'false-sharing', params: { threads: 2, iterations: 256, layout: 'packed' } };
const COL: Setup = { preset: 'textbook', workload: 'matrix-traverse', params: { N: 64, order: 'col' } };

describe('replay', () => {
  it('finds the access that filled a slot and its last use', () => {
    const { cfg, trace } = traceOf(SEQ);
    const r = replay(cfg, trace(), 20);
    expect(r.count).toBe(21);
    expect(r.outcome?.index).toBe(20);
    // Before access 20 runs: L1d of core 0 (cache 0), set 0 way 0 holds line 0x10000000/64, filled by #0, last used by #15.
    const t = r.tracks[0]!;
    expect(r.sim.caches[0]!.lines[0]).toBe(0x10000000 / 64);
    expect(t.fillIndex[0]).toBe(0);
    expect(t.lastUse[0]).toBe(15);
    expect(t.fillIndex[1 * 2 + 0]).toBe(16);
    expect(accessAt(trace(), r.tracks[0]!.fillIndex[1 * 2 + 0]!)?.addr).toBe(0x10000040);
  });

  it('accessAt reads the trace without simulating', () => {
    const { trace } = traceOf(SEQ);
    expect(accessAt(trace(), 17)?.addr).toBe(0x10000044);
    expect(accessAt(trace(), 10_000)).toBeNull();
  });

  // Reuse distance must agree with the engine's own capacity/conflict split: capacity
  // exactly when at least `lines` other distinct lines came between two uses.
  for (const s of [COL, { preset: 'textbook', workload: 'list-vs-vector', params: { N: 2048, variant: 'list-shuffled' } } as Setup]) {
    it(`reuse distance matches the engine's miss kind (${s.workload})`, () => {
      const { cfg, trace } = traceOf(s);
      const sim = new Simulator(cfg);
      const targets: number[] = [];
      sim.run(trace(), 3000, (o) => {
        if (o.events.some((e) => e.miss === 'capacity' || e.miss === 'conflict')) targets.push(o.index);
      });
      expect(targets.length).toBeGreaterThan(20);
      let checked = 0;
      for (const idx of targets.filter((_, i) => i % Math.ceil(targets.length / 25) === 0)) {
        const a = accessAt(trace(), idx)!;
        const line = Math.floor(a.addr / cfg.l1d.lineBytes);
        const r = replay(cfg, trace(), idx, line);
        for (const ev of r.outcome!.events) {
          if (ev.line !== line || (ev.miss !== 'capacity' && ev.miss !== 'conflict')) continue;
          const info = r.sim.infos[ev.cache]!;
          const h = r.history.get(ev.cache)!;
          expect(h.lastUse).toBeGreaterThanOrEqual(0);
          expect(h.distinct >= info.sets * info.ways).toBe(ev.miss === 'capacity');
          if (ev.miss === 'conflict') expect(h.distinctSameSet).toBeGreaterThanOrEqual(info.ways);
          checked++;
        }
      }
      expect(checked).toBeGreaterThan(10);
    });
  }

  it('records who invalidated a line before a coherence miss', () => {
    const { cfg, trace } = traceOf(FS);
    const r = replay(cfg, trace(), 4, 0x10000000 / 64);
    expect(r.outcome?.servedBy).toBe('peer');
    expect(r.history.get(0)?.invalidated).toEqual({ index: 3, core: 1 });
  });

  // The LRU prediction ("k more misses into the set evict it") must match what the engine does.
  it('predicts the LRU victim order', () => {
    const s: Setup = { preset: 'textbook', workload: 'list-vs-vector', params: { N: 1024, variant: 'list-shuffled' } };
    const { cfg, trace } = traceOf(s);
    let checked = 0;
    for (const at of [300, 700, 1100, 1500]) {
      const r = replay(cfg, trace(), at);
      const info = r.sim.infos[0]!;
      for (let set = 0; set < info.sets; set++) {
        for (let way = 0; way < info.ways; way++) {
          const line = r.sim.caches[0]!.lines[set * info.ways + way]!;
          if (line < 0) continue;
          const v = predictVictim(r, 0, set, way);
          const k = v.empty + v.older + 1;
          // Simulate forward on a fresh engine up to `at`, then count fills into the set.
          const sim = new Simulator(cfg);
          let i = 0;
          let fills = 0;
          let result: 'evicted' | 'touched' | 'end' = 'end';
          for (const a of trace()) {
            const o = sim.access(a);
            if (i++ <= at) continue;
            for (const e of o.events) {
              if (e.cache !== 0 || e.set !== set) continue;
              if (e.kind === EventKind.Hit) { result = 'touched'; break; }
              if (e.kind === EventKind.Fill || e.kind === EventKind.Prefetch) fills++;
              if (e.kind === EventKind.Evict && e.line === line) { result = 'evicted'; break; }
            }
            if (result !== 'end') break;
          }
          if (result !== 'evicted') continue;
          expect({ set, way, fills }).toEqual({ set, way, fills: k });
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(10);
  });

  it('predicts the pseudo-LRU victim', () => {
    const s: Setup = { preset: 'intel-coffee-lake', workload: 'list-vs-vector', params: { N: 8192, variant: 'list-shuffled' } };
    const { cfg: base, trace } = traceOf(s);
    const cfg = { ...base, l1d: { ...base.l1d, policy: 'plru' as const } };
    const at = 9000;
    const r = replay(cfg, trace(), at);
    const info = r.sim.infos[0]!;
    let checked = 0;
    const sim = new Simulator(cfg);
    const want = new Map<number, number>();
    for (let set = 0; set < info.sets; set++) {
      const v = predictVictim(r, 0, set, 0);
      if (v.empty === 0) want.set(set, v.plruWay);
    }
    let i = 0;
    const done = new Set<number>();
    for (const a of trace()) {
      const o = sim.access(a);
      if (i++ <= at) continue;
      for (const e of o.events) {
        if (e.cache !== 0 || done.has(e.set)) continue;
        if (e.kind === EventKind.Hit) { done.add(e.set); continue; }
        if (e.kind === EventKind.Fill || e.kind === EventKind.Prefetch) {
          done.add(e.set);
          if (want.has(e.set)) { expect({ set: e.set, way: e.way }).toEqual({ set: e.set, way: want.get(e.set) }); checked++; }
        }
      }
      if (done.size === info.sets) break;
    }
    expect(checked).toBeGreaterThan(10);
  });
});

describe('explanations', () => {
  it('explains a cache: geometry and how the set is computed', () => {
    const { cfg } = traceOf(SEQ);
    const sim = new Simulator(cfg);
    const e = explainCache(sim.infos[0]!, cfg);
    const text = e.paras.join(' ');
    expect(text).toContain('1,024 / (64 × 2) = 8 sets');
    expect(text).toContain('bits 6 to 8');
    expect(text).toContain('LRU');
    const l3 = explainCache(sim.infos[4]!, cfg).paras.join(' ');
    expect(l3).toContain('Shared by all 2 cores');
    expect(l3).toContain('Inclusive');
  });

  it('explains a non power-of-two set count as a remainder', () => {
    const { cfg } = traceOf({ preset: 'intel-coffee-lake', workload: 'seq-sum' });
    const sim = new Simulator(cfg);
    const l3 = sim.infos.find((c) => c.level === 'L3')!;
    expect(explainCache(l3, cfg).paras.join(' ')).toContain('not a power of two');
  });

  it('explains a slot: line, state, who filled it, and what evicts it', () => {
    const { cfg, trace } = traceOf(SEQ);
    const r = replay(cfg, trace(), 20);
    const t = r.tracks[0]!;
    const e = explainSlot(r.sim.infos[0]!, 0, 0, { line: r.sim.caches[0]!.lines[0]!, state: r.sim.caches[0]!.state[0]! },
      { fillIndex: t.fillIndex[0]!, fillPrefetch: false, fillAccess: accessAt(trace(), t.fillIndex[0]!)!, lastUse: t.lastUse[0]! }, predictVictim(r, 0, 0, 0));
    const text = e.paras.join(' ');
    expect(text).toContain('Holds line 4,194,304: bytes 0x10000000 to 0x1000003f');
    expect(text).toContain('E (Exclusive)');
    expect(text).toContain('Access #0 (core 0 read of 0x10000000) missed here and filled it.');
    expect(text).toContain('Last used by access #15.');
    // Set 0 has one empty way; under LRU, 2 more misses into it evict line 0.
    expect(text).toContain('2 more misses into set 0 evict it, if nothing touches it first: 1 empty way fills first, then it goes next.');
  });

  it('explains a set and its contents', () => {
    const { cfg } = traceOf(SEQ);
    const sim = new Simulator(cfg);
    const text = explainSet(sim.infos[0]!, 3, [{ line: 4194307, state: 2 }, { line: -1, state: 0 }]).paras.join(' ');
    expect(text).toContain('line number mod 8 is 3');
    expect(text).toContain('512 B apart');
    expect(text).toContain('way 1: empty');
  });

  it('explains a compulsory miss, a hit, and a coherence miss with this access\'s numbers', () => {
    const { cfg, trace } = traceOf(FS);
    const r0 = replay(cfg, trace(), 0, 0x10000000 / 64);
    const sim = r0.sim;
    const first = explainAccess(view(r0.outcome!), sim.infos, cfg, r0.history).paras.join(' ');
    expect(first).toContain('L1d: compulsory miss');
    expect(first).toContain('Served by DRAM in 200 cycles');

    const r3 = replay(cfg, trace(), 3, 0x10000000 / 64);
    const up = explainAccess(view(r3.outcome!), r3.sim.infos, cfg, r3.history).paras.join(' ');
    expect(up).toContain('L1d: hit');
    expect(up).toContain('plus 60 to invalidate');
    expect(up).toContain('invalidated the copies in core 0');

    const r4 = replay(cfg, trace(), 4, 0x10000000 / 64);
    const coh = explainAccess(view(r4.outcome!), r4.sim.infos, cfg, r4.history).paras.join(' ');
    expect(coh).toContain('Core 1 wrote this line at access #3');
    expect(coh).toContain('cache-to-cache transfer');
    expect(coh).toContain('S (Shared)');
  });

  it('explains capacity and conflict misses with reuse distances', () => {
    const { cfg, trace } = traceOf(COL);
    // Access 64 starts column 1 and reuses line 0 (last used at #0).
    const a = accessAt(trace(), 64)!;
    const line = Math.floor(a.addr / 64);
    const r = replay(cfg, trace(), 64, line);
    const text = explainAccess(view(r.outcome!), r.sim.infos, cfg, r.history).paras.join(' ');
    expect(text).toContain('L1d: capacity miss. Line');
    expect(text).toContain('last used at access #0');
    expect(text).toContain('63 other distinct lines, at least its 16-line capacity');
    expect(text).toContain('L2: conflict miss');
    expect(text).toContain('fewer than its 128 lines');
  });

  it('explains each event kind without dashes', () => {
    const { cfg, trace } = traceOf(FS);
    for (const idx of [0, 1, 2, 3, 4]) {
      const r = replay(cfg, trace(), idx, 0x10000000 / 64);
      const v = view(r.outcome!);
      for (const ev of v.events) {
        const e = explainEvent(ev, v, r.sim.infos, cfg, r.history);
        expect(e.paras.length).toBeGreaterThan(1);
        expect(DASHES.test(e.paras.join(' ') + e.title)).toBe(false);
      }
      expect(DASHES.test(explainAccess(v, r.sim.infos, cfg, r.history).paras.join(' '))).toBe(false);
    }
  });
});

describe('explanation text', () => {
  it('leads with a plain answer and links only to glossary terms that exist', () => {
    const { cfg, trace } = traceOf(FS);
    const texts: string[][] = [];
    for (const idx of [0, 1, 2, 3, 4]) {
      const r = replay(cfg, trace(), idx, 0x10000000 / 64);
      const v = view(r.outcome!);
      texts.push(explainAccess(v, r.sim.infos, cfg, r.history).paras);
      for (const ev of v.events) texts.push(explainEvent(ev, v, r.sim.infos, cfg, r.history).paras);
      for (const info of r.sim.infos) texts.push(explainCache(info, cfg).paras);
    }
    for (const paras of texts) {
      expect(paras[0]!.length).toBeGreaterThan(10);
      for (const id of markedTerms(paras.join(' '))) expect(TERM_IDS, id).toContain(id);
    }
  });
});

describe('replay at the target access', () => {
  it('includes the target access in slot provenance', () => {
    const { cfg, trace } = traceOf(SEQ);
    // Access 16 fills L1d set 1; replaying to 16 must already show it.
    const r = replay(cfg, trace(), 16);
    expect(r.tracks[0]!.fillIndex[1 * 2 + 0]).toBe(16);
    expect(r.tracks[0]!.lastUse[1 * 2 + 0]).toBe(16);
  });
});

describe('explanations of the less common paths', () => {
  const BASE = 0x10000000 / 64;
  const reads = (lines: number[]): Access[] => lines.map((l) => ({ addr: l * 64, kind: 'R', core: 0 }));
  const textOf = (cfg: HierarchyConfig, trace: Access[], idx: number) => {
    const r = replay(cfg, trace, idx, Math.floor(trace[idx]!.addr / 64));
    const v = view(r.outcome!);
    return { r, v, text: explainAccess(v, r.sim.infos, cfg, r.history).paras.join(' ') };
  };

  it('charges a peer transfer at the nearest shared level (Apple: the shared L2)', () => {
    const { cfg, trace } = traceOf({ preset: 'apple-m1-p', workload: 'false-sharing', params: { threads: 2, iterations: 64, layout: 'packed' } });
    expect(cfg.l2.scope).toBe('shared');
    const sim = new Simulator(cfg);
    let peer: AccessOutcome | null = null;
    sim.run(trace(), 1000, (o) => { if (!peer && o.servedBy === 'peer') peer = o; });
    const o = peer as AccessOutcome | null;
    expect(o).not.toBeNull();
    const text = explainAccess(view(o!), sim.infos, cfg).paras.join(' ');
    expect(text).toContain(`costs the L2 latency (${cfg.l2.latency}) plus ${cfg.coherencePenalty} transfer cycles = ${o!.cycles} cycles`);
    expect(o!.cycles).toBe(cfg.l2.latency + cfg.coherencePenalty);
    expect(text).not.toContain(`${cfg.l3!.name} latency`);
  });

  it('blames an inclusive outer level when a back-invalidation causes the next miss', () => {
    const { cfg: base } = traceOf(SEQ);
    // A 2-line L3 evicts line A on the third fill and takes it out of L1d and L2 too.
    const cfg: HierarchyConfig = { ...base, cores: 1, l3: { ...base.l3!, sizeBytes: 128, ways: 2 } };
    const trace = reads([BASE, BASE + 1, BASE + 2, BASE]);
    const { r, text } = textOf(cfg, trace, 3);
    expect(r.outcome!.events.find((e) => e.cache === 0 && e.miss)?.miss).toBe('conflict');
    expect(r.history.get(0)?.evicted).toEqual({ index: 2, by: null });
    expect(text).toContain('L1d: conflict miss. Line 4,194,304 was last used at access #0. L1d did not evict it to make room. At access #2 an inclusive outer level evicted the line');
    expect(DASHES.test(text)).toBe(false);
  });

  it('says when a capacity miss hits a line only a prefetch had brought in', () => {
    const { cfg: base } = traceOf(SEQ);
    const cfg: HierarchyConfig = { ...base, cores: 1, prefetch: { enabled: true, kind: 'next-line', degree: 1 } };
    // #0 prefetches BASE+1 into L1d set 1; #1 and #2 also map to set 1 and push it out unused.
    const trace = reads([BASE, BASE + 9, BASE + 17, BASE + 1]);
    const { r, text } = textOf(cfg, trace, 3);
    expect(r.outcome!.events.find((e) => e.cache === 0 && e.miss)?.miss).toBe('capacity');
    expect(r.history.get(0)).toMatchObject({ lastUse: -1, prefetched: 0 });
    expect(text).toContain('L1d: capacity miss. No access had used line 4,194,305 here before. A prefetch at access #0 brought it in, but it was evicted before any access used it.');
    expect(text).not.toContain('last use');
  });

  it('describes victim L3 fills and hits as moves, not as making room', () => {
    const { cfg: base } = traceOf({ preset: 'amd-zen4', workload: 'seq-sum' });
    const cfg: HierarchyConfig = {
      ...base, cores: 1,
      l1d: { ...base.l1d, sizeBytes: 1024, ways: 2 },
      l2: { ...base.l2, sizeBytes: 2048, ways: 4 },
    };
    // Five lines in set 0 overflow the 4-way L2; the fifth pushes BASE into the victim L3.
    const trace = reads([BASE, BASE + 8, BASE + 16, BASE + 24, BASE + 32, BASE]);
    const l3 = new Simulator(cfg).infos.find((c) => c.level === 'L3')!.id;

    const at4 = replay(cfg, trace, 4);
    const v4 = view(at4.outcome!);
    const fill = v4.events.find((e) => e.cache === l3 && e.kind === EventKind.Fill)!;
    expect(fill.line).toBe(BASE);
    const fillText = explainEvent(fill, v4, at4.sim.infos, cfg).paras.join(' ');
    expect(fillText).toContain('a private cache evicted line 4,194,304, and this victim cache caught it');
    expect(fillText).not.toContain('on the way back');

    const { r, v, text } = textOf(cfg, trace, 5);
    expect(r.outcome!.servedBy).toBe('L3');
    expect(text).toContain('Line 4,194,304 moved from L3 into core 0\'s caches.');
    expect(text).not.toMatch(/evicted [^.]*line 4,194,304 from L3/);
    const ev = v.events.find((e) => e.cache === l3 && e.kind === EventKind.Evict)!;
    const evText = explainEvent(ev, v, r.sim.infos, cfg).paras.join(' ');
    expect(evText).toContain('moved from the shared L3');
    expect(evText).not.toContain('make room');
  });
});
