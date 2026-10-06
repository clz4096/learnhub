/**
 * The content of one topic, keyed by its id in the shared graph (graph/src/topics): a
 * lesson written from the Cambridge sources, worked examples (real Cambridge problems
 * worked in full), problem generators (variants built from the structure of the Cambridge
 * problems), the original Cambridge problems, a mastery rule, and the glossary terms it
 * introduces.
 */
import type { ProofSpec, Rng } from '@learnhub/mastery';
import type { AutoProblem, CambridgeProblem, Citation } from './cambridge';
import type { Rational } from './math';
import { answerText, type Generator, type Instance, type Problem, type Response } from './problem';
import type { Rich } from './rich';

/**
 * An in-lesson quick check (TEACHING-STYLE.md, "Check yourself"): one short question,
 * marked by the same graders as practice, with one line on why the answer is right. It
 * does not count towards mastery.
 */
export interface QuickCheck {
  kind: 'check';
  problem: Problem;
  /** A right answer as the learner would type it; the content checks grade it. */
  reference: Response;
  /** One line, shown after any answer: why the answer is what it is. */
  why: Rich;
}

/**
 * A "why?" expander (TEACHING-STYLE.md, "No skipped steps"): a question a reader may have
 * at this point, and its answer. Collapsed until opened, so the main flow stays short.
 */
export interface Why {
  q: Rich;
  a: Rich;
}

/** One numbered step of an argument. */
export interface Step {
  /** Short, shown bold: what the step does ("Square both sides"). */
  label: Rich;
  /** The step itself: in a proof, the formal mathematical line (TEACHING-STYLE.md, "Formal first, then plain words"). */
  text: Rich;
  /** The step's result as a display equation, centred under the text. */
  eq?: Rich;
  /** The step in plain words, shown muted under it. */
  plain?: Rich;
  why?: Why;
}

export type Block =
  /** The opening (TEACHING-STYLE.md, "The hook"): a question, puzzle, or surprising fact, 2 to 4 sentences. */
  | { kind: 'hook'; text: Rich }
  /**
   * The start of a named section of the lesson ("The idea", "Is root two a fraction?"),
   * shown as a heading with its name only. A lesson is read one section at a time, and the
   * header lists the sections as its outline (`lessonSections`). Formal objects are
   * numbered within their section (`formalNumbers`).
   */
  | { kind: 'section'; title: Rich }
  /** The voice between the formal objects (TEACHING-STYLE.md, "How it looks"): a conversational paragraph in the reading serif. */
  | { kind: 'narrative'; text: Rich }
  | { kind: 'p'; text: Rich; why?: Why }
  /** A displayed formula or rule, set apart from the text. */
  | { kind: 'rule'; text: Rich; why?: Why }
  /**
   * An argument of more than three moves, as numbered steps (TEACHING-STYLE.md, "No skipped
   * steps"). `proof`: the steps are a proof, shown after "Proof." and ending with a right-aligned ∎.
   */
  | { kind: 'steps'; steps: readonly Step[]; proof?: boolean }
  /**
   * A definition stated formally, as the Cambridge notes would, then in plain words
   * (TEACHING-STYLE.md, "Formal first"). Shown as "Definition 2.1 (name)." with the defined
   * terms (glossary marks) in italics. Numbered with theorems (`formalNumbers`).
   */
  | { kind: 'definition'; name: Rich; formal: Rich; plain: Rich }
  /** A theorem, stated precisely with every hypothesis. Shown as "Theorem 2.3." with the statement in italics. */
  | { kind: 'theorem'; name?: Rich; statement: Rich }
  | { kind: 'list'; items: readonly Rich[] }
  | { kind: 'table'; caption: Rich; head: readonly Rich[]; rows: readonly (readonly Rich[])[] }
  /** Two overlapping circles in a box, each region labelled with what is in it. */
  | { kind: 'venn'; caption: Rich; a: string; b: string; onlyA: Rich; both: Rich; onlyB: Rich; neither: Rich }
  | QuickCheck
  /** Where it breaks (TEACHING-STYLE.md): a tempting claim that is false, and the counterexample that shows it. */
  | { kind: 'pitfall'; claim: Rich; counterexample: Rich }
  /** The closing line (TEACHING-STYLE.md, "The one-line takeaway"): what to remember, in one sentence. */
  | { kind: 'takeaway'; text: Rich };

/** A recall card for gym mode: a definition or theorem statement to recall, and the answer. The learner marks it. */
export interface RecallCard {
  front: Rich;
  back: Rich;
}

/**
 * A tap-to-order proof puzzle for gym mode: the steps of a short proof in their right
 * order. The app shuffles them; the learner taps them back into order.
 */
export interface ProofOrder {
  title: Rich;
  /** At least three steps, in the order the proof needs them. */
  steps: readonly Rich[];
}

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
  /** What the examiner looks for in this answer (TEACHING-STYLE.md, "The Cambridge problem, worked"), shown under the example. */
  examiner?: Rich;
}

/**
 * A topic's practice is passed after `correctInARow` right answers in a row. After
 * `maxProblems` without that, the lesson ends as not passed for today: the topic stays on
 * the frontier, and the engine checks the prerequisites it leans on hardest. Passing the
 * practice makes the topic learned; it is mastered once its gate is met as well
 * (`TopicContent.gate`).
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
  /**
   * The lesson header's "You'll learn" (TEACHING-STYLE.md, "How it looks"): one short
   * sentence, what the learner will be able to do. The header shows `goal` when absent.
   */
  objective?: Rich;
  /** The lesson header's "Why": one short sentence, why it matters and what it leads to next. */
  why?: Rich;
  /** Minutes the lesson takes, for the header; the graph topic's estimate when absent. */
  minutes?: number;
  lesson: readonly Block[];
  examples: readonly WorkedExample[];
  generators: readonly Generator[];
  mastery: MasteryRule;
  /** Glossary ids the lesson introduces. */
  terms: readonly string[];
  claims?: readonly ProbabilityClaim[];
  /** The original Cambridge problems for practice, auto-checked or for supervision. None is also a worked example. */
  cambridge: readonly CambridgeProblem[];
  /**
   * The Cambridge gate: ids of problems in `cambridge`, any one of which, done to standard,
   * completes mastery (an auto-checked one solved unaided, or a supervised write-up marked
   * 14 or more of 20; packages/mastery/src/gate.ts). Prefer multi-part problems. Empty only
   * while no Cambridge-standard problem is written for the topic: then it cannot be mastered.
   */
  gate: readonly string[];
  /** Recall cards for gym mode: definitions and theorem statements. */
  recall?: readonly RecallCard[];
  /** Tap-to-order proof puzzles for gym mode. */
  proofOrder?: readonly ProofOrder[];
}

/**
 * Each block's number among the lesson's formal objects, or null for any other block.
 * Definitions and theorems share one counter, as amsthm does. In a lesson with sections
 * the counter restarts at each section and a number reads section.n ("2.3", the third in
 * the second section); without sections it is n. The content checks start a lesson with
 * sections with a section, so no number is ambiguous.
 */
export function formalNumbers(lesson: readonly Block[]): (string | null)[] {
  const sectioned = lesson.some((b) => b.kind === 'section');
  let section = 0;
  let n = 0;
  return lesson.map((b) => {
    if (b.kind === 'section') {
      section++;
      n = 0;
      return null;
    }
    if (b.kind !== 'definition' && b.kind !== 'theorem') return null;
    n++;
    return sectioned ? `${section}.${n}` : String(n);
  });
}

/** One named section of a lesson: its title (null for a lesson written before sections) and its blocks. */
export interface LessonSection {
  title: Rich | null;
  /** Indices into `TopicContent.lesson`, so a block keeps its formal number. */
  start: number;
  blocks: readonly Block[];
}

/**
 * The lesson as its sections, in order: each `section` block starts one, with the blocks up
 * to the next. A lesson with no section blocks is one untitled section; blocks before the
 * first section block (which the content checks rule out) form an untitled first section.
 */
export function lessonSections(lesson: readonly Block[]): LessonSection[] {
  const out: { title: Rich | null; start: number; blocks: Block[] }[] = [];
  lesson.forEach((b, i) => {
    if (b.kind === 'section') out.push({ title: b.title, start: i + 1, blocks: [] });
    else if (out.length === 0) out.push({ title: null, start: i, blocks: [b] });
    else (out[out.length - 1] as { blocks: Block[] }).blocks.push(b);
  });
  return out.length === 0 ? [{ title: null, start: 0, blocks: [] }] : out;
}

/**
 * The documents whose problems are of Cambridge standard: STEP (with the STEP topic notes),
 * the IA Probability sheets, and the CST Discrete Mathematics exercises. Book of Proof and
 * the TMUA notes are good practice but easier; the schedules state a course, not problems.
 */
export const GATE_DOCS: ReadonlySet<string> = new Set([
  'step-f05', 'step-f06', 'step-f07', 'step-f08', 'step-f12', 'step-f19',
  'ia-prob-sheet-1', 'ia-prob-sheet-2', 'ia-prob-sheet-3', 'ia-prob-sheet-4',
  'cst-dm-notes', 'cst-dm-sw1',
  'step-mixed-stats1', 'step-s2-stats', 'step-s2-stats-notes', 'step-s3-stats', 'step-s3-stats-notes',
]);

/** The ids of a topic's Cambridge problems from a Cambridge-standard document (`GATE_DOCS`): the default gate. */
export function gateCandidates(cambridge: readonly CambridgeProblem[]): string[] {
  return cambridge.filter((p) => GATE_DOCS.has(p.source.doc)).map((p) => p.id);
}

/** A quick check from a generator and fixed parameters, so its numbers are computed and checked like any problem. */
export function checkFrom<P>(g: Generator<P>, p: P, why: Rich): QuickCheck {
  const instance = g.at(p);
  return { kind: 'check', problem: instance.problem, reference: instance.reference, why };
}

/** A quick check written directly; the content checks grade `reference` against `answer`. */
export function quickCheck(spec: { prompt: Rich; answer: Problem['answer']; reference: Response; why: Rich; solution?: readonly Rich[] }): QuickCheck {
  return { kind: 'check', problem: { prompt: spec.prompt, answer: spec.answer, solution: spec.solution ?? [] }, reference: spec.reference, why: spec.why };
}

/**
 * A proof order as the proof grader's spec: steps "s1", "s2", and so on, each after the one
 * before, so the only accepted order is the given one. Answer with `proofOrderAnswer`.
 */
export function proofOrderSpec(p: ProofOrder): ProofSpec {
  return { steps: p.steps.map((_, i) => (i === 0 ? { id: 's1' } : { id: `s${i + 1}`, after: [`s${i}`] })) };
}

/** The learner's order (indices into `steps`, as tapped) as a proof answer for `proofOrderSpec`. */
export function proofOrderAnswer(order: readonly number[]): { order: string[] } {
  return { order: order.map((i) => `s${i + 1}`) };
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
