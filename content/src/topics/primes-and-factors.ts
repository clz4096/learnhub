/**
 * pre.primes-and-factors (a bridge): factors, multiples, primes and composite numbers, and
 * the test for primality by trial division up to the square root. Sources: the GCSE subject
 * content (DfE 2013), and STEP Support Foundation Assignment 10 Q2(i) and Q3 (the function
 * f(N) = N(1 - 1/p1)...(1 - 1/pk), Euler's totient). Every count and every factor is found
 * by brute force over the divisors. The second gate (batch 9) is IA Numbers and Sets Example
 * Sheet 1, Q3: four primes between two consecutive multiples of 10, which happens again from
 * 100 to 110, found by ruling out small factors and testing up to the square root.
 */
import { auto, cite, same, withUses } from '../cambridge';
import { pick, q, sample, toFloat, type Rational } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { computedTex, listOf, math, t } from '../rich';
import { checkFrom, workedCambridge, worked, type TopicContent } from '../topic';
import { namedAnswer, withExaminer } from '../prep-a';

const F10 = 'step-f10' as const;
const F10H = 'step-f10-hints' as const;

const divisors = (n: number): number[] => Array.from({ length: n }, (_, i) => i + 1).filter((d) => n % d === 0);
const isPrime = (n: number): boolean => n >= 2 && divisors(n).length === 2;
/** The distinct primes dividing n, by trial division. */
const primeFactors = (n: number): number[] => divisors(n).filter(isPrime);
/** Euler's f(N) = N(1 - 1/p1)...(1 - 1/pk), as an integer. */
const totient = (n: number): number => primeFactors(n).reduce((acc, p) => (acc / p) * (p - 1), n);

// ---------------------------------------------------------------- counting factors

interface CountP { n: number }
const countFactors = generator<CountP>({
  id: 'count-factors',
  skill: 'List the factors of a number in pairs, and count them.',
  quick: true,
  params: (rng) => ({ n: pick(rng, [12, 18, 20, 24, 28, 30, 36, 40, 42, 45, 48, 50, 54, 60, 63, 64, 72, 75, 80, 84, 90, 96, 100, 108, 112, 120, 126, 144]) }),
  sane: ({ n }) => (n >= 2 ? null : 'out of range'),
  problem: ({ n }) => {
    const ds = divisors(n);
    const pairs = ds.filter((d) => d * d <= n).map((d) => [d, n / d] as const);
    const square = Number.isInteger(Math.sqrt(n));
    return {
      prompt: t`How many positive factors does ${n} have? (Count ${1} and ${n} itself.)`,
      answer: { kind: 'exact', expected: String(ds.length) },
      solution: [
        t`Factors come in pairs that multiply to ${n}: ${computedTex(pairs.map(([a, b]) => `${a} \\times ${b}`).join(', \\ '))}. Try every ${math`d`} up to ${math`\sqrt{${n}}`}, since the smaller factor of a pair is at most ${math`\sqrt{${n}}`}.`,
        square
          ? t`That is ${pairs.length} pairs, but ${math`${Math.sqrt(n)} \times ${Math.sqrt(n)}`} uses one factor twice, so there are ${math`${2} \times ${pairs.length} - ${1} = ${ds.length}`} factors.`
          : t`That is ${pairs.length} pairs, so ${math`${2} \times ${pairs.length} = ${ds.length}`} factors.`,
      ],
    };
  },
  solve: ({ n }) => {
    let c = 0;
    for (let d = 1; d <= n; d++) if (n % d === 0) c++;
    return String(c);
  },
  misconceptions: ({ n }): Misconception[] => {
    const k = divisors(n).length;
    const out: Misconception[] = [
      { response: String(k - 2), why: t`${1} and ${n} are factors too: ${math`${n} = ${1} \times ${n}`}.` },
      { response: String(primeFactors(n).length), why: t`Those are only the prime factors. A factor is any whole number that divides ${n}, prime or not.` },
    ];
    if (Number.isInteger(Math.sqrt(n))) out.push({ response: String(k + 1), why: t`${math`${Math.sqrt(n)} \times ${Math.sqrt(n)}`} gives only one factor, ${Math.sqrt(n)}, not two.` });
    else out.push({ response: String(k / 2), why: t`Each pair holds two factors: count both numbers in every pair.` });
    return out;
  },
});

// ---------------------------------------------------------------- which is prime

const PRIMES = [53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193, 197, 199];
/** Composites with no factor 2, 3, or 5: they look prime at a glance. */
const SNEAKY = [49, 77, 91, 119, 121, 133, 143, 161, 169, 187, 203, 209, 217, 221];

interface WhichP { prime: number; others: number[] }
const smallestFactor = (n: number): number => divisors(n)[1] as number;

const whichPrime = generator<WhichP>({
  id: 'which-prime',
  skill: 'Test a number for primality by trial division by the primes up to its square root.',
  params: (rng) => ({ prime: pick(rng, PRIMES), others: sample(rng, SNEAKY, 3) }),
  sane: ({ prime, others }) => (isPrime(prime) && others.every((o) => !isPrime(o)) ? null : 'bad numbers'),
  problem: ({ prime, others }) => {
    const all = [prime, ...others].sort((a, b) => a - b);
    const options: ChoiceOption[] = all.map((n) => ({ id: `n${n}`, label: t`${n}` }));
    return {
      prompt: t`Exactly one of the numbers ${listOf(all)} is prime. Which?`,
      answer: { kind: 'choice', options, correct: `n${prime}` },
      solution: [
        ...[...others].sort((a, b) => a - b).map((o) => t`${o} is composite: ${math`${o} = ${smallestFactor(o)} \times ${o / smallestFactor(o)}`}.`),
        t`${prime} is prime: no prime up to ${math`\sqrt{${prime}}`}, which is less than ${Math.floor(Math.sqrt(prime)) + 1}, divides it.`,
      ],
    };
  },
  solve: ({ prime, others }) => [`n${[prime, ...others].find(isPrime) as number}`],
  misconceptions: ({ others }): Misconception[] => others.map((o) => ({ response: [`n${o}`], why: t`${o} is not divisible by ${2}, ${3}, or ${5}, but it is not prime: ${math`${o} = ${smallestFactor(o)} \times ${o / smallestFactor(o)}`}. Keep testing primes up to ${math`\sqrt{${o}}`}.` })),
});

// ---------------------------------------------------------------- the smallest prime factor

interface SpfP { p: number; r: number }
const smallestPrimeFactor = generator<SpfP>({
  id: 'smallest-prime-factor',
  skill: 'Find the smallest prime factor of a number by dividing by 2, 3, 5, 7, ... in turn.',
  params: (rng) => {
    for (;;) {
      const p = pick(rng, [7, 11, 13, 17, 19]);
      const r = pick(rng, [7, 11, 13, 17, 19, 23, 29, 31]);
      if (r >= p) return { p, r };
    }
  },
  sane: ({ p, r }) => (isPrime(p) && isPrime(r) && r >= p ? null : 'bad factors'),
  problem: ({ p, r }) => {
    const n = p * r;
    const tried = [2, 3, 5, 7, 11, 13, 17, 19].filter((x) => x < p);
    return {
      prompt: t`Find the smallest prime factor of ${n}.`,
      answer: { kind: 'exact', expected: String(p) },
      solution: [
        t`Try the primes in order. ${tried.length === 0 ? t`` : t`None of ${listOf(tried)} divides ${n}. `}${math`${n} = ${p} \times ${r}`}, so ${p} does.`,
        t`So the smallest prime factor is ${p}. (If no prime up to ${math`\sqrt{${n}}`} had divided ${n}, then ${n} would have been prime.)`,
      ],
    };
  },
  solve: ({ p, r }) => String(divisors(p * r).find((d) => d > 1) as number),
  misconceptions: ({ p, r }): Misconception[] => [
    { response: String(p * r), why: t`${p * r} is not prime: ${math`${p * r} = ${p} \times ${r}`}. Keep dividing by primes up to its square root.` },
    ...(r === p ? [] : [{ response: String(r), why: t`${r} is a prime factor, but not the smallest: ${p} divides ${p * r} too.` }]),
    { response: '1', why: t`${1} is not a prime: a prime has exactly two factors, and ${1} has only one.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const a10q2i = auto({
  id: 'a10-q2-i',
  source: cite(F10, 'Q2(i)'),
  title: t`The prime factors of ${120}`,
  prompt: t`Write down the prime factors of ${120}. Find the value of ${math`${120}\left(${1} - \frac{${1}}{${2}}\right)\left(${1} - \frac{${1}}{${3}}\right)\left(${1} - \frac{${1}}{${5}}\right)`}.`,
  answer: { kind: 'exact', expected: '32' },
  solution: [
    t`Divide by primes: ${math`${120} = ${2} \times ${60} = ${2}^{${2}} \times ${30} = ${2}^{${3}} \times ${15} = ${2}^{${3}} \times ${3} \times ${5}`}. The prime factors are ${2}, ${3}, and ${5}.`,
    t`${math`${120} \times \frac{${1}}{${2}} \times \frac{${2}}{${3}} \times \frac{${4}}{${5}} = ${60} \times \frac{${2}}{${3}} \times \frac{${4}}{${5}} = ${40} \times \frac{${4}}{${5}} = ${32}`}.`,
  ],
  reference: '32',
  verify: () => same('f(120) by the formula and by counting the numbers up to 120 coprime to it', `${totient(120)},${Array.from({ length: 120 }, (_, i) => i + 1).filter((k) => primeFactors(k).every((p) => 120 % p !== 0)).length}`, '32,32'),
  misconceptions: [{ response: '60', why: t`Use every distinct prime factor: ${2}, ${3}, and ${5}, so all three brackets.` }],
  official: { source: cite(F10H, 'Q2(i)'), answer: '32', agrees: true },
});

const a10q3ia = auto({
  id: 'a10-q3-i-a',
  source: cite(F10, 'Q3(i)(a)'),
  title: t`Evaluating ${math`f(N)`}`,
  prompt: t`For a positive integer ${math`N`}, ${math`f(N) = N\left(${1} - \frac{${1}}{p_{${1}}}\right)\left(${1} - \frac{${1}}{p_{${2}}}\right)\cdots\left(${1} - \frac{${1}}{p_{k}}\right)`}, where ${math`p_{${1}}, \ldots, p_{k}`} are the only primes that are factors of ${math`N`}. Thus ${math`f(${80}) = ${80}\left(${1} - \frac{${1}}{${2}}\right)\left(${1} - \frac{${1}}{${5}}\right)`}. Find ${math`a = f(${12})`} and ${math`b = f(${180})`}.`,
  answer: namedAnswer(['a', 'b'], [q(4), q(48)], 'Find the distinct primes first; a repeated prime gives one bracket only.'),
  solution: [
    t`${math`${12} = ${2}^{${2}} \times ${3}`}: ${math`f(${12}) = ${12} \times \frac{${1}}{${2}} \times \frac{${2}}{${3}} = ${4}`}.`,
    t`${math`${180} = ${2}^{${2}} \times ${3}^{${2}} \times ${5}`}: ${math`f(${180}) = ${180} \times \frac{${1}}{${2}} \times \frac{${2}}{${3}} \times \frac{${4}}{${5}} = ${48}`}.`,
    t`List the distinct primes first: a repeated factor does not add a bracket.`,
  ],
  reference: 'a = 4, b = 48',
  verify: () => same('f(12), f(180)', `${totient(12)},${totient(180)}`, '4,48'),
  misconceptions: [{ response: 'a = 2, b = 16', why: t`Each distinct prime gives one bracket, however many times it divides ${math`N`}: ${12} has the primes ${2} and ${3} only.` }],
  official: { source: cite(F10H, 'Q3(i)(a)'), answer: 'a = 4, b = 48', agrees: true },
  nudge: t`Not quite. Each distinct prime factor gives one bracket, however often it divides ${math`N`}.`,
  hints: [
    t`What are the distinct primes dividing ${12}, and those dividing ${180}?`,
    t`How many brackets does each ${math`N`} get?`,
    t`What does each product simplify to?`,
  ],
});

// IA Numbers and Sets Example Sheet 1, Q3: four primes between consecutive multiples of 10.
const DECADE = 10;
/** The primes strictly between m and m + 10. */
const primesInDecade = (m: number): number[] => Array.from({ length: DECADE - 1 }, (_, i) => m + i + 1).filter(isPrime);
/** Null when m is a multiple of 10, at least 20, with four primes between m and m + 10; else why not. */
function fourPrimeDecade(m: number): string | null {
  if (!Number.isInteger(m) || m % DECADE !== 0) return `${m} is not a multiple of ${DECADE}`;
  if (m < 2 * DECADE) return 'The question asks whether it happens again, after 0 to 10 and 10 to 20: give a multiple of 10 from 20 on.';
  const ps = primesInDecade(m);
  return ps.length === 4 ? null : `Between ${m} and ${m + DECADE} the primes are ${ps.length === 0 ? 'none' : ps.join(', ')}: ${ps.length}, not 4.`;
}
const ns1Q3 = auto({
  id: 'ns1-q3',
  source: cite('ia-ns-sheet-1', 'Q3'),
  title: t`Four primes in a row of ten`,
  prompt: t`There are four primes between ${0} and ${DECADE}, and four between ${DECADE} and ${2 * DECADE}. Does it ever happen again that there are four primes between two consecutive multiples of ${DECADE}? Settle it: give a multiple of ${DECADE}, at least ${2 * DECADE}, with four primes between it and the next multiple of ${DECADE}.`,
  answer: { kind: 'witness', count: 1, example: '100', check: (v) => fourPrimeDecade(toFloat(v[0] as Rational)) },
  solution: [
    t`Between ${math`m`} and ${math`m + ${DECADE}`}, with ${math`m`} a multiple of ${DECADE}, the numbers ending in ${listOf([2, 4, 6, 8])} are even and the one ending in ${5} is a multiple of ${5}. So only ${math`m + ${1}`}, ${math`m + ${3}`}, ${math`m + ${7}`}, and ${math`m + ${9}`} can be prime, and all four must be.`,
    t`Three more cuts come from ${3}. If ${3} divides ${math`m`}, it divides ${math`m + ${3}`}; if ${math`m`} is ${2} more than a multiple of ${3}, then ${3} divides ${math`m + ${1}`}. So ${math`m`} must be ${1} more than a multiple of ${3}: from ${2 * DECADE} on, the candidates are ${listOf([40, 70, 100])}, and so on.`,
    t`Test them. ${40}: ${math`${49} = ${7} \times ${7}`}. ${70}: ${math`${77} = ${7} \times ${11}`}. ${100}: the candidates are ${listOf(primesInDecade(100))}. A composite number below ${121} has a prime factor at most ${10}, so testing ${listOf([2, 3, 5, 7])} is enough, and none divides any of them. So yes: there are four primes between ${100} and ${110}.`,
    t`Sieve the cases with small primes first, then test the few survivors.`,
  ],
  reference: '100',
  verify: () => {
    const hits = Array.from({ length: 100 }, (_, i) => DECADE * (i + 2)).filter((m) => fourPrimeDecade(m) === null);
    if (hits[0] !== 100) return `the first decade after 10 to 20 with four primes starts at ${hits[0]}`;
    // Every hit is 1 more than a multiple of 3, as the solution argues.
    return hits.every((m) => m % 3 === 1) ? null : 'a hit that is not 1 more than a multiple of 3';
  },
  misconceptions: [
    { response: '40', why: t`${49} is not prime: ${math`${49} = ${7} \times ${7}`}. Between ${40} and ${50} there are only three primes.` },
    { response: '70', why: t`${77} is not prime: ${math`${77} = ${7} \times ${11}`}.` },
  ],
  nudge: t`Not quite. Only four endings can be prime in a run of ten; divisibility by ${3} then rules out most starting points.`,
  hints: [
    t`Between ${math`m`} and ${math`m + ${DECADE}`}, with ${math`m`} a multiple of ${DECADE}, which numbers can possibly be prime?`,
    t`Which remainder must ${math`m`} leave on division by ${3} for none of those four to be a multiple of ${3}?`,
    t`Testing the candidates in order from ${2 * DECADE}, which is the first where all four are prime?`,
  ],
});

// ---------------------------------------------------------------- lesson

export const primesAndFactors: TopicContent = {
  topicId: 'pre.primes-and-factors',
  goal: t`Tell primes from composite numbers, and list the factors and multiples of a whole number.`,
  objective: t`List factors and multiples, and test whether a number is prime.`,
  why: t`Primes are the atoms of number theory; STEP builds whole questions on them.`,
  minutes: 15,
  lesson: [
    { kind: 'section', title: t`The idea` },
    { kind: 'hook', text: t`Is ${91} prime? It is odd, its digits do not add to a multiple of ${3}, and it does not end in ${5}. It looks prime. It is not: ${math`${91} = ${7} \times ${13}`}. So when can you stop checking and be sure?` },
    { kind: 'narrative', text: t`The answer is a neat fact about pairs of factors, and it turns "check every number below ${math`n`}" into "check the primes up to ${math`\sqrt{n}`}". First the words.` },
    { kind: 'section', title: t`Factors, multiples, primes` },
    {
      kind: 'definition',
      name: t`Factor and multiple`,
      formal: t`For integers ${math`d`} and ${math`n`}, ${math`d`} is a [[factor|factor]] of ${math`n`} (we also say ${math`d`} divides ${math`n`}), and ${math`n`} is a [[multiple|multiple]] of ${math`d`}, if ${math`n = dk`} for some integer ${math`k`}.`,
      plain: t`${math`d`} goes into ${math`n`} exactly. ${4} is a factor of ${12}, since ${math`${12} = ${4} \times ${3}`}; ${12} is a multiple of ${4}.`,
    },
    {
      kind: 'definition',
      name: t`Prime and composite`,
      formal: t`An integer ${math`p \ge ${2}`} is [[prime-number|prime]] if its only positive factors are ${1} and ${math`p`}. An integer ${math`n \ge ${2}`} that is not prime is [[composite-number|composite]]: ${math`n = ab`} with ${math`${1} < a, b < n`}.`,
      plain: t`A prime has exactly two positive factors. ${7} is prime; ${9} is composite, ${math`${3} \times ${3}`}. ${1} is neither: it has only one factor.`,
    },
    checkFrom(countFactors, { n: 36 }, t`${36} has the pairs ${math`${1} \times ${36}`}, ${math`${2} \times ${18}`}, ${math`${3} \times ${12}`}, ${math`${4} \times ${9}`}, ${math`${6} \times ${6}`}: that is ${9} factors, the ${6} counted once.`),
    { kind: 'section', title: t`When to stop testing` },
    { kind: 'theorem', name: t`Trial division`, statement: t`If an integer ${math`n \ge ${2}`} is composite, then it has a prime factor ${math`p`} with ${math`p \le \sqrt{n}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Write it as a product`, text: t`${math`n`} is composite, so ${math`n = ab`} with ${math`${1} < a \le b < n`}.`, plain: t`Call the smaller factor ${math`a`}. For ${math`n = ${91}`}: ${math`a = ${7}`}, ${math`b = ${13}`}.` },
        { label: t`The smaller factor is small`, text: t`If ${math`a > \sqrt{n}`}, then ${math`b \ge a > \sqrt{n}`} and ${math`ab > \sqrt{n}\sqrt{n} = n`}, which is false. So ${math`a \le \sqrt{n}`}.` },
        { label: t`Take a prime factor of it`, text: t`${math`a \ge ${2}`} has a prime factor ${math`p`}, and ${math`p \le a \le \sqrt{n}`}. Since ${math`p`} divides ${math`a`} and ${math`a`} divides ${math`n`}, ${math`p`} divides ${math`n`}.`, why: { q: t`Why does every ${math`a \ge ${2}`} have a prime factor?`, a: t`Take the smallest factor of ${math`a`} that is bigger than ${1}; call it ${math`q`}. If ${math`q`} were not prime, it would have a factor ${math`r`} with ${math`${1} < r < q`}, and ${math`r`} would also be a factor of ${math`a`}, smaller than ${math`q`}. That is impossible, so ${math`q`} is prime. (For ${math`a = ${15}`}: ${math`q = ${3}`}.)` } },
      ],
    },
    { kind: 'narrative', text: t`So to test ${math`n`}, divide by the primes up to ${math`\sqrt{n}`}. If none divides it, ${math`n`} is prime. For ${97}: ${math`\sqrt{${97}}`} is less than ${10}, and none of ${2}, ${3}, ${5}, ${7} divides ${97}, so it is prime.` },
    checkFrom(smallestPrimeFactor, { p: 13, r: 17 }, t`${2}, ${3}, ${5}, ${7}, ${11} fail, and ${math`${221} = ${13} \times ${17}`}.`),
    { kind: 'pitfall', claim: t`An odd number that is not a multiple of ${3} or ${5} is prime.`, counterexample: t`${math`${49} = ${7} \times ${7}`} and ${math`${143} = ${11} \times ${13}`}. You must try every prime up to the square root.` },
    { kind: 'pitfall', claim: t`${1} is a prime number.`, counterexample: t`A prime has exactly two positive factors, ${1} and itself; ${1} has only one. (Counting ${1} as prime would also break the uniqueness of prime factorisation: ${math`${6} = ${2} \times ${3} = ${1} \times ${2} \times ${3}`}.)` },
    { kind: 'takeaway', text: t`To test ${math`n`} for primality, divide only by the primes up to ${math`\sqrt{n}`}; factors come in pairs, and one of each pair is that small.` },
  ],
  examples: [
    withExaminer(workedCambridge(a10q2i), t`The full factorisation shown by repeated division, and the product simplified step by step rather than on a calculator.`),
    worked(countFactors, { n: 60 }, t`Counting factors in pairs`),
    worked(smallestPrimeFactor, { p: 7, r: 13 }, t`A number that looks prime`),
  ],
  generators: [countFactors, whichPrime, smallestPrimeFactor],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['factor', 'multiple', 'composite-number'],
  cambridge: withUses([a10q3ia, ns1Q3], {
    'ns1-q3': { sections: ['Factors, multiples, primes', 'When to stop testing'], note: t`Ruling out candidates with small factors, then testing the rest up to the square root` },
    'a10-q3-i-a': { sections: ['Factors, multiples, primes'], note: t`Listing the prime factors of a number and evaluating the formula` },
  }),
  // Assignment 10 Q3(i)(a), and the four primes of Numbers and Sets Q3. The other Assignment 10 parts need prime
  // factorisation, so they are set in pre.prime-factorisation (Rule 1, 2026-10-08).
  gate: ['a10-q3-i-a', 'ns1-q3'],
  recall: [
    { front: t`Define a prime number.`, back: t`An integer ${math`p \ge ${2}`} whose only positive factors are ${1} and ${math`p`}.` },
    { front: t`Which divisors must you try to test ${math`n`} for primality?`, back: t`The primes up to ${math`\sqrt{n}`}: a composite ${math`n`} has a prime factor that small.` },
  ],
  proofOrder: [{
    title: t`A composite number has a small prime factor`,
    steps: [
      t`Write ${math`n = ab`} with ${math`${1} < a \le b < n`}.`,
      t`If ${math`a > \sqrt{n}`}, then ${math`ab > n`}, which is false; so ${math`a \le \sqrt{n}`}.`,
      t`Take a prime ${math`p`} dividing ${math`a`}; then ${math`p \le \sqrt{n}`}.`,
      t`${math`p`} divides ${math`a`}, which divides ${math`n`}, so ${math`p`} divides ${math`n`}.`,
    ],
  }],
};
