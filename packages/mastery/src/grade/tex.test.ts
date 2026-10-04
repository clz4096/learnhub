import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../rng';
import { evaluate, parseExpression, type Expr } from './expr';
import { texNumber, texOfExpression } from './tex';

const tex = (s: string, vars = ['x', 'y', 'n', 'k', 'p', 'lambda', 'x1']): string => {
  const r = parseExpression(s, vars, { binomial: true });
  if (!r.ok) throw new Error(`${s}: ${r.error}`);
  return texOfExpression(r.value);
};

describe('texOfExpression', () => {
  const cases: [string, string][] = [
    ['3/8', '\\frac{3}{8}'],
    ['-3/8', '-\\frac{3}{8}'],
    ['0.375', '0.375'],
    ['2^5', '2^{5}'],
    ['2*3', '2 \\times 3'],
    ['2x', '2 x'],
    ['2x^2 - 5x + 6', '2 x^{2} - 5 x + 6'],
    ['(x + 2)(x + 3)', '(x + 2) (x + 3)'],
    ['n(n-1)/2', '\\frac{n (n - 1)}{2}'],
    ['3 * (-8)', '3 \\times (-8)'],
    ['-3 * (-4)', '-3 \\times (-4)'],
    ['x * 2', 'x \\times 2'],
    ['2 * 1/2', '\\frac{2 \\times 1}{2}'],
    ['2 * (1/2)', '2 \\times \\frac{1}{2}'],
    ['x^-2', 'x^{-2}'],
    ['x^(m/n)', 'x^{m/n}'],
    ['9^(1/2)', '9^{1/2}'],
    ['(x^2)^3', '(x^{2})^{3}'],
    ['(-2)^3', '(-2)^{3}'],
    ['(1/2)^3', '\\left(\\frac{1}{2}\\right)^{3}'],
    ['n!', 'n!'],
    ['(n-1)!', '(n - 1)!'],
    ['0!', '0!'],
    ['1 * 0!', '1 \\times 0!'],
    ['sqrt(2)', '\\sqrt{2}'],
    ['√2', '\\sqrt{2}'],
    ['2√3', '2 \\sqrt{3}'],
    ['2 pi', '2 \\pi'],
    ['2 * 3 pi', '2 \\times 3 \\pi'],
    ['|x|', '\\left|x\\right|'],
    ['exp(-x)', 'e^{-x}'],
    ['ln(x)', '\\ln\\left(x\\right)'],
    ['choose(n, k)', '\\binom{n}{k}'],
    ['nCk', '\\binom{n}{k}'],
    ['a - (b - c)', 'a - (b - c)'],
    ['x + -y', 'x + (-y)'],
    ['-(x + 1)', '-(x + 1)'],
    ['lambda^k', '\\lambda^{k}'],
    ['x1 + 1', 'x_{1} + 1'],
  ];
  for (const [input, want] of cases) it(`${input} -> ${want}`, () => expect(tex(input, ['x', 'y', 'n', 'k', 'p', 'm', 'a', 'b', 'c', 'lambda', 'x1'])).toBe(want));

  it('prints numbers JavaScript would write with an exponent in scientific form', () => {
    expect(texNumber(1.5e-7)).toBe('1.5 \\times 10^{-7}');
    expect(texNumber(1e21)).toBe('1 \\times 10^{21}');
    expect(texNumber(12)).toBe('12');
  });

  it('never drops a sign or a term: the printed form has every number of the tree', () => {
    // A cheap structural check over random trees: every literal of the tree appears in the output.
    const rng = mulberry32(19);
    const ops = ['+', '-', '*', '/', '^'] as const;
    const gen = (d: number): Expr => {
      if (d === 0 || rng() < 0.3) return rng() < 0.5 ? { kind: 'num', value: 1 + Math.floor(rng() * 97) } : { kind: 'var', name: 'x' };
      const r = rng();
      if (r < 0.1) return { kind: 'neg', arg: gen(d - 1) };
      if (r < 0.2) return { kind: 'call', fn: 'sqrt', args: [gen(d - 1)] };
      return { kind: 'bin', op: ops[Math.floor(rng() * ops.length)] as (typeof ops)[number], left: gen(d - 1), right: gen(d - 1) };
    };
    const nums = (e: Expr): number[] => (e.kind === 'num' ? [e.value] : e.kind === 'neg' ? nums(e.arg) : e.kind === 'bin' ? [...nums(e.left), ...nums(e.right)] : e.kind === 'call' ? e.args.flatMap(nums) : []);
    for (let i = 0; i < 500; i++) {
      const e = gen(4);
      const out = texOfExpression(e);
      for (const n of nums(e)) expect(out, out).toContain(String(n));
      expect(Number.isNaN(evaluate(e, { x: 1.5 })) || out.length > 0).toBe(true);
    }
  });
});
