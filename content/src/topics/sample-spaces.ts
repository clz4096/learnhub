/**
 * pre.sample-spaces: Sample spaces for combined experiments. From STEP Support Assignment
 * 19, Q4 (the warm-down): three coins in a bag, where the hints list the six equally likely
 * (coin, side) outcomes and note that "listing all the possibilities is not cheating", and
 * three dice, whose probabilities the hints use for the expected gain of a bet.
 */
import type { Rng } from '@learnhub/mastery';
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { int, pick, q, str, upTo, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { dmath, math, t, type Rich } from '../rich';
import { checkFrom, worked, workedCambridge, type ProbabilityClaim, type TopicContent } from '../topic';

const roll = (rng: Rng, n = 6): number => 1 + Math.floor(rng() * n);

/** The probability of an event of two dice, by listing all 36 ordered outcomes. */
function twoDice(hit: (a: number, b: number) => boolean): { good: number; all: number; p: Rational } {
  let good = 0;
  let all = 0;
  for (const a of upTo(6)) for (const b of upTo(6)) { all++; if (hit(a, b)) good++; }
  return { good, all, p: q(good, all) };
}

// ---------------------------------------------------------------- generators

type DiceEvent = { kind: 'sum'; s: number } | { kind: 'diff'; d: number } | { kind: 'at-least-one'; v: number } | { kind: 'product-even' };
interface DiceP { e: DiceEvent }

const diceHit = (e: DiceEvent) => (a: number, b: number): boolean => {
  switch (e.kind) {
    case 'sum': return a + b === e.s;
    case 'diff': return Math.abs(a - b) === e.d;
    case 'at-least-one': return a === e.v || b === e.v;
    case 'product-even': return (a * b) % 2 === 0;
  }
};

const diceText = (e: DiceEvent): Rich => {
  switch (e.kind) {
    case 'sum': return t`the total score is ${e.s}`;
    case 'diff': return e.d === 0 ? t`the two scores are equal` : t`the two scores differ by ${e.d}`;
    case 'at-least-one': return t`at least one die shows ${e.v}`;
    case 'product-even': return t`the product of the scores is even`;
  }
};

const twoDiceGen = generator<DiceP>({
  id: 'two-dice',
  skill: 'Find a probability for two dice from the grid of 36 equally likely ordered outcomes.',
  params: (rng) => ({
    e: pick(rng, [
      { kind: 'sum', s: int(rng, 3, 11) },
      { kind: 'diff', d: int(rng, 0, 4) },
      { kind: 'at-least-one', v: int(rng, 1, 6) },
      { kind: 'product-even' },
    ] as DiceEvent[]),
  }),
  sane: ({ e }) => (e.kind === 'sum' ? (e.s >= 3 && e.s <= 11 ? null : 'out of range') : e.kind === 'diff' ? (e.d >= 0 && e.d <= 4 ? null : 'out of range') : null),
  problem: ({ e }) => {
    const { good, p } = twoDice(diceHit(e));
    const how: Rich = e.kind === 'sum'
      ? t`The pairs with total ${e.s} run along a diagonal of the grid: ${good} of them.`
      : e.kind === 'diff'
        ? (e.d === 0 ? t`The equal pairs are the diagonal of the grid: ${good} of them.` : t`For each pair of scores that differ by ${e.d}, either die can be the larger: ${good} cells in two diagonals.`)
        : e.kind === 'at-least-one'
          ? t`Count the row for the first die showing ${e.v} (${6} cells) and the column for the second (${6} cells); the cell where both show it is in both, so ${math`${6} + ${6} - ${1} = ${good}`}.`
          : t`The product is odd only when both scores are odd: ${math`${3} \times ${3} = ${9}`} cells. So ${math`${36} - ${9} = ${good}`} cells have an even product.`;
    return {
      prompt: t`Two fair dice, one red and one blue, are rolled. What is the probability that ${diceText(e)}? Give a fraction in lowest terms.`,
      answer: { kind: 'exact', expected: str(p) },
      solution: [
        t`The [[sample-space|sample space]] is the grid of ordered pairs (red score, blue score): ${math`${6} \times ${6} = ${36}`} [[equally-likely|equally likely]] outcomes.`,
        how,
        t`So the probability is ${math`\frac{${good}}{${36}}`}${str(p) === `${good}/${36}` ? t`` : t`, which is ${p}`}.`,
      ],
    };
  },
  solve: ({ e }) => {
    // Simulate nothing: count again with the scores as one number from 0 to 35.
    let good = 0;
    for (let k = 0; k < 36; k++) if (diceHit(e)(1 + Math.floor(k / 6), 1 + (k % 6))) good++;
    return str(q(good, 36));
  },
  misconceptions: ({ e }): Misconception[] => {
    const { good } = twoDice(diceHit(e));
    // The unordered slip: count {a, b} once each, out of 21 unordered pairs.
    const unordered = new Set<string>();
    for (const a of upTo(6)) for (const b of upTo(6)) if (diceHit(e)(a, b)) unordered.add(`${Math.min(a, b)},${Math.max(a, b)}`);
    const out: Misconception[] = [
      { response: str(q(unordered.size, 21)), why: t`That counts unordered pairs out of ${21}. They are not equally likely: a red ${2} with a blue ${5} and a red ${5} with a blue ${2} are different outcomes. Use the ${36} ordered pairs.` },
    ];
    if (e.kind === 'sum') out.push({ response: str(q(1, 11)), why: t`The ${11} totals from ${2} to ${12} are not equally likely: a total of ${7} happens in ${6} ways and a total of ${2} in only one. Count ordered pairs.` });
    if (e.kind === 'at-least-one') out.push({ response: str(q(12, 36)), why: t`The cell where both dice show ${e.v} was counted twice. Subtract it once.` });
    if (e.kind === 'product-even') out.push({ response: str(q(1, 2)), why: t`An even product needs only one even score, so it is more likely than not. Count the odd products: both scores odd.` });
    if (e.kind === 'diff') {
      out.push(e.d === 0
        ? { response: str(q(1, 36)), why: t`That is the chance of one particular pair, such as two threes. Count every cell on the diagonal.` }
        : { response: str(q(good / 2, 36)), why: t`Either die can be the larger one: count both orders.` });
    }
    return out;
  },
  trial: ({ e }, rng) => diceHit(e)(roll(rng), roll(rng)),
});

interface CoinsP { n: number; k: number; atLeast: boolean }

const coins = generator<CoinsP>({
  id: 'coins',
  skill: 'List the equally likely outcomes of several coins and count those with the right number of heads.',
  params: (rng) => {
    const n = int(rng, 2, 4);
    return { n, k: int(rng, 1, n), atLeast: rng() < 0.4 };
  },
  sane: ({ n, k }) => (n >= 2 && n <= 4 && k >= 1 && k <= n ? null : 'out of range'),
  problem: ({ n, k, atLeast }) => {
    const all = outcomes(n);
    const good = all.filter((o) => (atLeast ? heads(o) >= k : heads(o) === k));
    const p = q(good.length, all.length);
    return {
      prompt: t`${n} fair coins are tossed. What is the probability of ${atLeast ? t`at least ${k}` : t`exactly ${k}`} ${k === 1 && !atLeast ? 'head' : 'heads'}?`,
      answer: { kind: 'exact', expected: str(p) },
      solution: [
        t`Each coin is H or T, so by the product rule there are ${math`${2}^{${n}} = ${all.length}`} equally likely ordered outcomes, such as ${all[1] as string}.`,
        t`The ones with ${atLeast ? t`at least ${k}` : t`exactly ${k}`} ${k === 1 && !atLeast ? 'head' : 'heads'} are ${good.join(', ')}: ${good.length} of them.`,
        t`So the probability is ${math`\frac{${good.length}}{${all.length}}`}${str(p) === `${good.length}/${all.length}` ? t`` : t`, which is ${p}`}.`,
      ],
    };
  },
  solve: ({ n, k, atLeast }) => {
    // By a different route: the number of heads among n coins, built up one coin at a time.
    let ways = [1];
    for (let i = 0; i < n; i++) ways = [...ways, 0].map((w, h) => w + (h > 0 ? (ways[h - 1] as number) : 0));
    const good = ways.reduce((a, w, h) => a + ((atLeast ? h >= k : h === k) ? w : 0), 0);
    return str(q(good, 2 ** n));
  },
  misconceptions: ({ n, k, atLeast }): Misconception[] => [
    { response: str(atLeast ? q(n - k + 1, n + 1) : q(1, n + 1)), why: t`The numbers of heads, from ${0} to ${n}, are not equally likely: there is one way to get no heads but ${n} ways to get one. List the ${2 ** n} ordered outcomes.` },
    { response: str(q(k, n)), why: t`That is a share of coins, not a probability. Count the outcomes with the right number of heads.` },
    { response: str(q(1, 2 ** n)), why: t`That is the chance of one particular outcome, such as ${'H'.repeat(k)}${'T'.repeat(n - k)}. Several orders give the same number of heads.` },
  ],
  trial: ({ n, k, atLeast }, rng) => {
    let h = 0;
    for (let i = 0; i < n; i++) if (rng() < 0.5) h++;
    return atLeast ? h >= k : h === k;
  },
});

function outcomes(n: number): string[] {
  let out = [''];
  for (let i = 0; i < n; i++) out = out.flatMap((o) => [`${o}H`, `${o}T`]);
  return out;
}
const heads = (o: string): number => [...o].filter((c) => c === 'H').length;

interface BagCoinsP { normal: number; hh: number; tt: number }

const trickCoins = generator<BagCoinsP>({
  id: 'trick-coins',
  skill: 'List equally likely (coin, side) outcomes, as in STEP Support Assignment 19, Q4(i).',
  params: (rng) => {
    for (;;) {
      const p = { normal: int(rng, 1, 4), hh: int(rng, 1, 4), tt: int(rng, 0, 3) };
      // With twice as many normal coins as double-headed ones the answer is a half, and the "fair toss" slip would be right.
      // With as many normal coins as double-headed ones, the "count coins" slip is a half too, the same answer as the fair toss slip.
      if (p.normal !== 2 * p.hh && p.normal !== p.hh) return p;
    }
  },
  sane: ({ normal, hh, tt }) => (normal >= 1 && normal <= 4 && hh >= 1 && hh <= 4 && tt >= 0 && tt <= 3 && normal !== 2 * hh && normal !== hh ? null : 'out of range'),
  problem: ({ normal, hh, tt }) => {
    const headSides = normal + 2 * hh;
    const p = q(2 * hh, headSides);
    return {
      prompt: t`A bag holds ${normal} normal ${normal === 1 ? 'coin' : 'coins'} (a head and a tail), ${hh} ${hh === 1 ? 'coin' : 'coins'} with heads on both sides${tt > 0 ? t`, and ${tt} ${tt === 1 ? 'coin' : 'coins'} with tails on both sides` : t``}. I pick a coin at random and look at one side of it at random: it is a head. What is the probability that the other side is a head too?`,
      answer: { kind: 'exact', expected: str(p) },
      solution: [
        t`The equally likely outcomes are (coin, side) pairs: every side of every coin is equally likely to be the one I see. There are ${math`${2} \times ${normal + hh + tt} = ${2 * (normal + hh + tt)}`} of them.`,
        t`I see a head, so the outcome is one of the ${headSides} head sides: ${normal} on the normal ${normal === 1 ? 'coin' : 'coins'} and ${2 * hh} on the double-headed ${hh === 1 ? 'coin' : 'coins'}.`,
        t`The other side is a head for the ${2 * hh} head sides of double-headed coins: ${math`\frac{${2 * hh}}{${headSides}}`}${str(p) === `${2 * hh}/${headSides}` ? t`` : t` ${math`= ${p}`}`}.`,
      ],
    };
  },
  solve: ({ normal, hh, tt }) => {
    // List every side of every coin and keep those showing a head.
    const sides: [string, string][] = [];
    for (let i = 0; i < normal; i++) sides.push(['H', 'T'], ['T', 'H']);
    for (let i = 0; i < hh; i++) sides.push(['H', 'H'], ['H', 'H']);
    for (let i = 0; i < tt; i++) sides.push(['T', 'T'], ['T', 'T']);
    const seen = sides.filter(([up]) => up === 'H');
    return str(q(seen.filter(([, down]) => down === 'H').length, seen.length));
  },
  misconceptions: ({ normal, hh }): Misconception[] => [
    { response: str(q(hh, normal + hh)), why: t`That counts coins, not sides. A double-headed coin shows a head twice as often as a normal one, so list the sides.` },
    { response: str(q(1, 2)), why: t`The other side is not a fair coin toss. Count the head sides you could be looking at, and how many have a head behind them.` },
  ],
  trial: ({ normal, hh, tt }, rng) => {
    // Pick a coin and a side until the side seen is a head: a draw given the observation.
    for (;;) {
      const c = Math.floor(rng() * (normal + hh + tt));
      const side = rng() < 0.5 ? 0 : 1;
      const coin = c < normal ? ['H', 'T'] : c < normal + hh ? ['H', 'H'] : ['T', 'T'];
      if (coin[side] === 'H') return coin[1 - side] === 'H';
    }
  },
});

interface SpinP { a: number; b: number; rel: 'greater' | 'equal' }

const spinners = generator<SpinP>({
  id: 'spinners',
  skill: 'Tabulate two experiments with different numbers of outcomes and count a comparison.',
  params: (rng) => {
    const a = int(rng, 3, 6);
    let b = int(rng, 3, 6);
    if (b === a) b = a === 6 ? 4 : a + 1;
    return { a, b, rel: pick(rng, ['greater', 'equal'] as const) };
  },
  sane: ({ a, b }) => (a >= 3 && a <= 6 && b >= 3 && b <= 7 && a !== b ? null : 'out of range'),
  problem: ({ a, b, rel }) => {
    const good = rel === 'greater' ? countPairs(a, b, (x, y) => x > y) : Math.min(a, b);
    const p = q(good, a * b);
    return {
      prompt: t`A fair spinner A has ${a} equal sectors numbered ${1} to ${a}; a fair spinner B has ${b} equal sectors numbered ${1} to ${b}. Both are spun. What is the probability that ${rel === 'greater' ? 'A shows a larger number than B' : 'they show the same number'}?`,
      answer: { kind: 'exact', expected: str(p) },
      solution: [
        t`The sample space is the ${math`${a} \times ${b}`} table of pairs (A, B): ${a * b} equally likely outcomes.`,
        rel === 'greater'
          ? t`For A showing ${math`x`}, B must show less than ${math`x`}: count each row of the table and add, ${good} cells.`
          : t`The pairs with the same number are ${math`(${1}, ${1})`} up to ${math`(${Math.min(a, b)}, ${Math.min(a, b)})`}: ${good} cells.`,
        t`So the probability is ${math`\frac{${good}}{${a * b}}`}${str(p) === `${good}/${a * b}` ? t`` : t`, which is ${p}`}.`,
      ],
    };
  },
  solve: ({ a, b, rel }) => {
    let good = 0;
    for (let k = 0; k < a * b; k++) {
      const x = 1 + (k % a);
      const y = 1 + Math.floor(k / a);
      if (rel === 'greater' ? x > y : x === y) good++;
    }
    return str(q(good, a * b));
  },
  misconceptions: ({ a, b, rel }): Misconception[] => [
    rel === 'greater'
      ? { response: str(q(1, Math.max(a, b))), why: t`That treats one spinner on its own. The sample space has ${a * b} pairs; count the pairs that work.` }
      : { response: str(q(1, a * b)), why: t`That is the chance of one particular pair, such as two ones. Count every pair with the same number.` },
    { response: str(q(rel === 'greater' ? countPairs(a, b, (x, y) => x >= y) : countPairs(a, b, (x, y) => x > y), a * b)), why: rel === 'greater' ? t`That includes the ties. "Larger" excludes equal numbers.` : t`That counts A larger than B, not equal.` },
    { response: str(q(1, 2)), why: t`The spinners have different numbers of sectors, so the outcomes are not split evenly. Count the cells of the table.` },
  ],
  trial: ({ a, b, rel }, rng) => {
    const x = roll(rng, a);
    const y = roll(rng, b);
    return rel === 'greater' ? x > y : x === y;
  },
});

function countPairs(a: number, b: number, hit: (x: number, y: number) => boolean): number {
  let n = 0;
  for (const x of upTo(a)) for (const y of upTo(b)) if (hit(x, y)) n++;
  return n;
}

// ---------------------------------------------------------------- Cambridge problems

/** P(k sixes) with three dice, by listing all 216 outcomes. */
function sixes(k: number): Rational {
  let good = 0;
  for (const a of upTo(6)) for (const b of upTo(6)) for (const c of upTo(6)) if ([a, b, c].filter((x) => x === 6).length === k) good++;
  return q(good, 216);
}
/** The same by the product rule: choose which dice are sixes, then 1 way for each six and 5 for each other die. */
const sixesByRule = (k: number): Rational => q([1, 3, 3, 1][k] as number * 5 ** (3 - k), 6 ** 3);

const a19i = auto({
  id: 'a19-q4-i',
  source: cite('step-f19', 'Q4(i)'),
  title: t`Three coins in a bag`,
  prompt: t`I place three coins in a bag. One is normal, with a head on one side and a tail on the other. One has heads on both sides, and the other has tails on both sides. I pick one coin from the bag at random and look at one side of it at random: it is a head. What is the probability that there is a head on the other side?`,
  answer: { kind: 'exact', expected: str(q(2, 3)) },
  solution: [
    t`The hints list the six equally likely possibilities: pick the normal coin and see its head, or its tail; pick the double-headed coin and see head ${math`H_{${1}}`} or head ${math`H_{${2}}`}; pick the double-tailed coin and see tail ${math`T_{${1}}`} or ${math`T_{${2}}`}.`,
    t`I am looking at a head, so it is one of three cases: the normal coin's head, ${math`H_{${1}}`}, or ${math`H_{${2}}`}.`,
    t`Two of the three have a head on the other side, so the probability is ${q(2, 3)}, not ${q(1, 2)}: the double-headed coin has two ways to show a head.`,
  ],
  reference: str(q(2, 3)),
  verify: () => {
    const sides = [['H', 'T'], ['T', 'H'], ['H', 'H'], ['H', 'H'], ['T', 'T'], ['T', 'T']];
    const seen = sides.filter(([up]) => up === 'H');
    return same('three coins, by listing sides', str(q(seen.filter(([, d]) => d === 'H').length, seen.length)), '2/3');
  },
  misconceptions: [{ response: '1/2', why: t`"Two coins have a head, so it is one of two coins" counts coins, not sides. The double-headed coin shows a head twice as often.` }],
  official: { source: cite('step-f19-hints', 'Q4(i)'), answer: '2/3', agrees: true },
});

const a19three = auto({
  id: 'a19-q4-ii-three',
  source: cite('step-f19', 'Q4(ii)'),
  title: t`Three sixes`,
  prompt: t`I am about to throw three fair dice. What is the probability of three sixes?`,
  nudge: t`Not quite. All three dice must show six at once; count outcomes of the whole throw.`,
  hints: [
    t`How many equally likely ordered outcomes do three dice have?`,
    t`How many of those outcomes are three sixes?`,
    t`Equivalently, how do the three independent chances of a six combine?`,
  ],
  answer: { kind: 'exact', expected: str(sixes(3)) },
  solution: [
    t`The sample space is every ordered triple of scores: ${math`${6} \times ${6} \times ${6} = ${216}`} equally likely outcomes.`,
    t`Exactly one of them is three sixes, so the probability is ${sixes(3)}.`,
    t`List the whole sample space of ordered outcomes, then count.`,
  ],
  reference: str(sixes(3)),
  verify: () => same('three sixes, listed and by the rule', str(sixes(3)), str(sixesByRule(3))),
  misconceptions: [{ response: str(q(1, 18)), why: t`That adds ${q(1, 6)} three times. All three dice must show six, which is one outcome of ${216}.` }],
  // The hints give it as the last term of the expected gain, (1/6)^3, the 1 of 216.
  official: { source: cite('step-f19-hints', 'Q4(ii)'), answer: '1/216', agrees: true },
});

const a19one = auto({
  id: 'a19-q4-ii-one',
  source: cite('step-f19', 'Q4(ii)'),
  title: t`Exactly one six`,
  prompt: t`I am about to throw three fair dice. What is the probability of exactly one six?`,
  nudge: t`Not quite. Count ordered outcomes, and check which die can carry the six.`,
  hints: [
    t`How many equally likely ordered outcomes do three dice have?`,
    t`If the first die is the only six, how many outcomes are there?`,
    t`On how many different dice could the single six appear?`,
  ],
  answer: { kind: 'exact', expected: str(sixes(1)) },
  solution: [
    t`Of the ${216} ordered outcomes, count those with one six: choose which die shows it (${3} ways), and each of the other two dice shows one of ${5} other scores.`,
    t`That is ${math`${3} \times ${5} \times ${5} = ${75}`} outcomes, so the probability is ${math`\frac{${75}}{${216}} = ${sixes(1)}`}.`,
    t`Choose where the special result goes, then fill the rest.`,
  ],
  reference: str(sixes(1)),
  verify: () => same('one six, listed and by the rule', str(sixes(1)), str(sixesByRule(1))),
  misconceptions: [
    { response: str(q(25, 216)), why: t`That is the chance that the first die is the six and the others are not. The six can be on any of the three dice.` },
    { response: str(q(1, 6)), why: t`That is the chance one die shows a six. The other two must not.` },
  ],
  // The hints write the term 3 × (1/6)(5/6)^2 and its numerator 75 over 216.
  official: { source: cite('step-f19-hints', 'Q4(ii)'), answer: '75/216', agrees: true },
});

const a19table = auto({
  id: 'a19-q4-ii-table',
  source: cite('step-f19', 'Q4(ii)', true),
  title: t`Every number of sixes`,
  prompt: t`Three fair dice are thrown. Fill in the probability of each number of sixes, as a fraction.`,
  nudge: t`Not quite. Count ordered outcomes for each number of sixes; the four counts must add to ${216}.`,
  hints: [
    t`How many ordered outcomes have no six at all?`,
    t`For exactly ${math`j`} sixes, in how many ways can the dice showing them be chosen, and how many scores can each other die show?`,
    t`Do the four counts add up to the total number of outcomes?`,
  ],
  answer: {
    kind: 'table', cell: 'exact',
    columns: [t`number of sixes`, t`probability`],
    rows: [0, 1, 2, 3].map((k) => [t`${k}`, null]),
    expected: [0, 1, 2, 3].map((k) => str(sixes(k))),
  },
  solution: [
    t`Count ordered outcomes out of ${216}: no sixes, ${math`${5}^{${3}} = ${125}`}; one six, ${math`${3} \times ${25} = ${75}`}; two sixes, ${math`${3} \times ${5} = ${15}`}; three sixes, ${1}.`,
    t`Check: ${math`${125} + ${75} + ${15} + ${1} = ${216}`}, so every outcome is counted once.`,
    t`Count every case on one sample space, and check that the counts add to the total.`,
  ],
  reference: [0, 1, 2, 3].map((k) => str(sixes(k))),
  verify: () => same('all four counts, listed and by the rule', [0, 1, 2, 3].map((k) => str(sixes(k))).join(' '), [0, 1, 2, 3].map((k) => str(sixesByRule(k))).join(' ')),
  // The hints' expected gain: (5/6)^3, 3 (1/6)(5/6)^2, 3 (1/6)^2 (5/6), (1/6)^3, that is 125, 75, 15, 1 out of 216.
  official: { source: cite('step-f19-hints', 'Q4(ii)'), answer: ['125/216', '75/216', '15/216', '1/216'], agrees: true },
});

const a19bet = supervision({
  id: 'a19-q4-ii-bet',
  source: cite('step-f19', 'Q4(ii)'),
  title: t`Should I accept the bet?`,
  prompt: t`I am about to throw three fair dice. My friend offers to give me £${1} if I throw no sixes, provided I give her £${1} if I throw one six, £${2} if I throw two sixes, and £${3} if I throw three sixes. Should I accept? Explain using the sample space, for example by the expected result over ${216} games.`,
  hints: [
    t`How many of the ${216} equally likely outcomes give no six, one six, two sixes, and three sixes?`,
    t`Over ${216} games, how much is won on the outcomes with no six, and how much paid out on the rest?`,
    t`Is the net amount over those games positive or negative, and what does that say about the offer?`,
  ],
  writeUp: 'explanation',
  official: cite('step-f19-hints', 'Q4(ii)'),
});

// ---------------------------------------------------------------- lesson

const sumCounts = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((s) => twoDice((a, b) => a + b === s).good);
const BAG = { normal: 1, hh: 2 };
const bagSides = 2 * (BAG.normal + BAG.hh);
const bagHeads = BAG.normal + 2 * BAG.hh;

const claims: ProbabilityClaim[] = [
  { what: 'three coins in a bag: P(head behind | head seen)', exact: q(2, 3), trial: (rng) => trickCoins.at({ normal: 1, hh: 1, tt: 1 }).trial?.(rng) ?? false },
  { what: 'three dice: P(exactly one six)', exact: sixes(1), trial: (rng) => [roll(rng), roll(rng), roll(rng)].filter((x) => x === 6).length === 1 },
  { what: 'two dice: P(total 7)', exact: q(sumCounts[5] as number, 36), trial: (rng) => roll(rng) + roll(rng) === 7 },
  { what: 'two dice: P(total 11)', exact: q(sumCounts[9] as number, 36), trial: (rng) => roll(rng) + roll(rng) === 11 },
  { what: 'one normal and two double-headed coins: P(head behind | head seen)', exact: q(2 * BAG.hh, bagHeads), trial: (rng) => trickCoins.at({ normal: BAG.normal, hh: BAG.hh, tt: 0 }).trial?.(rng) ?? false },
];
const mOmega = math`\Omega`;

export const sampleSpaces: TopicContent = {
  topicId: 'pre.sample-spaces',
  goal: t`List or tabulate the equally likely outcomes of two or more experiments, and count the ones you want.`,
  objective: t`List or tabulate the equally likely outcomes of combined experiments and count the ones you want.`,
  why: t`Choosing the right list of outcomes is the first step of every probability problem, from trees to STEP.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`Eleven or twelve?` },
    { kind: 'hook', text: t`Roll two dice. A friend argues that a total of ${11} and a total of ${12} are equally likely: ${11} is ${math`${5} + ${6}`} and ${12} is ${math`${6} + ${6}`}, one way each. Is she right?` },
    { kind: 'narrative', text: t`Paint one die red and the other blue, and the flaw shows. A total of ${11} happens when red is ${5} and blue is ${6}, or when red is ${6} and blue is ${5}: two different outcomes. A total of ${12} needs both to be ${6}: one outcome. Painting the dice changes nothing physical, so ${11} was twice as likely as ${12} all along. The friend counted totals; she should have counted outcomes.` },
    { kind: 'section', title: t`The list of outcomes` },
    {
      kind: 'definition',
      name: t`Sample space`,
      formal: t`The [[sample-space|sample space]] ${mOmega} of an experiment is the set of all its possible outcomes. For an experiment in two parts with outcome sets ${math`A`} and ${math`B`}, ${dmath`\Omega = A \times B = \{(a, b) : a \in A,\ b \in B\},`} the ordered pairs.`,
      plain: t`In plain words: the complete list of what can happen. For two dice it is the ${36} pairs (red score, blue score), and ${math`(${5}, ${6})`} and ${math`(${6}, ${5})`} are different entries.`,
    },
    { kind: 'p', text: t`By the product rule, two dice have ${math`${6} \times ${6} = ${36}`} outcomes and three dice ${math`${6}^{${3}} = ${216}`}. For fair dice thrown independently, all of these are equally likely, so the familiar rule applies: ${dmath`P(E) = \frac{\text{number of outcomes in } E}{\lvert \Omega \rvert}.`}` },
    {
      kind: 'table', caption: t`A [[sample-space-diagram|sample space diagram]] for the total of two dice: each cell is one of the ${36} equally likely outcomes.`,
      head: [t`red die`, ...upTo(6).map((b) => t`${b}`)],
      rows: upTo(6).map((a) => [t`${a}`, ...upTo(6).map((b) => t`${a + b}`)]),
    },
    {
      kind: 'steps',
      steps: [
        { label: t`Find the cells`, text: t`Total ${11}: the cells ${math`(${5}, ${6})`} and ${math`(${6}, ${5})`}. Total ${12}: only ${math`(${6}, ${6})`}.` },
        { label: t`Divide by the total`, text: t`${math`P(\text{total } ${11}) = ${q(sumCounts[9] as number, 36)}`} and ${math`P(\text{total } ${12}) = ${q(sumCounts[10] as number, 36)}`}.`, plain: t`The diagonal of sevens is the longest: ${sumCounts[5] as number} cells, so ${7} is the most likely total, with probability ${q(sumCounts[5] as number, 36)}.` },
      ],
    },
    checkFrom(twoDiceGen, { e: { kind: 'diff', d: 1 } }, t`The scores differ by ${1} in ${twoDice((a, b) => Math.abs(a - b) === 1).good} cells, two beside each of the ${5} steps of the diagonal: ${q(twoDice((a, b) => Math.abs(a - b) === 1).good, 36)}.`),
    { kind: 'pitfall', claim: t`With two dice, "a ${5} and a ${6}" and "two sixes" are equally likely.`, counterexample: t`"A ${5} and a ${6}" is two outcomes, ${math`(${5}, ${6})`} and ${math`(${6}, ${5})`}, so ${q(2, 36)}. "Two sixes" is one outcome, ${q(1, 36)}. Unordered results are not equally likely.` },
    { kind: 'section', title: t`Listing is not cheating` },
    { kind: 'narrative', text: t`The STEP Support notes for Assignment ${19} put it plainly: listing all the possibilities is not "cheating", and it is often the most efficient way to solve a problem, though less so the more possibilities there are. Four coins have ${2 ** 4} outcomes, still easy to write down: HHHH, HHHT, and so on. For three dice, ${216} is too many to list, and you count with the product rule instead.` },
    checkFrom(coins, { n: 4, k: 2, atLeast: false }, t`Of the ${16} sequences of four tosses, ${6} have exactly two heads (choose the two places for the heads): ${q(6, 16)}.`),
    { kind: 'section', title: t`Choosing what to list` },
    { kind: 'narrative', text: t`The hardest part is often deciding what the equally likely outcomes are. A bag holds ${BAG.normal} normal coin and ${BAG.hh} coins with heads on both sides. You pick a coin at random, look at one side at random, and see a head. What is the chance the other side is a head too?` },
    {
      kind: 'steps',
      steps: [
        { label: t`Choose the outcomes`, text: t`The coins are not equally likely once you have seen a head: a double-headed coin shows a head every time, a normal coin half the time. The equally likely outcomes are the (coin, side) pairs: ${math`${2} \times ${BAG.normal + BAG.hh} = ${bagSides}`} sides, each equally likely to be the one you see.`, why: { q: t`Why are the sides equally likely?`, a: t`Each coin has probability ${q(1, BAG.normal + BAG.hh)}, then each of its two sides ${q(1, 2)}, so every side has probability ${q(1, bagSides)}.` } },
        { label: t`Keep what you saw`, text: t`You saw a head, so the outcome is one of the ${bagHeads} head sides: ${BAG.normal} on the normal coin and ${2 * BAG.hh} on the double-headed ones.` },
        { label: t`Count the good ones`, text: t`The other side is a head for the ${2 * BAG.hh} head sides of double-headed coins:`, eq: [dmath`\frac{${2 * BAG.hh}}{${bagHeads}}.`] },
      ],
    },
    checkFrom(trickCoins, { normal: 3, hh: 1, tt: 1 }, t`Head sides: ${3} on the normal coins and ${2} on the double-headed one, ${5} in all. ${2} of them have a head behind: ${q(2, 5)}.`),
    { kind: 'pitfall', claim: t`You saw a head, so the coin is either the normal one or a double-headed one, and the other side is a head with probability ${q(BAG.hh, BAG.normal + BAG.hh)}.`, counterexample: t`That treats the coins as equally likely after the look, but a double-headed coin is twice as likely to show a head. Counting sides gives ${q(2 * BAG.hh, bagHeads)}.` },
    { kind: 'takeaway', text: t`List outcomes that really are equally likely, ordered pairs for two dice and sides for coins, then count favourable over total.` },
  ],
  examples: [
    workedCambridge(a19i),
    worked(twoDiceGen, { e: { kind: 'sum', s: 9 } }, t`A total of nine with two dice`),
    worked(coins, { n: 3, k: 2, atLeast: false }, t`Exactly two heads from three coins`),
  ],
  generators: [twoDiceGen, coins, trickCoins, spinners],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['sample-space', 'sample-space-diagram'],
  claims,
  cambridge: withUses([a19three, a19one, a19table, a19bet], {
    'a19-q4-ii-bet': { sections: ['The list of outcomes', 'Choosing what to list'], note: t`Counting outcomes over many games to judge a bet` },
    'a19-q4-ii-table': { sections: ['The list of outcomes'], note: t`The probability of each number of sixes from the list of outcomes` },
    'a19-q4-ii-one': { sections: ['The list of outcomes'], note: t`Counting the outcomes with exactly one six` },
  }),
  // Best first: the bet (needs every probability and a judgement), the full table, then
  // exactly one six. Three sixes is a single product, too slight to gate.
  gate: ['a19-q4-ii-bet', 'a19-q4-ii-table', 'a19-q4-ii-one'],
  recall: [
    { front: t`What is a sample space?`, back: t`The set of all possible outcomes of an experiment.` },
    { front: t`How many outcomes do two dice have, and why ordered pairs?`, back: t`${36}. Ordered pairs are equally likely; unordered results like "a ${5} and a ${6}" are not.` },
    { front: t`With equally likely outcomes, ${math`P(E)`} is?`, back: t`The number of outcomes in ${math`E`} over the number in ${mOmega}.` },
  ],
};
