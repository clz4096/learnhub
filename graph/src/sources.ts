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

// CST IA Discrete Mathematics, https://www.cl.cam.ac.uk/teaching/2627/DiscMath/ (read 2026-10-04).
// Sections are the lecture headings as printed, without the lecture count.
export const CST_DM = 'CST IA Discrete Mathematics';
export const CST_PROOF = 'Proof';
export const CST_NUMBERS = 'Numbers';

export const STEP_SUPPORT_6 = 'External check: STEP Support Programme Foundation Assignment 6 (arrangements and probability).';

/** STEP Support Programme Foundation assignments, as the module list describes them (step.maths.org, read 2026-10-04). */
export const STEP_SUPPORT = {
  3: 'External check: STEP Support Programme Foundation Assignment 3 (a linear Diophantine equation, the floor function).',
  4: 'External check: STEP Support Programme Foundation Assignment 4 (logic puzzles).',
  12: 'External check: STEP Support Programme Foundation Assignment 12 (proving divisibility).',
  17: 'External check: STEP Support Programme Foundation Assignment 17 (an introduction to modular arithmetic).',
  20: 'External check: STEP Support Programme Foundation Assignment 20 (an introduction to induction).',
} as const;
