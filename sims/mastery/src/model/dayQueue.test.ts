import { describe, expect, it } from 'vitest';
import { DAY_MS } from '@learnhub/mastery';
import { REDO_MINUTES, dayItems, dayTasks, replanDayTasks, withDayTasks } from './dayQueue';
import { DEFAULT_COURSES, completeLesson, ensureSession, startLearner } from './learner';

const T0 = new Date(2026, 9, 5, 11, 0).getTime();
const KEY = 'prob.event-spaces/q4-a-finite';

describe('dayItems', () => {
  it('lists today\'s session tasks in order, each linked to its task', () => {
    const p = ensureSession(startLearner(T0, DEFAULT_COURSES, 60), T0);
    const items = dayItems(p, T0);
    expect(items.length).toBe(p.session?.tasks.length);
    items.forEach((x, i) => {
      expect(x.to).toEqual({ view: 'task', index: i });
      expect(x.kind).toBe(p.session?.tasks[i]?.kind);
      expect(x.done).toBe(false);
      expect(x.forecast).toBe(false);
    });
  });

  it('has no session items from another day', () => {
    const p = ensureSession(startLearner(T0, DEFAULT_COURSES, 60), T0);
    expect(dayItems(p, T0 + DAY_MS)).toEqual([]);
  });

  it('adds redos due today and redos done today, not those due later or done before', () => {
    const base = startLearner(T0, DEFAULT_COURSES, 60);
    const redo = (from: string, due: number, doneAt: number | null) => ({ problem: KEY, from, setAt: T0 - 2 * DAY_MS, due, doneAt });
    const p = {
      ...base,
      // A was set by a supervisor (its attempt is in the document); C by a missed problem.
      supervision: [{ problem: KEY, nonce: 'A', writeUp: '', copiedAt: T0 - 3 * DAY_MS, result: null, importedAt: null }],
      redos: [redo('A', T0 - DAY_MS, null), redo('B', T0 + 3 * DAY_MS, null), redo('C', T0 - DAY_MS, T0 - 1000), redo('D', T0 - DAY_MS, T0 - 2 * DAY_MS)],
    };
    const items = dayItems(p, T0);
    expect(items.map((x) => x.key)).toEqual([`redo-${KEY}-A`, `redo-${KEY}-C`]);
    expect(items[0]).toMatchObject({ kind: 'redo', minutes: REDO_MINUTES, done: false, to: { view: 'problem', topicId: 'prob.event-spaces', problemId: 'q4-a-finite' } });
    expect(items[0]?.title.startsWith('Redo: ')).toBe(true);
    expect(items[1]?.done).toBe(true);
    expect(items[1]?.title.startsWith('Try again: ')).toBe(true);
  });
});

const sum = (ts: readonly { minutes: number }[]): number => ts.reduce((a, t) => a + t.minutes, 0);
const DAY = 480;

describe('the day\'s tasks beyond the daily budget', () => {
  const p = ensureSession(startLearner(T0, DEFAULT_COURSES, 60), T0);
  const session = p.session?.tasks ?? [];

  it('keeps the session as it is, then plans on with the app\'s scheduler to fill the day', () => {
    const ts = dayTasks(p, T0, DAY);
    expect(ts.slice(0, session.length)).toEqual(session);
    expect(sum(ts)).toBeGreaterThan(sum(session));
    expect(sum(ts)).toBeLessThanOrEqual(DAY);
    // Each round only takes what fits, so the day ends within one lesson of full.
    expect(sum(ts)).toBeGreaterThan(DAY - 25);
    // Later rounds take lessons the earlier ones unlock, and nothing is learned twice.
    const lessons = ts.filter((t) => t.kind === 'lesson').map((t) => t.topicIds[0]);
    expect(new Set(lessons).size).toBe(lessons.length);
    expect(ts.every((t) => !t.done)).toBe(true);
    expect(p.settings.budgetMinutes).toBe(60);
  });

  it('is the session alone when the budget is no more than it', () => {
    expect(dayTasks(p, T0, sum(session))).toEqual(session);
    expect(dayTasks(p, T0, 0)).toEqual(session);
  });

  it('marks forecast items, linked to the task they will become', () => {
    const items = dayItems(p, T0, DAY);
    expect(items.length).toBe(dayTasks(p, T0, DAY).length);
    items.forEach((x, i) => {
      expect(x.to).toEqual({ view: 'task', index: i });
      expect(x.forecast).toBe(i >= session.length);
    });
  });

  it('withDayTasks adds the forecast to the session and leaves the settings alone', () => {
    const q = withDayTasks(p, T0 + 1000, DAY);
    expect(q.session?.tasks).toEqual(dayTasks(p, T0 + 1000, DAY));
    expect(q.settings).toBe(p.settings);
    expect(q.memory).toBe(p.memory);
    // Once added, the queue is stable: nothing more to forecast.
    expect(withDayTasks(q, T0 + 2000, DAY)).toBe(q);
  });

  it('replanDayTasks keeps done tasks and plans the rest again', () => {
    const q = withDayTasks(p, T0, DAY);
    const first = q.session?.tasks[0];
    expect(first?.kind).toBe('lesson');
    const failed = completeLesson(q, first?.topicIds[0] as string, false, T0 + 1000, 0, first?.minutes as number);
    const r = replanDayTasks(failed, T0 + 2000, DAY);
    const ts = r.session?.tasks ?? [];
    expect(ts[0]).toMatchObject({ topicIds: first?.topicIds, done: true, passed: false });
    expect(ts.slice(1).every((t) => !t.done)).toBe(true);
    expect(sum(ts)).toBeLessThanOrEqual(DAY);
    expect(r.settings).toBe(p.settings);
  });

  it('plans nothing before a course is chosen', () => {
    const none = { ...startLearner(T0, [], 60), courses: [] };
    expect(dayTasks(none, T0, DAY)).toEqual([]);
    expect(withDayTasks(none, T0, DAY)).toBe(none);
  });
});
