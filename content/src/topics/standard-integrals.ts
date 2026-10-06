/**
 * calc.standard-integrals: integrating e^(kx), sin kx, cos kx, 1/x, and f'(x)/f(x) by
 * recognising each as a derivative ("integration by inspection"), with ln|x| proved in both
 * cases. The Cambridge problems are STEP Support Foundation Assignment 24, Q1(i) and Q2(v),
 * (vi), and Assignment 25, Q4(ii), with their hints. The STEP 1 specification: "Know and use
 * the Fundamental Theorem of Calculus, including applications to integration by inspection".
 */
import { auto, cite, supervision } from '../cambridge';
import { int, pick, q, str, sub, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { poly } from '../poly';
import { agreesAt, close, numDeriv, simpson } from '../prep-c';
import { computedMath as cm, math, t } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

const F24 = 'step-f24' as const;
const F24H = 'step-f24-hints' as const;
const F25 = 'step-f25' as const;
const F25H = 'step-f25-hints' as const;

// ---------------------------------------------------------------- sin kx and cos kx between limits

type Trig = 'sin' | 'cos';
/** End angles theta = (num/den) pi with a rational sine or cosine. */
const ANGLES: readonly [number, number][] = [[1, 6], [1, 3], [1, 2], [2, 3], [5, 6], [1, 1], [3, 2], [2, 1]];
const sinOf = (a: number, b: number): Rational | null => {
  const key = `${a}/${b}`;
  const table: Record<string, Rational> = { '1/6': q(1, 2), '1/2': q(1), '5/6': q(1, 2), '1/1': q(0), '3/2': q(-1), '2/1': q(0) };
  return table[key] ?? null;
};
const cosOf = (a: number, b: number): Rational | null => {
  const key = `${a}/${b}`;
  const table: Record<string, Rational> = { '1/3': q(1, 2), '1/2': q(0), '2/3': q(-1, 2), '1/1': q(-1), '3/2': q(0), '2/1': q(1) };
  return table[key] ?? null;
};
interface TrP { f: Trig; k: number; a: number; b: number }
/** The exact value, or null when the end angle's sine or cosine is not rational. */
function trigVal({ f, k, a, b }: TrP): Rational | null {
  if (f === 'sin') { const c = cosOf(a, b); return c === null ? null : sub(q(1, k), q(c.num, c.den * BigInt(k))); }
  const s = sinOf(a, b);
  return s === null ? null : q(s.num, s.den * BigInt(k));
}
function trigMis(p: TrP): Misconception[] {
  const v = trigVal(p) as Rational;
  const pool: Misconception[] = [
    { response: str(sub(q(0), v)), why: p.f === 'sin' ? t`${math`\int \sin kx\,dx = -\frac{\cos kx}{k}`}: the minus sign belongs to the antiderivative of sine.` : t`${math`\int \cos kx\,dx = +\frac{\sin kx}{k}`}: there is no minus sign here.` },
    { response: str(q(v.num * BigInt(p.k), v.den)), why: t`Divide by ${math`k`}: differentiating ${math`\sin kx`} or ${math`\cos kx`} brings out a factor ${math`k`}, so integrating must remove one.` },
    { response: str(q(v.num, v.den * BigInt(p.k))), why: t`Divide by ${math`k`} once, not twice: the derivative of ${math`\frac{\sin kx}{k}`} is ${math`\cos kx`}.` },
  ];
  const out: Misconception[] = [];
  for (const m of pool) if (m.response !== str(v) && !out.some((o) => o.response === m.response)) out.push(m);
  return out.slice(0, 2);
}
const upper = ({ k, a, b }: TrP): Rational => q(a, b * k);
const piTex = (r: Rational) => (r.num === 1n && r.den === 1n ? math`\pi` : r.den === 1n ? math`${Number(r.num)}\pi` : r.num === 1n ? math`\frac{\pi}{${Number(r.den)}}` : math`\frac{${Number(r.num)}\pi}{${Number(r.den)}}`);

const trigDefinite = generator<TrP>({
  id: 'trig-definite',
  skill: 'Integrate sin kx or cos kx between limits: -cos(kx)/k or sin(kx)/k, then substitute.',
  params: (rng) => {
    for (;;) {
      const [a, b] = pick(rng, ANGLES);
      const p: TrP = { f: pick(rng, ['sin', 'cos'] as const), k: int(rng, 1, 3), a, b };
      const v = trigVal(p);
      if (v !== null && str(v) !== '0' && trigMis(p).length >= 2) return p;
    }
  },
  sane: (p) => (trigVal(p) !== null ? null : 'irrational end value'),
  problem: (p) => {
    const kx = p.k === 1 ? math`x` : math`${p.k}x`;
    const U = piTex(upper(p));
    const theta = piTex(q(p.a, p.b));
    const v = trigVal(p) as Rational;
    return {
      prompt: t`Evaluate ${math`\int_{${0}}^{${U}} ${p.f === 'sin' ? math`\sin` : math`\cos`} ${kx}\,dx`}.`,
      answer: { kind: 'exact', expected: str(v) },
      solution: p.f === 'sin'
        ? [t`An antiderivative is ${math`-\frac{\cos ${kx}}{${p.k}}`}: its derivative is ${math`\frac{${p.k}\sin ${kx}}{${p.k}} = \sin ${kx}`}.`, t`At the upper limit ${math`${p.k}x = ${theta}`}, where ${math`\cos = ${cosOf(p.a, p.b) as Rational}`}; at ${0}, ${math`\cos ${0} = ${1}`}. So the integral is ${math`\frac{${1} - (${cosOf(p.a, p.b) as Rational})}{${p.k}} = ${v}`}.`]
        : [t`An antiderivative is ${math`\frac{\sin ${kx}}{${p.k}}`}.`, t`At the upper limit ${math`${p.k}x = ${theta}`}, where ${math`\sin = ${sinOf(p.a, p.b) as Rational}`}; at ${0} it is ${0}. So the integral is ${v}.`],
    };
  },
  solve: (p) => {
    const U = (Number(upper(p).num) / Number(upper(p).den)) * Math.PI;
    const s = simpson((x) => (p.f === 'sin' ? Math.sin(p.k * x) : Math.cos(p.k * x)), 0, U);
    return str(q(Math.round(s * 12), 12));
  },
  misconceptions: (p) => trigMis(p),
});

// ---------------------------------------------------------------- f'(x)/f(x)

interface LogP { p: number; c: number; a: number; b: number }
const F = ({ p, c }: LogP, x: number): number => x * x + p * x + c;
const logIntegral = generator<LogP>({
  id: 'f-prime-over-f',
  skill: 'Recognise (2x + p)/(x^2 + px + c) as f\'/f and integrate it to ln|f|.',
  params: (rng) => {
    for (;;) {
      const g: LogP = { p: int(rng, -3, 4), c: int(rng, 1, 6), a: int(rng, 0, 2), b: 0 };
      g.b = g.a + int(rng, 1, 3);
      const fa = F(g, g.a);
      const fb = F(g, g.b);
      // f stays positive on [a, b], and the misconceptions differ from the answer.
      let ok = true;
      for (let x = g.a; x <= g.b; x += 0.01) if (F(g, x) <= 0) ok = false;
      if (ok && fb > fa && fb - fa !== fb / fa) return g;
    }
  },
  sane: (g) => (F(g, g.a) > 0 && F(g, g.b) > 0 ? null : 'f must be positive'),
  problem: (g) => {
    const fa = F(g, g.a);
    const fb = F(g, g.b);
    return {
      prompt: t`Evaluate ${math`\int_{${g.a}}^{${g.b}} \frac{${cm(poly([2, g.p]))}}{${cm(poly([1, g.p, g.c]))}}\,dx`} exactly.`,
      answer: { kind: 'expression', expected: `ln(${fb}/${fa})`, variables: [] },
      solution: [
        t`The top is the derivative of the bottom: with ${math`f(x) = ${cm(poly([1, g.p, g.c]))}`}, ${math`f'(x) = ${cm(poly([2, g.p]))}`}. So the integrand is ${math`\frac{f'(x)}{f(x)}`}, an antiderivative is ${math`\ln|f(x)|`}, and ${math`f > ${0}`} on the range.`,
        t`${math`f(${g.b}) = ${fb}`} and ${math`f(${g.a}) = ${fa}`}, so the integral is ${math`\ln ${fb} - \ln ${fa} = \ln${q(fb, fa)}`}.`,
      ],
    };
  },
  solve: (g) => String(simpson((x) => (2 * x + g.p) / F(g, x), g.a, g.b, 4000)),
  misconceptions: (g): Misconception[] => [
    { response: `ln(${F(g, g.b) - F(g, g.a)})`, why: t`${math`\ln f(b) - \ln f(a) = \ln\frac{f(b)}{f(a)}`}: the logarithm of a quotient, not of a difference.` },
    { response: `${F(g, g.b)}/${F(g, g.a)}`, why: t`The antiderivative is ${math`\ln|f(x)|`}, so the answer is a logarithm: ${math`\ln\frac{f(b)}{f(a)}`}.` },
  ],
});

// ---------------------------------------------------------------- 1/(cx + d)

interface RecP { c: number; d: number; a: number; b: number }
const recip = generator<RecP>({
  id: 'reciprocal-linear',
  skill: 'Integrate 1/(cx + d) as (1/c) ln|cx + d|, remembering the 1/c.',
  quick: true,
  params: (rng) => {
    return { c: pick(rng, [2, 3, 4, 5]), d: int(rng, 1, 4), a: 0, b: int(rng, 1, 3) };
  },
  sane: ({ c, d }) => (c > 0 && d > 0 ? null : 'the denominator must stay positive'),
  problem: (r) => {
    const top = r.c * r.b + r.d;
    return {
      prompt: t`Evaluate ${math`\int_{${0}}^{${r.b}} \frac{${1}}{${cm(poly([r.c, r.d]))}}\,dx`} exactly.`,
      answer: { kind: 'expression', expected: `ln(${top}/${r.d})/${r.c}`, variables: [] },
      solution: [
        t`${math`\frac{d}{dx}\ln(${cm(poly([r.c, r.d]))}) = \frac{${r.c}}{${cm(poly([r.c, r.d]))}}`}, which is ${r.c} times the integrand. So an antiderivative is ${math`\frac{${1}}{${r.c}}\ln(${cm(poly([r.c, r.d]))})`}.`,
        t`Between the limits: ${math`\frac{${1}}{${r.c}}(\ln ${top} - \ln ${r.d}) = \frac{${1}}{${r.c}}\ln${q(top, r.d)}`}.`,
      ],
    };
  },
  solve: (r) => String(simpson((x) => 1 / (r.c * x + r.d), 0, r.b, 4000)),
  misconceptions: (r): Misconception[] => [
    { response: `ln(${r.c * r.b + r.d}/${r.d})`, why: t`Differentiating ${math`\ln(cx + d)`} gives ${math`\frac{c}{cx + d}`}, so divide by ${math`c`}.` },
    { response: `${r.c}*ln(${r.c * r.b + r.d}/${r.d})`, why: t`Divide by ${math`c`}, do not multiply: the derivative of ${math`\ln(cx + d)`} already has the factor ${math`c`}.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const cotQ = auto({
  id: 'a25-q4-ii-a',
  source: cite(F25, 'Assignment 25, Q4(ii)(a)'),
  title: t`Cotangent by the logarithm rule`,
  prompt: t`Use ${math`\int \frac{f'(x)}{f(x)}\,dx = \ln|f(x)| + c`} to find ${math`\int_{\frac{\pi}{${4}}}^{\frac{\pi}{${2}}} \frac{\cos x}{\sin x}\,dx`}.`,
  answer: { kind: 'expression', expected: 'ln(2)/2', variables: [] },
  solution: [
    t`With ${math`f(x) = \sin x`}, ${math`f'(x) = \cos x`}, so the integral is ${math`\left[\ln|\sin x|\right]_{\frac{\pi}{${4}}}^{\frac{\pi}{${2}}}`}.`,
    t`${math`\ln ${1} - \ln\frac{${1}}{\sqrt{${2}}} = ${0} + \frac{${1}}{${2}}\ln ${2} = \frac{${1}}{${2}}\ln ${2}`}.`,
  ],
  reference: 'ln(sqrt(2))',
  verify: () => close('Simpson', simpson((x) => Math.cos(x) / Math.sin(x), Math.PI / 4, Math.PI / 2), Math.log(2) / 2),
  misconceptions: [{ response: '-ln(2)/2', why: t`Upper limit first: ${math`\ln\sin\frac{\pi}{${2}} - \ln\sin\frac{\pi}{${4}}`}, and ${math`\ln ${1} = ${0}`}.` }],
  official: { source: cite(F25H, 'Assignment 25 hints, Q4(ii)(a)'), answer: 'ln(2)/2', agrees: true },
});

const e4t = auto({
  id: 'a24-q1-i-a',
  source: cite(F24, 'Assignment 24, Q1(i)(a)'),
  title: t`By inspection: an exponential`,
  prompt: t`Using ${math`\frac{d}{dt}e^{kt} = ke^{kt}`}, evaluate ${math`\int_{${0}}^{\ln ${2}} e^{${4}t}\,dt`}.`,
  answer: { kind: 'exact', expected: '15/4' },
  solution: [t`An antiderivative is ${math`\frac{e^{${4}t}}{${4}}`}.`, t`${math`\frac{e^{${4}\ln ${2}}}{${4}} - \frac{${1}}{${4}} = \frac{${16}}{${4}} - \frac{${1}}{${4}} = ${q(15, 4)}`}, since ${math`e^{${4}\ln ${2}} = ${2}^{${4}}`}.`],
  reference: '15/4',
  verify: () => close('Simpson', simpson((x) => Math.exp(4 * x), 0, Math.log(2)), 15 / 4),
  misconceptions: [{ response: '15', why: t`The antiderivative of ${math`e^{${4}t}`} is ${math`\frac{e^{${4}t}}{${4}}`}: divide by ${4}.` }],
  official: { source: cite(F24H, 'Assignment 24 hints, Q1(i)(a)'), answer: '15/4', agrees: true },
});

const sin2t = auto({
  id: 'a24-q1-i-b',
  source: cite(F24, 'Assignment 24, Q1(i)(b)'),
  title: t`By inspection: a sine`,
  prompt: t`Differentiate ${math`\cos(kx)`} by the chain rule, and hence evaluate ${math`\int_{${0}}^{\frac{\pi}{${2}}} \sin(${2}t)\,dt`}.`,
  answer: { kind: 'exact', expected: '1' },
  solution: [t`${math`\frac{d}{dt}\cos(${2}t) = -${2}\sin(${2}t)`}, so an antiderivative of ${math`\sin(${2}t)`} is ${math`-\frac{${1}}{${2}}\cos(${2}t)`}.`, t`${math`-\frac{${1}}{${2}}\cos\pi + \frac{${1}}{${2}}\cos ${0} = \frac{${1}}{${2}} + \frac{${1}}{${2}} = ${1}`}.`],
  reference: '1',
  verify: () => close('Simpson', simpson((x) => Math.sin(2 * x), 0, Math.PI / 2), 1),
  misconceptions: [{ response: '2', why: t`Divide by the ${2}: the antiderivative is ${math`-\frac{${1}}{${2}}\cos(${2}t)`}.` }],
  official: { source: cite(F24H, 'Assignment 24 hints, Q1(i)(b)'), answer: '1', agrees: true },
});

const xcos = auto({
  id: 'a24-q1-i-c',
  source: cite(F24, 'Assignment 24, Q1(i)(c)'),
  title: t`By inspection: a product rule in disguise`,
  prompt: t`Use the product rule to differentiate ${math`x\sin x`}. Hence evaluate ${math`\int_{${0}}^{\pi} (x\cos x + \sin x)\,dx`}.`,
  answer: { kind: 'exact', expected: '0' },
  solution: [t`${math`\frac{d}{dx}(x\sin x) = \sin x + x\cos x`}: exactly the integrand.`, t`So the integral is ${math`\left[x\sin x\right]_{${0}}^{\pi} = \pi\sin\pi - ${0} = ${0}`}.`],
  reference: '0',
  verify: () => close('Simpson', simpson((x) => x * Math.cos(x) + Math.sin(x), 0, Math.PI), 0, 1e-9),
  misconceptions: [{ response: '2', why: t`${math`\int_{${0}}^{\pi}\sin x\,dx = ${2}`} alone, but the ${math`x\cos x`} part contributes ${-2}. Together they are the derivative of ${math`x\sin x`}, which is ${0} at both ends.` }],
  official: { source: cite(F24H, 'Assignment 24 hints, Q1(i)(c)'), answer: '0', agrees: true },
});

const lnln = auto({
  id: 'a25-q4-ii-b',
  source: cite(F25, 'Assignment 25, Q4(ii)(b)'),
  title: t`One over x ln x`,
  prompt: t`By writing the integrand in the form ${math`\frac{f'(x)}{f(x)}`}, find ${math`\int \frac{${1}}{x\ln x}\,dx`} for ${math`x > ${1}`}. Give the antiderivative with constant ${0}.`,
  answer: { kind: 'expression', expected: 'ln(ln(x))', variables: ['x'], domains: { x: { kind: 'real', min: 1.5, max: 8 } } },
  solution: [t`${math`\frac{${1}}{x\ln x} = \frac{${1}/x}{\ln x}`}, and ${math`\frac{${1}}{x}`} is the derivative of ${math`\ln x`}.`, t`So the integral is ${math`\ln|\ln x| + c`}, and ${math`\ln x > ${0}`} for ${math`x > ${1}`}.`],
  reference: 'ln(ln(x))',
  verify: () => agreesAt('derivative', '1/(x ln(x))', (x) => numDeriv((u) => Math.log(Math.log(u)), x), [1.5, 2, 5]),
  misconceptions: [{ response: 'ln(x)^2/2', why: t`That integrates ${math`\frac{\ln x}{x}`}. Here ${math`\ln x`} is below the line, so the answer is a logarithm of ${math`\ln x`}.` }],
  official: { source: cite(F25H, 'Assignment 25 hints, Q4(ii)(b)'), answer: 'ln(abs(ln(x)))', agrees: true },
});

const stQ = supervision({
  id: 'a25-q4-ii-c',
  source: cite(F25, 'Assignment 25, Q4(ii)(c)'),
  title: t`Two integrals at once`,
  prompt: t`Let ${math`S = \int \frac{\cos x}{\cos x + \sin x}\,dx`} and ${math`T = \int \frac{\sin x}{\cos x + \sin x}\,dx`}. By considering ${math`S + T`} and ${math`S - T`}, determine ${math`S`} and ${math`T`}.`,
  writeUp: 'proof',
  official: cite(F25H, 'Assignment 25 hints, Q4(ii)(c)'),
});

const ijQ = supervision({
  id: 'a24-q2-v-vi',
  source: cite(F24, 'Assignment 24, Q2(v), (vi)'),
  title: t`The integral of x cos x without parts`,
  prompt: t`Integrate ${math`\cos(kx)`} with respect to ${math`x`}. Let ${math`I = \int (x\cos x + \sin x)\,dx`} and ${math`J = \int \sin x\,dx`}. By considering ${math`I - J`}, and using that ${math`x\sin x`} differentiates to ${math`x\cos x + \sin x`}, find ${math`\int x\cos x\,dx`}.`,
  writeUp: 'explanation',
  official: cite(F24H, 'Assignment 24 hints, Q2(v), (vi)'),
});

// ---------------------------------------------------------------- lesson

export const standardIntegrals: TopicContent = {
  topicId: 'calc.standard-integrals',
  goal: t`Integrate ${math`e^{kx}`}, ${math`\sin kx`}, ${math`\cos kx`}, and ${math`\frac{f'(x)}{f(x)}`} by recognising each as a derivative.`,
  objective: t`Integrate exponentials, sines, cosines, and f'/f by spotting the derivative they came from.`,
  why: t`Most STEP integrals reduce to these by a substitution or by parts, and the f'/f pattern is everywhere.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`Reading derivatives backwards` },
    { kind: 'hook', text: t`What is ${math`\int_{${0}}^{\frac{\pi}{${2}}} (x^{${2}}\cos x + ${2}x\sin x)\,dx`}? It looks like work. But if you notice that ${math`x^{${2}}\cos x + ${2}x\sin x`} is the derivative of ${math`x^{${2}}\sin x`}, the answer is ${math`\left(\frac{\pi}{${2}}\right)^{${2}}\sin\frac{\pi}{${2}} - ${0} = \frac{\pi^{${2}}}{${4}}`} at once. Integration is mostly recognition.` },
    { kind: 'narrative', text: t`The fundamental theorem says: to integrate ${math`f`}, find any ${math`F`} with ${math`F' = f`}. So every derivative you know, read backwards, is an integral you know. Guessing ${math`F`} and checking by differentiating is called integration by inspection.` },
    { kind: 'theorem', name: t`Standard integrals`, statement: t`For a constant ${math`k \ne ${0}`}, on any interval: ${math`\int e^{kx}\,dx = \frac{e^{kx}}{k} + c`}, ${math`\int \sin kx\,dx = -\frac{\cos kx}{k} + c`}, ${math`\int \cos kx\,dx = \frac{\sin kx}{k} + c`}, and, on an interval not containing ${0}, ${math`\int \frac{${1}}{x}\,dx = \ln|x| + c`}.` },
    { kind: 'p', text: t`Each is checked by differentiating the right side. The ${math`\frac{${1}}{k}`} is there because the chain rule brings out a factor ${math`k`}: ${math`\frac{d}{dx}\sin kx = k\cos kx`}. Angles are in radians.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Positive x`, text: t`For ${math`x > ${0}`}, ${math`|x| = x`} and ${math`\frac{d}{dx}\ln x = \frac{${1}}{x}`}.` },
        { label: t`Negative x`, text: t`For ${math`x < ${0}`}, ${math`|x| = -x > ${0}`}, and by the chain rule ${math`\frac{d}{dx}\ln(-x) = \frac{${1}}{-x} \cdot (-${1}) = \frac{${1}}{x}`}.` },
        { label: t`Conclude`, text: t`On either side of ${0}, ${math`\ln|x|`} is an antiderivative of ${math`\frac{${1}}{x}`}.` },
      ],
    },
    { kind: 'section', title: t`The logarithm pattern` },
    { kind: 'theorem', name: t`Logarithmic integrals`, statement: t`If ${math`f`} is differentiable and ${math`f(x) \ne ${0}`} on an interval, then ${math`\int \frac{f'(x)}{f(x)}\,dx = \ln|f(x)| + c`} there.` },
    { kind: 'p', text: t`By the chain rule, ${math`\frac{d}{dx}\ln|f(x)| = \frac{${1}}{f(x)} \cdot f'(x)`}, using the derivative of ${math`\ln|u|`} just proved. This is the [[log-integral|logarithmic integral]]: whenever the top is the derivative of the bottom, the answer is a logarithm.`, why: { q: t`Why must ${math`f`} not vanish?`, a: t`${math`\ln|f|`} is undefined where ${math`f = ${0}`}, and the integrand blows up there; the rule holds only on intervals avoiding those points.` } },
    { kind: 'narrative', text: t`So ${math`\int \frac{${2}x}{x^{${2}} + ${1}}\,dx = \ln(x^{${2}} + ${1}) + c`}, ${math`\int \tan x\,dx = -\ln|\cos x| + c`} (top ${math`\sin x`} is minus the derivative of ${math`\cos x`}), and ${math`\int \frac{${1}}{x\ln x}\,dx = \ln|\ln x| + c`}. A constant factor is easily fixed: ${math`\int \frac{x}{x^{${2}} + ${1}}\,dx = \frac{${1}}{${2}}\ln(x^{${2}} + ${1}) + c`}.` },
    checkFrom(recip, { c: 3, d: 1, a: 0, b: 1 }, t`An antiderivative is ${math`\frac{${1}}{${3}}\ln(${3}x + ${1})`}; between ${0} and ${1} it gives ${math`\frac{${1}}{${3}}\ln ${4}`}.`),
    { kind: 'pitfall', claim: t`${math`\int \sin x\,dx = \cos x + c`}.`, counterexample: t`${math`\frac{d}{dx}\cos x = -\sin x`}. Check: ${math`\int_{${0}}^{\pi}\sin x\,dx`} is a positive area, ${2}, but ${math`\left[\cos x\right]_{${0}}^{\pi} = ${-2}`}. The antiderivative is ${math`-\cos x`}.` },
    { kind: 'pitfall', claim: t`${math`\int \frac{${1}}{x^{${2}} + ${1}}\,dx = \ln(x^{${2}} + ${1}) + c`}.`, counterexample: t`The top is not the derivative of the bottom. Differentiating ${math`\ln(x^{${2}} + ${1})`} gives ${math`\frac{${2}x}{x^{${2}} + ${1}}`}, which at ${math`x = ${0}`} is ${0}, while the integrand there is ${1}.` },
    { kind: 'takeaway', text: t`Integrate by recognising a derivative: ${math`\frac{e^{kx}}{k}`}, ${math`-\frac{\cos kx}{k}`}, ${math`\frac{\sin kx}{k}`}, and ${math`\ln|f|`} when the top is ${math`f'`}; always check by differentiating.` },
  ],
  examples: [
    { ...workedCambridge(cotQ), examiner: t`The examiner looks for ${math`f(x) = \sin x`} named, the modulus handled, and exact values of the sine at both limits.` },
    worked(trigDefinite, { f: 'sin', k: 2, a: 2, b: 3 }, t`A sine between limits`),
    worked(logIntegral, { p: 2, c: 3, a: 0, b: 1 }, t`The top is the derivative of the bottom`),
  ],
  generators: [trigDefinite, logIntegral, recip],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['log-integral'],
  cambridge: [e4t, sin2t, xcos, lnln, stQ, ijQ],
  gate: ['a25-q4-ii-c', 'a24-q1-i-c'],
  recall: [
    { front: t`What are ${math`\int \sin kx\,dx`} and ${math`\int \cos kx\,dx`}?`, back: t`${math`-\frac{\cos kx}{k} + c`} and ${math`\frac{\sin kx}{k} + c`}.` },
    { front: t`What is ${math`\int \frac{f'(x)}{f(x)}\,dx`}?`, back: t`${math`\ln|f(x)| + c`}, on an interval where ${math`f \ne ${0}`}.` },
  ],
  proofOrder: [{
    title: t`The antiderivative of one over x`,
    steps: [
      t`For ${math`x > ${0}`}, ${math`\ln|x| = \ln x`} has derivative ${math`\frac{${1}}{x}`}.`,
      t`For ${math`x < ${0}`}, ${math`\ln|x| = \ln(-x)`}.`,
      t`The chain rule gives ${math`\frac{${1}}{-x} \cdot (-${1}) = \frac{${1}}{x}`}.`,
      t`So ${math`\ln|x|`} works on either side of ${0}.`,
    ],
  }],
};

