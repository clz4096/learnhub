/**
 * Propositional formulas for the logic lessons, through the formula grader's own parser
 * and evaluator (packages/mastery/src/grade/formula.ts): formulas are written in its ASCII
 * syntax ("~P | Q", "P => Q"), shown as LaTeX, and evaluated row by row. Shared by the
 * logic and proof topics; a topic module that imports it pulls it into its own chunk.
 */
import { assignments, evalFormula, parseFormula, texOfFormula, type Formula } from '@learnhub/mastery';
import type { AnswerSpec } from './problem';
import { computedTex, math, t, type Rich, type Span } from './rich';

/** The formula a text denotes. Throws on a typo: that is a content bug, and the content checks run every formula. */
export function formulaOf(text: string, vars: readonly string[]): Formula {
  const r = parseFormula(text, vars);
  if (!r.ok) throw new Error(`content formula "${text}": ${r.error}`);
  return r.value;
}

/** A formula as inline math: "~P | Q" is \lnot P \lor Q. */
export function fm(text: string, vars: readonly string[] = ['P', 'Q', 'R']): Span {
  return computedTex(texOfFormula(formulaOf(text, vars)));
}

export const TF = (b: boolean): string => (b ? 'T' : 'F');

/** The truth value of a formula in each row, all true first. */
export function column(text: string, vars: readonly string[]): boolean[] {
  const f = formulaOf(text, vars);
  return assignments(vars).map((env) => evalFormula(f, env));
}

/** Whether two formulas have the same truth value in every row. */
export function equivalent(a: string, b: string, vars: readonly string[]): boolean {
  const x = column(a, vars);
  const y = column(b, vars);
  return x.every((v, i) => v === y[i]);
}

/** The rows (indices, all true first) where two formulas differ. */
export function differingRows(a: string, b: string, vars: readonly string[]): number[] {
  const x = column(a, vars);
  const y = column(b, vars);
  return x.flatMap((v, i) => (v === y[i] ? [] : [i]));
}

/** A row as math: P = T, Q = F. */
export function rowText(i: number, vars: readonly string[]): Rich {
  const env = assignments(vars)[i] as Record<string, boolean>;
  return [math`${computedTex(vars.map((v) => `${v} = \\mathrm{${TF(env[v] === true)}}`).join(',\\ '))}`];
}

/**
 * A truth table to fill in: the letters' columns given, one column per formula blank,
 * as the table grader marks it. `expected` reads row by row.
 */
export function truthTable(texts: readonly string[], vars: readonly string[]): Extract<AnswerSpec, { kind: 'table' }> {
  const envs = assignments(vars);
  const fs = texts.map((x) => formulaOf(x, vars));
  return {
    kind: 'table', cell: 'truth',
    columns: [...vars.map((v) => [math`${v}`]), ...texts.map((x) => [fm(x, vars)])],
    rows: envs.map((env) => [...vars.map((v) => t`${TF(env[v] === true)}`), ...fs.map(() => null)]),
    expected: envs.flatMap((env) => fs.map((f) => TF(evalFormula(f, env)))),
  };
}
