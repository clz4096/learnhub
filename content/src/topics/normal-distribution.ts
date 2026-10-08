/**
 * prob.normal-distribution: the N(μ, σ²) density, standardising to Z = (X - μ)/σ, and
 * reading probabilities from Φ. From the STEP 2 Statistics topic notes (page 3), STEP 2
 * Statistics Q4 (which gives the Gaussian integral), and IA Probability Example Sheet 4
 * Q5 (how large a normal sample makes the mean accurate, given Φ(2.58) = 0.995) and Q6
 * (the log-normal distribution). Sheet 4 has no official solutions; every value is checked
 * against Φ computed two ways (Simpson's rule and Marsaglia's series) and, for Q6, by
 * numerical integration.
 */
import { auto, cite, supervision, withUses } from '../cambridge';
import { int, pick } from '../math';
import { near, Phi, PhiInverse, PhiSeries, phi, round, simpson } from '../partv-b';
import { generator, type Misconception } from '../problem';
import { dmath, math, t } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

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
    t`Completing the square turns a normal integral with an extra exponential into a known density.`,
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
  nudge: t`Not quite. ${math`E(e^{Y})`} is not ${math`e^{E(Y)}`}; completing the square in the integral shows the extra term.`,
  hints: [
    t`How is ${math`E(X) = E(e^{Y})`} written as an integral against the ${math`N(\mu, \sigma^{${2}})`} density?`,
    t`How can the exponent ${math`y - \frac{(y - \mu)^{${2}}}{${2}\sigma^{${2}}}`} be rewritten by completing the square in ${math`y`}?`,
    t`What is left inside the integral once the constant part of the exponent is taken outside?`,
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
    t`Reuse a result: ${math`X^{${2}}`} is again log-normal, so its mean comes for free.`,
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
  nudge: t`Not quite. ${math`E(X^{${2}})`} comes from the same calculation as ${math`E(X)`}, applied to ${math`${2}Y`}.`,
  hints: [
    t`What is ${math`X^{${2}}`} in terms of ${math`Y`}?`,
    t`What is the distribution of ${math`${2}Y`}, and so what is ${math`E(X^{${2}})`} by the formula for the mean?`,
    t`What does ${math`\operatorname{Var}(X) = E(X^{${2}}) - (E X)^{${2}}`} give with the common factor taken out?`,
  ],
});

const q6b = supervision({
  id: 'ia4-q6-b',
  source: cite(SH4, 'Q6(b)'),
  title: t`Why products of many factors look log-normal`,
  prompt: t`Log-normal distributions model quantities ${mX} that arise as the product of many positive random factors, ${math`X = \xi_{${1}}\xi_{${2}}\cdots\xi_{n}`}, such as particle sizes after crushing, or stock prices. Making any reasonable assumptions you wish, justify such a model.`,
  writeUp: 'explanation',
  hints: [
    t`What is ${math`\log X`} in terms of the ${math`\log \xi_{i}`}?`,
    t`Under which assumptions on the ${math`\xi_{i}`} does the central limit theorem apply to that sum?`,
    t`If ${math`\log X`} is approximately normal, what is the distribution of ${mX}?`,
  ],
});
const q5why = supervision({
  id: 'ia4-q5-why',
  source: cite(SH4, 'Q5', true),
  title: t`Why the sample mean is normal, and why ${math`\Phi(${2.58})`}`,
  prompt: t`In Sheet ${4} Q${5}, explain why ${math`\bar{X} \sim N(\mu, \sigma^{${2}}/n)`} for a normal sample, and why the hint gives ${math`\Phi(${2.58}) = ${0.995}`} when the probability asked for is ${0.99}.`,
  writeUp: 'explanation',
  hints: [
    t`What is the distribution of a sum of independent normal variables, and how does dividing by ${math`n`} change its mean and variance?`,
    t`For a two-sided interval with probability ${0.99}, how much probability lies in each tail?`,
    t`Which value of ${math`\Phi`} leaves that much probability in the upper tail?`,
  ],
});

// ---------------------------------------------------------------- lesson

const Z196 = 1.96;
const Z258 = 2.58;
const [mmu, msig, mZ] = [math`\mu`, math`\sigma`, math`Z`];

export const normalDistribution: TopicContent = {
  topicId: 'prob.normal-distribution',
  goal: t`Use the ${math`N(\mu, \sigma^{${2}})`} density, standardise to ${math`Z = (X - \mu)/\sigma`}, and read probabilities and quantiles from ${math`\Phi`}.`,
  objective: t`Use the normal density, standardise to the standard normal, and read probabilities and quantiles.`,
  why: t`Heights, errors and averages are close to normal; next, normal approximations and the central limit theorem.`,
  minutes: 30,
  lesson: [
    { kind: 'section', title: t`One curve for every bell` },
    { kind: 'hook', text: t`Adult heights, measurement errors, and the average of many dice all pile up in the same bell shape, just shifted and stretched. That is lucky: it means a single table of areas, for one standard bell, answers every question about every one of them. The trick is a change of units.` },

    { kind: 'section', title: t`The normal density` },
    { kind: 'definition', name: t`Normal distribution`, formal: t`For real ${mmu} and ${math`\sigma > ${0}`}, ${math`X \sim N(\mu, \sigma^{${2}})`} has the [[normal-distribution|normal distribution]] if it has density ${dmath`f(x) = \frac{${1}}{\sigma\sqrt{${2}\pi}}\,e^{-(x - \mu)^{${2}}/(${2}\sigma^{${2}})}, \qquad x \in \mathbb{R}.`} ${math`N(${0}, ${1})`} is the [[standard-normal|standard normal]]; its density is written ${math`\phi(z) = \frac{${1}}{\sqrt{${2}\pi}}e^{-z^{${2}}/${2}}`}.`, plain: t`A bell centred at ${mmu}, with width set by ${msig}. The second parameter is the variance: ${math`N(${10}, ${25})`} has standard deviation ${5}, not ${25}.` },
    { kind: 'theorem', statement: t`${math`f`} is a density: ${math`\int_{-\infty}^{\infty} f(x)\,dx = ${1}`}. Moreover ${math`E(X) = \mu`} and ${math`\operatorname{Var}(X) = \sigma^{${2}}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Change units`, text: t`Substitute ${math`z = (x - \mu)/\sigma`}, so ${math`x = \mu + \sigma z`} and ${math`dx = \sigma\,dz`}:`, eq: [dmath`\int_{-\infty}^{\infty} f(x)\,dx = \int_{-\infty}^{\infty} \frac{${1}}{\sigma\sqrt{${2}\pi}}e^{-z^{${2}}/${2}}\,\sigma\,dz = \frac{${1}}{\sqrt{${2}\pi}}\int_{-\infty}^{\infty} e^{-z^{${2}}/${2}}\,dz.`], plain: t`The ${msig} from ${math`dx`} cancels the ${msig} in the constant.` },
        { label: t`The Gaussian integral`, text: t`STEP ${2} Statistics question ${4} gives ${math`\int_{${0}}^{\infty} e^{-x^{${2}}/${2}}\,dx = \sqrt{\pi/${2}}`}. The integrand is even, so over the whole line it is twice that, ${math`\sqrt{${2}\pi}`}, and the total is ${1}.`, why: { q: t`Why "even" doubles it?`, a: t`${math`e^{-x^{${2}}/${2}}`} takes the same value at ${math`x`} and ${math`-x`}, so the area left of ${0} equals the area right of ${0}.` } },
        { label: t`The mean`, text: t`${math`E(X) = \mu + \sigma E(Z)`}, where ${math`E(Z) = \int z\phi(z)\,dz = ${0}`}, because ${math`z\phi(z)`} is odd: its areas left and right of ${0} cancel.` },
        { label: t`The variance`, text: t`${math`\operatorname{Var}(X) = \sigma^{${2}}\operatorname{Var}(Z)`}, and integrating by parts, ${math`\int z^{${2}}\phi(z)\,dz = \left[-z\phi(z)\right]_{-\infty}^{\infty} + \int \phi(z)\,dz = ${0} + ${1}`}.`, why: { q: t`Which parts?`, a: t`Write ${math`z^{${2}}\phi(z) = z \cdot z\phi(z)`} and note ${math`z\phi(z) = -\phi'(z)`}. Then ${math`\int z(-\phi'(z))\,dz = [-z\phi(z)] + \int \phi(z)\,dz`}, and ${math`z\phi(z) \to ${0}`} at both ends.` } },
      ],
    },

    { kind: 'section', title: t`Standardising` },
    { kind: 'theorem', name: t`Standardising`, statement: t`If ${math`X \sim N(\mu, \sigma^{${2}})`}, then ${math`Z = \frac{X - \mu}{\sigma} \sim N(${0}, ${1})`}. Hence ${math`P(X \le x) = \Phi\left(\frac{x - \mu}{\sigma}\right)`}, where ${math`\Phi(z) = P(Z \le z)`}.` },
    { kind: 'p', text: t`Proof: ${math`P(Z \le z) = P(X \le \mu + \sigma z) = \int_{-\infty}^{\mu + \sigma z} f(x)\,dx`}, and the same substitution as before turns this into ${math`\int_{-\infty}^{z} \phi(u)\,du`}. ∎ In words: measure ${mX} in standard deviations from its mean, and you get the standard bell.` },
    { kind: 'p', text: t`${math`\Phi`} has no formula in elementary functions, so its values come from tables or a calculator: ${math`\Phi(${1}) \approx ${r4(Phi(1))}`}, ${math`\Phi(${Z196}) \approx ${r4(Phi(Z196))}`}, ${math`\Phi(${Z258}) \approx ${r4(Phi(Z258))}`}. Tables list only ${math`z \ge ${0}`}; symmetry gives the rest: ${math`\Phi(-z) = ${1} - \Phi(z)`}, and ${math`P(|Z| < z) = ${2}\Phi(z) - ${1}`}.` },
    {
      kind: 'steps',
      steps: [
        { label: t`The question`, text: t`${math`X \sim N(${50}, ${16})`}. Find ${math`P(${46} < X < ${56})`}.` },
        { label: t`Standardise`, text: t`The standard deviation is ${math`\sqrt{${16}} = ${4}`}. ${math`\frac{${46} - ${50}}{${4}} = -${1}`} and ${math`\frac{${56} - ${50}}{${4}} = ${1.5}`}, so the probability is ${math`P(-${1} < Z < ${1.5}) = \Phi(${1.5}) - \Phi(-${1})`}.` },
        { label: t`Use symmetry`, text: t`${math`\Phi(-${1}) = ${1} - \Phi(${1})`}, so the answer is ${math`\Phi(${1.5}) + \Phi(${1}) - ${1} \approx ${r4(Phi(1.5) + Phi(1) - 1)}`}.` },
      ],
    },
    checkFrom(standardise, { mu: 20, sigma: 5, ask: 'above', za: 1.2, zb: 2 }, t`${math`\frac{${26} - ${20}}{${5}} = ${1.2}`}, and ${math`P(Z > ${1.2}) = ${1} - \Phi(${1.2})`}.`),
    { kind: 'p', text: t`Going backwards: the ${math`x`} with ${math`P(X \le x) = p`} is ${math`x = \mu + z\sigma`}, where ${math`\Phi(z) = p`}. For a lower tail, ${math`p < \tfrac{${1}}{${2}}`}, the ${math`z`} is negative, found by symmetry.` },
    checkFrom(quantile, { mu: 170, sigma: 10, p: 0.9, lower: false }, t`The standardised value is about ${round(PhiInverse(0.9), 4)}, so ${math`x = ${170} + ${round(PhiInverse(0.9), 4)} \times ${10}`}.`),

    { kind: 'section', title: t`Sample means` },
    { kind: 'p', text: t`A linear function ${math`aX + b`} of a normal variable is normal (with ${math`a \ne ${0}`}), and a sum of independent normal variables is normal; you will prove both with moment generating functions. So the mean ${math`\bar{X}`} of a sample of ${math`n`} from ${math`N(\mu, \sigma^{${2}})`} is ${math`N(\mu, \sigma^{${2}}/n)`}: the bigger the sample, the narrower the bell around ${mmu}. Example Sheet ${4} question ${5}, the worked Cambridge problem below, turns this into a sample size.` },
    checkFrom(sampleSize, { c: 0.5, level: 1 }, t`${math`P(|\bar{X} - \mu| < ${0.5}\sigma) = ${2}\Phi(${0.5}\sqrt{n}) - ${1}`}, so ${math`${0.5}\sqrt{n} \ge ${1.96}`}, ${math`n \ge ${round((1.96 / 0.5) ** 2, 4)}`}.`),

    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`In ${math`N(${10}, ${25})`}, the standard deviation is ${25}.`, counterexample: t`The second parameter is the variance, so the standard deviation is ${5}. Standardising with ${25} turns ${math`P(X < ${15})`} into ${math`\Phi(${0.2})`} instead of the right ${math`\Phi(${1}) \approx ${r4(Phi(1))}`}.` },
    { kind: 'pitfall', claim: t`${math`\Phi(-z) = -\Phi(z)`}.`, counterexample: t`${math`\Phi(-${1}) \approx ${r4(Phi(-1))}`} is a probability, so it cannot be negative. The rule is ${math`\Phi(-z) = ${1} - \Phi(z)`}.` },
    { kind: 'pitfall', claim: t`To be within ${mZ} of ${0} with probability ${0.99}, use ${math`\Phi(z) = ${0.99}`}.`, counterexample: t`That leaves ${0.01} in each tail, ${0.02} in all. "Within" is two-sided: ${math`${2}\Phi(z) - ${1} = ${0.99}`} needs ${math`\Phi(z) = ${0.995}`}, so ${math`z \approx ${Z258}`}.` },
    { kind: 'takeaway', text: t`Standardise with ${math`Z = (X - \mu)/\sigma`}, using the standard deviation, then read ${math`\Phi`} and use ${math`\Phi(-z) = ${1} - \Phi(z)`}.` },
  ],
  examples: [
    { ...workedCambridge(q5), examiner: t`The examiner looks for the distribution of the sample mean stated, the two-sided probability written as ${math`${2}\Phi(\sqrt{n}) - ${1}`}, and ${math`n`} rounded up.` },
    worked(standardise, { mu: 50, sigma: 4, ask: 'between', za: -1, zb: 1.5 }, t`Between two values of ${math`N(${50}, ${16})`}`),
    worked(quantile, { mu: 100, sigma: 15, p: 0.95, lower: false }, t`The top five percent of ${math`N(${100}, ${225})`}`),
  ],
  generators: [standardise, quantile, sampleSize],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['normal-distribution', 'standard-normal'],
  cambridge: withUses([q6mean, q6var, q6b, q5why], {
    'ia4-q6-a-mean': { sections: ['The normal density'], note: t`An expectation by completing the square in the exponent` },
    'ia4-q6-a-variance': { sections: ['The normal density'], note: t`A variance by completing the square in the exponent` },
    'ia4-q5-why': { sections: ['Sample means', 'Standardising'], note: t`Why a sample mean is normal, and reading the table` },
    'ia4-q6-b': { sections: ['Sample means'], note: t`Why products of many factors look log-normal`, needs: ['lim.clt'] },
  }),
  // Sheet 4 Q6(a) first: the log-normal mean needs completing the square, which the lesson does not do for you.
  // Q6(b) needs the central limit theorem, taught later (it gates lim.clt), so it is practice here.
  gate: ['ia4-q6-a-mean', 'ia4-q6-a-variance', 'ia4-q5-why'],
  recall: [
    { front: t`The density of ${math`N(\mu, \sigma^{${2}})`}.`, back: t`${math`\frac{${1}}{\sigma\sqrt{${2}\pi}}e^{-(x - \mu)^{${2}}/(${2}\sigma^{${2}})}`}.` },
    { front: t`How do you standardise ${math`X \sim N(\mu, \sigma^{${2}})`}?`, back: t`${math`Z = (X - \mu)/\sigma \sim N(${0}, ${1})`}, so ${math`P(X \le x) = \Phi((x - \mu)/\sigma)`}.` },
    { front: t`${math`\Phi(-z)`} and ${math`P(|Z| < z)`}.`, back: t`${math`${1} - \Phi(z)`}; and ${math`${2}\Phi(z) - ${1}`}.` },
    { front: t`The distribution of the mean of ${math`n`} samples from ${math`N(\mu, \sigma^{${2}})`}.`, back: t`${math`N(\mu, \sigma^{${2}}/n)`}.` },
  ],
  proofOrder: [{
    title: t`Standardising gives the standard normal`,
    steps: [
      t`${math`P(Z \le z) = P(X \le \mu + \sigma z)`}.`,
      t`Write it as the integral of the ${math`N(\mu, \sigma^{${2}})`} density up to ${math`\mu + \sigma z`}.`,
      t`Substitute ${math`u = (x - \mu)/\sigma`}, with ${math`dx = \sigma\,du`}.`,
      t`The result is ${math`\int_{-\infty}^{z} \phi(u)\,du`}: ${mZ} is standard normal.`,
    ],
  }],
};
