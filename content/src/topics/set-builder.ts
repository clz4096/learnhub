/** sets.comprehension: Membership and set-builder notation. */
import { int, pick, q, str, upTo } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { math, setOf, t, type Rich, type Span } from '../rich';
import { worked, type TopicContent } from '../topic';

const ids = (xs: readonly number[]): string[] => xs.map((x) => `e${x}`);
const options = (xs: readonly number[]): ChoiceOption[] => xs.map((x) => ({ id: `e${x}`, label: t`${x}` }));
const range = (lo: number, hi: number): number[] => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
const domainText = (n: number): Span => setOf([1, 2, 3, '...', n]);

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

function condText(c: Cond): Rich {
  switch (c.kind) {
    case 'gt': return [math`x > ${c.m}`];
    case 'ge': return [math`x ≥ ${c.m}`];
    case 'lt': return [math`x < ${c.m}`];
    case 'le': return [math`x ≤ ${c.m}`];
    case 'mult': return t`x is a multiple of ${c.k}`;
    case 'odd': return t`x is odd`;
    case 'even': return t`x is even`;
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
      prompt: t`Let ${math`S = {x ∈ ${domainText(p.n)} | ${condText(p.c1)} ${p.join} ${condText(p.c2)}}`}. Choose every element of S.`,
      answer: { kind: 'choice', options: options(upTo(p.n)), correct: ids(ans) },
      solution: [
        t`Read it as: S is the set of x from ${domainText(p.n)} such that ${condText(p.c1)} ${p.join} ${condText(p.c2)}.`,
        p.join === 'and'
          ? t`"and" means both conditions must hold for the same x.`
          : t`"or" means at least one condition must hold.`,
        t`Test each x from ${1} to ${p.n}: ${math`S = ${setOf(ans)}`}.`,
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
    { response: ids(memberList(p, 'boundary')), why: t`Check the boundary number ${'m' in p.c2 ? p.c2.m : 0}. A strict sign (< or >) leaves it out; ≤ and ≥ let it in.` },
    { response: ids(upTo(p.n).filter((x) => !memberList(p).includes(x))), why: t`Those are the numbers that fail the property. S keeps the ones that pass it.` },
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
      prompt: t`How many elements does ${math`{x ∈ ${domainText(n)} | x is a multiple of ${k}}`} have?`,
      answer: { kind: 'exact', expected: String(c) },
      solution: [
        t`The multiples of ${k} in the set are ${math`${k} * ${1}, ${k} * ${2}, ..., ${k} * ${c}`}.`,
        t`The last one is ${k * c}, because ${k * (c + 1)} is more than ${n}. So there are ${c} elements: ${n} divided by ${k}, rounded down.`,
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
      prompt: t`Let ${math`T = {${formula} | k ∈ ${setOf(ks)}}`}. Choose every element of T.`,
      answer: { kind: 'choice', options: options(range(0, top)), correct: ids(ans) },
      solution: [
        t`The elements are the values of ${formula} as k runs through ${setOf(ks)}. The k values are not themselves elements.`,
        t`Substitute each k: ${math`T = ${setOf(ans)}`}.`,
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
    { response: ids(range(lo, hi)), why: t`Those are the values of k. The set holds the values of the formula, so substitute each k into it.` },
    { response: ids(range(lo + 1, hi + 1).map((k) => a * k + b)), why: t`Each value is one step along. Substitute the k values exactly as listed, starting with k = ${lo}.` },
  ],
});

// ---------------------------------------------------------------- lesson

const evens = upTo(10).filter((x) => x % 2 === 0);
const sq = range(1, 4).map((k) => k * k);

export const setBuilder: TopicContent = {
  topicId: 'sets.comprehension',
  goal: t`Read and write sets as {x ∈ A | P(x)}, and decide membership from the defining property.`,
  lesson: [
    { kind: 'p', text: t`Listing every element works for small sets. For larger ones, describe the elements by a property instead. This is [[set-builder|set-builder notation]], also called comprehension.` },
    { kind: 'rule', text: t`${math`{x ∈ A | P(x)}`} is the set of elements x of A for which the property P(x) is true. Read the bar as "such that". Some books write a colon instead: ${math`{x ∈ A : P(x)}`}.` },
    { kind: 'p', text: t`For example ${math`{x ∈ ${domainText(10)} | x is even} = ${setOf(evens)}`}. The set A in front says where x comes from; the property after the bar filters it.` },
    { kind: 'p', text: t`[[membership|Membership]] is a yes or no question: is a given thing an element? To decide whether ${7} ∈ ${math`{x ∈ ${domainText(10)} | x is even}`}, check both parts: ${7} is in ${domainText(10)}, but ${7} is not even, so ${math`${7} ∉`} the set.` },
    { kind: 'p', text: t`A second form builds elements from a formula: ${math`{k^${2} | k ∈ ${setOf(range(1, 4))}} = ${setOf(sq)}`}. Here k is a counter, and the elements are the values of the formula.` },
    { kind: 'p', text: t`Conditions combine with "and" and "or" as in logic: ${math`{x ∈ ${domainText(10)} | x is even and x > ${5}}`} is ${setOf(evens.filter((x) => x > 5))}, while with "or" it is ${setOf(upTo(10).filter((x) => x % 2 === 0 || x > 5))}.` },
  ],
  examples: [
    worked(members, { n: 12, c1: { kind: 'mult', k: 3 }, c2: { kind: 'ge', m: 6 }, join: 'and' }, t`Reading a property`),
    worked(countMultiples, { n: 50, k: 7 }, t`Counting without listing`),
    worked(image, { a: 2, b: 1, lo: 0, hi: 4 }, t`A set from a formula`),
  ],
  generators: [members, countMultiples, image],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['set-builder', 'membership'],
};
