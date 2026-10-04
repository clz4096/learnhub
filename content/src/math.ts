/**
 * Small exact helpers for content: rationals as BigInt fractions (the graders' type), and
 * the integer functions lessons and generators share. Exact, so a lesson's numbers and a
 * grader's expected answer can never differ by rounding.
 */
import { formatRational, rational, type Rational, type Rng } from '@learnhub/mastery';

export type { Rational };

/** n/d in lowest terms. Throws on d = 0, a content bug. */
export function q(n: number | bigint, d: number | bigint = 1): Rational {
  return rational(BigInt(n), BigInt(d));
}

export const add = (a: Rational, b: Rational): Rational => rational(a.num * b.den + b.num * a.den, a.den * b.den);
export const sub = (a: Rational, b: Rational): Rational => rational(a.num * b.den - b.num * a.den, a.den * b.den);
export const mul = (a: Rational, b: Rational): Rational => rational(a.num * b.num, a.den * b.den);
export const div = (a: Rational, b: Rational): Rational => rational(a.num * b.den, a.den * b.num);
export const eq = (a: Rational, b: Rational): boolean => a.num === b.num && a.den === b.den;
export const toFloat = (a: Rational): number => Number(a.num) / Number(a.den);
export const str = (a: Rational): string => formatRational(a);

export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) [x, y] = [y, x % y];
  return x;
}

export function factorial(n: number): number {
  let p = 1;
  for (let i = 2; i <= n; i++) p *= i;
  return p;
}

/** Integer in [lo, hi], both inclusive. */
export function int(rng: Rng, lo: number, hi: number): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

/** A uniformly random element. */
export function pick<T>(rng: Rng, xs: readonly T[]): T {
  return xs[Math.floor(rng() * xs.length)] as T;
}

/** k distinct elements of xs in random order (partial Fisher-Yates). */
export function sample<T>(rng: Rng, xs: readonly T[], k: number): T[] {
  const a = [...xs];
  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(rng() * (a.length - i));
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a.slice(0, k);
}

/** 1, 2, ..., n. */
export const upTo = (n: number): number[] => Array.from({ length: n }, (_, i) => i + 1);
