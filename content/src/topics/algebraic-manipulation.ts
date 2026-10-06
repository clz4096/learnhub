/**
 * pre.algebraic-manipulation: Expanding, factorising, and simplifying. From STEP Support
 * Assignment 7 Q2 and Q3 (identity versus equation; roots and coefficients by expanding and
 * substituting), Assignment 12 Q1(ii) and Q2(i) (factorising a cubic; algebraic fractions),
 * and TMUA Exercise Q (squaring both sides can add a false root).
 */
import type { Rational } from '@learnhub/mastery';
import { auto, cite, same, supervision } from '../cambridge';
import { add, div, int, mul, pick, q, sample, str, sub } from '../math';
import { factor, poly, signed, times } from '../poly';
import { generator, type Misconception } from '../problem';
import { computedMath as cm, dmath, ident, listOf, math, paren, t } from '../rich';
import { worked, workedCambridge, type TopicContent } from '../topic';

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
const a7Quartic = [1, 22, 172, 552, 576];

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
  solution: [
    t`Substitute ${math`x = -${1}`}: ${math`(${1} + \alpha)(${1} + \beta)(${1} + \gamma) = ${1} - b + c - d = -${15}`}, so ${math`${1} + \alpha`} is one of ${listOf([-15, -5, -3, -1, 1, 3, 5, 15])}, and ${math`\alpha`} is one of ${listOf([-16, -6, -4, -2, 0, 2, 4, 14])}.`,
    t`Substitute ${math`x = ${0}`}: ${math`\alpha\beta\gamma = -d = -${16}`}, which rules out ${0}, ${-6}, and ${14}. Substituting ${math`x = ${1}`} gives ${math`(${1} - \alpha)(${1} - \beta)(${1} - \gamma) = ${9}`}, which leaves ${listOf([-2, 2, 4])}.`,
    t`So ${math`\alpha = -${2}`}, ${math`\beta = ${2}`}, ${math`\gamma = ${4}`}. Check: ${cm([-2, 2, 4].map((r) => `(${factor(-r)})`).join(''))} expands to ${cm(poly(a7Cubic))}.`,
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

const a7Quart = auto({
  id: 'a7-q3',
  source: cite(A7, 'Q3, final part (2002 STEP I Q5)'),
  title: t`The roots of a quartic`,
  prompt: t`Find the roots of the equation ${math`${cm(poly(a7Quartic))} = ${0}`}, given that they are all integers. List all four, repeating a repeated root.`,
  answer: { kind: 'witness', count: 4, unordered: true, example: '-2, -6, -6, -8', check: (v) => rootsOf(a7Quartic, v) },
  solution: [
    t`Let the roots be ${math`-k_{${1}}, -k_{${2}}, -k_{${3}}, -k_{${4}}`}. Substituting ${math`x = ${0}`}, ${math`x = ${1}`}, and ${math`x = -${1}`} gives ${math`k_{${1}}k_{${2}}k_{${3}}k_{${4}} = ${576}`}, ${math`\prod (k_i + ${1}) = ${1 + 22 + 172 + 552 + 576}`}, and ${math`\prod (k_i - ${1}) = ${1 - 22 + 172 - 552 + 576}`}.`,
    t`Start from ${math`${175} = ${5} \times ${5} \times ${7}`}, the product with the fewest factors: it limits each ${math`k_i - ${1}`} to a divisor of ${175}. The other two products then leave ${math`k_i`} equal to ${listOf([2, 6, 6, 8])}.`,
    t`The roots are the negatives: ${listOf([-2, -6, -6, -8])}. As the hints stress, not ${listOf([2, 6, 6, 8])}. Check: ${cm(`(${factor(2)})(${factor(6)})^${2}(${factor(8)})`)} expands to the quartic.`,
  ],
  reference: '-8, -6, -6, -2',
  verify: () => same('A7 Q3 by expanding', fromRoots([-2, -6, -6, -8]).join(), a7Quartic.join()),
  misconceptions: [
    { response: '2, 6, 6, 8', why: t`Those are the ${math`k_i`} values. The roots are ${math`-k_i`}, because the factors are ${math`(x + k_i)`}.` },
  ],
  official: { source: cite('step-f07-hints', 'Q3'), answer: '-2, -6, -6, -8', agrees: true },
});

const a12FracA = auto({
  id: 'a12-q2-i-a',
  source: cite('step-f12', 'Q2(i)(a)'),
  title: t`Two algebraic fractions`,
  prompt: t`Express as a single fraction: ${math`\frac{${1}}{(x - ${1})(x + ${2})} - \frac{${1}}{(x + ${1})(x + ${2})}`}.`,
  answer: { kind: 'expression', expected: '2/((x - 1)(x + 1)(x + 2))', variables: ['x'] },
  solution: [
    t`The lowest common denominator is ${math`(x - ${1})(x + ${1})(x + ${2})`}: each fraction is missing one bracket.`,
    t`So the difference is ${math`\frac{(x + ${1}) - (x - ${1})}{(x - ${1})(x + ${1})(x + ${2})}`}, and the top is ${2}.`,
    t`The answer is ${math`\frac{${2}}{(x - ${1})(x + ${1})(x + ${2})}`}.`,
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
  solution: [
    t`Cancel the ${math`m`} in the second product first: it is ${math`\frac{${2}(m - ${1})}{(m + ${2})(m + ${1})}`}.`,
    t`Both terms now have denominator ${math`(m + ${2})(m + ${1})`}, so the sum is ${math`\frac{m(m - ${1}) + ${2}(m - ${1})}{(m + ${2})(m + ${1})} = \frac{(m + ${2})(m - ${1})}{(m + ${2})(m + ${1})}`}.`,
    t`Cancel ${math`m + ${2}`}: the answer is ${math`\frac{m - ${1}}{m + ${1}}`}. (It reappears in the raffle question of the same assignment.)`,
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
  solution: [
    t`Square both sides: ${math`(${2}x + ${3}) + (x + ${1}) + ${2}\sqrt{(${2}x + ${3})(x + ${1})} = ${7}x + ${4}`}, so ${math`\sqrt{(${2}x + ${3})(x + ${1})} = ${2}x`}.`,
    t`Square again: ${math`${2}x^{${2}} + ${5}x + ${3} = ${4}x^{${2}}`}, so ${math`${2}x^{${2}} - ${5}x - ${3} = ${0}`}, which is ${math`(${2}x + ${1})(x - ${3}) = ${0}`}: ${math`x = ${3}`} or ${math`x = ${q(-1, 2)}`}.`,
    t`Squaring can add false roots, so check both in the original. At ${math`x = ${q(-1, 2)}`}, the step ${math`\sqrt{\cdots} = ${2}x`} would make a square root negative: reject it. At ${math`x = ${3}`}: ${math`\sqrt{${9}} + \sqrt{${4}} = ${5} = \sqrt{${25}}`}. The only solution is ${math`x = ${3}`}.`,
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

const a7Show = supervision({
  id: 'a7-q2-i-ii',
  source: cite(A7, 'Q2(i) and (ii)'),
  title: t`Roots and coefficients without the formula`,
  prompt: t`Forget the quadratic formula. Show that if ${math`\alpha \ne \beta`} both satisfy ${math`x^{${2}} + bx + c = ${0}`}, then ${math`b = -(\alpha + \beta)`}, find ${math`c`} in terms of ${math`\alpha`} and ${math`\beta`}, and hence show that ${math`(x - \alpha)(x - \beta) \equiv x^{${2}} + bx + c`}. Then, starting from the identity instead, substitute ${math`x = ${0}`} and ${math`x = ${1}`} to find ${math`\alpha\beta`} and ${math`\alpha + \beta`}.`,
  writeUp: 'proof',
  official: cite('step-f07-hints', 'Q2(i), (ii)'),
});
const a7ShowCubic = supervision({
  id: 'a7-q2-iv',
  source: cite(A7, 'Q2(iv)'),
  title: t`Three substitutions`,
  prompt: t`It is given that ${math`x^{${3}} + bx^{${2}} + cx + d \equiv (x - \alpha)(x - \beta)(x - \gamma)`}. By substituting three different values of ${math`x`}, show that ${math`\alpha\beta\gamma = -d`}, ${math`(${1} - \alpha)(${1} - \beta)(${1} - \gamma) = ${1} + b + c + d`}, and ${math`(${1} + \alpha)(${1} + \beta)(${1} + \gamma) = ${1} - b + c - d`}.`,
  writeUp: 'proof',
  official: cite('step-f07-hints', 'Q2(iv)'),
});
const a7ShowGeneral = supervision({
  id: 'a7-q3-show',
  source: cite(A7, 'Q3, first part (2002 STEP I Q5)'),
  title: t`The general polynomial`,
  prompt: t`Let ${math`f(x) = x^n + a_{${1}}x^{n - ${1}} + \cdots + a_n`}, and suppose ${math`f(x) = (x + k_{${1}})(x + k_{${2}}) \cdots (x + k_n)`}. By considering ${math`f(${0})`}, show that ${math`k_{${1}}k_{${2}} \cdots k_n = a_n`}. Show also that ${math`(k_{${1}} + ${1})(k_{${2}} + ${1}) \cdots (k_n + ${1}) = ${1} + a_{${1}} + a_{${2}} + \cdots + a_n`}, and give the corresponding result for ${math`(k_{${1}} - ${1})(k_{${2}} - ${1}) \cdots (k_n - ${1})`}.`,
  writeUp: 'proof',
  official: cite('step-f07-hints', 'Q3'),
});

// ---------------------------------------------------------------- lesson

const ex = { a: 2, b: 3, c: 1, d: -4 };
const exOut = times([ex.a, ex.b], [ex.c, ex.d]);
const fx = { p: 2, r: 5 };

export const algebraicManipulation: TopicContent = {
  topicId: 'pre.algebraic-manipulation',
  goal: t`Expand brackets, factorise quadratics, collect like terms, and cancel algebraic fractions.`,
  lesson: [
    { kind: 'p', text: t`An [[expression|expression]] combines numbers and letters, such as ${cm(`${poly([3, 0])} + ${term(2, 'y')}`)}. A number multiplying a letter is its [[coefficient|coefficient]]: in ${cm(poly([3, 0]))} the coefficient of ${mx} is ${3}.` },
    { kind: 'p', text: t`[[like-terms|Like terms]] have exactly the same letters and powers. Only like terms combine: ${cm(`${term(5, 'x')} + ${term(2, 'x')}`)} is ${cm(poly([5 + 2, 0]))}, but ${cm(`${term(5, 'x')} + ${term(2, 'y')}`)} stays as it is.` },
    { kind: 'p', text: t`An equation holds for some values of the letters; an [[identity|identity]] holds for every value, and is written with ${math`\equiv`}. STEP Support Assignment ${7} puts it this way: ${math`${3}x + ${3} \equiv ${3}(x + ${1})`} for every ${mx}, while ${math`${3}x + ${3} = ${6}`} holds only when ${math`x = ${1}`}. Expanding and factorising turn an expression into another one that is identical to it.` },
    { kind: 'rule', text: t`To [[expand|expand]] a product of brackets, multiply every term of one bracket by every term of the other, then collect like terms.` },
    { kind: 'p', text: t`For ${cm(`(${lin(ex.a, ex.b)})(${lin(ex.c, ex.d)})`)} the four products are ${cm(poly([ex.a * ex.c, 0, 0]))}, ${cm(poly([ex.a * ex.d, 0]))}, ${cm(poly([ex.b * ex.c, 0]))}, and ${ex.b * ex.d}. Collected, that is ${cm(poly(exOut))}.` },
    { kind: 'p', text: t`A general check that the rule is right: ${ident('(a + b)(c + d)', 'ac + ad + bc + bd', ['a', 'b', 'c', 'd'])}.` },
    { kind: 'rule', text: t`To [[factorise|factorise]] ${math`x^{${2}} + bx + c`}, find two numbers ${math`p`} and ${math`r`} that multiply to ${math`c`} and add to ${math`b`}. Then ${dmath`x^{${2}} + bx + c = (x + p)(x + r).`}` },
    { kind: 'p', text: t`For ${cm(poly([1, fx.p + fx.r, fx.p * fx.r]))}: ${math`${fx.p} \times ${fx.r} = ${fx.p * fx.r}`} and ${math`${fx.p} + ${fx.r} = ${fx.p + fx.r}`}, so it is ${cm(`(${factor(fx.p)})(${factor(fx.r)})`)}. Expanding gives it back, which is always a good check.` },
    { kind: 'p', text: t`An identity can be used by substituting values. If ${math`x^{${2}} + bx + c \equiv (x - \alpha)(x - \beta)`}, then ${math`x = ${0}`} gives ${math`c = \alpha\beta`}, and expanding gives ${math`b = -(\alpha + \beta)`}. So ${math`x^{${2}} - ${7}x + ${10}`} has roots that multiply to ${10} and add to ${7}: ${2} and ${5}. Choosing values that make most brackets vanish (often ${0}, ${1}, and ${-1}) is the trick of the STEP question in the same assignment.` },
    { kind: 'p', text: t`An algebraic fraction simplifies by cancelling a common factor of top and bottom, never a single term. Factorise first: ${cm(`(${poly([1, fx.p + fx.r, fx.p * fx.r])})/(${factor(fx.p)})`)} is ${cm(factor(fx.r))}, but in ${cm(`(x + ${fx.p * fx.r})/x`)} the ${mx} cannot cancel, because ${mx} is a term of the top, not a factor.` },
  ],
  examples: [
    worked(expand, { a: 3, b: -2, c: 1, d: 5 }, t`Expanding two brackets`),
    worked(factorise, { p: -3, r: 7 }, t`Factorising a quadratic`),
    workedCambridge(a12Factor),
    workedCambridge(a7Pair),
  ],
  generators: [expand, factorise, cancel, collect, vieta, cubic],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['expression', 'coefficient', 'like-terms', 'identity', 'expand', 'factorise'],
  cambridge: [a7Three, a7Quart, a12FracA, a12FracB, tmuaQ, a7Show, a7ShowCubic, a7ShowGeneral],
  gate: ['a7-q2-v', 'a7-q3', 'a12-q2-i-a', 'a12-q2-i-b', 'a7-q2-i-ii', 'a7-q2-iv', 'a7-q3-show'],
};

