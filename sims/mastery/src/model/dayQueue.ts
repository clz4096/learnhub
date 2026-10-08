/**
 * The day planner's queue: today's session tasks (new lessons, reviews, quizzes, in the
 * session's order), then more of the same planned for the day's study minutes, then the
 * day's blind mixed review once three topics are mastered, then supervision redos due today. Done items stay in the queue, so finishing one never moves
 * the others between blocks.
 *
 * The session is planned for the learner's daily budget (60 minutes by default); the day
 * planner has 6 to 8 hours to fill. `dayTasks` plans the rest with the app's own
 * `planMore` at the larger budget, round after round, assuming each round's tasks are
 * passed so the next round can take the lessons they unlock. The budget setting is never
 * changed. Tasks past the session are a forecast until `withDayTasks` adds them to it,
 * when the learner opens one or plans the day.
 */
import type { Progress, SessionTask } from '@learnhub/mastery';
import type { Fillable } from './day';
import { titleOf } from './courses';
import { catalogTitle } from './supervision';
import { completeLesson, completeQuiz, completeReview, ensureSession, localDay, planMore, redoWaitsFor, topicOfKey } from './learner';
import { MIXED_MINUTES, mixedReady } from './mixedReview';
import type { Route } from './route';

/** A redo has no planned length; this is an assumption for packing it into a block. */
export const REDO_MINUTES = 30;
/** Rounds of `planMore` at most; each round only takes what the one before unlocks. */
const MAX_ROUNDS = 40;

export interface DayItem extends Fillable {
  key: string;
  title: string;
  to: Route;
  done: boolean;
  /** In the forecast, not yet in the session: opening it adds the forecast to the session first. */
  forecast: boolean;
}

/** `p` with every open session task passed, as the next round's starting point. */
function passAll(p: Progress, now: number): Progress {
  let q = p;
  (p.session?.tasks ?? []).forEach((t, i) => {
    if (t.done) return;
    const id = t.topicIds[0] as string;
    if (t.kind === 'lesson') q = completeLesson(q, id, true, now, i, t.minutes, t.course);
    else if (t.kind === 'review') q = completeReview(q, id, true, now, i);
    else q = completeQuiz(q, Object.fromEntries(t.topicIds.map((x) => [x, true])), now, i);
  });
  return q;
}

/** `base`'s session tasks, then a forecast from `planMore` until they hold `budget` minutes or nothing more fits. */
function project(base: Progress, now: number, budget: number): SessionTask[] {
  const s = base.session;
  if (s === null) return [];
  const tasks = [...s.tasks];
  let total = tasks.reduce((a, t) => a + t.minutes, 0);
  let sim = base;
  for (let round = 0; round < MAX_ROUNDS && total < budget; round++) {
    const passed = passAll(sim, now);
    const n = passed.session?.tasks.length ?? 0;
    const next = planMore({ ...passed, settings: { ...passed.settings, budgetMinutes: budget - total } }, now);
    const added = next.session?.tasks.slice(n) ?? [];
    if (added.length === 0) break;
    tasks.push(...added.map((t) => ({ ...t, topicIds: [...t.topicIds] })));
    total += added.reduce((a, t) => a + t.minutes, 0);
    sim = next;
  }
  return tasks;
}

/** Today's tasks for `budget` minutes: the session's tasks as they are, then the forecast. Empty before a course is chosen. */
export function dayTasks(p: Progress, now: number, budget: number): SessionTask[] {
  return project(ensureSession(p, now), now, budget);
}

/** `p` with the forecast added to today's session, so every task of the day can be opened. The settings are unchanged. */
export function withDayTasks(p: Progress, now: number, budget: number): Progress {
  const base = ensureSession(p, now);
  const s = base.session;
  if (s === null) return base;
  const tasks = project(base, now, budget);
  return tasks.length === s.tasks.length ? base : { ...base, updatedAt: now, session: { ...s, tasks } };
}

/**
 * The rest of today planned again for `budget` minutes: done tasks stay, the open ones are
 * replaced by a fresh plan and forecast from what is known now, so the lessons that
 * depended on a failed one drop out. The settings are unchanged.
 */
export function replanDayTasks(p: Progress, now: number, budget: number): Progress {
  const base = ensureSession(p, now);
  const s = base.session;
  if (s === null) return base;
  const kept: Progress = { ...base, session: { ...s, tasks: s.tasks.filter((t) => t.done) } };
  return { ...base, updatedAt: now, session: { ...s, tasks: project(kept, now, budget) } };
}

/** The planner's title for the day's mixed review. */
export const MIXED_TITLE = 'Review: mixed';

/**
 * The queue: today's session tasks, then with a `budget` the forecast for that many
 * minutes, then the mixed review when there is enough mastered to mix (`mixedDone`: it
 * was finished today), then redos due or done today.
 */
export function dayItems(p: Progress, now: number, budget = 0, mixedDone = false): DayItem[] {
  const today = localDay(now);
  const own = p.session !== null && p.session.day === today ? p.session.tasks : [];
  const tasks = budget > 0 ? dayTasks(p, now, budget) : own;
  const items: DayItem[] = tasks.map((t, i) => ({
    key: `task-${i}`, kind: t.kind, minutes: t.minutes,
    title: t.kind === 'quiz' ? `Quiz: ${t.topicIds.map(titleOf).join(', ')}` : titleOf(t.topicIds[0] as string),
    to: { view: 'task', index: i }, done: t.done, forecast: i >= own.length,
  }));
  if (mixedReady(p)) items.push({ key: 'mixed', kind: 'mixed', minutes: MIXED_MINUTES, title: MIXED_TITLE, to: { view: 'mixed' }, done: mixedDone, forecast: false });
  const dayStart = new Date(`${today}T00:00`).getTime();
  const dayEnd = new Date(`${localDay(dayStart + 36 * 3600 * 1000)}T00:00`).getTime();
  for (const d of p.redos) {
    // A redo waiting for a prerequisite topic (`redoWaitsFor`) is not today's work.
    const open = d.doneAt === null && d.due < dayEnd && redoWaitsFor(p, d) === undefined;
    const doneToday = d.doneAt !== null && d.doneAt >= dayStart;
    if (!open && !doneToday) continue;
    const topicId = topicOfKey(d.problem);
    items.push({
      key: `redo-${d.problem}-${d.from}`, kind: 'redo', minutes: REDO_MINUTES,
      title: `Redo: ${catalogTitle(d.problem) ?? d.problem}`,
      to: { view: 'problem', topicId, problemId: d.problem.slice(d.problem.indexOf('/') + 1) },
      done: d.doneAt !== null, forecast: false,
    });
  }
  return items;
}
