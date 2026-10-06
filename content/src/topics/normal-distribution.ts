/**
 * prob.normal-distribution: the N(μ, σ²) density, standardising to Z = (X - μ)/σ, and
 * reading probabilities from Φ. From the STEP 2 Statistics topic notes (page 3), STEP 2
 * Statistics Q4 (which gives the Gaussian integral), and IA Probability Example Sheet 4
 * Q5 (how large a normal sample makes the mean accurate, given Φ(2.58) = 0.995) and Q6
 * (the log-normal distribution). Sheet 4 has no official solutions; every value is checked
 * against Φ computed two ways (Simpson's rule and Marsaglia's series) and, for Q6, by
 * numerical integration.
 */
import { auto, cite, supervision } from '../cambridge';
import { int, pick } from '../math';
import { near, Phi, PhiInverse, PhiSeries, phi, round, simpson } from '../partv-b';
import { generator, type Misconception } from '../problem';
import { math, t } from '../rich';
import { worked, workedCambridge, type TopicContent } from '../topic';

const mX = math`X`;
const SH4 = 'ia-prob-sheet-4' as const;

// ---------------------------------------------------------------- standardise and read Φ

type Ask = 'below' | 'above' | 'between';
interface StdP { mu: number; sigma: number; ask: Ask; za: number; zb: number }
const ZS: readonly number[] = [-2, -1.5, -1.2, -1, -0.8, -0.5, 0.4, 0.5, 0.8, 1, 1.2, 1.5, 2, 2.5];
const MUS: readonly number[] = [0, 10, 20, 50, 100, 170];
const SIGMAS: readonly number[] = [2, 4, 5, 8, 10, 15];
const stdValue = (p: StdP): number => (p.ask === 'below' ? Phi(p.za) : p.ask === 'above' ? 1 - Phi(p.za) : Phi(p.zb) - Phi(p.za));
const r4 = (x: number): number => round(x, 4);

const standardise = generator<StdP>({
  id: 'standardise-probability',
  skill: 'Standardise X ~ N(μ, σ²) to Z = (X - μ)/σ and read the probability from Φ, using Φ(-z) = 1 - Φ(z).',
  params: (rng) => {
    const ask = pick(rng, ['below', 'above', 'between'] as const);
    for (;;) {
      const za = pick(rng, ZS);
      const zb = pick(rng, ZS);
      if (ask !== 'between' || zb > za + 0.3) return { mu: pick(rng, MUS), sigma: pick(rng, SIGMAS), ask, za, zb };
    }
  },
  sane: (p) => (p.sigma > 0 && (p.ask !== 'between' || p.zb > p.za) ? null : 'out of range'),
  problem: (p) => {
    const a = p.mu + p.za * p.sigma;
    const b = p.mu + p.zb * p.sigma;
    const v = stdValue(p);
    const event = p.ask === 'below' ? math`P(X < ${a})` : p.ask === 'above' ? math`P(X > ${a})` : math`P(${a} < X < ${b})`;
    const zEvent = p.ask === 'below' ? math`P(Z < ${p.za}) = \Phi(${p.za})` : p.ask === 'above' ? math`P(Z > ${p.za}) = ${1} - \Phi(${p.za})` : math`P(${p.za} < Z < ${p.zb}) = \Phi(${p.zb}) - \Phi(${p.za})`;
    return {
      prompt: t`${math`X \sim N(${p.mu}, ${p.sigma * p.sigma})`}. Find ${event}, to four decimal places.`,
      answer: { kind: 'numeric', expected: r4(v), absTol: 0.0006, relTol: 0 },
      solution: [
        t`The standard deviation is ${math`\sqrt{${p.sigma * p.sigma}} = ${p.sigma}`}. Standardise: ${math`Z = \frac{X - ${p.mu}}{${p.sigma}}`}, so ${math`${a}`} becomes ${math`\frac{${a} - ${p.mu}}{${p.sigma}} = ${p.za}`}${p.ask === 'between' ? t` and ${math`${b}`} becomes ${p.zb}` : t``}.`,
        t`${zEvent} ${math`\approx ${r4(v)}`}${p.za < 0 || p.zb < 0 ? t`, using ${math`\Phi(-z) = ${1} - \Phi(z)`} for the negative values` : t``}.`,
      ],
    };
  },
  solve: (p) => {
    // Marsaglia's series for Φ, independent of the Simpson integral the problem uses.
    const v = p.ask === 'below' ? PhiSeries(p.za) : p.ask === 'above' ? 1 - PhiSeries(p.za) : PhiSeries(p.zb) - PhiSeries(p.za);
    return String(r4(v));
  },
  misconceptions: (p): Misconception[] => {
    const v = stdValue(p);
    const s2 = p.sigma * p.sigma;
    const wrongZ = (z: number): number => (z * p.sigma) / s2;
    const viaVar = p.ask === 'below' ? Phi(wrongZ(p.za)) : p.ask === 'above' ? 1 - Phi(wrongZ(p.za)) : Phi(wrongZ(p.zb)) - Phi(wrongZ(p.za));
    const out: Misconception[] = [
      { response: String(r4(viaVar)), why: t`Divide by the standard deviation ${p.sigma}, not the variance ${s2}: ${math`N(\mu, \sigma^{${2}})`} names the variance.` },
      { response: String(r4(1 - v)), why: t`That is the probability of the complementary event. Check which side of the cut-off the event is on.` },
    ];
    if (p.ask === 'between') out.push({ response: String(r4(Phi(p.zb))), why: t`${math`\Phi(${p.zb})`} is ${math`P(Z < ${p.zb})`}. Subtract ${math`\Phi(${p.za})`}, the part below the lower end.` });
    else out.push({ response: String(r4(phi(p.za))), why: t`${math`\phi(z)`}, the height of the density, is not a probability. Use the distribution function ${math`\Phi`}.` });
    return out;
  },
});

// ---------------------------------------------------------------- a quantile

interface QuantP { mu: number; sigma: number; p: number; lower: boolean }
const PS: readonly number[] = [0.9, 0.95, 0.975, 0.99, 0.995];

const quantile = generator<QuantP>({
  id: 'normal-quantile',
  skill: 'Find the x with P(X ≤ x) = p for a normal X: x = μ + zσ, with z from Φ(z) = p, and the sign from symmetry.',
  params: (rng) => ({ mu: pick(rng, MUS), sigma: pick(rng, SIGMAS), p: pick(rng, PS), lower: rng() < 0.4 }),
  sane: (p) => (p.sigma > 0 ? null : 'out of range'),
  problem: (p) => {
    const z = round(PhiInverse(p.p), 4);
    const target = p.lower ? round(1 - p.p, 3) : p.p;
    const x = p.mu + (p.lower ? -z : z) * p.sigma;
    return {
      prompt: t`${math`X \sim N(${p.mu}, ${p.sigma * p.sigma})`}. Given ${math`\Phi(${z}) = ${p.p}`}, find ${math`x`} with ${math`P(X \le x) = ${target}`}, to two decimal places.`,
      answer: { kind: 'numeric', expected: round(x, 2), absTol: 0.011, relTol: 0 },
      solution: [
        p.lower
          ? t`${math`P(Z \le -z) = ${1} - \Phi(z)`}, so ${math`P(Z \le -${z}) = ${target}`}: the standardised value is ${math`-${z}`}.`
          : t`${math`P(Z \le ${z}) = ${p.p}`}, so the standardised value is ${z}.`,
        t`Undo the standardising: ${math`x = \mu + z\sigma = ${p.mu} ${p.lower ? '-' : '+'} ${z} \times ${p.sigma} = ${round(x, 2)}`}.`,
      ],
    };
  },
  solve: (p) => {
    // Bisection on Marsaglia's Φ for the quantile itself, then rounded as the problem rounds z.
    let [lo, hi] = [-10, 10];
    const want = p.lower ? 1 - p.p : p.p;
    for (let i = 0; i < 100; i++) { const m = (lo + hi) / 2; if (PhiSeries(m) < want) lo = m; else hi = m; }
    const z = round(Math.abs(lo), 4) * Math.sign(lo);
    return String(round(p.mu + z * p.sigma, 2));
  },
  misconceptions: (p): Misconception[] => {
    const z = round(PhiInverse(p.p), 4);
    const s = p.lower ? -1 : 1;
    return [
      { response: String(round(p.mu - s * z * p.sigma, 2)), why: t`Check the side: a probability ${p.lower ? t`under` : t`over`} ${q2(0.5)} puts ${math`x`} ${p.lower ? t`below` : t`above`} the mean.` },
      { response: String(round(p.mu + s * z * p.sigma * p.sigma, 2)), why: t`Multiply ${math`z`} by the standard deviation ${p.sigma}, not by the variance.` },
      { response: String(round(s * z, 2)), why: t`${round(s * z, 4)} is the standardised value. Convert back: ${math`x = \mu + z\sigma`}.` },
    ];
  },
});
const q2 = (x: number): number => round(x, 3);

// ---------------------------------------------------------------- how large a sample (Sheet 4 Q5)

interface SizeP { c: number; level: number }
/** Two-sided level, and the z with Φ(z) = (1 + level)/2 as the sheet would give it. */
const LEVELS: readonly { level: number; z: number }[] = [{ level: 0.9, z: 1.645 }, { level: 0.95, z: 1.96 }, { level: 0.99, z: 2.58 }];
const CS: readonly number[] = [1, 0.5, 0.25, 0.2, 0.1, 0.3, 0.4];
const smallestN = (z: number, c: number): number => { let n = 1; while (Math.sqrt(n) * c < z) n++; return n; };

const sampleSize = generator<SizeP>({
  id: 'sample-size',
  skill: 'Choose n so that the sample mean is within cσ of μ with a given probability: X̄ ~ N(μ, σ²/n), so √n c must reach z.',
  params: (rng) => ({ c: pick(rng, CS), level: int(rng, 0, LEVELS.length - 1) }),
  sane: (p) => (p.c > 0 && p.level >= 0 && p.level < LEVELS.length ? null : 'out of range'),
  problem: (p) => {
    const { level, z } = LEVELS[p.level] as { level: number; z: number };
    const n = smallestN(z, p.c);
    const ratio = z / p.c;
    return {
      prompt: t`A random sample of size ${math`n`} is taken from ${math`N(\mu, \sigma^{${2}})`}. How large must ${math`n`} be for the sample mean ${math`\bar{X}`} to be within ${math`${p.c}\sigma`} of ${math`\mu`} with probability at least ${level}? Use ${math`\Phi(${z}) = ${round((1 + level) / 2, 3)}`}.`,
      answer: { kind: 'exact', expected: String(n) },
      solution: [
        t`${math`\bar{X} \sim N(\mu, \sigma^{${2}}/n)`}, so ${math`P(|\bar{X} - \mu| < ${p.c}\sigma) = P(|Z| < ${p.c}\sqrt{n}) = ${2}\Phi(${p.c}\sqrt{n}) - ${1}`}.`,
        t`This is at least ${level} when ${math`\Phi(${p.c}\sqrt{n}) \ge ${round((1 + level) / 2, 3)}`}, that is ${math`${p.c}\sqrt{n} \ge ${z}`}, or ${math`n \ge (${round(ratio, 4)})^{${2}} = ${round(ratio * ratio, 4)}`}. The smallest whole ${math`n`} is ${n}.`,
      ],
    };
  },
  solve: (p) => {
    // The smallest n where the exact two-sided probability, with Φ from the series, reaches the level, against the rounded z.
    const { z } = LEVELS[p.level] as { level: number; z: number };
    let n = 1;
    while (2 * PhiSeries(p.c * Math.sqrt(n)) - 1 < 2 * PhiSeries(z) - 1 - 1e-12) n++;
    return String(n);
  },
  misconceptions: (p): Misconception[] => {
    const { level, z } = LEVELS[p.level] as { level: number; z: number };
    const ratio = z / p.c;
    const oneSided = round(PhiInverse(level), 2) / p.c;
    return [
      { response: String(Math.ceil(ratio - 1e-12)), why: t`The condition is on ${math`\sqrt{n}`}: square ${math`${z}/${p.c}`} to get ${math`n`}.` },
      { response: String(Math.floor(ratio * ratio + 1e-12)), why: t`Round up, not down: ${math`n`} must be at least ${round(ratio * ratio, 4)}.` },
      { response: String(Math.ceil(oneSided * oneSided - 1e-12)), why: t`"Within" is two-sided: ${level} in the middle leaves ${round((1 - level) / 2, 3)} in each tail, so use ${math`\Phi(z) = ${round((1 + level) / 2, 3)}`}.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

const q5 = auto({
  id: 'ia4-q5',
  source: cite(SH4, 'Q5'),
  title: t`How large a normal sample`,
  prompt: t`How large a random sample should be taken from a normal distribution for the probability to be at least ${0.99} that the sample mean is within one standard deviation of the mean of the distribution? You may use ${math`\Phi(${2.58}) = ${0.995}`}.`,
  answer: { kind: 'exact', expected: '7' },
  solution: [
    t`For a sample of size ${math`n`} from ${math`N(\mu, \sigma^{${2}})`}, ${math`\bar{X} \sim N(\mu, \sigma^{${2}}/n)`}, so ${math`\frac{\bar{X} - \mu}{\sigma/\sqrt{n}} = Z \sim N(${0}, ${1})`}.`,
    t`${math`P(|\bar{X} - \mu| < \sigma) = P(|Z| < \sqrt{n}) = ${2}\Phi(\sqrt{n}) - ${1}`}, which is at least ${0.99} when ${math`\Phi(\sqrt{n}) \ge ${0.995}`}, that is ${math`\sqrt{n} \ge ${2.58}`}.`,
    t`So ${math`n \ge ${2.58}^{${2}} = ${round(2.58 * 2.58, 4)}`}, and the smallest sample is ${7}: with ${math`n = ${6}`} the probability is only ${r4(2 * Phi(Math.sqrt(6)) - 1)}, with ${math`n = ${7}`} it is ${r4(2 * Phi(Math.sqrt(7)) - 1)}.`,
  ],
  reference: '7',
  verify: () => {
    // With the exact Φ, n = 6 falls short of 0.99 and n = 7 reaches it, so the rounded hint does not change the answer.
    const pr = (n: number): number => 2 * PhiSeries(Math.sqrt(n)) - 1;
    if (!(pr(6) < 0.99 && pr(7) >= 0.99)) return `exact probabilities ${pr(6)}, ${pr(7)} do not bracket 0.99`;
    return near('the hint Φ(2.58) against the series', PhiSeries(2.58), 0.995, 0.0001) ?? near('Φ two ways', Phi(2.58), PhiSeries(2.58), 1e-12);
  },
  misconceptions: [
    { response: '3', why: t`${2.58} bounds ${math`\sqrt{n}`}, not ${math`n`}: square it.` },
    { response: '6', why: t`${math`n \ge ${round(2.58 * 2.58, 4)}`}, so round up to ${7}: with ${6} the probability is ${r4(2 * Phi(Math.sqrt(6)) - 1)}, below ${0.99}.` },
  ],
});

const logNormalMean = (mu: number, sigma: number): number =>
  simpson((y) => Math.exp(y) * phi((y - mu) / sigma) / sigma, mu - 12 * sigma, mu + 12 * sigma, 20000);
const logNormalSecond = (mu: number, sigma: number): number =>
  simpson((y) => Math.exp(2 * y) * phi((y - mu) / sigma) / sigma, mu - 14 * sigma, mu + 14 * sigma, 20000);

const q6mean = auto({
  id: 'ia4-q6-a-mean',
  source: cite(SH4, 'Q6(a)'),
  title: t`The mean of a log-normal variable`,
  prompt: t`${mX} is log-normal: ${math`Y = \log X \sim N(\mu, \sigma^{${2}})`}. Find ${math`E(X)`}. (Type ${math`\mu`} as mu and ${math`\sigma`} as sigma.)`,
  answer: { kind: 'expression', expected: 'e^(mu + sigma^2/2)', variables: ['mu', 'sigma'], domains: { mu: { kind: 'real', min: -2, max: 2 }, sigma: { kind: 'real', min: 0.2, max: 2 } } },
  solution: [
    t`${math`E(X) = E(e^{Y}) = \int_{-\infty}^{\infty} e^{y}\,\frac{${1}}{\sigma\sqrt{${2}\pi}}e^{-(y - \mu)^{${2}}/(${2}\sigma^{${2}})}\,dy`}.`,
    t`Complete the square: ${math`y - \frac{(y - \mu)^{${2}}}{${2}\sigma^{${2}}} = \mu + \frac{\sigma^{${2}}}{${2}} - \frac{(y - \mu - \sigma^{${2}})^{${2}}}{${2}\sigma^{${2}}}`}. What is left is the ${math`N(\mu + \sigma^{${2}}, \sigma^{${2}})`} density, which integrates to ${1}.`,
    t`So ${math`E(X) = e^{\mu + \sigma^{${2}}/${2}}`}: larger than ${math`e^{\mu}`}, the median of ${mX}.`,
  ],
  reference: 'e^(mu + sigma^2/2)',
  verify: () => {
    for (const [mu, sigma] of [[0, 1], [1, 0.5], [-0.5, 1.5]] as const) {
      const r = near(`E(e^Y) by numerical integration, μ = ${mu}, σ = ${sigma}`, logNormalMean(mu, sigma), Math.exp(mu + (sigma * sigma) / 2), 1e-8 * Math.exp(mu + sigma * sigma));
      if (r !== null) return r;
    }
    return null;
  },
  misconceptions: [
    { response: 'e^mu', why: t`${math`e^{\mu}`} is ${math`e`} to the mean of ${math`Y`}, the median of ${mX}. ${math`E(e^{Y}) \ne e^{E(Y)}`}: completing the square adds ${math`\sigma^{${2}}/${2}`}.` },
    { response: 'e^(mu + sigma^2)', why: t`Completing the square leaves ${math`\mu + \sigma^{${2}}/${2}`} in the exponent, half of ${math`\sigma^{${2}}`}.` },
  ],
});

const q6var = auto({
  id: 'ia4-q6-a-variance',
  source: cite(SH4, 'Q6(a)'),
  title: t`The variance of a log-normal variable`,
  prompt: t`${mX} is log-normal with ${math`\log X \sim N(\mu, \sigma^{${2}})`}. Find ${math`\operatorname{Var}(X)`}. (Type ${math`\mu`} as mu and ${math`\sigma`} as sigma.)`,
  answer: { kind: 'expression', expected: 'e^(2mu + sigma^2)(e^(sigma^2) - 1)', variables: ['mu', 'sigma'], domains: { mu: { kind: 'real', min: -2, max: 2 }, sigma: { kind: 'real', min: 0.2, max: 1.5 } } },
  solution: [
    t`${math`X^{${2}} = e^{${2}Y}`} and ${math`${2}Y \sim N(${2}\mu, ${4}\sigma^{${2}})`}, so by the mean just found, ${math`E(X^{${2}}) = e^{${2}\mu + ${2}\sigma^{${2}}}`}.`,
    t`${math`\operatorname{Var}(X) = e^{${2}\mu + ${2}\sigma^{${2}}} - \left(e^{\mu + \sigma^{${2}}/${2}}\right)^{${2}} = e^{${2}\mu + \sigma^{${2}}}\left(e^{\sigma^{${2}}} - ${1}\right)`}.`,
  ],
  reference: 'e^(2mu + sigma^2)(e^(sigma^2) - 1)',
  verify: () => {
    for (const [mu, sigma] of [[0, 1], [1, 0.5], [-0.5, 1.2]] as const) {
      const v = logNormalSecond(mu, sigma) - logNormalMean(mu, sigma) ** 2;
      const want = Math.exp(2 * mu + sigma * sigma) * (Math.exp(sigma * sigma) - 1);
      const r = near(`Var(e^Y) by numerical integration, μ = ${mu}, σ = ${sigma}`, v, want, 1e-7 * Math.exp(2 * mu + 2 * sigma * sigma));
      if (r !== null) return r;
    }
    return null;
  },
  misconceptions: [
    { response: 'e^(2mu + 2sigma^2)', why: t`That is ${math`E(X^{${2}})`}. Subtract ${math`(E X)^{${2}} = e^{${2}\mu + \sigma^{${2}}}`}.` },
    { response: 'e^(2mu)(e^(sigma^2) - 1)', why: t`${math`(E X)^{${2}} = e^{${2}\mu + \sigma^{${2}}}`}: the factor outside the bracket keeps ${math`\sigma^{${2}}`}.` },
  ],
});

const q6b = supervision({
  id: 'ia4-q6-b',
  source: cite(SH4, 'Q6(b)'),
  title: t`Why products of many factors look log-normal`,
  prompt: t`Log-normal distributions model quantities ${mX} that arise as the product of many positive random factors, ${math`X = \xi_{${1}}\xi_{${2}}\cdots\xi_{n}`}, such as particle sizes after crushing, or stock prices. Making any reasonable assumptions you wish, justify such a model.`,
  writeUp: 'explanation',
});
const q5why = supervision({
  id: 'ia4-q5-why',
  source: cite(SH4, 'Q5', true),
  title: t`Why the sample mean is normal, and why ${math`\Phi(${2.58})`}`,
  prompt: t`In Sheet ${4} Q${5}, explain why ${math`\bar{X} \sim N(\mu, \sigma^{${2}}/n)`} for a normal sample, and why the hint gives ${math`\Phi(${2.58}) = ${0.995}`} when the probability asked for is ${0.99}.`,
  writeUp: 'explanation',
});

// ---------------------------------------------------------------- lesson

const Z196 = 1.96;
const Z258 = 2.58;

export const normalDistribution: TopicContent = {
  topicId: 'prob.normal-distribution',
  goal: t`Use the ${math`N(\mu, \sigma^{${2}})`} density, standardise to ${math`Z = (X - \mu)/\sigma`}, and read probabilities and quantiles from ${math`\Phi`}.`,
  lesson: [
    { kind: 'rule', text: t`${math`X \sim N(\mu, \sigma^{${2}})`}, the [[normal-distribution|normal distribution]], has density ${math`f(x) = \frac{${1}}{\sigma\sqrt{${2}\pi}}\,e^{-(x - \mu)^{${2}}/(${2}\sigma^{${2}})}`}, with mean ${math`\mu`} and variance ${math`\sigma^{${2}}`}.` },
    { kind: 'p', text: t`The curve is a bell, symmetric about ${math`\mu`}, so the mean, median, and mode are all ${math`\mu`}; ${math`\sigma`} sets its width. That the area is ${1} rests on the Gaussian integral ${math`\int_{-\infty}^{\infty} e^{-x^{${2}}/${2}}\,dx = \sqrt{${2}\pi}`}, which STEP ${2} Q${4} gives as ${math`\int_{${0}}^{\infty} e^{-x^{${2}}/${2}}\,dx = \sqrt{\pi/${2}}`}. Note that ${math`N(\mu, \sigma^{${2}})`} names the variance: ${math`N(${10}, ${25})`} has standard deviation ${5}.` },
    { kind: 'rule', text: t`Standardise: if ${math`X \sim N(\mu, \sigma^{${2}})`} then ${math`Z = \frac{X - \mu}{\sigma} \sim N(${0}, ${1})`}, the [[standard-normal|standard normal]], and ${math`P(X \le x) = \Phi\left(\frac{x - \mu}{\sigma}\right)`}, where ${math`\Phi(z) = P(Z \le z)`}.` },
    { kind: 'p', text: t`${math`\Phi`} has no formula in elementary functions, so its values come from tables or a calculator: ${math`\Phi(${1}) \approx ${r4(Phi(1))}`}, ${math`\Phi(${Z196}) \approx ${r4(Phi(Z196))}`}, ${math`\Phi(${Z258}) \approx ${r4(Phi(Z258))}`}. Symmetry gives the rest: ${math`\Phi(-z) = ${1} - \Phi(z)`}, and ${math`P(|Z| < z) = ${2}\Phi(z) - ${1}`}. So a normal variable is within one standard deviation of its mean with probability about ${r4(2 * Phi(1) - 1)}, and within ${Z196} with probability about ${r4(2 * Phi(Z196) - 1)}.` },
    { kind: 'p', text: t`Going backwards, a quantile is ${math`x = \mu + z\sigma`} where ${math`\Phi(z)`} is the probability wanted. A linear function ${math`aX + b`} of a normal variable is normal, and so is a sum of independent normal variables; in particular the mean of a sample of ${math`n`} from ${math`N(\mu, \sigma^{${2}})`} is ${math`N(\mu, \sigma^{${2}}/n)`}. That is the fact Sheet ${4} Q${5} turns into a sample size.` },
    { kind: 'p', text: t`If ${math`\log X`} is normal, ${mX} is log-normal (Sheet ${4} Q${6}). Its mean is not ${math`e^{\mu}`}: completing the square in ${math`E(e^{Y})`} gives ${math`e^{\mu + \sigma^{${2}}/${2}}`}, a first sight of the moment generating function ${math`E(e^{tY}) = e^{\mu t + \sigma^{${2}}t^{${2}}/${2}}`}.` },
  ],
  examples: [
    workedCambridge(q5),
    worked(standardise, { mu: 50, sigma: 4, ask: 'between', za: -1, zb: 1.5 }, t`Between two values of ${math`N(${50}, ${16})`}`),
    worked(quantile, { mu: 100, sigma: 15, p: 0.95, lower: false }, t`The top five percent of ${math`N(${100}, ${225})`}`),
  ],
  generators: [standardise, quantile, sampleSize],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['normal-distribution', 'standard-normal'],
  cambridge: [q6mean, q6var, q6b, q5why],
  gate: ['ia4-q6-a-mean', 'ia4-q6-a-variance', 'ia4-q6-b', 'ia4-q5-why'],
};
