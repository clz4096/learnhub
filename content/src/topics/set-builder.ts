/**
 * sets.comprehension: Membership and set-builder notation. The lesson follows the CST
 * notes, printed pages 198 to 206 (set membership, defining sets, set comprehension, set
 * equality); the problems are the notes' examples and supervision exercise 3.1.1, checked
 * against the official 2023-24 solutions (the 2023-24 sheet is the same as 2025-26's).
 */
import type { Rational } from '@learnhub/mastery';
import { auto, cite, same, supervision } from '../cambridge';
import { gcd, int, pick, q, str, upTo } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { dmath, listOf, math, setOf, t, type Span } from '../rich';
import { worked, workedCambridge, type TopicContent } from '../topic';

const ids = (xs: readonly number[]): string[] => xs.map((x) => `e${x}`);
const options = (xs: readonly number[]): ChoiceOption[] => xs.map((x) => ({ id: `e${x}`, label: t`${x}` }));
const range = (lo: number, hi: number): number[] => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
const domainText = (n: number): Span => setOf([1, 2, 3, '...', n]);
const [mx, mk, mS, mT] = [math`x`, math`k`, math`S`, math`T`];

// ---------------------------------------------------------------- generators

/** A property built from two conditions, with the two common misreadings of it. */
type Cond = { kind: 'gt' | 'ge' | 'lt' | 'le'; m: number } | { kind: 'mult'; k: number } | { kind: 'odd' } | { kind: 'even' };
interface MembersP { n: number; c1: Cond; c2: Cond; join: 'and' | 'or' }

function holds(c: Cond, x: number, strictSlip = false): boolean {
  switch (c.kind) {
    case 'gt': return strictSlip ? x >= c.m : x > c.m;
    case 'ge': return strictSlip ? x > c.m : x >= c.m;
    case 'lt': return strictSlip ? x <= c.m : x < c.m;
    case 'le': return strictSlip ? x < c.m : x <= c.m;
    case 'mult': return x % c.k === 0;
    case 'odd': return x % 2 === 1;
    case 'even': return x % 2 === 0;
  }
}

function condText(c: Cond): Span {
  switch (c.kind) {
    case 'gt': return math`x > ${c.m}`;
    case 'ge': return math`x \ge ${c.m}`;
    case 'lt': return math`x < ${c.m}`;
    case 'le': return math`x \le ${c.m}`;
    case 'mult': return math`x \text{ is a multiple of } ${c.k}`;
    case 'odd': return math`x \text{ is odd}`;
    case 'even': return math`x \text{ is even}`;
  }
}

const memberList = (p: MembersP, slip: 'none' | 'join' | 'boundary' = 'none'): number[] => upTo(p.n).filter((x) => {
  const a = holds(p.c1, x);
  const b = holds(p.c2, x, slip === 'boundary');
  const join = slip === 'join' ? (p.join === 'and' ? 'or' : 'and') : p.join;
  return join === 'and' ? a && b : a || b;
});

const members = generator<MembersP>({
  id: 'members',
  skill: 'Decide which numbers belong to a set given by a property.',
  params(rng) {
    const n = int(rng, 12, 16);
    const c1: Cond = pick(rng, [{ kind: 'odd' }, { kind: 'even' }, { kind: 'mult', k: 3 }, { kind: 'mult', k: 4 }] as Cond[]);
    for (;;) {
      const m = int(rng, 4, n - 4);
      const c2: Cond = { kind: pick(rng, ['gt', 'ge', 'lt', 'le'] as const), m };
      const p: MembersP = { n, c1, c2, join: pick(rng, ['and', 'or'] as const) };
      // At least two members and at least two non-members, so the question has substance.
      const size = memberList(p).length;
      if (size >= 2 && size <= n - 2) return p;
    }
  },
  sane: (p) => (p.n >= 12 && p.n <= 16 && 'm' in p.c2 && p.c2.m >= 4 && p.c2.m <= p.n - 4 && memberList(p).length >= 2 && memberList(p).length <= p.n - 2 ? null : 'out of range'),
  problem(p) {
    const ans = memberList(p);
    return {
      prompt: t`Let ${math`S = \{x \in ${domainText(p.n)} \mid ${condText(p.c1)} \text{ ${p.join} } ${condText(p.c2)}\}`}. Choose every element of ${mS}.`,
      answer: { kind: 'choice', options: options(upTo(p.n)), correct: ids(ans) },
      solution: [
        t`Read it as: ${mS} is the set of ${mx} from ${domainText(p.n)} such that ${condText(p.c1)} ${p.join} ${condText(p.c2)}.`,
        p.join === 'and'
          ? t`"and" means both conditions must hold for the same ${mx}.`
          : t`"or" means at least one condition must hold.`,
        t`Test each ${mx} from ${1} to ${p.n}: ${math`S = ${setOf(ans)}`}.`,
      ],
    };
  },
  solve: (p) => {
    // Membership checked one number at a time from the description, with the boundary
    // compared by subtraction rather than through `holds`.
    const out: number[] = [];
    for (let x = 1; x <= p.n; x++) {
      const one = p.c1.kind === 'odd' ? x % 2 !== 0 : p.c1.kind === 'even' ? x % 2 === 0 : p.c1.kind === 'mult' ? x % p.c1.k === 0 : false;
      const c2 = p.c2 as { kind: 'gt' | 'ge' | 'lt' | 'le'; m: number };
      const d = x - c2.m;
      const two = c2.kind === 'gt' ? d > 0 : c2.kind === 'ge' ? d >= 0 : c2.kind === 'lt' ? d < 0 : d <= 0;
      if (p.join === 'and' ? one && two : one || two) out.push(x);
    }
    return ids(out);
  },
  misconceptions: (p): Misconception[] => [
    { response: ids(memberList(p, 'join')), why: p.join === 'and'
      ? t`That takes numbers that meet either condition. "and" needs both conditions at once.`
      : t`That keeps only numbers that meet both conditions. "or" needs at least one.` },
    { response: ids(memberList(p, 'boundary')), why: t`Check the boundary number ${'m' in p.c2 ? p.c2.m : 0}. A strict sign (${math`<`} or ${math`>`}) leaves it out; ${math`\le`} and ${math`\ge`} let it in.` },
    { response: ids(upTo(p.n).filter((x) => !memberList(p).includes(x))), why: t`Those are the numbers that fail the property. ${mS} keeps the ones that pass it.` },
  ],
});

interface CountP { n: number; k: number }

const countMultiples = generator<CountP>({
  id: 'count-multiples',
  skill: 'Count the elements of a set described by a divisibility property.',
  params: (rng) => ({ n: int(rng, 20, 100), k: int(rng, 3, 9) }),
  sane: ({ n, k }) => (n >= 20 && n <= 100 && k >= 3 && k <= 9 ? null : 'out of range'),
  problem: ({ n, k }) => {
    const c = Math.floor(n / k);
    return {
      prompt: t`How many elements does ${math`\{x \in ${domainText(n)} \mid x \text{ is a multiple of } ${k}\}`} have?`,
      answer: { kind: 'exact', expected: String(c) },
      solution: [
        t`The multiples of ${k} in the set are ${math`${k} \times ${1}, ${k} \times ${2}, \ldots, ${k} \times ${c}`}.`,
        t`The last one is ${k * c}, because ${k * (c + 1)} is more than ${n}. So there are ${c} elements: ${n} divided by ${k}, rounded down, ${math`\left\lfloor \frac{${n}}{${k}} \right\rfloor = ${c}`}.`,
      ],
    };
  },
  solve: ({ n, k }) => String(upTo(n).filter((x) => x % k === 0).length),
  misconceptions: ({ n, k }): Misconception[] => [
    { response: str(q(n, k)), why: t`Dividing is right, but a count is a whole number. Round down: a part of a multiple is not an element.` },
    { response: String(Math.floor(n / k) + 1), why: t`That counts one too many, as if ${0} were in the set. The set starts at ${1}.` },
    { response: String(n - Math.floor(n / k)), why: t`That counts the numbers that are not multiples of ${k}.` },
  ],
});

interface ImageP { a: number; b: number; lo: number; hi: number }

const image = generator<ImageP>({
  id: 'image',
  skill: 'Read a set written as a formula over an index set.',
  params(rng) {
    const lo = int(rng, 0, 1);
    return { a: int(rng, 2, 3), b: int(rng, 0, 5), lo, hi: lo + int(rng, 3, 4) };
  },
  sane: ({ a, b, lo, hi }) => (a >= 2 && a <= 3 && b >= 0 && b <= 5 && lo >= 0 && hi - lo >= 3 && hi <= 5 ? null : 'out of range'),
  problem: ({ a, b, lo, hi }) => {
    const ks = range(lo, hi);
    const ans = ks.map((k) => a * k + b);
    const top = a * (hi + 1) + b;
    const formula = b === 0 ? math`${a}k` : math`${a}k + ${b}`;
    return {
      prompt: t`Let ${math`T = \{${formula} \mid k \in ${setOf(ks)}\}`}. Choose every element of ${mT}.`,
      answer: { kind: 'choice', options: options(range(0, top)), correct: ids(ans) },
      solution: [
        t`The elements are the values of ${formula} as ${mk} runs through ${setOf(ks)}. The ${mk} values are not themselves elements.`,
        t`Substitute each ${mk}: ${math`T = ${setOf(ans)}`}.`,
      ],
    };
  },
  solve: ({ a, b, lo, hi }) => {
    // Search the candidates for numbers of the form ak + b with k in range.
    const out: number[] = [];
    for (let x = 0; x <= a * (hi + 1) + b; x++) if ((x - b) % a === 0 && (x - b) / a >= lo && (x - b) / a <= hi) out.push(x);
    return ids(out);
  },
  misconceptions: ({ a, b, lo, hi }): Misconception[] => [
    { response: ids(range(lo, hi)), why: t`Those are the values of ${mk}. The set holds the values of the formula, so substitute each ${mk} into it.` },
    { response: ids(range(lo + 1, hi + 1).map((k) => a * k + b)), why: t`Each value is one step along. Substitute the ${mk} values exactly as listed, starting with ${math`k = ${lo}`}.` },
  ],
});

// ---------------------------------------------------------------- common divisors

/** D(n) = {d in N : d | n}, by trial division. */
const divisors = (n: number): number[] => upTo(n).filter((d) => n % d === 0);

/** CD(m, n) = {d in N : d | m and d | n}, straight from the definition. */
const commonDivisors = (m: number, n: number): number[] => divisors(Math.min(m, n)).filter((d) => m % d === 0 && n % d === 0);

/** Null when the values are exactly the set, else why not. */
function isTheSet(vals: readonly Rational[], want: readonly number[], member: (x: number) => boolean, describe: string): string | null {
  const xs = vals.map((v) => (v.den === 1n ? Number(v.num) : NaN));
  if (xs.some((x) => Number.isNaN(x))) return 'Every element here is a whole number.';
  const bad = xs.find((x) => !member(x));
  if (bad !== undefined) return `${bad} is not ${describe}.`;
  if (new Set(xs).size !== xs.length) return 'List each element once.';
  const missing = want.filter((x) => !xs.includes(x));
  if (missing.length > 0) return `${missing.length === 1 ? 'One element is' : `${missing.length} elements are`} missing.`;
  return null;
}

interface CdP { g: number; a: number; b: number }

const cd = generator<CdP>({
  id: 'common-divisors',
  skill: 'List a set given by comprehension: the common divisors CD(m, n), as in supervision exercise 3.1.1.',
  params(rng) {
    for (;;) {
      const g = pick(rng, [4, 6, 8, 9, 10, 12, 15, 18]);
      const a = int(rng, 2, 15);
      const b = int(rng, 2, 15);
      if (a !== b && gcd(a, b) === 1) return { g, a, b };
    }
  },
  sane: ({ g, a, b }) => (gcd(a, b) === 1 && a !== b && g * a <= 300 && g * b <= 300 ? null : 'out of range'),
  problem({ g, a, b }) {
    const [m, n] = [g * a, g * b];
    const ans = commonDivisors(m, n);
    return {
      prompt: t`List the elements of ${math`\mathrm{CD}(${m}, ${n}) = \{d \in \mathbb{N} \mid d \text{ divides } ${m} \text{ and } d \text{ divides } ${n}\}`}, separated by commas.`,
      answer: { kind: 'witness', count: { min: 1, max: 40 }, unordered: true, example: ans.join(', '), check: (v) => isTheSet(v, ans, (d) => d >= 1 && m % d === 0 && n % d === 0, `a common divisor of ${m} and ${n}`) },
      solution: [
        t`By definition, ${math`d`} is an element exactly when it divides both numbers. The divisors of ${m} are ${listOf(divisors(m))}.`,
        t`Keep the ones that also divide ${n}: ${math`\mathrm{CD}(${m}, ${n}) = ${setOf(ans)}`}.`,
      ],
    };
  },
  solve: ({ g, a, b }) => {
    // Every common divisor divides the gcd, here g, and every divisor of g is common.
    return divisors(g * gcd(a, b)).join(', ');
  },
  misconceptions: ({ g, a }): Misconception[] => [
    { response: divisors(g * a).join(', '), why: t`Those are all the divisors of the first number. An element must divide both numbers.` },
    { response: String(g), why: t`That is the greatest common divisor only. The set holds every common divisor, including ${1}.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const NOTES = 'cst-dm-notes';
const isPrime = (n: number): boolean => n >= 2 && upTo(Math.floor(Math.sqrt(n))).every((d) => d === 1 || n % d !== 0);

const evenPrimes = auto({
  id: 'notes-205-even-primes',
  source: cite(NOTES, 'printed page 205, Set equality'),
  title: t`The even primes`,
  prompt: t`List the elements of ${math`\{x \in \mathbb{N} \mid ${2} \text{ divides } x \text{ and } x \text{ is prime}\}`}.`,
  answer: { kind: 'witness', count: { min: 1, max: 10 }, unordered: true, example: '2', check: (v) => isTheSet(v, [2], (x) => x % 2 === 0 && isPrime(x), 'an even prime') },
  solution: [
    t`An element must pass both tests: it is even and it is prime.`,
    t`${2} is even and prime. Any larger even number has ${2} as a factor and is bigger than ${2}, so it is not prime.`,
    t`So the set is ${setOf([2])}: the notes' example of two sets that are equal because they have the same elements.`,
  ],
  reference: '2',
  verify: () => same('Even primes below 1000', upTo(1000).filter((x) => x % 2 === 0 && isPrime(x)).join(), '2'),
  misconceptions: [{ response: '2, 3, 5, 7', why: t`Those are primes, but the set also needs ${2} to divide ${math`x`}: only ${2} is even.` }],
});

const interval = auto({
  id: 'notes-202-interval',
  source: cite(NOTES, 'printed page 202, Defining sets'),
  title: t`An interval of integers`,
  prompt: t`The notes write ${math`[-${2}..${3}]`} for ${math`\{n \in \mathbb{Z} \mid -${2} \le n \le ${3}\}`}. List its elements.`,
  answer: { kind: 'witness', count: { min: 1, max: 20 }, unordered: true, example: '-2, -1, 0, 1, 2, 3', check: (v) => isTheSet(v, [-2, -1, 0, 1, 2, 3], (x) => x >= -2 && x <= 3, 'between -2 and 3') },
  solution: [
    t`The elements are the integers from ${-2} to ${3}, both ends included: ${setOf([-2, -1, 0, 1, 2, 3])}.`,
    t`Listing works for a small finite set like this one. For a huge or infinite set, such as the primes, comprehension is the only way to define it.`,
  ],
  reference: '-2, -1, 0, 1, 2, 3',
  verify: () => same('[-2..3]', Array.from({ length: 6 }, (_, i) => i - 2).join(', '), '-2, -1, 0, 1, 2, 3'),
  misconceptions: [{ response: '-1, 0, 1, 2', why: t`Both ends are included: ${math`\le`} lets ${-2} and ${3} in.` }],
});

const cd1224 = auto({
  id: 'notes-208-cd',
  source: cite(NOTES, 'printed page 208, Example 69'),
  title: t`Common divisors`,
  prompt: t`The notes define ${math`\mathrm{CD}(m, n) = \{d \in \mathbb{N} \mid d \text{ divides } m \text{ and } d \text{ divides } n\}`}. List the elements of ${math`\mathrm{CD}(${1224}, ${660})`}.`,
  answer: { kind: 'witness', count: { min: 1, max: 40 }, unordered: true, example: commonDivisors(1224, 660).join(', '), check: (v) => isTheSet(v, commonDivisors(1224, 660), (d) => d >= 1 && 1224 % d === 0 && 660 % d === 0, 'a common divisor of 1224 and 660') },
  solution: [
    t`${math`d`} is an element when it divides both. The notes list the divisors of ${1224} (Example ${68}): ${listOf(divisors(1224))}.`,
    t`Keep those that divide ${660}: ${math`\mathrm{CD}(${1224}, ${660}) = ${setOf(commonDivisors(1224, 660))}`}.`,
  ],
  reference: commonDivisors(660, 1224).reverse().join(', '),
  verify: () => same('CD(1224, 660) against the notes', commonDivisors(1224, 660).join(', '), '1, 2, 3, 4, 6, 12'),
  official: { source: cite(NOTES, 'printed page 208, Example 69'), answer: '1, 2, 3, 4, 6, 12', agrees: true },
});

const sheet311 = auto({
  id: 'sw-3-1-1',
  source: cite('cst-dm-sw1', 'Exercises 3, 3.1.1'),
  title: t`${math`\mathrm{CD}(${666}, ${330})`}`,
  prompt: t`Calculate the set ${math`\mathrm{CD}(${666}, ${330})`} of common divisors of ${666} and ${330}. List its elements, separated by commas.`,
  answer: { kind: 'witness', count: { min: 1, max: 40 }, unordered: true, example: commonDivisors(666, 330).join(', '), check: (v) => isTheSet(v, commonDivisors(666, 330), (d) => d >= 1 && 666 % d === 0 && 330 % d === 0, 'a common divisor of 666 and 330') },
  solution: [
    t`${math`${666} = ${2} \times ${3}^{${2}} \times ${37}`} and ${math`${330} = ${2} \times ${3} \times ${5} \times ${11}`}, so a common divisor can use only the shared primes, ${2} and ${3} once each.`,
    t`So ${math`\mathrm{CD}(${666}, ${330}) = ${setOf(commonDivisors(666, 330))}`}.`,
  ],
  reference: '6, 3, 2, 1',
  verify: () => same('CD(666, 330) by trial division', commonDivisors(666, 330).join(', '), divisors(6).join(', ')),
  misconceptions: [{ response: '6', why: t`${6} is the greatest common divisor. The set holds every common divisor: ${1}, ${2}, and ${3} too.` }],
  official: { source: cite('cst-dm-sols-2324-3', '3.1.1'), answer: '1, 2, 3, 6', agrees: true },
});

const zeroDivisors = auto({
  id: 'notes-205-d0',
  source: cite(NOTES, 'printed page 205, Set equality', true),
  title: t`The divisors of zero`,
  prompt: t`The notes state ${math`\{d \in \mathbb{N} \mid d \text{ divides } ${0}\} = \mathbb{N}`}. Which natural numbers divide ${0}?`,
  answer: { kind: 'choice', options: [{ id: 'all', label: t`Every natural number` }, { id: 'zero', label: t`Only ${0}` }, { id: 'none', label: t`None of them` }], correct: 'all' },
  solution: [
    t`${math`d`} divides ${0} when ${math`${0} = k \times d`} for some integer ${math`k`}. Take ${math`k = ${0}`}: it works for every ${math`d`}.`,
    t`So every natural number is in the set, and the set equals ${math`\mathbb{N}`}. (The notes start ${math`\mathbb{N}`} at ${0}; ${0} divides ${0} too.)`,
  ],
  reference: 'all',
  verify: () => same('every d from 1 to 100 leaves remainder 0 on 0, and 0 = 0 x 0', upTo(100).every((d) => 0 % d === 0), true),
  misconceptions: [{ response: 'none', why: t`Dividing ${0} by ${math`d`} gives ${0}, a whole number, with nothing left over. Divisibility asks for ${math`${0} = kd`}, and ${math`k = ${0}`} works.` }],
});

const equalProof = supervision({
  id: 'notes-205-equality',
  source: cite(NOTES, 'printed pages 205 and 206, Set equality', true),
  title: t`Proving two sets equal`,
  prompt: t`Prove that ${math`\{x \in \mathbb{N} \mid ${2} \text{ divides } x \text{ and } x \text{ is prime}\} = \{${2}\}`}. Show both directions: every element of the left side is ${2}, and ${2} is an element of the left side.`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

const evens = upTo(10).filter((x) => x % 2 === 0);
const sq = range(1, 4).map((k) => k * k);

export const setBuilder: TopicContent = {
  topicId: 'sets.comprehension',
  goal: t`Read and write sets as ${math`\{x \in A \mid P(x)\}`}, decide membership from the defining property, and tell when two sets are equal.`,
  lesson: [
    { kind: 'p', text: t`The CST notes call sets "the mathematicians' data structures": a well-defined, unordered collection of objects, its elements. The statement ${math`x \in A`} is true when ${mx} is an element of ${math`A`}: ${math`\pi \in \mathbb{R}`} is true, ${math`\sqrt{-${1}} \in \mathbb{R}`} is not. This yes or no question is [[membership|membership]].` },
    { kind: 'p', text: t`A small finite set can be listed: the even primes are ${setOf([2])}, the booleans are ${math`\{\text{true}, \text{false}\}`}, and ${math`[-${2}..${3}] = ${setOf([-2, -1, 0, 1, 2, 3])}`}. A huge or infinite set, such as the primes, cannot be listed. It is defined by a property instead: [[set-builder|set-builder notation]], which the notes call set comprehension.` },
    { kind: 'rule', text: t`${dmath`\{x \in A \mid P(x)\}`} is the set of elements ${mx} of ${math`A`} for which the property ${math`P(x)`} is true. Read the bar as "such that"; some books write a colon, ${math`\{x \in A : P(x)\}`}. By definition, ${math`a \in \{x \in A \mid P(x)\}`} exactly when ${math`a \in A`} and ${math`P(a)`}.` },
    { kind: 'p', text: t`The notes' first examples: ${math`\mathbb{N} = \{n \in \mathbb{Z} \mid n \ge ${0}\}`} (so ${math`\mathbb{N}`} starts at ${0} in this course), and the positive integers ${math`\mathbb{N}^{+} = \{n \in \mathbb{N} \mid n \ge ${1}\}`}.` },
    { kind: 'p', text: t`For example ${math`\{x \in ${domainText(10)} \mid x \text{ is even}\} = ${setOf(evens)}`}. The set ${math`A`} in front says where ${mx} comes from; the property after the bar filters it.` },
    { kind: 'p', text: t`[[membership|Membership]] is a yes or no question: is a given thing an element? To decide whether ${math`${7} \in \{x \in ${domainText(10)} \mid x \text{ is even}\}`}, check both parts: ${math`${7} \in ${domainText(10)}`}, but ${7} is not even, so ${7} is not in the set.` },
    { kind: 'p', text: t`A second form builds elements from a formula: ${math`\{k^{${2}} \mid k \in ${setOf(range(1, 4))}\} = ${setOf(sq)}`}. Here ${mk} is a counter, and the elements are the values of the formula.` },
    { kind: 'p', text: t`Two sets are equal precisely when they have the same elements, however they are described. ${math`\{x \in \mathbb{N} \mid ${2} \text{ divides } x \text{ and } x \text{ is prime}\} = \{${2}\}`}, and ${math`\{d \in \mathbb{N} \mid d \text{ divides } ${0}\} = \mathbb{N}`}. Equivalent properties give equal sets.` },
    { kind: 'p', text: t`Conditions combine with "and" and "or" as in logic: ${math`\{x \in ${domainText(10)} \mid x \text{ is even and } x > ${5}\}`} is ${setOf(evens.filter((x) => x > 5))}, while with "or" it is ${setOf(upTo(10).filter((x) => x % 2 === 0 || x > 5))}.` },
  ],
  examples: [
    worked(members, { n: 12, c1: { kind: 'mult', k: 3 }, c2: { kind: 'ge', m: 6 }, join: 'and' }, t`Reading a property`),
    workedCambridge(evenPrimes),
    workedCambridge(cd1224),
    worked(image, { a: 2, b: 1, lo: 0, hi: 4 }, t`A set from a formula`),
  ],
  generators: [members, countMultiples, image, cd],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['set-builder', 'membership'],
  cambridge: [sheet311, interval, zeroDivisors, equalProof],
};
