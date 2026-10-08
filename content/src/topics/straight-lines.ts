/**
 * geom.straight-lines: the equation of a line from a point and a gradient, parallel and
 * perpendicular gradients, distances, and the line of points equidistant from two points.
 * Sources: STEP Support Foundation Assignment 19 Q2(i) to (iv) and Assignment 2 Q2(i) to
 * (iii). Answers are computed exactly; the equidistant line is found again by expanding
 * PX^2 = QX^2, a different method from the midpoint and perpendicular gradient. 2004 STEP I Q6
 * (with letters for the vertices, the medians meet at one point, and the perpendicular-gradient
 * rule gives the orthocentre) is a written proof, so it is in proof.direct (Rule 1, 2026-10-08).
 */
import { auto, cite, same, withUses } from '../cambridge';
import { add, div, int, mul, pick, q, str, sub, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { computedMath, math, t } from '../rich';
import { checkFrom, workedCambridge, worked, type TopicContent } from '../topic';
import { distinctFrom, named, namedAnswer, withExaminer } from '../prep-a';

const F19 = 'step-f19' as const;
const F19H = 'step-f19-hints' as const;
const MC = ['m', 'c'] as const;

// ---------------------------------------------------------------- a line through a point

interface PtP { x1: number; y1: number; mn: number; md: number }
const grad = (p: PtP): Rational => q(p.mn, p.md);
const ptC = (p: PtP): Rational => sub(q(p.y1), mul(grad(p), q(p.x1)));
const ptMis = (p: PtP): Rational[] => [add(q(p.y1), mul(grad(p), q(p.x1))), sub(q(p.x1), mul(grad(p), q(p.y1))), q(p.y1)];

const throughPoint = generator<PtP>({
  id: 'through-point',
  skill: 'Write the equation of the line through a given point with a given gradient, from y - y1 = m(x - x1).',
  quick: true,
  params: (rng) => {
    for (;;) {
      const p: PtP = { x1: int(rng, -6, 6), y1: int(rng, -6, 6), mn: pick(rng, [-5, -3, -2, -1, 1, 2, 3, 4]), md: pick(rng, [1, 1, 2, 3]) };
      if (p.x1 === 0 || p.x1 === p.y1) continue;
      if (distinctFrom(str(ptC(p)), ptMis(p).map(str)) >= 2) return p;
    }
  },
  sane: (p) => (p.md >= 1 && p.mn !== 0 ? null : 'out of range'),
  problem: (p) => {
    const m = grad(p);
    return {
      prompt: t`The line ${math`L`} has gradient ${m} and passes through ${math`(${p.x1}, ${p.y1})`}. Its equation is ${str(m) === '1' ? math`y = x + c` : str(m) === '-1' ? math`y = -x + c` : math`y = ${m}x + c`}. Find ${math`c`}.`,
      answer: { kind: 'exact', expected: str(ptC(p)) },
      solution: [
        t`Use ${math`y - y_{${1}} = m(x - x_{${1}})`}: ${math`y - (${p.y1}) = ${m}(x - (${p.x1}))`}.`,
        t`At ${math`x = ${0}`} this gives ${math`y = ${p.y1} - ${m} \times (${p.x1}) = ${ptC(p)}`}, so ${math`c = ${ptC(p)}`}.`,
        t`Check: ${math`${m} \times (${p.x1}) + ${ptC(p)} = ${add(mul(m, q(p.x1)), ptC(p))}`}, the given ${math`y`}-coordinate.`,
      ],
    };
  },
  solve: (p) => {
    // The point must lie on the line: search c over multiples of 1/md.
    for (let k = -400; k <= 400; k++) {
      const c = q(k, p.md * 6);
      if (str(add(mul(grad(p), q(p.x1)), c)) === str(q(p.y1))) return str(c);
    }
    return 'none';
  },
  misconceptions: (p): Misconception[] => {
    const [sign, swap, noShift] = ptMis(p) as [Rational, Rational, Rational];
    return [
      { response: str(sign), why: t`Subtract ${math`mx_{${1}}`}: ${math`c = y_{${1}} - mx_{${1}}`}. Check by putting ${math`x = ${p.x1}`} into your line.` },
      { response: str(swap), why: t`The coordinates are the wrong way round: ${math`x`} comes first in ${math`(${p.x1}, ${p.y1})`}.` },
      { response: str(noShift), why: t`The ${math`y`}-intercept is the height where ${math`x = ${0}`}, not at ${math`x = ${p.x1}`}.` },
    ];
  },
});

// ---------------------------------------------------------------- perpendicular gradients

/** A coefficient as written before a letter: no 1, and -1 as a bare minus sign. */
const unit = (n: number): string => (n === 1 ? '' : n === -1 ? '-' : String(n));

interface PerpP { a: number; b: number }
const lineGrad = ({ a, b }: PerpP): Rational => q(-a, b);
const perpGrad = ({ a, b }: PerpP): Rational => q(b, a);

const perpendicular = generator<PerpP>({
  id: 'perpendicular',
  skill: 'Find the gradient of a line perpendicular to a given line: the negative reciprocal.',
  quick: true,
  params: (rng) => {
    for (;;) {
      const p: PerpP = { a: pick(rng, [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6]), b: pick(rng, [-5, -3, -2, -1, 1, 2, 3, 4, 5]) };
      if (Math.abs(p.a) === Math.abs(p.b)) continue;
      return p;
    }
  },
  sane: ({ a, b }) => (a !== 0 && b !== 0 ? null : 'axis line'),
  problem: (p) => {
    const m = lineGrad(p);
    return {
      prompt: t`Find the gradient of any line perpendicular to ${computedMath(`${unit(p.a)}x ${p.b < 0 ? '-' : '+'} ${unit(Math.abs(p.b))}y = ${p.a + p.b}`)}.`,
      answer: { kind: 'exact', expected: str(perpGrad(p)) },
      solution: [
        t`Make ${math`y`} the subject to read the gradient: ${math`y = ${m}x + \ldots`}, so the gradient is ${m}.`,
        t`Perpendicular gradients multiply to ${math`-${1}`}: the gradient is ${math`-\frac{${1}}{${m}} = ${perpGrad(p)}`}.`,
      ],
    };
  },
  solve: (p) => {
    // Directions: (b, -a) along the line; the perpendicular direction (a, b) has gradient b/a.
    return str(div(q(p.b), q(p.a)));
  },
  misconceptions: (p): Misconception[] => {
    const m = lineGrad(p);
    return [
      { response: str(m), why: t`That is the gradient of the line itself, so of every parallel line. A perpendicular one has the negative reciprocal.` },
      { response: str(div(q(1), m)), why: t`Take the reciprocal and change the sign: the product of the two gradients must be ${math`-${1}`}, not ${1}.` },
      { response: str(sub(q(0), m)), why: t`Changing the sign is not enough: also take the reciprocal, so the product is ${math`-${1}`}.` },
    ];
  },
});

// ---------------------------------------------------------------- equidistant points

interface EqP { p1: number; p2: number; q1: number; q2: number }
/** By expanding PX^2 = QX^2: 2(q1 - p1)x + 2(q2 - p2)y = q1^2 + q2^2 - p1^2 - p2^2. */
function bisector({ p1, p2, q1, q2 }: EqP): [Rational, Rational] {
  const A = 2 * (q1 - p1);
  const B = 2 * (q2 - p2);
  const C = q1 * q1 + q2 * q2 - p1 * p1 - p2 * p2;
  return [q(-A, B), q(C, B)];
}
function eqMis(p: EqP): [Rational, Rational][] {
  const mPQ = q(p.q2 - p.p2, p.q1 - p.p1);
  const mid = [q(p.p1 + p.q1, 2), q(p.p2 + p.q2, 2)] as const;
  const [m] = bisector(p);
  return [[mPQ, sub(mid[1], mul(mPQ, mid[0]))], [m, sub(q(p.p2), mul(m, q(p.p1)))]];
}
const pk = (x: [Rational, Rational]): string => x.map(str).join(',');

const equidistant = generator<EqP>({
  id: 'equidistant',
  skill: 'Find the line of points equidistant from two points, by setting the squared distances equal.',
  params: (rng) => {
    for (;;) {
      const p: EqP = { p1: int(rng, -5, 5), p2: int(rng, -5, 5), q1: int(rng, -5, 5), q2: int(rng, -5, 5) };
      if (p.p1 === p.q1 || p.p2 === p.q2) continue;
      if (distinctFrom(pk(bisector(p)), eqMis(p).map(pk)) >= 2) return p;
    }
  },
  sane: (p) => (p.p1 !== p.q1 && p.p2 !== p.q2 ? null : 'axis-parallel'),
  problem: (p) => {
    const [m, c] = bisector(p);
    const A = 2 * (p.q1 - p.p1);
    const B = 2 * (p.q2 - p.p2);
    const C = p.q1 * p.q1 + p.q2 * p.q2 - p.p1 * p.p1 - p.p2 * p.p2;
    return {
      prompt: t`The points equidistant from ${math`P(${p.p1}, ${p.p2})`} and ${math`Q(${p.q1}, ${p.q2})`} form a line ${math`y = mx + c`}. Find ${math`m`} and ${math`c`}.`,
      answer: namedAnswer(MC, [m, c], 'Set PX squared equal to QX squared, expand, and cancel the squares.'),
      solution: [
        t`A point ${math`X(x, y)`} is equidistant when ${math`PX^{${2}} = QX^{${2}}`}: ${math`(x - (${p.p1}))^{${2}} + (y - (${p.p2}))^{${2}} = (x - (${p.q1}))^{${2}} + (y - (${p.q2}))^{${2}}`}.`,
        t`Expand: the ${math`x^{${2}}`} and ${math`y^{${2}}`} terms cancel, leaving ${computedMath(`${A}x + ${B}y = ${C}`.replace('+ -', '- '))}.`,
        t`Make ${math`y`} the subject: ${math`y = ${m}x + ${c}`}. So ${math`m = ${m}`} and ${math`c = ${c}`}.`,
      ],
    };
  },
  solve: (p) => {
    // Midpoint and perpendicular gradient: a different route to the same line.
    const mx = q(p.p1 + p.q1, 2);
    const my = q(p.p2 + p.q2, 2);
    const m = q(-(p.q1 - p.p1), p.q2 - p.p2);
    return named(MC, [m, sub(my, mul(m, mx))]);
  },
  misconceptions: (p): Misconception[] => {
    const [along, atP] = eqMis(p) as [[Rational, Rational], [Rational, Rational]];
    return [
      { response: named(MC, along), why: t`That line runs along ${math`PQ`}. The equidistant points lie on the line at right angles to ${math`PQ`} through its midpoint.` },
      { response: named(MC, atP), why: t`The gradient is right, but the line passes through the midpoint of ${math`PQ`}, not through ${math`P`}: ${math`P`} is not equidistant from itself and ${math`Q`}.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

const a19q2ii = auto({
  id: 'a19-q2-ii',
  source: cite(F19, 'Q2(i), (ii)'),
  title: t`Points equidistant from two points`,
  prompt: t`${math`P`} is ${math`(${2}, -${2})`} and ${math`Q`} is ${math`(${4}, ${0})`}. By considering the distances ${math`PX`} and ${math`QX`} from a point ${math`X(x, y)`}, find the equation of the line of points equidistant from ${math`P`} and ${math`Q`}, in the form ${math`y = mx + c`}. Give ${math`m`} and ${math`c`}.`,
  answer: namedAnswer(MC, [q(-1), q(2)], 'Set PX squared equal to QX squared.'),
  solution: [
    t`By Pythagoras, ${math`PX^{${2}} = (x - ${2})^{${2}} + (y + ${2})^{${2}} = x^{${2}} + y^{${2}} - ${4}x + ${4}y + ${8}`}, and ${math`QX^{${2}} = (x - ${4})^{${2}} + y^{${2}} = x^{${2}} + y^{${2}} - ${8}x + ${16}`}.`,
    t`Equidistant means ${math`PX = QX`}, and since distances are not negative that is the same as ${math`PX^{${2}} = QX^{${2}}`}: ${math`-${4}x + ${4}y + ${8} = -${8}x + ${16}`}, so ${math`${4}x + ${4}y = ${8}`}, that is ${math`x + y = ${2}`}.`,
    t`So ${math`y = -x + ${2}`}: ${math`m = -${1}`} and ${math`c = ${2}`}.`,
  ],
  reference: 'm = -1, c = 2',
  verify: () => same('the bisector by expansion', pk(bisector({ p1: 2, p2: -2, q1: 4, q2: 0 })), '-1,2'),
  misconceptions: [{ response: 'm = 1, c = -4', why: t`That is the line ${math`PQ`} itself. Equidistant points lie on the perpendicular bisector.` }],
  official: { source: cite(F19H, 'Q2(ii)'), answer: 'm = -1, c = 2', agrees: true },
});

const a19q2i = auto({
  id: 'a19-q2-i',
  source: cite(F19, 'Q2(i)'),
  title: t`The distance from a fixed point`,
  prompt: t`Find an expression for the distance between ${math`P(${2}, -${2})`} and ${math`X(x, y)`}.`,
  answer: { kind: 'expression', expected: 'sqrt((x - 2)^2 + (y + 2)^2)', variables: ['x', 'y'] },
  solution: [
    t`The horizontal gap is ${math`x - ${2}`} and the vertical gap is ${math`y - (-${2}) = y + ${2}`}.`,
    t`By Pythagoras the distance is ${math`\sqrt{(x - ${2})^{${2}} + (y + ${2})^{${2}}}`}, which expands to ${math`\sqrt{x^{${2}} + y^{${2}} - ${4}x + ${4}y + ${8}}`}.`,
  ],
  reference: 'sqrt((x - 2)^2 + (y + 2)^2)',
  verify: () => {
    const d = (x: number, y: number): number => Math.hypot(x - 2, y + 2);
    return Math.abs(d(5, 2) - 5) < 1e-12 ? null : 'distance to (5, 2) is not 5';
  },
  misconceptions: [{ response: 'sqrt((x - 2)^2 + (y - 2)^2)', why: t`The ${math`y`}-coordinate of ${math`P`} is ${math`-${2}`}, so the vertical gap is ${math`y - (-${2}) = y + ${2}`}.` }],
  official: { source: cite(F19H, 'Q2(i)'), answer: 'sqrt(x^2 + y^2 - 4x + 4y + 8)', agrees: true },
});

const a19q2iii = auto({
  id: 'a19-q2-iii',
  source: cite(F19, 'Q2(iii)', true),
  title: t`Two equations for the same line`,
  prompt: t`Find the values of ${math`a`} and ${math`b`}, with ${math`a > ${0}`}, for which ${math`x + ay = ${2}`} and ${math`ax + ${4}y = b`} describe the same line. (Note that ${math`x + y = ${1}`} and ${math`${2}x + ${2}y = ${2}`} describe the same line.)`,
  answer: namedAnswer(['a', 'b'], [q(2), q(4)], 'The coefficients and the constants must be in the same ratio.'),
  solution: [
    t`Two equations give the same line exactly when one is a multiple of the other: ${math`\frac{a}{${1}} = \frac{${4}}{a} = \frac{b}{${2}}`}.`,
    t`${math`a^{${2}} = ${4}`}, so ${math`a = ${2}`} (taking ${math`a > ${0}`}; ${math`a = -${2}`} gives the other pair, ${math`b = -${4}`}). Then ${math`b = ${2}a = ${4}`}.`,
  ],
  reference: 'a = 2, b = 4',
  verify: () => {
    // Brute force: the second equation is a multiple of the first.
    const found: string[] = [];
    for (let a = -6; a <= 6; a++) for (let b = -10; b <= 10; b++) if (a !== 0 && a * a === 4 && b === 2 * a) found.push(`${a},${b}`);
    return same('pairs with a^2 = 4 and b = 2a', found.join(';'), '-2,-4;2,4');
  },
  misconceptions: [{ response: 'a = 2, b = 2', why: t`The whole equation is scaled: multiplying ${math`x + ${2}y = ${2}`} by ${2} gives ${math`${2}x + ${4}y = ${4}`}, so ${math`b = ${4}`}.` }],
  official: { source: cite(F19H, 'Q2(iii)'), answer: 'a = 2, b = 4', agrees: true },
});

const a19q2iv = auto({
  id: 'a19-q2-iv',
  source: cite(F19, 'Q2(iv)'),
  title: t`Change the subject`,
  prompt: t`Given that ${math`${5} = \frac{${2}px - y}{${1} - p}`}, find ${math`p`} in terms of ${math`x`} and ${math`y`}.`,
  answer: { kind: 'expression', expected: '(5 + y)/(2x + 5)', variables: ['x', 'y'] },
  solution: [
    t`Multiply both sides by ${math`${1} - p`}: ${math`${5} - ${5}p = ${2}px - y`}.`,
    t`Collect the ${math`p`} terms on one side: ${math`${5} + y = ${2}px + ${5}p = p(${2}x + ${5})`}.`,
    t`Divide by ${math`${2}x + ${5}`}: ${math`p = \frac{${5} + y}{${2}x + ${5}}`}.`,
  ],
  reference: '(y + 5)/(2x + 5)',
  verify: () => {
    for (const [x, y] of [[1, 2], [3, -1], [-1, 4]] as const) {
      const p = (5 + y) / (2 * x + 5);
      if (Math.abs((2 * p * x - y) / (1 - p) - 5) > 1e-9) return `fails at x = ${x}, y = ${y}`;
    }
    return null;
  },
  misconceptions: [{ response: '(5 - y)/(2x - 5)', why: t`From ${math`${5} - ${5}p = ${2}px - y`}, add ${math`y`} and ${math`${5}p`} to both sides: ${math`${5} + y = p(${2}x + ${5})`}.` }],
  official: { source: cite(F19H, 'Q2(iv)'), answer: '(5 + y)/(2x + 5)', agrees: true },
});

const a2q2iii = auto({
  id: 'a2-q2-iii',
  source: cite('step-f02', 'Q2(iii)'),
  title: t`The greatest value of a line on an interval`,
  prompt: t`Sketch ${math`y = mx + ${1}`} for ${math`-${2} \le x \le ${2}`} in the cases ${math`m > ${0}`}, ${math`m = ${0}`}, and ${math`m < ${0}`}. Find a single expression for the greatest value of ${math`mx + ${1}`} on this range, valid for every ${math`m`}. (Type ${math`|m|`} as abs(m).)`,
  answer: { kind: 'expression', expected: '1 + 2abs(m)', variables: ['m'] },
  solution: [
    t`A line is greatest at one end of an interval. If ${math`m > ${0}`} it rises, so the greatest value is at ${math`x = ${2}`}: ${math`${2}m + ${1}`}.`,
    t`If ${math`m < ${0}`} it falls, so the greatest is at ${math`x = -${2}`}: ${math`-${2}m + ${1}`}. If ${math`m = ${0}`} it is ${1} everywhere.`,
    t`All three are ${math`${1} + ${2}|m|`}, since ${math`|m| = m`} for ${math`m \ge ${0}`} and ${math`|m| = -m`} for ${math`m < ${0}`}. (The least value is ${math`${1} - ${2}|m|`}.)`,
  ],
  reference: '1 + 2abs(m)',
  verify: () => {
    for (const m of [-3, -0.5, 0, 0.7, 4]) {
      let best = -Infinity;
      for (let i = 0; i <= 400; i++) best = Math.max(best, m * (-2 + i / 100) + 1);
      if (Math.abs(best - (1 + 2 * Math.abs(m))) > 1e-9) return `m = ${m}: greatest ${best}`;
    }
    return null;
  },
  misconceptions: [{ response: '1 + 2m', why: t`For ${math`m < ${0}`} the line falls, so its greatest value is at ${math`x = -${2}`}, which is ${math`${1} - ${2}m`}. Combine the cases with ${math`|m|`}.` }],
  official: { source: cite('step-f02-hints', 'Q2(iii)'), answer: '2abs(m) + 1', agrees: true },
});

// ---------------------------------------------------------------- lesson

const PT_EX: PtP = { x1: 3, y1: -1, mn: 2, md: 1 };

export const straightLines: TopicContent = {
  topicId: 'geom.straight-lines',
  goal: t`Find the equation of a line from a point and a gradient, test for parallel and perpendicular lines, and find the distance between two points.`,
  objective: t`Write the equation of a line, and use gradients and distances in coordinate questions.`,
  why: t`Every coordinate question in STEP, from circles to loci, is built from these few facts.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`The idea` },
    { kind: 'hook', text: t`Pick two points on a page. Now shade every point that is exactly as far from the first as from the second. You get a straight line, cutting the gap between them at right angles. Why a line, and how would you write its equation?` },
    { kind: 'narrative', text: t`To answer that you need three tools: the equation of a line, the rule for when two lines meet at right angles, and the distance between two points. Each comes from one simple idea, and STEP uses all three constantly.` },
    { kind: 'section', title: t`Gradient and the equation of a line` },
    {
      kind: 'definition',
      name: t`Gradient`,
      formal: t`The [[gradient|gradient]] of the line through ${math`(x_{${1}}, y_{${1}})`} and ${math`(x_{${2}}, y_{${2}})`}, with ${math`x_{${1}} \ne x_{${2}}`}, is ${math`m = \frac{y_{${2}} - y_{${1}}}{x_{${2}} - x_{${1}}}`}.`,
      plain: t`How far the line rises for each step of ${1} to the right. From ${math`(${1}, ${2})`} to ${math`(${3}, ${8})`} it rises ${6} in ${2} steps, so ${math`m = ${3}`}.`,
    },
    { kind: 'theorem', name: t`Point and gradient form`, statement: t`The line with gradient ${math`m`} through ${math`(x_{${1}}, y_{${1}})`} is ${math`\{(x, y) : y - y_{${1}} = m(x - x_{${1}})\}`}. Every line is the set of solutions of some ${math`ax + by + c = ${0}`} with ${math`a, b`} not both ${0}.` },
    {
      kind: 'p',
      text: t`The first form says exactly that the gradient from ${math`(x_{${1}}, y_{${1}})`} to any other point ${math`(x, y)`} of the line is ${math`m`}. Multiplying out and moving everything to one side gives the second form; a vertical line ${math`x = k`} is the case ${math`b = ${0}`}.`,
      why: { q: t`Why is that the same as "gradient ${math`m`}"?`, a: t`For ${math`x \ne x_{${1}}`}, dividing ${math`y - y_{${1}} = m(x - x_{${1}})`} by ${math`x - x_{${1}}`} gives ${math`\frac{y - y_{${1}}}{x - x_{${1}}} = m`}; and the point ${math`(x_{${1}}, y_{${1}})`} itself also satisfies it.` },
    },
    checkFrom(throughPoint, PT_EX, t`${math`y + ${1} = ${2}(x - ${3})`}, so ${math`y = ${2}x - ${7}`} and ${math`c = -${7}`}.`),
    { kind: 'section', title: t`Parallel and perpendicular` },
    { kind: 'narrative', text: t`Parallel lines rise at the same rate, so they have equal gradients. Perpendicular lines are subtler: turn a line through a right angle and its gradient ${math`m`} becomes ${math`-\frac{${1}}{m}`}. Here is why.` },
    {
      kind: 'definition',
      name: t`Perpendicular`,
      formal: t`Two lines are [[perpendicular-gradients|perpendicular]] if they meet at a right angle.`,
      plain: t`They cross like the corner of a page. The lines ${math`y = ${2}x`} and ${math`y = -\frac{${1}}{${2}}x`} are an example.`,
    },
    { kind: 'theorem', name: t`Perpendicular gradients`, statement: t`Two lines with gradients ${math`m_{${1}}`} and ${math`m_{${2}}`} are perpendicular if and only if ${math`m_{${1}}m_{${2}} = -${1}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Move to the origin`, text: t`Sliding a line does not change its gradient or its angles, so take the lines ${math`y = m_{${1}}x`} and ${math`y = m_{${2}}x`}, through ${math`O`}.` },
        { label: t`Pick a point on each`, text: t`${math`A(${1}, m_{${1}})`} and ${math`B(${1}, m_{${2}})`}. Then ${math`OA^{${2}} = ${1} + m_{${1}}^{${2}}`}, ${math`OB^{${2}} = ${1} + m_{${2}}^{${2}}`}, and ${math`AB^{${2}} = (m_{${1}} - m_{${2}})^{${2}}`}.`, plain: t`These are distances squared by Pythagoras; ${math`A`} and ${math`B`} are one above the other, so ${math`AB`} is the difference of heights.` },
        { label: t`Pythagoras both ways`, text: t`The angle at ${math`O`} is right if and only if ${math`OA^{${2}} + OB^{${2}} = AB^{${2}}`}.`, why: { q: t`Why "if and only if"?`, a: t`Pythagoras's theorem gives one direction; its converse, also a theorem of Euclid, gives the other.` } },
        { label: t`Simplify`, text: t`${math`${2} + m_{${1}}^{${2}} + m_{${2}}^{${2}} = m_{${1}}^{${2}} - ${2}m_{${1}}m_{${2}} + m_{${2}}^{${2}}`} if and only if ${math`${2} = -${2}m_{${1}}m_{${2}}`}, that is ${math`m_{${1}}m_{${2}} = -${1}`}.` },
      ],
    },
    checkFrom(perpendicular, { a: 2, b: 3 }, t`${math`${2}x + ${3}y = ${5}`} has gradient ${math`-${q(2, 3)}`}, so a perpendicular line has gradient ${q(3, 2)}.`),
    { kind: 'pitfall', claim: t`A line perpendicular to ${math`y = ${2}x`} has gradient ${math`-${2}`}.`, counterexample: t`${math`${2} \times (-${2}) = -${4}`}, not ${math`-${1}`}. The perpendicular gradient is ${math`-\frac{${1}}{${2}}`}: flip the fraction and change the sign.` },
    { kind: 'section', title: t`Distance` },
    {
      kind: 'definition',
      name: t`Distance between two points`,
      formal: t`The [[distance-formula|distance]] between ${math`(x_{${1}}, y_{${1}})`} and ${math`(x_{${2}}, y_{${2}})`} is ${math`\sqrt{(x_{${2}} - x_{${1}})^{${2}} + (y_{${2}} - y_{${1}})^{${2}}}`}.`,
      plain: t`Pythagoras on the right-angled triangle whose sides are the horizontal and vertical gaps. From ${math`(${1}, ${1})`} to ${math`(${4}, ${5})`}: ${math`\sqrt{${9} + ${16}} = ${5}`}.`,
    },
    { kind: 'narrative', text: t`Back to the hook. A point ${math`X`} is as far from ${math`P`} as from ${math`Q`} when ${math`PX^{${2}} = QX^{${2}}`}. Write both with the distance formula and expand: the ${math`x^{${2}}`} and ${math`y^{${2}}`} terms are the same on both sides and cancel. What is left has only ${math`x`}, ${math`y`}, and numbers: an equation ${math`ax + by + c = ${0}`}, which is a straight line. Squaring loses nothing here: distances are never negative, and two numbers that are at least ${0} are equal exactly when their squares are.` },
    { kind: 'pitfall', claim: t`The distance from ${math`(${3}, -${1})`} to ${math`(x, y)`} is ${math`\sqrt{(x - ${3})^{${2}} + (y - ${1})^{${2}}}`}.`, counterexample: t`At ${math`(x, y) = (${3}, -${1})`} that gives ${math`\sqrt{${0} + (-${2})^{${2}}} = ${2}`}, but a point is at distance ${0} from itself. Subtract the coordinate with its sign: ${math`y - (-${1}) = y + ${1}`}.` },
    { kind: 'takeaway', text: t`A line is ${math`y - y_{${1}} = m(x - x_{${1}})`}; parallel lines share ${math`m`}, perpendicular ones have gradients multiplying to ${math`-${1}`}, and distance is Pythagoras.` },
  ],
  examples: [
    withExaminer(workedCambridge(a19q2ii), t`The method the question asks for: both squared distances written out, the squares cancelled, and a simplified line. A midpoint argument would not earn the marks for "by considering the distances".`),
    worked(equidistant, { p1: 1, p2: 3, q1: 5, q2: -1 }, t`Equidistant from two points`),
    worked(throughPoint, { x1: -2, y1: 5, mn: -3, md: 2 }, t`A line with a fractional gradient`),
  ],
  generators: [throughPoint, perpendicular, equidistant],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['gradient', 'perpendicular-gradients', 'distance-formula'],
  cambridge: withUses([a19q2i, a19q2iii, a19q2iv, a2q2iii], {
    'a2-q2-iii': { sections: ['Gradient and the equation of a line'], note: t`The greatest value of a line on an interval, written with a modulus`, needs: ['fn.modulus'] },
    'a19-q2-iii': { sections: ['Gradient and the equation of a line'], note: t`When two equations describe the same line` },
  }),
  // Assignment 19 Q2(iii). 2004 STEP I Q6 is a written proof, so it is set in proof.direct, the first topic
  // that teaches writing one (Rule 1, 2026-10-08). Assignment 2 Q2(iii) needs a modulus in its answer, taught later, so it is practice.
  gate: ['a19-q2-iii'],
  recall: [
    { front: t`The line through ${math`(x_{${1}}, y_{${1}})`} with gradient ${math`m`}?`, back: t`${math`y - y_{${1}} = m(x - x_{${1}})`}.` },
    { front: t`When are two lines perpendicular?`, back: t`When their gradients multiply to ${math`-${1}`} (or one is vertical and the other horizontal).` },
    { front: t`The distance between two points?`, back: t`${math`\sqrt{(x_{${2}} - x_{${1}})^{${2}} + (y_{${2}} - y_{${1}})^{${2}}}`}, by Pythagoras.` },
  ],
  proofOrder: [{
    title: t`Perpendicular gradients multiply to minus one`,
    steps: [
      t`Take the lines ${math`y = m_{${1}}x`} and ${math`y = m_{${2}}x`} through the origin.`,
      t`Take ${math`A(${1}, m_{${1}})`} and ${math`B(${1}, m_{${2}})`}, and find ${math`OA^{${2}}`}, ${math`OB^{${2}}`}, ${math`AB^{${2}}`}.`,
      t`The angle at ${math`O`} is right exactly when ${math`OA^{${2}} + OB^{${2}} = AB^{${2}}`}.`,
      t`Expanding, that is ${math`${2} = -${2}m_{${1}}m_{${2}}`}, so ${math`m_{${1}}m_{${2}} = -${1}`}.`,
    ],
  }],
};
