import { describe, expect, it } from 'vitest';
import { contentFor } from '@learnhub/content';
import { DAY_MS, importProgress, exportProgress, type Progress } from '@learnhub/mastery';
import { closureOf } from '@/model/courses';
import {
  DEFAULT_COURSES, answerPlacement, completeLesson, completeQuiz, completeReview, ensureSession, finishPlacement, hubSummary,
  localDay, placementGraphFor, planMore, replanToday, sessionTime, skipTask, startLearner, statusMap,
} from '@/model/learner';

const T0 = new Date(2026, 9, 4, 9, 0).getTime();
const fresh = (): Progress => finishPlacement({ ...startLearner(T0, DEFAULT_COURSES, 60), placement: { answers: [], done: false } }, T0);

describe('a new learner', () => {
  it('takes both courses at 60 minutes, with no placement yet', () => {
    const p = startLearner(T0, DEFAULT_COURSES, 60);
    expect(p.courses).toEqual(['ia-probability', 'cst-discrete-maths']);
    expect(p.settings.budgetMinutes).toBe(60);
    expect(p.placement).toBeNull();
    expect(importProgress(exportProgress(p)).ok).toBe(true);
  });

  it('placement covers the 98-topic union with a budget of 49', () => {
    const g = placementGraphFor(startLearner(T0, DEFAULT_COURSES, 60));
    expect(g.order).toHaveLength(98);
  });

  it('placement answers are kept, and finishing credits the known topics and their ancestors', () => {
    let p: Progress = { ...startLearner(T0, DEFAULT_COURSES, 60), placement: { answers: [], done: false } };
    p = answerPlacement(p, 'comb.factorial', true, T0);
    p = finishPlacement(p, T0 + 1);
    expect(p.placement?.done).toBe(true);
    expect(Object.keys(p.memory).sort()).toEqual(['comb.factorial', 'pre.product-rule']);
    expect(p.history.map((h) => h.kind)).toEqual(['placement']);
  });
});

describe("today's session", () => {
  it('for a learner who knows nothing is the four root lessons, two per course, each with a reason', () => {
    const p = ensureSession(fresh(), T0);
    const s = p.session;
    expect(s?.day).toBe(localDay(T0));
    expect(s?.tasks.map((t) => [t.kind, t.topicIds[0], t.course])).toEqual([
      ['lesson', 'pre.fractions', 'ia-probability'],
      ['lesson', 'pre.set-notation', 'cst-discrete-maths'],
      ['lesson', 'pre.product-rule', 'ia-probability'],
      ['lesson', 'logic.connectives', 'cst-discrete-maths'],
    ]);
    for (const t of s?.tasks ?? []) expect(t.reason).toMatch(/^New topic/);
    expect(sessionTime(s ?? null)).toEqual({ done: 0, left: 60, byCourse: { 'ia-probability': { done: 0, planned: 30 }, 'cst-discrete-maths': { done: 0, planned: 30 } } });
    for (const t of s?.tasks ?? []) expect(contentFor(t.topicIds[0] as string)).toBeDefined();
  });

  it('is kept for the day and replanned the next day', () => {
    const p = ensureSession(fresh(), T0);
    expect(ensureSession(p, T0 + 3_600_000)).toBe(p);
    expect(ensureSession(p, T0 + DAY_MS).session?.day).toBe(localDay(T0 + DAY_MS));
  });

  it('a passed lesson masters the topic, charges its course, and marks the task', () => {
    const p0 = ensureSession(fresh(), T0);
    const p = completeLesson(p0, 'pre.fractions', true, T0 + 1, 0, 15, 'ia-probability');
    expect(p.memory['pre.fractions']).toBeDefined();
    expect(p.courseMinutes).toEqual({ 'ia-probability': 15 });
    expect(p.learnedSinceQuiz).toEqual(['pre.fractions']);
    expect(p.session?.tasks[0]).toMatchObject({ done: true, passed: true });
    expect(sessionTime(p.session).done).toBe(15);
    expect(importProgress(exportProgress(p)).ok).toBe(true);
  });

  it('a failed lesson leaves the topic unlearned but still charges the time', () => {
    const p = completeLesson(ensureSession(fresh(), T0), 'pre.set-notation', false, T0 + 1, 1, 15, 'cst-discrete-maths');
    expect(p.memory['pre.set-notation']).toBeUndefined();
    expect(p.courseMinutes).toEqual({ 'cst-discrete-maths': 15 });
    expect(p.session?.tasks[1]).toMatchObject({ done: true, passed: false });
  });

  it('a lesson outside the plan is charged to the course behind on minutes', () => {
    let p = ensureSession(fresh(), T0);
    p = { ...p, courseMinutes: { 'ia-probability': 30, 'cst-discrete-maths': 15 } };
    p = completeLesson(p, 'pre.indices', true, T0 + 1, null, 15);
    expect(p.courseMinutes).toEqual({ 'ia-probability': 30, 'cst-discrete-maths': 30 });
  });

  it('skipping marks the task done with no result and changes nothing else', () => {
    const p0 = ensureSession(fresh(), T0);
    const p = skipTask(p0, 2, T0 + 1);
    expect(p.session?.tasks[2]).toMatchObject({ done: true, passed: null });
    expect(p.memory).toEqual(p0.memory);
    expect(p.courseMinutes).toEqual(p0.courseMinutes);
  });

  it('plan more adds a new session after the first is done', () => {
    let p = ensureSession(fresh(), T0);
    p.session?.tasks.forEach((t, i) => { p = completeLesson(p, t.topicIds[0] as string, true, T0 + 1, i, t.minutes, t.course); });
    const more = planMore(p, T0 + 2);
    expect(more.session?.tasks.length).toBeGreaterThan(4);
    expect(more.session?.tasks.slice(0, 4).every((t) => t.done)).toBe(true);
  });

  it('replanning keeps the done tasks and fills only the minutes left', () => {
    let p = ensureSession(fresh(), T0);
    p = completeLesson(p, 'pre.fractions', true, T0 + 1, 0, 15, 'ia-probability');
    p = { ...p, settings: { ...p.settings, budgetMinutes: 30 } };
    const r = replanToday(p, T0 + 2);
    expect(r.session?.tasks[0]).toMatchObject({ done: true, topicIds: ['pre.fractions'] });
    expect(sessionTime(r.session).left).toBeLessThanOrEqual(15);
  });
});

describe('reviews and quizzes', () => {
  const learned = (): Progress => {
    let p = ensureSession(fresh(), T0);
    p.session?.tasks.forEach((t, i) => { p = completeLesson(p, t.topicIds[0] as string, true, T0, i, t.minutes, t.course); });
    return p;
  };

  it('a review stretches or shrinks the interval and is logged', () => {
    const p = learned();
    const ok = completeReview(p, 'pre.fractions', true, T0 + DAY_MS, null);
    const bad = completeReview(p, 'pre.fractions', false, T0 + DAY_MS, null);
    expect(ok.memory['pre.fractions']?.intervalDays).toBeGreaterThan(p.memory['pre.fractions']?.intervalDays as number);
    expect(bad.memory['pre.fractions']?.lapses).toBe(1);
    expect(ok.history.at(-1)).toMatchObject({ kind: 'review', topicId: 'pre.fractions', correct: true });
  });

  it('a review of a topic that is not learned is skipped, not thrown', () => {
    const p = ensureSession(fresh(), T0);
    expect(() => completeReview(p, 'pre.fractions', true, T0, 0)).not.toThrow();
  });

  it('the next day plans a quiz of the four topics, and taking it resets the count', () => {
    const p = ensureSession(learned(), T0 + DAY_MS);
    const quiz = p.session?.tasks.find((t) => t.kind === 'quiz');
    expect(quiz?.topicIds.sort()).toEqual(['logic.connectives', 'pre.fractions', 'pre.product-rule', 'pre.set-notation']);
    const results = Object.fromEntries((quiz?.topicIds ?? []).map((id) => [id, id !== 'pre.set-notation']));
    const q = completeQuiz(p, results, T0 + DAY_MS, p.session?.tasks.indexOf(quiz as never) ?? null);
    expect(q.learnedSinceQuiz).toEqual([]);
    expect(q.history.filter((h) => h.kind === 'quiz')).toHaveLength(4);
    expect(q.memory['pre.set-notation']?.lapses).toBe(1);
  });
});

describe('status and the hub summary', () => {
  it('counts mastered topics in the closure of the chosen courses', () => {
    let p = ensureSession(fresh(), T0);
    expect(hubSummary(p, T0)).toMatchObject({ done: 0, total: 98 });
    p = completeLesson(p, 'pre.fractions', true, T0, 0, 15, 'ia-probability');
    expect(hubSummary(p, T0)).toMatchObject({ done: 1, total: 98 });
    expect(hubSummary({ ...p, courses: ['cst-discrete-maths'] }, T0)).toMatchObject({ done: 1, total: closureOf(['cst-discrete-maths']).size });
    expect(hubSummary({ ...p, courses: [] }, T0)).toBeNull();
  });

  it('marks learned, due, ready, and locked topics', () => {
    let p = ensureSession(fresh(), T0);
    p = completeLesson(p, 'pre.fractions', true, T0, 0, 15, 'ia-probability');
    const now = statusMap(p, T0);
    expect(now.get('pre.fractions')).toBe('mastered');
    expect(now.get('pre.probability-scale')).toBe('ready');
    expect(now.get('num.fermat-little')).toBe('locked');
    expect(statusMap(p, T0 + 2 * DAY_MS).get('pre.fractions')).toBe('due');
  });
});
