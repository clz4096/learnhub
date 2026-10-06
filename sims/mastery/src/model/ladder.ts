/**
 * The timed ladder (assessment that proves learning, phase 1): for each exam (STEP, TMUA,
 * A level), three rungs of timed work on real past papers from the registry
 * (content/src/admissions), each opened by results on the one below.
 *
 * 1. `question`: one question, against the clock at the paper's own pace.
 * 2. `half`: half a paper in half the time.
 * 3. `full`: the whole paper in exam mode: a campaign sitting (campaign.ts, Paper view).
 *
 * The pace is the paper's: STEP is 180 minutes for the six answers that count, so 30 a
 * question; TMUA is 75 minutes for 20, so 3.75; an A level paper's minutes are shared
 * evenly over its questions (the registry has no per-question marks, so this is an average).
 *
 * The rungs open on results (`LADDER_RULES`):
 * - half opens after `QUESTION_PASSES` timed questions passed. A STEP or A level question
 *   passes at 14 of 20 in share, the supervision pass mark; a TMUA question when right.
 * - full opens after one timed half passed. A half passes when its mark, scaled to the
 *   whole paper, reaches the grade the typical offer asks for, on that paper's own real
 *   boundaries: grade 1 for STEP (step-results.json), A* for A level (the registry). TMUA has
 *   no official grade boundaries for past papers (the registry's gaps say so), so a TMUA half
 *   passes at the same 14 of 20 share, the app's own rule.
 * A full paper already sat in the campaign opens every rung for that exam. Nothing blocks
 * study: the campaign's Paper view can still start any paper; the ladder is the advised order.
 *
 * Only timed work counts: an attempt finished more than `LADDER_GRACE_MS` past its time is
 * kept, but does not open a rung (and the outcome model leaves it out).
 *
 * Ladder attempts live in this browser (ladderStore.ts), as the campaign does; the progress
 * document and its version are unchanged. Pure: no clock, storage, or app state.
 */
import type { RegistryPaper } from '@learnhub/content/admissions';
import { SUPERVISION_MARK_MAX, SUPERVISION_PASS_MARK } from '@learnhub/mastery';
import {
  STEP_COUNTED, STEP_MARKS_PER_QUESTION, TMUA_OPTIONS, marked, paperLink,
  type Admissions, type Campaign, type Score,
} from './campaign';

export type Exam = RegistryPaper['exam'];
export const EXAMS: readonly Exam[] = ['STEP', 'TMUA', 'A level'];
export const RUNGS = ['question', 'half', 'full'] as const;
export type Rung = (typeof RUNGS)[number];
/** The rungs a ladder attempt can be; the full paper is a campaign sitting. */
export type PartRung = Exclude<Rung, 'full'>;

/** A question passes at this share: the supervision pass mark, 14 of 20. */
export const QUESTION_PASS_SHARE = SUPERVISION_PASS_MARK / SUPERVISION_MARK_MAX;
/** Timed questions passed to open the half paper. */
export const QUESTION_PASSES = 2;
/** Timed halves passed to open the full paper. */
export const HALF_PASSES = 1;
/** A minute to press Finish after the clock runs out; later than that, the work was not timed. */
export const LADDER_GRACE_MS = 60_000;

export const RUNG_NAMES: Readonly<Record<Rung, string>> = { question: 'One question', half: 'Half a paper', full: 'The full paper' };

/** One timed attempt at part of a registry paper. Marks are absent until entered. */
export interface LadderAttempt {
  id: string;
  paperId: string;
  rung: PartRung;
  /** The question numbers offered, from 1. */
  questions: number[];
  startedAt: number;
  finishedAt: number | null;
  /** TMUA: the letter given for each offered question, null for none. */
  answers?: (string | null)[];
  /** STEP: each offered question's mark out of 20 from supervision, null for not attempted. */
  marks?: (number | null)[];
  /** A level: the mark from supervision, and what the offered questions are out of (from the mark scheme). */
  total?: number;
  outOf?: number;
}

// ---------------------------------------------------------------- the shape of a rung

/** How many of the offered questions count: STEP counts the best of those attempted, as the paper does. */
export function countedOf(paper: RegistryPaper, rung: Rung): number {
  if (paper.exam === 'STEP') return rung === 'question' ? 1 : rung === 'half' ? STEP_COUNTED / 2 : STEP_COUNTED;
  if (rung === 'question') return 1;
  return rung === 'half' ? Math.ceil(paper.questions / 2) : paper.questions;
}

/** Minutes allowed for a rung of a paper, at the paper's own pace. */
export function rungMinutes(paper: RegistryPaper, rung: Rung): number {
  if (rung === 'full') return paper.duration_minutes;
  const per = paper.exam === 'STEP' ? paper.duration_minutes / STEP_COUNTED : paper.duration_minutes / paper.questions;
  return per * countedOf(paper, rung);
}

/**
 * The question sets a rung offers on a paper, in order. A question: each question alone.
 * A STEP half: the whole paper, any three to count (the paper's own choice rule, halved).
 * A TMUA or A level half: the first half or the second half of the questions.
 */
export function rungSets(paper: RegistryPaper, rung: PartRung): number[][] {
  const all = Array.from({ length: paper.questions }, (_, i) => i + 1);
  if (rung === 'question') return all.map((q) => [q]);
  if (paper.exam === 'STEP') return [all];
  const k = countedOf(paper, 'half');
  return [all.slice(0, k), all.slice(k)].filter((s) => s.length > 0);
}

/** Papers the ladder can use for an exam: those with a published question paper, newest first, then by id. */
export function ladderPapers(adm: Admissions, exam: Exam): RegistryPaper[] {
  return adm.registry.papers
    .filter((p) => p.exam === exam && p.gap === undefined && paperLink(p) !== null)
    .sort((a, b) => b.year - a.year || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

// ---------------------------------------------------------------- scoring

const tmuaPaperNo = (paper: RegistryPaper): 1 | 2 => (paper.paper.endsWith('2') ? 2 : 1);

/** A finished attempt's mark, or null while it runs, before its marks are in, or when the paper is unknown. */
export function attemptScore(adm: Admissions, a: LadderAttempt): Score | null {
  if (a.finishedAt === null) return null;
  const paper = adm.registryPaper(a.paperId);
  if (paper === undefined) return null;
  if (paper.exam === 'TMUA') {
    const key = adm.tmuaKey(paper.year, tmuaPaperNo(paper));
    if (a.answers === undefined || key === undefined || a.answers.length !== a.questions.length) return null;
    const mark = a.questions.filter((q, i) => a.answers?.[i]?.toUpperCase() === key[q - 1]).length;
    return { mark, max: a.questions.length };
  }
  if (paper.exam === 'STEP') {
    if (a.marks === undefined || a.marks.length !== a.questions.length) return null;
    const k = countedOf(paper, a.rung);
    const mark = a.marks.filter((m): m is number => m !== null).sort((x, y) => y - x).slice(0, k).reduce((s, m) => s + m, 0);
    return { mark, max: k * STEP_MARKS_PER_QUESTION };
  }
  if (a.total === undefined || a.outOf === undefined) return null;
  return { mark: a.total, max: a.outOf };
}

/** Whether a finished attempt kept to its time, with `LADDER_GRACE_MS` to press Finish. */
export function isTimed(minutes: number, startedAt: number, finishedAt: number | null): boolean {
  return finishedAt !== null && finishedAt - startedAt <= minutes * 60_000 + LADDER_GRACE_MS;
}

/**
 * The share of the whole paper that a half must reach to open the full paper: the grade the
 * typical offer asks for, on that paper's real boundaries; null when the paper has none.
 */
export function halfPassShare(adm: Admissions, paper: RegistryPaper): number | null {
  if (paper.exam === 'STEP') {
    const r = adm.stepPaperResults(paper.year, paper.paper as 'STEP 2' | 'STEP 3');
    return r === undefined ? null : r.boundaries['1'] / r.max_mark;
  }
  if (paper.exam === 'A level') {
    const b = paper.boundaries;
    return b === undefined || !('max_mark' in b) ? null : b['A*'] / b.max_mark;
  }
  return QUESTION_PASS_SHARE;
}

/** Whether a scored attempt passes its rung (see the file comment). */
export function attemptPasses(adm: Admissions, a: LadderAttempt, score: Score): boolean {
  const paper = adm.registryPaper(a.paperId);
  if (paper === undefined || score.max <= 0) return false;
  const share = score.mark / score.max;
  if (a.rung === 'question') return share >= QUESTION_PASS_SHARE;
  const need = halfPassShare(adm, paper);
  return need !== null && share >= need;
}

export interface LadderResult {
  attempt: LadderAttempt;
  paper: RegistryPaper;
  score: Score;
  timed: boolean;
  passed: boolean;
}

/** The marked attempts on an exam's papers, oldest first, with whether each was timed and passed. */
export function ladderResults(adm: Admissions, attempts: readonly LadderAttempt[], exam: Exam): LadderResult[] {
  const out: LadderResult[] = [];
  for (const a of attempts) {
    const paper = adm.registryPaper(a.paperId);
    const score = attemptScore(adm, a);
    if (paper === undefined || paper.exam !== exam || score === null) continue;
    const timed = isTimed(rungMinutes(paper, a.rung), a.startedAt, a.finishedAt);
    out.push({ attempt: a, paper, score, timed, passed: timed && attemptPasses(adm, a, score) });
  }
  return out.sort((x, y) => x.attempt.startedAt - y.attempt.startedAt);
}

// ---------------------------------------------------------------- the ladder

export interface RungStatus {
  rung: Rung;
  open: boolean;
  /** Timed results on this rung. */
  done: number;
  /** Of those, passed; for the full paper, timed sittings marked. */
  passed: number;
  /** Passes on this rung that open the next; null for the full paper. */
  need: number | null;
  /** Why it is closed, in a sentence; null when open. */
  why: string | null;
}

export interface LadderStatus {
  exam: Exam;
  rungs: RungStatus[];
  /** The highest open rung: where to work now. */
  current: Rung;
}

/** The full-paper sittings of an exam in the campaign that were marked and kept to time. */
export function timedSittings(adm: Admissions, c: Campaign | null, exam: Exam): ReturnType<typeof marked> {
  if (c === null) return [];
  return marked(adm, c).filter((x) => x.paper.exam === exam && isTimed(x.paper.duration_minutes, x.s.startedAt, x.s.finishedAt));
}

/** Where the learner stands on an exam's ladder. */
export function ladderStatus(adm: Admissions, c: Campaign | null, attempts: readonly LadderAttempt[], exam: Exam): LadderStatus {
  const results = ladderResults(adm, attempts, exam);
  const fullSat = c === null ? 0 : marked(adm, c).filter((x) => x.paper.exam === exam).length;
  const timedFull = timedSittings(adm, c, exam).length;
  const on = (r: PartRung): LadderResult[] => results.filter((x) => x.attempt.rung === r && x.timed);
  const q = on('question');
  const h = on('half');
  const qPassed = q.filter((x) => x.passed).length;
  const hPassed = h.filter((x) => x.passed).length;
  const halfOpen = fullSat > 0 || qPassed >= QUESTION_PASSES;
  const fullOpen = fullSat > 0 || hPassed >= HALF_PASSES;
  const halfRule = exam === 'STEP' ? 'grade 1 on that year\'s boundaries' : exam === 'A level' ? 'A* on that paper\'s boundaries' : `${SUPERVISION_PASS_MARK} of ${SUPERVISION_MARK_MAX} in share`;
  const rungs: RungStatus[] = [
    { rung: 'question', open: true, done: q.length, passed: qPassed, need: QUESTION_PASSES, why: null },
    {
      rung: 'half', open: halfOpen, done: h.length, passed: hPassed, need: HALF_PASSES,
      why: halfOpen ? null : `Opens after ${QUESTION_PASSES} timed questions passed (${exam === 'TMUA' ? 'answered right' : `${SUPERVISION_PASS_MARK} of ${SUPERVISION_MARK_MAX} or better`}); ${qPassed} so far.`,
    },
    {
      rung: 'full', open: fullOpen, done: timedFull, passed: timedFull, need: null,
      why: fullOpen ? null : `Opens after a timed half paper reaches ${halfRule}, scaled to the whole paper.`,
    },
  ];
  return { exam, rungs, current: fullOpen ? 'full' : halfOpen ? 'half' : 'question' };
}

/**
 * What to sit next on a rung: the newest paper with a question set not yet attempted on
 * this rung, and that set; null when every set has been tried. For the full paper, the
 * newest paper with no campaign sitting.
 */
export function nextLadderItem(
  adm: Admissions, c: Campaign | null, attempts: readonly LadderAttempt[], exam: Exam, rung: Rung,
): { paper: RegistryPaper; questions: number[] } | null {
  const papers = ladderPapers(adm, exam);
  if (rung === 'full') {
    const sat = new Set(c?.sittings.map((s) => s.paperId) ?? []);
    const p = papers.find((x) => !sat.has(x.id));
    return p === undefined ? null : { paper: p, questions: Array.from({ length: p.questions }, (_, i) => i + 1) };
  }
  const used = new Set(attempts.filter((a) => a.rung === rung).map((a) => `${a.paperId}#${a.questions.join(',')}`));
  for (const p of papers) {
    const set = rungSets(p, rung).find((s) => !used.has(`${p.id}#${s.join(',')}`));
    if (set !== undefined) return { paper: p, questions: set };
  }
  return null;
}

// ---------------------------------------------------------------- changes

/** The attempt in progress, if any: one at a time. */
export function activeAttempt(attempts: readonly LadderAttempt[]): LadderAttempt | undefined {
  return attempts.find((a) => a.finishedAt === null);
}

/** Starts an attempt; unchanged while another runs, or when the set is not one the rung offers on that paper. */
export function startAttempt(adm: Admissions, attempts: readonly LadderAttempt[], paperId: string, rung: PartRung, questions: readonly number[], now: number): LadderAttempt[] {
  const paper = adm.registryPaper(paperId);
  if (paper === undefined || activeAttempt(attempts) !== undefined) return [...attempts];
  if (!rungSets(paper, rung).some((s) => s.join(',') === questions.join(','))) return [...attempts];
  return [...attempts, { id: `${paperId}/${rung}/${questions.join('-')}@${now}`, paperId, rung, questions: [...questions], startedAt: now, finishedAt: null }];
}

export function finishAttempt(attempts: readonly LadderAttempt[], id: string, now: number): LadderAttempt[] {
  return attempts.map((a) => (a.id === id && a.finishedAt === null ? { ...a, finishedAt: now } : a));
}

/**
 * Records a finished attempt's marks, checked against its paper; a running attempt, or marks
 * that do not fit (wrong length, out of range), leave it unchanged.
 */
export function recordAttemptMarks(
  adm: Admissions, attempts: readonly LadderAttempt[], id: string, m: Pick<LadderAttempt, 'answers' | 'marks' | 'total' | 'outOf'>,
): LadderAttempt[] {
  return attempts.map((a) => {
    if (a.id !== id || a.finishedAt === null) return a;
    const paper = adm.registryPaper(a.paperId);
    if (paper === undefined) return a;
    const next = clean({ ...stripMarks(a), ...m }, paper);
    return next ?? a;
  });
}

export function removeAttempt(attempts: readonly LadderAttempt[], id: string): LadderAttempt[] {
  return attempts.filter((a) => a.id !== id);
}

const stripMarks = (a: LadderAttempt): LadderAttempt => ({ id: a.id, paperId: a.paperId, rung: a.rung, questions: a.questions, startedAt: a.startedAt, finishedAt: a.finishedAt });

/** The attempt with only the marks its paper takes, each valid; null when a given mark is invalid. */
function clean(a: LadderAttempt, paper: RegistryPaper): LadderAttempt | null {
  const out = stripMarks(a);
  const n = a.questions.length;
  if (paper.exam === 'TMUA') {
    if (a.answers === undefined) return out;
    if (a.answers.length !== n || !a.answers.every((x) => x === null || TMUA_OPTIONS.includes(x))) return null;
    return { ...out, answers: [...a.answers] };
  }
  if (paper.exam === 'STEP') {
    if (a.marks === undefined) return out;
    if (a.marks.length !== n || !a.marks.every((x) => x === null || (Number.isInteger(x) && x >= 0 && x <= STEP_MARKS_PER_QUESTION))) return null;
    return { ...out, marks: [...a.marks] };
  }
  if (a.total === undefined && a.outOf === undefined) return out;
  const { total, outOf } = a;
  if (total === undefined || outOf === undefined || !Number.isInteger(total) || !Number.isInteger(outOf) || outOf < 1 || outOf > paper.total_marks || total < 0 || total > outOf) return null;
  return { ...out, total, outOf };
}

// ---------------------------------------------------------------- storage

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isTime = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * Stored attempts, or none when the text is missing or unreadable. An attempt that is not
 * well formed, names a paper not in the registry, or offers a set its rung does not, is
 * dropped; invalid marks are dropped from an otherwise good attempt.
 */
export function parseLadder(adm: Admissions, raw: string | null): LadderAttempt[] {
  if (raw === null) return [];
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(v)) return [];
  const out: LadderAttempt[] = [];
  const ids = new Set<string>();
  for (const x of v) {
    if (!isObj(x) || typeof x.id !== 'string' || ids.has(x.id) || typeof x.paperId !== 'string' || (x.rung !== 'question' && x.rung !== 'half')) continue;
    if (!isTime(x.startedAt) || (x.finishedAt !== null && !isTime(x.finishedAt))) continue;
    if (!Array.isArray(x.questions) || !x.questions.every((q) => Number.isInteger(q))) continue;
    const paper = adm.registryPaper(x.paperId);
    const questions = x.questions as number[];
    if (paper === undefined || !rungSets(paper, x.rung).some((s) => s.join(',') === questions.join(','))) continue;
    const a: LadderAttempt = { id: x.id, paperId: x.paperId, rung: x.rung, questions: [...questions], startedAt: x.startedAt, finishedAt: x.finishedAt as number | null };
    const withMarks: LadderAttempt = { ...a };
    if (Array.isArray(x.answers)) withMarks.answers = x.answers as (string | null)[];
    if (Array.isArray(x.marks)) withMarks.marks = x.marks as (number | null)[];
    if (typeof x.total === 'number') withMarks.total = x.total;
    if (typeof x.outOf === 'number') withMarks.outOf = x.outOf;
    out.push(clean(withMarks, paper) ?? a);
    ids.add(x.id);
  }
  return out;
}
