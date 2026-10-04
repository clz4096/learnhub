/**
 * Seeded randomness. The engine never calls Math.random, so every placement, grade, and
 * simulation run replays exactly from its seed.
 */

/** Uniform in [0, 1). */
export type Rng = () => number;

/**
 * mulberry32: a 32-bit state generator, small and fast, with good enough statistics for
 * sampling test points and simulated learners. Not for anything security related.
 */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer in [lo, hi], both inclusive. */
export function randInt(rng: Rng, lo: number, hi: number): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

/** Real in [lo, hi). */
export function randReal(rng: Rng, lo: number, hi: number): number {
  return lo + rng() * (hi - lo);
}

export function bernoulli(rng: Rng, p: number): boolean {
  return rng() < p;
}
