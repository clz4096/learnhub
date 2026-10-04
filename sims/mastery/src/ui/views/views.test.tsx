import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { IDBFactory } from 'fake-indexeddb';
import type { IdbFactoryLike } from '@learnhub/mastery';
import { DEFAULT_COURSES, finishPlacement, startLearner } from '@/model/learner';
import { HUB_KEY, commit, flush, init, progress, setClock } from '@/model/store';
import { ProgressView, confirms } from '@/ui/views/ProgressView';
import { Today } from '@/ui/views/Today';
import { Start } from '@/ui/views/Start';

const T0 = new Date(2026, 9, 4, 9, 0).getTime();

beforeEach(async () => {
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
    expect(screen.getByText(/at most 49 questions/)).toBeTruthy();
    expect(screen.getByText(/self-report/)).toBeTruthy();
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
