/**
 * num.modular-exponentiation: compute a^k mod m with about log2 k squarings, reducing mod
 * m at every step. From supervision exercise 2.2.5 (2^153 ≡ 53 (mod 153), whose 2023-24
 * official solution reduces subexpressions by known congruences) and the CST notes'
 * remarks on Fermat's little theorem (printed pages 131 and 132: a number m is shown
 * composite by an i with i^m ≢ i (mod m); and 2^340 ≡ 1 (mod 341) although 341 is not
 * prime).
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { int, pick, upTo } from '../math';
import { mod, powMod, powModSlow } from '../numbers';
import { generator, type Misconception } from '../problem';
import { computedTex, dmath, listOf, math, t } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

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

const S13 = squares(3, 13, 7);
const K = 100;

export const modularExponentiation: TopicContent = {
  topicId: 'num.modular-exponentiation',
  goal: t`Compute ${math`a^{k} \bmod m`} with about ${math`\log_{${2}} k`} squarings, reducing mod ${mm} at every step.`,
  objective: t`Compute a large power modulo m quickly, by repeated squaring and reducing at every step.`,
  why: t`Fast powers make primality tests and public-key cryptography possible; next, Fermat and Diffie-Hellman.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`A huge power, a small remainder` },
    { kind: 'hook', text: t`${math`${2}^{${153}}`} has ${(2n ** 153n).toString().length} digits. Yet you can find its remainder on division by ${153} by hand, never writing a number bigger than ${math`${152}^{${2}}`}, and in ${countMul(153)} multiplications rather than ${152}. Two ideas do it: reduce at every step, and square instead of multiplying one factor at a time.` },
    { kind: 'narrative', text: t`The first idea you already have. Congruence respects products: if ${math`x \equiv x'`} and ${math`y \equiv y' \pmod{m}`} then ${math`xy \equiv x'y'`}. So after every multiplication you may replace the result by its remainder, and the final remainder does not change. Numbers stay below ${mm} between steps, and below ${math`m^{${2}}`} during one.` },

    { kind: 'section', title: t`Squaring instead of counting` },
    { kind: 'narrative', text: t`The second idea, [[repeated-squaring|repeated squaring]]: squaring doubles the exponent. Starting from ${math`a`} and squaring ${math`j`} times reaches ${math`a^{${2}^{j}}`}: after ${10} squarings you are at ${math`a^{${2 ** 10}}`}. Every exponent ${mk} is a sum of powers of ${2}, its binary digits, so ${math`a^{k}`} is a product of these squares.` },
    { kind: 'theorem', name: t`Repeated squaring`, statement: t`Let ${math`k = \sum_{i \in S} ${2}^{i}`}, where ${math`S`} is the set of positions of the ${1}s in the binary expansion of ${math`k \ge ${1}`}. Then ${dmath`a^{k} \equiv \prod_{i \in S} a^{${2}^{i}} \pmod{m},`} and the right side takes at most ${math`${2}\lfloor \log_{${2}} k \rfloor`} multiplications mod ${mm}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Split the exponent`, text: t`By the law ${math`a^{x + y} = a^{x}a^{y}`}, ${math`a^{k} = a^{\sum_{i \in S} ${2}^{i}} = \prod_{i \in S} a^{${2}^{i}}`}; reducing each factor mod ${mm} keeps the congruence.`, plain: t`For ${math`k = ${13} = ${8} + ${4} + ${1}`}: ${math`a^{${13}} = a^{${8}}a^{${4}}a^{${1}}`}.` },
        { label: t`Each square from the last`, text: t`${math`a^{${2}^{i + ${1}}} = \left(a^{${2}^{i}}\right)^{${2}}`}, so each entry of the chain ${math`a, a^{${2}}, a^{${4}}, \ldots`} is one squaring of the one before.`, why: { q: t`Why is that true?`, a: t`By the law ${math`(a^{x})^{y} = a^{xy}`}: ${math`(a^{${2}^{i}})^{${2}} = a^{${2}^{i} \times ${2}} = a^{${2}^{i + ${1}}}`}.` } },
        { label: t`Count`, text: t`If ${mk} has ${math`L = \lfloor \log_{${2}} k \rfloor + ${1}`} binary digits, the chain needs ${math`L - ${1}`} squarings, and multiplying the ${math`|S| \le L`} chosen entries needs ${math`|S| - ${1}`} more products. In all at most ${math`${2}(L - ${1}) = ${2}\lfloor \log_{${2}} k \rfloor`}.` },
      ],
    },
    {
      kind: 'steps',
      steps: [
        { label: t`Binary`, text: t`To find ${math`${3}^{${13}} \bmod ${7}`}: ${math`${13} = ${computedTex(bits(13))}_{${2}}`}, so ${math`${3}^{${13}} = ${3}^{${8}} \cdot ${3}^{${4}} \cdot ${3}^{${1}}`}.` },
        { label: t`The chain`, text: t`${math`${3}^{${1}} \equiv ${S13[0] as number}`}; square: ${math`${S13[0] as number}^{${2}} = ${(S13[0] as number) ** 2} \equiv ${S13[1] as number}`}; square: ${math`${S13[1] as number}^{${2}} = ${(S13[1] as number) ** 2} \equiv ${S13[2] as number}`}; square: ${math`${S13[2] as number}^{${2}} = ${(S13[2] as number) ** 2} \equiv ${S13[3] as number} \pmod{${7}}`}.` },
        { label: t`Multiply the chosen ones`, text: t`${math`${S13[3] as number} \times ${S13[2] as number} \times ${S13[0] as number} = ${(S13[3] as number) * (S13[2] as number) * (S13[0] as number)} \equiv ${powMod(3, 13, 7)} \pmod{${7}}`}.` },
      ],
    },
    checkFrom(squareAndMultiply, { a: 5, k: 45, m: 13 }, t`${math`${45} = ${computedTex(bits(45))}_{${2}}`}: multiply ${math`${5}^{${32}}, ${5}^{${8}}, ${5}^{${4}}, ${5}^{${1}}`} from the chain ${listOf(squares(5, 45, 13))}.`),

    { kind: 'section', title: t`Why it is fast` },
    { kind: 'p', text: t`For ${math`a^{${K}}`}: ${math`${K} = ${computedTex(bits(K))}_{${2}}`} has ${bits(K).length} digits, ${[...bits(K)].filter((d) => d === '1').length} of them ${1}, so repeated squaring takes ${countMul(K)} multiplications, against ${K - 1} one factor at a time. The gap grows fast: the count grows like ${math`\log k`}, not like ${mk}. A ${300}-digit exponent needs about ${2000} multiplications. This is what makes public-key cryptography, such as Diffie-Hellman, practical.` },
    checkFrom(multiplicationCount, { k: 200 }, t`${math`${200} = ${computedTex(bits(200))}_{${2}}`}: ${bits(200).length - 1} squarings and ${[...bits(200)].filter((d) => d === '1').length - 1} products.`),
    { kind: 'p', text: t`One use, ahead of its own lesson: Fermat's little theorem says ${math`i^{p} \equiv i \pmod{p}`} for every prime ${math`p`}. So if a fast power gives ${math`i^{m} \not\equiv i \pmod{m}`}, then ${mm} is not prime, and you have proved it without finding a factor. Supervision exercise ${2}.${2}.${5} finds ${math`${2}^{${153}} \equiv ${53} \pmod{${153}}`}.` },

    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`You can reduce the exponent modulo ${mm}, as you reduce the base.`, counterexample: t`${math`${2}^{${7}} = ${128} \equiv ${2} \pmod{${7}}`}, but reducing the exponent ${7} to ${0} gives ${math`${2}^{${0}} = ${1}`}. Only the base reduces.` },
    { kind: 'pitfall', claim: t`If ${math`${2}^{m - ${1}} \equiv ${1} \pmod{m}`}, then ${mm} is prime.`, counterexample: t`${math`${2}^{${340}} \equiv ${powMod(2, 340, 341)} \pmod{${341}}`}, yet ${math`${341} = ${11} \times ${31}`}. The Fermat test can prove a number composite, never prime.` },
    { kind: 'pitfall', claim: t`Reducing at the end is as good as reducing at every step.`, counterexample: t`It gives the same answer, but ${math`${2}^{${153}}`} has ${(2n ** 153n).toString().length} digits. Reducing as you go is what keeps the numbers small enough to compute with.` },
    { kind: 'takeaway', text: t`Write the exponent in binary, square and reduce down the chain, and multiply the chosen squares: about ${math`${2}\log_{${2}} k`} small multiplications.` },
  ],
  examples: [
    { ...workedCambridge(sheet225), examiner: t`The examiner looks for each reduction modulo ${153} shown, and the conclusion that ${153} is composite stated with its reason.` },
    worked(squareAndMultiply, { a: 7, k: 100, m: 33 }, t`${math`${7}^{${100}} \bmod ${33}`}`),
    worked(squareChain, { a: 5, m: 23, j: 4 }, t`The chain of squares of ${5} mod ${23}`),
  ],
  generators: [squareAndMultiply, multiplicationCount, squareChain],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['repeated-squaring'],
  cambridge: withUses([totd341, btw341, sheet225why, costWhy], {
    'sheet-2-2-5-flt': { sections: ['Squaring instead of counting'], note: t`A power modulo a composite by known congruences, and why Fermat is not contradicted` },
    'squaring-cost': { sections: ['Why it is fast'], note: t`Why repeated squaring needs few multiplications` },
    'notes-131-btw-witness': { sections: ['Squaring instead of counting'], note: t`A witness that a number is composite` },
  }),
  // The CST write-ups first. The 341 check is dropped: its prompt states the answer.
  gate: ['sheet-2-2-5-flt', 'squaring-cost', 'notes-131-btw-witness'],
  recall: [
    { front: t`Repeated squaring for ${math`a^{k} \bmod m`}.`, back: t`Write ${mk} in binary; square down the chain ${math`a, a^{${2}}, a^{${4}}, \ldots`}, reducing each time; multiply the entries the ${1}s pick out.` },
    { front: t`How many multiplications does repeated squaring need?`, back: t`At most ${math`${2}\lfloor \log_{${2}} k \rfloor`}: one squaring per binary digit after the first, one product per further ${1}.` },
    { front: t`What may be reduced modulo ${mm} in ${math`a^{k}`}?`, back: t`The base, and every intermediate result; never the exponent.` },
  ],
  proofOrder: [{
    title: t`Repeated squaring works`,
    steps: [
      t`Write ${mk} as a sum of powers of ${2}, from its binary digits.`,
      t`So ${math`a^{k}`} is the product of the matching ${math`a^{${2}^{i}}`}.`,
      t`Each ${math`a^{${2}^{i + ${1}}}`} is the square of ${math`a^{${2}^{i}}`}.`,
      t`Congruence respects products, so reduce after every multiplication.`,
    ],
  }],
};
