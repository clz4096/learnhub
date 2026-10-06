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
import { computedTex, math, t } from '../rich';
import { worked, workedCambridge, type ProbabilityClaim, type TopicContent } from '../topic';
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

const claims: ProbabilityClaim[] = [
  { what: 'six women and four men: no two men together', exact: q(1, 6), trial: (rng) => noneAdjacent(placesOf(10, 4, rng)) },
  { what: 'six women and four men: a woman at each end', exact: q(1, 3), trial: (rng) => { const men = placesOf(10, 4, rng); return !men.includes(0) && !men.includes(9); } },
];

export const restrictedArrangements: TopicContent = {
  topicId: 'comb.restricted-arrangements',
  goal: t`Count arrangements in a line with some objects kept together, kept apart, or at the ends, and turn the counts into probabilities.`,
  lesson: [
    { kind: 'p', text: t`Mixed STEP ${1} Statistics notes that arrangements are on the STEP ${1} specification but not in A-level mathematics. Three ideas cover most questions. Throughout, ${6} women and ${4} men stand in a line in one of ${math`${10}!`} equally likely orders.` },
    { kind: 'rule', text: t`The [[block-method|block method]]: to keep a group together, glue it into one block (a "rope"), arrange the block with the others, then multiply by the orders inside the block.` },
    { kind: 'p', text: t`The ${4} men together: the rope and ${6} women are ${7} things, ${math`${7}!`} orders, times ${math`${4}!`} inside, so ${math`\frac{${7}! \, ${4}!}{${10}!} = ${q(1, 30)}`}. The women together: ${math`\frac{${5}! \, ${6}!}{${10}!} = ${q(1, 42)}`}. Both: ${math`\frac{${2} \times ${6}! \, ${4}!}{${10}!} = ${q(1, 105)}`}, not the product of the two, since the events are not independent.` },
    { kind: 'rule', text: t`The [[gap-method|gap method]]: to keep a group apart, arrange everyone else first, then put the group into different gaps, counting the two ends as gaps.` },
    { kind: 'p', text: t`No two men together: ${6} women leave ${7} gaps, and the men fill ${4} of them in ${math`${7} \times ${6} \times ${5} \times ${4}`} ways, so ${math`P = \frac{${6}! \times ${7} \times ${6} \times ${5} \times ${4}}{${10}!} = ${q(1, 6)}`}. If there are more of the group than gaps, the probability is ${0}.` },
    { kind: 'p', text: t`Ends first: for a woman at each end, choose them (${6} then ${5}), then arrange the other ${8}: ${math`\frac{${6} \times ${5} \times ${8}!}{${10}!} = ${q(1, 3)}`}. Filling the most restricted places first keeps the count a simple product.` },
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
  gate: [
    'mixed-q3-iii-d',
    'mixed-q3-iv',
    'mixed-q3-v',
    'mixed-q3-vii',
    'mixed-q4-i',
    'mixed-q5-i',
    'mixed-q5-ii',
    'mixed-q4-ii',
    'mixed-q5-iii',
    'mixed-q3-v-why',
  ],
};
