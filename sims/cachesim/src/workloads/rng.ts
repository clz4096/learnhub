/**
 * mulberry32: a tiny seeded PRNG for workload generators (shuffles, random keys).
 * Kept separate from the engine's PRNG so workloads have no engine dependency.
 */
export class Rng {
  private s: number;
  constructor(seed: number) {
    this.s = seed >>> 0;
  }
  /** Uniform 32-bit unsigned integer. */
  u32(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  }
  /** Uniform integer in [0, n). */
  int(n: number): number {
    return Math.floor((this.u32() / 4294967296) * n);
  }
}

/** In-place Fisher-Yates shuffle. */
export function shuffle(a: Uint32Array, rng: Rng): void {
  for (let i = a.length - 1; i > 0; --i) {
    const j = rng.int(i + 1);
    const t = a[i]!;
    a[i] = a[j]!;
    a[j] = t;
  }
}

/** Identity permutation 0..n-1. */
export function iota(n: number): Uint32Array {
  const a = new Uint32Array(n);
  for (let i = 0; i < n; ++i) a[i] = i;
  return a;
}
