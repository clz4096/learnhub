/**
 * The learner's progress document and every change the app makes to it, as pure
 * functions: each takes a Progress and returns a new one, so the views stay thin and these
 * rules are tested without a browser.
 *
 * One document per learner (the engine's Progress, version 6), holding the chosen
 * courses, placement answers from earlier builds, memory, history, lesson minutes per
 * course for the planner's split, today's session, supervision attempts with the
 * problems they set to redo, and the times of choices and resets that sync merges by.
 *
 * Mastery (decisions of 2026-10-05): passing a lesson's practice makes a topic learned (it
 * gets a memory state, is reviewed, and unlocks what builds on it); it is mastered once its
 * Cambridge gate is met as well (`masteryOf`, the engine's gate.ts).
 *
 * A Cambridge problem that moved topic (`MOVED_PROBLEMS` in the content) keeps its old key in
 * the history, supervision attempts and redos already stored. Every read here resolves a key
 * to the current one (`currentProblemKey`), so old work counts on the problem where it is now;
 * the stored document is never rewritten, so merging copies stays a join.
 */
import { FIRST_PROOF_TOPIC, currentProblemKey, gateOf, hasContent as written } from '@learnhub/content';
import {
  DAY_MS, NONCE_ALPHABET, NONCE_LENGTH, SUPERVISION_PASS_MARK, cambridgeEntries, classify, dueTopics, frontier, gateStatus, newProgress, nextAttempt, placedMemory, placementGraph,
  placementResult, planSession, recordGym, recordLesson, recordLessonFailure, recordReview, replayMemory, sameMemoryState, solutionShown, topoOrder,
  unaidedAnswer, withChoices,
  type GateStatus, type GymCandidate, type HistoryEntry, type ItemData, type MemoryMap, type MemoryState, type PlacementGraph, type Progress, type Redo,
  type SessionPlan, type SessionRecord, type SessionTask, type SupervisionAttempt, type SupervisionResult, type Topic,
} from '@learnhub/mastery';
import { BOOK_ORDER } from '@learnhub/content/book';
import { bookFrontier } from './book';
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
export const hasContent = (topicId: string): boolean => written(topicId);

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

/**
 * One session's tasks. Reviews, the quiz, and the course split are the engine's
 * (`planSession`); new lessons follow the book (mastery/DESIGN-BOOK.md, "Scheduler"): the
 * frontier is offered to the engine one topic at a time in book order, and a topic is kept
 * when the engine fits it in with the ones kept before. The engine still decides what fits
 * and which due reviews a lesson covers, so review scheduling is unchanged; the lessons
 * then appear in book order.
 */
function toTasks(p: Progress, now: number, budgetMinutes = p.settings.budgetMinutes): SessionTask[] {
  if (budgetMinutes <= 0) return [];
  const known = (id: string): boolean => p.memory[id] !== undefined;
  const plan = (lessons: ReadonlySet<string>): SessionPlan => planSession({
    topics: ALL_TOPICS,
    courses: shares(p.courses),
    courseWeights: p.settings.courseWeights,
    courseMinutes: p.courseMinutes,
    memory: p.memory,
    now,
    learnedSinceQuiz: p.learnedSinceQuiz,
    teachable: (id) => hasContent(id) && (known(id) || lessons.has(id)),
    options: { budgetMinutes, implicitCredit: p.settings.implicitCredit },
  });
  const lessonsOf = (x: SessionPlan): string[] => x.tasks.flatMap((t) => (t.kind === 'lesson' ? [t.topicId] : []));
  const kept = new Set<string>();
  let best = plan(kept);
  for (const id of bookFrontier(p)) {
    const trial = plan(new Set([...kept, id]));
    const got = lessonsOf(trial);
    if (got.length === kept.size + 1 && got.includes(id)) {
      kept.add(id);
      best = trial;
    }
  }
  const order = new Map(BOOK_ORDER.map((id, i) => [id, i] as const));
  const rank = (t: SessionPlan['tasks'][number]): number => (t.kind === 'lesson' ? order.get(t.topicId) ?? Infinity : -1);
  // Lessons in book order, in the places the engine gave lessons; reviews and the quiz stay put.
  const lessons = best.tasks.filter((t) => t.kind === 'lesson').sort((a, b) => rank(a) - rank(b));
  let li = 0;
  const tasks = best.tasks.map((t) => (t.kind === 'lesson' ? (lessons[li++] as typeof t) : t));
  return tasks.map((t): SessionTask => {
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

// ---------------------------------------------------------------- item data and the gate

/** Item data for an answer, with the attempt number filled in from the history. */
export type ItemInput = Omit<ItemData, 'attempt'> & { attempt?: number };

function itemOf(p: Progress, kind: HistoryEntry['kind'], item: ItemInput): ItemData {
  const resolve = kind === 'cambridge' ? currentProblemKey : undefined;
  const out: ItemData = { id: item.id, hints: item.hints, attempt: item.attempt ?? nextAttempt(p.history, kind, item.id, resolve) };
  if (item.seed !== undefined) out.seed = item.seed;
  if (item.ms !== undefined) out.ms = Math.max(0, Math.round(item.ms));
  if (item.solution === true) out.solution = true;
  return out;
}

/** The item id of a generated problem: "topic id/generator id". */
export const drillItemId = (topicId: string, generatorId: string): string => `${topicId}/${generatorId}`;

/**
 * One generated problem answered, in lesson practice or a review: logged with its item
 * data. The run's result (`completeLesson`, `completeReview`) is recorded separately.
 */
export function recordDrill(p: Progress, topicId: string, correct: boolean, item: ItemInput, now: number): Progress {
  return touch({ ...p, history: log(p, [{ at: now, kind: 'drill', topicId, correct, item: itemOf(p, 'drill', item) }]) }, now);
}

/**
 * A missed single-answer Cambridge problem comes back this many days later
 * (mastery/HOW-A-TOPIC-WORKS.md, rule 3): long enough that it is answered cold, not by a
 * string of guesses. Until then it shows its nudge and hints but takes no answer.
 */
export const MISS_RETURN_DAYS = 3;

/**
 * The nonce of the redo a miss sets: made from the problem, the time, and the document, so
 * recording stays a pure function. It avoids every nonce the document holds, so a miss's
 * redo never reads as set by a supervisor (`redoSource` finds nothing for it).
 */
function missNonce(p: Progress, key: string, now: number): string {
  const used = new Set([...p.supervision.map((a) => a.nonce), ...p.redos.map((d) => d.from)]);
  for (let salt = 0; ; salt++) {
    // FNV-1a over the text, stretched to the nonce's length by hashing again per letter.
    let h = 0x811c9dc5;
    for (const ch of `${key}@${now}#${salt}`) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0;
    let out = '';
    for (let i = 0; i < NONCE_LENGTH; i++) {
      h = Math.imul(h ^ (i + 1), 0x01000193) >>> 0;
      out += NONCE_ALPHABET[h % NONCE_ALPHABET.length];
    }
    if (!used.has(out)) return out;
  }
}

/**
 * One answer to an auto-checked Cambridge problem, the gate's evidence: logged with its
 * item data (the item id is the problem key), its attempt number counted from the history.
 * `item.solution` says the worked solution was shown with it: "Show me the solution", or an
 * answer after the solution had been seen. The rules (mastery/HOW-A-TOPIC-WORKS.md, rule 3):
 * - A right answer closes the problem's open redos (`completeRedoByCheck`).
 * - A miss that did not show the solution sets the problem to come back `MISS_RETURN_DAYS`
 *   later, as a redo on Today, unless the problem already has an open redo (it keeps its
 *   earlier due time). Once the solution is shown, nothing more is scheduled: the problem
 *   can no longer count.
 */
export function recordCambridgeAnswer(p: Progress, key: string, correct: boolean, item: Omit<ItemInput, 'id'>, now: number): Progress {
  const current = currentProblemKey(key);
  const entry: HistoryEntry = { at: now, kind: 'cambridge', topicId: topicOfKey(key), correct, item: itemOf(p, 'cambridge', { ...item, id: key }) };
  const next = touch({ ...p, history: log(p, [entry]) }, now);
  if (correct) return completeRedoByCheck(next, key, now);
  if (item.solution === true || solutionShown(cambridgeEntries(p.history, key, currentProblemKey)) || p.redos.some((d) => currentProblemKey(d.problem) === current && d.doneAt === null)) return next;
  return { ...next, redos: [...next.redos, { problem: key, from: missNonce(p, key, now), setAt: now, due: now + MISS_RETURN_DAYS * DAY_MS, doneAt: null }] };
}

/**
 * Where one auto-checked Cambridge problem stands for the learner:
 * - `solved`: answered right before its solution was ever shown (it counts, if a gate problem);
 * - `revealed`: its solution has been shown, so it can no longer count;
 * - `returnsAt`: after a miss, when it takes an answer again; null when it takes one now;
 * - `hints`: the most hints any answer to it used.
 */
export interface CambridgeState {
  solved: boolean;
  revealed: boolean;
  returnsAt: number | null;
  hints: number;
}

export function cambridgeState(p: Progress, key: string, now: number): CambridgeState {
  const entries = cambridgeEntries(p.history, key, currentProblemKey);
  const solved = unaidedAnswer(entries) !== undefined;
  const revealed = solutionShown(entries);
  const last = entries.reduce<HistoryEntry | undefined>((a, h) => (a === undefined || h.at >= a.at ? h : a), undefined);
  const back = last === undefined || last.correct || solved || revealed ? null : last.at + MISS_RETURN_DAYS * DAY_MS;
  return { solved, revealed, returnsAt: back !== null && now < back ? back : null, hints: Math.max(0, ...entries.map((h) => h.item?.hints ?? 0)) };
}

/** Whether a redo came back from a miss in the app rather than from a supervisor's result. */
export const redoFromMiss = (p: Progress, d: Redo): boolean => redoSource(p, d) === undefined;

/**
 * One gym item done (the engine's gym.ts): its effect on memory (`recordGym`), and a `gym`
 * entry with its item data. Gym work never meets the gate.
 */
export function completeGymItem(
  p: Progress, item: Pick<GymCandidate, 'kind' | 'topicId' | 'id'>, correct: boolean, data: Omit<ItemInput, 'id'>, now: number,
): Progress {
  const update = recordGym(p.memory, ALL_TOPICS, item, correct, now);
  const entry: HistoryEntry = { at: now, kind: 'gym', topicId: item.topicId, correct, item: itemOf(p, 'gym', { ...data, id: item.id }) };
  return touch({ ...p, memory: { ...update.memory }, history: log(p, [entry]) }, now);
}

/** Where a topic stands against the Cambridge gate, with its gate problems from the catalog. */
export function masteryOf(p: Progress, topicId: string): GateStatus {
  return gateStatus(p, topicId, gateOf(topicId), currentProblemKey);
}

/** Learned (drills passed) and the gate met. */
export const isMastered = (p: Progress, topicId: string): boolean => masteryOf(p, topicId).stage === 'mastered';

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

/**
 * A quiz: each item is a review of its topic. Resets the count toward the next quiz.
 * `items` gives each answered item's data, by topic id, when it was measured.
 */
export function completeQuiz(
  p: Progress, results: Readonly<Record<string, boolean>>, now: number, taskIndex: number | null, items: Readonly<Record<string, ItemInput>> = {},
): Progress {
  let memory: MemoryMap = p.memory;
  const entries: HistoryEntry[] = [];
  for (const [id, correct] of Object.entries(results)) {
    if (memory[id] === undefined) continue;
    memory = recordReview(memory, ALL_TOPICS, id, correct, now).memory;
    const entry: HistoryEntry = { at: now, kind: 'quiz', topicId: id, correct };
    const item = Object.hasOwn(items, id) ? items[id] : undefined;
    if (item !== undefined) entry.item = itemOf(p, 'quiz', item);
    entries.push(entry);
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
  const current = currentProblemKey(key);
  const same = [...p.supervision].reverse().find((a) => currentProblemKey(a.problem) === current && a.result === null && a.writeUp === writeUp);
  if (same !== undefined) return { progress: p, attempt: same };
  const used = new Set(p.supervision.map((a) => a.nonce));
  let nonce = makeNonce();
  while (used.has(nonce)) nonce = makeNonce();
  const attempt: SupervisionAttempt = { problem: key, nonce, writeUp, copiedAt: now, result: null, importedAt: null };
  const pending = p.supervision.filter((a) => currentProblemKey(a.problem) === current && a.result === null);
  const drop = new Set(pending.slice(0, Math.max(0, pending.length + 1 - MAX_PENDING_COPIES)).map((a) => a.nonce));
  return { progress: touch({ ...p, supervision: [...p.supervision.filter((a) => !drop.has(a.nonce)), attempt] }, now), attempt };
}

/**
 * Whether a supervision result leaves its topic's schedule alone instead of counting as a
 * missed review (decisions of 2026-10-08). Only a mark below the pass mark can be left out,
 * and it is when
 * - it names a prerequisite gap (`SupervisionResult.gap`): the shortfall was an earlier skill,
 *   such as writing a proof, not this topic; or
 * - its problem is not one of the topic's gate problems (`gateOf`): further practice may lean
 *   on later lessons (proof writing, for the proofs the 2026-10-08 audit moved off early
 *   gates), so missing it is not evidence that this topic slipped. A pass still counts.
 * The same rule decides at import (`importSupervisionResult`) and when the schedule is rebuilt
 * from the history (`withoutStaleLapses`), so the two always agree.
 */
export function lapseExcluded(problem: string, r: Readonly<SupervisionResult>): boolean {
  if (r.mark >= SUPERVISION_PASS_MARK) return false;
  if (r.gap !== undefined) return true;
  const k = currentProblemKey(problem);
  return !gateOf(topicOfKey(k)).includes(k.slice(k.indexOf('/') + 1));
}

/**
 * The prerequisite gap a result keeps: its GAP topic when the mark is below the pass mark and
 * that topic is not mastered now (nor the problem's own topic); otherwise none, and the result
 * counts as usual.
 */
export function effectiveGap(p: Progress, problem: string, r: Readonly<SupervisionResult>): string | undefined {
  const g = r.gap;
  if (g === undefined || r.mark >= SUPERVISION_PASS_MARK || g === topicOfKey(currentProblemKey(problem)) || isMastered(p, g)) return undefined;
  return g;
}

/**
 * Imports a supervision result that `checkResultFor` accepted. The rules:
 * - The attempt keeps the result and the time it was imported. A GAP is kept only when it
 *   applies now (`effectiveGap`).
 * - The mark is a review of the problem's topic: 14 (`SUPERVISION_PASS_MARK`) or more of 20
 *   passes, below fails (`recordReview`, so a miss also brings its strongest prerequisites
 *   due for a check), unless the miss is left out (`lapseExcluded`): then the schedule is
 *   unchanged. A topic not learned yet has no review schedule, so its memory is not
 *   changed; the result is still kept and logged.
 * - Open redos of this problem set before the copy was made are closed: this attempt was
 *   the redo.
 * - Each problem in REDO becomes a redo due `REDO_DUE_DAYS` from now, unless it already
 *   has an open redo, which keeps its earlier due time. A redo of this problem waits for a
 *   kept GAP topic to be mastered (`redoWaitsFor`).
 * Returns the document unchanged when the attempt is missing or already has a result.
 */
export function importSupervisionResult(p: Progress, r: ParsedResult, now: number): Progress {
  const key = currentProblemKey(r.problem);
  const at = p.supervision.findIndex((a) => a.nonce === r.nonce && currentProblemKey(a.problem) === key && a.result === null);
  const attempt = p.supervision[at];
  if (attempt === undefined) return p;
  const topicId = topicOfKey(key);
  const passed = r.result.mark >= SUPERVISION_PASS_MARK;
  const gap = effectiveGap(p, r.problem, r.result);
  const { gap: _asked, ...rest } = r.result;
  const result: SupervisionResult = gap === undefined ? rest : { ...rest, gap };
  const supervision = p.supervision.map((a, i) => (i === at ? { ...a, result, importedAt: now } : a));
  const counts = !lapseExcluded(r.problem, result);
  const memory = p.memory[topicId] === undefined || !counts ? p.memory : recordReview(p.memory, ALL_TOPICS, topicId, passed, now).memory;

  const redos: Redo[] = p.redos.map((d) => (d.doneAt === null && currentProblemKey(d.problem) === key && d.setAt <= attempt.copiedAt ? { ...d, doneAt: now } : d));
  for (const set of r.result.redo) {
    if (redos.some((d) => currentProblemKey(d.problem) === currentProblemKey(set) && d.doneAt === null)) continue;
    redos.push({ problem: set, from: r.nonce, setAt: now, due: now + REDO_DUE_DAYS * DAY_MS, doneAt: null });
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
export function completeRedoByCheck(p: Progress, asked: string, now: number): Progress {
  const key = currentProblemKey(asked);
  const open = (d: Redo): boolean => currentProblemKey(d.problem) === key && d.doneAt === null && d.setAt <= now;
  if (!p.redos.some(open)) return p;
  return touch({ ...p, redos: p.redos.map((d) => (open(d) ? { ...d, doneAt: now } : d)) }, now);
}

/**
 * The topic a redo waits for: the GAP its result kept, while that topic is not mastered, for a
 * redo of the supervised problem itself (redoing it before the missing skill is learned would
 * fail the same way). Undefined when the redo is ready.
 */
export function redoWaitsFor(p: Progress, d: Redo): string | undefined {
  const a = redoSource(p, d);
  const g = a?.result?.gap;
  if (a === undefined || g === undefined || currentProblemKey(a.problem) !== currentProblemKey(d.problem) || isMastered(p, g)) return undefined;
  return g;
}

/** Open redos that are not waiting for a prerequisite (`redoWaitsFor`), the soonest due first. */
export function openRedos(p: Progress): Redo[] {
  return p.redos.filter((d) => d.doneAt === null && redoWaitsFor(p, d) === undefined).sort((a, b) => a.due - b.due || (a.problem < b.problem ? -1 : 1));
}

/**
 * Whether the learner has reached the first proof lesson (`FIRST_PROOF_TOPIC`), so a proof
 * problem can link to it: it is learned, or `topicId` comes after it in the book.
 */
export function proofLessonReached(p: Progress | null, topicId: string): boolean {
  if (p !== null && p.memory[FIRST_PROOF_TOPIC] !== undefined) return true;
  const at = BOOK_ORDER.indexOf(topicId);
  return at >= 0 && at > BOOK_ORDER.indexOf(FIRST_PROOF_TOPIC);
}

/** Open redos waiting for a prerequisite topic to be mastered, the soonest due first. */
export function waitingRedos(p: Progress): Redo[] {
  return p.redos.filter((d) => d.doneAt === null && redoWaitsFor(p, d) !== undefined).sort((a, b) => a.due - b.due || (a.problem < b.problem ? -1 : 1));
}

/**
 * "Recommended next": the prerequisite topics that supervision results named as the gap
 * (`SupervisionResult.gap`) and that are not mastered yet, in book order, then id. With
 * `topicId`, only the gaps found on that topic's problems.
 */
export function recommendedNext(p: Progress, topicId?: string): string[] {
  const order = new Map(BOOK_ORDER.map((id, i) => [id, i] as const));
  const gaps = new Set<string>();
  for (const a of p.supervision) {
    const g = a.result?.gap;
    if (g === undefined || (topicId !== undefined && topicOfKey(currentProblemKey(a.problem)) !== topicId) || isMastered(p, g)) continue;
    gaps.add(g);
  }
  return [...gaps].sort((x, y) => (order.get(x) ?? Infinity) - (order.get(y) ?? Infinity) || (x < y ? -1 : x > y ? 1 : 0));
}

/** The latest unanswered copy of each problem, newest first: results the learner may still paste. */
export function waitingCopies(p: Progress): SupervisionAttempt[] {
  const seen = new Set<string>();
  return [...p.supervision].reverse().filter((a) => {
    const key = currentProblemKey(a.problem);
    if (a.result !== null || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** The attempt whose result set a redo, for its weak points. */
export function redoSource(p: Progress, d: Redo): SupervisionAttempt | undefined {
  return p.supervision.find((a) => a.nonce === d.from);
}

// ---------------------------------------------------------------- status

/**
 * - `due`: learned, and its review is due (whatever its gate).
 * - `gate`: learned, but its Cambridge gate is not met yet: "needs the Cambridge problem".
 *   Topics learned before the gate existed start here (re-gating) and keep their schedule.
 * - `mastered`: learned and the gate met.
 * - `unwritten`: on the frontier, but its lesson is not written yet, so it cannot be learned or scheduled.
 * Learned topics, gated or not, unlock what builds on them.
 */
export type TopicStatus = 'mastered' | 'gate' | 'due' | 'ready' | 'unwritten' | 'locked';

export function statusMap(p: Progress, now: number, within: readonly Topic[] = closureTopics(p.courses)): Map<string, TopicStatus> {
  const learned = new Set(Object.keys(p.memory));
  const due = new Set(dueTopics(p.memory, now));
  const ready = new Set(frontier(within, learned));
  const of = (id: string): TopicStatus => {
    if (due.has(id)) return 'due';
    if (learned.has(id)) return isMastered(p, id) ? 'mastered' : 'gate';
    if (ready.has(id)) return hasContent(id) ? 'ready' : 'unwritten';
    return 'locked';
  };
  return new Map(within.map((t) => [t.id, of(t.id)] as const));
}

export interface CourseStats {
  id: string;
  total: number;
  /** Learned and the gate met, due for review or not. */
  mastered: number;
  /** Learned, waiting for the Cambridge gate, due for review or not. */
  needsGate: number;
  due: number;
  ready: number;
  lessonMinutes: number;
}

export function courseStats(p: Progress, courseId: string, now: number): CourseStats {
  const ts = closureTopics([courseId]);
  const st = statusMap(p, now, ts);
  const count = (s: TopicStatus): number => [...st.values()].filter((x) => x === s).length;
  const learned = ts.filter((t) => p.memory[t.id] !== undefined);
  const mastered = learned.filter((t) => isMastered(p, t.id)).length;
  return {
    id: courseId, total: ts.length, mastered, needsGate: learned.length - mastered, due: count('due'), ready: count('ready'),
    lessonMinutes: p.courseMinutes[courseId] ?? 0,
  };
}

/** The learnhub catalog card's summary: mastered topics (gate met) in the chosen courses, out of their closure. */
export function hubSummary(p: Progress, now: number): { done: number; total: number; updated: string } | null {
  const closure = closureOf(p.courses);
  if (closure.size === 0) return null;
  const done = [...closure].filter((id) => isMastered(p, id)).length;
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

// ---------------------------------------------------------------- migration: lapses that no longer count

/**
 * Migration notes, proof gate audit (2026-10-08). The audit moved written proofs off the gates
 * of topics before the first proof lesson, and since then a supervision result below the pass
 * mark on a problem that is not a gate, or that names a prerequisite gap, does not count as a
 * missed review (`lapseExcluded`). A result imported before this build did count: a 12 of 20
 * on the fractions unit-fraction proof halved the fractions interval and brought the review
 * back sooner. This takes such lapses back out, and so a lapse on a problem that has since
 * moved to another topic (`MOVED_PROBLEMS`): it was a review of a topic that no longer sets it.
 *
 * The schedule is stored, not derived, but every change to it is logged in the history, so it
 * is rebuilt (`replayMemory`) twice: from every entry, and without the supervision entries the
 * rule now leaves out (matched to their attempts by topic and import time). Only topics whose
 * two replays differ are touched: the result's topic, and the prerequisites its miss brought
 * due for a check. For each:
 * - stored equals the replay without: already fixed, nothing to do;
 * - stored equals the replay with every entry: the replay is exact for this topic, so the
 *   replay without is the schedule as if the result had never counted, and it replaces it;
 * - otherwise (a placed topic, a graph weight changed since, entries merged in another order):
 *   the replay is not exact, so the stored state is only lengthened, field by field, towards
 *   the replay without (the later due date, the longer interval, the more repetitions, the
 *   fewer lapses), never shortened.
 * Each case is a fixed point, so applying it again changes nothing: it is idempotent, runs on
 * every document loaded, imported, or synced, and needs no version bump. History, results,
 * and redos are kept as they are.
 */
export function withoutStaleLapses(p: Progress): Progress {
  const left = new Set<number>();
  p.history.forEach((h, i) => {
    if (h.kind !== 'supervision' || h.correct) return;
    // Matched by the topic at import: the stored key's, or, imported after its problem moved, the current key's.
    const a = p.supervision.find((x) => x.importedAt === h.at && x.result !== null
      && (topicOfKey(x.problem) === h.topicId || topicOfKey(currentProblemKey(x.problem)) === h.topicId)
      && x.result.mark < SUPERVISION_PASS_MARK);
    // A result on a problem that has since moved topic was a review of the old topic, which no
    // longer sets the problem, so that lapse is left out too.
    if (a !== undefined && a.result !== null && (lapseExcluded(a.problem, a.result) || topicOfKey(currentProblemKey(a.problem)) !== h.topicId)) left.add(i);
  });
  if (left.size === 0) return p;
  const all = replayMemory(p.history, ALL_TOPICS);
  const without = replayMemory(p.history, ALL_TOPICS, (_h, i) => left.has(i));
  let memory: Record<string, MemoryState> | null = null;
  for (const [id, target] of Object.entries(without)) {
    const full = all[id];
    const stored = p.memory[id];
    if (stored === undefined || full === undefined || sameMemoryState(full, target) || sameMemoryState(stored, target)) continue;
    const next: MemoryState = sameMemoryState(stored, full) ? target : {
      ...stored,
      reps: Math.max(stored.reps, target.reps),
      intervalDays: Math.max(stored.intervalDays, target.intervalDays),
      due: Math.max(stored.due, target.due),
      lapses: Math.min(stored.lapses, target.lapses),
    };
    if (sameMemoryState(next, stored)) continue;
    memory ??= { ...p.memory };
    memory[id] = next;
  }
  return memory === null ? p : { ...p, memory };
}
