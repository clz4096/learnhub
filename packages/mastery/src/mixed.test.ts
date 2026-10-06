import { describe, expect, it } from 'vitest';
import { GYM_CREDIT } from './gym';
import { mulberry32 } from './rng';
import { DAY_MS, newMemory, recordReview, type MemoryMap } from './memory';
import {
  MIXED_MIN_TOPICS, mixedLabel, mixedOrder, mixedPriority, recordMixed, selectMixedReview, spreadTopics, type MixedTopic,
} from './mixed';

const NOW = Date.UTC(2026, 9, 5, 14);

/** a overdue by two days of a one-day interval; b due now; c half way; d just reviewed; e has no memory. */
const MEMORY: MemoryMap = {
  'x.a': { ...newMemory(NOW - 3 * DAY_MS), due: NOW - 2 * DAY_MS },
  'x.b': { ...newMemory(NOW - DAY_MS), due: NOW },
  'x.c': { ...newMemory(NOW - DAY_MS), intervalDays: 2, due: NOW + DAY_MS },
  'x.d': newMemory(NOW),
};
const T = (id: string, n = 2): MixedTopic => ({ topicId: id, generatorIds: Array.from({ length: n }, (_, i) => `g${i + 1}`) });
const TOPICS = [T('x.d'), T('x.c'), T('x.b'), T('x.a'), T('x.e')];

describe('mixedPriority', () => {
  it('is the share of the interval gone: 0 just reviewed, 1 when due, more when overdue', () => {
    expect(mixedPriority(MEMORY['x.d']!, NOW)).toBe(0);
    expect(mixedPriority(MEMORY['x.c']!, NOW)).toBe(0.5);
    expect(mixedPriority(MEMORY['x.b']!, NOW)).toBe(1);
    expect(mixedPriority(MEMORY['x.a']!, NOW)).toBe(3);
  });

  it('a state with no interval counts as due once its time comes', () => {
    const s = { ...newMemory(NOW), due: NOW };
    expect(mixedPriority(s, NOW)).toBe(1);
    expect(mixedPriority(s, NOW - 1)).toBe(0);
  });
});

describe('mixedOrder', () => {
  it('keeps topics with memory and generators, once each, highest priority first', () => {
    const got = mixedOrder({ topics: [...TOPICS, T('x.a'), { topicId: 'x.f', generatorIds: [] }], memory: { ...MEMORY, 'x.f': newMemory(NOW) }, now: NOW });
    expect(got.map((t) => t.topicId)).toEqual(['x.a', 'x.b', 'x.c', 'x.d']);
  });

  it('breaks ties by id', () => {
    const memory: MemoryMap = { 'y.b': newMemory(NOW), 'y.a': newMemory(NOW) };
    expect(mixedOrder({ topics: [T('y.b'), T('y.a')], memory, now: NOW }).map((t) => t.topicId)).toEqual(['y.a', 'y.b']);
  });
});

describe('spreadTopics', () => {
  const ids = (xs: { topicId: string }[]): string => xs.map((x) => x.topicId).join('');
  const items = (s: string): { topicId: string; n: number }[] => [...s].map((topicId, n) => ({ topicId, n }));

  it('puts no two neighbours on one topic when that is possible', () => {
    expect(ids(spreadTopics(items('aaabbc')))).toBe('ababac');
    expect(ids(spreadTopics(items('aabb')))).toBe('abab');
    const got = spreadTopics(items('aaabbbcc'));
    for (let i = 1; i < got.length; i++) expect(got[i]!.topicId).not.toBe(got[i - 1]!.topicId);
  });

  it('succeeds on every feasible multiset (no topic over half, rounded up), over many random cases', () => {
    const rng = mulberry32(5);
    for (let k = 0; k < 2000; k++) {
      const n = 1 + Math.floor(rng() * 12);
      const s = Array.from({ length: n }, () => 'abcd'[Math.floor(rng() * (1 + Math.floor(rng() * 4)))] as string).join('');
      const most = Math.max(...[...'abcd'].map((c) => [...s].filter((x) => x === c).length));
      const got = spreadTopics(items(s));
      expect(ids(got).split('').sort().join('')).toBe([...s].sort().join(''));
      if (most > Math.ceil(n / 2)) continue;
      for (let i = 1; i < got.length; i++) expect(got[i]!.topicId, s).not.toBe(got[i - 1]!.topicId);
    }
  });

  it('keeps every item, in order within a topic, and repeats only when forced', () => {
    const got = spreadTopics(items('aaaab'));
    expect(ids(got)).toBe('abaaa');
    expect(got.filter((x) => x.topicId === 'a').map((x) => x.n)).toEqual([0, 1, 2, 3]);
    expect(spreadTopics([])).toEqual([]);
  });
});

describe('selectMixedReview', () => {
  const input = { topics: TOPICS, memory: MEMORY, now: NOW, count: 6, seed: 7 };

  it('is empty with fewer than three usable topics, or no problems asked', () => {
    expect(MIXED_MIN_TOPICS).toBe(3);
    expect(selectMixedReview({ ...input, topics: [T('x.a'), T('x.b'), T('x.e')] })).toEqual([]);
    expect(selectMixedReview({ ...input, count: 0 })).toEqual([]);
  });

  it('takes topics by priority, extra problems to the highest, never two of a topic in a row', () => {
    const got = selectMixedReview(input);
    expect(got).toHaveLength(6);
    const per = (id: string): number => got.filter((x) => x.topicId === id).length;
    expect([per('x.a'), per('x.b'), per('x.c'), per('x.d'), per('x.e')]).toEqual([2, 2, 1, 1, 0]);
    for (let i = 1; i < got.length; i++) expect(got[i]!.topicId).not.toBe(got[i - 1]!.topicId);
  });

  it('with fewer problems than topics, takes the most urgent', () => {
    const got = selectMixedReview({ ...input, count: 3 });
    expect(got.map((x) => x.topicId).sort()).toEqual(['x.a', 'x.b', 'x.c']);
  });

  it('rotates through a topic\'s generators and logs items as drills are logged', () => {
    const got = selectMixedReview({ ...input, count: 8 });
    const a = got.filter((x) => x.topicId === 'x.a');
    expect(new Set(a.map((x) => x.generatorId))).toEqual(new Set(['g1', 'g2']));
    for (const x of got) {
      expect(x.id).toBe(`${x.topicId}/${x.generatorId}`);
      expect(Number.isInteger(x.seed) && x.seed >= 0 && x.seed < 2 ** 32).toBe(true);
    }
  });

  it('is deterministic for its input, and the seed changes the plan', () => {
    expect(selectMixedReview(input)).toEqual(selectMixedReview(input));
    const plans = new Set(Array.from({ length: 10 }, (_, s) => JSON.stringify(selectMixedReview({ ...input, seed: s }))));
    expect(plans.size).toBe(10);
  });
});

describe('mixedLabel', () => {
  it('hides the topic until the problem is answered', () => {
    const title = (id: string): string => `Title of ${id}`;
    expect(mixedLabel({ topicId: 'x.a' }, false, title)).toBeNull();
    expect(mixedLabel({ topicId: 'x.a' }, true, title)).toBe('Title of x.a');
  });
});

describe('recordMixed', () => {
  it('on a due topic, is that topic\'s review, logged as a quiz item', () => {
    for (const correct of [true, false]) {
      const r = recordMixed(MEMORY, [], { topicId: 'x.a' }, correct, NOW);
      expect(r.kind).toBe('quiz');
      expect(r.update).toEqual(recordReview(MEMORY, [], 'x.a', correct, NOW));
    }
  });

  it('on a topic not yet due, is a drill: half a repetition banked when right, the review brought forward when wrong', () => {
    const right = recordMixed(MEMORY, [], { topicId: 'x.c' }, true, NOW);
    expect(right.kind).toBe('drill');
    expect(right.update.memory['x.c']!.implicitCredit).toBe(GYM_CREDIT.drill);
    expect(right.update.memory['x.c']!.due).toBe(MEMORY['x.c']!.due);
    const wrong = recordMixed(MEMORY, [], { topicId: 'x.c' }, false, NOW);
    expect(wrong.update.memory['x.c']!.due).toBe(NOW);
    expect(wrong.update.memory['x.c']!.lapses).toBe(0);
  });

  it('leaves a topic without memory alone', () => {
    const r = recordMixed(MEMORY, [], { topicId: 'x.e' }, true, NOW);
    expect(r.kind).toBe('drill');
    expect(r.update.memory).toEqual(MEMORY);
  });
});
