import { describe, expect, it } from 'vitest';
import { isProblemError } from './types';
import { formatRational, type Rational } from './rational';
import { formatWitness, gradeWitness, parseWitness, type WitnessSpec } from './witness';

const int = (r: Rational): number => Number(r.num) / Number(r.den);
const isPrime = (n: number): boolean => {
  if (!Number.isInteger(n) || n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
};

/** CST supervision 1.1.1: n > 2 not prime, yet 2n + 13 prime. */
const counterexample: WitnessSpec = {
  count: 1,
  names: ['n'],
  check: ([r]) => {
    const n = int(r as Rational);
    if (!Number.isInteger(n)) return 'n must be a whole number.';
    if (n <= 2) return `n = ${n} is not greater than 2.`;
    if (isPrime(n)) return `${n} is prime, so it is not a counterexample.`;
    return isPrime(2 * n + 13) ? null : `2n + 13 = ${2 * n + 13} is not prime.`;
  },
};

/** Supervision 3.1.4: x, y with 30x + 22y = gcd(30, 22) = 2. */
const bezout: WitnessSpec = {
  count: 2,
  names: ['x', 'y'],
  check: ([x, y]) => {
    const v = 30 * int(x as Rational) + 22 * int(y as Rational);
    return v === 2 ? null : `30x + 22y is ${v}, not 2.`;
  },
};

/** STEP Assignment 7 Q4(ii)(c): four weights, two pans, every whole number 1 to 40. */
const weights: WitnessSpec = {
  count: { min: 1, max: 6 },
  check: (ws) => {
    const w = ws.map(int);
    if (w.length !== 4) return 'Use four weights.';
    const sums = new Set<number>([0]);
    for (const x of w) for (const s of [...sums]) { sums.add(s + x); sums.add(s - x); }
    for (let k = 1; k <= 40; k++) if (!sums.has(k)) return `${k} ounces cannot be weighed.`;
    return null;
  },
};

describe('witness answers', () => {
  it('accepts any valid witness, not only one expected value', () => {
    for (const n of ['8', 'n = 8', '9', '15', 'n=20']) expect(gradeWitness(n, counterexample).correct, n).toBe(true);
    // 8, 9, 15, 20 all work: 29, 31, 43, 53 are prime.
  });

  it('rejects a non-witness with the reason from the check', () => {
    const r = gradeWitness('7', counterexample);
    expect(r.correct).toBe(false);
    expect(r.feedback).toMatch(/7 is prime/);
    expect(gradeWitness('10', counterexample).feedback).toMatch(/33 is not prime/);
    expect(gradeWitness('2', counterexample).feedback).toMatch(/not greater than 2/);
  });

  it('reads values by name in any order, or by position, with brackets', () => {
    for (const s of ['-8, 11', '(-8, 11)', 'x = -8, y = 11', 'y = 11, x = -8', 'x=−8; y=11', '3, -4', '(14, -19)']) {
      expect(gradeWitness(s, bezout).correct, s).toBe(true);
    }
    expect(gradeWitness('x = 1, y = 1', bezout).feedback).toMatch(/52, not 2/);
  });

  it('says what to fix when the answer cannot be read, without marking it', () => {
    expect(parseWitness('x = 1', bezout)).toEqual({ ok: false, error: 'Give y too.' });
    expect(parseWitness('x = 1, 2', bezout).ok).toBe(false);
    expect(parseWitness('z = 1, y = 2', bezout)).toEqual({ ok: false, error: 'z is not one of x, y.' });
    expect(parseWitness('x = 1, x = 2', bezout)).toEqual({ ok: false, error: 'x is given twice.' });
    expect(parseWitness('1', bezout)).toEqual({ ok: false, error: 'Give 2 values, separated by commas.' });
    expect(parseWitness('', bezout).ok).toBe(false);
    expect(parseWitness('2^3', counterexample).ok).toBe(false);
    expect(parseWitness('x'.repeat(600), bezout).ok).toBe(false);
  });

  it('reads sets of values and checks them as a whole', () => {
    expect(gradeWitness('{1, 3, 9, 27}', weights).correct).toBe(true);
    expect(gradeWitness('27, 9, 3, 1', weights).correct).toBe(true);
    expect(gradeWitness('1, 2, 4, 8', weights).feedback).toMatch(/16 ounces cannot be weighed/);
    expect(gradeWitness('1, 3, 9', weights).feedback).toBe('Use four weights.');
  });

  it('reads fractions and decimals exactly', () => {
    const half: WitnessSpec = { count: 1, check: ([x]) => (x !== undefined && formatRational(x) === '1/2' ? null : 'not a half') };
    for (const s of ['1/2', '0.5', '2/4', '.5']) expect(gradeWitness(s, half).correct, s).toBe(true);
  });

  it('a check that throws is a broken problem, not the learner\'s miss', () => {
    const broken: WitnessSpec = { count: 1, check: () => { throw new Error('boom'); } };
    expect(isProblemError(gradeWitness('1', broken))).toBe(true);
  });

  it('normalizes the answer for display', () => {
    expect(gradeWitness('y = 11, x = -8', bezout).normalizedAnswer).toBe('x = -8, y = 11');
    expect(formatWitness([{ num: 3n, den: 1n }, { num: -1n, den: 2n }])).toBe('3, -1/2');
  });
});
