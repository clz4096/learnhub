import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { IDBFactory } from 'fake-indexeddb';
import type { IdbFactoryLike } from '@learnhub/mastery';
import { DEFAULT_COURSES, ensureSession, startLearner } from '@/model/learner';
import { go } from '@/model/route';
import { commit, flush, init, setClock } from '@/model/store';
import { emptyStory, NO_NUMBERS } from '@/model/story';
import { saveStory } from '@/model/storyStore';
import { App } from '@/ui/App';
import { placeOf } from '@learnhub/content/book';
import { hasContent } from '@learnhub/content';
import { ALL_TOPICS } from '@/model/courses';

const chapterIdOf = (topicId: string): string => placeOf(topicId)?.chapter.id ?? '';

const T0 = new Date(2026, 9, 4, 9, 0).getTime();

beforeEach(async () => {
  Element.prototype.scrollTo ??= () => {};
  localStorage.clear();
  location.hash = '';
  // The Prologue seen, so it does not play over the views under test.
  saveStory({ ...emptyStory(), seen: { prologue: { first: T0, last: T0, plays: 1, n: { ...NO_NUMBERS } } } });
  setClock(() => T0);
  await init(new IDBFactory() as unknown as IdbFactoryLike);
  await commit(ensureSession(startLearner(T0, DEFAULT_COURSES, 60), T0));
});
afterEach(cleanup);

const text = (): string => document.querySelector('main')?.textContent ?? '';

describe('the Course tab: the degree as a book', () => {
  it('opens from the Course tab: four stages in plain words, what each covers, and where you are', () => {
    render(<App />);
    fireEvent.click(document.querySelector('nav.ds-nav a[data-nav="course"]') as Element);
    expect(location.hash).toBe('#/book');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Four stages');
    const stages = [...document.querySelectorAll('.ds-stage .ds-stage-n')].map((x) => x.textContent);
    expect(stages).toEqual(['Getting in', 'First year', 'Second year', 'Third year']);
    expect([...document.querySelectorAll('.ds-stage .ds-num')].map((x) => x.textContent)).toEqual(['01', '02', '03', '04']);
    // Only the stage you are in is open; the others show what they cover and their main courses.
    expect([...document.querySelectorAll('details.book-yr')].map((d) => (d as HTMLDetailsElement).open)).toEqual([true, false, false, false]);
    const first = document.querySelectorAll('.ds-stage')[1] as HTMLElement;
    expect(first.querySelector('.ds-what')?.textContent).toBe('Probability, analysis, algebra, first computer science courses.');
    expect(first.querySelector('.ds-peek')?.textContent).toContain('Analysis I · Probability');
    expect(first.querySelector('.ds-stage-top .ds-meta')?.textContent).toBe('after Getting in');
    // The chapter you are in, in plain words, with its exam as a tag and a lesson count.
    const here = document.querySelector('.book-ch.here') as HTMLElement;
    expect(here.querySelector('.t')?.textContent).toBe('Algebra and graphs STEP (you are here)');
    expect(here.querySelector('abbr')?.getAttribute('title')).toMatch(/^STEP: /);
    expect(here.querySelector('.r')?.textContent).toBe('0 of 21 lessons');
    expect(here.querySelector('a')?.getAttribute('href')).toBe(`#/book/${chapterIdOf('pre.fractions')}`);
    expect(text()).not.toMatch(/[–—]/);
  });

  it('has a Continue card for the next step, folds optional courses, lists left-out ones quietly, and keeps the map one link away', () => {
    go({ view: 'book' });
    render(<App />);
    const cont = document.querySelector('a.ds-cont') as HTMLAnchorElement;
    expect(cont.getAttribute('href')).toBe('#/learn/pre.fractions/book');
    expect(cont.querySelector('.ds-now-t')?.textContent).toBe('Fractions and ratios');
    const ia = document.querySelectorAll('details.book-yr')[1] as HTMLElement;
    expect(ia.querySelector('details.book-opt > summary')?.textContent).toBe('3 optional');
    expect(ia.textContent).toContain('Left out: Mechanics.');
    expect(ia.textContent).toContain('Reading ahead is fine; nothing is locked.');
    fireEvent.click(screen.getByText('Prerequisite map'));
    expect(location.hash).toBe('#/map');
  });

  it('a chapter page expands a section to its steps, each linked to its lesson', () => {
    const ch = chapterIdOf('pre.fractions');
    go({ view: 'chapter', chapterId: ch });
    render(<App />);
    const next = document.querySelector('.book-steps li.here');
    expect(next?.textContent).toMatch(/^Fractions and ratios/);
    expect(next?.querySelector('a')?.getAttribute('href')).toBe('#/learn/pre.fractions/book');
    // A bridge step is tagged; a step links to its lesson exactly when the lesson is written.
    const steps = [...document.querySelectorAll('.book-steps li')];
    const bridge = steps.find((li) => li.textContent?.startsWith('Primes, factors, and multiples'));
    expect(bridge?.querySelector('.book-tag')?.textContent).toBe('bridge');
    const titles = new Map(ALL_TOPICS.map((t) => [t.title, t.id] as const));
    for (const li of steps) {
      const id = titles.get(li.querySelector('.book-step-t > a, .book-step-t > span')?.textContent ?? '');
      if (id !== undefined) expect(li.querySelector('a') !== null, id).toBe(hasContent(id));
    }
  });

  it('a chapter page shows its sections, steps, and progress, with previous and next', () => {
    go({ view: 'chapter', chapterId: 'ia-discrete-mathematics' });
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Discrete Mathematics');
    expect(text()).toContain('Part IA · Michaelmas · Computer Science');
    expect(text()).toContain('Opens after the Preparation campaign. Reading ahead is fine; nothing is locked.');
    // Proof is recall since CS-0 Proof teaches it (graph/reviews/cambridge-prep.md); Numbers keeps 13 steps.
    expect(text()).toMatch(/0 of 13 steps learned/);
    const secs = [...document.querySelectorAll('.book-sec')].map((s) => s.querySelector('.t')?.textContent);
    expect(secs).toEqual(['Proof', 'Numbers', 'Sets', 'Formal languages and automata']);
    expect(document.querySelectorAll('.book-sec details[open]')).toHaveLength(1);
    expect(screen.getByText('The greatest common divisor').getAttribute('href')).toBe('#/learn/num.gcd/book');
    expect(document.querySelector('.book-pn .next')?.textContent).toBe('Next: Foundations of Computer Science');
  });

  it('a lesson opened from a chapter goes back to the chapter', async () => {
    go({ view: 'chapter', chapterId: 'ia-discrete-mathematics' });
    render(<App />);
    fireEvent.click(screen.getByText('The greatest common divisor'));
    expect(location.hash).toBe('#/learn/num.gcd/book');
    fireEvent.click(await screen.findByRole('button', { name: 'Back to the chapter' }));
    expect(location.hash).toBe('#/book/ia-discrete-mathematics');
  });

  it('flags a step whose prerequisite comes later in the book', () => {
    go({ view: 'chapter', chapterId: chapterIdOf('prob.normal-approximation') });
    render(<App />);
    // STEP 2 Statistics approximates the Poisson distribution, which IA Probability teaches.
    const approx = [...document.querySelectorAll('.book-steps li')].find((li) => li.textContent?.startsWith('Approximating binomial and Poisson by a normal'));
    expect(approx?.querySelector('.book-flag')?.textContent).toBe('Builds on The Poisson distribution, later in the book.');
  });

  it("Today shows where to continue reading", async () => {
    localStorage.setItem('mastery.wholeday.v1', '1');
    go({ view: 'today' });
    render(<App />);
    await flush();
    const line = await screen.findByText('Continue reading', undefined, { timeout: 5000 });
    const p = line.closest('p');
    expect(p?.querySelector('a.book-next')?.textContent).toBe('Fractions and ratios');
    expect(p?.querySelector('.book-where')?.textContent).toMatch(/^STEP Foundation, Block 1: Algebra and graphs, Assignment 1:/);
  });
});
