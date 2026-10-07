/**
 * calc.definite-integrals: the definite integral as signed area (the limit of sums of thin
 * strips), antiderivatives, and the fundamental theorem of calculus, proved by squeezing the
 * area function's difference quotient. The Cambridge problems are STEP Support Foundation
 * Assignment 3, Q2(i) (an integral as a trapezium) and Assignment 18, Q3 (2014 STEP I Q3,
 * the integral of x^2 equal to the square of the integral of x), with their hints.
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { add, div, int, mul, pick, q, str, sub, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { poly } from '../poly';
import { close, firstError, polyAt, simpson } from '../prep-c';
import { computedMath as cm, dmath, math, t } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

const F03 = 'step-f03' as const;
const F03H = 'step-f03-hints' as const;
const F18 = 'step-f18' as const;
const F18H = 'step-f18-hints' as const;

/** The antiderivative's coefficients, highest power first, with constant 0: c x^n becomes c x^(n+1)/(n+1). */
const antideriv = (c: readonly number[]): Rational[] => [...c.map((a, i) => q(a, c.length - i)), q(0)];
const evalQ = (c: readonly Rational[], x: Rational): Rational => c.reduce<Rational>((acc, a) => add(mul(acc, x), a), q(0));
const integral = (c: readonly number[], a: number, b: number): Rational => sub(evalQ(antideriv(c), q(b)), evalQ(antideriv(c), q(a)));
/** "x^3/3 - x^2 + 4x" for the antiderivative, as text in the expression language. */
const antiText = (c: readonly number[]): string => {
  const parts = c.map((a, i) => {
    const n = c.length - i;
    const coef = q(a, n);
    return str(coef) === '0' ? '' : `(${str(coef)})*x^${n}`;
  }).filter((s) => s !== '');
  return parts.length === 0 ? '0' : parts.join(' + ');
};

// ---------------------------------------------------------------- a polynomial integral

interface PolyP { c: number[]; a: number; b: number }
const polyIntegral = generator<PolyP>({
  id: 'polynomial-integral',
  skill: 'Integrate a quadratic between limits: antiderivative term by term, then F(b) - F(a).',
  params: (rng) => {
    for (;;) {
      const a = int(rng, -2, 2);
      const p: PolyP = { c: [pick(rng, [1, 2, 3, -1, -3]), int(rng, -4, 4), int(rng, -5, 5)], a, b: a + int(rng, 1, 3) };
      const right = str(integral(p.c, p.a, p.b));
      const swapped = str(sub(q(0), integral(p.c, p.a, p.b)));
      const noDivide = str(sub(evalQ([...p.c.map((x) => q(x)), q(0)], q(p.b)), evalQ([...p.c.map((x) => q(x)), q(0)], q(p.a))));
      if (new Set([right, swapped, noDivide]).size === 3) return p;
    }
  },
  sane: ({ a, b }) => (b > a ? null : 'limits out of order'),
  problem: (p) => {
    const F = antiText(p.c);
    const Fb = evalQ(antideriv(p.c), q(p.b));
    const Fa = evalQ(antideriv(p.c), q(p.a));
    return {
      prompt: t`Evaluate ${math`\int_{${p.a}}^{${p.b}} (${cm(poly(p.c))})\,dx`}.`,
      answer: { kind: 'exact', expected: str(integral(p.c, p.a, p.b)) },
      solution: [
        t`An antiderivative is ${math`F(x) = ${cm(F)}`}: raise each power by one and divide by the new power.`,
        t`${math`F(${p.b}) - F(${p.a}) = ${Fb} - \left(${Fa}\right) = ${integral(p.c, p.a, p.b)}`}.`,
      ],
    };
  },
  // Simpson's rule is exact for quadratics; round to a fraction with denominator 6.
  solve: (p) => str(q(Math.round(simpson((x) => polyAt(p.c, x), p.a, p.b, 2) * 6), 6)),
  misconceptions: (p): Misconception[] => [
    { response: str(sub(q(0), integral(p.c, p.a, p.b))), why: t`The order is ${math`F(b) - F(a)`}: the upper limit first.` },
    { response: str(sub(evalQ([...p.c.map((x) => q(x)), q(0)], q(p.b)), evalQ([...p.c.map((x) => q(x)), q(0)], q(p.a)))), why: t`Raising the power is not enough: divide by the new power too. ${math`\int x^{n}\,dx = \frac{x^{n + ${1}}}{n + ${1}}`}.` },
  ],
});

// ---------------------------------------------------------------- the area enclosed by a parabola

interface AreaP { r: number; s: number }
const areaVal = ({ r, s }: AreaP): Rational => q((s - r) ** 3, 6);
const areaBelow = generator<AreaP>({
  id: 'area-below-axis',
  skill: 'Find the area between a parabola and the x axis where the curve is below the axis: the integral is negative, the area is its size.',
  params: (rng) => {
    for (;;) {
      const r = int(rng, -3, 2);
      const p: AreaP = { r, s: r + int(rng, 1, 4) };
      if (p.r !== 0) return p;
    }
  },
  sane: ({ r, s }) => (s > r ? null : 'roots out of order'),
  problem: (p) => {
    const c = [1, -(p.r + p.s), p.r * p.s];
    return {
      prompt: t`Find the area of the region enclosed by the curve ${math`y = ${cm(poly(c))}`} and the ${math`x`} axis.`,
      answer: { kind: 'exact', expected: str(areaVal(p)) },
      solution: [
        t`${math`${cm(poly(c))} = (${cm(poly([1, -p.r]))})(${cm(poly([1, -p.s]))})`}, which is ${0} at ${math`x = ${p.r}`} and ${math`x = ${p.s}`} and negative between them.`,
        t`${math`\int_{${p.r}}^{${p.s}} (${cm(poly(c))})\,dx = ${integral(c, p.r, p.s)}`}. The region is below the axis, so the integral is negative; the area is its size, ${areaVal(p)}.`,
      ],
    };
  },
  solve: (p) => {
    const c = [1, -(p.r + p.s), p.r * p.s];
    return str(q(Math.round(Math.abs(simpson((x) => polyAt(c, x), p.r, p.s, 2)) * 6), 6));
  },
  misconceptions: (p): Misconception[] => {
    const c = [1, -(p.r + p.s), p.r * p.s];
    return [
      { response: str(integral(c, p.r, p.s)), why: t`An area is never negative. The curve is below the axis here, so the integral is minus the area.` },
      { response: str(evalQ(antideriv(c), q(p.s))), why: t`Subtract the antiderivative at the lower limit too: the integral is ${math`F(${p.s}) - F(${p.r})`}.` },
    ];
  },
});

// ---------------------------------------------------------------- an exponential integral

interface ExpP { k: number; m: number }
const expVal = ({ k, m }: ExpP): Rational => q(m ** k - 1, k);
const expIntegral = generator<ExpP>({
  id: 'exponential-integral',
  skill: 'Integrate e^(kx) from 0 to ln m: [e^(kx)/k] gives (m^k - 1)/k.',
  quick: true,
  params: (rng) => ({ k: pick(rng, [2, 3, 4]), m: pick(rng, [2, 3]) }),
  sane: ({ k }) => (k >= 2 ? null : 'k too small'),
  problem: (p) => ({
    prompt: t`Evaluate ${math`\int_{${0}}^{\ln ${p.m}} e^{${p.k}x}\,dx`}.`,
    answer: { kind: 'exact', expected: str(expVal(p)) },
    solution: [
      t`${math`\frac{d}{dx}\frac{e^{${p.k}x}}{${p.k}} = e^{${p.k}x}`}, so an antiderivative is ${math`\frac{e^{${p.k}x}}{${p.k}}`}.`,
      t`At ${math`\ln ${p.m}`}: ${math`e^{${p.k}\ln ${p.m}} = ${p.m}^{${p.k}} = ${p.m ** p.k}`}. At ${0}: ${math`e^{${0}} = ${1}`}. So the integral is ${math`\frac{${p.m ** p.k} - ${1}}{${p.k}} = ${expVal(p)}`}.`,
    ],
  }),
  solve: (p) => str(q(Math.round(simpson((x) => Math.exp(p.k * x), 0, Math.log(p.m)) * p.k), p.k)),
  misconceptions: (p): Misconception[] => [
    { response: String(p.m ** p.k - 1), why: t`The antiderivative of ${math`e^{${p.k}x}`} is ${math`\frac{e^{${p.k}x}}{${p.k}}`}: differentiating it must give back exactly ${math`e^{${p.k}x}`}.` },
    { response: str(q(p.m ** p.k, p.k)), why: t`The lower limit contributes too: at ${math`x = ${0}`}, ${math`\frac{e^{${0}}}{${p.k}} = \frac{${1}}{${p.k}}`}, which must be subtracted.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const trapezium = auto({
  id: 'a3-q2-i',
  source: cite(F03, 'Assignment 3, Q2(i)'),
  title: t`An integral as a trapezium`,
  prompt: t`Sketch the graph of ${math`y = ${2}x + ${1}`}. Use your graph and the formula for the area of a trapezium to evaluate ${math`\int_{${2}}^{${5}} (${2}x + ${1})\,dx`}.`,
  answer: { kind: 'exact', expected: '24' },
  solution: [
    t`Between ${math`x = ${2}`} and ${math`x = ${5}`} the line is above the axis, from height ${5} to height ${11}. The region under it is a trapezium of width ${3}.`,
    t`Area ${math`= \frac{${3}}{${2}}(${5} + ${11}) = ${24}`}. As a check, ${math`\left[x^{${2}} + x\right]_{${2}}^{${5}} = ${30} - ${6} = ${24}`}.`,
  ],
  reference: '24',
  verify: () => firstError(same('trapezium', (3 / 2) * (5 + 11), 24), close('Simpson', simpson((x) => 2 * x + 1, 2, 5, 2), 24)),
  misconceptions: [{ response: '48', why: t`The trapezium's area is half the sum of the parallel sides times the width: ${math`\frac{${1}}{${2}}(${5} + ${11}) \times ${3}`}.` }],
  official: { source: cite(F03H, 'Assignment 3 hints, Q2(i)'), answer: '24', agrees: true },
});

const stepB = auto({
  id: 'a18-q3-i',
  source: cite(F18, 'Assignment 18, Q3(i)'),
  title: t`STEP: when the integral of a square is the square of the integral`,
  prompt: t`The number ${math`b > ${0}`} is such that ${math`\int_{${0}}^{b} x^{${2}}\,dx = \left(\int_{${0}}^{b} x\,dx\right)^{${2}}`}. Find ${math`b`}.`,
  answer: { kind: 'exact', expected: '4/3' },
  solution: [
    t`${math`\int_{${0}}^{b} x^{${2}}\,dx = \frac{b^{${3}}}{${3}}`} and ${math`\int_{${0}}^{b} x\,dx = \frac{b^{${2}}}{${2}}`}, so ${math`\frac{b^{${3}}}{${3}} = \frac{b^{${4}}}{${4}}`}.`,
    t`Multiply by ${12}: ${math`${4}b^{${3}} = ${3}b^{${4}}`}. Since ${math`b > ${0}`} we may divide by ${math`b^{${3}}`}: ${math`b = ${q(4, 3)}`}.`,
  ],
  reference: '4/3',
  verify: () => {
    const b = 4 / 3;
    return close('the two sides', simpson((x) => x * x, 0, b), simpson((x) => x, 0, b) ** 2);
  },
  misconceptions: [{ response: '3/4', why: t`From ${math`${4}b^{${3}} = ${3}b^{${4}}`}, dividing by ${math`${3}b^{${3}}`} gives ${math`b = \frac{${4}}{${3}}`}.` }],
  official: { source: cite(F18H, 'Assignment 18 hints, Q3(i)'), answer: '4/3', agrees: true },
});

const rootB = (): number => {
  let lo = 2;
  let hi = 3;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (3 * mid ** 3 - mid ** 2 - 7 * mid - 7 < 0) lo = mid; else hi = mid;
  }
  return lo;
};
const stepBroot = auto({
  id: 'a18-q3-ii-root',
  source: cite(F18, 'Assignment 18, Q3(ii)', true),
  title: t`STEP: the value of b when a is one`,
  prompt: t`Now ${math`a = ${1}`} and ${math`b > ${1}`} satisfy ${math`\int_{a}^{b} x^{${2}}\,dx = \left(\int_{a}^{b} x\,dx\right)^{${2}}`}, which leads to ${math`${3}b^{${3}} - b^{${2}} - ${7}b - ${7} = ${0}`}. This cubic has one real root. Find it, correct to ${3} significant figures.`,
  answer: { kind: 'numeric', expected: rootB() },
  solution: [
    t`${math`y = ${3}b^{${3}} - b^{${2}} - ${7}b - ${7}`} has ${math`y' = ${9}b^{${2}} - ${2}b - ${7} = (b - ${1})(${9}b + ${7})`}: turning points at ${math`b = ${1}`} and ${math`b = -\frac{${7}}{${9}}`}, both below the axis, so there is one real root.`,
    t`${math`y(${2}) = ${-3}`} and ${math`y(${3}) = ${44}`}, so the root lies between ${2} and ${3}; halving the interval repeatedly gives about ${Number(rootB().toPrecision(5))}.`,
  ],
  reference: String(Number(rootB().toPrecision(6))),
  verify: () => firstError(close('the cubic at the root', 3 * rootB() ** 3 - rootB() ** 2 - 7 * rootB() - 7, 0, 1e-9), close('the integrals', simpson((x) => x * x, 1, rootB()), simpson((x) => x, 1, rootB()) ** 2, 1e-6)),
  misconceptions: [{ response: '1', why: t`${math`b = ${1}`} makes both integrals ${0}, but the question needs ${math`b > a = ${1}`}. Divide out the factor ${math`b - ${1}`} first: that is where the cubic comes from.` }],
  official: { source: cite(F18H, 'Assignment 18 hints, Q3(ii)'), answer: '2.039', agrees: true },
});

const stepFull = supervision({
  id: 'a18-q3',
  source: cite(F18, 'Assignment 18, Q3'),
  title: t`STEP: the integral of a square`,
  prompt: t`The numbers ${math`a`} and ${math`b`}, where ${math`b > a \ge ${0}`}, are such that ${math`\int_{a}^{b} x^{${2}}\,dx = \left(\int_{a}^{b} x\,dx\right)^{${2}}`}. (i) In the case ${math`a = ${0}`} and ${math`b > ${0}`}, find the value of ${math`b`}. (ii) In the case ${math`a = ${1}`}, show that ${math`b`} satisfies ${math`${3}b^{${3}} - b^{${2}} - ${7}b - ${7} = ${0}`}. Show further, with the help of a sketch, that there is only one real value of ${math`b`} that satisfies this equation and that it lies between ${2} and ${3}. (iii) Show that ${math`${3}p^{${2}} + q^{${2}} = ${3}p^{${2}}q`}, where ${math`p = b + a`} and ${math`q = b - a`}, and express ${math`p^{${2}}`} in terms of ${math`q`}. Deduce that ${math`${1} < b - a \le \frac{${4}}{${3}}`}.`,
  writeUp: 'proof',
  official: cite(F18H, 'Assignment 18 hints, Q3'),
});

// ---------------------------------------------------------------- lesson

const STRIPS = [4, 16, 64];
const leftSum = (n: number): number => {
  let s = 0;
  for (let i = 0; i < n; i++) s += ((i / n) ** 2) / n;
  return s;
};

export const definiteIntegrals: TopicContent = {
  topicId: 'calc.definite-integrals',
  goal: t`Evaluate a definite integral from an antiderivative and read it as an area.`,
  objective: t`Read an integral as a signed area and evaluate it from an antiderivative, knowing why that works.`,
  why: t`Areas, probabilities from densities, and every later integration technique rest on this theorem.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`Area under a curve` },
    { kind: 'hook', text: t`The area under the line ${math`y = ${2}x + ${1}`} from ${math`x = ${2}`} to ${math`x = ${5}`} is a trapezium: ${24}. Under a curve such as ${math`y = x^{${2}}`} there is no formula from geometry. Yet the area under ${math`y = x^{${2}}`} from ${0} to ${1} is exactly ${q(1, 3)}. Where could a third come from?` },
    { kind: 'narrative', text: t`Slice the region into thin vertical strips. Each is nearly a rectangle, and rectangles we can add. Use ${math`n`} strips of width ${math`\frac{${1}}{n}`} under ${math`y = x^{${2}}`}, each as tall as the curve at its left edge:` },
    { kind: 'table', caption: t`Rectangles under ${math`y = x^{${2}}`} on ${math`[${0}, ${1}]`}: the total creeps up towards ${q(1, 3)}`, head: [t`strips ${math`n`}`, t`total area`], rows: STRIPS.map((n) => [t`${n}`, t`${Number(leftSum(n).toPrecision(5))}`]) },
    { kind: 'definition', name: t`Definite integral`, formal: t`For ${math`f`} continuous on ${math`[a, b]`}, the [[definite-integral|definite integral]] is ${math`\int_{a}^{b} f(x)\,dx = \lim_{n \to \infty} \sum_{i = ${1}}^{n} f(x_{i})\,\Delta`}, where ${math`\Delta = \frac{b - a}{n}`} and ${math`x_{i} = a + i\Delta`}. (The limit exists for continuous ${math`f`}; that is proved in IA Analysis.)`, plain: t`The total of thinner and thinner strips. Strips below the axis count negatively, so it is a signed area: ${math`\int_{${0}}^{${2}} (x^{${2}} - ${2}x)\,dx = -\frac{${4}}{${3}}`}, because that region lies below the axis.` },
    { kind: 'definition', name: t`Antiderivative`, formal: t`${math`F`} is an [[antiderivative|antiderivative]] of ${math`f`} on an interval if ${math`F'(x) = f(x)`} for every ${math`x`} in it.`, plain: t`A function whose derivative is ${math`f`}. ${math`\frac{x^{${3}}}{${3}}`} is one for ${math`x^{${2}}`}; so is ${math`\frac{x^{${3}}}{${3}} + ${7}`}.` },
    { kind: 'section', title: t`The fundamental theorem` },
    { kind: 'narrative', text: t`Here is the surprise that makes integration practical: area and derivative undo each other. Let ${math`A(x)`} be the area under ${math`f`} from ${math`a`} to ${math`x`}. Nudge ${math`x`} by ${math`h`}: the area grows by a thin strip about ${math`f(x)`} tall and ${math`h`} wide. So ${math`A`} grows at rate ${math`f(x)`}.` },
    { kind: 'theorem', name: t`Fundamental theorem of calculus`, statement: t`Let ${math`f`} be continuous on ${math`[a, b]`} and ${math`A(x) = \int_{a}^{x} f(t)\,dt`}. Then ${math`A'(x) = f(x)`} for ${math`a < x < b`}. Consequently, if ${math`F`} is any antiderivative of ${math`f`} on ${math`[a, b]`}, then ${math`\int_{a}^{b} f(x)\,dx = F(b) - F(a)`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`The new strip`, text: t`For small ${math`h > ${0}`}, ${math`A(x + h) - A(x) = \int_{x}^{x + h} f(t)\,dt`}.` },
        { label: t`Trap it`, text: t`Let ${math`m_{h}`} and ${math`M_{h}`} be the least and greatest values of ${math`f`} on ${math`[x, x + h]`}. The strip lies between rectangles of height ${math`m_{h}`} and ${math`M_{h}`}:`, eq: [dmath`m_{h} \le \frac{A(x + h) - A(x)}{h} \le M_{h}`] },
        { label: t`Squeeze`, text: t`As ${math`h \to ${0}`}, both ${math`m_{h}`} and ${math`M_{h}`} tend to ${math`f(x)`}, because ${math`f`} is continuous. So the quotient tends to ${math`f(x)`}: ${math`A'(x) = f(x)`}. (For ${math`h < ${0}`} the same argument runs on ${math`[x + h, x]`}.)` },
        { label: t`Any antiderivative will do`, text: t`${math`(A - F)' = f - f = ${0}`}, so ${math`A - F`} is a constant ${math`C`}. At ${math`x = a`}, ${math`A(a) = ${0}`}, so ${math`C = -F(a)`}, and ${math`A(b) = F(b) - F(a)`}.`, why: { q: t`Why is a function with zero derivative constant?`, a: t`By the mean value theorem: ${math`G(y) - G(x) = G'(c)(y - x)`} for some ${math`c`} between, and ${math`G'(c) = ${0}`}. We use it without proof here; it is in IA Analysis.` } },
      ],
    },
    { kind: 'narrative', text: t`We write ${math`\left[F(x)\right]_{a}^{b}`} for ${math`F(b) - F(a)`}. The antiderivatives we know come from reading derivatives backwards: ${math`\int x^{n}\,dx = \frac{x^{n + ${1}}}{n + ${1}}`} for ${math`n \ne -${1}`}, ${math`\int e^{kx}\,dx = \frac{e^{kx}}{k}`}, and ${math`\int \frac{${1}}{x}\,dx = \ln x`} for ${math`x > ${0}`}. For the hook: ${math`\int_{${0}}^{${1}} x^{${2}}\,dx = \left[\frac{x^{${3}}}{${3}}\right]_{${0}}^{${1}} = ${q(1, 3)}`}.` },
    checkFrom(expIntegral, { k: 2, m: 3 }, t`${math`\left[\frac{e^{${2}x}}{${2}}\right]_{${0}}^{\ln ${3}} = \frac{${9}}{${2}} - \frac{${1}}{${2}} = ${4}`}.`),
    { kind: 'pitfall', claim: t`${math`\int_{a}^{b} f(x)\,dx`} is always the area between the curve and the axis.`, counterexample: t`${math`\int_{${-1}}^{${1}} x\,dx = ${0}`}, but the region between ${math`y = x`} and the axis has area ${1}: the part below the axis counts negatively. Split at the roots for an area.` },
    { kind: 'pitfall', claim: t`${math`\int_{${-1}}^{${1}} \frac{${1}}{x^{${2}}}\,dx = \left[-\frac{${1}}{x}\right]_{${-1}}^{${1}} = ${-2}`}.`, counterexample: t`The integrand is positive, so a negative answer is impossible. ${math`\frac{${1}}{x^{${2}}}`} is not continuous on ${math`[${-1}, ${1}]`} (it blows up at ${0}), so the theorem does not apply; in fact the area is infinite.` },
    { kind: 'takeaway', text: t`The definite integral is a signed area, and if ${math`F' = f`} with ${math`f`} continuous, it equals ${math`F(b) - F(a)`}.` },
  ],
  examples: [
    { ...workedCambridge(trapezium), examiner: t`The examiner wants the integral read as an area from the sketch, with no stray constant of integration in the answer.` },
    worked(polyIntegral, { c: [3, -2, 1], a: -1, b: 2 }, t`A quadratic between limits`),
    worked(areaBelow, { r: -1, s: 3 }, t`An area below the axis`),
  ],
  generators: [polyIntegral, areaBelow, expIntegral],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['definite-integral', 'antiderivative'],
  cambridge: withUses([stepB, stepBroot, stepFull], {
    'a18-q3': { sections: ['The fundamental theorem'], note: t`Two integrals compared, then a cubic located by a sketch`, needs: ['calc.curve-sketching'] },
    'a18-q3-i': { sections: ['The fundamental theorem'], note: t`Comparing two integrals` },
  }),
  gate: ['a18-q3', 'a18-q3-i'],
  recall: [
    { front: t`State the fundamental theorem of calculus.`, back: t`If ${math`f`} is continuous on ${math`[a, b]`}, ${math`\frac{d}{dx}\int_{a}^{x} f(t)\,dt = f(x)`}, and ${math`\int_{a}^{b} f = F(b) - F(a)`} for any antiderivative ${math`F`}.` },
    { front: t`What is ${math`\int x^{n}\,dx`}?`, back: t`${math`\frac{x^{n + ${1}}}{n + ${1}}`} plus a constant, for ${math`n \ne -${1}`}.` },
  ],
  proofOrder: [{
    title: t`The area function's derivative`,
    steps: [
      t`The change ${math`A(x + h) - A(x)`} is the area of a thin strip.`,
      t`The strip lies between rectangles of heights ${math`m_{h}`} and ${math`M_{h}`}.`,
      t`So the quotient lies between ${math`m_{h}`} and ${math`M_{h}`}.`,
      t`By continuity both tend to ${math`f(x)`}, so ${math`A'(x) = f(x)`}.`,
    ],
  }],
};
