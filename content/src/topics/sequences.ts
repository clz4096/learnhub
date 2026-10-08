/**
 * pre.sequences: Sequences and nth term rules. No Cambridge source teaches sequences from
 * the start (decision 11); the CST supervision exercise 1.3.1 (triangular numbers, from
 * t_0 = 0) and STEP Support Assignment 6 Q1(i) (a general term from its first cases)
 * supply the examples and problems, checked against the official 2023-24 solutions and
 * the STEP hints. The second gate (batch 9) is IA Numbers and Sets Example Sheet 1, Q2: the
 * sequence 41, 43, 47, 53, 61, ..., whose gaps grow by 2, is not all prime. Its nth term,
 * 41 + n(n - 1), comes from adding the gaps as the arithmetic-sequence proof does, with the
 * triangular numbers; the first 40 terms are prime, so trial and error is slow.
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { add, div, int, mul, q, str, toFloat, upTo, type Rational } from '../math';
import { poly, signed } from '../poly';
import { generator, type Misconception } from '../problem';
import { computedMath as cm, dmath, listOf, math, paren, t, texOf, type Span } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

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

// IA Numbers and Sets Example Sheet 1, Q2: 41, 43, 47, 53, 61, ..., each gap 2 more than the last.
const EULER_START = 41;
/** The nth term: the first term plus the gaps 2, 4, ..., 2(n - 1). */
const eulerTerm = (n: number): number => EULER_START + n * (n - 1);
const isPrime = (m: number): boolean => {
  if (m < 2) return false;
  for (let d = 2; d * d <= m; d++) if (m % d === 0) return false;
  return true;
};
/** Null when v is a term of the sequence that is not prime, else why not. */
function notPrimeTerm(v: number): string | null {
  if (!Number.isInteger(v)) return `${v} is not a whole number`;
  let n = 1;
  while (eulerTerm(n) < v) n++;
  if (eulerTerm(n) !== v) return `${v} is not a term of the sequence: the terms near it are ${eulerTerm(n - 1)} and ${eulerTerm(n)}`;
  return isPrime(v) ? `${v} is a term, but it is prime` : null;
}
const ns1Q2 = auto({
  id: 'ns1-q2',
  source: cite('ia-ns-sheet-1', 'Q2'),
  title: t`Are they all prime?`,
  prompt: t`Consider the sequence ${listOf([eulerTerm(1), eulerTerm(2), eulerTerm(3), eulerTerm(4), eulerTerm(5)])}, ..., where each difference is ${2} more than the previous one. Are all of these numbers prime? Settle it by giving a term of the sequence that is not prime.`,
  answer: { kind: 'witness', count: 1, example: String(eulerTerm(EULER_START)), check: (v) => notPrimeTerm(toFloat(v[0] as Rational)) },
  solution: [
    t`Trying the terms one by one is slow: the first ${EULER_START - 1} of them are all prime. Find the position-to-term rule instead. The differences are ${listOf([2, 4, 6, 8])}, ..., so the step from ${math`u_k`} to ${math`u_{k + ${1}}`} is ${math`${2}k`}.`,
    t`As in the proof for arithmetic sequences, ${math`u_n - u_{${1}}`} is the sum of the steps from position ${1} to position ${mn}: ${math`u_n = ${EULER_START} + ${2}(${1} + ${2} + \cdots + (n - ${1})) = ${EULER_START} + ${2}t_{n - ${1}}`}, and ${math`t_{n - ${1}} = \frac{(n - ${1})n}{${2}}`}. So ${math`u_n = ${EULER_START} + n(n - ${1})`}. Check: ${math`u_{${5}} = ${EULER_START} + ${20} = ${eulerTerm(5)}`}.`,
    t`Now choose ${mn} to make a factor appear. With ${math`n = ${EULER_START}`}, ${math`u_{${EULER_START}} = ${EULER_START} + ${EULER_START} \times ${EULER_START - 1} = ${EULER_START} \times ${EULER_START} = ${eulerTerm(EULER_START)}`}, which is not prime. So the answer is no: a pattern that holds for ${EULER_START - 1} terms can still fail.`,
  ],
  reference: String(eulerTerm(EULER_START)),
  verify: () => {
    // Build the terms by adding the gaps, and compare with the rule; the first 40 are prime, the 41st is 41 squared.
    let u = EULER_START;
    for (let k = 1; k <= EULER_START; k++) {
      const e = same(`u_${k} from the gaps`, u, eulerTerm(k));
      if (e !== null) return e;
      if (k < EULER_START && !isPrime(u)) return `u_${k} = ${u} is not prime`;
      u += 2 * k;
    }
    return same('u_41', eulerTerm(EULER_START), EULER_START * EULER_START) ?? notPrimeTerm(eulerTerm(EULER_START));
  },
  misconceptions: [
    { response: '51', why: t`${51} is not prime, but it is not a term either: the gaps grow, so the terms go ${listOf([eulerTerm(4), eulerTerm(5), eulerTerm(6)])}, and ${51} is skipped.` },
  ],
});

// ---------------------------------------------------------------- lesson

const L = { a: 5, d: 3 };
const u = (n: number): number => L.a + (n - 1) * L.d;
/** Regions made by joining n points on a circle in general position: 1, 2, 4, 8, 16, 31 (the pattern breaks). */
const circleRegions = (n: number): number => 1 + (n * (n - 1)) / 2 + (n * (n - 1) * (n - 2) * (n - 3)) / 24;
const [md, mu1] = [math`d`, math`u_{${1}}`];

export const sequences: TopicContent = {
  topicId: 'pre.sequences',
  goal: t`Generate a sequence from a term-to-term or position-to-term rule, and find the ${mn}th term of an arithmetic sequence.`,
  objective: t`Generate a sequence from a rule, and find the nth term of an arithmetic sequence.`,
  why: t`Sequences carry sums, induction and recurrences, and every limit in analysis is a limit of a sequence.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`The hundredth term` },
    { kind: 'hook', text: t`Here is a list: ${terms(u, 5)}. What is the ${100}th number in it? You could keep adding ${L.d}, ninety-nine times over. There is a much faster way, and finding it is the point of this lesson.` },
    { kind: 'narrative', text: t`Notice there are two ways to describe the list. One says how to get from each number to the next: add ${L.d}. The other would say how to get any number straight from its position, without the ones before. The first is easy to see; the second is what answers the question.` },
    { kind: 'section', title: t`Sequences and their rules` },
    {
      kind: 'definition',
      name: t`Sequence`,
      formal: t`A [[sequence|sequence]] is a list of numbers ${math`u_{${1}}, u_{${2}}, u_{${3}}, \ldots`} indexed by position; formally, a function ${math`n \mapsto u_{n}`} on the positive integers. Each ${math`u_{n}`} is a [[term|term]].`,
      plain: t`In plain words: numbers in a definite order, with ${math`u_{n}`} the one in position ${mn}. Above, ${math`u_{${1}} = ${u(1)}`} and ${math`u_{${3}} = ${u(3)}`}.`,
    },
    {
      kind: 'definition',
      name: t`Term-to-term and position-to-term rules`,
      formal: t`A [[term-to-term|term-to-term rule]] gives ${mu1} and expresses ${math`u_{n + ${1}}`} in terms of ${math`u_{n}`}. A [[position-to-term|position-to-term rule]] expresses ${math`u_{n}`} directly in terms of ${mn}.`,
      plain: t`In plain words: "start at ${L.a} and add ${L.d} each time" is term-to-term, ${math`u_{n + ${1}} = u_{n} + ${L.d}`}. "The ${mn}th term is ${cm(nth(L.d, L.a - L.d))}" is position-to-term.`,
    },
    checkFrom(recursive, { s: 1, m: 2, c: 1, k: 5 }, t`Double and add ${1}, starting from ${1}: ${listOf([1, 3, 7, 15, 31])}. The fifth term is ${31}.`),
    { kind: 'section', title: t`Arithmetic sequences` },
    {
      kind: 'definition',
      name: t`Arithmetic sequence`,
      formal: t`A sequence is an [[arithmetic-sequence|arithmetic sequence]] if there is a number ${md} with ${math`u_{n + ${1}} - u_{n} = d`} for every ${math`n \ge ${1}`}. The number ${md} is its [[common-difference|common difference]].`,
      plain: t`In plain words: the same step every time. ${terms(u, 4)} has ${math`d = ${L.d}`}; ${terms((n) => 10 - 4 * n, 4)} has ${math`d = -${4}`}.`,
    },
    { kind: 'theorem', statement: t`If ${math`(u_{n})`} is arithmetic with common difference ${md}, then ${math`u_{n} = u_{${1}} + (n - ${1})d`} for every ${math`n \ge ${1}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Write the gap as steps`, text: t`For ${math`n \ge ${2}`}, ${math`u_{n} - u_{${1}} = (u_{${2}} - u_{${1}}) + (u_{${3}} - u_{${2}}) + \cdots + (u_{n} - u_{n - ${1}})`}.`, why: { q: t`Why is that true?`, a: t`On the right every term except ${math`u_{n}`} and ${math`-u_{${1}}`} appears once with a plus sign and once with a minus sign, so they cancel. With ${math`n = ${3}`}: ${math`(u_{${2}} - u_{${1}}) + (u_{${3}} - u_{${2}}) = u_{${3}} - u_{${1}}`}.` } },
        { label: t`Count the steps`, text: t`There are ${math`n - ${1}`} brackets, and each equals ${md} by the definition, so ${math`u_{n} - u_{${1}} = (n - ${1})d`}.`, plain: t`From position ${1} to position ${mn} is ${math`n - ${1}`} steps, not ${mn}.` },
        { label: t`Rearrange`, text: t`Add ${mu1} to both sides: ${math`u_{n} = u_{${1}} + (n - ${1})d`}. For ${math`n = ${1}`} it says ${math`u_{${1}} = u_{${1}}`}, so it holds for every ${math`n \ge ${1}`}.` },
      ],
    },
    { kind: 'p', text: t`Expanding gives the form ${math`u_{n} = dn + (u_{${1}} - d)`}: the common difference times ${mn}, plus a correction. For the hook, ${math`u_{n} = ${L.a} + (n - ${1}) \times ${L.d} = ${cm(nth(L.d, L.a - L.d))}`}, so ${math`u_{${100}} = ${L.d} \times ${100} ${sg(L.a - L.d)} = ${u(100)}`}.` },
    checkFrom(nthTerm, { a: 4, d: 6 }, t`${math`d = ${6}`} and ${math`u_{${1}} = ${4}`}, so ${math`u_{n} = ${4} + (n - ${1}) \times ${6} = ${6}n - ${2}`}.`),
    { kind: 'pitfall', claim: t`The ${mn}th term is ${math`u_{${1}} + nd`}.`, counterexample: t`At ${math`n = ${1}`} that gives ${math`u_{${1}} + d`}, already one step too far. For ${terms(u, 3)} it would give ${math`u_{${1}} = ${L.a + L.d}`}. There are ${math`n - ${1}`} steps from the first term to the ${mn}th.` },
    { kind: 'section', title: t`Triangular numbers` },
    { kind: 'narrative', text: t`A sequence may start at position ${0}. The Cambridge Discrete Mathematics exercises define the [[triangular-number|triangular numbers]] ${math`t_{k} = ${0} + ${1} + \cdots + k`}, from ${math`t_{${0}} = ${0}`}: ${listOf([0, 1, 2, 3, 4, 5].map(tri))}, and so on. They count the dots in a triangle with rows of ${1}, ${2}, ${3}, and so on.` },
    { kind: 'p', text: t`Their term-to-term rule is ${math`t_{k} = t_{k - ${1}} + k`}. The step grows each time, ${listOf([1, 2, 3, 4, 5])}, so the sequence is not arithmetic. Finding its position-to-term rule is the first part of supervision exercise ${1}.${3}.${1}.` },
    { kind: 'pitfall', claim: t`Joining points on a circle in every way makes ${listOf([1, 2, 3, 4, 5].map(circleRegions))} regions for ${listOf([1, 2, 3, 4, 5])} points, so the pattern is doubling and ${6} points give ${32}.`, counterexample: t`${6} points in general position give ${circleRegions(6)} regions, not ${32}. A pattern in the first few terms suggests a rule; it does not prove one. The STEP Support hints say the same: the general case must be shown to work.` },
    { kind: 'takeaway', text: t`A term-to-term rule builds a sequence step by step; for an arithmetic sequence the position-to-term rule is ${math`u_{n} = u_{${1}} + (n - ${1})d`}.` },
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
  cambridge: withUses([sw131b, sw131c, ns1Q2], {
    'sw-1-3-1-c': { sections: ['Triangular numbers'], note: t`An if and only if proof about triangular numbers and odd squares`, needs: ['pre.algebraic-argument', 'logic.iff'] },
    'ns1-q2': { sections: ['Sequences and their rules', 'Arithmetic sequences', 'Triangular numbers'], note: t`Finding the nth term when the differences grow, then choosing n to make a factor appear` },
  }),
  // The IA nth term gates. 1.3.1(d), consecutive triangular numbers add to a square, is a written proof, so it is
  // set in proof.direct, the first topic that teaches writing one (Rule 1, 2026-10-08). 1.3.1(c) is an if and only if proof by
  // parity, taught later, so it is practice. The formula for the kth triangular number is recall, so it does not gate.
  gate: ['ns1-q2'],
  recall: [
    { front: t`Term-to-term rule versus position-to-term rule?`, back: t`Term-to-term gives ${math`u_{n + ${1}}`} from ${math`u_{n}`}; position-to-term gives ${math`u_{n}`} from ${mn}.` },
    { front: t`When is a sequence arithmetic?`, back: t`When ${math`u_{n + ${1}} - u_{n} = d`}, the same ${md}, for every ${mn}.` },
    { front: t`The ${mn}th term of an arithmetic sequence?`, back: t`${math`u_{n} = u_{${1}} + (n - ${1})d`}.` },
  ],
  proofOrder: [
    {
      title: t`The ${mn}th term of an arithmetic sequence`,
      steps: [
        t`Write ${math`u_{n} - u_{${1}}`} as the sum of the ${math`n - ${1}`} gaps between consecutive terms.`,
        t`Each gap is ${md}, so ${math`u_{n} - u_{${1}} = (n - ${1})d`}.`,
        t`Add ${mu1}: ${math`u_{n} = u_{${1}} + (n - ${1})d`}.`,
      ],
    },
  ],
};
