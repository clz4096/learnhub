/**
 * Proof-order puzzles (`TopicContent.proofOrder`): the shuffle the learner sees, the grading
 * of the order they tap, and the record of the result as a gym item.
 *
 * The grade is the proof grader's (packages/mastery grade/proof.ts, through
 * `proofOrderSpec`), so the content checks and the app accept exactly the same orders. On
 * top of right or wrong, each position is marked, so the feedback can point at the first
 * step out of place instead of only saying "not right". Gym work never meets the gate.
 */
import { gradeProof, gymItemId, mulberry32, type Progress } from '@learnhub/mastery';
import { proofOrderAnswer, proofOrderSpec, type ProofOrder } from '@learnhub/content';
import { completeGymItem } from './learner';

/**
 * The order the steps are shown in, as indices into `steps`: a shuffle from `seed`, never
 * the right order (a puzzle already solved teaches nothing). Deterministic for a seed.
 */
export function shuffledOrder(n: number, seed: number): number[] {
  const out = Array.from({ length: n }, (_, i) => i);
  const rng = mulberry32(seed);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j] as number, out[i] as number];
  }
  // The identity, from n >= 2: rotate by one, which moves every step.
  if (n >= 2 && out.every((x, i) => x === i)) out.push(out.shift() as number);
  return out;
}

export interface OrderGrade {
  correct: boolean;
  /** For each position tapped, whether the step there is the one the proof needs there. */
  placed: boolean[];
  /** The first position (0-based) holding the wrong step, or null when all are right. */
  firstWrong: number | null;
  feedback: string;
}

/**
 * Grades the learner's order: `tapped` lists step indices in the order tapped. Every step
 * must be placed once. Never throws: a malformed order (an unknown, missing, or repeated
 * step) is wrong, with feedback that says so.
 */
export function gradeProofOrder(puzzle: ProofOrder, tapped: readonly number[]): OrderGrade {
  const n = puzzle.steps.length;
  const valid = tapped.length === n && new Set(tapped).size === n && tapped.every((i) => Number.isInteger(i) && i >= 0 && i < n);
  const g = gradeProof(proofOrderAnswer(tapped), proofOrderSpec(puzzle));
  const placed = tapped.map((step, pos) => step === pos);
  const wrongAt = placed.findIndex((ok) => !ok);
  const firstWrong = wrongAt < 0 && valid ? null : wrongAt < 0 ? Math.min(tapped.length, n - 1) : wrongAt;
  if (!valid) return { correct: false, placed, firstWrong, feedback: 'Place every step exactly once.' };
  if (g.correct) return { correct: true, placed, firstWrong: null, feedback: 'Right: every step follows from the ones before it.' };
  const right = placed.filter((x) => x).length;
  return {
    correct: false, placed, firstWrong,
    feedback: `Step ${(firstWrong ?? 0) + 1} is out of place: it needs something not shown yet, or it is not what comes next. ${right} of ${n} are in their place.`,
  };
}

/**
 * Records one proof-order puzzle done in the gym: a `gym` history entry with the item id
 * `order:topic#index`, and the gym's rule for spaced review (`recordGym`: a right order banks
 * half a repetition, a wrong one brings a review forward).
 */
export function recordProofOrder(p: Progress, topicId: string, index: number, puzzle: ProofOrder, tapped: readonly number[], ms: number | undefined, now: number): { progress: Progress; grade: OrderGrade } {
  const grade = gradeProofOrder(puzzle, tapped);
  const id = gymItemId('order', topicId, index);
  const data = ms === undefined ? { hints: 0 } : { hints: 0, ms };
  return { progress: completeGymItem(p, { kind: 'order', topicId, id }, grade.correct, data, now), grade };
}
