/**
 * prob.poisson-binomial-limit: for fixed lambda and k, P(B(n, lambda/n) = k) tends to
 * e^(-lambda) lambda^k / k!, so a binomial count with many trials and a small chance of
 * success is close to Poisson with the same mean. From the Faculty schedule ("Relation
 * between Poisson and binomial distributions", IA Probability, Axiomatic approach) and the
 * STEP Support STEP 2 Statistics topic notes, page 2 ("If n is large and p is very small
 * then a Poisson distribution with mean np can be used to approximate a Binomial
 * distribution"). Neither source sets a numbered problem, so the problems adapt them and
 * have no official answers; each answer is checked against the exact binomial. Batch 7 adds
 * Grinstead and Snell, Section 5.1, Exercises 11, 17, and 29, the last two with printed odd answers.
 * Exercise 17's printed 649741 comes from the Poisson approximation with a strict inequality; the
 * exact binomial answer is 649740, recorded as a mismatch.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { int, pick, q } from '../math';
import { binomPmf, binomPmfProduct, fact, farApart, poissonCdf, poissonPmf, poissonPmfRec, sig } from '../partv-d';
import { generator, type Misconception } from '../problem';
import { dmath, math, t, type Rich } from '../rich';
import { checkFrom, worked, workedProof, type TopicContent } from '../topic';

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

// ---------------------------------------------------------------- Cambridge problems: gates (batch 7)

/** x to three decimal places. */
const round3 = (x: number): number => Math.round(x * 1000) / 1000;

const BOXES = 500;
/** The king tests one coin from each of 500 boxes, each with one fake in 500. */
const KING = 1 - (1 - 1 / BOXES) ** BOXES;
const gs5129 = auto({
  id: 'gs-5-1-29',
  source: cite('gs-ch5', 'Section 5.1, Exercise 29, first question (page 201)'),
  title: t`The king's counterfeit coins`,
  prompt: t`The king's coinmaster boxes his coins ${BOXES} to a box and puts ${1} counterfeit coin in each box. The king is suspicious, but, instead of testing all the coins in ${1} box, he tests ${1} coin chosen at random out of each of ${BOXES} boxes. What is the probability that he finds at least one fake? Give three decimal places.`,
  answer: { kind: 'numeric', expected: KING, absTol: 0.001 },
  solution: [
    t`Each test finds a fake with probability ${q(1, BOXES)}, independently, so the number of fakes found is ${math`B(${BOXES}, \tfrac{${1}}{${BOXES}})`}.`,
    t`Exactly: ${math`${1} - \left(${1} - \tfrac{${1}}{${BOXES}}\right)^{${BOXES}} \approx ${round3(KING)}`}. The Poisson approximation with ${math`\lambda = np = ${1}`} gives ${math`${1} - e^{-${1}} \approx ${round3(1 - Math.exp(-1))}`}: the two agree to three places.`,
  ],
  reference: round3(KING).toFixed(3),
  verify: () => {
    // The exact value, the product written out, against the Poisson value.
    let none = 1;
    for (let i = 0; i < BOXES; i++) none *= (BOXES - 1) / BOXES;
    const e = same('the exact value, two ways', (1 - none).toFixed(12), KING.toFixed(12));
    return e ?? same('exact and Poisson to three places', round3(KING), round3(1 - Math.exp(-1)));
  },
  misconceptions: [{ response: round3(1 - KING).toFixed(3), why: t`That is the chance of finding no fake. The question asks for at least one: take it from ${1}.` }],
  official: { source: cite('gs-answers-odd', 'Section 5.1, Exercise 29'), answer: '0.632', agrees: true },
});

/** A royal flush has probability 1/649740; the smallest n with (1 - p)^n < 1/e. */
const ROYAL = 649740;
const smallestN = (): number => Math.floor(-1 / Math.log1p(-1 / ROYAL)) + 1;
const gs5117 = auto({
  id: 'gs-5-1-17',
  source: cite('gs-ch5', 'Section 5.1, Exercise 17 (page 199)', true),
  title: t`How many hands before a royal flush`,
  prompt: t`The probability of a royal flush in a poker hand is ${math`p = \frac{${1}}{${ROYAL}}`}. How large must ${math`n`} be to render the probability of having no royal flush in ${math`n`} hands smaller than ${math`\frac{${1}}{e}`}? Give the smallest such ${math`n`}, for independent hands.`,
  answer: { kind: 'exact', expected: String(smallestN()) },
  solution: [
    t`No royal flush in ${math`n`} hands has probability ${math`(${1} - p)^{n}`}, which falls as ${math`n`} grows. Write ${math`N = \frac{${1}}{p} = ${ROYAL}`}.`,
    t`${math`n = N`} works: ${math`\ln(${1} - x) < -x`} for ${math`${0} < x < ${1}`}, so ${math`N \ln\left(${1} - \tfrac{${1}}{N}\right) < -${1}`}, that is ${math`(${1} - p)^{N} < e^{-${1}}`}.`,
    t`${math`n = N - ${1}`} does not: ${math`\ln(${1} + y) < y`} for ${math`y > ${0}`}; with ${math`y = \frac{${1}}{N - ${1}}`}, ${math`\ln \frac{N}{N - ${1}} < \frac{${1}}{N - ${1}}`}, which rearranges to ${math`(N - ${1}) \ln\left(${1} - \tfrac{${1}}{N}\right) > -${1}`}, that is ${math`(${1} - p)^{N - ${1}} > e^{-${1}}`}.`,
    t`So the smallest ${math`n`} is ${math`N = ${ROYAL}`}. The Poisson approximation ${math`e^{-np} < e^{-${1}}`} asks for ${math`np > ${1}`}, giving ${ROYAL + 1}; the exact binomial probability is already below ${math`\frac{${1}}{e}`} one hand sooner.`,
  ],
  reference: String(smallestN()),
  verify: () => {
    const p = 1 / ROYAL;
    const below = (n: number): boolean => n * Math.log1p(-p) < -1;
    const e = same('the smallest n', `${below(ROYAL)} ${below(ROYAL - 1)}`, 'true false');
    return e ?? same('the smallest n by the logarithm', smallestN(), ROYAL);
  },
  misconceptions: [{ response: String(ROYAL + 1), why: t`That is the Poisson answer, from ${math`np > ${1}`}. The exact probability ${math`(${1} - p)^{n}`} is a little smaller than ${math`e^{-np}`}, and at ${math`n = ${ROYAL}`} it is already below ${math`\frac{${1}}{e}`}.` }],
  official: {
    source: cite('gs-answers-odd', 'Section 5.1, Exercise 17'), answer: String(ROYAL + 1), agrees: false,
    note: 'The printed 649741 is the Poisson answer: e^(-np) < 1/e needs np > 1, so n > 649740. The exact probability (1 - p)^n is below 1/e already at n = 1/p = 649740, since (1 - 1/N)^N < 1/e for every N, and above it at n = 649739. The exact answer, 649740, is used.',
  },
});

/*
 * Outline for marking gs-5-1-11 (20 marks):
 * 1. The Poisson model for one-minute counts comes from splitting the minute into n short pieces, each
 *    with one call with probability about lambda/n, independently, and letting n grow (5).
 * 2. For an interval of length t, split it into n pieces of length t/n: each holds a call with
 *    probability about lambda t / n, so the count is about B(n, lambda t / n) (8).
 * 3. By the Poisson limit of the binomial with lambda t in place of lambda, P(Y = k) tends to
 *    e^(-lambda t) (lambda t)^k / k! (5). The Martian's unit of t minutes says the same (2).
 */
const gs5111 = supervision({
  id: 'gs-5-1-11',
  source: cite('gs-ch5', 'Section 5.1, Exercise 11 (pages 198 and 199)'),
  title: t`Calls in a longer interval`,
  prompt: t`Suppose that ${math`X`} is a random variable which represents the number of calls coming in to a police station in a one-minute interval, modelled by a Poisson distribution with parameter ${math`\lambda`}, the average number of incoming calls per minute. Now suppose that ${math`Y`} is a random variable which represents the number of incoming calls in an interval of length ${math`t`}. Show that ${math`P(Y = k) = e^{-\lambda t} \frac{(\lambda t)^{k}}{k!}`}, that is, ${math`Y`} is Poisson with parameter ${math`\lambda t`}. (Hint: suppose a Martian observes the police station, and the basic time interval used on Mars is exactly ${math`t`} Earth minutes. What would she write down for the distribution of ${math`Y`}?)`,
  writeUp: 'explanation',
});

// ---------------------------------------------------------------- lesson

const L = 2;
const TABLE_N = [10, 100, 1000];
const HN = 500;
const HP = 0.004;
const HK = 3;

export const poissonBinomialLimit: TopicContent = {
  topicId: 'prob.poisson-binomial-limit',
  goal: t`Prove that ${math`B(n, \lambda/n)`} probabilities tend to ${math`\text{Po}(\lambda)`} probabilities, and use the Poisson distribution to approximate a binomial count with many trials and a small chance of success.`,
  objective: t`Prove that many rare independent trials give a Poisson count, and use it to approximate binomials.`,
  why: t`It explains why rare events (typos, faults, calls) are Poisson, and replaces huge binomials with one term.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`Many trials, rare successes` },
    { kind: 'hook', text: t`A machine makes ${HN} items, each faulty with probability ${HP}, independently. The chance of exactly ${HK} faulty items is ${math`\binom{${HN}}{${HK}}(${HP})^{${HK}}(${1 - HP})^{${HN - HK}}`}, a calculation with enormous and tiny numbers. Yet ${math`e^{-${2}}\frac{${2}^{${3}}}{${3}!} \approx ${s4(poissonPmf(HN * HP, HK))}`} is right to two decimal places: the exact value is ${s4(binomPmf(HN, HK, HP))}. Where does that formula come from?` },
    { kind: 'narrative', text: t`The ${2} in it is the mean number of faults, ${math`np = ${HN} \times ${HP}`}. Keep that mean fixed, call it ${ml}, and let the number of trials grow while the chance of success shrinks to ${math`\lambda/n`}. The binomial probabilities settle down to the [[poisson-approximation|Poisson]] ones.` },

    { kind: 'section', title: t`The Poisson limit` },
    { kind: 'theorem', name: t`Poisson limit of the binomial`, statement: t`Let ${math`\lambda > ${0}`} and let ${mk} be a fixed non-negative integer. If ${math`X_{n} \sim B(n, \lambda/n)`}, then ${dmath`P(X_{n} = k) \to \frac{e^{-\lambda}\lambda^{k}}{k!} \qquad \text{as } n \to \infty.`}` },
    { kind: 'narrative', text: t`The idea in one line: split the binomial probability into pieces whose limits you know.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Write it out`, text: t`For ${math`n > \max(k, \lambda)`},`, eq: [dmath`P(X_{n} = k) = \binom{n}{k}\left(\frac{\lambda}{n}\right)^{k}\left(${1} - \frac{\lambda}{n}\right)^{n - k}.`] },
        { label: t`Rearrange`, text: t`Write ${math`\binom{n}{k} = \frac{n(n - ${1})\cdots(n - k + ${1})}{k!}`} and share the ${math`n^{k}`} among its ${mk} top factors:`, eq: [dmath`P(X_{n} = k) = \frac{\lambda^{k}}{k!} \cdot \prod_{i = ${0}}^{k - ${1}} \frac{n - i}{n} \cdot \left(${1} - \frac{\lambda}{n}\right)^{n} \cdot \left(${1} - \frac{\lambda}{n}\right)^{-k}.`] },
        { label: t`The product tends to ${1}`, text: t`Each ${math`\frac{n - i}{n} = ${1} - \frac{i}{n} \to ${1}`}, and there are ${mk} factors, a number that does not grow with ${mn}. So the product tends to ${1}. Likewise ${math`\left(${1} - \frac{\lambda}{n}\right)^{-k} \to ${1}`}.`, why: { q: t`Why does it matter that ${mk} is fixed?`, a: t`A fixed number of factors, each tending to ${1}, has product tending to ${1}. If the number of factors grew with ${mn}, small shortfalls could pile up, which is exactly what happens in the next step.` } },
        { label: t`The exponential limit`, text: t`${math`\left(${1} - \frac{\lambda}{n}\right)^{n} \to e^{-\lambda}`}.`, why: { q: t`Why is that?`, a: t`Take logarithms: ${math`n\ln(${1} - \lambda/n)`}. Since ${math`\ln(${1} - x) = -x + O(x^{${2}})`} for small ${math`x`}, this is ${math`-\lambda + O(${1}/n) \to -\lambda`}, and ${math`\exp`} is continuous. Numerically, ${math`(${1} - ${2}/${1000})^{${1000}} \approx ${s4((1 - 2 / 1000) ** 1000)}`}, against ${math`e^{-${2}} \approx ${s4(Math.exp(-2))}`}.` } },
        { label: t`Combine`, text: t`By the algebra of limits, ${math`P(X_{n} = k) \to \frac{\lambda^{k}}{k!} \cdot ${1} \cdot e^{-\lambda} \cdot ${1}`}.`, plain: t`The ${math`e^{-\lambda}`} is, in the limit, the chance that every one of the ${mn} trials fails.` },
      ],
    },
    {
      kind: 'table', caption: t`${math`P(X = k)`} for ${math`X \sim B(n, ${L}/n)`}, and the Poisson limit, to four significant figures`,
      head: [t`${mk}`, ...TABLE_N.map((n) => t`${math`n = ${n}`}`), t`${math`\text{Po}(${L})`}`],
      rows: [0, 1, 2, 3, 4].map((k) => [t`${k}`, ...TABLE_N.map((n) => t`${s4(binomPmf(n, k, L / n))}`), t`${s4(poissonPmf(L, k))}`]),
    },
    checkFrom(limit, { k: 3, kind: 'eq' }, t`By the theorem with ${math`k = ${3}`}: ${math`\frac{e^{-\lambda}\lambda^{${3}}}{${3}!}`}.`),

    { kind: 'section', title: t`Using the approximation` },
    { kind: 'p', text: t`In practice: if ${math`X \sim B(n, p)`} with ${mn} large and ${math`p`} small, use ${math`\text{Po}(\lambda)`} with ${math`\lambda = np`}, the same mean. The STEP Support notes state exactly this rule of thumb.` },
    checkFrom(approx, { c: 1, n: 200, lambda: 1, k: 2 }, t`${math`\lambda = ${200} \times \frac{${1}}{${200}} = ${1}`}, so ${math`P(X = ${2}) \approx e^{-${1}}\frac{${1}^{${2}}}{${2}!}`}.`),
    { kind: 'p', text: t`Why ${math`p`} must be small, not just ${mn} large: the means agree exactly, but the variances are ${math`np(${1} - p)`} against ${math`np`}, off by the factor ${math`${1} - p`}. For ${math`B(${10}, ${0.5})`}, ${math`P(X = ${0}) = ${s4(binomPmf(10, 0, 0.5))}`}, while ${math`\text{Po}(${5})`} gives ${s4(poissonPmf(5, 0))}: not close.` },
    checkFrom(expLimit, { lambda: 2, n: 100 }, t`${math`\left(${1} - \frac{${2}}{${100}}\right)^{${100}}`}, close to but above ${math`e^{-${2}}`}.`),

    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`The Poisson approximation to ${math`B(n, p)`} has mean ${math`p`}.`, counterexample: t`It has mean ${math`np`}. For ${HN} items each faulty with probability ${HP}, the mean is ${HN * HP}, not ${HP}.` },
    { kind: 'pitfall', claim: t`Any binomial with large ${mn} is close to Poisson.`, counterexample: t`${math`B(${1000}, ${q(1, 2)})`} has mean ${500} and variance ${250}, while ${math`\text{Po}(${500})`} has variance ${500}. The approximation needs ${math`p`} small.` },
    { kind: 'pitfall', claim: t`In the proof, ${math`\left(${1} - \frac{\lambda}{n}\right)^{n} \to ${1}`}, since each factor tends to ${1}.`, counterexample: t`The number of factors grows with ${mn}. With ${math`\lambda = ${2}`} and ${math`n = ${1000}`} the power is about ${s4((1 - 2 / 1000) ** 1000)}, nowhere near ${1}; its limit is ${math`e^{-${2}}`}.` },
    { kind: 'takeaway', text: t`Many independent trials with a small chance each give a nearly Poisson count, with ${math`\lambda = np`}: the binomial terms tend to ${math`e^{-\lambda}\lambda^{k}/k!`}.` },
  ],
  examples: [
    { ...proof, examiner: t`The examiner looks for the rearrangement into factors with known limits, the point that ${mk} is fixed, and the exponential limit named.` },
    worked(approx, { c: 0, n: 500, lambda: 2, k: 3 }, t`Three faulty items in ${500}`),
    worked(limit, { k: 2, kind: 'eq' }, t`The limit of ${math`P(X_{n} = ${2})`}`),
  ],
  generators: [approx, limit, expLimit],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['poisson-approximation'],
  cambridge: [notesAtMost, notesVar, general, when, gs5129, gs5117, gs5111],
  // The explanation the notes call for. The faulty-items estimate is one Poisson probability with
  // np put in, the variance substitution is one line, and the general limit is from the schedule.
  // Batch 7: the royal flush, where the exact binomial and the Poisson answers differ by one hand,
  // and the king's coins. The Martian's interval is an argument by analogy, kept as practice.
  gate: ['s2-notes-when', 'gs-5-1-17', 'gs-5-1-29'],
  recall: [
    { front: t`State the Poisson limit of the binomial.`, back: t`For fixed ${ml} and ${mk}, ${math`P(B(n, \lambda/n) = k) \to e^{-\lambda}\lambda^{k}/k!`}.` },
    { front: t`When does ${math`\text{Po}(np)`} approximate ${math`B(n, p)`} well?`, back: t`When ${mn} is large and ${math`p`} is small: the means agree, and the variances differ by the factor ${math`${1} - p`}.` },
  ],
  proofOrder: [{
    title: t`The Poisson limit`,
    steps: [
      t`Write ${math`P(X_{n} = k) = \binom{n}{k}(\lambda/n)^{k}(${1} - \lambda/n)^{n - k}`}.`,
      t`Rearrange into ${math`\frac{\lambda^{k}}{k!}`}, a product of ${mk} factors ${math`\frac{n - i}{n}`}, and two powers.`,
      t`The ${mk} factors tend to ${1}, as does ${math`(${1} - \lambda/n)^{-k}`}.`,
      t`${math`(${1} - \lambda/n)^{n} \to e^{-\lambda}`}, which gives the Poisson probability.`,
    ],
  }],
};
