/**
 * Propositional formulas: a safe parser (no eval), evaluation, LaTeX, and a grader that
 * accepts any formula logically equivalent to the expected one, decided by comparing the
 * two truth tables over every variable either uses.
 *
 * Accepted forms, so the symbols of a phone, a keyboard, or a textbook all work:
 * - not: ¬ ~ ∼ ! not \lnot
 * - and: ∧ & && /\ and \land
 * - or: ∨ | || \/ or \lor
 * - implies: ⇒ → => -> implies \Rightarrow \implies \to
 * - if and only if: ⇔ ↔ <=> <-> iff \Leftrightarrow \iff
 * - constants: ⊤ ⊥ true false, and T and F when they are not variables
 *
 * Precedence, tightest first: not, and, or, implies, iff. Implies groups to the right, so
 * P ⇒ Q ⇒ R is P ⇒ (Q ⇒ R). The preview prints the formula with brackets, so the learner
 * sees how it was read.
 */
import type { ParseResult } from './rational';
import { MAX_ANSWER_LENGTH, problemError, type GradeResult } from './types';

export type BoolOp = 'and' | 'or' | 'implies' | 'iff';

export type Formula =
  | { kind: 'var'; name: string }
  | { kind: 'const'; value: boolean }
  | { kind: 'not'; arg: Formula }
  | { kind: 'bin'; op: BoolOp; left: Formula; right: Formula };

/** More variables than this make the truth table too large to compare. */
export const MAX_FORMULA_VARIABLES = 8;
const MAX_DEPTH = 64;

type Tok =
  | { t: 'var'; name: string }
  | { t: 'const'; value: boolean }
  | { t: 'not' }
  | { t: 'op'; op: BoolOp }
  | { t: '(' }
  | { t: ')' };

const WORDS: Readonly<Record<string, Tok>> = {
  not: { t: 'not' }, and: { t: 'op', op: 'and' }, or: { t: 'op', op: 'or' },
  implies: { t: 'op', op: 'implies' }, iff: { t: 'op', op: 'iff' },
  true: { t: 'const', value: true }, false: { t: 'const', value: false },
};

const COMMANDS: Readonly<Record<string, Tok>> = {
  lnot: { t: 'not' }, neg: { t: 'not' }, land: { t: 'op', op: 'and' }, wedge: { t: 'op', op: 'and' },
  lor: { t: 'op', op: 'or' }, vee: { t: 'op', op: 'or' },
  Rightarrow: { t: 'op', op: 'implies' }, implies: { t: 'op', op: 'implies' }, to: { t: 'op', op: 'implies' }, rightarrow: { t: 'op', op: 'implies' },
  Leftrightarrow: { t: 'op', op: 'iff' }, iff: { t: 'op', op: 'iff' }, leftrightarrow: { t: 'op', op: 'iff' },
  top: { t: 'const', value: true }, bot: { t: 'const', value: false },
};

/** Multi-character symbols first, so "<=>" is not read as "<" then "=>". */
const SYMBOLS: readonly (readonly [string, Tok])[] = [
  ['<=>', { t: 'op', op: 'iff' }], ['<->', { t: 'op', op: 'iff' }],
  ['=>', { t: 'op', op: 'implies' }], ['->', { t: 'op', op: 'implies' }],
  ['&&', { t: 'op', op: 'and' }], ['/\\', { t: 'op', op: 'and' }], ['||', { t: 'op', op: 'or' }], ['\\/', { t: 'op', op: 'or' }],
  ['¬', { t: 'not' }], ['~', { t: 'not' }], ['∼', { t: 'not' }], ['!', { t: 'not' }],
  ['∧', { t: 'op', op: 'and' }], ['&', { t: 'op', op: 'and' }],
  ['∨', { t: 'op', op: 'or' }], ['|', { t: 'op', op: 'or' }],
  ['⇒', { t: 'op', op: 'implies' }], ['→', { t: 'op', op: 'implies' }], ['⟹', { t: 'op', op: 'implies' }],
  ['⇔', { t: 'op', op: 'iff' }], ['↔', { t: 'op', op: 'iff' }], ['⟺', { t: 'op', op: 'iff' }],
  ['⊤', { t: 'const', value: true }], ['⊥', { t: 'const', value: false }],
  ['(', { t: '(' }], [')', { t: ')' }], ['[', { t: '(' }], [']', { t: ')' }],
];

function tokenize(s: string, variables: readonly string[]): ParseResult<Tok[]> {
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i] as string;
    if (/\s/.test(c)) { i++; continue; }
    const sym = SYMBOLS.find(([text]) => s.startsWith(text, i));
    if (sym !== undefined) {
      out.push(sym[1]);
      i += sym[0].length;
      continue;
    }
    if (c === '\\') {
      const m = /^\\([A-Za-z]+)/.exec(s.slice(i));
      const tok = m === null ? undefined : COMMANDS[m[1] as string];
      if (m === null || tok === undefined) return { ok: false, error: `Cannot read "${m?.[0] ?? c}".` };
      out.push(tok);
      i += m[0].length;
      continue;
    }
    const m = /^[A-Za-z][A-Za-z0-9_]*/.exec(s.slice(i));
    if (m !== null) {
      const w = m[0];
      if (variables.includes(w)) out.push({ t: 'var', name: w });
      else if (WORDS[w.toLowerCase()] !== undefined) out.push(WORDS[w.toLowerCase()] as Tok);
      else if (w === 'T' || w === 'F') out.push({ t: 'const', value: w === 'T' });
      else {
        // Letters run together ("PQ") are two names without an operator between them.
        const names = variables.length === 0 ? 'no letters' : variables.join(', ');
        return { ok: false, error: `"${w}" is not one of the statements (${names}). Put an operator between letters.` };
      }
      i += w.length;
      continue;
    }
    return { ok: false, error: `Cannot read "${c}".` };
  }
  return { ok: true, value: out };
}

const BINDING: Readonly<Record<BoolOp, number>> = { iff: 1, implies: 2, or: 3, and: 4 };

/** Precedence climbing over the tokens. Throws a string with the reason; `parseFormula` catches it. */
function parseTokens(toks: readonly Tok[]): Formula {
  let i = 0;
  let depth = 0;
  const peek = (): Tok | undefined => toks[i];
  const atom = (): Formula => {
    if (++depth > MAX_DEPTH) throw 'That formula is nested too deeply.';
    try {
      const tk = toks[i++];
      if (tk === undefined) throw 'The formula ends too early.';
      if (tk.t === 'not') return { kind: 'not', arg: atom() };
      if (tk.t === 'var') return { kind: 'var', name: tk.name };
      if (tk.t === 'const') return { kind: 'const', value: tk.value };
      if (tk.t === '(') {
        const e = expr(0);
        if (peek()?.t !== ')') throw 'A bracket is not closed.';
        i++;
        return e;
      }
      throw tk.t === ')' ? 'A closing bracket has no opening bracket.' : 'An operator is missing what comes before it.';
    } finally {
      depth--;
    }
  };
  const expr = (min: number): Formula => {
    let left = atom();
    for (;;) {
      const tk = peek();
      if (tk === undefined || tk.t !== 'op' || BINDING[tk.op] < min) return left;
      i++;
      // Implies and iff group to the right; and and or to the left.
      const right = expr(tk.op === 'implies' || tk.op === 'iff' ? BINDING[tk.op] : BINDING[tk.op] + 1);
      left = { kind: 'bin', op: tk.op, left, right };
    }
  };
  const f = expr(0);
  const rest = peek();
  if (rest !== undefined) throw rest.t === ')' ? 'A closing bracket has no opening bracket.' : 'Two parts are written next to each other without an operator between them.';
  return f;
}

/** Reads a formula whose letters must be among `variables`. */
export function parseFormula(input: string, variables: readonly string[]): ParseResult<Formula> {
  if (input.length > MAX_ANSWER_LENGTH) return { ok: false, error: 'That answer is too long.' };
  const s = input.trim();
  if (s === '') return { ok: false, error: 'Enter a formula.' };
  const toks = tokenize(s, variables);
  if (!toks.ok) return toks;
  try {
    return { ok: true, value: parseTokens(toks.value) };
  } catch (e) {
    return { ok: false, error: typeof e === 'string' ? e : 'Cannot read that formula.' };
  }
}

export function evalFormula(f: Formula, env: Readonly<Record<string, boolean>>): boolean {
  switch (f.kind) {
    case 'var': return env[f.name] === true;
    case 'const': return f.value;
    case 'not': return !evalFormula(f.arg, env);
    case 'bin': {
      const a = evalFormula(f.left, env);
      const b = evalFormula(f.right, env);
      switch (f.op) {
        case 'and': return a && b;
        case 'or': return a || b;
        case 'implies': return !a || b;
        case 'iff': return a === b;
      }
    }
  }
}

/** The variables a formula uses, in first-use order. */
export function formulaVariables(f: Formula, out: string[] = []): string[] {
  if (f.kind === 'var' && !out.includes(f.name)) out.push(f.name);
  else if (f.kind === 'not') formulaVariables(f.arg, out);
  else if (f.kind === 'bin') { formulaVariables(f.left, out); formulaVariables(f.right, out); }
  return out;
}

const TEX_OP: Readonly<Record<BoolOp, string>> = { and: '\\land', or: '\\lor', implies: '\\Rightarrow', iff: '\\Leftrightarrow' };

/** LaTeX with a bracket around every compound operand, so the reading is unambiguous. */
export function texOfFormula(f: Formula): string {
  const side = (g: Formula): string => (g.kind === 'bin' ? `(${texOfFormula(g)})` : texOfFormula(g));
  switch (f.kind) {
    case 'var': return f.name;
    case 'const': return f.value ? '\\top' : '\\bot';
    case 'not': return `\\lnot ${side(f.arg)}`;
    case 'bin': return `${side(f.left)} ${TEX_OP[f.op]} ${side(f.right)}`;
  }
}

/** Plain text in the same shape as the LaTeX, for normalized answers. */
export function formatFormula(f: Formula): string {
  const side = (g: Formula): string => (g.kind === 'bin' ? `(${formatFormula(g)})` : formatFormula(g));
  const OP: Readonly<Record<BoolOp, string>> = { and: '∧', or: '∨', implies: '⇒', iff: '⇔' };
  switch (f.kind) {
    case 'var': return f.name;
    case 'const': return f.value ? '⊤' : '⊥';
    case 'not': return `¬${side(f.arg)}`;
    case 'bin': return `${side(f.left)} ${OP[f.op]} ${side(f.right)}`;
  }
}

/** Every assignment of the variables, all true first, as truth tables are written. */
export function assignments(vars: readonly string[]): Record<string, boolean>[] {
  const n = vars.length;
  return Array.from({ length: 2 ** n }, (_, i) => Object.fromEntries(vars.map((v, j) => [v, ((i >> (n - 1 - j)) & 1) === 0])));
}

/** A row where the two formulas differ, or null when they are equivalent. */
export function differingRow(a: Formula, b: Formula, vars: readonly string[]): Record<string, boolean> | null {
  return assignments(vars).find((env) => evalFormula(a, env) !== evalFormula(b, env)) ?? null;
}

export interface FormulaOptions {
  /** The statement letters the question uses, for example ['P', 'Q']. */
  variables: readonly string[];
}

const tf = (b: boolean): string => (b ? 'true' : 'false');

/**
 * Right when the answer is logically equivalent to `expected`: the same truth value in
 * every row of the truth table over the variables. A wrong answer is told one row where
 * it differs, which is the counterexample a learner would look for.
 */
export function gradeFormula(answer: string, expected: string, options: FormulaOptions): GradeResult {
  if (options.variables.length > MAX_FORMULA_VARIABLES) return problemError('too many variables to compare truth tables', answer);
  const e = parseFormula(expected, options.variables);
  if (!e.ok) return problemError(`expected formula "${expected}" does not parse: ${e.error}`, answer);
  const a = parseFormula(answer, options.variables);
  if (!a.ok) return { correct: false, feedback: a.error, normalizedAnswer: answer.trim() };
  const normalizedAnswer = formatFormula(a.value);
  const vars = options.variables.filter((v) => formulaVariables(a.value).includes(v) || formulaVariables(e.value).includes(v));
  const row = differingRow(a.value, e.value, vars);
  if (row === null) return { correct: true, normalizedAnswer };
  const where = vars.length === 0 ? 'Its value' : `When ${vars.map((v) => `${v} is ${tf(row[v] === true)}`).join(' and ')}, yours`;
  return {
    correct: false,
    feedback: `Not equivalent. ${where} is ${tf(evalFormula(a.value, row))}, but the statement is ${tf(evalFormula(e.value, row))}.`,
    normalizedAnswer,
  };
}
