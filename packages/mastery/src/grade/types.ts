/** What every grader returns. Graders never throw, on learner input or on a broken problem. */
export interface GradeResult {
  correct: boolean;
  /** For the learner: why it is wrong, or a note on a right answer in a non-standard form. */
  feedback?: string;
  /** The answer in canonical form, for display and for comparing attempts. Trimmed raw input when it does not parse. */
  normalizedAnswer: string;
}

/** Learner input longer than this is rejected before parsing, which bounds parse and BigInt work. */
export const MAX_ANSWER_LENGTH = 500;

// Minus signs people paste or type on a phone (U+2212 minus, U+2013 en dash, hyphens, and
// full-width forms), then times and divide signs.
const MINUS_RE = /[\u2212\u2013\u2012\u2010\u2011\uFE63\uFF0D]/g;
const TIMES_RE = /[\u00D7\u22C5\u00B7\u2217]/g;
const DIVIDE_RE = /[\u00F7\u2215\u2044]/g;

const PI_RE = /\u03C0/g;
const SUPERSCRIPT: Readonly<Record<string, string>> = {
  '\u2070': '0', '\u00B9': '1', '\u00B2': '2', '\u00B3': '3', '\u2074': '4', '\u2075': '5', '\u2076': '6', '\u2077': '7',
  '\u2078': '8', '\u2079': '9', '\u207B': '-', '\u207A': '+',
};
const SUPERSCRIPT_RE = /[\u2070\u00B9\u00B2\u00B3\u2074-\u2079\u207A\u207B]+/g;

/**
 * Maps Unicode arithmetic signs to ASCII and trims: minus signs, times and divide signs,
 * the letter pi (to the name pi, spaced so 2\u03C0r reads as 2 pi r), and superscript
 * digits from a phone keyboard (x\u00B2 is x^(2)).
 */
export function normalizeSymbols(s: string): string {
  return s
    .replace(MINUS_RE, '-').replace(TIMES_RE, '*').replace(DIVIDE_RE, '/')
    .replace(PI_RE, ' pi ')
    .replace(SUPERSCRIPT_RE, (m) => `^(${[...m].map((c) => SUPERSCRIPT[c] ?? '').join('')})`)
    .trim();
}

/** The result for a broken problem: wrong, with a message that says it is not the learner's fault. */
export function problemError(message: string, answer: string): GradeResult {
  return { correct: false, feedback: `Problem error, not your answer: ${message}`, normalizedAnswer: answer.trim() };
}
