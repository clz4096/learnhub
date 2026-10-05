/**
 * Table answers: a filled-in table compared with the expected one cell by cell, for
 * example the result column of a truth table or the counts in a two-way (Bayes) table.
 *
 * The learner fills only the blank cells; the response is their text in reading order
 * (row by row, left to right), the same order as `expected`. Every cell must be filled
 * and readable before anything is marked, so a half-filled table is never a miss.
 */
import { equalRational, formatRational, parseRational } from './rational';
import { MAX_ANSWER_LENGTH, normalizeSymbols, problemError, type GradeResult } from './types';

/** `truth`: T or F (also true, false, 1, 0, ⊤, ⊥). `exact`: an exact number, in any form the rational grader reads. */
export type CellKind = 'truth' | 'exact';

export interface TableSpec {
  /** The expected text of each blank cell, in reading order. */
  expected: readonly string[];
  cell: CellKind;
}

export interface TableGradeResult extends GradeResult {
  /** Indices (into the cells) of the cells that are wrong; empty when the table is right or cannot be marked. */
  wrong: number[];
}

const TRUE = new Set(['t', 'true', '1', '⊤']);
const FALSE = new Set(['f', 'false', '0', '⊥']);

/** T or F as a boolean, or null when the text is neither. */
export function readTruth(text: string): boolean | null {
  const s = text.trim().toLowerCase();
  if (TRUE.has(s)) return true;
  if (FALSE.has(s)) return false;
  return null;
}

type Cell = { ok: true; key: string } | { ok: false; error: string };

/** A cell as a canonical key (T, F, or a rational in lowest terms), or why it cannot be read. */
function readCell(text: string, kind: CellKind): Cell {
  if (kind === 'truth') {
    const b = readTruth(text);
    return b === null ? { ok: false, error: 'write T or F' } : { ok: true, key: b ? 'T' : 'F' };
  }
  const r = parseRational(normalizeSymbols(text));
  return r.ok ? { ok: true, key: formatRational(r.value) } : { ok: false, error: r.error };
}

function sameCell(got: string, want: string, kind: CellKind): boolean {
  if (kind === 'truth') return got === want;
  const a = parseRational(got);
  const b = parseRational(want);
  return a.ok && b.ok && equalRational(a.value, b.value);
}

const position = (i: number): string => `cell ${i + 1}`;

/** Grades a filled table. A table with blank or unreadable cells is not marked: the feedback says which. */
export function gradeTable(cells: readonly string[], spec: TableSpec): TableGradeResult {
  const raw = cells.join(' | ');
  const want: string[] = [];
  for (const e of spec.expected) {
    const c = readCell(e, spec.cell);
    if (!c.ok) return { ...problemError(`expected cell "${e}" cannot be read: ${c.error}`, raw), wrong: [] };
    want.push(c.key);
  }
  if (cells.length !== want.length) return { ...problemError(`the table has ${want.length} cells to fill, the answer has ${cells.length}`, raw), wrong: [] };
  if (cells.some((c) => c.length > MAX_ANSWER_LENGTH)) return { correct: false, feedback: 'A cell is too long.', normalizedAnswer: raw, wrong: [] };

  const blank = cells.map((c, i) => (c.trim() === '' ? i : -1)).filter((i) => i >= 0);
  if (blank.length > 0) {
    const which = blank.length === 1 ? position(blank[0] as number) : `${blank.length} cells`;
    return { correct: false, feedback: `Fill every cell first: ${which} ${blank.length === 1 ? 'is' : 'are'} empty.`, normalizedAnswer: raw, wrong: [] };
  }
  const read = cells.map((c) => readCell(c, spec.cell));
  const bad = read.findIndex((c) => !c.ok);
  if (bad >= 0) {
    const c = read[bad] as { ok: false; error: string };
    return { correct: false, feedback: `${position(bad)} reads "${(cells[bad] as string).trim()}": ${c.error}.`, normalizedAnswer: raw, wrong: [] };
  }
  const keys = read.map((c) => (c as { ok: true; key: string }).key);
  const normalizedAnswer = keys.join(' | ');
  const wrong = keys.map((k, i) => (sameCell(k, want[i] as string, spec.cell) ? -1 : i)).filter((i) => i >= 0);
  if (wrong.length === 0) return { correct: true, normalizedAnswer, wrong };
  const feedback = wrong.length === 1 ? 'One cell is wrong.' : `${wrong.length} of ${keys.length} cells are wrong.`;
  return { correct: false, feedback, normalizedAnswer, wrong };
}
