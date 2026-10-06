/**
 * Helpers for the Part V group D topics (Poisson, generating functions, branching, limit
 * theorems): Poisson and normal probabilities as floating point, samplers for the Monte
 * Carlo checks, and polynomials with exact rational coefficients for probability
 * generating functions. Each is the plain definition, so a reference solver can use one
 * method and a worked solution another. A topic that imports it pulls it into its own chunk.
 */
import type { Rng } from '@learnhub/mastery';
import { add, mul, q, sub, toFloat, type Rational } from './math';
import { texOfRational } from './rich';

/** ln k!, by adding logarithms. */
export function lnFact(k: number): number {
  let s = 0;
  for (let i = 2; i <= k; i++) s += Math.log(i);
  return s;
}

/** k! as a float; exact for the small k the lessons use. */
export function fact(k: number): number {
  let p = 1;
  for (let i = 2; i <= k; i++) p *= i;
  return p;
}

/** P(X = k) for X ~ Po(lambda), through logarithms so large k and lambda stay finite. */
export const poissonPmf = (lambda: number, k: number): number => (k < 0 ? 0 : Math.exp(-lambda + k * Math.log(lambda) - lnFact(k)));

/** P(X = k) for X ~ Po(lambda), by the recurrence p_k = p_(k-1) lambda / k from p_0 = e^(-lambda): a second method. */
export function poissonPmfRec(lambda: number, k: number): number {
  let p = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) p = (p * lambda) / i;
  return p;
}

/** P(X = k) for X ~ B(n, p), through logarithms. */
export const binomPmf = (n: number, k: number, p: number): number =>
  (k < 0 || k > n ? 0 : Math.exp(lnFact(n) - lnFact(k) - lnFact(n - k) + k * Math.log(p) + (n - k) * Math.log1p(-p)));

/** P(X = k) for X ~ B(n, p), by multiplying out C(n, k) p^k (1 - p)^(n - k) term by term: a second method. */
export function binomPmfProduct(n: number, k: number, p: number): number {
  let v = 1;
  for (let i = 1; i <= k; i++) v *= ((n - k + i) / i) * p;
  for (let i = 0; i < n - k; i++) v *= 1 - p;
  return v;
}

/** P(X <= k) for X ~ Po(lambda). */
export function poissonCdf(lambda: number, k: number): number {
  let s = 0;
  for (let j = 0; j <= k; j++) s += poissonPmf(lambda, j);
  return Math.min(1, s);
}

/** x to s significant figures, as a number. */
export const sig = (x: number, s: number): number => Number(x.toPrecision(s));
/** x to d decimal places, as a number. */
export const dp = (x: number, d: number): number => Number(x.toFixed(d));
/** Whether a and b differ by more than `rel` of b (and are both finite). */
export const farApart = (a: number, b: number, rel = 0.01): boolean => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) > rel * Math.abs(b);

/** A sample of Po(lambda), by inversion. */
export function samplePoisson(lambda: number, rng: Rng): number {
  const u = rng();
  let k = 0;
  let p = Math.exp(-lambda);
  let s = p;
  while (u > s && k < 10_000) {
    k++;
    p = (p * lambda) / k;
    s += p;
  }
  return k;
}

/** A sample of the distribution with P(k) = dist[k]. */
export function sampleFrom(dist: readonly Rational[], rng: Rng): number {
  const u = rng();
  let s = 0;
  for (let k = 0; k < dist.length; k++) {
    s += toFloat(dist[k] as Rational);
    if (u < s) return k;
  }
  return dist.length - 1;
}

/** The standard normal distribution function, from erf: its Maclaurin series near 0 and the erfc continued fraction in the tails. */
export function Phi(z: number): number {
  // erf by its Maclaurin series for |x| < 3 (converges fast there), and the continued fraction for erfc beyond.
  const x = Math.abs(z) / Math.SQRT2;
  let erf: number;
  if (x < 3) {
    let term = x;
    let sum = x;
    for (let n = 1; n < 200; n++) {
      term *= (-x * x) / n;
      const inc = term / (2 * n + 1);
      sum += inc;
      if (Math.abs(inc) < 1e-17) break;
    }
    erf = (2 / Math.sqrt(Math.PI)) * sum;
  } else {
    // erfc(x) = exp(-x^2)/sqrt(pi) * 1/(x + 1/2/(x + 1/(x + 3/2/(x + ...)))), evaluated from the tail.
    let f = x;
    for (let n = 60; n >= 1; n--) f = x + n / 2 / f;
    erf = 1 - Math.exp(-x * x) / Math.sqrt(Math.PI) / f;
  }
  return z >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf);
}

/** The standard normal distribution function by Simpson's rule on the density: a second method for reference solvers. */
export function PhiSimpson(z: number): number {
  const n = 4000;
  const a = 0;
  const b = Math.abs(z);
  const h = (b - a) / n;
  const f = (x: number): number => Math.exp((-x * x) / 2) / Math.sqrt(2 * Math.PI);
  let s = f(a) + f(b);
  for (let i = 1; i < n; i++) s += (i % 2 === 1 ? 4 : 2) * f(a + i * h);
  const half = (s * h) / 3;
  return z >= 0 ? 0.5 + half : 0.5 - half;
}

// ---------------------------------------------------------------- exact rationals

/** r^e for an integer e >= 0. */
export function powQ(r: Rational, e: number): Rational {
  let out = q(1);
  for (let i = 0; i < e; i++) out = mul(out, r);
  return out;
}

/** The mean of the distribution with P(k) = dist[k]. */
export const meanQ = (dist: readonly Rational[]): Rational => dist.reduce((s, p, k) => add(s, mul(q(k), p)), q(0));
/** The variance of the distribution with P(k) = dist[k]. */
export function varQ(dist: readonly Rational[]): Rational {
  const m = meanQ(dist);
  const second = dist.reduce((s, p, k) => add(s, mul(q(k * k), p)), q(0));
  return sub(second, mul(m, m));
}

// ---------------------------------------------------------------- polynomials (pgfs with finite support)

/** A polynomial with rational coefficients, constant term first: [a0, a1, a2] is a0 + a1 t + a2 t^2. */
export type Poly = readonly Rational[];

export function polyAdd(a: Poly, b: Poly): Rational[] {
  return Array.from({ length: Math.max(a.length, b.length) }, (_, i) => add(a[i] ?? q(0), b[i] ?? q(0)));
}

export function polyMul(a: Poly, b: Poly): Rational[] {
  const out = Array.from({ length: a.length + b.length - 1 }, () => q(0));
  a.forEach((x, i) => b.forEach((y, j) => { out[i + j] = add(out[i + j] as Rational, mul(x, y)); }));
  return out;
}

export function polyPow(a: Poly, n: number): Rational[] {
  let out: Rational[] = [q(1)];
  for (let i = 0; i < n; i++) out = polyMul(out, a);
  return out;
}

/** outer(inner(t)), by Horner's rule. */
export function polyCompose(outer: Poly, inner: Poly): Rational[] {
  let out: Rational[] = [outer[outer.length - 1] ?? q(0)];
  for (let i = outer.length - 2; i >= 0; i--) out = polyAdd(polyMul(out, inner), [outer[i] as Rational]);
  return out;
}

export const polyEval = (a: Poly, x: Rational): Rational => a.reduceRight((s, c) => add(mul(s, x), c), q(0));
export const polyDeriv = (a: Poly): Rational[] => a.slice(1).map((c, i) => mul(c, q(i + 1)));

/** The polynomial as LaTeX, constant term first: \frac{1}{6} + \frac{1}{3}t + \frac{1}{2}t^{2}. Zero terms are left out. */
export function polyTex(a: Poly, v = 't'): string {
  const parts: string[] = [];
  a.forEach((c, i) => {
    if (c.num === 0n) return;
    const power = i === 0 ? '' : i === 1 ? v : `${v}^{${i}}`;
    const coef = i > 0 && c.num === 1n && c.den === 1n ? '' : texOfRational(c);
    parts.push(`${coef}${power}`);
  });
  return parts.length === 0 ? '0' : parts.join(' + ');
}

/** The polynomial in the graders' expression language, in the variable v: "1/4 + 2/3*t + 1/12*t^2". */
export function polyText(a: Poly, v = 't'): string {
  const parts: string[] = [];
  a.forEach((c, i) => {
    if (c.num === 0n) return;
    const coef = c.den === 1n ? `${c.num}` : `${c.num}/${c.den}`;
    parts.push(i === 0 ? coef : `(${coef})*${v}${i === 1 ? '' : `^${i}`}`);
  });
  return parts.length === 0 ? '0' : parts.join(' + ');
}
