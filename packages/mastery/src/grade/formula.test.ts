import { describe, expect, it } from 'vitest';
import { isProblemError } from './types';
import { assignments, evalFormula, formatFormula, gradeFormula, parseFormula, texOfFormula } from './formula';

const PQ = { variables: ['P', 'Q'] };
const PQR = { variables: ['P', 'Q', 'R'] };
const read = (s: string, vars: readonly string[] = ['P', 'Q', 'R']): string => {
  const r = parseFormula(s, vars);
  return r.ok ? formatFormula(r.value) : `error: ${r.error}`;
};

describe('formula parsing', () => {
  it('reads every spelling of each connective', () => {
    for (const s of ['¬P', '~P', '∼P', '!P', 'not P', '\\lnot P', 'NOT P']) expect(read(s), s).toBe('¬P');
    for (const s of ['P ∧ Q', 'P & Q', 'P && Q', 'P /\\ Q', 'P and Q', 'P \\land Q']) expect(read(s), s).toBe('P ∧ Q');
    for (const s of ['P ∨ Q', 'P | Q', 'P || Q', 'P \\/ Q', 'P or Q', 'P \\lor Q']) expect(read(s), s).toBe('P ∨ Q');
    for (const s of ['P ⇒ Q', 'P → Q', 'P => Q', 'P -> Q', 'P implies Q', 'P \\Rightarrow Q']) expect(read(s), s).toBe('P ⇒ Q');
    for (const s of ['P ⇔ Q', 'P ↔ Q', 'P <=> Q', 'P <-> Q', 'P iff Q', 'P \\Leftrightarrow Q']) expect(read(s), s).toBe('P ⇔ Q');
    expect(read('T ∧ ⊥', ['P'])).toBe('⊤ ∧ ⊥');
  });

  it('binds not, and, or, implies, iff in that order; implies groups to the right', () => {
    expect(read('¬P ∨ Q')).toBe('¬P ∨ Q');
    expect(read('¬(P ∨ Q)')).toBe('¬(P ∨ Q)');
    expect(read('P ∨ Q ∧ R')).toBe('P ∨ (Q ∧ R)');
    expect(read('P ∧ Q ∨ R')).toBe('(P ∧ Q) ∨ R');
    expect(read('P ⇒ Q ⇒ R')).toBe('P ⇒ (Q ⇒ R)');
    expect(read('P ⇒ Q ⇔ R')).toBe('(P ⇒ Q) ⇔ R');
    expect(read('P ∧ Q ∧ R')).toBe('(P ∧ Q) ∧ R');
    expect(read('[P ∨ Q] ∧ R')).toBe('(P ∨ Q) ∧ R');
  });

  it('refuses what is not a formula, with a reason', () => {
    expect(read('PQ')).toMatch(/not one of the statements.*operator between letters/);
    expect(read('P ∧')).toMatch(/ends too early/);
    expect(read('(P ∧ Q')).toMatch(/not closed/);
    expect(read('P ∧ Q)')).toMatch(/no opening bracket/);
    expect(read('P Q', ['P', 'Q'])).toMatch(/without an operator/);
    expect(read('∧ P')).toMatch(/missing what comes before/);
    expect(read('P + Q')).toMatch(/Cannot read "\+"/);
    expect(read('S ∧ P')).toMatch(/"S" is not one of the statements/);
    expect(read('\\alpha')).toMatch(/Cannot read/);
    expect(read('')).toMatch(/Enter a formula/);
    expect(read(`${'¬'.repeat(200)}P`)).toMatch(/nested too deeply/);
    expect(read(`${'('.repeat(200)}P${')'.repeat(200)}`)).toMatch(/nested too deeply/);
    expect(read('P'.repeat(600))).toMatch(/too long/);
  });

  it('never evaluates code: a JavaScript expression is just unreadable text', () => {
    expect(read('alert(1)')).toMatch(/error/);
    expect(read('P || process.exit()')).toMatch(/error/);
  });

  it('evaluates by the truth tables of the connectives', () => {
    const f = parseFormula('P ⇒ Q', ['P', 'Q']);
    if (!f.ok) throw new Error(f.error);
    expect(assignments(['P', 'Q']).map((env) => evalFormula(f.value, env))).toEqual([true, false, true, true]);
    const g = parseFormula('P ⇔ Q', ['P', 'Q']);
    if (!g.ok) throw new Error(g.error);
    expect(assignments(['P', 'Q']).map((env) => evalFormula(g.value, env))).toEqual([true, false, false, true]);
  });

  it('prints LaTeX with a bracket around every compound operand of a connective', () => {
    const f = parseFormula('~(P & Q) -> R', ['P', 'Q', 'R']);
    if (!f.ok) throw new Error(f.error);
    expect(texOfFormula(f.value)).toBe('\\lnot (P \\land Q) \\Rightarrow R');
  });
});

describe('formula grading by truth table', () => {
  it('accepts any equivalent formula', () => {
    // Book of Proof 2.6: P ⇒ Q is equivalent to ¬P ∨ Q and to its contrapositive.
    for (const s of ['P ⇒ Q', '¬P ∨ Q', '¬Q ⇒ ¬P', '¬(P ∧ ¬Q)', 'Q ∨ ~P']) expect(gradeFormula(s, 'P => Q', PQ).correct, s).toBe(true);
    // De Morgan.
    expect(gradeFormula('¬P ∧ ¬Q', '¬(P ∨ Q)', PQ).correct).toBe(true);
    // Distributive law, three letters.
    expect(gradeFormula('(P ∧ Q) ∨ (P ∧ R)', 'P ∧ (Q ∨ R)', PQR).correct).toBe(true);
  });

  it('rejects an inequivalent formula and names a row where it differs', () => {
    const r = gradeFormula('Q ⇒ P', 'P ⇒ Q', PQ);
    expect(r.correct).toBe(false);
    expect(r.feedback).toBe('Not equivalent. When P is true and Q is false, yours is true, but the statement is false.');
    expect(gradeFormula('¬P ∨ ¬Q', '¬(P ∨ Q)', PQ).correct).toBe(false);
  });

  it('compares over every letter either side uses', () => {
    // P ∨ (Q ∧ ¬Q) is P, although it mentions Q.
    expect(gradeFormula('P ∨ (Q ∧ ¬Q)', 'P', PQ).correct).toBe(true);
    expect(gradeFormula('P ∧ Q', 'P', PQ).correct).toBe(false);
    expect(gradeFormula('P ∨ ¬P', 'T', PQ).correct).toBe(true);
  });

  it('an unreadable answer is not marked as a miss in a known way, and a broken expected formula is a problem error', () => {
    const r = gradeFormula('P ∧', 'P', PQ);
    expect(r.correct).toBe(false);
    expect(isProblemError(r)).toBe(false);
    expect(isProblemError(gradeFormula('P', 'P ∧', PQ))).toBe(true);
    expect(isProblemError(gradeFormula('P', 'P', { variables: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'] }))).toBe(true);
  });
});
