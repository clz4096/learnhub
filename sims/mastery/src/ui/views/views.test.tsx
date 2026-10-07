import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { IDBFactory } from 'fake-indexeddb';
import type { IdbFactoryLike } from '@learnhub/mastery';
import { ancestors, placedMemory, type Progress } from '@learnhub/mastery';
import { DEFAULT_COURSES, localDay, startLearner } from '@/model/learner';
import { route } from '@/model/route';
import { HUB_KEY, commit, flush, init, loadWarnings, progress, setClock } from '@/model/store';
import { ProgressView, confirms } from '@/ui/views/ProgressView';
import { Today } from '@/ui/views/Today';
import { Start } from '@/ui/views/Start';
import { LearnView, TaskView, quizConsequence, reviewConsequence } from '@/ui/views/Task';
import { practiceConsequence } from '@/ui/views/Lesson';
import { freshPractice } from '@/model/practice';
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

async function startedLearner(): Promise<void> {
  await commit(startLearner(T0, DEFAULT_COURSES, 60));
}

describe('Start', () => {
  it('offers one course option, chosen, and 60 minutes', () => {
    render(<Start />);
    const options = screen.getAllByRole('radio') as HTMLInputElement[];
    expect(options).toHaveLength(1);
    expect(options[0]?.checked).toBe(true);
    expect(screen.getByLabelText('Probability and Discrete Mathematics')).toBe(options[0]);
    expect(screen.queryAllByRole('checkbox')).toEqual([]);
    expect((screen.getByLabelText('Minutes a day') as HTMLInputElement).value).toBe('60');
    expect(screen.getByText(/110 topics in all/)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/placement/i);
  });

  it('refuses minutes out of range', () => {
    render(<Start />);
    fireEvent.input(screen.getByLabelText('Minutes a day'), { target: { value: '5' } });
    expect((screen.getByRole('button', { name: 'Start learning' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('choosing it starts both courses from scratch and goes to Today', async () => {
    render(<Start />);
    fireEvent.input(screen.getByLabelText('Minutes a day'), { target: { value: '45' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start learning' }));
    await flush();
    expect(progress.value).toMatchObject({ courses: ['ia-probability', 'cst-discrete-maths'], memory: {}, placement: null, settings: { budgetMinutes: 45 } });
    expect(route.value).toEqual({ view: 'today' });
  });
});

describe('Today', () => {
  it('plans the day with reasons, minutes left, and minutes per course', async () => {
    await startedLearner();
    render(<Today />);
    expect(await screen.findByText('Fractions and ratios', { selector: '.task-title' })).toBeTruthy();
    // The first three steps of the book: 15, 15, and 20 minutes; the next (15) does not fit the 10 left.
    expect(screen.getAllByText('New topic: it has no prerequisites.')).toHaveLength(3);
    expect(screen.getByText('minutes left').previousSibling?.textContent).toBe('50');
    expect(screen.getByText('lesson minutes for Probability').previousSibling?.textContent).toBe('30');
    await flush();
    expect(progress.value?.session?.tasks).toHaveLength(3);
  });
});

describe('Progress', () => {
  it('Start over needs the exact phrase', () => {
    expect(confirms('start over')).toBe(true);
    expect(confirms('  Start Over ')).toBe(true);
    for (const t of ['', 'start', 'startover', 'yes', 'start over now']) expect(confirms(t)).toBe(false);
  });

  it('keeps erase disabled until the phrase is typed, then erases and clears the hub key', async () => {
    await startedLearner();
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
    await startedLearner();
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
// The answer box's symbol keys are not actions.
const actions = (): (string | null)[] => screen.getAllByRole('button').filter((b) => !b.classList.contains('back') && !b.classList.contains('key')).map((b) => b.textContent);
const backLink = (): string | null | undefined => document.querySelector('button.back')?.textContent;

function expectNoSelfReport(): void {
  expect(document.body.textContent ?? '').not.toMatch(SELF_REPORT);
  // "I do not know this" may say what it costs, in brackets, and nothing else.
  for (const b of screen.queryAllByRole('button')) expect(b.textContent ?? '').not.toMatch(/\bknow\b(?! this(?: \([^()]*\))?$)|forgot/i);
  expect(document.querySelector('.self-report, .badge-self')).toBeNull();
}

describe('no view offers self-report', () => {
  // Every root of the courses' closure has a lesson, so use a topic whose prerequisites all do (content.test.ts's probe).
  const NO_CONTENT = 'prob.simpsons-paradox';
  const T = (kind: 'lesson' | 'review' | 'quiz', topicIds: string[]) => ({ kind, topicIds, minutes: 3, reason: 'r', done: false, passed: null });
  // A stored plan from before the migration, so the views meet topics without content.
  async function withSession(tasks: ReturnType<typeof T>[], memory: Progress['memory'] = {}): Promise<void> {
    await startedLearner();
    const p = progress.value as Progress;
    await commit({ ...p, memory, session: { day: localDay(T0), startedAt: T0, tasks } });
  }

  it('the start screen', () => {
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
    await startedLearner();
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
    await startedLearner();
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
    await startedLearner();
    const p = progress.value as Progress;
    await commit({ ...p, memory: placedMemory(['pre.fractions', 'prob.simpsons-paradox'], T0) });
    await init(idb);
    expect(Object.keys(progress.value?.memory ?? {})).toEqual([]);
    expect(loadWarnings.value.join(' ')).toMatch(/2 topics were marked learned by self-report.*prob\.simpsons-paradox/);
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
    await startedLearner();
    render(<MapView topicId={null} />);
    expect(paths()).toHaveLength(0);
    cleanup();
    render(<MapView topicId="pre.fractions" />);
    expect(paths().length).toBeGreaterThan(0);
    expect(paths().every((e) => e.classList.contains('hot'))).toBe(true);
    expect(paths().some((e) => e.classList.contains('down'))).toBe(true);
  });

  it('"Show all connections" draws every edge, and is remembered', async () => {
    await startedLearner();
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
    await startedLearner();
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
    await startedLearner();
    // Learn everything below a topic without content, so it is on the frontier.
    await commit({ ...(progress.value as Progress), memory: placedMemory([...ancestors(ALL_TOPICS, 'prob.simpsons-paradox')], T0) });
    render(<MapView topicId="prob.simpsons-paradox" />);
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

describe('what one answer does to progress, as the result says it', () => {
  const rule = { correctInARow: 3, maxProblems: 10 };

  it('practice: a miss resets the count and says how many problems are left', () => {
    expect(practiceConsequence(freshPractice(), rule, 'wrong')).toEqual({ effect: 'This counts as a miss: right in a row goes back to 0. 9 problems left in this run.' });
    expect(practiceConsequence(freshPractice(), rule, 'gave-up').effect).toMatch(/^Showing the solution counts as a miss: right in a row goes back to 0/);
    expect(practiceConsequence({ attempts: 2, streak: 2, results: [true, true] }, rule, 'correct')).toEqual({ effect: 'That makes 3 right in a row: the topic is learned.', next: 'Finish the lesson' });
    expect(practiceConsequence({ attempts: 1, streak: 1, results: [true] }, rule, 'correct')).toEqual({ effect: 'Right in a row: 2 of 3.' });
    // Seven answered, none right: one more miss leaves 2 problems, too few for three in a row.
    const late = { attempts: 7, streak: 0, results: Array<boolean>(7).fill(false) };
    expect(practiceConsequence(late, rule, 'wrong')).toMatchObject({ next: 'See the result' });
    expect(practiceConsequence(late, rule, 'wrong').effect).toMatch(/practice ends here/);
  });

  it('review: says when a miss fails the review, including a right answer after a miss', () => {
    expect(reviewConsequence([], 'wrong')).toEqual({ effect: 'A review passes only when both problems are right, so this review is missed. The topic comes back sooner.', next: 'Next problem' });
    expect(reviewConsequence([false], 'correct').effect).toBe('Right, but problem 1 was missed, so this review is missed. The topic comes back sooner.');
    expect(reviewConsequence([true], 'correct')).toEqual({ effect: 'Both problems right: the review passes, and the next one is further away.', next: 'Finish the review' });
  });

  it('quiz', () => {
    expect(quizConsequence('Fractions', false, 'wrong')).toEqual({ effect: 'This counts as a missed review of Fractions: it comes back sooner.', next: 'Next item' });
    expect(quizConsequence('Fractions', true, 'correct').next).toBe('Finish the quiz');
  });

  it('a wrong review answer shows the result above the button, with its effect, and is recorded only once both are answered', async () => {
    await startedLearner();
    const p = progress.value as Progress;
    await commit({ ...p, memory: placedMemory(['pre.fractions'], T0 - 30 * 86_400_000), session: { day: localDay(T0), startedAt: T0, tasks: [{ kind: 'review', topicIds: ['pre.fractions'], minutes: 3, reason: 'r', done: false, passed: null }] } });
    render(<TaskView index={0} />);
    fireEvent.input(screen.getByLabelText('Your answer'), { target: { value: '987654321' } });
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByRole('heading', { name: 'Incorrect' })).toBeTruthy();
    expect(screen.getByText(/so this review is missed/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next problem' }));
    expect(screen.getByText('Problem 2 of 2')).toBeTruthy();
    expect(progress.value?.session?.tasks[0]?.done).toBe(false);
  });
});
