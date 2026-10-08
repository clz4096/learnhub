/**
 * calc.differentiation-rules: the product rule (proved from the definition), the chain rule
 * (proved with the linear approximation of STEP Support Assignment 23, made exact), and the
 * quotient rule (from the other two). The Cambridge problems are STEP Support Foundation
 * Assignment 22, Q1 and Q2(iii), Assignment 23, Q1, Assignment 25, Q2(iv), with their hints,
 * and STEP 2 Statistics Q3 (2011 S2 Q12), whose derivative dw/dp and the turning value
 * p = 2 - sqrt 3 are compared with the official solution. The gate adds STEP Support STEP 2
 * Calculus Q1 (2005 STEP II Q1), STEP I 1994 Q2(iv), (v) (STEP Questions Database), and IA
 * Differential Equations Example Sheet 1, Q3(ii) (DAMTP).
 */
import { auto, cite, supervision, withUses } from '../cambridge';
import { int, pick, q, str } from '../math';
import { generator, type Misconception } from '../problem';
import { poly } from '../poly';
import { agreesAt, close, firstError, numDeriv } from '../prep-c';
import { computedMath as cm, math, t, type Rich } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

const F22 = 'step-f22' as const;
const F22H = 'step-f22-hints' as const;
const F23 = 'step-f23' as const;
const F23H = 'step-f23-hints' as const;
const F25 = 'step-f25' as const;
const F25H = 'step-f25-hints' as const;
const S2 = 'step-s2-stats' as const;
const S2S = 'step-s2-stats-solutions' as const;
const DOM = { x: { kind: 'real' as const, min: 0.5, max: 3 } };
const P01 = { p: { kind: 'real' as const, min: 0.05, max: 0.95 } };
const pw = (n: number): string => (n === 1 ? 'x' : `x^${n}`);

// ---------------------------------------------------------------- the product rule

interface ProdP { n: number; k: number }
const product = generator<ProdP>({
  id: 'product-rule',
  skill: 'Differentiate x^n e^(kx) with the product rule: u\'v + uv\'.',
  params: (rng) => ({ n: pick(rng, [1, 2, 3, 4]), k: pick(rng, [-3, -2, -1, 2, 3, 5]) }),
  sane: ({ n, k }) => (n >= 1 && k !== 0 && k !== 1 ? null : 'degenerate'),
  problem: ({ n, k }) => ({
    prompt: t`Differentiate ${math`y = ${cm(pw(n))}e^{${k === -1 ? '-' : k}x}`}.`,
    answer: { kind: 'expression', expected: `(${n}*${n === 1 ? '1' : pw(n - 1)} + ${k}*${pw(n)})*e^(${k}x)`, variables: ['x'], domains: DOM },
    solution: [
      t`Take ${math`u = ${cm(pw(n))}`} and ${math`v = e^{${k === -1 ? '-' : k}x}`}, so ${math`u' = ${n === 1 ? t`${1}` : cm(`${n}${pw(n - 1)}`)}`} and ${math`v' = ${k}e^{${k === -1 ? '-' : k}x}`}.`,
      t`By the product rule, ${math`\frac{dy}{dx} = u'v + uv' = ${n === 1 ? t`${1}` : cm(`${n}${pw(n - 1)}`)}e^{${k === -1 ? '-' : k}x} ${k < 0 ? '-' : '+'} ${cm(`${Math.abs(k)}${pw(n)}`)}e^{${k === -1 ? '-' : k}x} = (${cm(poly([k, n, ...Array<number>(n - 1).fill(0)]))})e^{${k === -1 ? '-' : k}x}`}${n > 1 ? t`, which is ${math`${cm(pw(n - 1))}(${cm(poly([k, n]))})e^{${k === -1 ? '-' : k}x}`}` : t``}.`,
    ],
  }),
  // The derivative read off from the series-free definition: a numerical check, then the closed form it matches.
  solve: ({ n, k }) => `x^${n - 1}*(${n} + ${k}*x)*exp(${k}*x)`,
  misconceptions: ({ n, k }): Misconception[] => [
    { response: `${n * k}*${n === 1 ? '1' : pw(n - 1)}*e^(${k}x)`, why: t`The derivative of a product is not the product of the derivatives. Use ${math`(uv)' = u'v + uv'`}.` },
    { response: `${k}*${pw(n)}*e^(${k}x)`, why: t`That is only ${math`uv'`}. Add ${math`u'v`}: the ${math`x^{n}`} factor changes too.` },
  ],
});

// ---------------------------------------------------------------- the chain rule

type Outer = 'power' | 'ln' | 'exp';
interface ChainP { outer: Outer; a: number; m: number; b: number; p: number }
const inner = ({ a, m, b }: ChainP): string => `${a}*x^${m} + ${b}`;
const innerD = ({ a, m }: ChainP): string => `${a * m}*${m === 1 ? '1' : pw(m - 1)}`;
const chainAnswer = (c: ChainP): string => {
  switch (c.outer) {
    case 'power': return `${c.p}*(${inner(c)})^(${c.p - 1})*${innerD(c)}`;
    case 'ln': return `${innerD(c)}/(${inner(c)})`;
    case 'exp': return `${innerD(c)}*e^(${inner(c)})`;
  }
};
const chain = generator<ChainP>({
  id: 'chain-rule',
  skill: 'Differentiate a function of a function: the outer derivative at the inner function, times the inner derivative.',
  params: (rng) => ({ outer: pick(rng, ['power', 'power', 'ln', 'exp'] as const), a: pick(rng, [1, 2, 3]), m: pick(rng, [2, 3]), b: int(rng, 1, 5), p: pick(rng, [2, 3, 4, 5, -1]) }),
  sane: ({ a, b }) => (a > 0 && b > 0 ? null : 'the inner function must stay positive'),
  problem: (c) => {
    const g = cm(poly([c.a, ...Array<number>(c.m - 1).fill(0), c.b]));
    const gd = cm(`${c.a * c.m}${pw(c.m - 1)}`);
    const show: Rich = c.outer === 'power' ? t`${math`(${g})^{${c.p}}`}` : c.outer === 'ln' ? t`${math`\ln(${g})`}` : t`${math`e^{${g}}`}`;
    const outerD: Rich = c.outer === 'power' ? t`${math`f(u) = u^{${c.p}}`}, ${math`f'(u) = ${c.p}u^{${c.p - 1}}`}` : c.outer === 'ln' ? t`${math`f(u) = \ln u`}, ${math`f'(u) = \frac{${1}}{u}`}` : t`${math`f(u) = e^{u}`}, ${math`f'(u) = e^{u}`}`;
    return {
      prompt: t`Differentiate ${math`y = `}${show} with respect to ${math`x`}.`,
      answer: { kind: 'expression', expected: chainAnswer(c), variables: ['x'], domains: DOM },
      solution: [
        t`The inside is ${math`u = ${g}`}, with ${math`\frac{du}{dx} = ${gd}`}. The outside is ${outerD}.`,
        t`By the chain rule, ${math`\frac{dy}{dx} = f'(u)\frac{du}{dx} = ${cm(chainAnswer(c))}`}.`,
      ],
    };
  },
  // A numerical derivative cannot be typed, so the reference is the chain rule written the other way round: inner derivative first.
  solve: (c) => {
    switch (c.outer) {
      case 'power': return `${innerD(c)}*${c.p}*(${inner(c)})^${c.p - 1 < 0 ? `(${c.p - 1})` : c.p - 1}`;
      case 'ln': return `(${innerD(c)})*(${inner(c)})^(-1)`;
      case 'exp': return `exp(${inner(c)})*(${innerD(c)})`;
    }
  },
  misconceptions: (c): Misconception[] => {
    const noInner = c.outer === 'power' ? `${c.p}*(${inner(c)})^(${c.p - 1})` : c.outer === 'ln' ? `1/(${inner(c)})` : `e^(${inner(c)})`;
    const other = c.outer === 'power' ? `${c.p}*(${innerD(c)})^(${c.p - 1})` : c.outer === 'ln' ? `${innerD(c)}*ln(${inner(c)})` : `(${inner(c)})*e^(${inner(c)} - 1)`;
    return [
      { response: noInner, why: t`Multiply by the derivative of the inside, ${math`\frac{du}{dx}`}. That factor is what the chain rule adds.` },
      { response: other, why: c.outer === 'power' ? t`Raise the inside function to the power, not its derivative: ${math`p\,u^{p - ${1}}\frac{du}{dx}`}.` : c.outer === 'ln' ? t`The derivative of ${math`\ln u`} is ${math`\frac{${1}}{u}`}, so divide by the inside.` : t`${math`e^{u}`} is not a power of ${math`u`}; its derivative is ${math`e^{u}\frac{du}{dx}`}.` },
    ];
  },
});

// ---------------------------------------------------------------- the quotient rule

interface QuoP { a: number; b: number; c: number; d: number }
const quotient = generator<QuoP>({
  id: 'quotient-rule',
  skill: 'Differentiate (ax + b)/(cx + d) with the quotient rule: (u\'v - uv\')/v^2.',
  quick: true,
  params: (rng) => {
    for (;;) {
      const p: QuoP = { a: pick(rng, [1, 2, 3, -1]), b: int(rng, -5, 5), c: pick(rng, [1, 2, -1]), d: int(rng, 1, 6) };
      if (p.a * p.d - p.b * p.c !== 0 && p.b !== 0) return p;
    }
  },
  sane: (p) => (p.a * p.d !== p.b * p.c ? null : 'the fraction is constant'),
  problem: (p) => {
    const top = p.a * p.d - p.b * p.c;
    const den = poly([p.c, p.d]);
    return {
      prompt: t`Differentiate ${math`y = \frac{${cm(poly([p.a, p.b]))}}{${cm(den)}}`}.`,
      answer: { kind: 'expression', expected: `${top}/(${den})^2`, variables: ['x'], domains: { x: { kind: 'real', min: 0.1, max: 4 } } },
      solution: [
        t`With ${math`u = ${cm(poly([p.a, p.b]))}`} and ${math`v = ${cm(den)}`}: ${math`u' = ${p.a}`}, ${math`v' = ${p.c}`}.`,
        t`${math`\frac{dy}{dx} = \frac{u'v - uv'}{v^{${2}}} = \frac{${p.a}(${cm(den)}) - ${p.c}(${cm(poly([p.a, p.b]))})}{(${cm(den)})^{${2}}} = \frac{${top}}{(${cm(den)})^{${2}}}`}: the ${math`x`} terms cancel.`,
      ],
    };
  },
  solve: (p) => `(${p.a}*(${p.c}x + ${p.d}) - ${p.c}*(${p.a}x + ${p.b}))*(${p.c}x + ${p.d})^(-2)`,
  misconceptions: (p): Misconception[] => [
    { response: `${p.b * p.c - p.a * p.d}/(${poly([p.c, p.d])})^2`, why: t`The order matters: ${math`u'v - uv'`}, the derivative of the top first. The other order flips the sign.` },
    { response: str(q(p.a, p.c)), why: t`Dividing the derivatives, ${math`\frac{u'}{v'}`}, is not the rule. Use ${math`\frac{u'v - uv'}{v^{${2}}}`}.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const composite = auto({
  id: 'a23-q1-i',
  source: cite(F23, 'Assignment 23, Q1(i)'),
  title: t`A function of a function, by hand`,
  prompt: t`Let ${math`g(x) = ${2}x^{${3}} + ${1}`} and ${math`f(x) = x^{${2}}`}, and ${math`F(x) = f(g(x))`}. Find ${math`F'(x)`}.`,
  answer: { kind: 'expression', expected: '12x^2 (2x^3 + 1)', variables: ['x'] },
  solution: [
    t`${math`F(x) = (${2}x^{${3}} + ${1})^{${2}} = ${4}x^{${6}} + ${4}x^{${3}} + ${1}`}, so ${math`F'(x) = ${24}x^{${5}} + ${12}x^{${2}} = ${12}x^{${2}}(${2}x^{${3}} + ${1})`}.`,
    t`Compare ${math`f'(g(x)) = ${2}(${2}x^{${3}} + ${1})`}: it is not ${math`F'(x)`}. The missing factor is ${math`g'(x) = ${6}x^{${2}}`}, and indeed ${math`F'(x) = f'(g(x))g'(x)`}: the chain rule.`,
  ],
  reference: '24x^5 + 12x^2',
  verify: () => agreesAt('F\'(x)', '12x^2 (2x^3 + 1)', (x) => numDeriv((u) => (2 * u ** 3 + 1) ** 2, x), [-1.2, 0.3, 1.1]),
  misconceptions: [{ response: '2(2x^3 + 1)', why: t`That is ${math`f'(g(x))`}. Expand ${math`F`} and differentiate: there is an extra factor ${math`g'(x) = ${6}x^{${2}}`}.` }],
  official: { source: cite(F23H, 'Assignment 23 hints, Q1(i)'), answer: '24x^5 + 12x^2', agrees: true },
});

const xex = auto({
  id: 'a22-q2-iii',
  source: cite(F22, 'Assignment 22, Q2(iii)'),
  title: t`The product rule on x times e to the x`,
  prompt: t`Let ${math`f(x) = xe^{x}`}. Find ${math`f'(x)`} using the product rule.`,
  answer: { kind: 'expression', expected: '(x + 1) e^x', variables: ['x'] },
  hints: [
    t`With ${math`u = x`} and ${math`v = e^{x}`}, what are ${math`u'`} and ${math`v'`}?`,
    t`What does the product rule give?`,
    t`Which common factor can be taken out?`,
  ],
  nudge: t`Not quite. Use the product rule with both of its terms, then take out ${math`e^{x}`}.`,
  solution: [
    t`With ${math`u = x`} and ${math`v = e^{x}`}: ${math`u' = ${1}`}, ${math`v' = e^{x}`}.`,
    t`${math`f'(x) = ${1} \cdot e^{x} + x \cdot e^{x} = (x + ${1})e^{x}`}.`,
    t`Product rule: differentiate one factor at a time.`,
  ],
  reference: 'e^x + x e^x',
  verify: () => agreesAt('(xe^x)\'', '(x + 1) e^x', (x) => numDeriv((u) => u * Math.exp(u), x), [-2, 0, 1.5]),
  misconceptions: [{ response: 'e^x', why: t`${math`u'v' = ${1} \cdot e^{x}`} is not the rule. The product rule gives ${math`u'v + uv'`}.` }],
  official: { source: cite(F22H, 'Assignment 22 hints, Q2(iii)'), answer: '(x + 1) e^x', agrees: true },
});

const lnSquare = auto({
  id: 'a23-q1-v',
  source: cite(F23, 'Assignment 23, Q1(v)'),
  title: t`Two ways to differentiate a logarithm`,
  prompt: t`Differentiate ${math`\ln(x^{${2}})`} for ${math`x > ${0}`}, first by the chain rule and then without it.`,
  answer: { kind: 'expression', expected: '2/x', variables: ['x'], domains: DOM },
  hints: [
    t`With the inside ${math`u = x^{${2}}`}, what is the derivative of ${math`\ln u`} with respect to ${math`u`}?`,
    t`What is the derivative of the inside?`,
    t`Without the chain rule, which law of logarithms simplifies ${math`\ln(x^{${2}})`} first?`,
  ],
  nudge: t`Not quite. Multiply by the derivative of the inside, or simplify with a law of logarithms first.`,
  solution: [
    t`Chain rule: the inside is ${math`u = x^{${2}}`}, so the derivative is ${math`\frac{${1}}{x^{${2}}} \cdot ${2}x = \frac{${2}}{x}`}.`,
    t`Without it: ${math`\ln(x^{${2}}) = ${2}\ln x`}, whose derivative is ${math`\frac{${2}}{x}`}. The two agree.`,
    t`Simplify with the laws of logarithms first; both routes must agree.`,
  ],
  reference: '2/x',
  verify: () => agreesAt('(ln x^2)\'', '2/x', (x) => numDeriv((u) => Math.log(u * u), x), [0.5, 1, 2.5]),
  misconceptions: [{ response: '1/x^2', why: t`Multiply by the derivative of the inside, ${math`${2}x`}: ${math`\frac{${1}}{x^{${2}}} \cdot ${2}x = \frac{${2}}{x}`}.` }],
  official: { source: cite(F23H, 'Assignment 23 hints, Q1(v)'), answer: '2/x', agrees: true },
});

const w = (p: number): number => (1 - p * p) / (2 - p);
const dwdp = auto({
  id: 's2-q3-derivative',
  source: cite(S2, 'Q3(i)', true),
  title: t`How the chance of winning changes`,
  prompt: t`In a match, Younis wins with probability ${math`w = \frac{${1} - p^{${2}}}{${2} - p}`}, for ${math`${0} < p < ${1}`}. Find ${math`\frac{dw}{dp}`}.`,
  answer: { kind: 'expression', expected: '(p^2 - 4p + 1)/(2 - p)^2', variables: ['p'], domains: P01 },
  hints: [
    t`For the quotient, what are ${math`u`}, ${math`v`}, ${math`u'`}, and ${math`v'`}?`,
    t`What is the quotient rule, with its terms in order?`,
    t`After expanding the numerator, which terms combine?`,
  ],
  nudge: t`Not quite. Keep the order ${math`u'v - uv'`}, and watch the sign of ${math`v' = -${1}`}.`,
  solution: [
    t`Quotient rule with ${math`u = ${1} - p^{${2}}`}, ${math`v = ${2} - p`}: ${math`u' = -${2}p`}, ${math`v' = -${1}`}.`,
    t`${math`\frac{dw}{dp} = \frac{-${2}p(${2} - p) - (${1} - p^{${2}})(-${1})}{(${2} - p)^{${2}}} = \frac{-${4}p + ${2}p^{${2}} + ${1} - p^{${2}}}{(${2} - p)^{${2}}} = \frac{p^{${2}} - ${4}p + ${1}}{(${2} - p)^{${2}}}`}.`,
    t`Quotient rule: ${math`\frac{u'v - uv'}{v^{${2}}}`}, in that order.`,
  ],
  reference: '(p^2 - 4p + 1)/(2 - p)^2',
  verify: () => {
    for (const p of [0.1, 0.4, 0.8]) {
      const e = close(`dw/dp at ${p}`, numDeriv(w, p), (p * p - 4 * p + 1) / (2 - p) ** 2);
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [{ response: '(-p^2 + 4p - 1)/(2 - p)^2', why: t`The order in the quotient rule is ${math`u'v - uv'`}. Here ${math`v' = -${1}`}, so ${math`-uv' = +(${1} - p^{${2}})`}.` }],
  official: { source: cite(S2S, 'Q3(i)'), answer: '((2 - p)^2 - 3)/(2 - p)^2', agrees: true },
});

const turnP = auto({
  id: 's2-q3-turn',
  source: cite(S2, 'Q3(i)'),
  title: t`Does w increase whenever p decreases?`,
  prompt: t`With ${math`w = \frac{${1} - p^{${2}}}{${2} - p}`} for ${math`${0} < p < ${1}`}, ${math`w`} does not always increase as ${math`p`} decreases. Find the value of ${math`p`} in ${math`(${0}, ${1})`} at which ${math`\frac{dw}{dp} = ${0}`}.`,
  answer: { kind: 'expression', expected: '2 - sqrt(3)', variables: [] },
  hints: [
    t`What is ${math`\frac{dw}{dp}`} by the quotient rule?`,
    t`When is a fraction equal to ${0}?`,
    t`Which root of the numerator lies in ${math`(${0}, ${1})`}?`,
  ],
  nudge: t`Not quite. Set the numerator of ${math`\frac{dw}{dp}`} to ${0} and keep only the root that can be a probability.`,
  solution: [
    t`${math`\frac{dw}{dp} = \frac{p^{${2}} - ${4}p + ${1}}{(${2} - p)^{${2}}} = \frac{(${2} - p)^{${2}} - ${3}}{(${2} - p)^{${2}}}`}, by completing the square.`,
    t`This is ${0} when ${math`(${2} - p)^{${2}} = ${3}`}, so ${math`p = ${2} \pm \sqrt{${3}}`}; only ${math`${2} - \sqrt{${3}}`} lies in ${math`(${0}, ${1})`}.`,
    t`For ${math`${0} < p < ${2} - \sqrt{${3}}`} the derivative is positive, so there ${math`w`} decreases as ${math`p`} decreases. So the answer to the question is no.`,
    t`A derivative vanishes where its numerator does; keep roots in the allowed range.`,
  ],
  reference: '2 - sqrt(3)',
  verify: () => firstError(close('dw/dp at 2 - sqrt 3', numDeriv(w, 2 - Math.sqrt(3)), 0), close('dw/dp at 0.1 is positive', Math.sign(numDeriv(w, 0.1)), 1)),
  misconceptions: [{ response: '2 + sqrt(3)', why: t`That root is about ${Number((2 + Math.sqrt(3)).toPrecision(3))}, outside ${math`(${0}, ${1})`}, where ${math`p`} is a probability.` }],
  official: { source: cite(S2S, 'Q3(i)'), answer: '2 - sqrt(3)', agrees: true },
});

const productProof = supervision({
  id: 'a22-q1',
  source: cite(F22, 'Assignment 22, Q1'),
  title: t`The product rule from the definition`,
  prompt: t`(i) Use a rough sketch to show that, for any differentiable ${math`f`}, ${math`f(x + h) \approx f(x) + hf'(x)`} when ${math`h`} is small. (ii) Let ${math`g(x) = f_{${1}}(x)f_{${2}}(x)`}, where ${math`f_{${1}}`} and ${math`f_{${2}}`} are differentiable. Use the definition ${math`g'(x) = \lim_{h \to ${0}} \frac{g(x + h) - g(x)}{h}`} and part (i) to show that ${math`g'(x) = f_{${1}}'(x)f_{${2}}(x) + f_{${1}}(x)f_{${2}}'(x)`}.`,
  hints: [
    t`From the sketch, why is ${math`f(x + h)`} close to ${math`f(x) + hf'(x)`}?`,
    t`Applying that to ${math`f_{${1}}`} and ${math`f_{${2}}`}, what is ${math`g(x + h)`} approximately?`,
    t`After subtracting ${math`g(x)`} and dividing by ${math`h`}, which terms vanish as ${math`h \to ${0}`}?`,
  ],
  writeUp: 'proof',
  official: cite(F22H, 'Assignment 22 hints, Q1'),
});

const chainProof = supervision({
  id: 'a23-q1-iii',
  source: cite(F23, 'Assignment 23, Q1(iii)'),
  title: t`The chain rule from a linear approximation`,
  prompt: t`Assume that for any differentiable ${math`H`}, ${math`H(a + t) \approx H(a) + tH'(a)`} when ${math`t`} is small. (a) Write down an approximation for ${math`g(x + h)`}. (b) Write down an approximation for ${math`f(g(x) + t)`}. (c) Let ${math`F(x) = f(g(x))`}; use (a) and (b) to approximate ${math`F(x + h)`} for small ${math`h`}. (d) Deduce that ${math`F'(x) = f'(g(x))g'(x)`}.`,
  hints: [
    t`With ${math`H = g`}, what is ${math`g(x + h)`} approximately?`,
    t`With ${math`t = hg'(x)`}, what is ${math`f(g(x) + t)`} approximately?`,
    t`Combining the two, what is ${math`\frac{F(x + h) - F(x)}{h}`} approximately?`,
  ],
  writeUp: 'proof',
  official: cite(F23H, 'Assignment 23 hints, Q1(iii)'),
});

const tanProof = supervision({
  id: 'a25-q2-iv',
  source: cite(F25, 'Assignment 25, Q2(iv)'),
  title: t`The derivative of tan`,
  prompt: t`Show that ${math`\frac{d}{d\theta}\tan\theta = \sec^{${2}}\theta`}, by writing ${math`\tan\theta`} as a product of ${math`\sin\theta`} and ${math`\sec\theta`}, or by the quotient rule.`,
  hints: [
    t`What are the derivatives of ${math`\sin\theta`} and of ${math`\sec\theta`}?`,
    t`By the product rule, what is the derivative of ${math`\sin\theta\sec\theta`}?`,
    t`Which identity turns the result into ${math`\sec^{${2}}\theta`}?`,
  ],
  writeUp: 'proof',
  official: cite(F25H, 'Assignment 25 hints, Q2(iv)'),
});

// STEP 2 Calculus Q1 (2005 S2 Q1), STEP I 1994 Q2 (STEP Questions Database), and IA Differential
// Equations Example Sheet 1, Q3(ii) (DAMTP).
const CALC = 'step-s2-calc' as const;
const CALCS = 'step-s2-calc-solutions' as const;
const DB94 = 'stepdb-94-s1' as const;
const XPOS = { x: { kind: 'real' as const, min: 0.5, max: 3 } };

const calc1 = supervision({
  id: 's2calc-q1',
  source: cite(CALC, 'Q1 (2005 STEP II Q1)'),
  title: t`Where the derivative of ${math`P(x)e^{-x^{${2}}}`} vanishes`,
  prompt: t`Find the three values of ${math`x`} for which the derivative of ${math`x^{${2}}e^{-x^{${2}}}`} is zero. Given that ${math`a`} and ${math`b`} are distinct positive numbers, find a polynomial ${math`P(x)`} such that the derivative of ${math`P(x)e^{-x^{${2}}}`} is zero for ${math`x = ${0}`}, ${math`x = \pm a`} and ${math`x = \pm b`}, but for no other values of ${math`x`}.`,
  hints: [
    t`What is the derivative of ${math`x^{${2}}e^{-x^{${2}}}`}, and where is it ${0}?`,
    t`What is the derivative of ${math`P(x)e^{-x^{${2}}}`}, in terms of ${math`P`} and ${math`P'`}?`,
    t`Which polynomial ${math`P`} makes ${math`P'(x) - ${2}xP(x)`} a multiple of ${math`x(x^{${2}} - a^{${2}})(x^{${2}} - b^{${2}})`} and nothing more?`,
  ],
  writeUp: 'explanation',
  official: cite(CALCS, 'Q1'),
});

const calc1zeros = auto({
  id: 's2calc-q1-zeros',
  source: cite(CALC, 'Q1 (2005 STEP II Q1)'),
  title: t`The turning points of ${math`x^{${2}}e^{-x^{${2}}}`}`,
  prompt: t`Find the three values of ${math`x`} for which the derivative of ${math`x^{${2}}e^{-x^{${2}}}`} is zero.`,
  answer: {
    kind: 'witness',
    count: 3,
    unordered: true,
    example: '-1, 0, 1',
    check: (v) => {
      const keys = new Set(v.map((r) => `${r.num}/${r.den}`));
      if (keys.size !== 3) return 'Give three different values.';
      for (const r of v) {
        const x = Number(r.num) / Number(r.den);
        if (Math.abs(x * (1 - x * x)) > 1e-12) return `At ${x} the derivative is not zero.`;
      }
      return null;
    },
  },
  hints: [
    t`Which rules does the derivative of ${math`x^{${2}}e^{-x^{${2}}}`} need?`,
    t`What is the derivative, fully factorised?`,
    t`Can ${math`e^{-x^{${2}}}`} be ${0}?`,
  ],
  nudge: t`Not quite. Factorise the derivative fully; ${math`e^{-x^{${2}}}`} is never ${0}.`,
  solution: [
    t`Product rule, with the chain rule for ${math`e^{-x^{${2}}}`}: ${math`\frac{d}{dx}\left(x^{${2}}e^{-x^{${2}}}\right) = ${2}xe^{-x^{${2}}} + x^{${2}} \cdot (-${2}x)e^{-x^{${2}}} = ${2}x(${1} - x^{${2}})e^{-x^{${2}}}`}.`,
    t`${math`e^{-x^{${2}}} > ${0}`} for every ${math`x`}, so the derivative is zero exactly when ${math`x(${1} - x^{${2}}) = ${0}`}: ${math`x = -${1}`}, ${0}, or ${1}.`,
    t`Factorise the derivative; an exponential factor never vanishes.`,
  ],
  reference: '-1, 0, 1',
  verify: () => {
    // The derivative, checked numerically, and its sign changes found by scanning [-3, 3].
    const d = (x: number): number => 2 * x * (1 - x * x) * Math.exp(-x * x);
    const e = agreesAt('derivative', '2x(1 - x^2) e^(-x^2)', (x) => numDeriv((u) => u * u * Math.exp(-u * u), x), [-1.5, -0.3, 0.7, 2]);
    if (e !== null) return e;
    const roots: number[] = [];
    for (let i = -3000; i < 3000; i++) {
      const [x0, x1] = [i / 1000 + 0.0005, (i + 1) / 1000 + 0.0005];
      if (d(x0) * d(x1) < 0) roots.push(Math.round((x0 + x1) / 2));
    }
    return roots.join(' ') === '-1 0 1' ? null : `sign changes at ${roots.join(' ')}`;
  },
  misconceptions: [
    { response: '0, 1, 2', why: t`The derivative is ${math`${2}x(${1} - x^{${2}})e^{-x^{${2}}}`}: the factor ${math`${1} - x^{${2}}`} vanishes at ${math`x = \pm ${1}`}.` },
  ],
  official: { source: cite(CALCS, 'Q1'), answer: '-1, 0, 1', agrees: true },
});

const db94q2iv = auto({
  id: 'step94-q2-iv',
  source: cite(DB94, 'Q2(iv)'),
  title: t`A tower of powers`,
  prompt: t`Differentiate ${math`x^{(x^{x})}`} with respect to ${math`x`}, for ${math`x > ${0}`}.`,
  answer: { kind: 'expression', expected: 'x^(x^x) * x^x * ((ln(x))^2 + ln(x) + 1/x)', variables: ['x'], domains: XPOS },
  hints: [
    t`How can ${math`x^{x}`} be written using ${math`e`} and ${math`\ln x`}?`,
    t`What is the derivative of ${math`x^{x}`}?`,
    t`Writing ${math`x^{(x^{x})} = e^{x^{x}\ln x}`}, which product must be differentiated in the exponent?`,
  ],
  nudge: t`Not quite. The exponent varies, so write the power through ${math`e`} and ${math`\ln x`} before differentiating.`,
  solution: [
    t`Write powers with a variable exponent through ${math`e`}: ${math`x^{x} = e^{x\ln x}`}, so by the chain and product rules ${math`\frac{d}{dx}x^{x} = x^{x}(\ln x + ${1})`}.`,
    t`In the same way ${math`y = x^{(x^{x})} = e^{x^{x}\ln x}`}, so ${math`\frac{dy}{dx} = y\,\frac{d}{dx}\left(x^{x}\ln x\right)`}.`,
    t`Product rule: ${math`\frac{d}{dx}\left(x^{x}\ln x\right) = x^{x}(\ln x + ${1})\ln x + \frac{x^{x}}{x} = x^{x}\left((\ln x)^{${2}} + \ln x + \frac{${1}}{x}\right)`}.`,
    t`So ${math`\frac{dy}{dx} = x^{(x^{x})}\,x^{x}\left((\ln x)^{${2}} + \ln x + \frac{${1}}{x}\right)`}.`,
    t`For a variable exponent, rewrite the power through ${math`e`} and ${math`\ln`} first.`,
  ],
  reference: 'x^(x^x) * x^x * ((ln(x))^2 + ln(x) + 1/x)',
  verify: () => agreesAt('d/dx x^(x^x)', 'x^(x^x) * x^x * ((ln(x))^2 + ln(x) + 1/x)', (x) => numDeriv((u) => u ** (u ** u), x), [0.6, 1, 1.5, 2.2], 1e-4),
  misconceptions: [
    { response: 'x^(x^x) * x^x * (ln(x) + 1)', why: t`The exponent is ${math`x^{x}\ln x`}, a product: differentiate both factors, ${math`x^{x}(\ln x + ${1})\ln x + x^{x} \cdot \frac{${1}}{x}`}.` },
    { response: 'x^x * x^(x^x - 1)', why: t`The power rule ${math`nx^{n - ${1}}`} needs a constant exponent. Here the exponent varies, so write ${math`x^{(x^{x})} = e^{x^{x}\ln x}`}.` },
  ],
});

const db94q2v = auto({
  id: 'step94-q2-v',
  source: cite(DB94, 'Q2(v)'),
  title: t`A power of a power`,
  prompt: t`Differentiate ${math`(x^{x})^{x}`} with respect to ${math`x`}, for ${math`x > ${0}`}.`,
  answer: { kind: 'expression', expected: 'x^(x^2 + 1) * (2 ln(x) + 1)', variables: ['x'], domains: XPOS },
  hints: [
    t`How does ${math`(x^{x})^{x}`} simplify by the laws of indices?`,
    t`Writing it as ${math`e^{x^{${2}}\ln x}`}, what is the derivative of the exponent?`,
    t`How can the result be tidied into a single power of ${math`x`} times a bracket?`,
  ],
  nudge: t`Not quite. Simplify ${math`(x^{x})^{x}`} by the laws of indices before differentiating.`,
  solution: [
    t`${math`(x^{x})^{x} = x^{x \cdot x} = x^{x^{${2}}} = e^{x^{${2}}\ln x}`}.`,
    t`${math`\frac{d}{dx}\left(x^{${2}}\ln x\right) = ${2}x\ln x + x`}, so the derivative is ${math`x^{x^{${2}}}(${2}x\ln x + x) = x^{x^{${2}} + ${1}}(${2}\ln x + ${1})`}.`,
    t`Simplify with the laws of indices before differentiating.`,
  ],
  reference: 'x^(x^2 + 1) * (2 ln(x) + 1)',
  verify: () => agreesAt('d/dx (x^x)^x', 'x^(x^2 + 1) * (2 ln(x) + 1)', (x) => numDeriv((u) => (u ** u) ** u, x), [0.6, 1, 1.5, 2.2], 1e-4),
  misconceptions: [
    { response: 'x^(x^x) * x^x * ((ln(x))^2 + ln(x) + 1/x)', why: t`That is the derivative of ${math`x^{(x^{x})}`}. Here the brackets come first: ${math`(x^{x})^{x} = x^{x^{${2}}}`}.` },
  ],
});

const damtpQ3ii = auto({
  id: 'damtp-de1-q3-ii',
  source: cite('damtp-ia-de1', 'Q3(ii)'),
  title: t`The third derivative of ${math`(\ln x)^{${2}}`}`,
  prompt: t`Calculate ${math`\frac{d^{${3}}}{dx^{${3}}}(\ln x)^{${2}}`}, for ${math`x > ${0}`}.`,
  answer: { kind: 'expression', expected: '(4 ln(x) - 6)/x^3', variables: ['x'], domains: XPOS },
  hints: [
    t`What is the first derivative, by the chain rule?`,
    t`What is the second derivative, by the quotient rule?`,
    t`Differentiating once more, which terms combine in the numerator?`,
  ],
  nudge: t`Not quite. Differentiate one step at a time and simplify after each; watch the signs.`,
  solution: [
    t`Chain rule: ${math`\frac{d}{dx}(\ln x)^{${2}} = \frac{${2}\ln x}{x}`}.`,
    t`Quotient rule: ${math`\frac{d}{dx}\frac{${2}\ln x}{x} = \frac{\frac{${2}}{x} \cdot x - ${2}\ln x}{x^{${2}}} = \frac{${2} - ${2}\ln x}{x^{${2}}}`}.`,
    t`Quotient rule again: ${math`\frac{d}{dx}\frac{${2} - ${2}\ln x}{x^{${2}}} = \frac{-\frac{${2}}{x} \cdot x^{${2}} - (${2} - ${2}\ln x) \cdot ${2}x}{x^{${4}}} = \frac{-${2}x - ${4}x + ${4}x\ln x}{x^{${4}}} = \frac{${4}\ln x - ${6}}{x^{${3}}}`}.`,
    t`Simplify after each derivative before taking the next.`,
  ],
  reference: '(4 ln(x) - 6)/x^3',
  verify: () => {
    // Each derivative is checked numerically against the one before.
    const pts = [0.6, 1, 1.7, 2.5];
    return agreesAt('first', '2 ln(x) / x', (x) => numDeriv((u) => Math.log(u) ** 2, x), pts)
      ?? agreesAt('second', '(2 - 2 ln(x))/x^2', (x) => numDeriv((u) => (2 * Math.log(u)) / u, x), pts)
      ?? agreesAt('third', '(4 ln(x) - 6)/x^3', (x) => numDeriv((u) => (2 - 2 * Math.log(u)) / (u * u), x), pts);
  },
  misconceptions: [
    { response: '(4 ln(x) + 6)/x^3', why: t`Watch the signs in the last quotient rule: ${math`-${2}x - ${4}x = -${6}x`}.` },
    { response: '2/x^3', why: t`${math`(\ln x)^{${2}}`} is not ${math`${2}\ln x`}: by the chain rule its derivative is ${math`\frac{${2}\ln x}{x}`}, which still contains ${math`\ln x`}.` },
  ],
});

// ---------------------------------------------------------------- lesson

export const differentiationRules: TopicContent = {
  topicId: 'calc.differentiation-rules',
  goal: t`Differentiate composites, products, and quotients, such as ${math`e^{-x^{${2}}/${2}}`} and ${math`xe^{-x}`}.`,
  objective: t`Differentiate products, quotients, and functions of functions, and prove why the rules hold.`,
  why: t`Almost every function you meet is built from simpler ones; these three rules take them apart.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`Products` },
    { kind: 'hook', text: t`The derivative of ${math`x`} is ${1} and the derivative of ${math`e^{x}`} is ${math`e^{x}`}. So is the derivative of ${math`xe^{x}`} just ${math`${1} \cdot e^{x}`}? At ${math`x = ${1}`} that would give ${math`e \approx ${2.718}`}, but the slope of ${math`xe^{x}`} there is about ${Number(numDeriv((u) => u * Math.exp(u), 1).toPrecision(4))}. Something is missing.` },
    { kind: 'narrative', text: t`Think of a rectangle with sides ${math`u`} and ${math`v`} that are both growing. Its area ${math`uv`} grows for two reasons: the side ${math`u`} grows while ${math`v`} holds, and ${math`v`} grows while ${math`u`} holds. Two strips, not one: that is the [[product-rule-calculus|product rule]]. (The tiny corner where both grow at once is too small to matter.)` },
    { kind: 'theorem', name: t`Product rule`, statement: t`If ${math`u`} and ${math`v`} are differentiable at ${math`x`}, so is ${math`uv`}, and ${math`(uv)'(x) = u'(x)v(x) + u(x)v'(x)`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Add and subtract`, text: t`${math`u(x + h)v(x + h) - u(x)v(x) = [u(x + h) - u(x)]v(x + h) + u(x)[v(x + h) - v(x)]`}.`, plain: t`Change one factor at a time: the two strips of the rectangle.` },
        { label: t`Divide by h`, text: t`The quotient is ${math`\frac{u(x + h) - u(x)}{h}v(x + h) + u(x)\frac{v(x + h) - v(x)}{h}`}.` },
        { label: t`Take limits`, text: t`The difference quotients tend to ${math`u'(x)`} and ${math`v'(x)`}, and ${math`v(x + h) \to v(x)`}, so the limit is ${math`u'(x)v(x) + u(x)v'(x)`}.`, why: { q: t`Why does ${math`v(x + h) \to v(x)`}?`, a: t`A differentiable function is continuous: ${math`v(x + h) - v(x) = h \cdot \frac{v(x + h) - v(x)}{h} \to ${0} \cdot v'(x) = ${0}`}.` } },
      ],
    },
    { kind: 'pitfall', claim: t`${math`(uv)' = u'v'`}.`, counterexample: t`${math`u = v = x`}: ${math`uv = x^{${2}}`} has derivative ${math`${2}x`}, but ${math`u'v' = ${1}`}.` },
    { kind: 'section', title: t`Functions of functions` },
    { kind: 'narrative', text: t`${math`y = (${2}x^{${3}} + ${1})^{${2}}`} is a function of a function: first ${math`u = ${2}x^{${3}} + ${1}`}, then ${math`y = u^{${2}}`}. Rates multiply, like gears. Look at ${math`x = ${1}`}, where ${math`u = ${3}`}. There ${math`u`} changes ${6} times as fast as ${math`x`}, since ${math`\frac{du}{dx} = ${6}x^{${2}} = ${6}`}; and ${math`y = u^{${2}}`} changes ${math`${2}u = ${6}`} times as fast as ${math`u`}. So ${math`y`} changes ${math`${6} \times ${6} = ${36}`} times as fast as ${math`x`}. (Check by multiplying out: ${math`y = ${4}x^{${6}} + ${4}x^{${3}} + ${1}`} has ${math`\frac{dy}{dx} = ${24}x^{${5}} + ${12}x^{${2}}`}, which is ${36} at ${math`x = ${1}`}.) Multiplying the rates is the [[chain-rule|chain rule]].` },
    { kind: 'theorem', name: t`Chain rule`, statement: t`If ${math`g`} is differentiable at ${math`x`} and ${math`f`} is differentiable at ${math`g(x)`}, then ${math`F = f \circ g`} is differentiable at ${math`x`} and ${math`F'(x) = f'(g(x))g'(x)`}. With ${math`u = g(x)`} and ${math`y = f(u)`}: ${math`\frac{dy}{dx} = \frac{dy}{du}\frac{du}{dx}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`A slope that never divides by zero`, text: t`Let ${math`b = g(x)`}. Define ${math`\varphi(w) = \frac{f(w) - f(b)}{w - b}`} for ${math`w \ne b`}, and ${math`\varphi(b) = f'(b)`}. Then ${math`f(w) - f(b) = \varphi(w)(w - b)`} for every ${math`w`}, and ${math`\varphi(w) \to f'(b)`} as ${math`w \to b`}.`, plain: t`${math`\varphi`} is the chord slope of ${math`f`}, patched at ${math`b`} so that it makes sense even when ${math`w = b`}.` },
        { label: t`Substitute ${math`w = g(x + h)`}`, text: t`${math`F(x + h) - F(x) = \varphi(g(x + h))\,(g(x + h) - g(x))`}.` },
        { label: t`Divide by h`, text: t`${math`\frac{F(x + h) - F(x)}{h} = \varphi(g(x + h)) \cdot \frac{g(x + h) - g(x)}{h}`}.` },
        { label: t`Take limits`, text: t`As ${math`h \to ${0}`}, ${math`g(x + h) \to b`}, so the first factor tends to ${math`f'(b)`}; the second tends to ${math`g'(x)`}. So ${math`F'(x) = f'(g(x))g'(x)`}.`, why: { q: t`Why not just divide by ${math`g(x + h) - g(x)`}?`, a: t`It may be ${0} for some small ${math`h`} (for example if ${math`g`} is constant), and then the division fails. The patched slope ${math`\varphi`} avoids that, which is what makes the STEP Support linear approximation argument exact.` } },
      ],
    },
    checkFrom(chain, { outer: 'exp', a: 1, m: 2, b: 1, p: 2 }, t`The inside ${math`x^{${2}} + ${1}`} has derivative ${math`${2}x`}, and ${math`e^{u}`} differentiates to itself.`),
    { kind: 'pitfall', claim: t`The derivative of ${math`\sin(${2}x)`} is ${math`\cos(${2}x)`}.`, counterexample: t`At ${math`x = ${0}`}, ${math`\sin(${2}x) = ${2}\sin x\cos x`} has slope ${2}, by the product rule; ${math`\cos(${2}x)`} gives ${1}. The chain rule supplies the factor ${2}.` },
    { kind: 'section', title: t`Quotients` },
    { kind: 'theorem', name: t`Quotient rule`, statement: t`If ${math`u`} and ${math`v`} are differentiable at ${math`x`} and ${math`v(x) \ne ${0}`}, then ${math`\left(\frac{u}{v}\right)' = \frac{u'v - uv'}{v^{${2}}}`}.` },
    { kind: 'p', text: t`It is not a new rule: write ${math`\frac{u}{v} = u \cdot v^{-${1}}`}. The chain rule gives ${math`(v^{-${1}})' = -v^{-${2}}v'`}, and the product rule gives ${math`u'v^{-${1}} - uv^{-${2}}v' = \frac{u'v - uv'}{v^{${2}}}`}.`, why: { q: t`How does the last step work?`, a: t`Put both terms over ${math`v^{${2}}`}: ${math`u'v^{-${1}} = \frac{u'v}{v^{${2}}}`}.` } },
    { kind: 'takeaway', text: t`Products: ${math`u'v + uv'`}. Functions of functions: outer derivative at the inside, times the inside's derivative. Quotients: ${math`\frac{u'v - uv'}{v^{${2}}}`}.` },
  ],
  examples: [
    { ...workedCambridge(composite), examiner: t`The examiner wants ${math`F`} found explicitly and the inequality ${math`F'(x) \ne f'(g(x))`} shown, the point of the question.` },
    worked(product, { n: 2, k: -1 }, t`A power times a decaying exponential`),
    worked(quotient, { a: 2, b: 1, c: 1, d: 3 }, t`A quotient of linear functions`),
  ],
  generators: [product, chain, quotient],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['product-rule-calculus', 'chain-rule'],
  cambridge: withUses([calc1, calc1zeros, db94q2iv, db94q2v, damtpQ3ii, xex, lnSquare, dwdp, turnP, productProof, chainProof, tanProof], {
    's2calc-q1': { sections: ['Products', 'Functions of functions'], note: t`Where the derivative of a polynomial times a Gaussian vanishes` },
    'step94-q2-iv': { sections: ['Functions of functions'], note: t`Differentiating a tower of powers` },
    'damtp-de1-q3-ii': { sections: ['Functions of functions', 'Products'], note: t`A third derivative by the chain and product rules` },
    's2-q3-turn': { sections: ['Quotients'], note: t`A turning point by the quotient rule` },
  }),
  // Best first: 2005 STEP II Q1 (with official solutions), then the auto-checked STEP I 1994
  // Q2(iv), the IA sheet's Q3(ii), and STEP 2 Statistics Q3(i).
  gate: ['s2calc-q1', 'step94-q2-iv', 'damtp-de1-q3-ii', 's2-q3-turn'],
  recall: [
    { front: t`State the product rule.`, back: t`${math`(uv)' = u'v + uv'`}.` },
    { front: t`State the chain rule.`, back: t`${math`(f \circ g)'(x) = f'(g(x))g'(x)`}, or ${math`\frac{dy}{dx} = \frac{dy}{du}\frac{du}{dx}`}.` },
    { front: t`State the quotient rule.`, back: t`${math`\left(\frac{u}{v}\right)' = \frac{u'v - uv'}{v^{${2}}}`}, for ${math`v \ne ${0}`}.` },
  ],
  proofOrder: [{
    title: t`The product rule`,
    steps: [
      t`Write the change in ${math`uv`} as ${math`[u(x + h) - u(x)]v(x + h) + u(x)[v(x + h) - v(x)]`}.`,
      t`Divide by ${math`h`}.`,
      t`The quotients tend to ${math`u'`} and ${math`v'`}, and ${math`v(x + h) \to v(x)`}.`,
      t`So ${math`(uv)' = u'v + uv'`}.`,
    ],
  }],
};

