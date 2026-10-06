/**
 * One universal way home (design decision 19a, in design v4): on every tab route, in every
 * state of the learner, the rail's title and the Home (Today) tab go home (Start before a
 * course is chosen, Today after); a focus screen (a lesson) hides the tabs and its bar's
 * back button, or Escape, returns to where the learner came from. The browser's Back still
 * returns to where the learner was, leaving keeps a lesson's place, and Escape closes every
 * overlay.
 */
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { IDBFactory } from 'fake-indexeddb';
import type { IdbFactoryLike } from '@learnhub/mastery';
import { DEFAULT_COURSES, ensureSession, startLearner } from '@/model/learner';
import { loadPlace } from '@/model/lessonState';
import { go, hrefOf, parseRoute, route, type Route } from '@/model/route';
import { commit, flush, init, progress, setClock } from '@/model/store';
import { App } from '@/ui/App';
import { helpOpen, tour } from '@/ui/help/state';
import { termOpen } from '@/ui/termState';
import { emptyStory, NO_NUMBERS } from '@/model/story';
import { saveStory } from '@/model/storyStore';
import { LEARNER_NAME, focusOf, greeting, nyClock } from '@/model/shell';

const T0 = new Date(2026, 9, 4, 9, 0).getTime();
/** Today's heading is the greeting. */
const TODAY = `${greeting(nyClock(T0).h)}, ${LEARNER_NAME}.`;

/** The browser's Back: resolves once the app has seen the hash change. */
async function back(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
  const before = location.hash;
  await new Promise<void>((resolve) => {
    const on = (): void => {
      if (location.hash === before) return;
      window.removeEventListener('hashchange', on);
      resolve();
    };
    window.addEventListener('hashchange', on);
    history.back();
  });
  await flush();
}

const heading = (): string | null | undefined => document.querySelector('main h1')?.textContent;
const title = (): HTMLAnchorElement => document.querySelector('nav.ds-nav .app-title') as HTMLAnchorElement;
const homeItem = (): HTMLAnchorElement => document.querySelector('nav.ds-nav a[data-nav="home"]') as HTMLAnchorElement;
const tabs = (): (string | null)[] => [...document.querySelectorAll('nav.ds-nav a.ds-tab .ds-tab-l')].map((a) => a.textContent);

beforeEach(async () => {
  Element.prototype.scrollTo ??= () => {};
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('mastery.tour.v1', '1');
  history.replaceState(null, '', '#/');
  route.value = parseRoute('#/');
  setClock(() => T0);
  // The Prologue seen, so it does not play over the views under test.
  saveStory({ ...emptyStory(), seen: { prologue: { first: T0, last: T0, plays: 1, n: { ...NO_NUMBERS } } } });
  await init(new IDBFactory() as unknown as IdbFactoryLike);
});
afterEach(cleanup);

const ROUTES: Route[] = [
  { view: 'today' },
  { view: 'start' },
  { view: 'task', index: 0 },
  { view: 'task', index: 99 },
  { view: 'learn', topicId: 'pre.indices' },
  { view: 'learn', topicId: 'num.gcd' },
  { view: 'map', topicId: null },
  { view: 'map', topicId: 'pre.fractions' },
  { view: 'book' },
  { view: 'chapter', chapterId: 'ia-discrete-mathematics' },
  { view: 'learn', topicId: 'proof.direct', from: 'book' },
  { view: 'progress' },
  { view: 'glossary', termId: null },
  { view: 'glossary', termId: 'union' },
];

const STATES = {
  'a new learner': async (): Promise<void> => {},
  'a learner with a course': async (): Promise<void> => {
    await commit(ensureSession(startLearner(T0, DEFAULT_COURSES, 60), T0));
  },
} as const;

describe('every route has a way home', () => {
  for (const [state, setUp] of Object.entries(STATES)) {
    const started = state === 'a learner with a course';
    const home = started ? '#/' : '#/start';
    const homeHeading = started ? TODAY : 'Welcome';
    for (const r of ROUTES) {
      // With a course, a lesson is a focus screen: no tabs, a bar with one way back.
      const focus = started && focusOf(r, null) !== null;
      it(`${state}, at ${hrefOf(r)}: ${focus ? 'the focus bar and Escape go back' : `the title and Home go to ${home}`}`, async () => {
        await setUp();
        if (focus) {
          go({ view: 'today' });
          go(r);
          render(<App />);
          await flush();
          expect(document.querySelector('nav.ds-nav')).toBeNull();
          fireEvent.click(document.querySelector('.ds-fbar-back') as HTMLElement);
          await flush();
          expect(document.querySelector('nav.ds-nav')).not.toBeNull();
          // And by Escape, from the same route again.
          go(r);
          await flush();
          fireEvent.keyDown(document.body, { key: 'Escape' });
          await flush();
          expect(document.querySelector('nav.ds-nav')).not.toBeNull();
          return;
        }
        go(r);
        render(<App />);
        await flush();
        expect(title().getAttribute('href')).toBe(home);
        expect(homeItem().getAttribute('href')).toBe(home);
        expect(homeItem().querySelector('.ds-tab-l')?.textContent).toBe(started ? 'Today' : 'Home');
        fireEvent.click(homeItem());
        await flush();
        expect(location.hash).toBe(home);
        await waitFor(() => expect(heading()).toBe(homeHeading));
        // And by the title, from the same route again.
        go(r);
        await flush();
        fireEvent.click(title());
        await flush();
        expect(location.hash).toBe(home);
        await waitFor(() => expect(heading()).toBe(homeHeading));
      });
    }
  }

  it('the tabs before a course is chosen are Home and Glossary; after, Today, Course, Admission, Story, and You, each with its number key', async () => {
    render(<App />);
    expect(tabs()).toEqual(['Home', 'Glossary']);
    cleanup();
    await STATES['a learner with a course']();
    render(<App />);
    expect(tabs()).toEqual(['Today', 'Course', 'Admission', 'Story', 'You']);
    expect([...document.querySelectorAll('nav.ds-nav a.ds-tab kbd')].map((k) => k.textContent)).toEqual(['1', '2', '3', '4', '5']);
    expect(homeItem().getAttribute('aria-current')).toBe('page');
    const href = (id: string): string | null | undefined => document.querySelector(`nav.ds-nav a[data-nav="${id}"]`)?.getAttribute('href');
    expect([href('course'), href('admission'), href('story'), href('you')]).toEqual(['#/book', '#/campaign', '#/story', '#/progress']);
    // The brand block: the arms and the title, which goes home.
    expect(document.querySelector('.ds-brand .ds-arms use')?.getAttribute('href')).toBe('#euclid-arms');
    expect(title().textContent).toBe('Computational MathematicsUniversity of Cambridge');
  });

  it('a modified click on Home is left to the browser (open in a new tab)', async () => {
    await STATES['a learner with a course']();
    go({ view: 'progress' });
    render(<App />);
    const ev = new MouseEvent('click', { bubbles: true, cancelable: true, metaKey: true });
    homeItem().dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(false);
    expect(route.value.view).toBe('progress');
  });
});

describe('Home and the browser history', () => {
  it('Back after leaving a lesson returns to the lesson, which kept its place', async () => {
    await STATES['a learner with a course']();
    go({ view: 'today' });
    go({ view: 'task', index: 0 });
    render(<App />);
    // Read the lesson's named sections through to the worked examples.
    for (let i = 0; i < 20 && screen.queryByRole('button', { name: 'Next: worked examples' }) === null; i++) fireEvent.click(screen.getByRole('button', { name: /^Next: / }));
    fireEvent.click(screen.getByRole('button', { name: 'Next: worked examples' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next: practice' }));
    fireEvent.click(screen.getByRole('button', { name: /^Show me how/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Next problem' }));
    expect(screen.getByText(/^Problem 2\./)).toBeTruthy();

    // The lesson is a focus screen: its bar's back button returns to Today, where it was opened from.
    fireEvent.click(document.querySelector('.ds-fbar-back') as HTMLElement);
    await flush();
    expect(location.hash).toBe('#/');
    expect(heading()).toBe(TODAY);
    expect(loadPlace(`lesson-${progress.value?.session?.startedAt ?? 0}-0.pre.fractions`)).toMatchObject({ stage: 'practice', practice: { attempts: 1 } });

    await back();
    expect(location.hash).toBe('#/task/0');
    expect(screen.getByText(/^Problem 2\./)).toBeTruthy();
  });

  it('Home on the home page adds no history entry', async () => {
    await STATES['a learner with a course']();
    render(<App />);
    const length = history.length;
    fireEvent.click(homeItem());
    fireEvent.click(title());
    await flush();
    expect(history.length).toBe(length);
    expect(location.hash).toBe('#/');
  });

  it('the skip link moves focus to the content without changing the route', async () => {
    await STATES['a learner with a course']();
    go({ view: 'progress' });
    render(<App />);
    fireEvent.click(screen.getByText('Skip to content'));
    expect(location.hash).toBe('#/progress');
    expect(document.activeElement?.id).toBe('main');
  });
});

describe('Escape closes every overlay', () => {
  const esc = (el: Element): void => { fireEvent.keyDown(el, { key: 'Escape' }); };

  it('the help dialog, a glossary term, and the tour', async () => {
    await STATES['a learner with a course']();
    go({ view: 'progress' });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /^Help/ }));
    expect(helpOpen.value).toBe(true);
    esc(document.querySelector('.modal.help') as Element);
    await waitFor(() => expect(helpOpen.value).toBe(false));

    termOpen.value = 'union';
    await waitFor(() => expect(document.querySelector('.term-card')).not.toBeNull());
    esc(document.querySelector('.term-card') as Element);
    await waitFor(() => expect(termOpen.value).toBeNull());

    tour.value = { open: true, step: 0 };
    await waitFor(() => expect(document.querySelector('.tour-card')).not.toBeNull());
    esc(document.querySelector('.tour-card') as Element);
    await waitFor(() => expect(tour.value.open).toBe(false));
  });

  it('the topic panel on the map, which a phone shows over the map', async () => {
    await STATES['a learner with a course']();
    go({ view: 'map', topicId: null });
    go({ view: 'map', topicId: 'pre.fractions' });
    render(<App />);
    expect(document.querySelector('.map-details.open')).not.toBeNull();
    esc(document.body);
    await flush();
    expect(location.hash).toBe('#/map');
    expect(document.querySelector('.map-details.open')).toBeNull();
  });

  it('Escape in a dialog over the map closes only the dialog', async () => {
    await STATES['a learner with a course']();
    go({ view: 'map', topicId: 'pre.fractions' });
    render(<App />);
    helpOpen.value = true;
    await waitFor(() => expect(document.querySelector('.modal.help')).not.toBeNull());
    esc(document.querySelector('.modal.help') as Element);
    await waitFor(() => expect(helpOpen.value).toBe(false));
    expect(location.hash).toBe('#/map/pre.fractions');
  });
});
