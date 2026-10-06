/**
 * trig.equations: solving trigonometric equations on an interval: linear multiples of the
 * angle, quadratics in sin or cos, and equations that need an identity first. Follows STEP
 * Support Foundation Assignment 16 Q2(ii) (sin 3A - sin A = 2cos 2A, with the official
 * answer from the hints) and Q3 (2015 STEP I Q2: the cubic 4x^3 - 3x = cos 3 alpha, and
 * y^3 - 3y - sqrt 2 = 0 solved with it), and NST Maths Workbook T1, T7, and T8.
 */
import { auto, cite, supervision } from '../cambridge';
import { valuesKey } from '../geometry';
import { int, pick, q, str } from '../math';
import { generator, type Misconception } from '../problem';
import { computedTex, dmath, math, t } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';
import { far } from '../partv-a';
import type { Rational } from '@learnhub/mastery';

const fnTex = (f: string) => computedTex(`\\${f}`);
const rad = (d: number): number => (d * Math.PI) / 180;
/** The solutions in [0, 360) degrees among multiples of 2.5 degrees, by testing each. */
function solveDeg(f: (x: number) => number): number[] {
  const out: number[] = [];
  for (let d = 0; d < 360; d += 2.5) if (Math.abs(f(rad(d))) < 1e-9) out.push(d);
  return out;
}
const ks = (ds: readonly number[]): Rational[] => ds.map((d) => q(2 * d, 360));
const ksText = (ds: readonly number[]): string => ks(ds).map(str).join(', ');
/** d degrees as a multiple of pi in LaTeX. */
const piOf = (d: number) => {
  const r = q(2 * d, 360);
  if (r.num === 0n) return computedTex(String(0));
  const top = r.num === 1n ? '\\pi' : `${r.num}\\pi`;
  return computedTex(r.den === 1n ? top : `\\frac{${top}}{${r.den}}`);
};
const kWitness = (ds: readonly number[]) => ({
  kind: 'witness' as const, count: { min: 1, max: 12 }, unordered: true, example: ksText(ds),
  check: (v: readonly Rational[]) => (valuesKey(v) === valuesKey(ks(ds)) ? null : v.length < ds.length ? 'Some solutions are missing: check every branch in the whole interval.' : 'Substitute each value back into the equation to check it.'),
});
const ASK = t`Write each solution as ${math`x = k\pi`}, and give the values of ${math`k`} as fractions.`;

/** Special values of sine: value as LaTeX, as a number, and the reference angle in degrees. */
const VALS = [
  { tex: '\\frac{1}{2}', v: 0.5, ref: 30 },
  { tex: '\\frac{\\sqrt{2}}{2}', v: Math.SQRT2 / 2, ref: 45 },
  { tex: '\\frac{\\sqrt{3}}{2}', v: Math.sqrt(3) / 2, ref: 60 },
] as const;

// ---------------------------------------------------------------- a multiple of the angle

interface MulP { fn: 'sin' | 'cos'; n: 2 | 3; i: number; neg: boolean }

const mulSols = (p: MulP): number[] => {
  const c = (p.neg ? -1 : 1) * (VALS[p.i] as (typeof VALS)[number]).v;
  return solveDeg((x) => (p.fn === 'sin' ? Math.sin(p.n * x) : Math.cos(p.n * x)) - c);
};

const multipleAngle = generator<MulP>({
  id: 'multiple-angle',
  skill: 'Solve sin nx = c or cos nx = c on [0, 2 pi): solve for nx on [0, 2n pi), then divide by n.',
  params: (rng) => ({ fn: pick(rng, ['sin', 'cos'] as const), n: pick(rng, [2, 3] as const), i: int(rng, 0, 2), neg: rng() < 0.4 }),
  sane: (p) => (mulSols(p).length === 2 * p.n ? null : 'wrong count'),
  problem: (p) => {
    const V = VALS[p.i] as (typeof VALS)[number];
    const ds = mulSols(p);
    const u = p.fn === 'sin' ? (p.neg ? [180 + V.ref, 360 - V.ref] : [V.ref, 180 - V.ref]) : p.neg ? [180 - V.ref, 180 + V.ref] : [V.ref, 360 - V.ref];
    return {
      prompt: t`Solve ${math`${fnTex(p.fn)} ${p.n}x = ${computedTex(p.neg ? `-${V.tex}` : V.tex)}`} for ${math`${0} \le x < ${2}\pi`}. ${ASK}`,
      answer: kWitness(ds),
      solution: [
        t`Put ${math`u = ${p.n}x`}. As ${math`x`} runs over ${math`[${0}, ${2}\pi)`}, ${math`u`} runs over ${math`[${0}, ${2 * p.n}\pi)`}: ${p.n} full turns, so expect ${2 * p.n} solutions.`,
        t`In the first turn, ${math`${fnTex(p.fn)} u = ${computedTex(p.neg ? `-${V.tex}` : V.tex)}`} at ${math`u = ${piOf(u[0] as number)}`} and ${math`u = ${piOf(u[1] as number)}`}. Add ${math`${2}\pi`} ${p.n === 2 ? t`once` : t`once and twice`} for the other turns.`,
        t`Divide every ${math`u`} by ${p.n}: ${math`x = ${computedTex(ds.map((d) => (piOf(d) as { text: string }).text).join(',\\ '))}`}.`,
      ],
    };
  },
  solve: (p) => ksText(mulSols(p)),
  misconceptions: (p): Misconception[] => {
    const ds = mulSols(p);
    const firstTurn = ds.filter((d) => d < 360 / p.n);
    const V = VALS[p.i] as (typeof VALS)[number];
    const u = p.fn === 'sin' ? (p.neg ? [180 + V.ref, 360 - V.ref] : [V.ref, 180 - V.ref]) : p.neg ? [180 - V.ref, 180 + V.ref] : [V.ref, 360 - V.ref];
    return [
      { response: ksText(firstTurn), why: t`Only the first turn of ${math`u = ${p.n}x`} is covered. ${math`u`} goes up to ${math`${2 * p.n}\pi`}, so add multiples of ${math`${2}\pi`} to ${math`u`} before dividing.` },
      { response: ksText(u), why: t`Those are the values of ${math`u = ${p.n}x`}. Divide by ${p.n} to get ${math`x`}.` },
    ];
  },
});

// ---------------------------------------------------------------- a quadratic in sin or cos

interface QuadP { fn: 'sin' | 'cos'; r1: Rational; r2: Rational }

/** The equation (a s - b)(c s - d) = 0 for roots r1 = b/a, r2 = d/c, as coefficients of s^2, s, 1. */
const quadCoeffs = ({ r1, r2 }: QuadP): [number, number, number] => {
  const [a, b, c, d] = [Number(r1.den), Number(r1.num), Number(r2.den), Number(r2.num)];
  return [a * c, -(a * d + b * c), b * d];
};
const quadSols = (p: QuadP): number[] => {
  const [A, B, C] = quadCoeffs(p);
  return solveDeg((x) => {
    const s = p.fn === 'sin' ? Math.sin(x) : Math.cos(x);
    return A * s * s + B * s + C;
  });
};

const quadratic = generator<QuadP>({
  id: 'quadratic-in-sin',
  skill: 'Solve a quadratic in sin x or cos x: factorise, discard any root outside [-1, 1], and find every angle for each remaining value.',
  params: (rng) => {
    const pool = [q(1, 2), q(-1, 2), q(1), q(-1), q(0), q(2), q(-2), q(3, 2)];
    for (;;) {
      const r1 = pick(rng, pool.slice(0, 5));
      const r2 = pick(rng, pool);
      if (str(r1) !== str(r2)) return { fn: pick(rng, ['sin', 'cos'] as const), r1, r2 };
    }
  },
  sane: (p) => (quadSols(p).length > 0 ? null : 'no solutions'),
  problem: (p) => {
    const [A, B, C] = quadCoeffs(p);
    const s = p.fn === 'sin' ? '\\sin x' : '\\cos x';
    const term = (c: number, body: string, first: boolean): string => (c === 0 ? '' : `${first ? (c < 0 ? '-' : '') : c < 0 ? ' - ' : ' + '}${Math.abs(c) === 1 && body !== '' ? '' : Math.abs(c)}${body}`);
    const eq = `${term(A, `${p.fn === 'sin' ? '\\sin' : '\\cos'}^{${2}} x`, true)}${term(B, s, false)}${term(C, '', false)} = ${0}`;
    const ds = quadSols(p);
    const outside = [p.r1, p.r2].filter((r) => Math.abs(Number(r.num) / Number(r.den)) > 1);
    return {
      prompt: t`Solve ${computedTex(eq)} for ${math`${0} \le x < ${2}\pi`}. ${ASK}`,
      answer: kWitness(ds),
      solution: [
        t`Put ${math`s = ${computedTex(s)}`}: the equation is a quadratic in ${math`s`} with roots ${math`s = ${p.r1}`} and ${math`s = ${p.r2}`} (factorise, or use the formula).`,
        outside.length > 0 ? t`${math`${computedTex(s)}`} always lies between ${math`-${1}`} and ${1}, so ${math`s = ${outside[0] as Rational}`} gives no solution.` : t`Both roots lie between ${math`-${1}`} and ${1}, so both give solutions.`,
        t`Find every ${math`x`} in ${math`[${0}, ${2}\pi)`} for each value from the unit circle: ${math`x = ${computedTex(ds.map((d) => (piOf(d) as { text: string }).text).join(',\\ '))}`}.`,
      ],
    };
  },
  solve: (p) => ksText(quadSols(p)),
  misconceptions: (p): Misconception[] => {
    const ds = quadSols(p);
    const one = (r: Rational): number[] => {
      const c = Number(r.num) / Number(r.den);
      return solveDeg((x) => (p.fn === 'sin' ? Math.sin(x) : Math.cos(x)) - c);
    };
    const a = one(p.r1);
    const b = one(p.r2);
    const out: Misconception[] = [];
    if (a.length > 0 && b.length > 0) out.push({ response: ksText(a), why: t`That covers only the root ${math`s = ${p.r1}`}. The other root, ${math`${p.r2}`}, gives solutions too.` });
    const neg = solveDeg((x) => {
      const s = -(p.fn === 'sin' ? Math.sin(x) : Math.cos(x));
      const [A, B, C] = quadCoeffs(p);
      return A * s * s + B * s + C;
    });
    if (neg.length > 0) out.push({ response: ksText(neg), why: t`Those solve the equation with the signs of the roots flipped. Check the factorisation by expanding it.` });
    const firstQuadrant = ds.filter((d) => d <= 90);
    if (firstQuadrant.length > 0) out.push({ response: ksText(firstQuadrant), why: t`Each value of ${math`${fnTex(p.fn)} x`} is taken twice per turn (or once at ${math`\pm ${1}`}): find the second angle from the symmetry of the graph.` });
    out.push({ response: ksText([...ds, 360]), why: t`The interval stops before ${math`${2}\pi`}: ${math`x = ${2}\pi`} is not included.` });
    return out;
  },
});

// ---------------------------------------------------------------- tan

interface TanP { i: number; neg: boolean }
const TANS = [{ tex: '\\frac{\\sqrt{3}}{3}', v: 1 / Math.sqrt(3) }, { tex: '1', v: 1 }, { tex: '\\sqrt{3}', v: Math.sqrt(3) }] as const;
const tanSols = (p: TanP): number[] => solveDeg((x) => (Math.abs(Math.cos(x)) < 1e-12 ? 1 : Math.tan(x) - (p.neg ? -1 : 1) * (TANS[p.i] as (typeof TANS)[number]).v));

const tanEq = generator<TanP>({
  id: 'tan-equation',
  skill: 'Solve tan x = c on [0, 2 pi): tan repeats every pi, so there are two solutions, pi apart.',
  quick: true,
  params: (rng) => ({ i: int(rng, 0, 2), neg: rng() < 0.5 }),
  sane: (p) => (tanSols(p).length === 2 ? null : 'wrong count'),
  problem: (p) => {
    const T = TANS[p.i] as (typeof TANS)[number];
    const ds = tanSols(p);
    return {
      prompt: t`Solve ${math`\tan x = ${computedTex(p.neg ? `-${T.tex}` : T.tex)}`} for ${math`${0} \le x < ${2}\pi`}. ${ASK}`,
      answer: kWitness(ds),
      solution: [
        t`One solution is ${math`x = ${piOf(ds[0] as number)}`}${p.neg ? t`, in the second quadrant, where sine is positive and cosine negative` : t``}.`,
        t`Tangent has period ${math`\pi`}, so add ${math`\pi`}: ${math`x = ${piOf(ds[1] as number)}`}. Adding ${math`\pi`} again leaves the interval.`,
      ],
    };
  },
  solve: (p) => ksText(tanSols(p)),
  misconceptions: (p): Misconception[] => {
    const ds = tanSols(p);
    const other = tanSols({ ...p, neg: !p.neg });
    return [
      { response: ksText([ds[0] as number]), why: t`Tangent repeats every ${math`\pi`}, so there is a second solution in ${math`[${0}, ${2}\pi)`}.` },
      { response: ksText(other), why: t`Those have the opposite sign of tangent. Tangent is negative in the second and fourth quadrants.` },
      { response: ksText([ds[0] as number, 360 - (ds[0] as number)]), why: t`For tangent the second solution is ${math`\pi`} later, not the reflection ${math`${2}\pi - x`}.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

const A16 = [45, 90, 135, 225, 315];

const a16q2ii = auto({
  id: 'a16-q2-ii',
  source: cite('step-f16', 'Q2(ii)'),
  title: t`${math`\sin ${3}A - \sin A = ${2}\cos ${2}A`}`,
  prompt: t`Using ${math`\sin ${3}A = ${3}\sin A - ${4}\sin^{${3}} A`}, solve ${math`\sin ${3}A - \sin A = ${2}\cos ${2}A`} for ${math`${0} \le A < ${2}\pi`}. Write each solution as ${math`A = k\pi`}, and give the values of ${math`k`}.`,
  answer: kWitness(A16),
  solution: [
    t`With ${math`s = \sin A`} and ${math`\cos ${2}A = ${1} - ${2}s^{${2}}`}: ${math`${3}s - ${4}s^{${3}} - s = ${2} - ${4}s^{${2}}`}.`,
    t`Rearrange: ${math`${4}s^{${3}} - ${4}s^{${2}} - ${2}s + ${2} = ${0}`}, that is ${math`${2}s^{${3}} - ${2}s^{${2}} - s + ${1} = ${0}`}, which factorises as ${math`(s - ${1})(${2}s^{${2}} - ${1}) = ${0}`}.`,
    t`${math`\sin A = ${1}`} gives ${math`A = \frac{\pi}{${2}}`}. ${math`\sin A = \pm\frac{${1}}{\sqrt{${2}}}`} gives ${math`A = \frac{\pi}{${4}}, \frac{${3}\pi}{${4}}, \frac{${5}\pi}{${4}}, \frac{${7}\pi}{${4}}`}.`,
  ],
  reference: ksText(A16),
  verify: () => {
    const found = solveDeg((x) => Math.sin(3 * x) - Math.sin(x) - 2 * Math.cos(2 * x));
    if (found.join(',') !== A16.join(',')) return `multiples of 2.5 degrees give ${found.join(', ')}`;
    // No other solutions: sample finely between them for sign changes.
    let changes = 0;
    let prev = Math.sin(0) - 0 - 2;
    for (let i = 1; i < 72000; i++) {
      const x = (i * 2 * Math.PI) / 72000;
      const v = Math.sin(3 * x) - Math.sin(x) - 2 * Math.cos(2 * x);
      if (Math.sign(v) !== Math.sign(prev) && v !== 0) changes++;
      prev = v;
    }
    return changes <= 2 * A16.length ? null : `${changes} sign changes`;
  },
  misconceptions: [{ response: '1/4, 3/4, 5/4, 7/4', why: t`The factor ${math`s - ${1}`} gives ${math`\sin A = ${1}`}, so ${math`A = \frac{\pi}{${2}}`} is a solution too.` }],
  official: { source: cite('step-f16-hints', 'Q2(ii)'), answer: '1/2, 1/4, 3/4, 5/4, 7/4', agrees: true },
});

const a16cubic = auto({
  id: 'a16-q3-iii',
  source: cite('step-f16', 'Q3(iii)'),
  title: t`A cubic solved by ${math`\cos ${3}\alpha`}`,
  prompt: t`The roots of ${math`${4}x^{${3}} - ${3}x - \cos ${3}\alpha = ${0}`} are ${math`\cos\alpha`} and ${math`\cos(\alpha \pm ${120}^\circ)`}. Use this, with ${math`y = ${2}x`}, to find the largest root of ${math`y^{${3}} - ${3}y - \sqrt{${2}} = ${0}`}, in surd form. Write square roots as sqrt.`,
  answer: { kind: 'expression', expected: '(sqrt(6) + sqrt(2))/2', variables: [] },
  solution: [
    t`Put ${math`y = ${2}x`}: ${math`${8}x^{${3}} - ${6}x - \sqrt{${2}} = ${0}`}, that is ${math`${4}x^{${3}} - ${3}x = \frac{\sqrt{${2}}}{${2}} = \cos ${45}^\circ`}. So ${math`${3}\alpha = ${45}^\circ`} works: ${math`\alpha = ${15}^\circ`}.`,
    t`The roots are ${math`x = \cos ${15}^\circ, \cos ${135}^\circ, \cos ${255}^\circ`}, and the largest is ${math`\cos ${15}^\circ = \frac{\sqrt{${3}} + ${1}}{${2}\sqrt{${2}}}`}.`,
    t`So the largest ${math`y`} is ${math`${2}\cos ${15}^\circ = \frac{\sqrt{${3}} + ${1}}{\sqrt{${2}}} = \frac{\sqrt{${6}} + \sqrt{${2}}}{${2}}`}. The others are ${math`-\sqrt{${2}}`} and ${math`-\frac{\sqrt{${6}} - \sqrt{${2}}}{${2}}`}.`,
  ],
  reference: '(sqrt(6) + sqrt(2))/2',
  verify: () => {
    const ys = [(Math.sqrt(6) + Math.SQRT2) / 2, -Math.SQRT2, -(Math.sqrt(6) - Math.SQRT2) / 2];
    for (const y of ys) if (Math.abs(y ** 3 - 3 * y - Math.SQRT2) > 1e-12) return `y = ${y} is not a root`;
    return null;
  },
  misconceptions: [{ response: '(sqrt(6) + sqrt(2))/4', why: t`That is ${math`x = \cos ${15}^\circ`}; the root of the equation in ${math`y`} is ${math`y = ${2}x`}.` }],
  official: { source: cite('step-f16-hints', 'Q3(iii)'), answer: '(sqrt(6) + sqrt(2))/2', agrees: true },
});

const a16q3ii = supervision({
  id: 'a16-q3-ii',
  source: cite('step-f16', 'Q3(ii)'),
  title: t`The roots of ${math`${4}x^{${3}} - ${3}x - \cos ${3}\alpha = ${0}`}`,
  prompt: t`(${2015} STEP I Q${2}(ii)) Show that ${math`\cos\alpha`} is a root of the equation ${math`${4}x^{${3}} - ${3}x - \cos ${3}\alpha = ${0}`}, and find the other two roots in terms of ${math`\cos\alpha`} and ${math`\sin\alpha`}.`,
  writeUp: 'proof',
  official: cite('step-f16-hints', 'Q3(ii)'),
});

const T1 = [45, 135, 225, 315];
const t1 = auto({
  id: 'nst-t1',
  source: cite('nst-workbook', 'T1'),
  title: t`Four values with ${math`${2}\sin^{${2}}\theta = ${1}`}`,
  prompt: t`Find the four values of ${math`\theta`} in the range ${0} to ${math`${2}\pi`} that satisfy ${math`${2}\sin^{${2}}\theta = ${1}`}. Write each as ${math`\theta = k\pi`} and give the values of ${math`k`}.`,
  answer: kWitness(T1),
  solution: [t`${math`\sin^{${2}}\theta = \frac{${1}}{${2}}`}, so ${math`\sin\theta = \pm\frac{${1}}{\sqrt{${2}}}`}.`, t`Positive: ${math`\frac{\pi}{${4}}, \frac{${3}\pi}{${4}}`}; negative: ${math`\frac{${5}\pi}{${4}}, \frac{${7}\pi}{${4}}`}.`],
  reference: ksText(T1),
  verify: () => (solveDeg((x) => 2 * Math.sin(x) ** 2 - 1).join(',') === T1.join(',') ? null : 'T1'),
  misconceptions: [{ response: '1/4, 3/4', why: t`Square roots come in pairs: ${math`\sin\theta = -\frac{${1}}{\sqrt{${2}}}`} gives two more.` }],
});

const T8 = [22.5, 90, 112.5, 202.5, 270, 292.5];
const t8 = auto({
  id: 'nst-t8',
  source: cite('nst-workbook', 'T8'),
  title: t`${math`\cos\theta + \cos ${3}\theta = \sin\theta + \sin ${3}\theta`}`,
  prompt: t`Find the values of ${math`\theta`} in the range ${0} to ${math`${2}\pi`} which satisfy ${math`\cos\theta + \cos ${3}\theta = \sin\theta + \sin ${3}\theta`}. Write each as ${math`\theta = k\pi`} and give the values of ${math`k`}.`,
  answer: {
    kind: 'witness', count: { min: 1, max: 12 }, unordered: true, example: T8.map((d) => str(q(d * 2, 360))).join(', '),
    check: (v) => (valuesKey(v) === valuesKey(T8.map((d) => q(d * 2, 360))) ? null : 'Write each side as a product, then factorise.'),
  },
  solution: [
    t`Write ${math`\cos ${3}\theta = \cos(${2}\theta + \theta)`} and ${math`\cos\theta = \cos(${2}\theta - \theta)`}: adding the compound angle formulae, ${math`\cos\theta + \cos ${3}\theta = ${2}\cos ${2}\theta\cos\theta`}. In the same way ${math`\sin\theta + \sin ${3}\theta = ${2}\sin ${2}\theta\cos\theta`}.`,
    t`So ${math`${2}\cos\theta(\cos ${2}\theta - \sin ${2}\theta) = ${0}`}: either ${math`\cos\theta = ${0}`}, giving ${math`\theta = \frac{\pi}{${2}}, \frac{${3}\pi}{${2}}`}, or ${math`\tan ${2}\theta = ${1}`}.`,
    t`${math`\tan ${2}\theta = ${1}`} with ${math`${2}\theta`} in ${math`[${0}, ${4}\pi)`}: ${math`${2}\theta = \frac{\pi}{${4}} + n\pi`}, so ${math`\theta = \frac{\pi}{${8}}, \frac{${5}\pi}{${8}}, \frac{${9}\pi}{${8}}, \frac{${13}\pi}{${8}}`}.`,
  ],
  reference: T8.map((d) => str(q(d * 2, 360))).join(', '),
  verify: () => {
    for (const d of T8) {
      const x = rad(d);
      if (Math.abs(Math.cos(x) + Math.cos(3 * x) - Math.sin(x) - Math.sin(3 * x)) > 1e-9) return `${d} is not a root`;
    }
    let changes = 0;
    const f = (x: number): number => Math.cos(x) + Math.cos(3 * x) - Math.sin(x) - Math.sin(3 * x);
    let prev = f(0);
    for (let i = 1; i <= 72000; i++) {
      const v = f((i * 2 * Math.PI) / 72000);
      if (v !== 0 && Math.sign(v) !== Math.sign(prev)) changes++;
      prev = v;
    }
    return changes === T8.length ? null : `${changes} sign changes`;
  },
  misconceptions: [{ response: '1/8, 5/8, 9/8, 13/8', why: t`Dividing by ${math`\cos\theta`} loses the solutions with ${math`\cos\theta = ${0}`}: factorise instead.` }],
});

const t7 = auto({
  id: 'nst-t7',
  source: cite('nst-workbook', 'T7'),
  title: t`${math`\sqrt{${3}}\sin\theta + \cos\theta`} as one sine`,
  prompt: t`Write ${math`\sqrt{${3}}\sin\theta + \cos\theta`} in the form ${math`A\sin(\theta + \alpha)`}, with ${math`A > ${0}`} and ${math`${0} \le \alpha < ${2}\pi`}. Give ${math`A`}, and ${math`k`} where ${math`\alpha = k\pi`}.`,
  answer: {
    kind: 'witness', count: 2, names: ['A', 'k'], example: 'A = 2, k = 1/6',
    check: (v) => (v.map(str).join(',') === '2,1/6' ? null : 'Expand A sin(theta + alpha) and match the coefficients of sin theta and cos theta.'),
  },
  solution: [
    t`${math`A\sin(\theta + \alpha) = A\cos\alpha\sin\theta + A\sin\alpha\cos\theta`}. Match: ${math`A\cos\alpha = \sqrt{${3}}`} and ${math`A\sin\alpha = ${1}`}.`,
    t`Square and add: ${math`A^{${2}} = ${3} + ${1} = ${4}`}, so ${math`A = ${2}`}. Then ${math`\cos\alpha = \frac{\sqrt{${3}}}{${2}}`} and ${math`\sin\alpha = \frac{${1}}{${2}}`}, so ${math`\alpha = \frac{\pi}{${6}}`}.`,
  ],
  reference: 'A = 2, k = 1/6',
  verify: () => {
    for (const th of [0.3, 1.7, -2.2]) if (far(Math.sqrt(3) * Math.sin(th) + Math.cos(th), 2 * Math.sin(th + Math.PI / 6))) return `theta = ${th}`;
    return null;
  },
  misconceptions: [{ response: 'A = 2, k = 1/3', why: t`${math`\tan\alpha = \frac{A\sin\alpha}{A\cos\alpha} = \frac{${1}}{\sqrt{${3}}}`}, so ${math`\alpha = \frac{\pi}{${6}}`}, not ${math`\frac{\pi}{${3}}`}.` }],
});

// ---------------------------------------------------------------- lesson

export const trigEquations: TopicContent = {
  topicId: 'trig.equations',
  goal: t`Solve equations such as ${math`\sin ${3}A - \sin A = ${2}\cos ${2}A`} on an interval by rewriting with identities and factorising.`,
  objective: t`Solve trigonometric equations on an interval with identities and factorising, finding every angle.`,
  why: t`STEP sets such equations often, and the habit of factorising and counting every case runs through algebra.`,
  minutes: 30,
  lesson: [
    { kind: 'section', title: t`How many solutions?` },
    { kind: 'hook', text: t`How many ${math`x`} between ${0} and ${math`${2}\pi`} have ${math`\sin ${3}x = \frac{${1}}{${2}}`}? A calculator offers one. The true answer is six, and an examiner will expect all six. The skill in this lesson is finding every solution and proving there are no more.` },
    { kind: 'narrative', text: t`Every method here reduces the equation to the basic one, ${math`\sin u = c`} or ${math`\cos u = c`} or ${math`\tan u = c`}, whose solutions you know from the unit circle: two per turn for sine and cosine (one at the top or bottom), two per turn for tangent, a half turn apart. The work is in the reduction, and in keeping count.` },
    { kind: 'definition', name: t`Solution set on an interval`, formal: t`The [[solution-set|solutions]] of ${math`f(x) = ${0}`} on an interval ${math`I`} are the ${math`x \in I`} with ${math`f(x) = ${0}`}. To solve the equation on ${math`I`} is to list them all, with a reason that there are no others.`, plain: t`Not one answer but every answer in the range. On ${math`[${0}, ${2}\pi)`}, ${math`\sin x = ${0}`} has solutions ${0} and ${math`\pi`}; ${math`${2}\pi`} is left out, since the interval stops just before it.` },
    { kind: 'section', title: t`Three patterns` },
    {
      kind: 'steps',
      steps: [
        { label: t`A multiple of the angle`, text: t`For ${math`\sin nx = c`}, put ${math`u = nx`}. As ${math`x`} runs over ${math`[${0}, ${2}\pi)`}, ${math`u`} runs over ${math`[${0}, ${2}n\pi)`}: ${math`n`} full turns. Solve for ${math`u`} over all of them, then divide by ${math`n`}.`, plain: t`For ${math`\sin ${3}x = \frac{${1}}{${2}}`}: ${math`u = \frac{\pi}{${6}}, \frac{${5}\pi}{${6}}`} plus ${math`${2}\pi`} and ${math`${4}\pi`}, six values; dividing by ${3} gives six ${math`x`}.` },
        { label: t`A quadratic in sine or cosine`, text: t`Put ${math`s = \sin x`}, solve the quadratic in ${math`s`}, discard any root outside ${math`[-${1}, ${1}]`}, and find every ${math`x`} for each root that is left.` },
        { label: t`Use an identity first`, text: t`If the equation mixes ${math`x`}, ${math`${2}x`}, ${math`${3}x`}, rewrite everything in one angle with the double and triple angle formulae, then factorise.`, why: { q: t`Why factorise rather than divide?`, a: t`Dividing by an expression that can be ${0} throws away the solutions where it is ${0}. In ${math`\sin ${2}\theta = \cos\theta`}, that is ${math`${2}\sin\theta\cos\theta - \cos\theta = \cos\theta(${2}\sin\theta - ${1}) = ${0}`}, dividing by ${math`\cos\theta`} loses ${math`\theta = \frac{\pi}{${2}}`} and ${math`\frac{${3}\pi}{${2}}`}.` } },
      ],
    },
    { kind: 'theorem', name: t`Zero product`, statement: t`For real numbers ${math`a`} and ${math`b`}, ${math`ab = ${0}`} if and only if ${math`a = ${0}`} or ${math`b = ${0}`}. So the solutions of ${math`f(x)g(x) = ${0}`} on ${math`I`} are the solutions of ${math`f(x) = ${0}`} together with those of ${math`g(x) = ${0}`}.` },
    { kind: 'p', text: t`This is why factorising keeps every solution: each factor gives its own family, and nothing is lost. If ${math`a \neq ${0}`}, divide ${math`ab = ${0}`} by ${math`a`} to get ${math`b = ${0}`}; that is the whole proof.` },
    checkFrom(multipleAngle, { fn: 'sin', n: 2, i: 0, neg: false }, t`${math`u = ${2}x`} runs over two turns, giving four values of ${math`u`}; halve each.`),
    checkFrom(quadratic, { fn: 'sin', r1: q(1, 2), r2: q(2) }, t`${math`\sin x = ${2}`} is impossible, so only ${math`\sin x = \frac{${1}}{${2}}`} gives solutions.`),
    { kind: 'section', title: t`A STEP equation` },
    { kind: 'narrative', text: t`Assignment ${16} asks for ${math`\sin ${3}A - \sin A = ${2}\cos ${2}A`}. Three different angles: rewrite them all in terms of ${math`s = \sin A`}, using ${math`\sin ${3}A = ${3}s - ${4}s^{${3}}`} and ${math`\cos ${2}A = ${1} - ${2}s^{${2}}`}. A cubic in ${math`s`} appears, and ${math`s = ${1}`} is a root you can spot. The worked example below finishes it.` },
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`Dividing both sides of ${math`\sin x\cos x = \sin x`} by ${math`\sin x`} gives all the solutions: ${math`\cos x = ${1}`}, so ${math`x = ${0}`} in ${math`[${0}, ${2}\pi)`}.`, counterexample: t`${math`x = \pi`} also works: ${math`\sin\pi = ${0}`}, and both sides are ${0}. Factorise: ${math`\sin x(\cos x - ${1}) = ${0}`} gives ${math`x = ${0}`} and ${math`x = \pi`}.` },
    { kind: 'pitfall', claim: t`${math`\tan x = ${1}`} on ${math`[${0}, ${2}\pi)`} has solutions ${math`\frac{\pi}{${4}}`} and ${math`\frac{${7}\pi}{${4}}`}, as for cosine.`, counterexample: t`${math`\tan\frac{${7}\pi}{${4}} = -${1}`}. Tangent repeats every ${math`\pi`}: the second solution is ${math`\frac{${5}\pi}{${4}}`}.` },
    { kind: 'takeaway', text: t`Reduce to ${math`\sin u = c`}, ${math`\cos u = c`}, or ${math`\tan u = c`} by substitution, identities, and factorising (never dividing by something that can be ${0}), then collect every solution in the interval.` },
  ],
  examples: [
    workedCambridge(a16q2ii),
    worked(quadratic, { fn: 'cos', r1: q(-1, 2), r2: q(1) }, t`A quadratic in cosine`),
    worked(tanEq, { i: 2, neg: true }, t`A tangent equation`),
  ],
  generators: [multipleAngle, quadratic, tanEq],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['solution-set'],
  cambridge: [a16cubic, a16q3ii, t8, t1, t7],
  gate: ['a16-q3-ii', 'a16-q3-iii', 'nst-t8'],
  recall: [
    { front: t`How do you solve ${math`\sin nx = c`} on ${math`[${0}, ${2}\pi)`}?`, back: t`Solve ${math`\sin u = c`} for ${math`u = nx`} over ${math`[${0}, ${2}n\pi)`}, then divide by ${math`n`}.` },
    { front: t`Why factorise instead of dividing?`, back: t`Dividing by something that can be ${0} loses the solutions where it is ${0}; a product is ${0} exactly when a factor is.` },
  ],
  proofOrder: [
    {
      title: t`Solving ${math`\sin ${3}A - \sin A = ${2}\cos ${2}A`}`,
      steps: [
        t`Rewrite with ${math`s = \sin A`}: ${math`\sin ${3}A = ${3}s - ${4}s^{${3}}`} and ${math`\cos ${2}A = ${1} - ${2}s^{${2}}`}.`,
        t`Collect into the cubic ${math`${2}s^{${3}} - ${2}s^{${2}} - s + ${1} = ${0}`}.`,
        t`Factorise: ${math`(s - ${1})(${2}s^{${2}} - ${1}) = ${0}`}.`,
        t`Find every ${math`A`} in ${math`[${0}, ${2}\pi)`} for ${math`s = ${1}`} and for ${math`s = \pm\frac{${1}}{\sqrt{${2}}}`}.`,
      ],
    },
  ],
};
