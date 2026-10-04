import { describe, it, expect } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { idbStorage, type IdbFactoryLike } from './idb';
import { loadProgress, newProgress, saveProgress } from './progress';

// A fresh in-memory database per test, so tests do not share state.
const factory = (): IdbFactoryLike => new IDBFactory() as unknown as IdbFactoryLike;

describe('idbStorage over fake-indexeddb', () => {
  it('reads missing keys as undefined and round-trips strings', async () => {
    const s = idbStorage(factory());
    expect(await s.get('probstats')).toBeUndefined();
    await s.put('probstats', 'hello');
    expect(await s.get('probstats')).toBe('hello');
    await s.put('probstats', 'again');
    expect(await s.get('probstats')).toBe('again');
  });

  it('persists across adapters on the same database', async () => {
    const f = factory();
    await idbStorage(f).put('k', 'v');
    expect(await idbStorage(f).get('k')).toBe('v');
  });

  it('keeps separate stores and keys apart', async () => {
    const f = factory();
    await idbStorage(f, 'learnhub', 'progress').put('k', 'a');
    await idbStorage(f, 'other', 'progress').put('k', 'b');
    expect(await idbStorage(f, 'learnhub', 'progress').get('k')).toBe('a');
    expect(await idbStorage(f, 'learnhub', 'progress').get('k2')).toBeUndefined();
  });

  it('works with loadProgress and saveProgress', async () => {
    const s = idbStorage(factory());
    const p = newProgress('probstats', Date.UTC(2026, 9, 4));
    expect((await saveProgress(s, 'probstats', p)).ok).toBe(true);
    expect(await loadProgress(s, 'probstats')).toEqual({ ok: true, value: p, warnings: [] });
  });

  it('a failing open becomes an error result through loadProgress, and is retried', async () => {
    let calls = 0;
    const real = factory();
    const flaky: IdbFactoryLike = {
      open(name, version) {
        calls++;
        if (calls === 1) throw new Error('SecurityError');
        return real.open(name, version);
      },
    };
    const s = idbStorage(flaky);
    const r = await loadProgress(s, 'k');
    expect(r).toEqual({ ok: false, errors: ['storage read failed: SecurityError'] });
    expect(await loadProgress(s, 'k')).toEqual({ ok: true, value: null, warnings: [] });
  });
});
