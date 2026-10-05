/**
 * The content of one topic, keyed by its id in the shared graph (graph/src/topics): a
 * lesson written from the Cambridge sources, worked examples (real Cambridge problems
 * worked in full), problem generators (variants built from the structure of the Cambridge
 * problems), the original Cambridge problems, a mastery rule, and the glossary terms it
 * introduces.
 */
import type { Rng } from '@learnhub/mastery';
import type { AutoProblem, CambridgeProblem, Citation } from './cambridge';
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
  /**
   * The problem it was made from, so the content checks grade it like any other. Absent
   * only for a Cambridge proof, whose answer is the argument in the steps.
   */
  instance?: Instance;
  /** The Cambridge problem it works, when it is one. */
  source?: Citation;
  /** The auto-checked Cambridge problem it was made from, so the content checks verify its answer and compare the official one. */
  problem?: AutoProblem;
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
  /** The original Cambridge problems for practice, auto-checked or for supervision. None is also a worked example. */
  cambridge: readonly CambridgeProblem[];
}

/** A worked example from a generator and fixed parameters, so its numbers are computed and checked like any problem. */
export function worked<P>(g: Generator<P>, p: P, title: Rich): WorkedExample {
  const instance = g.at(p);
  const { problem } = instance;
  return { title, prompt: problem.prompt, steps: problem.solution, answer: answerText(problem.answer), instance };
}

/** A Cambridge problem worked in full as an example: its prompt, its solution as the steps, and its answer. */
export function workedCambridge(p: AutoProblem): WorkedExample {
  const { problem } = p.instance;
  return { title: p.title, prompt: problem.prompt, steps: problem.solution, answer: answerText(problem.answer), instance: p.instance, source: p.source, problem: p };
}

/** A Cambridge proof worked in full: the argument is the steps, and the answer is what it proves. */
export function workedProof(e: { title: Rich; prompt: Rich; steps: readonly Rich[]; answer: Rich; source: Citation }): WorkedExample {
  return { ...e };
}

export const DEFAULT_MASTERY: Readonly<MasteryRule> = { correctInARow: 3, maxProblems: 10 };
