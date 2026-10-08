/**
 * rv.tail-sum: for X taking values 0, 1, 2, ..., E(X) = Σ_{n ≥ 1} P(X ≥ n). From Mixed STEP 1
 * Statistics Q2 (2010 S1 Q12): define E(X), show the tail-sum formula, then the penguins in
 * cereal boxes, P(X ≥ 4) = p^3 + q^3 and E(X) = 1/(pq) - 1 ≥ 3. The solutions' proof (the
 * rows of a triangle of probabilities) is the lesson's; every official answer is compared.
 */
import type { Rng } from '@learnhub/mastery';
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { add, div, int, mul, pick, q, str, sub, toFloat, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { computedTex, dmath, join, math, t } from '../rich';
import { checkFrom, worked, workedCambridge, type ProbabilityClaim, type TopicContent } from '../topic';
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
  nudge: t`Not quite. Decide which first boxes force at least four boxes.`,
  hints: [
    t`If ${math`X \ge ${4}`}, what must be true of the first three boxes?`,
    t`In which ways can the first three boxes all be the same, and with what probabilities?`,
    t`Does the fourth box matter to the event ${math`X \ge ${4}`}?`,
  ],
  answer: { kind: 'expression', expected: 'p^3 + (1 - p)^3', variables: ['p'], domains: P_DOM },
  solution: [
    t`At least four boxes are needed exactly when the first three hold only one kind: all daddies, ${math`p^{${3}}`}, or all mummies, ${math`q^{${3}}`}.`,
    t`${math`P(X \ge ${4}) = p^{${3}} + q^{${3}} = p^{${3}} + (${1} - p)^{${3}}`}.`,
    t`Translate a tail event into what the first few trials must look like.`,
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
  nudge: t`Not quite. Make ${math`pq`} as large as possible, subject to ${math`p + q = ${1}`}.`,
  hints: [
    t`Which product must be as large as possible to make ${math`E(X)`} small?`,
    t`Completing the square, what is the greatest value of ${math`p(${1} - p)`}?`,
    t`What is ${math`E(X)`} at that ${math`p`}?`,
  ],
  answer: { kind: 'exact', expected: '3' },
  solution: [
    t`${math`E(X)`} is least when ${math`pq = p(${1} - p)`} is greatest. Completing the square, ${math`p(${1} - p) = \frac{${1}}{${4}} - \left(p - \frac{${1}}{${2}}\right)^{${2}} \le \frac{${1}}{${4}}`}, with equality at ${math`p = \frac{${1}}{${2}}`}.`,
    t`So ${math`E(X) \ge ${4} - ${1} = ${3}`}, the value at ${math`p = \frac{${1}}{${2}}`}: ${math`E(X) \ge ${3}`}, as the question states.`,
    t`Minimise a reciprocal by maximising what is underneath.`,
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
  prompt: t`A discrete random variable ${math`X`} takes only positive integer values. Define ${math`E(X)`}, and show that ${math`E(X) = \sum_{n = ${1}}^{\infty} P(X \ge n)`}. The discussion suggests writing ${math`${3} \times P(X = ${3})`} as ${math`P(X = ${3}) + P(X = ${3}) + P(X = ${3})`}. State why rearranging the terms of the sum is allowed here.`,
  hints: [
    t`What is ${math`E(X)`} for a variable on the positive integers, written as a sum?`,
    t`Writing ${math`nP(X = n)`} as ${math`n`} copies of ${math`P(X = n)`}, which terms collect into ${math`P(X \ge ${1})`}, ${math`P(X \ge ${2})`}, and so on?`,
    t`Why does rearranging a series of non-negative terms leave its sum unchanged?`,
  ],
  writeUp: 'proof',
  official: cite(MIXS, 'Q2'),
});

// ---------------------------------------------------------------- lesson

const MIN2: DiceP = { m: 6, k: 2, which: 'min' };
const minTails = Array.from({ length: 6 }, (_, i) => tail(MIN2, i + 1));
const claims: ProbabilityClaim[] = [
  { what: 'two dice: the smaller is at least 3', exact: tail(MIN2, 3), trial: (rng: Rng) => Math.min(1 + Math.floor(rng() * 6), 1 + Math.floor(rng() * 6)) >= 3 },
];
const mX = math`X`;

export const tailSum: TopicContent = {
  topicId: 'rv.tail-sum',
  goal: t`For ${math`X`} taking values ${0}, ${1}, ${2}, and so on, compute ${math`E(X)`} as ${math`\sum_{n \ge ${1}} P(X \ge n)`}, and use it when the tails are easier than the distribution.`,
  objective: t`Find the mean of a whole-number random variable by adding its tail probabilities.`,
  why: t`For minima, maxima and waiting times the tails are easy when the distribution is not; STEP uses this often.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`An easier question` },
    { kind: 'hook', text: t`Throw two dice and keep the smaller number. What is its average? Working out ${math`P(X = n)`} for each ${math`n`} takes care. But ${math`P(X \ge n)`} is easy: the smaller is at least ${math`n`} exactly when both dice are. Could the easy numbers give the mean directly?` },
    { kind: 'narrative', text: t`They can. For two dice, ${math`P(X \ge n) = \left(\frac{${7} - n}{${6}}\right)^{${2}}`}, for ${math`n`} from ${1} to ${6}. The claim of this lesson is that simply adding these six numbers gives ${math`E(X)`}. Before believing it, let us see why it should be true.` },
    { kind: 'section', title: t`The tail-sum formula` },
    {
      kind: 'definition',
      name: t`Tail probabilities`,
      formal: t`For a random variable ${mX} with values in ${math`\{${0}, ${1}, ${2}, \ldots\}`}, the tail probabilities are ${math`P(X \ge n)`} for ${math`n = ${1}, ${2}, \ldots`}. Its expectation is ${math`E(X) = \sum_{k = ${0}}^{\infty} k\,P(X = k)`}.`,
      plain: t`In plain words: the chance that ${mX} is at least ${math`n`}, for each ${math`n`}. They start at ${math`P(X \ge ${1})`} and can only go down as ${math`n`} grows.`,
    },
    { kind: 'theorem', name: t`Tail-sum formula`, statement: t`If ${mX} takes values in ${math`\{${0}, ${1}, ${2}, \ldots\}`}, then ${math`E(X) = \sum_{n = ${1}}^{\infty} P(X \ge n)`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Split each term`, text: t`Write ${math`k\,P(X = k)`} as ${math`k`} copies of ${math`P(X = k)`}, and put one copy in each of rows ${1} to ${math`k`}.`, plain: t`So ${math`${3}\,P(X = ${3})`} becomes ${math`P(X = ${3}) + P(X = ${3}) + P(X = ${3})`}, one in each of rows ${1}, ${2}, ${3}. The term for ${math`k = ${0}`} contributes nothing.` },
        { label: t`Read the rows`, text: t`Row ${math`n`} holds ${math`P(X = k)`} for every ${math`k \ge n`}, so it adds up to ${math`P(X \ge n)`}.` },
        { label: t`Add the rows`, text: t`The rows hold exactly the same terms as ${math`\sum_{k} k\,P(X = k)`}, so`, eq: [dmath`E(X) = \sum_{n = ${1}}^{\infty} P(X \ge n).`], why: { q: t`Is it safe to rearrange an infinite sum?`, a: t`Here yes: every term is at least ${0}, and a series of non-negative terms has the same sum (possibly infinite) in any order. Mixed STEP ${1} Statistics, question ${2}, asks you to say why.` } },
      ],
    },
    { kind: 'list', items: [
      t`${math`P(X = ${1}) + P(X = ${2}) + P(X = ${3}) + \cdots = P(X \ge ${1})`}`,
      t`${math`\phantom{P(X = ${1}) + {}} P(X = ${2}) + P(X = ${3}) + \cdots = P(X \ge ${2})`}`,
      t`${math`\phantom{P(X = ${1}) + P(X = ${2}) + {}} P(X = ${3}) + \cdots = P(X \ge ${3})`}`,
    ] },
    { kind: 'p', text: t`That triangle is the whole [[tail-sum-formula|tail-sum formula]]: read it by columns and you get the definition of ${math`E(X)`}; read it by rows and you get the sum of the tails.` },
    { kind: 'section', title: t`Using it` },
    {
      kind: 'steps',
      steps: [
        { label: t`The tails`, text: t`For the smaller of two dice, ${math`P(X \ge n) = \left(\frac{${7} - n}{${6}}\right)^{${2}}`}, which is ${computedTex(minTails.map((x) => `\\frac{${(x.num * 36n) / x.den}}{${36}}`).join(', '))} for ${math`n = ${1}, \ldots, ${6}`}.`, plain: t`Both dice must show at least ${math`n`}; each does so with probability ${math`\frac{${7} - n}{${6}}`}, independently.` },
        { label: t`Add them`, text: t`${math`E(X) = ${diceMean(MIN2)}`}, about ${Number(toFloat(diceMean(MIN2)).toFixed(2))}.`, plain: t`Below ${q(7, 2)}, the mean of one die, as it should be: the smaller of two is pulled down.` },
      ],
    },
    checkFrom(extremeOfDice, { m: 4, k: 2, which: 'max' }, t`${math`P(X \ge n) = ${1} - \left(\frac{n - ${1}}{${4}}\right)^{${2}}`}: ${math`${1} + \frac{${15}}{${16}} + \frac{${12}}{${16}} + \frac{${7}}{${16}} = ${q(25, 8)}`}.`),
    { kind: 'narrative', text: t`Waiting times are the other natural use. If each trial succeeds with probability ${math`p`}, independently, and ${mX} is the number of trials up to and including the first success, then ${math`X \ge n`} means the first ${math`n - ${1}`} trials failed: ${math`P(X \ge n) = (${1} - p)^{n - ${1}}`}. The tail sum is a geometric series, ${math`E(X) = \sum_{n \ge ${1}} (${1} - p)^{n - ${1}} = \frac{${1}}{p}`}.` },
    checkFrom(tailsGiven, { den: 8, nums: [7, 4, 1] }, t`Just add the tails: ${math`\frac{${7}}{${8}} + \frac{${4}}{${8}} + \frac{${1}}{${8}} = ${q(12, 8)}`}.`),
    { kind: 'pitfall', claim: t`${math`E(X) = \sum_{n \ge ${1}} P(X > n)`}.`, counterexample: t`That drops a whole row of the triangle. For ${mX} always equal to ${1}, ${math`P(X > n) = ${0}`} for every ${math`n \ge ${1}`}, so the sum is ${0}, but ${math`E(X) = ${1}`}. Use "at least ${math`n`}", starting at ${math`n = ${1}`}.` },
    { kind: 'pitfall', claim: t`A formula for ${math`P(X \ge n)`} found for large ${math`n`} also holds at ${math`n = ${1}`}.`, counterexample: t`Always check the first term separately. If ${mX} only takes values from ${1} on, then ${math`P(X \ge ${1}) = ${1}`}, whatever the general formula gives. Mixed STEP ${1} Statistics, question ${2}, sets exactly this trap.` },
    { kind: 'takeaway', text: t`For whole-number ${mX}, ${math`E(X) = \sum_{n \ge ${1}} P(X \ge n)`}: count the triangle by rows instead of columns, and use it when "at least ${math`n`}" is the easy event.` },
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
  cambridge: withUses([q2tail, q2min, q2proof], {
    'mixed-q2-proof': { sections: ['The tail-sum formula'], note: t`Proving the tail-sum formula by rearranging a sum` },
    'mixed-q2-tail': { sections: ['Using it'], note: t`A tail probability for the penguins` },
  }),
  // Best first: defining E(X) and proving the formula, then the tail. The least mean is 3, small
  // enough to guess, so it does not gate.
  gate: ['mixed-q2-proof', 'mixed-q2-tail'],
  recall: [
    { front: t`State the tail-sum formula.`, back: t`For ${mX} with values ${0}, ${1}, ${2}, and so on, ${math`E(X) = \sum_{n \ge ${1}} P(X \ge n)`}.` },
    { front: t`Why is the tail-sum formula true?`, back: t`Write ${math`k\,P(X = k)`} as ${math`k`} copies in rows ${1} to ${math`k`}; row ${math`n`} adds up to ${math`P(X \ge n)`}.` },
    { front: t`Mean number of trials to the first success, by tails?`, back: t`${math`\sum_{n \ge ${1}} (${1} - p)^{n - ${1}} = \frac{${1}}{p}`}.` },
  ],
  proofOrder: [
    {
      title: t`The tail-sum formula`,
      steps: [
        t`Write ${math`k\,P(X = k)`} as ${math`k`} copies of ${math`P(X = k)`}.`,
        t`Put one copy in each of rows ${1} to ${math`k`}.`,
        t`Row ${math`n`} adds up to ${math`P(X \ge n)`}.`,
        t`The terms are non-negative, so adding by rows gives ${math`E(X)`}.`,
      ],
    },
  ],
};
