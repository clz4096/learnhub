/**
 * Changes to the learner's state kept outside the progress document (campaign, story, day
 * log, timed ladder, mixed review, timed-paper flags): each store reports a save here, so
 * sync (sync/local.ts) can record what changed and when, and schedule a round. Sync writes
 * merged copies back `quietly`, so they are not reported as the learner's own changes.
 *
 * `learnerSynced` counts merged copies written back, for screens that hold a copy of their
 * own (the day planner, the timed screen's flags) to read the stores again.
 */
import { signal } from '@preact/signals';

export type LearnerPart = 'campaign' | 'story' | 'day' | 'ladder' | 'mixed' | 'flags';

/** An item the learner removed on purpose: only these are removed on every device. */
export interface Removal {
  kind: 'sitting' | 'interview' | 'attempt';
  id: string;
}

export interface LearnerChange {
  part: LearnerPart;
  removed?: Removal;
}

const listeners = new Set<(c: LearnerChange) => void>();
let quiet = 0;

export const learnerSynced = signal(0);

export function onLearnerChange(f: (c: LearnerChange) => void): () => void {
  listeners.add(f);
  return () => { listeners.delete(f); };
}

/** A store saved the learner's change to `part`; `removed` names an item removed on purpose. */
export function learnerChanged(part: LearnerPart, removed?: Removal): void {
  if (quiet > 0) return;
  const c: LearnerChange = removed === undefined ? { part } : { part, removed };
  for (const f of listeners) {
    try {
      f(c);
    } catch {
      // A listener's failure (sync) must never stop the learner's own save.
    }
  }
}

/** Runs `f` without reporting its saves: for sync writing a merged copy back. */
export function quietly<T>(f: () => T): T {
  quiet++;
  try {
    return f();
  } finally {
    quiet--;
  }
}
