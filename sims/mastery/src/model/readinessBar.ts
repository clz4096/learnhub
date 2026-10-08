/**
 * The readiness bar learns from results (rule 8, mastery/HOW-A-TOPIC-WORKS.md, approved
 * 2026-10-08).
 *
 * Before each timed sitting (a ladder rung, or a campaign paper) the app records a forecast
 * (`Forecast`): its predicted share of the marks, and the share of the exam's syllabus mastered
 * at that moment. The prediction is the outcome model's mean of the timed results on that paper
 * so far (outcome.ts); before there are any, it is the mastered share itself, the assumption
 * behind the bar (mastering 60 percent of the topics should be worth about 60 percent of the
 * marks). After marking, the real share sits beside it, and the gap is shown.
 *
 * The bar (`READY_SHARE`, 60 percent to start) is the mastered share at which timed work is
 * expected to reach the offer grade: one timed question at 14 of 20, a half or full paper at
 * the grade the typical offer asks for on that paper's own boundaries (`halfPassShare`). Each
 * marked, timed sitting with a forecast is evidence about it, read in time order:
 * - met the offer grade with less mastered than the bar: the bar was too cautious, so it moves
 *   halfway down toward that mastered share;
 * - missed it with at least the bar mastered: the bar was too eager, so it moves halfway up
 *   toward that mastered share plus `BAR_MARGIN`;
 * - otherwise (met above the bar, missed below it) the result agrees with the bar, which stays.
 * The bar is kept within `BAR_MIN` and `BAR_MAX`, so one odd paper can move it, but never to a
 * bar that opens timed work with almost nothing mastered or one that never opens it. Halfway
 * steps make the latest result count most while earlier ones still weigh: after k results
 * against the bar, the first one's pull is 2^-k.
 *
 * Each exam learns its own bar, from its own sittings. Pure: no clock, storage, or app state.
 */
import type { RegistryPaper } from '@learnhub/content/admissions';
import type { Progress } from '@learnhub/mastery';
import { marked, type Admissions, type Campaign, type Forecast } from './campaign';
import {
  QUESTION_PASS_SHARE, attemptScore, halfPassShare, isTimed, rungMinutes, type Exam, type LadderAttempt, type Rung,
} from './ladder';
import { predictionKey, predictions } from './outcome';
import { READY_SHARE, readiness, type Readiness } from './readiness';

export const BAR_START = READY_SHARE;
export const BAR_MIN = 0.45;
export const BAR_MAX = 0.8;
/** How far above the mastered share of a missed sitting the bar is pulled toward. */
export const BAR_MARGIN = 0.1;

/** The forecast for a sitting about to start on `paper`: see the file comment. */
export function forecastFor(adm: Admissions, p: Progress, c: Campaign | null, attempts: readonly LadderAttempt[], paper: RegistryPaper): Forecast {
  const r = readiness(p, paper.exam);
  const mastered = r.total === 0 ? 0 : r.mastered / r.total;
  const pr = predictions(adm, c, attempts).find((x) => x.key === predictionKey(paper));
  if (pr !== undefined && pr.predicted !== null && pr.max > 0) {
    return { predicted: Math.min(1, Math.max(0, pr.predicted.mark / pr.max)), from: 'outcome', mastered };
  }
  return { predicted: mastered, from: 'mastery', mastered };
}

/** One sitting set against its forecast. */
export interface ForecastResult {
  id: string;
  exam: Exam;
  rung: Rung;
  paper: RegistryPaper;
  at: number;
  forecast: Forecast;
  /** The real share of the marks, 0 to 1; null until marked. */
  real: number | null;
  /** Real less predicted, in shares; null until marked. */
  gap: number | null;
  timed: boolean;
  /** The share that meets the offer grade on this paper; null when the paper has no boundaries. */
  offer: number | null;
  /** Marked, timed, and at or above the offer share; null when not marked or there is no offer share. */
  met: boolean | null;
}

/** The share that meets the offer grade for a rung of a paper: a question at 14 of 20, a half or full paper at the offer grade. */
function offerShare(adm: Admissions, paper: RegistryPaper, rung: Rung): number | null {
  return rung === 'question' ? QUESTION_PASS_SHARE : halfPassShare(adm, paper);
}

/** Every sitting of an exam that recorded a forecast, ladder rungs and campaign papers, oldest first. */
export function forecastResults(adm: Admissions, c: Campaign | null, attempts: readonly LadderAttempt[], exam: Exam): ForecastResult[] {
  const out: ForecastResult[] = [];
  const add = (id: string, rung: Rung, paper: RegistryPaper, at: number, forecast: Forecast, score: { mark: number; max: number } | null, timed: boolean): void => {
    const real = score === null || score.max <= 0 ? null : score.mark / score.max;
    const offer = offerShare(adm, paper, rung);
    out.push({
      id, exam, rung, paper, at, forecast, real, gap: real === null ? null : real - forecast.predicted, timed, offer,
      met: real === null || offer === null ? null : timed && real >= offer,
    });
  };
  for (const a of attempts) {
    const paper = adm.registryPaper(a.paperId);
    if (paper === undefined || paper.exam !== exam || a.forecast === undefined || a.finishedAt === null) continue;
    add(a.id, a.rung, paper, a.startedAt, a.forecast, attemptScore(adm, a), isTimed(rungMinutes(paper, a.rung), a.startedAt, a.finishedAt));
  }
  if (c !== null) {
    const scores = new Map(marked(adm, c).map((x) => [x.s.id, x.score]));
    for (const s of c.sittings) {
      const paper = adm.registryPaper(s.paperId);
      if (paper === undefined || paper.exam !== exam || s.forecast === undefined || s.finishedAt === null) continue;
      add(s.id, 'full', paper, s.startedAt, s.forecast, scores.get(s.id) ?? null, isTimed(paper.duration_minutes, s.startedAt, s.finishedAt));
    }
  }
  return out.sort((x, y) => x.at - y.at || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
}

/** One step of the bar: the result it read, and the bar after. */
export interface BarStep {
  id: string;
  mastered: number;
  met: boolean;
  bar: number;
}

const clamp = (x: number): number => Math.min(BAR_MAX, Math.max(BAR_MIN, x));

/** The bar after the results (see the file comment), with each step that moved or held it. */
export function learnBar(results: readonly ForecastResult[]): { bar: number; steps: BarStep[] } {
  let bar = BAR_START;
  const steps: BarStep[] = [];
  for (const r of results) {
    if (r.met === null || !r.timed) continue;
    const m = r.forecast.mastered;
    if (r.met && m < bar) bar = clamp(bar + (m - bar) / 2);
    else if (!r.met && m >= bar) bar = clamp(bar + (m + BAR_MARGIN - bar) / 2);
    steps.push({ id: r.id, mastered: m, met: r.met, bar });
  }
  return { bar, steps };
}

/** The bar an exam's readiness uses now, learned from its sittings. */
export function readinessBar(adm: Admissions | null, c: Campaign | null, attempts: readonly LadderAttempt[], exam: Exam): number {
  return adm === null ? BAR_START : learnBar(forecastResults(adm, c, attempts, exam)).bar;
}

/** Readiness with the learned bar: `readiness` with `readinessBar`. */
export function learnedReadiness(p: Progress, exam: Exam, adm: Admissions | null, c: Campaign | null, attempts: readonly LadderAttempt[]): Readiness {
  return readiness(p, exam, readinessBar(adm, c, attempts, exam));
}

/** The mean gap (real less predicted) over marked sittings; null with none. */
export function meanGap(results: readonly ForecastResult[]): number | null {
  const gaps = results.map((r) => r.gap).filter((g): g is number => g !== null);
  return gaps.length === 0 ? null : gaps.reduce((a, g) => a + g, 0) / gaps.length;
}
