/**
 * prob.poisson-rates: a Poisson rate scales with the length of the interval (or the area of
 * the region), independent Poisson counts add to a Poisson count, a Poisson count split at
 * random gives independent Poisson counts, and given the total, one of two independent
 * Poisson counts is binomial. From the STEP Support STEP 2 Statistics topic notes (page 2),
 * STEP 2 Statistics Q4 (2012 S2 Q13, supermarkets in the plane) and Q5 (2010 S1 Q13, first
 * texts on two phones), whose solutions give the answers compared here, and IA Probability
 * Example Sheet 2 Q6 and Q7 (no official solutions; checked by a second method).
 */
import { mulberry32 } from '@learnhub/mastery';
import { auto, cite, supervision } from '../cambridge';
import { add, int, mul, pick, q, str, sub, type Rational } from '../math';
import { choose } from '../numbers';
import { farApart, poissonPmf, poissonPmfRec, powQ, samplePoisson, sig } from '../partv-d';
import { generator, type Misconception } from '../problem';
import { math, t, type Rich } from '../rich';
import { worked, workedCambridge, type ProbabilityClaim, type TopicContent } from '../topic';

const [mX, mY, ml, mmu] = [math`X`, math`Y`, math`\lambda`, math`\mu`];
const s4 = (x: number): number => sig(x, 4);
const ans4 = (x: number) => ({ kind: 'numeric' as const, expected: s4(x), relTol: 0.002 });
const S2 = 'step-s2-stats' as const;
const SH2 = 'ia-prob-sheet-2' as const;

// ---------------------------------------------------------------- scaling the rate

interface Ctx { what: Rich; unit: Rich; sub: Rich; perUnit: number }
const CONTEXTS: readonly Ctx[] = [
  { what: t`texts arrive`, unit: t`hour`, sub: t`minutes`, perUnit: 60 },
  { what: t`customers join a queue`, unit: t`hour`, sub: t`minutes`, perUnit: 60 },
  { what: t`flaws occur in a cable`, unit: t`metre`, sub: t`centimetres`, perUnit: 100 },
  { what: t`calls reach a switchboard`, unit: t`hour`, sub: t`minutes`, perUnit: 60 },
];
const RATES = [2, 3, 4, 6, 8, 12];
const PARTS: Readonly<Record<number, readonly number[]>> = { 60: [5, 10, 15, 20, 30, 40, 45, 90], 100: [10, 20, 25, 50, 75, 150] };

interface ScaleP { c: number; rate: number; len: number; k: number }
const scaled = ({ c, rate, len }: ScaleP): number => (rate * len) / (CONTEXTS[c] as Ctx).perUnit;
const scaleMis = (p: ScaleP): number[] => [poissonPmf(p.rate, p.k), poissonPmf(p.rate * p.len, p.k), poissonPmf(p.rate / p.len, p.k)];

const scale = generator<ScaleP>({
  id: 'scale-rate',
  skill: 'Scale a Poisson rate to the length of the interval, then compute a Poisson probability.',
  params: (rng) => {
    for (;;) {
      const c = int(rng, 0, CONTEXTS.length - 1);
      const cx = CONTEXTS[c] as Ctx;
      const p: ScaleP = { c, rate: pick(rng, RATES), len: pick(rng, PARTS[cx.perUnit] as readonly number[]), k: int(rng, 0, 4) };
      const l = scaled(p);
      if (l >= 0.25 && l <= 9 && scaleMis(p).filter((m) => farApart(m, poissonPmf(l, p.k))).length >= 2) return p;
    }
  },
  sane: (p) => (scaled(p) > 0 && scaled(p) <= 9 ? null : 'out of range'),
  problem: (p) => {
    const cx = CONTEXTS[p.c] as Ctx;
    const l = scaled(p);
    return {
      prompt: t`On average ${p.rate} ${cx.what} per ${cx.unit}, independently, so the number in an interval has a Poisson distribution. Find the probability of exactly ${p.k} in ${p.len} ${cx.sub}, to four significant figures.`,
      answer: ans4(poissonPmf(l, p.k)),
      solution: [
        t`The mean is proportional to the length: ${p.len} ${cx.sub} is ${math`\frac{${p.len}}{${cx.perUnit}}`} of a ${cx.unit}, so the count is ${math`\text{Po}(\lambda)`} with ${math`\lambda = ${p.rate} \times \frac{${p.len}}{${cx.perUnit}} = ${l}`}.`,
        t`${math`P(X = ${p.k}) = \frac{e^{-${l}} \times ${l}^{${p.k}}}{${p.k}!} \approx ${s4(poissonPmf(l, p.k))}`}.`,
      ],
    };
  },
  solve: (p) => String(s4(poissonPmfRec(scaled(p), p.k))),
  misconceptions: (p): Misconception[] => {
    const [unscaled, times, over] = scaleMis(p) as [number, number, number];
    const cx = CONTEXTS[p.c] as Ctx;
    return [
      { response: String(s4(unscaled)), why: t`${p.rate} is the mean per ${cx.unit}. Scale it to the interval: the mean for ${p.len} ${cx.sub} is ${scaled(p)}.` },
      { response: String(s4(times)), why: t`Convert the units first: ${p.len} ${cx.sub} is ${math`${p.len}/${cx.perUnit}`} of a ${cx.unit}.` },
      { response: String(s4(over)), why: t`The mean grows with the interval: multiply the rate by the length, do not divide.` },
    ];
  },
});

// ---------------------------------------------------------------- the sum of two Poissons

interface Ctx2 { a: Rich; b: Rich; total: Rich }
const PAIRS: readonly Ctx2[] = [
  { a: t`goals scored by the home side`, b: t`goals scored by the away side`, total: t`goals in the match` },
  { a: t`texts on Mildred's first phone`, b: t`texts on her second phone`, total: t`texts on the two phones` },
  { a: t`emails to the sales address`, b: t`emails to the support address`, total: t`emails` },
];
const SUM_L = [0.5, 1, 1.5, 2, 2.5, 3];
interface SumP { c: number; a: number; b: number; n: number }
const sumMis = ({ a, b, n }: SumP): number[] => [poissonPmf(a, n) + poissonPmf(b, n), poissonPmf(a, n) * poissonPmf(b, n), poissonPmf(a * b, n)];

const sum = generator<SumP>({
  id: 'sum',
  skill: 'Add independent Poisson counts: X + Y ~ Po(lambda + mu).',
  params: (rng) => {
    for (;;) {
      const p: SumP = { c: int(rng, 0, PAIRS.length - 1), a: pick(rng, SUM_L), b: pick(rng, SUM_L), n: int(rng, 1, 6) };
      if (sumMis(p).filter((m) => farApart(m, poissonPmf(p.a + p.b, p.n))).length >= 2) return p;
    }
  },
  sane: ({ c, a, b }) => (c < PAIRS.length && a > 0 && b > 0 ? null : 'out of range'),
  problem: ({ c, a, b, n }) => {
    const cx = PAIRS[c] as Ctx2;
    return {
      prompt: t`The ${cx.a} is ${math`\text{Po}(${a})`}, and the ${cx.b} is ${math`\text{Po}(${b})`}, independently. Find the probability of exactly ${n} ${cx.total} in all, to four significant figures.`,
      answer: ans4(poissonPmf(a + b, n)),
      solution: [
        t`A sum of independent Poisson counts is Poisson, with the means added: the total is ${math`\text{Po}(${a} + ${b}) = \text{Po}(${a + b})`}.`,
        t`${math`P(X + Y = ${n}) = \frac{e^{-${a + b}} \times ${a + b}^{${n}}}{${n}!} \approx ${s4(poissonPmf(a + b, n))}`}.`,
      ],
    };
  },
  solve: ({ a, b, n }) => {
    // The convolution sum itself, as a check on the theorem.
    let s = 0;
    for (let k = 0; k <= n; k++) s += poissonPmfRec(a, k) * poissonPmfRec(b, n - k);
    return String(s4(s));
  },
  misconceptions: (p): Misconception[] => {
    const [added, multiplied, prodMean] = sumMis(p) as [number, number, number];
    return [
      { response: String(s4(added)), why: t`${math`P(X = ${p.n}) + P(Y = ${p.n})`} is not ${math`P(X + Y = ${p.n})`}: a total of ${p.n} can be split between the two in many ways. Add the means instead.` },
      { response: String(s4(multiplied)), why: t`That is the chance that both counts are ${p.n}, a total of ${2 * p.n}. The total is ${math`\text{Po}(\lambda + \mu)`}.` },
      { response: String(s4(prodMean)), why: t`The means add, they do not multiply: the total is ${math`\text{Po}(${p.a} + ${p.b})`}.` },
    ];
  },
});

// ---------------------------------------------------------------- one count given the total

interface CondP { a: number; b: number; n: number; k: number }
const condVal = ({ a, b, n, k }: CondP): Rational => mul(q(choose(n, k)), mul(powQ(q(a, a + b), k), powQ(q(b, a + b), n - k)));
const condMis = ({ a, b, n, k }: CondP): Rational[] => [q(choose(n, k), 2 ** n), mul(powQ(q(a, a + b), k), powQ(q(b, a + b), n - k)), q(a, a + b)];
/** P(X = k given X + Y = n) by Bayes's formula on the Poisson probabilities, exactly: the e^(-lambda) factors cancel. */
function condBayes({ a, b, n, k }: CondP): Rational {
  const w = (j: number): Rational => q(BigInt(a) ** BigInt(j) * BigInt(b) ** BigInt(n - j) * BigInt(choose(n, j)));
  let total = q(0);
  for (let j = 0; j <= n; j++) total = add(total, w(j));
  return q(w(k).num * total.den, w(k).den * total.num);
}

const conditional = generator<CondP>({
  id: 'given-the-total',
  skill: 'Given X + Y = n for independent Poisson counts, find the binomial probability that X = k.',
  params: (rng) => {
    for (;;) {
      const n = int(rng, 2, 5);
      const p: CondP = { a: int(rng, 1, 4), b: int(rng, 1, 4), n, k: int(rng, 0, n) };
      const right = str(condVal(p));
      if (new Set(condMis(p).map(str).filter((m) => m !== right)).size >= 2) return p;
    }
  },
  sane: ({ a, b, n, k }) => (a >= 1 && b >= 1 && k >= 0 && k <= n ? null : 'out of range'),
  problem: (p) => {
    const { a, b, n, k } = p;
    const share = q(a, a + b);
    return {
      prompt: t`${mX} and ${mY} are independent, ${math`X \sim \text{Po}(${a})`} and ${math`Y \sim \text{Po}(${b})`}. Given that ${math`X + Y = ${n}`}, what is the probability that ${math`X = ${k}`}?`,
      answer: { kind: 'exact', expected: str(condVal(p)) },
      solution: [
        t`${math`P(X = k \mid X + Y = n) = \frac{P(X = k)P(Y = n - k)}{P(X + Y = n)}`}, and ${math`X + Y \sim \text{Po}(${a + b})`}. The factors ${math`e^{-${a + b}}`} cancel, leaving ${math`\binom{n}{k}\left(\frac{\lambda}{\lambda + \mu}\right)^{k}\left(\frac{\mu}{\lambda + \mu}\right)^{n - k}`}: given the total, ${mX} is ${math`B\left(n, \frac{\lambda}{\lambda + \mu}\right)`}.`,
        t`Here ${math`\binom{${n}}{${k}}\left(${share}\right)^{${k}}\left(${sub(q(1), share)}\right)^{${n - k}} = ${condVal(p)}`}.`,
      ],
    };
  },
  solve: (p) => str(condBayes(p)),
  misconceptions: (p): Misconception[] => {
    const [even, noBinom, ratio] = condMis(p) as [Rational, Rational, Rational];
    return [
      { response: str(even), why: t`Each of the ${p.n} occurrences comes from ${mX} with probability ${math`\frac{\lambda}{\lambda + \mu} = ${q(p.a, p.a + p.b)}`}, not ${q(1, 2)}.` },
      { response: str(noBinom), why: t`That is one order of the ${p.n} occurrences. Multiply by ${math`\binom{${p.n}}{${p.k}}`}, the number of ways to choose which came from ${mX}.` },
      { response: str(ratio), why: t`${q(p.a, p.a + p.b)} is the chance for one occurrence. ${mX} given the total is ${math`B(${p.n}, ${q(p.a, p.a + p.b)})`}.` },
    ];
  },
  trial: ({ a, b, n, k }, rng) => {
    // Rejection: draw independent Poisson counts until the total is n, then look at X.
    for (;;) {
      const x = samplePoisson(a, rng);
      const y = samplePoisson(b, rng);
      if (x + y === n) return x === k;
    }
  },
});

// ---------------------------------------------------------------- Cambridge problems

const P_DOM = { p: { kind: 'real' as const, min: 0.02, max: 0.24 } };
const Q5_PS = [0.03, 0.1, 0.2, 0.24];
/** Mildred's two rates for a given p: the two roots of p x^2 - x + 1 = 0 in x = e^lambda. */
const roots = (p: number): [number, number] => {
  const d = Math.sqrt(1 - 4 * p);
  return [Math.log((1 + d) / (2 * p)), Math.log((1 - d) / (2 * p))];
};
const between = (l: number): number => Math.exp(-l) * (1 - Math.exp(-l));

const q5Both = auto({
  id: 's2-q5-both-phones',
  source: cite(S2, 'Q5 (2010 S1 Q13)'),
  title: t`Mildred's first text, on either phone`,
  prompt: t`The number of texts Mildred receives on each of her two phones is a Poisson variable, with different means ${math`\lambda_{${1}}`} and ${math`\lambda_{${2}}`} texts per hour, independently. For each phone, the probability that she waits between ${1} and ${2} hours for its first text is ${math`p`}, where ${math`${4}p < ${1}`}. Find, in terms of ${math`p`}, the probability that she waits between ${1} and ${2} hours to receive her first text.`,
  answer: { kind: 'expression', expected: 'p(1 - p)', variables: ['p'], domains: P_DOM },
  solution: [
    t`For one phone with rate ${ml}: none in the first hour, then at least one in the second, so ${math`p = e^{-\lambda}(${1} - e^{-\lambda})`}, that is ${math`p e^{${2}\lambda} - e^{\lambda} + ${1} = ${0}`}, a quadratic in ${math`e^{\lambda}`}.`,
    t`The two different rates are its two roots, so ${math`e^{\lambda_{${1}}}e^{\lambda_{${2}}}`} is the product of the roots, ${math`\frac{${1}}{p}`}: ${math`\lambda_{${1}} + \lambda_{${2}} = -\ln p`}.`,
    t`The texts on both phones together are ${math`\text{Po}(\lambda_{${1}} + \lambda_{${2}})`}, so the probability is ${math`e^{-(\lambda_{${1}} + \lambda_{${2}})}\left(${1} - e^{-(\lambda_{${1}} + \lambda_{${2}})}\right) = p(${1} - p)`}.`,
  ],
  reference: 'p - p^2',
  verify: () => {
    for (const p of Q5_PS) {
      const [l1, l2] = roots(p);
      if (Math.abs(between(l1) - p) > 1e-12 || Math.abs(between(l2) - p) > 1e-12) return `the roots do not give p = ${p}`;
      if (!(l1 > 0 && l2 > 0)) return `a rate is not positive at p = ${p}`;
      if (Math.abs(between(l1 + l2) - p * (1 - p)) > 1e-12) return `the combined probability at p = ${p}`;
    }
    return null;
  },
  misconceptions: [
    { response: 'p', why: t`Two phones bring texts faster than one: the combined rate is ${math`\lambda_{${1}} + \lambda_{${2}}`}, so the first text comes sooner.` },
    { response: 'p^2', why: t`Both phones each having their first text between ${1} and ${2} hours is not the event. Combine the phones: one Poisson count with rate ${math`\lambda_{${1}} + \lambda_{${2}}`}.` },
    { response: '2p', why: t`The events for the two phones overlap and do not add. Use the combined Poisson count.` },
  ],
  official: { source: cite('step-s2-stats-solutions', 'Q5'), answer: 'p(1 - p)', agrees: true },
});

const q5Sum = auto({
  id: 's2-q5-sum',
  source: cite(S2, 'Q5 (2010 S1 Q13)'),
  title: t`The two rates add to ${math`-\ln p`}`,
  prompt: t`Mildred's two phones receive texts as independent Poisson variables with different means ${math`\lambda_{${1}}`} and ${math`\lambda_{${2}}`} per hour, and for each phone the probability of waiting between ${1} and ${2} hours for its first text is ${math`p`}. Find ${math`\lambda_{${1}} + \lambda_{${2}}`} in terms of ${math`p`}.`,
  answer: { kind: 'expression', expected: '-ln(p)', variables: ['p'], domains: P_DOM },
  solution: [
    t`Each rate satisfies ${math`p e^{${2}\lambda} - e^{\lambda} + ${1} = ${0}`}, and they differ, so ${math`e^{\lambda_{${1}}}`} and ${math`e^{\lambda_{${2}}}`} are the two roots of ${math`p x^{${2}} - x + ${1} = ${0}`}.`,
    t`Their product is ${math`\frac{${1}}{p}`}, so ${math`\lambda_{${1}} + \lambda_{${2}} = \ln\frac{${1}}{p} = -\ln p`}.`,
  ],
  reference: 'ln(1/p)',
  verify: () => {
    for (const p of Q5_PS) { const [l1, l2] = roots(p); if (Math.abs(l1 + l2 + Math.log(p)) > 1e-12) return `p = ${p}`; }
    return null;
  },
  misconceptions: [
    { response: 'ln(p)', why: t`${math`p < ${1}`}, so ${math`\ln p < ${0}`}: rates are positive. The product of the roots is ${math`${1}/p`}.` },
    { response: '1/p', why: t`${math`\frac{${1}}{p}`} is ${math`e^{\lambda_{${1}} + \lambda_{${2}}}`}. Take the logarithm.` },
  ],
  official: { source: cite('step-s2-stats-solutions', 'Q5'), answer: '-ln(p)', agrees: true },
});

const KY_DOM = { k: { kind: 'real' as const, min: 0.1, max: 2 }, y: { kind: 'real' as const, min: 0.1, max: 2 } };
const q4None = auto({
  id: 's2-q4-none',
  source: cite(S2, 'Q4 (2012 S2 Q13)'),
  title: t`No supermarket within distance ${math`y`}`,
  prompt: t`The number of supermarkets in any region is modelled by a Poisson variable whose mean is ${math`k`} times the area of the region. Find the probability that there are no supermarkets within a circle of radius ${math`y`}, in terms of ${math`k`} and ${math`y`}.`,
  answer: { kind: 'expression', expected: 'exp(-k*pi*y^2)', variables: ['k', 'y'], domains: KY_DOM },
  solution: [
    t`The circle has area ${math`\pi y^{${2}}`}, so the number of supermarkets in it is ${math`\text{Po}(k\pi y^{${2}})`}.`,
    t`${math`P(\text{none}) = e^{-k\pi y^{${2}}}`}.`,
  ],
  reference: 'e^(-k pi y^2)',
  verify: () => {
    // A Poisson process in a square, simulated: points per unit area k, counted inside the circle.
    const rng = mulberry32(20120213);
    const [k, y, side] = [0.8, 0.9, 4];
    let none = 0;
    const runs = 20_000;
    for (let i = 0; i < runs; i++) {
      const n = samplePoisson(k * side * side, rng);
      let inside = false;
      for (let j = 0; j < n && !inside; j++) {
        const [x1, y1] = [(rng() - 0.5) * side, (rng() - 0.5) * side];
        if (x1 * x1 + y1 * y1 < y * y) inside = true;
      }
      if (!inside) none++;
    }
    const exact = Math.exp(-k * Math.PI * y * y);
    return Math.abs(none / runs - exact) < 4.5 * Math.sqrt((exact * (1 - exact)) / runs) + 1 / runs ? null : `simulated ${none / runs}, formula ${exact}`;
  },
  misconceptions: [
    { response: 'exp(-k*y^2)', why: t`The mean is ${math`k`} times the area, and the area of the circle is ${math`\pi y^{${2}}`}.` },
    { response: '1 - exp(-k*pi*y^2)', why: t`That is the probability of at least one supermarket within ${math`y`}.` },
  ],
  official: { source: cite('step-s2-stats-solutions', 'Q4'), answer: 'e^(-k pi y^2)', agrees: true },
});

const LR_DOM = { lambda: { kind: 'real' as const, min: 0.2, max: 3 }, r: { kind: 'integer' as const, min: 2, max: 10 } };
const Q7A = 'exp(-(r - 1)*lambda)*(1 - exp(-lambda) - lambda*exp(-lambda)) + (r - 1)*lambda*exp(-(r - 1)*lambda)*(1 - exp(-lambda))';
const q7a = auto({
  id: 'ia-s2-q7-a',
  source: cite(SH2, 'Q7(a)'),
  title: t`The second misprint`,
  prompt: t`The number of misprints on a page has a Poisson distribution with parameter ${ml}, and the numbers on different pages are independent. What is the probability that the second misprint occurs on page ${math`r`}, for ${math`r \ge ${2}`}? Give an expression in ${ml} and ${math`r`}.`,
  answer: { kind: 'expression', expected: Q7A, variables: ['lambda', 'r'], domains: LR_DOM },
  solution: [
    t`The first ${math`r - ${1}`} pages together have ${math`\text{Po}((r - ${1})\lambda)`} misprints. The second misprint is on page ${math`r`} when those pages have at most one and page ${math`r`} brings the total to at least two.`,
    t`None before, and at least two on page ${math`r`}: ${math`e^{-(r - ${1})\lambda}\left(${1} - e^{-\lambda} - \lambda e^{-\lambda}\right)`}.`,
    t`Exactly one before, and at least one on page ${math`r`}: ${math`(r - ${1})\lambda e^{-(r - ${1})\lambda}\left(${1} - e^{-\lambda}\right)`}. Add the two cases.`,
  ],
  reference: Q7A,
  verify: () => {
    // Second method: P(at most one in r - 1 pages) - P(at most one in r pages).
    for (const l of [0.3, 1, 2.2]) {
      for (let r = 2; r <= 9; r++) {
        const atMostOne = (m: number): number => Math.exp(-m * l) * (1 + m * l);
        const a = atMostOne(r - 1) - atMostOne(r);
        const b = Math.exp(-(r - 1) * l) * (1 - Math.exp(-l) - l * Math.exp(-l)) + (r - 1) * l * Math.exp(-(r - 1) * l) * (1 - Math.exp(-l));
        if (Math.abs(a - b) > 1e-12) return `lambda = ${l}, r = ${r}`;
      }
    }
    return null;
  },
  misconceptions: [{ response: 'exp(-(r - 1)*lambda)*(1 - exp(-lambda) - lambda*exp(-lambda))', why: t`That is only the case with no misprint before page ${math`r`}. The first misprint may be on an earlier page, and then page ${math`r`} needs only one.` }],
});

const q5George = supervision({
  id: 's2-q5-george',
  source: cite(S2, 'Q5 (2010 S1 Q13)'),
  title: t`George's first text`,
  prompt: t`The number of texts George receives is a Poisson variable with mean ${ml} per hour. Given that the probability that he waits between ${1} and ${2} hours before his first text is ${math`p`}, show that ${math`p e^{${2}\lambda} - e^{\lambda} + ${1} = ${0}`}. Given that ${math`${4}p < ${1}`}, show that there are two positive values of ${ml} that satisfy this equation.`,
  writeUp: 'proof',
  official: cite('step-s2-stats-solutions', 'Q5'),
});

const q4Rest = supervision({
  id: 's2-q4-nearest',
  source: cite(S2, 'Q4 (2012 S2 Q13)'),
  title: t`The distance to the nearest supermarket`,
  prompt: t`In Q${4}, ${mY} is the distance from a randomly chosen point to the nearest supermarket. Write down ${math`P(Y < y)`} and show that ${mY} has density ${math`${2}\pi y k e^{-\pi k y^{${2}}}`} for ${math`y \ge ${0}`}. Using ${math`\int_{${0}}^{\infty} e^{-x^{${2}}/${2}}\,dx = \tfrac{${1}}{${2}}\sqrt{${2}\pi}`}, find ${math`E(Y)`} and show that ${math`\operatorname{Var}(Y) = \frac{${4} - \pi}{${4}\pi k}`}.`,
  writeUp: 'proof',
  official: cite('step-s2-stats-solutions', 'Q4'),
});

const q6 = supervision({
  id: 'ia-s2-q6',
  source: cite(SH2, 'Q6'),
  title: t`The sum, and one count given the sum`,
  prompt: t`Suppose that ${mX} and ${mY} are independent Poisson random variables with parameters ${ml} and ${mmu}. Find the distribution of ${math`X + Y`}. Prove that the conditional distribution of ${mX}, given that ${math`X + Y = n`}, is binomial with parameters ${math`n`} and ${math`\lambda/(\lambda + \mu)`}.`,
  writeUp: 'proof',
});

const q7b = supervision({
  id: 'ia-s2-q7-b',
  source: cite(SH2, 'Q7(b)'),
  title: t`Caught and missed misprints`,
  prompt: t`A proof-reader studies a single page, whose number of misprints is ${math`\text{Po}(\lambda)`}. She catches each misprint, independently of the others, with probability ${math`p`}. Let ${mX} be the number she catches and ${mY} the number she misses. Find the distributions of ${mX} and ${mY} and show that they are independent.`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

const claims: ProbabilityClaim[] = [
  { what: 'given X + Y = 3 for Po(1) and Po(2), X = 1', exact: condVal({ a: 1, b: 2, n: 3, k: 1 }), trial: (rng) => { for (;;) { const x = samplePoisson(1, rng); const y = samplePoisson(2, rng); if (x + y === 3) return x === 1; } } },
];

export const poissonRates: TopicContent = {
  topicId: 'prob.poisson-rates',
  goal: t`Scale a Poisson rate to an interval or an area, add independent Poisson counts, and split a Poisson count at random.`,
  lesson: [
    { kind: 'p', text: t`A Poisson count comes with a [[poisson-rate|rate]]: so many per hour, per page, per square kilometre. The STEP Support notes put it as: if the number in an interval of length ${math`T`} is ${math`\text{Po}(\lambda)`}, the number in an interval of length ${math`kT`} is ${math`\text{Po}(k\lambda)`}.` },
    { kind: 'rule', text: t`Events at rate ${ml} per unit: the count in an interval or region of size ${math`s`} is ${math`\text{Po}(\lambda s)`}, and counts in disjoint intervals are independent.` },
    { kind: 'p', text: t`Sums: if ${math`X \sim \text{Po}(\lambda)`} and ${math`Y \sim \text{Po}(\mu)`} are independent, then ${math`P(X + Y = n) = \sum_{k = ${0}}^{n} \frac{e^{-\lambda}\lambda^{k}}{k!} \cdot \frac{e^{-\mu}\mu^{n - k}}{(n - k)!} = \frac{e^{-(\lambda + \mu)}}{n!}\sum_{k} \binom{n}{k}\lambda^{k}\mu^{n - k} = \frac{e^{-(\lambda + \mu)}(\lambda + \mu)^{n}}{n!}`} by the binomial theorem. So ${math`X + Y \sim \text{Po}(\lambda + \mu)`}, as scaling demands: an hour is two half-hours.` },
    { kind: 'p', text: t`Reversing it (Sheet ${2} Q${6}): given ${math`X + Y = n`}, each of the ${math`n`} occurrences came from ${mX} with probability ${math`\frac{\lambda}{\lambda + \mu}`}, and ${mX} is ${math`B\left(n, \frac{\lambda}{\lambda + \mu}\right)`}. With means ${1} and ${2} and a total of ${3}, ${math`P(X = ${1}) = ${3} \times ${q(1, 3)} \times \left(${q(2, 3)}\right)^{${2}} = ${condVal({ a: 1, b: 2, n: 3, k: 1 })}`}.` },
    { kind: 'p', text: t`[[thinning|Thinning]] goes the other way (Sheet ${2} Q${7}(b)): keep each of ${math`\text{Po}(\lambda)`} occurrences with probability ${math`p`}, independently, and the kept and discarded counts are independent, ${math`\text{Po}(\lambda p)`} and ${math`\text{Po}(\lambda(${1} - p))`}.` },
    { kind: 'p', text: t`Waiting: the first event comes after time ${math`t`} exactly when the count in ${math`[${0}, t]`} is ${0}, with probability ${math`e^{-\lambda t}`}. In STEP ${2} Q${5}, the first text between ${1} and ${2} hours means none in the first hour and at least one in the second: ${math`e^{-\lambda}(${1} - e^{-\lambda})`}.` },
  ],
  examples: [
    workedCambridge(q5Both),
    worked(scale, { c: 0, rate: 6, len: 20, k: 1 }, t`One text in twenty minutes`),
    worked(conditional, { a: 1, b: 3, n: 4, k: 2 }, t`Splitting a total of four`),
  ],
  generators: [scale, sum, conditional],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['poisson-rate', 'thinning'],
  claims,
  cambridge: [q5Sum, q4None, q7a, q5George, q4Rest, q6, q7b],
};
