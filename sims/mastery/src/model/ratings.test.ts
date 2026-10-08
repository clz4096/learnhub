import { describe, expect, it } from 'vitest';
import { gateOf } from '@learnhub/content';
import {
  gateKey, mergeProgress, newProgress, type HistoryEntry, type MemoryState, type Progress, type SupervisionAttempt,
} from '@learnhub/mastery';
import { ALL_TOPICS } from './courses';
import {
  DOMAIN_IDS, DRILL_CAP, RATING_AREAS, RATING_IDS, RATING_MAX, RATING_MIN, STRONG_INTERVAL_DAYS, TIMED_BEST, TIMED_PAR,
  bestMean, overall, ratingInputs, ratingValues, ratings, strengthOf, type DomainEvidence, type DomainId, type RatingInputs, type TimedResult,
} from './ratings';

const T0 = Date.UTC(2026, 9, 5, 14, 0);

const strong = (intervalDays = STRONG_INTERVAL_DAYS * 2): MemoryState => ({ reps: 6, intervalDays, due: T0, lastReviewed: T0, lapses: 0, implicitCredit: 0 });
const doc = (over: Partial<Progress> = {}): Progress => ({ ...newProgress('learner', T0), ...over });
const byId = (p: Progress, timed: readonly TimedResult[] = []): Record<string, number> =>
  Object.fromEntries(ratings(ratingInputs(p, ALL_TOPICS, gateOf, timed)).map((r) => [r.id, r.value]));

/** Every topic learned at full strength, as drills and gym alone could do it. */
const drilledAll = (): Progress => doc({ memory: Object.fromEntries(ALL_TOPICS.map((t) => [t.id, strong()])) });

/** A topic in the domain with a gate problem, and that problem's key. */
function gated(d: DomainId): { topic: string; key: string } {
  const t = ALL_TOPICS.find((x) => RATING_AREAS[d].includes(x.area) && gateOf(x.id).length > 0);
  if (t === undefined) throw new Error(`no gate problem written in ${d}`);
  return { topic: t.id, key: gateKey(t.id, gateOf(t.id)[0] as string) };
}

const answer = (key: string, topicId: string, at: number, correct: boolean, hints = 0, kind: HistoryEntry['kind'] = 'cambridge', solution = false): HistoryEntry =>
  ({ at, kind, topicId, correct, item: { id: key, hints, attempt: 1, ...(solution ? { solution: true as const } : {}) } });

function supervised(key: string, mark: number, nonce: string, at = T0): SupervisionAttempt {
  return { problem: key, nonce, writeUp: 'x', copiedAt: at, importedAt: at, result: { mark, weakPoints: ['a', 'b', 'c'], redo: [], summary: 's' } };
}

describe('the rating areas', () => {
  it('put every area of the graph in exactly one domain', () => {
    const areas = new Set(ALL_TOPICS.map((t) => t.area));
    for (const a of areas) expect(DOMAIN_IDS.filter((d) => RATING_AREAS[d].includes(a)), a).toHaveLength(1);
    for (const d of DOMAIN_IDS) for (const a of RATING_AREAS[d]) expect(areas.has(a), a).toBe(true);
  });
});

describe('ratings', () => {
  it('start every attribute and the overall at 40, capped', () => {
    const rs = ratings(ratingInputs(doc(), ALL_TOPICS, gateOf, []));
    expect(rs.map((r) => r.id)).toEqual(RATING_IDS);
    expect(rs.map((r) => r.label)).toEqual(['Analysis', 'Algebra', 'Probability', 'Proof', 'Programming', 'Exam Temperament']);
    expect(rs.every((r) => r.value === RATING_MIN && r.capped)).toBe(true);
    expect(overall(rs)).toBe(RATING_MIN);
  });

  it('drills and gym alone stop at the cap, however strong the memory and however many answers', () => {
    const p = drilledAll();
    const g = gated('proof');
    // Gym and drill entries on the gate problem, and a right answer after the solution was shown: none meets the gate.
    const history = [
      answer(g.key, g.topic, T0, true, 0, 'gym'),
      answer(g.key, g.topic, T0 + 1, true, 0, 'drill'),
      answer(g.key, g.topic, T0 + 2, false, 0, 'cambridge', true),
      answer(g.key, g.topic, T0 + 3, true, 1),
    ];
    const r = byId({ ...p, history });
    for (const d of DOMAIN_IDS) expect(r[d], d).toBe(DRILL_CAP);
    expect(r.temperament).toBe(RATING_MIN);
    expect(ratings(ratingInputs({ ...p, history }, ALL_TOPICS, gateOf, [])).filter((x) => x.capped)).toHaveLength(6);
  });

  it('gated mastery lifts a rating past the cap, and only its own domain', () => {
    const p = drilledAll();
    const g = gated('proof');
    const r = byId({ ...p, history: [answer(g.key, g.topic, T0, true)] });
    expect(r.proof).toBeGreaterThan(DRILL_CAP);
    for (const d of DOMAIN_IDS.filter((x) => x !== 'proof')) expect(r[d], d).toBe(DRILL_CAP);
  });

  it('a right answer after the solution was shown does not lift the rating; one after a miss and hints does', () => {
    const p = drilledAll();
    const g = gated('proof');
    const shown = byId({ ...p, history: [answer(g.key, g.topic, T0, false, 0, 'cambridge', true), answer(g.key, g.topic, T0 + 1, true)] });
    expect(shown.proof).toBe(DRILL_CAP);
    const hinted = byId({ ...p, history: [answer(g.key, g.topic, T0, false), answer(g.key, g.topic, T0 + 1, true, 2)] });
    expect(hinted.proof).toBeGreaterThan(DRILL_CAP);
  });

  it('passed supervisions count; a failed one does not', () => {
    const p = drilledAll();
    const g = gated('algebra');
    expect(byId({ ...p, supervision: [supervised(g.key, 13, 'AAAAAAAA')] }).algebra).toBe(DRILL_CAP);
    expect(byId({ ...p, supervision: [supervised(g.key, 20, 'AAAAAAAA')] }).algebra).toBeGreaterThan(DRILL_CAP);
  });

  it('read memory strength from the interval, not the clock', () => {
    expect(strengthOf(undefined)).toBe(0);
    expect(strengthOf(strong(STRONG_INTERVAL_DAYS / 2))).toBe(0.5);
    expect(strengthOf(strong(STRONG_INTERVAL_DAYS * 5))).toBe(1);
    // A weak memory gives less than a strong one.
    const weak = doc({ memory: Object.fromEntries(ALL_TOPICS.map((t) => [t.id, strong(1)])) });
    expect(byId(weak).analysis as number).toBeLessThan(byId(drilledAll()).analysis as number);
  });

  it('reach 99 with every topic mastered and strong, three full supervisions, and six timed papers at par', () => {
    const full = (topics: number): DomainEvidence => ({ topics, practice: Array(topics).fill(1), mastered: Array(topics).fill(1), supervision: [20, 20, 20] });
    const inp: RatingInputs = {
      domains: { analysis: full(5), algebra: full(5), probability: full(5), proof: full(5), programming: full(5) },
      timed: Array.from({ length: TIMED_BEST }, () => ({ mark: 14, max: 20 })),
    };
    const rs = ratings(inp);
    expect(rs.every((r) => r.value === RATING_MAX)).toBe(true);
    expect(ratingValues(rs).overall).toBe(RATING_MAX);
  });
});

describe('Exam Temperament', () => {
  it('reads only timed papers: the mean of the best six, at par in full', () => {
    expect(TIMED_PAR).toBe(0.7);
    const t = (mark: number, max = 20): TimedResult => ({ mark, max });
    expect(byId(doc(), []).temperament).toBe(40);
    // One paper at par: one sixth of the way.
    expect(byId(doc(), [t(14)]).temperament).toBe(Math.round(40 + 59 / 6));
    // Above par counts as par; a paper with no marks counts nothing.
    expect(byId(doc(), [t(20)]).temperament).toBe(byId(doc(), [t(14)]).temperament);
    expect(byId(doc(), [t(0, 0)]).temperament).toBe(40);
    expect(byId(doc(), Array(6).fill(t(14))).temperament).toBe(99);
    // Drills never move it.
    expect(byId(drilledAll()).temperament).toBe(40);
  });
});

// ---------------------------------------------------------------- the invariants

/** A small deterministic generator, so a failure reproduces. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function randomInputs(r: () => number): RatingInputs {
  const domain = (): DomainEvidence => {
    const topics = 1 + Math.floor(r() * 12);
    const practice = Array.from({ length: Math.floor(r() * (topics + 1)) }, () => r());
    const mastered = practice.filter(() => r() < 0.5);
    const supervision = Array.from({ length: Math.floor(r() * 4) }, () => 14 + Math.floor(r() * 7));
    return { topics, practice, mastered, supervision };
  };
  return {
    domains: { analysis: domain(), algebra: domain(), probability: domain(), proof: domain(), programming: domain() },
    timed: Array.from({ length: Math.floor(r() * 8) }, () => ({ mark: Math.floor(r() * 21), max: 20 })),
  };
}

const values = (inp: RatingInputs): number[] => ratings(inp).map((x) => x.value);

describe('invariants', () => {
  it('are monotonic in evidence: one more mastered topic, supervision, or timed paper never lowers a rating', () => {
    const r = lcg(7);
    for (let i = 0; i < 400; i++) {
      const inp = randomInputs(r);
      const before = values(inp);
      const d = DOMAIN_IDS[Math.floor(r() * DOMAIN_IDS.length)] as DomainId;
      const e = inp.domains[d];
      const more: RatingInputs[] = [
        { ...inp, timed: [...inp.timed, { mark: Math.floor(r() * 21), max: 20 }] },
        { ...inp, domains: { ...inp.domains, [d]: { ...e, supervision: [...e.supervision, 14 + Math.floor(r() * 7)] } } },
      ];
      // A learned topic not yet mastered meets its gate.
      if (e.mastered.length < e.practice.length) {
        more.push({ ...inp, domains: { ...inp.domains, [d]: { ...e, mastered: [...e.mastered, e.practice[e.mastered.length] as number] } } });
      }
      for (const m of more) values(m).forEach((v, k) => expect(v).toBeGreaterThanOrEqual(before[k] as number));
      expect(overall(ratings(more[0] as RatingInputs))).toBeGreaterThanOrEqual(overall(ratings(inp)));
    }
  });

  it('never pass the cap without gated or timed evidence, whatever the drills', () => {
    const r = lcg(11);
    for (let i = 0; i < 200; i++) {
      const inp = randomInputs(r);
      const drillsOnly: RatingInputs = {
        timed: [],
        domains: Object.fromEntries(DOMAIN_IDS.map((d) => [d, { ...inp.domains[d], mastered: [], supervision: [] }])) as unknown as RatingInputs['domains'],
      };
      for (const x of ratings(drillsOnly)) expect(x.value).toBeLessThanOrEqual(x.id === 'temperament' ? RATING_MIN : DRILL_CAP);
    }
  });

  it('are deterministic and do not depend on the order of the evidence', () => {
    const r = lcg(3);
    for (let i = 0; i < 100; i++) {
      const inp = randomInputs(r);
      const shuffled: RatingInputs = {
        timed: [...inp.timed].reverse(),
        domains: Object.fromEntries(DOMAIN_IDS.map((d) => {
          const e = inp.domains[d];
          return [d, { ...e, practice: [...e.practice].reverse(), mastered: [...e.mastered].reverse(), supervision: [...e.supervision].reverse() }];
        })) as RatingInputs['domains'],
      };
      expect(ratings(shuffled)).toEqual(ratings(inp));
      expect(ratings(inp)).toEqual(ratings(inp));
    }
    expect(bestMean([3, 1, 2], 2)).toBe(2.5);
    expect(bestMean([1], 3)).toBeCloseTo(1 / 3);
  });

  it('are merge-safe: derived, so both merge orders agree, and two devices\' separate work adds up', () => {
    const pr = gated('proof');
    const al = gated('algebra');
    const base = drilledAll();
    const mac = { ...base, history: [answer(pr.key, pr.topic, T0 + 10, true)] };
    const phone = { ...base, supervision: [supervised(al.key, 18, 'BBBBBBBB', T0 + 20)] };
    const ab = byId(mergeProgress(mac, phone));
    const ba = byId(mergeProgress(phone, mac));
    expect(ab).toEqual(ba);
    for (const id of RATING_IDS) {
      expect(ab[id]).toBeGreaterThanOrEqual(byId(mac)[id] as number);
      expect(ab[id]).toBeGreaterThanOrEqual(byId(phone)[id] as number);
    }
    expect(ab.proof).toBe(byId(mac).proof);
    expect(ab.algebra).toBe(byId(phone).algebra);
    // Merging a document with itself changes nothing.
    expect(byId(mergeProgress(mac, mac))).toEqual(byId(mac));
  });
});
