/**
 * Rich text for lessons, problems, and the glossary, built so that every number shown to
 * the learner comes from code (the design's "numbers are never typed" rule), and all
 * mathematics is LaTeX, rendered by KaTeX (design decision 19b).
 *
 * Text is written with the `t`, `math`, and `dmath` tagged templates. The literal parts of
 * a template are what the author typed; they are kept in `typed` and the content checks
 * reject any digit in them. A number can only enter through an interpolation, so it is
 * computed: `math\`${a} + ${b} = ${a + b}\``. Identities written with digits, such as
 * 0! = 1, use `ident`, which the content checks verify by evaluation instead.
 *
 * `math` (inline) and `dmath` (displayed) take LaTeX as written, from the raw template,
 * so a backslash needs no escaping: `math\`\frac{${a}}{${b}} \times ${c}\``. A digit
 * typed into LaTeX is still a typed digit: write `x^{${2}}`, never `x^2`. Interpolated
 * numbers become LaTeX numbers and fractions; interpolated text becomes \text{...}.
 *
 * Glossary terms are marked in literal text as [[id|shown text]], as in the cache
 * simulator, and rendered as links to the glossary.
 */
import {
  gradeExpression, parseExpression, texNumber, texOfExpression, type Rational, type VariableDomain,
} from '@learnhub/mastery';

export type SpanKind = 'text' | 'num' | 'math';

export interface Span {
  kind: SpanKind;
  /** What is shown: plain text, or LaTeX source for a math span. */
  text: string;
  /** The parts the author typed, checked for digits; computed values are not here. */
  typed: readonly string[];
  /** For identities: null when the identity holds, else why not. Run by the content checks. */
  check?: () => string | null;
  /** A math span shown on its own line (display style) rather than in the text. */
  display?: boolean;
  /** For a computed number: its LaTeX, used when it is interpolated into math. */
  tex?: string;
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

/** A computed number as LaTeX: 12{,}345 groups thousands without the comma's math spacing. */
export function texOf(x: number | bigint): string {
  if (typeof x === 'bigint') return x.toString();
  if (Number.isInteger(x) && Math.abs(x) >= 10_000) return x.toLocaleString('en-US').replace(/,/g, '{,}');
  return Number.isInteger(x) ? String(x) : texNumber(Number(x.toPrecision(6)));
}

/** A rational as LaTeX: 3, \frac{3}{8}, or -\frac{3}{8}. */
export function texOfRational(r: Rational): string {
  if (r.den === 1n) return r.num.toString();
  const sign = r.num < 0n ? '-' : '';
  const n = r.num < 0n ? -r.num : r.num;
  return `${sign}\\frac{${n}}{${r.den}}`;
}

/** Text for \text{...}: the characters LaTeX treats specially are escaped. */
function texText(s: string): string {
  return s.replace(/[\\{}$&#%_^~]/g, (c) => (c === '\\' ? '\\textbackslash{}' : c === '^' ? '\\textasciicircum{}' : c === '~' ? '\\textasciitilde{}' : `\\${c}`));
}

function numSpan(x: number | bigint): Span {
  // A negative number is set as math, so its minus sign is a real minus sign.
  if (x < 0) return { kind: 'math', text: texOf(x), typed: [] };
  return { kind: 'num', text: formatNumber(x), typed: [], tex: texOf(x) };
}

function toSpans(v: Interp): Span[] {
  if (typeof v === 'number' || typeof v === 'bigint') return [numSpan(v)];
  if (typeof v === 'string') return v === '' ? [] : [{ kind: 'text', text: v, typed: [v] }];
  if (isRational(v)) return v.den === 1n ? [numSpan(v.num)] : [{ kind: 'math', text: texOfRational(v), typed: [] }];
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

/** The LaTeX of one interpolation inside math, with the typed parts and checks it brings. */
function texPart(v: Interp, typed: string[], checks: (() => string | null)[]): string {
  if (typeof v === 'number' || typeof v === 'bigint') return texOf(v);
  if (typeof v === 'string') {
    if (v !== '') typed.push(v);
    return v;
  }
  if (isRational(v)) return texOfRational(v);
  const spans = isSpan(v) ? [v] : v;
  return spans.map((sp) => {
    typed.push(...sp.typed);
    if (sp.check) checks.push(sp.check);
    if (sp.kind === 'math') return sp.text;
    if (sp.kind === 'num') return sp.tex ?? `\\text{${texText(sp.text)}}`;
    return sp.text === '' ? '' : `\\text{${texText(sp.text)}}`;
  }).join('');
}

function mathSpan(strings: TemplateStringsArray, vals: readonly Interp[], display: boolean): Span {
  let text = '';
  const typed: string[] = [];
  const checks: (() => string | null)[] = [];
  strings.raw.forEach((s, i) => {
    text += s;
    if (s !== '') typed.push(s);
    if (i < vals.length) text += texPart(vals[i] as Interp, typed, checks);
  });
  const span: Span = { kind: 'math', text, typed };
  if (display) span.display = true;
  if (checks.length > 0) span.check = () => checks.map((c) => c()).find((r) => r !== null) ?? null;
  return span;
}

/** Inline mathematics in LaTeX: `math\`x^{${m}} \times x^{${n}}\``. */
export function math(strings: TemplateStringsArray, ...vals: Interp[]): Span {
  return mathSpan(strings, vals, false);
}

/** Displayed mathematics in LaTeX, on its own line: a rule or a key step. */
export function dmath(strings: TemplateStringsArray, ...vals: Interp[]): Span {
  return mathSpan(strings, vals, true);
}

/** A fraction exactly as written, not reduced: \frac{6}{8}. For the value in lowest terms, interpolate a Rational. */
export function frac(n: Interp, d: Interp): Span {
  return math`\frac{${n}}{${d}}`;
}

/** A computed value already formatted as text, such as a list of words. Never for typed numbers. */
export function computed(text: string): Span {
  return { kind: 'num', text, typed: [] };
}

/**
 * LaTeX assembled by code from computed numbers, such as a long product built in a loop.
 * Like `computed`, it bypasses the typed-digit check, so the content checks scan its
 * call sites: it must never be given a literal with a digit in it.
 */
export function computedTex(tex: string): Span {
  return { kind: 'math', text: tex, typed: [] };
}

/** A computed number in brackets when negative, for products and sums: 3 \times (-8). */
export function paren(n: number): Span {
  return { kind: 'math', text: n < 0 ? `(${texOf(n)})` : texOf(n), typed: [] };
}

const FUNCTION_NAMES = new Set(['exp', 'ln', 'log', 'sqrt', 'abs', 'factorial', 'choose', 'binom', 'pi', 'e']);
const RELATIONS: Readonly<Record<string, string>> = { '=': '=', '<': '<', '>': '>', '<=': '\\le', '>=': '\\ge', '!=': '\\ne' };

/**
 * LaTeX for text in the graders' expression language, with relations between sides:
 * "2x^2 - 5x + 6" is 2 x^{2} - 5 x + 6, and "3 * 4 = 12" is 3 \times 4 = 12. Every name
 * that is not a function is a variable. Throws on text that does not parse: that is a
 * content bug, and the content checks run every generator.
 */
export function exprTex(text: string): string {
  const parts = text.split(/\s(<=|>=|!=|=|<|>)\s/);
  return parts.map((part, i) => {
    if (i % 2 === 1) return RELATIONS[part] ?? part;
    const names = [...new Set(part.match(/[A-Za-z][A-Za-z0-9_]*/g) ?? [])].filter((n) => !FUNCTION_NAMES.has(n));
    const r = parseExpression(part, names);
    if (!r.ok) throw new Error(`exprTex: cannot read "${part}" in "${text}": ${r.error}`);
    return texOfExpression(r.value);
  }).join(' ');
}

/** Computed mathematics in the expression language, such as a polynomial built from computed coefficients. */
export function computedMath(text: string): Span {
  return { kind: 'math', text: exprTex(text), typed: [] };
}

/**
 * An identity `lhs = rhs` in the expression language of the graders, shown as math. It
 * may contain digits because the content checks evaluate both sides and require them to
 * agree, the same randomized identity test the expression grader uses.
 */
export function ident(lhs: string, rhs: string, variables: readonly string[] = [], domains?: Readonly<Record<string, VariableDomain>>): Span {
  return {
    kind: 'math',
    text: `${exprTex(lhs)} = ${exprTex(rhs)}`,
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

/** A list of numbers as a set, \{1, 4, 9\}, computed; '...' is an ellipsis. */
export function setOf(xs: readonly (number | string)[]): Span {
  const items = xs.map((x) => (typeof x === 'number' ? texOf(x) : x === '...' ? '\\ldots' : x));
  return { kind: 'math', text: items.length === 0 ? '\\varnothing' : `\\{${items.join(', ')}\\}`, typed: [] };
}

/** A computed list of numbers, 2, 5, 8, as math. */
export function listOf(xs: readonly number[]): Span {
  return { kind: 'math', text: xs.map(texOf).join(', '), typed: [] };
}

/** One [[id|shown text]] mark. */
export const MARK = /\[\[([a-z0-9-]+)\|([^\]]+)\]\]/g;

const SYMBOLS: Readonly<Record<string, string>> = {
  times: '×', div: '÷', cdot: '·', le: '≤', leq: '≤', ge: '≥', geq: '≥', ne: '≠', neq: '≠', in: '∈', notin: '∉',
  cup: '∪', cap: '∩', land: '∧', lor: '∨', lnot: '¬', neg: '¬', Rightarrow: '⇒', implies: '⇒', Leftrightarrow: '⇔', iff: '⇔',
  varnothing: '∅', emptyset: '∅', ldots: '...', cdots: '...', dots: '...', pi: 'π', xi: 'ξ', mid: '|', subseteq: '⊆',
  to: '→', infty: '∞', lambda: 'λ', left: '', right: '', quad: ' ', qquad: ' ', ',': ' ', ';': ' ', '!': '', ' ': ' ',
};

/**
 * LaTeX as plain text, roughly as it reads: for tests, labels, and searches. Screen
 * readers get KaTeX's MathML instead.
 */
export function texToPlain(tex: string): string {
  // Set braces survive as braces; grouping braces are dropped below.
  let s = tex.replace(/\\\{/g, '\u0001').replace(/\\\}/g, '\u0002');
  for (let i = 0; i < 4; i++) {
    s = s
      .replace(/\\(?:d|t)?frac\{([^{}]*)\}\{([^{}]*)\}/g, '$1/$2')
      .replace(/\\binom\{([^{}]*)\}\{([^{}]*)\}/g, 'C($1, $2)')
      .replace(/\\sqrt\{([^{}]*)\}/g, '√($1)')
      .replace(/\\(?:text|mathrm|mathit|operatorname)\{([^{}]*)\}/g, '$1');
  }
  return s
    .replace(/\\([A-Za-z]+|[,;! ])/g, (m, name: string) => SYMBOLS[name] ?? m)
    .replace(/\\([{}%$&#_])/g, '$1')
    .replace(/\^\{([^{}]*)\}/g, '^$1')
    .replace(/_\{([^{}]*)\}/g, '_$1')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\u0001/g, '{')
    .replace(/\u0002/g, '}')
    .trim();
}

/** The text with marks replaced by their shown text and LaTeX read as text, for tests, labels, and screen readers. */
export function plain(r: Rich | Span): string {
  const spans = isSpan(r) ? [r] : r;
  return spans.map((s) => (s.kind === 'math' ? texToPlain(s.text) : s.text)).join('').replace(MARK, (_m, _id: string, shown: string) => shown);
}

/** Every glossary id marked in the text, in order. */
export function markedTerms(r: Rich): string[] {
  return r.flatMap((s) => [...s.text.matchAll(MARK)].map((m) => m[1] as string));
}
