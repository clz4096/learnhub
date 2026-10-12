import { describe, expect, it } from 'vitest';
import { generator, lessonSections, plain, t, type Generator, type TopicContent } from '@learnhub/content';
import { TOPIC_CONTENT, contentFor } from '@learnhub/content/all';
import { DAY_MS, mergeProgress, type HistoryEntry, type Progress } from '@learnhub/mastery';
import { DEFAULT_COURSES, completeLesson, drillItemId, ensureSession, recordDrill, startLearner } from '@/model/learner';
import {
  RECENT_TRIES, WEAK_MIN_ATTEMPTS, firstTries, isWeak, percentOf, revisitCandidates, revisitRows, skillSection, skillStats, sortRevisit, stems, topicAccuracy,
  weakSkills,
} from '@/model/struggle';

const T0 = new Date(2026, 9, 12, 9, 0).getTime();

const drill = (topicId: string, gen: string, correct: boolean, at: number): HistoryEntry =>
  ({ at, kind: 'drill', topicId, correct, item: { id: `${topicId}/${gen}`, hints: 0, attempt: 1 } });

/** `pattern` as first answers to one generator, a minute apart: "1" right, "0" wrong. */
const tries = (topicId: string, gen: string, pattern: string, from = T0): HistoryEntry[] =>
  [...pattern].map((ch, i) => drill(topicId, gen, ch === '1', from + i * 60_000));

function gen(id: string, skill: string): Generator {
  return generator({
    id, skill, params: () => ({}), sane: () => null,
    problem: () => ({ prompt: t`Write one.`, answer: { kind: 'exact', expected: '1' }, solution: [] }),
    solve: () => '1', misconceptions: () => [],
  }) as Generator;
}

describe('weak skills (Rule 9)', () => {
  it('weak is under 60 percent right on the first try over at least 5 attempts', () => {
    expect(isWeak({ right: 2, attempts: 5 })).toBe(true);
    expect(isWeak({ right: 3, attempts: 5 })).toBe(false); // exactly 60 percent is not under it
    expect(isWeak({ right: 0, attempts: 4 })).toBe(false); // too few to judge
    expect(isWeak({ right: 5, attempts: 9 })).toBe(true);
    expect(percentOf({ right: 3, attempts: 7 })).toBe(43);
    expect(WEAK_MIN_ATTEMPTS).toBe(5);
  });

  const c = contentFor('pre.fractions') as TopicContent;
  const [g0, g1] = c.generators as [Generator, Generator];

  it('reads first answers from drill entries, per generator, in time order; other kinds do not count', () => {
    const h: HistoryEntry[] = [
      ...tries(c.topicId, g0.id, '01'),
      { at: T0, kind: 'gym', topicId: c.topicId, correct: false, item: { id: `drill:${c.topicId}/${g0.id}`, hints: 0, attempt: 1 } },
      { at: T0, kind: 'lesson', topicId: c.topicId, correct: false },
      { at: T0, kind: 'cambridge', topicId: c.topicId, correct: false, item: { id: `${c.topicId}/a6-q1-i-value`, hints: 0, attempt: 1 } },
    ];
    // Merged histories need not be in order.
    const m = firstTries([...h].reverse());
    expect([...(m.get(c.topicId)?.keys() ?? [])]).toEqual([g0.id]);
    expect(m.get(c.topicId)?.get(g0.id)?.map((x) => x.correct)).toEqual([false, true]);
    expect(topicAccuracy(h, c.topicId)).toEqual({ right: 1, attempts: 2 });
  });

  it('flags a skill under 60 percent over 5 or more, and not one with too few answers', () => {
    const h = [...tries(c.topicId, g0.id, '01001'), ...tries(c.topicId, g1.id, '0000')];
    const stats = skillStats(c, h);
    expect(stats.find((s) => s.skill === g0.skill)).toMatchObject({ right: 2, attempts: 5, weak: true });
    expect(stats.find((s) => s.skill === g1.skill)).toMatchObject({ right: 0, attempts: 4, weak: false });
    expect(weakSkills(c, h).map((s) => s.skill)).toEqual([g0.skill]);
  });

  it('judges a skill on its latest answers, so one learned since is no longer weak', () => {
    const early = tries(c.topicId, g0.id, '0000000000');
    const late = tries(c.topicId, g0.id, '1'.repeat(RECENT_TRIES), T0 + DAY_MS);
    expect(weakSkills(c, early).map((s) => s.skill)).toEqual([g0.skill]);
    expect(weakSkills(c, [...early, ...late])).toEqual([]);
    // The topic's own accuracy keeps every answer.
    expect(topicAccuracy([...early, ...late], c.topicId)).toEqual({ right: RECENT_TRIES, attempts: RECENT_TRIES + 10 });
  });

  it('counts the generators that share a skill together', () => {
    const shared = { topicId: 'test.shared', generators: [gen('a', 'Same skill'), gen('b', 'Same skill'), gen('c', 'Other')], lesson: [], cambridge: [] } as unknown as TopicContent;
    const h = [...tries('test.shared', 'a', '001'), ...tries('test.shared', 'b', '01')];
    expect(skillStats(shared, h)).toEqual([
      { skill: 'Same skill', right: 2, attempts: 5, weak: true, section: null },
      { skill: 'Other', right: 0, attempts: 0, weak: false, section: null },
    ]);
  });

  it('is the same whatever the order sync merges the history in', () => {
    const a: Progress = { ...startLearner(T0, DEFAULT_COURSES, 60), history: tries(c.topicId, g0.id, '010') };
    const b: Progress = { ...startLearner(T0, DEFAULT_COURSES, 60), history: tries(c.topicId, g0.id, '00', T0 + 3 * 60_000) };
    const ab = mergeProgress(a, b);
    const ba = mergeProgress(b, a);
    expect(skillStats(c, ab.history)).toEqual(skillStats(c, ba.history));
    expect(skillStats(c, mergeProgress(ab, ab).history)).toEqual(skillStats(c, ab.history));
    expect(skillStats(c, ab.history).find((s) => s.skill === g0.skill)).toMatchObject({ right: 1, attempts: 5, weak: true });
  });
});

describe('a skill\'s lesson section', () => {
  const c = contentFor('pre.fractions') as TopicContent;
  const titleOf = (skill: string): string | null => {
    const i = skillSection(c, skill);
    const s = i === null ? undefined : lessonSections(c.lesson)[i];
    return s === undefined || s.title === null ? null : plain(s.title);
  };

  it('matches skills to the section that teaches them', () => {
    expect(stems('Adding and subtracting fractions')).toEqual(new Set(['add', 'subtract', 'fraction']));
    expect(titleOf('Add two fractions with different denominators.')).toBe('Adding and subtracting');
    expect(titleOf('Multiply or divide two fractions and simplify.')).toBe('Multiplying and dividing');
    expect(titleOf('Share an amount in a given ratio.')).toBe('Ratios');
    expect(titleOf('Cancel a long product of fractions before multiplying, as in STEP Support Assignment 6 Q1(i).')).toBe('Cancelling across a long product');
  });

  it('prefers a Cambridge problem whose uses names the skill', () => {
    const note = plain(c.cambridge[0]?.uses?.note ?? []);
    expect(titleOf(note)).toBe('Multiplying and dividing');
  });

  it('is null when nothing matches, so the link goes to the lesson', () => {
    expect(skillSection(c, 'Zzzz qqqq.')).toBeNull();
  });

  it('every skill of every topic maps to a section or to none, never out of range', () => {
    for (const x of TOPIC_CONTENT) {
      const n = lessonSections(x.lesson).length;
      for (const g of x.generators) {
        const i = skillSection(x, g.skill);
        if (i !== null) expect(i, `${x.topicId}: ${g.skill}`).toBeLessThan(n);
      }
    }
  });
});

describe('lessons to revisit (Rule 9)', () => {
  const fr = contentFor('pre.fractions') as TopicContent;
  const sn = contentFor('pre.set-notation') as TopicContent;
  const ix = contentFor('pre.indices') as TopicContent;
  const h = [
    ...tries(fr.topicId, (fr.generators[0] as Generator).id, '00101'), // 40 percent: weak
    ...tries(fr.topicId, (fr.generators[1] as Generator).id, '11111'),
    ...tries(sn.topicId, (sn.generators[0] as Generator).id, '0000000'), // 0 percent over 7: weak
    ...tries(ix.topicId, (ix.generators[0] as Generator).id, '11011'), // 80 percent: fine
    ...tries('pre.sequences', 'any', '00'), // too few to read the topic
  ];

  it('reads only topics with enough answers', () => {
    expect(revisitCandidates(h)).toEqual([fr.topicId, ix.topicId, sn.topicId].sort());
  });

  it('lists topics with a weak skill, with accuracy and attempts', () => {
    const rows = revisitRows(h, [fr, sn, ix]);
    expect(rows.map((r) => r.topicId)).toEqual([fr.topicId, sn.topicId]);
    expect(rows[0]).toMatchObject({ accuracy: { right: 7, attempts: 10 }, weak: [{ skill: fr.generators[0]?.skill, right: 2, attempts: 5 }] });
    expect(rows[1]).toMatchObject({ accuracy: { right: 0, attempts: 7 }, weak: [{ skill: sn.generators[0]?.skill, right: 0, attempts: 7 }] });
  });

  it('sorts by accuracy, by attempts, or in book order', () => {
    const rows = revisitRows(h, [fr, sn, ix]);
    expect(sortRevisit(rows, 'accuracy').map((r) => r.topicId)).toEqual([sn.topicId, fr.topicId]);
    expect(sortRevisit(rows, 'attempts').map((r) => r.topicId)).toEqual([fr.topicId, sn.topicId]);
    const rank = (id: string): number => (id === sn.topicId ? 0 : 1);
    expect(sortRevisit(rows, 'order', rank).map((r) => r.topicId)).toEqual([sn.topicId, fr.topicId]);
    expect(sortRevisit(rows, 'order', () => 0).map((r) => r.topicId)).toEqual([fr.topicId, sn.topicId].sort());
  });
});

describe('more practice counts toward nothing', () => {
  it('a drill changes no memory, no session, no lesson result; only the history', () => {
    const c = contentFor('pre.fractions') as TopicContent;
    let p = ensureSession(startLearner(T0, DEFAULT_COURSES, 60), T0);
    p = completeLesson(p, c.topicId, true, T0, null, 10);
    const before = p;
    for (let k = 0; k < 6; k++) {
      p = recordDrill(p, c.topicId, false, { id: drillItemId(c.topicId, (c.generators[0] as Generator).id), hints: 0 }, T0 + DAY_MS + k);
    }
    expect(p.memory).toEqual(before.memory);
    expect(p.session).toEqual(before.session);
    expect(p.learnedSinceQuiz).toEqual(before.learnedSinceQuiz);
    expect(p.history.slice(0, before.history.length)).toEqual(before.history);
    expect(p.history.slice(before.history.length).every((e) => e.kind === 'drill')).toBe(true);
    // But its first answers feed the signal.
    expect(weakSkills(c, p.history).map((s) => s.skill)).toEqual([c.generators[0]?.skill]);
  });
});
