/**
 * Helpers shared by the Part V group A topics (expectation, variance, indicators,
 * first-step analysis, difference equations, random walks): exact rational powers and
 * sums, the mean and variance of a finite distribution, exact linear solves for
 * first-step equations, absorption probabilities and times of a walk on a line, and
 * brute-force enumeration of arrangements. Each is the plain definition or a textbook
 * algorithm, so a generator's reference solver can compute an answer independently of
 * the formula its worked solution uses. A topic that imports it pulls it into its own
 * chunk.
 */
import type { Rng } from '@learnhub/mastery';
import { add, div, mul, q, sub, toFloat, type Rational } from './math';

export const ZERO = q(0);
export const ONE = q(1);

/** r^k exactly, for an integer k >= 0. */
export function rpow(r: Rational, k: number): Rational {
  let out = ONE;
  for (let i = 0; i < k; i++) out = mul(out, r);
  return out;
}

/** The sum of a list of rationals. */
export const rsum = (xs: readonly Rational[]): Rational => xs.reduce((s, x) => add(s, x), ZERO);

/** A finite distribution: each value with its probability. */
export type Dist = readonly (readonly [Rational, Rational])[];

/** E(X) = Σ x P(X = x). */
export const mean = (d: Dist): Rational => rsum(d.map(([x, p]) => mul(x, p)));

/** E(X^2). */
export const secondMoment = (d: Dist): Rational => rsum(d.map(([x, p]) => mul(mul(x, x), p)));

/** Var(X) as E((X - μ)^2), the definition (not the shortcut E(X^2) - μ^2). */
export function variance(d: Dist): Rational {
  const m = mean(d);
  return rsum(d.map(([x, p]) => mul(mul(sub(x, m), sub(x, m)), p)));
}

/** Total probability of a distribution, for sanity checks. */
export const total = (d: Dist): Rational => rsum(d.map(([, p]) => p));

/**
 * Solves A x = b exactly by Gaussian elimination with rationals. A is square and
 * nonsingular (a content bug otherwise, so it throws).
 */
export function solveLinear(a: readonly (readonly Rational[])[], b: readonly Rational[]): Rational[] {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i] as Rational]);
  for (let c = 0; c < n; c++) {
    const piv = m.findIndex((row, r) => r >= c && (row[c] as Rational).num !== 0n);
    if (piv < 0) throw new Error('solveLinear: singular system');
    [m[c], m[piv]] = [m[piv] as Rational[], m[c] as Rational[]];
    const pr = m[c] as Rational[];
    const pv = pr[c] as Rational;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const row = m[r] as Rational[];
      const f = div(row[c] as Rational, pv);
      if (f.num === 0n) continue;
      for (let k = c; k <= n; k++) row[k] = sub(row[k] as Rational, mul(f, pr[k] as Rational));
    }
  }
  return m.map((row, i) => div(row[n] as Rational, row[i] as Rational));
}

/**
 * A walk on lo, lo + 1, ..., hi that steps up with probability p and down with 1 - p,
 * absorbed at both ends. Returns, for each interior start lo + 1 to hi - 1, the
 * probability of reaching hi before lo, from the first-step equations solved exactly.
 */
export function hitTop(lo: number, hi: number, p: Rational): Rational[] {
  const n = hi - lo - 1;
  const qq = sub(ONE, p);
  const a = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? ONE : j === i + 1 ? sub(ZERO, p) : j === i - 1 ? sub(ZERO, qq) : ZERO)));
  const b = Array.from({ length: n }, (_, i) => (i === n - 1 ? p : ZERO));
  return solveLinear(a, b);
}

/** As `hitTop`, the expected number of steps to absorption from each interior start. */
export function meanSteps(lo: number, hi: number, p: Rational): Rational[] {
  const n = hi - lo - 1;
  const qq = sub(ONE, p);
  const a = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? ONE : j === i + 1 ? sub(ZERO, p) : j === i - 1 ? sub(ZERO, qq) : ZERO)));
  return solveLinear(a, Array.from({ length: n }, () => ONE));
}

/** One run of the walk from `start` until it leaves (lo, hi); true when it ends at hi. */
export function walkHitsTop(start: number, lo: number, hi: number, p: Rational, rng: Rng): boolean {
  const pf = toFloat(p);
  let x = start;
  while (x > lo && x < hi) x += rng() < pf ? 1 : -1;
  return x >= hi;
}

/** Every set of k positions out of 0, ..., n - 1, as sorted arrays (lexicographic). */
export function positions(n: number, k: number): number[][] {
  const out: number[][] = [];
  const rec = (start: number, acc: number[]): void => {
    if (acc.length === k) { out.push([...acc]); return; }
    for (let i = start; i < n; i++) { acc.push(i); rec(i + 1, acc); acc.pop(); }
  };
  rec(0, []);
  return out;
}

/** Every permutation of 0, ..., n - 1. */
export function permutations(n: number): number[][] {
  if (n === 0) return [[]];
  const out: number[][] = [];
  for (const p of permutations(n - 1)) for (let i = 0; i <= p.length; i++) out.push([...p.slice(0, i), n - 1, ...p.slice(i)]);
  return out;
}

/** A uniformly random permutation of 0, ..., n - 1 (Fisher-Yates). */
export function shuffle(n: number, rng: Rng): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j] as number, a[i] as number];
  }
  return a;
}

/** The fraction of items in `xs` for which `pred` holds, as an exact rational. */
export function fraction<T>(xs: readonly T[], pred: (x: T) => boolean): Rational {
  return q(xs.filter(pred).length, xs.length);
}

/** The average of `f` over `xs`, exactly. */
export function average<T>(xs: readonly T[], f: (x: T) => Rational): Rational {
  return div(rsum(xs.map(f)), q(xs.length));
}

/** Every outcome of k throws of an m-sided die, faces 1 to m. */
export function throwsOf(m: number, k: number): number[][] {
  let out: number[][] = [[]];
  for (let i = 0; i < k; i++) out = out.flatMap((o) => Array.from({ length: m }, (_, f) => [...o, f + 1]));
  return out;
}

/** Whether two numbers differ by more than a relative tolerance, for numeric checks of closed forms. */
export function far(a: number, b: number, rel = 1e-9): boolean {
  return Math.abs(a - b) > rel * Math.max(1, Math.abs(a), Math.abs(b));
}

/**
 * One game of STEP 2 Statistics Q3 (2011 S2 Q12), point by point: Xavier wins the first
 * point with probability p, and later points go to the previous point's winner with
 * probability p. Two points in a row win the match; three points without that are a
 * drawn game. Returns the probabilities that Younis wins it, Xavier wins it, or it is drawn.
 */
export function threePointGame(p: Rational): { y: Rational; x: Rational; draw: Rational } {
  const out = { y: ZERO, x: ZERO, draw: ZERO };
  const go = (seq: readonly ('X' | 'Y')[], pr: Rational): void => {
    const n = seq.length;
    if (n >= 2 && seq[n - 1] === seq[n - 2]) {
      if (seq[n - 1] === 'Y') out.y = add(out.y, pr);
      else out.x = add(out.x, pr);
      return;
    }
    if (n === 3) { out.draw = add(out.draw, pr); return; }
    const xWins = n === 0 || seq[n - 1] === 'X' ? p : sub(ONE, p);
    go([...seq, 'X'], mul(pr, xWins));
    go([...seq, 'Y'], mul(pr, sub(ONE, xWins)));
  };
  go([], ONE);
  return out;
}

/**
 * The frog of STEP 3 Statistics Q1 (2007 S3 Q13): jumps of 1 m (probability 1 - q) or 2 m
 * (probability q) from n - 1/2 m away. The expected number of jumps to land in the pond,
 * by listing every sequence of jumps that first covers n metres.
 */
export function frogMean(n: number, qq: Rational): Rational {
  const pp = sub(ONE, qq);
  let out = ZERO;
  const go = (covered: number, jumps: number, pr: Rational): void => {
    if (covered >= n) { out = add(out, mul(q(jumps), pr)); return; }
    go(covered + 1, jumps + 1, mul(pr, pp));
    go(covered + 2, jumps + 1, mul(pr, qq));
  };
  go(0, 0, ONE);
  return out;
}

/** Text of a rational for the expression language, bracketed: (3/4) or (-2). */
export const rx = (r: Rational): string => (r.den === 1n ? `(${r.num})` : `(${r.num}/${r.den})`);
