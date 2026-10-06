/** The timed ladder: rung shapes from the registry, scoring, the unlock rules, the next item, and storage. */
import { describe, expect, it } from 'vitest';
import * as adm from '@learnhub/content/admissions';
import { finishSitting, newCampaign, recordMarks, startSitting, type Campaign, type Sitting } from './campaign';
import {
  HALF_PASSES, LADDER_GRACE_MS, QUESTION_PASSES, QUESTION_PASS_SHARE, activeAttempt, attemptPasses, attemptScore, countedOf,
  finishAttempt, halfPassShare, isTimed, ladderPapers, ladderResults, ladderStatus, nextLadderItem, parseLadder,
  recordAttemptMarks, removeAttempt, rungMinutes, rungSets, startAttempt, timedSittings,
  type LadderAttempt, type PartRung,
} from './ladder';

const T0 = Date.UTC(2026, 9, 5, 14);
const MIN = 60_000;
const paper = (id: string) => adm.registryPaper(id)!;

/** Starts, finishes after `took` minutes, and marks an attempt. */
function sitPart(list: LadderAttempt[], paperId: string, rung: PartRung, questions: number[], marks: Pick<LadderAttempt, 'answers' | 'marks' | 'total' | 'outOf'>, took: number, at = T0): LadderAttempt[] {
  const started = startAttempt(adm, list, paperId, rung, questions, at);
  const a = started.at(-1)!;
  expect(a.finishedAt).toBeNull();
  return recordAttemptMarks(adm, finishAttempt(started, a.id, at + took * MIN), a.id, marks);
}

function sitFull(c: Campaign, paperId: string, marks: Pick<Sitting, 'answers' | 'questionMarks' | 'total'>, took: number): Campaign {
  const started = startSitting(c, paperId, 1, T0);
  const s = started.sittings.at(-1)!;
  return recordMarks(finishSitting(started, s.id, T0 + took * MIN), s.id, marks);
}

describe('the rungs of a paper', () => {
  it('STEP: 30 minutes a question, three of twelve in 90 for a half, the paper in 180', () => {
    const p = paper('step-2025-2');
    expect([countedOf(p, 'question'), countedOf(p, 'half'), countedOf(p, 'full')]).toEqual([1, 3, 6]);
    expect([rungMinutes(p, 'question'), rungMinutes(p, 'half'), rungMinutes(p, 'full')]).toEqual([30, 90, 180]);
    expect(rungSets(p, 'question')).toHaveLength(12);
    expect(rungSets(p, 'half')).toEqual([[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]]);
  });

  it('TMUA: 3.75 minutes a question, ten questions in 37.5, in two halves', () => {
    const p = paper('tmua-2016-p1');
    expect([rungMinutes(p, 'question'), rungMinutes(p, 'half'), rungMinutes(p, 'full')]).toEqual([3.75, 37.5, 75]);
    expect(rungSets(p, 'half')).toEqual([[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]]);
  });

  it('A level: the minutes shared evenly over the questions; an odd count rounds the first half up', () => {
    const p = paper('edx-9ma0-1-2025');
    expect(p.questions).toBe(16);
    expect(rungMinutes(p, 'question')).toBe(7.5);
    expect(rungMinutes(p, 'half')).toBe(60);
    const odd = paper('edx-9ma0-2-2025');
    expect(odd.questions).toBe(15);
    expect(rungSets(odd, 'half').map((s) => s.length)).toEqual([8, 7]);
    expect(rungMinutes(odd, 'half')).toBe(64);
  });

  it('uses only papers with a published question paper, newest first', () => {
    const step = ladderPapers(adm, 'STEP');
    expect(step[0]?.id).toBe('step-2025-2');
    expect(step.some((p) => p.year === 2026)).toBe(false);
    expect(ladderPapers(adm, 'TMUA')[0]?.id).toBe('tmua-2023-p1');
    expect(ladderPapers(adm, 'A level').every((p) => p.exam === 'A level')).toBe(true);
  });
});

describe('scoring and passing', () => {
  it('TMUA: right letters against the official key, question by question', () => {
    const key = adm.tmuaKey(2016, 1)!;
    let list = sitPart([], 'tmua-2016-p1', 'question', [3], { answers: [key[2]!] }, 3);
    expect(attemptScore(adm, list[0]!)).toEqual({ mark: 1, max: 1 });
    const half = [...key.slice(10)].map((x, i) => (i < 7 ? x : null));
    list = sitPart([], 'tmua-2016-p1', 'half', [11, 12, 13, 14, 15, 16, 17, 18, 19, 20], { answers: half }, 30);
    expect(attemptScore(adm, list[0]!)).toEqual({ mark: 7, max: 10 });
    expect(attemptPasses(adm, list[0]!, { mark: 7, max: 10 })).toBe(true);
    expect(attemptPasses(adm, list[0]!, { mark: 6, max: 10 })).toBe(false);
  });

  it('STEP: the best three of the half count, out of 60; a question out of 20', () => {
    const marks = [12, null, 18, 5, 20, null, null, null, null, null, null, 9];
    const list = sitPart([], 'step-2025-2', 'half', rungSets(paper('step-2025-2'), 'half')[0]!, { marks }, 90);
    expect(attemptScore(adm, list[0]!)).toEqual({ mark: 50, max: 60 });
    const q = sitPart([], 'step-2025-2', 'question', [4], { marks: [14] }, 30);
    expect(attemptScore(adm, q[0]!)).toEqual({ mark: 14, max: 20 });
    expect(attemptPasses(adm, q[0]!, { mark: 14, max: 20 })).toBe(true);
    expect(attemptPasses(adm, q[0]!, { mark: 13, max: 20 })).toBe(false);
  });

  it('a half passes at the offer grade on the paper\'s real boundaries', () => {
    // STEP 2 2025: grade 1 from 75 of 120. A level 9MA0/01 2025: A* from 88 of 100.
    expect(halfPassShare(adm, paper('step-2025-2'))).toBe(75 / 120);
    expect(halfPassShare(adm, paper('edx-9ma0-1-2025'))).toBe(0.88);
    expect(halfPassShare(adm, paper('tmua-2016-p1'))).toBe(QUESTION_PASS_SHARE);
    const a = { rung: 'half', paperId: 'step-2025-2' } as LadderAttempt;
    expect(attemptPasses(adm, a, { mark: 38, max: 60 })).toBe(true);
    expect(attemptPasses(adm, a, { mark: 37, max: 60 })).toBe(false);
  });

  it('A level: a mark out of what the questions are worth, checked', () => {
    const p = paper('edx-9ma0-1-2025');
    let list = sitPart([], p.id, 'question', [2], { total: 6, outOf: 7 }, 7);
    expect(attemptScore(adm, list[0]!)).toEqual({ mark: 6, max: 7 });
    for (const bad of [{ total: 8, outOf: 7 }, { total: 1, outOf: 0 }, { total: 1, outOf: 101 }, { total: 1.5, outOf: 7 }, { total: 3 }]) {
      list = sitPart([], p.id, 'question', [2], bad, 7);
      expect(attemptScore(adm, list[0]!), JSON.stringify(bad)).toBeNull();
    }
  });

  it('marks that do not fit the attempt are refused', () => {
    expect(attemptScore(adm, sitPart([], 'step-2025-2', 'question', [1], { marks: [21] }, 30)[0]!)).toBeNull();
    expect(attemptScore(adm, sitPart([], 'step-2025-2', 'question', [1], { marks: [10, 10] }, 30)[0]!)).toBeNull();
    expect(attemptScore(adm, sitPart([], 'tmua-2016-p1', 'question', [1], { answers: ['Z'] }, 3)[0]!)).toBeNull();
  });

  it('timed: within the minutes plus a minute to press Finish', () => {
    expect(isTimed(30, T0, T0 + 30 * MIN + LADDER_GRACE_MS)).toBe(true);
    expect(isTimed(30, T0, T0 + 30 * MIN + LADDER_GRACE_MS + 1)).toBe(false);
    expect(isTimed(30, T0, null)).toBe(false);
    const late = sitPart([], 'step-2025-2', 'question', [1], { marks: [20] }, 45);
    expect(ladderResults(adm, late, 'STEP')[0]).toMatchObject({ timed: false, passed: false });
  });
});

describe('the ladder status', () => {
  it('opens the half after two timed questions passed, and the full paper after a timed half passed', () => {
    expect([QUESTION_PASSES, HALF_PASSES]).toEqual([2, 1]);
    let list: LadderAttempt[] = [];
    expect(ladderStatus(adm, null, list, 'STEP').current).toBe('question');
    list = sitPart(list, 'step-2025-2', 'question', [1], { marks: [15] }, 25);
    list = sitPart(list, 'step-2025-2', 'question', [2], { marks: [9] }, 25, T0 + 60 * MIN);
    let s = ladderStatus(adm, null, list, 'STEP');
    expect(s.rungs[0]).toMatchObject({ done: 2, passed: 1 });
    expect(s.rungs[1]).toMatchObject({ open: false });
    expect(s.rungs[1]?.why).toBe('Opens after 2 timed questions passed (14 of 20 or better); 1 so far.');
    list = sitPart(list, 'step-2025-2', 'question', [3], { marks: [16] }, 25, T0 + 120 * MIN);
    s = ladderStatus(adm, null, list, 'STEP');
    expect(s.current).toBe('half');
    expect(s.rungs[2]?.why).toBe('Opens after a timed half paper reaches grade 1 on that year\'s boundaries, scaled to the whole paper.');
    const all = rungSets(paper('step-2025-2'), 'half')[0]!;
    // 35 of 60 is short of 2025 STEP 2 grade 1, 75 of 120.
    list = sitPart(list, 'step-2025-2', 'half', all, { marks: [20, 15, null, null, null, null, null, null, null, null, null, null] }, 85, T0 + 200 * MIN);
    expect(ladderStatus(adm, null, list, 'STEP').current).toBe('half');
    list = sitPart(list, 'step-2024-2', 'half', all, { marks: [20, 20, null, null, null, 2, null, null, null, null, null, null] }, 85, T0 + 400 * MIN);
    // 42 of 60 is 0.7 of the paper; 2024 STEP 2 grade 1 is 69 of 120, 0.575.
    s = ladderStatus(adm, null, list, 'STEP');
    expect(s.current).toBe('full');
    expect(s.rungs.map((r) => r.open)).toEqual([true, true, true]);
  });

  it('exams are separate ladders', () => {
    const list = sitPart([], 'step-2025-2', 'question', [1], { marks: [20] }, 25);
    expect(ladderStatus(adm, null, list, 'TMUA').rungs[0]).toMatchObject({ done: 0 });
  });

  it('a full paper sat in the campaign opens every rung; only timed sittings count as done', () => {
    let c = newCampaign('maths', T0);
    c = sitFull(c, 'tmua-2016-p1', { answers: [...adm.tmuaKey(2016, 1)!] }, 80);
    const s = ladderStatus(adm, c, [], 'TMUA');
    expect(s.current).toBe('full');
    expect(s.rungs[2]).toMatchObject({ open: true, done: 0 });
    expect(timedSittings(adm, c, 'TMUA')).toHaveLength(0);
    c = sitFull(c, 'tmua-2017-p1', { answers: [...adm.tmuaKey(2017, 1)!] }, 75);
    expect(ladderStatus(adm, c, [], 'TMUA').rungs[2]).toMatchObject({ done: 1, passed: 1 });
  });
});

describe('the next item', () => {
  it('walks the newest paper\'s sets first, skipping those tried', () => {
    expect(nextLadderItem(adm, null, [], 'STEP', 'question')).toMatchObject({ paper: { id: 'step-2025-2' }, questions: [1] });
    const list = sitPart([], 'step-2025-2', 'question', [1], { marks: [3] }, 25);
    expect(nextLadderItem(adm, null, list, 'STEP', 'question')?.questions).toEqual([2]);
    const h = sitPart([], 'tmua-2023-p1', 'half', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], {}, 30);
    expect(nextLadderItem(adm, null, h, 'TMUA', 'half')).toMatchObject({ paper: { id: 'tmua-2023-p1' }, questions: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20] });
  });

  it('for the full paper, the newest paper not sat in the campaign', () => {
    let c = newCampaign('maths', T0);
    expect(nextLadderItem(adm, c, [], 'STEP', 'full')?.paper.id).toBe('step-2025-2');
    c = sitFull(c, 'step-2025-2', { questionMarks: Array<null>(12).fill(null) }, 170);
    expect(nextLadderItem(adm, c, [], 'STEP', 'full')?.paper.id).toBe('step-2025-3');
  });

  it('is null when every set has been tried', () => {
    const all: LadderAttempt[] = [];
    for (const p of ladderPapers(adm, 'TMUA')) for (const s of rungSets(p, 'half')) all.push({ id: `${p.id}${s[0]}`, paperId: p.id, rung: 'half', questions: s, startedAt: T0, finishedAt: T0 });
    expect(nextLadderItem(adm, null, all, 'TMUA', 'half')).toBeNull();
  });
});

describe('changes', () => {
  it('one attempt at a time; a set the rung does not offer is refused', () => {
    const one = startAttempt(adm, [], 'step-2025-2', 'question', [1], T0);
    expect(activeAttempt(one)?.paperId).toBe('step-2025-2');
    expect(startAttempt(adm, one, 'tmua-2016-p1', 'question', [1], T0)).toEqual(one);
    expect(startAttempt(adm, [], 'step-2025-2', 'question', [13], T0)).toEqual([]);
    expect(startAttempt(adm, [], 'step-2025-2', 'half', [1, 2, 3], T0)).toEqual([]);
    expect(startAttempt(adm, [], 'nope', 'question', [1], T0)).toEqual([]);
  });

  it('marks wait for Finish; finishing twice keeps the first time; remove drops it', () => {
    const one = startAttempt(adm, [], 'step-2025-2', 'question', [1], T0);
    const id = one[0]!.id;
    expect(recordAttemptMarks(adm, one, id, { marks: [5] })).toEqual(one);
    const done = finishAttempt(one, id, T0 + MIN);
    expect(finishAttempt(done, id, T0 + 2 * MIN)[0]?.finishedAt).toBe(T0 + MIN);
    expect(removeAttempt(done, id)).toEqual([]);
  });
});

describe('storage', () => {
  it('round-trips, and drops what does not fit one attempt at a time', () => {
    let list = sitPart([], 'step-2025-2', 'question', [1], { marks: [15] }, 25);
    list = sitPart(list, 'tmua-2016-p1', 'question', [2], { answers: ['B'] }, 3, T0 + MIN);
    list = sitPart(list, 'edx-9ma0-1-2025', 'question', [2], { total: 5, outOf: 7 }, 7, T0 + 2 * MIN);
    expect(parseLadder(adm, JSON.stringify(list))).toEqual(list);
    const bad = [
      ...list,
      { ...list[0], id: 'dup' + list[0]!.id, paperId: 'no-such-paper' },
      { ...list[0], id: 'x1', questions: [13] },
      { ...list[0], id: 'x2', rung: 'full' },
      { ...list[0], id: 'x3', startedAt: 'yesterday' },
      { ...list[0], id: 'x4', marks: [99] },
      list[0],
      'junk',
    ];
    const got = parseLadder(adm, JSON.stringify(bad));
    expect(got.map((a) => a.id)).toEqual([...list.map((a) => a.id), 'x4']);
    expect(got.at(-1)?.marks).toBeUndefined();
    expect(parseLadder(adm, null)).toEqual([]);
    expect(parseLadder(adm, '{oops')).toEqual([]);
    expect(parseLadder(adm, '{}')).toEqual([]);
  });
});
