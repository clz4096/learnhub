/**
 * The proof gate audit (2026-10-08): GAP results, what a result counts against, redos that wait
 * for a prerequisite, "Recommended next", and the migration that takes out lapses that no
 * longer count (Albert's 12 of 20 on the fractions unit-fraction proof).
 */
import { describe, expect, it } from 'vitest';
import { CONTENT_IDS, FIRST_PROOF_TOPIC, gateOf } from '@learnhub/content';
import {
  DAY_MS, exportProgress, importProgress, mergeProgress, recordReview, sameMemoryState, type Progress, type SupervisionResult,
} from '@learnhub/mastery';
import {
  DEFAULT_COURSES, completeLesson, completeReview, effectiveGap, importSupervisionResult, isMastered, lapseExcluded, openRedos,
  proofLessonReached, recommendedNext, recordCambridgeAnswer, recordSupervisionCopy, redoWaitsFor, startLearner, waitingRedos,
  withoutStaleLapses,
} from '@/model/learner';
import { ALL_TOPICS } from '@/model/courses';
import { contentStore } from '@/model/content';
import { dayItems } from '@/model/dayQueue';
import { buildPacket, formatResult, parseResult, PROOF_CHECKLIST, PROOF_RULE, type ParsedResult } from '@/model/supervision';
import { importSummary } from '@/ui/Supervision';

await Promise.all(CONTENT_IDS.map((id) => contentStore.load(id)));

const T0 = new Date(2026, 9, 1, 9, 0).getTime();
const UNIT = 'pre.fractions/step00-q1-unit';
const VALUE = 'pre.fractions/a6-q1-i-value';
const GATE_PROOF = 'prob.event-spaces/q4-a-finite';
const NONCE = 'K7Q2XMPA';
const WEAK = ['Treated two examples as a proof.', 'Missed that the two fractions must be distinct.', 'Never stated the conclusion.'];

const res = (over: Partial<SupervisionResult> = {}): SupervisionResult => ({ mark: 12, weakPoints: [...WEAK], redo: [UNIT], summary: 'Right algebra, no proof.', ...over });
const parsedFor = (problem: string, over: Partial<SupervisionResult> = {}, nonce = NONCE): ParsedResult => ({ problem, nonce, result: res(over) });
const copy = (p: Progress, key: string, at: number, nonce = NONCE): Progress => recordSupervisionCopy(p, key, 'my proof', at, () => nonce).progress;

/** Fractions learned on day 0 and reviewed on day 1: a schedule a lapse would shorten. */
function learned(): Progress {
  let p = startLearner(T0, DEFAULT_COURSES, 60);
  p = completeLesson(p, 'pre.fractions', true, T0, null, 20);
  return completeReview(p, 'pre.fractions', true, T0 + DAY_MS, null);
}

describe('the audit in the catalog', () => {
  it('the unit-fraction proof is practice, and fractions keeps an auto-checked gate', () => {
    expect(gateOf('pre.fractions')).toEqual(['a6-q1-i-value']);
    expect(FIRST_PROOF_TOPIC).toBe('proof.direct');
  });
});

describe('what a supervision result counts against', () => {
  it('a miss on a gate problem counts; on further practice, or with a GAP, it does not; a pass always counts', () => {
    expect(lapseExcluded(GATE_PROOF, res())).toBe(false);
    expect(lapseExcluded(UNIT, res())).toBe(true);
    expect(lapseExcluded(GATE_PROOF, res({ gap: FIRST_PROOF_TOPIC }))).toBe(true);
    expect(lapseExcluded(UNIT, res({ mark: 14 }))).toBe(false);
  });

  it('a GAP applies only below the pass mark, to a topic not mastered, other than the problem\'s own', () => {
    const p = learned();
    expect(effectiveGap(p, UNIT, res({ gap: FIRST_PROOF_TOPIC }))).toBe(FIRST_PROOF_TOPIC);
    expect(effectiveGap(p, UNIT, res({ mark: 15, gap: FIRST_PROOF_TOPIC }))).toBeUndefined();
    expect(effectiveGap(p, UNIT, res({ gap: 'pre.fractions' }))).toBeUndefined();
    // Fractions mastered: its gate solved unaided.
    const m = recordCambridgeAnswer(p, VALUE, true, { hints: 0 }, T0 + 2 * DAY_MS);
    expect(isMastered(m, 'pre.fractions')).toBe(true);
    expect(effectiveGap(m, 'pre.indices/nst-a1', res({ gap: 'pre.fractions' }))).toBeUndefined();
  });
});

describe('importing a result with a GAP', () => {
  const AT = T0 + 3 * DAY_MS;
  const imported = (over: Partial<SupervisionResult> = {}, key = GATE_PROOF): Progress => {
    let p = learned();
    p = { ...p, memory: { ...p.memory, 'prob.event-spaces': { ...p.memory['pre.fractions']! } } };
    return importSupervisionResult(copy(p, key, AT - 1000), parsedFor(key, { redo: [key], ...over }), AT);
  };

  it('does not count against the topic, keeps the GAP, and logs the miss', () => {
    const before = imported({ mark: 20 }).memory;
    const p = imported({ gap: FIRST_PROOF_TOPIC });
    expect(p.memory['prob.event-spaces']).toEqual(learned().memory['pre.fractions']);
    expect(p.memory['prob.event-spaces']).not.toEqual(before['prob.event-spaces']);
    expect(p.supervision[0]?.result?.gap).toBe(FIRST_PROOF_TOPIC);
    expect(p.history.at(-1)).toEqual({ at: AT, kind: 'supervision', topicId: 'prob.event-spaces', correct: false });
    const back = importProgress(exportProgress(p));
    expect(back.ok && back.value).toEqual(p);
  });

  it('without a GAP, the same miss on a gate problem is a lapse', () => {
    const p = imported();
    expect(p.memory['prob.event-spaces']?.lapses).toBe(1);
    expect(p.supervision[0]?.result?.gap).toBeUndefined();
  });

  it('holds back the redo of that problem until the GAP topic is mastered, and recommends that topic', () => {
    const p = imported({ gap: FIRST_PROOF_TOPIC });
    expect(openRedos(p)).toEqual([]);
    expect(waitingRedos(p).map((d) => d.problem)).toEqual([GATE_PROOF]);
    expect(redoWaitsFor(p, p.redos[0]!)).toBe(FIRST_PROOF_TOPIC);
    expect(dayItems(p, AT + 2 * DAY_MS).filter((x) => x.kind === 'redo')).toEqual([]);
    expect(recommendedNext(p)).toEqual([FIRST_PROOF_TOPIC]);
    expect(recommendedNext(p, 'prob.event-spaces')).toEqual([FIRST_PROOF_TOPIC]);
    expect(recommendedNext(p, 'pre.fractions')).toEqual([]);
    // Mastering the gap topic (learned, and its gate met) releases the redo and the recommendation.
    let m = completeLesson(p, FIRST_PROOF_TOPIC, true, AT + DAY_MS, null, 20);
    const g = `${FIRST_PROOF_TOPIC}/${gateOf(FIRST_PROOF_TOPIC)[0] as string}`;
    m = copy(m, g, AT + DAY_MS + 1, 'ABCDEFGH');
    m = importSupervisionResult(m, parsedFor(g, { mark: 16, redo: [] }, 'ABCDEFGH'), AT + DAY_MS + 2);
    expect(isMastered(m, FIRST_PROOF_TOPIC)).toBe(true);
    expect(openRedos(m).map((d) => d.problem)).toEqual([GATE_PROOF]);
    expect(waitingRedos(m)).toEqual([]);
    expect(recommendedNext(m)).toEqual([]);
  });

  it('a GAP naming a mastered topic is dropped: the miss counts as usual', () => {
    let p = learned();
    p = recordCambridgeAnswer(p, VALUE, true, { hints: 0 }, T0 + 2 * DAY_MS);
    p = { ...p, memory: { ...p.memory, 'prob.event-spaces': { ...p.memory['pre.fractions']! } } };
    p = importSupervisionResult(copy(p, GATE_PROOF, AT - 1000), parsedFor(GATE_PROOF, { gap: 'pre.fractions' }), AT);
    expect(p.supervision[0]?.result?.gap).toBeUndefined();
    expect(p.memory['prob.event-spaces']?.lapses).toBe(1);
  });

  it('says what it did in plain words', () => {
    const p = learned();
    const withGap = importSummary(p, UNIT, res({ gap: FIRST_PROOF_TOPIC }));
    expect(withGap).toMatch(/earlier skill, Direct proof, so it does not count against Fractions and ratios\. Recommended next: Direct proof\./);
    expect(withGap).toMatch(/Its redo waits until Direct proof is mastered\./);
    expect(importSummary(p, UNIT, res())).toMatch(/further practice, not a gate problem, so it does not count against Fractions and ratios/);
    expect(withGap).not.toMatch(/[–—]/);
  });
});

describe('the GAP line', () => {
  const block = (gap: string | null, mark = 12, problem = UNIT): string => {
    const text = formatResult(parsedFor(problem, { mark }));
    return gap === null ? text.replace(/^GAP: .*\n/m, '') : text.replace(/^GAP: .*$/m, `GAP: ${gap}`);
  };
  const ok = (text: string): ParsedResult => {
    const r = parseResult(text);
    if (!r.ok) throw new Error(r.error);
    return r.value;
  };
  const err = (text: string): string => {
    const r = parseResult(text);
    return r.ok ? '' : r.error;
  };

  it('reads a topic id or none, and a block without the line (copied before GAP)', () => {
    expect(ok(block(FIRST_PROOF_TOPIC)).result.gap).toBe(FIRST_PROOF_TOPIC);
    expect(ok(block('none')).result.gap).toBeUndefined();
    expect(ok(block('None.')).result.gap).toBeUndefined();
    expect(ok(block(null)).result.gap).toBeUndefined();
  });

  it('round-trips a result with a GAP', () => {
    const r = parsedFor(UNIT, { gap: FIRST_PROOF_TOPIC });
    expect(ok(formatResult(r))).toEqual(r);
  });

  it('rejects an unknown topic, the problem\'s own topic, a GAP with a pass, and the template, plainly', () => {
    expect(err(block('Writing proofs'))).toMatch(/GAP names "Writing proofs", which is not a topic in this app/);
    expect(err(block('pre.fractions'))).toMatch(/GAP names the problem's own topic/);
    expect(err(block(FIRST_PROOF_TOPIC, 15))).toMatch(/GAP is only for a mark below 14\. With 15\/20, write GAP: none/);
    expect(err(block('<one topic id>'))).toMatch(/GAP is empty/);
    for (const e of [err(block('x.y')), err(block('pre.fractions'))]) expect(e).not.toMatch(/[–—]/);
  });
});

describe('the copied block for a proof', () => {
  it('lists what a proof needs, the proof marking rule, and the gap list with the first proof lesson', () => {
    const p = copy(learned(), UNIT, T0 + DAY_MS);
    const text = buildPacket({ key: UNIT, nonce: NONCE, writeUp: 'my proof', copiedAt: T0 + DAY_MS, progress: p });
    expect(text).toContain('--- A PROOF NEEDS ---');
    for (const x of PROOF_CHECKLIST) expect(text).toContain(x);
    expect(text).toContain(PROOF_RULE);
    expect(text).toMatch(/--- GAP LIST \(earlier topics you may name on the GAP line\) ---\nproof\.direct: Direct proof\n/);
    expect(text).toMatch(/GAP: <one topic id from the gap list/);
    expect(text).not.toMatch(/[–—]/);
  });

  it('an auto-checked problem gets no proof checklist', () => {
    const p = copy(learned(), VALUE, T0 + DAY_MS);
    const text = buildPacket({ key: VALUE, nonce: NONCE, writeUp: '', copiedAt: T0 + DAY_MS, progress: p, checked: { given: '3' } });
    expect(text).not.toContain('--- A PROOF NEEDS ---');
    expect(text).toContain('--- GAP LIST');
  });

  it('links the first proof lesson once reached, else says it comes later', () => {
    const p = learned();
    expect(proofLessonReached(p, 'pre.fractions')).toBe(false);
    expect(proofLessonReached(p, 'proof.contradiction')).toBe(true);
    expect(proofLessonReached(completeLesson(p, FIRST_PROOF_TOPIC, true, T0 + 2 * DAY_MS, null, 20), 'pre.fractions')).toBe(true);
  });
});

describe('the migration: lapses that no longer count', () => {
  const AT = T0 + 3 * DAY_MS;
  /** What the build before the audit did on import: the 12 of 20 was a review missed, a lapse on fractions. */
  function oldImport(p: Progress, key = UNIT, at = AT): Progress {
    const c = copy(p, key, at - 1000);
    const topicId = key.slice(0, key.indexOf('/'));
    return {
      ...c,
      supervision: c.supervision.map((a) => (a.nonce === NONCE ? { ...a, result: res(), importedAt: at } : a)),
      memory: recordReview(c.memory, ALL_TOPICS, topicId, false, at).memory,
      history: [...c.history, { at, kind: 'supervision', topicId, correct: false }],
    };
  }
  /** The same learner had the result never counted: kept, logged, and the schedule untouched. */
  function never(p: Progress, key = UNIT, at = AT): Progress {
    const c = copy(p, key, at - 1000);
    const topicId = key.slice(0, key.indexOf('/'));
    return {
      ...c,
      supervision: c.supervision.map((a) => (a.nonce === NONCE ? { ...a, result: res(), importedAt: at } : a)),
      history: [...c.history, { at, kind: 'supervision', topicId, correct: false }],
    };
  }
  /** Later work on both: a lesson that credits fractions, and a review of fractions. */
  const later = (p: Progress): Progress => completeReview(completeLesson(p, 'pre.probability-scale', true, AT + DAY_MS, null, 20), 'pre.fractions', true, AT + 2 * DAY_MS, null);

  it('restores the schedule the 12 of 20 shortened, exactly as if it had never counted', () => {
    const base = learned();
    const albert = later(oldImport(base));
    const clean = later(never(base));
    expect(albert.memory['pre.fractions']?.lapses).toBe(1);
    const fixed = withoutStaleLapses(albert);
    expect(fixed).not.toBe(albert);
    expect(sameMemoryState(fixed.memory['pre.fractions']!, clean.memory['pre.fractions']!)).toBe(true);
    expect(fixed.memory['pre.fractions']?.lapses).toBe(0);
    expect(fixed.memory['pre.fractions']!.intervalDays).toBeGreaterThan(albert.memory['pre.fractions']!.intervalDays);
    expect(fixed.memory['pre.fractions']!.due).toBeGreaterThan(albert.memory['pre.fractions']!.due);
    // History, the result, and the redos are kept.
    expect(fixed.history).toBe(albert.history);
    expect(fixed.supervision).toBe(albert.supervision);
    expect(fixed.redos).toBe(albert.redos);
  });

  it('is idempotent, and leaves a document without such a lapse alone', () => {
    const albert = later(oldImport(learned()));
    const once = withoutStaleLapses(albert);
    expect(withoutStaleLapses(once)).toBe(once);
    const clean = later(never(learned()));
    expect(withoutStaleLapses(clean)).toBe(clean);
    const plain = learned();
    expect(withoutStaleLapses(plain)).toBe(plain);
  });

  it('keeps a lapse on a gate problem: it still counts', () => {
    let p = learned();
    p = { ...p, memory: { ...p.memory, 'prob.event-spaces': { ...p.memory['pre.fractions']! } } };
    const gated = oldImport(p, GATE_PROOF);
    expect(withoutStaleLapses(gated)).toBe(gated);
  });

  it('after the fix, new work is applied on top and the fix stays a fixed point', () => {
    const fixed = withoutStaleLapses(later(oldImport(learned())));
    const next = completeReview(fixed, 'pre.fractions', false, AT + 20 * DAY_MS, null);
    expect(withoutStaleLapses(next)).toBe(next);
  });

  it('when the stored schedule cannot be replayed exactly, it only lengthens it, never shortens, and is still idempotent', () => {
    const albert = later(oldImport(learned()));
    const s = albert.memory['pre.fractions']!;
    // Credit banked from a source the history cannot show (a placement of an earlier build, say).
    const odd: Progress = { ...albert, memory: { ...albert.memory, 'pre.fractions': { ...s, implicitCredit: (s.implicitCredit + 0.25) % 1 } } };
    const fixed = withoutStaleLapses(odd);
    const f = fixed.memory['pre.fractions']!;
    expect(f.due).toBeGreaterThanOrEqual(s.due);
    expect(f.intervalDays).toBeGreaterThanOrEqual(s.intervalDays);
    expect(f.lapses).toBe(0);
    expect(f.implicitCredit).toBe(odd.memory['pre.fractions']!.implicitCredit);
    expect(withoutStaleLapses(fixed)).toBe(fixed);
  });

  it('commutes with sync: merging a fixed copy and an unfixed one, then fixing, gives the same document either way', () => {
    const albert = later(oldImport(learned()));
    const fixed = withoutStaleLapses(albert);
    const ab = withoutStaleLapses(mergeProgress(fixed, albert));
    const ba = withoutStaleLapses(mergeProgress(albert, fixed));
    expect(exportProgress(ab)).toBe(exportProgress(ba));
    expect(sameMemoryState(ab.memory['pre.fractions']!, fixed.memory['pre.fractions']!)).toBe(true);
  });
});
