/**
 * The timed ladder's attempts in a signal, kept in localStorage in this browser only, as
 * the campaign is (campaignStore.ts): not part of the progress document, so its schema,
 * version, and sync are unchanged.
 */
import { signal } from '@preact/signals';
import { parseLadder, type LadderAttempt } from './ladder';
import type { Admissions } from './campaign';

export const LADDER_KEY = 'mastery.ladder.v1';

function store(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export const ladder = signal<LadderAttempt[]>([]);

/** Reads storage; the registry is needed to check each attempt, so this waits for it to load. */
export function loadLadder(adm: Admissions): void {
  try {
    ladder.value = parseLadder(adm, store()?.getItem(LADDER_KEY) ?? null);
  } catch {
    ladder.value = [];
  }
}

/** Replaces the attempts and saves them; false when the browser would not keep them. */
export function saveLadder(next: LadderAttempt[]): boolean {
  ladder.value = next;
  try {
    const s = store();
    if (s === null) return false;
    s.setItem(LADDER_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}
