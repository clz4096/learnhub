/** Proof-order puzzles: the shuffle, the grade, and the gym record. */
import { describe, expect, it } from 'vitest';
import { t, type ProofOrder } from '@learnhub/content';
import { GYM_CREDIT, newMemory } from '@learnhub/mastery';
import { DEFAULT_COURSES, startLearner } from '@/model/learner';
import { gradeProofOrder, recordProofOrder, shuffledOrder } from '@/model/proofOrder';

const T0 = new Date(2026, 9, 5, 9, 0).getTime();
const TOPIC = 'proof.contradiction';

/** Root two is irrational, in four steps. */
const PUZZLE: ProofOrder = {
  title: t`Root two is irrational`,
  steps: [
    t`Suppose root two is p over q in lowest terms.`,
    t`Then p squared is twice q squared, so p is even.`,
    t`Write p as twice k; then q squared is twice k squared, so q is even.`,
    t`Both even contradicts lowest terms.`,
  ],
};

describe('shuffledOrder', () => {
  it('is a permutation, deterministic for a seed, and never the right order', () => {
    for (let n = 2; n <= 8; n++) {
      for (let seed = 1; seed <= 300; seed++) {
        const o = shuffledOrder(n, seed);
        expect([...o].sort((a, b) => a - b)).toEqual(Array.from({ length: n }, (_, i) => i));
        expect(o.every((x, i) => x === i), `n ${n} seed ${seed}`).toBe(false);
        expect(shuffledOrder(n, seed)).toEqual(o);
      }
    }
  });

  it('varies with the seed', () => {
    const seen = new Set(Array.from({ length: 50 }, (_, s) => shuffledOrder(5, s + 1).join()));
    expect(seen.size).toBeGreaterThan(10);
  });

  it('handles 0 and 1 steps', () => {
    expect(shuffledOrder(0, 1)).toEqual([]);
    expect(shuffledOrder(1, 1)).toEqual([0]);
  });
});

describe('gradeProofOrder', () => {
  it('accepts the right order only', () => {
    const g = gradeProofOrder(PUZZLE, [0, 1, 2, 3]);
    expect(g).toEqual({ correct: true, placed: [true, true, true, true], firstWrong: null, feedback: 'Right: every step follows from the ones before it.' });
  });

  it('marks each position and names the first step out of place', () => {
    const g = gradeProofOrder(PUZZLE, [0, 2, 1, 3]);
    expect(g.correct).toBe(false);
    expect(g.placed).toEqual([true, false, false, true]);
    expect(g.firstWrong).toBe(1);
    expect(g.feedback).toBe('Step 2 is out of place: it needs something not shown yet, or it is not what comes next. 2 of 4 are in their place.');
  });

  it('refuses a malformed order: short, repeated, or unknown steps', () => {
    for (const bad of [[0, 1, 2], [0, 1, 1, 3], [0, 1, 2, 9], [0, 1, 2, 3, 3], [0, 1, 2.5, 3], []]) {
      const g = gradeProofOrder(PUZZLE, bad);
      expect(g.correct, JSON.stringify(bad)).toBe(false);
      expect(g.feedback).toBe('Place every step exactly once.');
      expect(g.firstWrong).not.toBeNull();
    }
  });

  it('agrees with the proof grader over every order of four steps', () => {
    const perms = (xs: number[]): number[][] => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) => perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p])));
    const all = perms([0, 1, 2, 3]);
    expect(all).toHaveLength(24);
    expect(all.filter((o) => gradeProofOrder(PUZZLE, o).correct)).toEqual([[0, 1, 2, 3]]);
  });
});

describe('recordProofOrder', () => {
  const learned = (): ReturnType<typeof startLearner> => {
    const p = startLearner(T0, DEFAULT_COURSES, 60);
    return { ...p, memory: { [TOPIC]: newMemory(T0) } };
  };

  it('logs a gym entry with the order item id and banks gym credit when right', () => {
    const { progress, grade } = recordProofOrder(learned(), TOPIC, 2, PUZZLE, [0, 1, 2, 3], 41_000, T0 + 1000);
    expect(grade.correct).toBe(true);
    const h = progress.history.at(-1);
    expect(h).toEqual({ at: T0 + 1000, kind: 'gym', topicId: TOPIC, correct: true, item: { id: `order:${TOPIC}#2`, ms: 41_000, hints: 0, attempt: 1 } });
    expect(progress.memory[TOPIC]?.implicitCredit).toBe(GYM_CREDIT.order);
  });

  it('a wrong order brings the review forward and counts the attempt', () => {
    const first = recordProofOrder(learned(), TOPIC, 0, PUZZLE, [1, 0, 2, 3], undefined, T0 + 1000).progress;
    expect(first.memory[TOPIC]?.due).toBe(T0 + 1000);
    expect(first.history.at(-1)?.item).toEqual({ id: `order:${TOPIC}#0`, hints: 0, attempt: 1 });
    const second = recordProofOrder(first, TOPIC, 0, PUZZLE, [0, 1, 2, 3], undefined, T0 + 2000).progress;
    expect(second.history.at(-1)?.item?.attempt).toBe(2);
  });
});
