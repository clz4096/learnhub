/**
 * comb.binomial-theorem: Expanding (x + y)^n with binomial coefficients, and reading off
 * sums such as 2^n. From the CST notes on the Binomial Theorem (printed pages 122 to 125:
 * Theorem 30, Corollaries 31 and 32, the Theorem of the Day sheet, (m + n)^p) and the
 * Freshman's Dream (Corollary 33, printed pages 125 and 126), whose first argument is the
 * binomial theorem with every middle coefficient a multiple of p. The proof of the theorem
 * itself (printed page 271) is comb.binomial-theorem-proof.
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { int, pick, upTo } from '../math';
import { poly } from '../poly';
import { generator, type Misconception } from '../problem';
import { computedMath, computedTex, dmath, listOf, math, paren, t } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

const [mn, mk, mx, my] = [math`n`, math`k`, math`x`, math`y`];

/** C(n, k) by the multiplicative formula. */
function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let v = 1;
  for (let i = 1; i <= k; i++) v = (v * (n - k + i)) / i;
  return Math.round(v);
}

/** The coefficients of a polynomial raised to a power, by repeated multiplication: independent of the theorem. */
function power(coeffs: readonly number[], n: number): number[] {
  let out = [1];
  for (let i = 0; i < n; i++) {
    const next = Array.from({ length: out.length + coeffs.length - 1 }, () => 0);
    out.forEach((a, j) => coeffs.forEach((b, l) => { next[j + l] = (next[j + l] as number) + a * b; }));
    out = next;
  }
  return out;
}

// ---------------------------------------------------------------- generators

interface CoefP { a: number; b: number; n: number; k: number }

const coefficient = generator<CoefP>({
  id: 'coefficient',
  skill: 'Find one coefficient of (ax + b)^n: the term with x^k is C(n, k) (ax)^k b^(n - k).',
  params: (rng) => {
    for (;;) {
      const p: CoefP = { a: pick(rng, [2, 3]), b: pick(rng, [-3, -2, -1, 1, 2, 3]), n: int(rng, 4, 7), k: 0 };
      p.k = int(rng, 2, p.n - 1);
      // Keep the slips apart: no symmetric k, so swapping the powers changes the answer.
      if (2 * p.k !== p.n) return p;
    }
  },
  sane: ({ a, b, n, k }) => (a >= 2 && b !== 0 && n >= 4 && n <= 7 && k >= 2 && k < n && 2 * k !== n ? null : 'out of range'),
  problem: ({ a, b, n, k }) => {
    const c = choose(n, k) * a ** k * b ** (n - k);
    return {
      prompt: t`Find the coefficient of ${math`x^{${k}}`} in the expansion of ${computedMath(`(${poly([a, b])})^${n}`)}.`,
      answer: { kind: 'exact', expected: String(c) },
      solution: [
        t`By the [[binomial-theorem|binomial theorem]] the term with ${math`x^{${k}}`} takes ${math`${a}x`} from ${k} of the ${n} brackets and ${math`${b}`} from the other ${n - k}: ${math`\binom{${n}}{${k}} (${a}x)^{${k}} (${b})^{${n - k}}`}.`,
        t`That is ${math`${choose(n, k)} \times ${a ** k} \times ${paren(b ** (n - k))} = ${c}`}, so the coefficient is ${c}.`,
      ],
    };
  },
  solve: ({ a, b, n, k }) => String(power([b, a], n)[k]),
  misconceptions: ({ a, b, n, k }): Misconception[] => [
    { response: String(a ** k * b ** (n - k)), why: t`The binomial coefficient ${math`\binom{${n}}{${k}}`} is missing: it counts the ways to pick which ${k} brackets give the ${mx}.` },
    { response: String(choose(n, k) * b ** (n - k)), why: t`The ${a} in ${math`${a}x`} is raised to the power ${k} too: ${math`(${a}x)^{${k}} = ${a ** k}x^{${k}}`}.` },
    { response: String(choose(n, k) * a ** (n - k) * b ** k), why: t`The powers are swapped: ${math`x^{${k}}`} comes from ${k} factors of ${math`${a}x`}, so ${a} has power ${k} and ${b} has power ${n - k}.` },
  ],
});

interface ExpP { c: number; n: number }

const expand = generator<ExpP>({
  id: 'expand',
  skill: 'Expand (x + c)^n in full with the binomial coefficients from Pascal\'s triangle.',
  params: (rng) => ({ c: pick(rng, [-3, -2, -1, 1, 2, 3, 4]), n: int(rng, 3, 5) }),
  sane: ({ c, n }) => (c !== 0 && n >= 3 && n <= 5 ? null : 'out of range'),
  problem: ({ c, n }) => {
    const coeffs = upTo(n + 1).map((i) => choose(n, i - 1) * c ** (i - 1));
    return {
      prompt: t`Expand ${computedMath(`(${poly([1, c])})^${n}`)} fully.`,
      answer: { kind: 'expression', expected: poly(coeffs), variables: ['x'], form: 'expanded' },
      solution: [
        t`Row ${n} of Pascal's triangle gives the [[binomial-coefficient|binomial coefficients]] ${listOf(upTo(n + 1).map((i) => choose(n, i - 1)))}.`,
        t`The term with ${math`x^{${n} - k}`} is ${math`\binom{${n}}{k} x^{${n} - k} (${c})^{k}`}, for ${math`k = ${0}, \ldots, ${n}`}.`,
        t`So ${computedMath(`(${poly([1, c])})^${n} = ${poly(coeffs)}`)}.`,
      ],
    };
  },
  solve: ({ c, n }) => poly(power([1, c], n)),
  misconceptions: ({ c, n }): Misconception[] => [
    { response: poly([1, ...Array.from({ length: n - 1 }, () => 0), c ** n]), why: t`Only the first and last terms are there. ${computedMath(`(${poly([1, c])})^${n}`)} is ${n} brackets multiplied out, which gives every power of ${mx} in between.` },
    { response: poly(upTo(n + 1).map((i) => c ** (i - 1))), why: t`The binomial coefficients are missing: each term needs ${math`\binom{${n}}{k}`}, the number of ways to choose which brackets give the constant.` },
    { response: poly(upTo(n + 1).map((i) => choose(n, i - 1) * Math.abs(c) ** (i - 1))), why: t`Watch the signs: the constant is ${c}, so its odd powers are negative.` },
  ],
});

interface SumP { n: number; t: number }

const coefficientSum = generator<SumP>({
  id: 'sum',
  skill: 'Evaluate a sum of binomial coefficients times powers by spotting it as (1 + t)^n, as Corollary 31 of the CST notes does with t = 1.',
  params: (rng) => ({ n: int(rng, 3, 8), t: pick(rng, [2, 3, 4, 5]) }),
  sane: ({ n, t: x }) => (n >= 3 && n <= 8 && x >= 2 && x <= 5 ? null : 'out of range'),
  problem: ({ n, t: x }) => ({
    prompt: t`Evaluate ${math`\sum_{k=${0}}^{${n}} \binom{${n}}{k} ${x}^{k}`}.`,
    answer: { kind: 'exact', expected: String((1 + x) ** n) },
    solution: [
      t`Corollary ${31} of the CST notes: ${math`(z + ${1})^{n} = \sum_{k=${0}}^{n} \binom{n}{k} z^{k}`}. With ${math`z = ${x}`}, the sum is ${math`(${x} + ${1})^{${n}}`}.`,
      t`So it is ${math`${1 + x}^{${n}} = ${(1 + x) ** n}`}.`,
    ],
  }),
  solve: ({ n, t: x }) => String(upTo(n + 1).reduce((s, i) => s + choose(n, i - 1) * x ** (i - 1), 0)),
  misconceptions: ({ n, t: x }): Misconception[] => [
    { response: String((1 + x) ** n - 1), why: t`The sum starts at ${math`k = ${0}`}, whose term is ${math`\binom{${n}}{${0}} ${x}^{${0}} = ${1}`}. Keep it.` },
    { response: String(2 ** n), why: t`${math`${2}^{${n}}`} is the sum of the coefficients alone, which is the case ${math`z = ${1}`}. Here each coefficient is multiplied by ${math`${x}^{k}`}.` },
    { response: String(2 ** n * x ** n), why: t`Not every term has ${math`${x}^{${n}}`}: the term for each ${mk} has ${math`${x}^{k}`}. Spot the whole sum as ${math`(${1} + ${x})^{${n}}`}.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

/** Corollary 33, argument 1: (m + n)^p minus m^p + n^p, in m and n, highest power of m first. */
function dropout(p: number): number[] {
  return upTo(p - 1).map((k) => choose(p, k));
}
const dreamText = (p: number): string => upTo(p - 1).map((k) => `${choose(p, k)}m^${p - k}n^${k}`).join(' + ').replace(/m\^1n/g, 'mn').replace(/n\^1(?!\d)/g, 'n');

const dream3 = auto({
  id: 'cst-cor-33-p3',
  source: cite('cst-dm-notes', 'printed pages 125 and 126, Corollary 33 (the Freshman\'s Dream) with p = 3', true),
  title: t`The Freshman's Dream for ${3}`,
  prompt: t`The CST notes prove that for a prime ${math`p`}, ${math`(m + n)^{p} \equiv m^{p} + n^{p} \pmod{p}`}, by expanding with the binomial theorem. Take ${math`p = ${3}`}: expand ${math`(m + n)^{${3}} - (m^{${3}} + n^{${3}})`} fully, in ${math`m`} and ${math`n`}.`,
  answer: { kind: 'expression', expected: dreamText(3), variables: ['m', 'n'], form: 'expanded' },
  solution: [
    t`By the binomial theorem, ${math`(m + n)^{${3}} = m^{${3}} + ${choose(3, 1)}m^{${2}}n + ${choose(3, 2)}mn^{${2}} + n^{${3}}`}.`,
    t`Subtracting ${math`m^{${3}} + n^{${3}}`} leaves the middle terms: ${computedMath(dreamText(3))}.`,
    t`Every coefficient left, ${listOf(dropout(3))}, is a multiple of ${3}, so the difference is a multiple of ${3} for all whole numbers ${math`m`} and ${math`n`}. That is the notes' first argument: the middle coefficients ${math`\binom{p}{k}`}, for ${math`${0} < k < p`}, are multiples of ${math`p`}.`,
  ],
  reference: '3m^2n + 3mn^2',
  verify: () => {
    // Against direct evaluation for a grid of m and n, and the divisibility the notes claim.
    for (let m = 0; m <= 6; m++) for (let n = 0; n <= 6; n++) {
      const d = (m + n) ** 3 - (m ** 3 + n ** 3);
      if (d !== 3 * m * m * n + 3 * m * n * n) return `m = ${m}, n = ${n}`;
      if (d % 3 !== 0) return `not a multiple of 3 at ${m}, ${n}`;
    }
    return null;
  },
  misconceptions: [{ response: '0', why: t`${math`(m + n)^{${3}}`} is not ${math`m^{${3}} + n^{${3}}`}: that is the Freshman's Dream, which holds only after reducing modulo ${3}. Expand it with the binomial theorem.` }],
});

const dream5 = auto({
  id: 'cst-cor-33-p5',
  source: cite('cst-dm-notes', 'printed pages 125 and 126, Corollary 33 (the Freshman\'s Dream) with p = 5', true),
  title: t`The Freshman's Dream for ${5}`,
  prompt: t`Expand ${math`(m + n)^{${5}} - (m^{${5}} + n^{${5}})`} fully, in ${math`m`} and ${math`n`}. (Each coefficient left should be a multiple of ${5}, as Corollary ${33} of the CST notes predicts.)`,
  answer: { kind: 'expression', expected: dreamText(5), variables: ['m', 'n'], form: 'expanded' },
  hints: [
    t`What is row ${5} of Pascal's triangle?`,
    t`Which terms of ${math`(m + n)^{${5}}`} cancel against ${math`m^{${5}} + n^{${5}}`}?`,
    t`What are the remaining terms, with their coefficients?`,
  ],
  nudge: t`Not quite. Take the coefficients from row ${5} of Pascal's triangle; only the first and last terms cancel.`,
  solution: [
    t`Row ${5} of Pascal's triangle is ${listOf(upTo(6).map((i) => choose(5, i - 1)))}, so ${math`(m + n)^{${5}} = m^{${5}} + ${computedMath(dreamText(5))} + n^{${5}}`}.`,
    t`Removing ${math`m^{${5}} + n^{${5}}`} leaves ${computedMath(dreamText(5))}, with coefficients ${listOf(dropout(5))}, all multiples of ${5}.`,
    t`For a prime ${math`p`}, the middle coefficients of row ${math`p`} are multiples of ${math`p`}.`,
  ],
  reference: dreamText(5),
  verify: () => {
    for (let m = 0; m <= 5; m++) for (let n = 0; n <= 5; n++) {
      const d = (m + n) ** 5 - (m ** 5 + n ** 5);
      const byTerms = dropout(5).reduce((s, c, i) => s + c * m ** (4 - i) * n ** (i + 1), 0);
      if (d !== byTerms) return `m = ${m}, n = ${n}`;
    }
    return dropout(5).every((c) => c % 5 === 0) ? null : 'a middle coefficient is not a multiple of 5';
  },
  misconceptions: [{ response: '5m^4n + 5m^3n^2 + 5m^2n^3 + 5mn^4', why: t`The coefficients are the binomial coefficients ${math`\binom{${5}}{k}`}: ${listOf(dropout(5))}, not all ${5}.` }],
});

const ROW = 6;
const rowAndSum = auto({
  id: 'cst-cor-31-2',
  source: cite('cst-dm-notes', 'printed page 122, Corollary 31, part 2', true),
  title: t`The coefficients add up to a power of ${2}`,
  prompt: t`Corollary ${31} of the CST notes says ${math`${2}^{n} = \sum_{k=${0}}^{n} \binom{n}{k}`}. Check it for ${math`n = ${ROW}`}: fill in the coefficients of ${math`(x + y)^{${ROW}}`} and their sum.`,
  answer: {
    kind: 'table', cell: 'exact',
    columns: [...upTo(ROW + 1).map((i) => [math`\binom{${ROW}}{${i - 1}}`]), t`sum`],
    rows: [[...upTo(ROW + 1).map(() => null), null]],
    expected: [...upTo(ROW + 1).map((i) => String(choose(ROW, i - 1))), String(2 ** ROW)],
  },
  hints: [
    t`What is row ${ROW} of Pascal's triangle?`,
    t`What do its entries add to?`,
    t`Which substitution into the binomial theorem gives that sum directly?`,
  ],
  nudge: t`Not quite. Build row ${ROW} from the row above by adding neighbours, and keep both end entries.`,
  solution: [
    t`Row ${ROW} of Pascal's triangle: ${listOf(upTo(ROW + 1).map((i) => choose(ROW, i - 1)))}.`,
    t`They add up to ${upTo(ROW + 1).reduce((s, i) => s + choose(ROW, i - 1), 0)}, which is ${math`${2}^{${ROW}}`}: put ${math`x = y = ${1}`} in the binomial theorem.`,
    t`Put ${math`x = y = ${1}`} in the binomial theorem to sum a row.`,
  ],
  reference: [...upTo(ROW + 1).map((i) => String(choose(ROW, i - 1))), String(2 ** ROW)],
  verify: () => {
    const row = power([1, 1], ROW);
    const e = same('the row by multiplying out', row.join(), upTo(ROW + 1).map((i) => choose(ROW, i - 1)).join());
    return e ?? same('the sum', row.reduce((a, b) => a + b, 0), 2 ** ROW);
  },
  misconceptions: [{ response: [...upTo(ROW + 1).map((i) => String(choose(ROW, i - 1))), String(2 ** ROW - 1)], why: t`Count the ${1} at the start of the row too: the sum is exactly ${math`${2}^{${ROW}}`}.` }],
});

const P32 = 11;
const cor32 = auto({
  id: 'cst-cor-32',
  source: cite('cst-dm-notes', 'printed page 122, Corollary 32', true),
  title: t`${math`${2}^{p}`} modulo ${math`p`}`,
  prompt: t`Corollary ${32} of the CST notes: for every prime ${math`p`}, ${math`${2}^{p} \equiv ${2} \pmod{p}`}. Check it for ${math`p = ${P32}`}: what is the remainder when ${math`${2}^{${P32}}`} is divided by ${P32}?`,
  answer: { kind: 'exact', expected: String(2 ** P32 % P32) },
  hints: [
    t`What is ${math`${2}^{${P32}}`}?`,
    t`What is the largest multiple of ${P32} not above it?`,
    t`What is left over?`,
  ],
  nudge: t`Not quite. Compute ${math`${2}^{${P32}}`} and divide, or reduce modulo ${P32} after each doubling.`,
  solution: [
    t`${math`${2}^{${P32}} = ${2 ** P32} = ${P32} \times ${Math.floor(2 ** P32 / P32)} + ${2 ** P32 % P32}`}.`,
    t`So the remainder is ${2 ** P32 % P32}, as the corollary says. The reason: ${math`${2}^{p} = \sum_{k} \binom{p}{k}`}, and every term but the first and last is a multiple of ${math`p`}.`,
    t`Modulo a prime ${math`p`}, only the end terms of row ${math`p`} survive.`,
  ],
  reference: String(2 ** P32 % P32),
  verify: () => {
    // Every odd prime up to 31 leaves remainder 2, and 2^p - 2 is the sum of the middle coefficients, each a multiple of p.
    for (const p of [3, 5, 7, 11, 13, 17, 19, 23, 29, 31]) {
      let r = 1;
      for (let i = 0; i < p; i++) r = (r * 2) % p;
      if (r !== 2) return `2^${p} mod ${p} is ${r}`;
      const middle = upTo(p - 1).reduce((s, k) => s + choose(p, k), 0);
      if (middle !== 2 ** p - 2 || middle % p !== 0) return `middle coefficients at ${p}`;
    }
    return null;
  },
  misconceptions: [{ response: '0', why: t`${P32} does not divide ${math`${2}^{${P32}}`}: the only prime factor of a power of ${2} is ${2}. Divide and find the remainder.` }],
  official: { source: cite('cst-dm-notes', 'printed page 122, Corollary 32'), answer: '2', agrees: true },
});

const proveCor31 = supervision({
  id: 'cst-cor-31-proof',
  source: cite('cst-dm-notes', 'printed page 122, Corollary 31'),
  title: t`Corollary ${31} from the theorem`,
  prompt: t`Deduce both parts of Corollary ${31} of the CST notes from the binomial theorem, ${math`(x + y)^{n} = \sum_{k=${0}}^{n} \binom{n}{k} x^{n - k} y^{k}`}: (${1}) ${math`(z + ${1})^{n} = \sum_{k=${0}}^{n} \binom{n}{k} z^{k}`}, and (${2}) ${math`${2}^{n} = \sum_{k=${0}}^{n} \binom{n}{k}`}. State exactly what is substituted for ${mx} and ${my}, and why the powers come out as they do in part (${1}).`,
  hints: [
    t`Which choice of ${mx} and ${my} turns ${math`(x + y)^{n}`} into ${math`(z + ${1})^{n}`}?`,
    t`With that choice, what does ${math`x^{n - k}y^{k}`} become?`,
    t`Which values of ${mx} and ${my} reduce every term of the sum to its coefficient?`,
  ],
  writeUp: 'proof',
});

const proveCor32 = supervision({
  id: 'cst-cor-32-proof',
  source: cite('cst-dm-notes', 'printed page 122, Corollary 32'),
  title: t`Why ${math`${2}^{p} \equiv ${2} \pmod{p}`}`,
  prompt: t`Prove Corollary ${32} of the CST notes: for every prime ${math`p`}, ${math`${2}^{p} \equiv ${2} \pmod{p}`}. Use Corollary ${31} and the fact (Lemma ${28}) that ${math`p`} divides ${math`\binom{p}{m}`} when ${math`${0} < m < p`}. Which terms of the sum survive modulo ${math`p`}, and why?`,
  hints: [
    t`What does Corollary ${31} give for ${math`${2}^{p}`} as a sum?`,
    t`Which terms of that sum does Lemma ${28} make multiples of ${math`p`}?`,
    t`What are the remaining terms, and what is their sum?`,
  ],
  writeUp: 'proof',
});

// Rule 1 (2026-10-08): set here from alg.sigma-notation, the earliest topic that teaches everything it needs.
const sw432d = supervision({
  id: 'sw-4-3-2-d',
  source: cite('cst-dm-sw1', 'Exercises 4, 4.3.2(d)'),
  title: t`Every power sum is a polynomial`,
  prompt: t`Show that, for every ${math`k \in \mathbb{N}`}, there exists a polynomial ${math`p_k(x)`} such that, for all ${math`n \in \mathbb{N}`}, ${math`p_k(n) = \sum_{i = ${0}}^{n} i^{k} = ${0}^{k} + ${1}^{k} + \cdots + n^{k}`}. Hint: generalise the identity ${math`(n + ${1})^{${2}} = \sum_{i = ${0}}^{n} (i + ${1})^{${2}} - \sum_{i = ${0}}^{n} i^{${2}}`}.`,
  hints: [
    t`Generalising the identity to ${math`(n + ${1})^{k + ${1}}`}, what does expanding each ${math`(i + ${1})^{k + ${1}}`} give?`,
    t`Which power sum appears with a non-zero coefficient, and which lower power sums appear with it?`,
    t`How does strong induction on ${math`k`} turn that equation into a polynomial for ${math`\sum_{i = ${0}}^{n} i^{k}`}?`,
  ],
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-4', '4.3.2(d)'),
});

// ---------------------------------------------------------------- lesson

const EXN = 4;
const exRow = upTo(EXN + 1).map((i) => choose(EXN, i - 1));

export const binomialTheorem: TopicContent = {
  topicId: 'comb.binomial-theorem',
  goal: t`Expand ${math`(x + y)^{n}`} with binomial coefficients, find any one coefficient, and read off sums such as ${math`\sum_{k} \binom{n}{k} = ${2}^{n}`}.`,
  objective: t`Expand ${math`(x + y)^{n}`}, find any single coefficient, and get identities by substituting values.`,
  why: t`It turns powers into counting; it gives ${math`${2}^{n}`} subsets, Fermat's little theorem, and generating functions.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`Choosing from brackets` },
    { kind: 'hook', text: t`Multiply out ${math`(x + y)(x + y)(x + y)(x + y)`} completely, before collecting anything. You get ${2 ** EXN} products, one for each way of choosing ${mx} or ${my} from each of the ${EXN} brackets. How many of them equal ${math`x^{${2}}y^{${2}}`}? Not by expanding: by counting.` },
    { kind: 'narrative', text: t`A product equals ${math`x^{${2}}y^{${2}}`} exactly when it took ${my} from ${2} of the brackets and ${mx} from the other ${2}. So the number of such products is the number of ways to choose which ${2} brackets supply the ${my}: ${math`\binom{${4}}{${2}} = ${choose(4, 2)}`}. The same reasoning works for every power and every ${mn}.` },
    { kind: 'theorem', name: t`Binomial theorem`, statement: t`For all real (or complex) ${mx}, ${my} and every natural number ${mn}, ${dmath`(x + y)^{n} = \sum_{k=${0}}^{n} \binom{n}{k} x^{n - k} y^{k}.`}` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Expand without collecting`, text: t`By the distributive law, ${math`(x + y)^{n}`} is the sum of ${math`${2}^{n}`} products, one for each choice of ${mx} or ${my} from each of the ${mn} brackets.` },
        { label: t`Read off each product`, text: t`A choice that takes ${my} from exactly ${mk} brackets gives the product ${math`x^{n - k} y^{k}`}.`, plain: t`Multiplication can be done in any order, so only the number of ${my}s matters, not which brackets they came from.` },
        { label: t`Count the choices`, text: t`There are ${math`\binom{n}{k}`} ways to choose which ${mk} of the ${mn} brackets supply ${my}.` },
        { label: t`Collect`, text: t`Grouping the products by ${mk} gives ${math`\sum_{k = ${0}}^{n} \binom{n}{k} x^{n - k} y^{k}`}.` },
      ],
    },
    { kind: 'p', text: t`This is the [[binomial-theorem|binomial theorem]], Theorem ${30} of the CST notes. The next topic proves it again by induction, the way the notes do. For ${math`n = ${EXN}`}, row ${EXN} of Pascal's triangle gives ${dmath`(x + y)^{${EXN}} = x^{${EXN}} + ${exRow[1] as number}x^{${3}}y + ${exRow[2] as number}x^{${2}}y^{${2}} + ${exRow[3] as number}xy^{${3}} + y^{${EXN}}.`}` },
    { kind: 'section', title: t`One coefficient at a time` },
    {
      kind: 'definition',
      name: t`Binomial expansion, general term`,
      formal: t`The [[binomial-expansion|binomial expansion]] of ${math`(x + y)^{n}`} is the sum in the theorem; its term in ${math`y^{k}`}, ${math`\binom{n}{k} x^{n - k} y^{k}`}, is the general term.`,
      plain: t`You rarely need the whole expansion: write the general term and pick the ${mk} you want.`,
    },
    { kind: 'p', text: t`The theorem holds for any ${mx} and ${my}, including multiples of a letter and negative numbers. In ${computedMath(`(${poly([2, -1])})^${3}`)}, put ${math`${2}x`} for ${mx} and ${math`-${1}`} for ${my}, keeping each bracket whole. The term in ${math`x^{${2}}`} has ${math`k = ${1}`}: ${math`\binom{${3}}{${1}} (${2}x)^{${2}} (-${1})^{${1}} = ${3} \times ${4}x^{${2}} \times (-${1}) = ${choose(3, 1) * 2 ** 2 * -1}x^{${2}}`}. The ${2} is squared with the ${mx}, and the sign comes from the odd power of ${math`-${1}`}.` },
    checkFrom(coefficient, { a: 3, b: 1, n: 5, k: 2 }, t`The term is ${math`\binom{${5}}{${2}} (${3}x)^{${2}} \cdot ${1}^{${3}} = ${choose(5, 2)} \times ${9}x^{${2}}`}, coefficient ${choose(5, 2) * 9}.`),
    { kind: 'section', title: t`Identities by substitution` },
    { kind: 'narrative', text: t`Because the theorem holds for every ${mx} and ${my}, you can feed it values and read off facts about binomial coefficients.` },
    { kind: 'p', text: t`With ${math`x = ${1}`}: ${math`(${1} + y)^{n} = \sum_{k} \binom{n}{k} y^{k}`}. With ${math`x = y = ${1}`}: ${math`${2}^{n} = \sum_{k} \binom{n}{k}`}, so row ${mn} adds to ${math`${2}^{n}`}; for ${math`n = ${EXN}`}, ${math`${computedTex(exRow.join(' + '))} = ${2 ** EXN}`}. With ${math`x = ${1}`}, ${math`y = -${1}`} and ${math`n \ge ${1}`}: ${math`${0} = \sum_{k} (-${1})^{k}\binom{n}{k}`}.` },
    checkFrom(coefficientSum, { n: 4, t: 3 }, t`It is ${math`(${1} + ${3})^{${4}} = ${4 ** 4}`}, by the theorem with ${math`x = ${1}`}, ${math`y = ${3}`}.`),
    { kind: 'section', title: t`Primes and the Freshman's Dream` },
    { kind: 'theorem', statement: t`If ${math`p`} is prime and ${math`${0} < k < p`}, then ${math`p`} divides ${math`\binom{p}{k}`}.` },
    { kind: 'p', text: t`So in ${math`(m + n)^{p}`} every term except ${math`m^{p}`} and ${math`n^{p}`} has a coefficient divisible by ${math`p`}: ${math`(m + n)^{p} \equiv m^{p} + n^{p} \pmod{p}`} for whole numbers ${math`m`} and ${math`n`}. The CST notes call this the Freshman's Dream, because the tempting ${math`(m + n)^{p} = m^{p} + n^{p}`} becomes true only after taking remainders.`, why: { q: t`Why does ${math`p`} divide ${math`\binom{p}{k}`}?`, a: t`${math`p! = \binom{p}{k} \, k! \, (p - k)!`}. The prime ${math`p`} divides the left side, but not ${math`k!\,(p - k)!`}, whose factors are all less than ${math`p`}. A prime dividing a product divides one of the factors, so ${math`p`} divides ${math`\binom{p}{k}`}.` } },
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`${math`(x + y)^{n} = x^{n} + y^{n}`}.`, counterexample: t`At ${math`x = y = ${1}`}, ${math`n = ${2}`}: the left side is ${4}, the right is ${2}. The middle terms ${math`\binom{n}{k}x^{n - k}y^{k}`} are missing.` },
    { kind: 'pitfall', claim: t`The coefficient of ${math`x^{${2}}`} in ${computedMath(`(${poly([2, 1])})^${3}`)} is ${math`\binom{${3}}{${2}} = ${3}`}.`, counterexample: t`The term is ${math`\binom{${3}}{${2}}(${2}x)^{${2}} = ${12}x^{${2}}`}: the ${2} inside the bracket is squared too, so the coefficient is ${3 * 4}.` },
    { kind: 'takeaway', text: t`The coefficient of ${math`x^{n - k}y^{k}`} in ${math`(x + y)^{n}`} counts the ways to pick ${mk} brackets for ${my}: ${math`\binom{n}{k}`}.` },
  ],
  examples: [
    { ...workedCambridge(dream3), examiner: t`The examiner looks for the expansion by the binomial theorem and the middle coefficients identified as multiples of ${3}.` },
    worked(coefficient, { a: 2, b: -3, n: 5, k: 2 }, t`One coefficient`),
    worked(coefficientSum, { n: 5, t: 2 }, t`A sum of coefficients`),
  ],
  generators: [coefficient, expand, coefficientSum],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['binomial-theorem', 'binomial-expansion'],
  cambridge: withUses([dream5, rowAndSum, cor32, proveCor31, proveCor32, sw432d], {
    'sw-4-3-2-d': { sections: ['One coefficient at a time'], note: t`Telescoping power sums, then induction on the power`, needs: ['alg.sigma-notation', 'proof.strong-induction'] },
    'cst-cor-32-proof': { sections: ["Primes and the Freshman's Dream"], note: t`Which terms of the expansion survive modulo a prime`, needs: ['num.congruence'] },
    'cst-cor-31-proof': { sections: ['Identities by substitution'], note: t`Substituting into the binomial theorem` },
    'cst-cor-33-p5': { sections: ["Primes and the Freshman's Dream"], note: t`Expanding a fifth power and seeing every inner coefficient divisible by five` },
  }),
  gate: ['cst-cor-32-proof', 'cst-cor-31-proof', 'cst-cor-33-p5'],
  recall: [
    { front: t`The binomial theorem.`, back: t`${math`(x + y)^{n} = \sum_{k=${0}}^{n} \binom{n}{k} x^{n - k} y^{k}`}.` },
    { front: t`The sum of the coefficients in row ${mn}.`, back: t`${math`\sum_{k} \binom{n}{k} = ${2}^{n}`}: put ${math`x = y = ${1}`}.` },
    { front: t`The Freshman's Dream.`, back: t`For a prime ${math`p`}, ${math`(m + n)^{p} \equiv m^{p} + n^{p} \pmod{p}`}, since ${math`p`} divides every middle coefficient.` },
  ],
  proofOrder: [
    {
      title: t`The binomial theorem by counting`,
      steps: [
        t`Expanding ${math`(x + y)^{n}`} without collecting gives one product for each choice of ${mx} or ${my} from every bracket.`,
        t`A choice taking ${my} from exactly ${mk} brackets gives ${math`x^{n - k}y^{k}`}.`,
        t`There are ${math`\binom{n}{k}`} such choices.`,
        t`Collecting by ${mk} gives ${math`\sum_{k} \binom{n}{k}x^{n - k}y^{k}`}.`,
      ],
    },
  ],
};
