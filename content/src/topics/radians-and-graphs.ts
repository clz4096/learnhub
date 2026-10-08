/**
 * trig.radians-and-graphs: radian measure (arc length over radius), arc length and sector
 * area, sine and cosine for every angle from the unit circle, the graphs of sin, cos, and
 * tan with their symmetries and periods, and every angle with a given sine or cosine.
 * Problems: STEP Support Foundation Assignment 3 Q1(i) (the sum of sin(n pi/6), with the
 * official answer from the hints), Assignment 22 Q3(iv) (the zeros and symmetry of sin(x^2)),
 * and NST Maths Workbook G2 (a sector) and FC4 (sketches).
 */
import { auto, cite, supervision, withUses } from '../cambridge';
import { cosDeg, sinDeg, tanDeg, valuesKey, type Exact } from '../geometry';
import { gcd, int, pick, q, str } from '../math';
import { generator, type Misconception } from '../problem';
import { computedTex, dmath, math, t } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';
import { far } from '../partv-a';
import { close } from '../prep-c';
import type { Rational } from '@learnhub/mastery';

const mth = math`\theta`;
const fnTex = (f: string) => computedTex(`\\${f}`);
/** k pi / m as LaTeX: \pi, \frac{3\pi}{4}, -\frac{\pi}{6}. */
function piTex(k: number, m: number): string {
  if (k === 0) return '0';
  const g = gcd(k, m);
  const [a, b] = [k / g, m / g];
  const sign = a < 0 ? '-' : '';
  const top = Math.abs(a) === 1 ? '\\pi' : `${Math.abs(a)}\\pi`;
  return b === 1 ? `${sign}${top}` : `${sign}\\frac{${top}}{${b}}`;
}
/** k pi / m in the graders' expression language. */
function piExpr(k: number, m: number): string {
  const g = gcd(k, m);
  const [a, b] = [k / g, m / g];
  return b === 1 ? `${a}*pi` : `${a}*pi/${b}`;
}
const PI = (k: number, m: number) => computedTex(piTex(k, m));

// ---------------------------------------------------------------- degrees and radians

interface ConvP { deg: number; toRad: boolean }

const convert = generator<ConvP>({
  id: 'degrees-radians',
  skill: 'Convert between degrees and radians using 180 degrees = pi radians.',
  quick: true,
  params: (rng) => ({ deg: pick(rng, [15, 20, 30, 36, 40, 45, 60, 72, 90, 120, 135, 150, 210, 225, 240, 270, 300, 315, 330, 540]), toRad: rng() < 0.6 }),
  sane: () => null,
  problem: ({ deg, toRad }) => toRad
    ? {
      prompt: t`Write ${math`${deg}^\circ`} in radians, as a multiple of ${math`\pi`}. Write ${math`\pi`} as pi.`,
      answer: { kind: 'expression', expected: piExpr(deg, 180), variables: [] },
      solution: [t`${math`${180}^\circ = \pi`} radians, so ${math`${1}^\circ = \frac{\pi}{${180}}`} radians.`, t`${math`${deg}^\circ = ${deg} \times \frac{\pi}{${180}} = ${PI(deg, 180)}`}.`],
    }
    : {
      prompt: t`Write ${math`${PI(deg, 180)}`} radians in degrees.`,
      answer: { kind: 'exact', expected: String(deg) },
      solution: [t`${math`\pi`} radians is ${math`${180}^\circ`}, so replace ${math`\pi`} by ${180}.`, t`${math`${PI(deg, 180)} = ${deg}^\circ`}.`],
    },
  solve: ({ deg, toRad }) => (toRad ? `${deg / 180}*pi` : String(Math.round((((deg * Math.PI) / 180) * 180) / Math.PI))),
  misconceptions: ({ deg, toRad }): Misconception[] => toRad
    ? [
      { response: `${(deg * 180) / Math.PI}`, why: t`That multiplies by ${math`\frac{${180}}{\pi}`}, the conversion the other way. Degrees to radians multiplies by ${math`\frac{\pi}{${180}}`}.` },
      { response: piExpr(deg, 360), why: t`A half turn, ${math`${180}^\circ`}, is ${math`\pi`}; a full turn is ${math`${2}\pi`}. Divide by ${180}, not ${360}.` },
      { response: String(deg / 180), why: t`Keep the ${math`\pi`}: ${math`${deg}^\circ`} is ${math`\frac{${deg}}{${180}}`} of ${math`\pi`} radians.` },
    ]
    : [
      { response: String(Number(((deg / 180) * Math.PI).toFixed(6))), why: t`That is the angle as a decimal number of radians. In degrees, ${math`\pi`} becomes ${180}.` },
      { response: String(deg * 2), why: t`${math`\pi`} radians is ${math`${180}^\circ`}, half a turn, not a full turn.` },
    ],
});

// ---------------------------------------------------------------- exact values at any angle

interface AnyP { fn: 'sin' | 'cos' | 'tan'; deg: number }

const valueAt = (fn: string, d: number): Exact => (fn === 'sin' ? sinDeg(d) : fn === 'cos' ? cosDeg(d) : (tanDeg(d) as Exact));

const anyAngle = generator<AnyP>({
  id: 'exact-any-angle',
  skill: 'Find sin, cos, or tan of any multiple of pi/6 or pi/4 from the reference angle and the quadrant signs.',
  params: (rng) => {
    for (;;) {
      const deg = pick(rng, [30, 45, 60]) + 90 * int(rng, 1, 3) * (rng() < 0.85 ? 1 : 0) + (rng() < 0.15 ? -360 : 0);
      const fn = pick(rng, ['sin', 'cos', 'tan'] as const);
      const d = ((deg % 360) + 360) % 360;
      if (d % 90 !== 0 && (fn !== 'tan' || tanDeg(deg) !== null)) return { fn, deg };
    }
  },
  sane: ({ deg }) => (deg % 90 !== 0 ? null : 'on an axis'),
  problem: ({ fn, deg }) => {
    const d = ((deg % 360) + 360) % 360;
    const ref = d < 90 ? d : d < 180 ? 180 - d : d < 270 ? d - 180 : 360 - d;
    const quad = Math.floor(d / 90) + 1;
    const v = valueAt(fn, deg);
    const pos = valueAt(fn, ref);
    return {
      prompt: t`Find the exact value of ${math`${fnTex(fn)}\left(${PI(deg, 180)}\right)`}. Write square roots as sqrt.`,
      answer: { kind: 'expression', expected: v.expr, variables: [] },
      solution: [
        t`${math`${PI(deg, 180)}`} is ${math`${deg}^\circ`}${deg !== d ? t`, the same direction as ${math`${d}^\circ`}` : t``}. It lies in quadrant ${quad}, with reference angle ${math`${PI(ref, 180)}`}: the acute angle it makes with the ${math`x`}-axis.`,
        t`At the reference angle, ${math`${fnTex(fn)}\left(${PI(ref, 180)}\right) = ${computedTex(pos.tex)}`}. In quadrant ${quad}, ${fn === 'sin' ? (quad <= 2 ? t`the sine is positive (the point is above the axis)` : t`the sine is negative (the point is below the axis)`) : fn === 'cos' ? (quad === 1 || quad === 4 ? t`the cosine is positive (the point is right of the axis)` : t`the cosine is negative (the point is left of the axis)`) : quad === 1 || quad === 3 ? t`the tangent is positive (sine and cosine have the same sign)` : t`the tangent is negative (sine and cosine have opposite signs)`}.`,
        t`So the value is ${computedTex(v.tex)}.`,
      ],
    };
  },
  solve: ({ fn, deg }) => {
    // Numerically, matched against the table of candidate exact values.
    const x = (deg * Math.PI) / 180;
    const target = fn === 'sin' ? Math.sin(x) : fn === 'cos' ? Math.cos(x) : Math.tan(x);
    for (const c of ['1/2', 'sqrt(2)/2', 'sqrt(3)/2', '1', 'sqrt(3)/3', 'sqrt(3)']) {
      const val = ({ '1/2': 0.5, 'sqrt(2)/2': Math.SQRT2 / 2, 'sqrt(3)/2': Math.sqrt(3) / 2, '1': 1, 'sqrt(3)/3': Math.sqrt(3) / 3, 'sqrt(3)': Math.sqrt(3) } as Record<string, number>)[c] as number;
      if (Math.abs(val - target) < 1e-9) return c;
      if (Math.abs(-val - target) < 1e-9) return `-${c}`;
    }
    return 'none';
  },
  misconceptions: ({ fn, deg }): Misconception[] => {
    const d = ((deg % 360) + 360) % 360;
    const ref = d < 90 ? d : d < 180 ? 180 - d : d < 270 ? d - 180 : 360 - d;
    const v = valueAt(fn, deg);
    const out: Misconception[] = [];
    const flipped = v.expr.startsWith('-') ? v.expr.slice(1) : `-${v.expr}`;
    out.push({ response: flipped, why: t`The size is right, but the sign is wrong. Find the quadrant, and whether the point is above or below, left or right of the axes.` });
    const other = fn === 'sin' ? cosDeg(deg) : fn === 'cos' ? sinDeg(deg) : null;
    if (other !== null) out.push({ response: other.expr, why: fn === 'sin' ? t`That is the cosine. The sine is the ${math`y`}-coordinate of the point on the unit circle.` : t`That is the sine. The cosine is the ${math`x`}-coordinate of the point on the unit circle.` });
    if (fn === 'tan') {
      const inv = tanDeg(90 - ref) as Exact;
      out.push({ response: v.value < 0 ? `-${inv.expr}` : inv.expr, why: t`That is cosine over sine. Tangent is sine over cosine.` });
      out.push({ response: sinDeg(deg).expr, why: t`That is the sine alone. Tangent is the sine divided by the cosine.` });
    } else {
      const o = fn === 'sin' ? cosDeg(deg) : sinDeg(deg);
      out.push({ response: o.value < 0 ? o.expr.slice(1) : `-${o.expr}`, why: t`That is the ${fn === 'sin' ? t`cosine` : t`sine`} with its sign changed. Use the ${fn === 'sin' ? t`${math`y`}` : t`${math`x`}`}-coordinate of the point on the unit circle.` });
    }
    return out;
  },
});

// ---------------------------------------------------------------- every solution in an interval

interface SolP { fn: 'sin' | 'cos'; ref: 30 | 45 | 60; neg: boolean }

/** The solutions in [0, 360) degrees, by testing every multiple of 15. */
const sols = ({ fn, ref, neg }: SolP): number[] => {
  const target = (neg ? -1 : 1) * (fn === 'sin' ? sinDeg(ref).value : cosDeg(ref).value);
  const out: number[] = [];
  for (let d = 0; d < 360; d += 15) {
    const v = fn === 'sin' ? Math.sin((d * Math.PI) / 180) : Math.cos((d * Math.PI) / 180);
    if (Math.abs(v - target) < 1e-12) out.push(d);
  }
  return out;
};
const ks = (ds: readonly number[]): Rational[] => ds.map((d) => q(d, 180));

const allSolutions = generator<SolP>({
  id: 'all-solutions',
  skill: 'Find every x in [0, 2 pi) with sin x or cos x equal to a given special value, from the graph or the unit circle.',
  params: (rng) => ({ fn: pick(rng, ['sin', 'cos'] as const), ref: pick(rng, [30, 45, 60] as const), neg: rng() < 0.5 }),
  sane: (p) => (sols(p).length === 2 ? null : 'not two solutions'),
  problem: (p) => {
    const val = p.fn === 'sin' ? sinDeg(p.ref) : cosDeg(p.ref);
    const shown = p.neg ? `-${val.tex}` : val.tex;
    const [x1, x2] = sols(p) as [number, number];
    const alpha = p.fn === 'sin' ? (p.neg ? -p.ref : p.ref) : p.neg ? 180 - p.ref : p.ref;
    return {
      prompt: t`Find every ${math`x`} with ${math`${0} \le x < ${2}\pi`} and ${math`${fnTex(p.fn)} x = ${computedTex(shown)}`}. Write each solution as ${math`x = k\pi`} and give the values of ${math`k`}, as fractions.`,
      answer: {
        kind: 'witness', count: 2, unordered: true, example: ks([x1, x2]).map(str).join(', '),
        check: (v) => (valuesKey(v) === valuesKey(ks([x1, x2])) ? null : 'Find one solution, then use the symmetry of the graph for the other in the interval.'),
      },
      solution: p.fn === 'sin'
        ? [
          t`One solution is ${math`\alpha = ${PI(alpha, 180)}`}. Since ${math`\sin(\pi - x) = \sin x`}, so is ${math`\pi - \alpha = ${PI(180 - alpha, 180)}`}; the others differ from these by multiples of ${math`${2}\pi`}.`,
          t`In ${math`[${0}, ${2}\pi)`} that leaves ${math`x = ${PI(x1, 180)}`} and ${math`x = ${PI(x2, 180)}`}, so ${math`k = ${q(x1, 180)}`} and ${math`k = ${q(x2, 180)}`}.`,
        ]
        : [
          t`One solution is ${math`\alpha = ${PI(alpha, 180)}`}. Since ${math`\cos(-x) = \cos x`}, so is ${math`-\alpha`}, and adding ${math`${2}\pi`} gives ${math`${2}\pi - \alpha = ${PI(360 - alpha, 180)}`}.`,
          t`In ${math`[${0}, ${2}\pi)`}: ${math`x = ${PI(x1, 180)}`} and ${math`x = ${PI(x2, 180)}`}, so ${math`k = ${q(x1, 180)}`} and ${math`k = ${q(x2, 180)}`}.`,
        ],
    };
  },
  solve: (p) => ks(sols(p)).map(str).join(', '),
  misconceptions: (p): Misconception[] => {
    const [x1, x2] = sols(p) as [number, number];
    const out: Misconception[] = [];
    const pos = sols({ ...p, neg: !p.neg });
    out.push({ response: ks(pos).map(str).join(', '), why: t`Those solve the equation with the opposite sign. Check the sign of ${math`${fnTex(p.fn)}`} in each quadrant.` });
    const wrongPair = p.fn === 'sin' ? [x1, (x1 + 180) % 360] : [x1, 180 - x1 < 0 ? 180 - x1 + 360 : 180 - x1];
    if (valuesKey(ks(wrongPair)) !== valuesKey(ks([x1, x2]))) out.push({ response: ks(wrongPair).map(str).join(', '), why: p.fn === 'sin' ? t`Sine repeats with ${math`\sin(\pi - x) = \sin x`}, not ${math`\sin(\pi + x)`}: adding ${math`\pi`} flips its sign.` : t`Cosine repeats with ${math`\cos(${2}\pi - x) = \cos x`}; ${math`\cos(\pi - x) = -\cos x`}.` });
    return out;
  },
});

// ---------------------------------------------------------------- arc length and sector area

interface SecP { r: number; k: number; m: number; area: boolean }

const sector = generator<SecP>({
  id: 'arc-sector',
  skill: 'Use arc length r theta and sector area (1/2) r^2 theta, with theta in radians.',
  params: (rng) => {
    const [k, m] = pick(rng, [[1, 6], [1, 4], [1, 3], [1, 2], [2, 3], [3, 4], [5, 6], [1, 1], [4, 3], [3, 2]] as const);
    return { r: int(rng, 2, 12), k, m, area: rng() < 0.5 };
  },
  sane: ({ r }) => (r > 0 ? null : 'out of range'),
  problem: ({ r, k, m, area }) => {
    const ans = area ? piExpr(r * r * k, 2 * m) : piExpr(r * k, m);
    return {
      prompt: t`A sector of a circle of radius ${r} has angle ${math`${PI(k, m)}`} radians. Find its ${area ? t`area` : t`arc length`}, in terms of ${math`\pi`}.`,
      answer: { kind: 'expression', expected: ans, variables: [] },
      solution: area
        ? [t`A full turn, ${math`${2}\pi`}, gives the whole disc, area ${math`\pi r^{${2}}`}; the sector is the fraction ${math`\frac{\theta}{${2}\pi}`} of it, so its area is ${math`\frac{${1}}{${2}}r^{${2}}\theta`}.`, t`${math`\frac{${1}}{${2}} \times ${r * r} \times ${PI(k, m)} = ${PI(r * r * k, 2 * m)}`}.`]
        : [t`By the definition of the radian, the arc is ${math`r\theta`}.`, t`${math`${r} \times ${PI(k, m)} = ${PI(r * k, m)}`}.`],
    };
  },
  solve: ({ r, k, m, area }) => {
    // Proportion of the full circle, in degrees.
    const frac = (k * 180) / m / 360;
    const v = area ? frac * r * r : frac * 2 * r;
    return `${v}*pi`;
  },
  misconceptions: ({ r, k, m, area }): Misconception[] => area
    ? [
      { response: piExpr(r * r * k, m), why: t`The sector area is ${math`\frac{${1}}{${2}}r^{${2}}\theta`}: you left out the half.` },
      { response: piExpr(r * k, 2 * m), why: t`The radius is squared in the area: ${math`\frac{${1}}{${2}}r^{${2}}\theta`}.` },
      { response: String((r * r * k * 180) / m / 2), why: t`That puts the angle in degrees into ${math`\frac{${1}}{${2}}r^{${2}}\theta`}. The formula needs ${math`\theta`} in radians.` },
    ]
    : [
      { response: piExpr(r * r * k, 2 * m), why: t`That is the sector's area. The arc length is ${math`r\theta`}.` },
      { response: String((r * k * 180) / m), why: t`That puts the angle in degrees into ${math`r\theta`}. The formula needs ${math`\theta`} in radians.` },
      { response: piExpr(2 * r * k, m), why: t`The arc is ${math`r\theta`}, not ${math`${2}r\theta`}: the full circumference ${math`${2}\pi r`} corresponds to ${math`\theta = ${2}\pi`}.` },
    ],
});

// ---------------------------------------------------------------- Cambridge problems

const a3sum = auto({
  id: 'a3-q1-i',
  source: cite('step-f03', 'Q1(i)'),
  title: t`A sum of sines at multiples of ${math`\frac{\pi}{${6}}`}`,
  prompt: t`Evaluate ${math`\sum_{n = ${0}}^{${6}} \sin\left(\frac{n\pi}{${6}}\right)`} exactly. Write square roots as sqrt.`,
  answer: { kind: 'expression', expected: '2 + sqrt(3)', variables: [] },
  solution: [
    t`The angles run from ${0} to ${math`\pi`} in steps of ${math`\frac{\pi}{${6}}`}, that is ${math`${30}^\circ`}. The sines are ${math`${0}, \frac{${1}}{${2}}, \frac{\sqrt{${3}}}{${2}}, ${1}, \frac{\sqrt{${3}}}{${2}}, \frac{${1}}{${2}}, ${0}`}, symmetric about ${math`\frac{\pi}{${2}}`} because ${math`\sin(\pi - x) = \sin x`}.`,
    t`The sum is ${math`${2} \times \frac{${1}}{${2}} + ${2} \times \frac{\sqrt{${3}}}{${2}} + ${1} = ${2} + \sqrt{${3}}`}.`,
  ],
  reference: '2 + sqrt(3)',
  verify: () => {
    let s = 0;
    for (let n = 0; n <= 6; n++) s += Math.sin((n * Math.PI) / 6);
    return far(s, 2 + Math.sqrt(3)) ? `sum is ${s}` : null;
  },
  misconceptions: [{ response: '1 + sqrt(3)', why: t`There are seven terms, ${math`n = ${0}`} to ${6}: both ${math`\frac{${1}}{${2}}`} terms and the ${1} at ${math`\frac{\pi}{${2}}`} count.` }],
  official: { source: cite('step-f03-hints', 'Q1(i)'), answer: '2 + sqrt(3)', agrees: true },
});

const a22zero = auto({
  id: 'a22-q3-iv',
  source: cite('step-f22', 'Q3(iv)(b)'),
  title: t`The zeros of ${math`\sin(x^{${2}})`}`,
  prompt: t`The non-negative solutions of ${math`\sin(x^{${2}}) = ${0}`}, in increasing order, start at ${math`x = ${0}`}. Find the fourth. Write square roots as sqrt and ${math`\pi`} as pi.`,
  nudge: t`Not quite. Treat ${math`x^{${2}}`} as one unknown first; its values are the easy list.`,
  hints: [
    t`For which values of ${math`u`} is ${math`\sin u = ${0}`}?`,
    t`If ${math`x^{${2}}`} must be one of those values, which ${math`x \ge ${0}`} comes from each?`,
    t`Counting ${math`x = ${0}`} as the first, which multiple of ${math`\pi`} does the fourth solution square to?`,
  ],
  answer: { kind: 'expression', expected: 'sqrt(3*pi)', variables: [] },
  solution: [
    t`${math`\sin u = ${0}`} exactly when ${math`u`} is a multiple of ${math`\pi`}: ${math`u = ${0}, \pi, ${2}\pi, ${3}\pi, \ldots`}, from the graph of sine.`,
    t`So ${math`x^{${2}} = ${0}, \pi, ${2}\pi, ${3}\pi`}, and for non-negative ${math`x`}, ${math`x = ${0}, \sqrt{\pi}, \sqrt{${2}\pi}, \sqrt{${3}\pi}`}. The fourth is ${math`\sqrt{${3}\pi}`}.`,
    t`Solve for the inside of the function first, then undo the square.`,
  ],
  reference: 'sqrt(3 pi)',
  verify: () => {
    const zs: number[] = [];
    // Scan for sign changes and exact zeros of sin(x^2) on [0, 4].
    let prev = 0;
    zs.push(0);
    for (let i = 1; i <= 40000 && zs.length < 4; i++) {
      const x = i / 10000;
      const v = Math.sin(x * x);
      if (prev !== 0 && Math.sign(v) !== Math.sign(prev)) zs.push(x);
      prev = v;
    }
    return far(zs[3] as number, Math.sqrt(3 * Math.PI), 1e-3) ? `fourth zero near ${zs[3]}` : null;
  },
  misconceptions: [{ response: '3*pi', why: t`${math`x^{${2}} = ${3}\pi`} gives ${math`x = \sqrt{${3}\pi}`}: take the square root.` }],
  official: { source: cite('step-f22-hints', 'Q3(iv)(b)'), answer: 'sqrt(3 pi)', agrees: true },
});

const g2perim = auto({
  id: 'nst-g2-i',
  source: cite('nst-workbook', 'G2(i)'),
  title: t`The perimeter of a sector`,
  prompt: t`Find the length of the perimeter of a sector of angle ${math`\frac{\pi}{${3}}`} radians of a disc of radius ${3}. Write ${math`\pi`} as pi.`,
  nudge: t`Not quite. Trace the whole boundary of the sector and add up every piece.`,
  hints: [
    t`Which pieces make up the boundary of a sector?`,
    t`How long is an arc of angle ${mth} in a circle of radius ${math`r`}, with ${mth} in radians?`,
    t`What is ${math`r\theta`} here, and how many radii join it to close the shape?`,
  ],
  answer: { kind: 'expression', expected: '6 + pi', variables: [] },
  solution: [t`The arc is ${math`r\theta = ${3} \times \frac{\pi}{${3}} = \pi`}.`, t`The perimeter is the arc plus two radii: ${math`\pi + ${6}`}.`, t`A sector's perimeter is its arc plus two radii.`],
  reference: '6 + pi',
  verify: () => (far(3 * (Math.PI / 3) + 6, 6 + Math.PI) ? 'perimeter' : null),
  misconceptions: [{ response: 'pi', why: t`That is the arc alone. The perimeter goes round the whole sector, including the two straight radii.` }],
});

const g2area = auto({
  id: 'nst-g2-ii',
  source: cite('nst-workbook', 'G2(ii)'),
  title: t`The area of a sector`,
  prompt: t`Find the area of a sector of angle ${math`\frac{\pi}{${3}}`} radians of a disc of radius ${3}. Write ${math`\pi`} as pi.`,
  nudge: t`Not quite. The sector is a simple fraction of the whole disc, which gives a quick check.`,
  hints: [
    t`What fraction of a full turn is ${math`\frac{\pi}{${3}}`}?`,
    t`What is the area of the whole disc of radius ${3}?`,
    t`Which formula gives a sector's area from ${math`r`} and ${mth} in radians, and does it agree with the fraction of the disc?`,
  ],
  answer: { kind: 'expression', expected: '3*pi/2', variables: [] },
  solution: [t`The area is ${math`\frac{${1}}{${2}}r^{${2}}\theta = \frac{${1}}{${2}} \times ${9} \times \frac{\pi}{${3}} = \frac{${3}\pi}{${2}}`}.`, t`Check: the sector is a sixth of the disc, and ${math`\frac{${9}\pi}{${6}} = \frac{${3}\pi}{${2}}`}.`, t`Check a sector against its fraction of the whole disc.`],
  reference: '3pi/2',
  verify: () => (far(0.5 * 9 * (Math.PI / 3), (Math.PI * 9) / 6) ? 'area' : null),
  misconceptions: [{ response: '3*pi', why: t`The sector area has a half: ${math`\frac{${1}}{${2}}r^{${2}}\theta`}.` }],
});

const fc4 = supervision({
  id: 'nst-fc4',
  source: cite('nst-workbook', 'FC4(i), (ii)'),
  title: t`Sketching ${math`\cos ${2}x`} and ${math`\sin^{${2}} x`}`,
  prompt: t`Sketch the curves ${math`y = \cos ${2}x`} and ${math`y = (\sin x)^{${2}}`} for ${math`-${2}\pi \le x \le ${2}\pi`}, marking where each crosses or touches the axes, its greatest and least values, and its period. Explain how the two graphs are related.`,
  writeUp: 'sketch',
  hints: [
    t`Where does each curve meet the ${math`x`}-axis, and where does each reach its greatest and least values?`,
    t`After how long does each curve repeat?`,
    t`Which double angle identity links ${math`\cos ${2}x`} to ${math`\sin^{${2}} x`}, and what stretch and shift of one graph does it describe?`,
  ],
});

// STEP I 2007 Q2 and STEP I 2010 Q3 (STEP Questions Database): tan(A + B) with arctangents,
// and the factor formulae on an ellipse.
const DB07 = 'stepdb-07-s1' as const;
const DB10 = 'stepdb-10-s1' as const;
const TAN = '8 + 5 sqrt(3)';
// STEP I 2005 Q4 and STEP I 2011 Q3's identity (STEP Questions Database): triple angles.
// 2011 Q3(i) needs differentiation and (ii) reciprocal functions, later topics.
const DB05 = 'stepdb-05-s1' as const;
const DB11 = 'stepdb-11-s1' as const;
// Rule 1 (2026-10-08): set here from trig.compound-angles, the earliest topic that teaches everything it needs.
const db07q2 = supervision({
  id: 'step07-q2',
  source: cite(DB07, 'Q2'),
  title: t`Arctangents that add to ${math`\frac{\pi}{${4}}`}`,
  prompt: t`(i) Given that ${math`A = \arctan\frac{${1}}{${2}}`} and that ${math`B = \arctan\frac{${1}}{${3}}`} (where ${math`A`} and ${math`B`} are acute) show, by considering ${math`\tan(A + B)`}, that ${math`A + B = \frac{${1}}{${4}}\pi`}. The non-zero integers ${math`p`} and ${math`q`} satisfy ${dmath`\arctan\frac{${1}}{p} + \arctan\frac{${1}}{q} = \frac{\pi}{${4}}.`} Show that ${math`(p - ${1})(q - ${1}) = ${2}`} and hence determine ${math`p`} and ${math`q`}. (ii) Let ${math`r`}, ${math`s`} and ${math`t`} be positive integers such that the highest common factor of ${math`s`} and ${math`t`} is ${1}. Show that, if ${dmath`\arctan\frac{${1}}{r} + \arctan\frac{s}{s + t} = \frac{\pi}{${4}},`} then there are only two possible values for ${math`t`}, and give ${math`r`} in terms of ${math`s`} in each case.`,
  hints: [
    t`What is ${math`\tan(A + B)`} in terms of ${math`\tan A`} and ${math`\tan B`}, and what is its value here?`,
    t`With ${math`\tan A = \frac{${1}}{p}`} and ${math`\tan B = \frac{${1}}{q}`}, what equation does ${math`\tan(A + B) = ${1}`} give, and how does it factorise?`,
    t`For (ii), what equation does the same method give, and how does the highest common factor condition restrict ${math`t`}?`,
  ],
  writeUp: 'proof',
});

// Rule 1 (2026-10-08): set here from trig.compound-angles, the earliest topic that teaches everything it needs.
const db10q3 = supervision({
  id: 'step10-q3',
  source: cite(DB10, 'Q3'),
  title: t`Parallel chords of an ellipse`,
  prompt: t`Show that ${math`\sin(x + y) - \sin(x - y) = ${2}\cos x\sin y`} and deduce that ${dmath`\sin A - \sin B = ${2}\cos\tfrac{${1}}{${2}}(A + B)\sin\tfrac{${1}}{${2}}(A - B).`} Show also that ${dmath`\cos A - \cos B = -${2}\sin\tfrac{${1}}{${2}}(A + B)\sin\tfrac{${1}}{${2}}(A - B).`} The points ${math`P`}, ${math`Q`}, ${math`R`} and ${math`S`} have coordinates ${math`(a\cos p, b\sin p)`}, ${math`(a\cos q, b\sin q)`}, ${math`(a\cos r, b\sin r)`} and ${math`(a\cos s, b\sin s)`} respectively, where ${math`${0} \le p < q < r < s < ${2}\pi`}, and ${math`a`} and ${math`b`} are positive. Given that neither of the lines ${math`PQ`} and ${math`SR`} is vertical, show that these lines are parallel if and only if ${dmath`r + s - p - q = ${2}\pi.`}`,
  hints: [
    t`Which compound angle formulae expand ${math`\sin(x + y)`} and ${math`\sin(x - y)`}?`,
    t`Which values of ${math`x`} and ${math`y`} turn ${math`\sin(x + y) - \sin(x - y)`} into ${math`\sin A - \sin B`}?`,
    t`What is the gradient of ${math`PQ`}, simplified with the factor formulae, and when are two such gradients equal on the given range?`,
  ],
  writeUp: 'proof',
});

// Rule 1 (2026-10-08): set here from trig.compound-angles, the earliest topic that teaches everything it needs.
const db07q2pq = auto({
  id: 'step07-q2-pq',
  source: cite(DB07, 'Q2(i)'),
  title: t`Which integers ${math`p`} and ${math`q`}`,
  prompt: t`The non-zero integers ${math`p`} and ${math`q`} satisfy ${math`\arctan\frac{${1}}{p} + \arctan\frac{${1}}{q} = \frac{\pi}{${4}}`}. Determine ${math`p`} and ${math`q`}.`,
  answer: {
    kind: 'witness',
    count: 2,
    unordered: true,
    example: '2, 3',
    check: ([p, q2]) => {
      if (p === undefined || q2 === undefined) return 'Give two values.';
      if (p.den !== 1n || q2.den !== 1n || p.num === 0n || q2.num === 0n) return 'p and q are non-zero integers.';
      const sum = Math.atan(1 / Number(p.num)) + Math.atan(1 / Number(q2.num));
      return Math.abs(sum - Math.PI / 4) < 1e-12 ? null : `With these, the sum of the arctangents is ${sum.toFixed(4)}, not a quarter of pi.`;
    },
  },
  hints: [
    t`What is ${math`\tan\left(\arctan\frac{${1}}{p} + \arctan\frac{${1}}{q}\right)`} in terms of ${math`p`} and ${math`q`}?`,
    t`Setting it equal to ${1}, how does the equation rearrange into a product equal to a constant?`,
    t`Which integer factor pairs are possible, and which of them give non-zero ${math`p`} and ${math`q`}?`,
  ],
  nudge: t`Not quite. Take the tangent of both sides and factorise; then discard any solution with a zero.`,
  solution: [
    t`Let ${math`A = \arctan\frac{${1}}{p}`} and ${math`B = \arctan\frac{${1}}{q}`}. Then ${math`\tan(A + B) = \frac{\frac{${1}}{p} + \frac{${1}}{q}}{${1} - \frac{${1}}{pq}} = \frac{p + q}{pq - ${1}}`}, and this must be ${math`\tan\frac{\pi}{${4}} = ${1}`}.`,
    t`So ${math`p + q = pq - ${1}`}, that is ${math`pq - p - q + ${1} = ${2}`}, that is ${math`(p - ${1})(q - ${1}) = ${2}`}.`,
    t`Integer factor pairs of ${2}: ${math`(${1}, ${2})`}, ${math`(${2}, ${1})`}, ${math`(-${1}, -${2})`}, ${math`(-${2}, -${1})`}, giving ${math`(p, q) = (${2}, ${3})`}, ${math`(${3}, ${2})`}, ${math`(${0}, -${1})`}, ${math`(-${1}, ${0})`}. The last two have a zero, so ${math`\{p, q\} = \{${2}, ${3}\}`}.`,
    t`Check: ${math`A + B`} lies strictly between ${0} and ${math`\pi`} for positive ${math`p, q`}, and ${math`\tan(A + B) = ${1}`} there only at ${math`\frac{\pi}{${4}}`}. That is part (i)'s ${math`\arctan\frac{${1}}{${2}} + \arctan\frac{${1}}{${3}} = \frac{\pi}{${4}}`}.`,
    t`Make the equation a product equal to a constant, then list the factor pairs.`,
  ],
  reference: '2, 3',
  verify: () => {
    // Search every pair of non-zero integers up to 200 in size: only (2, 3) and (3, 2) work.
    const found: string[] = [];
    for (let p = -200; p <= 200; p++) for (let q2 = p; q2 <= 200; q2++) {
      if (p === 0 || q2 === 0) continue;
      if (Math.abs(Math.atan(1 / p) + Math.atan(1 / q2) - Math.PI / 4) < 1e-12) found.push(`${p},${q2}`);
    }
    return found.join(' ') === '2,3' ? null : `found ${found.join(' ')}`;
  },
  misconceptions: [
    { response: '0, -1', why: t`${math`(p - ${1})(q - ${1}) = ${2}`} has that solution, but ${math`\frac{${1}}{p}`} needs ${math`p \ne ${0}`}. The question asks for non-zero integers.` },
  ],
});

// Rule 1 (2026-10-08): set here from trig.double-angle, the earliest topic that teaches everything it needs.
const db05q4 = supervision({
  id: 'step05-q4',
  source: cite(DB05, 'Q4'),
  title: t`Triple angles from a ${math`${3}`}, ${math`${4}`}, ${math`${5}`} triangle, and ${math`\tan ${3}\theta`}`,
  prompt: t`(i) Given that ${math`\cos\theta = \frac{${3}}{${5}}`} and that ${math`\frac{${3}\pi}{${2}} \le \theta \le ${2}\pi`}, show that ${math`\sin ${2}\theta = -\frac{${24}}{${25}}`}, and evaluate ${math`\cos ${3}\theta`}. (ii) Prove the identity ${dmath`\tan ${3}\theta \equiv \frac{${3}\tan\theta - \tan^{${3}}\theta}{${1} - ${3}\tan^{${2}}\theta}.`} Hence evaluate ${math`\tan\theta`}, given that ${math`\tan ${3}\theta = \frac{${11}}{${2}}`} and that ${math`\frac{\pi}{${4}} \le \theta \le \frac{\pi}{${2}}`}.`,
  hints: [
    t`In the given range, what is the sign of ${math`\sin\theta`}, and its value?`,
    t`Which formulae give ${math`\sin ${2}\theta`} and ${math`\cos ${3}\theta`}?`,
    t`For (ii), writing ${math`\tan ${3}\theta = \tan(${2}\theta + \theta)`}, which cubic in ${math`\tan\theta`} results, and which root fits the range?`,
  ],
  writeUp: 'proof',
});

// Rule 1 (2026-10-08): set here from trig.double-angle, the earliest topic that teaches everything it needs.
const db11q3 = supervision({
  id: 'step11-q3',
  source: cite(DB11, 'Q3, identity (*)'),
  title: t`A product of three sines`,
  prompt: t`Prove the identity ${dmath`${4}\sin\theta\sin\left(\tfrac{${1}}{${3}}\pi - \theta\right)\sin\left(\tfrac{${1}}{${3}}\pi + \theta\right) = \sin ${3}\theta.`}`,
  hints: [
    t`Which product-to-sum formula simplifies ${math`\sin\left(\tfrac{${1}}{${3}}\pi - \theta\right)\sin\left(\tfrac{${1}}{${3}}\pi + \theta\right)`}?`,
    t`What are ${math`\cos ${2}\theta`} and ${math`\cos\tfrac{${2}}{${3}}\pi`} in the result?`,
    t`Multiplying by ${math`${4}\sin\theta`}, how does the expression compare with ${math`${3}\sin\theta - ${4}\sin^{${3}}\theta`}?`,
  ],
  writeUp: 'proof',
});

// Rule 1 (2026-10-08): set here from trig.double-angle, the earliest topic that teaches everything it needs.
const db05q4tan = auto({
  id: 'step05-q4-tan',
  source: cite(DB05, 'Q4(ii)'),
  title: t`${math`\tan\theta`} from ${math`\tan ${3}\theta = \frac{${11}}{${2}}`}`,
  prompt: t`Given ${math`\tan ${3}\theta = \frac{${3}\tan\theta - \tan^{${3}}\theta}{${1} - ${3}\tan^{${2}}\theta}`}, evaluate ${math`\tan\theta`}, given that ${math`\tan ${3}\theta = \frac{${11}}{${2}}`} and that ${math`\frac{\pi}{${4}} \le \theta \le \frac{\pi}{${2}}`}. Give it exactly.`,
  answer: { kind: 'expression', expected: TAN, variables: [] },
  hints: [
    t`With ${math`t = \tan\theta`}, which cubic does the given value produce?`,
    t`Which simple rational root does the cubic have, and what quadratic remains?`,
    t`In the given range, how large must ${math`\tan\theta`} be, and which root qualifies?`,
  ],
  nudge: t`Not quite. Find all three roots of the cubic, then use the range of ${math`\theta`} to choose.`,
  solution: [
    t`Let ${math`t = \tan\theta`}. Then ${math`${2}(${3}t - t^{${3}}) = ${11}(${1} - ${3}t^{${2}})`}, that is ${math`${2}t^{${3}} - ${33}t^{${2}} - ${6}t + ${11} = ${0}`}.`,
    t`${math`t = \frac{${1}}{${2}}`} is a root: ${math`\frac{${2}}{${8}} - \frac{${33}}{${4}} - ${3} + ${11} = ${0}`}. Dividing out, ${math`(${2}t - ${1})(t^{${2}} - ${16}t - ${11}) = ${0}`}, so ${math`t = \frac{${1}}{${2}}`} or ${math`t = ${8} \pm \sqrt{${75}} = ${8} \pm ${5}\sqrt{${3}}`}.`,
    t`For ${math`\frac{\pi}{${4}} \le \theta \le \frac{\pi}{${2}}`}, ${math`\tan\theta \ge ${1}`}: only ${math`t = ${8} + ${5}\sqrt{${3}}`} qualifies (${math`${8} - ${5}\sqrt{${3}}`} is negative).`,
    t`Solve fully, then let the range choose the root.`,
  ],
  reference: TAN,
  verify: () => {
    const v = 8 + 5 * Math.sqrt(3);
    const th = Math.atan(v);
    if (!(th >= Math.PI / 4 && th <= Math.PI / 2)) return 'theta out of range';
    // The other roots of the cubic fall outside the range.
    if (Math.atan(0.5) >= Math.PI / 4 || 8 - 5 * Math.sqrt(3) >= 1) return 'another root in range';
    return close('tan 3 theta', Math.tan(3 * th), 5.5, 1e-9);
  },
  misconceptions: [
    { response: '1/2', why: t`${math`\tan\theta = \frac{${1}}{${2}}`} gives ${math`\theta < \frac{\pi}{${4}}`}, outside the range: ${math`\tan\theta \ge ${1}`} there.` },
    { response: '8 - 5 sqrt(3)', why: t`${math`${8} - ${5}\sqrt{${3}}`} is negative, but ${math`\tan\theta \ge ${1}`} for ${math`\frac{\pi}{${4}} \le \theta \le \frac{\pi}{${2}}`}.` },
  ],
});

// ---------------------------------------------------------------- lesson

export const radiansAndGraphs: TopicContent = {
  topicId: 'trig.radians-and-graphs',
  goal: t`Measure angles in radians, sketch ${math`\sin`}, ${math`\cos`}, and ${math`\tan`} for all angles, and use their symmetries and periods to find every angle with a given value.`,
  objective: t`Measure angles in radians, define sine and cosine for every angle, and find every angle with a given value.`,
  why: t`Radians make arcs, areas, and calculus simple; STEP and every later course measure angles this way.`,
  minutes: 30,
  lesson: [
    { kind: 'section', title: t`Why ${360}?` },
    { kind: 'hook', text: t`Why is a full turn ${math`${360}^\circ`}? Because the Babylonians liked the number, not because of anything about circles. There is a natural unit instead: walk along the circle a distance equal to its radius, and see how much you have turned. That angle, about ${Number((180 / Math.PI).toFixed(1))} degrees, is a radian, and with it the formulas for arcs, areas, and later derivatives lose their clutter.` },
    { kind: 'definition', name: t`Radian`, formal: t`An angle at the centre of a circle of radius ${math`r`} measures ${mth} [[radian|radians]] when the arc it cuts off has length ${math`r\theta`}. So a full turn is ${math`${2}\pi`} radians, and ${math`\pi`} radians ${math`= ${180}^\circ`}.`, plain: t`One radian cuts off an arc as long as the radius. The whole circumference ${math`${2}\pi r`} is ${math`${2}\pi`} radii, so a full turn is ${math`${2}\pi`} radians. A right angle is ${math`\frac{\pi}{${2}}`}.` },
    { kind: 'theorem', name: t`Arc and sector`, statement: t`In a circle of radius ${math`r`}, an angle of ${mth} radians at the centre cuts off an arc of length ${math`r\theta`} and a sector of area ${math`\frac{${1}}{${2}}r^{${2}}\theta`}.` },
    { kind: 'p', text: t`The arc is the definition. For the area: the sector is the fraction ${math`\frac{\theta}{${2}\pi}`} of the whole disc, whose area is ${math`\pi r^{${2}}`}, and ${math`\frac{\theta}{${2}\pi} \times \pi r^{${2}} = \frac{${1}}{${2}}r^{${2}}\theta`}.` },
    checkFrom(convert, { deg: 135, toRad: true }, t`Multiply by ${math`\frac{\pi}{${180}}`}: ${math`\frac{${135}}{${180}} = \frac{${3}}{${4}}`}.`),
    { kind: 'section', title: t`Sine and cosine for every angle` },
    { kind: 'narrative', text: t`A right triangle only has angles below ${math`\frac{\pi}{${2}}`}. To go further, let the angle turn: start at the point ${math`(${1}, ${0})`} on the circle of radius ${1} and move anticlockwise through ${mth}. Where you land gives the sine and cosine. For an acute angle this is the old definition, since the hypotenuse is ${1}.` },
    { kind: 'definition', name: t`Sine, cosine, and tangent of any angle`, formal: t`For any real ${mth}, let ${math`P`} be the point of the [[unit-circle|unit circle]] ${math`x^{${2}} + y^{${2}} = ${1}`} reached from ${math`(${1}, ${0})`} by turning through ${mth} radians about the origin, anticlockwise when ${math`\theta > ${0}`} and clockwise when ${math`\theta < ${0}`}. Then ${math`P = (\cos\theta, \sin\theta)`}, and ${math`\tan\theta = \frac{\sin\theta}{\cos\theta}`} when ${math`\cos\theta \neq ${0}`}.`, plain: t`Cosine is how far right the point is, sine how far up. At ${math`\theta = \pi`} the point is ${math`(-${1}, ${0})`}, so ${math`\cos\pi = -${1}`} and ${math`\sin\pi = ${0}`}.` },
    { kind: 'theorem', name: t`Symmetries and periods`, statement: t`For every real ${mth}: ${math`\cos^{${2}}\theta + \sin^{${2}}\theta = ${1}`}; ${math`\sin(\theta + ${2}\pi) = \sin\theta`} and ${math`\cos(\theta + ${2}\pi) = \cos\theta`}; ${math`\sin(-\theta) = -\sin\theta`} and ${math`\cos(-\theta) = \cos\theta`}; ${math`\sin(\pi - \theta) = \sin\theta`} and ${math`\cos(\pi - \theta) = -\cos\theta`}; and ${math`\tan(\theta + \pi) = \tan\theta`} where defined.` },
    {
      kind: 'steps',
      steps: [
        { label: t`On the circle`, text: t`${math`P`} lies on ${math`x^{${2}} + y^{${2}} = ${1}`}, so ${math`\cos^{${2}}\theta + \sin^{${2}}\theta = ${1}`}.` },
        { label: t`A full turn`, text: t`Turning a further ${math`${2}\pi`} returns to the same point, so sine and cosine repeat every ${math`${2}\pi`}: their [[period|period]].` },
        { label: t`Mirror in the x-axis`, text: t`Turning through ${math`-\theta`} lands on the reflection of ${math`P`} in the ${math`x`}-axis, ${math`(\cos\theta, -\sin\theta)`}.` },
        { label: t`Mirror in the y-axis`, text: t`Turning through ${math`\pi - \theta`} lands on the reflection in the ${math`y`}-axis, ${math`(-\cos\theta, \sin\theta)`}.` },
        { label: t`Half a turn`, text: t`Turning a further ${math`\pi`} lands on ${math`(-\cos\theta, -\sin\theta)`}: both change sign, so their ratio, the tangent, repeats every ${math`\pi`}.` },
      ],
    },
    { kind: 'narrative', text: t`Plot ${math`\sin\theta`} against ${mth} and you get the familiar wave: ${0} at ${0}, up to ${1} at ${math`\frac{\pi}{${2}}`}, back to ${0} at ${math`\pi`}, down to ${math`-${1}`} at ${math`\frac{${3}\pi}{${2}}`}, and repeating. The cosine graph is the same wave shifted left by ${math`\frac{\pi}{${2}}`}. The tangent graph repeats every ${math`\pi`} and shoots off to infinity where the cosine is ${0}, at ${math`\frac{\pi}{${2}}`} plus multiples of ${math`\pi`}.` },
    checkFrom(anyAngle, { fn: 'cos', deg: 150 }, t`${math`\frac{${5}\pi}{${6}}`} is in the second quadrant, left of the ${math`y`}-axis, with reference angle ${math`\frac{\pi}{${6}}`}.`),
    { kind: 'section', title: t`Every angle with a given sine` },
    { kind: 'theorem', name: t`All solutions`, statement: t`Let ${math`\alpha`} be one solution. Then ${math`\sin x = \sin\alpha`} exactly when ${math`x = \alpha + ${2}k\pi`} or ${math`x = \pi - \alpha + ${2}k\pi`} for an integer ${math`k`}; and ${math`\cos x = \cos\alpha`} exactly when ${math`x = \pm\alpha + ${2}k\pi`}.` },
    { kind: 'p', text: t`Why: a horizontal line ${math`y = \sin\alpha`} with ${math`-${1} < \sin\alpha < ${1}`} meets the unit circle in exactly two points, ${math`P`} at angle ${math`\alpha`} and its mirror image in the ${math`y`}-axis at ${math`\pi - \alpha`}. Every angle landing on either point differs from it by whole turns. For cosine use a vertical line, whose two points are mirror images in the ${math`x`}-axis. (When ${math`\sin\alpha = \pm ${1}`} the two families coincide.)` },
    checkFrom(allSolutions, { fn: 'sin', ref: 30, neg: true }, t`One solution is ${math`-\frac{\pi}{${6}}`}; the other family starts at ${math`\pi + \frac{\pi}{${6}}`}. In ${math`[${0}, ${2}\pi)`} that gives ${math`\frac{${7}\pi}{${6}}`} and ${math`\frac{${11}\pi}{${6}}`}.`),
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`The calculator's ${math`\sin^{-${1}}`} gives every solution of ${math`\sin x = c`}.`, counterexample: t`${math`\sin^{-${1}}\left(\frac{${1}}{${2}}\right) = \frac{\pi}{${6}}`}, but ${math`\frac{${5}\pi}{${6}}`} also has sine ${math`\frac{${1}}{${2}}`}, and so does every angle ${math`${2}\pi`} away from either.` },
    { kind: 'pitfall', claim: t`An arc of angle ${math`${72}`} in a circle of radius ${5} has length ${math`${5} \times ${72} = ${360}`}.`, counterexample: t`The formula ${math`r\theta`} needs ${mth} in radians: ${math`${72}^\circ = ${72} \times \frac{\pi}{${180}} = \frac{${2}\pi}{${5}}`}, so the arc is ${math`${5} \times \frac{${2}\pi}{${5}} = ${2}\pi`}, about ${Number((2 * Math.PI).toFixed(2))}. In degrees the arc is ${math`\frac{\theta}{${360}} \times ${2}\pi r`}.` },
    { kind: 'takeaway', text: t`A radian is the angle whose arc equals the radius; sine and cosine are the coordinates of a point turning round the unit circle, so they repeat every ${math`${2}\pi`} and every value is taken twice per turn.` },
  ],
  examples: [
    workedCambridge(a3sum),
    worked(allSolutions, { fn: 'cos', ref: 45, neg: true }, t`Every angle with a given cosine`),
    worked(sector, { r: 6, k: 2, m: 3, area: true }, t`The area of a sector`),
  ],
  generators: [convert, anyAngle, allSolutions, sector],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['radian', 'unit-circle', 'period'],
  cambridge: withUses([a22zero, g2perim, g2area, fc4, db07q2, db10q3, db07q2pq, db05q4, db11q3, db05q4tan], {
    'step05-q4-tan': { sections: ['Every angle with a given sine'], note: t`Solving for a tangent from the triple angle formula, choosing the root by the range` },
    'step11-q3': { sections: ['Sine and cosine for every angle'], note: t`A triple angle identity with angles in radians` },
    'step05-q4': { sections: ['Sine and cosine for every angle'], note: t`Double and triple angles with the quadrant in radians` },
    'step07-q2-pq': { sections: ['Sine and cosine for every angle'], note: t`Integer solutions of an arctangent equation` },
    'step10-q3': { sections: ['Every angle with a given sine'], note: t`Sum-to-product formulas and parallel chords of an ellipse` },
    'step07-q2': { sections: ['Sine and cosine for every angle'], note: t`Adding arctangents with the tangent formula`, needs: ['pre.hcf-lcm'] },
    'nst-fc4': { sections: ['Sine and cosine for every angle'], note: t`Sketching two trigonometric graphs and relating them` },
    'a22-q3-iv': { sections: ['Every angle with a given sine'], note: t`Every angle with sine zero, then a square root` },
  }),
  // The STEP Support problem first (batch 9), then the NST Workbook's sketch, then STEP I 2010 Q3, set here by
  // Rule 1 (2026-10-08): its parallel chords come down to which angles have a given sine. The other STEP questions
  // set here are practice: 2005 Q4's auto-checked tangent is the answer to its own last part.
  gate: ['a22-q3-iv', 'nst-fc4', 'step10-q3'],
  recall: [
    { front: t`Define a radian.`, back: t`The angle at the centre of a circle whose arc equals the radius; ${math`\pi`} radians is ${math`${180}^\circ`}.` },
    { front: t`State the arc length and sector area for an angle ${mth} in radians.`, back: t`Arc ${math`r\theta`}; area ${math`\frac{${1}}{${2}}r^{${2}}\theta`}.` },
    { front: t`Give all solutions of ${math`\sin x = \sin\alpha`} and ${math`\cos x = \cos\alpha`}.`, back: t`${math`x = \alpha + ${2}k\pi`} or ${math`\pi - \alpha + ${2}k\pi`}; and ${math`x = \pm\alpha + ${2}k\pi`}.` },
  ],
  proofOrder: [
    {
      title: t`Every angle with a given sine`,
      steps: [
        t`The angles with sine ${math`c`} land on the points of the unit circle at height ${math`c`}.`,
        t`A horizontal line meets the circle in at most two points, mirror images in the ${math`y`}-axis.`,
        t`One point is at angle ${math`\alpha`}, the other at ${math`\pi - \alpha`}.`,
        t`Every other angle differs from one of these by whole turns of ${math`${2}\pi`}.`,
      ],
    },
  ],
};
