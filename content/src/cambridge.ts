/**
 * Cambridge problems (mastery/DESIGN-CAMBRIDGE-CONTENT.md): the original problems of the
 * sources, retyped from the PDFs and reworded where needed, each with its citation.
 *
 * A problem whose answer is a value, an expression, a witness, a table, or a formula is
 * auto-checked: it is an `Instance` like any generated problem, so the same graders and
 * content checks apply, and its reference answer is computed by code. A problem whose
 * answer is a proof, an explanation, or a sketch is a supervision problem: the learner
 * writes it up for a supervision session (build step 3 wires the copy and paste).
 *
 * Where an official answer exists (the STEP hints, the Book of Proof solutions to odd
 * exercises, the CST 2023-24 solutions to the same sheet), it is recorded as printed, and
 * the content checks compare it with the computed answer. A disagreement is recorded with
 * the reason, never silently fixed.
 */
import type { AnswerSpec, Instance, Misconception, Problem, Response } from './problem';
import type { Rich } from './rich';

/** The documents of batch 1 that problems cite, by their id in scripts/sources/batch-1.json. */
export const CITED_DOCS = {
  'step-f05': 'STEP Support Assignment 5',
  'step-f06': 'STEP Support Assignment 6',
  'step-f07': 'STEP Support Assignment 7',
  'step-f08': 'STEP Support Assignment 8',
  'step-f12': 'STEP Support Assignment 12',
  'step-f19': 'STEP Support Assignment 19',
  'step-f05-hints': 'STEP Support Assignment 5, Hints and Partial Solutions',
  'step-f06-hints': 'STEP Support Assignment 6, Hints and Partial Solutions',
  'step-f07-hints': 'STEP Support Assignment 7, Hints and Partial Solutions',
  'step-f08-hints': 'STEP Support Assignment 8, Hints and Partial Solutions',
  'step-f12-hints': 'STEP Support Assignment 12, Hints and Partial Solutions',
  'step-f19-hints': 'STEP Support Assignment 19, Hints and Partial Solutions',
  'ia-prob-sheet-1': 'IA Probability Example Sheet 1',
  'cst-dm-notes': 'CST Discrete Mathematics notes',
  'cst-dm-sw1': 'CST Discrete Mathematics supervision exercises',
  'cst-dm-sols-2324-1': 'CST Discrete Mathematics Exercises 1, official solutions (2023-24)',
  'cst-dm-sols-2324-2': 'CST Discrete Mathematics Exercises 2, official solutions (2023-24)',
  'cst-dm-sols-2324-3': 'CST Discrete Mathematics Exercises 3, official solutions (2023-24)',
  'cst-dm-sols-2324-4': 'CST Discrete Mathematics Exercises 4, official solutions (2023-24)',
  bop: 'Book of Proof',
  'tmua-logic-proof': 'TMUA Notes on Logic and Proof',
  'tripos-schedules': 'Mathematical Tripos schedules 2026-27',
  // Batch 2 (scripts/sources/batch-2.json): statistics and IA Probability sheets 2 to 4.
  'step-mixed-stats1': 'STEP Support Mixed STEP 1 Statistics',
  'step-mixed-stats1-hints': 'STEP Support Mixed STEP 1 Statistics, Hints and Feedback',
  'step-s2-stats': 'STEP Support STEP 2 Statistics',
  'step-s2-stats-notes': 'STEP Support STEP 2 Statistics, Topic Notes',
  'step-s2-stats-hints': 'STEP Support STEP 2 Statistics, Hints',
  'step-s2-stats-solutions': 'STEP Support STEP 2 Statistics, Solutions',
  'step-s3-stats': 'STEP Support STEP 3 Statistics',
  'step-s3-stats-notes': 'STEP Support STEP 3 Statistics, Topic Notes',
  'step-s3-stats-hints': 'STEP Support STEP 3 Statistics, Hints',
  'step-s3-stats-solutions': 'STEP Support STEP 3 Statistics, Solutions',
  'ia-prob-sheet-2': 'IA Probability Example Sheet 2',
  'ia-prob-sheet-3': 'IA Probability Example Sheet 3',
  'ia-prob-sheet-4': 'IA Probability Example Sheet 4',
} as const;

export type CitedDoc = keyof typeof CITED_DOCS;

export interface Citation {
  /** The source id in scripts/sources/batch-1.json (and so in sources/manifest.json). */
  doc: CitedDoc;
  /** Where in the document, as the learner would look it up: "Q4(ii)", "Exercises 3, 3.1.1", "Section 2.5, exercise 3". */
  at: string;
  /** The problem is reworded or adapted, not only retyped. */
  adapted?: boolean;
}

export function cite(doc: CitedDoc, at: string, adapted = false): Citation {
  return adapted ? { doc, at, adapted } : { doc, at };
}

/** "STEP Support Assignment 6, Q4(ii)", with "adapted from" when it is. */
export function citationText(c: Citation): string {
  const where = `${CITED_DOCS[c.doc]}, ${c.at}`;
  return c.adapted === true ? `Adapted from ${where}` : where;
}

/** The official answer as printed, and whether the computed answer agrees with it. */
export interface Official {
  /** The hints or solutions document and place. */
  source: Citation;
  /** The answer as printed, typed in the problem's answer syntax. */
  answer: Response;
  /** False only for a recorded mismatch, with `note` saying which is right and why. */
  agrees: boolean;
  note?: string;
}

interface CambridgeBase {
  /** Unique within the topic, for example "a6-q4-ii". */
  id: string;
  source: Citation;
  /** Short title, for lists. */
  title: Rich;
}

export interface AutoProblem extends CambridgeBase {
  mode: 'auto';
  instance: Instance;
  /**
   * Checks the expected answer by code, independently of how it was written: brute force,
   * exact arithmetic, or a second method. Null when it holds, else what is wrong. Run by
   * the content checks.
   */
  verify: () => string | null;
  official?: Official;
}

export type WriteUp = 'proof' | 'explanation' | 'sketch';

export interface SupervisionProblem extends CambridgeBase {
  mode: 'supervision';
  prompt: Rich;
  /** What the learner writes. */
  writeUp: WriteUp;
  /** Where the official hints or solution are, for the supervisor; never shown before an attempt. */
  official?: Citation;
}

export type CambridgeProblem = AutoProblem | SupervisionProblem;

export interface AutoSpec {
  id: string;
  source: Citation;
  title: Rich;
  prompt: Rich;
  answer: AnswerSpec;
  solution: readonly Rich[];
  /** A right answer as the learner would type it; the content checks grade it. */
  reference: Response;
  /** See `AutoProblem.verify`. */
  verify: () => string | null;
  misconceptions?: readonly Misconception[];
  official?: Official;
}

/** An auto-checked Cambridge problem, as an instance the graders and checks treat like any other. */
export function auto(spec: AutoSpec): AutoProblem {
  const problem: Problem = { prompt: spec.prompt, answer: spec.answer, solution: spec.solution };
  const instance: Instance = {
    generatorId: `cambridge.${spec.id}`,
    problem,
    reference: spec.reference,
    misconceptions: spec.misconceptions ?? [],
    saneError: null,
  };
  const out: AutoProblem = { id: spec.id, source: spec.source, title: spec.title, mode: 'auto', instance, verify: spec.verify };
  if (spec.official !== undefined) out.official = spec.official;
  return out;
}

/** Null when `got` equals `want` (compared as text), else a message for the content checks. */
export function same(what: string, got: unknown, want: unknown): string | null {
  return String(got) === String(want) ? null : `${what}: computed ${String(got)}, expected ${String(want)}`;
}

export function supervision(spec: Omit<SupervisionProblem, 'mode'>): SupervisionProblem {
  return { ...spec, mode: 'supervision' };
}
