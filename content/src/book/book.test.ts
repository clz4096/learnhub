import { describe, expect, it } from 'vitest';
import { topics } from '@learnhub/graph';
import { CONTENT_IDS } from '../load';
import { BOOK, BOOK_ORDER, BOOK_STEPS, CHAPTERS, PLACEMENT, PREREQ_FLAGS, chapterById, placeOf, prerequisiteGaps } from './book';

const GRAPH_IDS = new Set(topics.map((t) => t.id));

describe('the book', () => {
  it('reads every year, term, and course of the curriculum', () => {
    expect(BOOK.map((y) => y.id)).toEqual(['prep', 'IA', 'IB', 'II']);
    expect(BOOK.map((y) => y.afterPreparation)).toEqual([false, true, true, true]);
    expect(BOOK[1]?.terms.map((t) => t.name)).toEqual(['Michaelmas', 'Lent', 'Easter']);
    expect(CHAPTERS.length).toBe(140);
  });

  it('gives every chapter and section a unique id that routes accept', () => {
    const ids = CHAPTERS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9.-]+$/);
    const secs = CHAPTERS.flatMap((c) => c.sections.map((s) => s.id));
    expect(new Set(secs).size).toBe(secs.length);
    for (const c of CHAPTERS) expect(chapterById(c.id)).toBe(c);
  });

  it('uses no en or em dashes in its text', () => {
    for (const c of CHAPTERS) {
      for (const s of [c.title, c.why, c.overlap, c.runs, ...c.sections.map((x) => x.title)]) expect(s).not.toMatch(/[\u2013\u2014]/);
    }
  });

  it('places only graph topics', () => {
    expect(BOOK_ORDER.filter((id) => !GRAPH_IDS.has(id))).toEqual([]);
  });

  it('places each topic at most once (rule 1)', () => {
    const seen = new Set<string>();
    const twice = BOOK_ORDER.filter((id) => (seen.has(id) ? true : (seen.add(id), false)));
    expect(twice).toEqual([]);
  });

  it('places every topic with a written lesson', () => {
    expect(CONTENT_IDS.filter((id) => placeOf(id) === undefined)).toEqual([]);
  });

  it('places every topic of the graph, so a lesson written next already has its place', () => {
    expect(topics.map((t) => t.id).filter((id) => placeOf(id) === undefined)).toEqual([]);
  });

  it('puts every prerequisite earlier in the book, or flags it (rule 2)', () => {
    const gaps = prerequisiteGaps(topics);
    const unflagged = gaps.filter((g) => PREREQ_FLAGS[g.topicId]?.prereq !== g.prereq);
    expect(unflagged).toEqual([]);
    // A flag whose gap has closed is stale.
    const open = new Set(gaps.map((g) => `${g.topicId}<${g.prereq}`));
    for (const [id, f] of Object.entries(PREREQ_FLAGS)) expect(open.has(`${id}<${f.prereq}`)).toBe(true);
  });

  it('follows the revision: Preparation, then Discrete Mathematics, Analysis I, Probability', () => {
    const where = (id: string): string => {
      const p = placeOf(id);
      return p === undefined ? '' : `${p.chapter.yearId}/${p.chapter.title}/${p.section.title}`;
    };
    expect(where('pre.fractions')).toMatch(/^prep\/STEP Foundation, Block 1/);
    expect(where('comb.pigeonhole')).toMatch(/^prep\/STEP Foundation, Block 2: .*\/Assignment 5:/);
    expect(where('logic.connectives')).toBe('IA/Discrete Mathematics/Proof');
    expect(where('num.diffie-hellman')).toBe('IA/Discrete Mathematics/Numbers');
    expect(where('an.nonnegative-series')).toBe('IA/Analysis I/Limits and convergence');
    expect(where('prob.classical-probability')).toBe('IA/Probability/Basic concepts');
    expect(where('prob.event-spaces')).toBe('IA/Probability/Axiomatic approach');
    expect(where('prob.poisson-distribution')).toBe('IA/Probability/Discrete random variables');
    // Overlapping courses are taught once, in the chapter named in the design.
    const ns = CHAPTERS.find((c) => c.yearId === 'IA' && c.title === 'Numbers and Sets');
    expect(ns?.sections.every((s) => s.steps.length === 0)).toBe(true);
  });

  it('numbers steps in book order', () => {
    BOOK_STEPS.forEach((s, i) => expect(s.order).toBe(i));
    expect(Object.keys(PLACEMENT).length).toBeGreaterThan(0);
  });
});
