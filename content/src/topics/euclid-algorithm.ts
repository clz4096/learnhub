/**
 * num.euclid-algorithm: gcd(m, n) = n if n | m, else gcd(n, rem(m, n)). The lesson follows
 * the CST notes (printed pages 214 to 228: Lemma 74, Euclid's Algorithm in ML, Example 75
 * gcd(13, 34) = 1, Theorem 79 with its termination argument and the bound of about
 * 1 + 2 log min(m, n) steps). The problems are supervision exercises 3.1.2, 3.3.3, and
 * 4.2.3(d) with their 2023-24 official solutions; the official solution to 4.2.3(d)
 * fixes the step count used here: gcd(2, 1) takes one step.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { int, pick } from '../math';
import { gcd } from '../numbers';
import { generator, type Misconception } from '../problem';
import { computedTex, math, t, type Span } from '../rich';
import { worked, workedCambridge, type TopicContent } from '../topic';

const [mm, mn] = [math`m`, math`n`];
const fib = (n: number): number => { let [a, b] = [0, 1]; for (let i = 0; i < n; i++) [a, b] = [b, a + b]; return a; };

/** The calls of the notes' gcd: each pair (m, n) until n | m; the last pair's n is the answer. */
function calls(m: number, n: number): [number, number][] {
  const out: [number, number][] = [];
  let [a, b] = [m, n];
  for (;;) {
    out.push([a, b]);
    const r = a % b;
    if (r === 0) return out;
    [a, b] = [b, r];
  }
}
const chainTex = (m: number, n: number): Span => computedTex(calls(m, n).map(([a, b]) => `\\gcd(${a}, ${b})`).join(' = ') + ` = ${calls(m, n).at(-1)?.[1]}`);

/** The subtractive algorithm gcd0 of exercise 3.3.3: the pairs it is called on. */
function calls0(m: number, n: number): [number, number][] {
  const out: [number, number][] = [];
  let [a, b] = [m, n];
  for (;;) {
    out.push([a, b]);
    if (a === b) return out;
    [a, b] = [Math.min(a, b), Math.max(a, b) - Math.min(a, b)];
  }
}

// ---------------------------------------------------------------- run the algorithm

interface RunP { m: number; n: number }
const runMis = (m: number, n: number): string[] => {
  const c = calls(m, n);
  const last = c[c.length - 1] as [number, number];
  return [String(last[0]), String(Math.floor(last[0] / last[1])), '1'];
};

const runEuclid = generator<RunP>({
  id: 'run-euclid',
  skill: 'Run Euclid\'s algorithm: replace (m, n) by (n, rem(m, n)) until n divides m; the last n is the gcd.',
  params: (rng) => {
    for (;;) {
      const g = pick(rng, [1, 2, 3, 4, 6, 7, 9, 12, 14, 18, 21, 24]);
      const [x, y] = [int(rng, 20, 160), int(rng, 5, 120)];
      if (x <= y || gcd(x, y) !== 1) continue;
      const [m, n] = [g * x, g * y];
      if (calls(m, n).length >= 3 && new Set(runMis(m, n).filter((v) => v !== String(g))).size >= 2) return { m, n };
    }
  },
  sane: ({ m, n }) => (m > n && calls(m, n).length >= 3 ? null : 'out of range'),
  problem: ({ m, n }) => {
    const c = calls(m, n);
    return {
      prompt: t`Use Euclid's algorithm to find ${math`\gcd(${m}, ${n})`}.`,
      answer: { kind: 'exact', expected: String(gcd(m, n)) },
      solution: [
        t`Each step replaces ${math`(m, n)`} by ${math`(n, \mathrm{rem}(m, n))`}, which has the same common divisors (Lemma ${74}): ${math`${chainTex(m, n)}`}.`,
        t`It stops at ${math`\gcd(${(c.at(-1) as [number, number])[0]}, ${(c.at(-1) as [number, number])[1]})`} because ${(c.at(-1) as [number, number])[1]} divides ${(c.at(-1) as [number, number])[0]}. So the gcd is ${gcd(m, n)}.`,
      ],
    };
  },
  solve: ({ m, n }) => {
    // The largest number that divides both, by trial.
    for (let d = n; d >= 1; d--) if (m % d === 0 && n % d === 0) return String(d);
    return '1';
  },
  misconceptions: ({ m, n }): Misconception[] => {
    const last = calls(m, n).at(-1) as [number, number];
    return [
      { response: String(last[0]), why: t`At the last step ${last[1]} divides ${last[0]}, so the answer is ${last[1]}, the divisor, not ${last[0]}.` },
      { response: String(Math.floor(last[0] / last[1])), why: t`That is the last quotient. The gcd is the last divisor, the one that leaves remainder ${0}.` },
      { response: '1', why: t`The algorithm only gives ${1} when the last nonzero remainder is ${1}. Here it stops earlier.` },
    ];
  },
});

// ---------------------------------------------------------------- count the steps

const countSteps = generator<RunP>({
  id: 'count-steps',
  skill: 'Count the steps of Euclid\'s algorithm, one per call of gcd, as the official solution to exercise 4.2.3(d) counts them.',
  params: (rng) => {
    for (;;) {
      const [m, n] = [int(rng, 30, 999), int(rng, 5, 400)];
      if (m > n && calls(m, n).length >= 3) return { m, n };
    }
  },
  sane: ({ m, n }) => (m > n && calls(m, n).length >= 3 ? null : 'out of range'),
  problem: ({ m, n }) => {
    const c = calls(m, n);
    return {
      prompt: t`Euclid's algorithm in the CST notes: ${math`\gcd(m, n) = n`} if ${math`n \mid m`}, and otherwise ${math`\gcd(m, n) = \gcd(n, \mathrm{rem}(m, n))`}. Counting each call as one step, how many steps does ${math`\gcd(${m}, ${n})`} take?`,
      answer: { kind: 'exact', expected: String(c.length) },
      solution: [
        t`The calls are ${math`${computedTex(c.map(([a, b]) => `\\gcd(${a}, ${b})`).join(',\\ '))}`}; the last stops because ${(c.at(-1) as [number, number])[1]} divides ${(c.at(-1) as [number, number])[0]}.`,
        t`That is ${c.length} steps. The notes bound the number by about ${math`${1} + ${2}\log_{${2}} \min(m, n)`}: the second number at least halves every two steps.`,
      ],
    };
  },
  solve: ({ m, n }) => {
    let [a, b, k] = [m, n, 1];
    while (a % b !== 0) { [a, b] = [b, a % b]; k++; }
    return String(k);
  },
  misconceptions: ({ m, n }): Misconception[] => {
    const k = calls(m, n).length;
    return [
      { response: String(k - 1), why: t`Count the last call too: ${math`\gcd`} is called on the final pair, and that call returns the answer.` },
      { response: String(k + 1), why: t`The algorithm never divides by ${0}: it stops at the call where the remainder would be ${0}.` },
    ];
  },
});

// ---------------------------------------------------------------- the subtractive algorithm

const subtractive = generator<RunP>({
  id: 'subtractive',
  skill: 'Trace the subtractive algorithm gcd0 of exercise 3.3.3, which replaces the larger number by the difference, and compare its length with Euclid\'s.',
  params: (rng) => {
    for (;;) {
      const g = int(rng, 1, 9);
      const [x, y] = [int(rng, 2, 14), int(rng, 1, 13)];
      if (x > y && gcd(x, y) === 1) return { m: g * x, n: g * y };
    }
  },
  sane: ({ m, n }) => (m > n && n >= 1 ? null : 'out of range'),
  problem: ({ m, n }) => {
    const c = calls0(m, n);
    return {
      prompt: t`The subtractive algorithm ${math`\mathrm{gcd}_{${0}}`} of exercise ${3}.${3}.${3}: if ${math`m = n`} return ${mm}, else call itself on ${math`(\min(m, n), \max(m, n) - \min(m, n))`}. How many calls does ${math`\mathrm{gcd}_{${0}}(${m}, ${n})`} make, counting the first?`,
      answer: { kind: 'exact', expected: String(c.length) },
      solution: [
        t`The calls are ${math`${computedTex(c.map(([a, b]) => `(${a}, ${b})`).join(',\\ '))}`}, ending at a pair of equal numbers, ${c.at(-1)?.[0] as number}, the gcd.`,
        t`That is ${c.length} calls. Every step keeps the common divisors (subtracting the smaller number does not change them), and the sum of the pair falls, so it stops.`,
      ],
    };
  },
  solve: ({ m, n }) => {
    let [a, b, k] = [m, n, 1];
    while (a !== b) { if (a > b) a -= b; else b -= a; k++; }
    return String(k);
  },
  misconceptions: ({ m, n }): Misconception[] => {
    const k = calls0(m, n).length;
    const e = calls(m, n).length;
    const out: Misconception[] = [
      { response: String(k - 1), why: t`Count the first call, ${math`\mathrm{gcd}_{${0}}(${m}, ${n})`}, too.` },
      { response: String(k + 1), why: t`It stops at the first pair of equal numbers, without another call.` },
    ];
    if (e !== k) out.push({ response: String(e), why: t`That is the number of steps of Euclid's algorithm, which divides. ${math`\mathrm{gcd}_{${0}}`} subtracts one copy at a time, so it can take more steps.` });
    return out;
  },
});

// ---------------------------------------------------------------- Cambridge problems

const [M2, N2] = [21212121, 12121212];
const sheet312 = auto({
  id: 'sheet-3-1-2',
  source: cite('cst-dm-sw1', 'Exercises 3, 3.1.2'),
  title: t`A large gcd`,
  prompt: t`Find the gcd of ${M2} and ${N2}.`,
  answer: { kind: 'exact', expected: String(gcd(M2, N2)) },
  solution: [
    t`Euclid's algorithm: ${math`${chainTex(M2, N2)}`}.`,
    t`The remainders are ${math`${M2} - ${N2} = ${M2 - N2}`} and ${math`${N2} - ${Math.floor(N2 / (M2 - N2))} \times ${M2 - N2} = ${N2 % (M2 - N2)}`}, which divides ${M2 - N2} exactly. So the gcd is ${gcd(M2, N2)}.`,
  ],
  reference: String(gcd(M2, N2)),
  verify: () => {
    // A second method: both numbers are multiples of 3030303 by digit patterns, and the cofactors 7 and 4 are coprime.
    const g = 3030303;
    return same('the cofactors', [M2 / g, N2 / g, gcd(M2 / g, N2 / g)].join(), '7,4,1');
  },
  misconceptions: [{ response: String(M2 - N2), why: t`${M2 - N2} is the first remainder. Keep going until a remainder divides the one before it.` }],
  official: { source: cite('cst-dm-sols-2324-3', '3.1.2'), answer: '3030303', agrees: true },
});

const notes75 = auto({
  id: 'notes-218-example-75',
  source: cite('cst-dm-notes', 'printed page 218, Example 75', true),
  title: t`The steps of ${math`\gcd(${13}, ${34})`}`,
  prompt: t`Example ${75} of the notes computes ${math`\gcd(${13}, ${34})`}. With the notes' definition, how many calls of ${math`\gcd`} are made, counting the first?`,
  answer: { kind: 'exact', expected: String(calls(13, 34).length) },
  solution: [
    t`The first argument is smaller, so the first call just swaps them: ${math`\mathrm{rem}(${13}, ${34}) = ${13}`}, and ${math`\gcd(${13}, ${34}) = \gcd(${34}, ${13})`}.`,
    t`Then ${math`${chainTex(34, 13)}`}. In all ${calls(13, 34).length} calls, as the example shows: the inputs are consecutive Fibonacci numbers, the slowest case.`,
  ],
  reference: String(calls(13, 34).length),
  verify: () => same('the calls listed', calls(13, 34).map(([a, b]) => `${a}:${b}`).join(' '), '13:34 34:13 13:8 8:5 5:3 3:2 2:1'),
  misconceptions: [{ response: String(calls(34, 13).length), why: t`The first call, ${math`\gcd(${13}, ${34})`}, counts too: it swaps the arguments.` }],
  official: { source: cite('cst-dm-notes', 'printed page 218, Example 75'), answer: '7', agrees: true },
});

const FN = 10;
const sheet423d = auto({
  id: 'sheet-4-2-3-d',
  source: cite('cst-dm-sw1', 'Exercises 4, 4.2.3(d)', true),
  title: t`Fibonacci numbers are the slowest inputs`,
  prompt: t`With ${math`F_{${0}} = ${0}`}, ${math`F_{${1}} = ${1}`}, and ${math`F_{n + ${2}} = F_{n} + F_{n + ${1}}`}: how many steps does Euclid's algorithm take on ${math`\gcd(F_{${FN + 2}}, F_{${FN + 1}}) = \gcd(${fib(FN + 2)}, ${fib(FN + 1)})`}, counting each call as one step?`,
  answer: { kind: 'exact', expected: String(calls(fib(FN + 2), fib(FN + 1)).length) },
  solution: [
    t`Every quotient is ${1}: ${math`F_{k + ${3}} = ${1} \times F_{k + ${2}} + F_{k + ${1}}`}, so each step moves down one Fibonacci number: ${math`\gcd(F_{k + ${3}}, F_{k + ${2}}) = \gcd(F_{k + ${2}}, F_{k + ${1}})`}.`,
    t`It ends at ${math`\gcd(F_{${3}}, F_{${2}}) = \gcd(${2}, ${1})`}, one step. By induction, ${math`\gcd(F_{n + ${2}}, F_{n + ${1}})`} takes ${mn} steps; here ${FN}.`,
  ],
  reference: String(FN),
  verify: () => same('the calls counted', calls(fib(FN + 2), fib(FN + 1)).length, FN),
  misconceptions: [{ response: String(FN + 2), why: t`Start counting at ${math`\gcd(F_{${FN + 2}}, F_{${FN + 1}})`} and stop at ${math`\gcd(${2}, ${1})`}: that is ${FN} calls, not the index ${FN + 2}.` }],
  official: { source: cite('cst-dm-sols-2324-4', '4.2.3(d)'), answer: String(FN), agrees: true },
});

const sheet333 = supervision({
  id: 'sheet-3-3-3',
  source: cite('cst-dm-sw1', 'Exercises 3, 3.3.3'),
  title: t`Why the subtractive algorithm is right`,
  prompt: t`Informally justify the correctness of ${math`\mathrm{gcd}_{${0}}`}: if ${math`m = n`} return ${mm}, else recurse on ${math`(\min(m, n), \max(m, n) - \min(m, n))`}. Explain why every call has the same common divisors as the first (which corollary of the notes gives it), and why the recursion stops for positive integers.`,
  writeUp: 'explanation',
  official: cite('cst-dm-sols-2324-3', '3.3.3'),
});
const theorem79 = supervision({
  id: 'notes-224-theorem-79-bound',
  source: cite('cst-dm-notes', 'printed pages 224 to 226, Theorem 79 and the step bound'),
  title: t`The second number halves every two steps`,
  prompt: t`For ${math`m \ge n`}, two steps of Euclid's algorithm take ${math`(m, n)`} to ${math`(r, r')`} with ${math`m = qn + r`} and ${math`n = q'r + r'`}. Prove the notes' claim ${math`r' < n / ${2}`}, from ${math`${2}r' < r + r' \le q'r + r' = n`}, and deduce that the number of steps is at most about ${math`${1} + ${2}\log_{${2}} n`}.`,
  writeUp: 'proof',
});
const sheet423dproof = supervision({
  id: 'sheet-4-2-3-d-proof',
  source: cite('cst-dm-sw1', 'Exercises 4, 4.2.3(d)'),
  title: t`Fibonacci steps, by induction`,
  prompt: t`Prove that ${math`\gcd(F_{n + ${2}}, F_{n + ${1}})`} terminates with output ${1} in ${mn} steps for all positive integers ${mn}. State your base case and say where the Division Theorem's uniqueness is used.`,
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-4', '4.2.3(d)'),
});

// ---------------------------------------------------------------- lesson

export const euclidAlgorithm: TopicContent = {
  topicId: 'num.euclid-algorithm',
  goal: t`Compute ${math`\gcd(m, n)`} by Euclid's algorithm, explain why each step keeps the answer and why it stops, and count its steps.`,
  lesson: [
    { kind: 'p', text: t`The common divisors of ${mm} and ${mn} are those of ${mn} and ${math`\mathrm{rem}(m, n)`} (Key Lemma ${72}), and if ${math`n \mid m`} they are the divisors of ${mn}. So the greatest of them can be found by repeating one step.` },
    { kind: 'rule', text: t`[[euclids-algorithm|Euclid's algorithm]]: for positive integers, ${math`\gcd(m, n) = n`} if ${math`n \mid m`}, and otherwise ${math`\gcd(m, n) = \gcd(n, \mathrm{rem}(m, n))`}.` },
    { kind: 'p', text: t`The notes' Example ${75}: ${math`\gcd(${13}, ${34}) = ${chainTex(34, 13)}`}, after a first step that swaps the arguments. Each line is one call; the answer is the last divisor, the one that leaves no remainder.` },
    { kind: 'p', text: t`It stops (Theorem ${79}): after the first step the second argument is a remainder, smaller than before, and a decreasing sequence of positive integers cannot go on for ever. In fact it at least halves every two steps, so the number of steps is at most about ${math`${1} + ${2}\log_{${2}} \min(m, n)`}: logarithmic, not linear.` },
    { kind: 'p', text: t`The slowest inputs are consecutive Fibonacci numbers, where every quotient is ${1}: ${math`\gcd(F_{n + ${2}}, F_{n + ${1}})`} takes exactly ${mn} steps (exercise ${4}.${2}.${3}(d)). The subtractive version, which replaces the larger number by the difference, is also correct but can be far slower: ${math`\gcd_{${0}}(${100}, ${1})`} takes ${calls0(100, 1).length} calls.` },
  ],
  examples: [
    workedCambridge(sheet312),
    worked(runEuclid, { m: 1071, n: 462 }, t`${math`\gcd(${1071}, ${462})`}`),
    worked(countSteps, { m: 89, n: 55 }, t`Counting the steps for ${math`(${89}, ${55})`}`),
  ],
  generators: [runEuclid, countSteps, subtractive],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['euclids-algorithm'],
  cambridge: [notes75, sheet423d, sheet333, theorem79, sheet423dproof],
};
