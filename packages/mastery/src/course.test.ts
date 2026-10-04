import { describe, it, expect } from 'vitest';
import { courseClosure, courseFrontier, courseTopics } from './course';
import type { Level, Topic } from './graph';
import { DAY_MS, newMemory, type MemoryMap } from './memory';
import { classify, nextProbe, placementGraph, placementResult, runPlacement } from './placement';
import { planSession } from './scheduler';
import { simulate } from './simulate';

function T(id: string, prereqs: string[] = []): Topic {
  return {
    id, title: id, summary: `${id}.`, level: (prereqs.length === 0 ? 'pre-a-level' : 'step') as Level, area: id.split('.')[0] as string,
    prereqs, encompasses: {}, sources: [{ doc: 'd', course: 'c', section: 's', verified: true }], estMinutes: 15,
  };
}

/**
 * One shared graph, two courses:
 *
 *            s.root
 *           /      \
 *       s.mid      b.one
 *       /    \     /
 *   a.one    b.two
 *     |
 *   a.two
 *
 * Course A targets a.two; course B targets b.two. Both need s.root and s.mid.
 */
const shared = (): Topic[] => [
  T('s.root'), T('s.mid', ['s.root']), T('b.one', ['s.root']),
  T('a.one', ['s.mid']), T('a.two', ['a.one']), T('b.two', ['s.mid', 'b.one']),
];
const A = ['a.two'];
const B = ['b.two'];
const NOW = Date.UTC(2026, 9, 4);

describe('courseClosure', () => {
  it('is the targets plus their ancestors', () => {
    expect(courseClosure(shared(), A)).toEqual(new Set(['s.root', 's.mid', 'a.one', 'a.two']));
    expect(courseClosure(shared(), B)).toEqual(new Set(['s.root', 's.mid', 'b.one', 'b.two']));
    expect(courseClosure(shared(), ['a.one', 'b.one'])).toEqual(new Set(['s.root', 's.mid', 'a.one', 'b.one']));
  });

  it('defaults to every topic, and an empty target set is an empty course', () => {
    expect(courseClosure(shared())).toEqual(new Set(shared().map((t) => t.id)));
    expect(courseClosure(shared(), [])).toEqual(new Set());
  });

  it('accepts repeated and nested targets', () => {
    expect(courseClosure(shared(), ['a.two', 'a.one', 'a.two'])).toEqual(courseClosure(shared(), A));
  });

  it('throws on an unknown target', () => {
    expect(() => courseClosure(shared(), ['c.nope'])).toThrow(/unknown topic id: c\.nope/);
  });

  it('courseTopics keeps graph order', () => {
    expect(courseTopics(shared(), B).map((t) => t.id)).toEqual(['s.root', 's.mid', 'b.one', 'b.two']);
  });

});

describe('courseFrontier', () => {
  it('only offers topics in the course', () => {
    const mastered = new Set(['s.root']);
    expect(courseFrontier(shared(), mastered, A)).toEqual(['s.mid']);
    expect(courseFrontier(shared(), mastered, B)).toEqual(['s.mid', 'b.one']);
    expect(courseFrontier(shared(), mastered)).toEqual(['s.mid', 'b.one']);
  });

  it('is empty once the course is done, whatever else is left', () => {
    expect(courseFrontier(shared(), new Set(['s.root', 's.mid', 'a.one', 'a.two']), A)).toEqual([]);
  });
});

describe('placement over a course', () => {
  it('starts from scratch: before any answer nothing is known', () => {
    for (const targets of [undefined, A, B]) {
      const g = placementGraph(shared(), { targets });
      expect(placementResult(g, []).mastered).toEqual([]);
      expect([...classify(g, []).values()].every((c) => c === 'unclassified')).toBe(true);
      expect(nextProbe(g, [])).not.toBeNull();
    }
  });

  it('never probes or classifies a topic outside the course', () => {
    const g = placementGraph(shared(), { targets: A });
    const { answers, result } = runPlacement(g, () => true, NOW);
    for (const a of answers) expect(['b.one', 'b.two']).not.toContain(a.topicId);
    expect(result.mastered).toEqual(['s.root', 's.mid', 'a.one', 'a.two']);
    expect(result.frontier).toEqual([]);
  });

  it('places every truthful learner exactly within the course', () => {
    const g = placementGraph(shared(), { targets: B });
    const closed = [[], ['s.root'], ['s.root', 's.mid'], ['s.root', 'b.one'], ['s.root', 's.mid', 'b.one'], ['s.root', 's.mid', 'b.one', 'b.two']];
    for (const known of closed) {
      // The learner also knows a.one, outside B; that must not leak into B's placement.
      const knows = new Set([...known, 'a.one']);
      const { result } = runPlacement(g, (id) => knows.has(id), NOW);
      expect(new Set(result.mastered)).toEqual(new Set(known));
    }
  });

});

describe('scheduler over a course', () => {
  const memory: MemoryMap = {
    's.root': { ...newMemory(NOW - 3 * DAY_MS), due: NOW },
    'b.one': { ...newMemory(NOW - 3 * DAY_MS), due: NOW },
  };

  it('reviews and teaches only course topics', () => {
    const planA = planSession({ topics: shared(), targets: A, memory, now: NOW });
    const ids = planA.tasks.map((t) => (t.kind === 'quiz' ? t.topicIds.join() : t.topicId));
    expect(ids).toEqual(['s.root', 's.mid']);
    expect(planA.tasks.map((t) => t.kind)).toEqual(['review', 'lesson']);
  });

  it('a course containing the topic reviews it', () => {
    const planB = planSession({ topics: shared(), targets: B, memory, now: NOW });
    const reviews = planB.tasks.flatMap((t) => (t.kind === 'review' ? [t.topicId] : []));
    expect(reviews.sort()).toEqual(['b.one', 's.root']);
  });

  it('with no targets, behaves as before over the whole graph', () => {
    const plan = planSession({ topics: shared(), memory, now: NOW });
    const lessons = plan.tasks.flatMap((t) => (t.kind === 'lesson' ? [t.topicId] : []));
    expect(lessons).toContain('s.mid');
    expect(plan.tasks.filter((t) => t.kind === 'review')).toHaveLength(2);
  });
});

describe('simulation over a course', () => {
  it('masters the closure and nothing outside it', () => {
    const r = simulate({ topics: shared(), targets: A, seed: 1, days: 20 });
    expect(r.dayAllMastered).not.toBeNull();
    expect(r.days[r.days.length - 1]?.mastered).toBe(courseClosure(shared(), A).size);
  });

  it('with two courses, masters both, reports each, and charges every lesson to one of them', () => {
    const courses = [{ id: 'A', targets: A }, { id: 'B', targets: B }];
    const r = simulate({ topics: shared(), courses, seed: 1, days: 20 });
    expect(r.dayCourseMastered?.A).not.toBeNull();
    expect(r.dayCourseMastered?.B).not.toBeNull();
    expect(r.dayAllMastered).toBe(Math.max(r.dayCourseMastered?.A as number, r.dayCourseMastered?.B as number));
    const charged = (r.courseLessonMinutes?.A ?? 0) + (r.courseLessonMinutes?.B ?? 0);
    expect(charged).toBe(r.days.reduce((a, d) => a + d.lessonMinutes, 0));
    expect(simulate({ topics: shared(), courses, seed: 1, days: 20 })).toEqual(r);
  });

  it('without courses, reports no per-course fields', () => {
    const r = simulate({ topics: shared(), targets: A, seed: 1, days: 5 });
    expect(r.dayCourseMastered).toBeUndefined();
    expect(r.courseLessonMinutes).toBeUndefined();
  });
});
