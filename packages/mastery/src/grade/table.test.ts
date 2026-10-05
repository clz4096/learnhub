import { describe, expect, it } from 'vitest';
import { isProblemError } from './types';
import { gradeTable, readTruth } from './table';

/** The result column of the truth table of P ⇒ Q, rows TT, TF, FT, FF. */
const implies = { expected: ['T', 'F', 'T', 'T'], cell: 'truth' } as const;

/** STEP Assignment 6 Q4(i) as counts in a population of 100: smokers and non-smokers by sex. */
const bayes = { expected: ['20', '20', '18', '42'], cell: 'exact' } as const;

describe('table answers', () => {
  it('reads truth values in the usual spellings', () => {
    for (const s of ['T', 't', 'true', 'TRUE', '1', '⊤', ' T ']) expect(readTruth(s), s).toBe(true);
    for (const s of ['F', 'f', 'false', '0', '⊥']) expect(readTruth(s), s).toBe(false);
    for (const s of ['', 'x', 'yes', '2']) expect(readTruth(s), s).toBeNull();
  });

  it('accepts a right table in any spelling', () => {
    expect(gradeTable(['T', 'F', 'T', 'T'], implies).correct).toBe(true);
    expect(gradeTable(['true', '0', '1', 't'], implies).correct).toBe(true);
    expect(gradeTable(['20', '20', '18', '42'], bayes).correct).toBe(true);
    expect(gradeTable(['40/2', '20.0', '36/2', '42'], bayes).correct).toBe(true);
  });

  it('marks cell by cell and says which cells are wrong', () => {
    const one = gradeTable(['T', 'F', 'F', 'T'], implies);
    expect(one.correct).toBe(false);
    expect(one.wrong).toEqual([2]);
    expect(one.feedback).toBe('One cell is wrong.');
    const two = gradeTable(['T', 'T', 'F', 'T'], implies);
    expect(two.wrong).toEqual([1, 2]);
    expect(two.feedback).toBe('2 of 4 cells are wrong.');
    expect(gradeTable(['20', '20', '30', '30'], bayes).wrong).toEqual([2, 3]);
  });

  it('does not mark a table with blank or unreadable cells', () => {
    const blank = gradeTable(['T', '', 'T', ' '], implies);
    expect(blank.correct).toBe(false);
    expect(blank.wrong).toEqual([]);
    expect(blank.feedback).toBe('Fill every cell first: 2 cells are empty.');
    expect(gradeTable(['T', 'F', 'T', ''], implies).feedback).toBe('Fill every cell first: cell 4 is empty.');
    expect(gradeTable(['T', 'F', 'maybe', 'T'], implies).feedback).toBe('cell 3 reads "maybe": write T or F.');
    expect(gradeTable(['20', '20', '2^3', '42'], bayes).feedback).toMatch(/cell 3 reads "2\^3": Work it out/);
  });

  it('a malformed spec is a broken problem, not the learner\'s miss', () => {
    expect(isProblemError(gradeTable(['T'], implies))).toBe(true);
    expect(isProblemError(gradeTable(['T'], { expected: ['yes'], cell: 'truth' }))).toBe(true);
  });
});
