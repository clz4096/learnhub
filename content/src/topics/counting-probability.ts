/**
 * prob.counting-probability: Probability by counting equally likely outcomes with
 * combinations and arrangements. From STEP Support Assignment 12: Q2(ii) (the hints'
 * Method 2, counting pairs of sweets) and Q3 (2011 STEP I Q12, the raffle queue), with its
 * Discussion (the general answer (m + 1 - n)/(m + 1), stated without proof), checked
 * against the hints.
 */
import type { Rng } from '@learnhub/mastery';
import { auto, cite, same, supervision } from '../cambridge';
import { factorial, int, pick, q, str, upTo } from '../math';
import { generator, type Misconception } from '../problem';
import { dmath, math, t } from '../rich';
import { worked, workedCambridge, type TopicContent } from '../topic';

const [mm, mn] = [math`m`, math`n`];

function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let v = 1;
  for (let i = 1; i <= k; i++) v = (v * (n - k + i)) / i;
  return Math.round(v);
}
const binom = (n: number | string, k: number | string) => math`\binom{${n}}{${k}}`;
/** k distinct indices from 0..n-1, uniformly. */
function sampleIdx(rng: Rng, n: number, k: number): number[] {
  const a = upTo(n).map((i) => i - 1);
  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(rng() * (n - i));
    [a[i], a[j]] = [a[j] as number, a[i] as number];
  }
  return a.slice(0, k);
}
/** Every subset of size k of 0..n-1, for brute-force counting. */
function subsets(n: number, k: number): number[][] {
  const out: number[][] = [];
  const go = (start: number, acc: number[]): void => {
    if (acc.length === k) { out.push(acc); return; }
    for (let i = start; i < n; i++) go(i + 1, [...acc, i]);
  };
  go(0, []);
  return out;
}

// ---------------------------------------------------------------- generators

interface ComP { a: number; b: number; r: number; k: number }

const committee = generator<ComP>({
  id: 'committee',
  skill: 'Find the probability of a mix in a random selection by counting: favourable choices over all choices, with binomial coefficients.',
  params: (rng) => {
    for (;;) {
      const a = int(rng, 3, 8);
      const b = int(rng, 3, 8);
      const r = int(rng, 2, 5);
      const k = int(rng, 1, r - 1);
      if (k <= b && r - k <= a && a !== b) return { a, b, r, k };
    }
  },
  sane: ({ a, b, r, k }) => (k >= 1 && k < r && k <= b && r - k <= a && a !== b ? null : 'out of range'),
  problem: ({ a, b, r, k }) => {
    const fav = choose(b, k) * choose(a, r - k);
    const all = choose(a + b, r);
    return {
      prompt: t`A committee of ${r} is chosen at random from ${a} men and ${b} women: every group of ${r} is equally likely. What is the probability that it has exactly ${k} women?`,
      answer: { kind: 'exact', expected: str(q(fav, all)) },
      solution: [
        t`All outcomes: ${math`${binom(a + b, r)} = ${all}`} equally likely committees.`,
        t`Favourable: choose the ${k} women from ${b} and the other ${r - k} from the ${a} men, ${math`${binom(b, k)} \times ${binom(a, r - k)} = ${choose(b, k)} \times ${choose(a, r - k)} = ${fav}`}.`,
        t`So the probability is ${math`\frac{${fav}}{${all}} = ${q(fav, all)}`}.`,
      ],
    };
  },
  solve: ({ a, b, r, k }) => {
    // Every committee, listed: people 0..b-1 are the women.
    const all = subsets(a + b, r);
    return str(q(all.filter((s) => s.filter((x) => x < b).length === k).length, all.length));
  },
  misconceptions: ({ a, b, r, k }): Misconception[] => [
    { response: str(q(choose(b, k), choose(a + b, r))), why: t`That counts only the ways to pick the women. Each choice of women goes with ${math`${binom(a, r - k)}`} choices of men: multiply.` },
    { response: str(q(choose(r, k) * b ** k * a ** (r - k), (a + b) ** r)), why: t`That would be right if people could be chosen again, like dice. A committee chooses without replacement: count groups with binomial coefficients.` },
    { response: str(q(k, r)), why: t`The share of women on the committee is not its probability. Count the committees with exactly ${k} women.` },
  ],
  trial: ({ a, b, r, k }, rng) => sampleIdx(rng, a + b, r).filter((x) => x < b).length === k,
});

interface MaxP { n: number; k: number; m: number }

const largest = generator<MaxP>({
  id: 'largest',
  skill: 'Count the selections whose largest number is a given value: the others come from the numbers below it.',
  params: (rng) => {
    const n = int(rng, 6, 12);
    const k = int(rng, 2, 4);
    const m = int(rng, k + 1, n);
    return { n, k, m };
  },
  sane: ({ n, k, m }) => (k >= 2 && m > k && m <= n ? null : 'out of range'),
  problem: ({ n, k, m }) => {
    const fav = choose(m - 1, k - 1);
    const all = choose(n, k);
    return {
      prompt: t`A bag holds balls numbered ${1} to ${n}. I take ${k} of them at random, all at once. What is the probability that the largest number I hold is ${m}?`,
      answer: { kind: 'exact', expected: str(q(fav, all)) },
      solution: [
        t`All outcomes: ${math`${binom(n, k)} = ${all}`} sets of ${k} balls, equally likely.`,
        t`Largest is ${m}: ball ${m} is taken, and the other ${k - 1} come from ${math`${1}, \ldots, ${m - 1}`}: ${math`${binom(m - 1, k - 1)} = ${fav}`} ways.`,
        t`Probability: ${math`\frac{${fav}}{${all}} = ${q(fav, all)}`}.`,
      ],
    };
  },
  solve: ({ n, k, m }) => {
    const all = subsets(n, k);
    return str(q(all.filter((s) => Math.max(...s) + 1 === m).length, all.length));
  },
  misconceptions: ({ n, k, m }): Misconception[] => [
    { response: str(q(1, n)), why: t`Not every number is equally likely to be the largest: large numbers are much more likely. Count the sets whose largest is ${m}.` },
    { response: str(q(choose(m, k), choose(n, k))), why: t`${math`${binom(m, k)}`} counts sets with every number at most ${m}, which includes sets whose largest is smaller. Ball ${m} must be in the set.` },
    { response: str(q(k, n)), why: t`That is the chance that ball ${m} is taken at all. It must also be the largest: the others must all be below it.` },
  ],
  trial: ({ n, k, m }, rng) => Math.max(...sampleIdx(rng, n, k)) + 1 === m,
});

interface TogP { n: number; k: number }

const together = generator<TogP>({
  id: 'together',
  skill: 'Find the probability that chosen people stand together in a random queue: glue them into one block, count, and multiply by the orders inside the block.',
  params: (rng) => {
    const n = int(rng, 5, 9);
    return { n, k: pick(rng, [2, 3]) };
  },
  sane: ({ n, k }) => (n >= 5 && n <= 9 && (k === 2 || k === 3) ? null : 'out of range'),
  problem: ({ n, k }) => {
    const fav = factorial(k) * factorial(n - k + 1);
    const all = factorial(n);
    return {
      prompt: t`${n} people, including ${k === 2 ? t`Ann and Bob` : t`Ann, Bob, and Cal`}, stand in a queue in random order: every order is equally likely. What is the probability that ${k === 2 ? t`Ann and Bob are next to each other` : t`Ann, Bob, and Cal stand together, in some order`}?`,
      answer: { kind: 'exact', expected: str(q(fav, all)) },
      solution: [
        t`All outcomes: ${math`${n}! = ${all}`} orders.`,
        t`Favourable: glue the ${k} into one block. The block and the other ${n - k} people make ${n - k + 1} units, in ${math`${n - k + 1}!`} orders, and the block's inside can be ordered ${math`${k}!`} ways: ${math`${k}! \times ${n - k + 1}! = ${fav}`}.`,
        t`Probability: ${math`\frac{${fav}}{${all}} = ${q(fav, all)}`}.`,
      ],
    };
  },
  solve: ({ n, k }) => {
    // Where the chosen k stand is a uniformly random set of k places; count the sets that are k places in a row.
    const sets = subsets(n, k);
    return str(q(sets.filter((s) => Math.max(...s) - Math.min(...s) === k - 1).length, sets.length));
  },
  misconceptions: ({ n, k }): Misconception[] => [
    { response: str(q(factorial(n - k + 1), factorial(n))), why: t`The people inside the block can stand in ${math`${k}!`} orders. Multiply by that.` },
    { response: str(q(k, n)), why: t`Count orders: the block and the others make ${n - k + 1} units, and the block can be arranged inside.` },
    { response: str(q(factorial(k) * factorial(n - k), factorial(n))), why: t`The block is one unit alongside the other ${n - k} people: that is ${n - k + 1} units to order, not ${n - k}.` },
  ],
  trial: ({ n, k }, rng) => {
    const order = sampleIdx(rng, n, n);
    const pos = upTo(k).map((i) => order.indexOf(i - 1));
    return Math.max(...pos) - Math.min(...pos) === k - 1;
  },
});

// ---------------------------------------------------------------- Cambridge problems

/** The raffle queue: in how many of the equally likely orders of m £1 people and n £2 people can every ticket be sold? */
function raffle(m: number, n: number): { good: number; all: number } {
  let good = 0;
  let all = 0;
  const go = (ones: number, twos: number, coins: number, ok: boolean): void => {
    if (ones === 0 && twos === 0) { all++; if (ok) good++; return; }
    // Count distinct queues (people with the same coin are alike, as in the question's arrangements).
    if (ones > 0) go(ones - 1, twos, coins + 1, ok);
    if (twos > 0) go(ones, twos - 1, coins - 1, ok && coins >= 1);
  };
  go(m, n, 0, true);
  return { good, all };
}
const A12 = 'step-f12';
const H12 = 'step-f12-hints';
const M_DOMAIN = (min: number) => ({ m: { kind: 'integer' as const, min, max: 30 } });
const raffleIntro = t`I am selling raffle tickets for ${1} pound each. In the queue there are ${mm} people each with a single ${1} pound coin and ${mn} people each with a single ${2} pound coin. Each person wants one ticket, and each arrangement of the queue is equally likely. I start with no coins and stop selling if I cannot give the change.`;

const q3i = auto({
  id: 'a12-q3-i',
  source: cite(A12, 'Q3(i) (2011 STEP I Q12)'),
  title: t`One person with a ${2} pound coin`,
  prompt: t`${raffleIntro} In the case ${math`n = ${1}`} and ${math`m \ge ${1}`}, find the probability that I am able to sell one ticket to each person in the queue.`,
  answer: { kind: 'expression', expected: 'm/(m + 1)', variables: ['m'], domains: M_DOMAIN(1) },
  solution: [
    t`The only problem is a ${2} pound coin when I have no ${1} pound coins, which happens only if that person is first. As long as a ${1} pound person comes first, I can give change whenever the ${2} pound person arrives.`,
    t`The first person is any of the ${math`m + ${1}`} equally likely, and ${mm} of them have a ${1} pound coin: the probability is ${math`\frac{m}{m + ${1}}`}.`,
  ],
  reference: 'm/(m + 1)',
  verify: () => {
    for (let m = 1; m <= 12; m++) {
      const r = raffle(m, 1);
      const e = same(`m = ${m}, by listing queues`, str(q(r.good, r.all)), str(q(m, m + 1)));
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [{ response: '1/(m + 1)', why: t`That is the chance that the ${2} pound person is first, which is when it fails. Subtract it from ${1}.` }],
  official: { source: cite(H12, 'Q3(i)'), answer: 'm/(m + 1)', agrees: true },
});

const q3ii = auto({
  id: 'a12-q3-ii',
  source: cite(A12, 'Q3(ii) (2011 STEP I Q12)', true),
  title: t`Two people with ${2} pound coins`,
  prompt: t`${raffleIntro} In the case ${math`n = ${2}`} and ${math`m \ge ${2}`}, find the probability that I can sell one ticket to each person, by considering the first three people in the queue. Give it in terms of ${mm}.`,
  answer: { kind: 'expression', expected: '(m - 1)/(m + 1)', variables: ['m'], domains: M_DOMAIN(2) },
  solution: [
    t`The queues that work start ${math`${1}, ${1}`} (then I always have two ${1} pound coins for change) or ${math`${1}, ${2}, ${1}`}.`,
    t`${math`P(${1}, ${1}) = \frac{m}{m + ${2}} \times \frac{m - ${1}}{m + ${1}}`} and ${math`P(${1}, ${2}, ${1}) = \frac{m}{m + ${2}} \times \frac{${2}}{m + ${1}} \times \frac{m - ${1}}{m}`}.`,
    t`Adding: ${math`\frac{m(m - ${1}) + ${2}(m - ${1})}{(m + ${2})(m + ${1})} = \frac{(m - ${1})(m + ${2})}{(m + ${2})(m + ${1})} = \frac{m - ${1}}{m + ${1}}`}.`,
  ],
  reference: '(m - 1)/(m + 1)',
  verify: () => {
    for (let m = 2; m <= 12; m++) {
      const r = raffle(m, 2);
      const e = same(`m = ${m}, by listing queues`, str(q(r.good, r.all)), str(q(m - 1, m + 1)));
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [{ response: '(m/(m + 2))((m - 1)/(m + 1))', why: t`That is only the queues starting with two ${1} pound people. A queue starting ${1}, ${2}, ${1} also works.` }],
  official: { source: cite(H12, 'Q3(ii)'), answer: '(m - 1)/(m + 1)', agrees: true },
});

const q3iii = auto({
  id: 'a12-q3-iii',
  source: cite(A12, 'Q3(iii) (2011 STEP I Q12)', true),
  title: t`Three people with ${2} pound coins`,
  prompt: t`${raffleIntro} In the case ${math`n = ${3}`} and ${math`m \ge ${3}`}, find the probability that I can sell one ticket to each person. Give it in terms of ${mm}.`,
  answer: { kind: 'expression', expected: '(m - 2)/(m + 1)', variables: ['m'], domains: M_DOMAIN(3) },
  solution: [
    t`List the starts that work, in a logical order, as the hints do: ${math`${1}, ${1}, ${1}`}; ${math`${1}, ${1}, ${2}, ${1}`}; ${math`${1}, ${1}, ${2}, ${2}, ${1}`}; ${math`${1}, ${2}, ${1}, ${1}`}; ${math`${1}, ${2}, ${1}, ${2}, ${1}`}. After each, I have enough ${1} pound coins for the rest.`,
    t`Multiplying along each and adding (cancel before adding) gives ${math`\frac{m - ${2}}{m + ${1}}`}, the pattern the Discussion conjectures in general: ${math`\frac{m + ${1} - n}{m + ${1}}`}.`,
  ],
  reference: '(m - 2)/(m + 1)',
  verify: () => {
    for (let m = 3; m <= 12; m++) {
      const r = raffle(m, 3);
      const e = same(`m = ${m}, by listing queues`, str(q(r.good, r.all)), str(q(m - 2, m + 1)));
      if (e !== null) return e;
    }
    // The Discussion's general formula, for every n <= m <= 9.
    for (let m = 1; m <= 9; m++) for (let n = 1; n <= m; n++) {
      const r = raffle(m, n);
      if (str(q(r.good, r.all)) !== str(q(m + 1 - n, m + 1))) return `general formula at m = ${m}, n = ${n}`;
    }
    return null;
  },
  misconceptions: [{ response: '(m - 3)/(m + 1)', why: t`Check ${math`m = ${3}`} by listing: the queues that start ${1}, ${2}, ${1}, ${2}, ${1} and the like also work.` }],
  official: { source: cite(H12, 'Q3(iii)'), answer: '(m - 2)/(m + 1)', agrees: true },
});

const MINTS = 9;
const LEMONS = 6;
const twoMints = auto({
  id: 'a12-q2-ii-mints',
  source: cite(A12, 'Q2(ii)', true),
  title: t`Two mints, by counting pairs`,
  prompt: t`A bag of sweets contains ${MINTS} mint imperials and ${LEMONS} lemon sherbets. I take two sweets at once without looking. By counting pairs, find the probability that both are mints.`,
  answer: { kind: 'exact', expected: str(q(choose(MINTS, 2), choose(MINTS + LEMONS, 2))) },
  solution: [
    t`All outcomes: ${math`${binom(MINTS + LEMONS, 2)} = ${choose(MINTS + LEMONS, 2)}`} equally likely pairs. Favourable: ${math`${binom(MINTS, 2)} = ${choose(MINTS, 2)}`} pairs of mints.`,
    t`Probability ${math`\frac{${choose(MINTS, 2)}}{${choose(MINTS + LEMONS, 2)}} = ${q(choose(MINTS, 2), choose(MINTS + LEMONS, 2))}`}: the hints' Method ${2}. One after the other gives the same, ${math`\frac{${MINTS}}{${MINTS + LEMONS}} \times \frac{${MINTS - 1}}{${MINTS + LEMONS - 1}}`}.`,
  ],
  reference: str(q(choose(MINTS, 2), choose(MINTS + LEMONS, 2))),
  verify: () => same('pairs against one after the other', str(q(choose(MINTS, 2), choose(MINTS + LEMONS, 2))), str(q(MINTS * (MINTS - 1), (MINTS + LEMONS) * (MINTS + LEMONS - 1)))),
  misconceptions: [{ response: str(q(MINTS * MINTS, (MINTS + LEMONS) ** 2)), why: t`That puts the first sweet back. Both are taken: count pairs of different sweets.` }],
});

const q3iiShow = supervision({
  id: 'a12-q3-ii-show',
  source: cite(A12, 'Q3(ii)'),
  title: t`Justify the case ${math`n = ${2}`}`,
  prompt: t`${raffleIntro} By considering the first three people in the queue, show that the probability that I can sell one ticket to each person in the case ${math`n = ${2}`} and ${math`m \ge ${2}`} is ${math`\frac{m - ${1}}{m + ${1}}`}. The answer is given, so justify every case, set out in a logical order.`,
  writeUp: 'proof',
  official: cite(H12, 'Q3(ii)'),
});
const q3general = supervision({
  id: 'a12-q3-discussion',
  source: cite(A12, 'Q3, Discussion'),
  title: t`The general conjecture`,
  prompt: t`From the cases ${math`n = ${1}, ${2}, ${3}`}, the Discussion conjectures that the probability of selling to everyone, when ${math`m \ge n`}, is ${math`\frac{m + ${1} - n}{m + ${1}}`}. Test it on a case you can list completely, such as ${math`m = n = ${2}`}, by writing out every equally likely queue. Then explain why the case ${math`m < n`} gives ${0}.`,
  writeUp: 'explanation',
});

// ---------------------------------------------------------------- lesson

const EX: ComP = { a: 5, b: 4, r: 3, k: 2 };

export const countingProbability: TopicContent = {
  topicId: 'prob.counting-probability',
  goal: t`Find probabilities of equally likely outcomes by counting the favourable outcomes and all outcomes with combinations and arrangements.`,
  lesson: [
    { kind: 'p', text: t`When every outcome is equally likely, a probability is a count over a count. The hard part is the counting, and the tools are the ones for counting selections and arrangements.` },
    { kind: 'rule', text: t`${dmath`P(A) = \frac{\text{number of outcomes in } A}{\text{number of outcomes}}`} The outcomes in ${math`A`} are the [[favourable-outcome|favourable outcomes]]. Count both on the same terms: if the outcomes are unordered selections, count favourable unordered selections too.` },
    { kind: 'p', text: t`Choose a committee of ${EX.r} from ${EX.a} men and ${EX.b} women at random. All outcomes: ${math`${binom(EX.a + EX.b, EX.r)} = ${choose(EX.a + EX.b, EX.r)}`}. Exactly ${EX.k} women: pick them, ${math`${binom(EX.b, EX.k)} = ${choose(EX.b, EX.k)}`} ways, and the other ${EX.r - EX.k} from the men, ${math`${binom(EX.a, EX.r - EX.k)} = ${choose(EX.a, EX.r - EX.k)}`}: ${math`\frac{${choose(EX.b, EX.k) * choose(EX.a, EX.r - EX.k)}}{${choose(EX.a + EX.b, EX.r)}} = ${q(choose(EX.b, EX.k) * choose(EX.a, EX.r - EX.k), choose(EX.a + EX.b, EX.r))}`}. This is sampling [[without-replacement|without replacement]], so the answer is not the dice-style ${math`\binom{${EX.r}}{${EX.k}} p^{${EX.k}} (${1} - p)^{${EX.r - EX.k}}`}.` },
    { kind: 'p', text: t`The STEP hints to Assignment ${12} work the sweets question both ways: one sweet after the other along a tree, or both at once by counting pairs, ${math`\frac{${binom(9, 2)} + ${binom(6, 2)}}{${binom(15, 2)}}`}. They agree, because each unordered pair corresponds to exactly two ordered ones.` },
    { kind: 'p', text: t`Arrangements work the same way. In the raffle question (STEP I, ${2011}, question ${12}), each order of the queue is equally likely. With one ${2} pound coin, selling fails only when that person is first, so the probability of success is ${math`\frac{m}{m + ${1}}`}. With more ${2} pound coins, list the starts of the queue that work, in a logical order so none is missed, and add.` },
    { kind: 'p', text: t`A count that seems too hard often becomes easy by counting the complement, or by fixing what the event forces: for "the largest number drawn is ${math`m`}", ball ${math`m`} is in, and the rest come from below it.` },
  ],
  examples: [
    workedCambridge(q3i),
    worked(committee, EX, t`A committee`),
    worked(largest, { n: 10, k: 3, m: 7 }, t`The largest number drawn`),
  ],
  generators: [committee, largest, together],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['favourable-outcome'],
  cambridge: [q3ii, q3iii, twoMints, q3iiShow, q3general],
};
