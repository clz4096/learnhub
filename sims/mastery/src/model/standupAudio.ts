/**
 * Standup recordings, kept on this device only: IndexedDB, one per date, the last
 * `AUDIO_KEEP_DAYS` dates. Never synced and never uploaded; the synced log holds the
 * transcript (standup.ts). Every call is best effort: a browser without IndexedDB, or one
 * that refuses to store a Blob (a private window), just keeps no audio.
 */
import { addDays } from './day';

export const AUDIO_DB = 'learnhub-standup-audio';
const STORE = 'audio';
export const AUDIO_KEEP_DAYS = 14;

export interface StandupAudio {
  blob: Blob;
  mime: string;
  savedAt: number;
}

function factory(): IDBFactory | null {
  try {
    return typeof indexedDB === 'undefined' ? null : indexedDB;
  } catch {
    return null;
  }
}

function open(): Promise<IDBDatabase | null> {
  const f = factory();
  if (f === null) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = f.open(AUDIO_DB, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function done(tx: IDBTransaction): Promise<boolean> {
  return new Promise((resolve) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => resolve(false);
    tx.onabort = () => resolve(false);
  });
}

/** Keeps a date's recording and drops recordings older than the last 14 days before `today`. */
export async function saveStandupAudio(date: string, audio: StandupAudio, today: string): Promise<boolean> {
  const db = await open();
  if (db === null) return false;
  try {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    store.put(audio, date);
    // Keys are YYYY-MM-DD, so they sort as dates: everything before the cutoff goes.
    store.delete(IDBKeyRange.upperBound(addDays(today, 1 - AUDIO_KEEP_DAYS), true));
    return await done(tx);
  } catch {
    return false;
  } finally {
    db.close();
  }
}

export async function loadStandupAudio(date: string): Promise<StandupAudio | null> {
  const db = await open();
  if (db === null) return null;
  try {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(date);
    const v = await new Promise<unknown>((resolve) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(undefined);
    });
    const a = v as Partial<StandupAudio> | undefined;
    return a !== undefined && a !== null && a.blob instanceof Blob ? (a as StandupAudio) : null;
  } catch {
    return null;
  } finally {
    db.close();
  }
}
