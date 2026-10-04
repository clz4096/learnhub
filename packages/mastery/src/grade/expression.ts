/**
 * Expression equivalence by evaluation at random points (randomized identity testing).
 *
 * Two different expressions can agree at a few points (x and x^3 agree at -1, 0, 1), but
 * agreeing at dozens of random reals is overwhelming evidence: x^2 and |x|*x differ at
 * every negative x, so 40 points from [-5, 5] all landing on x >= 0 has probability 2^-40.
 *
 * Points where either side is undefined (a log of a negative, a division by zero, a
 * factorial of a non-integer) are skipped, and the answer is only judged once enough
 * points were defined for both. So sqrt(x)^2 for x is accepted where both are defined;
 * domains that matter belong in the problem's `domains`.
 */
import { mulberry32, randInt, randReal, type Rng } from '../rng';
import { evaluate, formatExpression, parseExpression, variablesOf, type Expr } from './expr';
import { problemError, type GradeResult } from './types';

export interface VariableDomain {
  kind: 'real' | 'integer';
  /** Inclusive for integers; [min, max) for reals. */
  min: number;
  max: number;
}

export interface ExpressionOptions {
  variables: readonly string[];
  /** Per variable; others use DEFAULT_DOMAIN. */
  domains?: Readonly<Record<string, VariableDomain>>;
  /** Points defined for both sides required before judging. */
  points?: number;
  /** Sampling gives up after this many tries. */
  maxTries?: number;
  relTol?: number;
  absTol?: number;
  /** Defaults to a fixed seed, so a grade never changes between runs. */
  rng?: Rng;
  /** Read C(n, k) and nCk in the answer as choose(n, k); see parseExpression. */
  binomial?: boolean;
}

/** Wide enough to include negatives and values far from 0 and 1, where most wrong identities fail. */
export const DEFAULT_DOMAIN: Readonly<VariableDomain> = { kind: 'real', min: -5, max: 5 };

/**
 * 40 points; up to 10 tries per point, so an answer defined on a tenth of the domain is
 * still judged. Tolerance 1e-9 relative: rounding in equivalent forms is around 1e-15,
 * so this accepts every true identity and rejects differences a learner could make.
 */
export const DEFAULT_EXPRESSION = { points: 40, triesPerPoint: 10, relTol: 1e-9, absTol: 1e-12, seed: 0x5eed } as const;

/** Every point of an all-integer domain, when there are at most `limit` of them; else null. */
function enumerate(vars: readonly string[], domain: (v: string) => VariableDomain, limit: number): Record<string, number>[] | null {
  let size = 1;
  for (const v of vars) {
    const d = domain(v);
    if (d.kind !== 'integer') return null;
    size *= Math.max(0, Math.floor(d.max) - Math.ceil(d.min) + 1);
    if (size > limit) return null;
  }
  let pts: Record<string, number>[] = [{}];
  for (const v of vars) {
    const d = domain(v);
    const next: Record<string, number>[] = [];
    for (const p of pts) for (let x = Math.ceil(d.min); x <= Math.floor(d.max); x++) next.push({ ...p, [v]: x });
    pts = next;
  }
  return pts;
}

function show(x: number): string {
  return Number.isInteger(x) ? String(x) : String(Number(x.toPrecision(6)));
}

function mismatch(env: Readonly<Record<string, number>>, value: number): string {
  const parts = Object.entries(env).map(([k, v]) => `${k} = ${show(v)}`);
  const at = parts.length === 0 ? 'Your expression' : `At ${parts.join(', ')}, your expression`;
  return `${at} is ${show(value)}, which does not match.`;
}

/**
 * Grades `answer` against `expected` (both in the expression language of expr.ts).
 *
 * When every variable is an integer over a small domain, every point is checked instead
 * of sampling, and the answer must be defined at half the points where the expected
 * expression is, up to `points`.
 */
export function gradeExpression(answer: string, expected: string, options: ExpressionOptions): GradeResult {
  const want = parseExpression(expected, options.variables);
  if (!want.ok) return problemError(`expected expression "${expected}" does not parse: ${want.error}`, answer);
  const got = parseExpression(answer, options.variables, { binomial: options.binomial });
  if (!got.ok) return { correct: false, feedback: got.error, normalizedAnswer: answer.trim() };
  const normalizedAnswer = formatExpression(got.value);

  const points = options.points ?? DEFAULT_EXPRESSION.points;
  const maxTries = options.maxTries ?? points * DEFAULT_EXPRESSION.triesPerPoint;
  const relTol = options.relTol ?? DEFAULT_EXPRESSION.relTol;
  const absTol = options.absTol ?? DEFAULT_EXPRESSION.absTol;
  const rng = options.rng ?? mulberry32(DEFAULT_EXPRESSION.seed);
  const domains = options.domains ?? {};
  const domain = (v: string): VariableDomain => (Object.hasOwn(domains, v) ? (domains[v] as VariableDomain) : DEFAULT_DOMAIN);
  for (const v of options.variables) {
    const d = domain(v);
    if (!(Number.isFinite(d.min) && Number.isFinite(d.max) && d.min <= d.max)) return problemError(`domain of ${v} is empty or unbounded`, answer);
  }

  // Only the variables either side uses are sampled, so the reported point is short.
  const used = [...new Set([...variablesOf(want.value), ...variablesOf(got.value)])].sort();
  const all = enumerate(used, domain, maxTries);
  let required = points;
  if (all !== null) {
    const definedForExpected = all.filter((env) => Number.isFinite(evaluate(want.value, env))).length;
    // Every point is checked, so any disagreement is caught; half coverage keeps a right
    // answer with a narrower natural domain, like n!/(2(n-2)!) on n = 0 to 10.
    required = Math.min(points, Math.ceil(definedForExpected / 2));
    if (required === 0) return problemError('the expected expression is undefined on the whole domain', answer);
  }

  const sample = (): Record<string, number> => {
    const env: Record<string, number> = {};
    for (const v of used) {
      const d = domain(v);
      env[v] = d.kind === 'integer' ? randInt(rng, Math.ceil(d.min), Math.floor(d.max)) : randReal(rng, d.min, d.max);
    }
    return env;
  };

  let valid = 0;
  const tries = all ?? Array.from({ length: maxTries }, sample);
  for (const env of tries) {
    const a = evaluate(got.value, env);
    const b = evaluate(want.value, env);
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    if (Math.abs(a - b) > absTol + relTol * Math.max(Math.abs(a), Math.abs(b))) {
      return { correct: false, feedback: mismatch(env, a), normalizedAnswer };
    }
    if (++valid >= required && all === null) break;
  }
  if (valid < required) {
    return {
      correct: false,
      feedback: `Could not check this answer: it is undefined at too many points where the expected answer is defined (${valid} of ${required} needed).`,
      normalizedAnswer,
    };
  }
  return { correct: true, normalizedAnswer };
}

/** Parses an expected expression once, for problem authors' tests. */
export function checkExpected(expected: string, variables: readonly string[]): Expr | string {
  const r = parseExpression(expected, variables);
  return r.ok ? r.value : r.error;
}
