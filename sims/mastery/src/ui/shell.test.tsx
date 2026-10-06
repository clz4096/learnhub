/**
 * The design v4 shell in the app: number keys switch tabs, Cmd+K opens the command
 * palette anywhere (recent items and actions when empty, lessons, terms, and papers when
 * typed into), focus mode hides the tabs and Escape returns to where the learner came
 * from, the gym's cards and rest timer, the timed paper's flags, and a lesson's Top of
 * section.
 */
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/preact';
import { IDBFactory } from 'fake-indexeddb';
import { DAY_MS, placedMemory, type IdbFactoryLike } from '@learnhub/mastery';
import { t, type TopicContent } from '@learnhub/content';
import { contentFor } from '@learnhub/content/all';
import { newCampaign, startSitting } from '@/model/campaign';
import { saveCampaign } from '@/model/campaignStore';
import { contentStore } from '@/model/content';
import { DEFAULT_COURSES, ensureSession, startLearner } from '@/model/learner';
import { go, parseRoute, route } from '@/model/route';
import { RECENT_KEY } from '@/model/shell';
import { commit, flush, init, progress, setClock } from '@/model/store';
import { NO_NUMBERS, emptyStory } from '@/model/story';
import { saveStory } from '@/model/storyStore';
import { App } from '@/ui/App';
import { paletteOpen } from '@/ui/shell/state';

const T0 = Date.UTC(2026, 9, 5, 15, 0);

beforeEach(async () => {
  Element.prototype.scrollTo ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('mastery.tour.v1', '1');
  history.replaceState(null, '', '#/');
  route.value = parseRoute('#/');
  paletteOpen.value = false;
  setClock(() => T0);
  saveStory({ ...emptyStory(), seen: { prologue: { first: T0, last: T0, plays: 1, n: { ...NO_NUMBERS } } } });
  saveCampaign(null);
  await init(new IDBFactory() as unknown as IdbFactoryLike);
  await commit(ensureSession(startLearner(T0, DEFAULT_COURSES, 60), T0));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  saveCampaign(null);
  paletteOpen.value = false;
});

const key = (k: string, o: Partial<KeyboardEventInit> = {}, target: Element = document.body): void => { fireEvent.keyDown(target, { key: k, ...o }); };
const nav = (): Element | null => document.querySelector('nav.ds-nav');
const palette = (): HTMLElement | null => document.querySelector('.ds-cmd-box');
const options = (): string[] => [...document.querySelectorAll('.ds-cmd-res [role="option"]')].map((o) => o.textContent ?? '');
/** The first section's Next, once the lesson has loaded its content (a lesson may have one section or several). */
const lessonNext = (): Promise<HTMLElement> => screen.findByRole('button', { name: /^Next: / });
/** Read a lesson's named sections through to the worked examples. */
const toExamples = (): void => {
  for (let i = 0; i < 20 && screen.queryByRole('button', { name: 'Next: worked examples' }) === null; i++) fireEvent.click(screen.getByRole('button', { name: /^Next: / }));
  fireEvent.click(screen.getByRole('button', { name: 'Next: worked examples' }));
};

describe('keys', () => {
  it('1 to 5 switch tabs, G opens the gym, and none of them act while typing', async () => {
    render(<App />);
    await flush();
    key('2');
    expect(location.hash).toBe('#/book');
    key('3');
    expect(location.hash).toBe('#/campaign');
    key('4');
    expect(location.hash).toBe('#/story');
    key('5');
    expect(location.hash).toBe('#/progress');
    key('1');
    expect(location.hash).toBe('#/');
    // In a field, a digit is typed, not a tab.
    go({ view: 'glossary', termId: null });
    await flush();
    key('2', {}, document.getElementById('gl-search') as HTMLElement);
    expect(location.hash).toBe('#/glossary');
    // With a modifier, the browser keeps the key.
    key('2', { metaKey: true });
    expect(location.hash).toBe('#/glossary');
    key('g');
    expect(location.hash).toBe('#/gym');
  });
});

describe('the command palette', () => {
  it('opens with Cmd+K or the rail button, shows recent items and actions with their keys, and Escape closes it', async () => {
    localStorage.setItem(RECENT_KEY, JSON.stringify([{ kind: 'term', id: 'union', at: 2 }, { kind: 'lesson', id: 'pre.fractions', at: 1 }]));
    render(<App />);
    key('k', { metaKey: true });
    await waitFor(() => expect(palette()).not.toBeNull());
    expect(palette()?.getAttribute('role')).toBe('dialog');
    expect(document.activeElement?.classList.contains('ds-cmd-in')).toBe(true);
    expect([...document.querySelectorAll('.ds-cmd-h')].map((h) => h.textContent)).toEqual(['Recent', 'Actions']);
    expect(options().slice(0, 2)).toEqual(['Unionterm', 'Fractions and ratioslesson']);
    expect(options()).toContain('Begin the day1');
    expect(options()).toContain('Start the gymG');
    expect(options()).toContain('Start a timed paperT');
    // The app behind is inert while it is open.
    expect(document.querySelector('.app')?.hasAttribute('inert')).toBe(true);
    key('Escape', {}, document.activeElement as Element);
    await waitFor(() => expect(palette()).toBeNull());
    fireEvent.click(document.querySelector('.ds-kbtn') as HTMLElement);
    await waitFor(() => expect(palette()).not.toBeNull());
  });

  it('typing searches lessons and glossary terms; arrows move and Enter opens', async () => {
    render(<App />);
    key('k', { ctrlKey: true });
    const input = await waitFor(() => document.querySelector('.ds-cmd-in') as HTMLInputElement);
    fireEvent.input(input, { target: { value: 'fractions' } });
    expect(options()).toContain('Fractions and ratioslesson');
    expect(document.querySelector('.ds-cmd-res [role="option"]')?.getAttribute('aria-selected')).toBe('true');
    fireEvent.input(input, { target: { value: 'union' } });
    expect(options()[0]).toBe('Unionterm');
    fireEvent.keyDown(input, { key: 'Enter' });
    await flush();
    expect(location.hash).toBe('#/glossary/union');
    expect(palette()).toBeNull();
    // Opening the term put it on the recent list.
    expect(JSON.parse(localStorage.getItem(RECENT_KEY) as string)[0]).toMatchObject({ kind: 'term', id: 'union' });
    key('k', { metaKey: true });
    const input2 = await waitFor(() => document.querySelector('.ds-cmd-in') as HTMLInputElement);
    fireEvent.input(input2, { target: { value: 'gym' } });
    fireEvent.keyDown(input2, { key: 'ArrowDown' });
    fireEvent.keyDown(input2, { key: 'ArrowUp' });
    expect(document.querySelector('.ds-cmd-res [aria-selected="true"]')?.textContent).toBe(options()[0]);
  });
});

describe('focus mode', () => {
  it('a lesson hides the tabs; its bar and Escape go back to where it was opened, and the lesson keeps its place', async () => {
    go({ view: 'book' });
    render(<App />);
    await flush();
    fireEvent.click(document.querySelector('a.ds-cont') as HTMLElement);
    expect(location.hash).toBe('#/learn/pre.fractions/book');
    await lessonNext();
    expect(nav()).toBeNull();
    expect(document.querySelector('.app')?.classList.contains('focus')).toBe(true);
    expect(document.querySelector('.ds-fbar-back')?.textContent).toBe('← Course');
    // Number keys do nothing in focus mode.
    key('3');
    expect(location.hash).toBe('#/learn/pre.fractions/book');
    toExamples();
    key('Escape');
    await flush();
    expect(location.hash).toBe('#/book');
    expect(nav()).not.toBeNull();
    fireEvent.click(document.querySelector('a.ds-cont') as HTMLElement);
    expect(await screen.findByRole('button', { name: 'Next: practice' })).toBeTruthy();
  });

  it('Escape closes a dialog over a lesson first, and only then leaves the lesson', async () => {
    go({ view: 'today' });
    go({ view: 'task', index: 0 });
    render(<App />);
    await lessonNext();
    key('k', { metaKey: true });
    await waitFor(() => expect(palette()).not.toBeNull());
    key('Escape', {}, document.activeElement as Element);
    await waitFor(() => expect(palette()).toBeNull());
    expect(location.hash).toBe('#/task/0');
    key('Escape');
    await flush();
    expect(location.hash).toBe('#/');
  });

  it('a lesson has Top of section next to Continue, and segmented progress with no counts', async () => {
    go({ view: 'task', index: 0 });
    render(<App />);
    const next = await lessonNext();
    const foot = next.closest('.ds-lessfoot') as HTMLElement;
    const top = within(foot).getByRole('button', { name: /Top of section/ });
    fireEvent.click(top);
    expect(document.activeElement?.classList.contains('sec-anchor')).toBe(true);
    expect(document.querySelector('.segs')?.textContent).toBe('');
    expect(document.querySelector('.lesson-head')?.textContent).not.toMatch(/\d+ of \d+/);
  });
});

describe('the gym', () => {
  const base = contentFor('pre.fractions') as TopicContent;
  const withGym: TopicContent = {
    ...base,
    proofOrder: [{ title: t`A product telescopes`, steps: [t`Write each factor as a fraction.`, t`Cancel each top with the next bottom.`, t`Read off what is left.`] }],
    recall: [{ front: t`What is a fraction?`, back: t`A ratio of two whole numbers.` }],
  };

  beforeEach(async () => {
    const p = progress.value as NonNullable<typeof progress.value>;
    await commit({ ...p, memory: placedMemory(['pre.fractions'], T0 - 30 * DAY_MS) });
    vi.spyOn(contentStore, 'load').mockImplementation((id) => Promise.resolve(id === 'pre.fractions' ? withGym : undefined));
  });

  it('is a focus screen with Recall, Order, Drill, and Listen; a recall card turns, then Again, Good, or Easy records it, with a buzz', async () => {
    const vibrate = vi.fn(() => true);
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
    go({ view: 'today' });
    go({ view: 'gym' });
    render(<App />);
    expect(nav()).toBeNull();
    expect(document.querySelector('.ds-fbar-mid')?.textContent).toBe('gym · REP ×0.5');
    expect(screen.getAllByRole('tab').map((x) => x.textContent?.replace(/,.*$/, ''))).toEqual(['Recall', 'Order', 'Drill', 'Listen']);
    const card = await screen.findByRole('button', { name: /What is a fraction/ });
    const good = screen.getByRole('button', { name: 'Good' }) as HTMLButtonElement;
    expect(good.disabled).toBe(true);
    fireEvent.click(card);
    expect(card.textContent).toContain('A ratio of two whole numbers.');
    fireEvent.click(screen.getByRole('button', { name: 'Good' }));
    await flush();
    expect(vibrate).toHaveBeenCalled();
    const h = progress.value?.history.at(-1);
    expect(h).toMatchObject({ kind: 'gym', topicId: 'pre.fractions', correct: true });
    expect(document.querySelector('.ds-center')?.textContent).toContain('never counts toward the Cambridge gate');
    // Recall is done for today, so the gym moves on to the next tab with work: the proof order.
    expect(await screen.findByText('A product telescopes')).toBeTruthy();
    expect(screen.getByRole('tab', { name: /^Order/ }).getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByRole('tab', { name: /^Recall/ }));
    expect(screen.getByText(/Nothing left in Recall/)).toBeTruthy();
    key('Escape');
    await flush();
    expect(location.hash).toBe('#/');
  });

  it('a proof order is tapped back into order and checked', async () => {
    go({ view: 'gym' });
    render(<App />);
    fireEvent.click(await screen.findByRole('tab', { name: /^Order/ }));
    const steps = ['Write each factor as a fraction.', 'Cancel each top with the next bottom.', 'Read off what is left.'];
    for (const s of steps) fireEvent.click(await screen.findByRole('button', { name: s }));
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(document.querySelector('.ds-verdict')?.textContent).toContain('Right');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await flush();
    expect(progress.value?.history.at(-1)).toMatchObject({ kind: 'gym', correct: true, item: { id: 'order:pre.fractions#0' } });
  });

  it('the rest timer counts down 1:30 and buzzes at zero', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const vibrate = vi.fn(() => true);
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
    go({ view: 'gym' });
    render(<App />);
    const rest = screen.getByRole('button', { name: 'Rest for 1:30' });
    fireEvent.click(rest);
    expect(rest.textContent).toBe('rest 1:30');
    for (let i = 0; i < 300 && rest.textContent !== 'go'; i++) await vi.advanceTimersByTimeAsync(500);
    expect(rest.textContent).toBe('go');
    expect(vibrate).toHaveBeenCalled();
    vi.useRealTimers();
  });
});

describe('the timed paper', () => {
  it('is a focus screen with a big timer, parts flagged to come back to, Open the paper, and Finish and mark', async () => {
    saveCampaign(startSitting(newCampaign('cs', T0), 'tmua-2016-p1', 1, T0));
    go({ view: 'campaign' });
    go({ view: 'paper', paperId: 'tmua-2016-p1' });
    render(<App />);
    expect((await screen.findByRole('timer')).textContent).toBe('1:15:00');
    expect(nav()).toBeNull();
    expect(document.querySelector('.ds-fbar-mid')?.textContent).toBe('timed · no hints');
    expect(screen.getByText('remaining of 1:15:00')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '+ flag a part' }));
    fireEvent.input(screen.getByRole('textbox', { name: /Part to flag/ }), { target: { value: 'Q7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Flag' }));
    expect(screen.getByRole('button', { name: 'Q7, flagged. Press to unflag.' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Open the paper/ }).getAttribute('href')).toContain('TMUA-2016-paper-1.pdf');
    fireEvent.click(screen.getByRole('button', { name: 'Finish and mark' }));
    await flush();
    // Finished: no longer timed, so the tabs come back.
    expect(nav()).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Check my answers' })).toBeTruthy();
  });
});

describe('You', () => {
  it('mounts the OutcomePanel, How predictions work, settings, help, and Progress', async () => {
    go({ view: 'progress' });
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Predicted outcomes');
    expect(document.querySelector('[data-slot="OutcomePanel"]')).not.toBeNull();
    const how = screen.getByText('How predictions work').closest('details') as HTMLDetailsElement;
    expect(how.open).toBe(false);
    expect(how.textContent).toContain('only papers you sat under time');
    expect(screen.getByText('Glossary', { selector: '.ds-x' }).closest('a')?.getAttribute('href')).toBe('#/glossary');
    expect(screen.getByRole('group', { name: 'Theme' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Progress' })).toBeTruthy();
  });
});
