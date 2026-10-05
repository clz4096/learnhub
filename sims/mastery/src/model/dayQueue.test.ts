import { describe, expect, it } from 'vitest';
import { DAY_MS } from '@learnhub/mastery';
import { REDO_MINUTES, dayItems } from './dayQueue';
import { DEFAULT_COURSES, ensureSession, startLearner } from './learner';

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
      redos: [redo('A', T0 - DAY_MS, null), redo('B', T0 + 3 * DAY_MS, null), redo('C', T0 - DAY_MS, T0 - 1000), redo('D', T0 - DAY_MS, T0 - 2 * DAY_MS)],
    };
    const items = dayItems(p, T0);
    expect(items.map((x) => x.key)).toEqual([`redo-${KEY}-A`, `redo-${KEY}-C`]);
    expect(items[0]).toMatchObject({ kind: 'redo', minutes: REDO_MINUTES, done: false, to: { view: 'problem', topicId: 'prob.event-spaces', problemId: 'q4-a-finite' } });
    expect(items[0]?.title.startsWith('Redo: ')).toBe(true);
    expect(items[1]?.done).toBe(true);
  });
});
