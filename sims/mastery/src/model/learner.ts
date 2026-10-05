/**
 * The learner's progress document and every change the app makes to it, as pure
 * functions: each takes a Progress and returns a new one, so the views stay thin and these
 * rules are tested without a browser.
 *
 * One document per learner (the engine's Progress, version 4), holding the chosen
 * courses, placement answers from earlier builds, memory, history, lesson minutes per
 * course for the planner's split, today's session, supervision attempts with the
 * problems they set to redo, and the times of choices and resets that sync merges by.
 */
import { contentFor } from '@learnhub/content';
import {
  DAY_MS, SUPERVISION_PASS_MARK, classify, dueTopics, frontier, newProgress, placedMemory, placementGraph, placementResult, planSession,
  recordLesson, recordLessonFailure, recordReview, topoOrder, withChoices,
  type HistoryEntry, type MemoryMap, type PlacementGraph, type Progress, type Redo, type SessionRecord, type SessionTask,
  type SupervisionAttempt, type Topic,
} from '@learnhub/mastery';
import { ALL_TOPICS, closureOf, closureTopics, coursesWith, shares } from './courses';
import type { ParsedResult } from './supervision';

/** The document's id and its storage key. One learner, so one document. */
export const DOC_ID = 'mastery';
export const STORAGE_KEY = 'learner';
export const DEFAULT_COURSES = ['ia-probability', 'cst-discrete-maths'] as const;
export const DEFAULT_MINUTES = 60;
export const MIN_MINUTES = 10;
export const MAX_MINUTES = 240;

/**
 * The choices on the start screen (design decision 20). Each is a set of courses taught
 * together from their foundations; for now there is one.
 */
export const COURSE_OPTIONS = [
  { id: 'probability-discrete', title: 'Probability and Discrete Mathematics', courses: DEFAULT_COURSES },
] as const;

/** A fresh document with courses chosen and nothing known. The choices are dated, so sync can tell them from defaults. */
export function startLearner(now: number, courses: readonly string[], budgetMinutes: number): Progress {
  return withChoices(newProgress(DOC_ID, now), { courses: [...courses], budgetMinutes }, now);
}

/**
 * Whether a topic's lesson and problems are written. Nothing is taken on the learner's
 * word (design decisions 11 and 18), so a topic without them cannot be probed, scheduled,
 * passed, or learned: it stays unknown until its content exists.
 */
export const hasContent = (topicId: string): boolean => contentFor(topicId) !== undefined;

const touch = (p: Progress, now: number): Progress => ({ ...p, updatedAt: now });
const log = (p: Progress, entries: readonly HistoryEntry[]): HistoryEntry[] => [...p.history, ...entries];

/** The learner's calendar day, YYYY-MM-DD, in local time. */
export function localDay(now: number): string {
  const d = new Date(now);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ---------------------------------------------------------------- placement from earlier builds

/**
 * Earlier builds began with a placement test (removed by design decision 20). Its answers
 * were measured, so they still count; this is the graph they are read against.
 */
function placementGraphFor(p: Progress): PlacementGraph {
  return placementGraph(ALL_TOPICS, { targets: [...closureOf(p.courses)], probeable: hasContent });
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

/**
 * Migration for decision 20: a document saved mid-placement keeps the answers given as
 * results and goes on to Today. Applied to every document loaded or imported; any other
 * document is returned as is, so it needs no version bump.
 */
export function finishOpenPlacement(p: Progress, now: number): Progress {
  return p.courses.length > 0 && p.placement?.done === false ? finishPlacement(p, now) : p;
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
    teachable: hasContent,
    options: { budgetMinutes, implicitCredit: p.settings.implicitCredit },
  });
  return plan.tasks.map((t): SessionTask => {
    const topicIds = t.kind === 'quiz' ? [...t.topicIds] : [t.topicId];
    const task: SessionTask = { kind: t.kind, topicIds, minutes: t.minutes, reason: t.reason, done: false, passed: null };
    if (t.kind === 'lesson' && t.course !== undefined) task.course = t.course;
    return task;
  });
}

/** Today's session, planned now if there is none for today yet. None before a course is chosen. */
export function ensureSession(p: Progress, now: number): Progress {
  if (p.courses.length === 0) return p;
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
 * to its course either way, as the planner's split counts time spent. A topic without
 * content has no practice to pass, so it cannot be learned: the call changes nothing
 * but leaving its task for another day.
 */
export function completeLesson(
  p: Progress, topicId: string, passed: boolean, now: number, taskIndex: number | null, minutes: number, course?: string,
): Progress {
  if (!hasContent(topicId)) return touch({ ...p, session: markTask(p, taskIndex, null) }, now);
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

// ---------------------------------------------------------------- supervision

/**
 * A redo is due this many days after the result that set it: the next day, so it is
 * redone cold, and well within the two days the design allows.
 */
export const REDO_DUE_DAYS = 1;
/** Unanswered copies kept per problem; older ones are dropped, and a result for one of them is refused. */
export const MAX_PENDING_COPIES = 5;

/** The topic id of a problem key. */
export const topicOfKey = (key: string): string => key.slice(0, key.indexOf('/'));

/**
 * "Copy for supervision": records the copy and returns the attempt whose nonce the copied
 * block carries. Copying again with the same write-up reuses the unanswered copy, so a
 * second press (the clipboard failed, or the learner copied twice) gives the same block.
 */
export function recordSupervisionCopy(
  p: Progress, key: string, writeUp: string, now: number, makeNonce: () => string,
): { progress: Progress; attempt: SupervisionAttempt } {
  const same = [...p.supervision].reverse().find((a) => a.problem === key && a.result === null && a.writeUp === writeUp);
  if (same !== undefined) return { progress: p, attempt: same };
  const used = new Set(p.supervision.map((a) => a.nonce));
  let nonce = makeNonce();
  while (used.has(nonce)) nonce = makeNonce();
  const attempt: SupervisionAttempt = { problem: key, nonce, writeUp, copiedAt: now, result: null, importedAt: null };
  const pending = p.supervision.filter((a) => a.problem === key && a.result === null);
  const drop = new Set(pending.slice(0, Math.max(0, pending.length + 1 - MAX_PENDING_COPIES)).map((a) => a.nonce));
  return { progress: touch({ ...p, supervision: [...p.supervision.filter((a) => !drop.has(a.nonce)), attempt] }, now), attempt };
}

/**
 * Imports a supervision result that `checkResultFor` accepted. The rules:
 * - The attempt keeps the result and the time it was imported.
 * - The mark is a review of the problem's topic: 14 (`SUPERVISION_PASS_MARK`) or more of 20
 *   passes, below fails (`recordReview`, so a miss also brings its strongest prerequisites
 *   due for a check). A topic not learned yet has no review schedule, so its memory is not
 *   changed; the result is still kept and logged.
 * - Open redos of this problem set before the copy was made are closed: this attempt was
 *   the redo.
 * - Each problem in REDO becomes a redo due `REDO_DUE_DAYS` from now, unless it already
 *   has an open redo, which keeps its earlier due time.
 * Returns the document unchanged when the attempt is missing or already has a result.
 */
export function importSupervisionResult(p: Progress, r: ParsedResult, now: number): Progress {
  const at = p.supervision.findIndex((a) => a.nonce === r.nonce && a.problem === r.problem && a.result === null);
  const attempt = p.supervision[at];
  if (attempt === undefined) return p;
  const topicId = topicOfKey(r.problem);
  const passed = r.result.mark >= SUPERVISION_PASS_MARK;
  const supervision = p.supervision.map((a, i) => (i === at ? { ...a, result: r.result, importedAt: now } : a));
  const memory = p.memory[topicId] === undefined ? p.memory : recordReview(p.memory, ALL_TOPICS, topicId, passed, now).memory;

  const redos: Redo[] = p.redos.map((d) => (d.doneAt === null && d.problem === r.problem && d.setAt <= attempt.copiedAt ? { ...d, doneAt: now } : d));
  for (const key of r.result.redo) {
    if (redos.some((d) => d.problem === key && d.doneAt === null)) continue;
    redos.push({ problem: key, from: r.nonce, setAt: now, due: now + REDO_DUE_DAYS * DAY_MS, doneAt: null });
  }
  return touch({
    ...p,
    supervision,
    memory: { ...memory },
    history: log(p, [{ at: now, kind: 'supervision', topicId, correct: passed }]),
    redos,
  }, now);
}

/**
 * An auto-checked Cambridge problem answered right in the app: that is a measured redo, so
 * its open redos are closed. A wrong answer leaves them open.
 */
export function completeRedoByCheck(p: Progress, key: string, now: number): Progress {
  if (!p.redos.some((d) => d.problem === key && d.doneAt === null && d.setAt <= now)) return p;
  return touch({ ...p, redos: p.redos.map((d) => (d.problem === key && d.doneAt === null && d.setAt <= now ? { ...d, doneAt: now } : d)) }, now);
}

/** Open redos, the soonest due first. */
export function openRedos(p: Progress): Redo[] {
  return p.redos.filter((d) => d.doneAt === null).sort((a, b) => a.due - b.due || (a.problem < b.problem ? -1 : 1));
}

/** The latest unanswered copy of each problem, newest first: results the learner may still paste. */
export function waitingCopies(p: Progress): SupervisionAttempt[] {
  const seen = new Set<string>();
  return [...p.supervision].reverse().filter((a) => {
    if (a.result !== null || seen.has(a.problem)) return false;
    seen.add(a.problem);
    return true;
  });
}

/** The attempt whose result set a redo, for its weak points. */
export function redoSource(p: Progress, d: Redo): SupervisionAttempt | undefined {
  return p.supervision.find((a) => a.nonce === d.from);
}

// ---------------------------------------------------------------- status

/** `unwritten`: on the frontier, but its lesson is not written yet, so it cannot be learned or scheduled. */
export type TopicStatus = 'mastered' | 'due' | 'ready' | 'unwritten' | 'locked';

export function statusMap(p: Progress, now: number, within: readonly Topic[] = closureTopics(p.courses)): Map<string, TopicStatus> {
  const mastered = new Set(Object.keys(p.memory));
  const due = new Set(dueTopics(p.memory, now));
  const ready = new Set(frontier(within, mastered));
  const of = (id: string): TopicStatus => {
    if (due.has(id)) return 'due';
    if (mastered.has(id)) return 'mastered';
    if (ready.has(id)) return hasContent(id) ? 'ready' : 'unwritten';
    return 'locked';
  };
  return new Map(within.map((t) => [t.id, of(t.id)] as const));
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

// ---------------------------------------------------------------- migration: no self-report

/**
 * Migration notes, gate 3 follow-up (design decisions 11 and 18). Before this build, a
 * topic without content could be claimed as known: in placement ("I know this"), in a
 * lesson ("I know this already"), and in reviews and quizzes ("I still know this"). The
 * document (version 2) did not record which answers were self-reported: a self-reported
 * placement answer, lesson pass, or review looks exactly like a real one. What does tell
 * them apart is the topic: self-report was offered only where no content existed, and
 * every topic with content was measured by real problems.
 *
 * So the rule is: only measured evidence counts, and a topic without content cannot be
 * known. Concretely, this function
 * - drops placement answers about topics without content (they can only have been
 *   self-reported), so they credit nothing now or after the topic's content is written;
 * - keeps a learned topic only if it has content and is backed by evidence: a passed
 *   lesson in the history, or a known classification from the remaining (real) placement
 *   answers. This also clears topics with content that were credited only because a
 *   self-reported answer above them spread down to its ancestors;
 * - drops those topics from the quiz queue, and today's unfinished tasks on topics that
 *   are no longer schedulable.
 * History and lesson minutes are kept: they record what happened and the time spent.
 *
 * The cost of a wrong removal is one lesson; the cost of a wrong keep is a gap under
 * everything above it, so the rule errs toward removing. It is applied to every document
 * loaded or imported and is idempotent, so it needs no version bump. One case it cannot
 * catch: a self-reported lesson pass on a topic whose content is written before the
 * document is ever opened by this build. Such a document is fixed the first time it is
 * opened, which, for the single learner with one live copy, is the next visit.
 */
export function withoutSelfReport(p: Progress): { progress: Progress; dropped: string[] } {
  const answers = p.placement?.answers ?? [];
  const realAnswers = answers.filter((a) => hasContent(a.topicId));
  // Classified over the whole graph, not the chosen closure: a topic's ancestors are the
  // same in both, and courses may have changed since placement.
  const placed = classify(placementGraph(ALL_TOPICS, { probeable: hasContent }), realAnswers);
  const passed = new Set(p.history.filter((h) => h.kind === 'lesson' && h.correct).map((h) => h.topicId));
  const measured = (id: string): boolean => hasContent(id) && (passed.has(id) || placed.get(id) === 'known');

  const memory: MemoryMap = Object.fromEntries(Object.entries(p.memory).filter(([id]) => measured(id)));
  const dropped = Object.keys(p.memory).filter((id) => memory[id] === undefined);
  const schedulable = (id: string, kind: SessionTask['kind']): boolean => hasContent(id) && (kind === 'lesson' || memory[id] !== undefined);
  let session = p.session;
  if (session !== null) {
    const tasks = session.tasks.flatMap((t): SessionTask[] => {
      if (t.done) return [t];
      const ids = t.topicIds.filter((id) => schedulable(id, t.kind));
      if (ids.length === 0) return [];
      // A quiz's minutes are per item, so they shrink with it.
      return ids.length === t.topicIds.length ? [t] : [{ ...t, topicIds: ids, minutes: (t.minutes * ids.length) / t.topicIds.length }];
    });
    if (tasks.length !== session.tasks.length || tasks.some((t, i) => t !== session?.tasks[i])) session = { ...session, tasks };
  }
  const changed = dropped.length > 0 || realAnswers.length !== answers.length || session !== p.session
    || p.learnedSinceQuiz.some((id) => memory[id] === undefined);
  if (!changed) return { progress: p, dropped: [] };
  return {
    progress: {
      ...p,
      placement: p.placement === null ? null : { ...p.placement, answers: realAnswers },
      memory,
      learnedSinceQuiz: p.learnedSinceQuiz.filter((id) => memory[id] !== undefined),
      session,
    },
    dropped,
  };
}
