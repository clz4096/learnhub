/**
 * proof.infinitely-many-primes: Euclid's theorem: from any finite list of primes, the
 * product plus one has a prime factor not in the list, so the primes never run out. The
 * lesson follows the CST notes (printed pages 306 to 308: Theorem 100 and its proof by
 * contradiction, and the Theorem of the Day sheet, whose remark gives 2 × 3 × 5 × 7 × 11 ×
 * 13 + 1 = 30031 = 59 × 509) and Book of Proof Section 6.1. Batch 7 adds IA Numbers and Sets
 * Example Sheet 2, Q5 (its second and third parts: primes of the form 4n - 1; the first part is
 * this lesson's theorem) and Q6 (2^(2^n) - 1 has at least n distinct prime factors).
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { int, pick, upTo } from '../math';
import { generator, type Misconception } from '../problem';
import { computedTex, dmath, listOf, math, t } from '../rich';
import { checkFrom, workedProof, workedCambridge, worked, type TopicContent } from '../topic';

const [mp, mq] = [math`p`, math`q`];
function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
}
const smallestFactor = (n: number): number => { for (let d = 2; d * d <= n; d++) if (n % d === 0) return d; return n; };
const PRIMES = upTo(40).filter(isPrime);
const product = (xs: readonly number[]): number => xs.reduce((a, b) => a * b, 1);
const prodTex = (xs: readonly number[]) => computedTex(xs.join(' \\times '));
const big = (v: { num: bigint; den: bigint } | undefined): number | null => (v === undefined || v.den !== 1n ? null : Number(v.num));

// ---------------------------------------------------------------- a new prime from a list

interface ListP { ps: readonly number[] }

const newPrime = generator<ListP>({
  id: 'new-prime',
  skill: 'Run Euclid\'s argument on a finite list of primes: the product plus one has a prime factor that is not in the list.',
  params: (rng) => {
    const k = int(rng, 2, 4);
    const out: number[] = [];
    while (out.length < k) { const p = pick(rng, PRIMES.slice(0, 9)); if (!out.includes(p)) out.push(p); }
    return { ps: out.sort((a, b) => a - b) };
  },
  sane: ({ ps }) => (ps.length >= 2 && ps.every(isPrime) && new Set(ps).size === ps.length ? null : 'out of range'),
  problem: ({ ps }) => {
    const N = product(ps) + 1;
    const f = smallestFactor(N);
    return {
      prompt: t`Euclid's argument, on the list of primes ${listOf(ps)}: let ${math`N = ${prodTex(ps)} + ${1}`}. Give a prime that divides ${math`N`} and is not in the list.`,
      answer: {
        kind: 'witness', count: 1, names: ['p'], example: String(f),
        check: ([v]) => {
          const p = big(v);
          if (p === null || !isPrime(p)) return 'Give a prime number.';
          if (ps.includes(p)) return `${p} is in the list: it divides the product, so it leaves remainder 1 when dividing N.`;
          return N % p === 0 ? null : `${p} does not divide N = ${N}.`;
        },
      },
      solution: [
        t`${math`N = ${product(ps)} + ${1} = ${N}`}. Every prime in the list divides the product, so it leaves remainder ${1} when dividing ${math`N`}: none of them divides ${math`N`}.`,
        N === f
          ? t`Trying the primes up to ${math`\sqrt{N}`}, none divides ${N}, so ${N} is itself a prime, and it is not in the list.`
          : t`But ${math`N > ${1}`} has a prime factor: the smallest is ${f}, since ${math`${N} = ${f} \times ${N / f}`}. It is a prime not in the list.`,
      ],
    };
  },
  solve: ({ ps }) => {
    // Search upwards for a prime factor of N outside the list.
    const N = product(ps) + 1;
    let d = 2;
    while (!(N % d === 0 && isPrime(d) && !ps.includes(d))) d++;
    return `p = ${d}`;
  },
  misconceptions: ({ ps }): Misconception[] => [
    { response: `p = ${ps[0] as number}`, why: t`${ps[0] as number} divides the product, so it leaves remainder ${1} when dividing ${math`N`}. That is the point of the argument: no prime in the list divides ${math`N`}.` },
    { response: `p = ${ps[ps.length - 1] as number}`, why: t`Every prime in the list leaves remainder ${1} when dividing ${math`N`}. The new prime is one that divides ${math`N`}.` },
    { response: 'p = 1', why: t`${1} is not a prime. Find a prime factor of ${math`N`}.` },
  ],
});

// ---------------------------------------------------------------- remainders

interface RemP { ps: readonly number[]; i: number; r: number }

const remainder = generator<RemP>({
  id: 'remainder',
  skill: 'Find the remainder of a product of primes plus a small number on division by one of the primes: the product leaves nothing.',
  params: (rng) => {
    for (;;) {
      const k = int(rng, 2, 4);
      const ps: number[] = [];
      while (ps.length < k) { const p = pick(rng, PRIMES.slice(0, 8)); if (!ps.includes(p)) ps.push(p); }
      ps.sort((a, b) => a - b);
      const i = int(rng, 0, k - 1);
      const r = pick(rng, [1, -1, 2]);
      if ((ps[i] as number) > Math.abs(r) + 1) return { ps, i, r };
    }
  },
  sane: ({ ps, i, r }) => ((ps[i] as number) > Math.abs(r) + 1 ? null : 'out of range'),
  problem: ({ ps, i, r }) => {
    const p = ps[i] as number;
    const N = product(ps) + r;
    const rem = ((N % p) + p) % p;
    return {
      prompt: t`What is the remainder when ${math`${prodTex(ps)} ${r < 0 ? '-' : '+'} ${Math.abs(r)}`} is divided by ${p}?`,
      answer: { kind: 'exact', expected: String(rem) },
      solution: [
        t`${p} divides the product ${math`${prodTex(ps)}`}, so the remainder comes from the ${r < 0 ? t`${math`-${1}`}` : t`${math`+${r}`}`} alone.`,
        r < 0
          ? t`A remainder is between ${0} and ${p - 1}: ${math`-${1} = -${p} + ${p - 1}`}, so the remainder is ${p - 1}.`
          : t`The remainder is ${rem}.`,
      ],
    };
  },
  solve: ({ ps, i, r }) => {
    // Divide the actual number.
    const p = ps[i] as number;
    const N = product(ps) + r;
    return String(N - p * Math.floor(N / p));
  },
  misconceptions: ({ ps, i, r }): Misconception[] => {
    const p = ps[i] as number;
    const out: Misconception[] = [{ response: '0', why: t`${p} divides the product, but not the whole number: the ${r < 0 ? 'minus' : 'plus'} ${Math.abs(r)} is left over.` }];
    if (r < 0) out.push({ response: '-1', why: t`A remainder is never negative: it is between ${0} and ${p - 1}. Take ${math`-${1} + ${p}`}.` });
    else out.push({ response: String(p - r), why: t`That would be for ${math`-${r}`}. Here ${r} is added, so the remainder is ${r}.` });
    return out;
  },
});

// ---------------------------------------------------------------- Euclid numbers

interface EucP { k: number; sign: 1 | -1 }
const PRIMORIAL = (k: number): number => product(PRIMES.slice(0, k));

const euclidNumbers = generator<EucP>({
  id: 'euclid-numbers',
  skill: 'Find the smallest prime factor of the product of the first k primes, plus or minus one: it is never one of those k primes, and the number itself need not be prime.',
  params: (rng) => {
    for (;;) {
      const p: EucP = { k: int(rng, 2, 8), sign: pick(rng, [1, -1] as const) };
      // 2 - 1 = 1 has no prime factor; skip it.
      if (PRIMORIAL(p.k) + p.sign > 1) return p;
    }
  },
  sane: ({ k, sign }) => (k >= 2 && k <= 8 && PRIMORIAL(k) + sign > 1 ? null : 'out of range'),
  problem: ({ k, sign }) => {
    const ps = PRIMES.slice(0, k);
    const N = PRIMORIAL(k) + sign;
    const f = smallestFactor(N);
    return {
      prompt: t`Let ${math`N = ${prodTex(ps)} ${sign < 0 ? '-' : '+'} ${1}`}, the product of the first ${k} primes ${sign < 0 ? 'minus' : 'plus'} one. What is the smallest prime factor of ${math`N`}?`,
      answer: { kind: 'exact', expected: String(f) },
      solution: [
        t`${math`N = ${computedTex(String(N))}`}. None of ${listOf(ps)} divides it: each leaves remainder ${sign < 0 ? t`one less than itself` : t`${1}`}.`,
        f === N
          ? t`Trying every prime up to ${math`\sqrt{N}`}, none divides ${math`N`}: it is prime, and its smallest prime factor is itself.`
          : t`Trying primes from ${PRIMES[k] as number} upwards, the first that divides ${math`N`} is ${f}: ${math`N = ${f} \times ${computedTex(String(N / f))}`}. So ${math`N`} is not prime, but its prime factors are all new.`,
      ],
    };
  },
  solve: ({ k, sign }) => {
    const N = PRIMORIAL(k) + sign;
    return String(upTo(Math.min(N, 5000)).find((d) => d > 1 && N % d === 0) ?? N);
  },
  misconceptions: ({ k, sign }): Misconception[] => {
    const N = PRIMORIAL(k) + sign;
    return [
      { response: String(N), why: t`${math`N`} need not be prime: check for factors before assuming it is.` },
      { response: '2', why: t`${2} is one of the first ${k} primes, so it leaves a remainder when dividing ${math`N`}: ${math`N`} is odd.` },
      { response: String(PRIMES[k - 1] as number), why: t`${PRIMES[k - 1] as number} is in the list, so it cannot divide ${math`N`}. Look at larger primes.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

const theorem100 = workedProof({
  title: t`The set of primes is infinite`,
  prompt: t`Theorem ${100} of the CST notes: the set of primes is infinite.`,
  steps: [
    t`We use proof by contradiction. So suppose that the set of primes is finite, and let ${math`p_{${1}}, \ldots, p_{\ell}`} be all of them.`,
    t`Consider the natural number ${math`p = p_{${1}} \cdots p_{\ell} + ${1}`}. It is not in the list (it is bigger than every ${math`p_{i}`}), so it is not prime; by the Fundamental Theorem of Arithmetic it is a product of primes, so some ${math`p_{i}`} in the list divides it.`,
    t`That ${math`p_{i}`} also divides ${math`p_{${1}} \cdots p_{\ell}`}, so it divides the difference ${math`p - p_{${1}} \cdots p_{\ell} = ${1}`}. A prime cannot divide ${1}: this is a contradiction.`,
    t`Therefore the set of primes is infinite.`,
  ],
  answer: t`There are infinitely many primes.`,
  source: cite('cst-dm-notes', 'printed pages 306 and 307, Theorem 100'),
});

const SIX = PRIMES.slice(0, 6);
const N6 = product(SIX) + 1;
const totd30031 = auto({
  id: 'cst-totd-30031',
  source: cite('cst-dm-notes', 'printed page 308, the Theorem of the Day sheet, remark 2', true),
  title: t`The first Euclid number that is not prime`,
  prompt: t`The Theorem of the Day sheet in the CST notes warns that ${math`q = ${prodTex(SIX)} + ${1}`} need not be prime. Show it: give a prime factor of ${math`q = ${computedTex(String(N6))}`}.`,
  answer: {
    kind: 'witness', count: 1, names: ['p'], example: String(smallestFactor(N6)),
    check: ([v]) => {
      const p = big(v);
      if (p === null || !isPrime(p)) return 'Give a prime number.';
      if (p === N6) return `${N6} is not prime: find a smaller factor.`;
      return N6 % p === 0 ? null : `${p} does not divide ${N6}.`;
    },
  },
  solution: [
    t`None of ${listOf(SIX)} divides ${math`q`}: each leaves remainder ${1}. So try the primes from ${17} upwards: ${17}, ${19}, ..., ${53} leave remainders, and ${59} divides it.`,
    t`${math`${computedTex(String(N6))} = ${smallestFactor(N6)} \times ${N6 / smallestFactor(N6)}`}, as the sheet says. Both factors are primes outside the list, which is all Euclid's argument needs.`,
  ],
  reference: `p = ${smallestFactor(N6)}`,
  verify: () => same('the factorisation on the sheet', [N6, smallestFactor(N6), N6 / smallestFactor(N6), isPrime(N6 / smallestFactor(N6))].join(), '30031,59,509,true'),
  misconceptions: [{ response: 'p = 13', why: t`${13} is in the list, so it leaves remainder ${1} when dividing ${math`q`}.` }],
  official: { source: cite('cst-dm-notes', 'printed page 308, remark 2'), answer: 'p = 59', agrees: true },
});

const firstComposite = auto({
  id: 'cst-totd-first-composite',
  source: cite('cst-dm-notes', 'printed page 308, the Theorem of the Day sheet, remark 2', true),
  title: t`How long does the product plus one stay prime?`,
  prompt: t`For ${math`k = ${1}, ${2}, ${3}, \ldots`}, let ${math`q_{k}`} be the product of the first ${math`k`} primes, plus one: ${math`q_{${1}} = ${PRIMORIAL(1) + 1}`}, ${math`q_{${2}} = ${PRIMORIAL(2) + 1}`}, ${math`q_{${3}} = ${PRIMORIAL(3) + 1}`}, and so on. What is the smallest ${math`k`} for which ${math`q_{k}`} is not prime?`,
  answer: { kind: 'exact', expected: String(upTo(8).find((k) => !isPrime(PRIMORIAL(k) + 1)) as number) },
  solution: [
    t`${math`q_{${4}} = ${PRIMORIAL(4) + 1}`} and ${math`q_{${5}} = ${PRIMORIAL(5) + 1}`} are prime too. But ${math`q_{${6}} = ${computedTex(String(N6))} = ${59} \times ${509}`}.`,
    t`So the answer is ${6}: the sheet's example is the first. The proof never claims ${math`q_{k}`} is prime, only that its prime factors are new.`,
    t`The proof produces new prime factors, not new primes.`,
  ],
  reference: '6',
  verify: () => same('primality of q1 to q6', upTo(6).map((k) => isPrime(PRIMORIAL(k) + 1)).join(), 'true,true,true,true,true,false'),
  misconceptions: [{ response: '5', why: t`${math`q_{${5}} = ${PRIMORIAL(5) + 1}`} is prime: it has no factor up to its square root.` }],
  nudge: t`Not quite. Work upwards from ${math`k = ${1}`}, testing each ${math`q_{k}`} by trial division up to its square root.`,
  hints: [
    t`What are ${math`q_{${4}}`}, ${math`q_{${5}}`}, and ${math`q_{${6}}`} as numbers?`,
    t`To test whether a number is prime, how large must the trial divisors go?`,
    t`Does the proof that there are infinitely many primes ever claim that ${math`q_{k}`} itself is prime?`,
  ],
});

const notPrime = supervision({
  id: 'cst-totd-remarks',
  source: cite('cst-dm-notes', 'printed page 308, the Theorem of the Day sheet'),
  title: t`What the argument does and does not show`,
  prompt: t`The Theorem of the Day sheet argues that ${math`q = ${1} + p_{${1}} \cdots p_{N}`} "cannot be divided exactly by any prime in our list", and concludes that ${mq} is prime. Its remark (${2}) then shows ${math`${1} + ${2} \times ${3} \times ${5} \times ${7} \times ${11} \times ${13}`} is not prime. Explain why there is no conflict: what exactly does the argument prove about ${mq}, and where does the assumption that the list contains every prime enter? Then rewrite the proof so that it never claims ${mq} is prime.`,
  writeUp: 'explanation',
  hints: [
    t`Under the assumption that ${math`p_{${1}}, \ldots, p_{N}`} are all the primes, what does "no prime in the list divides ${mq}" imply?`,
    t`Without that assumption, what does the argument show about the prime factors of ${mq}?`,
    t`How can the proof end with "some prime factor of ${mq} is missing from the list" in place of "${mq} is prime"?`,
  ],
});
const bopVersion = supervision({
  id: 'bop-6-1-primes',
  source: cite('bop', 'Section 6.1, the proposition that there are infinitely many primes'),
  title: t`Book of Proof's version`,
  prompt: t`Book of Proof's proof divides ${math`a = p_{${1}} p_{${2}} \cdots p_{n} + ${1}`} by a prime divisor ${math`p_{k}`} and gets ${math`\frac{${1}}{p_{k}} = c - (p_{${1}} \cdots p_{k - ${1}} p_{k + ${1}} \cdots p_{n})`}, an integer on the right and not on the left. Compare this with the CST notes' ending, "${math`p_{i}`} divides ${1}". Are they the same contradiction? Which fact about natural numbers greater than ${1} do both rely on?`,
  writeUp: 'explanation',
  hints: [
    t`In each version, which integer is shown to be divisible by the chosen prime?`,
    t`Why is ${math`\frac{${1}}{p_{k}}`} not an integer, and why can no prime divide ${1}?`,
    t`Which fact guarantees that a natural number greater than ${1} has a prime divisor at all?`,
  ],
});

// ---------------------------------------------------------------- Cambridge problems: gates (batch 7)

/*
 * Outline for marking ns2-q5 (20 marks):
 * 1. Suppose p_1, ..., p_k are all the primes of the form 4n - 1 (3 is one, so k >= 1); let
 *    N = 4 p_1 ... p_k - 1. Then N > 1, N is odd, and N leaves remainder 3 on division by 4 (4).
 * 2. Every odd prime leaves remainder 1 or 3; a product of numbers leaving remainder 1 leaves
 *    remainder 1. So some prime factor q of N leaves remainder 3 (6).
 * 3. q is some p_i, which divides 4 p_1 ... p_k; then p_i divides their difference 1: contradiction (4).
 * 4. For 4n + 1: N = 4 p_1 ... p_k + 1 leaves remainder 1, but that does not force a prime factor
 *    of the form 4n + 1, since two primes of the form 4n - 1 multiply to one of the form 4n + 1
 *    (3 x 7 = 21) (6).
 */
const ns2q5 = supervision({
  id: 'ns2-q5',
  source: cite('ia-ns-sheet-2', 'Q5, second and third parts', true),
  title: t`Infinitely many primes of the form ${math`${4}n - ${1}`}`,
  prompt: t`By considering numbers of the form ${math`${4}p_{${1}}p_{${2}} \cdots p_{k} - ${1}`}, prove that there are infinitely many primes of the form ${math`${4}n - ${1}`}. What goes wrong with a similar proof that there are infinitely many primes of the form ${math`${4}n + ${1}`}?`,
  writeUp: 'proof',
  hints: [
    t`If ${math`p_{${1}}, \ldots, p_{k}`} are all the primes of the form ${math`${4}n - ${1}`}, why is ${math`N = ${4}p_{${1}} \cdots p_{k} - ${1}`} odd and divisible by none of the ${math`p_{i}`}?`,
    t`What form does a product of numbers of the form ${math`${4}n + ${1}`} take?`,
    t`Why must ${math`N`} then have a prime factor of the form ${math`${4}n - ${1}`}, and does the same step work with the two forms swapped?`,
  ],
});

/*
 * Outline for marking ns2-q6 (20 marks):
 * 1. Induction on n; base case n = 1: 2^2 - 1 = 3 has one prime factor (n = 0 is trivial) (3).
 * 2. Step: 2^(2^(n+1)) - 1 = (2^(2^n) - 1)(2^(2^n) + 1), by the difference of two squares (5).
 * 3. The two factors are odd and differ by 2, so a common divisor divides 2 and is odd: they are
 *    coprime (6).
 * 4. 2^(2^n) + 1 > 1 has a prime factor, which does not divide the first factor; with the n primes of
 *    the first factor that makes at least n + 1 distinct primes (6).
 */

// ---------------------------------------------------------------- lesson

const EX = [2, 3, 5];
const EX2 = [2, 7];

export const infinitelyManyPrimes: TopicContent = {
  topicId: 'proof.infinitely-many-primes',
  goal: t`Prove Euclid's theorem that there are infinitely many primes, and use its construction: from any finite list of primes, build a number that none of them divides.`,
  objective: t`Prove that there are infinitely many primes, and run the construction behind the proof.`,
  why: t`The model proof by contradiction; its trick of building a new number recurs throughout number theory.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`Do the primes run out?` },
    { kind: 'hook', text: t`Among the first ten numbers, four are prime. Among the first hundred, ${upTo(100).filter(isPrime).length}. Among the first thousand, ${upTo(1000).filter(isPrime).length}. The primes get rarer as you go. Could they stop altogether, with one last, largest prime? Over two thousand years ago Euclid showed that they cannot.` },
    { kind: 'narrative', text: t`Recall that a [[prime-number|prime]] is a whole number greater than ${1} whose only positive divisors are ${1} and itself: ${listOf(PRIMES.slice(0, 6))}, and so on. The proof needs one fact about primes first.` },

    { kind: 'section', title: t`Every number has a prime factor` },
    { kind: 'theorem', name: t`Prime factors exist`, statement: t`Every integer ${math`n > ${1}`} is divisible by some prime.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Take the smallest divisor`, text: t`The divisors of ${math`n`} that are greater than ${1} include ${math`n`} itself, so there is a smallest one; call it ${mp}.`, plain: t`For ${math`n = ${91}`}, the divisors bigger than ${1} are ${listOf([7, 13, 91])}, and the smallest is ${math`p = ${7}`}.` },
        { label: t`Suppose it is not prime`, text: t`Then ${math`p = ab`} with ${math`${1} < a < p`}.` },
        { label: t`Find a smaller divisor`, text: t`${math`a`} divides ${mp}, and ${mp} divides ${math`n`}, so ${math`a`} divides ${math`n`}. But ${math`${1} < a < p`}, contradicting the choice of ${mp} as the smallest. So ${mp} is prime.`, why: { q: t`Why does ${math`a`} divide ${math`n`}?`, a: t`If ${math`p = ab`} and ${math`n = pc`}, then ${math`n = a(bc)`}, a multiple of ${math`a`}. With numbers: ${7} divides ${91} and ${91} divides ${182}, so ${7} divides ${182}.` } },
      ],
    },

    { kind: 'section', title: t`Euclid's theorem` },
    { kind: 'narrative', text: t`Here is the idea, with a small list first. Take the primes ${listOf(EX)}, multiply them, and add ${1}: ${math`N = ${prodTex(EX)} + ${1} = ${product(EX) + 1}`}. Dividing ${math`N`} by ${2} leaves remainder ${1}, because ${math`${product(EX)}`} is a multiple of ${2}. The same is true for ${3} and for ${5}. So none of the listed primes divides ${math`N`}, yet ${math`N`} has some prime factor. That factor must be a prime that was not on the list.` },
    { kind: 'theorem', name: t`Euclid`, statement: t`The set of primes is infinite.` },
    { kind: 'p', text: t`This is [[euclids-theorem|Euclid's theorem]]. We prove it by [[proof-by-contradiction|contradiction]]: suppose the primes do run out, and show that something impossible follows.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Suppose the list is complete`, text: t`Suppose the set of primes is finite, and list all of them: ${math`p_{${1}}, p_{${2}}, \ldots, p_{\ell}`}.`, plain: t`${math`\ell`} is just the length of the list. We are not claiming such a list exists; we are testing the idea.` },
        { label: t`Build a new number`, text: t`Let ${math`N = p_{${1}} p_{${2}} \cdots p_{\ell} + ${1}`}. Then ${math`N > ${1}`}.` },
        { label: t`It has a prime factor`, text: t`By the theorem above, some prime divides ${math`N`}. Every prime is on our list, so it is ${math`p_{i}`} for some ${math`i`}.` },
        { label: t`That prime divides ${1}`, text: t`${math`p_{i}`} divides the product ${math`p_{${1}} \cdots p_{\ell}`}, since it is one of the factors. It divides ${math`N`} too, so it divides the difference:`, eq: [dmath`p_{i} \mid N - p_{${1}} \cdots p_{\ell} = ${1}.`], why: { q: t`Why does it divide the difference?`, a: t`If ${math`N = p_{i}a`} and ${math`p_{${1}} \cdots p_{\ell} = p_{i}b`}, then ${math`N - p_{${1}} \cdots p_{\ell} = p_{i}(a - b)`}, a multiple of ${math`p_{i}`}. The symbol ${math`\mid`} means "divides".` } },
        { label: t`Contradiction`, text: t`A prime is at least ${2}, so it cannot divide ${1}. The assumption was false: there are infinitely many primes.` },
      ],
    },
    checkFrom(remainder, { ps: [2, 3, 7], i: 2, r: 1 }, t`${7} divides ${math`${2} \times ${3} \times ${7}`} exactly, so adding ${1} leaves remainder ${1}.`),

    { kind: 'section', title: t`What the proof does not say` },
    { kind: 'narrative', text: t`It is tempting to read the proof as "${math`N`} is always a new prime". It is not. The proof only says ${math`N`} has a prime factor outside the list. Sometimes ${math`N`} itself is prime, as ${product(EX) + 1} was. Sometimes it is not.` },
    { kind: 'p', text: t`The CST notes' Theorem of the Day sheet gives the first example: ${math`${prodTex(SIX)} + ${1} = ${computedTex(String(N6))} = ${smallestFactor(N6)} \times ${N6 / smallestFactor(N6)}`}. Both factors are primes missing from the list, which is all the proof needs.` },
    checkFrom(newPrime, { ps: EX2 }, t`${math`N = ${2} \times ${7} + ${1} = ${product(EX2) + 1} = ${3} \times ${5}`}: both ${3} and ${5} are primes off the list, and ${math`N`} itself is not prime.`),

    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`The product of the first few primes, plus one, is always prime.`, counterexample: t`${math`${prodTex(SIX)} + ${1} = ${smallestFactor(N6)} \times ${N6 / smallestFactor(N6)}`}.` },
    { kind: 'pitfall', claim: t`The proof only works for the list of the first ${math`\ell`} primes.`, counterexample: t`Any finite list works. From ${listOf(EX2)}, ${math`N = ${product(EX2) + 1}`}, and its prime factors ${3} and ${5} are missing from the list.` },
    { kind: 'pitfall', claim: t`${math`N`} is bigger than every prime on the list, so it is a prime not on the list.`, counterexample: t`Being bigger only shows ${math`N`} is not on the list. Whether it is prime is a separate question: ${15} is bigger than ${7} and is ${math`${3} \times ${5}`}.` },
    { kind: 'takeaway', text: t`From any finite list of primes, the product plus one has a prime factor missing from the list, so the primes never run out.` },
  ],
  examples: [
    { ...theorem100, examiner: t`The examiner looks for the assumption stated as a complete finite list, the fact that ${math`N > ${1}`} has a prime factor, and the contradiction that a prime divides ${1}.` },
    workedCambridge(totd30031),
    worked(newPrime, { ps: [3, 5, 7] }, t`A new prime from ${listOf([3, 5, 7])}`),
  ],
  generators: [newPrime, remainder, euclidNumbers],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['euclids-theorem'],
  cambridge: withUses([firstComposite, notPrime, bopVersion, ns2q5], {
    'ns2-q5': { sections: ['Every number has a prime factor', "Euclid's theorem"], note: t`Adapting Euclid's argument to primes of one form` },
    'cst-totd-remarks': { sections: ["Euclid's theorem", 'What the proof does not say'], note: t`Saying exactly what the argument proves, and rewriting it correctly` },
  }),
  // The IA sheet's primes of the form 4n - 1, then the CST sheet's remark, which asks for the proof rewritten
  // correctly. The tower with many prime factors needs induction, so it is set in
  // alg.proof-by-induction. The first
  // composite is a factoring exercise, and Book of Proof is not Cambridge standard.
  gate: ['ns2-q5', 'cst-totd-remarks'],
  recall: [
    { front: t`State Euclid's theorem.`, back: t`There are infinitely many primes.` },
    { front: t`The key number in Euclid's proof.`, back: t`${math`N = p_{${1}} \cdots p_{\ell} + ${1}`}: no prime on the list divides it, yet it has a prime factor.` },
    { front: t`Is the product of primes plus one always prime?`, back: t`No: ${math`${prodTex(SIX)} + ${1} = ${smallestFactor(N6)} \times ${N6 / smallestFactor(N6)}`}. Only its prime factors are new.` },
  ],
  proofOrder: [{
    title: t`There are infinitely many primes`,
    steps: [
      t`Suppose ${math`p_{${1}}, \ldots, p_{\ell}`} are all the primes.`,
      t`Let ${math`N = p_{${1}} \cdots p_{\ell} + ${1}`}, which is greater than ${1}.`,
      t`${math`N`} has a prime factor, which must be some ${math`p_{i}`}.`,
      t`${math`p_{i}`} divides the product too, so it divides ${1}.`,
      t`No prime divides ${1}: contradiction.`,
    ],
  }],
};
