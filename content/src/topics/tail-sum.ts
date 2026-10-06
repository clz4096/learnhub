/**
 * rv.tail-sum: for X taking values 0, 1, 2, ..., E(X) = Σ_{n ≥ 1} P(X ≥ n). From Mixed STEP 1
 * Statistics Q2 (2010 S1 Q12): define E(X), show the tail-sum formula, then the penguins in
 * cereal boxes, P(X ≥ 4) = p^3 + q^3 and E(X) = 1/(pq) - 1 ≥ 3. The solutions' proof (the
 * rows of a triangle of probabilities) is the lesson's; every official answer is compared.
 */
import type { Rng } from '@learnhub/mastery';
import { auto, cite, same, supervision } from '../cambridge';
import { add, div, int, mul, pick, q, str, sub, toFloat, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { computedTex, join, math, t } from '../rich';
import { worked, workedCambridge, type ProbabilityClaim, type TopicContent } from '../topic';
import { average, far, rpow, rsum, throwsOf } from '../partv-a';

const MIX = 'step-mixed-stats1' as const;
const MIXS = 'step-mixed-stats1-hints' as const;
const distinctFrom = (right: string, xs: readonly string[]): number => new Set(xs.filter((x) => x !== right)).size;

// ---------------------------------------------------------------- tails given

interface TailP { den: number; nums: readonly number[] }
const tailVals = ({ den, nums }: TailP): Rational[] => nums.map((c) => q(c, den));
const tailMis = (p: TailP): string[] => {
  const T = tailVals(p);
  return [str(rsum(T.map((x, i) => mul(q(i + 1), x)))), str(add(q(1), rsum(T))), str(rsum(T.slice(1)))];
};

const tailsGiven = generator<TailP>({
  id: 'tails-given',
  skill: 'Add the tail probabilities P(X ≥ n), n = 1, 2, ..., to get E(X).',
  params: (rng) => {
    for (;;) {
      const den = pick(rng, [6, 8, 10, 12]);
      const m = int(rng, 3, 5);
      const nums = [...new Set(Array.from({ length: m }, () => int(rng, 1, den)))].sort((a, b) => b - a);
      if (nums.length !== m) continue;
      const p: TailP = { den, nums };
      if (distinctFrom(str(rsum(tailVals(p))), tailMis(p)) >= 2) return p;
    }
  },
  sane: ({ den, nums }) => (nums.every((c, i) => c >= 1 && c <= den && (i === 0 || c < (nums[i - 1] as number))) ? null : 'out of range'),
  problem: (p) => {
    const T = tailVals(p);
    const m = T.length;
    return {
      prompt: t`The random variable ${math`X`} takes values in ${math`\{${0}, ${1}, \ldots, ${m}\}`}, with ${join(T.map((x, i) => [math`P(X \ge ${i + 1}) = ${x}`]), ', ')}. Find ${math`E(X)`}.`,
      answer: { kind: 'exact', expected: str(rsum(T)) },
      solution: [
        t`For ${math`X`} taking values ${0}, ${1}, ${2}, and so on, ${math`E(X) = \sum_{n \ge ${1}} P(X \ge n)`}, and here ${math`P(X \ge n) = ${0}`} for ${math`n > ${m}`}.`,
        t`${math`E(X) = ${join(T.map((x) => [math`${x}`]), ' + ')} = ${rsum(T)}`}.`,
      ],
    };
  },
  solve: (p) => {
    // Recover the distribution, P(X = n) = P(X ≥ n) - P(X ≥ n + 1), and use the definition.
    const T = tailVals(p);
    const pmf = T.map((x, i) => sub(x, T[i + 1] ?? q(0)));
    return str(rsum(pmf.map((pr, i) => mul(q(i + 1), pr))));
  },
  misconceptions: (p): Misconception[] => {
    const [a, b, c] = tailMis(p);
    return [
      { response: a as string, why: t`The numbers given are tail probabilities, not ${math`P(X = n)`}. Do not multiply them by ${math`n`}: just add them.` },
      { response: b as string, why: t`That adds ${math`P(X \ge ${0}) = ${1}`} as well. The sum starts at ${math`n = ${1}`}.` },
      { response: c as string, why: t`That leaves out ${math`P(X \ge ${1})`}, the first tail. The sum starts at ${math`n = ${1}`}.` },
    ];
  },
});

// ---------------------------------------------------------------- the least or greatest of several dice

interface DiceP { m: number; k: number; which: 'min' | 'max' }
const tail = ({ m, k, which }: DiceP, n: number): Rational => (which === 'min' ? rpow(q(m - n + 1, m), k) : sub(q(1), rpow(q(n - 1, m), k)));
const diceMean = (p: DiceP): Rational => rsum(Array.from({ length: p.m }, (_, i) => tail(p, i + 1)));

const extremeOfDice = generator<DiceP>({
  id: 'extreme-of-dice',
  skill: 'Find the mean of the least or greatest of several dice by summing P(X ≥ n), which is easier than P(X = n).',
  params: (rng) => ({ m: pick(rng, [4, 6, 8]), k: int(rng, 2, 3), which: pick(rng, ['min', 'max'] as const) }),
  sane: ({ m, k }) => (m >= 4 && k >= 2 && m ** k <= 512 ? null : 'out of range'),
  problem: (p) => {
    const { m, k, which } = p;
    const terms = Array.from({ length: m }, (_, i) => tail(p, i + 1));
    const word = which === 'min' ? 'least' : 'greatest';
    return {
      prompt: t`${k} fair ${m}-sided dice, numbered ${1} to ${m}, are thrown. Let ${math`X`} be the ${word} number shown. Find ${math`E(X)`}.`,
      answer: { kind: 'exact', expected: str(diceMean(p)) },
      solution: which === 'min'
        ? [
            t`${math`X \ge n`} exactly when every die shows at least ${math`n`}, so ${math`P(X \ge n) = \left(\frac{${m + 1} - n}{${m}}\right)^{${k}}`} for ${math`n = ${1}, \ldots, ${m}`}.`,
            t`By the tail-sum formula, ${math`E(X) = \sum_{n = ${1}}^{${m}} P(X \ge n) = ${computedTex(terms.map((x) => (x.den === 1n ? `${x.num}` : `\\frac{${x.num}}{${x.den}}`)).join(' + '))} = ${diceMean(p)}`}.`,
          ]
        : [
            t`${math`X \ge n`} fails exactly when every die shows less than ${math`n`}, so ${math`P(X \ge n) = ${1} - \left(\frac{n - ${1}}{${m}}\right)^{${k}}`} for ${math`n = ${1}, \ldots, ${m}`}.`,
            t`By the tail-sum formula, ${math`E(X) = \sum_{n = ${1}}^{${m}} P(X \ge n) = ${computedTex(terms.map((x) => (x.den === 1n ? `${x.num}` : `\\frac{${x.num}}{${x.den}}`)).join(' + '))} = ${diceMean(p)}`}.`,
          ],
    };
  },
  solve: ({ m, k, which }) => str(average(throwsOf(m, k), (o) => q(which === 'min' ? Math.min(...o) : Math.max(...o)))),
  misconceptions: (p): Misconception[] => [
    { response: str(sub(diceMean(p), q(1))), why: t`That adds ${math`P(X > n)`} instead of ${math`P(X \ge n)`}, which drops one whole unit. Use "at least ${math`n`}".` },
    { response: str(add(diceMean(p), q(1))), why: t`That includes ${math`P(X \ge ${0}) = ${1}`}. For ${math`X`} taking values from ${1}, the sum starts at ${math`n = ${1}`} and ${math`P(X \ge ${1}) = ${1}`} is its first term.` },
    { response: str(q(p.m + 1, 2)), why: t`That is the mean of one die. The ${p.which === 'min' ? 'least' : 'greatest'} of ${p.k} dice is pulled ${p.which === 'min' ? 'down' : 'up'}.` },
  ],
});

// ---------------------------------------------------------------- the penguins

interface PengP { p: Rational }
const PS: readonly Rational[] = [q(1, 2), q(1, 3), q(2, 3), q(1, 4), q(3, 4), q(2, 5), q(3, 5), q(1, 5), q(4, 5), q(1, 6)];
const pengMean = (p: Rational): Rational => sub(div(q(1), mul(p, sub(q(1), p))), q(1));

const penguins = generator<PengP>({
  id: 'penguins',
  skill: 'Find the expected wait until both kinds appear, as in Mixed STEP 1 Statistics Q2: E(X) = 1/(pq) - 1.',
  params: (rng) => ({ p: pick(rng, PS) }),
  sane: ({ p }) => (p.num > 0n && p.num < p.den ? null : 'out of range'),
  problem: ({ p }) => {
    const qq = sub(q(1), p);
    return {
      prompt: t`Each cereal box holds one toy, a daddy penguin with probability ${p} or a mummy penguin with probability ${qq}, independently. Let ${math`X`} be the number of boxes I open to get at least one of each kind. Find ${math`E(X)`}.`,
      answer: { kind: 'exact', expected: str(pengMean(p)) },
      solution: [
        t`${math`X \ge n`} for ${math`n \ge ${2}`} means the first ${math`n - ${1}`} boxes are all the same: ${math`P(X \ge n) = p^{n - ${1}} + q^{n - ${1}}`}. And ${math`P(X \ge ${1}) = ${1}`}.`,
        t`${math`E(X) = ${1} + \sum_{n \ge ${2}} (p^{n - ${1}} + q^{n - ${1}}) = ${1} + \frac{p}{q} + \frac{q}{p} = \frac{${1}}{pq} - ${1}`}. With ${math`p = ${p}`}: ${math`\frac{${1}}{${mul(p, qq)}} - ${1} = ${pengMean(p)}`}.`,
      ],
    };
  },
  solve: ({ p }) => {
    // First step: after the first box, wait for the other kind, a geometric wait with mean 1/(its probability).
    const qq = sub(q(1), p);
    return str(add(q(1), add(mul(p, div(q(1), qq)), mul(qq, div(q(1), p)))));
  },
  misconceptions: ({ p }): Misconception[] => {
    const qq = sub(q(1), p);
    return [
      { response: str(div(q(1), mul(p, qq))), why: t`The first term of the tail sum is ${math`P(X \ge ${1}) = ${1}`}, not ${math`p^{${0}} + q^{${0}} = ${2}`}: subtract ${1}.` },
      { response: str(add(div(p, qq), div(qq, p))), why: t`That leaves out the first box, ${math`P(X \ge ${1}) = ${1}`}.` },
      { response: str(add(div(q(1), p), div(q(1), qq))), why: t`That waits separately for each kind from the start. Whichever kind comes first, you only then wait for the other.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

const P_DOM = { p: { kind: 'real' as const, min: 0.05, max: 0.95 } };
/** E(X) for the penguins by the definition, Σ n P(X = n), summed far enough that the rest is negligible. */
function pengByDefinition(p: number): number {
  const qq = 1 - p;
  let s = 0;
  for (let n = 2; n < 2000; n++) s += n * (p ** (n - 1) * qq + qq ** (n - 1) * p);
  return s;
}
const q2mean = auto({
  id: 'mixed-q2-mean',
  source: cite(MIX, 'Q2'),
  title: t`The penguins: the mean number of boxes`,
  prompt: t`A discrete random variable ${math`X`} takes only positive integer values, and ${math`E(X) = \sum_{n = ${1}}^{\infty} P(X \ge n)`}. Each cereal box contains one daddy penguin, with probability ${math`p`}, or one mummy penguin, with probability ${math`q = ${1} - p`}. ${math`X`} is the number of boxes I open to get at least one of each kind. Find ${math`E(X)`} in terms of ${math`p`}.`,
  answer: { kind: 'expression', expected: '1/(p(1 - p)) - 1', variables: ['p'], domains: P_DOM },
  solution: [
    t`${math`X \ge n`} means the first ${math`n - ${1}`} boxes hold only one kind: ${math`P(X \ge n) = p^{n - ${1}} + q^{n - ${1}}`} for ${math`n \ge ${2}`}. Not for ${math`n = ${1}`}: ${math`P(X \ge ${1}) = ${1}`}, while ${math`p^{${0}} + q^{${0}} = ${2}`}. The discussion warns about exactly this case.`,
    t`${math`E(X) = ${1} + \sum_{n = ${2}}^{\infty} (p^{n - ${1}} + q^{n - ${1}}) = ${1} + \frac{p}{${1} - p} + \frac{q}{${1} - q} = ${1} + \frac{p}{q} + \frac{q}{p}`}.`,
    t`${math`${1} + \frac{p^{${2}} + q^{${2}}}{pq} = ${1} + \frac{(p + q)^{${2}} - ${2}pq}{pq} = \frac{${1}}{pq} - ${1} = \frac{${1}}{p(${1} - p)} - ${1}`}.`,
  ],
  reference: '1/(p(1 - p)) - 1',
  verify: () => {
    for (const p of [0.5, 1 / 3, 0.25, 0.4, 0.1]) {
      if (far(pengByDefinition(p), 1 / (p * (1 - p)) - 1)) return `p = ${p}: the definition gives ${pengByDefinition(p)}`;
    }
    return null;
  },
  misconceptions: [{ response: '1/(p(1 - p))', why: t`That uses ${math`p^{n - ${1}} + q^{n - ${1}}`} for ${math`n = ${1}`} too, giving ${2} instead of ${math`P(X \ge ${1}) = ${1}`}.` }],
  official: { source: cite(MIXS, 'Q2'), answer: '1/(p(1 - p)) - 1', agrees: true },
});

/** P(X ≥ 4) for the penguins: the first three boxes listed, exactly. */
function firstThreeSame(p: Rational): Rational {
  let s = q(0);
  for (let m = 0; m < 8; m++) {
    const kinds = [m & 1, (m >> 1) & 1, (m >> 2) & 1];
    if (kinds[0] !== kinds[1] || kinds[1] !== kinds[2]) continue;
    s = add(s, kinds.reduce((acc, kk) => mul(acc, kk === 1 ? p : sub(q(1), p)), q(1)));
  }
  return s;
}
const q2tail = auto({
  id: 'mixed-q2-tail',
  source: cite(MIX, 'Q2'),
  title: t`The penguins: at least four boxes`,
  prompt: t`With the penguins as in the worked example (daddy with probability ${math`p`}, mummy with ${math`q = ${1} - p`}), find ${math`P(X \ge ${4})`} in terms of ${math`p`}.`,
  answer: { kind: 'expression', expected: 'p^3 + (1 - p)^3', variables: ['p'], domains: P_DOM },
  solution: [
    t`At least four boxes are needed exactly when the first three hold only one kind: all daddies, ${math`p^{${3}}`}, or all mummies, ${math`q^{${3}}`}.`,
    t`${math`P(X \ge ${4}) = p^{${3}} + q^{${3}} = p^{${3}} + (${1} - p)^{${3}}`}.`,
  ],
  reference: 'p^3 + (1 - p)^3',
  verify: () => {
    for (const p of [q(1, 3), q(1, 2), q(3, 7)]) {
      const e = same(`p = ${str(p)}, the eight ways for three boxes`, str(firstThreeSame(p)), str(add(rpow(p, 3), rpow(sub(q(1), p), 3))));
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [{ response: 'p^4 + (1 - p)^4', why: t`${math`X \ge ${4}`} is decided by the first three boxes, not four: the fourth box can be anything.` }],
  official: { source: cite(MIXS, 'Q2'), answer: 'p^3 + (1 - p)^3', agrees: true },
});

const q2min = auto({
  id: 'mixed-q2-least',
  source: cite(MIX, 'Q2'),
  title: t`The penguins: the least possible mean`,
  prompt: t`For the penguins, ${math`E(X) = \frac{${1}}{pq} - ${1}`} with ${math`p + q = ${1}`}. What is the least value ${math`E(X)`} can take, over all ${math`p`} with ${math`${0} < p < ${1}`}?`,
  answer: { kind: 'exact', expected: '3' },
  solution: [
    t`${math`E(X)`} is least when ${math`pq = p(${1} - p)`} is greatest. Completing the square, ${math`p(${1} - p) = \frac{${1}}{${4}} - \left(p - \frac{${1}}{${2}}\right)^{${2}} \le \frac{${1}}{${4}}`}, with equality at ${math`p = \frac{${1}}{${2}}`}.`,
    t`So ${math`E(X) \ge ${4} - ${1} = ${3}`}, the value at ${math`p = \frac{${1}}{${2}}`}: ${math`E(X) \ge ${3}`}, as the question asks you to show.`,
  ],
  reference: '3',
  verify: () => {
    // A grid of p, and the exact value at p = 1/2.
    let best = Infinity;
    for (let i = 1; i < 1000; i++) { const p = i / 1000; best = Math.min(best, 1 / (p * (1 - p)) - 1); }
    return same('the least value on a grid, rounded', Math.round(best * 1e6) / 1e6, 3) ?? same('exact at p = 1/2', str(pengMean(q(1, 2))), '3');
  },
  misconceptions: [{ response: '2', why: t`You need at least two boxes, but the mean is more: when the first two match you wait longer. The least mean is at ${math`p = \frac{${1}}{${2}}`}.` }],
  official: { source: cite(MIXS, 'Q2'), answer: '3', agrees: true },
});

const q2proof = supervision({
  id: 'mixed-q2-proof',
  source: cite(MIX, 'Q2'),
  title: t`Define ${math`E(X)`} and prove the tail-sum formula`,
  prompt: t`A discrete random variable ${math`X`} takes only positive integer values. Define ${math`E(X)`}, and show that ${math`E(X) = \sum_{n = ${1}}^{\infty} P(X \ge n)`}. The discussion suggests writing ${math`${3} \times P(X = ${3})`} as ${math`P(X = ${3}) + P(X = ${3}) + P(X = ${3})`}. Say why rearranging the terms of the sum is allowed here.`,
  writeUp: 'proof',
  official: cite(MIXS, 'Q2'),
});

// ---------------------------------------------------------------- lesson

/** One run of the penguin boxes, true when at least n boxes are needed. */
const atLeastBoxes = (p: Rational, n: number, rng: Rng): boolean => {
  const first = rng() < toFloat(p);
  let boxes = 1;
  while ((rng() < toFloat(p)) === first) boxes++;
  return boxes + 1 >= n;
};
const claims: ProbabilityClaim[] = [
  { what: 'penguins with p = 1/3: at least four boxes', exact: add(rpow(q(1, 3), 3), rpow(q(2, 3), 3)), trial: (rng) => atLeastBoxes(q(1, 3), 4, rng) },
];

export const tailSum: TopicContent = {
  topicId: 'rv.tail-sum',
  goal: t`For ${math`X`} taking values ${0}, ${1}, ${2}, and so on, compute ${math`E(X)`} as ${math`\sum_{n \ge ${1}} P(X \ge n)`}, and use it when the tails are easier than the distribution.`,
  lesson: [
    { kind: 'p', text: t`The tail probabilities of ${math`X`} are ${math`P(X \ge ${1}), P(X \ge ${2}), \ldots`}. For a random variable with values ${0}, ${1}, ${2}, and so on, they add up to the mean.` },
    { kind: 'rule', text: t`The [[tail-sum-formula|tail-sum formula]]: ${math`E(X) = \sum_{n = ${1}}^{\infty} P(X \ge n)`}.` },
    { kind: 'p', text: t`Why: write ${math`n \, P(X = n)`} as ${math`n`} copies of ${math`P(X = n)`}, one in each of the first ${math`n`} rows. Row ${math`k`} then holds ${math`P(X = k) + P(X = k + ${1}) + \cdots = P(X \ge k)`}, and adding the rows gives ${math`E(X)`}. The terms are all at least ${0}, so rearranging them does not change the sum.` },
    { kind: 'list', items: [
      t`${math`P(X = ${1}) + P(X = ${2}) + P(X = ${3}) + \cdots = P(X \ge ${1})`}`,
      t`${math`\phantom{P(X = ${1}) + {}} P(X = ${2}) + P(X = ${3}) + \cdots = P(X \ge ${2})`}`,
      t`${math`\phantom{P(X = ${1}) + P(X = ${2}) + {}} P(X = ${3}) + \cdots = P(X \ge ${3})`}`,
    ] },
    { kind: 'p', text: t`Use it when "at least ${math`n`}" is easy. In Mixed STEP ${1} Statistics Q${2}, at least ${math`n`} boxes are needed to collect both kinds of penguin exactly when the first ${math`n - ${1}`} boxes match, so ${math`P(X \ge n) = p^{n - ${1}} + q^{n - ${1}}`} for ${math`n \ge ${2}`}. Take care with ${math`n = ${1}`}: ${math`P(X \ge ${1}) = ${1}`}, not ${2}. For ${math`p = ${q(1, 3)}`}, ${math`P(X \ge ${4}) = ${add(rpow(q(1, 3), 3), rpow(q(2, 3), 3))}`}, and ${math`E(X) = \frac{${1}}{pq} - ${1} = ${pengMean(q(1, 3))}`}.` },
  ],
  examples: [
    workedCambridge(q2mean),
    worked(extremeOfDice, { m: 6, k: 2, which: 'min' }, t`The smaller of two dice`),
    worked(tailsGiven, { den: 10, nums: [9, 6, 2] }, t`Tails given, mean wanted`),
  ],
  generators: [tailsGiven, extremeOfDice, penguins],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['tail-sum-formula'],
  claims,
  cambridge: [q2tail, q2min, q2proof],
  gate: ['mixed-q2-tail', 'mixed-q2-least', 'mixed-q2-proof'],
};
