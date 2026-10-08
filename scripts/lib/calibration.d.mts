// Types for calibration.mjs, so the app's tests (sims/mastery model/calibration.test.ts) can check
// the harness against the app's own supervision block.
export const CASES_FORMAT: string;
export const RESULTS_FORMAT: string;
export const FRAME_FORMAT: string;
export const MARK_MAX: number;
export const PASS_MARK: number;
export const CALIBRATION_RULE: string;
export const CASE_AGREEMENT: number;
export const HUMAN_AGREEMENT: number;
export const HUMAN_MEAN_DIFF: number;

export interface FrameProblem {
  topic: string;
  source: string;
  title: string;
  statement: string;
  writeUp: string;
  officialLines: string[];
  redoList: string[];
  gapList: string[];
  markerOnly: string[];
}

export interface Frame {
  format: string;
  supervisorRules: string[];
  proofRule: string;
  markSchemeRule: string;
  outlineRule: string;
  markerOnly: string;
  proofChecklist: string[];
  rubricLines: string[];
  resultTemplate: string;
  problems: Record<string, FrameProblem>;
}

export interface CalibrationCase {
  id: string;
  problem: string;
  expect: 'high' | 'low';
  origin: 'official' | 'reference';
  citation?: string;
  pair: string;
  flaw?: string;
  writeUp: string;
}

export interface Mark { case?: string; nonce?: string; problem?: string; mark: number }
export interface Results { format: string; marker: { kind: 'ai' | 'human'; name: string; date: string }; marks: Mark[] }

export function caseNonce(id: string): string;
export function validateCases(doc: unknown, frame?: Frame): string[];
export function validateFrame(frame: unknown): string[];
export function buildCalibrationPacket(c: CalibrationCase, frame: Frame): string;
export function readResultBlock(text: string): { problem: string; nonce: string; mark: number } | null;
export function collectMarks(cases: readonly CalibrationCase[], blocks: readonly string[]): { marks: Mark[]; errors: string[] };
export function marksFromProgress(progress: unknown): Mark[];
export function validateResults(doc: unknown): string[];
export function scoreAgainstCases(cases: readonly CalibrationCase[], results: Results): {
  n: number; agreement: number | null; meanHigh: number | null; meanLow: number | null; gap: number | null;
  misses: { case: string; expect: string; mark: number }[]; missing: string[]; calibrated: boolean;
};
export function compareMarkers(a: Results, b: Results): {
  n: number; agreement: number | null; meanDifference: number | null; meanAbsDifference: number | null; agree: boolean;
};
