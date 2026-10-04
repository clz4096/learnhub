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

const T0 = new Date(2026, 9, 4, 9, 0).getTime();
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

describe('the start and the placement test', () => {
  it('Back from the placement test returns to the courses step, which keeps the courses and minutes', async () => {
    render(<App />);
    expect(heading()).toBe('Welcome');
    fireEvent.input(screen.getByLabelText('Minutes a day'), { target: { value: '45' } });
    fireEvent.click(screen.getAllByRole('checkbox')[1] as HTMLElement);
    click('Continue');
    await flush();
    expect(location.hash).toBe('#/placement');
    expect(heading()).toBe('The placement test');
    click('Start the placement test');
    await flush();
    expect(screen.getByText(/Placement: question 1/)).toBeTruthy();

    await back();
    expect(location.hash).toBe('#/start');
    expect(heading()).toBe('Welcome');
    expect((screen.getByLabelText('Minutes a day') as HTMLInputElement).value).toBe('45');
    expect((screen.getAllByRole('checkbox') as HTMLInputElement[]).map((b) => b.checked)).toEqual([true, false]);
  });

  it('answers are kept on the way back: Resume continues, Start placement over clears them', async () => {
    await commit({ ...startLearner(T0, DEFAULT_COURSES, 60), placement: { answers: [], done: false } });
    go({ view: 'placement' });
    render(<App />);
    click('I do not know this');
    click('Continue');
    await flush();
    expect(screen.getByText(/Placement: question 2/)).toBeTruthy();

    click('Back to courses and minutes');
    expect(location.hash).toBe('#/start');
    expect(screen.getByText(/You have answered 1 placement question/)).toBeTruthy();
    click('Resume placement');
    await flush();
    expect(location.hash).toBe('#/placement');
    expect(screen.getByText(/Placement: question 2/)).toBeTruthy();
    expect(progress.value?.placement?.answers).toHaveLength(1);

    await back();
    click('Start placement over');
    await flush();
    expect(screen.getByText(/Placement: question 1/)).toBeTruthy();
    expect(progress.value?.placement?.answers).toEqual([]);
  });

  it('the introduction has a Back too, and a reload shows the same step', async () => {
    await commit(startLearner(T0, DEFAULT_COURSES, 60));
    go({ view: 'placement' });
    render(<App />);
    expect(heading()).toBe('The placement test');
    cleanup();
    await init(idb);
    render(<App />);
    expect(heading()).toBe('The placement test');
    click('Back to courses and minutes');
    expect(heading()).toBe('Welcome');
  });

  it('the glossary before placement has a way back to the test', async () => {
    await commit({ ...startLearner(T0, DEFAULT_COURSES, 60), placement: { answers: [], done: false } });
    go({ view: 'glossary', termId: null });
    render(<App />);
    // Before placement the navigation offers only Home and the glossary.
    expect([...document.querySelectorAll('nav.nav a')].map((a) => a.textContent)).toEqual(['Home', 'Glossary']);
    click('Back to the placement test');
    expect(location.hash).toBe('#/placement');
    expect(screen.getByText(/Placement: question 1/)).toBeTruthy();
  });
});

describe('a placed learner', () => {
  async function placed(): Promise<void> {
    await commit(ensureSession(finishPlacement({ ...startLearner(T0, DEFAULT_COURSES, 60), placement: { answers: [], done: false } }, T0), T0));
  }

  it('Back walks the views in order: Today, a lesson, the map, a topic, the glossary', async () => {
    await placed();
    render(<App />);
    await screen.findByText('Fractions and ratios');
    click('Start');
    expect(location.hash).toBe('#/task/0');
    expect(screen.getByRole('button', { name: 'Back to today' })).toBeTruthy();
    fireEvent.click(screen.getByText('Map', { selector: 'nav a' }));
    fireEvent.click(document.querySelector('.node') as Element);
    const topic = location.hash;
    expect(topic).toMatch(/^#\/map\//);
    fireEvent.click(screen.getByText('Glossary', { selector: 'nav a' }));
    expect(location.hash).toBe('#/glossary');

    await back();
    expect(location.hash).toBe(topic);
    expect(document.querySelector('.map-details.open')).not.toBeNull();
    await back();
    expect(location.hash).toBe('#/map');
    await back();
    expect(location.hash).toBe('#/task/0');
    expect(heading()).toBe('Fractions and ratios');
    await back();
    expect(location.hash).toBe('#/');
    expect(heading()).toBe('Today');
  });

  it('the start steps show the placement result, not a broken or repeatable test', async () => {
    await placed();
    for (const view of ['start', 'placement'] as const) {
      go({ view });
      render(<App />);
      expect(heading()).toBe('You are placed');
      cleanup();
    }
  });

  it('leaving a lesson mid-practice keeps its place, and says the count resets if the tab closes', async () => {
    await placed();
    go({ view: 'task', index: 0 });
    render(<App />);
    click('Next: worked examples');
    click('Next: practice');
    expect(screen.getByText(/If the tab is closed, practice starts again/)).toBeTruthy();
    click('Show me how');
    click('Continue');
    expect(screen.getByText(/^Problem 2\./)).toBeTruthy();

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
    await placed();
    go({ view: 'map', topicId: 'pre.indices' });
    render(<App />);
    click('Learn it now');
    expect(location.hash).toBe('#/learn/pre.indices');
    click('Next: worked examples');
    click('Back to the map');
    expect(location.hash).toBe('#/map/pre.indices');
    click('Learn it now');
    expect(screen.getByRole('button', { name: 'Next: practice' })).toBeTruthy();
  });

  it('the map topic has Close, and Back from a topic returns to the map', async () => {
    await placed();
    go({ view: 'map', topicId: null });
    go({ view: 'map', topicId: 'pre.fractions' });
    render(<App />);
    click('Close');
    expect(location.hash).toBe('#/map');
  });

  it('a dialog closes when Back changes the view', async () => {
    await placed();
    go({ view: 'map', topicId: null });
    go({ view: 'progress' });
    render(<App />);
    click('Help');
    expect(helpOpen.value).toBe(true);
    termOpen.value = 'union';
    await back();
    await waitFor(() => expect(helpOpen.value).toBe(false));
    expect(termOpen.value).toBeNull();
    expect(location.hash).toBe('#/map');
  });

  it('a task that is not in the plan offers a way back', async () => {
    await placed();
    go({ view: 'task', index: 99 });
    render(<App />);
    click('Back to today');
    expect(location.hash).toBe('#/');
  });
});

describe('the end of a lesson', () => {
  it('clears the saved place, so the next visit starts fresh', async () => {
    await commit(ensureSession(finishPlacement({ ...startLearner(T0, DEFAULT_COURSES, 60), placement: { answers: [], done: false } }, T0), T0));
    go({ view: 'task', index: 0 });
    render(<App />);
    click('Next: worked examples');
    click('Next: practice');
    const key = `lesson-${progress.value?.session?.startedAt ?? 0}-0.pre.fractions`;
    for (let i = 0; i < 30 && screen.queryByText('Not yet, and that is normal') === null; i++) {
      click('Show me how');
      click('Continue');
    }
    expect(loadPlace(key)?.stage).toBe('practice');
    click('Continue');
    await flush();
    expect(loadPlace(key)).toBeNull();
    expect(progress.value?.session?.tasks[0]).toMatchObject({ done: true, passed: false });
  });
});
