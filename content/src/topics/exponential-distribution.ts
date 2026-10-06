/**
 * prob.exponential-distribution: the Exp(λ) density λ e^(-λx), its survival function
 * e^(-λx), mean 1/λ, and the memoryless property P(X > s + t | X > s) = P(X > t). From the
 * Faculty schedule ("Uniform, normal and exponential random variables. Memoryless property
 * of exponential distribution.") and IA Probability Example Sheet 4 Q4 (the minimum of two
 * independent exponential variables). Sheet 4 has no official solutions; the answers are
 * checked by exact algebra and simulation.
 */
import { mulberry32 } from '@learnhub/mastery';
import { auto, cite, supervision } from '../cambridge';
import { add, int, pick, q, str, type Rational } from '../math';
import { expSample, integrateToInfinity, near, round } from '../partv-b';
import { generator, type Misconception } from '../problem';
import { math, t, type Span } from '../rich';
import { quickCheck, worked, workedCambridge, type ProbabilityClaim, type TopicContent } from '../topic';

const mX = math`X`;
const SH4 = 'ia-prob-sheet-4' as const;
const r4 = (x: number): number => round(x, 4);
const toF = (r: Rational): number => Number(r.num) / Number(r.den);

// ---------------------------------------------------------------- survival

interface SurvP { lam: Rational; a: number; b: number; ask: 'more' | 'less' | 'between' }
const RATES: readonly Rational[] = [q(1, 2), q(1, 3), q(1, 4), q(1, 5), q(1, 10), q(2), q(3, 2)];
const survVal = (p: SurvP): number => {
  const l = toF(p.lam);
  return p.ask === 'more' ? Math.exp(-l * p.a) : p.ask === 'less' ? 1 - Math.exp(-l * p.a) : Math.exp(-l * p.a) - Math.exp(-l * p.b);
};

const survival = generator<SurvP>({
  id: 'survival',
  skill: 'Use P(X > x) = e^(-λx) for X ~ Exp(λ), and differences of it for intervals.',
  params: (rng) => {
    for (;;) {
      const lam = pick(rng, RATES);
      const a = int(rng, 1, 6);
      const b = a + int(rng, 1, 4);
      const p: SurvP = { lam, a, b, ask: pick(rng, ['more', 'less', 'between'] as const) };
      const v = survVal(p);
      if (v > 0.002 && v < 0.998) return p;
    }
  },
  sane: (p) => (toF(p.lam) > 0 && p.a > 0 && p.b > p.a ? null : 'out of range'),
  problem: (p) => {
    const v = survVal(p);
    const mean = q(p.lam.den, p.lam.num);
    const event = p.ask === 'more' ? math`P(X > ${p.a})` : p.ask === 'less' ? math`P(X < ${p.a})` : math`P(${p.a} < X < ${p.b})`;
    return {
      prompt: t`The lifetime ${mX} of a bulb, in years, is exponential with parameter ${math`\lambda = ${p.lam}`} (mean ${mean} years). Find ${event}, to four decimal places.`,
      answer: { kind: 'numeric', expected: r4(v), absTol: 0.00015, relTol: 0 },
      solution: [
        t`For ${math`X \sim \mathrm{Exp}(\lambda)`}, ${math`P(X > x) = \int_{x}^{\infty} \lambda e^{-\lambda u}\,du = e^{-\lambda x}`}.`,
        p.ask === 'more'
          ? t`So ${math`P(X > ${p.a}) = e^{-${p.lam} \times ${p.a}} \approx ${r4(v)}`}.`
          : p.ask === 'less'
            ? t`So ${math`P(X < ${p.a}) = ${1} - e^{-${p.lam} \times ${p.a}} \approx ${r4(v)}`}.`
            : t`So ${math`P(${p.a} < X < ${p.b}) = e^{-${p.lam} \times ${p.a}} - e^{-${p.lam} \times ${p.b}} \approx ${r4(v)}`}.`,
      ],
    };
  },
  solve: (p) => {
    // Integrate the density numerically.
    const l = toF(p.lam);
    const f = (x: number): number => l * Math.exp(-l * x);
    const tail = (x: number): number => integrateToInfinity(f, x, 4000, 1 / l);
    const v = p.ask === 'more' ? tail(p.a) : p.ask === 'less' ? 1 - tail(p.a) : tail(p.a) - tail(p.b);
    return String(r4(v));
  },
  misconceptions: (p): Misconception[] => {
    const l = toF(p.lam);
    return [
      { response: String(r4(1 - survVal(p))), why: t`That is the complementary event. ${math`e^{-\lambda x}`} is the chance of lasting longer than ${math`x`}.` },
      { response: String(r4(l * Math.exp(-l * p.a))), why: t`${math`\lambda e^{-\lambda x}`} is the density, a height, not a probability. Integrate it, or use ${math`P(X > x) = e^{-\lambda x}`}.` },
      { response: String(r4(p.ask === 'more' ? Math.exp(-p.a / l) : p.ask === 'less' ? 1 - Math.exp(-p.a / l) : Math.exp(-p.a / l) - Math.exp(-p.b / l))), why: t`The exponent is ${math`-\lambda x`} with the rate ${math`\lambda = ${p.lam}`}, not ${math`-x/\lambda`}: the mean ${math`${1}/\lambda`} divides.` },
    ];
  },
});

// ---------------------------------------------------------------- memorylessness

interface MemP { lam: Rational; s: number; t: number }

const memoryless = generator<MemP>({
  id: 'memoryless',
  skill: 'Use the memoryless property: given X > s, the extra time X - s is again Exp(λ).',
  params: (rng) => {
    for (;;) {
      const p = { lam: pick(rng, RATES), s: int(rng, 1, 8), t: int(rng, 1, 5) };
      // Keep every answer, right or wrong, visible at four decimal places.
      if (toF(p.lam) * (p.s + p.t) <= 6) return p;
    }
  },
  sane: (p) => (toF(p.lam) > 0 && p.s > 0 && p.t > 0 && toF(p.lam) * (p.s + p.t) <= 6 ? null : 'out of range'),
  problem: (p) => {
    const l = toF(p.lam);
    const v = Math.exp(-l * p.t);
    return {
      prompt: t`The time ${mX}, in hours, until a server fails is exponential with parameter ${math`\lambda = ${p.lam}`}. It has run for ${p.s} hours without failing. What is the probability that it is still running ${p.t} hours from now? Give four decimal places.`,
      answer: { kind: 'numeric', expected: r4(v), absTol: 0.00015, relTol: 0 },
      solution: [
        t`${math`P(X > ${p.s + p.t} \mid X > ${p.s}) = \frac{P(X > ${p.s + p.t})}{P(X > ${p.s})} = \frac{e^{-${p.lam} \times ${p.s + p.t}}}{e^{-${p.lam} \times ${p.s}}} = e^{-${p.lam} \times ${p.t}}`}.`,
        t`That is about ${r4(v)}, the same as for a new server: the ${p.s} hours already run make no difference.`,
      ],
    };
  },
  solve: (p) => {
    // Simulate the conditional experiment is too noisy for four places; compute the conditional ratio of tails numerically.
    const l = toF(p.lam);
    const f = (x: number): number => l * Math.exp(-l * x);
    return String(r4(integrateToInfinity(f, p.s + p.t, 4000, 1 / l) / integrateToInfinity(f, p.s, 4000, 1 / l)));
  },
  misconceptions: (p): Misconception[] => {
    const l = toF(p.lam);
    return [
      { response: String(r4(Math.exp(-l * (p.s + p.t)))), why: t`That is ${math`P(X > ${p.s + p.t})`} for a new server. Condition on having already survived ${p.s} hours: divide by ${math`P(X > ${p.s})`}.` },
      { response: String(r4(Math.exp(-l * p.s))), why: t`The ${p.s} hours have already happened. Only the next ${p.t} hours are uncertain.` },
      { response: String(r4(1 - Math.exp(-l * p.t))), why: t`That is the chance it fails within the next ${p.t} hours. The question asks for it to keep running.` },
    ];
  },
});

// ---------------------------------------------------------------- the first of several to fail

interface MinP { rates: readonly Rational[] }
const MIN_RATES: readonly Rational[] = [q(1), q(2), q(3), q(1, 2), q(1, 3), q(1, 4), q(1, 6)];

const firstFailure = generator<MinP>({
  id: 'first-failure',
  skill: 'The minimum of independent Exp(λ_i) variables is Exp(Σ λ_i), so the first failure comes after 1/Σ λ_i on average.',
  params: (rng) => {
    const n = int(rng, 2, 3);
    const rates: Rational[] = [];
    while (rates.length < n) rates.push(pick(rng, MIN_RATES));
    return { rates };
  },
  sane: (p) => (p.rates.length >= 2 ? null : 'out of range'),
  problem: (p) => {
    const total = p.rates.reduce((a, b) => add(a, b), q(0));
    const mean = q(total.den, total.num);
    const list = p.rates.map((r) => math`${r}`);
    return {
      prompt: t`A machine has ${p.rates.length} parts that fail independently, after exponential times with parameters ${list.length === 2 ? t`${list[0] as Span} and ${list[1] as Span}` : t`${list[0] as Span}, ${list[1] as Span}, and ${list[2] as Span}`} per year. The machine stops when the first part fails. What is the expected time, in years, until it stops?`,
      answer: { kind: 'exact', expected: str(mean) },
      solution: [
        t`The machine runs past time ${math`t`} only if every part does: by independence ${math`P(\min > t) = \prod_{i} e^{-\lambda_{i} t} = e^{-(\sum_{i} \lambda_{i}) t}`}. So the stopping time is ${math`\mathrm{Exp}(${total})`}.`,
        t`An ${math`\mathrm{Exp}(\lambda)`} variable has mean ${math`${1}/\lambda`}, so the expected time is ${math`${1} / ${total} = ${mean}`} years.`,
      ],
    };
  },
  solve: (p) => {
    // E(min) = ∫ P(min > t) dt, numerically.
    const total = p.rates.reduce((a, r) => a + toF(r), 0);
    const v = integrateToInfinity((x) => p.rates.reduce((acc, r) => acc * Math.exp(-toF(r) * x), 1), 0, 4000, 1 / total);
    const den = Number(p.rates.reduce((a, b) => add(a, b), q(0)).num);
    return str(q(Math.round(v * den), den));
  },
  misconceptions: (p): Misconception[] => {
    const sumMeans = p.rates.reduce((a, r) => add(a, q(r.den, r.num)), q(0));
    const fastest = p.rates.reduce((a, r) => (toF(r) > toF(a) ? r : a));
    const avgMean = q(sumMeans.num, sumMeans.den * BigInt(p.rates.length));
    return [
      { response: str(sumMeans), why: t`Adding the means gives the time until every part has failed in turn. The machine stops at the first failure: the rates add, not the means.` },
      { response: str(q(fastest.den, fastest.num)), why: t`The fastest part's mean is too long: any of the parts may fail first, so the machine stops sooner on average. The rates add.` },
      { response: str(avgMean), why: t`Averaging the means does not give the minimum. The minimum is ${math`\mathrm{Exp}(\sum_{i} \lambda_{i})`}.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

/** P(min(X, Y) > t) by simulation, X ~ Exp(l), Y ~ Exp(m). */
function simMin(l: number, m: number, t0: number, n: number): number {
  const rng = mulberry32(44);
  let hits = 0;
  for (let i = 0; i < n; i++) if (Math.min(expSample(rng, l), expSample(rng, m)) > t0) hits++;
  return hits / n;
}

const q4min = auto({
  id: 'ia4-q4-min',
  source: cite(SH4, 'Q4'),
  title: t`The minimum of two exponential variables`,
  prompt: t`${mX} and ${math`Y`} are independent, exponential with parameters ${math`\lambda`} and ${math`\mu`}. ${math`\min\{X, Y\}`} is exponential: find its parameter. (Type ${math`\lambda`} as lambda and ${math`\mu`} as mu.)`,
  answer: { kind: 'expression', expected: 'lambda + mu', variables: ['lambda', 'mu'], domains: { lambda: { kind: 'real', min: 0.1, max: 5 }, mu: { kind: 'real', min: 0.1, max: 5 } } },
  solution: [
    t`The minimum exceeds ${math`t`} exactly when both do: ${math`P(\min\{X, Y\} > t) = P(X > t)\,P(Y > t) = e^{-\lambda t}e^{-\mu t} = e^{-(\lambda + \mu)t}`} for ${math`t \ge ${0}`}, by independence.`,
    t`That is the survival function of ${math`\mathrm{Exp}(\lambda + \mu)`}, so ${math`\min\{X, Y\} \sim \mathrm{Exp}(\lambda + \mu)`}: the rates add.`,
  ],
  reference: 'lambda + mu',
  verify: () => {
    const n = 20000;
    for (const [l, m, t0] of [[1, 2, 0.3], [0.5, 0.5, 1]] as const) {
      const exact = Math.exp(-(l + m) * t0);
      const r = near(`P(min > ${t0}) by simulation, λ = ${l}, μ = ${m}`, simMin(l, m, t0, n), exact, 4.5 * Math.sqrt((exact * (1 - exact)) / n));
      if (r !== null) return r;
    }
    return null;
  },
  misconceptions: [
    { response: 'lambda mu/(lambda + mu)', why: t`That combines the means, not the rates. ${math`P(\min > t) = e^{-\lambda t}e^{-\mu t}`}: the exponents add.` },
    { response: 'lambda mu', why: t`The survival functions multiply, so their exponents add: ${math`e^{-\lambda t}e^{-\mu t} = e^{-(\lambda + \mu)t}`}.` },
  ],
});

const q4three = auto({
  id: 'ia4-q4-three',
  source: cite(SH4, 'Q4', true),
  title: t`The first of three to fail`,
  prompt: t`Three bulbs have independent exponential lifetimes with means ${1}, ${2}, and ${3} years. Find the expected time until the first bulb fails, in years.`,
  answer: { kind: 'exact', expected: str(q(6, 11)) },
  solution: [
    t`The rates are the reciprocals of the means: ${math`${1}, ${q(1, 2)}, ${q(1, 3)}`}, which add to ${q(11, 6)}.`,
    t`The minimum is ${math`\mathrm{Exp}(${q(11, 6)})`}, with mean ${q(6, 11)} of a year.`,
  ],
  reference: '6/11',
  verify: () => near('E(min) as the integral of the joint survival function', integrateToInfinity((x) => Math.exp(-x) * Math.exp(-x / 2) * Math.exp(-x / 3), 0), 6 / 11, 1e-9),
  misconceptions: [
    { response: '6', why: t`${6} years is the time until all three have failed if they burn one after another. The first failure comes much sooner: the rates add.` },
    { response: '1', why: t`The bulb with mean ${1} is the most likely to fail first, but any of the three may: the minimum has rate ${q(11, 6)}.` },
    { response: '2', why: t`Averaging the means does not give the minimum. Add the rates.` },
  ],
});

const memorylessProof = supervision({
  id: 'schedule-memoryless',
  source: cite('tripos-schedules', 'IA Probability, Continuous random variables: "Memoryless property of exponential distribution"', true),
  title: t`The memoryless property, and its converse`,
  prompt: t`Prove that ${math`X \sim \mathrm{Exp}(\lambda)`} has ${math`P(X > s + t \mid X > s) = P(X > t)`} for all ${math`s, t \ge ${0}`}. Conversely, suppose ${math`G(t) = P(X > t)`} is continuous, positive, and satisfies ${math`G(s + t) = G(s)\,G(t)`}. Show that ${math`G(t) = e^{-\lambda t}`} for some ${math`\lambda > ${0}`}: first for whole numbers, then rationals, then by continuity.`,
  writeUp: 'proof',
});

const q4firstWhich = supervision({
  id: 'ia4-q4-which',
  source: cite(SH4, 'Q4', true),
  title: t`Which one fails first, and the time it takes`,
  prompt: t`For independent ${math`X \sim \mathrm{Exp}(\lambda)`} and ${math`Y \sim \mathrm{Exp}(\mu)`}, show that the event ${math`\{X < Y\}`} is independent of ${math`\min\{X, Y\}`}, and explain what this says about a race between two exponential clocks.`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

const claims: ProbabilityClaim[] = [
  { what: 'P(X > Y) for independent X ~ Exp(1), Y ~ Exp(2)', exact: q(2, 3), trial: (rng) => expSample(rng, 1) > expSample(rng, 2) },
  { what: 'P(min(X, Y) is X) for independent X ~ Exp(3), Y ~ Exp(1)', exact: q(3, 4), trial: (rng) => expSample(rng, 3) < expSample(rng, 1) },
];

const [mlam, ms, mt, mx] = [math`\lambda`, math`s`, math`t`, math`x`];

export const exponentialDistribution: TopicContent = {
  topicId: 'prob.exponential-distribution',
  goal: t`Use the ${math`\mathrm{Exp}(\lambda)`} density ${math`\lambda e^{-\lambda x}`}, its survival function ${math`e^{-\lambda x}`}, and the memoryless property ${math`P(X > s + t \mid X > s) = P(X > t)`}.`,
  objective: t`Use the exponential distribution for waiting times, and prove and apply its memoryless property.`,
  why: t`It is the continuous model of waiting, behind Poisson processes, queues, and radioactive decay.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`Waiting without memory` },
    { kind: 'hook', text: t`A radioactive atom has survived for a thousand years. Is it now more likely to decay soon, like an old car? No: as far as anyone can measure, the atom is exactly as good as new. A waiting time with no memory turns out to have exactly one possible distribution.` },
    {
      kind: 'definition',
      name: t`Exponential distribution`,
      formal: t`For ${math`\lambda > ${0}`}, ${mX} has the [[exponential-distribution|exponential distribution]] ${math`\mathrm{Exp}(\lambda)`} if it has density ${math`f(x) = \lambda e^{-\lambda x}`} for ${math`x \ge ${0}`}, and ${math`f(x) = ${0}`} for ${math`x < ${0}`}.`,
      plain: t`a waiting time whose density starts at height ${mlam} and decays. ${mlam} is a rate, events per unit time: ${math`\lambda = ${2}`} per hour means two per hour on average.`,
    },
    {
      kind: 'p',
      text: t`Integrating the density from ${mx} to infinity gives the survival function, ${math`P(X > x) = \int_{x}^{\infty} \lambda e^{-\lambda u}\,du = \left[-e^{-\lambda u}\right]_{x}^{\infty} = e^{-\lambda x}`} for ${math`x \ge ${0}`}. The mean is ${math`E(X) = \frac{${1}}{\lambda}`} and the variance ${math`\frac{${1}}{\lambda^{${2}}}`}.`,
      why: { q: t`Where does the mean come from?`, a: t`By parts: ${math`\int_{${0}}^{\infty} x\,\lambda e^{-\lambda x}\,dx = \left[-x e^{-\lambda x}\right]_{${0}}^{\infty} + \int_{${0}}^{\infty} e^{-\lambda x}\,dx = ${0} + \frac{${1}}{\lambda}`}. A rate of ${2} per hour gives a mean wait of ${q(1, 2)} an hour.` },
    },
    quickCheck({
      prompt: t`${math`X \sim \mathrm{Exp}(${q(1, 3)})`}. Find ${math`P(X > ${6})`}, as a power of ${math`e`}.`,
      answer: { kind: 'expression', expected: 'e^(-2)', variables: [] },
      reference: 'e^(-2)',
      why: t`${math`P(X > ${6}) = e^{-${6}/${3}} = e^{-${2}}`}.`,
    }),
    { kind: 'section', title: t`The memoryless property` },
    {
      kind: 'theorem',
      name: t`Memoryless property`,
      statement: t`If ${math`X \sim \mathrm{Exp}(\lambda)`}, then for all ${math`s, t \ge ${0}`}, ${math`P(X > s + t \mid X > s) = P(X > t)`}.`,
    },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Conditional probability`, text: t`${math`P(X > s + t \mid X > s) = \frac{P(X > s + t \text{ and } X > s)}{P(X > s)}`}.`, plain: t`The definition, with ${math`P(X > s) = e^{-\lambda s} > ${0}`}.` },
        { label: t`Simplify the event`, text: t`Since ${math`t \ge ${0}`}, ${math`X > s + t`} already implies ${math`X > s`}, so the top is ${math`P(X > s + t)`}.`, plain: t`If you have waited more than ${math`s + t`}, you have certainly waited more than ${ms}.` },
        { label: t`Use the survival function`, text: t`${math`\frac{e^{-\lambda(s + t)}}{e^{-\lambda s}} = e^{-\lambda t}`}.`, plain: t`A law of indices: ${math`e^{-\lambda s - \lambda t} = e^{-\lambda s}e^{-\lambda t}`}, and ${math`e^{-\lambda s}`} cancels.` },
        { label: t`Recognise it`, text: t`${math`e^{-\lambda t} = P(X > t)`}.`, plain: t`The time still to wait has the same distribution as a fresh wait.` },
      ],
    },
    {
      kind: 'p',
      text: t`This is the [[memoryless-property|memoryless property]]. A part that has lasted ${ms} hours is as good as new. That suits radioactive decay and fits poorly for things that wear out.`,
      why: { q: t`Is the exponential the only memoryless distribution?`, a: t`Among continuous distributions, yes. Memorylessness says the survival function ${math`G`} satisfies ${math`G(s + t) = G(s)\,G(t)`}, and with continuity that forces ${math`G(t) = e^{-\lambda t}`}. Proving it is a supervision problem.` },
    },
    {
      kind: 'pitfall',
      claim: t`A part with exponential lifetime of mean ${10} years that has lasted ${8} years has about ${2} years left on average.`,
      counterexample: t`By memorylessness, the remaining life is again ${math`\mathrm{Exp}(${q(1, 10)})`}, so its mean is still ${10} years. The past wait tells you nothing about the future one.`,
    },
    { kind: 'section', title: t`Racing clocks` },
    { kind: 'p', text: t`Several independent exponential clocks race. The first rings after ${math`\min\{X, Y\}`}, which exceeds ${mt} only if both do: ${math`P(\min\{X, Y\} > t) = e^{-\lambda t}e^{-\mu t} = e^{-(\lambda + \mu)t}`}, using independence. So the minimum is ${math`\mathrm{Exp}(\lambda + \mu)`}: rates add. And ${mX} wins the race with probability ${math`\frac{\lambda}{\lambda + \mu}`}. With rates ${3} and ${1}, the first clock wins with probability ${q(3, 4)}; with ${mX} of rate ${1} and ${math`Y`} of rate ${2}, ${math`P(X > Y) = ${q(2, 3)}`}.` },
    { kind: 'takeaway', text: t`${math`\mathrm{Exp}(\lambda)`} has ${math`P(X > x) = e^{-\lambda x}`} and mean ${math`\frac{${1}}{\lambda}`}; it forgets the past, and the first of independent exponential clocks rings at the sum of the rates.` },
  ],
  examples: [
    { ...workedCambridge(q4min), examiner: t`The event ${math`\{\min\{X, Y\} > t\}`} written as ${math`\{X > t\} \cap \{Y > t\}`}, independence named when the probabilities are multiplied, and the result read off as a survival function.` },
    worked(memoryless, { lam: q(1, 4), s: 6, t: 2 }, t`A server that has already run for ${6} hours`),
    worked(firstFailure, { rates: [q(1, 2), q(1, 3)] }, t`The first of two parts to fail`),
  ],
  generators: [survival, memoryless, firstFailure],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['exponential-distribution', 'memoryless-property'],
  claims,
  cambridge: [q4three, memorylessProof, q4firstWhich],
  // Sheet 4 Q4: the independence of the winner and the time first, then the three bulbs.
  gate: ['ia4-q4-which', 'ia4-q4-three'],
  recall: [
    { front: t`Density and survival function of ${math`\mathrm{Exp}(\lambda)`}?`, back: t`${math`\lambda e^{-\lambda x}`} and ${math`P(X > x) = e^{-\lambda x}`}, for ${math`x \ge ${0}`}.` },
    { front: t`Mean and variance of ${math`\mathrm{Exp}(\lambda)`}?`, back: t`${math`\frac{${1}}{\lambda}`} and ${math`\frac{${1}}{\lambda^{${2}}}`}.` },
    { front: t`State the memoryless property.`, back: t`${math`P(X > s + t \mid X > s) = P(X > t)`} for all ${math`s, t \ge ${0}`}.` },
    { front: t`Minimum of independent ${math`\mathrm{Exp}(\lambda)`} and ${math`\mathrm{Exp}(\mu)`}?`, back: t`${math`\mathrm{Exp}(\lambda + \mu)`}.` },
  ],
  proofOrder: [
    {
      title: t`The exponential distribution is memoryless`,
      steps: [
        t`${math`P(X > s + t \mid X > s) = \frac{P(X > s + t,\ X > s)}{P(X > s)}`}.`,
        t`${math`X > s + t`} implies ${math`X > s`}, so the top is ${math`P(X > s + t)`}.`,
        t`That gives ${math`\frac{e^{-\lambda(s + t)}}{e^{-\lambda s}} = e^{-\lambda t}`}.`,
        t`And ${math`e^{-\lambda t} = P(X > t)`}.`,
      ],
    },
  ],
};
