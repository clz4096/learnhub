/**
 * pre.sequences: Sequences and nth term rules. No Cambridge source teaches sequences from
 * the start (decision 11); the CST supervision exercise 1.3.1 (triangular numbers, from
 * t_0 = 0) and STEP Support Assignment 6 Q1(i) (a general term from its first cases)
 * supply the examples and problems, checked against the official 2023-24 solutions and
 * the STEP hints.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { add, div, int, mul, q, str, upTo } from '../math';
import { poly, signed } from '../poly';
import { generator, type Misconception } from '../problem';
import { computedMath as cm, dmath, listOf, math, paren, t, texOf, type Span } from '../rich';
import { worked, workedCambridge, type TopicContent } from '../topic';

const N = ['n'] as const;
const ND = { n: { kind: 'integer', min: 1, max: 50 } } as const;
const nonzero = (rng: () => number, lo: number, hi: number): number => {
  for (;;) {
    const v = int(rng, lo, hi);
    if (v !== 0) return v;
  }
};
/** "3n + 2", "-n + 7", "4n": the nth term an + b. */
const nth = (a: number, b: number): string => poly([a, b], 'n');
/** A signed constant, + 3 or - 3, as computed math. */
const sg = (n: number): Span => ({ kind: 'math', text: `${n < 0 ? '-' : '+'} ${texOf(Math.abs(n))}`, typed: [] });
/** The first `count` terms, then an ellipsis: 5, 8, 11, \ldots */
const terms = (f: (n: number) => number, count: number): Span => math`${listOf(Array.from({ length: count }, (_, i) => f(i + 1)))}, \ldots`;
const mn = math`n`;

// ---------------------------------------------------------------- generators

interface NthP { a: number; d: number }

const nthTerm = generator<NthP>({
  id: 'nth-term',
  skill: 'Find the nth term of an arithmetic sequence from its first terms.',
  params: (rng) => ({ a: int(rng, -10, 20), d: nonzero(rng, -6, 9) }),
  sane: ({ a, d }) => (a >= -10 && a <= 20 && d !== 0 && d >= -6 && d <= 9 ? null : 'out of range'),
  problem: ({ a, d }) => ({
    prompt: t`Find the ${mn}th term of the sequence ${terms((n) => a + (n - 1) * d, 4)} as an expression in ${mn}.`,
    answer: { kind: 'expression', expected: nth(d, a - d), variables: N, domains: ND },
    solution: [
      t`Each term is ${Math.abs(d)} ${d > 0 ? 'more' : 'less'} than the one before, so the [[common-difference|common difference]] is ${d} and the ${mn}th term starts ${cm(nth(d, 0))}.`,
      t`At ${math`n = ${1}`}, ${cm(nth(d, 0))} gives ${d}, but the first term is ${a}. Adjust by ${math`${a} - ${paren(d)} = ${a - d}`}.`,
      t`So the ${mn}th term is ${cm(nth(d, a - d))}. Check ${math`n = ${2}`}: ${2 * d + a - d}, the second term.`,
    ],
  }),
  solve: ({ a, d }) => {
    // Fit a line through the first two terms, (1, u1) and (2, u2).
    const u1 = a;
    const u2 = a + d;
    const slope = u2 - u1;
    return nth(slope, u1 - slope);
  },
  misconceptions: ({ a, d }): Misconception[] => [
    { response: nth(d, a), why: t`That gives ${a + d} at ${math`n = ${1}`}, not ${a}. The first term is ${d} times ${1} plus the constant, so the constant is ${math`${a} - ${paren(d)} = ${a - d}`}.` },
    { response: nth(a, d), why: t`The two numbers are swapped. The common difference ${d} multiplies ${mn}; the constant makes the first term come out right.` },
    { response: `n ${signed(d)}`, why: t`Adding ${d} each time is the term-to-term rule. The position-to-term rule multiplies the position by the common difference: start from ${cm(nth(d, 0))}.` },
  ],
});

interface RecP { s: number; m: number; c: number; k: number }

const recursive = generator<RecP>({
  id: 'term-to-term',
  skill: 'Generate terms from a term-to-term rule.',
  params(rng) {
    for (;;) {
      const p = { s: int(rng, 1, 5), m: int(rng, 2, 3), c: nonzero(rng, -5, 5), k: int(rng, 4, 6) };
      // Not a fixed point (s = ms + c), where every term is the same and counting steps does not matter.
      if (p.m * p.s + p.c !== p.s) return p;
    }
  },
  sane: ({ s, m, c, k }) => (s >= 1 && s <= 5 && m >= 2 && m <= 3 && c !== 0 && Math.abs(c) <= 5 && k >= 4 && k <= 6 && m * s + c !== s ? null : 'out of range'),
  problem: ({ s, m, c, k }) => {
    // Closed form for u(n + 1) = m u(n) + c with u(1) = s.
    const uk = m ** (k - 1) * s + (c * (m ** (k - 1) - 1)) / (m - 1);
    const seq: number[] = [s];
    while (seq.length < k) seq.push(m * (seq[seq.length - 1] as number) + c);
    return {
      prompt: t`A sequence starts with ${math`u_{${1}} = ${s}`}, and each term after that is ${m} times the previous term ${c > 0 ? 'plus' : 'minus'} ${Math.abs(c)}: ${math`u_{n+${1}} = ${m}u_n ${sg(c)}`}. Find ${math`u_{${k}}`}.`,
      answer: { kind: 'exact', expected: String(uk) },
      solution: [
        t`Apply the [[term-to-term|term-to-term rule]] one step at a time, starting from ${math`u_{${1}} = ${s}`}.`,
        ...seq.slice(1).map((u, i) => t`${math`u_{${i + 2}} = ${m} \times ${paren(seq[i] as number)} ${sg(c)} = ${u}`}`),
        t`So ${math`u_{${k}} = ${uk}`}.`,
      ],
    };
  },
  solve: ({ s, m, c, k }) => {
    let u = s;
    for (let i = 1; i < k; i++) u = m * u + c;
    return String(u);
  },
  misconceptions: ({ s, m, c, k }): Misconception[] => {
    const at = (j: number): number => {
      let u = s;
      for (let i = 1; i < j; i++) u = m * u + c;
      return u;
    };
    return [
      { response: String(at(k + 1)), why: t`One step too many. ${math`u_{${1}}`} is the first term, so ${math`u_{${k}}`} needs only ${k - 1} applications of the rule.` },
      { response: String(at(k - 1)), why: t`One step short. Count the terms: ${math`u_{${1}}`} is given, and each step makes the next one, up to ${math`u_{${k}}`}.` },
      { response: String(m ** (k - 1) * s), why: t`Remember to ${c > 0 ? 'add' : 'subtract'} ${Math.abs(c)} at every step, not only multiply.` },
    ];
  },
});

interface WhichP { a: number; b: number; k: number }

const whichTerm = generator<WhichP>({
  id: 'which-term',
  skill: 'Find the position of a given value in a sequence from its nth term.',
  params: (rng) => ({ a: int(rng, 2, 9), b: nonzero(rng, -9, 15), k: int(rng, 10, 60) }),
  sane: ({ a, b, k }) => (a >= 2 && a <= 9 && b !== 0 && b >= -9 && b <= 15 && k >= 10 && k <= 60 ? null : 'out of range'),
  problem: ({ a, b, k }) => {
    const T = a * k + b;
    return {
      prompt: t`The ${mn}th term of a sequence is ${cm(nth(a, b))}. Which term is equal to ${T}?`,
      answer: { kind: 'exact', expected: String(k) },
      solution: [
        t`Set the ${mn}th term equal to ${T}: ${cm(`${nth(a, b)} = ${T}`)}.`,
        t`${b > 0 ? 'Subtract' : 'Add'} ${Math.abs(b)}: ${cm(`${a}n = ${T - b}`)}. Divide by ${a}: ${math`n = ${k}`}.`,
        t`So ${T} is term number ${k}. Check: ${math`${a} \times ${k} ${sg(b)} = ${T}`}.`,
      ],
    };
  },
  solve: ({ a, b, k }) => {
    // Walk along the sequence until the value appears.
    const T = a * k + b;
    for (let n = 1; n <= 1000; n++) if (a * n + b === T) return String(n);
    return 'not a term';
  },
  misconceptions: ({ a, b, k }): Misconception[] => {
    const T = a * k + b;
    return [
      { response: str(q(T + b, a)), why: t`The constant was moved the wrong way. To undo ${b > 0 ? 'adding' : 'subtracting'} ${Math.abs(b)}, ${b > 0 ? 'subtract' : 'add'} it.` },
      { response: str(q(T, a)), why: t`The constant ${b} needs undoing before dividing by ${a}.` },
      { response: String(T), why: t`That is the value of the term. The question asks for its position ${mn}.` },
    ];
  },
});

// ---------------------------------------------------------------- triangular numbers

/** t_k = 0 + 1 + ... + k, by adding. */
const tri = (k: number): number => {
  let s = 0;
  for (let i = 0; i <= k; i++) s += i;
  return s;
};

interface TriP { k: number }

const whichTriangular = generator<TriP>({
  id: 'which-triangular',
  skill: 'Find the position of a triangular number, using t_k = k(k + 1)/2 from CST supervision exercise 1.3.1.',
  params: (rng) => ({ k: int(rng, 6, 60) }),
  sane: ({ k }) => (k >= 6 && k <= 60 ? null : 'out of range'),
  problem: ({ k }) => {
    const n = (k * (k + 1)) / 2;
    return {
      prompt: t`The triangular numbers are ${math`t_k = ${0} + ${1} + \cdots + k`}, starting from ${math`t_{${0}} = ${0}`}. Which ${math`k`} has ${math`t_k = ${n}`}?`,
      answer: { kind: 'exact', expected: String(k) },
      solution: [
        t`Use the formula ${math`t_k = \frac{k(k + ${1})}{${2}}`}: we need ${math`k(k + ${1}) = ${2 * n}`}.`,
        t`Two consecutive whole numbers with that product sit either side of ${math`\sqrt{${2 * n}} \approx ${Math.sqrt(2 * n)}`}: they are ${k} and ${k + 1}, and ${math`${k} \times ${k + 1} = ${k * (k + 1)}`}. So ${math`k = ${k}`}.`,
      ],
    };
  },
  solve: ({ k }) => {
    const n = (k * (k + 1)) / 2;
    let j = 0;
    while (tri(j) < n) j++;
    return String(j);
  },
  misconceptions: ({ k }): Misconception[] => {
    const n = (k * (k + 1)) / 2;
    return [
      { response: String(k + 1), why: t`That is its place in the list counting ${math`t_{${0}}`} as the first. The question asks for the index ${math`k`}, which starts at ${0}.` },
      { response: String(k - 1), why: t`Check with the formula: ${math`t_{${k - 1}} = ${tri(k - 1)}`}, not ${n}.` },
      { response: String(Math.round(Math.sqrt(n))), why: t`${math`t_k`} is about ${math`\frac{k^{${2}}}{${2}}`}, not ${math`k^{${2}}`}: solve ${math`k(k + ${1}) = ${2 * n}`} instead.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

const SW = 'cst-dm-sw1';
const sw131a = auto({
  id: 'sw-1-3-1-a',
  source: cite(SW, 'Exercises 1, 1.3.1(a)'),
  title: t`The next triangular numbers`,
  prompt: t`A natural number is triangular if it is ${math`t_k = ${0} + ${1} + \cdots + k`} for some natural number ${math`k`}. The first three are ${math`t_{${0}} = ${0}`}, ${math`t_{${1}} = ${1}`}, and ${math`t_{${2}} = ${3}`}. Find the next three.`,
  answer: { kind: 'table', columns: [t`term`, t`value`], cell: 'exact', rows: [3, 4, 5].map((k) => [[math`t_{${k}}`], null]), expected: [3, 4, 5].map((k) => String((k * (k + 1)) / 2)) },
  solution: [
    t`Each triangular number adds the next whole number to the one before: ${math`t_k = t_{k - ${1}} + k`}.`,
    t`So ${math`t_{${3}} = ${3} + ${3} = ${tri(3)}`}, ${math`t_{${4}} = ${tri(3)} + ${4} = ${tri(4)}`}, and ${math`t_{${5}} = ${tri(4)} + ${5} = ${tri(5)}`}.`,
    t`The gaps ${listOf([1, 2, 3, 4, 5])} grow by one each time, so the sequence is not arithmetic.`,
  ],
  reference: [3, 4, 5].map((k) => String(tri(k))),
  verify: () => same('t3, t4, t5 by adding', [3, 4, 5].map(tri).join(), '6,10,15'),
  official: { source: cite('cst-dm-sols-2324-1', '1.3.1(a)'), answer: ['6', '10', '15'], agrees: true },
});

const sw131b = auto({
  id: 'sw-1-3-1-b',
  source: cite(SW, 'Exercises 1, 1.3.1(b)'),
  title: t`A formula for ${math`t_k`}`,
  prompt: t`Find a formula for the ${math`k`}th triangular number ${math`t_k = ${0} + ${1} + \cdots + k`}.`,
  answer: { kind: 'expression', expected: 'k(k + 1)/2', variables: ['k'], domains: { k: { kind: 'integer', min: 0, max: 60 } } },
  solution: [
    t`Write the sum forwards and backwards: ${math`t_k = ${0} + ${1} + \cdots + k`} and ${math`t_k = k + (k - ${1}) + \cdots + ${0}`}.`,
    t`Adding the two lines column by column, each of the ${math`k + ${1}`} columns sums to ${math`k`}, so ${math`${2}t_k = k(k + ${1})`}. (The official solution draws the same idea as two triangles of dots making a rectangle.)`,
    t`So ${math`t_k = \frac{k(k + ${1})}{${2}}`}.`,
  ],
  reference: '(k^2 + k)/2',
  verify: () => {
    for (let k = 0; k <= 50; k++) {
      const e = same(`t_${k}`, tri(k), (k * (k + 1)) / 2);
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [
    { response: 'k(k - 1)/2', why: t`That is ${math`t_{k - ${1}}`}: check at ${math`k = ${1}`}, where ${math`t_{${1}} = ${1}`}.` },
    { response: 'k^2/2', why: t`Close, but test it: at ${math`k = ${1}`} it gives ${q(1, 2)}, not ${1}. Pair the terms to find the exact count.` },
  ],
  official: { source: cite('cst-dm-sols-2324-1', '1.3.1(b)'), answer: 'k(k + 1)/2', agrees: true },
});

/** The partial products of STEP Support Assignment 6 Q1(i), (1 + 1/(2k)) over (1 - 1/(2k)) for k up to n. */
const partial = (n: number) => upTo(n).map((k) => div(add(q(1), q(1, 2 * k)), add(q(1), q(-1, 2 * k)))).reduce(mul, q(1));

const a6Seq = auto({
  id: 'a6-q1-i-sequence',
  source: cite('step-f06', 'Q1(i)', true),
  title: t`A general term from the first cases`,
  prompt: t`Let ${math`u_n`} be the product of ${math`\frac{${1} + \frac{${1}}{${2}k}}{${1} - \frac{${1}}{${2}k}}`} for ${math`k = ${1}, ${2}, \ldots, n`}. Work out ${math`u_{${1}}`} to ${math`u_{${4}}`}, then find ${math`u_n`} in terms of ${math`n`}.`,
  answer: { kind: 'expression', expected: '2n + 1', variables: ['n'], domains: { n: { kind: 'integer', min: 1, max: 30 } } },
  solution: [
    t`Each factor is ${math`\frac{${2}k + ${1}}{${2}k - ${1}}`}, so the first terms are ${listOf([1, 2, 3, 4].map((n) => Number(partial(n).num)))}.`,
    t`They go up by ${2} each time: ${math`u_n = ${2}n + ${1}`} fits. The STEP hints insist that this guess must then be shown for every ${math`n`}: the product cancels to leave the top of the last factor, ${math`${2}n + ${1}`}.`,
  ],
  reference: '2n + 1',
  verify: () => {
    for (const n of upTo(25)) {
      const e = same(`u_${n}`, str(partial(n)), String(2 * n + 1));
      if (e !== null) return e;
    }
    return null;
  },
  official: { source: cite('step-f06-hints', 'Q1(i)'), answer: '2n + 1', agrees: true },
});

const sw131c = supervision({
  id: 'sw-1-3-1-c',
  source: cite(SW, 'Exercises 1, 1.3.1(c)'),
  title: t`Triangular and square`,
  prompt: t`A natural number is square if it is ${math`k^{${2}}`} for some natural number ${math`k`}. Show that ${math`n`} is triangular if and only if ${math`${8}n + ${1}`} is a square. (Plutarch, about ${100} BC.)`,
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-1', '1.3.1(c)'),
});
const sw131d = supervision({
  id: 'sw-1-3-1-d',
  source: cite(SW, 'Exercises 1, 1.3.1(d)'),
  title: t`Two consecutive triangular numbers`,
  prompt: t`Show that the sum of every two consecutive triangular numbers is square. (Nicomachus, about ${100} BC.)`,
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-1', '1.3.1(d)'),
});

// ---------------------------------------------------------------- lesson

const L = { a: 5, d: 3 };
const u = (n: number): number => L.a + (n - 1) * L.d;

export const sequences: TopicContent = {
  topicId: 'pre.sequences',
  goal: t`Generate a sequence from a term-to-term or position-to-term rule, and find the ${mn}th term of an arithmetic sequence.`,
  lesson: [
    { kind: 'p', text: t`A [[sequence|sequence]] is a list of numbers in order, such as ${terms(u, 5)}. Each number is a [[term|term]]. We write ${math`u_{${1}}`} for the first term, ${math`u_{${2}}`} for the second, and ${math`u_n`} for the term in position ${mn}.` },
    { kind: 'p', text: t`A [[term-to-term|term-to-term rule]] says how to get the next term from the one before: here, add ${L.d}. So ${math`u_{n+${1}} = u_n + ${L.d}`}, starting from ${math`u_{${1}} = ${L.a}`}.` },
    { kind: 'p', text: t`A [[position-to-term|position-to-term rule]], or ${mn}th term, gives any term straight from its position. Here ${math`u_n = ${cm(nth(L.d, L.a - L.d))}`}. Check: ${math`n = ${1}`} gives ${L.d + L.a - L.d}, and ${math`n = ${4}`} gives ${4 * L.d + L.a - L.d}. Now the ${100}th term needs no listing: ${math`u_{${100}} = ${L.d} \times ${100} ${sg(L.a - L.d)} = ${u(100)}`}.` },
    { kind: 'rule', text: t`An [[arithmetic-sequence|arithmetic sequence]] adds the same number ${math`d`} each time: the [[common-difference|common difference]]. Its ${mn}th term is ${dmath`u_n = dn + (u_{${1}} - d).`}` },
    { kind: 'p', text: t`Why: the ${mn}th term is the first term plus ${math`n - ${1}`} steps of ${math`d`}. So ${math`u_n = u_{${1}} + (n - ${1})d`}, which expands to ${math`dn + (u_{${1}} - d)`}. For ${terms(u, 4)}, ${math`d = ${L.d}`} and ${math`u_{${1}} - d = ${L.a - L.d}`}.` },
    { kind: 'p', text: t`A sequence may start at position ${0}. The CST supervision exercises define the [[triangular-number|triangular numbers]] ${math`t_k = ${0} + ${1} + \cdots + k`} from ${math`t_{${0}} = ${0}`}: ${listOf([0, 1, 2, 3, 4, 5].map(tri))}, and so on. The term-to-term rule is ${math`t_k = t_{k - ${1}} + k`}: the steps grow, so it is not arithmetic. Its position-to-term rule is ${math`t_k = \frac{k(k + ${1})}{${2}}`}.` },
    { kind: 'p', text: t`Spotting a pattern in the first terms suggests a rule; it does not prove one. The STEP Support hints say it plainly: generalising from special cases is not enough, the general case must be shown to work.` },
    { kind: 'p', text: t`Not every sequence is arithmetic. With the rule "double and add ${1}" from ${1}, the terms are ${terms((n) => 2 ** n - 1, 5)}: the gaps grow, so there is no common difference.` },
  ],
  examples: [
    worked(nthTerm, { a: 7, d: -2 }, t`A decreasing sequence`),
    worked(recursive, { s: 2, m: 3, c: -1, k: 4 }, t`Using a term-to-term rule`),
    workedCambridge(sw131a),
    workedCambridge(a6Seq),
  ],
  generators: [nthTerm, recursive, whichTerm, whichTriangular],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['sequence', 'term', 'term-to-term', 'position-to-term', 'arithmetic-sequence', 'common-difference', 'triangular-number'],
  cambridge: [sw131b, sw131c, sw131d],
};
