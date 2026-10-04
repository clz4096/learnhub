import { describe, it, expect } from 'vitest';
import { equalRational, formatRational, gradeExact, parseRational, rational, toNumber } from './rational';
import { gradeNumeric, parseNumber } from './numeric';
import { gradeChoice } from './choice';

const R = (s: string): string => {
  const r = parseRational(s);
  return r.ok ? formatRational(r.value) : `error: ${r.error}`;
};

describe('rational', () => {
  it('normalizes sign and lowest terms', () => {
    expect(rational(6n, 16n)).toEqual({ num: 3n, den: 8n });
    expect(rational(3n, -8n)).toEqual({ num: -3n, den: 8n });
    expect(rational(-6n, -16n)).toEqual({ num: 3n, den: 8n });
    expect(rational(0n, -5n)).toEqual({ num: 0n, den: 1n });
    expect(() => rational(1n, 0n)).toThrow(/zero denominator/);
    expect(toNumber(rational(3n, 8n))).toBe(0.375);
    expect(equalRational(rational(2n, 4n), rational(1n, 2n))).toBe(true);
  });

  const good: [string, string][] = [
    ['3/8', '3/8'], ['-3/8', '-3/8'], ['3/-8', '-3/8'], ['-3/-8', '3/8'], ['+3/8', '3/8'], ['6/16', '3/8'],
    [' 3 / 8 ', '3/8'], ['5', '5'], ['+5', '5'], ['-0', '0'], ['007', '7'], ['0', '0'], ['4/2', '2'],
    ['0.375', '3/8'], ['.5', '1/2'], ['-1.25', '-5/4'], ['0.10', '1/10'], ['2.000', '2'],
    ['\u22123/8', '-3/8'], ['\u2013 0.5', '-1/2'], ['3\u20448', '3/8'],
    ['123456789012345678901234567890/246913578024691357802469135780', '1/2'],
  ];
  for (const [input, want] of good) it(`parses "${input}" as ${want}`, () => expect(R(input)).toBe(want));

  const bad: [string, RegExp][] = [
    ['', /Enter an answer/], ['   ', /Enter an answer/], ['abc', /whole number, a fraction/], ['1/0', /denominator is zero/],
    ['-5/0', /denominator is zero/], ['3/8/2', /whole number/], ['1.2.3', /whole number/], ['1e3', /exponent/],
    ['3 1/2', /mixed number/], ['0.5/2', /whole number/], ['1/2.0', /whole number/], ['--3', /whole number/],
    ['3/', /whole number/], ['/3', /whole number/], ['5.', /whole number/], ['1,000', /whole number/],
    ['Infinity', /whole number/], ['NaN', /whole number/], ['0x10', /whole number/], ['9'.repeat(501), /too long/],
  ];
  for (const [input, re] of bad) it(`rejects "${input.slice(0, 20)}"`, () => expect(R(input)).toMatch(re));
});

describe('gradeExact', () => {
  it('accepts equal values in any exact form', () => {
    expect(gradeExact('3/8', '3/8')).toEqual({ correct: true, normalizedAnswer: '3/8' });
    expect(gradeExact('0.375', '3/8')).toEqual({ correct: true, normalizedAnswer: '3/8' });
    expect(gradeExact('-0.5', rational(-1n, 2n))).toEqual({ correct: true, normalizedAnswer: '-1/2' });
    expect(gradeExact('3/-8', '-0.375').correct).toBe(true);
  });

  it('accepts an unreduced fraction with a note, or rejects it on request', () => {
    expect(gradeExact('6/16', '3/8')).toEqual({ correct: true, feedback: 'Right. In lowest terms that is 3/8.', normalizedAnswer: '3/8' });
    const strict = gradeExact('6/16', '3/8', { requireLowestTerms: true });
    expect(strict.correct).toBe(false);
    expect(strict.feedback).toMatch(/lowest terms: 3\/8/);
    expect(gradeExact('3/8', '3/8', { requireLowestTerms: true }).correct).toBe(true);
  });

  it('a decimal for a non-terminating fraction is wrong, with a hint when it rounds right', () => {
    const r = gradeExact('0.333', '1/3');
    expect(r.correct).toBe(false);
    expect(r.feedback).toMatch(/no exact decimal form/);
    expect(gradeExact('0.3333333333333333', '1/3').feedback).toMatch(/no exact decimal/);
    expect(gradeExact('0.67', '2/3').feedback).toMatch(/no exact decimal/);
    // 0.34 is not 1/3 to two places, so no hint: the method is probably wrong.
    expect(gradeExact('0.34', '1/3')).toEqual({ correct: false, normalizedAnswer: '17/50' });
  });

  it('rejects wrong values and wrong signs', () => {
    expect(gradeExact('-3/8', '3/8').correct).toBe(false);
    expect(gradeExact('3/7', '3/8').correct).toBe(false);
    expect(gradeExact('0.376', '3/8').correct).toBe(false);
  });

  it('reports malformed input with a reason and keeps the raw text', () => {
    expect(gradeExact(' 3/0 ', '3/8')).toEqual({ correct: false, feedback: 'The denominator is zero.', normalizedAnswer: '3/0' });
    expect(gradeExact('three eighths', '3/8').correct).toBe(false);
  });

  it('a broken expected value is a problem error, not a throw', () => {
    expect(gradeExact('1', 'one').feedback).toMatch(/^Problem error/);
    expect(gradeExact('1', '1/0').feedback).toMatch(/^Problem error/);
    expect(gradeExact('1', { num: 2n, den: 4n }).feedback).toMatch(/^Problem error/);
    expect(gradeExact('1', { num: 1n, den: 0n }).feedback).toMatch(/^Problem error/);
  });
});

describe('gradeNumeric', () => {
  const e1 = Math.exp(-1);

  it('parses decimals, exponents, and fractions; rejects the rest', () => {
    expect(parseNumber('0.125')).toBe(0.125);
    expect(parseNumber('1.5e-3')).toBe(0.0015);
    expect(parseNumber('2E3')).toBe(2000);
    expect(parseNumber('3/8')).toBe(0.375);
    expect(parseNumber('\u22122.5')).toBe(-2.5);
    for (const s of ['', 'abc', 'Infinity', 'NaN', '1e999', '1,000', '0x10', '1/0', '1.2.3']) expect(parseNumber(s), s).toBeNull();
  });

  it('uses a relative tolerance of 1e-3 by default', () => {
    expect(gradeNumeric('0.3679', e1).correct).toBe(true);
    expect(gradeNumeric('0.368', e1).correct).toBe(true);
    expect(gradeNumeric('0.37', e1).correct).toBe(false);
    expect(gradeNumeric('0.37', e1, { relTol: 1e-2 }).correct).toBe(true);
    expect(gradeNumeric('0.3679', e1, { relTol: 1e-6 }).correct).toBe(false);
  });

  it('an option passed as undefined keeps its default (it used to make the tolerance NaN)', () => {
    expect(gradeNumeric('0.3679', e1, { relTol: undefined, absTol: undefined }).correct).toBe(true);
  });

  it('uses the absolute tolerance near zero', () => {
    expect(gradeNumeric('1e-10', 0).correct).toBe(true);
    expect(gradeNumeric('1e-6', 0).correct).toBe(false);
    expect(gradeNumeric('0.001', 0, { absTol: 0.01 }).correct).toBe(true);
  });

  it('handles sign, malformed input, and a broken expected value', () => {
    expect(gradeNumeric('-0.3679', e1).correct).toBe(false);
    expect(gradeNumeric('-2.5', -2.5)).toEqual({ correct: true, normalizedAnswer: '-2.5' });
    expect(gradeNumeric('about 0.37', e1)).toMatchObject({ correct: false, feedback: expect.stringMatching(/Enter a number/) });
    expect(gradeNumeric('1', Number.NaN).feedback).toMatch(/^Problem error/);
    expect(gradeNumeric('1', Infinity).feedback).toMatch(/^Problem error/);
  });
});

describe('gradeChoice', () => {
  const single = { options: ['a', 'b', 'c'], correct: 'b' };
  const multi = { options: ['a', 'b', 'c', 'd'], correct: ['a', 'c'] };

  it('single answer', () => {
    expect(gradeChoice('b', single)).toEqual({ correct: true, normalizedAnswer: 'b' });
    expect(gradeChoice(' b ', single).correct).toBe(true);
    expect(gradeChoice('a', single).correct).toBe(false);
    expect(gradeChoice(['b'], single).correct).toBe(true);
    expect(gradeChoice(['a', 'b'], single)).toMatchObject({ correct: false, feedback: 'Choose one option.' });
  });

  it('multiple answer needs exactly the right set, in any order', () => {
    expect(gradeChoice(['c', 'a'], multi)).toEqual({ correct: true, normalizedAnswer: 'a, c' });
    expect(gradeChoice(['a', 'a', 'c'], multi).correct).toBe(true);
    expect(gradeChoice(['a'], multi).correct).toBe(false);
    expect(gradeChoice(['a', 'c', 'd'], multi).correct).toBe(false);
    expect(gradeChoice([], multi)).toMatchObject({ correct: false, feedback: 'Choose an option.' });
  });

  it('malformed picks and broken specs', () => {
    expect(gradeChoice('z', single)).toMatchObject({ correct: false, feedback: '"z" is not one of the options.' });
    expect(gradeChoice('', single).correct).toBe(false);
    expect(gradeChoice('a', { options: ['a', 'a'], correct: 'a' }).feedback).toMatch(/^Problem error/);
    expect(gradeChoice('a', { options: ['a'], correct: 'q' }).feedback).toMatch(/^Problem error/);
    expect(gradeChoice('a', { options: ['a'], correct: [] }).feedback).toMatch(/^Problem error/);
  });
});
