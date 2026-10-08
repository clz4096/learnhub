import { describe, expect, it } from 'vitest';
import { GATE_PASS_MARK, cambridgeEntries, gateEvidence, gateKey, gateStatus, isMastered, needsGate, solutionShown, unaidedAnswer } from './gate';
import { DAY_MS, newMemory } from './memory';
import { mergeProgress } from './merge';
import { exportProgress, importProgress, newProgress, nextAttempt, type HistoryEntry, type Progress, type SupervisionAttempt } from './progress';

const NOW = Date.UTC(2026, 9, 5, 9);
const T = 'prob.bayes-formula';
const GATE = ['q4-ii', 'q7'] as const;

function learned(): Progress {
  const p = newProgress('mastery', NOW);
  p.memory = { [T]: newMemory(NOW), 'pre.fractions': newMemory(NOW) };
  return p;
}

const cam = (at: number, problem: string, correct: boolean, hints = 0, solution = false): HistoryEntry => ({
  at, kind: 'cambridge', topicId: T, correct, item: { id: gateKey(T, problem), hints, attempt: 1, ...(solution ? { solution: true as const } : {}) },
});
/** "Show me the solution" on a problem: logged as a miss that showed it. */
const reveal = (at: number, problem: string): HistoryEntry => cam(at, problem, false, 0, true);

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
    expect(gateStatus(p, T, GATE)).toEqual({ stage: 'mastered', evidence: { kind: 'auto', problem: `${T}/q7`, at: NOW + 1, hints: 0 }, candidates: 2 });
    expect(isMastered(p, T, GATE)).toBe(true);
  });

  it('a right answer after a miss still counts: a miss shows a nudge, not the solution', () => {
    const p = { ...learned(), history: [cam(NOW + 1, 'q7', false), cam(NOW + 2, 'q7', false), cam(NOW + 3, 'q7', true)] };
    expect(gateEvidence(p, T, GATE)).toEqual({ kind: 'auto', problem: `${T}/q7`, at: NOW + 3, hints: 0 });
  });

  it('hints are allowed, and the evidence says how many were used', () => {
    expect(gateEvidence({ ...learned(), history: [cam(NOW, 'q7', false, 0), cam(NOW + 9, 'q7', true, 2)] }, T, GATE))
      .toEqual({ kind: 'auto', problem: `${T}/q7`, at: NOW + 9, hints: 2 });
  });

  it('once the solution is shown, the problem never counts; another gate problem still can', () => {
    const p = { ...learned(), history: [cam(NOW + 1, 'q7', false), reveal(NOW + 2, 'q7'), cam(NOW + 3, 'q7', true)] };
    expect(gateEvidence(p, T, GATE)).toBeNull();
    p.history.push(cam(NOW + 4, 'q4-ii', true, 1));
    expect(gateEvidence(p, T, GATE)).toEqual({ kind: 'auto', problem: `${T}/q4-ii`, at: NOW + 4, hints: 1 });
  });

  it('a right answer before the solution was shown keeps counting', () => {
    const p = { ...learned(), history: [cam(NOW + 1, 'q7', true), reveal(NOW + 2, 'q7')] };
    expect(gateEvidence(p, T, GATE)?.at).toBe(NOW + 1);
  });

  it('a reveal and a right answer at the same millisecond count as the reveal first', () => {
    expect(gateEvidence({ ...learned(), history: [cam(NOW, 'q7', true), reveal(NOW, 'q7')] }, T, GATE)).toBeNull();
    expect(gateEvidence({ ...learned(), history: [reveal(NOW, 'q7'), cam(NOW, 'q7', true)] }, T, GATE)).toBeNull();
  });

  it('unaidedAnswer: of right answers at one time, the one with fewer hints; none when the answer itself showed the solution', () => {
    expect(unaidedAnswer([cam(NOW, 'q7', true, 3), cam(NOW, 'q7', true, 1)])?.item?.hints).toBe(1);
    expect(unaidedAnswer([cam(NOW, 'q7', true, 0, true)])).toBeUndefined();
    expect(unaidedAnswer([cam(NOW, 'q7', false)])).toBeUndefined();
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

  it('merge: the result is the same in either order, and a solution shown on another device makes a later right answer aided', () => {
    const mac = { ...learned(), history: [cam(NOW + 2, 'q7', true)] };
    const phone = { ...learned(), history: [reveal(NOW + 1, 'q7')] };
    const ab = mergeProgress(mac, phone);
    const ba = mergeProgress(phone, mac);
    expect(gateStatus(ab, T, GATE)).toEqual(gateStatus(ba, T, GATE));
    expect(gateStatus(ab, T, GATE).stage).toBe('needs-gate');
    // Idempotent: merging again changes nothing.
    expect(gateStatus(mergeProgress(ab, ab), T, GATE)).toEqual(gateStatus(ab, T, GATE));
  });
});

describe('problems that moved topic: old keys read as the current one', () => {
  // A fixture map, as the content's MOVED_PROBLEMS: q9 was set in pre.fractions and now sits in T.
  const OLD = 'pre.fractions/q9';
  const NEW = gateKey(T, 'q9');
  const resolve = (key: string): string => (key === OLD ? NEW : key);
  const MOVED_GATE = [...GATE, 'q9'];
  const camOld = (at: number, correct: boolean, solution = false): HistoryEntry => ({
    at, kind: 'cambridge', topicId: 'pre.fractions', correct, item: { id: OLD, hints: 0, attempt: 1, ...(solution ? { solution: true as const } : {}) },
  });
  const supOld = (mark: number, at: number, nonce = 'MNPQRSTV'): SupervisionAttempt => ({
    problem: OLD, nonce, writeUp: 'w', copiedAt: at - 1000, result: { mark, weakPoints: ['a', 'b', 'c'], redo: [], summary: 's' }, importedAt: at,
  });

  it('a supervision result stored under the old key meets the gate where the problem is now, reported by its current key', () => {
    const p = { ...learned(), supervision: [supOld(GATE_PASS_MARK, NOW + 5)] };
    expect(gateStatus(p, T, MOVED_GATE, resolve)).toEqual({
      stage: 'mastered', evidence: { kind: 'supervision', problem: NEW, at: NOW + 5, mark: GATE_PASS_MARK }, candidates: 3,
    });
    // Without the map the old key names no gate problem of T; nor does it count for the old topic.
    expect(gateStatus(p, T, MOVED_GATE).stage).toBe('needs-gate');
    expect(gateEvidence(p, 'pre.fractions', ['a6-q1'], resolve)).toBeNull();
    expect(needsGate(p, (id) => (id === T ? MOVED_GATE : ['a6-q1']), resolve)).toEqual(['pre.fractions']);
  });

  it('a result below the pass mark under the old key is not evidence', () => {
    const p = { ...learned(), supervision: [supOld(12, NOW + 5)] };
    expect(gateStatus(p, T, MOVED_GATE, resolve)).toEqual({ stage: 'needs-gate', evidence: null, candidates: 3 });
  });

  it('answers under both keys are one problem: an old-key right answer counts, an old-key reveal stops a later right answer', () => {
    const solved = { ...learned(), history: [camOld(NOW + 1, true)] };
    expect(gateEvidence(solved, T, MOVED_GATE, resolve)).toEqual({ kind: 'auto', problem: NEW, at: NOW + 1, hints: 0 });
    const revealed = { ...learned(), history: [camOld(NOW + 1, false, true), cam(NOW + 2, 'q9', true)] };
    expect(cambridgeEntries(revealed.history, NEW, resolve)).toHaveLength(2);
    expect(cambridgeEntries(revealed.history, OLD, resolve)).toHaveLength(2);
    expect(cambridgeEntries(revealed.history, NEW)).toHaveLength(1);
    expect(solutionShown(cambridgeEntries(revealed.history, NEW, resolve))).toBe(true);
    expect(unaidedAnswer(cambridgeEntries(revealed.history, NEW, resolve))).toBeUndefined();
    expect(isMastered(revealed, T, MOVED_GATE, resolve)).toBe(false);
    // Read without the map, the reveal is on another problem and the answer would wrongly count.
    expect(isMastered(revealed, T, MOVED_GATE)).toBe(true);
  });

  it('the version 6 rule holds for a version 5 miss under an old key: it showed the solution, so the problem never counts', () => {
    const d = JSON.parse(exportProgress(learned()));
    d.version = 5;
    d.history = [camOld(NOW + 1, false), cam(NOW + 2, 'q9', true)];
    const r = importProgress(d);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.history[0]?.item?.solution).toBe(true);
    // The stored key is kept as it was; only the read resolves it.
    expect(r.value.history[0]?.item?.id).toBe(OLD);
    expect(gateStatus(r.value, T, MOVED_GATE, resolve)).toEqual({ stage: 'needs-gate', evidence: null, candidates: 3 });
  });

  it('attempt numbers count answers under the old key', () => {
    const h = [camOld(NOW + 1, false), cam(NOW + 2, 'q9', false)];
    expect(nextAttempt(h, 'cambridge', NEW, resolve)).toBe(3);
    expect(nextAttempt(h, 'cambridge', NEW)).toBe(2);
  });

  it('merging stays commutative, associative, and idempotent: the documents are never rewritten', () => {
    const a = { ...learned(), supervision: [supOld(12, NOW + 5)], history: [camOld(NOW + 1, false, true)] };
    const b = { ...learned(), supervision: [supervised('q9', GATE_PASS_MARK, NOW + 7, 'WXYZ2345')] };
    const c = { ...learned(), history: [cam(NOW + 9, 'q9', true)] };
    const ab = mergeProgress(a, b);
    expect(exportProgress(ab)).toBe(exportProgress(mergeProgress(b, a)));
    expect(exportProgress(mergeProgress(ab, c))).toBe(exportProgress(mergeProgress(a, mergeProgress(b, c))));
    expect(exportProgress(mergeProgress(ab, ab))).toBe(exportProgress(ab));
    expect(ab.supervision.map((x) => x.problem).sort()).toEqual([NEW, OLD].sort());
    expect(gateStatus(ab, T, MOVED_GATE, resolve).evidence).toEqual({ kind: 'supervision', problem: NEW, at: NOW + 7, mark: GATE_PASS_MARK });
    const abc = mergeProgress(ab, c);
    expect(gateStatus(abc, T, MOVED_GATE, resolve)).toEqual(gateStatus(mergeProgress(c, mergeProgress(b, a)), T, MOVED_GATE, resolve));
  });
});
