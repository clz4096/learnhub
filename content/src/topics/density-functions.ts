/**
 * rv.pdf: a continuous random variable has a density f with f ≥ 0 and total area 1;
 * probabilities are areas under f, and f = F' for the distribution function F. From the
 * STEP 2 Statistics topic notes (page 3) and STEP 2 Statistics Q2 (2007 S2 Q14: a density
 * pieced together from ln x, a constant, and a line, whose continuity and total area fix
 * its constants) and the stem of Q6 (2010 S2 Q13: a step density). Answers are compared
 * with the STEP 2 Statistics solutions.
 */
import { auto, cite, supervision } from '../cambridge';
import { add, int, mul, pick, q, str, sub, toFloat, type Rational } from '../math';
import { near, powQ, pw, simpson } from '../partv-b';
import { generator, type Misconception } from '../problem';
import { math, t } from '../rich';
import { worked, workedCambridge, type ProbabilityClaim, type TopicContent } from '../topic';

const [mf, mx, mX] = [math`f`, math`x`, math`X`];
const S2 = 'step-s2-stats' as const;
const S2SOL = 'step-s2-stats-solutions' as const;

// ---------------------------------------------------------------- a normalising constant

interface PowP { n: number; m: number }

const powerDensity = (p: PowP) => math`f(x) = c\,${pw('x', p.n)}`;
const powerSupport = (p: PowP) => math`${0} \le x \le ${p.m}`;

const normalising = generator<PowP>({
  id: 'normalising-constant',
  skill: 'Find the constant c that makes c x^n on [0, m] a density: the total area must be 1.',
  params: (rng) => ({ n: int(rng, 1, 3), m: int(rng, 2, 4) }),
  sane: ({ n, m }) => (n >= 1 && n <= 3 && m >= 2 && m <= 4 ? null : 'out of range'),
  problem: (p) => {
    const c = q(p.n + 1, p.m ** (p.n + 1));
    return {
      prompt: t`The random variable ${mX} has density ${powerDensity(p)} for ${powerSupport(p)}, and ${math`f(x) = ${0}`} otherwise. Find the constant ${math`c`}.`,
      answer: { kind: 'exact', expected: str(c) },
      solution: [
        t`The total area under a density is ${1}: ${math`\int_{${0}}^{${p.m}} c\,${pw('x', p.n)}\,dx = c\left[\frac{x^{${p.n + 1}}}{${p.n + 1}}\right]_{${0}}^{${p.m}} = \frac{${p.m ** (p.n + 1)}}{${p.n + 1}}\,c`}.`,
        t`Setting it equal to ${1} gives ${math`c = ${c}`}.`,
      ],
    };
  },
  solve: (p) => {
    // Simpson's rule is exact for these cubics or lower; the area fixes c over the denominator m^(n+1).
    const area = simpson((x) => x ** p.n, 0, p.m, 20);
    const den = p.m ** (p.n + 1);
    return str(q(Math.round(den / area), den));
  },
  misconceptions: (p): Misconception[] => [
    { response: str(q(1, p.m ** (p.n + 1))), why: t`The integral of ${math`${pw('x', p.n)}`} is ${math`x^{${p.n + 1}} / ${p.n + 1}`}: keep the ${math`${p.n + 1}`} in the denominator.` },
    { response: str(q(p.n + 1, p.m ** p.n)), why: t`Raise the upper limit to the power ${p.n + 1}, the power after integrating, not ${p.n}.` },
    { response: str(q(1, p.m)), why: t`That would make ${mX} uniform. The density is not constant, so integrate ${math`c\,${pw('x', p.n)}`}.` },
  ],
});

// ---------------------------------------------------------------- an area under the density

interface IntP { n: number; m: number; a: number; b: number }

const densityOf = (n: number, m: number): Rational => q(n + 1, m ** (n + 1));
const intervalProb = ({ n, m, a, b }: IntP): Rational => q(b ** (n + 1) - a ** (n + 1), m ** (n + 1));

const intervalProbability = generator<IntP>({
  id: 'interval-probability',
  skill: 'Find P(a ≤ X ≤ b) as the area under the density between a and b.',
  params: (rng) => {
    for (;;) {
      const m = int(rng, 2, 4);
      const a = int(rng, 0, m - 1);
      const b = int(rng, a + 1, m);
      // The whole support has probability 1, which every slip also gives.
      if (a > 0 || b < m) return { n: int(rng, 1, 3), m, a, b };
    }
  },
  sane: ({ m, a, b }) => (a >= 0 && a < b && b <= m && (a > 0 || b < m) ? null : 'out of range'),
  problem: (p) => {
    const c = densityOf(p.n, p.m);
    const v = intervalProb(p);
    return {
      prompt: t`${mX} has density ${math`f(x) = ${c}\,${pw('x', p.n)}`} for ${math`${0} \le x \le ${p.m}`}, and ${math`${0}`} otherwise. Find ${math`P(${p.a} \le X \le ${p.b})`}.`,
      answer: { kind: 'exact', expected: str(v) },
      solution: [
        t`The probability is the area under ${mf} from ${p.a} to ${p.b}: ${math`\int_{${p.a}}^{${p.b}} ${c}\,${pw('x', p.n)}\,dx = ${c} \left[\frac{x^{${p.n + 1}}}{${p.n + 1}}\right]_{${p.a}}^{${p.b}}`}.`,
        t`That is ${math`\frac{${p.b ** (p.n + 1)} - ${p.a ** (p.n + 1)}}{${p.m ** (p.n + 1)}} = ${v}`}.`,
      ],
    };
  },
  solve: (p) => {
    const area = simpson((x) => toFloat(densityOf(p.n, p.m)) * x ** p.n, p.a, p.b, 20);
    const den = p.m ** (p.n + 1);
    return str(q(Math.round(area * den), den));
  },
  misconceptions: (p): Misconception[] => {
    const c = densityOf(p.n, p.m);
    return [
      { response: str(q(p.b - p.a, p.m)), why: t`That treats ${mX} as uniform. The density rises with ${mx}, so integrate it over the interval.` },
      { response: str(sub(mul(c, q(p.b ** p.n)), mul(c, q(p.a ** p.n)))), why: t`${math`f(${p.b}) - f(${p.a})`} is a difference of heights, not an area. Integrate ${mf} from ${p.a} to ${p.b}.` },
      { response: str(q(p.b ** (p.n + 1), p.m ** (p.n + 1))), why: t`That is ${math`P(X \le ${p.b})`}. Subtract the area below ${p.a}.` },
      { response: str(q(p.b ** (p.n + 1) - p.a ** (p.n + 1), p.n + 1)), why: t`That is the integral of ${math`${pw('x', p.n)}`} alone. Multiply by the constant ${c} in the density.` },
      { response: str(sub(q(1), intervalProb(p))), why: t`That is the probability of falling outside ${math`[${p.a}, ${p.b}]`}. The area between the limits is the answer.` },
    ];
  },
  trial: (p, rng) => {
    // Inverse of F(x) = (x/m)^(n+1).
    const x = p.m * rng() ** (1 / (p.n + 1));
    return x >= p.a && x <= p.b;
  },
});

// ---------------------------------------------------------------- a step density (STEP 2 Q6)

interface StepP { k: Rational; b: Rational }

const stepHeight = ({ k, b }: StepP): Rational => {
  // a k + b (1 - k) = 1.
  const a = sub(q(1), mul(b, sub(q(1), k)));
  return q(a.num * k.den, a.den * k.num);
};
const KS: readonly Rational[] = [q(1, 4), q(1, 3), q(1, 2), q(2, 3), q(3, 4), q(1, 5), q(2, 5), q(3, 5)];
const BS: readonly Rational[] = [q(1, 2), q(1, 3), q(2, 3), q(1, 4), q(3, 4), q(2, 5)];

const stepDensity = generator<StepP>({
  id: 'step-density',
  skill: 'Find the missing height of a step density from the total area 1, as in STEP 2 Q6.',
  params: (rng) => ({ k: pick(rng, KS), b: pick(rng, BS) }),
  sane: ({ k, b }) => (toFloat(k) > 0 && toFloat(k) < 1 && toFloat(b) > 0 && toFloat(b) < 1 ? null : 'out of range'),
  problem: (p) => {
    const a = stepHeight(p);
    return {
      prompt: t`${mX} has density ${math`f(x) = ${a}`} for ${math`${0} \le x < ${p.k}`}, ${math`f(x) = b`} for ${math`${p.k} \le x \le ${1}`}, and ${math`${0}`} otherwise. Find ${math`b`}.`,
      answer: { kind: 'exact', expected: str(p.b) },
      solution: [
        t`The density is two rectangles. Their areas add to ${1}: ${math`${a} \times ${p.k} + b\,(${1} - ${p.k}) = ${1}`}.`,
        t`So ${math`b \times ${sub(q(1), p.k)} = ${1} - ${mul(a, p.k)} = ${sub(q(1), mul(a, p.k))}`}, and ${math`b = ${p.b}`}.`,
      ],
    };
  },
  solve: (p) => {
    // The area is linear in b: measure it at b = 0 and b = 1 cell by cell, then solve.
    const a = stepHeight(p);
    const d = Number(p.k.den);
    const cut = Number(p.k.num);
    const area = (b: Rational): Rational => Array.from({ length: d }, (_, i) => (i < cut ? a : b)).reduce((s, h) => add(s, mul(h, q(1, d))), q(0));
    const [a0, a1] = [area(q(0)), area(q(1))];
    const r = sub(q(1), a0);
    const slope = sub(a1, a0);
    return str(q(r.num * slope.den, r.den * slope.num));
  },
  misconceptions: (p): Misconception[] => {
    const a = stepHeight(p);
    const left = sub(q(1), mul(a, p.k));
    return [
      { response: str(sub(q(1), a)), why: t`The heights do not add to ${1}; the areas do. Multiply each height by the width of its step.` },
      { response: str(left), why: t`${math`${1} - ${a} \times ${p.k}`} is the area of the second step. Divide by its width, ${sub(q(1), p.k)}, to get its height.` },
      { response: str(q(left.num * p.k.den, left.den * p.k.num)), why: t`The second step runs from ${p.k} to ${1}, so its width is ${sub(q(1), p.k)}, not ${p.k}.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems: STEP 2 Q2

const kq2 = Math.exp(1 / 3);
const aq2 = 2 * Math.log(kq2);
const bq2 = Math.log(kq2) / (2 * kq2);
const q2density = (x: number): number => (x <= 1 ? 0 : x <= kq2 ? Math.log(x) : x <= 2 * kq2 ? Math.log(kq2) : x <= 4 * kq2 ? aq2 - bq2 * x : 0);
/** The total area of the Q2 density with these k, a, b, piece by piece. */
const q2area = (): number => simpson(Math.log, 1, kq2) + simpson(() => Math.log(kq2), kq2, 2 * kq2) + simpson((x) => aq2 - bq2 * x, 2 * kq2, 4 * kq2);

const q2stem = math`f(x) = \begin{cases} ${0} & x \le ${1} \\ \ln x & ${1} \le x \le k \\ \ln k & k \le x \le ${2}k \\ a - bx & ${2}k \le x \le ${4}k \\ ${0} & x \ge ${4}k \end{cases}`;
const q2prompt = t`The random variable ${mX} has a continuous density ${q2stem} where ${math`k`}, ${math`a`}, and ${math`b`} are constants.`;

const q2k = auto({
  id: 's2-q2-ii-k',
  source: cite(S2, 'Q2(ii)'),
  title: t`A density pieced from ${math`\ln x`}: the value of ${math`k`}`,
  prompt: t`${q2prompt} Find the numerical value of ${math`k`}.`,
  answer: { kind: 'expression', expected: 'e^(1/3)', variables: [] },
  solution: [
    t`The density is continuous, so the pieces meet. At ${math`x = ${2}k`}: ${math`\ln k = a - ${2}kb`}. At ${math`x = ${4}k`}: ${math`a - ${4}kb = ${0}`}. Together, ${math`b = \frac{\ln k}{${2}k}`} and ${math`a = ${2}\ln k`}.`,
    t`The total area is ${1}. By parts, ${math`\int_{${1}}^{k} \ln x\,dx = k\ln k - k + ${1}`}. The middle piece is a rectangle of area ${math`k \ln k`}, and the last is a triangle of base ${math`${2}k`} and height ${math`\ln k`}, area ${math`k\ln k`} again.`,
    t`So ${math`${3}k\ln k - k + ${1} = ${1}`}, that is ${math`k(${3}\ln k - ${1}) = ${0}`}. Since ${math`k > ${0}`}, ${math`\ln k = \frac{${1}}{${3}}`} and ${math`k = e^{${1}/${3}} \approx ${Number(kq2.toFixed(4))}`}.`,
  ],
  reference: 'e^(1/3)',
  verify: () => near('total area of the density with k = e^(1/3), by Simpson on each piece', q2area(), 1, 1e-9)
    ?? near('continuity at 2k', aq2 - 2 * kq2 * bq2, Math.log(kq2), 1e-12)
    ?? near('continuity at 4k', aq2 - 4 * kq2 * bq2, 0, 1e-12),
  misconceptions: [
    { response: 'e^(1/2)', why: t`That leaves out one of the three areas. The rectangle and the triangle each have area ${math`k \ln k`}.` },
    { response: 'e^3', why: t`${math`${3}\ln k = ${1}`} gives ${math`\ln k = \frac{${1}}{${3}}`}, so ${math`k = e^{${1}/${3}}`}.` },
  ],
  official: { source: cite(S2SOL, 'Q2(ii)'), answer: 'e^(1/3)', agrees: true },
});

const q2a = auto({
  id: 's2-q2-ii-a',
  source: cite(S2, 'Q2(ii)'),
  title: t`The same density: the value of ${math`a`}`,
  prompt: t`${q2prompt} Find the numerical value of ${math`a`}.`,
  answer: { kind: 'exact', expected: '2/3' },
  solution: [
    t`Continuity at ${math`${2}k`} and ${math`${4}k`} gives ${math`a = ${2}\ln k`}, and the total area gives ${math`\ln k = \frac{${1}}{${3}}`}.`,
    t`So ${math`a = ${q(2, 3)}`}.`,
  ],
  reference: '2/3',
  verify: () => near('a = 2 ln k with k = e^(1/3)', aq2, 2 / 3, 1e-12),
  misconceptions: [
    { response: '1/3', why: t`${q(1, 3)} is ${math`\ln k`}. Continuity gives ${math`a = ${2}\ln k`}.` },
    { response: '2', why: t`${math`a = ${2}\ln k`}, and ${math`\ln k`} is ${q(1, 3)}, not ${1}.` },
  ],
  official: { source: cite(S2SOL, 'Q2(ii)'), answer: '2/3', agrees: true },
});

const q2b = auto({
  id: 's2-q2-ii-b',
  source: cite(S2, 'Q2(ii)'),
  title: t`The same density: the value of ${math`b`}`,
  prompt: t`${q2prompt} Find the numerical value of ${math`b`}, in terms of ${math`e`}.`,
  answer: { kind: 'expression', expected: 'e^(-1/3)/6', variables: [] },
  solution: [
    t`Continuity gives ${math`b = \frac{\ln k}{${2}k}`}, and ${math`k = e^{${1}/${3}}`}.`,
    t`So ${math`b = \frac{${1}/${3}}{${2}e^{${1}/${3}}} = \frac{${1}}{${6}}e^{-${1}/${3}} \approx ${Number(bq2.toFixed(4))}`}.`,
  ],
  reference: 'e^(-1/3)/6',
  verify: () => near('the line a - bx reaches 0 at 4k', aq2 - bq2 * 4 * kq2, 0, 1e-12) ?? near('b against 1/(6 e^(1/3))', bq2, 1 / (6 * Math.exp(1 / 3)), 1e-15),
  misconceptions: [
    { response: '1/6', why: t`${math`b = \frac{\ln k}{${2}k}`}: divide by ${math`k = e^{${1}/${3}}`} as well.` },
    { response: 'e^(1/3)/6', why: t`${math`k`} is in the denominator of ${math`\frac{\ln k}{${2}k}`}, so the power of ${math`e`} is negative.` },
  ],
  official: { source: cite(S2SOL, 'Q2(ii)'), answer: '(1/6)e^(-1/3)', agrees: true },
});

const q2bk = auto({
  id: 's2-q2-ii-b-in-k',
  source: cite(S2, 'Q2(ii)'),
  title: t`The same density: ${math`b`} in terms of ${math`k`}`,
  prompt: t`${q2prompt} Use continuity to express ${math`b`} in terms of ${math`k`}.`,
  answer: { kind: 'expression', expected: 'ln(k)/(2k)', variables: ['k'], domains: { k: { kind: 'real', min: 1.1, max: 5 } } },
  solution: [
    t`At ${math`x = ${4}k`}, the line meets ${0}: ${math`a = ${4}kb`}. At ${math`x = ${2}k`}, it meets the constant piece: ${math`a - ${2}kb = \ln k`}.`,
    t`Subtracting, ${math`${2}kb = \ln k`}, so ${math`b = \frac{\ln k}{${2}k}`} (and ${math`a = ${2}\ln k`}).`,
  ],
  reference: 'ln(k)/(2k)',
  verify: () => {
    // Continuity at both joins for several k, with a = 4kb.
    for (const k of [1.5, 2, 3.7]) {
      const b = Math.log(k) / (2 * k);
      const r = near(`continuity at 2k for k = ${k}`, 4 * k * b - 2 * k * b, Math.log(k), 1e-12);
      if (r !== null) return r;
    }
    return null;
  },
  misconceptions: [
    { response: 'ln(k)/k', why: t`From ${math`a - ${2}kb = \ln k`} and ${math`a = ${4}kb`}: ${math`${2}kb = \ln k`}. Divide by ${math`${2}k`}.` },
    { response: '2 ln(k)', why: t`${math`${2}\ln k`} is ${math`a`}. The slope ${math`b`} is ${math`a / (${4}k)`}.` },
  ],
  official: { source: cite(S2SOL, 'Q2(ii)'), answer: 'ln(k)/(2k)', agrees: true },
});

const q2sketch = supervision({
  id: 's2-q2-i',
  source: cite(S2, 'Q2(i)'),
  title: t`Sketch the pieced density`,
  prompt: t`${q2prompt} Sketch the graph of ${math`y = f(x)`}, marking ${math`x = ${1}`}, ${math`k`}, ${math`${2}k`}, and ${math`${4}k`}, and explain why the pieces must meet.`,
  writeUp: 'sketch',
  official: cite(S2SOL, 'Q2(i)'),
});

const q6stem = supervision({
  id: 's2-q6-stem',
  source: cite(S2, 'Q6'),
  title: t`A step density: ${math`a > ${1}`} and ${math`b < ${1}`}`,
  prompt: t`The continuous random variable ${mX} has density ${math`f(x) = a`} for ${math`${0} \le x < k`}, ${math`f(x) = b`} for ${math`k \le x \le ${1}`}, and ${math`${0}`} otherwise, where ${math`a > b > ${0}`} and ${math`${0} < k < ${1}`}. Sketch ${mf}, and show that ${math`a > ${1}`} and ${math`b < ${1}`}.`,
  writeUp: 'proof',
  official: cite('step-s2-stats-hints', 'Q6'),
});

// ---------------------------------------------------------------- lesson

const C9 = q(1, 9);
/** P(1 ≤ X ≤ 2) for the density x²/9 on [0, 3]: (2^3 - 1^3)/27. */
const P12 = mul(C9, q(powQ(q(2), 3).num - 1n, 3));
const claims: ProbabilityClaim[] = [
  { what: 'P(1 ≤ X ≤ 2) for the density x²/9 on [0, 3]', exact: P12, trial: (rng) => { const x = 3 * rng() ** (1 / 3); return x >= 1 && x <= 2; } },
];

export const densityFunctions: TopicContent = {
  topicId: 'rv.pdf',
  goal: t`Find probabilities as areas under a density ${mf}, fix an unknown constant from ${math`\int_{-\infty}^{\infty} f(x)\,dx = ${1}`}, and pass between ${mf} and the distribution function ${math`F`}.`,
  lesson: [
    { kind: 'p', text: t`A [[continuous-random-variable|continuous random variable]] takes every value in an interval: a height, a waiting time, the point where a stick breaks. Any one exact value has probability ${0}, so probability belongs to intervals, and it is measured as area under a curve.` },
    { kind: 'rule', text: t`A [[density-function|probability density function]] ${mf} has ${math`f(x) \ge ${0}`} and ${math`\int_{-\infty}^{\infty} f(x)\,dx = ${1}`}, and then ${math`P(a \le X \le b) = \int_{a}^{b} f(x)\,dx`}.` },
    { kind: 'p', text: t`Because single points carry no probability, ${math`P(a \le X \le b)`} and ${math`P(a < X < b)`} are equal. And ${math`f(x)`} is not itself a probability: it may exceed ${1}. It is probability per unit length, since ${math`P(x \le X \le x + h) \approx f(x)\,h`} for small ${math`h`}.` },
    { kind: 'p', text: t`Where ${mf} is zero the limits shrink. If ${math`f(x) = c\,x^{${2}}`} for ${math`${0} \le x \le ${3}`} and ${0} otherwise, the total area is ${math`\int_{${0}}^{${3}} c\,x^{${2}}\,dx = ${9}c`}, so ${math`c = ${C9}`}. Then ${math`P(${1} \le X \le ${2}) = \frac{${8} - ${1}}{${27}} = ${P12}`}.` },
    { kind: 'rule', text: t`The [[cumulative-distribution-function|distribution function]] is ${math`F(x) = P(X \le x) = \int_{-\infty}^{x} f(t)\,dt`}, and ${math`f = F'`} wherever ${mf} is continuous.` },
    { kind: 'p', text: t`The letter ${math`t`} inside the integral is a dummy variable, because ${mx} is already the upper limit. For the example, ${math`F(x) = x^{${3}} / ${27}`} on ${math`[${0}, ${3}]`}, with ${math`F = ${0}`} below and ${math`F = ${1}`} above, and ${math`P(${1} \le X \le ${2}) = F(${2}) - F(${1})`}: no integral is needed once ${math`F`} is known.` },
    { kind: 'p', text: t`The simplest density is constant. ${mX} has the [[uniform-distribution|uniform distribution]] ${math`U(a, b)`} when ${math`f(x) = \frac{${1}}{b - a}`} on ${math`[a, b]`}: the probability of a subinterval is its share of the length, and ${math`F(x) = \frac{x - a}{b - a}`} there.` },
    { kind: 'p', text: t`STEP ${2} Statistics Q${2} builds a density from three pieces, ${math`\ln x`}, the constant ${math`\ln k`}, and a line ${math`a - bx`}, and says it is continuous. Continuity makes the pieces meet at ${math`${2}k`} and ${math`${4}k`}, which gives ${math`a`} and ${math`b`} in terms of ${math`k`}; total area ${1} then fixes ${math`k`}. The worked example below does it.` },
  ],
  examples: [
    workedCambridge(q2k),
    worked(normalising, { n: 2, m: 3 }, t`The constant for ${math`c\,x^{${2}}`} on ${math`[${0}, ${3}]`}`),
    worked(stepDensity, { k: q(1, 2), b: q(1, 2) }, t`The second step of a step density`),
  ],
  generators: [normalising, intervalProbability, stepDensity],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['continuous-random-variable', 'density-function', 'cumulative-distribution-function', 'uniform-distribution'],
  claims,
  cambridge: [q2a, q2b, q2bk, q2sketch, q6stem],
  gate: ['s2-q2-ii-a', 's2-q2-ii-b', 's2-q2-ii-b-in-k', 's2-q2-i', 's2-q6-stem'],
};
