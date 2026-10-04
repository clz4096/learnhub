/**
 * App state: the learner's progress document in a signal, saved to IndexedDB after every
 * change. Saves run one at a time in order, so a slow write never lands after a newer one.
 * The learnhub catalog summary is written to localStorage alongside.
 */
import { signal } from '@preact/signals';
import {
  MemoryStorage, idbStorage, loadProgress, newProgress, saveProgress,
  type IdbFactoryLike, type Progress, type ProgressStorage,
} from '@learnhub/mastery';
import { ALL_TOPICS } from './courses';
import { DOC_ID, STORAGE_KEY, hubSummary } from './learner';

export const HUB_KEY = 'learnhub.progress.mastery';
export const DB_NAME = 'learnhub-mastery';

export const progress = signal<Progress | null>(null);
export const loadState = signal<'loading' | 'ready' | 'error'>('loading');
/** Problems from loading: errors stop the app; warnings are shown once. */
export const loadErrors = signal<string[]>([]);
export const loadWarnings = signal<string[]>([]);
export const saveError = signal<string | null>(null);
/** True when the browser offers no IndexedDB, so nothing will be kept after the tab closes. */
export const volatile = signal(false);

let clock: () => number = () => Date.now();
/** The current time; tests replace the clock. */
export const now = (): number => clock();
export function setClock(f: () => number): void {
  clock = f;
}

let storage: ProgressStorage = new MemoryStorage();
let queue: Promise<void> = Promise.resolve();

function browserIdb(): IdbFactoryLike | null {
  try {
    return typeof indexedDB === 'undefined' ? null : (indexedDB as unknown as IdbFactoryLike);
  } catch {
    return null;
  }
}

export const KNOWN_IDS: readonly string[] = ALL_TOPICS.map((t) => t.id);

/** Opens storage and loads the document. A broken stored document is reported, never overwritten. */
export async function init(factory: IdbFactoryLike | null = browserIdb()): Promise<void> {
  storage = factory === null ? new MemoryStorage() : idbStorage(factory, DB_NAME, 'progress');
  volatile.value = factory === null;
  queue = Promise.resolve();
  const r = await loadProgress(storage, STORAGE_KEY, { knownTopicIds: KNOWN_IDS });
  if (!r.ok) {
    loadErrors.value = r.errors;
    loadState.value = 'error';
    return;
  }
  loadWarnings.value = r.warnings;
  progress.value = r.value;
  loadState.value = 'ready';
}

function writeHub(p: Progress | null): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const s = p === null ? null : hubSummary(p, now());
    if (s === null) localStorage.removeItem(HUB_KEY);
    else localStorage.setItem(HUB_KEY, JSON.stringify(s));
  } catch {
    // Storage blocked: the catalog card just shows no progress.
  }
}

/** Replaces the document and saves it. Returns when this save is done. */
export function commit(next: Progress): Promise<void> {
  progress.value = next;
  writeHub(next);
  queue = queue.then(async () => {
    const r = await saveProgress(storage, STORAGE_KEY, next);
    saveError.value = r.ok ? null : r.errors.join('; ');
  });
  return queue;
}

/**
 * Erases the learner's progress (Start over) by saving a blank document: no courses, no
 * placement, no memory. The app treats a document with no courses as a new learner.
 */
export function erase(): Promise<void> {
  return commit(newProgress(DOC_ID, now()));
}

/** Waits for every pending save. */
export function flush(): Promise<void> {
  return queue;
}
