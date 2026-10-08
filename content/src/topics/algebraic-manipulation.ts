/**
 * pre.algebraic-manipulation: Expanding, factorising, and simplifying. From STEP Support
 * Assignment 7 Q2 and Q3 (identity versus equation; roots and coefficients by expanding and
 * substituting), Assignment 12 Q1(ii) and Q2(i) (factorising a cubic; algebraic fractions),
 * and TMUA Exercise Q (squaring both sides can add a false root).
 */
import type { Rational } from '@learnhub/mastery';
import { auto, cite, same, withUses } from '../cambridge';
import { add, div, int, mul, pick, q, sample, str, sub } from '../math';
import { factor, poly, signed, times } from '../poly';
import { generator, type Misconception } from '../problem';
import { computedMath as cm, dmath, ident, listOf, math, paren, t } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

const X = ['x'] as const;
const XY = ['x', 'y'] as const;
const nonzero = (rng: () => number, lo: number, hi: number): number => {
  for (;;) {
    const v = int(rng, lo, hi);
    if (v !== 0) return v;
  }
};
/** "3x" for a linear term, "x" for 1, "-x" for -1. */
const term = (c: number, v: string): string => (c === 1 ? v : c === -1 ? `-${v}` : `${c}${v}`);
const lin = (a: number, b: number): string => `${term(a, 'x')} ${signed(b)}`;
const [mx, my] = [math`x`, math`y`];

// ---------------------------------------------------------------- generators

interface ExpandP { a: number; b: number; c: number; d: number }

const expand = generator<ExpandP>({
  id: 'expand',
  skill: 'Expand the product of two brackets and collect like terms.',
  params: (rng) => ({ a: int(rng, 1, 3), b: nonzero(rng, -9, 9), c: int(rng, 1, 3), d: nonzero(rng, -9, 9) }),
  sane: ({ a, b, c, d }) => (a >= 1 && a <= 3 && c >= 1 && c <= 3 && b !== 0 && d !== 0 && Math.abs(b) <= 9 && Math.abs(d) <= 9 ? null : 'out of range'),
  problem({ a, b, c, d }) {
    const out = [a * c, a * d + b * c, b * d];
    return {
      prompt: t`Expand and simplify ${cm(`(${lin(a, b)})(${lin(c, d)})`)}.`,
      answer: { kind: 'expression', expected: poly(out), variables: X, form: 'expanded' },
      solution: [
        t`Multiply every term in the first bracket by every term in the second: four products.`,
        t`${cm(`${term(a, 'x')} * ${term(c, 'x')} = ${poly([a * c, 0, 0])}`)}, ${cm(`${term(a, 'x')} * ${d < 0 ? `(${d})` : d} = ${poly([a * d, 0])}`)}, ${cm(`${b} * ${term(c, 'x')} = ${poly([b * c, 0])}`)}, and ${cm(`${b} * ${d < 0 ? `(${d})` : d} = ${b * d}`)}.`,
        t`Collect the two ${mx} terms: ${cm(`${poly([a * d, 0])} ${b * c < 0 ? '-' : '+'} ${term(Math.abs(b * c), 'x')} = ${poly([a * d + b * c, 0])}`)}.`,
        t`So the expansion is ${cm(poly(out))}.`,
      ],
    };
  },
  solve: ({ a, b, c, d }) => poly(times([a, b], [c, d])),
  misconceptions: ({ a, b, c, d }): Misconception[] => [
    { response: poly([a * c, 0, b * d]), why: t`The ${mx} terms are missing. Each term of the first bracket multiplies each term of the second, so there are two middle products, ${cm(poly([a * d, 0]))} and ${cm(poly([b * c, 0]))}.` },
    { response: poly([a * c, a * d, b * d]), why: t`Only one of the two middle products made it in. Add ${cm(poly([b * c, 0]))} as well.` },
    { response: poly([a * c, a * d + b * c, -b * d]), why: t`Check the sign of the last term: ${cm(`${b} * ${d < 0 ? `(${d})` : d} = ${b * d}`)}. A negative times a negative is positive, and a negative times a positive is negative.` },
  ],
});

interface FactorP { p: number; r: number }

const factorise = generator<FactorP>({
  id: 'factorise',
  skill: 'Factorise a quadratic with leading coefficient one into two brackets.',
  params(rng) {
    for (;;) {
      const p = nonzero(rng, -9, 9);
      const r = nonzero(rng, -9, 9);
      if (p + r !== 0 && p !== r) return { p, r };
    }
  },
  sane: ({ p, r }) => (p !== 0 && r !== 0 && p !== r && p + r !== 0 && Math.abs(p) <= 9 && Math.abs(r) <= 9 ? null : 'out of range'),
  problem({ p, r }) {
    const b = p + r;
    const c = p * r;
    return {
      prompt: t`Factorise ${cm(poly([1, b, c]))}.`,
      answer: { kind: 'expression', expected: `(${factor(p)})(${factor(r)})`, variables: X, form: 'product' },
      solution: [
        t`Look for two numbers that multiply to ${c} and add to ${b}.`,
        t`They are ${p} and ${r}: ${math`${p} \times ${paren(r)} = ${c}`} and ${math`${p} + ${paren(r)} = ${b}`}.`,
        t`So ${cm(`${poly([1, b, c])} = (${factor(p)})(${factor(r)})`)}. Check by expanding: the brackets give back ${cm(poly(times([1, p], [1, r])))}.`,
      ],
    };
  },
  solve: ({ p, r }) => {
    // Search every integer pair whose product is c for the one whose sum is b.
    const b = p + r;
    const c = p * r;
    for (let u = -Math.abs(c); u <= Math.abs(c); u++) {
      if (u !== 0 && c % u === 0 && u + c / u === b) return `(${factor(u)})(${factor(c / u)})`;
    }
    return 'no factorisation';
  },
  misconceptions: ({ p, r }): Misconception[] => [
    { response: `(${factor(-p)})(${factor(-r)})`, why: t`The signs are flipped. Expanding your brackets gives the ${mx} term with the opposite sign. The numbers in the brackets must add to the ${mx} coefficient, ${p + r}.` },
    { response: `(${factor(p + r)})(${factor(1)})`, why: t`Your numbers add to ${p + r + 1}, not ${p + r}, and multiply to ${p + r}, not ${p * r}. Find two numbers that multiply to the constant term and add to the ${mx} coefficient.` },
  ],
});

interface CancelP { p: number; r: number }

const cancel = generator<CancelP>({
  id: 'cancel',
  skill: 'Simplify an algebraic fraction by factorising and cancelling.',
  params(rng) {
    for (;;) {
      const p = nonzero(rng, -9, 9);
      const r = nonzero(rng, -9, 9);
      if (p !== r && p + r !== 0) return { p, r };
    }
  },
  sane: ({ p, r }) => (p !== 0 && r !== 0 && p !== r && p + r !== 0 && Math.abs(p) <= 9 && Math.abs(r) <= 9 ? null : 'out of range'),
  problem({ p, r }) {
    const top = poly([1, p + r, p * r]);
    return {
      prompt: t`Simplify ${cm(`(${top})/(${factor(p)})`)}.`,
      answer: { kind: 'expression', expected: factor(r), variables: X, form: 'no-fraction' },
      solution: [
        t`Factorise the top: ${cm(`${top} = (${factor(p)})(${factor(r)})`)}.`,
        t`The top and bottom share the factor ${cm(factor(p))}. Cancel it (for ${math`x \ne ${-p}`}, where the bottom is zero).`,
        t`What is left is ${cm(factor(r))}.`,
      ],
    };
  },
  solve: ({ p, r }) => {
    // Polynomial long division of x^2 + (p + r)x + pr by x + p.
    const q1 = 1;
    const rest = p + r - q1 * p;
    return factor(rest);
  },
  misconceptions: ({ p, r }): Misconception[] => [
    { response: factor(p), why: t`That is the bottom, the factor that cancels. Factorise the top as ${cm(`(${factor(p)})(${factor(r)})`)}; the other bracket is what is left.` },
    { response: factor(-r), why: t`Check the sign: the top factorises as ${cm(`(${factor(p)})(${factor(r)})`)}, so ${cm(factor(r))} is left after cancelling.` },
  ],
});

interface CollectP { a: number; b: number; c: number; d: number }

const collect = generator<CollectP>({
  id: 'collect',
  skill: 'Collect like terms, including a subtracted term.',
  params(rng) {
    for (;;) {
      const p = { a: int(rng, 2, 9), b: int(rng, 1, 9), c: int(rng, 1, 9), d: int(rng, 1, 9) };
      if (p.a !== p.c) return p;
    }
  },
  sane: ({ a, b, c, d }) => (a >= 2 && a !== c && [a, b, c, d].every((v) => v >= 1 && v <= 9) ? null : 'out of range'),
  problem({ a, b, c, d }) {
    const ans = `${term(a - c, 'x')} + ${term(b + d, 'y')}`;
    return {
      prompt: t`Simplify ${cm(`${a}x + ${term(b, 'y')} - ${term(c, 'x')} + ${term(d, 'y')}`)}.`,
      answer: { kind: 'expression', expected: ans, variables: XY, form: 'collected' },
      solution: [
        t`[[like-terms|Like terms]] have the same letters, so the ${mx} terms combine with each other and the ${my} terms with each other.`,
        t`The ${mx} terms: ${cm(`${a}x - ${term(c, 'x')} = ${term(a - c, 'x')}`)}. The minus sign belongs to the term after it.`,
        t`The ${my} terms: ${cm(`${term(b, 'y')} + ${term(d, 'y')} = ${term(b + d, 'y')}`)}.`,
        t`So the answer is ${cm(ans)}.`,
      ],
    };
  },
  solve: ({ a, b, c, d }) => {
    // Add up the coefficient of each letter term by term.
    const terms: [number, string][] = [[a, 'x'], [b, 'y'], [-c, 'x'], [d, 'y']];
    const x = terms.filter(([, v]) => v === 'x').reduce((s, [k]) => s + k, 0);
    const y = terms.filter(([, v]) => v === 'y').reduce((s, [k]) => s + k, 0);
    return `${x}x + ${y}y`;
  },
  misconceptions: ({ a, b, c, d }): Misconception[] => [
    { response: `${term(a + c, 'x')} + ${term(b + d, 'y')}`, why: t`The minus sign in front of ${cm(term(c, 'x'))} belongs to that term, so subtract it: ${cm(`${a}x - ${term(c, 'x')} = ${term(a - c, 'x')}`)}.` },
    { response: `${a - c + b + d}xy`, why: t`${mx} terms and ${my} terms are not like terms, so they cannot be added together. Keep one ${mx} term and one ${my} term.` },
  ],
});

// ---------------------------------------------------------------- roots and coefficients

/** The coefficients of (x - r1)(x - r2)..., highest power first. */
const fromRoots = (roots: readonly number[]): number[] => roots.reduce<number[]>((acc, r) => times(acc, [1, -r]), [1]);

const ints = (vs: readonly Rational[]): number[] | null => (vs.every((v) => v.den === 1n) ? vs.map((v) => Number(v.num)) : null);

/** Null when the values are exactly the roots of the monic polynomial, with multiplicity, else why not. */
function rootsOf(coeffs: readonly number[], vs: readonly Rational[], ascending = false): string | null {
  const r = ints(vs);
  if (r === null) return 'The roots here are whole numbers.';
  if (r.length !== coeffs.length - 1) return `A polynomial of degree ${coeffs.length - 1} has ${coeffs.length - 1} roots, counted with repeats.`;
  if (ascending && r.some((x, i) => i > 0 && x < (r[i - 1] as number))) return 'List them in increasing order.';
  const got = fromRoots(r);
  if (got.join() !== coeffs.join()) return `Those roots give ${poly(got)}, not ${poly(coeffs)}.`;
  return null;
}

interface VietaP { r: number; s: number }

const vieta = generator<VietaP>({
  id: 'vieta',
  skill: 'Find the roots of a quadratic from their sum and product, as in STEP Support Assignment 7 Q2(iii).',
  params(rng) {
    for (;;) {
      const r = nonzero(rng, -9, 9);
      const s = nonzero(rng, -9, 9);
      if (r !== s && r !== -s) return { r, s };
    }
  },
  sane: ({ r, s }) => (r !== 0 && s !== 0 && r !== s && r !== -s && Math.abs(r) <= 9 && Math.abs(s) <= 9 ? null : 'out of range'),
  problem({ r, s }) {
    const c = fromRoots([r, s]);
    return {
      prompt: t`Write down two integers ${math`\alpha`} and ${math`\beta`} with ${math`\alpha\beta = ${r * s}`} and ${math`\alpha + \beta = ${r + s}`}. Hence write down the roots of ${math`${cm(poly(c))} = ${0}`}, separated by a comma.`,
      answer: { kind: 'witness', count: 2, unordered: true, example: `${r}, ${s}`, check: (v) => rootsOf(c, v) },
      solution: [
        t`If ${math`\alpha`} and ${math`\beta`} are the roots, then ${math`(x - \alpha)(x - \beta) = x^{${2}} - (\alpha + \beta)x + \alpha\beta`}. So the roots add to ${r + s} and multiply to ${r * s}.`,
        t`The pairs of integers with product ${r * s} are few; the one with sum ${r + s} is ${listOf([Math.min(r, s), Math.max(r, s)])}.`,
        t`Check by expanding: ${cm(`(${factor(-r)})(${factor(-s)})`)} is ${cm(poly(c))}.`,
      ],
    };
  },
  solve: ({ r, s }) => {
    // Search the integers for the roots.
    const c = fromRoots([r, s]);
    const found: number[] = [];
    for (let x = -81; x <= 81; x++) if ((c[0] as number) * x * x + (c[1] as number) * x + (c[2] as number) === 0) found.push(x);
    return found.join(', ');
  },
  misconceptions: ({ r, s }): Misconception[] => [
    { response: `${-r}, ${-s}`, why: t`The signs are reversed. In ${math`(x - \alpha)(x - \beta)`} the roots appear with minus signs, so the factor ${cm(factor(-r))} gives the root ${r}.` },
    { response: `${r * s}, ${r + s}`, why: t`Those are the product and the sum, not the roots. Find two numbers with that product and that sum.` },
  ],
});

interface CubicP { roots: number[] }

const cubic = generator<CubicP>({
  id: 'cubic-roots',
  skill: 'Find the integer roots of a cubic from its coefficients, as in STEP Support Assignment 7 Q2(v).',
  params: (rng) => ({ roots: sample(rng, [-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6], 3).sort((a, b) => a - b) }),
  sane: ({ roots }) => (roots.length === 3 && new Set(roots).size === 3 && roots.every((x) => x !== 0 && Math.abs(x) <= 6) ? null : 'out of range'),
  problem({ roots }) {
    const c = fromRoots(roots);
    return {
      prompt: t`The cubic ${math`${cm(poly(c))} = ${0}`} has three integer roots. Find them, separated by commas.`,
      answer: { kind: 'witness', count: 3, unordered: true, example: roots.join(', '), check: (v) => rootsOf(c, v) },
      solution: [
        t`Write ${math`${cm(poly(c))} \equiv (x - \alpha)(x - \beta)(x - \gamma)`} and substitute ${math`x = ${0}`}: ${math`\alpha\beta\gamma = ${roots[0] as number * (roots[1] as number) * (roots[2] as number)}`}. So each root divides ${Math.abs(c[3] as number)}.`,
        t`Try the divisors: ${listOf(roots)} make the cubic zero, and three roots are all a cubic has.`,
        t`Check by expanding: ${cm(roots.map((x) => `(${factor(-x)})`).join(''))} is ${cm(poly(c))}.`,
      ],
    };
  },
  solve: ({ roots }) => {
    const c = fromRoots(roots);
    const found: number[] = [];
    for (let x = -50; x <= 50; x++) if (c.reduce((acc, k) => acc * x + k, 0) === 0) found.push(x);
    return found.join(', ');
  },
  misconceptions: ({ roots }): Misconception[] => [
    { response: roots.map((x) => -x).join(', '), why: t`The signs are reversed: the factor ${math`(x - \alpha)`} has root ${math`\alpha`}, so ${cm(factor(-(roots[0] as number)))} gives ${roots[0] as number}.` },
    { response: [roots[0] as number, roots[1] as number, -(roots[2] as number)].join(', '), why: t`One sign is wrong. Substitute each root back into the cubic to check it gives zero.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const A7 = 'step-f07';
const a7Cubic = [1, -4, -4, 16];

const a12Factor = auto({
  id: 'a12-q1-ii',
  source: cite('step-f12', 'Q1(ii), first part'),
  title: t`Factorising ${math`n^{${3}} - n`}`,
  prompt: t`Factorise ${math`n^{${3}} - n`} completely.`,
  answer: { kind: 'expression', expected: '(n - 1)n(n + 1)', variables: ['n'], form: 'product' },
  solution: [
    t`Take out the common factor ${math`n`}: ${math`n^{${3}} - n = n(n^{${2}} - ${1})`}.`,
    t`${math`n^{${2}} - ${1}`} is a difference of two squares: ${ident('n^2 - 1', '(n - 1)(n + 1)', ['n'])}.`,
    t`So ${math`n^{${3}} - n = (n - ${1})n(n + ${1})`}: three consecutive integers multiplied together, which is how the source goes on to show it is divisible by ${6}.`,
  ],
  reference: 'n(n - 1)(n + 1)',
  verify: () => same('A12 Q1(ii) by expanding', poly(fromRoots([1, 0, -1]), 'n'), 'n^3 - n'),
  misconceptions: [
    { response: 'n(n^2 - 1)', why: t`Right so far, but not complete: ${math`n^{${2}} - ${1}`} factorises further, as a difference of two squares.` },
  ],
  official: { source: cite('step-f12-hints', 'Q1(ii)'), answer: '(n - 1)n(n + 1)', agrees: true },
});

const a7Pair = auto({
  id: 'a7-q2-iii',
  source: cite(A7, 'Q2(iii)'),
  title: t`Roots from a sum and a product`,
  prompt: t`Write down two positive integers ${math`\alpha`} and ${math`\beta`} such that ${math`\alpha\beta = ${10}`} and ${math`\alpha + \beta = ${7}`}. Hence write down the roots of the equation ${math`x^{${2}} - ${7}x + ${10} = ${0}`}.`,
  answer: { kind: 'witness', count: 2, unordered: true, example: '2, 5', check: (v) => rootsOf([1, -7, 10], v) },
  solution: [
    t`From parts (i) and (ii) of the source: if ${math`x^{${2}} + bx + c \equiv (x - \alpha)(x - \beta)`}, then ${math`\alpha\beta = c`} and ${math`\alpha + \beta = -b`}.`,
    t`The positive integer pairs with product ${10} are ${listOf([1, 10])} and ${listOf([2, 5])}; only ${listOf([2, 5])} adds to ${7}.`,
    t`So ${math`x^{${2}} - ${7}x + ${10} \equiv (x - ${2})(x - ${5})`}, and the roots are ${2} and ${5}.`,
  ],
  reference: '5, 2',
  verify: () => rootsOf([1, -7, 10], [q(2), q(5)]),
  misconceptions: [{ response: '-2, -5', why: t`The signs are reversed. The factor ${math`(x - ${2})`} is zero at ${math`x = ${2}`}.` }],
  official: { source: cite('step-f07-hints', 'Q2(iii)'), answer: '2, 5', agrees: true },
});

const a7Three = auto({
  id: 'a7-q2-v',
  source: cite(A7, 'Q2(v)'),
  title: t`Three integer roots`,
  prompt: t`Given that ${math`${cm(poly(a7Cubic))} \equiv (x - \alpha)(x - \beta)(x - \gamma)`}, where ${math`\alpha`}, ${math`\beta`}, and ${math`\gamma`} are integers with ${math`\alpha \le \beta \le \gamma`}, find ${math`\alpha`}, ${math`\beta`}, and ${math`\gamma`}, in that order.`,
  answer: { kind: 'witness', count: 3, example: '-2, 2, 4', check: (v) => rootsOf(a7Cubic, v, true) },
  hints: [
    t`What does substituting ${math`x = ${0}`} into the identity give?`,
    t`What do ${math`x = ${1}`} and ${math`x = -${1}`} give, and which values of ${math`${1} + \alpha`} are then possible?`,
    t`Which candidates survive all three conditions at once?`,
  ],
  nudge: t`Not quite. Substituting a few small values of ${math`x`} into the identity traps the roots in a short list; then mind the order asked for.`,
  solution: [
    t`${math`x = ${0}`}: ${math`-\alpha\beta\gamma = ${16}`}, so ${math`\alpha\beta\gamma = -${16}`}.`,
    t`${math`x = -${1}`}: ${math`(${1} + \alpha)(${1} + \beta)(${1} + \gamma) = -${15}`}, so ${math`\alpha`} is one of ${listOf([-16, -6, -4, -2, 0, 2, 4, 14])}; the product ${math`-${16}`} rules out ${0}, ${-6}, ${14}.`,
    t`${math`x = ${1}`}: ${math`(${1} - \alpha)(${1} - \beta)(${1} - \gamma) = ${9}`}, so ${math`${1} - \alpha`} divides ${9}. That leaves ${listOf([-2, 2, 4])}.`,
    t`${math`\alpha = -${2}`}, ${math`\beta = ${2}`}, ${math`\gamma = ${4}`}. Check: ${cm([-2, 2, 4].map((r) => `(${factor(-r)})`).join(''))} expands to ${cm(poly(a7Cubic))}.`,
    t`Substitute easy values into an identity to trap the unknowns.`,
  ],
  reference: '-2, 2, 4',
  verify: () => {
    const found: number[] = [];
    for (let x = -20; x <= 20; x++) if (a7Cubic.reduce((acc, k) => acc * x + k, 0) === 0) found.push(x);
    return same('A7 Q2(v) by search', found.join(', '), '-2, 2, 4');
  },
  misconceptions: [{ response: '4, 2, -2', why: t`Those are the roots, but the question fixes the order ${math`\alpha \le \beta \le \gamma`}: smallest first.` }],
  official: { source: cite('step-f07-hints', 'Q2(v)'), answer: '-2, 2, 4', agrees: true },
});

const a12FracA = auto({
  id: 'a12-q2-i-a',
  source: cite('step-f12', 'Q2(i)(a)'),
  title: t`Two algebraic fractions`,
  prompt: t`Express as a single fraction: ${math`\frac{${1}}{(x - ${1})(x + ${2})} - \frac{${1}}{(x + ${1})(x + ${2})}`}.`,
  answer: { kind: 'expression', expected: '2/((x - 1)(x + 1)(x + 2))', variables: ['x'] },
  hints: [
    t`Which bracket is each denominator missing from the lowest common denominator?`,
    t`Over that common denominator, what are the two numerators?`,
    t`What does the numerator simplify to?`,
  ],
  nudge: t`Not quite. Put both fractions over one common denominator before subtracting; the top then collapses.`,
  solution: [
    t`The lowest common denominator is ${math`(x - ${1})(x + ${1})(x + ${2})`}: each fraction is missing one bracket.`,
    t`So the difference is ${math`\frac{(x + ${1}) - (x - ${1})}{(x - ${1})(x + ${1})(x + ${2})}`}, and the top is ${2}.`,
    t`The answer is ${math`\frac{${2}}{(x - ${1})(x + ${1})(x + ${2})}`}.`,
    t`Common denominator first; the numerator often simplifies.`,
  ],
  reference: '2/((x-1)(x+1)(x+2))',
  verify: () => {
    // Exact arithmetic at whole numbers away from the poles.
    for (const x of [3, 4, 7, 10, -5]) {
      const lhs = sub(q(1, (x - 1) * (x + 2)), q(1, (x + 1) * (x + 2)));
      const e = same(`A12 Q2(i)(a) at x = ${x}`, str(lhs), str(q(2, (x - 1) * (x + 1) * (x + 2))));
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [{ response: '0', why: t`The two denominators are different, so the fractions do not cancel. Put both over ${math`(x - ${1})(x + ${1})(x + ${2})`} first.` }],
  official: { source: cite('step-f12-hints', 'Q2(i)(a)'), answer: '2/((x - 1)(x + 1)(x + 2))', agrees: true },
});

const a12FracB = auto({
  id: 'a12-q2-i-b',
  source: cite('step-f12', 'Q2(i)(b)'),
  title: t`Products and a sum of fractions`,
  prompt: t`Express as a single fraction: ${math`\frac{m}{m + ${2}} \times \frac{m - ${1}}{m + ${1}} + \frac{m}{m + ${2}} \times \frac{${2}}{m + ${1}} \times \frac{m - ${1}}{m}`}.`,
  answer: { kind: 'expression', expected: '(m - 1)/(m + 1)', variables: ['m'], domains: { m: { kind: 'real', min: 2, max: 9 } } },
  hints: [
    t`Which factor cancels inside the second product before anything else?`,
    t`What common denominator do the two terms then share?`,
    t`What factor does the combined numerator share with the denominator?`,
  ],
  nudge: t`Not quite. Cancel inside each product first; the sum then shares a factor with its denominator.`,
  solution: [
    t`Cancel the ${math`m`} in the second product first: it is ${math`\frac{${2}(m - ${1})}{(m + ${2})(m + ${1})}`}.`,
    t`Both terms now have denominator ${math`(m + ${2})(m + ${1})`}, so the sum is ${math`\frac{m(m - ${1}) + ${2}(m - ${1})}{(m + ${2})(m + ${1})} = \frac{(m + ${2})(m - ${1})}{(m + ${2})(m + ${1})}`}.`,
    t`Cancel ${math`m + ${2}`}: the answer is ${math`\frac{m - ${1}}{m + ${1}}`}. (It reappears in the raffle question of the same assignment.)`,
    t`Cancel early, and factorise the numerator before the last cancel.`,
  ],
  reference: '(m-1)/(m+1)',
  verify: () => {
    for (const m of [2, 3, 5, 8, 13]) {
      const lhs = add(mul(q(m, m + 2), q(m - 1, m + 1)), mul(mul(q(m, m + 2), q(2, m + 1)), q(m - 1, m)));
      const e = same(`A12 Q2(i)(b) at m = ${m}`, str(lhs), str(q(m - 1, m + 1)));
      if (e !== null) return e;
    }
    return null;
  },
  official: { source: cite('step-f12-hints', 'Q2(i)(b)'), answer: '(m - 1)/(m + 1)', agrees: true },
});

const tmuaQ = auto({
  id: 'tmua-q',
  source: cite('tmua-logic-proof', 'Exercise Q'),
  title: t`Squaring both sides`,
  prompt: t`Solve ${math`\sqrt{${2}x + ${3}} + \sqrt{x + ${1}} = \sqrt{${7}x + ${4}}`}.`,
  answer: { kind: 'exact', expected: '3' },
  hints: [
    t`What does squaring both sides give, with the cross term kept?`,
    t`After isolating the remaining square root and squaring again, which quadratic in ${math`x`} results?`,
    t`Which root of that quadratic survives when put back into the original equation?`,
  ],
  nudge: t`Not quite. Squaring can add roots that do not satisfy the original equation; check each candidate there.`,
  solution: [
    t`Square both sides: ${math`(${2}x + ${3}) + (x + ${1}) + ${2}\sqrt{(${2}x + ${3})(x + ${1})} = ${7}x + ${4}`}, so ${math`\sqrt{(${2}x + ${3})(x + ${1})} = ${2}x`}.`,
    t`Square again: ${math`${2}x^{${2}} + ${5}x + ${3} = ${4}x^{${2}}`}, so ${math`${2}x^{${2}} - ${5}x - ${3} = ${0}`}, which is ${math`(${2}x + ${1})(x - ${3}) = ${0}`}: ${math`x = ${3}`} or ${math`x = ${q(-1, 2)}`}.`,
    t`Squaring can add false roots, so check both in the original. At ${math`x = ${q(-1, 2)}`}, the step ${math`\sqrt{\cdots} = ${2}x`} would make a square root negative: reject it. At ${math`x = ${3}`}: ${math`\sqrt{${9}} + \sqrt{${4}} = ${5} = \sqrt{${25}}`}. The only solution is ${math`x = ${3}`}.`,
    t`After squaring, check every root in the original equation.`,
  ],
  reference: '3',
  verify: () => {
    const f = (x: number): number => Math.sqrt(2 * x + 3) + Math.sqrt(x + 1) - Math.sqrt(7 * x + 4);
    // The roots of 2x^2 - 5x - 3, checked in the original equation.
    const cands = [3, -0.5].filter((x) => 7 * x + 4 >= 0 && x + 1 >= 0 && Math.abs(f(x)) < 1e-12);
    return same('TMUA Q', cands.join(), '3');
  },
  misconceptions: [{ response: '-1/2', why: t`That root came from squaring. Put it back in the original equation: ${math`\sqrt{${7}x + ${4}}`} is not even defined there.` }],
});

// ---------------------------------------------------------------- lesson

const ex = { a: 2, b: 3, c: 1, d: -4 };
const exOut = times([ex.a, ex.b], [ex.c, ex.d]);
const fx = { p: 2, r: 5 };
const hk = { p: 3, r: -2, x: 5 };
const hkVal = (hk.x + hk.p) * (hk.x + hk.r);

export const algebraicManipulation: TopicContent = {
  topicId: 'pre.algebraic-manipulation',
  goal: t`Expand brackets, factorise quadratics, collect like terms, and cancel algebraic fractions.`,
  objective: t`Expand, factorise, and simplify expressions, and tell an identity from an equation.`,
  why: t`Every later argument is algebra; STEP uses identities to read off roots without a formula.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`Same thing, different clothes` },
    { kind: 'hook', text: t`Is ${cm(`(${factor(hk.p)})(${factor(hk.r)})`)} the same as ${cm(poly(times([1, hk.p], [1, hk.r])))}? Try ${math`x = ${hk.x}`}: the first is ${math`${hk.x + hk.p} \times ${hk.x + hk.r} = ${hkVal}`}, and the second is ${math`${hk.x * hk.x} + ${hk.x} - ${6} = ${hk.x * hk.x + hk.x - 6}`}. They agree. But do they agree for every ${mx}? You cannot try them all.` },
    { kind: 'narrative', text: t`You don't have to. Both expressions are built from the same few rules of arithmetic, and those rules let you turn one into the other step by step. If every step is a rule that holds for all numbers, the two agree for all numbers. This lesson is about those steps: expanding, factorising, and simplifying.` },
    { kind: 'section', title: t`Expressions and identities` },
    {
      kind: 'definition',
      name: t`Expression, coefficient, like terms`,
      formal: t`An [[expression|expression]] is built from numbers and letters by adding, subtracting, multiplying, and dividing; its terms are the parts joined by ${math`+`} and ${math`-`}. In a term such as ${cm(poly([3, 0, 0]))}, the number ${3} is the [[coefficient|coefficient]]. Two terms are [[like-terms|like terms]] if they have exactly the same letters raised to the same powers.`,
      plain: t`${cm(`${poly([3, 0, 0])} + ${term(2, 'y')}`)} has two terms. ${cm(poly([5, 0]))} and ${cm(poly([2, 0]))} are like terms; ${mx} and ${math`x^{${2}}`} are not.`,
    },
    {
      kind: 'definition',
      name: t`Identity and equation`,
      formal: t`An [[identity|identity]] ${math`A \equiv B`} states that ${math`A`} and ${math`B`} take the same value for every value of their letters. An equation ${math`A = B`} asks for the values of the letters at which they are equal.`,
      plain: t`STEP Support Assignment ${7} puts it this way: ${math`${3}x + ${3} \equiv ${3}(x + ${1})`} is true for every ${mx}, while ${math`${3}x + ${3} = ${6}`} is true only when ${math`x = ${1}`}.`,
    },
    { kind: 'p', text: t`Only like terms combine, because ${math`${5}x + ${2}x = (${5} + ${2})x`} is the same multiplication done in a different order: ${cm(`${term(5, 'x')} + ${term(2, 'x')}`)} is ${cm(poly([5 + 2, 0]))}. But ${cm(`${term(5, 'x')} + ${term(2, 'y')}`)} stays as it is, since ${mx} and ${my} can be any two different numbers.` },
    { kind: 'section', title: t`Expanding brackets` },
    { kind: 'narrative', text: t`One rule does all the work. For any numbers ${math`a`}, ${math`b`}, and ${math`c`}, ${math`a(b + c) = ab + ac`}. Picture ${math`a`} rows of dots, each row holding ${math`b`} red dots and ${math`c`} blue ones: counted by rows that is ${math`a(b + c)`}, counted by colour it is ${math`ab + ac`}. This is the distributive law. Everything else follows from it.` },
    { kind: 'theorem', name: t`Product of two brackets`, statement: t`For all numbers ${math`a, b, c, d`}, ${math`(a + b)(c + d) = ac + ad + bc + bd`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Treat one bracket as a single number`, text: t`Let ${math`s = a + b`}. Then ${math`(a + b)(c + d) = s(c + d) = sc + sd`}.`, plain: t`The distributive law, with ${math`s`} in place of ${math`a`}.` },
        { label: t`Put the bracket back`, text: t`${math`sc + sd = (a + b)c + (a + b)d`}.` },
        { label: t`Distribute again`, text: t`${math`(a + b)c = ac + bc`} and ${math`(a + b)d = ad + bd`}.`, why: { q: t`The bracket is on the left of ${math`c`} here. Does the law still apply?`, a: t`Yes: multiplication can be done in either order, so ${math`(a + b)c = c(a + b) = ca + cb`}.` } },
        { label: t`Collect`, text: t`${math`(a + b)(c + d) = ac + ad + bc + bd`}.`, plain: t`Every term of the first bracket multiplies every term of the second: four products.` },
      ],
    },
    { kind: 'p', text: t`To [[expand|expand]] a product of brackets is to multiply it out like this into a sum of terms, then collect like terms. For ${cm(`(${lin(ex.a, ex.b)})(${lin(ex.c, ex.d)})`)} the four products are ${cm(poly([ex.a * ex.c, 0, 0]))}, ${cm(poly([ex.a * ex.d, 0]))}, ${cm(poly([ex.b * ex.c, 0]))}, and ${ex.b * ex.d}. The two ${mx} terms are like terms: ${cm(`${poly([ex.a * ex.d, 0])} + ${poly([ex.b * ex.c, 0])}`)} is ${cm(poly([ex.a * ex.d + ex.b * ex.c, 0]))}. So the expansion is ${cm(poly(exOut))}.` },
    { kind: 'p', text: t`Two special cases are worth knowing by sight. With ${math`c = a`} and ${math`d = b`}: ${ident('(a + b)^2', 'a^2 + 2ab + b^2', ['a', 'b'])}. With ${math`c = a`} and ${math`d = -b`}: the middle terms cancel, giving the difference of two squares, ${ident('(a - b)(a + b)', 'a^2 - b^2', ['a', 'b'])}.` },
    checkFrom(expand, { a: 1, b: 4, c: 2, d: -3 }, t`The four products are ${cm(poly([2, 0, 0]))}, ${cm(poly([-3, 0]))}, ${cm(poly([8, 0]))}, and ${4 * -3}; the ${mx} terms collect to ${cm(poly([-3 + 8, 0]))}.`),
    { kind: 'section', title: t`Factorising` },
    { kind: 'narrative', text: t`Factorising runs expansion backwards: given ${cm(poly([1, fx.p + fx.r, fx.p * fx.r]))}, find the brackets that multiply to it. Why bother? Because a product is zero exactly when one of its factors is, so factors show you where an expression vanishes, and they cancel in fractions.` },
    {
      kind: 'definition',
      name: t`Factorise`,
      formal: t`To [[factorise|factorise]] an expression is to write it as a product of simpler expressions, its factors, that is identical to it.`,
      plain: t`${math`${cm(poly([1, fx.p + fx.r, fx.p * fx.r]))} \equiv ${cm(`(${factor(fx.p)})(${factor(fx.r)})`)}`}, and ${math`n^{${3}} - n \equiv (n - ${1})n(n + ${1})`}.`,
    },
    { kind: 'theorem', name: t`Factorising a quadratic`, statement: t`If ${math`p`} and ${math`r`} are numbers with ${math`p + r = b`} and ${math`pr = c`}, then ${math`x^{${2}} + bx + c \equiv (x + p)(x + r)`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Expand the brackets`, text: t`${math`(x + p)(x + r) = x^{${2}} + rx + px + pr`}.`, plain: t`The product of two brackets, from the theorem above.` },
        { label: t`Collect the ${mx} terms`, text: t`${math`x^{${2}} + rx + px + pr = x^{${2}} + (p + r)x + pr`}.` },
        { label: t`Use the two conditions`, text: t`With ${math`p + r = b`} and ${math`pr = c`}, this is ${math`x^{${2}} + bx + c`}, for every ${mx}.` },
      ],
    },
    { kind: 'p', text: t`For ${cm(poly([1, fx.p + fx.r, fx.p * fx.r]))}, look for two numbers with product ${fx.p * fx.r} and sum ${fx.p + fx.r}: ${math`${fx.p} \times ${fx.r} = ${fx.p * fx.r}`} and ${math`${fx.p} + ${fx.r} = ${fx.p + fx.r}`}. So it is ${cm(`(${factor(fx.p)})(${factor(fx.r)})`)}. Expanding gives it back, which is always the check.` },
    { kind: 'p', text: t`An identity can also be used by substituting values, because it holds at every one. If ${math`x^{${2}} + bx + c \equiv (x - \alpha)(x - \beta)`}, then putting ${math`x = ${0}`} gives ${math`c = \alpha\beta`}, and expanding gives ${math`b = -(\alpha + \beta)`}. Choosing values that make brackets vanish, often ${0}, ${1}, and ${-1}, is the trick of STEP Support Assignment ${7}.` },
    { kind: 'section', title: t`Algebraic fractions` },
    { kind: 'theorem', name: t`Cancelling`, statement: t`For expressions ${math`A`}, ${math`B`}, ${math`C`} with ${math`B \ne ${0}`} and ${math`C \ne ${0}`}, ${math`\frac{AC}{BC} = \frac{A}{B}`}.` },
    { kind: 'p', text: t`The word that matters is factor: ${math`C`} must multiply the whole top and the whole bottom. So factorise first. ${cm(`(${poly([1, fx.p + fx.r, fx.p * fx.r])})/(${factor(fx.p)})`)} is ${cm(`((${factor(fx.p)})(${factor(fx.r)}))/(${factor(fx.p)})`)}, which is ${cm(factor(fx.r))} for ${math`x \ne ${-fx.p}`}.`, why: { q: t`Why exclude ${math`x = ${-fx.p}`}?`, a: t`There the bottom is ${0}, so the original fraction has no value at all, while ${cm(factor(fx.r))} does. The two agree everywhere else.` } },
    { kind: 'p', text: t`To add or subtract fractions, put them over a common denominator first: ${math`\frac{${1}}{x - ${1}} - \frac{${1}}{x + ${1}} = \frac{(x + ${1}) - (x - ${1})}{(x - ${1})(x + ${1})} = \frac{${2}}{(x - ${1})(x + ${1})}`}. Each fraction is multiplied top and bottom by the bracket it lacks.` },
    checkFrom(cancel, { p: -4, r: 6 }, t`The top factorises as ${cm(`(${factor(-4)})(${factor(6)})`)}; cancel the common factor ${cm(factor(-4))}.`),
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`${math`(x + y)^{${2}} = x^{${2}} + y^{${2}}`}.`, counterexample: t`At ${math`x = y = ${1}`} the left side is ${math`${2}^{${2}} = ${4}`} and the right side is ${2}. The cross terms ${math`${2}xy`} are missing.` },
    { kind: 'pitfall', claim: t`${math`\frac{x + ${10}}{x} = ${10}`}, cancelling the ${mx}.`, counterexample: t`At ${math`x = ${5}`} the left side is ${math`\frac{${15}}{${5}} = ${3}`}, not ${10}. ${mx} is a term of the top, not a factor of it, so it cannot cancel.` },
    { kind: 'pitfall', claim: t`Squaring both sides of an equation keeps exactly the same solutions.`, counterexample: t`${math`x = ${3}`} has one solution, but ${math`x^{${2}} = ${9}`} has two, ${3} and ${-3}. After squaring, check every answer in the original equation.` },
    { kind: 'takeaway', text: t`Every step must be a rule true for all numbers: distribute to expand, find factors to factorise, and cancel only common factors.` },
  ],
  examples: [
    worked(expand, { a: 3, b: -2, c: 1, d: 5 }, t`Expanding two brackets`),
    worked(factorise, { p: -3, r: 7 }, t`Factorising a quadratic`),
    { ...workedCambridge(a12Factor), examiner: t`The examiner looks for the factorisation taken all the way: the common factor ${math`n`} first, then the difference of two squares.` },
    { ...workedCambridge(a7Pair), examiner: t`The examiner looks for the pair found from the product and the sum, and the roots read off with the right signs.` },
  ],
  generators: [expand, factorise, cancel, collect, vieta, cubic],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['expression', 'coefficient', 'like-terms', 'identity', 'expand', 'factorise'],
  cambridge: withUses([a7Three, a12FracA, a12FracB, tmuaQ], {
    'a7-q2-v': { sections: ['Expressions and identities', 'Factorising'], note: t`Using an identity to pin down three integer roots` },
    'a12-q2-i-b': { sections: ['Algebraic fractions'], note: t`Multiplying and adding algebraic fractions and cancelling common factors` },
  }),
  // A7 Q2 and A12 Q2 need only this lesson. A7 Q2(i), (ii), and (iv) are written proofs, so they are set in
  // proof.direct, the first topic that teaches writing one (Rule 1, 2026-10-08). A7 Q3 needs polynomials: its
  // quartic is set in alg.polynomials, and its general part is the copy alg.roots-coefficients gates on.
  gate: ['a7-q2-v', 'a12-q2-i-b'],
  recall: [
    { front: t`What is the difference between an identity and an equation?`, back: t`An identity ${math`A \equiv B`} holds for every value of the letters; an equation ${math`A = B`} holds only for some, which you solve for.` },
    { front: t`Expand ${math`(a + b)(c + d)`}.`, back: t`${math`ac + ad + bc + bd`}: every term of one bracket times every term of the other.` },
    { front: t`The difference of two squares.`, back: t`${math`a^{${2}} - b^{${2}} \equiv (a - b)(a + b)`}.` },
    { front: t`How do you factorise ${math`x^{${2}} + bx + c`}?`, back: t`Find ${math`p`} and ${math`r`} with ${math`p + r = b`} and ${math`pr = c`}; then it is ${math`(x + p)(x + r)`}.` },
    { front: t`When may you cancel in a fraction?`, back: t`Only a factor common to the whole top and the whole bottom, and only where it is not zero.` },
  ],
  proofOrder: [
    {
      title: t`Expanding two brackets`,
      steps: [
        t`Treat ${math`a + b`} as one number and distribute: ${math`(a + b)c + (a + b)d`}.`,
        t`Distribute again: ${math`ac + bc + ad + bd`}.`,
        t`Reorder the terms: ${math`ac + ad + bc + bd`}.`,
      ],
    },
  ],
};
