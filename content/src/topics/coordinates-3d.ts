/**
 * geom.3d-coordinates: points in space, the distance formula by Pythagoras twice, volumes of
 * pyramids and tetrahedra, and angles from the cosine rule. Follows STEP Support Foundation
 * Assignment 5 Q2(ii) (a rectangular pyramid with volume 40) and Q3 (2006 STEP I Q8: the
 * tetrahedron with vertices on the axes: its volume, the angle ACB, the area of ABC, and the
 * distance d of the origin from ABC, with 1/d^2 = 1/a^2 + 1/b^2 + 1/c^2).
 */
import { auto, cite, same, supervision } from '../cambridge';
import { cross, listText, norm2, ptTex, sub3, surd } from '../geometry';
import { int, q, str } from '../math';
import { generator, type Misconception } from '../problem';
import { computedTex, dmath, math, t } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';
import { far } from '../partv-a';

// ---------------------------------------------------------------- distance

interface DistP { p: readonly number[]; r: readonly number[] }

const distance = generator<DistP>({
  id: 'distance-3d',
  skill: 'Find the distance between two points in space, d^2 = (difference in x)^2 + (difference in y)^2 + (difference in z)^2.',
  quick: true,
  params: (rng) => {
    for (;;) {
      const p = [int(rng, -5, 5), int(rng, -5, 5), int(rng, -5, 5)];
      const r = [int(rng, -5, 5), int(rng, -5, 5), int(rng, -5, 5)];
      const d = sub3(r, p);
      if (d.every((x) => x !== 0)) return { p, r };
    }
  },
  sane: ({ p, r }) => (sub3(r, p).every((x) => x !== 0) ? null : 'a coordinate difference is zero'),
  problem: ({ p, r }) => {
    const d = sub3(r, p);
    const n = norm2(d);
    return {
      prompt: t`Find the exact distance between ${computedTex(`P = ${ptTex(p)}`)} and ${computedTex(`Q = ${ptTex(r)}`)}. Write a square root as sqrt.`,
      answer: { kind: 'expression', expected: surd(1, n).expr, variables: [] },
      solution: [
        t`The differences in the coordinates are ${computedTex(d.map((x) => String(x)).join(',\\ '))}.`,
        t`${math`PQ^{${2}} = ${computedTex(d.map((x) => (x < 0 ? `(${x})^{2}` : `${x}^{2}`)).join(' + '))} = ${n}`}, so ${math`PQ = ${computedTex(surd(1, n).tex)}`}.`,
      ],
    };
  },
  solve: ({ p, r }) => {
    // Pythagoras twice: first across the floor (x and y), then up (z).
    const floor2 = ((r[0] as number) - (p[0] as number)) ** 2 + ((r[1] as number) - (p[1] as number)) ** 2;
    return surd(1, floor2 + ((r[2] as number) - (p[2] as number)) ** 2).expr;
  },
  misconceptions: ({ p, r }): Misconception[] => {
    const d = sub3(r, p);
    return [
      { response: String(norm2(d)), why: t`That is the square of the distance. Take the square root.` },
      { response: String(d.reduce((s, x) => s + Math.abs(x), 0)), why: t`Adding the coordinate differences measures a path along the grid, not the straight line. Square, add, then take the square root.` },
      { response: surd(1, (d[0] as number) ** 2 + (d[1] as number) ** 2).expr, why: t`That leaves out the ${math`z`} difference. In space there are three squares to add.` },
    ];
  },
});

// ---------------------------------------------------------------- a tetrahedron on the axes

interface TetP { a: number; b: number; c: number }

const tetraVolume = generator<TetP>({
  id: 'tetrahedron-volume',
  skill: 'Find the volume of the tetrahedron with vertices at the origin and on the three axes, as one third of base area times height.',
  params: (rng) => ({ a: int(rng, 1, 9), b: int(rng, 1, 9), c: int(rng, 1, 9) }),
  sane: ({ a, b, c }) => (a > 0 && b > 0 && c > 0 ? null : 'out of range'),
  problem: ({ a, b, c }) => {
    const v = q(a * b * c, 6);
    return {
      prompt: t`Find the volume of the tetrahedron with vertices ${computedTex(`O = ${ptTex([0, 0, 0])}`)}, ${computedTex(`A = ${ptTex([a, 0, 0])}`)}, ${computedTex(`B = ${ptTex([0, b, 0])}`)}, and ${computedTex(`C = ${ptTex([0, 0, c])}`)}.`,
      answer: { kind: 'exact', expected: str(v) },
      solution: [
        t`Take the triangle ${math`OAB`}, in the floor ${math`z = ${0}`}, as the base. Its sides ${math`OA`} and ${math`OB`} are at right angles, so its area is ${math`\frac{${1}}{${2}} \times ${a} \times ${b} = ${q(a * b, 2)}`}.`,
        t`The height is the distance of ${math`C`} above the floor, ${c}.`,
        t`Volume ${math`= \frac{${1}}{${3}} \times ${q(a * b, 2)} \times ${c} = ${v}`}.`,
      ],
    };
  },
  solve: ({ a, b, c }) => {
    // The scalar triple product: volume = |OA . (OB x OC)| / 6.
    const n = cross([0, b, 0], [0, 0, c]);
    return str(q(Math.abs(a * (n[0] as number)), 6));
  },
  misconceptions: ({ a, b, c }): Misconception[] => [
    { response: str(q(a * b * c, 3)), why: t`The base is a triangle, not a rectangle: its area is ${math`\frac{${1}}{${2}}ab`}, so the volume is ${math`\frac{${1}}{${3}} \times \frac{${1}}{${2}}ab \times c`}.` },
    { response: str(q(a * b * c, 2)), why: t`A pyramid's volume is a third of base times height. You left out the third.` },
    { response: String(a * b * c), why: t`That is the volume of the box with these edges. The tetrahedron is a sixth of it.` },
  ],
});

// ---------------------------------------------------------------- an angle in space

const cosAngle = generator<TetP>({
  id: 'angle-acb',
  skill: 'Find the cosine of an angle of a triangle in space: work out the three side lengths, then use the cosine rule.',
  params: (rng) => {
    for (;;) {
      const p = { a: int(rng, 1, 6), b: int(rng, 1, 6), c: int(rng, 1, 6) };
      if (p.a !== p.b) return p;
    }
  },
  sane: ({ a, b, c }) => (a > 0 && b > 0 && c > 0 ? null : 'out of range'),
  problem: ({ a, b, c }) => {
    const [ac2, bc2, ab2] = [a * a + c * c, b * b + c * c, a * a + b * b];
    const P = ac2 * bc2;
    const ans = surd(c * c, P, P);
    return {
      prompt: t`The points ${computedTex(`A = ${ptTex([a, 0, 0])}`)}, ${computedTex(`B = ${ptTex([0, b, 0])}`)}, and ${computedTex(`C = ${ptTex([0, 0, c])}`)} form a triangle. Find ${math`\cos \angle ACB`} exactly. Write a square root as sqrt.`,
      answer: { kind: 'expression', expected: ans.expr, variables: [] },
      solution: [
        t`Each side lies in a coordinate plane, so each length is Pythagoras in that plane: ${math`AC^{${2}} = ${a}^{${2}} + ${c}^{${2}} = ${ac2}`}, ${math`BC^{${2}} = ${b}^{${2}} + ${c}^{${2}} = ${bc2}`}, ${math`AB^{${2}} = ${a}^{${2}} + ${b}^{${2}} = ${ab2}`}.`,
        t`Cosine rule with the angle at ${math`C`}, opposite ${math`AB`}: ${math`\cos \angle ACB = \frac{AC^{${2}} + BC^{${2}} - AB^{${2}}}{${2} \cdot AC \cdot BC} = \frac{${ac2} + ${bc2} - ${ab2}}{${2}\sqrt{${ac2}}\sqrt{${bc2}}} = \frac{${c * c}}{\sqrt{${P}}}`}.`,
        t`Simplified, ${math`\cos \angle ACB = ${computedTex(ans.tex)}`}.`,
      ],
    };
  },
  solve: ({ a, b, c }) => {
    // Vectors from C: CA . CB / (|CA||CB|), then matched to the surd c^2 sqrt(P) / P.
    const CA = [a, 0, -c];
    const CB = [0, b, -c];
    const P = norm2(CA) * norm2(CB);
    const dotp = (CA[0] as number) * (CB[0] as number) + (CA[1] as number) * (CB[1] as number) + (CA[2] as number) * (CB[2] as number);
    return surd(dotp, P, P).expr;
  },
  misconceptions: ({ a, b, c }): Misconception[] => {
    const P = (a * a + c * c) * (b * b + c * c);
    return [
      { response: surd(2 * c * c, P, P).expr, why: t`The cosine rule divides by ${math`${2} \cdot AC \cdot BC`}: the ${2} cancels the ${2} from ${math`${2}c^{${2}}`} on top.` },
      { response: surd(-c * c, P, P).expr, why: t`The sign is reversed: subtract the square of the side opposite the angle, ${math`AB^{${2}}`}.` },
      { response: str(q(c * c, (a * a + c * c) + (b * b + c * c))), why: t`The denominator is the product of the two lengths, ${math`AC \cdot BC`}, not the sum of their squares.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

const APEX = [2, 3, 5];

const a5pyramid = auto({
  id: 'a5-q2-ii',
  source: cite('step-f05', 'Q2(ii)'),
  title: t`A rectangular pyramid of volume ${40}`,
  prompt: t`Three vertices of the rectangular base of a pyramid are ${computedTex(ptTex([0, 0, 0]))}, ${computedTex(ptTex([4, 0, 0]))}, and ${computedTex(ptTex([0, 6, 0]))}. The volume of the pyramid is ${40}, and its apex is directly over the centre of the base, above the base. Find the coordinates of the apex (the volume of a pyramid is ${math`\frac{${1}}{${3}}`} of base area times height).`,
  answer: {
    kind: 'witness', count: 3, example: listText(APEX),
    check: (v) => (v.map(str).join(',') === APEX.join(',') ? null : 'Find the fourth corner, the base area, the height from the volume, and the centre of the base.'),
  },
  solution: [
    t`The fourth vertex completes the rectangle: ${computedTex(ptTex([4, 6, 0]))}. The base is ${4} by ${6}, area ${24}.`,
    t`${math`\frac{${1}}{${3}} \times ${24} \times h = ${40}`}, so ${math`h = ${5}`}.`,
    t`The centre of the base is the midpoint of the diagonal from ${computedTex(ptTex([0, 0, 0]))} to ${computedTex(ptTex([4, 6, 0]))}, which is ${computedTex(ptTex([2, 3, 0]))}. The apex is ${5} above it: ${computedTex(ptTex(APEX))}.`,
  ],
  reference: listText(APEX),
  verify: () => {
    const h = (3 * 40) / (4 * 6);
    return same('apex', [4 / 2, 6 / 2, h].join(','), APEX.join(','));
  },
  misconceptions: [{ response: '2, 3, 15', why: t`The volume is a third of base area times height: ${math`h = \frac{${3} \times ${40}}{${24}}`}, not ${math`\frac{${40} \times ${9}}{${24}}`}.` }],
  official: { source: cite('step-f05-hints', 'Q2(ii)'), answer: '2, 3, 5', agrees: true },
});

const POS = { a: { kind: 'real' as const, min: 0.5, max: 5 }, b: { kind: 'real' as const, min: 0.5, max: 5 }, c: { kind: 'real' as const, min: 0.5, max: 5 } };

const a5q3area = auto({
  id: 'a5-q3-area',
  source: cite('step-f05', 'Q3(ii)'),
  title: t`The tetrahedron on the axes: the area of the slanted face`,
  prompt: t`The points ${math`A = (a, ${0}, ${0})`}, ${math`B = (${0}, b, ${0})`}, and ${math`C = (${0}, ${0}, c)`}, with ${math`a, b, c`} positive, form a triangle. Given that ${math`\cos \angle ACB = \frac{c^{${2}}}{\sqrt{(a^{${2}} + c^{${2}})(b^{${2}} + c^{${2}})}}`}, find the area of triangle ${math`ABC`} in terms of ${math`a`}, ${math`b`}, and ${math`c`}.`,
  answer: { kind: 'expression', expected: 'sqrt(a^2 b^2 + b^2 c^2 + c^2 a^2)/2', variables: ['a', 'b', 'c'], domains: POS },
  solution: [
    t`Area ${math`= \frac{${1}}{${2}} \cdot CA \cdot CB \cdot \sin \theta`} with ${math`\theta = \angle ACB`}, ${math`CA = \sqrt{a^{${2}} + c^{${2}}}`}, ${math`CB = \sqrt{b^{${2}} + c^{${2}}}`}.`,
    t`${math`\sin^{${2}} \theta = ${1} - \cos^{${2}} \theta = \frac{(a^{${2}} + c^{${2}})(b^{${2}} + c^{${2}}) - c^{${4}}}{(a^{${2}} + c^{${2}})(b^{${2}} + c^{${2}})} = \frac{a^{${2}}b^{${2}} + b^{${2}}c^{${2}} + c^{${2}}a^{${2}}}{(a^{${2}} + c^{${2}})(b^{${2}} + c^{${2}})}`}.`,
    t`So ${math`CA \cdot CB \cdot \sin \theta = \sqrt{a^{${2}}b^{${2}} + b^{${2}}c^{${2}} + c^{${2}}a^{${2}}}`}, and the area is half of that.`,
  ],
  reference: 'sqrt(a^2 b^2 + b^2 c^2 + c^2 a^2)/2',
  verify: () => {
    for (const [a, b, c] of [[1, 2, 3], [2, 2, 5], [0.5, 4, 1.5]] as const) {
      const n = cross(sub3([a, 0, 0], [0, 0, c]), sub3([0, b, 0], [0, 0, c]));
      const area = Math.sqrt(norm2(n)) / 2;
      if (far(area, Math.sqrt(a * a * b * b + b * b * c * c + c * c * a * a) / 2)) return `a, b, c = ${a}, ${b}, ${c}: cross product area ${area}`;
    }
    return null;
  },
  misconceptions: [{ response: 'sqrt(a^2 b^2 + b^2 c^2 + c^2 a^2)', why: t`The area of a triangle is half of two sides times the sine of the angle between them.` }],
});

const a5q3vol = auto({
  id: 'a5-q3-volume',
  source: cite('step-f05', 'Q3(i)'),
  title: t`The tetrahedron on the axes: the volume`,
  prompt: t`The points ${math`O`}, ${math`A`}, ${math`B`}, ${math`C`} have coordinates ${math`(${0}, ${0}, ${0})`}, ${math`(a, ${0}, ${0})`}, ${math`(${0}, b, ${0})`}, ${math`(${0}, ${0}, c)`}, where ${math`a, b, c`} are positive. Find the volume of the tetrahedron ${math`OABC`}.`,
  answer: { kind: 'expression', expected: 'a b c / 6', variables: ['a', 'b', 'c'], domains: POS },
  solution: [
    t`Base ${math`OAB`}: a right triangle with legs ${math`a`} and ${math`b`}, area ${math`\frac{${1}}{${2}}ab`}. Height: ${math`c`}, the distance of ${math`C`} from the plane ${math`z = ${0}`}.`,
    t`Volume ${math`= \frac{${1}}{${3}} \times \frac{${1}}{${2}}ab \times c = \frac{abc}{${6}}`}.`,
  ],
  reference: 'abc/6',
  verify: () => {
    const [a, b, c] = [2, 3, 7];
    const n = cross([0, b, 0], [0, 0, c]);
    return same('triple product volume', String(Math.abs(a * (n[0] as number)) / 6), String((a * b * c) / 6));
  },
  misconceptions: [{ response: 'abc/3', why: t`The base is a triangle, area ${math`\frac{${1}}{${2}}ab`}, not a rectangle.` }],
});

const a5q3d = supervision({
  id: 'a5-q3-distance',
  source: cite('step-f05', 'Q3'),
  title: t`The distance of the origin from the slanted face`,
  prompt: t`Let ${math`O`} be the origin and ${math`A`}, ${math`B`}, ${math`C`} the points ${math`(a, ${0}, ${0})`}, ${math`(${0}, b, ${0})`}, ${math`(${0}, ${0}, c)`}, with ${math`a, b, c`} positive, and let ${math`\theta = \angle ACB`}. Show that ${math`\cos \theta = \frac{c^{${2}}}{\sqrt{(a^{${2}} + c^{${2}})(b^{${2}} + c^{${2}})}}`}, find the area of triangle ${math`ABC`}, and hence show that ${math`d`}, the perpendicular distance of the origin from the triangle ${math`ABC`}, satisfies ${math`\frac{${1}}{d^{${2}}} = \frac{${1}}{a^{${2}}} + \frac{${1}}{b^{${2}}} + \frac{${1}}{c^{${2}}}`}.`,
  writeUp: 'proof',
  official: cite('step-f05-hints', 'Q3'),
});

// ---------------------------------------------------------------- lesson

const ROOM = [3, 4, 12];

export const coordinates3d: TopicContent = {
  topicId: 'geom.3d-coordinates',
  goal: t`Find distances, angles, areas, and volumes for points in space, as for the tetrahedron with vertices on the axes.`,
  objective: t`Find distances, angles, areas, and volumes for points given by three coordinates.`,
  why: t`STEP sets solid geometry through coordinates, and vectors build on exactly these calculations next.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`The longest rod in a room` },
    { kind: 'hook', text: t`A room is ${ROOM[0] as number} m wide, ${ROOM[1] as number} m long, and ${ROOM[2] as number} m high. What is the longest straight rod that fits inside, corner to opposite corner? It is longer than every edge and every wall diagonal. Pythagoras works in a flat triangle; how do you use it in a box?` },
    { kind: 'narrative', text: t`Use it twice. First go across the floor from one corner to the opposite corner of the floor: that diagonal is ${math`\sqrt{${9} + ${16}} = ${5}`}. Now stand that diagonal up against the vertical edge: they meet at a right angle, and the rod is the hypotenuse, ${math`\sqrt{${25} + ${144}} = ${13}`}. Coordinates turn this trick into a formula for any two points.` },
    { kind: 'definition', name: t`Coordinates in space`, formal: t`Fix an origin ${math`O`} and three mutually perpendicular axes ${math`x`}, ${math`y`}, ${math`z`}. A point ${math`P`} has [[space-coordinates|coordinates]] ${math`(x, y, z)`} when you reach it from ${math`O`} by moving ${math`x`} along the first axis, ${math`y`} along the second, and ${math`z`} along the third.`, plain: t`The first two coordinates say where you are on the floor; the third says how high. The point ${math`(${2}, ${3}, ${5})`} is ${5} above the floor point ${math`(${2}, ${3})`}.` },
    { kind: 'theorem', name: t`Distance formula`, statement: t`The distance between ${math`P = (x_{${1}}, y_{${1}}, z_{${1}})`} and ${math`Q = (x_{${2}}, y_{${2}}, z_{${2}})`} is ${math`PQ = \sqrt{(x_{${2}} - x_{${1}})^{${2}} + (y_{${2}} - y_{${1}})^{${2}} + (z_{${2}} - z_{${1}})^{${2}}}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Drop to the floor`, text: t`Let ${math`R = (x_{${2}}, y_{${2}}, z_{${1}})`}, the point level with ${math`P`} directly below or above ${math`Q`}.`, plain: t`${math`R`} has ${math`Q`}'s floor position and ${math`P`}'s height.` },
        { label: t`Pythagoras across`, text: t`${math`P`} and ${math`R`} are at the same height, so in the plane ${math`z = z_{${1}}`}:`, eq: [dmath`PR^{${2}} = (x_{${2}} - x_{${1}})^{${2}} + (y_{${2}} - y_{${1}})^{${2}}.`] },
        { label: t`Pythagoras up`, text: t`${math`RQ`} is vertical, of length ${math`|z_{${2}} - z_{${1}}|`}, and ${math`PR`} is horizontal, so the angle ${math`PRQ`} is a right angle:`, eq: [dmath`PQ^{${2}} = PR^{${2}} + RQ^{${2}} = (x_{${2}} - x_{${1}})^{${2}} + (y_{${2}} - y_{${1}})^{${2}} + (z_{${2}} - z_{${1}})^{${2}}.`], why: { q: t`Why is a vertical line perpendicular to a horizontal one?`, a: t`The ${math`z`}-axis is perpendicular to the ${math`x`} and ${math`y`} axes, so to every line in a horizontal plane.` } },
        { label: t`Take the root`, text: t`Distances are positive, so ${math`PQ`} is the positive square root.` },
      ],
    },
    checkFrom(distance, { p: [1, -2, 3], r: [3, 1, -3] }, t`Square the three differences, add, and take the square root.`),
    { kind: 'section', title: t`Volumes, and the tetrahedron on the axes` },
    { kind: 'p', text: t`A pyramid, with any flat base, has volume ${math`\frac{${1}}{${3}}`} of base area times height, the height being the perpendicular distance of the apex from the plane of the base. We take this as known. A [[tetrahedron|tetrahedron]] is a pyramid on a triangular base: four triangular faces.`, why: { q: t`Where does the third come from?`, a: t`A cube can be cut into three equal pyramids, each with a face of the cube as base and a far corner as apex. The general case needs integration, met later.` } },
    { kind: 'narrative', text: t`STEP likes the tetrahedron with one corner at the origin and the others on the axes, ${math`(a, ${0}, ${0})`}, ${math`(${0}, b, ${0})`}, ${math`(${0}, ${0}, c)`}. Three of its faces lie in the coordinate planes, so their areas and the volume are easy; the fourth face is slanted, and the angle in it needs the cosine rule.` },
    checkFrom(tetraVolume, { a: 3, b: 4, c: 5 }, t`Base ${math`\frac{${1}}{${2}} \times ${3} \times ${4} = ${6}`}, height ${5}, and a third of the product.`),
    { kind: 'section', title: t`Angles in space` },
    { kind: 'narrative', text: t`An angle in space is still an angle of a triangle. Three points always lie in one plane, so the cosine rule applies inside that plane: find the three side lengths from the distance formula, then solve for the cosine.` },
    { kind: 'theorem', name: t`Angle from three points`, statement: t`For distinct points ${math`A`}, ${math`B`}, ${math`C`} in space, not on one line, ${math`\cos \angle ACB = \frac{AC^{${2}} + BC^{${2}} - AB^{${2}}}{${2} \cdot AC \cdot BC}`}.` },
    { kind: 'p', text: t`This is the cosine rule rearranged, applied in the plane through the three points. For ${math`A = (${1}, ${0}, ${0})`}, ${math`B = (${0}, ${1}, ${0})`}, ${math`C = (${0}, ${0}, ${1})`}, every side is ${math`\sqrt{${2}}`}, so the triangle is equilateral and the cosine is ${math`\frac{${2} + ${2} - ${2}}{${2} \times ${2}} = \frac{${1}}{${2}}`}: the angle is ${math`${60}^\circ`}.` },
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`The distance between two points is the sum of the differences in their coordinates.`, counterexample: t`From ${math`(${0}, ${0}, ${0})`} to ${math`(${3}, ${4}, ${12})`} the differences add to ${19}, but the straight-line distance is ${13}. Adding differences measures a path along the edges of a box.` },
    { kind: 'pitfall', claim: t`The height of a pyramid is the length of a slanted edge.`, counterexample: t`The height is the perpendicular distance from the apex to the base's plane. A pyramid on a ${4} by ${6} base with apex ${computedTex(ptTex(APEX))} has height ${5}, while its edge from the origin is ${math`\sqrt{${4} + ${9} + ${25}} = \sqrt{${38}}`}.` },
    { kind: 'takeaway', text: t`In space, Pythagoras used twice gives the distance formula; with it, every length, angle, area, and volume follows from triangles and pyramids.` },
  ],
  examples: [
    workedCambridge(a5pyramid),
    worked(cosAngle, { a: 1, b: 2, c: 2 }, t`An angle of a slanted triangle`),
    worked(distance, { p: [2, -1, 4], r: [-1, 3, 6] }, t`A distance in space`),
  ],
  generators: [distance, tetraVolume, cosAngle],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['space-coordinates', 'tetrahedron'],
  cambridge: [a5q3vol, a5q3area, a5q3d],
  gate: ['a5-q3-distance', 'a5-q3-area'],
  recall: [
    { front: t`State the distance formula in three dimensions.`, back: t`${math`PQ^{${2}} = (x_{${2}} - x_{${1}})^{${2}} + (y_{${2}} - y_{${1}})^{${2}} + (z_{${2}} - z_{${1}})^{${2}}`}, by Pythagoras twice.` },
    { front: t`What is the volume of a pyramid?`, back: t`${math`\frac{${1}}{${3}}`} of base area times perpendicular height.` },
    { front: t`How do you find an angle between three points in space?`, back: t`Find the three side lengths, then rearrange the cosine rule.` },
  ],
  proofOrder: [
    {
      title: t`The distance formula`,
      steps: [
        t`Introduce the point with ${math`Q`}'s floor position and ${math`P`}'s height.`,
        t`Use Pythagoras across the horizontal plane for the floor distance.`,
        t`The vertical segment meets the horizontal one at a right angle.`,
        t`Use Pythagoras again, then take the positive square root.`,
      ],
    },
  ],
};
