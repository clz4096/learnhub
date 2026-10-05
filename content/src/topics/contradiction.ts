/**
 * proof.contradiction: Proof by contradiction: assume the statement is false and deduce
 * something impossible. The lesson follows the CST notes on negation and proof by
 * contradiction (printed pages 133 to 147: Theorem 38, the irrationality of the square
 * root of 2; the proof pattern; scratch work), the TMUA notes (pages 67 and 68: the same
 * proof, and the general structure, "not A leads to B and not B"), and Book of Proof
 * Sections 6.1 to 6.4. The problems are Book of Proof Chapter 6, TMUA Exercise O, and
 * supervision exercise 2.3.2 (repunits) with its 2023-24 official solution.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { gcd, int, pick, upTo } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { listOf, math, t, type Rich } from '../rich';
import { worked, workedProof, workedCambridge, type TopicContent } from '../topic';

const [ma, mb] = [math`a`, math`b`];
const big = (v: { num: bigint; den: bigint } | undefined): number | null => (v === undefined || v.den !== 1n ? null : Number(v.num));
const isSquare = (n: number): boolean => Number.isInteger(Math.sqrt(n)) && Math.round(Math.sqrt(n)) ** 2 === n;
function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
}

// ---------------------------------------------------------------- no integer solutions

interface LinP { p: number; q: number; c: number }

const noSolutions = generator<LinP>({
  id: 'no-integer-solutions',
  skill: 'Show that pa + qb = c has no integer solutions, as in Book of Proof Chapter 6, exercises 10 and 11: a number dividing p and q divides the left side but not c.',
  params: (rng) => {
    for (;;) {
      const d = pick(rng, [2, 3, 5, 6]);
      const p = d * int(rng, 2, 9);
      const q = d * int(rng, 2, 9);
      const c = int(rng, 1, 20);
      // p must not divide q, and c must not be a multiple of the common factor.
      if (q % p !== 0 && c % gcd(p, q) !== 0) return { p, q, c };
    }
  },
  sane: ({ p, q, c }) => (gcd(p, q) > 1 && c % gcd(p, q) !== 0 && q % p !== 0 ? null : 'out of range'),
  problem: ({ p, q, c }) => {
    const g = gcd(p, q);
    // The smallest common factor above 1 that does not divide c; g itself is one.
    const f = upTo(g).find((d) => d > 1 && g % d === 0 && c % d !== 0) as number;
    return {
      prompt: t`Prove that there are no integers ${ma} and ${mb} with ${math`${p}a + ${q}b = ${c}`}. The proof by contradiction needs an integer ${math`d > ${1}`} that divides ${math`${p}a + ${q}b`} for every ${ma} and ${mb} but does not divide ${c}: give one.`,
      answer: {
        kind: 'witness', count: 1, names: ['d'], example: String(f),
        check: ([v]) => {
          const d = big(v);
          if (d === null || d <= 1) return 'Give an integer d greater than 1.';
          if (p % d !== 0 || q % d !== 0) return `${d} does not divide both ${p} and ${q}, so it need not divide ${p}a + ${q}b.`;
          return c % d === 0 ? `${d} divides ${c}, so there is no contradiction.` : null;
        },
      },
      solution: [
        t`Suppose, for contradiction, that integers ${ma} and ${mb} have ${math`${p}a + ${q}b = ${c}`}.`,
        t`${f} divides ${p} and ${q}: ${math`${p}a + ${q}b = ${f}(${p / f}a + ${q / f}b)`}, a multiple of ${f}. So ${f} divides ${c}.`,
        t`But ${math`${c} = ${f} \times ${Math.floor(c / f)} + ${c % f}`}, not a multiple of ${f}. This contradiction shows no such integers exist.`,
      ],
    };
  },
  solve: ({ p, q, c }) => {
    // The values of pa + qb for small a, b are all multiples of gcd(p, q); pick the smallest divisor of it above 1.
    const vals = new Set<number>();
    for (let a = -12; a <= 12; a++) for (let b = -12; b <= 12; b++) vals.add(p * a + q * b);
    const g = [...vals].reduce((x, y) => gcd(x, y), 0);
    if (vals.has(c)) return '?';
    return `d = ${upTo(g).find((d) => d > 1 && g % d === 0 && c % d !== 0) as number}`;
  },
  misconceptions: ({ p, q, c }): Misconception[] => [
    { response: 'd = 1', why: t`${1} divides everything, so it gives no contradiction. The divisor must be greater than ${1}.` },
    { response: `d = ${p}`, why: t`${p} divides ${math`${p}a`} but not ${math`${q}b`} in general, since it does not divide ${q}. Use a factor that ${p} and ${q} share.` },
    { response: `d = ${c}`, why: t`${c} divides ${c}, so there is no contradiction there. You need a common factor of ${p} and ${q} that does not divide ${c}.` },
  ],
});

// ---------------------------------------------------------------- which square roots are irrational

interface RootP { ks: readonly number[] }
const POOL_SQUARE = [4, 9, 16, 25, 36, 49];
const POOL_PRIME = [2, 3, 5, 7, 11, 13];
const POOL_COMPOSITE = [6, 8, 10, 12, 15, 18, 20, 24];

const roots = generator<RootP>({
  id: 'irrational-roots',
  skill: 'Decide which square roots are irrational: the square root of a whole number is rational only when the number is a perfect square.',
  params: (rng) => {
    const pickDistinct = (pool: readonly number[], k: number): number[] => {
      const out: number[] = [];
      while (out.length < k) { const x = pick(rng, pool); if (!out.includes(x)) out.push(x); }
      return out;
    };
    return { ks: [...pickDistinct(POOL_SQUARE, 2), ...pickDistinct(POOL_PRIME, 1), ...pickDistinct(POOL_COMPOSITE, 2)].sort((a, b) => a - b) };
  },
  sane: ({ ks }) => (ks.length === 5 && ks.some(isSquare) && ks.some((k) => !isSquare(k) && !isPrime(k)) ? null : 'out of range'),
  problem: ({ ks }) => {
    const options: ChoiceOption[] = ks.map((k) => ({ id: `r${k}`, label: [math`\sqrt{${k}}`] }));
    const irr = ks.filter((k) => !isSquare(k));
    return {
      prompt: t`Which of ${ks.map((k) => [math`\sqrt{${k}}`]).flatMap((r, i) => (i === 0 ? [...r] : [...t`, `, ...r]))} are irrational? Choose all that apply.`,
      answer: { kind: 'choice', options, correct: irr.map((k) => `r${k}`) },
      solution: [
        t`The proof that ${math`\sqrt{${2}}`} is irrational works for any whole number that is not a perfect square: if ${math`\sqrt{k} = \frac{a}{b}`} in lowest terms, then ${math`kb^{${2}} = a^{${2}}`}, and comparing the powers of a prime that appears an odd number of times in ${math`k`} gives a contradiction.`,
        t`Perfect squares have whole-number roots: ${ks.filter(isSquare).map((k) => [math`\sqrt{${k}} = ${Math.round(Math.sqrt(k))}`]).flatMap((r, i) => (i === 0 ? [...r] : [...t`, `, ...r]))}. The rest are irrational: ${irr.map((k) => [math`\sqrt{${k}}`]).flatMap((r, i) => (i === 0 ? [...r] : [...t`, `, ...r]))}.`,
      ],
    };
  },
  solve: ({ ks }) => ks.filter((k) => !upTo(k).some((r) => r * r === k)).map((k) => `r${k}`),
  misconceptions: ({ ks }): Misconception[] => [
    { response: ks.map((k) => `r${k}`), why: t`A square root of a perfect square is a whole number, so it is rational: ${math`\sqrt{${ks.find(isSquare) as number}} = ${Math.round(Math.sqrt(ks.find(isSquare) as number))}`}.` },
    { response: ks.filter(isPrime).map((k) => `r${k}`), why: t`Not only primes: the root of any whole number that is not a perfect square is irrational, such as ${math`\sqrt{${ks.find((k) => !isSquare(k) && !isPrime(k)) as number}}`}.` },
    { response: ks.filter(isSquare).map((k) => `r${k}`), why: t`That is the other way round: the roots of perfect squares are the rational ones.` },
  ],
});

// ---------------------------------------------------------------- what to assume

interface AssumeItem { claim: Rich; right: Rich; converse: Rich; same: Rich; weak: Rich }
const ASSUME: readonly AssumeItem[] = [
  { claim: t`${math`\sqrt{${2}}`} is irrational.`, right: t`${math`\sqrt{${2}}`} is rational.`, converse: t`${math`\sqrt{${2}}`} is an integer.`, same: t`${math`\sqrt{${2}}`} is irrational.`, weak: t`${math`\sqrt{${2}}`} is not an integer.` },
  { claim: t`There are infinitely many primes.`, right: t`There are only finitely many primes.`, converse: t`There are no primes.`, same: t`There are infinitely many primes.`, weak: t`There are infinitely many composite numbers.` },
  { claim: t`There is no largest even number.`, right: t`There is a largest even number.`, converse: t`There is a smallest even number.`, same: t`There is no largest even number.`, weak: t`Every even number is large.` },
  { claim: t`For every integer ${math`n`}, ${math`n^{${2}} + ${2}`} is not a multiple of ${4}.`, right: t`There is an integer ${math`n`} for which ${math`n^{${2}} + ${2}`} is a multiple of ${4}.`, converse: t`For every integer ${math`n`}, ${math`n^{${2}} + ${2}`} is a multiple of ${4}.`, same: t`For every integer ${math`n`}, ${math`n^{${2}} + ${2}`} is not a multiple of ${4}.`, weak: t`There is an integer ${math`n`} for which ${math`n^{${2}} + ${2}`} is not a multiple of ${4}.` },
  { claim: t`If ${math`n^{${2}}`} is odd, then ${math`n`} is odd.`, right: t`${math`n^{${2}}`} is odd and ${math`n`} is even.`, converse: t`If ${math`n`} is odd, then ${math`n^{${2}}`} is odd.`, same: t`${math`n^{${2}}`} is odd and ${math`n`} is odd.`, weak: t`${math`n^{${2}}`} is even and ${math`n`} is even.` },
  { claim: t`There are no integers ${ma} and ${mb} with ${math`${18}a + ${6}b = ${1}`}.`, right: t`There are integers ${ma} and ${mb} with ${math`${18}a + ${6}b = ${1}`}.`, converse: t`For all integers ${ma} and ${mb}, ${math`${18}a + ${6}b = ${1}`}.`, same: t`There are no integers ${ma} and ${mb} with ${math`${18}a + ${6}b = ${1}`}.`, weak: t`There are integers ${ma} and ${mb} with ${math`${18}a + ${6}b \ne ${1}`}.` },
  { claim: t`If ${ma} is rational and ${math`ab`} is irrational, then ${mb} is irrational.`, right: t`${ma} is rational, ${math`ab`} is irrational, and ${mb} is rational.`, converse: t`If ${mb} is irrational, then ${ma} is rational and ${math`ab`} is irrational.`, same: t`${ma} is rational, ${math`ab`} is irrational, and ${mb} is irrational.`, weak: t`${ma} is irrational and ${mb} is rational.` },
];
const ORDERS: readonly (readonly number[])[] = [[0, 1, 2, 3], [1, 0, 3, 2], [2, 3, 0, 1], [3, 2, 1, 0]];

interface AssumeP { i: number; order: number }

const assume = generator<AssumeP>({
  id: 'what-to-assume',
  skill: 'Start a proof by contradiction: assume exactly the negation of the statement (for "if P then Q", assume P and not Q).',
  params: (rng) => ({ i: int(rng, 0, ASSUME.length - 1), order: int(rng, 0, ORDERS.length - 1) }),
  sane: ({ i, order }) => (i >= 0 && i < ASSUME.length && order >= 0 && order < ORDERS.length ? null : 'out of range'),
  problem: ({ i, order }) => {
    const a = ASSUME[i] as AssumeItem;
    const ids = ['right', 'converse', 'same', 'weak'];
    const texts = [a.right, a.converse, a.same, a.weak];
    return {
      prompt: t`To prove by contradiction: ${a.claim} What should the proof assume first?`,
      answer: { kind: 'choice', options: (ORDERS[order] as readonly number[]).map((k) => ({ id: ids[k] as string, label: texts[k] as Rich })), correct: 'right' },
      solution: [
        t`A proof by contradiction assumes the statement is false, that is, its negation, and deduces something impossible.`,
        t`The negation here is: ${a.right} For an "if ${math`P`} then ${math`Q`}" statement the negation is "${math`P`} and not ${math`Q`}".`,
      ],
    };
  },
  solve: ({ i }) => {
    // The options are written so that "right" is the negation; this only checks it is not the claim itself.
    const a = ASSUME[i] as AssumeItem;
    return [a.right === a.same ? '?' : 'right'];
  },
  misconceptions: (): Misconception[] => [
    { response: ['converse'], why: t`That is not the negation of the statement: it is a different, stronger (or unrelated) claim. Assume exactly that the statement is false.` },
    { response: ['same'], why: t`That assumes what you want to prove. A proof by contradiction assumes the opposite, and shows it is impossible.` },
    { response: ['weak'], why: t`That does not contradict the statement: it can hold while the statement is true. Assume the negation itself.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const theorem38 = workedProof({
  title: t`${math`\sqrt{${2}}`} is irrational`,
  prompt: t`Theorem ${38} of the CST notes: the real number ${math`\sqrt{${2}}`} is irrational.`,
  steps: [
    t`To prove "not (${math`\sqrt{${2}}`} is rational)", the notes prove the equivalent "${math`\sqrt{${2}}`} is rational implies false": assume ${math`\sqrt{${2}}`} is rational and reach a contradiction.`,
    t`Then ${math`\sqrt{${2}} = \frac{p_{${0}}}{q_{${0}}}`} for integers ${math`p_{${0}}`} and ${math`q_{${0}}`} that are not both even (cancel factors of ${2} first).`,
    t`Squaring, ${math`p_{${0}}^{${2}} = ${2}q_{${0}}^{${2}}`}, so ${math`p_{${0}}^{${2}}`} is even and so ${math`p_{${0}}`} is even (Proposition ${42}): ${math`p_{${0}} = ${2}k`}.`,
    t`Then ${math`${4}k^{${2}} = ${2}q_{${0}}^{${2}}`}, so ${math`q_{${0}}^{${2}} = ${2}k^{${2}}`} is even, and ${math`q_{${0}}`} is even too.`,
    t`Both are even, contradicting the choice of ${math`p_{${0}}`} and ${math`q_{${0}}`}. So ${math`\sqrt{${2}}`} is not rational.`,
  ],
  answer: t`${math`\sqrt{${2}}`} is irrational.`,
  source: cite('cst-dm-notes', 'printed pages 138 to 140, Theorem 38'),
});

/** The repunit with k ones in base r. */
const repunit = (r: number, k: number): bigint => upTo(k).reduce((s) => s * BigInt(r) + 1n, 0n);
const sw232a = auto({
  id: 'sw-2-3-2-a',
  source: cite('cst-dm-sw1', 'Exercises 2, 2.3.2(a)'),
  title: t`The first repunits`,
  prompt: t`A decimal (respectively binary) repunit is a natural number whose decimal (respectively binary) representation consists solely of ones. What are the first three decimal repunits? And the first three binary ones? Give them as ordinary numbers.`,
  answer: {
    kind: 'table', cell: 'exact', columns: [t`base`, t`first`, t`second`, t`third`],
    rows: [[t`decimal`, null, null, null], [t`binary`, null, null, null]],
    expected: [...[1, 2, 3].map((k) => String(repunit(10, k))), ...[1, 2, 3].map((k) => String(repunit(2, k)))],
  },
  solution: [
    t`Decimal: ${listOf([1, 2, 3].map((k) => Number(repunit(10, k))))}.`,
    t`Binary: one, one one, one one one in base ${2}, which are ${math`${1}`}, ${math`${2} + ${1} = ${3}`}, and ${math`${4} + ${2} + ${1} = ${7}`}.`,
  ],
  reference: [...[1, 2, 3].map((k) => String(repunit(10, k))), ...[1, 2, 3].map((k) => String(repunit(2, k)))],
  verify: () => same('by reading the digits', [1, 2, 3].map((k) => Number.parseInt('1'.repeat(k), 10)).join() + '|' + [1, 2, 3].map((k) => Number.parseInt('1'.repeat(k), 2)).join(), '1,11,111|1,3,7'),
  misconceptions: [{ response: ['1', '11', '111', '1', '11', '111'], why: t`The binary repunits are written with ones in base ${2}, but as numbers they are ${1}, ${3}, ${7}.` }],
  official: { source: cite('cst-dm-sols-2324-2', '2.3.2(a)'), answer: ['1', '11', '111', '1', '3', '7'], agrees: true },
});

const sw232mod4 = auto({
  id: 'sw-2-3-2-mod-4',
  source: cite('cst-dm-sw1', 'Exercises 2, 2.3.2(b)', true),
  title: t`Repunits modulo ${4}`,
  prompt: t`Every decimal repunit greater than ${1}, such as ${Number(repunit(10, 4))}, leaves the same remainder on division by ${4}. What is it? (Since every square leaves ${0} or ${1}, this shows no such repunit is a square.)`,
  answer: { kind: 'exact', expected: String(Number(repunit(10, 2) % 4n)) },
  solution: [
    t`A repunit greater than ${1} is ${math`${100}m + ${11}`} for some whole number ${math`m`}: its last two digits are ${11}. Since ${4} divides ${100}, it leaves the remainder of ${11}, which is ${3}.`,
    t`The official solution reaches the same: the repunit is ${math`\sum_{i=${0}}^{l} ${10}^{i} \equiv ${1} + ${2} = ${3} \pmod{${4}}`}. Squares leave ${0} or ${1} (Proposition ${25} of the notes), so assuming a repunit greater than ${1} is a square leads to a contradiction.`,
  ],
  reference: '3',
  verify: () => {
    for (let k = 2; k <= 30; k++) if (repunit(10, k) % 4n !== 3n) return `repunit of length ${k}`;
    for (let n = 0n; n < 40n; n++) if ((n * n) % 4n > 1n) return `square ${n}`;
    return null;
  },
  misconceptions: [{ response: '1', why: t`${11} leaves ${3} on division by ${4}, and so does every longer repunit, since ${4} divides ${100}.` }],
  official: { source: cite('cst-dm-sols-2324-2', '2.3.2(b)'), answer: '3', agrees: true },
});

const sw232base = auto({
  id: 'sw-2-3-2-base',
  source: cite('cst-dm-sw1', 'Exercises 2, 2.3.2(b), the last question', true),
  title: t`A square repunit in another base`,
  prompt: t`No decimal or binary repunit greater than ${1} is a square. Is that so in every base? Give a base ${math`r \ge ${2}`} and a number of ones ${math`k \ge ${2}`} for which the repunit with ${math`k`} ones in base ${math`r`} is a perfect square. (Keep ${math`r`} and ${math`k`} at most ${100} and ${8}.)`,
  answer: {
    kind: 'witness', count: 2, names: ['r', 'k'], example: '3, 2',
    check: ([a, b]) => {
      const r = big(a);
      const k = big(b);
      if (r === null || k === null || r < 2 || k < 2 || r > 100 || k > 8) return 'Give a base r from 2 to 100 and k from 2 to 8.';
      const n = repunit(r, k);
      const s = BigInt(Math.round(Math.sqrt(Number(n))));
      return [s - 1n, s, s + 1n].some((x) => x * x === n) ? null : `The repunit with ${k} ones in base ${r} is ${n}, not a square.`;
    },
  },
  solution: [
    t`With two ones, the repunit in base ${math`r`} is ${math`r + ${1}`}. That is a square when ${math`r = ${3}`}: ${math`${3} + ${1} = ${4} = ${2}^{${2}}`}. So the claim fails for base ${3}, as the official solution says; ${math`r = ${8}`} works too.`,
  ],
  reference: 'r = 3, k = 2',
  verify: () => {
    const sq = (n: bigint): boolean => { const s = BigInt(Math.round(Math.sqrt(Number(n)))); return s * s === n; };
    return same('base 3, two ones, and no square in bases 2 or 10 up to 12 ones', [sq(repunit(3, 2)), upTo(11).some((k) => sq(repunit(2, k + 1)) || sq(repunit(10, k + 1)))].join(), 'true,false');
  },
  misconceptions: [{ response: 'r = 10, k = 2', why: t`The decimal repunit ${11} is not a square; no decimal repunit greater than ${1} is.` }],
  official: { source: cite('cst-dm-sols-2324-2', '2.3.2(b)'), answer: 'r = 3, k = 2', agrees: true },
});

const bop11 = auto({
  id: 'bop-6-11',
  source: cite('bop', 'Chapter 6, exercise 11', true),
  title: t`No ${ma}, ${mb} with ${math`${18}a + ${6}b = ${1}`}`,
  prompt: t`Prove by contradiction that there exist no integers ${ma} and ${mb} for which ${math`${18}a + ${6}b = ${1}`}: give an integer ${math`d > ${1}`} that divides ${math`${18}a + ${6}b`} for every ${ma} and ${mb} but not ${1}.`,
  answer: noSolutions.at({ p: 18, q: 6, c: 1 }).problem.answer,
  solution: [
    t`Suppose, for contradiction, that ${math`${18}a + ${6}b = ${1}`}. Book of Proof's solution: then ${math`${1} = ${2}(${9}a + ${3}b)`}, so ${1} is even, a contradiction. Here ${math`d = ${2}`}.`,
    t`${3} or ${6} would do as well: each divides ${18} and ${6}, and none divides ${1}.`,
  ],
  reference: 'd = 2',
  verify: () => same('the values of 18a + 6b are the multiples of 6', upTo(25).map((k) => k - 13).flatMap((a) => upTo(25).map((k) => 18 * a + 6 * (k - 13))).every((v) => v % 6 === 0), true),
  misconceptions: [{ response: 'd = 1', why: t`${1} divides everything, so it gives no contradiction.` }],
  official: { source: cite('bop', 'Solutions, Chapter 6, exercise 11'), answer: 'd = 2', agrees: true },
});

const bop10 = auto({
  id: 'bop-6-10',
  source: cite('bop', 'Chapter 6, exercise 10', true),
  title: t`No ${ma}, ${mb} with ${math`${21}a + ${30}b = ${1}`}`,
  prompt: t`Prove by contradiction that there exist no integers ${ma} and ${mb} for which ${math`${21}a + ${30}b = ${1}`}: give an integer ${math`d > ${1}`} that divides ${math`${21}a + ${30}b`} for every ${ma} and ${mb} but not ${1}.`,
  answer: noSolutions.at({ p: 21, q: 30, c: 1 }).problem.answer,
  solution: [t`If ${math`${21}a + ${30}b = ${1}`}, then ${math`${1} = ${3}(${7}a + ${10}b)`} would be a multiple of ${3}: a contradiction. Here ${math`d = ${3}`}, the only choice, since ${math`\gcd(${21}, ${30}) = ${gcd(21, 30)}`}.`],
  reference: 'd = 3',
  verify: () => same('gcd(21, 30)', gcd(21, 30), 3),
  misconceptions: [{ response: 'd = 2', why: t`${2} divides ${30} but not ${21}, so it need not divide ${math`${21}a + ${30}b`}.` }],
});

const sw232b = supervision({
  id: 'sw-2-3-2-b',
  source: cite('cst-dm-sw1', 'Exercises 2, 2.3.2(b)'),
  title: t`No repunit is a square`,
  prompt: t`Show that no decimal repunit strictly greater than ${1} is a square, and that the same holds for binary repunits. Is this the case for every base? Write it as a proof by contradiction: assume such a repunit is a square, and use remainders on division by ${4}.`,
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-2', '2.3.2(b)'),
});
const tmuaO1 = supervision({
  id: 'tmua-o-1',
  source: cite('tmua-logic-proof', 'Exercise O, question 1'),
  title: t`Replace ${2} by ${9}`,
  prompt: t`Replace ${2} by ${9} in the proof that ${math`\sqrt{${2}}`} is irrational. Why does the proof no longer work? Point to the exact step that fails, and say what is true instead.`,
  writeUp: 'explanation',
});
const tmuaO2 = supervision({
  id: 'tmua-o-2',
  source: cite('tmua-logic-proof', 'Exercise O, question 2'),
  title: t`${math`\sqrt{p}`} for a prime ${math`p`}`,
  prompt: t`Adapt the proof that ${math`\sqrt{${2}}`} is irrational to show that ${math`\sqrt{p}`} is irrational for every prime ${math`p`}. Which fact about primes replaces "if ${math`a^{${2}}`} is even then ${ma} is even"?`,
  writeUp: 'proof',
});
const bop5 = supervision({
  id: 'bop-6-5',
  source: cite('bop', 'Chapter 6, exercise 5'),
  title: t`${math`\sqrt{${3}}`} is irrational`,
  prompt: t`Prove that ${math`\sqrt{${3}}`} is irrational. Inside the proof you will need "if ${math`${3} \mid a^{${2}}`} then ${math`${3} \mid a`}": prove that too, by cases on the remainder of ${ma} on division by ${3}.`,
  writeUp: 'proof',
  official: cite('bop', 'Solutions, Chapter 6, exercise 5'),
});
const bop7 = supervision({
  id: 'bop-6-7',
  source: cite('bop', 'Chapter 6, exercise 7'),
  title: t`${math`a^{${2}} - ${4}b - ${3} \ne ${0}`}`,
  prompt: t`Prove by contradiction: if ${ma} and ${mb} are integers, then ${math`a^{${2}} - ${4}b - ${3} \ne ${0}`}.`,
  writeUp: 'proof',
  official: cite('bop', 'Solutions, Chapter 6, exercise 7'),
});

// ---------------------------------------------------------------- lesson

export const contradiction: TopicContent = {
  topicId: 'proof.contradiction',
  goal: t`Prove a statement by assuming it is false and deducing something impossible, and recognise when a contradiction proof is the natural one.`,
  lesson: [
    { kind: 'p', text: t`Some statements are hard to prove head on: "${math`\sqrt{${2}}`} is irrational" says what ${math`\sqrt{${2}}`} is not. [[proof-by-contradiction|Proof by contradiction]] turns this round: assume the statement is false, and show that this leads to something impossible.` },
    { kind: 'rule', text: t`The CST notes' pattern. To prove ${math`P`}: write "We use proof by contradiction. So, suppose ${math`P`} is false." Deduce a logical [[contradiction|contradiction]]: some ${math`Q`} and also not ${math`Q`}. Write "This is a contradiction. Therefore, ${math`P`} must be true."` },
    { kind: 'p', text: t`Why it works: the notes accept ${math`\lnot \lnot P \Leftrightarrow P`}. Showing ${math`\lnot P \Rightarrow \text{false}`} proves ${math`\lnot \lnot P`}, which is ${math`P`}. The TMUA notes give the shape: we want ${math`A`}; we assume not ${math`A`}; not ${math`A`} leads to two statements ${math`B`} and not ${math`B`}; they cannot both be true, so not ${math`A`} was false, and ${math`A`} is true.` },
    { kind: 'p', text: t`The classic example (Theorem ${38} of the CST notes): suppose ${math`\sqrt{${2}} = \frac{a}{b}`} with ${ma} and ${mb} not both even. Then ${math`a^{${2}} = ${2}b^{${2}}`}, so ${ma} is even, ${math`a = ${2}k`}; then ${math`b^{${2}} = ${2}k^{${2}}`}, so ${mb} is even too. Both even: a contradiction.` },
    { kind: 'p', text: t`What to assume is exactly the negation. For "there is no largest prime", assume there is one. For "for every ${math`n`}, ...", assume there is an ${math`n`} for which it fails. For "if ${math`P`} then ${math`Q`}", assume ${math`P`} and not ${math`Q`}: then the proof has two assumptions to work with, which is often why contradiction is easier than a direct proof.` },
    { kind: 'p', text: t`Contradiction suits statements that say something does not exist: no integers with ${math`${18}a + ${6}b = ${1}`} (if there were, ${math`${1} = ${2}(${9}a + ${3}b)`} would be even), no largest prime, no fraction equal to ${math`\sqrt{${2}}`}. The notes warn that such proofs are often not constructive: they show something is impossible without telling you more.` },
  ],
  examples: [
    theorem38,
    workedCambridge(sw232mod4),
    worked(noSolutions, { p: 14, q: 21, c: 5 }, t`No integer solutions`),
    worked(assume, { i: 4, order: 2 }, t`What to assume`),
  ],
  generators: [noSolutions, roots, assume],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['proof-by-contradiction', 'contradiction'],
  cambridge: [sw232a, sw232base, bop11, bop10, sw232b, tmuaO1, tmuaO2, bop5, bop7],
};
