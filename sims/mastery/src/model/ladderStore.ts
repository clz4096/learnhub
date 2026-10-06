/**
 * The timed ladder's attempts in a signal, kept in localStorage, as the campaign is
 * (campaignStore.ts): not part of the progress document; sync carries it in the learner
 * envelope (sync/learner).
 */
import { signal } from '@preact/signals';
import { parseLadder, removeAttempt, type LadderAttempt } from './ladder';
import type { Admissions } from './campaign';
import { learnerChanged } from './learnerChange';

export const LADDER_KEY = 'mastery.ladder.v1';

function store(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export const ladder = signal<LadderAttempt[]>([]);

/** The registry the attempts were last read with, to read them again after sync. */
let readWith: Admissions | null = null;

/** Reads storage; the registry is needed to check each attempt, so this waits for it to load. */
export function loadLadder(adm: Admissions): void {
  readWith = adm;
  try {
    ladder.value = parseLadder(adm, store()?.getItem(LADDER_KEY) ?? null);
  } catch {
    ladder.value = [];
  }
}

/** Whether this browser holds any ladder attempts, without the registry. */
export function hasStoredLadder(): boolean {
  try {
    const raw = store()?.getItem(LADDER_KEY) ?? null;
    return raw !== null && raw !== '[]';
  } catch {
    return false;
  }
}

/**
 * The attempts as stored, for a reader that must not set the signal (story ratings read
 * them on every change of data): the signal when loaded, else storage, parsed.
 */
export function peekLadder(adm: Admissions): LadderAttempt[] {
  if (ladder.peek().length > 0) return ladder.peek();
  try {
    return parseLadder(adm, store()?.getItem(LADDER_KEY) ?? null);
  } catch {
    return [];
  }
}

/** Replaces the attempts and saves them; false when the browser would not keep them. */
export function saveLadder(next: LadderAttempt[]): boolean {
  ladder.value = next;
  try {
    const s = store();
    if (s === null) return false;
    s.setItem(LADDER_KEY, JSON.stringify(next));
    learnerChanged('ladder');
    return true;
  } catch {
    return false;
  }
}

/** Discards an attempt on purpose, so the removal reaches every device (see `discardFromCampaign`). */
export function discardAttempt(id: string): boolean {
  learnerChanged('ladder', { kind: 'attempt', id });
  return saveLadder(removeAttempt(ladder.peek(), id));
}

/** Reads storage again with the last registry, if the attempts were read at all: after sync writes them. */
export function reloadLadder(): void {
  if (readWith !== null) loadLadder(readWith);
}

let loadedFor: Admissions | null = null;

/** Reads storage once for a registry: for screens that only show the ladder (Today, the palette); a screen that changes it calls `loadLadder`. */
export function ensureLadder(adm: Admissions): void {
  if (loadedFor === adm) return;
  loadedFor = adm;
  loadLadder(adm);
}
