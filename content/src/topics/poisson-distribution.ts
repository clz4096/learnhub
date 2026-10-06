/**
 * prob.poisson-distribution: X ~ Po(lambda) has P(X = k) = e^(-lambda) lambda^k / k!, the
 * probabilities add to 1 by the exponential series, and the mean and variance are both
 * lambda. From the STEP Support STEP 2 Statistics topic notes (page 2: mean equals variance;
 * page 4: the conditions for a Poisson model, the sum by the exponential series, "you may
 * like to show that E(X) = lambda") and STEP 2 Statistics Q1 (2003 S2 Q13, the Poisson
 * distribution without its zero), whose hints and solutions give A, the mean, and 0.04.
 */
import { auto, cite, supervision } from '../cambridge';
import { int, pick, q, str, type Rational } from '../math';
import { fact, farApart, poissonCdf, poissonPmf, poissonPmfRec, sig } from '../partv-d';
import { generator, type Misconception } from '../problem';
import { computedTex, math, t, type Rich } from '../rich';
import { worked, workedCambridge, type TopicContent } from '../topic';

const [mX, mk, ml] = [math`X`, math`k`, math`\lambda`];
const S2 = 'step-s2-stats' as const;

interface Ctx { what: Rich; per: Rich }
const CONTEXTS: readonly Ctx[] = [
  { what: t`texts George receives`, per: t`in an hour` },
  { what: t`misprints`, per: t`on a page` },
  { what: t`emails arriving`, per: t`in ten minutes` },
  { what: t`goals scored`, per: t`in a match` },
  { what: t`cars passing a checkpoint`, per: t`in a minute` },
  { what: t`meteors seen`, per: t`in an hour of watching` },
];
const LAMBDAS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6];
const ctxPrompt = (c: Ctx, lambda: number): Rich => t`The number ${mX} of ${c.what} ${c.per} has a Poisson distribution with mean ${math`\lambda = ${lambda}`}.`;
const s4 = (x: number): number => sig(x, 4);
/** Numeric answers to four significant figures, with room for the last digit. */
const ans4 = (x: number) => ({ kind: 'numeric' as const, expected: s4(x), relTol: 0.002 });

// ---------------------------------------------------------------- one probability

interface PmfP { c: number; lambda: number; k: number }
const pmfMis = ({ lambda, k }: PmfP): number[] => [lambda ** k / fact(k), Math.exp(-lambda) * lambda ** k, poissonCdf(lambda, k)];

const pmf = generator<PmfP>({
  id: 'pmf',
  skill: 'Compute one Poisson probability, e^(-lambda) lambda^k / k!.',
  params: (rng) => {
    for (;;) {
      const p: PmfP = { c: int(rng, 0, CONTEXTS.length - 1), lambda: pick(rng, LAMBDAS), k: int(rng, 2, 6) };
      if (pmfMis(p).filter((m) => farApart(m, poissonPmf(p.lambda, p.k))).length >= 2) return p;
    }
  },
  sane: ({ c, lambda, k }) => (c < CONTEXTS.length && lambda > 0 && k >= 2 ? null : 'out of range'),
  problem: ({ c, lambda, k }) => ({
    prompt: t`${ctxPrompt(CONTEXTS[c] as Ctx, lambda)} Find ${math`P(X = ${k})`}, to four significant figures.`,
    answer: ans4(poissonPmf(lambda, k)),
    solution: [
      t`${math`P(X = k) = \frac{e^{-\lambda}\lambda^{k}}{k!}`}, so ${math`P(X = ${k}) = \frac{e^{-${lambda}} \times ${lambda}^{${k}}}{${k}!}`}.`,
      t`${math`e^{-${lambda}} \approx ${sig(Math.exp(-lambda), 6)}`}, ${math`${lambda}^{${k}} = ${sig(lambda ** k, 6)}`}, and ${math`${k}! = ${fact(k)}`}, so the probability is about ${s4(poissonPmf(lambda, k))}.`,
    ],
  }),
  solve: ({ lambda, k }) => String(s4(poissonPmfRec(lambda, k))),
  misconceptions: (p): Misconception[] => {
    const [noExp, noFact, cum] = pmfMis(p) as [number, number, number];
    return [
      { response: String(s4(noExp)), why: t`The factor ${math`e^{-\lambda}`} is part of every Poisson probability: without it the probabilities add to ${math`e^{\lambda}`}, not ${1}.` },
      { response: String(s4(noFact)), why: t`Divide by ${math`${p.k}!`}: the probability is ${math`e^{-\lambda}\lambda^{k}/k!`}.` },
      { response: String(s4(cum)), why: t`That is ${math`P(X \le ${p.k})`}, the sum of the probabilities up to ${p.k}. The question asks for exactly ${p.k}.` },
    ];
  },
});

// ---------------------------------------------------------------- at least, at most

interface TailP { c: number; lambda: number; k: number; dir: 'least' | 'most' }
const tailVal = ({ lambda, k, dir }: TailP): number => (dir === 'least' ? 1 - poissonCdf(lambda, k - 1) : poissonCdf(lambda, k));
const tailMis = ({ lambda, k, dir }: TailP): number[] => (dir === 'least'
  ? [1 - poissonCdf(lambda, k), poissonPmf(lambda, k), poissonCdf(lambda, k - 1)]
  : [poissonCdf(lambda, k - 1), poissonPmf(lambda, k), 1 - poissonCdf(lambda, k)]);

const tail = generator<TailP>({
  id: 'at-least-at-most',
  skill: 'Add Poisson probabilities for "at most k", or use the complement for "at least k".',
  params: (rng) => {
    for (;;) {
      const p: TailP = { c: int(rng, 0, CONTEXTS.length - 1), lambda: pick(rng, LAMBDAS), k: int(rng, 1, 4), dir: pick(rng, ['least', 'most'] as const) };
      if (tailMis(p).filter((m) => farApart(m, tailVal(p))).length >= 2) return p;
    }
  },
  sane: ({ c, lambda, k }) => (c < CONTEXTS.length && lambda > 0 && k >= 1 ? null : 'out of range'),
  problem: (p) => {
    const { c, lambda, k, dir } = p;
    const terms = Array.from({ length: dir === 'least' ? k : k + 1 }, (_, j) => j);
    const sum = poissonCdf(lambda, terms.length - 1);
    const sumTex = computedTex(terms.map((j) => `\\frac{${lambda}^{${j}}}{${j}!}`).join(' + '));
    return {
      prompt: t`${ctxPrompt(CONTEXTS[c] as Ctx, lambda)} Find the probability that ${mX} is at ${dir} ${k}, to four significant figures.`,
      answer: ans4(tailVal(p)),
      solution: dir === 'least'
        ? [
          t`At least ${k} is the complement of at most ${k - 1}: ${math`P(X \ge ${k}) = ${1} - P(X \le ${k - 1})`}, a finite sum instead of an infinite one.`,
          t`${math`P(X \le ${k - 1}) = e^{-${lambda}}\left(${sumTex}\right) \approx ${sig(sum, 6)}`}, so the answer is about ${s4(tailVal(p))}.`,
        ]
        : [
          t`At most ${k} means ${mX} is one of ${math`${0}, \ldots, ${k}`}: add those probabilities.`,
          t`${math`P(X \le ${k}) = e^{-${lambda}}\left(${sumTex}\right) \approx ${s4(sum)}`}.`,
        ],
    };
  },
  solve: ({ lambda, k, dir }) => {
    // Term by term with the recurrence, as a check on the closed sums.
    let s = 0;
    const upto = dir === 'least' ? k - 1 : k;
    for (let j = 0; j <= upto; j++) s += poissonPmfRec(lambda, j);
    return String(s4(dir === 'least' ? 1 - s : s));
  },
  misconceptions: (p): Misconception[] => {
    const [off, exact, other] = tailMis(p) as [number, number, number];
    return p.dir === 'least'
      ? [
        { response: String(s4(off)), why: t`${math`${1} - P(X \le ${p.k})`} is ${math`P(X > ${p.k})`}: it leaves out ${math`X = ${p.k}`}. Subtract ${math`P(X \le ${p.k - 1})`}.` },
        { response: String(s4(exact)), why: t`That is exactly ${p.k}. At least ${p.k} includes every larger value too.` },
        { response: String(s4(other)), why: t`That is ${math`P(X \le ${p.k - 1})`}, the complement. Subtract it from ${1}.` },
      ]
      : [
        { response: String(s4(off)), why: t`That stops at ${p.k - 1}: "at most ${p.k}" includes ${math`X = ${p.k}`}.` },
        { response: String(s4(exact)), why: t`That is exactly ${p.k}. At most ${p.k} includes every smaller value too, down to ${0}.` },
        { response: String(s4(other)), why: t`That is ${math`P(X > ${p.k})`}, the other side.` },
      ];
  },
});

// ---------------------------------------------------------------- lambda from a ratio of probabilities

interface RatioP { lambda: Rational; a: number; d: number }
const RLAMBDAS = [q(1), q(2), q(3), q(4), q(5), q(6), q(1, 2), q(3, 2), q(5, 2)];
const ratioC = ({ lambda, a, d }: RatioP): Rational => {
  // P(X = a + d) / P(X = a) = lambda^d a! / (a + d)!.
  let c = q(1);
  for (let i = 1; i <= d; i++) c = q(c.num * lambda.num, c.den * lambda.den * BigInt(a + i));
  return c;
};
const ratioMis = (p: RatioP): Rational[] => {
  const c = ratioC(p);
  let fall = 1n;
  for (let i = 1; i <= p.d; i++) fall *= BigInt(p.a + i);
  return [c, q(c.num, c.den * fall), q(c.num * fall, c.den)];
};

const ratio = generator<RatioP>({
  id: 'lambda-from-ratio',
  skill: 'Find lambda from a relation between two Poisson probabilities, using P(X = k) / P(X = k - 1) = lambda / k.',
  params: (rng) => {
    for (;;) {
      const p: RatioP = { lambda: pick(rng, RLAMBDAS), a: int(rng, 1, 4), d: int(rng, 1, 2) };
      const right = str(p.lambda);
      if (new Set(ratioMis(p).map(str).filter((m) => m !== right)).size >= 2) return p;
    }
  },
  sane: ({ a, d }) => (a >= 1 && d >= 1 && d <= 2 ? null : 'out of range'),
  problem: (p) => {
    const { lambda, a, d } = p;
    const c = ratioC(p);
    const b = a + d;
    let fall = 1;
    for (let i = 1; i <= d; i++) fall *= a + i;
    const lhs = q(c.num * BigInt(fall), c.den);
    return {
      prompt: t`${mX} has a Poisson distribution with mean ${ml}, and ${math`P(X = ${b}) = ${c} \times P(X = ${a})`}. Find ${ml}.`,
      answer: { kind: 'exact', expected: str(lambda) },
      solution: [
        t`Divide the probabilities: the factors ${math`e^{-\lambda}`} cancel, and ${math`\frac{P(X = ${b})}{P(X = ${a})} = \frac{\lambda^{${b}} / ${b}!}{\lambda^{${a}} / ${a}!} = \frac{\lambda^{${d}}}{${computedTex(d === 1 ? `${b}` : `${a + 1} \\times ${b}`)}}`}.`,
        d === 1
          ? t`So ${math`\frac{\lambda}{${b}} = ${c}`}, and ${math`\lambda = ${lambda}`}.`
          : t`So ${math`\lambda^{${2}} = ${c} \times ${fall} = ${lhs}`}, and as ${math`\lambda > ${0}`}, ${math`\lambda = ${lambda}`}.`,
      ],
    };
  },
  solve: (p) => {
    // Search: the lambda among simple fractions whose probabilities have the stated ratio.
    const c = ratioC(p);
    for (let den = 1; den <= 12; den++) {
      for (let num = 1; num <= 120; num++) {
        const l = num / den;
        const r = poissonPmf(l, p.a + p.d) / poissonPmf(l, p.a);
        if (Math.abs(r - Number(c.num) / Number(c.den)) < 1e-12 * Math.max(1, r)) return str(q(num, den));
      }
    }
    return 'none';
  },
  misconceptions: (p): Misconception[] => {
    const [c, inv, noRoot] = ratioMis(p) as [Rational, Rational, Rational];
    const out: Misconception[] = [
      { response: str(c), why: t`The ratio is not ${ml} itself: the factorials do not cancel. ${math`\frac{P(X = k)}{P(X = k - ${1})} = \frac{\lambda}{k}`}.` },
      { response: str(inv), why: t`The factorial ratio is upside down: ${math`\frac{\lambda^{b}/b!}{\lambda^{a}/a!} = \lambda^{b - a}\frac{a!}{b!}`}, so multiply ${c} by ${math`\frac{b!}{a!}`}.` },
    ];
    if (p.d === 2) out.push({ response: str(noRoot), why: t`That is ${math`\lambda^{${2}}`}. Take the positive square root.` });
    return out;
  },
});

// ---------------------------------------------------------------- Cambridge problems

const L_DOM = { lambda: { kind: 'real' as const, min: 0.2, max: 6 } };
const A_EXPR = '1/(1 - e^(-lambda))';
const MU_EXPR = 'lambda/(1 - e^(-lambda))';
const VAR_EXPR = 'lambda(1 + lambda)/(1 - e^(-lambda)) - lambda^2/(1 - e^(-lambda))^2';
/** The truncated series, numerically, for the verifications: sum over k >= 1 of f(k) lambda^k e^(-lambda) / k!. */
const series = (lambda: number, f: (k: number) => number): number => { let s = 0; for (let k = 1; k < 400; k++) s += f(k) * poissonPmf(lambda, k); return s; };
const TEST_L = [0.3, 1, 2.5, 7, 15];
const close = (a: number, b: number): boolean => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));
const q1Intro = t`The random variable ${mX} takes the values ${math`k = ${1}, ${2}, ${3}, \ldots`}, and has probability distribution ${math`P(X = k) = \frac{A\lambda^{k}e^{-\lambda}}{k!}`}, where ${ml} is a positive constant.`;

const q1A = auto({
  id: 's2-q1-a',
  source: cite(S2, 'Q1 (2003 S2 Q13)', true),
  title: t`The Poisson distribution without its zero: the constant`,
  prompt: t`${q1Intro} Find ${math`A`} in terms of ${ml}.`,
  answer: { kind: 'expression', expected: A_EXPR, variables: ['lambda'], domains: L_DOM },
  solution: [
    t`The probabilities add to ${1}: ${math`A e^{-\lambda}\sum_{k \ge ${1}} \frac{\lambda^{k}}{k!} = ${1}`}.`,
    t`The sum is the exponential series without its ${math`k = ${0}`} term: ${math`\sum_{k \ge ${1}} \frac{\lambda^{k}}{k!} = e^{\lambda} - ${1}`}. So ${math`A e^{-\lambda}(e^{\lambda} - ${1}) = A(${1} - e^{-\lambda}) = ${1}`}, and ${math`A = (${1} - e^{-\lambda})^{-${1}}`}.`,
  ],
  reference: '1/(1 - exp(-lambda))',
  verify: () => {
    for (const l of TEST_L) if (!close(series(l, () => 1) / (1 - Math.exp(-l)), 1)) return `the probabilities do not add to 1 at lambda = ${l}`;
    return null;
  },
  misconceptions: [
    { response: '1 - e^(-lambda)', why: t`That is ${math`P(X \ge ${1})`} for a Poisson variable. ${math`A`} is its reciprocal, so that the probabilities add to ${1}.` },
    { response: '1', why: t`The values start at ${1}, not ${0}: the ${math`k = ${0}`} term ${math`e^{-\lambda}`} is missing, so ${math`A`} must make up for it.` },
  ],
  official: { source: cite('step-s2-stats-solutions', 'Q1'), answer: '(1 - e^(-lambda))^(-1)', agrees: true },
});

const q1Mu = auto({
  id: 's2-q1-mean',
  source: cite(S2, 'Q1 (2003 S2 Q13)', true),
  title: t`The Poisson distribution without its zero: the mean`,
  prompt: t`${q1Intro} Find the mean ${math`\mu`} of ${mX} in terms of ${ml}.`,
  answer: { kind: 'expression', expected: MU_EXPR, variables: ['lambda'], domains: L_DOM },
  solution: [
    t`${math`\mu = \sum_{k \ge ${1}} k\frac{A\lambda^{k}e^{-\lambda}}{k!} = A e^{-\lambda}\lambda\sum_{k \ge ${1}} \frac{\lambda^{k - ${1}}}{(k - ${1})!} = A e^{-\lambda}\lambda e^{\lambda} = A\lambda`}.`,
    t`With ${math`A = (${1} - e^{-\lambda})^{-${1}}`}, ${math`\mu = \frac{\lambda}{${1} - e^{-\lambda}}`}.`,
  ],
  reference: 'lambda/(1 - exp(-lambda))',
  verify: () => {
    for (const l of TEST_L) if (!close(series(l, (k) => k) / (1 - Math.exp(-l)), l / (1 - Math.exp(-l)))) return `the mean at lambda = ${l}`;
    return null;
  },
  misconceptions: [{ response: 'lambda', why: t`${ml} is the mean of the full Poisson distribution. Removing the value ${0} pushes the mean up, by the factor ${math`A`}.` }],
  official: { source: cite('step-s2-stats-solutions', 'Q1'), answer: 'lambda/(1 - e^(-lambda))', agrees: true },
});

const q1Var = auto({
  id: 's2-q1-variance',
  source: cite(S2, 'Q1 (2003 S2 Q13)', true),
  title: t`The Poisson distribution without its zero: the variance`,
  prompt: t`${q1Intro} Find ${math`\operatorname{Var}(X)`} in terms of ${ml} alone.`,
  answer: { kind: 'expression', expected: VAR_EXPR, variables: ['lambda'], domains: L_DOM },
  solution: [
    t`As for the mean, ${math`E(X(X - ${1})) = A e^{-\lambda}\lambda^{${2}} e^{\lambda} = A\lambda^{${2}}`}, so ${math`E(X^{${2}}) = A\lambda^{${2}} + A\lambda = A\lambda(${1} + \lambda)`}.`,
    t`${math`\operatorname{Var}(X) = E(X^{${2}}) - \mu^{${2}} = \mu(${1} + \lambda) - \mu^{${2}} = \mu(${1} - \mu + \lambda)`}, with ${math`\mu = \frac{\lambda}{${1} - e^{-\lambda}}`}.`,
  ],
  reference: 'lambda(1 + lambda)/(1 - exp(-lambda)) - (lambda/(1 - exp(-lambda)))^2',
  verify: () => {
    for (const l of TEST_L) {
      const A = 1 / (1 - Math.exp(-l));
      const m = A * series(l, (k) => k);
      const v = A * series(l, (k) => k * k) - m * m;
      if (!close(v, (l * (1 + l)) * A - (l * A) ** 2)) return `the variance at lambda = ${l}`;
    }
    return null;
  },
  misconceptions: [{ response: 'lambda', why: t`Mean equals variance only for the full Poisson distribution. Compute ${math`E(X^{${2}}) - \mu^{${2}}`} for this one.` }],
  // The solutions give Var(X) = mu(1 - mu + lambda) with mu = lambda/(1 - e^(-lambda)); typed here with mu substituted.
  official: { source: cite('step-s2-stats-solutions', 'Q1'), answer: 'lambda/(1 - e^(-lambda)) * (1 - lambda/(1 - e^(-lambda)) + lambda)', agrees: true },
});

const q1Show = supervision({
  id: 's2-q1-show',
  source: cite(S2, 'Q1 (2003 S2 Q13)'),
  title: t`The Poisson distribution without its zero, in full`,
  prompt: t`${q1Intro} Show that ${math`A = (${1} - e^{-\lambda})^{-${1}}`}. Find the mean ${math`\mu`} in terms of ${ml} and show that ${math`\operatorname{Var}(X) = \mu(${1} - \mu + \lambda)`}. Deduce that ${math`\lambda < \mu < ${1} + \lambda`}.`,
  writeUp: 'proof',
  official: cite('step-s2-stats-solutions', 'Q1'),
});

const q1Normal = supervision({
  id: 's2-q1-normal',
  source: cite(S2, 'Q1 (2003 S2 Q13)'),
  title: t`A normal approximation for ${math`\lambda = ${100}`}`,
  prompt: t`For the distribution of Q${1} with ${math`\lambda = ${100}`}, use a normal approximation to find ${math`P(X = \lambda)`}, to two decimal places. Explain why the missing zero hardly matters here, which normal distribution you use, and why the continuity correction is needed.`,
  writeUp: 'explanation',
  official: cite('step-s2-stats-solutions', 'Q1'),
});

const notesMean = supervision({
  id: 's2-notes-mean',
  source: cite('step-s2-stats-notes', 'page 4'),
  title: t`The mean of a Poisson distribution`,
  prompt: t`For ${math`X \sim \text{Po}(\lambda)`}, show that ${math`E(X) = \lambda`}, and then that ${math`\operatorname{Var}(X) = \lambda`}. Hint: compute ${math`E(X(X - ${1}))`} first, by the same shift of the summation index.`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

const L25 = 2.5;
const ROW = [0, 1, 2, 3, 4, 5];

export const poissonDistribution: TopicContent = {
  topicId: 'prob.poisson-distribution',
  goal: t`Compute Poisson probabilities ${math`\frac{e^{-\lambda}\lambda^{k}}{k!}`}, explain why they add to ${1}, and use the fact that the mean and the variance are both ${ml}.`,
  lesson: [
    { kind: 'p', text: t`Some counts have no fixed number of trials: texts in an hour, misprints on a page, cars past a checkpoint in a minute. The STEP Support notes give the two conditions for a Poisson model: the occurrences are independent, and the mean number in an interval is proportional to the length of the interval.` },
    { kind: 'rule', text: t`The [[poisson-distribution|Poisson distribution]] with mean ${ml}: ${math`X \sim \text{Po}(\lambda)`} takes the values ${math`${0}, ${1}, ${2}, \ldots`} with ${math`P(X = k) = \frac{e^{-\lambda}\lambda^{k}}{k!}`}.` },
    { kind: 'p', text: t`The probabilities add to ${1} because of the exponential series ${math`e^{\lambda} = \sum_{k \ge ${0}} \frac{\lambda^{k}}{k!}`}: ${math`\sum_{k} \frac{e^{-\lambda}\lambda^{k}}{k!} = e^{-\lambda}e^{\lambda} = ${1}`}. Every Poisson calculation leans on that series.` },
    { kind: 'p', text: t`The mean: in ${math`\sum_{k} k\frac{e^{-\lambda}\lambda^{k}}{k!}`} the ${math`k = ${0}`} term vanishes, and ${math`\frac{k}{k!} = \frac{${1}}{(k - ${1})!}`}, so the sum is ${math`\lambda\sum_{k \ge ${1}} \frac{e^{-\lambda}\lambda^{k - ${1}}}{(k - ${1})!} = \lambda`}. The same shift twice gives ${math`E(X(X - ${1})) = \lambda^{${2}}`}, so ${math`\operatorname{Var}(X) = \lambda^{${2}} + \lambda - \lambda^{${2}} = \lambda`}: for a Poisson distribution the mean equals the variance.` },
    { kind: 'p', text: t`To compute, use the ratio ${math`\frac{P(X = k)}{P(X = k - ${1})} = \frac{\lambda}{k}`}: the probabilities rise while ${math`k < \lambda`} and fall after. With ${math`\lambda = ${L25}`}, ${math`P(X = k)`} for ${math`k = ${0}, \ldots, ${5}`} is about ${computedTex(ROW.map((k) => String(s4(poissonPmf(L25, k)))).join(',\\ '))}: the most likely value is ${2}.` },
    { kind: 'p', text: t`For "at least" questions use the complement: ${math`P(X \ge ${1}) = ${1} - e^{-\lambda}`}. STEP ${2} Q${1} removes the value ${0} altogether and rescales the rest, which is the worked example.` },
  ],
  examples: [
    workedCambridge(q1A),
    worked(pmf, { c: 0, lambda: 2, k: 3 }, t`Three texts in an hour`),
    worked(tail, { c: 1, lambda: 1.5, k: 2, dir: 'least' }, t`At least two misprints`),
  ],
  generators: [pmf, tail, ratio],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['poisson-distribution'],
  cambridge: [q1Mu, q1Var, q1Show, q1Normal, notesMean],
  gate: ['s2-q1-mean', 's2-q1-variance', 's2-q1-show', 's2-q1-normal', 's2-notes-mean'],
};
