/**
 * The learner's progress document and every change the app makes to it, as pure
 * functions: each takes a Progress and returns a new one, so the views stay thin and these
 * rules are tested without a browser.
 *
 * One document per learner (the engine's Progress, version 2), holding the chosen
 * courses, placement answers, memory, history, lesson minutes per course for the
 * planner's split, and today's session.
 */
import {
  DAY_MS, dueTopics, frontier, newProgress, placedMemory, placementBudget, placementGraph, placementResult, planSession,
  recordLesson, recordLessonFailure, recordReview, topoOrder,
  type HistoryEntry, type MemoryMap, type PlacementGraph, type Progress, type SessionRecord, type SessionTask, type Topic,
} from '@learnhub/mastery';
import { ALL_TOPICS, closureOf, closureTopics, coursesWith, shares } from './courses';

/** The document's id and its storage key. One learner, so one document. */
export const DOC_ID = 'mastery';
export const STORAGE_KEY = 'learner';
export const DEFAULT_COURSES = ['ia-probability', 'cst-discrete-maths'] as const;
export const DEFAULT_MINUTES = 60;
export const MIN_MINUTES = 10;
export const MAX_MINUTES = 240;

/** A fresh document with courses chosen and placement not started. */
export function startLearner(now: number, courses: readonly string[], budgetMinutes: number): Progress {
  const p = newProgress(DOC_ID, now, { budgetMinutes });
  p.courses = [...courses];
  return p;
}

const touch = (p: Progress, now: number): Progress => ({ ...p, updatedAt: now });
const log = (p: Progress, entries: readonly HistoryEntry[]): HistoryEntry[] => [...p.history, ...entries];

/** The learner's calendar day, YYYY-MM-DD, in local time. */
export function localDay(now: number): string {
  const d = new Date(now);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ---------------------------------------------------------------- placement

export function placementGraphFor(p: Progress): PlacementGraph {
  return placementGraph(ALL_TOPICS, { targets: [...closureOf(p.courses)] });
}

/** The default budget for the chosen courses (engine `placementBudget`). */
export const budgetFor = (g: PlacementGraph): number => placementBudget(g.order.length);

export function answerPlacement(p: Progress, topicId: string, correct: boolean, now: number): Progress {
  const answers = [...(p.placement?.answers ?? []), { topicId, correct, at: now }];
  return touch({
    ...p,
    placement: { answers, done: false },
    history: log(p, [{ at: now, kind: 'placement', topicId, correct }]),
  }, now);
}

/**
 * Ends placement: known topics get placed memory (the engine spreads their first reviews),
 * everything else is left to learn. Unclassified topics count as not known.
 */
export function finishPlacement(p: Progress, now: number): Progress {
  const g = placementGraphFor(p);
  const answers = p.placement?.answers ?? [];
  const result = placementResult(g, answers);
  const memory = { ...p.memory, ...placedMemory(result.mastered.filter((id) => p.memory[id] === undefined), now) };
  return touch({ ...p, placement: { answers, done: true }, memory, session: null }, now);
}

// ---------------------------------------------------------------- today's session

function toTasks(p: Progress, now: number, budgetMinutes = p.settings.budgetMinutes): SessionTask[] {
  if (budgetMinutes <= 0) return [];
  const plan = planSession({
    topics: ALL_TOPICS,
    courses: shares(p.courses),
    courseWeights: p.settings.courseWeights,
    courseMinutes: p.courseMinutes,
    memory: p.memory,
    now,
    learnedSinceQuiz: p.learnedSinceQuiz,
    options: { budgetMinutes, implicitCredit: p.settings.implicitCredit },
  });
  return plan.tasks.map((t): SessionTask => {
    const topicIds = t.kind === 'quiz' ? [...t.topicIds] : [t.topicId];
    const task: SessionTask = { kind: t.kind, topicIds, minutes: t.minutes, reason: t.reason, done: false, passed: null };
    if (t.kind === 'lesson' && t.course !== undefined) task.course = t.course;
    return task;
  });
}

/** Today's session, planned now if there is none for today yet. Null before placement is done. */
export function ensureSession(p: Progress, now: number): Progress {
  if (!p.placement?.done || p.courses.length === 0) return p;
  const day = localDay(now);
  if (p.session !== null && p.session.day === day) return p;
  const session: SessionRecord = { day, startedAt: now, tasks: toTasks(p, now) };
  return touch({ ...p, session }, now);
}

/** After today's tasks are done: plan another session's worth and add it to today. */
export function planMore(p: Progress, now: number): Progress {
  const base = ensureSession(p, now);
  const s = base.session;
  if (s === null) return base;
  return touch({ ...base, session: { ...s, tasks: [...s.tasks, ...toTasks(base, now)] } }, now);
}

/**
 * Plan the rest of today again, after a settings change: done tasks stay, the others are
 * replaced by a fresh plan for the minutes still left in the daily budget.
 */
export function replanToday(p: Progress, now: number): Progress {
  const base = ensureSession(p, now);
  const s = base.session;
  if (s === null) return base;
  const kept = s.tasks.filter((t) => t.done);
  const used = kept.reduce((a, t) => a + t.minutes, 0);
  return touch({ ...base, session: { ...s, tasks: [...kept, ...toTasks(base, now, base.settings.budgetMinutes - used)] } }, now);
}

function markTask(p: Progress, index: number | null, passed: boolean | null): SessionRecord | null {
  if (p.session === null || index === null) return p.session;
  const tasks = p.session.tasks.map((t, i) => (i === index ? { ...t, done: true, passed } : t));
  return { ...p.session, tasks };
}

/** The course to charge a lesson to: the task's, else the chosen course with the fewest minutes per weight that contains it. */
function chargeTo(p: Progress, topicId: string, course: string | undefined): string | undefined {
  if (course !== undefined) return course;
  const options = coursesWith(topicId, p.courses).map((c) => c.id);
  const w = (id: string): number => p.settings.courseWeights[id] ?? 1;
  const spent = (id: string): number => p.courseMinutes[id] ?? 0;
  return options.filter((id) => w(id) > 0).sort((a, b) => spent(a) / w(a) - spent(b) / w(b))[0] ?? options[0];
}

/**
 * A lesson finished: passed makes the topic mastered and credits what it encompasses;
 * not passed flags the prerequisites it leans on for a check. Its minutes are charged
 * to its course either way, as the planner's split counts time spent.
 */
export function completeLesson(
  p: Progress, topicId: string, passed: boolean, now: number, taskIndex: number | null, minutes: number, course?: string,
): Progress {
  const update = passed ? recordLesson(p.memory, ALL_TOPICS, topicId, now) : recordLessonFailure(p.memory, ALL_TOPICS, topicId, now);
  const charged = chargeTo(p, topicId, course);
  const courseMinutes = { ...p.courseMinutes };
  if (charged !== undefined) courseMinutes[charged] = (courseMinutes[charged] ?? 0) + minutes;
  return touch({
    ...p,
    memory: { ...update.memory },
    learnedSinceQuiz: passed ? [...p.learnedSinceQuiz.filter((x) => x !== topicId), topicId] : p.learnedSinceQuiz,
    history: log(p, [{ at: now, kind: 'lesson', topicId, correct: passed }]),
    courseMinutes,
    session: markTask(p, taskIndex, passed),
  }, now);
}

/** An explicit review. A topic that is not mastered (the document changed elsewhere) is skipped. */
export function completeReview(p: Progress, topicId: string, correct: boolean, now: number, taskIndex: number | null): Progress {
  if (p.memory[topicId] === undefined) return touch({ ...p, session: markTask(p, taskIndex, null) }, now);
  const update = recordReview(p.memory, ALL_TOPICS, topicId, correct, now);
  return touch({
    ...p,
    memory: { ...update.memory },
    history: log(p, [{ at: now, kind: 'review', topicId, correct }]),
    session: markTask(p, taskIndex, correct),
  }, now);
}

/** A quiz: each item is a review of its topic. Resets the count toward the next quiz. */
export function completeQuiz(p: Progress, results: Readonly<Record<string, boolean>>, now: number, taskIndex: number | null): Progress {
  let memory: MemoryMap = p.memory;
  const entries: HistoryEntry[] = [];
  for (const [id, correct] of Object.entries(results)) {
    if (memory[id] === undefined) continue;
    memory = recordReview(memory, ALL_TOPICS, id, correct, now).memory;
    entries.push({ at: now, kind: 'quiz', topicId: id, correct });
  }
  const passed = Object.values(results).every(Boolean);
  return touch({
    ...p,
    memory: { ...memory },
    learnedSinceQuiz: [],
    history: log(p, entries),
    session: markTask(p, taskIndex, passed),
  }, now);
}

/** Leave a task for another day: done for today, with no result recorded. */
export function skipTask(p: Progress, taskIndex: number, now: number): Progress {
  return touch({ ...p, session: markTask(p, taskIndex, null) }, now);
}

// ---------------------------------------------------------------- status

export type TopicStatus = 'mastered' | 'due' | 'ready' | 'locked';

export function statusMap(p: Progress, now: number, within: readonly Topic[] = closureTopics(p.courses)): Map<string, TopicStatus> {
  const mastered = new Set(Object.keys(p.memory));
  const due = new Set(dueTopics(p.memory, now));
  const ready = new Set(frontier(within, mastered));
  return new Map(within.map((t) => [t.id, due.has(t.id) ? 'due' : mastered.has(t.id) ? 'mastered' : ready.has(t.id) ? 'ready' : 'locked'] as const));
}

export interface CourseStats {
  id: string;
  total: number;
  mastered: number;
  due: number;
  ready: number;
  lessonMinutes: number;
}

export function courseStats(p: Progress, courseId: string, now: number): CourseStats {
  const ts = closureTopics([courseId]);
  const st = statusMap(p, now, ts);
  const count = (s: TopicStatus): number => [...st.values()].filter((x) => x === s).length;
  return {
    id: courseId, total: ts.length, mastered: count('mastered') + count('due'), due: count('due'), ready: count('ready'),
    lessonMinutes: p.courseMinutes[courseId] ?? 0,
  };
}

/** The learnhub catalog card's summary: mastered topics in the chosen courses, out of their closure. */
export function hubSummary(p: Progress, now: number): { done: number; total: number; updated: string } | null {
  const closure = closureOf(p.courses);
  if (closure.size === 0) return null;
  const done = [...closure].filter((id) => p.memory[id] !== undefined).length;
  return { done, total: closure.size, updated: new Date(now).toISOString() };
}

/** Minutes of today's tasks done and left, and lesson minutes per course today. */
export function sessionTime(s: SessionRecord | null): { done: number; left: number; byCourse: Record<string, { done: number; planned: number }> } {
  const byCourse: Record<string, { done: number; planned: number }> = {};
  let done = 0;
  let left = 0;
  for (const t of s?.tasks ?? []) {
    if (t.done) done += t.minutes;
    else left += t.minutes;
    if (t.kind === 'lesson' && t.course !== undefined) {
      const c = (byCourse[t.course] ??= { done: 0, planned: 0 });
      c.planned += t.minutes;
      if (t.done) c.done += t.minutes;
    }
  }
  return { done, left, byCourse };
}

/** Topological order of the whole graph, for listing. */
export const GRAPH_ORDER: readonly string[] = topoOrder(ALL_TOPICS);

export const daysFrom = (now: number, due: number): number => Math.round((due - now) / DAY_MS);
