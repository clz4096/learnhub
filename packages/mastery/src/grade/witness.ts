/**
 * Witness answers: an example or a counterexample, given as one or more exact values and
 * checked by a predicate rather than compared with one expected answer. "Find n with
 * n > 2 not prime and 2n + 13 prime" accepts every n that works, and "find x, y with
 * 30x + 22y = 2" accepts every such pair.
 *
 * The values are written as a list ("8", "-8, 11", "(1, 3, 9, 27)", "{1, 3}"), or by name
 * ("x = -8, y = 11", in any order) when the spec names them. Each value is an exact
 * number in the rational grader's syntax: an integer, a fraction, or an exact decimal.
 */
import { formatRational, parseRational, type ParseResult, type Rational } from './rational';
import { MAX_ANSWER_LENGTH, normalizeSymbols, problemError, type GradeResult } from './types';

export interface WitnessSpec {
  /** Names of the values in order, so "x = 3, y = 4" can be read; without names the list is positional. */
  names?: readonly string[];
  /** How many values: exactly this many, or a range for an answer such as a set of weights. */
  count: number | { min: number; max: number };
  /**
   * Null when the values are a valid witness, else a reason the learner can act on, for
   * example "30 × (-7) + 22 × 11 is 32, not 2". A check that throws is a broken problem.
   */
  check: (values: readonly Rational[]) => string | null;
}

const BRACKETS: Readonly<Record<string, string>> = { '(': ')', '{': '}', '[': ']' };
const NAME_RE = /^([A-Za-z][A-Za-z0-9_']*)\s*=\s*(.+)$/;

function countText(c: WitnessSpec['count']): string {
  if (typeof c === 'number') return c === 1 ? 'one value' : `${c} values`;
  return `from ${c.min} to ${c.max} values`;
}

function countOk(c: WitnessSpec['count'], n: number): boolean {
  return typeof c === 'number' ? n === c : n >= c.min && n <= c.max;
}

/**
 * Reads the values of a witness answer, in the spec's order when they are named. Errors
 * say what to fix; they are never the learner's miss.
 */
export function parseWitness(input: string, spec: Pick<WitnessSpec, 'names' | 'count'>): ParseResult<Rational[]> {
  if (input.length > MAX_ANSWER_LENGTH) return { ok: false, error: 'That answer is too long.' };
  let s = normalizeSymbols(input);
  if (s === '') return { ok: false, error: 'Enter an answer.' };
  const close = BRACKETS[s[0] as string];
  if (close !== undefined && s.endsWith(close)) s = s.slice(1, -1).trim();
  const parts = s.split(/\s*[,;]\s*|\s+and\s+/).map((p) => p.trim()).filter((p) => p !== '');
  if (parts.length === 0) return { ok: false, error: 'Enter an answer.' };

  const names = spec.names ?? [];
  const named = parts.map((p) => NAME_RE.exec(p));
  const anyNamed = named.some((m) => m !== null);
  if (anyNamed && named.some((m) => m === null)) return { ok: false, error: 'Name every value or none, for example x = 3, y = 4.' };

  const values: Rational[] = [];
  if (anyNamed) {
    if (names.length === 0) return { ok: false, error: 'Write just the values, separated by commas.' };
    const byName = new Map<string, Rational>();
    for (const m of named as RegExpExecArray[]) {
      const name = m[1] as string;
      if (!names.includes(name)) return { ok: false, error: `${name} is not one of ${names.join(', ')}.` };
      if (byName.has(name)) return { ok: false, error: `${name} is given twice.` };
      const v = parseRational(m[2] as string);
      if (!v.ok) return { ok: false, error: `${name}: ${v.error}` };
      byName.set(name, v.value);
    }
    const missing = names.filter((n) => !byName.has(n));
    if (missing.length > 0) return { ok: false, error: `Give ${missing.join(' and ')} too.` };
    for (const n of names) values.push(byName.get(n) as Rational);
    return { ok: true, value: values };
  }
  for (const p of parts) {
    const v = parseRational(p);
    if (!v.ok) return { ok: false, error: parts.length === 1 ? v.error : `"${p}": ${v.error}` };
    values.push(v.value);
  }
  if (!countOk(spec.count, values.length)) return { ok: false, error: `Give ${countText(spec.count)}, separated by commas.` };
  return { ok: true, value: values };
}

/** The values as text: "x = -8, y = 11" when named, else "-8, 11". */
export function formatWitness(values: readonly Rational[], names?: readonly string[]): string {
  return values.map((v, i) => (names !== undefined && names.length === values.length ? `${names[i]} = ${formatRational(v)}` : formatRational(v))).join(', ');
}

/** Right when the values parse and the spec's check accepts them. */
export function gradeWitness(answer: string, spec: WitnessSpec): GradeResult {
  const r = parseWitness(answer, spec);
  if (!r.ok) return { correct: false, feedback: r.error, normalizedAnswer: answer.trim() };
  const normalizedAnswer = formatWitness(r.value, spec.names);
  let why: string | null;
  try {
    why = spec.check(r.value);
  } catch (e) {
    return problemError(`the witness check failed: ${e instanceof Error ? e.message : String(e)}`, answer);
  }
  return why === null ? { correct: true, normalizedAnswer } : { correct: false, feedback: why, normalizedAnswer };
}
