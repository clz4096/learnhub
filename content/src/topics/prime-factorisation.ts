/**
 * pre.prime-factorisation: Writing a whole number as a product of prime powers. From STEP
 * Support Assignment 12, Q4 (the warm-down): the bell ringers whose ages multiply to 2,450.
 * The hints start from 2450 = 2 × 5² × 7², list the twenty possible sets of ages
 * systematically, and deduce the Imam's age (32) and the Rabbi's (50).
 */
import type { Rational } from '@learnhub/mastery';
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { int, pick, q, sample, upTo } from '../math';
import { generator, type Misconception } from '../problem';
import { computedTex, dmath, listOf, math, t, type Rich } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';
import { namedAnswer } from '../prep-a';

const PRIMES = [2, 3, 5, 7, 11, 13] as const;

const isPrime = (n: number): boolean => {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
};

/** The prime factors of n with repeats, smallest first, by trial division. */
function primeFactors(n: number): number[] {
  const out: number[] = [];
  let m = n;
  for (let d = 2; d * d <= m; d++) while (m % d === 0) { out.push(d); m /= d; }
  if (m > 1) out.push(m);
  return out;
}

/** The exponent of each prime in n, as [prime, exponent] pairs in increasing order. */
function powers(n: number): [number, number][] {
  const out = new Map<number, number>();
  for (const p of primeFactors(n)) out.set(p, (out.get(p) ?? 0) + 1);
  return [...out.entries()];
}

/** 2 \times 5^{2} \times 7^{2}: the index form as LaTeX, built from computed numbers. */
const indexTex = (n: number): string => powers(n).map(([p, e]) => (e === 1 ? `${p}` : `${p}^{${e}}`)).join(' \\times ');

/** The repeated division of n by its smallest prime factor, one line per step. */
function divisionSteps(n: number): Rich[] {
  const steps: Rich[] = [];
  let m = n;
  for (const p of primeFactors(n)) {
    steps.push(t`${math`${m} \div ${p} = ${m / p}`}`);
    m /= p;
  }
  return steps;
}

/** The witness answer for "list the prime factors": every value a prime, multiplying to n. */
function factorCheck(n: number) {
  return (vals: readonly Rational[]): string | null => {
    const xs = vals.map((v) => (v.den === 1n && v.num > 0n ? Number(v.num) : NaN));
    if (xs.some((x) => Number.isNaN(x))) return 'Each factor is a positive whole number.';
    const notPrime = xs.find((x) => !isPrime(x));
    if (notPrime !== undefined) return `${notPrime} is not prime${notPrime > 1 ? `: it is ${primeFactors(notPrime).join(' × ')}` : ''}. Split it into primes.`;
    const prod = xs.reduce((a, b) => a * b, 1);
    return prod === n ? null : `Those multiply to ${prod}, not ${n}.`;
  };
}

/** The unordered triples a ≤ b ≤ c of positive whole numbers with product n, by search. */
function triples(n: number): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let a = 1; a * a * a <= n; a++) {
    if (n % a !== 0) continue;
    for (let b = a; a * b * b <= n; b++) if ((n / a) % b === 0) out.push([a, b, n / a / b]);
  }
  return out;
}

const divisorCount = (n: number): number => upTo(n).filter((d) => n % d === 0).length;

// ---------------------------------------------------------------- generators

interface FactorP { fs: number[] }

/** A product of three to six small primes with at least one repeat, at most 6,000. */
function factorParams(rng: () => number): FactorP {
  for (;;) {
    const k = int(rng, 3, 6);
    const fs = Array.from({ length: k }, () => pick(rng, PRIMES)).sort((a, b) => a - b);
    const n = fs.reduce((a, b) => a * b, 1);
    if (n <= 6000 && new Set(fs).size < fs.length && new Set(fs).size > 1) return { fs };
  }
}

const factorise = generator<FactorP>({
  id: 'factorise',
  skill: 'Write a whole number as a product of primes by repeated division, as the STEP hints do with 2,450.',
  params: factorParams,
  sane: ({ fs }) => (fs.length >= 3 && fs.every((p) => isPrime(p)) && fs.reduce((a, b) => a * b, 1) <= 6000 ? null : 'out of range'),
  problem: ({ fs }) => {
    const n = fs.reduce((a, b) => a * b, 1);
    return {
      prompt: t`Write ${n} as a product of primes: list the primes, repeating each as often as it divides, separated by commas.`,
      answer: { kind: 'witness', count: { min: 1, max: 20 }, unordered: true, example: fs.join(', '), check: factorCheck(n) },
      solution: [
        t`Divide by the smallest prime that goes in, again and again:`,
        ...divisionSteps(n),
        t`So ${math`${n} = ${computedTex(fs.join(' \\times '))} = ${computedTex(indexTex(n))}`}.`,
      ],
    };
  },
  solve: ({ fs }) => primeFactors(fs.reduce((a, b) => a * b, 1)).join(', '),
  misconceptions: ({ fs }): Misconception[] => {
    const n = fs.reduce((a, b) => a * b, 1);
    const [p, e] = powers(n).find(([, x]) => x >= 2) as [number, number];
    const merged = [...fs.filter((x) => x !== p), p * p, ...Array.from({ length: e - 2 }, () => p)];
    return [
      { response: merged.join(', '), why: t`${p * p} is not prime: it is ${math`${p} \times ${p}`}. Every factor in the list must be prime, so keep dividing.` },
      { response: [...new Set(fs)].join(', '), why: t`Each prime appears as many times as it divides. Those multiply to ${[...new Set(fs)].reduce((a, b) => a * b, 1)}, not ${n}: keep dividing until you reach ${1}.` },
    ];
  },
});

interface ExpP { fs: number[]; p: number }

const exponent = generator<ExpP>({
  id: 'exponent',
  skill: 'Read the power of a prime in a prime factorisation.',
  params: (rng) => {
    for (;;) {
      const { fs } = factorParams(rng);
      const ps = powers(fs.reduce((a, b) => a * b, 1));
      const [p, e] = pick(rng, ps);
      // Another prime with a different power, so "the power of the wrong prime" is a real slip.
      if (ps.some(([q, f]) => q !== p && f !== e)) return { fs, p };
    }
  },
  sane: ({ fs, p }) => (fs.includes(p) && fs.reduce((a, b) => a * b, 1) <= 6000 ? null : 'out of range'),
  problem: ({ fs, p }) => {
    const n = fs.reduce((a, b) => a * b, 1);
    const e = fs.filter((x) => x === p).length;
    return {
      prompt: t`In the prime factorisation of ${n}, written in index form, what is the power of ${p}?`,
      answer: { kind: 'exact', expected: String(e) },
      solution: [
        ...divisionSteps(n),
        t`So ${math`${n} = ${computedTex(indexTex(n))}`}, and ${p} appears ${e} ${e === 1 ? 'time' : 'times'}: the power of ${p} is ${e}.`,
      ],
    };
  },
  solve: ({ fs, p }) => {
    // Divide out p as often as possible.
    let m = fs.reduce((a, b) => a * b, 1);
    let e = 0;
    while (m % p === 0) { m /= p; e++; }
    return String(e);
  },
  misconceptions: ({ fs, p }): Misconception[] => {
    const n = fs.reduce((a, b) => a * b, 1);
    const ps = powers(n);
    const other = ps.find(([q, f]) => q !== p && f !== fs.filter((x) => x === p).length) as [number, number];
    return [
      { response: String(other[1]), why: t`That is the power of ${other[0]}. Count only the factors equal to ${p}.` },
      { response: String(fs.length), why: t`That counts every prime factor. The power of ${p} counts only the ${p}s.` },
    ];
  },
});

interface DivP { fs: number[] }

const divisors = generator<DivP>({
  id: 'divisors',
  skill: 'Count the divisors of a number from its prime factorisation: choose a power of each prime.',
  params: factorParams,
  sane: ({ fs }) => (fs.reduce((a, b) => a * b, 1) <= 6000 ? null : 'out of range'),
  problem: ({ fs }) => {
    const n = fs.reduce((a, b) => a * b, 1);
    const ps = powers(n);
    const count = ps.reduce((a, [, e]) => a * (e + 1), 1);
    return {
      prompt: t`${math`${n} = ${computedTex(indexTex(n))}`}. How many positive whole numbers divide ${n}, counting ${1} and ${n} itself?`,
      answer: { kind: 'exact', expected: String(count) },
      solution: [
        t`A divisor of ${n} is a product of the same primes with powers no bigger: ${ps.map(([p, e]) => t`the power of ${p} is one of ${listOf(Array.from({ length: e + 1 }, (_, i) => i))}`).reduce<Rich>((acc, r, i) => (i === 0 ? r : [...acc, ...t`; `, ...r]), [])}.`,
        t`By the product rule that is ${math`${computedTex(ps.map(([, e]) => `${e + 1}`).join(' \\times '))} = ${count}`} divisors.`,
      ],
    };
  },
  solve: ({ fs }) => String(divisorCount(fs.reduce((a, b) => a * b, 1))),
  misconceptions: ({ fs }): Misconception[] => {
    const ps = powers(fs.reduce((a, b) => a * b, 1));
    const count = ps.reduce((a, [, e]) => a * (e + 1), 1);
    return [
      { response: String(ps.reduce((a, [, e]) => a * e, 1)), why: t`Each power can also be ${0}: the power of a prime runs from ${0} up to its exponent, one more choice than the exponent.` },
      { response: String(ps.reduce((a, [, e]) => a + e + 1, 0)), why: t`The choices for different primes multiply, by the product rule; they do not add.` },
      { response: String(count - 2), why: t`The question counts ${1} and the number itself.` },
    ];
  },
});

interface TripleP { fs: number[] }

const tripleCount = generator<TripleP>({
  id: 'triples',
  skill: 'List systematically the ways to write a number as a product of three whole numbers, as in STEP Support Assignment 12, Q4.',
  params: (rng) => {
    for (;;) {
      const fs = sample(rng, [2, 2, 3, 3, 5, 7], int(rng, 3, 4)).sort((a, b) => a - b);
      const n = fs.reduce((a, b) => a * b, 1);
      if (triples(n).length <= 12) return { fs };
    }
  },
  sane: ({ fs }) => (fs.length >= 3 && triples(fs.reduce((a, b) => a * b, 1)).length <= 12 ? null : 'out of range'),
  problem: ({ fs }) => {
    const n = fs.reduce((a, b) => a * b, 1);
    const ts = triples(n);
    return {
      prompt: t`Three people's ages are whole numbers whose product is ${n}. How many different sets of three ages are possible? (Order does not matter; ages may repeat, and an age of ${1} is allowed.)`,
      answer: { kind: 'exact', expected: String(ts.length) },
      solution: [
        t`Factorise first: ${math`${n} = ${computedTex(indexTex(n))}`}.`,
        t`List the sets with the ages in increasing order, by the smallest age and then the middle one, so none is missed or counted twice:`,
        ...ts.map(([a, b, c]) => t`${math`${a} \times ${b} \times ${c}`}`),
        t`That is ${ts.length} sets.`,
      ],
    };
  },
  solve: ({ fs }) => {
    // Count ordered triples by brute force, then group them into sets.
    const n = fs.reduce((a, b) => a * b, 1);
    const seen = new Set<string>();
    for (let a = 1; a <= n; a++) for (let b = 1; b <= n / a; b++) if (n % (a * b) === 0) seen.add([a, b, n / a / b].sort((x, y) => x - y).join(','));
    return String(seen.size);
  },
  misconceptions: ({ fs }): Misconception[] => {
    const n = fs.reduce((a, b) => a * b, 1);
    let ordered = 0;
    for (let a = 1; a <= n; a++) for (let b = 1; b <= n / a; b++) if (n % (a * b) === 0) ordered++;
    const ts = triples(n);
    return [
      { response: String(ordered), why: t`That counts orders: ${math`${1} \times ${fs[0] as number} \times ${n / (fs[0] as number)}`} and ${math`${fs[0] as number} \times ${1} \times ${n / (fs[0] as number)}`} are the same set of ages. List each set once, in increasing order.` },
      { response: String(ts.filter(([a]) => a > 1).length), why: t`An age of ${1} is allowed, so sets with a ${1} count too.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

const AGES = 2450;
/** The hints' table: sets of three ages with product 2450, and each sum. */
const ageSets = triples(AGES);
const sums = ageSets.map(([a, b, c]) => a + b + c);
const smallest = [...new Set(ageSets.map(([a]) => a))];
/** The Imam's age: the only half-sum that is not unique, so he could not answer. */
const imamAge = (): number => {
  const repeated = [...new Set(sums)].filter((s) => sums.filter((x) => x === s).length > 1);
  return repeated.length === 1 ? (repeated[0] as number) / 2 : NaN;
};
/** The Rabbi's age: the one age that leaves exactly one set when everyone else in the room is younger. */
const rabbiAge = (): number => {
  const imam = imamAge();
  const candidates = ageSets.filter(([a, b, c]) => a + b + c === 2 * imam);
  const fits = upTo(200).filter((r) => r > imam && candidates.filter((x) => Math.max(...x) < r).length === 1);
  return fits.length === 1 ? (fits[0] as number) : NaN;
};

const puzzle = t`A Rabbi, an Imam, and a Bishop were having a chat when three bell ringers entered the room. The Imam asked the Bishop how old the bell ringers were. "If you multiplied their three ages together," said the Bishop, "you'd get ${AGES}. But if you added them, you'd get twice your age." The Imam thought, and said: "I haven't enough information to solve that." "It may help," offered the Rabbi, "to know that I am older than anyone else here in the room." "Yes, indeed it would," replied the Imam. "Now I know their ages." All ages are whole numbers.`;

const a12factor = auto({
  id: 'a12-q4-factorise',
  source: cite('step-f12', 'Q4, first step', true),
  title: t`The prime factors of ${AGES}`,
  prompt: t`The STEP hints start the bell ringers puzzle by writing ${AGES} as a product of prime factors. Do it: list the primes, with repeats, separated by commas.`,
  answer: { kind: 'witness', count: { min: 1, max: 20 }, unordered: true, example: primeFactors(AGES).join(', '), check: factorCheck(AGES) },
  solution: [
    ...divisionSteps(AGES),
    t`So ${math`${AGES} = ${computedTex(indexTex(AGES))}`}, as in the hints.`,
  ],
  reference: primeFactors(AGES).join(', '),
  verify: () => same('2450 by trial division', primeFactors(AGES).join(','), [2, 5, 5, 7, 7].join(',')),
  misconceptions: [{ response: '2, 25, 49', why: t`${25} and ${49} are squares of primes, not primes. Split them.` }],
  // The hints: 2450 = 2 × 5² × 7².
  official: { source: cite('step-f12-hints', 'Q4'), answer: '2, 5, 5, 7, 7', agrees: true },
});

const a12sets = auto({
  id: 'a12-q4-sets',
  source: cite('step-f12', 'Q4', true),
  title: t`How many sets of ages`,
  prompt: t`Three bell ringers' ages are whole numbers whose product is ${AGES}. How many different sets of three ages are possible? (Order does not matter; some sets are implausible, such as an age of ${1}, but count them.)`,
  answer: { kind: 'exact', expected: String(ageSets.length) },
  solution: [
    t`With ${math`${AGES} = ${computedTex(indexTex(AGES))}`}, list the sets in increasing order by the smallest age: it is one of ${listOf(smallest)}, since the smallest of three numbers with product ${AGES} is at most ${math`\sqrt[${3}]{${AGES}}`}, about ${Math.round(Math.cbrt(AGES) * 10) / 10}.`,
    t`By smallest age: ${smallest.map((m) => t`${m}, ${ageSets.filter(([a]) => a === m).length} sets`).reduce<Rich>((acc, r, i) => (i === 0 ? r : [...acc, ...t`; `, ...r]), [])}.`,
    t`That is ${ageSets.length} sets, the rows of the hints' table.`,
    t`Count systematically: put the items in order and fix the smallest first.`,
  ],
  reference: String(ageSets.length),
  verify: () => {
    let ordered = 0;
    const sets = new Set<string>();
    for (let a = 1; a <= AGES; a++) for (let b = 1; b <= AGES / a; b++) if (AGES % (a * b) === 0) { ordered++; sets.add([a, b, AGES / a / b].sort((x, y) => x - y).join(',')); }
    return same('sets of ages, by brute force', sets.size, ageSets.length) ?? (ordered > sets.size ? null : 'ordered count');
  },
  misconceptions: [{ response: String(ageSets.filter(([a]) => a > 1).length), why: t`The puzzle counts every set, including those with an age of ${1}.` }],
  official: { source: cite('step-f12-hints', 'Q4, the table of possibilities'), answer: '20', agrees: true },
  nudge: t`Not quite. List the sets by their smallest age, which is at most the cube root of ${AGES}, and count each group.`,
  hints: [
    t`What is the prime factorisation of ${AGES}?`,
    t`With the ages in increasing order, how large can the smallest one be?`,
    t`For each possible smallest age, in how many ways can the rest split into two ages, the second at least the first?`,
  ],
});

const a12imam = auto({
  id: 'a12-q4-imam',
  source: cite('step-f12', 'Q4', true),
  title: t`How old is the Imam?`,
  prompt: t`${puzzle} The Imam knows his own age, and so the sum of the three ages. Why could he not answer at first? Use that to find the Imam's age.`,
  answer: { kind: 'exact', expected: String(imamAge()) },
  solution: [
    t`Each set of ages has a sum, and the Imam's age is half of it. The Imam knows his age, so he knows the sum.`,
    t`He could not answer, so his sum belongs to more than one set. In the list of ${ageSets.length} sets only one sum repeats: ${2 * imamAge()}, from ${math`${5} + ${10} + ${49}`} and ${math`${7} + ${7} + ${50}`}.`,
    t`So the Imam is ${math`${2 * imamAge()} \div ${2} = ${imamAge()}`}.`,
    t`In a logic puzzle, "could not answer" is information: it rules out every case that is unique.`,
  ],
  reference: String(imamAge()),
  verify: () => same('the only repeated half-sum', imamAge(), 32),
  misconceptions: [{ response: String(2 * imamAge()), why: t`That is the sum of the ages, which is twice the Imam's age.` }],
  official: { source: cite('step-f12-hints', 'Q4'), answer: '32', agrees: true },
  nudge: t`Not quite. The Imam knew the sum and still could not answer: look for a sum shared by two different sets.`,
  hints: [
    t`What does the Imam know about the sum of the three ages?`,
    t`Why could he not answer at first, in terms of the sets with his sum?`,
    t`In the list of sets, which sum appears more than once?`,
  ],
});

const a12rabbi = auto({
  id: 'a12-q4-rabbi',
  source: cite('step-f12', 'Q4'),
  title: t`How old is the Rabbi?`,
  prompt: t`${puzzle} How old is the Rabbi?`,
  answer: { kind: 'exact', expected: String(rabbiAge()) },
  solution: [
    t`From the previous problem, the Imam is ${imamAge()} and the ages are ${math`${5}, ${10}, ${49}`} or ${math`${7}, ${7}, ${50}`}.`,
    t`The Rabbi is older than everyone else in the room. If he were ${51} or more, both sets would still be possible, and the Imam could not decide.`,
    t`If he were ${50}, the set with a ${50} would be ruled out, leaving ${math`${5}, ${10}, ${49}`}. So the Rabbi is ${rabbiAge()}.`,
    t`A clue helps only if it splits the remaining cases; find the value for which it does.`,
  ],
  reference: String(rabbiAge()),
  verify: () => same('the one age that decides it', rabbiAge(), 50),
  misconceptions: [{ response: '51', why: t`At ${51} the Rabbi is older than both ${49} and ${50}, so both sets stay possible and the Imam still could not decide.` }],
  official: { source: cite('step-f12-hints', 'Q4'), answer: '50', agrees: true },
  nudge: t`Not quite. The Rabbi's remark must rule out exactly one of the two remaining sets.`,
  hints: [
    t`Which two sets of ages remain after the Imam's first answer?`,
    t`How does "older than anyone else in the room" compare the Rabbi's age with the bell ringers' ages?`,
    t`For which age of the Rabbi does that remark exclude one set but not the other?`,
  ],
});

const a12explain = supervision({
  id: 'a12-q4-explain',
  source: cite('step-f12', 'Q4'),
  title: t`Why the remark helps`,
  prompt: t`${puzzle} Explain the whole solution for a reader who has not seen it: how the list of sets of ages is known to be complete, why the Imam's first answer gives his age, and why the Rabbi's remark settles it only for one age of the Rabbi.`,
  writeUp: 'explanation',
  official: cite('step-f12-hints', 'Q4'),
  hints: [
    t`How can the list of sets be shown to be complete, for example by fixing the smallest age first?`,
    t`Why does the Imam's failure to answer mean that his sum is shared by two sets?`,
    t`For which ages of the Rabbi does his remark rule out exactly one of those two sets?`,
  ],
});

const F10 = 'step-f10' as const;
const F10H = 'step-f10-hints' as const;
// Rule 1 (2026-10-08): set here from pre.primes-and-factors, the earliest topic that teaches everything it needs.
const a10q3iii = auto({
  id: 'a10-q3-iii',
  source: cite(F10, 'Q3(iii)'),
  title: t`Working backwards from ${math`f`}`,
  prompt: t`For a positive integer ${math`N`}, ${math`f(N) = N\left(${1} - \frac{${1}}{p_{${1}}}\right)\left(${1} - \frac{${1}}{p_{${2}}}\right)\cdots\left(${1} - \frac{${1}}{p_{k}}\right)`}, where ${math`p_{${1}}, \ldots, p_{k}`} are the only primes that are factors of ${math`N`}. Find a positive integer ${math`m`} and a prime ${math`p`} such that ${math`f(p^{m}) = ${146410}`}.`,
  answer: namedAnswer(['p', 'm'], [q(11), q(5)], 'Simplify f of a prime power first, then factorise the number.'),
  solution: [
    t`The only prime factor of ${math`p^{m}`} is ${math`p`}, so ${math`f(p^{m}) = p^{m}\left(${1} - \frac{${1}}{p}\right) = p^{m - ${1}}(p - ${1})`}.`,
    t`Factorise: ${math`${146410} = ${10} \times ${14641} = ${10} \times ${11}^{${4}}`}, since ${math`${11}^{${2}} = ${121}`} and ${math`${121}^{${2}} = ${14641}`}.`,
    t`So ${math`p^{m - ${1}}(p - ${1}) = ${11}^{${4}} \times ${10}`} with ${math`p = ${11}`} and ${math`m - ${1} = ${4}`}: ${math`p = ${11}`}, ${math`m = ${5}`}.`,
    t`Simplify the general form, then match it against the factorisation.`,
  ],
  reference: 'p = 11, m = 5',
  verify: () => {
    const found: string[] = [];
    for (const p of [2, 3, 5, 7, 11, 13, 17, 19, 23]) for (let m = 1; m <= 20; m++) if (p ** (m - 1) * (p - 1) === 146410) found.push(`${p},${m}`);
    return same('prime powers with f = 146410', found.join(';'), '11,5');
  },
  misconceptions: [{ response: 'p = 11, m = 4', why: t`${math`f(p^{m}) = p^{m - ${1}}(p - ${1})`}: the power of ${11} is ${math`m - ${1} = ${4}`}, so ${math`m = ${5}`}.` }],
  official: { source: cite(F10H, 'Q3(iii)'), answer: 'p = 11, m = 5', agrees: true },
  nudge: t`Not quite. Simplify ${math`f(p^{m})`} first, then factorise ${146410} and match the two parts.`,
  hints: [
    t`What is ${math`f(p^{m})`} in a simpler form?`,
    t`What is the prime factorisation of ${146410}?`,
    t`Which prime ${math`p`} makes ${math`p^{m - ${1}}(p - ${1})`} match it, and what is ${math`m`}?`,
  ],
});

// Rule 1 (2026-10-08): set here from pre.primes-and-factors, the earliest topic that teaches everything it needs.
const a10q3ib = supervision({
  id: 'a10-q3-i-b',
  source: cite(F10, 'Q3(i)(b), (ii)'),
  title: t`${math`f(N)`} is always an integer`,
  prompt: t`For a positive integer ${math`N`}, ${math`f(N) = N\left(${1} - \frac{${1}}{p_{${1}}}\right)\left(${1} - \frac{${1}}{p_{${2}}}\right)\cdots\left(${1} - \frac{${1}}{p_{k}}\right)`}, where ${math`p_{${1}}, \ldots, p_{k}`} are the only primes that are factors of ${math`N`}. (i) Show that ${math`f(N)`} is an integer for all ${math`N`}. (ii) Prove, or disprove by means of a counterexample, each of the following: (a) ${math`f(m)f(n) = f(mn)`}; (b) ${math`f(p)f(q) = f(pq)`} if ${math`p`} and ${math`q`} are distinct prime numbers; (c) ${math`f(p)f(q) = f(pq)`} only if ${math`p`} and ${math`q`} are distinct prime numbers.`,
  writeUp: 'proof',
  official: cite(F10H, 'Q3'),
  hints: [
    t`For (i), writing ${math`f(N)`} as ${math`\frac{N}{p_{${1}} \cdots p_{k}}(p_{${1}} - ${1}) \cdots (p_{k} - ${1})`}, why is ${math`\frac{N}{p_{${1}} \cdots p_{k}}`} an integer?`,
    t`For (ii)(a), what happens when ${math`m`} and ${math`n`} share a prime factor?`,
    t`For (ii)(c), which small values of ${math`p`} and ${math`q`}, not two distinct primes, might still satisfy ${math`f(p)f(q) = f(pq)`}?`,
  ],
});

// ---------------------------------------------------------------- lesson

const L = 360;
const mn = math`n`;
const T30 = triples(30);

export const primeFactorisation: TopicContent = {
  topicId: 'pre.prime-factorisation',
  goal: t`Write a whole number as a product of primes in index form, and use the factorisation to list or count its divisors.`,
  objective: t`Write a whole number as a product of primes, and use it to count divisors and list factorisations.`,
  why: t`Primes are the atoms of the whole numbers; STEP puzzles and every divisibility proof start here.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`Three ages, one product` },
    { kind: 'hook', text: t`Three bell ringers' ages multiply to ${AGES}. What could the ages be? Trying numbers at random is hopeless. But break ${AGES} into its smallest building blocks, the primes, and every possible set of ages can be listed, with none missed. That is the STEP Support puzzle this lesson builds up to.` },

    { kind: 'section', title: t`Primes and factorisations` },
    { kind: 'definition', name: t`Prime number`, formal: t`An integer ${math`p > ${1}`} is a [[prime-number|prime number]] if its only positive divisors are ${1} and ${math`p`}.`, plain: t`${listOf([2, 3, 5, 7, 11, 13])}, and so on. ${1} is not prime, and ${15} is not, since ${math`${15} = ${3} \times ${5}`}.` },
    { kind: 'theorem', name: t`Factorisations exist`, statement: t`Every integer ${math`n > ${1}`} is a product of primes (a prime itself counts as a product of one prime).` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Suppose not`, text: t`Suppose some integer greater than ${1} is not a product of primes, and let ${mn} be the smallest such integer.` },
        { label: t`It is not prime`, text: t`${mn} is not prime, since a prime is a product of one prime. So ${math`n = ab`} with ${math`${1} < a, b < n`}.` },
        { label: t`The smaller factors are products of primes`, text: t`${math`a`} and ${math`b`} are greater than ${1} and smaller than ${mn}, so, as ${mn} was the smallest exception, each is a product of primes.` },
        { label: t`Contradiction`, text: t`Then ${math`n = ab`} is a product of primes too, which contradicts the choice of ${mn}.` },
      ],
    },
    { kind: 'p', text: t`This is the [[prime-factorisation|prime factorisation]]. The proof also gives a method: divide by the smallest prime that goes in, and repeat on what is left until you reach ${1}. For ${L}:` },
    { kind: 'list', items: divisionSteps(L) },
    { kind: 'definition', name: t`Index form`, formal: t`A factorisation is in [[index-form|index form]] when each prime appears once, with a power: ${math`n = p_{${1}}^{e_{${1}}} p_{${2}}^{e_{${2}}} \cdots p_{r}^{e_{r}}`} with primes ${math`p_{${1}} < p_{${2}} < \cdots < p_{r}`} and powers ${math`e_{i} \ge ${1}`}.`, plain: t`${math`${L} = ${computedTex(primeFactors(L).join(' \\times '))} = ${computedTex(indexTex(L))}`}.` },
    { kind: 'p', text: t`Every route of division gives the same primes with the same powers. That uniqueness is the Fundamental Theorem of Arithmetic, proved later in the course; for now it means one factorisation answers every question about the number.` },
    checkFrom(factorise, { fs: [2, 3, 3, 7] }, t`Divide by ${2}, then ${3} twice, leaving the prime ${7}.`),
    checkFrom(exponent, { fs: [2, 2, 2, 3, 5], p: 2 }, t`${2} divides ${120} three times: ${math`${120} = ${2}^{${3}} \times ${3} \times ${5}`}.`),

    { kind: 'section', title: t`Counting divisors` },
    { kind: 'theorem', name: t`Number of divisors`, statement: t`If ${math`n = p_{${1}}^{e_{${1}}} \cdots p_{r}^{e_{r}}`} in index form, then ${mn} has exactly ${math`(e_{${1}} + ${1})(e_{${2}} + ${1})\cdots(e_{r} + ${1})`} positive divisors.` },
    { kind: 'p', text: t`Why: a divisor of ${mn} uses only the primes of ${mn}, each with a power from ${0} up to its power in ${mn} (this uses uniqueness). That is ${math`e_{i} + ${1}`} choices for each prime, made independently, so the product rule multiplies them. For ${L}: ${powers(L).map(([p, e]) => t`the power of ${p} is one of ${listOf(Array.from({ length: e + 1 }, (_, i) => i))}`).reduce<Rich>((acc, r, i) => (i === 0 ? r : [...acc, ...t`; `, ...r]), [])}, so ${math`${computedTex(powers(L).map(([, e]) => `${e + 1}`).join(' \\times '))} = ${divisorCount(L)}`} divisors.`, why: { q: t`Why may the power of ${0} be chosen?`, a: t`A power of ${0} means that prime is left out: ${math`p^{${0}} = ${1}`}. Choosing ${0} for every prime gives the divisor ${1}; choosing every full power gives ${mn} itself.` } },
    checkFrom(divisors, { fs: [2, 2, 3, 3, 5] }, t`${math`${180} = ${2}^{${2}} \times ${3}^{${2}} \times ${5}`}, so ${math`(${2} + ${1})(${2} + ${1})(${1} + ${1}) = ${18}`}.`),

    { kind: 'section', title: t`Listing systematically` },
    { kind: 'narrative', text: t`The STEP hints to the bell ringers puzzle say: write ${AGES} as a product of prime factors, then carefully and logically write down all possible sets of three ages. "Logically" means in an order that cannot miss a case: by the smallest age, in increasing order, and for each smallest age by the middle one.` },
    { kind: 'p', text: t`For a product of ${30}: the smallest age is at most ${math`\sqrt[${3}]{${30}}`}, about ${Math.round(Math.cbrt(30) * 10) / 10}, so it is at most ${3}. Listing in order gives ${T30.length} sets: ${computedTex(T30.map((x) => `(${x.join(', ')})`).join(',\\ '))}.`, why: { q: t`Why is the smallest at most the cube root?`, a: t`If all three were bigger than ${math`\sqrt[${3}]{${30}}`}, their product would be bigger than ${30}.` } },
    checkFrom(tripleCount, { fs: [2, 3, 7] }, t`List by the smallest number, ${1} or ${2}: ${computedTex(triples(42).map((x) => `(${x.join(', ')})`).join(',\\ '))}.`),

    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`${1} is a prime number.`, counterexample: t`A prime must be greater than ${1}. If ${1} were prime, factorisations would not be unique: ${math`${6} = ${2} \times ${3} = ${1} \times ${2} \times ${3}`}.` },
    { kind: 'pitfall', claim: t`${math`${AGES} = ${2} \times ${25} \times ${49}`} is its prime factorisation.`, counterexample: t`${25} and ${49} are not prime: ${math`${25} = ${5}^{${2}}`} and ${math`${49} = ${7}^{${2}}`}. Keep dividing until every factor is prime.` },
    { kind: 'pitfall', claim: t`The number of divisors of ${math`p^{a}q^{b}`} is ${math`ab`}.`, counterexample: t`${math`${12} = ${2}^{${2}} \times ${3}`} has divisors ${listOf(upTo(12).filter((d) => 12 % d === 0))}: ${divisorCount(12)}, which is ${math`(${2} + ${1})(${1} + ${1})`}, not ${math`${2} \times ${1}`}. The power ${0} is a choice too.` },
    { kind: 'takeaway', text: t`Divide by the smallest prime until you reach ${1}: the primes found, in index form, determine every divisor of the number.` },
  ],
  examples: [
    { ...workedCambridge(a12factor), examiner: t`The examiner looks for each division shown and the result in index form, the starting point the hints insist on.` },
    worked(divisors, { fs: [2, 2, 3, 5, 5] }, t`The divisors of ${2 * 2 * 3 * 5 * 5}`),
    worked(tripleCount, { fs: [2, 2, 3, 5] }, t`Three ages with product ${2 * 2 * 3 * 5}`),
  ],
  generators: [factorise, exponent, divisors, tripleCount],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['prime-number', 'prime-factorisation', 'index-form'],
  cambridge: withUses([a12sets, a12imam, a12rabbi, a12explain, a10q3iii, a10q3ib], {
    'a10-q3-i-b': { sections: ['Primes and factorisations'], note: t`Proving a product formula is a whole number and testing three claims`, needs: ['proof.counterexample'] },
    'a10-q3-iii': { sections: ['Primes and factorisations'], note: t`Working backwards from the formula to a prime power` },
    'a12-q4-explain': { sections: ['Primes and factorisations', 'Listing systematically'], note: t`Listing every factorisation into three ages and reasoning from what each speaker knows` },
    'a12-q4-rabbi': { sections: ['Primes and factorisations', 'Listing systematically'], note: t`Using the factorisations and the clues to pin down an age` },
    'a12-q4-imam': { sections: ['Primes and factorisations', 'Listing systematically'], note: t`Finding the sum that two factorisations share` },
    'a12-q4-sets': { sections: ['Primes and factorisations', 'Listing systematically'], note: t`Counting the ways to split a prime factorisation into three factors` },
  }),
  // The written reasoning first, then the puzzle's answers, which need every earlier step, then the count. Then
  // Assignment 10 Q3(iii), set here by Rule 1 (2026-10-08): a prime power read off a factorisation. Its parts (i)(b)
  // and (ii) also need counterexamples, from proof.counterexample, so they are practice.
  gate: ['a12-q4-explain', 'a12-q4-rabbi', 'a12-q4-imam', 'a12-q4-sets', 'a10-q3-iii'],
  recall: [
    { front: t`Define a prime number.`, back: t`An integer greater than ${1} whose only positive divisors are ${1} and itself.` },
    { front: t`Why does every integer above ${1} have a prime factorisation?`, back: t`A smallest exception would not be prime, so it splits into two smaller factors, each a product of primes: a contradiction.` },
    { front: t`The number of divisors of ${math`p_{${1}}^{e_{${1}}} \cdots p_{r}^{e_{r}}`}.`, back: t`${math`(e_{${1}} + ${1})\cdots(e_{r} + ${1})`}.` },
  ],
  proofOrder: [{
    title: t`Every integer above ${1} is a product of primes`,
    steps: [
      t`Suppose not, and let ${mn} be the smallest exception.`,
      t`${mn} is not prime, so ${math`n = ab`} with ${math`${1} < a, b < n`}.`,
      t`${math`a`} and ${math`b`} are smaller, so each is a product of primes.`,
      t`So ${mn} is a product of primes: a contradiction.`,
    ],
  }],
};
