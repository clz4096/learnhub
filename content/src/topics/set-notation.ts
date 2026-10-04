/** pre.set-notation: Sets and Venn diagrams. */
import { int, pick, sample, upTo } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { math, setOf, t, type Rich } from '../rich';
import { worked, type TopicContent } from '../topic';

type Op = 'union' | 'intersection';

const union = (a: readonly number[], b: readonly number[]): number[] => [...new Set([...a, ...b])].sort((x, y) => x - y);
const inter = (a: readonly number[], b: readonly number[]): number[] => a.filter((x) => b.includes(x)).sort((x, y) => x - y);
const minus = (a: readonly number[], b: readonly number[]): number[] => a.filter((x) => !b.includes(x)).sort((x, y) => x - y);
const sorted = (a: readonly number[]): number[] => [...a].sort((x, y) => x - y);
const ids = (xs: readonly number[]): string[] => xs.map((x) => `e${x}`);
const options = (u: readonly number[]): ChoiceOption[] => u.map((x) => ({ id: `e${x}`, label: t`${x}` }));
const SYM: Record<Op, string> = { union: '∪', intersection: '∩' };

/** Two subsets of {1, ..., n} that overlap and that neither contains the other. */
function twoSets(rng: () => number, n: number): { a: number[]; b: number[] } {
  for (;;) {
    const a = sorted(sample(rng, upTo(n), int(rng, 3, 6)));
    const b = sorted(sample(rng, upTo(n), int(rng, 3, 6)));
    if (inter(a, b).length > 0 && minus(a, b).length > 0 && minus(b, a).length > 0 && union(a, b).length < n) return { a, b };
  }
}

const saneSets = (n: number, a: readonly number[], b: readonly number[]): string | null =>
  n >= 8 && n <= 12 && a.every((x) => x >= 1 && x <= n) && b.every((x) => x >= 1 && x <= n) && a.length >= 3 && b.length >= 3
    && inter(a, b).length > 0 && minus(a, b).length > 0 && minus(b, a).length > 0 && union(a, b).length < n ? null : 'out of range';

const given = (n: number, a: readonly number[], b: readonly number[]): Rich =>
  t`The [[universal-set|universal set]] is ${math`ξ = ${setOf(upTo(n))}`}, with ${math`A = ${setOf(a)}`} and ${math`B = ${setOf(b)}`}.`;

// ---------------------------------------------------------------- generators

interface OpP { n: number; a: number[]; b: number[]; op: Op }

const unionIntersection = generator<OpP>({
  id: 'union-intersection',
  skill: 'List the elements of a union or an intersection.',
  params(rng) {
    const n = pick(rng, [10, 12]);
    return { n, ...twoSets(rng, n), op: pick(rng, ['union', 'intersection'] as const) };
  },
  sane: ({ n, a, b }) => saneSets(n, a, b),
  problem({ n, a, b, op }) {
    const ans = op === 'union' ? union(a, b) : inter(a, b);
    return {
      prompt: t`${given(n, a, b)} Choose every element of ${math`A ${SYM[op]} B`}.`,
      answer: { kind: 'choice', options: options(upTo(n)), correct: ids(ans) },
      solution: op === 'union'
        ? [t`The [[union|union]] ${math`A ∪ B`} holds everything in A or in B or in both.`, t`Combine the lists without repeats: ${math`A ∪ B = ${setOf(ans)}`}.`]
        : [t`The [[intersection|intersection]] ${math`A ∩ B`} holds what is in A and in B at once.`, t`Keep the elements on both lists: ${math`A ∩ B = ${setOf(ans)}`}.`],
    };
  },
  solve: ({ n, a, b, op }) => ids(upTo(n).filter((x) => (op === 'union' ? a.includes(x) || b.includes(x) : a.includes(x) && b.includes(x)))),
  misconceptions: ({ a, b, op }): Misconception[] => op === 'union'
    ? [
      { response: ids(inter(a, b)), why: t`Those are the elements in both sets: the intersection. The union ${math`∪`} takes everything in either set.` },
      { response: ids(a), why: t`That is just A. The union also takes every element of B.` },
    ]
    : [
      { response: ids(union(a, b)), why: t`Those are the elements in either set: the union. The intersection ${math`∩`} keeps only what is in both.` },
      { response: ids(minus(a, b)), why: t`Those are the elements of A that are not in B. The intersection is the overlap: elements in A and in B.` },
    ],
});

type CompKind = 'a' | 'union' | 'a-not-b';
interface CompP { n: number; a: number[]; b: number[]; kind: CompKind }

const complement = generator<CompP>({
  id: 'complement',
  skill: 'Use the complement, alone and combined with union and intersection.',
  params(rng) {
    const n = pick(rng, [8, 10]);
    return { n, ...twoSets(rng, n), kind: pick(rng, ['a', 'union', 'a-not-b'] as const) };
  },
  sane: ({ n, a, b }) => saneSets(n, a, b),
  problem({ n, a, b, kind }) {
    const u = upTo(n);
    if (kind === 'a') {
      const ans = minus(u, a);
      return {
        prompt: t`${given(n, a, b)} Choose every element of ${math`A'`}.`,
        answer: { kind: 'choice', options: options(u), correct: ids(ans) },
        solution: [t`The [[complement|complement]] ${math`A'`} holds every element of the universal set that is not in A.`, t`So ${math`A' = ${setOf(ans)}`}.`],
      };
    }
    if (kind === 'union') {
      const ab = union(a, b);
      const ans = minus(u, ab);
      return {
        prompt: t`${given(n, a, b)} Choose every element of ${math`(A ∪ B)'`}.`,
        answer: { kind: 'choice', options: options(u), correct: ids(ans) },
        solution: [t`Work inside the brackets first: ${math`A ∪ B = ${setOf(ab)}`}.`, t`The complement takes what is left of the universal set: ${math`(A ∪ B)' = ${setOf(ans)}`}.`],
      };
    }
    const nb = minus(u, b);
    const ans = inter(a, nb);
    return {
      prompt: t`${given(n, a, b)} Choose every element of ${math`A ∩ B'`}.`,
      answer: { kind: 'choice', options: options(u), correct: ids(ans) },
      solution: [t`First ${math`B' = ${setOf(nb)}`}, everything not in B.`, t`Then keep the elements of A that are also in ${math`B'`}: ${math`A ∩ B' = ${setOf(ans)}`}.`],
    };
  },
  solve: ({ n, a, b, kind }) => ids(upTo(n).filter((x) => {
    const inA = a.includes(x);
    const inB = b.includes(x);
    return kind === 'a' ? !inA : kind === 'union' ? !(inA || inB) : inA && !inB;
  })),
  misconceptions: ({ n, a, b, kind }): Misconception[] => {
    const u = upTo(n);
    if (kind === 'a') {
      return [
        { response: ids(a), why: t`That is A itself. The complement ${math`A'`} is everything in the universal set that is not in A.` },
        { response: ids(minus(b, a)), why: t`Those are the elements of B outside A. The complement of A is everything outside A, whether or not it is in B.` },
      ];
    }
    if (kind === 'union') {
      return [
        { response: ids(union(minus(u, a), minus(u, b))), why: t`That is ${math`A' ∪ B'`}, which is the complement of the intersection. Work out ${math`A ∪ B`} first, then take everything outside it.` },
        { response: ids(union(a, b)), why: t`That is ${math`A ∪ B`} itself. The prime mark ' means complement: take the elements outside it.` },
      ];
    }
    return [
      { response: ids(inter(a, b)), why: t`That is ${math`A ∩ B`}. The prime mark on B means "not in B", so keep the elements of A that are outside B.` },
      { response: ids(minus(u, b)), why: t`That is all of ${math`B'`}. The intersection with A keeps only the elements of ${math`B'`} that are also in A.` },
    ];
  },
});

interface CountP { x: number; y: number; z: number; total: number; ask: 'union' | 'neither' }

/** Builds real sets with the given sizes inside {1, ..., total}, and counts by checking every element. */
function bruteCounts(p: CountP): { union: number; neither: number } {
  const a = upTo(p.x);
  const b = [...upTo(p.z), ...upTo(p.y - p.z).map((i) => p.x + i)];
  let inUnion = 0;
  for (const e of upTo(p.total)) if (a.includes(e) || b.includes(e)) inUnion++;
  return { union: inUnion, neither: p.total - inUnion };
}

const countRegions = generator<CountP>({
  id: 'count-regions',
  skill: 'Count a union or the region outside both sets from the sizes of the sets.',
  params(rng) {
    const x = int(rng, 5, 30);
    const y = int(rng, 5, 30);
    const z = int(rng, 1, Math.min(x, y) - 1);
    const total = x + y - z + int(rng, 1, 20);
    return { x, y, z, total, ask: pick(rng, ['union', 'neither'] as const) };
  },
  sane: ({ x, y, z, total }) => (z >= 1 && z < x && z < y && x <= 30 && y <= 30 && total > x + y - z && total <= 80 ? null : 'out of range'),
  problem(p) {
    const { x, y, z, total, ask } = p;
    const u = x + y - z;
    const facts = t`In a class of ${total} students, ${x} play chess, ${y} play football, and ${z} play both.`;
    const steps = [
      t`Adding ${x} and ${y} counts the ${z} students who play both twice, so take them off once: ${x} + ${y} - ${z} = ${u} play at least one game.`,
    ];
    if (ask === 'union') {
      return { prompt: t`${facts} How many play chess or football (or both)?`, answer: { kind: 'exact', expected: String(u) }, solution: steps };
    }
    return {
      prompt: t`${facts} How many play neither game?`,
      answer: { kind: 'exact', expected: String(total - u) },
      solution: [...steps, t`The rest play neither: ${total} - ${u} = ${total - u}. In a [[venn-diagram|Venn diagram]] this is the region outside both circles.`],
    };
  },
  solve: (p) => String(p.ask === 'union' ? bruteCounts(p).union : bruteCounts(p).neither),
  misconceptions: ({ x, y, z, total, ask }): Misconception[] => ask === 'union'
    ? [
      { response: String(x + y), why: t`Adding the two groups counts the students who play both twice. Subtract the overlap once.` },
      { response: String(x + y - 2 * z), why: t`That counts students who play exactly one game. "Or" includes the ${z} who play both, so subtract the overlap only once.` },
      { response: String(x + y + z), why: t`The ${z} students who play both are already in both groups. Subtract them once instead of adding them.` },
    ]
    : [
      { response: String(total - x - y), why: t`Subtracting both groups takes away the ${z} students who play both twice. Add them back once.` },
      { response: String(x + y - z), why: t`That is how many play at least one game. The question asks for the rest of the class.` },
      { response: String(total - x), why: t`That takes away only the chess players. Take away everyone who plays chess or football: ${x} + ${y} - ${z} students.` },
    ],
});

// ---------------------------------------------------------------- lesson

const L = { n: 10, a: [1, 2, 3, 4, 6], b: [2, 4, 6, 8, 10] };
const LU = upTo(L.n);
const venn = {
  onlyA: minus(L.a, L.b), both: inter(L.a, L.b), onlyB: minus(L.b, L.a), neither: minus(LU, union(L.a, L.b)),
};

export const setNotation: TopicContent = {
  topicId: 'pre.set-notation',
  goal: t`Read and use set notation for union, intersection, and complement, and draw them as a Venn diagram.`,
  lesson: [
    { kind: 'p', text: t`A [[set|set]] is a collection of things, written between curly brackets. Each thing in it is an [[element|element]]. The order does not matter and nothing is listed twice, so ${setOf([3, 1, 2])} and ${setOf([1, 2, 3])} are the same set. We write ${math`${2} ∈ ${setOf([1, 2, 3])}`} to say ${2} is an element, and ${math`${5} ∉ ${setOf([1, 2, 3])}`} to say ${5} is not.` },
    { kind: 'p', text: t`The [[universal-set|universal set]], written ξ, holds everything under discussion. Here it is ${math`ξ = ${setOf(LU)}`}, with ${math`A = ${setOf(L.a)}`} and ${math`B = ${setOf(L.b)}`}.` },
    {
      kind: 'list',
      items: [
        t`The [[union|union]] ${math`A ∪ B`} is everything in A or B or both: ${setOf(union(L.a, L.b))}.`,
        t`The [[intersection|intersection]] ${math`A ∩ B`} is everything in both: ${setOf(inter(L.a, L.b))}.`,
        t`The [[complement|complement]] ${math`A'`} is everything in ξ that is not in A: ${setOf(minus(LU, L.a))}.`,
        t`A set with no elements is the [[empty-set|empty set]], written ∅.`,
      ],
    },
    {
      kind: 'venn', a: 'A', b: 'B', caption: t`A [[venn-diagram|Venn diagram]] of the sets above. The box is ξ; each circle is a set.`,
      onlyA: [setOf(venn.onlyA)], both: [setOf(venn.both)], onlyB: [setOf(venn.onlyB)], neither: [setOf(venn.neither)],
    },
    { kind: 'p', text: t`Read the regions: the overlap is ${math`A ∩ B`}; both circles together are ${math`A ∪ B`}; everything outside circle A is ${math`A'`}. To count ${math`A ∪ B`}, adding the sizes counts the overlap twice: ${L.a.length} + ${L.b.length} - ${venn.both.length} = ${union(L.a, L.b).length}.` },
  ],
  examples: [
    worked(unionIntersection, { n: 10, a: [1, 3, 5, 7], b: [3, 4, 5, 6], op: 'intersection' }, t`An intersection`),
    worked(complement, { n: 8, a: [1, 2, 5], b: [2, 3, 4], kind: 'union' }, t`The complement of a union`),
    worked(countRegions, { x: 12, y: 9, z: 4, total: 25, ask: 'neither' }, t`Counting with a Venn diagram`),
  ],
  generators: [unionIntersection, complement, countRegions],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['set', 'element', 'universal-set', 'union', 'intersection', 'complement', 'empty-set', 'venn-diagram'],
};
