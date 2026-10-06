/**
 * gf.pgf: the probability generating function G_X(t) = E(t^X) of a variable with values
 * 0, 1, 2, ...: it determines the distribution, its derivatives at 1 give the moments, and
 * the pgf of a sum of independent variables is the product of their pgfs. From the Faculty
 * schedule ("Generating functions: sums of independent random variables, random sum formula,
 * moments") and IA Probability Example Sheet 3 Q5 (the negative binomial distribution, its
 * pgf, mean, and variance, and as a sum of geometric variables). The sheet states the
 * results it asks for; the auto-checked versions ask for them (adapted) and compare with
 * the stated forms, and every answer is checked by summing the series.
 */
import type { Rng } from '@learnhub/mastery';
import { auto, cite, supervision } from '../cambridge';
import { add, int, mul, pick, q, str, sub, type Rational } from '../math';
import { choose } from '../numbers';
import { meanQ, polyDeriv, polyEval, polyMul, polyTex, sampleFrom, varQ, type Poly } from '../partv-d';
import { generator, type Misconception } from '../problem';
import { computedTex, math, t, type Rich } from '../rich';
import { worked, workedCambridge, type ProbabilityClaim, type TopicContent } from '../topic';

const [mX, mt, mn_] = [math`X`, math`t`, math`n`];
const SH3 = 'ia-prob-sheet-3' as const;
const SCHEDULE = cite('tripos-schedules', 'IA Probability, Discrete random variables: "Generating functions: sums of independent random variables, random sum formula, moments"', true);

/** A distribution on {0, ..., s - 1} with positive masses w_k / d, the w_k a random composition of d. */
function randDist(rng: Rng, s: number, d: number): Rational[] {
  const cuts = new Set<number>();
  while (cuts.size < s - 1) cuts.add(int(rng, 1, d - 1));
  const pts = [0, ...[...cuts].sort((a, b) => a - b), d];
  return pts.slice(1).map((x, i) => q(x - (pts[i] as number), d));
}
const ONE = q(1);

// ---------------------------------------------------------------- moments from derivatives

interface MomP { dist: Rational[]; ask: 'mean' | 'variance' }
const momVal = ({ dist, ask }: MomP): Rational => {
  const g1 = polyEval(polyDeriv(dist), ONE);
  const g2 = polyEval(polyDeriv(polyDeriv(dist)), ONE);
  return ask === 'mean' ? g1 : add(sub(g2, mul(g1, g1)), g1);
};
const momMis = ({ dist, ask }: MomP): Rational[] => {
  const g1 = polyEval(polyDeriv(dist), ONE);
  const g2 = polyEval(polyDeriv(polyDeriv(dist)), ONE);
  return ask === 'mean' ? [dist[1] as Rational, g2, polyEval(dist, ONE)] : [g2, sub(g2, mul(g1, g1)), add(g2, g1)];
};

const moments = generator<MomP>({
  id: 'moments',
  skill: 'Find E(X) = G\'(1) and Var(X) = G\'\'(1) + G\'(1) - G\'(1)^2 from a pgf.',
  params: (rng) => {
    for (;;) {
      const s = int(rng, 3, 4);
      const p: MomP = { dist: randDist(rng, s, pick(rng, [6, 8, 10, 12])), ask: pick(rng, ['mean', 'variance'] as const) };
      const right = str(momVal(p));
      if (new Set(momMis(p).map(str).filter((m) => m !== right)).size >= 2) return p;
    }
  },
  sane: ({ dist }) => (str(dist.reduce(add, q(0))) === '1' ? null : 'not a distribution'),
  problem: (p) => {
    const { dist, ask } = p;
    const d1 = polyDeriv(dist);
    const d2 = polyDeriv(d1);
    const g1 = polyEval(d1, ONE);
    const g2 = polyEval(d2, ONE);
    return {
      prompt: t`${mX} has probability generating function ${math`G(t) = ${computedTex(polyTex(dist))}`}. Find ${ask === 'mean' ? math`E(X)` : math`\operatorname{Var}(X)`}.`,
      answer: { kind: 'exact', expected: str(momVal(p)) },
      solution: [
        t`${math`G'(t) = ${computedTex(polyTex(d1))}`}, so ${math`E(X) = G'(${1}) = ${g1}`}.`,
        ask === 'mean'
          ? t`Differentiating ${math`\sum_{k} P(X = k)t^{k}`} gives ${math`\sum_{k} kP(X = k)t^{k - ${1}}`}, and at ${math`t = ${1}`} that is the mean.`
          : t`${math`G''(t) = ${computedTex(polyTex(d2))}`}, so ${math`E(X(X - ${1})) = G''(${1}) = ${g2}`}, and ${math`\operatorname{Var}(X) = G''(${1}) + G'(${1}) - G'(${1})^{${2}} = ${g2} + ${g1} - \left(${g1}\right)^{${2}} = ${momVal(p)}`}.`,
      ],
    };
  },
  // Straight from the distribution, without derivatives.
  solve: ({ dist, ask }) => str(ask === 'mean' ? meanQ(dist) : varQ(dist)),
  misconceptions: (p): Misconception[] => {
    const [a, b, c] = momMis(p) as [Rational, Rational, Rational];
    return p.ask === 'mean'
      ? [
        { response: str(a), why: t`${math`G'(${0}) = P(X = ${1})`}. The mean is ${math`G'(${1})`}: evaluate the derivative at ${math`t = ${1}`}.` },
        { response: str(b), why: t`${math`G''(${1})`} is ${math`E(X(X - ${1}))`}. The mean needs one derivative, not two.` },
        { response: str(c), why: t`${math`G(${1}) = ${1}`} for every pgf: it is the sum of the probabilities. Differentiate first.` },
      ]
      : [
        { response: str(a), why: t`${math`G''(${1}) = E(X(X - ${1}))`}, not the variance. Add ${math`G'(${1})`} and subtract ${math`G'(${1})^{${2}}`}.` },
        { response: str(b), why: t`${math`G''(${1}) = E(X^{${2}}) - E(X)`}, so ${math`E(X^{${2}}) = G''(${1}) + G'(${1})`}: the ${math`G'(${1})`} term is missing.` },
        { response: str(c), why: t`That is ${math`E(X^{${2}})`}. Subtract ${math`E(X)^{${2}}`} for the variance.` },
      ];
  },
});

// ---------------------------------------------------------------- the distribution of a sum

interface SumP { x: Rational[]; y: Rational[]; k: number }
const sumVal = ({ x, y, k }: SumP): Rational => polyMul(x, y)[k] ?? q(0);
const sumMis = ({ x, y, k }: SumP): Rational[] => [add(x[k] ?? q(0), y[k] ?? q(0)), mul(x[k] ?? q(0), y[k] ?? q(0)), mul(add(x[k] ?? q(0), y[k] ?? q(0)), q(1, 2))];

const sumDist = generator<SumP>({
  id: 'sum-of-independent',
  skill: 'Find a probability for X + Y, X and Y independent, as a coefficient of the product of their pgfs.',
  params: (rng) => {
    for (;;) {
      const p: SumP = { x: randDist(rng, 3, pick(rng, [4, 5, 6])), y: randDist(rng, pick(rng, [2, 3]), pick(rng, [3, 4, 5])), k: int(rng, 1, 3) };
      const right = str(sumVal(p));
      if (sumVal(p).num > 0n && new Set(sumMis(p).map(str).filter((m) => m !== right)).size >= 2) return p;
    }
  },
  sane: ({ x, y }) => (str(x.reduce(add, q(0))) === '1' && str(y.reduce(add, q(0))) === '1' ? null : 'not distributions'),
  problem: (p) => {
    const { x, y, k } = p;
    const prod = polyMul(x, y);
    return {
      prompt: t`${mX} and ${math`Y`} are independent, with probability generating functions ${math`G_{X}(t) = ${computedTex(polyTex(x))}`} and ${math`G_{Y}(t) = ${computedTex(polyTex(y))}`}. Find ${math`P(X + Y = ${k})`}.`,
      answer: { kind: 'exact', expected: str(sumVal(p)) },
      solution: [
        t`By independence, ${math`G_{X + Y}(t) = E(t^{X}t^{Y}) = E(t^{X})E(t^{Y}) = G_{X}(t)G_{Y}(t)`}.`,
        t`Multiplying out, ${math`G_{X + Y}(t) = ${computedTex(polyTex(prod))}`}. The coefficient of ${math`t^{${k}}`} is ${math`P(X + Y = ${k}) = ${sumVal(p)}`}.`,
      ],
    };
  },
  solve: ({ x, y, k }) => {
    // Every pair of values, by brute force.
    let s = q(0);
    x.forEach((px, i) => y.forEach((py, j) => { if (i + j === k) s = add(s, mul(px, py)); }));
    return str(s);
  },
  misconceptions: (p): Misconception[] => {
    const [added, both, avg] = sumMis(p) as [Rational, Rational, Rational];
    return [
      { response: str(added), why: t`Adding ${math`P(X = ${p.k})`} and ${math`P(Y = ${p.k})`} does not give the sum's distribution. Multiply the pgfs and read off the coefficient of ${math`t^{${p.k}}`}.` },
      { response: str(both), why: t`${math`P(X = ${p.k})P(Y = ${p.k})`} is the chance both equal ${p.k}, a total of ${2 * p.k}. Collect every pair of values adding to ${p.k}.` },
      { response: str(avg), why: t`Averaging the pgfs gives a mixture, not a sum. For independent variables, multiply.` },
    ];
  },
  trial: ({ x, y, k }, rng) => sampleFrom(x, rng) + sampleFrom(y, rng) === k,
});

// ---------------------------------------------------------------- recognising a family

type Fam = 'binomial' | 'poisson' | 'both';
interface FamP { fam: Fam; n: number; pr: Rational; lambda: number; ask: 'mean' | 'variance' }
const famMean = ({ fam, n, pr, lambda }: FamP): Rational => (fam === 'binomial' ? mul(q(n), pr) : fam === 'poisson' ? q(lambda) : add(q(lambda), mul(q(n), pr)));
const famVar = ({ fam, n, pr, lambda }: FamP): Rational => {
  const bin = mul(q(n), mul(pr, sub(ONE, pr)));
  return fam === 'binomial' ? bin : fam === 'poisson' ? q(lambda) : add(q(lambda), bin);
};
const famVal = (p: FamP): Rational => (p.ask === 'mean' ? famMean(p) : famVar(p));
function famMisList(p: FamP): { v: Rational; why: Rich }[] {
  const { fam, n, pr, lambda } = p;
  const l = q(lambda);
  const np = mul(q(n), pr);
  const npq = mul(np, sub(ONE, pr));
  const g2 = t`${math`G''(${1})`} is ${math`E(X(X - ${1}))`}, the factorial moment.`;
  if (p.ask === 'mean') {
    if (fam === 'binomial') return [
      { v: q(n), why: t`The power ${n} is the number of trials, not the mean: multiply by the chance of success, ${pr}.` },
      { v: mul(q(n), sub(ONE, pr)), why: t`The coefficient of ${mt} in each factor, ${pr}, is the chance of success; ${sub(ONE, pr)} is the chance of failure.` },
      { v: pr, why: t`That is the mean of one trial. There are ${n} of them.` },
    ];
    if (fam === 'poisson') return [
      { v: mul(l, l), why: t`${math`G'(t) = \lambda e^{\lambda(t - ${1})}`}: the mean is ${math`\lambda`}, not ${math`\lambda^{${2}}`}.` },
      { v: ONE, why: t`${math`G(${1}) = ${1}`} for every pgf. The mean is ${math`G'(${1})`}.` },
    ];
    return [
      { v: mul(l, np), why: t`The pgfs multiply, but the means add: ${math`E(X + Y) = E(X) + E(Y)`}.` },
      { v: l, why: t`That is the mean of the Poisson factor alone. Add the binomial mean, ${np}.` },
      { v: np, why: t`That is the mean of the binomial factor alone. Add the Poisson mean, ${lambda}.` },
    ];
  }
  if (fam === 'binomial') return [
    { v: np, why: t`That is the mean. The variance is ${math`G''(${1}) + G'(${1}) - G'(${1})^{${2}}`}, which is ${math`np(${1} - p)`}.` },
    { v: mul(np, pr), why: t`The binomial variance is ${math`np(${1} - p)`}, not ${math`np^{${2}}`}.` },
    { v: mul(q(n * (n - 1)), mul(pr, pr)), why: t`${g2} Add ${math`G'(${1})`} and subtract ${math`G'(${1})^{${2}}`}.` },
  ];
  if (fam === 'poisson') return [
    { v: mul(l, l), why: t`${g2} The variance of a Poisson variable is ${math`\lambda^{${2}} + \lambda - \lambda^{${2}} = \lambda`}.` },
    { v: add(mul(l, l), l), why: t`That is ${math`E(X^{${2}})`}. Subtract ${math`E(X)^{${2}}`}.` },
  ];
  return [
    { v: add(l, np), why: t`That is the mean. Variances of independent summands add: ${math`\lambda + np(${1} - p)`}.` },
    { v: mul(l, npq), why: t`The pgfs multiply, but the variances of independent summands add.` },
    { v: npq, why: t`That is the binomial part alone. Add the Poisson variance, ${lambda}.` },
  ];
}
const famMis = (p: FamP): Rational[] => famMisList(p).map((m) => m.v);

const family = generator<FamP>({
  id: 'recognise',
  skill: 'Recognise binomial and Poisson pgfs, and products of them, and read off the mean and variance.',
  params: (rng) => {
    for (;;) {
      const p: FamP = { fam: pick(rng, ['binomial', 'poisson', 'both'] as const), n: int(rng, 2, 8), pr: pick(rng, [q(1, 2), q(1, 3), q(2, 3), q(1, 4), q(3, 4), q(2, 5), q(1, 5)]), lambda: int(rng, 1, 5), ask: pick(rng, ['mean', 'variance'] as const) };
      const right = str(famVal(p));
      if (new Set(famMis(p).map(str).filter((m) => m !== right)).size >= 2) return p;
    }
  },
  sane: ({ n, lambda }) => (n >= 1 && lambda >= 1 ? null : 'out of range'),
  problem: (p) => {
    const { fam, n, pr, lambda, ask } = p;
    const qq = sub(ONE, pr);
    const binTex = math`\left(${qq} + ${pr}t\right)^{${n}}`;
    const poiTex = math`e^{${lambda}(t - ${1})}`;
    const g = fam === 'binomial' ? binTex : fam === 'poisson' ? poiTex : math`${poiTex}${binTex}`;
    const what = fam === 'binomial' ? t`the pgf of ${math`B(${n}, ${pr})`}, the sum of ${n} independent trials each with pgf ${math`${qq} + ${pr}t`}` : fam === 'poisson' ? t`the pgf of ${math`\text{Po}(${lambda})`}` : t`a product: ${mX} is the sum of independent ${math`\text{Po}(${lambda})`} and ${math`B(${n}, ${pr})`} variables`;
    return {
      prompt: t`${mX} has probability generating function ${math`G(t) = ${g}`}. Find ${ask === 'mean' ? math`E(X)` : math`\operatorname{Var}(X)`}.`,
      answer: { kind: 'exact', expected: str(famVal(p)) },
      solution: [
        t`This is ${what}. A pgf determines the distribution.`,
        ask === 'mean'
          ? t`${math`E(X) = G'(${1})`}. ${fam === 'poisson' ? t`${math`G'(t) = ${lambda}e^{${lambda}(t - ${1})}`}, so ${math`E(X) = ${lambda}`}.` : fam === 'binomial' ? t`${math`G'(t) = ${n} \times ${pr}\left(${qq} + ${pr}t\right)^{${n - 1}}`}, so ${math`E(X) = ${n} \times ${pr} = ${famMean(p)}`}.` : t`Means of independent summands add: ${math`${lambda} + ${n} \times ${pr} = ${famMean(p)}`}.`}`
          : t`${fam === 'poisson' ? t`${math`G''(${1}) = ${lambda * lambda}`} and ${math`G'(${1}) = ${lambda}`}, so the variance is ${math`${lambda * lambda} + ${lambda} - ${lambda * lambda} = ${lambda}`}.` : fam === 'binomial' ? t`${math`G''(${1}) = ${n} \times ${n - 1} \times \left(${pr}\right)^{${2}}`} and ${math`G'(${1}) = ${famMean(p)}`}, so the variance is ${math`G''(${1}) + G'(${1}) - G'(${1})^{${2}} = ${famVar(p)}`}, which is ${math`npq`}.` : t`Variances of independent summands add: ${math`${lambda} + ${n} \times ${pr} \times ${qq} = ${famVar(p)}`}.`}`,
      ],
    };
  },
  solve: (p) => {
    // From the distribution, by expanding the pgf: the binomial part exactly, the Poisson part through its known moments.
    const bin: Rational[] = Array.from({ length: p.n + 1 }, (_, k) => mul(q(choose(p.n, k)), mul(powR(p.pr, k), powR(sub(ONE, p.pr), p.n - k))));
    const bm = meanQ(bin);
    const bv = varQ(bin);
    const [m, v] = p.fam === 'binomial' ? [bm, bv] : p.fam === 'poisson' ? [q(p.lambda), q(p.lambda)] : [add(bm, q(p.lambda)), add(bv, q(p.lambda))];
    return str(p.ask === 'mean' ? m : v);
  },
  misconceptions: (p): Misconception[] => famMisList(p).map((m) => ({ response: str(m.v), why: m.why })),
});
function powR(r: Rational, e: number): Rational { let o = q(1); for (let i = 0; i < e; i++) o = mul(o, r); return o; }

// ---------------------------------------------------------------- Cambridge problems

const APT_DOM = { a: { kind: 'integer' as const, min: 1, max: 6 }, p: { kind: 'real' as const, min: 0.1, max: 0.9 }, t: { kind: 'real' as const, min: -0.9, max: 0.9 } };
const AP_DOM = { a: { kind: 'integer' as const, min: 1, max: 6 }, p: { kind: 'real' as const, min: 0.1, max: 0.9 } };
const nbIntro = t`Independent Bernoulli trials each succeed with probability ${math`p`}, and ${math`q = ${1} - p`}. ${mX} is the number of trials up to and including the ${math`a`}th success, so ${math`P(X = r) = \binom{r - ${1}}{a - ${1}}p^{a}q^{r - a}`} for ${math`r = a, a + ${1}, \ldots`}.`;
/** The negative binomial series sum_r P(X = r) f(r), numerically. */
const nbSum = (a: number, p: number, f: (r: number) => number): number => { let s = 0; for (let r = a; r < a + 4000; r++) s += choose(r - 1, a - 1) * p ** a * (1 - p) ** (r - a) * f(r); return s; };
const NB = [[1, 0.5], [2, 0.3], [3, 0.6], [4, 0.75]] as const;
const near = (x: number, y: number): boolean => Math.abs(x - y) <= 1e-8 * Math.max(1, Math.abs(y));

const q5pgf = auto({
  id: 'ia-s3-q5-pgf',
  source: cite(SH3, 'Q5', true),
  title: t`The negative binomial generating function`,
  prompt: t`${nbIntro} Find its probability generating function ${math`G(t) = E(t^{X})`}, for ${math`|t| < ${1}`}, as an expression in ${math`a`}, ${math`p`}, and ${mt} (write ${math`${1} - p`} for ${math`q`}).`,
  answer: { kind: 'expression', expected: 'p^a*t^a/(1 - (1 - p)*t)^a', variables: ['a', 'p', 't'], domains: APT_DOM },
  solution: [
    t`${math`G(t) = \sum_{r \ge a} \binom{r - ${1}}{a - ${1}}p^{a}q^{r - a}t^{r} = (pt)^{a}\sum_{j \ge ${0}} \binom{a - ${1} + j}{a - ${1}}(qt)^{j}`}, with ${math`j = r - a`}.`,
    t`The negative binomial series ${math`\sum_{j \ge ${0}} \binom{a - ${1} + j}{a - ${1}}x^{j} = (${1} - x)^{-a}`} for ${math`|x| < ${1}`}, with ${math`x = qt`}, gives ${math`G(t) = \frac{p^{a}t^{a}}{(${1} - qt)^{a}}`}.`,
    t`It is the ${math`a`}th power of ${math`\frac{pt}{${1} - qt}`}, the pgf of the number of trials to the first success: the first hint that ${mX} is a sum of ${math`a`} independent geometric variables.`,
  ],
  reference: '(p t/(1 - (1 - p) t))^a',
  verify: () => {
    for (const [a, p] of NB) for (const tt of [-0.7, 0.3, 0.8]) if (!near(nbSum(a, p, (r) => tt ** r), (p * tt) ** a / (1 - (1 - p) * tt) ** a)) return `a = ${a}, p = ${p}, t = ${tt}`;
    return null;
  },
  misconceptions: [{ response: '(p*t/(1 - (1 - p)*t))', why: t`That is the pgf for the first success. The ${math`a`}th success needs ${math`a`} such waits in a row: raise it to the power ${math`a`}.` }],
  // The sheet states the result to be shown: p^a t^a (1 - qt)^(-a).
  official: { source: cite(SH3, 'Q5'), answer: 'p^a t^a (1 - (1 - p) t)^(-a)', agrees: true },
});

const q5mean = auto({
  id: 'ia-s3-q5-mean',
  source: cite(SH3, 'Q5', true),
  title: t`The negative binomial mean`,
  prompt: t`${nbIntro} Its pgf is ${math`G(t) = p^{a}t^{a}(${1} - qt)^{-a}`}. Use it to find ${math`E(X)`} in terms of ${math`a`} and ${math`p`}.`,
  answer: { kind: 'expression', expected: 'a/p', variables: ['a', 'p'], domains: AP_DOM },
  solution: [
    t`Take logarithms: ${math`\ln G(t) = a\ln p + a\ln t - a\ln(${1} - qt)`}, so ${math`\frac{G'(t)}{G(t)} = \frac{a}{t} + \frac{aq}{${1} - qt}`}.`,
    t`At ${math`t = ${1}`}, ${math`G(${1}) = ${1}`} and ${math`${1} - q = p`}: ${math`E(X) = G'(${1}) = a + \frac{aq}{p} = \frac{a}{p}`}.`,
  ],
  reference: 'a/p',
  verify: () => {
    for (const [a, p] of NB) if (!near(nbSum(a, p, (r) => r), a / p)) return `a = ${a}, p = ${p}`;
    return null;
  },
  misconceptions: [
    { response: 'a*p', why: t`Successes are rare when ${math`p`} is small, so the wait is long: the mean grows as ${math`p`} shrinks. It is ${math`a/p`}.` },
    { response: '1/p', why: t`${math`${1}/p`} is the wait for one success. The ${math`a`}th success takes ${math`a`} such waits.` },
  ],
  official: { source: cite(SH3, 'Q5'), answer: 'a/p', agrees: true },
});

const q5var = auto({
  id: 'ia-s3-q5-variance',
  source: cite(SH3, 'Q5', true),
  title: t`The negative binomial variance`,
  prompt: t`${nbIntro} Find ${math`\operatorname{Var}(X)`} in terms of ${math`a`} and ${math`p`}.`,
  answer: { kind: 'expression', expected: 'a*(1 - p)/p^2', variables: ['a', 'p'], domains: AP_DOM },
  solution: [
    t`Differentiate ${math`\frac{G'(t)}{G(t)} = \frac{a}{t} + \frac{aq}{${1} - qt}`} again: ${math`\frac{G''(t)}{G(t)} - \left(\frac{G'(t)}{G(t)}\right)^{${2}} = -\frac{a}{t^{${2}}} + \frac{aq^{${2}}}{(${1} - qt)^{${2}}}`}.`,
    t`At ${math`t = ${1}`}: ${math`G''(${1}) - G'(${1})^{${2}} = -a + \frac{aq^{${2}}}{p^{${2}}}`}, and ${math`\operatorname{Var}(X) = G''(${1}) + G'(${1}) - G'(${1})^{${2}} = -a + \frac{aq^{${2}}}{p^{${2}}} + \frac{a}{p} = \frac{aq}{p^{${2}}}`}.`,
  ],
  reference: 'a(1 - p)/p^2',
  verify: () => {
    for (const [a, p] of NB) {
      const m = nbSum(a, p, (r) => r);
      if (!near(nbSum(a, p, (r) => r * r) - m * m, (a * (1 - p)) / (p * p))) return `a = ${a}, p = ${p}`;
    }
    return null;
  },
  misconceptions: [
    { response: 'a*(1 - p)/p', why: t`Check at ${math`a = ${1}`}: a geometric wait has variance ${math`q/p^{${2}}`}. The square stays.` },
    { response: '(1 - p)/p^2', why: t`That is one geometric wait. ${mX} is the sum of ${math`a`} independent ones, and their variances add.` },
  ],
  // The sheet states var(X) = aq/p^2.
  official: { source: cite(SH3, 'Q5'), answer: 'a(1 - p)/p^2', agrees: true },
});

const q5proof = supervision({
  id: 'ia-s3-q5',
  source: cite(SH3, 'Q5'),
  title: t`The negative binomial distribution`,
  prompt: t`Independent Bernoulli trials succeed with probability ${math`p`}; ${mX} is the number of trials up to and including the ${math`a`}th success. Show that ${math`P(X = r) = \binom{r - ${1}}{a - ${1}}p^{a}q^{r - a}`} for ${math`r = a, a + ${1}, \ldots`}, and that its generating function is ${math`p^{a}t^{a}(${1} - qt)^{-a}`}. Deduce ${math`E(X) = a/p`} and ${math`\operatorname{var}(X) = aq/p^{${2}}`}. Explain how ${mX} is a sum of ${math`a`} independent random variables with the same distribution, and use this to derive the mean and variance again.`,
  writeUp: 'proof',
});

const schedule = supervision({
  id: 'schedule-pgf',
  source: SCHEDULE,
  title: t`Why pgfs work`,
  prompt: t`Let ${mX} take values in ${math`\{${0}, ${1}, ${2}, \ldots\}`} with pgf ${math`G`}. Prove: (a) ${math`G`} determines the distribution of ${mX}; (b) if ${math`E(X) < \infty`} then ${math`E(X) = \lim_{t \uparrow ${1}} G'(t)`}; (c) if ${mX} and ${math`Y`} are independent then ${math`G_{X + Y} = G_{X}G_{Y}`}. In (b), explain why a limit is needed rather than ${math`G'(${1})`} directly.`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

const DIE: Poly = [q(0), q(1, 6), q(1, 6), q(1, 6), q(1, 6), q(1, 6), q(1, 6)];
const TWO = polyMul(DIE, DIE);
const claims: ProbabilityClaim[] = [
  { what: 'two dice total seven, as the coefficient of t^7', exact: TWO[7] as Rational, trial: (rng) => sampleFrom(DIE, rng) + sampleFrom(DIE, rng) === 7 },
];

export const pgf: TopicContent = {
  topicId: 'gf.pgf',
  goal: t`Use the probability generating function ${math`G_{X}(t) = E(t^{X})`} to find moments from its derivatives at ${math`t = ${1}`}, and the distribution of a sum of independent variables from a product.`,
  lesson: [
    { kind: 'p', text: t`A random variable with values ${math`${0}, ${1}, ${2}, \ldots`} is a list of probabilities. Pack the list into one function: the [[pgf|probability generating function]] ${math`G_{X}(t) = E(t^{X}) = \sum_{k \ge ${0}} P(X = k)t^{k}`}. The coefficients are at least ${0} and add to ${1}, so the series converges for ${math`|t| \le ${1}`}.` },
    { kind: 'rule', text: t`${math`G(${1}) = ${1}`}, ${math`P(X = k) = \frac{G^{(k)}(${0})}{k!}`}, ${math`E(X) = G'(${1})`}, ${math`E(X(X - ${1})) = G''(${1})`}, and ${math`\operatorname{Var}(X) = G''(${1}) + G'(${1}) - G'(${1})^{${2}}`}.` },
    { kind: 'table', caption: t`Some pgfs, with ${math`q = ${1} - p`}`, head: [t`distribution`, t`${math`G(t)`}`, t`mean`], rows: [
      [t`one trial, success probability ${math`p`}`, t`${math`q + pt`}`, t`${math`p`}`],
      [t`${math`B(n, p)`}`, t`${math`(q + pt)^{n}`}`, t`${math`np`}`],
      [t`${math`\text{Po}(\lambda)`}`, t`${math`e^{\lambda(t - ${1})}`}`, t`${math`\lambda`}`],
      [t`trials to the first success`, t`${math`\frac{pt}{${1} - qt}`}`, t`${math`${1}/p`}`],
    ] },
    { kind: 'p', text: t`The reason to bother is sums. If ${mX} and ${math`Y`} are independent, so are ${math`t^{X}`} and ${math`t^{Y}`}, and ${math`G_{X + Y}(t) = E(t^{X}t^{Y}) = G_{X}(t)G_{Y}(t)`}. A convolution becomes a product: ${math`(q + pt)^{n}`} is ${mn_} independent trials, and ${math`e^{\lambda(t - ${1})}e^{\mu(t - ${1})} = e^{(\lambda + \mu)(t - ${1})}`} adds Poisson variables in one line.` },
    { kind: 'p', text: t`Since a power series determines its coefficients, a pgf determines its distribution: recognise the product and you know the distribution of the sum. Two dice: ${math`\left(\frac{t + \cdots + t^{${6}}}{${6}}\right)^{${2}}`} has coefficient ${TWO[7] as Rational} at ${math`t^{${7}}`}, the chance of a total of ${7}.` },
    { kind: 'p', text: t`Sheet ${3} Q${5} puts it together: the number of trials to the ${math`a`}th success has pgf ${math`\left(\frac{pt}{${1} - qt}\right)^{a}`}, the ${math`a`}th power of the geometric pgf, so it is a sum of ${math`a`} independent waits, with mean ${math`a/p`}.` },
  ],
  examples: [
    workedCambridge(q5pgf),
    worked(moments, { dist: [q(1, 6), q(1, 3), q(1, 2)], ask: 'variance' }, t`Variance from a pgf`),
    worked(sumDist, { x: [q(1, 4), q(1, 2), q(1, 4)], y: [q(2, 3), q(1, 3)], k: 2 }, t`A sum by multiplying pgfs`),
  ],
  generators: [moments, sumDist, family],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['pgf'],
  claims,
  cambridge: [q5mean, q5var, q5proof, schedule],
  gate: ['ia-s3-q5-mean', 'ia-s3-q5-variance', 'ia-s3-q5'],
};
