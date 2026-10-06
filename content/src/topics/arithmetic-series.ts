/**
 * alg.arithmetic-series: The nth term and the sum of an arithmetic sequence. The Cambridge
 * source is CST supervision exercise 1.3.1, whose triangular numbers t_k = 0 + 1 + ... + k
 * are arithmetic sums: parts (a) to (d) are set in pre.sequences, and parts (e) (Euler: if
 * n is triangular, so are 9n + 1, 25n + 3, 49n + 6, 81n + 10) and (f) (Jordan's
 * generalisation) are here, checked against the 2023-24 official solutions.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { int, pick, upTo } from '../math';
import { generator, type Misconception } from '../problem';
import { poly } from '../poly';
import { computedMath as cm, dmath, listOf, math, paren, t } from '../rich';
import { worked, workedCambridge, type TopicContent } from '../topic';

const [mn, mk, ma, md] = [math`n`, math`k`, math`a`, math`d`];
const tri = (k: number): number => (k * (k + 1)) / 2;
const KDOM = { k: { kind: 'integer' as const, min: 0, max: 40 } };

// ---------------------------------------------------------------- generators

interface TermP { a: number; d: number; n: number }

const nthTerm = generator<TermP>({
  id: 'nth-term',
  skill: 'Find a term of an arithmetic sequence: the nth term is a + (n - 1)d.',
  // A first term of zero would make "forgot the first term" right.
  params: (rng) => ({ a: pick(rng, [-10, -7, -4, -1, 1, 2, 3, 5, 8, 11, 14, 20]), d: pick(rng, [-7, -5, -3, -2, 2, 3, 4, 5, 6, 9]), n: int(rng, 12, 60) }),
  sane: ({ a, d, n }) => (a !== 0 && d !== 0 && n >= 12 ? null : 'out of range'),
  problem: ({ a, d, n }) => ({
    prompt: t`An arithmetic sequence begins ${listOf([a, a + d, a + 2 * d])}, and so on. What is its ${n}th term?`,
    answer: { kind: 'exact', expected: String(a + (n - 1) * d) },
    solution: [
      t`The first term is ${math`a = ${a}`} and the common difference is ${math`d = ${a + d} - ${paren(a)} = ${d}`}.`,
      t`To reach term ${n} from term ${1} takes ${math`${n} - ${1} = ${n - 1}`} steps of ${d}: ${math`${a} + ${n - 1} \times ${paren(d)} = ${a + (n - 1) * d}`}.`,
    ],
  }),
  solve: ({ a, d, n }) => {
    let x = a;
    for (let i = 1; i < n; i++) x += d;
    return String(x);
  },
  misconceptions: ({ a, d, n }): Misconception[] => [
    { response: String(a + n * d), why: t`From term ${1} to term ${n} there are ${n - 1} steps, not ${n}: the ${n}th term is ${math`a + (n - ${1})d`}.` },
    { response: String((n - 1) * d), why: t`Start from the first term: add ${math`a = ${a}`}.` },
  ],
});

interface SumP { a: number; d: number; n: number }

const series = generator<SumP>({
  id: 'sum',
  skill: 'Sum an arithmetic series: n times the average of the first and last terms.',
  params: (rng) => {
    for (;;) {
      const p = { a: int(rng, -9, 15), d: pick(rng, [-4, -3, -2, 1, 2, 3, 4, 5, 7]), n: int(rng, 8, 40) };
      // A zero sum would make "forgot to halve" right.
      if (2 * p.a + (p.n - 1) * p.d !== 0) return p;
    }
  },
  sane: ({ a, d, n }) => (d !== 0 && n >= 8 && 2 * a + (n - 1) * d !== 0 ? null : 'out of range'),
  problem: ({ a, d, n }) => {
    const l = a + (n - 1) * d;
    return {
      prompt: t`Find the sum of the first ${n} terms of the arithmetic sequence ${listOf([a, a + d, a + 2 * d])}, and so on.`,
      answer: { kind: 'exact', expected: String((n * (a + l)) / 2) },
      solution: [
        t`The last term is ${math`a + (n - ${1})d = ${l}`}.`,
        t`Pair the first term with the last, the second with the second last, and so on: each pair adds to ${math`${a} + ${paren(l)} = ${a + l}`}. So the sum is ${math`\frac{n(a + l)}{${2}} = \frac{${n} \times ${paren(a + l)}}{${2}} = ${(n * (a + l)) / 2}`}.`,
      ],
    };
  },
  solve: ({ a, d, n }) => String(upTo(n).reduce((s, i) => s + a + (i - 1) * d, 0)),
  misconceptions: ({ a, d, n }): Misconception[] => {
    const l = a + (n - 1) * d;
    return [
      { response: String(n * (a + l)), why: t`That adds every pair twice: there are ${math`\frac{n}{${2}}`} pairs, so halve it.` },
      { response: String((n * (2 * a + n * d)) / 2), why: t`The last term is ${math`a + (n - ${1})d`}, not ${math`a + nd`}.` },
    ];
  },
});

interface CountP { a: number; d: number; m: number }

const howMany = generator<CountP>({
  id: 'how-many-terms',
  skill: 'Count the terms of an arithmetic sequence from its first term, last term, and common difference.',
  params: (rng) => ({ a: int(rng, -20, 30), d: pick(rng, [2, 3, 4, 5, 6, 7, 11]), m: int(rng, 8, 60) }),
  sane: ({ d, m }) => (d >= 2 && m >= 8 ? null : 'out of range'),
  problem: ({ a, d, m }) => {
    const l = a + (m - 1) * d;
    return {
      prompt: t`How many terms are in the sequence ${listOf([a, a + d, a + 2 * d])}, ${math`\ldots, ${l}`}?`,
      answer: { kind: 'exact', expected: String(m) },
      solution: [
        t`From ${a} to ${l} is ${math`${l} - ${paren(a)} = ${l - a}`}, which is ${math`\frac{${l - a}}{${d}} = ${m - 1}`} steps of ${d}.`,
        t`${m - 1} steps join ${m} terms: count the starting term too.`,
      ],
    };
  },
  solve: ({ a, d, m }) => {
    const l = a + (m - 1) * d;
    let count = 0;
    for (let x = a; x <= l; x += d) count++;
    return String(count);
  },
  misconceptions: ({ m }): Misconception[] => [
    { response: String(m - 1), why: t`That counts the steps between terms. There is one more term than there are steps.` },
    { response: String(m + 1), why: t`The number of terms is the number of steps plus one, not plus two.` },
  ],
});

interface MapP { j: number }

const triangularMap = generator<MapP>({
  id: 'triangular-map',
  skill: 'Write a triangular number in terms of another, as in CST supervision exercise 1.3.1(e) and (f): (2j + 1)² t_k + t_j = t_q.',
  params: (rng) => ({ j: int(rng, 1, 6) }),
  sane: ({ j }) => (j >= 1 && j <= 6 ? null : 'out of range'),
  problem: ({ j }) => {
    const m = 2 * j + 1;
    return {
      prompt: t`Let ${math`t_k = ${0} + ${1} + \cdots + k = \frac{k(k + ${1})}{${2}}`}. Show that if ${mn} is triangular, so is ${math`${m * m}n + ${tri(j)}`}: if ${math`n = t_k`}, then ${math`${m * m}n + ${tri(j)} = t_q`} for which ${math`q`}, in terms of ${mk}?`,
      answer: { kind: 'expression', expected: poly([m, j], 'k'), variables: ['k'], domains: KDOM },
      solution: [
        t`${math`${m * m}t_k + ${tri(j)} = \frac{${m * m}k^{${2}} + ${m * m}k + ${2 * tri(j)}}{${2}}`}. A triangular number ${math`t_q = \frac{q^{${2}} + q}{${2}}`}, so look for ${math`q`} with ${math`q^{${2}} + q = ${m * m}k^{${2}} + ${m * m}k + ${2 * tri(j)}`}.`,
        t`The ${math`k^{${2}}`} term suggests ${math`q = ${m}k + c`}. Then ${math`q^{${2}} + q = ${m * m}k^{${2}} + ${m}(${2}c + ${1})k + c(c + ${1})`}: matching gives ${math`${2}c + ${1} = ${m}`}, so ${math`c = ${j}`}, and ${math`c(c + ${1}) = ${j * (j + 1)}`} matches too.`,
        t`So ${math`q = ${cm(poly([m, j], 'k'))}`}.`,
      ],
    };
  },
  solve: ({ j }) => {
    // Search q for k = 0 and k = 1, and read off the line through them.
    const m = 2 * j + 1;
    const qOf = (k: number): number => upTo(500).map((x) => x - 1).find((q) => tri(q) === m * m * tri(k) + tri(j)) ?? -1;
    const q0 = qOf(0);
    return poly([qOf(1) - q0, q0], 'k');
  },
  misconceptions: ({ j }): Misconception[] => {
    const m = 2 * j + 1;
    return [
      { response: poly([m, 0], 'k'), why: t`At ${math`k = ${0}`}, ${math`t_{${0}} = ${0}`}, and ${math`${m * m} \cdot ${0} + ${tri(j)} = ${tri(j)} = t_{${j}}`}: so ${math`q`} has a constant term ${j}.` },
      { response: poly([m * m, j], 'k'), why: t`${math`t_q`} grows like ${math`\frac{q^{${2}}}{${2}}`}, so for ${math`t_q`} to be about ${m * m} times ${math`t_k`}, ${math`q`} is about ${m} times ${mk}, not ${m * m} times.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

const SW = 'cst-dm-sw1';
const SOLS = 'cst-dm-sols-2324-1';

/** Euler's maps, sheet 1.3.1(e): m²n + t_j is triangular with q = mk + j when n = t_k. */
function euler(o: { id: string; m: number; j: number; worked?: boolean }) {
  const q = poly([o.m, o.j], 'k');
  return auto({
    id: o.id,
    source: cite(SW, 'Exercises 1, 1.3.1(e)', true),
    title: t`Euler: ${math`${o.m * o.m}n + ${tri(o.j)}`} is triangular`,
    prompt: t`A natural number is triangular if it is ${math`t_k = ${0} + ${1} + \cdots + k`} for some natural ${mk}. Euler (${1775}) showed that if ${mn} is triangular, then so is ${math`${o.m * o.m}n + ${tri(o.j)}`}. If ${math`n = t_k`}, then ${math`${o.m * o.m}n + ${tri(o.j)} = t_q`}: what is ${math`q`}, in terms of ${mk}?`,
    answer: { kind: 'expression', expected: q, variables: ['k'], domains: KDOM },
    solution: [
      t`With ${math`t_k = \frac{k(k + ${1})}{${2}}`}: ${math`${o.m * o.m}t_k + ${tri(o.j)} = \frac{${o.m * o.m}k^{${2}} + ${o.m * o.m}k + ${2 * tri(o.j)}}{${2}}`}.`,
      t`Complete the square, as the official solution does: ${math`${o.m * o.m}k^{${2}} + ${o.m * o.m}k + ${2 * tri(o.j)} = (${o.m}k + ${o.j})^{${2}} + (${o.m}k + ${o.j})`}.`,
      t`So it is ${math`\frac{q(q + ${1})}{${2}} = t_q`} with ${math`q = ${cm(q)}`}.`,
    ],
    reference: q,
    verify: () => {
      for (let k = 0; k <= 30; k++) {
        const e = same(`k = ${k}`, tri(o.m * k + o.j), o.m * o.m * tri(k) + tri(o.j));
        if (e !== null) return e;
      }
      return null;
    },
    misconceptions: [{ response: poly([o.m, 0], 'k'), why: t`Check ${math`k = ${0}`}: ${math`${o.m * o.m} \cdot ${0} + ${tri(o.j)} = t_{${o.j}}`}, so ${math`q = ${o.j}`} there.` }],
    // The solutions: 9n + 1 = t_{3k+1}, 25n + 3 = t_{5k+2}, 49n + 6 = t_{7k+3}, 81n + 10 = t_{9k+4}.
    official: { source: cite(SOLS, '1.3.1(e)'), answer: `${o.m}k + ${o.j}`, agrees: true },
  });
}

const e9 = euler({ id: 'sw-1-3-1-e-9', m: 3, j: 1 });
const e25 = euler({ id: 'sw-1-3-1-e-25', m: 5, j: 2 });
const e81 = euler({ id: 'sw-1-3-1-e-81', m: 9, j: 4 });

const f = auto({
  id: 'sw-1-3-1-f',
  source: cite(SW, 'Exercises 1, 1.3.1(f)', true),
  title: t`Jordan's generalisation`,
  prompt: t`For all natural numbers ${mn} and ${mk} there is a natural number ${math`q`} with ${math`(${2}n + ${1})^{${2}} \cdot t_k + t_n = t_q`} (Jordan, ${1991}, attributed to Euler). Find ${math`q`} in terms of ${mn} and ${mk}.`,
  answer: { kind: 'expression', expected: '(2n + 1)k + n', variables: ['n', 'k'], domains: { n: { kind: 'integer', min: 0, max: 20 }, k: { kind: 'integer', min: 0, max: 20 } } },
  solution: [
    t`Part (e) gives the pattern: ${math`(${2}n + ${1})^{${2}}`} is ${9}, ${25}, ${49}, ${81} for ${math`n = ${1}, ${2}, ${3}, ${4}`}, and ${math`q`} was ${math`${3}k + ${1}`}, ${math`${5}k + ${2}`}, ${math`${7}k + ${3}`}, ${math`${9}k + ${4}`}: so ${math`q = (${2}n + ${1})k + n`}.`,
    t`Check by expanding: ${math`q(q + ${1}) = (${2}n + ${1})^{${2}}k(k + ${1}) + n(n + ${1})`}, so ${math`t_q = (${2}n + ${1})^{${2}}t_k + t_n`}. The official solution chooses ${math`q = ${2}nk + n + k`}, the same.`,
  ],
  reference: '2nk + n + k',
  verify: () => {
    for (let n = 0; n <= 12; n++) for (let k = 0; k <= 12; k++) {
      const e = same(`n = ${n}, k = ${k}`, tri((2 * n + 1) * k + n), (2 * n + 1) ** 2 * tri(k) + tri(n));
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [{ response: '(2n + 1)k', why: t`Check ${math`k = ${0}`}: the equation says ${math`t_n = t_q`}, so ${math`q = n`} there.` }],
  official: { source: cite(SOLS, '1.3.1(f)'), answer: '2nk + n + k', agrees: true },
});

const eProof = supervision({
  id: 'sw-1-3-1-e',
  source: cite(SW, 'Exercises 1, 1.3.1(e)'),
  title: t`Euler's four maps`,
  prompt: t`Show that, for all natural numbers ${mn}, if ${mn} is triangular, then so are ${math`${9}n + ${1}`}, ${math`${25}n + ${3}`}, ${math`${49}n + ${6}`}, and ${math`${81}n + ${10}`}. (Euler, ${1775}.)`,
  writeUp: 'proof',
  official: cite(SOLS, '1.3.1(e)'),
});
const fProof = supervision({
  id: 'sw-1-3-1-f-proof',
  source: cite(SW, 'Exercises 1, 1.3.1(f)'),
  title: t`Prove Jordan's generalisation`,
  prompt: t`Prove: for all natural numbers ${mn} and ${mk}, there exists a natural number ${math`q`} such that ${math`(${2}n + ${1})^{${2}} \cdot t_k + t_n = t_q`}. Name your witness ${math`q`} and check it by algebra.`,
  writeUp: 'proof',
  official: cite(SOLS, '1.3.1(f)'),
});

// ---------------------------------------------------------------- lesson

const G = 100;

export const arithmeticSeries: TopicContent = {
  topicId: 'alg.arithmetic-series',
  goal: t`Find the ${mn}th term and the sum of the first ${mn} terms of an arithmetic sequence.`,
  lesson: [
    { kind: 'p', text: t`An arithmetic sequence adds the same common difference ${md} each time, starting from a first term ${ma}: ${math`a, a + d, a + ${2}d, \ldots`}. Its ${mn}th term is ${math`a + (n - ${1})d`}, since reaching it takes ${math`n - ${1}`} steps.` },
    { kind: 'p', text: t`An [[arithmetic-series|arithmetic series]] is the sum of such terms. The trick, often credited to the young Gauss: write the sum forwards and backwards and add. For ${math`${1} + ${2} + \cdots + ${G}`}, each of the ${G} columns adds to ${G + 1}, so twice the sum is ${math`${G} \times ${G + 1}`}, and the sum is ${(G * (G + 1)) / 2}.` },
    { kind: 'rule', text: t`With first term ${ma}, last term ${math`l = a + (n - ${1})d`}, and ${mn} terms: ${dmath`S_n = \frac{n(a + l)}{${2}} = \frac{n}{${2}}\big(${2}a + (n - ${1})d\big) = \sum_{i = ${1}}^{n} \big(a + (i - ${1})d\big).`}` },
    { kind: 'p', text: t`The triangular numbers of the CST supervision exercises are arithmetic series: ${math`t_k = ${0} + ${1} + \cdots + k = \frac{k(k + ${1})}{${2}}`}, so ${listOf(upTo(6).map((k) => tri(k - 1)))} and so on. Many facts about them come from this formula and a little algebra: for example ${math`${8}t_k + ${1} = (${2}k + ${1})^{${2}}`}, a square.` },
    { kind: 'p', text: t`Euler noticed more (exercise ${math`${1}.${3}.${1}`}(e)): if ${mn} is triangular then so is ${math`${9}n + ${1}`}. With ${math`n = t_k`}, ${math`${9}t_k + ${1} = t_{${3}k + ${1}}`}. Finding the ${math`q`} with ${math`t_q`} equal to a given expression is a matter of completing the square in ${math`q(q + ${1})`}.` },
  ],
  examples: [
    workedCambridge(e9),
    worked(series, { a: 3, d: 4, n: 20 }, t`Twenty terms`),
    worked(howMany, { a: 7, d: 5, m: 31 }, t`Counting terms`),
  ],
  generators: [nthTerm, series, howMany, triangularMap],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['arithmetic-series'],
  cambridge: [e25, e81, f, eProof, fProof],
  gate: ['sw-1-3-1-e-25', 'sw-1-3-1-e-81', 'sw-1-3-1-f', 'sw-1-3-1-e', 'sw-1-3-1-f-proof'],
};
