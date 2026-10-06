/**
 * Helpers shared by the Preparation group C topics (calculus: derivatives, curve sketching,
 * integration, differential equations). Each is a plain numerical method or the textbook
 * definition, so a reference solver or a Cambridge problem's `verify` can check an answer by a
 * second route: a derivative by a central difference quotient, an integral by Simpson's rule,
 * an expression by evaluating it at sample points. A topic that imports it pulls it into its
 * own chunk.
 */
import { evaluate, parseExpression } from '@learnhub/mastery';
import { times } from './poly';

/** p(x) for coefficients highest power first. */
export function polyAt(c: readonly number[], x: number): number {
  return c.reduce((acc, a) => acc * x + a, 0);
}

/** The derivative's coefficients, highest power first, by the power rule. */
export function polyDeriv(c: readonly number[]): number[] {
  const deg = c.length - 1;
  if (deg === 0) return [0];
  return c.slice(0, -1).map((a, i) => a * (deg - i));
}

/** f'(x) by the central difference quotient (f(x + h) - f(x - h))/(2h). */
export function numDeriv(f: (x: number) => number, x: number, h = 1e-5): number {
  return (f(x + h) - f(x - h)) / (2 * h);
}

/** The integral of f over [a, b] by Simpson's rule with n (even) strips. */
export function simpson(f: (x: number) => number, a: number, b: number, n = 2000): number {
  const h = (b - a) / n;
  let s = f(a) + f(b);
  for (let i = 1; i < n; i++) s += (i % 2 === 1 ? 4 : 2) * f(a + i * h);
  return (s * h) / 3;
}

/** True when a and b differ by more than a relative (or, near 0, absolute) tolerance. */
export function apart(a: number, b: number, tol = 1e-6): boolean {
  return !(Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b)));
}

/** An expression in the graders' language as a function of its variables. Throws when it does not parse. */
export function fn(text: string, variables: readonly string[] = ['x']): (...v: number[]) => number {
  const r = parseExpression(text, variables);
  if (!r.ok) throw new Error(`fn: cannot read "${text}": ${r.error}`);
  const e = r.value;
  return (...v: number[]) => evaluate(e, Object.fromEntries(variables.map((n, i) => [n, v[i] as number])));
}

/**
 * Null when the expression agrees with g at each sample point (single variable x), else a
 * message for the content checks.
 */
export function agreesAt(what: string, text: string, g: (x: number) => number, xs: readonly number[], tol = 1e-6): string | null {
  const f = fn(text);
  for (const x of xs) {
    if (apart(f(x), g(x), tol)) return `${what}: at x = ${x} the expression gives ${f(x)}, expected ${g(x)}`;
  }
  return null;
}

/** Null when |got - want| is within tolerance, else a message. */
export function close(what: string, got: number, want: number, tol = 1e-6): string | null {
  return apart(got, want, tol) ? `${what}: computed ${got}, expected ${want}` : null;
}

/** The first non-null message of a list of checks. */
export const firstError = (...checks: (string | null)[]): string | null => checks.find((c) => c !== null) ?? null;

/**
 * The number of distinct real roots of p(x) = k for a polynomial, found from the
 * stationary values: the real line splits at the roots of p' into monotone pieces, and each
 * piece meets the level k at most once. Exact for integer data whose stationary points are
 * integers (`turning` gives them).
 */
export function rootsOfLevel(c: readonly number[], turning: readonly number[], k: number): number {
  const xs = [...turning].sort((a, b) => a - b);
  const f = (x: number): number => polyAt(c, x) - k;
  // A sign that reads a value within rounding of 0 as 0, for irrational turning points.
  const sgn = (v: number): number => (Math.abs(v) < 1e-9 ? 0 : Math.sign(v));
  let count = 0;
  // Roots at the turning points themselves.
  for (const t of xs) if (sgn(f(t)) === 0) count++;
  // One root inside each monotone piece whose ends have opposite signs (ends at infinity by the leading sign).
  const lead = c[0] as number;
  const deg = c.length - 1;
  const atMinusInf = Math.sign(lead) * (deg % 2 === 0 ? 1 : -1);
  const atPlusInf = Math.sign(lead);
  const ends: number[] = [atMinusInf, ...xs.map((t) => sgn(f(t))), atPlusInf];
  for (let i = 0; i + 1 < ends.length; i++) {
    const a = ends[i] as number;
    const b = ends[i + 1] as number;
    if (a !== 0 && b !== 0 && a !== b) count++;
  }
  return count;
}

/** Distinct real roots of p(x) = k counted by scanning for sign changes and touching zeros, for checking `rootsOfLevel`. */
export function scanRoots(c: readonly number[], k: number, lo = -60, hi = 60, steps = 240_000): number {
  const f = (x: number): number => polyAt(c, x) - k;
  let count = 0;
  let prev = f(lo);
  for (let i = 1; i <= steps; i++) {
    const x = lo + ((hi - lo) * i) / steps;
    const v = f(x);
    if (Math.abs(v) < 1e-9) {
      count++;
      // Skip past this zero.
      while (i < steps && Math.abs(f(lo + ((hi - lo) * (i + 1)) / steps)) < 1e-9) i++;
      prev = f(lo + ((hi - lo) * i) / steps);
      continue;
    }
    if (prev !== 0 && Math.sign(v) !== Math.sign(prev) && Math.abs(prev) >= 1e-9) count++;
    prev = v;
  }
  return count;
}

/** (x - p)^n as coefficients, highest power first. */
export function powerOfLinear(p: number, n: number): number[] {
  let out = [1];
  for (let i = 0; i < n; i++) out = times(out, [1, -p]);
  return out;
}
