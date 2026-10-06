/**
 * gf.mgf: the moment generating function M_X(theta) = E(e^(theta X)): moments from its
 * derivatives at 0, products for independent sums, e^(b theta) M_X(a theta) for aX + b,
 * the normal mgf, the continuity theorem (stated), and the Chernoff bound. From the
 * Faculty schedule ("Moment generating functions and statement (no proof) of continuity
 * theorem"), IA Probability Example Sheet 3 Q2(b) and Q3(a) (the exponential Markov bound,
 * optimised for a Poisson variable), and Example Sheet 4 Q6(a) (the log-normal mean and
 * variance). The sheets have no official solutions; every answer is checked by numerical
 * integration, summation, or minimisation.
 */
import { auto, cite, supervision } from '../cambridge';
import { add, int, mul, pick, q, str, sub, type Rational } from '../math';
import { farApart, poissonCdf, sig } from '../partv-d';
import { generator, type Misconception } from '../problem';
import { computedMath, math, t, type Rich } from '../rich';
import { worked, workedCambridge, type TopicContent } from '../topic';

const [mX, mth] = [math`X`, math`\theta`];
const SH3 = 'ia-prob-sheet-3' as const;
const SH4 = 'ia-prob-sheet-4' as const;
const SCHEDULE = cite('tripos-schedules', 'IA Probability, Inequalities and limits: "Moment generating functions and statement (no proof) of continuity theorem"', true);
const ONE = q(1);

// ---------------------------------------------------------------- moments from an mgf

type Fam = 'normal' | 'poisson' | 'binomial' | 'exponential';
interface MomP { fam: Fam; a: Rational; b: Rational; n: number; ask: 'mean' | 'variance' | 'second' }
function famMoments({ fam, a, b, n }: MomP): { mean: Rational; variance: Rational; m: Rich } {
  switch (fam) {
    // M(theta) = exp(a theta + b theta^2): N(a, 2b).
    case 'normal': return { mean: a, variance: mul(q(2), b), m: t`${math`M(\theta) = e^{${a}\theta + ${b}\theta^{${2}}}`}` };
    case 'poisson': return { mean: a, variance: a, m: t`${math`M(\theta) = e^{${a}(e^{\theta} - ${1})}`}` };
    case 'binomial': return { mean: mul(q(n), a), variance: mul(q(n), mul(a, sub(ONE, a))), m: t`${math`M(\theta) = \left(${sub(ONE, a)} + ${a}e^{\theta}\right)^{${n}}`}` };
    case 'exponential': return { mean: q(a.den, a.num), variance: q(a.den * a.den, a.num * a.num), m: t`${math`M(\theta) = \frac{${a}}{${a} - \theta}`} for ${math`\theta < ${a}`}` };
  }
}
const momVal = (p: MomP): Rational => {
  const f = famMoments(p);
  return p.ask === 'mean' ? f.mean : p.ask === 'variance' ? f.variance : add(f.variance, mul(f.mean, f.mean));
};
function momMis(p: MomP): { v: Rational; why: Rich }[] {
  const f = famMoments(p);
  const second = momVal({ ...p, ask: 'second' });
  if (p.ask === 'mean') return [
    { v: second, why: t`${math`M''(${0}) = E(X^{${2}})`}. The mean is the first derivative at ${0}.` },
    { v: f.variance, why: t`That is the variance. The mean is ${math`M'(${0})`}.` },
    { v: ONE, why: t`${math`M(${0}) = ${1}`} for every mgf. Differentiate, then put ${math`\theta = ${0}`}.` },
  ];
  if (p.ask === 'variance') return [
    { v: second, why: t`${math`M''(${0}) = E(X^{${2}})`}. Subtract ${math`M'(${0})^{${2}}`} for the variance.` },
    { v: f.mean, why: t`That is the mean, ${math`M'(${0})`}.` },
    ...(p.fam === 'normal' ? [{ v: p.b, why: t`For ${math`e^{\mu\theta + \sigma^{${2}}\theta^{${2}}/${2}}`} the coefficient of ${math`\theta^{${2}}`} is half the variance: double it.` }] : []),
    ...(p.fam === 'exponential' ? [{ v: f.mean, why: t`The exponential variance is the square of its mean.` }] : []),
  ];
  return [
    { v: f.variance, why: t`That is the variance. ${math`E(X^{${2}}) = \operatorname{Var}(X) + E(X)^{${2}}`}, which is ${math`M''(${0})`}.` },
    { v: mul(f.mean, f.mean), why: t`${math`E(X)^{${2}}`} is not ${math`E(X^{${2}})`}: they differ by the variance.` },
  ];
}
const RATS = [q(1), q(2), q(3), q(1, 2), q(3, 2), q(5, 2), q(1, 3)];
const PRS = [q(1, 2), q(1, 3), q(2, 3), q(1, 4), q(3, 4)];

const moments = generator<MomP>({
  id: 'moments',
  skill: 'Find E(X), E(X^2), and Var(X) from the derivatives of an mgf at 0.',
  params: (rng) => {
    for (;;) {
      const fam = pick(rng, ['normal', 'poisson', 'binomial', 'exponential'] as const);
      const p: MomP = { fam, a: fam === 'binomial' ? pick(rng, PRS) : pick(rng, RATS), b: pick(rng, RATS), n: int(rng, 2, 8), ask: pick(rng, ['mean', 'variance', 'second'] as const) };
      const right = str(momVal(p));
      if (new Set(momMis(p).map((m) => str(m.v)).filter((x) => x !== right)).size >= 2) return p;
    }
  },
  sane: ({ a, n }) => (a.num > 0n && n >= 1 ? null : 'out of range'),
  problem: (p) => {
    const f = famMoments(p);
    const what = p.ask === 'mean' ? math`E(X)` : p.ask === 'variance' ? math`\operatorname{Var}(X)` : math`E(X^{${2}})`;
    const second = momVal({ ...p, ask: 'second' });
    return {
      prompt: t`${mX} has moment generating function ${f.m}. Find ${what}.`,
      answer: { kind: 'exact', expected: str(momVal(p)) },
      solution: [
        t`${math`M'(${0}) = E(X)`} and ${math`M''(${0}) = E(X^{${2}})`}: differentiating ${math`E(e^{\theta X})`} under the expectation brings down a factor ${mX} each time.`,
        t`Here ${math`M'(${0}) = ${f.mean}`} and ${math`M''(${0}) = ${second}`}, so ${math`\operatorname{Var}(X) = ${second} - \left(${f.mean}\right)^{${2}} = ${f.variance}`}. The answer is ${momVal(p)}.`,
      ],
    };
  },
  solve: (p) => {
    // Numerical derivatives of the mgf at 0, recognised as fractions.
    const M = (th: number): number => {
      const [a, b] = [Number(p.a.num) / Number(p.a.den), Number(p.b.num) / Number(p.b.den)];
      switch (p.fam) {
        case 'normal': return Math.exp(a * th + b * th * th);
        case 'poisson': return Math.exp(a * (Math.exp(th) - 1));
        case 'binomial': return (1 - a + a * Math.exp(th)) ** p.n;
        case 'exponential': return a / (a - th);
      }
    };
    const h = 1e-4;
    const d1 = (M(h) - M(-h)) / (2 * h);
    const d2 = (M(h) - 2 * M(0) + M(-h)) / (h * h);
    const v = p.ask === 'mean' ? d1 : p.ask === 'second' ? d2 : d2 - d1 * d1;
    for (let den = 1; den <= 64; den++) { const num = Math.round(v * den); if (Math.abs(num / den - v) < 2e-5 * Math.max(1, Math.abs(v))) return str(q(num, den)); }
    return String(v);
  },
  misconceptions: (p): Misconception[] => momMis(p).map((m) => ({ response: str(m.v), why: m.why })),
});

// ---------------------------------------------------------------- the mgf of aX + b, and of a sum

type LKind = 'lin-normal' | 'lin-poisson' | 'sum-normal' | 'sum-poisson';
interface LinP { kind: LKind; a: number; b: number; m1: number; s1: number; m2: number; s2: number }
function linTexts(p: LinP): { setup: Rich; right: string; alt: string; mis: { r: string; why: Rich }[] } {
  const { a, b, m1, s1, m2, s2 } = p;
  switch (p.kind) {
    case 'lin-normal': return {
      setup: t`${math`X \sim N(${m1}, ${s1 * s1})`} and ${math`Y = ${a}X + ${b}`}`,
      right: `exp(${b}*theta + ${m1}*${a}*theta + ${s1 * s1}*${a * a}*theta^2/2)`,
      alt: `exp(${b + m1 * a}*theta + ${(s1 * s1 * a * a) / 2}*theta^2)`,
      mis: [
        { r: `exp(${b}*theta + ${m1}*theta + ${s1 * s1}*theta^2/2)`, why: t`Scaling by ${a} changes the argument: ${math`M_{aX + b}(\theta) = e^{b\theta}M_{X}(a\theta)`}.` },
        { r: `${a}*exp(${m1}*theta + ${s1 * s1}*theta^2/2) + ${b}`, why: t`An mgf is not linear in ${mX}: ${math`E(e^{\theta(aX + b)}) = e^{b\theta}E(e^{(a\theta)X})`}.` },
        { r: `exp(${m1}*${a}*theta + ${s1 * s1}*${a * a}*theta^2/2)`, why: t`The shift by ${b} multiplies the mgf by ${math`e^{${b}\theta}`}.` },
      ],
    };
    case 'lin-poisson': return {
      setup: t`${math`X \sim \text{Po}(${m1})`} and ${math`Y = ${a}X + ${b}`}`,
      right: `exp(${b}*theta + ${m1}*(exp(${a}*theta) - 1))`,
      alt: `exp(${b}*theta)*exp(${m1}*exp(${a}*theta) - ${m1})`,
      mis: [
        { r: `exp(${b}*theta + ${m1}*(exp(theta) - 1))`, why: t`Scaling by ${a} changes the argument: ${math`M_{aX + b}(\theta) = e^{b\theta}M_{X}(a\theta)`}.` },
        { r: `exp(${m1}*(exp(${a}*theta) - 1))`, why: t`The shift by ${b} multiplies the mgf by ${math`e^{${b}\theta}`}.` },
        { r: `${a}*exp(${m1}*(exp(theta) - 1)) + ${b}`, why: t`An mgf is not linear in ${mX}: ${math`E(e^{\theta(aX + b)}) = e^{b\theta}E(e^{(a\theta)X})`}.` },
      ],
    };
    case 'sum-normal': return {
      setup: t`${math`X \sim N(${m1}, ${s1 * s1})`} and ${math`Z \sim N(${m2}, ${s2 * s2})`} are independent and ${math`Y = X + Z`}`,
      right: `exp(${m1}*theta + ${s1 * s1}*theta^2/2)*exp(${m2}*theta + ${s2 * s2}*theta^2/2)`,
      alt: `exp(${m1 + m2}*theta + ${(s1 * s1 + s2 * s2) / 2}*theta^2)`,
      mis: [
        { r: `exp(${m1}*theta + ${s1 * s1}*theta^2/2) + exp(${m2}*theta + ${s2 * s2}*theta^2/2)`, why: t`For independent variables the mgfs multiply, they do not add.` },
        { r: `exp(${m1 + m2}*theta + ${(s1 + s2) ** 2}*theta^2/2)`, why: t`The variances add, not the standard deviations: the coefficient of ${math`\theta^{${2}}`} is ${math`(\sigma_{${1}}^{${2}} + \sigma_{${2}}^{${2}})/${2}`}.` },
      ],
    };
    case 'sum-poisson': return {
      setup: t`${math`X \sim \text{Po}(${m1})`} and ${math`Z \sim \text{Po}(${m2})`} are independent and ${math`Y = X + Z`}`,
      right: `exp(${m1}*(exp(theta) - 1))*exp(${m2}*(exp(theta) - 1))`,
      alt: `exp(${m1 + m2}*(exp(theta) - 1))`,
      mis: [
        { r: `exp(${m1}*(exp(theta) - 1)) + exp(${m2}*(exp(theta) - 1))`, why: t`For independent variables the mgfs multiply, they do not add.` },
        { r: `exp(${m1 * m2}*(exp(theta) - 1))`, why: t`Multiplying the mgfs adds the exponents: the parameters add, ${m1} plus ${m2}.` },
        { r: `exp(${m1 + m2}*(theta - 1))`, why: t`That is the pgf ${math`e^{\lambda(t - ${1})}`} with ${mth} written for ${math`t`}. The mgf puts ${math`e^{\theta}`} in place of ${math`t`}.` },
      ],
    };
  }
}
const TH_DOM = { theta: { kind: 'real' as const, min: -1, max: 1 } };

const linear = generator<LinP>({
  id: 'linear-and-sums',
  skill: 'Find the mgf of aX + b as e^(b theta) M_X(a theta), and of an independent sum as a product.',
  params: (rng) => ({ kind: pick(rng, ['lin-normal', 'lin-poisson', 'sum-normal', 'sum-poisson'] as const), a: int(rng, 2, 4), b: int(rng, 1, 5), m1: int(rng, 1, 4), s1: int(rng, 1, 3), m2: int(rng, 1, 4), s2: int(rng, 1, 3) }),
  sane: ({ a, s1, s2 }) => (a >= 2 && s1 >= 1 && s2 >= 1 ? null : 'out of range'),
  problem: (p) => {
    const tx = linTexts(p);
    const sum = p.kind.startsWith('sum');
    return {
      prompt: t`${tx.setup}. Give the moment generating function ${math`M_{Y}(\theta)`} as an expression in ${mth}.`,
      answer: { kind: 'expression', expected: tx.right, variables: ['theta'], domains: TH_DOM },
      solution: sum
        ? [
          t`By independence, ${math`M_{X + Z}(\theta) = E(e^{\theta X}e^{\theta Z}) = M_{X}(\theta)M_{Z}(\theta)`}.`,
          t`So ${math`M_{Y}(\theta) = ${computedMath(tx.alt)}`}: the exponents add, and ${math`Y`} has the same kind of distribution with the parameters added.`,
        ]
        : [
          t`${math`M_{aX + b}(\theta) = E(e^{\theta(aX + b)}) = e^{b\theta}E(e^{(a\theta)X}) = e^{b\theta}M_{X}(a\theta)`}.`,
          t`With ${math`a = ${p.a}`} and ${math`b = ${p.b}`}: ${math`M_{Y}(\theta) = ${computedMath(tx.alt)}`}.`,
        ],
    };
  },
  solve: (p) => linTexts(p).alt,
  misconceptions: (p): Misconception[] => linTexts(p).mis.map((m) => ({ response: m.r, why: m.why })),
});

// ---------------------------------------------------------------- the Chernoff bound for a Poisson tail

interface ChP { lambda: number; x: number }
const chernoff = ({ lambda, x }: ChP): number => Math.exp(-x * Math.log(x / lambda) - lambda + x);
const chMis = ({ lambda, x }: ChP): number[] => [lambda / x, Math.exp(-x + lambda * (Math.E - 1)), 1 - poissonCdf(lambda, x - 1)];

const tail = generator<ChP>({
  id: 'chernoff',
  skill: 'Bound a Poisson tail by e^(-theta x) M(theta), with the best theta = log(x / lambda).',
  params: (rng) => {
    for (;;) {
      const lambda = int(rng, 1, 4);
      const p: ChP = { lambda, x: lambda + int(rng, 2, 6) };
      if (chMis(p).filter((m) => farApart(m, chernoff(p), 0.02)).length >= 2) return p;
    }
  },
  sane: ({ lambda, x }) => (x > lambda ? null : 'x must exceed lambda'),
  problem: (p) => {
    const { lambda, x } = p;
    const th = Math.log(x / lambda);
    return {
      prompt: t`${math`X \sim \text{Po}(${lambda})`}, with ${math`M(\theta) = e^{${lambda}(e^{\theta} - ${1})}`}. For every ${math`\theta \ge ${0}`}, ${math`P(X \ge ${x}) \le e^{-\theta \cdot ${x}}M(\theta)`}. Choose ${mth} to make the bound as small as possible and give the bound, to three significant figures.`,
      answer: { kind: 'numeric', expected: sig(chernoff(p), 3), relTol: 0.005 },
      solution: [
        t`Minimise the exponent ${math`-${x}\theta + ${lambda}(e^{\theta} - ${1})`}: its derivative ${math`-${x} + ${lambda}e^{\theta}`} vanishes at ${math`\theta = \ln\frac{${x}}{${lambda}} \approx ${sig(th, 4)}`}.`,
        t`There the bound is ${math`\exp\left(-${x}\ln\frac{${x}}{${lambda}} - ${lambda} + ${x}\right) \approx ${sig(chernoff(p), 3)}`}, the form of Sheet ${3} Q${3}(a). The true tail is ${sig(1 - poissonCdf(lambda, x - 1), 3)}.`,
      ],
    };
  },
  solve: ({ lambda, x }) => {
    // Minimise e^(-theta x) M(theta) numerically by golden-section search.
    const f = (th: number): number => Math.exp(-th * x + lambda * (Math.exp(th) - 1));
    let [lo, hi] = [0, 5];
    const g = (Math.sqrt(5) - 1) / 2;
    for (let i = 0; i < 200; i++) { const a = hi - g * (hi - lo); const b = lo + g * (hi - lo); if (f(a) < f(b)) hi = b; else lo = a; }
    return String(sig(f((lo + hi) / 2), 3));
  },
  misconceptions: (p): Misconception[] => {
    const [markov, one, exact] = chMis(p) as [number, number, number];
    return [
      { response: String(sig(markov, 3)), why: t`That is Markov's bound ${math`E(X)/x`}. Applying Markov to ${math`e^{\theta X}`} and choosing ${mth} gives an exponentially small bound.` },
      { response: String(sig(one, 3)), why: t`That is the bound at ${math`\theta = ${1}`}. Choose the ${mth} that minimises it, ${math`\ln(x/\lambda)`}.` },
      { response: String(sig(exact, 3)), why: t`That is the exact tail probability. The question asks for the Chernoff bound, which is larger.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

const MS_DOM = { mu: { kind: 'real' as const, min: -2, max: 2 }, sigma: { kind: 'real' as const, min: 0.1, max: 1.5 } };
/** E(g(e^Y)) for Y ~ N(mu, sigma^2), by Simpson's rule. */
function lognormalMoment(mu: number, s: number, k: number): number {
  const [a, b, n] = [mu - 14 * s, mu + 14 * s + k * s * s, 20_000];
  const h = (b - a) / n;
  const f = (y: number): number => Math.exp(k * y - ((y - mu) ** 2) / (2 * s * s)) / (s * Math.sqrt(2 * Math.PI));
  let sum = f(a) + f(b);
  for (let i = 1; i < n; i++) sum += (i % 2 === 1 ? 4 : 2) * f(a + i * h);
  return (sum * h) / 3;
}
const LN = [[0, 1], [0.5, 0.4], [-1, 1.2]] as const;
const close = (a: number, b: number): boolean => Math.abs(a - b) <= 1e-7 * Math.max(1, Math.abs(b));

const q6mean = auto({
  id: 'ia-s4-q6-a-mean',
  source: cite(SH4, 'Q6(a)'),
  title: t`The log-normal mean`,
  prompt: t`A random variable ${mX} has a log-normal distribution if ${math`Y = \log X`} is normally distributed. Find the mean of ${mX} when ${math`Y \sim N(\mu, \sigma^{${2}})`}, as an expression in ${math`\mu`} and ${math`\sigma`}.`,
  answer: { kind: 'expression', expected: 'exp(mu + sigma^2/2)', variables: ['mu', 'sigma'], domains: MS_DOM },
  solution: [
    t`${math`X = e^{Y}`}, so ${math`E(X) = E(e^{${1} \cdot Y}) = M_{Y}(${1})`}: the mgf of ${math`Y`} at ${math`\theta = ${1}`}.`,
    t`The normal mgf is ${math`M_{Y}(\theta) = e^{\mu\theta + \sigma^{${2}}\theta^{${2}}/${2}}`}, so ${math`E(X) = e^{\mu + \sigma^{${2}}/${2}}`}.`,
  ],
  reference: 'e^(mu + sigma^2/2)',
  verify: () => {
    for (const [mu, s] of LN) if (!close(lognormalMoment(mu, s, 1), Math.exp(mu + (s * s) / 2))) return `mu = ${mu}, sigma = ${s}`;
    return null;
  },
  misconceptions: [
    { response: 'exp(mu)', why: t`${math`E(e^{Y}) \ne e^{E(Y)}`}: the exponential is convex, and the spread adds ${math`\sigma^{${2}}/${2}`} to the exponent.` },
    { response: 'exp(mu + sigma^2)', why: t`The normal mgf has ${math`\sigma^{${2}}\theta^{${2}}/${2}`} in the exponent: at ${math`\theta = ${1}`} that is ${math`\sigma^{${2}}/${2}`}.` },
  ],
});

const q6var = auto({
  id: 'ia-s4-q6-a-variance',
  source: cite(SH4, 'Q6(a)'),
  title: t`The log-normal variance`,
  prompt: t`${mX} is log-normal with ${math`\log X \sim N(\mu, \sigma^{${2}})`}. Find ${math`\operatorname{Var}(X)`} as an expression in ${math`\mu`} and ${math`\sigma`}.`,
  answer: { kind: 'expression', expected: 'exp(2*mu + sigma^2)*(exp(sigma^2) - 1)', variables: ['mu', 'sigma'], domains: MS_DOM },
  solution: [
    t`${math`E(X^{${2}}) = E(e^{${2}Y}) = M_{Y}(${2}) = e^{${2}\mu + ${2}\sigma^{${2}}}`}.`,
    t`${math`\operatorname{Var}(X) = e^{${2}\mu + ${2}\sigma^{${2}}} - \left(e^{\mu + \sigma^{${2}}/${2}}\right)^{${2}} = e^{${2}\mu + \sigma^{${2}}}\left(e^{\sigma^{${2}}} - ${1}\right)`}.`,
  ],
  reference: 'exp(2 mu + 2 sigma^2) - exp(2 mu + sigma^2)',
  verify: () => {
    for (const [mu, s] of LN) {
      const v = lognormalMoment(mu, s, 2) - lognormalMoment(mu, s, 1) ** 2;
      if (!close(v, Math.exp(2 * mu + s * s) * (Math.exp(s * s) - 1))) return `mu = ${mu}, sigma = ${s}`;
    }
    return null;
  },
  misconceptions: [
    { response: 'exp(2*mu + 2*sigma^2)', why: t`That is ${math`E(X^{${2}})`}. Subtract ${math`E(X)^{${2}} = e^{${2}\mu + \sigma^{${2}}}`}.` },
    { response: 'exp(2*mu)*(exp(sigma^2) - 1)', why: t`${math`E(X)^{${2}} = e^{${2}\mu + \sigma^{${2}}}`}: the factor ${math`e^{\sigma^{${2}}}`} belongs with it.` },
  ],
});

const XL_DOM = { lambda: { kind: 'real' as const, min: 0.5, max: 2 }, x: { kind: 'real' as const, min: 2, max: 6 } };
const q3beta = auto({
  id: 'ia-s3-q3-a-beta',
  source: cite(SH3, 'Q3(a)', true),
  title: t`The best ${math`\beta`} for a Poisson tail`,
  prompt: t`${mX} is Poisson with parameter ${math`\lambda`}, so ${math`E(e^{\beta X}) = e^{\lambda(e^{\beta} - ${1})}`}. Question ${2}(b) gives ${math`P(X \ge x) \le E(e^{\beta X})e^{-\beta x}`} for all ${math`\beta \ge ${0}`}. For ${math`x \ge \lambda`}, which ${math`\beta`} makes this bound smallest? Give an expression in ${math`x`} and ${math`\lambda`}.`,
  answer: { kind: 'expression', expected: 'ln(x/lambda)', variables: ['x', 'lambda'], domains: XL_DOM },
  solution: [
    t`The bound is ${math`\exp\left(\lambda(e^{\beta} - ${1}) - \beta x\right)`}. Its exponent has derivative ${math`\lambda e^{\beta} - x`} in ${math`\beta`}, which is ${0} at ${math`e^{\beta} = x/\lambda`}, and the exponent is convex, so this is the minimum.`,
    t`So ${math`\beta = \log(x/\lambda)`}, which is ${math`\ge ${0}`} because ${math`x \ge \lambda`}. Substituting gives the sheet's bound ${math`\exp\{-x\log(x/\lambda) - \lambda + x\}`}.`,
  ],
  reference: 'ln(x) - ln(lambda)',
  verify: () => {
    for (const [l, x] of [[1, 3], [0.7, 2.5], [2, 5.5]] as const) {
      const f = (b: number): number => l * (Math.exp(b) - 1) - b * x;
      let [lo, hi] = [0, 5];
      const g = (Math.sqrt(5) - 1) / 2;
      for (let i = 0; i < 200; i++) { const a = hi - g * (hi - lo); const b = lo + g * (hi - lo); if (f(a) < f(b)) hi = b; else lo = a; }
      if (Math.abs((lo + hi) / 2 - Math.log(x / l)) > 1e-6) return `lambda = ${l}, x = ${x}`;
      if (Math.abs(Math.exp(f((lo + hi) / 2)) - Math.exp(-x * Math.log(x / l) - l + x)) > 1e-9) return `the bound at lambda = ${l}, x = ${x}`;
    }
    return null;
  },
  misconceptions: [
    { response: 'x/lambda', why: t`That is ${math`e^{\beta}`} at the minimum. Take the logarithm.` },
    { response: 'ln(lambda/x)', why: t`Check the sign: ${math`\beta \ge ${0}`} needs ${math`x/\lambda \ge ${1}`}, so ${math`\beta = \log(x/\lambda)`}.` },
  ],
});

const q2b = supervision({
  id: 'ia-s3-q2-b',
  source: cite(SH3, 'Q2(b)'),
  title: t`The exponential Markov bound`,
  prompt: t`Let ${mX} be a random variable. Show that, for all ${math`\beta \ge ${0}`}, ${math`P(X \ge x) \le E(e^{\beta X})e^{-\beta x}`}.`,
  writeUp: 'proof',
});

const q3 = supervision({
  id: 'ia-s3-q3',
  source: cite(SH3, 'Q3'),
  title: t`A Poisson tail, bounded and estimated`,
  prompt: t`Let ${mX} be Poisson with parameter ${math`\lambda \in (${0}, \infty)`}. (a) By optimizing the estimate of Q${2}(b) over ${math`\beta`}, show that for all ${math`x \ge \lambda`}, ${math`P(X \ge x) \le \exp\{-x\log(x/\lambda) - \lambda + x\}`}. (b) Show that, for integers ${math`x`}, as ${math`x \to \infty`}, ${math`P(X = x) \sim \frac{${1}}{\sqrt{${2}\pi x}}\exp\{-x\log(x/\lambda) - \lambda + x\}`}.`,
  writeUp: 'proof',
});

const continuity = supervision({
  id: 'schedule-continuity',
  source: SCHEDULE,
  title: t`The continuity theorem at work`,
  prompt: t`State the continuity theorem for moment generating functions. Show that the mgf of ${math`B(n, \lambda/n)`} tends to the mgf of ${math`\text{Po}(\lambda)`} as ${math`n \to \infty`}, and explain what the continuity theorem lets you conclude, and why it does not by itself give ${math`P(B(n, \lambda/n) = k) \to e^{-\lambda}\lambda^{k}/k!`} without a further remark about integer-valued variables.`,
  writeUp: 'explanation',
});

// ---------------------------------------------------------------- lesson

const LT = 2;
const XT = 6;

export const mgf: TopicContent = {
  topicId: 'gf.mgf',
  goal: t`Use ${math`M_{X}(\theta) = E(e^{\theta X})`} for moments and sums, bound tails with it, and state the continuity theorem.`,
  lesson: [
    { kind: 'p', text: t`A pgf needs values ${math`${0}, ${1}, ${2}, \ldots`}. For any real ${mX}, put ${math`t = e^{\theta}`}: the [[mgf|moment generating function]] is ${math`M_{X}(\theta) = E(e^{\theta X})`}, which may be infinite for some ${mth}; the useful case is when it is finite on an interval around ${0}.` },
    { kind: 'rule', text: t`If ${math`M_{X}`} is finite on ${math`(-\delta, \delta)`}: ${math`M_{X}^{(k)}(${0}) = E(X^{k})`}; ${math`M_{X}`} determines the distribution; ${math`M_{X + Y} = M_{X}M_{Y}`} for independent ${mX} and ${math`Y`}; and ${math`M_{aX + b}(\theta) = e^{b\theta}M_{X}(a\theta)`}.` },
    { kind: 'table', caption: t`Moment generating functions`, head: [t`distribution`, t`${math`M(\theta)`}`], rows: [
      [t`${math`\text{Po}(\lambda)`}`, t`${math`e^{\lambda(e^{\theta} - ${1})}`}`],
      [t`${math`B(n, p)`}`, t`${math`(${1} - p + pe^{\theta})^{n}`}`],
      [t`exponential, rate ${math`\lambda`}`, t`${math`\frac{\lambda}{\lambda - \theta}`} for ${math`\theta < \lambda`}`],
      [t`${math`N(\mu, \sigma^{${2}})`}`, t`${math`e^{\mu\theta + \sigma^{${2}}\theta^{${2}}/${2}}`}`],
    ] },
    { kind: 'p', text: t`The normal one comes from completing the square: ${math`\int e^{\theta z}\frac{e^{-z^{${2}}/${2}}}{\sqrt{${2}\pi}}\,dz = e^{\theta^{${2}}/${2}}\int \frac{e^{-(z - \theta)^{${2}}/${2}}}{\sqrt{${2}\pi}}\,dz = e^{\theta^{${2}}/${2}}`}, then ${math`X = \mu + \sigma Z`}. Sheet ${4} Q${6}(a) uses it at once: if ${math`\log X \sim N(\mu, \sigma^{${2}})`} then ${math`E(X) = M_{\log X}(${1}) = e^{\mu + \sigma^{${2}}/${2}}`}.` },
    { kind: 'p', text: t`The [[continuity-theorem|continuity theorem]], stated without proof in the course: if ${math`M_{X_{n}}(\theta) \to M_{X}(\theta)`} on an interval around ${0}, then ${math`P(X_{n} \le x) \to P(X \le x)`} wherever the limit is continuous in ${math`x`}. It is how the central limit theorem is proved.` },
    { kind: 'p', text: t`Tails: Markov's inequality applied to ${math`e^{\theta X}`} gives the [[chernoff-bound|Chernoff bound]] ${math`P(X \ge x) \le e^{-\theta x}M_{X}(\theta)`} for every ${math`\theta \ge ${0}`} (Sheet ${3} Q${2}(b)). For ${math`\text{Po}(${LT})`} and ${math`x = ${XT}`}, the best ${mth} is ${math`\ln ${XT / LT}`}, and the bound is ${sig(chernoff({ lambda: LT, x: XT }), 3)}, against Markov's ${sig(LT / XT, 3)} and the true ${sig(1 - poissonCdf(LT, XT - 1), 3)}.` },
  ],
  examples: [
    workedCambridge(q6mean),
    worked(moments, { fam: 'normal', a: q(3), b: q(2), n: 2, ask: 'variance' }, t`A variance from a normal mgf`),
    worked(linear, { kind: 'lin-normal', a: 2, b: 1, m1: 1, s1: 3, m2: 1, s2: 1 }, t`The mgf of ${math`${2}X + ${1}`}`),
  ],
  generators: [moments, linear, tail],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['mgf', 'continuity-theorem', 'chernoff-bound'],
  cambridge: [q6var, q3beta, q2b, q3, continuity],
  gate: ['ia-s4-q6-a-variance', 'ia-s3-q3-a-beta', 'ia-s3-q2-b', 'ia-s3-q3'],
};
