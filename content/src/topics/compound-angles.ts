/**
 * trig.compound-angles: sin(A + B) = sin A cos B + cos A sin B proved from a triangle (two
 * ways of writing its area, the idea of STEP Support Foundation Assignment 10 Q1(i), which
 * uses the sine rule on the same figure), the other compound angle formulae derived from it,
 * and exact values such as sin 75. Problems: Assignment 10 Q1(i), (ii); Assignment 16 Q2(i)
 * and Q3(i) (2015 STEP I Q2); Assignment 25 Q2(i) (tan(A - B)). Official answers are from
 * the hints.
 */
import { auto, cite, supervision } from '../cambridge';
import { TRIPLES } from '../geometry';
import { add, div, int, mul, pick, q, str, sub, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { computedTex, dmath, math, t } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';
import { far } from '../partv-a';

const [ma, mb] = [math`\alpha`, math`\beta`];
const fnTex = (f: string) => computedTex(`\\${f}`);
const r = (d: number): number => (d * Math.PI) / 180;

/** The exact forms that sin, cos, and tan take at odd multiples of 15 degrees, with their LaTeX. */
const FORMS: readonly { expr: string; tex: string }[] = [
  { expr: '(sqrt(6) + sqrt(2))/4', tex: '\\frac{\\sqrt{6} + \\sqrt{2}}{4}' },
  { expr: '(sqrt(6) - sqrt(2))/4', tex: '\\frac{\\sqrt{6} - \\sqrt{2}}{4}' },
  { expr: '-(sqrt(6) + sqrt(2))/4', tex: '-\\frac{\\sqrt{6} + \\sqrt{2}}{4}' },
  { expr: '(sqrt(2) - sqrt(6))/4', tex: '\\frac{\\sqrt{2} - \\sqrt{6}}{4}' },
  { expr: '2 + sqrt(3)', tex: '2 + \\sqrt{3}' },
  { expr: '2 - sqrt(3)', tex: '2 - \\sqrt{3}' },
  { expr: '-2 - sqrt(3)', tex: '-2 - \\sqrt{3}' },
  { expr: 'sqrt(3) - 2', tex: '\\sqrt{3} - 2' },
];
const formVal = (e: string): number => {
  const s6 = Math.sqrt(6);
  const s2 = Math.SQRT2;
  const s3 = Math.sqrt(3);
  return ({ '(sqrt(6) + sqrt(2))/4': (s6 + s2) / 4, '(sqrt(6) - sqrt(2))/4': (s6 - s2) / 4, '-(sqrt(6) + sqrt(2))/4': -(s6 + s2) / 4, '(sqrt(2) - sqrt(6))/4': (s2 - s6) / 4, '2 + sqrt(3)': 2 + s3, '2 - sqrt(3)': 2 - s3, '-2 - sqrt(3)': -2 - s3, 'sqrt(3) - 2': s3 - 2 } as Record<string, number>)[e] as number;
};
const formOf = (x: number) => FORMS.find((f) => Math.abs(formVal(f.expr) - x) < 1e-12) as { expr: string; tex: string };
const trig = (fn: string, d: number): number => (fn === 'sin' ? Math.sin(r(d)) : fn === 'cos' ? Math.cos(r(d)) : Math.tan(r(d)));

/** Exact values at the special angles, as LaTeX, for the worked steps. */
const SPECIAL: Readonly<Record<number, { s: string; c: string }>> = {
  30: { s: '\\frac{1}{2}', c: '\\frac{\\sqrt{3}}{2}' },
  45: { s: '\\frac{\\sqrt{2}}{2}', c: '\\frac{\\sqrt{2}}{2}' },
  60: { s: '\\frac{\\sqrt{3}}{2}', c: '\\frac{1}{2}' },
};

// ---------------------------------------------------------------- exact values at multiples of 15 degrees

interface ExP { fn: 'sin' | 'cos'; a: 30 | 45 | 60; b: 30 | 45 | 60; plus: boolean }

const angleOf = ({ a, b, plus }: ExP): number => (plus ? a + b : a - b);

const exactCompound = generator<ExP>({
  id: 'exact-compound',
  skill: 'Find an exact value such as sin 75 or cos 105 by writing the angle as a sum or difference of 30, 45, and 60 degrees.',
  params: (rng) => {
    for (;;) {
      const p: ExP = { fn: pick(rng, ['sin', 'cos'] as const), a: pick(rng, [30, 45, 60] as const), b: pick(rng, [30, 45, 60] as const), plus: rng() < 0.6 };
      const d = angleOf(p);
      if (d > 0 && d % 30 !== 0) return p;
    }
  },
  sane: (p) => (angleOf(p) % 15 === 0 && angleOf(p) % 30 !== 0 ? null : 'not an odd multiple of 15'),
  problem: (p) => {
    const d = angleOf(p);
    const v = formOf(trig(p.fn, d));
    const A = SPECIAL[p.a] as { s: string; c: string };
    const B = SPECIAL[p.b] as { s: string; c: string };
    const sign = p.plus ? '+' : '-';
    const line = p.fn === 'sin'
      ? computedTex(`\\sin ${d}^\\circ = \\sin ${p.a}^\\circ \\cos ${p.b}^\\circ ${sign} \\cos ${p.a}^\\circ \\sin ${p.b}^\\circ = ${A.s} \\cdot ${B.c} ${sign} ${A.c} \\cdot ${B.s}`)
      : computedTex(`\\cos ${d}^\\circ = \\cos ${p.a}^\\circ \\cos ${p.b}^\\circ ${p.plus ? '-' : '+'} \\sin ${p.a}^\\circ \\sin ${p.b}^\\circ = ${A.c} \\cdot ${B.c} ${p.plus ? '-' : '+'} ${A.s} \\cdot ${B.s}`);
    return {
      prompt: t`Find the exact value of ${math`${fnTex(p.fn)} ${d}^\circ`}, by writing ${math`${d}^\circ = ${p.a}^\circ ${p.plus ? '+' : '-'} ${p.b}^\circ`}. Write square roots as sqrt.`,
      answer: { kind: 'expression', expected: v.expr, variables: [] },
      solution: [
        p.fn === 'sin' ? t`Use ${math`\sin(\alpha ${p.plus ? '+' : '-'} \beta) = \sin\alpha\cos\beta ${p.plus ? '+' : '-'} \cos\alpha\sin\beta`}.` : t`Use ${math`\cos(\alpha ${p.plus ? '+' : '-'} \beta) = \cos\alpha\cos\beta ${p.plus ? '-' : '+'} \sin\alpha\sin\beta`}: the sign flips for cosine.`,
        t`${line}.`,
        t`Multiply out, using ${math`\sqrt{${2}}\sqrt{${3}} = \sqrt{${6}}`}: the value is ${computedTex(v.tex)}.`,
      ],
    };
  },
  solve: (p) => formOf(trig(p.fn, angleOf(p))).expr,
  misconceptions: (p): Misconception[] => {
    const d = angleOf(p);
    const out: Misconception[] = [];
    const sumOfParts = p.plus ? trig(p.fn, p.a) + trig(p.fn, p.b) : trig(p.fn, p.a) - trig(p.fn, p.b);
    out.push({ response: String(Number(sumOfParts.toFixed(12))), why: t`${math`${fnTex(p.fn)}(\alpha ${p.plus ? '+' : '-'} \beta)`} is not ${math`${fnTex(p.fn)}\alpha ${p.plus ? '+' : '-'} ${fnTex(p.fn)}\beta`}: use the compound angle formula.` });
    const other = formOf(trig(p.fn === 'sin' ? 'cos' : 'sin', d));
    if (Math.abs(formVal(other.expr) - trig(p.fn, d)) > 1e-9) out.push({ response: other.expr, why: p.fn === 'sin' ? t`That is ${math`\cos ${d}^\circ`}. In ${math`\sin(\alpha \pm \beta)`} each term has one sine and one cosine, with the sine of ${ma} first.` : t`That is ${math`\sin ${d}^\circ`}. For cosine, multiply the two cosines and the two sines.` });
    const wrongSign = p.fn === 'sin'
      ? (p.plus ? trig('sin', p.a) * trig('cos', p.b) - trig('cos', p.a) * trig('sin', p.b) : trig('sin', p.a) * trig('cos', p.b) + trig('cos', p.a) * trig('sin', p.b))
      : (p.plus ? trig('cos', p.a) * trig('cos', p.b) + trig('sin', p.a) * trig('sin', p.b) : trig('cos', p.a) * trig('cos', p.b) - trig('sin', p.a) * trig('sin', p.b));
    const ws = FORMS.find((f) => Math.abs(formVal(f.expr) - wrongSign) < 1e-12);
    if (ws !== undefined && Math.abs(wrongSign - trig(p.fn, d)) > 1e-9) out.push({ response: ws.expr, why: p.fn === 'cos' ? t`The sign is wrong: ${math`\cos(\alpha + \beta) = \cos\alpha\cos\beta - \sin\alpha\sin\beta`}, with a minus for a sum.` : t`The sign in the middle matches the sign in the angle for sine: plus for a sum, minus for a difference.` });
    return out;
  },
});

// ---------------------------------------------------------------- from given ratios

interface RatP { i: number; j: number; fn: 'sin' | 'cos'; plus: boolean }

const ratios = (i: number): [Rational, Rational] => {
  const [a, b, c] = TRIPLES[i] as readonly [number, number, number];
  return [q(a, c), q(b, c)];
};
const compoundOf = ({ i, j, fn, plus }: RatP): Rational => {
  const [sA, cA] = ratios(i);
  const [sB, cB] = ratios(j);
  if (fn === 'sin') return plus ? add(mul(sA, cB), mul(cA, sB)) : sub(mul(sA, cB), mul(cA, sB));
  return plus ? sub(mul(cA, cB), mul(sA, sB)) : add(mul(cA, cB), mul(sA, sB));
};

const fromRatios = generator<RatP>({
  id: 'compound-from-ratios',
  skill: 'Given sin A and sin B for acute angles, find cos A and cos B from Pythagoras, then sin or cos of A plus or minus B exactly.',
  params: (rng) => ({ i: int(rng, 0, 3), j: int(rng, 0, 3), fn: pick(rng, ['sin', 'cos'] as const), plus: rng() < 0.5 }),
  sane: () => null,
  problem: (p) => {
    const [sA, cA] = ratios(p.i);
    const [sB, cB] = ratios(p.j);
    const ans = compoundOf(p);
    const op = p.plus ? '+' : '-';
    return {
      prompt: t`The angles ${math`A`} and ${math`B`} are acute, with ${math`\sin A = ${sA}`} and ${math`\sin B = ${sB}`}. Find ${math`${fnTex(p.fn)}(A ${op} B)`} exactly.`,
      answer: { kind: 'exact', expected: str(ans) },
      solution: [
        t`For acute angles the cosines are positive: ${math`\cos A = \sqrt{${1} - \left(${sA}\right)^{${2}}} = ${cA}`} and ${math`\cos B = ${cB}`}.`,
        p.fn === 'sin'
          ? t`${math`\sin(A ${op} B) = \sin A\cos B ${op} \cos A\sin B = ${sA} \cdot ${cB} ${op} ${cA} \cdot ${sB} = ${ans}`}.`
          : t`${math`\cos(A ${op} B) = \cos A\cos B ${p.plus ? '-' : '+'} \sin A\sin B = ${cA} \cdot ${cB} ${p.plus ? '-' : '+'} ${sA} \cdot ${sB} = ${ans}`}.`,
      ],
    };
  },
  solve: (p) => {
    // Numerically from the angles themselves, then the nearest fraction with the right denominator.
    const [sA] = ratios(p.i);
    const [sB] = ratios(p.j);
    const A = Math.asin(Number(sA.num) / Number(sA.den));
    const B = Math.asin(Number(sB.num) / Number(sB.den));
    const x = p.plus ? A + B : A - B;
    const v = p.fn === 'sin' ? Math.sin(x) : Math.cos(x);
    const den = Number(sA.den) * Number(sB.den);
    return str(q(Math.round(v * den), den));
  },
  misconceptions: (p): Misconception[] => {
    const [sA, cA] = ratios(p.i);
    const [sB, cB] = ratios(p.j);
    const flip = compoundOf({ ...p, plus: !p.plus });
    const out: Misconception[] = [
      { response: str(flip), why: p.fn === 'sin' ? t`The sign between the terms should match the sign in ${math`A ${p.plus ? '+' : '-'} B`}.` : t`For cosine the sign flips: ${math`\cos(A + B)`} has a minus, ${math`\cos(A - B)`} a plus.` },
      { response: str(p.fn === 'sin' ? (p.plus ? add(sA, sB) : sub(sA, sB)) : (p.plus ? add(cA, cB) : sub(cA, cB))), why: t`Sine and cosine do not add over angles: use the compound angle formula.` },
    ];
    if (p.fn === 'sin') out.push({ response: str(mul(sA, cB)), why: t`That is only the first term, ${math`\sin A \cos B`}. Add or subtract ${math`\cos A \sin B`}.` });
    else out.push({ response: str(mul(cA, cB)), why: t`That is only the first term, ${math`\cos A \cos B`}. The term ${math`\sin A \sin B`} is needed too.` });
    return out;
  },
});

// ---------------------------------------------------------------- tan of a sum

interface TanP { a: Rational; b: Rational; plus: boolean }

const tanOf = ({ a, b, plus }: TanP): Rational => (plus ? div(add(a, b), sub(q(1), mul(a, b))) : div(sub(a, b), add(q(1), mul(a, b))));

const tanSum = generator<TanP>({
  id: 'tan-sum',
  skill: 'Use tan(A + B) = (tan A + tan B)/(1 - tan A tan B) and tan(A - B) = (tan A - tan B)/(1 + tan A tan B).',
  quick: true,
  params: (rng) => {
    for (;;) {
      const a = q(int(rng, 1, 5) * pick(rng, [1, -1]), int(rng, 1, 4));
      const b = q(int(rng, 1, 5) * pick(rng, [1, -1]), int(rng, 1, 4));
      const plus = rng() < 0.6;
      const den = plus ? sub(q(1), mul(a, b)) : add(q(1), mul(a, b));
      const top = plus ? add(a, b) : sub(a, b);
      if (den.num !== 0n && top.num !== 0n && str(a) !== str(b)) return { a, b, plus };
    }
  },
  sane: (p) => ((p.plus ? sub(q(1), mul(p.a, p.b)) : add(q(1), mul(p.a, p.b))).num !== 0n ? null : 'undefined'),
  problem: (p) => {
    const ans = tanOf(p);
    const op = p.plus ? '+' : '-';
    const top = p.plus ? add(p.a, p.b) : sub(p.a, p.b);
    const bot = p.plus ? sub(q(1), mul(p.a, p.b)) : add(q(1), mul(p.a, p.b));
    return {
      prompt: t`Given ${math`\tan A = ${p.a}`} and ${math`\tan B = ${p.b}`}, find ${math`\tan(A ${op} B)`} exactly.`,
      answer: { kind: 'exact', expected: str(ans) },
      solution: [
        t`${math`\tan(A ${op} B) = \frac{\tan A ${op} \tan B}{${1} ${p.plus ? '-' : '+'} \tan A\tan B}`}.`,
        t`Top: ${math`${top}`}. Bottom: ${math`${1} ${p.plus ? '-' : '+'} (${p.a})(${p.b}) = ${bot}`}. So ${math`\tan(A ${op} B) = ${ans}`}.`,
      ],
    };
  },
  solve: (p) => {
    // Through the angles: arctan, add, tan, and recover the fraction with denominator at most 400.
    const v = Math.tan((p.plus ? 1 : -1) * Math.atan(Number(p.b.num) / Number(p.b.den)) + Math.atan(Number(p.a.num) / Number(p.a.den)));
    for (let d = 1; d <= 400; d++) {
      const n = Math.round(v * d);
      if (Math.abs(n / d - v) < 1e-9 * Math.max(1, Math.abs(v))) return str(q(n, d));
    }
    return 'none';
  },
  misconceptions: (p): Misconception[] => {
    const out: Misconception[] = [
      { response: str(p.plus ? add(p.a, p.b) : sub(p.a, p.b)), why: t`Tangent does not add over angles: divide by ${math`${1} ${p.plus ? '-' : '+'} \tan A \tan B`}.` },
    ];
    const wrong = p.plus ? add(q(1), mul(p.a, p.b)) : sub(q(1), mul(p.a, p.b));
    if (wrong.num !== 0n) out.push({ response: str(div(p.plus ? add(p.a, p.b) : sub(p.a, p.b), wrong)), why: t`The sign in the denominator is the opposite of the sign in the angle: ${math`${1} - \tan A\tan B`} for a sum, ${math`${1} + \tan A\tan B`} for a difference.` });
    const ans = tanOf(p);
    if (ans.num !== 0n) out.push({ response: str(div(q(1), ans)), why: t`That is the formula upside down: the sum or difference of the tangents goes on top.` });
    out.push({ response: str(mul(p.a, p.b)), why: t`The product ${math`\tan A \tan B`} belongs in the denominator, beside the ${1}.` });
    return out;
  },
});

// ---------------------------------------------------------------- Cambridge problems

const a10sin75 = auto({
  id: 'a10-q1-ii-sin75',
  source: cite('step-f10', 'Q1(ii)'),
  title: t`The exact value of ${math`\sin ${75}^\circ`}`,
  prompt: t`Find the exact value of ${math`\sin ${75}^\circ`}. Write square roots as sqrt.`,
  answer: { kind: 'expression', expected: '(sqrt(6) + sqrt(2))/4', variables: [] },
  solution: [
    t`${math`${75}^\circ = ${45}^\circ + ${30}^\circ`}, so ${math`\sin ${75}^\circ = \sin ${45}^\circ\cos ${30}^\circ + \cos ${45}^\circ\sin ${30}^\circ`}.`,
    t`${math`= \frac{${1}}{\sqrt{${2}}} \cdot \frac{\sqrt{${3}}}{${2}} + \frac{${1}}{\sqrt{${2}}} \cdot \frac{${1}}{${2}} = \frac{\sqrt{${3}} + ${1}}{${2}\sqrt{${2}}}`}.`,
    t`Multiply top and bottom by ${math`\sqrt{${2}}`}: ${math`\frac{\sqrt{${6}} + \sqrt{${2}}}{${4}}`}. Both forms are right.`,
  ],
  reference: '(sqrt(6) + sqrt(2))/4',
  verify: () => (far(Math.sin(r(75)), (Math.sqrt(6) + Math.SQRT2) / 4) ? `sin 75 is ${Math.sin(r(75))}` : null),
  misconceptions: [{ response: '(sqrt(2) + 1)/2', why: t`That is ${math`\sin ${45}^\circ + \sin ${30}^\circ`}. Sine does not add over angles.` }],
  official: { source: cite('step-f10-hints', 'Q1(ii)'), answer: '(1 + sqrt(3))/(2 sqrt(2))', agrees: true },
});

const a10sin15 = auto({
  id: 'a10-q1-ii-sin15',
  source: cite('step-f10', 'Q1(ii)'),
  title: t`The exact value of ${math`\sin ${15}^\circ`}`,
  prompt: t`Find the exact value of ${math`\sin ${15}^\circ`}. Write square roots as sqrt.`,
  answer: { kind: 'expression', expected: '(sqrt(6) - sqrt(2))/4', variables: [] },
  solution: [
    t`${math`\sin ${15}^\circ = \sin(${45}^\circ - ${30}^\circ) = \sin ${45}^\circ\cos ${30}^\circ - \cos ${45}^\circ\sin ${30}^\circ`}.`,
    t`${math`= \frac{\sqrt{${3}} - ${1}}{${2}\sqrt{${2}}} = \frac{\sqrt{${6}} - \sqrt{${2}}}{${4}}`}.`,
  ],
  reference: '(sqrt(6) - sqrt(2))/4',
  verify: () => (far(Math.sin(r(15)), (Math.sqrt(6) - Math.SQRT2) / 4) ? `sin 15 is ${Math.sin(r(15))}` : null),
  misconceptions: [{ response: '(sqrt(6) + sqrt(2))/4', why: t`That is ${math`\sin ${75}^\circ`}. For ${math`${45}^\circ - ${30}^\circ`} the middle sign is a minus.` }],
});

const a16cos75 = auto({
  id: 'a16-q2-i',
  source: cite('step-f16', 'Q2(i)'),
  title: t`The exact value of ${math`\cos ${75}^\circ`}`,
  prompt: t`Use ${math`\cos(\alpha \pm \beta) = \cos\alpha\cos\beta \mp \sin\alpha\sin\beta`} to find the exact value of ${math`\cos ${75}^\circ`}. Write square roots as sqrt.`,
  answer: { kind: 'expression', expected: '(sqrt(6) - sqrt(2))/4', variables: [] },
  solution: [
    t`${math`\cos ${75}^\circ = \cos(${45}^\circ + ${30}^\circ) = \cos ${45}^\circ\cos ${30}^\circ - \sin ${45}^\circ\sin ${30}^\circ`}.`,
    t`${math`= \frac{\sqrt{${3}}}{${2}\sqrt{${2}}} - \frac{${1}}{${2}\sqrt{${2}}} = \frac{\sqrt{${3}} - ${1}}{${2}\sqrt{${2}}}`}.`,
  ],
  reference: '(sqrt(3) - 1)/(2 sqrt(2))',
  verify: () => (far(Math.cos(r(75)), (Math.sqrt(3) - 1) / (2 * Math.SQRT2)) ? 'cos 75' : null),
  misconceptions: [{ response: '(sqrt(3) + 1)/(2 sqrt(2))', why: t`For the cosine of a sum the sign is a minus: ${math`\cos\alpha\cos\beta - \sin\alpha\sin\beta`}.` }],
  official: { source: cite('step-f16-hints', 'Q2(i)'), answer: '(sqrt(3) - 1)/(2 sqrt(2))', agrees: true },
});

const a16q3 = auto({
  id: 'a16-q3-i',
  source: cite('step-f16', 'Q3(i)'),
  title: t`${2015} STEP I Q${2}: ${math`\cos ${15}^\circ`} and ${math`\sin ${15}^\circ`}`,
  prompt: t`Show that ${math`\cos ${15}^\circ = \frac{\sqrt{${3}} + ${1}}{${2}\sqrt{${2}}}`}, and find a similar expression for ${math`\sin ${15}^\circ`}. Enter ${math`\sin ${15}^\circ`}, writing square roots as sqrt.`,
  answer: { kind: 'expression', expected: '(sqrt(3) - 1)/(2 sqrt(2))', variables: [] },
  solution: [
    t`${math`\cos ${15}^\circ = \cos(${45}^\circ - ${30}^\circ) = \cos ${45}^\circ\cos ${30}^\circ + \sin ${45}^\circ\sin ${30}^\circ = \frac{\sqrt{${3}}}{${2}\sqrt{${2}}} + \frac{${1}}{${2}\sqrt{${2}}} = \frac{\sqrt{${3}} + ${1}}{${2}\sqrt{${2}}}`}.`,
    t`${math`\sin ${15}^\circ = \sin(${45}^\circ - ${30}^\circ) = \sin ${45}^\circ\cos ${30}^\circ - \cos ${45}^\circ\sin ${30}^\circ = \frac{\sqrt{${3}} - ${1}}{${2}\sqrt{${2}}}`}.`,
    t`Check: the squares add to ${math`\frac{(${4} + ${2}\sqrt{${3}}) + (${4} - ${2}\sqrt{${3}})}{${8}} = ${1}`}.`,
  ],
  reference: '(sqrt(3) - 1)/(2 sqrt(2))',
  verify: () => (far(Math.sin(r(15)), (Math.sqrt(3) - 1) / (2 * Math.SQRT2)) || far(Math.cos(r(15)), (Math.sqrt(3) + 1) / (2 * Math.SQRT2)) ? 'cos or sin 15' : null),
  misconceptions: [{ response: '(sqrt(3) + 1)/(2 sqrt(2))', why: t`That is ${math`\cos ${15}^\circ`}; the sine has ${math`\sqrt{${3}} - ${1}`} on top.` }],
  official: { source: cite('step-f16-hints', 'Q3(i)'), answer: '(sqrt(3) - 1)/(2 sqrt(2))', agrees: true },
});

const TDOM = { a: { kind: 'real' as const, min: -3, max: 3 }, b: { kind: 'real' as const, min: -3, max: 3 } };

const a25tan = auto({
  id: 'a25-q2-i',
  source: cite('step-f25', 'Q2(i)', true),
  title: t`${math`\tan(A - B)`} from the sine and cosine formulae`,
  prompt: t`Starting from ${math`\tan(A - B) = \frac{\sin(A - B)}{\cos(A - B)}`}, find ${math`\tan(A - B)`} in terms of ${math`\tan A`} and ${math`\tan B`}. Write ${math`a`} for ${math`\tan A`} and ${math`b`} for ${math`\tan B`}.`,
  answer: { kind: 'expression', expected: '(a - b)/(1 + a b)', variables: ['a', 'b'], domains: TDOM },
  solution: [
    t`${math`\tan(A - B) = \frac{\sin A\cos B - \cos A\sin B}{\cos A\cos B + \sin A\sin B}`}.`,
    t`Divide top and bottom by ${math`\cos A\cos B`}: ${math`\frac{\sin A\cos B}{\cos A\cos B} = \tan A`}, ${math`\frac{\cos A\sin B}{\cos A\cos B} = \tan B`}, ${math`\frac{\sin A\sin B}{\cos A\cos B} = \tan A\tan B`}.`,
    t`So ${math`\tan(A - B) = \frac{\tan A - \tan B}{${1} + \tan A\tan B}`}.`,
  ],
  reference: '(a - b)/(1 + ab)',
  verify: () => {
    for (const [A, B] of [[0.3, 1.1], [1.2, -0.4], [0.7, 0.2]] as const) {
      const [a, b] = [Math.tan(A), Math.tan(B)];
      if (far(Math.tan(A - B), (a - b) / (1 + a * b))) return `A = ${A}, B = ${B}`;
    }
    return null;
  },
  misconceptions: [{ response: '(a - b)/(1 - a b)', why: t`The denominator comes from ${math`\cos(A - B) = \cos A\cos B + \sin A\sin B`}, with a plus.` }],
  official: { source: cite('step-f25-hints', 'Q2(i)'), answer: '(a - b)/(1 + ab)', agrees: true },
});

const a10q1i = supervision({
  id: 'a10-q1-i',
  source: cite('step-f10', 'Q1(i)'),
  title: t`The compound angle formulae from a triangle`,
  prompt: t`In triangle ${math`ABC`}, ${math`BP`} is perpendicular to ${math`AC`}, with ${math`BP = ${1}`}, ${math`\angle ABP = \alpha`}, and ${math`\angle PBC = \beta`} (both acute). Show, using the sine rule, that ${math`\frac{\sin(\alpha + \beta)}{\sin(${90}^\circ - \beta)} = \frac{\tan\alpha + \tan\beta}{${1}/\cos\alpha}`}, and hence that ${math`\sin(\alpha + \beta) = \sin\alpha\cos\beta + \cos\alpha\sin\beta`}. Use this, with facts such as ${math`\cos\gamma = \sin(${90}^\circ - \gamma)`}, to obtain ${math`\sin(\alpha - \beta)`}, ${math`\cos(\alpha + \beta)`}, and ${math`\cos(\alpha - \beta)`}.`,
  writeUp: 'proof',
  official: cite('step-f10-hints', 'Q1(i)'),
});

// ---------------------------------------------------------------- lesson

export const compoundAngles: TopicContent = {
  topicId: 'trig.compound-angles',
  goal: t`Prove ${math`\sin(\alpha + \beta) = \sin\alpha\cos\beta + \cos\alpha\sin\beta`} from a triangle, derive the other compound angle formulae, and find exact values such as ${math`\sin ${75}^\circ`}.`,
  objective: t`Prove the formula for the sine of a sum from a triangle, derive the others, and find exact values.`,
  why: t`Every later identity, double angles, equations, and calculus of sine, is built on these formulae.`,
  minutes: 30,
  lesson: [
    { kind: 'section', title: t`Sine does not add` },
    { kind: 'hook', text: t`Is ${math`\sin ${75}^\circ`} equal to ${math`\sin ${45}^\circ + \sin ${30}^\circ`}? The right side is about ${Number((Math.SQRT2 / 2 + 0.5).toFixed(3))}, more than ${1}, and no sine is more than ${1}. So sine does not simply add. But ${math`\sin ${75}^\circ`} is determined by the angles ${math`${45}^\circ`} and ${math`${30}^\circ`}, so there must be some rule. What is it?` },
    { kind: 'narrative', text: t`A good place to look is a triangle whose angle at one corner is split into two pieces, ${ma} and ${mb}. Its area can be computed whole, using the full angle ${math`\alpha + \beta`}, or in two pieces, one for each part. Setting the two equal is the whole proof.` },
    { kind: 'theorem', name: t`Sine of a sum`, statement: t`For all angles ${ma} and ${mb}, ${math`\sin(\alpha + \beta) = \sin\alpha\cos\beta + \cos\alpha\sin\beta`}.` },
    { kind: 'p', text: t`We prove it when ${ma} and ${mb} are acute, which is the case the geometry shows. The formula holds for all angles once sine and cosine are defined for every angle; that comes with radians, and this case is the heart of it.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`The figure`, text: t`Draw triangle ${math`ABC`} with the foot ${math`P`} of the perpendicular from ${math`B`} on ${math`AC`}, so that ${math`\angle ABP = \alpha`} and ${math`\angle PBC = \beta`}. Let ${math`h = BP`}.`, plain: t`The perpendicular splits the angle at ${math`B`}, of size ${math`\alpha + \beta`}, into its two parts.` },
        { label: t`Area in one piece`, text: t`By the area formula with the angle at ${math`B`}:`, eq: [dmath`[ABC] = \tfrac{${1}}{${2}} \cdot BA \cdot BC \cdot \sin(\alpha + \beta).`], why: { q: t`What does ${math`[ABC]`} mean?`, a: t`The area of triangle ${math`ABC`}: a common shorthand.` } },
        { label: t`Area in two pieces`, text: t`The two right triangles ${math`ABP`} and ${math`PBC`} make up ${math`ABC`}, and by the same formula`, eq: [dmath`[ABC] = \tfrac{${1}}{${2}} \cdot BA \cdot h \cdot \sin\alpha + \tfrac{${1}}{${2}} \cdot h \cdot BC \cdot \sin\beta.`] },
        { label: t`Write h two ways`, text: t`In the right triangle ${math`ABP`}, ${math`h = BA\cos\alpha`}, since ${math`BP`} is the side next to ${ma}; in ${math`PBC`}, ${math`h = BC\cos\beta`}. Put the second into the first term and the first into the second term:`, eq: [dmath`[ABC] = \tfrac{${1}}{${2}} \cdot BA \cdot BC\,(\sin\alpha\cos\beta + \cos\alpha\sin\beta).`] },
        { label: t`Compare`, text: t`Set the two expressions for the area equal and divide by ${math`\frac{${1}}{${2}} \cdot BA \cdot BC`}, which is positive:`, eq: [dmath`\sin(\alpha + \beta) = \sin\alpha\cos\beta + \cos\alpha\sin\beta.`] },
      ],
    },
    { kind: 'section', title: t`The rest of the family` },
    { kind: 'narrative', text: t`Once the sine of a sum is known, the other [[compound-angle-formula|compound angle formulae]] cost almost nothing. Two facts about sine and cosine for all angles do the work: ${math`\sin(-\beta) = -\sin\beta`} and ${math`\cos(-\beta) = \cos\beta`} (a negative angle is the mirror image in the ${math`x`}-axis), and ${math`\cos\gamma = \sin(${90}^\circ - \gamma)`}, ${math`\sin\gamma = \cos(${90}^\circ - \gamma)`}.` },
    { kind: 'theorem', name: t`Compound angle formulae`, statement: t`For all angles ${ma} and ${mb}: ${math`\sin(\alpha \pm \beta) = \sin\alpha\cos\beta \pm \cos\alpha\sin\beta`}; ${math`\cos(\alpha \pm \beta) = \cos\alpha\cos\beta \mp \sin\alpha\sin\beta`}; and, where the tangents are defined, ${math`\tan(\alpha \pm \beta) = \frac{\tan\alpha \pm \tan\beta}{${1} \mp \tan\alpha\tan\beta}`}.` },
    {
      kind: 'steps',
      steps: [
        { label: t`Sine of a difference`, text: t`Replace ${mb} by ${math`-\beta`}: ${math`\sin(\alpha - \beta) = \sin\alpha\cos(-\beta) + \cos\alpha\sin(-\beta) = \sin\alpha\cos\beta - \cos\alpha\sin\beta`}.` },
        { label: t`Cosine of a sum`, text: t`${math`\cos(\alpha + \beta) = \sin(${90}^\circ - \alpha - \beta) = \sin((${90}^\circ - \alpha) - \beta)`}, and by the line above this is ${math`\sin(${90}^\circ - \alpha)\cos\beta - \cos(${90}^\circ - \alpha)\sin\beta = \cos\alpha\cos\beta - \sin\alpha\sin\beta`}.`, plain: t`The minus sign appears because the cosine of a sum comes from the sine of a difference.` },
        { label: t`Cosine of a difference`, text: t`Replace ${mb} by ${math`-\beta`} again: ${math`\cos(\alpha - \beta) = \cos\alpha\cos\beta + \sin\alpha\sin\beta`}.` },
        { label: t`Tangent`, text: t`Divide the sine formula by the cosine formula, then divide top and bottom by ${math`\cos\alpha\cos\beta`}: ${math`\tan(\alpha + \beta) = \frac{\tan\alpha + \tan\beta}{${1} - \tan\alpha\tan\beta}`}.`, why: { q: t`Why divide by ${math`\cos\alpha\cos\beta`}?`, a: t`It turns each ${math`\frac{\sin}{\cos}`} pair into a tangent: ${math`\frac{\sin\alpha\cos\beta}{\cos\alpha\cos\beta} = \tan\alpha`}. It needs both cosines nonzero, which is when both tangents are defined.` } },
      ],
    },
    checkFrom(exactCompound, { fn: 'cos', a: 60, b: 45, plus: true }, t`${math`\cos(${60}^\circ + ${45}^\circ)`} uses a minus sign between the products.`),
    checkFrom(tanSum, { a: q(1, 2), b: q(1, 3), plus: true }, t`The top is ${math`\frac{${5}}{${6}}`} and the bottom ${math`${1} - \frac{${1}}{${6}} = \frac{${5}}{${6}}`}, so the tangent is ${1}: the angles add to ${math`${45}^\circ`}.`),
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`${math`\cos(\alpha + \beta) = \cos\alpha\cos\beta + \sin\alpha\sin\beta`}, with the same sign as the angle.`, counterexample: t`Take ${math`\alpha = \beta = ${45}^\circ`}: the left side is ${math`\cos ${90}^\circ = ${0}`}, but the right side would be ${math`\frac{${1}}{${2}} + \frac{${1}}{${2}} = ${1}`}. For cosine the sign flips.` },
    { kind: 'pitfall', claim: t`${math`\tan(\alpha + \beta)`} is always defined when ${math`\tan\alpha`} and ${math`\tan\beta`} are.`, counterexample: t`${math`\tan ${30}^\circ \tan ${60}^\circ = ${1}`}, so the formula's denominator is ${0}, and indeed ${math`\tan ${90}^\circ`} is undefined.` },
    { kind: 'takeaway', text: t`${math`\sin(\alpha + \beta) = \sin\alpha\cos\beta + \cos\alpha\sin\beta`} comes from two ways of computing one area; the other compound formulae follow from it, with the sign flipping for cosine.` },
  ],
  examples: [
    workedCambridge(a10sin75),
    worked(fromRatios, { i: 0, j: 1, fn: 'sin', plus: true }, t`The sine of a sum from two given sines`),
    worked(exactCompound, { fn: 'sin', a: 60, b: 45, plus: true }, t`An exact value at ${math`${105}^\circ`}`),
  ],
  generators: [exactCompound, fromRatios, tanSum],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['compound-angle-formula'],
  cambridge: [a10q1i, a16q3, a25tan, a10sin15, a16cos75],
  gate: ['a16-q3-i'],
  recall: [
    { front: t`State ${math`\sin(\alpha \pm \beta)`} and ${math`\cos(\alpha \pm \beta)`}.`, back: t`${math`\sin\alpha\cos\beta \pm \cos\alpha\sin\beta`}; ${math`\cos\alpha\cos\beta \mp \sin\alpha\sin\beta`}.` },
    { front: t`State ${math`\tan(\alpha + \beta)`}.`, back: t`${math`\frac{\tan\alpha + \tan\beta}{${1} - \tan\alpha\tan\beta}`}.` },
    { front: t`How does the area proof of ${math`\sin(\alpha + \beta)`} go?`, back: t`Split the angle by a perpendicular; the area is ${math`\frac{${1}}{${2}}ac\sin(\alpha + \beta)`} whole and the sum of two pieces; write the height as ${math`a\cos\alpha`} and ${math`c\cos\beta`} and compare.` },
  ],
  proofOrder: [
    {
      title: t`The sine of a sum, by areas`,
      steps: [
        t`Drop the perpendicular from the split vertex, cutting the angle into ${ma} and ${mb}.`,
        t`Write the area as half the two sides times ${math`\sin(\alpha + \beta)`}.`,
        t`Write the area again as the sum of the two right triangles' areas.`,
        t`Express the height by each side times a cosine, and substitute.`,
        t`Compare the two expressions and divide by half the product of the sides.`,
      ],
    },
  ],
};
