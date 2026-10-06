/**
 * rv.variance: Var(X) = E((X - μ)^2) = E(X^2) - μ^2, and the standard deviation. From the
 * STEP 2 Statistics topic notes (page 2: the shortcut, its footnote on the definition, the
 * binomial np(1 - p) and the Poisson λ) and STEP 2 Statistics Q1 (2003 S2 Q13: the Poisson
 * distribution without its zero, A = (1 - e^(-λ))^(-1), μ = λ/(1 - e^(-λ)), and
 * Var(X) = μ(1 - μ + λ)). Every official answer is compared; the series are checked by
 * summing them numerically.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { add, int, mul, pick, q, str, sub, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { join, math, t, type Rich } from '../rich';
import { worked, workedCambridge, type TopicContent } from '../topic';
import { far, mean, rpow, secondMoment, variance, type Dist } from '../partv-a';
import { chooseBig } from '../numbers';

const S2 = 'step-s2-stats' as const;
const S2S = 'step-s2-stats-solutions' as const;
const NOTES = 'step-s2-stats-notes' as const;
const distinctFrom = (right: string, xs: readonly string[]): number => new Set(xs.filter((x) => x !== right)).size;
const distText = (d: Dist): Rich => join(d.map(([x, p]) => [math`P(X = ${x}) = ${p}`]), ', ');

// ---------------------------------------------------------------- from a table

interface TableP { xs: readonly number[]; ws: readonly number[] }
const tableDist = ({ xs, ws }: TableP): Dist => {
  const w = ws.reduce((a, b) => a + b, 0);
  return xs.map((x, i) => [q(x), q(ws[i] as number, w)] as const);
};
const shortcut = (d: Dist): Rational => sub(secondMoment(d), mul(mean(d), mean(d)));
const tableMis = (p: TableP): string[] => {
  const d = tableDist(p);
  const k = p.xs.length;
  const plainMean = q(p.xs.reduce((a, b) => a + b, 0), k);
  const plainVar = sub(q(p.xs.reduce((a, b) => a + b * b, 0), k), mul(plainMean, plainMean));
  return [str(secondMoment(d)), str(sub(secondMoment(d), mean(d))), str(plainVar)];
};

const fromTable = generator<TableP>({
  id: 'var-from-table',
  skill: 'Compute Var(X) = E(X^2) - E(X)^2 from a distribution given value by value.',
  params: (rng) => {
    for (;;) {
      const k = int(rng, 3, 4);
      const xs = [...new Set(Array.from({ length: k }, () => int(rng, -2, 6)))].sort((a, b) => a - b);
      if (xs.length !== k) continue;
      const p: TableP = { xs, ws: xs.map(() => int(rng, 1, 4)) };
      if (new Set(p.ws).size > 1 && distinctFrom(str(shortcut(tableDist(p))), tableMis(p)) >= 2) return p;
    }
  },
  sane: ({ xs, ws }) => (xs.length === ws.length ? null : 'out of range'),
  problem: (p) => {
    const d = tableDist(p);
    const m = mean(d);
    return {
      prompt: t`The random variable ${math`X`} has ${distText(d)}, and takes no other values. Find ${math`\mathrm{Var}(X)`}.`,
      answer: { kind: 'exact', expected: str(shortcut(d)) },
      solution: [
        t`${math`E(X) = ${join(d.map(([x, pr]) => [math`${x} \times ${pr}`]), ' + ')} = ${m}`}.`,
        t`${math`E(X^{${2}}) = ${join(d.map(([x, pr]) => [math`${mul(x, x)} \times ${pr}`]), ' + ')} = ${secondMoment(d)}`}.`,
        t`${math`\mathrm{Var}(X) = E(X^{${2}}) - E(X)^{${2}} = ${secondMoment(d)} - ${mul(m, m)} = ${shortcut(d)}`}.`,
      ],
    };
  },
  solve: (p) => str(variance(tableDist(p))),
  misconceptions: (p): Misconception[] => {
    const [a, b, c] = tableMis(p);
    return [
      { response: a as string, why: t`That is ${math`E(X^{${2}})`}. Subtract the square of the mean.` },
      { response: b as string, why: t`Subtract ${math`E(X)^{${2}}`}, the square of the mean, not ${math`E(X)`} itself.` },
      { response: c as string, why: t`That treats the values as equally likely. Weight each squared value by its probability.` },
    ];
  },
});

// ---------------------------------------------------------------- binomial: variance or standard deviation

interface BinP { n: number; p: Rational; ask: 'var' | 'sd' }
/** (n, p) with np(1 - p) a perfect square, so the standard deviation is rational. */
const SQUARE: readonly (readonly [number, Rational])[] = [[16, q(1, 2)], [36, q(1, 2)], [64, q(1, 2)], [18, q(1, 3)], [25, q(1, 5)], [100, q(1, 5)], [12, q(1, 4)], [48, q(1, 4)], [72, q(1, 3)]];
const PS: readonly Rational[] = [q(1, 2), q(1, 3), q(1, 4), q(1, 5), q(1, 6), q(2, 3), q(3, 4), q(2, 5)];
const binVar = ({ n, p }: BinP): Rational => mul(q(n), mul(p, sub(q(1), p)));
/** An exact rational square root, or null. */
function ratSqrt(r: Rational): Rational | null {
  const root = (x: bigint): bigint | null => { const s = BigInt(Math.round(Math.sqrt(Number(x)))); return s * s === x ? s : null; };
  const a = root(r.num);
  const b = root(r.den);
  return a === null || b === null ? null : { num: a, den: b };
}
const binAnswer = (p: BinP): Rational => (p.ask === 'var' ? binVar(p) : (ratSqrt(binVar(p)) as Rational));
const binMis = (p: BinP): string[] => (p.ask === 'var'
  ? [str(mul(q(p.n), p.p)), str(mul(q(p.n), mul(p.p, p.p))), str(mul(q(p.n), mul(p.p, mul(sub(q(1), p.p), sub(q(1), p.p)))))]
  : [str(binVar(p)), str(mul(q(p.n), p.p)), str(mul(p.p, sub(q(1), p.p)))]);

const binomialSpread = generator<BinP>({
  id: 'binomial-spread',
  skill: 'Use Var(X) = np(1 - p) for X ~ B(n, p), and the standard deviation as its square root.',
  params: (rng) => {
    for (;;) {
      const ask = pick(rng, ['var', 'sd'] as const);
      const [n, p] = ask === 'sd' ? pick(rng, SQUARE) : [int(rng, 5, 30), pick(rng, PS)] as const;
      const bp: BinP = { n, p, ask };
      if (distinctFrom(str(binAnswer(bp)), binMis(bp)) >= 2) return bp;
    }
  },
  sane: (p) => (p.ask === 'var' || ratSqrt(binVar(p)) !== null ? null : 'out of range'),
  problem: (bp) => {
    const v = binVar(bp);
    const what = bp.ask === 'var' ? t`the variance` : t`the standard deviation`;
    return {
      prompt: t`A trial succeeds with probability ${bp.p}, and ${bp.n} independent trials are made. Find ${what} of the number of successes.`,
      answer: { kind: 'exact', expected: str(binAnswer(bp)) },
      solution: [
        t`The number of successes is ${math`X \sim B(${bp.n}, ${bp.p})`}, so ${math`\mathrm{Var}(X) = np(${1} - p) = ${bp.n} \times ${bp.p} \times ${sub(q(1), bp.p)} = ${v}`}.`,
        ...(bp.ask === 'sd' ? [t`The [[standard-deviation|standard deviation]] is the square root of the variance: ${math`\sqrt{${v}} = ${binAnswer(bp)}`}.`] : []),
      ],
    };
  },
  solve: (bp) => {
    // The distribution term by term, then the definition E((X - μ)^2).
    const d: Dist = Array.from({ length: bp.n + 1 }, (_, k) => [q(k), mul(q(chooseBig(bp.n, k)), mul(rpow(bp.p, k), rpow(sub(q(1), bp.p), bp.n - k)))] as const);
    const v = variance(d);
    return str(bp.ask === 'var' ? v : (ratSqrt(v) as Rational));
  },
  misconceptions: (bp): Misconception[] => {
    const [a, b, c] = binMis(bp);
    return bp.ask === 'var'
      ? [
          { response: a as string, why: t`That is the mean, ${math`np`}. The variance has the extra factor ${math`${1} - p`}.` },
          { response: b as string, why: t`The variance of one trial is ${math`p(${1} - p)`}, not ${math`p^{${2}}`}.` },
          { response: c as string, why: t`Only one factor of ${math`${1} - p`}: ${math`np(${1} - p)`}.` },
        ]
      : [
          { response: a as string, why: t`That is the variance. The standard deviation is its square root.` },
          { response: b as string, why: t`That is the mean, ${math`np`}. The standard deviation is ${math`\sqrt{np(${1} - p)}`}.` },
          { response: c as string, why: t`That is the variance of a single trial. For ${bp.n} trials the variance is ${math`np(${1} - p)`}, and the standard deviation is its square root.` },
        ];
  },
});

// ---------------------------------------------------------------- moments: E(X^2) from the mean and variance, or back

interface MomP { mu: Rational; v: number; ask: 'second' | 'var' }
const MUS: readonly Rational[] = [q(2), q(3), q(-1), q(5), q(1, 2), q(3, 2), q(-2), q(4)];
const second = ({ mu, v }: MomP): Rational => add(q(v), mul(mu, mu));
const momAnswer = (p: MomP): Rational => (p.ask === 'second' ? second(p) : q(p.v));
const momMis = (p: MomP): string[] => (p.ask === 'second'
  ? [str(sub(q(p.v), mul(p.mu, p.mu))), str(add(q(p.v), p.mu)), str(mul(add(q(p.v), p.mu), add(q(p.v), p.mu)))]
  : [str(sub(second(p), p.mu)), str(sub(mul(p.mu, p.mu), second(p))), str(add(second(p), mul(p.mu, p.mu)))]);

const moments = generator<MomP>({
  id: 'moments',
  skill: 'Move between E(X^2), E(X), and Var(X) with Var(X) = E(X^2) - E(X)^2.',
  params: (rng) => {
    for (;;) {
      const p: MomP = { mu: pick(rng, MUS), v: int(rng, 1, 12), ask: pick(rng, ['second', 'var'] as const) };
      if (distinctFrom(str(momAnswer(p)), momMis(p)) >= 2) return p;
    }
  },
  sane: ({ v }) => (v >= 1 ? null : 'out of range'),
  problem: (p) => (p.ask === 'second'
    ? {
        prompt: t`A random variable has mean ${p.mu} and variance ${p.v}. Find ${math`E(X^{${2}})`}.`,
        answer: { kind: 'exact', expected: str(momAnswer(p)) },
        solution: [t`${math`\mathrm{Var}(X) = E(X^{${2}}) - E(X)^{${2}}`}, so ${math`E(X^{${2}}) = \mathrm{Var}(X) + E(X)^{${2}} = ${p.v} + ${mul(p.mu, p.mu)} = ${second(p)}`}.`],
      }
    : {
        prompt: t`A random variable has ${math`E(X) = ${p.mu}`} and ${math`E(X^{${2}}) = ${second(p)}`}. Find ${math`\mathrm{Var}(X)`}.`,
        answer: { kind: 'exact', expected: str(momAnswer(p)) },
        solution: [t`${math`\mathrm{Var}(X) = E(X^{${2}}) - E(X)^{${2}} = ${second(p)} - ${mul(p.mu, p.mu)} = ${p.v}`}.`],
      }),
  solve: (p) => {
    // A two-point distribution with this mean and variance, mu ± sqrt(v) each with probability 1/2, has E(X^2) = mu^2 + v.
    const sq = add(mul(p.mu, p.mu), q(p.v));
    return str(p.ask === 'second' ? sq : sub(sq, mul(p.mu, p.mu)));
  },
  misconceptions: (p): Misconception[] => {
    const [a, b, c] = momMis(p);
    return p.ask === 'second'
      ? [
          { response: a as string, why: t`Rearranged the wrong way: ${math`E(X^{${2}}) = \mathrm{Var}(X) + E(X)^{${2}}`}, an addition.` },
          { response: b as string, why: t`Add the square of the mean, ${math`E(X)^{${2}}`}, not the mean.` },
          { response: c as string, why: t`${math`E(X^{${2}})`} is not ${math`(\mathrm{Var}(X) + E(X))^{${2}}`}. Add the variance and the square of the mean.` },
        ]
      : [
          { response: a as string, why: t`Subtract the square of the mean, ${math`E(X)^{${2}}`}, not ${math`E(X)`}.` },
          { response: b as string, why: t`The order is ${math`E(X^{${2}}) - E(X)^{${2}}`}; a variance is never negative.` },
          { response: c as string, why: t`Subtract ${math`E(X)^{${2}}`}: variance is the mean of the squares minus the square of the mean.` },
        ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

const L_DOM = { l: { kind: 'real' as const, min: 0.1, max: 8 } };
/** Sums of the series for the Poisson distribution without its zero: total, mean, variance. */
function truncated(lam: number): { total: number; mu: number; v: number } {
  const A = 1 / (1 - Math.exp(-lam));
  let [s0, s1, s2] = [0, 0, 0];
  let term = Math.exp(-lam);
  for (let k = 1; k < 400; k++) {
    term *= lam / k;
    s0 += A * term;
    s1 += A * k * term;
    s2 += A * k * k * term;
  }
  return { total: s0, mu: s1, v: s2 - s1 * s1 };
}
const LAMS = [0.5, 1, 2, 5, 10];

const q1mean = auto({
  id: 's2-q1-mean',
  source: cite(S2, 'Q1'),
  title: t`The Poisson distribution without its zero: the mean`,
  prompt: t`The random variable ${math`X`} takes the values ${math`k = ${1}, ${2}, ${3}, \ldots`} with ${math`P(X = k) = \frac{A\lambda^{k}e^{-\lambda}}{k!}`}, where ${math`\lambda > ${0}`} and ${math`A = (${1} - e^{-\lambda})^{-${1}}`}. Find the mean ${math`\mu`} in terms of ${math`\lambda`}. (Type ${math`\lambda`} as l.)`,
  answer: { kind: 'expression', expected: 'l/(1 - e^(-l))', variables: ['l'], domains: L_DOM },
  solution: [
    t`${math`\mu = \sum_{k \ge ${1}} k \, \frac{A\lambda^{k}e^{-\lambda}}{k!} = Ae^{-\lambda}\sum_{k \ge ${1}} \frac{\lambda^{k}}{(k - ${1})!} = Ae^{-\lambda}\lambda\sum_{j \ge ${0}} \frac{\lambda^{j}}{j!}`}, putting ${math`j = k - ${1}`}.`,
    t`The last sum is ${math`e^{\lambda}`}, so ${math`\mu = A\lambda = \frac{\lambda}{${1} - e^{-\lambda}}`}.`,
  ],
  reference: 'l/(1 - e^(-l))',
  verify: () => {
    for (const lam of LAMS) {
      const s = truncated(lam);
      if (far(s.total, 1)) return `λ = ${lam}: the probabilities add to ${s.total}`;
      if (far(s.mu, lam / (1 - Math.exp(-lam)))) return `λ = ${lam}: the series mean is ${s.mu}`;
    }
    return null;
  },
  misconceptions: [{ response: 'l', why: t`Removing the value ${0} pushes the mean up: ${math`\mu = A\lambda`}, and ${math`A > ${1}`}.` }],
  official: { source: cite(S2S, 'Q1'), answer: 'l/(1 - e^(-l))', agrees: true },
});

const q1A = auto({
  id: 's2-q1-a',
  source: cite(S2, 'Q1'),
  title: t`The Poisson distribution without its zero: the constant`,
  prompt: t`${math`X`} takes the values ${math`k = ${1}, ${2}, ${3}, \ldots`} with ${math`P(X = k) = \frac{A\lambda^{k}e^{-\lambda}}{k!}`}, where ${math`\lambda > ${0}`}. Find ${math`A`} in terms of ${math`\lambda`}. (Type ${math`\lambda`} as l.)`,
  answer: { kind: 'expression', expected: '1/(1 - e^(-l))', variables: ['l'], domains: L_DOM },
  solution: [
    t`The probabilities add to ${1}: ${math`Ae^{-\lambda}\left(\lambda + \frac{\lambda^{${2}}}{${2}!} + \cdots\right) = Ae^{-\lambda}(e^{\lambda} - ${1}) = ${1}`}, since the exponential series without its first term is ${math`e^{\lambda} - ${1}`}.`,
    t`So ${math`A = \frac{${1}}{${1} - e^{-\lambda}} = (${1} - e^{-\lambda})^{-${1}}`}.`,
  ],
  reference: '1/(1 - e^(-l))',
  verify: () => {
    for (const lam of LAMS) if (far(truncated(lam).total, 1)) return `λ = ${lam}: the probabilities do not add to 1`;
    return null;
  },
  misconceptions: [{ response: 'e^l', why: t`The sum starts at ${math`k = ${1}`}: the series is ${math`e^{\lambda} - ${1}`}, not ${math`e^{\lambda}`}.` }],
  official: { source: cite(S2S, 'Q1'), answer: '(1 - e^(-l))^(-1)', agrees: true },
});

const q1var = auto({
  id: 's2-q1-var',
  source: cite(S2, 'Q1'),
  title: t`The Poisson distribution without its zero: the variance`,
  prompt: t`For ${math`P(X = k) = \frac{A\lambda^{k}e^{-\lambda}}{k!}`}, ${math`k = ${1}, ${2}, \ldots`}, with mean ${math`\mu = \frac{\lambda}{${1} - e^{-\lambda}}`}, find ${math`\mathrm{Var}(X)`} in terms of ${math`\lambda`} and ${math`\mu`}. (Type ${math`\lambda`} as l and ${math`\mu`} as m.)`,
  answer: { kind: 'expression', expected: 'm(1 - m + l)', variables: ['m', 'l'], domains: { m: { kind: 'real', min: 0.5, max: 5 }, l: { kind: 'real', min: 0.1, max: 5 } } },
  solution: [
    t`${math`E(X(X - ${1})) = Ae^{-\lambda}\sum_{k \ge ${2}} \frac{\lambda^{k}}{(k - ${2})!} = A\lambda^{${2}}`}, so ${math`E(X^{${2}}) = A\lambda^{${2}} + A\lambda = \mu\lambda + \mu`}.`,
    t`${math`\mathrm{Var}(X) = E(X^{${2}}) - \mu^{${2}} = \mu(${1} + \lambda) - \mu^{${2}} = \mu(${1} - \mu + \lambda)`}.`,
  ],
  reference: 'm(1 - m + l)',
  verify: () => {
    for (const lam of LAMS) {
      const s = truncated(lam);
      if (far(s.v, s.mu * (1 - s.mu + lam))) return `λ = ${lam}: the series variance is ${s.v}`;
    }
    return null;
  },
  misconceptions: [{ response: 'l', why: t`The full Poisson distribution has variance ${math`\lambda`}; without its zero, the mean and the second moment both change.` }],
  official: { source: cite(S2S, 'Q1'), answer: 'm(1 - m + l)', agrees: true },
});

const TEN = 10;
const SIX = q(1, 6);
const tenDice = auto({
  id: 's2-notes-binomial-variance',
  source: cite(NOTES, 'page 2', true),
  title: t`The spread of the number of sixes`,
  prompt: t`The topic notes' example of a binomial distribution is the number of sixes in ${TEN} throws of a die. Find its variance.`,
  answer: { kind: 'exact', expected: str(mul(q(TEN), mul(SIX, sub(q(1), SIX)))) },
  solution: [t`${math`X \sim B(${TEN}, ${SIX})`}, so ${math`\mathrm{Var}(X) = np(${1} - p) = ${TEN} \times ${SIX} \times ${q(5, 6)} = ${mul(q(TEN), mul(SIX, sub(q(1), SIX)))}`}.`],
  reference: '25/18',
  verify: () => {
    // The distribution built throw by throw (a convolution), then the definition of variance.
    let dist: Rational[] = [q(1)];
    for (let i = 0; i < TEN; i++) dist = Array.from({ length: dist.length + 1 }, (_, k) => add(mul(dist[k] ?? q(0), q(5, 6)), mul(dist[k - 1] ?? q(0), SIX)));
    return same('the distribution throw by throw', str(variance(dist.map((p, k) => [q(k), p] as const))), '25/18');
  },
  misconceptions: [{ response: str(q(5, 3)), why: t`That is the mean, ${math`np`}. The variance is ${math`np(${1} - p)`}.` }],
});

const q1bounds = supervision({
  id: 's2-q1-bounds',
  source: cite(S2, 'Q1'),
  title: t`Where the mean lies`,
  prompt: t`For the Poisson distribution without its zero, with ${math`\mu = \frac{\lambda}{${1} - e^{-\lambda}}`} and ${math`\mathrm{Var}(X) = \mu(${1} - \mu + \lambda)`}, deduce that ${math`\lambda < \mu < ${1} + \lambda`}. Use that a variance is positive for one inequality and ${math`e^{-\lambda} < ${1}`} for the other.`,
  writeUp: 'proof',
  official: cite(S2S, 'Q1'),
});
const shortcutProof = supervision({
  id: 's2-notes-shortcut',
  source: cite(NOTES, 'page 2'),
  title: t`The definition and the shortcut agree`,
  prompt: t`The notes define the variance as the mean squared distance from the mean, ${math`\mathrm{Var}(X) = E\left((X - E(X))^{${2}}\right) = \sum_{i} (i - E(X))^{${2}} P(X = i)`}, and say it expands to ${math`E(X^{${2}}) - E(X)^{${2}}`}. Prove it, and deduce that ${math`E(X^{${2}}) \ge E(X)^{${2}}`}.`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

const DIE: Dist = [1, 2, 3, 4, 5, 6].map((x) => [q(x), SIX] as const);

export const varianceTopic: TopicContent = {
  topicId: 'rv.variance',
  goal: t`Compute ${math`\mathrm{Var}(X) = E(X^{${2}}) - E(X)^{${2}}`} and the standard deviation of a discrete random variable.`,
  lesson: [
    { kind: 'p', text: t`Two random variables can have the same mean and different spreads: ${math`X`} always ${0}, and ${math`Y`} equal to ${math`-${10}`} or ${10} with probability ${q(1, 2)} each, both have mean ${0}. The [[variance|variance]] measures the spread as the mean squared distance from the mean.` },
    { kind: 'rule', text: t`${math`\mathrm{Var}(X) = E\left((X - \mu)^{${2}}\right) = E(X^{${2}}) - \mu^{${2}}`}, where ${math`\mu = E(X)`} and ${math`E(X^{${2}}) = \sum_{x} x^{${2}} P(X = x)`}. The [[standard-deviation|standard deviation]] is ${math`\sigma = \sqrt{\mathrm{Var}(X)}`}, in the same units as ${math`X`}.` },
    { kind: 'p', text: t`The shortcut follows by expanding: ${math`(X - \mu)^{${2}} = X^{${2}} - ${2}\mu X + \mu^{${2}}`}, whose mean is ${math`E(X^{${2}}) - ${2}\mu^{${2}} + \mu^{${2}}`}. The STEP ${2} notes call it "the mean of the squares minus the square of the mean". A variance is never negative.` },
    { kind: 'p', text: t`A fair die: ${math`E(X) = ${mean(DIE)}`} and ${math`E(X^{${2}}) = \frac{${1} + ${4} + \cdots + ${36}}{${6}} = ${secondMoment(DIE)}`}, so ${math`\mathrm{Var}(X) = ${secondMoment(DIE)} - ${mul(mean(DIE), mean(DIE))} = ${variance(DIE)}`}.` },
    { kind: 'p', text: t`Two variances to know, from the notes: ${math`X \sim B(n, p)`} has ${math`\mathrm{Var}(X) = np(${1} - p)`}, and a Poisson variable with mean ${math`\lambda`} has variance ${math`\lambda`} too. Remove the value ${0} from the Poisson distribution, as STEP ${2} Statistics Q${1} does, and both change: ${math`\mu = \frac{\lambda}{${1} - e^{-\lambda}}`} and ${math`\mathrm{Var}(X) = \mu(${1} - \mu + \lambda)`}.` },
  ],
  examples: [
    workedCambridge(q1mean),
    worked(fromTable, { xs: [0, 1, 2, 4], ws: [2, 3, 2, 1] }, t`A distribution given value by value`),
    worked(binomialSpread, { n: 18, p: q(1, 3), ask: 'sd' }, t`The standard deviation of a binomial count`),
  ],
  generators: [fromTable, binomialSpread, moments],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['variance', 'standard-deviation'],
  cambridge: [q1A, q1var, tenDice, q1bounds, shortcutProof],
  gate: ['s2-q1-a', 's2-q1-var', 's2-notes-binomial-variance', 's2-q1-bounds', 's2-notes-shortcut'],
};
