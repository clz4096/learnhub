/**
 * fn.modulus-regions: sketch regions such as |x| + |y| <= 1 and |x - 1| - |y + 1| <= 1 by
 * drawing the boundary in each quadrant (relative to the critical lines) and testing a
 * point. Sources: STEP Support Foundation Assignment 21 Q2(iv), (v) and Q3 (1999 STEP I
 * Q4). Membership is checked by evaluating the inequality at each point; areas by counting
 * grid points (a Monte Carlo-free lattice estimate) against the exact formula.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { int, pick, q, sample } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { computedTex, math, t } from '../rich';
import { checkFrom, workedCambridge, worked, type TopicContent } from '../topic';
import { namedAnswer, withExaminer } from '../prep-a';

const sgn = (n: number): string => (n < 0 ? '-' : '+');
const shift = (v: string, c: number): string => (c === 0 ? v : `${v} ${sgn(-c)} ${Math.abs(c)}`);
/** The shifted variable as computed LaTeX, so its numbers are not typed text. */
const sh = (v: string, c: number) => computedTex(shift(v, c));
const ptId = ([x, y]: readonly [number, number]): string => `p${x}_${y}`.replace(/-/g, 'm');

/** Area of { |x - a| + |y - b| <= k } by counting lattice points on a fine grid. */
function latticeArea(test: (x: number, y: number) => boolean, R: number, n = 400): number {
  let c = 0;
  const h = (2 * R) / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (test(-R + (i + 0.5) * h, -R + (j + 0.5) * h)) c++;
  return c * h * h;
}

// ---------------------------------------------------------------- the area of a diamond

interface DiP { a: number; b: number; k: number }
const diamondArea = generator<DiP>({
  id: 'diamond-area',
  skill: 'Recognise |x - a| + |y - b| <= k as a square with diagonals 2k, and find its area.',
  quick: true,
  params: (rng) => ({ a: int(rng, -4, 4), b: int(rng, -4, 4), k: int(rng, 1, 6) }),
  sane: (p) => (p.k > 0 ? null : 'empty'),
  problem: (p) => ({
    prompt: t`Find the area of the region ${math`|${sh('x', p.a)}| + |${sh('y', p.b)}| \le ${p.k}`}.`,
    answer: { kind: 'exact', expected: String(2 * p.k * p.k) },
    solution: [
      t`Move the centre to the origin: it is ${math`|X| + |Y| \le ${p.k}`} with ${math`X = ${sh('x', p.a)}`}, ${math`Y = ${sh('y', p.b)}`}, a translation, which keeps areas. In the first quadrant the boundary is ${math`X + Y = ${p.k}`}, and by symmetry the region is a square with corners at ${math`(\pm ${p.k}, ${0})`} and ${math`(${0}, \pm ${p.k})`}.`,
      t`Its diagonals have length ${2 * p.k}, and a square's area is half the product of its diagonals: ${math`\frac{${2 * p.k} \times ${2 * p.k}}{${2}} = ${2 * p.k * p.k}`}.`,
    ],
  }),
  solve: (p) => {
    // The height of the region above each x is 2 max(0, k - |x|), piecewise linear with integer corners,
    // so the trapezium rule with unit steps is exact.
    let area = 0;
    for (let x = -p.k; x < p.k; x++) area += (2 * Math.max(0, p.k - Math.abs(x)) + 2 * Math.max(0, p.k - Math.abs(x + 1))) / 2;
    return String(area);
  },
  misconceptions: (p): Misconception[] => [
    { response: String(p.k * p.k), why: t`The square is tilted: its side is ${math`${p.k}\sqrt{${2}}`}, not ${p.k}. Its diagonals have length ${2 * p.k}.` },
    { response: String(4 * p.k * p.k), why: t`That is the area of the upright square ${math`|X| \le ${p.k}`}, ${math`|Y| \le ${p.k}`}. The diamond fills half of it.` },
  ],
});

// ---------------------------------------------------------------- points in a region

type Kind = 'sum' | 'diff' | 'prod';
interface PtP { kind: Kind; a: number; b: number; k: number; pts: [number, number][] }
const value = (p: PtP, [x, y]: readonly [number, number]): number => {
  const X = Math.abs(x - p.a);
  const Y = Math.abs(y - p.b);
  return p.kind === 'sum' ? X + Y : p.kind === 'diff' ? X - Y : X * Y;
};
const inside = (p: PtP, pt: readonly [number, number]): boolean => value(p, pt) <= p.k;

const regionPoints = generator<PtP>({
  id: 'region-points',
  skill: 'Decide which points lie in a region defined by moduli by evaluating the inequality at each point.',
  params: (rng) => {
    for (;;) {
      const kind = pick(rng, ['sum', 'diff', 'prod'] as const);
      const p: PtP = { kind, a: int(rng, -2, 2), b: int(rng, -2, 2), k: int(rng, 1, 3), pts: [] };
      const cands: [number, number][] = [];
      for (let x = -4; x <= 4; x++) for (let y = -4; y <= 4; y++) cands.push([x, y]);
      p.pts = sample(rng, cands, 4);
      const ins = p.pts.filter((pt) => inside(p, pt)).length;
      // No point on the boundary, and both kinds present.
      if (p.pts.every((pt) => value(p, pt) !== p.k) && ins >= 1 && ins <= 3) return p;
    }
  },
  sane: (p) => (p.pts.length === 4 ? null : 'bad'),
  problem: (p) => {
    const X = `|${shift('x', p.a)}|`;
    const Y = `|${shift('y', p.b)}|`;
    const lhs = p.kind === 'sum' ? `${X} + ${Y}` : p.kind === 'diff' ? `${X} - ${Y}` : `${X}${Y}`;
    const options: ChoiceOption[] = p.pts.map((pt) => ({ id: ptId(pt), label: t`${math`(${pt[0]}, ${pt[1]})`}` }));
    return {
      prompt: t`Which of these points lie in the region ${math`${computedTex(lhs)} \le ${p.k}`}? Choose all that apply.`,
      answer: { kind: 'choice', options, correct: p.pts.filter((pt) => inside(p, pt)).map(ptId) },
      solution: p.pts.map((pt) => t`At ${math`(${pt[0]}, ${pt[1]})`}: ${math`|${pt[0] - p.a}| = ${Math.abs(pt[0] - p.a)}`} and ${math`|${pt[1] - p.b}| = ${Math.abs(pt[1] - p.b)}`}, so the left side is ${math`${value(p, pt)}`}, which is ${inside(p, pt) ? 'at most' : 'more than'} ${p.k}: ${inside(p, pt) ? 'in' : 'not in'} the region.`),
    };
  },
  solve: (p) => p.pts.filter(([x, y]) => {
    const X = Math.abs(x - p.a);
    const Y = Math.abs(y - p.b);
    const v = p.kind === 'sum' ? X + Y : p.kind === 'diff' ? X - Y : X * Y;
    return v <= p.k;
  }).map(ptId),
  misconceptions: (p): Misconception[] => {
    const outside = p.pts.filter((pt) => !inside(p, pt)).map(ptId);
    const noAbs = p.pts.filter(([x, y]) => {
      const X = x - p.a;
      const Y = y - p.b;
      return (p.kind === 'sum' ? X + Y : p.kind === 'diff' ? X - Y : X * Y) <= p.k;
    }).map(ptId);
    const ms: Misconception[] = [{ response: outside, why: t`Those are the points outside the region: the left side is more than ${p.k} there.` }];
    const right = p.pts.filter((pt) => inside(p, pt)).map(ptId);
    if (noAbs.length > 0 && noAbs.join() !== right.join()) ms.push({ response: noAbs, why: t`Take the modulus of each bracket before combining: a negative bracket counts as positive.` });
    else ms.push({ response: p.pts.map(ptId), why: t`Not every point is in the region: evaluate the left side at each one.` });
    return ms;
  },
});

// ---------------------------------------------------------------- the boundary in one quadrant

interface QdP { a: number; b: number; k: number; qx: 1 | -1; qy: 1 | -1 }
const QUAD_NAMES = ['m', 'c'] as const;
/** In the quadrant sx(x - a) >= 0, sy(y - b) >= 0, |x - a| + |y - b| = k is sx(x - a) + sy(y - b) = k: y = -sx sy x + c. */
const qdLine = (p: QdP): [number, number] => {
  const m = -p.qx * p.qy;
  // sy(y - b) = k - sx(x - a)  =>  y = b + sy k - sy sx x + sy sx a
  return [m, p.b + p.qy * p.k + p.qy * p.qx * p.a];
};

const boundaryPiece = generator<QdP>({
  id: 'boundary-piece',
  skill: 'Find the straight-line piece of the boundary |x - a| + |y - b| = k in one quadrant, by removing the moduli with the right signs.',
  params: (rng) => ({ a: int(rng, -3, 3), b: int(rng, -3, 3), k: int(rng, 1, 5), qx: pick(rng, [1, -1] as const), qy: pick(rng, [1, -1] as const) }),
  sane: (p) => (p.k > 0 ? null : 'bad'),
  problem: (p) => {
    const [m, c] = qdLine(p);
    const condX = p.qx === 1 ? math`x \ge ${p.a}` : math`x \le ${p.a}`;
    const condY = p.qy === 1 ? math`y \ge ${p.b}` : math`y \le ${p.b}`;
    return {
      prompt: t`In the region where ${condX} and ${condY}, the curve ${math`|${sh('x', p.a)}| + |${sh('y', p.b)}| = ${p.k}`} is part of a line ${math`y = mx + c`}. Find ${math`m`} and ${math`c`}.`,
      answer: namedAnswer(QUAD_NAMES, [q(m), q(c)], 'Remove each modulus with the sign it has in this region.'),
      solution: [
        t`In this region ${math`|${sh('x', p.a)}| = ${computedTex(p.qx === 1 ? shift('x', p.a) : `-(${shift('x', p.a)})`)}`} and ${math`|${sh('y', p.b)}| = ${computedTex(p.qy === 1 ? shift('y', p.b) : `-(${shift('y', p.b)})`)}`}.`,
        t`So the equation is linear there; making ${math`y`} the subject gives ${math`y = ${m}x + (${c})`}: ${math`m = ${m}`}, ${math`c = ${c}`}.`,
      ],
    };
  },
  solve: (p) => {
    // Two points on the piece: where it meets the critical lines x = a and y = b.
    const x1 = p.a;
    const y1 = p.b + p.qy * p.k;
    const x2 = p.a + p.qx * p.k;
    const y2 = p.b;
    const m = (y2 - y1) / (x2 - x1);
    return `m = ${m}, c = ${y1 - m * x1}`;
  },
  misconceptions: (p): Misconception[] => {
    const [m, c] = qdLine(p);
    return [
      { response: `m = ${-m}, c = ${p.b + p.qy * p.k - -m * p.a}`, why: t`Check the signs: in this region ${math`x - (${p.a})`} is ${p.qx === 1 ? 'non-negative' : 'non-positive'} and ${math`y - (${p.b})`} is ${p.qy === 1 ? 'non-negative' : 'non-positive'}.` },
      { response: `m = ${m}, c = ${c - 2 * p.qy * p.k}`, why: t`The piece passes through ${math`(${p.a}, ${p.b + p.qy * p.k})`}, where it meets the line ${math`x = ${p.a}`}: check your ${math`c`} there.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

const a21area = auto({
  id: 'a21-q3-area',
  source: cite('step-f21', 'Q3(i), (ii) (1999 STEP I Q4)', true),
  title: t`Two squares from moduli`,
  prompt: t`Sketch the regions ${math`|x| + |y| \le ${1}`} and ${math`|x - ${1}| + |y - ${1}| \le ${1}`}. Find the area ${math`P`} of the first and the area ${math`Q`} of the overlap of the two regions.`,
  answer: namedAnswer(['P', 'Q'], [q(2), q(0)], 'The second region is the first moved by (1, 1).'),
  solution: [
    t`In the first quadrant ${math`|x| + |y| \le ${1}`} is ${math`x + y \le ${1}`}; by symmetry in both axes the region is the square with corners ${math`(\pm ${1}, ${0})`}, ${math`(${0}, \pm ${1})`}, of area ${math`\frac{${2} \times ${2}}{${2}} = ${2}`}.`,
    t`The second is the same square moved by ${math`(${1}, ${1})`}, with corners ${math`(${0}, ${1})`}, ${math`(${1}, ${0})`}, ${math`(${2}, ${1})`}, ${math`(${1}, ${2})`}. Both contain the segment from ${math`(${1}, ${0})`} to ${math`(${0}, ${1})`}, but nothing more: the overlap is a line segment, of area ${0}.`,
  ],
  reference: 'P = 2, Q = 0',
  verify: () => {
    const a1 = latticeArea((x, y) => Math.abs(x) + Math.abs(y) <= 1, 1.5, 600);
    const ov = latticeArea((x, y) => Math.abs(x) + Math.abs(y) <= 1 && Math.abs(x - 1) + Math.abs(y - 1) <= 1, 2.5, 600);
    return Math.abs(a1 - 2) < 0.02 && ov < 0.02 ? same('areas', '2,0', '2,0') : `lattice areas ${a1}, ${ov}`;
  },
  misconceptions: [{ response: 'P = 1, Q = 0', why: t`The square is tilted, with diagonals of length ${2}: its area is ${2}, not ${1}.` }],
});

const a21points = auto({
  id: 'a21-q3-iii-points',
  source: cite('step-f21', 'Q3(iii) (1999 STEP I Q4)', true),
  title: t`Testing points in ${math`|x - ${1}| - |y + ${1}| \le ${1}`}`,
  prompt: t`Which of the points ${math`(${0}, ${0})`}, ${math`(${3}, -${1})`}, ${math`(${4}, ${2})`}, ${math`(-${2}, -${1})`} lie in the region ${math`|x - ${1}| - |y + ${1}| \le ${1}`}? Choose all that apply.`,
  answer: {
    kind: 'choice',
    options: [{ id: 'a', label: t`${math`(${0}, ${0})`}` }, { id: 'b', label: t`${math`(${3}, -${1})`}` }, { id: 'c', label: t`${math`(${4}, ${2})`}` }, { id: 'd', label: t`${math`(-${2}, -${1})`}` }],
    correct: ['a', 'c'],
  },
  solution: [
    t`${math`(${0}, ${0})`}: ${math`${1} - ${1} = ${0} \le ${1}`}, in. ${math`(${3}, -${1})`}: ${math`${2} - ${0} = ${2}`}, out. ${math`(${4}, ${2})`}: ${math`${3} - ${3} = ${0}`}, in. ${math`(-${2}, -${1})`}: ${math`${3} - ${0} = ${3}`}, out.`,
    t`The region is everything except two wedges opening left and right from the points ${math`(${0}, -${1})`} and ${math`(${2}, -${1})`}, bounded by lines of gradient ${math`\pm ${1}`}.`,
  ],
  reference: ['a', 'c'],
  verify: () => {
    const f = (x: number, y: number): boolean => Math.abs(x - 1) - Math.abs(y + 1) <= 1;
    return same('membership', [[0, 0], [3, -1], [4, 2], [-2, -1]].map(([x, y]) => f(x as number, y as number)).join(','), 'true,false,true,false');
  },
  misconceptions: [{ response: ['a'], why: t`${math`(${4}, ${2})`}: ${math`|${3}| - |${3}| = ${0}`}, which is at most ${1}, so it is in the region.` }],
});

const step1999 = supervision({
  id: 'a21-q3',
  source: cite('step-f21', 'Q3 (1999 STEP I Q4)'),
  title: t`Four regions defined by moduli`,
  prompt: t`Sketch the following subsets of the ${math`(x, y)`} plane: (i) ${math`|x| + |y| \le ${1}`}; (ii) ${math`|x - ${1}| + |y - ${1}| \le ${1}`}; (iii) ${math`|x - ${1}| - |y + ${1}| \le ${1}`}; (iv) ${math`|x||y - ${2}| \le ${1}`}.`,
  writeUp: 'sketch',
  official: cite('step-f21-hints', 'Q3'),
});

const a21ivv = supervision({
  id: 'a21-q2-iv-v',
  source: cite('step-f21', 'Q2(iv), (v)'),
  title: t`Boundaries quadrant by quadrant`,
  prompt: t`(iv) Sketch the graph ${math`|x| + |y| = ${1}`} in the regions given by ${math`x > ${0}, y > ${0}`} and by ${math`x > ${0}, y < ${0}`}. (v) Sketch the graph ${math`|x - ${1}| + |y - ${1}| = ${1}`} in the region where ${math`x < ${1}`} and ${math`y > ${1}`}. In this region, shade the subset of the plane in which ${math`|x - ${1}| + |y - ${1}| \le ${1}`}.`,
  writeUp: 'sketch',
  official: cite('step-f21-hints', 'Q2(iv), (v)'),
});

// ---------------------------------------------------------------- lesson

export const modulusRegions: TopicContent = {
  topicId: 'fn.modulus-regions',
  goal: t`Sketch regions such as ${math`|x| + |y| \le ${1}`} and ${math`|x - ${1}| - |y + ${1}| \le ${1}`} by drawing the boundary in each quadrant and testing a point.`,
  objective: t`Sketch regions defined by moduli, piece by piece, and test points to shade them.`,
  why: t`A classic STEP sketching question; the method extends to any inequality in two variables.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`The idea` },
    { kind: 'hook', text: t`What shape is ${math`|x| + |y| \le ${1}`}? Not a circle: it is a square standing on one corner. And ${math`|x - ${1}| + |y - ${1}| \le ${1}`} is the same square slid along. Seeing why takes one idea: remove the moduli one region at a time.` },
    { kind: 'narrative', text: t`Each modulus in ${math`x`} has a critical line, a vertical line where its inside is ${0}; each modulus in ${math`y`} has a horizontal one. Between these lines every modulus has a fixed sign, so the boundary is an ordinary curve, usually a straight line, in each piece.` },
    { kind: 'section', title: t`Boundaries piece by piece` },
    {
      kind: 'definition',
      name: t`Boundary of a region`,
      formal: t`For a continuous ${math`F(x, y)`}, the [[boundary-curve|boundary]] of the region ${math`F(x, y) \le c`} lies on the curve ${math`F(x, y) = c`}. Off that curve, ${math`F - c`} keeps one sign on each connected piece of the plane it leaves.`,
      plain: t`Draw where equality holds; then each part of the plane cut off by that curve is either all in or all out. For ${math`|x| + |y| \le ${1}`} the boundary is the tilted square, and ${math`(${0}, ${0})`} is inside.`,
    },
    { kind: 'theorem', name: t`The diamond`, statement: t`For ${math`k > ${0}`}, the set ${math`|x| + |y| \le k`} is the square with vertices ${math`(\pm k, ${0})`} and ${math`(${0}, \pm k)`}, together with its inside; its area is ${math`${2}k^{${2}}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`First quadrant`, text: t`For ${math`x, y \ge ${0}`} the moduli drop: ${math`x + y \le k`}, the triangle with corners ${math`(${0}, ${0})`}, ${math`(k, ${0})`}, ${math`(${0}, k)`}.` },
        { label: t`Symmetry`, text: t`Replacing ${math`x`} by ${math`-x`} or ${math`y`} by ${math`-y`} leaves ${math`|x| + |y|`} unchanged, so the region in each quadrant is the reflection of the first.`, why: { q: t`Why does that give the whole region?`, a: t`Every point lies in some quadrant (or on an axis), and the reflections carry the first-quadrant triangle onto each of the others.` } },
        { label: t`Area`, text: t`Four triangles, each of area ${math`\frac{k^{${2}}}{${2}}`}, give ${math`${2}k^{${2}}`}.` },
      ],
    },
    checkFrom(diamondArea, { a: 0, b: 0, k: 3 }, t`Diagonals of length ${6}: area ${math`\frac{${6} \times ${6}}{${2}} = ${18}`}.`),
    { kind: 'pitfall', claim: t`${math`|x| + |y| \le ${1}`} is the square ${math`-${1} \le x \le ${1}`}, ${math`-${1} \le y \le ${1}`}.`, counterexample: t`${math`(${1}, ${1})`} is in that square, but ${math`|${1}| + |${1}| = ${2} > ${1}`}. The region is the tilted square inside it.` },
    { kind: 'section', title: t`Shifts and other shapes` },
    { kind: 'narrative', text: t`Replacing ${math`x`} by ${math`x - ${1}`} slides a region ${1} to the right, and ${math`y`} by ${math`y - ${1}`} slides it up: so ${math`|x - ${1}| + |y - ${1}| \le ${1}`} is the diamond centred at ${math`(${1}, ${1})`}. For shapes like ${math`|x - ${1}| - |y + ${1}| \le ${1}`} or ${math`|x||y - ${2}| \le ${1}`}, draw the critical lines, sketch the boundary piece in each part, then test one point in each region to decide what to shade.` },
    checkFrom(boundaryPiece, { a: 1, b: 1, k: 1, qx: -1, qy: 1 }, t`For ${math`x \le ${1}`}, ${math`y \ge ${1}`}: ${math`(${1} - x) + (y - ${1}) = ${1}`}, so ${math`y = x + ${1}`}.`),
    checkFrom(regionPoints, { kind: 'diff', a: 1, b: -1, k: 1, pts: [[0, 0], [3, -1], [4, 2], [-2, -1]] }, t`The left side is ${0}, ${2}, ${0}, ${3} at the four points, so the first and third are in.`),
    { kind: 'takeaway', text: t`Draw the critical lines, remove the moduli in each piece to get the boundary, and test one point per region before shading.` },
  ],
  examples: [
    withExaminer(workedCambridge(a21area), t`Each quadrant's boundary written out, the symmetry used to finish the sketch, and the vertices labelled.`),
    worked(boundaryPiece, { a: -2, b: 1, k: 3, qx: 1, qy: -1 }, t`One piece of a shifted diamond`),
    worked(regionPoints, { kind: 'prod', a: 0, b: 2, k: 1, pts: [[1, 2], [2, 3], [-1, 0], [3, 4]] }, t`Testing points in ${math`|x||y - ${2}| \le ${1}`}`),
  ],
  generators: [diamondArea, regionPoints, boundaryPiece],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['boundary-curve'],
  cambridge: [a21points, step1999, a21ivv],
  gate: ['a21-q3', 'a21-q3-iii-points', 'a21-q2-iv-v'],
  recall: [
    { front: t`What shape is ${math`|x| + |y| \le k`}?`, back: t`A square standing on a corner, vertices ${math`(\pm k, ${0})`}, ${math`(${0}, \pm k)`}, area ${math`${2}k^{${2}}`}.` },
    { front: t`How do you sketch a region defined by moduli?`, back: t`Draw the critical lines, find the boundary in each piece, then test a point in each region.` },
  ],
  proofOrder: [{
    title: t`The area of ${math`|x| + |y| \le k`}`,
    steps: [
      t`In the first quadrant the region is ${math`x + y \le k`}, a triangle of area ${math`\frac{k^{${2}}}{${2}}`}.`,
      t`${math`|x| + |y|`} is unchanged by ${math`x \to -x`} and ${math`y \to -y`}.`,
      t`So each quadrant holds a reflected copy of the triangle.`,
      t`The total area is ${math`${4} \times \frac{k^{${2}}}{${2}} = ${2}k^{${2}}`}.`,
    ],
  }],
};
