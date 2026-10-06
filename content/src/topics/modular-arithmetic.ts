/**
 * num.modular-arithmetic: congruences can be added, multiplied, and raised to powers, so a
 * remainder can be found by reducing every part first. The lesson follows supervision
 * exercises 2.1.2 (congruence respects +, ×, and powers) and 2.2.2 (digit tests for 3, 9,
 * and 11) with the 2023-24 official solutions and their commentary, the notes' Proposition
 * 25 (squares modulo 4, printed pages 104 to 110), and Book of Proof Chapter 5, exercise 17,
 * and Chapter 6, exercise 17 with its remark. Exercise 2.2.4 is the worked example.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { int, pick, upTo } from '../math';
import { mod, powMod, powModSlow } from '../numbers';
import { generator, type Misconception } from '../problem';
import { computedTex, listOf, math, setOf, t, type Span } from '../rich';
import { worked, workedCambridge, type TopicContent } from '../topic';
import type { Rational } from '../math';

const mm = math`m`;
const rem = (a: number | Span, m: number): Span => math`\mathrm{rem}(${a}, ${m})`;
const distinctFrom = (right: string, xs: readonly string[]): number => new Set(xs.filter((x) => x !== right)).size;

// ---------------------------------------------------------------- a power by its cycle

interface PowP { a: number; k: number; m: number }

/** The remainders a^1, a^2, ... mod m until they repeat, with the start of the cycle. */
function cycle(a: number, m: number): { seq: number[]; start: number } {
  const seq: number[] = [];
  let x = mod(a, m);
  for (;;) {
    const i = seq.indexOf(x);
    if (i >= 0) return { seq, start: i };
    seq.push(x);
    x = (x * a) % m;
  }
}
const powMis = (a: number, k: number, m: number): string[] => [String(powMod(a, k % m, m)), String(mod(a * k, m)), String(mod(a, m))];

const powerCycle = generator<PowP>({
  id: 'power-cycle',
  skill: 'Find the remainder of a large power by following the remainders of successive powers until they repeat.',
  params: (rng) => {
    for (;;) {
      const m = pick(rng, [10, 7, 9, 11, 13, 5, 8]);
      const a = int(rng, 2, 19);
      const k = int(rng, 20, 999);
      const right = String(powMod(a, k, m));
      if (a % m !== 0 && cycle(a, m).seq.length >= 2 && distinctFrom(right, powMis(a, k, m)) >= 2) return { a, k, m };
    }
  },
  sane: ({ a, m }) => (a % m !== 0 ? null : 'out of range'),
  problem: ({ a, k, m }) => {
    const { seq, start } = cycle(a, m);
    const len = seq.length - start;
    const idx = k - 1 < start ? k - 1 : start + ((k - 1 - start) % len);
    return {
      prompt: m === 10 ? t`What is the last digit of ${math`${a}^{${k}}`}?` : t`What is the remainder when ${math`${a}^{${k}}`} is divided by ${m}?`,
      answer: { kind: 'exact', expected: String(powMod(a, k, m)) },
      solution: [
        t`Reduce as you go: each power's remainder is the previous one times ${a}, reduced mod ${m}. The remainders of ${math`${a}^{${1}}, ${a}^{${2}}, \ldots`} are ${listOf(seq)}, and then they repeat with period ${len}.`,
        t`${math`${a}^{${k}}`} is in position ${idx + 1} of the cycle${start > 0 ? t` (after the first ${start})` : t``}, so the remainder is ${seq[idx] as number}.`,
      ],
    };
  },
  solve: ({ a, k, m }) => String(powModSlow(a, k, m)),
  misconceptions: ({ a, k, m }): Misconception[] => [
    { response: String(powMod(a, k % m, m)), why: t`The exponent is not reduced mod ${m}: ${math`a \equiv b`} lets you replace the base, not the exponent. Find the period of the powers instead.` },
    { response: String(mod(a * k, m)), why: t`${math`${a}^{${k}}`} is ${a} multiplied by itself ${k} times, not ${a} times ${k}.` },
    { response: String(mod(a, m)), why: t`The powers of ${a} do not all leave the remainder of ${a}: list ${math`${a}^{${1}}, ${a}^{${2}}, \ldots`} mod ${m}.` },
  ],
});

// ---------------------------------------------------------------- reduce, then compute

interface RedP { a: number; b: number; c: number; m: number }
const redMis = ({ a, b, c, m }: RedP): string[] => [String(mod(a, m) * mod(b, m) + mod(c, m)), String(mod(a + b + c, m)), String(mod(a * b, m))];

const reduceFirst = generator<RedP>({
  id: 'reduce-first',
  skill: 'Find rem(a b + c, m) by reducing a, b, and c first: congruence respects sums and products (exercise 2.1.2).',
  params: (rng) => {
    for (;;) {
      const p: RedP = { a: int(rng, 100, 9999), b: int(rng, 100, 9999), c: int(rng, 10, 999), m: pick(rng, [7, 9, 11, 12, 13, 17]) };
      if (distinctFrom(String(mod(p.a * p.b + p.c, p.m)), redMis(p)) >= 2) return p;
    }
  },
  sane: ({ m }) => (m >= 7 ? null : 'out of range'),
  problem: ({ a, b, c, m }) => {
    const [ra, rb, rc] = [mod(a, m), mod(b, m), mod(c, m)];
    return {
      prompt: t`Find ${rem(computedTex(`${a} \\times ${b} + ${c}`), m)} without multiplying ${a} by ${b}.`,
      answer: { kind: 'exact', expected: String(mod(a * b + c, m)) },
      solution: [
        t`Reduce each number: ${math`${a} \equiv ${ra}`}, ${math`${b} \equiv ${rb}`}, ${math`${c} \equiv ${rc} \pmod{${m}}`}.`,
        t`Congruence respects products and sums, so ${math`${a} \times ${b} + ${c} \equiv ${ra} \times ${rb} + ${rc} = ${ra * rb + rc} \equiv ${mod(ra * rb + rc, m)} \pmod{${m}}`}. The remainder is ${mod(a * b + c, m)}.`,
      ],
    };
  },
  solve: ({ a, b, c, m }) => String(Number((BigInt(a) * BigInt(b) + BigInt(c)) % BigInt(m))),
  misconceptions: ({ a, b, c, m }): Misconception[] => [
    { response: String(mod(a, m) * mod(b, m) + mod(c, m)), why: t`${math`${mod(a, m) * mod(b, m) + mod(c, m)}`} is congruent to the answer but is not a remainder: reduce it once more, to between ${0} and ${m - 1}.` },
    { response: String(mod(a + b + c, m)), why: t`The first two numbers are multiplied, so multiply their remainders: ${math`${mod(a, m)} \times ${mod(b, m)}`}.` },
    { response: String(mod(a * b, m)), why: t`Do not drop the ${c}: add its remainder ${mod(c, m)} too.` },
  ],
});

// ---------------------------------------------------------------- digit tests

type DigitM = 3 | 9 | 11;
interface DigP { n: number; m: DigitM }
const digits = (n: number): number[] => String(n).split('').map(Number);
const altSum = (n: number): number => digits(n).reverse().reduce((s, d, i) => s + (i % 2 === 0 ? d : -d), 0);
const digitMis = ({ n, m }: DigP): string[] => {
  const s = digits(n).reduce((x, y) => x + y, 0);
  return m === 11 ? [String(mod(s, 11)), String(mod(-altSum(n), 11)), String(Math.abs(altSum(n)))] : [String(s), String(mod(n % 10, m)), String(mod(s, m === 3 ? 9 : 3))];
};

const digitTest = generator<DigP>({
  id: 'digit-test',
  skill: 'Find a remainder mod 3, 9, or 11 from the digits: 10 ≡ 1 (mod 9) and 10 ≡ -1 (mod 11), as in supervision exercise 2.2.2.',
  params: (rng) => {
    for (;;) {
      const p: DigP = { n: int(rng, 100000, 99999999), m: pick(rng, [3, 9, 11] as const) };
      if (distinctFrom(String(mod(p.n, p.m)), digitMis(p)) >= 2) return p;
    }
  },
  sane: ({ n }) => (n >= 100000 ? null : 'out of range'),
  problem: ({ n, m }) => {
    const ds = digits(n);
    const s = ds.reduce((x, y) => x + y, 0);
    const alt = altSum(n);
    return {
      prompt: t`Using the digits, find the remainder when ${n} is divided by ${m}.`,
      answer: { kind: 'exact', expected: String(mod(n, m)) },
      solution: m === 11
        ? [
          t`${math`${10} \equiv -${1} \pmod{${11}}`}, so ${math`${10}^{i} \equiv (-${1})^{i}`}: add the digits with alternating signs, starting with ${math`+`} on the units digit.`,
          t`${math`${computedTex(ds.slice().reverse().map((d, i) => (i === 0 ? String(d) : `${i % 2 === 0 ? '+' : '-'} ${d}`)).join(' '))} = ${alt}`}, and ${math`${alt} \equiv ${mod(alt, 11)} \pmod{${11}}`}. The remainder is ${mod(n, 11)}.`,
        ]
        : [
          t`${math`${10} \equiv ${1} \pmod{${m}}`}, so every power of ${10} is ${math`\equiv ${1}`}, and a number is congruent to the sum of its digits.`,
          t`The digit sum is ${math`${computedTex(ds.join(' + '))} = ${s}`}, and ${math`${s} \equiv ${mod(s, m)} \pmod{${m}}`}. The remainder is ${mod(n, m)}.`,
        ],
    };
  },
  solve: ({ n, m }) => String(n % m),
  misconceptions: ({ n, m }): Misconception[] => {
    const s = digits(n).reduce((x, y) => x + y, 0);
    if (m === 11) return [
      { response: String(mod(s, 11)), why: t`${math`${10} \not\equiv ${1} \pmod{${11}}`}: it is ${math`-${1}`}, so the digits alternate in sign.` },
      { response: String(mod(-altSum(n), 11)), why: t`Start the signs at the units digit with ${math`+`}: the units digit is multiplied by ${math`${10}^{${0}} = ${1}`}.` },
      { response: String(Math.abs(altSum(n))), why: t`The alternating sum may be negative or ${11} or more; take its remainder between ${0} and ${10}.` },
    ];
    return [
      { response: String(s), why: t`The digit sum ${s} is congruent to the number, but the remainder is between ${0} and ${m - 1}: reduce it.` },
      { response: String(mod(n % 10, m)), why: t`The last digit decides divisibility by ${2} and ${5}, not by ${m}: use every digit.` },
      { response: String(mod(s, m === 3 ? 9 : 3)), why: t`Reduce modulo ${m}, not modulo ${m === 3 ? 9 : 3}.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

const sheet224 = auto({
  id: 'sheet-2-2-4',
  source: cite('cst-dm-sw1', 'Exercises 2, 2.2.4'),
  title: t`Remainders modulo ${79}`,
  prompt: t`What are ${rem(math`${55}^{${2}}`, 79)}, ${rem(math`${23}^{${2}}`, 79)}, ${rem(math`${23} \cdot ${55}`, 79)}, and ${rem(math`${55}^{${78}}`, 79)}?`,
  answer: {
    kind: 'table', cell: 'exact',
    columns: [t`expression`, t`remainder`],
    rows: [[t`${math`${55}^{${2}}`}`, null], [t`${math`${23}^{${2}}`}`, null], [t`${math`${23} \times ${55}`}`, null], [t`${math`${55}^{${78}}`}`, null]],
    expected: [String(powMod(55, 2, 79)), String(powMod(23, 2, 79)), String((23 * 55) % 79), String(powMod(55, 78, 79))],
  },
  solution: [
    t`${math`${55}^{${2}} = ${3025} = ${38} \times ${79} + ${23}`}, and ${math`${23}^{${2}} = ${529} = ${6} \times ${79} + ${55}`}: each squares to the other. Then ${math`${23} \times ${55} = ${1265} = ${16} \times ${79} + ${1}`}.`,
    t`For ${math`${55}^{${78}}`}, the official solution pairs the factors: ${math`${55}^{${78}} = (${55}^{${2}})^{${39}} \equiv ${23}^{${39}} = ${23} \cdot (${23}^{${2}})^{${19}} \equiv ${23} \cdot ${55}^{${19}} \equiv \cdots \equiv ${23} \cdot ${55} \equiv ${1}`}. (Fermat's little theorem gives it at once, since ${79} is prime.)`,
  ],
  reference: [String(powMod(55, 2, 79)), String(powMod(23, 2, 79)), String((23 * 55) % 79), String(powMod(55, 78, 79))],
  verify: () => same('by repeated multiplication', [powModSlow(55, 2, 79), powModSlow(23, 2, 79), (23 * 55) % 79, powModSlow(55, 78, 79)].join(), '23,55,1,1'),
  misconceptions: [{ response: ['23', '55', '1', '55'], why: t`Track the pattern: squaring swaps ${23} and ${55}, and their product is ${1}, so ${math`${55}^{${78}}`} reduces all the way to ${1}.` }],
  official: { source: cite('cst-dm-sols-2324-2', '2.2.4'), answer: ['23', '55', '1', '1'], agrees: true },
});

const sq2 = [...new Set(upTo(400).map((n) => mod(n * n + 2, 4)))].sort((x, y) => x - y);
const bop617 = auto({
  id: 'bop-6-17-remark',
  source: cite('bop', 'Chapter 6, exercise 17, the remark in the solution', true),
  title: t`Two more than a square, modulo ${4}`,
  prompt: t`Which remainders can ${math`n^{${2}} + ${2}`} leave on division by ${4}, for an integer ${math`n`}? List them. (Then ${math`${4} \nmid n^{${2}} + ${2}`}, Book of Proof Chapter ${6}, exercise ${17}.)`,
  answer: {
    kind: 'witness', count: { min: 1, max: 4 }, unordered: true, example: sq2.join(', '),
    check: (vs: readonly Rational[]) => {
      const got = [...new Set(vs.map((v) => (v.den === 1n ? Number(v.num) : NaN)))].sort((x, y) => x - y);
      if (got.some((x) => Number.isNaN(x))) return 'Give whole numbers.';
      return got.join() === sq2.join() ? null : 'Not exactly the remainders that occur: try n even and n odd.';
    },
  },
  solution: [
    t`Work mod ${4} by cases. ${math`n`} even: ${math`n^{${2}} \equiv ${0}`}, so ${math`n^{${2}} + ${2} \equiv ${2}`}. ${math`n`} odd: ${math`n^{${2}} \equiv ${1}`}, so ${math`n^{${2}} + ${2} \equiv ${3}`}.`,
    t`So the remainders are ${setOf(sq2)}, never ${0}: no square plus ${2} is a multiple of ${4}.`,
  ],
  reference: sq2.join(', '),
  verify: () => same('n from 1 to 400', sq2.join(), '2,3'),
  misconceptions: [{ response: '0, 1, 2, 3', why: t`Squares leave only ${0} or ${1} on division by ${4}, so ${math`n^{${2}} + ${2}`} leaves only ${2} or ${3}.` }],
  official: { source: cite('bop', 'Solutions, Chapter 6, exercise 17, the remark'), answer: '2, 3', agrees: true },
});

const oddSq = upTo(200).filter((n) => n % 2 === 1).reduce((g, n) => { let [x, y] = [g, n * n - 1]; while (y !== 0) [x, y] = [y, x % y]; return x; }, 0);
const bop517 = auto({
  id: 'bop-5-17-largest',
  source: cite('bop', 'Chapter 5, exercise 17', true),
  title: t`Odd squares minus one`,
  prompt: t`Book of Proof Chapter ${5}, exercise ${17}: if ${math`n`} is odd then ${math`${8} \mid n^{${2}} - ${1}`}. Is ${8} the largest number that divides ${math`n^{${2}} - ${1}`} for every odd ${math`n`}? Give the largest.`,
  answer: { kind: 'exact', expected: String(oddSq) },
  solution: [
    t`${math`n = ${2}a + ${1}`} gives ${math`n^{${2}} - ${1} = ${4}a(a + ${1})`}, and ${math`a(a + ${1})`} is even, so ${8} divides it. In congruences: ${math`n^{${2}} \equiv ${1} \pmod{${8}}`} for every odd ${math`n`}.`,
    t`Nothing larger works: ${math`${3}^{${2}} - ${1} = ${8}`}. So ${8} is the largest.`,
  ],
  reference: String(oddSq),
  verify: () => same('gcd of n^2 - 1 over odd n up to 200', oddSq, 8),
  misconceptions: [{ response: '24', why: t`${24} divides ${math`p^{${2}} - ${1}`} for primes ${math`p > ${3}`}, but not ${math`${3}^{${2}} - ${1} = ${8}`}.` }],
  official: { source: cite('bop', 'Solutions, Chapter 5, exercise 17'), answer: '8', agrees: true },
});

const sheet212 = supervision({
  id: 'sheet-2-1-2',
  source: cite('cst-dm-sw1', 'Exercises 2, 2.1.2'),
  title: t`Congruence respects the operations`,
  prompt: t`Prove that for all integers ${math`i, j, k, l`}, positive ${mm}, and natural ${math`n`}: (a) ${math`i \equiv j \land k \equiv l \Rightarrow i + k \equiv j + l`}; (b) ${math`i \equiv j \land k \equiv l \Rightarrow i k \equiv j l`}; (c) ${math`i \equiv j \Rightarrow i^{n} \equiv j^{n}`}, all ${math`\pmod{m}`}. For (c), say why the official solution's "iterating this process" is really an induction.`,
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-2', '2.1.2'),
});
const sheet222 = supervision({
  id: 'sheet-2-2-2',
  source: cite('cst-dm-sw1', 'Exercises 2, 2.2.2'),
  title: t`Digit tests`,
  prompt: t`Formalise and prove: a natural number is a multiple of ${3} if and only if the sum of its digits is; the same for ${9}; and a natural number is a multiple of ${11} if and only if the alternating sum of its digits is. Prove the stronger congruences ${math`\sum a_{i} ${10}^{i} \equiv \sum a_{i} \pmod{${9}}`} and ${math`\sum a_{i} ${10}^{i} \equiv \sum (-${1})^{i} a_{i} \pmod{${11}}`} first.`,
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-2', '2.2.2'),
});
const bop617proof = supervision({
  id: 'bop-6-17',
  source: cite('bop', 'Chapter 6, exercise 17'),
  title: t`No square plus two is a multiple of four`,
  prompt: t`Prove that for every ${math`n \in \mathbb{Z}`}, ${math`${4} \nmid (n^{${2}} + ${2})`}. Give two proofs: Book of Proof's, by contradiction, and one by cases on ${math`n`} modulo ${2}, using congruence arithmetic.`,
  writeUp: 'proof',
  official: cite('bop', 'Solutions, Chapter 6, exercise 17'),
});

// ---------------------------------------------------------------- lesson

export const modularArithmetic: TopicContent = {
  topicId: 'num.modular-arithmetic',
  goal: t`Add, multiply, and raise congruences to powers, and use that to find remainders of large expressions by reducing each part first.`,
  lesson: [
    { kind: 'rule', text: t`If ${math`i \equiv j`} and ${math`k \equiv l \pmod{m}`}, then ${math`i + k \equiv j + l`}, ${math`i k \equiv j l`}, and ${math`i^{n} \equiv j^{n} \pmod{m}`} (exercise ${2}.${1}.${2}). So in any sum, product, or power you may [[reduce-mod|reduce]] any part modulo ${mm}.` },
    { kind: 'p', text: t`The proofs are one line each from divisibility: if ${math`m \mid i - j`} and ${math`m \mid k - l`}, then ${math`m`} divides ${math`(i - j) + (k - l)`}, and also ${math`i(k - l) + l(i - j) = ik - jl`}. Powers follow by repeating the product rule, which is an induction.` },
    { kind: 'p', text: t`Exercise ${2}.${2}.${4}: ${math`${55}^{${2}} = ${3025} \equiv ${23} \pmod{${79}}`}, ${math`${23}^{${2}} \equiv ${55}`}, and ${math`${23} \times ${55} \equiv ${1}`}. With those, ${math`${55}^{${78}}`} reduces to ${1} without ever writing a number with more than four digits.` },
    { kind: 'p', text: t`Digit tests are congruences too. ${math`${10} \equiv ${1} \pmod{${9}}`}, so a number is congruent to its digit sum mod ${9} (and mod ${3}); ${math`${10} \equiv -${1} \pmod{${11}}`}, so it is congruent to its alternating digit sum mod ${11}, starting from the units digit. For ${4567}: ${math`${4} + ${5} + ${6} + ${7} = ${22} \equiv ${4} \pmod{${9}}`} and ${math`${7} - ${6} + ${5} - ${4} = ${2}`}, so ${math`${4567} \equiv ${2} \pmod{${11}}`}.` },
    { kind: 'p', text: t`Powers repeat. The last digits of ${math`${7}, ${7}^{${2}}, ${7}^{${3}}, \ldots`} are ${listOf(cycle(7, 10).seq)}, then the cycle starts again, so ${math`${7}^{${100}}`} ends in ${powMod(7, 100, 10)}. You may replace the base by anything congruent to it, never the exponent.` },
  ],
  examples: [
    workedCambridge(sheet224),
    worked(reduceFirst, { a: 1234, b: 5678, c: 91, m: 9 }, t`A remainder without the multiplication`),
    worked(powerCycle, { a: 7, k: 100, m: 10 }, t`The last digit of ${math`${7}^{${100}}`}`),
  ],
  generators: [powerCycle, reduceFirst, digitTest],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['reduce-mod'],
  cambridge: [bop617, bop517, sheet212, sheet222, bop617proof],
  gate: ['sheet-2-1-2', 'sheet-2-2-2'],
};
