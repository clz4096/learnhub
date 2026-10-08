/**
 * Problems that moved topic (Rule 1, 2026-10-08; content/src/topics/moved.ts): history,
 * supervision results, redos, and GAP results stored under an old key are read under the
 * current one, so Albert's 12 of 20 on the fractions unit-fraction proof now belongs to
 * proof.direct. The stored document is never rewritten.
 */
import { describe, expect, it } from 'vitest';
import { CONTENT_IDS, MOVED_PROBLEMS, currentProblemKey } from '@learnhub/content';
import { DAY_MS, exportProgress, importProgress, mergeProgress, recordReview, type Progress, type SupervisionResult } from '@learnhub/mastery';
import {
  DEFAULT_COURSES, cambridgeState, completeLesson, completeRedoByCheck, completeReview, importSupervisionResult, isMastered, lapseExcluded,
  masteryOf, openRedos, recommendedNext, recordCambridgeAnswer, recordSupervisionCopy, redoWaitsFor, startLearner, waitingCopies,
  withoutStaleLapses,
} from '@/model/learner';
import { ALL_TOPICS } from '@/model/courses';
import { contentStore } from '@/model/content';
import { dayItems } from '@/model/dayQueue';
import { gatherFacts } from '@/model/standupCheck';
import { checkResultFor, formatResult, parseResult, problemExists, recentAttempts } from '@/model/supervision';
import { importSummary, problemRoute } from '@/ui/Supervision';

await Promise.all(CONTENT_IDS.map((id) => contentStore.load(id)));

const T0 = new Date(2026, 9, 1, 9, 0).getTime();
const AT = T0 + 3 * DAY_MS;
const OLD = 'pre.fractions/step00-q1-unit';
const NOW_KEY = 'proof.direct/step00-q1-unit';
const NONCE = 'K7Q2XMPA';
const WEAK = ['Treated two examples as a proof.', 'Missed that the two fractions must be distinct.', 'Never stated the conclusion.'];
const res = (over: Partial<SupervisionResult> = {}): SupervisionResult => ({ mark: 12, weakPoints: [...WEAK], redo: [OLD], summary: 'Right algebra, no proof.', ...over });

/** Fractions learned and reviewed, then proof.direct learned: both have a schedule. */
function learned(): Progress {
  let p = startLearner(T0, DEFAULT_COURSES, 60);
  p = completeLesson(p, 'pre.fractions', true, T0, null, 20);
  p = completeReview(p, 'pre.fractions', true, T0 + DAY_MS, null);
  return completeLesson(p, 'proof.direct', true, T0 + DAY_MS, null, 20);
}

/** Albert's document: the copy and the 12 of 20 (no GAP) stored under the old key, a lapse on fractions, as the old build imported it. */
function albert(over: Partial<SupervisionResult> = {}): Progress {
  const c = recordSupervisionCopy(learned(), OLD, 'my proof', AT - 1000, () => NONCE).progress;
  return {
    ...c,
    supervision: c.supervision.map((a) => (a.nonce === NONCE ? { ...a, result: res(over), importedAt: AT } : a)),
    memory: recordReview(c.memory, ALL_TOPICS, 'pre.fractions', false, AT).memory,
    history: [...c.history, { at: AT, kind: 'supervision', topicId: 'pre.fractions', correct: false }],
    redos: [...c.redos, { problem: OLD, from: NONCE, setAt: AT, due: AT + DAY_MS, doneAt: null }],
  };
}

describe('the map from the content', () => {
  it('resolves the old fractions key to proof.direct, and leaves other keys alone', () => {
    expect(MOVED_PROBLEMS[OLD]).toBe(NOW_KEY);
    expect(currentProblemKey(OLD)).toBe(NOW_KEY);
    expect(currentProblemKey(NOW_KEY)).toBe(NOW_KEY);
    expect(currentProblemKey('pre.fractions/a6-q1-i-value')).toBe('pre.fractions/a6-q1-i-value');
    expect(currentProblemKey('toString')).toBe('toString');
    expect(problemExists(OLD)).toBe(true);
    expect(problemRoute(OLD)).toEqual({ view: 'problem', topicId: 'proof.direct', problemId: 'step00-q1-unit' });
  });
});

describe("Albert's 12 of 20 belongs to proof.direct", () => {
  it('is proof.direct work: in its recent attempts and its gate miss, not fractions', () => {
    const p = albert();
    expect(recentAttempts(p, 'proof.direct').some((l) => l.includes(`supervision of ${NOW_KEY}: 12/20`))).toBe(true);
    expect(recentAttempts(p, 'pre.fractions').some((l) => l.includes('supervision'))).toBe(false);
    // It is a miss on a proof.direct gate problem now, so it counts there; below 14, the gate is not met.
    expect(lapseExcluded(OLD, res())).toBe(false);
    expect(masteryOf(p, 'proof.direct')).toEqual({ stage: 'needs-gate', evidence: null, candidates: expect.any(Number) });
    // The stored document keeps the old key.
    expect(p.supervision[0]?.problem).toBe(OLD);
  });

  it('the lapse it put on fractions is taken back out; the document keeps its keys', () => {
    const p = albert();
    expect(p.memory['pre.fractions']?.lapses).toBe(1);
    const fixed = withoutStaleLapses(p);
    expect(fixed.memory['pre.fractions']?.lapses).toBe(0);
    expect(fixed.supervision).toBe(p.supervision);
    expect(fixed.redos).toBe(p.redos);
    expect(withoutStaleLapses(fixed)).toBe(fixed);
  });

  it('the gate of proof.direct reads a passing result stored under the old key', () => {
    const p = albert({ mark: 15, redo: [] });
    expect(masteryOf(p, 'proof.direct')).toEqual({ stage: 'mastered', evidence: { kind: 'supervision', problem: NOW_KEY, at: AT, mark: 15 }, candidates: expect.any(Number) });
    expect(isMastered(p, 'proof.direct')).toBe(true);
    expect(masteryOf(p, 'pre.fractions').stage).toBe('needs-gate');
  });

  it('its redo opens the problem where it is now, and a check on the current key closes it', () => {
    const p = albert();
    expect(openRedos(p).map((d) => d.problem)).toEqual([OLD]);
    const item = dayItems(p, AT + DAY_MS).find((x) => x.kind === 'redo');
    expect(item?.to).toEqual({ view: 'problem', topicId: 'proof.direct', problemId: 'step00-q1-unit' });
    const done = completeRedoByCheck(p, NOW_KEY, AT + 2 * DAY_MS);
    expect(openRedos(done)).toEqual([]);
    expect(done.redos[0]?.problem).toBe(OLD);
  });

  it('a GAP kept under the old key is a gap of proof.direct, and holds back its redo', () => {
    const p = albert({ gap: 'pre.fractions' });
    expect(recommendedNext(p, 'proof.direct')).toEqual(['pre.fractions']);
    expect(recommendedNext(p, 'pre.fractions')).toEqual([]);
    expect(redoWaitsFor(p, p.redos[0]!)).toBe('pre.fractions');
  });
});

describe('a copy made before the move, pasted after it', () => {
  const copied = (): Progress => recordSupervisionCopy(learned(), OLD, 'my proof', AT - 1000, () => NONCE).progress;
  const parsed = (over: Partial<SupervisionResult> = {}) => {
    const r = parseResult(formatResult({ problem: OLD, nonce: NONCE, result: res(over) }));
    if (!r.ok) throw new Error(r.error);
    return r.value;
  };

  it('is waiting on the problem page and accepted there', () => {
    const p = copied();
    expect(waitingCopies(p).map((a) => currentProblemKey(a.problem))).toEqual([NOW_KEY]);
    expect(checkResultFor(p, parsed(), NOW_KEY)).toBeNull();
    // The GAP check reads the current topic: proof.direct is the problem's own topic now.
    const own = parseResult(formatResult({ problem: OLD, nonce: NONCE, result: res({ gap: 'proof.direct' }) }));
    expect(own.ok ? '' : own.error).toMatch(/GAP names the problem's own topic/);
  });

  it('counts against proof.direct, not fractions, and closes the redo set under the old key', () => {
    let p = copied();
    p = { ...p, redos: [{ problem: OLD, from: 'ZZZZZZZZ', setAt: AT - 2000, due: AT, doneAt: null }] };
    const out = importSupervisionResult(p, parsed(), AT);
    expect(out.history.at(-1)).toEqual({ at: AT, kind: 'supervision', topicId: 'proof.direct', correct: false });
    expect(out.memory['proof.direct']?.lapses).toBe(1);
    expect(out.memory['pre.fractions']).toEqual(p.memory['pre.fractions']);
    expect(out.redos.filter((d) => d.from === 'ZZZZZZZZ').map((d) => d.doneAt)).toEqual([AT]);
    // REDO named the old key: one open redo, not a second for the same problem.
    expect(openRedos(out).map((d) => currentProblemKey(d.problem))).toEqual([NOW_KEY]);
    expect(importSummary(p, OLD, res())).toMatch(/counts as a missed review of Direct proof/);
    // A later fix pass leaves that lapse: it was a review of the topic that sets the problem.
    expect(withoutStaleLapses(out)).toBe(out);
  });
});

describe('Cambridge history under an old key', () => {
  // No auto-checked problem has moved yet; the key is a moved one all the same, which is all the reads look at.
  const v5 = (): Progress => {
    const d = JSON.parse(exportProgress(learned()));
    d.version = 5;
    d.history.push(
      { at: AT, kind: 'cambridge', topicId: 'pre.fractions', correct: false, item: { id: OLD, hints: 1, attempt: 1 } },
      { at: AT + 1000, kind: 'cambridge', topicId: 'proof.direct', correct: true, item: { id: NOW_KEY, hints: 0, attempt: 2 } },
    );
    const r = importProgress(d);
    if (!r.ok) throw new Error(r.errors.join('; '));
    return r.value;
  };

  it('the version 6 rule: a version 5 miss under the old key showed the solution, so a right answer under the new key never counts', () => {
    const p = v5();
    expect(p.history.find((h) => h.item?.id === OLD)?.item?.solution).toBe(true);
    expect(cambridgeState(p, NOW_KEY, AT + 2000)).toEqual({ solved: false, revealed: true, returnsAt: null, hints: 1 });
    expect(masteryOf(p, 'proof.direct').evidence).toBeNull();
  });

  it('attempt numbers and redos follow the problem across keys', () => {
    const base = learned();
    const a = recordCambridgeAnswer(base, OLD, false, { hints: 0 }, AT);
    expect(a.redos.map((d) => d.problem)).toEqual([OLD]);
    const b = recordCambridgeAnswer(a, NOW_KEY, false, { hints: 0 }, AT + 4 * DAY_MS);
    expect(b.history.at(-1)?.item?.attempt).toBe(2);
    expect(b.redos).toHaveLength(1);
    const c = recordCambridgeAnswer(b, NOW_KEY, true, { hints: 0 }, AT + 5 * DAY_MS);
    expect(openRedos(c)).toEqual([]);
    expect(cambridgeState(c, NOW_KEY, AT + 5 * DAY_MS).solved).toBe(true);
    expect(cambridgeState(c, OLD, AT + 5 * DAY_MS).solved).toBe(true);
  });

  it('the standup reads an old-key answer as news about the topic that sets the problem now', () => {
    const p = recordCambridgeAnswer(learned(), OLD, true, { hints: 0 }, AT);
    const f = gatherFacts(
      { progress: p, ladder: [], campaign: null, places: {}, since: AT - 1, until: AT + 1 },
      { topics: ALL_TOPICS, stageOf: (t) => masteryOf(p, t).stage, paperLabel: (x) => x, topicOfProblem: (k) => currentProblemKey(k).split('/')[0] as string },
    );
    expect(f.topics.find((t) => t.id === 'proof.direct')?.cambridge).toBe('passed');
    expect(f.topics.find((t) => t.id === 'pre.fractions')?.cambridge).toBeNull();
  });

  it('merge stays commutative and idempotent with old and new keys, and the reads agree either way', () => {
    const a = albert({ mark: 15, redo: [] });
    const b = recordCambridgeAnswer(learned(), NOW_KEY, false, { hints: 0, solution: true }, AT + 1000);
    const ab = mergeProgress(a, b);
    const ba = mergeProgress(b, a);
    expect(exportProgress(ab)).toBe(exportProgress(ba));
    expect(exportProgress(mergeProgress(ab, ab))).toBe(exportProgress(ab));
    expect(masteryOf(ab, 'proof.direct')).toEqual(masteryOf(ba, 'proof.direct'));
    expect(masteryOf(ab, 'proof.direct').evidence).toEqual({ kind: 'supervision', problem: NOW_KEY, at: AT, mark: 15 });
  });
});
