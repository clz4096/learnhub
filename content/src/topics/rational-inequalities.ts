/**
 * ineq.rational: inequalities with fractions, such as x - 1/x >= 3/2, solved by
 * multiplying by a square (which is never negative) or by a sign diagram in which the
 * zeros of the denominator are critical values that never belong to the answer. Sources:
 * STEP Support Foundation Assignment 7 Q1(ii) and Assignment 18 Q2(iii), and STEP I 2001
 * Q2(i) (STEP Questions Database). Every solution
 * set is checked by the sign test (prep-a.ts, setWhere), which treats a zero denominator
 * as "undefined, so not a solution".
 */
import { cite, supervision } from '../cambridge';
import { add, div, int, mul, pick, q, sub, type Rational } from '../math';
import { generator } from '../problem';
import { computedMath, math, t } from '../rich';
import { checkFrom, workedCambridge, worked, type TopicContent } from '../topic';
import { closed, open, optionFor, realSetSpan, setChoice, setProblem, setWhere, withExaminer, type RealSet, type WrongSet } from '../prep-a';

type Op = '<' | '>' | '<=' | '>=';
const OP_TEX: Readonly<Record<Op, string>> = { '<': '<', '>': '>', '<=': '\\le', '>=': '\\ge' };
const holds = (v: Rational, op: Op): boolean => {
  const s = v.num === 0n ? 0 : v.num > 0n ? 1 : -1;
  return op === '<' ? s < 0 : op === '>' ? s > 0 : op === '<=' ? s <= 0 : s >= 0;
};
const flipOp = (op: Op): Op => ({ '<': '>', '>': '<', '<=': '>=', '>=': '<=' } as const)[op];
const isZero = (r: Rational): boolean => r.num === 0n;
const lin = (r: number): string => (r === 0 ? 'x' : `x ${r < 0 ? '+' : '-'} ${Math.abs(r)}`);

// ---------------------------------------------------------------- a quotient of linear factors

interface QuoP { a: number; b: number; op: Op }
/** (x - a)/(x - b) op 0: undefined at b. */
const quoTest = (p: QuoP, op: Op = p.op) => (x: Rational): boolean => !isZero(sub(x, q(p.b))) && holds(div(sub(x, q(p.a)), sub(x, q(p.b))), op);
const quoSet = (p: QuoP, op: Op = p.op): RealSet => setWhere(quoTest(p, op), [q(p.a), q(p.b)]);
function quoWrong(p: QuoP): WrongSet[] {
  // The slip: treat the quotient like the product (x - a)(x - b), which includes b when equality is allowed.
  const product = setWhere((x) => holds(mul(sub(x, q(p.a)), sub(x, q(p.b))), p.op), [q(p.a), q(p.b)]);
  return [
    { set: product, why: t`The fraction is undefined at ${math`x = ${p.b}`}, where the denominator is ${0}, so ${p.b} is never in the answer, even with ${math`\le`} or ${math`\ge`}.` },
    { set: quoSet(p, flipOp(p.op)), why: t`That is where the fraction has the other sign. A fraction is negative when the top and bottom have opposite signs.` },
    { set: quoSet(p, ({ '<': '<=', '>': '>=', '<=': '<', '>=': '>' } as const)[p.op]), why: t`At ${math`x = ${p.a}`} the fraction is ${0}: include it exactly when the inequality allows equality.` },
  ];
}

const quotientSign = generator<QuoP>({
  id: 'quotient-sign',
  skill: 'Solve (x - a)/(x - b) compared with 0 by a sign diagram, never including the zero of the denominator.',
  params: (rng) => {
    for (;;) {
      const p: QuoP = { a: int(rng, -6, 6), b: int(rng, -6, 6), op: pick(rng, ['<', '>', '<=', '>='] as const) };
      if (p.a !== p.b && p.a !== -p.b) return p;
    }
  },
  sane: (p) => (p.a !== p.b ? null : 'cancels'),
  problem: (p) => {
    const { answer } = setChoice(quoSet(p), quoWrong(p));
    return {
      prompt: t`Solve ${computedMath(`(${lin(p.a)})/(${lin(p.b)})`)}${math` ${OP_TEX[p.op]} ${0}`}.`,
      answer,
      solution: [
        t`The critical values are ${math`x = ${p.a}`}, where the top is ${0}, and ${math`x = ${p.b}`}, where the bottom is ${0} and the fraction is undefined.`,
        t`A quotient has the same sign as the product of its top and bottom, so the fraction is positive outside the critical values and negative between them.`,
        t`So the solution is ${realSetSpan(quoSet(p))}${p.op === '<=' || p.op === '>=' ? t`: ${math`x = ${p.a}`} is included, but ${math`x = ${p.b}`} never is` : t``}.`,
      ],
    };
  },
  solve: (p) => [optionFor(setChoice(quoSet(p), quoWrong(p)).ids, setWhere(quoTest(p), [q(p.a), q(p.b), q(-9), q(9)]))],
  misconceptions: (p) => setChoice(quoSet(p), quoWrong(p)).misconceptions,
});

// ---------------------------------------------------------------- a fraction against a number

interface FvP { k: number; b: number; c: number }
/** k/(x - b) > c with k, c > 0: (x - b)(c(x - b) - k) < 0, so b < x < b + k/c. */
const fvEnd = ({ k, b, c }: FvP): Rational => add(q(b), q(k, c));
const fvTest = (p: FvP) => (x: Rational): boolean => !isZero(sub(x, q(p.b))) && holds(sub(div(q(p.k), sub(x, q(p.b))), q(p.c)), '>');
const fvRight = (p: FvP): RealSet => [open(q(p.b), fvEnd(p))];
const fvWrong = (p: FvP): WrongSet[] => [
  { set: [open(null, fvEnd(p))], why: t`Multiplying by ${math`x - ${p.b}`} assumes it is positive. For ${math`x < ${p.b}`} the fraction is negative, so it cannot exceed ${p.c}. Multiply by the square ${math`(x - ${p.b})^{${2}}`} instead.` },
  { set: [open(null, q(p.b)), open(fvEnd(p), null)], why: t`That is where the fraction is less than ${p.c} (or undefined at ${p.b}).` },
  { set: [closed(q(p.b), fvEnd(p))], why: t`The fraction is undefined at ${math`x = ${p.b}`}, and equals ${p.c} at the other end, so both ends are out.` },
];

const fractionVsNumber = generator<FvP>({
  id: 'fraction-vs-number',
  skill: 'Solve k/(x - b) > c by multiplying both sides by the square (x - b)^2, which is positive.',
  params: (rng) => ({ k: int(rng, 1, 12), b: int(rng, -5, 5), c: pick(rng, [1, 2, 3, 4]) }),
  sane: (p) => (p.k > 0 && p.c > 0 ? null : 'out of range'),
  problem: (p) => {
    const { answer } = setChoice(fvRight(p), fvWrong(p));
    return {
      prompt: t`Solve ${computedMath(`${p.k}/(${lin(p.b)}) > ${p.c}`)}.`,
      answer,
      solution: [
        t`${math`x \ne ${p.b}`}. Multiply both sides by ${math`(x - (${p.b}))^{${2}}`}, which is positive, so the inequality keeps its direction: ${math`${p.k}(x - (${p.b})) > ${p.c}(x - (${p.b}))^{${2}}`}.`,
        t`Move everything to one side and factorise: ${math`(x - (${p.b}))\left(${p.c}(x - (${p.b})) - ${p.k}\right) < ${0}`}.`,
        t`An upward parabola in ${math`x`}, negative between its roots ${p.b} and ${fvEnd(p)}: so ${realSetSpan(fvRight(p))}.`,
      ],
    };
  },
  solve: (p) => [optionFor(setChoice(fvRight(p), fvWrong(p)).ids, setWhere(fvTest(p), [q(p.b), fvEnd(p)]))],
  misconceptions: (p) => setChoice(fvRight(p), fvWrong(p)).misconceptions,
});

// ---------------------------------------------------------------- x + m/x against n

interface XrP { r: number; s: number; op: Op }
/** x + rs/x op r + s, that is (x - r)(x - s)/x op 0. */
const xrTest = (p: XrP, op: Op = p.op) => (x: Rational): boolean => !isZero(x) && holds(sub(add(x, div(q(p.r * p.s), x)), q(p.r + p.s)), op);
const xrSet = (p: XrP, op: Op = p.op): RealSet => setWhere(xrTest(p, op), [q(0), q(p.r), q(p.s)]);
function xrWrong(p: XrP): WrongSet[] {
  const timesX = setWhere((x) => holds(sub(add(mul(x, x), q(p.r * p.s)), mul(q(p.r + p.s), x)), p.op), [q(p.r), q(p.s)]);
  return [
    { set: timesX, why: t`Multiplying by ${math`x`} keeps the direction only when ${math`x > ${0}`}. For negative ${math`x`} it reverses. Multiply by ${math`x^{${2}}`} or use a sign diagram with ${0} as a critical value.` },
    { set: xrSet(p, flipOp(p.op)), why: t`That is where the inequality fails. Test a point in each piece.` },
  ];
}

const xPlusReciprocal = generator<XrP>({
  id: 'x-plus-reciprocal',
  skill: 'Solve x + m/x compared with n by writing it as one fraction and using a sign diagram with 0 as a critical value.',
  params: (rng) => {
    for (;;) {
      const p: XrP = { r: pick(rng, [-4, -3, -2, -1, 1, 2, 3, 4, 5]), s: pick(rng, [-4, -3, -2, -1, 1, 2, 3, 4, 5]), op: pick(rng, ['<', '>', '<=', '>='] as const) };
      if (p.r !== p.s && p.r + p.s !== 0) return p;
    }
  },
  sane: (p) => (p.r !== 0 && p.s !== 0 ? null : 'root at 0'),
  problem: (p) => {
    const m = p.r * p.s;
    const n = p.r + p.s;
    const { answer } = setChoice(xrSet(p), xrWrong(p));
    return {
      prompt: t`Solve ${computedMath(`x + ${m}/x`.replace('+ -', '- '))}${math` ${OP_TEX[p.op]} ${n}`}.`,
      answer,
      solution: [
        t`Move everything to one side and use one fraction: ${math`\frac{x^{${2}} - (${n})x + (${m})}{x} = \frac{(x - (${p.r}))(x - (${p.s}))}{x} ${OP_TEX[p.op]} ${0}`}.`,
        t`The critical values are ${0} (where it is undefined), ${p.r}, and ${p.s}. Test the sign in each piece: the sign of the top times the sign of the bottom.`,
        t`So the solution is ${realSetSpan(xrSet(p))}, never including ${0}.`,
      ],
    };
  },
  solve: (p) => [optionFor(setChoice(xrSet(p), xrWrong(p)).ids, setWhere(xrTest(p), [q(0), q(p.r), q(p.s), q(-8), q(8)]))],
  misconceptions: (p) => setChoice(xrSet(p), xrWrong(p)).misconceptions,
});

// ---------------------------------------------------------------- Cambridge problems

const half = q(1, 2);
const a7b = setProblem({
  id: 'a7-q1-ii-b',
  source: cite('step-f07', 'Q1(ii)(b)'),
  title: t`${math`x - \frac{${1}}{x}`} against a number`,
  prompt: t`For what values of ${math`x`} is ${math`x - \frac{${1}}{x} \ge \frac{${3}}{${2}}`}?`,
  right: [{ lo: q(-1, 2), loIn: true, hi: q(0), hiIn: false }, closed(q(2), null)],
  wrong: [
    { set: [closed(null, q(-1, 2)), closed(q(2), null)], why: t`Multiplying by ${math`x`} assumes ${math`x > ${0}`}. For ${math`x < ${0}`} the inequality reverses, which is why the answer has a piece just left of ${0}.` },
    { set: [closed(q(-1, 2), q(0)), closed(q(2), null)], why: t`At ${math`x = ${0}`} the expression ${math`\frac{${1}}{x}`} is undefined, so ${0} is not a solution.` },
  ],
  solution: [
    t`Multiply by ${math`x^{${2}}`}, which is positive for ${math`x \ne ${0}`}: ${math`x^{${3}} - x \ge \frac{${3}}{${2}}x^{${2}}`}, that is ${math`${2}x^{${3}} - ${3}x^{${2}} - ${2}x \ge ${0}`}.`,
    t`Factorise: ${math`x(${2}x + ${1})(x - ${2}) \ge ${0}`}, with critical values ${math`-${half}`}, ${0}, ${2}. Signs from the right: plus, minus, plus, minus.`,
    t`So ${math`-${half} \le x < ${0}`} or ${math`x \ge ${2}`}; ${0} is excluded because the original expression is undefined there.`,
  ],
  test: (x) => !isZero(x) && holds(sub(sub(x, div(q(1), x)), q(3, 2)), '>='),
  critical: [q(-1, 2), q(0), q(2)],
});

const a7a = setProblem({
  id: 'a7-q1-ii-a',
  source: cite('step-f07', 'Q1(ii)(a)'),
  title: t`${math`x + \frac{${1}}{x}`} against ${2}`,
  prompt: t`For what values of ${math`x`} is ${math`x + \frac{${1}}{x} > ${2}`}?`,
  right: [open(q(0), q(1)), open(q(1), null)],
  wrong: [
    { set: [open(null, q(1)), open(q(1), null)], why: t`For ${math`x < ${0}`}, ${math`x + \frac{${1}}{x}`} is negative, so it cannot exceed ${2}. Multiplying by ${math`x`} without checking its sign loses this.` },
    { set: [open(q(1), null)], why: t`Values between ${0} and ${1} work too: at ${math`x = ${half}`}, ${math`${half} + ${2} = ${q(5, 2)} > ${2}`}.` },
  ],
  solution: [
    t`Multiply by ${math`x^{${2}} > ${0}`}: ${math`x^{${3}} + x > ${2}x^{${2}}`}, so ${math`x(x^{${2}} - ${2}x + ${1}) = x(x - ${1})^{${2}} > ${0}`}.`,
    t`${math`(x - ${1})^{${2}}`} is positive except at ${1}, where it is ${0}. So the product is positive exactly when ${math`x > ${0}`} and ${math`x \ne ${1}`}.`,
  ],
  test: (x) => !isZero(x) && holds(sub(add(x, div(q(1), x)), q(2)), '>'),
  critical: [q(0), q(1)],
});

const a18iii = supervision({
  id: 'a18-q2-iii',
  source: cite('step-f18', 'Q2(iii)'),
  title: t`Signs of a quotient`,
  prompt: t`If ${math`\frac{a}{b} > ${0}`}, what can be said about ${math`a`} and ${math`b`}? Let ${math`y = \frac{x}{x - ${1}}`}. If ${math`y > ${0}`} and ${math`x > ${0}`}, show that ${math`x > ${1}`}. If in addition ${math`y > x`}, show that ${math`x < ${2}`}. Do it without a sketch: the argument is a few lines.`,
  writeUp: 'proof',
  official: cite('step-f18-hints', 'Q2(iii)'),
});

// STEP I 2001 Q2(i) (STEP Questions Database): a rational inequality that becomes a cubic over x.
const DB01 = 'stepdb-01-s1' as const;

const db01q2 = supervision({
  id: 'step01-q2-i',
  source: cite(DB01, 'Q2(i)'),
  title: t`A quadratic against ${math`\frac{${2}}{x}`}`,
  prompt: t`Solve the inequality ${math`${1} + ${2}x - x^{${2}} > \frac{${2}}{x}`} ${math`(x \ne ${0})`}. Explain how you deal with the sign of ${math`x`}.`,
  writeUp: 'explanation',
});

const db01q2auto = setProblem({
  id: 'step01-q2-i-set',
  source: cite(DB01, 'Q2(i)'),
  title: t`Solve ${math`${1} + ${2}x - x^{${2}} > \frac{${2}}{x}`}`,
  prompt: t`For what values of ${math`x`} (with ${math`x \ne ${0}`}) is ${math`${1} + ${2}x - x^{${2}} > \frac{${2}}{x}`}?`,
  right: [open(q(-1), q(0)), open(q(1), q(2))],
  wrong: [
    { set: [open(null, q(-1)), open(q(0), q(1)), open(q(2), null)], why: t`That is where the left side is smaller. Check a point: at ${math`x = ${q(3, 2)}`}, ${math`${1} + ${3} - ${q(9, 4)} = ${q(7, 4)}`} and ${math`\frac{${2}}{x} = ${q(4, 3)}`}, so the inequality holds there.` },
    { set: [open(q(1), q(2))], why: t`Multiplying by ${math`x`} keeps the direction only for ${math`x > ${0}`}. Multiply by ${math`x^{${2}}`} instead, or take the cases: negative ${math`x`} between ${math`-${1}`} and ${0} work too.` },
  ],
  solution: [
    t`Multiply by ${math`x^{${2}} > ${0}`}, which keeps the direction: ${math`x^{${2}} + ${2}x^{${3}} - x^{${4}} > ${2}x`}, that is ${math`x(x^{${3}} - ${2}x^{${2}} - x + ${2}) < ${0}`}.`,
    t`Group the cubic: ${math`x^{${2}}(x - ${2}) - (x - ${2}) = (x - ${2})(x - ${1})(x + ${1})`}. So we need ${math`x(x + ${1})(x - ${1})(x - ${2}) < ${0}`}.`,
    t`The critical values are ${math`-${1}, ${0}, ${1}, ${2}`}. For large ${math`x`} the product is positive, and it changes sign at each simple root: negative on ${math`(${1}, ${2})`}, positive on ${math`(${0}, ${1})`}, negative on ${math`(-${1}, ${0})`}, positive below ${math`-${1}`}.`,
    t`So ${math`-${1} < x < ${0}`} or ${math`${1} < x < ${2}`}.`,
  ],
  test: (x) => x.num !== 0n && sub(add(q(1), sub(mul(q(2), x), mul(x, x))), div(q(2), x)).num > 0n,
  critical: [q(-1), q(0), q(1), q(2)],
});

// ---------------------------------------------------------------- lesson

export const rationalInequalities: TopicContent = {
  topicId: 'ineq.rational',
  goal: t`Solve inequalities such as ${math`x - \frac{${1}}{x} \ge \frac{${3}}{${2}}`} by multiplying by a square or by splitting into sign cases.`,
  objective: t`Solve inequalities with fractions without losing the cases where the denominator is negative.`,
  why: t`The commonest lost marks in STEP inequalities come from multiplying by ${math`x`}.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`The idea` },
    { kind: 'hook', text: t`Solve ${math`x + \frac{${1}}{x} > ${2}`}. Multiply by ${math`x`}: ${math`x^{${2}} + ${1} > ${2}x`}, so ${math`(x - ${1})^{${2}} > ${0}`}, true for every ${math`x \ne ${1}`}. But try ${math`x = -${1}`}: ${math`-${1} - ${1} = -${2}`}, which is not more than ${2}. Something went wrong in the first step.` },
    { kind: 'narrative', text: t`Multiplying an inequality by ${math`x`} keeps its direction only when ${math`x`} is positive. When ${math`x`} could be negative, that one innocent step changes the answer. This lesson gives two safe methods.` },
    { kind: 'section', title: t`Multiply by a square` },
    {
      kind: 'definition',
      name: t`Rational inequality`,
      formal: t`A [[rational-inequality|rational inequality]] compares ${math`\frac{P(x)}{Q(x)}`} with ${0} (or with another such expression), where ${math`P`} and ${math`Q`} are polynomials. Its solution set excludes every ${math`x`} with ${math`Q(x) = ${0}`}.`,
      plain: t`An inequality with ${math`x`} in a denominator. In ${math`\frac{x - ${2}}{x + ${1}} > ${0}`}, the value ${math`x = -${1}`} is never allowed.`,
    },
    { kind: 'theorem', name: t`Multiplying by a square`, statement: t`If ${math`Q(x) \ne ${0}`}, then ${math`\frac{P(x)}{Q(x)} > c`} if and only if ${math`P(x)Q(x) > cQ(x)^{${2}}`}. The same holds with ${math`\ge`}, ${math`<`}, or ${math`\le`} in both places.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`The square is positive`, text: t`${math`Q(x) \ne ${0}`}, so ${math`Q(x)^{${2}} > ${0}`}.` },
        { label: t`Multiply`, text: t`Multiplying both sides by a positive number keeps the inequality: ${math`\frac{P(x)}{Q(x)}Q(x)^{${2}} > cQ(x)^{${2}}`}.` },
        { label: t`Simplify`, text: t`${math`\frac{P(x)}{Q(x)}Q(x)^{${2}} = P(x)Q(x)`}. Dividing by the positive ${math`Q(x)^{${2}}`} reverses the step, so the two inequalities are equivalent.` },
      ],
    },
    { kind: 'narrative', text: t`Applied to the hook: multiply ${math`x + \frac{${1}}{x} > ${2}`} by ${math`x^{${2}}`}: ${math`x^{${3}} + x > ${2}x^{${2}}`}, so ${math`x(x - ${1})^{${2}} > ${0}`}. That needs ${math`x > ${0}`} and ${math`x \ne ${1}`}: the negative numbers are rightly excluded.` },
    checkFrom(fractionVsNumber, { k: 6, b: 1, c: 2 }, t`Multiply by ${math`(x - ${1})^{${2}}`}: ${math`(x - ${1})(${2}x - ${8}) < ${0}`}, so ${math`${1} < x < ${4}`}.`),
    { kind: 'section', title: t`Sign diagrams with a denominator` },
    { kind: 'narrative', text: t`The second method: put everything over one denominator and compare with ${0}. Then the critical values are the zeros of the top and of the bottom. The sign of ${math`\frac{P}{Q}`} is the sign of ${math`PQ`}, so the sign diagram works as before, with one difference: zeros of the bottom are never in the answer, because there the expression does not exist.` },
    checkFrom(quotientSign, { a: 3, b: -1, op: '<=' }, t`Negative between ${math`-${1}`} and ${3}; ${0} at ${3}, which is allowed; undefined at ${math`-${1}`}. So ${math`-${1} < x \le ${3}`}.`),
    { kind: 'pitfall', claim: t`${math`\frac{x - ${3}}{x + ${1}} \le ${0}`} has the same solutions as ${math`(x - ${3})(x + ${1}) \le ${0}`}.`, counterexample: t`${math`x = -${1}`} satisfies the product inequality (it gives ${0}), but the fraction is undefined there. The answers differ by exactly that point.` },
    { kind: 'pitfall', claim: t`${math`\frac{${1}}{x} < ${2}`} means ${math`${1} < ${2}x`}, so ${math`x > ${half}`}.`, counterexample: t`${math`x = -${1}`}: ${math`\frac{${1}}{-${1}} = -${1} < ${2}`}, yet ${math`-${1} < ${half}`}. The full answer is ${math`x < ${0}`} or ${math`x > ${half}`}.` },
    { kind: 'takeaway', text: t`Never multiply an inequality by something whose sign you do not know: multiply by its square, or use a sign diagram that marks where the denominator is ${0}.` },
  ],
  examples: [
    withExaminer(workedCambridge(a7b), t`Multiplication by a square (or a careful split into ${math`x > ${0}`} and ${math`x < ${0}`}), the full factorisation, and ${0} explicitly excluded.`),
    worked(xPlusReciprocal, { r: 1, s: 3, op: '>' }, t`One fraction, then a sign diagram`),
    worked(quotientSign, { a: -2, b: 4, op: '>' }, t`A quotient of two linear factors`),
  ],
  generators: [quotientSign, fractionVsNumber, xPlusReciprocal],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['rational-inequality'],
  cambridge: [db01q2, db01q2auto, a7a, a18iii],
  // Best first: STEP I 2001 Q2(i), then Assignment 18 Q2(iii), then 2001 Q2(i) auto-checked.
  gate: ['step01-q2-i', 'a18-q2-iii', 'step01-q2-i-set'],
  recall: [
    { front: t`Why multiply a rational inequality by ${math`Q(x)^{${2}}`} rather than ${math`Q(x)`}?`, back: t`${math`Q(x)^{${2}}`} is positive wherever the inequality makes sense, so the direction is kept.` },
    { front: t`Which critical values never belong to the answer?`, back: t`The zeros of the denominator, where the expression is undefined.` },
  ],
  proofOrder: [{
    title: t`Multiplying by a square keeps the inequality`,
    steps: [
      t`Where ${math`Q(x) \ne ${0}`}, ${math`Q(x)^{${2}} > ${0}`}.`,
      t`Multiply both sides of ${math`\frac{P}{Q} > c`} by ${math`Q^{${2}}`}: the direction is kept.`,
      t`The left side simplifies to ${math`PQ`}, giving ${math`PQ > cQ^{${2}}`}.`,
      t`Dividing by ${math`Q^{${2}} > ${0}`} undoes it, so the two are equivalent.`,
    ],
  }],
};
