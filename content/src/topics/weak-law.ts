/**
 * lim.weak-law: for independent, identically distributed variables with mean mu and finite
 * variance, the sample mean converges in probability to mu, by Chebyshev's inequality and
 * Var(sample mean) = sigma^2 / n. From the Faculty schedule ("Weak law of large numbers")
 * and IA Probability Example Sheet 3 Q13 (the weak law for the sample mean and, with a
 * fourth moment, the sample variance) and Q4 (a sample size from Chebyshev's inequality,
 * whatever the distribution). The sheet has no official solutions; each answer is checked
 * by exact arithmetic or by listing every outcome.
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { div, int, mul, pick, q, str, sub, toFloat, type Rational } from '../math';
import { choose } from '../numbers';
import { generator, type Misconception } from '../problem';
import { dmath, listOf, math, t, type Rich } from '../rich';
import { checkFrom, worked, workedProof, type ProbabilityClaim, type TopicContent } from '../topic';

const [mXbar, meps] = [math`\bar{X}_{n}`, math`\varepsilon`];
const SH3 = 'ia-prob-sheet-3' as const;
const SCHEDULE = cite('tripos-schedules', 'IA Probability, Inequalities and limits: "Weak law of large numbers"', true);
const ONE = q(1);
/** The least integer n >= r, for a positive rational r. */
const ceilQ = (r: Rational): number => Number((r.num + r.den - 1n) / r.den);

// ---------------------------------------------------------------- a sample size from Chebyshev

interface SizeP { sigma: Rational; eps: Rational; delta: Rational }
const sizeVal = ({ sigma, eps, delta }: SizeP): number => ceilQ(div(mul(sigma, sigma), mul(mul(eps, eps), delta)));
const sizeMis = ({ sigma, eps, delta }: SizeP): number[] => [
  ceilQ(div(mul(sigma, sigma), mul(mul(eps, eps), sub(ONE, delta)))),
  ceilQ(div(mul(sigma, sigma), mul(eps, delta))),
  ceilQ(div(sigma, mul(mul(eps, eps), delta))),
];
const SIGMAS = [q(2), q(3), q(5), q(1, 2), q(3, 2), q(4)];
const EPSS = [q(1, 2), q(1), q(2), q(1, 4), q(3, 2)];
const DELTAS = [q(1, 100), q(1, 20), q(1, 10), q(1, 5)];
const pct = (d: Rational): number => toFloat(mul(sub(ONE, d), q(100)));

const sampleSize = generator<SizeP>({
  id: 'sample-size',
  skill: 'Find the sample size n for which Chebyshev guarantees P(|mean - mu| >= epsilon) <= delta: n >= sigma^2 / (epsilon^2 delta).',
  params: (rng) => {
    for (;;) {
      const p: SizeP = { sigma: pick(rng, SIGMAS), eps: pick(rng, EPSS), delta: pick(rng, DELTAS) };
      const right = sizeVal(p);
      if (right >= 2 && right <= 100_000 && new Set(sizeMis(p).filter((m) => m !== right)).size >= 2) return p;
    }
  },
  sane: ({ eps, delta }) => (eps.num > 0n && delta.num > 0n ? null : 'out of range'),
  problem: (p) => {
    const { sigma, eps, delta } = p;
    const v = mul(sigma, sigma);
    const bound = div(v, mul(mul(eps, eps), delta));
    return {
      prompt: t`A random sample ${math`X_{${1}}, \ldots, X_{n}`} is taken from a distribution with mean ${math`\mu`} and standard deviation ${sigma}. Using Chebyshev's inequality, find the smallest ${math`n`} that guarantees, whatever the distribution, that the sample mean is within ${eps} of ${math`\mu`} with probability at least ${pct(delta)}%.`,
      answer: { kind: 'exact', expected: String(sizeVal(p)) },
      solution: [
        t`${math`\operatorname{Var}(\bar{X}_{n}) = \sigma^{${2}}/n`}, so Chebyshev gives ${math`P(|\bar{X}_{n} - \mu| \ge \varepsilon) \le \frac{\sigma^{${2}}}{n\varepsilon^{${2}}} = \frac{${v}}{n \times ${mul(eps, eps)}}`}.`,
        t`We need this at most ${delta}: ${math`n \ge \frac{${v}}{${mul(eps, eps)} \times ${delta}} = ${bound}`}. The smallest such integer is ${sizeVal(p)}.`,
      ],
    };
  },
  solve: (p) => {
    // A floating-point estimate, then the exact test that n works and n - 1 does not.
    const v = mul(p.sigma, p.sigma);
    const works = (n: number): boolean => { const b = div(v, mul(q(n), mul(p.eps, p.eps))); return b.num * p.delta.den <= p.delta.num * b.den; };
    let n = Math.max(1, Math.ceil(toFloat(v) / (toFloat(p.eps) ** 2 * toFloat(p.delta))) - 2);
    while (!works(n)) n++;
    while (n > 1 && works(n - 1)) n--;
    return String(n);
  },
  misconceptions: (p): Misconception[] => {
    const [conf, epsLin, sdLin] = sizeMis(p) as [number, number, number];
    return [
      { response: String(conf), why: t`Chebyshev bounds the chance of being far away. Set that at most ${p.delta}, not ${sub(ONE, p.delta)}.` },
      { response: String(epsLin), why: t`Chebyshev has ${math`\varepsilon^{${2}}`} in the denominator: square the distance.` },
      { response: String(sdLin), why: t`The bound uses the variance ${math`\sigma^{${2}}`}, not the standard deviation.` },
    ];
  },
});

// ---------------------------------------------------------------- the Chebyshev bound for a sample mean

interface Dist { name: Rich; mean: Rational; variance: Rational }
const DISTS: readonly Dist[] = [
  { name: t`throws of a fair die`, mean: q(7, 2), variance: q(35, 12) },
  { name: t`tosses of a fair coin, counting ${1} for a head`, mean: q(1, 2), variance: q(1, 4) },
  { name: t`draws from ${math`\{${1}, ${2}, ${3}, ${4}\}`}, each equally likely`, mean: q(5, 2), variance: q(5, 4) },
  { name: t`trials that succeed with probability ${q(1, 5)}, counting ${1} for a success`, mean: q(1, 5), variance: q(4, 25) },
];
interface BoundP { d: number; n: number; eps: Rational }
const boundVal = ({ d, n, eps }: BoundP): Rational => div((DISTS[d] as Dist).variance, mul(q(n), mul(eps, eps)));
const boundMis = ({ d, n, eps }: BoundP): Rational[] => {
  const v = (DISTS[d] as Dist).variance;
  return [div(v, mul(eps, eps)), div(v, mul(q(n), eps)), div(v, mul(q(n * n), mul(eps, eps)))];
};

const bound = generator<BoundP>({
  id: 'chebyshev-bound',
  skill: 'Bound P(|mean - mu| >= epsilon) by sigma^2 / (n epsilon^2).',
  params: (rng) => {
    for (;;) {
      const p: BoundP = { d: int(rng, 0, DISTS.length - 1), n: pick(rng, [10, 20, 25, 50, 100, 200, 400, 1000]), eps: pick(rng, [q(1, 10), q(1, 5), q(1, 4), q(1, 2), q(1), q(1, 20)]) };
      const b = boundVal(p);
      const right = str(b);
      if (b.num < b.den && new Set(boundMis(p).map(str).filter((m) => m !== right)).size >= 2) return p;
    }
  },
  sane: ({ d, n }) => (d < DISTS.length && n >= 1 ? null : 'out of range'),
  problem: (p) => {
    const D = DISTS[p.d] as Dist;
    return {
      prompt: t`${mXbar} is the mean of ${p.n} independent ${D.name}. Use Chebyshev's inequality to bound ${math`P(|\bar{X}_{n} - ${D.mean}| \ge ${p.eps})`}.`,
      answer: { kind: 'exact', expected: str(boundVal(p)) },
      solution: [
        t`Each throw or draw has mean ${D.mean} and variance ${D.variance}. Independent variances add, so ${math`\operatorname{Var}(\bar{X}_{n}) = \frac{${p.n} \times ${D.variance}}{${p.n}^{${2}}} = \frac{${D.variance}}{${p.n}}`}.`,
        t`Chebyshev: ${math`P(|\bar{X}_{n} - \mu| \ge \varepsilon) \le \frac{\operatorname{Var}(\bar{X}_{n})}{\varepsilon^{${2}}} = \frac{${D.variance}}{${p.n} \times ${mul(p.eps, p.eps)}} = ${boundVal(p)}`}.`,
      ],
    };
  },
  solve: ({ d, n, eps }) => {
    // Var of the mean from the variance of the sum, n sigma^2, divided by n^2.
    const D = DISTS[d] as Dist;
    const sumVar = mul(q(n), D.variance);
    return str(div(div(sumVar, q(n * n)), mul(eps, eps)));
  },
  misconceptions: (p): Misconception[] => {
    const [noN, epsLin, n2] = boundMis(p) as [Rational, Rational, Rational];
    return [
      { response: str(noN), why: t`That is the bound for one observation. Averaging ${p.n} of them divides the variance by ${p.n}.` },
      { response: str(epsLin), why: t`Chebyshev divides by ${math`\varepsilon^{${2}}`}: square ${p.eps}.` },
      { response: str(n2), why: t`${math`\operatorname{Var}(\bar{X}_{n}) = \sigma^{${2}}/n`}: the sum has variance ${math`n\sigma^{${2}}`}, and dividing the sum by ${math`n`} divides the variance by ${math`n^{${2}}`}, leaving ${math`\sigma^{${2}}/n`}.` },
    ];
  },
});

// ---------------------------------------------------------------- the exact chance for coin tosses

interface CoinP { n: number; c: number }
const coinVal = ({ n, c }: CoinP): Rational => {
  let hits = 0n;
  for (let k = 0; k <= n; k++) if (Math.abs(2 * k - n) >= 2 * c) hits += BigInt(choose(n, k));
  return q(hits, 2n ** BigInt(n));
};
const coinMis = ({ n, c }: CoinP): Rational[] => {
  let one = 0n;
  let strict = 0n;
  for (let k = 0; k <= n; k++) { if (2 * k - n >= 2 * c) one += BigInt(choose(n, k)); if (Math.abs(2 * k - n) > 2 * c) strict += BigInt(choose(n, k)); }
  return [q(one, 2n ** BigInt(n)), q(strict, 2n ** BigInt(n)), q(n, 4 * c * c)];
};

const coins = generator<CoinP>({
  id: 'coin-deviation',
  skill: 'Compute the exact chance that the number of heads strays from n/2, and compare it with Chebyshev.',
  params: (rng) => {
    for (;;) {
      const n = pick(rng, [4, 6, 8, 10, 12]);
      const p: CoinP = { n, c: int(rng, 1, Math.min(3, n / 2)) };
      const right = str(coinVal(p));
      if (coinVal(p).num > 0n && new Set(coinMis(p).map(str).filter((m) => m !== right)).size >= 2) return p;
    }
  },
  sane: ({ n, c }) => (n % 2 === 0 && c >= 1 && 2 * c <= n ? null : 'out of range'),
  problem: (p) => {
    const { n, c } = p;
    const ks = Array.from({ length: n + 1 }, (_, k) => k).filter((k) => Math.abs(2 * k - n) >= 2 * c);
    const cheb = q(n, 4 * c * c);
    return {
      prompt: t`A fair coin is tossed ${n} times. What is the exact probability that the number of heads differs from ${n / 2} by at least ${c}?`,
      answer: { kind: 'exact', expected: str(coinVal(p)) },
      solution: [
        t`The number of heads ${math`S`} is ${math`B(${n}, ${q(1, 2)})`}. ${math`|S - ${n / 2}| \ge ${c}`} means ${math`S`} is one of ${listOf(ks)}.`,
        t`Adding ${math`\binom{${n}}{k}/${2}^{${n}}`} over those values gives ${coinVal(p)}. Chebyshev, with ${math`\operatorname{Var}(S) = ${q(n, 4)}`}, only says it is at most ${math`\frac{${q(n, 4)}}{${c * c}} = ${cheb}`}${cheb.num >= cheb.den ? t`, which tells us nothing` : t``}: a crude bound, but enough to prove the weak law.`,
      ],
    };
  },
  solve: ({ n, c }) => {
    // Every sequence of tosses.
    let hits = 0;
    for (let m = 0; m < 2 ** n; m++) {
      let h = 0;
      for (let i = 0; i < n; i++) if ((m >> i) & 1) h++;
      if (Math.abs(2 * h - n) >= 2 * c) hits++;
    }
    return str(q(hits, 2 ** n));
  },
  misconceptions: (p): Misconception[] => {
    const [oneSide, strict, cheb] = coinMis(p) as [Rational, Rational, Rational];
    return [
      { response: str(oneSide), why: t`That counts only too many heads. Too few heads is just as far from ${p.n / 2}.` },
      { response: str(strict), why: t`"At least ${p.c}" includes a difference of exactly ${p.c}.` },
      { response: str(cheb), why: t`That is Chebyshev's bound, ${math`\operatorname{Var}(S)/c^{${2}}`}, not the probability. The question asks for the exact value.` },
    ];
  },
  trial: ({ n, c }, rng) => { let h = 0; for (let i = 0; i < n; i++) if (rng() < 0.5) h++; return Math.abs(2 * h - n) >= 2 * c; },
});

// ---------------------------------------------------------------- Cambridge problems

const q4 = auto({
  id: 'ia-s3-q4',
  source: cite(SH3, 'Q4'),
  title: t`A sample size that works for every distribution`,
  prompt: t`A random sample ${math`X_{${1}}, \ldots, X_{n}`} is taken from a distribution with mean ${math`\mu`} and variance ${math`\sigma^{${2}} < \infty`}. Use Chebyshev's inequality to determine the smallest sample size ${math`n`} that is sufficient, whatever the distribution, for the probability to be at least ${0.99} that the sample mean ${mXbar} is within two standard deviations of ${math`\mu`}.`,
  nudge: t`Not quite. Apply Chebyshev to the sample mean, whose variance shrinks like ${math`\frac{${1}}{n}`}.`,
  hints: [
    t`What is the variance of the sample mean ${mXbar}?`,
    t`With a distance of ${math`${2}\sigma`}, what bound does Chebyshev's inequality give for ${math`P(|\bar{X}_{n} - \mu| \ge ${2}\sigma)`}?`,
    t`For which ${math`n`} is that bound at most ${0.01}?`,
  ],
  answer: { kind: 'exact', expected: '25' },
  solution: [
    t`${math`\operatorname{Var}(\bar{X}_{n}) = \sigma^{${2}}/n`}, and "within two standard deviations" means ${math`|\bar{X}_{n} - \mu| < ${2}\sigma`}.`,
    t`Chebyshev: ${math`P(|\bar{X}_{n} - \mu| \ge ${2}\sigma) \le \frac{\sigma^{${2}}/n}{${4}\sigma^{${2}}} = \frac{${1}}{${4}n}`}. This is at most ${0.01} exactly when ${math`n \ge ${25}`}.`,
    t`Chebyshev on the sample mean gives a sample size that works for every distribution.`,
  ],
  reference: '25',
  verify: () => {
    const b = (n: number): Rational => q(1, 4 * n);
    const ok = (n: number): boolean => toFloat(b(n)) <= 0.01 + 1e-15;
    return ok(25) && !ok(24) ? same('the bound at n = 25', str(b(25)), '1/100') : 'n = 25 is not the least sufficient size';
  },
  misconceptions: [
    { response: '100', why: t`That is the size for one standard deviation. Two standard deviations put ${math`(${2}\sigma)^{${2}} = ${4}\sigma^{${2}}`} in the denominator.` },
    { response: '5', why: t`Chebyshev's bound is ${math`\frac{${1}}{${4}n}`}, not ${math`\frac{${1}}{${4}n^{${2}}}`}: no square root of ${math`n`} comes in.` },
  ],
});

const q13 = workedProof({
  title: t`The weak law for the sample mean`,
  prompt: t`Let ${math`(X_{n} : n \in \mathbb{N})`} be independent, identically distributed random variables with mean ${math`\mu`} and variance ${math`\sigma^{${2}} < \infty`}, and ${math`\hat{\mu}_{n} = \frac{${1}}{n}\sum_{i = ${1}}^{n} X_{i}`}. Show that for all ${math`\varepsilon > ${0}`}, ${math`P(|\hat{\mu}_{n} - \mu| > \varepsilon) \to ${0}`} as ${math`n \to \infty`}.`,
  steps: [
    t`By linearity, ${math`E(\hat{\mu}_{n}) = \frac{${1}}{n} \cdot n\mu = \mu`}.`,
    t`The ${math`X_{i}`} are independent, so their covariances are ${0} and the variance of the sum is the sum of the variances: ${math`\operatorname{Var}(\hat{\mu}_{n}) = \frac{${1}}{n^{${2}}} \cdot n\sigma^{${2}} = \frac{\sigma^{${2}}}{n}`}.`,
    t`Chebyshev's inequality: ${math`P(|\hat{\mu}_{n} - \mu| > \varepsilon) \le P(|\hat{\mu}_{n} - \mu| \ge \varepsilon) \le \frac{\operatorname{Var}(\hat{\mu}_{n})}{\varepsilon^{${2}}} = \frac{\sigma^{${2}}}{n\varepsilon^{${2}}}`}.`,
    t`For fixed ${meps}, the right side tends to ${0} as ${math`n \to \infty`}, and probabilities are at least ${0}, so ${math`P(|\hat{\mu}_{n} - \mu| > \varepsilon) \to ${0}`}.`,
  ],
  answer: t`${math`\hat{\mu}_{n} \to \mu`} in probability, at rate at most ${math`\sigma^{${2}}/(n\varepsilon^{${2}})`}.`,
  source: cite(SH3, 'Q13'),
});

const q13b = supervision({
  id: 'ia-s3-q13-variance',
  source: cite(SH3, 'Q13'),
  title: t`The weak law for the sample variance`,
  prompt: t`With ${math`\hat{\mu}_{n}`} as above and ${math`\hat{\sigma}_{n}^{${2}} = \frac{${1}}{n}\sum_{i = ${1}}^{n}(X_{i} - \hat{\mu}_{n})^{${2}}`}, show that, provided ${math`E(X_{${1}}^{${4}}) < \infty`}, ${math`P(|\hat{\sigma}_{n}^{${2}} - \sigma^{${2}}| > \varepsilon) \to ${0}`} for all ${math`\varepsilon > ${0}`}. Hint: show first that ${math`\hat{\sigma}_{n}^{${2}} = \frac{${1}}{n}\sum_{i = ${1}}^{n}(X_{i} - \mu)^{${2}} - (\hat{\mu}_{n} - \mu)^{${2}}`}.`,
  hints: [
    t`Expanding ${math`(X_{i} - \hat{\mu}_{n})^{${2}}`} as ${math`((X_{i} - \mu) - (\hat{\mu}_{n} - \mu))^{${2}}`} and summing, how does the hinted identity follow?`,
    t`Applying the weak law to the variables ${math`(X_{i} - \mu)^{${2}}`}, which need a finite variance, what does their average tend to?`,
    t`If ${math`(\hat{\mu}_{n} - \mu)^{${2}}`} tends to ${0} in probability, how do the two pieces combine with ${math`\frac{\varepsilon}{${2}}`} each?`,
  ],
  writeUp: 'proof',
});

const uncorrelated = supervision({
  id: 'schedule-weak-law',
  source: SCHEDULE,
  title: t`Uncorrelated is enough`,
  prompt: t`Prove the weak law of large numbers when the ${math`X_{i}`} all have mean ${math`\mu`} and variance ${math`\sigma^{${2}}`} and are only pairwise uncorrelated, ${math`\operatorname{cov}(X_{i}, X_{j}) = ${0}`} for ${math`i \ne j`}. Where does the proof use the covariances? Give an example of a sequence with equal means and variances, not independent, for which the sample mean does not converge to ${math`\mu`} in probability.`,
  hints: [
    t`What is ${math`\operatorname{Var}\left(\sum_{i} X_{i}\right)`} in terms of the variances and the covariances?`,
    t`With every covariance zero, what is the variance of the sample mean, and what does Chebyshev's inequality then give?`,
    t`For the example, what happens to the sample mean if every ${math`X_{i}`} equals the same random variable?`,
  ],
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

const N_EX = 100;
const EPS_EX = q(1, 10);
/** P(|S/n - 1/2| >= 1/10) for n = 100 fair tosses, exactly. */
const exact100 = ((): number => { let s = 0; for (let k = 0; k <= N_EX; k++) if (Math.abs(k / N_EX - 0.5) >= 0.1 - 1e-12) s += Math.exp(Math.log(choose(N_EX, k)) - N_EX * Math.log(2)); return s; })();
const cheb100 = div(q(1, 4), mul(q(N_EX), mul(EPS_EX, EPS_EX)));
const claims: ProbabilityClaim[] = [
  { what: 'ten fair tosses: heads differ from five by at least two', exact: coinVal({ n: 10, c: 2 }), trial: (rng) => { let h = 0; for (let i = 0; i < 10; i++) if (rng() < 0.5) h++; return Math.abs(h - 5) >= 2; } },
];
const [mmu, msig] = [math`\mu`, math`\sigma^{${2}}`];

export const weakLaw: TopicContent = {
  topicId: 'lim.weak-law',
  goal: t`Prove that the sample mean of independent, identically distributed variables with finite variance converges in probability to ${math`\mu`}, by Chebyshev's inequality.`,
  objective: t`Prove that the sample mean settles near the true mean, and use Chebyshev to choose a sample size.`,
  why: t`It is why averages, polls and simulations work, and the first step towards the central limit theorem.`,
  minutes: 30,
  lesson: [
    { kind: 'section', title: t`Why do averages settle?` },
    { kind: 'hook', text: t`Toss a fair coin ${N_EX} times. You expect about half heads, but not exactly half. Toss it a million times and the proportion of heads will be very close to ${q(1, 2)}. Everyone believes this. What exactly is the statement, and why is it true?` },
    { kind: 'narrative', text: t`The proportion of heads is an average: score ${1} for a head and ${0} for a tail, and average the scores. Averaging cancels out luck: a run of heads here is offset by tails there. The question is how fast, and the answer comes from the variance. The variance of an average of ${math`n`} independent scores shrinks like ${math`\frac{${1}}{n}`}, and a small variance forces the average to stay close to its mean.` },
    { kind: 'section', title: t`Convergence in probability` },
    {
      kind: 'definition',
      name: t`Sample mean and convergence in probability`,
      formal: t`For random variables ${math`X_{${1}}, \ldots, X_{n}`}, the sample mean is ${math`\bar{X}_{n} = \frac{${1}}{n}\sum_{i = ${1}}^{n} X_{i}`}. A sequence ${math`Y_{n}`} [[convergence-in-probability|converges in probability]] to a constant ${math`c`} if ${math`P(\lvert Y_{n} - c \rvert > \varepsilon) \to ${0}`} as ${math`n \to \infty`}, for every ${math`\varepsilon > ${0}`}.`,
      plain: t`In plain words: however small a margin ${meps} you choose, the chance of missing ${math`c`} by more than ${meps} becomes negligible as ${math`n`} grows. For the coin, ${math`Y_{n}`} is the proportion of heads and ${math`c = ${q(1, 2)}`}.`,
    },
    {
      kind: 'theorem',
      name: t`Weak law of large numbers`,
      statement: t`Let ${math`X_{${1}}, X_{${2}}, \ldots`} be independent and identically distributed with mean ${mmu} and variance ${math`\sigma^{${2}} < \infty`}. Then ${mXbar} converges in probability to ${mmu}: for every ${math`\varepsilon > ${0}`}, ${math`P(\lvert \bar{X}_{n} - \mu \rvert > \varepsilon) \to ${0}`}.`,
    },
    { kind: 'p', text: t`This is the [[weak-law|weak law of large numbers]]. The proof needs one tool from the previous chapter, Chebyshev's inequality: for any random variable ${math`Y`} with finite variance and any ${math`\varepsilon > ${0}`}, ${math`P(\lvert Y - E(Y) \rvert \ge \varepsilon) \le \frac{\operatorname{Var}(Y)}{\varepsilon^{${2}}}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`The mean of the average`, text: t`By linearity of expectation, ${math`E(\bar{X}_{n}) = \frac{${1}}{n}\sum_{i} E(X_{i}) = \frac{${1}}{n} \cdot n\mu = \mu`}.` },
        { label: t`The variance of the average`, text: t`Independent variables have variances that add, and ${math`\operatorname{Var}(aY) = a^{${2}}\operatorname{Var}(Y)`}, so`, eq: [dmath`\operatorname{Var}(\bar{X}_{n}) = \frac{${1}}{n^{${2}}}\sum_{i} \operatorname{Var}(X_{i}) = \frac{${1}}{n^{${2}}} \cdot n\sigma^{${2}} = \frac{\sigma^{${2}}}{n}.`], why: { q: t`Why do the variances add?`, a: t`${math`\operatorname{Var}(\sum X_{i}) = \sum \operatorname{Var}(X_{i}) + \sum_{i \ne j} \operatorname{cov}(X_{i}, X_{j})`}, and independent variables have covariance ${0}.` } },
        { label: t`Apply Chebyshev`, text: t`With ${math`Y = \bar{X}_{n}`}:`, eq: [dmath`P(\lvert \bar{X}_{n} - \mu \rvert > \varepsilon) \le P(\lvert \bar{X}_{n} - \mu \rvert \ge \varepsilon) \le \frac{\sigma^{${2}}}{n\varepsilon^{${2}}}.`] },
        { label: t`Let n grow`, text: t`For fixed ${meps}, ${math`\frac{\sigma^{${2}}}{n\varepsilon^{${2}}} \to ${0}`}. A probability is at least ${0}, so it is squeezed to ${0}.` },
      ],
    },
    checkFrom(bound, { d: 1, n: 50, eps: q(1, 10) }, t`${math`\frac{\sigma^{${2}}}{n\varepsilon^{${2}}} = \frac{${q(1, 4)}}{${50} \times ${q(1, 100)}} = ${q(1, 2)}`}.`),
    { kind: 'section', title: t`How good is the bound?` },
    { kind: 'p', text: t`For ${N_EX} fair tosses and ${math`\varepsilon = ${EPS_EX}`}, Chebyshev gives ${math`\frac{${q(1, 4)}}{${N_EX} \times ${mul(EPS_EX, EPS_EX)}} = ${cheb100}`}, while the exact chance of being at least ${EPS_EX} away from ${q(1, 2)} is about ${Number(exact100.toPrecision(3))}. The bound is crude. Its strength is that it holds for every distribution with that variance, and that is exactly what you need to choose a sample size without knowing the distribution, as IA Probability Sheet ${3}, question ${4}, asks.` },
    {
      kind: 'steps',
      steps: [
        { label: t`Set the target`, text: t`We want ${math`P(\lvert \bar{X}_{n} - \mu \rvert \ge \varepsilon) \le \delta`}. Chebyshev guarantees it as soon as ${math`\frac{\sigma^{${2}}}{n\varepsilon^{${2}}} \le \delta`}.` },
        { label: t`Solve for n`, text: t`Multiply by ${math`n`} and divide by ${math`\delta`}: ${math`n \ge \frac{\sigma^{${2}}}{\varepsilon^{${2}}\delta}`}.`, plain: t`Halving the margin ${meps} costs four times as many observations.` },
      ],
    },
    checkFrom(sampleSize, { sigma: q(2), eps: q(1), delta: q(1, 20) }, t`${math`n \ge \frac{${4}}{${1} \times ${q(1, 20)}} = ${80}`}.`),
    { kind: 'pitfall', claim: t`After ten heads in a row, a tail is more likely next, because the proportion must get back to ${q(1, 2)}.`, counterexample: t`The tosses are independent: the next one is a head with probability ${q(1, 2)}, whatever came before. The law works by swamping early luck with many later tosses, not by correcting it.` },
    { kind: 'pitfall', claim: t`The weak law says that in a single long run, the average eventually stays within ${meps} of ${mmu} for ever.`, counterexample: t`It says something weaker: for each large ${math`n`} separately, a big deviation is unlikely. That a single run settles down for good is the strong law, a harder theorem.` },
    { kind: 'takeaway', text: t`The sample mean has variance ${math`\frac{\sigma^{${2}}}{n}`}, so Chebyshev bounds its chance of straying by ${math`\frac{\sigma^{${2}}}{n\varepsilon^{${2}}}`}, which tends to ${0}.` },
  ],
  examples: [
    q13,
    worked(bound, { d: 0, n: 100, eps: q(1, 2) }, t`A hundred dice`),
    worked(coins, { n: 10, c: 2 }, t`Ten tosses, exactly and by Chebyshev`),
  ],
  generators: [sampleSize, bound, coins],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['weak-law', 'convergence-in-probability'],
  claims,
  cambridge: withUses([q4, q13b, uncorrelated], {
    'ia-s3-q13-variance': { sections: ['Convergence in probability'], note: t`The weak law for the sample variance` },
    'ia-s3-q4': { sections: ['How good is the bound?'], note: t`A sample size from Chebyshev for every distribution` },
  }),
  // Best first: the weak law for the sample variance (a fourth moment), then the sample size
  // from Chebyshev. The uncorrelated version comes from the schedule, not a gate document.
  gate: ['ia-s3-q13-variance', 'ia-s3-q4'],
  recall: [
    { front: t`State the weak law of large numbers.`, back: t`For i.i.d. ${math`X_{i}`} with mean ${mmu} and finite variance, ${math`P(\lvert \bar{X}_{n} - \mu \rvert > \varepsilon) \to ${0}`} for every ${math`\varepsilon > ${0}`}.` },
    { front: t`Variance of the sample mean?`, back: t`${math`\frac{\sigma^{${2}}}{n}`}, for independent ${math`X_{i}`} with variance ${msig}.` },
    { front: t`Sample size from Chebyshev for error ${meps} with probability ${math`${1} - \delta`}?`, back: t`${math`n \ge \frac{\sigma^{${2}}}{\varepsilon^{${2}}\delta}`}.` },
  ],
  proofOrder: [
    {
      title: t`The weak law of large numbers`,
      steps: [
        t`${math`E(\bar{X}_{n}) = \mu`} by linearity.`,
        t`${math`\operatorname{Var}(\bar{X}_{n}) = \frac{\sigma^{${2}}}{n}`}, since independent variances add.`,
        t`Chebyshev: ${math`P(\lvert \bar{X}_{n} - \mu \rvert \ge \varepsilon) \le \frac{\sigma^{${2}}}{n\varepsilon^{${2}}}`}.`,
        t`The bound tends to ${0} as ${math`n \to \infty`}.`,
      ],
    },
  ],
};
