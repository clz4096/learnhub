/**
 * Exact rational answers, as BigInt fractions in lowest terms.
 *
 * Probabilities are answered as fractions, and a float cannot tell 1/3 from 0.3333333333.
 * A decimal answer is read exactly (0.375 is 375/1000 = 3/8), so it is right only when it
 * equals the expected value exactly: 0.375 for 3/8 is right, 0.333 for 1/3 is not.
 */
import { MAX_ANSWER_LENGTH, normalizeSymbols, problemError, type GradeResult } from './types';

/** Denominator positive, gcd(num, den) = 1. */
export interface Rational {
  readonly num: bigint;
  readonly den: bigint;
}

function abs(x: bigint): bigint {
  return x < 0n ? -x : x;
}

function gcd(a: bigint, b: bigint): bigint {
  let x = abs(a);
  let y = abs(b);
  while (y !== 0n) [x, y] = [y, x % y];
  return x;
}

/** Normalizes sign and lowest terms. Throws on a zero denominator: that is a caller bug, not input. */
export function rational(num: bigint, den: bigint = 1n): Rational {
  if (den === 0n) throw new Error('rational: zero denominator');
  const s = den < 0n ? -1n : 1n;
  const g = gcd(num, den) || 1n;
  return { num: (s * num) / g, den: (s * den) / g };
}

export function equalRational(a: Rational, b: Rational): boolean {
  return a.num === b.num && a.den === b.den;
}

export function formatRational(r: Rational): string {
  return r.den === 1n ? `${r.num}` : `${r.num}/${r.den}`;
}

export function toNumber(r: Rational): number {
  return Number(r.num) / Number(r.den);
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

const INT_RE = /^[+-]?\d+$/;
const DEC_RE = /^([+-]?)(\d*)\.(\d+)$/;
const FRAC_RE = /^([+-]?\d+)\s*\/\s*([+-]?\d+)$/;

/** ASCII signs, trimmed, and no space after a leading sign ("- 0.5" from a phone keyboard is not ambiguous). */
function clean(s: string): string {
  return normalizeSymbols(s).replace(/^([+-])\s+/, '$1');
}

/**
 * Reads an integer ("-3"), a fraction ("3/8", "-6/16", "3/-8"), or a terminating decimal
 * ("0.375", ".5", "-1.25"). Unicode minus signs are accepted. Anything else, including
 * exponents, mixed numbers, and a zero denominator, is an error with a reason.
 */
export function parseRational(input: string): ParseResult<Rational> {
  if (input.length > MAX_ANSWER_LENGTH) return { ok: false, error: 'That answer is too long.' };
  const s = clean(input);
  if (s === '') return { ok: false, error: 'Enter an answer.' };
  if (INT_RE.test(s)) return { ok: true, value: rational(BigInt(s)) };
  const d = DEC_RE.exec(s);
  if (d !== null) {
    const [, sign, whole, frac] = d as unknown as [string, string, string, string];
    const num = BigInt(`${sign}${whole === '' ? '0' : whole}${frac}`);
    return { ok: true, value: rational(num, 10n ** BigInt(frac.length)) };
  }
  const f = FRAC_RE.exec(s);
  if (f !== null) {
    const den = BigInt(f[2] as string);
    if (den === 0n) return { ok: false, error: 'The denominator is zero.' };
    return { ok: true, value: rational(BigInt(f[1] as string), den) };
  }
  if (/\d\s+\d+\s*\/\s*\d/.test(s)) return { ok: false, error: 'Write a mixed number as one fraction, for example 7/2 rather than 3 1/2.' };
  if (/e/i.test(s) && /\d/.test(s)) return { ok: false, error: 'Write the number without an exponent, as a fraction or decimal.' };
  return { ok: false, error: 'Enter a whole number, a fraction like 3/8, or an exact decimal like 0.375.' };
}

/** Whether 1/den has a terminating decimal: den has no prime factor but 2 and 5. */
function terminates(den: bigint): boolean {
  let d = den;
  while (d % 2n === 0n) d /= 2n;
  while (d % 5n === 0n) d /= 5n;
  return d === 1n;
}

export interface ExactOptions {
  /** Count 6/16 for 3/8 as wrong rather than as right with a note. */
  requireLowestTerms?: boolean;
}

/**
 * Grades an exact answer against `expected` (a Rational or a string in the same syntax).
 * Equal values are right in any form; a fraction not in lowest terms gets a note, or is
 * wrong under `requireLowestTerms`.
 */
export function gradeExact(answer: string, expected: Rational | string, options: ExactOptions = {}): GradeResult {
  let want: Rational;
  if (typeof expected === 'string') {
    const e = parseRational(expected);
    if (!e.ok) return problemError(`expected answer "${expected}" is not an exact number`, answer);
    want = e.value;
  } else {
    if (expected.den <= 0n || gcd(expected.num, expected.den) !== 1n) return problemError('expected answer is not in lowest terms', answer);
    want = expected;
  }

  const a = parseRational(answer);
  if (!a.ok) return { correct: false, feedback: a.error, normalizedAnswer: answer.trim() };
  const got = a.value;
  const normalizedAnswer = formatRational(got);

  if (equalRational(got, want)) {
    const f = FRAC_RE.exec(clean(answer));
    const unreduced = f !== null && abs(BigInt(f[2] as string)) !== got.den;
    if (unreduced && options.requireLowestTerms) {
      return { correct: false, feedback: `Right value, but give it in lowest terms: ${normalizedAnswer}.`, normalizedAnswer };
    }
    return unreduced
      ? { correct: true, feedback: `Right. In lowest terms that is ${normalizedAnswer}.`, normalizedAnswer }
      : { correct: true, normalizedAnswer };
  }

  // A decimal that rounds to the answer, when the answer has no finite decimal: the method was right.
  const dec = DEC_RE.exec(clean(answer));
  if (dec !== null && !terminates(want.den)) {
    const places = (dec[3] as string).length;
    // |got - want| <= half a unit in the last place, in exact arithmetic.
    const diff = rational(got.num * want.den - want.num * got.den, got.den * want.den);
    if (2n * abs(diff.num) * 10n ** BigInt(places) <= diff.den) {
      return { correct: false, feedback: 'Close, but this answer has no exact decimal form. Give it as a fraction.', normalizedAnswer };
    }
  }
  return { correct: false, normalizedAnswer };
}
