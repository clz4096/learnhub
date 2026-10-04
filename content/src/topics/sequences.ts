/** pre.sequences: Sequences and nth term rules. */
import { int, q, str } from '../math';
import { poly, signed } from '../poly';
import { generator, type Misconception } from '../problem';
import { computed, computedMath as cm, math, t } from '../rich';
import { worked, type TopicContent } from '../topic';

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
/** A signed constant, "+ 3" or "- 3", as computed text. */
const sg = (n: number) => computed(signed(n));
const terms = (f: (n: number) => number, count: number): string => Array.from({ length: count }, (_, i) => f(i + 1)).join(', ');

// ---------------------------------------------------------------- generators

interface NthP { a: number; d: number }

const nthTerm = generator<NthP>({
  id: 'nth-term',
  skill: 'Find the nth term of an arithmetic sequence from its first terms.',
  params: (rng) => ({ a: int(rng, -10, 20), d: nonzero(rng, -6, 9) }),
  sane: ({ a, d }) => (a >= -10 && a <= 20 && d !== 0 && d >= -6 && d <= 9 ? null : 'out of range'),
  problem: ({ a, d }) => ({
    prompt: t`Find the nth term of the sequence ${computed(terms((n) => a + (n - 1) * d, 4))}, ... as an expression in n.`,
    answer: { kind: 'expression', expected: nth(d, a - d), variables: N, domains: ND },
    solution: [
      t`Each term is ${Math.abs(d)} ${d > 0 ? 'more' : 'less'} than the one before, so the [[common-difference|common difference]] is ${d} and the nth term starts ${cm(nth(d, 0))}.`,
      t`At n = ${1}, ${cm(nth(d, 0))} gives ${d}, but the first term is ${a}. Adjust by ${a} - ${d} = ${a - d}.`,
      t`So the nth term is ${cm(nth(d, a - d))}. Check n = ${2}: ${2 * d + a - d}, the second term.`,
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
    { response: nth(d, a), why: t`That gives ${a + d} at n = ${1}, not ${a}. The first term is ${d} times ${1} plus the constant, so the constant is ${a} - ${d} = ${a - d}.` },
    { response: nth(a, d), why: t`The two numbers are swapped. The common difference ${d} multiplies n; the constant makes the first term come out right.` },
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
      prompt: t`A sequence starts with ${math`u_${1} = ${s}`}, and each term after that is ${m} times the previous term ${c > 0 ? 'plus' : 'minus'} ${Math.abs(c)}: ${math`u_(n+${1}) = ${m}u_n ${sg(c)}`}. Find ${math`u_${k}`}.`,
      answer: { kind: 'exact', expected: String(uk) },
      solution: [
        t`Apply the [[term-to-term|term-to-term rule]] one step at a time, starting from ${math`u_${1} = ${s}`}.`,
        ...seq.slice(1).map((u, i) => t`${math`u_${i + 2} = ${m} * ${seq[i] as number} ${sg(c)} = ${u}`}`),
        t`So ${math`u_${k} = ${uk}`}.`,
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
      { response: String(at(k + 1)), why: t`One step too many. ${math`u_${1}`} is the first term, so ${math`u_${k}`} needs only ${k - 1} applications of the rule.` },
      { response: String(at(k - 1)), why: t`One step short. Count the terms: ${math`u_${1}`} is given, and each step makes the next one, up to ${math`u_${k}`}.` },
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
      prompt: t`The nth term of a sequence is ${cm(nth(a, b))}. Which term is equal to ${T}?`,
      answer: { kind: 'exact', expected: String(k) },
      solution: [
        t`Set the nth term equal to ${T}: ${cm(`${nth(a, b)} = ${T}`)}.`,
        t`${b > 0 ? 'Subtract' : 'Add'} ${Math.abs(b)}: ${cm(`${a}n = ${T - b}`)}. Divide by ${a}: n = ${k}.`,
        t`So ${T} is term number ${k}. Check: ${a} * ${k} ${sg(b)} = ${T}.`,
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
      { response: String(T), why: t`That is the value of the term. The question asks for its position n.` },
    ];
  },
});

// ---------------------------------------------------------------- lesson

const L = { a: 5, d: 3 };
const u = (n: number): number => L.a + (n - 1) * L.d;

export const sequences: TopicContent = {
  topicId: 'pre.sequences',
  goal: t`Generate a sequence from a term-to-term or position-to-term rule, and find the nth term of an arithmetic sequence.`,
  lesson: [
    { kind: 'p', text: t`A [[sequence|sequence]] is a list of numbers in order, such as ${computed(terms(u, 5))}, and so on. Each number is a [[term|term]]. We write ${math`u_${1}`} for the first term, ${math`u_${2}`} for the second, and ${math`u_n`} for the term in position n.` },
    { kind: 'p', text: t`A [[term-to-term|term-to-term rule]] says how to get the next term from the one before: here, add ${L.d}. So ${math`u_(n+${1}) = u_n + ${L.d}`}, starting from ${math`u_${1} = ${L.a}`}.` },
    { kind: 'p', text: t`A [[position-to-term|position-to-term rule]], or nth term, gives any term straight from its position. Here ${math`u_n = ${computed(nth(L.d, L.a - L.d))}`}. Check: n = ${1} gives ${L.d + L.a - L.d}, and n = ${4} gives ${4 * L.d + L.a - L.d}. Now the ${100}th term needs no listing: ${math`u_${100} = ${L.d} * ${100} ${sg(L.a - L.d)} = ${u(100)}`}.` },
    { kind: 'rule', text: t`An [[arithmetic-sequence|arithmetic sequence]] adds the same number d each time: the [[common-difference|common difference]]. Its nth term is ${math`dn + (u_${1} - d)`}.` },
    { kind: 'p', text: t`Why: the nth term is the first term plus n - ${1} steps of d. So ${math`u_n = u_${1} + (n - ${1})d`}, which expands to ${math`dn + (u_${1} - d)`}. For ${computed(terms(u, 4))}, d = ${L.d} and ${math`u_${1} - d = ${L.a - L.d}`}.` },
    { kind: 'p', text: t`Not every sequence is arithmetic. With the rule "double and add ${1}" from ${1}, the terms are ${computed(terms((n) => 2 ** n - 1, 5))}: the gaps grow, so there is no common difference.` },
  ],
  examples: [
    worked(nthTerm, { a: 7, d: -2 }, t`A decreasing sequence`),
    worked(recursive, { s: 2, m: 3, c: -1, k: 4 }, t`Using a term-to-term rule`),
    worked(whichTerm, { a: 4, b: -3, k: 25 }, t`Which term is it?`),
  ],
  generators: [nthTerm, recursive, whichTerm],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['sequence', 'term', 'term-to-term', 'position-to-term', 'arithmetic-sequence', 'common-difference'],
};
