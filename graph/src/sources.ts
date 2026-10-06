/**
 * Source documents cited by `sources[].doc`, and the section headings topics cite, exactly
 * as printed. One place for both, so every area file spells a heading the same way.
 */

export const SOURCE_DOCS = {
  'dfe-gcse-maths-2013': {
    title: 'Mathematics GCSE subject content and assessment objectives (DfE, November 2013, DFE-00233-2013)',
    url: 'https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/254441/GCSE_mathematics_subject_content_and_assessment_objectives.pdf',
  },
  'step-spec-2026': {
    title: 'STEP Mathematics Specifications for Examinations from June 2026 onwards, version 1.3 (OCR)',
    url: 'https://www.ocr.org.uk/Images/696329-step-specification-2026.pdf',
  },
  'tripos-schedules-2026-27': {
    title: 'Schedules of Lecture Courses and Form of Examinations for the Mathematical Tripos 2026-27 (revised 19 August 2026)',
    url: 'https://www.maths.cam.ac.uk/undergrad/files/schedules.pdf',
  },
  'cst-courses-2026-27': {
    title: 'Course pages 2026-27, Department of Computer Science and Technology, University of Cambridge (syllabus of each course)',
    url: 'https://www.cl.cam.ac.uk/teaching/2627/',
  },
  // Cambridge batch 1 (graph/reviews/cambridge-batch-1.md). Keys are the source ids in
  // scripts/sources/batch-1.json, so a citation resolves to the fetched file and its manifest entry.
  'step-f05': { title: 'STEP Support Programme, Foundation Assignment 5', url: 'https://step.maths.org/sites/default/files/2023-07/assignment5_1.pdf' },
  'step-f06': { title: 'STEP Support Programme, Foundation Assignment 6', url: 'https://step.maths.org/sites/default/files/2023-07/assignment6_3.pdf' },
  'step-f07': { title: 'STEP Support Programme, Foundation Assignment 7', url: 'https://step.maths.org/sites/default/files/2023-07/assignment7_0.pdf' },
  'step-f08': { title: 'STEP Support Programme, Foundation Assignment 8', url: 'https://step.maths.org/sites/default/files/2023-07/assignment8_1.pdf' },
  'step-f12': { title: 'STEP Support Programme, Foundation Assignment 12', url: 'https://step.maths.org/sites/default/files/2023-07/assignment12_1.pdf' },
  'step-f19': { title: 'STEP Support Programme, Foundation Assignment 19', url: 'https://step.maths.org/sites/default/files/2023-07/assignment19_0.pdf' },
  'ia-prob-sheet-1': { title: 'IA Probability Example Sheet 1, Lent 2026 (DPMMS, Perla Sousi)', url: 'https://www.dpmms.cam.ac.uk/study/IA/Probability/2025-2026/pex1-2026.pdf' },
  'cst-dm-notes': { title: 'Discrete Mathematics: Proofs, Numbers, and Sets, notes, Part IA CST 2025-26 (Fiore, Sterling)', url: 'https://www.cl.cam.ac.uk/teaching/2526/DiscMath/DiscMathProofsNumbersSetsNotes.pdf' },
  'cst-dm-sw1': { title: 'Discrete Mathematics supervision exercises: Proofs, Numbers, and Sets, Part IA CST 2025-26', url: 'https://www.cl.cam.ac.uk/teaching/2526/DiscMath/DiscMathProofsNumbersSetsSupExs.pdf' },
  bop: { title: 'Richard Hammack, Book of Proof, edition 3.4', url: 'https://richardhammack.github.io/BookOfProof/Main.pdf' },
  'tmua-logic-proof': { title: 'Notes on Logic and Proof, for TMUA Paper 2 (June 2025)', url: 'https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2025/06/25160507/Notes_on_Logic_and_Proof_June2025.pdf' },
  // Cambridge batch 2 (graph/reviews/cambridge-batch-2.md), keyed by the source ids in
  // scripts/sources/batch-2.json, as batch 1.
  'step-mixed-stats1': { title: 'STEP Support Programme, Mixed STEP 1 Statistics questions', url: 'https://step.maths.org/sites/default/files/2023-07/Statistics_STEP1_2019_0.pdf' },
  'step-s2-stats': { title: 'STEP Support Programme, STEP 2 Statistics questions', url: 'https://step.maths.org/sites/default/files/2023-07/Statistics_questions_2019_0.pdf' },
  'step-s2-stats-notes': { title: 'STEP Support Programme, STEP 2 Statistics topic notes', url: 'https://step.maths.org/sites/default/files/2023-07/Statistics_topic_notes_2019_1.pdf' },
  'step-s3-stats': { title: 'STEP Support Programme, STEP 3 Statistics questions', url: 'https://step.maths.org/sites/default/files/2023-07/Stats3_questions_2019.pdf' },
  'step-s3-stats-notes': { title: 'STEP Support Programme, STEP 3 Statistics topic notes', url: 'https://step.maths.org/sites/default/files/2023-07/Stats3_topic_notes_2019_0.pdf' },
  'ia-prob-sheet-2': { title: 'IA Probability Example Sheet 2, Lent 2026 (DPMMS, Perla Sousi)', url: 'https://www.dpmms.cam.ac.uk/study/IA/Probability/2025-2026/pex2-2026.pdf' },
  'ia-prob-sheet-3': { title: 'IA Probability Example Sheet 3, Lent 2026 (DPMMS, Perla Sousi)', url: 'https://www.dpmms.cam.ac.uk/study/IA/Probability/2025-2026/pex3-2026.pdf' },
  'ia-prob-sheet-4': { title: 'IA Probability Example Sheet 4, Lent 2026 (DPMMS, Perla Sousi)', url: 'https://www.dpmms.cam.ac.uk/study/IA/Probability/2025-2026/pex4-2026.pdf' },
  // Preparation, Stage A (graph/reviews/cambridge-prep.md). The remaining Foundation
  // assignments are batch 1 sources (fetched then only as scans); every other document is keyed
  // by its source id in scripts/sources/batch-6.json.
  'step-f01': { title: 'STEP Support Programme, Foundation Assignment 1', url: 'https://step.maths.org/sites/default/files/2023-06/assignment1_0.pdf' },
  'step-f02': { title: 'STEP Support Programme, Foundation Assignment 2', url: 'https://step.maths.org/sites/default/files/2023-07/assignment2_2.pdf' },
  'step-f03': { title: 'STEP Support Programme, Foundation Assignment 3', url: 'https://step.maths.org/sites/default/files/2023-07/assignment3_2.pdf' },
  'step-f04': { title: 'STEP Support Programme, Foundation Assignment 4', url: 'https://step.maths.org/sites/default/files/2023-07/assignment4_2.pdf' },
  'step-f09': { title: 'STEP Support Programme, Foundation Assignment 9', url: 'https://step.maths.org/sites/default/files/2023-07/assignment9_2.pdf' },
  'step-f10': { title: 'STEP Support Programme, Foundation Assignment 10', url: 'https://step.maths.org/sites/default/files/2023-07/assignment10_2.pdf' },
  'step-f11': { title: 'STEP Support Programme, Foundation Assignment 11', url: 'https://step.maths.org/sites/default/files/2023-07/assignment11_0.pdf' },
  'step-f13': { title: 'STEP Support Programme, Foundation Assignment 13', url: 'https://step.maths.org/sites/default/files/2023-07/assignment13_0.pdf' },
  'step-f14': { title: 'STEP Support Programme, Foundation Assignment 14', url: 'https://step.maths.org/sites/default/files/2023-07/assignment14_0.pdf' },
  'step-f15': { title: 'STEP Support Programme, Foundation Assignment 15', url: 'https://step.maths.org/sites/default/files/2023-07/assignment15_3.pdf' },
  'step-f16': { title: 'STEP Support Programme, Foundation Assignment 16', url: 'https://step.maths.org/sites/default/files/2023-07/assignment16_1.pdf' },
  'step-f17': { title: 'STEP Support Programme, Foundation Assignment 17', url: 'https://step.maths.org/sites/default/files/2023-07/assignment17_0.pdf' },
  'step-f18': { title: 'STEP Support Programme, Foundation Assignment 18', url: 'https://step.maths.org/sites/default/files/2023-07/assignment18_0.pdf' },
  'step-f20': { title: 'STEP Support Programme, Foundation Assignment 20', url: 'https://step.maths.org/sites/default/files/2023-07/assignment20_5.pdf' },
  'step-f21': { title: 'STEP Support Programme, Foundation Assignment 21', url: 'https://step.maths.org/sites/default/files/2023-07/assignment21_0.pdf' },
  'step-f22': { title: 'STEP Support Programme, Foundation Assignment 22', url: 'https://step.maths.org/sites/default/files/2023-07/assignment22_2.pdf' },
  'step-f23': { title: 'STEP Support Programme, Foundation Assignment 23', url: 'https://step.maths.org/sites/default/files/2023-07/assignment23_1.pdf' },
  'step-f24': { title: 'STEP Support Programme, Foundation Assignment 24', url: 'https://step.maths.org/sites/default/files/2023-07/assignment24_0.pdf' },
  'step-f25': { title: 'STEP Support Programme, Foundation Assignment 25', url: 'https://step.maths.org/sites/default/files/2023-07/assignment25_2.pdf' },
  'step-f01-hints': { title: 'STEP Support Programme, Foundation Assignment 1, hints and partial solutions', url: 'https://step.maths.org/sites/default/files/2023-06/Feedback_A1_7.pdf' },
  'step-f02-hints': { title: 'STEP Support Programme, Foundation Assignment 2, hints and partial solutions', url: 'https://step.maths.org/sites/default/files/2023-07/Feedback_A2_6.pdf' },
  'step-f03-hints': { title: 'STEP Support Programme, Foundation Assignment 3, hints and partial solutions', url: 'https://step.maths.org/sites/default/files/2023-07/Feedback_A3_5.pdf' },
  'step-f04-hints': { title: 'STEP Support Programme, Foundation Assignment 4, hints and partial solutions', url: 'https://step.maths.org/sites/default/files/2023-07/Feedback_A4_2.pdf' },
  'step-f09-hints': { title: 'STEP Support Programme, Foundation Assignment 9, hints and partial solutions', url: 'https://step.maths.org/sites/default/files/2023-07/Feedback_A9_4.pdf' },
  'step-f10-hints': { title: 'STEP Support Programme, Foundation Assignment 10, hints and partial solutions', url: 'https://step.maths.org/sites/default/files/2023-07/Feedback_A10_3.pdf' },
  'step-f11-hints': { title: 'STEP Support Programme, Foundation Assignment 11, hints and partial solutions', url: 'https://step.maths.org/sites/default/files/2023-07/Feedback_A11_1.pdf' },
  'step-f13-hints': { title: 'STEP Support Programme, Foundation Assignment 13, hints and partial solutions', url: 'https://step.maths.org/sites/default/files/2023-07/Feedback_A13_3.pdf' },
  'step-f14-hints': { title: 'STEP Support Programme, Foundation Assignment 14, hints and partial solutions', url: 'https://step.maths.org/sites/default/files/2023-07/Feedback_A14_1.pdf' },
  'step-f15-hints': { title: 'STEP Support Programme, Foundation Assignment 15, hints and partial solutions', url: 'https://step.maths.org/sites/default/files/2023-07/Feedback_A15_2.pdf' },
  'step-f16-hints': { title: 'STEP Support Programme, Foundation Assignment 16, hints and partial solutions', url: 'https://step.maths.org/sites/default/files/2023-07/Feedback_A16_5.pdf' },
  'step-f17-hints': { title: 'STEP Support Programme, Foundation Assignment 17, hints and partial solutions', url: 'https://step.maths.org/sites/default/files/2023-07/Feedback_A17_3.pdf' },
  'step-f18-hints': { title: 'STEP Support Programme, Foundation Assignment 18, hints and partial solutions', url: 'https://step.maths.org/sites/default/files/2023-07/Feedback_A18_3.pdf' },
  'step-f20-hints': { title: 'STEP Support Programme, Foundation Assignment 20, hints and partial solutions', url: 'https://step.maths.org/sites/default/files/2023-07/Feedback_A20_3.pdf' },
  'step-f21-hints': { title: 'STEP Support Programme, Foundation Assignment 21, hints and partial solutions', url: 'https://step.maths.org/sites/default/files/2023-07/Feedback_A21_2.pdf' },
  'step-f22-hints': { title: 'STEP Support Programme, Foundation Assignment 22, hints and partial solutions', url: 'https://step.maths.org/sites/default/files/2023-07/Feedback_A22_2.pdf' },
  'step-f23-hints': { title: 'STEP Support Programme, Foundation Assignment 23, hints and partial solutions', url: 'https://step.maths.org/sites/default/files/2023-07/Feedback_A23_1.pdf' },
  'step-f24-hints': { title: 'STEP Support Programme, Foundation Assignment 24, hints and partial solutions', url: 'https://step.maths.org/sites/default/files/2023-07/Feedback_A24_2.pdf' },
  'step-f25-hints': { title: 'STEP Support Programme, Foundation Assignment 25, hints and partial solutions', url: 'https://step.maths.org/sites/default/files/2023-07/Feedback_A25_3.pdf' },
  'tmua-spec': { title: 'TMUA content specification (UAT-UK)', url: 'https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/03165619/TMUA_Content_Specification.pdf' },
  'tmua-maths-notes': { title: 'Notes on Mathematics, for TMUA and ESAT M2 (UAT-UK, June 2026)', url: 'https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2026/06/30103537/Notes_on_Mathematics_-for_TMUA_and_ESAT_M2.pdf' },
  'nst-workbook': { title: 'Mathematics for the Natural Sciences Workbook (Faculty of Mathematics, Cambridge, 28 June 2019)', url: 'https://www.maths.cam.ac.uk/undergradnst/files/misc/nstworkbook.pdf' },
  'cs3110-book': { title: 'Clarkson and others, OCaml Programming: Correct + Efficient + Beautiful (CS3110 textbook, PDF edition)', url: 'https://cs3110.github.io/textbook/ocaml_programming.pdf' },
  'cs3110-ex2': { title: 'OCaml Programming, chapter 2 exercises', url: 'https://cs3110.github.io/textbook/chapters/basics/exercises.html' },
  'cs3110-ex3': { title: 'OCaml Programming, chapter 3 exercises', url: 'https://cs3110.github.io/textbook/chapters/data/exercises.html' },
  'cs3110-ex4': { title: 'OCaml Programming, chapter 4 exercises', url: 'https://cs3110.github.io/textbook/chapters/hop/exercises.html' },
  'cs3110-ex5': { title: 'OCaml Programming, chapter 5 exercises', url: 'https://cs3110.github.io/textbook/chapters/modules/exercises.html' },
  'cs3110-ex8': { title: 'OCaml Programming, chapter 8 exercises', url: 'https://cs3110.github.io/textbook/chapters/correctness/exercises.html' },
  'cs3110-ex9': { title: 'OCaml Programming, chapter 9 exercises', url: 'https://cs3110.github.io/textbook/chapters/ds/exercises.html' },
  'focs-notes': { title: 'Foundations of Computer Science lecture notes v1.7, Part IA CST 2025-26', url: 'https://www.cl.cam.ac.uk/teaching/2526/FoundsCS/focs-202526-v1.7.pdf' },
} as const;

export type SourceDoc = keyof typeof SOURCE_DOCS;

export const GCSE: SourceDoc = 'dfe-gcse-maths-2013';
export const STEP: SourceDoc = 'step-spec-2026';
export const TRIPOS: SourceDoc = 'tripos-schedules-2026-27';
export const CST: SourceDoc = 'cst-courses-2026-27';

// Section headings, exactly as printed (the STEP spec nests a heading under a paper and section).
export const GCSE_NUMBER = 'Number: Structure and calculation';
export const GCSE_ALGEBRA = 'Algebra: Notation, vocabulary and manipulation';
export const GCSE_SEQUENCES = 'Algebra: Sequences';
export const GCSE_PROB = 'Probability';
export const M1_PURE = 'Section A: Pure Mathematics';
export const M1_PROB = 'Section B: Mechanics and Probability/Statistics';
export const STEP_SS = `${M1_PURE}, Sequences and series`;
export const IA_BASIC = 'Basic concepts';
export const IA_AXIOMATIC = 'Axiomatic approach';
export const IA_LIMITS = 'Limits and convergence';
export const M1_ALGEBRA = `${M1_PURE}, Algebra and functions`;
export const M1_PROOF = `${M1_PURE}, Proof`;
export const M1_STAT_DIST = `${M1_PROB}, Statistical distributions`;
export const M2_FURTHER_CALCULUS = `${M1_PURE}, Further calculus`;
// Preparation (graph/reviews/cambridge-prep.md): the other STEP 1 pure headings, and the STEP 2
// and STEP 3 headings the further-maths topics cite. Each paper prints its pure section as
// "Section A: Pure Mathematics".
export const M1_ALGEBRA_FUNCTIONS = `${M1_PURE}, Algebra and functions`;
export const M1_COORDINATES = `${M1_PURE}, Coordinate geometry in the (x, y) plane`;
export const M1_SEQUENCES = `${M1_PURE}, Sequences and series`;
export const M1_TRIG = `${M1_PURE}, Trigonometry`;
export const M1_EXP_LOG = `${M1_PURE}, Exponentials and logarithms`;
export const M1_DIFFERENTIATION = `${M1_PURE}, Differentiation`;
export const M1_INTEGRATION = `${M1_PURE}, Integration`;
export const M1_VECTORS = `${M1_PURE}, Vectors`;
export const M2_COMPLEX = `${M1_PURE}, Complex numbers`;
export const M2_MATRICES = `${M1_PURE}, Matrices`;
export const M2_FURTHER_ALGEBRA = `${M1_PURE}, Further algebra and functions`;
export const M2_FURTHER_VECTORS = `${M1_PURE}, Further vectors`;
export const M3_HYPERBOLIC = `${M1_PURE}, Hyperbolic functions`;
export const M2_PROB_DIST = 'Section C: Probability/Statistics, Probability distributions';
export const M3_ALGEBRA_OF_EXPECTATION = 'Section C: Probability/Statistics, Algebra of expectation';
export const IA_DISCRETE_RV = 'Discrete random variables';
export const IA_CONTINUOUS_RV = 'Continuous random variables';
export const IA_INEQUALITIES = 'Inequalities and limits';
/**
 * The `course` of a Part V topic's IA Probability schedule citation. Not `'IA Probability'`
 * on purpose: that name makes a topic a target of the `ia-probability` course, and widening
 * the course to Part V reorders the scheduler and the measured simulations, which is its
 * own decision. Rename to `'IA Probability'` when the course takes Part V in.
 */
export const IA_PROB_PART_V = 'IA Probability, Part V sections (not yet course targets)';
/** The notation list (page 32): chapter, heading, and table title as printed. */
export const STEP_SET_NOTATION = 'Notation and Required Formulae, Notation, Set notation';

// CST IA Discrete Mathematics, https://www.cl.cam.ac.uk/teaching/2627/DiscMath/ (read 2026-10-04).
// Sections are the lecture headings as printed, without the lecture count.
export const CST_DM = 'CST IA Discrete Mathematics';
export const CST_PROOF = 'Proof';
export const CST_NUMBERS = 'Numbers';

/**
 * CST IA Foundations of Computer Science, https://www.cl.cam.ac.uk/teaching/2627/FoundsCS/
 * (scripts/sources/batch-6.json, focs-syllabus-2627, read 2026-10-05). Not a course of `COURSES`:
 * CS-0 functional programming cites it so the topics have the syllabus as their own source.
 * Sections are the lecture headings as printed.
 */
export const CST_FOCS = 'CST IA Foundations of Computer Science';

/**
 * The `course` of a Cambridge batch 1, 2, or 6 citation, one per document. None is a course of
 * `COURSES`, so these citations add teaching sources without adding course targets.
 */
export const CAMBRIDGE_COURSE = {
  'step-f05': 'STEP Support Programme, Foundation',
  'step-f06': 'STEP Support Programme, Foundation',
  'step-f07': 'STEP Support Programme, Foundation',
  'step-f08': 'STEP Support Programme, Foundation',
  'step-f12': 'STEP Support Programme, Foundation',
  'step-f19': 'STEP Support Programme, Foundation',
  'ia-prob-sheet-1': 'IA Probability example sheets, 2025-26',
  'cst-dm-notes': 'CST IA Discrete Mathematics notes, 2025-26',
  'cst-dm-sw1': 'CST IA Discrete Mathematics supervision exercises, 2025-26',
  bop: 'Book of Proof',
  'tmua-logic-proof': 'TMUA Notes on Logic and Proof',
  'step-mixed-stats1': 'STEP Support Programme, Mixed STEP 1 Statistics',
  'step-s2-stats': 'STEP Support Programme, STEP 2 Statistics',
  'step-s2-stats-notes': 'STEP Support Programme, STEP 2 Statistics',
  'step-s3-stats': 'STEP Support Programme, STEP 3 Statistics',
  'step-s3-stats-notes': 'STEP Support Programme, STEP 3 Statistics',
  'ia-prob-sheet-2': 'IA Probability example sheets, 2025-26',
  'ia-prob-sheet-3': 'IA Probability example sheets, 2025-26',
  'ia-prob-sheet-4': 'IA Probability example sheets, 2025-26',
  'step-f01': 'STEP Support Programme, Foundation',
  'step-f02': 'STEP Support Programme, Foundation',
  'step-f03': 'STEP Support Programme, Foundation',
  'step-f04': 'STEP Support Programme, Foundation',
  'step-f09': 'STEP Support Programme, Foundation',
  'step-f10': 'STEP Support Programme, Foundation',
  'step-f11': 'STEP Support Programme, Foundation',
  'step-f13': 'STEP Support Programme, Foundation',
  'step-f14': 'STEP Support Programme, Foundation',
  'step-f15': 'STEP Support Programme, Foundation',
  'step-f16': 'STEP Support Programme, Foundation',
  'step-f17': 'STEP Support Programme, Foundation',
  'step-f18': 'STEP Support Programme, Foundation',
  'step-f20': 'STEP Support Programme, Foundation',
  'step-f21': 'STEP Support Programme, Foundation',
  'step-f22': 'STEP Support Programme, Foundation',
  'step-f23': 'STEP Support Programme, Foundation',
  'step-f24': 'STEP Support Programme, Foundation',
  'step-f25': 'STEP Support Programme, Foundation',
  'step-f01-hints': 'STEP Support Programme, Foundation, hints',
  'step-f02-hints': 'STEP Support Programme, Foundation, hints',
  'step-f03-hints': 'STEP Support Programme, Foundation, hints',
  'step-f04-hints': 'STEP Support Programme, Foundation, hints',
  'step-f09-hints': 'STEP Support Programme, Foundation, hints',
  'step-f10-hints': 'STEP Support Programme, Foundation, hints',
  'step-f11-hints': 'STEP Support Programme, Foundation, hints',
  'step-f13-hints': 'STEP Support Programme, Foundation, hints',
  'step-f14-hints': 'STEP Support Programme, Foundation, hints',
  'step-f15-hints': 'STEP Support Programme, Foundation, hints',
  'step-f16-hints': 'STEP Support Programme, Foundation, hints',
  'step-f17-hints': 'STEP Support Programme, Foundation, hints',
  'step-f18-hints': 'STEP Support Programme, Foundation, hints',
  'step-f20-hints': 'STEP Support Programme, Foundation, hints',
  'step-f21-hints': 'STEP Support Programme, Foundation, hints',
  'step-f22-hints': 'STEP Support Programme, Foundation, hints',
  'step-f23-hints': 'STEP Support Programme, Foundation, hints',
  'step-f24-hints': 'STEP Support Programme, Foundation, hints',
  'step-f25-hints': 'STEP Support Programme, Foundation, hints',
  'tmua-spec': 'TMUA content specification',
  'tmua-maths-notes': 'TMUA Notes on Mathematics',
  'nst-workbook': 'NST Mathematics Workbook',
  'cs3110-book': 'OCaml Programming (CS3110 textbook)',
  'cs3110-ex2': 'OCaml Programming (CS3110 textbook), exercises',
  'cs3110-ex3': 'OCaml Programming (CS3110 textbook), exercises',
  'cs3110-ex4': 'OCaml Programming (CS3110 textbook), exercises',
  'cs3110-ex5': 'OCaml Programming (CS3110 textbook), exercises',
  'cs3110-ex8': 'OCaml Programming (CS3110 textbook), exercises',
  'cs3110-ex9': 'OCaml Programming (CS3110 textbook), exercises',
  'focs-notes': 'CST IA Foundations of Computer Science notes, 2025-26',
} as const satisfies Partial<Record<SourceDoc, string>>;

export type CambridgeDoc = keyof typeof CAMBRIDGE_COURSE;

export const STEP_SUPPORT_6 ='External check: STEP Support Programme Foundation Assignment 6 (arrangements and probability).';

/** STEP Support Programme Foundation assignments, as the module list describes them (step.maths.org, read 2026-10-04). */
export const STEP_SUPPORT = {
  3: 'External check: STEP Support Programme Foundation Assignment 3 (a linear Diophantine equation, the floor function).',
  4: 'External check: STEP Support Programme Foundation Assignment 4 (logic puzzles).',
  12: 'External check: STEP Support Programme Foundation Assignment 12 (proving divisibility).',
  17: 'External check: STEP Support Programme Foundation Assignment 17 (an introduction to modular arithmetic).',
  20: 'External check: STEP Support Programme Foundation Assignment 20 (an introduction to induction).',
} as const;
