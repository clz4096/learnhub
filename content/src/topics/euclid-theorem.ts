/**
 * num.euclid-theorem: if k | m n and gcd(k, m) = 1 then k | n; so a prime dividing a
 * product divides a factor. The lesson follows the CST notes (printed pages 238 to 243:
 * Definition 82, coprimality; Theorem 83, proved from the linearity of gcd; Corollary 84,
 * the prime form; the proof of Fermat's little theorem, part 2; Corollary 85) and Book of
 * Proof Chapter 7, exercise 29 (the Bezout proof). The problems are supervision exercises
 * 3.1.6, 3.2.2, 3.2.7(c), and 3.3.1 with their 2023-24 official solutions, and Book of
 * Proof's exercises 5 and 6 for Section 11.5.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { int, pick, upTo } from '../math';
import { factorise, gcd, isPrime, mod, phi, primesTo } from '../numbers';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { math, setOf, t } from '../rich';
import { worked, workedCambridge, workedProof, type TopicContent } from '../topic';

const [mk, mm, mn] = [math`k`, math`m`, math`n`];
const big = (v: { num: bigint; den: bigint } | undefined): number | null => (v === undefined || v.den !== 1n ? null : Number(v.num));

// ---------------------------------------------------------------- what k must divide

interface CanP { k: number; m: number }

const cancelCoprime = generator<CanP>({
  id: 'cancel-coprime',
  skill: 'Use Euclid\'s theorem on k | m x: divide k by gcd(k, m), and the coprime part must divide x.',
  params: (rng) => {
    for (;;) {
      const k = int(rng, 6, 90);
      const m = int(rng, 4, 90);
      const g = gcd(k, m);
      if (g > 1 && g < k && g * g !== k) return { k, m };
    }
  },
  sane: ({ k, m }) => { const g = gcd(k, m); return g > 1 && g < k && g * g !== k ? null : 'out of range'; },
  problem: ({ k, m }) => {
    const g = gcd(k, m);
    return {
      prompt: t`What is the smallest positive integer ${math`x`} such that ${math`${k} \mid ${m}x`}?`,
      answer: { kind: 'exact', expected: String(k / g) },
      solution: [
        t`${math`\gcd(${k}, ${m}) = ${g}`}, and ${math`${k} \mid ${m}x`} exactly when ${math`${k / g} \mid ${m / g} x`} (divide everything by ${g}).`,
        t`Now ${math`\gcd(${k / g}, ${m / g}) = ${1}`}, so by Euclid's theorem ${math`${k / g} \mid x`}. The smallest such ${math`x`} is ${k / g}: indeed ${math`${m} \times ${k / g} = ${m * (k / g)} = ${(m * (k / g)) / k} \times ${k}`}.`,
      ],
    };
  },
  solve: ({ k, m }) => String(upTo(k).find((x) => (m * x) % k === 0)),
  misconceptions: ({ k, m }): Misconception[] => [
    { response: String(k), why: t`${k} works, but ${k} and ${m} share the factor ${gcd(k, m)}, so a smaller ${math`x`} does too. Euclid's theorem needs the coprime part, ${math`${k} / \gcd(${k}, ${m})`}.` },
    { response: String(gcd(k, m)), why: t`That is ${math`\gcd(${k}, ${m})`}, the part of ${k} that ${m} already supplies. ${math`x`} must supply the rest, ${k / gcd(k, m)}.` },
  ],
});

// ---------------------------------------------------------------- square roots of one

interface SqP { m: number }
const roots = (m: number): number[] => upTo(m).map((x) => x - 1).filter((x) => (x * x) % m === 1 % m);

const squareRootsOfOne = generator<SqP>({
  id: 'square-roots-of-one',
  skill: 'Count the solutions of x^2 ≡ 1 (mod m): exactly two when m is an odd prime (exercise 3.1.6, by Euclid\'s theorem), possibly more otherwise.',
  params: (rng) => ({ m: pick(rng, [5, 7, 11, 13, 9, 15, 21, 8, 12, 16, 24, 35, 17, 25, 33, 40]) }),
  sane: ({ m }) => (m >= 5 ? null : 'out of range'),
  problem: ({ m }) => {
    const r = roots(m);
    return {
      prompt: t`How many ${math`x`} in ${math`\{${0}, ${1}, \ldots, ${m - 1}\}`} satisfy ${math`x^{${2}} \equiv ${1} \pmod{${m}}`}?`,
      answer: { kind: 'exact', expected: String(r.length) },
      solution: isPrime(m)
        ? [
          t`${m} is prime. ${math`x^{${2}} \equiv ${1}`} means ${math`${m} \mid (x - ${1})(x + ${1})`}, so by Euclid's theorem ${math`${m} \mid x - ${1}`} or ${math`${m} \mid x + ${1}`}: ${math`x = ${1}`} or ${math`x = ${m - 1}`}.`,
          t`So there are exactly ${2} solutions.`,
        ]
        : [
          t`${m} is not prime, so the argument for primes fails: ${m} can divide ${math`(x - ${1})(x + ${1})`} without dividing either factor.`,
          t`Checking every ${math`x`}: the solutions are ${setOf(r)}, so there are ${r.length}.`,
        ],
    };
  },
  solve: ({ m }) => {
    let c = 0;
    for (let x = 0; x < m; x++) if (((x * x) - 1) % m === 0) c++;
    return String(c);
  },
  misconceptions: ({ m }): Misconception[] => [
    { response: '1', why: t`${math`x = ${m - 1}`} works too: ${math`(-${1})^{${2}} = ${1}`}.` },
    { response: '2', why: t`Exactly two solutions is guaranteed only for an odd prime modulus. For ${m}, check every ${math`x`}: ${m} may divide ${math`(x - ${1})(x + ${1})`} without dividing a factor.` },
    { response: String(phi(m)), why: t`That counts the ${math`x`} with an inverse. Being its own inverse is rarer: ${math`x \cdot x \equiv ${1}`}.` },
  ],
});

// ---------------------------------------------------------------- zero divisors

interface ZdP { m: number }

const zeroDivisors = generator<ZdP>({
  id: 'zero-divisors',
  skill: 'For a composite m, find nonzero a, b in Z_m with a b = 0; for a prime there are none, by Euclid\'s theorem.',
  params: (rng) => ({ m: pick(rng, [6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 21, 22, 25, 26, 27, 33, 35]) }),
  sane: ({ m }) => (!isPrime(m) && m >= 6 ? null : 'out of range'),
  problem: ({ m }) => {
    const [p] = factorise(m)[0] as [number, number];
    return {
      prompt: t`Find ${math`a`} and ${math`b`} in ${math`\{${1}, \ldots, ${m - 1}\}`} with ${math`a b \equiv ${0} \pmod{${m}}`}.`,
      answer: {
        kind: 'witness', count: 2, names: ['a', 'b'], example: `a = ${p}, b = ${m / p}`,
        check: ([va, vb]) => {
          const [a, b] = [big(va), big(vb)];
          if (a === null || b === null) return 'Give two integers.';
          if (a < 1 || a > m - 1 || b < 1 || b > m - 1) return `Both must be between 1 and ${m - 1}.`;
          return (a * b) % m === 0 ? null : `${a} × ${b} = ${a * b}, which is not a multiple of ${m}.`;
        },
      },
      solution: [
        t`${m} is composite: ${math`${m} = ${p} \times ${m / p}`}. So ${math`a = ${p}`} and ${math`b = ${m / p}`}, both nonzero in ${math`\mathbb{Z}_{${m}}`}, multiply to ${math`${m} \equiv ${0}`}.`,
        t`For a prime ${math`p`} this is impossible: ${math`p \mid ab`} forces ${math`p \mid a`} or ${math`p \mid b`} by Euclid's theorem.`,
      ],
    };
  },
  solve: ({ m }) => {
    for (let a = 1; a < m; a++) for (let b = 1; b < m; b++) if ((a * b) % m === 0) return `a = ${a}, b = ${b}`;
    return 'none';
  },
  misconceptions: ({ m }): Misconception[] => {
    const [p] = factorise(m)[0] as [number, number];
    return [
      { response: `a = 1, b = ${m - 1}`, why: t`${math`${1} \times ${m - 1} \equiv -${1}`}, not ${0}. Both factors must share a prime with ${m}.` },
      { response: `a = ${m - 1}, b = ${m - 1}`, why: t`${math`(-${1})(-${1}) = ${1}`}. Use factors of ${m}.` },
      { response: `a = ${p}, b = ${p}`, why: t`${math`${p} \times ${p} = ${p * p}`}${(p * p) % m === 0 ? t`` : t`, which is not a multiple of ${m}`}: the other factor must supply what ${p} lacks, ${m / p}.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

const theorem83 = workedProof({
  title: t`Euclid's theorem from the linearity of gcd`,
  prompt: t`Theorem ${83} of the CST notes: for positive integers ${math`k, m, n`}, if ${math`k \mid mn`} and ${math`\gcd(k, m) = ${1}`} then ${math`k \mid n`}.`,
  steps: [
    t`Let ${math`k, m, n`} be positive integers, and assume (i) ${math`k \mid mn`} and (ii) ${math`\gcd(k, m) = ${1}`}. By (i), let ${math`l`} be an integer with (iii) ${math`k l = m n`}.`,
    t`Then ${math`n = \gcd(k, m) \cdot n`} by (ii), ${math`= \gcd(kn, mn)`} by linearity (Lemma ${81}), ${math`= \gcd(kn, kl)`} by (iii), ${math`= k \cdot \gcd(n, l)`} by linearity again.`,
    t`So ${mn} is ${mk} times an integer: ${math`k \mid n`}. The proof needs no extended algorithm, which is why the notes can prove it first.`,
  ],
  answer: t`${math`k \mid mn`} and ${math`\gcd(k, m) = ${1}`} imply ${math`k \mid n`}.`,
  source: cite('cst-dm-notes', 'printed pages 238 and 239, Theorem 83'),
});

const primes5 = primesTo(400).filter((p) => p > 3);
const g24 = primes5.reduce((g, p) => gcd(g, p * p - 1), 0);
const sheet327c = auto({
  id: 'sheet-3-2-7-c',
  source: cite('cst-dm-sw1', 'Exercises 3, 3.2.7(c)', true),
  title: t`${math`p^{${2}} - ${1}`} for primes above ${3}`,
  prompt: t`Exercise ${3}.${2}.${7}: if ${math`p`} is a prime greater than ${3}, then ${math`p^{${2}} - ${1}`} is divisible by a certain number. What is the largest number that divides ${math`p^{${2}} - ${1}`} for every prime ${math`p > ${3}`}?`,
  answer: { kind: 'exact', expected: String(g24) },
  solution: [
    t`${math`p`} is not divisible by ${3}, so ${math`p^{${2}} \equiv ${1} \pmod{${3}}`}; and ${math`p`} is odd, so ${math`p^{${2}} \equiv ${1} \pmod{${8}}`}. Thus ${math`${3} \mid p^{${2}} - ${1}`} and ${math`${8} \mid p^{${2}} - ${1}`}.`,
    t`Since ${math`\gcd(${3}, ${8}) = ${1}`}, exercise ${3}.${2}.${2} (a consequence of Euclid's theorem) gives ${math`${24} \mid p^{${2}} - ${1}`}. Nothing larger works: ${math`${5}^{${2}} - ${1} = ${24}`}.`,
  ],
  reference: String(g24),
  verify: () => same('gcd of p^2 - 1 over primes 5 to 397', g24, 24),
  misconceptions: [{ response: '8', why: t`${8} divides it, and so does ${3}; they are coprime, so their product ${24} does.` }],
  official: { source: cite('cst-dm-sols-2324-3', '3.2.7(c)'), answer: '24', agrees: true },
});

const YESNO: ChoiceOption[] = [{ id: 'yes', label: t`Yes, always` }, { id: 'no', label: t`No` }];
const bop1155 = auto({
  id: 'bop-11-5-5',
  source: cite('bop', 'Exercises for Section 11.5, exercise 5'),
  title: t`No zero divisors in ${math`\mathbb{Z}_{${5}}`}`,
  prompt: t`Suppose ${math`[a], [b] \in \mathbb{Z}_{${5}}`} and ${math`[a] \cdot [b] = [${0}]`}. Is it necessarily true that ${math`[a] = [${0}]`} or ${math`[b] = [${0}]`}?`,
  answer: { kind: 'choice', options: YESNO, correct: 'yes' },
  solution: [
    t`In the multiplication table of ${math`\mathbb{Z}_{${5}}`}, ${math`[${0}]`} appears only in the row and column of ${math`[${0}]`}. Behind it: ${5} is prime, so ${math`${5} \mid ab`} forces ${math`${5} \mid a`} or ${math`${5} \mid b`} (Euclid's theorem).`,
  ],
  reference: 'yes',
  verify: () => same('every pair in Z_5', upTo(4).every((a) => upTo(4).every((b) => (a * b) % 5 !== 0)), true),
  misconceptions: [{ response: 'no', why: t`Check the table: no two nonzero elements of ${math`\mathbb{Z}_{${5}}`} multiply to ${0}, because ${5} is prime.` }],
  official: { source: cite('bop', 'Solutions, Section 11.5, exercise 5'), answer: 'yes', agrees: true },
});

const bop1156 = auto({
  id: 'bop-11-5-6',
  source: cite('bop', 'Exercises for Section 11.5, exercise 6', true),
  title: t`Zero divisors in ${math`\mathbb{Z}_{${6}}`}`,
  prompt: t`Book of Proof asks whether ${math`[a] \cdot [b] = [${0}]`} in ${math`\mathbb{Z}_{${6}}`} forces ${math`[a] = [${0}]`} or ${math`[b] = [${0}]`}. It does not: give ${math`a`} and ${math`b`} in ${math`\{${1}, \ldots, ${5}\}`} with ${math`[a][b] = [${0}]`}.`,
  answer: {
    kind: 'witness', count: 2, names: ['a', 'b'], example: 'a = 2, b = 3',
    check: ([va, vb]) => {
      const [a, b] = [big(va), big(vb)];
      if (a === null || b === null || a < 1 || a > 5 || b < 1 || b > 5) return 'Give a and b between 1 and 5.';
      return (a * b) % 6 === 0 ? null : `[${a}][${b}] = [${mod(a * b, 6)}], not [0].`;
    },
  },
  solution: [t`${math`[${2}][${3}] = [${6}] = [${0}]`}; so do ${math`[${3}][${4}]`} and ${math`[${4}][${3}]`}. ${6} is not prime, so Euclid's theorem does not apply. In ${math`\mathbb{Z}_{${7}}`}, as in ${math`\mathbb{Z}_{${5}}`}, there are no such pairs.`],
  reference: 'a = 2, b = 3',
  verify: () => same('every pair in Z_6 and Z_7', [upTo(5).flatMap((a) => upTo(5).filter((b) => (a * b) % 6 === 0).map((b) => `${a}${b}`)).join(' '), upTo(6).some((a) => upTo(6).some((b) => (a * b) % 7 === 0))].join(), '23 32 34 43,false'),
  misconceptions: [{ response: 'a = 2, b = 2', why: t`${math`[${2}][${2}] = [${4}]`}. The factors must supply both primes of ${6}: ${2} and ${3}.` }],
});

const sheet316 = supervision({
  id: 'sheet-3-1-6',
  source: cite('cst-dm-sw1', 'Exercises 3, 3.1.6'),
  title: t`Square roots of one modulo a prime`,
  prompt: t`Prove that for all integers ${mn} and primes ${math`p`}, if ${math`n^{${2}} \equiv ${1} \pmod{p}`} then ${math`n \equiv ${1}`} or ${math`n \equiv -${1} \pmod{p}`}. Show by an example that it fails for some composite modulus.`,
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-3', '3.1.6'),
});
const sheet322 = supervision({
  id: 'sheet-3-2-2',
  source: cite('cst-dm-sw1', 'Exercises 3, 3.2.2'),
  title: t`Coprime divisors multiply`,
  prompt: t`Let ${mm} and ${mn} be positive integers with ${math`\gcd(m, n) = ${1}`}. Prove that for every natural number ${mk}, ${math`m \mid k \land n \mid k \iff mn \mid k`}. Then give a counterexample when ${math`\gcd(m, n) \ne ${1}`}.`,
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-3', '3.2.2'),
});
const sheet331 = supervision({
  id: 'sheet-3-3-1',
  source: cite('cst-dm-sw1', 'Exercises 3, 3.3.1'),
  title: t`From a square to a divisor`,
  prompt: t`Let ${math`a`} and ${math`b`} be natural numbers such that ${math`a^{${2}} \mid b(b + a)`}. Prove that ${math`a \mid b`}. Hint: for positive ${math`a, b`}, put ${math`a_{${0}} = a / \gcd(a, b)`} and ${math`b_{${0}} = b / \gcd(a, b)`}, and show ${math`a_{${0}} = ${1}`}.`,
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-3', '3.3.1'),
});
const bop729 = supervision({
  id: 'bop-7-29',
  source: cite('bop', 'Chapter 7, exercise 29'),
  title: t`Euclid's theorem by Bezout`,
  prompt: t`Prove: if ${math`a \mid bc`} and ${math`\gcd(a, b) = ${1}`}, then ${math`a \mid c`}, using Proposition ${7}.${1} (${math`\gcd(a, b) = ax + by`} for some integers). Compare with the notes' proof by the linearity of gcd: which needs more machinery?`,
  writeUp: 'proof',
  official: cite('bop', 'Solutions, Chapter 7, exercise 29'),
});

// ---------------------------------------------------------------- lesson

export const euclidTheorem: TopicContent = {
  topicId: 'num.euclid-theorem',
  goal: t`Prove and use Euclid's theorem: if ${math`k \mid mn`} and ${math`\gcd(k, m) = ${1}`} then ${math`k \mid n`}; so a prime that divides a product divides one of the factors.`,
  lesson: [
    { kind: 'p', text: t`Numbers are [[coprime|coprime]] when their gcd is ${1} (Definition ${82}). Coprimality is what makes cancelling safe: ${math`${4} \mid ${6} \times ${2}`} but ${math`${4} \nmid ${6}`} and ${math`${4} \nmid ${2}`}, because ${4} shares a factor with ${6}.` },
    { kind: 'rule', text: t`[[euclids-lemma|Euclid's theorem]] (Theorem ${83}): if ${math`k \mid mn`} and ${math`\gcd(k, m) = ${1}`}, then ${math`k \mid n`}. For a prime ${math`p`} (Corollary ${84}): if ${math`p \mid mn`} then ${math`p \mid m`} or ${math`p \mid n`}.` },
    { kind: 'p', text: t`The notes' proof is three equalities, all from the linearity of gcd: if ${math`kl = mn`}, then ${math`n = \gcd(k, m)\,n = \gcd(kn, mn) = \gcd(kn, kl) = k \gcd(n, l)`}. Book of Proof instead writes ${math`${1} = ax + by`} and multiplies by ${math`c`}.` },
    { kind: 'p', text: t`It is the key to much of the course. In ${math`\mathbb{Z}_{p}`} a product of nonzero elements is nonzero, unlike ${math`[${2}][${3}] = [${0}]`} in ${math`\mathbb{Z}_{${6}}`}. ${math`x^{${2}} \equiv ${1} \pmod{p}`} has only ${math`x \equiv \pm ${1}`}, while modulo ${8} all of ${setOf(roots(8))} work. It finishes Fermat's little theorem (from ${math`p \mid i(i^{p - ${1}} - ${1})`} and ${math`p \nmid i`}) and the uniqueness of prime factorisation.` },
    { kind: 'p', text: t`Its general form also cancels with care: ${math`${12} \mid ${18}x`} means ${math`${2} \mid ${3}x`}, so ${math`${2} \mid x`}, after dividing by ${math`\gcd(${12}, ${18}) = ${6}`}.` },
  ],
  examples: [
    theorem83,
    workedCambridge(sheet327c),
    worked(cancelCoprime, { k: 12, m: 18 }, t`When does ${12} divide ${math`${18}x`}?`),
  ],
  generators: [cancelCoprime, squareRootsOfOne, zeroDivisors],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['coprime', 'euclids-lemma'],
  cambridge: [bop1155, bop1156, sheet316, sheet322, sheet331, bop729],
  gate: ['sheet-3-1-6', 'sheet-3-2-2', 'sheet-3-3-1'],
};
