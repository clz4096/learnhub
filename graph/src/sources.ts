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
/** The notation list (page 32): chapter, heading, and table title as printed. */
export const STEP_SET_NOTATION = 'Notation and Required Formulae, Notation, Set notation';

// CST IA Discrete Mathematics, https://www.cl.cam.ac.uk/teaching/2627/DiscMath/ (read 2026-10-04).
// Sections are the lecture headings as printed, without the lecture count.
export const CST_DM = 'CST IA Discrete Mathematics';
export const CST_PROOF = 'Proof';
export const CST_NUMBERS = 'Numbers';

/**
 * The `course` of a Cambridge batch 1 citation, one per document. None is a course of
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
