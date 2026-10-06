/**
 * geom.intersections: where lines, circles, and ellipses meet, by substitution, and the
 * discriminant to tell crossing, touching, and missing apart. Follows STEP Support
 * Foundation Assignment 8 Q2(ii) to (iv) (two circles; a circle and an ellipse meeting in
 * three points) and Q3 (2002 STEP I Q1: two ellipses, and the circles through their
 * intersections), and Assignment 23 Q2(ii), (iii) (lines and circles; the tangents to
 * y = x^2 from (0, -1)). Official answers are from the hints.
 */
import { auto, cite, supervision } from '../cambridge';
import { listText, pointsKey, valuesKey } from '../geometry';
import { int, pick, q, sample } from '../math';
import { generator, type Misconception } from '../problem';
import { computedMath, math, paren, t } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';
import { poly } from '../poly';

const keyOf = (xs: readonly number[], dim = 2): string => pointsKey(xs.map((x) => q(x)), dim);
/** "3x + 4y = 25", "x - 2y = 3": a line with integer coefficients, as expression text. */
const lineText = (a: number, b: number, c: number): string => {
  const xs = a === 0 ? '' : `${a === 1 ? '' : a === -1 ? '-' : a}x`;
  const ys = b === 0 ? '' : xs === '' ? `${b === 1 ? '' : b === -1 ? '-' : b}y` : ` ${b < 0 ? '-' : '+'} ${Math.abs(b) === 1 ? '' : Math.abs(b)}y`;
  return `${xs}${ys} = ${c}`;
};

// ---------------------------------------------------------------- how many points

interface CountP { a: number; b: number; r: number; c: number }

const pointCount = ({ a, b, r, c }: CountP): number => {
  const d2 = c * c;
  const R2 = r * r * (a * a + b * b);
  return d2 < R2 ? 2 : d2 === R2 ? 1 : 0;
};

const countPoints = generator<CountP>({
  id: 'line-circle-count',
  skill: 'Substitute a line into a circle and use the discriminant of the quadratic to count the points where they meet.',
  quick: true,
  params: (rng) => {
    const [a, b] = pick(rng, [[3, 4], [4, 3], [5, 12], [12, 5], [4, -3], [3, -4]] as const);
    const h = Math.hypot(a, b);
    const r = int(rng, 1, 4);
    const kind = pick(rng, [0, 1, 2]);
    const c = (rng() < 0.5 ? 1 : -1) * (kind === 1 ? r * h : kind === 2 ? int(rng, 0, r * h - 1) : int(rng, r * h + 1, r * h + 9));
    return { a, b, r, c };
  },
  sane: ({ a, b }) => (Number.isInteger(Math.hypot(a, b)) ? null : 'not a triple'),
  problem: (p) => {
    const { a, b, r, c } = p;
    const n = pointCount(p);
    // Substitute y = (c - a x) / b: (a^2 + b^2) x^2 - 2ac x + c^2 - b^2 r^2 = 0.
    const [A, B, C] = [a * a + b * b, -2 * a * c, c * c - b * b * r * r];
    const disc = B * B - 4 * A * C;
    return {
      prompt: t`In how many points does the line ${computedMath(lineText(a, b, c))} meet the circle ${math`x^{${2}} + y^{${2}} = ${r * r}`}?`,
      answer: { kind: 'exact', expected: String(n) },
      solution: [
        t`From the line, ${computedMath(`y = (${c} - ${a}x)/${b}`)}. Substitute into the circle and multiply by ${math`${b * b}`}: ${computedMath(`${poly([A, B, C])} = ${0}`)}.`,
        t`Each real root ${math`x`} gives one point, since the line fixes ${math`y`}. The discriminant is ${math`${paren(B)}^{${2}} - ${4} \times ${A} \times ${paren(C)} = ${disc}`}.`,
        n === 2 ? t`It is positive: two real roots, so the line crosses the circle in ${2} points.` : n === 1 ? t`It is ${0}: one repeated root, so the line touches the circle at ${1} point. It is a tangent.` : t`It is negative: no real roots, so the line misses the circle: ${0} points.`,
      ],
    };
  },
  solve: ({ a, b, r, c }) => {
    // Geometry instead of algebra: compare the distance of the centre from the line, |c| / sqrt(a^2 + b^2), with r.
    const d = Math.abs(c) / Math.hypot(a, b);
    return String(Math.abs(d - r) < 1e-12 ? 1 : d < r ? 2 : 0);
  },
  misconceptions: (p): Misconception[] => {
    const n = pointCount(p);
    return [0, 1, 2].filter((k) => k !== n).map((k) => ({
      response: String(k),
      why: k === 1 ? t`One point means the discriminant is exactly ${0}. Compute it: here it is ${n === 2 ? t`positive` : t`negative`}.` : k === 2 ? t`Two points need a positive discriminant. Here it is ${n === 1 ? t`${0}` : t`negative`}; check the sign of each term.` : t`No points needs a negative discriminant. Here it is ${n === 1 ? t`${0}` : t`positive`}.`,
    }));
  },
});

// ---------------------------------------------------------------- the points themselves

const LATTICE25: readonly (readonly [number, number])[] = [[3, 4], [4, 3], [-3, 4], [-4, 3], [3, -4], [4, -3], [-3, -4], [-4, -3], [5, 0], [-5, 0], [0, 5], [0, -5]];

interface PtsP { i: number; j: number }

const linePoints = generator<PtsP>({
  id: 'line-circle-points',
  skill: 'Find the points where a line meets a circle: substitute, solve the quadratic, and find the other coordinate from the line.',
  params: (rng) => {
    for (;;) {
      const [i, j] = sample(rng, LATTICE25.map((_, k) => k), 2) as [number, number];
      const [P, Q] = [LATTICE25[i] as readonly [number, number], LATTICE25[j] as readonly [number, number]];
      // Not a diameter through the origin, and not vertical or horizontal, so the substitution is a real step.
      if (P[0] + Q[0] === 0 && P[1] + Q[1] === 0) continue;
      if (P[0] === Q[0] || P[1] === Q[1]) continue;
      return { i, j };
    }
  },
  sane: () => null,
  problem: ({ i, j }) => {
    const [x1, y1] = LATTICE25[i] as readonly [number, number];
    const [x2, y2] = LATTICE25[j] as readonly [number, number];
    // Line through the two points: a x + b y = c.
    const [a, b] = [y2 - y1, x1 - x2];
    const c = a * x1 + b * y1;
    const pts = [x1, y1, x2, y2];
    // Substitute x = (c - b y)/a: (a^2 + b^2) y^2 - 2bc y + c^2 - 25 a^2 = 0, with roots y1, y2.
    const [A, B, C] = [a * a + b * b, -2 * b * c, c * c - 25 * a * a];
    return {
      prompt: t`Find the points where the line ${computedMath(lineText(a, b, c))} meets the circle ${math`x^{${2}} + y^{${2}} = ${25}`}. Give them as ${math`x_{${1}}, y_{${1}}, x_{${2}}, y_{${2}}`}.`,
      answer: {
        kind: 'witness', count: 4, example: listText(pts),
        check: (v) => (pointsKey(v, 2) === keyOf(pts) ? null : 'Substitute each point into both equations: it must satisfy both.'),
      },
      solution: [
        t`From the line, ${computedMath(`x = (${c} - ${b}y)/${a}`)}. Substitute into the circle and multiply by ${math`${a * a}`}: ${computedMath(`${poly([A, B, C], 'y')} = ${0}`)}.`,
        t`Its roots are ${math`y = ${y1}`} and ${math`y = ${y2}`} (check: their sum is ${math`${-B}/${A}`} and their product ${math`${C}/${A}`}).`,
        t`The line gives ${math`x`}: ${math`y = ${y1}`} gives ${math`x = ${x1}`}, and ${math`y = ${y2}`} gives ${math`x = ${x2}`}. The points are ${math`(${x1}, ${y1})`} and ${math`(${x2}, ${y2})`}.`,
      ],
    };
  },
  solve: ({ i, j }) => {
    // Brute force: every lattice point of the circle that lies on the line.
    const [x1, y1] = LATTICE25[i] as readonly [number, number];
    const [x2, y2] = LATTICE25[j] as readonly [number, number];
    const [a, b] = [y2 - y1, x1 - x2];
    const c = a * x1 + b * y1;
    const out: number[] = [];
    for (let x = -5; x <= 5; x++) for (let y = -5; y <= 5; y++) if (x * x + y * y === 25 && a * x + b * y === c) out.push(x, y);
    return listText(out);
  },
  misconceptions: ({ i, j }): Misconception[] => {
    const [x1, y1] = LATTICE25[i] as readonly [number, number];
    const [x2, y2] = LATTICE25[j] as readonly [number, number];
    return [
      { response: listText([y1, x1, y2, x2]), why: t`The coordinates are swapped: give each point as ${math`x`} then ${math`y`}.` },
      { response: listText([x1, -y1, x2, -y2]), why: t`Check the signs of ${math`y`}: substitute each point into the line, not only into the circle, which cannot tell ${math`y`} from ${math`-y`}.` },
      { response: listText([x1, y2, x2, y1]), why: t`Each root ${math`y`} must be paired with the ${math`x`} the line gives for it, not the other one.` },
    ];
  },
});

// ---------------------------------------------------------------- tangents to a parabola

interface TanP { s: number }

const tangentSlopes = generator<TanP>({
  id: 'tangent-slopes',
  skill: 'Find the gradients a for which the line y = ax - c touches y = x^2, by setting the discriminant of x^2 - ax + c = 0 to zero.',
  params: (rng) => ({ s: int(rng, 1, 9) }),
  sane: ({ s }) => (s >= 1 ? null : 'out of range'),
  problem: ({ s }) => {
    const c = s * s;
    return {
      prompt: t`For which values of ${math`a`} does the line ${math`y = ax - ${c}`} touch the curve ${math`y = x^{${2}}`}? Give both values.`,
      answer: {
        kind: 'witness', count: 2, unordered: true, example: listText([2 * s, -2 * s]),
        check: (v) => (valuesKey(v) === valuesKey([q(2 * s), q(-2 * s)]) ? null : 'The line touches when the quadratic for x has a repeated root.'),
      },
      solution: [
        t`Where they meet, ${math`x^{${2}} = ax - ${c}`}, that is ${math`x^{${2}} - ax + ${c} = ${0}`}.`,
        t`The line touches the curve when this has a repeated root: discriminant ${math`a^{${2}} - ${4} \times ${c} = ${0}`}, so ${math`a^{${2}} = ${4 * c}`}.`,
        t`So ${math`a = ${2 * s}`} or ${math`a = -${2 * s}`}: the two tangents from ${math`(${0}, -${c})`}, one on each side.`,
      ],
    };
  },
  solve: ({ s }) => {
    // Search integer slopes for a double root of x^2 - a x + s^2.
    const out: number[] = [];
    for (let a = -100; a <= 100; a++) if (a * a - 4 * s * s === 0) out.push(a);
    return listText(out);
  },
  misconceptions: ({ s }): Misconception[] => [
    { response: listText([s, -s]), why: t`The discriminant is ${math`a^{${2}} - ${4}c`}, with a ${4}: ${math`a^{${2}} = ${4 * s * s}`}.` },
    { response: listText([4 * s * s, -4 * s * s]), why: t`That is ${math`\pm a^{${2}}`}. Take the square root: ${math`a = \pm ${2 * s}`}.` },
    { response: listText([2 * s * s, -2 * s * s]), why: t`Take the square root of ${math`a^{${2}} = ${4 * s * s}`}: ${math`a = \pm ${2 * s}`}.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const a8q2a = auto({
  id: 'a8-q2-ii-a',
  source: cite('step-f08', 'Q2(ii)(a)'),
  title: t`Two circles that cross`,
  prompt: t`Find the real solutions of ${math`x^{${2}} + y^{${2}} = ${25}`} and ${math`x^{${2}} + (y - ${7})^{${2}} = ${18}`}. Give the points as ${math`x_{${1}}, y_{${1}}, x_{${2}}, y_{${2}}`}.`,
  answer: {
    kind: 'witness', count: 4, example: '3, 4, -3, 4',
    check: (v) => (pointsKey(v, 2) === keyOf([3, 4, -3, 4]) ? null : 'Subtract the equations to find y, then find x from either circle.'),
  },
  solution: [
    t`Expand the second: ${math`x^{${2}} + y^{${2}} - ${14}y + ${49} = ${18}`}. Subtract the first equation: ${math`-${14}y + ${49} = ${18} - ${25}`}, so ${math`${14}y = ${56}`} and ${math`y = ${4}`}.`,
    t`Then ${math`x^{${2}} = ${25} - ${16} = ${9}`}, so ${math`x = ${3}`} or ${math`x = -${3}`}. The circles cross at ${math`(${3}, ${4})`} and ${math`(-${3}, ${4})`}.`,
  ],
  reference: '3, 4, -3, 4',
  verify: () => {
    const out: number[] = [];
    for (let x = -6; x <= 6; x++) for (let y = -6; y <= 12; y++) if (x * x + y * y === 25 && x * x + (y - 7) ** 2 === 18) out.push(x, y);
    return keyOf(out) === keyOf([3, 4, -3, 4]) ? null : `brute force found ${out.join(', ')}`;
  },
  misconceptions: [{ response: '3, 4, 3, -4', why: t`Both points have ${math`y = ${4}`}; the two values of ${math`x`} are ${math`\pm ${3}`}.` }],
  official: { source: cite('step-f08-hints', 'Q2(ii)(a)'), answer: '3, 4, -3, 4', agrees: true },
});

const IV = [2, 0, -2, 0, 0, -2];

const a8q2iv = auto({
  id: 'a8-q2-iv',
  source: cite('step-f08', 'Q2(iv)'),
  title: t`A circle and an ellipse that meet three times`,
  prompt: t`Solve the simultaneous equations ${math`x^{${2}} + y^{${2}} = ${4}`} and ${math`${8}x^{${2}} + ${4}(y - ${1})^{${2}} = ${36}`}. Give every solution ${math`(x, y)`}, as a list ${math`x_{${1}}, y_{${1}}, x_{${2}}, y_{${2}}, \ldots`}.`,
  answer: {
    kind: 'witness', count: { min: 2, max: 8 }, example: listText(IV),
    check: (v) => (v.length % 2 === 0 && pointsKey(v, 2) === keyOf(IV) ? null : 'Substitute x^2 = 4 - y^2 into the second equation, solve for y, then find every x for each y.'),
  },
  solution: [
    t`Substitute ${math`x^{${2}} = ${4} - y^{${2}}`}: ${math`${32} - ${8}y^{${2}} + ${4}y^{${2}} - ${8}y + ${4} = ${36}`}, which simplifies to ${math`-${4}y^{${2}} - ${8}y = ${0}`}, that is ${math`${4}y(y + ${2}) = ${0}`}.`,
    t`${math`y = ${0}`} gives ${math`x^{${2}} = ${4}`}, so ${math`x = \pm ${2}`}: two points. ${math`y = -${2}`} gives ${math`x^{${2}} = ${0}`}, so ${math`x = ${0}`}: one point, where the curves touch.`,
    t`The solutions are ${math`(${2}, ${0})`}, ${math`(-${2}, ${0})`}, and ${math`(${0}, -${2})`}.`,
  ],
  reference: listText(IV),
  verify: () => {
    const out: number[] = [];
    for (let x = -3; x <= 3; x++) for (let y = -3; y <= 3; y++) if (x * x + y * y === 4 && 8 * x * x + 4 * (y - 1) ** 2 === 36) out.push(x, y);
    return keyOf(out) === keyOf(IV) ? null : `brute force found ${out.join(', ')}`;
  },
  misconceptions: [{ response: '2, 0, 0, -2', why: t`${math`y = ${0}`} gives two values of ${math`x`}, ${math`\pm ${2}`}: three points in all.` }],
  official: { source: cite('step-f08-hints', 'Q2(iv)'), answer: '2, 0, -2, 0, 0, -2', agrees: true },
});

const ELL = [2, 1, 2, -1];

const a8q3pts = auto({
  id: 'a8-q3-points',
  source: cite('step-f08', 'Q3'),
  title: t`Where two ellipses meet`,
  prompt: t`Find the points of intersection of the ellipses ${math`(x + ${2})^{${2}} + ${2}y^{${2}} = ${18}`} and ${math`${9}(x - ${1})^{${2}} + ${16}y^{${2}} = ${25}`}, as ${math`x_{${1}}, y_{${1}}, x_{${2}}, y_{${2}}`}.`,
  answer: {
    kind: 'witness', count: { min: 2, max: 8 }, example: listText(ELL),
    check: (v) => (v.length % 2 === 0 && pointsKey(v, 2) === keyOf(ELL) ? null : 'Eliminate y, solve for x, and keep only the x that gives a real y.'),
  },
  solution: [
    t`Multiply the first by ${8}: ${math`${8}(x + ${2})^{${2}} + ${16}y^{${2}} = ${144}`}. Subtract from the second to remove ${math`y`}: ${math`${9}(x - ${1})^{${2}} - ${8}(x + ${2})^{${2}} = ${25} - ${144}`}.`,
    t`Expand: ${math`${9}x^{${2}} - ${18}x + ${9} - ${8}x^{${2}} - ${32}x - ${32} = -${119}`}, that is ${math`x^{${2}} - ${50}x + ${96} = ${0}`}, so ${math`(x - ${48})(x - ${2}) = ${0}`}.`,
    t`${math`x = ${48}`} gives ${math`${2}y^{${2}} = ${18} - ${50}^{${2}} < ${0}`}: no real point. ${math`x = ${2}`} gives ${math`${16} + ${2}y^{${2}} = ${18}`}, so ${math`y = \pm ${1}`}.`,
    t`The ellipses meet at ${math`(${2}, ${1})`} and ${math`(${2}, -${1})`}.`,
  ],
  reference: listText(ELL),
  verify: () => {
    // Roots of x^2 - 50x + 96, and the y each gives.
    const roots = [48, 2].filter((x) => x * x - 50 * x + 96 === 0);
    if (roots.length !== 2) return 'the quadratic has other roots';
    const out: number[] = [];
    for (const x of roots) {
      const y2 = (18 - (x + 2) ** 2) / 2;
      if (y2 < 0) continue;
      const y = Math.sqrt(y2);
      if (9 * (x - 1) ** 2 + 16 * y2 !== 25) return `x = ${x}: not on the second ellipse`;
      out.push(x, y, x, -y);
    }
    return keyOf(out) === keyOf(ELL) ? null : `found ${out.join(', ')}`;
  },
  misconceptions: [{ response: '2, 1, 2, -1, 48, 0', why: t`${math`x = ${48}`} is a root of the quadratic, but it needs ${math`y^{${2}} < ${0}`}: there is no real point there.` }],
  official: { source: cite('step-f08-hints', 'Q3'), answer: '2, 1, 2, -1', agrees: true },
});

const a8q3 = supervision({
  id: 'a8-q3',
  source: cite('step-f08', 'Q3'),
  title: t`Circles through the intersections of two ellipses`,
  prompt: t`(${2002} STEP I Q${1}) Show that the equation of any circle passing through the points of intersection of the ellipse ${math`(x + ${2})^{${2}} + ${2}y^{${2}} = ${18}`} and the ellipse ${math`${9}(x - ${1})^{${2}} + ${16}y^{${2}} = ${25}`} can be written in the form ${math`x^{${2}} - ${2}ax + y^{${2}} = ${5} - ${4}a`}.`,
  writeUp: 'proof',
  official: cite('step-f08-hints', 'Q3'),
});

const A23C = [-2, 1, 7, 4];

const a23c = auto({
  id: 'a23-q2-ii-c',
  source: cite('step-f23', 'Q2(ii)(c)'),
  title: t`A line and a circle written out in full`,
  prompt: t`Solve ${math`${3}y = x + ${5}`} and ${math`x^{${2}} + y^{${2}} - ${6}x - ${2}y - ${15} = ${0}`}. Give the points as ${math`x_{${1}}, y_{${1}}, x_{${2}}, y_{${2}}`}.`,
  answer: {
    kind: 'witness', count: { min: 2, max: 6 }, example: listText(A23C),
    check: (v) => (v.length % 2 === 0 && pointsKey(v, 2) === keyOf(A23C) ? null : 'Substitute x = 3y - 5 into the circle and solve for y.'),
  },
  solution: [
    t`The line gives ${math`x = ${3}y - ${5}`}. Substitute: ${math`(${3}y - ${5})^{${2}} + y^{${2}} - ${6}(${3}y - ${5}) - ${2}y - ${15} = ${0}`}.`,
    t`Expand: ${math`${9}y^{${2}} - ${30}y + ${25} + y^{${2}} - ${18}y + ${30} - ${2}y - ${15} = ${10}y^{${2}} - ${50}y + ${40} = ${0}`}, that is ${math`y^{${2}} - ${5}y + ${4} = (y - ${1})(y - ${4}) = ${0}`}.`,
    t`${math`y = ${1}`} gives ${math`x = -${2}`}; ${math`y = ${4}`} gives ${math`x = ${7}`}. The points are ${math`(-${2}, ${1})`} and ${math`(${7}, ${4})`}.`,
  ],
  reference: listText(A23C),
  verify: () => {
    const out: number[] = [];
    for (let y = -10; y <= 10; y++) {
      const x = 3 * y - 5;
      if (x * x + y * y - 6 * x - 2 * y - 15 === 0) out.push(x, y);
    }
    return keyOf(out) === keyOf(A23C) ? null : `found ${out.join(', ')}`;
  },
  misconceptions: [{ response: '1, -2, 4, 7', why: t`The coordinates are swapped: ${math`y = ${1}`} gives the point ${math`(-${2}, ${1})`}.` }],
  official: { source: cite('step-f23-hints', 'Q2(ii)(c)'), answer: '-2, 1, 7, 4', agrees: true },
});

const a23iii = auto({
  id: 'a23-q2-iii',
  source: cite('step-f23', 'Q2(iii)'),
  title: t`The tangents to ${math`y = x^{${2}}`} through ${math`(${0}, -${1})`}`,
  prompt: t`The line ${math`L`} has equation ${math`y = ax - ${1}`} and the curve ${math`C`} has equation ${math`y = x^{${2}}`}. Find the values of ${math`a`} for which ${math`L`} touches ${math`C`}.`,
  answer: {
    kind: 'witness', count: 2, unordered: true, example: '2, -2',
    check: (v) => (valuesKey(v) === valuesKey([q(2), q(-2)]) ? null : 'Set the discriminant of x^2 - ax + 1 = 0 to zero.'),
  },
  solution: [
    t`Where they meet, ${math`x^{${2}} - ax + ${1} = ${0}`}. Two distinct points need ${math`a^{${2}} - ${4} > ${0}`}, that is ${math`a < -${2}`} or ${math`a > ${2}`}.`,
    t`The line touches when ${math`a^{${2}} - ${4} = ${0}`}: ${math`a = ${2}`} or ${math`a = -${2}`}. The tangents through ${math`(${0}, -${1})`} are ${math`y = ${2}x - ${1}`} and ${math`y = -${2}x - ${1}`}.`,
  ],
  reference: '2, -2',
  verify: () => ([2, -2].every((a) => a * a - 4 === 0) && [1.9, 2.1].every((a) => (a * a - 4 > 0) === a > 2) ? null : 'discriminant check failed'),
  misconceptions: [{ response: '1, -1', why: t`The discriminant of ${math`x^{${2}} - ax + ${1}`} is ${math`a^{${2}} - ${4}`}, with the ${4} from ${math`${4} \times ${1} \times ${1}`}.` }],
  official: { source: cite('step-f23-hints', 'Q2(iii)'), answer: '2, -2', agrees: true },
});

// ---------------------------------------------------------------- lesson

const EXL = { a: 3, b: 4, c: 25, r: 5 };

export const intersections: TopicContent = {
  topicId: 'geom.intersections',
  goal: t`Find where lines, circles, and ellipses meet by substitution, and use the discriminant to tell crossing, touching, and missing apart.`,
  objective: t`Find where lines and curves meet by substitution, and tell crossing, touching, and missing apart.`,
  why: t`Meeting points turn geometry into algebra; tangents, loci, and calculus all start from them.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`Two equations, one point` },
    { kind: 'hook', text: t`Draw the line ${computedMath(lineText(EXL.a, EXL.b, EXL.c))} and the circle ${math`x^{${2}} + y^{${2}} = ${EXL.c}`}. Does the line cut through the circle, just graze it, or miss it altogether? A sketch can mislead: grazing and missing by a hair look the same. Algebra can tell them apart exactly.` },
    { kind: 'narrative', text: t`A point lies on both curves exactly when its coordinates satisfy both equations at once. So the meeting points are the solutions of the two equations as a pair. The method is substitution: use one equation to write one variable in terms of the other, and put that into the second equation, leaving one equation in one unknown.` },
    { kind: 'definition', name: t`Intersection`, formal: t`The [[intersection-point|points of intersection]] of curves ${math`f(x, y) = ${0}`} and ${math`g(x, y) = ${0}`} are the pairs ${math`(x, y)`} with ${math`f(x, y) = ${0}`} and ${math`g(x, y) = ${0}`}.`, plain: t`Points on both curves. The point ${math`(${3}, ${4})`} lies on ${math`x^{${2}} + y^{${2}} = ${25}`} and on ${math`y = x + ${1}`}, so it is a point of intersection.` },
    { kind: 'section', title: t`Line and circle: the discriminant decides` },
    { kind: 'theorem', name: t`Crossing, touching, missing`, statement: t`Let a line not parallel to the ${math`y`}-axis meet a circle, and substitute the line into the circle to get a quadratic ${math`Ax^{${2}} + Bx + C = ${0}`} with ${math`A \neq ${0}`}. The line meets the circle in ${2}, ${1}, or ${0} points according as ${math`B^{${2}} - ${4}AC`} is positive, zero, or negative. In the case of ${1} point the line is a [[tangent-line|tangent]] to the circle.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Points match roots`, text: t`On the line, ${math`y`} is determined by ${math`x`}. So each meeting point gives a root ${math`x`} of the quadratic, and each real root ${math`x`} gives exactly one meeting point, with ${math`y`} from the line.`, plain: t`So counting points is counting real roots.` },
        { label: t`Count the roots`, text: t`By the quadratic formula, ${math`x = \frac{-B \pm \sqrt{B^{${2}} - ${4}AC}}{${2}A}`}: two real roots if the discriminant is positive, one repeated root if it is ${0}, and none if it is negative.` },
        { label: t`Touching`, text: t`With one repeated root the line meets the circle at one point and does not cross into it: it is a tangent.`, why: { q: t`Why does one point mean it does not cross?`, a: t`A line that passes into the inside of a circle must come out again on the other side, since the circle is closed and the line goes on for ever. That would be a second point.` } },
      ],
    },
    { kind: 'p', text: t`For the hook: the line gives ${math`y = \frac{${25} - ${3}x}{${4}}`}. Substituting and multiplying by ${16}: ${math`${16}x^{${2}} + (${25} - ${3}x)^{${2}} = ${400}`}, that is ${math`${25}x^{${2}} - ${150}x + ${225} = ${0}`}, or ${math`${25}(x - ${3})^{${2}} = ${0}`}. The discriminant is ${0}: the line touches the circle at ${math`(${3}, ${4})`}.` },
    checkFrom(countPoints, { a: 4, b: -3, r: 2, c: 7 }, t`Substitute and compute the discriminant; or compare the distance of the centre from the line with the radius.`),
    { kind: 'section', title: t`Two circles, and curves beyond` },
    { kind: 'narrative', text: t`Two circles: subtract their equations. The ${math`x^{${2}} + y^{${2}}`} terms cancel, leaving a straight line through both meeting points. Solve that line with either circle. With ellipses or other curves, the same plan works: eliminate one variable, solve, then go back for the other.` },
    checkFrom(linePoints, { i: 0, j: 7 }, t`Substitute, solve the quadratic, and pair each root with the coordinate the line gives.`),
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`After eliminating ${math`y`}, every root ${math`x`} gives a meeting point.`, counterexample: t`For the ellipses ${math`(x + ${2})^{${2}} + ${2}y^{${2}} = ${18}`} and ${math`${9}(x - ${1})^{${2}} + ${16}y^{${2}} = ${25}`}, eliminating ${math`y`} gives ${math`x = ${2}`} or ${math`x = ${48}`}. But ${math`x = ${48}`} needs ${math`${2}y^{${2}} = ${18} - ${2500} < ${0}`}: no real point. Always go back and find the other coordinate.` },
    { kind: 'pitfall', claim: t`A quadratic with two roots means two meeting points.`, counterexample: t`For ${math`x^{${2}} + y^{${2}} = ${4}`} and ${math`${8}x^{${2}} + ${4}(y - ${1})^{${2}} = ${36}`}, eliminating ${math`x`} gives ${math`y = ${0}`} or ${math`y = -${2}`}, but ${math`y = ${0}`} gives two values of ${math`x`}: three points in all. Counting roots counts points only when each root gives exactly one point, as for a line.` },
    { kind: 'takeaway', text: t`Substitute to get one equation in one unknown; its real roots give the meeting points, and for a line its discriminant tells crossing, touching, and missing apart.` },
  ],
  examples: [
    workedCambridge(a8q2a),
    worked(countPoints, { a: 3, b: 4, r: 2, c: 12 }, t`Counting the points by the discriminant`),
    worked(tangentSlopes, { s: 3 }, t`Tangents to a parabola through a point`),
  ],
  generators: [countPoints, linePoints, tangentSlopes],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['intersection-point', 'tangent-line'],
  cambridge: [a8q3pts, a8q3, a8q2iv, a23c, a23iii],
  gate: ['a8-q3-points', 'a8-q3', 'a8-q2-iv'],
  recall: [
    { front: t`How do you find where a line meets a curve?`, back: t`Substitute the line into the curve, solve the one-variable equation, and find the other coordinate from the line.` },
    { front: t`How does the discriminant tell crossing, touching, and missing apart?`, back: t`For a line and a circle: positive gives two points, zero one (a tangent), negative none.` },
    { front: t`How do you find where two circles meet?`, back: t`Subtract the equations to get a line through both points, then solve the line with one circle.` },
  ],
  proofOrder: [
    {
      title: t`Counting the meeting points of a line and a circle`,
      steps: [
        t`Substitute the line into the circle to get a quadratic in ${math`x`}.`,
        t`Each real root gives exactly one point, since the line fixes ${math`y`}.`,
        t`The discriminant counts the real roots: two, one, or none.`,
        t`One repeated root means the line touches: it is a tangent.`,
      ],
    },
  ],
};

