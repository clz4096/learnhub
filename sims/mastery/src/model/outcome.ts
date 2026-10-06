/**
 * The outcome model (assessment that proves learning, phase 1): a predicted mark and grade
 * for each paper, with a range, from timed work only, placed on the real grade boundaries
 * of the paper registry (content/src/admissions).
 *
 * Evidence: full papers sat in the campaign's exam mode and half papers from the timed
 * ladder (ladder.ts), each kept to its time. Single questions are left out: one question
 * of a paper says little about the paper. Untimed work, drills, and supervision of single
 * problems are never evidence here.
 *
 * The estimate. Each result is a share of its marks (a half paper's share stands for the
 * whole paper). The prediction is the mean share; the range is an 80 percent interval for
 * that mean from the results' own spread, mean plus or minus t times s over root n, with
 * Student's t at n - 1 degrees of freedom (`T90`). So the range needs two results, and it
 * narrows as more papers agree: both the t factor and the root n shrink. A result far from
 * the others widens it, honestly. The interval assumes the results scatter about a true
 * level independently and roughly normally; it is a guide, not a guarantee, and the panel
 * says so.
 *
 * Placement. STEP: on the latest year's printed boundaries (step-results.json), with the
 * share of that year's real candidates at or below the predicted mark. A level: on the
 * boundaries of the latest series of the same component. TMUA: no official grade
 * boundaries or raw-to-scale conversion exist for past papers (the registry's gaps), so a
 * TMUA prediction is a raw mark out of 20 and nothing more. No distribution or boundary
 * here comes from anywhere but the registry.
 */
import type { RegistryPaper, StepGrade, StepPaper } from '@learnhub/content/admissions';
import { marked, paperName, subjectOf, type Admissions, type Campaign, type Subject } from './campaign';
import { attemptScore, isTimed, rungMinutes, type Exam, type LadderAttempt } from './ladder';

/**
 * Student's t, the 0.90 quantile, for 1 to 30 degrees of freedom; beyond 30, the normal
 * quantile 1.2816. So mean plus or minus T90 s over root n is a two-sided 80 percent
 * interval. Computed with mpmath (the regularised incomplete beta function, solved for
 * 0.90) and checked in the tests by integrating the t density.
 */
export const T90: readonly number[] = [
  3.0777, 1.8856, 1.6377, 1.5332, 1.4759, 1.4398, 1.4149, 1.3968, 1.383, 1.3722,
  1.3634, 1.3562, 1.3502, 1.345, 1.3406, 1.3368, 1.3334, 1.3304, 1.3277, 1.3253,
  1.3232, 1.3212, 1.3195, 1.3178, 1.3164, 1.315, 1.3137, 1.3125, 1.3114, 1.3104,
];
export const Z90 = 1.2816;

/** The t factor for n results, or null below two (no spread to measure). */
export function tFactor(n: number): number | null {
  if (!Number.isInteger(n) || n < 2) return null;
  return T90[n - 2] ?? Z90;
}

export interface Interval {
  mean: number;
  lo: number;
  hi: number;
}

/** The mean of shares and its 80 percent interval, clamped to 0 and 1; the interval is null below two results. */
export function shareInterval(shares: readonly number[]): { mean: number; range: Interval | null } | null {
  const n = shares.length;
  if (n === 0) return null;
  const mean = shares.reduce((a, x) => a + x, 0) / n;
  const t = tFactor(n);
  if (t === null) return { mean, range: null };
  const sd = Math.sqrt(shares.reduce((a, x) => a + (x - mean) ** 2, 0) / (n - 1));
  const half = (t * sd) / Math.sqrt(n);
  return { mean, range: { mean, lo: Math.max(0, mean - half), hi: Math.min(1, mean + half) } };
}

export interface Evidence {
  kind: 'full' | 'half';
  paper: RegistryPaper;
  /** When it was sat. */
  at: number;
  mark: number;
  max: number;
  /** Kept to time: only timed work counts. */
  timed: boolean;
  /** The grade on this paper's own boundaries (a half scaled to the whole paper); null for TMUA. */
  grade: string | null;
}

export interface Placed {
  /** The mark on the reference paper, 0 to `max`, not rounded. */
  mark: number;
  grade: string | null;
}

export interface Prediction {
  /** "STEP 2", "9MA0/01", "TMUA Paper 1". */
  key: string;
  exam: Exam;
  /** For A level: the subject. */
  subject: Subject | null;
  /** What the prediction is placed on: "STEP 2 2026", "9MA0/01 June 2025"; null for TMUA. */
  reference: string | null;
  /** The reference paper's marks. */
  max: number;
  /** Grade boundaries of the reference paper, best grade first; empty for TMUA. */
  boundaries: { grade: string; mark: number }[];
  /** Timed results counted. */
  n: number;
  /** Null with no timed results. */
  predicted: Placed | null;
  /** Null below two timed results. */
  low: Placed | null;
  high: Placed | null;
  /** STEP: the share of the reference year's candidates at or below the predicted mark, 0 to 1. */
  atOrBelow: number | null;
  /** Every result on this paper, timed or not, oldest first. */
  evidence: Evidence[];
}

const STEP_GRADES: readonly StepGrade[] = ['S', '1', '2', '3'];
const A_GRADES = ['A*', 'A', 'B', 'C', 'D', 'E'] as const;

/** The latest year with published results for a STEP paper. */
function latestStepYear(adm: Admissions, paper: StepPaper): number | null {
  const years = adm.stepResults.years.filter((y) => y.papers.some((p) => p.paper === paper)).map((y) => y.year);
  return years.length === 0 ? null : Math.max(...years);
}

/** The latest registry paper of an A level component that has boundaries. */
function latestComponent(adm: Admissions, code: string): RegistryPaper | null {
  const list = adm.registry.papers.filter((p) => p.exam === 'A level' && p.paper === code && p.boundaries !== undefined && 'max_mark' in p.boundaries);
  return list.sort((a, b) => b.year - a.year)[0] ?? null;
}

/** The prediction key of a paper: the STEP paper, the A level component, or the TMUA paper. */
export function predictionKey(p: RegistryPaper): string {
  return p.exam === 'TMUA' ? `TMUA ${p.paper}` : p.paper;
}

/** A mark's grade on a paper's own boundaries; null for TMUA or a paper without boundaries. */
export function gradeOn(adm: Admissions, paper: RegistryPaper, mark: number): string | null {
  if (paper.exam === 'STEP') return adm.stepPaperResults(paper.year, paper.paper as StepPaper) === undefined ? null : adm.stepGrade(paper.year, paper.paper as StepPaper, mark);
  if (paper.exam === 'A level') return paper.boundaries !== undefined && 'max_mark' in paper.boundaries ? adm.aLevelGrade(paper.id, mark) : null;
  return null;
}

/** Every full and half paper result, timed or not, oldest first. */
export function outcomeEvidence(adm: Admissions, c: Campaign | null, attempts: readonly LadderAttempt[]): Evidence[] {
  const out: Evidence[] = [];
  for (const x of c === null ? [] : marked(adm, c)) {
    out.push({
      kind: 'full', paper: x.paper, at: x.s.startedAt, mark: x.score.mark, max: x.score.max,
      timed: isTimed(x.paper.duration_minutes, x.s.startedAt, x.s.finishedAt),
      grade: gradeOn(adm, x.paper, x.score.mark),
    });
  }
  for (const a of attempts) {
    if (a.rung !== 'half') continue;
    const paper = adm.registryPaper(a.paperId);
    const score = attemptScore(adm, a);
    if (paper === undefined || score === null || score.max <= 0) continue;
    const full = paper.exam === 'STEP' ? 120 : paper.total_marks;
    out.push({
      kind: 'half', paper, at: a.startedAt, mark: score.mark, max: score.max,
      timed: isTimed(rungMinutes(paper, 'half'), a.startedAt, a.finishedAt),
      grade: gradeOn(adm, paper, (score.mark / score.max) * full),
    });
  }
  return out.sort((x, y) => x.at - y.at);
}

/**
 * The predictions, one per paper with any result: STEP 2 and 3, each A level component,
 * TMUA Papers 1 and 2. In that order: STEP, then A level by component, then TMUA.
 */
export function predictions(adm: Admissions, c: Campaign | null, attempts: readonly LadderAttempt[]): Prediction[] {
  const evidence = outcomeEvidence(adm, c, attempts);
  const keys = [...new Set(evidence.map((e) => predictionKey(e.paper)))];
  const order = (k: string): number => (k.startsWith('STEP') ? 0 : k.startsWith('TMUA') ? 2 : 1);
  keys.sort((a, b) => order(a) - order(b) || (a < b ? -1 : a > b ? 1 : 0));
  return keys.map((key) => predict(adm, key, evidence.filter((e) => predictionKey(e.paper) === key)));
}

function predict(adm: Admissions, key: string, evidence: Evidence[]): Prediction {
  const first = (evidence[0] as Evidence).paper;
  const exam = first.exam;
  let reference: string | null = null;
  let max = first.exam === 'STEP' ? 120 : first.total_marks;
  let boundaries: { grade: string; mark: number }[] = [];
  let grade: (mark: number) => string | null = () => null;
  let atOrBelow: (mark: number) => number | null = () => null;
  if (exam === 'STEP') {
    const paper = first.paper as StepPaper;
    const year = latestStepYear(adm, paper);
    const r = year === null ? undefined : adm.stepPaperResults(year, paper);
    if (year !== null && r !== undefined) {
      reference = `${paper} ${year}`;
      max = r.max_mark;
      boundaries = STEP_GRADES.map((g) => ({ grade: g, mark: r.boundaries[g] }));
      grade = (m) => adm.stepGrade(year, paper, m);
      atOrBelow = (m) => adm.stepPlacement(year, paper, Math.min(r.max_mark, Math.max(0, Math.round(m)))).share;
    }
  } else if (exam === 'A level') {
    const ref = latestComponent(adm, key);
    const b = ref?.boundaries;
    if (ref !== null && b !== undefined && 'max_mark' in b) {
      reference = paperName(ref).split(':')[0] ?? ref.id;
      max = b.max_mark;
      boundaries = A_GRADES.map((g) => ({ grade: g, mark: b[g] }));
      grade = (m) => adm.aLevelGrade(ref.id, m);
    }
  }
  const timed = evidence.filter((e) => e.timed);
  const est = shareInterval(timed.map((e) => e.mark / e.max));
  const place = (share: number): Placed => ({ mark: share * max, grade: grade(share * max) });
  return {
    key, exam, subject: subjectOf(first), reference, max, boundaries, n: timed.length,
    predicted: est === null ? null : place(est.mean),
    low: est?.range == null ? null : place(est.range.lo),
    high: est?.range == null ? null : place(est.range.hi),
    atOrBelow: est === null ? null : atOrBelow(est.mean * max),
    evidence,
  };
}
