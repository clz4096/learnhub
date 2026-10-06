/**
 * Readiness for timed work: no rung of the timed ladder (ladder.ts) is scheduled or offered
 * until the topics its exam examines are mostly mastered (learned, and the Cambridge gate
 * met). Sitting a paper on topics never studied measures nothing and costs hours.
 *
 * Which topics. The paper registry (content/src/admissions) has no per-question topic
 * mapping, so readiness uses the exam's syllabus from the book: the Preparation chapters
 * that teach what the exam examines (`EXAM_SYLLABUS`), counting only topics that have a
 * lesson, since only those can be mastered in the app. The mapping is an editorial choice,
 * stated here so it can be checked:
 * - TMUA: CS-0 Proof (Paper 2's logic and proof) and STEP Foundation Blocks 1 to 4 with
 *   CS-0 Maths (Paper 1's pure mathematics).
 * - A level: STEP Foundation Blocks 1 to 6 and CS-0 Maths (the pure core through calculus).
 * - STEP: STEP Foundation Blocks 1 to 6 and the Stage B STEP 2 modules.
 *
 * The rule: ready once `READY_SHARE` of those topics are mastered. The thresholds above the
 * first rung are the ladder's own (two timed questions passed open the half, a timed half
 * passed opens the full paper). Pure: no clock, storage, or app state.
 */
import { hasContent } from '@learnhub/content';
import { chapterById } from '@learnhub/content/book';
import type { Progress } from '@learnhub/mastery';
import type { Exam, LadderStatus } from './ladder';
import { isMastered } from './learner';

/** "Mostly mastered": this share of the syllabus topics with lessons. */
export const READY_SHARE = 0.6;

const FOUNDATION = [
  'prep-step-foundation-block-1-algebra-and-graphs',
  'prep-step-foundation-block-2-trig-counting-probability',
  'prep-step-foundation-block-3-proof-and-functions',
  'prep-step-foundation-block-4-sequences-and-number',
  'prep-step-foundation-block-5-toward-calculus',
  'prep-step-foundation-block-6-calculus',
] as const;

/** The book chapters whose topics each exam examines (see the file comment). */
export const EXAM_SYLLABUS: Readonly<Record<Exam, readonly string[]>> = {
  TMUA: ['prep-cs-0-proof', ...FOUNDATION.slice(0, 4), 'prep-cs-0-maths'],
  'A level': [...FOUNDATION, 'prep-cs-0-maths'],
  STEP: [...FOUNDATION, 'prep-step-2-modules'],
};

const syllabusCache = new Map<Exam, readonly string[]>();

const SYLLABUS_NAMES: Readonly<Record<Exam, string>> = {
  TMUA: 'CS-0 Proof, STEP Foundation Blocks 1 to 4, and CS-0 Maths',
  'A level': 'STEP Foundation Blocks 1 to 6 and CS-0 Maths',
  STEP: 'STEP Foundation Blocks 1 to 6 and the STEP 2 modules',
};

/** The topics with lessons in an exam's syllabus, in book order, each once. */
export function syllabusTopics(exam: Exam): readonly string[] {
  const hit = syllabusCache.get(exam);
  if (hit !== undefined) return hit;
  const out: string[] = [];
  for (const id of EXAM_SYLLABUS[exam]) {
    for (const s of chapterById(id)?.sections ?? []) {
      for (const step of s.steps) if (hasContent(step.topicId) && !out.includes(step.topicId)) out.push(step.topicId);
    }
  }
  syllabusCache.set(exam, out);
  return out;
}

export interface Readiness {
  exam: Exam;
  ready: boolean;
  /** Syllabus topics mastered, and how many must be. */
  mastered: number;
  need: number;
  total: number;
  /** Plain words: where the topics come from. */
  source: string;
}

export function readiness(p: Progress, exam: Exam): Readiness {
  const topics = syllabusTopics(exam);
  const mastered = topics.filter((id) => isMastered(p, id)).length;
  const need = Math.ceil(READY_SHARE * topics.length);
  return { exam, ready: topics.length > 0 && mastered >= need, mastered, need, total: topics.length, source: `the book's ${SYLLABUS_NAMES[exam]}` };
}

/** "First timed TMUA question unlocks after 12 more topics mastered (of 58 in its syllabus)." */
export function unlockLine(r: Readiness): string {
  const more = Math.max(0, r.need - r.mastered);
  return `First timed ${r.exam} question unlocks after ${more} more ${more === 1 ? 'topic' : 'topics'} mastered (${r.need} of the ${r.total} in its syllabus).`;
}

/** The ladder with every rung closed until the exam's topics are ready; unchanged once ready. */
export function withReadiness(s: LadderStatus, r: Readiness): LadderStatus {
  if (r.ready) return s;
  const why = unlockLine(r);
  return { ...s, rungs: s.rungs.map((x) => ({ ...x, open: false, why: x.rung === 'question' ? why : x.why ?? why })) };
}
