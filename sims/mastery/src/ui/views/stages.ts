/**
 * The four stages of the course in plain words (mastery/design-v4.html, "Course"): the
 * book's years under the names a newcomer understands, what each covers, and its main
 * courses. Chapter titles that carry an exam's or course code's name get a plain name and
 * a small tag that explains the code on hover.
 */
import type { BookYear } from '@learnhub/content/book';

export interface Stage {
  n: string;
  name: string;
  what: string;
  /** Main courses, as the book titles them. */
  peek: readonly string[];
}

export const STAGES: Readonly<Record<string, Stage>> = {
  prep: { n: '01', name: 'Getting in', what: 'The maths and computing to win a place.', peek: ['Problem solving', 'Proof', 'Functional programming'] },
  IA: { n: '02', name: 'First year', what: 'Probability, analysis, algebra, first computer science courses.', peek: ['Analysis I', 'Probability', 'Groups', 'Foundations of Computer Science', 'Algorithms 1'] },
  IB: { n: '03', name: 'Second year', what: 'Deeper maths, systems, theory of computation.', peek: ['Linear Algebra', 'Markov Chains', 'Statistics', 'Compiler Construction', 'Computer Networking'] },
  II: { n: '04', name: 'Third year', what: 'Statistics, machine learning, architecture.', peek: ['Probability and Measure', 'Machine Learning and Bayesian Inference', 'Advanced Computer Architecture', 'Part II Project and Dissertation'] },
};

export function stageOf(y: Pick<BookYear, 'id' | 'label'>): Stage {
  return STAGES[y.id] ?? { n: '', name: y.label, what: '', peek: [] };
}

const TAG_HELP: Readonly<Record<string, string>> = {
  STEP: 'STEP: the maths papers in a Cambridge Mathematics offer',
  'CS-0': 'CS-0: preparation for the Computer Science course',
};

/** A chapter title in plain words, with the exam or code it belongs to as a tag. */
export function plainChapter(title: string): { name: string; tag: string | null; help: string | null } {
  const block = /^(STEP)[^,]*, Block \d+: (.+)$/.exec(title);
  if (block !== null) return { name: block[2] as string, tag: 'STEP', help: TAG_HELP.STEP as string };
  const cs0 = /^CS-0 (.+)$/.exec(title);
  if (cs0 !== null) {
    const name = cs0[1] as string;
    return { name: name.charAt(0).toUpperCase() + name.slice(1), tag: 'CS-0', help: TAG_HELP['CS-0'] as string };
  }
  const step = /^(STEP [23]) modules$/.exec(title);
  if (step !== null) return { name: step[1] === 'STEP 2' ? 'Harder problems' : 'Hardest problems', tag: step[1] as string, help: TAG_HELP.STEP as string };
  return { name: title, tag: null, help: null };
}
