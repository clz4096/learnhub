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

/** The documents that problems cite, by their id in scripts/sources/batch-1.json, batch-2.json, batch-6.json, batch-7.json, batch-8.json, or batch-9.json. */
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
  // Preparation, Stage A (graph/reviews/cambridge-prep.md): the other Foundation assignments
  // (batch 1 scans), and batch 6 (scripts/sources/batch-6.json): their hints, the TMUA
  // specification and notes, the NST Maths Workbook, CS3110, and the FoCS notes.
  'step-f01': 'STEP Support Assignment 1',
  'step-f02': 'STEP Support Assignment 2',
  'step-f03': 'STEP Support Assignment 3',
  'step-f04': 'STEP Support Assignment 4',
  'step-f09': 'STEP Support Assignment 9',
  'step-f10': 'STEP Support Assignment 10',
  'step-f11': 'STEP Support Assignment 11',
  'step-f13': 'STEP Support Assignment 13',
  'step-f14': 'STEP Support Assignment 14',
  'step-f15': 'STEP Support Assignment 15',
  'step-f16': 'STEP Support Assignment 16',
  'step-f17': 'STEP Support Assignment 17',
  'step-f18': 'STEP Support Assignment 18',
  'step-f20': 'STEP Support Assignment 20',
  'step-f21': 'STEP Support Assignment 21',
  'step-f22': 'STEP Support Assignment 22',
  'step-f23': 'STEP Support Assignment 23',
  'step-f24': 'STEP Support Assignment 24',
  'step-f25': 'STEP Support Assignment 25',
  'step-f01-hints': 'STEP Support Assignment 1, Hints and Partial Solutions',
  'step-f02-hints': 'STEP Support Assignment 2, Hints and Partial Solutions',
  'step-f03-hints': 'STEP Support Assignment 3, Hints and Partial Solutions',
  'step-f04-hints': 'STEP Support Assignment 4, Hints and Partial Solutions',
  'step-f09-hints': 'STEP Support Assignment 9, Hints and Partial Solutions',
  'step-f10-hints': 'STEP Support Assignment 10, Hints and Partial Solutions',
  'step-f11-hints': 'STEP Support Assignment 11, Hints and Partial Solutions',
  'step-f13-hints': 'STEP Support Assignment 13, Hints and Partial Solutions',
  'step-f14-hints': 'STEP Support Assignment 14, Hints and Partial Solutions',
  'step-f15-hints': 'STEP Support Assignment 15, Hints and Partial Solutions',
  'step-f16-hints': 'STEP Support Assignment 16, Hints and Partial Solutions',
  'step-f17-hints': 'STEP Support Assignment 17, Hints and Partial Solutions',
  'step-f18-hints': 'STEP Support Assignment 18, Hints and Partial Solutions',
  'step-f20-hints': 'STEP Support Assignment 20, Hints and Partial Solutions',
  'step-f21-hints': 'STEP Support Assignment 21, Hints and Partial Solutions',
  'step-f22-hints': 'STEP Support Assignment 22, Hints and Partial Solutions',
  'step-f23-hints': 'STEP Support Assignment 23, Hints and Partial Solutions',
  'step-f24-hints': 'STEP Support Assignment 24, Hints and Partial Solutions',
  'step-f25-hints': 'STEP Support Assignment 25, Hints and Partial Solutions',
  'tmua-spec': 'TMUA Content Specification',
  'tmua-maths-notes': 'TMUA Notes on Mathematics',
  'nst-workbook': 'NST Mathematics Workbook',
  'cs3110-book': 'OCaml Programming (CS3110)',
  'cs3110-ex2': 'OCaml Programming (CS3110), Chapter 2 Exercises',
  'cs3110-ex3': 'OCaml Programming (CS3110), Chapter 3 Exercises',
  'cs3110-ex4': 'OCaml Programming (CS3110), Chapter 4 Exercises',
  'cs3110-ex5': 'OCaml Programming (CS3110), Chapter 5 Exercises',
  'cs3110-ex8': 'OCaml Programming (CS3110), Chapter 8 Exercises',
  'cs3110-ex9': 'OCaml Programming (CS3110), Chapter 9 Exercises',
  'focs-notes': 'Foundations of Computer Science notes (2025-26)',
  // Batch 7 (scripts/sources/batch-7.json): stronger gates for proof, logic, probability, sets,
  // and numbers. Grinstead and Snell (GNU FDL), the CST Logic and Proof notes, the last CST
  // Discrete Mathematics solutions, and the IA Numbers and Sets example sheets.
  'gs-ch3': 'Grinstead and Snell, Introduction to Probability, Chapter 3',
  'gs-ch4': 'Grinstead and Snell, Introduction to Probability, Chapter 4',
  'gs-ch5': 'Grinstead and Snell, Introduction to Probability, Chapter 5',
  'gs-answers-odd': 'Grinstead and Snell, Introduction to Probability, Answers to the Odd-Numbered Exercises',
  'cst-lp-notes': 'CST Logic and Proof notes (2025-26)',
  'cst-dm-sols-2324-5': 'CST Discrete Mathematics Exercises 5, official solutions (2023-24)',
  'ia-ns-sheet-1': 'IA Numbers and Sets Example Sheet 1',
  'ia-ns-sheet-2': 'IA Numbers and Sets Example Sheet 2',
  'ia-ns-sheet-3': 'IA Numbers and Sets Example Sheet 3',
  'ia-ns-sheet-4': 'IA Numbers and Sets Example Sheet 4',
  // Batch 8 (scripts/sources/batch-8.json): gate sources for the calculus, trigonometry, algebra,
  // functions, vectors, inequalities, and OCaml topics.
  'step-s2-calc': 'STEP Support STEP 2 Calculus',
  'step-s2-calc-solutions': 'STEP Support STEP 2 Calculus, Solutions',
  'step-s2-eqns': 'STEP Support STEP 2 Equations and Inequalities',
  'step-s2-eqns-solutions': 'STEP Support STEP 2 Equations and Inequalities, Solutions',
  'step-s2-misc': 'STEP Support STEP 2 Miscellaneous Pure',
  'step-s2-misc-solutions': 'STEP Support STEP 2 Miscellaneous Pure, Solutions',
  'step-s2-vectors': 'STEP Support STEP 2 Vectors',
  'step-s2-vectors-solutions': 'STEP Support STEP 2 Vectors, Solutions',
  'step-s3-hyp': 'STEP Support STEP 3 Hyperbolic Functions',
  'step-s3-hyp-solutions': 'STEP Support STEP 3 Hyperbolic Functions, Solutions',
  'stepdb-94-s1': 'STEP I 1994',
  'stepdb-95-s1': 'STEP I 1995',
  'stepdb-96-s1': 'STEP I 1996',
  'stepdb-99-s1': 'STEP I 1999',
  'stepdb-00-s1': 'STEP I 2000',
  'stepdb-01-s1': 'STEP I 2001',
  'stepdb-02-s1': 'STEP I 2002',
  'stepdb-05-s1': 'STEP I 2005',
  'stepdb-06-s1': 'STEP I 2006',
  'stepdb-07-s1': 'STEP I 2007',
  'stepdb-08-s2': 'STEP II 2008',
  'stepdb-10-s1': 'STEP I 2010',
  'stepdb-11-s1': 'STEP I 2011',
  'stepdb-12-s1': 'STEP I 2012',
  'stepdb-12-s2': 'STEP II 2012',
  'stepdb-13-s2': 'STEP II 2013',
  'stepdb-14-s1': 'STEP I 2014',
  'stepdb-15-s1': 'STEP I 2015',
  'stepdb-16-s2': 'STEP II 2016',
  'stepdb-18-s1': 'STEP I 2018',
  'stepdb-spec-s1': 'STEP I Specimen Paper',
  'cst-y2016p1q2': 'Computer Science Tripos Part IA 2016, Paper 1, Question 2',
  'cst-y2018p1q2': 'Computer Science Tripos Part IA 2018, Paper 1, Question 2',
  'cst-y2020p1q1': 'Computer Science Tripos Part IA 2020, Paper 1, Question 1',
  'cst-y2024p1q2': 'Computer Science Tripos Part IA 2024, Paper 1, Question 2',
  'cst-y2025p1q1': 'Computer Science Tripos Part IA 2025, Paper 1, Question 1',
  'cst-y2025p1q2': 'Computer Science Tripos Part IA 2025, Paper 1, Question 2',
  'damtp-ia-vm1': 'IA Vectors and Matrices Example Sheet 1',
  'damtp-ia-de1': 'IA Differential Equations Example Sheet 1',
  'mit-18600-ps10': 'MIT 18.600 Problem Set 10',
  // Batch 9 (scripts/sources/batch-9.json): second gates for the topics that had one, Cambridge
  // first: STEP papers, IA Analysis I Example Sheet 1, Computer Science Tripos questions, and the
  // STEP Support STEP 2 Trigonometry and Matrices modules.
  'dpmms-ia-an1': 'IA Analysis I Example Sheet 1',
  'stepdb-94-s2': 'STEP II 1994',
  'stepdb-00-s2': 'STEP II 2000',
  'stepdb-03-s1': 'STEP I 2003',
  'stepdb-04-s1': 'STEP I 2004',
  'stepdb-06-s3': 'STEP III 2006',
  'stepdb-08-s1': 'STEP I 2008',
  'stepdb-16-s1': 'STEP I 2016',
  'stepdb-16-s3': 'STEP III 2016',
  'cst-y2013p1q1': 'Computer Science Tripos Part IA 2013, Paper 1, Question 1',
  'cst-y2016p1q1': 'Computer Science Tripos Part IA 2016, Paper 1, Question 1',
  'cst-y2022p1q2': 'Computer Science Tripos Part IA 2022, Paper 1, Question 2',
  'step-s2-trig': 'STEP Support STEP 2 Trigonometry',
  'step-s2-trig-solutions': 'STEP Support STEP 2 Trigonometry, Solutions',
  'step-s2-matrices': 'STEP Support STEP 2 Matrices',
  'step-s2-matrices-solutions': 'STEP Support STEP 2 Matrices, Solutions',
  // The STEP hints, solutions, and mark schemes of the papers above, from the folder of past
  // papers that the STEP Questions Database links: official answers to compare, not gates.
  'stepdb-04-ha': 'STEP 2004 Hints and Answers',
  'stepdb-05-ha': 'STEP 2005 Hints and Answers',
  'stepdb-06-ha': 'STEP 2006 Hints and Answers',
  'stepdb-07-sol': 'STEP 2007 Solutions',
  'stepdb-08-s1-sol': 'STEP I 2008 Solutions',
  'stepdb-10-s1-sol': 'STEP I 2010 Solutions and Mark Scheme',
  'stepdb-11-sol': 'STEP 2011 Solutions',
  'stepdb-12-s1-ms': 'STEP I 2012 Mark Scheme',
  'stepdb-14-s1-ms': 'STEP I 2014 Mark Scheme',
  'stepdb-15-hs': 'STEP 2015 Hints and Solutions',
  'stepdb-16-sol': 'STEP 2016 Solutions',
  'stepdb-16-ms': 'STEP 2016 Mark Schemes',
  'stepdb-18-s1-er': 'STEP I 2018 Examiner\'s Report, Hints and Solutions, Mark Scheme',
} as const;

export type CitedDoc = keyof typeof CITED_DOCS;

export interface Citation {
  /** The source id in scripts/sources/batch-1.json, batch-2.json, batch-6.json, batch-7.json, batch-8.json, or batch-9.json (and so in sources/manifest.json). */
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

/**
 * What a Cambridge problem draws on, shown above it so the learner knows what it asks of them.
 * Its prerequisite topics are not listed here: they come from the graph.
 */
export interface ProblemUses {
  /** The titles of this topic's lesson sections it draws on, as `plain` gives them. */
  sections: readonly string[];
  /** One plain line: the skill it tests. */
  note?: Rich;
  /**
   * Topics outside this topic's prerequisites that it also needs, by graph id: a problem set
   * here as further practice that leans on a later lesson says so. A gate problem has none,
   * since a gate asks only for this lesson and what it builds on.
   */
  needs?: readonly string[];
}

/**
 * The words of a personal voice: "you" and "we" in their forms. Problem statements, hints,
 * nudges, and solutions are neutral (mastery/APP-LANGUAGE.md, "Voice"); practice feedback on
 * a generated problem's misconception is the one exception and is not checked.
 */
const PERSONAL = /\b(?:you|your|yours|yourself|yourselves|we|our|ours|ourselves|us|let's)\b/gi;

/** The personal-voice words in a text's prose (not its mathematics), lower case, in order. */
export function personalWords(r: Rich): string[] {
  return r.flatMap((s) => (s.kind === 'text' ? [...s.text.matchAll(PERSONAL)].map((m) => m[0].toLowerCase()) : []));
}

/** A problem has at most this many hints (mastery/APP-LANGUAGE.md: three escalating questions). */
export const MAX_HINTS = 3;

interface CambridgeBase {
  /** Unique within the topic, for example "a6-q4-ii". */
  id: string;
  source: Citation;
  /** Short title, for lists. */
  title: Rich;
  uses?: ProblemUses;
  /**
   * Up to `MAX_HINTS` hints, in order, each a question in the supervisor's voice that
   * nudges one step further than the last and never gives the answer (mastery/
   * APP-LANGUAGE.md). A single-answer problem shows the next one on request after a miss.
   */
  hints?: readonly Rich[];
  /**
   * The line under "Not right yet" after a miss on a single-answer problem: one short
   * pointer toward a faster or better route, never the answer. Without one the app shows a
   * neutral generic line.
   */
  nudge?: Rich;
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

/**
 * The topic that first teaches writing a proof: what a proof is, a general claim argued with
 * letters, every condition checked, and the conclusion stated. It opens Book of Proof 4 to 7
 * in CS-0 Proof (book.ts). A problem whose answer is a written proof is not a gate of a topic
 * the book places before it, unless that topic builds on it (proof gate audit, 2026-10-08).
 */
export const FIRST_PROOF_TOPIC = 'proof.direct';

/** Whether the learner's answer to a problem is a written proof (`ANSWER WANTED: a proof` in the supervision block). */
export function isProofWriteUp(p: CambridgeProblem): boolean {
  return p.mode === 'supervision' && p.writeUp === 'proof';
}

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
  uses?: ProblemUses;
  /** See `CambridgeBase.hints`. */
  hints?: readonly Rich[];
  /** See `CambridgeBase.nudge`. */
  nudge?: Rich;
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
  if (spec.uses !== undefined) out.uses = spec.uses;
  if (spec.hints !== undefined) out.hints = spec.hints;
  if (spec.nudge !== undefined) out.nudge = spec.nudge;
  return out;
}

/** Null when `got` equals `want` (compared as text), else a message for the content checks. */
export function same(what: string, got: unknown, want: unknown): string | null {
  return String(got) === String(want) ? null : `${what}: computed ${String(got)}, expected ${String(want)}`;
}

export function supervision(spec: Omit<SupervisionProblem, 'mode'>): SupervisionProblem {
  return { ...spec, mode: 'supervision' };
}

/**
 * The problems with what each draws on (`ProblemUses`), keyed by problem id, so a topic
 * states it in one place beside its gate. An id that is not one of the problems is a
 * mistake in the content, so it throws.
 */
export function withUses<P extends CambridgeProblem>(problems: readonly P[], uses: Readonly<Record<string, ProblemUses>>): P[] {
  const ids = new Set(problems.map((p) => p.id));
  for (const id of Object.keys(uses)) if (!ids.has(id)) throw new Error(`withUses: ${id} is not one of the problems`);
  return problems.map((p) => {
    const u = uses[p.id];
    return u === undefined ? p : { ...p, uses: u };
  });
}
