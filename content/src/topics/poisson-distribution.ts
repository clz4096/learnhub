/**
 * prob.poisson-distribution: X ~ Po(lambda) has P(X = k) = e^(-lambda) lambda^k / k!, the
 * probabilities add to 1 by the exponential series, and the mean and variance are both
 * lambda. From the STEP Support STEP 2 Statistics topic notes (page 2: mean equals variance;
 * page 4: the conditions for a Poisson model, the sum by the exponential series, "you may
 * like to show that E(X) = lambda") and STEP 2 Statistics Q1 (2003 S2 Q13, the Poisson
 * distribution without its zero), whose hints and solutions give A, the mean, and 0.04.
 */
import { auto, cite, supervision, withUses } from '../cambridge';
import { int, pick, q, str, type Rational } from '../math';
import { fact, farApart, poissonCdf, poissonPmf, poissonPmfRec, sig } from '../partv-d';
import { generator, type Misconception } from '../problem';
import { computedTex, dmath, math, t, type Rich } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

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
    t`Cancel ${math`k`} into ${math`k!`}, shift the index, and recognise the exponential series.`,
  ],
  reference: 'lambda/(1 - exp(-lambda))',
  verify: () => {
    for (const l of TEST_L) if (!close(series(l, (k) => k) / (1 - Math.exp(-l)), l / (1 - Math.exp(-l)))) return `the mean at lambda = ${l}`;
    return null;
  },
  misconceptions: [{ response: 'lambda', why: t`${ml} is the mean of the full Poisson distribution. Removing the value ${0} pushes the mean up, by the factor ${math`A`}.` }],
  official: { source: cite('step-s2-stats-solutions', 'Q1'), answer: 'lambda/(1 - e^(-lambda))', agrees: true },
  nudge: t`Not quite. Without the zero term, the constant ${math`A`} raises the mean above ${ml}; cancel ${math`k`} into ${math`k!`} and shift the index.`,
  hints: [
    t`What is ${math`A`}, given that the probabilities for ${math`k \ge ${1}`} must add to ${1}?`,
    t`In ${math`\sum_{k} k\frac{A\lambda^{k}e^{-\lambda}}{k!}`}, what happens when ${math`k`} cancels against ${math`k!`}?`,
    t`After shifting the index, which familiar series is left?`,
  ],
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
    t`With ${math`k!`} in the denominator, find ${math`E(X(X - ${1}))`} first.`,
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
  nudge: t`Not quite. ${math`E(X(X - ${1}))`} is easier than ${math`E(X^{${2}})`}; the variance then follows from it and the mean.`,
  hints: [
    t`By the same shift as for the mean, what is ${math`E(X(X - ${1}))`}?`,
    t`How is ${math`E(X^{${2}})`} obtained from ${math`E(X(X - ${1}))`} and ${math`E(X)`}?`,
    t`What is ${math`E(X^{${2}}) - \mu^{${2}}`} with ${math`\mu = \frac{\lambda}{${1} - e^{-\lambda}}`}?`,
  ],
});

const q1Show = supervision({
  id: 's2-q1-show',
  source: cite(S2, 'Q1 (2003 S2 Q13)'),
  title: t`The Poisson distribution without its zero, in full`,
  prompt: t`${q1Intro} Show that ${math`A = (${1} - e^{-\lambda})^{-${1}}`}. Find the mean ${math`\mu`} in terms of ${ml} and show that ${math`\operatorname{Var}(X) = \mu(${1} - \mu + \lambda)`}. Deduce that ${math`\lambda < \mu < ${1} + \lambda`}.`,
  writeUp: 'proof',
  official: cite('step-s2-stats-solutions', 'Q1'),
  hints: [
    t`Why must ${math`A\sum_{k \ge ${1}} \frac{\lambda^{k}e^{-\lambda}}{k!} = ${1}`}, and what is that sum?`,
    t`Which shifts of the summation index give ${math`E(X)`} and ${math`E(X(X - ${1}))`}?`,
    t`Since ${math`\operatorname{Var}(X) > ${0}`} and ${math`A > ${1}`}, which inequalities follow?`,
  ],
});

const q1Normal = supervision({
  id: 's2-q1-normal',
  source: cite(S2, 'Q1 (2003 S2 Q13)'),
  title: t`A normal approximation for ${math`\lambda = ${100}`}`,
  prompt: t`For the distribution of Q${1} with ${math`\lambda = ${100}`}, use a normal approximation to find ${math`P(X = \lambda)`}, to two decimal places. Explain why the missing zero hardly matters here, which normal distribution is used, and why the continuity correction is needed.`,
  writeUp: 'explanation',
  official: cite('step-s2-stats-solutions', 'Q1'),
  hints: [
    t`How large is ${math`e^{-${100}}`}, and so how close is ${math`A`} to ${1}?`,
    t`Which normal distribution has the same mean and variance as ${math`\text{Po}(${100})`}?`,
    t`With the continuity correction, which interval stands for ${math`X = ${100}`}, and what is its probability?`,
  ],
});

const notesMean = supervision({
  id: 's2-notes-mean',
  source: cite('step-s2-stats-notes', 'page 4'),
  title: t`The mean of a Poisson distribution`,
  prompt: t`For ${math`X \sim \text{Po}(\lambda)`}, show that ${math`E(X) = \lambda`}, and then that ${math`\operatorname{Var}(X) = \lambda`}. Hint: compute ${math`E(X(X - ${1}))`} first, by the same shift of the summation index.`,
  writeUp: 'proof',
  hints: [
    t`In ${math`\sum_{k} k\frac{\lambda^{k}e^{-\lambda}}{k!}`}, why can the ${math`k = ${0}`} term be dropped, and what does ${math`\frac{k}{k!}`} become?`,
    t`After shifting the index, what is the sum?`,
    t`How do ${math`E(X(X - ${1}))`} and ${math`E(X)`} give ${math`\operatorname{Var}(X)`}?`,
  ],
});

// ---------------------------------------------------------------- lesson

const L25 = 2.5;
const ROW = [0, 1, 2, 3, 4, 5];

export const poissonDistribution: TopicContent = {
  topicId: 'prob.poisson-distribution',
  goal: t`Compute Poisson probabilities ${math`\frac{e^{-\lambda}\lambda^{k}}{k!}`}, explain why they add to ${1}, and use the fact that the mean and the variance are both ${ml}.`,
  objective: t`Compute Poisson probabilities, show they add to one, and prove the mean and variance are both lambda.`,
  why: t`It is the model for counts of rare independent events; next, Poisson rates and the binomial limit.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`Counts with no fixed number of trials` },
    { kind: 'hook', text: t`George receives on average ${L25} texts an hour. How likely is a silent hour, or one with five texts? A binomial needs a number of trials, but there is no natural number of "chances to text" in an hour. Counts like this, of events scattered at random in time or space, follow a different distribution, and its formula has an ${math`e`} in it.` },
    { kind: 'narrative', text: t`The STEP Support notes give the two conditions for such a count: the events happen independently of each other, and the mean number in an interval is proportional to its length. Misprints on a page, cars past a checkpoint in a minute, and meteors in an hour all fit.` },

    { kind: 'section', title: t`The distribution` },
    { kind: 'definition', name: t`Poisson distribution`, formal: t`For ${math`\lambda > ${0}`}, ${math`X \sim \text{Po}(\lambda)`} has the [[poisson-distribution|Poisson distribution]] with parameter ${ml} if ${dmath`P(X = k) = \frac{e^{-\lambda}\lambda^{k}}{k!}, \qquad k = ${0}, ${1}, ${2}, \ldots`}`, plain: t`For ${math`\lambda = ${L25}`}, a silent hour has probability ${math`e^{-${L25}} \approx ${s4(poissonPmf(L25, 0))}`}, and exactly two texts ${math`e^{-${L25}}\frac{${L25}^{${2}}}{${2}} \approx ${s4(poissonPmf(L25, 2))}`}.` },
    { kind: 'theorem', statement: t`The Poisson probabilities add to ${1}.` },
    { kind: 'p', text: t`Proof: the exponential series is ${math`e^{\lambda} = \sum_{k \ge ${0}} \frac{\lambda^{k}}{k!}`}, for every real ${ml}. So ${math`\sum_{k} \frac{e^{-\lambda}\lambda^{k}}{k!} = e^{-\lambda}e^{\lambda} = ${1}`}. ∎ Every Poisson calculation leans on that series.` },

    { kind: 'section', title: t`Mean and variance` },
    { kind: 'theorem', name: t`Mean and variance`, statement: t`If ${math`X \sim \text{Po}(\lambda)`}, then ${math`E(X) = \lambda`} and ${math`\operatorname{Var}(X) = \lambda`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Write the mean`, text: t`${math`E(X) = \sum_{k \ge ${0}} k\frac{e^{-\lambda}\lambda^{k}}{k!}`}. The ${math`k = ${0}`} term is ${0}, so start at ${math`k = ${1}`}.` },
        { label: t`Cancel the ${mk}`, text: t`For ${math`k \ge ${1}`}, ${math`\frac{k}{k!} = \frac{${1}}{(k - ${1})!}`}. Take one ${ml} out:`, eq: [dmath`E(X) = \lambda\sum_{k \ge ${1}} \frac{e^{-\lambda}\lambda^{k - ${1}}}{(k - ${1})!}.`], why: { q: t`Why is ${math`\frac{k}{k!} = \frac{${1}}{(k - ${1})!}`}?`, a: t`${math`k! = k \times (k - ${1})!`}, so dividing by ${math`k!`} and multiplying by ${mk} leaves ${math`\frac{${1}}{(k - ${1})!}`}. For ${math`k = ${4}`}: ${math`\frac{${4}}{${24}} = \frac{${1}}{${6}}`}.` } },
        { label: t`Shift the index`, text: t`Put ${math`j = k - ${1}`}: the sum is ${math`\sum_{j \ge ${0}} \frac{e^{-\lambda}\lambda^{j}}{j!} = ${1}`}, the total probability. So ${math`E(X) = \lambda`}.` },
        { label: t`The same trick twice`, text: t`${math`E(X(X - ${1})) = \sum_{k \ge ${2}} k(k - ${1})\frac{e^{-\lambda}\lambda^{k}}{k!} = \lambda^{${2}}\sum_{k \ge ${2}} \frac{e^{-\lambda}\lambda^{k - ${2}}}{(k - ${2})!} = \lambda^{${2}}`}.` },
        { label: t`Assemble`, text: t`${math`E(X^{${2}}) = E(X(X - ${1})) + E(X) = \lambda^{${2}} + \lambda`}, so ${math`\operatorname{Var}(X) = \lambda^{${2}} + \lambda - \lambda^{${2}} = \lambda`}.` },
      ],
    },
    { kind: 'p', text: t`So for a Poisson count the mean equals the variance. That is a quick check on data: counts whose variance is far from their mean are not Poisson.` },

    { kind: 'section', title: t`Computing` },
    { kind: 'p', text: t`Successive probabilities have a simple ratio: ${math`\frac{P(X = k)}{P(X = k - ${1})} = \frac{\lambda}{k}`}. So the probabilities rise while ${math`k < \lambda`} and fall after. With ${math`\lambda = ${L25}`}, ${math`P(X = k)`} for ${math`k = ${0}, \ldots, ${5}`} is about ${computedTex(ROW.map((k) => String(s4(poissonPmf(L25, k)))).join(',\\ '))}: the most likely value is ${2}.`, why: { q: t`Where does the ratio come from?`, a: t`Divide ${math`\frac{e^{-\lambda}\lambda^{k}}{k!}`} by ${math`\frac{e^{-\lambda}\lambda^{k - ${1}}}{(k - ${1})!}`}: the ${math`e^{-\lambda}`} cancels, one ${ml} is left on top, and ${math`k!/(k - ${1})! = k`} on the bottom.` } },
    checkFrom(pmf, { c: 2, lambda: 3, k: 4 }, t`${math`e^{-${3}}\frac{${3}^{${4}}}{${4}!} = e^{-${3}} \times \frac{${81}}{${24}}`}.`),
    { kind: 'p', text: t`For "at least" questions use the complement: ${math`P(X \ge ${1}) = ${1} - P(X = ${0}) = ${1} - e^{-\lambda}`}.` },
    checkFrom(tail, { c: 3, lambda: 2, k: 1, dir: 'least' }, t`${math`P(X \ge ${1}) = ${1} - e^{-${2}}`}.`),
    checkFrom(ratio, { lambda: q(4), a: 2, d: 1 }, t`${math`\frac{P(X = ${3})}{P(X = ${2})} = \frac{\lambda}{${3}}`}.`),

    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`Every count has its mean equal to its variance.`, counterexample: t`${math`B(${10}, ${q(1, 2)})`} has mean ${5} and variance ${q(5, 2)}. Mean equals variance is special to the Poisson distribution.` },
    { kind: 'pitfall', claim: t`${math`P(X \ge ${1}) = \lambda e^{-\lambda}`}.`, counterexample: t`That is ${math`P(X = ${1})`}. For ${math`\lambda = ${2}`} it is about ${s4(poissonPmf(2, 1))}, while ${math`P(X \ge ${1}) = ${1} - e^{-${2}} \approx ${s4(1 - Math.exp(-2))}`}.` },
    { kind: 'pitfall', claim: t`Any count of events in an interval is Poisson.`, counterexample: t`Arrivals of a bus that runs exactly every ${10} minutes are not independent: in each ${10}-minute window there is exactly one, so the variance is ${0}, not the mean ${1}.` },
    { kind: 'takeaway', text: t`${math`P(X = k) = e^{-\lambda}\lambda^{k}/k!`} adds to ${1} by the exponential series, and shifting the index shows the mean and variance are both ${ml}.` },
  ],
  examples: [
    { ...workedCambridge(q1A), examiner: t`The examiner looks for the exponential series with its ${math`k = ${0}`} term removed, giving ${math`e^{\lambda} - ${1}`}.` },
    worked(pmf, { c: 0, lambda: 2, k: 3 }, t`Three texts in an hour`),
    worked(tail, { c: 1, lambda: 1.5, k: 2, dir: 'least' }, t`At least two misprints`),
  ],
  generators: [pmf, tail, ratio],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['poisson-distribution'],
  cambridge: withUses([q1Mu, q1Var, q1Show, q1Normal, notesMean], {
    's2-q1-show': { sections: ['The distribution', 'Mean and variance'], note: t`A truncated Poisson distribution: its constant, mean, and variance` },
    's2-q1-variance': { sections: ['Mean and variance'], note: t`A truncated Poisson variance` },
    's2-q1-mean': { sections: ['Mean and variance'], note: t`A truncated Poisson mean` },
  }),
  // STEP 2 Q1 in full first, then its variance and mean. The notes' mean is proved in the lesson, and the normal part belongs to the normal approximation.
  gate: ['s2-q1-show', 's2-q1-variance', 's2-q1-mean'],
  recall: [
    { front: t`The Poisson probability ${math`P(X = k)`}.`, back: t`${math`e^{-\lambda}\lambda^{k}/k!`}, for ${math`k = ${0}, ${1}, \ldots`}.` },
    { front: t`Mean and variance of ${math`\text{Po}(\lambda)`}.`, back: t`Both ${ml}.` },
    { front: t`Why do the Poisson probabilities add to ${1}?`, back: t`${math`\sum_{k} \lambda^{k}/k! = e^{\lambda}`}, which cancels ${math`e^{-\lambda}`}.` },
  ],
  proofOrder: [{
    title: t`The Poisson mean`,
    steps: [
      t`Write ${math`E(X) = \sum_{k \ge ${1}} k e^{-\lambda}\lambda^{k}/k!`}, dropping the zero term.`,
      t`Use ${math`k/k! = ${1}/(k - ${1})!`} and take out one ${ml}.`,
      t`Shift the index to ${math`j = k - ${1}`}.`,
      t`The remaining sum is the total probability, ${1}, so ${math`E(X) = \lambda`}.`,
    ],
  }],
};
