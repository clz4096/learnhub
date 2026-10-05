import { describe, expect, it } from 'vitest';
import { contentFor } from '@learnhub/content';
import { DAY_MS, ancestors, importProgress, exportProgress, placedMemory, type Progress } from '@learnhub/mastery';
import { ALL_TOPICS, closureOf, closureTopics } from '@/model/courses';
import {
  COURSE_OPTIONS, DEFAULT_COURSES, completeLesson, completeQuiz, completeReview, ensureSession, finishOpenPlacement, finishPlacement, hasContent,
  hubSummary, localDay, planMore, replanToday, sessionTime, skipTask, startLearner, statusMap, withoutSelfReport,
} from '@/model/learner';

const T0 = new Date(2026, 9, 4, 9, 0).getTime();
const fresh = (): Progress => startLearner(T0, DEFAULT_COURSES, 60);

/** A placement answer as earlier builds saved it; design decision 20 removed the test. */
const answered = (p: Progress, topicId: string, correct: boolean): Progress => ({
  ...p,
  placement: { answers: [...(p.placement?.answers ?? []), { topicId, correct, at: T0 }], done: false },
  history: [...p.history, { at: T0, kind: 'placement', topicId, correct }],
});

describe('a new learner', () => {
  it('has one course option: Probability and Discrete Mathematics, both courses together', () => {
    expect(COURSE_OPTIONS).toEqual([{ id: 'probability-discrete', title: 'Probability and Discrete Mathematics', courses: ['ia-probability', 'cst-discrete-maths'] }]);
  });

  it('takes both courses at 60 minutes, knowing nothing, with no placement', () => {
    const p = startLearner(T0, DEFAULT_COURSES, 60);
    expect(p.courses).toEqual(['ia-probability', 'cst-discrete-maths']);
    expect(p.settings.budgetMinutes).toBe(60);
    expect(p.placement).toBeNull();
    expect(p.memory).toEqual({});
    expect(importProgress(exportProgress(p)).ok).toBe(true);
  });

  it('has no session before a course is chosen', () => {
    const blank = { ...fresh(), courses: [] };
    expect(ensureSession(blank, T0)).toBe(blank);
  });
});

describe('migration: progress saved by the placement test of earlier builds', () => {
  it('mid-placement: the answers given count as results, and the learner goes on to Today', () => {
    const p = finishOpenPlacement(answered(answered(fresh(), 'comb.factorial', true), 'pre.fractions', false), T0 + 1);
    expect(p.placement).toEqual({ answers: [expect.objectContaining({ topicId: 'comb.factorial' }), expect.objectContaining({ topicId: 'pre.fractions' })], done: true });
    expect(Object.keys(p.memory).sort()).toEqual(['comb.factorial', 'pre.product-rule']);
    expect(p.history.map((h) => h.kind)).toEqual(['placement', 'placement']);
    const lessons = ensureSession(p, T0 + 1).session?.tasks.filter((t) => t.kind === 'lesson').map((t) => t.topicIds[0]) ?? [];
    expect(lessons).toContain('pre.fractions');
    expect(lessons).not.toContain('pre.product-rule');
    expect(importProgress(exportProgress(p)).ok).toBe(true);
  });

  it('mid-placement with no answers yet starts from the foundations', () => {
    const p = finishOpenPlacement({ ...fresh(), placement: { answers: [], done: false } }, T0);
    expect(p.placement?.done).toBe(true);
    expect(p.memory).toEqual({});
  });

  it('a finished placement keeps its results; other documents are left as they are', () => {
    const placed = finishPlacement(answered(fresh(), 'comb.factorial', true), T0);
    for (const p of [placed, fresh(), { ...fresh(), courses: [] }]) expect(finishOpenPlacement(p, T0 + 1)).toBe(p);
    expect(Object.keys(placed.memory).sort()).toEqual(['comb.factorial', 'pre.product-rule']);
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
    expect(hubSummary(p, T0)).toMatchObject({ done: 0, total: 101 });
    p = completeLesson(p, 'pre.fractions', true, T0, 0, 15, 'ia-probability');
    expect(hubSummary(p, T0)).toMatchObject({ done: 1, total: 101 });
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

// Topics with content, and one root without: these tests read the real graph and content,
// so they say what holds for any content set rather than naming today's ten topics.
const CONTENT = closureTopics(DEFAULT_COURSES).filter((t) => hasContent(t.id)).map((t) => t.id);
const NO_CONTENT_ROOT = 'pre.primes-and-factors';

describe('migrated placement answers credit only topics with real problems', () => {
  it('topics without content are never credited, even below a known topic', () => {
    expect(hasContent(NO_CONTENT_ROOT)).toBe(false);
    const r = finishOpenPlacement(answered(fresh(), 'comb.factorial', true), T0 + 1);
    for (const id of Object.keys(r.memory)) expect(hasContent(id)).toBe(true);
  });

  it('an answer about a topic without content counts for nothing', () => {
    const p = finishOpenPlacement(answered(fresh(), 'comb.permutations', true), T0 + 1);
    expect(p.memory).toEqual({});
  });
});

describe('topics without content are never scheduled or learned', () => {
  it('a learner who knows every written topic gets no new lessons, and none without content', () => {
    let p = fresh();
    p = { ...p, memory: placedMemory(CONTENT, T0) };
    const s = ensureSession(p, T0).session;
    for (const t of s?.tasks ?? []) for (const id of t.topicIds) expect(hasContent(id)).toBe(true);
    expect(s?.tasks.filter((t) => t.kind === 'lesson')).toEqual([]);
  });

  it('across a month of passing everything, every task is on a topic with content', () => {
    let p = fresh();
    for (let d = 0; d < 30; d++) {
      const day = T0 + d * DAY_MS;
      p = ensureSession(p, day);
      (p.session?.tasks ?? []).forEach((t, i) => {
        for (const id of t.topicIds) expect(hasContent(id)).toBe(true);
        if (t.kind === 'lesson') p = completeLesson(p, t.topicIds[0] as string, true, day, i, t.minutes, t.course);
        else if (t.kind === 'review') p = completeReview(p, t.topicIds[0] as string, true, day, i);
        else p = completeQuiz(p, Object.fromEntries(t.topicIds.map((id) => [id, true])), day, i);
      });
    }
    // A topic is learned once every topic it builds on has content (a topic without content
    // cannot be learned, so neither can anything above it).
    const learnable = CONTENT.filter((id) => [...ancestors(ALL_TOPICS, id)].every(hasContent));
    expect(Object.keys(p.memory).sort()).toEqual(learnable.sort());
  });

  it('a lesson on a topic without content cannot be passed', () => {
    const p0 = ensureSession(fresh(), T0);
    const p = completeLesson(p0, NO_CONTENT_ROOT, true, T0 + 1, 0, 15, 'cst-discrete-maths');
    expect(p.memory[NO_CONTENT_ROOT]).toBeUndefined();
    expect(p.learnedSinceQuiz).toEqual([]);
    expect(p.courseMinutes).toEqual({});
    expect(p.history).toEqual(p0.history);
    expect(p.session?.tasks[0]).toMatchObject({ done: true, passed: null });
  });

  it('shows a frontier topic without content as unwritten, not ready', () => {
    const st = statusMap(fresh(), T0);
    expect(st.get(NO_CONTENT_ROOT)).toBe('unwritten');
    expect(st.get('pre.fractions')).toBe('ready');
  });
});

describe('migration: self-reported progress is removed', () => {
  // A version 2 document from the build that offered self-report. comb.permutations has no
  // content; its self-reported "known" spread to pre.product-rule and comb.factorial.
  const legacy = (): Progress => {
    let p = fresh();
    p = answered(p, 'pre.fractions', true);
    p = answered(p, 'comb.permutations', true);
    p = answered(p, NO_CONTENT_ROOT, true);
    // finishPlacement now ignores those answers, so build the memory the old build wrote.
    p = { ...p, placement: { answers: p.placement?.answers ?? [], done: true } };
    p = { ...p, memory: placedMemory(['pre.fractions', 'pre.product-rule', 'comb.factorial', NO_CONTENT_ROOT, 'comb.permutations'], T0) };
    // A self-reported lesson on a topic without content, and a real one with content.
    p = { ...p, memory: { ...p.memory, 'prob.addition-rule': placedMemory(['prob.addition-rule'], T0)['prob.addition-rule'] as never } };
    p = { ...p, history: [...p.history, { at: T0, kind: 'lesson', topicId: 'prob.addition-rule', correct: true }] };
    p = completeLesson(p, 'logic.connectives', true, T0, null, 15);
    p = { ...p, learnedSinceQuiz: ['prob.addition-rule', 'logic.connectives'] };
    return p;
  };

  it('keeps only measured topics with content', () => {
    const { progress: p, dropped } = withoutSelfReport(legacy());
    expect(Object.keys(p.memory).sort()).toEqual(['logic.connectives', 'pre.fractions']);
    expect(dropped.sort()).toEqual(['comb.permutations', 'comb.factorial', 'prob.addition-rule', NO_CONTENT_ROOT, 'pre.product-rule'].sort());
  });

  it('drops placement answers about topics without content, so they can never count later', () => {
    const { progress: p } = withoutSelfReport(legacy());
    expect(p.placement?.answers.map((a) => a.topicId)).toEqual(['pre.fractions']);
    expect(p.placement?.done).toBe(true);
  });

  it('keeps the history and lesson minutes, which record what happened', () => {
    const before = legacy();
    const { progress: p } = withoutSelfReport(before);
    expect(p.history).toEqual(before.history);
    expect(p.courseMinutes).toEqual(before.courseMinutes);
  });

  it('removes dropped topics from the quiz queue', () => {
    expect(withoutSelfReport(legacy()).progress.learnedSinceQuiz).toEqual(['logic.connectives']);
  });

  it("removes today's unfinished tasks on topics that cannot be scheduled, and keeps finished ones", () => {
    const base = legacy();
    const p: Progress = {
      ...base,
      session: {
        day: localDay(T0), startedAt: T0, tasks: [
          { kind: 'lesson', topicIds: [NO_CONTENT_ROOT], minutes: 15, reason: 'r', done: true, passed: true },
          { kind: 'lesson', topicIds: ['comb.permutations'], minutes: 15, reason: 'r', done: false, passed: null },
          { kind: 'review', topicIds: ['comb.factorial'], minutes: 3, reason: 'r', done: false, passed: null },
          { kind: 'review', topicIds: ['pre.fractions'], minutes: 3, reason: 'r', done: false, passed: null },
          { kind: 'quiz', topicIds: ['pre.fractions', 'prob.addition-rule', 'logic.connectives', 'comb.permutations'], minutes: 8, reason: 'r', done: false, passed: null },
          { kind: 'lesson', topicIds: ['pre.indices'], minutes: 15, reason: 'r', done: false, passed: null },
        ],
      },
    };
    const tasks = withoutSelfReport(p).progress.session?.tasks ?? [];
    expect(tasks.map((t) => [t.kind, t.topicIds, t.minutes])).toEqual([
      ['lesson', [NO_CONTENT_ROOT], 15],
      ['review', ['pre.fractions'], 3],
      ['quiz', ['pre.fractions', 'logic.connectives'], 4],
      ['lesson', ['pre.indices'], 15],
    ]);
  });

  it('is idempotent, and leaves a clean document untouched', () => {
    const once = withoutSelfReport(legacy()).progress;
    const twice = withoutSelfReport(once);
    expect(twice.progress).toBe(once);
    expect(twice.dropped).toEqual([]);
    const clean = ensureSession(fresh(), T0);
    expect(withoutSelfReport(clean).progress).toBe(clean);
  });

  it('keeps topics placed by real answers, including ancestors with content', () => {
    const p = finishPlacement(answered(fresh(), 'comb.factorial', true), T0 + 1);
    expect(withoutSelfReport(p).progress).toBe(p);
  });

  it('produces a valid document', () => {
    expect(importProgress(exportProgress(withoutSelfReport(legacy()).progress)).ok).toBe(true);
  });
});
