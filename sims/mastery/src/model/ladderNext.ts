/**
 * What the timed ladder (ladder.ts) puts in front of the learner: the exam to suggest, and
 * the one thing to do next on it. Today's Up next, the palette, and the ladder screen use
 * this; the rules for opening rungs stay in ladder.ts. Pure: no clock, storage, or app state.
 */
import type { RegistryPaper } from '@learnhub/content/admissions';
import { paperName, type Admissions, type Campaign } from './campaign';
import { questionsText } from './campaignPackets';
import {
  EXAMS, RUNG_NAMES, activeAttempt, attemptScore, ladderStatus, nextLadderItem, rungMinutes,
  type Exam, type LadderAttempt, type Rung,
} from './ladder';
import { unlockLine, type Readiness } from './readiness';
import type { Route } from './route';

/** The exam an attempt is on, or undefined when its paper is not in the registry. */
export function examOf(adm: Admissions, a: LadderAttempt): Exam | undefined {
  return adm.registryPaper(a.paperId)?.exam;
}

/** The exam whose ladder attempt is running, for focus mode; null when none runs. */
export function runningExam(adm: Admissions | null, attempts: readonly LadderAttempt[]): Exam | null {
  const a = activeAttempt(attempts);
  return adm === null || a === undefined ? null : examOf(adm, a) ?? null;
}

/** Finished attempts on an exam still waiting for their marks, oldest first. */
export function unmarkedAttempts(adm: Admissions, attempts: readonly LadderAttempt[], exam: Exam): LadderAttempt[] {
  return attempts.filter((a) => a.finishedAt !== null && examOf(adm, a) === exam && attemptScore(adm, a) === null);
}

/**
 * The exam to suggest: the one with an attempt running, else the one last worked on, else
 * `preferred` (the exam of the campaign's next timed paper, when there is one), else STEP.
 */
export function suggestedExam(adm: Admissions, attempts: readonly LadderAttempt[], preferred: Exam | null): Exam {
  const running = runningExam(adm, attempts);
  if (running !== null) return running;
  const last = [...attempts].sort((x, y) => y.startedAt - x.startedAt).map((a) => examOf(adm, a)).find((e) => e !== undefined);
  return last ?? preferred ?? (EXAMS[0] as Exam);
}

/** "STEP 2 2025, question 3": a paper and the questions a rung offers on it. */
export function partName(paper: RegistryPaper, rung: Rung, questions: readonly number[]): string {
  if (rung === 'full') return paperName(paper);
  if (paper.exam === 'STEP' && rung === 'half') return `${paperName(paper)}, any three questions`;
  return `${paperName(paper)}, ${questionsText(questions)}`;
}

export interface LadderNext {
  exam: Exam;
  /**
   * `running`: an attempt's clock runs; `mark`: a finished attempt waits for its marks; `sit`:
   * the next rung to sit; `locked`: the exam's topics are not ready yet (readiness.ts), and
   * the title says what unlocks the first timed question.
   */
  state: 'running' | 'mark' | 'sit' | 'locked';
  rung: Rung;
  title: string;
  /** Minutes the work takes; null for marking. */
  minutes: number | null;
  to: Route;
}

/**
 * The next thing on an exam's ladder: the running attempt, else the oldest finished one to
 * mark, else the next item on the highest open rung. The full paper is a campaign sitting,
 * so without a campaign the half paper is offered instead. With `ready` given and not met,
 * nothing is offered to sit: the `locked` state says what unlocks it. Null when every set
 * has been tried.
 */
export function ladderNext(
  adm: Admissions, c: Campaign | null, attempts: readonly LadderAttempt[], exam: Exam, ready: Readiness | null = null,
): LadderNext | null {
  const here: Route = { view: 'ladder', exam };
  const running = activeAttempt(attempts);
  if (running !== undefined && examOf(adm, running) === exam) {
    const paper = adm.registryPaper(running.paperId) as RegistryPaper;
    return { exam, state: 'running', rung: running.rung, title: partName(paper, running.rung, running.questions), minutes: rungMinutes(paper, running.rung), to: here };
  }
  const unmarked = unmarkedAttempts(adm, attempts, exam)[0];
  if (unmarked !== undefined) {
    const paper = adm.registryPaper(unmarked.paperId) as RegistryPaper;
    return { exam, state: 'mark', rung: unmarked.rung, title: partName(paper, unmarked.rung, unmarked.questions), minutes: null, to: here };
  }
  if (ready !== null && !ready.ready) return { exam, state: 'locked', rung: 'question', title: unlockLine(ready), minutes: null, to: here };
  const status = ladderStatus(adm, c, attempts, exam);
  const order: Rung[] = ['full', 'half', 'question'];
  for (const rung of order.slice(order.indexOf(status.current))) {
    if (rung === 'full' && c === null) continue;
    const next = nextLadderItem(adm, c, attempts, exam, rung);
    if (next === null) continue;
    return {
      exam, state: 'sit', rung, title: partName(next.paper, rung, next.questions), minutes: rungMinutes(next.paper, rung),
      to: rung === 'full' ? { view: 'paper', paperId: next.paper.id } : here,
    };
  }
  return null;
}

/** The line under a suggestion: "Half a paper · 90 min · timed ladder". */
export function nextDetail(n: LadderNext): string {
  if (n.state === 'locked') return 'until then: lessons, practice, and review · timed ladder';
  const what = n.state === 'running' ? 'running now' : n.state === 'mark' ? 'waiting for its marks' : `${Math.round(n.minutes ?? 0)} min`;
  return `${RUNG_NAMES[n.rung]} · ${what} · timed ladder`;
}
