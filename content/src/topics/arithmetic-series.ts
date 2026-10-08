/**
 * alg.arithmetic-series: The nth term and the sum of an arithmetic sequence. The Cambridge
 * source is CST supervision exercise 1.3.1, whose triangular numbers t_k = 0 + 1 + ... + k
 * are arithmetic sums: parts (a) to (d) are set in pre.sequences, and parts (e) (Euler: if
 * n is triangular, so are 9n + 1, 25n + 3, 49n + 6, 81n + 10) and (f) (Jordan's
 * generalisation) are here, checked against the 2023-24 official solutions. Their written
 * proofs are in proof.direct (Rule 1, 2026-10-08).
 */
import { auto, cite, same, withUses } from '../cambridge';
import { int, pick, upTo } from '../math';
import { generator, type Misconception } from '../problem';
import { poly } from '../poly';
import { computedMath as cm, dmath, listOf, math, paren, t } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

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

// ---------------------------------------------------------------- lesson

const G = 100;
const pit = { a: 3, d: 4, n: 10 };

export const arithmeticSeries: TopicContent = {
  topicId: 'alg.arithmetic-series',
  goal: t`Find the ${mn}th term and the sum of the first ${mn} terms of an arithmetic sequence.`,
  objective: t`Find any term of an arithmetic sequence and the sum of its first ${mn} terms.`,
  why: t`Sums like ${math`${1} + ${2} + \cdots + n`} appear in counting and running-time arguments, starting with triangular numbers.`,
  minutes: 15,
  lesson: [
    { kind: 'section', title: t`A hundred numbers in your head` },
    { kind: 'hook', text: t`What is ${math`${1} + ${2} + ${3} + \cdots + ${G}`}? Adding one at a time takes ${G - 1} additions. There is a way to do it in one line, and the story goes that Gauss found it as a schoolboy. Before reading on, try pairing the first number with the last.` },
    { kind: 'narrative', text: t`${1} and ${G} make ${G + 1}. So do ${2} and ${G - 1}, and ${3} and ${G - 2}. Every pair makes ${G + 1}, and there are ${G / 2} pairs, so the total is ${math`${G / 2} \times ${G + 1} = ${(G * (G + 1)) / 2}`}. What made this work is that the numbers go up by the same amount each time. Let's name that property and see how far the trick reaches.` },
    { kind: 'section', title: t`Arithmetic sequences` },
    {
      kind: 'definition',
      name: t`Arithmetic sequence`,
      formal: t`A sequence ${math`(a_{n})_{n \ge ${1}}`} is arithmetic, with first term ${ma} and common difference ${md}, if ${math`a_{${1}} = a`} and ${math`a_{n + ${1}} = a_{n} + d`} for every ${math`n \ge ${1}`}.`,
      plain: t`Start at ${ma} and keep adding the same number ${md}. With ${math`a = ${7}`} and ${math`d = ${5}`}: ${listOf([7, 12, 17, 22])}, and so on. ${md} may be negative: ${listOf([10, 7, 4, 1])} has ${math`d = ${-3}`}.`,
    },
    { kind: 'theorem', name: t`The ${mn}th term`, statement: t`If ${math`(a_{n})`} is arithmetic with first term ${ma} and common difference ${md}, then ${math`a_{n} = a + (n - ${1})d`} for every ${math`n \ge ${1}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Write the term as a sum of steps`, text: t`${math`a_{n} = a_{${1}} + (a_{${2}} - a_{${1}}) + (a_{${3}} - a_{${2}}) + \cdots + (a_{n} - a_{n - ${1}})`}.`, plain: t`Every term in between appears once with a plus and once with a minus, so they cancel and leave ${math`a_{n}`}.` },
        { label: t`Each step is ${md}`, text: t`By the definition, each bracket ${math`a_{i + ${1}} - a_{i}`} equals ${md}, and there are ${math`n - ${1}`} brackets, one for each ${math`i = ${1}, \ldots, n - ${1}`}.` },
        { label: t`Add them up`, text: t`${math`a_{n} = a + (n - ${1})d`}.`, plain: t`To get from the ${1}st term to the ${mn}th you take ${math`n - ${1}`} steps, not ${mn}: like the gaps between fence posts.` },
      ],
    },
    checkFrom(nthTerm, { a: 5, d: 3, n: 20 }, t`From the ${1}st term to the ${20}th is ${20 - 1} steps of ${3}: ${math`${5} + ${20 - 1} \times ${3} = ${5 + 19 * 3}`}.`),
    { kind: 'section', title: t`The sum: pair the ends` },
    {
      kind: 'definition',
      name: t`Arithmetic series`,
      formal: t`The [[arithmetic-series|arithmetic series]] of the sequence is ${math`S_{n} = a_{${1}} + a_{${2}} + \cdots + a_{n} = \sum_{i = ${1}}^{n} a_{i}`}, the sum of its first ${mn} terms.`,
      plain: t`For ${listOf([7, 12, 17, 22])}, ${math`S_{${4}} = ${7 + 12 + 17 + 22}`}.`,
    },
    { kind: 'theorem', name: t`Sum of an arithmetic series`, statement: t`With last term ${math`l = a_{n} = a + (n - ${1})d`}, ${dmath`S_{n} = \frac{n(a + l)}{${2}} = \frac{n}{${2}}\big(${2}a + (n - ${1})d\big).`}` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Write it forwards and backwards`, text: t`${math`S_{n} = a_{${1}} + a_{${2}} + \cdots + a_{n}`} and ${math`S_{n} = a_{n} + a_{n - ${1}} + \cdots + a_{${1}}`}.`, plain: t`Same terms, opposite order, so the same total.` },
        { label: t`Add in columns`, text: t`The ${math`i`}th column is ${math`a_{i} + a_{n + ${1} - i} = \big(a + (i - ${1})d\big) + \big(a + (n - i)d\big) = ${2}a + (n - ${1})d`}.`, plain: t`Moving one place in, the top term goes up by ${md} and the bottom term goes down by ${md}, so every column has the same total: first plus last, ${math`a + l`}.`, why: { q: t`Why is ${math`${2}a + (n - ${1})d`} the same as ${math`a + l`}?`, a: t`Because ${math`l = a + (n - ${1})d`}, so ${math`a + l = ${2}a + (n - ${1})d`}.` } },
        { label: t`Count the columns`, text: t`There are ${mn} columns, so ${math`${2}S_{n} = n(a + l)`}.` },
        { label: t`Halve`, text: t`${math`S_{n} = \frac{n(a + l)}{${2}}`}.`, plain: t`In words: the number of terms times the average of the first and last.` },
      ],
    },
    { kind: 'p', text: t`Notice the proof never needed ${mn} to be even. With ${math`${1} + ${2} + ${3}`}, the middle column is ${math`${2} + ${2}`}: the middle term pairs with itself, and the formula still gives ${math`\frac{${3} \times ${4}}{${2}} = ${6}`}.` },
    checkFrom(series, { a: 2, d: 3, n: 10 }, t`The last term is ${math`${2} + ${9} \times ${3} = ${2 + 9 * 3}`}, so the sum is ${math`\frac{${10} \times (${2} + ${2 + 9 * 3})}{${2}} = ${(10 * (2 + 29)) / 2}`}.`),
    { kind: 'section', title: t`Triangular numbers` },
    { kind: 'narrative', text: t`Stack dots in rows of ${1}, ${2}, ${3}, and so on, and you get triangles. The CST supervision exercises study these numbers, and every fact about them starts from the sum formula.` },
    {
      kind: 'definition',
      name: t`Triangular number`,
      formal: t`For a natural number ${mk}, the ${mk}th triangular number is ${math`t_{k} = ${0} + ${1} + \cdots + k`}. A natural number is triangular if it equals ${math`t_{k}`} for some ${mk}.`,
      plain: t`${listOf(upTo(6).map((k) => tri(k - 1)))}, and so on: ${math`t_{${3}} = ${0} + ${1} + ${2} + ${3} = ${tri(3)}`}.`,
    },
    { kind: 'p', text: t`This is an arithmetic series with first term ${0}, last term ${mk}, and ${math`k + ${1}`} terms (count the ${0}), so ${math`t_{k} = \frac{(k + ${1})(${0} + k)}{${2}} = \frac{k(k + ${1})}{${2}}`}. With the formula, facts become algebra. For instance ${math`${8}t_{k} + ${1} = ${4}k^{${2}} + ${4}k + ${1} = (${2}k + ${1})^{${2}}`}: eight times a triangular number, plus one, is always a square.` },
    { kind: 'p', text: t`To show an expression equals some ${math`t_{q}`}, aim for the shape ${math`\frac{q(q + ${1})}{${2}}`}: multiply by ${2} and complete the square in ${math`q^{${2}} + q`}. That is how Euler's map ${math`n \mapsto ${9}n + ${1}`}, worked below, sends triangular numbers to triangular numbers.` },
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`The ${mn}th term is ${math`a + nd`}.`, counterexample: t`For ${listOf([pit.a, pit.a + pit.d, pit.a + 2 * pit.d])}, the ${pit.n}th term is ${math`${pit.a} + ${pit.n - 1} \times ${pit.d} = ${pit.a + (pit.n - 1) * pit.d}`}, not ${pit.a + pit.n * pit.d}. There are ${pit.n - 1} steps between ${pit.n} terms.` },
    { kind: 'pitfall', claim: t`${math`${0} + ${1} + \cdots + k`} has ${mk} terms.`, counterexample: t`${math`${0} + ${1} + ${2} + ${3}`} has ${4} terms. Using ${mk} terms would give ${math`\frac{${3} \times ${3}}{${2}}`}, not ${tri(3)}. Count the terms by ${math`\frac{l - a}{d} + ${1}`}.` },
    { kind: 'takeaway', text: t`An arithmetic sequence takes ${math`n - ${1}`} steps to reach its ${mn}th term, and its sum is the number of terms times the average of the first and last.` },
  ],
  examples: [
    { ...workedCambridge(e9), examiner: t`The examiner looks for the formula ${math`t_{k} = \frac{k(k + ${1})}{${2}}`} used, the square completed, and a natural number ${math`q`} named explicitly.` },
    worked(series, { a: 3, d: 4, n: 20 }, t`Twenty terms`),
    worked(howMany, { a: 7, d: 5, m: 31 }, t`Counting terms`),
  ],
  generators: [nthTerm, series, howMany, triangularMap],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['arithmetic-series'],
  cambridge: withUses([e25, e81, f], {
    'sw-1-3-1-f': { sections: ['Triangular numbers'], note: t`Finding the witness in terms of the two letters` },
    'sw-1-3-1-e-81': { sections: ['Triangular numbers'], note: t`Matching a triangular-number formula to find the new index` },
    'sw-1-3-1-e-25': { sections: ['Triangular numbers'], note: t`Matching a triangular-number formula to find the new index` },
  }),
  // The two written proofs of 1.3.1(e) and (f) are set in proof.direct, the first topic that teaches writing
  // one (Rule 1, 2026-10-08); their auto-checked parts gate.
  gate: ['sw-1-3-1-f', 'sw-1-3-1-e-81', 'sw-1-3-1-e-25'],
  recall: [
    { front: t`The ${mn}th term of an arithmetic sequence with first term ${ma} and difference ${md}.`, back: t`${math`a_{n} = a + (n - ${1})d`}.` },
    { front: t`The sum of the first ${mn} terms of an arithmetic sequence.`, back: t`${math`S_{n} = \frac{n(a + l)}{${2}} = \frac{n}{${2}}\big(${2}a + (n - ${1})d\big)`}, where ${math`l`} is the last term.` },
    { front: t`The ${mk}th triangular number.`, back: t`${math`t_{k} = ${0} + ${1} + \cdots + k = \frac{k(k + ${1})}{${2}}`}.` },
  ],
  proofOrder: [
    {
      title: t`The sum of an arithmetic series`,
      steps: [
        t`Write ${math`S_{n}`} forwards, and again backwards underneath.`,
        t`Each column adds to ${math`a_{i} + a_{n + ${1} - i} = ${2}a + (n - ${1})d = a + l`}.`,
        t`There are ${mn} columns, so ${math`${2}S_{n} = n(a + l)`}.`,
        t`Halve: ${math`S_{n} = \frac{n(a + l)}{${2}}`}.`,
      ],
    },
  ],
};
