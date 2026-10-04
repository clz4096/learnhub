/**
 * Rich text for lessons, problems, and the glossary, built so that every number shown to
 * the learner comes from code (the design's "numbers are never typed" rule).
 *
 * Text is written with the `t` and `math` tagged templates. The literal parts of a
 * template are what the author typed; they are kept in `typed` and the content checks
 * reject any digit in them. A number can only enter through an interpolation, so it is
 * computed: `t\`${a} + ${b} = ${a + b}\``. Identities written with digits, such as
 * 0! = 1, use `ident`, which the content checks verify by evaluation instead.
 *
 * Glossary terms are marked in literal text as [[id|shown text]], as in the cache
 * simulator, and rendered as links to the glossary.
 */
import { formatRational, gradeExpression, type Rational, type VariableDomain } from '@learnhub/mastery';

export type SpanKind = 'text' | 'num' | 'math';

export interface Span {
  kind: SpanKind;
  /** What is shown. */
  text: string;
  /** The parts the author typed, checked for digits; computed values are not here. */
  typed: readonly string[];
  /** For identities: null when the identity holds, else why not. Run by the content checks. */
  check?: () => string | null;
}

export type Rich = readonly Span[];

/** Anything a template accepts. A plain string counts as typed text and is checked. */
export type Interp = number | bigint | Rational | Span | Rich | string;

const isRational = (x: unknown): x is Rational =>
  typeof x === 'object' && x !== null && 'num' in x && 'den' in x && typeof (x as Rational).num === 'bigint';
const isSpan = (x: unknown): x is Span => typeof x === 'object' && x !== null && 'kind' in x && 'typed' in x;

/** Integers as written by hand (1234, 12,345); others to at most 6 significant figures. */
export function formatNumber(x: number | bigint): string {
  if (typeof x === 'bigint') return x.toString();
  if (Number.isInteger(x)) return Math.abs(x) >= 10_000 ? x.toLocaleString('en-US') : String(x);
  return String(Number(x.toPrecision(6)));
}

function toSpans(v: Interp): Span[] {
  if (typeof v === 'number' || typeof v === 'bigint') return [{ kind: 'num', text: formatNumber(v), typed: [] }];
  if (typeof v === 'string') return v === '' ? [] : [{ kind: 'text', text: v, typed: [v] }];
  if (isRational(v)) return [{ kind: 'num', text: formatRational(v), typed: [] }];
  if (isSpan(v)) return [v];
  return [...v];
}

/** Running text. Literal parts are typed text; interpolations are computed. */
export function t(strings: TemplateStringsArray, ...vals: Interp[]): Rich {
  const out: Span[] = [];
  strings.forEach((s, i) => {
    if (s !== '') out.push({ kind: 'text', text: s, typed: [s] });
    if (i < vals.length) out.push(...toSpans(vals[i] as Interp));
  });
  return out;
}

/** One piece of mathematics, shown in math style: `math\`x^${m} * x^${n}\``. */
export function math(strings: TemplateStringsArray, ...vals: Interp[]): Span {
  let text = '';
  const typed: string[] = [];
  strings.forEach((s, i) => {
    text += s;
    if (s !== '') typed.push(s);
    if (i < vals.length) {
      for (const sp of toSpans(vals[i] as Interp)) {
        text += sp.text;
        typed.push(...sp.typed);
      }
    }
  });
  return { kind: 'math', text, typed };
}

/** A computed value already formatted as text, such as a listed set. Never for typed numbers. */
export function computed(text: string): Span {
  return { kind: 'num', text, typed: [] };
}

/** A computed number in brackets when negative, for products and sums: 3 * (-8). */
export function paren(n: number): Span {
  return computed(n < 0 ? `(${formatNumber(n)})` : formatNumber(n));
}

/** Computed mathematics, such as a polynomial built from computed coefficients. */
export function computedMath(text: string): Span {
  return { kind: 'math', text, typed: [] };
}

/**
 * An identity `lhs = rhs` in the expression language of the graders, shown as math. It
 * may contain digits because the content checks evaluate both sides and require them to
 * agree, the same randomized identity test the expression grader uses.
 */
export function ident(lhs: string, rhs: string, variables: readonly string[] = [], domains?: Readonly<Record<string, VariableDomain>>): Span {
  return {
    kind: 'math',
    text: `${lhs} = ${rhs}`,
    typed: [],
    check: () => {
      const r = gradeExpression(lhs, rhs, { variables, domains });
      return r.correct ? null : `${lhs} = ${rhs} does not hold: ${r.feedback ?? 'the sides differ'}`;
    },
  };
}

/** Join pieces with a separator typed by the author (checked like any typed text). */
export function join(items: readonly Rich[], sep: string): Rich {
  const out: Span[] = [];
  items.forEach((r, i) => {
    if (i > 0) out.push(...toSpans(sep));
    out.push(...r);
  });
  return out;
}

/** A list of numbers as a set, {1, 4, 9}, computed. */
export function setOf(xs: readonly (number | string)[]): Span {
  return computed(xs.length === 0 ? '{ }' : `{${xs.map((x) => (typeof x === 'number' ? formatNumber(x) : x)).join(', ')}}`);
}

/** One [[id|shown text]] mark. */
export const MARK = /\[\[([a-z0-9-]+)\|([^\]]+)\]\]/g;

/** The text with marks replaced by their shown text, for tests, labels, and screen readers. */
export function plain(r: Rich | Span): string {
  const spans = isSpan(r) ? [r] : r;
  return spans.map((s) => s.text).join('').replace(MARK, (_m, _id: string, shown: string) => shown);
}

/** Every glossary id marked in the text, in order. */
export function markedTerms(r: Rich): string[] {
  return r.flatMap((s) => [...s.text.matchAll(MARK)].map((m) => m[1] as string));
}
