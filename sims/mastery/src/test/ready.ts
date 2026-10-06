/** Test helper: a learner who has mastered an exam's syllabus topics (readiness.ts), learned and gated a day before `at`. */
import { gateOf } from '@learnhub/content';
import { DAY_MS, newMemory, type Progress } from '@learnhub/mastery';
import type { Exam } from '@/model/ladder';
import { recordCambridgeAnswer } from '@/model/learner';
import { syllabusTopics } from '@/model/readiness';

export function masterTopics(p: Progress, ids: readonly string[], at: number): Progress {
  const memory: Progress['memory'] = { ...p.memory };
  for (const id of ids) memory[id] ??= { ...newMemory(at - 2 * DAY_MS), intervalDays: 10, due: at + 5 * DAY_MS };
  let q: Progress = { ...p, memory };
  for (const id of ids) {
    const g = gateOf(id)[0];
    if (g !== undefined) q = recordCambridgeAnswer(q, `${id}/${g}`, true, { hints: 0 }, at - DAY_MS);
  }
  return q;
}

export const readyFor = (p: Progress, exam: Exam, at: number): Progress => masterTopics(p, syllabusTopics(exam), at);
