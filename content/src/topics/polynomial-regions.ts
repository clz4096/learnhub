/**
 * ineq.polynomial-regions: solve f(x) >= 0 for a factorised polynomial with a sign
 * diagram, and shade the regions of the plane where a product of linear factors in x and
 * y has a given sign. Sources: STEP Support Foundation Assignment 4 Q2(ii) to (iv) and Q3
 * (1995 STEP I Q1), and the NST Maths Workbook A5(ii). Solution sets are checked by the
 * sign test (prep-a.ts, setWhere); regions by evaluating the product at the points.
 */
import { cite, supervision, auto, same } from '../cambridge';
import { int, pick, q, sample, type Rational } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { computedMath, math, t } from '../rich';
import { checkFrom, workedCambridge, worked, type TopicContent } from '../topic';
import { poly } from '../poly';
import { closed, evalPoly, fromRoots, open, optionFor, realSetSpan, setAnswer, setChoice, setProblem, setWhere, withExaminer, type RealSet, type WrongSet } from '../prep-a';

type Op = '<' | '>' | '<=' | '>=';
const OP_TEX: Readonly<Record<Op, string>> = { '<': '<', '>': '>', '<=': '\\le', '>=': '\\ge' };
const holds = (v: Rational, op: Op): boolean => {
  const s = v.num === 0n ? 0 : v.num > 0n ? 1 : -1;
  return op === '<' ? s < 0 : op === '>' ? s > 0 : op === '<=' ? s <= 0 : s >= 0;
};
const negate = (op: Op): Op => ({ '<': '>=', '>': '<=', '<=': '>', '>=': '<' } as const)[op];
const facTex = (r: number): string => (r === 0 ? 'x' : `(x ${r < 0 ? '+' : '-'} ${Math.abs(r)})`);

// ---------------------------------------------------------------- a cubic with three roots

interface CubP { a: number; b: number; c: number; op: Op }
const cubCoeffs = (p: CubP): number[] => fromRoots([p.a, p.b, p.c]);
const cubSet = (p: CubP, op: Op = p.op): RealSet => setWhere((x) => holds(evalPoly(cubCoeffs(p), x), op), [q(p.a), q(p.b), q(p.c)]);
function cubWrong(p: CubP): WrongSet[] {
  const [lo, , hi] = [p.a, p.b, p.c].sort((x, y) => x - y) as [number, number, number];
  const inc = p.op === '<=' || p.op === '>=';
  const between: RealSet = [inc ? closed(q(lo), q(hi)) : open(q(lo), q(hi))];
  const outside: RealSet = inc ? [closed(null, q(lo)), closed(q(hi), null)] : [open(null, q(lo)), open(q(hi), null)];
  return [
    { set: cubSet(p, negate(p.op)), why: t`That is where the cubic has the other sign. A cubic with a positive ${math`x^{${3}}`} term is negative far to the left and positive far to the right: start the sign diagram there.` },
    { set: cubSet(p, ({ '<': '<=', '>': '>=', '<=': '<', '>=': '>' } as const)[p.op]), why: t`At a root the cubic is ${0}: include the roots when the inequality allows equality, and leave them out when it is strict.` },
    { set: p.op === '<' || p.op === '<=' ? between : outside, why: t`A cubic is not a quadratic: with three roots its sign changes three times, so the answer has two separate pieces, not one gap.` },
  ];
}

const cubicSign = generator<CubP>({
  id: 'cubic-sign',
  skill: 'Solve a cubic inequality from its roots with a sign diagram: the sign changes at each simple root.',
  params: (rng) => {
    const [a, b, c] = sample(rng, [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6], 3) as [number, number, number];
    return { a, b, c, op: pick(rng, ['<', '>', '<=', '>='] as const) };
  },
  sane: ({ a, b, c }) => (new Set([a, b, c]).size === 3 ? null : 'repeated root'),
  problem: (p) => {
    const roots = [p.a, p.b, p.c].sort((x, y) => x - y);
    const { answer } = setChoice(cubSet(p), cubWrong(p));
    return {
      prompt: t`Solve ${computedMath(poly(cubCoeffs(p)))}${math` ${OP_TEX[p.op]} ${0}`}.`,
      answer,
      solution: [
        t`It factorises as ${computedMath(roots.map(facTex).join(''))}, with roots ${math`${roots[0] as number}, ${roots[1] as number}, ${roots[2] as number}`}.`,
        t`For large positive ${math`x`} every bracket is positive, so the cubic is positive. Each time ${math`x`} passes a root going left, one bracket changes sign, so the cubic does too: positive, negative, positive, negative, reading from right to left.`,
        t`So the solution is ${realSetSpan(cubSet(p))}.`,
      ],
    };
  },
  solve: (p) => {
    const { ids } = setChoice(cubSet(p), cubWrong(p));
    // Independent: sample on a fine grid between the roots and at the roots.
    return [optionFor(ids, setWhere((x) => holds(evalPoly(cubCoeffs(p), x), p.op), [q(p.a), q(p.b), q(p.c), q(-7), q(7)]))];
  },
  misconceptions: (p) => setChoice(cubSet(p), cubWrong(p)).misconceptions,
});

// ---------------------------------------------------------------- a repeated root

interface RepP { a: number; b: number; op: Op }
/** (x - a)^2 (x - b). */
const repCoeffs = (p: RepP): number[] => fromRoots([p.a, p.a, p.b]);
const repSet = (p: RepP, op: Op = p.op): RealSet => setWhere((x) => holds(evalPoly(repCoeffs(p), x), op), [q(p.a), q(p.b)]);
function repWrong(p: RepP): WrongSet[] {
  // The slip: treat the double root like a simple one, so the sign alternates three times.
  const alternating = setWhere((x) => holds(evalPoly(fromRoots([p.a, p.b]), x), p.op), [q(p.a), q(p.b)]);
  return [
    { set: alternating, why: t`At a repeated root the sign does not change: ${math`(x - ${p.a})^{${2}}`} is never negative, so only the factor ${computedMath(facTex(p.b).replace(/[()]/g, ''))} decides the sign.` },
    { set: repSet(p, ({ '<': '<=', '>': '>=', '<=': '<', '>=': '>' } as const)[p.op]), why: t`At ${math`x = ${p.a}`} the expression is ${0}. ${p.op === '<' || p.op === '>' ? 'A strict inequality leaves it out.' : 'Equality is allowed, so it is in the set, even on its own.'}` },
    { set: repSet(p, negate(p.op)), why: t`That is where the expression has the other sign.` },
  ];
}

const repeatedRoot = generator<RepP>({
  id: 'repeated-root',
  skill: 'Solve an inequality with a squared factor: the sign does not change at a repeated root.',
  params: (rng) => {
    for (;;) {
      const p: RepP = { a: int(rng, -5, 5), b: int(rng, -5, 5), op: pick(rng, ['<', '>', '<=', '>='] as const) };
      if (p.a !== p.b) return p;
    }
  },
  sane: ({ a, b }) => (a !== b ? null : 'triple root'),
  problem: (p) => {
    const { answer } = setChoice(repSet(p), repWrong(p));
    return {
      prompt: t`Solve ${computedMath(`${facTex(p.a)}^${2}${facTex(p.b)}`)}${math` ${OP_TEX[p.op]} ${0}`}.`,
      answer,
      solution: [
        t`${math`(x - (${p.a}))^{${2}} \ge ${0}`} for every ${math`x`}, and it is ${0} only at ${math`x = ${p.a}`}. So away from ${p.a}, the sign is the sign of ${computedMath(facTex(p.b).replace(/[()]/g, ''))}.`,
        t`That factor is positive for ${math`x > ${p.b}`} and negative for ${math`x < ${p.b}`}. Then treat ${math`x = ${p.a}`}, where the expression is ${0}, and ${math`x = ${p.b}`} on their own.`,
        t`So the solution is ${realSetSpan(repSet(p))}.`,
      ],
    };
  },
  solve: (p) => {
    const { ids } = setChoice(repSet(p), repWrong(p));
    return [optionFor(ids, setWhere((x) => holds(evalPoly(repCoeffs(p), x), p.op), [q(p.a), q(p.b), q(-8), q(8)]))];
  },
  misconceptions: (p) => setChoice(repSet(p), repWrong(p)).misconceptions,
});

// ---------------------------------------------------------------- regions of the plane

interface RegP { m1: number; m2: number; pts: [number, number][]; neg: boolean }
/** (y - m1 x)(y - m2 x): a product of two lines through the origin. */
const val = (p: RegP, [x, y]: [number, number]): number => (y - p.m1 * x) * (y - p.m2 * x);
const ptId = ([x, y]: [number, number]): string => `p${x}_${y}`.replace(/-/g, 'm');

const regionPoints = generator<RegP>({
  id: 'region-points',
  skill: 'Decide which points lie in a region where a product of two linear factors has a given sign, by testing each factor.',
  params: (rng) => {
    for (;;) {
      const [m1, m2] = sample(rng, [-3, -2, -1, 1, 2, 3], 2) as [number, number];
      const cands: [number, number][] = [];
      for (let x = -3; x <= 3; x++) for (let y = -4; y <= 4; y++) cands.push([x, y]);
      const pts = sample(rng, cands, 4);
      const p: RegP = { m1, m2, pts, neg: rng() < 0.5 };
      const vs = pts.map((pt) => val(p, pt));
      const inside = vs.filter((v) => (p.neg ? v < 0 : v > 0)).length;
      if (vs.every((v) => v !== 0) && inside >= 1 && inside <= 3) return p;
    }
  },
  sane: (p) => (p.pts.every((pt) => val(p, pt) !== 0) ? null : 'point on a boundary'),
  problem: (p) => {
    const options: ChoiceOption[] = p.pts.map((pt) => ({ id: ptId(pt), label: t`${math`(${pt[0]}, ${pt[1]})`}` }));
    const correct = p.pts.filter((pt) => (p.neg ? val(p, pt) < 0 : val(p, pt) > 0)).map(ptId);
    const line = (m: number): string => `y - ${m}x`.replace('- -', '+ ').replace(/ 1x/, ' x');
    return {
      prompt: t`Which of these points lie in the region where ${computedMath(`(${line(p.m1)})(${line(p.m2)})`)}${math` ${p.neg ? '<' : '>'} ${0}`}? Choose all that apply.`,
      answer: { kind: 'choice', options, correct },
      solution: [
        t`The boundary is the pair of lines ${math`y = ${p.m1}x`} and ${math`y = ${p.m2}x`}. The product is ${p.neg ? 'negative' : 'positive'} where the two factors have ${p.neg ? 'opposite signs' : 'the same sign'}.`,
        ...p.pts.map((pt) => t`At ${math`(${pt[0]}, ${pt[1]})`}: the factors are ${math`${pt[1] - p.m1 * pt[0]}`} and ${math`${pt[1] - p.m2 * pt[0]}`}, product ${math`${val(p, pt)}`}, so it is ${(p.neg ? val(p, pt) < 0 : val(p, pt) > 0) ? 'in' : 'not in'} the region.`),
      ],
    };
  },
  solve: (p) => p.pts.filter(([x, y]) => { const v = (y - p.m1 * x) * (y - p.m2 * x); return p.neg ? v < 0 : v > 0; }).map(ptId),
  misconceptions: (p): Misconception[] => {
    const other = p.pts.filter((pt) => (p.neg ? val(p, pt) > 0 : val(p, pt) < 0)).map(ptId);
    const bothNeg = p.pts.filter(([x, y]) => y - p.m1 * x < 0 && y - p.m2 * x < 0).map(ptId);
    const out: Misconception[] = [{ response: other, why: t`Those points make the product ${p.neg ? 'positive' : 'negative'}. Test the sign of each factor, then multiply the signs.` }];
    if (p.neg && bothNeg.length > 0) out.push({ response: bothNeg, why: t`A product is negative when the factors have opposite signs, not when both are negative: two negatives make a positive.` });
    else out.push({ response: p.pts.map(ptId), why: t`Not every point works: test each one, and keep only those where the product has the right sign.` });
    return out;
  },
});

// ---------------------------------------------------------------- Cambridge problems

const a4q2ii = setProblem({
  id: 'a4-q2-ii',
  source: cite('step-f04', 'Q2(ii)'),
  title: t`Where a cubic is not positive`,
  prompt: t`${math`x^{${3}} - ${2}x^{${2}} - ${5}x + ${6} = (x - ${3})(x - ${1})(x + ${2})`}. Sketch ${math`y = x^{${3}} - ${2}x^{${2}} - ${5}x + ${6}`}, and use your sketch to find the values of ${math`x`} for which ${math`x^{${3}} - ${2}x^{${2}} - ${5}x + ${6} \le ${0}`}.`,
  right: [closed(null, q(-2)), closed(q(1), q(3))],
  wrong: [
    { set: [closed(q(-2), q(1)), closed(q(3), null)], why: t`That is where the cubic is at least ${0}. It starts negative on the far left, since the ${math`x^{${3}}`} term wins there.` },
    { set: [closed(q(-2), q(3))], why: t`A cubic with three roots changes sign three times; between ${1} and ${3} it is below the axis again.` },
  ],
  solution: [
    t`The roots are ${math`-${2}`}, ${1}, ${3}. The curve comes up from below on the left, crosses at ${math`-${2}`}, comes back down through ${1}, and up through ${3}.`,
    t`So it is at or below the axis for ${math`x \le -${2}`} or ${math`${1} \le x \le ${3}`}.`,
  ],
  test: (x) => holds(evalPoly([1, -2, -5, 6], x), '<='),
  critical: [q(-2), q(1), q(3)],
});

const a4q3i = setProblem({
  id: 'a4-q3-i',
  source: cite('step-f04', 'Q3(i) (1995 STEP I Q1)'),
  title: t`A cubic inequality from STEP`,
  prompt: t`Find the real values of ${math`x`} for which ${math`x^{${3}} - ${4}x^{${2}} - x + ${4} \ge ${0}`}.`,
  right: [closed(q(-1), q(1)), closed(q(4), null)],
  wrong: [
    { set: [closed(null, q(-1)), closed(q(1), q(4))], why: t`That is where it is at most ${0}. For large positive ${math`x`} the cubic is positive.` },
    { set: [open(q(-1), q(1)), open(q(4), null)], why: t`The inequality is not strict, so the roots belong.` },
  ],
  solution: [
    t`Group: ${math`x^{${2}}(x - ${4}) - (x - ${4}) = (x - ${4})(x^{${2}} - ${1}) = (x - ${4})(x - ${1})(x + ${1})`}.`,
    t`Sign diagram from the right: positive for ${math`x > ${4}`}, negative on ${math`(${1}, ${4})`}, positive on ${math`(-${1}, ${1})`}, negative for ${math`x < -${1}`}. With the roots: ${math`-${1} \le x \le ${1}`} or ${math`x \ge ${4}`}.`,
  ],
  test: (x) => holds(evalPoly([1, -4, -1, 4], x), '>='),
  critical: [q(-1), q(1), q(4)],
});

const nstA5ii = setProblem({
  id: 'nst-a5-ii',
  source: cite('nst-workbook', 'Algebra, A5(ii)'),
  title: t`Do not divide by ${math`y`}`,
  prompt: t`Find the values of ${math`y`} which satisfy ${math`y^{${3}} < ${2}y^{${2}} + ${3}y`}.`,
  v: 'y',
  right: [open(null, q(-1)), open(q(0), q(3))],
  wrong: [
    { set: [open(q(-1), q(3))], why: t`Dividing by ${math`y`} assumes ${math`y > ${0}`}. Move everything to one side and factorise: ${math`y(y - ${3})(y + ${1}) < ${0}`}.` },
    { set: [open(q(-1), q(0)), open(q(3), null)], why: t`That is where ${math`y(y - ${3})(y + ${1}) > ${0}`}.` },
  ],
  solution: [
    t`${math`y^{${3}} - ${2}y^{${2}} - ${3}y < ${0}`}, that is ${math`y(y - ${3})(y + ${1}) < ${0}`}.`,
    t`From the right: positive for ${math`y > ${3}`}, negative on ${math`(${0}, ${3})`}, positive on ${math`(-${1}, ${0})`}, negative for ${math`y < -${1}`}. So ${math`y < -${1}`} or ${math`${0} < y < ${3}`}.`,
  ],
  test: (y) => holds(evalPoly([1, -2, -3, 0], y), '<'),
  critical: [q(-1), q(0), q(3)],
});

const a4q2iii = auto({
  id: 'a4-q2-iii',
  source: cite('step-f04', 'Q2(iii)', true),
  title: t`Two lines from one equation`,
  prompt: t`Factorise ${math`x^{${2}} - ${3}xy + ${2}y^{${2}}`}. The points with ${math`x^{${2}} - ${3}xy + ${2}y^{${2}} = ${0}`} lie on two straight lines through the origin, ${math`y = mx`}. Give both gradients ${math`m`}.`,
  answer: setAnswer([q(1, 2), q(1)], 'Factorise like x^2 - 3x + 2, then set each factor to 0.'),
  solution: [
    t`${math`x^{${2}} - ${3}x + ${2} = (x - ${2})(x - ${1})`}, so in the same way ${math`x^{${2}} - ${3}xy + ${2}y^{${2}} = (x - ${2}y)(x - y)`}.`,
    t`A product is ${0} when a factor is: ${math`x = ${2}y`}, that is ${math`y = \frac{x}{${2}}`}, or ${math`x = y`}. The gradients are ${q(1, 2)} and ${1}.`,
  ],
  reference: '1/2, 1',
  verify: () => {
    for (const [x, y] of [[2, 1], [5, 5], [-4, -2]] as const) if (x * x - 3 * x * y + 2 * y * y !== 0) return `(${x}, ${y}) is not on the curve`;
    return same('a point off both lines', 3 * 3 - 3 * 3 * 1 + 2 * 1, 2);
  },
  misconceptions: [{ response: '2, 1', why: t`${math`x = ${2}y`} means ${math`y = \frac{x}{${2}}`}: the gradient is ${q(1, 2)}, not ${2}.` }],
});

const a4q3iiLines = auto({
  id: 'a4-q3-ii',
  source: cite('step-f04', 'Q3(ii) (1995 STEP I Q1)'),
  title: t`Three lines from a cubic`,
  prompt: t`Find the three lines in the ${math`(x, y)`} plane on which ${math`x^{${3}} - ${4}x^{${2}}y - xy^{${2}} + ${4}y^{${3}} = ${0}`}. Each is ${math`y = mx`}: give the three gradients.`,
  answer: setAnswer([q(1, 4), q(1), q(-1)], 'Use the factorisation of x^3 - 4x^2 - x + 4.'),
  solution: [
    t`Part (i) gave ${math`x^{${3}} - ${4}x^{${2}} - x + ${4} = (x - ${4})(x - ${1})(x + ${1})`}. Putting ${math`y`} into each term to match the powers: ${math`x^{${3}} - ${4}x^{${2}}y - xy^{${2}} + ${4}y^{${3}} = (x - ${4}y)(x - y)(x + y)`}.`,
    t`So the lines are ${math`y = \frac{x}{${4}}`}, ${math`y = x`}, and ${math`y = -x`}: gradients ${q(1, 4)}, ${1}, ${math`-${1}`}.`,
  ],
  reference: '1/4, 1, -1',
  verify: () => {
    const f = (x: number, y: number): number => x ** 3 - 4 * x * x * y - x * y * y + 4 * y ** 3;
    for (const m of [0.25, 1, -1]) if (Math.abs(f(3, 3 * m)) > 1e-9) return `gradient ${m} fails`;
    return Math.abs(f(1, 2)) > 0 ? null : '(1, 2) should be off the lines';
  },
  misconceptions: [{ response: '4, 1, -1', why: t`${math`x = ${4}y`} is the line ${math`y = \frac{x}{${4}}`}, with gradient ${q(1, 4)}.` }],
});

const step1995 = supervision({
  id: 'a4-q3',
  source: cite('step-f04', 'Q3 (1995 STEP I Q1)'),
  title: t`Shading where a cubic in two variables is positive`,
  prompt: t`(i) Find the real values of ${math`x`} for which ${math`x^{${3}} - ${4}x^{${2}} - x + ${4} \ge ${0}`}. (ii) Find the three lines in the ${math`(x, y)`} plane on which ${math`x^{${3}} - ${4}x^{${2}}y - xy^{${2}} + ${4}y^{${3}} = ${0}`}. (iii) On a sketch shade the regions of the ${math`(x, y)`} plane for which ${math`x^{${3}} - ${4}x^{${2}}y - xy^{${2}} + ${4}y^{${3}} \ge ${0}`}.`,
  writeUp: 'sketch',
  official: cite('step-f04-hints', 'Q3'),
});

const a4q2iv = supervision({
  id: 'a4-q2-iv',
  source: cite('step-f04', 'Q2(iv)'),
  title: t`Shading between two lines`,
  prompt: t`On a sketch, shade the regions of the ${math`(x, y)`} plane in which ${math`x^{${2}} - ${3}xy + ${2}y^{${2}} \le ${0}`}. (Pick a point in each region, not on the boundary lines, and test it.)`,
  writeUp: 'sketch',
  official: cite('step-f04-hints', 'Q2(iv)'),
});

// ---------------------------------------------------------------- lesson

export const polynomialRegions: TopicContent = {
  topicId: 'ineq.polynomial-regions',
  goal: t`Solve ${math`f(x) \ge ${0}`} for a factorised polynomial, and shade the regions of the plane where a product of linear factors in ${math`x`} and ${math`y`} has a given sign.`,
  objective: t`Solve polynomial inequalities with a sign diagram, and shade regions of the plane.`,
  why: t`STEP turns one-variable inequalities into regions in the plane; the sign rule does both.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`The idea` },
    { kind: 'hook', text: t`${math`(x - ${4}y)(x - y)(x + y) \ge ${0}`}: where in the plane is that true? It sounds hopeless until you notice that the expression is ${0} on three straight lines, and the lines cut the plane into six wedges. In each wedge the sign never changes. Test one point per wedge and you are done.` },
    { kind: 'narrative', text: t`The same idea solves one-variable inequalities like ${math`(x + ${2})(x - ${1})(x - ${3}) \le ${0}`}: the roots cut the line into pieces, the sign is constant on each piece, and it flips as you cross a root. One rule, two settings.` },
    { kind: 'section', title: t`Sign diagrams` },
    {
      kind: 'definition',
      name: t`Sign diagram`,
      formal: t`For a polynomial ${math`f`} with real roots ${math`r_{${1}} < r_{${2}} < \cdots < r_{k}`}, a [[sign-diagram|sign diagram]] records the sign of ${math`f`} on each of the intervals ${math`(-\infty, r_{${1}}), (r_{${1}}, r_{${2}}), \ldots, (r_{k}, \infty)`}.`,
      plain: t`A number line with the roots marked and a plus or minus sign in each gap. For ${math`(x + ${2})(x - ${1})(x - ${3})`}, reading left to right: minus, plus, minus, plus.`,
    },
    { kind: 'theorem', name: t`Sign changes at roots`, statement: t`Let ${math`f(x) = a(x - r_{${1}})^{e_{${1}}}\cdots(x - r_{k})^{e_{k}}`} with ${math`a > ${0}`}, distinct ${math`r_{i}`}, and positive integers ${math`e_{i}`}. Then ${math`f(x) > ${0}`} for ${math`x > r_{k}`}, and the sign of ${math`f`} changes as ${math`x`} crosses ${math`r_{i}`} exactly when ${math`e_{i}`} is odd.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Far to the right`, text: t`If ${math`x > r_{k}`}, every ${math`x - r_{i} > ${0}`}, so every factor is positive, and so is ${math`f(x)`}.` },
        { label: t`Crossing one root`, text: t`Near ${math`r_{i}`}, every factor except ${math`(x - r_{i})^{e_{i}}`} keeps its sign, because it is not ${0} there.`, why: { q: t`Why can't another factor change sign near ${math`r_{i}`}?`, a: t`${math`x - r_{j}`} changes sign only at ${math`r_{j}`}, and the roots are distinct, so on a small enough interval around ${math`r_{i}`} it has one sign.` } },
        { label: t`Odd or even power`, text: t`${math`x - r_{i}`} changes sign at ${math`r_{i}`}. Its ${math`e_{i}`}th power changes sign when ${math`e_{i}`} is odd and not when ${math`e_{i}`} is even, since an even power is never negative.` },
      ],
    },
    checkFrom(cubicSign, { a: -2, b: 1, c: 3, op: '<=' }, t`Roots ${math`-${2}`}, ${1}, ${3}; reading from the right the signs are plus, minus, plus, minus, so ${math`x \le -${2}`} or ${math`${1} \le x \le ${3}`}.`),
    { kind: 'pitfall', claim: t`${math`(x - ${1})^{${2}}(x - ${3}) > ${0}`} holds for ${math`x < ${1}`} as well as ${math`x > ${3}`}, since signs alternate at the roots.`, counterexample: t`At ${math`x = ${0}`}: ${math`(-${1})^{${2}} \times (-${3}) = -${3}`}, which is negative. The squared factor never changes sign, so the answer is just ${math`x > ${3}`}.` },
    { kind: 'section', title: t`Regions of the plane` },
    { kind: 'narrative', text: t`Now let the factors be linear in ${math`x`} and ${math`y`}. ${math`x - y`} is ${0} on the line ${math`y = x`}, positive on one side, negative on the other. A product of such factors is ${0} on the union of the lines, and keeps its sign inside each region they cut out.` },
    {
      kind: 'definition',
      name: t`Region test`,
      formal: t`To find where ${math`F(x, y) = L_{${1}}L_{${2}}\cdots L_{m} \ge ${0}`}, with each ${math`L_{i}`} linear, draw the lines ${math`L_{i} = ${0}`} and, in each region they bound, evaluate ${math`F`} at one [[region-test-point|test point]] off the lines.`,
      plain: t`Draw the boundary, then test one point per region. For ${math`(x - ${2}y)(x - y) \le ${0}`}: at ${math`(${3}, ${2})`}, ${math`(-${1})(${1}) = -${1}`}, so that whole wedge is shaded.`,
    },
    { kind: 'narrative', text: t`Why one point per region suffices: inside a region, no factor is ${0}, and a linear expression can change sign only by passing through ${0}. So every factor, and the product, has the same sign throughout the region.` },
    checkFrom(regionPoints, { m1: 1, m2: -1, pts: [[2, 0], [0, 2], [3, 1], [-1, -3]], neg: true }, t`At ${math`(${2}, ${0})`}: ${math`(-${2})(${2}) = -${4}`}; at ${math`(${3}, ${1})`}: ${math`(-${2})(${4}) = -${8}`}. The other two give positive products.`),
    { kind: 'takeaway', text: t`Factorise, mark where each factor is ${0}, and use one test point per piece: the sign is constant between boundaries and flips across a simple one.` },
  ],
  examples: [
    withExaminer(workedCambridge(a4q2ii), t`The factorised form, a sketch with the three roots marked, and inequalities with the right strictness at each end.`),
    worked(repeatedRoot, { a: 2, b: -1, op: '>=' }, t`A squared factor`),
    worked(cubicSign, { a: 0, b: 4, c: -3, op: '>' }, t`A cubic with a root at ${0}`),
  ],
  generators: [cubicSign, repeatedRoot, regionPoints],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['sign-diagram', 'region-test-point'],
  cambridge: [a4q3i, nstA5ii, a4q2iii, a4q3iiLines, step1995, a4q2iv],
  gate: ['a4-q3', 'a4-q3-i', 'nst-a5-ii'],
  recall: [
    { front: t`Where does a factorised polynomial change sign?`, back: t`At each root of odd multiplicity; not at a root of even multiplicity.` },
    { front: t`How do you shade where a product of linear factors in ${math`x, y`} is positive?`, back: t`Draw the lines where each factor is ${0}, then test one point in each region.` },
  ],
  proofOrder: [{
    title: t`One test point decides a whole region`,
    steps: [
      t`Inside a region, none of the lines is crossed, so no factor is ${0}.`,
      t`A linear expression changes sign only by passing through ${0}.`,
      t`So each factor keeps one sign throughout the region.`,
      t`Hence the product has one sign throughout, and one test point finds it.`,
    ],
  }],
};
