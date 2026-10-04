import { describe, it, expect } from 'vitest';
import {
  DAY_MS, DEFAULT_SCHEDULER_OPTIONS, mulberry32, newMemory, planSession, randInt, topoOrder,
  type MemoryMap, type MemoryState, type Task, type Topic,
} from '@learnhub/mastery';
import { courseById, coursesTopics } from './courses';
import { topics } from './topics';

const probstats = coursesTopics(topics, [courseById('ia-probability')]);
const NOW = Date.UTC(2026, 9, 4);
const lessons = (ts: Task[]): string[] => ts.flatMap((t) => (t.kind === 'lesson' ? [t.topicId] : []));
const reviews = (ts: Task[]): string[] => ts.flatMap((t) => (t.kind === 'review' ? [t.topicId] : []));

/** A random memory map that is closed under ancestors, with random due dates and credit. */
function randomState(seed: number): MemoryMap {
  const rng = mulberry32(seed);
  const order = topoOrder(probstats);
  const byId = new Map(probstats.map((t) => [t.id, t]));
  const m: Record<string, MemoryState> = {};
  for (const id of order) {
    const t = byId.get(id) as Topic;
    if (!t.prereqs.every((p) => m[p] !== undefined) || rng() < 0.3) continue;
    m[id] = { ...newMemory(NOW), due: NOW + randInt(rng, -5, 10) * DAY_MS, implicitCredit: rng() * 0.99 };
  }
  return m;
}

describe('planSession: invariants on the probstats graph', () => {
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
    for (const budget of [10, 30, 60, 90]) {
      it(`seed ${seed}, budget ${budget}: respects the budget and gates lessons on prerequisites`, () => {
        const memory = randomState(seed);
        const plan = planSession({ topics: probstats, memory, now: NOW, learnedSinceQuiz: Object.keys(memory).slice(0, seed), options: { budgetMinutes: budget } });
        const sum = plan.tasks.reduce((a, t) => a + t.minutes, 0);
        expect(sum).toBe(plan.totalMinutes);
        expect(plan.totalMinutes).toBeLessThanOrEqual(budget);
        const byId = new Map(probstats.map((t) => [t.id, t]));
        for (const l of lessons(plan.tasks)) {
          expect(memory[l], `${l} is already mastered`).toBeUndefined();
          for (const p of byId.get(l)?.prereqs ?? []) expect(memory[p], `${l} needs ${p}`).toBeDefined();
        }
        for (const r of reviews(plan.tasks)) expect((memory[r] as MemoryState).due).toBeLessThanOrEqual(NOW);
        for (const t of plan.tasks) {
          expect(t.reason.length).toBeGreaterThan(10);
          expect(t.reason).not.toMatch(/[\u2013\u2014]/);
        }
      });
    }
  }

  it('is deterministic', () => {
    const memory = randomState(3);
    expect(planSession({ topics: probstats, memory, now: NOW })).toEqual(planSession({ topics: probstats, memory, now: NOW }));
  });

  it('a new learner gets roots only, filling the hour', () => {
    const plan = planSession({ topics: probstats, memory: {}, now: NOW });
    const roots = new Set(probstats.filter((t) => t.prereqs.length === 0).map((t) => t.id));
    expect(lessons(plan.tasks).length).toBeGreaterThan(0);
    for (const l of lessons(plan.tasks)) expect(roots.has(l)).toBe(true);
    expect(plan.totalMinutes).toBeGreaterThan(DEFAULT_SCHEDULER_OPTIONS.budgetMinutes - 15);
  });
});
