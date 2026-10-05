/**
 * comb.combinations: Unordered selections and the binomial coefficient. From IA
 * Probability Example Sheet 1, Q1 (the litter of mice), Q7(a) (a committee containing given
 * people), and Q12 (balls in boxes, checked for n = 2 and 3); Book of Proof Chapter 4,
 * exercises 22, 23, and 25; and STEP Support Assignment 12's hints, whose Method 2 counts
 * pairs of sweets with nCr. Sheet 1 has no official solutions; its answers are checked by
 * brute force.
 */
import type { Rng } from '@learnhub/mastery';
import { auto, cite, same, supervision } from '../cambridge';
import { factorial, int, pick, q, str, sub, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { dmath, math, t } from '../rich';
import { worked, workedCambridge, type ProbabilityClaim, type TopicContent } from '../topic';

/** C(n, k), exactly, by the multiplicative formula. */
function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
}
/** C(n, k) by counting the k-element subsets of n things, for the checks. */
function subsets(n: number, k: number): number {
  let count = 0;
  for (let m = 0; m < 1 << n; m++) {
    let bits = 0;
    for (let x = m; x > 0; x >>= 1) bits += x & 1;
    if (bits === k) count++;
  }
  return count;
}
const binom = (n: number | string, k: number | string) => math`\binom{${n}}{${k}}`;
const perm = (n: number, k: number): number => factorial(n) / factorial(n - k);
const mn = math`n`;

/** Choose k of n without replacement; the positions chosen. */
function drawK(rng: Rng, n: number, k: number): Set<number> {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(rng() * (n - i));
    [a[i], a[j]] = [a[j] as number, a[i] as number];
  }
  return new Set(a.slice(0, k));
}

// ---------------------------------------------------------------- generators

interface ChooseP { n: number; r: number; what: 'committee' | 'books' | 'toppings' }

const chooseGen = generator<ChooseP>({
  id: 'choose',
  skill: 'Count unordered selections of r things from n with the binomial coefficient.',
  params: (rng) => {
    const n = int(rng, 5, 14);
    return { n, r: int(rng, 2, Math.min(5, n - 2)), what: pick(rng, ['committee', 'books', 'toppings'] as const) };
  },
  sane: ({ n, r }) => (n >= 5 && n <= 14 && r >= 2 && r <= n - 2 ? null : 'out of range'),
  problem: ({ n, r, what }) => ({
    prompt: what === 'committee'
      ? t`In how many ways can a committee of ${r} be chosen from ${n} people?`
      : what === 'books'
        ? t`In how many ways can I choose ${r} books to take on holiday from ${n} on my shelf?`
        : t`A pizza place offers ${n} toppings. How many pizzas with exactly ${r} different toppings are there?`,
    answer: { kind: 'exact', expected: String(choose(n, r)) },
    solution: [
      t`In order, there are ${math`${n} \times ${n - 1} \times \cdots \times ${n - r + 1} = ${perm(n, r)}`} ways to pick them one after another.`,
      t`Order does not matter, and each selection was counted once for each of its ${math`${r}! = ${factorial(r)}`} orders. So ${math`\binom{${n}}{${r}} = \frac{${perm(n, r)}}{${factorial(r)}} = ${choose(n, r)}`}.`,
    ],
  }),
  solve: ({ n, r }) => String(subsets(n, r)),
  misconceptions: ({ n, r }): Misconception[] => [
    { response: String(perm(n, r)), why: t`That counts ordered choices. A selection of ${r} is the same whatever order they were picked in: divide by ${math`${r}!`}.` },
    { response: String(factorial(n) / factorial(r)), why: t`${math`\binom{n}{r} = \frac{n!}{r!\,(n - r)!}`}: the ${math`(n - r)!`} is missing.` },
  ],
});

interface IncludeP { n: number; r: number; m: number }

const including = generator<IncludeP>({
  id: 'including',
  skill: 'Count selections that must include some given people: those are already chosen, so choose the rest from the others.',
  params: (rng) => {
    const n = int(rng, 6, 14);
    const m = int(rng, 1, 2);
    return { n, m, r: int(rng, m + 1, Math.min(6, n - 2)) };
  },
  sane: ({ n, r, m }) => (n >= 6 && m >= 1 && r > m && r <= n - 2 ? null : 'out of range'),
  problem: ({ n, r, m }) => ({
    prompt: t`A committee of ${r} is chosen from ${n} people, who include ${m === 1 ? 'Ana' : 'Ana and Ben'}. How many possible committees include ${m === 1 ? 'Ana' : 'both Ana and Ben'}?`,
    answer: { kind: 'exact', expected: String(choose(n - m, r - m)) },
    solution: [
      t`${m === 1 ? 'Ana is' : 'Ana and Ben are'} on the committee, so ${math`${r} - ${m} = ${r - m}`} places remain, to be filled from the other ${math`${n} - ${m} = ${n - m}`} people.`,
      t`That is ${math`${binom(n - m, r - m)} = ${choose(n - m, r - m)}`} committees.`,
    ],
  }),
  solve: ({ n, r, m }) => {
    // Count the r-subsets of n people that contain people 0..m-1.
    let count = 0;
    for (let s = 0; s < 1 << n; s++) {
      let bits = 0;
      for (let x = s; x > 0; x >>= 1) bits += x & 1;
      if (bits === r && (s & ((1 << m) - 1)) === (1 << m) - 1) count++;
    }
    return String(count);
  },
  misconceptions: ({ n, r, m }): Misconception[] => [
    { response: String(choose(n - m, r)), why: t`That counts committees without ${m === 1 ? 'Ana' : 'Ana and Ben'}. ${m === 1 ? 'She is' : 'They are'} already on it: choose only the remaining ${r - m}.` },
    { response: String(choose(n, r - m)), why: t`The remaining ${r - m} are chosen from the other ${n - m} people, not from all ${n}: ${m === 1 ? 'Ana' : 'Ana and Ben'} cannot be chosen twice.` },
    { response: String(choose(n, r)), why: t`That counts every committee. Only those with ${m === 1 ? 'Ana' : 'both of them'} count: fix ${m === 1 ? 'her' : 'them'} first, then choose the rest.` },
  ],
});

type LitterEvent = 'all-white' | 'no-white';
interface LitterP { n: number; w: number; k: number; e: LitterEvent }

/** P(event) for k mice chosen from n, w of them white. */
const litterP = ({ n, w, k, e }: LitterP): Rational => q(e === 'all-white' ? choose(n - w, k - w) : choose(n - w, k), choose(n, k));

const litter = generator<LitterP>({
  id: 'litter',
  skill: 'A probability of a selection: favourable selections over all selections, as in IA Probability Example Sheet 1, Q1.',
  params: (rng) => {
    const n = int(rng, 6, 12);
    const w = int(rng, 2, 3);
    return { n, w, k: int(rng, w, Math.min(5, n - w)), e: pick(rng, ['all-white', 'no-white'] as const) };
  },
  sane: ({ n, w, k }) => (n >= 6 && w >= 2 && k >= w && k <= n - w ? null : 'out of range'),
  problem: (p) => {
    const { n, w, k, e } = p;
    const good = e === 'all-white' ? choose(n - w, k - w) : choose(n - w, k);
    return {
      prompt: t`${k} mice are chosen at random, without replacement, from a litter of ${n}, of which ${w} are white. What is the probability that ${e === 'all-white' ? t`all ${w} white mice are chosen` : 'no white mouse is chosen'}?`,
      answer: { kind: 'exact', expected: str(litterP(p)) },
      solution: [
        t`Every set of ${k} mice is equally likely: ${math`${binom(n, k)} = ${choose(n, k)}`} sets.`,
        e === 'all-white'
          ? t`Sets containing all ${w} white mice: the other ${k - w} come from the ${n - w} non-white ones, ${math`${binom(n - w, k - w)} = ${good}`}.`
          : t`Sets with no white mouse: all ${k} from the ${n - w} non-white ones, ${math`${binom(n - w, k)} = ${good}`}.`,
        t`So the probability is ${math`\frac{${good}}{${choose(n, k)}} = ${litterP(p)}`}.`,
      ],
    };
  },
  solve: ({ n, w, k, e }) => {
    // Count k-subsets by brute force; mice 0..w-1 are white.
    const white = (1 << w) - 1;
    let good = 0;
    let all = 0;
    for (let s = 0; s < 1 << n; s++) {
      let bits = 0;
      for (let x = s; x > 0; x >>= 1) bits += x & 1;
      if (bits !== k) continue;
      all++;
      if (e === 'all-white' ? (s & white) === white : (s & white) === 0) good++;
    }
    return str(q(good, all));
  },
  misconceptions: (p): Misconception[] => {
    const { n, w, k, e } = p;
    return e === 'all-white'
      ? [
        { response: str(q(k ** w, n ** w)), why: t`The white mice are not chosen independently: once one is chosen there are fewer places left. Count sets of mice.` },
        { response: str(sub(q(1), litterP({ ...p, e: 'no-white' }))), why: t`That is the chance of at least one white mouse. All ${w} must be chosen.` },
      ]
      : [
        { response: str(q((n - w) ** k, n ** k)), why: t`That chooses with replacement. The mice are chosen without replacement: count sets of ${k} distinct mice.` },
        { response: str(sub(q(1), litterP({ ...p, e: 'all-white' }))), why: t`That is one minus the chance that every white mouse is chosen, not the chance that none is.` },
      ];
  },
  trial: ({ n, w, k, e }, rng) => {
    const s = drawK(rng, n, k);
    const whites = Array.from({ length: w }, (_, i) => s.has(i)).filter((x) => x).length;
    return e === 'all-white' ? whites === w : whites === 0;
  },
});

interface ShakeP { n: number }

const handshakes = generator<ShakeP>({
  id: 'solve-for-n',
  skill: 'Solve for n given a binomial coefficient, as in IA Probability Example Sheet 1, Q1.',
  params: (rng) => ({ n: int(rng, 5, 20) }),
  sane: ({ n }) => (n >= 5 && n <= 20 ? null : 'out of range'),
  problem: ({ n }) => {
    const h = choose(n, 2);
    return {
      prompt: t`At a meeting everyone shakes hands with everyone else, once. There are ${h} handshakes. How many people are at the meeting?`,
      answer: { kind: 'exact', expected: String(n) },
      solution: [
        t`A handshake is an unordered pair of people, so with ${mn} people there are ${math`\binom{n}{${2}} = \frac{n(n - ${1})}{${2}}`} handshakes.`,
        t`Solve ${math`\frac{n(n - ${1})}{${2}} = ${h}`}: ${math`n(n - ${1}) = ${2 * h} = ${n} \times ${n - 1}`}, so ${math`n = ${n}`} (the negative root makes no sense).`,
      ],
    };
  },
  solve: ({ n }) => String([...Array(60).keys()].find((x) => subsetsOf2(x) === choose(n, 2)) ?? -1),
  misconceptions: ({ n }): Misconception[] => [
    { response: String(n + 1), why: t`${math`\binom{n}{${2}} = \frac{n(n - ${1})}{${2}}`}, not ${math`\frac{n(n + ${1})}{${2}}`}: each person shakes ${math`n - ${1}`} hands.` },
    { response: String(choose(n, 2)), why: t`That is the number of handshakes. The question asks for the number of people.` },
  ],
});
const subsetsOf2 = (x: number): number => (x * (x - 1)) / 2;

// ---------------------------------------------------------------- Cambridge problems

const S1 = 'ia-prob-sheet-1';

/** Sheet 1 Q1: the litter sizes n for which P(both white chosen) = 2 P(neither chosen), choosing four. */
const miceSolutions = (): number[] => Array.from({ length: 60 }, (_, i) => i + 6).filter((n) => {
  const both = q(choose(n - 2, 2), choose(n, 4));
  const neither = q(choose(n - 2, 4), choose(n, 4));
  return both.num * neither.den === 2n * neither.num * both.den;
});

const q1 = auto({
  id: 'q1',
  source: cite(S1, 'Q1'),
  title: t`The litter of mice`,
  prompt: t`Four mice are chosen (without replacement) from a litter, two of which are white. The probability that both white mice are chosen is twice the probability that neither is chosen. How many mice are there in the litter?`,
  answer: { kind: 'exact', expected: String(miceSolutions()[0]) },
  solution: [
    t`Say the litter has ${mn} mice. Every set of four is equally likely, ${binom('n', 4)} of them.`,
    t`Both white chosen: the other two come from the ${math`n - ${2}`} others, ${math`\binom{n - ${2}}{${2}}`} ways. Neither chosen: all four from the ${math`n - ${2}`} others, ${math`\binom{n - ${2}}{${4}}`} ways.`,
    t`The condition is ${math`\binom{n - ${2}}{${2}} = ${2}\binom{n - ${2}}{${4}}`}, that is ${dmath`\frac{(n - ${2})(n - ${3})}{${2}} = ${2} \cdot \frac{(n - ${2})(n - ${3})(n - ${4})(n - ${5})}{${24}}.`}`,
    t`Cancel ${math`(n - ${2})(n - ${3})`} (not zero, since ${math`n \ge ${4}`} and there must be some non-white mice): ${math`(n - ${4})(n - ${5}) = ${6}`}, so ${math`n^{${2}} - ${9}n + ${14} = ${0}`}, ${math`(n - ${2})(n - ${7}) = ${0}`}.`,
    t`${math`n = ${2}`} is too small for four mice, so ${math`n = ${miceSolutions()[0] as number}`}.`,
  ],
  reference: String(miceSolutions()[0]),
  verify: () => same('litter sizes 6 to 65 that satisfy the condition', miceSolutions().join(','), '7'),
  misconceptions: [{ response: '2', why: t`${math`n = ${2}`} solves the quadratic, but four mice cannot be chosen from two.` }],
});

const q7a = auto({
  id: 'q7-a',
  source: cite(S1, 'Q7(a)', true),
  title: t`Two given people on the committee`,
  prompt: t`A committee of size ${math`r`} is chosen at random from a set of ${mn} people. Calculate directly the probability that two given people will both be on the committee. Give it in terms of ${mn} and ${math`r`}. (The sheet asks this for ${math`m`} given people; here ${math`m = ${2}`}. Binomial coefficients can be typed as C(n, r).)`,
  answer: { kind: 'expression', expected: 'r(r - 1)/(n(n - 1))', variables: ['n', 'r'], domains: { n: { kind: 'integer', min: 10, max: 30 }, r: { kind: 'integer', min: 2, max: 9 } }, binomial: true },
  solution: [
    t`All ${binom('n', 'r')} committees are equally likely.`,
    t`Those containing both given people choose the other ${math`r - ${2}`} members from the other ${math`n - ${2}`} people: ${math`\binom{n - ${2}}{r - ${2}}`}.`,
    t`So the probability is ${math`\frac{\binom{n - ${2}}{r - ${2}}}{\binom{n}{r}} = \frac{r(r - ${1})}{n(n - ${1})}`}. In general, for ${math`m`} given people it is ${math`\binom{n - m}{r - m} \big/ \binom{n}{r}`}.`,
  ],
  // Typed as the learner would type the direct answer, with binomial coefficients.
  reference: 'C(n - 2, r - 2)/C(n, r)',
  verify: () => {
    // Count committees by brute force for small n and r.
    for (let n = 4; n <= 10; n++) for (let r = 2; r <= n; r++) {
      let good = 0;
      let all = 0;
      for (let s = 0; s < 1 << n; s++) {
        let bits = 0;
        for (let x = s; x > 0; x >>= 1) bits += x & 1;
        if (bits !== r) continue;
        all++;
        if ((s & 3) === 3) good++;
      }
      const e = same(`n = ${n}, r = ${r}`, str(q(good, all)), str(q(r * (r - 1), n * (n - 1))));
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [{ response: '(r/n)^2', why: t`The two people are not chosen independently: once one is on, there are ${math`r - ${1}`} places left among ${math`n - ${1}`} people.` }],
});

/** Sheet 1 Q12: P(exactly one box empty) when n balls go into n boxes, by listing every assignment. */
function oneEmpty(n: number): Rational {
  let good = 0;
  const all = n ** n;
  for (let s = 0; s < all; s++) {
    const used = new Set<number>();
    for (let x = s, i = 0; i < n; i++, x = Math.floor(x / n)) used.add(x % n);
    if (used.size === n - 1) good++;
  }
  return q(good, all);
}

const q12 = auto({
  id: 'q12-check',
  source: cite(S1, 'Q12, the checks for n = 2 and 3', true),
  title: t`Balls in boxes, small cases`,
  prompt: t`${mn} balls are tossed independently and at random into ${mn} boxes. Find directly the probability that exactly one box is empty, for ${math`n = ${2}`} and for ${math`n = ${3}`}.`,
  answer: { kind: 'table', cell: 'exact', columns: [[math`n`], t`P(exactly one box empty)`], rows: [[t`${2}`, null], [t`${3}`, null]], expected: [str(oneEmpty(2)), str(oneEmpty(3))] },
  solution: [
    t`With ${math`n = ${2}`}: ${math`${2}^{${2}} = ${4}`} equally likely ways; exactly one box is empty when both balls land in the same box, ${2} ways. So ${oneEmpty(2)}.`,
    t`With ${math`n = ${3}`}: ${math`${3}^{${3}} = ${27}`} ways. Choose the empty box (${3} ways), then the three balls fill the other two boxes with neither empty: ${math`${2}^{${3}} - ${2} = ${6}`} ways. So ${math`\frac{${3} \times ${6}}{${27}} = ${oneEmpty(3)}`}.`,
    t`The general answer, for the sheet, is ${math`\binom{n}{${2}} \frac{n!}{n^{n}}`}: choose the box left empty and the box that gets two balls, then arrange.`,
  ],
  reference: [str(oneEmpty(2)), str(oneEmpty(3))],
  verify: () => {
    const general = (n: number): Rational => q(choose(n, 2) * factorial(n), n ** n);
    for (let n = 2; n <= 6; n++) { const e = same(`n = ${n}, listing against the formula`, str(oneEmpty(n)), str(general(n))); if (e !== null) return e; }
    return null;
  },
  misconceptions: [{ response: [str(q(1, 4)), str(q(1, 9))], why: t`Each ball chooses its box independently, so there are ${math`n^{n}`} equally likely outcomes, not ${math`n^{${2}}`}. Count them.` }],
});

const bop422 = auto({
  id: 'bop-4-22',
  source: cite('bop', 'Chapter 4, exercise 22', true),
  title: t`${math`n^{${2}}`} from binomial coefficients`,
  prompt: t`Find the whole numbers ${math`a`} and ${math`b`} with ${math`n^{${2}} = a\binom{n}{${2}} + b\binom{n}{${1}}`} for every ${math`n \in \mathbb{N}`}.`,
  answer: {
    kind: 'witness', count: 2, names: ['a', 'b'], example: 'a = 2, b = 1',
    check: (vals) => {
      const [a, b] = vals.map((v) => Number(v.num) / Number(v.den)) as [number, number];
      const bad = [1, 2, 3, 4, 5, 6, 7, 8].find((n) => a * choose(n, 2) + b * choose(n, 1) !== n * n);
      return bad === undefined ? null : `At n = ${bad}: ${a} × ${choose(bad, 2)} + ${b} × ${bad} is ${a * choose(bad, 2) + b * bad}, not ${bad * bad}.`;
    },
  },
  solution: [
    t`${math`\binom{n}{${2}} = \frac{n(n - ${1})}{${2}}`} and ${math`\binom{n}{${1}} = n`}, so ${math`a \cdot \frac{n^{${2}} - n}{${2}} + bn = n^{${2}}`} for every ${mn}.`,
    t`Compare: the ${math`n^{${2}}`} terms give ${math`\frac{a}{${2}} = ${1}`}, so ${math`a = ${2}`}; then ${math`-n + bn = ${0}`}, so ${math`b = ${1}`}. That is the identity of the exercise, ${math`n^{${2}} = ${2}\binom{n}{${2}} + \binom{n}{${1}}`}.`,
  ],
  reference: 'a = 2, b = 1',
  verify: () => {
    const found: string[] = [];
    for (let a = -5; a <= 5; a++) for (let b = -5; b <= 5; b++) if ([1, 2, 3, 4, 5].every((n) => a * subsets(n, 2) + b * subsets(n, 1) === n * n)) found.push(`${a},${b}`);
    return same('the only pair', found.join(';'), '2,1');
  },
  misconceptions: [{ response: 'a = 1, b = 1', why: t`At ${math`n = ${2}`}: ${math`\binom{${2}}{${2}} + \binom{${2}}{${1}} = ${3}`}, not ${4}.` }],
  official: { source: cite('bop', 'Chapter 4, exercise 22'), answer: 'a = 2, b = 1', agrees: true },
});

const bop423 = supervision({
  id: 'bop-4-23',
  source: cite('bop', 'Chapter 4, exercise 23'),
  title: t`${math`\binom{${2}n}{n}`} is even`,
  prompt: t`Prove: if ${math`n \in \mathbb{N}`}, then ${math`\binom{${2}n}{n}`} is even. (Book of Proof's ${math`\mathbb{N}`} starts at ${1}.)`,
  writeUp: 'proof',
  official: cite('bop', 'Solutions, Chapter 4, exercise 23'),
});
const bop425 = supervision({
  id: 'bop-4-25',
  source: cite('bop', 'Chapter 4, exercise 25'),
  title: t`Choosing in two stages`,
  prompt: t`Prove: if ${math`a, b, c \in \mathbb{N}`} and ${math`c \le b \le a`}, then ${math`\binom{a}{b}\binom{b}{c} = \binom{a}{b - c}\binom{a - b + c}{c}`}. Give an algebraic proof, and, if you can, a counting one: both sides count the same choices.`,
  writeUp: 'proof',
  official: cite('bop', 'Solutions, Chapter 4, exercise 25'),
});

// ---------------------------------------------------------------- lesson

const L = { n: 5, r: 2 };
const claims: ProbabilityClaim[] = [
  { what: 'Sheet 1 Q1 with seven mice: P(both white chosen)', exact: q(choose(5, 2), choose(7, 4)), trial: (rng) => { const s = drawK(rng, 7, 4); return s.has(0) && s.has(1); } },
];

export const combinations: TopicContent = {
  topicId: 'comb.combinations',
  goal: t`Count unordered selections of ${math`r`} objects from ${mn} as ${math`\binom{n}{r} = \frac{n!}{r!\,(n - r)!}`}, and use them for probabilities of selections.`,
  lesson: [
    { kind: 'p', text: t`A [[combination|combination]] is a selection in which order does not matter: a committee, a hand of cards, a set of mice. Choosing ${L.r} of ${L.n} letters in order gives ${math`${L.n} \times ${L.n - 1} = ${perm(L.n, L.r)}`} ordered pairs, but AB and BA are the same selection, so there are ${math`\frac{${perm(L.n, L.r)}}{${2}} = ${choose(L.n, L.r)}`} selections.` },
    { kind: 'rule', text: t`In general, ${math`n(n - ${1}) \cdots (n - r + ${1}) = \frac{n!}{(n - r)!}`} ordered choices, each selection counted ${math`r!`} times: ${dmath`\binom{n}{r} = \frac{n!}{r!\,(n - r)!},`} read "${mn} choose ${math`r`}", the [[binomial-coefficient|binomial coefficient]]. A level writes it ${math`{}^{n}C_{r}`}.` },
    { kind: 'p', text: t`Useful values: ${math`\binom{n}{${0}} = \binom{n}{n} = ${1}`}, ${math`\binom{n}{${1}} = n`}, and ${math`\binom{n}{${2}} = \frac{n(n - ${1})}{${2}}`}, the number of pairs. Choosing which ${math`r`} to take is the same as choosing which ${math`n - r`} to leave, so ${math`\binom{n}{r} = \binom{n}{n - r}`}.` },
    { kind: 'p', text: t`When every selection is equally likely, a probability is the number of favourable selections over ${binom('n', 'r')}. The STEP Support hints use this as their Method ${2} for the sweets: ${math`\frac{\binom{${9}}{${2}} + \binom{${6}}{${2}}}{\binom{${15}}{${2}}} = \frac{${choose(9, 2)} + ${choose(6, 2)}}{${choose(15, 2)}} = ${q(choose(9, 2) + choose(6, 2), choose(15, 2))}`}, the same as the tree.` },
    { kind: 'p', text: t`Selections that must contain some things are counted by taking those first and choosing the rest from what is left. That is how the IA example sheet's first question, the litter of mice, turns into an equation for the size of the litter.` },
  ],
  examples: [
    workedCambridge(q1),
    worked(chooseGen, { n: 10, r: 3, what: 'committee' }, t`A committee of three from ten`),
    worked(litter, { n: 8, w: 2, k: 3, e: 'no-white' }, t`No white mouse`),
  ],
  generators: [chooseGen, including, litter, handshakes],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['combination', 'binomial-coefficient'],
  claims,
  cambridge: [q7a, q12, bop422, bop423, bop425],
};
