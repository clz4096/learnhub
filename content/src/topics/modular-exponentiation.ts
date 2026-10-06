/**
 * num.modular-exponentiation: compute a^k mod m with about log2 k squarings, reducing mod
 * m at every step. From supervision exercise 2.2.5 (2^153 ≡ 53 (mod 153), whose 2023-24
 * official solution reduces subexpressions by known congruences) and the CST notes'
 * remarks on Fermat's little theorem (printed pages 131 and 132: a number m is shown
 * composite by an i with i^m ≢ i (mod m); and 2^340 ≡ 1 (mod 341) although 341 is not
 * prime).
 */
import { auto, cite, same, supervision } from '../cambridge';
import { int, pick, upTo } from '../math';
import { mod, powMod, powModSlow } from '../numbers';
import { generator, type Misconception } from '../problem';
import { computedTex, listOf, math, t } from '../rich';
import { worked, workedCambridge, type TopicContent } from '../topic';

const [mk, mm] = [math`k`, math`m`];
const bits = (k: number): string => k.toString(2);
const distinctFrom = (right: string, xs: readonly string[]): number => new Set(xs.filter((x) => x !== right)).size;
/** The squares a, a^2, a^4, ... mod m, up to the highest power of 2 not above k. */
const squares = (a: number, k: number, m: number): number[] => {
  const out = [mod(a, m)];
  for (let p = 2; p <= k; p *= 2) out.push(((out.at(-1) as number) ** 2) % m);
  return out;
};

// ---------------------------------------------------------------- a power by repeated squaring

interface PowP { a: number; k: number; m: number }
const powMis = ({ a, k, m }: PowP): string[] => [String(powMod(a, k % m, m)), String(mod(a * k, m)), String(powMod(a, k % (m - 1), m))];

const squareAndMultiply = generator<PowP>({
  id: 'square-and-multiply',
  skill: 'Compute a^k mod m by repeated squaring: square, reduce, and multiply together the squares that the binary digits of k pick out.',
  params: (rng) => {
    for (;;) {
      const p: PowP = { a: int(rng, 2, 30), k: int(rng, 20, 200), m: pick(rng, [15, 21, 33, 35, 39, 51, 55, 65, 77, 91, 97, 101, 61, 47]) };
      if (p.a % p.m !== 0 && distinctFrom(String(powMod(p.a, p.k, p.m)), powMis(p)) >= 2) return p;
    }
  },
  sane: ({ a, m }) => (a % m !== 0 ? null : 'out of range'),
  problem: ({ a, k, m }) => {
    const sq = squares(a, k, m);
    const b = bits(k);
    const used = [...b].reverse().flatMap((d, i) => (d === '1' ? [i] : []));
    return {
      prompt: t`Compute ${math`${a}^{${k}} \bmod ${m}`} by repeated squaring.`,
      answer: { kind: 'exact', expected: String(powMod(a, k, m)) },
      solution: [
        t`In binary ${math`${k} = ${computedTex(b)}_{${2}}`}, so ${math`${a}^{${k}}`} is the product of ${math`${a}^{${2}^{i}}`} for ${math`i \in \{${computedTex(used.join(', '))}\}`}.`,
        t`Square and reduce mod ${m} each time: ${math`${a}^{${1}}, ${a}^{${2}}, ${a}^{${4}}, \ldots`} are ${listOf(sq)}.`,
        t`Multiply the chosen ones, reducing as you go: ${math`${computedTex(used.map((i) => String(sq[i])).join(' \\times '))} \equiv ${powMod(a, k, m)} \pmod{${m}}`}.`,
      ],
    };
  },
  solve: ({ a, k, m }) => String(powModSlow(a, k, m)),
  misconceptions: ({ a, k, m }): Misconception[] => [
    { response: String(powMod(a, k % m, m)), why: t`The exponent cannot be reduced mod ${m}: ${math`a^{k}`} depends on ${mk} itself. Only the base may be reduced.` },
    { response: String(mod(a * k, m)), why: t`${math`${a}^{${k}}`} multiplies ${a} by itself ${k} times; it is not ${math`${a} \times ${k}`}.` },
    { response: String(powMod(a, k % (m - 1), m)), why: t`Reducing the exponent mod ${math`m - ${1}`} is Fermat's little theorem, which needs ${mm} prime and ${math`${a}`} not a multiple of it. Compute the power.` },
  ],
});

// ---------------------------------------------------------------- how many multiplications

interface CountP { k: number }
const countMul = (k: number): number => bits(k).length - 1 + [...bits(k)].filter((d) => d === '1').length - 1;

const multiplicationCount = generator<CountP>({
  id: 'multiplication-count',
  skill: 'Count the multiplications that repeated squaring needs for a^k: one squaring per binary digit after the first, and one product per further 1.',
  params: (rng) => {
    for (;;) {
      const k = int(rng, 9, 5000);
      if (new Set([k - 1, bits(k).length - 1, bits(k).length + [...bits(k)].filter((d) => d === '1').length].filter((x) => x !== countMul(k))).size >= 2) return { k };
    }
  },
  sane: ({ k }) => (k >= 9 ? null : 'out of range'),
  problem: ({ k }) => {
    const b = bits(k);
    const ones = [...b].filter((d) => d === '1').length;
    return {
      prompt: t`Repeated squaring computes ${math`a^{${k}} \bmod m`} by squaring to get ${math`a^{${2}}, a^{${4}}, a^{${8}}, \ldots`} and multiplying together the ones the binary digits of ${k} pick out. How many multiplications mod ${mm} does that take in all, counting squarings?`,
      answer: { kind: 'exact', expected: String(countMul(k)) },
      solution: [
        t`${math`${k} = ${computedTex(b)}_{${2}}`} has ${b.length} binary digits, ${ones} of them ${1}.`,
        t`Squarings: ${b.length - 1}, to reach ${math`a^{${2}^{${b.length - 1}}}`}. Products of the chosen powers: ${ones - 1}. In all ${countMul(k)}, against ${k - 1} for multiplying by ${math`a`} one step at a time.`,
      ],
    };
  },
  solve: ({ k }) => {
    // Simulate left-to-right square and multiply, counting operations.
    let ops = 0;
    for (const d of bits(k).slice(1)) { ops++; if (d === '1') ops++; }
    return String(ops);
  },
  misconceptions: ({ k }): Misconception[] => [
    { response: String(k - 1), why: t`That is the naive method, multiplying by ${math`a`} once per step. Squaring doubles the exponent each time.` },
    { response: String(bits(k).length - 1), why: t`That counts only the squarings. Combining the chosen powers takes one multiplication per extra binary ${1}.` },
    { response: String(bits(k).length + [...bits(k)].filter((d) => d === '1').length), why: t`Off by two: the first binary digit needs no squaring and the first chosen power needs no product.` },
  ],
});

// ---------------------------------------------------------------- the chain of squares

interface ChainP { a: number; m: number; j: number }
const chainOf = (a: number, m: number, j: number): number[] => upTo(j + 1).map((i) => powMod(a, 2 ** (i - 1), m));

const squareChain = generator<ChainP>({
  id: 'square-chain',
  skill: 'Build the chain a, a^2, a^4, a^8, ... mod m, squaring the previous entry and reducing each time.',
  params: (rng) => {
    for (;;) {
      const p: ChainP = { a: int(rng, 2, 20), m: pick(rng, [13, 17, 19, 23, 29, 31, 37, 41, 43, 53]), j: int(rng, 3, 5) };
      const right = chainOf(p.a, p.m, p.j).join();
      const wrong1 = upTo(p.j + 1).map((i) => powMod(p.a, i, p.m)).join();
      const wrong2 = upTo(p.j + 1).map((i) => mod(p.a * 2 ** (i - 1), p.m)).join();
      if (p.a % p.m !== 0 && wrong1 !== right && wrong2 !== right && wrong1 !== wrong2) return p;
    }
  },
  sane: ({ a, m }) => (a % m !== 0 ? null : 'out of range'),
  problem: ({ a, m, j }) => {
    const c = chainOf(a, m, j);
    return {
      prompt: t`Fill in ${math`${a}^{${2}^{i}} \bmod ${m}`} for ${math`i = ${0}, \ldots, ${j}`}.`,
      answer: { kind: 'table', cell: 'exact', columns: [t`${math`i`}`, t`${math`${a}^{${2}^{i}} \bmod ${m}`}`], rows: upTo(j + 1).map((i) => [t`${i - 1}`, null]), expected: c.map(String) },
      solution: [
        t`Each entry is the square of the one before, reduced: ${math`${c[0] as number}^{${2}} = ${(c[0] as number) ** 2} \equiv ${c[1] as number}`}, then ${math`${c[1] as number}^{${2}} = ${(c[1] as number) ** 2} \equiv ${c[2] as number} \pmod{${m}}`}, and so on.`,
        t`The chain is ${listOf(c)}. No number ever exceeds ${math`(${m} - ${1})^{${2}}`}, however large the exponent.`,
      ],
    };
  },
  solve: ({ a, m, j }) => upTo(j + 1).map((i) => String(powModSlow(a, 2 ** (i - 1), m))),
  misconceptions: ({ a, m, j }): Misconception[] => [
    { response: upTo(j + 1).map((i) => String(powMod(a, i, m))), why: t`That multiplies by ${a} each time, giving ${math`a^{${1}}, a^{${2}}, a^{${3}}, \ldots`}. Square the previous entry instead: the exponents double.` },
    { response: upTo(j + 1).map((i) => String(mod(a * 2 ** (i - 1), m))), why: t`That doubles the entry. Squaring multiplies it by itself.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const sheet225 = auto({
  id: 'sheet-2-2-5',
  source: cite('cst-dm-sw1', 'Exercises 2, 2.2.5'),
  title: t`${math`${2}^{${153}} \bmod ${153}`}`,
  prompt: t`Calculate ${math`${2}^{${153}} \bmod ${153}`}. (The exercise says it is ${53}; compute it.)`,
  answer: { kind: 'exact', expected: String(powMod(2, 153, 153)) },
  solution: [
    t`By squaring: ${math`${153} = ${computedTex(bits(153))}_{${2}}`}, so ${math`${2}^{${153}} = ${2}^{${128}} \cdot ${2}^{${16}} \cdot ${2}^{${8}} \cdot ${2}^{${1}}`}. The squares of ${2} mod ${153} are ${listOf(squares(2, 153, 153))}.`,
    t`Multiplying the chosen ones mod ${153} gives ${powMod(2, 153, 153)}. The official solution instead uses ${math`${2}^{${7}} = ${128} \equiv -${25}`} and ${math`${25}^{${2}} = ${625} \equiv ${13} \pmod{${153}}`} to keep every number small.`,
  ],
  reference: String(powMod(2, 153, 153)),
  verify: () => same('153 multiplications by 2, reducing each time', powModSlow(2, 153, 153), 53),
  misconceptions: [{ response: '2', why: t`${math`i^{p} \equiv i`} holds for primes ${math`p`}; ${153} is not prime, so nothing forces ${math`${2}^{${153}} \equiv ${2}`}.` }],
  official: { source: cite('cst-dm-sols-2324-2', '2.2.5'), answer: '53', agrees: true },
});

const totd341 = auto({
  id: 'notes-132-totd-341',
  source: cite('cst-dm-notes', 'printed page 132, the Theorem of the Day sheet', true),
  title: t`A false witness to primality`,
  prompt: t`The Theorem of the Day sheet in the CST notes says ${math`${2}^{${340}} \equiv ${1} \pmod{${341}}`}, although ${341} is not prime. Compute ${math`${2}^{${340}} \bmod ${341}`} to check it.`,
  answer: { kind: 'exact', expected: String(powMod(2, 340, 341)) },
  solution: [
    t`${math`${2}^{${10}} = ${1024} = ${3} \times ${341} + ${1}`}, so ${math`${2}^{${10}} \equiv ${1} \pmod{${341}}`}, and ${math`${2}^{${340}} = (${2}^{${10}})^{${34}} \equiv ${1}`}.`,
    t`Yet ${math`${341} = ${11} \times ${31}`}. So ${math`a^{m - ${1}} \equiv ${1}`} does not prove ${mm} prime: the converse of Fermat's little theorem is false.`,
  ],
  reference: String(powMod(2, 340, 341)),
  verify: () => same('340 multiplications, and a factor', [powModSlow(2, 340, 341), 341 % 11].join(), '1,0'),
  misconceptions: [{ response: '0', why: t`${2} and ${341} share no factor, so no power of ${2} is a multiple of ${341}.` }],
  official: { source: cite('cst-dm-notes', 'printed page 132, the Theorem of the Day sheet'), answer: '1', agrees: true },
});

const witness341 = upTo(340).find((i) => i >= 2 && powMod(i, 341, 341) !== i % 341) as number;
const btw341 = auto({
  id: 'notes-131-btw-witness',
  source: cite('cst-dm-notes', 'printed page 131, Btw 2(a)', true),
  title: t`Showing ${341} is composite without factorising`,
  prompt: t`The notes: "to establish that a positive integer ${mm} is not prime one may proceed to find an integer ${math`i`} such that ${math`i^{m} \not\equiv i \pmod{m}`}." For ${math`m = ${341}`}, ${math`i = ${2}`} fails to show it (${math`${2}^{${341}} \equiv ${2}`}). What is the smallest ${math`i \ge ${2}`} that works?`,
  answer: { kind: 'exact', expected: String(witness341) },
  solution: [
    t`${math`${2}^{${341}} = ${2} \cdot ${2}^{${340}} \equiv ${2}`}, so ${2} is no witness. By repeated squaring, ${math`${3}^{${341}} \equiv ${powMod(3, 341, 341)} \pmod{${341}}`}, which is not ${3}.`,
    t`So ${math`i = ${witness341}`} shows ${341} is not prime, by Fermat's little theorem, without finding a factor.`,
  ],
  reference: String(witness341),
  verify: () => same('the first i with i^341 not congruent to i, by slow powers', upTo(20).find((i) => i >= 2 && powModSlow(i, 341, 341) !== i), 3),
  misconceptions: [{ response: '2', why: t`${math`${2}^{${341}} \equiv ${2} \pmod{${341}}`}: ${2} passes the test although ${341} is composite. Try the next ${math`i`}.` }],
});

const sheet225why = supervision({
  id: 'sheet-2-2-5-flt',
  source: cite('cst-dm-sw1', 'Exercises 2, 2.2.5'),
  title: t`No contradiction with Fermat`,
  prompt: t`${math`${2}^{${153}} \equiv ${53} \pmod{${153}}`}. At first sight this seems to contradict Fermat's little theorem. Explain why it does not. Then redo the calculation as the official solution does, replacing subexpressions by known congruences (${math`${153} = ${128} + ${25}`}), and say which properties of congruence from exercise ${2}.${1}.${2} each step uses.`,
  writeUp: 'explanation',
  official: cite('cst-dm-sols-2324-2', '2.2.5'),
});
const costWhy = supervision({
  id: 'squaring-cost',
  source: cite('cst-dm-notes', 'printed pages 259 to 264, the Diffie-Hellman method', true),
  title: t`Why repeated squaring is fast`,
  prompt: t`Diffie-Hellman needs ${math`c^{a} \bmod p`} for exponents ${math`a`} with hundreds of digits. Explain why multiplying by ${math`c`} ${math`a`} times is hopeless, and why repeated squaring needs at most about ${math`${2}\log_{${2}} a`} multiplications. Why must every intermediate result be reduced mod ${math`p`}?`,
  writeUp: 'explanation',
});

// ---------------------------------------------------------------- lesson

export const modularExponentiation: TopicContent = {
  topicId: 'num.modular-exponentiation',
  goal: t`Compute ${math`a^{k} \bmod m`} with about ${math`\log_{${2}} k`} squarings, reducing mod ${mm} at every step.`,
  lesson: [
    { kind: 'p', text: t`${math`${2}^{${153}}`} has ${String(2n ** 153n).length} digits, but its remainder mod ${153} needs no number bigger than ${math`${152}^{${2}}`}: reduce after every multiplication, since congruence respects products.` },
    { kind: 'rule', text: t`[[repeated-squaring|Repeated squaring]]: write ${mk} in binary. Compute ${math`a, a^{${2}}, a^{${4}}, a^{${8}}, \ldots \bmod m`}, each the square of the one before, and multiply together the powers whose binary digit in ${mk} is ${1}.` },
    { kind: 'p', text: t`Example: ${math`${3}^{${13}} \bmod ${7}`}. ${math`${13} = ${computedTex(bits(13))}_{${2}}`}, so ${math`${3}^{${13}} = ${3}^{${8}} \cdot ${3}^{${4}} \cdot ${3}^{${1}}`}. The squares mod ${7} are ${listOf(squares(3, 13, 7))}, and ${math`${squares(3, 13, 7)[3] as number} \times ${squares(3, 13, 7)[2] as number} \times ${squares(3, 13, 7)[0] as number} \equiv ${powMod(3, 13, 7)} \pmod{${7}}`}.` },
    { kind: 'p', text: t`The cost is one squaring per binary digit after the first and one product per further ${1}: at most about ${math`${2}\log_{${2}} k`} multiplications, against ${math`k - ${1}`} for the naive method. For a ${300}-digit exponent that is about ${2000} multiplications instead of more than there are atoms in the universe.` },
    { kind: 'p', text: t`Fast powers make Fermat's little theorem a test: if ${math`i^{m} \not\equiv i \pmod{m}`} then ${mm} is not prime. Exercise ${2}.${2}.${5}: ${math`${2}^{${153}} \equiv ${53}`}, so ${153} is composite. The test can be fooled: ${math`${2}^{${340}} \equiv ${1} \pmod{${341}}`} though ${math`${341} = ${11} \times ${31}`}.` },
  ],
  examples: [
    workedCambridge(sheet225),
    worked(squareAndMultiply, { a: 7, k: 100, m: 33 }, t`${math`${7}^{${100}} \bmod ${33}`}`),
    worked(squareChain, { a: 5, m: 23, j: 4 }, t`The chain of squares of ${5} mod ${23}`),
  ],
  generators: [squareAndMultiply, multiplicationCount, squareChain],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['repeated-squaring'],
  cambridge: [totd341, btw341, sheet225why, costWhy],
};
