/**
 * Begin the day on Today: the plan from the wake time, its blocks filled from today's real
 * session with links into it, tick-off kept in this browser, the week's hours, Shabbat
 * times, and the renamed header with its disclaimer.
 */
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { IDBFactory } from 'fake-indexeddb';
import type { IdbFactoryLike } from '@learnhub/mastery';
import { DAY_KEY } from '@/model/dayLog';
import { DEFAULT_COURSES, ensureSession, startLearner } from '@/model/learner';
import { parseRoute, route } from '@/model/route';
import { commit, init, progress, setClock } from '@/model/store';
import { APP_TITLE, App } from '@/ui/App';

// Monday 2026-10-05, 11:00 am in New York (EDT, UTC-4).
const T0 = Date.UTC(2026, 9, 5, 15, 0);

const wakeInput = (): HTMLInputElement => document.querySelector('.d-begin input[type="time"]') as HTMLInputElement;
const dateInput = (): HTMLInputElement => document.querySelector('.d-begin input[type="date"]') as HTMLInputElement;
const timeline = (): HTMLElement => document.querySelector('.d-tl') as HTMLElement;

beforeEach(async () => {
  Element.prototype.scrollTo ??= () => {};
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('mastery.tour.v1', '1');
  history.replaceState(null, '', '#/');
  route.value = parseRoute('#/');
  setClock(() => T0);
  await init(new IDBFactory() as unknown as IdbFactoryLike);
  await commit(ensureSession(startLearner(T0, DEFAULT_COURSES, 60), T0));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function open(): Promise<void> {
  render(<App />);
  await screen.findByText('Begin the day');
}

describe('Begin the day', () => {
  it('plans the day from the wake time, with the current block, totals, and the gym', async () => {
    await open();
    expect(document.querySelector('main h1')?.textContent).toBe('Today');
    fireEvent.change(wakeInput(), { target: { value: '09:00' } });
    const tl = timeline();
    expect(tl.textContent).toContain('9:45am');
    expect(tl.textContent).toContain('Gym');
    const now = document.querySelector('.d-now') as HTMLElement;
    expect(now.textContent).toContain('Now: Core study');
    expect(now.textContent).toContain('15 min');
    expect(now.textContent).toContain('until 11:15 am');
    const kpis = document.querySelector('.d-kpis') as HTMLElement;
    expect(kpis.textContent).toContain('6.0hcore study, of 6');
    expect(kpis.textContent).toContain('6:30pmcore done by');
  });

  it('fills the first block from the real session and links each item to its task', async () => {
    await open();
    const s = progress.value?.session;
    const first = s?.tasks.findIndex((t) => t.kind === 'lesson') ?? -1;
    expect(first).toBeGreaterThanOrEqual(0);
    const firstBlock = timeline().querySelector('li.study') as HTMLElement;
    const link = firstBlock.querySelector(`a[href="#/task/${first}"]`) as HTMLAnchorElement;
    expect(link).toBeTruthy();
    fireEvent.click(link);
    expect(route.value).toEqual({ view: 'task', index: first });
  });

  it('says when the queue runs dry, and Plan another session adds to it', async () => {
    await open();
    const before = progress.value?.session?.tasks.length ?? 0;
    expect(screen.getByText(/Today's queue runs dry/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Plan another session' }));
    await waitFor(() => expect(progress.value?.session?.tasks.length ?? 0).toBeGreaterThan(before));
  });

  it('ticks blocks off, keeps them in this browser, and counts them in the week', async () => {
    await open();
    fireEvent.change(wakeInput(), { target: { value: '09:00' } });
    const check = screen.getByRole('button', { name: 'Mark the 9:45am core study block done' });
    fireEvent.click(check);
    expect(check.getAttribute('aria-pressed')).toBe('true');
    const stored = JSON.parse(localStorage.getItem(DAY_KEY) ?? '{}') as Record<string, { wake: string; ticks: number[] }>;
    expect(stored['2026-10-05']).toEqual({ wake: '09:00', ticks: [585] });
    expect(document.querySelector('.d-week')?.textContent).toContain('1.5');
    expect(screen.getByText('1.5 of 36 h')).toBeTruthy();
    cleanup();
    await open();
    expect(screen.getByRole('button', { name: 'Mark the 9:45am core study block done' }).getAttribute('aria-pressed')).toBe('true');
    expect(wakeInput().value).toBe('09:00');
  });

  it('Now sets the wake time to the current time', async () => {
    await open();
    fireEvent.click(screen.getByRole('button', { name: 'Now' }));
    expect(wakeInput().value).toBe('11:00');
    expect(timeline().textContent).toContain('11:45am');
  });

  it('Friday ends at sundown and shows this week\'s Shabbat times', async () => {
    await open();
    const shab = document.querySelector('.d-shab') as HTMLElement;
    expect(shab.textContent).toContain('Begins Fri, Oct 9');
    expect(shab.textContent).toContain('6:25 pm');
    fireEvent.change(dateInput(), { target: { value: '2026-10-09' } });
    expect(screen.getByText(/Friday: the plan ends at sundown, 6:25 pm\./)).toBeTruthy();
    expect(timeline().textContent).toContain('Shabbat begins');
  });

  it('still works when storage refuses writes', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    await open();
    fireEvent.change(wakeInput(), { target: { value: '10:00' } });
    expect(timeline().textContent).toContain('10:45am');
  });

  it('keeps the session list below the plan', async () => {
    await open();
    expect(screen.getByRole('heading', { name: "Today's session" })).toBeTruthy();
    expect(document.querySelector('section.today .tasks')).toBeTruthy();
  });
});

describe('the header', () => {
  it('shows the course title and the disclaimer', async () => {
    await open();
    expect(document.querySelector('header .app-title')?.textContent).toBe(APP_TITLE);
    expect(APP_TITLE).toBe('Cambridge University Math and Computer Science Major');
    expect(screen.getByText('A personal study plan. Not affiliated with the University of Cambridge.')).toBeTruthy();
  });
});
