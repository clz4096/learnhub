/**
 * comb.restricted-arrangements: arrangements in a line with some objects kept together
 * (glue them into one block), kept apart (place them in the gaps), or at the ends (fill
 * the ends first). From Mixed STEP 1 Statistics Q3 (six women and four men; the men in a
 * "rope"), Q4 (2009 S1 Q13: n boys, three girls, the longest run of girls), and Q5 (1995 S1
 * Q12: hockey players at the ends, together, and apart). Every answer is checked by
 * listing every set of places, and compared with the official solutions.
 */
import type { Rng } from '@learnhub/mastery';
import { auto, cite, same, supervision } from '../cambridge';
import { factorial, int, mul, pick, q, str, sub, type Rational } from '../math';
import { choose } from '../numbers';
import { generator, type Misconception } from '../problem';
import { computedTex, dmath, math, t } from '../rich';
import { checkFrom, worked, workedCambridge, type ProbabilityClaim, type TopicContent } from '../topic';
import { fraction, positions, shuffle } from '../partv-a';

const MIX = 'step-mixed-stats1' as const;
const MIXS = 'step-mixed-stats1-hints' as const;
const distinctFrom = (right: string, xs: readonly string[]): number => new Set(xs.filter((x) => x !== right)).size;
const consecutive = (ps: readonly number[]): boolean => ps.every((x, i) => i === 0 || x === (ps[i - 1] as number) + 1);
const noneAdjacent = (ps: readonly number[]): boolean => ps.every((x, i) => i === 0 || x > (ps[i - 1] as number) + 1);
/** The places of the first k labels in a random line of n, sorted. */
const placesOf = (n: number, k: number, rng: Rng): number[] => {
  const line = shuffle(n, rng);
  return line.map((who, place) => [who, place] as const).filter(([who]) => who < k).map(([, place]) => place).sort((a, b) => a - b);
};

// ---------------------------------------------------------------- kept together

interface TogP { n: number; k: number }
const togVal = ({ n, k }: TogP): Rational => q(factorial(k) * factorial(n - k + 1), factorial(n));
const togMis = ({ n, k }: TogP): string[] => [str(q(factorial(n - k + 1), factorial(n))), str(q(factorial(k) * factorial(n - k), factorial(n))), str(q(n - k + 1, n))];

const together = generator<TogP>({
  id: 'together',
  skill: 'Find the probability that k given people stand together: glue them into one block, then arrange the block inside.',
  params: (rng) => {
    for (;;) {
      const n = int(rng, 5, 9);
      const p: TogP = { n, k: int(rng, 2, Math.min(4, n - 2)) };
      if (distinctFrom(str(togVal(p)), togMis(p)) >= 2) return p;
    }
  },
  sane: ({ n, k }) => (k >= 2 && k <= n - 2 ? null : 'out of range'),
  problem: (p) => {
    const { n, k } = p;
    return {
      prompt: t`${n} people, ${k} of them friends, stand in a line in a random order, every order equally likely. What is the probability that the ${k} friends stand together?`,
      answer: { kind: 'exact', expected: str(togVal(p)) },
      solution: [
        t`Glue the friends into one block. The block and the other ${n - k} people are ${n - k + 1} things, arranged in ${math`${n - k + 1}!`} ways, and the friends can stand in ${math`${k}!`} orders inside the block.`,
        t`So ${math`\frac{${k}! \times ${n - k + 1}!}{${n}!} = \frac{${factorial(k) * factorial(n - k + 1)}}{${factorial(n)}} = ${togVal(p)}`}.`,
      ],
    };
  },
  solve: ({ n, k }) => str(fraction(positions(n, k), consecutive)),
  misconceptions: (p): Misconception[] => {
    const [a, b, c] = togMis(p);
    return [
      { response: a as string, why: t`That keeps the friends in one fixed order inside the block. They can stand in ${math`${p.k}!`} orders: multiply by it.` },
      { response: b as string, why: t`The block counts as one thing alongside the other ${p.n - p.k}, so there are ${math`${p.n - p.k + 1}!`} arrangements of the block and the rest, not ${math`${p.n - p.k}!`}.` },
      { response: c as string, why: t`That counts where the block can start but treats the rest as fixed. Count arrangements of people: block and others, then inside the block, over ${math`${p.n}!`}.` },
    ];
  },
  trial: ({ n, k }, rng) => consecutive(placesOf(n, k, rng)),
});

// ---------------------------------------------------------------- kept apart

interface ApartP { w: number; m: number }
const apartVal = ({ w, m }: ApartP): Rational => q(choose(w + 1, m), choose(w + m, m));
const apartMis = ({ w, m }: ApartP): string[] => [str(q(choose(w - 1, m), choose(w + m, m))), str(q(choose(w, m), choose(w + m, m))), str(sub(q(1), q(factorial(m) * factorial(w + 1), factorial(w + m))))];

const apart = generator<ApartP>({
  id: 'apart',
  skill: 'Find the probability that no two of a group stand next to each other: arrange the others, then choose gaps, the ends included.',
  params: (rng) => {
    for (;;) {
      const w = int(rng, 3, 7);
      const p: ApartP = { w, m: int(rng, 2, Math.min(4, w + 1)) };
      if (distinctFrom(str(apartVal(p)), apartMis(p)) >= 2) return p;
    }
  },
  sane: ({ w, m }) => (m >= 2 && m <= w + 1 ? null : 'out of range'),
  problem: (p) => {
    const { w, m } = p;
    const n = w + m;
    return {
      prompt: t`${w} women and ${m} men stand in a line in a random order, every order equally likely. What is the probability that no two men stand next to each other?`,
      answer: { kind: 'exact', expected: str(apartVal(p)) },
      solution: [
        t`Arrange the women first, in ${math`${w}!`} ways. They leave ${w + 1} gaps: ${w - 1} between them and one at each end. No two men are together exactly when the men are in different gaps.`,
        t`The men fill ${m} different gaps in ${math`${computedTex(Array.from({ length: m }, (_, i) => String(w + 1 - i)).join(' \\times '))} = ${choose(w + 1, m) * factorial(m)}`} ways, so the probability is ${math`\frac{${w}! \times ${choose(w + 1, m) * factorial(m)}}{${n}!} = \frac{\binom{${w + 1}}{${m}}}{\binom{${n}}{${m}}} = ${apartVal(p)}`}.`,
      ],
    };
  },
  solve: ({ w, m }) => str(fraction(positions(w + m, m), noneAdjacent)),
  misconceptions: (p): Misconception[] => {
    const [a, b, c] = apartMis(p);
    return [
      { response: a as string, why: t`That uses only the ${p.w - 1} gaps between women. The two ends are gaps too: there are ${p.w + 1}.` },
      { response: b as string, why: t`${p.w} women leave ${p.w + 1} gaps, not ${p.w}: one between each pair and one at each end.` },
      { response: c as string, why: t`That is ${1} minus the chance that all the men are together. "No two together" rules out every pair, not just the whole group.` },
    ];
  },
  trial: ({ w, m }, rng) => noneAdjacent(placesOf(w + m, m, rng)),
});

// ---------------------------------------------------------------- at the ends

interface EndsP { n: number; r: number; ask: 'both' | 'neither' }
const endsVal = ({ n, r, ask }: EndsP): Rational => (ask === 'both' ? q(r * (r - 1), n * (n - 1)) : q((n - r) * (n - r - 1), n * (n - 1)));
const endsMis = ({ n, r, ask }: EndsP): string[] => {
  const k = ask === 'both' ? r : n - r;
  return [str(q(k * k, n * n)), str(q(k * (k - 1), n * n)), str(sub(q(1), q(k * (k - 1), n * (n - 1))))];
};

const ends = generator<EndsP>({
  id: 'ends',
  skill: 'Find the probability of a given kind at both ends, or at neither end: fill the ends first.',
  params: (rng) => {
    for (;;) {
      const n = int(rng, 6, 12);
      const p: EndsP = { n, r: int(rng, 2, n - 2), ask: pick(rng, ['both', 'neither'] as const) };
      if (distinctFrom(str(endsVal(p)), endsMis(p)) >= 2) return p;
    }
  },
  sane: ({ n, r }) => (r >= 2 && r <= n - 2 ? null : 'out of range'),
  problem: (p) => {
    const { n, r, ask } = p;
    const k = ask === 'both' ? r : n - r;
    return {
      prompt: t`A school has ${n} pupils, of whom ${r} play hockey. All ${n} are arranged in a row at random. What is the probability that ${ask === 'both' ? t`there is a hockey player at each end` : t`neither end has a hockey player`}?`,
      answer: { kind: 'exact', expected: str(endsVal(p)) },
      solution: [
        t`Fill the ends first: ${k} choices of ${ask === 'both' ? 'hockey player' : 'pupil who does not play hockey'} for one end and ${k - 1} for the other, then ${math`${n - 2}!`} ways for the rest.`,
        t`${math`\frac{${k} \times ${k - 1} \times ${n - 2}!}{${n}!} = \frac{${k} \times ${k - 1}}{${n} \times ${n - 1}} = ${endsVal(p)}`}.`,
      ],
    };
  },
  solve: ({ n, r, ask }) => str(fraction(positions(n, r), (ps) => (ask === 'both' ? ps.includes(0) && ps.includes(n - 1) : !ps.includes(0) && !ps.includes(n - 1)))),
  misconceptions: (p): Misconception[] => {
    const [a, b, c] = endsMis(p);
    const who = p.ask === 'both' ? 'hockey player' : 'pupil who does not play hockey';
    return [
      { response: a as string, why: t`The two ends are not independent: once one end has a ${who}, one fewer is left for the other end, out of one fewer pupil.` },
      { response: b as string, why: t`The second end is filled from the ${p.n - 1} pupils left, not all ${p.n}.` },
      { response: c as string, why: t`That is the complement. The question asks for the event itself.` },
    ];
  },
  trial: ({ n, r, ask }, rng) => {
    const ps = placesOf(n, r, rng);
    return ask === 'both' ? ps.includes(0) && ps.includes(n - 1) : !ps.includes(0) && !ps.includes(n - 1);
  },
});

// ---------------------------------------------------------------- Cambridge problems: six women and four men

/** The places of the 4 men among 10, every set equally likely: each event as a predicate on them. */
const MEN = positions(10, 4);
const womenOf = (men: readonly number[]): number[] => Array.from({ length: 10 }, (_, i) => i).filter((i) => !men.includes(i));
const exact = (expected: Rational, pred: (men: readonly number[]) => boolean, what: string) => () => same(`${what}, every set of places for the men`, str(fraction(MEN, pred)), str(expected));

const q3vi = auto({
  id: 'mixed-q3-vi',
  source: cite(MIX, 'Q3(vi)'),
  title: t`No two men together`,
  prompt: t`${6} women and ${4} men stand in a line in a random order. Find the probability that no two men stand together, by first arranging the women and then slotting the men into the gaps.`,
  answer: { kind: 'exact', expected: str(q(1, 6)) },
  solution: [
    t`Arrange the ${6} women: ${math`${6}!`} ways. That leaves ${7} gaps, one before each woman and one at the end.`,
    t`The first man has ${7} gaps, the second ${6}, and so on: ${math`${7} \times ${6} \times ${5} \times ${4}`} ways. Once a man fills a gap, it is no longer a gap, so no two men share one.`,
    t`${math`P = \frac{${6}! \times ${7} \times ${6} \times ${5} \times ${4}}{${10}!} = \frac{${7} \times ${6} \times ${5} \times ${4}}{${10} \times ${9} \times ${8} \times ${7}} = ${q(1, 6)}`}.`,
  ],
  reference: '1/6',
  verify: exact(q(1, 6), noneAdjacent, 'no two men together'),
  misconceptions: [{ response: str(q(5 * 4 * 3 * 2, 10 * 9 * 8 * 7)), why: t`That uses only the ${5} gaps between women. The two ends are gaps too, ${7} in all.` }],
  official: { source: cite(MIXS, 'Q3(vi)'), answer: '1/6', agrees: true },
});

const q3iiid = auto({
  id: 'mixed-q3-iii-d',
  source: cite(MIX, 'Q3(iii)', true),
  title: t`The men in a rope`,
  prompt: t`${6} women and ${4} men stand in a line in a random order. The men stand together inside a rope, which counts as one "person". Find the probability that all ${4} men stand together.`,
  answer: { kind: 'exact', expected: str(q(1, 30)) },
  solution: [
    t`The rope and the ${6} women are ${7} "people": ${math`${7}!`} orders. Inside the rope the men stand in ${math`${4}!`} orders.`,
    t`${math`\frac{${7}! \times ${4}!}{${10}!} = \frac{${4} \times ${3} \times ${2} \times ${1}}{${10} \times ${9} \times ${8}} = ${q(1, 30)}`}.`,
  ],
  reference: '1/30',
  verify: exact(q(1, 30), consecutive, 'the men together'),
  misconceptions: [{ response: str(q(factorial(7), factorial(10))), why: t`The men can stand in ${math`${4}!`} orders inside the rope: multiply by it.` }],
  official: { source: cite(MIXS, 'Q3(iii)(d)'), answer: '1/30', agrees: true },
});

const q3iv = auto({
  id: 'mixed-q3-iv',
  source: cite(MIX, 'Q3(iv)'),
  title: t`All the women together`,
  prompt: t`${6} women and ${4} men stand in a line in a random order. What is the probability that all the women (but not necessarily the men) stand together?`,
  answer: { kind: 'exact', expected: str(q(1, 42)) },
  solution: [
    t`Rope the women: with the ${4} men that is ${5} "people", ${math`${5}!`} orders, and ${math`${6}!`} orders inside the rope.`,
    t`${math`\frac{${5}! \times ${6}!}{${10}!} = ${q(1, 42)}`}, less likely than the men together, since more people must bunch up.`,
  ],
  reference: '1/42',
  verify: exact(q(1, 42), (men) => consecutive(womenOf(men)), 'the women together'),
  misconceptions: [{ response: str(q(1, 30)), why: t`That is the men together. With ${6} women in the rope, there are ${5} "people" outside it, not ${7}.` }],
  official: { source: cite(MIXS, 'Q3(iv)'), answer: '1/42', agrees: true },
});

const q3v = auto({
  id: 'mixed-q3-v',
  source: cite(MIX, 'Q3(v)'),
  title: t`Men together and women together`,
  prompt: t`${6} women and ${4} men stand in a line in a random order. What is the probability that all the men stand together and all the women stand together?`,
  answer: { kind: 'exact', expected: str(q(1, 105)) },
  solution: [
    t`Two ropes: ${math`${6}!`} orders of the women inside theirs, ${math`${4}!`} of the men inside theirs, and ${2} orders of the two ropes.`,
    t`${math`\frac{${2} \times ${6}! \times ${4}!}{${10}!} = ${q(1, 105)}`}. This is not ${math`${q(1, 30)} \times ${q(1, 42)}`}: the events are not independent, since once the men are together the women are much more likely to be.`,
  ],
  reference: '1/105',
  verify: exact(q(1, 105), (men) => consecutive(men) && consecutive(womenOf(men)), 'both together'),
  misconceptions: [{ response: str(mul(q(1, 30), q(1, 42))), why: t`The events are not independent, so their probabilities do not multiply. Count the arrangements with both ropes.` }],
  official: { source: cite(MIXS, 'Q3(v)'), answer: '1/105', agrees: true },
});

const q3vii = auto({
  id: 'mixed-q3-vii',
  source: cite(MIX, 'Q3(vii)'),
  title: t`A woman at each end`,
  prompt: t`${6} women and ${4} men stand in a line in a random order. Find the probability that there is a woman at each end of the line.`,
  answer: { kind: 'exact', expected: str(q(1, 3)) },
  solution: [
    t`Choose the two women for the ends: ${6} for the first end, then ${5} for the other. Then arrange the ${8} people left: ${math`${8}!`} ways.`,
    t`${math`\frac{${6} \times ${5} \times ${8}!}{${10}!} = \frac{${6} \times ${5}}{${10} \times ${9}} = ${q(1, 3)}`}.`,
  ],
  reference: '1/3',
  verify: exact(q(1, 3), (men) => !men.includes(0) && !men.includes(9), 'women at both ends'),
  misconceptions: [{ response: str(q(9, 25)), why: t`${math`\left(${q(6, 10)}\right)^{${2}}`} treats the ends as independent. After a woman takes one end, ${5} women are left among ${9} people.` }],
  official: { source: cite(MIXS, 'Q3(vii)(c)'), answer: '1/3', agrees: true },
});

// Q4 and Q5: general n.
const N_DOM = { n: { kind: 'integer' as const, min: 0, max: 20 } };
const q4i = auto({
  id: 'mixed-q4-i',
  source: cite(MIX, 'Q4(i)'),
  title: t`Three girls all together`,
  prompt: t`I seat ${math`n`} boys and ${3} girls in a line at random, so that each order of the ${math`n + ${3}`} children is equally likely. ${math`K`} is the largest number of girls sitting next to each other. Find ${math`P(K = ${3})`} in terms of ${math`n`}.`,
  answer: { kind: 'expression', expected: '6/((n + 2)(n + 3))', variables: ['n'], domains: N_DOM },
  solution: [
    t`${math`K = ${3}`} means all three girls are together. Rope them: ${math`${3}!`} orders inside, and ${math`(n + ${1})!`} orders of the rope and the ${math`n`} boys.`,
    t`${math`P(K = ${3}) = \frac{${3}! \, (n + ${1})!}{(n + ${3})!} = \frac{${6}}{(n + ${2})(n + ${3})}`}.`,
  ],
  reference: '6/((n + 2)(n + 3))',
  verify: () => {
    for (let n = 0; n <= 8; n++) {
      const e = same(`n = ${n}`, str(fraction(positions(n + 3, 3), consecutive)), str(q(6, (n + 2) * (n + 3))));
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [{ response: '1/((n + 2)(n + 3))', why: t`The girls can sit in ${math`${3}! = ${6}`} orders inside the rope.` }],
  official: { source: cite(MIXS, 'Q4(i)'), answer: '6/((n + 3)(n + 2))', agrees: true },
});

const NR_DOM = { n: { kind: 'integer' as const, min: 2, max: 11 }, r: { kind: 'integer' as const, min: 2, max: 11 } };
const q5i = auto({
  id: 'mixed-q5-i',
  source: cite(MIX, 'Q5(i)'),
  title: t`A hockey player at each end`,
  prompt: t`A school has ${math`n`} pupils, of whom ${math`r`} play hockey, where ${math`n \ge r \ge ${2}`}. All ${math`n`} pupils are arranged in a row at random. What is the probability that there is a hockey player at each end of the row?`,
  answer: { kind: 'expression', expected: 'r(r - 1)/(n(n - 1))', variables: ['n', 'r'], domains: NR_DOM },
  solution: [
    t`${math`r`} choices of hockey player for one end, ${math`r - ${1}`} for the other, then ${math`(n - ${2})!`} for the rest.`,
    t`${math`\frac{r(r - ${1})(n - ${2})!}{n!} = \frac{r(r - ${1})}{n(n - ${1})}`}.`,
  ],
  reference: 'r(r - 1)/(n(n - 1))',
  verify: () => {
    for (let n = 2; n <= 9; n++) for (let r = 2; r <= n; r++) {
      const e = same(`n = ${n}, r = ${r}`, str(fraction(positions(n, r), (ps) => ps.includes(0) && ps.includes(n - 1))), str(q(r * (r - 1), n * (n - 1))));
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [{ response: 'r^2/n^2', why: t`The ends are filled one after the other, from one fewer hockey player and one fewer pupil.` }],
  official: { source: cite(MIXS, 'Q5(i)'), answer: 'r(r - 1)/(n(n - 1))', agrees: true },
});

const q5ii = auto({
  id: 'mixed-q5-ii',
  source: cite(MIX, 'Q5(ii)'),
  title: t`All the hockey players together`,
  prompt: t`With ${math`n`} pupils, ${math`r`} of them hockey players, arranged in a row at random, what is the probability that all the hockey players stand together? Use ${math`!`} for factorials.`,
  answer: { kind: 'expression', expected: 'r! (n - r + 1)!/n!', variables: ['n', 'r'], domains: NR_DOM },
  solution: [
    t`Rope the hockey players: ${math`r!`} orders inside the rope, and ${math`(n - r + ${1})!`} orders of the rope and the ${math`n - r`} others.`,
    t`${math`\frac{r! \, (n - r + ${1})!}{n!}`}, which is also ${math`\frac{n - r + ${1}}{\binom{n}{r}}`}: ${math`n - r + ${1}`} blocks of places out of ${math`\binom{n}{r}`} sets of places.`,
  ],
  reference: 'r! (n - r + 1)!/n!',
  verify: () => {
    for (let n = 2; n <= 9; n++) for (let r = 2; r <= n; r++) {
      const e = same(`n = ${n}, r = ${r}`, str(fraction(positions(n, r), consecutive)), str(q(factorial(r) * factorial(n - r + 1), factorial(n))));
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [{ response: '(n - r + 1)!/n!', why: t`The hockey players can stand in ${math`r!`} orders inside the rope.` }],
  official: { source: cite(MIXS, 'Q5(ii)'), answer: 'r! (n - r + 1)!/n!', agrees: true },
});

const q4ii = supervision({
  id: 'mixed-q4-ii',
  source: cite(MIX, 'Q4(ii)'),
  title: t`The girls all apart`,
  prompt: t`With ${math`n`} boys and ${3} girls seated at random, show that ${math`P(K = ${1}) = \frac{n(n - ${1})}{(n + ${2})(n + ${3})}`}. Explain where the gaps come from, and check the formula for ${math`n = ${1}`}.`,
  writeUp: 'proof',
  official: cite(MIXS, 'Q4(ii)'),
});
const q5iii = supervision({
  id: 'mixed-q5-iii',
  source: cite(MIX, 'Q5(iii)'),
  title: t`No two hockey players together`,
  prompt: t`By considering the gaps between the non-hockey-players, find the probability that no two of the ${math`r`} hockey players stand together, distinguishing between the cases when the probability is zero and when it is not. For which ${math`n`} and ${math`r`} is it zero, and why?`,
  writeUp: 'proof',
  official: cite(MIXS, 'Q5(iii)'),
});
const q3why = supervision({
  id: 'mixed-q3-v-why',
  source: cite(MIX, 'Q3(v)'),
  title: t`Why the two answers do not multiply`,
  prompt: t`The question notes that the probability that the men are together and the women are together is not the product of the two separate probabilities, ${q(1, 30)} and ${q(1, 42)}. Explain why, by finding the probability that the women are together given that the men are, and comparing it with ${q(1, 42)}.`,
  writeUp: 'explanation',
  official: cite(MIXS, 'Q3(v)'),
});

// ---------------------------------------------------------------- lesson

/** The shelf in the lesson: red books and blue books, all different. */
const SHELF = { red: 4, blue: 3 };
const nShelf = SHELF.red + SHELF.blue;
const pTogether = q(factorial(SHELF.blue) * factorial(SHELF.red + 1), factorial(nShelf));
const apartWays = factorial(SHELF.red + 1) / factorial(SHELF.red + 1 - SHELF.blue);
const pApart = q(factorial(SHELF.red) * apartWays, factorial(nShelf));
const pEnds = q(SHELF.red * (SHELF.red - 1) * factorial(nShelf - 2), factorial(nShelf));
const claims: ProbabilityClaim[] = [
  { what: 'four red and three blue books: the blue books together', exact: pTogether, trial: (rng) => consecutive(placesOf(nShelf, SHELF.blue, rng)) },
  { what: 'four red and three blue books: no two blue books together', exact: pApart, trial: (rng) => noneAdjacent(placesOf(nShelf, SHELF.blue, rng)) },
  { what: 'four red and three blue books: a red book at each end', exact: pEnds, trial: (rng) => { const blue = placesOf(nShelf, SHELF.blue, rng); return !blue.includes(0) && !blue.includes(nShelf - 1); } },
];
const [mk, mn, mw, mm] = [math`k`, math`n`, math`w`, math`m`];

export const restrictedArrangements: TopicContent = {
  topicId: 'comb.restricted-arrangements',
  goal: t`Count arrangements in a line with some objects kept together, kept apart, or at the ends, and turn the counts into probabilities.`,
  objective: t`Count line-ups with some objects kept together, kept apart, or at the ends, and find the probabilities.`,
  why: t`These three moves answer most STEP arrangement questions, and they feed probability problems on runs.`,
  minutes: 30,
  lesson: [
    { kind: 'section', title: t`Three kinds of rule` },
    { kind: 'hook', text: t`${SHELF.red} red books and ${SHELF.blue} blue books, all different, go on a shelf in a random order. What is the chance the blue books end up side by side? That none of them touch? That both ends are red? Listing all ${math`${nShelf}! = ${factorial(nShelf)}`} orders is hopeless. Each question has its own trick.` },
    { kind: 'narrative', text: t`Mixed STEP ${1} Statistics notes that these questions are on the STEP specification but not in A-level mathematics, so they reward a clear method. There are three, one for each kind of rule: together, apart, and at the ends. Every order of the ${nShelf} books is equally likely, so each probability is a count of good orders over ${math`${nShelf}!`}.` },
    { kind: 'section', title: t`Kept together: glue them` },
    { kind: 'narrative', text: t`If the blue books must be side by side, tie them together with string and treat the bundle as one big book. Now there are ${SHELF.red} red books and ${1} bundle, ${SHELF.red + 1} things to arrange. Then untie the bundle: the blue books inside can be in any order.` },
    {
      kind: 'theorem',
      name: t`Block method`,
      statement: t`Among the ${math`n!`} orders of ${mn} different objects, the number in which ${mk} given objects stand together is ${math`k!\,(n - k + ${1})!`}, for ${math`${1} \le k \le n`}.`,
    },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Glue`, text: t`Replace the ${mk} objects by one block. An order with them together is the same as an order of the block and the other ${math`n - k`} objects, together with an order inside the block.`, plain: t`Reading along the shelf, the block is where the ${mk} objects sit, and inside it they come in some order.` },
        { label: t`Arrange the outside`, text: t`The block and the others are ${math`n - k + ${1}`} different things: ${math`(n - k + ${1})!`} orders.` },
        { label: t`Arrange the inside`, text: t`The ${mk} objects inside the block: ${math`k!`} orders, whatever the outside order was.` },
        { label: t`Multiply`, text: t`By the product rule, ${math`k!\,(n - k + ${1})!`} orders. Different choices give different shelves, and every shelf with the ${mk} together arises once.` },
      ],
    },
    { kind: 'p', text: t`This is the [[block-method|block method]]. For the shelf: ${math`\frac{${SHELF.blue}! \times ${SHELF.red + 1}!}{${nShelf}!} = \frac{${factorial(SHELF.blue) * factorial(SHELF.red + 1)}}{${factorial(nShelf)}} = ${pTogether}`}. Mixed STEP ${1} Statistics calls the block a rope around the men.` },
    checkFrom(together, { n: 6, k: 2 }, t`Glue the two friends: ${5} things in ${math`${5}!`} orders, times ${math`${2}!`} inside, over ${math`${6}!`}: ${math`\frac{${2} \times ${120}}{${720}} = ${q(1, 3)}`}.`),
    { kind: 'section', title: t`Kept apart: use the gaps` },
    { kind: 'narrative', text: t`Now no two blue books may touch. Gluing does not help. Instead, put the red books down first, in any order, with space around them: _ R _ R _ R _ R _. There are ${SHELF.red + 1} gaps, counting the two ends. Blue books in different gaps can never touch, and blue books in the same gap always do.` },
    {
      kind: 'theorem',
      name: t`Gap method`,
      statement: t`Among the orders of ${mw} objects of one kind and ${mm} of another, all different, the number with no two of the ${mm} next to each other is ${math`w! \times (w + ${1})(w)\cdots(w - m + ${2})`}, which is ${0} when ${math`m > w + ${1}`}.`,
    },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Place the others`, text: t`Arrange the ${mw} objects: ${math`w!`} orders. They leave ${math`w + ${1}`} gaps: one before each, and one at the end.` },
        { label: t`Use different gaps`, text: t`No two of the ${mm} are adjacent exactly when they go into ${mm} different gaps, at most one per gap.`, why: { q: t`Why does one per gap guarantee they never touch?`, a: t`Between two different gaps there is at least one of the ${mw} objects, so two objects in different gaps are separated. Two in the same gap would be next to each other.` } },
        { label: t`Fill the gaps in order`, text: t`The first of the ${mm} has ${math`w + ${1}`} gaps to choose, the next ${math`w`}, and so on: ${math`(w + ${1})(w)\cdots(w - m + ${2})`} ways, ${mm} factors.` },
        { label: t`Multiply`, text: t`By the product rule, the total is ${math`w!`} times that product. If ${math`m > w + ${1}`}, some factor is ${0}: there are not enough gaps.` },
      ],
    },
    { kind: 'p', text: t`This is the [[gap-method|gap method]]. For the shelf: ${math`${SHELF.red}! \times ${SHELF.red + 1} \times ${SHELF.red} \times ${SHELF.red - 1} = ${factorial(SHELF.red) * apartWays}`} good orders, so the probability is ${math`\frac{${factorial(SHELF.red) * apartWays}}{${factorial(nShelf)}} = ${pApart}`}.` },
    checkFrom(apart, { w: 5, m: 2 }, t`${5} women leave ${6} gaps. Only the places matter for the probability: the men take ${2} of the ${7} places, ${math`\binom{${7}}{${2}} = ${21}`} ways, and ${math`\binom{${6}}{${2}} = ${15}`} of those use different gaps, so ${q(15, 21)}.`),
    { kind: 'pitfall', claim: t`"No two blue books together" is the complement of "all blue books together", so its probability is ${math`${1} - ${pTogether}`}.`, counterexample: t`The complement of "all together" is "not all together", which includes shelves with two blue books touching and one apart. The true answer is ${pApart}, not ${math`${1} - ${pTogether} = ${sub(q(1), pTogether)}`}.` },
    { kind: 'section', title: t`At the ends: fill them first` },
    { kind: 'narrative', text: t`For a red book at each end, deal with the restricted places before the free ones. The left end takes any of the ${SHELF.red} red books, the right end any of the remaining ${SHELF.red - 1}, and the other ${nShelf - 2} books fill the middle in ${math`${nShelf - 2}!`} ways.` },
    { kind: 'rule', text: t`${dmath`P(\text{red at both ends}) = \frac{${SHELF.red} \times ${SHELF.red - 1} \times ${nShelf - 2}!}{${nShelf}!} = \frac{${SHELF.red} \times ${SHELF.red - 1}}{${nShelf} \times ${nShelf - 1}} = ${pEnds}.`}` },
    { kind: 'p', text: t`Filling the most restricted places first keeps the count a simple product, because the free places come last and never run out.` },
    { kind: 'pitfall', claim: t`With the red books together and the blue books together, the probability is the product of the two separate probabilities.`, counterexample: t`The events are not independent: once the blue books form one block, the red books are already more likely to be together. Mixed STEP ${1} Statistics, question ${3}, asks you to check this with ${6} women and ${4} men.` },
    { kind: 'takeaway', text: t`Together: glue into a block. Apart: place the others, then use the gaps. Ends: fill the restricted places first.` },
  ],
  examples: [
    workedCambridge(q3vi),
    worked(together, { n: 7, k: 3 }, t`Three friends together in a line of seven`),
    worked(ends, { n: 8, r: 3, ask: 'both' }, t`Hockey players at both ends`),
  ],
  generators: [together, apart, ends],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['block-method', 'gap-method'],
  claims,
  cambridge: [q3iiid, q3iv, q3v, q3vii, q4i, q5i, q5ii, q4ii, q5iii, q3why],
  // Best first: the full STEP parts in letters (1995 S1 Q12 by gaps with its zero case, 2009
  // S1 Q13), then the dependence question and the numerical parts. The guided rope count
  // (Q3(iii)(d)) and the woman at each end (Q3(vii)) are too slight to gate.
  gate: ['mixed-q5-iii', 'mixed-q4-ii', 'mixed-q4-i', 'mixed-q5-ii', 'mixed-q3-v-why', 'mixed-q5-i', 'mixed-q3-v', 'mixed-q3-iv'],
  recall: [
    { front: t`How many orders of ${mn} different objects keep ${mk} given ones together?`, back: t`${math`k!\,(n - k + ${1})!`}: glue them into a block, arrange, then order the block.` },
    { front: t`How many gaps do ${mw} objects in a line leave, ends included?`, back: t`${math`w + ${1}`}.` },
    { front: t`How do you keep a group apart?`, back: t`Arrange the others, then put the group in different gaps, one per gap.` },
    { front: t`Restrictions at the ends?`, back: t`Fill the restricted places first, then the free ones.` },
  ],
  proofOrder: [
    {
      title: t`The gap method`,
      steps: [
        t`Arrange the ${mw} other objects: ${math`w!`} ways.`,
        t`They leave ${math`w + ${1}`} gaps, the two ends included.`,
        t`No two of the group touch exactly when they use different gaps.`,
        t`Fill the gaps one object at a time and multiply.`,
      ],
    },
  ],
};
