import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseToolProgress, progressKey, readToolProgress } from '@/progress';

const ok = { done: 3, total: 10, updated: '2026-10-04T12:00:00.000Z' };

afterEach(() => vi.unstubAllGlobals());

describe('parseToolProgress', () => {
  it('accepts a well-formed summary', () => {
    expect(parseToolProgress(JSON.stringify(ok))).toEqual(ok);
  });
  it('rejects missing, malformed, and out-of-range values', () => {
    for (const raw of [null, '', 'not json', '[]', '{}',
      JSON.stringify({ ...ok, done: 11 }), JSON.stringify({ ...ok, done: -1 }), JSON.stringify({ ...ok, total: 0 }),
      JSON.stringify({ ...ok, done: 1.5 }), JSON.stringify({ ...ok, updated: 'yesterday' })]) {
      expect(parseToolProgress(raw)).toBeNull();
    }
  });
});

describe('readToolProgress', () => {
  it('reads the tool key', () => {
    vi.stubGlobal('localStorage', { getItem: (k: string) => (k === progressKey('cachesim') ? JSON.stringify(ok) : null) });
    expect(readToolProgress('cachesim')).toEqual(ok);
    expect(readToolProgress('other')).toBeNull();
  });
  it('treats storage that throws as no progress', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked'); } });
    expect(readToolProgress('cachesim')).toBeNull();
  });
});
