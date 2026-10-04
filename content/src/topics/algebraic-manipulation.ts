/** pre.algebraic-manipulation: Expanding, factorising, and simplifying. */
import { int } from '../math';
import { factor, poly, signed, times } from '../poly';
import { generator, type Misconception } from '../problem';
import { computedMath as cm, ident, math, paren, t } from '../rich';
import { worked, type TopicContent } from '../topic';

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
        t`Collect the two x terms: ${cm(`${poly([a * d, 0])} ${b * c < 0 ? '-' : '+'} ${term(Math.abs(b * c), 'x')} = ${poly([a * d + b * c, 0])}`)}.`,
        t`So the expansion is ${cm(poly(out))}.`,
      ],
    };
  },
  solve: ({ a, b, c, d }) => poly(times([a, b], [c, d])),
  misconceptions: ({ a, b, c, d }): Misconception[] => [
    { response: poly([a * c, 0, b * d]), why: t`The x terms are missing. Each term of the first bracket multiplies each term of the second, so there are two middle products, ${cm(poly([a * d, 0]))} and ${cm(poly([b * c, 0]))}.` },
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
        t`They are ${p} and ${r}: ${p} * ${paren(r)} = ${c} and ${p} + ${paren(r)} = ${b}.`,
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
    { response: `(${factor(-p)})(${factor(-r)})`, why: t`The signs are flipped. Expanding your brackets gives the x term with the opposite sign. The numbers in the brackets must add to the x coefficient, ${p + r}.` },
    { response: `(${factor(p + r)})(${factor(1)})`, why: t`Your numbers add to ${p + r + 1}, not ${p + r}, and multiply to ${p + r}, not ${p * r}. Find two numbers that multiply to the constant term and add to the x coefficient.` },
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
        t`The top and bottom share the factor ${cm(factor(p))}. Cancel it (for x not equal to ${-p}, where the bottom is zero).`,
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
        t`[[like-terms|Like terms]] have the same letters, so the x terms combine with each other and the y terms with each other.`,
        t`The x terms: ${cm(`${a}x - ${term(c, 'x')} = ${term(a - c, 'x')}`)}. The minus sign belongs to the term after it.`,
        t`The y terms: ${cm(`${term(b, 'y')} + ${term(d, 'y')} = ${term(b + d, 'y')}`)}.`,
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
    { response: `${a - c + b + d}xy`, why: t`x terms and y terms are not like terms, so they cannot be added together. Keep one x term and one y term.` },
  ],
});

// ---------------------------------------------------------------- lesson

const ex = { a: 2, b: 3, c: 1, d: -4 };
const exOut = times([ex.a, ex.b], [ex.c, ex.d]);
const fx = { p: 2, r: 5 };

export const algebraicManipulation: TopicContent = {
  topicId: 'pre.algebraic-manipulation',
  goal: t`Expand brackets, factorise quadratics, collect like terms, and cancel algebraic fractions.`,
  lesson: [
    { kind: 'p', text: t`An [[expression|expression]] combines numbers and letters, such as ${cm(`${poly([3, 0])} + ${term(2, 'y')}`)}. A number multiplying a letter is its [[coefficient|coefficient]]: in ${cm(poly([3, 0]))} the coefficient of x is ${3}.` },
    { kind: 'p', text: t`[[like-terms|Like terms]] have exactly the same letters and powers. Only like terms combine: ${cm(`${term(5, 'x')} + ${term(2, 'x')}`)} is ${cm(poly([5 + 2, 0]))}, but ${cm(`${term(5, 'x')} + ${term(2, 'y')}`)} stays as it is.` },
    { kind: 'rule', text: t`To [[expand|expand]] a product of brackets, multiply every term of one bracket by every term of the other, then collect like terms.` },
    { kind: 'p', text: t`For ${cm(`(${lin(ex.a, ex.b)})(${lin(ex.c, ex.d)})`)} the four products are ${cm(poly([ex.a * ex.c, 0, 0]))}, ${cm(poly([ex.a * ex.d, 0]))}, ${cm(poly([ex.b * ex.c, 0]))}, and ${ex.b * ex.d}. Collected, that is ${cm(poly(exOut))}.` },
    { kind: 'p', text: t`A general check that the rule is right: ${ident('(a + b)(c + d)', 'ac + ad + bc + bd', ['a', 'b', 'c', 'd'])}.` },
    { kind: 'rule', text: t`To [[factorise|factorise]] ${math`x^${2} + bx + c`}, find two numbers that multiply to c and add to b. Then ${math`x^${2} + bx + c = (x + p)(x + r)`} with those numbers p and r.` },
    { kind: 'p', text: t`For ${cm(poly([1, fx.p + fx.r, fx.p * fx.r]))}: ${fx.p} * ${fx.r} = ${fx.p * fx.r} and ${fx.p} + ${fx.r} = ${fx.p + fx.r}, so it is ${cm(`(${factor(fx.p)})(${factor(fx.r)})`)}. Expanding gives it back, which is always a good check.` },
    { kind: 'p', text: t`An algebraic fraction simplifies by cancelling a common factor of top and bottom, never a single term. Factorise first: ${cm(`(${poly([1, fx.p + fx.r, fx.p * fx.r])})/(${factor(fx.p)})`)} is ${cm(factor(fx.r))}, but in ${cm(`(x + ${fx.p * fx.r})/x`)} the x cannot cancel, because x is a term of the top, not a factor.` },
  ],
  examples: [
    worked(expand, { a: 3, b: -2, c: 1, d: 5 }, t`Expanding two brackets`),
    worked(factorise, { p: -3, r: 7 }, t`Factorising a quadratic`),
    worked(cancel, { p: 4, r: -1 }, t`Cancelling a common factor`),
  ],
  generators: [expand, factorise, cancel, collect],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['expression', 'coefficient', 'like-terms', 'expand', 'factorise'],
};

