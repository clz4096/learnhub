/**
 * pre.product-rule: The product rule for counting. From STEP Support Assignment 6 Q5(i)
 * (Claire: 6 places for the first letter, then 5, and so on) and Assignment 7 Q4,
 * Bachet's weights (each weight in the pan or not gives 2^n choices; with two pans, 3^n).
 */
import type { Rational } from '@learnhub/mastery';
import { auto, cite, same, withUses } from '../cambridge';
import { factorial, int, pick, upTo } from '../math';
import { generator, type Misconception } from '../problem';
import { computed, computedMath as cm, dmath, listOf, math, t } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

/** Every tuple with entry i in 0 .. sizes[i] - 1, counted one by one like an odometer. */
function countTuples(sizes: readonly number[], keep: (tuple: readonly number[]) => boolean = () => true): number {
  const tuple = sizes.map(() => 0);
  let count = 0;
  for (;;) {
    if (keep(tuple)) count++;
    let i = sizes.length - 1;
    while (i >= 0 && tuple[i] === (sizes[i] as number) - 1) tuple[i--] = 0;
    if (i < 0) return count;
    tuple[i] = (tuple[i] as number) + 1;
  }
}

const product = (xs: readonly number[]): number => xs.reduce((a, b) => a * b, 1);

// ---------------------------------------------------------------- generators

interface MenuP { s: number; m: number; d: number }

const menu = generator<MenuP>({
  id: 'menu',
  skill: 'Count the outcomes of three choices made one after another.',
  params: (rng) => ({ s: int(rng, 2, 6), m: int(rng, 2, 8), d: int(rng, 2, 6) }),
  sane: ({ s, m, d }) => (s >= 2 && s <= 6 && m >= 2 && m <= 8 && d >= 2 && d <= 6 ? null : 'out of range'),
  problem: ({ s, m, d }) => ({
    prompt: t`A cafe offers ${s} starters, ${m} main courses, and ${d} desserts. A meal is one of each. How many different meals are there?`,
    answer: { kind: 'exact', expected: String(s * m * d) },
    solution: [
      t`Each starter can go with each main course: ${math`${s} \times ${m} = ${s * m}`} pairs.`,
      t`Each of those pairs can go with each dessert: ${math`${s * m} \times ${d} = ${s * m * d}`} meals. This is the [[product-rule|product rule]].`,
    ],
  }),
  solve: ({ s, m, d }) => String(countTuples([s, m, d])),
  misconceptions: ({ s, m, d }): Misconception[] => [
    { response: String(s + m + d), why: t`Adding counts the dishes, not the meals. Every choice of starter can be paired with every main course and every dessert, so multiply.` },
    { response: String(s * m), why: t`That counts starter and main course pairs. Each pair can go with any of the ${d} desserts, so multiply by ${d} as well.` },
  ],
});

interface CodeP { n: number; k: number; what: 'lock' | 'pin' }

const codes = generator<CodeP>({
  id: 'codes',
  skill: 'Count codes where each position is chosen independently and symbols may repeat.',
  params(rng) {
    const what = pick(rng, ['lock', 'pin'] as const);
    return { what, n: what === 'pin' ? 10 : int(rng, 3, 9), k: int(rng, 2, 4) };
  },
  sane: ({ n, k }) => (n >= 3 && n <= 10 && k >= 2 && k <= 4 ? null : 'out of range'),
  problem: ({ n, k, what }) => {
    const intro = what === 'pin'
      ? t`A PIN is ${k} digits long, and each digit can be any of the ${n} digits from ${0} to ${9}. Digits may repeat.`
      : t`A combination lock has ${k} wheels, each showing one of ${n} symbols. Symbols may repeat.`;
    return {
      prompt: t`${intro} How many different codes are there?`,
      answer: { kind: 'exact', expected: String(n ** k) },
      solution: [
        t`Each of the ${k} positions has ${n} choices, whatever the other positions show.`,
        t`By the [[product-rule|product rule]], multiply together ${k} factors of ${n}: ${math`${n}^{${k}} = ${n ** k}`}.`,
      ],
    };
  },
  solve: ({ n, k }) => String(countTuples(Array.from({ length: k }, () => n))),
  misconceptions: ({ n, k }): Misconception[] => [
    { response: String(n * k), why: t`Multiplying ${n} by ${k} adds the choices up position by position. The positions combine: each choice in one position goes with every choice in the others, so multiply together ${k} factors of ${n}.` },
    { response: String(k ** n), why: t`The base and the power are swapped. There are ${n} choices for each of ${k} positions, which is ${math`${n}^{${k}}`}.` },
    { response: String(product(Array.from({ length: k }, (_, i) => n - i))), why: t`That count stops symbols from repeating. Here they may repeat, so every position keeps all ${n} choices.` },
  ],
});

interface NumP { k: number; rule: 'any' | 'even' | 'odd' }

const wholeNumbers = generator<NumP>({
  id: 'whole-numbers',
  skill: 'Count whole numbers with a restriction on some digits.',
  params: (rng) => ({ k: int(rng, 2, 4), rule: pick(rng, ['any', 'even', 'odd'] as const) }),
  sane: ({ k }) => (k >= 2 && k <= 4 ? null : 'out of range'),
  problem: ({ k, rule }) => {
    const last = rule === 'any' ? 10 : 5;
    const middle = Array.from({ length: k - 2 }, () => 10);
    const total = 9 * product(middle) * last;
    const what = rule === 'any' ? t`whole numbers` : rule === 'even' ? t`even whole numbers` : t`odd whole numbers`;
    const lastWhy = rule === 'any'
      ? t`The last digit can be any of ${10} digits.`
      : rule === 'even'
        ? t`The last digit must be even: one of ${0}, ${2}, ${4}, ${6}, ${8}, so ${5} choices.`
        : t`The last digit must be odd: one of ${1}, ${3}, ${5}, ${7}, ${9}, so ${5} choices.`;
    return {
      prompt: t`How many ${what} have exactly ${k} digits? (A whole number does not start with ${0}.)`,
      answer: { kind: 'exact', expected: String(total) },
      solution: [
        t`The first digit cannot be ${0}, so it has ${9} choices.`,
        ...(k > 2 ? [t`Each of the ${k - 2} middle digits has ${10} choices.`] : []),
        lastWhy,
        t`Multiply the choices: ${cm(`${[9, ...middle, last].join(' * ')} = ${total}`)}.`,
      ],
    };
  },
  solve: ({ k, rule }) => {
    let count = 0;
    for (let x = 10 ** (k - 1); x < 10 ** k; x++) if (rule === 'any' || (x % 2 === 0) === (rule === 'even')) count++;
    return String(count);
  },
  misconceptions: ({ k, rule }): Misconception[] => {
    const last = rule === 'any' ? 10 : 5;
    return [
      { response: String(10 ** (k - 1) * last), why: t`That lets the first digit be ${0}. A number like ${computed(`${0}`.repeat(k - 1) + `${7}`)} is really a shorter number, so the first digit has only ${9} choices.` },
      ...(rule === 'any'
        ? [{ response: String(9 ** k), why: t`Only the first digit loses ${0}. The other digits can be ${0}, so they keep all ${10} choices.` }]
        : [{ response: String(9 * 10 ** (k - 1)), why: t`That counts every ${k}-digit number. Only ${5} of the ${10} last digits are ${rule === 'even' ? 'even' : 'odd'}, so the last digit has ${5} choices.` }]),
    ];
  },
});

// ---------------------------------------------------------------- Bachet's weights

const asInts = (ws: readonly Rational[]): number[] | null =>
  ws.every((w) => w.den === 1n && w.num > 0n && w.num < 10_000n) ? ws.map((w) => Number(w.num)) : null;

/** Every load the weights can balance: one pan (each weight in or out), or two pans (left, right, or out). */
function loads(ws: readonly number[], pans: 1 | 2): Set<number> {
  let sums = new Set<number>([0]);
  for (const w of ws) {
    const next = new Set<number>();
    for (const x of sums) {
      next.add(x);
      next.add(x + w);
      if (pans === 2) next.add(x - w);
    }
    sums = next;
  }
  return sums;
}

/** Null when `count` positive whole weights balance every load from 1 to `top`, else why not. */
function weighsAll(ws: readonly Rational[], count: number, top: number, pans: 1 | 2): string | null {
  const w = asInts(ws);
  if (w === null) return 'Each weight must be a positive whole number of ounces.';
  if (w.length !== count) return `Use exactly ${count} weights.`;
  const can = loads(w, pans);
  for (let k = 1; k <= top; k++) if (!can.has(k)) return `With those weights, ${k} ounces cannot be weighed.`;
  return null;
}

const placements = (k: number, pans: 1 | 2): number => (pans === 1 ? 2 : 3) ** k;

interface PlaceP { k: number; pans: 1 | 2 }

const weighings = generator<PlaceP>({
  id: 'weighings',
  skill: 'Count the ways to place weights, each in or out of the pan (or in either pan), as in STEP Support Assignment 7 Q4.',
  params: (rng) => ({ k: int(rng, 3, 7), pans: pick(rng, [1, 2] as const) }),
  sane: ({ k }) => (k >= 3 && k <= 7 ? null : 'out of range'),
  problem: ({ k, pans }) => ({
    prompt: pans === 1
      ? t`I have ${k} different weights and a balance where weights go in one pan only. Each weight is either in the pan or not. How many different ways are there to choose which weights go in, counting the way with no weights at all?`
      : t`I have ${k} different weights and a balance with two pans. Each weight goes in the left pan, in the right pan, or is not used. How many different ways are there to place the weights, counting the way with none used?`,
    answer: { kind: 'exact', expected: String(placements(k, pans)) },
    solution: [
      pans === 1
        ? t`Each weight is a step with ${2} choices: in or out.`
        : t`Each weight is a step with ${3} choices: left pan, right pan, or not used.`,
      t`By the product rule the ${k} steps give ${math`${pans === 1 ? 2 : 3}^{${k}} = ${placements(k, pans)}`} ways.`,
    ],
  }),
  // Count the placements one by one: a tuple with one entry per weight (0 out, 1 left, 2 right).
  solve: ({ k, pans }) => String(countTuples(Array.from({ length: k }, () => (pans === 1 ? 2 : 3)))),
  misconceptions: ({ k, pans }): Misconception[] => [
    { response: String((pans === 1 ? 2 : 3) * k), why: t`That adds the choices. The weights are placed one after another, so multiply: ${pans === 1 ? 2 : 3} for the first weight, times ${pans === 1 ? 2 : 3} for the second, and so on.` },
    { response: String(k ** (pans === 1 ? 2 : 3)), why: t`The base and the index are swapped. There are ${pans === 1 ? 2 : 3} choices for each of ${k} weights, which is ${math`${pans === 1 ? 2 : 3}^{${k}}`}.` },
    { response: String(placements(k, pans) - 1), why: t`The question counts the way with no weights used as well.` },
  ],
});

interface SetP { k: number; pans: 1 | 2 }
const topOf = ({ k, pans }: SetP): number => (pans === 1 ? 2 ** k - 1 : (3 ** k - 1) / 2);

const bachet = generator<SetP>({
  id: 'bachet',
  skill: 'Choose weights that balance every whole number up to a limit: powers of 2 for one pan, powers of 3 for two.',
  params: (rng) => {
    const pans = pick(rng, [1, 2] as const);
    return { pans, k: pans === 1 ? int(rng, 3, 8) : int(rng, 2, 5) };
  },
  sane: (p) => (p.pans === 1 ? p.k >= 3 && p.k <= 8 : p.k >= 2 && p.k <= 5) ? null : 'out of range',
  problem: (p) => {
    const ws = upTo(p.k).map((i) => (p.pans === 1 ? 2 : 3) ** (i - 1));
    return {
      prompt: p.pans === 1
        ? t`With a balance where weights go in one pan only, find ${p.k} weights that can weigh every whole number of ounces from ${1} to ${topOf(p)}. Write them separated by commas.`
        : t`With a balance where weights may go in either pan, find ${p.k} weights that can weigh every whole number of ounces from ${1} to ${topOf(p)}. Write them separated by commas.`,
      answer: {
        kind: 'witness', count: p.k, unordered: true, example: ws.join(', '),
        check: (vals) => weighsAll(vals, p.k, topOf(p), p.pans),
      },
      solution: p.pans === 1
        ? [
          t`Each weight is in or out, so ${p.k} weights give at most ${math`${2}^{${p.k}} = ${2 ** p.k}`} loads, counting zero. To reach every whole number up to ${topOf(p)}, no two choices may give the same load.`,
          t`The powers of ${2} do this, as binary numbers do: ${listOf(ws)} weigh every load from ${0} to ${cm(`${ws.join(' + ')} = ${topOf(p)}`)}.`,
        ]
        : [
          t`Each weight goes left, right, or out, ${3} choices. A weight on the same side as the load counts as taken away, so loads can be differences too.`,
          t`The powers of ${3} work: ${listOf(ws)} weigh every load up to their total, ${topOf(p)}. For example ${math`${2} = ${3} - ${1}`}: the ${3} against the load, and the ${1} beside it.`,
        ],
    };
  },
  solve: (p) => upTo(p.k).map((i) => (p.pans === 1 ? 2 : 3) ** (i - 1)).join(', '),
  misconceptions: (p): Misconception[] => [
    { response: upTo(p.k).join(', '), why: t`Consecutive weights repeat loads (for example ${math`${1} + ${2} = ${3}`}), so they run out early. Make each weight as large as possible while every smaller load is still covered.` },
    { response: upTo(p.k).map((i) => (p.pans === 1 ? 3 : 2) ** (i - 1)).join(', '), why: p.pans === 1
      ? t`Powers of ${3} need two pans. With one pan, each weight is only in or out, so use powers of ${2}.`
      : t`Powers of ${2} waste the second pan. With weights allowed on both sides, each weight has ${3} positions, so use powers of ${3}.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const A7 = 'step-f07';
const claire = 'Claire';
const claireCount = factorial(claire.length);

const a6Claire = auto({
  id: 'a6-q5-i',
  source: cite('step-f06', 'Q5(i)'),
  title: t`Claire's letters`,
  prompt: t`Claire wants to work out the number of ways she can arrange the letters of her name, which are all different. How many are there?`,
  answer: { kind: 'exact', expected: String(claireCount) },
  solution: [
    t`There are ${claire.length} positions in which Claire can place the first letter.`,
    t`For each of these, there are ${claire.length - 1} places left for the second letter, then ${claire.length - 2} for the third, and so on down to ${1}.`,
    t`By the product rule the total is ${cm(`${upTo(claire.length).reverse().join(' * ')} = ${claireCount}`)}.`,
  ],
  reference: String(claireCount),
  verify: () => {
    // Count the orderings of six different letters by listing them.
    const all = new Set<string>();
    const go = (left: string, built: string): void => {
      if (left === '') { all.add(built); return; }
      for (let i = 0; i < left.length; i++) go(left.slice(0, i) + left.slice(i + 1), built + (left[i] as string));
    };
    go(claire.toLowerCase(), '');
    return same('A6 Q5(i) by listing', all.size, claireCount);
  },
  official: { source: cite('step-f06', 'Q5(i), worked in the assignment'), answer: '720', agrees: true },
});

const a7InOut = auto({
  id: 'a7-q4-i-c-count',
  source: cite(A7, 'Q4(i)(c)', true),
  title: t`Each weight in or out`,
  prompt: t`I have ${math`n`} weights and a balance where weights go in one pan only. Each weight is either in the pan or not in the pan. How many different choices of the weights in the pan are there, counting the empty pan? Give an expression in ${math`n`}.`,
  answer: { kind: 'expression', expected: '2^n', variables: ['n'], domains: { n: { kind: 'integer', min: 1, max: 12 } } },
  solution: [
    t`The hint in the source: each weight is either in the pan or not, so each weight is a step with ${2} choices.`,
    t`By the product rule, ${math`n`} weights give ${math`${2} \times ${2} \times \cdots \times ${2} = ${2}^n`} choices.`,
    t`So the balance can show at most ${math`${2}^n`} different weights, zero included. Different choices can give the same load (with ${listOf([1, 2, 3, 6])}, both ${math`${1} + ${2} + ${3}`} and ${6} make ${6}), so the weights must be picked with care to reach that many.`,
  ],
  reference: '2^n',
  verify: () => {
    for (const n of upTo(10)) {
      const e = same(`A7 Q4(i)(c) at n = ${n}`, loads(upTo(n).map((i) => 2 ** (i - 1)), 1).size, 2 ** n);
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [
    { response: '2n', why: t`That adds ${2} for each weight. The choices are made one after another, so they multiply.` },
    { response: 'n^2', why: t`The base and the index are swapped: ${2} choices for each of ${math`n`} weights is ${math`${2}^n`}.` },
  ],
  official: { source: cite('step-f07-hints', 'Q4(i)(c)'), answer: '2^n', agrees: true },
});

const a7Five = auto({
  id: 'a7-q4-i-b',
  source: cite(A7, 'Q4(i)(b)'),
  title: t`Five weights, one pan`,
  prompt: t`With an old set of balancing scales, I can only put the weights in one of the scale pans. Find ${5} weights which let me weigh out every whole number of ounces from ${1} to ${31}. Write them separated by commas.`,
  answer: { kind: 'witness', count: 5, unordered: true, example: '1, 2, 4, 8, 16', check: (v) => weighsAll(v, 5, 31, 1) },
  solution: [
    t`Each weight is in or out, so ${5} weights give at most ${math`${2}^{${5}} = ${2 ** 5}`} loads, counting zero: exactly enough for ${0} to ${31}, with no load made twice.`,
    t`So the weights are the powers of ${2}: ${listOf([1, 2, 4, 8, 16])}. Each load is its binary number: ${31} is ${math`${16} + ${8} + ${4} + ${2} + ${1}`}.`,
    t`Count the possibilities first; when they only just fit, the structure is forced.`,
  ],
  reference: '16, 8, 4, 2, 1',
  verify: () => weighsAll([1n, 2n, 4n, 8n, 16n].map((n) => ({ num: n, den: 1n })), 5, 31, 1),
  misconceptions: [{ response: '1, 2, 3, 4, 5', why: t`Those repeat loads and reach only ${math`${1} + ${2} + ${3} + ${4} + ${5} = ${15}`}. Each weight should double the range: ${listOf([1, 2, 4])}, and so on.` }],
  official: { source: cite('step-f07-hints', 'Q4(i)(b)'), answer: '1, 2, 4, 8, 16', agrees: true },
  nudge: t`Not quite. Each weight is either in or out; count how many loads ${5} weights could make at most.`,
  hints: [
    t`With each weight in the pan or out, how many different selections do ${5} weights give?`,
    t`For every load from ${1} to ${31} to appear, can any two selections give the same load?`,
    t`Which choice of weights makes every selection give a different total?`,
  ],
});

const a7TwoPans = auto({
  id: 'a7-q4-ii-a',
  source: cite(A7, 'Q4(ii)(a)'),
  title: t`Two weights, two pans`,
  prompt: t`Now I can put the weights in either of the scale pans. Which two weights do I need to weigh ${1}, ${2}, ${3}, and ${4} ounces?`,
  answer: { kind: 'witness', count: 2, unordered: true, example: '1, 3', check: (v) => weighsAll(v, 2, 4, 2) },
  solution: [
    t`With ${1} and ${3}: ${1} and ${3} alone, ${math`${1} + ${3} = ${4}`} in the same pan, and ${math`${3} - ${1} = ${2}`} with the ${1} in the pan with the load.`,
    t`A weight beside the load subtracts: two pans give differences as well as sums.`,
  ],
  reference: '3, 1',
  verify: () => weighsAll([{ num: 1n, den: 1n }, { num: 3n, den: 1n }], 2, 4, 2),
  misconceptions: [{ response: '1, 2', why: t`With ${1} and ${2} the largest load is ${3}. Use the second pan: a ${3} with the ${1} on either side gives ${2} and ${4}.` }],
  official: { source: cite('step-f07-hints', 'Q4(ii)(a)'), answer: '1, 3', agrees: true },
  nudge: t`Not quite. A weight in the same pan as the load subtracts, so a difference of two weights is available too.`,
  hints: [
    t`With weights in both pans, which loads can two weights ${math`a`} and ${math`b`} measure?`,
    t`Which of those loads must equal ${1}, ${2}, ${3}, and ${4}?`,
    t`Which pair ${math`a < b`} makes ${math`\{a, b, b - a, a + b\}`} the set of those four loads?`,
  ],
});

const a7Forty = auto({
  id: 'a7-q4-ii-c',
  source: cite(A7, 'Q4(ii)(c)'),
  title: t`Four weights up to ${40}`,
  prompt: t`With weights allowed in either pan, find ${4} weights which enable me to measure every whole number of ounces from ${1} to ${40}.`,
  answer: { kind: 'witness', count: 4, unordered: true, example: '1, 3, 9, 27', check: (v) => weighsAll(v, 4, 40, 2) },
  solution: [
    t`Each weight has ${3} positions (left, right, out), so ${4} weights have ${math`${3}^{${4}} = ${81}`} placements. Leave out the empty one and pair each placement with its mirror image: at most ${math`\frac{${81} - ${1}}{${2}} = ${40}`} loads.`,
    t`The powers of ${3} reach all of them: ${listOf([1, 3, 9, 27])}, which total ${40}.`,
    t`Count the placements, halve for mirror images, and choose weights so that no two placements agree.`,
  ],
  reference: '1, 3, 9, 27',
  verify: () => weighsAll([1n, 3n, 9n, 27n].map((n) => ({ num: n, den: 1n })), 4, 40, 2),
  misconceptions: [{ response: '1, 2, 4, 8', why: t`Powers of ${2} reach only ${15}, even with two pans. With weights on both sides each weight has ${3} positions, so use powers of ${3}.` }],
  official: { source: cite('step-f07-hints', 'Q4(ii)(c)'), answer: '1, 3, 9, 27', agrees: true },
  nudge: t`Not quite. Each weight now has three positions; count how many different loads ${4} weights could make at most.`,
  hints: [
    t`How many positions does each weight have when both pans can be used?`,
    t`How many placements do ${4} weights have, and at most how many different positive loads, pairing each placement with its mirror image?`,
    t`Which choice of weights makes every placement give a different load, so that none is wasted?`,
  ],
});

const a7ThreeWays = auto({
  id: 'a7-q4-ii-b-count',
  source: cite(A7, 'Q4(ii)(b)', true),
  title: t`Each weight left, right, or out`,
  prompt: t`With ${math`n`} weights and two pans, each weight goes in the left pan, in the right pan, or in neither. How many ways are there to place the weights? Give an expression in ${math`n`}.`,
  answer: { kind: 'expression', expected: '3^n', variables: ['n'], domains: { n: { kind: 'integer', min: 1, max: 10 } } },
  solution: [
    t`Each weight is a step with ${3} choices, so by the product rule there are ${math`${3}^n`} placements.`,
    t`That bounds the loads by ${math`${3}^n`}, zero included. The hints go further: leave out the empty placement and pair each placement with its mirror image, which weighs the same, to get at most ${math`\frac{${3}^n - ${1}}{${2}}`} loads.`,
    t`${math`n`} independent steps with ${math`k`} choices each give ${math`k^{n}`} outcomes.`,
  ],
  reference: '3^n',
  verify: () => {
    for (const n of upTo(6)) {
      const e = same(`A7 Q4(ii)(b) placements at n = ${n}`, 3 ** n, loads(upTo(n).map((i) => 3 ** (i - 1)), 2).size);
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [{ response: '2^n', why: t`That is one pan. With two pans each weight has ${3} positions: left, right, or out.` }],
  official: { source: cite('step-f07-hints', 'Q4(ii)(b)'), answer: '3^n', agrees: true },
  nudge: t`Not quite. With two pans, each weight has three possible positions, not two.`,
  hints: [
    t`How many positions can one weight take?`,
    t`Are the choices for different weights independent of each other?`,
    t`What does the product rule give for ${math`n`} weights?`,
  ],
});

// ---------------------------------------------------------------- lesson

const shirts = ['red', 'blue', 'green'];
const trousers = ['jeans', 'shorts'];
const [mAB, mA, mB] = [math`A \times B`, math`A`, math`B`];

export const productRule: TopicContent = {
  topicId: 'pre.product-rule',
  goal: t`Count the outcomes of a sequence of choices by multiplying the number of options at each step.`,
  objective: t`Count a sequence of choices by multiplying the number of options at each step.`,
  why: t`Almost every count in combinatorics and probability is built from this rule, starting with arrangements.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`How many outfits?` },
    { kind: 'hook', text: t`You own ${shirts.length} shirts and ${trousers.length} pairs of trousers. How many different outfits can you wear? You could list them. But what if you owned ${30} shirts and ${20} pairs of trousers? There must be a way to count without listing.` },
    { kind: 'narrative', text: t`Start small and list them anyway, in an organised way: one row for each shirt, and in each row, that shirt with every pair of trousers.` },
    {
      kind: 'table', caption: t`Every outfit: ${shirts.length} rows of ${trousers.length}.`,
      head: [t`shirt`, ...trousers.map((x) => t`${x}`)],
      rows: shirts.map((s) => [t`${s}`, ...trousers.map((x) => t`${s} and ${x}`)]),
    },
    { kind: 'narrative', text: t`The table is a rectangle: ${shirts.length} rows, each with ${trousers.length} entries, so ${math`${shirts.length} \times ${trousers.length} = ${shirts.length * trousers.length}`} outfits. Nothing in that argument cared that there were ${shirts.length} shirts. With ${30} shirts and ${20} pairs of trousers it would be ${30} rows of ${20}, so ${30 * 20} outfits.` },
    { kind: 'section', title: t`The rule, stated precisely` },
    { kind: 'narrative', text: t`An outfit is a pair: first a shirt, then a pair of trousers. Order matters in the sense that the first entry is always the shirt. Mathematicians call such a thing an ordered pair, and the set of all of them has a name.` },
    {
      kind: 'definition',
      name: t`Cartesian product`,
      formal: t`For sets ${mA} and ${mB}, the Cartesian product is ${dmath`A \times B = \{(a, b) : a \in A,\ b \in B\},`} the set of ordered pairs whose first entry is in ${mA} and whose second is in ${mB}.`,
      plain: t`In plain words: every way of choosing one thing from ${mA} and then one thing from ${mB}. With ${mA} the shirts and ${mB} the trousers, ${mAB} is the set of outfits, and (red, jeans) is one of them.`,
    },
    { kind: 'theorem', statement: t`If ${mA} and ${mB} are finite sets, then ${math`\lvert A \times B \rvert = \lvert A \rvert \times \lvert B \rvert`}, where ${math`\lvert A \rvert`} is the number of elements of ${mA}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Group by the first entry`, text: t`For each ${math`a \in A`}, let ${math`R_{a} = \{(a, b) : b \in B\}`}, the row of pairs that start with ${math`a`}.`, plain: t`One row of the table for each shirt.` },
        { label: t`Each row has the same size`, text: t`The map ${math`b \mapsto (a, b)`} matches the elements of ${mB} one to one with the pairs in ${math`R_{a}`}, so ${math`\lvert R_{a} \rvert = \lvert B \rvert`}.`, plain: t`Each shirt goes with every pair of trousers exactly once.` },
        { label: t`The rows split the product`, text: t`Every pair ${math`(a, b) \in A \times B`} lies in exactly one row, namely ${math`R_{a}`}.`, plain: t`No outfit is in two rows, and none is missed.` },
        { label: t`Add up the rows`, text: t`So ${mAB} is ${math`\lvert A \rvert`} rows of ${math`\lvert B \rvert`} elements each:`, eq: [dmath`\lvert A \times B \rvert = \underbrace{\lvert B \rvert + \cdots + \lvert B \rvert}_{\lvert A \rvert \text{ times}} = \lvert A \rvert \times \lvert B \rvert.`] },
      ],
    },
    { kind: 'narrative', text: t`Real counting problems rarely hand you two fixed sets. Often the second choice depends on the first: once Claire has placed one letter of her name, that place is gone. What survives is the number of options. That gives the form of the rule you will use most.` },
    {
      kind: 'theorem',
      name: t`The product rule`,
      statement: t`Suppose a choice is made in ${math`k`} steps, and, whatever happened at the earlier steps, step ${math`i`} can be done in exactly ${math`n_{i}`} ways. Then the whole choice can be made in ${math`n_{${1}} \times n_{${2}} \times \cdots \times n_{k}`} ways.`,
    },
    {
      kind: 'p',
      text: t`This is the [[product-rule|product rule]]. Each finished sequence of choices is one [[outcome|outcome]]. It follows from the theorem above by grouping the outcomes by their first step: there are ${math`n_{${1}}`} groups, each holding the same number of ways to finish, and you repeat the argument for the steps that remain.`,
      why: { q: t`Why must the number of options not depend on earlier steps?`, a: t`Because the proof needs every row to have the same length. If the second step had ${2} options after one first choice and ${5} after another, the rows would differ and you would have to add them, ${math`${2} + ${5}`}, rather than multiply.` },
    },
    { kind: 'section', title: t`Codes and restricted digits` },
    { kind: 'narrative', text: t`Codes are the cleanest case. A code of ${3} letters from the ${26} letters of the alphabet, repeats allowed, is a choice in ${3} steps with ${26} options each time.` },
    { kind: 'rule', text: t`${dmath`${26} \times ${26} \times ${26} = ${26}^{${3}} = ${26 ** 3}.`}` },
    checkFrom(codes, { n: 10, k: 4, what: 'pin' }, t`Each of the ${4} positions has ${10} choices whatever the others show: ${math`${10}^{${4}} = ${10 ** 4}`}.`),
    { kind: 'narrative', text: t`Restrictions change the number of options at a step, not the rule. A ${3}-digit whole number cannot start with ${0}, because then it would really be a ${2}-digit number.` },
    {
      kind: 'steps',
      steps: [
        { label: t`First digit`, text: t`Any of ${1} to ${9}: ${9} options.` },
        { label: t`Second and third digits`, text: t`Any of ${0} to ${9}: ${10} options each, whatever came before.` },
        { label: t`Multiply`, text: t`By the product rule,`, eq: [dmath`${9} \times ${10} \times ${10} = ${9 * 10 * 10}.`], plain: t`A check: these are the numbers from ${10 ** 2} to ${10 ** 3 - 1}, and there are ${10 ** 3 - 1 - 10 ** 2 + 1} of those.` },
      ],
    },
    { kind: 'section', title: t`Arrangements and yes or no choices` },
    { kind: 'narrative', text: t`In STEP Support Assignment ${6}, Claire arranges the ${6} different letters of her name. Think of it as filling ${6} places one letter at a time. The first letter has ${6} places to go; whichever it took, the second has ${5} left; then ${4}, and so on. The options shrink, but at each step their number is the same whatever happened before, so the product rule applies.` },
    { kind: 'rule', text: t`${dmath`${6} \times ${5} \times ${4} \times ${3} \times ${2} \times ${1} = ${factorial(6)}.`}` },
    { kind: 'narrative', text: t`A step can also be a yes or no question. With ${3} weights for a one-pan balance, each weight is either in the pan or not: ${2} options, three times, so ${math`${2}^{${3}} = ${2 ** 3}`} selections, from the empty pan to all three. Whatever the weights are, they can show at most ${2 ** 3} different loads. That one count is the heart of Bachet's weights in STEP Support Assignment ${7}.` },
    { kind: 'pitfall', claim: t`A meal is one dish from ${4} soups or ${3} salads, so there are ${math`${4} \times ${3} = ${4 * 3}`} meals.`, counterexample: t`You choose one dish, either a soup or a salad, not one of each. That is ${math`${4} + ${3} = ${4 + 3}`} meals. Multiply when you choose this and then that; add when you choose this or that.` },
    { kind: 'pitfall', claim: t`A PIN of ${4} digits has ${math`${10} \times ${4} = ${40}`} possibilities.`, counterexample: t`That adds ${10} options four times over. Each choice of the first digit goes with every choice of the others, so it is ${math`${10}^{${4}} = ${10 ** 4}`}.` },
    { kind: 'takeaway', text: t`If each step has a fixed number of options whatever came before, the number of outcomes is the product of those numbers.` },
  ],
  examples: [
    worked(menu, { s: 3, m: 4, d: 2 }, t`Meals from a menu`),
    workedCambridge(a6Claire),
    workedCambridge(a7InOut),
    worked(wholeNumbers, { k: 3, rule: 'odd' }, t`Odd three digit numbers`),
  ],
  generators: [menu, codes, wholeNumbers, weighings, bachet],
  cambridge: withUses([a7Five, a7TwoPans, a7Forty, a7ThreeWays], {
    'a7-q4-ii-c': { sections: ['The rule, stated precisely'], note: t`Choosing weights so every load from one up is reachable` },
  }),
  // The four weights to 40. The two counting bounds and the unique three-weight choice are written proofs,
  // so they are set in proof.direct, the first topic that teaches writing one (Rule 1, 2026-10-08). The 3^n count and the
  // powers of two to 31 are one step each, and Q4(ii)(a) (the weights 1 and 3) is too slight to gate.
  gate: ['a7-q4-ii-c'],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['product-rule', 'outcome'],
  recall: [
    { front: t`State the product rule.`, back: t`If step ${math`i`} of a ${math`k`}-step choice can always be done in ${math`n_{i}`} ways, whatever came before, there are ${math`n_{${1}} \times \cdots \times n_{k}`} outcomes.` },
    { front: t`What is ${math`\lvert A \times B \rvert`} for finite sets?`, back: t`${math`\lvert A \rvert \times \lvert B \rvert`}.` },
    { front: t`How many selections can be made from ${math`n`} objects, each in or out?`, back: t`${math`${2}^{n}`}, two options for each object.` },
    { front: t`When do you add counts instead of multiplying?`, back: t`When you make one choice or another (one dish, a soup or a salad), not one and then another.` },
  ],
  proofOrder: [
    {
      title: t`Why ${math`\lvert A \times B \rvert = \lvert A \rvert \times \lvert B \rvert`}`,
      steps: [
        t`Group the pairs into rows by their first entry ${math`a`}.`,
        t`Each row matches ${mB} one to one, so it has ${math`\lvert B \rvert`} pairs.`,
        t`Every pair lies in exactly one row.`,
        t`So there are ${math`\lvert A \rvert`} rows of ${math`\lvert B \rvert`}: ${math`\lvert A \rvert \times \lvert B \rvert`} pairs.`,
      ],
    },
  ],
};
