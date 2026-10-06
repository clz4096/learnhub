/**
 * pre.set-notation: Sets and Venn diagrams. The lesson follows Book of Proof Sections 1.1
 * and 1.5 to 1.7 (added to the batch by decision 9), with the TMUA notes' diagrams for
 * not, and, or (pages 12 to 20); the problems are Book of Proof's exercises for Sections
 * 1.5, 1.6, and 1.7. The gates (batch 7) are IA Numbers and Sets Example Sheet 1, Q6 and Q13, and
 * CST supervision exercise 5.1.6 with its 2023-24 official solution, in the lesson's notation (A - B
 * for the sheets' A \ B, and a bar for the complement); exercise 5.1.3(b) is practice.
 */
import { auto, cite, same, supervision, type AutoProblem } from '../cambridge';
import { int, pick, sample, upTo } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { dmath, math, setOf, t, type Rich, type Span } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

type Op = 'union' | 'intersection';

const union = (a: readonly number[], b: readonly number[]): number[] => [...new Set([...a, ...b])].sort((x, y) => x - y);
const inter = (a: readonly number[], b: readonly number[]): number[] => a.filter((x) => b.includes(x)).sort((x, y) => x - y);
const minus = (a: readonly number[], b: readonly number[]): number[] => a.filter((x) => !b.includes(x)).sort((x, y) => x - y);
const sorted = (a: readonly number[]): number[] => [...a].sort((x, y) => x - y);
const ids = (xs: readonly number[]): string[] => xs.map((x) => `e${x}`);
const options = (u: readonly number[]): ChoiceOption[] => u.map((x) => ({ id: `e${x}`, label: t`${x}` }));
const SYM: Record<Op, string> = { union: '\\cup', intersection: '\\cap' };
const A = math`A`;
const B = math`B`;
const Bc = math`B'`;

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
  t`The [[universal-set|universal set]] is ${math`\xi = ${setOf(upTo(n))}`}, with ${math`A = ${setOf(a)}`} and ${math`B = ${setOf(b)}`}.`;

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
        ? [t`The [[union|union]] ${math`A \cup B`} holds everything in ${A} or in ${B} or in both.`, t`Combine the lists without repeats: ${math`A \cup B = ${setOf(ans)}`}.`]
        : [t`The [[intersection|intersection]] ${math`A \cap B`} holds what is in ${A} and in ${B} at once.`, t`Keep the elements on both lists: ${math`A \cap B = ${setOf(ans)}`}.`],
    };
  },
  solve: ({ n, a, b, op }) => ids(upTo(n).filter((x) => (op === 'union' ? a.includes(x) || b.includes(x) : a.includes(x) && b.includes(x)))),
  misconceptions: ({ a, b, op }): Misconception[] => op === 'union'
    ? [
      { response: ids(inter(a, b)), why: t`Those are the elements in both sets: the intersection. The union ${math`\cup`} takes everything in either set.` },
      { response: ids(a), why: t`That is just ${A}. The union also takes every element of ${B}.` },
    ]
    : [
      { response: ids(union(a, b)), why: t`Those are the elements in either set: the union. The intersection ${math`\cap`} keeps only what is in both.` },
      { response: ids(minus(a, b)), why: t`Those are the elements of ${A} that are not in ${B}. The intersection is the overlap: elements in ${A} and in ${B}.` },
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
        solution: [t`The [[complement|complement]] ${math`A'`} holds every element of the universal set that is not in ${A}.`, t`So ${math`A' = ${setOf(ans)}`}.`],
      };
    }
    if (kind === 'union') {
      const ab = union(a, b);
      const ans = minus(u, ab);
      return {
        prompt: t`${given(n, a, b)} Choose every element of ${math`(A \cup B)'`}.`,
        answer: { kind: 'choice', options: options(u), correct: ids(ans) },
        solution: [t`Work inside the brackets first: ${math`A \cup B = ${setOf(ab)}`}.`, t`The complement takes what is left of the universal set: ${math`(A \cup B)' = ${setOf(ans)}`}.`],
      };
    }
    const nb = minus(u, b);
    const ans = inter(a, nb);
    return {
      prompt: t`${given(n, a, b)} Choose every element of ${math`A \cap B'`}.`,
      answer: { kind: 'choice', options: options(u), correct: ids(ans) },
      solution: [t`First ${math`B' = ${setOf(nb)}`}, everything not in ${B}.`, t`Then keep the elements of ${A} that are also in ${Bc}: ${math`A \cap B' = ${setOf(ans)}`}.`],
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
        { response: ids(a), why: t`That is ${A} itself. The complement ${math`A'`} is everything in the universal set that is not in ${A}.` },
        { response: ids(minus(b, a)), why: t`Those are the elements of ${B} outside ${A}. The complement of ${A} is everything outside ${A}, whether or not it is in ${B}.` },
      ];
    }
    if (kind === 'union') {
      return [
        { response: ids(union(minus(u, a), minus(u, b))), why: t`That is ${math`A' \cup B'`}, which is the complement of the intersection. Work out ${math`A \cup B`} first, then take everything outside it.` },
        { response: ids(union(a, b)), why: t`That is ${math`A \cup B`} itself. The prime mark ${math`'`} means complement: take the elements outside it.` },
      ];
    }
    return [
      { response: ids(inter(a, b)), why: t`That is ${math`A \cap B`}. The prime mark on ${B} means "not in ${B}", so keep the elements of ${A} that are outside ${B}.` },
      { response: ids(minus(u, b)), why: t`That is all of ${Bc}. The intersection with ${A} keeps only the elements of ${Bc} that are also in ${A}.` },
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
      t`Adding ${x} and ${y} counts the ${z} students who play both twice, so take them off once: ${math`${x} + ${y} - ${z} = ${u}`} play at least one game.`,
    ];
    if (ask === 'union') {
      return { prompt: t`${facts} How many play chess or football (or both)?`, answer: { kind: 'exact', expected: String(u) }, solution: steps };
    }
    return {
      prompt: t`${facts} How many play neither game?`,
      answer: { kind: 'exact', expected: String(total - u) },
      solution: [...steps, t`The rest play neither: ${math`${total} - ${u} = ${total - u}`}. In a [[venn-diagram|Venn diagram]] this is the region outside both circles.`],
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
      { response: String(total - x), why: t`That takes away only the chess players. Take away everyone who plays chess or football: ${math`${x} + ${y} - ${z}`} students.` },
    ],
});

interface DiffP { n: number; a: number[]; b: number[]; which: 'a-b' | 'b-a' }

const difference = generator<DiffP>({
  id: 'difference',
  skill: 'List the elements of a set difference, as in Book of Proof Section 1.5.',
  params(rng) {
    const n = pick(rng, [9, 10, 12]);
    return { n, ...twoSets(rng, n), which: pick(rng, ['a-b', 'b-a'] as const) };
  },
  sane: ({ n, a, b }) => saneSets(n, a, b),
  problem({ n, a, b, which }) {
    const [x, y, X, Y] = which === 'a-b' ? [a, b, A, B] : [b, a, B, A];
    const ans = minus(x, y);
    return {
      prompt: t`Let ${math`A = ${setOf(a)}`} and ${math`B = ${setOf(b)}`}. Choose every element of ${math`${X} - ${Y}`}.`,
      answer: { kind: 'choice', options: options(upTo(n)), correct: ids(ans) },
      solution: [
        t`The [[set-difference|difference]] ${math`${X} - ${Y}`} holds the elements of ${X} that are not in ${Y}.`,
        t`Go through ${math`${X} = ${setOf(x)}`} and cross out anything that is also in ${Y}: ${math`${X} - ${Y} = ${setOf(ans)}`}.`,
      ],
    };
  },
  solve: ({ n, a, b, which }) => ids(upTo(n).filter((e) => (which === 'a-b' ? a.includes(e) && !b.includes(e) : b.includes(e) && !a.includes(e)))),
  misconceptions: ({ a, b, which }): Misconception[] => {
    const [x, y, X, Y] = which === 'a-b' ? [a, b, A, B] : [b, a, B, A];
    return [
      { response: ids(minus(y, x)), why: t`That is ${math`${Y} - ${X}`}, the other way round. ${math`${X} - ${Y}`} starts from ${X} and removes what is in ${Y}.` },
      { response: ids(inter(x, y)), why: t`Those are the elements in both sets, the elements the difference removes. Keep the elements of ${X} that are not in ${Y}.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

/** Book of Proof's sets, exactly as printed (the order of listing does not matter). */
const BOP15 = { a: [4, 3, 6, 7, 1, 9], b: [5, 6, 8, 4], c: [5, 8, 4] };
const BOP16 = { a: [4, 3, 6, 7, 1, 9], b: [5, 6, 8, 4], u: Array.from({ length: 11 }, (_, i) => i) };
const BOP16b = { a: [0, 2, 4, 6, 8], b: [1, 3, 5, 7], u: Array.from({ length: 9 }, (_, i) => i) };
const has = (xs: readonly number[]) => (x: number): boolean => xs.includes(x);
const not = (f: (x: number) => boolean) => (x: number): boolean => !f(x);
const both = (f: (x: number) => boolean, g: (x: number) => boolean) => (x: number): boolean => f(x) && g(x);
const either = (f: (x: number) => boolean, g: (x: number) => boolean) => (x: number): boolean => f(x) || g(x);
const NONE = 'none';
const noneOption: ChoiceOption = { id: NONE, label: [math`\varnothing`, ...t` (no elements)`] };
const setIds = (xs: readonly number[]): string[] => (xs.length === 0 ? [NONE] : ids(sorted(xs)));
const listed = (xs: readonly number[]): Span => setOf(xs);

/**
 * One part of a Book of Proof set exercise: the set is computed from a membership test
 * over the universe, and verified a second way with the list operations above.
 */
function setPart(o: {
  id: string; at: string; title: Rich; given: Rich; expr: Span; universe: readonly number[];
  test: (x: number) => boolean; second: readonly number[]; steps: (ans: number[]) => Rich[];
  official?: readonly number[];
  misconceptions?: (ans: number[]) => Misconception[];
}): AutoProblem {
  const ans = o.universe.filter(o.test);
  const spec: Parameters<typeof auto>[0] = {
    id: o.id,
    source: cite('bop', o.at),
    title: o.title,
    prompt: t`${o.given} Choose every element of ${o.expr}.`,
    answer: { kind: 'choice', options: [...options(sorted(o.universe)), noneOption], correct: setIds(ans) },
    solution: o.steps(ans),
    reference: setIds(sorted(o.second)),
    verify: () => same(`Book of Proof ${o.at}`, setIds(ans).join(','), setIds(sorted(o.second)).join(',')),
    misconceptions: o.misconceptions?.(ans) ?? [],
  };
  if (o.official !== undefined) spec.official = { source: cite('bop', `Solutions, ${o.at}`), answer: setIds(o.official), agrees: true };
  return auto(spec);
}

const given15 = t`Book of Proof sets ${math`A = ${listed(BOP15.a)}`}, ${math`B = ${listed(BOP15.b)}`}, and ${math`C = ${listed(BOP15.c)}`}.`;
const u15 = sorted(union(union(BOP15.a, BOP15.b), BOP15.c));
const [inA, inB, inC] = [has(BOP15.a), has(BOP15.b), has(BOP15.c)];

const bop15a = setPart({
  id: 'bop-1-5-1a', at: 'Section 1.5, exercise 1(a)', title: t`A union`, given: given15, expr: math`A \cup B`, universe: u15,
  test: either(inA, inB), second: union(BOP15.a, BOP15.b), official: [1, 3, 4, 5, 6, 7, 8, 9],
  steps: (ans) => [t`Everything in ${A} or in ${B} or in both, each listed once: ${math`A \cup B = ${setOf(ans)}`}.`],
  misconceptions: () => [{ response: ids(sorted(inter(BOP15.a, BOP15.b))), why: t`Those are the elements in both: the intersection. The union takes everything in either set.` }],
});
const bop15c = setPart({
  id: 'bop-1-5-1c', at: 'Section 1.5, exercise 1(c)', title: t`A difference`, given: given15, expr: math`A - B`, universe: u15,
  test: both(inA, not(inB)), second: minus(BOP15.a, BOP15.b), official: [3, 7, 1, 9],
  steps: (ans) => [t`Start from ${A} and remove what is also in ${B} (here ${listed(sorted(inter(BOP15.a, BOP15.b)))}): ${math`A - B = ${setOf(ans)}`}.`],
  misconceptions: () => [{ response: ids(sorted(minus(BOP15.b, BOP15.a))), why: t`That is ${math`B - A`}. ${math`A - B`} keeps the elements of ${A} that are not in ${B}.` }],
});
const bop15d = setPart({
  id: 'bop-1-5-1d', at: 'Section 1.5, exercise 1(d)', title: t`Removing a smaller set`, given: given15, expr: math`A - C`, universe: u15,
  test: both(inA, not(inC)), second: minus(BOP15.a, BOP15.c), official: [3, 6, 7, 1, 9],
  steps: (ans) => [
    t`The [[set-difference|difference]] ${math`A - C`} is the elements of ${A} that are not in ${math`C`}.`,
    t`Of the elements of ${math`C = ${listed(BOP15.c)}`}, only ${listed(sorted(inter(BOP15.a, BOP15.c)))} is in ${A}, so remove it: ${math`A - C = ${setOf(ans)}`}.`,
  ],
});
const bop15g = setPart({
  id: 'bop-1-5-1g', at: 'Section 1.5, exercise 1(g)', title: t`A set inside another`, given: given15, expr: math`B \cap C`, universe: u15,
  test: both(inB, inC), second: inter(BOP15.b, BOP15.c), official: [5, 8, 4],
  steps: (ans) => [t`Every element of ${math`C`} is also in ${B}, so the overlap is all of ${math`C`}: ${math`B \cap C = ${setOf(ans)}`}.`],
});
const bop15i = setPart({
  id: 'bop-1-5-1i', at: 'Section 1.5, exercise 1(i)', title: t`An empty difference`, given: given15, expr: math`C - B`, universe: u15,
  test: both(inC, not(inB)), second: minus(BOP15.c, BOP15.b), official: [],
  steps: () => [t`Every element of ${math`C`} is in ${B}, so removing them leaves nothing: ${math`C - B = \varnothing`}, the [[empty-set|empty set]].`],
  misconceptions: () => [{ response: ids(sorted(minus(BOP15.b, BOP15.c))), why: t`That is ${math`B - C`}. ${math`C - B`} starts from ${math`C`}.` }],
});

const given16 = t`Book of Proof sets ${math`A = ${listed(BOP16.a)}`} and ${math`B = ${listed(BOP16.b)}`}, with universal set ${math`U = ${setOf([0, 1, 2, '...', 10])}`}.`;
const [cA, cB] = [has(BOP16.a), has(BOP16.b)];
const comp = (xs: readonly number[], u: readonly number[]): number[] => minus(u, xs);

const bop16a = setPart({
  id: 'bop-1-6-1a', at: 'Section 1.6, exercise 1(a)', title: t`A complement`, given: given16, expr: math`\overline{A}`, universe: BOP16.u,
  test: not(cA), second: comp(BOP16.a, BOP16.u), official: [0, 2, 5, 8, 10],
  steps: (ans) => [t`The [[complement|complement]] ${math`\overline{A} = U - A`} is everything in ${math`U`} that is not in ${A}: ${setOf(ans)}.`],
  misconceptions: () => [{ response: ids(sorted(BOP16.a)), why: t`That is ${A} itself. The bar means complement: everything in ${math`U`} outside ${A}.` }],
});
const bop16g = setPart({
  id: 'bop-1-6-1g', at: 'Section 1.6, exercise 1(g)', title: t`Complements and a difference`, given: given16, expr: math`\overline{A} - \overline{B}`, universe: BOP16.u,
  test: both(not(cA), cB), second: minus(comp(BOP16.a, BOP16.u), comp(BOP16.b, BOP16.u)), official: [5, 8],
  steps: (ans) => [
    t`First the complements: ${math`\overline{A} = ${setOf(comp(BOP16.a, BOP16.u))}`} and ${math`\overline{B} = ${setOf(comp(BOP16.b, BOP16.u))}`}.`,
    t`Then keep the elements of ${math`\overline{A}`} that are not in ${math`\overline{B}`}, that is, the ones in ${B}: ${setOf(ans)}.`,
  ],
});
const bop16i = setPart({
  id: 'bop-1-6-1i', at: 'Section 1.6, exercise 1(i)', title: t`The complement of an intersection`, given: given16, expr: math`\overline{\overline{A} \cap B}`, universe: BOP16.u,
  test: not(both(not(cA), cB)), second: comp(inter(comp(BOP16.a, BOP16.u), BOP16.b), BOP16.u), official: [0, 1, 2, 3, 4, 6, 7, 9, 10],
  steps: (ans) => [
    t`Work inside the long bar first: ${math`\overline{A} = ${setOf(comp(BOP16.a, BOP16.u))}`}, so ${math`\overline{A} \cap B = ${setOf(sorted(inter(comp(BOP16.a, BOP16.u), BOP16.b)))}`}.`,
    t`The long bar takes the complement of that inside ${math`U`}: ${setOf(ans)}.`,
  ],
  misconceptions: () => [{ response: ids(sorted(inter(comp(BOP16.a, BOP16.u), BOP16.b))), why: t`That is ${math`\overline{A} \cap B`} itself. The long bar over it asks for everything in ${math`U`} outside it.` }],
});

const given16b = t`Book of Proof sets ${math`A = ${listed(BOP16b.a)}`} and ${math`B = ${listed(BOP16b.b)}`}, with universal set ${math`U = ${setOf([0, 1, 2, '...', 8])}`}.`;
const [dA, dB] = [has(BOP16b.a), has(BOP16b.b)];
const bop16b2f = setPart({
  id: 'bop-1-6-2f', at: 'Section 1.6, exercise 2(f)', title: t`The complement of a union`, given: given16b, expr: math`\overline{A \cup B}`, universe: BOP16b.u,
  test: not(either(dA, dB)), second: inter(comp(BOP16b.a, BOP16b.u), comp(BOP16b.b, BOP16b.u)),
  steps: (ans) => [
    t`${math`A \cup B = ${setOf(sorted(union(BOP16b.a, BOP16b.b)))}`}, and the only element of ${math`U`} outside it is ${setOf(ans)}.`,
    t`It is also ${math`\overline{A} \cap \overline{B}`}: an element is outside ${math`A \cup B`} exactly when it is outside ${A} and outside ${B}.`,
  ],
});

/** All subsets of {0, 1, 2}, for checking an identity on every choice of A, B, C. */
const SUBSETS: readonly number[][] = Array.from({ length: 8 }, (_, m) => [0, 1, 2].filter((i) => (m >> i) & 1));
const U3 = [0, 1, 2];
const sameSet = (x: readonly number[], y: readonly number[]): boolean => sorted(x).join() === sorted(y).join();

function verdict(o: { id: string; at: string; title: Rich; prompt: Rich; holds: () => boolean; claim: boolean; steps: Rich[]; official?: boolean }): AutoProblem {
  const yes = o.holds();
  const spec: Parameters<typeof auto>[0] = {
    id: o.id,
    source: cite('bop', o.at, true),
    title: o.title,
    prompt: o.prompt,
    answer: { kind: 'choice', options: [{ id: 'yes', label: t`Yes, always equal` }, { id: 'no', label: t`No, not always` }], correct: o.claim ? 'yes' : 'no' },
    solution: o.steps,
    reference: yes ? 'yes' : 'no',
    verify: () => same(`Book of Proof ${o.at}, checked on every A, B, C inside a three-element set`, yes, o.claim),
  };
  if (o.official !== undefined) spec.official = { source: cite('bop', `Solutions, ${o.at}`), answer: o.official ? 'yes' : 'no', agrees: true };
  return auto(spec);
}

const bop17_5 = verdict({
  id: 'bop-1-7-5', at: 'Section 1.7, exercise 5', title: t`A distributive law`,
  prompt: t`Draw Venn diagrams for ${math`A \cup (B \cap C)`} and ${math`(A \cup B) \cap (A \cup C)`}. Based on your drawings, is ${math`A \cup (B \cap C) = (A \cup B) \cap (A \cup C)`} for all sets ${A}, ${B}, ${math`C`}?`,
  holds: () => SUBSETS.every((a) => SUBSETS.every((b) => SUBSETS.every((c) => sameSet(union(a, inter(b, c)), inter(union(a, b), union(a, c)))))),
  claim: true,
  official: true,
  steps: [
    t`Shade ${math`B \cap C`}, then add all of ${A}: that is ${math`A \cup (B \cap C)`}.`,
    t`For the other side, ${math`A \cup B`} and ${math`A \cup C`} overlap in all of ${A} together with ${math`B \cap C`}: the same region. So yes; a diagram suggests it, and checking every region proves it.`,
  ],
});
const bop17_8 = verdict({
  id: 'bop-1-7-8', at: 'Section 1.7, exercise 8', title: t`The complement of a union`,
  prompt: t`Sets ${A} and ${B} are in a universal set ${math`U`}. Draw Venn diagrams for ${math`\overline{A \cup B}`} and ${math`\overline{A} \cap \overline{B}`}. Based on your drawings, is ${math`\overline{A \cup B} = \overline{A} \cap \overline{B}`} for all sets ${A} and ${B}?`,
  holds: () => SUBSETS.every((a) => SUBSETS.every((b) => sameSet(comp(union(a, b), U3), inter(comp(a, U3), comp(b, U3))))),
  claim: true,
  steps: [
    t`${math`\overline{A \cup B}`} is the region outside both circles.`,
    t`${math`\overline{A}`} is outside circle ${A} and ${math`\overline{B}`} is outside circle ${B}; they overlap exactly outside both circles. So yes: this is one of De Morgan's laws.`,
  ],
});

const bop17_3 = supervision({
  id: 'bop-1-7-3',
  source: cite('bop', 'Section 1.7, exercise 3'),
  title: t`A Venn diagram for three sets`,
  prompt: t`Draw a Venn diagram for ${math`(A - B) \cap C`}. Shade the region, and say in words which elements it holds.`,
  writeUp: 'sketch',
  official: cite('bop', 'Solutions, Section 1.7, exercise 3'),
});
const bop17_10 = supervision({
  id: 'bop-1-7-10',
  source: cite('bop', 'Section 1.7, exercise 10'),
  title: t`A difference and a union`,
  prompt: t`Draw a Venn diagram for ${math`(A - B) \cup C`}. Then explain why ${math`A - B \cup C`}, with no brackets, would not say which set is meant.`,
  writeUp: 'sketch',
});

// ---------------------------------------------------------------- Cambridge problems: gates (batch 7)

/*
 * Outline for marking ns1-q6 (20 marks):
 * 1. Two sets are equal when they have the same elements: show x is in the left side exactly when
 *    it is in the right side (or show each side is inside the other) (4).
 * 2. x in A - (B u C) means x in A and not (x in B or x in C) (4); by De Morgan for "or", x in A and
 *    x not in B and x not in C (4).
 * 3. Regroup: (x in A and x not in B) and (x in A and x not in C), that is x in (A - B) n (A - C) (6).
 * 4. Every step reversible, said explicitly, so both inclusions follow (2).
 */
const ns1q6 = supervision({
  id: 'ns1-q6',
  source: cite('ia-ns-sheet-1', 'Q6', true),
  title: t`A difference from a union`,
  prompt: t`Prove that ${math`A - (B \cup C) = (A - B) \cap (A - C)`} for all sets ${A}, ${B}, ${math`C`}.`,
  writeUp: 'proof',
});

/*
 * Outline for marking ns1-q13 (20 marks):
 * 1. A triangle B = (A - B) u (B - A), or equally (A u B) - (A n B), with a line of justification (5).
 * 2. Key fact: x is in A triangle B exactly when x is in an odd number of A, B (one of them) (4).
 * 3. Then x is in (A triangle B) triangle C exactly when x is in exactly one of A triangle B and C,
 *    that is, when x is in an odd number of A, B, C; check the cases (6).
 * 4. The condition is symmetric in A, B, C, so A triangle (B triangle C) is the same set:
 *    the operation is associative (5). (A check of the 8 regions of a three-set Venn diagram,
 *    region by region, earns full credit.)
 */
const ns1q13 = supervision({
  id: 'ns1-q13',
  source: cite('ia-ns-sheet-1', 'Q13', true),
  title: t`The symmetric difference`,
  prompt: t`The symmetric difference ${math`A \mathbin{\triangle} B`} of two sets ${A} and ${B} is the set of elements that belong to exactly one of ${A} and ${B}. Express this in terms of ${math`\cap`}, ${math`\cup`}, and ${math`-`}. Prove that ${math`\triangle`} is associative: ${math`(A \mathbin{\triangle} B) \mathbin{\triangle} C = A \mathbin{\triangle} (B \mathbin{\triangle} C)`} for all sets ${A}, ${B}, ${math`C`}.`,
  writeUp: 'proof',
});

/*
 * Outline for marking sw-5-1-6 (20 marks):
 * (a) 8 marks. If the complement of A is B: every x in U is in A or not in A, so A u B = U; no x is
 *     both, so A n B is empty. Conversely, A u B = U puts every x outside A into B; A n B empty puts
 *     every x in B outside A; so B is exactly the complement.
 * (b) 4 marks. By (a) with the roles swapped, or element by element: x is outside the complement of
 *     A exactly when x is in A.
 * (c) 8 marks. Each De Morgan law element by element ("not (P or Q)" is "not P and not Q"), or from
 *     (a): check union and intersection with the claimed complement are U and the empty set.
 */
const sw516 = supervision({
  id: 'sw-5-1-6',
  source: cite('cst-dm-sw1', 'Exercises 5, 5.1.6', true),
  title: t`Complements and De Morgan's laws`,
  prompt: t`Let ${math`U`} be a set, and let ${A} and ${B} be subsets of ${math`U`}, with complements taken in ${math`U`}. Prove that: (a) ${math`\overline{A} = B`} if and only if ${math`A \cup B = U`} and ${math`A \cap B = \varnothing`}; (b) ${math`\overline{\overline{A}} = A`}; (c) ${math`\overline{A \cup B} = \overline{A} \cap \overline{B}`} and ${math`\overline{A \cap B} = \overline{A} \cup \overline{B}`}.`,
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-5', '5.1.6'),
});

/** CST 5.1.3(b): C = {x in R | x > 7} and D = {x in N | x > 5}, N = {0, 1, 2, ...}. */
const inC513 = (x: number): boolean => x > 7;
const inD513 = (x: number): boolean => Number.isInteger(x) && x >= 0 && x > 5;
/** Test points: every quarter from -2 to 20, enough to tell the sets in each statement apart. */
const GRID = Array.from({ length: 89 }, (_, i) => -2 + i / 4);
const SW513: readonly { id: string; label: Span; holds: () => boolean }[] = [
  { id: 'six', label: math`${6} \in C \cup D`, holds: () => inC513(6) || inD513(6) },
  { id: 'seven', label: math`${7} \in C \cup D`, holds: () => inC513(7) || inD513(7) },
  { id: 'half', label: math`${7.5} \in C \cap D`, holds: () => inC513(7.5) && inD513(7.5) },
  { id: 'inter', label: math`C \cap D = \{x \in \mathbb{N} \mid x > ${7}\}`, holds: () => GRID.every((x) => (inC513(x) && inD513(x)) === (Number.isInteger(x) && x >= 0 && x > 7)) },
  { id: 'union5', label: math`C \cup D = \{x \in \mathbb{R} \mid x > ${5}\}`, holds: () => GRID.every((x) => (inC513(x) || inD513(x)) === (x > 5)) },
  { id: 'union', label: math`C \cup D = \{${6}\} \cup \{x \in \mathbb{R} \mid x \ge ${7}\}`, holds: () => GRID.every((x) => (inC513(x) || inD513(x)) === (x === 6 || x >= 7)) },
];
const SW513_TRUE = ['six', 'seven', 'inter', 'union'];

const sw513 = auto({
  id: 'sw-5-1-3',
  source: cite('cst-dm-sw1', 'Exercises 5, 5.1.3(b)', true),
  title: t`A set of reals and a set of naturals`,
  prompt: t`Let ${math`C = \{x \in \mathbb{R} \mid x > ${7}\}`} and ${math`D = \{x \in \mathbb{N} \mid x > ${5}\}`}, where ${math`\mathbb{N} = \{${0}, ${1}, ${2}, \ldots\}`}. Which of these statements are true? Choose all that are.`,
  answer: { kind: 'choice', options: SW513.map(({ id, label }) => ({ id, label: [label] })), correct: SW513_TRUE },
  solution: [
    t`${math`C`} holds every real number above ${7}, including fractions; ${math`D`} holds only the whole numbers ${math`${6}, ${7}, ${8}, \ldots`}.`,
    t`The intersection keeps what is in both: whole numbers above ${7}, so ${math`C \cap D = \{x \in \mathbb{N} \mid x > ${7}\}`}, and ${math`${7.5} \notin D`}.`,
    t`The union adds ${6} and ${7} from ${math`D`} to the reals above ${7}: ${math`C \cup D = \{${6}\} \cup \{x \in \mathbb{R} \mid x \ge ${7}\}`}. It is not all reals above ${5}, since it misses ${5.5}.`,
  ],
  reference: SW513_TRUE,
  verify: () => same('the true statements', SW513.filter((x) => x.holds()).map((x) => x.id).join(' '), SW513_TRUE.join(' ')),
  misconceptions: [{ response: [...SW513_TRUE, 'union5'], why: t`${math`C \cup D`} has no numbers strictly between ${5} and ${6}, or between ${6} and ${7}: ${math`D`} adds whole numbers only. So it is not every real above ${5}.` }],
});

// ---------------------------------------------------------------- lesson

const L = { n: 10, a: [1, 2, 3, 4, 6], b: [2, 4, 6, 8, 10], c: [1, 8, 9] };
const LU = upTo(L.n);
const venn = {
  onlyA: minus(L.a, L.b), both: inter(L.a, L.b), onlyB: minus(L.b, L.a), neither: minus(LU, union(L.a, L.b)),
};
const U = math`U`;

export const setNotation: TopicContent = {
  topicId: 'pre.set-notation',
  goal: t`Read and use set notation for union, intersection, difference, and complement, and draw them as a Venn diagram.`,
  objective: t`Read and use union, intersection, difference and complement, and draw them on a Venn diagram.`,
  why: t`Events in probability are sets, so every probability rule is a rule about these operations.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`Or, and, not` },
    { kind: 'hook', text: t`In a class, some students play chess and some play football. "Chess or football", "chess and football", "chess but not football", "neither": four different groups, and getting them mixed up is behind many wrong answers in probability. Set notation gives each one a precise name and a picture.` },
    { kind: 'narrative', text: t`The TMUA notes make a useful point: the same picture serves for sets, for events, and for statements. "Or" will become union, "and" intersection, "not" complement. Learn the picture once and it pays off three times.` },
    { kind: 'section', title: t`Sets and the universal set` },
    {
      kind: 'definition',
      name: t`Set and element`,
      formal: t`A [[set|set]] is a collection of objects, its [[element|elements]]. We write ${math`x \in A`} if ${math`x`} is an element of ${A}, and ${math`x \notin A`} if not. Sets are equal when they have exactly the same elements.`,
      plain: t`In plain words: a collection written between curly brackets, where order and repeats do not matter. ${setOf([3, 1, 2])}, ${setOf([1, 2, 3])} and ${setOf([1, 1, 2, 3])} are the same set; ${math`${2} \in ${setOf([1, 2, 3])}`} and ${math`${5} \notin ${setOf([1, 2, 3])}`}.`,
    },
    {
      kind: 'definition',
      name: t`Universal set and empty set`,
      formal: t`The [[universal-set|universal set]] ${U} is a set containing every object under discussion. The [[empty-set|empty set]] ${math`\varnothing`} is the set with no elements.`,
      plain: t`In plain words: ${U} is the whole box of things we are talking about; Book of Proof writes ${U}, and school books and the practice questions write ${math`\xi`}. Below, ${math`U = ${setOf(LU)}`}, with ${math`A = ${setOf(L.a)}`} and ${math`B = ${setOf(L.b)}`}.`,
    },
    { kind: 'section', title: t`The four operations` },
    {
      kind: 'definition',
      name: t`Union, intersection, difference, complement`,
      formal: t`For sets ${A} and ${B} in ${U}: ${dmath`A \cup B = \{x \mid x \in A \text{ or } x \in B\}, \qquad A \cap B = \{x \mid x \in A \text{ and } x \in B\},`} ${dmath`A - B = \{x \mid x \in A \text{ and } x \notin B\}, \qquad \overline{A} = U - A.`}`,
      plain: t`In plain words: the [[union|union]] is everything in ${A} or ${B} or both; the [[intersection|intersection]] is everything in both; the [[set-difference|difference]] ${math`A - B`} is ${A} with ${B} taken out; the [[complement|complement]] is everything not in ${A}. School books write the complement ${math`A'`}.`,
    },
    {
      kind: 'list',
      items: [
        t`${math`A \cup B = ${setOf(union(L.a, L.b))}`}.`,
        t`${math`A \cap B = ${setOf(inter(L.a, L.b))}`}.`,
        t`${math`A - B = ${setOf(minus(L.a, L.b))}`}, but ${math`B - A = ${setOf(minus(L.b, L.a))}`}: order matters.`,
        t`${math`\overline{A} = ${setOf(minus(LU, L.a))}`}, and ${math`A - A = \varnothing`}.`,
      ],
    },
    {
      kind: 'venn', a: 'A', b: 'B', caption: t`A [[venn-diagram|Venn diagram]] of the sets above. The box is ${U}; each circle is a set.`,
      onlyA: [setOf(venn.onlyA)], both: [setOf(venn.both)], onlyB: [setOf(venn.onlyB)], neither: [setOf(venn.neither)],
    },
    { kind: 'p', text: t`Read the regions: the overlap is ${math`A \cap B`}; both circles together are ${math`A \cup B`}; circle ${A} without the overlap is ${math`A - B`}; everything outside circle ${A} is ${math`\overline{A}`}; outside both circles is ${math`\overline{A \cup B}`}.` },
    checkFrom(complement, { n: 8, a: [1, 2, 5], b: [2, 3, 6], kind: 'union' }, t`${math`A \cup B = ${setOf(union([1, 2, 5], [2, 3, 6]))}`}, so its complement in ${setOf(upTo(8))} is ${setOf(minus(upTo(8), union([1, 2, 5], [2, 3, 6])))}.`),
    { kind: 'section', title: t`Counting a union` },
    { kind: 'narrative', text: t`How many elements does ${math`A \cup B`} have? Adding ${math`\lvert A \rvert`} and ${math`\lvert B \rvert`} (the numbers of elements) gives ${L.a.length + L.b.length}, but ${math`A \cup B`} has only ${union(L.a, L.b).length}. The elements of the overlap were counted twice, once in each circle.` },
    { kind: 'theorem', statement: t`For finite sets ${A} and ${B}, ${math`\lvert A \cup B \rvert = \lvert A \rvert + \lvert B \rvert - \lvert A \cap B \rvert`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Split the union`, text: t`Every element of ${math`A \cup B`} lies in exactly one of ${math`A - B`}, ${math`A \cap B`}, ${math`B - A`}, so ${math`\lvert A \cup B \rvert = \lvert A - B \rvert + \lvert A \cap B \rvert + \lvert B - A \rvert`}.`, plain: t`The three regions of the two circles: only ${A}, both, only ${B}.` },
        { label: t`Split each set`, text: t`Likewise ${math`\lvert A \rvert = \lvert A - B \rvert + \lvert A \cap B \rvert`} and ${math`\lvert B \rvert = \lvert B - A \rvert + \lvert A \cap B \rvert`}.` },
        { label: t`Add and compare`, text: t`Adding the last two, ${math`\lvert A \rvert + \lvert B \rvert = \lvert A - B \rvert + \lvert B - A \rvert + ${2}\lvert A \cap B \rvert`}, which is ${math`\lvert A \cup B \rvert + \lvert A \cap B \rvert`}. Subtract ${math`\lvert A \cap B \rvert`}.` },
      ],
    },
    { kind: 'p', text: t`Check: ${math`${L.a.length} + ${L.b.length} - ${venn.both.length} = ${union(L.a, L.b).length}`}.` },
    checkFrom(countRegions, { x: 14, y: 11, z: 5, total: 30, ask: 'union' }, t`${math`${14} + ${11} - ${5} = ${20}`}: the ${5} who play both were counted twice.`),
    { kind: 'pitfall', claim: t`${math`\lvert A \cup B \rvert = \lvert A \rvert + \lvert B \rvert`}.`, counterexample: t`With the sets above, ${math`\lvert A \rvert + \lvert B \rvert = ${L.a.length + L.b.length}`}, but ${math`A \cup B`} has ${union(L.a, L.b).length} elements. It holds only when ${math`A \cap B = \varnothing`}.` },
    { kind: 'section', title: t`Three sets need brackets` },
    { kind: 'p', text: t`${math`A \cup B \cup C`} needs no brackets, and neither does ${math`A \cap B \cap C`}. Mixing the two does. Take ${math`C = ${setOf(L.c)}`}. Then ${math`(A \cup B) \cap C = ${setOf(inter(union(L.a, L.b), L.c))}`}, but ${math`A \cup (B \cap C) = ${setOf(union(L.a, inter(L.b, L.c)))}`}.` },
    { kind: 'pitfall', claim: t`${math`A \cup B \cap C`} is a set.`, counterexample: t`Without brackets it could mean ${math`(A \cup B) \cap C`} or ${math`A \cup (B \cap C)`}, and with ${math`C = ${setOf(L.c)}`} these differ. Shade each part in a diagram before combining, as Book of Proof does.` },
    { kind: 'takeaway', text: t`Union is or, intersection is and, complement is not, difference is "but not"; and the overlap is counted once, not twice.` },
  ],
  examples: [
    worked(unionIntersection, { n: 10, a: [1, 3, 5, 7], b: [3, 4, 5, 6], op: 'intersection' }, t`An intersection`),
    workedCambridge(bop15d),
    workedCambridge(bop16i),
    worked(countRegions, { x: 12, y: 9, z: 4, total: 25, ask: 'neither' }, t`Counting with a Venn diagram`),
  ],
  generators: [unionIntersection, complement, countRegions, difference],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['set', 'element', 'universal-set', 'union', 'intersection', 'set-difference', 'complement', 'empty-set', 'venn-diagram'],
  cambridge: [bop15a, bop15c, bop15g, bop15i, bop16a, bop16g, bop16b2f, bop17_5, bop17_8, bop17_3, bop17_10, ns1q6, sw516, ns1q13, sw513],
  // Proofs of set identities, element by element: the IA sheet's difference of a union first, then
  // the CST complement laws and the symmetric difference. The reals and naturals question is
  // practice in reading set notation.
  gate: ['ns1-q6', 'sw-5-1-6', 'ns1-q13'],
  recall: [
    { front: t`Define ${math`A \cup B`}, ${math`A \cap B`}, ${math`A - B`} and ${math`\overline{A}`}.`, back: t`In ${A} or ${B}; in both; in ${A} but not ${B}; in ${U} but not ${A}.` },
    { front: t`State the counting rule for a union of two sets.`, back: t`${math`\lvert A \cup B \rvert = \lvert A \rvert + \lvert B \rvert - \lvert A \cap B \rvert`}.` },
    { front: t`When are two sets equal?`, back: t`When they have exactly the same elements; order and repeats do not matter.` },
  ],
  proofOrder: [
    {
      title: t`Counting a union`,
      steps: [
        t`${math`A \cup B`} splits into ${math`A - B`}, ${math`A \cap B`} and ${math`B - A`}.`,
        t`${A} splits into ${math`A - B`} and ${math`A \cap B`}; ${B} into ${math`B - A`} and ${math`A \cap B`}.`,
        t`So ${math`\lvert A \rvert + \lvert B \rvert`} counts the overlap twice.`,
        t`Subtract it once: ${math`\lvert A \cup B \rvert = \lvert A \rvert + \lvert B \rvert - \lvert A \cap B \rvert`}.`,
      ],
    },
  ],
};
