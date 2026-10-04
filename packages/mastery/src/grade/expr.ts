/**
 * A small safe expression language for answers like `n(n-1)/2`, `choose(n, 2)`, `n p (1-p)`,
 * or `e^(-l) l^k / k!`. Parsed into a tree and evaluated by a switch: no eval, no Function,
 * no property lookups by name, so learner input can only ever compute a number.
 *
 * Grammar, loosest binding first:
 *   sum      := product (('+' | '-') product)*
 *   product  := unary (('*' | '/' | implicit) unary)*     implicit: `2x`, `x(x+1)`, `n p`
 *   unary    := ('-' | '+') unary | power
 *   power    := postfix ('^' unary)?                       right associative; `**` means `^`
 *   postfix  := atom '!'*
 *   atom     := number | name | name '(' args ')' | '(' sum ')' | '|' sum '|'
 *
 * So -x^2 is -(x^2), 2^3^2 is 2^9, and x/2y is (x/2)y, the usual conventions; the printed
 * normal form makes the reading visible to the learner.
 *
 * Names: the problem's declared variables first; then the functions exp, ln (log is an
 * alias), sqrt, abs, factorial, choose(n, k) (binom is an alias); then the constants pi
 * and e. Any other name made only of declared one-letter variables is their product, so
 * `np^2` means n*p^2 when n and p are declared.
 */
import { MAX_ANSWER_LENGTH, normalizeSymbols } from './types';
import type { ParseResult } from './rational';

export type Fn = 'exp' | 'ln' | 'sqrt' | 'abs' | 'factorial' | 'choose';
export type BinOp = '+' | '-' | '*' | '/' | '^';

export type Expr =
  | { kind: 'num'; value: number }
  | { kind: 'var'; name: string }
  | { kind: 'const'; name: 'pi' | 'e' }
  | { kind: 'neg'; arg: Expr }
  | { kind: 'bin'; op: BinOp; left: Expr; right: Expr }
  | { kind: 'call'; fn: Fn; args: Expr[] };

// Maps, not object literals: a lookup of "constructor" or "toString" in a plain object
// finds Object.prototype, and learner input must never reach that.
const FUNCTIONS: ReadonlyMap<string, { fn: Fn; arity: number }> = new Map([
  ['exp', { fn: 'exp', arity: 1 }],
  ['ln', { fn: 'ln', arity: 1 }],
  ['log', { fn: 'ln', arity: 1 }],
  ['sqrt', { fn: 'sqrt', arity: 1 }],
  ['abs', { fn: 'abs', arity: 1 }],
  ['factorial', { fn: 'factorial', arity: 1 }],
  ['choose', { fn: 'choose', arity: 2 }],
  ['binom', { fn: 'choose', arity: 2 }],
] as const);

const CONSTANTS: ReadonlyMap<string, 'pi' | 'e'> = new Map([['pi', 'pi'], ['e', 'e']] as const);

/** Deeper nesting than this is not a real answer, and the bound keeps recursion safe. */
const MAX_DEPTH = 100;

type Tok =
  | { t: 'num'; v: number; at: number }
  | { t: 'name'; s: string; at: number }
  | { t: 'op'; s: string; at: number }
  | { t: 'end'; at: number };

const VAR_RE = /^[A-Za-z][A-Za-z0-9_]*$/;

class ParseError extends Error {}

function tokenize(s: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i] as string;
    if (/\s/.test(c)) { i++; continue; }
    const num = /^(?:\d+(?:\.\d*)?|\.\d+)/.exec(s.slice(i));
    if (num !== null) {
      out.push({ t: 'num', v: Number(num[0]), at: i });
      i += num[0].length;
      continue;
    }
    const name = /^[A-Za-z][A-Za-z0-9_]*/.exec(s.slice(i));
    if (name !== null) {
      out.push({ t: 'name', s: name[0], at: i });
      i += name[0].length;
      continue;
    }
    if (s.startsWith('**', i)) {
      out.push({ t: 'op', s: '^', at: i });
      i += 2;
      continue;
    }
    if ('+-*/^(),!|'.includes(c)) {
      out.push({ t: 'op', s: c, at: i });
      i++;
      continue;
    }
    throw new ParseError(`Unexpected character "${c}".`);
  }
  out.push({ t: 'end', at: s.length });
  return out;
}

/**
 * `np` as n p, when it is not itself a name and every letter is a declared one-letter
 * variable. Split into separate tokens, so precedence applies: `np^2` is n*p^2, as written
 * on paper, not (np)^2.
 */
function splitNames(toks: readonly Tok[], vars: ReadonlySet<string>): Tok[] {
  return toks.flatMap((t): Tok[] => {
    if (t.t !== 'name' || vars.has(t.s) || FUNCTIONS.has(t.s) || CONSTANTS.has(t.s)) return [t];
    if (![...t.s].every((ch) => vars.has(ch))) return [t];
    return [...t.s].map((ch, i) => ({ t: 'name', s: ch, at: t.at + i }));
  });
}

class Parser {
  private i = 0;
  private depth = 0;
  private absDepth = 0;

  constructor(private readonly toks: readonly Tok[], private readonly vars: ReadonlySet<string>) {}

  private peek(): Tok {
    return this.toks[this.i] as Tok;
  }

  private next(): Tok {
    return this.toks[this.i++] as Tok;
  }

  private isOp(t: Tok, s: string): boolean {
    return t.t === 'op' && t.s === s;
  }

  private expect(s: string, what: string): void {
    const t = this.next();
    if (!this.isOp(t, s)) throw new ParseError(`Expected ${what}.`);
  }

  parseAll(): Expr {
    const e = this.sum();
    const t = this.peek();
    if (t.t !== 'end') throw new ParseError(this.isOp(t, ')') ? 'Unmatched ")".' : `Unexpected "${t.t === 'op' || t.t === 'name' ? t.s : 'number'}".`);
    return e;
  }

  private enter(): void {
    if (++this.depth > MAX_DEPTH) throw new ParseError('The expression is nested too deeply.');
  }

  private sum(): Expr {
    this.enter();
    let left = this.product();
    for (;;) {
      const t = this.peek();
      if (!(this.isOp(t, '+') || this.isOp(t, '-'))) break;
      this.next();
      left = { kind: 'bin', op: (t as { s: BinOp }).s, left, right: this.product() };
    }
    this.depth--;
    return left;
  }

  /** Whether the next token starts an operand with no operator before it: `2x`, `x(x+1)`, `n p`, `2|x|`. */
  private startsImplicit(t: Tok): boolean {
    if (t.t === 'name' || this.isOp(t, '(')) return true;
    if (this.isOp(t, '|')) return this.absDepth === 0;
    if (t.t === 'num') throw new ParseError('A number needs an operator before it, for example 2*3 rather than 2 3.');
    return false;
  }

  private product(): Expr {
    let left = this.unary();
    for (;;) {
      const t = this.peek();
      if (this.isOp(t, '*') || this.isOp(t, '/')) {
        this.next();
        left = { kind: 'bin', op: (t as { s: BinOp }).s, left, right: this.unary() };
      } else if (this.startsImplicit(t)) {
        left = { kind: 'bin', op: '*', left, right: this.unary() };
      } else {
        break;
      }
    }
    return left;
  }

  private unary(): Expr {
    const t = this.peek();
    if (this.isOp(t, '-') || this.isOp(t, '+')) {
      this.next();
      this.enter();
      const arg = this.unary();
      this.depth--;
      return t.t === 'op' && t.s === '-' ? { kind: 'neg', arg } : arg;
    }
    return this.power();
  }

  private power(): Expr {
    const base = this.postfix();
    if (!this.isOp(this.peek(), '^')) return base;
    this.next();
    this.enter();
    const exponent = this.unary();
    this.depth--;
    return { kind: 'bin', op: '^', left: base, right: exponent };
  }

  private postfix(): Expr {
    let e = this.atom();
    while (this.isOp(this.peek(), '!')) {
      this.next();
      e = { kind: 'call', fn: 'factorial', args: [e] };
    }
    return e;
  }

  private atom(): Expr {
    const t = this.next();
    if (t.t === 'num') return { kind: 'num', value: t.v };
    if (t.t === 'name') return this.name(t.s);
    if (this.isOp(t, '(')) {
      const e = this.inParens(() => this.sum());
      this.expect(')', 'a closing ")"');
      return e;
    }
    if (this.isOp(t, '|')) {
      this.absDepth++;
      const e = this.sum();
      this.absDepth--;
      this.expect('|', 'a closing "|"');
      return { kind: 'call', fn: 'abs', args: [e] };
    }
    if (t.t === 'end') throw new ParseError('The expression ends too early.');
    throw new ParseError(`Unexpected "${t.s}".`);
  }

  /** Inside parentheses a bar opens a new absolute value; it cannot close one outside them. */
  private inParens<T>(f: () => T): T {
    const saved = this.absDepth;
    this.absDepth = 0;
    try {
      return f();
    } finally {
      this.absDepth = saved;
    }
  }

  private name(s: string): Expr {
    if (this.vars.has(s)) return { kind: 'var', name: s };
    const f = FUNCTIONS.get(s);
    if (f !== undefined) {
      if (!this.isOp(this.peek(), '(')) throw new ParseError(`${s} needs parentheses, for example ${s}(x).`);
      this.next();
      const args: Expr[] = this.inParens(() => {
        const xs = [this.sum()];
        while (this.isOp(this.peek(), ',')) {
          this.next();
          xs.push(this.sum());
        }
        return xs;
      });
      this.expect(')', `a closing ")" after the arguments of ${s}`);
      if (args.length !== f.arity) throw new ParseError(`${s} takes ${f.arity} argument${f.arity === 1 ? '' : 's'}, not ${args.length}.`);
      return { kind: 'call', fn: f.fn, args };
    }
    const c = CONSTANTS.get(s);
    if (c !== undefined) return { kind: 'const', name: c };
    const known = [...this.vars].sort().join(', ');
    throw new ParseError(`Unknown name "${s}".${known === '' ? '' : ` The variables here are ${known}.`}`);
  }
}

/**
 * Parses `input` with the given variable names. Errors are sentences for the learner.
 * Variable names must look like identifiers, and must not shadow a function name.
 */
export function parseExpression(input: string, variables: readonly string[]): ParseResult<Expr> {
  for (const v of variables) {
    if (!VAR_RE.test(v) || FUNCTIONS.has(v)) return { ok: false, error: `Bad variable name "${v}".` };
  }
  if (input.length > MAX_ANSWER_LENGTH) return { ok: false, error: 'That answer is too long.' };
  const s = normalizeSymbols(input);
  if (s === '') return { ok: false, error: 'Enter an expression.' };
  try {
    const vars = new Set(variables);
    return { ok: true, value: new Parser(splitNames(tokenize(s), vars), vars).parseAll() };
  } catch (e) {
    if (e instanceof ParseError) return { ok: false, error: e.message };
    // A RangeError from an unforeseen deep recursion, for instance; still not the learner's crash.
    return { ok: false, error: 'Could not read that expression.' };
  }
}

/** Integers up to this are exact in a double, so a value within 1e-9 of one is that integer. */
function asInteger(x: number): number | null {
  const r = Math.round(x);
  return Math.abs(x - r) <= 1e-9 * Math.max(1, Math.abs(x)) ? r : null;
}

function factorial(x: number): number {
  const n = asInteger(x);
  if (n === null || n < 0) return NaN;
  // 171! overflows a double; stop before looping on a huge argument.
  if (n > 170) return Infinity;
  let p = 1;
  for (let i = 2; i <= n; i++) p *= i;
  return p;
}

/**
 * The binomial coefficient for any real n and integer k: n(n-1)...(n-k+1)/k!, and 0 for
 * k < 0. On integers 0 <= k <= n it is the usual count; for other n it is the polynomial,
 * so `choose(n, 2)` and `n(n-1)/2` agree everywhere, as they should.
 */
function choose(n: number, kx: number): number {
  const k = asInteger(kx);
  if (k === null) return NaN;
  if (k < 0) return 0;
  // Integer n >= 0 with k > n is 0; the product below reaches it, but only after k steps.
  const ni = asInteger(n);
  if (ni !== null && ni >= 0 && k > ni) return 0;
  // Beyond this the value overflows or the loop is the cost; either way the point is unusable.
  if (k > 1000) return NaN;
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return r;
}

/**
 * The value at `env`, or NaN where the expression is undefined (a log of a negative
 * number, a factorial of a non-integer). Division by zero gives an infinity, which the
 * grader treats as undefined too.
 */
export function evaluate(e: Expr, env: Readonly<Record<string, number>>): number {
  switch (e.kind) {
    case 'num': return e.value;
    case 'var': return Object.hasOwn(env, e.name) ? (env[e.name] as number) : NaN;
    case 'const': return e.name === 'pi' ? Math.PI : Math.E;
    case 'neg': return -evaluate(e.arg, env);
    case 'bin': {
      const a = evaluate(e.left, env);
      const b = evaluate(e.right, env);
      switch (e.op) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/': return a / b;
        case '^': return Math.pow(a, b);
      }
      break;
    }
    case 'call': {
      const [x = NaN, y = NaN] = e.args.map((a) => evaluate(a, env));
      switch (e.fn) {
        case 'exp': return Math.exp(x);
        case 'ln': return x > 0 ? Math.log(x) : NaN;
        case 'sqrt': return x >= 0 ? Math.sqrt(x) : NaN;
        case 'abs': return Math.abs(x);
        case 'factorial': return factorial(x);
        case 'choose': return choose(x, y);
      }
    }
  }
  return NaN;
}

/** The variables an expression uses. */
export function variablesOf(e: Expr, out: Set<string> = new Set()): Set<string> {
  if (e.kind === 'var') out.add(e.name);
  else if (e.kind === 'neg') variablesOf(e.arg, out);
  else if (e.kind === 'bin') { variablesOf(e.left, out); variablesOf(e.right, out); }
  else if (e.kind === 'call') for (const a of e.args) variablesOf(a, out);
  return out;
}

const PREC: Readonly<Record<BinOp, number>> = { '+': 10, '-': 10, '*': 20, '/': 20, '^': 30 };
const NEG_PREC = 25;
const ATOM_PREC = 100;

function prec(e: Expr): number {
  if (e.kind === 'bin') return PREC[e.op];
  if (e.kind === 'neg') return NEG_PREC;
  return ATOM_PREC;
}

/**
 * Canonical text with the fewest parentheses that keep the meaning, and explicit `*`,
 * so the learner sees how their input was read: `n(n-1)/2` prints as `n*(n - 1)/2`.
 */
export function formatExpression(e: Expr): string {
  const wrap = (x: Expr, need: boolean): string => (need ? `(${formatExpression(x)})` : formatExpression(x));
  switch (e.kind) {
    case 'num': return String(e.value);
    case 'var': return e.name;
    case 'const': return e.name;
    case 'neg': return `-${wrap(e.arg, prec(e.arg) < NEG_PREC || e.arg.kind === 'neg')}`;
    case 'bin': {
      const p = PREC[e.op];
      if (e.op === '^') return `${wrap(e.left, prec(e.left) <= p)}^${wrap(e.right, prec(e.right) < NEG_PREC)}`;
      // Left associative: a right operand at equal precedence keeps its parentheses, so the
      // printed text parses back to the same tree (and the same floating-point rounding).
      const rightNeeds = prec(e.right) <= p;
      const sep = p === 10 ? ` ${e.op} ` : e.op;
      return `${wrap(e.left, prec(e.left) < p)}${sep}${wrap(e.right, rightNeeds || (e.right.kind === 'neg' && p >= 20))}`;
    }
    case 'call': {
      if (e.fn === 'factorial') {
        const a = e.args[0] as Expr;
        return `${wrap(a, a.kind !== 'var' && !(a.kind === 'num' && Number.isInteger(a.value)) && a.kind !== 'call')}!`;
      }
      return `${e.fn}(${e.args.map(formatExpression).join(', ')})`;
    }
  }
}
