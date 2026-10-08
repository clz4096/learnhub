/**
 * calc.first-principles: derivatives from f'(x) = lim (f(x + h) - f(x))/h for powers, the
 * square root (by the conjugate), sin x and cos x (from the compound angle formula and the
 * small angle approximations), and ln x (from the series of ln(1 + t)). The Cambridge
 * problems are STEP Support Foundation Assignment 20, Q1 and Q4 (2006 STEP III Q8, an
 * operator with the product rule is d/dx), with the Assignment 20 hints, and the NST
 * Mathematics Workbook, D2. The STEP 1 specification asks for first principles "for small
 * positive integer powers of x, and for sin x and cos x".
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { add, int, mul, pick, q, str, sub, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { poly } from '../poly';
import { agreesAt, numDeriv } from '../prep-c';
import { computedMath as cm, dmath, math, t, type Rich } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

const F20 = 'step-f20' as const;
const F20H = 'step-f20-hints' as const;
const NST = 'nst-workbook' as const;
const XH = { x: { kind: 'real' as const, min: -4, max: 4 }, h: { kind: 'real' as const, min: -2, max: 2 } };
const POS = { x: { kind: 'real' as const, min: 0.5, max: 6 } };

// ---------------------------------------------------------------- the difference quotient of a polynomial

interface DqP { cubic: boolean; a: number; b: number; c: number }
/** The simplified quotient (f(x + h) - f(x))/h. */
function quotient({ cubic, a, b }: DqP): string {
  return cubic ? `${a}(3x^2 + 3x h + h^2) + ${b}` : `${2 * a}x + ${a}h + ${b}`;
}
const fOf = ({ cubic, a, b, c }: DqP): number[] => (cubic ? [a, 0, b, c] : [a, b, c]);

const diffQuotient = generator<DqP>({
  id: 'difference-quotient',
  skill: 'Expand f(x + h) - f(x), divide by h, and simplify, before letting h tend to 0.',
  params: (rng) => ({ cubic: rng() < 0.4, a: pick(rng, [1, 2, 3, -1, -2, 4]), b: pick(rng, [-5, -3, -2, -1, 1, 2, 3, 5]), c: int(rng, -6, 6) }),
  sane: ({ a, b }) => (a !== 0 && b !== 0 ? null : 'degenerate'),
  problem: (p) => {
    const co = fOf(p);
    return {
      prompt: t`Let ${math`f(x) = ${cm(poly(co))}`}. Simplify ${math`\frac{f(x + h) - f(x)}{h}`} for ${math`h \ne ${0}`}, as an expression in ${math`x`} and ${math`h`}.`,
      answer: { kind: 'expression', expected: quotient(p), variables: ['x', 'h'], domains: XH },
      solution: p.cubic
        ? [
          t`${math`(x + h)^{${3}} = x^{${3}} + ${3}x^{${2}}h + ${3}xh^{${2}} + h^{${3}}`}, so ${math`f(x + h) - f(x) = ${p.a}(${3}x^{${2}}h + ${3}xh^{${2}} + h^{${3}}) + ${p.b}h`}: the ${math`x^{${3}}`} and the constant cancel.`,
          t`Every term has a factor ${math`h`}; divide by it: ${math`${p.a}(${3}x^{${2}} + ${3}xh + h^{${2}}) + ${p.b}`}. As ${math`h \to ${0}`} this tends to ${math`${3 * p.a}x^{${2}} + ${p.b}`}, the derivative.`,
        ]
        : [
          t`${math`(x + h)^{${2}} = x^{${2}} + ${2}xh + h^{${2}}`}, so ${math`f(x + h) - f(x) = ${p.a}(${2}xh + h^{${2}}) + ${p.b}h`}: the ${math`x^{${2}}`} terms and the constants cancel.`,
          t`Divide by ${math`h`}: ${cm(quotient(p))}. As ${math`h \to ${0}`} this tends to ${cm(poly([2 * p.a, p.b]))}, the derivative.`,
        ],
    };
  },
  // The quotient itself, unsimplified: the grader checks the two agree at sample points.
  solve: (p) => {
    const f = `${p.cubic ? `${p.a}*(x + h)^3 + ${p.b}*(x + h)` : `${p.a}*(x + h)^2 + ${p.b}*(x + h)`} + ${p.c}`;
    const g = `${p.cubic ? `${p.a}*x^3 + ${p.b}*x` : `${p.a}*x^2 + ${p.b}*x`} + ${p.c}`;
    return `((${f}) - (${g}))/h`;
  },
  misconceptions: (p): Misconception[] => [
    { response: p.cubic ? `${3 * p.a}x^2 + ${p.b}` : `${2 * p.a}x + ${p.b}`, why: t`That is the limit as ${math`h \to ${0}`}, the derivative. The question asks for the quotient before the limit, which still has ${math`h`} in it.` },
    { response: p.cubic ? `${p.a}(3x^2 + 3x h + h^2)` : `${2 * p.a}x + ${p.a}h`, why: t`The term ${math`${p.b}x`} contributes ${math`${p.b}(x + h) - ${p.b}x = ${p.b}h`}, which gives ${p.b} after dividing by ${math`h`}.` },
  ],
});

// ---------------------------------------------------------------- a derivative at a point, from the limit

type Kind = 'recip' | 'root';
interface LimP { kind: Kind; k: number; s: number }
const limVal = ({ kind, k, s }: LimP): Rational => (kind === 'recip' ? q(-k, s * s) : q(k, 2 * s));

const limitAt = generator<LimP>({
  id: 'limit-at-point',
  skill: 'Find f\'(a) for k/x or k sqrt x from the limit of the difference quotient, by a common denominator or the conjugate.',
  params: (rng) => ({ kind: pick(rng, ['recip', 'root'] as const), k: pick(rng, [1, 2, 3, 4, 6, -2, -3]), s: int(rng, 2, 5) }),
  sane: ({ k, s }) => (k !== 0 && s > 0 ? null : 'degenerate'),
  problem: (p) => {
    const a = p.kind === 'recip' ? p.s : p.s * p.s;
    const show: Rich = p.kind === 'recip' ? t`${math`f(x) = \frac{${p.k}}{x}`}` : t`${math`f(x) = ${p.k}\sqrt{x}`}`;
    return {
      prompt: t`Let ${show}. Using ${math`f'(a) = \lim_{h \to ${0}} \frac{f(a + h) - f(a)}{h}`}, find ${math`f'(${a})`}.`,
      answer: { kind: 'exact', expected: str(limVal(p)) },
      solution: p.kind === 'recip'
        ? [
          t`Over a common denominator, ${math`\frac{${p.k}}{${a} + h} - \frac{${p.k}}{${a}} = \frac{${p.k}(${a}) - ${p.k}(${a} + h)}{${a}(${a} + h)} = \frac{${-p.k}h}{${a}(${a} + h)}`}.`,
          t`Divide by ${math`h`}: ${math`\frac{${-p.k}}{${a}(${a} + h)}`}, which tends to ${math`\frac{${-p.k}}{${a * a}}`} as ${math`h \to ${0}`}, that is ${limVal(p)}.`,
        ]
        : [
          t`Multiply top and bottom by the conjugate ${math`\sqrt{${a} + h} + \sqrt{${a}}`}: ${math`\frac{\sqrt{${a} + h} - \sqrt{${a}}}{h} = \frac{(${a} + h) - ${a}}{h(\sqrt{${a} + h} + \sqrt{${a}})} = \frac{${1}}{\sqrt{${a} + h} + \sqrt{${a}}}`}.`,
          t`As ${math`h \to ${0}`} this tends to ${math`\frac{${1}}{${2}\sqrt{${a}}} = \frac{${1}}{${2 * p.s}}`}, so ${math`f'(${a}) = ${p.k} \times \frac{${1}}{${2 * p.s}} = ${limVal(p)}`}.`,
        ],
    };
  },
  // The difference quotient with a tiny h, rounded to the nearest fraction with denominator 600.
  solve: (p) => {
    const a = p.kind === 'recip' ? p.s : p.s * p.s;
    const f = p.kind === 'recip' ? (x: number) => p.k / x : (x: number) => p.k * Math.sqrt(x);
    return str(q(Math.round(numDeriv(f, a, 1e-6) * 3600), 3600));
  },
  misconceptions: (p): Misconception[] => p.kind === 'recip'
    ? [
      { response: str(q(p.k, p.s * p.s)), why: t`Watch the sign: ${math`\frac{k}{a + h}`} is smaller than ${math`\frac{k}{a}`} when ${math`k > ${0}`}, so the top is ${math`-kh`}.` },
      { response: str(q(-p.k, p.s)), why: t`The limit is ${math`\frac{-k}{a \cdot a}`}: both factors of the denominator ${math`a(a + h)`} tend to ${math`a`}.` },
    ]
    : [
      { response: str(q(p.k, p.s)), why: t`The two square roots in ${math`\sqrt{a + h} + \sqrt{a}`} both tend to ${math`\sqrt{a}`}, so the denominator tends to ${math`${2}\sqrt{a}`}.` },
      { response: str(q(p.k, 2 * p.s * p.s)), why: t`The limit is ${math`\frac{k}{${2}\sqrt{a}}`}, with the square root of ${math`a`}, not ${math`a`} itself.` },
    ],
});

// ---------------------------------------------------------------- the gradient of a chord

interface ChP { a: number; n: number }
const chordGrad = ({ a, n }: ChP): Rational => {
  const h = q(1, n);
  return add(add(q(3 * a * a), mul(q(3 * a), h)), mul(h, h));
};
const chordGradient = generator<ChP>({
  id: 'chord-gradient',
  skill: 'Compute the gradient of a short chord of y = x^3 and see it approach the derivative 3a^2.',
  quick: true,
  params: (rng) => ({ a: pick(rng, [-3, -2, -1, 1, 2, 3, 4]), n: pick(rng, [2, 4, 5, 10]) }),
  sane: ({ n }) => (n > 1 ? null : 'h too big'),
  problem: (p) => {
    const h = q(1, p.n);
    return {
      prompt: t`Find the gradient of the chord of ${math`y = x^{${3}}`} from ${math`x = ${p.a}`} to ${math`x = ${p.a} + ${h}`}.`,
      answer: { kind: 'exact', expected: str(chordGrad(p)) },
      solution: [
        t`The gradient is ${math`\frac{(a + h)^{${3}} - a^{${3}}}{h} = ${3}a^{${2}} + ${3}ah + h^{${2}}`} with ${math`a = ${p.a}`} and ${math`h = ${h}`}.`,
        t`That is ${math`${3 * p.a * p.a} + ${mul(q(3 * p.a), h)} + ${mul(h, h)} = ${chordGrad(p)}`}, close to the derivative ${3 * p.a * p.a}.`,
      ],
    };
  },
  // Rise over run, computed directly from the two points.
  solve: (p) => {
    const h = q(1, p.n);
    const x1 = add(q(p.a), h);
    const rise = sub(mul(x1, mul(x1, x1)), q(p.a ** 3));
    return str(mul(rise, q(p.n)));
  },
  misconceptions: (p): Misconception[] => [
    { response: String(3 * p.a * p.a), why: t`That is the limit, the gradient of the tangent. A chord of positive length has gradient ${math`${3}a^{${2}} + ${3}ah + h^{${2}}`}.` },
    { response: str(add(q(3 * p.a * p.a), mul(q(3 * p.a), q(1, p.n)))), why: t`Keep the ${math`h^{${2}}`} term: ${math`(a + h)^{${3}}`} has four terms, ${math`a^{${3}} + ${3}a^{${2}}h + ${3}ah^{${2}} + h^{${3}}`}.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const sqrtQ = auto({
  id: 'a20-q1-iii-root',
  source: cite(F20, 'Assignment 20, Q1(iii)'),
  title: t`The derivative of the square root`,
  prompt: t`Find a number ${math`k`} such that, when ${math`t`} is small, ${math`\sqrt{${1} + t} \approx ${1} + kt`} (ignoring ${math`t^{${2}}`} and smaller terms). Hence find the derivative of ${math`\sqrt{x}`} from first principles.`,
  answer: { kind: 'expression', expected: '1/(2 sqrt(x))', variables: ['x'], domains: POS },
  solution: [
    t`Square ${math`${1} + kt`}: ${math`${1} + ${2}kt + k^{${2}}t^{${2}}`}. Ignoring ${math`t^{${2}}`}, this is ${math`${1} + t`} when ${math`${2}k = ${1}`}: ${math`k = ${q(1, 2)}`}, so ${math`\sqrt{${1} + t} \approx ${1} + \frac{t}{${2}}`}.`,
    t`Write ${math`\sqrt{x + h} = \sqrt{x}\sqrt{${1} + \frac{h}{x}} \approx \sqrt{x}\left(${1} + \frac{h}{${2}x}\right)`} for small ${math`h`}.`,
    t`So ${math`\frac{\sqrt{x + h} - \sqrt{x}}{h} \approx \frac{\sqrt{x}}{h} \cdot \frac{h}{${2}x} = \frac{${1}}{${2}\sqrt{x}}`}, and the neglected terms carry a factor ${math`h`}, so they vanish in the limit: the derivative is ${math`\frac{${1}}{${2}\sqrt{x}}`}.`,
  ],
  reference: '1/(2 sqrt(x))',
  verify: () => agreesAt('derivative of sqrt', '1/(2 sqrt(x))', (x) => numDeriv(Math.sqrt, x, 1e-6), [0.5, 1, 2, 5]),
  misconceptions: [{ response: '1/sqrt(x)', why: t`The approximation is ${math`\sqrt{${1} + t} \approx ${1} + \frac{t}{${2}}`}: the ${math`\frac{${1}}{${2}}`} survives into the derivative.` }],
  official: { source: cite(F20H, 'Assignment 20 hints, Q1(iii)'), answer: '(1/2) x^(-1/2)', agrees: true },
});

const invRootQ = auto({
  id: 'a20-q1-iii-inverse',
  source: cite(F20, 'Assignment 20, Q1(iii)'),
  title: t`The derivative of one over the square root`,
  prompt: t`Using ${math`(${1} + t)^{-\frac{${1}}{${2}}} \approx ${1} - \frac{t}{${2}}`} for small ${math`t`}, find the derivative of ${math`x^{-\frac{${1}}{${2}}}`} from first principles.`,
  answer: { kind: 'expression', expected: '-(1/2) x^(-3/2)', variables: ['x'], domains: POS },
  solution: [
    t`${math`(x + h)^{-\frac{${1}}{${2}}} = x^{-\frac{${1}}{${2}}}\left(${1} + \frac{h}{x}\right)^{-\frac{${1}}{${2}}} \approx x^{-\frac{${1}}{${2}}}\left(${1} - \frac{h}{${2}x}\right)`}.`,
    t`So the difference quotient is about ${math`x^{-\frac{${1}}{${2}}} \cdot \left(-\frac{${1}}{${2}x}\right) = -\frac{${1}}{${2}}x^{-\frac{${3}}{${2}}}`}, and that is the limit.`,
    t`Factor out the main term, then approximate the small correction.`,
  ],
  nudge: t`Not quite. Factor ${math`x^{-\frac{${1}}{${2}}}`} out of ${math`(x + h)^{-\frac{${1}}{${2}}}`} first, then use the approximation.`,
  hints: [
    t`How can ${math`(x + h)^{-\frac{${1}}{${2}}}`} be written as ${math`x^{-\frac{${1}}{${2}}}`} times a power of ${math`${1} + \frac{h}{x}`}?`,
    t`With ${math`t = \frac{h}{x}`}, what does the given approximation make that power?`,
    t`What is the difference quotient then, and what is its limit as ${math`h \to ${0}`}?`,
  ],
  reference: '-1/(2 x sqrt(x))',
  verify: () => agreesAt('derivative of x^(-1/2)', '-(1/2) x^(-3/2)', (x) => numDeriv((u) => u ** -0.5, x, 1e-6), [0.5, 1, 3]),
  misconceptions: [{ response: '(1/2) x^(-3/2)', why: t`${math`x^{-\frac{${1}}{${2}}}`} decreases as ${math`x`} grows, so its gradient is negative.` }],
  official: { source: cite(F20H, 'Assignment 20 hints, Q1(iii)'), answer: '-(1/2) x^(-3/2)', agrees: true },
});

const nstD2 = auto({
  id: 'nst-d2',
  source: cite(NST, 'Differentiation, D2'),
  title: t`A chord's limit`,
  prompt: t`Calculate the derivative of ${math`y = x^{${2}} + ${1}`} from first principles, by considering the derivative as the limit of the gradient of a chord.`,
  answer: { kind: 'expression', expected: '2x', variables: ['x'] },
  solution: [
    t`The chord from ${math`x`} to ${math`x + h`} has gradient ${math`\frac{(x + h)^{${2}} + ${1} - (x^{${2}} + ${1})}{h} = \frac{${2}xh + h^{${2}}}{h} = ${2}x + h`}.`,
    t`As ${math`h \to ${0}`}, this tends to ${math`${2}x`}.`,
    t`Simplify the difference quotient, then take the limit.`,
  ],
  nudge: t`Not quite. Write out the chord gradient and simplify it before letting ${math`h \to ${0}`}.`,
  hints: [
    t`What is the gradient of the chord from ${math`x`} to ${math`x + h`}?`,
    t`After expanding ${math`(x + h)^{${2}}`}, what happens to the constant ${1}, and to the factor ${math`h`}?`,
    t`What does the simplified gradient tend to as ${math`h \to ${0}`}?`,
  ],
  reference: '2x',
  verify: () => agreesAt('limit of the chord gradient', '2x', (x) => ((x + 1e-7) ** 2 + 1 - (x * x + 1)) / 1e-7, [-2, 0.5, 3], 1e-5),
  misconceptions: [{ response: '2x + 1', why: t`The ${1} is in both ${math`f(x + h)`} and ${math`f(x)`}, so it cancels: a constant has derivative ${0}.` }],
});

const triangleQ = auto({
  id: 'a20-q4-cube',
  source: cite(F20, 'Assignment 20, Q4'),
  title: t`STEP: an operator that obeys the product rule`,
  prompt: t`${math`\triangle`} takes polynomials to polynomials, with ${math`\triangle x = ${1}`}; ${math`\triangle(f + g) = \triangle f + \triangle g`}; ${math`\triangle(\lambda f) = \lambda \triangle f`} for constants ${math`\lambda`}; and ${math`\triangle(fg) = f\triangle g + g\triangle f`}. Calculate ${math`\triangle x^{${3}}`}.`,
  answer: { kind: 'expression', expected: '3x^2', variables: ['x'] },
  solution: [
    t`First ${math`\triangle x^{${2}} = \triangle(x \cdot x) = x\triangle x + x\triangle x = x + x = ${2}x`}, by the product rule and ${math`\triangle x = ${1}`}.`,
    t`Then ${math`\triangle x^{${3}} = \triangle(x \cdot x^{${2}}) = x\triangle x^{${2}} + x^{${2}}\triangle x = x \cdot ${2}x + x^{${2}} \cdot ${1} = ${3}x^{${2}}`}.`,
    t`Build powers one factor at a time with the product rule.`,
  ],
  nudge: t`Not quite. Build up from ${math`x`}: find ${math`\triangle x^{${2}}`} first.`,
  hints: [
    t`Writing ${math`x^{${2}} = x \cdot x`}, what does the product rule give for ${math`\triangle x^{${2}}`}?`,
    t`How can ${math`x^{${3}}`} be written as a product involving ${math`x^{${2}}`}?`,
    t`Applying the product rule to that product, what is ${math`\triangle x^{${3}}`}?`,
  ],
  reference: '3x^2',
  verify: () => {
    // Apply the rules mechanically to x^n = x * x^(n-1), as coefficient lists: triangle x^n = n x^(n-1).
    // Coefficients lowest power first: triangle(x^n) = x triangle(x^(n-1)) + x^(n-1) triangle(x), with triangle(x) = 1.
    const addL = (a: number[], b: number[]): number[] => Array.from({ length: Math.max(a.length, b.length) }, (_, i) => (a[i] ?? 0) + (b[i] ?? 0));
    const tri = (n: number): number[] => (n === 1 ? [1] : addL([0, ...tri(n - 1)], [...Array<number>(n - 1).fill(0), 1]));
    return same('triangle x^3, lowest power first', tri(3).join(','), '0,0,3');
  },
  misconceptions: [{ response: '2x', why: t`That is ${math`\triangle x^{${2}}`}. Apply the product rule once more to ${math`x \cdot x^{${2}}`}.` }],
  official: { source: cite(F20H, 'Assignment 20 hints, Q4'), answer: '3x^2', agrees: true },
});

const triangleProof = supervision({
  id: 'a20-q4',
  source: cite(F20, 'Assignment 20, Q4'),
  title: t`STEP: the operator is the derivative`,
  prompt: t`${math`\triangle`} is an operation taking polynomials in ${math`x`} to polynomials in ${math`x`}, with the rules (i) ${math`\triangle x = ${1}`}; (ii) ${math`\triangle(f(x) + g(x)) = \triangle f(x) + \triangle g(x)`}; (iii) ${math`\triangle(\lambda f(x)) = \lambda\triangle f(x)`} for any constant ${math`\lambda`}; (iv) ${math`\triangle(f(x)g(x)) = f(x)\triangle g(x) + g(x)\triangle f(x)`}. Using these rules show that if ${math`f(x)`} is a constant then ${math`\triangle f(x) = ${0}`}. Calculate ${math`\triangle x^{${2}}`} and ${math`\triangle x^{${3}}`}. Prove that ${math`\triangle h(x) \equiv \frac{dh(x)}{dx}`} for any polynomial ${math`h(x)`}, making clear whenever you use one of the rules.`,
  writeUp: 'proof',
  hints: [
    t`Applying rule (iv) to ${math`${1} \cdot x`}, what does it say about ${math`\triangle ${1}`}, and then rule (iii) about any constant?`,
    t`How do ${math`\triangle x^{${2}}`} and ${math`\triangle x^{${3}}`} follow from the product rule, and what pattern do they suggest for ${math`\triangle x^{n}`}?`,
    t`How does induction on ${math`n`} prove that pattern, and how do rules (ii) and (iii) extend it to every polynomial?`,
  ],
  official: cite(F20H, 'Assignment 20 hints, Q4'),
});

const sinProof = supervision({
  id: 'a20-q1-i',
  source: cite(F20, 'Assignment 20, Q1(i), (ii)'),
  title: t`Sine, cosine, and the logarithm from first principles`,
  prompt: t`Using ${math`f'(x) = \lim_{h \to ${0}} \frac{f(x + h) - f(x)}{h}`}, ${math`\sin(A + B) = \sin A\cos B + \cos A\sin B`}, and the small angle approximations ${math`\sin\theta \approx \theta`} and ${math`\cos\theta \approx ${1} - \frac{${1}}{${2}}\theta^{${2}}`} (for ${math`\theta`} in radians), find the derivatives of ${math`\sin x`} and of ${math`\cos x`}. Then, using ${math`\ln(${1} + t) = t - \frac{${1}}{${2}}t^{${2}} + \frac{${1}}{${3}}t^{${3}} - \cdots`} for ${math`-${1} < t < ${1}`}, find the derivative of ${math`\ln x`}.`,
  writeUp: 'proof',
  hints: [
    t`Expanding ${math`\sin(x + h)`} with the addition formula, what is the difference quotient?`,
    t`With the small angle approximations, what do ${math`\frac{\cos h - ${1}}{h}`} and ${math`\frac{\sin h}{h}`} tend to?`,
    t`For ${math`\ln x`}, how does ${math`\ln(x + h) - \ln x`} become ${math`\ln\left(${1} + \frac{h}{x}\right)`}, and what does the series give for small ${math`h`}?`,
  ],
  official: cite(F20H, 'Assignment 20 hints, Q1(i), (ii)'),
});

// ---------------------------------------------------------------- lesson

const SMALL = [0.1, 0.01, 0.001];

export const firstPrinciples: TopicContent = {
  topicId: 'calc.first-principles',
  goal: t`Differentiate from ${math`\lim_{h \to ${0}} \frac{f(x + h) - f(x)}{h}`}, using the small angle approximations for ${math`\sin x`} and ${math`\cos x`} and series for ${math`\ln x`}.`,
  objective: t`Derive derivatives straight from the limit definition, for powers, roots, sine, cosine, and ln x.`,
  why: t`STEP asks for first principles directly, and every rule you use later rests on these limits.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`Back to the definition` },
    { kind: 'hook', text: t`You know that the derivative of ${math`\sin x`} is ${math`\cos x`}. But why? The power rule cannot help: ${math`\sin x`} is not a power. The only thing we have is the definition itself, the limit of chord gradients. Can that bare definition really produce ${math`\cos x`}?` },
    { kind: 'narrative', text: t`Recall the definition: ${math`f'(x) = \lim_{h \to ${0}} \frac{f(x + h) - f(x)}{h}`}. Working from it directly is called differentiating from first principles. The method is always the same: rewrite the top until a factor ${math`h`} appears, cancel it, and only then let ${math`h`} shrink. You cannot let ${math`h`} shrink first: the fraction would become ${math`\frac{${0}}{${0}}`}, which means nothing.` },
    { kind: 'definition', name: t`Difference quotient`, formal: t`For ${math`h \ne ${0}`}, the [[difference-quotient|difference quotient]] of ${math`f`} at ${math`x`} is ${math`\frac{f(x + h) - f(x)}{h}`}, the gradient of the chord from ${math`(x, f(x))`} to ${math`(x + h, f(x + h))`}. Its limit as ${math`h \to ${0}`}, when it exists, is ${math`f'(x)`}.`, plain: t`The slope of a chord, before the limit. For ${math`f(x) = x^{${2}} + ${3}x`}, the top is ${math`(x + h)^{${2}} + ${3}(x + h) - x^{${2}} - ${3}x = ${2}xh + h^{${2}} + ${3}h`}, so the quotient is ${math`${2}x + h + ${3}`}, which tends to ${math`${2}x + ${3}`}.` },
    checkFrom(diffQuotient, { cubic: false, a: 3, b: -2, c: 1 }, t`The ${math`x^{${2}}`} terms and constants cancel, leaving ${math`${6}xh + ${3}h^{${2}} - ${2}h`}; divide by ${math`h`}.`),
    { kind: 'section', title: t`Roots: the conjugate` },
    { kind: 'narrative', text: t`For ${math`f(x) = \sqrt{x}`} the top ${math`\sqrt{x + h} - \sqrt{x}`} has no visible factor ${math`h`}. The trick is the one you use to rationalise a denominator: multiply by ${math`\sqrt{x + h} + \sqrt{x}`}, because ${math`(\sqrt{u} - \sqrt{v})(\sqrt{u} + \sqrt{v}) = u - v`}.` },
    {
      kind: 'steps',
      steps: [
        { label: t`Multiply by the conjugate`, text: t`For ${math`x > ${0}`}:`, eq: [dmath`\frac{\sqrt{x + h} - \sqrt{x}}{h} = \frac{(x + h) - x}{h(\sqrt{x + h} + \sqrt{x})}`] },
        { label: t`Cancel h`, text: t`The top is ${math`h`}, so the quotient is ${math`\frac{${1}}{\sqrt{x + h} + \sqrt{x}}`}.` },
        { label: t`Let h shrink`, text: t`${math`\sqrt{x + h} \to \sqrt{x}`}, so the quotient tends to ${math`\frac{${1}}{${2}\sqrt{x}}`}: the power rule's ${math`\frac{${1}}{${2}}x^{-\frac{${1}}{${2}}}`}.`, why: { q: t`Why may we put ${math`h = ${0}`} now?`, a: t`The expression no longer divides by ${math`h`}; it is a continuous function of ${math`h`}, so its limit is its value at ${math`h = ${0}`}.` } },
      ],
    },
    { kind: 'section', title: t`Sine and cosine` },
    { kind: 'narrative', text: t`For the sine we need two limits about small angles, measured in radians. Look at the numbers first:` },
    { kind: 'table', caption: t`Two small-angle limits, with ${math`h`} in radians`, head: [t`${math`h`}`, t`${math`\frac{\sin h}{h}`}`, t`${math`\frac{\cos h - ${1}}{h}`}`], rows: SMALL.map((h) => [t`${h}`, t`${Number((Math.sin(h) / h).toPrecision(6))}`, t`${Number(((Math.cos(h) - 1) / h).toPrecision(3))}`]) },
    { kind: 'theorem', name: t`Small-angle limits`, statement: t`With angles in radians, ${math`\lim_{h \to ${0}} \frac{\sin h}{h} = ${1}`} and ${math`\lim_{h \to ${0}} \frac{\cos h - ${1}}{h} = ${0}`}.` },
    { kind: 'p', text: t`These are the precise form of the small angle approximations ${math`\sin h \approx h`} and ${math`\cos h \approx ${1} - \frac{${1}}{${2}}h^{${2}}`}: the errors are so small that, after dividing by ${math`h`}, they vanish. We take them from the small-angle lesson.`, why: { q: t`Where does the second limit come from?`, a: t`${math`\cos h - ${1} \approx -\frac{${1}}{${2}}h^{${2}}`}, so ${math`\frac{\cos h - ${1}}{h} \approx -\frac{${1}}{${2}}h`}, which tends to ${0}.` } },
    { kind: 'theorem', name: t`Derivative of the sine`, statement: t`For every real ${math`x`} (in radians), ${math`\frac{d}{dx}\sin x = \cos x`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Expand`, text: t`By the compound angle formula, ${math`\sin(x + h) = \sin x\cos h + \cos x\sin h`}.` },
        { label: t`Group`, text: t`Subtract ${math`\sin x`} and divide by ${math`h`}:`, eq: [dmath`\frac{\sin(x + h) - \sin x}{h} = \sin x \cdot \frac{\cos h - ${1}}{h} + \cos x \cdot \frac{\sin h}{h}`], plain: t`${math`x`} is fixed; only ${math`h`} moves, so ${math`\sin x`} and ${math`\cos x`} are constants here.` },
        { label: t`Take limits`, text: t`By the small-angle limits the first term tends to ${math`\sin x \cdot ${0}`} and the second to ${math`\cos x \cdot ${1}`}. So the derivative is ${math`\cos x`}.` },
      ],
    },
    { kind: 'p', text: t`The same three steps with ${math`\cos(x + h) = \cos x\cos h - \sin x\sin h`} give ${math`\frac{d}{dx}\cos x = -\sin x`}. For ${math`\ln x`}, write ${math`\ln(x + h) - \ln x = \ln\left(${1} + \frac{h}{x}\right) = \frac{h}{x} - \frac{${1}}{${2}}\frac{h^{${2}}}{x^{${2}}} + \cdots`}; dividing by ${math`h`} and letting ${math`h \to ${0}`} leaves ${math`\frac{${1}}{x}`}.` },
    { kind: 'pitfall', claim: t`Take the limit of the top and the bottom separately.`, counterexample: t`For ${math`x^{${2}}`} at ${3}, the top ${math`(${3} + h)^{${2}} - ${9}`} and the bottom ${math`h`} both tend to ${0}, and ${math`\frac{${0}}{${0}}`} is meaningless. Simplify first: ${math`${6} + h`}, which tends to ${6}.` },
    { kind: 'pitfall', claim: t`The derivative of ${math`\sin x`} is ${math`\cos x`} whatever the units.`, counterexample: t`In degrees, ${math`\frac{\sin h^{\circ}}{h} \to \frac{\pi}{${180}}`}, not ${1}, so the derivative of ${math`\sin x^{\circ}`} is ${math`\frac{\pi}{${180}}\cos x^{\circ}`}. Calculus uses radians.` },
    { kind: 'takeaway', text: t`From first principles: rewrite ${math`f(x + h) - f(x)`} until a factor ${math`h`} appears, cancel it, and only then let ${math`h \to ${0}`}.` },
  ],
  examples: [
    { ...workedCambridge(sqrtQ), examiner: t`The examiner wants the approximation justified and the neglected terms shown to vanish, not the power rule quoted.` },
    worked(limitAt, { kind: 'recip', k: 3, s: 2 }, t`A reciprocal from the limit`),
    worked(diffQuotient, { cubic: true, a: 2, b: -1, c: 4 }, t`The quotient of a cubic`),
  ],
  generators: [diffQuotient, limitAt, chordGradient],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['difference-quotient'],
  cambridge: withUses([invRootQ, nstD2, triangleQ, triangleProof, sinProof], {
    'a20-q4': { sections: ['Back to the definition'], note: t`Showing an operator with the product rule is the derivative` },
    'a20-q4-cube': { sections: ['Back to the definition'], note: t`Applying the product rule to a cube` },
  }),
  gate: ['a20-q4', 'a20-q4-cube'],
  recall: [
    { front: t`What are the two small-angle limits?`, back: t`${math`\frac{\sin h}{h} \to ${1}`} and ${math`\frac{\cos h - ${1}}{h} \to ${0}`} as ${math`h \to ${0}`}, in radians.` },
    { front: t`How do you differentiate ${math`\sqrt{x}`} from first principles?`, back: t`Multiply the quotient by the conjugate ${math`\sqrt{x + h} + \sqrt{x}`}, cancel ${math`h`}, and let ${math`h \to ${0}`}: ${math`\frac{${1}}{${2}\sqrt{x}}`}.` },
  ],
  proofOrder: [{
    title: t`The derivative of the sine`,
    steps: [
      t`Expand ${math`\sin(x + h) = \sin x\cos h + \cos x\sin h`}.`,
      t`Subtract ${math`\sin x`} and divide by ${math`h`}.`,
      t`Group into ${math`\sin x \frac{\cos h - ${1}}{h} + \cos x \frac{\sin h}{h}`}.`,
      t`Use the small-angle limits: the derivative is ${math`\cos x`}.`,
    ],
  }],
};

