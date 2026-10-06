/**
 * calc.hyperbolic: cosh and sinh from e^x and e^(-x); cosh^2 - sinh^2 = 1, the addition
 * formulae, cosh 2x = 2cosh^2 x - 1, and the derivatives. STEP Support Foundation Assignment
 * 21, Q1 builds them from a^x as C(x) and S(x) (with a = e they are cosh and sinh), with the
 * Assignment 21 hints; the NST Mathematics Workbook, H1 and H2, asks for the identities and
 * the derivative of tanh. The gate adds STEP Support STEP 3 Hyperbolic Functions Q4 (2005
 * STEP III Q6, a cubic solved with cosh), first paragraph. The STEP 3 specification lists
 * hyperbolic functions.
 */
import { auto, cite, supervision } from '../cambridge';
import { add, div, int, mul, pick, q, str, sub, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { agreesAt, close, numDeriv } from '../prep-c';
import { dmath, math, t, type Rich } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

const F21 = 'step-f21' as const;
const F21H = 'step-f21-hints' as const;
const NST = 'nst-workbook' as const;
const half = (r: Rational): Rational => div(r, q(2));
/** m^k as a rational, for an integer k of either sign. */
const rp = (m: number, k: number): Rational => (k >= 0 ? q(m ** k) : q(1, m ** -k));
const coshL = (m: number, k: number): Rational => half(add(rp(m, k), rp(m, -k)));
const sinhL = (m: number, k: number): Rational => half(sub(rp(m, k), rp(m, -k)));

// ---------------------------------------------------------------- cosh and sinh of a logarithm

type Fn = 'cosh' | 'sinh';
interface EvP { f: Fn; m: number; k: number }
const evVal = ({ f, m, k }: EvP): Rational => (f === 'cosh' ? coshL(m, k) : sinhL(m, k));

const evaluateLog = generator<EvP>({
  id: 'evaluate-at-log',
  skill: 'Evaluate cosh or sinh at k ln m from the definitions, using e^(k ln m) = m^k.',
  quick: true,
  params: (rng) => ({ f: pick(rng, ['cosh', 'sinh'] as const), m: pick(rng, [2, 3, 4, 5]), k: pick(rng, [1, 1, 2]) }),
  sane: ({ m }) => (m >= 2 ? null : 'm too small'),
  problem: (p) => {
    const lnTex = p.k === 1 ? math`\ln ${p.m}` : math`${p.k}\ln ${p.m}`;
    const sign = p.f === 'cosh' ? '+' : '-';
    const name = p.f === 'cosh' ? math`\cosh` : math`\sinh`;
    return {
      prompt: t`Find the exact value of ${math`${name}(${lnTex})`}.`,
      answer: { kind: 'exact', expected: str(evVal(p)) },
      solution: [
        t`${math`e^{${lnTex}} = ${p.m}^{${p.k}} = ${rp(p.m, p.k)}`}, and ${math`e^{-${lnTex}} = ${rp(p.m, -p.k)}`}.`,
        t`So ${math`${name}(${lnTex}) = \frac{${rp(p.m, p.k)} ${sign} ${rp(p.m, -p.k)}}{${2}} = ${evVal(p)}`}.`,
      ],
    };
  },
  solve: (p) => {
    const x = p.k * Math.log(p.m);
    const v = p.f === 'cosh' ? Math.cosh(x) : Math.sinh(x);
    const den = 2 * p.m ** p.k;
    return str(q(Math.round(v * den), den));
  },
  misconceptions: (p): Misconception[] => [
    { response: str(p.f === 'cosh' ? sinhL(p.m, p.k) : coshL(p.m, p.k)), why: p.f === 'cosh' ? t`That is ${math`\sinh`}. ${math`\cosh`} adds: ${math`\cosh x = \frac{e^{x} + e^{-x}}{${2}}`}.` : t`That is ${math`\cosh`}. ${math`\sinh`} subtracts: ${math`\sinh x = \frac{e^{x} - e^{-x}}{${2}}`}.` },
    { response: str(mul(evVal(p), q(2))), why: t`Remember the ${math`\frac{${1}}{${2}}`} in the definition.` },
  ],
});

// ---------------------------------------------------------------- solving cosh x = c or sinh x = s

interface SolP { f: Fn; a: number }
const solveHyp = generator<SolP>({
  id: 'solve-for-exp',
  skill: 'Solve cosh x = c or sinh x = s as a quadratic in e^x, keeping only positive values of e^x.',
  params: (rng) => ({ f: pick(rng, ['cosh', 'sinh'] as const), a: int(rng, 2, 7) }),
  sane: ({ a }) => (a >= 2 ? null : 'a too small'),
  problem: ({ f, a }) => {
    const c = f === 'cosh' ? half(add(q(a), q(1, a))) : half(sub(q(a), q(1, a)));
    const sign = f === 'cosh' ? '+' : '-';
    return {
      prompt: f === 'cosh'
        ? t`Solve ${math`\cosh x = ${c}`}. Give the larger of the two possible values of ${math`e^{x}`}.`
        : t`Solve ${math`\sinh x = ${c}`}. Give the value of ${math`e^{x}`}.`,
      answer: { kind: 'exact', expected: String(a) },
      solution: [
        t`Put ${math`u = e^{x} > ${0}`}: ${math`\frac{u ${sign} u^{-${1}}}{${2}} = ${c}`}. Multiply by ${math`${2}u`}: ${math`u^{${2}} - ${mul(q(2), c)}u ${sign} ${1} = ${0}`}.`,
        f === 'cosh'
          ? t`This factorises as ${math`(u - ${a})\left(u - ${q(1, a)}\right) = ${0}`}. Both roots are positive, so ${math`x = \pm\ln ${a}`}; the larger ${math`e^{x}`} is ${a}.`
          : t`This factorises as ${math`(u - ${a})\left(u + ${q(1, a)}\right) = ${0}`}. ${math`e^{x}`} cannot be negative, so ${math`e^{x} = ${a}`} and ${math`x = \ln ${a}`}.`,
      ],
    };
  },
  solve: ({ f, a }) => {
    const c = f === 'cosh' ? (a + 1 / a) / 2 : (a - 1 / a) / 2;
    const x = f === 'cosh' ? Math.acosh(c) : Math.asinh(c);
    return String(Math.round(Math.exp(x)));
  },
  misconceptions: ({ f, a }): Misconception[] => f === 'cosh'
    ? [
      { response: str(q(1, a)), why: t`That is the smaller root: ${math`e^{x} = ${q(1, a)}`} gives ${math`x = -\ln ${a}`}. The question asks for the larger.` },
      { response: str(half(add(q(a), q(1, a)))), why: t`That is ${math`\cosh x`} itself. Solve the quadratic in ${math`u = e^{x}`}.` },
    ]
    : [
      { response: str(q(-1, a)), why: t`${math`e^{x}`} is always positive, so the negative root of the quadratic gives no solution.` },
      { response: str(q(1, a)), why: t`${math`e^{x} = ${q(1, a)}`} gives ${math`\sinh x`} negative. Check the sign of the constant term: ${math`u^{${2}} - ${2}su - ${1} = ${0}`}.` },
    ],
});

// ---------------------------------------------------------------- a derivative at a point

interface DerP { A: number; B: number; k: number; m: number }
const derAt = ({ A, B, k, m }: DerP): Rational => add(mul(q(A * k), sinhL(m, k)), mul(q(B * k), coshL(m, k)));

const derivative = generator<DerP>({
  id: 'derivative-at-log',
  skill: 'Differentiate A cosh kx + B sinh kx (cosh gives k sinh, sinh gives k cosh, no minus sign) and evaluate at x = ln m.',
  params: (rng) => {
    for (;;) {
      const p: DerP = { A: pick(rng, [-3, -2, -1, 1, 2, 3, 4]), B: pick(rng, [-3, -2, -1, 1, 2, 3]), k: pick(rng, [1, 2]), m: pick(rng, [2, 3]) };
      const right = str(derAt(p));
      const w1 = str(derAt({ ...p, A: -p.A }));
      const w2 = str(div(derAt(p), q(p.k)));
      if (new Set([right, w1, w2]).size === 3) return p;
    }
  },
  sane: ({ A, B }) => (A !== 0 && B !== 0 ? null : 'degenerate'),
  problem: (p) => {
    const kx: Rich = p.k === 1 ? t`${math`x`}` : t`${math`${p.k}x`}`;
    return {
      prompt: t`Let ${math`f(x) = ${p.A}\cosh ${kx} ${p.B < 0 ? '-' : '+'} ${Math.abs(p.B)}\sinh ${kx}`}. Find the exact value of ${math`f'(\ln ${p.m})`}.`,
      answer: { kind: 'exact', expected: str(derAt(p)) },
      solution: [
        t`${math`\frac{d}{dx}\cosh kx = k\sinh kx`} and ${math`\frac{d}{dx}\sinh kx = k\cosh kx`}, so ${math`f'(x) = ${p.A * p.k}\sinh ${kx} ${p.B < 0 ? '-' : '+'} ${Math.abs(p.B * p.k)}\cosh ${kx}`}.`,
        t`At ${math`x = \ln ${p.m}`}: ${math`\sinh(${p.k}\ln ${p.m}) = ${sinhL(p.m, p.k)}`} and ${math`\cosh(${p.k}\ln ${p.m}) = ${coshL(p.m, p.k)}`}, so ${math`f'(\ln ${p.m}) = ${derAt(p)}`}.`,
      ],
    };
  },
  solve: (p) => {
    const f = (x: number): number => p.A * Math.cosh(p.k * x) + p.B * Math.sinh(p.k * x);
    const den = 2 * p.m ** p.k;
    return str(q(Math.round(numDeriv(f, Math.log(p.m), 1e-6) * den), den));
  },
  misconceptions: (p): Misconception[] => [
    { response: str(derAt({ ...p, A: -p.A })), why: t`Unlike ${math`\cos`}, ${math`\cosh`} differentiates to ${math`+\sinh`}: ${math`\frac{d}{dx}\frac{e^{x} + e^{-x}}{${2}} = \frac{e^{x} - e^{-x}}{${2}}`}, no minus sign.` },
    { response: str(div(derAt(p), q(p.k))), why: t`The chain rule brings down the ${math`k`}: ${math`\frac{d}{dx}e^{kx} = ke^{kx}`}.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const C = (a: number, x: number): number => (a ** x + a ** -x) / 2;
const S = (a: number, x: number): number => (a ** x - a ** -x) / 2;

const doubleQ = auto({
  id: 'a21-q1-i-double',
  source: cite(F21, 'Assignment 21, Q1(i)'),
  title: t`The double angle formula for C`,
  prompt: t`Let ${math`C(x) = \frac{${1}}{${2}}(a^{x} + a^{-x})`} and ${math`S(x) = \frac{${1}}{${2}}(a^{x} - a^{-x})`}, for a fixed ${math`a > ${0}`}. Given that ${math`C(x)^{${2}} - S(x)^{${2}} = ${1}`} and ${math`C(x)C(y) + S(x)S(y) = C(x + y)`}, express ${math`C(${2}x)`} in terms of ${math`c = C(x)`}.`,
  answer: { kind: 'expression', expected: '2c^2 - 1', variables: ['c'] },
  solution: [
    t`Put ${math`y = x`} in the addition formula: ${math`C(${2}x) = C(x)^{${2}} + S(x)^{${2}}`}.`,
    t`From the first identity, ${math`S(x)^{${2}} = C(x)^{${2}} - ${1}`}. So ${math`C(${2}x) = ${2}C(x)^{${2}} - ${1} = ${2}c^{${2}} - ${1}`}.`,
  ],
  reference: '2c^2 - 1',
  verify: () => {
    for (const [a, x] of [[2, 0.7], [5, -1.3], [0.5, 2]] as const) {
      const e = close(`C(2x) for a = ${a}, x = ${x}`, C(a, 2 * x), 2 * C(a, x) ** 2 - 1);
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [{ response: '2c^2', why: t`${math`S(x)^{${2}} = C(x)^{${2}} - ${1}`}, so ${math`C^{${2}} + S^{${2}} = ${2}C^{${2}} - ${1}`}: keep the ${math`-${1}`}.` }],
  official: { source: cite(F21H, 'Assignment 21 hints, Q1(i)'), answer: '2c^2 - 1', agrees: true },
});

const secondQ = auto({
  id: 'a21-q1-iii',
  source: cite(F21, 'Assignment 21, Q1(iii)', true),
  title: t`The differential equation C satisfies`,
  prompt: t`With ${math`C`} and ${math`S`} as above, you are given that ${math`\frac{d}{dx}a^{x} = Ka^{x}`} and ${math`\frac{d}{dx}a^{-x} = -Ka^{-x}`}, where ${math`K`} is a constant. Find ${math`\frac{C''(x)}{C(x)}`} in terms of ${math`K`}.`,
  answer: { kind: 'expression', expected: 'K^2', variables: ['K'] },
  solution: [
    t`${math`C'(x) = \frac{${1}}{${2}}(Ka^{x} - Ka^{-x}) = KS(x)`}, and in the same way ${math`S'(x) = \frac{${1}}{${2}}(Ka^{x} + Ka^{-x}) = KC(x)`}.`,
    t`So ${math`C''(x) = KS'(x) = K^{${2}}C(x)`}, and ${math`\frac{C''(x)}{C(x)} = K^{${2}}`}. (In fact ${math`K = \ln a`}, and with ${math`a = e`} this is ${math`\cosh'' = \cosh`}.)`,
  ],
  reference: 'K^2',
  verify: () => {
    const a = 3;
    const x = 0.4;
    const h = 1e-4;
    const second = (C(a, x + h) - 2 * C(a, x) + C(a, x - h)) / (h * h);
    return close('C\'\'/C against (ln a)^2', second / C(a, x), Math.log(a) ** 2, 1e-5);
  },
  misconceptions: [{ response: '-K^2', why: t`Each differentiation brings a factor ${math`K`} and swaps ${math`C`} and ${math`S`} with no minus sign, unlike cosine: ${math`C'' = K^{${2}}C`}.` }],
  official: { source: cite(F21H, 'Assignment 21 hints, Q1(iii)'), answer: 'K^2', agrees: true },
});

const coshDeriv = auto({
  id: 'a21-q1-iii-derivative',
  source: cite(F21, 'Assignment 21, Q1(iii)', true),
  title: t`The derivative of cosh, written out`,
  prompt: t`With ${math`a = e`}, ${math`C(x) = \cosh x = \frac{e^{x} + e^{-x}}{${2}}`}. Find ${math`\frac{d}{dx}\cosh x`} as an expression in ${math`e^{x}`} and ${math`e^{-x}`}.`,
  answer: { kind: 'expression', expected: '(e^x - e^(-x))/2', variables: ['x'] },
  solution: [
    t`${math`\frac{d}{dx}e^{x} = e^{x}`} and ${math`\frac{d}{dx}e^{-x} = -e^{-x}`}.`,
    t`So ${math`\frac{d}{dx}\cosh x = \frac{e^{x} - e^{-x}}{${2}} = \sinh x`}.`,
  ],
  reference: '(exp(x) - exp(-x))/2',
  verify: () => agreesAt('derivative of cosh', '(e^x - e^(-x))/2', (x) => numDeriv(Math.cosh, x), [-2, 0.3, 1.7]),
  misconceptions: [{ response: '(e^(-x) - e^x)/2', why: t`That is ${math`-\sinh x`}. The derivative of ${math`e^{-x}`} is ${math`-e^{-x}`}, so the ${math`e^{x}`} term keeps its plus sign.` }],
});

const identities = supervision({
  id: 'a21-q1-i',
  source: cite(F21, 'Assignment 21, Q1(i)'),
  title: t`The identities for C and S`,
  prompt: t`Let ${math`C(x) = \frac{${1}}{${2}}(a^{x} + a^{-x})`} and ${math`S(x) = \frac{${1}}{${2}}(a^{x} - a^{-x})`}, where ${math`a`} is a fixed positive real number. Show, using these definitions, that (a) ${math`C(x)^{${2}} - S(x)^{${2}} = ${1}`}; (b) ${math`C(x)C(y) + S(x)S(y) = C(x + y)`}; (c) ${math`C(x)S(y) + S(x)C(y) = S(x + y)`}. Deduce an expression for ${math`C(${2}x)`} in terms of ${math`C(x)`}.`,
  writeUp: 'proof',
  official: cite(F21H, 'Assignment 21 hints, Q1(i)'),
});

const nstH = supervision({
  id: 'nst-h1-h2',
  source: cite(NST, 'Section 2, Hyperbolic functions, H1, H2'),
  title: t`Hyperbolic identities and tanh`,
  prompt: t`State the definitions of ${math`\sinh x`} and ${math`\cosh x`}. Prove that ${math`\cosh^{${2}} x - \sinh^{${2}} x = ${1}`} and ${math`\sinh ${2}x = ${2}\sinh x\cosh x`}. Prove that ${math`\frac{d}{dx}\tanh x = \operatorname{sech}^{${2}} x`}.`,
  writeUp: 'proof',
});

// STEP Support STEP 3 Hyperbolic Functions Q4 (2005 STEP III Q6), first paragraph: a cubic
// solved with cosh. The rest of the question needs complex numbers, not a prerequisite.
const HYP = 'step-s3-hyp' as const;
const HYPS = 'step-s3-hyp-solutions' as const;

const hyp4 = supervision({
  id: 's3hyp-q4',
  source: cite(HYP, 'Q4 (2005 STEP III Q6), first paragraph'),
  title: t`A cubic solved by ${math`\cosh`}`,
  prompt: t`In this question, you may use without proof the results ${dmath`${4}\cosh^{${3}} y - ${3}\cosh y = \cosh(${3}y) \quad \text{and} \quad \operatorname{arcosh} y = \ln\left(y + \sqrt{y^{${2}} - ${1}}\right).`} Show that the equation ${math`x^{${3}} - ${3}a^{${2}}x = ${2}a^{${3}}\cosh T`} is satisfied by ${math`${2}a\cosh\left(\frac{${1}}{${3}}T\right)`} and hence that, if ${math`c^{${2}} \ge b^{${3}} > ${0}`}, one of the roots of the equation ${math`x^{${3}} - ${3}bx = ${2}c`} is ${math`u + \frac{b}{u}`}, where ${math`u = \left(c + \sqrt{c^{${2}} - b^{${3}}}\right)^{\frac{${1}}{${3}}}`}.`,
  writeUp: 'proof',
  official: cite(HYPS, 'Q4'),
});

const ROOT = '2^(2/3) + 2^(1/3)';
const hyp4root = auto({
  id: 's3hyp-q4-root',
  source: cite(HYP, 'Q4 (2005 STEP III Q6), last line', true),
  title: t`The real root of ${math`x^{${3}} - ${6}x = ${6}`}`,
  prompt: t`If ${math`c^{${2}} \ge b^{${3}} > ${0}`}, one root of ${math`x^{${3}} - ${3}bx = ${2}c`} is ${math`u + \frac{b}{u}`}, where ${math`u = \left(c + \sqrt{c^{${2}} - b^{${3}}}\right)^{\frac{${1}}{${3}}}`}. Use this to find the real root of ${math`x^{${3}} - ${6}x = ${6}`} exactly.`,
  answer: { kind: 'expression', expected: ROOT, variables: [] },
  solution: [
    t`Match ${math`x^{${3}} - ${6}x = ${6}`} with ${math`x^{${3}} - ${3}bx = ${2}c`}: ${math`b = ${2}`} and ${math`c = ${3}`}, and ${math`c^{${2}} = ${9} \ge ${8} = b^{${3}} > ${0}`}.`,
    t`${math`u = (${3} + \sqrt{${9} - ${8}})^{\frac{${1}}{${3}}} = ${4}^{\frac{${1}}{${3}}} = ${2}^{\frac{${2}}{${3}}}`}, and ${math`\frac{b}{u} = \frac{${2}}{${2}^{\frac{${2}}{${3}}}} = ${2}^{\frac{${1}}{${3}}}`}.`,
    t`So the root is ${math`${2}^{\frac{${2}}{${3}}} + ${2}^{\frac{${1}}{${3}}}`}, about ${Number((2 ** (2 / 3) + 2 ** (1 / 3)).toFixed(4))}. It is the only real root: ${math`x^{${3}} - ${6}x - ${6}`} has its turning points at ${math`x = \pm\sqrt{${2}}`}, where it is ${math`-${6} \pm ${4}\sqrt{${2}}`}, both negative, so it crosses the axis once.`,
  ],
  reference: ROOT,
  verify: () => {
    const x = 2 ** (2 / 3) + 2 ** (1 / 3);
    const e = close('root', x ** 3 - 6 * x, 6, 1e-12);
    if (e !== null) return e;
    // Both turning values are negative, so there is exactly one real root.
    const f = (y: number): number => y ** 3 - 6 * y - 6;
    return f(-Math.SQRT2) < 0 && f(Math.SQRT2) < 0 ? null : 'more than one real root';
  },
  misconceptions: [
    { response: '4^(1/3) + 2/3^(1/3)', why: t`${math`u`} is ${math`(c + \sqrt{c^{${2}} - b^{${3}}})^{\frac{${1}}{${3}}}`} with ${math`c = ${3}`} and ${math`b = ${2}`}: the bracket is ${math`${3} + ${1} = ${4}`}, and then ${math`\frac{b}{u} = \frac{${2}}{${4}^{\frac{${1}}{${3}}}}`}.` },
    { response: '9/2', why: t`That takes ${math`u = ${4}`}. The root is ${math`u + \frac{b}{u}`} with ${math`u = ${4}^{\frac{${1}}{${3}}}`}, the cube root of the bracket.` },
  ],
  official: { source: cite(HYPS, 'Q4'), answer: ROOT, agrees: true },
});

// ---------------------------------------------------------------- lesson

export const hyperbolic: TopicContent = {
  topicId: 'calc.hyperbolic',
  goal: t`Define ${math`\cosh x`} and ${math`\sinh x`} from ${math`e^{x}`} and ${math`e^{-x}`}, prove ${math`\cosh^{${2}} x - \sinh^{${2}} x = ${1}`} and the addition formulae, and differentiate them.`,
  objective: t`Define cosh and sinh, prove their identities from the definitions, and differentiate them.`,
  why: t`They are on the STEP ${3} specification and run through integration, differential equations, and IA.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`Even and odd parts of the exponential` },
    { kind: 'hook', text: t`${math`\cos^{${2}} x + \sin^{${2}} x = ${1}`} puts the point ${math`(\cos x, \sin x)`} on a circle. Is there a pair of functions that puts a point on the hyperbola ${math`X^{${2}} - Y^{${2}} = ${1}`} instead, with its own addition formulae and derivatives? There is, and it is built from nothing but ${math`e^{x}`}.` },
    { kind: 'narrative', text: t`Any function splits into an even part and an odd part: ${math`f(x) = \frac{f(x) + f(-x)}{${2}} + \frac{f(x) - f(-x)}{${2}}`}. Do this to ${math`e^{x}`}.` },
    { kind: 'definition', name: t`Hyperbolic cosine and sine`, formal: t`For real ${math`x`}, ${math`\cosh x = \frac{e^{x} + e^{-x}}{${2}}`} and ${math`\sinh x = \frac{e^{x} - e^{-x}}{${2}}`}; and ${math`\tanh x = \frac{\sinh x}{\cosh x}`}. These are the [[hyperbolic-functions|hyperbolic functions]].`, plain: t`${math`\cosh`} is the average of ${math`e^{x}`} and ${math`e^{-x}`}; ${math`\sinh`} is half their difference. At ${math`x = \ln ${2}`}: ${math`e^{x} = ${2}`}, ${math`e^{-x} = ${q(1, 2)}`}, so ${math`\cosh x = ${coshL(2, 1)}`} and ${math`\sinh x = ${sinhL(2, 1)}`}.` },
    { kind: 'narrative', text: t`${math`\cosh`} is even (${math`\cosh(-x) = \cosh x`}) with ${math`\cosh ${0} = ${1}`} and ${math`\cosh x \ge ${1}`}: the shape of a hanging chain. ${math`\sinh`} is odd, ${0} at ${0}, increasing everywhere. And ${math`\cosh x + \sinh x = e^{x}`}.` },
    checkFrom(evaluateLog, { f: 'cosh', m: 3, k: 1 }, t`${math`\cosh(\ln ${3}) = \frac{${3} + \frac{${1}}{${3}}}{${2}} = ${coshL(3, 1)}`}.`),
    { kind: 'section', title: t`The identities` },
    { kind: 'theorem', name: t`The hyperbolic Pythagoras`, statement: t`For every real ${math`x`}, ${math`\cosh^{${2}} x - \sinh^{${2}} x = ${1}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Square cosh`, text: t`${math`\cosh^{${2}} x = \frac{e^{${2}x} + ${2} + e^{-${2}x}}{${4}}`}.`, why: { q: t`Where does the ${2} come from?`, a: t`The cross term: ${math`${2} \cdot e^{x} \cdot e^{-x} = ${2}e^{${0}} = ${2}`}. Note ${math`(e^{x})^{${2}} = e^{${2}x}`}, not ${math`e^{x^{${2}}}`}.` } },
        { label: t`Square sinh`, text: t`${math`\sinh^{${2}} x = \frac{e^{${2}x} - ${2} + e^{-${2}x}}{${4}}`}.` },
        { label: t`Subtract`, text: t`The ${math`e^{\pm ${2}x}`} terms cancel, leaving ${math`\frac{${2} - (-${2})}{${4}} = ${1}`}.` },
      ],
    },
    { kind: 'theorem', name: t`Addition formulae`, statement: t`For all real ${math`x, y`}: ${math`\cosh(x + y) = \cosh x\cosh y + \sinh x\sinh y`} and ${math`\sinh(x + y) = \sinh x\cosh y + \cosh x\sinh y`}. In particular ${math`\cosh ${2}x = ${2}\cosh^{${2}} x - ${1}`} and ${math`\sinh ${2}x = ${2}\sinh x\cosh x`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Expand the products`, text: t`${math`\cosh x\cosh y = \frac{e^{x + y} + e^{x - y} + e^{-x + y} + e^{-x - y}}{${4}}`} and ${math`\sinh x\sinh y = \frac{e^{x + y} - e^{x - y} - e^{-x + y} + e^{-x - y}}{${4}}`}.` },
        { label: t`Add`, text: t`The mixed terms cancel: the sum is ${math`\frac{${2}e^{x + y} + ${2}e^{-(x + y)}}{${4}} = \cosh(x + y)`}.` },
        { label: t`The sine formula`, text: t`The same expansion for ${math`\sinh x\cosh y + \cosh x\sinh y`} leaves ${math`\frac{e^{x + y} - e^{-(x + y)}}{${2}} = \sinh(x + y)`}.` },
        { label: t`Double`, text: t`Put ${math`y = x`}: ${math`\cosh ${2}x = \cosh^{${2}} x + \sinh^{${2}} x`}, and ${math`\sinh^{${2}} x = \cosh^{${2}} x - ${1}`} turns it into ${math`${2}\cosh^{${2}} x - ${1}`}.` },
      ],
    },
    { kind: 'pitfall', claim: t`Hyperbolic identities are the trigonometric ones with ${math`\cos`} and ${math`\sin`} replaced.`, counterexample: t`${math`\cos^{${2}} + \sin^{${2}} = ${1}`}, but ${math`\cosh^{${2}} + \sinh^{${2}} = \cosh ${2}x`}, which at ${math`x = \ln ${2}`} is ${coshL(2, 2)}, not ${1}. A product of two sines changes sign (Osborn's rule): ${math`\cos^{${2}} + \sin^{${2}} = ${1}`} becomes ${math`\cosh^{${2}} - \sinh^{${2}} = ${1}`}.` },
    { kind: 'section', title: t`Derivatives` },
    { kind: 'theorem', name: t`Derivatives`, statement: t`${math`\frac{d}{dx}\cosh x = \sinh x`}, ${math`\frac{d}{dx}\sinh x = \cosh x`}, and ${math`\frac{d}{dx}\tanh x = \frac{${1}}{\cosh^{${2}} x}`}.` },
    { kind: 'p', text: t`The first two come straight from ${math`\frac{d}{dx}e^{x} = e^{x}`} and ${math`\frac{d}{dx}e^{-x} = -e^{-x}`}: differentiating ${math`\frac{e^{x} + e^{-x}}{${2}}`} gives ${math`\frac{e^{x} - e^{-x}}{${2}}`}. No minus sign appears, unlike ${math`\frac{d}{dx}\cos x = -\sin x`}. The third follows by the quotient rule and the hyperbolic Pythagoras.`, why: { q: t`How does the quotient rule give ${math`\tanh`}?`, a: t`${math`\frac{\cosh x \cdot \cosh x - \sinh x \cdot \sinh x}{\cosh^{${2}} x} = \frac{${1}}{\cosh^{${2}} x}`}.` } },
    { kind: 'narrative', text: t`Differentiate twice and you come back to where you started: ${math`\frac{d^{${2}}}{dx^{${2}}}\cosh x = \frac{d}{dx}\sinh x = \cosh x`}, while ${math`\frac{d^{${2}}}{dx^{${2}}}\cos x = -\cos x`}. That missing minus sign is the main difference between the derivatives of the two families.` },
    { kind: 'pitfall', claim: t`${math`\frac{d}{dx}\cosh x = -\sinh x`}, as for cosine.`, counterexample: t`At ${math`x = \ln ${2}`}, ${math`\cosh`} is increasing (it is least at ${0}); its gradient is ${math`\sinh(\ln ${2}) = ${sinhL(2, 1)}`}, positive.` },
    { kind: 'takeaway', text: t`${math`\cosh`} and ${math`\sinh`} are the even and odd halves of ${math`e^{x}`}: prove every identity by expanding exponentials, and differentiate with no change of sign.` },
  ],
  examples: [
    { ...workedCambridge(doubleQ), examiner: t`The examiner looks for the addition formula used with ${math`y = x`}, then the first identity to remove ${math`S`}, with each step stated.` },
    worked(solveHyp, { f: 'sinh', a: 3 }, t`Solving a sinh equation`),
    worked(derivative, { A: 2, B: -1, k: 2, m: 2 }, t`Differentiating, then evaluating at a logarithm`),
  ],
  generators: [evaluateLog, solveHyp, derivative],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['hyperbolic-functions'],
  cambridge: [hyp4, hyp4root, secondQ, coshDeriv, identities, nstH],
  // Best first: 2005 STEP III Q6, first paragraph (with official solutions), then Assignment 21
  // Q1(iii), then the auto-checked real root of x^3 - 6x = 6.
  gate: ['s3hyp-q4', 'a21-q1-iii', 's3hyp-q4-root'],
  recall: [
    { front: t`Define ${math`\cosh x`} and ${math`\sinh x`}.`, back: t`${math`\cosh x = \frac{e^{x} + e^{-x}}{${2}}`}, ${math`\sinh x = \frac{e^{x} - e^{-x}}{${2}}`}.` },
    { front: t`What is ${math`\cosh^{${2}} x - \sinh^{${2}} x`}?`, back: t`${1}, for every ${math`x`}.` },
    { front: t`Differentiate ${math`\cosh x`} and ${math`\sinh x`}.`, back: t`${math`\sinh x`} and ${math`\cosh x`}: no minus sign.` },
  ],
  proofOrder: [{
    title: t`Cosh squared minus sinh squared is one`,
    steps: [
      t`${math`\cosh^{${2}} x = \frac{e^{${2}x} + ${2} + e^{-${2}x}}{${4}}`}.`,
      t`${math`\sinh^{${2}} x = \frac{e^{${2}x} - ${2} + e^{-${2}x}}{${4}}`}.`,
      t`Subtract: the exponential terms cancel.`,
      t`What is left is ${math`\frac{${4}}{${4}} = ${1}`}.`,
    ],
  }],
};

