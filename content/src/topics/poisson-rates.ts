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
import { auto, cite, supervision, withUses } from '../cambridge';
import { add, int, mul, pick, q, str, sub, type Rational } from '../math';
import { choose } from '../numbers';
import { farApart, poissonPmf, poissonPmfRec, powQ, samplePoisson, sig } from '../partv-d';
import { generator, type Misconception } from '../problem';
import { dmath, math, t, type Rich } from '../rich';
import { checkFrom, worked, workedCambridge, type ProbabilityClaim, type TopicContent } from '../topic';

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
    t`For two different roots of one quadratic, use the product of the roots, not the formula.`,
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
  nudge: t`Not quite. Both rates satisfy one quadratic in ${math`e^{\lambda}`}; a relation between its roots gives the sum without solving it.`,
  hints: [
    t`What is the probability that the first text comes between ${1} and ${2} hours, as an expression in the rate?`,
    t`Setting that equal to ${math`p`}, which quadratic does ${math`x = e^{\lambda}`} satisfy?`,
    t`Since the two rates differ, ${math`e^{\lambda_{${1}}}`} and ${math`e^{\lambda_{${2}}}`} are its two roots: what is their product?`,
  ],
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
    t`For a Poisson count, the probability of none is ${math`e^{-\text{mean}}`}.`,
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
  nudge: t`Not quite. The mean count in a region is ${math`k`} times its area, and "none" is the zero term of the Poisson distribution.`,
  hints: [
    t`What is the area of a circle of radius ${math`y`}?`,
    t`What is the Poisson mean for the number of supermarkets in that circle?`,
    t`What is the probability of the value ${0} for a Poisson variable with that mean?`,
  ],
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
    t`A sum of independent Poisson counts is Poisson; then split by cases.`,
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
  nudge: t`Not quite. Split by how many misprints the first ${math`r - ${1}`} pages hold: none, or exactly one.`,
  hints: [
    t`What is the distribution of the total number of misprints on the first ${math`r - ${1}`} pages?`,
    t`For the second misprint to be on page ${math`r`}, how many misprints can the first ${math`r - ${1}`} pages hold?`,
    t`In each of those cases, how many misprints must page ${math`r`} hold, and what are the two probabilities?`,
  ],
});

const q5George = supervision({
  id: 's2-q5-george',
  source: cite(S2, 'Q5 (2010 S1 Q13)'),
  title: t`George's first text`,
  prompt: t`The number of texts George receives is a Poisson variable with mean ${ml} per hour. Given that the probability that he waits between ${1} and ${2} hours before his first text is ${math`p`}, show that ${math`p e^{${2}\lambda} - e^{\lambda} + ${1} = ${0}`}. Given that ${math`${4}p < ${1}`}, show that there are two positive values of ${ml} that satisfy this equation.`,
  writeUp: 'proof',
  official: cite('step-s2-stats-solutions', 'Q5'),
  hints: [
    t`What is the probability of no text in the first ${math`t`} hours?`,
    t`How is "the first text comes between ${1} and ${2} hours" written using no text in ${1} hour and no text in ${2} hours?`,
    t`As a quadratic in ${math`x = e^{\lambda}`}, when does ${math`px^{${2}} - x + ${1} = ${0}`} have two roots greater than ${1}?`,
  ],
});

const q4Rest = supervision({
  id: 's2-q4-nearest',
  source: cite(S2, 'Q4 (2012 S2 Q13)'),
  title: t`The distance to the nearest supermarket`,
  prompt: t`In Q${4}, ${mY} is the distance from a randomly chosen point to the nearest supermarket. Write down ${math`P(Y < y)`} and show that ${mY} has density ${math`${2}\pi y k e^{-\pi k y^{${2}}}`} for ${math`y \ge ${0}`}. Using ${math`\int_{${0}}^{\infty} e^{-x^{${2}}/${2}}\,dx = \tfrac{${1}}{${2}}\sqrt{${2}\pi}`}, find ${math`E(Y)`} and show that ${math`\operatorname{Var}(Y) = \frac{${4} - \pi}{${4}\pi k}`}.`,
  writeUp: 'proof',
  official: cite('step-s2-stats-solutions', 'Q4'),
  hints: [
    t`Why is the event ${math`Y \ge y`} the same as no supermarket within distance ${math`y`}?`,
    t`Differentiating ${math`P(Y < y)`}, what density results?`,
    t`Which substitution turns ${math`\int_{${0}}^{\infty} y^{${2}}e^{-\pi k y^{${2}}}\,dy`} into the given integral?`,
  ],
});

const q6 = supervision({
  id: 'ia-s2-q6',
  source: cite(SH2, 'Q6'),
  title: t`The sum, and one count given the sum`,
  prompt: t`Suppose that ${mX} and ${mY} are independent Poisson random variables with parameters ${ml} and ${mmu}. Find the distribution of ${math`X + Y`}. Prove that the conditional distribution of ${mX}, given that ${math`X + Y = n`}, is binomial with parameters ${math`n`} and ${math`\lambda/(\lambda + \mu)`}.`,
  writeUp: 'proof',
  hints: [
    t`What is ${math`P(X + Y = n)`} as a sum over ${math`k`} of ${math`P(X = k)P(Y = n - k)`}?`,
    t`Which binomial expansion does that sum resemble?`,
    t`What is ${math`P(X = k \mid X + Y = n)`} as a ratio, and what cancels?`,
  ],
});

const q7b = supervision({
  id: 'ia-s2-q7-b',
  source: cite(SH2, 'Q7(b)'),
  title: t`Caught and missed misprints`,
  prompt: t`A proof-reader studies a single page, whose number of misprints is ${math`\text{Po}(\lambda)`}. She catches each misprint, independently of the others, with probability ${math`p`}. Let ${mX} be the number she catches and ${mY} the number she misses. Find the distributions of ${mX} and ${mY} and show that they are independent.`,
  writeUp: 'proof',
  hints: [
    t`Given ${math`n`} misprints on the page, what is the distribution of the number caught?`,
    t`What is ${math`P(X = j, Y = k)`}, using that the page then has ${math`j + k`} misprints?`,
    t`Does that joint probability factorise into a function of ${math`j`} times a function of ${math`k`}?`,
  ],
});

// ---------------------------------------------------------------- lesson

const claims: ProbabilityClaim[] = [
  { what: 'given X + Y = 3 for Po(1) and Po(2), X = 1', exact: condVal({ a: 1, b: 2, n: 3, k: 1 }), trial: (rng) => { for (;;) { const x = samplePoisson(1, rng); const y = samplePoisson(2, rng); if (x + y === 3) return x === 1; } } },
];
const HR = 6;
const MIN = 20;

export const poissonRates: TopicContent = {
  topicId: 'prob.poisson-rates',
  goal: t`Scale a Poisson rate to an interval or an area, add independent Poisson counts, and split a Poisson count at random.`,
  objective: t`Scale a Poisson rate to any interval, add independent Poisson counts, and split one at random.`,
  why: t`Arrivals, faults and texts are modelled this way; STEP and Tripos questions combine all three moves.`,
  minutes: 30,
  lesson: [
    { kind: 'section', title: t`From an hour to twenty minutes` },
    { kind: 'hook', text: t`Texts arrive at random, ${HR} an hour on average. How many in ${MIN} minutes? Your instinct says the count is Poisson with mean ${HR * MIN / 60}. That instinct is right, but it hides a fact: if each third of an hour has a Poisson count, their total must be Poisson too. Is it?` },

    { kind: 'section', title: t`Rates` },
    { kind: 'definition', name: t`Poisson rate`, formal: t`Events occur at [[poisson-rate|rate]] ${ml} per unit if the number in any interval (or region) of size ${math`s`} is ${math`\text{Po}(\lambda s)`}, and the numbers in disjoint intervals are independent.`, plain: t`The mean scales with the size of the interval. At ${HR} per hour, ${MIN} minutes is a third of an hour, so the count is ${math`\text{Po}(${HR * MIN / 60})`}. The STEP Support notes state exactly this scaling rule.` },
    { kind: 'p', text: t`The waiting time comes for free. The first event comes after time ${math`t`} exactly when there are no events in ${math`[${0}, t]`}, so ${math`P(\text{wait} > t) = e^{-\lambda t}`}, the Poisson probability of ${0}.` },
    checkFrom(scale, { c: 1, rate: 12, len: 10, k: 0 }, t`${math`${12} \times \frac{${10}}{${60}} = ${2}`}, so the chance of none is ${math`e^{-${2}}`}.`),

    { kind: 'section', title: t`Independent Poisson counts add` },
    { kind: 'theorem', name: t`Sums`, statement: t`If ${math`X \sim \text{Po}(\lambda)`} and ${math`Y \sim \text{Po}(\mu)`} are independent, then ${math`X + Y \sim \text{Po}(\lambda + \mu)`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Split by the value of X`, text: t`${math`X + Y = n`} happens when ${math`X = k`} and ${math`Y = n - k`} for some ${math`k = ${0}, \ldots, n`}. These cases are disjoint, and ${mX}, ${mY} are independent, so`, eq: [dmath`P(X + Y = n) = \sum_{k = ${0}}^{n} \frac{e^{-\lambda}\lambda^{k}}{k!} \cdot \frac{e^{-\mu}\mu^{n - k}}{(n - k)!}.`] },
        { label: t`Make a binomial coefficient`, text: t`Take out ${math`e^{-(\lambda + \mu)}`}, and multiply and divide by ${math`n!`}:`, eq: [dmath`P(X + Y = n) = \frac{e^{-(\lambda + \mu)}}{n!}\sum_{k = ${0}}^{n} \binom{n}{k}\lambda^{k}\mu^{n - k}.`], why: { q: t`Where does ${math`\binom{n}{k}`} come from?`, a: t`${math`\frac{${1}}{k!\,(n - k)!} = \frac{${1}}{n!} \cdot \frac{n!}{k!\,(n - k)!} = \frac{${1}}{n!}\binom{n}{k}`}.` } },
        { label: t`Binomial theorem`, text: t`The sum is ${math`(\lambda + \mu)^{n}`}, so ${math`P(X + Y = n) = \frac{e^{-(\lambda + \mu)}(\lambda + \mu)^{n}}{n!}`}: the ${math`\text{Po}(\lambda + \mu)`} probability.` },
      ],
    },
    { kind: 'p', text: t`That settles the hook: three independent ${math`\text{Po}(${2})`} counts add to ${math`\text{Po}(${6})`}, so scaling the rate is consistent.` },
    checkFrom(sum, { c: 0, a: 1.5, b: 1, n: 3 }, t`The total is ${math`\text{Po}(${2.5})`}: ${math`e^{-${2.5}}\frac{${2.5}^{${3}}}{${3}!}`}.`),

    { kind: 'section', title: t`Given the total, and thinning` },
    { kind: 'narrative', text: t`Now reverse the question. Two independent Poisson counts, and you are told their total. How is it shared? Each of the ${math`n`} events came from ${mX} with probability proportional to its rate, independently of the others.` },
    { kind: 'theorem', name: t`Given the total`, statement: t`If ${math`X \sim \text{Po}(\lambda)`} and ${math`Y \sim \text{Po}(\mu)`} are independent, then given ${math`X + Y = n`}, ${math`X \sim B\left(n, \frac{\lambda}{\lambda + \mu}\right)`}.` },
    { kind: 'p', text: t`The proof divides ${math`P(X = k,\ Y = n - k)`} by ${math`P(X + Y = n)`}; it is Example Sheet ${2} question ${6}, a Cambridge problem for this lesson. With means ${1} and ${2} and a total of ${3}: ${math`P(X = ${1}) = ${3} \times ${q(1, 3)} \times \left(${q(2, 3)}\right)^{${2}} = ${condVal({ a: 1, b: 2, n: 3, k: 1 })}`}.` },
    checkFrom(conditional, { a: 2, b: 2, n: 4, k: 2 }, t`Each of the ${4} events came from ${mX} with probability ${q(1, 2)}: ${math`\binom{${4}}{${2}}\left(${q(1, 2)}\right)^{${4}}`}.`),
    { kind: 'theorem', name: t`Thinning`, statement: t`If ${math`N \sim \text{Po}(\lambda)`} and each of the ${math`N`} events is kept with probability ${math`p`}, independently, then the kept and discarded counts are independent, ${math`\text{Po}(\lambda p)`} and ${math`\text{Po}(\lambda(${1} - p))`}.` },
    { kind: 'p', text: t`This is [[thinning|thinning]]: a proof-reader who catches each misprint with probability ${math`p`} catches a Poisson number, and misses an independent Poisson number. Proving it is Example Sheet ${2} question ${7}(b).` },

    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`At ${HR} per hour, the count in ${MIN} minutes is ${math`\text{Po}(${HR})`}.`, counterexample: t`The mean scales with the interval: ${math`${HR} \times \tfrac{${1}}{${3}} = ${HR / 3}`}. ${math`P(\text{none})`} is ${math`e^{-${HR / 3}} \approx ${s4(Math.exp(-HR / 3))}`}, not ${math`e^{-${HR}} \approx ${s4(Math.exp(-HR))}`}.` },
    { kind: 'pitfall', claim: t`Given ${math`X + Y = n`}, ${mX} is still Poisson.`, counterexample: t`Given the total, ${mX} cannot exceed ${math`n`}, so it is not Poisson: it is ${math`B(n, \lambda/(\lambda + \mu))`}.` },
    { kind: 'pitfall', claim: t`Any two Poisson counts add to a Poisson count.`, counterexample: t`If ${math`Y = X`} with ${math`X \sim \text{Po}(${1})`}, then ${math`X + Y = ${2}X`} only takes even values, so it is not ${math`\text{Po}(${2})`}. Independence is needed.` },
    { kind: 'takeaway', text: t`Poisson counts scale with the interval, add when independent, split into independent Poisson parts when thinned, and are binomial given their total.` },
  ],
  examples: [
    { ...workedCambridge(q5Both), examiner: t`The examiner looks for "first text between ${1} and ${2} hours" written as none in the first hour and at least one in the second, with independence of the two hours stated.` },
    worked(scale, { c: 0, rate: 6, len: 20, k: 1 }, t`One text in twenty minutes`),
    worked(conditional, { a: 1, b: 3, n: 4, k: 2 }, t`Splitting a total of four`),
  ],
  generators: [scale, sum, conditional],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['poisson-rate', 'thinning'],
  claims,
  cambridge: withUses([q5Sum, q4None, q7a, q5George, q4Rest, q6, q7b], {
    'ia-s2-q7-b': { sections: ['Given the total, and thinning'], note: t`Thinning a Poisson count into two independent ones` },
    's2-q4-nearest': { sections: ['Rates'], note: t`The distance to the nearest point: its density, mean, and variance` },
    'ia-s2-q6': { sections: ['Independent Poisson counts add', 'Given the total, and thinning'], note: t`The sum of Poissons and one count given the total` },
    's2-q5-george': { sections: ['Rates'], note: t`A waiting time from a Poisson rate, and a quadratic in its exponential` },
    'ia-s2-q7-a': { sections: ['Independent Poisson counts add'], note: t`The page of the second misprint` },
    's2-q5-sum': { sections: ['Rates', 'Independent Poisson counts add'], note: t`Two rates that add` },
  }),
  // Multi-part proofs first. The no-supermarket probability is a single step, and dropped.
  gate: ['ia-s2-q7-b', 's2-q4-nearest', 'ia-s2-q6', 's2-q5-george', 'ia-s2-q7-a', 's2-q5-sum'],
  recall: [
    { front: t`Events at rate ${ml}: the count in an interval of length ${math`s`}.`, back: t`${math`\text{Po}(\lambda s)`}, independent over disjoint intervals.` },
    { front: t`The sum of independent ${math`\text{Po}(\lambda)`} and ${math`\text{Po}(\mu)`}.`, back: t`${math`\text{Po}(\lambda + \mu)`}.` },
    { front: t`${mX} given ${math`X + Y = n`}, for independent Poisson counts.`, back: t`${math`B(n, \lambda/(\lambda + \mu))`}.` },
    { front: t`Thinning ${math`\text{Po}(\lambda)`} with probability ${math`p`}.`, back: t`Independent ${math`\text{Po}(\lambda p)`} kept and ${math`\text{Po}(\lambda(${1} - p))`} discarded.` },
  ],
  proofOrder: [{
    title: t`Independent Poisson counts add`,
    steps: [
      t`Split ${math`X + Y = n`} into the disjoint cases ${math`X = k`}, ${math`Y = n - k`}.`,
      t`Multiply the Poisson probabilities, by independence, and add.`,
      t`Take out ${math`e^{-(\lambda + \mu)}/n!`} to leave ${math`\sum \binom{n}{k}\lambda^{k}\mu^{n - k}`}.`,
      t`By the binomial theorem that is ${math`(\lambda + \mu)^{n}`}: a ${math`\text{Po}(\lambda + \mu)`} probability.`,
    ],
  }],
};
