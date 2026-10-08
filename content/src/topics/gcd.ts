/**
 * num.gcd: the greatest common divisor, characterised by its universal property (it is a
 * common divisor, and every common divisor divides it), and its laws. The lesson follows
 * the CST notes (printed pages 207 to 238: D(n) and CD(m, n) with Examples 68 and 69, the
 * Key Lemma 72 and Corollary 73, Definition 78, Corollary 80, and Lemma 81 on commutativity,
 * associativity, and linearity) and the 2023-24 official solutions to supervision exercises
 * 3.1.3, 3.2.1, and 3.2.6. Book of Proof Chapter 5, exercise 31, and Chapter 7, exercises 31
 * and 32 give more problems.
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { int, pick } from '../math';
import { divisors, factorise, gcd } from '../numbers';
import { generator, type Misconception } from '../problem';
import { computedTex, math, setOf, t, type Span } from '../rich';
import { quickCheck, worked, workedCambridge, type TopicContent } from '../topic';
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
  prompt: t`List the values taken by ${math`\gcd(n, n + ${2})`} as ${mn} runs over the integers.`,
  answer: { kind: 'witness', count: { min: 1, max: 10 }, unordered: true, example: '1, 2', check: isExactly([1, 2], 'a value it takes') },
  solution: [
    t`A common divisor of ${mn} and ${math`n + ${2}`} divides their difference ${2}, and a common divisor of ${mn} and ${2} divides ${math`n + ${2}`}. So ${math`\gcd(n, n + ${2}) = \gcd(n, ${2})`}.`,
    t`That is ${2} when ${mn} is even and ${1} when ${mn} is odd.`,
    t`A common divisor divides every difference.`,
  ],
  nudge: t`Not quite. Try a few even and a few odd values of ${mn}, then ask why.`,
  hints: [
    t`What is ${math`\gcd(n, n + ${2})`} for ${math`n = ${4}, ${5}, ${6}, ${7}`}?`,
    t`If ${md} divides both ${mn} and ${math`n + ${2}`}, which small number must ${md} divide?`,
    t`Which divisors of that number actually occur, and for which ${mn}?`,
  ],
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
  prompt: t`Evaluate ${math`\gcd(${13 * A6 + 8 * B6}, ${5 * A6 + 3 * B6})`}, the value of ${math`\gcd(${13}a + ${8}b, ${5}a + ${3}b)`} at ${math`a = ${A6}`}, ${math`b = ${B6}`}.`,
  answer: { kind: 'exact', expected: String(gcd(A6, B6)) },
  solution: [
    t`${math`${13 * A6 + 8 * B6} = ${factTex(13 * A6 + 8 * B6)}`} and ${math`${5 * A6 + 3 * B6} = ${factTex(5 * A6 + 3 * B6)}`}.`,
    t`The shared primes, each to the smaller power: ${math`${factTex(gcd(A6, B6))} = ${gcd(A6, B6)}`}. This equals ${math`\gcd(${A6}, ${B6})`}, as Exercise ${3}.${2}.${6} predicts.`,
    t`Check a general identity on one case before proving it.`,
  ],
  nudge: t`Not quite. Run Euclid's algorithm on the two numbers, or compare their prime factorisations.`,
  hints: [
    t`Which method finds the gcd of two given numbers quickly?`,
    t`What remainder does ${13 * A6 + 8 * B6} leave on division by ${5 * A6 + 3 * B6}, and what is the next step?`,
    t`Does the result agree with ${math`\gcd(${A6}, ${B6})`}?`,
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
  hints: [
    t`What does ${math`\gcd(m, n)`} divide, by definition?`,
    t`With ${math`g = \gcd(m, n)`}, how can ${mm} and ${mn} be written with ${math`g`} as a factor?`,
    t`How does ${math`k m + l n`} factor once ${mm} and ${mn} are written that way?`,
  ],
  official: cite('cst-dm-sols-2324-3', '3.1.3'),
});
const sheet321 = supervision({
  id: 'sheet-3-2-1',
  source: cite('cst-dm-sw1', 'Exercises 3, 3.2.1'),
  title: t`When the gcd is one of the numbers`,
  prompt: t`Prove that for all positive integers ${mm} and ${mn}, ${math`\gcd(m, n) = m`} if and only if ${math`m \mid n`}, using the universal property of the gcd.`,
  writeUp: 'proof',
  hints: [
    t`For the forward direction, what does ${math`\gcd(m, n) = m`} say about how ${mm} and ${mn} are related?`,
    t`By the universal property, which three facts show that a number ${math`g`} is ${math`\gcd(m, n)`}?`,
    t`For the backward direction, why does ${mm} satisfy each of those three facts when ${math`m \mid n`}?`,
  ],
  official: cite('cst-dm-sols-2324-3', '3.2.1'),
});
const sheet326proof = supervision({
  id: 'sheet-3-2-6',
  source: cite('cst-dm-sw1', 'Exercises 3, 3.2.6'),
  title: t`A gcd that does not change`,
  prompt: t`Prove that for all positive integers ${math`a`} and ${math`b`}, ${math`\gcd(${13}a + ${8}b, ${5}a + ${3}b) = \gcd(a, b)`}.`,
  writeUp: 'proof',
  hints: [
    t`Which lemma says a gcd is unchanged when one argument is replaced by its difference with the other?`,
    t`What is ${math`(${13}a + ${8}b) - (${5}a + ${3}b)`}, and how can that step be repeated?`,
    t`Where does the chain of subtractions end, and why does every step keep the gcd?`,
  ],
  official: cite('cst-dm-sols-2324-3', '3.2.6'),
});
const bop531 = supervision({
  id: 'bop-5-31',
  source: cite('bop', 'Chapter 5, exercise 31'),
  title: t`The gcd and the remainder`,
  prompt: t`Suppose the division algorithm applied to ${math`a`} and ${math`b`} yields ${math`a = qb + r`}. Prove that ${math`\gcd(a, b) = \gcd(r, b)`}.`,
  writeUp: 'proof',
  hints: [
    t`If ${md} divides ${math`a`} and ${math`b`}, why does ${md} divide ${math`r = a - qb`}?`,
    t`If ${md} divides ${math`r`} and ${math`b`}, why does ${md} divide ${math`a`}?`,
    t`What do these two facts say about the sets of common divisors ${math`\mathrm{CD}(a, b)`} and ${math`\mathrm{CD}(r, b)`}, as in the notes' Key Lemma ${72}?`,
  ],
  official: cite('bop', 'Solutions, Chapter 5, exercise 31'),
});

// ---------------------------------------------------------------- lesson

const [HA, HB] = [12, 18];
const [KM, KN, KK] = [100, 36, 2];
const mk = math`k`;

export const gcdTopic: TopicContent = {
  topicId: 'num.gcd',
  goal: t`Define ${math`\gcd(m, n)`} by its universal property, find ${math`\mathrm{CD}(m, n)`} as the divisors of the gcd, and use the laws ${math`\gcd(m, n) = \gcd(m - kn, n)`} and ${math`\gcd(lm, ln) = l \gcd(m, n)`}.`,
  objective: t`Define the gcd by its universal property, and prove that subtracting multiples does not change it.`,
  why: t`The gcd drives Euclid's algorithm, modular inverses, and unique factorisation, which come next.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`Common divisors` },
    { kind: 'hook', text: t`List the divisors that ${HA} and ${HB} share: ${setOf(commonDivisors(HA, HB))}. Now look at the largest, ${gcd(HA, HB)}, and list its divisors: ${setOf(divisors(gcd(HA, HB)))}. The same list. Coincidence? No, and that fact is the real definition of the greatest common divisor.` },
    { kind: 'narrative', text: t`The CST notes start from sets. Write ${math`D(n)`} for the set of positive divisors of ${mn}, and look at the divisors two numbers share.` },
    {
      kind: 'definition',
      name: t`Common divisors`,
      formal: t`For integers ${mm} and ${mn}, the set of [[common-divisor|common divisors]] is ${math`\mathrm{CD}(m, n) = \{d \in \mathbb{N} : d \mid m \land d \mid n\}`}.`,
      plain: t`the positive whole numbers that divide both. The notes' Example ${69}: ${math`${cd(A69, B69)} = ${setOf(commonDivisors(A69, B69))}`}.`,
    },
    {
      kind: 'definition',
      name: t`Greatest common divisor`,
      formal: t`For natural numbers ${mm} and ${mn}, a [[gcd|greatest common divisor]] is a natural number ${math`g`} with ${math`g \mid m`} and ${math`g \mid n`} such that every common divisor ${md} of ${mm} and ${mn} satisfies ${math`d \mid g`}. It is unique, and written ${math`\gcd(m, n)`}.`,
      plain: t`the common divisor that every other common divisor divides. For ${HA} and ${HB} it is ${gcd(HA, HB)}: each of ${setOf(commonDivisors(HA, HB))} divides ${gcd(HA, HB)}.`,
    },
    {
      kind: 'p',
      text: t`This is called a universal property: ${math`g`} is not just bigger than the other common divisors, it is divisible by all of them. In one line: ${math`d \mid m \land d \mid n \iff d \mid \gcd(m, n)`}. So ${math`\mathrm{CD}(m, n) = D(\gcd(m, n))`}, which is the hook's pattern.`,
      why: { q: t`Why is there only one such ${math`g`}?`, a: t`If ${math`g`} and ${math`g'`} both have the property, each is a common divisor, so each divides the other. Positive integers that divide each other are equal (the divisibility lesson). So ${math`g = g'`}.` },
    },
    { kind: 'p', text: t`That a gcd always exists is proved by Euclid's algorithm, in the next lesson. For positive numbers it is also the largest common divisor, so the name fits.` },
    { kind: 'section', title: t`The Key Lemma` },
    { kind: 'narrative', text: t`Finding divisors is slow. The gcd turns out to be fast, because of one observation: subtracting a multiple of ${mn} from ${mm} does not change which numbers divide both. Watch it on numbers: ${math`\gcd(${KM}, ${KN})`} and ${math`\gcd(${KM} - ${KK} \times ${KN}, ${KN}) = \gcd(${KM - KK * KN}, ${KN})`} are both ${gcd(KM, KN)}.` },
    { kind: 'theorem', name: t`Key Lemma`, statement: t`For integers ${mm}, ${mn}, and ${mk}, ${math`\mathrm{CD}(m, n) = \mathrm{CD}(m - kn, n)`}. Hence ${math`\gcd(m, n) = \gcd(m - kn, n)`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Common divisors of the first pair`, text: t`Let ${math`d \in \mathrm{CD}(m, n)`}, so ${math`m = ad`} and ${math`n = bd`} for integers ${math`a`}, ${math`b`}.`, plain: t`Unpack both divisibilities, each with its own witness. With ${math`m = ${KM}`}, ${math`n = ${KN}`}, ${math`d = ${4}`}: ${math`a = ${KM / 4}`}, ${math`b = ${KN / 4}`}.` },
        { label: t`They divide the new number`, text: t`Then ${math`m - kn = ad - kbd = (a - kb)d`}, so ${math`d \mid (m - kn)`}, and ${math`d \in \mathrm{CD}(m - kn, n)`}.`, plain: t`Factor ${md} out of both terms. ${math`a - kb`} is an integer, so it is a witness.` },
        { label: t`And back again`, text: t`Conversely, let ${math`d \in \mathrm{CD}(m - kn, n)`}: ${math`m - kn = ed`} and ${math`n = bd`}. Then ${math`m = (m - kn) + kn = (e + kb)d`}, so ${math`d \mid m`}.`, plain: t`Add the multiple back. The same factoring step works in reverse.` },
        { label: t`Same sets, same gcd`, text: t`The two sets of common divisors are equal. The gcd is determined by its set of common divisors, so the gcds are equal.`, plain: t`${math`\gcd(m, n)`} is the element of ${math`\mathrm{CD}(m, n)`} that all the others divide, so equal sets give equal gcds.` },
      ],
    },
    { kind: 'p', text: t`Taking ${math`k = \mathrm{quo}(m, n)`} gives ${math`\gcd(m, n) = \gcd(\mathrm{rem}(m, n), n)`}: the step of Euclid's algorithm. It also answers questions about whole families: ${math`\gcd(n + ${2}, n) = \gcd(${2}, n)`}, which is ${2} for even ${mn} and ${1} for odd ${mn}.` },
    quickCheck({
      prompt: t`Use the Key Lemma: what is ${math`\gcd(${101}, ${100})`}?`,
      answer: { kind: 'exact', expected: String(gcd(101, 100)) },
      reference: String(gcd(101, 100)),
      why: t`${math`\gcd(${101}, ${100}) = \gcd(${101} - ${100}, ${100}) = \gcd(${1}, ${100}) = ${1}`}. Neighbouring numbers share no factor above ${1}.`,
    }),
    {
      kind: 'pitfall',
      claim: t`${math`\gcd(m, n)`} is the product of the primes that ${mm} and ${mn} share.`,
      counterexample: t`${8} and ${24} share only the prime ${2}, yet ${math`\gcd(${8}, ${24}) = ${gcd(8, 24)}`}. Powers count: take each shared prime to the smaller of its two powers, here ${math`${2}^{${3}}`}.`,
    },
    { kind: 'section', title: t`Laws from the universal property` },
    { kind: 'narrative', text: t`The universal property proves laws without any computing. The method: to show ${math`g = \gcd(m, n)`}, check that ${math`g`} divides both, and that every common divisor divides ${math`g`}.` },
    { kind: 'rule', text: t`Linearity (the notes' Lemma ${81}): for a positive integer ${math`l`}, ${math`\gcd(lm, ln) = l \gcd(m, n)`}. For example ${math`\gcd(${300}, ${450}) = ${150} \gcd(${2}, ${3}) = ${gcd(300, 450)}`}. And ${math`\gcd(m, n)`} divides every combination ${math`km + ln`} (Corollary ${80}), since it divides ${mm} and ${mn}.` },
    { kind: 'p', text: t`So if some combination equals ${1}, the gcd is ${1}. For instance ${math`${3} \times ${5} - ${2} \times ${7} = ${3 * 5 - 2 * 7}`}, so ${math`\gcd(${5}, ${7})`} divides ${1}, and ${math`\gcd(${5}, ${7}) = ${gcd(5, 7)}`}.` },
    { kind: 'takeaway', text: t`${math`\gcd(m, n)`} is the common divisor every common divisor divides, and subtracting multiples of one argument from the other never changes it.` },
  ],
  examples: [
    { ...workedCambridge(notes69), examiner: t`The gcd found first, then the common divisors read off as its divisors, rather than by testing every number.` },
    worked(possibleValues, { k: 1, d: 6 }, t`The values of ${math`\gcd(n + ${6}, n)`}`),
    worked(linearity, { l: 12, m: 18, n: 30 }, t`A gcd by linearity`),
  ],
  generators: [commonDivisorsGen, possibleValues, linearity],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['common-divisor', 'gcd'],
  cambridge: withUses([bop732, sheet326, sheet313, sheet321, sheet326proof, bop531], {
    'sheet-3-2-6': { sections: ['The Key Lemma'], note: t`Subtracting multiples without changing the gcd` },
    'sheet-3-2-1': { sections: ['Laws from the universal property'], note: t`A gcd equal to one of its arguments, from the universal property` },
    'sheet-3-1-3': { sections: ['Common divisors'], note: t`The gcd divides every combination` },
  }),
  // The supervision proofs, hardest first. The numerical check of 3.2.6 is left out: it is one gcd computation.
  gate: ['sheet-3-2-6', 'sheet-3-2-1', 'sheet-3-1-3'],
  recall: [
    { front: t`Define ${math`\gcd(m, n)`} by its universal property.`, back: t`The natural number ${math`g`} with ${math`g \mid m`}, ${math`g \mid n`}, and ${math`d \mid g`} for every common divisor ${md}.` },
    { front: t`What is ${math`\mathrm{CD}(m, n)`} in terms of the gcd?`, back: t`${math`D(\gcd(m, n))`}: the divisors of the gcd.` },
    { front: t`State the Key Lemma.`, back: t`${math`\mathrm{CD}(m, n) = \mathrm{CD}(m - kn, n)`}, so ${math`\gcd(m, n) = \gcd(m - kn, n)`}.` },
    { front: t`State linearity of the gcd.`, back: t`${math`\gcd(lm, ln) = l \gcd(m, n)`} for positive ${math`l`}.` },
  ],
  proofOrder: [
    {
      title: t`Subtracting a multiple keeps the common divisors`,
      steps: [
        t`Let ${md} divide ${mm} and ${mn}: ${math`m = ad`}, ${math`n = bd`}.`,
        t`Then ${math`m - kn = (a - kb)d`}, so ${md} divides ${math`m - kn`}.`,
        t`Conversely, a common divisor of ${math`m - kn`} and ${mn} divides ${math`(m - kn) + kn = m`}.`,
        t`So the sets of common divisors are equal, and so are the gcds.`,
      ],
    },
  ],
};
