import { describe, expect, it } from 'vitest';
import { generator, t, type Generator, type GeneratorLevel, type MasteryRule, type TopicContent } from '@learnhub/content';
import { TOPIC_CONTENT, contentFor } from '@learnhub/content/all';
import {
  answer, freshPractice, instanceAt, levelOf, moreInstance, outcomeOf, passMark, practiceInstance, practiceSet, practiceSetSize, seedFor, skillsOf, tallyOf,
  type PracticeItem, type PracticeState,
} from '@/model/practice';

/** A generator that only needs an id, a skill, and a level. */
function gen(id: string, skill: string, level?: GeneratorLevel): Generator {
  return generator({
    id, skill, ...(level === undefined ? {} : { level }),
    params: (rng) => ({ n: Math.floor(rng() * 1000) }),
    sane: () => null,
    problem: (p) => ({ prompt: t`Write ${p.n}.`, answer: { kind: 'exact', expected: String(p.n) }, solution: [] }),
    solve: (p) => String(p.n),
    misconceptions: () => [],
  }) as Generator;
}

function topic(generators: Generator[], mastery: MasteryRule = { correctInARow: 3, maxProblems: 10 }): TopicContent {
  return { topicId: 'test.topic', generators, mastery, lesson: [], examples: [], terms: [], cambridge: [], gate: [], goal: t`x` } as unknown as TopicContent;
}

const RANK = { easy: 0, standard: 1, harder: 2 } as const;
const counts = (set: readonly PracticeItem[], f: (x: PracticeItem) => string): Map<string, number> => {
  const m = new Map<string, number>();
  for (const x of set) m.set(f(x), (m.get(f(x)) ?? 0) + 1);
  return m;
};

describe('the practice set (Rule 2)', () => {
  const levelled = topic([
    gen('e1', 'Add', 'easy'), gen('s1', 'Add'), gen('s2', 'Multiply', 'standard'), gen('s3', 'Cancel'), gen('h1', 'Ratio', 'harder'),
  ]);

  it('is 10 problems, easy to standard to harder, every skill at least twice', () => {
    for (const salt of ['a', 'b', 7, 'lesson-3-1']) {
      const set = practiceSet(levelled, salt);
      expect(set).toHaveLength(10);
      expect(set.map((x) => RANK[x.level])).toEqual([...set.map((x) => RANK[x.level])].sort((a, b) => a - b));
      for (const skill of skillsOf(levelled)) expect(counts(set, (x) => x.skill).get(skill) ?? 0, skill).toBeGreaterThanOrEqual(2);
      expect(set[0]?.level).toBe('easy');
      expect(set.at(-1)?.level).toBe('harder');
      // Spread: no generator takes more than its share plus one.
      expect(Math.max(...counts(set, (x) => x.generatorId).values())).toBeLessThanOrEqual(3);
    }
  });

  it('a skill with two generators uses both, at different levels where it can', () => {
    for (const salt of ['a', 'b', 'c']) {
      const add = practiceSet(levelled, salt).filter((x) => x.skill === 'Add');
      expect(new Set(add.map((x) => x.generatorId))).toEqual(new Set(['e1', 's1']));
    }
  });

  it('is fixed by the content and the salt, and differs between occasions', () => {
    expect(practiceSet(levelled, 'x')).toEqual(practiceSet(levelled, 'x'));
    expect(practiceSet(levelled, 'x').map((x) => x.seed)).not.toEqual(practiceSet(levelled, 'y').map((x) => x.seed));
    expect(new Set(practiceSet(levelled, 'x').map((x) => x.seed)).size).toBe(10);
  });

  it('reads an unset level as standard', () => {
    expect(levelOf(gen('u', 'x'))).toBe('standard');
    expect(practiceSet(topic([gen('a', 'A'), gen('b', 'B'), gen('c', 'C')]), 's').every((x) => x.level === 'standard')).toBe(true);
  });

  it('grows past 12 only when the skills need it, and keeps the old maxProblems within 10 to 12', () => {
    const seven = topic(['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((s) => gen(s.toLowerCase(), s)));
    expect(practiceSetSize(seven)).toBe(14);
    expect(practiceSet(seven, 's')).toHaveLength(14);
    const three = [gen('a', 'A'), gen('b', 'B'), gen('c', 'C')];
    expect(practiceSetSize(topic(three, { maxProblems: 12 }))).toBe(12);
    expect(practiceSetSize(topic(three, { maxProblems: 40 }))).toBe(12);
    expect(practiceSetSize(topic(three, { maxProblems: 3 }))).toBe(10);
    expect(practiceSetSize(topic(three, { setSize: 11 }))).toBe(11);
  });

  it('a single generator fills the set', () => {
    const set = practiceSet(topic([gen('only', 'One')]), 's');
    expect(set).toHaveLength(10);
    expect(new Set(set.map((x) => x.generatorId))).toEqual(new Set(['only']));
  });

  it('spreads repeats: no generator twice in a row where its level has another', () => {
    for (const salt of ['a', 'b', 'c', 'd']) {
      const set = practiceSet(topic([gen('a', 'A'), gen('b', 'B'), gen('c', 'C')]), salt);
      for (let i = 1; i < set.length; i++) expect(set[i]?.generatorId, `${salt} ${i}`).not.toBe(set[i - 1]?.generatorId);
    }
  });

  it('every topic with content gets a valid set', () => {
    for (const c of TOPIC_CONTENT) {
      const set = practiceSet(c, 'check');
      expect(set.length, c.topicId).toBeGreaterThanOrEqual(10);
      expect(set.length, c.topicId).toBe(practiceSetSize(c));
      for (const skill of skillsOf(c)) expect(counts(set, (x) => x.skill).get(skill) ?? 0, `${c.topicId}: ${skill}`).toBeGreaterThanOrEqual(2);
      expect(set.map((x) => RANK[x.level])).toEqual([...set.map((x) => RANK[x.level])].sort((a, b) => a - b));
    }
  });

  it('makes each problem from its generator and seed, and a fresh one from the same generator', () => {
    const c = contentFor('pre.fractions') as TopicContent;
    const set = practiceSet(c, 'x');
    const item = set[3] as PracticeItem;
    const inst = practiceInstance(c, item, 3);
    expect(inst.generatorId).toBe(item.generatorId);
    expect(inst.seed).toBe(item.seed);
    const fresh = practiceInstance(c, item, 3, 1);
    expect(fresh.generatorId).toBe(item.generatorId);
    expect(fresh.seed).not.toBe(item.seed);
    // A generator gone from the topic (content changed under a saved set) still gives a problem.
    expect(practiceInstance(c, { ...item, generatorId: 'gone' }, 3).generatorId).toBeTypeOf('string');
  });
});

describe('the pass rule (Rule 2)', () => {
  const rule: MasteryRule = { correctInARow: 3, maxProblems: 10 };
  // A B C D E A B C D E
  const set: PracticeItem[] = Array.from({ length: 10 }, (_, i) => ({ generatorId: `g${i % 5}`, skill: 'ABCDE'[i % 5] as string, level: 'standard', seed: i }));
  const play = (results: readonly boolean[], items: readonly PracticeItem[] = set) => {
    let s: PracticeState = freshPractice();
    const outcomes: string[] = [];
    for (const r of results) {
      const x = answer(s, r, items, rule);
      s = x.state;
      outcomes.push(x.outcome);
      // The app ends the run at its first outcome.
      if (x.outcome !== 'continue') break;
    }
    return { s, outcomes };
  };

  it('the mark is 80 percent, rounded up', () => {
    expect([10, 11, 12, 14].map((n) => passMark(n, 0.8))).toEqual([8, 9, 10, 12]);
  });

  it('passes with 8 of 10 and every skill right, at the end of the set', () => {
    const { outcomes } = play([true, true, false, true, true, true, true, true, false, true]);
    expect(outcomes.slice(0, 9).every((o) => o === 'continue')).toBe(true);
    expect(outcomes[9]).toBe('passed');
  });

  it('has no "in a row": alternating right and wrong is fine, two in a row of misses too', () => {
    // Two misses side by side, and misses spread out.
    expect(play([true, true, false, false, true, true, true, true, true, true]).outcomes.at(-1)).toBe('passed');
    expect(play([true, false, true, true, false, true, true, true, true, true]).outcomes.at(-1)).toBe('passed');
  });

  it('is not yet with 7 of 10, ending as soon as 8 is out of reach', () => {
    const { outcomes, s } = play([false, false, false, true, true, true, true, true, true, true]);
    expect(outcomes.slice(0, 3)).toEqual(['continue', 'continue', 'not-yet']);
    expect(s.attempts).toBe(3);
  });

  it('is not yet when a skill is never right, even at 8 of 10', () => {
    // Skill A is at places 0 and 5: both missed. Eight right is still within reach, but A can no longer be right.
    const { outcomes } = play([false, true, true, true, true, false]);
    expect(outcomes.at(-1)).toBe('not-yet');
    expect(tallyOf(play([false, true, true, true, true]).s, set, rule)).toEqual({ right: 4, mark: 8, size: 10, skillsLeft: ['A'] });
  });

  it('scales with the set: 12 problems need 10', () => {
    const twelve: PracticeItem[] = Array.from({ length: 12 }, (_, i) => ({ generatorId: `g${i % 6}`, skill: 'ABCDEF'[i % 6] as string, level: 'standard', seed: i }));
    expect(play([...Array<boolean>(10).fill(true), false, false], twelve).outcomes.at(-1)).toBe('passed');
    expect(play([...Array<boolean>(9).fill(true), false, false, false], twelve).outcomes.at(-1)).toBe('not-yet');
  });

  it('a run saved under the old rule that had met its streak stays passed; a new run with a streak does not', () => {
    const old: PracticeState = { attempts: 3, streak: 3, results: [true, true, true] };
    expect(outcomeOf(old, set, rule)).toBe('passed');
    expect(outcomeOf({ ...old, rule: 2 }, set, rule)).toBe('continue');
    // An old run in progress carries on under the new rule.
    const mid: PracticeState = { attempts: 2, streak: 2, results: [true, true] };
    expect(outcomeOf(mid, set, rule)).toBe('continue');
    expect(answer(mid, true, set, rule).state.rule).toBe(2);
    expect(answer(mid, true, set, rule).outcome).toBe('continue');
  });
});

describe('more practice and problem choice', () => {
  const c = contentFor('pre.fractions') as TopicContent;
  it('seeds are stable and differ by occasion', () => {
    expect(seedFor('a', 1, 2)).toBe(seedFor('a', 1, 2));
    expect(seedFor('a', 1, 2)).not.toBe(seedFor('a', 1, 3));
  });
  it('reviews rotate through every generator', () => {
    const ids = Array.from({ length: c.generators.length }, (_, k) => instanceAt(c, 'x', k).generatorId);
    expect(new Set(ids).size).toBe(c.generators.length);
    expect(instanceAt(c, 'x', 0).seed).toBe(seedFor('pre.fractions', 'x', 0));
  });
  it('more practice cycles through the generators with fresh seeds, without end', () => {
    const n = c.generators.length;
    const stream = Array.from({ length: 3 * n }, (_, k) => moreInstance(c, 1234, k));
    expect(stream.map((x) => x.generatorId)).toEqual(Array.from({ length: 3 * n }, (_, k) => c.generators[k % n]?.id));
    expect(new Set(stream.map((x) => x.seed)).size).toBe(3 * n);
    // Another visit, another stream; and never the practice set's seeds.
    expect(moreInstance(c, 5678, 0).seed).not.toBe(stream[0]?.seed);
    const setSeeds = new Set(practiceSet(c, 1234).map((x) => x.seed));
    expect(stream.some((x) => setSeeds.has(x.seed as number))).toBe(false);
  });
});
