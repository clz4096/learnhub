import { describe, it, expect } from 'vitest';
import { withDefaults } from './options';

describe('withDefaults', () => {
  const D = { a: 1, b: 'x', c: true };

  it('overrides only keys that are set', () => {
    expect(withDefaults(D, { a: 2 })).toEqual({ a: 2, b: 'x', c: true });
    expect(withDefaults(D, { a: undefined, c: false })).toEqual({ a: 1, b: 'x', c: false });
    expect(withDefaults(D)).toEqual(D);
  });

  it('keeps falsy values that are not undefined', () => {
    expect(withDefaults(D, { a: 0, b: '' })).toEqual({ a: 0, b: '', c: true });
  });

  it('returns a copy', () => {
    const out = withDefaults(D, {});
    expect(out).not.toBe(D);
  });
});
