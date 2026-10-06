/**
 * rv.continuous-summaries: the mean E(X) = ∫ x f(x) dx, E(g(X)), the variance, the median,
 * and the mode of a density. From the STEP 2 Statistics topic notes (page 3) and Q2(iii)
 * (the median of the pieced density), Q4 (2012 S2 Q13: the mean and variance of the
 * distance to the nearest supermarket), and Q6 (2010 S2 Q13: the mean and median of a step
 * density); STEP 3 Statistics Q4 (2005 S3 Q14: the median and mean of a speed, and of the
 * time it takes); and IA Probability Example Sheet 4 Q9(b) (the mean, median, and mode of
 * the distance r e^(-r^2/2)). Answers are compared with the STEP 2 and STEP 3 solutions,
 * and with the values Sheet 4 states; every one is checked by numerical integration.
 */
import { auto, cite, supervision } from '../cambridge';
import { add, int, mul, pick, q, str, sub, toFloat, type Rational } from '../math';
import { bisect, integrateToInfinity, near, pw, simpson } from '../partv-b';
import { generator, type Misconception } from '../problem';
import { math, t } from '../rich';
import { worked, workedCambridge, type ProbabilityClaim, type TopicContent } from '../topic';

const [mX, mf] = [math`X`, math`f`];
const S2 = 'step-s2-stats' as const;
const S2SOL = 'step-s2-stats-solutions' as const;
const S3 = 'step-s3-stats' as const;
const S3SOL = 'step-s3-stats-solutions' as const;
const SH4 = 'ia-prob-sheet-4' as const;

// ---------------------------------------------------------------- the family (n + 1) x^n / m^(n + 1) on [0, m]

interface PowP { n: number; m: number }
const coef = ({ n, m }: PowP): Rational => q(n + 1, m ** (n + 1));
const meanOf = ({ n, m }: PowP): Rational => q((n + 1) * m, n + 2);
const secondOf = ({ n, m }: PowP): Rational => q((n + 1) * m * m, n + 3);
const densityTex = (p: PowP) => math`f(x) = ${coef(p)}\,${pw('x', p.n)}`;
const supportTex = (p: PowP) => math`${0} \le x \le ${p.m}`;
const powParams = (rng: () => number): PowP => ({ n: int(rng, 1, 4), m: int(rng, 1, 4) });
/** A moment by Simpson's rule (exact for these polynomials), as a fraction over den. */
const moment = (p: PowP, r: number, den: number): Rational => q(Math.round(simpson((x) => x ** r * toFloat(coef(p)) * x ** p.n, 0, p.m, 40) * den), den);

const powerMean = generator<PowP>({
  id: 'power-mean',
  skill: 'Compute the mean of a density as the integral of x f(x).',
  params: (rng) => {
    for (;;) { const p = powParams(rng); if (p.m > 1 || p.n > 1) return p; }
  },
  sane: ({ n, m }) => (n >= 1 && n <= 4 && m >= 1 && m <= 4 ? null : 'out of range'),
  problem: (p) => ({
    prompt: t`${mX} has density ${densityTex(p)} for ${supportTex(p)}, and ${0} otherwise. Find ${math`E(X)`}.`,
    answer: { kind: 'exact', expected: str(meanOf(p)) },
    solution: [
      t`${math`E(X) = \int x\,f(x)\,dx = \int_{${0}}^{${p.m}} ${coef(p)}\,x^{${p.n + 1}}\,dx = ${coef(p)} \times \frac{${p.m ** (p.n + 2)}}{${p.n + 2}}`}.`,
      t`So ${math`E(X) = ${meanOf(p)}`}. The density leans towards ${p.m}, so the mean is above the midpoint ${q(p.m, 2)}.`,
    ],
  }),
  solve: (p) => str(moment(p, 1, p.n + 2)),
  misconceptions: (p): Misconception[] => [
    { response: str(q(p.m, 2)), why: t`The midpoint is the mean only for a symmetric density. Weight each ${math`x`} by ${math`f(x)`}: integrate ${math`x\,f(x)`}.` },
    { response: str(secondOf(p)), why: t`That is ${math`E(X^{${2}})`}, the integral of ${math`x^{${2}}f(x)`}. The mean integrates ${math`x\,f(x)`}.` },
    { response: str(q(p.n + 1, p.n + 2)), why: t`Check the limits: integrating up to ${p.m} brings ${math`${p.m}^{${p.n + 2}}`}, which the constant only partly cancels.` },
  ],
});

const powerVariance = generator<PowP>({
  id: 'power-variance',
  skill: 'Compute Var(X) = E(X^2) - (E X)^2 for a density.',
  params: (rng) => {
    for (;;) { const p = powParams(rng); if (p.m > 1 || p.n > 1) return p; }
  },
  sane: ({ n, m }) => (n >= 1 && n <= 4 && m >= 1 && m <= 4 ? null : 'out of range'),
  problem: (p) => {
    const [mu, m2] = [meanOf(p), secondOf(p)];
    const v = sub(m2, mul(mu, mu));
    return {
      prompt: t`${mX} has density ${densityTex(p)} for ${supportTex(p)}, and ${0} otherwise. Find ${math`\operatorname{Var}(X)`}.`,
      answer: { kind: 'exact', expected: str(v) },
      solution: [
        t`${math`E(X) = \int_{${0}}^{${p.m}} x\,f(x)\,dx = ${mu}`} and ${math`E(X^{${2}}) = \int_{${0}}^{${p.m}} x^{${2}}f(x)\,dx = ${m2}`}.`,
        t`${math`\operatorname{Var}(X) = E(X^{${2}}) - (E X)^{${2}} = ${m2} - ${mul(mu, mu)} = ${v}`}.`,
      ],
    };
  },
  solve: (p) => {
    // E((X - mu)^2) directly, by Simpson's rule; the variance is a fraction over (n + 3)(n + 2)^2.
    const mu = toFloat(meanOf(p));
    const den = (p.n + 3) * (p.n + 2) ** 2;
    return str(q(Math.round(simpson((x) => (x - mu) ** 2 * toFloat(coef(p)) * x ** p.n, 0, p.m, 400) * den), den));
  },
  misconceptions: (p): Misconception[] => {
    const [mu, m2] = [meanOf(p), secondOf(p)];
    return [
      { response: str(m2), why: t`That is ${math`E(X^{${2}})`}. Subtract the square of the mean.` },
      { response: str(sub(m2, mu)), why: t`Subtract the square of the mean, ${math`(E X)^{${2}} = ${mul(mu, mu)}`}, not the mean itself.` },
      { response: str(mul(mu, mu)), why: t`That is ${math`(E X)^{${2}}`}. The variance is ${math`E(X^{${2}})`} minus it.` },
    ];
  },
});

// ---------------------------------------------------------------- the median of a step density (STEP 2 Q6)

interface StepP { k: Rational; b: Rational }
const stepA = ({ k, b }: StepP): Rational => {
  const area = sub(q(1), mul(b, sub(q(1), k)));
  return q(area.num * k.den, area.den * k.num);
};
const stepMedian = (p: StepP): Rational => {
  const a = stepA(p);
  return toFloat(mul(a, p.k)) >= 0.5 ? q(a.den, 2n * a.num) : sub(q(1), q(p.b.den, 2n * p.b.num));
};
const stepMean = (p: StepP): Rational => {
  const a = stepA(p);
  const half = q(1, 2);
  return add(mul(a, mul(half, mul(p.k, p.k))), mul(p.b, mul(half, sub(q(1), mul(p.k, p.k)))));
};
const KS: readonly Rational[] = [q(1, 4), q(1, 3), q(1, 2), q(2, 3), q(3, 4), q(1, 5), q(2, 5), q(3, 5), q(4, 5)];
const BS: readonly Rational[] = [q(1, 2), q(1, 3), q(2, 3), q(1, 4), q(3, 4), q(2, 5), q(3, 5)];

const stepMedianGen = generator<StepP>({
  id: 'step-median',
  skill: 'Find the median of a step density: first decide which step holds it, then solve F(M) = 1/2 there.',
  params: (rng) => ({ k: pick(rng, KS), b: pick(rng, BS) }),
  sane: ({ k, b }) => (toFloat(k) > 0 && toFloat(k) < 1 && toFloat(b) > 0 && toFloat(b) < 1 ? null : 'out of range'),
  problem: (p) => {
    const a = stepA(p);
    const first = mul(a, p.k);
    const inFirst = toFloat(first) >= 0.5;
    const m = stepMedian(p);
    return {
      prompt: t`${mX} has density ${math`f(x) = ${a}`} for ${math`${0} \le x < ${p.k}`}, ${math`f(x) = ${p.b}`} for ${math`${p.k} \le x \le ${1}`}, and ${0} otherwise. Find the median of ${mX}.`,
      answer: { kind: 'exact', expected: str(m) },
      solution: [
        t`The first step has area ${math`${a} \times ${p.k} = ${first}`}, which is ${inFirst ? t`at least` : t`less than`} ${q(1, 2)}, so the median is in the ${inFirst ? t`first` : t`second`} step.`,
        inFirst
          ? t`There ${math`F(M) = ${a}\,M`}, and ${math`${a}\,M = ${q(1, 2)}`} gives ${math`M = ${m}`}.`
          : t`The area above the median is ${q(1, 2)} and lies in the second step: ${math`(${1} - M) \times ${p.b} = ${q(1, 2)}`}, so ${math`M = ${1} - \frac{${1}}{${2} \times ${p.b}} = ${m}`}.`,
      ],
    };
  },
  solve: (p) => {
    // Walk the density in cells of width 1/(den k); in the cell where the area passes 1/2, solve linearly.
    const a = stepA(p);
    const d = Number(p.k.den) * 2;
    const cut = Number(p.k.num) * 2;
    let acc = q(0);
    for (let i = 0; i < d; i++) {
      const h = i < cut ? a : p.b;
      const next = add(acc, mul(h, q(1, d)));
      if (toFloat(next) >= 0.5) {
        const need = sub(q(1, 2), acc);
        return str(add(q(i, d), q(need.num * h.den, need.den * h.num)));
      }
      acc = next;
    }
    return 'none';
  },
  misconceptions: (p): Misconception[] => {
    const a = stepA(p);
    const other = toFloat(mul(a, p.k)) >= 0.5 ? sub(q(1), q(p.b.den, 2n * p.b.num)) : q(a.den, 2n * a.num);
    return [
      { response: str(other), why: t`That formula belongs to the other step. Find the area of the first step first: it decides where the median is.` },
      { response: str(p.k), why: t`The median need not be where the density jumps. It is where the area to its left is ${q(1, 2)}.` },
      { response: str(stepMean(p)), why: t`That is the mean, ${math`\int x\,f(x)\,dx`}. The median solves ${math`F(M) = ${q(1, 2)}`}.` },
      { response: str(q(1, 2)), why: t`${q(1, 2)} is the median only when the density is symmetric about it. Find where the area to the left reaches ${q(1, 2)}.` },
      { response: str(q(p.b.den, 2n * p.b.num)), why: t`Width ${math`\frac{${1}}{${2}b}`} at height ${math`b`} gives area ${q(1, 2)}, but measured from the right end, ${1}. Subtract it from ${1}, or work from the left with both steps.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

// STEP 2 Q2: the pieced density, k = e^(1/3).
const K2 = Math.exp(1 / 3);
const q2f = (x: number): number => (x <= 1 ? 0 : x <= K2 ? Math.log(x) : x <= 2 * K2 ? 1 / 3 : x <= 4 * K2 ? 2 / 3 - (Math.exp(-1 / 3) / 6) * x : 0);
const q2F = (x: number): number => simpson(q2f, 1, Math.max(1, x), 4000);
const q2median = 3 * K2 - 1.5;

const q2iii = auto({
  id: 's2-q2-iii',
  source: cite(S2, 'Q2(iii)'),
  title: t`The median of the pieced density`,
  prompt: t`The random variable ${mX} has density ${math`\ln x`} for ${math`${1} \le x \le k`}, ${math`\ln k`} for ${math`k \le x \le ${2}k`}, ${math`a - bx`} for ${math`${2}k \le x \le ${4}k`}, and ${0} otherwise, where part (ii) found ${math`k = e^{${1}/${3}}`}, ${math`a = ${q(2, 3)}`}, and ${math`b = \frac{${1}}{${6}}e^{-${1}/${3}}`}. Find the median of ${mX}.`,
  answer: { kind: 'expression', expected: '3e^(1/3) - 3/2', variables: [] },
  solution: [
    t`First find which piece holds the median. The first piece has area ${math`\int_{${1}}^{k} \ln x\,dx = k\ln k - k + ${1} = ${1} - \tfrac{${2}}{${3}}e^{${1}/${3}} \approx ${Number((1 - (2 / 3) * K2).toFixed(4))}`}, less than ${q(1, 2)}.`,
    t`The middle rectangle and the final triangle have equal areas, ${math`k\ln k = \tfrac{${1}}{${3}}e^{${1}/${3}}`} each, so the median is in the middle piece, where ${math`f = \ln k = \tfrac{${1}}{${3}}`}.`,
    t`${math`${1} - \tfrac{${2}}{${3}}e^{${1}/${3}} + \tfrac{${1}}{${3}}(m - e^{${1}/${3}}) = \tfrac{${1}}{${2}}`} gives ${math`m = ${3}e^{${1}/${3}} - \tfrac{${3}}{${2}} \approx ${Number(q2median.toFixed(4))}`}.`,
  ],
  reference: '3e^(1/3) - 3/2',
  verify: () => near('the median by bisection on the numerically integrated F', bisect((x) => q2F(x) - 0.5, 1, 4 * K2, 60), q2median, 1e-6),
  misconceptions: [
    { response: 'e^(1/3)', why: t`That is ${math`k`}, where the first piece ends; the area up to it is well under ${q(1, 2)}.` },
    { response: '2e^(1/3)', why: t`That is ${math`${2}k`}, where the middle piece ends; the area up to it is over ${q(1, 2)}.` },
  ],
  official: { source: cite(S2SOL, 'Q2(iii)'), answer: '3(e^(1/3) - 1/2)', agrees: true },
});

// STEP 2 Q6(ii): the median when it lies in the second step.
const q6median = auto({
  id: 's2-q6-ii',
  source: cite(S2, 'Q6(ii)'),
  title: t`A step density: the median in the second step`,
  prompt: t`${mX} has density ${math`a`} for ${math`${0} \le x < k`}, ${math`b`} for ${math`k \le x \le ${1}`}, and ${0} otherwise, where ${math`a > b > ${0}`} and ${math`${0} < k < ${1}`}. The median is ${math`\frac{${1}}{${2}a}`} if ${math`a + b \ge ${2}ab`}. Find the median, in terms of ${math`b`}, when ${math`a + b \le ${2}ab`}.`,
  answer: { kind: 'expression', expected: '1 - 1/(2b)', variables: ['b'], domains: { b: { kind: 'real', min: 0.55, max: 0.95 } } },
  solution: [
    t`Total area ${1} gives ${math`ak + b(${1} - k) = ${1}`}, so ${math`k = \frac{${1} - b}{a - b}`}. The median is at most ${math`k`} exactly when ${math`ak \ge \tfrac{${1}}{${2}}`}, which rearranges to ${math`a + b \ge ${2}ab`}.`,
    t`Otherwise the median is in the second step. The area to its right is ${math`(${1} - M)\,b = \tfrac{${1}}{${2}}`}, so ${math`M = ${1} - \frac{${1}}{${2}b}`}.`,
  ],
  reference: '1 - 1/(2b)',
  verify: () => {
    // For steps with a k < 1/2, bisection on F against the formula.
    for (const [a, b] of [[2, 0.8], [4, 0.9], [1.5, 0.9]] as const) {
      const k = (1 - b) / (a - b);
      if (a * k >= 0.5) return `a = ${a}, b = ${b} does not put the median in the second step`;
      const F = (x: number): number => (x < k ? a * x : a * k + b * (x - k));
      const r = near(`median for a = ${a}, b = ${b}`, bisect((x) => F(x) - 0.5, 0, 1), 1 - 1 / (2 * b), 1e-9);
      if (r !== null) return r;
    }
    return null;
  },
  misconceptions: [
    { response: '1/(2b)', why: t`${math`\frac{${1}}{${2}b}`} is the width of the area ${q(1, 2)} at height ${math`b`}, measured from the right end. Subtract it from ${1}.` },
    { response: '1 - 1/b', why: t`The area to the right of the median is ${q(1, 2)}, not ${1}: ${math`(${1} - M)\,b = \tfrac{${1}}{${2}}`}.` },
  ],
  official: { source: cite(S2SOL, 'Q6(ii)'), answer: '1 - 1/(2b)', agrees: true },
});

// STEP 2 Q4: the distance to the nearest supermarket, density 2 pi k y e^(-pi k y^2).
const q4density = (k: number) => (y: number): number => 2 * Math.PI * k * y * Math.exp(-Math.PI * k * y * y);
const q4mean = auto({
  id: 's2-q4-mean',
  source: cite(S2, 'Q4'),
  title: t`The mean distance to the nearest supermarket`,
  prompt: t`The distance ${math`Y`} from a random point to the nearest supermarket has density ${math`${2}\pi k y\,e^{-\pi k y^{${2}}}`} for ${math`y \ge ${0}`}, where ${math`k > ${0}`}. You may assume ${math`\int_{${0}}^{\infty} e^{-x^{${2}}/${2}}\,dx = \sqrt{\pi / ${2}}`}. Find ${math`E(Y)`}.`,
  answer: { kind: 'expression', expected: '1/(2 sqrt(k))', variables: ['k'], domains: { k: { kind: 'real', min: 0.1, max: 5 } } },
  solution: [
    t`${math`E(Y) = \int_{${0}}^{\infty} ${2}\pi k y^{${2}} e^{-\pi k y^{${2}}}\,dy`}. By parts, with ${math`u = y`} and ${math`v' = ${2}\pi k y\,e^{-\pi k y^{${2}}}`}, so ${math`v = -e^{-\pi k y^{${2}}}`}: ${math`E(Y) = \left[-y\,e^{-\pi k y^{${2}}}\right]_{${0}}^{\infty} + \int_{${0}}^{\infty} e^{-\pi k y^{${2}}}\,dy`}.`,
    t`The bracket is ${0}. Substitute ${math`x = y\sqrt{${2}\pi k}`}: ${math`\int_{${0}}^{\infty} e^{-\pi k y^{${2}}}\,dy = \frac{${1}}{\sqrt{${2}\pi k}}\sqrt{\frac{\pi}{${2}}} = \frac{${1}}{${2}\sqrt{k}}`}.`,
  ],
  reference: '1/(2 sqrt(k))',
  verify: () => {
    for (const k of [0.3, 1, 2.5]) {
      const r = near(`E(Y) by numerical integration for k = ${k}`, integrateToInfinity((y) => y * q4density(k)(y), 0), 1 / (2 * Math.sqrt(k)), 1e-7)
        ?? near(`total area for k = ${k}`, integrateToInfinity(q4density(k), 0), 1, 1e-7);
      if (r !== null) return r;
    }
    return null;
  },
  misconceptions: [
    { response: '1/sqrt(k)', why: t`After the substitution the integral is ${math`\frac{${1}}{\sqrt{${2}\pi k}}\sqrt{\pi/${2}}`}, which is half of ${math`${1}/\sqrt{k}`}.` },
    { response: '1/(pi k)', why: t`That is ${math`E(Y^{${2}})`}. The mean integrates ${math`y\,f(y)`}, not ${math`y^{${2}}f(y)`}.` },
  ],
  official: { source: cite(S2SOL, 'Q4'), answer: '1/(2 sqrt(k))', agrees: true },
});

// STEP 3 Q4: the speed V with density C k^(a+1) x^a / (x + k)^(2a+2).
const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1));
const Cof = (a: number): number => fact(2 * a + 1) / (fact(a) * fact(a));
const vDensity = (a: number, k: number) => (x: number): number => (Cof(a) * k ** (a + 1) * x ** a) / (x + k) ** (2 * a + 2);
const tDensity = (a: number, k: number, s: number) => (t0: number): number => (Cof(a) * k ** (a + 1) * s ** (a + 1) * t0 ** a) / (s + k * t0) ** (2 * a + 2);

const s3mean = auto({
  id: 's3-q4-mean-speed',
  source: cite(S3, 'Q4'),
  title: t`The expected speed of a gas molecule`,
  prompt: t`The speed ${math`V`} has density ${math`f(x) = \frac{C k^{a + ${1}} x^{a}}{(x + k)^{${2}a + ${2}}}`} for ${math`x \ge ${0}`}, where ${math`a`} is a positive integer, ${math`k > ${0}`}, and ${math`C = \frac{(${2}a + ${1})!}{a!\,a!}`}. You may use ${math`\int_{${0}}^{\infty} \frac{t^{m}}{(t + k)^{n + ${2}}}\,dt = \frac{m!\,(n - m)!}{(n + ${1})!\,k^{n - m + ${1}}}`} for positive integers ${math`n \ge m`}. Find ${math`E(V)`}.`,
  answer: { kind: 'expression', expected: 'k(a + 1)/a', variables: ['k', 'a'], domains: { k: { kind: 'real', min: 0.5, max: 4 }, a: { kind: 'integer', min: 1, max: 8 } } },
  solution: [
    t`${math`E(V) = C k^{a + ${1}} \int_{${0}}^{\infty} \frac{x^{a + ${1}}}{(x + k)^{${2}a + ${2}}}\,dx`}. Use the given integral with ${math`m = a + ${1}`} and ${math`n = ${2}a`}: it is ${math`\frac{(a + ${1})!\,(a - ${1})!}{(${2}a + ${1})!\,k^{a}}`}.`,
    t`So ${math`E(V) = \frac{(${2}a + ${1})!}{a!\,a!}\,k^{a + ${1}} \cdot \frac{(a + ${1})!\,(a - ${1})!}{(${2}a + ${1})!\,k^{a}} = \frac{k(a + ${1})}{a}`}.`,
  ],
  reference: 'k(a + 1)/a',
  verify: () => {
    for (const a of [1, 2, 3]) for (const k of [0.5, 2]) {
      const r = near(`total area, a = ${a}, k = ${k}`, integrateToInfinity(vDensity(a, k), 0, 20000, k), 1, 1e-6)
        ?? near(`E(V), a = ${a}, k = ${k}`, integrateToInfinity((x) => x * vDensity(a, k)(x), 0, 20000, k), (k * (a + 1)) / a, 1e-5);
      if (r !== null) return r;
    }
    return null;
  },
  misconceptions: [
    { response: 'k', why: t`${math`k`} is the median of ${math`V`}. The density has a long right tail, so the mean is larger: use ${math`m = a + ${1}`} in the given integral.` },
    { response: 'k a/(a + 1)', why: t`The factorials are the wrong way up: ${math`\frac{(a + ${1})!\,(a - ${1})!}{a!\,a!} = \frac{a + ${1}}{a}`}.` },
  ],
  official: { source: cite(S3SOL, 'Q4'), answer: 'k(a + 1)/a', agrees: true },
});

const s3time = auto({
  id: 's3-q4-mean-time',
  source: cite(S3, 'Q4', true),
  title: t`The expected time to travel a distance`,
  prompt: t`With ${math`V`} as above, the time to travel a fixed distance ${math`s`} is ${math`T = s / V`}, which has density ${math`\frac{C (s/k)^{a + ${1}} t^{a}}{(t + s/k)^{${2}a + ${2}}}`} for ${math`t \ge ${0}`}: the density of ${math`V`} with ${math`k`} replaced by ${math`s / k`}. Find ${math`E(T)`}.`,
  answer: { kind: 'expression', expected: 's(a + 1)/(k a)', variables: ['s', 'k', 'a'], domains: { s: { kind: 'real', min: 0.5, max: 4 }, k: { kind: 'real', min: 0.5, max: 4 }, a: { kind: 'integer', min: 1, max: 8 } } },
  solution: [
    t`The density of ${math`T`} has the form of the density of ${math`V`} with ${math`s / k`} in place of ${math`k`}, so ${math`E(T)`} is ${math`E(V) = \frac{k(a + ${1})}{a}`} with that replacement: ${math`E(T) = \frac{s(a + ${1})}{ka}`}.`,
    t`Then ${math`E(T)\,E(V) = s\left(\frac{a + ${1}}{a}\right)^{${2}} > s`}, although the medians multiply to exactly ${math`s`}: ${math`\frac{s}{k} \times k = s`}.`,
  ],
  reference: 's(a + 1)/(k a)',
  verify: () => {
    for (const a of [1, 2]) for (const [k, s] of [[0.5, 1], [2, 3]] as const) {
      const r = near(`E(T), a = ${a}, k = ${k}, s = ${s}`, integrateToInfinity((x) => x * tDensity(a, k, s)(x), 0, 20000, s / k), (s * (a + 1)) / (k * a), 1e-5);
      if (r !== null) return r;
    }
    return null;
  },
  misconceptions: [
    { response: 's a/(k(a + 1))', why: t`That is ${math`s / E(V)`}. The mean of ${math`s/V`} is not ${math`s`} over the mean of ${math`V`}: here it is larger.` },
    { response: 's/k', why: t`${math`s / k`} is the median time. The mean is pulled up by the long tail of slow molecules.` },
  ],
  // The solutions print E(T) = s(a + 1)/(Kay), a slip for s(a + 1)/(ka): the next line multiplies it by k(a + 1)/a and gets s((a + 1)/a)^2, which needs s(a + 1)/(ka).
  official: {
    source: cite(S3SOL, 'Q4'), answer: 's(a+1)/(Kay)', agrees: false,
    note: 'The solutions print s(a + 1)/(Kay), which does not read as an expression in s, k, and a. It is a typesetting slip for s(a + 1)/(ka): the next line multiplies it by k(a + 1)/a and gets s((a + 1)/a)^2, which needs s(a + 1)/(ka). The computed answer is right.',
  },
});

// IA Sheet 4 Q9(b): the distance R with density r e^(-r^2/2).
const rayleigh = (r: number): number => r * Math.exp(-r * r / 2);
const q9median = auto({
  id: 'ia4-q9-b-median',
  source: cite(SH4, 'Q9(b)', true),
  title: t`The median distance of a shot from the centre`,
  prompt: t`The distance ${math`R`} of a bullet hole from the centre of a target has density ${math`r e^{-r^{${2}}/${2}}`} for ${math`r \ge ${0}`}. Find the median of ${math`R`}.`,
  answer: { kind: 'expression', expected: 'sqrt(ln(4))', variables: [] },
  solution: [
    t`${math`F(r) = \int_{${0}}^{r} u\,e^{-u^{${2}}/${2}}\,du = ${1} - e^{-r^{${2}}/${2}}`}.`,
    t`${math`F(m) = \tfrac{${1}}{${2}}`} gives ${math`e^{-m^{${2}}/${2}} = \tfrac{${1}}{${2}}`}, so ${math`m^{${2}} = ${2}\ln ${2} = \ln ${4}`} and ${math`m = \sqrt{\ln ${4}} \approx ${Number(Math.sqrt(Math.log(4)).toFixed(4))}`}.`,
  ],
  reference: 'sqrt(ln(4))',
  verify: () => near('median by bisection on the integrated density', bisect((m) => simpson(rayleigh, 0, m) - 0.5, 0, 5, 60), Math.sqrt(Math.log(4)), 1e-8),
  misconceptions: [
    { response: 'sqrt(pi/2)', why: t`${math`\sqrt{\pi/${2}}`} is the mean. The median solves ${math`F(m) = \tfrac{${1}}{${2}}`}.` },
    { response: '1', why: t`${1} is the mode, where the density is largest. The median halves the area.` },
    { response: 'ln(2)', why: t`${math`e^{-m^{${2}}/${2}} = \tfrac{${1}}{${2}}`} gives ${math`m^{${2}} = ${2}\ln ${2}`}: take the square root of ${math`\ln ${4}`}.` },
  ],
  official: { source: cite(SH4, 'Q9(b)'), answer: 'sqrt(log(4))', agrees: true },
});

const q9mean = auto({
  id: 'ia4-q9-b-mean',
  source: cite(SH4, 'Q9(b)', true),
  title: t`The mean distance of a shot from the centre`,
  prompt: t`The distance ${math`R`} has density ${math`r e^{-r^{${2}}/${2}}`} for ${math`r \ge ${0}`}. Using ${math`\int_{${0}}^{\infty} e^{-r^{${2}}/${2}}\,dr = \sqrt{\pi/${2}}`}, find ${math`E(R)`}.`,
  answer: { kind: 'expression', expected: 'sqrt(pi/2)', variables: [] },
  solution: [
    t`${math`E(R) = \int_{${0}}^{\infty} r^{${2}} e^{-r^{${2}}/${2}}\,dr`}. By parts with ${math`u = r`}, ${math`v = -e^{-r^{${2}}/${2}}`}: ${math`\left[-r e^{-r^{${2}}/${2}}\right]_{${0}}^{\infty} + \int_{${0}}^{\infty} e^{-r^{${2}}/${2}}\,dr`}.`,
    t`The bracket is ${0}, so ${math`E(R) = \sqrt{\pi/${2}} \approx ${Number(Math.sqrt(Math.PI / 2).toFixed(4))}`}.`,
  ],
  reference: 'sqrt(pi/2)',
  verify: () => near('E(R) by numerical integration', integrateToInfinity((r) => r * rayleigh(r), 0), Math.sqrt(Math.PI / 2), 1e-8),
  misconceptions: [
    { response: 'sqrt(ln(4))', why: t`That is the median. The mean integrates ${math`r\,f(r)`}.` },
    { response: '2', why: t`${math`E(R^{${2}}) = ${2}`}, since ${math`R^{${2}} = X^{${2}} + Y^{${2}}`}. The mean of ${math`R`} is ${math`\int r\,f(r)\,dr`}.` },
  ],
  official: { source: cite(SH4, 'Q9(b)'), answer: 'sqrt(pi/2)', agrees: true },
});

const q4var = supervision({
  id: 's2-q4-variance',
  source: cite(S2, 'Q4'),
  title: t`The variance of the distance to the nearest supermarket`,
  prompt: t`For the density ${math`${2}\pi k y\,e^{-\pi k y^{${2}}}`} on ${math`y \ge ${0}`}, show that ${math`\operatorname{Var}(Y) = \frac{${4} - \pi}{${4}\pi k}`}.`,
  writeUp: 'proof',
  official: cite(S2SOL, 'Q4'),
});
const q6proofs = supervision({
  id: 's2-q6-i-iii',
  source: cite(S2, 'Q6(i), (iii)'),
  title: t`A step density: its mean, and the median below it`,
  prompt: t`For the step density ${math`a`} on ${math`[${0}, k)`} and ${math`b`} on ${math`[k, ${1}]`}, with ${math`a > b > ${0}`}, show that ${math`E(X) = \frac{${1} - ${2}b + ab}{${2}(a - b)}`}, and show that the median ${math`M`} satisfies ${math`M < E(X)`} in both cases of part (ii).`,
  writeUp: 'proof',
  official: cite(S2SOL, 'Q6(i), (iii)'),
});
const s3medians = supervision({
  id: 's3-q4-medians',
  source: cite(S3, 'Q4'),
  title: t`Median speed and median time`,
  prompt: t`For the speed ${math`V`} with density ${math`\frac{C k^{a + ${1}} x^{a}}{(x + k)^{${2}a + ${2}}}`}, show by the substitution ${math`u = k^{${2}}/x`} that the median of ${math`V`} is ${math`k`}. Then show that the median time times the median speed is ${math`s`}, but the expected time times the expected speed is greater than ${math`s`}, and explain why the two products differ.`,
  writeUp: 'proof',
  official: cite(S3SOL, 'Q4'),
});

// ---------------------------------------------------------------- lesson

const EX: PowP = { n: 2, m: 2 };
const exMean = meanOf(EX);
const exSecond = secondOf(EX);
const exVar = sub(exSecond, mul(exMean, exMean));
const exMedian = 2 * 0.5 ** (1 / 3);
const P32 = q(27, 64);
const claims: ProbabilityClaim[] = [
  { what: 'P(X ≤ 3/2) for the density 3x²/8 on [0, 2]', exact: P32, trial: (rng) => 2 * rng() ** (1 / 3) <= 1.5 },
];

export const continuousSummaries: TopicContent = {
  topicId: 'rv.continuous-summaries',
  goal: t`Compute the mean, ${math`E(g(X))`}, the variance, the median, and the mode of a given density, by explicit integration.`,
  lesson: [
    { kind: 'rule', text: t`For a density ${mf}: ${math`E(X) = \int_{-\infty}^{\infty} x\,f(x)\,dx`}, and for a function ${math`g`}, ${math`E(g(X)) = \int_{-\infty}^{\infty} g(x)\,f(x)\,dx`}. The variance is ${math`\operatorname{Var}(X) = E(X^{${2}}) - (E X)^{${2}}`}.` },
    { kind: 'p', text: t`These are the discrete formulas with the sum replaced by an integral and ${math`P(X = x)`} by ${math`f(x)\,dx`}. Take ${math`f(x) = ${coef(EX)}\,x^{${2}}`} on ${math`[${0}, ${2}]`}: ${math`E(X) = \int_{${0}}^{${2}} ${coef(EX)}\,x^{${3}}\,dx = ${exMean}`}, ${math`E(X^{${2}}) = \int_{${0}}^{${2}} ${coef(EX)}\,x^{${4}}\,dx = ${exSecond}`}, and ${math`\operatorname{Var}(X) = ${exSecond} - ${mul(exMean, exMean)} = ${exVar}`}.` },
    { kind: 'rule', text: t`The [[median-of-density|median]] ${math`m`} splits the area in half: ${math`F(m) = \int_{-\infty}^{m} f(x)\,dx = \tfrac{${1}}{${2}}`}. The [[mode-of-density|mode]] is where ${mf} is largest.` },
    { kind: 'p', text: t`For the same density, ${math`F(m) = m^{${3}}/${8} = \tfrac{${1}}{${2}}`} gives ${math`m = \sqrt[${3}]{${4}} \approx ${Number(exMedian.toFixed(4))}`}, and ${mf} increases, so the mode is the end point ${2}. Mean ${exMean}, median ${Number(exMedian.toFixed(3))}, mode ${2}: the long tail is on the left, and it pulls the mean furthest. And ${math`P(X \le \tfrac{${3}}{${2}}) = \left(\tfrac{${3}}{${4}}\right)^{${3}} = ${P32}`}.` },
    { kind: 'p', text: t`For a density made of pieces, first find which piece holds the median by adding the areas of the pieces in turn, then solve ${math`F(m) = \tfrac{${1}}{${2}}`} inside that piece. STEP ${2} Statistics Q${6} needs two cases for exactly this reason: the median is in the first step when that step's area is at least ${q(1, 2)}, and in the second otherwise.` },
    { kind: 'p', text: t`On an infinite range the integrals are improper, and integration by parts usually does the work. For the distance ${math`R`} with density ${math`r e^{-r^{${2}}/${2}}`} (Sheet ${4} Q${9}), the mean is ${math`\sqrt{\pi/${2}} \approx ${Number(Math.sqrt(Math.PI / 2).toFixed(4))}`}, the median ${math`\sqrt{\ln ${4}} \approx ${Number(Math.sqrt(Math.log(4)).toFixed(4))}`}, and the mode ${1}. A mean need not exist at all: the Cauchy density ${math`\frac{a}{\pi(a^{${2}} + x^{${2}})}`} of Sheet ${4} Q${10} makes ${math`\int |x|\,f(x)\,dx`} infinite.` },
  ],
  examples: [
    workedCambridge(q2iii),
    worked(powerVariance, EX, t`The variance of ${math`${coef(EX)}\,x^{${2}}`} on ${math`[${0}, ${2}]`}`),
    worked(stepMedianGen, { k: q(1, 4), b: q(2, 3) }, t`Which step holds the median`),
  ],
  generators: [powerMean, powerVariance, stepMedianGen],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['median-of-density', 'mode-of-density'],
  claims,
  cambridge: [q6median, q4mean, s3mean, s3time, q9median, q9mean, q4var, q6proofs, s3medians],
  gate: [
    's2-q6-ii',
    's2-q4-mean',
    's3-q4-mean-speed',
    's3-q4-mean-time',
    'ia4-q9-b-median',
    'ia4-q9-b-mean',
    's2-q4-variance',
    's2-q6-i-iii',
    's3-q4-medians',
  ],
};
