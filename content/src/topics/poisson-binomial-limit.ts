/**
 * prob.poisson-binomial-limit: for fixed lambda and k, P(B(n, lambda/n) = k) tends to
 * e^(-lambda) lambda^k / k!, so a binomial count with many trials and a small chance of
 * success is close to Poisson with the same mean. From the Faculty schedule ("Relation
 * between Poisson and binomial distributions", IA Probability, Axiomatic approach) and the
 * STEP Support STEP 2 Statistics topic notes, page 2 ("If n is large and p is very small
 * then a Poisson distribution with mean np can be used to approximate a Binomial
 * distribution"). Neither source sets a numbered problem, so the problems adapt them and
 * have no official answers; each answer is checked against the exact binomial.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { int, pick } from '../math';
import { binomPmf, binomPmfProduct, fact, farApart, poissonCdf, poissonPmf, poissonPmfRec, sig } from '../partv-d';
import { generator, type Misconception } from '../problem';
import { math, t, type Rich } from '../rich';
import { worked, workedProof, type TopicContent } from '../topic';

const [mn, mk, ml] = [math`n`, math`k`, math`\lambda`];
const s4 = (x: number): number => sig(x, 4);
const ans4 = (x: number) => ({ kind: 'numeric' as const, expected: s4(x), relTol: 0.002 });
const SCHEDULE = cite('tripos-schedules', 'IA Probability, Axiomatic approach: "Relation between Poisson and binomial distributions"', true);
const NOTES = 'step-s2-stats-notes' as const;

// ---------------------------------------------------------------- the approximation in use

interface Ctx { items: Rich; fault: Rich }
const CONTEXTS: readonly Ctx[] = [
  { items: t`items from a production line`, fault: t`faulty` },
  { items: t`letters typed on a page`, fault: t`a typing error` },
  { items: t`people at a concert`, fault: t`born on the first of January` },
  { items: t`seeds in a packet`, fault: t`a seed that fails to germinate` },
  { items: t`calls to a call centre`, fault: t`a wrong number` },
];
const NS = [100, 200, 250, 400, 500, 1000];
const LS = [1, 1.5, 2, 2.5, 3, 4];

interface ApproxP { c: number; n: number; lambda: number; k: number }
const approxMis = ({ n, lambda, k }: ApproxP): number[] => [binomPmf(n, k, lambda / n), poissonPmf(lambda / n, k), lambda ** k / fact(k)];

const approx = generator<ApproxP>({
  id: 'approximate',
  skill: 'Approximate a binomial probability with many trials and a small chance of success by the Poisson probability with the same mean.',
  params: (rng) => {
    for (;;) {
      const p: ApproxP = { c: int(rng, 0, CONTEXTS.length - 1), n: pick(rng, NS), lambda: pick(rng, LS), k: int(rng, 0, 4) };
      const right = poissonPmf(p.lambda, p.k);
      if (approxMis(p).filter((m) => farApart(m, right)).length >= 2) return p;
    }
  },
  sane: ({ c, n, lambda }) => (c < CONTEXTS.length && lambda / n < 0.05 ? null : 'p is not small'),
  problem: ({ c, n, lambda, k }) => {
    const cx = CONTEXTS[c] as Ctx;
    const p = lambda / n;
    return {
      prompt: t`Among ${n} ${cx.items}, each is ${cx.fault} with probability ${p}, independently. Use the Poisson approximation to estimate the probability that exactly ${k} are, to four significant figures.`,
      answer: ans4(poissonPmf(lambda, k)),
      solution: [
        t`The count is ${math`B(${n}, ${p})`}: many trials, small chance. Approximate it by the Poisson distribution with the same mean, ${math`\lambda = np = ${n} \times ${p} = ${lambda}`}.`,
        t`${math`P(X = ${k}) \approx \frac{e^{-${lambda}} \times ${lambda}^{${k}}}{${k}!} \approx ${s4(poissonPmf(lambda, k))}`}. The exact binomial value is ${s4(binomPmf(n, k, p))}: close, as the theorem promises.`,
      ],
    };
  },
  solve: ({ lambda, k }) => String(s4(poissonPmfRec(lambda, k))),
  misconceptions: (p): Misconception[] => {
    const [exact, smallMean, noExp] = approxMis(p) as [number, number, number];
    return [
      { response: String(s4(exact)), why: t`That is the exact binomial probability. It is a fine number, but the question asks for the Poisson approximation, ${math`e^{-\lambda}\lambda^{k}/k!`} with ${math`\lambda = np`}.` },
      { response: String(s4(smallMean)), why: t`The Poisson mean is ${math`np`}, the expected number of successes, not ${math`p`}.` },
      { response: String(s4(noExp)), why: t`Every Poisson probability has the factor ${math`e^{-\lambda}`}.` },
    ];
  },
});

// ---------------------------------------------------------------- the limit as an expression

interface LimP { k: number; kind: 'eq' | 'le' }
const limExpr = ({ k, kind }: LimP): string => (kind === 'eq'
  ? `exp(-lambda)*lambda^${k}/${fact(k)}`
  : `exp(-lambda)*(${Array.from({ length: k + 1 }, (_, j) => `lambda^${j}/${fact(j)}`).join(' + ')})`);

const L_DOM = { lambda: { kind: 'real' as const, min: 0.2, max: 5 } };
const limit = generator<LimP>({
  id: 'limit',
  skill: 'Find the limit of B(n, lambda/n) probabilities as n grows, as a Poisson probability in lambda.',
  params: (rng) => (rng() < 0.6 ? { k: int(rng, 1, 6), kind: 'eq' } : { k: int(rng, 1, 3), kind: 'le' }),
  sane: ({ k }) => (k >= 1 && k <= 6 ? null : 'out of range'),
  problem: (p) => {
    const { k, kind } = p;
    const event = kind === 'eq' ? math`X_{n} = ${k}` : math`X_{n} \le ${k}`;
    return {
      prompt: t`For each ${mn}, ${math`X_{n} \sim B(n, \lambda/n)`}, with ${ml} fixed. Find ${math`\lim_{n \to \infty} P(${event})`} as an expression in ${ml}.`,
      answer: { kind: 'expression', expected: limExpr(p), variables: ['lambda'], domains: L_DOM },
      solution: [
        t`For each fixed ${mk}, ${math`\binom{n}{k}\left(\frac{\lambda}{n}\right)^{k}\left(${1} - \frac{\lambda}{n}\right)^{n - k} = \frac{\lambda^{k}}{k!} \cdot \frac{n(n - ${1})\cdots(n - k + ${1})}{n^{k}} \cdot \left(${1} - \frac{\lambda}{n}\right)^{n}\left(${1} - \frac{\lambda}{n}\right)^{-k}`}.`,
        t`The middle fraction and the last factor tend to ${1}, and ${math`\left(${1} - \frac{\lambda}{n}\right)^{n} \to e^{-\lambda}`}, so the probability tends to ${math`\frac{e^{-\lambda}\lambda^{k}}{k!}`}.`,
        kind === 'eq'
          ? t`With ${math`k = ${k}`}: ${math`\frac{e^{-\lambda}\lambda^{${k}}}{${fact(k)}}`}.`
          : t`${math`P(X_{n} \le ${k})`} is a sum of ${k + 1} such probabilities, and a finite sum of limits is the limit of the sum: ${math`e^{-\lambda}\sum_{j = ${0}}^{${k}} \frac{\lambda^{j}}{j!}`}.`,
      ],
    };
  },
  solve: ({ k, kind }) => (kind === 'eq'
    ? `e^(-lambda) lambda^${k} / ${k}!`
    : `e^(-lambda)(${Array.from({ length: k + 1 }, (_, j) => `lambda^${j}/${j}!`).join(' + ')})`),
  misconceptions: ({ k, kind }): Misconception[] => kind === 'eq'
    ? [
      { response: `lambda^${k}/${fact(k)}`, why: t`The factor ${math`\left(${1} - \lambda/n\right)^{n}`} does not tend to ${1}: it tends to ${math`e^{-\lambda}`}.` },
      { response: `exp(-lambda)*lambda^${k}`, why: t`Keep the ${math`k!`}: it comes from ${math`\binom{n}{k}`}, whose ${math`n(n - ${1})\cdots(n - k + ${1})`} cancels against ${math`n^{k}`} but whose ${math`k!`} stays.` },
      { response: '0', why: t`Each trial's chance ${math`\lambda/n`} tends to ${0}, but the number of trials grows to match: the probability tends to a positive limit.` },
    ]
    : [
      { response: `exp(-lambda)*lambda^${k}/${fact(k)}`, why: t`That is the limit of ${math`P(X_{n} = ${k})`} alone. At most ${k} adds the terms for ${math`${0}, \ldots, ${k}`}.` },
      { response: `${Array.from({ length: k + 1 }, (_, j) => `lambda^${j}/${fact(j)}`).join(' + ')}`, why: t`Every term has the factor ${math`e^{-\lambda}`}, the limit of ${math`(${1} - \lambda/n)^{n}`}.` },
      { response: '1', why: t`The probabilities of all values add to ${1}, but at most ${k} leaves out every larger value.` },
    ],
});

// ---------------------------------------------------------------- how fast (1 - lambda/n)^n approaches e^(-lambda)

interface ExpP { lambda: number; n: number }
const expMis = ({ lambda, n }: ExpP): number[] => [Math.exp(-lambda), 1 - lambda / n, 1 - lambda];

const expLimit = generator<ExpP>({
  id: 'exp-limit',
  skill: 'Evaluate (1 - lambda/n)^n, the binomial factor that becomes e^(-lambda), and compare it with its limit.',
  params: (rng) => {
    for (;;) {
      const p: ExpP = { lambda: pick(rng, [0.5, 1, 1.5, 2, 3]), n: pick(rng, [4, 5, 8, 10, 20, 25, 50]) };
      const right = (1 - p.lambda / p.n) ** p.n;
      if (expMis(p).filter((m) => farApart(m, right, 0.01)).length >= 2) return p;
    }
  },
  sane: ({ lambda, n }) => (lambda < n ? null : 'lambda must be less than n'),
  problem: ({ lambda, n }) => {
    const v = (1 - lambda / n) ** n;
    return {
      prompt: t`${math`B(${n}, ${lambda / n})`} gives no successes with probability ${math`\left(${1} - \frac{${lambda}}{${n}}\right)^{${n}}`}. Evaluate it, to four significant figures.`,
      answer: ans4(v),
      solution: [
        t`${math`${1} - \frac{${lambda}}{${n}} = ${1 - lambda / n}`}, and ${math`${1 - lambda / n}^{${n}} \approx ${s4(v)}`}.`,
        t`The Poisson approximation gives ${math`e^{-${lambda}} \approx ${s4(Math.exp(-lambda))}`}: the binomial value is ${s4(Math.abs(v / Math.exp(-lambda) - 1) * 100)}% ${v < Math.exp(-lambda) ? 'lower' : 'higher'}, and the gap closes as ${mn} grows with ${math`np`} fixed.`,
      ],
    };
  },
  // Through logarithms, as a check on the direct power.
  solve: ({ lambda, n }) => String(s4(Math.exp(n * Math.log1p(-lambda / n)))),
  misconceptions: (p): Misconception[] => {
    const [lim, one, lin] = expMis(p) as [number, number, number];
    return [
      { response: String(s4(lim)), why: t`${math`e^{-${p.lambda}}`} is the limit as ${mn} grows. For ${math`n = ${p.n}`} compute the power itself.` },
      { response: String(s4(one)), why: t`Raise ${math`${1} - \lambda/n`} to the power ${mn}: every one of the ${p.n} trials must fail.` },
      { response: String(s4(lin)), why: t`${math`${1} - \lambda`} is only the first two terms of the expansion. Compute the power.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

const N2 = 500;
const P2 = 0.004;
const L2 = N2 * P2;
const notesAtMost = auto({
  id: 's2-notes-approx',
  source: cite(NOTES, 'page 2', true),
  title: t`Faulty items, by the Poisson approximation`,
  prompt: t`A machine makes ${N2} items, each faulty with probability ${P2}, independently. The STEP Support notes say that for ${mn} large and ${math`p`} very small, ${math`\text{Po}(np)`} approximates ${math`B(n, p)`}. Use it to estimate the probability that at most ${2} items are faulty, to four significant figures.`,
  answer: ans4(poissonCdf(L2, 2)),
  solution: [
    t`${math`\lambda = np = ${N2} \times ${P2} = ${L2}`}.`,
    t`${math`P(X \le ${2}) \approx e^{-${L2}}\left(${1} + ${L2} + \frac{${L2}^{${2}}}{${2}}\right) = ${5}e^{-${2}} \approx ${s4(poissonCdf(L2, 2))}`}. The exact binomial value is ${s4([0, 1, 2].reduce((s, k) => s + binomPmf(N2, k, P2), 0))}.`,
  ],
  reference: String(s4(5 * Math.exp(-2))),
  verify: () => {
    const exact = [0, 1, 2].reduce((s, k) => s + binomPmfProduct(N2, k, P2), 0);
    return same('Poisson value as the closed form', s4(poissonCdf(L2, 2)), s4(5 * Math.exp(-2)))
      ?? (Math.abs(exact / poissonCdf(L2, 2) - 1) < 0.003 ? null : `the exact binomial ${exact} is not close to the approximation`);
  },
  misconceptions: [
    { response: String(s4(poissonPmf(L2, 2))), why: t`That is exactly ${2}. At most ${2} adds the probabilities of ${0}, ${1}, and ${2}.` },
    { response: String(s4(poissonCdf(P2, 2))), why: t`The Poisson mean is ${math`np = ${L2}`}, not ${math`p`}.` },
  ],
});

const VAR_DOM = { lambda: { kind: 'real' as const, min: 0.2, max: 5 }, n: { kind: 'integer' as const, min: 10, max: 200 } };
const notesVar = auto({
  id: 's2-notes-variance',
  source: cite(NOTES, 'page 2', true),
  title: t`Why the means match and the variances nearly do`,
  prompt: t`The notes give ${math`E(X) = np`} and ${math`\operatorname{Var}(X) = np(${1} - p)`} for ${math`X \sim B(n, p)`}. For ${math`X_{n} \sim B(n, \lambda/n)`}, give ${math`\operatorname{Var}(X_{n})`} as an expression in ${ml} and ${mn}.`,
  answer: { kind: 'expression', expected: 'lambda(1 - lambda/n)', variables: ['lambda', 'n'], domains: VAR_DOM },
  solution: [
    t`${math`np = \lambda`} and ${math`${1} - p = ${1} - \lambda/n`}, so ${math`\operatorname{Var}(X_{n}) = \lambda\left(${1} - \frac{\lambda}{n}\right)`}.`,
    t`It tends to ${ml}, the variance of ${math`\text{Po}(\lambda)`}, as ${math`n \to \infty`}. The mean is ${ml} for every ${mn}; the variance is short of ${ml} by the factor ${math`${1} - p`}, which is why ${math`p`} must be small.`,
  ],
  reference: 'lambda - lambda^2/n',
  verify: () => {
    // Var from the distribution, summed exactly in floating point, against the formula.
    for (const [n, l] of [[20, 1.5], [50, 3], [200, 0.7]] as const) {
      let m = 0;
      let s = 0;
      for (let k = 0; k <= n; k++) { const pk = binomPmfProduct(n, k, l / n); m += k * pk; s += k * k * pk; }
      if (Math.abs(s - m * m - l * (1 - l / n)) > 1e-9) return `variance at n = ${n}, lambda = ${l}`;
    }
    return null;
  },
  misconceptions: [{ response: 'lambda', why: t`${ml} is the limit. For finite ${mn} the variance is ${math`np(${1} - p)`}, slightly less.` }],
});

const proof = workedProof({
  title: t`The Poisson limit of the binomial`,
  prompt: t`Let ${math`\lambda > ${0}`} and let ${mk} be a fixed non-negative integer. Prove that if ${math`X_{n} \sim B(n, \lambda/n)`} then ${math`P(X_{n} = k) \to \frac{e^{-\lambda}\lambda^{k}}{k!}`} as ${math`n \to \infty`}.`,
  steps: [
    t`For ${math`n > \max(k, \lambda)`}, ${math`P(X_{n} = k) = \binom{n}{k}\left(\frac{\lambda}{n}\right)^{k}\left(${1} - \frac{\lambda}{n}\right)^{n - k}`}.`,
    t`Rearrange: ${math`\frac{\lambda^{k}}{k!} \cdot \prod_{i = ${0}}^{k - ${1}} \frac{n - i}{n} \cdot \left(${1} - \frac{\lambda}{n}\right)^{n} \cdot \left(${1} - \frac{\lambda}{n}\right)^{-k}`}.`,
    t`The product has ${mk} factors, a number that does not depend on ${mn}, and each ${math`\frac{n - i}{n} = ${1} - \frac{i}{n} \to ${1}`}; so the product tends to ${1}. Likewise ${math`\left(${1} - \frac{\lambda}{n}\right)^{-k} \to ${1}`}.`,
    t`${math`\left(${1} - \frac{\lambda}{n}\right)^{n} \to e^{-\lambda}`}, the exponential limit. By the algebra of limits the whole expression tends to ${math`\frac{\lambda^{k}}{k!}e^{-\lambda}`}.`,
  ],
  answer: t`${math`P(X_{n} = k) \to e^{-\lambda}\lambda^{k}/k!`} for every ${mk}: the binomial distributions converge to ${math`\text{Po}(\lambda)`}.`,
  source: SCHEDULE,
});

const general = supervision({
  id: 'schedule-general',
  source: SCHEDULE,
  title: t`The limit when only ${math`np_{n}`} converges`,
  prompt: t`Suppose ${math`X_{n} \sim B(n, p_{n})`} where ${math`np_{n} \to \lambda > ${0}`}, not necessarily with ${math`p_{n} = \lambda/n`}. Prove that ${math`P(X_{n} = k) \to e^{-\lambda}\lambda^{k}/k!`} for each fixed ${mk}. You may use that ${math`\left(${1} + \frac{x_{n}}{n}\right)^{n} \to e^{x}`} whenever ${math`x_{n} \to x`}.`,
  writeUp: 'proof',
});

const when = supervision({
  id: 's2-notes-when',
  source: cite(NOTES, 'page 2'),
  title: t`Large ${mn} and small ${math`p`}`,
  prompt: t`The notes ask for ${mn} "large" and ${math`p`} "very small". Explain why each condition is needed: compare the means and variances of ${math`B(n, p)`} and ${math`\text{Po}(np)`}, and compute ${math`P(X = ${0})`} both ways for ${math`B(${10}, ${0.5})`} and for ${math`B(${1000}, ${0.005})`}. Which approximation is good, and why?`,
  writeUp: 'explanation',
});

// ---------------------------------------------------------------- lesson

const L = 2;
const TABLE_N = [10, 100, 1000];

export const poissonBinomialLimit: TopicContent = {
  topicId: 'prob.poisson-binomial-limit',
  goal: t`Prove that ${math`B(n, \lambda/n)`} probabilities tend to ${math`\text{Po}(\lambda)`} probabilities, and use the Poisson distribution to approximate a binomial count with many trials and a small chance of success.`,
  lesson: [
    { kind: 'p', text: t`The IA schedule lists the "relation between Poisson and binomial distributions", and the STEP Support notes put it as a rule of thumb: if ${mn} is large and ${math`p`} is very small, ${math`\text{Po}(np)`} approximates ${math`B(n, p)`}. Both are the same theorem.` },
    { kind: 'rule', text: t`The [[poisson-approximation|Poisson limit]]: for fixed ${math`\lambda > ${0}`} and ${math`k \ge ${0}`}, ${math`\binom{n}{k}\left(\frac{\lambda}{n}\right)^{k}\left(${1} - \frac{\lambda}{n}\right)^{n - k} \to \frac{e^{-\lambda}\lambda^{k}}{k!}`} as ${math`n \to \infty`}.` },
    { kind: 'p', text: t`Why: ${math`\binom{n}{k}\frac{${1}}{n^{k}} = \frac{${1}}{k!} \cdot \frac{n}{n} \cdot \frac{n - ${1}}{n} \cdots \frac{n - k + ${1}}{n}`}, and those ${mk} fractions each tend to ${1}. What is left is ${math`\frac{\lambda^{k}}{k!}\left(${1} - \frac{\lambda}{n}\right)^{n}`}, and the exponential limit turns the power into ${math`e^{-\lambda}`}. The ${math`e^{-\lambda}`} is the chance that all ${mn} trials fail, in the limit.` },
    { kind: 'table', caption: t`${math`P(X = k)`} for ${math`X \sim B(n, ${L}/n)`}, and the Poisson limit, to four significant figures`, head: [t`${mk}`, ...TABLE_N.map((n) => t`${math`n = ${n}`}`), t`${math`\text{Po}(${L})`}`], rows: [0, 1, 2, 3, 4].map((k) => [t`${k}`, ...TABLE_N.map((n) => t`${s4(binomPmf(n, k, L / n))}`), t`${s4(poissonPmf(L, k))}`]) },
    { kind: 'p', text: t`The means agree exactly, ${math`np = \lambda`}. The variances do not: ${math`np(${1} - p)`} against ${math`np`}, off by the factor ${math`${1} - p`}. So the approximation needs ${math`p`} small, not just ${mn} large: ${math`B(${10}, ${0.5})`} has many trials for its size and is nothing like ${math`\text{Po}(${5})`}.` },
  ],
  examples: [
    proof,
    worked(approx, { c: 0, n: 500, lambda: 2, k: 3 }, t`Three faulty items in ${500}`),
    worked(limit, { k: 2, kind: 'eq' }, t`The limit of ${math`P(X_{n} = ${2})`}`),
  ],
  generators: [approx, limit, expLimit],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['poisson-approximation'],
  cambridge: [notesAtMost, notesVar, general, when],
};
