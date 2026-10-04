/**
 * The content of one topic, keyed by its id in the shared graph (graph/src/topics):
 * a lesson written from scratch, worked examples, problem generators, a mastery rule,
 * and the glossary terms it introduces.
 */
import type { Rng } from '@learnhub/mastery';
import type { Rational } from './math';
import { answerText, type Generator, type Instance } from './problem';
import type { Rich } from './rich';

export type Block =
  | { kind: 'p'; text: Rich }
  /** A displayed formula or rule, set apart from the text. */
  | { kind: 'rule'; text: Rich }
  | { kind: 'list'; items: readonly Rich[] }
  | { kind: 'table'; caption: Rich; head: readonly Rich[]; rows: readonly (readonly Rich[])[] }
  /** Two overlapping circles in a box, each region labelled with what is in it. */
  | { kind: 'venn'; caption: Rich; a: string; b: string; onlyA: Rich; both: Rich; onlyB: Rich; neither: Rich };

export interface WorkedExample {
  title: Rich;
  prompt: Rich;
  steps: readonly Rich[];
  answer: Rich;
  /** The problem it was made from, so the content checks grade it like any other. */
  instance: Instance;
}

/**
 * A topic is mastered after `correctInARow` right answers in a row in its practice. After
 * `maxProblems` without that, the lesson ends as not passed for today: the topic stays on
 * the frontier, and the engine checks the prerequisites it leans on hardest.
 */
export interface MasteryRule {
  correctInARow: number;
  maxProblems: number;
}

/** A probability the lesson states, checked exactly and by Monte Carlo in the content checks. */
export interface ProbabilityClaim {
  what: string;
  exact: Rational;
  trial: (rng: Rng) => boolean;
}

export interface TopicContent {
  topicId: string;
  /** One sentence: what the learner will be able to do. */
  goal: Rich;
  lesson: readonly Block[];
  examples: readonly WorkedExample[];
  generators: readonly Generator[];
  mastery: MasteryRule;
  /** Glossary ids the lesson introduces. */
  terms: readonly string[];
  claims?: readonly ProbabilityClaim[];
}

/** A worked example from a generator and fixed parameters, so its numbers are computed and checked like any problem. */
export function worked<P>(g: Generator<P>, p: P, title: Rich): WorkedExample {
  const instance = g.at(p);
  const { problem } = instance;
  return { title, prompt: problem.prompt, steps: problem.solution, answer: answerText(problem.answer), instance };
}

export const DEFAULT_MASTERY: Readonly<MasteryRule> = { correctInARow: 3, maxProblems: 10 };
