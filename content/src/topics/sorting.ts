/**
 * fp.sorting: Sorting algorithms. The lesson follows FoCS Lecture 5 ("Sorting": the
 * comparison lower bound log(n!), insertion sort, quicksort, merging, top-down mergesort,
 * and their costs). The problems are FoCS exercises 5.1 to 5.4 (selection sort and bubble
 * sort: cost and code) and the lower bound of Section 5.1.
 *
 * The comparison counts are computed by running FoCS's ins and insort, quick, and merge on
 * a model that counts each evaluation of a comparison. log2(10!) = log2 3628800 is about
 * 21.79, so 22 comparisons are needed in the worst case for 10 items.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { factorial, int, sample } from '../math';
import { codeOf, ml, mlBlock } from '../ocaml-code';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { math, t } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

// ---------------------------------------------------------------- FoCS's functions, counting comparisons

function insortCount(xs: readonly number[]): { sorted: number[]; c: number } {
  let c = 0;
  const ins = (x: number, ys: readonly number[]): number[] => {
    if (ys.length === 0) return [x];
    c++;
    const [y, ...rest] = ys as [number, ...number[]];
    return x <= y ? [x, y, ...rest] : [y, ...ins(x, rest)];
  };
  const sort = (zs: readonly number[]): number[] => (zs.length === 0 ? [] : ins(zs[0] as number, sort(zs.slice(1))));
  const sorted = sort(xs);
  return { sorted, c };
}
function quickCount(xs: readonly number[]): number {
  if (xs.length <= 1) return 0;
  const [a, ...bs] = xs as [number, ...number[]];
  // FoCS's part conses each element onto its accumulator, so both parts come out reversed.
  const l = bs.filter((x) => x <= a).reverse();
  const r = bs.filter((x) => x > a).reverse();
  return bs.length + quickCount(l) + quickCount(r);
}
function mergeCount(xs: readonly number[], ys: readonly number[]): number {
  let i = 0;
  let j = 0;
  let c = 0;
  while (i < xs.length && j < ys.length) {
    c++;
    if ((xs[i] as number) <= (ys[j] as number)) i++;
    else j++;
  }
  return c;
}
const POOL = Array.from({ length: 50 }, (_, i) => i + 1);

// ---------------------------------------------------------------- generators

interface InsP { xs: number[] }
const insGen = generator<InsP>({
  id: 'insertion-sort-comparisons',
  skill: "Count the comparisons FoCS's insertion sort makes: it sorts the tail, then inserts the head, comparing until it finds its place.",
  params: (rng) => {
    for (;;) {
      const xs = sample(rng, POOL, int(rng, 4, 6));
      const n = xs.length;
      const c = insortCount(xs).c;
      if (c !== (n * (n - 1)) / 2 && c !== n - 1) return { xs };
    }
  },
  sane: ({ xs }) => (xs.length >= 4 ? null : 'short'),
  problem: ({ xs }) => {
    const n = xs.length;
    const parts = xs.map((_, i) => insortCount(xs.slice(i)).c - insortCount(xs.slice(i + 1)).c).reverse();
    return {
      prompt: t`FoCS's insertion sort is ${ml`insort (x :: xs) = ins x (insort xs)`}, where ${ml`ins x`} walks along the sorted list comparing ${ml`x <= y`} until it finds ${ml`x`}'s place. How many comparisons does ${ml`insort [${codeOf(xs.join('; '))}]`} make?`,
      answer: { kind: 'exact', expected: String(insortCount(xs).c) },
      solution: [
        t`${ml`insort`} first sorts the tail, so the elements are inserted from the last to the first: ${ml`${codeOf([...xs].reverse().join(', '))}`}.`,
        t`Inserting each into the sorted list built so far costs ${ml`${codeOf(parts.join(', '))}`} comparisons: ${ml`ins`} stops at the first ${ml`y`} with ${ml`x <= y`}, or at the end.`,
        t`Total ${insortCount(xs).c}. In the worst case it is ${math`${0} + ${1} + \cdots + ${n - 1} = ${(n * (n - 1)) / 2}`}; on average about half that: ${math`O(n^{${2}})`}.`,
      ],
    };
  },
  solve: ({ xs }) => String(insortCount(xs).c),
  misconceptions: ({ xs }): Misconception[] => {
    const n = xs.length;
    return [
      { response: String((n * (n - 1)) / 2), why: t`That is the worst case, when every insertion walks the whole list. ${ml`ins`} stops as soon as it finds the place.` },
      { response: String(n - 1), why: t`That is the best case, one comparison per insertion. Trace each insertion.` },
    ];
  },
});

interface MergeP { xs: number[]; ys: number[] }
const mergeGen = generator<MergeP>({
  id: 'merge-comparisons',
  skill: 'Count the comparisons in merging two sorted lists: one per element output until one list runs out.',
  quick: true,
  params: (rng) => {
    const all = sample(rng, POOL, int(rng, 7, 10)).sort((a, b) => a - b);
    const m = int(rng, 3, all.length - 3);
    const pickXs = sample(rng, all, m);
    return { xs: all.filter((x) => pickXs.includes(x)), ys: all.filter((x) => !pickXs.includes(x)) };
  },
  sane: ({ xs, ys }) => (xs.length >= 3 && ys.length >= 3 ? null : 'short'),
  problem: ({ xs, ys }) => ({
    prompt: t`FoCS's ${ml`merge`} compares the heads ${ml`x <= y`} of two sorted lists, outputs the smaller, and stops comparing when one list is empty. How many comparisons does ${ml`merge ([${codeOf(xs.join('; '))}], [${codeOf(ys.join('; '))}])`} make?`,
    answer: { kind: 'exact', expected: String(mergeCount(xs, ys)) },
    solution: [
      t`Each comparison outputs one element. When one list runs out, the rest of the other is returned with no more comparisons.`,
      t`Here ${mergeCount(xs, ys)} elements are output by comparison before a list is empty, so ${mergeCount(xs, ys)} comparisons; never more than ${math`m + n - ${1} = ${xs.length + ys.length - 1}`}.`,
    ],
  }),
  solve: ({ xs, ys }) => String(mergeCount(xs, ys)),
  misconceptions: ({ xs, ys }): Misconception[] => [
    { response: String(xs.length + ys.length), why: t`The last element is output without a comparison, and so is the tail left when one list runs out.` },
    { response: String(xs.length * ys.length), why: t`Merge never compares every pair: each comparison outputs an element.` },
  ],
});

interface QuickP { xs: number[] }
const quickGen = generator<QuickP>({
  id: 'quicksort-comparisons',
  skill: "Count the comparisons FoCS's quicksort makes: each partition compares every remaining element with the pivot, the head of the list.",
  params: (rng) => {
    for (;;) {
      const xs = sample(rng, POOL, int(rng, 5, 7));
      if (rng() < 0.25) xs.sort((a, b) => a - b);
      const n = xs.length;
      const c = quickCount(xs);
      if (c !== (n * (n - 1)) / 2 && c !== n - 1) return { xs };
      if (c === (n * (n - 1)) / 2 && n - 1 !== Math.ceil(n * Math.log2(n))) return { xs };
    }
  },
  sane: ({ xs }) => (xs.length >= 5 ? null : 'short'),
  problem: ({ xs }) => {
    const n = xs.length;
    const a = xs[0] as number;
    const rest = xs.slice(1);
    return {
      prompt: t`FoCS's ${ml`quick`} takes the head ${ml`a`} as pivot, compares every other element with it (${ml`x <= a`}) to partition, and sorts the two parts recursively; lists of length ${0} or ${1} need no comparisons. How many comparisons does ${ml`quick [${codeOf(xs.join('; '))}]`} make?`,
      answer: { kind: 'exact', expected: String(quickCount(xs)) },
      solution: [
        t`The first partition compares the ${n - 1} other elements with ${a}: the parts, built by consing onto accumulators, are ${ml`[${codeOf(rest.filter((x) => x <= a).reverse().join('; '))}]`} and ${ml`[${codeOf(rest.filter((x) => x > a).reverse().join('; '))}]`}.`,
        t`Each part is sorted the same way. Adding the partition sizes at every level gives ${quickCount(xs)} comparisons.`,
        t`A good pivot halves the list, giving ${math`T(n) = ${2}T(n/${2}) + n`}, ${math`O(n \log n)`}; a sorted input makes one part empty every time, giving ${math`${0} + ${1} + \cdots + (n - ${1})`}, ${math`O(n^{${2}})`}.`,
      ],
    };
  },
  solve: ({ xs }) => String(quickCount(xs)),
  misconceptions: ({ xs }): Misconception[] => {
    const n = xs.length;
    return [
      { response: String((n * (n - 1)) / 2), why: t`That is the worst case, when every pivot is the smallest or largest. Here the parts are split; add the partition sizes level by level.` },
      { response: String(n - 1), why: t`That is only the first partition. Each part is partitioned again.` },
      { response: String(Math.ceil(n * Math.log2(n))), why: t`${math`n\log_{${2}} n`} describes the growth on average; count the comparisons of this input exactly.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

const costOptions: ChoiceOption[] = [
  { id: 'n', label: [math`O(n)`] }, { id: 'nlog', label: [math`O(n \log n)`] }, { id: 'n2', label: [math`O(n^{${2}})`] }, { id: 'n3', label: [math`O(n^{${3}})`] },
];
const selectionComparisons = (n: number): number => {
  let c = 0;
  for (let k = n; k >= 2; k--) c += k - 1;
  return c;
};
const focs51 = auto({
  id: 'focs-5-1',
  source: cite('focs-notes', 'Lecture 5, Exercise 5.1', true),
  title: t`The cost of selection sort`,
  prompt: t`Selection sort looks at the elements to be sorted, identifies and removes a minimal element, and places it at the head of the result; the tail is obtained by recursively sorting the remaining elements. State, with justification, its time complexity in comparisons.`,
  answer: { kind: 'choice', options: costOptions, correct: 'n2' },
  solution: [
    t`Finding a minimum of ${math`k`} elements takes ${math`k - ${1}`} comparisons, whatever their order.`,
    t`The recursion finds minima of ${math`n, n - ${1}, \ldots, ${2}`} elements: ${math`(n - ${1}) + (n - ${2}) + \cdots + ${1} = \frac{n(n - ${1})}{${2}}`} comparisons, for example ${selectionComparisons(10)} for ${10} elements.`,
    t`So ${math`T(n) = T(n - ${1}) + (n - ${1})`}, which is ${math`O(n^{${2}})`}, in every case, best and worst.`,
  ],
  reference: ['n2'],
  verify: () => same('comparisons for 10', selectionComparisons(10), (10 * 9) / 2),
  misconceptions: [{ response: ['nlog'], why: t`Selection does not divide the problem in halves: each step removes only one element, at linear cost.` }, { response: ['n'], why: t`Each minimum costs linear time, and there are ${math`n`} of them.` }],
});
const lowerBound = auto({
  id: 'focs-5-lower-bound',
  source: cite('focs-notes', 'Lecture 5, Section 5.1', true),
  title: t`How few comparisons can sort ten items?`,
  prompt: t`FoCS argues that a comparison sort must distinguish all ${math`n!`} orderings, and each comparison at best halves the possibilities, so ${math`${2}^{C(n)} \ge n!`}. What is the least whole number ${math`C`} with ${math`${2}^{C} \ge ${10}!`}?`,
  answer: { kind: 'exact', expected: String(Math.ceil(Math.log2(factorial(10)))) },
  solution: [
    t`${math`${10}! = ${factorial(10)}`}, and ${math`\log_{${2}} ${factorial(10)} \approx ${Math.log2(factorial(10))}`}.`,
    t`${math`${2}^{${21}} = ${2 ** 21}`} is too small and ${math`${2}^{${22}} = ${2 ** 22}`} is enough, so at least ${22} comparisons are needed in the worst case.`,
  ],
  reference: '22',
  verify: () => same('least C', [2 ** 21 < factorial(10), 2 ** 22 >= factorial(10)].join(), 'true,true'),
  misconceptions: [{ response: '21', why: t`${math`${2}^{${21}} = ${2 ** 21}`} is less than ${math`${10}!`}: round up.` }, { response: '10', why: t`One comparison per item cannot distinguish ${math`${10}!`} orderings.` }],
});
const focs52 = supervision({
  id: 'focs-5-2',
  source: cite('focs-notes', 'Lecture 5, Exercise 5.2'),
  title: t`Selection sort in OCaml`,
  prompt: t`Implement selection sort (Exercise ${5}.${1}) in OCaml: a function that removes a minimal element from a list, and the sort built on it.`,
  writeUp: 'explanation',
});
const focs53 = supervision({
  id: 'focs-5-3',
  source: cite('focs-notes', 'Lecture 5, Exercise 5.3'),
  title: t`The cost of bubble sort`,
  prompt: t`Bubble sort looks at adjacent pairs of elements, exchanging them if they are out of order, and repeats this process until no more exchanges are possible. State, with justification, the time complexity of this approach, in the worst case and in the best.`,
  writeUp: 'explanation',
});
const focs54 = supervision({
  id: 'focs-5-4',
  source: cite('focs-notes', 'Lecture 5, Exercise 5.4'),
  title: t`Bubble sort in OCaml`,
  prompt: t`Implement bubble sort (Exercise ${5}.${3}) in OCaml on lists: one pass that swaps adjacent out-of-order pairs and reports whether it swapped, repeated until a pass makes no swap.`,
  writeUp: 'explanation',
});

// ---------------------------------------------------------------- lesson

export const sorting: TopicContent = {
  topicId: 'fp.sorting',
  goal: t`Write insertion sort, mergesort, and quicksort on lists, and compare their costs, ${math`O(n^{${2}})`} against ${math`O(n \log n)`}.`,
  objective: t`Sort lists by insertion, merging, and partitioning, and compare their costs in comparisons.`,
  why: t`Sorting is the classic test of algorithm design, and its lower bound shows when an algorithm is optimal.`,
  minutes: 40,
  lesson: [
    { kind: 'section', title: t`How fast can we sort?` },
    { kind: 'hook', text: t`FoCS times three sorting algorithms on ${10000} random numbers: one takes ${174} seconds, the others about one. Same task, same machine. And there is a floor: no algorithm that sorts by comparing can beat a certain count. What is it?` },
    { kind: 'narrative', text: t`Count comparisons, the operation every general sorting method must make. Then ask how many any method needs.` },
    { kind: 'theorem', name: t`The comparison lower bound`, statement: t`Any algorithm that sorts ${math`n`} distinct items using only comparisons makes at least ${math`\log_{${2}}(n!)`} comparisons in the worst case. Since ${math`\log_{${2}}(n!) \approx n\log_{${2}} n - ${1.44}n`}, the best possible is ${math`O(n \log n)`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Count the inputs`, text: t`The ${math`n`} items can arrive in any of ${math`n!`} orders, and each needs a different rearrangement to sort it.`, plain: t`With ${3} items there are ${6} orders.` },
        { label: t`Each comparison has two answers`, text: t`The algorithm's choices depend only on the answers to its comparisons, so after ${math`C`} comparisons it can be in at most ${math`${2}^{C}`} different states.` },
        { label: t`It must tell all orders apart`, text: t`Two orders that lead to the same state get the same rearrangement, and one of them ends unsorted. So ${math`${2}^{C} \ge n!`}.` },
        { label: t`Take logarithms`, text: t`${math`C \ge \log_{${2}}(n!)`} comparisons in the worst case.` },
      ],
    },
    { kind: 'section', title: t`Insertion sort: simple and quadratic` },
    { kind: 'rule', text: [mlBlock`
      let rec ins x = function
        | [] -> [x]
        | y :: ys -> if x <= y then x :: y :: ys else y :: ins x ys
      let rec insort = function
        | [] -> []
        | x :: xs -> ins x (insort xs)
    `] },
    { kind: 'definition', name: t`Insertion sort`, formal: t`[[insertion-sort|Insertion sort]] sorts ${ml`x :: xs`} by sorting ${ml`xs`} and inserting ${ml`x`} into its place. Its comparisons satisfy ${math`T(n + ${1}) = T(n) + n`} in the worst case, so it is ${math`O(n^{${2}})`}.`, plain: t`Each insertion may walk the whole sorted list: ${math`${0} + ${1} + \cdots + (n - ${1})`} comparisons when the input is in reverse order.` },
    checkFrom(insGen, { xs: [5, 2, 8, 1] }, t`${ml`insort`} inserts ${1}, then ${8}, then ${2}, then ${5}, costing ${0}, ${1}, ${2}, ${3} comparisons: ${insortCount([5, 2, 8, 1]).c} in all.`),
    { kind: 'section', title: t`Divide and conquer` },
    { kind: 'narrative', text: t`To do better, split the work in halves. Two ways to split: choose a pivot and partition by value (quicksort), or cut by position and merge the sorted halves (mergesort).` },
    { kind: 'definition', name: t`Quicksort`, formal: t`[[quicksort|Quicksort]] takes a pivot ${math`a`} (FoCS: the head), partitions the rest into the items ${math`\le a`} and those ${math`> a`}, sorts both recursively, and appends them around ${math`a`}.`, plain: t`With balanced parts, ${math`T(n) = ${2}T(n/${2}) + n`}: ${math`O(n \log n)`} on average. With a sorted input one part is always empty: ${math`T(n + ${1}) = T(n) + n`}, ${math`O(n^{${2}})`}.` },
    checkFrom(quickGen, { xs: [6, 3, 9, 1, 7] }, t`Pivot ${6}: ${4} comparisons, parts ${ml`[${1}; ${3}]`} and ${ml`[${7}; ${9}]`}; each part ${1} more: ${6}.`),
    { kind: 'definition', name: t`Mergesort`, formal: t`[[mergesort|Mergesort]] splits the list into halves with ${ml`take`} and ${ml`drop`}, sorts each, and merges them. Merging lists of lengths ${math`m`} and ${math`n`} takes at most ${math`m + n - ${1}`} comparisons, so ${math`T(n) = ${2}T(n/${2}) + n`} always: ${math`O(n \log n)`} in the worst case.`, plain: t`Optimal by the lower bound, though FoCS found it slower than quicksort on random data.` },
    { kind: 'rule', text: [mlBlock`
      let rec merge = function
        | [], ys -> ys
        | xs, [] -> xs
        | x :: xs, y :: ys ->
            if x <= y then x :: merge (xs, y :: ys)
            else y :: merge (x :: xs, ys)
    `] },
    checkFrom(mergeGen, { xs: [2, 5, 9], ys: [3, 4, 11] }, t`${2}, ${3}, ${4}, ${5}, ${9} are output by comparison; then ${11} follows free: ${5} comparisons.`),
    { kind: 'pitfall', claim: t`Quicksort is ${math`O(n \log n)`}.`, counterexample: t`Only on average. On a sorted list the head is always the smallest, one part is empty, and it makes ${math`${0} + ${1} + \cdots + (n - ${1})`} comparisons: ${math`O(n^{${2}})`}. FoCS notes that randomising the input makes this unlikely.` },
    { kind: 'takeaway', text: t`Comparison sorting needs about ${math`n\log_{${2}} n`} comparisons; mergesort always achieves it, quicksort on average, and insertion sort is quadratic.` },
  ],
  examples: [
    { ...workedCambridge(focs51), examiner: t`The examiner wants the cost of one step (a minimum of ${math`k`} items), the recurrence or sum, and the closed form, with the remark that it holds in every case.` },
    worked(quickGen, { xs: [1, 2, 3, 4, 5] }, t`Quicksort on a sorted list`),
    worked(insGen, { xs: [3, 7, 4, 9, 1] }, t`Counting insertion sort's comparisons`),
  ],
  generators: [insGen, mergeGen, quickGen],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['insertion-sort', 'quicksort', 'mergesort'],
  cambridge: [lowerBound, focs52, focs53, focs54],
  gate: ['focs-5-3', 'focs-5-2'],
  recall: [
    { front: t`State the comparison lower bound for sorting.`, back: t`At least ${math`\log_{${2}}(n!)`} comparisons in the worst case, about ${math`n\log_{${2}} n`}.` },
    { front: t`Costs of insertion sort, quicksort, mergesort?`, back: t`${math`O(n^{${2}})`}; ${math`O(n \log n)`} average but ${math`O(n^{${2}})`} worst; ${math`O(n \log n)`} worst.` },
    { front: t`How many comparisons can merging lists of lengths ${math`m`} and ${math`n`} take?`, back: t`At most ${math`m + n - ${1}`}.` },
  ],
  proofOrder: [{
    title: t`The comparison lower bound`,
    steps: [
      t`There are ${math`n!`} possible input orders.`,
      t`After ${math`C`} comparisons the algorithm is in one of at most ${math`${2}^{C}`} states.`,
      t`Different orders need different rearrangements, so ${math`${2}^{C} \ge n!`}.`,
      t`Hence ${math`C \ge \log_{${2}}(n!)`}.`,
    ],
  }],
};
