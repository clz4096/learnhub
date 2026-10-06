import { describe, expect, it } from 'vitest';
import { GYM_CREDIT, GYM_MINUTES, GYM_REP, gymItemId, gymRep, gymRepUnits, recordGym, selectGym, type GymCandidate, type GymKind } from './gym';
import { DAY_MS, newMemory, recordReview, type MemoryMap } from './memory';
import type { HistoryEntry } from './progress';

const NOW = Date.UTC(2026, 9, 5, 14);
const c = (kind: GymKind, topicId: string, part?: string | number): GymCandidate => ({ kind, topicId, id: gymItemId(kind, topicId, part), minutes: GYM_MINUTES[kind] });

/** a and b due (b more overdue), c learned and due tomorrow, d not learned. */
const MEMORY: MemoryMap = {
  'x.a': { ...newMemory(NOW - 2 * DAY_MS), due: NOW - DAY_MS },
  'x.b': { ...newMemory(NOW - 5 * DAY_MS), due: NOW - 3 * DAY_MS },
  'x.c': { ...newMemory(NOW), due: NOW + DAY_MS },
};

const ALL: GymCandidate[] = [
  c('review', 'x.a'), c('review', 'x.b'), c('review', 'x.c'), c('review', 'x.d'),
  c('drill', 'x.a', 'g1'), c('drill', 'x.c', 'g1'), c('drill', 'x.d', 'g1'),
  c('order', 'x.a', 0), c('recall', 'x.a', 0), c('recall', 'x.a', 1), c('recall', 'x.c', 0),
  c('listen', 'x.c'),
];

const ids = (xs: readonly GymCandidate[]): string[] => xs.map((x) => x.id);
const total = (xs: readonly GymCandidate[]): number => xs.reduce((a, x) => a + x.minutes, 0);

describe('gym item ids', () => {
  it('name the kind, the topic, and the part', () => {
    expect(['review', 'listen'].map((k) => gymItemId(k as GymKind, 'x.a'))).toEqual(['review:x.a', 'listen:x.a']);
    expect(gymItemId('drill', 'x.a', 'g1')).toBe('drill:x.a/g1');
    expect(gymItemId('recall', 'x.a', 2)).toBe('recall:x.a#2');
    expect(gymItemId('order', 'x.a', 0)).toBe('order:x.a#0');
  });
});

describe('selectGym', () => {
  it('due reviews first, most overdue first; then short items mixed across topics, soonest due first; listening last', () => {
    const got = selectGym({ candidates: ALL, memory: MEMORY, now: NOW, minutes: 60 });
    expect(ids(got)).toEqual([
      'review:x.b', 'review:x.a',
      'drill:x.a/g1', 'drill:x.c/g1', 'order:x.a#0', 'recall:x.c#0', 'recall:x.a#0', 'recall:x.a#1',
      'listen:x.c',
    ]);
  });

  it('never offers an unlearned topic, or a review that is not due', () => {
    const got = ids(selectGym({ candidates: ALL, memory: MEMORY, now: NOW, minutes: 600 }));
    expect(got.some((id) => id.includes('x.d'))).toBe(false);
    expect(got).not.toContain('review:x.c');
  });

  it('fills the window without going over, skipping an item that does not fit for a shorter one', () => {
    for (const minutes of [0, 0.5, 1, 2, 3, 4, 6.5, 7, 10, 15]) {
      const got = selectGym({ candidates: ALL, memory: MEMORY, now: NOW, minutes });
      expect(total(got), `${minutes} minutes`).toBeLessThanOrEqual(minutes);
    }
    // 4 minutes: one review (3), then the drill (1.5) does not fit, but a recall card (0.5) does.
    expect(ids(selectGym({ candidates: ALL, memory: MEMORY, now: NOW, minutes: 4 }))).toEqual(['review:x.b', 'recall:x.c#0', 'recall:x.a#0']);
  });

  it('skips what is done already, and duplicate ids', () => {
    const got = selectGym({ candidates: [...ALL, c('drill', 'x.a', 'g1')], memory: MEMORY, now: NOW, minutes: 60, done: ['review:x.b', 'recall:x.a#0'] });
    expect(ids(got)).not.toContain('review:x.b');
    expect(ids(got)).not.toContain('recall:x.a#0');
    expect(ids(got).filter((id) => id === 'drill:x.a/g1')).toHaveLength(1);
  });

  it('is deterministic whatever the order of the candidates', () => {
    const a = selectGym({ candidates: ALL, memory: MEMORY, now: NOW, minutes: 12 });
    const b = selectGym({ candidates: [...ALL].reverse(), memory: MEMORY, now: NOW, minutes: 12 });
    expect(ids(b)).toEqual(ids(a));
  });

  it('an empty window or no learned topic gives nothing', () => {
    expect(selectGym({ candidates: ALL, memory: MEMORY, now: NOW, minutes: 0 })).toEqual([]);
    expect(selectGym({ candidates: ALL, memory: {}, now: NOW, minutes: 60 })).toEqual([]);
  });
});

describe('recordGym', () => {
  it('a gym review is an explicit review', () => {
    for (const ok of [true, false]) {
      expect(recordGym(MEMORY, [], { kind: 'review', topicId: 'x.a' }, ok, NOW)).toEqual(recordReview(MEMORY, [], 'x.a', ok, NOW));
    }
  });

  it('a right drill or proof order banks part of a repetition; two make one', () => {
    const once = recordGym(MEMORY, [], { kind: 'drill', topicId: 'x.c' }, true, NOW);
    expect(once.memory['x.c']?.implicitCredit).toBe(GYM_CREDIT.drill);
    expect(once.memory['x.c']?.reps).toBe(0);
    const twice = recordGym(once.memory, [], { kind: 'order', topicId: 'x.c' }, true, NOW);
    expect(twice.converted).toEqual(['x.c']);
    expect(twice.memory['x.c']?.reps).toBe(1);
    expect(twice.memory['x.c']?.implicitCredit).toBe(0);
  });

  it('a missed drill brings the topic due now, with no lapse', () => {
    const r = recordGym(MEMORY, [], { kind: 'drill', topicId: 'x.c' }, false, NOW);
    expect(r.flagged).toEqual(['x.c']);
    expect(r.memory['x.c']).toEqual({ ...MEMORY['x.c'], due: NOW });
  });

  it('recall cards and listening move no schedule, and an unlearned topic is left alone', () => {
    for (const kind of ['recall', 'listen'] as const) {
      for (const ok of [true, false]) expect(recordGym(MEMORY, [], { kind, topicId: 'x.a' }, ok, NOW).memory).toEqual(MEMORY);
    }
    expect(recordGym(MEMORY, [], { kind: 'review', topicId: 'x.d' }, true, NOW).memory).toEqual(MEMORY);
  });

  it('never changes its input', () => {
    const before = JSON.stringify(MEMORY);
    recordGym(MEMORY, [], { kind: 'drill', topicId: 'x.a' }, false, NOW);
    recordGym(MEMORY, [], { kind: 'drill', topicId: 'x.a' }, true, NOW);
    expect(JSON.stringify(MEMORY)).toBe(before);
  });
});

describe('gym REP', () => {
  const day = (ms: number): string => new Date(ms).toISOString().slice(0, 10);
  const gym = (at: number, correct: boolean): HistoryEntry => ({ at, kind: 'gym', topicId: 'x.a', correct, item: { id: 'recall:x.a#0', hints: 0, attempt: 1 } });

  it(`counts gym items done right, at most ${GYM_REP.dailyCap} a day, and nothing else`, () => {
    const h: HistoryEntry[] = [
      ...Array.from({ length: GYM_REP.dailyCap + 5 }, (_, i) => gym(NOW + i, true)),
      gym(NOW + DAY_MS, true), gym(NOW + DAY_MS, false),
      { at: NOW, kind: 'review', topicId: 'x.a', correct: true },
    ];
    expect(gymRepUnits(h, day)).toBe(GYM_REP.dailyCap + 1);
    expect(gymRep(h, day)).toBe((GYM_REP.dailyCap + 1) * GYM_REP.points);
  });

  it('earns at a lower rate than study: a full gym day is worth at most a day studied', () => {
    expect(GYM_REP.points * GYM_REP.dailyCap).toBeLessThanOrEqual(10);
  });
});
