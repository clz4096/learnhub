/**
 * The day planner's queue, from what Today already has: today's session tasks (new
 * lessons, reviews, quizzes, in the session's order) and supervision redos due today.
 * Done items stay in the queue, so finishing one never moves the others between blocks.
 */
import type { Progress } from '@learnhub/mastery';
import type { Fillable } from './day';
import { titleOf } from './courses';
import { catalogTitle } from './supervision';
import { localDay, topicOfKey } from './learner';
import type { Route } from './route';

/** A redo has no planned length; this is an assumption for packing it into a block. */
export const REDO_MINUTES = 30;

export interface DayItem extends Fillable {
  key: string;
  title: string;
  to: Route;
  done: boolean;
}

export function dayItems(p: Progress, now: number): DayItem[] {
  const today = localDay(now);
  const items: DayItem[] = [];
  if (p.session !== null && p.session.day === today) {
    p.session.tasks.forEach((t, i) => {
      const title = t.kind === 'quiz' ? `Quiz: ${t.topicIds.map(titleOf).join(', ')}` : titleOf(t.topicIds[0] as string);
      items.push({ key: `task-${i}`, kind: t.kind, minutes: t.minutes, title, to: { view: 'task', index: i }, done: t.done });
    });
  }
  const dayStart = new Date(`${today}T00:00`).getTime();
  const dayEnd = new Date(`${localDay(dayStart + 36 * 3600 * 1000)}T00:00`).getTime();
  for (const d of p.redos) {
    const open = d.doneAt === null && d.due < dayEnd;
    const doneToday = d.doneAt !== null && d.doneAt >= dayStart;
    if (!open && !doneToday) continue;
    const topicId = topicOfKey(d.problem);
    items.push({
      key: `redo-${d.problem}-${d.from}`, kind: 'redo', minutes: REDO_MINUTES,
      title: `Redo: ${catalogTitle(d.problem) ?? d.problem}`,
      to: { view: 'problem', topicId, problemId: d.problem.slice(d.problem.indexOf('/') + 1) },
      done: d.doneAt !== null,
    });
  }
  return items;
}
