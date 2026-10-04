/**
 * Natural answer forms (design decision 19c): each grader reads the forms people type,
 * and none of them weakens a correctness check. An exact answer is still a value, so a
 * calculation is read but not accepted; a ratio is read only where a ratio is asked.
 */
import { describe, expect, it } from 'vitest';
import { formatExpression, parseExpression } from './expr';
import { gradeExpression } from './expression';
import { gradeNumeric } from './numeric';
import { formatRational, gradeExact, parseRational } from './rational';

describe('exact answers', () => {
  const same: string[] = ['3/8', '3 / 8', '0.375', '3÷8', '3 ÷ 8', '6/16', '−3/-8', '.375'];
  for (const s of same) {
    it(`"${s}" is 3/8`, () => {
      const r = parseRational(s);
      expect(r.ok && formatRational(r.value)).toBe('3/8');
      expect(gradeExact(s, '3/8').correct).toBe(true);
    });
  }

  it('a ratio is read only where a ratio is asked', () => {
    expect(gradeExact('3:8', '3/8').correct).toBe(false);
    expect(gradeExact('3:8', '3/8').feedback).toMatch(/as a fraction/);
    expect(gradeExact('3:8', '3/8', { ratio: true }).correct).toBe(true);
    expect(gradeExact('3 : 8', '3/8', { ratio: true }).correct).toBe(true);
    expect(gradeExact('6:16', '3/8', { ratio: true, requireLowestTerms: true }).correct).toBe(false);
    expect(gradeExact('8:3', '3/8', { ratio: true }).correct).toBe(false);
    expect(gradeExact('3:0', '3/8', { ratio: true }).feedback).toMatch(/zero/);
  });

  // "Work out 2^5" must not be answered by 2^5: these are read, then refused with a reason.
  const calculations = ['2^5', '2×3', '2*3', '2 x 3', 'sqrt(4)', '√4', '2²', 'pi', 'π', '1 + 1/2', '7!/5!'];
  for (const s of calculations.filter((x) => x !== '2 x 3')) {
    it(`"${s}" is a calculation, not accepted as an exact value`, () => {
      const r = gradeExact(s, '32');
      expect(r.correct).toBe(false);
      expect(r.feedback).toMatch(/Work it out to a single number/);
    });
  }

  it('keeps the old messages for forms that are not calculations', () => {
    expect(gradeExact('3/8/2', '3/16').feedback).toMatch(/whole number/);
    expect(gradeExact('3 1/2', '7/2').feedback).toMatch(/mixed number/);
    expect(gradeExact('1e3', '1000').feedback).toMatch(/exponent/);
  });
});

describe('numeric answers', () => {
  for (const s of ['0.375', '3/8', '3 / 8', '3÷8', '−0.375', '3.75e-1']) {
    it(`"${s}" reads as ${s.includes('−') ? '-' : ''}0.375`, () => {
      expect(gradeNumeric(s, s.includes('−') ? -0.375 : 0.375).correct).toBe(true);
    });
  }
  it('a calculation is not a number', () => {
    expect(gradeNumeric('sqrt(2)', Math.SQRT2).correct).toBe(false);
    expect(gradeNumeric('pi', Math.PI).correct).toBe(false);
  });
});

describe('expression answers', () => {
  const V = ['x', 'n', 'k'];
  const reads: [string, string][] = [
    ['2^5', '2^5'],
    ['2×3', '2*3'],
    ['2*3', '2*3'],
    ['2·x', '2*x'],
    ['x²', 'x^2'],
    ['x²³', 'x^23'],
    ['x⁻¹', 'x^-1'],
    ['sqrt(2)', 'sqrt(2)'],
    ['√2', 'sqrt(2)'],
    ['√x', 'sqrt(x)'],
    ['√(x + 1)', 'sqrt(x + 1)'],
    ['2√3', '2*sqrt(3)'],
    ['√2^2', 'sqrt(2)^2'],
    ['√n!', 'sqrt(n!)'],
    ['x√x', 'x*sqrt(x)'],
    ['π', 'pi'],
    ['pi', 'pi'],
    ['2πx', '2*pi*x'],
    ['πx^2', 'pi*x^2'],
    ['3÷8', '3/8'],
  ];
  for (const [input, want] of reads) {
    it(`reads "${input}" as ${want}`, () => {
      const r = parseExpression(input, V);
      expect(r.ok && formatExpression(r.value)).toBe(want);
    });
  }

  it('reads C(n, k) and nCk only where a binomial is asked', () => {
    const b = { binomial: true };
    const read = (s: string, o = {}): string => {
      const r = parseExpression(s, V, o);
      return r.ok ? formatExpression(r.value) : `error: ${r.error}`;
    };
    expect(read('C(n,k)', b)).toBe('choose(n, k)');
    expect(read('C (n, 2)', b)).toBe('choose(n, 2)');
    expect(read('nCk', b)).toBe('choose(n, k)');
    expect(read('n C 2', b)).toBe('choose(n, 2)');
    expect(read('10C3', b)).toBe('choose(10, 3)');
    expect(read('2nCk', b)).toBe('2*choose(n, k)');
    expect(read('C(n,k)')).toMatch(/^error: Unknown name "C"/);
    expect(read('nCk')).toMatch(/^error/);
    // A declared variable named C keeps its meaning.
    const r = parseExpression('C(n)', ['C', 'n'], b);
    expect(r.ok && formatExpression(r.value)).toBe('C*n');
  });

  it('grades the natural forms like the plain ones, and still rejects a wrong answer', () => {
    const o = { variables: ['n'], domains: { n: { kind: 'integer' as const, min: 0, max: 12 } } };
    expect(gradeExpression('n(n−1)/2', 'choose(n, 2)', o).correct).toBe(true);
    expect(gradeExpression('nC2', 'n(n-1)/2', { ...o, binomial: true }).correct).toBe(true);
    expect(gradeExpression('C(n,2)', 'n(n-1)/2', { ...o, binomial: true }).correct).toBe(true);
    expect(gradeExpression('nC3', 'n(n-1)/2', { ...o, binomial: true }).correct).toBe(false);
    expect(gradeExpression('√(n²)', 'n', o).correct).toBe(true);
    expect(gradeExpression('2πn', '2 pi n', o).correct).toBe(true);
    expect(gradeExpression('πn', '2 pi n', o).correct).toBe(false);
  });

  it('a lone root sign or an empty bracket is an error with a reason, not a crash', () => {
    for (const s of ['√', '√()', '2√', '√√']) {
      const r = parseExpression(s, V);
      expect(r.ok, s).toBe(false);
    }
    const nested = parseExpression('√'.repeat(150) + '2', V);
    expect(nested.ok).toBe(false);
  });
});
