/**
 * The book as the app reads it (mastery/DESIGN-BOOK.md): where the learner is, what comes
 * next in book order, and each chapter's progress. The book itself (years, terms,
 * chapters, sections, and the topic in each step) is `@learnhub/content/book`.
 *
 * "Next in the book" is the first step in book order that has a written lesson, is not
 * learned, and whose prerequisites are all learned: the frontier, read in book order.
 * Jumping ahead stays allowed; this only orders what Today offers.
 */
import { BOOK, BOOK_STEPS, CHAPTERS, placeOf, type BookChapter, type StepPlace } from '@learnhub/content/book';
import type { Progress } from '@learnhub/mastery';
import { closureOf, topicOf } from './courses';
import { hasContent, statusMap, type TopicStatus } from './learner';

/** A step's state on the contents: the map's statuses, plus "to write" for any topic without a lesson. */
export type StepState = TopicStatus | 'towrite';

export const STEP_TEXT: Readonly<Record<StepState, string>> = {
  mastered: 'mastered',
  gate: 'needs the Cambridge problem',
  due: 'review due',
  ready: 'ready',
  unwritten: 'to write',
  towrite: 'to write',
  locked: 'needs earlier steps',
};

/** Where a topic sits in the book, for the lesson header's journey line: "Preparation › Writing proofs › 4 of 11". */
export interface Journey {
  /** The year's label: the stage of the journey. */
  stage: string;
  chapter: string;
  /** 1-based position of the topic's step among the chapter's steps, and how many there are. */
  n: number;
  of: number;
}

/** The topic's journey line, or null for a topic the book does not place. */
export function journeyOf(topicId: string): Journey | null {
  const at = placeOf(topicId);
  if (at === undefined) return null;
  const steps = at.chapter.sections.flatMap((s) => s.steps);
  const n = steps.indexOf(at.step) + 1;
  const stage = BOOK.find((y) => y.id === at.chapter.yearId)?.label ?? at.chapter.termName;
  return { stage, chapter: at.chapter.title, n, of: steps.length };
}

export function stepStates(p: Progress, now: number): Map<string, StepState> {
  const st = statusMap(p, now);
  return new Map(BOOK_STEPS.map((s) => {
    const id = s.step.topicId;
    const state: StepState = !hasContent(id) ? 'towrite' : st.get(id) ?? (p.memory[id] !== undefined ? 'mastered' : 'locked');
    return [id, state] as const;
  }));
}

/** Whether a topic can be learned next: written, not learned, every prerequisite learned. */
function learnable(p: Progress, id: string): boolean {
  if (p.memory[id] !== undefined || !hasContent(id)) return false;
  const t = topicOf(id);
  return t !== undefined && t.prereqs.every((x) => p.memory[x] !== undefined);
}

/**
 * The topics that can be learned next, in book order. Only those in the chosen courses'
 * closure, since the planner works on nothing else.
 */
export function bookFrontier(p: Progress): string[] {
  const closure = closureOf(p.courses);
  return BOOK_STEPS.map((s) => s.step.topicId).filter((id) => closure.has(id) && learnable(p, id));
}

/** The next step in the book: the first in book order that can be learned now, or undefined. */
export function nextInBook(p: Progress): StepPlace | undefined {
  return BOOK_STEPS.find((s) => learnable(p, s.step.topicId));
}

/**
 * Where the learner is: the chapter of the next step, else the first chapter with a step
 * not yet learned, else undefined (everything placed is learned).
 */
export function hereChapter(p: Progress): BookChapter | undefined {
  const next = nextInBook(p);
  if (next !== undefined) return next.chapter;
  return BOOK_STEPS.find((s) => p.memory[s.step.topicId] === undefined)?.chapter;
}

export interface ChapterProgress {
  steps: number;
  written: number;
  learned: number;
}

export function chapterProgress(p: Progress, ch: BookChapter): ChapterProgress {
  const ids = ch.sections.flatMap((s) => s.steps.map((x) => x.topicId));
  return {
    steps: ids.length,
    written: ids.filter(hasContent).length,
    learned: ids.filter((id) => p.memory[id] !== undefined).length,
  };
}

/** The chapter before and after, in book order. */
export function neighbours(ch: BookChapter): { prev: BookChapter | undefined; next: BookChapter | undefined } {
  const i = CHAPTERS.indexOf(ch);
  return { prev: i > 0 ? CHAPTERS[i - 1] : undefined, next: i >= 0 ? CHAPTERS[i + 1] : undefined };
}
