/**
 * Story mode in the app: the Prologue on first launch (once, skippable, replayable), the
 * choices and the end card, First Light from real progress, Shabbat and work in progress
 * holding scenes back, and the Story tab.
 */
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { IDBFactory } from 'fake-indexeddb';
import { placedMemory, type IdbFactoryLike } from '@learnhub/mastery';
import { chapterById } from '@learnhub/content/book';
import { DEFAULT_COURSES, ensureSession, startLearner } from '@/model/learner';
import { go, parseRoute, route } from '@/model/route';
import { commit, flush, init, setClock } from '@/model/store';
import { NO_NUMBERS, emptyStory } from '@/model/story';
import { STEP_BLOCK_1 } from '@/model/storyScenes';
import { STORY_KEY, playing, reloadStory, saveStory, story } from '@/model/storyStore';
import { App } from '@/ui/App';

/** Monday 2026-10-05, 10:00 am in New York. */
const T0 = Date.UTC(2026, 9, 5, 14, 0);
/** Saturday 2026-10-10, noon in New York: Shabbat. */
const SATURDAY = Date.UTC(2026, 9, 10, 16, 0);
const realMatchMedia = window.matchMedia;

beforeEach(async () => {
  Element.prototype.scrollTo ??= () => {};
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('mastery.tour.v1', '1');
  reloadStory();
  playing.value = null;
  history.replaceState(null, '', '#/');
  route.value = parseRoute('#/');
  setClock(() => T0);
  // Reduced motion: the title card lasts 300 ms and lines appear whole.
  window.matchMedia = ((q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
  await init(new IDBFactory() as unknown as IdbFactoryLike);
});
afterEach(() => {
  cleanup();
  playing.value = null;
  window.matchMedia = realMatchMedia;
});

const dialog = (): HTMLElement | null => document.querySelector('.sp-stage');
const click = (name: string | RegExp): void => { fireEvent.click(screen.getByRole('button', { name })); };
const endCard = (): Record<string, string> =>
  Object.fromEntries([...document.querySelectorAll('.sp-end li')].map((li) => [li.children[0]?.textContent ?? '', li.children[1]?.textContent ?? '']));

async function withCourse(memory: string[] = []): Promise<void> {
  const p = ensureSession(startLearner(T0, DEFAULT_COURSES, 60), T0);
  await commit({ ...p, memory: placedMemory(memory, T0) });
}

function prologueSeen(): void {
  saveStory({ ...emptyStory(), seen: { prologue: { first: T0, last: T0, plays: 1, n: { ...NO_NUMBERS } } } });
}

describe('the Prologue', () => {
  it('plays on first launch, before the start, and skips to an end card with real numbers', async () => {
    render(<App />);
    await flush();
    await waitFor(() => expect(dialog()).not.toBeNull());
    expect(dialog()?.getAttribute('aria-label')).toBe('Prologue: The Kitchen Table');
    expect(document.querySelector('.sp-title h1')?.textContent).toBe('The Kitchen Table');
    expect(document.querySelector('.sp-p')?.textContent).toBe('Brooklyn, 5:04 am');
    // The app behind is inert while a scene plays.
    expect(document.querySelector('.app')?.hasAttribute('inert')).toBe(true);
    await waitFor(() => expect(document.querySelector('.sp-txt')?.textContent).toBe('The radiator knocks twice. The city is still dark, except for the laptop.'));
    expect(document.querySelector('.sp-who')?.textContent).toBe('Narration');
    fireEvent.keyDown(dialog() as HTMLElement, { key: ' ' });
    await waitFor(() => expect(document.querySelector('.sp-txt')?.textContent).toMatch(/^On the screen: STEP 2005/));
    click('Skip');
    await waitFor(() => expect(document.querySelector('.sp-end')).not.toBeNull());
    expect(document.querySelector('.sp-end .sp-k')?.textContent).toBe('Prologue complete');
    expect(endCard()).toEqual({ REP: '0 · Applicant', Priya: 'unchanged', Focus: 'unchanged', 'Triggered by': 'first launch' });
    expect(document.querySelector('.sp-next')?.textContent).toBe('Next: First Light. It plays when you finish STEP Foundation, Block 1.');
    expect(story.value.seen.prologue?.plays).toBe(1);
    expect(JSON.parse(localStorage.getItem(STORY_KEY) ?? '{}').seen.prologue.plays).toBe(1);
    click('Continue');
    await waitFor(() => expect(dialog()).toBeNull());
    expect(document.querySelector('main h1')?.textContent).toBe('Welcome');

    // Never again by itself.
    cleanup();
    render(<App />);
    await flush();
    await new Promise((r) => setTimeout(r, 20));
    expect(dialog()).toBeNull();
  });

  it('a choice moves Priya, and the end card says so', async () => {
    render(<App />);
    await waitFor(() => expect(document.querySelector('.sp-txt')).not.toBeNull());
    for (let i = 0; i < 20 && document.querySelector('.sp-choices') === null; i++) fireEvent.click(document.querySelector('.sp-frame') as Element);
    const options = [...document.querySelectorAll('.sp-choices button')];
    expect(options.map((b) => b.textContent)).toEqual([
      '"Already on question one." Priya will remember this',
      '"Go back to sleep. I\'m only looking." Keep your cards close',
      'Turn the phone face down. Open the paper. Focus',
    ]);
    expect(document.activeElement).toBe(options[0]);
    // Space and Enter never pass an open choice.
    fireEvent.keyDown(dialog() as HTMLElement, { key: 'Enter' });
    expect(document.querySelector('.sp-choices')).not.toBeNull();
    fireEvent.click(options[0] as Element);
    await waitFor(() => expect(document.querySelector('.sp-txt')?.textContent).toBe('"Of course you are. Send me case one when you have it."'));
    expect(document.querySelector('.sp-who.sp-msg')?.textContent).toBe('Priya');
    for (let i = 0; i < 20 && document.querySelector('.sp-end') === null; i++) fireEvent.keyDown(dialog() as HTMLElement, { key: 'Enter' });
    await waitFor(() => expect(document.querySelector('.sp-end')).not.toBeNull());
    expect(endCard().Priya).toBe('closer (friendly)');
    expect(story.value.relationships.priya).toBe(1);
    expect(story.value.choices.prologue).toEqual({ reply: 'already' });

    // Replay plays it again from the title card; Escape skips, then closes.
    click('Replay scene');
    await waitFor(() => expect(document.querySelector('.sp-end')).toBeNull());
    fireEvent.keyDown(dialog() as HTMLElement, { key: 'Escape' });
    await waitFor(() => expect(document.querySelector('.sp-end')).not.toBeNull());
    expect(story.value.seen.prologue?.plays).toBe(2);
    // A skipped replay keeps the earlier choice.
    expect(story.value.relationships.priya).toBe(1);
    fireEvent.keyDown(dialog() as HTMLElement, { key: 'Escape' });
    await waitFor(() => expect(dialog()).toBeNull());
  });

  it('a choice made before skipping still counts', async () => {
    render(<App />);
    await waitFor(() => expect(document.querySelector('.sp-txt')).not.toBeNull());
    for (let i = 0; i < 20 && document.querySelector('.sp-choices') === null; i++) fireEvent.click(document.querySelector('.sp-frame') as Element);
    fireEvent.click(document.querySelector('.sp-choices button') as Element);
    click('Skip');
    await waitFor(() => expect(document.querySelector('.sp-end')).not.toBeNull());
    expect(endCard().Priya).toBe('closer (friendly)');
    expect(story.value.relationships.priya).toBe(1);
  });

  it('waits out Shabbat, and the Story tab offers it to play now', async () => {
    setClock(() => SATURDAY);
    await withCourse();
    go({ view: 'story' });
    render(<App />);
    await flush();
    await new Promise((r) => setTimeout(r, 20));
    expect(dialog()).toBeNull();
    expect(story.value.queued.map((q) => q.id)).toEqual(['prologue']);
    expect(document.querySelector('main')?.textContent).toContain('Ready. It waits until Saturday sundown to play by itself.');
    click('Play The Kitchen Table');
    await waitFor(() => expect(dialog()).not.toBeNull());
  });

  it('waits while a lesson is open', async () => {
    await withCourse();
    go({ view: 'task', index: 0 });
    render(<App />);
    await flush();
    await new Promise((r) => setTimeout(r, 20));
    expect(dialog()).toBeNull();
    expect(story.value.queued.map((q) => q.id)).toEqual(['prologue']);
  });
});

describe('First Light', () => {
  it('plays when STEP Foundation, Block 1 is complete, with the real numbers on its end card', async () => {
    prologueSeen();
    const block1 = chapterById(STEP_BLOCK_1)!;
    await withCourse(block1.sections.flatMap((s) => s.steps.map((x) => x.topicId)));
    render(<App />);
    await flush();
    await waitFor(() => expect(dialog()?.getAttribute('aria-label')).toBe('Chapter 1: First Light'));
    expect(document.querySelector('.sp-p')?.textContent).toBe('Brooklyn, 6:40 am, the morning after');
    click('Skip');
    await waitFor(() => expect(document.querySelector('.sp-end')).not.toBeNull());
    const sections = String(block1.sections.filter((s) => s.steps.length > 0).length);
    expect(endCard()).toMatchObject({ 'Sections mastered': sections, 'Hours that week': '0', Priya: 'unchanged', 'Triggered by': 'STEP Foundation, Block 1 complete' });
    expect(document.querySelector('.sp-next')?.textContent).toBe('Next: Proof, not yet written. It plays when you finish CS-0 Proof.');
  });

  it('does not play before the chapter is complete', async () => {
    prologueSeen();
    const block1 = chapterById(STEP_BLOCK_1)!;
    await withCourse(block1.sections.flatMap((s) => s.steps.map((x) => x.topicId)).slice(1));
    render(<App />);
    await flush();
    await new Promise((r) => setTimeout(r, 20));
    expect(dialog()).toBeNull();
  });
});

describe('the Story tab', () => {
  it('follows Letters in the tabs and shows REP, relationships, and every scene with its real trigger', async () => {
    prologueSeen();
    await withCourse();
    render(<App />);
    await flush();
    expect([...document.querySelectorAll('nav.nav a')].map((a) => a.textContent).slice(-2)).toEqual(['Letters', 'Story']);
    fireEvent.click(screen.getByText('Story', { selector: 'nav a' }));
    expect(location.hash).toBe('#/story');
    const main = (): string => document.querySelector('main')?.textContent ?? '';
    expect(document.querySelector('main h1')?.textContent).toBe('Story');
    expect(main()).toContain('Applicant');
    expect(main()).toContain('500 to Offer Holder');
    expect(main()).toContain('Priya Ramanacquainted');
    expect(main()).toContain('Dr Ada Lambdanot met yet');
    expect(main()).toContain('1. First Lightlocked');
    expect(main()).toContain('Plays when you finish STEP Foundation, Block 1.');
    expect(main()).toContain('2. Proofnot yet written');
    expect(main()).toContain('Plays when you are halfway through Stage A.');
    expect(main()).toContain('Plays when the offer letter arrives.');
    expect(main()).toContain('Book Two: Part IA');
    expect(main()).not.toMatch(/[\u2013\u2014]/);
    click('Replay The Kitchen Table');
    await waitFor(() => expect(dialog()?.getAttribute('aria-label')).toBe('Prologue: The Kitchen Table'));
  });
});
