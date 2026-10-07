/**
 * comb.binomial-identities: Symmetry and Pascal's rule, by algebra and by counting. From
 * the CST notes on the Binomial Theorem's inductive step (printed pages 273 to 280), which
 * reduce it to Pascal's rule and set that as homework, and Book of Proof Chapter 10,
 * exercises 24, 31, 35, 38, 40, and 41 (identities on Pascal's triangle), checked against
 * the solutions to odd exercises. Exercises 22, 23, and 25 of Chapter 4 are set in
 * comb.combinations. Batch 7 adds IA Numbers and Sets Example Sheet 2, Q3, and Grinstead and
 * Snell, Section 3.2, Exercises 9 and 13, with their printed odd answers.
 */
import type { Rational } from '@learnhub/mastery';
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { int, pick, upTo } from '../math';
import { generator, type Misconception } from '../problem';
import { computedTex, dmath, listOf, math, t } from '../rich';
import { checkFrom, worked, workedCambridge, workedProof, type TopicContent } from '../topic';

const [mn, mr, mk] = [math`n`, math`r`, math`k`];

/** Pascal's triangle by its own rule: row n from row n - 1. */
function row(n: number): number[] {
  let r = [1];
  for (let i = 0; i < n; i++) r = [...r, 0].map((x, j) => x + (j > 0 ? (r[j - 1] as number) : 0));
  return r;
}
/** C(n, k) by the multiplicative formula, independent of the triangle. */
function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let v = 1;
  for (let i = 1; i <= k; i++) v = (v * (n - k + i)) / i;
  return Math.round(v);
}
const binom = (n: number | string, k: number | string) => math`\binom{${n}}{${k}}`;

// ---------------------------------------------------------------- generators

interface RowP { n: number }

const nextRow = generator<RowP>({
  id: 'pascal-row',
  skill: 'Build the next row of Pascal\'s triangle: each entry is the sum of the two above it.',
  params: (rng) => ({ n: int(rng, 4, 9) }),
  sane: ({ n }) => (n >= 4 && n <= 9 ? null : 'out of range'),
  problem: ({ n }) => {
    const above = row(n);
    const below = row(n + 1);
    return {
      prompt: t`Row ${n} of Pascal's triangle is ${listOf(above)}. Fill in row ${n + 1}.`,
      answer: {
        kind: 'table', cell: 'exact',
        columns: below.map((_, k) => [binom(n + 1, k)]),
        rows: [below.map(() => null)],
        expected: below.map(String),
      },
      solution: [
        t`Each entry is the sum of the two entries above it, ${math`\binom{${n + 1}}{k} = \binom{${n}}{k - ${1}} + \binom{${n}}{k}`}, with a ${1} at each end.`,
        t`So row ${n + 1} is ${listOf(below)}.`,
      ],
    };
  },
  solve: ({ n }) => upTo(n + 2).map((k) => String(choose(n + 1, k - 1))),
  misconceptions: ({ n }): Misconception[] => {
    const above = row(n);
    return [
      { response: [...above, 1].map(String), why: t`That copies row ${n} and adds a ${1}. Each entry is the sum of the two entries above it.` },
      { response: [1, ...above.slice(1).map((x, j) => x + (above[j + 2] ?? 0)), 1].slice(0, n + 2).map(String), why: t`Add the two entries directly above, the one up and left and the one up and right, not entries two apart.` },
    ];
  },
});

interface SymP { n: number; r: number }

const symmetry = generator<SymP>({
  id: 'symmetry',
  skill: 'Use symmetry, C(n, r) = C(n, n - r): choosing what to take is choosing what to leave.',
  params: (rng) => {
    const n = int(rng, 7, 30);
    let r = int(rng, 1, n - 1);
    if (2 * r === n) r = r - 1 === 0 ? r + 1 : r - 1;
    return { n, r };
  },
  sane: ({ n, r }) => (r >= 1 && r < n && 2 * r !== n ? null : 'out of range'),
  problem: ({ n, r }) => ({
    prompt: t`Find the number ${math`s \ne ${r}`} with ${math`\binom{${n}}{${r}} = \binom{${n}}{s}`}.`,
    answer: { kind: 'exact', expected: String(n - r) },
    solution: [
      t`Choosing ${r} of ${n} things to take is the same as choosing the ${math`${n} - ${r} = ${n - r}`} to leave, so ${math`\binom{${n}}{${r}} = \binom{${n}}{${n - r}}`}.`,
      t`By the formula: ${math`\binom{n}{r} = \frac{n!}{r!\,(n - r)!}`} is unchanged when ${mr} and ${math`n - r`} swap.`,
    ],
  }),
  solve: ({ n, r }) => String(upTo(n + 1).map((k) => k - 1).find((s) => s !== r && choose(n, s) === choose(n, r)) as number),
  misconceptions: ({ n, r }): Misconception[] => [
    { response: String(n - r + 1), why: t`The two lower numbers add up to ${n}: ${math`${r} + s = ${n}`}.` },
    { response: String(n + r), why: t`The lower number cannot exceed ${n}. Taking ${r} is the same as leaving ${n - r}.` },
  ],
});

interface RuleP { n: number; r: number }

const pascalRule = generator<RuleP>({
  id: 'pascal-rule',
  skill: 'Combine two neighbouring binomial coefficients with Pascal\'s rule, C(n, r) + C(n, r + 1) = C(n + 1, r + 1).',
  params: (rng) => {
    for (;;) {
      const n = int(rng, 5, 20);
      const r = int(rng, 1, n - 2);
      // With n = 2r the sum is the middle of the next row, where k = r is right by symmetry.
      if (n !== 2 * r) return { n, r };
    }
  },
  sane: ({ n, r }) => (r >= 1 && r <= n - 2 && n !== 2 * r ? null : 'out of range'),
  problem: ({ n, r }) => {
    const total = choose(n, r) + choose(n, r + 1);
    return {
      prompt: t`Write ${math`\binom{${n}}{${r}} + \binom{${n}}{${r + 1}}`} as a single binomial coefficient ${math`\binom{m}{k}`}: give ${math`m`} and ${mk}.`,
      answer: {
        kind: 'witness', count: 2, names: ['m', 'k'], example: `m = ${n + 1}, k = ${r + 1}`,
        check: (vals: readonly Rational[]) => {
          const [m, k] = vals.map((v) => (v.den === 1n && v.num >= 0n ? Number(v.num) : NaN)) as [number, number];
          if (Number.isNaN(m) || Number.isNaN(k)) return 'm and k are natural numbers.';
          if (k > m) return 'k is at most m.';
          if (m !== n + 1) return `Pascal's rule gives a coefficient in the next row down, row ${n + 1}.`;
          return choose(m, k) === total ? null : `C(${m}, ${k}) is ${choose(m, k)}, but the sum is ${total}.`;
        },
      },
      solution: [
        t`Pascal's rule: ${math`\binom{n}{r} + \binom{n}{r + ${1}} = \binom{n + ${1}}{r + ${1}}`}. Here ${math`\binom{${n + 1}}{${r + 1}}`}, which is ${total}.`,
        t`By symmetry ${math`\binom{${n + 1}}{${n - r}}`} is the same number, so ${math`m = ${n + 1}, k = ${n - r}`} is right too.`,
      ],
    };
  },
  solve: ({ n, r }) => {
    // Search the triangle for the sum, in the row just below.
    const total = choose(n, r) + choose(n, r + 1);
    const k = row(n + 1).findIndex((x) => x === total);
    return `m = ${n + 1}, k = ${k}`;
  },
  misconceptions: ({ n, r }): Misconception[] => [
    { response: `m = ${n}, k = ${r + 1}`, why: t`The sum of two neighbours lands in the next row down: the top number goes up by ${1}.` },
    { response: `m = ${n + 1}, k = ${r}`, why: t`The sum sits below and between the two: its lower number is the larger of the two, ${r + 1}.` },
  ],
});

type SumKind = 'all' | 'alternating' | 'weighted' | 'squares';
interface RowSumP { n: number; kind: SumKind }

const rowSum = generator<RowSumP>({
  id: 'row-sum',
  skill: 'Sum a row of Pascal\'s triangle, plain, alternating, weighted, or squared, by counting or by the binomial theorem.',
  params: (rng) => ({ n: int(rng, 3, 10), kind: pick(rng, ['all', 'alternating', 'weighted', 'squares'] as const) }),
  sane: ({ n }) => (n >= 3 && n <= 10 ? null : 'out of range'),
  problem: ({ n, kind }) => {
    const value = kind === 'all' ? 2 ** n : kind === 'alternating' ? 0 : kind === 'weighted' ? n * 2 ** (n - 1) : choose(2 * n, n);
    const sumTex = kind === 'all' ? math`\sum_{k = ${0}}^{${n}} \binom{${n}}{k}` : kind === 'alternating' ? math`\sum_{k = ${0}}^{${n}} (${-1})^{k} \binom{${n}}{k}` : kind === 'weighted' ? math`\sum_{k = ${1}}^{${n}} k\binom{${n}}{k}` : math`\sum_{k = ${0}}^{${n}} \binom{${n}}{k}^{${2}}`;
    return {
      prompt: t`Find ${sumTex}.`,
      answer: { kind: 'exact', expected: String(value) },
      solution: [
        kind === 'all' ? t`Every subset of ${n} things has some size ${mk}, so adding the numbers of subsets of each size counts all ${math`${2}^{${n}}`} subsets: ${2 ** n}.`
          : kind === 'alternating' ? t`Put ${math`x = ${1}`}, ${math`y = ${-1}`} in the binomial theorem: ${math`(${1} - ${1})^{${n}} = ${0}`}.`
            : kind === 'weighted' ? t`Count pairs (a committee, its chair): choose the chair first (${n} ways), then any subset of the other ${n - 1} people, ${math`${n} \cdot ${2}^{${n - 1}} = ${n * 2 ** (n - 1)}`}. Book of Proof's Chapter ${10}, exercise ${24}.`
              : t`Choosing ${n} from ${math`${2 * n}`} things, ${n} red and ${n} blue, as ${mk} red and ${math`${n} - k`} blue: ${math`\sum \binom{${n}}{k}\binom{${n}}{${n} - k} = \binom{${2 * n}}{${n}} = ${value}`}, and ${math`\binom{${n}}{${n} - k} = \binom{${n}}{k}`}.`,
        t`So the sum is ${value}.`,
      ],
    };
  },
  solve: ({ n, kind }) => {
    const r = row(n);
    const s = r.reduce((acc, x, k) => acc + (kind === 'all' ? x : kind === 'alternating' ? (k % 2 === 0 ? x : -x) : kind === 'weighted' ? k * x : x * x), 0);
    return String(s);
  },
  misconceptions: ({ n, kind }): Misconception[] => {
    switch (kind) {
      case 'all': return [
        { response: String(2 ** (n + 1)), why: t`Row ${n} sums to ${math`${2}^{${n}}`}: the number of subsets of ${n} things.` },
        { response: String(n * n), why: t`The sum is the number of subsets, ${math`${2}^{${n}}`}, which grows much faster than ${math`n^{${2}}`}.` },
        { response: String(n + 1), why: t`That is the number of entries in row ${n}. Add the entries themselves.` },
      ];
      case 'alternating': return [
        { response: String(2 ** n), why: t`With alternating signs the terms cancel: ${math`(${1} - ${1})^{${n}} = ${0}`}.` },
        { response: String(n % 2 === 0 ? 2 : -2), why: t`The two ends do not survive alone: the whole alternating sum is ${math`(${1} - ${1})^{${n}}`}.` },
      ];
      case 'weighted': return [
        { response: String(2 ** n), why: t`That is the plain row sum. The weights ${mk} make it ${math`n \cdot ${2}^{n - ${1}}`}.` },
        { response: String(n * 2 ** n), why: t`Once the chair is chosen, only ${n - 1} people are left for the rest: ${math`n \cdot ${2}^{n - ${1}}`}.` },
      ];
      case 'squares': return [
        { response: String(4 ** n), why: t`That is the square of the row sum. The sum of the squares is ${math`\binom{${2}n}{n}`}.` },
        { response: String(2 ** n), why: t`That is the row sum without squaring.` },
      ];
    }
  },
});

// ---------------------------------------------------------------- Cambridge problems

const pascalProof = workedProof({
  title: t`Pascal's rule, by counting and by algebra`,
  prompt: t`The CST notes reduce the inductive step of the Binomial Theorem to this homework: for all positive integers ${math`m`} and ${mk} with ${math`${1} \le k \le m`}, ${math`\binom{m + ${1}}{k} = \binom{m}{k} + \binom{m}{k - ${1}}`}.`,
  steps: [
    t`By counting: ${math`\binom{m + ${1}}{k}`} counts the ${mk}-element subsets of ${math`m + ${1}`} things. Fix one of the things, ${math`x`}. Subsets without ${math`x`} choose all ${mk} from the other ${math`m`}: ${math`\binom{m}{k}`}. Subsets with ${math`x`} choose the other ${math`k - ${1}`} from the ${math`m`}: ${math`\binom{m}{k - ${1}}`}. Every subset is counted once, so the two add to ${math`\binom{m + ${1}}{k}`}.`,
    t`By algebra: ${math`\binom{m}{k} + \binom{m}{k - ${1}} = \frac{m!}{k!\,(m - k)!} + \frac{m!}{(k - ${1})!\,(m - k + ${1})!}`}. Over the common denominator ${math`k!\,(m - k + ${1})!`}, the numerator is ${math`m!\,\big((m - k + ${1}) + k\big) = (m + ${1})!`}, which gives ${math`\frac{(m + ${1})!}{k!\,(m + ${1} - k)!} = \binom{m + ${1}}{k}`}.`,
  ],
  answer: t`${math`\binom{m + ${1}}{k} = \binom{m}{k} + \binom{m}{k - ${1}}`}.`,
  source: cite('cst-dm-notes', 'printed page 280, Homework 1'),
});

/** Book of Proof Chapter 10, exercise 31 with r = 2: the sum of C(k, 2) for k up to n. */
const bop1031 = auto({
  id: 'bop-10-31',
  source: cite('bop', 'Chapter 10, exercise 31', true),
  title: t`Down a diagonal of the triangle`,
  prompt: t`Exercise ${31} states ${math`\sum_{k = ${0}}^{n} \binom{k}{r} = \binom{n + ${1}}{r + ${1}}`}. For ${math`r = ${2}`}, write ${math`\sum_{k = ${0}}^{n} \binom{k}{${2}}`} as a polynomial in ${mn}.`,
  answer: { kind: 'expression', expected: '(n + 1)n(n - 1)/6', variables: ['n'], domains: { n: { kind: 'integer', min: 2, max: 30 } } },
  solution: [
    t`By the identity, the sum is ${math`\binom{n + ${1}}{${3}} = \frac{(n + ${1})n(n - ${1})}{${6}}`}.`,
    t`Check at ${math`n = ${4}`}: ${math`${computedTex(upTo(5).map((k) => choose(k - 1, 2)).join(' + '))} = ${choose(5, 3)} = \binom{${5}}{${3}}`}. On Pascal's triangle, the entries down a diagonal add to the entry below and to the right of the last one.`,
  ],
  reference: '(n + 1)n(n - 1)/6',
  verify: () => {
    for (let n = 2; n <= 20; n++) {
      const e = same(`n = ${n}`, upTo(n + 1).reduce((s, k) => s + choose(k - 1, 2), 0), choose(n + 1, 3));
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [{ response: 'n(n - 1)/2', why: t`That is only the last term, ${math`\binom{n}{${2}}`}. The sum of the column is one row down and one place right: ${math`\binom{n + ${1}}{${3}}`}.` }],
  official: { source: cite('bop', 'Solutions, Chapter 10, exercise 31'), answer: '(n + 1)n(n - 1)/6', agrees: true },
});

const bop1024 = auto({
  id: 'bop-10-24',
  source: cite('bop', 'Chapter 10, exercise 24', true),
  title: t`A weighted row sum`,
  prompt: t`Find ${math`\sum_{k = ${1}}^{n} k\binom{n}{k}`} as a formula in ${mn}. (Hint: count committees with a chair.)`,
  answer: { kind: 'expression', expected: 'n * 2^(n - 1)', variables: ['n'], domains: { n: { kind: 'integer', min: 1, max: 20 } } },
  solution: [
    t`Count the pairs (a committee of any size from ${mn} people, a chair from its members). By size: a committee of ${mk} has ${mk} choices of chair, so ${math`\sum k\binom{n}{k}`}.`,
    t`By chair first: ${mn} choices of chair, then any subset of the other ${math`n - ${1}`} people joins: ${math`n \cdot ${2}^{n - ${1}}`}. The two counts are equal.`,
  ],
  reference: 'n * 2^(n - 1)',
  verify: () => {
    for (let n = 1; n <= 20; n++) { const e = same(`n = ${n}`, row(n).reduce((s, x, k) => s + k * x, 0), n * 2 ** (n - 1)); if (e !== null) return e; }
    return null;
  },
  misconceptions: [{ response: '2^n', why: t`That is the plain row sum. Each committee is counted once for each member who could chair it.` }],
  // The exercise states the identity: n 2^(n - 1).
  official: { source: cite('bop', 'Chapter 10, exercise 24'), answer: 'n * 2^(n - 1)', agrees: true },
});

const N40 = 6;
const bop1040 = auto({
  id: 'bop-10-40',
  source: cite('bop', 'Chapter 10, exercise 40', true),
  title: t`Squares along a row`,
  prompt: t`Exercise ${40} says ${math`\binom{n}{${0}}^{${2}} + \binom{n}{${1}}^{${2}} + \cdots + \binom{n}{n}^{${2}} = \binom{${2}n}{n}`}. Check it for ${math`n = ${N40}`}: what is the sum?`,
  answer: { kind: 'exact', expected: String(choose(2 * N40, N40)) },
  solution: [
    t`Row ${N40} is ${listOf(row(N40))}; the squares are ${listOf(row(N40).map((x) => x * x))}, adding to ${row(N40).reduce((s, x) => s + x * x, 0)}.`,
    t`And ${math`\binom{${2 * N40}}{${N40}} = ${choose(2 * N40, N40)}`}: they agree.`,
  ],
  reference: String(choose(2 * N40, N40)),
  verify: () => same('the sum of squares against C(12, 6)', row(N40).reduce((s, x) => s + x * x, 0), choose(2 * N40, N40)),
  misconceptions: [{ response: String(2 ** (2 * N40)), why: t`That squares the row sum. Square each entry, then add.` }],
  official: { source: cite('bop', 'Chapter 10, exercise 40'), answer: String(choose(2 * N40, N40)), agrees: true },
});

const N41 = 3;
const K41 = 4;
const bop1041 = auto({
  id: 'bop-10-41',
  source: cite('bop', 'Chapter 10, exercise 41', true),
  title: t`Another diagonal`,
  prompt: t`Exercise ${41}: if ${mn} and ${mk} are non-negative integers, then ${math`\binom{n + ${0}}{${0}} + \binom{n + ${1}}{${1}} + \binom{n + ${2}}{${2}} + \cdots + \binom{n + k}{k} = \binom{n + k + ${1}}{k}`}. Check it for ${math`n = ${N41}`}, ${math`k = ${K41}`}: what is the sum?`,
  answer: { kind: 'exact', expected: String(choose(N41 + K41 + 1, K41)) },
  solution: [
    t`The terms are ${listOf(upTo(K41 + 1).map((i) => choose(N41 + i - 1, i - 1)))}, adding to ${upTo(K41 + 1).reduce((s, i) => s + choose(N41 + i - 1, i - 1), 0)}.`,
    t`And ${math`\binom{${N41 + K41 + 1}}{${K41}} = ${choose(N41 + K41 + 1, K41)}`}.`,
  ],
  reference: String(choose(N41 + K41 + 1, K41)),
  verify: () => same('the diagonal sum against C(8, 4)', upTo(K41 + 1).reduce((s, i) => s + choose(N41 + i - 1, i - 1), 0), choose(N41 + K41 + 1, K41)),
  misconceptions: [{ response: String(choose(N41 + K41, K41)), why: t`That is the last term, ${math`\binom{${N41 + K41}}{${K41}}`}. Add all the terms.` }],
  official: { source: cite('bop', 'Solutions, Chapter 10, exercise 41'), answer: String(choose(N41 + K41 + 1, K41)), agrees: true },
});

const bop1035 = supervision({
  id: 'bop-10-35',
  source: cite('bop', 'Chapter 10, exercise 35'),
  title: t`Even entries`,
  prompt: t`Prove that if ${math`n, k \in \mathbb{N}`}, and ${mn} is even and ${mk} is odd, then ${binom('n', 'k')} is even.`,
  writeUp: 'proof',
  official: cite('bop', 'Solutions, Chapter 10, exercise 35'),
});
const bop1038 = supervision({
  id: 'bop-10-38',
  source: cite('bop', 'Chapter 10, exercise 38'),
  title: t`Vandermonde's identity`,
  prompt: t`Prove that ${math`\sum_{k = ${0}}^{p} \binom{m}{k}\binom{n}{p - k} = \binom{m + n}{p}`} for non-negative integers ${math`m, n, p`}. Book of Proof asks for induction; give a counting proof as well: choose ${math`p`} people from ${math`m`} women and ${mn} men.`,
  writeUp: 'proof',
});
const notesHomework2 = supervision({
  id: 'notes-280-homework-2',
  source: cite('cst-dm-notes', 'printed pages 273 to 280, Theorem 29 and Homework 2'),
  title: t`Finish the Binomial Theorem's inductive step`,
  prompt: t`The notes' scratch work for the inductive step of the Binomial Theorem, ${math`(x + y)^{n + ${1}} = \sum_{k = ${0}}^{n + ${1}} \binom{n + ${1}}{k} x^{n + ${1} - k} y^{k}`}, assumes Pascal's rule. Using Pascal's rule, turn the scratch work into a proof of the inductive step: split off the terms ${math`k = ${0}`} and ${math`k = n + ${1}`}, apply the rule, and recognise ${math`(x + y)^{n}(x + y)`}.`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- Cambridge problems: gates (batch 7)

/*
 * Outline for marking ns2-q3 (20 marks):
 * 1. Ranges: first identity for integers 0 <= k <= n; second for every integer n >= 0 (2).
 * 2. First identity: the right side counts (k + 1)-subsets of {1, ..., n + 1}. Sort them by their
 *    largest element m + 1, for m = k, ..., n: the other k elements are chosen from {1, ..., m}, in
 *    C(m, k) ways. The classes are disjoint and cover everything, so the counts add (8).
 * 3. Second identity: C(2n, n) counts n-subsets of n red and n blue balls. Sort by the number j
 *    of red ones: C(n, j) C(n, n - j) = C(n, j)^2 by symmetry; add over j = 0, ..., n (8).
 * 4. Each "sort by" is a partition, said in words (2).
 */
const ns2q3 = supervision({
  id: 'ns2-q3',
  source: cite('ia-ns-sheet-2', 'Q3'),
  title: t`Two identities by counting`,
  prompt: t`By suitably interpreting each side, establish the identities ${dmath`\binom{k}{k} + \binom{k + ${1}}{k} + \binom{k + ${2}}{k} + \cdots + \binom{n - ${1}}{k} + \binom{n}{k} = \binom{n + ${1}}{k + ${1}}`} and ${dmath`\binom{n}{${0}}^{${2}} + \binom{n}{${1}}^{${2}} + \binom{n}{${2}}^{${2}} + \cdots + \binom{n}{n - ${1}}^{${2}} + \binom{n}{n}^{${2}} = \binom{${2}n}{n}`} for appropriate ranges of the parameters ${mn} and ${mk} (which you should specify).`,
  writeUp: 'proof',
});

/** C(13, 5) + 2 C(13, 6) + C(13, 7), the sum in Grinstead and Snell 3.2.9. */
const G329 = choose(13, 5) + 2 * choose(13, 6) + choose(13, 7);
/** Any n, r with C(n, r) equal to it; n is at most G329, since C(n, r) >= n for 0 < r < n. */
const gs329 = auto({
  id: 'gs-3-2-9',
  source: cite('gs-ch3', 'Section 3.2, Exercise 9 (page 114)'),
  title: t`Three neighbours as one coefficient`,
  prompt: t`Find integers ${mn} and ${mr} such that the following equation is true: ${dmath`\binom{${13}}{${5}} + ${2}\binom{${13}}{${6}} + \binom{${13}}{${7}} = \binom{n}{r}.`} Give ${mn} and ${mr}.`,
  answer: {
    kind: 'witness', count: 2, names: ['n', 'r'], example: 'n = 15, r = 7',
    check: (vals: readonly Rational[]) => {
      const [n, r] = vals.map((v) => (v.den === 1n && v.num >= 0n ? Number(v.num) : NaN)) as [number, number];
      if (Number.isNaN(n) || Number.isNaN(r)) return 'n and r are natural numbers.';
      if (r > n) return 'r is at most n.';
      if (n > G329) return `For 0 < r < n, C(n, r) is at least n, and the sum is only ${G329}.`;
      const c = choose(n, Math.min(r, n - r));
      return c === G329 ? null : `C(${n}, ${r}) is ${c}, but the sum is ${G329}.`;
    },
  },
  solution: [
    t`Split the middle term: the left side is ${math`\left(\binom{${13}}{${5}} + \binom{${13}}{${6}}\right) + \left(\binom{${13}}{${6}} + \binom{${13}}{${7}}\right)`}.`,
    t`Pascal's rule on each bracket: ${math`\binom{${14}}{${6}} + \binom{${14}}{${7}}`}.`,
    t`Pascal's rule again: ${math`\binom{${15}}{${7}}`}, which is ${G329}. So ${math`n = ${15}, r = ${7}`}; by symmetry ${math`r = ${8}`} works too.`,
  ],
  reference: 'n = 15, r = 7',
  verify: () => {
    const e = same('the sum', G329, choose(15, 7));
    if (e !== null) return e;
    return same('Pascal twice, from row 13', (row(13)[5] as number) + 2 * (row(13)[6] as number) + (row(13)[7] as number), row(15)[7]);
  },
  misconceptions: [{ response: 'n = 14, r = 7', why: t`Pascal's rule once gives ${math`\binom{${14}}{${6}} + \binom{${14}}{${7}}`}: two terms of row ${14}. Apply the rule a second time to reach one coefficient in row ${15}.` }],
  official: { source: cite('gs-answers-odd', 'Section 3.2, Exercise 9'), answer: 'n = 15, r = 7', agrees: true },
});

/*
 * Outline for marking gs-3-2-13 (20 marks):
 * 1. The number of j-subsets of a 2n-set is C(2n, j) (2).
 * 2. Ratio of neighbours: C(2n, i)/C(2n, i - 1) = (2n - i + 1)/i for 1 <= i <= 2n, worked from the
 *    factorial formula (6).
 * 3. The ratio exceeds 1 exactly when i < n + 1/2, that is i <= n; it is below 1 for i >= n + 1 (6).
 * 4. So the coefficients strictly rise up to i = n and strictly fall after it: C(2n, n) is larger
 *    than every other C(2n, j) (4). Or by symmetry plus the rising half (equivalent credit).
 * 5. Strictness stated, so "more than any other number" is shown, not only "at least" (2).
 */
const gs3213 = supervision({
  id: 'gs-3-2-13',
  source: cite('gs-ch3', 'Section 3.2, Exercise 13 (page 114)'),
  title: t`The middle of a row is the largest`,
  prompt: t`If a set has ${math`${2}n`} elements, show that it has more subsets with ${mn} elements than with any other number of elements.`,
  writeUp: 'proof',
  official: cite('gs-answers-odd', 'Section 3.2, Exercise 13'),
});

// ---------------------------------------------------------------- lesson

const R = 6;

export const binomialIdentities: TopicContent = {
  topicId: 'comb.binomial-identities',
  goal: t`Prove ${math`\binom{n}{r} = \binom{n}{n - r}`} and Pascal's rule, by algebra and by counting, and use them on Pascal's triangle.`,
  objective: t`Prove symmetry and Pascal's rule two ways, by algebra and by counting the same set twice.`,
  why: t`Pascal's rule is the inductive step of the binomial theorem, and counting twice is a method you will reuse.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`Two coincidences` },
    { kind: 'hook', text: t`A pizza place offers ${5} toppings. Choosing ${2} of them can be done in ${choose(5, 2)} ways. Choosing ${3} can also be done in ${choose(5, 3)} ways. Coincidence? And in the triangle below, every number is the sum of the two above it. Why should counting subsets have anything to do with adding?` },
    { kind: 'narrative', text: t`Neither is a coincidence. Each has a proof by algebra, pushing factorials around, and a proof by counting, which explains why. The counting proofs are the ones worth remembering: they rest on one idea, count the same collection in two ways, and the two answers must agree.` },
    { kind: 'section', title: t`Pascal's triangle` },
    {
      kind: 'definition',
      name: t`Binomial coefficient`,
      formal: t`For integers ${math`${0} \le r \le n`}, ${math`\binom{n}{r}`} is the number of ${mr}-element subsets of an ${mn}-element set, and ${math`\binom{n}{r} = \frac{n!}{r!\,(n - r)!}`}.`,
      plain: t`The number of ways to choose ${mr} things from ${mn} when order does not matter. ${math`\binom{${5}}{${2}} = \frac{${5 * 4 * 3 * 2}}{${2} \times ${3 * 2}} = ${choose(5, 2)}`}.`,
    },
    {
      kind: 'definition',
      name: t`Pascal's triangle`,
      formal: t`[[pascals-triangle|Pascal's triangle]] has row ${mn} equal to ${math`\binom{n}{${0}}, \binom{n}{${1}}, \ldots, \binom{n}{n}`}, for ${math`n = ${0}, ${1}, ${2}, \ldots`}.`,
      plain: t`Rows ${0} to ${R} are listed below. Row ${mn} has ${math`n + ${1}`} entries.`,
    },
    { kind: 'list', items: upTo(R + 1).map((n) => t`${listOf(row(n - 1))}`) },
    { kind: 'section', title: t`Symmetry` },
    { kind: 'theorem', name: t`Symmetry`, statement: t`For integers ${math`${0} \le r \le n`}, ${math`\binom{n}{r} = \binom{n}{n - r}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`By algebra`, text: t`${math`\binom{n}{n - r} = \frac{n!}{(n - r)!\,(n - (n - r))!} = \frac{n!}{(n - r)!\,r!} = \binom{n}{r}`}.`, plain: t`Swap ${mr} for ${math`n - r`}: the two factorials on the bottom swap places.` },
        { label: t`By counting`, text: t`Send each ${mr}-element subset ${math`S`} to its complement, the ${math`(n - r)`}-element set of things not in ${math`S`}. This pairs the ${mr}-subsets one to one with the ${math`(n - r)`}-subsets, so there are equally many.`, plain: t`Choosing ${2} toppings to take is the same as choosing ${3} to leave off.`, why: { q: t`Why is the pairing one to one?`, a: t`Taking the complement twice gives back the set you started with, so no two subsets share a complement and every ${math`(n - r)`}-subset is the complement of one ${mr}-subset.` } },
      ],
    },
    { kind: 'section', title: t`Pascal's rule` },
    { kind: 'theorem', name: t`Pascal's rule`, statement: t`For integers ${math`${1} \le k \le n`}, ${dmath`\binom{n + ${1}}{k} = \binom{n}{k} + \binom{n}{k - ${1}}.`}` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Name the set`, text: t`Let ${math`X`} have ${math`n + ${1}`} elements, and fix one of them, ${math`x`}. The left side counts the ${mk}-element subsets of ${math`X`}.`, plain: t`Think of ${math`n + ${1}`} people, one of them called Ada.` },
        { label: t`Subsets without ${math`x`}`, text: t`These choose all ${mk} elements from the other ${mn}: there are ${math`\binom{n}{k}`}.` },
        { label: t`Subsets with ${math`x`}`, text: t`These contain ${math`x`} and choose the remaining ${math`k - ${1}`} from the other ${mn}: there are ${math`\binom{n}{k - ${1}}`}.` },
        { label: t`Add`, text: t`Every ${mk}-subset either contains ${math`x`} or not, and not both, so the two counts add to ${math`\binom{n + ${1}}{k}`}.` },
      ],
    },
    { kind: 'p', text: t`By algebra instead: put ${math`\frac{n!}{k!\,(n - k)!} + \frac{n!}{(k - ${1})!\,(n - k + ${1})!}`} over the common denominator ${math`k!\,(n - k + ${1})!`}. The top becomes ${math`n!\,\big((n - k + ${1}) + k\big) = (n + ${1})!`}, which gives ${math`\binom{n + ${1}}{k}`}. Both proofs appear in the first worked example below.`, why: { q: t`How does each fraction reach that denominator?`, a: t`Multiply the first top and bottom by ${math`n - k + ${1}`}, since ${math`(n - k + ${1})! = (n - k + ${1})(n - k)!`}; multiply the second by ${mk}, since ${math`k! = k\,(k - ${1})!`}.` } },
    { kind: 'p', text: t`This is why [[pascals-rule|Pascal's rule]] builds the triangle. ${math`\binom{n}{k - ${1}}`} and ${math`\binom{n}{k}`} sit side by side in row ${mn}, and ${math`\binom{n + ${1}}{k}`} sits just below them: every entry is the sum of the two above. In row ${R}, ${math`${choose(R, 2)} + ${choose(R, 3)} = ${choose(R + 1, 3)}`}, which is ${math`\binom{${R + 1}}{${3}}`}.` },
    checkFrom(pascalRule, { n: 8, r: 3 }, t`${math`\binom{${8}}{${3}} + \binom{${8}}{${4}} = ${choose(8, 3)} + ${choose(8, 4)} = ${choose(9, 4)} = \binom{${9}}{${4}}`}, one row down.`),
    { kind: 'section', title: t`Row sums` },
    { kind: 'theorem', statement: t`For every integer ${math`n \ge ${0}`}, ${math`\sum_{k = ${0}}^{n} \binom{n}{k} = ${2}^{n}`}; and for ${math`n \ge ${1}`}, the subsets of even size and of odd size are equally many.` },
    { kind: 'p', text: t`Count the subsets of an ${mn}-element set two ways. By size: ${math`\binom{n}{${0}} + \binom{n}{${1}} + \cdots + \binom{n}{n}`}. By deciding, element by element, in or out: ${math`${2} \times ${2} \times \cdots \times ${2} = ${2}^{n}`}. For the second claim, fix an element ${math`x`} and toggle it: putting ${math`x`} in or taking it out changes the size by one, so it pairs even-size subsets with odd-size ones.` },
    checkFrom(rowSum, { n: 5, kind: 'all' }, t`Row ${5} is ${listOf(row(5))}, which adds to ${math`${2}^{${5}} = ${2 ** 5}`}.`),
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`${math`\binom{n + ${1}}{k} = \binom{n}{k} + \binom{n}{k + ${1}}`}.`, counterexample: t`At ${math`n = ${4}`}, ${math`k = ${1}`}: the left side is ${choose(5, 1)}, the right is ${math`${choose(4, 1)} + ${choose(4, 2)} = ${choose(4, 1) + choose(4, 2)}`}. The two neighbours are ${math`k - ${1}`} and ${mk}.` },
    { kind: 'pitfall', claim: t`The squares of row ${mn} add to ${math`(${2}^{n})^{${2}}`}.`, counterexample: t`Row ${2} is ${listOf(row(2))}; the squares add to ${row(2).reduce((s, x) => s + x * x, 0)}, not ${(2 ** 2) ** 2}. The true sum is ${math`\binom{${2}n}{n}`}, and ${math`\binom{${4}}{${2}} = ${choose(4, 2)}`}.` },
    { kind: 'takeaway', text: t`Count one collection two ways: taking versus leaving gives symmetry, and with or without one fixed element gives Pascal's rule.` },
  ],
  examples: [
    { ...pascalProof, examiner: t`The examiner looks for the set being counted named, the split into two disjoint cases, and in the algebra a common denominator shown, not assumed.` },
    workedCambridge(bop1031),
    worked(pascalRule, { n: 7, r: 3 }, t`Two neighbours in row ${7}`),
  ],
  generators: [nextRow, symmetry, pascalRule, rowSum],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['pascals-triangle', 'pascals-rule'],
  cambridge: withUses([bop1024, bop1040, bop1041, bop1035, bop1038, notesHomework2, ns2q3, gs329, gs3213], {
    'ns2-q3': { sections: ["Pascal's rule", 'Row sums'], note: t`Proving two identities by counting each side` },
    'notes-280-homework-2': { sections: ["Pascal's rule"], note: t`The inductive step of the binomial theorem with Pascal's rule` },
    'gs-3-2-13': { sections: ['Symmetry'], note: t`The middle binomial coefficient is the largest` },
  }),
  // The IA sheet's two identities by counting first; the Pascal's rule homework and the middle of a
  // row follow. Three coefficients into one is two uses of Pascal's rule, practice rather than a gate.
  gate: ['ns2-q3', 'notes-280-homework-2', 'gs-3-2-13'],
  recall: [
    { front: t`Symmetry of binomial coefficients.`, back: t`${math`\binom{n}{r} = \binom{n}{n - r}`}: taking ${mr} is leaving ${math`n - r`}.` },
    { front: t`[[pascals-rule|Pascal's rule]].`, back: t`${math`\binom{n + ${1}}{k} = \binom{n}{k} + \binom{n}{k - ${1}}`}, for ${math`${1} \le k \le n`}.` },
    { front: t`The sum of row ${mn} of Pascal's triangle.`, back: t`${math`${2}^{n}`}, the number of subsets of an ${mn}-element set.` },
  ],
  proofOrder: [
    {
      title: t`Pascal's rule by counting`,
      steps: [
        t`Count the ${mk}-element subsets of a set of ${math`n + ${1}`}, with one element ${math`x`} fixed.`,
        t`Those without ${math`x`} choose ${mk} from the other ${mn}: ${math`\binom{n}{k}`}.`,
        t`Those with ${math`x`} choose ${math`k - ${1}`} more from the other ${mn}: ${math`\binom{n}{k - ${1}}`}.`,
        t`Every subset is in exactly one case, so ${math`\binom{n + ${1}}{k} = \binom{n}{k} + \binom{n}{k - ${1}}`}.`,
      ],
    },
  ],
};
