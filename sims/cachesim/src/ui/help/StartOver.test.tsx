import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { StartOver, confirms } from '@/ui/help/StartOver';
import { LESSONS } from '@/ui/modes/lessons';
import { HUB_PROGRESS_KEY, PROGRESS_KEY, freshProgress, isDone, progress, saveProgress } from '@/ui/modes/progress';

const doneLessons = () => LESSONS.filter((l) => isDone(progress.value, l.id)).length;

beforeEach(() => {
  localStorage.clear();
  const p = freshProgress();
  for (const l of LESSONS.slice(0, 3)) p.answer[l.id] = l.question.choices.findIndex((c) => c.correct);
  progress.value = p;
  saveProgress(p);
});
afterEach(cleanup);

describe('Start over', () => {
  it('needs the exact phrase, ignoring case and spaces at the ends', () => {
    expect(confirms('start over')).toBe(true);
    expect(confirms('  Start Over ')).toBe(true);
    for (const t of ['', 'start', 'startover', 'yes', 'start over now']) expect(confirms(t)).toBe(false);
  });

  it('keeps the erase button disabled until the phrase is typed, and Enter does nothing before that', () => {
    render(<StartOver />);
    expect(screen.getByText(/3 of 10 lessons done/)).toBeTruthy();
    const button = screen.getByRole('button', { name: 'Erase my progress' }) as HTMLButtonElement;
    const input = screen.getByLabelText(/to confirm/);
    expect(button.disabled).toBe(true);
    fireEvent.input(input, { target: { value: 'start' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(button.disabled).toBe(true);
    expect(doneLessons()).toBe(3);
  });

  it('erases lesson progress and the hub summary once confirmed', () => {
    render(<StartOver />);
    fireEvent.input(screen.getByLabelText(/to confirm/), { target: { value: 'start over' } });
    fireEvent.click(screen.getByRole('button', { name: 'Erase my progress' }));
    expect(doneLessons()).toBe(0);
    expect(JSON.parse(localStorage.getItem(PROGRESS_KEY)!)).toEqual(freshProgress());
    expect(JSON.parse(localStorage.getItem(HUB_PROGRESS_KEY)!)).toMatchObject({ done: 0, total: LESSONS.length });
    expect(screen.getByRole('status').textContent).toMatch(/Progress erased/);
    expect((screen.getByLabelText(/to confirm/) as HTMLInputElement).value).toBe('');
  });
});
