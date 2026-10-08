/**
 * fp.map-filter-fold: Map, filter, and fold. The lesson follows FoCS Lecture 8 (map, "the
 * apply to all functional"; the predicate functionals filter and exists) and CS3110
 * Sections 4.2 to 4.6 (map, filter, fold_left and fold_right, pipelining), with the map
 * fusion law of Section 4.8 proved by induction. The problems are CS3110 Chapter 4
 * exercises (sum_cube_odd and its pipeline, exists, map composition, matrix multiply) and
 * FoCS exercises 8.3 and 8.4.
 *
 * sum_cube_odd 10 = 1225 and sum_cube_odd 5 = 153 were checked in OCaml 4.11.1 with the
 * book's ( -- ) operator; `verify` recomputes them by brute force.
 *
 * Batch 9 puts the Cambridge problems first in the gate: Computer Science Tripos Part IA 2016,
 * Paper 1, Question 1(b) (a function that turns out to be fold_right, restated from Standard ML
 * in OCaml; checked in OCaml 4.11.1, scratch file s16-ocaml/zarg.ml: the sum of [3; 1; 4; 1; 5]
 * is 14), then FoCS Exercise 8.3, then CS3110's matrix multiply.
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { int, pick } from '../math';
import { codeOf, ml, mlBlock, mlList, type Code } from '../ocaml-code';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { math, t, type Rich } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

// ---------------------------------------------------------------- generators

type Pred = 'even' | 'odd' | 'gt';
type Map1 = 'square' | 'add' | 'double';
interface PipeP { xs: number[]; p: Pred; c: number; f: Map1; d: number }

const predCode = ({ p, c }: PipeP): Code => codeOf(p === 'even' ? `(fun x -> x mod ${2} = ${0})` : p === 'odd' ? `(fun x -> x mod ${2} = ${1})` : `(fun x -> x > ${c})`);
const predWords = ({ p, c }: PipeP): Rich => (p === 'even' ? t`the even elements` : p === 'odd' ? t`the odd elements` : t`the elements greater than ${c}`);
const mapCode = ({ f, d }: PipeP): Code => codeOf(f === 'square' ? '(fun x -> x * x)' : f === 'add' ? `(fun x -> x + ${d})` : `(fun x -> ${2} * x)`);
const test = ({ p, c }: PipeP, x: number): boolean => (p === 'even' ? x % 2 === 0 : p === 'odd' ? Math.abs(x % 2) === 1 : x > c);
const fm = ({ f, d }: PipeP, x: number): number => (f === 'square' ? x * x : f === 'add' ? x + d : 2 * x);
const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);

function pipeValues(pp: PipeP): { right: number; mapFirst: number; noFilter: number; noMap: number } {
  const kept = pp.xs.filter((x) => test(pp, x));
  return {
    right: sum(kept.map((x) => fm(pp, x))),
    mapFirst: sum(pp.xs.map((x) => fm(pp, x)).filter((y) => test(pp, y))),
    noFilter: sum(pp.xs.map((x) => fm(pp, x))),
    noMap: sum(kept),
  };
}

const pipeline = generator<PipeP>({
  id: 'filter-map-fold',
  skill: 'Evaluate a pipeline of filter, map, and fold on a list, as in the CS3110 sum_cube_odd exercise.',
  params: (rng) => {
    for (;;) {
      const n = int(rng, 4, 6);
      const xs = Array.from({ length: n }, () => int(rng, 1, 9));
      const pp: PipeP = { xs, p: pick(rng, ['even', 'odd', 'gt'] as const), c: int(rng, 3, 6), f: pick(rng, ['square', 'add', 'double'] as const), d: int(rng, 1, 5) };
      const v = pipeValues(pp);
      const wrong = new Set([v.mapFirst, v.noFilter, v.noMap].filter((w) => w !== v.right));
      if (wrong.size >= 2 && pp.xs.some((x) => test(pp, x))) return pp;
    }
  },
  sane: ({ xs }) => (xs.length >= 4 && xs.length <= 6 ? null : 'list length'),
  problem: (pp) => {
    const kept = pp.xs.filter((x) => test(pp, x));
    const mapped = kept.map((x) => fm(pp, x));
    return {
      prompt: t`What is the value of this expression?`.concat([mlBlock`
        ${mlList(pp.xs)}
        |> List.filter ${predCode(pp)}
        |> List.map ${mapCode(pp)}
        |> List.fold_left ( + ) ${0}
      `]),
      answer: { kind: 'exact', expected: String(sum(mapped)) },
      solution: [
        t`${ml`|>`} passes the value on its left to the function on its right, so the stages run top to bottom.`,
        t`${ml`List.filter`} keeps ${predWords(pp)}: ${ml`${mlList(kept)}`}.`,
        t`${ml`List.map`} applies the function to each: ${ml`${mlList(mapped)}`}.`,
        t`${ml`List.fold_left ( + ) ${0}`} adds them up from ${0}: the total is ${sum(mapped)}.`,
      ],
    };
  },
  solve: (pp) => String(pipeValues(pp).right),
  misconceptions: (pp): Misconception[] => {
    const v = pipeValues(pp);
    return [
      { response: String(v.mapFirst), why: t`That filters after mapping. The pipeline filters the original numbers first, then maps the survivors.` },
      { response: String(v.noFilter), why: t`That maps and adds every element. ${ml`List.filter`} first drops the elements that fail the test.` },
      { response: String(v.noMap), why: t`That adds the kept elements without transforming them: ${ml`List.map`} changes each one before the fold.` },
    ];
  },
});

interface FoldP { left: boolean; a: number; xs: number[] }
const foldLeftSub = (a: number, xs: readonly number[]): number => xs.reduce((acc, x) => acc - x, a);
const foldRightSub = (a: number, xs: readonly number[]): number => xs.reduceRight((acc, x) => x - acc, a);

const foldDirection = generator<FoldP>({
  id: 'fold-direction',
  skill: 'Evaluate fold_left and fold_right with a combining function that is not associative, and tell the two folds apart.',
  params: (rng) => {
    for (;;) {
      const xs = Array.from({ length: int(rng, 3, 4) }, () => int(rng, 1, 9));
      const fp: FoldP = { left: rng() < 0.5, a: int(rng, 0, 20), xs };
      const right = fp.left ? foldLeftSub(fp.a, xs) : foldRightSub(fp.a, xs);
      const other = fp.left ? foldRightSub(fp.a, xs) : foldLeftSub(fp.a, xs);
      if (new Set([right, other, sum(xs) - fp.a]).size === 3) return fp;
    }
  },
  sane: ({ xs }) => (xs.length >= 3 ? null : 'short'),
  problem: ({ left, a, xs }) => {
    const v = left ? foldLeftSub(a, xs) : foldRightSub(a, xs);
    const shape = left
      ? computedChain(xs.reduce((s, x) => `(${s} - ${x})`, String(a)))
      : computedChain(xs.reduceRight((s, x) => `(${x} - ${s})`, String(a)));
    return {
      prompt: t`What is the value of ${left ? ml`List.fold_left (fun acc x -> acc - x) ${a} ${mlList(xs)}` : ml`List.fold_right (fun x acc -> x - acc) ${mlList(xs)} ${a}`}?`,
      answer: { kind: 'exact', expected: String(v) },
      solution: [
        left
          ? t`${ml`fold_left`} starts from ${a} and combines with the elements from the left: ${shape}.`
          : t`${ml`fold_right`} starts from ${a} at the right end and combines with the elements from the right: ${shape}.`,
        t`Working out the brackets from the inside gives ${v}.`,
      ],
    };
  },
  solve: ({ left, a, xs }) => String(left ? foldLeftSub(a, xs) : foldRightSub(a, xs)),
  misconceptions: ({ left, a, xs }): Misconception[] => [
    { response: String(left ? foldRightSub(a, xs) : foldLeftSub(a, xs)), why: t`That is the other fold. Subtraction is not associative, so the order of the brackets matters: ${left ? ml`fold_left` : ml`fold_right`} brackets from the ${left ? 'left' : 'right'}.` },
    { response: String(sum(xs) - a), why: t`The accumulator is not simply subtracted at the end: each step combines it with one element, and the brackets nest.` },
  ],
});

/** Brackets of numbers and minus signs as LaTeX, assembled from computed values. */
function computedChain(s: string): Rich {
  return [{ kind: 'math', text: s.slice(1, -1).replace(/\((-?\d+)\)/g, '$1'), typed: [] }];
}

type Fnl = 'map' | 'filter' | 'fold' | 'exists';
interface TaskP { task: number; k: number }
const TASKS: { f: Fnl; text: (k: number) => Rich }[] = [
  { f: 'map', text: (k) => t`add ${k} to every element of a list of integers` },
  { f: 'map', text: (k) => t`multiply every element of a list by ${k}` },
  { f: 'filter', text: (k) => t`keep only the elements greater than ${k}` },
  { f: 'filter', text: (k) => t`keep only the multiples of ${k}` },
  { f: 'fold', text: (k) => t`add up the elements, starting the total at ${k}` },
  { f: 'fold', text: (k) => t`find the largest element, given that all are at least ${k}` },
  { f: 'exists', text: (k) => t`test whether some element equals ${k}` },
  { f: 'exists', text: (k) => t`test whether at least one element is divisible by ${k}` },
];
const FNL_OPTIONS: ChoiceOption[] = [
  { id: 'map', label: [ml`List.map`] },
  { id: 'filter', label: [ml`List.filter`] },
  { id: 'fold', label: [ml`List.fold_left`] },
  { id: 'exists', label: [ml`List.exists`] },
];
const KIND: Record<Fnl, Rich> = {
  map: t`transforms each element and keeps the length`,
  filter: t`keeps some elements unchanged and drops the rest`,
  fold: t`combines all the elements into one value`,
  exists: t`answers yes or no for the whole list`,
};

const whichFunctional = generator<TaskP>({
  id: 'which-functional',
  skill: 'Choose the functional for a task: transforming (map), selecting (filter), combining (fold), or testing (exists).',
  quick: true,
  params: (rng) => ({ task: int(rng, 0, TASKS.length - 1), k: int(rng, 2, 9) }),
  sane: ({ task }) => (task >= 0 && task < TASKS.length ? null : 'task'),
  problem: ({ task, k }) => {
    const tk = TASKS[task] as (typeof TASKS)[number];
    return {
      prompt: t`Which one standard functional, given a suitable anonymous function, does this in one call: ${tk.text(k)}?`,
      answer: { kind: 'choice', options: FNL_OPTIONS, correct: tk.f },
      solution: [t`Ask what the result is. This task ${KIND[tk.f]}, which is exactly what ${(FNL_OPTIONS.find((o) => o.id === tk.f) as ChoiceOption).label} does.`],
    };
  },
  solve: ({ task }) => [(TASKS[task] as (typeof TASKS)[number]).f],
  misconceptions: ({ task }): Misconception[] => {
    const f = (TASKS[task] as (typeof TASKS)[number]).f;
    return (['map', 'filter', 'fold', 'exists'] as const).filter((g) => g !== f).map((g) => ({ response: [g], why: t`That functional ${KIND[g]}. Here the result ${KIND[f]}.` }));
  },
});

// ---------------------------------------------------------------- Cambridge problems

const sumCubeOdd = (n: number): number => {
  let s = 0;
  for (let i = 0; i <= n; i++) if (i % 2 === 1) s += i ** 3;
  return s;
};

const sco10 = auto({
  id: 'cs3110-4-sum-cube-odd',
  source: cite('cs3110-ex4', 'Exercise: sum_cube_odd', true),
  title: t`The sum of the odd cubes up to ${10}`,
  prompt: t`Write ${ml`sum_cube_odd n`}, the sum of the cubes of the odd numbers from ${0} to ${ml`n`} inclusive, with no new recursive function: use ${ml`List.map`}, ${ml`List.filter`}, ${ml`List.fold_left`}, and ${ml`( -- )`}, where ${ml`i -- j`} is the list ${ml`[i; i + ${1}; ...; j]`}. What is ${ml`sum_cube_odd ${10}`}?`,
  answer: { kind: 'exact', expected: String(sumCubeOdd(10)) },
  solution: [
    t`One answer: ${ml`let sum_cube_odd n = ${0} -- n |> List.filter (fun i -> i mod ${2} = ${1}) |> List.map (fun i -> i * i * i) |> List.fold_left ( + ) ${0}`}.`,
    t`For ${math`n = ${10}`}: the filter keeps ${ml`${mlList([1, 3, 5, 7, 9])}`}, the map gives ${ml`${mlList([1, 27, 125, 343, 729])}`}, and the fold adds them: ${math`${1} + ${27} + ${125} + ${343} + ${729} = ${sumCubeOdd(10)}`}.`,
  ],
  reference: String(sumCubeOdd(10)),
  verify: () => same('sum_cube_odd 10', sumCubeOdd(10), [1, 3, 5, 7, 9].reduce((a, i) => a + i * i * i, 0)) ?? same('1225', sumCubeOdd(10), 1225),
  misconceptions: [
    { response: String(sumCubeOdd(9) + 1000), why: t`${10} is even, so its cube is not in the sum: only the odd numbers are kept.` },
    { response: String([1, 3, 5, 7, 9].reduce((a, b) => a + b, 0)), why: t`That adds the odd numbers without cubing them: the map stage cubes each one.` },
  ],
});

const sco5 = auto({
  id: 'cs3110-4-sum-cube-odd-pipeline',
  source: cite('cs3110-ex4', 'Exercise: sum_cube_odd pipeline', true),
  title: t`${ml`sum_cube_odd`} as a pipeline`,
  prompt: t`Rewrite ${ml`sum_cube_odd`} with the pipeline operator ${ml`|>`}, so the stages read left to right. What is ${ml`sum_cube_odd ${5}`}?`,
  answer: { kind: 'exact', expected: String(sumCubeOdd(5)) },
  solution: [
    t`${ml`${0} -- ${5} |> List.filter (fun i -> i mod ${2} = ${1}) |> List.map (fun i -> i * i * i) |> List.fold_left ( + ) ${0}`}.`,
    t`The odd numbers are ${1}, ${3}, ${5}; their cubes add to ${math`${1} + ${27} + ${125} = ${sumCubeOdd(5)}`}.`,
    t`A pipeline reads left to right: each stage runs on the output of the last.`,
  ],
  reference: String(sumCubeOdd(5)),
  verify: () => same('sum_cube_odd 5', sumCubeOdd(5), 153),
  misconceptions: [{ response: '9', why: t`That adds the odd numbers without cubing them.` }, { response: String(sumCubeOdd(5) + 64), why: t`${4} is even: its cube is filtered out.` }],
  nudge: t`Not quite. Running the three stages by hand on the list from ${0} to ${5}, filter, then map, then fold, gives the value.`,
  hints: [
    t`Which numbers from ${0} to ${5} does the filter keep?`,
    t`What does the map stage turn each of them into?`,
    t`What does folding with ${ml`( + )`} from ${0} do to that list?`,
  ],
});

const existsEx = supervision({
  id: 'cs3110-4-exists',
  source: cite('cs3110-ex4', 'Exercise: exists'),
  title: t`${ml`exists`} three ways`,
  prompt: t`${ml`exists p [a${1}; ...; an]`} is ${ml`(p a${1}) || ... || (p an)`}, and ${ml`false`} on the empty list. Write it three ways: ${ml`exists_rec`}, recursive without the ${ml`List`} module; ${ml`exists_fold`}, with ${ml`List.fold_left`} or ${ml`List.fold_right`} and no ${ml`rec`}; and ${ml`exists_lib`}, with other ${ml`List`} functions. Which stops early, and why?`,
  writeUp: 'explanation',
  hints: [
    t`What should ${ml`exists`} return on the empty list, and on ${ml`h :: t`} in terms of ${ml`p h`} and the rest?`,
    t`With a fold, what value starts the accumulator, and how is each element combined with it?`,
    t`Which of the three versions can return as soon as ${ml`p`} holds, without looking at the rest of the list, and why does a fold not?`,
  ],
});
const mapComposition = supervision({
  id: 'cs3110-4-map-composition',
  source: cite('cs3110-ex4', 'Exercise: map composition'),
  title: t`One map instead of two`,
  prompt: t`Show how to replace any expression ${ml`List.map f (List.map g lst)`} by an equivalent one that calls ${ml`List.map`} only once, and prove the two are equal for every list by induction on the list.`,
  writeUp: 'proof',
  hints: [
    t`Which single function, applied to each element, does the work of ${ml`g`} followed by ${ml`f`}?`,
    t`What do both sides give on the empty list?`,
    t`For ${ml`h :: t`}, how does the definition of ${ml`List.map`} unfold on each side, and where does the induction hypothesis apply?`,
  ],
});
const matrixMultiply = supervision({
  id: 'cs3110-4-matrix-multiply',
  source: cite('cs3110-ex4', 'Exercise: matrix multiply'),
  title: t`Matrix multiplication with lists`,
  prompt: t`A matrix is an ${ml`int list list`} of rows. Write ${ml`multiply_matrices`}, using a transpose function and a dot product of row vectors, with ${ml`List.map`} in place of explicit loops. Explain which functional does which job.`,
  writeUp: 'explanation',
  hints: [
    t`Entry ${math`(i, j)`} of the product pairs row ${math`i`} of the first matrix with which part of the second?`,
    t`How does transposing the second matrix turn its columns into rows?`,
    t`Which ${ml`List.map`} goes over the rows of the first matrix, and which goes over the rows of the transpose?`,
  ],
});
// Computer Science Tripos Part IA 2016, Paper 1, Question 1(b), in OCaml.
const cst2016Zarg = supervision({
  id: 'cst-2016-p1-q1-b',
  source: cite('cst-y2016p1q1', '(b)', true),
  title: t`A function to recognise`,
  prompt: [
    ...t`Consider the function ${ml`zarg`} defined below:`,
    mlBlock`
      let rec zarg f = function
        | ([], e) -> e
        | (x :: xs, e) -> f (x, zarg f (xs, e))
    `,
    ...t`Show that with the help of this function it is possible to write an expression for the sum of a given list of integers. Then describe what ${ml`zarg`} does in general.`,
  ],
  writeUp: 'explanation',
  hints: [
    t`What does ${ml`zarg f (xs, e)`} return when ${ml`xs`} is empty, and what does it combine at each step otherwise?`,
    t`With ${ml`f = fun (a, b) -> a + b`} and ${ml`e = ${0}`}, what does ${ml`zarg`} give on ${ml`[${1}; ${2}; ${3}]`}?`,
    t`Which standard list function processes a list from the right in the same way?`,
  ],
});
const focs83 = supervision({
  id: 'focs-8-3',
  source: cite('focs-notes', 'Lecture 8, Exercise 8.3'),
  title: t`${ml`map${2}`} without ${ml`map`}`,
  prompt: t`Without using ${ml`map`}, write ${ml`map${2}`} such that ${ml`map${2} f`} is equivalent to ${ml`map (map f)`}. The obvious solution declares two recursive functions; try to use only one by nested pattern matching. State the type of ${ml`map${2}`}.`,
  writeUp: 'explanation',
  hints: [
    t`What is the type of ${ml`map (map f)`}, and what does it do to a list of lists?`,
    t`With two recursive functions, one walks the outer list and one an inner list: what does each do?`,
    t`How can a pattern that looks inside the first inner list, such as ${ml`(x :: xs) :: xss`}, let one function do both jobs?`,
  ],
});
const focs84 = supervision({
  id: 'focs-8-4',
  source: cite('focs-notes', 'Lecture 8, Exercise 8.4'),
  title: t`${ml`map`} for options`,
  prompt: t`The type ${ml`'a option = None | Some of 'a`} can be viewed as lists of at most one element. Declare an analogue of ${ml`map`} for ${ml`'a option`}, give its type, and explain the analogy.`,
  writeUp: 'explanation',
  hints: [
    t`What should the function return on ${ml`None`}?`,
    t`On ${ml`Some x`}, what should it return?`,
    t`In what sense is ${ml`None`} the empty list and ${ml`Some x`} a one-element list, and how does ${ml`map`} act on each?`,
  ],
});

// ---------------------------------------------------------------- lesson

export const mapFilterFold: TopicContent = {
  topicId: 'fp.map-filter-fold',
  goal: t`Process lists with map, filter, exists, and fold instead of writing the recursion each time, and chain them into pipelines.`,
  objective: t`Write list computations as pipelines of map, filter, exists, and fold, and evaluate them.`,
  why: t`Most list code is one of these patterns; naming them makes programs short and their proofs reusable.`,
  minutes: 35,
  lesson: [
    { kind: 'section', title: t`The same recursion, again and again` },
    { kind: 'hook', text: t`Write a function that doubles every number in a list. Now one that adds ${1} to every number. Now one that turns every string into its length. Look at your three functions side by side: they are the same function with one small piece changed.` },
    { kind: 'narrative', text: t`When three programs differ in one small piece, make that piece an argument. The piece here is a function, so the result is a higher-order function. FoCS calls it the "apply to all" functional.` },
    { kind: 'rule', text: [mlBlock`
      let rec map f = function
        | [] -> []
        | x :: xs -> f x :: map f xs
    `] },
    { kind: 'definition', name: t`Map`, formal: t`For ${ml`f : 'a -> 'b`}, the [[map-functional|map]] ${ml`map f : 'a list -> 'b list`} satisfies ${ml`map f [x${1}; ...; xn] = [f x${1}; ...; f xn]`}.`, plain: t`Apply ${ml`f`} to every element and keep the order. ${ml`map (fun s -> s ^ "ppy") ["Hi"; "Ho"]`} is ${ml`["Hippy"; "Hoppy"]`}, from FoCS Lecture ${8}.` },
    { kind: 'definition', name: t`Filter and exists`, formal: t`A predicate is a function ${ml`p : 'a -> bool`}. ${ml`filter p xs`}, the [[filter-functional|filter]], is the list of the elements ${ml`x`} of ${ml`xs`}, in order, with ${ml`p x`} true; ${ml`exists p xs`} is true when ${ml`p x`} is true for at least one element.`, plain: t`Filter keeps some elements and drops the rest; exists asks a yes or no question. ${ml`List.filter (fun x -> x > ${2}) ${mlList([1, 5, 2, 8])}`} is ${ml`${mlList([5, 8])}`}.` },
    { kind: 'section', title: t`Fold: combining a whole list` },
    { kind: 'narrative', text: t`Map and filter return lists. But often you want one value from a list: its sum, its maximum, a string built from it. Each of these starts with a value and combines it with the elements one by one. That is the third pattern.` },
    { kind: 'definition', name: t`Fold left and fold right`, formal: t`For a function ${ml`f`} and a start value ${ml`a`}, the [[fold|folds]] are ${ml`fold_left f a [x${1}; ...; xn] = f (... (f (f a x${1}) x${2}) ...) xn`} and ${ml`fold_right f [x${1}; ...; xn] a = f x${1} (f x${2} (... (f xn a) ...))`}.`, plain: t`${ml`fold_left`} walks from the left end, carrying an accumulator; ${ml`fold_right`} brackets from the right end. ${ml`List.fold_left ( + ) ${0} ${mlList([1, 2, 3])}`} is ${math`((${0} + ${1}) + ${2}) + ${3} = ${6}`}.` },
    {
      kind: 'steps',
      steps: [
        { label: t`Start with the accumulator`, text: t`${ml`List.fold_left (fun acc x -> acc - x) ${10} ${mlList([1, 2, 3])}`} begins with ${ml`acc = ${10}`}.`, plain: t`The start value goes on the left of the first step.` },
        { label: t`Combine with each element`, text: t`${math`${10} - ${1} = ${9}`}, then ${math`${9} - ${2} = ${7}`}, then ${math`${7} - ${3} = ${4}`}.`, plain: t`Each step feeds the new accumulator into the next.` },
        { label: t`Compare fold right`, text: t`${ml`List.fold_right (fun x acc -> x - acc) ${mlList([1, 2, 3])} ${10}`} is ${math`${1} - (${2} - (${3} - ${10})) = ${1 - (2 - (3 - 10))}`}.`, plain: t`Same numbers, same operation, different brackets, different answer.`, why: { q: t`Why does the order of brackets matter here and not for ${ml`( + )`}?`, a: t`Addition is associative: ${math`(a + b) + c = a + (b + c)`}. Subtraction is not: ${math`(${10} - ${1}) - ${2} = ${7}`} but ${math`${10} - (${1} - ${2}) = ${11}`}.` } },
      ],
    },
    checkFrom(foldDirection, { left: true, a: 20, xs: [4, 7, 2] }, t`From ${20}: subtract ${4}, then ${7}, then ${2}, leaving ${7}.`),
    { kind: 'pitfall', claim: t`${ml`fold_left`} and ${ml`fold_right`} always give the same answer.`, counterexample: t`They agree when the operation is associative and the start value fits both ends, as for ${ml`( + )`} from ${0}. With subtraction they differ: the steps above give ${4} and ${1 - (2 - (3 - 10))}. Note too that the two take the function's arguments in opposite orders: ${ml`acc x`} for the left fold, ${ml`x acc`} for the right.` },
    { kind: 'section', title: t`Pipelines, and why one map is enough` },
    { kind: 'narrative', text: t`The pipeline operator ${ml`x |> f`} means ${ml`f x`}. It lets a computation read in the order it happens, as stages: produce, filter, transform, combine.` },
    checkFrom(pipeline, { xs: [3, 8, 5, 2, 6], p: 'even', c: 4, f: 'square', d: 1 }, t`Keep ${8}, ${2}, ${6}; square them to ${64}, ${4}, ${36}; the sum is ${104}.`),
    { kind: 'narrative', text: t`Two maps in a row walk the list twice. Can one walk do? Yes, and because these functions have no side effects we can prove it, by induction on the list.` },
    { kind: 'theorem', name: t`Map fusion`, statement: t`For all functions ${ml`f`} and ${ml`g`} and every finite list ${ml`xs`}, ${ml`map f (map g xs) = map (fun x -> f (g x)) xs`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Base case`, text: t`For ${ml`xs = []`}: both sides are ${ml`[]`}, by the first clause of ${ml`map`}.`, plain: t`Mapping anything over the empty list gives the empty list.` },
        { label: t`Inductive hypothesis`, text: t`Assume ${ml`map f (map g ys) = map (fun x -> f (g x)) ys`} for a list ${ml`ys`}.`, plain: t`We may use the claim for the shorter list.` },
        { label: t`Unfold the left side`, text: t`${ml`map f (map g (y :: ys)) = map f (g y :: map g ys) = f (g y) :: map f (map g ys)`}.`, plain: t`Use the second clause of ${ml`map`} twice, inside then outside.` },
        { label: t`Use the hypothesis`, text: t`This equals ${ml`f (g y) :: map (fun x -> f (g x)) ys`}, which is ${ml`map (fun x -> f (g x)) (y :: ys)`}.`, plain: t`The last step is the second clause of ${ml`map`} read backwards. So the claim holds for every list.` },
      ],
    },
    { kind: 'takeaway', text: t`Map transforms each element, filter selects, exists tests, and fold combines; most list code is a pipeline of these.` },
  ],
  examples: [
    { ...workedCambridge(sco10), examiner: t`The examiner wants no new recursion: each stage a library functional, and the value checked by hand.` },
    worked(pipeline, { xs: [7, 2, 9, 4, 1], p: 'gt', c: 3, f: 'add', d: 5 }, t`Filter, then map, then fold`),
    worked(foldDirection, { left: false, a: 2, xs: [9, 4, 6] }, t`A right fold with subtraction`),
  ],
  generators: [pipeline, foldDirection, whichFunctional],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['map-functional', 'filter-functional', 'fold'],
  cambridge: withUses([sco5, existsEx, mapComposition, matrixMultiply, focs83, focs84, cst2016Zarg], {
    'cst-2016-p1-q1-b': { sections: ['Fold: combining a whole list'], note: t`Recognising a fold in an unfamiliar recursive function, and using it` },
    'cs3110-4-matrix-multiply': { sections: ['The same recursion, again and again', 'Pipelines, and why one map is enough'], note: t`Matrix multiplication with maps` },
    'focs-8-3': { sections: ['The same recursion, again and again'], note: t`Writing a nested map with one recursive function` },
  }),
  // The Cambridge problems first: the Tripos question and FoCS 8.3, then CS3110's matrix multiply.
  gate: ['cst-2016-p1-q1-b', 'focs-8-3', 'cs3110-4-matrix-multiply'],
  recall: [
    { front: t`What does ${ml`map f [x${1}; ...; xn]`} return?`, back: t`${ml`[f x${1}; ...; f xn]`}.` },
    { front: t`State ${ml`fold_left`} and ${ml`fold_right`} on ${ml`[x${1}; ...; xn]`}.`, back: t`${ml`f (... (f a x${1}) ...) xn`} and ${ml`f x${1} (... (f xn a) ...)`}.` },
    { front: t`State map fusion.`, back: t`${ml`map f (map g xs) = map (fun x -> f (g x)) xs`}, proved by induction on ${ml`xs`}.` },
  ],
  proofOrder: [{
    title: t`Map fusion by induction`,
    steps: [
      t`Base case: both sides of the empty list are the empty list.`,
      t`Assume the claim for a list ${ml`ys`}.`,
      t`Unfold ${ml`map`} twice on ${ml`y :: ys`} to get ${ml`f (g y) :: map f (map g ys)`}.`,
      t`Apply the hypothesis to the tail and fold ${ml`map`} back up.`,
    ],
  }],
};
