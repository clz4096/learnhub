import { describe, expect, it } from 'vitest';
import { hintFor, inputModeFor, insertKey, keypadFor, type Key, type TextSpec } from '@/model/keypad';

const EXACT: TextSpec = { kind: 'exact', expected: '3/8' };
const RATIO: TextSpec = { kind: 'exact', expected: '3/8', ratio: true };
const NUMERIC: TextSpec = { kind: 'numeric', expected: 0.5 };
const EXPR: TextSpec = { kind: 'expression', expected: 'x^2', variables: ['x'] };
const BINOM: TextSpec = { kind: 'expression', expected: 'choose(n, 2)', variables: ['n'], binomial: true };
const names = (keys: Key[]): string[] => keys.map((k) => k.name);
const key = (spec: TextSpec, name: string): Key => {
  const k = keypadFor(spec, 'pre.fractions').find((x) => x.name === name);
  if (k === undefined) throw new Error(name);
  return k;
};

describe('keypadFor', () => {
  it('numbers get the signs a phone number pad lacks; a ratio colon only where a ratio is asked', () => {
    expect(names(keypadFor(EXACT, 'pre.fractions'))).toEqual(['fraction bar', 'minus', 'decimal point']);
    expect(names(keypadFor(NUMERIC, 'pre.fractions'))).toEqual(['fraction bar', 'minus', 'decimal point']);
    expect(names(keypadFor(RATIO, 'pre.fractions'))).toContain('ratio colon');
  });

  it('expressions get powers, roots, pi, times, divide, and brackets; binomials only where asked', () => {
    const keys = names(keypadFor(EXPR, 'pre.algebraic-manipulation'));
    for (const n of ['power', 'squared', 'fraction bar', 'times', 'divide', 'square root', 'pi', 'open bracket', 'close bracket']) expect(keys).toContain(n);
    expect(keys).not.toContain('n choose k');
    expect(names(keypadFor(BINOM, 'comb.factorial'))).toContain('n choose k');
  });

  it('set and logic keys appear for expression answers in those topics only', () => {
    expect(names(keypadFor(EXPR, 'sets.comprehension'))).toContain('union');
    expect(names(keypadFor(EXPR, 'logic.connectives'))).toContain('and');
    expect(names(keypadFor(EXACT, 'pre.set-notation'))).not.toContain('union');
    expect(names(keypadFor(EXPR, 'pre.indices'))).not.toContain('union');
  });

  it('every key has a label and a spoken name, and names are unique per keypad', () => {
    for (const spec of [EXACT, RATIO, NUMERIC, EXPR, BINOM]) {
      const keys = keypadFor(spec, 'sets.comprehension');
      expect(new Set(names(keys)).size).toBe(keys.length);
      for (const k of keys) expect(k.label.length * k.name.length).toBeGreaterThan(0);
    }
  });
});

describe('insertKey', () => {
  it('inserts at the cursor and moves the cursor past the insertion', () => {
    expect(insertKey('38', 1, 1, key(EXACT, 'fraction bar'))).toEqual({ value: '3/8', caret: 2 });
    expect(insertKey('', 0, 0, key(EXACT, 'minus'))).toEqual({ value: '-', caret: 1 });
    expect(insertKey('x', 1, 1, key(EXPR, 'squared'))).toEqual({ value: 'x^2', caret: 3 });
  });

  it('replaces a selection', () => {
    expect(insertKey('3*8', 1, 2, key(EXPR, 'divide'))).toEqual({ value: '3÷8', caret: 2 });
  });

  it('a root puts the cursor inside its brackets, or wraps the selection', () => {
    expect(insertKey('2', 1, 1, key(EXPR, 'square root'))).toEqual({ value: '2√()', caret: 3 });
    expect(insertKey('x+1', 0, 3, key(EXPR, 'square root'))).toEqual({ value: '√(x+1)', caret: 6 });
    expect(insertKey('', 0, 0, key(BINOM, 'n choose k'))).toEqual({ value: 'C(, )', caret: 2 });
  });

  it('clamps a cursor outside the text', () => {
    expect(insertKey('3', 9, 9, key(EXACT, 'fraction bar'))).toEqual({ value: '3/', caret: 2 });
    expect(insertKey('38', 2, 1, key(EXACT, 'fraction bar'))).toEqual({ value: '38/', caret: 3 });
  });
});

describe('input mode and hint', () => {
  it('numbers ask for the number pad, expressions for letters', () => {
    expect(inputModeFor(EXACT)).toBe('decimal');
    expect(inputModeFor(NUMERIC)).toBe('decimal');
    expect(inputModeFor(EXPR)).toBe('text');
  });

  it('the hint names the accepted forms briefly, with no dashes', () => {
    expect(hintFor(EXACT)).toMatch(/3\/8/);
    expect(hintFor(RATIO)).toMatch(/3:8/);
    expect(hintFor(EXACT)).not.toMatch(/3:8/);
    expect(hintFor(BINOM)).toMatch(/C\(n, k\) or nCk/);
    expect(hintFor({ kind: 'expression', expected: 'n', variables: ['n'] })).toMatch(/2n is 2 times n/);
    for (const s of [EXACT, RATIO, NUMERIC, EXPR, BINOM]) {
      expect(hintFor(s)).toMatch(/Enter checks it/);
      expect(/[–—]/.test(hintFor(s))).toBe(false);
      expect(hintFor(s).split(/\s+/).length).toBeLessThanOrEqual(40);
    }
  });
});
