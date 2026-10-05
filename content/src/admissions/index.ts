/**
 * The paper registry for the Cambridge Entry campaign (mastery/DESIGN-ADMISSIONS.md, build
 * step 1): STEP results with per-mark score distributions, the registry of STEP, TMUA, and
 * A level papers, and the TMUA answer keys. The data is plain JSON extracted from the sources
 * of scripts/sources/batch-3.json; this module only types it and answers questions about it.
 */
import papersJson from './papers.json';
import stepJson from './step-results.json';
import tmuaJson from './tmua-keys.json';

export type StepPaper = 'STEP 2' | 'STEP 3';
export type StepGrade = 'S' | '1' | '2' | '3';

export interface SourceRef {
  /** The source id in scripts/sources/batch-3.json (and so in sources/manifest.json). */
  id: string;
  url: string;
  /** The file inside a zip source (the STEP past paper zips). */
  file?: string;
}

export interface StepPaperResults {
  paper: StepPaper;
  code: string;
  max_mark: number;
  /** Minimum mark for each grade, as printed. */
  boundaries: Record<StepGrade, number>;
  /** Printed cumulative percentage achieving each grade (U is 100). */
  cumulative_percent: Record<StepGrade | 'U', number>;
  distribution: {
    bins: string;
    page: number;
    chart: 'vector' | 'raster';
    /** Percent of candidates on each mark 0 to 120, read off the chart. */
    percent_read: number[];
    /** Candidates on each mark 0 to 120, reconstructed from the chart. */
    count: number[];
    /** Total candidates: reconstructed, not printed. */
    candidates: number;
    candidates_printed: boolean;
    /** Marks whose bar is clipped at the top of the chart (count inferred from the total). */
    clipped_marks: number[];
  };
  check: {
    cumulative_from_histogram: Record<StepGrade, number>;
    difference: Record<StepGrade, number>;
    printed_decimals: number;
    within_rounding: boolean;
  };
}

export interface StepYear {
  year: number;
  source: SourceRef & { sha256: string };
  papers: StepPaperResults[];
}

export interface StepResults {
  title: string;
  source: string;
  method: string;
  notes: string[];
  years: StepYear[];
}

export interface PaperBoundaries {
  kind: string;
  max_mark: number;
  'A*': number;
  A: number;
  B: number;
  C: number;
  D: number;
  E: number;
}

export interface RegistryPaper {
  id: string;
  exam: 'STEP' | 'TMUA' | 'A level';
  board: string;
  qualification?: string;
  year: number;
  series?: string;
  paper: string;
  code?: string;
  title?: string;
  duration_minutes: number;
  questions: number;
  total_marks: number;
  rules: string;
  /** paper, mark_scheme, worked_answers, answer_key, results, boundaries, specification: one source or several (a paper in two booklets). A null paper is a gap. */
  sources: Record<string, SourceRef | SourceRef[] | null>;
  /** A level: the paper's grade boundaries. STEP and TMUA point to the other files. */
  boundaries?: PaperBoundaries | { ref: string; note: string };
  answer_key?: { ref: string };
  gap?: string;
}

export interface Registry {
  title: string;
  fetched: string;
  gaps: string[];
  papers: RegistryPaper[];
}

export interface TmuaKeys {
  title: string;
  source: string;
  method: string;
  years: {
    year: number;
    source: SourceRef & { sha256: string };
    papers: {
      paper: 1 | 2;
      id: string;
      /** Twenty letters, question 1 first. */
      key: string;
      questions: number;
      worked_answers_check: { confirmed: number; not_stated_in_worked_answers: number[] };
    }[];
  }[];
}

export const stepResults = stepJson as unknown as StepResults;
export const registry = papersJson as unknown as Registry;
export const tmuaKeys = tmuaJson as unknown as TmuaKeys;

export function stepPaperResults(year: number, paper: StepPaper): StepPaperResults | undefined {
  return stepResults.years.find((y) => y.year === year)?.papers.find((p) => p.paper === paper);
}

export interface StepPlacement {
  /** Share of that year's candidates on this paper who scored at or below the mark, 0 to 1. */
  share: number;
  /** Candidates at or below the mark, and in total (reconstructed counts). */
  atOrBelow: number;
  candidates: number;
}

/**
 * Places a raw STEP mark among the real candidates of that year and paper, from the
 * per-mark distribution in OCR's Explanation of results. Throws if there is no distribution
 * for the year and paper, or the mark is not a whole number from 0 to the paper's maximum.
 */
export function stepPlacement(year: number, paper: StepPaper, mark: number): StepPlacement {
  const r = stepPaperResults(year, paper);
  if (r === undefined) throw new Error(`no STEP results for ${paper} ${year}`);
  if (!Number.isInteger(mark) || mark < 0 || mark > r.max_mark) throw new Error(`mark must be a whole number from 0 to ${r.max_mark}: ${mark}`);
  const { count, candidates } = r.distribution;
  let atOrBelow = 0;
  for (let m = 0; m <= mark; m++) atOrBelow += count[m] ?? 0;
  return { share: atOrBelow / candidates, atOrBelow, candidates };
}

/** The share of real candidates at or below the mark, 0 to 1 (see stepPlacement). */
export function stepPercentile(year: number, paper: StepPaper, mark: number): number {
  return stepPlacement(year, paper, mark).share;
}

/** The STEP grade a mark earns on that year's boundaries ('U' below grade 3). */
export function stepGrade(year: number, paper: StepPaper, mark: number): StepGrade | 'U' {
  const r = stepPaperResults(year, paper);
  if (r === undefined) throw new Error(`no STEP results for ${paper} ${year}`);
  for (const g of ['S', '1', '2', '3'] as const) if (mark >= r.boundaries[g]) return g;
  return 'U';
}

export function tmuaKey(year: number, paper: 1 | 2): string | undefined {
  return tmuaKeys.years.find((y) => y.year === year)?.papers.find((p) => p.paper === paper)?.key;
}

/** Raw TMUA mark (out of 20) for one paper; answers are letters, null for unanswered. */
export function tmuaMark(year: number, paper: 1 | 2, answers: readonly (string | null)[]): number {
  const key = tmuaKey(year, paper);
  if (key === undefined) throw new Error(`no TMUA key for ${year} paper ${paper}`);
  if (answers.length !== key.length) throw new Error(`expected ${key.length} answers, got ${answers.length}`);
  let mark = 0;
  for (let i = 0; i < key.length; i++) if (answers[i]?.toUpperCase() === key[i]) mark++;
  return mark;
}

export function registryPaper(id: string): RegistryPaper | undefined {
  return registry.papers.find((p) => p.id === id);
}

/** The highest A level grade a raw mark reaches on that paper's boundaries ('U' below E). */
export function aLevelGrade(id: string, mark: number): 'A*' | 'A' | 'B' | 'C' | 'D' | 'E' | 'U' {
  const b = registryPaper(id)?.boundaries;
  if (b === undefined || !('max_mark' in b)) throw new Error(`no grade boundaries for ${id}`);
  for (const g of ['A*', 'A', 'B', 'C', 'D', 'E'] as const) if (mark >= b[g]) return g;
  return 'U';
}
