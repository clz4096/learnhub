import { describe, it, expect } from 'vitest';
import { Simulator, breakdown, bits, Prng, Mesi, EventKind, LIMITS, PRESETS, validateConfig, type HierarchyConfig, type LevelConfig, type Access } from '@/engine';

const lvl = (name: string, sizeBytes: number, ways: number, latency: number, scope: 'core' | 'shared',
  extra: Partial<LevelConfig> = {}): LevelConfig =>
  ({ name, sizeBytes, lineBytes: 64, ways, latency, scope, policy: 'lru', ...extra });

/** Tiny hierarchy: L1 4 sets x 2 ways (512 B), L2 8 sets x 4 ways (2 KiB), L3 16 sets x 8 ways (8 KiB). */
function cfg(over: Partial<HierarchyConfig> = {}): HierarchyConfig {
  return {
    cores: 2,
    l1d: lvl('L1d', 512, 2, 4, 'core'),
    l2: lvl('L2', 2048, 4, 12, 'core'),
    l3: lvl('L3', 8192, 8, 40, 'shared'),
    dramLatency: 200,
    coherencePenalty: 20,
    prefetch: { enabled: false, kind: 'next-line', degree: 1 },
    seed: 7,
    ...over,
  };
}

const R = (addr: number, core = 0): Access => ({ addr, kind: 'R', core });
const W = (addr: number, core = 0): Access => ({ addr, kind: 'W', core });
const I = (addr: number, core = 0): Access => ({ addr, kind: 'I', core });
/** Address of line `n` (64 B lines). */
const L = (n: number): number => n * 64;

describe('address math', () => {
  it('splits an address into tag | set | offset', () => {
    // 64 B lines (6 offset bits), 64 sets (6 index bits).
    const b = breakdown(0x12345, 64, 64);
    expect(b.offset).toBe(0x12345 & 63);
    expect(b.set).toBe((0x12345 >> 6) & 63);
    expect(b.tag).toBe(0x12345 >> 12);
    expect(b.offsetBits).toBe(6);
    expect(b.indexBits).toBe(6);
    expect(b.bitFields).toBe(true);
    expect(b.tag * 64 * 64 + b.set * 64 + b.offset).toBe(0x12345); // lossless
  });
  it('uses a modulo, not bit fields, when sets is not a power of two', () => {
    const b = breakdown(L(12288 + 5), 64, 12288);
    expect(b.set).toBe(5);
    expect(b.tag).toBe(1);
    expect(b.indexBits).toBeNull();
    expect(b.bitFields).toBe(false);
  });
  it('formats bit strings to a fixed width', () => {
    expect(bits(5, 6)).toBe('000101');
  });
  it('maps lines to sets in the simulator the same way', () => {
    const sim = new Simulator(cfg({ cores: 1 }));
    const o = sim.access(R(L(5) + 17));
    const fill = o.events.find((e) => e.cache === 0 && e.kind === EventKind.Fill)!;
    expect(fill.set).toBe(5 % 4);
    expect(fill.line).toBe(5);
  });
});

describe('replacement policies', () => {
  // Lines 0, 4, 8 all map to L1 set 0 (4 sets). Ways = 2.
  it('LRU evicts the least recently used way', () => {
    const sim = new Simulator(cfg({ cores: 1 }));
    sim.access(R(L(0)));
    sim.access(R(L(4)));
    sim.access(R(L(0))); // 0 is now most recent; 4 is LRU
    const o = sim.access(R(L(8)));
    const ev = o.events.find((e) => e.cache === 0 && e.kind === EventKind.Evict)!;
    expect(ev.line).toBe(4);
  });

  it('tree pseudo-LRU picks a not-recently-used way (4-way set)', () => {
    const c = cfg({ cores: 1, l1d: lvl('L1d', 1024, 4, 4, 'core', { policy: 'plru' }) }); // 4 sets x 4 ways
    const sim = new Simulator(c);
    for (const n of [0, 4, 8, 12]) sim.access(R(L(n))); // fill ways 0..3
    sim.access(R(L(0))); // touch way 0 -> victim walks away from it
    sim.access(R(L(8))); // touch way 2
    const o = sim.access(R(L(16)));
    const ev = o.events.find((e) => e.cache === 0 && e.kind === EventKind.Evict)!;
    // Tree: touching 0 then 2 points the root left (toward {0,1}) and the left node at 1.
    expect(ev.line).toBe(4);
    expect([0, 8]).not.toContain(ev.line); // never a just-used line
  });

  it('pseudo-LRU falls back to LRU when ways is not a power of two', () => {
    const sim = new Simulator(cfg({ cores: 1, l1d: lvl('L1d', 768, 3, 4, 'core', { policy: 'plru' }) }));
    expect(sim.caches[0]!.effectivePolicy).toBe('lru');
  });

  it('random replacement is deterministic for a seed and only evicts within the set', () => {
    const run = (seed: number) => {
      const sim = new Simulator(cfg({ cores: 1, seed, l1d: lvl('L1d', 512, 2, 4, 'core', { policy: 'random' }) }));
      const evicted: number[] = [];
      for (let i = 0; i < 200; i++) {
        const o = sim.access(R(L((i % 7) * 4)));
        for (const e of o.events) if (e.cache === 0 && e.kind === EventKind.Evict) {
          expect(e.line % 4).toBe(0); // same set
          evicted.push(e.line);
        }
      }
      return evicted;
    };
    expect(run(3)).toEqual(run(3));
    expect(run(3)).not.toEqual(run(4));
  });
});

describe('miss classification (3C + coherence)', () => {
  it('first touch is compulsory', () => {
    const sim = new Simulator(cfg({ cores: 1 }));
    const o = sim.access(R(L(1)));
    expect(o.events.find((e) => e.cache === 0 && e.kind === EventKind.Fill)!.miss).toBe('compulsory');
    expect(o.servedBy).toBe('DRAM');
  });

  it('conflict: lines that fit in the cache but collide in one set', () => {
    // 3 lines in L1 set 0 with 2 ways: total 3 lines << 8 lines capacity, so a re-miss is conflict.
    const sim = new Simulator(cfg({ cores: 1 }));
    for (const n of [0, 4, 8]) sim.access(R(L(n)));
    const o = sim.access(R(L(0)));
    expect(o.events.find((e) => e.cache === 0 && e.kind === EventKind.Fill)!.miss).toBe('conflict');
    expect(sim.stats().levels.L1d!.conflict).toBe(1);
  });

  it('capacity: the working set is larger than the whole cache', () => {
    // 16 distinct lines through an 8-line L1, sequentially, then the first again.
    const sim = new Simulator(cfg({ cores: 1 }));
    for (let n = 0; n < 16; n++) sim.access(R(L(n)));
    const o = sim.access(R(L(0)));
    expect(o.events.find((e) => e.cache === 0 && e.kind === EventKind.Fill)!.miss).toBe('capacity');
  });

  it('coherence: a line invalidated by another core misses as coherence', () => {
    const sim = new Simulator(cfg());
    sim.access(R(L(3), 0));
    sim.access(W(L(3), 1)); // invalidates core 0's copy
    const o = sim.access(R(L(3), 0));
    expect(o.events.find((e) => e.cache === 0 && e.kind === EventKind.Fill)!.miss).toBe('coherence');
  });

  it('miss counts add up per level', () => {
    const sim = new Simulator(cfg({ cores: 1 }));
    const rng = new Prng(5);
    for (let i = 0; i < 2000; i++) sim.access(R(L(rng.int(64))));
    const s = sim.stats().levels.L1d!;
    expect(s.hits + s.misses).toBe(s.accesses);
    expect(s.compulsory + s.capacity + s.conflict + s.coherence).toBe(s.misses);
  });
});

describe('MESI coherence', () => {
  it('a lone reader gets Exclusive; a second reader makes both Shared', () => {
    const sim = new Simulator(cfg());
    sim.access(R(L(2), 0));
    expect(sim.coreState(2, 0)).toBe(Mesi.E);
    const o = sim.access(R(L(2), 1));
    expect(sim.coreState(2, 0)).toBe(Mesi.S);
    expect(sim.coreState(2, 1)).toBe(Mesi.S);
    expect(o.servedBy).toBe('peer'); // E data comes cache-to-cache
  });

  it('E -> M on a write is silent (no invalidations)', () => {
    const sim = new Simulator(cfg());
    sim.access(R(L(2), 0));
    const o = sim.access(W(L(2), 0));
    expect(sim.coreState(2, 0)).toBe(Mesi.M);
    expect(o.cycles).toBe(4);
    expect(sim.stats().cores[0]!.invalidationsSent).toBe(0);
  });

  it('S -> M upgrade invalidates the other sharer and costs a coherence trip', () => {
    const sim = new Simulator(cfg());
    sim.access(R(L(2), 0));
    sim.access(R(L(2), 1));
    const o = sim.access(W(L(2), 0));
    expect(sim.coreState(2, 0)).toBe(Mesi.M);
    expect(sim.coreState(2, 1)).toBe(Mesi.I);
    expect(o.events.some((e) => e.kind === EventKind.Invalidate && sim.infos[e.cache]!.core === 1)).toBe(true);
    expect(o.cycles).toBe(4 + 40 + 20);
    expect(sim.stats().cores[0]!.invalidationsSent).toBe(1);
  });

  it('a read of a Modified line downgrades the owner to Shared and writes back', () => {
    const sim = new Simulator(cfg());
    sim.access(W(L(9), 0));
    expect(sim.coreState(9, 0)).toBe(Mesi.M);
    const o = sim.access(R(L(9), 1));
    expect(sim.coreState(9, 0)).toBe(Mesi.S);
    expect(sim.coreState(9, 1)).toBe(Mesi.S);
    expect(o.servedBy).toBe('peer');
    expect(o.events.some((e) => e.kind === EventKind.Writeback)).toBe(true);
  });

  it('false sharing: two cores writing different bytes of one line ping-pong it', () => {
    const sim = new Simulator(cfg());
    for (let i = 0; i < 100; i++) {
      sim.access(W(L(5) + 0, 0)); // counter A
      sim.access(W(L(5) + 8, 1)); // counter B, same 64 B line
    }
    const shared = sim.stats();
    const padded = new Simulator(cfg());
    for (let i = 0; i < 100; i++) {
      padded.access(W(L(5), 0));
      padded.access(W(L(6), 1)); // separate lines
    }
    const p = padded.stats();
    expect(shared.levels.L1d!.coherence).toBeGreaterThan(190);
    expect(p.levels.L1d!.coherence).toBe(0);
    expect(shared.cycles).toBeGreaterThan(10 * p.cycles);
  });
});

describe('inclusion and write-back', () => {
  it('an inclusive L3 eviction back-invalidates private copies', () => {
    // L3 with 1 set x 2 ways: the third line evicts the first from L3 and therefore from L1/L2.
    const sim = new Simulator(cfg({ cores: 1, l1d: lvl('L1d', 512, 2, 4, 'core'), l2: lvl('L2', 1024, 4, 12, 'core'), l3: lvl('L3', 128, 2, 40, 'shared') }));
    sim.access(R(L(0)));
    sim.access(R(L(1)));
    sim.access(R(L(2)));
    expect(sim.coreState(0, 0)).toBe(Mesi.I);
    expect(sim.caches[0]!.find(0)).toBe(-1);
  });

  it('a dirty line evicted all the way out is written to DRAM', () => {
    const sim = new Simulator(cfg({ cores: 1, l3: undefined, l2: lvl('L2', 512, 2, 12, 'core') }));
    sim.access(W(L(0)));
    for (const n of [4, 8, 12, 16]) sim.access(R(L(n))); // push line 0 out of L1 and L2 (same set)
    expect(sim.stats().dramWrites).toBeGreaterThanOrEqual(1);
  });

  it('a victim L3 is filled only by lines leaving the private caches', () => {
    const sim = new Simulator(cfg({ cores: 1, l3: lvl('L3', 8192, 8, 40, 'shared', { inclusion: 'victim' }) }));
    sim.access(R(L(0)));
    expect(sim.caches.at(-1)!.find(0)).toBe(-1); // DRAM fill skipped L3
    // Lines 8k share L1 set 0 (2 ways) and L2 set 0 (4 ways): six more push line 0 out of
    // both, but only every other one lands in L3 set 0 (8 ways), so line 0 survives there.
    for (let n = 1; n <= 6; n++) sim.access(R(L(n * 8)));
    expect(sim.caches.at(-1)!.find(0)).toBeGreaterThanOrEqual(0);
    const o = sim.access(R(L(0)));
    expect(o.servedBy).toBe('L3');
  });

  it('a victim L3 hit by a sharer keeps the dirty line, so it still reaches DRAM (Zen 4 style, 3 cores)', () => {
    // L3 is 1 set x 2 ways so a few clean victims push line 0 out of it.
    const sim = new Simulator(cfg({ cores: 3, l3: lvl('L3', 128, 2, 40, 'shared', { inclusion: 'victim' }) }));
    const l3 = sim.caches.at(-1)!;
    sim.access(W(L(0), 0)); // c0 M
    sim.access(R(L(0), 1)); // c0 M -> S writes back into the victim L3 (dirty); c1 S
    expect(l3.state[l3.find(0)]).toBe(3);
    const o = sim.access(R(L(0), 2)); // c2 hits L3 and ends in S
    expect(o.servedBy).toBe('L3');
    expect(sim.coreState(0, 2)).toBe(Mesi.S);
    expect(l3.find(0)).toBeGreaterThanOrEqual(0); // still the owner of the dirty data
    expect(l3.state[l3.find(0)]).toBe(3);
    // Every core walks six lines of its own through L1/L2 set 0, evicting line 0 everywhere;
    // the clean lines they push out then push line 0 out of the L3.
    for (let c = 0; c < 3; c++) for (let j = 0; j < 6; j++) sim.access(R(L(8 * (1 + 6 * c + j)), c));
    for (let c = 0; c < 3; c++) expect(sim.coreState(0, c)).toBe(Mesi.I);
    expect(l3.find(0)).toBe(-1);
    expect(sim.stats().dramWrites).toBe(1);
  });

  it('an L1i fetch of a line held Modified in L1d keeps it Modified (no private L2)', () => {
    const sim = new Simulator(cfg({ cores: 1, l1i: lvl('L1i', 512, 2, 4, 'core'), l2: lvl('L2', 4096, 4, 16, 'shared'), l3: undefined }));
    const l2 = sim.caches.at(-1)!;
    sim.access(W(L(0))); // L1d holds line 0 Modified
    sim.access(I(L(0))); // the same line fetched as code into L1i
    expect(sim.coreState(0, 0)).toBe(Mesi.M);
    // Push line 0 out of both L1s (set 0, 2 ways): the last copy to leave writes back.
    for (const n of [4, 8]) { sim.access(R(L(n))); sim.access(I(L(n))); }
    expect(sim.coreState(0, 0)).toBe(Mesi.I);
    expect(l2.state[l2.find(0)]).toBe(3);
    expect(sim.stats().levels.L1d!.writebacks + sim.stats().levels.L1i!.writebacks).toBe(1);
  });

  it('a peer transfer costs the nearest shared level, not the SLC behind it (Apple style)', () => {
    const sim = new Simulator(cfg({ l2: lvl('L2', 4096, 4, 18, 'shared'), l3: lvl('SLC', 8192, 8, 58, 'shared', { inclusion: 'non-inclusive' }) }));
    sim.access(R(L(1), 0));
    const o = sim.access(R(L(1), 1));
    expect(o.servedBy).toBe('peer');
    expect(o.cycles).toBe(18 + 20);
    sim.access(R(L(2), 0));
    sim.access(R(L(2), 1));
    const up = sim.access(W(L(2), 0)); // S -> M upgrade
    expect(up.cycles).toBe(4 + 18 + 20);
  });

  it('Apple-style shared L2 with no L3 works', () => {
    const sim = new Simulator(cfg({ l2: lvl('L2', 4096, 4, 16, 'shared'), l3: undefined }));
    sim.access(R(L(1), 0));
    const o = sim.access(R(L(1), 1));
    expect(o.servedBy).toBe('peer');
    expect(sim.infos.filter((i) => i.level === 'L2')).toHaveLength(1);
  });
});

describe('prefetchers', () => {
  it('next-line prefetch turns sequential misses into hits', () => {
    const run = (enabled: boolean) => {
      const sim = new Simulator(cfg({ cores: 1, prefetch: { enabled, kind: 'next-line', degree: 1 } }));
      for (let n = 0; n < 64; n++) sim.access(R(L(n)));
      return sim.stats().levels.L1d!;
    };
    expect(run(true).misses).toBeLessThan(run(false).misses);
    expect(run(true).prefetchUseful).toBeGreaterThan(0);
  });

  it('stride prefetch learns a constant stride', () => {
    const sim = new Simulator(cfg({ cores: 1, prefetch: { enabled: true, kind: 'stride', degree: 2 } }));
    for (let i = 0; i < 40; i++) sim.access(R(L(i * 3)));
    expect(sim.stats().levels.L1d!.prefetchUseful).toBeGreaterThan(20);
  });

  it('prefetchers stop at 4 KiB page boundaries', () => {
    // A page-sized stride (a column walk) gives the stride prefetcher a perfect
    // pattern, but every target is on the next page, so nothing is prefetched.
    const sim = new Simulator(cfg({ cores: 1, prefetch: { enabled: true, kind: 'stride', degree: 2 } }));
    for (let i = 0; i < 40; i++) sim.access(R(i * 4096));
    expect(sim.stats().levels.L1d!.prefetchFills).toBe(0);
    const nl = new Simulator(cfg({ cores: 1, prefetch: { enabled: true, kind: 'next-line', degree: 1 } }));
    nl.access(R(4096 - 64));
    expect(nl.stats().levels.L1d!.prefetchFills).toBe(0);
  });
});

describe('shadow LRU memory', () => {
  it('stays bounded when the working set fits (no evictions to pop the queue)', () => {
    const sim = new Simulator(cfg({ cores: 1 }));
    for (let i = 0; i < 200_000; i++) sim.access(R(L(i & 3)));
    const l1 = sim.caches[0] as unknown as { qLine: number[]; qHead: number };
    expect(l1.qLine.length - l1.qHead).toBeLessThan(2 * 8 + 4096 + 2);
    // Classification still works after rebuilds: a line pushed out by capacity.
    for (let i = 0; i < 64; i++) sim.access(R(L(100 + i)));
    expect(sim.access(R(L(0))).events.some((e) => e.miss === 'capacity')).toBe(true);
  });
});

describe('determinism and invariants', () => {
  const randomTrace = (seed: number, n: number, cores: number): Access[] => {
    const rng = new Prng(seed);
    return Array.from({ length: n }, () => ({
      addr: rng.int(96) * 64 + rng.int(64),
      kind: rng.next() < 0.3 ? 'W' : 'R',
      core: rng.int(cores),
    }));
  };

  it('same config and trace give identical stats and events', () => {
    const t = randomTrace(11, 3000, 4);
    const a = new Simulator(cfg({ cores: 4 }));
    const b = new Simulator(cfg({ cores: 4 }));
    const ea = t.map((x) => a.access(x).events);
    const eb = t.map((x) => b.access(x).events);
    expect(ea).toEqual(eb);
    expect(a.stats()).toEqual(b.stats());
  });

  it('replaying events reproduces every cache\'s lines and dirty bits (all inclusion modes)', () => {
    // The UI mirrors cache contents from events alone, so events must carry the full state.
    // The last config has two shared levels (Apple style: inclusive shared L2 over an SLC),
    // so dirty lines leaving the L2 land on lines the SLC already holds.
    const configs = [
      ...(['inclusive', 'non-inclusive', 'victim'] as const).map((inclusion) =>
        [inclusion, cfg({ cores: 3, l3: lvl('L3', 8192, 8, 40, 'shared', { inclusion }) })] as const),
      ['apple', cfg({ cores: 3, l2: lvl('L2', 2048, 4, 18, 'shared'), l3: lvl('SLC', 8192, 8, 58, 'shared', { inclusion: 'non-inclusive' }) })] as const,
    ];
    for (const [inclusion, config] of configs) {
      const sim = new Simulator(config);
      const lines = sim.caches.map((c) => new Float64Array(c.lines.length).fill(-1));
      const state = sim.caches.map((c) => new Uint8Array(c.state.length));
      for (const a of randomTrace(5, 4000, 3)) {
        for (const e of sim.access(a).events) {
          const slot = e.set * sim.caches[e.cache]!.ways + e.way;
          const ln = lines[e.cache]!;
          const st = state[e.cache]!;
          const holds = ln[slot] === e.line;
          switch (e.kind) {
            case EventKind.Fill:
            case EventKind.Prefetch:
              ln[slot] = e.line; st[slot] = e.state ?? 1; break;
            case EventKind.Evict:
            case EventKind.Invalidate:
              if (holds) { ln[slot] = -1; st[slot] = 0; } break;
            case EventKind.StateChange:
              if (e.state === 0) { if (holds) { ln[slot] = -1; st[slot] = 0; } } else { ln[slot] = e.line; st[slot] = e.state!; } break;
            case EventKind.Writeback:
              if (holds) st[slot] = Mesi.M; break;
          }
        }
      }
      sim.caches.forEach((c, i) => {
        expect(Array.from(lines[i]!), `${inclusion} ${c.info.id} lines`).toEqual(Array.from(c.lines));
        const dirty = (a: ArrayLike<number>, l: ArrayLike<number>) => Array.from(a, (v, k) => (l[k]! >= 0 && v === Mesi.M ? 1 : 0));
        expect(dirty(state[i]!, lines[i]!), `${inclusion} ${c.info.id} dirty`).toEqual(dirty(c.state, c.lines));
      });
    }
  });

  it('MESI invariants hold after every access (single writer, directory = caches, inclusive L3)', () => {
    for (const inclusion of ['inclusive', 'non-inclusive', 'victim'] as const) {
      const sim = new Simulator(cfg({ cores: 4, l3: lvl('L3', 4096, 8, 40, 'shared', { inclusion }) }));
      let i = 0;
      for (const a of randomTrace(23, 2500, 4)) {
        sim.access(a);
        if (++i % 10 !== 0) continue; // check every 10th state (each check scans all lines)
        for (let line = 0; line < 96; line++) {
          let exclusive = 0;
          let holders = 0;
          for (let c = 0; c < 4; c++) {
            const st = sim.coreState(line, c);
            const present = sim.caches.some((k) => k.info.core === c && k.find(line) >= 0);
            expect(present).toBe(st !== Mesi.I);
            if (st === Mesi.M || st === Mesi.E) exclusive++;
            if (st !== Mesi.I) holders++;
          }
          expect(exclusive).toBeLessThanOrEqual(1);
          if (exclusive === 1) expect(holders).toBe(1);
          if (inclusion === 'inclusive' && holders > 0) expect(sim.caches.at(-1)!.find(line)).toBeGreaterThanOrEqual(0);
        }
      }
    }
  }, 30_000);

  it('cycles equal the sum of per-access cycles, and AMAT = cycles / accesses', () => {
    const sim = new Simulator(cfg({ cores: 2 }));
    let total = 0;
    for (const a of randomTrace(31, 1000, 2)) total += sim.access(a).cycles;
    const s = sim.stats();
    expect(s.cycles).toBe(total);
    expect(s.amat).toBeCloseTo(total / 1000, 10);
    expect(s.cores.reduce((x, c) => x + c.cycles, 0)).toBe(total);
  });

  it('attributes each access\'s cycles to the cache that served it', () => {
    const sim = new Simulator(cfg({ cores: 2 }));
    const l1 = sim.caches[0]!;
    const l2 = sim.caches[1]!;
    const l3 = sim.caches.at(-1)!;
    sim.access(R(L(0), 0)); // DRAM: 200, no cache
    sim.access(R(L(0), 0)); // L1 hit: 4
    sim.access(R(L(0), 1)); // peer: 60, no cache
    sim.access(W(L(0), 0)); // L1 hit + S -> M upgrade: 4 + 40 + 20, charged to L1
    for (const n of [4, 8]) sim.access(R(L(n), 0)); // push line 0 out of c0's L1 set 0
    expect(sim.access(R(L(0), 0)).servedBy).toBe('L2'); // 12
    sim.access(R(L(5), 1)); // DRAM
    for (const n of [13, 21, 29, 37]) sim.access(R(L(n), 1)); // out of c1's L1 set 1 and L2 set 5
    expect(sim.access(R(L(5), 1)).servedBy).toBe('L3'); // 40
    expect(l1.stats.servedCycles).toBe(4 + 64);
    expect(l2.stats.servedCycles).toBe(12);
    expect(l3.stats.servedCycles).toBe(40);
    expect(sim.stats().levels.L3!.servedCycles).toBe(40);
  });

  it('cycles served by caches plus DRAM and peer cycles equal the total', () => {
    for (const config of [cfg({ cores: 3 }), cfg({ cores: 3, l3: lvl('L3', 8192, 8, 40, 'shared', { inclusion: 'victim' }) }),
      cfg({ cores: 3, l2: lvl('L2', 2048, 4, 18, 'shared'), l3: lvl('SLC', 8192, 8, 58, 'shared', { inclusion: 'non-inclusive' }) })]) {
      const sim = new Simulator(config);
      let offChip = 0;
      for (const a of randomTrace(41, 3000, 3)) {
        const o = sim.access(a);
        if (o.servedBy === 'DRAM' || o.servedBy === 'peer') offChip += o.cycles;
      }
      const s = sim.stats();
      expect(s.caches.reduce((x, c) => x + c.servedCycles, 0) + offChip).toBe(s.cycles);
      expect(Object.values(s.levels).reduce((x, l) => x + l.servedCycles, 0) + offChip).toBe(s.cycles);
    }
  });

  it('rejects configs above the size limits, and every preset is within them', () => {
    expect(() => new Simulator(cfg({ l2: lvl('L2', 64 * (LIMITS.maxWays + 1) * 2, LIMITS.maxWays + 1, 12, 'core') }))).toThrow(/ways/);
    expect(() => new Simulator(cfg({ l3: lvl('L3', 64 * LIMITS.maxLinesPerLevel * 2, 16, 40, 'shared') }))).toThrow(/lines/);
    expect(() => validateConfig(cfg({ l3: lvl('L3', 64 * LIMITS.maxLinesPerLevel, 16, 40, 'shared') }))).not.toThrow();
    expect(() => validateConfig(cfg({ l2: lvl('L2', 64 * LIMITS.maxWays * 2, LIMITS.maxWays, 12, 'core') }))).not.toThrow();
    for (const p of PRESETS) expect(() => validateConfig(p.config), p.id).not.toThrow();
  });

  it('rejects impossible configs with a clear message', () => {
    expect(() => new Simulator(cfg({ cores: 9 }))).toThrow(/cores/);
    expect(() => new Simulator(cfg({ l1d: lvl('L1d', 500, 2, 4, 'core') }))).toThrow(/whole number of sets/);
    expect(() => new Simulator(cfg({ l2: { ...lvl('L2', 2048, 4, 12, 'core'), lineBytes: 128 } }))).toThrow(/line size/);
  });

  it('handles 1M accesses quickly', () => {
    const sim = new Simulator(cfg({ cores: 1, l1d: lvl('L1d', 32768, 8, 4, 'core'), l2: lvl('L2', 262144, 4, 12, 'core'), l3: lvl('L3', 2097152, 16, 40, 'shared') }));
    const t0 = performance.now();
    for (let i = 0; i < 1_000_000; i++) sim.access({ addr: (i * 8) % (8 << 20), kind: 'R', core: 0 });
    const ms = performance.now() - t0;
    expect(ms).toBeLessThan(5000);
  });
});

describe('presets', () => {
  it('every preset builds, and every source line is labeled VERIFIED or APPROXIMATE', async () => {
    const { PRESETS } = await import('@/engine/presets');
    expect(PRESETS.map((p) => p.id)).toEqual(['textbook', 'intel-coffee-lake', 'intel-raptor-cove', 'amd-zen4', 'apple-m1-p']);
    for (const p of PRESETS) {
      const sim = new Simulator(p.config);
      sim.access({ addr: 4096, kind: 'R', core: 0 });
      expect(sim.stats().accesses).toBe(1);
      for (const src of p.sources) {
        if (src.startsWith('Modeled as') || src.startsWith('The SLC')) continue; // model notes, not numbers
        expect(src).toMatch(/VERIFIED|APPROXIMATE|reported at/);
      }
    }
  });
});
