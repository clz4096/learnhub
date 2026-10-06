import { describe, expect, it } from 'vitest';
import { GATE_PASS_MARK, gateEvidence, gateKey, gateStatus, isMastered, needsGate } from './gate';
import { DAY_MS, newMemory } from './memory';
import { mergeProgress } from './merge';
import { newProgress, type HistoryEntry, type Progress, type SupervisionAttempt } from './progress';

const NOW = Date.UTC(2026, 9, 5, 9);
const T = 'prob.bayes-formula';
const GATE = ['q4-ii', 'q7'] as const;

function learned(): Progress {
  const p = newProgress('mastery', NOW);
  p.memory = { [T]: newMemory(NOW), 'pre.fractions': newMemory(NOW) };
  return p;
}

const cam = (at: number, problem: string, correct: boolean, hints = 0): HistoryEntry => ({
  at, kind: 'cambridge', topicId: T, correct, item: { id: gateKey(T, problem), hints, attempt: 1 },
});

function supervised(problem: string, mark: number, at: number, nonce = 'ABCDEFGH'): SupervisionAttempt {
  return {
    problem: gateKey(T, problem), nonce, writeUp: 'w', copiedAt: at - 1000,
    result: { mark, weakPoints: ['a', 'b', 'c'], redo: [], summary: 's' }, importedAt: at,
  };
}

describe('the Cambridge gate', () => {
  it('drills alone are not mastery: a learned topic needs the gate', () => {
    expect(gateStatus(learned(), T, GATE)).toEqual({ stage: 'needs-gate', evidence: null, candidates: 2 });
    expect(gateStatus(learned(), 'pre.indices', GATE).stage).toBe('unlearned');
  });

  it('a gate problem solved unaided, first time, meets it', () => {
    const p = { ...learned(), history: [cam(NOW + 1, 'q7', true)] };
    expect(gateStatus(p, T, GATE)).toEqual({ stage: 'mastered', evidence: { kind: 'auto', problem: `${T}/q7`, at: NOW + 1 }, candidates: 2 });
    expect(isMastered(p, T, GATE)).toBe(true);
  });

  it('a right answer after a miss is not unaided: the miss showed the solution', () => {
    const p = { ...learned(), history: [cam(NOW + 1, 'q7', false), cam(NOW + 2, 'q7', true)] };
    expect(gateEvidence(p, T, GATE)).toBeNull();
    // Another gate problem, first time, still can.
    p.history.push(cam(NOW + 3, 'q4-ii', true));
    expect(gateEvidence(p, T, GATE)).toEqual({ kind: 'auto', problem: `${T}/q4-ii`, at: NOW + 3 });
  });

  it('a right answer with a hint is not unaided', () => {
    expect(gateEvidence({ ...learned(), history: [cam(NOW, 'q7', true, 1)] }, T, GATE)).toBeNull();
  });

  it('a miss and a right answer at the same millisecond count as the miss first', () => {
    expect(gateEvidence({ ...learned(), history: [cam(NOW, 'q7', true), cam(NOW, 'q7', false)] }, T, GATE)).toBeNull();
    expect(gateEvidence({ ...learned(), history: [cam(NOW, 'q7', false), cam(NOW, 'q7', true)] }, T, GATE)).toBeNull();
  });

  it('only gate problems of this topic count', () => {
    const other: HistoryEntry = { ...cam(NOW, 'q7', true), item: { id: gateKey('pre.fractions', 'q7'), hints: 0, attempt: 1 } };
    const p = { ...learned(), history: [cam(NOW, 'q9', true), other] };
    expect(gateEvidence(p, T, GATE)).toBeNull();
    expect(gateEvidence(p, 'pre.fractions', ['q7'])?.problem).toBe('pre.fractions/q7');
  });

  it('gym work, drills, reviews, and lessons never meet it, whatever their item says', () => {
    const p = learned();
    for (const kind of ['gym', 'drill', 'review', 'quiz', 'lesson'] as const) p.history.push({ ...cam(NOW, 'q7', true), kind });
    expect(gateEvidence(p, T, GATE)).toBeNull();
  });

  it(`a supervised write-up of a gate problem meets it at ${GATE_PASS_MARK} of 20, not below`, () => {
    const p = { ...learned(), supervision: [supervised('q4-ii', GATE_PASS_MARK - 1, NOW + 5)] };
    expect(gateEvidence(p, T, GATE)).toBeNull();
    p.supervision.push(supervised('q4-ii', GATE_PASS_MARK, NOW + 9, 'JKMNPQRS'));
    expect(gateEvidence(p, T, GATE)).toEqual({ kind: 'supervision', problem: `${T}/q4-ii`, at: NOW + 9, mark: GATE_PASS_MARK });
    // A write-up of a problem that is not a gate problem does not.
    expect(gateEvidence({ ...learned(), supervision: [supervised('q9', 20, NOW)] }, T, GATE)).toBeNull();
    // An unanswered copy does not.
    expect(gateEvidence({ ...learned(), supervision: [{ ...supervised('q7', 20, NOW), result: null, importedAt: null }] }, T, GATE)).toBeNull();
  });

  it('reports the earliest evidence', () => {
    const p = { ...learned(), history: [cam(NOW + 50, 'q7', true)], supervision: [supervised('q4-ii', 18, NOW + 10)] };
    expect(gateEvidence(p, T, GATE)?.kind).toBe('supervision');
  });

  it('a topic with no gate problem cannot meet it, and says so', () => {
    const p = { ...learned(), history: [cam(NOW, 'q7', true)] };
    expect(gateStatus(p, T, [])).toEqual({ stage: 'needs-gate', evidence: null, candidates: 0 });
  });

  it('evidence before the drills are passed is kept: the topic is mastered once they are', () => {
    const p = { ...newProgress('mastery', NOW), history: [cam(NOW, 'q7', true)] };
    expect(gateStatus(p, T, GATE).stage).toBe('unlearned');
    expect(gateStatus({ ...p, memory: { [T]: newMemory(NOW + DAY_MS) } }, T, GATE).stage).toBe('mastered');
  });

  it('lists learned topics still waiting for the gate', () => {
    const p = { ...learned(), history: [cam(NOW, 'q7', true)] };
    expect(needsGate(p, (id) => (id === T ? GATE : []))).toEqual(['pre.fractions']);
  });

  it('merge: the result is the same in either order, and a miss on another device makes a later right answer aided', () => {
    const mac = { ...learned(), history: [cam(NOW + 2, 'q7', true)] };
    const phone = { ...learned(), history: [cam(NOW + 1, 'q7', false)] };
    const ab = mergeProgress(mac, phone);
    const ba = mergeProgress(phone, mac);
    expect(gateStatus(ab, T, GATE)).toEqual(gateStatus(ba, T, GATE));
    expect(gateStatus(ab, T, GATE).stage).toBe('needs-gate');
    // Idempotent: merging again changes nothing.
    expect(gateStatus(mergeProgress(ab, ab), T, GATE)).toEqual(gateStatus(ab, T, GATE));
  });
});
