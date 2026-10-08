/**
 * lim.clt: the central limit theorem, (S_n - n mu)/(sigma sqrt(n)) tends in distribution to
 * N(0, 1), its proof sketched with moment generating functions, and its use for sums and
 * for sample sizes. From the Faculty schedule ("Statement of central limit theorem and
 * sketch of proof. Examples, including sampling.") and IA Probability Example Sheet 4: Q11
 * (a sample size for a proportion), Q13 (e^(-n) times the sum of n^k/k! up to n tends to
 * 1/2), Q6(b) (why products of many factors are log-normal), and Q5 (a sample size for a
 * normal mean, with the hint Phi(2.58) = 0.995). The sheet has no official solutions. Q11's
 * answer depends on the quantile: 1041 with the sheet's own 2.58, 1037 with 2.5758; the
 * prompt fixes 2.58.
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { div, int, mul, pick, q, str, toFloat, type Rational } from '../math';
import { dp, lnFact, Phi, PhiSimpson, poissonCdf } from '../partv-d';
import { generator, type Misconception } from '../problem';
import { dmath, listOf, math, t, type Rich } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

const [mS, mPhi] = [math`S_{n}`, math`\Phi`];
const SH4 = 'ia-prob-sheet-4' as const;
const SCHEDULE = cite('tripos-schedules', 'IA Probability, Inequalities and limits: "Statement of central limit theorem and sketch of proof. Examples, including sampling."', true);
/** The least integer n >= r, for a positive rational r. */
const ceilQ = (r: Rational): number => Number((r.num + r.den - 1n) / r.den);

// ---------------------------------------------------------------- a sum, approximately normal

interface Dist { name: Rich; mean: Rational; variance: Rational; values: number[] }
const DISTS: readonly Dist[] = [
  { name: t`throws of a fair die`, mean: q(7, 2), variance: q(35, 12), values: [1, 2, 3, 4, 5, 6] },
  { name: t`draws from ${math`\{${1}, ${2}, ${3}, ${4}\}`}, each equally likely`, mean: q(5, 2), variance: q(5, 4), values: [1, 2, 3, 4] },
  { name: t`tosses of a fair coin, scoring ${1} for a head and ${0} for a tail`, mean: q(1, 2), variance: q(1, 4), values: [0, 1] },
  { name: t`draws from ${math`\{${0}, ${1}, ${2}\}`}, each equally likely`, mean: q(1), variance: q(2, 3), values: [0, 1, 2] },
];
interface SumP { d: number; n: number; off: number; dir: 'most' | 'least' }
function sumParts({ d, n, off, dir }: SumP): { s: number; z: number; zNoCc: number; zVar: number; zNoRoot: number; mu: number; sd: number } {
  const D = DISTS[d] as Dist;
  const mu = n * toFloat(D.mean);
  const sd = Math.sqrt(n * toFloat(D.variance));
  const s = Math.round(mu) + off;
  const edge = dir === 'most' ? s + 0.5 : s - 0.5;
  return { s, z: (edge - mu) / sd, zNoCc: (s - mu) / sd, zVar: (edge - mu) / (sd * sd), zNoRoot: (edge - mu) / Math.sqrt(toFloat(D.variance)), mu, sd };
}
const sumVal = (p: SumP, phi: (z: number) => number = Phi): number => { const { z } = sumParts(p); return p.dir === 'most' ? phi(z) : 1 - phi(z); };
const sumMis = (p: SumP): number[] => {
  const x = sumParts(p);
  const f = (z: number): number => (p.dir === 'most' ? Phi(z) : 1 - Phi(z));
  return [f(x.zNoCc), f(x.zVar), f(x.zNoRoot)];
};

const sumApprox = generator<SumP>({
  id: 'sum',
  skill: 'Approximate a probability for a sum of many independent variables by the normal, with a continuity correction.',
  params: (rng) => {
    for (;;) {
      const p: SumP = { d: int(rng, 0, DISTS.length - 1), n: pick(rng, [30, 40, 48, 50, 60, 80, 100]), off: int(rng, -12, 12), dir: pick(rng, ['most', 'least'] as const) };
      const v = sumVal(p);
      if (v > 0.02 && v < 0.98 && sumMis(p).filter((m) => Math.abs(m - dp(v, 3)) > 0.004).length >= 2) return p;
    }
  },
  sane: ({ d, n }) => (d < DISTS.length && n >= 30 ? null : 'out of range'),
  problem: (p) => {
    const D = DISTS[p.d] as Dist;
    const x = sumParts(p);
    const edge = p.dir === 'most' ? x.s + 0.5 : x.s - 0.5;
    return {
      prompt: t`${mS} is the total of ${p.n} independent ${D.name}. Use the central limit theorem, with a continuity correction, to estimate the probability that ${mS} is at ${p.dir} ${x.s}, to three decimal places.`,
      answer: { kind: 'numeric', expected: dp(sumVal(p), 3), absTol: 0.0015, relTol: 0 },
      solution: [
        t`Each term has mean ${D.mean} and variance ${D.variance}, so ${math`E(S_{n}) = ${p.n} \times ${D.mean} = ${x.mu}`} and ${math`\operatorname{Var}(S_{n}) = ${p.n} \times ${D.variance} = ${mul(q(p.n), D.variance)}`}, a standard deviation of about ${Number(x.sd.toPrecision(5))}.`,
        t`${mS} takes whole values, so "at ${p.dir} ${x.s}" becomes ${p.dir === 'most' ? math`S_{n} \le ${edge}` : math`S_{n} \ge ${edge}`} for the normal. Standardise: ${math`z = \frac{${edge} - ${x.mu}}{${Number(x.sd.toPrecision(5))}} \approx ${Number(x.z.toFixed(4))}`}.`,
        t`${p.dir === 'most' ? math`\Phi(${Number(x.z.toFixed(4))})` : math`${1} - \Phi(${Number(x.z.toFixed(4))})`} is about ${dp(sumVal(p), 3)}.`,
      ],
    };
  },
  // The normal distribution function by Simpson's rule instead of the series.
  solve: (p) => String(dp(sumVal(p, PhiSimpson), 3)),
  misconceptions: (p): Misconception[] => {
    const [noCc, byVar, noRoot] = sumMis(p) as [number, number, number];
    return [
      { response: String(dp(noCc, 3)), why: t`${mS} is a whole number, so use the continuity correction: the edge of the event is half a unit beyond ${sumParts(p).s}.` },
      { response: String(dp(byVar, 3)), why: t`Divide by the standard deviation ${math`\sigma\sqrt{n}`}, not by the variance.` },
      { response: String(dp(noRoot, 3)), why: t`The standard deviation of a sum of ${p.n} terms is ${math`\sigma\sqrt{${p.n}}`}, not ${math`\sigma`}.` },
    ];
  },
});

// ---------------------------------------------------------------- a sample size for a proportion

const ZS: readonly { conf: number; z: Rational }[] = [{ conf: 90, z: q(1645, 1000) }, { conf: 95, z: q(196, 100) }, { conf: 99, z: q(258, 100) }];
const EPS = [q(1, 100), q(2, 100), q(3, 100), q(4, 100), q(5, 100), q(1, 10)];
interface SizeP { e: number; c: number }
const sizeOf = ({ e, c }: SizeP, scale: Rational = q(1, 2)): Rational => {
  const r = div(mul((ZS[c] as { z: Rational }).z, scale), EPS[e] as Rational);
  return mul(r, r);
};
const sizeVal = (p: SizeP): number => ceilQ(sizeOf(p));
const sizeMis = (p: SizeP): number[] => [ceilQ(sizeOf(p, q(1))), ceilQ(div(mul((ZS[p.c] as { z: Rational }).z, q(1, 2)), EPS[p.e] as Rational)), Math.floor(toFloat(sizeOf(p)))];

const sampleSize = generator<SizeP>({
  id: 'sample-size',
  skill: 'Size a sample for a proportion: P(|p-hat - p| < epsilon) >= confidence needs n >= (z / (2 epsilon))^2, as p(1 - p) <= 1/4.',
  params: (rng) => {
    for (;;) {
      const p: SizeP = { e: int(rng, 0, EPS.length - 1), c: int(rng, 0, ZS.length - 1) };
      const right = sizeVal(p);
      if (new Set(sizeMis(p).filter((m) => m !== right)).size >= 2) return p;
    }
  },
  sane: ({ e, c }) => (e < EPS.length && c < ZS.length ? null : 'out of range'),
  problem: (p) => {
    const { conf, z } = ZS[p.c] as { conf: number; z: Rational };
    const eps = EPS[p.e] as Rational;
    return {
      prompt: t`A random sample of size ${math`n`} estimates the proportion ${math`p`} of a population that holds an opinion, by the sample proportion ${math`\hat{p}`}. Guided by the central limit theorem, find the smallest ${math`n`} that makes ${math`P(|\hat{p} - p| < ${toFloat(eps)}) \ge ${conf / 100}`} whatever ${math`p`} is. Take ${math`\Phi(${toFloat(z)}) = ${(1 + conf / 100) / 2}`}.`,
      answer: { kind: 'exact', expected: String(sizeVal(p)) },
      solution: [
        t`${math`\hat{p}`} is a mean of ${math`n`} independent indicators, with variance ${math`p(${1} - p)/n \le \frac{${1}}{${4}n}`}. By the central limit theorem, ${math`P(|\hat{p} - p| < \varepsilon) \approx ${2}\Phi\left(\frac{\varepsilon\sqrt{n}}{\sqrt{p(${1} - p)}}\right) - ${1} \ge ${2}\Phi(${2}\varepsilon\sqrt{n}) - ${1}`}.`,
        t`That is at least ${conf / 100} when ${math`${2}\varepsilon\sqrt{n} \ge ${toFloat(z)}`}, that is ${math`n \ge \left(\frac{${toFloat(z)}}{${2} \times ${toFloat(eps)}}\right)^{${2}} = ${Number(toFloat(sizeOf(p)).toFixed(4))}`}. The smallest such ${math`n`} is ${sizeVal(p)}.`,
      ],
    };
  },
  solve: (p) => {
    // A floating-point estimate of the first n with 2 epsilon sqrt(n) >= z, then the exact test on squares at n and n - 1.
    const { z } = ZS[p.c] as { z: Rational };
    const eps = EPS[p.e] as Rational;
    const rhs = mul(z, z);
    const works = (n: number): boolean => { const lhs = mul(q(4 * n), mul(eps, eps)); return lhs.num * rhs.den >= rhs.num * lhs.den; };
    let n = Math.max(1, Math.ceil((toFloat(z) / (2 * toFloat(eps))) ** 2) - 2);
    while (!works(n)) n++;
    while (n > 1 && works(n - 1)) n--;
    return String(n);
  },
  misconceptions: (p): Misconception[] => {
    const [noQuarter, noSquare, floor] = sizeMis(p) as [number, number, number];
    return [
      { response: String(noQuarter), why: t`That takes the standard deviation of one indicator as ${1}. It is ${math`\sqrt{p(${1} - p)} \le \tfrac{${1}}{${2}}`}, which halves the ratio inside the square.` },
      { response: String(noSquare), why: t`${math`\sqrt{n}`} must reach ${math`z/(${2}\varepsilon)`}: square it to get ${math`n`}.` },
      { response: String(floor), why: t`Rounding down falls just short of the target. Round ${math`(z/(${2}\varepsilon))^{${2}}`} up.` },
    ];
  },
});

// ---------------------------------------------------------------- standardising a sample mean

interface StdP { mu: number; sigma: number; n: number; off: Rational }
const stdVal = ({ sigma, n, off }: StdP): Rational => div(mul(off, q(Math.sqrt(n))), q(sigma));
const stdMis = ({ sigma, n, off }: StdP): Rational[] => [div(off, q(sigma)), div(mul(off, q(n)), q(sigma)), div(mul(off, q(Math.sqrt(n))), q(sigma * sigma))];

const standardise = generator<StdP>({
  id: 'standardise',
  skill: 'Standardise a sample mean: z = (a - mu) sqrt(n) / sigma.',
  params: (rng) => {
    for (;;) {
      const p: StdP = { mu: int(rng, 10, 80), sigma: int(rng, 2, 12), n: pick(rng, [16, 25, 36, 49, 64, 100, 144]), off: pick(rng, [q(1, 2), q(1), q(3, 2), q(2), q(5, 2), q(3), q(-1), q(-2), q(-1, 2)]) };
      const right = str(stdVal(p));
      if (new Set(stdMis(p).map(str).filter((m) => m !== right)).size >= 2) return p;
    }
  },
  sane: ({ n, sigma }) => (Number.isInteger(Math.sqrt(n)) && sigma > 0 ? null : 'out of range'),
  problem: (p) => {
    const a = q(p.mu * Number(p.off.den) + Number(p.off.num), Number(p.off.den));
    return {
      prompt: t`${math`\bar{X}`} is the mean of ${p.n} independent observations from a distribution with mean ${p.mu} and standard deviation ${p.sigma}. By the central limit theorem, ${math`P(\bar{X} \le ${a}) \approx \Phi(z)`}. Find ${math`z`}.`,
      answer: { kind: 'exact', expected: str(stdVal(p)) },
      solution: [
        t`${math`\bar{X}`} has mean ${p.mu} and standard deviation ${math`\sigma/\sqrt{n} = ${p.sigma}/\sqrt{${p.n}} = ${q(p.sigma, Math.sqrt(p.n))}`}.`,
        t`${math`z = \frac{${a} - ${p.mu}}{${q(p.sigma, Math.sqrt(p.n))}} = ${stdVal(p)}`}.`,
      ],
    };
  },
  solve: ({ mu, sigma, n, off }) => {
    // Through the sum: S = n X-bar has mean n mu and standard deviation sigma sqrt(n).
    const a = mu + toFloat(off);
    const z = (n * a - n * mu) / (sigma * Math.sqrt(n));
    for (let den = 1; den <= 48; den++) { const num = Math.round(z * den); if (Math.abs(num / den - z) < 1e-9) return str(q(num, den)); }
    return String(z);
  },
  misconceptions: (p): Misconception[] => {
    const [noRoot, timesN, byVar] = stdMis(p) as [Rational, Rational, Rational];
    return [
      { response: str(noRoot), why: t`That standardises one observation. The mean of ${p.n} has standard deviation ${math`\sigma/\sqrt{${p.n}}`}.` },
      { response: str(timesN), why: t`The standard deviation of the mean is ${math`\sigma/\sqrt{n}`}, not ${math`\sigma/n`}.` },
      { response: str(byVar), why: t`Divide by the standard deviation, ${math`\sigma/\sqrt{n}`}, not by ${math`\sigma^{${2}}/\sqrt{n}`}.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

const Z258 = q(258, 100);
const q11 = auto({
  id: 'ia-s4-q11',
  source: cite(SH4, 'Q11'),
  title: t`How many voters to sample`,
  prompt: t`A random sample is taken in order to find the proportion of Labour voters in a population. Guided by the central limit theorem, determine the smallest sample size such that the probability of a sampling error less than ${0.04} will be ${0.99} or greater, whatever the proportion. Use ${math`\Phi(${2.58}) = ${0.995}`}, as in Q${5}.`,
  answer: { kind: 'exact', expected: '1041' },
  solution: [
    t`The sample proportion ${math`\hat{p}`} has mean ${math`p`} and variance ${math`p(${1} - p)/n \le ${1}/(${4}n)`}. By the central limit theorem, ${math`P(|\hat{p} - p| < ${0.04}) \approx ${2}\Phi\left(${0.04}\sqrt{n}/\sqrt{p(${1} - p)}\right) - ${1}`}, smallest when ${math`p = \tfrac{${1}}{${2}}`}.`,
    t`We need ${math`${2}\Phi(${0.08}\sqrt{n}) - ${1} \ge ${0.99}`}, that is ${math`\Phi(${0.08}\sqrt{n}) \ge ${0.995}`}, so ${math`${0.08}\sqrt{n} \ge ${2.58}`} and ${math`n \ge ${32.25}^{${2}} \approx ${1040.0625}`}.`,
    t`The smallest sample is ${1041}. With the more precise quantile ${2.5758} it would be ${1037}: the answer depends on the value of ${mPhi} used.`,
  ],
  reference: '1041',
  verify: () => {
    const need = mul(div(Z258, q(8, 100)), div(Z258, q(8, 100)));
    const e = same('(2.58 / 0.08)^2', str(need), '16641/16');
    if (e !== null) return e;
    const fine = (z: number): number => Math.ceil((z / 0.08) ** 2);
    return same('n with 2.58', ceilQ(need), 1041) ?? same('n with 2.5758', fine(2.5758), 1037);
  },
  misconceptions: [
    { response: '1040', why: t`${math`n \ge ${32.25}^{${2}}`}, more than ${1040}: ${1040} falls just short. Round up.` },
    { response: '4161', why: t`The worst case is ${math`p(${1} - p) = \tfrac{${1}}{${4}}`}, a standard deviation of ${math`\tfrac{${1}}{${2}}`} per voter, not ${1}.` },
    { response: '33', why: t`${math`\sqrt{n} \ge ${32.25}`}: square it.` },
  ],
});

const q5 = auto({
  id: 'ia-s4-q5',
  source: cite(SH4, 'Q5'),
  title: t`Within one standard deviation`,
  prompt: t`How large a random sample should be taken from a normal distribution in order for the probability to be at least ${0.99} that the sample mean will be within one standard deviation of the mean of the distribution? Use ${math`\Phi(${2.58}) = ${0.995}`}.`,
  answer: { kind: 'exact', expected: '7' },
  hints: [
    t`What is the distribution of the mean of ${math`n`} draws from ${math`N(\mu, \sigma^{${2}})`}?`,
    t`Written with ${mPhi}, what is ${math`P(|\bar{X} - \mu| < \sigma)`}?`,
    t`Which inequality for ${math`\sqrt{n}`} does ${math`\Phi(${2.58}) = ${0.995}`} give, and how must ${math`n`} be rounded?`,
  ],
  nudge: t`Not quite. Solve for ${math`\sqrt{n}`}, square before rounding, and round up.`,
  solution: [
    t`The sample mean of ${math`n`} draws from ${math`N(\mu, \sigma^{${2}})`} is exactly ${math`N(\mu, \sigma^{${2}}/n)`}, so ${math`P(|\bar{X} - \mu| < \sigma) = ${2}\Phi(\sqrt{n}) - ${1}`}.`,
    t`The condition is ${math`\Phi(\sqrt{n}) \ge ${0.995}`}, so ${math`\sqrt{n} \ge ${2.58}`} and ${math`n \ge ${6.6564}`}: a sample of ${7}. For a distribution that is not normal, the central limit theorem says the same holds approximately for large ${math`n`}.`,
    t`Solve for ${math`n`} exactly, then round up.`,
  ],
  reference: '7',
  verify: () => {
    const p = (n: number): number => 2 * Phi(Math.sqrt(n)) - 1;
    return p(7) >= 0.99 && p(6) < 0.99 ? same('2.58 squared', str(mul(Z258, Z258)), '16641/2500') : `P at 6 is ${p(6)}, at 7 is ${p(7)}`;
  },
  misconceptions: [
    { response: '3', why: t`${math`\sqrt{n} \ge ${2.58}`}: square ${2.58} before rounding up, ${math`n \ge ${6.6564}`}.` },
    { response: '6', why: t`${math`n \ge ${6.6564}`}, so ${6} falls short: round up.` },
  ],
});

const N13 = 100;
const q13value = auto({
  id: 'ia-s4-q13-value',
  source: cite(SH4, 'Q13', true),
  title: t`The Poisson sum at ${math`n = ${N13}`}`,
  prompt: t`Q${13} says ${math`e^{-n}\left(${1} + \frac{n}{${1}!} + \frac{n^{${2}}}{${2}!} + \cdots + \frac{n^{n}}{n!}\right) \to \frac{${1}}{${2}}`}. Evaluate the left side for ${math`n = ${N13}`}, to three decimal places.`,
  answer: { kind: 'numeric', expected: dp(poissonCdf(N13, N13), 3), absTol: 0.0015, relTol: 0 },
  hints: [
    t`Why is ${math`\frac{n^{n}}{n!}`} awkward to compute directly, and how does each term compare with the one before?`,
    t`Starting from ${math`e^{-n}`}, which recurrence gives each next term?`,
    t`Summing all ${N13 + 1} terms that way, what is the total to three places?`,
  ],
  nudge: t`Not quite. Evaluate the sum itself, term by term with a recurrence, rather than its limit.`,
  solution: [
    t`Let ${math`t_{${0}} = e^{-n}`} and ${math`t_{k} = t_{k - ${1}} \cdot \frac{n}{k}`}, so ${math`t_{k} = e^{-n}\frac{n^{k}}{k!}`} without forming ${math`${N13}^{${N13}}`}.`,
    t`Summing ${math`t_{${0}}, \ldots, t_{${N13}}`} gives about ${dp(poissonCdf(N13, N13), 4)}: still above the limit ${q(1, 2)}, which is approached slowly.`,
    t`Compute a long sum by a term recurrence, not by huge powers.`,
  ],
  reference: String(dp(poissonCdf(N13, N13), 3)),
  verify: () => {
    // The terms by the recurrence n^k/k! = (n^(k-1)/(k-1)!) n/k, scaled to avoid overflow, against the logarithmic sum.
    let term = Math.exp(-N13);
    let s = term;
    for (let k = 1; k <= N13; k++) { term = (term * N13) / k; s += term; }
    const viaLogs = Array.from({ length: N13 + 1 }, (_, k) => Math.exp(-N13 + k * Math.log(N13) - lnFact(k))).reduce((a, b) => a + b, 0);
    return same('recurrence against logarithms, to 3 places', s.toFixed(3), viaLogs.toFixed(3)) ?? same('the value', s.toFixed(3), '0.527');
  },
  misconceptions: [{ response: '0.5', why: t`${q(1, 2)} is the limit. At ${math`n = ${N13}`} the value is still noticeably above it.` }],
});

const q13proof = supervision({
  id: 'ia-s4-q13',
  source: cite(SH4, 'Q13'),
  title: t`A Poisson sum tends to a half`,
  prompt: t`Show that, as ${math`n \to \infty`}, ${math`e^{-n}\left(${1} + \frac{n}{${1}!} + \frac{n^{${2}}}{${2}!} + \cdots + \frac{n^{n}}{n!}\right) \to \frac{${1}}{${2}}`}.`,
  hints: [
    t`Which random variable ${math`Y`} has ${math`P(Y \le n)`} equal to the left side?`,
    t`How can that variable be written as a sum of ${math`n`} independent, identically distributed variables?`,
    t`What does the central limit theorem say about ${math`P\left(\frac{Y - n}{\sqrt{n}} \le ${0}\right)`}?`,
  ],
  writeUp: 'proof',
});

const q6b = supervision({
  id: 'ia-s4-q6-b',
  source: cite(SH4, 'Q6(b)'),
  title: t`Why products are log-normal`,
  prompt: t`Log-normal distributions are used to model quantities ${math`X`} which are believed to arise as the product of many positive random factors ${math`X = \xi_{${1}}\xi_{${2}}\cdots\xi_{n}`}, such as particle sizes after a crushing process or stock prices. Making any reasonable assumptions you wish, give a justification for such a model.`,
  hints: [
    t`What do logarithms do to the product?`,
    t`Which theorem applies to a sum of many independent, identically distributed terms, and what does it need of them?`,
    t`If ${math`\log X`} is approximately normal, what is the distribution of ${math`X`}?`,
  ],
  writeUp: 'explanation',
});

const sketch = supervision({
  id: 'schedule-clt',
  source: SCHEDULE,
  title: t`A sketch of the proof`,
  prompt: t`State the central limit theorem. Assuming that ${math`M(\theta) = E(e^{\theta X_{${1}}})`} is finite near ${0}, sketch its proof: show that the mgf of ${math`(S_{n} - n\mu)/(\sigma\sqrt{n})`} tends to ${math`e^{\theta^{${2}}/${2}}`}, and say which theorem turns that into convergence of distribution functions.`,
  hints: [
    t`What is the mgf of ${math`(S_{n} - n\mu)/(\sigma\sqrt{n})`} in terms of ${math`M`}?`,
    t`What does a Taylor expansion near ${0}, to second order, give for that mgf?`,
    t`Which continuity theorem turns convergence of mgfs into convergence of distribution functions?`,
  ],
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

/** The hook: at least 60 heads in 100 fair tosses, exactly and by the normal with a continuity correction. */
const COIN = { n: 100, k: 60 };
const coinExact = (() => {
  let c = 1n;
  let s = 0n;
  for (let j = 0; j <= COIN.n; j++) {
    if (j >= COIN.k) s += c;
    c = (c * BigInt(COIN.n - j)) / BigInt(j + 1);
  }
  return Number((s * 10n ** 12n) / 2n ** BigInt(COIN.n)) / 1e12;
})();
const coinZ = (COIN.k - 0.5 - COIN.n / 2) / Math.sqrt(COIN.n / 4);
const coinApprox = 1 - Phi(coinZ);
/** A poll to within 0.1 with probability 0.9: n >= (1.645 / 0.2)^2. */
const POLL = sizeOf({ e: 5, c: 0 });

export const clt: TopicContent = {
  topicId: 'lim.clt',
  goal: t`State the central limit theorem, sketch its proof by moment generating functions, and use it to approximate sums and to size samples.`,
  objective: t`State the central limit theorem, sketch its proof with mgfs, and use it for sums and sample sizes.`,
  why: t`It explains why the normal curve is everywhere, and it is how every poll and experiment is sized.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`The same curve every time` },
    { kind: 'hook', text: t`Toss a fair coin ${COIN.n} times. What is the chance of at least ${COIN.k} heads? Exactly, it is a sum of ${COIN.n - COIN.k + 1} binomial terms, about ${dp(coinExact, 4)}. A normal curve, with one line of arithmetic, gives ${dp(coinApprox, 4)}. Why should a bell curve know anything about coins?` },
    { kind: 'narrative', text: t`It is not special to coins. Add up many independent random quantities, dice, waiting times, measurement errors, and the total, once centred and scaled, always takes the same shape. The weak law of large numbers says the average settles at ${math`\mu`}. The central limit theorem describes the fluctuations around it: they are of size ${math`\sigma/\sqrt{n}`}, and their shape is normal.` },
    { kind: 'section', title: t`The theorem` },
    {
      kind: 'definition',
      name: t`Convergence in distribution`,
      formal: t`Random variables ${math`Y_{${1}}, Y_{${2}}, \ldots`} converge in distribution to ${math`Y`} if ${math`P(Y_{n} \le x) \to P(Y \le x)`} for every ${math`x`} at which ${math`x \mapsto P(Y \le x)`} is continuous.`,
      plain: t`The distribution functions get close, point by point. For a normal limit every ${math`x`} counts, since ${math`\Phi`} is continuous.`,
    },
    { kind: 'theorem', name: t`Central limit theorem`, statement: t`Let ${math`X_{${1}}, X_{${2}}, \ldots`} be independent and identically distributed with mean ${math`\mu`} and variance ${math`\sigma^{${2}}`}, where ${math`${0} < \sigma^{${2}} < \infty`}, and let ${math`S_{n} = X_{${1}} + \cdots + X_{n}`}. Then for every real ${math`x`}, ${dmath`P\left(\frac{S_{n} - n\mu}{\sigma\sqrt{n}} \le x\right) \to \Phi(x) \quad \text{as } n \to \infty.`}` },
    { kind: 'p', text: t`This is the [[central-limit-theorem|central limit theorem]]. The fraction is ${mS} standardised: ${math`S_{n}`} has mean ${math`n\mu`} and standard deviation ${math`\sigma\sqrt{n}`}, so the fraction has mean ${0} and variance ${1} for every ${math`n`}. The theorem says its shape becomes ${math`N(${0}, ${1})`}.` },
    { kind: 'section', title: t`A sketch of the proof` },
    { kind: 'narrative', text: t`The Cambridge schedule asks for a sketch, under an extra assumption: the moment generating function ${math`M(\theta) = E(e^{\theta X_{${1}}})`} is finite for ${math`\theta`} near ${0}. The idea is that mgfs turn sums into products, and products into powers we can take limits of.` },
    {
      kind: 'steps',
      steps: [
        { label: t`Standardise`, text: t`Replace ${math`X_{i}`} by ${math`(X_{i} - \mu)/\sigma`}. Then ${math`\mu = ${0}`}, ${math`\sigma = ${1}`}, and we must show ${math`S_{n}/\sqrt{n}`} converges in distribution to ${math`N(${0}, ${1})`}.` },
        { label: t`Sums become powers`, text: t`By independence, ${math`E\left(e^{\theta S_{n}/\sqrt{n}}\right) = \prod_{i = ${1}}^{n} E\left(e^{\theta X_{i}/\sqrt{n}}\right) = M\left(\theta/\sqrt{n}\right)^{n}`}.`, why: { q: t`Why does the expectation of the product split?`, a: t`The ${math`e^{\theta X_{i}/\sqrt{n}}`} are independent, and the expectation of a product of independent variables is the product of the expectations.` } },
        { label: t`Expand near ${0}`, text: t`${math`M(s) = ${1} + s\,E(X_{${1}}) + \frac{s^{${2}}}{${2}}E(X_{${1}}^{${2}}) + o(s^{${2}}) = ${1} + \frac{s^{${2}}}{${2}} + o(s^{${2}})`}, since the mean is ${0} and the variance ${1}.` },
        { label: t`Take the limit`, text: t`${math`M\left(\theta/\sqrt{n}\right)^{n} = \left(${1} + \frac{\theta^{${2}}}{${2}n} + o\left(\frac{${1}}{n}\right)\right)^{n} \to e^{\theta^{${2}}/${2}}`}.`, why: { q: t`Why does that power tend to an exponential?`, a: t`Take logarithms: ${math`n\log(${1} + a_{n}/n) \to a`} when ${math`a_{n} \to a`}, because ${math`\log(${1} + u) = u + O(u^{${2}})`}. Here ${math`a = \theta^{${2}}/${2}`}.` } },
        { label: t`Recognise the limit`, text: t`${math`e^{\theta^{${2}}/${2}}`} is the mgf of ${math`N(${0}, ${1})`}. The continuity theorem for mgfs, quoted without proof in IA, turns convergence of mgfs into convergence in distribution.` },
      ],
    },
    { kind: 'section', title: t`Using it for sums` },
    { kind: 'p', text: t`For the coins: ${mS} counts heads, so ${math`\mu = \tfrac{${1}}{${2}}`}, ${math`\sigma = \tfrac{${1}}{${2}}`}, mean ${COIN.n / 2}, standard deviation ${math`\tfrac{${1}}{${2}}\sqrt{${COIN.n}} = ${Math.sqrt(COIN.n) / 2}`}. ${mS} takes whole values, so "at least ${COIN.k}" is "at least ${COIN.k - 0.5}" for the continuous normal: the continuity correction. Then ${math`z = \frac{${COIN.k - 0.5} - ${COIN.n / 2}}{${Math.sqrt(COIN.n) / 2}} = ${dp(coinZ, 2)}`}, and ${math`${1} - \Phi(${dp(coinZ, 2)}) \approx ${dp(coinApprox, 4)}`}.` },
    checkFrom(standardise, { mu: 50, sigma: 10, n: 25, off: q(2) }, t`The mean of ${25} observations has standard deviation ${math`\frac{${10}}{\sqrt{${25}}} = ${2}`}, so ${math`z = \frac{${52} - ${50}}{${2}} = ${1}`}.`),
    { kind: 'section', title: t`Sizing a sample` },
    { kind: 'p', text: t`A poll estimates a proportion ${math`p`} by the sample proportion ${math`\hat{p}`}, the mean of ${math`n`} independent indicators. Its standard deviation is ${math`\sqrt{p(${1} - p)/n}`}, at most ${math`\frac{${1}}{${2}\sqrt{n}}`} since ${math`p(${1} - p) \le \tfrac{${1}}{${4}}`}. So the central limit theorem gives ${math`P(|\hat{p} - p| < \varepsilon) \approx ${2}\Phi\left(\frac{\varepsilon\sqrt{n}}{\sqrt{p(${1} - p)}}\right) - ${1} \ge ${2}\Phi(${2}\varepsilon\sqrt{n}) - ${1}`}, whatever ${math`p`} is.`, why: { q: t`Why is ${math`p(${1} - p)`} at most a quarter?`, a: t`${math`\tfrac{${1}}{${4}} - p(${1} - p) = (p - \tfrac{${1}}{${2}})^{${2}} \ge ${0}`}.` } },
    { kind: 'p', text: t`To be within ${0.1} with probability ${0.9}, use ${math`\Phi(${1.645}) = ${0.95}`}: we need ${math`${2} \times ${0.1}\sqrt{n} \ge ${1.645}`}, so ${math`n \ge (${1.645}/${0.2})^{${2}} \approx ${dp(toFloat(POLL), 2)}`}, and ${ceilQ(POLL)} people suffice.` },
    checkFrom(sampleSize, { e: 2, c: 1 }, t`${math`n \ge \left(\frac{${1.96}}{${2} \times ${0.03}}\right)^{${2}} \approx ${dp(toFloat(sizeOf({ e: 2, c: 1 })), 2)}`}, so round up to ${ceilQ(sizeOf({ e: 2, c: 1 }))}.`),
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`The theorem holds for any independent, identically distributed variables.`, counterexample: t`It needs a finite variance. For the Cauchy density ${math`\frac{${1}}{\pi(${1} + x^{${2}})}`}, the average of ${math`n`} independent copies has the same Cauchy distribution for every ${math`n`}, so no rescaling makes it normal.` },
    { kind: 'pitfall', claim: t`${mS} is approximately normal for any ${math`n`}.`, counterexample: t`The theorem is about the limit. For ${math`n = ${1}`} a fair die is uniform on six values, nothing like a bell. How large ${math`n`} must be depends on the distribution; skewed ones need more.` },
    { kind: 'takeaway', text: t`Standardise the sum, ${math`\frac{S_{n} - n\mu}{\sigma\sqrt{n}}`}, and for large ${math`n`} its probabilities are those of ${math`N(${0}, ${1})`}.` },
  ],
  examples: [
    { ...workedCambridge(q11), examiner: t`The examiner looks for the worst case ${math`p = \tfrac{${1}}{${2}}`} justified, the inequality set up from ${math`\Phi`}, and ${math`n`} rounded up.` },
    worked(sumApprox, { d: 0, n: 100, off: 10, dir: 'least' }, t`A hundred dice`),
    worked(sampleSize, { e: 4, c: 1 }, t`A poll to within five points`),
  ],
  generators: [sumApprox, sampleSize, standardise],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['central-limit-theorem'],
  cambridge: withUses([q5, q13value, q13proof, q6b, sketch], {
    'ia-s4-q13': { sections: ['Using it for sums'], note: t`A Poisson sum tends to a half, by the central limit theorem` },
    'ia-s4-q6-b': { sections: ['The theorem'], note: t`Why products of many factors look log-normal` },
    'ia-s4-q5': { sections: ['Sizing a sample'], note: t`A sample size from the normal table` },
  }),
  gate: ['ia-s4-q13', 'ia-s4-q6-b', 'ia-s4-q5'],
  recall: [
    { front: t`The central limit theorem.`, back: t`For i.i.d. ${math`X_{i}`} with mean ${math`\mu`} and variance ${math`\sigma^{${2}} \in (${0}, \infty)`}, ${math`P\left(\frac{S_{n} - n\mu}{\sigma\sqrt{n}} \le x\right) \to \Phi(x)`} for every ${math`x`}.` },
    { front: t`The key step in the mgf sketch of the central limit theorem.`, back: t`${math`M(\theta/\sqrt{n})^{n} = \left(${1} + \frac{\theta^{${2}}}{${2}n} + o(\tfrac{${1}}{n})\right)^{n} \to e^{\theta^{${2}}/${2}}`}.` },
    { front: t`The sample size for a proportion within ${math`\varepsilon`} with probability ${math`${2}\Phi(z) - ${1}`}.`, back: t`${math`n \ge \left(\frac{z}{${2}\varepsilon}\right)^{${2}}`}, using ${math`p(${1} - p) \le \tfrac{${1}}{${4}}`}.` },
  ],
  proofOrder: [
    {
      title: t`Sketch of the central limit theorem`,
      steps: [
        t`Standardise so that ${math`\mu = ${0}`} and ${math`\sigma = ${1}`}.`,
        t`By independence, the mgf of ${math`S_{n}/\sqrt{n}`} is ${math`M(\theta/\sqrt{n})^{n}`}.`,
        t`Expand: ${math`M(s) = ${1} + \frac{s^{${2}}}{${2}} + o(s^{${2}})`}.`,
        t`So the mgf tends to ${math`e^{\theta^{${2}}/${2}}`}, the mgf of ${math`N(${0}, ${1})`}.`,
        t`The continuity theorem gives convergence in distribution.`,
      ],
    },
  ],
};
