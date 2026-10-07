/**
 * trig.sine-cosine-rules: the cosine rule (proved from coordinates, as STEP Support
 * Foundation Assignment 5 Q1(ii) does), the area formula (1/2)ab sin C and the sine rule
 * (proved from the height, as Assignment 9 Q1(ii) does), and solving triangles. Problems:
 * Assignment 5 Q2(i) (the triangle 10, 9, 17: cos C, sin C, area 36, the altitudes, with
 * the official answers from the hints), Assignment 9 Q1(ii) and (iii), Assignment 20 Q5,
 * and NST Maths Workbook G1(ii).
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { cosDeg, listText, sinDeg, surd, valuesKey } from '../geometry';
import { int, pick, q, str } from '../math';
import { generator, type Misconception } from '../problem';
import { computedTex, dmath, math, t } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';
import { far } from '../partv-a';

const [ma, mb, mc, mC] = [math`a`, math`b`, math`c`, math`C`];
const deg = (x: number) => math`${x}^\circ`;
/** k with sin(d) = sqrt(k)/2, for the special angles. */
const sinK = (d: number): number => Math.round(4 * Math.sin((d * Math.PI) / 180) ** 2);

// ---------------------------------------------------------------- the cosine rule for a side

interface SideP { a: number; b: number; cn: number; cd: number }

const cSquared = ({ a, b, cn, cd }: SideP): number => a * a + b * b - (2 * a * b * cn) / cd;

const cosineSide = generator<SideP>({
  id: 'cosine-rule-side',
  skill: 'Use the cosine rule c^2 = a^2 + b^2 - 2ab cos C to find the third side from two sides and the angle between them.',
  params: (rng) => {
    for (;;) {
      const [cn, cd] = pick(rng, [[1, 2], [-1, 2], [0, 1], [1, 3], [1, 4], [-1, 4], [2, 3], [1, 5], [3, 5]] as const);
      const a = int(rng, 2, 9);
      const b = int(rng, 2, 9);
      const p = { a, b, cn, cd };
      if ((2 * a * b * cn) % cd === 0 && cSquared(p) > 0) return p;
    }
  },
  sane: (p) => (Number.isInteger(cSquared(p)) && cSquared(p) > 0 ? null : 'not an integer square'),
  problem: (p) => {
    const { a, b, cn, cd } = p;
    const c2 = cSquared(p);
    const cos = q(cn, cd);
    return {
      prompt: t`In triangle ${math`ABC`}, ${math`a = BC = ${a}`}, ${math`b = CA = ${b}`}, and ${math`\cos C = ${cos}`}. Find the exact length ${math`c = AB`}. Write a square root as sqrt.`,
      answer: { kind: 'expression', expected: surd(1, c2).expr, variables: [] },
      solution: [
        t`The angle ${mC} lies between the two known sides, so use the cosine rule: ${math`c^{${2}} = a^{${2}} + b^{${2}} - ${2}ab\cos C`}.`,
        t`${math`c^{${2}} = ${a * a} + ${b * b} - ${2} \times ${a} \times ${b} \times ${cos} = ${c2}`}.`,
        t`So ${math`c = \sqrt{${c2}} = ${computedTex(surd(1, c2).tex)}`}.`,
      ],
    };
  },
  solve: ({ a, b, cn, cd }) => {
    // Coordinates: C at the origin, B = (a, 0), A = (b cos C, b sin C); measure AB, then square it back to an integer.
    const cos = cn / cd;
    const ax = b * cos;
    const ay = b * Math.sqrt(1 - cos * cos);
    const d2 = Math.round((ax - a) ** 2 + ay ** 2);
    return surd(1, d2).expr;
  },
  misconceptions: (p): Misconception[] => {
    const { a, b, cn, cd } = p;
    const plus = a * a + b * b + (2 * a * b * cn) / cd;
    const out: Misconception[] = [
      { response: String(cSquared(p)), why: t`That is ${math`c^{${2}}`}. Take the square root for the length.` },
      { response: String(a + b), why: t`Two sides of a triangle add to more than the third, so the third side is less than ${a + b}. Use the cosine rule.` },
      { response: surd(1, a * a + b * b).expr, why: t`That is Pythagoras, which needs a right angle. The cosine rule subtracts ${math`${2}ab\cos C`}.` },
    ];
    if (plus > 0 && Number.isInteger(plus)) out.push({ response: surd(1, plus).expr, why: t`The sign is wrong: the cosine rule subtracts ${math`${2}ab\cos C`}.` });
    return out;
  },
});

// ---------------------------------------------------------------- the cosine rule for an angle

interface AngP { a: number; b: number; c: number }

const cosineAngle = generator<AngP>({
  id: 'cosine-rule-angle',
  skill: 'Rearrange the cosine rule to find the cosine of an angle from the three sides.',
  quick: true,
  params: (rng) => {
    for (;;) {
      const a = int(rng, 3, 12);
      const b = int(rng, 3, 12);
      const c = int(rng, 2, 15);
      if (a + b > c && b + c > a && a + c > b && a * a + b * b !== c * c) return { a, b, c };
    }
  },
  sane: ({ a, b, c }) => (a + b > c && b + c > a && a + c > b ? null : 'not a triangle'),
  problem: ({ a, b, c }) => {
    const ans = q(a * a + b * b - c * c, 2 * a * b);
    return {
      prompt: t`A triangle has sides ${math`BC = ${a}`}, ${math`CA = ${b}`}, and ${math`AB = ${c}`}. Find ${math`\cos C`} as a fraction in lowest terms.`,
      answer: { kind: 'exact', expected: str(ans), requireLowestTerms: true },
      solution: [
        t`The angle ${mC} is opposite the side ${math`AB = ${c}`}. Rearrange ${math`c^{${2}} = a^{${2}} + b^{${2}} - ${2}ab\cos C`}: ${math`\cos C = \frac{a^{${2}} + b^{${2}} - c^{${2}}}{${2}ab}`}.`,
        t`${math`\cos C = \frac{${a * a} + ${b * b} - ${c * c}}{${2 * a * b}} = ${ans}`}.`,
        ans.num < 0n ? t`The cosine is negative, so ${mC} is obtuse.` : t`The cosine is positive, so ${mC} is acute.`,
      ],
    };
  },
  solve: ({ a, b, c }) => {
    // Place C at the origin and B at (a, 0); find A from its distances b and c, and read off cos C = x / b.
    const x = (a * a + b * b - c * c) / (2 * a);
    return str(q(Math.round(x * 2 * a), 2 * a * b));
  },
  misconceptions: ({ a, b, c }): Misconception[] => [
    { response: str(q(c * c - a * a - b * b, 2 * a * b)), why: t`The signs are reversed: ${math`\cos C = \frac{a^{${2}} + b^{${2}} - c^{${2}}}{${2}ab}`}, with the side opposite ${mC} subtracted.` },
    { response: str(q(a * a + b * b - c * c, a * b)), why: t`The denominator is ${math`${2}ab`}, not ${math`ab`}.` },
    { response: str(q(b * b + c * c - a * a, 2 * b * c)), why: t`That is ${math`\cos A`}. For ${mC}, subtract the square of the side opposite ${mC}, which is ${math`AB`}.` },
  ],
});

// ---------------------------------------------------------------- the area

interface AreaP { a: number; b: number; d: number }

const areaOf = ({ a, b, d }: AreaP) => surd(a * b, sinK(d), 4);

const areaGen = generator<AreaP>({
  id: 'area-half-ab-sin-c',
  skill: 'Find the area of a triangle as (1/2)ab sin C from two sides and the angle between them.',
  params: (rng) => ({ a: int(rng, 2, 12), b: int(rng, 2, 12), d: pick(rng, [30, 45, 60, 120, 135, 150]) }),
  sane: () => null,
  problem: (p) => {
    const s = sinDeg(p.d);
    const A = areaOf(p);
    return {
      prompt: t`Triangle ${math`ABC`} has ${math`CA = ${p.a}`}, ${math`CB = ${p.b}`}, and ${math`\angle ACB = ${p.d}^\circ`}. Find its exact area. Write a square root as sqrt.`,
      answer: { kind: 'expression', expected: A.expr, variables: [] },
      solution: [
        t`The angle ${deg(p.d)} lies between the two given sides, so the area is ${math`\frac{${1}}{${2}}ab\sin C`}.`,
        t`${math`\sin ${p.d}^\circ = ${computedTex(s.tex)}`}${p.d > 90 ? t`, since ${math`\sin ${p.d}^\circ = \sin ${180 - p.d}^\circ`}` : t``}.`,
        t`Area ${math`= \frac{${1}}{${2}} \times ${p.a} \times ${p.b} \times ${computedTex(s.tex)} = ${computedTex(A.tex)}`}.`,
      ],
    };
  },
  solve: ({ a, b, d }) => {
    // Coordinates: area from the cross product of the two sides as vectors, matched against the surd.
    const r = (d * Math.PI) / 180;
    const area = Math.abs(a * b * Math.sin(r)) / 2;
    const k = Math.round((4 * area * area * 4) / (a * a * b * b));
    return surd(a * b, k, 4).expr;
  },
  misconceptions: (p): Misconception[] => {
    const out: Misconception[] = [
      { response: surd(p.a * p.b, sinK(p.d), 2).expr, why: t`That is ${math`ab\sin C`}. The area is half of it: half the base times the height.` },
      { response: String((p.a * p.b) / 2), why: t`${math`\frac{${1}}{${2}}ab`} is the area only when the angle is a right angle. Multiply by ${math`\sin C`}.` },
    ];
    const c = cosDeg(p.d);
    if (c.value !== 0) {
      const k = Math.round(4 * c.value * c.value);
      out.push({ response: surd(p.a * p.b * Math.sign(c.value), k, 4).expr, why: t`That uses the cosine. The height above the side ${math`CB`} is ${math`CA \sin C`}, so the area uses the sine.` });
    }
    return out;
  },
});

// ---------------------------------------------------------------- the sine rule

interface SineP { A: number; B: number; a: number }

const sineSide = generator<SineP>({
  id: 'sine-rule-side',
  skill: 'Use the sine rule a / sin A = b / sin B to find a side from two angles and the side opposite one of them.',
  params: (rng) => {
    for (;;) {
      const A = pick(rng, [30, 45, 60, 90, 120, 135]);
      const B = pick(rng, [30, 45, 60, 90, 120, 135]);
      if (A !== B && A + B < 180) return { A, B, a: int(rng, 2, 12) };
    }
  },
  sane: ({ A, B }) => (A + B < 180 ? null : 'angles too big'),
  problem: ({ A, B, a }) => {
    const ans = surd(a, sinK(A) * sinK(B), sinK(A));
    return {
      prompt: t`In triangle ${math`ABC`}, ${math`\angle A = ${A}^\circ`}, ${math`\angle B = ${B}^\circ`}, and ${math`a = BC = ${a}`}. Find the exact length ${math`b = CA`}. Write a square root as sqrt.`,
      answer: { kind: 'expression', expected: ans.expr, variables: [] },
      solution: [
        t`The sine rule: ${math`\frac{a}{\sin A} = \frac{b}{\sin B}`}, so ${math`b = \frac{a\sin B}{\sin A}`}.`,
        t`${math`\sin ${A}^\circ = ${computedTex(sinDeg(A).tex)}`} and ${math`\sin ${B}^\circ = ${computedTex(sinDeg(B).tex)}`}.`,
        t`${math`b = \frac{${a} \times ${computedTex(sinDeg(B).tex)}}{${computedTex(sinDeg(A).tex)}} = ${computedTex(ans.tex)}`}.`,
      ],
    };
  },
  solve: ({ A, B, a }) => {
    // Build the triangle in coordinates from side a and its two end angles, then measure CA.
    const C = 180 - A - B;
    const r = (x: number): number => (x * Math.PI) / 180;
    // B at the origin, C at (a, 0); A where the rays from B (angle B) and from C (angle C) meet.
    const tB = Math.tan(r(B));
    const tC = Math.tan(r(C));
    const x = B === 90 ? 0 : C === 90 ? a : (a * tC) / (tB + tC);
    const y = B === 90 ? a * tC : x * tB;
    const b2 = (x - a) ** 2 + y ** 2;
    // b = (a / kA) sqrt(kA kB), so b^2 kA^2 / a^2 = kA kB.
    const k = Math.round((b2 * sinK(A) * sinK(A)) / (a * a));
    return surd(a, k, sinK(A)).expr;
  },
  misconceptions: ({ A, B, a }): Misconception[] => [
    { response: surd(a, sinK(A) * sinK(B), sinK(B)).expr, why: t`The ratio is upside down: ${math`b = \frac{a\sin B}{\sin A}`}, with the sine of ${math`b`}'s own angle on top.` },
    { response: String(a), why: t`Different angles face different sides, so ${math`b \neq a`} here: use the sine rule.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const T = { a: 9, b: 17, c: 10 };
const COS_C = q(T.a * T.a + T.b * T.b - T.c * T.c, 2 * T.a * T.b);

const a5cos = auto({
  id: 'a5-q2-i-cos',
  source: cite('step-f05', 'Q2(i)'),
  title: t`The triangle ${10}, ${9}, ${17}: the cosine of ${math`C`}`,
  prompt: t`The triangle ${math`ABC`} has ${math`AB = ${T.c}`}, ${math`BC = ${T.a}`}, and ${math`CA = ${T.b}`}. Find the value of ${math`\cos C`}, as a fraction in lowest terms.`,
  answer: { kind: 'exact', expected: str(COS_C), requireLowestTerms: true },
  solution: [
    t`The angle ${mC} is between ${math`BC = ${T.a}`} and ${math`CA = ${T.b}`}, opposite ${math`AB = ${T.c}`}. The cosine rule: ${math`${T.c}^{${2}} = ${T.a}^{${2}} + ${T.b}^{${2}} - ${2} \times ${T.a} \times ${T.b}\cos C`}.`,
    t`So ${math`${T.c * T.c} = ${T.a * T.a + T.b * T.b} - ${2 * T.a * T.b}\cos C`}, giving ${math`\cos C = \frac{${T.a * T.a + T.b * T.b - T.c * T.c}}{${2 * T.a * T.b}} = ${COS_C}`}.`,
  ],
  reference: '15/17',
  verify: () => same('cos C by coordinates', (Math.cos(Math.acos((9 * 9 + 17 * 17 - 100) / (2 * 9 * 17)))).toFixed(12), (15 / 17).toFixed(12)),
  misconceptions: [{ response: '-15/17', why: t`The sign is reversed: subtract the square of the opposite side, ${math`${T.c}^{${2}}`}, in the numerator.` }],
  official: { source: cite('step-f05-hints', 'Q2(i)'), answer: '15/17', agrees: true },
});

const ALTS = [q(36, 5), q(8), q(72, 17)];

const a5alt = auto({
  id: 'a5-q2-i-altitudes',
  source: cite('step-f05', 'Q2(i)'),
  title: t`The triangle ${10}, ${9}, ${17}: area and altitudes`,
  prompt: t`The triangle ${math`ABC`} has ${math`AB = ${T.c}`}, ${math`BC = ${T.a}`}, and ${math`CA = ${T.b}`}, and ${math`\cos C = ${COS_C}`}. Find ${math`\sin C`} and show the area is ${36}. Then find the three altitudes (the perpendicular heights onto ${math`AB`}, ${math`BC`}, and ${math`CA`}), in that order, as fractions in lowest terms.`,
  answer: {
    kind: 'witness', count: 3, example: listText(ALTS),
    check: (v) => (v.map(str).join(',') === ALTS.map(str).join(',') ? null : valuesKey(v) === valuesKey(ALTS) ? 'Those are the right heights, but give them in the order AB, BC, CA.' : 'Each altitude is twice the area divided by its base.'),
  },
  solution: [
    t`${math`\sin^{${2}} C = ${1} - \left(\frac{${15}}{${17}}\right)^{${2}} = \frac{${64}}{${289}}`}, and ${math`\sin C > ${0}`} in a triangle, so ${math`\sin C = \frac{${8}}{${17}}`}.`,
    t`Area ${math`= \frac{${1}}{${2}}ab\sin C = \frac{${1}}{${2}} \times ${9} \times ${17} \times \frac{${8}}{${17}} = ${36}`}.`,
    t`Area ${math`= \frac{${1}}{${2}} \times \text{base} \times \text{height}`}, so each height is ${math`\frac{${2} \times ${36}}{\text{base}} = \frac{${72}}{\text{base}}`}: ${math`\frac{${72}}{${10}} = ${q(36, 5)}`} onto ${math`AB`}, ${math`\frac{${72}}{${9}} = ${8}`} onto ${math`BC`}, and ${math`\frac{${72}}{${17}}`} onto ${math`CA`}.`,
  ],
  reference: listText(ALTS),
  verify: () => {
    // Heron's formula for the area, independently.
    const s = (9 + 17 + 10) / 2;
    const area = Math.sqrt(s * (s - 9) * (s - 17) * (s - 10));
    if (far(area, 36)) return `Heron gives area ${area}`;
    const h = [10, 9, 17].map((base) => (2 * area) / base);
    return h.every((x, i) => !far(x, Number((ALTS[i] as ReturnType<typeof q>).num) / Number((ALTS[i] as ReturnType<typeof q>).den))) ? null : `altitudes ${h.join(', ')}`;
  },
  misconceptions: [{ response: '18/5, 4, 36/17', why: t`Those are the area divided by each base. The area is half base times height, so the height is twice the area over the base.` }],
  official: { source: cite('step-f05-hints', 'Q2(i)'), answer: '36/5, 8, 72/17', agrees: true },
});

const a5q1ii = supervision({
  id: 'a5-q1-ii',
  source: cite('step-f05', 'Q1(ii)'),
  title: t`The cosine rule from coordinates`,
  prompt: t`The points ${math`A`}, ${math`B`}, ${math`C`} have coordinates ${math`(x, y)`}, ${math`(a, ${0})`}, ${math`(${0}, ${0})`}, where ${math`a`}, ${math`x`}, ${math`y`} are positive. The lengths ${math`AB`} and ${math`AC`} are ${mc} and ${mb}. Write down ${math`b^{${2}}`} and ${math`c^{${2}}`} in terms of ${math`x`}, ${math`y`}, ${math`a`}, and show that ${math`b^{${2}} - x^{${2}} = c^{${2}} - (x - a)^{${2}}`}. With ${math`\angle ACB = C`}, express ${math`x`} in terms of ${mb} and ${mC}, and deduce ${math`c^{${2}} = a^{${2}} + b^{${2}} - ${2}ab\cos C`}. Is there a difference between the cases ${math`a > x`} and ${math`a < x`}?`,
  writeUp: 'proof',
  official: cite('step-f05-hints', 'Q1(ii)'),
});

const a9q1 = supervision({
  id: 'a9-q1-ii-iii',
  source: cite('step-f09', 'Q1(ii), (iii)'),
  title: t`The area formula, the sine rule, and ${math`\sin ${2}\alpha`}`,
  prompt: t`(ii) Triangle ${math`ABC`} has ${math`BC = a`}, ${math`CA = b`}, ${math`AB = c`}. Using area ${math`= \frac{${1}}{${2}}`} base ${math`\times`} height with base ${math`AC`}, show that the area is ${math`\frac{${1}}{${2}}ab\sin C`}. Show also that it is ${math`\frac{${1}}{${2}}bc\sin A`}, and deduce the sine rule ${math`\frac{\sin A}{a} = \frac{\sin B}{b} = \frac{\sin C}{c}`}. (iii) In triangle ${math`ABC`}, ${math`AB = BC = ${1}`}, ${math`M`} is the midpoint of ${math`AC`}, and ${math`\angle ABM = \angle CBM = \alpha`}. Show that ${math`AC = ${2}\sin\alpha`} and, by the sine rule, that ${math`\sin ${2}\alpha = ${2}\sin\alpha\cos\alpha`}.`,
  writeUp: 'proof',
  official: cite('step-f09-hints', 'Q1(ii), (iii)'),
});

const a20q5 = supervision({
  id: 'a20-q5',
  source: cite('step-f20', 'Q5'),
  title: t`A ${math`${30}^\circ`} triangle whose height equals a median`,
  prompt: t`Triangle ${math`ABC`} has ${math`\angle CAB = ${30}^\circ`}. The point ${math`M`} is the midpoint of ${math`AC`}, and the height ${math`h`} of the triangle (from ${math`B`} to ${math`AC`}) equals ${math`MB`}. Show that ${math`\angle ABC = ${45}^\circ`}. (i) Find the height of triangle ${math`MBC`} in terms of ${math`h`}, and show ${math`\angle MBC = ${30}^\circ`}. (ii) Show ${math`\angle BMC = \angle ABC`}. (iii) Find ${math`AB`} in terms of ${math`h`} and ${math`\angle ABC`}, and show ${math`\sin^{${2}} \angle ABC = \frac{${1}}{${2}}`} by the sine rule in triangle ${math`ABM`}.`,
  writeUp: 'proof',
  official: cite('step-f20-hints', 'Q5'),
});

const g1ii = auto({
  id: 'nst-g1-ii',
  source: cite('nst-workbook', 'G1(ii)', true),
  title: t`The angles of the triangle ${2}, ${2}, ${3}`,
  prompt: t`In triangle ${math`ABC`}, ${math`AB = ${2}`}, ${math`BC = ${2}`}, and ${math`AC = ${3}`}. Find ${math`\cos B`} and ${math`\cos A`}, in that order, as fractions.`,
  answer: {
    kind: 'witness', count: 2, example: '-1/8, 3/4',
    check: (v) => (v.map(str).join(',') === '-1/8,3/4' ? null : 'Use the cosine rule at each vertex: subtract the square of the opposite side.'),
  },
  solution: [
    t`${math`B`} is opposite ${math`AC = ${3}`}: ${math`\cos B = \frac{${2}^{${2}} + ${2}^{${2}} - ${3}^{${2}}}{${2} \times ${2} \times ${2}} = -\frac{${1}}{${8}}`}, so ${math`B`} is obtuse.`,
    t`${math`A`} is opposite ${math`BC = ${2}`}: ${math`\cos A = \frac{${2}^{${2}} + ${3}^{${2}} - ${2}^{${2}}}{${2} \times ${2} \times ${3}} = \frac{${3}}{${4}}`}. The triangle is isosceles with ${math`AB = BC`}, so ${math`C = A`}, and the angles are ${math`\arccos\left(-\frac{${1}}{${8}}\right)`} and twice ${math`\arccos \frac{${3}}{${4}}`}.`,
  ],
  reference: '-1/8, 3/4',
  verify: () => {
    const B = Math.acos(-1 / 8);
    const A = Math.acos(3 / 4);
    return far(B + 2 * A, Math.PI) ? `angles add to ${B + 2 * A}` : null;
  },
  misconceptions: [{ response: '1/8, 3/4', why: t`For ${math`B`}, the side opposite is the longest, ${3}, so ${math`${4} + ${4} - ${9}`} is negative: ${math`B`} is obtuse.` }],
});

// ---------------------------------------------------------------- lesson

const ROUND = { a: 3, b: 5, cos: q(1, 2) };

export const sineCosineRules: TopicContent = {
  topicId: 'trig.sine-cosine-rules',
  goal: t`Derive and use the cosine rule, the sine rule, and the area ${math`\frac{${1}}{${2}}ab\sin C`} to solve any triangle.`,
  objective: t`Prove and use the cosine rule, the sine rule, and the area formula to solve any triangle.`,
  why: t`They extend right-triangle trigonometry to every triangle, and STEP uses them for lengths, areas, and angles.`,
  minutes: 30,
  lesson: [
    { kind: 'section', title: t`Triangles without a right angle` },
    { kind: 'hook', text: t`Two roads leave a village at ${deg(60)} to each other. You walk ${ROUND.a} km along one, your friend ${ROUND.b} km along the other. How far apart are you? No right angle in sight, so Pythagoras cannot answer. Yet the distance is fixed by what you know, so some formula must give it.` },
    { kind: 'narrative', text: t`Pythagoras says ${math`c^{${2}} = a^{${2}} + b^{${2}}`} when the angle between ${ma} and ${mb} is ${deg(90)}. Close the angle and the third side gets shorter; open it and the side gets longer. So the true formula should be Pythagoras plus a correction that depends on the angle and is ${0} at ${deg(90)}. The cosine is exactly such a quantity.` },
    { kind: 'p', text: t`First we need the cosine and sine of an obtuse angle, since a triangle may have one. Place the angle at the origin with one arm along the positive ${math`x`}-axis, and mark the point at distance ${1} along the other arm.` },
    { kind: 'definition', name: t`Sine and cosine of an angle up to ${deg(180)}`, formal: t`For ${math`${0}^\circ \le \theta \le ${180}^\circ`}, let ${math`P`} be the point at distance ${1} from the origin ${math`O`} with ${math`\angle xOP = \theta`}, above or on the ${math`x`}-axis. Then ${math`\cos \theta`} is the ${math`x`}-coordinate of ${math`P`} and ${math`\sin \theta`} its ${math`y`}-coordinate.`, plain: t`For an acute angle this agrees with adjacent over hypotenuse and opposite over hypotenuse, with hypotenuse ${1}. For an obtuse angle the point is left of the ${math`y`}-axis, so the cosine is negative: ${math`\cos ${120}^\circ = -\frac{${1}}{${2}}`}, while ${math`\sin ${120}^\circ = \sin ${60}^\circ = \frac{\sqrt{${3}}}{${2}}`}.` },
    { kind: 'p', text: t`Reflecting in the ${math`y`}-axis gives ${math`\sin(${180}^\circ - \theta) = \sin \theta`} and ${math`\cos(${180}^\circ - \theta) = -\cos \theta`}. A point at distance ${mb} along the arm is ${math`(b\cos\theta, b\sin\theta)`}, since scaling the unit point by ${mb} scales both coordinates.` },
    { kind: 'section', title: t`The cosine rule` },
    { kind: 'theorem', name: t`Cosine rule`, statement: t`In any triangle ${math`ABC`} with ${math`a = BC`}, ${math`b = CA`}, ${math`c = AB`}: ${math`c^{${2}} = a^{${2}} + b^{${2}} - ${2}ab\cos C`}.` },
    { kind: 'p', text: t`In plain words, the [[cosine-rule|cosine rule]] says the side opposite ${mC} is Pythagoras minus ${math`${2}ab\cos C`}. At ${deg(90)} the cosine is ${0} and it is Pythagoras; for an acute ${mC} the side is shorter, for an obtuse ${mC} longer. The convention to remember: each side is named by the small letter of the opposite vertex.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Choose coordinates`, text: t`Put ${mC} at the origin and ${math`B`} at ${math`(a, ${0})`}. Then ${math`A`} is at distance ${mb} from ${mC} along the arm at angle ${mC}:`, eq: [dmath`A = (x, y) = (b\cos C,\ b\sin C).`], plain: t`This is the definition above, scaled by ${mb}. It holds whether ${mC} is acute or obtuse.` },
        { label: t`Write the distance`, text: t`${math`c`} is the distance from ${math`A`} to ${math`B`}, so`, eq: [dmath`c^{${2}} = (x - a)^{${2}} + y^{${2}} = x^{${2}} - ${2}ax + a^{${2}} + y^{${2}}.`], why: { q: t`Why is that the distance?`, a: t`Pythagoras on the right triangle with horizontal side ${math`x - a`} and vertical side ${math`y`}. Squaring makes the sign of ${math`x - a`} irrelevant, so the cases ${math`a > x`} and ${math`a < x`} agree.` } },
        { label: t`Use the other distance`, text: t`${mb} is the distance from ${mC} to ${math`A`}, so ${math`x^{${2}} + y^{${2}} = b^{${2}}`}. Substitute:`, eq: [dmath`c^{${2}} = b^{${2}} - ${2}ax + a^{${2}}.`] },
        { label: t`Put in the angle`, text: t`Replace ${math`x`} by ${math`b\cos C`}:`, eq: [dmath`c^{${2}} = a^{${2}} + b^{${2}} - ${2}ab\cos C.`], plain: t`The correction term is ${math`${2}a`} times the horizontal coordinate of ${math`A`}.` },
      ],
    },
    { kind: 'p', text: t`Back to the roads: ${math`c^{${2}} = ${ROUND.a}^{${2}} + ${ROUND.b}^{${2}} - ${2} \times ${ROUND.a} \times ${ROUND.b} \times ${ROUND.cos} = ${ROUND.a ** 2 + ROUND.b ** 2 - ROUND.a * ROUND.b}`}, so you are ${math`\sqrt{${ROUND.a ** 2 + ROUND.b ** 2 - ROUND.a * ROUND.b}}`} km apart, about ${Number(Math.sqrt(ROUND.a ** 2 + ROUND.b ** 2 - ROUND.a * ROUND.b).toFixed(2))} km.` },
    checkFrom(cosineAngle, { a: 5, b: 7, c: 8 }, t`Subtract the square of the side opposite ${mC}, then divide by ${math`${2}ab`}.`),
    { kind: 'section', title: t`Area and the sine rule` },
    { kind: 'theorem', name: t`Area of a triangle`, statement: t`The area of triangle ${math`ABC`} is ${math`\frac{${1}}{${2}}ab\sin C = \frac{${1}}{${2}}bc\sin A = \frac{${1}}{${2}}ca\sin B`}.` },
    { kind: 'p', text: t`Why: take ${math`CB = a`} as the base. In the coordinates above, with ${mC} at the origin and ${math`CB`} along the axis, the height of ${math`A`} above it is ${math`y = b\sin C`}, so the area is ${math`\frac{${1}}{${2}} \times a \times b\sin C`}. The other two forms come from relabelling the vertices.` },
    { kind: 'theorem', name: t`Sine rule`, statement: t`In any triangle ${math`ABC`}, ${math`\frac{a}{\sin A} = \frac{b}{\sin B} = \frac{c}{\sin C}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Two forms of one area`, text: t`The area is both ${math`\frac{${1}}{${2}}ab\sin C`} and ${math`\frac{${1}}{${2}}bc\sin A`}, so`, eq: [dmath`\tfrac{${1}}{${2}}ab\sin C = \tfrac{${1}}{${2}}bc\sin A.`] },
        { label: t`Cancel`, text: t`Multiply by ${2} and divide by ${mb}, which is positive: ${math`a\sin C = c\sin A`}.` },
        { label: t`Divide`, text: t`The sines of angles strictly between ${deg(0)} and ${deg(180)} are positive, so divide by ${math`\sin A \sin C`}: ${math`\frac{a}{\sin A} = \frac{c}{\sin C}`}. The third ratio follows the same way from ${math`\frac{${1}}{${2}}ca\sin B`}.` },
      ],
    },
    checkFrom(areaGen, { a: 6, b: 10, d: 150 }, t`${math`\sin ${150}^\circ = \sin ${30}^\circ = \frac{${1}}{${2}}`}, and the area is half of ${math`ab\sin C`}.`),
    { kind: 'section', title: t`Which rule, and where it breaks` },
    { kind: 'narrative', text: t`Use the cosine rule when you know the angle between two known sides, or all three sides. Use the [[sine-rule|sine rule]] when you know a side and the angle opposite it. Each formula has one case that catches people out.` },
    { kind: 'pitfall', claim: t`If ${math`\sin B`} is known, then the angle ${math`B`} is known.`, counterexample: t`${math`\sin ${30}^\circ = \sin ${150}^\circ = \frac{${1}}{${2}}`}. With ${math`a = ${4}`}, ${math`b = ${6}`}, and ${math`A = ${30}^\circ`}, the sine rule gives ${math`\sin B = \frac{${3}}{${4}}`}, and both an acute and an obtuse ${math`B`} fit: two different triangles. The cosine, unlike the sine, tells acute from obtuse.` },
    { kind: 'pitfall', claim: t`In the cosine rule, ${mC} can be any angle of the triangle.`, counterexample: t`${mC} must be the angle between ${ma} and ${mb}, opposite ${mc}. For the triangle with ${math`BC = ${4}`}, ${math`CA = ${7}`}, ${math`AB = ${6}`}, putting the angle opposite ${7} into the formula for ${math`AB = ${6}`} gives a cosine of ${math`\frac{${4}^{${2}} + ${6}^{${2}} - ${7}^{${2}}}{${2} \times ${4} \times ${6}} = ${q(1, 16)}`}, the cosine of the wrong angle. The angle at ${mC}, between the sides ${4} and ${7}, has ${math`\cos C = \frac{${4}^{${2}} + ${7}^{${2}} - ${6}^{${2}}}{${2} \times ${4} \times ${7}} = ${q(29, 56)}`}.` },
    { kind: 'takeaway', text: t`The cosine rule is Pythagoras corrected by ${math`${2}ab\cos C`}; the area is ${math`\frac{${1}}{${2}}ab\sin C`}, and comparing two forms of the area gives the sine rule.` },
  ],
  examples: [
    workedCambridge(a5cos),
    worked(cosineSide, { a: 3, b: 8, cn: 1, cd: 2 }, t`A side from two sides and the angle between them`),
    worked(sineSide, { A: 45, B: 60, a: 4 }, t`A side by the sine rule`),
  ],
  generators: [cosineSide, cosineAngle, areaGen, sineSide],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['cosine-rule', 'sine-rule'],
  cambridge: withUses([a5alt, a5q1ii, a9q1, a20q5, g1ii], {
    'a20-q5': { sections: ['Area and the sine rule', 'Which rule, and where it breaks'], note: t`Angles in a triangle from the sine rule and a height` },
    'a5-q2-i-altitudes': { sections: ['The cosine rule', 'Area and the sine rule'], note: t`The area from two sides and the sine, then each altitude` },
  }),
  gate: ['a20-q5', 'a5-q2-i-altitudes'],
  recall: [
    { front: t`State the cosine rule.`, back: t`${math`c^{${2}} = a^{${2}} + b^{${2}} - ${2}ab\cos C`}, with ${mC} the angle between ${ma} and ${mb}.` },
    { front: t`State the sine rule and the area formula.`, back: t`${math`\frac{a}{\sin A} = \frac{b}{\sin B} = \frac{c}{\sin C}`}; area ${math`\frac{${1}}{${2}}ab\sin C`}.` },
    { front: t`How are ${math`\sin`} and ${math`\cos`} of ${math`${180}^\circ - \theta`} related to those of ${math`\theta`}?`, back: t`${math`\sin(${180}^\circ - \theta) = \sin \theta`} and ${math`\cos(${180}^\circ - \theta) = -\cos \theta`}.` },
  ],
  proofOrder: [
    {
      title: t`The cosine rule from coordinates`,
      steps: [
        t`Put ${mC} at the origin and ${math`B`} at ${math`(a, ${0})`}, so ${math`A = (b\cos C, b\sin C)`}.`,
        t`Write ${math`c^{${2}}`} as the squared distance from ${math`A`} to ${math`B`}.`,
        t`Replace ${math`x^{${2}} + y^{${2}}`} by ${math`b^{${2}}`}.`,
        t`Replace ${math`x`} by ${math`b\cos C`} to get ${math`a^{${2}} + b^{${2}} - ${2}ab\cos C`}.`,
      ],
    },
  ],
};
