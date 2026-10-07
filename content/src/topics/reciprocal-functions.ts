/**
 * trig.reciprocal-functions: sec, cosec, and cot, their exact values, and the identities
 * sec^2 = 1 + tan^2 and cosec^2 = 1 + cot^2. Follows STEP Support Foundation Assignment 24
 * Q2(ii) (cosec pi/4 and cosec 5pi/6, with the official answers from the hints) and
 * Assignment 25 Q2(iii) (the relation between tan and sec), and NST Maths Workbook T2 and
 * T3(iii).
 */
import { auto, cite, supervision, withUses } from '../cambridge';
import { cosDeg, sinDeg, TRIPLES, valuesKey, type Exact } from '../geometry';
import { int, pick, q, str } from '../math';
import { generator, type Misconception } from '../problem';
import { computedTex, dmath, math, t } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';
import { far } from '../partv-a';
import type { Rational } from '@learnhub/mastery';

const mth = math`\theta`;
const fnTex = (f: string) => computedTex(`\\${f}`);
const rad = (d: number): number => (d * Math.PI) / 180;

/** Reciprocals of the special values, simplified, by value. */
const RECIP: readonly { expr: string; tex: string; v: number }[] = [
  { expr: '2', tex: '2', v: 2 },
  { expr: 'sqrt(2)', tex: '\\sqrt{2}', v: Math.SQRT2 },
  { expr: '2*sqrt(3)/3', tex: '\\frac{2\\sqrt{3}}{3}', v: (2 * Math.sqrt(3)) / 3 },
  { expr: '1', tex: '1', v: 1 },
  { expr: 'sqrt(3)', tex: '\\sqrt{3}', v: Math.sqrt(3) },
  { expr: 'sqrt(3)/3', tex: '\\frac{\\sqrt{3}}{3}', v: Math.sqrt(3) / 3 },
];
function recipOf(x: number): Exact {
  const m = RECIP.find((r) => Math.abs(r.v - Math.abs(x)) < 1e-12);
  if (m === undefined) throw new Error(`no reciprocal for ${x}`);
  return x < 0 ? { expr: `-${m.expr}`, tex: `-${m.tex}`, value: -m.v } : { expr: m.expr, tex: m.tex, value: m.v };
}

// ---------------------------------------------------------------- exact values

interface ValP { fn: 'sec' | 'csc' | 'cot'; deg: number }

const base = (fn: string, d: number): Exact => (fn === 'sec' ? cosDeg(d) : fn === 'csc' ? sinDeg(d) : { expr: '', tex: '', value: Math.tan(rad(d)) });

const exactRecip = generator<ValP>({
  id: 'exact-reciprocal',
  skill: 'Find sec, cosec, or cot of a special angle as the reciprocal of cos, sin, or tan, with the sign from the quadrant.',
  quick: true,
  params: (rng) => {
    for (;;) {
      const deg = pick(rng, [30, 45, 60]) + 90 * int(rng, 0, 3);
      const fn = pick(rng, ['sec', 'csc', 'cot'] as const);
      if (deg % 90 !== 0) return { fn, deg };
    }
  },
  sane: ({ deg }) => (deg % 90 !== 0 ? null : 'on an axis'),
  problem: ({ fn, deg }) => {
    const b = base(fn, deg);
    const v = recipOf(1 / b.value);
    const of = fn === 'sec' ? t`${math`\cos`}` : fn === 'csc' ? t`${math`\sin`}` : t`${math`\tan`}`;
    const k = Number(q(deg, 180).num);
    const m = Number(q(deg, 180).den);
    const angle = computedTex(m === 1 ? `${k === 1 ? '' : k}\\pi` : `\\frac{${k === 1 ? '' : k}\\pi}{${m}}`);
    return {
      prompt: t`Find the exact value of ${math`${fnTex(fn)} ${angle}`}. Write square roots as sqrt.`,
      answer: { kind: 'expression', expected: v.expr, variables: [] },
      solution: [
        t`${math`${fnTex(fn)}`} is the reciprocal of ${of}. ${fn === 'cot' ? t`${math`\tan ${angle} = ${computedTex(recipOf(b.value).tex)}`}` : t`${math`${fnTex(fn === 'sec' ? 'cos' : 'sin')} ${angle} = ${computedTex(b.tex)}`}`}, from the reference angle and the sign in that quadrant.`,
        t`So ${math`${fnTex(fn)} ${angle} = ${computedTex(v.tex)}`}.`,
      ],
    };
  },
  solve: ({ fn, deg }) => {
    const x = rad(deg);
    const v = fn === 'sec' ? 1 / Math.cos(x) : fn === 'csc' ? 1 / Math.sin(x) : Math.cos(x) / Math.sin(x);
    return recipOf(1 / (1 / v)).expr;
  },
  misconceptions: ({ fn, deg }): Misconception[] => {
    const b = base(fn, deg);
    const v = recipOf(1 / b.value);
    const out: Misconception[] = [];
    if (fn !== 'cot') out.push({ response: b.expr, why: t`That is ${math`${fnTex(fn === 'sec' ? 'cos' : 'sin')}`} itself. ${math`${fnTex(fn)}`} is one over it.` });
    else {
      out.push({ response: recipOf(b.value).expr, why: t`That is the tangent. Cotangent is one over the tangent.` });
      out.push({ response: cosDeg(deg).expr, why: t`That is the cosine alone. Cotangent is cosine divided by sine.` });
    }
    out.push({ response: v.expr.startsWith('-') ? v.expr.slice(1) : `-${v.expr}`, why: t`The sign is wrong: a reciprocal has the same sign as the function it comes from.` });
    const other = fn === 'sec' ? recipOf(1 / sinDeg(deg).value) : fn === 'csc' ? recipOf(1 / cosDeg(deg).value) : null;
    if (other !== null) out.push({ response: other.expr, why: fn === 'sec' ? t`That is the cosecant. Secant goes with cosine: ${math`\sec\theta = \frac{${1}}{\cos\theta}`}.` : t`That is the secant. Cosecant goes with sine: ${math`\csc\theta = \frac{${1}}{\sin\theta}`}.` });
    return out;
  },
});

// ---------------------------------------------------------------- the Pythagorean identities

interface IdP { i: number; swap: boolean; obtuse: boolean; kind: 'sec' | 'csc' }

const identity = generator<IdP>({
  id: 'pythagorean-reciprocal',
  skill: 'Use sec^2 = 1 + tan^2 or cosec^2 = 1 + cot^2 to find one function from another, choosing the sign from the quadrant.',
  params: (rng) => ({ i: int(rng, 0, 5), swap: rng() < 0.5, obtuse: rng() < 0.5, kind: pick(rng, ['sec', 'csc'] as const) }),
  sane: () => null,
  problem: (p) => {
    const [x, y, c] = TRIPLES[p.i] as readonly [number, number, number];
    const [a, b] = p.swap ? [y, x] : [x, y];
    // Acute: tan = a/b, sec = c/b, cot = b/a, csc = c/a. Obtuse (second quadrant): tan, cot, sec negative; csc positive.
    const given = p.kind === 'sec' ? q(p.obtuse ? -a : a, b) : q(p.obtuse ? -b : b, a);
    const ans = p.kind === 'sec' ? q(p.obtuse ? -c : c, b) : q(c, a);
    const gName = p.kind === 'sec' ? 'tan' : 'cot';
    const sq = p.kind === 'sec' ? q(c * c, b * b) : q(c * c, a * a);
    return {
      prompt: t`The angle ${mth} lies in ${p.obtuse ? t`${math`\frac{\pi}{${2}} < \theta < \pi`}` : t`${math`${0} < \theta < \frac{\pi}{${2}}`}`}, and ${math`${fnTex(gName)}\theta = ${given}`}. Find ${math`${fnTex(p.kind)}\theta`} exactly.`,
      answer: { kind: 'exact', expected: str(ans) },
      solution: [
        p.kind === 'sec'
          ? t`${math`\sec^{${2}}\theta = ${1} + \tan^{${2}}\theta = ${1} + ${q(a * a, b * b)} = ${sq}`}, so ${math`\sec\theta = \pm ${q(c, b)}`}.`
          : t`${math`\csc^{${2}}\theta = ${1} + \cot^{${2}}\theta = ${1} + ${q(b * b, a * a)} = ${sq}`}, so ${math`\csc\theta = \pm ${q(c, a)}`}.`,
        p.kind === 'sec'
          ? (p.obtuse ? t`In the second quadrant the cosine is negative, so its reciprocal ${math`\sec\theta`} is negative: ${math`${ans}`}.` : t`For an acute angle the cosine is positive, so ${math`\sec\theta = ${ans}`}.`)
          : t`For ${math`${0} < \theta < \pi`} the sine is positive, so ${math`\csc\theta = ${ans}`}.`,
      ],
    };
  },
  solve: (p) => {
    // Through the angle: find theta in its range from the given value, then evaluate.
    const [x, y, c] = TRIPLES[p.i] as readonly [number, number, number];
    const [a, b] = p.swap ? [y, x] : [x, y];
    const acute = p.kind === 'sec' ? Math.atan(a / b) : Math.atan(a / b);
    const th = p.obtuse ? Math.PI - acute : acute;
    const v = p.kind === 'sec' ? 1 / Math.cos(th) : 1 / Math.sin(th);
    const den = p.kind === 'sec' ? b : a;
    void c;
    return str(q(Math.round(v * den), den));
  },
  misconceptions: (p): Misconception[] => {
    const [x, y, c] = TRIPLES[p.i] as readonly [number, number, number];
    const [a, b] = p.swap ? [y, x] : [x, y];
    const out: Misconception[] = [];
    if (p.kind === 'sec') {
      out.push({ response: str(q(p.obtuse ? c : -c, b)), why: p.obtuse ? t`In the second quadrant the cosine, and so the secant, is negative.` : t`For an acute angle the secant is positive.` });
      out.push({ response: str(q(c * c, b * b)), why: t`That is ${math`\sec^{${2}}\theta`}. Take the square root, with the right sign.` });
      out.push({ response: str(q((p.obtuse ? -1 : 1) * (a + b), b)), why: t`The identity is about squares: ${math`\sec^{${2}}\theta = ${1} + \tan^{${2}}\theta`}, not ${math`\sec\theta = ${1} + \tan\theta`}.` });
    } else {
      out.push({ response: str(q(-c, a)), why: t`For ${math`${0} < \theta < \pi`} the sine is positive, so the cosecant is positive.` });
      out.push({ response: str(q(c * c, a * a)), why: t`That is ${math`\csc^{${2}}\theta`}. Take the square root.` });
      out.push({ response: str(q(c, b)), why: t`That is the secant. With ${math`\cot\theta`} given, use ${math`\csc^{${2}}\theta = ${1} + \cot^{${2}}\theta`}.` });
    }
    return out;
  },
});

// ---------------------------------------------------------------- solving sec x = c

interface SolP { fn: 'sec' | 'csc'; v: 0 | 1 | 2; neg: boolean }
const SVALS = [{ tex: '2', c: 0.5 }, { tex: '\\sqrt{2}', c: Math.SQRT2 / 2 }, { tex: '\\frac{2}{\\sqrt{3}}', c: Math.sqrt(3) / 2 }] as const;

const solsOf = ({ fn, v, neg }: SolP): number[] => {
  const target = (neg ? -1 : 1) * (SVALS[v] as (typeof SVALS)[number]).c;
  const out: number[] = [];
  for (let d = 0; d < 360; d += 15) {
    const x = fn === 'sec' ? Math.cos(rad(d)) : Math.sin(rad(d));
    if (Math.abs(x - target) < 1e-12) out.push(d);
  }
  return out;
};
const ksOf = (ds: readonly number[]): Rational[] => ds.map((d) => q(d, 180));

const solveRecip = generator<SolP>({
  id: 'solve-reciprocal',
  skill: 'Solve sec x = c or cosec x = c on [0, 2 pi) by turning it into cos x = 1/c or sin x = 1/c.',
  params: (rng) => ({ fn: pick(rng, ['sec', 'csc'] as const), v: pick(rng, [0, 1, 2] as const), neg: rng() < 0.5 }),
  sane: (p) => (solsOf(p).length === 2 ? null : 'not two solutions'),
  problem: (p) => {
    const ds = solsOf(p);
    const S = SVALS[p.v] as (typeof SVALS)[number];
    return {
      prompt: t`Solve ${math`${fnTex(p.fn)} x = ${computedTex(`${p.neg ? '-' : ''}${S.tex}`)}`} for ${math`${0} \le x < ${2}\pi`}. Write each solution as ${math`x = k\pi`} and give the values of ${math`k`}.`,
      answer: {
        kind: 'witness', count: 2, unordered: true, example: ksOf(ds).map(str).join(', '),
        check: (v) => (valuesKey(v) === valuesKey(ksOf(ds)) ? null : 'Turn it into an equation for cos x or sin x first.'),
      },
      solution: [
        t`Take reciprocals: ${math`${fnTex(p.fn === 'sec' ? 'cos' : 'sin')} x = ${computedTex(`${p.neg ? '-' : ''}${p.v === 0 ? '\\frac{1}{2}' : p.v === 1 ? '\\frac{\\sqrt{2}}{2}' : '\\frac{\\sqrt{3}}{2}'}`)}`}.`,
        t`From the unit circle, the solutions in ${math`[${0}, ${2}\pi)`} are ${math`k = ${ksOf(ds)[0] as Rational}`} and ${math`k = ${ksOf(ds)[1] as Rational}`}.`,
      ],
    };
  },
  solve: (p) => ksOf(solsOf(p)).map(str).join(', '),
  misconceptions: (p): Misconception[] => {
    const other = solsOf({ ...p, fn: p.fn === 'sec' ? 'csc' : 'sec' });
    const flip = solsOf({ ...p, neg: !p.neg });
    return [
      { response: ksOf(other).map(str).join(', '), why: p.fn === 'sec' ? t`Those solve the cosecant equation. Secant is one over cosine.` : t`Those solve the secant equation. Cosecant is one over sine.` },
      { response: ksOf(flip).map(str).join(', '), why: t`The sign is wrong: the reciprocal has the same sign as the original value.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

const a24a = auto({
  id: 'a24-q2-ii-a',
  source: cite('step-f24', 'Q2(ii)(a)'),
  title: t`${math`\csc\frac{\pi}{${4}}`}`,
  prompt: t`The function cosec is defined, for ${math`\theta \neq n\pi`}, by ${math`\csc\theta = \frac{${1}}{\sin\theta}`}. Find the value of ${math`\csc\frac{\pi}{${4}}`}. Write square roots as sqrt.`,
  answer: { kind: 'expression', expected: 'sqrt(2)', variables: [] },
  solution: [t`${math`\sin\frac{\pi}{${4}} = \frac{${1}}{\sqrt{${2}}}`}.`, t`So ${math`\csc\frac{\pi}{${4}} = \sqrt{${2}}`}.`],
  reference: 'sqrt(2)',
  verify: () => (far(1 / Math.sin(Math.PI / 4), Math.SQRT2) ? 'cosec pi/4' : null),
  misconceptions: [{ response: 'sqrt(2)/2', why: t`That is ${math`\sin\frac{\pi}{${4}}`}; cosec is its reciprocal.` }],
  official: { source: cite('step-f24-hints', 'Q2(ii)'), answer: 'sqrt(2)', agrees: true },
});

const a24b = auto({
  id: 'a24-q2-ii-b',
  source: cite('step-f24', 'Q2(ii)(b)'),
  title: t`${math`\csc\frac{${5}\pi}{${6}}`}`,
  prompt: t`Find the value of ${math`\csc\frac{${5}\pi}{${6}}`}.`,
  answer: { kind: 'exact', expected: '2' },
  solution: [t`${math`\frac{${5}\pi}{${6}} = \pi - \frac{\pi}{${6}}`}, and ${math`\sin(\pi - x) = \sin x`}, so ${math`\sin\frac{${5}\pi}{${6}} = \frac{${1}}{${2}}`}.`, t`So ${math`\csc\frac{${5}\pi}{${6}} = ${2}`}.`],
  reference: '2',
  verify: () => (far(1 / Math.sin((5 * Math.PI) / 6), 2) ? 'cosec 5pi/6' : null),
  misconceptions: [{ response: '-2', why: t`${math`\frac{${5}\pi}{${6}}`} is in the second quadrant, where sine is positive.` }],
  official: { source: cite('step-f24-hints', 'Q2(ii)'), answer: '2', agrees: true },
});

const a25iii = supervision({
  id: 'a25-q2-iii',
  source: cite('step-f25', 'Q2(iii)'),
  title: t`Tangent and secant`,
  prompt: t`By starting with ${math`\sin^{${2}}\theta + \cos^{${2}}\theta = ${1}`}, find a relationship between ${math`\tan\theta`} and ${math`\sec\theta`}, where ${math`\sec\theta = \frac{${1}}{\cos\theta}`}. State for which ${mth} it holds, and find the corresponding relationship between ${math`\cot\theta`} and ${math`\csc\theta`}.`,
  writeUp: 'proof',
  official: cite('step-f25-hints', 'Q2(iii)'),
});

const t2 = supervision({
  id: 'nst-t2',
  source: cite('nst-workbook', 'T2'),
  title: t`An identity with cot and cosec`,
  prompt: t`Prove that ${math`\frac{\cot^{${2}} x + \sin^{${2}} x}{\cos x + \csc x} = \csc x - \cos x`} for every ${math`x`} where both sides are defined.`,
  writeUp: 'proof',
});

const t3 = auto({
  id: 'nst-t3-iii',
  source: cite('nst-workbook', 'T3(iii)'),
  title: t`${math`\cot\frac{\pi}{${12}}`}`,
  prompt: t`By writing ${math`\frac{\pi}{${12}} = \frac{\pi}{${3}} - \frac{\pi}{${4}}`}, evaluate ${math`\cot\frac{\pi}{${12}}`} exactly. Write square roots as sqrt.`,
  answer: { kind: 'expression', expected: '2 + sqrt(3)', variables: [] },
  solution: [
    t`${math`\tan\frac{\pi}{${12}} = \frac{\tan\frac{\pi}{${3}} - \tan\frac{\pi}{${4}}}{${1} + \tan\frac{\pi}{${3}}\tan\frac{\pi}{${4}}} = \frac{\sqrt{${3}} - ${1}}{${1} + \sqrt{${3}}}`}.`,
    t`So ${math`\cot\frac{\pi}{${12}} = \frac{\sqrt{${3}} + ${1}}{\sqrt{${3}} - ${1}}`}. Multiply top and bottom by ${math`\sqrt{${3}} + ${1}`}: ${math`\frac{(\sqrt{${3}} + ${1})^{${2}}}{${3} - ${1}} = \frac{${4} + ${2}\sqrt{${3}}}{${2}} = ${2} + \sqrt{${3}}`}.`,
  ],
  reference: '2 + sqrt(3)',
  verify: () => (far(1 / Math.tan(Math.PI / 12), 2 + Math.sqrt(3)) ? 'cot pi/12' : null),
  misconceptions: [{ response: '2 - sqrt(3)', why: t`That is ${math`\tan\frac{\pi}{${12}}`}; the cotangent is its reciprocal.` }],
});

// ---------------------------------------------------------------- lesson

export const reciprocalFunctions: TopicContent = {
  topicId: 'trig.reciprocal-functions',
  goal: t`Define ${math`\sec`}, ${math`\csc`}, and ${math`\cot`}, find their exact values, and use ${math`\sec^{${2}}\theta = ${1} + \tan^{${2}}\theta`}.`,
  objective: t`Use secant, cosecant, and cotangent, their exact values, and their Pythagorean identities.`,
  why: t`They shorten formulas everywhere in calculus: the derivative of tan is sec squared.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`Three more names` },
    { kind: 'hook', text: t`Divide ${math`\sin^{${2}}\theta + \cos^{${2}}\theta = ${1}`} by ${math`\cos^{${2}}\theta`} and you get ${math`\tan^{${2}}\theta + ${1} = \frac{${1}}{\cos^{${2}}\theta}`}. That last fraction turns up so often, in identities, in derivatives, in integrals, that it has its own name. So do its two cousins.` },
    { kind: 'definition', name: t`Secant, cosecant, cotangent`, formal: t`The [[reciprocal-trig|reciprocal trigonometric functions]] are ${math`\sec\theta = \frac{${1}}{\cos\theta}`} where ${math`\cos\theta \neq ${0}`}; ${math`\csc\theta = \frac{${1}}{\sin\theta}`} where ${math`\sin\theta \neq ${0}`}; and ${math`\cot\theta = \frac{\cos\theta}{\sin\theta}`} where ${math`\sin\theta \neq ${0}`}.`, plain: t`One over cosine, one over sine, and one over tangent (where the tangent is defined and not ${0}). Cosecant is often written cosec. At ${math`\frac{\pi}{${3}}`}: ${math`\cos\frac{\pi}{${3}} = \frac{${1}}{${2}}`}, so ${math`\sec\frac{\pi}{${3}} = ${2}`}.` },
    { kind: 'p', text: t`A memory aid: the first letters swap. Sec, starting with s, goes with cos; cosec, starting with c, goes with sin. Each has the same sign as its partner, and is undefined where the partner is ${0}.` },
    checkFrom(exactRecip, { fn: 'sec', deg: 135 }, t`${math`\cos\frac{${3}\pi}{${4}} = -\frac{\sqrt{${2}}}{${2}}`}, and its reciprocal is ${math`-\sqrt{${2}}`}.`),
    { kind: 'section', title: t`The Pythagorean identities` },
    { kind: 'theorem', name: t`Pythagorean identities`, statement: t`For every ${mth} with ${math`\cos\theta \neq ${0}`}, ${math`\sec^{${2}}\theta = ${1} + \tan^{${2}}\theta`}. For every ${mth} with ${math`\sin\theta \neq ${0}`}, ${math`\csc^{${2}}\theta = ${1} + \cot^{${2}}\theta`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Start from the circle`, text: t`For every ${mth}, ${math`\sin^{${2}}\theta + \cos^{${2}}\theta = ${1}`}.` },
        { label: t`Divide by cosine squared`, text: t`If ${math`\cos\theta \neq ${0}`}, divide by ${math`\cos^{${2}}\theta`}:`, eq: [dmath`\frac{\sin^{${2}}\theta}{\cos^{${2}}\theta} + ${1} = \frac{${1}}{\cos^{${2}}\theta}, \quad \text{that is} \quad \tan^{${2}}\theta + ${1} = \sec^{${2}}\theta.`] },
        { label: t`Divide by sine squared`, text: t`If ${math`\sin\theta \neq ${0}`}, divide by ${math`\sin^{${2}}\theta`} instead: ${math`${1} + \cot^{${2}}\theta = \csc^{${2}}\theta`}.` },
      ],
    },
    { kind: 'narrative', text: t`The identities give squares, so they find a value only up to sign. The sign comes from the quadrant: knowing ${math`\tan\theta = -\frac{${3}}{${4}}`} with ${mth} between ${math`\frac{\pi}{${2}}`} and ${math`\pi`}, the identity gives ${math`\sec^{${2}}\theta = \frac{${25}}{${16}}`}, and the cosine is negative there, so ${math`\sec\theta = -\frac{${5}}{${4}}`}.` },
    checkFrom(identity, { i: 1, swap: false, obtuse: false, kind: 'sec' }, t`${math`\sec^{${2}}\theta = ${1} + \frac{${25}}{${144}} = \frac{${169}}{${144}}`}, and the angle is acute, so the secant is positive.`),
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`${math`\sec\theta`} is the inverse function of ${math`\cos`}, written ${math`\cos^{-${1}}`}.`, counterexample: t`${math`\cos^{-${1}}`} undoes cosine: ${math`\cos^{-${1}}\left(\frac{${1}}{${2}}\right) = \frac{\pi}{${3}}`}. But ${math`\sec\frac{${1}}{${2}} = \frac{${1}}{\cos\frac{${1}}{${2}}}`}, about ${Number((1 / Math.cos(0.5)).toFixed(3))}. A reciprocal is not an inverse.` },
    { kind: 'pitfall', claim: t`${math`\sec\theta = \sqrt{${1} + \tan^{${2}}\theta}`}.`, counterexample: t`At ${math`\theta = \pi`}, ${math`\tan\pi = ${0}`}, so the right side is ${1}; but ${math`\sec\pi = \frac{${1}}{\cos\pi} = -${1}`}. The square root loses the sign.` },
    { kind: 'takeaway', text: t`Secant, cosecant, and cotangent are reciprocals of cosine, sine, and tangent; dividing ${math`\sin^{${2}} + \cos^{${2}} = ${1}`} gives their identities, with the sign from the quadrant.` },
  ],
  examples: [
    workedCambridge(a24a),
    worked(identity, { i: 0, swap: true, obtuse: true, kind: 'sec' }, t`A secant in the second quadrant`),
    worked(solveRecip, { fn: 'csc', v: 0, neg: true }, t`Solving a cosecant equation`),
  ],
  generators: [exactRecip, identity, solveRecip],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['reciprocal-trig'],
  cambridge: withUses([a25iii, t3, t2, a24b], {
    'nst-t2': { sections: ['Three more names', 'The Pythagorean identities'], note: t`Proving an identity with cosecant and cotangent` },
    'nst-t3-iii': { sections: ['Three more names'], note: t`An exact cotangent from a difference of angles` },
  }),
  gate: ['nst-t2', 'nst-t3-iii'],
  recall: [
    { front: t`Define ${math`\sec`}, ${math`\csc`}, and ${math`\cot`}.`, back: t`${math`\frac{${1}}{\cos}`}, ${math`\frac{${1}}{\sin}`}, and ${math`\frac{\cos}{\sin}`}.` },
    { front: t`State the identities for ${math`\sec^{${2}}`} and ${math`\csc^{${2}}`}.`, back: t`${math`\sec^{${2}}\theta = ${1} + \tan^{${2}}\theta`}; ${math`\csc^{${2}}\theta = ${1} + \cot^{${2}}\theta`}.` },
  ],
  proofOrder: [
    {
      title: t`${math`\sec^{${2}}\theta = ${1} + \tan^{${2}}\theta`}`,
      steps: [
        t`Start from ${math`\sin^{${2}}\theta + \cos^{${2}}\theta = ${1}`}.`,
        t`Assume ${math`\cos\theta \neq ${0}`} and divide every term by ${math`\cos^{${2}}\theta`}.`,
        t`Recognise ${math`\frac{\sin^{${2}}}{\cos^{${2}}}`} as ${math`\tan^{${2}}`} and ${math`\frac{${1}}{\cos^{${2}}}`} as ${math`\sec^{${2}}`}.`,
      ],
    },
  ],
};
