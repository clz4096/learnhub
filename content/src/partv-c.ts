/**
 * Helpers shared by the Part V group C topics (random variables on a countable space,
 * expectation, independence, covariance, conditional expectation, the inequalities, and
 * the bivariate normal). Kept out of math.ts so the four Part V branches merge cleanly, and
 * imported only by those topic modules, so the bundler puts it in their chunks.
 */
import type { Rng } from '@learnhub/mastery';
import { add, mul, q, str, sub, type Rational } from './math';

/** A finite distribution: values with exact probabilities that add to 1. */
export interface Dist {
  xs: readonly number[];
  ps: readonly Rational[];
}

/** Null when the probabilities are positive and add to 1, else what is wrong. */
export function distError(d: Dist): string | null {
  if (d.xs.length !== d.ps.length) return 'values and probabilities differ in length';
  if (d.ps.some((p) => p.num <= 0n)) return 'a probability is not positive';
  const total = d.ps.reduce((a, b) => add(a, b), q(0));
  return total.num === total.den ? null : `probabilities add to ${str(total)}`;
}

/** E(g(X)) for a finite distribution, exactly. */
export function expect(d: Dist, g: (x: number) => Rational = (x) => q(x)): Rational {
  return d.xs.reduce((acc, x, i) => add(acc, mul(g(x), d.ps[i] as Rational)), q(0));
}

/** Var(X) for a finite distribution, exactly, as E((X - mean)^2). */
export function variance(d: Dist): Rational {
  const m = expect(d);
  return expect(d, (x) => { const c = sub(q(x), m); return mul(c, c); });
}

/**
 * The distribution as a population of equally likely outcomes: each value repeated in
 * proportion to its probability. Solvers average over it, a second route to the same
 * numbers that does not reuse the weighted sums.
 */
export function population(d: Dist): number[] {
  const den = d.ps.reduce((l, p) => lcm(l, p.den), 1n);
  const out: number[] = [];
  d.xs.forEach((x, i) => {
    const p = d.ps[i] as Rational;
    const copies = Number((p.num * den) / p.den);
    for (let k = 0; k < copies; k++) out.push(x);
  });
  return out;
}

/** The mean of a list of rationals given as numbers, exactly. */
export function meanOf(xs: readonly Rational[]): Rational {
  return mul(xs.reduce((a, b) => add(a, b), q(0)), q(1, xs.length));
}

function gcdBig(a: bigint, b: bigint): bigint {
  let [x, y] = [a < 0n ? -a : a, b < 0n ? -b : b];
  while (y !== 0n) [x, y] = [y, x % y];
  return x;
}
export const lcm = (a: bigint, b: bigint): bigint => (a / gcdBig(a, b)) * b;

/** One draw from a finite distribution. */
export function draw(d: Dist, rng: Rng): number {
  let u = rng();
  for (let i = 0; i < d.xs.length; i++) {
    const p = d.ps[i] as Rational;
    u -= Number(p.num) / Number(p.den);
    if (u < 0) return d.xs[i] as number;
  }
  return d.xs[d.xs.length - 1] as number;
}

/** True with probability r. */
export const chance = (r: Rational, rng: Rng): boolean => rng() < Number(r.num) / Number(r.den);

/**
 * The fraction with denominator at most `maxDen` closest to x, by continued fractions.
 * Solvers that sum a series in floating point use it to name the exact answer; it is
 * exact whenever the true denominator is at most `maxDen` and the error is far below
 * 1/maxDen^2.
 */
export function nearestFraction(x: number, maxDen = 100_000): Rational {
  const sign = x < 0 ? -1 : 1;
  let y = Math.abs(x);
  let [h0, h1, k0, k1] = [0, 1, 1, 0];
  for (let i = 0; i < 64; i++) {
    const a = Math.floor(y);
    const [h2, k2] = [a * h1 + h0, a * k1 + k0];
    if (k2 > maxDen) break;
    [h0, h1, k0, k1] = [h1, h2, k1, k2];
    const frac = y - a;
    if (frac < 1e-12) break;
    y = 1 / frac;
  }
  return q(sign * h1, k1);
}

/** A rational power r^k, k >= 0. */
export function pow(r: Rational, k: number): Rational {
  let out = q(1);
  for (let i = 0; i < k; i++) out = mul(out, r);
  return out;
}

/** A standard normal draw (Box-Muller), for simulations of the normal topics. */
export function normal(rng: Rng): number {
  const u = 1 - rng();
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** How many of the responses differ from the right one, counted once each. */
export const distinctFrom = (right: string, xs: readonly string[]): number => new Set(xs.filter((x) => x !== right)).size;

/** The rational as a decimal-free string for an exact answer. */
export const s = (r: Rational): string => str(r);

/** Every permutation of 0, ..., n - 1, for brute-force checks on small n. */
export function permutations(n: number): number[][] {
  if (n === 0) return [[]];
  const out: number[][] = [];
  for (const p of permutations(n - 1)) for (let i = 0; i <= p.length; i++) out.push([...p.slice(0, i), n - 1, ...p.slice(i)]);
  return out;
}
