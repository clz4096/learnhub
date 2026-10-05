/**
 * The problem runtime: generators make problems from a seed, and `grade` checks a
 * response with the engine's graders (packages/mastery/src/grade). One runtime serves
 * lesson practice, reviews, quiz items, and placement questions.
 *
 * Every generator has a reference solver that computes the answer another way (by brute
 * force where it can), and a list of common misconceptions with the wrong answer each one
 * produces. The content checks run every generator over many seeds: the solver's answer
 * must be accepted, and every misconception's answer rejected. When a learner's wrong
 * answer matches a misconception, `grade` returns that misconception's explanation, so
 * feedback names the likely slip instead of only saying "wrong".
 */
import {
  formatWitness, gradeChoice, gradeExact, gradeExpression, gradeFormula, gradeNumeric, gradeTable, gradeWitness, mulberry32, normalizeSymbols,
  parseExpression, parseFormula, parseNumber, parseRational, parseWitness, texNumber, texOfExpression, texOfFormula, readTruth,
  type CellKind, type Expr, type GradeResult, type Rational, type Rng, type VariableDomain, type WitnessSpec,
} from '@learnhub/mastery';
import { exprTex, t, texOfRational, type Rich, type Span } from './rich';

/** Shapes an expression answer must have, beyond being equal to the expected one. */
export type ExprForm = 'product' | 'expanded' | 'no-fraction' | 'collected';

export interface ChoiceOption {
  id: string;
  label: Rich;
}

export type AnswerSpec =
  /** `ratio`: the question asks for a ratio, so a:b is read as a/b. */
  | { kind: 'exact'; expected: string; requireLowestTerms?: boolean; ratio?: boolean }
  | { kind: 'numeric'; expected: number; relTol?: number; absTol?: number }
  /** `binomial`: the question asks for a binomial coefficient, so C(n, k) and nCk are read as choose(n, k). */
  | { kind: 'expression'; expected: string; variables: readonly string[]; domains?: Readonly<Record<string, VariableDomain>>; form?: ExprForm; binomial?: boolean }
  /** `correct` as an array means "choose all that apply". */
  | { kind: 'choice'; options: readonly ChoiceOption[]; correct: string | readonly string[] }
  /**
   * An example or counterexample checked by a predicate (the witness grader). `example` is
   * one valid witness, shown as the answer after a miss; `unordered` means the values are
   * a set, so misconceptions match in any order.
   */
  | ({ kind: 'witness'; example: string; unordered?: boolean } & WitnessSpec)
  /**
   * A table filled in cell by cell (the table grader). `rows` gives every cell: a Rich for
   * a given cell, null for a blank the learner fills. `expected` is the text of the blanks
   * in reading order.
   */
  | { kind: 'table'; columns: readonly Rich[]; rows: readonly (readonly (Rich | null)[])[]; expected: readonly string[]; cell: CellKind }
  /** A propositional formula in `variables`, right when equivalent to `expected` (the formula grader). */
  | { kind: 'formula'; expected: string; variables: readonly string[] };

/** Typed text, or the chosen option ids of a choice problem. */
export type Response = string | readonly string[];

export interface Problem {
  prompt: Rich;
  answer: AnswerSpec;
  /** Steps of the worked solution, shown after an attempt and in worked examples. */
  solution: readonly Rich[];
}

export interface Misconception {
  /** The answer this slip produces. */
  response: Response;
  /** Kind and specific: what the slip was and how to fix it. */
  why: Rich;
}

/** One problem made from one set of parameters. */
export interface Instance {
  generatorId: string;
  /** The seed it was made from, when made by `instance`; with the generator id it reproduces the problem. */
  seed?: number;
  problem: Problem;
  /** The reference solver's answer. */
  reference: Response;
  misconceptions: readonly Misconception[];
  /** Null when the parameters are in their sane ranges, else what is wrong. */
  saneError: string | null;
  /** For probability problems: one run of the experiment; true when the event happens. */
  trial?: (rng: Rng) => boolean;
}

export interface GeneratorSpec<P> {
  /** Unique within the topic. */
  id: string;
  /** The skill it practices, one line. */
  skill: string;
  params(rng: Rng): P;
  sane(p: P): string | null;
  problem(p: P): Problem;
  /** Reference solver: the answer computed independently of `problem`. */
  solve(p: P): Response;
  misconceptions(p: P): Misconception[];
  /** Probability problems: the answer must be the exact probability of this event. */
  trial?(p: P, rng: Rng): boolean;
}

export interface Generator<P = unknown> {
  id: string;
  skill: string;
  /** The problem for a seed. Deterministic. */
  instance(seed: number): Instance;
  /** The problem for given parameters, for worked examples. */
  at(p: P): Instance;
}

export function generator<P>(g: GeneratorSpec<P>): Generator<P> {
  const at = (p: P): Instance => {
    const problem = g.problem(p);
    const inst: Instance = {
      generatorId: g.id,
      problem,
      reference: g.solve(p),
      // A slip that happens to land on a right answer for these numbers is not a wrong answer.
      misconceptions: g.misconceptions(p).filter((m) => !gradeSpec(problem.answer, m.response).correct),
      saneError: g.sane(p),
    };
    if (g.trial) inst.trial = (rng) => (g.trial as (p: P, rng: Rng) => boolean)(p, rng);
    return inst;
  };
  return { id: g.id, skill: g.skill, at, instance: (seed) => ({ ...at(g.params(mulberry32(seed))), seed }) };
}

// ---------------------------------------------------------------- grading

export interface Feedback extends GradeResult {
  /** The misconception the answer matches, when it is wrong in a known way. */
  misconception?: Rich;
  /** For a table answer: the indices of the wrong cells, in reading order. */
  wrongCells?: readonly number[];
}

function walk(e: Expr, f: (x: Expr) => boolean): boolean {
  if (f(e)) return true;
  if (e.kind === 'neg') return walk(e.arg, f);
  if (e.kind === 'bin') return walk(e.left, f) || walk(e.right, f);
  if (e.kind === 'call') return e.args.some((a) => walk(a, f));
  return false;
}

const hasVar = (e: Expr): boolean => walk(e, (x) => x.kind === 'var');
const isSum = (e: Expr): boolean => e.kind === 'bin' && (e.op === '+' || e.op === '-');

/** Why the answer does not have the required shape, or null when it does. */
export function formProblem(e: Expr, form: ExprForm): string | null {
  switch (form) {
    case 'product': {
      const body = e.kind === 'neg' ? e.arg : e;
      const ok = body.kind === 'bin' && body.op === '*' && hasVar(body.left) && hasVar(body.right);
      return ok ? null : 'That has the right value, but it is not factorised. Write it as a product of brackets, like (x + 2)(x + 3).';
    }
    case 'expanded': {
      const bracketed = walk(e, (x) => (x.kind === 'bin' && (x.op === '*' || x.op === '^') && (isSum(x.left) || isSum(x.right))) || (x.kind === 'neg' && isSum(x.arg)));
      return bracketed ? 'That has the right value, but it still has brackets. Multiply them out and collect like terms.' : null;
    }
    case 'collected': {
      const seen = new Map<string, number>();
      walk(e, (x) => { if (x.kind === 'var') seen.set(x.name, (seen.get(x.name) ?? 0) + 1); return false; });
      const repeated = [...seen].find(([, n]) => n > 1);
      return repeated === undefined ? null : `That has the right value, but ${repeated[0]} appears more than once. Collect the like terms into one term each.`;
    }
    case 'no-fraction': {
      const frac = walk(e, (x) => x.kind === 'bin' && x.op === '/' && hasVar(x.right));
      return frac ? 'That has the right value, but it still has a fraction. Cancel the common factor so no letter is left in a denominator.' : null;
    }
  }
}

function gradeSpec(spec: AnswerSpec, response: Response): GradeResult {
  const text = typeof response === 'string' ? response : response.join(', ');
  switch (spec.kind) {
    case 'exact': return gradeExact(text, spec.expected, { requireLowestTerms: spec.requireLowestTerms, ratio: spec.ratio });
    case 'numeric': return gradeNumeric(text, spec.expected, { relTol: spec.relTol, absTol: spec.absTol });
    case 'expression': {
      const r = gradeExpression(text, spec.expected, { variables: spec.variables, domains: spec.domains, binomial: spec.binomial });
      if (!r.correct || spec.form === undefined) return r;
      const parsed = parseExpression(text, spec.variables, { binomial: spec.binomial });
      const why = parsed.ok ? formProblem(parsed.value, spec.form) : null;
      return why === null ? r : { correct: false, feedback: why, normalizedAnswer: r.normalizedAnswer };
    }
    case 'choice': return gradeChoice(response, { options: spec.options.map((o) => o.id), correct: spec.correct });
    case 'witness': return gradeWitness(text, spec);
    case 'table': return gradeTable(typeof response === 'string' ? [response] : response, { expected: spec.expected, cell: spec.cell });
    case 'formula': return gradeFormula(text, spec.expected, { variables: spec.variables });
  }
}

/** The witness values as text in a canonical form, sorted for a set; null when they do not parse. */
function witnessKey(spec: Extract<AnswerSpec, { kind: 'witness' }>, text: string): string | null {
  const r = parseWitness(text, spec);
  if (!r.ok) return null;
  const vals = spec.unordered === true ? [...r.value].sort((a, b) => (a.num * b.den < b.num * a.den ? -1 : a.num * b.den > b.num * a.den ? 1 : 0)) : r.value;
  return formatWitness(vals);
}

/** A table's cells as canonical keys (T, F, or a rational); null when a cell does not read. */
function tableKey(spec: Extract<AnswerSpec, { kind: 'table' }>, cells: readonly string[]): string | null {
  const keys = cells.map((c) => {
    if (spec.cell === 'truth') {
      const b = readTruth(c);
      return b === null ? null : b ? 'T' : 'F';
    }
    const r = parseRational(c);
    return r.ok ? `${r.value.num}/${r.value.den}` : null;
  });
  return keys.some((k) => k === null) ? null : keys.join('|');
}

/**
 * Why a filled table cannot be marked yet (a blank or unreadable cell), or null when every
 * cell reads. Like an unreadable typed answer, such a table is never graded as a miss.
 */
export function tableNotice(spec: Extract<AnswerSpec, { kind: 'table' }>, cells: readonly string[]): string | null {
  const blank = cells.filter((c) => c.trim() === '').length;
  if (blank > 0 || cells.length < spec.expected.length) return blank === 1 ? 'Fill in the empty cell first.' : 'Fill in every empty cell first.';
  const bad = cells.findIndex((c) => (spec.cell === 'truth' ? readTruth(c) === null : !parseRational(c).ok));
  if (bad < 0) return null;
  return spec.cell === 'truth' ? `Cell ${bad + 1} reads "${(cells[bad] as string).trim()}": write T or F.` : `Cell ${bad + 1} reads "${(cells[bad] as string).trim()}": write a number, such as 3 or 3/8.`;
}

/** Whether two responses are the same answer under the spec's rules (ignoring form). */
export function sameAnswer(spec: AnswerSpec, a: Response, b: Response): boolean {
  const as = typeof a === 'string' ? a : [...a].sort().join(',');
  const bs = typeof b === 'string' ? b : [...b].sort().join(',');
  switch (spec.kind) {
    case 'exact': {
      const x = parseRational(as, { ratio: spec.ratio });
      const y = parseRational(bs, { ratio: spec.ratio });
      return x.ok && y.ok && x.value.num === y.value.num && x.value.den === y.value.den;
    }
    case 'numeric': {
      const x = parseNumber(as);
      const y = parseNumber(bs);
      return x !== null && y !== null && Math.abs(x - y) <= Math.max(spec.absTol ?? 1e-9, (spec.relTol ?? 1e-3) * Math.abs(y));
    }
    case 'expression': return gradeExpression(as, bs, { variables: spec.variables, domains: spec.domains, binomial: spec.binomial }).correct;
    case 'choice': return as === bs;
    case 'witness': {
      const x = witnessKey(spec, as);
      return x !== null && x === witnessKey(spec, bs);
    }
    case 'table': {
      // Cells keep their order: a table is not a set.
      const x = tableKey(spec, typeof a === 'string' ? [a] : a);
      return x !== null && x === tableKey(spec, typeof b === 'string' ? [b] : b);
    }
    case 'formula': return gradeFormula(as, bs, { variables: spec.variables }).correct;
  }
}

/**
 * Grades a response. A wrong answer that matches a known misconception gets that
 * misconception's explanation; any other wrong answer gets the grader's own feedback.
 */
export function grade(problem: Problem, response: Response, misconceptions: readonly Misconception[] = []): Feedback {
  const g = gradeSpec(problem.answer, response);
  const wrong = (g as { wrong?: readonly number[] }).wrong;
  const r: Feedback = wrong === undefined || wrong.length === 0 ? g : { ...g, wrongCells: wrong };
  if (r.correct) return r;
  const m = misconceptions.find((x) => sameAnswer(problem.answer, response, x.response));
  return m === undefined ? r : { ...r, misconception: m.why };
}

/** The expected answer as text: the value, or the labels of the correct options. */
export function answerText(spec: AnswerSpec): Rich {
  switch (spec.kind) {
    case 'exact': {
      const r = parseRational(spec.expected);
      return r.ok ? t`${r.value}` : [{ kind: 'num', text: spec.expected, typed: [] }];
    }
    case 'numeric': return t`${spec.expected}`;
    case 'expression': {
      const r = parseExpression(spec.expected, spec.variables);
      const math: Span = { kind: 'math', text: r.ok ? texOfExpression(r.value) : exprTex(spec.expected), typed: [] };
      return [math];
    }
    case 'choice': {
      const ids = typeof spec.correct === 'string' ? [spec.correct] : spec.correct;
      const labels = spec.options.filter((o) => ids.includes(o.id)).map((o) => o.label);
      return labels.flatMap((l, i) => (i === 0 ? [...l] : [...t`; `, ...l]));
    }
    case 'witness': {
      const r = parseWitness(spec.example, spec);
      const tex = r.ok ? witnessTex(r.value, spec.names) : `\\text{${spec.example}}`;
      return [{ kind: 'math', text: tex, typed: [] }];
    }
    case 'table': return [{ kind: 'num', text: spec.expected.join(', '), typed: [] }];
    case 'formula': {
      const r = parseFormula(spec.expected, spec.variables);
      return [{ kind: 'math', text: r.ok ? texOfFormula(r.value) : spec.expected, typed: [] }];
    }
  }
}

/** Witness values as LaTeX: x = -8,\ y = 11, or a list. */
export function witnessTex(values: readonly Rational[], names?: readonly string[]): string {
  const named = names !== undefined && names.length === values.length;
  return values.map((v, i) => {
    const tex = v.den === 1n ? texNumber(Number(v.num)) : texOfRational(v);
    return named ? `${texName(names[i] as string)} = ${tex}` : tex;
  }).join(',\\ ');
}

/** A value's name as LaTeX: t3 is t_{3}, so a subscripted name reads as written. */
function texName(name: string): string {
  const m = /^([A-Za-z]+)(\d+)$/.exec(name);
  return m === null ? name : `${m[1]}_{${m[2]}}`;
}

// ---------------------------------------------------------------- reading an answer as it is typed

/**
 * How a typed answer was read, for the live preview under the answer box: its LaTeX, and
 * a note when it was read but will not be accepted in that form (a calculation where a
 * value is asked, a ratio where a fraction is asked). Null when it cannot be read yet.
 */
export interface AnswerReading {
  tex: string;
  note?: string;
}

const SCIENTIFIC = /^([+-]?(?:\d+\.?\d*|\.\d+))e([+-]?\d+)$/i;
const RATIO = /^([+-]?\d+)\s*:\s*([+-]?\d+)$/;

/** Reads a number or a calculation of numbers, as the exact and numeric graders see it. */
function readNumber(text: string, spec: Extract<AnswerSpec, { kind: 'exact' | 'numeric' }>): AnswerReading | null {
  const s = normalizeSymbols(text).replace(/^([+-])\s+/, '$1');
  const ratio = RATIO.exec(s);
  if (ratio !== null) {
    const tex = `${ratio[1]} : ${ratio[2]}`;
    return spec.kind === 'exact' && spec.ratio === true ? { tex } : { tex, note: 'Write it as a fraction, for example 3/8.' };
  }
  if (spec.kind === 'numeric') {
    const sci = SCIENTIFIC.exec(s);
    if (sci !== null) return { tex: `${sci[1]} \\times 10^{${Number(sci[2])}}` };
  }
  const e = parseExpression(s, []);
  if (!e.ok) return null;
  const tex = texOfExpression(e.value);
  const value = spec.kind === 'exact' ? parseRational(s, { ratio: spec.ratio }) : null;
  if (spec.kind === 'exact' && value !== null && !value.ok) return { tex, note: value.error };
  if (spec.kind === 'numeric' && parseNumber(s) === null) return { tex, note: 'Work it out to a single number.' };
  return { tex };
}

/** How the answer box's text was read, or null when it cannot be read (yet). Choice answers have no preview. */
export function readAnswer(spec: AnswerSpec, text: string): AnswerReading | null {
  if (text.trim() === '') return null;
  switch (spec.kind) {
    case 'exact':
    case 'numeric': return readNumber(text, spec);
    case 'expression': {
      // No form note here: "right value, but not factorised" would tell the learner the value before Check.
      const r = parseExpression(text, spec.variables, { binomial: spec.binomial });
      return r.ok ? { tex: texOfExpression(r.value) } : null;
    }
    case 'witness': {
      const r = parseWitness(text, spec);
      return r.ok ? { tex: witnessTex(r.value, spec.names) } : null;
    }
    case 'formula': {
      const r = parseFormula(text, spec.variables);
      return r.ok ? { tex: texOfFormula(r.value) } : null;
    }
    case 'choice':
    case 'table': return null;
  }
}
