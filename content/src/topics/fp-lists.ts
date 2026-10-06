/**
 * fp.lists: Lists and pattern matching. The lesson follows FoCS Lecture 3 (the list
 * primitives, head and tail, length, append, nrev and rev_app with their costs) and CS3110
 * Section 3.1 (building lists with :: and [], pattern matching). The problems are FoCS
 * Exercises 3.2 and 3.5 and the CS3110 Chapter 3 exercises "list expressions" and "take drop".
 *
 * Every OCaml answer was run in the OCaml 4.11.1 toplevel (scratch file ocamlE/t6.ml):
 *   tails [1; 2; 3] = [[1; 2; 3]; [2; 3]; [3]; []]
 *   [1; 2; 3; 4; 5], 1 :: 2 :: 3 :: 4 :: 5 :: [], and [1] @ [2; 3; 4] @ [5] are all [1; 2; 3; 4; 5];
 *   [1; 2; 3] :: [4; 5] is a type error
 *   take 5 [10; 20; 30] = [10; 20; 30]; drop 5 [10; 20; 30] = []
 *   [1, 2] : (int * int) list = [(1, 2)]
 */
import { auto, cite, same, supervision } from '../cambridge';
import { code, codeBlock, oc, showList, showLists } from '../ocaml-code';
import { int, pick } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { dmath, math, t, type Rich } from '../rich';
import { checkFrom, workedCambridge, worked, type TopicContent } from '../topic';
import type { Rng } from '@learnhub/mastery';

const randList = (rng: Rng, n: number): number[] => Array.from({ length: n }, () => int(rng, 1, 9));

// ---------------------------------------------------------------- lengths of list expressions

interface LenP { form: number; xs: number[]; ys: number[]; x: number }

const LEN_FORMS = 4;
const lengths = generator<LenP>({
  id: 'list-length',
  quick: true,
  skill: 'Read a list expression built with ::, @, and brackets, and count the elements of the result.',
  params: (rng) => ({ form: int(rng, 0, LEN_FORMS - 1), xs: randList(rng, int(rng, 3, 5)), ys: randList(rng, int(rng, 2, 4)), x: int(rng, 1, 9) }),
  sane: ({ form, xs, ys }) => (form >= 0 && form < LEN_FORMS && xs.length >= 3 && ys.length >= 2 ? null : 'out of range'),
  problem: ({ form, xs, ys, x }) => {
    const [a, b] = [xs.length, ys.length];
    const expr = [code`${x} :: ${xs}`, code`${xs} @ ${ys}`, code`[${oc(showList(xs))}; ${oc(showList(ys))}]`, code`[${x}] @ ${xs} @ [${x}]`][form] as Rich[number];
    const ans = [a + 1, a + b, 2, a + 2][form] as number;
    const why = [
      t`${code`::`} puts one element on the front of a list: ${a} elements become ${a + 1}.`,
      t`${code`@`} joins two lists end to end: ${a} and ${b} elements make ${a + b}.`,
      t`The square brackets make a list whose elements are the two lists themselves: a list of lists, of type ${code`int list list`}, with ${2} elements.`,
      t`${code`[${x}]`} is a list of one element; joining it on both sides adds ${2} elements to the ${a}.`,
    ][form] as Rich;
    return {
      prompt: t`How many elements does the list ${expr} have?`,
      answer: { kind: 'exact', expected: String(ans) },
      solution: [why, t`So the length is ${ans}.`],
    };
  },
  solve: ({ form, xs, ys, x }) => {
    // Build the value as OCaml would and measure it.
    const values: unknown[][] = [[x, ...xs], [...xs, ...ys], [xs, ys], [x, ...xs, x]];
    return String((values[form] as unknown[]).length);
  },
  misconceptions: ({ form, xs, ys }): Misconception[] => {
    const [a, b] = [xs.length, ys.length];
    switch (form) {
      case 0: return [
        { response: String(a), why: t`The ${code`::`} adds a new first element, so there is one more than in the tail.` },
        { response: '2', why: t`${code`x :: xs`} is not a pair: it is the whole list ${code`xs`} with ${code`x`} in front.` },
      ];
      case 1: return [
        { response: '2', why: t`${code`@`} joins the lists into one flat list; it does not make a list of two lists.` },
        { response: String(Math.max(a, b)), why: t`${code`@`} keeps every element of both lists.` },
      ];
      case 2: return [
        { response: String(a + b), why: t`The elements are the two lists, not the numbers inside them: this is a list of lists, not ${code`@`}.` },
        { response: String(a), why: t`Both inner lists are elements of the outer one.` },
      ];
      default: return [
        { response: String(a + 1), why: t`The single element list is joined on both ends: ${2} extra elements.` },
        { response: '3', why: t`${code`@`} joins the elements of the lists into one flat list; it does not count the lists.` },
      ];
    }
  },
});

// ---------------------------------------------------------------- list functions, value by value

type ListFn = 'take' | 'drop' | 'rev' | 'revapp';
interface FnP { fn: number; k: number; xs: number[]; ys: number[] }
const FNS: readonly ListFn[] = ['take', 'drop', 'rev', 'revapp'];

const take = (k: number, l: readonly number[]): number[] => (k === 0 || l.length === 0 ? [] : [l[0] as number, ...take(k - 1, l.slice(1))]);
const drop = (k: number, l: readonly number[]): number[] => (k === 0 || l.length === 0 ? [...l] : drop(k - 1, l.slice(1)));
const revApp = (l: readonly number[], acc: readonly number[]): number[] => (l.length === 0 ? [...acc] : revApp(l.slice(1), [l[0] as number, ...acc]));

const listFn = generator<FnP>({
  id: 'list-function',
  quick: true,
  skill: 'Evaluate take, drop, nrev, and rev_app on a given list, following their recursive definitions.',
  params: (rng) => {
    for (;;) {
      const xs = randList(rng, int(rng, 4, 6));
      const p = { fn: int(rng, 0, FNS.length - 1), k: int(rng, 1, 3), xs, ys: randList(rng, 2) };
      // Distinct elements, so every slip gives a different list.
      if (new Set([...xs, ...p.ys]).size === xs.length + 2) return p;
    }
  },
  sane: ({ fn, k, xs, ys }) => (fn >= 0 && fn < FNS.length && k >= 1 && k < xs.length && new Set([...xs, ...ys]).size === xs.length + ys.length ? null : 'out of range'),
  problem: ({ fn, k, xs, ys }) => {
    const f = FNS[fn] as ListFn;
    const right = f === 'take' ? take(k, xs) : f === 'drop' ? drop(k, xs) : f === 'rev' ? revApp(xs, []) : revApp(xs, ys);
    const opts = listOptions(right, wrongLists({ fn, k, xs, ys }).map((w) => w.list));
    const expr = f === 'take' ? code`take ${k} ${xs}` : f === 'drop' ? code`drop ${k} ${xs}` : f === 'rev' ? code`nrev ${xs}` : code`rev_app ${xs} ${ys}`;
    const def = f === 'take'
      ? t`${code`take k xs`} returns the first ${code`k`} elements of ${code`xs`}`
      : f === 'drop'
        ? t`${code`drop k xs`} returns all but the first ${code`k`} elements of ${code`xs`}`
        : f === 'rev'
          ? t`${code`nrev [] = []`} and ${code`nrev (x :: xs) = nrev xs @ [x]`}`
          : t`${code`rev_app [] ys = ys`} and ${code`rev_app (x :: xs) ys = rev_app xs (x :: ys)`}`;
    return {
      prompt: t`FoCS defines: ${def}. What is ${expr}?`,
      answer: { kind: 'choice', options: opts.options, correct: opts.right },
      solution: [
        f === 'take' ? t`Keep the head and count down until ${code`k`} reaches ${0}: the first ${k} elements.`
          : f === 'drop' ? t`Discard the head and count down until ${code`k`} reaches ${0}; what is left is returned.`
            : f === 'rev' ? t`Each step moves the head to the end of the reversed tail, so the whole list comes out backwards.`
              : t`Each step moves the head of the first list onto the front of the second, so the first list arrives reversed in front of ${code`${ys}`}.`,
        t`The result is ${code`${right}`}.`,
      ],
    };
  },
  solve: (p) => {
    // Run the recursive definitions on OCaml-style lists of cons cells.
    type L = null | { h: number; t: L };
    const of = (a: readonly number[]): L => a.reduceRight<L>((t, h) => ({ h, t }), null);
    const to = (l: L): number[] => (l === null ? [] : [l.h, ...to(l.t)]);
    const tk = (k: number, l: L): L => (k === 0 || l === null ? null : { h: l.h, t: tk(k - 1, l.t) });
    const dr = (k: number, l: L): L => (k === 0 || l === null ? l : dr(k - 1, l.t));
    const app = (a: L, b: L): L => (a === null ? b : { h: a.h, t: app(a.t, b) });
    const nrev = (l: L): L => (l === null ? null : app(nrev(l.t), { h: l.h, t: null }));
    const ra = (a: L, b: L): L => (a === null ? b : ra(a.t, { h: a.h, t: b }));
    const f = FNS[p.fn] as ListFn;
    const v = to(f === 'take' ? tk(p.k, of(p.xs)) : f === 'drop' ? dr(p.k, of(p.xs)) : f === 'rev' ? nrev(of(p.xs)) : ra(of(p.xs), of(p.ys)));
    const opts = listOptions(v, wrongLists(p).map((w) => w.list));
    return [opts.right];
  },
  misconceptions: (p) => {
    const right = (() => {
      const f = FNS[p.fn] as ListFn;
      return f === 'take' ? take(p.k, p.xs) : f === 'drop' ? drop(p.k, p.xs) : f === 'rev' ? revApp(p.xs, []) : revApp(p.xs, p.ys);
    })();
    const ws = wrongLists(p);
    const opts = listOptions(right, ws.map((w) => w.list));
    return ws.map((w) => ({ response: [opts.idOf(w.list)], why: w.why }));
  },
});

function wrongLists({ fn, k, xs, ys }: FnP): { list: number[]; why: Rich }[] {
  switch (FNS[fn]) {
    case 'take': return [
      { list: drop(k, xs), why: t`That is ${code`drop ${k}`}: it keeps what comes after the first ${k}. ${code`take`} keeps the first ${k}.` },
      { list: take(k + 1, xs), why: t`Count again: ${code`take ${k}`} keeps exactly ${k} elements.` },
    ];
    case 'drop': return [
      { list: take(k, xs), why: t`That is ${code`take ${k}`}, the part that ${code`drop`} throws away.` },
      { list: drop(k - 1, xs), why: t`${code`drop ${k}`} removes ${k} elements, not ${k - 1}.` },
    ];
    case 'rev': return [
      { list: [...xs], why: t`${code`nrev`} reverses: the last element comes first.` },
      { list: [...xs.slice(1), xs[0] as number], why: t`That moves only the head to the end. The recursion does this at every level, which reverses the whole list.` },
    ];
    default: return [
      { list: [...ys, ...revApp(xs, [])], why: t`The reversed first list goes in front of ${code`${ys}`}, since each element is consed onto the front of the accumulator.` },
      { list: [...xs, ...ys], why: t`Each step conses the head onto the accumulator, which reverses the first list.` },
    ];
  }
}

/** Choice options for list answers: the right list and the wrong ones, each once, in a fixed order. */
function listOptions(right: readonly number[], wrongs: readonly (readonly number[])[]): { options: ChoiceOption[]; right: string; idOf: (l: readonly number[]) => string } {
  const keys: string[] = [];
  for (const l of [right, ...wrongs]) if (!keys.includes(showList(l))) keys.push(showList(l));
  const sorted = [...keys].sort();
  const id = (k: string): string => `o${sorted.indexOf(k)}`;
  return {
    options: sorted.map((k) => ({ id: id(k), label: [code`${oc(k)}`] })),
    right: id(showList(right)),
    idOf: (l) => id(showList(l)),
  };
}

// ---------------------------------------------------------------- the cost of reversing

interface CostP { fn: number; n: number }

const consCount = generator<CostP>({
  id: 'cons-count',
  skill: 'Count the conses an append, nrev, or rev_app makes on a list of n elements, from their definitions, as FoCS does.',
  params: (rng) => ({ fn: pick(rng, [0, 1, 2]), n: int(rng, 4, 40) }),
  sane: ({ fn, n }) => (fn >= 0 && fn <= 2 && n >= 4 ? null : 'out of range'),
  problem: ({ fn, n }) => {
    const ans = [(n * (n + 1)) / 2, n, n][fn] as number;
    const what = [[code`nrev xs`], [code`rev_app xs []`], t`${code`xs @ ys`}, where ${code`ys`} is an existing list of ${3} elements`][fn] as Rich;
    return {
      prompt: t`A cons is one use of ${code`::`} to build a new list cell. If ${code`xs`} has ${n} elements, how many conses does evaluating ${what} make?`,
      answer: { kind: 'exact', expected: String(ans) },
      solution: [
        [
          t`${code`nrev (x :: xs)`} is ${code`nrev xs @ [x]`}. Making ${code`[x]`} is ${1} cons, and ${code`@`} copies its left argument, the reversed tail of ${math`m - ${1}`} elements: ${math`m`} conses at a list of length ${math`m`}.`,
          t`${code`rev_app (x :: xs) ys`} calls ${code`rev_app xs (x :: ys)`}: exactly one cons per element.`,
          t`${code`xs @ ys`} copies ${code`xs`}, one cons per element, and shares ${code`ys`} without copying it.`,
        ][fn] as Rich,
        fn === 0
          ? t`Adding over the lengths ${n}, ${n - 1}, and so on down to ${1}: ${math`${1} + ${2} + \cdots + ${n} = \frac{${n} \times ${n + 1}}{${2}} = ${ans}`}.`
          : t`So ${n} conses in all.`,
      ],
    };
  },
  solve: ({ fn, n }) => {
    // Count by running the definitions with a cons counter.
    let conses = 0;
    const cons = <T>(h: T, tl: T[]): T[] => { conses++; return [h, ...tl]; };
    const app = (a: number[], b: number[]): number[] => (a.length === 0 ? b : cons(a[0] as number, app(a.slice(1), b)));
    const nrev = (l: number[]): number[] => (l.length === 0 ? [] : app(nrev(l.slice(1)), cons(l[0] as number, [])));
    const ra = (a: number[], b: number[]): number[] => (a.length === 0 ? b : ra(a.slice(1), cons(a[0] as number, b)));
    const xs = Array.from({ length: n }, (_, i) => i);
    if (fn === 0) nrev(xs);
    else if (fn === 1) ra(xs, []);
    else app(xs, [7, 8, 9]);
    return String(conses);
  },
  misconceptions: ({ fn, n }): Misconception[] => fn === 0
    ? [
      { response: String(n * n), why: t`The appends copy lists of lengths ${0} up to ${n - 1}, not ${n} each time, and each step adds ${1} for ${code`[x]`}: the total is ${math`\frac{n(n + ${1})}{${2}}`}.` },
      { response: String(n), why: t`That is ${code`rev_app`}. ${code`nrev`} uses ${code`@`}, which copies the whole reversed tail at every step.` },
    ]
    : [
      { response: String((n * (n + 1)) / 2), why: fn === 1 ? t`That is ${code`nrev`}. ${code`rev_app`} does one cons per element and never copies.` : t`${code`@`} walks down its left list once, copying each cell: one cons per element.` },
      { response: String(fn === 1 ? n + 1 : n + 3), why: fn === 1 ? t`The base case returns the accumulator without a cons: one cons per element.` : t`The right list ${code`ys`} is shared, not copied: only the ${n} cells of ${code`xs`} are new.` },
    ],
});

// ---------------------------------------------------------------- Cambridge problems

const TAILS_IN = [1, 2, 3];
const tailsOf = (l: readonly number[]): number[][] => (l.length === 0 ? [[]] : [[...l], ...tailsOf(l.slice(1))]);
const TAILS = tailsOf(TAILS_IN);
const tails = auto({
  id: 'focs-3-5',
  source: cite('focs-notes', 'Lecture 3, Exercise 3.5'),
  title: t`The tails of a list`,
  prompt: t`Code a function ${code`tails`} to return the list of the tails of its argument. What is ${code`tails ${TAILS_IN}`}?`,
  answer: {
    kind: 'choice',
    options: [
      { id: 'right', label: [code`${oc(showLists(TAILS))}`] },
      { id: 'noempty', label: [code`${oc(showLists(TAILS.slice(0, -1)))}`] },
      { id: 'nowhole', label: [code`${oc(showLists(TAILS.slice(1)))}`] },
      { id: 'heads', label: [code`${oc(showLists([[1], [1, 2], [1, 2, 3]]))}`] },
    ],
    correct: 'right',
  },
  solution: [
    t`A tail is what is left after removing some number of elements from the front, from none to all of them, so the list itself and the empty list are both tails.`,
    t`By pattern matching on the two shapes a list can have: ${codeBlock(code`let rec tails = function`, code`  | [] -> [[]]`, code`  | (_ :: t) as l -> l :: tails t`)}`,
    t`The empty list has one tail, itself. A list ${code`l`} with tail ${code`t`} has ${code`l`} as a tail, followed by all the tails of ${code`t`}.`,
    t`So ${code`tails ${TAILS_IN}`} is ${code`${oc(showLists(TAILS))}`}, with ${TAILS.length} tails for ${TAILS_IN.length} elements.`,
  ],
  reference: ['right'],
  // OCaml 4.11.1: tails [1; 2; 3] = [[1; 2; 3]; [2; 3]; [3]; []].
  verify: () => same('tails', showLists(TAILS), '[[1; 2; 3]; [2; 3]; [3]; []]'),
  misconceptions: [
    { response: ['noempty'], why: t`Removing all ${TAILS_IN.length} elements leaves ${code`[]`}, which is a tail too: the base case returns ${code`[[]]`}, not ${code`[]`}.` },
    { response: ['nowhole'], why: t`Removing no elements leaves the whole list, which counts as a tail.` },
    { response: ['heads'], why: t`Those are the prefixes, which keep the front. Tails keep the back.` },
  ],
});

const LE = [1, 2, 3, 4, 5];
const listExpr = auto({
  id: 'cs3110-ex3-list-expressions',
  source: cite('cs3110-ex3', 'Exercise "list expressions"', true),
  title: t`Three ways to build a list`,
  prompt: t`The exercise asks for the list of the integers ${1} to ${5} built three ways: with square brackets, with ${code`::`} and ${code`[]`}, and with ${code`@`} using ${code`[${2}; ${3}; ${4}]`}. Which of these is not equal to ${code`${LE}`}?`,
  answer: {
    kind: 'choice',
    options: [
      { id: 'brackets', label: [code`[${1}; ${2}; ${3}; ${4}; ${5}]`] },
      { id: 'cons', label: [code`${1} :: ${2} :: ${3} :: ${4} :: ${5} :: []`] },
      { id: 'append', label: [code`[${1}] @ [${2}; ${3}; ${4}] @ [${5}]`] },
      { id: 'mixed', label: [code`[${1}; ${2}; ${3}] :: [${4}; ${5}]`] },
    ],
    correct: 'mixed',
  },
  solution: [
    t`Square brackets are notation for conses ending in ${code`[]`}, so the first two are the same list.`,
    t`${code`@`} joins lists, so ${code`[${1}] @ [${2}; ${3}; ${4}] @ [${5}]`} is the same list again.`,
    t`${code`::`} puts one element in front of a list of elements of the same type. ${code`[${1}; ${2}; ${3}] :: [${4}; ${5}]`} would put a list in front of a list of ints: a type error, not a list at all.`,
  ],
  reference: ['mixed'],
  // OCaml 4.11.1: the first three print - : int list = [1; 2; 3; 4; 5]; the fourth is a type error.
  verify: () => same('the three lists', [[...LE], [1, 2, 3, 4, 5], [1, ...[2, 3, 4], 5]].map(showList).join(' '), '[1; 2; 3; 4; 5] [1; 2; 3; 4; 5] [1; 2; 3; 4; 5]'),
  misconceptions: [
    { response: ['cons'], why: t`${code`::`} groups to the right and the chain ends in ${code`[]`}: it is exactly ${code`${LE}`}.` },
    { response: ['append'], why: t`${code`@`} joins its lists end to end, giving ${code`${LE}`}.` },
  ],
});

const TD = [10, 20, 30];
const TD_N = 5;
const takeDrop = auto({
  id: 'cs3110-ex3-take-drop',
  source: cite('cs3110-ex3', 'Exercise "take drop"', true),
  title: t`Taking more than there is`,
  prompt: t`The exercise specifies ${code`take n lst`}: the first ${code`n`} elements of ${code`lst`}, or all of them if ${code`lst`} has fewer than ${code`n`}; and ${code`drop n lst`}: all but the first ${code`n`}, or the empty list if ${code`lst`} has fewer than ${code`n`}. What are ${code`take ${TD_N} ${TD}`} and ${code`drop ${TD_N} ${TD}`}?`,
  answer: {
    kind: 'choice',
    options: [
      { id: 'right', label: t`${code`${TD}`} and ${code`[]`}` },
      { id: 'swap', label: t`${code`[]`} and ${code`${TD}`}` },
      { id: 'error', label: t`both raise an exception, because the list is too short` },
      { id: 'pad', label: t`${code`[${10}; ${20}; ${30}; ${0}; ${0}]`} and ${code`[]`}` },
    ],
    correct: 'right',
  },
  solution: [
    t`One solution, matching on the list: ${codeBlock(code`let rec take n lst =`, code`  if n = ${0} then [] else match lst with`, code`    | [] -> []`, code`    | h :: t -> h :: take (n - ${1}) t`)}`,
    t`${code`take ${TD_N} ${TD}`} keeps ${10}, ${20}, ${30}, then meets ${code`[]`} with ${code`n`} still ${2}: the ${code`[] -> []`} case ends it. The result is ${code`${TD}`}, as the specification says.`,
    t`${code`drop`} discards ${3} elements and meets ${code`[]`} with ${code`n`} still ${2}, so it returns ${code`[]`}.`,
  ],
  reference: ['right'],
  // OCaml 4.11.1, with the definitions in the solution: take 5 [10; 20; 30] = [10; 20; 30]; drop 5 [10; 20; 30] = [].
  verify: () => same('take, drop', `${showList(take(TD_N, TD))} ${showList(drop(TD_N, TD))}`, '[10; 20; 30] []'),
  misconceptions: [
    { response: ['error'], why: t`The specification covers short lists: ${code`take`} returns all of them and ${code`drop`} the empty list. The ${code`[] -> []`} case makes that happen.` },
    { response: ['swap'], why: t`${code`take`} keeps the front, ${code`drop`} keeps what is after it.` },
  ],
});

const focs32 = supervision({
  id: 'focs-3-2',
  source: cite('focs-notes', 'Lecture 3, Exercise 3.2'),
  title: t`The last element`,
  prompt: t`Code a function to return the last element of a non-empty list. How efficiently can this be done? Say how many calls your function makes on a list of ${math`n`} elements, and why no function can do better.`,
  writeUp: 'explanation',
});

// Computer Science Tripos Part IA 2016, Paper 1, Question 2(a): a prime sieve on a list. The
// paper asks for Standard ML; here it is OCaml, so the citation is marked adapted.
const cst16 = supervision({
  id: 'cst-2016-p1-q2-a',
  source: cite('cst-y2016p1q2', '(a)', true),
  title: t`A prime sieve on a list`,
  prompt: t`A prime number sieve is an algorithm for finding all prime numbers up to a given limit ${math`n`}. The algorithm maintains a list, which initially holds the integers from ${2} to ${math`n`}. The following step is then repeated: remove the head of this list, which will be a prime number, and remove all its multiples from the list. Write code for the algorithm above as an OCaml function of type ${code`int -> int list`}. Explain your code clearly, and keep it free of needless complexity.`,
  writeUp: 'explanation',
});

// ---------------------------------------------------------------- lesson

const [L0, L1, L2] = [5, 6, 7];
const L3 = [L0, L1, L2];

export const fpLists: TopicContent = {
  topicId: 'fp.lists',
  goal: t`Build lists with ${code`::`} and ${code`[]`}, take them apart by pattern matching, and write recursive functions such as length, append, and reverse.`,
  objective: t`Build lists, take them apart by pattern matching, and write and cost length, append, and reverse.`,
  why: t`Lists are the functional programmer's main data structure; the same pattern carries over to trees.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`What a list really is` },
    { kind: 'hook', text: t`When you type ${code`${L3}`}, OCaml does not store three numbers side by side. It stores ${code`${L0} :: (${L1} :: (${L2} :: []))`}: a chain, each link holding one number and pointing to the rest. Everything about lists, including why one way to reverse a list is so much slower than another, follows from that picture.` },
    {
      kind: 'definition',
      name: t`List`,
      formal: t`For a type ${code`t`}, the values of type ${code`t list`} are given by two rules: ${code`[]`}, the empty list, is a ${code`t list`}; and if ${code`x : t`} and ${code`xs : t list`}, then ${code`x :: xs`} (read "${code`x`} cons ${code`xs`}") is a ${code`t list`}, with head ${code`x`} and tail ${code`xs`}. Every [[ocaml-list|list]] is built by finitely many uses of these rules. ${code`::`} groups to the right, and ${code`[a; b; c]`} is notation for ${code`a :: b :: c :: []`}.`,
      plain: t`A list is either empty, or a first element stuck on the front of a shorter list. ${code`[${L0}; ${L1}; ${L2}]`} has head ${L0} and tail ${code`[${L1}; ${L2}]`}. Each use of ${code`::`} is a [[cons|cons]], one new cell.`,
    },
    {
      kind: 'p',
      text: t`All the elements of a list have one type: ${code`[${1}; ${2}]`} is an ${code`int list`}, and ${code`[${1}; true]`} is a type error. The lesson on polymorphism explains the type ${code`'a list`} that you will see the toplevel print, where ${code`'a`} stands for any element type.`,
    },
    { kind: 'section', title: t`Taking lists apart: pattern matching` },
    { kind: 'narrative', text: t`Since a list is built in exactly two ways, a function on lists only has to say what to do in each of the two cases. OCaml's ${code`match`} lets you write the two shapes down and name the pieces.` },
    {
      kind: 'definition',
      name: t`Pattern matching`,
      formal: t`${code`match e with p${1} -> e${1} | ... | pn -> en`} evaluates ${code`e`} to a value ${math`v`}, then tries the patterns in order. The first pattern ${code`pi`} that matches ${math`v`} binds its variables to the corresponding parts of ${math`v`}, and the value of the match is that of ${code`ei`}. The pattern ${code`[]`} matches only the empty list; ${code`h :: t`} matches any non-empty list, binding ${code`h`} to its head and ${code`t`} to its tail; ${code`_`} matches anything and binds nothing.`,
      plain: t`[[pattern-matching|Pattern matching]] is a case split on the shape of the value. Matching ${code`${L3}`} against ${code`h :: t`} sets ${code`h`} to ${L0} and ${code`t`} to ${code`[${L1}; ${L2}]`}.`,
    },
    { kind: 'rule', text: [codeBlock(code`let rec length = function`, code`  | [] -> ${0}`, code`  | _ :: t -> ${1} + length t`)] },
    {
      kind: 'steps',
      steps: [
        { label: t`Match the first cell`, text: t`${code`length ${L3}`}: the list is not empty, so the second case matches with ${code`t`} equal to ${code`[${L1}; ${L2}]`}.`, eq: [code`${1} + length [${L1}; ${L2}]`] },
        { label: t`Keep going`, text: t`The same case matches twice more.`, eq: [code`${1} + (${1} + (${1} + length []))`] },
        { label: t`Base case`, text: t`${code`length []`} matches the first case and is ${0}, so the sum is ${L3.length}.`, why: { q: t`Why ${code`function`} instead of ${code`fun`}?`, a: t`${code`function`} is shorthand for ${code`fun x -> match x with`}: a function that immediately matches its argument. FoCS and CS${3110} use it for functions defined case by case.` } },
      ],
    },
    checkFrom(lengths, { form: 2, xs: [4, 1, 7], ys: [2, 9], x: 3 }, t`The outer brackets hold two elements, and each is a list: the result has type ${code`int list list`} and length ${2}.`),
    { kind: 'section', title: t`Append, and two ways to reverse` },
    { kind: 'narrative', text: t`Joining two lists, ${code`xs @ ys`}, cannot just link the end of ${code`xs`} to ${code`ys`}: lists cannot be changed once built, and ${code`xs`} might be used elsewhere. So ${code`@`} copies ${code`xs`}, cell by cell, and the copy ends in ${code`ys`}, which is shared. The cost is one cons per element of the left list.` },
    { kind: 'rule', text: [codeBlock(code`let rec append xs ys = match xs with`, code`  | [] -> ys`, code`  | x :: t -> x :: append t ys`)] },
    { kind: 'narrative', text: t`The obvious way to reverse a list is FoCS's ${code`nrev`}: reverse the tail, then append the head at the end, ${code`nrev (x :: xs) = nrev xs @ [x]`}. It is correct, and it is slow, because each append copies the whole reversed tail.` },
    {
      kind: 'theorem',
      name: t`The cost of nrev`,
      statement: t`For a list of ${math`n \ge ${0}`} elements, ${code`nrev`} makes ${math`\frac{n(n + ${1})}{${2}}`} conses.`,
    },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`The recurrence`, text: t`Let ${math`T(n)`} be the number of conses. ${code`nrev []`} makes none, so ${math`T(${0}) = ${0}`}. For a list of ${math`n > ${0}`} elements, ${code`nrev xs @ [x]`} reverses the tail, ${math`T(n - ${1})`} conses; builds ${code`[x]`}, ${1} cons; and appends, copying the reversed tail of ${math`n - ${1}`} elements, ${math`n - ${1}`} conses.`, eq: [dmath`T(n) = T(n - ${1}) + ${1} + (n - ${1}) = T(n - ${1}) + n`] },
        { label: t`Unroll`, text: t`Apply the recurrence down to ${math`T(${0})`}.`, eq: [dmath`T(n) = n + (n - ${1}) + \cdots + ${1} + T(${0}) = \frac{n(n + ${1})}{${2}}`], why: { q: t`Why is that sum equal to ${math`\frac{n(n + ${1})}{${2}}`}?`, a: t`Write the sum forwards and backwards and add: each of the ${math`n`} columns adds up to ${math`n + ${1}`}, so twice the sum is ${math`n(n + ${1})`}.` } },
        { label: t`Conclude`, text: t`So ${code`nrev`} makes ${math`\frac{n(n + ${1})}{${2}}`} conses: quadratic in ${math`n`}. On ${1000} elements that is ${(1000 * 1001) / 2} conses.` },
      ],
    },
    { kind: 'narrative', text: t`The fix is an accumulator, as in the lesson on recursion. ${code`rev_app xs ys`} moves the elements of ${code`xs`} one at a time onto the front of ${code`ys`}; the first one moved ends up deepest, so they arrive in reverse. Then ${code`rev xs = rev_app xs []`} makes just ${math`n`} conses.` },
    { kind: 'rule', text: [codeBlock(code`let rec rev_app xs ys = match xs with`, code`  | [] -> ys`, code`  | x :: t -> rev_app t (x :: ys)`)] },
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`${code`[${1}, ${2}]`} is a list of two numbers.`, counterexample: t`The comma makes a pair: ${code`[${1}, ${2}]`} is the one element list ${code`[(${1}, ${2})]`}, of type ${code`(int * int) list`}. List elements are separated by semicolons.` },
    { kind: 'pitfall', claim: t`${code`::`} joins two lists.`, counterexample: t`${code`[${1}; ${2}] :: [${3}]`} is a type error: ${code`::`} puts one element on the front of a list. Joining is ${code`@`}: ${code`[${1}; ${2}] @ [${3}]`} is ${code`[${1}; ${2}; ${3}]`}.` },
    { kind: 'pitfall', claim: t`A match only needs the cases you expect.`, counterexample: t`${code`let hd (h :: _) = h`} has no case for ${code`[]`}. OCaml warns that the match is not exhaustive, and ${code`hd []`} fails when it runs. Cover both shapes of a list.` },
    { kind: 'takeaway', text: t`A list is ${code`[]`} or ${code`x :: xs`}, so a list function is two cases joined by a recursion on the tail; ${code`@`} copies its left list, which makes ${code`nrev`} quadratic, while ${code`rev_app`} reverses in linear time with an accumulator.` },
  ],
  examples: [
    workedCambridge(tails),
    worked(listFn, { fn: 3, k: 1, xs: [1, 2, 3, 4], ys: [8, 9] }, t`Reversing onto an accumulator`),
    worked(consCount, { fn: 0, n: 10 }, t`How many conses nrev makes`),
  ],
  generators: [lengths, listFn, consCount],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['ocaml-list', 'cons', 'pattern-matching'],
  cambridge: [cst16, listExpr, takeDrop, focs32],
  // Best first: the 2016 Tripos sieve, then FoCS Exercise 3.2.
  gate: ['cst-2016-p1-q2-a', 'focs-3-2'],
  recall: [
    { front: t`What are the two ways to build a list?`, back: t`${code`[]`}, the empty list, and ${code`x :: xs`}, an element on the front of a list of the same type.` },
    { front: t`How many conses does ${code`xs @ ys`} make?`, back: t`One per element of ${code`xs`}: it copies the left list and shares the right.` },
    { front: t`How many conses do ${code`nrev`} and ${code`rev`} make on ${math`n`} elements?`, back: t`${code`nrev`}: ${math`\frac{n(n + ${1})}{${2}}`}; ${code`rev`}, through ${code`rev_app`}: ${math`n`}.` },
  ],
  proofOrder: [
    {
      title: t`${code`nrev`} makes ${math`\frac{n(n + ${1})}{${2}}`} conses`,
      steps: [
        t`An empty list costs nothing: ${math`T(${0}) = ${0}`}.`,
        t`A list of ${math`n`} elements costs the tail's reversal, one cons for ${code`[x]`}, and ${math`n - ${1}`} to copy the reversed tail.`,
        t`So ${math`T(n) = T(n - ${1}) + n`}.`,
        t`Unrolling gives ${math`n + (n - ${1}) + \cdots + ${1} = \frac{n(n + ${1})}{${2}}`}.`,
      ],
    },
  ],
};
