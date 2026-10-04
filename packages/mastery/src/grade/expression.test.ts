import { describe, it, expect } from 'vitest';
import { mulberry32, type Rng } from '../rng';
import { evaluate, formatExpression, parseExpression, variablesOf, type BinOp, type Expr } from './expr';
import { gradeExpression, type ExpressionOptions } from './expression';

const parse = (s: string, vars: string[] = ['x', 'y', 'n', 'p']): Expr => {
  const r = parseExpression(s, vars);
  if (!r.ok) throw new Error(`parse failed for ${s}: ${r.error}`);
  return r.value;
};
const fmt = (s: string, vars?: string[]): string => formatExpression(parse(s, vars));
const val = (s: string, env: Record<string, number> = {}, vars?: string[]): number => evaluate(parse(s, vars), env);
const err = (s: string, vars: string[] = ['x', 'n']): string => {
  const r = parseExpression(s, vars);
  return r.ok ? `parsed as ${formatExpression(r.value)}` : r.error;
};

describe('parseExpression and formatExpression', () => {
  const cases: [string, string][] = [
    ['n(n-1)/2', 'n*(n - 1)/2'],
    ['n (n - 1) / 2', 'n*(n - 1)/2'],
    ['np(1-p)', 'n*p*(1 - p)'],
    ['n p (1 - p)', 'n*p*(1 - p)'],
    ['2x^2', '2*x^2'],
    ['-x^2', '-x^2'],
    ['(-x)^2', '(-x)^2'],
    ['2^3^2', '2^3^2'],
    ['(2^3)^2', '(2^3)^2'],
    ['x/2y', 'x/2*y'],
    ['x/(2y)', 'x/(2*y)'],
    ['a - (b - c)', 'a - (b - c)'],
    ['x^-2', 'x^-2'],
    ['2**x', '2^x'],
    ['e^x', 'e^x'],
    ['pi x', 'pi*x'],
    ['|x|*x', 'abs(x)*x'],
    ['x|x|', 'x*abs(x)'],
    ['|x - |y||', 'abs(x - abs(y))'],
    ['abs(|x|)', 'abs(abs(x))'],
    ['n!', 'n!'],
    ['(n-1)!', '(n - 1)!'],
    ['n!!', 'n!!'],
    ['factorial(n)', 'n!'],
    ['choose(n, 2)', 'choose(n, 2)'],
    ['binom(n,2)', 'choose(n, 2)'],
    ['log(x)', 'ln(x)'],
    ['exp(-x)', 'exp(-x)'],
    ['sqrt(x)sqrt(y)', 'sqrt(x)*sqrt(y)'],
    ['3\u00D7x', '3*x'],
    ['x\u00F72', 'x/2'],
    ['\u2212x', '-x'],
    ['+x', 'x'],
    ['x + -y', 'x + -y'],
    ['x * -y', 'x*(-y)'],
    ['np^2', 'n*p^2'],
    ['xy^2', 'x*y^2'],
    ['2np', '2*n*p'],
    ['a - b - c', 'a - b - c'],
    ['a - (b + c)', 'a - (b + c)'],
    ['a + (b - c)', 'a + (b - c)'],
    ['a/b/c', 'a/b/c'],
    ['a*(b*c)', 'a*(b*c)'],
    ['.5x', '0.5*x'],
  ];
  for (const [input, want] of cases) {
    it(`"${input}" reads as ${want}`, () => expect(fmt(input, ['x', 'y', 'n', 'p', 'a', 'b', 'c'])).toBe(want));
  }

  it('a declared variable named e shadows the constant', () => {
    expect(parse('e', ['e'])).toEqual({ kind: 'var', name: 'e' });
    expect(parse('e', [])).toEqual({ kind: 'const', name: 'e' });
  });

  it('variablesOf lists the variables used', () => {
    expect([...variablesOf(parse('n p (1 - p) + 0*x'))].sort()).toEqual(['n', 'p', 'x']);
  });

  const errors: [string, RegExp][] = [
    ['', /Enter an expression/],
    ['x +', /ends too early/],
    ['(x', /closing "\)"/],
    ['x)', /Unmatched "\)"/],
    ['2 3', /needs an operator/],
    ['1.2.3', /needs an operator/],
    ['(x)2', /needs an operator/],
    ['sqrt x', /sqrt needs parentheses/],
    ['choose(n)', /choose takes 2 arguments, not 1/],
    ['exp(x, n)', /exp takes 1 argument, not 2/],
    ['y', /Unknown name "y"\. The variables here are n, x/],
    ['x $ 2', /Unexpected character "\$"/],
    ['x = 2', /Unexpected character "="/],
    ['*x', /Unexpected "\*"/],
    ['|x', /closing "\|"/],
    ['f(x)', /Unknown name "f"/],
    ['constructor', /Unknown name/],
    ['__proto__', /Unexpected character "_"/],
    ['toString(x)', /Unknown name "toString"/],
    ['hasOwnProperty', /Unknown name/],
    ['x'.repeat(10) + '+1'.repeat(300), /too long/],
    [`${'('.repeat(150)}x${')'.repeat(150)}`, /nested too deeply/],
    [`${'-'.repeat(150)}x`, /nested too deeply/],
    [`${'2^'.repeat(150)}2`, /nested too deeply/],
  ];
  for (const [input, re] of errors) it(`rejects "${input.slice(0, 24)}"`, () => expect(err(input)).toMatch(re));

  it('rejects variable names that are not identifiers or shadow a function', () => {
    expect(parseExpression('x', ['2x'])).toMatchObject({ ok: false });
    expect(parseExpression('x', ['exp'])).toMatchObject({ ok: false, error: 'Bad variable name "exp".' });
  });
});

describe('evaluate', () => {
  it('follows the usual conventions', () => {
    expect(val('-x^2', { x: 3 })).toBe(-9);
    expect(val('2^3^2')).toBe(512);
    expect(val('x/2y', { x: 8, y: 2 })).toBe(8);
    expect(val('5!')).toBe(120);
    expect(val('0!')).toBe(1);
    expect(val('choose(5, 2)')).toBe(10);
    expect(val('choose(2.5, 2)')).toBe((2.5 * 1.5) / 2);
    expect(val('0^0')).toBe(1);
    expect(val('e')).toBe(Math.E);
    expect(val('pi')).toBe(Math.PI);
  });

  it('is NaN or infinite where undefined', () => {
    expect(val('ln(0)')).toBeNaN();
    expect(val('ln(-1)')).toBeNaN();
    expect(val('sqrt(-1)')).toBeNaN();
    expect(val('(-8)^(1/3)')).toBeNaN();
    expect(val('3.5!')).toBeNaN();
    expect(val('(-1)!')).toBeNaN();
    expect(val('choose(5, 1.5)')).toBeNaN();
    expect(val('1/0')).toBe(Infinity);
    expect(val('0/0')).toBeNaN();
    expect(val('171!')).toBe(Infinity);
    expect(val('(10^9)!')).toBe(Infinity);
    expect(val('choose(10^9, 10^6)')).toBeNaN();
  });

  it('choose is 0 outside 0 <= k <= n for integers', () => {
    expect(val('choose(5, 7)')).toBe(0);
    expect(val('choose(5, -1)')).toBe(0);
    expect(val('choose(10^9, 10^9 + 5)')).toBe(0);
  });

  it('treats a near-integer from rounding as the integer', () => {
    expect(val('(0.1*30)!')).toBe(6);
  });
});

/** A random tree over x, y with small integer and half-integer constants. */
function randomExpr(rng: Rng, depth: number): Expr {
  const r = rng();
  if (depth === 0 || r < 0.25) {
    const k = Math.floor(rng() * 4);
    if (k === 0) return { kind: 'num', value: Math.floor(rng() * 10) };
    if (k === 1) return { kind: 'num', value: Math.floor(rng() * 10) + 0.5 };
    if (k === 2) return { kind: 'const', name: rng() < 0.5 ? 'pi' : 'e' };
    return { kind: 'var', name: rng() < 0.5 ? 'x' : 'y' };
  }
  if (r < 0.35) return { kind: 'neg', arg: randomExpr(rng, depth - 1) };
  if (r < 0.5) {
    const fns = ['exp', 'ln', 'sqrt', 'abs', 'factorial', 'choose'] as const;
    const fn = fns[Math.floor(rng() * fns.length)] as (typeof fns)[number];
    return { kind: 'call', fn, args: fn === 'choose' ? [randomExpr(rng, depth - 1), randomExpr(rng, depth - 1)] : [randomExpr(rng, depth - 1)] };
  }
  const ops: BinOp[] = ['+', '-', '*', '/', '^'];
  return { kind: 'bin', op: ops[Math.floor(rng() * ops.length)] as BinOp, left: randomExpr(rng, depth - 1), right: randomExpr(rng, depth - 1) };
}

describe('format then parse is the identity', () => {
  it('on 3000 random trees', () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 3000; i++) {
      const e = randomExpr(rng, 5);
      const text = formatExpression(e);
      const back = parseExpression(text, ['x', 'y']);
      expect(back.ok, text).toBe(true);
      if (back.ok) expect(back.value, text).toEqual(e);
    }
  });
});

describe('gradeExpression', () => {
  const X: ExpressionOptions = { variables: ['x'] };
  const N: ExpressionOptions = { variables: ['n'], domains: { n: { kind: 'integer', min: 0, max: 30 } } };
  const ok = (a: string, b: string, o: ExpressionOptions): boolean => gradeExpression(a, b, o).correct;

  it('accepts equivalent forms', () => {
    expect(ok('n(n-1)/2', 'choose(n, 2)', N)).toBe(true);
    expect(ok('n(n-1)/2', 'choose(n, 2)', { variables: ['n'] })).toBe(true); // generalized binomial on reals
    expect(ok('(n^2 - n)/2', 'n(n-1)/2', N)).toBe(true);
    expect(ok('choose(n+1, 2)', 'n(n+1)/2', N)).toBe(true);
    expect(ok('(x+1)^2', 'x^2 + 2x + 1', X)).toBe(true);
    expect(ok('e^(2x)', 'exp(x)^2', X)).toBe(true);
    expect(ok('1/(1/x)', 'x', X)).toBe(true);
    expect(ok('x/x', '1', X)).toBe(true);
    expect(ok('n p (1-p)', 'np - np^2', { variables: ['n', 'p'], domains: { n: { kind: 'integer', min: 1, max: 50 }, p: { kind: 'real', min: 0, max: 1 } } })).toBe(true);
    expect(ok('2+2', '4', { variables: [] })).toBe(true);
    expect(ok('|x|^2', 'x^2', X)).toBe(true);
  });

  it('accepts factorial forms, defined on a narrower natural domain', () => {
    expect(ok('n!/(2(n-2)!)', 'choose(n, 2)', { variables: ['n'], domains: { n: { kind: 'integer', min: 0, max: 10 } } })).toBe(true);
    expect(ok('n!/(n-2)!', 'n(n-1)', { variables: ['n'], domains: { n: { kind: 'integer', min: 2, max: 20 } } })).toBe(true);
  });

  it('catches x^2 against |x|*x, which agree for x >= 0', () => {
    const r = gradeExpression('|x|*x', 'x^2', X);
    expect(r.correct).toBe(false);
    expect(r.feedback).toMatch(/^At x = -[\d.]+, your expression is -[\d.]+, which does not match\.$/);
    expect(r.normalizedAnswer).toBe('abs(x)*x');
  });

  it('catches expressions that agree at a few points', () => {
    expect(ok('x^3', 'x', X)).toBe(false); // agree at -1, 0, 1
    expect(ok('(x-1)(x-2)(x-3) + x', 'x', X)).toBe(false); // agree at 1, 2, 3
    expect(ok('x^2', 'x', X)).toBe(false); // agree at 0, 1
    expect(ok('n(n+1)/2', 'choose(n, 2)', N)).toBe(false);
    expect(ok('pi', '3.14159', { variables: [] })).toBe(false);
    expect(ok('3.14159', 'pi', { variables: [] })).toBe(false);
  });

  it('catches a difference confined to a narrow interval', () => {
    // Differs only where |x| > 4: a fifth of [-5, 5], so 40 points miss it with probability 0.8^40.
    expect(ok('x + (abs(x) - 4 + abs(abs(x) - 4))', 'x', X)).toBe(false);
  });

  it('skips points where either side is undefined', () => {
    // ln(x^2) and 2ln(x) agree wherever both are defined (x > 0); state the domain if that matters.
    expect(ok('2ln(x)', 'ln(x^2)', X)).toBe(true);
    expect(ok('2ln(x)', 'ln(x^2)', { variables: ['x'], domains: { x: { kind: 'real', min: 0.1, max: 5 } } })).toBe(true);
    expect(ok('sqrt(x)^2', 'x', X)).toBe(true);
  });

  it('division by zero everywhere is not enough points, not a crash', () => {
    const r = gradeExpression('1/(x-x)', 'x', X);
    expect(r.correct).toBe(false);
    expect(r.feedback).toMatch(/Could not check this answer: .* \(0 of 40 needed\)/);
    expect(gradeExpression('1/0', '1', { variables: [] }).feedback).toMatch(/Could not check/);
  });

  it('an answer defined on too small a part of the domain is not judged right', () => {
    // sqrt(x - 4.9) is defined on 1% of [-5, 5]: about 4 of 400 tries.
    expect(ok('sqrt(x - 4.9)^2 + 4.9', 'x', X)).toBe(false);
  });

  it('reports malformed answers with the parser message and keeps the raw text', () => {
    expect(gradeExpression(' n(n-1/2 ', 'choose(n, 2)', N)).toEqual({ correct: false, feedback: 'Expected a closing ")".', normalizedAnswer: 'n(n-1/2' });
    expect(gradeExpression('m(m-1)/2', 'choose(n, 2)', N).feedback).toMatch(/Unknown name "m"/);
    expect(gradeExpression('', 'x', X).feedback).toBe('Enter an expression.');
  });

  it('a broken problem is a problem error, never a throw', () => {
    expect(gradeExpression('x', 'x +', X).feedback).toMatch(/^Problem error/);
    expect(gradeExpression('x', 'y', X).feedback).toMatch(/^Problem error/);
    expect(gradeExpression('x', 'x', { variables: ['x'], domains: { x: { kind: 'real', min: 1, max: 0 } } }).feedback).toMatch(/^Problem error/);
    expect(gradeExpression('x', 'x', { variables: ['x'], domains: { x: { kind: 'real', min: 0, max: Infinity } } }).feedback).toMatch(/^Problem error/);
    expect(gradeExpression('1', 'ln(n)', { variables: ['n'], domains: { n: { kind: 'integer', min: -3, max: 0 } } }).feedback).toMatch(/^Problem error.*undefined on the whole domain/);
  });

  it('is deterministic, and true identities hold for any seed', () => {
    expect(gradeExpression('|x|*x', 'x^2', X)).toEqual(gradeExpression('|x|*x', 'x^2', X));
    for (let seed = 1; seed <= 20; seed++) {
      expect(ok('(x+1)^2', 'x^2 + 2x + 1', { ...X, rng: mulberry32(seed) })).toBe(true);
      expect(ok('|x|*x', 'x^2', { ...X, rng: mulberry32(seed) })).toBe(false);
    }
  });

  it('checks every point of a small integer domain', () => {
    // Differs only at n = 7; sampling 40 of 31 values with replacement could miss it, enumeration cannot.
    expect(ok('n + (n == 7)', 'n', N)).toBe(false); // does not parse: == is not in the language
    expect(ok('n + choose(n, 7) - choose(n, 7)*choose(n - 1, 6)/choose(n - 1, 6)', 'n', N)).toBe(true);
    expect(ok('n + choose(7, n) * choose(n, 7)', 'n', N)).toBe(false);
  });
});
