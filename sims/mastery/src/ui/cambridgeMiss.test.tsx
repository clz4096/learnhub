/**
 * A learner's walk through a missed Cambridge problem (mastery/HOW-A-TOPIC-WORKS.md, rule 3,
 * approved 2026-10-08): a miss says "Not right yet" with the nudge, the hints open one at a
 * time, the solution is never shown, the problem rests and comes back, and a right answer then
 * meets the gate. "Show me the solution" asks first, and once used the problem never counts.
 */
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { IDBFactory } from 'fake-indexeddb';
import { CONTENT_IDS, t, type AutoProblem, type TopicContent } from '@learnhub/content';
import { contentFor } from '@learnhub/content/all';
import { DAY_MS, type IdbFactoryLike } from '@learnhub/mastery';
import { contentStore } from '@/model/content';
import { DEFAULT_COURSES, MISS_RETURN_DAYS, completeLesson, ensureSession, masteryOf, startLearner } from '@/model/learner';
import { commit, init, progress, setClock } from '@/model/store';
import { GENERIC_NUDGE, REVEAL_WARNING } from '@/ui/ProblemCard';
import { CambridgeItem } from '@/ui/views/Lesson';

const T0 = new Date(2026, 9, 5, 9, 0).getTime();
const TOPIC = 'prob.bayes-two-events';
const c = contentFor(TOPIC) as TopicContent;
// A gate problem answered by typing, so the test can answer it.
const gate = c.cambridge.find((p): p is AutoProblem => p.mode === 'auto' && c.gate.includes(p.id) && typeof p.instance.reference === 'string'
  && p.instance.problem.answer.kind !== 'choice' && p.instance.problem.answer.kind !== 'table') as AutoProblem;
const KEY = `${TOPIC}/${gate.id}`;
// Help written here: content hints are a later job, and the walk must not depend on them.
const HINTS = [t`Which event is conditioned on?`, t`What does Bayes' formula give for that event?`];
const NUDGE = t`Not quite. Writing the events down first is the faster route.`;
const helped: AutoProblem = { ...gate, hints: HINTS, nudge: NUDGE };

beforeEach(async () => {
  Element.prototype.scrollTo ??= () => {};
  sessionStorage.clear();
  localStorage.clear();
  setClock(() => T0);
  await init(new IDBFactory() as unknown as IdbFactoryLike);
  // The practice is passed, so the gate is all that is left.
  await commit(completeLesson(ensureSession(startLearner(T0, DEFAULT_COURSES, 60), T0), TOPIC, true, T0, null, 15));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  sessionStorage.clear();
  localStorage.clear();
});

await Promise.all(CONTENT_IDS.map((id) => contentStore.load(id)));

const show = (p: AutoProblem = helped) => render(<CambridgeItem c={c} p={p} n={1} />);
const box = (): HTMLInputElement => document.querySelector('form.answer input') as HTMLInputElement;
const answer = (text: string): void => {
  fireEvent.input(box(), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: 'Check' }));
  // A reading with a form note asks first; the walk always means its answer.
  const anyway = screen.queryByRole('button', { name: 'Check anyway' });
  if (anyway !== null) fireEvent.click(anyway);
};
const head = (): string => document.querySelector('.result-head > span:last-child')?.textContent ?? '';
const hints = (): string[] => [...document.querySelectorAll('.hint-list li')].map((x) => x.textContent ?? '');
const cambridge = () => progress.value?.history.filter((h) => h.kind === 'cambridge') ?? [];
const WRONG = '999';

describe('a missed single-answer Cambridge problem', () => {
  it('gets "Not right yet", the nudge, and hints one at a time, never the solution; it comes back, and a right answer then counts', async () => {
    expect(gate).toBeDefined();
    show();
    answer(WRONG);
    expect(head()).toBe('Not right yet');
    expect(document.querySelector('.result-block')?.textContent).toContain('Writing the events down first is the faster route.');
    // No answer, no worked solution, and nothing to move on to: the problem rests.
    expect(document.querySelector('.result-solution')).toBeNull();
    expect(screen.queryByText('Correct answer')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Try it again' })).toBeNull();
    expect(document.querySelector('.result-effect')?.textContent).toMatch(/comes back on .*, and a right answer then still counts/);

    // Logged without the solution, and set to come back.
    await waitFor(() => expect(cambridge()).toHaveLength(1));
    expect(cambridge()[0]).toMatchObject({ correct: false, item: { id: KEY, hints: 0, attempt: 1 } });
    expect(cambridge()[0]?.item?.solution).toBeUndefined();
    expect(progress.value?.redos).toEqual([expect.objectContaining({ problem: KEY, due: T0 + MISS_RETURN_DAYS * DAY_MS, doneAt: null })]);

    // The hints, one at a time; then none is left to open.
    expect(hints()).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Show a hint' }));
    expect(hints()).toEqual(['Which event is conditioned on?']);
    fireEvent.click(screen.getByRole('button', { name: 'Show the next hint' }));
    expect(hints()).toEqual(['Which event is conditioned on?', 'What does Bayes\' formula give for that event?']);
    expect(screen.queryByRole('button', { name: /Show (a|the next) hint/ })).toBeNull();
    expect(masteryOf(progress.value!, TOPIC).stage).toBe('needs-gate');

    // The next day it rests: the hints so far, when it comes back, and no answer box.
    cleanup();
    setClock(() => T0 + DAY_MS);
    show();
    expect(document.querySelector('[data-resting]')?.textContent).toMatch(/Not right yet\. It comes back on /);
    expect(document.querySelector('form.answer')).toBeNull();
    expect(hints()).toHaveLength(2);

    // When it comes back it takes an answer, with the hints above it; a right answer meets the gate.
    cleanup();
    const back = T0 + MISS_RETURN_DAYS * DAY_MS + 60_000;
    setClock(() => back);
    show();
    expect(hints()).toHaveLength(2);
    answer(gate.instance.reference as string);
    expect(head()).toMatch(/^Right: .+\.$/);
    await waitFor(() => expect(cambridge()).toHaveLength(2));
    expect(cambridge()[1]).toMatchObject({ correct: true, item: { id: KEY, hints: 2, attempt: 2 } });
    expect(masteryOf(progress.value!, TOPIC)).toMatchObject({ stage: 'mastered', evidence: { kind: 'auto', problem: KEY, at: back, hints: 2 } });
    // The return is done.
    expect(progress.value?.redos.map((d) => d.doneAt)).toEqual([back]);
  });

  it('without a nudge of its own, the miss shows a neutral generic line', async () => {
    // The content's own nudge is dropped: this is about a problem written without one.
    const { nudge: _own, ...bare } = gate;
    show(bare);
    answer(WRONG);
    expect(head()).toBe('Not right yet');
    expect(document.querySelector('.result-block')?.textContent).toContain(GENERIC_NUDGE);
  });
});

describe('Show me the solution', () => {
  it('asks first, can be called off, and once used the problem never counts, even answered right later', async () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Show me the solution' }));
    expect(screen.getByText(REVEAL_WARNING)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Keep trying' }));
    expect(screen.queryByText(REVEAL_WARNING)).toBeNull();
    expect(document.querySelector('.result-solution')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Show me the solution' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show the solution' }));
    expect(document.querySelector('.result-solution')).not.toBeNull();
    await waitFor(() => expect(cambridge()).toHaveLength(1));
    expect(cambridge()[0]).toMatchObject({ correct: false, item: { id: KEY, solution: true } });
    // Nothing is scheduled: the problem can no longer count.
    expect(progress.value?.redos).toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: 'Try it again' }));
    answer(gate.instance.reference as string);
    await waitFor(() => expect(cambridge()).toHaveLength(2));
    expect(masteryOf(progress.value!, TOPIC).stage).toBe('needs-gate');
    // The page says why, and a miss now shows the worked solution as plain practice.
    cleanup();
    show();
    expect(document.body.textContent).toContain('The solution has been shown, so this problem no longer counts');
    answer(WRONG);
    expect(head()).toBe('Incorrect');
    expect(document.querySelector('.result-solution')).not.toBeNull();
  });

  it('from a resting problem: asks first, then shows the solution, and the problem never counts', async () => {
    show();
    answer(WRONG);
    await waitFor(() => expect(cambridge()).toHaveLength(1));
    cleanup();
    setClock(() => T0 + DAY_MS);
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Show me the solution' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show the solution' }));
    await waitFor(() => expect(cambridge()).toHaveLength(2));
    expect(cambridge()[1]?.item?.solution).toBe(true);
    expect(document.querySelector('.result-solution')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Try it again' }));
    answer(gate.instance.reference as string);
    await waitFor(() => expect(cambridge()).toHaveLength(3));
    expect(masteryOf(progress.value!, TOPIC).stage).toBe('needs-gate');
  });

  it('after a miss, from the result: asks first, then shows the answer and the worked solution', async () => {
    show();
    answer(WRONG);
    fireEvent.click(screen.getByRole('button', { name: 'Show me the solution' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show the solution' }));
    expect(head()).toBe('Solution');
    expect(document.querySelector('.result-solution')).not.toBeNull();
    await waitFor(() => expect(cambridge()).toHaveLength(2));
    expect(cambridge().map((h) => h.item?.solution)).toEqual([undefined, true]);
  });
});
