import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { IDBFactory } from 'fake-indexeddb';
import type { IdbFactoryLike } from '@learnhub/mastery';
import { DEFAULT_COURSES, ensureSession, startLearner } from '@/model/learner';
import { go } from '@/model/route';
import { commit, init, setClock } from '@/model/store';
import { emptyStory, NO_NUMBERS } from '@/model/story';
import { saveStory } from '@/model/storyStore';
import { App } from '@/ui/App';

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
  it('opens the contents from the Course tab: years, terms, tracks, and where you are', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Course', { selector: 'nav a' }));
    expect(location.hash).toBe('#/book');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('The course');
    const years = [...document.querySelectorAll('details.book-yr > summary .t')].map((x) => x.textContent);
    expect(years).toEqual(['Preparation, before Part IA', 'Part IA, first year', 'Part IB, second year', 'Part II, third year']);
    // Only the year you are in is open.
    expect([...document.querySelectorAll('details.book-yr')].map((d) => (d as HTMLDetailsElement).open)).toEqual([true, false, false, false]);
    expect(text()).toContain('You are in Preparation, Stage A: STEP Foundation and CS-0.');
    const here = document.querySelector('.book-ch.here');
    expect(here?.querySelector('.t')?.textContent).toBe('STEP Foundation, Block 1: Algebra and graphs');
    expect(here?.querySelector('.r')?.textContent).toBe('here · 0 of 21');
    expect(screen.getAllByText('Mathematics', { selector: '.book-track-h' }).length).toBeGreaterThan(3);
    expect(screen.getAllByText('Computer Science', { selector: '.book-track-h' }).length).toBeGreaterThan(3);
    expect(text()).not.toMatch(/[–—]/);
  });

  it('labels Part IA and later as opening after the Preparation campaign, folds optional courses, and lists left-out ones quietly', () => {
    go({ view: 'book' });
    render(<App />);
    const summaries = [...document.querySelectorAll('details.book-yr > summary .r')].map((x) => x.textContent ?? '');
    expect(summaries[0]).not.toMatch(/Opens after/);
    for (const s of summaries.slice(1)) expect(s).toMatch(/Opens after the Preparation campaign/);
    const ia = document.querySelectorAll('details.book-yr')[1] as HTMLElement;
    expect(ia.querySelector('details.book-opt > summary')?.textContent).toBe('3 optional');
    expect(ia.textContent).toContain('Left out: Mechanics.');
    // Lecture counts sit under each chapter.
    const dm = [...ia.querySelectorAll('.book-ch')].find((li) => li.querySelector('.t')?.textContent === 'Discrete Mathematics');
    expect(dm?.querySelector('.s')?.textContent).toMatch(/^24 lectures · 4 sections/);
  });

  it('expands a section to its steps, each linked to its lesson, and keeps the map one link away', () => {
    go({ view: 'book' });
    render(<App />);
    const next = document.querySelector('.book-steps li.here');
    expect(next?.textContent).toMatch(/^Fractions and ratios/);
    expect(next?.querySelector('a')?.getAttribute('href')).toBe('#/learn/pre.fractions/book');
    // A step without a lesson is listed as to write, without a link.
    const unwritten = [...document.querySelectorAll('.book-steps li')].find((li) => li.textContent?.startsWith('Primes, factors, and multiples'));
    expect(unwritten?.querySelector('a')).toBeNull();
    expect(unwritten?.querySelector('.book-tag')?.textContent).toBe('bridge');
    fireEvent.click(screen.getByText('Prerequisite map'));
    expect(location.hash).toBe('#/map');
  });

  it('a chapter page shows its sections, steps, and progress, with previous and next', () => {
    go({ view: 'chapter', chapterId: 'ia-discrete-mathematics' });
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Discrete Mathematics');
    expect(text()).toContain('Part IA · Michaelmas · Computer Science');
    expect(text()).toContain('Opens after the Preparation campaign. You can read ahead; nothing is locked.');
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
    go({ view: 'book' });
    render(<App />);
    // STEP 2 Statistics approximates the Poisson distribution, which IA Probability teaches.
    const approx = [...document.querySelectorAll('.book-steps li')].find((li) => li.textContent?.startsWith('Approximating binomial and Poisson by a normal'));
    expect(approx?.querySelector('.book-flag')?.textContent).toBe('Builds on The Poisson distribution, later in the book.');
  });

  it("Today shows where to continue reading", async () => {
    render(<App />);
    const line = await screen.findByText('Continue reading');
    const p = line.closest('p');
    expect(p?.querySelector('a.book-next')?.textContent).toBe('Fractions and ratios');
    expect(p?.querySelector('.book-where')?.textContent).toMatch(/^STEP Foundation, Block 1: Algebra and graphs, Assignment 1:/);
  });
});
