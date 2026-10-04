/**
 * Multiple choice, single or multiple answer. Options are ids (for example "a", "b"), so
 * the grader never compares display text.
 */
import { problemError, type GradeResult } from './types';

export interface ChoiceSpec {
  options: readonly string[];
  /** One id for single answer; an array (possibly of one) for "choose all that apply". */
  correct: string | readonly string[];
}

/**
 * Right when the chosen set equals the correct set exactly. Duplicate picks count once.
 * A pick that is not an option is malformed input, reported as such rather than as wrong.
 */
export function gradeChoice(answer: string | readonly string[], spec: ChoiceSpec): GradeResult {
  const want = typeof spec.correct === 'string' ? [spec.correct] : [...spec.correct];
  const raw = typeof answer === 'string' ? answer : answer.join(', ');
  if (new Set(spec.options).size !== spec.options.length) return problemError('duplicate option ids', raw);
  if (want.length === 0 || want.some((w) => !spec.options.includes(w))) return problemError('a correct answer is not one of the options', raw);

  const picks = typeof answer === 'string' ? [answer.trim()] : answer.map((a) => a.trim());
  const unknown = picks.filter((p) => !spec.options.includes(p));
  if (unknown.length > 0) {
    return { correct: false, feedback: `"${unknown[0]}" is not one of the options.`, normalizedAnswer: raw.trim() };
  }
  const chosen = spec.options.filter((o) => picks.includes(o));
  const normalizedAnswer = chosen.join(', ');
  if (chosen.length === 0) return { correct: false, feedback: 'Choose an option.', normalizedAnswer };
  if (typeof spec.correct === 'string' && chosen.length > 1) {
    return { correct: false, feedback: 'Choose one option.', normalizedAnswer };
  }
  const correct = chosen.length === want.length && want.every((w) => chosen.includes(w));
  return { correct, normalizedAnswer };
}
