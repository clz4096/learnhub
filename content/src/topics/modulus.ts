/**
 * fn.modulus: the modulus |x|; solve equations such as |2x| + |x - 1| = 3 by splitting at
 * the critical values, solve |x - a| < b, and sketch y = |f(x)|. Sources: STEP Support
 * Foundation Assignment 21 Q2(i) to (iii) and Assignment 5 Q2(iii), the NST Maths Workbook
 * FC1, and STEP Support STEP 2 Equations and Inequalities Q1(iii), the gate in place of
 * Q2(ii), whose equation the worked example solves. Every solution set is found again by the sign test or by testing every
 * candidate in the original equation.
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { add, int, mul, pick, q, str, sub, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { math, t } from '../rich';
import { checkFrom, workedCambridge, worked, type TopicContent } from '../topic';
import { asList, closed, distinctFrom, open, optionFor, realSetSpan, setAnswer, setChoice, setKey, setWhere, withExaminer, type RealSet, type WrongSet } from '../prep-a';

const absR = (r: Rational): Rational => (r.num < 0n ? mul(q(-1), r) : r);
const sgn = (n: number): string => (n < 0 ? '-' : '+');

// ---------------------------------------------------------------- |ax + b| = c

interface EqP { a: number; b: number; c: number }
const eqAns = ({ a, b, c }: EqP): Rational[] => [q(c - b, a), q(-c - b, a)];

const absEquation = generator<EqP>({
  id: 'abs-equation',
  skill: 'Solve |ax + b| = c by solving ax + b = c and ax + b = -c.',
  quick: true,
  params: (rng) => {
    for (;;) {
      const p: EqP = { a: pick(rng, [1, 2, 3, 4, 5]), b: int(rng, -9, 9), c: int(rng, 1, 12) };
      if (p.b === 0) continue;
      const right = setKey(eqAns(p));
      if (distinctFrom(right, [setKey([q(p.c - p.b, p.a), q(p.c + p.b, p.a)]), setKey([q(p.c + p.b, p.a), q(-p.c + p.b, p.a)])]) >= 2) return p;
    }
  },
  sane: (p) => (p.c > 0 ? null : 'no solutions'),
  problem: (p) => {
    const [x1, x2] = eqAns(p) as [Rational, Rational];
    return {
      prompt: t`Solve ${math`|${p.a === 1 ? '' : p.a}x ${sgn(p.b)} ${Math.abs(p.b)}| = ${p.c}`}. Give both solutions.`,
      answer: setAnswer([x1, x2], 'Solve the inside equal to c and equal to -c.'),
      solution: [
        t`${math`|y| = ${p.c}`} means ${math`y = ${p.c}`} or ${math`y = -${p.c}`}.`,
        t`${math`${p.a}x ${sgn(p.b)} ${Math.abs(p.b)} = ${p.c}`} gives ${math`x = ${x1}`}; ${math`${p.a}x ${sgn(p.b)} ${Math.abs(p.b)} = -${p.c}`} gives ${math`x = ${x2}`}.`,
      ],
    };
  },
  solve: (p) => {
    // Test candidates on a fine rational grid.
    const out: Rational[] = [];
    for (let j = -300; j <= 300; j++) { const x = q(j, p.a); const v = add(mul(q(p.a), x), q(p.b)); if (str(absR(v)) === String(p.c)) out.push(x); }
    return asList(out);
  },
  misconceptions: (p): Misconception[] => [
    { response: asList([q(p.c - p.b, p.a), q(p.c + p.b, p.a)]), why: t`For the second case set the whole inside equal to ${math`-${p.c}`}: ${math`${p.a}x ${sgn(p.b)} ${Math.abs(p.b)} = -${p.c}`}.` },
    { response: asList([q(p.c + p.b, p.a), q(-p.c + p.b, p.a)]), why: t`Moving ${math`${p.b}`} across changes its sign: subtract it from both sides.` },
  ],
});

// ---------------------------------------------------------------- |x - a| < b

type Op = '<' | '<=' | '>' | '>=';
interface InP { a: number; b: number; op: Op }
const OPT: Readonly<Record<Op, string>> = { '<': '<', '<=': '\\le', '>': '>', '>=': '\\ge' };
const inTest = (p: InP) => (x: Rational): boolean => {
  const d = sub(absR(sub(x, q(p.a))), q(p.b));
  const s = d.num === 0n ? 0 : d.num > 0n ? 1 : -1;
  return p.op === '<' ? s < 0 : p.op === '<=' ? s <= 0 : p.op === '>' ? s > 0 : s >= 0;
};
const inSet = (p: InP): RealSet => setWhere(inTest(p), [q(p.a - p.b), q(p.a + p.b)]);
const inWrong = (p: InP): WrongSet[] => {
  const lo = q(p.a - p.b);
  const hi = q(p.a + p.b);
  const strict = p.op === '<' || p.op === '>';
  const inside = p.op === '<' || p.op === '<=';
  return [
    { set: inside ? (strict ? [open(null, lo), open(hi, null)] : [closed(null, lo), closed(hi, null)]) : [strict ? open(lo, hi) : closed(lo, hi)], why: t`${math`|x - a|`} is the distance from ${math`x`} to ${math`a`}. "${inside ? 'Less' : 'More'} than ${p.b}" means ${inside ? 'within' : 'beyond'} ${p.b} of ${p.a}.` },
    { set: inside ? [strict ? open(q(-p.a - p.b), q(-p.a + p.b)) : closed(q(-p.a - p.b), q(-p.a + p.b))] : (strict ? [open(null, q(-p.a - p.b)), open(q(-p.a + p.b), null)] : [closed(null, q(-p.a - p.b)), closed(q(-p.a + p.b), null)]), why: t`${math`|x - ${p.a}|`} measures the distance from ${p.a}, not from ${math`-${p.a}`}.` },
    { set: inside ? [strict ? closed(lo, hi) : open(lo, hi)] : (strict ? [closed(null, lo), closed(hi, null)] : [open(null, lo), open(hi, null)]), why: t`At the ends the distance is exactly ${p.b}: include them only when the inequality allows equality.` },
  ];
};

const absInequality = generator<InP>({
  id: 'abs-inequality',
  skill: 'Solve |x - a| compared with b by reading |x - a| as the distance from x to a.',
  params: (rng) => ({ a: pick(rng, [-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6]), b: int(rng, 1, 7), op: pick(rng, ['<', '<=', '>', '>='] as const) }),
  sane: (p) => (p.b > 0 && p.a !== 0 ? null : 'degenerate'),
  problem: (p) => ({
    prompt: t`Solve ${math`|x ${sgn(-p.a)} ${Math.abs(p.a)}| ${OPT[p.op]} ${p.b}`}.`,
    answer: setChoice(inSet(p), inWrong(p)).answer,
    solution: [
      t`${math`|x - (${p.a})|`} is the distance from ${math`x`} to ${p.a} on the number line. The points at distance exactly ${p.b} are ${p.a - p.b} and ${p.a + p.b}.`,
      t`So the solution is ${realSetSpan(inSet(p))}.`,
    ],
  }),
  solve: (p) => [optionFor(setChoice(inSet(p), inWrong(p)).ids, setWhere(inTest(p), [q(p.a - p.b), q(p.a + p.b), q(-20), q(20)]))],
  misconceptions: (p) => setChoice(inSet(p), inWrong(p)).misconceptions,
});

// ---------------------------------------------------------------- |x - a| + |x - b| = c

interface TwP { a: number; b: number; c: number }
/** With a < b and c > b - a: x = (a + b - c)/2 or (a + b + c)/2. */
const twAns = ({ a, b, c }: TwP): Rational[] => [q(a + b - c, 2), q(a + b + c, 2)];

const twoModuli = generator<TwP>({
  id: 'two-moduli',
  skill: 'Solve |x - a| + |x - b| = c by splitting at the critical values a and b, and keep only solutions in their own region.',
  params: (rng) => {
    for (;;) {
      const a = int(rng, -5, 3);
      const p: TwP = { a, b: a + int(rng, 1, 5), c: int(rng, 2, 12) };
      if (p.c <= p.b - p.a || p.a + p.b === 0) continue;
      const neg = setKey([q(p.c + p.a + p.b, 2), q(p.a + p.b - p.c, 2)].map((r) => mul(q(-1), r)));
      if (distinctFrom(setKey(twAns(p)), [neg, setKey([q(p.c + p.a - p.b), q(p.c + p.b - p.a)])]) >= 2) return p;
    }
  },
  sane: (p) => (p.a < p.b && p.c > p.b - p.a ? null : 'no solutions or a segment'),
  problem: (p) => {
    const [x1, x2] = twAns(p) as [Rational, Rational];
    return {
      prompt: t`Solve ${math`|x ${sgn(-p.a)} ${Math.abs(p.a)}| + |x ${sgn(-p.b)} ${Math.abs(p.b)}| = ${p.c}`}.`,
      answer: setAnswer([x1, x2], 'Split at the two critical values and solve in each region.'),
      solution: [
        t`The critical values are ${p.a} and ${p.b}. For ${math`x < ${p.a}`} both insides are negative: ${math`(${p.a} - x) + (${p.b} - x) = ${p.c}`}, so ${math`x = ${x1}`}, which is indeed less than ${p.a}.`,
        t`For ${math`${p.a} \le x \le ${p.b}`}: ${math`(x - (${p.a})) + (${p.b} - x) = ${p.b - p.a}`}, which is not ${p.c}, so no solution there.`,
        t`For ${math`x > ${p.b}`}: ${math`(x - (${p.a})) + (x - (${p.b})) = ${p.c}`}, so ${math`x = ${x2}`}, which is greater than ${p.b}.`,
      ],
    };
  },
  solve: (p) => {
    const out: Rational[] = [];
    for (let j = -80; j <= 80; j++) { const x = q(j, 2); if (str(add(absR(sub(x, q(p.a))), absR(sub(x, q(p.b))))) === String(p.c)) out.push(x); }
    return asList(out);
  },
  misconceptions: (p): Misconception[] => [
    { response: asList([q(p.c + p.a + p.b, 2), q(p.a + p.b - p.c, 2)].map((r) => mul(q(-1), r))), why: t`Check the signs: for ${math`x < ${p.a}`}, ${math`|x - (${p.a})| = (${p.a}) - x`}. Substitute your answers back in.` },
    { response: asList([q(p.c + p.a - p.b), q(p.c + p.b - p.a)].map((r) => r)), why: t`Each case gives one linear equation in ${math`x`}; solve it, then check the solution lies in that case's region.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const a21iii = auto({
  id: 'a21-q2-iii',
  source: cite('step-f21', 'Q2(iii)'),
  title: t`Two moduli, three regions`,
  prompt: t`Solve ${math`|${2}x| + |x - ${1}| = ${3}`}.`,
  answer: setAnswer([q(4, 3), q(-2, 3)], 'Split at x = 0 and x = 1 and check each solution is in its region.'),
  solution: [
    t`The critical values are ${0} and ${1}. For ${math`x < ${0}`}: ${math`-${2}x - (x - ${1}) = ${3}`}, so ${math`x = -${q(2, 3)}`}, which is in the region.`,
    t`For ${math`${0} \le x < ${1}`}: ${math`${2}x - (x - ${1}) = ${3}`} gives ${math`x = ${2}`}, not in the region, so no solution here.`,
    t`For ${math`x \ge ${1}`}: ${math`${2}x + x - ${1} = ${3}`}, so ${math`x = ${q(4, 3)}`}, in the region. The solutions are ${math`-${q(2, 3)}`} and ${q(4, 3)}.`,
  ],
  reference: '4/3, -2/3',
  verify: () => {
    const out: string[] = [];
    for (let j = -60; j <= 60; j++) { const x = j / 3; if (Math.abs(Math.abs(2 * x) + Math.abs(x - 1) - 3) < 1e-12) out.push(`${j}/3`); }
    return same('solutions in thirds', out.join(','), '-2/3,4/3');
  },
  misconceptions: [{ response: '4/3, 2', why: t`${math`x = ${2}`} came from the region ${math`${0} \le x < ${1}`}, where it does not lie: ${math`|${4}| + |${1}| = ${5}`}, not ${3}.` }],
  official: { source: cite('step-f21-hints', 'Q2(iii)'), answer: '4/3, -2/3', agrees: true },
});

const a21i = auto({
  id: 'a21-q2-i',
  source: cite('step-f21', 'Q2(i)'),
  title: t`A modulus equation`,
  prompt: t`Solve ${math`|${2}x - ${3}| - ${4} = ${3}`}.`,
  answer: setAnswer([q(5), q(-2)], 'Write it as |2x - 3| = 7 first.'),
  solution: [
    t`${math`|${2}x - ${3}| = ${7}`}, so ${math`${2}x - ${3} = ${7}`} or ${math`${2}x - ${3} = -${7}`}.`,
    t`So ${math`x = ${5}`} or ${math`x = -${2}`}.`,
  ],
  reference: '5, -2',
  verify: () => same('check', [5, -2].map((x) => Math.abs(2 * x - 3) - 4).join(','), '3,3'),
  misconceptions: [{ response: '5, 2', why: t`${math`${2}x - ${3} = -${7}`} gives ${math`${2}x = -${4}`}, so ${math`x = -${2}`}.` }],
  official: { source: cite('step-f21-hints', 'Q2(i)'), answer: '5, -2', agrees: true },
});

const a5iii = auto({
  id: 'a5-q2-iii',
  source: cite('step-f05', 'Q2(iii)'),
  title: t`A root that becomes a modulus`,
  prompt: t`Simplify ${math`\left(${1} - \frac{${1}}{${1} + x^{${2}}}\right)^{\frac{${1}}{${2}}}\sqrt{${1} + x^{${2}}}`}, for all real ${math`x`}. (Type ${math`|x|`} as abs(x).)`,
  answer: { kind: 'expression', expected: 'abs(x)', variables: ['x'] },
  solution: [
    t`${math`${1} - \frac{${1}}{${1} + x^{${2}}} = \frac{x^{${2}}}{${1} + x^{${2}}}`}, so the expression is ${math`\sqrt{\frac{x^{${2}}}{${1} + x^{${2}}}}\sqrt{${1} + x^{${2}}} = \sqrt{x^{${2}}}`}.`,
    t`${math`\sqrt{x^{${2}}}`} is the non-negative number whose square is ${math`x^{${2}}`}: that is ${math`x`} when ${math`x \ge ${0}`} and ${math`-x`} when ${math`x < ${0}`}, which is ${math`|x|`}.`,
  ],
  reference: 'abs(x)',
  verify: () => { for (const x of [-3, -0.5, 0, 2]) if (Math.abs(Math.sqrt(1 - 1 / (1 + x * x)) * Math.sqrt(1 + x * x) - Math.abs(x)) > 1e-12) return `x = ${x}`; return null; },
  misconceptions: [{ response: 'x', why: t`For ${math`x < ${0}`} the expression is still positive, so it cannot be ${math`x`}: ${math`\sqrt{x^{${2}}} = |x|`}.` }],
});

const a21sketch = supervision({
  id: 'a21-q2-ii',
  source: cite('step-f21', 'Q2(ii)'),
  title: t`Sketching a modulus graph`,
  prompt: t`Sketch the graph ${math`y = |${2}x - ${3}|`}, marking where it meets the axes. Then sketch ${math`y = |${2}x| + |x - ${1}|`} and ${math`y = ${3}`} on one diagram, and use it to explain why ${math`|${2}x| + |x - ${1}| = ${3}`} has exactly two solutions.`,
  writeUp: 'sketch',
  official: cite('step-f21-hints', 'Q2(ii)'),
});

const eqns1 = supervision({
  id: 's2eqns-q1-iii',
  source: cite('step-s2-eqns', 'Q1(iii) (1994 STEP II Q5(iii))'),
  title: t`How many roots?`,
  prompt: t`How many real roots does the equation ${math`|x - ${3}| + |x - ${1}| = c`} have? The answer may depend on the value of ${math`c`}: give reasons for your answer.`,
  writeUp: 'explanation',
  official: cite('step-s2-eqns-solutions', 'Q1(iii)'),
});

// ---------------------------------------------------------------- lesson

export const modulus: TopicContent = {
  topicId: 'fn.modulus',
  goal: t`Solve equations such as ${math`|${2}x| + |x - ${1}| = ${3}`} by splitting at the critical values, and sketch ${math`y = |f(x)|`}.`,
  objective: t`Solve modulus equations and inequalities by cases, and sketch modulus graphs.`,
  why: t`STEP uses the modulus constantly, and case-splitting is the skill it tests.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`The idea` },
    { kind: 'hook', text: t`Solve ${math`|x + ${1}| + |${2}x - ${4}| = ${9}`}. Guessing finds ${math`x = ${4}`}, since ${math`${5} + ${4} = ${9}`}. Is there another? And how would you know you had found them all?` },
    { kind: 'narrative', text: t`The modulus is easy to define but awkward to manipulate, because its formula changes at ${0}. The cure is to split the number line at the points where each inside changes sign, and solve a plain linear equation on each piece.` },
    { kind: 'section', title: t`The modulus` },
    {
      kind: 'definition',
      name: t`Modulus`,
      formal: t`For real ${math`x`}, the [[modulus|modulus]] is ${math`|x| = x`} if ${math`x \ge ${0}`} and ${math`|x| = -x`} if ${math`x < ${0}`}. Then ${math`|x - a|`} is the distance from ${math`x`} to ${math`a`} on the number line.`,
      plain: t`Drop the sign: ${math`|${3}| = ${3}`} and ${math`|-${3}| = ${3}`}. And ${math`|x - ${2}| = ${5}`} asks for the points ${5} away from ${2}: ${7} and ${math`-${3}`}.`,
    },
    { kind: 'theorem', name: t`Modulus equations`, statement: t`For ${math`c \ge ${0}`}, ${math`|y| = c`} if and only if ${math`y = c`} or ${math`y = -c`}. For ${math`c > ${0}`}, ${math`|y| < c`} if and only if ${math`-c < y < c`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Split on the sign`, text: t`If ${math`y \ge ${0}`}, ${math`|y| = y`}, so ${math`|y| = c`} means ${math`y = c`}, and ${math`|y| < c`} means ${math`${0} \le y < c`}.` },
        { label: t`The other sign`, text: t`If ${math`y < ${0}`}, ${math`|y| = -y`}, so ${math`|y| = c`} means ${math`y = -c`}, and ${math`|y| < c`} means ${math`-c < y < ${0}`}.` },
        { label: t`Combine`, text: t`Joining the two cases gives ${math`y = \pm c`}, and ${math`-c < y < c`}.` },
      ],
    },
    checkFrom(absEquation, { a: 2, b: -3, c: 7 }, t`${math`${2}x - ${3} = ${7}`} gives ${5}; ${math`${2}x - ${3} = -${7}`} gives ${math`-${2}`}.`),
    { kind: 'pitfall', claim: t`${math`|x + ${2}| = ${3}`} has the solutions ${1} and ${math`-${1}`}.`, counterexample: t`${math`|-${1} + ${2}| = ${1}`}, not ${3}. The second case is ${math`x + ${2} = -${3}`}, giving ${math`x = -${5}`}.` },
    { kind: 'section', title: t`Several moduli: critical values` },
    { kind: 'narrative', text: t`For ${math`|x + ${1}| + |${2}x - ${4}|`}, the insides change sign at ${math`-${1}`} and at ${2}. These [[critical-value|critical values]] cut the line into three regions, and on each region every modulus has a fixed formula. Solve the resulting linear equation in each region, and keep a solution only if it lies in the region it came from.` },
    checkFrom(twoModuli, { a: 0, b: 3, c: 5 }, t`For ${math`x < ${0}`}: ${math`-${2}x + ${3} = ${5}`}, ${math`x = -${1}`}; between, the sum is always ${3}; for ${math`x > ${3}`}: ${math`${2}x - ${3} = ${5}`}, ${math`x = ${4}`}.`),
    { kind: 'pitfall', claim: t`In the region ${math`-${1} \le x < ${2}`}, the equation ${math`(x + ${1}) - (${2}x - ${4}) = ${9}`} gives a solution ${math`x = -${4}`}.`, counterexample: t`${math`-${4}`} is not in that region, and ${math`|-${3}| + |-${12}| = ${15} \ne ${9}`}. A case's solution counts only if it satisfies the case's condition.` },
    { kind: 'section', title: t`Sketching` },
    { kind: 'narrative', text: t`To sketch ${math`y = |f(x)|`}, sketch ${math`y = f(x)`} and reflect every part below the ${math`x`}-axis in the axis. So ${math`y = |${2}x + ${5}|`} is a V with its point at ${math`(-${q(5, 2)}, ${0})`}. This reflection trick does not work for sums such as ${math`|x + ${1}| + |${2}x - ${4}|`}: for those, use the regions, where the graph is a straight line on each piece.` },
    checkFrom(absInequality, { a: 2, b: 3, op: '<' }, t`Within ${3} of ${2}: ${math`-${1} < x < ${5}`}.`),
    { kind: 'takeaway', text: t`${math`|y| = c`} means ${math`y = \pm c`}; with several moduli, split at the critical values, solve on each region, and keep only solutions inside their region.` },
  ],
  examples: [
    withExaminer(workedCambridge(a21iii), t`All three regions stated, the equation solved in each, and the solution ${math`x = ${2}`} rejected because it lies outside its region.`),
    worked(absInequality, { a: -1, b: 4, op: '>=' }, t`Far from a point`),
    worked(twoModuli, { a: -3, b: 1, c: 6 }, t`Two moduli`),
  ],
  generators: [absEquation, absInequality, twoModuli],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['modulus'],
  cambridge: withUses([a21i, a5iii, a21sketch, eqns1], {
    'a5-q2-iii': { sections: ['The modulus'], note: t`A square root of a square is a modulus` },
    's2eqns-q1-iii': { sections: ['Several moduli: critical values', 'Sketching'], note: t`Counting the roots of a sum of moduli` },
  }),
  gate: ['a5-q2-iii', 's2eqns-q1-iii'],
  recall: [
    { front: t`Define ${math`|x|`}.`, back: t`${math`x`} if ${math`x \ge ${0}`}, ${math`-x`} if ${math`x < ${0}`}.` },
    { front: t`How do you solve an equation with several moduli?`, back: t`Split at the critical values, solve in each region, and keep only solutions in their own region.` },
  ],
  proofOrder: [{
    title: t`${math`|y| = c`} means ${math`y = \pm c`}`,
    steps: [
      t`If ${math`y \ge ${0}`}, then ${math`|y| = y`}, so ${math`y = c`}.`,
      t`If ${math`y < ${0}`}, then ${math`|y| = -y`}, so ${math`y = -c`}.`,
      t`Every ${math`y`} is in one of the two cases.`,
      t`So ${math`|y| = c`} exactly when ${math`y = c`} or ${math`y = -c`}.`,
    ],
  }],
};
