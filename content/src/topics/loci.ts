/**
 * geom.loci: the locus of points satisfying a distance condition, found by squaring the
 * distances and simplifying: the perpendicular bisector (PX = QX), the circle of Apollonius
 * (AP = k BP), and the parabola (equal distances from a point and a line). Follows STEP
 * Support Foundation Assignment 19 Q2(i), (ii) and Q3 (2005 STEP I Q6: AP = 2BP gives
 * (x + 7)^2 + y^2 = 100). Official answers are from the hints.
 */
import { auto, cite, supervision } from '../cambridge';
import { int, pick, q, str } from '../math';
import { generator, type Misconception } from '../problem';
import { computedMath, dmath, math, paren, t } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';
import { far } from '../partv-a';
import type { Rational } from '@learnhub/mastery';

const mX = math`X`;
/** "+ 3" or "- 3": a signed term for computed expressions. */
const sgn = (n: number): string => (n < 0 ? `- ${-n}` : `+ ${n}`);
const rsgn = (r: Rational): string => (r.num < 0n ? `- ${str(q(-Number(r.num), Number(r.den)))}` : `+ ${str(r)}`);

// ---------------------------------------------------------------- the perpendicular bisector

interface BisP { x1: number; y1: number; x2: number; y2: number }

const bisector = ({ x1, y1, x2, y2 }: BisP): [Rational, Rational] => {
  // 2(x2 - x1)x + 2(y2 - y1)y = x2^2 + y2^2 - x1^2 - y1^2, solved for y.
  const A = 2 * (x2 - x1);
  const B = 2 * (y2 - y1);
  const C = x2 * x2 + y2 * y2 - x1 * x1 - y1 * y1;
  return [q(-A, B), q(C, B)];
};

const perpBisector = generator<BisP>({
  id: 'perpendicular-bisector',
  skill: 'Find the locus of points equidistant from two points: set PX^2 = QX^2, and the squares of x and y cancel to leave a line.',
  params: (rng) => {
    for (;;) {
      const p = { x1: int(rng, -6, 6), y1: int(rng, -6, 6), x2: int(rng, -6, 6), y2: int(rng, -6, 6) };
      if (p.x1 !== p.x2 && p.y1 !== p.y2) return p;
    }
  },
  sane: ({ x1, x2, y1, y2 }) => (x1 !== x2 && y1 !== y2 ? null : 'axis-parallel'),
  problem: (p) => {
    const [m, c] = bisector(p);
    const A = 2 * (p.x2 - p.x1);
    const B = 2 * (p.y2 - p.y1);
    const C = p.x2 ** 2 + p.y2 ** 2 - p.x1 ** 2 - p.y1 ** 2;
    return {
      prompt: t`The point ${mX} is equidistant from ${math`P = (${p.x1}, ${p.y1})`} and ${math`Q = (${p.x2}, ${p.y2})`}. Its locus is the line ${math`y = mx + c`}. Find ${math`m`} and ${math`c`}.`,
      answer: {
        kind: 'witness', count: 2, names: ['m', 'c'], example: `m = ${str(m)}, c = ${str(c)}`,
        check: (v) => (v.map(str).join(',') === `${str(m)},${str(c)}` ? null : 'Write PX^2 = QX^2 out in full; the x^2 and y^2 terms cancel.'),
      },
      solution: [
        t`${math`PX = QX`} exactly when ${math`PX^{${2}} = QX^{${2}}`}, since both are at least ${0}: ${math`(x - ${paren(p.x1)})^{${2}} + (y - ${paren(p.y1)})^{${2}} = (x - ${paren(p.x2)})^{${2}} + (y - ${paren(p.y2)})^{${2}}`}.`,
        t`Expand both sides. The ${math`x^{${2}}`} and ${math`y^{${2}}`} terms cancel, leaving ${computedMath(`${A}x ${sgn(B)}y = ${C}`)}.`,
        t`Solve for ${math`y`}: ${computedMath(`y = ${str(m)}*x ${rsgn(c)}`)}. It passes through the midpoint ${math`\left(${q(p.x1 + p.x2, 2)}, ${q(p.y1 + p.y2, 2)}\right)`} at right angles to ${math`PQ`}.`,
      ],
    };
  },
  solve: (p) => {
    // Geometry: through the midpoint, gradient the negative reciprocal of PQ's.
    const m = q(-(p.x2 - p.x1), p.y2 - p.y1);
    const mx = q(p.x1 + p.x2, 2);
    const my = q(p.y1 + p.y2, 2);
    const c = q(Number(my.num) * Number(mx.den) * Number(m.den) - Number(m.num) * Number(mx.num) * Number(my.den), Number(my.den) * Number(mx.den) * Number(m.den));
    return `m = ${str(m)}, c = ${str(c)}`;
  },
  misconceptions: (p): Misconception[] => {
    const [m, c] = bisector(p);
    const slopePQ = q(p.y2 - p.y1, p.x2 - p.x1);
    const out: Misconception[] = [
      { response: `m = ${str(slopePQ)}, c = ${str(c)}`, why: t`That is the gradient of ${math`PQ`} itself. The bisector is perpendicular to it: gradients multiply to ${math`-${1}`}.` },
      { response: `m = ${str(q(-Number(m.num), Number(m.den)))}, c = ${str(c)}`, why: t`Check the sign of the gradient: expand both squares carefully, and keep the signs of the coordinates.` },
    ];
    // Through P instead of the midpoint.
    const cP = q(p.y1 * Number(m.den) - Number(m.num) * p.x1, Number(m.den));
    out.push({ response: `m = ${str(m)}, c = ${str(cP)}`, why: t`The bisector passes through the midpoint of ${math`PQ`}, not through ${math`P`}.` });
    return out;
  },
});

// ---------------------------------------------------------------- the circle of Apollonius

interface ApoP { k: 2 | 3; p: number; d: number; h: number }

const apollo = ({ k, p, d, h }: ApoP): [number, number, number] => {
  const k2 = k * k;
  return [p + (k2 * d) / (k2 - 1), h, (k * d) / (k2 - 1)];
};

const apollonius = generator<ApoP>({
  id: 'apollonius',
  skill: 'Find the circle of Apollonius AP = k BP: square both distances, collect, divide by k^2 - 1, and complete the square.',
  params: (rng) => {
    const k = pick(rng, [2, 3] as const);
    const unit = k * k - 1;
    return { k, p: int(rng, -6, 4), d: unit * int(rng, 1, 2) * pick(rng, [1, -1]), h: int(rng, -4, 4) };
  },
  sane: (p) => (apollo(p).every(Number.isInteger) ? null : 'not integral'),
  problem: (pr) => {
    const { k, p, d, h } = pr;
    const [a, b, r] = apollo(pr);
    const k2 = k * k;
    return {
      prompt: t`The point ${math`P`} moves so that ${math`AP = ${k}BP`}, where ${math`A = (${p}, ${h})`} and ${math`B = (${p + d}, ${h})`}. Its path is the circle ${math`(x - a)^{${2}} + (y - b)^{${2}} = r^{${2}}`} with ${math`r > ${0}`}. Find ${math`a`}, ${math`b`}, ${math`r`}.`,
      answer: {
        kind: 'witness', count: 3, names: ['a', 'b', 'r'], example: `a = ${a}, b = ${b}, r = ${Math.abs(r)}`,
        check: (v) => (v.map(str).join(',') === `${a},${b},${Math.abs(r)}` ? null : `Square: AP^2 = ${k2} BP^2, then collect the terms and complete the square.`),
      },
      solution: [
        t`Square: ${math`AP^{${2}} = ${k2}BP^{${2}}`}, so ${math`(x - ${paren(p)})^{${2}} + (y - ${paren(h)})^{${2}} = ${k2}\left((x - ${paren(p + d)})^{${2}} + (y - ${paren(h)})^{${2}}\right)`}.`,
        t`Move everything to one side: the squares appear with coefficient ${k2 - 1} on the right. Divide by ${k2 - 1} and complete the square in ${math`x`} and ${math`y`}.`,
        t`The result is ${computedMath(`(x - ${a})^${2} + (y - ${b})^${2} = ${r * r}`)}: centre ${math`(${a}, ${b})`} on the line ${math`AB`}, radius ${Math.abs(r)}. Check: the path crosses ${math`AB`} at the two points dividing it in the ratio ${math`${k} : ${1}`}, inside and outside.`,
      ],
    };
  },
  solve: (pr) => {
    // The two points on line AB with AP = k BP: inside, P = (A + kB)/(k + 1); outside, P = (kB - A)/(k - 1). They are the ends of a diameter.
    const { k, p, d, h } = pr;
    const inside = (p + k * (p + d)) / (k + 1);
    const outside = (k * (p + d) - p) / (k - 1);
    return `a = ${(inside + outside) / 2}, b = ${h}, r = ${Math.abs(outside - inside) / 2}`;
  },
  misconceptions: (pr): Misconception[] => {
    const [a, b, r] = apollo(pr);
    const k2 = pr.k * pr.k;
    return [
      { response: `a = ${a}, b = ${b}, r = ${r * r}`, why: t`That is ${math`r^{${2}}`}; the radius is its square root.` },
      { response: `a = ${pr.p + pr.d / 2}, b = ${b}, r = ${Math.abs(pr.d) / 2}`, why: t`That is the circle on ${math`AB`} as diameter. With ${math`k \neq ${1}`} the circle is pushed towards ${math`B`}: square ${math`AP = ${pr.k}BP`} into ${math`AP^{${2}} = ${k2}BP^{${2}}`} and complete the square.` },
      { response: `a = ${-a}, b = ${-b}, r = ${Math.abs(r)}`, why: t`The signs of the centre are flipped: ${math`(x - a)^{${2}}`} with ${math`a = ${a}`}.` },
    ];
  },
});

// ---------------------------------------------------------------- equidistant from a point and a line

interface ParP { p: number; qq: number }

const parabola = generator<ParP>({
  id: 'point-and-line',
  skill: 'Find the locus of points equidistant from a point (0, p) and the line y = q: a parabola, by squaring both distances.',
  params: (rng) => {
    for (;;) {
      const p = int(rng, -5, 5);
      const qq = int(rng, -5, 5);
      if (p !== qq) return { p, qq };
    }
  },
  sane: ({ p, qq }) => (p !== qq ? null : 'degenerate'),
  problem: ({ p, qq }) => {
    const den = 2 * (p - qq);
    const k = p * p - qq * qq;
    const expected = `(x^2 + ${k})/${den}`;
    return {
      prompt: t`The point ${math`X = (x, y)`} is the same distance from the point ${math`(${0}, ${p})`} as from the line ${math`y = ${qq}`}. Find ${math`y`} in terms of ${math`x`}.`,
      answer: { kind: 'expression', expected, variables: ['x'] },
      solution: [
        t`The distance from ${mX} to the line ${math`y = ${qq}`} is ${math`|y - ${paren(qq)}|`}, and to the point it is ${math`\sqrt{x^{${2}} + (y - ${paren(p)})^{${2}}}`}. Square both: ${math`x^{${2}} + (y - ${paren(p)})^{${2}} = (y - ${paren(qq)})^{${2}}`}.`,
        t`Expand both squares. The ${math`y^{${2}}`} terms cancel, and collecting the rest gives ${computedMath(`${den}y = x^${2} ${sgn(k)}`)}.`,
        t`So ${computedMath(`y = (x^${2} ${sgn(k)})/${den}`)}: a parabola, the shape of a satellite dish.`,
      ],
    };
  },
  solve: ({ p, qq }) => {
    // At three values of x, solve for y numerically by bisection on the distance difference, then fit y = Ax^2 + C.
    const yAt = (x: number): number => (x * x + p * p - qq * qq) / (2 * (p - qq));
    const y0 = yAt(0);
    const A = yAt(1) - y0;
    return `${A}x^2 + ${y0}`;
  },
  misconceptions: ({ p, qq }): Misconception[] => {
    const den = 2 * (p - qq);
    const k = p * p - qq * qq;
    return [
      { response: `(x^2 + ${k})/${-den}`, why: t`Check the sign when you collect the ${math`y`} terms: the parabola opens towards the point ${math`(${0}, ${p})`}.` },
      { response: `(x^2 + ${k})/${p - qq}`, why: t`The ${math`y`} terms are ${math`-${2}py`} and ${math`-${2}qy`}: the coefficient is ${math`${2}(p - q)`}.` },
      { response: `x^2/${den}`, why: t`Keep the constant ${math`p^{${2}} - q^{${2}}`} from the two squares.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

const a19q2 = auto({
  id: 'a19-q2-ii',
  source: cite('step-f19', 'Q2(ii)'),
  title: t`Points equidistant from two points`,
  prompt: t`${math`P = (${2}, -${2})`} and ${math`Q = (${4}, ${0})`}. By considering the distances ${math`PX`} and ${math`QX`}, find the equation of the line of points ${math`X = (x, y)`} equidistant from ${math`P`} and ${math`Q`}, in the form ${math`y = mx + c`}. Give ${math`m`} and ${math`c`}.`,
  answer: {
    kind: 'witness', count: 2, names: ['m', 'c'], example: 'm = -1, c = 2',
    check: (v) => (v.map(str).join(',') === '-1,2' ? null : 'Set PX^2 = QX^2 and simplify.'),
  },
  solution: [
    t`${math`PX^{${2}} = (x - ${2})^{${2}} + (y + ${2})^{${2}} = x^{${2}} + y^{${2}} - ${4}x + ${4}y + ${8}`}, and ${math`QX^{${2}} = x^{${2}} + y^{${2}} - ${8}x + ${16}`}.`,
    t`Setting them equal: ${math`-${4}x + ${4}y + ${8} = -${8}x + ${16}`}, so ${math`${4}x + ${4}y = ${8}`}, that is ${math`x + y = ${2}`}, or ${math`y = -x + ${2}`}.`,
  ],
  reference: 'm = -1, c = 2',
  verify: () => {
    for (const x of [-3, 0, 1.5, 7]) {
      const y = -x + 2;
      if (far(Math.hypot(x - 2, y + 2), Math.hypot(x - 4, y))) return `x = ${x}`;
    }
    return null;
  },
  misconceptions: [{ response: 'm = 1, c = -4', why: t`That is the line ${math`PQ`} itself. The bisector is perpendicular to it.` }],
  official: { source: cite('step-f19-hints', 'Q2(ii)'), answer: 'm = -1, c = 2', agrees: true },
});

const a19q3i = auto({
  id: 'a19-q3-i',
  source: cite('step-f19', 'Q3(i)'),
  title: t`A circle of Apollonius`,
  prompt: t`The point ${math`A`} is ${math`(${5}, ${16})`} and ${math`B`} is ${math`(-${4}, ${4})`}. The point ${math`P = (x, y)`} moves so that ${math`AP = ${2}BP`}. Its path is the circle ${math`(x - a)^{${2}} + (y - b)^{${2}} = r^{${2}}`} with ${math`r > ${0}`}. Give ${math`a`}, ${math`b`}, ${math`r`}.`,
  answer: {
    kind: 'witness', count: 3, names: ['a', 'b', 'r'], example: 'a = -7, b = 0, r = 10',
    check: (v) => (v.map(str).join(',') === '-7,0,10' ? null : 'Square: AP^2 = 4 BP^2, collect, divide by 3, and complete the square.'),
  },
  solution: [
    t`Square: ${math`(x - ${5})^{${2}} + (y - ${16})^{${2}} = ${4}\left((x + ${4})^{${2}} + (y - ${4})^{${2}}\right)`}.`,
    t`Expand: ${math`x^{${2}} - ${10}x + y^{${2}} - ${32}y + ${281} = ${4}x^{${2}} + ${32}x + ${4}y^{${2}} - ${32}y + ${128}`}. The ${math`y`} terms cancel, leaving ${math`${3}x^{${2}} + ${3}y^{${2}} + ${42}x = ${153}`}.`,
    t`Divide by ${3}: ${math`x^{${2}} + ${14}x + y^{${2}} = ${51}`}. Complete the square: ${math`(x + ${7})^{${2}} + y^{${2}} = ${51} + ${49} = ${100}`}.`,
  ],
  reference: 'a = -7, b = 0, r = 10',
  verify: () => {
    for (const th of [0, 1, 2.5, 4]) {
      const [x, y] = [-7 + 10 * Math.cos(th), 10 * Math.sin(th)];
      if (far(Math.hypot(x - 5, y - 16), 2 * Math.hypot(x + 4, y - 4))) return `theta = ${th}`;
    }
    return null;
  },
  misconceptions: [{ response: 'a = 7, b = 0, r = 10', why: t`${math`(x + ${7})^{${2}}`} means the centre has ${math`x = -${7}`}.` }],
  official: { source: cite('step-f19-hints', 'Q3(i)'), answer: 'a = -7, b = 0, r = 10', agrees: true },
});

const a19q3 = supervision({
  id: 'a19-q3-ii',
  source: cite('step-f19', 'Q3(ii)'),
  title: t`The same circle from two other points`,
  prompt: t`(${2005} STEP I Q${6}(ii)) The path of ${math`P`} is ${math`(x + ${7})^{${2}} + y^{${2}} = ${100}`}. The point ${math`C`} has coordinates ${math`(a, ${0})`} and ${math`D`} has coordinates ${math`(b, ${0})`}, where ${math`a \neq b`}. The point ${math`Q`} moves on a path such that ${math`QC = k \times QD`}, where ${math`k > ${1}`}. Given that the path of ${math`Q`} is the same as the path of ${math`P`}, show that ${math`\frac{a + ${7}}{a^{${2}} + ${51}} = \frac{b + ${7}}{b^{${2}} + ${51}}`}, and show further that ${math`(a + ${7})(b + ${7}) = ${100}`}.`,
  writeUp: 'proof',
  official: cite('step-f19-hints', 'Q3(ii)'),
});

// ---------------------------------------------------------------- lesson

export const loci: TopicContent = {
  topicId: 'geom.loci',
  goal: t`Find the equation of the set of points satisfying a distance condition, such as the perpendicular bisector or the circle ${math`AP = ${2}BP`}.`,
  objective: t`Turn a condition on distances into the equation of a curve, by squaring and simplifying.`,
  why: t`STEP sets loci regularly, and describing a set by a condition is how curves are defined in mathematics.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`A rule for where a point may go` },
    { kind: 'hook', text: t`Two lighthouses stand ${9} miles apart, and a ship moves so that it is always twice as far from the first as from the second. What path does it trace? You might expect something lopsided and complicated. It is a perfect circle, and squaring two distances proves it.` },
    { kind: 'definition', name: t`Locus`, formal: t`The [[locus|locus]] of a condition on a point ${mX} is the set of all points ${mX} satisfying it. Its equation is a relation between ${math`x`} and ${math`y`} that holds exactly when ${math`X = (x, y)`} satisfies the condition.`, plain: t`The path traced out by a point obeying the rule. "At distance ${5} from the origin" has locus the circle ${math`x^{${2}} + y^{${2}} = ${25}`}.` },
    { kind: 'narrative', text: t`The recipe never changes. Write each distance with the distance formula, square to remove the square roots, expand, and simplify. Squaring is safe for distances: both sides are at least ${0}, so equal squares mean equal distances.` },
    { kind: 'section', title: t`Equidistant from two points` },
    { kind: 'theorem', name: t`Perpendicular bisector`, statement: t`For distinct points ${math`P`} and ${math`Q`}, the locus of points ${mX} with ${math`PX = QX`} is the line through the midpoint of ${math`PQ`} perpendicular to ${math`PQ`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Square`, text: t`With ${math`P = (p_{${1}}, p_{${2}})`}, ${math`Q = (q_{${1}}, q_{${2}})`}: ${math`PX = QX`} if and only if ${math`(x - p_{${1}})^{${2}} + (y - p_{${2}})^{${2}} = (x - q_{${1}})^{${2}} + (y - q_{${2}})^{${2}}`}.` },
        { label: t`The squares cancel`, text: t`Expanding, ${math`x^{${2}}`} and ${math`y^{${2}}`} appear on both sides and cancel:`, eq: [dmath`${2}(q_{${1}} - p_{${1}})x + ${2}(q_{${2}} - p_{${2}})y = q_{${1}}^{${2}} + q_{${2}}^{${2}} - p_{${1}}^{${2}} - p_{${2}}^{${2}}.`], plain: t`Since ${math`P \neq Q`}, not both coefficients are ${0}: this is a straight line.` },
        { label: t`Identify it`, text: t`The midpoint ${math`M`} of ${math`PQ`} satisfies ${math`PM = QM`}, so it is on the line. And the line's normal direction ${math`(q_{${1}} - p_{${1}}, q_{${2}} - p_{${2}})`} is the direction of ${math`PQ`}, so the line is perpendicular to ${math`PQ`}.`, why: { q: t`Why is the line perpendicular to the direction of its coefficients?`, a: t`For two points on ${math`ax + by = c`}, subtracting gives ${math`a\,\Delta x + b\,\Delta y = ${0}`}: every step along the line is at right angles to ${math`(a, b)`}.` } },
      ],
    },
    checkFrom(perpBisector, { x1: 1, y1: 2, x2: 5, y2: 4 }, t`Set ${math`PX^{${2}} = QX^{${2}}`}; the squares cancel and leave a line through the midpoint ${math`(${3}, ${3})`}.`),
    { kind: 'section', title: t`A fixed ratio of distances` },
    { kind: 'theorem', name: t`Circle of Apollonius`, statement: t`For distinct points ${math`A`}, ${math`B`} and a constant ${math`k > ${0}`} with ${math`k \neq ${1}`}, the locus of ${math`P`} with ${math`AP = k \cdot BP`} is a circle with its centre on the line ${math`AB`}.` },
    { kind: 'p', text: t`Why: squaring gives ${math`AP^{${2}} = k^{${2}}BP^{${2}}`}. Now the squares do not cancel: ${math`x^{${2}} + y^{${2}}`} has coefficient ${1} on the left and ${math`k^{${2}}`} on the right, leaving ${math`(k^{${2}} - ${1})(x^{${2}} + y^{${2}})`} plus terms of degree at most ${1}. Dividing by ${math`k^{${2}} - ${1} \neq ${0}`} gives the shape ${math`x^{${2}} + y^{${2}} + Dx + Ey + F = ${0}`}, and it contains points (those dividing ${math`AB`} in the ratio ${math`k : ${1}`}), so it is a circle. Choosing axes along ${math`AB`} makes ${math`E = ${0}`}, so the centre is on ${math`AB`}.` },
    checkFrom(apollonius, { k: 2, p: 0, d: 3, h: 0 }, t`Square to ${math`AP^{${2}} = ${4}BP^{${2}}`}, collect, divide by ${3}, and complete the square.`),
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`${math`AP = k \cdot BP`} is always a circle.`, counterexample: t`With ${math`k = ${1}`} the squares cancel and the locus is a straight line, the perpendicular bisector. The circle exists only for ${math`k \neq ${1}`}.` },
    { kind: 'pitfall', claim: t`Squaring an equation never changes its solutions.`, counterexample: t`${math`y = -${2}`} has one solution, but ${math`y^{${2}} = ${4}`} has two. It is safe for distances only because both sides are known to be at least ${0}; squaring ${math`x - ${1} = \sqrt{x + ${5}}`} adds the false solution ${math`x = -${1}`}.` },
    { kind: 'takeaway', text: t`To find a locus, write the distances, square, and simplify: equal distances give a line, a fixed ratio other than ${1} gives a circle.` },
  ],
  examples: [
    workedCambridge(a19q2),
    worked(apollonius, { k: 3, p: -2, d: 8, h: 1 }, t`A circle of Apollonius with ratio ${3}`),
    worked(parabola, { p: 2, qq: -2 }, t`Equidistant from a point and a line`),
  ],
  generators: [perpBisector, apollonius, parabola],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['locus'],
  cambridge: [a19q3i, a19q3],
  gate: ['a19-q3-i', 'a19-q3-ii'],
  recall: [
    { front: t`What is the locus of points equidistant from ${math`P`} and ${math`Q`}?`, back: t`The perpendicular bisector of ${math`PQ`}: the line through the midpoint at right angles to ${math`PQ`}.` },
    { front: t`What is the locus ${math`AP = k \cdot BP`} for ${math`k \neq ${1}`}?`, back: t`A circle, the circle of Apollonius, with its centre on ${math`AB`}.` },
  ],
  proofOrder: [
    {
      title: t`The perpendicular bisector`,
      steps: [
        t`Write ${math`PX = QX`} as ${math`PX^{${2}} = QX^{${2}}`}, safe since both are at least ${0}.`,
        t`Expand; the ${math`x^{${2}}`} and ${math`y^{${2}}`} terms cancel, leaving a line.`,
        t`The midpoint of ${math`PQ`} lies on it.`,
        t`Its normal is along ${math`PQ`}, so it is perpendicular to ${math`PQ`}.`,
      ],
    },
  ],
};
