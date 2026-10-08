import { describe, expect, it } from 'vitest';
import type { Level, Topic } from './graph';
import { gymItemId, recordGym, type GymKind } from './gym';
import { DAY_MS, recordLesson, recordLessonFailure, recordReview, type MemoryMap } from './memory';
import type { HistoryEntry } from './progress';
import { gymKindOf, replayMemory, sameMemoryState } from './replay';

function T(id: string, prereqs: string[] = [], encompasses: Record<string, number> = {}): Topic {
  return {
    id, title: id, summary: `${id}.`, level: (prereqs.length === 0 ? 'pre-a-level' : 'step') as Level, area: 'test',
    prereqs, encompasses, sources: [{ doc: 'd', course: 'c', section: 's', verified: true }], estMinutes: 15,
  };
}

/** t.a <-0.6- t.b <-0.5- t.c: practice on b and c credits a, and a miss on b flags a. */
const TOPICS: Topic[] = [T('t.a'), T('t.b', ['t.a'], { 't.a': 0.6 }), T('t.c', ['t.b'], { 't.b': 0.5 })];
const T0 = Date.UTC(2026, 9, 1, 14);
const day = (n: number): number => T0 + n * DAY_MS;

/** The app's way: each action moves memory and logs one entry at the same time. */
class Learner {
  memory: MemoryMap = {};
  history: HistoryEntry[] = [];
  lesson(id: string, passed: boolean, at: number): void {
    this.memory = (passed ? recordLesson(this.memory, TOPICS, id, at) : recordLessonFailure(this.memory, TOPICS, id, at)).memory;
    this.history.push({ at, kind: 'lesson', topicId: id, correct: passed });
  }
  review(id: string, correct: boolean, at: number, kind: 'review' | 'quiz' | 'supervision' = 'review'): void {
    if (this.memory[id] !== undefined) this.memory = recordReview(this.memory, TOPICS, id, correct, at).memory;
    this.history.push({ at, kind, topicId: id, correct });
  }
  gym(kind: GymKind, id: string, correct: boolean, at: number): void {
    this.memory = recordGym(this.memory, TOPICS, { kind, topicId: id }, correct, at).memory;
    this.history.push({ at, kind: 'gym', topicId: id, correct, item: { id: gymItemId(kind, id, 'g'), hints: 0, attempt: 1 } });
  }
  other(id: string, at: number): void {
    this.history.push({ at, kind: 'drill', topicId: id, correct: false, item: { id: `${id}/g`, hints: 0, attempt: 1 } });
    this.history.push({ at, kind: 'cambridge', topicId: id, correct: false, item: { id: `${id}/q1`, hints: 0, attempt: 1 } });
  }
}

function sameMap(a: MemoryMap, b: MemoryMap): boolean {
  const ka = Object.keys(a).sort();
  const kb = Object.keys(b).sort();
  return ka.join() === kb.join() && ka.every((k) => sameMemoryState(a[k]!, b[k]!));
}

describe('replayMemory', () => {
  it('rebuilds the memory the app built, from the history alone', () => {
    const l = new Learner();
    l.lesson('t.a', true, day(0));
    l.lesson('t.b', false, day(0) + 1000);
    l.lesson('t.b', true, day(1));
    l.review('t.a', true, day(1) + 1000);
    l.other('t.b', day(2));
    l.gym('drill', 't.a', true, day(2) + 1000);
    l.gym('order', 't.b', false, day(2) + 2000);
    l.gym('recall', 't.b', true, day(2) + 3000);
    l.review('t.b', false, day(3), 'supervision');
    l.review('t.c', true, day(3) + 1000, 'supervision');
    l.lesson('t.c', true, day(4));
    l.review('t.b', true, day(5), 'quiz');
    l.review('t.c', true, day(5), 'quiz');
    l.gym('review', 't.c', true, day(6));
    expect(sameMap(replayMemory(l.history, TOPICS), l.memory)).toBe(true);
  });

  it('leaves out a skipped entry, as if it never happened', () => {
    const l = new Learner();
    l.lesson('t.a', true, day(0));
    l.lesson('t.b', true, day(0) + 1000);
    l.review('t.b', true, day(1));
    const before = new Learner();
    before.memory = l.memory;
    // A failed supervision on b: a lapse on b, and a flag that brings a due.
    l.review('t.b', false, day(2), 'supervision');
    expect(l.memory['t.b']?.lapses).toBe(1);
    expect(l.memory['t.a']?.due).toBe(day(2));
    l.review('t.b', true, day(5));
    before.review('t.b', true, day(5));
    const skipped = replayMemory(l.history, TOPICS, (h) => h.kind === 'supervision');
    expect(sameMap(skipped, before.memory)).toBe(true);
    expect(skipped['t.b']?.lapses).toBe(0);
    expect(skipped['t.b']!.intervalDays).toBeGreaterThan(l.memory['t.b']!.intervalDays);
  });

  it('is pure: the input history is not changed', () => {
    const l = new Learner();
    l.lesson('t.a', true, day(0));
    const copy = JSON.stringify(l.history);
    replayMemory(l.history, TOPICS, () => true);
    expect(JSON.stringify(l.history)).toBe(copy);
  });
});

describe('gymKindOf', () => {
  it('reads the kind from a gym item id', () => {
    expect(gymKindOf(gymItemId('drill', 't.a', 'g1'))).toBe('drill');
    expect(gymKindOf(gymItemId('review', 't.a'))).toBe('review');
    expect(gymKindOf('t.a/g1')).toBeUndefined();
    expect(gymKindOf('nope:t.a')).toBeUndefined();
  });
});
