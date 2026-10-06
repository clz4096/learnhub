import { describe, expect, it } from 'vitest';
import { BOOK_ORDER } from '@learnhub/content/book';
import { DAY_MS, placedMemory, planSession, type Progress } from '@learnhub/mastery';
import { ALL_TOPICS, shares } from '@/model/courses';
import { bookFrontier, chapterProgress, hereChapter, nextInBook, stepStates } from '@/model/book';
import { DEFAULT_COURSES, completeLesson, ensureSession, hasContent, startLearner } from '@/model/learner';

const T0 = new Date(2026, 9, 4, 9, 0).getTime();
const fresh = (): Progress => startLearner(T0, DEFAULT_COURSES, 60);
const learn = (p: Progress, ...ids: string[]): Progress => ids.reduce((q, id) => completeLesson(q, id, true, T0, null, 15), p);
const bookIndex = (id: string): number => BOOK_ORDER.indexOf(id);

describe('next in the book', () => {
  it('starts at the first step of Preparation', () => {
    const p = fresh();
    expect(nextInBook(p)?.step.topicId).toBe('pre.fractions');
    expect(hereChapter(p)?.title).toBe('STEP Foundation, Block 1: Algebra and graphs');
  });

  it('is the first written, unlearned step whose prerequisites are learned, in book order', () => {
    const p = learn(fresh(), 'pre.fractions', 'pre.indices', 'pre.algebraic-manipulation');
    const next = nextInBook(p);
    expect(next?.step.topicId).toBe('pre.sequences');
    expect(next?.section.title).toMatch(/^Assignment 3:/);
    const front = bookFrontier(p);
    expect(front[0]).toBe('pre.sequences');
    expect([...front].sort((a, b) => bookIndex(a) - bookIndex(b))).toEqual(front);
    for (const id of front) expect(hasContent(id)).toBe(true);
  });

  it('counts a chapter\'s steps, written lessons, and learned steps', () => {
    const p = learn(fresh(), 'pre.fractions');
    const ch = hereChapter(p);
    expect(ch === undefined ? null : chapterProgress(p, ch)).toMatchObject({ steps: 10, learned: 1 });
    const st = stepStates(p, T0);
    expect(st.get('pre.fractions')).toBe('mastered');
    expect(st.get('prob.poisson-distribution')).toBe('towrite');
    expect(st.get('pre.indices')).toBe('ready');
    expect(st.get('proof.direct')).toBe('locked');
  });
});

describe("Today's new lessons follow the book", () => {
  it('plans lessons in book order', () => {
    const p = ensureSession(learn(fresh(), 'pre.fractions', 'pre.indices', 'pre.algebraic-manipulation'), T0 + 1);
    const lessons = (p.session?.tasks ?? []).filter((t) => t.kind === 'lesson').map((t) => t.topicIds[0] as string);
    expect(lessons[0]).toBe('pre.sequences');
    expect([...lessons].sort((a, b) => bookIndex(a) - bookIndex(b))).toEqual(lessons);
  });

  it('leaves the reviews to the engine', () => {
    // Without implicit credit no lesson covers a review, so the reviews must be exactly the engine's.
    const known = ['pre.fractions', 'pre.indices', 'pre.set-notation', 'pre.product-rule'];
    const base = fresh();
    const p: Progress = { ...base, memory: placedMemory(known, T0 - 40 * DAY_MS), settings: { ...base.settings, implicitCredit: false } };
    const now = T0 + DAY_MS;
    const engine = planSession({
      topics: ALL_TOPICS, courses: shares(p.courses), memory: p.memory, now, teachable: hasContent,
      options: { budgetMinutes: 60, implicitCredit: false },
    });
    const ours = ensureSession(p, now).session?.tasks ?? [];
    const reviews = (ts: readonly { kind: string; topicIds?: readonly string[]; topicId?: string }[]): string[] =>
      ts.filter((t) => t.kind === 'review').map((t) => (t.topicIds?.[0] ?? t.topicId) as string);
    expect(reviews(ours)).toEqual(reviews(engine.tasks));
    expect(reviews(ours).length).toBeGreaterThan(0);
  });
});
