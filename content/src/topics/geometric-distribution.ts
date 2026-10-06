/**
 * prob.geometric-distribution: the wait for the first success in independent trials, as
 * the number of trials up to and including it (values 1, 2, ...) or the number of failures
 * before it (values 0, 1, ...). From the STEP 3 Statistics topic notes, pages 1 and 2 (the
 * pmf, the sum to 1, E(X) = 1/p by differentiating the geometric series, Var(X) = (1 - p)/p^2),
 * STEP 3 Statistics Q2 (2010 S3 Q12: Arthur's expected number of shots is 1/a, compared
 * with the official solution), IA Probability Sheet 2 Q11 (the coupon collector) and Sheet 3
 * Q5 (the negative binomial as a sum of geometric waits). The notes say the geometric
 * distribution is not on the 2019 STEP specification; the IA schedule lists it.
 */
import type { Rng } from '@learnhub/mastery';
import { auto, cite, same, supervision } from '../cambridge';
import { add, int, mul, pick, q, str, sub, toFloat, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { chance, distinctFrom, nearestFraction, pow } from '../partv-c';
import { math, t, type Rich } from '../rich';
import { worked, workedCambridge, type ProbabilityClaim, type TopicContent } from '../topic';

const S3 = 'step-s3-stats' as const;
const S3N = 'step-s3-stats-notes' as const;
const PS: readonly Rational[] = [q(1, 2), q(1, 3), q(1, 4), q(1, 5), q(1, 6), q(2, 3), q(3, 4), q(2, 5), q(3, 5)];
type Conv = 'trials' | 'failures';

/** The number of trials up to and including the first success. */
const trialsDraw = (p: Rational, rng: Rng): number => { let n = 1; while (!chance(p, rng)) n++; return n; };

function setting(p: Rational, conv: Conv): Rich {
  return conv === 'trials'
    ? t`A biased coin shows heads with probability ${p} on each toss, independently. Let ${math`X`} be the number of tosses up to and including the first head.`
    : t`A biased coin shows heads with probability ${p} on each toss, independently. Let ${math`Y`} be the number of tails before the first head.`;
}
const V = (conv: Conv) => (conv === 'trials' ? math`X` : math`Y`);

// ---------------------------------------------------------------- a single probability

interface PmfP { p: Rational; r: number; conv: Conv }
const pmfVal = ({ p, r, conv }: PmfP): Rational => mul(pow(sub(q(1), p), conv === 'trials' ? r - 1 : r), p);
function pmfMis({ p, r, conv }: PmfP): [Rational, Rich][] {
  const f = sub(q(1), p);
  const other = mul(pow(f, conv === 'trials' ? r : r - 1), p);
  return [
    [other, conv === 'trials'
      ? t`${math`X = ${r}`} means ${r - 1} tails and then a head: the power of ${f} is ${r - 1}, because the ${r}th toss is the head.`
      : t`${math`Y = ${r}`} means ${r} tails and then a head, so the power of ${f} is ${r}: ${math`Y`} counts only the tails.`],
    [mul(pow(p, conv === 'trials' ? r - 1 : r), f), t`The roles are swapped: the failures are tails, with probability ${f} each, and the one success is a head, with probability ${p}.`],
    [pow(f, conv === 'trials' ? r - 1 : r), t`That is the chance of the tails alone. The head that ends the wait has probability ${p}: multiply by it.`],
  ];
}

const pmf = generator<PmfP>({
  id: 'pmf',
  skill: 'Find a geometric probability in either convention: trials up to and including the first success, or failures before it.',
  params: (rng) => {
    for (;;) {
      const p: PmfP = { p: pick(rng, PS), r: int(rng, 2, 6), conv: pick(rng, ['trials', 'failures'] as const) };
      if (distinctFrom(str(pmfVal(p)), pmfMis(p).map(([x]) => str(x))) >= 2) return p;
    }
  },
  sane: ({ p, r }) => (p.num > 0n && p.num < p.den && r >= 1 ? null : 'out of range'),
  problem: (pp) => {
    const { p, r, conv } = pp;
    const f = sub(q(1), p);
    const tails = conv === 'trials' ? r - 1 : r;
    return {
      prompt: t`${setting(p, conv)} Find ${math`\mathbb{P}(${V(conv)} = ${r})`}.`,
      answer: { kind: 'exact', expected: str(pmfVal(pp)) },
      solution: [
        tails === 1
          ? t`${math`${V(conv)} = ${r}`} happens exactly when the first toss is a tail and the second is a head.`
          : t`${math`${V(conv)} = ${r}`} happens exactly when the first ${tails} tosses are tails and the next is a head.`,
        t`By independence, ${math`\mathbb{P}(${V(conv)} = ${r}) = \left(${f}\right)^{${tails}} \cdot ${p} = ${pmfVal(pp)}`}.`,
      ],
    };
  },
  solve: ({ p, r, conv }) => {
    // Walk the tosses one at a time: the chance that the wait is still going, then the head.
    let alive = q(1);
    const need = conv === 'trials' ? r : r + 1;
    for (let toss = 1; toss < need; toss++) alive = mul(alive, sub(q(1), p));
    return str(mul(alive, p));
  },
  misconceptions: (p): Misconception[] => pmfMis(p).map(([x, why]) => ({ response: str(x), why })),
  trial: ({ p, r, conv }, rng) => trialsDraw(p, rng) - (conv === 'trials' ? 0 : 1) === r,
});

// ---------------------------------------------------------------- a tail probability

type Tail = 'gt' | 'ge';
interface TailP { p: Rational; r: number; conv: Conv; tail: Tail }
/** The number of tails that must come first. */
const tailsNeeded = ({ r, conv, tail }: TailP): number => (conv === 'trials' ? (tail === 'gt' ? r : r - 1) : (tail === 'gt' ? r + 1 : r));
const tailVal = (p: TailP): Rational => pow(sub(q(1), p.p), tailsNeeded(p));
function tailMis(pp: TailP): [Rational, Rich][] {
  const f = sub(q(1), pp.p);
  const k = tailsNeeded(pp);
  const rel = pp.tail === 'gt' ? math`>` : math`\ge`;
  return [
    [pow(f, k + 1), t`One toss too many: ${math`${V(pp.conv)} ${rel} ${pp.r}`} needs exactly the first ${k} tosses to be tails.`],
    [pow(f, k - 1), t`One toss too few: ${math`${V(pp.conv)} ${rel} ${pp.r}`} needs the first ${k} tosses to be tails, not ${k - 1}.`],
    [sub(q(1), tailVal(pp)), t`That is the chance of the complement, a head within the first ${k} tosses.`],
  ];
}

const tailProbability = generator<TailP>({
  id: 'tail',
  skill: 'Find a geometric tail probability as the chance that the first few trials all fail.',
  params: (rng) => {
    for (;;) {
      const p: TailP = { p: pick(rng, PS), r: int(rng, 2, 6), conv: pick(rng, ['trials', 'failures'] as const), tail: pick(rng, ['gt', 'ge'] as const) };
      if (tailsNeeded(p) >= 2 && distinctFrom(str(tailVal(p)), tailMis(p).map(([x]) => str(x))) >= 2) return p;
    }
  },
  sane: ({ p, r }) => (p.num > 0n && p.num < p.den && r >= 2 ? null : 'out of range'),
  problem: (pp) => {
    const f = sub(q(1), pp.p);
    const k = tailsNeeded(pp);
    const rel = pp.tail === 'gt' ? math`>` : math`\ge`;
    return {
      prompt: t`${setting(pp.p, pp.conv)} Find ${math`\mathbb{P}(${V(pp.conv)} ${rel} ${pp.r})`}.`,
      answer: { kind: 'exact', expected: str(tailVal(pp)) },
      solution: [
        t`${math`${V(pp.conv)} ${rel} ${pp.r}`} happens exactly when the first ${k} tosses are all tails; what happens after does not matter.`,
        t`So the probability is ${math`\left(${f}\right)^{${k}} = ${tailVal(pp)}`}. Adding the masses ${math`\mathbb{P}(${V(pp.conv)} = j)`} over the tail gives the same geometric sum.`,
      ],
    };
  },
  solve: (pp) => {
    // One minus the masses below the tail, added exactly.
    const f = sub(q(1), pp.p);
    const start = pp.conv === 'trials' ? 1 : 0;
    const last = pp.tail === 'gt' ? pp.r : pp.r - 1;
    let below = q(0);
    for (let j = start; j <= last; j++) below = add(below, mul(pow(f, j - start), pp.p));
    return str(sub(q(1), below));
  },
  misconceptions: (p): Misconception[] => tailMis(p).map(([x, why]) => ({ response: str(x), why })),
  trial: (pp, rng) => {
    const v = trialsDraw(pp.p, rng) - (pp.conv === 'trials' ? 0 : 1);
    return pp.tail === 'gt' ? v > pp.r : v >= pp.r;
  },
});

// ---------------------------------------------------------------- mean and variance

type Moment = 'mean' | 'var';
interface MomP { p: Rational; conv: Conv; moment: Moment }
const momVal = ({ p, conv, moment }: MomP): Rational => {
  const f = sub(q(1), p);
  if (moment === 'var') return mul(f, q(p.den * p.den, p.num * p.num));
  return conv === 'trials' ? q(p.den, p.num) : mul(f, q(p.den, p.num));
};
function momMis(mp: MomP): [Rational, Rich][] {
  const { p, conv, moment } = mp;
  const f = sub(q(1), p);
  if (moment === 'mean') {
    return [
      [conv === 'trials' ? mul(f, q(p.den, p.num)) : q(p.den, p.num), conv === 'trials'
        ? t`That is the mean number of tails before the head. ${math`X`} also counts the head itself, so add ${1}.`
        : t`That is the mean number of tosses including the head. ${math`Y`} counts only the tails, one fewer.`],
      [q(f.den, f.num), t`The mean wait is ${math`${1}/p`} with ${math`p`} the chance of the success that ends it: here ${p}, not ${f}.`],
      [p, t`A rarer success means a longer wait, so the mean grows as ${math`p`} shrinks: ${math`\mathbb{E}(X) = ${1}/p`}.`],
    ];
  }
  return [
    [q(p.den * p.den, p.num * p.num), t`That is ${math`\mathbb{E}(X)^{${2}}`}. The variance is ${math`\mathbb{E}(X^{${2}}) - \mathbb{E}(X)^{${2}} = (${1} - p)/p^{${2}}`}.`],
    [mul(f, q(p.den, p.num)), t`The square of ${math`p`} belongs in the denominator: ${math`\operatorname{Var} = (${1} - p)/p^{${2}}`}.`],
    [mul(p, f), t`That is the variance of a single Bernoulli trial. A long wait varies far more: ${math`(${1} - p)/p^{${2}}`}.`],
  ];
}

const meanVariance = generator<MomP>({
  id: 'mean-variance',
  skill: 'State the mean and variance of a geometric wait in either convention.',
  params: (rng) => {
    for (;;) {
      const p: MomP = { p: pick(rng, PS), conv: pick(rng, ['trials', 'failures'] as const), moment: pick(rng, ['mean', 'mean', 'var'] as const) };
      if (distinctFrom(str(momVal(p)), momMis(p).map(([x]) => str(x))) >= 2) return p;
    }
  },
  sane: ({ p }) => (p.num > 0n && p.num < p.den ? null : 'out of range'),
  problem: (mp) => {
    const { p, conv, moment } = mp;
    const f = sub(q(1), p);
    const what = moment === 'mean' ? math`\mathbb{E}(${V(conv)})` : math`\operatorname{Var}(${V(conv)})`;
    const steps: Rich[] = moment === 'mean'
      ? (conv === 'trials'
        ? [t`${math`\mathbb{E}(X) = \sum_{n \ge ${1}} n\,(${1} - p)^{n - ${1}} p = p \cdot \frac{${1}}{(${1} - (${1} - p))^{${2}}} = \frac{${1}}{p}`}, differentiating the geometric series.`, t`With ${math`p = ${p}`}: ${math`\mathbb{E}(X) = ${momVal(mp)}`}.`]
        : [t`${math`Y = X - ${1}`}, where ${math`X`} counts the tosses including the head, so ${math`\mathbb{E}(Y) = \frac{${1}}{p} - ${1} = \frac{${1} - p}{p}`}.`, t`With ${math`p = ${p}`}: ${math`\mathbb{E}(Y) = ${momVal(mp)}`}.`])
      : [t`${math`\operatorname{Var}(X) = \frac{${1} - p}{p^{${2}}}`}, and shifting by ${1} (from ${math`X`} to ${math`Y = X - ${1}`}) does not change a variance.`, t`With ${math`p = ${p}`}: ${math`\frac{${f}}{${mul(p, p)}} = ${momVal(mp)}`}.`];
    return {
      prompt: t`${setting(p, conv)} Find ${what}.`,
      answer: { kind: 'exact', expected: str(momVal(mp)) },
      solution: steps,
    };
  },
  solve: ({ p, conv, moment }) => {
    // Sum the series term by term in floating point, then name the fraction.
    const pf = toFloat(p);
    let m1 = 0;
    let m2 = 0;
    for (let n = 1; n < 3000; n++) {
      const w = (1 - pf) ** (n - 1) * pf;
      const v = conv === 'trials' ? n : n - 1;
      m1 += v * w;
      m2 += v * v * w;
    }
    return str(nearestFraction(moment === 'mean' ? m1 : m2 - m1 * m1, 1000));
  },
  misconceptions: (p): Misconception[] => momMis(p).map(([x, why]) => ({ response: str(x), why })),
});

// ---------------------------------------------------------------- Cambridge problems

const A_DOM = { a: { kind: 'real' as const, min: 0.05, max: 0.95 } };
const arthur = auto({
  id: 's3-q2-arthur',
  source: cite(S3, 'Q2 (2010 S3 Q12)'),
  title: t`Arthur's expected number of shots`,
  prompt: t`The infinite series ${math`S = ${1} + (${1} + d)r + (${1} + ${2}d)r^{${2}} + \cdots + (${1} + nd)r^{n} + \cdots`}, for ${math`|r| < ${1}`}, has sum ${math`S = \frac{${1}}{${1} - r} + \frac{rd}{(${1} - r)^{${2}}}`}. Arthur shoots arrows at a target; each arrow hits with probability ${math`a`}, independently of all others. Find the expected number of shots it takes Arthur to hit the target, as an expression in ${math`a`}.`,
  answer: { kind: 'expression', expected: '1/a', variables: ['a'], domains: A_DOM },
  solution: [
    t`Arthur first hits on shot ${math`n`} with probability ${math`{a'}^{n - ${1}} a`}, where ${math`a' = ${1} - a`}: ${math`n - ${1}`} misses, then a hit.`,
    t`So the expected number of shots is ${math`a + ${2}a'a + ${3}{a'}^{${2}}a + \cdots = a\left(${1} + ${2}a' + ${3}{a'}^{${2}} + \cdots\right)`}.`,
    t`The bracket is ${math`S`} with ${math`d = ${1}`} and ${math`r = a'`}: ${math`\frac{${1}}{a} + \frac{a'}{a^{${2}}} = \frac{a + ${1} - a}{a^{${2}}} = \frac{${1}}{a^{${2}}}`}. Multiplying by ${math`a`} gives ${math`\frac{${1}}{a}`}.`,
  ],
  reference: '1/a',
  verify: () => {
    for (const a of [0.1, 0.25, 0.5, 0.8]) {
      let e = 0;
      for (let n = 1; n < 5000; n++) e += n * (1 - a) ** (n - 1) * a;
      // The series formula with d = 1 and r = 1 - a, times a.
      const viaS = a * (1 / a + (1 - a) / (a * a));
      if (Math.abs(e - 1 / a) > 1e-9 || Math.abs(viaS - 1 / a) > 1e-9) return `a = ${a}: series ${e}, via S ${viaS}`;
    }
    return null;
  },
  misconceptions: [
    { response: '1/(1 - a)', why: t`The wait ends at a hit, which has probability ${math`a`}: the mean wait is ${math`${1}/a`}.` },
    { response: '(1 - a)/a', why: t`That is the expected number of misses before the hit. The question counts the hit too.` },
  ],
  official: { source: cite('step-s3-stats-solutions', 'Q2'), answer: '1/a', agrees: true },
});

const SIXTH = q(1, 6);
const FIRST_SIX_ON = 4;
const sixAt = mul(pow(sub(q(1), SIXTH), FIRST_SIX_ON - 1), SIXTH);
const firstSix = auto({
  id: 's3-notes-first-six',
  source: cite(S3N, 'page 1', true),
  title: t`The first six on the fourth roll`,
  prompt: t`A fair die is rolled until a six appears, and ${math`X`} is the number of rolls. What is the probability that the first six is on roll ${FIRST_SIX_ON}?`,
  answer: { kind: 'exact', expected: str(sixAt) },
  solution: [
    t`${math`X \sim \operatorname{Geo}\left(${SIXTH}\right)`}: the first ${FIRST_SIX_ON - 1} rolls are not sixes, then a six.`,
    t`${math`\mathbb{P}(X = ${FIRST_SIX_ON}) = \left(${sub(q(1), SIXTH)}\right)^{${FIRST_SIX_ON - 1}} \cdot ${SIXTH} = ${sixAt}`}.`,
  ],
  reference: str(sixAt),
  verify: () => {
    // Every sequence of four rolls, counting those whose first six is the fourth.
    let hits = 0;
    let all = 0;
    for (let n = 0; n < 6 ** FIRST_SIX_ON; n++) {
      const rolls = Array.from({ length: FIRST_SIX_ON }, (_, i) => Math.floor(n / 6 ** i) % 6 + 1);
      all++;
      if (rolls.findIndex((x) => x === 6) === FIRST_SIX_ON - 1) hits++;
    }
    return same('first six on roll 4', str(q(hits, all)), str(sixAt));
  },
  misconceptions: [
    { response: str(pow(sub(q(1), SIXTH), FIRST_SIX_ON - 1)), why: t`That is the chance of ${FIRST_SIX_ON - 1} rolls without a six. The six on roll ${FIRST_SIX_ON} has probability ${SIXTH}: multiply by it.` },
    { response: str(SIXTH), why: t`Each roll is a six with probability ${SIXTH}, but "first" means the earlier rolls were not sixes.` },
  ],
});

const P_DOM = { p: { kind: 'real' as const, min: 0.05, max: 0.95 } };
const varianceNotes = auto({
  id: 's3-notes-variance',
  source: cite(S3N, 'page 2'),
  title: t`The variance of a geometric wait`,
  prompt: t`${math`X`} is the number of independent trials up to and including the first success, each a success with probability ${math`p`}. Differentiating ${math`${1} + q + q^{${2}} + \cdots = (${1} - q)^{-${1}}`} twice, with ${math`q = ${1} - p`}, find ${math`\operatorname{Var}(X)`} as an expression in ${math`p`}.`,
  answer: { kind: 'expression', expected: '(1 - p)/p^2', variables: ['p'], domains: P_DOM },
  solution: [
    t`Once: ${math`${1} + ${2}q + ${3}q^{${2}} + \cdots = (${1} - q)^{-${2}}`}, so ${math`\mathbb{E}(X) = p(${1} - q)^{-${2}} = ${1}/p`}.`,
    t`Twice: ${math`${2} + ${3} \cdot ${2}q + ${4} \cdot ${3}q^{${2}} + \cdots = ${2}(${1} - q)^{-${3}}`}. Subtracting the first series gives ${math`\sum_{n} n^{${2}} q^{n - ${1}} = \frac{${2}}{p^{${3}}} - \frac{${1}}{p^{${2}}} = \frac{${2} - p}{p^{${3}}}`}, so ${math`\mathbb{E}(X^{${2}}) = \frac{${2} - p}{p^{${2}}}`}.`,
    t`${math`\operatorname{Var}(X) = \frac{${2} - p}{p^{${2}}} - \frac{${1}}{p^{${2}}} = \frac{${1} - p}{p^{${2}}}`}.`,
  ],
  reference: '(1 - p)/p^2',
  verify: () => {
    for (const p of [0.1, 1 / 6, 0.5, 0.9]) {
      let m1 = 0;
      let m2 = 0;
      for (let n = 1; n < 5000; n++) { const w = (1 - p) ** (n - 1) * p; m1 += n * w; m2 += n * n * w; }
      if (Math.abs(m2 - m1 * m1 - (1 - p) / (p * p)) > 1e-7) return `p = ${p}: series ${m2 - m1 * m1}`;
    }
    return null;
  },
  misconceptions: [
    { response: '1/p^2', why: t`That is ${math`\mathbb{E}(X)^{${2}}`}. Subtract it from ${math`\mathbb{E}(X^{${2}}) = (${2} - p)/p^{${2}}`}.` },
    { response: '(2 - p)/p^2', why: t`That is ${math`\mathbb{E}(X^{${2}})`}. The variance subtracts ${math`\mathbb{E}(X)^{${2}} = ${1}/p^{${2}}`}.` },
  ],
  official: { source: cite(S3N, 'page 2'), answer: '(1 - p)/p^2', agrees: true },
});

const coupon = supervision({
  id: 'ia-s2-q11-coupons',
  source: cite('ia-prob-sheet-2', 'Q11'),
  title: t`Collecting a complete set`,
  prompt: t`Sarah collects figures from cornflakes packets. Each packet contains one of ${math`n`} distinct figures, each type equally likely. Show that the expected number of packets she needs to buy to collect a complete set is ${math`n \sum_{i = ${1}}^{n} \frac{${1}}{i}`}. Write the total as a sum of waits: what is the distribution of the wait for a new figure when she already has ${math`k`}?`,
  writeUp: 'proof',
});
const negBin = supervision({
  id: 'ia-s3-q5-sum-of-geometrics',
  source: cite('ia-prob-sheet-3', 'Q5', true),
  title: t`The wait for success number ${math`a`}`,
  prompt: t`Independent Bernoulli trials succeed with probability ${math`p`}, and ${math`X`} is the number of trials up to and including the ${math`a`}th success. Show that ${math`\mathbb{P}(X = r) = \binom{r - ${1}}{a - ${1}} p^{a} q^{r - a}`} for ${math`r = a, a + ${1}, \ldots`}, with ${math`q = ${1} - p`}. Explain how ${math`X`} is the sum of ${math`a`} independent geometric waits, all with the same distribution, and use this to find ${math`\mathbb{E}(X)`} and ${math`\operatorname{Var}(X)`}.`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

const THIRD_ROLL = mul(pow(q(5, 6), 2), SIXTH);
const claims: ProbabilityClaim[] = [
  { what: 'the first six is on the third roll', exact: THIRD_ROLL, trial: (rng) => trialsDraw(SIXTH, rng) === 3 },
  { what: 'memoryless: no six in rolls 3 to 5 given none in rolls 1 and 2', exact: pow(q(5, 6), 3), trial: (rng) => { for (;;) { const x = trialsDraw(SIXTH, rng); if (x > 2) return x > 5; } } },
];

export const geometricDistribution: TopicContent = {
  topicId: 'prob.geometric-distribution',
  goal: t`Model the wait for the first success in independent trials, with its probabilities, tails, mean, and variance, in both conventions.`,
  lesson: [
    { kind: 'p', text: t`Repeat independent trials, each a success with probability ${math`p`}, until the first success. The wait is random, and its distribution is the same whatever the trials are: tosses until a head, rolls until a six, shots until a hit.` },
    { kind: 'rule', text: t`The [[geometric-distribution|geometric distribution]]: if ${math`X`} is the number of trials up to and including the first success, ${math`\mathbb{P}(X = r) = (${1} - p)^{r - ${1}} p`} for ${math`r = ${1}, ${2}, \ldots`}. If ${math`Y = X - ${1}`} counts the failures before it, ${math`\mathbb{P}(Y = k) = (${1} - p)^{k} p`} for ${math`k = ${0}, ${1}, \ldots`}. Always check which one a question means.` },
    { kind: 'p', text: t`The masses add to ${1}: ${math`p\left(${1} + q + q^{${2}} + \cdots\right) = p \cdot \frac{${1}}{${1} - q} = ${1}`}, with ${math`q = ${1} - p`}. The tail is simpler still: ${math`X > r`} exactly when the first ${math`r`} trials fail, so ${math`\mathbb{P}(X > r) = q^{r}`}. For a die and the first six, the chance it comes on roll ${3} is ${math`\left(${q(5, 6)}\right)^{${2}} \cdot ${SIXTH} = ${THIRD_ROLL}`}.` },
    { kind: 'p', text: t`Differentiating the geometric series ${math`\sum_{n} q^{n} = (${1} - q)^{-${1}}`} gives ${math`\sum_{n} n q^{n - ${1}} = (${1} - q)^{-${2}}`}, so ${math`\mathbb{E}(X) = p(${1} - q)^{-${2}} = ${1}/p`}: a six takes ${6} rolls on average. Differentiating again gives ${math`\mathbb{E}(X^{${2}}) = (${2} - p)/p^{${2}}`} and ${math`\operatorname{Var}(X) = (${1} - p)/p^{${2}}`}. For ${math`Y`}, the mean is ${math`(${1} - p)/p`} and the variance is the same.` },
    { kind: 'p', text: t`The wait has [[geometric-memoryless|no memory]]: ${math`\mathbb{P}(X > m + n \mid X > m) = q^{m + n}/q^{m} = q^{n}`}. After two rolls without a six, the chance of three more without one is ${math`\left(${q(5, 6)}\right)^{${3}} = ${pow(q(5, 6), 3)}`}, as at the start.` },
    { kind: 'p', text: t`Waits add up. The wait for the ${math`a`}th success is a sum of ${math`a`} independent geometric waits, and collecting all ${math`n`} figures in Sheet ${2} Q${11} is a sum of ${math`n`} geometric waits with success probabilities ${math`n/n, (n - ${1})/n, \ldots, ${1}/n`}.` },
  ],
  examples: [
    workedCambridge(arthur),
    worked(pmf, { p: q(1, 3), r: 4, conv: 'failures' }, t`Counting failures, not trials`),
    worked(tailProbability, { p: q(1, 4), r: 3, conv: 'trials', tail: 'gt' }, t`A tail as a run of failures`),
  ],
  generators: [pmf, tailProbability, meanVariance],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['geometric-distribution', 'geometric-memoryless'],
  claims,
  cambridge: [firstSix, varianceNotes, coupon, negBin],
};
