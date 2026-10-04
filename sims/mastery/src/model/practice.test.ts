import { describe, expect, it } from 'vitest';
import { contentFor } from '@learnhub/content';
import { answer, freshPractice, instanceAt, seedFor } from '@/model/practice';

const rule = { correctInARow: 3, maxProblems: 10 };

describe('the mastery rule', () => {
  it('is met by three right in a row, and a miss resets the streak', () => {
    let s = freshPractice();
    const outcomes = [true, false, true, true, true].map((c) => { const r = answer(s, c, rule); s = r.state; return r.outcome; });
    expect(outcomes).toEqual(['continue', 'continue', 'continue', 'continue', 'mastered']);
    expect(s.attempts).toBe(5);
  });

  it('ends as not yet once a perfect run of the problems left could not reach it', () => {
    let s = freshPractice();
    const outcomes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const r = answer(s, false, rule);
      s = r.state;
      outcomes.push(r.outcome);
      if (r.outcome !== 'continue') break;
    }
    expect(outcomes.at(-1)).toBe('not-yet');
    expect(s.attempts).toBe(8);
  });

  it('a learner who gets the last three right within the limit still masters it', () => {
    let s = freshPractice();
    for (const c of [false, false, false, false, false, false, false, true, true]) s = answer(s, c, rule).state;
    expect(answer(s, true, rule).outcome).toBe('mastered');
  });
});

describe('problem choice', () => {
  const c = contentFor('pre.fractions');
  it('seeds are stable and differ by occasion', () => {
    expect(seedFor('a', 1, 2)).toBe(seedFor('a', 1, 2));
    expect(seedFor('a', 1, 2)).not.toBe(seedFor('a', 1, 3));
  });
  it('practice rotates through every generator', () => {
    if (c === undefined) throw new Error('no content');
    const ids = Array.from({ length: c.generators.length }, (_, k) => instanceAt(c, 'x', k).generatorId);
    expect(new Set(ids).size).toBe(c.generators.length);
    expect(instanceAt(c, 'x', 0).seed).toBe(seedFor('pre.fractions', 'x', 0));
  });
});
