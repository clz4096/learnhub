/**
 * proof.smallest-counterexample: proof by smallest counterexample, a hybrid of induction and
 * contradiction resting on the well-ordering principle. The lesson follows Book of Proof,
 * Section 10.3 (its outline and the proof that 4 divides 5^n - 1) and the well-ordering
 * principle of Section 1.9; the problems are Chapter 10's exercises 9 and 13, Chapter 9's
 * exercise 4, the 1987 STEP divisibility question of STEP Support Assignment 17, Q4(iii),
 * and CST Discrete Mathematics supervision exercise 4.1.2 (tiling with L-shaped pieces).
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { int, pick } from '../math';
import { generator, type Misconception } from '../problem';
import { computedMath, dmath, math, t, type Span } from '../rich';
import { checkFrom, worked, workedProof, type TopicContent } from '../topic';

const [mn, mk] = [math`n`, math`k`];
const isPrime = (n: number): boolean => {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
};

// ---------------------------------------------------------------- generators

/** Prime-looking polynomials an^2 + bn + c, each failing first at some natural number. */
const POLYS: readonly [number, number, number][] = [[1, 1, 41], [1, 1, 17], [1, -1, 41], [2, 0, 29], [1, 1, 11], [1, 1, 5], [2, -4, 31], [6, 6, 31], [1, -1, 17], [2, 0, 11]];
const val = ([a, b, c]: readonly [number, number, number], n: number): number => a * n * n + b * n + c;
const SQ = 2;
const polyText = ([a, b, c]: readonly [number, number, number]): string => `${a === 1 ? '' : a}n^${SQ} ${b === 0 ? '' : `${b < 0 ? '-' : '+'} ${Math.abs(b) === 1 ? '' : Math.abs(b)}n `}+ ${c}`;
const firstFail = (p: readonly [number, number, number]): number => {
  let n = 1;
  while (isPrime(val(p, n))) n++;
  return n;
};

interface FailP { i: number }

const failGen = generator<FailP>({
  id: 'first-failure',
  skill: 'Find the smallest counterexample to a claim about every natural number, by testing n = 1, 2, 3, ... in order.',
  params: (rng) => ({ i: int(rng, 0, POLYS.length - 1) }),
  sane: ({ i }) => (i >= 0 && i < POLYS.length ? null : 'out of range'),
  problem: ({ i }) => {
    const p = POLYS[i] as [number, number, number];
    const n = firstFail(p);
    const v = val(p, n);
    let f = 2;
    while (v % f !== 0) f++;
    return {
      prompt: t`Claim: for every natural number ${mn}, ${computedMath(polyText(p))} is prime. The claim is false. What is its smallest counterexample ${mn}?`,
      answer: { kind: 'exact', expected: String(n) },
      solution: [
        t`Test ${math`n = ${1}, ${2}, ${3}, \ldots`} in order; the first ${mn} giving a composite value is the smallest counterexample. The values for ${math`n = ${1}`} to ${n - 1} are all prime.`,
        t`At ${math`n = ${n}`} the value is ${math`${v} = ${f} \times ${v / f}`}, not prime. So the smallest counterexample is ${math`n = ${n}`}.`,
      ],
    };
  },
  solve: ({ i }) => {
    const p = POLYS[i] as [number, number, number];
    for (let n = 1; n < 1000; n++) {
      const v = val(p, n);
      let composite = v < 2;
      for (let d = 2; d < v && !composite; d++) if (v % d === 0) composite = true;
      if (composite) return String(n);
    }
    return '0';
  },
  misconceptions: ({ i }): Misconception[] => {
    const p = POLYS[i] as [number, number, number];
    const n = firstFail(p);
    return [
      { response: String(val(p, n)), why: t`That is the composite value. The counterexample is the input ${mn} that produces it.` },
      { response: String(n - 1), why: t`At ${math`n = ${n - 1}`} the value ${val(p, n - 1)} is prime. The first failure is one later.` },
      { response: String(n + 1), why: t`Test every ${mn} in order: ${math`n = ${n}`} already fails.` },
    ];
  },
});

interface StepP { c: number; d: number }
const STEPS: readonly [number, number][] = [[5, 4], [5, 2], [7, 3], [7, 6], [7, 2], [9, 4], [9, 8], [11, 5], [11, 10], [13, 4], [13, 6], [13, 3], [4, 3], [10, 9], [16, 5]];

const stepGen = generator<StepP>({
  id: 'contradiction-step',
  skill: 'Do the key step of a smallest-counterexample proof that d divides c^n - 1: from c^(k-1) - 1 = da, write c^k - 1 as d times something.',
  params: (rng) => {
    const [c, d] = pick(rng, STEPS);
    return { c, d };
  },
  sane: ({ c, d }) => ((c - 1) % d === 0 && d > 1 ? null : 'd must divide c - 1'),
  problem: ({ c, d }) => ({
    prompt: t`In a smallest-counterexample proof that ${math`${d} \mid ${c}^{n} - ${1}`} for all ${math`n \in \mathbb{N}`}, we reach: ${math`${c}^{k - ${1}} - ${1} = ${d}a`} for some integer ${math`a`}. Write ${math`${c}^{k} - ${1} = ${d} \times (\ldots)`}: what goes in the bracket, in terms of ${math`a`}?`,
    answer: { kind: 'expression', expected: `${c}*a + ${(c - 1) / d}`, variables: ['a'] },
    solution: [
      t`Multiply ${math`${c}^{k - ${1}} - ${1} = ${d}a`} by ${c}: ${math`${c}^{k} - ${c} = ${c * d}a`}.`,
      t`Add ${math`${c - 1}`} to both sides: ${math`${c}^{k} - ${1} = ${c * d}a + ${c - 1} = ${d}(${c}a + ${(c - 1) / d})`}.`,
      t`So ${math`${d} \mid ${c}^{k} - ${1}`}, contradicting the choice of ${mk} as a counterexample.`,
    ],
  }),
  solve: ({ c, d }) => {
    // Fit b(a) = (c(da + 1) - 1)/d, linear in a, from a = 0 and a = 1.
    const at = (a: number) => (c * (d * a + 1) - 1) / d;
    return `${at(1) - at(0)}*a + ${at(0)}`;
  },
  misconceptions: ({ c, d }): Misconception[] => [
    { response: `${c}*a`, why: t`Multiplying gives ${math`${c}^{k} - ${c}`}, not ${math`${c}^{k} - ${1}`}: you still need to add ${c - 1}, which is ${math`${d} \times ${(c - 1) / d}`}.` },
    { response: `${c}*a + ${c - 1}`, why: t`The ${c - 1} is outside the factor ${d}: write it as ${math`${d} \times ${(c - 1) / d}`} before taking ${d} out.` },
    { response: `a + ${(c - 1) / d}`, why: t`Multiply the whole equation by ${c}, including ${math`${d}a`}: it becomes ${math`${c * d}a`}.` },
  ],
});

interface PowP { b: number; k: number }
const POWS: readonly [number, number][] = [[2, 2], [2, 3], [2, 4], [3, 3], [3, 4], [2, 5], [3, 5]];
const threshold = (b: number, k: number): number => {
  let last = 0;
  for (let n = 1; n < 200; n++) if (!(b ** n > n ** k)) last = n;
  return last + 1;
};

const powGen = generator<PowP>({
  id: 'from-where',
  skill: 'Find where an inequality such as 2^n > n^2 starts to hold for good, as a smallest-counterexample proof needs.',
  params: (rng) => {
    const [b, k] = pick(rng, POWS);
    return { b, k };
  },
  sane: ({ b, k }) => (b >= 2 && k >= 2 ? null : 'out of range'),
  problem: ({ b, k }) => {
    const n0 = threshold(b, k);
    return {
      prompt: t`What is the smallest natural number ${math`N`} such that ${math`${b}^{n} > n^{${k}}`} for every ${math`n \ge N`}?`,
      answer: { kind: 'exact', expected: String(n0) },
      solution: [
        t`Tabulate both sides: the inequality fails at ${math`n = ${n0 - 1}`}, as ${math`${b}^{${n0 - 1}} = ${b ** (n0 - 1)}`} and ${math`${n0 - 1}^{${k}} = ${(n0 - 1) ** k}`}. It holds at ${math`n = ${n0}`}: ${math`${b ** n0} > ${n0 ** k}`}.`,
        t`From there on it keeps holding: once ${math`${b}^{n} > n^{${k}}`}, the left side multiplies by ${b} at each step while the right side multiplies by ${math`\left(\frac{n + ${1}}{n}\right)^{${k}}`}, which is smaller than ${b} for these ${mn}. So ${math`N = ${n0}`}.`,
      ],
    };
  },
  solve: ({ b, k }) => {
    for (let N = 1; N < 200; N++) {
      let all = true;
      for (let n = N; n < 200 && all; n++) if (BigInt(b) ** BigInt(n) <= BigInt(n) ** BigInt(k)) all = false;
      if (all) return String(N);
    }
    return '0';
  },
  misconceptions: ({ b, k }): Misconception[] => {
    const n0 = threshold(b, k);
    const firstHold = Array.from({ length: n0 }, (_, i) => i + 1).find((n) => b ** n > n ** k) ?? n0;
    const out: Misconception[] = [
      { response: String(n0 - 1), why: t`At ${math`n = ${n0 - 1}`} it fails: ${math`${b ** (n0 - 1)} \le ${(n0 - 1) ** k}`}. ${math`N`} is the first value after the last failure.` },
      { response: String(n0 + 1), why: t`It already holds at ${math`n = ${n0}`}, and from then on.` },
    ];
    if (firstHold !== n0) out.push({ response: String(firstHold), why: t`It holds at ${math`n = ${firstHold}`}, but fails again later, so it does not hold for every ${math`n \ge ${firstHold}`}.` });
    return out;
  },
});

interface KnowP { s: number }
const CLAIMS: readonly Span[] = [
  math`${4} \mid ${5}^{n} - ${1}`, math`${3} \mid ${2}^{${2}n} - ${1}`, math`${6} \mid n^{${3}} - n`, math`${1} + ${2} + \cdots + n = \tfrac{n(n + ${1})}{${2}}`,
  math`${2}^{n} \ge n + ${1}`, math`${24} \mid ${5}^{${2}n} - ${1}`, math`${9} \mid ${4}^{${3}n} + ${8}`, math`${3} \mid n^{${3}} + ${5}n + ${6}`,
];

const knowGen = generator<KnowP>({
  id: 'what-we-know',
  skill: 'Say exactly what the smallest counterexample k gives you: S_(k-1) true and S_k false.',
  quick: true,
  params: (rng) => ({ s: int(rng, 0, CLAIMS.length - 1) }),
  sane: ({ s }) => (s >= 0 && s < CLAIMS.length ? null : 'out of range'),
  problem: ({ s }) => {
    const c = CLAIMS[s] as Span;
    return {
      prompt: t`To prove ${c} for every ${math`n \in \mathbb{N}`} by smallest counterexample, you check ${math`n = ${1}`}, suppose the claim fails somewhere, and let ${math`k > ${1}`} be the smallest ${mn} for which it fails. What do you now know?`,
      answer: {
        kind: 'choice',
        options: [
          { id: 'r', label: t`It holds for ${math`n = k - ${1}`} and fails for ${math`n = k`}.` },
          { id: 'a', label: t`It fails for ${math`n = k`} and for every ${math`n > k`}.` },
          { id: 'b', label: t`It holds for ${math`n = k`} and fails for ${math`n = k + ${1}`}.` },
          { id: 'c', label: t`It fails for ${math`n = k`}, and nothing about ${math`n = k - ${1}`}.` },
        ],
        correct: 'r',
      },
      solution: [
        t`${mk} is a counterexample, so the claim fails at ${math`n = k`}. Since ${math`k > ${1}`}, the number ${math`k - ${1}`} is a natural number smaller than ${mk}, so it is not a counterexample: the claim holds at ${math`n = k - ${1}`}.`,
        t`The proof then uses the true case ${math`k - ${1}`} to show the claim holds at ${mk} after all, a contradiction.`,
      ],
    };
  },
  solve: () => ['r'],
  misconceptions: (): Misconception[] => [
    { response: ['a'], why: t`Nothing is known about larger ${mn}. Minimality tells us about smaller ones.` },
    { response: ['c'], why: t`${mk} is the smallest counterexample, so every smaller natural number, in particular ${math`k - ${1}`}, satisfies the claim. That is the fact the proof uses.` },
    { response: ['b'], why: t`${mk} itself is the counterexample: the claim fails at ${mk}.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const b103 = workedProof({
  title: t`${math`${4} \mid ${5}^{n} - ${1}`}`,
  prompt: t`Book of Proof, Section ${10}.${3}: prove that if ${math`n \in \mathbb{N}`}, then ${math`${4} \mid (${5}^{n} - ${1})`}, by smallest counterexample.`,
  steps: [
    t`(${1}) If ${math`n = ${1}`}, the statement is ${math`${4} \mid ${5} - ${1}`}, that is ${math`${4} \mid ${4}`}: true.`,
    t`(${2}) For the sake of contradiction, suppose it is not true that ${math`${4} \mid ${5}^{n} - ${1}`} for all ${mn}.`,
    t`(${3}) Then the set of counterexamples is a non-empty set of natural numbers, so it has a smallest element ${mk}; and ${math`k > ${1}`} by (${1}). So ${math`${4} \nmid ${5}^{k} - ${1}`}.`,
    t`(${4}) Since ${math`k - ${1}`} is smaller, ${math`${4} \mid ${5}^{k - ${1}} - ${1}`}: ${math`${5}^{k - ${1}} - ${1} = ${4}a`} for some integer ${math`a`}. Multiply by ${5}: ${math`${5}^{k} - ${5} = ${20}a`}, so ${math`${5}^{k} - ${1} = ${20}a + ${4} = ${4}(${5}a + ${1})`}.`,
    t`So ${math`${4} \mid ${5}^{k} - ${1}`}, contradicting (${3}). Hence ${math`${4} \mid ${5}^{n} - ${1}`} for every ${math`n \in \mathbb{N}`}.`,
  ],
  answer: t`Proved: the smallest counterexample would not be a counterexample.`,
  source: cite('bop', 'Section 10.3'),
});

const b94 = auto({
  id: 'b9-4',
  source: cite('bop', 'Chapter 9, exercise 4'),
  title: t`The smallest counterexample to a prime formula`,
  prompt: t`Disprove: for every natural number ${mn}, ${math`n^{${2}} + ${17}n + ${17}`} is prime. Give the smallest counterexample ${mn}.`,
  answer: { kind: 'exact', expected: '1' },
  solution: [
    t`Start at the smallest natural number: ${math`n = ${1}`} gives ${math`${1} + ${17} + ${17} = ${35} = ${5} \times ${7}`}, not prime.`,
    t`So the statement is false, and the smallest counterexample is ${math`n = ${1}`}. Always test the first case first.`,
  ],
  reference: '1',
  verify: () => same('first composite', Array.from({ length: 20 }, (_, i) => i + 1).find((n) => !isPrime(n * n + 17 * n + 17)), 1),
  misconceptions: [
    { response: '35', why: t`${35} is the composite value; the counterexample is the input ${math`n = ${1}`}.` },
    { response: '17', why: t`${math`n = ${17}`} does give a multiple of ${17}, but a smaller ${mn} fails already: ${math`n = ${1}`} gives ${35}.` },
  ],
});

const f17q4 = supervision({
  id: 'a17-q4-iii',
  source: cite('step-f17', 'Assignment 17, Q4(iii)'),
  title: t`A ${1987} STEP divisibility`,
  prompt: t`(${1987} STEP.) Show that ${math`${2}^{${3}n + ${1}} + ${3} \times ${5}^{${2}n + ${1}}`} is divisible by ${17} for every natural number ${mn}. Write the proof by smallest counterexample: check ${math`n = ${1}`}, take the smallest ${math`k > ${1}`} for which it fails, and use the case ${math`k - ${1}`}. (Hint: ${math`${2}^{${3}} = ${8}`} and ${math`${5}^{${2}} = ${25} = ${8} + ${17}`}.)`,
  writeUp: 'proof',
  official: cite('step-f17-hints', 'Assignment 17, Q4(iii)'),
});

const sw412 = supervision({
  id: 'sw-4-1-2',
  source: cite('cst-dm-sw1', 'Exercises 4, 4.1.2'),
  title: t`Tiling with L-shaped pieces`,
  prompt: t`Prove that, for any positive integer ${mn}, a ${math`${2}^{n} \times ${2}^{n}`} square grid with any one square removed can be tiled with L-shaped pieces of ${3} squares. Write it as a proof by smallest counterexample: suppose some ${mn} fails, take the smallest, and split its board into four quarters.`,
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-4', '4.1.2'),
});

const b109 = supervision({
  id: 'b10-9',
  source: cite('bop', 'Chapter 10, exercise 9'),
  title: t`${math`${24} \mid ${5}^{${2}n} - ${1}`}`,
  prompt: t`Prove that ${math`${24} \mid ${5}^{${2}n} - ${1}`} for every integer ${math`n \ge ${0}`}, by smallest counterexample.`,
  writeUp: 'proof',
  official: cite('bop', 'Solutions, Chapter 10, exercise 9'),
});

const b1013 = supervision({
  id: 'b10-13',
  source: cite('bop', 'Chapter 10, exercise 13'),
  title: t`${math`${6} \mid n^{${3}} - n`}`,
  prompt: t`Prove that ${math`${6} \mid n^{${3}} - n`} for every integer ${math`n \ge ${0}`}, by smallest counterexample. (You will need ${math`(k - ${1})^{${3}} - (k - ${1})`} to relate to ${math`k^{${3}} - k`}.)`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

export const smallestCounterexample: TopicContent = {
  topicId: 'proof.smallest-counterexample',
  goal: t`Prove ${math`P(n)`} for all ${mn} by assuming a smallest ${mn} with ${math`P(n)`} false and contradicting its minimality.`,
  objective: t`Prove statements about every natural number by contradicting a smallest counterexample.`,
  why: t`It is induction made into contradiction, and it proves facts like prime factorisation that induction finds awkward.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`The first failure` },
    { kind: 'hook', text: t`Suppose a statement about natural numbers were false somewhere. Then it would fail at ${1}, or at ${2}, or at ${3}, and so on, and among all those failures there would be a first. What if the first failure can be shown not to fail?` },
    { kind: 'narrative', text: t`That "first failure" is the whole idea. Line up the counterexamples. If there are any at all, one of them comes first. It is a counterexample, yet everything before it is fine. Usually those two facts cannot both hold, and the contradiction shows there were no counterexamples to begin with.` },
    { kind: 'theorem', name: t`Well-ordering principle`, statement: t`Every non-empty subset of ${math`\mathbb{N} = \{${1}, ${2}, ${3}, \ldots\}`} has a smallest element.` },
    { kind: 'p', text: t`This is a basic property of the natural numbers, taken as given (Book of Proof, Section ${1}.${9}): start at ${1} and step up until you meet the set. It fails for other sets of numbers. The positive rationals have no smallest element, because ${math`\frac{${1}}{n + ${1}} < \frac{${1}}{n}`}, and neither do the integers.` },
    {
      kind: 'definition',
      name: t`Proof by smallest counterexample`,
      formal: t`To prove statements ${math`S_{${1}}, S_{${2}}, S_{${3}}, \ldots`}: (${1}) check ${math`S_{${1}}`}; (${2}) suppose, for contradiction, that not every ${math`S_{n}`} is true; (${3}) by the [[well-ordering-principle|well-ordering principle]], let ${math`k`} be the smallest ${mn} with ${math`S_{n}`} false, so ${math`k > ${1}`}; (${4}) then ${math`S_{k - ${1}}`} is true and ${math`S_{k}`} is false; derive a contradiction. This is [[smallest-counterexample|proof by smallest counterexample]].`,
      plain: t`Name the first place the statement goes wrong. It sits right after a place where the statement is right. Show that being right at ${math`k - ${1}`} forces it to be right at ${mk}, and the "first failure" was never a failure.`,
    },
    { kind: 'section', title: t`A first example` },
    { kind: 'theorem', statement: t`For every ${math`n \in \mathbb{N}`}, ${math`${4} \mid ${5}^{n} - ${1}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Check the first case`, text: t`For ${math`n = ${1}`}: ${math`${5}^{${1}} - ${1} = ${4}`}, and ${math`${4} \mid ${4}`}.` },
        { label: t`Suppose it fails somewhere`, text: t`Suppose not every ${math`n \in \mathbb{N}`} has ${math`${4} \mid ${5}^{n} - ${1}`}. The set of ${mn} where it fails is then non-empty.` },
        { label: t`Take the smallest failure`, text: t`Let ${mk} be its smallest element. By the first step ${math`k \ne ${1}`}, so ${math`k > ${1}`}, and ${math`${4} \nmid ${5}^{k} - ${1}`}.`, why: { q: t`Why do we need ${math`k > ${1}`}?`, a: t`So that ${math`k - ${1}`} is a natural number and the statement about it makes sense. Checking ${math`n = ${1}`} is exactly what guarantees this.` } },
        { label: t`Use the case before`, text: t`${math`k - ${1} < k`}, so ${math`k - ${1}`} is not a counterexample: ${math`${5}^{k - ${1}} - ${1} = ${4}a`} for some integer ${math`a`}.`, plain: t`If ${mk} were ${3}, then ${math`${5}^{${2}} - ${1} = ${24} = ${4} \times ${6}`}, and ${math`a`} would be ${6}.` },
        { label: t`Push it up one`, text: t`Multiply by ${5} and add ${4}:`, eq: [dmath`${5}^{k} - ${5} = ${20}a \quad\Longrightarrow\quad ${5}^{k} - ${1} = ${20}a + ${4} = ${4}(${5}a + ${1}).`] },
        { label: t`Contradiction`, text: t`So ${math`${4} \mid ${5}^{k} - ${1}`}, contradicting the choice of ${mk}. Hence there is no counterexample.` },
      ],
    },
    checkFrom(stepGen, { c: 7, d: 3 }, t`From ${math`${7}^{k - ${1}} - ${1} = ${3}a`}: multiply by ${7} to get ${math`${7}^{k} - ${7} = ${21}a`}, then add ${6}: ${math`${7}^{k} - ${1} = ${3}(${7}a + ${2})`}.`),
    { kind: 'section', title: t`Why it works, and when to use it` },
    { kind: 'narrative', text: t`Compare with induction: there you prove "${math`S_{k - ${1}}`} true implies ${math`S_{k}`} true" for every ${mk}; here you assume ${math`S_{k - ${1}}`} true and ${math`S_{k}`} false for one special ${mk} and break it. The algebra is the same. The gain comes when the contradiction is easier to reach than the implication, and when you need not just ${math`S_{k - ${1}}`} but every smaller case: the smallest counterexample has all of them true. That is how the uniqueness of prime factorisation is proved: a smallest number with two different factorisations would give a smaller one.` },
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`Step (${1}) can be skipped: the contradiction in step (${4}) is the real proof.`, counterexample: t`Try the false claim "${math`n^{${2}} + n + ${1}`} is even". If ${mk} were the smallest failure, the claim would hold at ${math`k - ${1}`}, and ${math`k^{${2}} + k + ${1} = \left((k - ${1})^{${2}} + (k - ${1}) + ${1}\right) + ${2}k`} would be even: step (${4}) goes through. Yet ${math`n^{${2}} + n = n(n + ${1})`} is even, so the claim fails for every ${mn}. Step (${1}) catches it: the claim already fails at ${math`n = ${1}`}, so there is no ${math`k - ${1}`} to lean on.` },
    { kind: 'pitfall', claim: t`Any set of numbers with a counterexample has a smallest counterexample.`, counterexample: t`Among the positive rationals, the claim "${math`x \ge ${1}`}" fails at ${math`\frac{${1}}{${2}}, \frac{${1}}{${3}}, \frac{${1}}{${4}}, \ldots`}, with no smallest failure. The method needs the natural numbers, or any set where every non-empty subset has a least element.` },
    { kind: 'pitfall', claim: t`The smallest counterexample to "${math`n^{${2}} + ${17}n + ${17}`} is prime" is ${math`n = ${17}`}, where ${17} visibly divides it.`, counterexample: t`Test from the start: ${math`n = ${1}`} gives ${math`${35} = ${5} \times ${7}`}. "Smallest" means checking in order.` },
    { kind: 'takeaway', text: t`If something failed, it would fail first at some ${math`k > ${1}`} with ${math`k - ${1}`} fine; show that is impossible.` },
  ],
  examples: [
    b103,
    worked(failGen, { i: 0 }, t`Euler's prime polynomial`),
    worked(stepGen, { c: 9, d: 8 }, t`The key step for ${math`${8} \mid ${9}^{n} - ${1}`}`),
  ],
  generators: [failGen, stepGen, powGen, knowGen],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['well-ordering-principle', 'smallest-counterexample'],
  cambridge: withUses([f17q4, sw412, b94, b109, b1013], {
    'a17-q4-iii': { sections: ['A first example', 'Why it works, and when to use it'], note: t`A divisibility proof by the smallest counterexample` },
    'sw-4-1-2': { sections: ['Why it works, and when to use it'], note: t`Tiling by taking the smallest board that fails` },
  }),
  gate: ['a17-q4-iii', 'sw-4-1-2'],
  recall: [
    { front: t`State the well-ordering principle.`, back: t`Every non-empty subset of ${math`\mathbb{N}`} has a smallest element.` },
    { front: t`Give the outline of proof by smallest counterexample.`, back: t`Check ${math`S_{${1}}`}; suppose some ${math`S_{n}`} fails; let ${mk} be the smallest, so ${math`k > ${1}`}; then ${math`S_{k - ${1}}`} is true and ${math`S_{k}`} false; contradict.` },
  ],
  proofOrder: [
    {
      title: t`${math`${4} \mid ${5}^{n} - ${1}`} by smallest counterexample`,
      steps: [
        t`For ${math`n = ${1}`}, ${math`${5} - ${1} = ${4}`}, so the claim holds.`,
        t`Suppose it fails somewhere; let ${mk} be the smallest failure, so ${math`k > ${1}`}.`,
        t`Then ${math`${5}^{k - ${1}} - ${1} = ${4}a`} for some integer ${math`a`}.`,
        t`So ${math`${5}^{k} - ${1} = ${4}(${5}a + ${1})`}, and ${4} divides it after all.`,
        t`That contradicts the choice of ${mk}, so there is no counterexample.`,
      ],
    },
  ],
};

