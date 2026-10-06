/**
 * The day's blind mixed review, kept in localStorage, so a reload resumes it and Today
 * knows it was done; sync carries it in the learner envelope (sync/learner). The answers
 * themselves are recorded in the progress document (recordMixedAnswer); this keeps only
 * the plan and the place in it.
 */
import { learnerChanged } from './learnerChange';
import { parseMixedSitting, type MixedSitting } from './mixedReview';

export const MIXED_KEY = 'mastery.mixed.v1';

function store(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadMixed(): MixedSitting | null {
  try {
    return parseMixedSitting(store()?.getItem(MIXED_KEY) ?? null);
  } catch {
    return null;
  }
}

export function saveMixed(s: MixedSitting): void {
  try {
    store()?.setItem(MIXED_KEY, JSON.stringify(s));
    learnerChanged('mixed');
  } catch {
    // Not kept: a reload starts the review again, and Today offers it again.
  }
}
