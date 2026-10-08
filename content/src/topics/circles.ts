/**
 * geom.circles: the circle (x - a)^2 + (y - b)^2 = r^2 as the set of points at distance r
 * from (a, b), and finding the centre and radius by completing the square. Follows STEP
 * Support Foundation Assignment 8 Q2(i) (the circle on the diameter from (1, 5) to
 * (-5, 13), with the official answer from the hints) and Assignment 23 Q3 (2009 STEP I Q8:
 * the circles touching y = 0 and 3y = 4x, and the incircle of a 3, 4, 5 triangle). For that
 * question the lesson teaches when a line touches a circle (a repeated root) and the tangent
 * of a double angle, proved by reflecting a point in a line; its examples use other numbers.
 */
import { auto, cite, supervision, withUses } from '../cambridge';
import { add, div, int, mul, pick, q, str, sub, type Rational } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { computedMath, dmath, math, paren, t } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';
import { poly } from '../poly';
import { far } from '../partv-a';

const NAMES3 = ['a', 'b', 'r'] as const;
const NAMESK = ['a', 'b', 'k'] as const;
/** Terms of x^2 + y^2 + Dx + Ey + F, as expression text: built term by term. */
function circleText(D: number, E: number, F: number): string {
  const parts = ['x^2', 'y^2'];
  const term = (c: number, v: string): void => {
    if (c === 0) return;
    const m = Math.abs(c);
    parts.push(`${c < 0 ? '-' : '+'} ${m === 1 && v !== '' ? '' : m}${v}`);
  };
  term(D, 'x');
  term(E, 'y');
  term(F, '');
  return parts.slice(0, 2).join(' + ') + (parts.length > 2 ? ` ${parts.slice(2).join(' ')}` : '');
}

/** (x - a)^2 written the usual way: x^2, (x - 3)^2, (x + 2)^2. */
const sq = (v: string, c: number): string => (c === 0 ? `${v}^2` : `(${v} ${c < 0 ? '+' : '-'} ${Math.abs(c)})^2`);

// ---------------------------------------------------------------- centre and radius by completing the square

interface CrP { a: number; b: number; r: number }

const centreRadius = generator<CrP>({
  id: 'centre-radius',
  skill: 'Complete the square in x and in y to read off the centre and radius of a circle written as x^2 + y^2 + Dx + Ey + F = 0.',
  params: (rng) => {
    for (;;) {
      const p = { a: int(rng, -6, 6), b: int(rng, -6, 6), r: int(rng, 1, 9) };
      if (p.a !== 0 && p.b !== 0 && Math.abs(p.a) !== Math.abs(p.b) && p.r * p.r !== p.a * p.a + p.b * p.b) return p;
    }
  },
  sane: ({ r }) => (r > 0 ? null : 'out of range'),
  problem: ({ a, b, r }) => {
    const [D, E, F] = [-2 * a, -2 * b, a * a + b * b - r * r];
    return {
      prompt: t`The circle ${computedMath(`${circleText(D, E, F)} = ${0}`)} has centre ${math`(a, b)`} and radius ${math`r`}. Find ${math`a`}, ${math`b`}, and ${math`r`}.`,
      answer: {
        kind: 'witness', count: 3, names: NAMES3, example: `a = ${a}, b = ${b}, r = ${r}`,
        check: (v) => (v.map(str).join(',') === `${a},${b},${r}` ? null : 'Complete the square in x and in y separately, then move the constants to the right.'),
      },
      solution: [
        t`Group the ${math`x`} terms and the ${math`y`} terms: ${computedMath(`${poly([1, D, 0])} = (${poly([1, -a])})^${2} - ${a * a}`)} and ${computedMath(`${poly([1, E, 0], 'y')} = (${poly([1, -b], 'y')})^${2} - ${b * b}`)}.`,
        t`So the equation is ${computedMath(`${sq('x', a)} + ${sq('y', b)} - ${a * a} - ${b * b} ${F < 0 ? '-' : '+'} ${Math.abs(F)} = ${0}`)}, that is ${computedMath(`${sq('x', a)} + ${sq('y', b)} = ${r * r}`)}.`,
        t`The centre is ${math`(${a}, ${b})`}, with signs opposite to those inside the brackets, and the radius is ${math`\sqrt{${r * r}} = ${r}`}.`,
      ],
    };
  },
  solve: ({ a, b, r }) => {
    // From the coefficients: centre (-D/2, -E/2), radius sqrt(D^2/4 + E^2/4 - F), found by search.
    const [D, E, F] = [-2 * a, -2 * b, a * a + b * b - r * r];
    const r2 = (D * D) / 4 + (E * E) / 4 - F;
    let s = 0;
    while (s * s < r2) s++;
    return `a = ${-D / 2}, b = ${-E / 2}, r = ${s}`;
  },
  misconceptions: ({ a, b, r }): Misconception[] => [
    { response: `a = ${-a}, b = ${-b}, r = ${r}`, why: t`The signs of the centre are flipped. ${math`(x - a)^{${2}}`} has ${math`-a`} inside the bracket, so ${computedMath(sq('x', a))} means ${math`a = ${a}`}.` },
    { response: `a = ${a}, b = ${b}, r = ${r * r}`, why: t`That is ${math`r^{${2}}`}. The radius is its square root.` },
    { response: `a = ${-2 * a}, b = ${-2 * b}, r = ${r}`, why: t`The coefficient of ${math`x`} is ${math`-${2}a`}: halve it (and change the sign) to get ${math`a`}.` },
  ],
});

// ---------------------------------------------------------------- the circle on a diameter

interface DiaP { x1: number; y1: number; x2: number; y2: number }

const centreOf = ({ x1, y1, x2, y2 }: DiaP): [number, number] => [(x1 + x2) / 2, (y1 + y2) / 2];
const kOf = (p: DiaP): number => ((p.x2 - p.x1) ** 2 + (p.y2 - p.y1) ** 2) / 4;

const diameterCircle = generator<DiaP>({
  id: 'diameter-circle',
  skill: 'Find the circle with a given diameter: the centre is the midpoint, and the radius squared is a quarter of the squared length.',
  params: (rng) => {
    for (;;) {
      const p = { x1: int(rng, -8, 8), y1: int(rng, -8, 8), x2: int(rng, -8, 8), y2: int(rng, -8, 8) };
      if ((p.x1 - p.x2) % 2 === 0 && (p.y1 - p.y2) % 2 === 0 && p.x1 !== p.x2 && p.y1 !== p.y2) return p;
    }
  },
  sane: (p) => (Number.isInteger(kOf(p)) ? null : 'centre not integral'),
  problem: (p) => {
    const [a, b] = centreOf(p);
    const k = kOf(p);
    return {
      prompt: t`The line segment from ${math`(${p.x1}, ${p.y1})`} to ${math`(${p.x2}, ${p.y2})`} is a diameter of a circle. Write the circle as ${math`(x - a)^{${2}} + (y - b)^{${2}} = k`}, and give ${math`a`}, ${math`b`}, and ${math`k`}.`,
      answer: {
        kind: 'witness', count: 3, names: NAMESK, example: `a = ${a}, b = ${b}, k = ${k}`,
        check: (v) => (v.map(str).join(',') === `${a},${b},${k}` ? null : 'The centre is the midpoint of the diameter, and k is the radius squared.'),
      },
      solution: [
        t`The centre is the midpoint: ${math`\left(\frac{${p.x1} + ${paren(p.x2)}}{${2}}, \frac{${p.y1} + ${paren(p.y2)}}{${2}}\right) = (${a}, ${b})`}.`,
        t`The diameter has squared length ${math`(${p.x2 - p.x1})^{${2}} + (${p.y2 - p.y1})^{${2}} = ${4 * k}`}. The radius is half the diameter, so ${math`r^{${2}} = \frac{${4 * k}}{${4}} = ${k}`}.`,
        t`The circle is ${computedMath(`${sq('x', a)} + ${sq('y', b)} = ${k}`)}.`,
      ],
    };
  },
  solve: (p) => {
    // The circle is the set of points X with angle PXQ a right angle: (x - x1)(x - x2) + (y - y1)(y - y2) = 0.
    // Expanded, x^2 + y^2 - (x1 + x2)x - (y1 + y2)y + x1 x2 + y1 y2 = 0; complete the square.
    const a = (p.x1 + p.x2) / 2;
    const b = (p.y1 + p.y2) / 2;
    return `a = ${a}, b = ${b}, k = ${a * a + b * b - p.x1 * p.x2 - p.y1 * p.y2}`;
  },
  misconceptions: (p): Misconception[] => {
    const [a, b] = centreOf(p);
    const k = kOf(p);
    return [
      { response: `a = ${a}, b = ${b}, k = ${4 * k}`, why: t`That is the diameter squared. The radius is half the diameter, so ${math`r^{${2}}`} is a quarter of it.` },
      { response: `a = ${a}, b = ${b}, k = ${2 * k}`, why: t`Halving the squared length is not squaring half the length: ${math`\left(\frac{d}{${2}}\right)^{${2}} = \frac{d^{${2}}}{${4}}`}.` },
      { response: `a = ${-a}, b = ${-b}, k = ${k}`, why: t`The centre is the midpoint ${math`(${a}, ${b})`}; with ${math`(x - a)^{${2}}`} that is ${math`a = ${a}`}, not its negative.` },
    ];
  },
});

// ---------------------------------------------------------------- inside, on, or outside

interface PosP { a: number; b: number; r: number; px: number; py: number }

const where = ({ a, b, r, px, py }: PosP): 'in' | 'on' | 'out' => {
  const d2 = (px - a) ** 2 + (py - b) ** 2;
  return d2 < r * r ? 'in' : d2 === r * r ? 'on' : 'out';
};
const POS_OPTS: ChoiceOption[] = [
  { id: 'in', label: t`inside the circle` },
  { id: 'on', label: t`on the circle` },
  { id: 'out', label: t`outside the circle` },
];

const pointPosition = generator<PosP>({
  id: 'point-position',
  skill: 'Decide whether a point is inside, on, or outside a circle by comparing its squared distance from the centre with r^2.',
  quick: true,
  params: (rng) => {
    const a = int(rng, -4, 4);
    const b = int(rng, -4, 4);
    const r = pick(rng, [5, 10, 13]);
    const kind = pick(rng, ['in', 'on', 'out'] as const);
    const on = r === 5 ? [3, 4] : r === 10 ? [6, 8] : [5, 12];
    const [u, v] = rng() < 0.5 ? on : [on[1], on[0]];
    const sx = rng() < 0.5 ? 1 : -1;
    const sy = rng() < 0.5 ? 1 : -1;
    const shrink = kind === 'in' ? -1 : kind === 'out' ? 1 : 0;
    return { a, b, r, px: a + sx * ((u as number) + shrink), py: b + sy * (v as number) };
  },
  sane: () => null,
  problem: (p) => {
    const d2 = (p.px - p.a) ** 2 + (p.py - p.b) ** 2;
    const w = where(p);
    return {
      prompt: t`Is the point ${math`(${p.px}, ${p.py})`} inside, on, or outside the circle ${computedMath(`${sq('x', p.a)} + ${sq('y', p.b)} = ${p.r * p.r}`)}?`,
      answer: { kind: 'choice', options: POS_OPTS, correct: w },
      solution: [
        t`The centre is ${math`(${p.a}, ${p.b})`} and ${math`r^{${2}} = ${p.r * p.r}`}. The squared distance of the point from the centre is ${math`(${p.px - p.a})^{${2}} + (${p.py - p.b})^{${2}} = ${d2}`}.`,
        w === 'in' ? t`${math`${d2} < ${p.r * p.r}`}, so the point is closer than the radius: inside.` : w === 'on' ? t`${math`${d2} = ${p.r * p.r}`}, so the point is exactly at distance ${p.r}: on the circle.` : t`${math`${d2} > ${p.r * p.r}`}, so the point is further than the radius: outside.`,
      ],
    };
  },
  solve: (p) => {
    // Substitute the point into the left side and compare with r^2, as a sign test.
    const lhs = (p.px - p.a) * (p.px - p.a) + (p.py - p.b) * (p.py - p.b) - p.r * p.r;
    return [lhs < 0 ? 'in' : lhs === 0 ? 'on' : 'out'];
  },
  misconceptions: (p): Misconception[] => {
    const w = where(p);
    const others = (['in', 'on', 'out'] as const).filter((x) => x !== w);
    return others.map((o) => ({
      response: [o],
      why: o === 'on'
        ? t`On the circle means the squared distance equals ${math`r^{${2}}`} exactly. Work it out: the differences are ${math`${p.px - p.a}`} and ${math`${p.py - p.b}`}.`
        : t`Compare the squared distance from the centre ${math`(${p.a}, ${p.b})`}, not from the origin, with ${math`r^{${2}} = ${p.r * p.r}`}.`,
    }));
  },
});

// ---------------------------------------------------------------- Cambridge problems

const a8q2i = auto({
  id: 'a8-q2-i',
  source: cite('step-f08', 'Q2(i)'),
  title: t`The circle on a given diameter`,
  prompt: t`Find the equation of the circle which has the line joining ${math`(${1}, ${5})`} to ${math`(-${5}, ${13})`} as its diameter. Write it as ${math`(x - a)^{${2}} + (y - b)^{${2}} = k`} and give ${math`a`}, ${math`b`}, ${math`k`}.`,
  answer: {
    kind: 'witness', count: 3, names: NAMESK, example: 'a = -2, b = 9, k = 25',
    check: (v) => (v.map(str).join(',') === '-2,9,25' ? null : 'The centre is the midpoint of the diameter, and k is the radius squared.'),
  },
  solution: [
    t`The centre is the midpoint, ${math`\left(\frac{${1} - ${5}}{${2}}, \frac{${5} + ${13}}{${2}}\right) = (-${2}, ${9})`}.`,
    t`The diameter has length ${math`\sqrt{${6}^{${2}} + ${8}^{${2}}} = ${10}`}, so the radius is ${5}.`,
    t`The circle is ${math`(x + ${2})^{${2}} + (y - ${9})^{${2}} = ${25}`}.`,
  ],
  reference: 'a = -2, b = 9, k = 25',
  verify: () => {
    // Both ends lie on the circle, at opposite ends through the centre.
    const on = (x: number, y: number): boolean => (x + 2) ** 2 + (y - 9) ** 2 === 25;
    return on(1, 5) && on(-5, 13) && (1 + -5) / 2 === -2 && (5 + 13) / 2 === 9 ? null : 'the ends are not on the circle';
  },
  misconceptions: [{ response: 'a = -2, b = 9, k = 100', why: t`${100} is the diameter squared; the radius squared is ${25}.` }],
  official: { source: cite('step-f08-hints', 'Q2(i)'), answer: 'a = -2, b = 9, k = 25', agrees: true },
});

const INC = [2, 1, 1];

const a23incircle = auto({
  id: 'a23-q3-ii',
  source: cite('step-f23', 'Q3(ii)'),
  title: t`The incircle of a triangle`,
  prompt: t`Find the incircle of the triangle formed by the lines ${math`y = ${0}`}, ${math`${3}y = ${4}x`}, and ${math`${4}y + ${3}x = ${15}`}: the circle inside the triangle touching all three sides. Write it as ${math`(x - a)^{${2}} + (y - b)^{${2}} = r^{${2}}`} with ${math`r > ${0}`}, and give ${math`a`}, ${math`b`}, ${math`r`}. (From part (i): every circle ${math`(x - ${2}t)^{${2}} + (y - t)^{${2}} = t^{${2}}`}, ${math`t > ${0}`}, touches both ${math`y = ${0}`} and ${math`${3}y = ${4}x`}.)`,
  answer: {
    kind: 'witness', count: 3, names: NAMES3, example: 'a = 2, b = 1, r = 1',
    check: (v) => (v.map(str).join(',') === INC.join(',') ? null : 'The circle has the form of part (i); choose t so that it touches the third line, inside the triangle.'),
  },
  hints: [
    t`By part (i), what are the centre and radius of a circle touching the first two lines, in terms of ${math`t`}?`,
    t`Substituting the third line into that circle, which quadratic in ${math`y`} results, and what condition makes the line touch?`,
    t`Of the values of ${math`t`} found, which puts the centre inside the triangle?`,
  ],
  nudge: t`Not quite. Two circles of the family touch all three lines; only one lies inside the triangle.`,
  solution: [
    t`By part (i), the circle is ${math`(x - ${2}t)^{${2}} + (y - t)^{${2}} = t^{${2}}`}: centre ${math`(${2}t, t)`}, radius ${math`t`}.`,
    t`Substitute ${math`x = ${5} - \frac{${4}}{${3}}y`} and multiply by ${9}: ${math`${25}y^{${2}} + (${30}t - ${120})y + ${36}t^{${2}} - ${180}t + ${225} = ${0}`}.`,
    t`Touching needs discriminant ${0}: ${math`(${30}t - ${120})^{${2}} = ${100}(${36}t^{${2}} - ${180}t + ${225})`}, which simplifies to ${math`t^{${2}} - ${4}t + ${3} = ${0}`}, so ${math`t = ${1}`} or ${math`t = ${3}`}.`,
    t`With ${math`t = ${3}`} the centre ${math`(${6}, ${3})`} has ${math`${3}x + ${4}y = ${30} > ${15}`}: outside the triangle. So ${math`t = ${1}`}: ${math`(x - ${2})^{${2}} + (y - ${1})^{${2}} = ${1}`}.`,
    t`Touching means a repeated root; then check which solution fits the picture.`,
  ],
  reference: 'a = 2, b = 1, r = 1',
  verify: () => {
    // The distance from (2, 1) to each side is 1, and (2, 1) is inside the triangle.
    const lines: [number, number, number][] = [[0, 1, 0], [4, -3, 0], [3, 4, -15]];
    for (const [A, B, C] of lines) if (far(Math.abs(A * 2 + B * 1 + C) / Math.hypot(A, B), 1)) return `distance to ${A}x + ${B}y + ${C} = 0`;
    // Inside: below 3y = 4x's left side, above y = 0, below 3x + 4y = 15.
    const inside = 1 > 0 && 4 * 2 - 3 * 1 > 0 && 3 * 2 + 4 * 1 < 15;
    if (!inside) return 'centre outside';
    // And t = 3 also touches all three lines, from outside.
    for (const [A, B, C] of lines) if (far(Math.abs(A * 6 + B * 3 + C) / Math.hypot(A, B), 3)) return 't = 3 does not touch';
    return null;
  },
  misconceptions: [{ response: 'a = 6, b = 3, r = 3', why: t`That circle touches all three lines, but from outside the triangle. Its centre ${math`(${6}, ${3})`} has ${math`${3}x + ${4}y = ${30} > ${15}`}.` }],
  official: { source: cite('step-f23-hints', 'Q3(ii)'), answer: 'a = 2, b = 1, r = 1', agrees: true },
});

const a23q3i = supervision({
  id: 'a23-q3-i',
  source: cite('step-f23', 'Q3(i)'),
  title: t`A family of circles touching two lines`,
  prompt: t`The circle ${math`C`} has equation ${math`(x - ${2}t)^{${2}} + (y - t)^{${2}} = t^{${2}}`}, where ${math`t`} is a positive number. Show that ${math`C`} touches the line ${math`y = ${0}`}. Let ${math`\alpha`} be the acute angle between the ${math`x`}-axis and the line joining the origin to the centre of ${math`C`}. Show that ${math`\tan ${2}\alpha = \frac{${4}}{${3}}`}, and deduce that ${math`C`} touches the line ${math`${3}y = ${4}x`}.`,
  hints: [
    t`What are the centre and radius of ${math`C`}, and how far is the centre from ${math`y = ${0}`}?`,
    t`With ${math`\tan\alpha`} read off from the centre, what does the double-angle formula give for ${math`\tan ${2}\alpha`}?`,
    t`Which line through the origin makes angle ${math`${2}\alpha`} with the ${math`x`}-axis, and why does reflection in the line through the centre carry ${math`y = ${0}`} onto it?`,
  ],
  writeUp: 'proof',
  official: cite('step-f23-hints', 'Q3(i)'),
});

// ---------------------------------------------------------------- lesson

const EX = { a: 3, b: -1, r: 4 };
const NOT = { D: 2, E: 4, F: 10 };

// When a line touches a circle: x^2 + y^2 = r2 and y = m x + c. Substituting gives
// (1 + m^2) x^2 + 2mc x + (c^2 - r2) = 0, with discriminant 4((1 + m^2) r2 - c^2).
const TAN = { r2: 5, m: 2 };
const tanA = 1 + TAN.m ** 2;
const tanB = 2 * TAN.m;
const tanDiscConst = 4 * tanA * TAN.r2;
const tanDiscC2 = tanB ** 2 - 4 * tanA;
const tanC2 = tanDiscConst / -tanDiscC2;
const tanC = Math.sqrt(tanC2);
const tanX = -(tanB * tanC) / (2 * tanA);
const tanY = TAN.m * tanX + tanC;

// Twice an angle: tan(alpha) = 1/3, the circle with centre (6, 2) and radius 2.
const dblM = q(1, 3);
const dblM2 = mul(dblM, dblM);
const dblTop = mul(q(2), dblM);
const dblBottom = sub(q(1), dblM2);
const dblG = div(dblTop, dblBottom);
const DBL = { cx: 6, cy: 2, r: 2 };
// Substituting y = g x into (x - cx)^2 + (y - cy)^2 = r^2: A x^2 + B x + C = 0, then clearing
// the denominator of A to get whole coefficients.
const dblA = add(q(1), mul(dblG, dblG));
const dblB = sub(q(-2 * DBL.cx), mul(q(2 * DBL.cy), dblG));
const dblC = q(DBL.cx ** 2 + DBL.cy ** 2 - DBL.r ** 2);
const dblScale = Number(dblA.den);
const whole = (x: Rational): number => {
  const y = mul(x, q(dblScale));
  if (y.den !== 1n) throw new Error('circles: the scaled coefficient is not whole');
  return Number(y.num);
};
const [dA, dB, dC] = [whole(dblA), whole(dblB), whole(dblC)];
const dblDisc = dB ** 2 - 4 * dA * dC;
const dblX = q(-dB, 2 * dA);
const dblY = mul(dblG, dblX);
const square = (x: Rational): Rational => mul(x, x);
const dblCheck = add(square(sub(dblX, q(DBL.cx))), square(sub(dblY, q(DBL.cy))));
const dblG2 = mul(dblG, dblG);
const dbl2gcy = mul(q(2 * DBL.cy), dblG);
const dblXc = sub(dblX, q(DBL.cx));
const dblYc = sub(dblY, q(DBL.cy));

export const circles: TopicContent = {
  topicId: 'geom.circles',
  goal: t`Write a circle as ${math`(x - a)^{${2}} + (y - b)^{${2}} = r^{${2}}`}, find its centre and radius by completing the square, and tell when a line touches it.`,
  objective: t`Write the equation of a circle, find its centre and radius, and tell when a line touches it.`,
  why: t`Circles are the first curves beyond lines; STEP asks where they meet lines and each other, which comes next.`,
  minutes: 30,
  lesson: [
    { kind: 'section', title: t`A circle as an equation` },
    { kind: 'hook', text: t`A circle is the simplest curve there is: every point the same distance from the centre. Can you turn that sentence into an equation in ${math`x`} and ${math`y`}? And if someone hands you ${computedMath(`${circleText(-6, 2, -6)} = ${0}`)}, can you tell that it is a circle, and find its centre?` },
    { kind: 'definition', name: t`Circle`, formal: t`The [[circle-equation|circle]] with centre ${math`(a, b)`} and radius ${math`r > ${0}`} is the set ${math`\{(x, y) : \sqrt{(x - a)^{${2}} + (y - b)^{${2}}} = r\}`}.`, plain: t`All the points at distance ${math`r`} from ${math`(a, b)`}, using the distance formula. With centre ${math`(${EX.a}, ${EX.b})`} and radius ${EX.r}, the point ${math`(${EX.a + EX.r}, ${EX.b})`} is on it.` },
    { kind: 'theorem', name: t`Equation of a circle`, statement: t`A point ${math`(x, y)`} lies on the circle with centre ${math`(a, b)`} and radius ${math`r > ${0}`} if and only if ${math`(x - a)^{${2}} + (y - b)^{${2}} = r^{${2}}`}.` },
    { kind: 'p', text: t`Why: both sides of ${math`\sqrt{(x - a)^{${2}} + (y - b)^{${2}}} = r`} are at least ${0}, and for numbers that are at least ${0}, squaring keeps equal things equal and unequal things unequal. So the square-root equation and the squared one have exactly the same solutions.`, why: { q: t`Why does it matter that both sides are at least ${0}?`, a: t`Squaring can create solutions: ${math`-${3} \neq ${3}`}, yet ${math`(-${3})^{${2}} = ${3}^{${2}}`}. A distance and a radius are never negative, so that cannot happen here.` } },
    checkFrom(diameterCircle, { x1: -3, y1: 2, x2: 5, y2: 8 }, t`The centre is the midpoint, and ${math`k = r^{${2}}`} is a quarter of the squared diameter.`),
    { kind: 'section', title: t`Completing the square` },
    { kind: 'narrative', text: t`Expand ${math`(x - a)^{${2}} + (y - b)^{${2}} = r^{${2}}`} and you get ${math`x^{${2}} + y^{${2}} - ${2}ax - ${2}by + (a^{${2}} + b^{${2}} - r^{${2}}) = ${0}`}. So a circle always looks like ${math`x^{${2}} + y^{${2}} + Dx + Ey + F = ${0}`}: the squares of ${math`x`} and ${math`y`} with equal coefficients and no ${math`xy`} term. To go backwards, rebuild the squares.` },
    { kind: 'theorem', name: t`Centre and radius`, statement: t`The equation ${math`x^{${2}} + y^{${2}} + Dx + Ey + F = ${0}`} is a circle if and only if ${math`\frac{D^{${2}}}{${4}} + \frac{E^{${2}}}{${4}} - F > ${0}`}. Its centre is ${math`\left(-\frac{D}{${2}}, -\frac{E}{${2}}\right)`} and its radius is ${math`\sqrt{\frac{D^{${2}}}{${4}} + \frac{E^{${2}}}{${4}} - F}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Complete the square in x`, text: t`${math`x^{${2}} + Dx = \left(x + \frac{D}{${2}}\right)^{${2}} - \frac{D^{${2}}}{${4}}`}.`, plain: t`Expanding the bracket gives ${math`x^{${2}} + Dx + \frac{D^{${2}}}{${4}}`}, so subtract the extra ${math`\frac{D^{${2}}}{${4}}`}. With ${math`D = -${6}`}: ${math`x^{${2}} - ${6}x = (x - ${3})^{${2}} - ${9}`}.` },
        { label: t`The same in y`, text: t`${math`y^{${2}} + Ey = \left(y + \frac{E}{${2}}\right)^{${2}} - \frac{E^{${2}}}{${4}}`}.` },
        { label: t`Rearrange`, text: t`Substitute both and move the constants to the right:`, eq: [dmath`\left(x + \tfrac{D}{${2}}\right)^{${2}} + \left(y + \tfrac{E}{${2}}\right)^{${2}} = \tfrac{D^{${2}}}{${4}} + \tfrac{E^{${2}}}{${4}} - F.`] },
        { label: t`Read it off`, text: t`If the right side is positive, call it ${math`r^{${2}}`}: this is the circle with centre ${math`\left(-\frac{D}{${2}}, -\frac{E}{${2}}\right)`} and radius ${math`r`}. If it is ${0}, only the centre satisfies the equation; if negative, no point does, since the left side is a sum of squares.` },
      ],
    },
    { kind: 'p', text: t`For the hook's equation: ${math`x^{${2}} - ${6}x = (x - ${3})^{${2}} - ${9}`} and ${math`y^{${2}} + ${2}y = (y + ${1})^{${2}} - ${1}`}, so it is ${math`(x - ${3})^{${2}} + (y + ${1})^{${2}} = ${6} + ${9} + ${1} = ${16}`}: centre ${math`(${3}, -${1})`}, radius ${4}.` },
    checkFrom(centreRadius, { a: 2, b: -5, r: 3 }, t`Halve the coefficients of ${math`x`} and ${math`y`} and change their signs for the centre; the radius squared is what remains on the right.`),
    { kind: 'section', title: t`When a line touches a circle` },
    { kind: 'narrative', text: t`A line and a circle can meet in two points, in one, or not at all. The middle case is special: the line just grazes the circle. STEP asks for it all the time, so we want a test you can do with algebra, not by eye.` },
    {
      kind: 'definition',
      name: t`Touching`,
      formal: t`A line [[tangent-line|touches]] a circle, or is a tangent to it, if the line and the circle have exactly one point in common.`,
      plain: t`One meeting point, no more. The line ${math`y = ${EX.b + EX.r}`} touches the circle with centre ${math`(${EX.a}, ${EX.b})`} and radius ${EX.r} at its top point, ${math`(${EX.a}, ${EX.b + EX.r})`}.`,
    },
    { kind: 'theorem', name: t`A test for touching`, statement: t`Let a circle have centre ${math`(a, b)`} and radius ${math`r > ${0}`}. Substituting ${math`y = mx + c`} into ${math`(x - a)^{${2}} + (y - b)^{${2}} = r^{${2}}`} gives a quadratic equation in ${math`x`} whose ${math`x^{${2}}`} coefficient is ${math`${1} + m^{${2}}`}; the line ${math`y = mx + c`} touches the circle if and only if this quadratic has discriminant ${0}. The line ${math`y = k`} touches the circle if and only if ${math`|k - b| = r`}, and the line ${math`x = h`} touches it if and only if ${math`|h - a| = r`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Meeting points are roots`, text: t`A point ${math`(x, y)`} is on both exactly when ${math`y = mx + c`} and ${math`(x - a)^{${2}} + (mx + c - b)^{${2}} = r^{${2}}`}. So each meeting point gives a root ${math`x`} of the second equation, and each real root gives exactly one meeting point, ${math`(x, mx + c)`}.`, plain: t`On the line, ${math`y`} is fixed by ${math`x`}, so counting meeting points is counting real roots.` },
        { label: t`It is a quadratic`, text: t`Expanding, the ${math`x^{${2}}`} terms are ${math`x^{${2}} + m^{${2}}x^{${2}}`}, so the equation is ${math`(${1} + m^{${2}})x^{${2}} + Bx + C = ${0}`} for some numbers ${math`B`} and ${math`C`}. Its leading coefficient ${math`${1} + m^{${2}}`} is at least ${1}, never ${0}.` },
        { label: t`One point, one root`, text: t`The line touches the circle exactly when there is one meeting point, so exactly when the quadratic has exactly one real root, which is exactly when its discriminant ${math`B^{${2}} - ${4}(${1} + m^{${2}})C`} is ${0}.`, why: { q: t`Why does the discriminant count the roots?`, a: t`By the quadratic formula, ${math`Ax^{${2}} + Bx + C = ${0}`} with ${math`A \neq ${0}`} has roots ${math`\frac{-B \pm \sqrt{B^{${2}} - ${4}AC}}{${2}A}`}: two different real roots when ${math`B^{${2}} - ${4}AC`} is positive, one repeated root when it is ${0}, and none when it is negative. Here ${math`A = ${1} + m^{${2}}`}.` } },
        { label: t`Lines parallel to an axis`, text: t`For ${math`y = k`} the equation is ${math`(x - a)^{${2}} = r^{${2}} - (k - b)^{${2}}`}. A square equals a positive number for two values of ${math`x`}, equals ${0} only for ${math`x = a`}, and is never negative. So there is exactly one meeting point if and only if ${math`(k - b)^{${2}} = r^{${2}}`}, that is ${math`|k - b| = r`}. Swapping the roles of ${math`x`} and ${math`y`} gives the test for ${math`x = h`}.`, plain: t`${math`|k - b|`} is the distance from the centre to the line: a line parallel to an axis touches the circle when it is exactly one radius from the centre.` },
      ],
    },
    { kind: 'p', text: t`For example, which lines ${math`y = ${TAN.m}x + c`} touch the circle ${math`x^{${2}} + y^{${2}} = ${TAN.r2}`}? Substitute: ${math`x^{${2}} + (${TAN.m}x + c)^{${2}} = ${TAN.r2}`}. Expand the bracket, ${math`(${TAN.m}x + c)^{${2}} = ${TAN.m ** 2}x^{${2}} + ${tanB}cx + c^{${2}}`}, and collect terms: ${math`${tanA}x^{${2}} + ${tanB}cx + c^{${2}} - ${TAN.r2} = ${0}`}. The discriminant is ${math`(${tanB}c)^{${2}} - ${4} \times ${tanA} \times (c^{${2}} - ${TAN.r2}) = ${tanB ** 2}c^{${2}} - ${4 * tanA}c^{${2}} + ${tanDiscConst} = ${tanDiscConst} - ${-tanDiscC2}c^{${2}}`}. It is ${0} when ${math`c^{${2}} = ${tanC2}`}, so ${math`c = ${tanC}`} or ${math`c = -${tanC}`}. With ${math`c = ${tanC}`} the quadratic is ${math`${tanA}x^{${2}} + ${tanB * tanC}x + ${tanC2 - TAN.r2} = ${0}`}; divide by ${tanA}: ${math`x^{${2}} + ${(tanB * tanC) / tanA}x + ${(tanC2 - TAN.r2) / tanA} = (x + ${-tanX})^{${2}} = ${0}`}, so ${math`x = ${tanX}`} and ${math`y = ${TAN.m} \times (${tanX}) + ${tanC} = ${tanY}`}. Check: ${math`(${tanX})^{${2}} + ${tanY}^{${2}} = ${tanX ** 2} + ${tanY ** 2} = ${TAN.r2}`}.` },
    { kind: 'section', title: t`Twice an angle` },
    { kind: 'narrative', text: t`STEP likes circles squeezed into the corner between two lines through the origin. Here is the picture to hold. A circle touches the ${math`x`}-axis, and its centre ${math`M`} lies on a line through the origin ${math`O`} at angle ${math`\alpha`} to the ${math`x`}-axis. Then it also touches the line through ${math`O`} at angle ${math`${2}\alpha`}.` },
    { kind: 'p', text: t`Why: reflect everything in the line ${math`OM`}. The circle goes to itself, because its centre is on the mirror and reflection keeps every distance. The ${math`x`}-axis goes to the line through ${math`O`} at angle ${math`${2}\alpha`}, because reflection keeps the angle to the mirror, ${math`\alpha`}, but puts it on the other side. So the one meeting point of the circle with the ${math`x`}-axis becomes one meeting point with the new line.`, why: { q: t`Why exactly one, and not more?`, a: t`Reflecting is undone by reflecting again. If the new line met the circle in two points, reflecting back would give two meeting points with the ${math`x`}-axis, and there is only one.` } },
    { kind: 'narrative', text: t`To use this you need the gradient of the line at angle ${math`${2}\alpha`}. For an angle ${math`\theta`} between ${math`${0}^{\circ}`} and ${math`${90}^{\circ}`}, the line through ${math`O`} at angle ${math`\theta`} has gradient ${math`\tan\theta`}: it passes through ${math`(${1}, \tan\theta)`}, the top of a right triangle with base ${1} and angle ${math`\theta`} at ${math`O`}. So the question is: given ${math`\tan\alpha`}, what is ${math`\tan ${2}\alpha`}? It is not ${math`${2}\tan\alpha`}.` },
    { kind: 'theorem', name: t`Tangent of a double angle`, statement: t`If ${math`${0}^{\circ} < \alpha < ${45}^{\circ}`}, then ${dmath`\tan ${2}\alpha = \frac{${2}\tan\alpha}{${1} - \tan^{${2}}\alpha}.`}` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Reflect a point of the axis`, text: t`Let ${math`m = \tan\alpha`}, so the mirror ${math`L`} is ${math`y = mx`}, and reflect ${math`P = (${1}, ${0})`} in ${math`L`} to get ${math`P'`}. As above, ${math`OP'`} is at angle ${math`${2}\alpha`}, and ${math`${2}\alpha < ${90}^{\circ}`}, so the gradient of ${math`OP'`} is ${math`\tan ${2}\alpha`}.`, plain: t`Since ${math`${0}^{\circ} < \alpha < ${45}^{\circ}`}, the gradient ${math`m`} is between ${0} and ${1}.` },
        { label: t`Find the foot of the perpendicular`, text: t`The line through ${math`P`} perpendicular to ${math`L`} has gradient ${math`-\frac{${1}}{m}`}, so it is ${math`y = -\frac{x - ${1}}{m}`}. It meets ${math`L`} where ${math`mx = -\frac{x - ${1}}{m}`}. Multiply by ${math`m`}: ${math`m^{${2}}x = -x + ${1}`}, so ${math`(${1} + m^{${2}})x = ${1}`}. Call the meeting point ${math`F`}: ${math`F = \left(\frac{${1}}{${1} + m^{${2}}}, \frac{m}{${1} + m^{${2}}}\right)`}.`, why: { q: t`Why ${math`-\frac{${1}}{m}`}?`, a: t`Perpendicular gradients multiply to ${math`-${1}`}, and ${math`m \neq ${0}`}. With ${math`m = ${dblM}`}, the perpendicular gradient is ${math`${div(q(-1), dblM)}`}.` } },
        { label: t`Double the step to F`, text: t`The mirror is the perpendicular bisector of ${math`PP'`}, so ${math`F`} is the midpoint of ${math`P`} and ${math`P'`}, and ${math`P' = ${2}F - P`}. Its coordinates are ${math`\frac{${2}}{${1} + m^{${2}}} - ${1} = \frac{${1} - m^{${2}}}{${1} + m^{${2}}}`} and ${math`\frac{${2}m}{${1} + m^{${2}}}`}.`, plain: t`Going from ${math`P`} to ${math`F`} and the same again lands on ${math`P'`}. And ${math`\frac{${2}}{${1} + m^{${2}}} - ${1} = \frac{${2} - (${1} + m^{${2}})}{${1} + m^{${2}}}`}.` },
        { label: t`Read off the gradient`, text: t`The gradient of ${math`OP'`} is its ${math`y`}-coordinate over its ${math`x`}-coordinate: ${math`\frac{${2}m}{${1} + m^{${2}}} \div \frac{${1} - m^{${2}}}{${1} + m^{${2}}} = \frac{${2}m}{${1} - m^{${2}}}`}, the factors ${math`${1} + m^{${2}}`} cancelling. Since ${math`m < ${1}`}, the bottom ${math`${1} - m^{${2}}`} is not ${0}. So ${math`\tan ${2}\alpha = \frac{${2}\tan\alpha}{${1} - \tan^{${2}}\alpha}`}.` },
      ],
    },
    { kind: 'p', text: t`Try it with ${math`\tan\alpha = ${dblM}`}: ${math`\tan ${2}\alpha = \frac{${2} \times ${dblM}}{${1} - ${dblM2}} = \frac{${dblTop}}{${dblBottom}} = ${dblTop} \times ${div(q(1), dblBottom)} = ${dblG}`}, since dividing by ${math`${dblBottom}`} is multiplying by ${math`${div(q(1), dblBottom)}`}. Now take the circle with centre ${math`(${DBL.cx}, ${DBL.cy})`} and radius ${DBL.r}. It touches ${math`y = ${0}`}, since ${math`|${DBL.cy} - ${0}| = ${DBL.r}`}. Its centre is on ${math`y = ${dblM}x`}, the line at angle ${math`\alpha`}. So it also touches ${math`y = ${dblG}x`}, the line at angle ${math`${2}\alpha`}.` },
    { kind: 'p', text: t`Check with the test for touching. Substitute ${math`y = ${dblG}x`} into ${math`(x - ${DBL.cx})^{${2}} + (y - ${DBL.cy})^{${2}} = ${DBL.r ** 2}`} and expand both brackets: ${math`x^{${2}} - ${2 * DBL.cx}x + ${DBL.cx ** 2} + ${dblG2}x^{${2}} - ${dbl2gcy}x + ${DBL.cy ** 2} = ${DBL.r ** 2}`}. Collect terms, using ${math`${1} + ${dblG2} = ${dblA}`}, ${math`${2 * DBL.cx} + ${dbl2gcy} = ${sub(q(0), dblB)}`}, and ${math`${DBL.cx ** 2} + ${DBL.cy ** 2} - ${DBL.r ** 2} = ${dblC}`}: ${math`${dblA}x^{${2}} - ${sub(q(0), dblB)}x + ${dblC} = ${0}`}. Then multiply by ${dblScale} to clear the fraction: ${math`${dA}x^{${2}} ${dB < 0 ? '-' : '+'} ${Math.abs(dB)}x + ${dC} = ${0}`}. The discriminant is ${math`${dB ** 2} - ${4} \times ${dA} \times ${dC} = ${dblDisc}`}, so the line touches the circle. The repeated root is ${math`x = \frac{${-dB}}{${2} \times ${dA}} = ${dblX}`}, and then ${math`y = ${dblG} \times ${dblX} = ${dblY}`}. Indeed ${math`\left(${dblX} - ${DBL.cx}\right)^{${2}} + \left(${dblY} - ${DBL.cy}\right)^{${2}} = \left(${dblXc}\right)^{${2}} + \left(${dblYc}\right)^{${2}} = ${square(dblXc)} + ${square(dblYc)} = ${dblCheck}`}, the radius squared.` },
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`Every equation ${math`x^{${2}} + y^{${2}} + Dx + Ey + F = ${0}`} is a circle.`, counterexample: t`${computedMath(`${circleText(NOT.D, NOT.E, NOT.F)} = ${0}`)} becomes ${math`(x + ${1})^{${2}} + (y + ${2})^{${2}} = ${1} + ${4} - ${10} = -${5}`}. A sum of squares is never negative, so no point satisfies it.` },
    { kind: 'pitfall', claim: t`The centre of ${math`(x + ${2})^{${2}} + (y - ${9})^{${2}} = ${25}`} is ${math`(${2}, -${9})`}.`, counterexample: t`The bracket is ${math`x - a`}, so ${math`x + ${2}`} means ${math`a = -${2}`}: the centre is ${math`(-${2}, ${9})`}. Check: ${math`(-${2}, ${9})`} makes both brackets ${0}.` },
    { kind: 'pitfall', claim: t`${math`${2}x^{${2}} + ${2}y^{${2}} - ${8}x = ${0}`} has radius ${math`\sqrt{${8}}`}, completing the square as it stands.`, counterexample: t`Divide by ${2} first, so the squares have coefficient ${1}: ${math`x^{${2}} + y^{${2}} - ${4}x = ${0}`}, which is ${math`(x - ${2})^{${2}} + y^{${2}} = ${4}`}, radius ${2}.` },
    { kind: 'pitfall', claim: t`Doubling an angle doubles its tangent: if ${math`\tan\alpha = ${dblM}`}, then ${math`\tan ${2}\alpha = ${mul(q(2), dblM)}`}.`, counterexample: t`The formula gives ${math`\tan ${2}\alpha = ${dblG}`}, not ${math`${mul(q(2), dblM)}`}. The line at angle ${math`${2}\alpha`} is steeper than twice the gradient, because ${math`${1} - \tan^{${2}}\alpha`} is less than ${1}.` },
    { kind: 'takeaway', text: t`A circle is ${math`(x - a)^{${2}} + (y - b)^{${2}} = r^{${2}}`}; complete the square to find its centre and radius, and a line touches it when substitution gives a repeated root.` },
  ],
  examples: [
    workedCambridge(a8q2i),
    worked(centreRadius, { a: -4, b: 3, r: 6 }, t`Centre and radius by completing the square`),
    worked(pointPosition, { a: 1, b: -2, r: 5, px: 4, py: 3 }, t`Inside or outside?`),
  ],
  generators: [centreRadius, diameterCircle, pointPosition],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['circle-equation'],
  cambridge: withUses([a23incircle, a23q3i], {
    'a23-q3-i': { sections: ['A circle as an equation', 'When a line touches a circle', 'Twice an angle'], note: t`A circle touching two lines, with a double angle` },
    'a23-q3-ii': { sections: ['A circle as an equation', 'Completing the square', 'When a line touches a circle'], note: t`Finding the circle that touches three lines` },
  }),
  gate: ['a23-q3-i', 'a23-q3-ii'],
  recall: [
    { front: t`State the equation of the circle with centre ${math`(a, b)`} and radius ${math`r`}.`, back: t`${math`(x - a)^{${2}} + (y - b)^{${2}} = r^{${2}}`}.` },
    { front: t`When does the line ${math`y = mx + c`} touch a circle?`, back: t`When substituting it into the circle gives a quadratic in ${math`x`} with discriminant ${0}: one repeated root, one meeting point.` },
    { front: t`${math`\tan ${2}\alpha`} in terms of ${math`\tan\alpha`}.`, back: t`${math`\frac{${2}\tan\alpha}{${1} - \tan^{${2}}\alpha}`}, proved by reflecting ${math`(${1}, ${0})`} in the line ${math`y = x\tan\alpha`}.` },
    { front: t`How do you find the centre and radius of ${math`x^{${2}} + y^{${2}} + Dx + Ey + F = ${0}`}?`, back: t`Complete the square: centre ${math`\left(-\frac{D}{${2}}, -\frac{E}{${2}}\right)`}, radius squared ${math`\frac{D^{${2}}}{${4}} + \frac{E^{${2}}}{${4}} - F`}, which must be positive.` },
  ],
  proofOrder: [
    {
      title: t`Centre and radius from the expanded equation`,
      steps: [
        t`Complete the square on the ${math`x`} terms.`,
        t`Complete the square on the ${math`y`} terms.`,
        t`Move the constants to the right side.`,
        t`If the right side is positive, read off the centre and the radius.`,
      ],
    },
  ],
};
