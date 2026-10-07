/**
 * pre.remainders (a bridge): divide one integer by another to get a quotient and a
 * remainder smaller than the divisor, including negative numbers, and work with the
 * remainder of a combination. Sources: the GCSE subject content (DfE 2013), and STEP
 * Support Foundation Assignment 3 Q4 (the shipwrecked bananas). Every quotient and
 * remainder is found by brute force: counting how many times the divisor fits. Batch 7 adds IA
 * Numbers and Sets Example Sheet 2, Q12 (first part) and Q13: remainders of powers and digit sums.
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { int, pick, q } from '../math';
import { generator, type Misconception } from '../problem';
import { math, t } from '../rich';
import { checkFrom, workedCambridge, worked, type TopicContent } from '../topic';
import { named, namedAnswer, withExaminer } from '../prep-a';

const F03 = 'step-f03' as const;
const F03H = 'step-f03-hints' as const;
const QR = ['q', 'r'] as const;

/** Quotient and remainder by stepping: the largest multiple of d not above n. */
function divmod(n: number, d: number): [number, number] {
  let k = 0;
  if (n >= 0) while ((k + 1) * d <= n) k++;
  else while (k * d > n) k--;
  return [k, n - k * d];
}
const mod = (n: number, d: number): number => ((n % d) + d) % d;

// ---------------------------------------------------------------- positive division

interface DivP { n: number; d: number }
const divide = generator<DivP>({
  id: 'divide',
  skill: 'Divide a whole number by another, giving the quotient and a remainder smaller than the divisor.',
  quick: true,
  params: (rng) => {
    for (;;) {
      const p: DivP = { n: int(rng, 40, 400), d: int(rng, 3, 15) };
      if (p.n % p.d !== 0 && p.n % p.d !== p.d - 1 && Math.floor(p.n / p.d) >= 2) return p;
    }
  },
  sane: ({ n, d }) => (d >= 2 && n >= 0 ? null : 'out of range'),
  problem: ({ n, d }) => {
    const [k, r] = divmod(n, d);
    return {
      prompt: t`Divide ${n} by ${d}: find the quotient ${math`q`} and the remainder ${math`r`}, with ${math`${n} = ${d}q + r`} and ${math`${0} \le r < ${d}`}.`,
      answer: namedAnswer(QR, [q(k), q(r)], `Find the largest multiple of ${d} that is at most ${n}.`),
      solution: [
        t`The largest multiple of ${d} that is at most ${n} is ${math`${d} \times ${k} = ${d * k}`}; the next, ${math`${d} \times ${k + 1} = ${d * (k + 1)}`}, is too big.`,
        t`So ${math`q = ${k}`} and ${math`r = ${n} - ${d * k} = ${r}`}, which is between ${0} and ${d - 1}: ${math`${n} = ${d} \times ${k} + ${r}`}.`,
      ],
    };
  },
  solve: ({ n, d }) => named(QR, [q(Math.floor(n / d)), q(n % d)]),
  misconceptions: ({ n, d }): Misconception[] => {
    const [k, r] = divmod(n, d);
    return [
      { response: named(QR, [q(k + 1), q(r - d)]), why: t`A remainder is never negative: ${math`${d} \times ${k + 1} = ${d * (k + 1)}`} overshoots ${n}. Use ${math`q = ${k}`}.` },
      { response: named(QR, [q(k - 1), q(r + d)]), why: t`The remainder must be less than ${d}: ${r + d} still contains another ${d}.` },
    ];
  },
});

// ---------------------------------------------------------------- negative numbers

const negative = generator<DivP>({
  id: 'negative',
  skill: 'Divide a negative integer, keeping the remainder between 0 and the divisor minus 1.',
  params: (rng) => {
    for (;;) {
      const p: DivP = { n: -int(rng, 7, 120), d: int(rng, 3, 12) };
      if (p.n % p.d !== 0) return p;
    }
  },
  sane: ({ n, d }) => (d >= 2 && n < 0 ? null : 'out of range'),
  problem: ({ n, d }) => {
    const [k, r] = divmod(n, d);
    return {
      prompt: t`Find the quotient ${math`q`} and remainder ${math`r`} when ${math`${n}`} is divided by ${d}: integers with ${math`${n} = ${d}q + r`} and ${math`${0} \le r < ${d}`}.`,
      answer: namedAnswer(QR, [q(k), q(r)], `Go down to the multiple of ${d} at or below ${n}, so the remainder is not negative.`),
      solution: [
        t`The multiple of ${d} must be at most ${math`${n}`}, so go down past it: ${math`${d} \times (${k}) = ${d * k}`}, and ${math`${d * k} \le ${n} < ${d * k + d}`}.`,
        t`So ${math`q = ${k}`} and ${math`r = ${n} - (${d * k}) = ${r}`}: ${math`${n} = ${d} \times (${k}) + ${r}`}.`,
      ],
    };
  },
  solve: ({ n, d }) => named(QR, [q(Math.floor(n / d)), q(mod(n, d))]),
  misconceptions: ({ n, d }): Misconception[] => {
    const tq = Math.trunc(n / d);
    const tr = n - tq * d;
    return [
      { response: named(QR, [q(tq), q(tr)]), why: t`A calculator's integer division rounds towards ${0}, leaving ${math`r = ${tr}`}, which is negative. The remainder must satisfy ${math`${0} \le r < ${d}`}: go one more multiple down.` },
      { response: named(QR, [q(tq), q(-tr)]), why: t`Check it: ${math`${d} \times (${tq}) + ${-tr} = ${d * tq - tr}`}, not ${math`${n}`}. Go down to the multiple of ${d} at or below ${math`${n}`}.` },
    ];
  },
});

// ---------------------------------------------------------------- remainder of a combination

interface CombP { d: number; r: number; k: number; c: number }
const combination = generator<CombP>({
  id: 'combination',
  skill: 'Find the remainder of kN + c from the remainder of N, by writing N = dm + r.',
  params: (rng) => {
    for (;;) {
      const p: CombP = { d: pick(rng, [3, 4, 5, 6, 7, 8, 9, 11]), r: 0, k: int(rng, 2, 9), c: int(rng, 1, 12) };
      p.r = int(rng, 1, p.d - 1);
      const raw = p.k * p.r + p.c;
      if (raw >= p.d && mod(raw, p.d) !== mod(p.r + p.c, p.d)) return p;
    }
  },
  sane: (p) => (p.r >= 0 && p.r < p.d ? null : 'remainder out of range'),
  problem: ({ d, r, k, c }) => {
    const raw = k * r + c;
    return {
      prompt: t`A whole number ${math`N`} leaves remainder ${r} when divided by ${d}. What is the remainder when ${math`${k}N + ${c}`} is divided by ${d}?`,
      answer: { kind: 'exact', expected: String(mod(raw, d)) },
      solution: [
        t`Write ${math`N = ${d}m + ${r}`} for some integer ${math`m`}. Then ${math`${k}N + ${c} = ${d * k}m + ${raw} = ${d}(${k}m) + ${raw}`}.`,
        t`${math`${raw} = ${d} \times ${Math.floor(raw / d)} + ${mod(raw, d)}`}, so ${math`${k}N + ${c} = ${d}(${k}m + ${Math.floor(raw / d)}) + ${mod(raw, d)}`}, with ${math`${0} \le ${mod(raw, d)} < ${d}`}. The remainder is ${mod(raw, d)}.`,
      ],
    };
  },
  solve: ({ d, r, k, c }) => {
    // Try a few actual numbers N with that remainder; they must all agree.
    const rs = [r, r + d, r + 5 * d].map((N) => mod(k * N + c, d));
    return String(rs[0]);
  },
  misconceptions: ({ d, r, k, c }): Misconception[] => [
    { response: String(k * r + c), why: t`${k * r + c} is at least ${d}, so it is not a remainder yet: take out the multiples of ${d}.` },
    { response: String(mod(r + c, d)), why: t`Multiplying ${math`N`} by ${k} multiplies its remainder by ${k} as well: ${math`${k}N = ${d}(${k}m) + ${k * r}`}.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

/** One night of the bananas: give one to the orangutan, hide a third, return the rest. */
function night(n: number): [number, number] | null {
  if (mod(n, 3) !== 1) return null;
  const share = (n - 1) / 3;
  return [share, 2 * share];
}

const bananas79 = auto({
  id: 'a3-q4-shares',
  source: cite(F03, 'Q4', true),
  title: t`The bananas, night by night`,
  prompt: t`Three castaways gather ${math`N = ${79}`} bananas. In the night each in turn wakes, divides the pile into three equal piles with one banana left over, gives that one to the orangutan, hides one pile, and heaps the other two together. In the morning the pile again divides into three equal shares of ${math`m`} with one left over. Find the numbers ${math`a`}, ${math`b`}, ${math`c`} hidden by the first, second, and third castaway, and ${math`m`}.`,
  answer: namedAnswer(['a', 'b', 'c', 'm'], [q(26), q(17), q(11), q(7)], 'Each time, divide by 3 with remainder 1: the share is the quotient, and two shares are left.'),
  solution: [
    t`${math`${79} = ${3} \times ${26} + ${1}`}: the first hides ${26} and leaves ${math`${2} \times ${26} = ${52}`}.`,
    t`${math`${52} = ${3} \times ${17} + ${1}`}: the second hides ${17} and leaves ${34}. ${math`${34} = ${3} \times ${11} + ${1}`}: the third hides ${11} and leaves ${22}.`,
    t`${math`${22} = ${3} \times ${7} + ${1}`}, so ${math`m = ${7}`}. Every division left remainder ${1}, as the story needs.`,
  ],
  reference: 'a = 26, b = 17, c = 11, m = 7',
  verify: () => {
    let n = 79;
    const hid: number[] = [];
    for (let i = 0; i < 3; i++) { const r = night(n); if (r === null) return `night ${i + 1} fails`; hid.push(r[0]); n = r[1]; }
    if (mod(n, 3) !== 1) return 'the morning split fails';
    return same('shares and m', [...hid, (n - 1) / 3].join(','), '26,17,11,7');
  },
  misconceptions: [{ response: 'a = 26, b = 26, c = 26, m = 7', why: t`Each castaway divides the pile he finds, which has shrunk: the second finds ${52}, not ${79}.` }],
});

const bananasShow = supervision({
  id: 'a3-q4-i',
  source: cite(F03, 'Q4(i)'),
  title: t`The bananas: the equation`,
  prompt: t`Arthur, Brenda, and Chandrima gather ${math`N`} bananas. In the night each in turn divides the pile into three equal piles with one left over, gives that one to the orangutan, hides one pile, and heaps the rest together. In the morning the remaining bananas divide into three equal shares of ${math`m`}, with one left over. Show that ${math`${8}N = ${81}m + ${65}`}. (It helps to note that the number left after Chandrima has taken her share is ${math`${3}m + ${1}`}.)`,
  writeUp: 'proof',
  official: cite(F03H, 'Q4'),
});

// ---------------------------------------------------------------- Cambridge problems: gates (batch 7)

/*
 * Outline for marking ns2-q13 (20 marks):
 * 1. Writes n with digits d_k ... d_1 d_0: n = d_0 + 10 d_1 + 100 d_2 + ... + 10^k d_k, and s for the
 *    digit sum (3).
 * 2. n - s = 9 d_1 + 99 d_2 + ... + (10^k - 1) d_k, and each 10^i - 1 = 99...9 is a multiple of 9 (7).
 * 3. So n and s leave the same remainder on division by 9 (4); in particular n is a multiple of 9
 *    exactly when s is, both directions stated (3).
 * 4. Clear "if and only if": both directions, or one argument that is reversible (3).
 */
const ns2q13 = supervision({
  id: 'ns2-q13',
  source: cite('ia-ns-sheet-2', 'Q13, first part'),
  title: t`Nines and digit sums`,
  prompt: t`Show that a positive integer ${math`n`} is a multiple of ${9} if and only if the sum of its digits is a multiple of ${9}.`,
  writeUp: 'proof',
});

const POW = 29;
const powDigits = (BigInt(2) ** BigInt(POW)).toString();
const MISSING = [...'0123456789'].filter((d) => !powDigits.includes(d));
const ns2q13Digit = auto({
  id: 'ns2-q13-missing',
  source: cite('ia-ns-sheet-2', 'Q13, second part'),
  title: t`The missing digit`,
  prompt: t`The number ${math`${2}^{${POW}}`} has nine distinct digits. Which digit is missing? (Use remainders on division by ${9}, not a calculator.)`,
  answer: { kind: 'exact', expected: MISSING[0] as string },
  solution: [
    t`A number and its digit sum leave the same remainder on division by ${9} (the problem Nines and digit sums). The digits ${0} to ${9} add to ${45}, a multiple of ${9}; leaving out the digit ${math`d`} gives the sum ${math`${45} - d`}.`,
    t`${math`${2}^{${3}} = ${8}`} leaves remainder ${8}, one less than ${9}. So ${math`${2}^{${6}} = ${8} \times ${8}`} leaves remainder ${1}, and so does every power ${math`${2}^{${6}k}`}. Then ${math`${2}^{${POW}} = ${2}^{${24}} \times ${2}^{${5}}`} leaves the remainder of ${math`${2}^{${5}} = ${32}`}, which is ${32 % 9}.`,
    t`So ${math`${45} - d`} leaves remainder ${32 % 9}: ${math`${45} - d = ${40}`}, since ${math`d`} is between ${0} and ${9}. The missing digit is ${Number(MISSING[0])}. (Indeed ${math`${2}^{${POW}} = ${2 ** POW}`}.)`,
  ],
  reference: MISSING[0] as string,
  verify: () => {
    const e = same('the digits of 2^29 are nine and distinct', `${powDigits.length} ${new Set(powDigits).size}`, '9 9');
    if (e !== null) return e;
    return same('the missing digit by remainders', (9 - ((2 ** POW) % 9)) % 9, MISSING[0]);
  },
  misconceptions: [{ response: String((2 ** POW) % 9), why: t`That is the remainder of ${math`${2}^{${POW}}`} itself. The digits present add to ${math`${45} - d`}, and that is what leaves this remainder; solve for the missing digit ${math`d`}.` }],
});

/*
 * Outline for marking ns2-q12-i (20 marks):
 * 1. Looks for a small divisor and tries 3 (2).
 * 2. 4 leaves remainder 1 on division by 3, so 4^9 does, and 2^19 = 2 x 4^9 leaves remainder 2 (6).
 * 3. 25 leaves remainder 1, so 5^40 = 25^20 leaves remainder 1 (6).
 * 4. The sum leaves remainder 2 + 1 = 3, that is 0: 3 divides 2^19 + 5^40 (4).
 * 5. The number is larger than 3, so 3 is a proper factor and it is not prime (2).
 */
const ns2q12i = supervision({
  id: 'ns2-q12-i',
  source: cite('ia-ns-sheet-2', 'Q12, first part'),
  title: t`A sum of powers that is not prime`,
  prompt: t`Show that ${math`${2}^{${19}} + ${5}^{${40}}`} is not prime.`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

export const remainders: TopicContent = {
  topicId: 'pre.remainders',
  goal: t`Divide one whole number by another to get a quotient and a remainder smaller than the divisor.`,
  objective: t`Find quotients and remainders, also for negative numbers and for combinations.`,
  why: t`Remainders drive STEP's integer puzzles and, next, modular arithmetic.`,
  minutes: 15,
  lesson: [
    { kind: 'section', title: t`The idea` },
    { kind: 'hook', text: t`Three castaways each take a third of a pile of bananas in the night, always with one left over for the orangutan. How many bananas could there have been? To even start, you need one precise idea: the remainder.` },
    { kind: 'narrative', text: t`Share ${17} sweets among ${5} children: each gets ${3}, and ${2} are left. That is ${math`${17} = ${5} \times ${3} + ${2}`}. The ${3} is the quotient and the ${2} the remainder, and the remainder is always smaller than the number of children; otherwise everyone could have one more.` },
    { kind: 'section', title: t`Division with remainder` },
    {
      kind: 'definition',
      name: t`Quotient and remainder`,
      formal: t`Let ${math`n`} and ${math`d`} be integers with ${math`d \ge ${1}`}. Integers ${math`q`} and ${math`r`} with ${math`n = dq + r`} and ${math`${0} \le r < d`} are the [[quotient|quotient]] and the [[remainder|remainder]] of ${math`n`} on division by ${math`d`}.`,
      plain: t`${math`q`} counts how many whole ${math`d`}'s fit into ${math`n`}, and ${math`r`} is what is left, from ${0} up to ${math`d - ${1}`}. Dividing ${23} by ${4}: ${math`${23} = ${4} \times ${5} + ${3}`}.`,
    },
    { kind: 'theorem', name: t`Division with remainder`, statement: t`For every integer ${math`n`} and every integer ${math`d \ge ${1}`} there are unique integers ${math`q`} and ${math`r`} with ${math`n = dq + r`} and ${math`${0} \le r < d`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Existence`, text: t`Let ${math`q`} be the largest integer with ${math`dq \le n`}, and ${math`r = n - dq`}. Then ${math`r \ge ${0}`}, and ${math`r < d`} because ${math`d(q + ${1}) > n`}.`, why: { q: t`Why is there a largest such ${math`q`}?`, a: t`${math`dq \le n`} fails for every ${math`q > |n|`}, and holds for ${math`q = -|n|`}, so the integers that work have a largest member.` } },
        { label: t`Suppose two answers`, text: t`If also ${math`n = dq' + r'`} with ${math`${0} \le r' < d`}, subtract: ${math`d(q - q') = r' - r`}.` },
        { label: t`The difference is too small`, text: t`${math`-d < r' - r < d`}, and the only multiple of ${math`d`} strictly between ${math`-d`} and ${math`d`} is ${0}. So ${math`r' = r`} and ${math`q' = q`}.` },
      ],
    },
    checkFrom(divide, { n: 100, d: 7 }, t`${math`${7} \times ${14} = ${98} \le ${100} < ${105}`}, so ${math`q = ${14}`} and ${math`r = ${2}`}.`),
    { kind: 'section', title: t`Negative numbers` },
    { kind: 'narrative', text: t`The definition says the remainder lies from ${0} to ${math`d - ${1}`}, even when ${math`n`} is negative. So divide ${math`-${7}`} by ${3}: the multiple of ${3} at or below ${math`-${7}`} is ${math`-${9}`}, and ${math`-${7} = ${3} \times (-${3}) + ${2}`}. The remainder is ${2}, not ${math`-${1}`}.` },
    checkFrom(negative, { n: -23, d: 5 }, t`${math`-${25} \le -${23}`}, so ${math`-${23} = ${5} \times (-${5}) + ${2}`}: ${math`q = -${5}`}, ${math`r = ${2}`}.`),
    { kind: 'pitfall', claim: t`The remainder of ${math`-${7}`} on division by ${3} is ${math`-${1}`}, since ${math`-${7} = ${3} \times (-${2}) - ${1}`}.`, counterexample: t`The equation is true, but a remainder must satisfy ${math`${0} \le r < ${3}`}. Take one more ${3} away: ${math`-${7} = ${3} \times (-${3}) + ${2}`}, remainder ${2}.` },
    { kind: 'section', title: t`Remainders of combinations` },
    { kind: 'narrative', text: t`Remainders behave well under sums and products. If ${math`N`} leaves remainder ${2} on division by ${5}, write ${math`N = ${5}m + ${2}`}. Then ${math`${3}N + ${4} = ${15}m + ${10} = ${5}(${3}m + ${2}) + ${0}`}: the remainder is ${0}, whatever ${math`m`} is. Writing ${math`N = dm + r`} is the move that unlocks every such question, including the bananas.` },
    checkFrom(combination, { d: 7, r: 3, k: 4, c: 5 }, t`${math`N = ${7}m + ${3}`}, so ${math`${4}N + ${5} = ${28}m + ${17} = ${7}(${4}m + ${2}) + ${3}`}.`),
    { kind: 'takeaway', text: t`Every integer is ${math`n = dq + r`} with ${math`${0} \le r < d`}, in exactly one way; write a number in that form to reason about its remainders.` },
  ],
  examples: [
    withExaminer(workedCambridge(bananas79), t`Each division written as ${math`n = ${3}q + ${1}`}, so the reader sees the remainder is exactly ${1} every time.`),
    worked(negative, { n: -40, d: 7 }, t`A negative number`),
    worked(combination, { d: 9, r: 5, k: 7, c: 2 }, t`The remainder of a combination`),
  ],
  generators: [divide, negative, combination],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['quotient', 'remainder'],
  cambridge: withUses([bananasShow, ns2q13, ns2q13Digit, ns2q12i], {
    'ns2-q13': { sections: ['Remainders of combinations'], note: t`Comparing a number and its digit sum by their remainders on division by nine` },
    'a3-q4-i': { sections: ['Division with remainder'], note: t`Writing each division with remainder as an equation and chaining them` },
    'ns2-q12-i': { sections: ['Remainders of combinations'], note: t`Finding the remainders of large powers to show a sum has a factor` },
  }),
  // The digit sum rule first (a remainder argument in general), then the bananas and the sum of
  // powers; the missing digit is the rule applied, a value a calculator also gives.
  gate: ['ns2-q13', 'a3-q4-i', 'ns2-q12-i'],
  recall: [
    { front: t`State division with remainder.`, back: t`For integers ${math`n`} and ${math`d \ge ${1}`} there are unique ${math`q, r`} with ${math`n = dq + r`} and ${math`${0} \le r < d`}.` },
    { front: t`The remainder of ${math`-${7}`} on division by ${3}?`, back: t`${2}, since ${math`-${7} = ${3} \times (-${3}) + ${2}`}.` },
  ],
  proofOrder: [{
    title: t`The remainder is unique`,
    steps: [
      t`Suppose ${math`n = dq + r = dq' + r'`} with ${math`${0} \le r, r' < d`}.`,
      t`Subtracting, ${math`d(q - q') = r' - r`}.`,
      t`But ${math`-d < r' - r < d`}, and the only multiple of ${math`d`} there is ${0}.`,
      t`So ${math`r = r'`}, and then ${math`q = q'`}.`,
    ],
  }],
};
