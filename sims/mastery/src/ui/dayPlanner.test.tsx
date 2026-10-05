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
import { titleOf } from '@/model/courses';
import { DAY_KEY } from '@/model/dayLog';
import { DEFAULT_COURSES, ensureSession, startLearner } from '@/model/learner';
import { parseRoute, route } from '@/model/route';
import { commit, init, progress, setClock } from '@/model/store';
import { APP_TITLE, App } from '@/ui/App';
import { DayPlanner } from '@/ui/views/DayPlanner';

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

  it('fills the whole day, not just the daily budget, without changing the budget', async () => {
    await open();
    fireEvent.change(wakeInput(), { target: { value: '09:00' } });
    expect(screen.queryByText(/Today's queue runs dry/)).toBeNull();
    const blocks = [...timeline().querySelectorAll('li.study, li.optional')];
    expect(blocks.length).toBeGreaterThan(4);
    for (const b of blocks) expect(b.querySelector('a.d-item')).toBeTruthy();
    expect(progress.value?.settings.budgetMinutes).toBe(60);
  });

  it('opening a forecast item adds the day to the session and opens its task', async () => {
    await open();
    fireEvent.change(wakeInput(), { target: { value: '09:00' } });
    const before = progress.value?.session?.tasks.length ?? 0;
    const link = timeline().querySelector(`a[href="#/task/${before + 2}"]`) as HTMLAnchorElement;
    expect(link).toBeTruthy();
    const title = link.querySelector('.d-item-title')?.textContent;
    fireEvent.click(link);
    expect(route.value).toEqual({ view: 'task', index: before + 2 });
    const tasks = progress.value?.session?.tasks ?? [];
    expect(tasks.length).toBeGreaterThan(before + 2);
    const task = tasks[before + 2];
    expect(task?.done).toBe(false);
    if (task?.kind !== 'quiz') expect(title).toBe(titleOf(task?.topicIds[0] as string));
    expect(progress.value?.settings.budgetMinutes).toBe(60);
  });

  it('Plan my day adds the day\'s tasks to the session', async () => {
    await open();
    const before = progress.value?.session?.tasks.length ?? 0;
    fireEvent.click(screen.getByRole('button', { name: 'Plan my day' }));
    await waitFor(() => expect(progress.value?.session?.tasks.length ?? 0).toBeGreaterThan(before));
    expect(screen.getByRole('heading', { name: "Today's session" })).toBeTruthy();
  });

  it('Up next lists the queue in order, each item linked and labelled', async () => {
    await open();
    fireEvent.change(wakeInput(), { target: { value: '09:00' } });
    const card = screen.getByRole('heading', { name: 'Up next' }).closest('.d-card') as HTMLElement;
    const links = [...card.querySelectorAll('.d-queue a.d-qlink')] as HTMLAnchorElement[];
    expect(links.length).toBe(8);
    // In block order: the first is the first block's first item.
    const first = timeline().querySelector('li.study a.d-item') as HTMLAnchorElement;
    expect(links[0]?.getAttribute('href')).toBe(first.getAttribute('href'));
    expect(links[0]?.textContent).toMatch(/New lesson, \d+ min, 9:45am block/);
    fireEvent.click(screen.getByRole('button', { name: /^Show all \d+$/ }));
    expect(card.querySelectorAll('.d-queue a.d-qlink').length).toBeGreaterThan(8);
    fireEvent.click(links[0] as HTMLAnchorElement);
    expect(route.value.view).toBe('task');
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

  it('Replan from now rebuilds the rest of the day and keeps it', async () => {
    await open();
    fireEvent.change(wakeInput(), { target: { value: '09:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mark the 9:45am core study block done' }));
    fireEvent.click(screen.getByRole('button', { name: 'Replan from now' }));
    expect(screen.getByText(/Replanned from 11:00 am\./)).toBeTruthy();
    const tl = timeline();
    expect(tl.textContent).toContain('9:45am');
    expect(screen.getByRole('button', { name: 'Mark the 9:45am core study block done' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Mark the 11:15am core study block done' })).toBeTruthy();
    const stored = JSON.parse(localStorage.getItem(DAY_KEY) ?? '{}') as Record<string, unknown>;
    expect(stored['2026-10-05']).toEqual({ wake: '09:00', ticks: [585], replans: [{ at: 660, ticks: [585] }] });
    expect(progress.value?.settings.budgetMinutes).toBe(60);
    cleanup();
    await open();
    expect(screen.getByRole('button', { name: 'Mark the 11:15am core study block done' })).toBeTruthy();
    // A new wake time starts the day over.
    fireEvent.change(wakeInput(), { target: { value: '10:00' } });
    expect(screen.queryByText(/Replanned from/)).toBeNull();
  });

  it('renders a timed paper first, with its label and link', async () => {
    await open();
    cleanup();
    const p = progress.value;
    if (p === null) throw new Error('no progress');
    localStorage.setItem(DAY_KEY, JSON.stringify({ '2026-10-05': { wake: '09:00', ticks: [] } }));
    render(<DayPlanner p={p} fixed={(d) => (d === '2026-10-05' ? [{ minutes: 180, title: 'STEP II, 2019', to: { view: 'progress' } }] : [])} />);
    const first = timeline().querySelector('li.study') as HTMLElement;
    expect(first.textContent).toContain('9:45am');
    expect(first.textContent).toContain('180 min');
    expect(first.textContent).toContain('Timed paper');
    const link = first.querySelector('a[href="#/progress"]') as HTMLAnchorElement;
    expect(link.textContent).toContain('STEP II, 2019');
    expect(screen.getByRole('button', { name: 'Mark the 9:45am timed paper block done' })).toBeTruthy();
    const queue = document.querySelector('.d-queue') as HTMLElement;
    expect(queue.querySelector('li')?.textContent).toContain('STEP II, 2019');
    expect(queue.querySelector('li')?.textContent).toContain('Timed paper, 180 min, at 9:45am');
    expect((document.querySelector('.d-kpis') as HTMLElement).textContent).toContain('6.0hcore study, of 6');
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
