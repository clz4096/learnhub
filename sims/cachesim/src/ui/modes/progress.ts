/**
 * Guided-mode progress, kept per viewer in localStorage. Storage can be missing,
 * full, or blocked (private windows, embedded iframes), so every access is guarded
 * and a bad stored value falls back to a fresh start.
 */
import { signal } from '@preact/signals';
import { LESSONS, lessonById } from '@/ui/modes/lessons';

export const PROGRESS_KEY = 'cachesim.guided.v1';
/** The summary the learnhub catalog reads (same origin, so same storage). */
export const HUB_PROGRESS_KEY = 'learnhub.progress.cachesim';

export interface Progress {
  /** The open lesson. */
  lesson: string;
  /** Per lesson: index of the furthest step run. */
  step: Record<string, number>;
  /** Per lesson: the chosen answer index. */
  answer: Record<string, number>;
}

export function freshProgress(): Progress {
  return { lesson: LESSONS[0]!.id, step: {}, answer: {} };
}

function numbers(v: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!v || typeof v !== 'object') return out;
  for (const [k, x] of Object.entries(v)) if (lessonById(k) && Number.isInteger(x) && (x as number) >= 0) out[k] = x as number;
  return out;
}

export function parseProgress(raw: string | null): Progress {
  if (!raw) return freshProgress();
  try {
    const v = JSON.parse(raw) as Partial<Progress>;
    return {
      lesson: typeof v.lesson === 'string' && lessonById(v.lesson) ? v.lesson : LESSONS[0]!.id,
      step: numbers(v.step),
      answer: numbers(v.answer),
    };
  } catch {
    return freshProgress();
  }
}

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null; // some browsers throw on the property access itself when storage is blocked
  }
}

export function loadProgress(): Progress {
  try {
    return parseProgress(storage()?.getItem(PROGRESS_KEY) ?? null);
  } catch {
    return freshProgress();
  }
}

export function saveProgress(p: Progress): void {
  try {
    storage()?.setItem(PROGRESS_KEY, JSON.stringify(p));
  } catch {
    // Quota or privacy mode: progress just will not persist.
  }
  saveHubSummary(p);
}

/** Lessons done, for the learnhub catalog card. */
export function hubSummary(p: Progress, now = new Date()): { done: number; total: number; updated: string } {
  return { done: LESSONS.filter((l) => isDone(p, l.id)).length, total: LESSONS.length, updated: now.toISOString() };
}

function saveHubSummary(p: Progress): void {
  try {
    storage()?.setItem(HUB_PROGRESS_KEY, JSON.stringify(hubSummary(p)));
  } catch {
    // Same as above: the card just shows no progress.
  }
}

export const progress = signal<Progress>(loadProgress());
// Progress saved before the summary key existed still reaches the catalog.
saveHubSummary(progress.value);

export function updateProgress(edit: (p: Progress) => void): void {
  const p: Progress = { lesson: progress.value.lesson, step: { ...progress.value.step }, answer: { ...progress.value.answer } };
  edit(p);
  progress.value = p;
  saveProgress(p);
}

/** Forget every lesson's steps and answers (the hub card drops back to 0). The tour and imported results are kept. */
export function resetProgress(): void {
  const p = freshProgress();
  progress.value = p;
  saveProgress(p);
}

/** A lesson counts as done once its check question is answered correctly. */
export function isDone(p: Progress, lessonId: string): boolean {
  const a = p.answer[lessonId];
  const l = lessonById(lessonId);
  return a !== undefined && !!l?.question.choices[a]?.correct;
}
