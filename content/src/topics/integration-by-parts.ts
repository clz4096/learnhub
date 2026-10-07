/**
 * calc.integration-by-parts: the product rule integrated, the integral of u v' as u v minus the
 * integral of u' v, with limits; choosing u; the integral of ln x; using it twice; and a
 * recurrence. The Cambridge problems are STEP Support Foundation Assignment 24, Q1(ii) and
 * Q3 (1998 STEP II Q4, a recurrence I_n - I_(n-1)), with the Assignment 24 hints, and the NST
 * Mathematics Workbook, I2(i).
 */
import { auto, cite, supervision, withUses } from '../cambridge';
import { mul, pick, q, str, sub, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { agreesAt, close, firstError, fn, simpson } from '../prep-c';
import { computedMath as cm, dmath, math, t, type Rich } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

const F24 = 'step-f24' as const;
const F24H = 'step-f24-hints' as const;
const NST = 'nst-workbook' as const;
const value = (text: string): number => fn(text, [])();

// ---------------------------------------------------------------- x e^(kx) on [0, 1]

interface XeP { k: number }
const xeAnswer = (k: number): string => `(${(k - 1)}*e^(${k}) + 1)/${k * k}`;
const xExp = generator<XeP>({
  id: 'x-exp-definite',
  skill: 'Integrate x e^(kx) over [0, 1] by parts with u = x, which differentiates to 1.',
  params: (rng) => ({ k: pick(rng, [2, 3, 4, -1, -2, -3]) }),
  sane: ({ k }) => (k !== 0 && k !== 1 ? null : 'degenerate'),
  problem: ({ k }) => ({
    prompt: t`Evaluate ${math`\int_{${0}}^{${1}} xe^{${k === -1 ? '-' : k}x}\,dx`} exactly.`,
    answer: { kind: 'expression', expected: xeAnswer(k), variables: [] },
    solution: [
      t`Take ${math`u = x`} and ${math`v' = e^{${k === -1 ? '-' : k}x}`}, so ${math`u' = ${1}`} and ${math`v = \frac{e^{${k === -1 ? '-' : k}x}}{${k}}`}.`,
      t`${math`\int_{${0}}^{${1}} xe^{${k === -1 ? '-' : k}x}\,dx = \left[\frac{xe^{${k === -1 ? '-' : k}x}}{${k}}\right]_{${0}}^{${1}} - \int_{${0}}^{${1}} \frac{e^{${k === -1 ? '-' : k}x}}{${k}}\,dx = \frac{e^{${k}}}{${k}} - \frac{e^{${k}} - ${1}}{${k * k}}`}.`,
      t`Over a common denominator: ${cm(xeAnswer(k))}.`,
    ],
  }),
  solve: ({ k }) => String(simpson((x) => x * Math.exp(k * x), 0, 1, 4000)),
  misconceptions: ({ k }): Misconception[] => [
    { response: `e^(${k})/${k} + (e^(${k}) - 1)/${k * k}`, why: t`Integration by parts subtracts: ${math`\int uv' = uv - \int u'v`}.` },
    { response: `e^(${k})/${k}`, why: t`That is only the ${math`\left[uv\right]`} part. The integral ${math`\int u'v`} still has to be done and subtracted.` },
  ],
});

// ---------------------------------------------------------------- x^n ln x on [1, m]

interface LnP { n: number; m: number }
const lnAnswer = ({ n, m }: LnP): string => `${m ** (n + 1)}*ln(${m})/${n + 1} - ${m ** (n + 1) - 1}/${(n + 1) ** 2}`;
const xLn = generator<LnP>({
  id: 'power-times-ln',
  skill: 'Integrate x^n ln x by parts with u = ln x, because its derivative 1/x is simpler.',
  params: (rng) => ({ n: pick(rng, [0, 1, 2, 3]), m: pick(rng, [2, 3, 4]) }),
  sane: ({ n }) => (n >= 0 ? null : 'n negative'),
  problem: (p) => {
    const integrand: Rich = p.n === 0 ? t`${math`\ln x`}` : p.n === 1 ? t`${math`x\ln x`}` : t`${math`x^{${p.n}}\ln x`}`;
    return {
      prompt: t`Evaluate ${math`\int_{${1}}^{${p.m}}`} ${integrand} ${math`\,dx`} exactly.`,
      answer: { kind: 'expression', expected: lnAnswer(p), variables: [] },
      solution: [
        t`Take ${math`u = \ln x`} and ${math`v' = x^{${p.n}}`}: ${math`u' = \frac{${1}}{x}`}, ${math`v = \frac{x^{${p.n + 1}}}{${p.n + 1}}`}. Then ${math`u'v = \frac{x^{${p.n}}}{${p.n + 1}}`}, a plain power.`,
        t`So the integral is ${math`\left[\frac{x^{${p.n + 1}}\ln x}{${p.n + 1}}\right]_{${1}}^{${p.m}} - \left[\frac{x^{${p.n + 1}}}{${(p.n + 1) ** 2}}\right]_{${1}}^{${p.m}}`}, and ${math`\ln ${1} = ${0}`}.`,
        t`That is ${cm(lnAnswer(p))}.`,
      ],
    };
  },
  solve: (p) => String(simpson((x) => x ** p.n * Math.log(x), 1, p.m, 4000)),
  misconceptions: (p): Misconception[] => [
    { response: `${p.m ** (p.n + 1)}*ln(${p.m})/${p.n + 1} + ${p.m ** (p.n + 1) - 1}/${(p.n + 1) ** 2}`, why: t`The second part is subtracted: ${math`\int uv' = uv - \int u'v`}.` },
    p.n === 0
      ? { response: `${p.m}*ln(${p.m})`, why: t`That is only the ${math`\left[uv\right]`} part. Subtract ${math`\int u'v\,dx = \int ${1}\,dx`} as well.` }
      : { response: `${p.m ** (p.n + 1)}*ln(${p.m})/${p.n + 1} - ${p.m ** (p.n + 1) - 1}/${p.n + 1}`, why: t`Integrating ${math`\frac{x^{${p.n}}}{${p.n + 1}}`} divides by ${math`${p.n + 1}`} again, giving ${math`(${p.n + 1})^{${2}}`} below.` },
  ],
});

// ---------------------------------------------------------------- x times a sine or cosine

type Trig = 'sin' | 'cos';
interface TrP { f: Trig; k: number; j: number }
/** sin and cos of a multiple of pi/2, exactly. */
const sinQ = (quarter: number): number => [0, 1, 0, -1][((quarter % 4) + 4) % 4] as number;
const cosQ = (quarter: number): number => [1, 0, -1, 0][((quarter % 4) + 4) % 4] as number;
/** The integral of x f(kx) from 0 to j pi/2, as A pi + B. */
function trigParts({ f, k, j }: TrP): { A: Rational; B: Rational } {
  const kq = k * j; // kU = kq pi/2
  if (f === 'sin') {
    // [-x cos(kx)/k + sin(kx)/k^2] from 0 to U = j pi/2.
    return { A: q(-j * cosQ(kq), 2 * k), B: q(sinQ(kq), k * k) };
  }
  // [x sin(kx)/k + cos(kx)/k^2] from 0 to U.
  return { A: q(j * sinQ(kq), 2 * k), B: sub(q(cosQ(kq), k * k), q(1, k * k)) };
}
const trigText = ({ A, B }: { A: Rational; B: Rational }): string => `(${str(A)})*pi + (${str(B)})`;

function trigMis(p: TrP): Misconception[] {
  const { A, B } = trigParts(p);
  const neg = (r: Rational): Rational => sub(q(0), r);
  const pool: [{ A: Rational; B: Rational }, Rich][] = [
    [{ A, B: neg(B) }, t`Subtract the second integral: ${math`\int uv' = uv - \int u'v`}.`],
    [{ A: neg(A), B: neg(B) }, t`Check the sign of ${math`v`}: ${math`\int \sin kx\,dx = -\frac{\cos kx}{k}`}, and ${math`\int \cos kx\,dx = \frac{\sin kx}{k}`}.`],
    [{ A, B: q(0) }, t`That is only the ${math`\left[uv\right]`} part. The integral ${math`\int u'v\,dx`} must be worked out and subtracted.`],
    [{ A: q(0), B }, t`The term ${math`\left[uv\right]`} is not ${0} at the upper limit: ${math`x`} is not ${0} there.`],
    [{ A: mul(A, q(p.k)), B: mul(B, q(p.k)) }, t`Integrating ${math`\sin kx`} or ${math`\cos kx`} divides by ${math`k`}: the chain rule run backwards.`],
  ];
  const right = trigText({ A, B });
  const out: Misconception[] = [];
  for (const [v, why] of pool) {
    const r = trigText(v);
    if (r !== right && !out.some((o) => o.response === r) && (str(v.A) !== '0' || str(v.B) !== '0')) out.push({ response: r, why });
  }
  return out.slice(0, 2);
}
const xTrig = generator<TrP>({
  id: 'x-trig',
  skill: 'Integrate x sin kx or x cos kx between limits by parts with u = x.',
  params: (rng) => {
    for (;;) {
      const p: TrP = { f: pick(rng, ['sin', 'cos'] as const), k: pick(rng, [1, 2, 3]), j: pick(rng, [1, 2]) };
      const { A, B } = trigParts(p);
      if ((str(A) !== '0' || str(B) !== '0') && trigMis(p).length >= 2) return p;
    }
  },
  sane: ({ k }) => (k >= 1 ? null : 'k must be positive'),
  problem: (p) => {
    const U = p.j === 1 ? math`\frac{\pi}{${2}}` : math`\pi`;
    const kx = p.k === 1 ? math`x` : math`${p.k}x`;
    const fx = p.f === 'sin' ? math`\sin ${kx}` : math`\cos ${kx}`;
    const v = p.f === 'sin' ? (p.k === 1 ? math`-\cos x` : math`-\frac{\cos ${kx}}{${p.k}}`) : (p.k === 1 ? math`\sin x` : math`\frac{\sin ${kx}}{${p.k}}`);
    const vInt = p.f === 'sin' ? (p.k === 1 ? math`-\sin x` : math`-\frac{\sin ${kx}}{${p.k * p.k}}`) : (p.k === 1 ? math`-\cos x` : math`-\frac{\cos ${kx}}{${p.k * p.k}}`);
    const ans = trigParts(p);
    return {
      prompt: t`Evaluate ${math`\int_{${0}}^{${U}} x${fx}\,dx`} exactly.`,
      answer: { kind: 'expression', expected: trigText(ans), variables: [] },
      solution: [
        t`Take ${math`u = x`}, ${math`v' = ${fx}`}: ${math`u' = ${1}`}, ${math`v = ${v}`}.`,
        t`${math`\int x${fx}\,dx = x\left(${v}\right) - \int \left(${v}\right)dx`}, and ${math`\int \left(${v}\right)dx = ${vInt}`}, so an antiderivative is ${math`x\left(${v}\right) - \left(${vInt}\right)`}.`,
        t`Evaluate from ${0} to ${U}, using that the sines and cosines of multiples of ${math`\frac{\pi}{${2}}`} are ${0} or ${math`\pm ${1}`}: the result is ${cm(trigText(ans))}.`,
      ],
    };
  },
  solve: (p) => String(simpson((x) => x * (p.f === 'sin' ? Math.sin(p.k * x) : Math.cos(p.k * x)), 0, (p.j * Math.PI) / 2, 4000)),
  misconceptions: (p): Misconception[] => trigMis(p),
});

// ---------------------------------------------------------------- Cambridge problems

const xSinQ = auto({
  id: 'a24-q1-ii-b',
  source: cite(F24, 'Assignment 24, Q1(ii)(b)'),
  title: t`x sin x over a quarter turn`,
  prompt: t`Evaluate ${math`\int_{${0}}^{\frac{\pi}{${2}}} x\sin x\,dx`}.`,
  answer: { kind: 'exact', expected: '1' },
  solution: [
    t`Take ${math`u = x`} (it becomes ${1} when differentiated) and ${math`v' = \sin x`}, so ${math`v = -\cos x`}.`,
    t`${math`\int_{${0}}^{\frac{\pi}{${2}}} x\sin x\,dx = \left[-x\cos x\right]_{${0}}^{\frac{\pi}{${2}}} + \int_{${0}}^{\frac{\pi}{${2}}} \cos x\,dx = ${0} + \left[\sin x\right]_{${0}}^{\frac{\pi}{${2}}} = ${1}`}.`,
  ],
  reference: '1',
  verify: () => close('Simpson', simpson((x) => x * Math.sin(x), 0, Math.PI / 2), 1),
  misconceptions: [{ response: '-1', why: t`${math`-\int u'v = -\int (-\cos x)\,dx = +\int \cos x\,dx`}: two minus signs make a plus.` }],
  official: { source: cite(F24H, 'Assignment 24 hints, Q1(ii)(b)'), answer: '1', agrees: true },
});

const xExpQ = auto({
  id: 'a24-q1-ii-a',
  source: cite(F24, 'Assignment 24, Q1(ii)(a)'),
  title: t`The integral of x e to the x`,
  prompt: t`Integrate ${math`xe^{x}`}. Give the antiderivative with constant of integration ${0}.`,
  answer: { kind: 'expression', expected: '(x - 1) e^x', variables: ['x'] },
  solution: [
    t`${math`u = x`}, ${math`v' = e^{x}`}: ${math`u' = ${1}`}, ${math`v = e^{x}`}.`,
    t`${math`\int xe^{x}\,dx = xe^{x} - \int e^{x}\,dx = xe^{x} - e^{x} + c = (x - ${1})e^{x} + c`}.`,
  ],
  reference: 'x e^x - e^x',
  verify: () => agreesAt('d/dx of the answer', 'x e^x', (x) => (fn('(x - 1) e^x')(x + 1e-6) - fn('(x - 1) e^x')(x - 1e-6)) / 2e-6, [-1, 0.5, 2], 1e-5),
  misconceptions: [{ response: '(x + 1) e^x', why: t`That is the derivative of ${math`xe^{x}`}. Integrating subtracts: ${math`xe^{x} - e^{x}`}.` }],
  official: { source: cite(F24H, 'Assignment 24 hints, Q1(ii)(a)'), answer: 'x e^x - e^x', agrees: true },
});

const lnQ = auto({
  id: 'a24-q1-ii-c',
  source: cite(F24, 'Assignment 24, Q1(ii)(c)'),
  title: t`The integral of ln x`,
  prompt: t`By writing ${math`\ln x = ${1} \times \ln x`}, integrate ${math`\ln x`} (for ${math`x > ${0}`}). Give the antiderivative with constant ${0}.`,
  answer: { kind: 'expression', expected: 'x ln(x) - x', variables: ['x'], domains: { x: { kind: 'real', min: 0.5, max: 6 } } },
  solution: [
    t`${math`u = \ln x`}, ${math`v' = ${1}`}: ${math`u' = \frac{${1}}{x}`}, ${math`v = x`}.`,
    t`${math`\int \ln x\,dx = x\ln x - \int x \cdot \frac{${1}}{x}\,dx = x\ln x - x + c`}.`,
  ],
  reference: 'x ln(x) - x',
  verify: () => close('from 1 to 3', simpson(Math.log, 1, 3), value('3 ln(3) - 3') - value('1 ln(1) - 1')),
  misconceptions: [{ response: '1/x', why: t`That is the derivative of ${math`\ln x`}, not its integral.` }],
  official: { source: cite(F24H, 'Assignment 24 hints, Q1(ii)(c)'), answer: 'x ln(x) - x', agrees: true },
});

const In = (n: number): number => simpson((x) => (x < 1e-12 ? (Math.PI / 2) * (2 * n + 1) : ((Math.PI / 2 - x) * Math.sin((n + 0.5) * x)) / Math.sin(x / 2)), 0, Math.PI, 20000);
const step1998 = auto({
  id: 'a24-q3-i3',
  source: cite(F24, 'Assignment 24, Q3', true),
  title: t`STEP: a recurrence from integration by parts`,
  prompt: t`Let ${math`I_{n} = \int_{${0}}^{\pi} \left(\frac{\pi}{${2}} - x\right)\sin\left(\left(n + \frac{${1}}{${2}}\right)x\right)\operatorname{cosec}\frac{x}{${2}}\,dx`}. Given that ${math`I_{n} - I_{n - ${1}} = \frac{${2}(${1} - (-${1})^{n})}{n^{${2}}}`} for ${math`n \ge ${1}`} and ${math`I_{${0}} = ${0}`}, find ${math`I_{${3}}`}.`,
  answer: { kind: 'exact', expected: '40/9' },
  solution: [
    t`${math`I_{n} = (I_{n} - I_{n - ${1}}) + \cdots + (I_{${1}} - I_{${0}}) + I_{${0}}`}. The differences are ${4} for ${math`n = ${1}`}, ${0} for ${math`n = ${2}`}, and ${math`\frac{${4}}{${9}}`} for ${math`n = ${3}`}.`,
    t`So ${math`I_{${3}} = ${4} + ${0} + \frac{${4}}{${9}} = ${q(40, 9)}`}.`,
  ],
  reference: '40/9',
  verify: () => firstError(close('I_3 numerically', In(3), 40 / 9, 1e-6), close('I_1 numerically', In(1), 4, 1e-6), close('I_0', In(0), 0, 1e-6)),
  misconceptions: [{ response: '4/9', why: t`That is only ${math`I_{${3}} - I_{${2}}`}. Add up all the differences, back to ${math`I_{${0}} = ${0}`}.` }],
  official: { source: cite(F24H, 'Assignment 24 hints, Q3'), answer: '40/9', agrees: true, note: 'The hints give I_n as a sum, 2 times the sum of (1 - (-1)^i)/i^2 for i from 1 to n; at n = 3 that is 40/9.' },
});

const step1998full = supervision({
  id: 'a24-q3',
  source: cite(F24, 'Assignment 24, Q3'),
  title: t`STEP: the recurrence, proved`,
  prompt: t`The integral ${math`I_{n}`} is defined by ${math`I_{n} = \int_{${0}}^{\pi} \left(\frac{${1}}{${2}}\pi - x\right)\sin\left(nx + \frac{${1}}{${2}}x\right)\operatorname{cosec}\left(\frac{${1}}{${2}}x\right)dx`}, where ${math`n`} is a positive integer. Evaluate ${math`I_{n} - I_{n - ${1}}`}, and hence evaluate ${math`I_{n}`}, leaving your answer in the form of a sum.`,
  writeUp: 'proof',
  official: cite(F24H, 'Assignment 24 hints, Q3'),
});

const nstI2 = auto({
  id: 'nst-i2-i',
  source: cite(NST, 'Integration, I2(i)'),
  title: t`A finite range, then a limit`,
  prompt: t`Evaluate ${math`\int_{${0}}^{L} xe^{-x}\,dx`} for ${math`L > ${0}`}, as an expression in ${math`L`}.`,
  answer: { kind: 'expression', expected: '1 - (1 + L) e^(-L)', variables: ['L'], domains: { L: { kind: 'real', min: 0.1, max: 6 } } },
  solution: [
    t`${math`u = x`}, ${math`v' = e^{-x}`}: ${math`v = -e^{-x}`}. So ${math`\int_{${0}}^{L} xe^{-x}\,dx = \left[-xe^{-x}\right]_{${0}}^{L} + \int_{${0}}^{L} e^{-x}\,dx = -Le^{-L} + ${1} - e^{-L}`}.`,
    t`That is ${math`${1} - (${1} + L)e^{-L}`}. As ${math`L \to \infty`} it tends to ${1}.`,
  ],
  reference: '1 - e^(-L) - L e^(-L)',
  verify: () => {
    for (const L of [0.5, 2, 5]) {
      const e = close(`L = ${L}`, simpson((x) => x * Math.exp(-x), 0, L), 1 - (1 + L) * Math.exp(-L));
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [{ response: '1 - (1 - L) e^(-L)', why: t`${math`\left[-xe^{-x}\right]_{${0}}^{L} = -Le^{-L}`}: the sign of ${math`L`} follows from ${math`v = -e^{-x}`}.` }],
  official: { source: cite(NST, 'Answers to Section 1, I2(i)'), answer: '1 - (1 + L) e^(-L)', agrees: true },
});

// ---------------------------------------------------------------- lesson

export const integrationByParts: TopicContent = {
  topicId: 'calc.integration-by-parts',
  goal: t`Integrate a product by reversing the product rule, for example the integral of ${math`\ln x`}.`,
  objective: t`Integrate products such as x e to the x, x sin x, and ln x by reversing the product rule.`,
  why: t`It finds moments of densities, reduction formulae, and n factorial as an integral; STEP uses it constantly.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`Undoing the product rule` },
    { kind: 'hook', text: t`You can integrate ${math`x`} and you can integrate ${math`e^{x}`}. But ${math`\int xe^{x}\,dx`}? There is no rule for the integral of a product. Still, ${math`\frac{d}{dx}(xe^{x}) = e^{x} + xe^{x}`} contains the very thing we want. Can we turn that around?` },
    { kind: 'narrative', text: t`Rearranged, that derivative says ${math`xe^{x} = \frac{d}{dx}(xe^{x}) - e^{x}`}. Integrate both sides: ${math`\int xe^{x}\,dx = xe^{x} - e^{x} + c`}. The trick works whenever the integrand is one factor times the derivative of another.` },
    { kind: 'p', text: t`This is [[integration-by-parts|integration by parts]].` },
    { kind: 'theorem', name: t`Integration by parts`, statement: t`Let ${math`u`} and ${math`v`} have continuous derivatives on ${math`[a, b]`}. Then ${math`\int_{a}^{b} u(x)v'(x)\,dx = \left[u(x)v(x)\right]_{a}^{b} - \int_{a}^{b} u'(x)v(x)\,dx`}. Without limits, ${math`\int uv'\,dx = uv - \int u'v\,dx`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Product rule`, text: t`${math`(uv)' = u'v + uv'`}, and all three functions here are continuous on ${math`[a, b]`}.` },
        { label: t`Integrate`, text: t`By the fundamental theorem, ${math`\int_{a}^{b} (uv)'\,dx = \left[uv\right]_{a}^{b}`}, so ${math`\left[uv\right]_{a}^{b} = \int_{a}^{b} u'v\,dx + \int_{a}^{b} uv'\,dx`}.`, why: { q: t`Why may we integrate the two terms separately?`, a: t`The integral of a sum of continuous functions is the sum of the integrals: the strips add.` } },
        { label: t`Rearrange`, text: t`Subtract ${math`\int_{a}^{b} u'v\,dx`} from both sides.` },
      ],
    },
    { kind: 'section', title: t`Choosing the parts` },
    { kind: 'narrative', text: t`Everything depends on the choice. Take for ${math`u`} the factor that gets simpler when differentiated (a power of ${math`x`}, or ${math`\ln x`}), and for ${math`v'`} a factor you can integrate. Then ${math`u'v`} is easier than ${math`uv'`}.` },
    {
      kind: 'steps',
      steps: [
        { label: t`The integral of ln x`, text: t`Write ${math`\ln x = \ln x \cdot ${1}`}: ${math`u = \ln x`}, ${math`v' = ${1}`}, so ${math`u' = \frac{${1}}{x}`} and ${math`v = x`}.` },
        { label: t`Apply the rule`, text: t`${math`\int \ln x\,dx = x\ln x - \int x \cdot \frac{${1}}{x}\,dx = x\ln x - x + c`}.`, plain: t`The awkward ${math`\ln x`} was traded for ${math`\frac{${1}}{x}`}, which cancels the ${math`x`}.` },
        { label: t`Check`, text: t`${math`\frac{d}{dx}(x\ln x - x) = \ln x + x \cdot \frac{${1}}{x} - ${1} = \ln x`}.` },
      ],
    },
    { kind: 'narrative', text: t`Sometimes two rounds return the integral you started with. Take ${math`I = \int e^{x}\sin x\,dx`}, and integrate the ${math`e^{x}`} factor both times.` },
    {
      kind: 'steps',
      steps: [
        { label: t`First round`, text: t`Take ${math`u = \sin x`} and ${math`v' = e^{x}`}, so ${math`u' = \cos x`} and ${math`v = e^{x}`}:`, eq: [dmath`I = e^{x}\sin x - \int e^{x}\cos x\,dx.`] },
        { label: t`Second round`, text: t`On the new integral take ${math`u = \cos x`} and ${math`v' = e^{x}`}, so ${math`u' = -\sin x`} and ${math`v = e^{x}`}:`, eq: [dmath`\int e^{x}\cos x\,dx = e^{x}\cos x - \int e^{x}(-\sin x)\,dx = e^{x}\cos x + I.`], plain: t`The integral on the right is ${math`I`} again.` },
        { label: t`Substitute back`, text: t`Put the second line into the first:`, eq: [dmath`I = e^{x}\sin x - (e^{x}\cos x + I) = e^{x}\sin x - e^{x}\cos x - I.`] },
        { label: t`Solve for I`, text: t`Add ${math`I`} to both sides: ${math`${2}I = e^{x}(\sin x - \cos x)`}, so ${math`I = \frac{${1}}{${2}}e^{x}(\sin x - \cos x) + c`}.`, why: { q: t`Why does the constant appear only at the end?`, a: t`Each line is true up to a constant of integration, since an indefinite integral is fixed only up to one. Those constants combine into the single arbitrary ${math`c`}. Check by differentiating: ${math`\frac{${1}}{${2}}e^{x}(\sin x - \cos x) + \frac{${1}}{${2}}e^{x}(\cos x + \sin x) = e^{x}\sin x`}.` } },
      ],
    },
    { kind: 'narrative', text: t`And when the integrand depends on a whole number ${math`n`}, parts often links ${math`I_{n}`} to ${math`I_{n - ${1}}`}: a recurrence.` },
    checkFrom(xExp, { k: 2 }, t`${math`\left[\frac{xe^{${2}x}}{${2}}\right]_{${0}}^{${1}} - \left[\frac{e^{${2}x}}{${4}}\right]_{${0}}^{${1}} = \frac{e^{${2}}}{${2}} - \frac{e^{${2}} - ${1}}{${4}}`}.`),
    { kind: 'pitfall', claim: t`Either factor can be ${math`u`}; it makes no difference.`, counterexample: t`For ${math`\int xe^{x}\,dx`} with ${math`u = e^{x}`} and ${math`v' = x`}: ${math`\int xe^{x}\,dx = \frac{x^{${2}}}{${2}}e^{x} - \int \frac{x^{${2}}}{${2}}e^{x}\,dx`}, a harder integral than before. The power of ${math`x`} must be differentiated away.` },
    { kind: 'pitfall', claim: t`${math`\int uv' = uv + \int u'v`}.`, counterexample: t`With ${math`u = x`}, ${math`v' = ${1}`} on ${math`[${0}, ${1}]`}: ${math`\int_{${0}}^{${1}} x\,dx = \frac{${1}}{${2}}`}, while ${math`\left[x^{${2}}\right]_{${0}}^{${1}} + \int_{${0}}^{${1}} x\,dx = \frac{${3}}{${2}}`}. The sign is minus.` },
    { kind: 'takeaway', text: t`${math`\int uv' = uv - \int u'v`}: choose ${math`u`} to get simpler when differentiated, and check by differentiating your answer.` },
  ],
  examples: [
    { ...workedCambridge(xSinQ), examiner: t`The examiner wants ${math`u`} and ${math`v'`} stated, the sign of ${math`v = -\cos x`} right, and the limits applied to both parts.` },
    worked(xLn, { n: 1, m: 2 }, t`A power times a logarithm`),
    worked(xTrig, { f: 'cos', k: 2, j: 1 }, t`x times a cosine`),
  ],
  generators: [xExp, xLn, xTrig],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['integration-by-parts'],
  cambridge: withUses([xExpQ, lnQ, step1998, step1998full, nstI2], {
    'a24-q3': { sections: ['Choosing the parts'], note: t`A recurrence for an integral by parts, with trigonometric integrals`, needs: ['calc.standard-integrals'] },
    'a24-q3-i3': { sections: ['Choosing the parts'], note: t`Summing a given recurrence` },
    'a24-q1-ii-a': { sections: ['Undoing the product rule'], note: t`Integrating a polynomial times an exponential by parts` },
    'a24-q1-ii-c': { sections: ['Choosing the parts'], note: t`Integrating the logarithm as one times itself` },
    'nst-i2-i': { sections: ['Undoing the product rule'], note: t`A definite integral by parts` },
  }),
  // Assignment 24 Q1(ii) and NST I2(i) are integrals by parts. Assignment 24 Q3 also integrates trigonometric
  // functions, taught later, and its auto-checked part only sums a given recurrence, so both are practice.
  gate: ['a24-q1-ii-a', 'a24-q1-ii-c', 'nst-i2-i'],
  recall: [
    { front: t`State integration by parts.`, back: t`${math`\int_{a}^{b} uv'\,dx = \left[uv\right]_{a}^{b} - \int_{a}^{b} u'v\,dx`}.` },
    { front: t`What is ${math`\int \ln x\,dx`}?`, back: t`${math`x\ln x - x + c`}, by parts with ${math`u = \ln x`}, ${math`v' = ${1}`}.` },
  ],
  proofOrder: [{
    title: t`Integration by parts`,
    steps: [
      t`Start from the product rule ${math`(uv)' = u'v + uv'`}.`,
      t`Integrate from ${math`a`} to ${math`b`}: the left side gives ${math`\left[uv\right]_{a}^{b}`}.`,
      t`So ${math`\left[uv\right]_{a}^{b} = \int u'v + \int uv'`}.`,
      t`Subtract ${math`\int u'v`} from both sides.`,
    ],
  }],
};

