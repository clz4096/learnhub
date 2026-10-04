/**
 * IndexedDB storage for progress: one object store of exported documents by key.
 *
 * The factory is injected (the browser's `indexedDB`, or fake-indexeddb in tests), and the
 * types below are the small structural slice of IndexedDB this file uses, so the package
 * builds without the DOM library.
 */
import type { ProgressStorage } from './progress';

interface Req<T> {
  readonly result: T;
  readonly error: unknown;
  onsuccess: ((ev: unknown) => void) | null;
  onerror: ((ev: unknown) => void) | null;
}

interface OpenReq extends Req<IdbDatabase> {
  onupgradeneeded: ((ev: unknown) => void) | null;
  onblocked: ((ev: unknown) => void) | null;
}

interface IdbStore {
  get(key: string): Req<unknown>;
  put(value: unknown, key: string): Req<unknown>;
}

interface IdbTransaction {
  objectStore(name: string): IdbStore;
  readonly error: unknown;
  oncomplete: ((ev: unknown) => void) | null;
  onerror: ((ev: unknown) => void) | null;
  onabort: ((ev: unknown) => void) | null;
}

interface IdbDatabase {
  readonly objectStoreNames: { contains(name: string): boolean };
  createObjectStore(name: string): unknown;
  transaction(store: string, mode: 'readonly' | 'readwrite'): IdbTransaction;
  close(): void;
}

export interface IdbFactoryLike {
  open(name: string, version?: number): OpenReq;
}

const errText = (e: unknown): string => (e instanceof Error ? e.message : e && typeof e === 'object' && 'name' in e ? String(e.name) : String(e));

function openDb(factory: IdbFactoryLike, dbName: string, storeName: string): Promise<IdbDatabase> {
  return new Promise((resolve, reject) => {
    const req = factory.open(dbName, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(storeName)) req.result.createObjectStore(storeName);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(new Error(`opening ${dbName} failed: ${errText(req.error)}`));
    req.onblocked = () => reject(new Error(`opening ${dbName} is blocked by another tab`));
  });
}

/**
 * A `ProgressStorage` over IndexedDB. Opens the database once, on first use. A value that
 * is not a string (written by something else) reads as an error rather than as missing, so
 * it is never silently overwritten by a fresh start.
 */
export function idbStorage(factory: IdbFactoryLike, dbName = 'learnhub', storeName = 'progress'): ProgressStorage {
  let db: Promise<IdbDatabase> | null = null;
  const getDb = (): Promise<IdbDatabase> => {
    if (db === null) {
      db = openDb(factory, dbName, storeName);
      // A failed open is retried next time instead of failing forever.
      db.catch(() => { db = null; });
    }
    return db;
  };

  return {
    async get(key) {
      const d = await getDb();
      return new Promise<string | undefined>((resolve, reject) => {
        const req = d.transaction(storeName, 'readonly').objectStore(storeName).get(key);
        req.onsuccess = () => {
          const v = req.result;
          if (v === undefined || typeof v === 'string') resolve(v);
          else reject(new Error(`${storeName}/${key} holds a ${typeof v}, not a progress document`));
        };
        req.onerror = () => reject(new Error(`reading ${key} failed: ${errText(req.error)}`));
      });
    },
    async put(key, value) {
      const d = await getDb();
      return new Promise<void>((resolve, reject) => {
        const tx = d.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).put(value, key);
        // Resolve on commit, not on the request, so a resolved put is durable.
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(new Error(`writing ${key} failed: ${errText(tx.error)}`));
        tx.onabort = () => reject(new Error(`writing ${key} was aborted: ${errText(tx.error)}`));
      });
    },
  };
}
