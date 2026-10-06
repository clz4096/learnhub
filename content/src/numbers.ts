/**
 * Integer helpers for the number theory and induction topics: primes, factorisations,
 * remainders, gcds with Bezout coefficients, and powers modulo m. Each is the plain
 * definition or the textbook algorithm, so a generator's reference solver can use the
 * brute-force version and its worked solution the efficient one. Shared by several topic
 * modules; a topic that imports it pulls it into its own chunk.
 */

export function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
}

/** Primes up to n. */
export function primesTo(n: number): number[] {
  const out: number[] = [];
  for (let k = 2; k <= n; k++) if (isPrime(k)) out.push(k);
  return out;
}

/** The prime factorisation as [prime, exponent] pairs, smallest prime first. */
export function factorise(n: number): [number, number][] {
  const out: [number, number][] = [];
  let m = n;
  for (let p = 2; p * p <= m; p++) {
    let e = 0;
    while (m % p === 0) { m /= p; e++; }
    if (e > 0) out.push([p, e]);
  }
  if (m > 1) out.push([m, 1]);
  return out;
}

/** The remainder in 0..m-1, also for negative a (the notes' [a]_m). */
export const mod = (a: number, m: number): number => ((a % m) + m) % m;

/** Every positive divisor of n > 0, by trial division of every candidate. */
export const divisors = (n: number): number[] => Array.from({ length: n }, (_, i) => i + 1).filter((d) => n % d === 0);

/** gcd by Euclid's algorithm, for integers not both zero. */
export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) [x, y] = [y, x % y];
  return x;
}

/** The extended algorithm as in the CST notes (egcd): coefficients s, t with s a + t b = g, for positive a, b. */
export function egcd(a: number, b: number): { s: number; t: number; g: number } {
  let [s1, t1, r1] = [1, 0, a];
  let [s2, t2, r2] = [0, 1, b];
  for (;;) {
    const q = Math.floor(r1 / r2);
    const r = r1 - q * r2;
    if (r === 0) return { s: s2, t: t2, g: r2 };
    [s1, t1, r1, s2, t2, r2] = [s2, t2, r2, s1 - q * s2, t1 - q * t2, r];
  }
}

/** a^k mod m exactly, with BigInt, for k >= 0 and m >= 1. */
export function powMod(a: number, k: number, m: number): number {
  let base = BigInt(mod(a, m));
  let e = BigInt(k);
  const M = BigInt(m);
  let out = 1n % M;
  while (e > 0n) {
    if (e & 1n) out = (out * base) % M;
    base = (base * base) % M;
    e >>= 1n;
  }
  return Number(out);
}

/** a^k mod m by multiplying k times: the slow definition, for reference solvers. */
export function powModSlow(a: number, k: number, m: number): number {
  let out = 1 % m;
  for (let i = 0; i < k; i++) out = (out * mod(a, m)) % m;
  return out;
}

/** The inverse of a mod m by search, or null when there is none. */
export function inverseBySearch(a: number, m: number): number | null {
  for (let x = 1; x < m; x++) if (mod(a * x, m) === 1 % m) return x;
  return null;
}

/** Euler's phi by counting. */
export const phi = (m: number): number => Array.from({ length: m }, (_, i) => i).filter((k) => gcd(k, m) === 1).length;

/** C(n, k) as an exact BigInt; 0 outside 0 <= k <= n. */
export function chooseBig(n: number, k: number): bigint {
  if (k < 0 || k > n) return 0n;
  let v = 1n;
  for (let i = 1; i <= k; i++) v = (v * BigInt(n - k + i)) / BigInt(i);
  return v;
}

/** C(n, k) as a number; exact for the small values the lessons use. */
export const choose = (n: number, k: number): number => Number(chooseBig(n, k));

/** The number of prime factors counted with repetition. */
export const bigOmega = (n: number): number => factorise(n).reduce((a, [, e]) => a + e, 0);
