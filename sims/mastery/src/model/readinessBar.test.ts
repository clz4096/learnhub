/** Rule 8: the prediction recorded before a timed sitting, the real result beside it, and the readiness bar learned from them. */
import { describe, expect, it } from 'vitest';
import * as adm from '@learnhub/content/admissions';
import { DAY_MS } from '@learnhub/mastery';
import { finishSitting, newCampaign, parseCampaign, recordMarks, startSitting, type Forecast } from './campaign';
import { finishAttempt, parseLadder, recordAttemptMarks, startAttempt, type LadderAttempt } from './ladder';
import { DEFAULT_COURSES, startLearner } from './learner';
import { readiness, syllabusTopics } from './readiness';
import {
  BAR_MARGIN, BAR_MAX, BAR_MIN, BAR_START, forecastFor, forecastResults, learnBar, learnedReadiness, meanGap, readinessBar, type ForecastResult,
} from './readinessBar';
import { parseAttemptShape } from '@/sync/learner/ladder';
import { mergeTimed } from '@/sync/learner/campaign';
import { masterTopics } from '@/test/ready';

const T0 = Date.UTC(2026, 9, 5, 14);
const MIN = 60_000;
const STEP_PAPER = 'step-2025-2';
const F = (mastered: number, predicted = mastered): Forecast => ({ predicted, from: 'mastery', mastered });

/** A result as `learnBar` reads it: timed and marked unless said otherwise. */
const res = (id: string, mastered: number, met: boolean | null, timed = true): ForecastResult => ({
  id, exam: 'STEP', rung: 'question', paper: adm.registryPaper(STEP_PAPER)!, at: T0, forecast: F(mastered),
  real: met === null ? null : met ? 0.8 : 0.3, gap: null, timed, offer: 0.7, met,
});

/** A STEP question attempt with a forecast, finished after `took` minutes and marked `mark` of 20. */
function question(list: LadderAttempt[], q: number, forecast: Forecast, mark: number | null, took = 25, at = T0): LadderAttempt[] {
  const started = startAttempt(adm, list, STEP_PAPER, 'question', [q], at, forecast);
  const a = started.at(-1)!;
  const done = finishAttempt(started, a.id, at + took * MIN);
  return mark === null ? done : recordAttemptMarks(adm, done, a.id, { marks: [mark] });
}

describe('the bar learns (learnBar)', () => {
  it('starts at 60 percent and stays there with no timed, marked result', () => {
    expect(BAR_START).toBe(0.6);
    expect(learnBar([])).toEqual({ bar: 0.6, steps: [] });
    expect(learnBar([res('a', 0.3, null), res('b', 0.3, true, false)]).bar).toBe(0.6);
  });

  it('met with less mastered than the bar: halfway down toward that share', () => {
    expect(learnBar([res('a', 0.5, true)]).bar).toBeCloseTo(0.55, 12);
  });

  it('missed with at least the bar mastered: halfway up toward that share plus the margin', () => {
    expect(BAR_MARGIN).toBe(0.1);
    expect(learnBar([res('a', 0.6, false)]).bar).toBeCloseTo(0.65, 12);
    expect(learnBar([res('a', 0.7, false)]).bar).toBeCloseTo(0.7, 12);
  });

  it('a result that agrees with the bar leaves it: met above it, missed below it', () => {
    expect(learnBar([res('a', 0.9, true), res('b', 0.2, false)]).bar).toBe(0.6);
  });

  it('stays within 45 and 80 percent however the results run', () => {
    expect([BAR_MIN, BAR_MAX]).toEqual([0.45, 0.8]);
    expect(learnBar(Array.from({ length: 30 }, (_, i) => res(`m${i}`, 0, true))).bar).toBe(BAR_MIN);
    expect(learnBar(Array.from({ length: 30 }, (_, i) => res(`x${i}`, 1, false))).bar).toBe(BAR_MAX);
    // Random runs: always in bounds, and each step moves at most halfway to its target.
    let seed = 7;
    const rnd = (): number => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let run = 0; run < 200; run++) {
      const { steps } = learnBar(Array.from({ length: 12 }, (_, i) => res(`r${i}`, rnd(), rnd() < 0.5)));
      for (const s of steps) expect(s.bar >= BAR_MIN && s.bar <= BAR_MAX).toBe(true);
    }
  });

  it('later results weigh most: a miss after a run of passes pulls back up', () => {
    const down = learnBar([res('a', 0.45, true), res('b', 0.45, true)]).bar;
    expect(down).toBeLessThan(0.55);
    expect(learnBar([res('a', 0.45, true), res('b', 0.45, true), res('c', 0.6, false)]).bar).toBeGreaterThan(down);
  });
});

describe('the forecast (rule 8)', () => {
  it('before any timed result: the share of the syllabus mastered, as the prediction', () => {
    const p = startLearner(T0, DEFAULT_COURSES, 60);
    expect(forecastFor(adm, p, null, [], adm.registryPaper(STEP_PAPER)!)).toEqual({ predicted: 0, from: 'mastery', mastered: 0 });
    const half = syllabusTopics('STEP').slice(0, Math.ceil(syllabusTopics('STEP').length / 2));
    const q = masterTopics(p, half, T0);
    const f = forecastFor(adm, q, null, [], adm.registryPaper(STEP_PAPER)!);
    expect(f.from).toBe('mastery');
    expect(f.mastered).toBeCloseTo(half.length / syllabusTopics('STEP').length, 12);
    expect(f.predicted).toBe(f.mastered);
  });

  it('with timed results on the paper: the outcome model\'s mean share', () => {
    const p = startLearner(T0, DEFAULT_COURSES, 60);
    // A timed STEP half: 45 of 60.
    const started = startAttempt(adm, [], STEP_PAPER, 'half', Array.from({ length: 12 }, (_, i) => i + 1), T0);
    const a = started.at(-1)!;
    const done = recordAttemptMarks(adm, finishAttempt(started, a.id, T0 + 80 * MIN), a.id, { marks: [15, 15, 15, null, null, null, null, null, null, null, null, null] });
    const f = forecastFor(adm, p, null, done, adm.registryPaper(STEP_PAPER)!);
    expect(f).toEqual({ predicted: 0.75, from: 'outcome', mastered: 0 });
  });

  it('is kept by start, marks, storage, and sync on a ladder attempt', () => {
    const list = question([], 1, F(0.62, 0.55), 15);
    expect(list[0]?.forecast).toEqual(F(0.62, 0.55));
    expect(parseLadder(adm, JSON.stringify(list))[0]?.forecast).toEqual(F(0.62, 0.55));
    expect(parseAttemptShape(JSON.parse(JSON.stringify(list[0])))?.forecast).toEqual(F(0.62, 0.55));
    // A malformed forecast is dropped, the attempt kept.
    expect(parseLadder(adm, JSON.stringify([{ ...list[0], forecast: { predicted: 2, from: 'mastery', mastered: 0.5 } }]))[0]?.forecast).toBeUndefined();
    const merged = mergeTimed(list[0]!, { ...list[0]!, marks: [9] }, ['answers', 'marks', 'total', 'outOf'], 1, 2).item;
    expect(merged.forecast).toEqual(F(0.62, 0.55));
  });

  it('is kept by start, marks, and storage on a campaign sitting', () => {
    const c0 = newCampaign('maths', T0);
    const started = startSitting(c0, STEP_PAPER, 1, T0, F(0.7));
    const s = started.sittings[0]!;
    const c = recordMarks(finishSitting(started, s.id, T0 + 170 * MIN), s.id, { questionMarks: [18, 17, 16, 15, 14, 12, null, null, null, null, null, null] });
    expect(c.sittings[0]?.forecast).toEqual(F(0.7));
    expect(parseCampaign(JSON.stringify(c))?.sittings[0]?.forecast).toEqual(F(0.7));
  });
});

describe('predicted and real (forecastResults)', () => {
  it('sets each marked sitting against its prediction, with the gap and whether it met the offer grade', () => {
    let list = question([], 1, F(0.6, 0.6), 15);
    list = question(list, 2, F(0.62, 0.6), 8, 25, T0 + DAY_MS);
    list = question(list, 3, F(0.64, 0.6), null, 25, T0 + 2 * DAY_MS);
    // Over time: kept, not counted.
    list = question(list, 4, F(0.64, 0.6), 20, 45, T0 + 3 * DAY_MS);
    const r = forecastResults(adm, null, list, 'STEP');
    expect(r.map((x) => [x.real, x.met, x.timed])).toEqual([[0.75, true, true], [0.4, false, true], [null, null, true], [1, false, false]]);
    expect(r[0]?.gap).toBeCloseTo(0.15, 12);
    expect(r[1]?.gap).toBeCloseTo(-0.2, 12);
    expect(meanGap(r)).toBeCloseTo((0.15 - 0.2 + 0.4) / 3, 12);
    expect(forecastResults(adm, null, list, 'TMUA')).toEqual([]);
  });

  it('a campaign paper counts at the offer grade on its own boundaries', () => {
    const c0 = newCampaign('maths', T0);
    const started = startSitting(c0, STEP_PAPER, 1, T0, F(0.7));
    const s = started.sittings[0]!;
    const c = recordMarks(finishSitting(started, s.id, T0 + 170 * MIN), s.id, { questionMarks: [20, 20, 20, 20, 20, 20, null, null, null, null, null, null] });
    const [r] = forecastResults(adm, c, [], 'STEP');
    expect(r).toMatchObject({ rung: 'full', real: 1, met: true, timed: true });
    expect(r?.offer).not.toBeNull();
  });

  it('a sitting with no forecast (begun before rule 8) is left out', () => {
    const started = startAttempt(adm, [], STEP_PAPER, 'question', [1], T0);
    const a = started.at(-1)!;
    const list = recordAttemptMarks(adm, finishAttempt(started, a.id, T0 + 20 * MIN), a.id, { marks: [15] });
    expect(forecastResults(adm, null, list, 'STEP')).toEqual([]);
  });
});

describe('readiness with the learned bar', () => {
  const topics = syllabusTopics('STEP');
  const half = topics.slice(0, Math.ceil(topics.length / 2));

  it('readiness takes the bar: half the syllabus is ready at a 50 percent bar, not at 60', () => {
    const p = masterTopics(startLearner(T0, DEFAULT_COURSES, 60), half, T0);
    expect(readiness(p, 'STEP').ready).toBe(false);
    expect(readiness(p, 'STEP').bar).toBe(0.6);
    expect(readiness(p, 'STEP', 0.5)).toMatchObject({ ready: true, bar: 0.5, need: Math.ceil(topics.length / 2) });
  });

  it('timed passes with less mastered lower the bar until that learner is ready; the default without a registry is the start', () => {
    const p = masterTopics(startLearner(T0, DEFAULT_COURSES, 60), half, T0);
    const share = half.length / topics.length;
    let list: LadderAttempt[] = [];
    for (let i = 1; i <= 4; i++) list = question(list, i, F(0.4), 16, 25, T0 + i * DAY_MS);
    const bar = readinessBar(adm, null, list, 'STEP');
    expect(bar).toBeLessThanOrEqual(share);
    expect(bar).toBeGreaterThanOrEqual(BAR_MIN);
    expect(learnedReadiness(p, 'STEP', adm, null, list).ready).toBe(true);
    expect(readinessBar(null, null, list, 'STEP')).toBe(BAR_START);
    // Another exam's results do not move this one.
    expect(readinessBar(adm, null, list, 'TMUA')).toBe(BAR_START);
  });
});
