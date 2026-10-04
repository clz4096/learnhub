/**
 * Where the learner is inside an unfinished lesson (its stage and its practice run), kept
 * in sessionStorage so leaving the lesson (Back, the nav, a reload) and coming back
 * resumes it. sessionStorage lives as long as the tab: closing the tab starts the
 * practice again, so the right-in-a-row count resets then, and the lesson says so.
 * It is not in the progress document because it is not progress: nothing is learned
 * until the practice run ends, and that result is what the document records.
 */
import type { PracticeState } from './practice';

export type LessonStage = 'learn' | 'examples' | 'practice';

export interface LessonPlace {
  stage: LessonStage;
  practice: PracticeState;
}

const PREFIX = 'mastery.lesson.';
const STAGES: readonly string[] = ['learn', 'examples', 'practice'];

function session(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
}

const keyOf = (lessonKey: string): string => `${PREFIX}${lessonKey}`;

function isPractice(x: unknown): x is PracticeState {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as Record<string, unknown>;
  const nat = (n: unknown): boolean => Number.isInteger(n) && (n as number) >= 0 && (n as number) < 1000;
  return nat(o.attempts) && nat(o.streak) && Array.isArray(o.results) && o.results.every((r) => typeof r === 'boolean')
    && o.results.length === o.attempts && (o.streak as number) <= (o.attempts as number);
}

/** The saved place, or null when there is none or it does not parse. */
export function loadPlace(lessonKey: string): LessonPlace | null {
  try {
    const raw = session()?.getItem(keyOf(lessonKey));
    if (raw === null || raw === undefined) return null;
    const v = JSON.parse(raw) as Record<string, unknown>;
    if (typeof v.stage !== 'string' || !STAGES.includes(v.stage) || !isPractice(v.practice)) return null;
    return { stage: v.stage as LessonStage, practice: v.practice };
  } catch {
    return null;
  }
}

export function savePlace(lessonKey: string, place: LessonPlace): void {
  try {
    session()?.setItem(keyOf(lessonKey), JSON.stringify(place));
  } catch {
    // Storage blocked or full: the lesson still works, it just will not resume.
  }
}

export function clearPlace(lessonKey: string): void {
  try {
    session()?.removeItem(keyOf(lessonKey));
  } catch {
    // Nothing to clear.
  }
}

/**
 * The problem salt for a lesson opened from the map: fixed for the tab until the lesson
 * ends, so a learner who leaves and comes back meets the same problems in the same order
 * instead of a run that no longer matches the saved count.
 */
export function learnSalt(topicId: string, now: number): string {
  const key = `${PREFIX}salt.${topicId}`;
  try {
    const s = session();
    const old = s?.getItem(key);
    if (typeof old === 'string' && old !== '') return old;
    const fresh = `learn-${now}`;
    s?.setItem(key, fresh);
    return fresh;
  } catch {
    return `learn-${now}`;
  }
}

export function clearLearnSalt(topicId: string): void {
  clearPlace(`salt.${topicId}`);
}
