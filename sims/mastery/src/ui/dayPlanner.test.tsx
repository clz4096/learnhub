/**
 * Begin the day on Today: the day's timeline from the wake time (always in 12-hour form),
 * its blocks filled from today's real session with links into it, each item of the day
 * listed once, tick-off kept in this browser, the week's hours, Shabbat times, and the
 * header with the course title, the college emblem, and the theme toggle.
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
import { dayView } from '@/ui/views/dayView';
import { SettingsView } from '@/ui/views/Settings';
import { STANDUP_CFG_KEY, reloadStandup } from '@/model/standupStore';

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
/** Today's status line under the greeting. */
const status = (): string | null | undefined => document.querySelector('.ds-today > .ds-split .ds-meta')?.textContent;

beforeEach(async () => {
  Element.prototype.scrollTo ??= () => {};
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('mastery.tour.v1', '1');
  // These tests hold the planner's own layout; the standup's block has its own tests (standup.test.tsx).
  localStorage.setItem(STANDUP_CFG_KEY, JSON.stringify({ enabled: false }));
  reloadStandup();
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
  await screen.findByRole('heading', { name: "The day's plan" });
  await waitFor(() => expect(document.querySelector('.ds-now')).not.toBeNull());
}

describe('Begin the day', () => {
  it('plans the day from the wake time, with the current block, the progress line, and the gym', async () => {
    await open();
    // Today's header names the day and the date, so the planner does not repeat them.
    expect(document.querySelector('.d-title')).toBeNull();
    expect(document.querySelector('.d-plan')?.textContent).not.toContain('October 5');
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
    // The full core fits: 75 minutes of it are done by the clock, and it ends at 6:30 pm; said once, in the header.
    expect(status()).toContain('1.3 of 6 h studied · done by 6:30 pm');
    expect(document.querySelector('.d-lbl')).toBeNull();
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

  it('Plan from now adds the day\'s tasks to the session', async () => {
    await open();
    const before = progress.value?.session?.tasks.length ?? 0;
    fireEvent.click(screen.getByRole('button', { name: 'Plan from now' }));
    await waitFor(() => expect(progress.value?.session?.tasks.length ?? 0).toBeGreaterThan(before));
    // Every task the timeline links to is now in the session.
    const n = progress.value?.session?.tasks.length ?? 0;
    const tasks = [...timeline().querySelectorAll('a.d-item')].map((a) => /^#\/task\/(\d+)$/.exec(a.getAttribute('href') ?? '')?.[1]).filter((x) => x !== undefined).map(Number);
    expect(tasks.length).toBeGreaterThan(before);
    for (const i of tasks) expect(i).toBeLessThan(n);
  });

  it('lists each item of the day once: in the timeline, in queue order, with no second list', async () => {
    await open();
    setWake('09:00');
    // The timeline holds the whole queue, task 0, 1, 2, ..., each once (a block may take a lighter item first).
    const hrefs = [...timeline().querySelectorAll('a.d-item')].map((a) => a.getAttribute('href') ?? '').filter((h) => h.startsWith('#/task/'));
    expect(hrefs.length).toBeGreaterThan(8);
    expect(hrefs[0]).toBe('#/task/0');
    expect(hrefs.map((h) => Number(h.slice('#/task/'.length))).sort((a, b) => a - b)).toEqual(hrefs.map((_, i) => i));
    // Outside the Now card, no task is linked a second time anywhere on Today (items with no block left are a row in the timeline).
    const elsewhere = [...document.querySelectorAll('.ds-today a[href^="#/task/"]')].filter((a) => a.closest('.ds-now') === null && a.closest('.d-tl') === null);
    expect(elsewhere).toEqual([]);
    for (const name of ['Later today', 'Up next', "Today's session"]) expect(screen.queryByRole('heading', { name })).toBeNull();
    expect(document.querySelector('.ds-today .tasks, .ds-today .ds-list, .ds-today .ds-more')).toBeNull();
    fireEvent.click(timeline().querySelector('a.d-item') as HTMLAnchorElement);
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
    expect(document.querySelector('.ds-side .d-week')?.textContent).toContain('1.5');
    expect(screen.getByText('1.5 / 36 h')).toBeTruthy();
    cleanup();
    await open();
    expect(screen.getByRole('button', { name: 'Mark the 9:45 am core study block done' }).getAttribute('aria-pressed')).toBe('true');
    expect(wakeValue()).toBe('09:00');
  });

  it('Plan from now rebuilds the rest of the day and keeps it', async () => {
    await open();
    setWake('09:00');
    fireEvent.click(screen.getByRole('button', { name: 'Mark the 9:45 am core study block done' }));
    fireEvent.click(screen.getByRole('button', { name: 'Plan from now' }));
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
    expect(first.textContent).toContain('Timed work · 180 min');
    const link = first.querySelector('a[href="#/progress"]') as HTMLAnchorElement;
    expect(link.textContent).toContain('STEP II, 2019');
    expect(screen.getByRole('button', { name: 'Mark the 9:45 am timed work block done' })).toBeTruthy();
    // The paper is listed once, in its block.
    expect(document.body.textContent?.split('STEP II, 2019').length).toBe(2);
    // The paper counts as core: the full six hours still fit, so the day says when they end.
    const v = dayView(p, JSON.parse(localStorage.getItem(DAY_KEY) ?? '{}'), '2026-10-05', T0, (d) => (d === '2026-10-05' ? [{ minutes: 180, title: 'STEP II, 2019', to: { view: 'progress' } }] : []));
    expect(v.plan.coreEnd).not.toBeNull();
  });

  it('has one planning control, above the Now card: the wake time and Plan from now', async () => {
    await open();
    const control = document.querySelector('.ds-today .d-plan') as HTMLElement;
    const card = document.querySelector('.ds-now') as HTMLElement;
    expect(control.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(control.contains(wakeSelect('hour'))).toBe(true);
    const plan = screen.getByRole('button', { name: 'Plan from now' });
    expect(control.contains(plan)).toBe(true);
    expect(document.getElementById(plan.getAttribute('aria-describedby') ?? '')?.textContent).toBe('Keeps ticked blocks and the past; the rest of the day is planned again from 11:00 am.');
    expect(document.querySelectorAll('.d-plan')).toHaveLength(1);
    for (const name of ['Plan my day', 'Replan from now', 'now', 'Plan the rest of today again']) expect(screen.queryByRole('button', { name })).toBeNull();
    // The wake time is edited in the same control, and moves the timeline.
    setWake('10:00');
    expect(timeline().textContent).toContain('10:45 am');
  });

  it('folds a block\'s items after the first behind one button, and lists items with no block left in the timeline', async () => {
    await open();
    setWake('09:00');
    const block = [...timeline().querySelectorAll('li.study')].find((li) => li.querySelectorAll('.it').length > 1) as HTMLElement;
    const its = [...block.querySelectorAll('.it')];
    expect(its[0]?.classList.contains('d-folded')).toBe(false);
    for (const it of its.slice(1)) expect(it.classList.contains('d-folded')).toBe(true);
    const more = block.querySelector('button.d-more') as HTMLButtonElement;
    expect(more.textContent).toMatch(new RegExp(`^${its.length - 1} more in the .* block$`));
    expect(more.getAttribute('aria-expanded')).toBe('false');
    expect(block.classList.contains('d-fold')).toBe(true);
    fireEvent.click(more);
    expect(more.getAttribute('aria-expanded')).toBe('true');
    expect(block.classList.contains('d-open')).toBe(true);
    // Every item is still in the timeline, folded or not.
    expect(block.querySelectorAll('a.d-item')).toHaveLength(its.length);
    // A late wake leaves items with no block today: one row at the end of the timeline, before the day's end.
    setWake('23:00');
    const left = timeline().querySelector('li.left') as HTMLElement;
    expect(left.querySelector('.sub')?.textContent).toMatch(/^No block left today · /);
    expect(left.querySelectorAll('a.d-item').length).toBeGreaterThan(0);
    expect(left.nextElementSibling?.classList.contains('end')).toBe(true);
    expect(document.querySelector('.d-queue, .d-acts')).toBeNull();
  });

  it('Friday ends at sundown, this week\'s Shabbat times show once, and another day names itself', async () => {
    await open();
    expect(document.querySelector('.ds-side .ds-shab')?.textContent).toContain('Fri 6:25 pm');
    expect(screen.getAllByText(/Brooklyn sundown, computed on this device/)).toHaveLength(1);
    expect((document.querySelector('.d-another') as HTMLDetailsElement).open).toBe(false);
    fireEvent.change(dateInput(), { target: { value: '2026-10-09' } });
    expect(document.querySelector('#today-title')?.textContent).toBe('Friday');
    expect(document.querySelector('.day .d-meta')?.textContent).toContain('October 9');
    expect((document.querySelector('.d-another') as HTMLDetailsElement).open).toBe(true);
    // Another day's wake time is its own; today's stays in the header, so neither plans from now.
    expect(screen.getByRole('combobox', { name: 'Woke on Friday at: hour' })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Plan from now' })).toHaveLength(1);
    // Another day has its own progress line; today's is in the header.
    expect(document.querySelector('.d-lbl')?.textContent).toContain('0.0 of 6 hours');
    expect(screen.getByText(/Friday: the plan ends at sundown, 6:25 pm\./)).toBeTruthy();
    expect(timeline().textContent).toContain('Shabbat begins');
    fireEvent.click(screen.getByRole('button', { name: 'back to today' }));
    expect(document.querySelector('#today-title')?.textContent).toBe("The day's plan");
    expect(document.querySelector('.d-title')).toBeNull();
  });

  it('still works when storage refuses writes', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    await open();
    setWake('10:00');
    expect(timeline().textContent).toContain('10:45 am');
  });
});

describe('the day\'s anchors in Settings', () => {
  const gymAt = (): string | null | undefined =>
    [...timeline().querySelectorAll('li')].find((li) => li.querySelector('.it')?.textContent === 'Gym')?.querySelector('.t')?.textContent;
  const choose = (label: string, value: number): void => { fireEvent.change(screen.getByLabelText(label), { target: { value: String(value) } }); };

  it('edits and saves the gym, dinner, and bed, refusing times that do not make a day', async () => {
    render(<SettingsView />);
    const save = screen.getByRole('button', { name: 'Save day times' }) as HTMLButtonElement;
    expect((screen.getByLabelText('Gym starts') as HTMLSelectElement).value).toBe('840');
    expect((screen.getByLabelText('Dinner') as HTMLSelectElement).value).toBe('1200');
    expect((screen.getByLabelText('Bed') as HTMLSelectElement).value).toBe('1500');
    expect(screen.getByRole('option', { name: '1:00 am' })).toBeTruthy();
    choose('Gym starts', 1110);
    expect(await screen.findByText('Dinner must be at 8:30 pm or later, after the gym.')).toBeTruthy();
    expect(save.disabled).toBe(true);
    choose('Gym starts', 1020);
    await waitFor(() => expect(save.disabled).toBe(false));
    choose('Bed', 1200);
    expect(await screen.findByText('Bed must be at 9:30 pm or later, after dinner and the wind down.')).toBeTruthy();
    choose('Dinner', 1170);
    choose('Bed', 1380);
    await waitFor(() => expect(save.disabled).toBe(false));
    fireEvent.click(save);
    await waitFor(() => expect(screen.getByText(/Saved\. A day already planned keeps its times; use "Plan from now" on Today/)).toBeTruthy());
    expect(progress.value?.settings.dayAnchors).toEqual({ gymStart: 1020, dinner: 1170, bed: 1380, changedAt: T0 });
    // The saved times show when Settings opens again.
    cleanup();
    render(<SettingsView />);
    expect((screen.getByLabelText('Bed') as HTMLSelectElement).value).toBe('1380');
  });

  it('a day already planned keeps its times until Plan from now; a new wake time takes the new ones', async () => {
    await open();
    setWake('09:15');
    const before = gymAt();
    expect(before).toMatch(/^2:[0-3]\d pm$/);
    cleanup();
    render(<SettingsView />);
    choose('Gym starts', 1020);
    await waitFor(() => expect((screen.getByLabelText('Gym starts') as HTMLSelectElement).value).toBe('1020'));
    choose('Dinner', 1170);
    await waitFor(() => expect((screen.getByLabelText('Dinner') as HTMLSelectElement).value).toBe('1170'));
    choose('Bed', 1380);
    await waitFor(() => expect((screen.getByRole('button', { name: 'Save day times' }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: 'Save day times' }));
    await waitFor(() => expect(progress.value?.settings.dayAnchors?.gymStart).toBe(1020));
    cleanup();
    await open();
    expect(gymAt()).toBe(before);
    expect(timeline().textContent).toContain('bed at 1:00 am');
    fireEvent.click(screen.getByRole('button', { name: 'Plan from now' }));
    expect(gymAt()).toBe('5:00 pm');
    expect(timeline().textContent).toContain('bed at 11:00 pm');
    const stored = JSON.parse(localStorage.getItem(DAY_KEY) ?? '{}') as Record<string, unknown>;
    expect(stored['2026-10-05']).toEqual({ wake: '09:15', ticks: [], replans: [{ at: 660, ticks: [], anchors: { gymStart: 1020, dinner: 1170, bed: 1380 } }] });
    setWake('08:00');
    expect(gymAt()).toBe('5:00 pm');
    expect((JSON.parse(localStorage.getItem(DAY_KEY) ?? '{}') as Record<string, unknown>)['2026-10-05'])
      .toEqual({ wake: '08:00', ticks: [], anchors: { gymStart: 1020, dinner: 1170, bed: 1380 } });
  });
});

describe('Today\'s header', () => {
  it('shows the date, the live time to the second in 12-hour form, a greeting, and one line of status', async () => {
    await open();
    expect(document.querySelector('main h1')?.textContent).toBe('Good morning, Albert.');
    expect(document.querySelector('.ds-clockrow .ds-eyebrow')?.textContent).toBe('Monday, October 5');
    expect(document.querySelector('.ds-clock')?.textContent).toBe('11:00:00 am');
    setClock(() => T0 + 7_000);
    await waitFor(() => expect(document.querySelector('.ds-clock')?.textContent).toBe('11:00:07 am'), { timeout: 2500 });
    // The wake time is the planner's control just below, so the status line does not repeat it.
    expect(status()).toMatch(/^1\.3 of 6 h studied · done by 6:30 pm · Getting in, week 1$/);
  });

  it('the Now card names the block running now and has one Start, into the first open item', async () => {
    await open();
    const card = document.querySelector('.ds-now') as HTMLElement;
    expect(card.querySelector('.ds-tag')?.textContent).toBe('NOW · 9:45 AM to 11:15 AM');
    const first = progress.value?.session?.tasks[0]?.topicIds[0] as string;
    expect(card.querySelector('.ds-now-t')?.textContent).toBe(titleOf(first));
    // Why the item is planned, from the session task.
    expect(card.querySelector('.ds-now-why')?.textContent).toBe(progress.value?.session?.tasks[0]?.reason);
    const start = [...card.querySelectorAll('a')];
    expect(start).toHaveLength(1);
    expect(start[0]?.textContent).toBe('Start');
    fireEvent.click(start[0] as HTMLElement);
    expect(location.hash).toBe('#/task/0');
  });

  it('the rest of the day is the timeline, the gym among its blocks with a link to gym mode', async () => {
    await open();
    setWake('09:00');
    const gym = [...timeline().querySelectorAll('li')].find((li) => li.querySelector('.it')?.textContent === 'Gym') as HTMLElement;
    expect(gym.querySelector('.t')?.textContent).toMatch(/^(1[0-2]|[1-9]):[0-5]\d (am|pm)$/);
    expect(gym.querySelector('a.d-item')?.getAttribute('href')).toBe('#/gym');
    expect(gym.querySelector('.sub')?.textContent).toBe('90 minutes including travel');
  });

  it('the side column has the week with its daily bars, Shabbat, and the streak', async () => {
    await open();
    const side = document.querySelector('.ds-side') as HTMLElement;
    // Below 900 px it folds into one row that opens it in place.
    const row = side.querySelector('button.ds-side-row') as HTMLButtonElement;
    expect(row.textContent).toBe('This week 0 of 36 h · streak 0 days');
    expect(row.getAttribute('aria-expanded')).toBe('false');
    expect(document.getElementById(row.getAttribute('aria-controls') ?? '')?.classList.contains('ds-side-body')).toBe(true);
    fireEvent.click(row);
    expect(row.getAttribute('aria-expanded')).toBe('true');
    expect(side.classList.contains('open')).toBe(true);
    expect(side.textContent).toContain('0 / 36 h');
    expect(side.querySelectorAll('.d-week > li')).toHaveLength(7);
    // Shown once on the page: the planner has no week or Shabbat of its own.
    expect(document.querySelectorAll('.d-week')).toHaveLength(1);
    expect(side.textContent).toContain('Fri 6:25 pm to Sat');
    expect(side.querySelector('.ds-streak')?.textContent).toBe('0 days');
  });
});

describe('the rail and the theme', () => {
  it('shows the arms and the title in the rail, and no disclaimer line', async () => {
    await open();
    expect(document.querySelector('.ds-brand .app-title')?.getAttribute('aria-label')).toBe(`${APP_TITLE}, home`);
    expect(APP_TITLE).toBe('Computational Mathematics at the University of Cambridge');
    expect(document.querySelector('.ds-brand .ds-arms use')?.getAttribute('href')).toBe('#euclid-arms');
    // The art's defs are in the page once, every id namespaced.
    for (const id of ['arms', 'armsMono', 'armsUni', 'seal']) expect(document.querySelectorAll(`#euclid-${id}`)).toHaveLength(1);
    expect([...document.querySelectorAll('.seal-defs [id]')].every((e) => e.id.startsWith('euclid-'))).toBe(true);
    expect(screen.queryByText(/Not affiliated with the University of Cambridge/)).toBeNull();
  });

  it('Settings, from You, sets the theme to system, light, or dark, and remembers it', async () => {
    setTheme('system');
    await open();
    fireEvent.click(document.querySelector('nav.ds-nav a[data-nav="you"]') as Element);
    fireEvent.click(screen.getByText('Settings', { selector: '.ds-x' }));
    const pick = (name: string): HTMLElement => screen.getByRole('button', { name });
    expect(pick('System').getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(pick('Light'));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem(THEME_KEY)).toBe('light');
    fireEvent.click(pick('Dark'));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(pick('Dark').getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(pick('System'));
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(localStorage.getItem(THEME_KEY)).toBe('system');
  });
});
