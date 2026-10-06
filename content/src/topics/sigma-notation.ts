/**
 * alg.sigma-notation: Reading and writing sums with sigma notation; splitting, scaling,
 * shifting the index, and telescoping. From CST supervision exercise 4.3.2 (the sums of
 * squares and of k-th powers are polynomials in n, with the hint (n + 1)³ = Σ(i + 1)³ - Σi³),
 * checked against the 2023-24 official solution, and Book of Proof Chapter 10, exercises 1,
 * 3, 4, 6, 7, 15, and 20 (sum formulas, there proved by induction; here found by
 * manipulating sums, with the induction proofs left to the induction topic).
 */
import { auto, cite, same, supervision } from '../cambridge';
import { add, int, pick, q, str, upTo, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { poly } from '../poly';
import { computedMath as cm, computedTex, dmath, listOf, math, t, type Rich, type Span } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

const NDOM = { n: { kind: 'integer' as const, min: 1, max: 40 } };
const [mi, mn] = [math`i`, math`n`];

/** Σ_{i=lo}^{hi} f(i), exactly. */
function sum(lo: number, hi: number, f: (i: number) => Rational): Rational {
  let s = q(0);
  for (let i = lo; i <= hi; i++) s = add(s, f(i));
  return s;
}
/** Evaluates an expression string in n the way a closed form would be: through a small arithmetic of rationals. */
function checkClosed(closed: (n: number) => Rational, f: (i: number) => Rational, lo: number, what: string): string | null {
  for (let n = lo; n <= 30; n++) {
    const e = same(`${what}, n = ${n}`, str(closed(n)), str(sum(lo, n, f)));
    if (e !== null) return e;
  }
  return null;
}

const sigma = (lo: number | Span, hi: number | Span, body: Span | Rich, v = 'i'): Span => math`\sum_{${v} = ${lo}}^{${hi}} ${body}`;

// ---------------------------------------------------------------- generators

interface EvalP { m: number; n: number; a: number; b: number }

const evaluate = generator<EvalP>({
  id: 'evaluate',
  skill: 'Evaluate a sum written in sigma notation by listing its terms.',
  params: (rng) => {
    for (;;) {
      const m = int(rng, 0, 3);
      const p: EvalP = { m, n: m + int(rng, 3, 7), a: int(rng, 1, 5), b: int(rng, -5, 5) };
      // A zero constant, or a zero last term, would make the slips below land on the answer.
      if (p.b !== 0 && p.a * p.n + p.b !== 0) return p;
    }
  },
  sane: ({ m, n, b, a }) => (n > m && b !== 0 && a * n + b !== 0 ? null : 'out of range'),
  problem: ({ m, n, a, b }) => {
    const terms = Array.from({ length: n - m + 1 }, (_, k) => a * (m + k) + b);
    const total = terms.reduce((x, y) => x + y, 0);
    return {
      prompt: t`Evaluate ${sigma(m, n, cm(`(${poly([a, b], 'i')})`))}.`,
      answer: { kind: 'exact', expected: String(total) },
      solution: [
        t`The index ${mi} runs from ${m} to ${n}: ${math`${n} - ${m} + ${1} = ${n - m + 1}`} terms. Put each value of ${mi} into ${cm(poly([a, b], 'i'))}.`,
        t`${math`${cmTerms(terms)} = ${total}`}.`,
      ],
    };
  },
  solve: ({ m, n, a, b }) => str(sum(m, n, (i) => q(a * i + b))),
  misconceptions: ({ m, n, a, b }): Misconception[] => {
    const total = Number(sum(m, n, (i) => q(a * i + b)).num);
    return [
      { response: String(total - (a * n + b)), why: t`The sum includes its upper limit: the last term is at ${math`i = ${n}`}. There are ${math`${n} - ${m} + ${1}`} terms.` },
      { response: String(Number(sum(m, n, (i) => q(a * i)).num) + b), why: t`The constant ${b} is added in every term, ${n - m + 1} times, not once.` },
    ];
  },
});

/** The terms of a sum as computed LaTeX, negatives in brackets. */
function cmTerms(terms: readonly number[]): Span {
  return cm(terms.map((x) => (x < 0 ? `(${x})` : `${x}`)).join(' + '));
}

type Body = { kind: 'lin'; a: number; b: number } | { kind: 'quad'; a: number; c: number };
interface ClosedP { body: Body }

const sgn = (c: number): string => `${c < 0 ? '-' : '+'} ${Math.abs(c)}`;
/** a n(n + 1)/2 + b n, in the expression language, with every number interpolated. */
const linClosed = (a: number, b: number): string => `${a}n(n + ${1})/${2} ${sgn(b)}n`;
const quadClosed = (a: number, c: number): string => `${a}n(n + ${1})(${2}n + ${1})/${6} ${sgn(c)}n`;

const closedForm = generator<ClosedP>({
  id: 'closed-form',
  skill: 'Split a sum and use known sums of i and i² to write it as a formula in n.',
  params: (rng) => {
    for (;;) {
      const body: Body = rng() < 0.6 ? { kind: 'lin', a: int(rng, 1, 9), b: int(rng, -6, 6) } : { kind: 'quad', a: int(rng, 1, 4), c: int(rng, -5, 5) };
      if ((body.kind === 'lin' ? body.b : body.c) !== 0) return { body };
    }
  },
  sane: ({ body }) => ((body.kind === 'lin' ? body.b : body.c) !== 0 ? null : 'out of range'),
  problem: ({ body }) => {
    const term = body.kind === 'lin' ? poly([body.a, body.b], 'i') : poly([body.a, 0, body.c], 'i');
    const expected = body.kind === 'lin' ? linClosed(body.a, body.b) : quadClosed(body.a, body.c);
    return {
      prompt: t`Using ${dmath`\sum_{i = ${1}}^{n} i = \frac{n(n + ${1})}{${2}} \quad\text{and}\quad \sum_{i = ${1}}^{n} i^{${2}} = \frac{n(n + ${1})(${2}n + ${1})}{${6}},`} write ${sigma(1, mn, cm(`(${term})`))} as a formula in ${mn}.`,
      answer: { kind: 'expression', expected, variables: ['n'], domains: NDOM },
      solution: body.kind === 'lin'
        ? [
          t`Split the sum and take out the constant factor: ${math`${body.a} \sum_{i = ${1}}^{n} i + \sum_{i = ${1}}^{n} (${body.b})`}.`,
          t`The second sum adds ${body.b} once for each of the ${mn} terms: ${cm(`${body.b}n`)}. So the sum is ${cm(linClosed(body.a, body.b))}.`,
        ]
        : [
          t`Split the sum and take out the constant factor: ${math`${body.a} \sum_{i = ${1}}^{n} i^{${2}} + \sum_{i = ${1}}^{n} (${body.c})`}.`,
          t`The second sum adds ${body.c} once for each of the ${mn} terms. So the sum is ${cm(quadClosed(body.a, body.c))}.`,
        ],
    };
  },
  solve: ({ body }) => {
    // Fit a polynomial through the sums at n = 0..3 by Newton differences; return it in n.
    const f = (i: number): number => (body.kind === 'lin' ? body.a * i + body.b : body.a * i * i + body.c);
    const s = [0, 1, 2, 3].map((n) => Array.from({ length: n }, (_, k) => f(k + 1)).reduce((x, y) => x + y, 0));
    const d1 = s.slice(1).map((y, k) => y - (s[k] as number));
    const d2 = d1.slice(1).map((y, k) => y - (d1[k] as number));
    const d3 = (d2[1] as number) - (d2[0] as number);
    // s(n) = s0 + d1 C(n,1) + d2 C(n,2) + d3 C(n,3)
    return `${s[0]} + ${d1[0]}n + ${d2[0]}n(n - 1)/2 + ${d3}n(n - 1)(n - 2)/6`;
  },
  misconceptions: ({ body }): Misconception[] => body.kind === 'lin'
    ? [
      { response: `${body.a}n(n + 1)/2 ${sgn(body.b)}`, why: t`The constant ${body.b} is in every one of the ${mn} terms, so it contributes ${cm(`${body.b}n`)}, not ${body.b}.` },
      { response: `${body.a}n^2/2 ${sgn(body.b)}n`, why: t`The sum of ${math`${1}, \ldots, n`} is ${math`\frac{n(n + ${1})}{${2}}`}, not ${math`\frac{n^{${2}}}{${2}}`}.` },
    ]
    : [
      { response: `${body.a}n(n + 1)(2n + 1)/6 ${sgn(body.c)}`, why: t`The constant ${body.c} is in every one of the ${mn} terms, so it contributes ${cm(`${body.c}n`)}.` },
      { response: `${body.a}n(n + 1)/2 ${sgn(body.c)}n`, why: t`The terms have ${math`i^{${2}}`}, so use the sum of squares, not the sum of ${mi}.` },
    ],
});

interface ShiftP { m: number; a: number; b: number }

const shift = generator<ShiftP>({
  id: 'shift',
  skill: 'Shift the index of a sum so it starts at 1: substitute i = j + m - 1 in the term.',
  params: (rng) => ({ m: int(rng, 2, 5), a: int(rng, 1, 6), b: int(rng, -6, 6) }),
  sane: ({ m }) => (m >= 2 && m <= 5 ? null : 'out of range'),
  problem: ({ m, a, b }) => {
    const g = [a, a * (m - 1) + b];
    return {
      prompt: t`Write ${sigma(m, mn, cm(`(${poly([a, b], 'i')})`))} as a sum ${math`\sum_{j = ${1}}^{n - ${m - 1}}`} with the new index ${math`j`} starting at ${1}. What is the term, in terms of ${math`j`}?`,
      answer: { kind: 'expression', expected: poly(g, 'j'), variables: ['j'], domains: { j: { kind: 'integer', min: 1, max: 30 } } },
      solution: [
        t`When ${math`i = ${m}`}, ${math`j = ${1}`}: so ${math`i = j + ${m - 1}`}, and the upper limit ${math`i = n`} becomes ${math`j = n - ${m - 1}`}.`,
        t`Substitute in the term: ${math`${cm(poly([a, b], 'i').replace(/i/g, `(j + ${m - 1})`))} = ${cm(poly(g, 'j'))}`}.`,
      ],
    };
  },
  solve: ({ m, a, b }) => {
    // The j-th term of the original sum is its term at i = m + j - 1; read off the line through j = 1 and j = 2.
    const t1 = a * m + b;
    const t2 = a * (m + 1) + b;
    return poly([t2 - t1, 2 * t1 - t2], 'j');
  },
  misconceptions: ({ m, a, b }): Misconception[] => [
    { response: poly([a, b], 'j'), why: t`Renaming ${mi} as ${math`j`} without changing the term starts the sum at the wrong value: the first term must still be the one at ${math`i = ${m}`}.` },
    { response: poly([a, b - a * (m - 1)], 'j'), why: t`The shift goes the other way: ${math`i = j + ${m - 1}`}, so ${math`j = ${1}`} gives ${math`i = ${m}`}.` },
  ],
});

type Pattern = { kind: 'prod'; c: number } | { kind: 'odd' } | { kind: 'sq'; c: number } | { kind: 'lin'; a: number; b: number } | { kind: 'recip' };
interface PatP { p: Pattern }

function patternTerm(p: Pattern): string {
  switch (p.kind) {
    case 'prod': return `i(i + ${p.c})`;
    case 'odd': return poly([2, -1], 'i');
    case 'sq': return poly([1, 0, p.c], 'i');
    case 'lin': return poly([p.a, p.b], 'i');
    case 'recip': return `${1}/(i(i + ${1}))`;
  }
}
/** The term at i, as LaTeX built from computed numbers. */
function shownTerm(p: Pattern, i: number): string {
  switch (p.kind) {
    case 'prod': return `${i} \\cdot ${i + p.c}`;
    case 'odd': return `${2 * i - 1}`;
    case 'sq': return `${i * i + p.c}`;
    case 'lin': return `${p.a * i + p.b}`;
    case 'recip': return `\\frac{${1}}{${i} \\cdot ${i + 1}}`;
  }
}

const pattern = generator<PatP>({
  id: 'pattern',
  skill: 'Write a sum given by its first terms in sigma notation: find the term in i.',
  params: (rng) => ({
    p: pick(rng, [
      { kind: 'prod', c: int(rng, 1, 4) }, { kind: 'odd' }, { kind: 'sq', c: int(rng, 1, 5) },
      { kind: 'lin', a: int(rng, 2, 7), b: int(rng, -3, 4) }, { kind: 'recip' },
    ] as Pattern[]),
  }),
  sane: () => null,
  problem: ({ p }) => {
    const term = patternTerm(p);
    return {
      prompt: t`Write ${math`${computedTex([1, 2, 3].map((i) => shownTerm(p, i)).join(' + '))} + \cdots + ${cm(term.replace(/i/g, 'n'))}`} as ${sigma(1, mn, math`f(i)`)}. What is ${math`f(i)`}?`,
      answer: { kind: 'expression', expected: term, variables: ['i'], domains: { i: { kind: 'integer', min: 1, max: 30 } } },
      solution: [
        t`The last term is the one at ${math`i = n`}: replace ${mn} by ${mi} in it, ${math`f(i) = ${cm(term)}`}.`,
        t`Check the first terms: ${math`f(${1}), f(${2}), f(${3})`} are ${math`${computedTex([1, 2, 3].map((i) => shownTerm(p, i)).join(',\\ '))}`}.`,
      ],
    };
  },
  solve: ({ p }) => patternTerm(p),
  misconceptions: ({ p }): Misconception[] => {
    const term = patternTerm(p);
    return [
      { response: term.replace(/i/g, '(i + 1)'), why: t`With that ${math`f`}, the sum would start at the second term: ${math`f(${1})`} must be the first term shown.` },
      { response: term.replace(/i/g, '(i - 1)'), why: t`With that ${math`f`}, ${math`f(${1})`} is the term before the first one shown. Match ${math`f(${1})`} to the first term.` },
    ];
  },
});


// ---------------------------------------------------------------- Cambridge problems

const S1 = (n: number): Rational => q(n * (n + 1), 2);
const S2 = (n: number): Rational => q(n * (n + 1) * (2 * n + 1), 6);

const sw432c = auto({
  id: 'sw-4-3-2-c',
  source: cite('cst-dm-sw1', 'Exercises 4, 4.3.2(c)', true),
  title: t`The sum of squares is a polynomial`,
  prompt: t`Find a polynomial ${math`p_{${2}}(x)`} such that ${math`p_{${2}}(n) = \sum_{i = ${0}}^{n} i^{${2}} = ${0}^{${2}} + ${1}^{${2}} + \cdots + n^{${2}}`} for every ${math`n \in \mathbb{N}`}. Use the hint: for every ${math`n \in \mathbb{N}`}, ${dmath`(n + ${1})^{${3}} = \sum_{i = ${0}}^{n} (i + ${1})^{${3}} - \sum_{i = ${0}}^{n} i^{${3}}.`} Give ${math`p_{${2}}(n)`}.`,
  answer: { kind: 'expression', expected: 'n(n + 1)(2n + 1)/6', variables: ['n'], domains: { n: { kind: 'integer', min: 0, max: 40 } } },
  solution: [
    t`The hint is a telescoping sum: the two sums share every term except ${math`(n + ${1})^{${3}}`} and ${math`${0}^{${3}}`}. Combine them term by term instead: ${math`(i + ${1})^{${3}} - i^{${3}} = ${3}i^{${2}} + ${3}i + ${1}`}.`,
    t`So ${math`(n + ${1})^{${3}} = ${3}\sum_{i = ${0}}^{n} i^{${2}} + ${3}\sum_{i = ${0}}^{n} i + (n + ${1})`}.`,
    t`The same trick one power down, ${math`(n + ${1})^{${2}} = \sum_{i = ${0}}^{n} (${2}i + ${1}) = ${2}\sum_{i = ${0}}^{n} i + (n + ${1})`}, gives ${math`\sum_{i = ${0}}^{n} i = \frac{n(n + ${1})}{${2}}`}.`,
    t`Substitute and solve: ${math`${3}\sum_{i = ${0}}^{n} i^{${2}} = (n + ${1})^{${3}} - \frac{${3}n(n + ${1})}{${2}} - (n + ${1}) = \frac{(n + ${1})(${2}n^{${2}} + n)}{${2}}`}.`,
    t`So ${math`p_{${2}}(n) = \frac{n(n + ${1})(${2}n + ${1})}{${6}} = \frac{n^{${3}}}{${3}} + \frac{n^{${2}}}{${2}} + \frac{n}{${6}}`}.`,
  ],
  reference: 'n(n + 1)(2n + 1)/6',
  verify: () => checkClosed(S2, (i) => q(i * i), 0, 'sum of squares from 0'),
  misconceptions: [{ response: 'n^3/3', why: t`That is only the leading term. Keep the ${math`\frac{n^{${2}}}{${2}}`} and ${math`\frac{n}{${6}}`}: check ${math`n = ${1}`}, where the sum is ${1}.` }],
  // The official solution states p2(n) = n³/3 + n²/2 + n/6 and proves it by induction.
  official: { source: cite('cst-dm-sols-2324-4', '4.3.2(c)'), answer: 'n^3/3 + n^2/2 + n/6', agrees: true },
});

function bopSum(o: { n: number; title: Rich; body: Span; expected: string; f: (i: number) => Rational; steps: Rich[]; hasSolution: boolean; hint?: Rich; wrong: Misconception[] }) {
  const at = `Chapter 10, exercise ${o.n}`;
  return auto({
    id: `bop-10-${o.n}`,
    source: cite('bop', at, true),
    title: o.title,
    prompt: t`Find ${sigma(1, mn, o.body)} as a formula in ${mn}${o.hint === undefined ? t`` : t`, ${o.hint}`}. (Book of Proof proves the formula by induction; here, find it by manipulating the sum.)`,
    answer: { kind: 'expression', expected: o.expected, variables: ['n'], domains: NDOM },
    solution: o.steps,
    reference: o.expected,
    verify: () => checkClosed((n) => evalClosed(o.expected, n), o.f, 1, `Book of Proof ${at}`),
    misconceptions: o.wrong,
    // The exercise states the formula; odd-numbered exercises also have the proof in the solutions.
    official: { source: cite('bop', o.hasSolution ? `Solutions, ${at}` : at), answer: o.expected, agrees: true },
  });
}

/** The closed forms below, evaluated exactly at n (each is a polynomial or a simple fraction in n). */
function evalClosed(expr: string, n: number): Rational {
  switch (expr) {
    case 'n(n + 1)(n + 2)/3': return q(n * (n + 1) * (n + 2), 3);
    case '4n^2 - n': return q(4 * n * n - n);
    case 'n(n + 1)(2n + 7)/6': return q(n * (n + 1) * (2 * n + 7), 6);
    case '1 - 1/(n + 1)': return q(n, n + 1);
    case 'n^2(n + 1)^2/4': return q(n * n * (n + 1) * (n + 1), 4);
    case '(n^2 + n)/2': return q(n * n + n, 2);
    default: throw new Error(`sigma-notation: no evaluator for ${expr}`);
  }
}

const KNOWN = t`using the sums of ${mi} and of ${math`i^{${2}}`}`;

const bop10_1 = bopSum({
  n: 1, title: t`The sum of the first ${mn} integers`, body: math`i`, expected: '(n^2 + n)/2', f: (i) => q(i), hasSolution: true,
  hint: t`by the telescoping trick ${math`(n + ${1})^{${2}} - ${1} = \sum_{i = ${1}}^{n} \big((i + ${1})^{${2}} - i^{${2}}\big)`}`,
  steps: [
    t`Each term is ${math`(i + ${1})^{${2}} - i^{${2}} = ${2}i + ${1}`}, and the sum telescopes to ${math`(n + ${1})^{${2}} - ${1}^{${2}}`}.`,
    t`So ${math`${2}\sum i + n = n^{${2}} + ${2}n`}, and ${math`\sum_{i = ${1}}^{n} i = \frac{n^{${2}} + n}{${2}}`}.`,
  ],
  wrong: [{ response: 'n^2/2', why: t`Check ${math`n = ${1}`}: the sum is ${1}, not ${q(1, 2)}.` }],
});
const bop10_4 = bopSum({
  n: 4, title: t`Products of neighbours`, body: math`i(i + ${1})`, expected: 'n(n + 1)(n + 2)/3', f: (i) => q(i * (i + 1)), hasSolution: false, hint: KNOWN,
  steps: [
    t`${math`i(i + ${1}) = i^{${2}} + i`}, so the sum splits: ${math`\sum i^{${2}} + \sum i = \frac{n(n + ${1})(${2}n + ${1})}{${6}} + \frac{n(n + ${1})}{${2}}`}.`,
    t`Take out ${math`\frac{n(n + ${1})}{${6}}`}: ${math`\frac{n(n + ${1})}{${6}}\big((${2}n + ${1}) + ${3}\big) = \frac{n(n + ${1})(n + ${2})}{${3}}`}.`,
  ],
  wrong: [{ response: 'n(n + 1)(2n + 1)/6', why: t`That is only ${math`\sum i^{${2}}`}. The term ${math`i(i + ${1})`} is ${math`i^{${2}} + i`}: add ${math`\sum i`} too.` }],
});
const bop10_6 = bopSum({
  n: 6, title: t`An arithmetic sum`, body: math`(${8}i - ${5})`, expected: '4n^2 - n', f: (i) => q(8 * i - 5), hasSolution: false, hint: t`using the sum of ${mi}`,
  steps: [
    t`Split: ${math`${8}\sum_{i = ${1}}^{n} i - \sum_{i = ${1}}^{n} ${5} = ${8} \cdot \frac{n(n + ${1})}{${2}} - ${5}n`}.`,
    t`That is ${math`${4}n^{${2}} + ${4}n - ${5}n = ${4}n^{${2}} - n`}.`,
  ],
  wrong: [{ response: '4n(n + 1) - 5', why: t`The ${math`-${5}`} is in each of the ${mn} terms: it contributes ${math`-${5}n`}.` }],
});
const bop10_7 = bopSum({
  n: 7, title: t`Products two apart`, body: math`i(i + ${2})`, expected: 'n(n + 1)(2n + 7)/6', f: (i) => q(i * (i + 2)), hasSolution: true, hint: KNOWN,
  steps: [
    t`${math`i(i + ${2}) = i^{${2}} + ${2}i`}, so the sum is ${math`\frac{n(n + ${1})(${2}n + ${1})}{${6}} + ${2} \cdot \frac{n(n + ${1})}{${2}}`}.`,
    t`Take out ${math`\frac{n(n + ${1})}{${6}}`}: ${math`\frac{n(n + ${1})}{${6}}\big((${2}n + ${1}) + ${6}\big) = \frac{n(n + ${1})(${2}n + ${7})}{${6}}`}.`,
  ],
  wrong: [{ response: 'n(n + 1)(2n + 1)/6 + n(n + 1)/2', why: t`The term is ${math`i^{${2}} + ${2}i`}: the sum of ${mi} is counted twice.` }],
});
const bop10_15 = bopSum({
  n: 15, title: t`A telescoping sum`, body: math`\frac{${1}}{i(i + ${1})}`, expected: '1 - 1/(n + 1)', f: (i) => q(1, i * (i + 1)), hasSolution: true,
  hint: t`by writing ${math`\frac{${1}}{i(i + ${1})} = \frac{${1}}{i} - \frac{${1}}{i + ${1}}`}`,
  steps: [
    t`With ${math`\frac{${1}}{i(i + ${1})} = \frac{${1}}{i} - \frac{${1}}{i + ${1}}`}, the sum is ${math`\left(${1} - \frac{${1}}{${2}}\right) + \left(\frac{${1}}{${2}} - \frac{${1}}{${3}}\right) + \cdots + \left(\frac{${1}}{n} - \frac{${1}}{n + ${1}}\right)`}.`,
    t`Every term but the first and last cancels: it [[telescoping|telescopes]] to ${math`${1} - \frac{${1}}{n + ${1}}`}.`,
  ],
  wrong: [{ response: '1/(n(n + 1))', why: t`That is only the last term. Write each term as a difference and let the middle cancel.` }],
});
const bop10_3 = bopSum({
  n: 3, title: t`The sum of cubes`, body: math`i^{${3}}`, expected: 'n^2(n + 1)^2/4', f: (i) => q(i * i * i), hasSolution: true,
  hint: t`using ${math`(n + ${1})^{${4}} - ${1} = \sum_{i = ${1}}^{n} \big((i + ${1})^{${4}} - i^{${4}}\big)`} and the sums of ${mi} and ${math`i^{${2}}`}`,
  steps: [
    t`${math`(i + ${1})^{${4}} - i^{${4}} = ${4}i^{${3}} + ${6}i^{${2}} + ${4}i + ${1}`}, so ${math`(n + ${1})^{${4}} - ${1} = ${4}\sum i^{${3}} + ${6}\sum i^{${2}} + ${4}\sum i + n`}.`,
    t`Substitute the known sums and solve for ${math`\sum i^{${3}}`}: ${math`\sum_{i = ${1}}^{n} i^{${3}} = \frac{n^{${2}}(n + ${1})^{${2}}}{${4}}`}, the square of ${math`\sum i`}.`,
  ],
  wrong: [{ response: 'n^4/4', why: t`That is only the leading term. Check ${math`n = ${1}`}: the sum is ${1}.` }],
});

const sw432d = supervision({
  id: 'sw-4-3-2-d',
  source: cite('cst-dm-sw1', 'Exercises 4, 4.3.2(d)'),
  title: t`Every power sum is a polynomial`,
  prompt: t`Show that, for every ${math`k \in \mathbb{N}`}, there exists a polynomial ${math`p_k(x)`} such that, for all ${math`n \in \mathbb{N}`}, ${math`p_k(n) = \sum_{i = ${0}}^{n} i^{k} = ${0}^{k} + ${1}^{k} + \cdots + n^{k}`}. Hint: generalise the identity ${math`(n + ${1})^{${2}} = \sum_{i = ${0}}^{n} (i + ${1})^{${2}} - \sum_{i = ${0}}^{n} i^{${2}}`}.`,
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-4', '4.3.2(d)'),
});
const bop10_20 = supervision({
  id: 'bop-10-20',
  source: cite('bop', 'Chapter 10, exercise 20', true),
  title: t`Square of a sum, sum of cubes`,
  prompt: t`Prove that ${math`(${1} + ${2} + ${3} + \cdots + n)^{${2}} = ${1}^{${3}} + ${2}^{${3}} + ${3}^{${3}} + \cdots + n^{${3}}`} for every ${math`n \in \mathbb{N}`}. Write both sides with sigma notation first. (Book of Proof expects induction; a proof from the two closed forms is also fine, if you say where they come from.)`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

const L = { n: 5 };
const ODD = poly([2, -1], 'i');
const oddTerms = upTo(L.n).map((i) => 2 * i - 1);
const HOOK_LAST = 99;
const hookCount = (HOOK_LAST + 1) / 2;
const [mm, mf] = [math`m`, math`f`];

export const sigmaNotation: TopicContent = {
  topicId: 'alg.sigma-notation',
  goal: t`Read and write sums in sigma notation, and split, scale, shift, and telescope them to find formulas in ${mn}.`,
  objective: t`Read and write sums in sigma notation, and split, shift and telescope them to find formulas.`,
  why: t`Sums carry series, expectations and induction proofs; telescoping finds the formulas induction then proves.`,
  minutes: 30,
  lesson: [
    { kind: 'section', title: t`A name for a long sum` },
    { kind: 'hook', text: t`Add up the odd numbers ${math`${1} + ${3} + ${5} + \cdots + ${HOOK_LAST}`}. Even writing the question needs dots and a hope that the reader sees the pattern. Is there a way to write such a sum exactly, and then to work out its value without adding ${hookCount} numbers?` },
    { kind: 'narrative', text: t`The pattern is "${math`${2}i - ${1}`} for ${mi} from ${1} to ${hookCount}". If the notation records the rule and the range, nothing is left to guess. That notation uses the Greek capital sigma, ${math`\Sigma`}, for "sum".` },
    { kind: 'section', title: t`Sigma notation` },
    {
      kind: 'definition',
      name: t`Sigma notation`,
      formal: t`For integers ${math`m \le n`} and numbers ${math`a_{m}, \ldots, a_{n}`}, ${dmath`\sum_{i = m}^{n} a_{i} = a_{m} + a_{m + ${1}} + \cdots + a_{n}.`} If ${math`n < m`} the sum is empty and equals ${0}.`,
      plain: t`In plain words: [[sigma-notation|sigma notation]]. Let the [[index-variable|index]] ${mi} run from the bottom limit to the top one, work out the term for each, and add. ${sigma(1, mn, cm(`(${ODD})`))} with ${math`n = ${L.n}`} is ${math`${cmTerms(oddTerms)} = ${oddTerms.reduce((a, b) => a + b, 0)}`}.`,
    },
    {
      kind: 'p',
      text: t`Both limits are included, so ${math`\sum_{i = m}^{n}`} has ${math`n - m + ${1}`} terms. The index is a dummy: ${math`\sum_{i = ${1}}^{n} i^{${2}}`} and ${math`\sum_{j = ${1}}^{n} j^{${2}}`} are the same sum, just as a loop variable's name does not change what a loop computes.`,
      why: { q: t`Why ${math`n - m + ${1}`} and not ${math`n - m`}?`, a: t`From ${3} to ${7} the values are ${listOf([3, 4, 5, 6, 7])}: five of them, and ${math`${7} - ${3} + ${1} = ${5}`}. Subtracting counts the gaps between the values; there is one more value than gaps.` },
    },
    checkFrom(evaluate, { m: 2, n: 5, a: 3, b: -1 }, t`The terms for ${math`i = ${2}, ${3}, ${4}, ${5}`} are ${listOf([5, 8, 11, 14])}, which add to ${38}.`),
    { kind: 'section', title: t`Rules for manipulating sums` },
    { kind: 'theorem', name: t`Linearity`, statement: t`For numbers ${math`a_{i}, b_{i}`} and a constant ${math`c`}, ${math`\sum_{i = m}^{n} (a_{i} + b_{i}) = \sum_{i = m}^{n} a_{i} + \sum_{i = m}^{n} b_{i}`} and ${math`\sum_{i = m}^{n} c\,a_{i} = c \sum_{i = m}^{n} a_{i}`}. In particular ${math`\sum_{i = ${1}}^{n} c = cn`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Split`, text: t`${math`(a_{m} + b_{m}) + \cdots + (a_{n} + b_{n})`} can be reordered as ${math`(a_{m} + \cdots + a_{n}) + (b_{m} + \cdots + b_{n})`}, because a finite sum can be added in any order.` },
        { label: t`Scale`, text: t`${math`c\,a_{m} + \cdots + c\,a_{n} = c(a_{m} + \cdots + a_{n})`}, by the distributive law.` },
        { label: t`Constants`, text: t`${math`\sum_{i = ${1}}^{n} c`} has ${mn} terms, each equal to ${math`c`}, so it is ${math`cn`}.`, plain: t`The term does not mention ${mi}, but it is still added once for every value of ${mi}.` },
      ],
    },
    {
      kind: 'p',
      text: t`A third rule moves the index. To start a sum at ${1}, substitute ${math`i = j + m - ${1}`}: as ${math`j`} runs from ${1} to ${math`n - m + ${1}`}, ${mi} runs from ${mm} to ${mn}, so ${dmath`\sum_{i = m}^{n} a_{i} = \sum_{j = ${1}}^{n - m + ${1}} a_{j + m - ${1}}.`}`,
    },
    checkFrom(shift, { m: 3, a: 4, b: 1 }, t`Put ${math`i = j + ${2}`} into ${math`${4}i + ${1}`}: ${math`${4}(j + ${2}) + ${1} = ${4}j + ${9}`}.`),
    { kind: 'pitfall', claim: t`${math`\sum_{i = ${1}}^{n} a_{i}b_{i} = \Big(\sum_{i = ${1}}^{n} a_{i}\Big)\Big(\sum_{i = ${1}}^{n} b_{i}\Big)`}.`, counterexample: t`Take ${math`n = ${2}`} and ${math`a_{i} = b_{i} = i`}. The left side is ${math`${1} + ${4} = ${5}`}; the right side is ${math`${3} \times ${3} = ${9}`}. Sums split over plus signs, not over products.` },
    { kind: 'section', title: t`Telescoping` },
    { kind: 'narrative', text: t`Now the trick that finds formulas. Cambridge supervision exercise ${math`${4}.${3}.${2}`} hints at it: look at a sum of differences of one function at neighbouring points. Almost everything cancels, like the sections of a telescope sliding into each other.` },
    { kind: 'theorem', name: t`Telescoping sum`, statement: t`For any function ${mf} and ${math`n \ge ${0}`}, ${math`\sum_{i = ${0}}^{n} \big(f(i + ${1}) - f(i)\big) = f(n + ${1}) - f(${0})`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Write it out`, text: t`The sum is ${math`\big(f(${1}) - f(${0})\big) + \big(f(${2}) - f(${1})\big) + \cdots + \big(f(n + ${1}) - f(n)\big)`}.` },
        { label: t`Cancel`, text: t`Each of ${math`f(${1}), \ldots, f(n)`} appears once with a plus sign and once with a minus sign, so they cancel.`, why: { q: t`Can you see it for a small case?`, a: t`With ${math`n = ${1}`}: ${math`\big(f(${1}) - f(${0})\big) + \big(f(${2}) - f(${1})\big) = f(${2}) - f(${0})`}, since ${math`f(${1})`} cancels.` } },
        { label: t`What is left`, text: t`Only ${math`f(n + ${1})`} and ${math`-f(${0})`} survive.` },
      ],
    },
    { kind: 'narrative', text: t`This is [[telescoping|telescoping]]. Choose ${mf} so that the differences are something you want to add up, and the theorem gives the total for free.` },
    {
      kind: 'steps',
      steps: [
        { label: t`Choose f`, text: t`Take ${math`f(i) = i^{${2}}`}. Then ${math`f(i + ${1}) - f(i) = (i + ${1})^{${2}} - i^{${2}} = ${2}i + ${1}`}.` },
        { label: t`Telescope`, text: t`By the theorem, ${math`\sum_{i = ${0}}^{n} (${2}i + ${1}) = (n + ${1})^{${2}} - ${0}^{${2}} = (n + ${1})^{${2}}`}.` },
        { label: t`Use linearity`, text: t`The left side is ${math`${2}\sum_{i = ${0}}^{n} i + (n + ${1})`}, since the constant ${1} is added ${math`n + ${1}`} times.` },
        { label: t`Solve`, text: t`So ${math`${2}\sum_{i = ${0}}^{n} i = (n + ${1})^{${2}} - (n + ${1}) = n(n + ${1})`}, and the ${math`i = ${0}`} term is ${0}:`, eq: [dmath`\sum_{i = ${1}}^{n} i = \frac{n(n + ${1})}{${2}}.`] },
      ],
    },
    { kind: 'p', text: t`With ${math`f(i) = i^{${3}}`} the same steps give ${math`\sum_{i = ${1}}^{n} i^{${2}} = \frac{n(n + ${1})(${2}n + ${1})}{${6}}`}; that is the worked Cambridge example below. And the hook: ${math`\sum_{i = ${1}}^{${hookCount}} (${2}i - ${1}) = ${2} \times \frac{${hookCount} \times ${hookCount + 1}}{${2}} - ${hookCount} = ${hookCount * hookCount}`}.` },
    checkFrom(closedForm, { body: { kind: 'lin', a: 4, b: -1 } }, t`Split and scale: ${math`${4}\sum i - \sum ${1} = ${4} \times \frac{n(n + ${1})}{${2}} - n = ${2}n^{${2}} + n`}.`),
    { kind: 'pitfall', claim: t`${math`\sum_{i = ${1}}^{n} ${3} = ${3}`}.`, counterexample: t`The term does not depend on ${mi}, but it is still added once for each of the ${mn} values of ${mi}: the sum is ${math`${3}n`}.` },
    { kind: 'takeaway', text: t`Sigma notation records the rule and the range; split, scale and shift to rearrange, and telescope ${math`f(i + ${1}) - f(i)`} to find closed forms.` },
  ],
  examples: [
    workedCambridge(sw432c),
    worked(closedForm, { body: { kind: 'lin', a: 3, b: 2 } }, t`A linear term`),
    worked(shift, { m: 3, a: 2, b: -1 }, t`Starting the index at one`),
  ],
  generators: [evaluate, closedForm, shift, pattern],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['sigma-notation', 'index-variable', 'telescoping'],
  cambridge: [bop10_1, bop10_4, bop10_6, bop10_7, bop10_15, bop10_3, sw432d, bop10_20],
  // The general polynomial for the sum of kth powers is the one Cambridge-standard problem
  // here; the rest are Book of Proof.
  gate: ['sw-4-3-2-d'],
  recall: [
    { front: t`How many terms has ${math`\sum_{i = m}^{n} a_{i}`}?`, back: t`${math`n - m + ${1}`}.` },
    { front: t`State the telescoping sum.`, back: t`${math`\sum_{i = ${0}}^{n} \big(f(i + ${1}) - f(i)\big) = f(n + ${1}) - f(${0})`}.` },
    { front: t`${math`\sum_{i = ${1}}^{n} i`} and ${math`\sum_{i = ${1}}^{n} i^{${2}}`}?`, back: t`${math`\frac{n(n + ${1})}{${2}}`} and ${math`\frac{n(n + ${1})(${2}n + ${1})}{${6}}`}.` },
    { front: t`Shift ${math`\sum_{i = m}^{n} a_{i}`} to start at ${1}.`, back: t`${math`\sum_{j = ${1}}^{n - m + ${1}} a_{j + m - ${1}}`}.` },
  ],
  proofOrder: [
    {
      title: t`${math`\sum_{i = ${1}}^{n} i`} by telescoping`,
      steps: [
        t`With ${math`f(i) = i^{${2}}`}, ${math`f(i + ${1}) - f(i) = ${2}i + ${1}`}.`,
        t`Telescoping: ${math`\sum_{i = ${0}}^{n} (${2}i + ${1}) = (n + ${1})^{${2}}`}.`,
        t`Linearity: ${math`${2}\sum i + (n + ${1}) = (n + ${1})^{${2}}`}.`,
        t`Solve: ${math`\sum_{i = ${1}}^{n} i = \frac{n(n + ${1})}{${2}}`}.`,
      ],
    },
  ],
};
