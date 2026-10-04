import { describe, it, expect } from 'vitest';
import type { Level, Topic } from './graph';
import {
  DAY_MS, DEFAULT_MEMORY_PARAMS, PLACED_FIRST_REVIEW_DAYS, PLACED_PER_DAY,
  afterFailure, afterSuccess, dueTopics, implicitCredits, newMemory, placedMemory,
  recordLesson, recordLessonFailure, recordReview, type MemoryMap, type MemoryState,
} from './memory';

function T(id: string, prereqs: string[] = [], encompasses: Record<string, number> = {}): Topic {
  return {
    id, title: id, summary: `${id}.`, level: (prereqs.length === 0 ? 'pre-a-level' : 'step') as Level, area: 'test',
    prereqs, encompasses, sources: [{ doc: 'd', course: 'c', section: 's', verified: true }], estMinutes: 15,
  };
}

/**
 * A chain with weights on every edge:
 *
 *   t.a <-0.5- t.b <-0.6- t.c <-0.4- t.d
 */
const chain = (): Topic[] => [
  T('t.a'),
  T('t.b', ['t.a'], { 't.a': 0.5 }),
  T('t.c', ['t.b'], { 't.b': 0.6 }),
  T('t.d', ['t.c'], { 't.c': 0.4 }),
];

const T0 = Date.UTC(2026, 9, 4);
const day = (n: number): number => T0 + n * DAY_MS;

function mastered(ids: string[], at = T0): Record<string, MemoryState> {
  const m: Record<string, MemoryState> = {};
  for (const id of ids) m[id] = newMemory(at);
  return m;
}

describe('explicit review rules', () => {
  it('a new topic is due one day after its lesson', () => {
    expect(newMemory(T0)).toEqual({ reps: 0, intervalDays: 1, due: day(1), lastReviewed: T0, lapses: 0, implicitCredit: 0 });
  });

  it('successes give intervals 1, 3, 9, 18, 36, 72, 144, then cap at 180', () => {
    let s = newMemory(T0);
    const seen = [s.intervalDays];
    for (let i = 0; i < 8; i++) {
      s = afterSuccess(s, day(i + 1));
      seen.push(s.intervalDays);
    }
    expect(seen).toEqual([1, 3, 9, 18, 36, 72, 144, 180, 180]);
    expect(s.reps).toBe(8);
    expect(s.due).toBe(day(8) + 180 * DAY_MS);
    expect(s.lastReviewed).toBe(day(8));
  });

  it('failure halves the interval, counts a lapse, drops a rep, and clears banked credit', () => {
    const s: MemoryState = { reps: 3, intervalDays: 18, due: day(10), lastReviewed: day(-8), lapses: 1, implicitCredit: 0.7 };
    const f = afterFailure(s, day(10));
    expect(f).toEqual({ reps: 2, intervalDays: 9, due: day(19), lastReviewed: day(10), lapses: 2, implicitCredit: 0 });
  });

  it('failure never shrinks the interval below one day or reps below zero', () => {
    const f = afterFailure(newMemory(T0), day(1));
    expect(f.intervalDays).toBe(1);
    expect(f.reps).toBe(0);
  });

  it('does not mutate its input', () => {
    const s = newMemory(T0);
    const copy = { ...s };
    afterSuccess(s, day(1));
    afterFailure(s, day(1));
    expect(s).toEqual(copy);
  });
});

describe('implicitCredits', () => {
  it('flows through two levels by multiplying weights', () => {
    const c = implicitCredits(chain(), 't.c');
    expect([...c.keys()].sort()).toEqual(['t.a', 't.b']);
    expect(c.get('t.b')).toBeCloseTo(0.6, 12);
    expect(c.get('t.a')).toBeCloseTo(0.3, 12);
  });

  it('flows through three levels until the cutoff', () => {
    const c = implicitCredits(chain(), 't.d');
    expect(c.get('t.c')).toBeCloseTo(0.4, 12);
    expect(c.get('t.b')).toBeCloseTo(0.24, 12);
    expect(c.get('t.a')).toBeCloseTo(0.12, 12);
  });

  it('cuts paths off below the threshold', () => {
    const c = implicitCredits(chain(), 't.d', 0.15);
    expect(c.has('t.a')).toBe(false);
    expect(c.get('t.b')).toBeCloseTo(0.24, 12);
    // 0.24 is exactly not below 0.24, so it stays.
    expect(implicitCredits(chain(), 't.d', 0.24).has('t.b')).toBe(true);
    expect(implicitCredits(chain(), 't.d', 0.25).has('t.b')).toBe(false);
  });

  it('takes the strongest path when two paths reach a topic, not their sum', () => {
    //      t.a
    //     /   \
    //   t.b   t.c      t.b -> a 0.9; t.c -> a 0.5
    //     \   /
    //      t.d         d -> b 0.5, d -> c 1.0
    const g = [
      T('t.a'),
      T('t.b', ['t.a'], { 't.a': 0.9 }),
      T('t.c', ['t.a'], { 't.a': 0.5 }),
      T('t.d', ['t.b', 't.c'], { 't.b': 0.5, 't.c': 1 }),
    ];
    const c = implicitCredits(g, 't.d');
    expect(c.get('t.a')).toBeCloseTo(0.5, 12); // max(0.5 * 0.9, 1 * 0.5)
    expect(c.get('t.c')).toBe(1);
  });

  it('gives nothing for a root or an unknown id', () => {
    expect(implicitCredits(chain(), 't.a').size).toBe(0);
    expect(implicitCredits(chain(), 'nope').size).toBe(0);
  });
});

describe('recordLesson and recordReview with credit', () => {
  it('a passed lesson masters the topic and banks credit two levels down', () => {
    const before = mastered(['t.a', 't.b']);
    const u = recordLesson(before, chain(), 't.c', day(2));
    expect(u.memory['t.c']).toEqual(newMemory(day(2)));
    expect(u.memory['t.b']?.implicitCredit).toBeCloseTo(0.6, 12);
    expect(u.memory['t.a']?.implicitCredit).toBeCloseTo(0.3, 12);
    // Below a whole repetition, so schedules do not move.
    expect(u.memory['t.b']?.due).toBe(before['t.b']?.due);
    expect(u.converted).toEqual([]);
    expect(before['t.b']?.implicitCredit).toBe(0);
  });

  it('credit converts to a repetition when it reaches 1 and keeps the remainder', () => {
    let m: MemoryMap = mastered(['t.a', 't.b', 't.c']);
    m = recordReview(m, chain(), 't.c', true, day(1)).memory; // b: 0.6
    const u = recordReview(m, chain(), 't.c', true, day(4)); // b: 1.2 -> rep, 0.2 left
    expect(u.converted).toEqual(['t.b']);
    const b = u.memory['t.b'] as MemoryState;
    expect(b.reps).toBe(1);
    expect(b.intervalDays).toBe(3);
    expect(b.due).toBe(day(4) + 3 * DAY_MS);
    expect(b.lastReviewed).toBe(day(4));
    expect(b.implicitCredit).toBeCloseTo(0.2, 12);
    // a got 0.3 twice: 0.6, no conversion yet.
    expect(u.memory['t.a']?.implicitCredit).toBeCloseTo(0.6, 12);
  });

  it('credit is not banked on unmastered topics', () => {
    const u = recordLesson(mastered(['t.b']), chain(), 't.c', day(1));
    expect(u.memory['t.a']).toBeUndefined();
    expect(u.memory['t.b']?.implicitCredit).toBeCloseTo(0.6, 12);
  });

  it('with implicit credit off, nothing below moves', () => {
    const before = mastered(['t.a', 't.b']);
    const u = recordLesson(before, chain(), 't.c', day(2), { implicitCredit: false });
    expect(u.memory['t.b']).toEqual(before['t.b']);
    expect(u.memory['t.a']).toEqual(before['t.a']);
  });

  it('an explicit success grows the reviewed topic once, not again from its own credit', () => {
    const m: MemoryMap = { ...mastered(['t.a', 't.b']), 't.b': { ...newMemory(T0), implicitCredit: 0.9 } };
    const u = recordReview(m, chain(), 't.b', true, day(1));
    expect(u.memory['t.b']?.reps).toBe(1);
    expect(u.memory['t.b']?.implicitCredit).toBeCloseTo(0.9, 12);
  });

  it('recordReview throws for an unmastered topic', () => {
    expect(() => recordReview({}, chain(), 't.a', true, T0)).toThrow(/not mastered/);
  });
});

describe('failure flags strong prerequisites for a check', () => {
  // t.x encompasses t.a strongly and t.b lightly.
  const g = [T('t.a'), T('t.b'), T('t.x', ['t.a', 't.b'], { 't.a': 0.6, 't.b': 0.3 })];

  it('a failed review pulls strongly encompassed topics due now, without a lapse', () => {
    const m: MemoryMap = mastered(['t.a', 't.b', 't.x']);
    const u = recordReview(m, g, 't.x', false, T0 + DAY_MS / 2);
    expect(u.flagged).toEqual(['t.a']);
    expect(u.memory['t.a']).toEqual({ ...m['t.a'], due: T0 + DAY_MS / 2 });
    expect(u.memory['t.b']).toEqual(m['t.b']);
    expect(u.memory['t.x']?.lapses).toBe(1);
  });

  it('does not push an already overdue check later', () => {
    const m: MemoryMap = { ...mastered(['t.b', 't.x']), 't.a': { ...newMemory(T0), due: day(-3) } };
    const u = recordReview(m, g, 't.x', false, day(1));
    expect(u.memory['t.a']?.due).toBe(day(-3));
  });

  it('flags only one level down, and only mastered topics', () => {
    const u = recordReview(mastered(['t.c', 't.d']), [...chain()].map((t) => (t.id === 't.d' ? { ...t, encompasses: { 't.c': 0.9 } } : t)), 't.d', false, day(1));
    expect(u.flagged).toEqual(['t.c']);
    expect(u.memory['t.b']).toBeUndefined();
  });

  it('a failed lesson flags too, and does not master the topic', () => {
    const u = recordLessonFailure(mastered(['t.a', 't.b']), g, 't.x', day(1));
    expect(u.memory['t.x']).toBeUndefined();
    expect(u.flagged).toEqual(['t.a']);
    expect(u.memory['t.a']?.due).toBe(day(1));
  });

  it('the check weight is a parameter', () => {
    const u = recordLessonFailure(mastered(['t.a', 't.b']), g, 't.x', day(1), { checkWeight: 0.3 });
    expect(u.flagged).toEqual(['t.a', 't.b']);
  });
});

describe('placedMemory and dueTopics', () => {
  it('spreads first reviews, highest topics first', () => {
    const ids = Array.from({ length: 13 }, (_, i) => `t.p${i}`);
    const m = placedMemory(ids, T0);
    expect(m['t.p12']?.intervalDays).toBe(PLACED_FIRST_REVIEW_DAYS);
    expect(m[`t.p${12 - PLACED_PER_DAY}`]?.intervalDays).toBe(PLACED_FIRST_REVIEW_DAYS + 1);
    expect(m['t.p0']?.intervalDays).toBe(PLACED_FIRST_REVIEW_DAYS + 2);
    expect(m['t.p0']).toMatchObject({ reps: 1, lapses: 0, implicitCredit: 0, lastReviewed: T0 });
  });

  it('lists due topics most overdue first', () => {
    const m: MemoryMap = {
      't.a': { ...newMemory(T0), due: day(2) },
      't.b': { ...newMemory(T0), due: day(1) },
      't.c': { ...newMemory(T0), due: day(5) },
    };
    expect(dueTopics(m, day(2))).toEqual(['t.b', 't.a']);
    expect(dueTopics(m, day(0))).toEqual([]);
  });

  it('documents its constants', () => {
    expect(DEFAULT_MEMORY_PARAMS).toMatchObject({ firstIntervalDays: 1, earlyGrowth: 3, lateGrowth: 2, failShrink: 0.5, creditCutoff: 0.1, checkWeight: 0.5 });
  });
});
