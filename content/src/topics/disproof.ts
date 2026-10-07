/**
 * proof.disproof: disproving an existence statement by proving its negation, a universal
 * statement, and disproof by contradiction. The lesson follows Book of Proof, Chapter 9,
 * Sections 9.2 and 9.3 (Examples 9.3 and 9.5: no real x has x^4 < x < x^2); the problems
 * are Chapter 9's exercises 2, 20, 21 and 30 (checked against the book's solution to 21) and
 * CST Discrete Mathematics supervision exercise 1.1.5 (for all integers x and y there is an
 * integer z with x + z = y - z), whose disproof needs a "there is no z" argument. Batch 7 adds IA
 * Numbers and Sets Example Sheet 2, Q7 (second question: 3381x + 2646y = 21). The CST exercises
 * 2.3.1 and 2.3.2(b) are gates of proof.cases and proof.contradiction, so they are not set again.
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { gcd, int, pick } from '../math';
import { generator, type Misconception } from '../problem';
import { math, t, type Span } from '../rich';
import { checkFrom, worked, workedProof, type TopicContent } from '../topic';

const [mx, mP] = [math`x`, math`P`];
const isPrime = (n: number): boolean => {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
};

// ---------------------------------------------------------------- generators

interface LinP { p: number; q: number; c: number }

const linGen = generator<LinP>({
  id: 'integer-combination',
  skill: 'Prove or disprove "there are integers a, b with pa + qb = c": false exactly when gcd(p, q) does not divide c.',
  params: (rng) => {
    const g = pick(rng, [1, 2, 3, 4, 5, 6, 7]);
    for (;;) {
      const p = g * int(rng, 2, 9);
      const q = g * int(rng, 2, 9);
      if (gcd(p, q) !== g || p === q) continue;
      // Half the time a target the combinations reach, half the time one they miss.
      const c = rng() < 0.5 ? g * int(rng, 1, 5) : g * int(rng, 1, 5) + (g === 1 ? 0 : int(rng, 1, g - 1));
      return { p, q, c };
    }
  },
  sane: ({ p, q, c }) => (p > 0 && q > 0 && c > 0 ? null : 'out of range'),
  problem: ({ p, q, c }) => {
    const g = gcd(p, q);
    const ok = c % g === 0;
    return {
      prompt: t`True or false: there exist integers ${math`a`} and ${math`b`} with ${math`${p}a + ${q}b = ${c}`}. Choose the right verdict and reason.`,
      answer: {
        kind: 'choice',
        options: [
          { id: 't', label: t`True: suitable integers exist, as an example shows.` },
          { id: 'f', label: t`False: for all integers ${math`a, b`}, ${math`${p}a + ${q}b`} is a multiple of ${g}, and ${c} is not.` },
          { id: 's', label: t`False: no pair with ${math`a`} and ${math`b`} between ${math`-${5}`} and ${5} works.` },
        ],
        correct: ok ? 't' : 'f',
      },
      solution: ok
        ? [t`${math`\gcd(${p}, ${q}) = ${g}`} divides ${c}, and Euclid's algorithm gives integers with ${math`${p}a + ${q}b = ${g}`}; multiply them by ${c / g}.`, t`So the statement is true, proved by the example.`]
        : [t`To disprove "there exist ${math`a, b`} with ...", prove its negation: for all integers ${math`a, b`}, ${math`${p}a + ${q}b \neq ${c}`}.`, t`${g} divides ${p} and ${q}, so ${math`${p}a + ${q}b = ${g}\left(${p / g}a + ${q / g}b\right)`} is a multiple of ${g} for all integers ${math`a, b`}. But ${c} is not a multiple of ${g}. So no ${math`a, b`} work.`],
    };
  },
  solve: ({ p, q, c }) => {
    // Search a box large enough to contain a solution whenever one exists.
    for (let a = -60; a <= 60; a++) if ((c - p * a) % q === 0) return ['t'];
    return ['f'];
  },
  misconceptions: ({ p, q, c }): Misconception[] => {
    const ok = c % gcd(p, q) === 0;
    return [
      { response: ['s'], why: t`A search that finds nothing proves nothing about the integers outside it. A disproof of "there exist" must cover every ${math`a`} and ${math`b`}.` },
      { response: [ok ? 'f' : 't'], why: ok ? t`Here ${math`\gcd(${p}, ${q}) = ${gcd(p, q)}`} divides ${c}, so the combinations do reach it.` : t`Every combination ${math`${p}a + ${q}b`} is a multiple of ${gcd(p, q)}, so it can never equal ${c}.` },
    ];
  },
});

interface PrimeP { d: number }

const primeGen = generator<PrimeP>({
  id: 'prime-difference',
  skill: 'Disprove "there are primes p, q with p - q = d" for odd d by parity: one of them would be 2.',
  params: (rng) => ({ d: 2 * int(rng, 2, 60) + 1 }),
  sane: ({ d }) => (d % 2 === 1 && d >= 5 ? null : 'an odd difference of at least 5'),
  problem: ({ d }) => {
    const ok = isPrime(d + 2);
    return {
      prompt: t`True or false: there exist prime numbers ${math`p`} and ${math`q`} with ${math`p - q = ${d}`}.`,
      answer: {
        kind: 'choice',
        options: [
          { id: 't', label: t`True: ${math`p = ${d + 2}`} and ${math`q = ${2}`} work.` },
          { id: 'f', label: t`False: ${math`p`} and ${math`q`} would have opposite parity, so ${math`q = ${2}`} and ${math`p = ${d + 2}`}, which is not prime.` },
          { id: 'o', label: t`False: two odd primes always differ by an even number, so it is impossible.` },
        ],
        correct: ok ? 't' : 'f',
      },
      solution: [
        t`${d} is odd, so one of ${math`p, q`} is even and the other odd. The only even prime is ${2}. As ${math`p > q`}, ${math`q = ${2}`} and ${math`p = ${d + 2}`}.`,
        ok ? t`${d + 2} is prime, so the statement is true: ${math`${d + 2} - ${2} = ${d}`}.` : t`${d + 2} is not prime (${d + 2} has a factor ${smallestFactor(d + 2)}), so no primes work: the statement is false.`,
      ],
    };
  },
  solve: ({ d }) => {
    for (let q = 2; q < 500; q++) if (isPrime(q) && isPrime(q + d)) return ['t'];
    return ['f'];
  },
  misconceptions: ({ d }): Misconception[] => {
    const ok = isPrime(d + 2);
    return [
      { response: ['o'], why: t`Two odd primes do differ by an even number, but ${2} is prime too. Check ${math`q = ${2}`}, ${math`p = ${d + 2}`}.` },
      { response: [ok ? 'f' : 't'], why: ok ? t`${d + 2} is prime, so ${math`p = ${d + 2}`}, ${math`q = ${2}`} is an example.` : t`${d + 2} has the factor ${smallestFactor(d + 2)}, so it is not prime.` },
    ];
  },
});

function smallestFactor(n: number): number {
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return d;
  return n;
}

interface NegP { s: number }
const STATEMENTS: readonly { say: Span; neg: Span; wrong1: Span; wrong2: Span }[] = [
  { say: math`\exists x \in \mathbb{R},\ x^{${4}} < x < x^{${2}}`, neg: math`\forall x \in \mathbb{R},\ \neg(x^{${4}} < x < x^{${2}})`, wrong1: math`\exists x \in \mathbb{R},\ \neg(x^{${4}} < x < x^{${2}})`, wrong2: math`\forall x \in \mathbb{R},\ x^{${4}} \ge x \ge x^{${2}}` },
  { say: math`\exists n \in \mathbb{N},\ n^{${2}} + n + ${1} \text{ is even}`, neg: math`\forall n \in \mathbb{N},\ n^{${2}} + n + ${1} \text{ is odd}`, wrong1: math`\exists n \in \mathbb{N},\ n^{${2}} + n + ${1} \text{ is odd}`, wrong2: math`\forall n \in \mathbb{N},\ n^{${2}} + n + ${1} \text{ is even}` },
  { say: math`\exists a, b \in \mathbb{Z},\ ${42}a + ${7}b = ${1}`, neg: math`\forall a, b \in \mathbb{Z},\ ${42}a + ${7}b \neq ${1}`, wrong1: math`\exists a, b \in \mathbb{Z},\ ${42}a + ${7}b \neq ${1}`, wrong2: math`\forall a \in \mathbb{Z},\ \exists b \in \mathbb{Z},\ ${42}a + ${7}b \neq ${1}` },
  { say: math`\exists x \in \mathbb{R},\ x^{${2}} + ${1} < ${2}x`, neg: math`\forall x \in \mathbb{R},\ x^{${2}} + ${1} \ge ${2}x`, wrong1: math`\exists x \in \mathbb{R},\ x^{${2}} + ${1} \ge ${2}x`, wrong2: math`\forall x \in \mathbb{R},\ x^{${2}} + ${1} > ${2}x` },
  { say: math`\exists p, q \text{ prime},\ p - q = ${97}`, neg: math`\forall p, q \text{ prime},\ p - q \neq ${97}`, wrong1: math`\exists p, q \text{ prime},\ p - q \neq ${97}`, wrong2: math`\forall p \text{ prime},\ \exists q \text{ prime},\ p - q \neq ${97}` },
  { say: math`\exists n \in \mathbb{Z},\ n^{${2}} \equiv ${2} \pmod{${4}}`, neg: math`\forall n \in \mathbb{Z},\ n^{${2}} \not\equiv ${2} \pmod{${4}}`, wrong1: math`\exists n \in \mathbb{Z},\ n^{${2}} \not\equiv ${2} \pmod{${4}}`, wrong2: math`\forall n \in \mathbb{Z},\ n^{${2}} \equiv ${0} \pmod{${4}}` },
  { say: math`\exists x \in \mathbb{Q},\ x^{${2}} = ${2}`, neg: math`\forall x \in \mathbb{Q},\ x^{${2}} \neq ${2}`, wrong1: math`\exists x \in \mathbb{Q},\ x^{${2}} \neq ${2}`, wrong2: math`\forall x \in \mathbb{R},\ x^{${2}} \neq ${2}` },
  { say: math`\exists n \in \mathbb{N},\ ${3} \mid n^{${2}} + ${1}`, neg: math`\forall n \in \mathbb{N},\ ${3} \nmid n^{${2}} + ${1}`, wrong1: math`\exists n \in \mathbb{N},\ ${3} \nmid n^{${2}} + ${1}`, wrong2: math`\forall n \in \mathbb{N},\ ${3} \mid n^{${2}}` },
];

const negGen = generator<NegP>({
  id: 'what-to-prove',
  skill: 'To disprove "there exists x with P(x)", prove "for every x, not P(x)".',
  quick: true,
  params: (rng) => ({ s: int(rng, 0, STATEMENTS.length - 1) }),
  sane: ({ s }) => (s >= 0 && s < STATEMENTS.length ? null : 'out of range'),
  problem: ({ s }) => {
    const st = STATEMENTS[s] as (typeof STATEMENTS)[number];
    return {
      prompt: t`To disprove ${st.say}, which statement must you prove?`,
      answer: { kind: 'choice', options: [{ id: 'n', label: t`${st.neg}` }, { id: 'w1', label: t`${st.wrong1}` }, { id: 'w2', label: t`${st.wrong2}` }], correct: 'n' },
      solution: [
        t`Disproving a statement means proving its negation. The negation of ${math`\exists x\, P(x)`} is ${math`\forall x\, \neg P(x)`}: the property fails for every ${mx}.`,
        t`So you must prove ${st.neg}.`,
      ],
    };
  },
  solve: () => ['n'],
  misconceptions: (): Misconception[] => [
    { response: ['w1'], why: t`One ${mx} where the property fails does not stop another ${mx} from having it. The negation of "there exists" is "for every ... not".` },
    { response: ['w2'], why: t`That says more, or something different, from "not". Negate exactly: keep the property, and put "not" in front of it, for every value.` },
  ],
});

interface SqP { n: number }

const sqGen = generator<SqP>({
  id: 'difference-of-squares',
  skill: 'Decide whether n = a^2 - b^2 has integer solutions; disprove it for n of the form 4k + 2 by working mod 4.',
  params: (rng) => ({ n: pick(rng, [4 * int(rng, 1, 25) + 2, 4 * int(rng, 1, 25) + 2, 2 * int(rng, 1, 50) + 1, 4 * int(rng, 1, 25)]) }),
  sane: ({ n }) => (n >= 3 ? null : 'out of range'),
  problem: ({ n }) => {
    const ok = n % 4 !== 2;
    return {
      prompt: t`True or false: there exist integers ${math`a`} and ${math`b`} with ${math`a^{${2}} - b^{${2}} = ${n}`}.`,
      answer: {
        kind: 'choice',
        options: [
          { id: 't', label: t`True: an example exists.` },
          { id: 'f', label: t`False: a square leaves remainder ${0} or ${1} on division by ${4}, so ${math`a^{${2}} - b^{${2}}`} leaves ${0}, ${1} or ${3}; ${n} leaves ${n % 4}.` },
          { id: 'e', label: t`False: ${n} is not itself a perfect square.` },
        ],
        correct: ok ? 't' : 'f',
      },
      solution: ok
        ? [n % 2 === 1 ? t`${n} is odd: take ${math`a = ${(n + 1) / 2}`}, ${math`b = ${(n - 1) / 2}`}. Then ${math`a^{${2}} - b^{${2}} = (a + b)(a - b) = ${n} \times ${1}`}.` : t`${n} is a multiple of ${4}: take ${math`a = ${n / 4 + 1}`}, ${math`b = ${n / 4 - 1}`}. Then ${math`(a + b)(a - b) = ${n / 2} \times ${2} = ${n}`}.`]
        : [t`An even square ${math`(${2}k)^{${2}} = ${4}k^{${2}}`} leaves ${0}; an odd square ${math`(${2}k + ${1})^{${2}} = ${4}(k^{${2}} + k) + ${1}`} leaves ${1}.`, t`So ${math`a^{${2}} - b^{${2}}`} leaves ${0}, ${1}, or ${math`-${1}`}, that is ${3}. It never leaves ${2}, so it is never ${n}: for all integers ${math`a, b`}, ${math`a^{${2}} - b^{${2}} \neq ${n}`}.`],
    };
  },
  solve: ({ n }) => {
    for (let a = 0; a <= n; a++) for (let b = 0; b <= a; b++) if (a * a - b * b === n) return ['t'];
    return ['f'];
  },
  misconceptions: ({ n }): Misconception[] => [
    { response: ['e'], why: t`${math`a^{${2}} - b^{${2}}`} need not be a square: ${math`${3}^{${2}} - ${1}^{${2}} = ${8}`}. Whether ${n} is a square is beside the point.` },
    { response: [n % 4 === 2 ? 't' : 'f'], why: n % 4 === 2 ? t`Work out the remainders on division by ${4}: a difference of two squares never leaves ${2}, and ${n} does.` : t`${n} leaves remainder ${n % 4} on division by ${4}, which a difference of squares can leave. Try ${math`a + b`} and ${math`a - b`} as a factor pair of ${n}.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const ex93 = workedProof({
  title: t`No real ${mx} has ${math`x^{${4}} < x < x^{${2}}`}`,
  prompt: t`Book of Proof, Example ${9}.${3}: either prove or disprove the conjecture that there is a real number ${mx} for which ${math`x^{${4}} < x < x^{${2}}`}.`,
  steps: [
    t`Guessing fails: ${math`x = \frac{${1}}{${2}}`} has ${math`x^{${4}} < x`} but not ${math`x < x^{${2}}`}; ${math`x = ${2}`} has ${math`x < x^{${2}}`} but not ${math`x^{${4}} < x`}. So try to disprove it, by proving the negation: for every real ${mx}, it is not the case that ${math`x^{${4}} < x < x^{${2}}`}.`,
    t`Suppose, for contradiction, that some ${mx} has ${math`x^{${4}} < x < x^{${2}}`}. Then ${mx} is greater than the non-negative number ${math`x^{${4}}`}, so ${math`x > ${0}`}.`,
    t`Divide all parts by the positive ${mx}: ${math`x^{${3}} < ${1} < x`}. Subtract ${1}: ${math`x^{${3}} - ${1} < ${0} < x - ${1}`}.`,
    t`Factor: ${math`(x - ${1})(x^{${2}} + x + ${1}) < ${0} < x - ${1}`}. The right inequality says ${math`x - ${1} > ${0}`}, so dividing by it keeps the direction: ${math`x^{${2}} + x + ${1} < ${0}`}.`,
    t`But ${mx} is positive, so ${math`x^{${2}} + x + ${1} > ${0}`}. Contradiction. So no such ${mx} exists, and the conjecture is false.`,
  ],
  answer: t`The conjecture is false: for every real ${mx}, ${math`x^{${4}} < x < x^{${2}}`} fails.`,
  source: cite('bop', 'Section 9.2, Example 9.3'),
});

const sw115proof = supervision({
  id: 'sw-1-1-5-proof',
  source: cite('cst-dm-sw1', 'Exercises 1, 1.1.4 and 1.1.5'),
  title: t`Reals against integers`,
  prompt: t`Prove or disprove each: (a) for all real numbers ${mx} and ${math`y`} there is a real number ${math`z`} such that ${math`x + z = y - z`}; (b) for all integers ${mx} and ${math`y`} there is an integer ${math`z`} such that ${math`x + z = y - z`}. For the false one, state its negation precisely and prove the negation.`,
  writeUp: 'proof',
});

const b921 = auto({
  id: 'b9-21',
  source: cite('bop', 'Chapter 9, exercise 21'),
  title: t`Primes ninety-seven apart`,
  prompt: t`True or false: there exist prime numbers ${math`p`} and ${math`q`} for which ${math`p - q = ${97}`}.`,
  answer: {
    kind: 'choice',
    options: [
      { id: 'f', label: t`False: one of them would be ${2}, and neither ${math`${2} + ${97}`} nor ${math`${2} - ${97}`} is prime.` },
      { id: 't', label: t`True: there are infinitely many primes, so some two of them are ${97} apart.` },
      { id: 'o', label: t`False: ${97} is prime itself.` },
    ],
    correct: 'f',
  },
  solution: [
    t`Suppose for contradiction that ${math`p, q`} are primes with ${math`p - q = ${97}`}. As ${97} is odd, ${math`p`} and ${math`q`} have opposite parity, so one of them is the only even prime, ${2}.`,
    t`If ${math`p = ${2}`}, then ${math`q = -${95}`}, not prime. If ${math`q = ${2}`}, then ${math`p = ${99} = ${9} \times ${11}`}, not prime. Contradiction, so the statement is false.`,
  ],
  reference: 'f',
  verify: () => {
    for (let q = 2; q < 10000; q++) if (isPrime(q) && isPrime(q + 97)) return `found ${q}`;
    return null;
  },
  misconceptions: [
    { response: 't', why: t`Infinitely many primes need not include two at any given distance. Parity rules out an odd distance unless ${2} is involved.` },
    { response: 'o', why: t`Whether ${97} is prime is beside the point. The argument is about the parity of ${math`p`} and ${math`q`}.` },
  ],
  official: { source: cite('bop', 'Solutions, Chapter 9, exercise 21'), answer: 'f', agrees: true },
});

const b930 = auto({
  id: 'b9-30',
  source: cite('bop', 'Chapter 9, exercise 30'),
  title: t`${math`${42}a + ${7}b = ${1}`}`,
  prompt: t`True or false: there exist integers ${math`a`} and ${math`b`} for which ${math`${42}a + ${7}b = ${1}`}.`,
  answer: {
    kind: 'choice',
    options: [
      { id: 'f', label: t`False: ${math`${42}a + ${7}b = ${7}(${6}a + b)`} is a multiple of ${7} for all integers ${math`a, b`}, and ${1} is not.` },
      { id: 't', label: t`True: take ${math`a = ${1}`}, ${math`b = -${6}`}.` },
      { id: 's', label: t`False: small values of ${math`a`} and ${math`b`} do not work.` },
    ],
    correct: 'f',
  },
  solution: [
    t`To disprove the existence statement, prove: for all integers ${math`a, b`}, ${math`${42}a + ${7}b \neq ${1}`}.`,
    t`${math`${42}a + ${7}b = ${7}(${6}a + b)`}, a multiple of ${7}. A multiple of ${7} is ${0} or at least ${7} in size, so it is never ${1}.`,
  ],
  reference: 'f',
  verify: () => {
    for (let a = -100; a <= 100; a++) if ((1 - 42 * a) % 7 === 0) return `found a = ${a}`;
    return null;
  },
  misconceptions: [
    { response: 't', why: t`${math`${42} \times ${1} + ${7} \times (-${6}) = ${0}`}, not ${1}.` },
    { response: 's', why: t`Small values failing is not a disproof: the claim is about all integers. The divisibility argument covers them all at once.` },
  ],
});

const b920 = auto({
  id: 'b9-20',
  source: cite('bop', 'Chapter 9, exercise 20'),
  title: t`Primes a thousand apart`,
  prompt: t`Prove or disprove: there exist prime numbers ${math`p`} and ${math`q`} with ${math`p - q = ${1000}`}. It is true; prove it by giving primes ${math`p`} and ${math`q`}.`,
  answer: {
    kind: 'witness', count: 2, names: ['p', 'q'], example: 'p = 1013, q = 13',
    check: ([p, q]) => {
      if (p === undefined || q === undefined || p.den !== 1n || q.den !== 1n) return 'Give two whole numbers.';
      if (p.num - q.num !== 1000n) return `p - q is ${p.num - q.num}, not 1000.`;
      if (!isPrime(Number(q.num))) return `${q.num} is not prime.`;
      return isPrime(Number(p.num)) ? null : `${p.num} is not prime.`;
    },
  },
  solution: [t`An existence statement is proved by one example. Try small primes ${math`q`} and test ${math`q + ${1000}`}: ${math`q = ${13}`} gives ${1013}, which has no prime factor up to ${31} (and ${math`${32}^{${2}} > ${1013}`}), so it is prime.`],
  reference: 'p = 1013, q = 13',
  verify: () => same('1013 and 13 prime', isPrime(1013) && isPrime(13), true),
  misconceptions: [{ response: 'p = 1003, q = 3', why: t`${math`${1003} = ${17} \times ${59}`} is not prime.` }],
});

const b92 = auto({
  id: 'b9-2',
  source: cite('bop', 'Chapter 9, exercise 2'),
  title: t`A prime-looking polynomial`,
  prompt: t`Disprove: for every natural number ${math`n`}, the integer ${math`${2}n^{${2}} - ${4}n + ${31}`} is prime. Give a counterexample ${math`n`}.`,
  answer: {
    kind: 'witness', count: 1, names: ['n'], example: 'n = 30',
    check: ([v]) => {
      if (v === undefined || v.den !== 1n || v.num < 1n) return 'Give a natural number.';
      const n = Number(v.num);
      const val = 2 * n * n - 4 * n + 31;
      return isPrime(val) ? `${val} is prime.` : null;
    },
  },
  solution: [
    t`The values for ${math`n = ${1}, ${2}, ${3}, \ldots`} are ${29}, ${31}, ${37}, ... and stay prime for a long time, which is why the claim is tempting.`,
    t`${math`n = ${30}`} gives ${math`${1800} - ${120} + ${31} = ${1711} = ${29} \times ${59}`}, not prime. (Also ${math`n = ${31}`} gives ${math`${1829} = ${31} \times ${59}`}.)`,
  ],
  reference: 'n = 30',
  verify: () => same('first counterexample', Array.from({ length: 40 }, (_, i) => i + 1).find((n) => !isPrime(2 * n * n - 4 * n + 31)), 30),
  misconceptions: [{ response: 'n = 29', why: t`${math`n = ${29}`} gives ${1597}, which is prime.` }],
});

// ---------------------------------------------------------------- Cambridge problems: gates (batch 7)

/*
 * Outline for marking ns2-q7-ii (20 marks):
 * 1. Answer: no such integers (2).
 * 2. Finds a common factor of 3381 and 2646 that does not divide 21: 3381 = 3 x 7^2 x 23 and
 *    2646 = 2 x 3^3 x 7^2, so 49 (or 147, their HCF) divides both (6).
 * 3. Then 49 divides 3381x + 2646y for all integers x and y, as each term is a multiple of 49 (6).
 * 4. 49 does not divide 21, so no x, y work; the statement "for all x, y, 3381x + 2646y != 21" is
 *    proved, which is the negation of the existence claim (6).
 */
const ns2q7ii = supervision({
  id: 'ns2-q7-ii',
  source: cite('ia-ns-sheet-2', 'Q7, second question'),
  title: t`No integers make twenty-one`,
  prompt: t`Do there exist integers ${math`x`} and ${math`y`} with ${math`${3381}x + ${2646}y = ${21}`}? Prove your answer.`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

export const disproof: TopicContent = {
  topicId: 'proof.disproof',
  goal: t`Disprove ${math`\exists x\, P(x)`} by proving ${math`\forall x\, \neg P(x)`}, and disprove a statement by contradiction.`,
  objective: t`Show that something cannot exist, by proving the universal negation or by contradiction.`,
  why: t`STEP and the Tripos often ask "prove or disprove"; half the time the answer is a proof of impossibility.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`Disproving "there exists"` },
    { kind: 'hook', text: t`Is there a real number ${mx} with ${math`x^{${4}} < x < x^{${2}}`}? Try ${math`\frac{${1}}{${2}}`}: the first inequality holds, the second fails. Try ${2}: the second holds, the first fails. After ten failures you still have not shown that no such number exists. What would?` },
    { kind: 'narrative', text: t`A universal claim, "every ${mx} has property ${mP}", falls to one counterexample. An existence claim is the opposite kind of statement, and it is disproved the opposite way: a single non-example says nothing, because some other ${mx} might still work. You must rule out every ${mx} at once.` },
    { kind: 'theorem', name: t`Negating an existence statement`, statement: t`${math`\neg\left(\exists x \in S,\ P(x)\right)`} is equivalent to ${math`\forall x \in S,\ \neg P(x)`}. So to disprove ${math`\exists x \in S,\ P(x)`}, prove that ${math`P(x)`} is false for every ${math`x \in S`}.` },
    {
      kind: 'definition',
      name: t`Disproof of an existence statement`,
      formal: t`A [[disproof-of-existence|disproof of an existence statement]] ${math`\exists x \in S,\ P(x)`} is a proof of ${math`\forall x \in S,\ \neg P(x)`}: a direct, contrapositive, or contradiction proof of "if ${math`x \in S`}, then ${math`\neg P(x)`}", with ${mx} arbitrary.`,
      plain: t`Show that no element of ${math`S`} can have the property, by an argument about an arbitrary element. For ${math`\exists a, b \in \mathbb{Z},\ ${42}a + ${7}b = ${1}`}: for every ${math`a, b`}, ${math`${42}a + ${7}b = ${7}(${6}a + b)`} is a multiple of ${7}, so it is never ${1}.`,
    },
    { kind: 'section', title: t`Disproof by contradiction` },
    { kind: 'narrative', text: t`Often the cleanest route is contradiction: assume the existence statement is true, name the object it promises, and follow it until something impossible happens. Then nothing like it can exist. Here is the hook, settled.` },
    { kind: 'theorem', statement: t`There is no real number ${mx} with ${math`x^{${4}} < x < x^{${2}}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Assume one exists`, text: t`Suppose ${mx} is real with ${math`x^{${4}} < x < x^{${2}}`}.` },
        { label: t`It is positive`, text: t`${math`x > x^{${4}} \ge ${0}`}, so ${math`x > ${0}`}.`, why: { q: t`Why is ${math`x^{${4}} \ge ${0}`}?`, a: t`${math`x^{${4}} = (x^{${2}})^{${2}}`} is a square, and squares of real numbers are never negative.` } },
        { label: t`Divide by it`, text: t`Dividing by the positive number ${mx} keeps the inequalities: ${math`x^{${3}} < ${1} < x`}.` },
        { label: t`Subtract one and factor`, text: t`${math`x^{${3}} - ${1} < ${0} < x - ${1}`}, and ${math`x^{${3}} - ${1} = (x - ${1})(x^{${2}} + x + ${1})`}.`, why: { q: t`Where does the factorisation come from?`, a: t`It is the difference of two cubes, ${math`a^{${3}} - b^{${3}} = (a - b)(a^{${2}} + ab + b^{${2}})`}, with ${math`a = x`}, ${math`b = ${1}`}. Multiply out to check.` } },
        { label: t`Cancel the positive factor`, text: t`${math`x - ${1} > ${0}`}, so from ${math`(x - ${1})(x^{${2}} + x + ${1}) < ${0}`}, dividing by ${math`x - ${1}`} gives ${math`x^{${2}} + x + ${1} < ${0}`}.` },
        { label: t`Contradiction`, text: t`But ${math`x > ${0}`} makes ${math`x^{${2}} + x + ${1} > ${0}`}. So no such ${mx} exists.` },
      ],
    },
    checkFrom(negGen, { s: 3 }, t`The negation of "there is an ${mx} with ${mP}" is "every ${mx} fails ${mP}". Here that is ${math`x^{${2}} + ${1} \ge ${2}x`} for all real ${mx}, true because ${math`x^{${2}} - ${2}x + ${1} = (x - ${1})^{${2}} \ge ${0}`}.`),
    { kind: 'section', title: t`Mixed quantifiers` },
    { kind: 'narrative', text: t`Statements of the form "for all ${mx} there is a ${math`z`}" combine both kinds. Take the claim: for all integers ${mx} and ${math`y`} with ${math`x < y`}, there is an integer ${math`z`} with ${math`x < z < y`}. Its negation swaps each quantifier, keeps the condition ${math`x < y`} (the negation of "if ${mP}, then ${math`Q`}" is "${mP} and not ${math`Q`}"), and negates the rest: there are integers ${mx} and ${math`y`} with ${math`x < y`} such that for every integer ${math`z`}, ${math`x < z < y`} fails.` },
    { kind: 'narrative', text: t`So the disproof has two layers. The outer "there are" needs one example: ${math`x = ${0}`}, ${math`y = ${1}`}. The inner "for every ${math`z`}" is a disproof of an existence statement, so it needs an argument about an arbitrary integer ${math`z`}. If ${math`z \le ${0}`}, then ${math`${0} < z`} fails. If ${math`z > ${0}`}, then ${math`z`} is one of ${1}, ${2}, ${3}, and so on, so ${math`z \ge ${1}`} and ${math`z < ${1}`} fails. Every integer ${math`z`} is covered, not just the few you tried.` },
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`"There are integers ${math`a, b`} with ${math`${6}a + ${9}b = ${3}`}" is false, because ${math`a = ${1}`}, ${math`b = ${1}`} gives ${15}.`, counterexample: t`One failure says nothing about other values: ${math`a = -${1}`}, ${math`b = ${1}`} gives ${math`-${6} + ${9} = ${3}`}. The statement is true.` },
    { kind: 'pitfall', claim: t`A computer search finding no example up to a million disproves the existence statement.`, counterexample: t`For ${math`n^{${2}} + n + ${41}`}, every ${math`n`} from ${0} to ${39} gives a prime; the first composite value is at ${math`n = ${40}`}. Patterns can hold for a long time and then stop, and existence claims can first come true far out. Only an argument covers all cases.` },
    { kind: 'pitfall', claim: t`To disprove ${math`\exists x\, P(x)`}, show ${math`\exists x\, \neg P(x)`}.`, counterexample: t`"There is an even prime" is true, yet ${3} is an odd prime, so ${math`\exists x\, \neg P(x)`} holds too. The negation is ${math`\forall x\, \neg P(x)`}.` },
    { kind: 'takeaway', text: t`To disprove "there exists", prove "for every, not": by a general argument or by contradiction, never by a failed search.` },
  ],
  examples: [
    ex93,
    worked(linGen, { p: 10, q: 15, c: 7 }, t`Combinations of ${10} and ${15}`),
    worked(sqGen, { n: 30 }, t`${30} is not a difference of squares`),
  ],
  generators: [linGen, primeGen, negGen, sqGen],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['disproof-of-existence'],
  cambridge: withUses([sw115proof, b921, b930, b920, b92, ns2q7ii], {
    'sw-1-1-5-proof': { sections: ['Disproving "there exists"', 'Mixed quantifiers'], note: t`Proving one statement and disproving the other through its negation` },
    'ns2-q7-ii': { sections: ['Disproof by contradiction'], note: t`Showing no integers work by a common factor of the coefficients` },
  }),
  gate: ['sw-1-1-5-proof', 'ns2-q7-ii'],
  recall: [
    { front: t`What is the negation of ${math`\exists x \in S,\ P(x)`}?`, back: t`${math`\forall x \in S,\ \neg P(x)`}.` },
    { front: t`How do you disprove a statement ${mP} by contradiction?`, back: t`Assume ${mP} is true and deduce a contradiction.` },
    { front: t`Why can a failed search never disprove an existence statement?`, back: t`It checks finitely many cases; the negation is a claim about every case, which needs an argument.` },
  ],
  proofOrder: [
    {
      title: t`No real ${mx} has ${math`x^{${4}} < x < x^{${2}}`}`,
      steps: [
        t`Suppose some real ${mx} has ${math`x^{${4}} < x < x^{${2}}`}.`,
        t`Then ${math`x > x^{${4}} \ge ${0}`}, so ${mx} is positive.`,
        t`Divide by ${mx}: ${math`x^{${3}} < ${1} < x`}.`,
        t`So ${math`(x - ${1})(x^{${2}} + x + ${1}) < ${0} < x - ${1}`}, giving ${math`x^{${2}} + x + ${1} < ${0}`}.`,
        t`That is impossible for positive ${mx}, a contradiction.`,
      ],
    },
  ],
};

