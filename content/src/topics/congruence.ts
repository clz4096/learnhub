/**
 * num.congruence: a ≡ b (mod m) means m | a - b, which is the same as a and b leaving the
 * same remainder. The lesson follows the CST notes (Definition 14 and Example 15 on
 * printed page 60, Proposition 16, Proposition 24 on the unique representative from 0 to
 * m - 1) and Book of Proof Section 5.2 (Definition 5.1, Example 5.1, and the propositions
 * on squares and multiples). The problems add supervision exercises 2.1.1 and 3.2.4 with
 * their 2023-24 official solutions and Book of Proof Chapter 5, exercises 21 and 32.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { int, pick, sample } from '../math';
import { gcd, mod } from '../numbers';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { join, math, paren, t, type Span } from '../rich';
import { worked, workedCambridge, type TopicContent } from '../topic';

const [mm, mk] = [math`m`, math`k`];
const cong = (a: number, b: number, m: number): Span => math`${a} \equiv ${b} \pmod{${m}}`;
const isCong = (a: number, b: number, m: number): boolean => (a - b) % m === 0;

// ---------------------------------------------------------------- which are congruent

interface WhichP { a: number; m: number; xs: readonly number[] }
const ids = (xs: readonly number[], f: (x: number) => boolean): string[] => xs.flatMap((x, i) => (f(x) ? [`x${i}`] : []));
const truncSame = (x: number, a: number, m: number): boolean => x % m === a % m;
const absSame = (x: number, a: number, m: number): boolean => Math.abs(x) % m === Math.abs(a) % m;

const whichCongruent = generator<WhichP>({
  id: 'which-congruent',
  skill: 'Decide which integers, including negative ones, are congruent to a given number modulo m, from the definition m | x - a.',
  params: (rng) => {
    for (;;) {
      const m = int(rng, 3, 11);
      const a = int(rng, 1, 30);
      const xs = [a + m * int(rng, 1, 5), a - m * int(rng, 2, 9), a + m * int(rng, -6, 6) + int(rng, 1, m - 1), -a + m * int(rng, 0, 4), a - m * int(rng, 5, 12) + int(rng, 1, m - 1)];
      const shuffled = sample(rng, [...new Set(xs)], new Set(xs).size);
      const right = ids(shuffled, (x) => isCong(x, a, m)).join();
      if (shuffled.length >= 4 && ids(shuffled, (x) => truncSame(x, a, m)).join() !== right && ids(shuffled, (x) => absSame(x, a, m)).join() !== right) return { a, m, xs: shuffled };
    }
  },
  sane: ({ xs }) => (xs.length >= 4 ? null : 'out of range'),
  problem: ({ a, m, xs }) => {
    const options: ChoiceOption[] = xs.map((x, i) => ({ id: `x${i}`, label: [math`${x}`] }));
    return {
      prompt: t`Which of ${join(xs.map((x) => [math`${x}`]), ', ')} are congruent to ${a} modulo ${m}? Choose all that are.`,
      answer: { kind: 'choice', options, correct: ids(xs, (x) => isCong(x, a, m)) },
      solution: [
        t`${math`x \equiv ${a} \pmod{${m}}`} means ${math`${m} \mid x - ${a}`}. Compute each difference:`,
        join(xs.map((x) => [math`${x} - ${a} = ${x - a}`, ...t` (${isCong(x, a, m) ? t`a multiple of ${m}` : t`not a multiple of ${m}`})`]), '; '),
        t`Equivalently, each is congruent when it leaves the same remainder as ${a}, which is ${mod(a, m)}; for a negative number the remainder is still between ${0} and ${m - 1}: ${math`[${xs.find((x) => x < 0) ?? -1}]_{${m}} = ${mod(xs.find((x) => x < 0) ?? -1, m)}`}.`,
      ],
    };
  },
  solve: ({ a, m, xs }) => xs.flatMap((x, i) => (Array.from({ length: 401 }, (_, j) => j - 200).some((k) => x - a === k * m) ? [`x${i}`] : [])),
  misconceptions: ({ a, m, xs }): Misconception[] => [
    { response: ids(xs, (x) => truncSame(x, a, m)), why: t`A remainder that comes out negative, as with the % of many programming languages, hides some congruences. Use the definition: is ${math`x - ${a}`} a multiple of ${m}?` },
    { response: ids(xs, (x) => absSame(x, a, m)), why: t`Dropping the minus sign changes the number: ${math`-x`} and ${math`x`} are usually not congruent. Use ${math`${m} \mid x - ${a}`}.` },
  ],
});

// ---------------------------------------------------------------- the witness k

interface KP { a: number; b: number; m: number }

const witnessK = generator<KP>({
  id: 'witness-k',
  skill: 'Unfold the definition: a ≡ b (mod m) means a - b = k m for an integer k, and find that k.',
  params: (rng) => {
    for (;;) {
      const m = int(rng, 3, 12);
      const b = int(rng, -20, 40);
      const k = pick(rng, [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7]);
      const a = b + k * m;
      if (a !== b) return { a, b, m };
    }
  },
  sane: ({ a, b, m }) => (a !== b && (a - b) % m === 0 ? null : 'out of range'),
  problem: ({ a, b, m }) => ({
    prompt: t`${cong(a, b, m)}. By the definition, there is an integer ${mk} with ${math`${a} - ${paren(b)} = k \times ${m}`}. Find ${mk}.`,
    answer: { kind: 'exact', expected: String((a - b) / m) },
    solution: [
      t`${math`${a} - ${paren(b)} = ${a - b}`}, and ${math`${a - b} = ${paren((a - b) / m)} \times ${m}`}, so ${math`k = ${(a - b) / m}`}.`,
    ],
  }),
  solve: ({ a, b, m }) => String(Array.from({ length: 41 }, (_, j) => j - 20).find((k) => a - b === k * m)),
  misconceptions: ({ a, b, m }): Misconception[] => [
    { response: String((b - a) / m), why: t`The order matters: ${math`a - b`}, here ${math`${a} - ${paren(b)}`}, not ${math`b - a`}.` },
    { response: String(a - b), why: t`That is ${math`a - b`} itself. ${mk} is what ${m} is multiplied by to give it.` },
  ],
});

// ---------------------------------------------------------------- cancelling a factor

interface CanP { m: number; n: number }

const cancelFactor = generator<CanP>({
  id: 'cancel-factor',
  skill: 'Cancel a common factor n from n i ≡ n j (mod m): the modulus becomes m / gcd(m, n), as in supervision exercise 3.2.4.',
  params: (rng) => {
    for (;;) {
      const m = int(rng, 8, 60);
      const n = int(rng, 2, 30);
      const g = gcd(m, n);
      if (g > 1 && g !== m && g * g !== m && n % m !== 0) return { m, n };
    }
  },
  sane: ({ m, n }) => { const g = gcd(m, n); return g > 1 && g !== m && g * g !== m ? null : 'out of range'; },
  problem: ({ m, n }) => {
    const g = gcd(m, n);
    return {
      prompt: t`For integers ${math`i`} and ${math`j`}, ${math`${n} i \equiv ${n} j \pmod{${m}}`} holds exactly when ${math`i \equiv j \pmod{d}`}. What is ${math`d`}?`,
      answer: { kind: 'exact', expected: String(m / g) },
      solution: [
        t`Exercise ${3}.${2}.${4}: ${math`n i \equiv n j \pmod{m}`} if and only if ${math`i \equiv j \pmod{m / \gcd(m, n)}`}.`,
        t`Here ${math`\gcd(${m}, ${n}) = ${g}`}, so ${math`d = ${m} / ${g} = ${m / g}`}. You may cancel ${n} only by also dividing the modulus by what ${n} shares with it.`,
      ],
    };
  },
  solve: ({ m, n }) => {
    // The smallest d >= 1 such that n i ≡ n j (mod m) exactly when d | i - j: test the differences 0 to 2m.
    const works = (diff: number): boolean => (n * diff) % m === 0;
    for (let d = 1; d <= m; d++) if (Array.from({ length: 2 * m + 1 }, (_, x) => x).every((x) => works(x) === (x % d === 0))) return String(d);
    return 'none';
  },
  misconceptions: ({ m, n }): Misconception[] => [
    { response: String(m), why: t`Cancelling ${n} without changing the modulus is only allowed when ${n} and ${m} are coprime. Here they share ${gcd(m, n)}.` },
    { response: String(gcd(m, n)), why: t`The modulus is divided by the gcd: ${math`m / \gcd(m, n)`}, not the gcd itself.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const EX15: readonly [number, number][] = [[18, 2], [2, -2], [18, -2]];
const notes15 = auto({
  id: 'notes-60-example-15',
  source: cite('cst-dm-notes', 'printed page 60, Example 15', true),
  title: t`The notes' first congruences`,
  prompt: t`Example ${15} of the CST notes: ${cong(18, 2, 4)}, ${cong(2, -2, 4)}, and ${cong(18, -2, 4)}. For each, find the integer ${mk} with ${math`a - b = ${4}k`} that the definition asks for.`,
  answer: { kind: 'table', cell: 'exact', columns: [t`congruence`, t`${mk}`], rows: EX15.map(([a, b]) => [[cong(a, b, 4)], null]), expected: EX15.map(([a, b]) => String((a - b) / 4)) },
  solution: [
    t`${math`${18} - ${2} = ${16} = ${4} \times ${4}`}; ${math`${2} - (-${2}) = ${4} = ${4} \times ${1}`}; ${math`${18} - (-${2}) = ${20} = ${4} \times ${5}`}.`,
    t`So the witnesses are ${4}, ${1}, and ${5}. The third follows from the first two by transitivity: ${math`${16} + ${4} = ${20}`}.`,
  ],
  reference: EX15.map(([a, b]) => String((a - b) / 4)),
  verify: () => same('each difference divided by 4', EX15.map(([a, b]) => (a - b) % 4 === 0 && (a - b) / 4).join(), '4,1,5'),
  misconceptions: [{ response: ['4', '0', '4'], why: t`${math`${2} - (-${2}) = ${4}`}, not ${0}: subtracting a negative number adds.` }],
});

const EX51: readonly (readonly [number, number, number])[] = [[9, 1, 4], [6, 10, 4], [14, 8, 4], [20, 4, 8], [17, -4, 3]];
const bop51 = auto({
  id: 'bop-5-2-example',
  source: cite('bop', 'Section 5.2, Example 5.1', true),
  title: t`Which are congruences?`,
  prompt: t`Which of these are true? ${join(EX51.map(([a, b, n]) => [cong(a, b, n)]), '; ')}. Choose all that are.`,
  answer: { kind: 'choice', options: EX51.map(([a, b, n], i) => ({ id: `e${i}`, label: [cong(a, b, n)] })), correct: EX51.flatMap(([a, b, n], i) => (isCong(a, b, n) ? [`e${i}`] : [])) },
  solution: [
    t`Check whether the modulus divides the difference: ${math`${9} - ${1} = ${8}`}, ${math`${6} - ${10} = -${4}`}, ${math`${14} - ${8} = ${6}`}, ${math`${20} - ${4} = ${16}`}, ${math`${17} - (-${4}) = ${21}`}.`,
    t`Only ${math`${14} \equiv ${8} \pmod{${4}}`} fails: ${4} does not divide ${6}. In remainders: ${14} leaves ${2} and ${8} leaves ${0}.`,
  ],
  reference: EX51.flatMap(([a, b, n], i) => (isCong(a, b, n) ? [`e${i}`] : [])),
  verify: () => same('remainders compared', EX51.map(([a, b, n]) => mod(a, n) === mod(b, n)).join(), 'true,true,false,true,true'),
  misconceptions: [{ response: ['e0', 'e2', 'e3'], why: t`A negative difference counts: ${math`${6} - ${10} = -${4} = ${4} \times (-${1})`}; and ${math`${17} - (-${4}) = ${21}`} is a multiple of ${3}.` }],
  official: { source: cite('bop', 'Section 5.2, Example 5.1'), answer: ['e0', 'e1', 'e3', 'e4'], agrees: true },
});

const sheet324 = auto({
  id: 'sheet-3-2-10-b-reduce',
  source: cite('cst-dm-sw1', 'Exercises 3, 3.2.10(b) with 3.2.4', true),
  title: t`Reducing a congruence`,
  prompt: t`The official solution to exercise ${3}.${2}.${10}(b) reduces ${math`${12} y \equiv ${30} \pmod{${54}}`} by exercise ${3}.${2}.${4}: dividing by ${6}, which divides ${12}, ${30}, and ${54}, it becomes ${math`${2} y \equiv ${5} \pmod{d}`}. What is ${math`d`}?`,
  answer: { kind: 'exact', expected: '9' },
  solution: [
    t`${math`${12} y - ${30} = ${54} k`} for an integer ${mk} exactly when ${math`${2} y - ${5} = ${9} k`}: divide the equation by ${6}.`,
    t`So ${math`d = ${54} / ${6} = ${9}`}: the modulus is divided too.`,
  ],
  reference: '9',
  verify: () => same('the solutions y from 0 to 53 of both congruences', Array.from({ length: 54 }, (_, y) => y).filter((y) => (12 * y - 30) % 54 === 0).join(), Array.from({ length: 54 }, (_, y) => y).filter((y) => (2 * y - 5) % 9 === 0).join()),
  misconceptions: [{ response: '54', why: t`Dividing ${math`${12}y`} and ${30} by ${6} without dividing ${54} changes the solutions: ${math`y = ${7}`} solves ${math`${2}y \equiv ${5} \pmod{${9}}`} but ${math`${2} \times ${7} \not\equiv ${5} \pmod{${54}}`}.` }],
  official: { source: cite('cst-dm-sols-2324-3', '3.2.10(b)'), answer: '9', agrees: true },
});

const sheet211 = supervision({
  id: 'sheet-2-1-1',
  source: cite('cst-dm-sw1', 'Exercises 2, 2.1.1'),
  title: t`Congruence is an equivalence relation`,
  prompt: t`Let ${math`i, j, k`} be integers and ${mm} a positive integer. Show: (a) ${math`i \equiv i \pmod{m}`}; (b) ${math`i \equiv j \pmod{m} \Rightarrow j \equiv i \pmod{m}`}; (c) ${math`i \equiv j \pmod{m} \land j \equiv k \pmod{m} \Rightarrow i \equiv k \pmod{m}`}. Say which facts about divisibility each part uses.`,
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-2', '2.1.1'),
});
const sheet324proof = supervision({
  id: 'sheet-3-2-4',
  source: cite('cst-dm-sw1', 'Exercises 3, 3.2.4'),
  title: t`Cancelling in a congruence`,
  prompt: t`Prove that for all positive integers ${math`m, n`} and integers ${math`i, j`}: ${math`n i \equiv n j \pmod{m} \iff i \equiv j \pmod{m / \gcd(m, n)}`}. You may use Euclid's theorem: if ${math`k \mid ab`} and ${math`\gcd(k, a) = ${1}`} then ${math`k \mid b`}.`,
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-3', '3.2.4'),
});
const bop521 = supervision({
  id: 'bop-5-21',
  source: cite('bop', 'Chapter 5, exercise 21'),
  title: t`Cubes of congruent numbers`,
  prompt: t`Let ${math`a, b \in \mathbb{Z}`} and ${math`n \in \mathbb{N}`}. Prove that if ${math`a \equiv b \pmod{n}`}, then ${math`a^{${3}} \equiv b^{${3}} \pmod{n}`}. Book of Proof proves the version for squares by multiplying ${math`a - b = nc`} by ${math`a + b`}; what do you multiply by here?`,
  writeUp: 'proof',
  official: cite('bop', 'Solutions, Chapter 5, exercise 21'),
});
const bop532 = supervision({
  id: 'bop-5-32',
  source: cite('bop', 'Chapter 5, exercise 32'),
  title: t`Congruent numbers have the same remainder`,
  prompt: t`Prove that if ${math`a \equiv b \pmod{n}`}, then ${math`a`} and ${math`b`} have the same remainder when divided by ${math`n`}. (Book of Proof proves the converse in Section ${5}.${2}; the CST notes' version is Proposition ${58}.)`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

export const congruence: TopicContent = {
  topicId: 'num.congruence',
  goal: t`Use ${math`a \equiv b \pmod{m}`}, defined as ${math`m \mid a - b`}, and its meaning: ${math`a`} and ${math`b`} leave the same remainder on division by ${mm}.`,
  lesson: [
    { kind: 'rule', text: t`Fix a positive integer ${mm}. Integers ${math`a`} and ${math`b`} are [[congruent-mod|congruent modulo]] ${mm}, written ${math`a \equiv b \pmod{m}`}, when ${math`m \mid (a - b)`}.` },
    { kind: 'p', text: t`The CST notes' first examples: ${cong(18, 2, 4)}, ${cong(2, -2, 4)}, and ${cong(18, -2, 4)}; the differences are ${16}, ${4}, and ${20}. Congruence modulo ${2} is parity: ${math`n`} is even when ${math`n \equiv ${0} \pmod{${2}}`} and odd when ${math`n \equiv ${1} \pmod{${2}}`} (Proposition ${16}).` },
    { kind: 'p', text: t`In practice ${math`a \equiv b \pmod{m}`} means ${math`a`} and ${math`b`} have the same remainder: if ${math`a = km + r`} and ${math`b = lm + r`}, then ${math`a - b = (k - l)m`}; and conversely. With negative numbers use the remainder from ${0} to ${math`m - ${1}`}: ${math`-${4}`} leaves ${mod(-4, 3)} on division by ${3}, the same as ${17}, so ${cong(17, -4, 3)}.` },
    { kind: 'p', text: t`Each number is congruent to exactly one of ${math`${0}, ${1}, \ldots, m - ${1}`} (Proposition ${24} of the notes): if two of them, ${math`x`} and ${math`y`}, were congruent, then ${math`x - y`} would be a multiple of ${mm} strictly between ${math`-m`} and ${mm}, so ${0}.` },
    { kind: 'p', text: t`Congruence behaves like equality: it is reflexive, symmetric, and transitive (exercise ${2}.${1}.${1}). One difference: you cannot always cancel. ${math`${2} \times ${3} \equiv ${2} \times ${1} \pmod{${4}}`}, yet ${math`${3} \not\equiv ${1} \pmod{${4}}`}. Cancelling ${mk} divides the modulus by ${math`\gcd(m, k)`} (exercise ${3}.${2}.${4}).` },
  ],
  examples: [
    workedCambridge(notes15),
    worked(witnessK, { a: 23, b: -5, m: 7 }, t`The witness for ${cong(23, -5, 7)}`),
    worked(cancelFactor, { m: 54, n: 12 }, t`Cancelling ${12} modulo ${54}`),
  ],
  generators: [whichCongruent, witnessK, cancelFactor],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['congruent-mod'],
  cambridge: [bop51, sheet324, sheet211, sheet324proof, bop521, bop532],
  gate: ['sheet-3-2-10-b-reduce', 'sheet-2-1-1', 'sheet-3-2-4'],
};
