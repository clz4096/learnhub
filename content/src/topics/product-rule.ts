/** pre.product-rule: The product rule for counting. */
import { int, pick } from '../math';
import { generator, type Misconception } from '../problem';
import { computed, math, t } from '../rich';
import { worked, type TopicContent } from '../topic';

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
      t`Each starter can go with each main course: ${s} * ${m} = ${s * m} pairs.`,
      t`Each of those pairs can go with each dessert: ${s * m} * ${d} = ${s * m * d} meals. This is the [[product-rule|product rule]].`,
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
        t`By the [[product-rule|product rule]], multiply together ${k} factors of ${n}: ${math`${n}^${k} = ${n ** k}`}.`,
      ],
    };
  },
  solve: ({ n, k }) => String(countTuples(Array.from({ length: k }, () => n))),
  misconceptions: ({ n, k }): Misconception[] => [
    { response: String(n * k), why: t`Multiplying ${n} by ${k} adds the choices up position by position. The positions combine: each choice in one position goes with every choice in the others, so multiply together ${k} factors of ${n}.` },
    { response: String(k ** n), why: t`The base and the power are swapped. There are ${n} choices for each of ${k} positions, which is ${math`${n}^${k}`}.` },
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
        t`Multiply the choices: ${computed([9, ...middle, last].join(' * '))} = ${total}.`,
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

// ---------------------------------------------------------------- lesson

const shirts = ['red', 'blue', 'green'];
const trousers = ['jeans', 'shorts'];

export const productRule: TopicContent = {
  topicId: 'pre.product-rule',
  goal: t`Count the outcomes of a sequence of choices by multiplying the number of options at each step.`,
  lesson: [
    { kind: 'p', text: t`You have ${shirts.length} shirts and ${trousers.length} pairs of trousers. An outfit is one shirt and one pair of trousers. List them systematically: each shirt with each pair of trousers.` },
    {
      kind: 'table', caption: t`Every outfit: ${shirts.length} rows of ${trousers.length}.`,
      head: [t`shirt`, ...trousers.map((x) => t`${x}`)],
      rows: shirts.map((s) => [t`${s}`, ...trousers.map((x) => t`${s} and ${x}`)]),
    },
    { kind: 'p', text: t`The table has ${shirts.length} rows of ${trousers.length}, so ${shirts.length} * ${trousers.length} = ${shirts.length * trousers.length} outfits. Each choice is an [[outcome|outcome]] of the first step paired with an outcome of the second.` },
    { kind: 'rule', text: t`The [[product-rule|product rule]]: if a first step can be done in m ways, and then, whatever happened first, a second step can be done in n ways, the two steps together can be done in ${math`m * n`} ways. The same holds for three or more steps.` },
    { kind: 'p', text: t`Codes are a common case. A ${3}-letter code from the ${26} letters, with repeats allowed, has ${26} choices in each position: ${math`${26}^${3} = ${26 ** 3}`} codes.` },
    { kind: 'p', text: t`Watch for steps whose choices are limited. A ${3}-digit whole number cannot start with ${0}: ${9} choices first, then ${10} and ${10}, so ${9 * 10 * 10} numbers, the numbers from ${10 ** 2} to ${10 ** 3 - 1}.` },
    { kind: 'p', text: t`Multiply when you make one choice and then another (this and that). Add when you make one choice or the other: picking one meal from ${4} soups or ${3} salads gives ${4 + 3} options, not ${4 * 3}.` },
  ],
  examples: [
    worked(menu, { s: 3, m: 4, d: 2 }, t`Meals from a menu`),
    worked(codes, { n: 10, k: 4, what: 'pin' }, t`PIN codes`),
    worked(wholeNumbers, { k: 3, rule: 'odd' }, t`Odd three digit numbers`),
  ],
  generators: [menu, codes, wholeNumbers],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['product-rule', 'outcome'],
};
