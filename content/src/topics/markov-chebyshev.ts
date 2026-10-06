/**
 * ineq.markov-chebyshev: Markov's inequality P(X ≥ a) ≤ E(X)/a for X ≥ 0, and Chebyshev's
 * P(|X - μ| ≥ c) ≤ σ^2/c^2, with the variants of IA Probability Example Sheet 3 Q2 (moments
 * and exponential moments), the Poisson tail bound of Q3(a), and the sample size of Q4 (25
 * by Chebyshev). From the Faculty schedule ("Markov's inequality, Chebyshev's
 * inequality"). The sheet has no official solutions; the sample size is checked by search,
 * the Poisson bound by minimising over a grid of β, and each bound against the two- or
 * three-point distribution that attains it.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { add, int, mul, pick, q, str, sub, toFloat, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { distinctFrom, expect, type Dist } from '../partv-c';
import { math, t, type Rich } from '../rich';
import { worked, workedCambridge, type ProbabilityClaim, type TopicContent } from '../topic';

const S3 = 'ia-prob-sheet-3' as const;

// ---------------------------------------------------------------- Markov

interface MarkovP { m: Rational; a: number; what: number }
const WHATS: readonly Rich[] = [
  t`the waiting time, in minutes, for a bus`,
  t`the number of emails a server receives in a second`,
  t`the weight, in kilograms, of a parcel`,
  t`the number of typos on a page`,
  t`the score of a randomly chosen player`,
];
const markovVal = ({ m, a }: MarkovP): Rational => mul(m, q(1, a));
function markovMis({ m, a }: MarkovP): [Rational, Rich][] {
  return [
    [mul(q(a), q(m.den, m.num)), t`The bound is the mean divided by the threshold, ${math`\mathbb{E}(X)/a`}, not the other way up.`],
    [mul(m, q(1, a * a)), t`Dividing by ${math`a^{${2}}`} is Chebyshev's form, which needs the variance. Markov's inequality uses the mean: ${math`\mathbb{E}(X)/a`}.`],
    [sub(q(1), markovVal({ m, a, what: 0 })), t`${math`${1} - \mathbb{E}(X)/a`} is a lower bound for ${math`\mathbb{P}(X < a)`}; the question asks for ${math`\mathbb{P}(X \ge a)`} itself.`],
  ];
}

const markovBound = generator<MarkovP>({
  id: 'markov-bound',
  skill: 'Bound P(X ≥ a) for a nonnegative random variable from its mean alone, by Markov\'s inequality.',
  params: (rng) => {
    for (;;) {
      const m = pick(rng, [q(2), q(3), q(5), q(3, 2), q(5, 2), q(4), q(6), q(10)]);
      const a = int(rng, Math.ceil(toFloat(m)) + 1, Math.ceil(toFloat(m)) * 4 + 2);
      const p: MarkovP = { m, a, what: int(rng, 0, WHATS.length - 1) };
      if (distinctFrom(str(markovVal(p)), markovMis(p).map(([v]) => str(v))) >= 2) return p;
    }
  },
  sane: ({ m, a }) => (toFloat(m) < a ? null : 'trivial bound'),
  problem: (p) => ({
    prompt: t`${math`X`} is ${WHATS[p.what] as Rich}, so ${math`X \ge ${0}`}, and all that is known is ${math`\mathbb{E}(X) = ${p.m}`}. What is the best upper bound on ${math`\mathbb{P}(X \ge ${p.a})`} that Markov's inequality gives?`,
    answer: { kind: 'exact', expected: str(markovVal(p)) },
    solution: [
      t`For ${math`X \ge ${0}`} and ${math`a > ${0}`}: ${math`a\,\mathbf{${1}}_{\{X \ge a\}} \le X`}, so taking means, ${math`a\,\mathbb{P}(X \ge a) \le \mathbb{E}(X)`}.`,
      t`So ${math`\mathbb{P}(X \ge ${p.a}) \le \frac{\mathbb{E}(X)}{${p.a}} = ${markovVal(p)}`}.`,
    ],
  }),
  solve: ({ m, a }) => {
    // The bound is attained: X = a with probability m/a and 0 otherwise has mean m. Compute its tail.
    const extreme: Dist = { xs: [0, a], ps: [sub(q(1), mul(m, q(1, a))), mul(m, q(1, a))] };
    const mean = expect(extreme);
    if (str(mean) !== str(m)) return 'mismatch';
    return str(extreme.ps[1] as Rational);
  },
  misconceptions: (p): Misconception[] => markovMis(p).map(([v, why]) => ({ response: str(v), why })),
});

// ---------------------------------------------------------------- Chebyshev

interface ChebP { mu: number; sigma: number; c: number; inside: boolean }
const chebTail = ({ sigma, c }: ChebP): Rational => q(sigma * sigma, c * c);
const chebVal = (p: ChebP): Rational => (p.inside ? sub(q(1), chebTail(p)) : chebTail(p));
function chebMis(p: ChebP): [Rational, Rich][] {
  const tail = chebTail(p);
  return [
    [q(p.sigma, p.c), t`Chebyshev's inequality bounds by the variance over ${math`c^{${2}}`}: square the standard deviation and the distance.`],
    [q(p.sigma * p.sigma, p.c), t`Divide the variance by ${math`c^{${2}}`}, not by ${math`c`}: Chebyshev is Markov's inequality applied to ${math`(X - \mu)^{${2}} \ge c^{${2}}`}.`],
    [p.inside ? tail : sub(q(1), tail), p.inside
      ? t`That bounds the chance of being far from ${p.mu}. The question asks about the interval around it: subtract from ${1}.`
      : t`That is a lower bound for the chance of being within ${p.c} of ${p.mu}. The question asks for an upper bound on being at least ${p.c} away.`],
  ];
}

const chebyshevBound = generator<ChebP>({
  id: 'chebyshev-bound',
  skill: 'Use Chebyshev\'s inequality to bound the chance of a deviation from the mean, or of landing in an interval around it.',
  params: (rng) => {
    for (;;) {
      const sigma = int(rng, 1, 6);
      const p: ChebP = { mu: int(rng, 0, 100), sigma, c: int(rng, sigma + 1, sigma * 4), inside: rng() < 0.5 };
      if (distinctFrom(str(chebVal(p)), chebMis(p).map(([v]) => str(v))) >= 2) return p;
    }
  },
  sane: ({ sigma, c }) => (c > sigma ? null : 'trivial bound'),
  problem: (p) => ({
    prompt: p.inside
      ? t`A random variable ${math`X`} has mean ${p.mu} and standard deviation ${p.sigma}. What lower bound does Chebyshev's inequality give for ${math`\mathbb{P}(${p.mu - p.c} < X < ${p.mu + p.c})`}?`
      : t`A random variable ${math`X`} has mean ${p.mu} and standard deviation ${p.sigma}. What upper bound does Chebyshev's inequality give for ${math`\mathbb{P}(|X - ${p.mu}| \ge ${p.c})`}?`,
    answer: { kind: 'exact', expected: str(chebVal(p)) },
    solution: [
      t`Chebyshev with ${math`\sigma = ${p.sigma}`} and ${math`c = ${p.c}`}: ${math`\mathbb{P}(|X - \mu| \ge c) \le \frac{\sigma^{${2}}}{c^{${2}}} = ${chebTail(p)}`}.`,
      ...(p.inside ? [t`The interval is the complement of ${math`|X - ${p.mu}| \ge ${p.c}`}, so its probability is at least ${math`${1} - ${chebTail(p)} = ${chebVal(p)}`}.`] : []),
    ],
  }),
  solve: (p) => {
    // The three-point distribution μ - c, μ, μ + c with P(μ ± c) = σ²/(2c²) has variance σ² and attains the bound.
    const w = q(p.sigma * p.sigma, 2 * p.c * p.c);
    const d: Dist = { xs: [p.mu - p.c, p.mu, p.mu + p.c], ps: [w, sub(q(1), add(w, w)), w] };
    const varD = expect(d, (x) => q((x - p.mu) * (x - p.mu)));
    if (str(varD) !== String(p.sigma * p.sigma)) return 'mismatch';
    const far = add(d.ps[0] as Rational, d.ps[2] as Rational);
    return str(p.inside ? sub(q(1), far) : far);
  },
  misconceptions: (p): Misconception[] => chebMis(p).map(([v, why]) => ({ response: str(v), why })),
});

// ---------------------------------------------------------------- sample size by Chebyshev

interface SizeP { k: Rational; alpha: Rational }
const needed = (k: Rational, alpha: Rational): number => {
  // Smallest n with 1/(n k^2) <= alpha.
  const x = mul(mul(k, k), alpha);
  return Number((x.den + x.num - 1n) / x.num);
};
const sizeVal = ({ k, alpha }: SizeP): number => needed(k, alpha);
function sizeMis({ k, alpha }: SizeP): [number, Rich][] {
  const noSquare = mul(k, alpha);
  return [
    [Number((noSquare.den + noSquare.num - 1n) / noSquare.num), t`${math`\operatorname{var}(\bar{X}) = \sigma^{${2}}/n`} is divided by the square of the distance, ${math`(k\sigma)^{${2}}`}: square ${math`k`}.`],
    [Math.ceil(Math.sqrt(1 / toFloat(mul(mul(k, k), alpha)))), t`The variance of the mean falls like ${math`${1}/n`}, not ${math`${1}/\sqrt{n}`}: solve ${math`\frac{${1}}{nk^{${2}}} \le \alpha`} for ${math`n`} directly.`],
    [Math.ceil(1 / toFloat(mul(k, k))), t`That ignores the target probability. Chebyshev needs ${math`\frac{\sigma^{${2}}/n}{(k\sigma)^{${2}}} \le ${alpha}`}.`],
  ];
}

const sampleSize = generator<SizeP>({
  id: 'sample-size',
  skill: 'Find how large a sample Chebyshev\'s inequality needs for the sample mean to be close to μ with high probability, as in Sheet 3 Q4.',
  params: (rng) => {
    for (;;) {
      const p: SizeP = { k: pick(rng, [q(1, 2), q(1), q(2), q(3), q(1, 4), q(3, 2)]), alpha: pick(rng, [q(1, 10), q(1, 20), q(1, 25), q(1, 50), q(1, 100), q(1, 5)]) };
      if (sizeVal(p) >= 2 && distinctFrom(String(sizeVal(p)), sizeMis(p).map(([v]) => String(v))) >= 2) return p;
    }
  },
  sane: (p) => (sizeVal(p) >= 1 ? null : 'out of range'),
  problem: (p) => {
    const target = sub(q(1), p.alpha);
    const dist = p.k.num === 1n && p.k.den === 1n ? t`one standard deviation` : p.k.num < p.k.den ? t`${p.k} of a standard deviation` : t`${p.k} standard deviations`;
    return {
      prompt: t`A random sample ${math`X_{${1}}, \ldots, X_{n}`} is taken from a distribution with mean ${math`\mu`} and variance ${math`\sigma^{${2}} < \infty`}. Using Chebyshev's inequality, what is the smallest ${math`n`} that guarantees, whatever the distribution, that the sample mean is within ${dist} of ${math`\mu`} with probability at least ${target}?`,
      answer: { kind: 'exact', expected: String(sizeVal(p)) },
      solution: [
        t`${math`\bar{X}`} has mean ${math`\mu`} and variance ${math`\sigma^{${2}}/n`}, since the variances of independent variables add.`,
        t`Chebyshev: ${math`\mathbb{P}(|\bar{X} - \mu| \ge c) \le \frac{\sigma^{${2}}/n}{c^{${2}}}`} with ${math`c = ${p.k}\sigma`}, so ${math`c^{${2}} = ${mul(p.k, p.k)}\sigma^{${2}}`} and the bound is ${math`\frac{${1}}{n} \cdot ${q(p.k.den * p.k.den, p.k.num * p.k.num)}`}. This is at most ${p.alpha} when ${math`n \ge ${mul(q(p.alpha.den, p.alpha.num), q(p.k.den * p.k.den, p.k.num * p.k.num))}`}, so ${math`n = ${sizeVal(p)}`}.`,
      ],
    };
  },
  solve: ({ k, alpha }) => {
    // Try n = 1, 2, ... until the Chebyshev bound is small enough.
    for (let n = 1; ; n++) if (toFloat(mul(q(1, n), q(k.den * k.den, k.num * k.num))) <= toFloat(alpha) + 1e-12) return String(n);
  },
  misconceptions: (p): Misconception[] => sizeMis(p).map(([v, why]) => ({ response: String(v), why })),
});

// ---------------------------------------------------------------- Cambridge problems

const q4 = auto({
  id: 'ia-s3-q4',
  source: cite(S3, 'Q4'),
  title: t`How large a sample?`,
  prompt: t`Consider a random sample ${math`X_{${1}}, \ldots, X_{n}`} taken from a distribution having mean ${math`\mu`} and variance ${math`\sigma^{${2}} < \infty`}. Use Chebyshev's inequality to determine a sample size ${math`n`} that will be sufficient, whatever the distribution, for the probability to be at least ${q(99, 100)} that the sample mean ${math`\bar{X}`} will be within two standard deviations of ${math`\mu`}. Give the smallest such ${math`n`} that the inequality guarantees.`,
  answer: { kind: 'exact', expected: String(needed(q(2), q(1, 100))) },
  solution: [
    t`${math`\mathbb{E}(\bar{X}) = \mu`} and ${math`\operatorname{var}(\bar{X}) = \sigma^{${2}}/n`}, by independence.`,
    t`Chebyshev: ${math`\mathbb{P}(|\bar{X} - \mu| \ge ${2}\sigma) \le \frac{\sigma^{${2}}/n}{${4}\sigma^{${2}}} = \frac{${1}}{${4}n}`}.`,
    t`We need ${math`\frac{${1}}{${4}n} \le ${q(1, 100)}`}, that is ${math`n \ge ${needed(q(2), q(1, 100))}`}.`,
  ],
  reference: String(needed(q(2), q(1, 100))),
  verify: () => {
    let n = 1;
    while (4 * n < 100) n++;
    return same('smallest n with 1/(4n) <= 1/100', n, needed(q(2), q(1, 100)));
  },
  misconceptions: [
    { response: '50', why: t`The distance is ${math`${2}\sigma`}, so divide by ${math`(${2}\sigma)^{${2}} = ${4}\sigma^{${2}}`}, not ${math`${2}\sigma^{${2}}`}.` },
    { response: '100', why: t`The deviation allowed is two standard deviations: divide by ${math`${4}\sigma^{${2}}`}.` },
  ],
});

const [LAMBDA, XQ] = [2, 6];
const chernoff = Math.exp(-XQ * Math.log(XQ / LAMBDA) - LAMBDA + XQ);
const q3a = auto({
  id: 'ia-s3-q3-a-value',
  source: cite(S3, 'Q3(a)', true),
  title: t`A Chernoff bound for a Poisson tail`,
  prompt: t`${math`X`} is Poisson with parameter ${math`\lambda = ${LAMBDA}`}. Using ${math`\mathbb{P}(X \ge x) \le \mathbb{E}(e^{\beta X})e^{-\beta x}`} for ${math`\beta \ge ${0}`}, with the best choice of ${math`\beta`}, bound ${math`\mathbb{P}(X \ge ${XQ})`}. Give the bound to three significant figures.`,
  answer: { kind: 'numeric', expected: chernoff, relTol: 2e-3 },
  solution: [
    t`For a Poisson variable ${math`\mathbb{E}(e^{\beta X}) = \sum_{k} e^{\beta k}e^{-\lambda}\frac{\lambda^{k}}{k!} = e^{\lambda(e^{\beta} - ${1})}`}, so the bound is ${math`\exp\left(\lambda(e^{\beta} - ${1}) - \beta x\right)`}.`,
    t`The exponent is least where its derivative ${math`\lambda e^{\beta} - x`} vanishes: ${math`e^{\beta} = x/\lambda`}, allowed since ${math`x \ge \lambda`}. Then the bound is ${math`\exp\left(-x\log(x/\lambda) - \lambda + x\right)`}.`,
    t`With ${math`\lambda = ${LAMBDA}`} and ${math`x = ${XQ}`}: ${math`\exp\left(-${XQ}\log ${XQ / LAMBDA} - ${LAMBDA} + ${XQ}\right) \approx ${chernoff}`}.`,
  ],
  reference: chernoff.toPrecision(3),
  verify: () => {
    // Minimise the bound over a fine grid of β, and check it lies above the true tail.
    let best = Infinity;
    for (let b = 0; b <= 5; b += 1e-4) best = Math.min(best, Math.exp(LAMBDA * (Math.exp(b) - 1) - b * XQ));
    let below = 0;
    let term = Math.exp(-LAMBDA);
    for (let k = 0; k < XQ; k++) { below += term; term *= LAMBDA / (k + 1); }
    const tail = 1 - below;
    if (Math.abs(best - chernoff) > 1e-6 * chernoff) return `grid minimum ${best}, formula ${chernoff}`;
    return tail <= chernoff ? null : `true tail ${tail} exceeds the bound`;
  },
  misconceptions: [
    { response: (LAMBDA / XQ).toPrecision(3), why: t`That is Markov's bound ${math`\mathbb{E}(X)/x`}. The exponential moment with the best ${math`\beta`} gives a much smaller bound.` },
    { response: Math.exp(LAMBDA * (Math.E - 1) - XQ).toPrecision(3), why: t`That takes ${math`\beta = ${1}`}. Choose ${math`\beta`} to make the bound smallest: ${math`e^{\beta} = x/\lambda`}.` },
  ],
});

const q2proof = supervision({
  id: 'ia-s3-q2',
  source: cite(S3, 'Q2'),
  title: t`Markov's inequality in two more forms`,
  prompt: t`Let ${math`X`} be a random variable. Show that, for all ${math`p > ${0}`} and ${math`x > ${0}`}, ${math`\mathbb{P}(|X| \ge x) \le \mathbb{E}(|X|^{p})x^{-p}`}, and that, for all ${math`\beta \ge ${0}`}, ${math`\mathbb{P}(X \ge x) \le \mathbb{E}(e^{\beta X})e^{-\beta x}`}. Which earlier inequality is the case ${math`p = ${2}`} applied to ${math`X - \mu`}?`,
  writeUp: 'proof',
});
const q3proof = supervision({
  id: 'ia-s3-q3-a',
  source: cite(S3, 'Q3(a)'),
  title: t`Optimising the exponential bound`,
  prompt: t`Let ${math`X`} be Poisson with parameter ${math`\lambda > ${0}`}. By optimising the estimate of Q${2}(b) over ${math`\beta`}, show that ${math`\mathbb{P}(X \ge x) \le \exp\left(-x\log(x/\lambda) - \lambda + x\right)`} for all ${math`x \ge \lambda`}. Why is the restriction ${math`x \ge \lambda`} needed?`,
  writeUp: 'proof',
});
const scheduleProof = supervision({
  id: 'schedule-markov-chebyshev',
  source: cite('tripos-schedules', 'IA Probability, Inequalities and limits: "Markov\'s inequality, Chebyshev\'s inequality."', true),
  title: t`Proving both, and when they are sharp`,
  prompt: t`Prove Markov's inequality for a nonnegative random variable, and deduce Chebyshev's inequality ${math`\mathbb{P}(|X - \mu| \ge c) \le \sigma^{${2}}/c^{${2}}`}. For given ${math`\mu`}, ${math`\sigma`}, and ${math`c > \sigma`}, find a random variable for which Chebyshev's inequality holds with equality. For a fair die, compare ${math`\mathbb{P}(X \ge ${5})`} with the bound Markov's inequality gives.`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

const DIE: Dist = { xs: [1, 2, 3, 4, 5, 6], ps: Array.from({ length: 6 }, () => q(1, 6)) };
const DIE_MEAN = expect(DIE);
const claims: ProbabilityClaim[] = [
  { what: 'a fair die shows at least 5 (Markov bound 7/10)', exact: q(1, 3), trial: (rng) => 1 + Math.floor(rng() * 6) >= 5 },
];

export const markovChebyshev: TopicContent = {
  topicId: 'ineq.markov-chebyshev',
  goal: t`Bound tail probabilities from a mean or a variance alone, with Markov's and Chebyshev's inequalities, and use them for sample sizes.`,
  lesson: [
    { kind: 'p', text: t`Often only the mean or the variance of a random variable is known. That is still enough to say that large values are unlikely, and by how much at most.` },
    { kind: 'rule', text: t`[[markov-inequality|Markov's inequality]]: if ${math`X \ge ${0}`} and ${math`a > ${0}`}, then ${math`\mathbb{P}(X \ge a) \le \frac{\mathbb{E}(X)}{a}`}. Proof: ${math`a\,\mathbf{${1}}_{\{X \ge a\}} \le X`} at every outcome; take means.` },
    { kind: 'rule', text: t`[[chebyshev-inequality|Chebyshev's inequality]]: if ${math`X`} has mean ${math`\mu`} and variance ${math`\sigma^{${2}}`}, then ${math`\mathbb{P}(|X - \mu| \ge c) \le \frac{\sigma^{${2}}}{c^{${2}}}`} for ${math`c > ${0}`}. Proof: Markov's inequality for ${math`(X - \mu)^{${2}}`} and the threshold ${math`c^{${2}}`}.` },
    { kind: 'p', text: t`The bounds hold for every distribution, so they are often crude. For a fair die, ${math`\mathbb{P}(X \ge ${5}) = ${q(1, 3)}`}, while Markov gives ${math`${DIE_MEAN}/${5} = ${mul(DIE_MEAN, q(1, 5))}`}. Yet neither can be improved in general: ${math`X = a`} with probability ${math`m/a`}, else ${0}, has mean ${math`m`} and meets Markov's bound exactly.` },
    { kind: 'p', text: t`The same trick works with any increasing function (Sheet ${3} Q${2}): ${math`\mathbb{P}(|X| \ge x) \le \mathbb{E}(|X|^{p})x^{-p}`}, and ${math`\mathbb{P}(X \ge x) \le \mathbb{E}(e^{\beta X})e^{-\beta x}`} for every ${math`\beta \ge ${0}`}. Choosing the best ${math`\beta`} gives very sharp tail bounds: for a Poisson variable with ${math`\lambda = ${LAMBDA}`}, ${math`\mathbb{P}(X \ge ${XQ}) \le ${chernoff}`}, against ${q(LAMBDA, XQ)} from Markov.` },
    { kind: 'p', text: t`For the mean of a sample of ${math`n`}, ${math`\operatorname{var}(\bar{X}) = \sigma^{${2}}/n`}, so ${math`\mathbb{P}(|\bar{X} - \mu| \ge c) \le \frac{\sigma^{${2}}}{nc^{${2}}} \to ${0}`}: the sample mean settles near ${math`\mu`}. Sheet ${3} Q${4}: within ${2} standard deviations with probability ${q(99, 100)} needs ${math`\frac{${1}}{${4}n} \le ${q(1, 100)}`}, so ${math`n = ${needed(q(2), q(1, 100))}`} suffices for every distribution.` },
  ],
  examples: [
    workedCambridge(q4),
    worked(markovBound, { m: q(3), a: 12, what: 0 }, t`A bound from the mean alone`),
    worked(chebyshevBound, { mu: 50, sigma: 5, c: 15, inside: true }, t`At least this much near the mean`),
  ],
  generators: [markovBound, chebyshevBound, sampleSize],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['markov-inequality', 'chebyshev-inequality'],
  claims,
  cambridge: [q3a, q2proof, q3proof, scheduleProof],
  gate: ['ia-s3-q3-a-value', 'ia-s3-q2', 'ia-s3-q3-a'],
};
