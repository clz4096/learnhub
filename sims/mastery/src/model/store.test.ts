import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import type { IdbFactoryLike } from '@learnhub/mastery';
import { DEFAULT_COURSES, startLearner } from '@/model/learner';
import { commit, erase, flush, init, loadErrors, loadState, progress } from '@/model/store';

const T0 = new Date(2026, 9, 4, 9, 0).getTime();

describe('the store', () => {
  it('saves to IndexedDB and loads it back after a reload', async () => {
    const idb = new IDBFactory() as unknown as IdbFactoryLike;
    await init(idb);
    expect(loadState.value).toBe('ready');
    expect(progress.value).toBeNull();
    await commit(startLearner(T0, DEFAULT_COURSES, 45));
    await init(idb);
    expect(progress.value?.settings.budgetMinutes).toBe(45);
    expect(progress.value?.courses).toEqual(['ia-probability', 'cst-discrete-maths']);
  });

  it('start over saves a blank document: no courses, so the app shows Start', async () => {
    const idb = new IDBFactory() as unknown as IdbFactoryLike;
    await init(idb);
    await commit(startLearner(T0, DEFAULT_COURSES, 60));
    await erase();
    await flush();
    await init(idb);
    expect(progress.value?.courses).toEqual([]);
    expect(progress.value?.placement).toBeNull();
  });

  it('a corrupt stored document is reported, not overwritten', async () => {
    const idb = new IDBFactory() as unknown as IdbFactoryLike;
    await init(idb);
    await commit(startLearner(T0, DEFAULT_COURSES, 60));
    // Write junk straight into the store.
    await new Promise<void>((resolve) => {
      const req = (idb as unknown as IDBFactory).open('learnhub-mastery', 1);
      req.onsuccess = () => {
        const tx = req.result.transaction('progress', 'readwrite');
        tx.objectStore('progress').put('{"version":2,', 'learner');
        tx.oncomplete = () => { req.result.close(); resolve(); };
      };
    });
    await init(idb);
    expect(loadState.value).toBe('error');
    expect(loadErrors.value.join(' ')).toMatch(/not valid JSON/);
  });
});
