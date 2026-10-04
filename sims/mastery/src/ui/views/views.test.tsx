import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { IDBFactory } from 'fake-indexeddb';
import type { IdbFactoryLike } from '@learnhub/mastery';
import { placedMemory, type Progress } from '@learnhub/mastery';
import { DEFAULT_COURSES, finishPlacement, localDay, startLearner } from '@/model/learner';
import { HUB_KEY, commit, flush, init, loadWarnings, progress, setClock } from '@/model/store';
import { ProgressView, confirms } from '@/ui/views/ProgressView';
import { Today } from '@/ui/views/Today';
import { Start } from '@/ui/views/Start';
import { LearnView, TaskView } from '@/ui/views/Task';
import { ALL_EDGES_KEY, MapView, edgesToDraw, wrap } from '@/ui/views/MapView';
import { ALL_TOPICS } from '@/model/courses';

const T0 = new Date(2026, 9, 4, 9, 0).getTime();

beforeEach(async () => {
  // jsdom has no element scrolling; the map scrolls a selected topic into view.
  Element.prototype.scrollTo ??= () => {};
  localStorage.clear();
  setClock(() => T0);
  await init(new IDBFactory() as unknown as IdbFactoryLike);
});
afterEach(cleanup);

async function placedLearner(): Promise<void> {
  await commit(finishPlacement({ ...startLearner(T0, DEFAULT_COURSES, 60), placement: { answers: [], done: false } }, T0));
}

describe('Start', () => {
  it('preselects both courses and 60 minutes', () => {
    render(<Start />);
    const boxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    expect(boxes.map((b) => b.checked)).toEqual([true, true]);
    expect((screen.getByLabelText('Minutes a day') as HTMLInputElement).value).toBe('60');
    expect(screen.getByText(/98 topics in all/)).toBeTruthy();
  });

  it('refuses no course or minutes out of range', () => {
    render(<Start />);
    fireEvent.input(screen.getByLabelText('Minutes a day'), { target: { value: '5' } });
    expect((screen.getByRole('button', { name: 'Continue' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('explains placement, says a wrong answer is fine, and gives the budget', async () => {
    await commit(startLearner(T0, DEFAULT_COURSES, 60));
    render(<Start />);
    expect(screen.getByText(/A wrong answer is fine/)).toBeTruthy();
    // Only the ten topics with written problems are asked about, so at most ten questions.
    expect(screen.getByText(/at most 10 questions/)).toBeTruthy();
    expect(screen.getByText(/Lessons are written for 10 of the 98 topics/)).toBeTruthy();
  });
});

describe('Today', () => {
  it('plans the day with reasons, minutes left, and minutes per course', async () => {
    await placedLearner();
    render(<Today />);
    expect(await screen.findByText('Fractions and ratios')).toBeTruthy();
    expect(screen.getAllByText('New topic: it has no prerequisites.')).toHaveLength(4);
    expect(screen.getByText('minutes left').previousSibling?.textContent).toBe('60');
    expect(screen.getByText('lesson minutes for Probability').previousSibling?.textContent).toBe('30');
    await flush();
    expect(progress.value?.session?.tasks).toHaveLength(4);
  });
});

describe('Progress', () => {
  it('Start over needs the exact phrase', () => {
    expect(confirms('start over')).toBe(true);
    expect(confirms('  Start Over ')).toBe(true);
    for (const t of ['', 'start', 'startover', 'yes', 'start over now']) expect(confirms(t)).toBe(false);
  });

  it('keeps erase disabled until the phrase is typed, then erases and clears the hub key', async () => {
    await placedLearner();
    expect(localStorage.getItem(HUB_KEY)).not.toBeNull();
    render(<ProgressView />);
    const button = screen.getByRole('button', { name: 'Erase my progress' }) as HTMLButtonElement;
    const input = screen.getByLabelText(/to confirm/);
    fireEvent.input(input, { target: { value: 'start' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(button.disabled).toBe(true);
    expect(progress.value?.courses).toHaveLength(2);
    fireEvent.input(input, { target: { value: 'start over' } });
    fireEvent.click(button);
    await flush();
    expect(progress.value?.courses).toEqual([]);
    expect(localStorage.getItem(HUB_KEY)).toBeNull();
  });

  it('settings change daily minutes and course weights', async () => {
    await placedLearner();
    render(<ProgressView />);
    fireEvent.input(screen.getByLabelText('Minutes a day'), { target: { value: '45' } });
    const weights = document.querySelectorAll('input.weight');
    fireEvent.input(weights[1] as HTMLInputElement, { target: { value: '2' } });
    expect(screen.getByText('67% of new lessons')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    await flush();
    expect(progress.value?.settings.budgetMinutes).toBe(45);
    expect(progress.value?.settings.courseWeights).toEqual({ 'ia-probability': 1, 'cst-discrete-maths': 2 });
  });
});

/** Controls or labels that let the learner claim a topic instead of solving a problem. */
const SELF_REPORT = /self-report|I know this|know it already|I still know|I have forgotten|I do not\b(?! know this)/i;

/** The view's own buttons, without its Back link. */
const actions = (): (string | null)[] => screen.getAllByRole('button').filter((b) => !b.classList.contains('back')).map((b) => b.textContent);
const backLink = (): string | null | undefined => document.querySelector('button.back')?.textContent;

function expectNoSelfReport(): void {
  expect(document.body.textContent ?? '').not.toMatch(SELF_REPORT);
  for (const b of screen.queryAllByRole('button')) expect(b.textContent ?? '').not.toMatch(/\bknow\b(?! this$)|forgot/i);
  expect(document.querySelector('.self-report, .badge-self')).toBeNull();
}

describe('no view offers self-report', () => {
  const NO_CONTENT = 'pre.primes-and-factors';
  const T = (kind: 'lesson' | 'review' | 'quiz', topicIds: string[]) => ({ kind, topicIds, minutes: 3, reason: 'r', done: false, passed: null });
  // A stored plan from before the migration, so the views meet topics without content.
  async function withSession(tasks: ReturnType<typeof T>[], memory: Progress['memory'] = {}): Promise<void> {
    await placedLearner();
    const p = progress.value as Progress;
    await commit({ ...p, memory, session: { day: localDay(T0), startedAt: T0, tasks } });
  }

  it('placement asks a real problem; its only shortcut is "I do not know this", which counts as not known', async () => {
    await commit({ ...startLearner(T0, DEFAULT_COURSES, 60), placement: { answers: [], done: false } });
    render(<Start />);
    expect(screen.getByRole('button', { name: 'Check' })).toBeTruthy();
    expect(actions()).toEqual(['Check', 'I do not know this']);
    expect(backLink()).toBe('Back to courses and minutes');
    expectNoSelfReport();
  });

  it('the placement intro', async () => {
    await commit(startLearner(T0, DEFAULT_COURSES, 60));
    render(<Start />);
    expectNoSelfReport();
  });

  it('a lesson without content says it is not written and offers only to leave it', async () => {
    await withSession([T('lesson', [NO_CONTENT])]);
    render(<TaskView index={0} />);
    expect(screen.getByText('Lesson not written yet')).toBeTruthy();
    expect(actions()).toEqual(['Leave it for now']);
    expect(backLink()).toBe('Back to today');
    expectNoSelfReport();
  });

  it('a lesson opened from the map without content offers nothing to pass', async () => {
    await placedLearner();
    render(<LearnView topicId={NO_CONTENT} />);
    expect(actions()).toEqual(['Leave it for now']);
    expect(backLink()).toBe('Back to the map');
    expectNoSelfReport();
  });

  it('a lesson with content goes through practice', async () => {
    await withSession([T('lesson', ['pre.fractions'])]);
    render(<TaskView index={0} />);
    expectNoSelfReport();
  });

  it('a review without content only offers to leave it, and records nothing', async () => {
    await withSession([T('review', [NO_CONTENT])], placedMemory([NO_CONTENT], T0 - 30 * 86_400_000));
    render(<TaskView index={0} />);
    expect(actions()).toEqual(['Leave it for now']);
    expectNoSelfReport();
    fireEvent.click(screen.getByRole('button', { name: 'Leave it for now' }));
    await flush();
    expect(progress.value?.session?.tasks[0]).toMatchObject({ done: true, passed: null });
    expect(progress.value?.history.filter((h) => h.kind === 'review')).toEqual([]);
  });

  it('a review with content asks problems', async () => {
    await withSession([T('review', ['pre.fractions'])], placedMemory(['pre.fractions'], T0 - 30 * 86_400_000));
    render(<TaskView index={0} />);
    expect(screen.getByText('Problem 1 of 2')).toBeTruthy();
    expectNoSelfReport();
  });

  it('a quiz asks only the items with content', async () => {
    await withSession([T('quiz', [NO_CONTENT, 'pre.fractions'])], placedMemory([NO_CONTENT, 'pre.fractions'], T0));
    render(<TaskView index={0} />);
    expect(screen.getByText(/item 1 of 1/)).toBeTruthy();
    expectNoSelfReport();
  });

  it('a quiz with no item with content only offers to leave it', async () => {
    await withSession([T('quiz', [NO_CONTENT])], placedMemory([NO_CONTENT], T0));
    render(<TaskView index={0} />);
    expect(actions()).toEqual(['Leave it for now']);
    expectNoSelfReport();
  });

  it('today, the map, and progress', async () => {
    await placedLearner();
    for (const view of [<Today />, <MapView topicId={NO_CONTENT} />, <MapView topicId={null} />, <ProgressView />]) {
      render(view);
      expectNoSelfReport();
      cleanup();
    }
  });
});

describe('a stored document with self-reported progress', () => {
  it('is migrated on load, saved, and the learner is told what was removed', async () => {
    const idb = new IDBFactory() as unknown as IdbFactoryLike;
    await init(idb);
    await placedLearner();
    const p = progress.value as Progress;
    await commit({ ...p, memory: placedMemory(['pre.fractions', 'pre.primes-and-factors'], T0) });
    await init(idb);
    expect(Object.keys(progress.value?.memory ?? {})).toEqual([]);
    expect(loadWarnings.value.join(' ')).toMatch(/2 topics were marked learned by self-report.*pre\.primes-and-factors/);
    await init(idb);
    expect(loadWarnings.value).toEqual([]);
  });
});

describe('map connections', () => {
  const edges = [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }, { from: 'x', to: 'y' }];

  it('draws only the selected topic\'s edges, prerequisites up and dependents down, and none with no selection', () => {
    expect(edgesToDraw(edges, null, false)).toEqual([]);
    expect(edgesToDraw(edges, 'b', false)).toEqual([{ from: 'a', to: 'b', dir: 'up' }, { from: 'b', to: 'c', dir: 'down' }]);
    expect(edgesToDraw(edges, 'b', true)).toHaveLength(3);
    expect(edgesToDraw(edges, null, true).every((e) => e.dir === null)).toBe(true);
  });

  const paths = (): Element[] => [...document.querySelectorAll('path.edge')];

  it('draws nothing by default, the selected topic\'s edges highlighted when one is chosen', async () => {
    await placedLearner();
    render(<MapView topicId={null} />);
    expect(paths()).toHaveLength(0);
    cleanup();
    render(<MapView topicId="pre.fractions" />);
    expect(paths().length).toBeGreaterThan(0);
    expect(paths().every((e) => e.classList.contains('hot'))).toBe(true);
    expect(paths().some((e) => e.classList.contains('down'))).toBe(true);
  });

  it('"Show all connections" draws every edge, and is remembered', async () => {
    await placedLearner();
    render(<MapView topicId={null} />);
    const box = screen.getByRole('checkbox', { name: 'Show all connections' }) as HTMLInputElement;
    expect(box.checked).toBe(false);
    fireEvent.click(box);
    expect(paths().length).toBeGreaterThan(50);
    expect(localStorage.getItem(ALL_EDGES_KEY)).toBe('1');
    cleanup();
    render(<MapView topicId={null} />);
    expect((screen.getByRole('checkbox', { name: 'Show all connections' }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Show all connections' }));
    expect(localStorage.getItem(ALL_EDGES_KEY)).toBeNull();
  });

  it('works when storage is blocked', async () => {
    await placedLearner();
    const get = Storage.prototype.getItem;
    const set = Storage.prototype.setItem;
    Storage.prototype.getItem = () => { throw new Error('blocked'); };
    Storage.prototype.setItem = () => { throw new Error('blocked'); };
    try {
      render(<MapView topicId={null} />);
      fireEvent.click(screen.getByRole('checkbox', { name: 'Show all connections' }));
      expect(paths().length).toBeGreaterThan(50);
    } finally {
      Storage.prototype.getItem = get;
      Storage.prototype.setItem = set;
    }
  });

  it('shows a frontier topic without content as "Lesson not written yet" in the list and details', async () => {
    await placedLearner();
    render(<MapView topicId="pre.primes-and-factors" />);
    fireEvent.click(screen.getByRole('button', { name: 'List' }));
    expect(screen.getAllByText('Lesson not written yet').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByRole('button', { name: 'Learn it now' })).toBeNull();
  });
});

describe('map labels', () => {
  it('wrap every title into at most three lines of 19 characters', () => {
    let cut = 0;
    for (const t of ALL_TOPICS) {
      const lines = wrap(t.title);
      expect(lines.length).toBeLessThanOrEqual(3);
      for (const l of lines) expect(l.length).toBeLessThanOrEqual(19);
      if (lines.at(-1)?.endsWith('…')) cut++;
    }
    // Labels this size cost a few long titles their tail; the details panel and list show them in full.
    expect(cut).toBeLessThanOrEqual(3);
  });

  it('cuts with an ellipsis past the last line', () => {
    expect(wrap('one two three four five six seven', 9, 2)).toEqual(['one two', 'three fo…']);
  });
});
