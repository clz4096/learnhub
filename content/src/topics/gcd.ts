/**
 * num.gcd: the greatest common divisor, characterised by its universal property (it is a
 * common divisor, and every common divisor divides it), and its laws. The lesson follows
 * the CST notes (printed pages 207 to 238: D(n) and CD(m, n) with Examples 68 and 69, the
 * Key Lemma 72 and Corollary 73, Definition 78, Corollary 80, and Lemma 81 on commutativity,
 * associativity, and linearity) and the 2023-24 official solutions to supervision exercises
 * 3.1.3, 3.2.1, and 3.2.6. Book of Proof Chapter 5, exercise 31, and Chapter 7, exercises 31
 * and 32 give more problems.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { int, pick } from '../math';
import { divisors, factorise, gcd } from '../numbers';
import { generator, type Misconception } from '../problem';
import { computedTex, math, setOf, t, type Span } from '../rich';
import { worked, workedCambridge, type TopicContent } from '../topic';
import type { Rational } from '../math';

const [mm, mn, md] = [math`m`, math`n`, math`d`];
const cd = (a: number, b: number): Span => math`\mathrm{CD}(${a}, ${b})`;
const commonDivisors = (a: number, b: number): number[] => divisors(a).filter((d) => b % d === 0);
const factTex = (n: number): Span => computedTex(factorise(n).map(([p, e]) => (e === 1 ? String(p) : `${p}^{${e}}`)).join(' \\times '));

/** A witness check that the values are exactly the given set. */
function isExactly(want: readonly number[], what: string): (vs: readonly Rational[]) => string | null {
  return (vs) => {
    const got = [...new Set(vs.map((v) => (v.den === 1n ? Number(v.num) : NaN)))];
    if (got.some((x) => Number.isNaN(x))) return 'Give whole numbers.';
    const extra = got.find((x) => !want.includes(x));
    if (extra !== undefined) return `${extra} is not ${what}.`;
    const missing = want.filter((x) => !got.includes(x));
    return missing.length === 0 ? null : `${missing.length === 1 ? 'One number is' : `${missing.length} numbers are`} missing.`;
  };
}

// ---------------------------------------------------------------- common divisors

interface CdP { a: number; b: number }

const commonDivisorsGen = generator<CdP>({
  id: 'common-divisors',
  skill: 'List CD(m, n), the common divisors of two numbers: exactly the divisors of gcd(m, n).',
  params: (rng) => {
    for (;;) {
      const g = pick(rng, [6, 8, 10, 12, 15, 18, 20, 24, 28, 30, 36]);
      const [x, y] = [int(rng, 2, 15), int(rng, 2, 15)];
      if (gcd(x, y) === 1 && x !== y) return { a: g * x, b: g * y };
    }
  },
  sane: ({ a, b }) => (divisors(gcd(a, b)).length >= 4 && a !== b ? null : 'out of range'),
  problem: ({ a, b }) => {
    const g = gcd(a, b);
    const want = commonDivisors(a, b);
    return {
      prompt: t`List the set ${cd(a, b)} of common divisors of ${a} and ${b}, separated by commas.`,
      answer: { kind: 'witness', count: { min: 1, max: 40 }, unordered: true, example: want.join(', '), check: isExactly(want, `a common divisor of ${a} and ${b}`) },
      solution: [
        t`${math`${a} = ${factTex(a)}`} and ${math`${b} = ${factTex(b)}`}. Their greatest common divisor is ${math`\gcd(${a}, ${b}) = ${g}`}.`,
        t`Every common divisor divides the gcd, and every divisor of the gcd divides both numbers, so ${math`${cd(a, b)} = D(${g}) = ${setOf(want)}`}.`,
      ],
    };
  },
  solve: ({ a, b }) => {
    // Trial division of every number up to the smaller one.
    const out: number[] = [];
    for (let d = 1; d <= Math.min(a, b); d++) if (a % d === 0 && b % d === 0) out.push(d);
    return out.join(', ');
  },
  misconceptions: ({ a, b }): Misconception[] => {
    const want = commonDivisors(a, b);
    const primes = factorise(gcd(a, b)).map(([p]) => p);
    return [
      { response: want.filter((d) => d !== 1).join(', '), why: t`${1} divides every number, so it is a common divisor too.` },
      { response: primes.join(', '), why: t`Those are the common prime divisors. Products of them that divide both numbers count too: every divisor of ${gcd(a, b)}.` },
      { response: String(gcd(a, b)), why: t`That is the greatest common divisor. The set ${cd(a, b)} has every common divisor.` },
    ];
  },
});

// ---------------------------------------------------------------- the values of gcd(kn + d, n)

interface ValP { k: number; d: number }

const possibleValues = generator<ValP>({
  id: 'possible-values',
  skill: 'Use gcd(m, n) = gcd(m - kn, n) to find every value a gcd can take as n varies, as in Book of Proof Chapter 7, exercises 31 and 32.',
  params: (rng) => ({ k: int(rng, 1, 4), d: pick(rng, [4, 6, 8, 9, 10, 12, 14, 15, 16, 18]) }),
  sane: ({ d }) => (divisors(d).length > 2 ? null : 'out of range'),
  problem: ({ k, d }) => {
    const want = divisors(d);
    const lhs = k === 1 ? math`\gcd(n + ${d}, n)` : math`\gcd(${k}n + ${d}, n)`;
    return {
      prompt: t`As ${mn} runs over the positive integers, which values does ${lhs} take? List them all.`,
      answer: { kind: 'witness', count: { min: 1, max: 20 }, unordered: true, example: want.join(', '), check: isExactly(want, 'a value it takes') },
      solution: [
        t`Subtracting a multiple of ${mn} does not change the common divisors (the notes' Key Lemma): ${lhs} ${math`= \gcd(${d}, n)`}.`,
        t`That is always a divisor of ${d}, and every divisor ${md} of ${d} occurs, for ${math`n = d`}. So the values are ${setOf(want)}.`,
      ],
    };
  },
  solve: ({ k, d }) => {
    const seen = new Set<number>();
    for (let n = 1; n <= 200; n++) seen.add(gcd(k * n + d, n));
    return [...seen].sort((x, y) => x - y).join(', ');
  },
  misconceptions: ({ d }): Misconception[] => [
    { response: `1, ${d}`, why: t`Values between ${1} and ${d} occur too: every divisor of ${d} is ${math`\gcd(${d}, n)`} for some ${mn}.` },
    { response: '1', why: t`The gcd is not always ${1}: for ${math`n = ${d}`} it is ${d}.` },
    { response: String(d), why: t`The gcd is ${d} only when ${math`${d} \mid n`}. For other ${mn} it is a smaller divisor of ${d}.` },
  ],
});

// ---------------------------------------------------------------- linearity

interface LinP { l: number; m: number; n: number }

const linearity = generator<LinP>({
  id: 'linearity',
  skill: 'Use linearity, gcd(l m, l n) = l gcd(m, n) (Lemma 81 of the notes), to find a gcd of two numbers with a known common factor.',
  params: (rng) => {
    for (;;) {
      const l = pick(rng, [3, 4, 5, 6, 7, 9, 11, 12, 25, 100]);
      const [m, n] = [int(rng, 6, 60), int(rng, 6, 60)];
      if (m !== n && gcd(m, n) > 1 && gcd(m, n) < Math.min(m, n)) return { l, m, n };
    }
  },
  sane: ({ m, n }) => (gcd(m, n) > 1 && m !== n ? null : 'out of range'),
  problem: ({ l, m, n }) => {
    const g = gcd(m, n);
    return {
      prompt: t`${math`${l * m} = ${l} \times ${m}`} and ${math`${l * n} = ${l} \times ${n}`}. Find ${math`\gcd(${l * m}, ${l * n})`}.`,
      answer: { kind: 'exact', expected: String(l * g) },
      solution: [
        t`Linearity: ${math`\gcd(${l} \times ${m}, ${l} \times ${n}) = ${l} \times \gcd(${m}, ${n})`}.`,
        t`${math`\gcd(${m}, ${n}) = ${g}`}, so the answer is ${math`${l} \times ${g} = ${l * g}`}.`,
      ],
    };
  },
  solve: ({ l, m, n }) => String(gcd(l * m, l * n)),
  misconceptions: ({ l, m, n }): Misconception[] => [
    { response: String(l), why: t`${l} is a common divisor, but ${m} and ${n} still share ${gcd(m, n)}: multiply.` },
    { response: String(gcd(m, n)), why: t`The common factor ${l} divides both numbers too: ${math`\gcd(lm, ln) = l \gcd(m, n)`}.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const [A69, B69] = [1224, 660];
const notes69 = auto({
  id: 'notes-209-example-69',
  source: cite('cst-dm-notes', 'printed page 209, Example 69'),
  title: t`${cd(A69, B69)}`,
  prompt: t`List the set ${cd(A69, B69)} of common divisors of ${A69} and ${B69}.`,
  answer: { kind: 'witness', count: { min: 1, max: 40 }, unordered: true, example: commonDivisors(A69, B69).join(', '), check: isExactly(commonDivisors(A69, B69), `a common divisor of ${A69} and ${B69}`) },
  solution: [
    t`Euclid's algorithm: ${math`\gcd(${A69}, ${B69}) = \gcd(${B69}, ${A69 - B69}) = \gcd(${A69 - B69}, ${B69 - (A69 - B69)}) = \cdots = ${gcd(A69, B69)}`}.`,
    t`The common divisors are the divisors of ${gcd(A69, B69)}: ${setOf(commonDivisors(A69, B69))}, as the notes say.`,
  ],
  reference: commonDivisors(A69, B69).join(', '),
  verify: () => same('trial division of 1 to 660', Array.from({ length: B69 }, (_, i) => i + 1).filter((d) => A69 % d === 0 && B69 % d === 0).join(), '1,2,3,4,6,12'),
  misconceptions: [{ response: '2, 3', why: t`Those are the common primes; their products that divide both numbers, such as ${4}, ${6}, and ${12}, and ${1} itself, are common divisors too.` }],
  official: { source: cite('cst-dm-notes', 'printed page 209, Example 69'), answer: '1, 2, 3, 4, 6, 12', agrees: true },
});

const bop732 = auto({
  id: 'bop-7-32',
  source: cite('bop', 'Chapter 7, exercise 32', true),
  title: t`The values of ${math`\gcd(n, n + ${2})`}`,
  prompt: t`Which values does ${math`\gcd(n, n + ${2})`} take as ${mn} runs over the integers (not both zero)? List them.`,
  answer: { kind: 'witness', count: { min: 1, max: 10 }, unordered: true, example: '1, 2', check: isExactly([1, 2], 'a value it takes') },
  solution: [t`${math`\gcd(n, n + ${2}) = \gcd(n, ${2})`}, which is ${2} when ${mn} is even and ${1} when ${mn} is odd.`],
  reference: '1, 2',
  verify: () => same('n from -50 to 50, n not 0 or -2 together', [...new Set(Array.from({ length: 101 }, (_, i) => i - 50).map((n) => gcd(n, n + 2)))].sort((x, y) => x - y).join(), '1,2'),
  misconceptions: [{ response: '1', why: t`For even ${mn} both numbers are even: ${math`\gcd(${4}, ${6}) = ${2}`}.` }],
  // Exercise 32 is even; its statement says gcd(n, n + 2) is in {1, 2}.
  official: { source: cite('bop', 'Chapter 7, exercise 32, the statement'), answer: '1, 2', agrees: true },
});

const [A6, B6] = [84, 60];
const sheet326 = auto({
  id: 'sheet-3-2-6-numbers',
  source: cite('cst-dm-sw1', 'Exercises 3, 3.2.6', true),
  title: t`${math`\gcd(${13}a + ${8}b, ${5}a + ${3}b)`} with numbers`,
  prompt: t`Exercise ${3}.${2}.${6} says ${math`\gcd(${13}a + ${8}b, ${5}a + ${3}b) = \gcd(a, b)`} for positive integers. Check it for ${math`a = ${A6}`}, ${math`b = ${B6}`}: what is ${math`\gcd(${13 * A6 + 8 * B6}, ${5 * A6 + 3 * B6})`}?`,
  answer: { kind: 'exact', expected: String(gcd(A6, B6)) },
  solution: [
    t`The official solution subtracts one argument from the other repeatedly, which does not change the gcd: ${math`(${13}a + ${8}b, ${5}a + ${3}b) \to (${8}a + ${5}b, \ldots) \to \cdots \to (b, a)`}.`,
    t`So the gcd is ${math`\gcd(${A6}, ${B6}) = ${gcd(A6, B6)}`}. Directly: ${math`${13 * A6 + 8 * B6} = ${factTex(13 * A6 + 8 * B6)}`} and ${math`${5 * A6 + 3 * B6} = ${factTex(5 * A6 + 3 * B6)}`}.`,
  ],
  reference: String(gcd(A6, B6)),
  verify: () => same('the two numbers by Euclid', gcd(13 * A6 + 8 * B6, 5 * A6 + 3 * B6), gcd(A6, B6)),
  misconceptions: [{ response: String(gcd(13, 5)), why: t`That is the gcd of the coefficients ${13} and ${5}. The identity is about the numbers: ${math`\gcd(${13 * A6 + 8 * B6}, ${5 * A6 + 3 * B6})`}.` }],
  official: { source: cite('cst-dm-sols-2324-3', '3.2.6'), answer: String(gcd(A6, B6)), agrees: true },
});

const sheet313 = supervision({
  id: 'sheet-3-1-3',
  source: cite('cst-dm-sw1', 'Exercises 3, 3.1.3'),
  title: t`The gcd divides every combination`,
  prompt: t`Prove that for all positive integers ${mm} and ${mn}, and integers ${math`k`} and ${math`l`}, ${math`\gcd(m, n) \mid (k m + l n)`}.`,
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-3', '3.1.3'),
});
const sheet321 = supervision({
  id: 'sheet-3-2-1',
  source: cite('cst-dm-sw1', 'Exercises 3, 3.2.1'),
  title: t`When the gcd is one of the numbers`,
  prompt: t`Prove that for all positive integers ${mm} and ${mn}, ${math`\gcd(m, n) = m`} if and only if ${math`m \mid n`}. Give the proof from the universal property: to show ${math`g = \gcd(m, n)`}, show ${math`g \mid m`}, ${math`g \mid n`}, and that every common divisor divides ${math`g`}.`,
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-3', '3.2.1'),
});
const sheet326proof = supervision({
  id: 'sheet-3-2-6',
  source: cite('cst-dm-sw1', 'Exercises 3, 3.2.6'),
  title: t`A gcd that does not change`,
  prompt: t`Prove that for all positive integers ${math`a`} and ${math`b`}, ${math`\gcd(${13}a + ${8}b, ${5}a + ${3}b) = \gcd(a, b)`}. Which lemma lets you subtract one argument from the other?`,
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-3', '3.2.6'),
});
const bop531 = supervision({
  id: 'bop-5-31',
  source: cite('bop', 'Chapter 5, exercise 31'),
  title: t`The gcd and the remainder`,
  prompt: t`Suppose the division algorithm applied to ${math`a`} and ${math`b`} yields ${math`a = qb + r`}. Prove that ${math`\gcd(a, b) = \gcd(r, b)`}. Compare with the notes' Key Lemma ${72}: ${math`\mathrm{CD}(m, n) = \mathrm{CD}(m', n)`} when ${math`m \equiv m' \pmod{n}`}.`,
  writeUp: 'proof',
  official: cite('bop', 'Solutions, Chapter 5, exercise 31'),
});

// ---------------------------------------------------------------- lesson

export const gcdTopic: TopicContent = {
  topicId: 'num.gcd',
  goal: t`Define ${math`\gcd(m, n)`} by its universal property, find ${math`\mathrm{CD}(m, n)`} as the divisors of the gcd, and use the laws ${math`\gcd(m, n) = \gcd(m - kn, n)`} and ${math`\gcd(lm, ln) = l \gcd(m, n)`}.`,
  lesson: [
    { kind: 'p', text: t`The notes start from sets: ${math`D(n)`}, the divisors of ${mn}, and ${math`\mathrm{CD}(m, n) = \{d \in \mathbb{N} : d \mid m \land d \mid n\}`}, the [[common-divisor|common divisors]]. Example ${69}: ${math`${cd(A69, B69)} = ${setOf(commonDivisors(A69, B69))}`}. Computing divisors is hard; the greatest common divisor turns out to be easy.` },
    { kind: 'rule', text: t`The [[gcd|greatest common divisor]] of ${mm} and ${mn} is the natural number ${math`g`} with ${math`g \mid m`} and ${math`g \mid n`}, such that every common divisor ${md} of ${mm} and ${mn} divides ${math`g`}. In one line: ${math`d \mid m \land d \mid n \iff d \mid \gcd(m, n)`}. So ${math`\mathrm{CD}(m, n) = D(\gcd(m, n))`}.` },
    { kind: 'p', text: t`Key Lemma ${72}: if ${math`m \equiv m' \pmod{n}`} then ${math`\mathrm{CD}(m, n) = \mathrm{CD}(m', n)`}, because a common divisor of ${mm} and ${mn} divides ${math`m' = m + kn`}. So ${math`\gcd(m, n) = \gcd(\mathrm{rem}(m, n), n)`}, the step of Euclid's algorithm, and ${math`\gcd(n, n + ${2}) = \gcd(n, ${2})`}, which is ${1} or ${2}.` },
    { kind: 'p', text: t`The universal property proves laws without computing. Linearity (Lemma ${81}): ${math`\gcd(lm, ln) = l \gcd(m, n)`}, so ${math`\gcd(${300}, ${450}) = ${150} \gcd(${2}, ${3}) = ${150}`}. Commutativity and associativity follow the same way: two numbers that divide each other are equal.` },
    { kind: 'p', text: t`And ${math`\gcd(m, n)`} divides every combination ${math`km + ln`} (Corollary ${80}). So if some combination equals ${1}, as ${math`${3} \times ${5} - ${2} \times ${7} = ${1}`}, then ${math`\gcd(${5}, ${7}) = ${1}`}.` },
  ],
  examples: [
    workedCambridge(notes69),
    worked(possibleValues, { k: 1, d: 6 }, t`The values of ${math`\gcd(n + ${6}, n)`}`),
    worked(linearity, { l: 12, m: 18, n: 30 }, t`A gcd by linearity`),
  ],
  generators: [commonDivisorsGen, possibleValues, linearity],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['common-divisor', 'gcd'],
  cambridge: [bop732, sheet326, sheet313, sheet321, sheet326proof, bop531],
};
