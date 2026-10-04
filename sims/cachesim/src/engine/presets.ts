/**
 * Hardware presets. Every number is labeled VERIFIED (with the source it was checked
 * against) or APPROXIMATE (best available figure, and why). See PRESET_SOURCES below.
 *
 * Latencies are load-to-use cycles for a hit at that level; DRAM is converted from
 * nanoseconds at the stated clock and varies with memory configuration.
 */
import type { HierarchyConfig, LevelConfig } from '@/engine/types';

export interface Preset {
  id: string;
  label: string;
  /** One-line description shown in the picker. */
  note: string;
  config: HierarchyConfig;
  /** Per-field provenance shown in the UI and kept next to the numbers. */
  sources: string[];
}

const lvl = (name: string, sizeBytes: number, lineBytes: number, ways: number, latency: number,
  scope: LevelConfig['scope'], extra: Partial<LevelConfig> = {}): LevelConfig =>
  ({ name, sizeBytes, lineBytes, ways, latency, scope, policy: 'lru', ...extra });

const KiB = 1024;
const MiB = 1024 * 1024;
const noPrefetch = { enabled: false, kind: 'next-line' as const, degree: 1 };

const C = {
  sky: 'https://www.7-cpu.com/cpu/Skylake.html',
  cflSlices: 'https://www.cpu-world.com/CPUs/Core_i7/Intel-Core%20i7%20i7-8750H.html',
  rpl: 'https://chipsandcheese.com/p/a-preview-of-raptor-lakes-improved-l2-caches',
  zenSog: 'https://www.numberworld.org/blogs/2024_8_7_zen5_avx512_teardown/57647_zen4_sog.pdf',
  zenCnc: 'https://chipsandcheese.com/p/amds-zen-4-part-2-memory-subsystem-and-conclusion',
  m1: 'https://www.7-cpu.com/cpu/Apple_M1.html',
  m1sysctl: 'https://cpufun.substack.com/p/more-m1-fun-hardware-information',
  firestorm: 'https://dougallj.github.io/applecpu/firestorm.html',
};

export const PRESETS: Preset[] = [
  {
    id: 'textbook',
    label: 'Textbook small cache',
    note: 'Tiny caches so every set and way is visible. For learning, not a real CPU.',
    config: {
      cores: 2,
      l1d: lvl('L1d', 1 * KiB, 64, 2, 4, 'core'),
      l2: lvl('L2', 8 * KiB, 64, 4, 12, 'core'),
      l3: lvl('L3', 64 * KiB, 64, 8, 40, 'shared', { inclusion: 'inclusive' }),
      dramLatency: 200,
      coherencePenalty: 20,
      prefetch: noPrefetch,
      seed: 1,
    },
    sources: [
      'APPROXIMATE (pedagogical): round sizes and latencies of the magnitude used in Hennessy & Patterson; not a real CPU.',
    ],
  },
  {
    id: 'intel-coffee-lake',
    label: 'Intel Coffee Lake (Core i7-8750H)',
    note: 'Skylake-family client core; the machine the benchmarks were first run on.',
    config: {
      cores: 6,
      l1d: lvl('L1d', 32 * KiB, 64, 8, 4, 'core'),
      l2: lvl('L2', 256 * KiB, 64, 4, 12, 'core'),
      l3: lvl('L3', 9 * MiB, 64, 12, 42, 'shared', { inclusion: 'inclusive' }),
      dramLatency: 246,
      coherencePenalty: 20,
      prefetch: noPrefetch,
      seed: 1,
    },
    sources: [
      `Sizes and line: VERIFIED on the i7-8750H itself (sysctl hw.l1dcachesize=32768, hw.l2cachesize=262144, hw.l3cachesize=9437184, hw.cachelinesize=64).`,
      `L1d 8-way, 4 cycles (simple addressing; 5 for complex): VERIFIED ${C.sky}`,
      `L2 4-way, 12 cycles: VERIFIED ${C.sky}`,
      `L3 12-way per 1.5 MiB slice: APPROXIMATE (search excerpt of ${C.cflSlices}; page not fetched).`,
      `L3 42 cycles: APPROXIMATE, measured on a 4-core i7-6700 at 4.0 GHz (${C.sky}); the 6-slice ring and uncore clock change it.`,
      `L3 inclusive: APPROXIMATE (client Skylake-family kept an inclusive L3; only the server parts dropped it).`,
      `DRAM 246 cycles: APPROXIMATE, "42 cycles + 51 ns" at 4.0 GHz with DDR4-2400 (${C.sky}); a laptop 8750H differs.`,
      'Modeled as one L3 with 12,288 sets indexed by modulo; the real L3 hashes addresses across 6 slices.',
    ],
  },
  {
    id: 'intel-raptor-cove',
    label: 'Intel Raptor Lake P-core (Core i9-13900K)',
    note: 'Recent Intel desktop performance core. Several values unconfirmed (see sources).',
    config: {
      cores: 8,
      l1d: lvl('L1d', 48 * KiB, 64, 12, 5, 'core'),
      l2: lvl('L2', 2 * MiB, 64, 16, 16, 'core'),
      l3: lvl('L3', 36 * MiB, 64, 12, 70, 'shared', { inclusion: 'non-inclusive' }),
      dramLatency: 374,
      coherencePenalty: 20,
      prefetch: noPrefetch,
      seed: 1,
    },
    sources: [
      `L2 2 MB: VERIFIED ${C.rpl}`,
      `L2 16-way, 16 cycles (one more than Golden Cove): APPROXIMATE (search excerpt of ${C.rpl}).`,
      'L1d 48 KB, 12-way, 5 cycles: APPROXIMATE (Golden Cove carry-over; sources conflict on 8 vs 12 ways; check the Intel optimization manual).',
      'L3 36 MB: APPROXIMATE (search excerpt). L3 ways and 70-cycle latency: APPROXIMATE, unverified and uncore-clock dependent.',
      'L3 non-inclusive: APPROXIMATE.',
      'DRAM 374 cycles: APPROXIMATE, about 68 ns (review excerpt) at an assumed 5.5 GHz.',
    ],
  },
  {
    id: 'amd-zen4',
    label: 'AMD Zen 4 (Ryzen 9 7950X, one CCD)',
    note: '8 cores sharing a 32 MB victim L3 (filled only by lines evicted from L2).',
    config: {
      cores: 8,
      l1d: lvl('L1d', 32 * KiB, 64, 8, 4, 'core'),
      l2: lvl('L2', 1 * MiB, 64, 8, 14, 'core'),
      l3: lvl('L3', 32 * MiB, 64, 16, 50, 'shared', { inclusion: 'victim' }),
      dramLatency: 418,
      coherencePenalty: 20,
      prefetch: noPrefetch,
      seed: 1,
    },
    sources: [
      `L1d 4 cycles, L2 14 cycles, L3 8-9 ns, DRAM 73.35 ns (DDR5-6000): VERIFIED ${C.zenCnc}`,
      `L1d 32 KB 8-way, L2 1 MB 8-way (inclusive of L1): APPROXIMATE (search excerpts of AMD pub 57647, ${C.zenSog}).`,
      `L3 32 MB per CCD, 16-way, victim of L2, about 50 cycles: APPROXIMATE (search excerpts of the Family 19h guide); "does not prefetch into L3" VERIFIED ${C.zenCnc}`,
      'DRAM 418 cycles: APPROXIMATE, 73.35 ns at 5.7 GHz boost.',
    ],
  },
  {
    id: 'apple-m1-p',
    label: 'Apple M1 performance core (Firestorm)',
    note: '128-byte lines; L2 shared by the 4-core P-cluster; 8 MB system-level cache as the last level.',
    config: {
      cores: 4,
      l1d: lvl('L1d', 128 * KiB, 128, 8, 3, 'core'),
      l2: lvl('L2', 12 * MiB, 128, 12, 18, 'shared', { inclusion: 'inclusive' }),
      l3: lvl('SLC', 8 * MiB, 128, 16, 58, 'shared', { inclusion: 'non-inclusive' }),
      dramLatency: 309,
      coherencePenalty: 20,
      prefetch: noPrefetch,
      seed: 1,
    },
    sources: [
      `L1d 128 KB, 3 cycles; L2 12 MB shared per P-cluster, 18 cycles; SLC 8 MB: VERIFIED ${C.m1}`,
      `128-byte line (hw.cachelinesize = 128): VERIFIED ${C.m1sysctl}`,
      `L1d 3-cycle pointer chase also reported at ${C.firestorm}`,
      'L1d 8-way, L2 12-way, SLC 16-way: APPROXIMATE, associativities are not published.',
      `SLC 58 cycles: APPROXIMATE, "18 cycles + 10-15 ns" at 3.2 GHz (${C.m1}).`,
      `DRAM 309 cycles: APPROXIMATE, "18 cycles + 91 ns" at 3.2 GHz (${C.m1}).`,
      'The SLC is modeled as an L3; the real one is a memory-side cache shared with the GPU and other blocks.',
    ],
  },
];

/** Model-wide parameter, not from any datasheet. */
export const COHERENCE_PENALTY_NOTE =
  'APPROXIMATE: the extra 20 cycles for a cache-to-cache transfer is a teaching value, not a measured one.';

export function presetById(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}

/** A deep copy of a preset's config, safe to edit. */
export function cloneConfig(cfg: HierarchyConfig): HierarchyConfig {
  return JSON.parse(JSON.stringify(cfg)) as HierarchyConfig;
}
