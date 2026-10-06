/**
 * Navigation through the whole app: every step has a route, the browser's Back returns to
 * the previous view (never out of the app or into a broken state), and leaving a step
 * keeps its place.
 */
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { IDBFactory } from 'fake-indexeddb';
import type { IdbFactoryLike, Progress } from '@learnhub/mastery';
import { DEFAULT_COURSES, ensureSession, finishPlacement, startLearner } from '@/model/learner';
import { loadPlace } from '@/model/lessonState';
import { go, parseRoute, route } from '@/model/route';
import { commit, flush, init, progress, setClock } from '@/model/store';
import { App } from '@/ui/App';
import { helpOpen } from '@/ui/help/state';
import { termOpen } from '@/ui/termState';
import { LEARNER_NAME, greeting, nyClock } from '@/model/shell';

const T0 = new Date(2026, 9, 4, 9, 0).getTime();
/** Today's heading is the greeting. */
const TODAY = `${greeting(nyClock(T0).h)}, ${LEARNER_NAME}.`;
let idb: IdbFactoryLike;

/** The browser's Back: resolves once the app has seen the hash change. */
async function back(): Promise<void> {
  // Let any hash change already queued (from a click that navigated) arrive first.
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
  expect(location.hash).not.toBe(before);
  await flush();
}

const click = (name: string | RegExp): void => { fireEvent.click(screen.getByRole('button', { name })); };
/** Read a lesson's named sections through to the worked examples (a lesson may have one section or several). */
const toExamples = (): void => {
  for (let i = 0; i < 20 && screen.queryByRole('button', { name: 'Next: worked examples' }) === null; i++) click(/^Next: /);
  click('Next: worked examples');
};
const heading = (): string | null | undefined => document.querySelector('main h1')?.textContent;

beforeEach(async () => {
  Element.prototype.scrollTo ??= () => {};
  localStorage.clear();
  sessionStorage.clear();
  // Mark the tour seen, so it does not cover the views under test.
  localStorage.setItem('mastery.tour.v1', '1');
  history.replaceState(null, '', '#/');
  route.value = parseRoute('#/');
  setClock(() => T0);
  idb = new IDBFactory() as unknown as IdbFactoryLike;
  await init(idb);
});
afterEach(cleanup);

describe('the start', () => {
  it('offers the one course; choosing it goes straight to Today with the first lessons from scratch', async () => {
    render(<App />);
    expect(heading()).toBe('Welcome');
    expect(screen.getAllByRole('radio').map((r) => r.closest('label')?.textContent)).toEqual(['Probability and Discrete Mathematics']);
    click('Start learning');
    await flush();
    expect(location.hash).toBe('#/');
    expect(heading()).toBe(TODAY);
    await screen.findByText('Fractions and ratios', { selector: '.task-title' });
    await flush();
    expect(progress.value?.session?.tasks.map((t) => [t.kind, t.topicIds[0]])).toEqual([
      ['lesson', 'pre.fractions'], ['lesson', 'pre.indices'], ['lesson', 'pre.algebraic-manipulation'],
    ]);

    // Back does not reopen the start: a learner with a course is moved on to Today.
    await back();
    await waitFor(() => expect(location.hash).toBe('#/'));
    expect(heading()).toBe(TODAY);
  });

  it('the glossary before a course is chosen has a way back to the start', async () => {
    go({ view: 'glossary', termId: null });
    render(<App />);
    expect([...document.querySelectorAll('nav.ds-nav a.ds-tab')].map((a) => a.textContent)).toEqual(['Home', 'Glossary']);
    click('Back to the start');
    expect(location.hash).toBe('#/start');
    expect(heading()).toBe('Welcome');
  });
});

describe('no route or control leads to a placement test', () => {
  const noPlacement = (): void => {
    // Whole words: the glossary's "without replacement" is not about placement.
    expect(document.body.textContent).not.toMatch(/\bplacement\b|\bplaced\b/i);
    expect(document.querySelector('a[href*="placement"]')).toBeNull();
  };

  it('for a new learner and a learner with a course, an old #/placement link and every view and the help say nothing of it', async () => {
    for (const started of [false, true]) {
      if (started) await commit(startLearner(T0, DEFAULT_COURSES, 60));
      history.replaceState(null, '', '#/placement');
      route.value = parseRoute('#/placement');
      render(<App />);
      await flush();
      // An unknown route is Today for a learner with a course; a new learner is moved to Start.
      expect(route.value.view).toBe(started ? 'today' : 'start');
      expect(heading()).toBe(started ? TODAY : 'Welcome');
      noPlacement();
      for (const a of [...document.querySelectorAll<HTMLAnchorElement>('nav.ds-nav a')]) {
        fireEvent.click(a);
        await flush();
        noPlacement();
      }
      helpOpen.value = true;
      await waitFor(() => expect(document.querySelector('.modal.help')).not.toBeNull());
      noPlacement();
      helpOpen.value = false;
      cleanup();
    }
  });
});

describe('progress saved by the placement test of earlier builds', () => {
  const answer = (topicId: string, correct: boolean) => ({ topicId, correct, at: T0 });

  it('mid-placement: the answers given are kept as results, and a reload goes to Today', async () => {
    await commit({ ...startLearner(T0, DEFAULT_COURSES, 60), placement: { answers: [answer('comb.factorial', true), answer('pre.fractions', false)], done: false } });
    await init(idb);
    expect(progress.value?.placement).toMatchObject({ done: true, answers: [{ topicId: 'comb.factorial' }, { topicId: 'pre.fractions' }] });
    expect(Object.keys(progress.value?.memory ?? {}).sort()).toEqual(['comb.factorial', 'pre.product-rule']);
    history.replaceState(null, '', '#/placement');
    route.value = parseRoute('#/placement');
    render(<App />);
    expect(route.value.view).toBe('today');
    expect(heading()).toBe(TODAY);
    await screen.findByText('Fractions and ratios', { selector: '.task-title' });
    expect(screen.queryByText('The product rule for counting')).toBeNull();
    // The migrated document was saved, so the next load needs no migration.
    await flush();
    const saved = progress.value;
    await init(idb);
    expect(progress.value?.placement?.done).toBe(true);
    expect(progress.value?.memory).toEqual(saved?.memory);
  });

  it('a finished placement keeps its results and goes to Today', async () => {
    const done = finishPlacement({ ...startLearner(T0, DEFAULT_COURSES, 60), placement: { answers: [answer('comb.factorial', true)], done: false } }, T0);
    await commit(done);
    await init(idb);
    expect(progress.value?.memory).toEqual(done.memory);
    render(<App />);
    expect(heading()).toBe(TODAY);
  });
});

describe('a learner with a course', () => {
  async function started(): Promise<void> {
    await commit(ensureSession(startLearner(T0, DEFAULT_COURSES, 60), T0));
  }

  it('Back walks the views in order: Today, a lesson, Today, the course, the map, a topic, You, the glossary', async () => {
    await started();
    render(<App />);
    await screen.findByText('Fractions and ratios', { selector: '.task-title' });
    click('Start');
    expect(location.hash).toBe('#/task/0');
    // A lesson is a focus screen: no tabs; the bar's way back goes to Today, where it was opened.
    expect(document.querySelector('nav.ds-nav')).toBeNull();
    fireEvent.click(document.querySelector('.ds-fbar-back') as Element);
    expect(location.hash).toBe('#/');
    fireEvent.click(document.querySelector('nav.ds-nav a[data-nav="course"]') as Element);
    expect(location.hash).toBe('#/book');
    fireEvent.click(screen.getByText('Prerequisite map'));
    fireEvent.click(document.querySelector('.node') as Element);
    const topic = location.hash;
    expect(topic).toMatch(/^#\/map\//);
    fireEvent.click(document.querySelector('nav.ds-nav a[data-nav="you"]') as Element);
    expect(location.hash).toBe('#/progress');
    fireEvent.click(screen.getByText('Glossary', { selector: '.ds-x' }));
    expect(location.hash).toBe('#/glossary');

    await back();
    expect(location.hash).toBe('#/progress');
    await back();
    expect(location.hash).toBe(topic);
    expect(document.querySelector('.map-details.open')).not.toBeNull();
    await back();
    expect(location.hash).toBe('#/map');
    await back();
    expect(location.hash).toBe('#/book');
    await back();
    expect(location.hash).toBe('#/');
    await back();
    expect(location.hash).toBe('#/task/0');
    expect(heading()).toBe('Fractions and ratios');
    await back();
    expect(location.hash).toBe('#/');
    expect(heading()).toBe(TODAY);
  });

  it('#/start shows Today, not the start screen again', async () => {
    await started();
    go({ view: 'start' });
    render(<App />);
    await waitFor(() => expect(location.hash).toBe('#/'));
    expect(heading()).toBe(TODAY);
  });

  it('leaving a lesson mid-practice keeps its place, and says the count resets if the tab closes', async () => {
    await started();
    go({ view: 'task', index: 0 });
    render(<App />);
    toExamples();
    click('Next: practice');
    expect(screen.getByText(/If the tab is closed, practice starts again/)).toBeTruthy();
    click(/^Show me how/);
    click('Next problem');
    expect(screen.getByText(/^Problem 2\./)).toBeTruthy();
    // The note is said once, before the first problem.
    expect(screen.queryByText(/If the tab is closed, practice starts again/)).toBeNull();

    click('Back to today');
    expect(location.hash).toBe('#/');
    expect(loadPlace(`lesson-${progress.value?.session?.startedAt ?? 0}-0.pre.fractions`)).toMatchObject({ stage: 'practice', practice: { attempts: 1 } });
    click('Start');
    expect(screen.getByText(/^Problem 2\./)).toBeTruthy();

    // A reload in the same tab resumes too.
    cleanup();
    await init(idb);
    render(<App />);
    expect(screen.getByText(/^Problem 2\./)).toBeTruthy();
  });

  it('a lesson opened from the map goes back to the map, and resumes where it was', async () => {
    await started();
    go({ view: 'map', topicId: 'pre.indices' });
    render(<App />);
    click('Learn it now');
    expect(location.hash).toBe('#/learn/pre.indices');
    // The lesson downloads its content first; the second time it is already here.
    await screen.findByRole('button', { name: /^Next: / });
    toExamples();
    click('Back to the map');
    expect(location.hash).toBe('#/map/pre.indices');
    click('Learn it now');
    expect(screen.getByRole('button', { name: 'Next: practice' })).toBeTruthy();
  });

  it('the map topic has Close, and Back from a topic returns to the map', async () => {
    await started();
    go({ view: 'map', topicId: null });
    go({ view: 'map', topicId: 'pre.fractions' });
    render(<App />);
    click('Close');
    expect(location.hash).toBe('#/map');
  });

  it('a dialog closes when Back changes the view', async () => {
    await started();
    go({ view: 'map', topicId: null });
    go({ view: 'progress' });
    render(<App />);
    click(/^Help/);
    expect(helpOpen.value).toBe(true);
    termOpen.value = 'union';
    await back();
    await waitFor(() => expect(helpOpen.value).toBe(false));
    expect(termOpen.value).toBeNull();
    expect(location.hash).toBe('#/map');
  });

  it('a task that is not in the plan offers a way back', async () => {
    await started();
    go({ view: 'task', index: 99 });
    render(<App />);
    click('Back to today');
    expect(location.hash).toBe('#/');
  });
});

describe('the end of a lesson', () => {
  it('clears the saved place, so the next visit starts fresh', async () => {
    await commit(ensureSession(startLearner(T0, DEFAULT_COURSES, 60), T0));
    go({ view: 'task', index: 0 });
    render(<App />);
    toExamples();
    click('Next: practice');
    const key = `lesson-${progress.value?.session?.startedAt ?? 0}-0.pre.fractions`;
    for (let i = 0; i < 30 && screen.queryByText('Not yet, and that is normal') === null; i++) {
      click(/^Show me how/);
      click(/^(Next problem|See the result)$/);
    }
    expect(loadPlace(key)?.stage).toBe('practice');
    click('Continue');
    await flush();
    expect(loadPlace(key)).toBeNull();
    expect(progress.value?.session?.tasks[0]).toMatchObject({ done: true, passed: false });
  });
});
