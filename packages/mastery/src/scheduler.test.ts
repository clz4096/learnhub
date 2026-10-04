import { describe, it, expect } from 'vitest';
import type { Level, Topic } from './graph';
import { DAY_MS, newMemory, type MemoryMap, type MemoryState } from './memory';
import { DEFAULT_SCHEDULER_OPTIONS, interleaveByArea, planSession, type Task } from './scheduler';

function T(id: string, prereqs: string[] = [], over: Partial<Topic> = {}): Topic {
  return {
    id, title: `Title ${id}`, summary: `${id}.`, level: (prereqs.length === 0 ? 'pre-a-level' : 'step') as Level,
    area: 'x', prereqs, encompasses: {}, sources: [{ doc: 'd', course: 'c', section: 's', verified: true }], estMinutes: 15,
    ...over,
  };
}

const NOW = Date.UTC(2026, 9, 4);
const dueNow = (over: Partial<MemoryState> = {}): MemoryState => ({ ...newMemory(NOW - 2 * DAY_MS), due: NOW, ...over });
const notDue = (): MemoryState => newMemory(NOW);
const lessons = (ts: Task[]): string[] => ts.flatMap((t) => (t.kind === 'lesson' ? [t.topicId] : []));
const reviews = (ts: Task[]): string[] => ts.flatMap((t) => (t.kind === 'review' ? [t.topicId] : []));

describe('implicit coverage of due reviews', () => {
  // t.a is mastered and due; t.b (frontier) encompasses it at 0.5; t.c (frontier) does not.
  const g = [T('t.a'), T('t.z'), T('t.b', ['t.a'], { encompasses: { 't.a': 0.5 } }), T('t.c', ['t.z'])];

  it('a review whose credit would reach 1 is replaced by the lesson', () => {
    const memory: MemoryMap = { 't.a': dueNow({ implicitCredit: 0.6 }), 't.z': notDue() };
    const plan = planSession({ topics: g, memory, now: NOW });
    expect(reviews(plan.tasks)).toEqual([]);
    expect(plan.covered).toEqual({ 't.a': ['t.b'] });
    const b = plan.tasks.find((t) => t.kind === 'lesson' && t.topicId === 't.b');
    expect(b).toMatchObject({ covers: ['t.a'] });
    expect(b?.reason).toMatch(/also counts as today's review of Title t\.a/);
  });

  it('a review the lesson only partly covers is still scheduled', () => {
    const memory: MemoryMap = { 't.a': dueNow({ implicitCredit: 0.3 }), 't.z': notDue() };
    const plan = planSession({ topics: g, memory, now: NOW });
    expect(reviews(plan.tasks)).toEqual(['t.a']);
    expect(plan.covered).toEqual({});
  });

  it('with implicit credit off, nothing is covered', () => {
    const memory: MemoryMap = { 't.a': dueNow({ implicitCredit: 0.9 }), 't.z': notDue() };
    const plan = planSession({ topics: g, memory, now: NOW, options: { implicitCredit: false } });
    expect(reviews(plan.tasks)).toEqual(['t.a']);
  });

  it('prefers the lesson that covers a due review when only one fits', () => {
    // 15 + 15 minutes of lessons would not fit in 20; t.c comes first in topological order
    // among equals, so picking t.b shows the coverage preference.
    const g2 = [T('t.z'), T('t.a'), T('t.c', ['t.z']), T('t.b', ['t.a'], { encompasses: { 't.a': 0.5 } })];
    const memory: MemoryMap = { 't.a': dueNow({ implicitCredit: 0.6 }), 't.z': notDue() };
    const plan = planSession({ topics: g2, memory, now: NOW, options: { budgetMinutes: 20 } });
    expect(lessons(plan.tasks)).toEqual(['t.b']);
    expect(reviews(plan.tasks)).toEqual([]);
  });

  it('credit from two lessons can add up to cover a review, and both are listed', () => {
    const g3 = [
      T('t.a'),
      T('t.b', ['t.a'], { encompasses: { 't.a': 0.5 }, area: 'p' }),
      T('t.c', ['t.a'], { encompasses: { 't.a': 0.4 }, area: 'q' }),
    ];
    const memory: MemoryMap = { 't.a': dueNow({ implicitCredit: 0.2 }) };
    const plan = planSession({ topics: g3, memory, now: NOW });
    expect(reviews(plan.tasks)).toEqual([]);
    expect(plan.covered['t.a']).toEqual(['t.b', 't.c']);
  });
});

describe('priorities and the budget', () => {
  it('reviews come before lessons and are cut most overdue first when they overflow', () => {
    const g = [T('t.a'), T('t.b'), T('t.c'), T('t.d'), T('t.n', ['t.a'])];
    const memory: MemoryMap = {
      't.a': dueNow({ due: NOW - 3 * DAY_MS }),
      't.b': dueNow({ due: NOW - 1 * DAY_MS }),
      't.c': dueNow({ due: NOW - 2 * DAY_MS }),
      't.d': dueNow({ due: NOW }),
    };
    const plan = planSession({ topics: g, memory, now: NOW, options: { budgetMinutes: 7 } });
    expect(reviews(plan.tasks)).toEqual(['t.a', 't.c']);
    expect(plan.deferred).toEqual(['t.b', 't.d']);
    expect(lessons(plan.tasks)).toEqual([]);
    expect(plan.tasks[0]?.reason).toMatch(/3 days overdue/);
  });

  it('a lesson goes in only if every uncovered review still fits', () => {
    const g = [T('t.a'), T('t.n', ['t.a'], { estMinutes: 10 })];
    const memory: MemoryMap = { 't.a': dueNow() };
    expect(lessons(planSession({ topics: g, memory, now: NOW, options: { budgetMinutes: 12 } }).tasks)).toEqual([]);
    expect(lessons(planSession({ topics: g, memory, now: NOW, options: { budgetMinutes: 13 } }).tasks)).toEqual(['t.n']);
  });

  it('skips a lesson too long for the remaining time but takes a shorter one', () => {
    const g = [T('t.a', [], { estMinutes: 25 }), T('t.b', [], { estMinutes: 10 })];
    const plan = planSession({ topics: g, memory: {}, now: NOW, options: { budgetMinutes: 20 } });
    expect(lessons(plan.tasks)).toEqual(['t.b']);
  });

  it('ignores memory for topics no longer in the graph', () => {
    const plan = planSession({ topics: [T('t.a')], memory: { 'gone.topic': dueNow() }, now: NOW });
    expect(reviews(plan.tasks)).toEqual([]);
    expect(lessons(plan.tasks)).toEqual(['t.a']);
  });

  it('an empty graph gives an empty plan', () => {
    expect(planSession({ topics: [], memory: {}, now: NOW })).toEqual({ tasks: [], totalMinutes: 0, budgetMinutes: 60, covered: {}, deferred: [] });
  });
});

describe('quizzes', () => {
  const g = ['t.a', 't.b', 't.c', 't.d', 't.e'].map((id) => T(id));
  const memory: MemoryMap = { 't.a': dueNow(), 't.b': notDue(), 't.c': notDue(), 't.d': notDue() };

  it(`come after every ${DEFAULT_SCHEDULER_OPTIONS.quizEvery} topics learned, last in the session`, () => {
    const plan = planSession({ topics: g, memory, now: NOW, learnedSinceQuiz: ['t.a', 't.b', 't.c', 't.d'] });
    const last = plan.tasks[plan.tasks.length - 1];
    expect(last).toMatchObject({ kind: 'quiz', topicIds: ['t.a', 't.b', 't.c', 't.d'], minutes: 8 });
    // t.a is due, but its quiz item is the review.
    expect(reviews(plan.tasks)).toEqual([]);
  });

  it('not before', () => {
    const plan = planSession({ topics: g, memory, now: NOW, learnedSinceQuiz: ['t.b', 't.c', 't.d'] });
    expect(plan.tasks.some((t) => t.kind === 'quiz')).toBe(false);
    expect(reviews(plan.tasks)).toEqual(['t.a']);
  });

  it('cover at most the most recent quizMaxItems topics, mastered ones only', () => {
    const many = Array.from({ length: 9 }, (_, i) => `t.q${i}`);
    const g2 = many.map((id) => T(id));
    const m: MemoryMap = Object.fromEntries(many.slice(0, 8).map((id) => [id, notDue()]));
    const plan = planSession({ topics: g2, memory: m, now: NOW, learnedSinceQuiz: many });
    const quiz = plan.tasks.find((t) => t.kind === 'quiz');
    expect(quiz).toMatchObject({ topicIds: many.slice(2, 8) });
  });

  it('is deferred when it does not fit after the reviews', () => {
    const plan = planSession({ topics: g, memory, now: NOW, learnedSinceQuiz: ['t.a', 't.b', 't.c', 't.d'], options: { budgetMinutes: 5 } });
    expect(plan.tasks).toEqual([]);
    expect(plan.deferred).toEqual(['t.a', 't.b', 't.c', 't.d']);
  });
});

describe('interleaving', () => {
  it('interleaveByArea alternates areas and keeps priority within an area', () => {
    const items = ['a1', 'a2', 'a3', 'b1', 'b2', 'c1'];
    expect(interleaveByArea(items, (x) => x[0] as string)).toEqual(['a1', 'b1', 'a2', 'b2', 'a3', 'c1']);
    expect(interleaveByArea(['a1', 'a2'], (x) => x[0] as string)).toEqual(['a1', 'a2']);
    expect(interleaveByArea([], (x: string) => x)).toEqual([]);
  });

  it('chooses lessons across areas and orders them so neighbours differ', () => {
    const g = [
      T('t.p1', [], { area: 'p', estMinutes: 10 }), T('t.p2', [], { area: 'p', estMinutes: 10 }),
      T('t.p3', [], { area: 'p', estMinutes: 10 }), T('t.q1', [], { area: 'q', estMinutes: 10 }),
      T('t.q2', [], { area: 'q', estMinutes: 10 }), T('t.r1', [], { area: 'r', estMinutes: 10 }),
    ];
    const plan = planSession({ topics: g, memory: {}, now: NOW, options: { budgetMinutes: 30 } });
    const ls = lessons(plan.tasks);
    expect(new Set(ls.map((id) => id[2]))).toEqual(new Set(['p', 'q', 'r']));
    for (let i = 1; i < ls.length; i++) expect((ls[i] as string)[2]).not.toBe((ls[i - 1] as string)[2]);
  });

  it('interleaves reviews by area', () => {
    const g = [T('t.p1', [], { area: 'p' }), T('t.p2', [], { area: 'p' }), T('t.q1', [], { area: 'q' })];
    const memory: MemoryMap = {
      't.p1': dueNow({ due: NOW - 3 * DAY_MS }), 't.p2': dueNow({ due: NOW - 2 * DAY_MS }), 't.q1': dueNow({ due: NOW - 1 * DAY_MS }),
    };
    expect(reviews(planSession({ topics: g, memory, now: NOW }).tasks)).toEqual(['t.p1', 't.q1', 't.p2']);
  });
});

describe('several courses: courseWeights', () => {
  // Two disjoint courses of six 10-minute roots each, so only the split decides.
  const g = [
    ...['a0', 'a1', 'a2', 'a3', 'a4', 'a5'].map((n) => T(`a.${n}`, [], { estMinutes: 10, area: 'a' })),
    ...['b0', 'b1', 'b2', 'b3', 'b4', 'b5'].map((n) => T(`b.${n}`, [], { estMinutes: 10, area: 'b' })),
  ];
  const courses = [
    { id: 'A', targets: g.filter((t) => t.id.startsWith('a.')).map((t) => t.id) },
    { id: 'B', targets: g.filter((t) => t.id.startsWith('b.')).map((t) => t.id) },
  ];
  const by = (ts: Task[], c: string): string[] => ts.flatMap((t) => (t.kind === 'lesson' && t.course === c ? [t.topicId] : []));

  it('splits lesson minutes evenly by default and tags each lesson with its course', () => {
    const plan = planSession({ topics: g, courses, memory: {}, now: NOW });
    expect(plan.courseMinutes).toEqual({ A: 30, B: 30 });
    expect(by(plan.tasks, 'A')).toHaveLength(3);
    expect(by(plan.tasks, 'B')).toHaveLength(3);
    for (const id of by(plan.tasks, 'A')) expect(id.startsWith('a.')).toBe(true);
    expect(plan.tasks.every((t) => t.kind !== 'lesson' || t.course !== undefined)).toBe(true);
  });

  it('follows the weights', () => {
    const plan = planSession({ topics: g, courses, courseWeights: { A: 2, B: 1 }, memory: {}, now: NOW });
    expect(plan.courseMinutes).toEqual({ A: 40, B: 20 });
  });

  it('evens out across sessions with the minutes already spent', () => {
    // A is 30 minutes ahead, so B catches up first; ties then go to the first course.
    const plan = planSession({ topics: g, courses, courseMinutes: { A: 30, B: 0 }, memory: {}, now: NOW });
    expect(plan.courseMinutes).toEqual({ A: 20, B: 40 });
  });

  it('gives no new lessons to a course with weight 0, but still reviews its topics', () => {
    const memory: MemoryMap = { 'b.b0': dueNow() };
    const plan = planSession({ topics: g, courses, courseWeights: { B: 0 }, memory, now: NOW });
    expect(by(plan.tasks, 'B')).toEqual([]);
    expect(reviews(plan.tasks)).toEqual(['b.b0']);
    expect(plan.courseMinutes).toEqual({ A: 50, B: 0 });
  });

  it('yields the time of a course with nothing left to the other', () => {
    const memory: MemoryMap = Object.fromEntries(courses[1]!.targets.map((id) => [id, notDue()]));
    const plan = planSession({ topics: g, courses, memory, now: NOW });
    expect(plan.courseMinutes).toEqual({ A: 60, B: 0 });
  });

  it('teaches a shared foundation once, charged to the course that took it', () => {
    // s.root is in both closures; it is the only lesson available at the start.
    const g2 = [T('s.root', [], { estMinutes: 15 }), T('a.x', ['s.root']), T('b.y', ['s.root'])];
    const plan = planSession({ topics: g2, courses: [{ id: 'A', targets: ['a.x'] }, { id: 'B', targets: ['b.y'] }], memory: {}, now: NOW });
    expect(lessons(plan.tasks)).toEqual(['s.root']);
    expect(plan.tasks[0]).toMatchObject({ kind: 'lesson', course: 'A' });
    expect(plan.courseMinutes).toEqual({ A: 15, B: 0 });
  });

  it('reviews due topics from every course, unsplit', () => {
    const memory: MemoryMap = { 'a.a0': dueNow(), 'b.b0': dueNow() };
    const plan = planSession({ topics: g, courses, memory, now: NOW });
    expect(reviews(plan.tasks).sort()).toEqual(['a.a0', 'b.b0']);
  });

  it('never reviews or teaches outside the union of the closures', () => {
    const g3 = [...g, T('c.c0', [], { estMinutes: 10 })];
    const plan = planSession({ topics: g3, courses, memory: { 'c.c0': dueNow() }, now: NOW, options: { budgetMinutes: 200 } });
    expect(plan.tasks.some((t) => t.kind !== 'quiz' && t.topicId === 'c.c0')).toBe(false);
  });

  it('rejects targets together with courses, a repeated course, and a bad weight', () => {
    expect(() => planSession({ topics: g, targets: ['a.a0'], courses, memory: {}, now: NOW })).toThrow(/targets or courses/);
    expect(() => planSession({ topics: g, courses: [courses[0]!, courses[0]!], memory: {}, now: NOW })).toThrow(/listed twice/);
    for (const w of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => planSession({ topics: g, courses, courseWeights: { A: w }, memory: {}, now: NOW })).toThrow(/weight/);
    }
    expect(() => planSession({ topics: g, courses, courseMinutes: { A: -5 }, memory: {}, now: NOW })).toThrow(/spent/);
  });

  it('without courses, sets no course fields', () => {
    const plan = planSession({ topics: g, memory: {}, now: NOW });
    expect(plan.courseMinutes).toBeUndefined();
    expect(plan.tasks.every((t) => t.kind !== 'lesson' || t.course === undefined)).toBe(true);
  });
});
