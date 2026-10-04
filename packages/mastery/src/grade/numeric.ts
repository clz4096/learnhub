/**
 * Numeric answers within a tolerance, for values with no exact form (a normal tail
 * probability, a sample statistic).
 */
import { withDefaults } from '../options';
import { parseRational, toNumber } from './rational';
import { MAX_ANSWER_LENGTH, normalizeSymbols, type GradeResult } from './types';

const NUM_RE = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;

/** A decimal, scientific ("1.5e-3"), or fraction ("3/8") as a finite number, or null. */
export function parseNumber(input: string): number | null {
  if (input.length > MAX_ANSWER_LENGTH) return null;
  const s = normalizeSymbols(input);
  if (NUM_RE.test(s)) {
    const x = Number(s);
    return Number.isFinite(x) ? x : null;
  }
  const r = parseRational(s);
  if (!r.ok) return null;
  const x = toNumber(r.value);
  return Number.isFinite(x) ? x : null;
}

export interface NumericOptions {
  /** Relative tolerance: |answer - expected| <= relTol * |expected| passes. */
  relTol?: number;
  /** Absolute tolerance, for expected values at or near zero, where relative tolerance vanishes. */
  absTol?: number;
}

/**
 * About three significant figures, which is what a learner reports from a calculator by
 * default. Problems that want more precision pass a smaller relTol.
 */
export const DEFAULT_NUMERIC: Readonly<Required<NumericOptions>> = { relTol: 1e-3, absTol: 1e-9 };

/** Right when |answer - expected| <= max(absTol, relTol * |expected|). */
export function gradeNumeric(answer: string, expected: number, options: NumericOptions = {}): GradeResult {
  const { relTol, absTol } = withDefaults(DEFAULT_NUMERIC, options);
  if (!Number.isFinite(expected)) {
    return { correct: false, feedback: 'Problem error, not your answer: the expected value is not a finite number.', normalizedAnswer: answer.trim() };
  }
  const x = parseNumber(answer);
  if (x === null) {
    return { correct: false, feedback: 'Enter a number, for example 0.125, 1.5e-3, or 3/8.', normalizedAnswer: answer.trim() };
  }
  const tol = Math.max(absTol, relTol * Math.abs(expected));
  return { correct: Math.abs(x - expected) <= tol, normalizedAnswer: String(x) };
}
