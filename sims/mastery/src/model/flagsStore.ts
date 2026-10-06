/**
 * The parts flagged to come back to during a timed sitting or ladder attempt, kept in
 * localStorage; sync carries them in the learner envelope (sync/learner). One sitting runs
 * at a time, so only its flags are kept.
 */
import { learnerChanged } from './learnerChange';

export const FLAG_KEY = 'mastery.flags.v1';

/** The parts flagged for a sitting or attempt. */
export function loadFlags(sittingId: string): string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(FLAG_KEY) ?? '{}');
    const xs = typeof v === 'object' && v !== null ? (v as Record<string, unknown>)[sittingId] : undefined;
    return Array.isArray(xs) ? xs.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function saveFlags(sittingId: string, flags: readonly string[]): void {
  try {
    // One sitting runs at a time, so only its flags are kept.
    localStorage.setItem(FLAG_KEY, JSON.stringify({ [sittingId]: flags }));
    learnerChanged('flags');
  } catch {
    // Not kept; the flags last for this page.
  }
}
