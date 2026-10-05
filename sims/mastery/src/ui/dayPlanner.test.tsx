/**
 * Begin the day on Today: the day's timeline from the wake time (always in 12-hour form),
 * its blocks filled from today's real session with links into it, tick-off kept in this
 * browser, the week's hours, Shabbat times, and the header with the course title, the
 * college emblem, and the theme toggle.
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
import { THEME_KEY, setTheme } from '@/model/theme';
import { APP_TITLE, App } from '@/ui/App';
import { DayPlanner } from '@/ui/views/DayPlanner';

// Monday 2026-10-05, 11:00 am in New York (EDT, UTC-4).
const T0 = Date.UTC(2026, 9, 5, 15, 0);

const wakeSelect = (part: 'hour' | 'minute' | 'am or pm'): HTMLSelectElement => screen.getByRole('combobox', { name: `Woke at: ${part}` }) as HTMLSelectElement;
/** The wake time the three selects show, as HH:MM. */
function wakeValue(): string {
  const h = Number(wakeSelect('hour').value) % 12 + (wakeSelect('am or pm').value === 'pm' ? 12 : 0);
  return `${String(h).padStart(2, '0')}:${String(Number(wakeSelect('minute').value)).padStart(2, '0')}`;
}
/** Sets the wake time through the selects, changing only the parts that differ. */
function setWake(v: string): void {
  const [hh, mm] = v.split(':').map(Number) as [number, number];
  const want: [Parameters<typeof wakeSelect>[0], string][] = [['am or pm', hh >= 12 ? 'pm' : 'am'], ['hour', String(hh % 12 || 12)], ['minute', String(mm)]];
  for (const [part, value] of want) if (wakeSelect(part).value !== value) fireEvent.change(wakeSelect(part), { target: { value } });
  expect(wakeValue()).toBe(v);
}
const dateInput = (): HTMLInputElement => document.querySelector('.d-other input[type="date"]') as HTMLInputElement;
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
  await screen.findByRole('heading', { name: 'Up next' });
}

describe('Begin the day', () => {
  it('plans the day from the wake time, with the current block, the progress line, and the gym', async () => {
    await open();
    // The day's name is the heading, the date under it.
    expect(document.querySelector('main h1')?.textContent).toBe('Monday');
    expect(document.querySelector('.d-meta')?.textContent).toContain('October 5');
    setWake('09:00');
    const tl = timeline();
    expect(tl.textContent).toContain('9:45 am');
    expect(tl.textContent).toContain('Gym');
    // 9:45 to 11:15 is on now, at 11:00.
    const now = tl.querySelector('li.now') as HTMLElement;
    expect(now.querySelector('.t')?.textContent).toBe('9:45 am');
    expect(now.querySelector('.tag')?.textContent).toBe('now · 15 min left');
    expect(now.textContent).toContain('Core study · 90 min');
    // Get going, 9:00 to 9:45, is past.
    expect(tl.querySelector('li.past .it')?.textContent).toBe('Get going');
    // The full core fits: 75 minutes of it are done by the clock, and it ends at 6:30 pm.
    const lbl = document.querySelector('.d-lbl') as HTMLElement;
    expect(lbl.textContent).toContain('1.3 of 6 hours');
    expect(lbl.textContent).toContain('done by 6:30 pm');
    expect(document.querySelector('.qed')?.textContent).toBe('∎');
  });

  it('shows every time in 12-hour form, whatever the device locale', async () => {
    await open();
    setWake('13:05');
    expect([...wakeSelect('hour').options].map((o) => o.textContent)).toEqual(['12', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11']);
    expect(wakeSelect('am or pm').value).toBe('pm');
    expect(wakeSelect('hour').value).toBe('1');
    const times = [...timeline().querySelectorAll('.t')].map((t) => t.textContent).filter((t) => t !== '');
    expect(times.length).toBeGreaterThan(5);
    for (const t of times) expect(t).toMatch(/^(1[0-2]|[1-9]):[0-5]\d (am|pm)$/);
    expect(times[0]).toBe('1:05 pm');
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
    setWake('09:00');
    expect(screen.queryByText(/Today's queue runs dry/)).toBeNull();
    // Study and optional blocks, each with its items as links into the course.
    const blocks = [...timeline().querySelectorAll('li.study')];
    expect(timeline().querySelectorAll('li.study.opt').length).toBeGreaterThan(0);
    expect(blocks.length).toBeGreaterThan(4);
    for (const b of blocks) expect(b.querySelector('a.d-item')).toBeTruthy();
    expect(progress.value?.settings.budgetMinutes).toBe(60);
  });

  it('opening a forecast item adds the day to the session and opens its task', async () => {
    await open();
    setWake('09:00');
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
    setWake('09:00');
    const card = screen.getByRole('heading', { name: 'Up next' }).closest('section') as HTMLElement;
    const links = [...card.querySelectorAll('.d-queue a.d-qlink')] as HTMLAnchorElement[];
    expect(links.length).toBe(8);
    // In block order: the first is the first block's first item.
    const first = timeline().querySelector('li.study a.d-item') as HTMLAnchorElement;
    expect(links[0]?.getAttribute('href')).toBe(first.getAttribute('href'));
    expect(links[0]?.textContent).toMatch(/New lesson, \d+ min, 9:45 am block/);
    fireEvent.click(screen.getByRole('button', { name: /^Show all \d+$/ }));
    expect(card.querySelectorAll('.d-queue a.d-qlink').length).toBeGreaterThan(8);
    fireEvent.click(links[0] as HTMLAnchorElement);
    expect(route.value.view).toBe('task');
  });

  it('ticks blocks off, keeps them in this browser, and counts them in the week', async () => {
    await open();
    setWake('09:00');
    const check = screen.getByRole('button', { name: 'Mark the 9:45 am core study block done' });
    fireEvent.click(check);
    expect(check.getAttribute('aria-pressed')).toBe('true');
    const stored = JSON.parse(localStorage.getItem(DAY_KEY) ?? '{}') as Record<string, { wake: string; ticks: number[] }>;
    expect(stored['2026-10-05']).toEqual({ wake: '09:00', ticks: [585] });
    expect(document.querySelector('.d-week')?.textContent).toContain('1.5');
    expect(screen.getByText('1.5 of 36 h')).toBeTruthy();
    cleanup();
    await open();
    expect(screen.getByRole('button', { name: 'Mark the 9:45 am core study block done' }).getAttribute('aria-pressed')).toBe('true');
    expect(wakeValue()).toBe('09:00');
  });

  it('Replan from now rebuilds the rest of the day and keeps it', async () => {
    await open();
    setWake('09:00');
    fireEvent.click(screen.getByRole('button', { name: 'Mark the 9:45 am core study block done' }));
    fireEvent.click(screen.getByRole('button', { name: 'Replan from now' }));
    expect(screen.getByText(/Replanned from 11:00 am\./)).toBeTruthy();
    const tl = timeline();
    expect(tl.textContent).toContain('9:45 am');
    expect(screen.getByRole('button', { name: 'Mark the 9:45 am core study block done' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Mark the 11:15 am core study block done' })).toBeTruthy();
    const stored = JSON.parse(localStorage.getItem(DAY_KEY) ?? '{}') as Record<string, unknown>;
    expect(stored['2026-10-05']).toEqual({ wake: '09:00', ticks: [585], replans: [{ at: 660, ticks: [585] }] });
    expect(progress.value?.settings.budgetMinutes).toBe(60);
    cleanup();
    await open();
    expect(screen.getByRole('button', { name: 'Mark the 11:15 am core study block done' })).toBeTruthy();
    // A new wake time starts the day over.
    setWake('10:00');
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
    expect(first.textContent).toContain('9:45 am');
    expect(first.textContent).toContain('Timed paper · 180 min');
    const link = first.querySelector('a[href="#/progress"]') as HTMLAnchorElement;
    expect(link.textContent).toContain('STEP II, 2019');
    expect(screen.getByRole('button', { name: 'Mark the 9:45 am timed paper block done' })).toBeTruthy();
    const queue = document.querySelector('.d-queue') as HTMLElement;
    expect(queue.querySelector('li')?.textContent).toContain('STEP II, 2019');
    expect(queue.querySelector('li')?.textContent).toContain('Timed paper, 180 min, at 9:45 am');
    // The paper counts as core: the full six hours still fit, so the line says when they end.
    expect((document.querySelector('.d-lbl') as HTMLElement).textContent).toMatch(/done by \d{1,2}:\d{2} (am|pm)/);
  });

  it('now sets the wake time to the current time', async () => {
    await open();
    fireEvent.click(screen.getByRole('button', { name: 'now' }));
    expect(wakeValue()).toBe('11:00');
    expect(timeline().textContent).toContain('11:45 am');
  });

  it('Friday ends at sundown and shows this week\'s Shabbat times', async () => {
    await open();
    const shab = document.querySelector('.d-shab') as HTMLElement;
    expect(shab.textContent).toContain('Begins Fri, Oct 9');
    expect(shab.textContent).toContain('6:25 pm');
    fireEvent.change(dateInput(), { target: { value: '2026-10-09' } });
    expect(document.querySelector('main h1')?.textContent).toBe('Friday');
    expect(screen.getByText(/Friday: the plan ends at sundown, 6:25 pm\./)).toBeTruthy();
    expect(timeline().textContent).toContain('Shabbat begins');
    fireEvent.click(screen.getByRole('button', { name: 'back to today' }));
    expect(document.querySelector('main h1')?.textContent).toBe('Monday');
  });

  it('still works when storage refuses writes', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    await open();
    setWake('10:00');
    expect(timeline().textContent).toContain('10:45 am');
  });

  it('keeps the session list below the plan', async () => {
    await open();
    expect(screen.getByRole('heading', { name: "Today's session" })).toBeTruthy();
    expect(document.querySelector('section.today .tasks')).toBeTruthy();
  });
});

describe('the header and footer', () => {
  it('shows the course title with the emblem, and no disclaimer line', async () => {
    await open();
    expect(document.querySelector('header .app-title')?.textContent).toBe(APP_TITLE);
    expect(APP_TITLE).toBe('Computational Mathematics at the University of Cambridge');
    expect(document.querySelector('header .brand-seal use')?.getAttribute('href')).toBe('#euclid-seal');
    // The art's defs are in the page once, every id namespaced.
    expect(document.querySelectorAll('#euclid-seal')).toHaveLength(1);
    expect([...document.querySelectorAll('.seal-defs [id]')].every((e) => e.id.startsWith('euclid-'))).toBe(true);
    expect(screen.queryByText(/Not affiliated with the University of Cambridge/)).toBeNull();
  });

  it('the footer toggle cycles the theme through system, light, and dark, and remembers it', async () => {
    setTheme('system');
    await open();
    const toggle = (): HTMLElement => screen.getByRole('button', { name: /^Theme: / });
    expect(toggle().textContent).toBe('Theme: system');
    fireEvent.click(toggle());
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem(THEME_KEY)).toBe('light');
    fireEvent.click(toggle());
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(toggle().textContent).toBe('Theme: dark');
    fireEvent.click(toggle());
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(localStorage.getItem(THEME_KEY)).toBe('system');
  });
});
