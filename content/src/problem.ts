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
  gradeChoice, gradeExact, gradeExpression, gradeNumeric, mulberry32, parseExpression, parseNumber, parseRational,
  type Expr, type GradeResult, type Rng, type VariableDomain,
} from '@learnhub/mastery';
import { computed, t, type Rich } from './rich';

/** Shapes an expression answer must have, beyond being equal to the expected one. */
export type ExprForm = 'product' | 'expanded' | 'no-fraction' | 'collected';

export interface ChoiceOption {
  id: string;
  label: Rich;
}

export type AnswerSpec =
  | { kind: 'exact'; expected: string; requireLowestTerms?: boolean }
  | { kind: 'numeric'; expected: number; relTol?: number; absTol?: number }
  | { kind: 'expression'; expected: string; variables: readonly string[]; domains?: Readonly<Record<string, VariableDomain>>; form?: ExprForm }
  /** `correct` as an array means "choose all that apply". */
  | { kind: 'choice'; options: readonly ChoiceOption[]; correct: string | readonly string[] };

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
    case 'exact': return gradeExact(text, spec.expected, { requireLowestTerms: spec.requireLowestTerms });
    case 'numeric': return gradeNumeric(text, spec.expected, { relTol: spec.relTol, absTol: spec.absTol });
    case 'expression': {
      const r = gradeExpression(text, spec.expected, { variables: spec.variables, domains: spec.domains });
      if (!r.correct || spec.form === undefined) return r;
      const parsed = parseExpression(text, spec.variables);
      const why = parsed.ok ? formProblem(parsed.value, spec.form) : null;
      return why === null ? r : { correct: false, feedback: why, normalizedAnswer: r.normalizedAnswer };
    }
    case 'choice': return gradeChoice(response, { options: spec.options.map((o) => o.id), correct: spec.correct });
  }
}

/** Whether two responses are the same answer under the spec's rules (ignoring form). */
export function sameAnswer(spec: AnswerSpec, a: Response, b: Response): boolean {
  const as = typeof a === 'string' ? a : [...a].sort().join(',');
  const bs = typeof b === 'string' ? b : [...b].sort().join(',');
  switch (spec.kind) {
    case 'exact': {
      const x = parseRational(as);
      const y = parseRational(bs);
      return x.ok && y.ok && x.value.num === y.value.num && x.value.den === y.value.den;
    }
    case 'numeric': {
      const x = parseNumber(as);
      const y = parseNumber(bs);
      return x !== null && y !== null && Math.abs(x - y) <= Math.max(spec.absTol ?? 1e-9, (spec.relTol ?? 1e-3) * Math.abs(y));
    }
    case 'expression': return gradeExpression(as, bs, { variables: spec.variables, domains: spec.domains }).correct;
    case 'choice': return as === bs;
  }
}

/**
 * Grades a response. A wrong answer that matches a known misconception gets that
 * misconception's explanation; any other wrong answer gets the grader's own feedback.
 */
export function grade(problem: Problem, response: Response, misconceptions: readonly Misconception[] = []): Feedback {
  const r = gradeSpec(problem.answer, response);
  if (r.correct) return r;
  const m = misconceptions.find((x) => sameAnswer(problem.answer, response, x.response));
  return m === undefined ? r : { ...r, misconception: m.why };
}

/** The expected answer as text: the value, or the labels of the correct options. */
export function answerText(spec: AnswerSpec): Rich {
  switch (spec.kind) {
    case 'exact': return [computed(spec.expected)];
    case 'numeric': return t`${spec.expected}`;
    case 'expression': return [{ ...computed(spec.expected), kind: 'math' }];
    case 'choice': {
      const ids = typeof spec.correct === 'string' ? [spec.correct] : spec.correct;
      const labels = spec.options.filter((o) => ids.includes(o.id)).map((o) => o.label);
      return labels.flatMap((l, i) => (i === 0 ? [...l] : [...t`; `, ...l]));
    }
  }
}
