/**
 * prob.discrete-distributions: a discrete random variable described by a table of values and
 * probabilities that sum to one. From the STEP specification's statistical distributions; the
 * problems are STEP Support Assignment 19, Q4(ii) (three dice: the number of sixes, and a bet
 * on it, checked against the hints) and IA Probability Example Sheet 1, Q11 (Mary's and
 * John's coins), each checked by listing every outcome. Batch 7 adds Grinstead and Snell, Section
 * 4.1, Exercise 36 (the smaller of two dice) and Section 5.1, Exercise 6 (the smallest of n), the
 * second worded with dice, since independence comes later.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { add, int, q, str, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { computedTex, math, t } from '../rich';
import { checkFrom, worked, workedCambridge, type ProbabilityClaim, type TopicContent } from '../topic';

const [mX, mx] = [math`X`, math`x`];
const choose = (n: number, k: number): number => {
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return r;
};
const coin = (rng: () => number): number => (rng() < 0.5 ? 1 : 0);
const die = (rng: () => number): number => 1 + Math.floor(rng() * 6);

// ---------------------------------------------------------------- generators

interface KP { n: number; sq: boolean }

const kGen = generator<KP>({
  id: 'find-k',
  skill: 'Find the constant in a distribution P(X = x) = kx or kx^2 from the probabilities summing to one.',
  quick: true,
  params: (rng) => ({ n: int(rng, 3, 6), sq: rng() < 0.5 }),
  sane: ({ n }) => (n >= 3 && n <= 6 ? null : 'out of range'),
  problem: ({ n, sq }) => {
    const total = Array.from({ length: n }, (_, i) => (sq ? (i + 1) ** 2 : i + 1)).reduce((x, y) => x + y, 0);
    return {
      prompt: t`A random variable ${mX} takes the values ${math`${1}, ${2}, \ldots, ${n}`}, with ${sq ? math`P(X = x) = kx^{${2}}` : math`P(X = x) = kx`}. Find ${math`k`}.`,
      answer: { kind: 'exact', expected: str(q(1, total)) },
      solution: [
        t`The values are exhaustive and mutually exclusive, so the probabilities sum to ${1}: ${math`k(${computedTex(Array.from({ length: n }, (_, i) => (sq ? (i + 1) ** 2 : i + 1)).join(' + '))}) = ${1}`}.`,
        t`That is ${math`${total}k = ${1}`}, so ${math`k = ${q(1, total)}`}.`,
      ],
    };
  },
  solve: ({ n, sq }) => {
    let s = q(0);
    for (let x = 1; x <= n; x++) s = add(s, q(sq ? x * x : x));
    return str(q(s.den, s.num));
  },
  misconceptions: ({ n, sq }): Misconception[] => {
    const total = Array.from({ length: n }, (_, i) => (sq ? (i + 1) ** 2 : i + 1)).reduce((x, y) => x + y, 0);
    return [
      { response: str(q(1, n)), why: t`The values are not equally likely: their probabilities are proportional to ${sq ? math`x^{${2}}` : mx}, which add to ${math`${total}k`}.` },
      { response: String(total), why: t`${math`${total}k = ${1}`} gives ${math`k = \frac{${1}}{${total}}`}, not ${total}.` },
    ];
  },
});

interface TabP { w: number[]; c: number; strict: boolean }

const tabGen = generator<TabP>({
  id: 'at-least',
  skill: 'Read P(X >= c) or P(X > c) from a distribution table by adding the right entries.',
  params: (rng) => {
    const k = int(rng, 4, 5);
    return { w: Array.from({ length: k }, () => int(rng, 1, 5)), c: int(rng, 2, k - 1), strict: rng() < 0.5 };
  },
  sane: ({ w, c }) => (c >= 2 && c < w.length ? null : 'out of range'),
  problem: ({ w, c, strict }) => {
    const tot = w.reduce((x, y) => x + y, 0);
    const P = w.map((x) => q(x, tot));
    const keep = w.map((_, i) => (strict ? i + 1 > c : i + 1 >= c));
    const ans = P.filter((_, i) => keep[i]).reduce((x, y) => add(x, y), q(0));
    return {
      prompt: t`${mX} takes the values ${math`${1}, \ldots, ${w.length}`} with probabilities ${P.map((p, i) => t`${math`P(X = ${i + 1}) = ${p}`}`).flatMap((r, i) => (i === 0 ? [...r] : [...t`, `, ...r]))}. Find ${strict ? math`P(X > ${c})` : math`P(X \ge ${c})`}.`,
      answer: { kind: 'exact', expected: str(ans) },
      solution: [
        t`${strict ? math`X > ${c}` : math`X \ge ${c}`} means ${mX} is one of ${keep.map((k, i) => (k ? i + 1 : null)).filter((x): x is number => x !== null).map((x) => t`${x}`).flatMap((r, i) => (i === 0 ? [...r] : [...t`, `, ...r]))}. These values are mutually exclusive, so add their probabilities: ${math`${ans}`}.`,
      ],
    };
  },
  solve: ({ w, c, strict }) => {
    const tot = w.reduce((x, y) => x + y, 0);
    const good = w.reduce((s, x, i) => s + ((strict ? i + 1 > c : i + 1 >= c) ? x : 0), 0);
    return str(q(good, tot));
  },
  misconceptions: ({ w, c, strict }): Misconception[] => {
    const tot = w.reduce((x, y) => x + y, 0);
    const sumIf = (f: (v: number) => boolean) => str(q(w.reduce((s, x, i) => s + (f(i + 1) ? x : 0), 0), tot));
    return [
      { response: sumIf((v) => (strict ? v >= c : v > c)), why: strict ? t`${math`X > ${c}`} excludes ${c} itself.` : t`${math`X \ge ${c}`} includes ${c} itself.` },
      { response: sumIf((v) => (strict ? v <= c : v < c)), why: t`That is the complement: the values ${strict ? t`up to ${c}` : t`below ${c}`}.` },
      { response: sumIf((v) => v === c), why: t`That is ${math`P(X = ${c})`} alone. Add every value in the range.` },
    ];
  },
});

interface HeadsP { n: number; k: number }

const headsGen = generator<HeadsP>({
  id: 'heads',
  skill: 'Find P(X = k) for the number of heads X in n fair tosses: C(n, k)/2^n.',
  params: (rng) => {
    const n = int(rng, 3, 6);
    return { n, k: int(rng, 1, n - 1) };
  },
  sane: ({ n, k }) => (k >= 1 && k < n ? null : 'out of range'),
  problem: ({ n, k }) => ({
    prompt: t`A fair coin is tossed ${n} times and ${mX} is the number of heads. Find ${math`P(X = ${k})`}.`,
    answer: { kind: 'exact', expected: str(q(choose(n, k), 2 ** n)) },
    solution: [
      t`The ${math`${2}^{${n}} = ${2 ** n}`} sequences of heads and tails are equally likely. Those with exactly ${k} heads: choose the ${k} positions of the heads, ${math`\binom{${n}}{${k}} = ${choose(n, k)}`} ways.`,
      t`So ${math`P(X = ${k}) = \frac{${choose(n, k)}}{${2 ** n}} = ${q(choose(n, k), 2 ** n)}`}.`,
    ],
  }),
  solve: ({ n, k }) => {
    let c = 0;
    for (let m = 0; m < 2 ** n; m++) if (m.toString(2).split('').filter((d) => d === '1').length === k) c++;
    return str(q(c, 2 ** n));
  },
  misconceptions: ({ n, k }): Misconception[] => [
    { response: str(q(1, n + 1)), why: t`The ${n + 1} values ${math`${0}, \ldots, ${n}`} are not equally likely: there are more ways to get a middling number of heads.` },
    { response: str(q(1, 2 ** n)), why: t`That is one particular sequence. There are ${choose(n, k)} sequences with ${k} heads.` },
  ],
  trial: ({ n, k }, rng) => Array.from({ length: n }, () => coin(rng)).reduce((x, y) => x + y, 0) === k,
});

interface MaxP { m: number; min?: boolean }

const maxGen = generator<MaxP>({
  id: 'maximum',
  skill: 'Build the distribution of the larger of two dice: P(X = m) = (2m - 1)/36.',
  params: (rng) => (rng() < 0.5 ? { m: int(rng, 2, 6) } : { m: int(rng, 1, 5), min: true }),
  sane: ({ m }) => (m >= 1 && m <= 6 ? null : 'out of range'),
  problem: ({ m, min }) => (min === true ? minProblem(m) : {
    prompt: t`Two fair dice are rolled and ${mX} is the larger of the two scores (either, if they are equal). Find ${math`P(X = ${m})`}.`,
    answer: { kind: 'exact', expected: str(q(2 * m - 1, 36)) },
    solution: [
      t`${math`X \le ${m}`} when both dice show at most ${m}: ${math`${m} \times ${m} = ${m * m}`} of the ${36} pairs. ${math`X \le ${m - 1}`}: ${math`${(m - 1) ** 2}`} pairs.`,
      t`So ${math`P(X = ${m}) = \frac{${m * m} - ${(m - 1) ** 2}}{${36}} = ${q(2 * m - 1, 36)}`}.`,
    ],
  }),
  solve: ({ m, min }) => {
    let c = 0;
    for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if ((min === true ? Math.min(a, b) : Math.max(a, b)) === m) c++;
    return str(q(c, 36));
  },
  misconceptions: ({ m, min }): Misconception[] => min === true ? [
    { response: str(q(1, 6)), why: t`The smaller score is not uniform: low values are more likely, as either die can supply them.` },
    { response: str(q(14 - 2 * m, 36)), why: t`The pair ${math`(${m}, ${m})`} was counted twice. There are ${13 - 2 * m} pairs with minimum ${m}.` },
  ] : [
    { response: str(q(1, 6)), why: t`The larger score is not uniform: high values are more likely, as either die can supply them.` },
    { response: str(q(2 * m, 36)), why: t`The pair ${math`(${m}, ${m})`} was counted twice. There are ${2 * m - 1} pairs with maximum ${m}.` },
  ],
});

function minProblem(m: number) {
  const ge = (7 - m) ** 2;
  const gt = (6 - m) ** 2;
  return {
    prompt: t`Two fair dice are rolled and ${mX} is the smaller of the two scores (either, if they are equal). Find ${math`P(X = ${m})`}.`,
    answer: { kind: 'exact' as const, expected: str(q(ge - gt, 36)) },
    solution: [
      t`${math`X \ge ${m}`} when both dice show at least ${m}: ${math`${7 - m} \times ${7 - m} = ${ge}`} of the ${36} pairs. ${math`X \ge ${m + 1}`}: ${gt} pairs.`,
      t`So ${math`P(X = ${m}) = \frac{${ge} - ${gt}}{${36}} = ${q(ge - gt, 36)}`}.`,
    ],
  };
}

// ---------------------------------------------------------------- Cambridge problems

const F19 = 'step-f19';
/** P(k sixes in three dice), by listing all 216 rolls. */
const sixes = (k: number): Rational => {
  let c = 0;
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) for (let d = 1; d <= 6; d++) if ([a, b, d].filter((x) => x === 6).length === k) c++;
  return q(c, 216);
};

const a19one = auto({
  id: 'a19-q4-ii-one',
  source: cite(F19, 'Assignment 19, Q4(ii)'),
  title: t`Exactly one six`,
  prompt: t`I am about to throw three fair dice. What is the probability of exactly one six?`,
  answer: { kind: 'exact', expected: str(sixes(1)) },
  solution: [
    t`Let ${mX} be the number of sixes. The ${216} ordered rolls are equally likely.`,
    t`Exactly one six: choose which die shows it (${3} ways), and the other two show any of ${5} non-sixes: ${math`${3} \times ${5} \times ${5} = ${75}`} rolls. These three cases are mutually exclusive.`,
    t`So ${math`P(X = ${1}) = \frac{${75}}{${216}} = ${sixes(1)}`}. The whole distribution: ${math`P(X = ${0}) = \frac{${125}}{${216}}`}, ${math`P(X = ${1}) = \frac{${75}}{${216}}`}, ${math`P(X = ${2}) = \frac{${15}}{${216}}`}, ${math`P(X = ${3}) = \frac{${1}}{${216}}`}, which sum to ${1}.`,
  ],
  reference: '25/72',
  verify: () => same('P(one six)', str(sixes(1)), '25/72'),
  misconceptions: [
    { response: str(q(25, 216)), why: t`That is one particular die being the six. Any of the ${3} dice can be the one: multiply by ${3}.` },
    { response: '1/2', why: t`Adding ${math`\frac{${1}}{${6}}`} for each die counts rolls with two or three sixes too. Exactly one six needs the other two dice to miss.` },
  ],
  official: { source: cite('step-f19-hints', 'Assignment 19, Q4(ii)'), answer: '25/72', agrees: true },
});

const a19three = auto({
  id: 'a19-q4-ii-three',
  source: cite(F19, 'Assignment 19, Q4(ii)'),
  title: t`Three sixes`,
  prompt: t`I am about to throw three fair dice. What is the probability of three sixes?`,
  answer: { kind: 'exact', expected: str(sixes(3)) },
  solution: [t`One roll in ${216} is three sixes: ${math`\left(\frac{${1}}{${6}}\right)^{${3}} = \frac{${1}}{${216}}`}.`],
  reference: '1/216',
  verify: () => same('P(three sixes)', str(sixes(3)), '1/216'),
  misconceptions: [{ response: '1/18', why: t`That adds ${math`\frac{${1}}{${6}}`} three times over. All three must be sixes: multiply.` }],
  official: { source: cite('step-f19-hints', 'Assignment 19, Q4(ii)'), answer: '1/216', agrees: true },
});

const a19bet = supervision({
  id: 'a19-q4-ii-bet',
  source: cite(F19, 'Assignment 19, Q4(ii)'),
  title: t`Should I accept the bet?`,
  prompt: t`I throw three fair dice. My friend offers to give me ${math`\pounds ${1}`} if I throw no sixes, provided I give her ${math`\pounds ${1}`} if I throw one six, ${math`\pounds ${2}`} if I throw two sixes and ${math`\pounds ${3}`} if I throw three sixes. Write down the distribution of the number of sixes, and decide whether I should accept, explaining your reasoning (for instance by considering ${216} games).`,
  writeUp: 'explanation',
  official: cite('step-f19-hints', 'Assignment 19, Q4(ii)'),
});

/** P(Mary's heads > John's), Mary with m coins and John with j, by listing. */
function maryWins(m: number, j: number): Rational {
  let win = 0;
  for (let a = 0; a < 2 ** m; a++) for (let b = 0; b < 2 ** j; b++) {
    const h = (x: number) => x.toString(2).split('').filter((d) => d === '1').length;
    if (h(a) > h(b)) win++;
  }
  return q(win, 2 ** (m + j));
}

const ia11 = auto({
  id: 'ia1-q11',
  source: cite('ia-prob-sheet-1', 'Q11'),
  title: t`Mary's coins against John's`,
  prompt: t`Mary tosses three fair coins and John tosses two. What is the probability that Mary gets more heads than John?`,
  answer: { kind: 'exact', expected: str(maryWins(3, 2)) },
  solution: [
    t`Let ${math`M`} and ${math`J`} be the numbers of heads. Their distributions: ${math`M`} takes ${math`${0}, ${1}, ${2}, ${3}`} with probabilities ${math`\frac{${1}}{${8}}, \frac{${3}}{${8}}, \frac{${3}}{${8}}, \frac{${1}}{${8}}`}; ${math`J`} takes ${math`${0}, ${1}, ${2}`} with ${math`\frac{${1}}{${4}}, \frac{${1}}{${2}}, \frac{${1}}{${4}}`}.`,
    t`Split by ${math`J`}, using independence: ${math`J = ${0}`}: ${math`\frac{${1}}{${4}} \cdot P(M \ge ${1}) = \frac{${1}}{${4}} \cdot \frac{${7}}{${8}}`}; ${math`J = ${1}`}: ${math`\frac{${1}}{${2}} \cdot \frac{${4}}{${8}}`}; ${math`J = ${2}`}: ${math`\frac{${1}}{${4}} \cdot \frac{${1}}{${8}}`}.`,
    t`Total ${math`\frac{${7} + ${8} + ${1}}{${32}} = \frac{${16}}{${32}} = \frac{${1}}{${2}}`}. (With two coins against one it is also ${math`\frac{${1}}{${2}}`}.)`,
  ],
  reference: '1/2',
  verify: () => same('Mary 3 v John 2, and 2 v 1', `${str(maryWins(3, 2))} ${str(maryWins(2, 1))}`, '1/2 1/2'),
  misconceptions: [
    { response: str(q(3, 5)), why: t`Mary has ${3} of the ${5} coins, but that is not the event. List the distributions of the two counts and combine them.` },
    { response: str(q(13, 16)), why: t`That counts ties as wins for Mary. "More heads" is strict.` },
  ],
});

const ia11sup = supervision({
  id: 'ia1-q11-conjecture',
  source: cite('ia-prob-sheet-1', 'Q11'),
  title: t`A conjecture about coins`,
  prompt: t`Mary tosses ${math`n + ${1}`} fair coins and John tosses ${math`n`}. Compute the probability that Mary gets more heads than John for ${math`n = ${1}`} and ${math`n = ${2}`}, make a conjecture for general ${math`n`}, and prove it. (Hint: compare Mary's first ${math`n`} coins with John's, then look at her last coin.)`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- Cambridge problems: gates (batch 7)

/** The distribution of the smallest of n dice with faces 1 .. k, by listing all k^n outcomes. */
function minDist(n: number, k: number): number[] {
  const counts = Array.from({ length: k + 1 }, () => 0);
  for (let a = 0; a < k ** n; a++) {
    let m = k;
    for (let x = a, i = 0; i < n; i++, x = Math.floor(x / k)) m = Math.min(m, (x % k) + 1);
    counts[m] = (counts[m] as number) + 1;
  }
  return counts;
}

const MIN2 = minDist(2, 6);
const gs4136 = auto({
  id: 'gs-4-1-36',
  source: cite('gs-ch4', 'Section 4.1, Exercise 36 (page 156)'),
  title: t`The smaller of two dice`,
  prompt: t`A die is thrown twice. Let ${math`X_{${1}}`} and ${math`X_{${2}}`} denote the outcomes. Define ${math`X = \min(X_{${1}}, X_{${2}})`}. Find the distribution of ${math`X`}.`,
  answer: {
    kind: 'table', columns: [[math`x`], [math`P(X = x)`]], cell: 'exact',
    rows: [1, 2, 3, 4, 5, 6].map((x) => [t`${x}`, null]),
    expected: [1, 2, 3, 4, 5, 6].map((x) => str(q(MIN2[x] as number, 36))),
  },
  solution: [
    t`The ${36} ordered pairs are equally likely. ${math`X = x`} when both dice show at least ${math`x`} and at least one shows exactly ${math`x`}.`,
    t`Both dice at least ${math`x`}: ${math`(${7} - x)^{${2}}`} pairs; both at least ${math`x + ${1}`}: ${math`(${6} - x)^{${2}}`}. The difference is ${math`${13} - ${2}x`} pairs.`,
    t`So ${math`P(X = x) = \frac{${13} - ${2}x}{${36}}`}: ${math`\frac{${11}}{${36}}, \frac{${9}}{${36}}, \frac{${7}}{${36}}, \frac{${5}}{${36}}, \frac{${3}}{${36}}, \frac{${1}}{${36}}`}, which add to ${1}.`,
  ],
  reference: [1, 2, 3, 4, 5, 6].map((x) => str(q(13 - 2 * x, 36))),
  verify: () => same('the smaller of two dice, listed', MIN2.slice(1).join(' '), [1, 2, 3, 4, 5, 6].map((x) => 13 - 2 * x).join(' ')),
  misconceptions: [{ response: [1, 2, 3, 4, 5, 6].map((x) => str(q(2 * x - 1, 36))), why: t`Those are the probabilities for the larger of the two dice, which is largest at ${6}. The smaller is most likely to be ${1}: reverse the order.` }],
});

const KN = { k: { kind: 'integer' as const, min: 1, max: 8 }, n: { kind: 'integer' as const, min: 1, max: 4 }, j: { kind: 'integer' as const, min: 1, max: 8 } };
const gs516 = auto({
  id: 'gs-5-1-6',
  source: cite('gs-ch5', 'Section 5.1, Exercise 6 (page 197)', true),
  title: t`The smallest of several dice`,
  prompt: t`${math`n`} dice, each with faces numbered ${1} to ${math`k`}, are rolled, and all ${math`k^{n}`} outcomes are equally likely. Let ${math`Y`} be the smallest number showing. Find ${math`P(Y = j)`} for ${math`j = ${1}, \ldots, k`}, as a formula in ${math`j`}, ${math`k`}, and ${math`n`}. (Type powers with a caret, as on a calculator.)`,
  answer: { kind: 'expression', expected: '((k - j + 1)^n - (k - j)^n) / k^n', variables: ['j', 'k', 'n'], domains: KN },
  solution: [
    t`First the tail: ${math`Y \ge j`} means every die shows one of the ${math`k - j + ${1}`} numbers ${math`j, \ldots, k`}. That happens in ${math`(k - j + ${1})^{n}`} of the ${math`k^{n}`} outcomes.`,
    t`Then ${math`P(Y = j) = P(Y \ge j) - P(Y \ge j + ${1}) = \frac{(k - j + ${1})^{n} - (k - j)^{n}}{k^{n}}`}.`,
    t`Check with two six-sided dice: ${math`j = ${1}`} gives ${math`\frac{${36} - ${25}}{${36}} = \frac{${11}}{${36}}`}, as in the previous problem.`,
  ],
  reference: '((k - j + 1)^n - (k - j)^n) / k^n',
  verify: () => {
    for (let n = 1; n <= 3; n++) for (let k = 1; k <= 6; k++) {
      const d = minDist(n, k);
      for (let j = 1; j <= k; j++) {
        const e = same(`n = ${n}, k = ${k}, j = ${j}`, d[j], (k - j + 1) ** n - (k - j) ** n);
        if (e !== null) return e;
      }
    }
    return null;
  },
  misconceptions: [
    { response: '((k - j + 1) / k)^n', why: t`That is ${math`P(Y \ge j)`}: every die at least ${math`j`}. Subtract ${math`P(Y \ge j + ${1})`} to get exactly ${math`j`}.` },
    { response: '1 / k', why: t`One die is uniform, but the smallest of several is not: it is pulled towards ${1}. Count the outcomes with every die at least ${math`j`}.` },
  ],
});

// ---------------------------------------------------------------- lesson

const TWO_DICE = Array.from({ length: 11 }, (_, i) => i + 2).map((s) => q(6 - Math.abs(s - 7), 36));

const claims: ProbabilityClaim[] = [
  { what: 'exactly one six in three dice', exact: sixes(1), trial: (rng) => [die(rng), die(rng), die(rng)].filter((x) => x === 6).length === 1 },
  { what: 'two heads in three tosses', exact: q(3, 8), trial: (rng) => coin(rng) + coin(rng) + coin(rng) === 2 },
];

export const discreteDistributions: TopicContent = {
  topicId: 'prob.discrete-distributions',
  goal: t`Describe a discrete random variable by a table of values and probabilities that sum to one.`,
  objective: t`Write down the distribution of a discrete random variable, and use it to find probabilities.`,
  why: t`Every later idea, expectation, variance, the binomial, is built on a distribution table.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`A number that depends on chance` },
    { kind: 'hook', text: t`Throw three dice and count the sixes. The answer is ${0}, ${1}, ${2} or ${3}, but these are far from equally likely: no sixes happens more than half the time, three sixes once in ${216} throws. A bet on the count is only fair if you know exactly how likely each value is.` },
    {
      kind: 'definition',
      name: t`Discrete random variable, distribution`,
      formal: t`A discrete random variable ${mX} is a number determined by the outcome of an experiment, taking values ${math`x_{${1}}, x_{${2}}, \ldots`} from a finite or countable list. Its [[distribution-table|probability distribution]] is the list of probabilities ${math`p_{i} = P(X = x_{i})`}, where ${math`p_{i} \ge ${0}`} and ${math`\sum_{i} p_{i} = ${1}`}.`,
      plain: t`A table of every value ${mX} can take, and how likely each is. The events "${math`X = x_{i}`}" are mutually exclusive and exhaustive, so the probabilities add to ${1}. For the number of heads in three tosses: ${math`P(X = ${0}) = \frac{${1}}{${8}}`}, ${math`P(X = ${1}) = \frac{${3}}{${8}}`}, ${math`P(X = ${2}) = \frac{${3}}{${8}}`}, ${math`P(X = ${3}) = \frac{${1}}{${8}}`}.`,
    },
    { kind: 'table', caption: t`The total ${math`S`} of two fair dice.`, head: [t`${math`s`}`, t`${math`P(S = s)`}`], rows: TWO_DICE.map((p, i) => [t`${i + 2}`, t`${math`${p}`}`]) },
    { kind: 'theorem', name: t`Probabilities from the table`, statement: t`For any set ${math`A`} of values, ${math`P(X \in A) = \sum_{x_{i} \in A} P(X = x_{i})`}.` },
    { kind: 'p', text: t`Proof: the events ${math`X = x_{i}`} for ${math`x_{i} \in A`} are mutually exclusive, and ${math`X \in A`} happens exactly when one of them does, so their probabilities add. For the dice: ${math`P(S \ge ${10}) = \frac{${3} + ${2} + ${1}}{${36}} = \frac{${1}}{${6}}`}.` },
    { kind: 'section', title: t`Building a distribution` },
    { kind: 'narrative', text: t`To find a distribution, list the equally likely outcomes, sort them by the value of ${mX}, and count. For three dice and ${mX} the number of sixes: ${math`X = ${0}`} needs every die to miss, ${math`${5}^{${3}} = ${125}`} rolls; ${math`X = ${1}`} needs one die to hit, ${3} choices of which, and two to miss, ${math`${3} \times ${25} = ${75}`}; then ${15} and ${1}. Check: ${math`${125} + ${75} + ${15} + ${1} = ${216}`}, so the probabilities sum to ${1}.` },
    checkFrom(kGen, { n: 4, sq: false }, t`${math`k(${1} + ${2} + ${3} + ${4}) = ${1}`}, so ${math`k = \frac{${1}}{${10}}`}.`),
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`The number of heads in three tosses is ${0}, ${1}, ${2} or ${3}, so each has probability ${math`\frac{${1}}{${4}}`}.`, counterexample: t`The equally likely outcomes are the ${8} sequences, not the ${4} values. One sequence gives ${0} heads, but three give ${1} head. Values of ${mX} are rarely equally likely.` },
    { kind: 'pitfall', claim: t`${math`P(X = x) = \frac{x}{${5}}`} for ${math`x = ${1}, ${2}, ${3}`} is a distribution, since every value lies between ${0} and ${1}.`, counterexample: t`They add to ${math`\frac{${6}}{${5}}`}, more than ${1}, so it is not. Always check the sum as well as the signs; ${math`\frac{x}{${6}}`} would work.` },
    { kind: 'takeaway', text: t`A discrete distribution lists every value with its probability; the probabilities are non-negative and add to one, and sums of them give everything else.` },
  ],
  examples: [
    workedCambridge(a19one),
    worked(headsGen, { n: 4, k: 2 }, t`Two heads in four tosses`),
    worked(maxGen, { m: 4 }, t`The larger of two dice`),
  ],
  generators: [kGen, tabGen, headsGen, maxGen],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['distribution-table'],
  claims,
  cambridge: [ia11, a19bet, a19three, ia11sup, gs4136, gs516],
  // The STEP bet, then the smallest of n dice as a formula. The smaller of two dice mirrors the
  // lesson's worked example (the larger of two), so it is practice.
  gate: ['a19-q4-ii-bet', 'gs-5-1-6'],
  recall: [
    { front: t`What two conditions make ${math`p_{${1}}, p_{${2}}, \ldots`} a probability distribution?`, back: t`Each ${math`p_{i} \ge ${0}`}, and ${math`\sum p_{i} = ${1}`}.` },
    { front: t`How do you find ${math`P(X \in A)`} from a distribution?`, back: t`Add ${math`P(X = x)`} over the values ${mx} in ${math`A`}.` },
  ],
  proofOrder: [
    {
      title: t`The distribution of the number of sixes in three dice`,
      steps: [
        t`List the ${216} equally likely ordered rolls.`,
        t`Count those with ${math`k`} sixes: choose which dice, then non-sixes for the rest.`,
        t`This gives ${125}, ${75}, ${15}, ${1} rolls for ${math`k = ${0}, ${1}, ${2}, ${3}`}.`,
        t`Divide by ${216}, and check the probabilities add to ${1}.`,
      ],
    },
  ],
};

