/**
 * Shared helpers for the Part V continuous random variable topics (group B): numerical
 * integration, root finding, the standard normal distribution function by two independent
 * methods, samplers for simulations, and rational powers. Pulled into those topic chunks
 * only.
 *
 * Every irrational answer in these topics is computed twice: once from the closed form the
 * lesson derives, and once by numerical integration or a series here, so the reference
 * solver never repeats the problem's own formula.
 */
import type { Rng } from '@learnhub/mastery';
import { mul, q, type Rational } from './math';
import { computedTex, type Span } from './rich';

/** Composite Simpson's rule on [a, b] with n (even) panels. */
export function simpson(f: (x: number) => number, a: number, b: number, n = 2000): number {
  const m = n % 2 === 0 ? n : n + 1;
  const h = (b - a) / m;
  let s = f(a) + f(b);
  for (let i = 1; i < m; i++) s += (i % 2 === 1 ? 4 : 2) * f(a + i * h);
  return (s * h) / 3;
}

/** The integral of f over [a, ∞), by the substitution x = a + scale t/(1 - t) on [0, 1). */
export function integrateToInfinity(f: (x: number) => number, a: number, n = 4000, scale = 1): number {
  const g = (t0: number): number => {
    // The end point t = 1 is x = ∞; a heavy tail gives the substituted integrand a nonzero limit there.
    const t = Math.min(t0, 1 - 1e-9);
    const x = a + (scale * t) / (1 - t);
    const v = (scale * f(x)) / ((1 - t) * (1 - t));
    return Number.isFinite(v) ? v : 0;
  };
  return simpson(g, 0, 1, n);
}

/** A root of an increasing or decreasing f on [lo, hi] where f changes sign, by bisection. */
export function bisect(f: (x: number) => number, lo: number, hi: number, iterations = 200): number {
  let [a, b] = [lo, hi];
  const fa = f(a);
  for (let i = 0; i < iterations; i++) {
    const m = (a + b) / 2;
    const fm = f(m);
    if (fm === 0) return m;
    if ((fm < 0) === (fa < 0)) a = m;
    else b = m;
  }
  return (a + b) / 2;
}

/** The standard normal density. */
export const phi = (z: number): number => Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);

/** Φ(z) by Simpson's rule on the density from 0. */
export function Phi(z: number): number {
  const half = simpson(phi, 0, Math.abs(z), 4000);
  return z >= 0 ? 0.5 + half : 0.5 - half;
}

/**
 * Φ(z) by Marsaglia's series, Φ(z) = 1/2 + φ(z)(z + z^3/3 + z^5/(3·5) + ...): an
 * independent check on `Phi`, accurate to double precision for |z| < 8.
 */
export function PhiSeries(z: number): number {
  let term = z;
  let sum = z;
  for (let k = 1; k < 500 && Math.abs(term) > 1e-17 * Math.abs(sum); k++) {
    term *= (z * z) / (2 * k + 1);
    sum += term;
  }
  return 0.5 + phi(z) * sum;
}

/** The z with Φ(z) = p, by Newton's method on `Phi` (Φ' = φ), from a start inside the central range. */
export function PhiInverse(p: number): number {
  let z = 0;
  for (let i = 0; i < 12; i++) {
    const step = (Phi(z) - p) / phi(z);
    z -= Math.max(-1, Math.min(1, step));
    if (Math.abs(step) < 1e-13) break;
  }
  return z;
}

/** One standard normal sample (Box-Muller). */
export function normalSample(rng: Rng): number {
  const u = 1 - rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

/** One Exp(rate) sample, by inverting the distribution function. */
export const expSample = (rng: Rng, rate: number): number => -Math.log(1 - rng()) / rate;

/** x rounded to d decimal places, as a number. */
export const round = (x: number, d: number): number => Number(x.toFixed(d));

/** r^e for a whole number e at least 0, exactly. */
export function powQ(r: Rational, e: number): Rational {
  let out = q(1);
  for (let i = 0; i < e; i++) out = mul(out, r);
  return out;
}

/** Null when |got - want| is within tol, else a message for `verify`. */
export function near(what: string, got: number, want: number, tol: number): string | null {
  return Math.abs(got - want) <= tol ? null : `${what}: computed ${got}, expected ${want} (tolerance ${tol})`;
}

/** base^n as LaTeX, written as base for n = 1 and as 1 for n = 0, for computed exponents. */
export function pw(base: string, n: number): Span {
  return computedTex(n === 0 ? String(n + 1) : n === 1 ? base : `${base}^{${n}}`);
}

/** The n-th root of a LaTeX expression: a square root for n = 2. */
export function rootTex(n: number, inner: Span): Span {
  return computedTex(n === 2 ? `\\sqrt{${inner.text}}` : `\\sqrt[${n}]{${inner.text}}`);
}
