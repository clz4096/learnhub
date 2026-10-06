/**
 * fp.variants: Variants and algebraic data types. The lesson follows FoCS Lecture 6 (an
 * enumeration type, constructors with arguments, the wheels function, the option type) and
 * CS3110 Sections 3.2, 3.7, and 3.9 (variants, options, algebraic data types, exhaustive
 * matching). The problems are the CS3110 Chapter 3 exercises "matching", "quadrant", and
 * "safe hd and tl", and FoCS Exercise 6.1.
 *
 * Every OCaml answer was run in the OCaml 4.11.1 toplevel (scratch file ocamlE/t9.ml):
 *   quadrant (-3, 5) = Some II; quadrant (0, 4) = None (with the sign helper of the exercise)
 *   [Some 3110; None] matches the pattern [Some 3110; None]; h :: tl matches every non-empty list
 *   wheels Lorry = 18 for the enumeration; safe_hd : 'a list -> 'a option; safe_tl : 'a list -> 'a list option
 */
import { auto, cite, same, supervision } from '../cambridge';
import { code, codeBlock, oc } from '../ocaml-code';
import { int, pick } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { math, t, type Rich } from '../rich';
import { checkFrom, workedCambridge, worked, type TopicContent } from '../topic';
import type { Rng } from '@learnhub/mastery';

// ---------------------------------------------------------------- FoCS vehicles

type Vehicle = { c: 'Bike' } | { c: 'Motorbike'; cc: number } | { c: 'Car'; robin: boolean } | { c: 'Lorry'; w: number };
const vSrc = (v: Vehicle): string => (v.c === 'Bike' ? 'Bike' : v.c === 'Motorbike' ? `Motorbike ${v.cc}` : v.c === 'Car' ? `Car ${String(v.robin)}` : `Lorry ${v.w}`);
/** FoCS's finer wheels function, case by case. */
const wheels = (v: Vehicle): number => {
  switch (v.c) {
    case 'Bike': return 2;
    case 'Motorbike': return 2;
    case 'Car': return v.robin ? 3 : 4;
    case 'Lorry': return v.w;
  }
};

interface WheelsP { vs: Vehicle[] }

const WHEELS_DEF = codeBlock(
  code`type vehicle = Bike | Motorbike of int | Car of bool | Lorry of int`,
  code`let wheels = function`,
  code`  | Bike -> ${2}`,
  code`  | Motorbike _ -> ${2}`,
  code`  | Car robin -> if robin then ${3} else ${4}`,
  code`  | Lorry w -> w`,
);

const wheelsGen = generator<WheelsP>({
  id: 'wheels',
  quick: true,
  skill: 'Evaluate a function defined by matching on a variant whose constructors carry arguments, as FoCS\'s wheels does.',
  params: (rng: Rng) => {
    const third: Vehicle = pick(rng, [0, 1]) === 0 ? { c: 'Bike' } : { c: 'Lorry', w: pick(rng, [6, 8, 10, 12, 18]) };
    const vs: Vehicle[] = [{ c: 'Motorbike', cc: pick(rng, [125, 250, 450, 600, 750]) }, { c: 'Car', robin: pick(rng, [true, false]) }, third];
    const k = int(rng, 0, 2);
    return { vs: [...vs.slice(k), ...vs.slice(0, k)] };
  },
  sane: ({ vs }) => (vs.length === 3 && vs.some((v) => v.c === 'Car') && vs.some((v) => v.c === 'Motorbike') ? null : 'out of range'),
  problem: ({ vs }) => {
    const total = vs.reduce((s, v) => s + wheels(v), 0);
    return {
      prompt: t`FoCS's vehicles: ${WHEELS_DEF} What is ${code`${oc(vs.map((v) => `wheels (${vSrc(v)})`).join(' + '))}`}?`,
      answer: { kind: 'exact', expected: String(total) },
      solution: [
        ...vs.map((v) => t`${code`wheels (${oc(vSrc(v))})`} matches the case for ${code`${v.c}`}: ${v.c === 'Motorbike' ? t`the engine size is ignored by ${code`_`}, so ${2}.` : v.c === 'Car' ? t`${code`robin`} is ${code`${String(v.robin)}`}, so ${wheels(v)}.` : v.c === 'Lorry' ? t`${code`w`} is bound to ${v.w}, which is returned.` : t`${2}.`}`),
        t`The total is ${total}.`,
      ],
    };
  },
  solve: ({ vs }) => {
    // Match each value against the four patterns in order.
    let s = 0;
    for (const v of vs) {
      if (v.c === 'Bike') s += 2;
      else if (v.c === 'Motorbike') s += 2;
      else if (v.c === 'Car') s += v.robin ? 3 : 4;
      else s += v.w;
    }
    return String(s);
  },
  misconceptions: ({ vs }): Misconception[] => {
    const total = vs.reduce((s, v) => s + wheels(v), 0);
    const car = vs.find((v) => v.c === 'Car') as { c: 'Car'; robin: boolean };
    const bike = vs.find((v) => v.c === 'Motorbike') as { c: 'Motorbike'; cc: number };
    return [
      { response: String(total + (car.robin ? 1 : -1)), why: t`${code`Car true`} is a Reliant Robin, with ${3} wheels; ${code`Car false`} has ${4}. Here the car is ${code`Car ${String(car.robin)}`}.` },
      { response: String(total - 2 + bike.cc), why: t`The ${code`_`} in ${code`Motorbike _`} discards the engine size ${bike.cc}; the case returns ${2}.` },
    ];
  },
});

// ---------------------------------------------------------------- options

interface OptP { a: number; b: number; d: number; e: number }

const optionGen = generator<OptP>({
  id: 'option-eval',
  quick: true,
  skill: 'Evaluate a match on an option: None when there is no result, Some carrying the result when there is.',
  params: (rng) => {
    for (;;) {
      const p = { a: int(rng, 10, 99), b: pick(rng, [0, 0, 2, 3, 4, 5, 6, 7]), d: int(rng, 1, 9) * -1, e: int(rng, 1, 9) };
      const q = p.b === 0 ? 0 : Math.trunc(p.a / p.b);
      if (p.d !== q && p.d !== q + p.e && p.d + p.e !== q + p.e) return p;
    }
  },
  sane: ({ b, e, d }) => (b >= 0 && e >= 1 && d < 0 ? null : 'out of range'),
  problem: ({ a, b, d, e }) => {
    const q = b === 0 ? 0 : Math.trunc(a / b);
    const ans = b === 0 ? d : q + e;
    return {
      prompt: t`Given ${codeBlock(code`let safe_div a b = if b = ${0} then None else Some (a / b)`)} what is ${code`match safe_div ${a} ${b} with None -> ${d} | Some q -> q + ${e}`}?`,
      answer: { kind: 'exact', expected: String(ans) },
      solution: b === 0
        ? [t`The divisor is ${0}, so ${code`safe_div`} returns ${code`None`}.`, t`${code`None`} matches the first case, whose value is ${d}.`]
        : [t`The divisor is not ${0}, so ${code`safe_div ${a} ${b}`} is ${code`Some ${q}`}, since ${code`${a} / ${b}`} truncates to ${q}.`, t`That matches ${code`Some q`} with ${code`q`} bound to ${q}: ${math`${q} + ${e} = ${ans}`}.`],
    };
  },
  solve: ({ a, b, d, e }) => {
    const r: { some: false } | { some: true; v: number } = b === 0 ? { some: false } : { some: true, v: Math.trunc(a / b) };
    return String(r.some ? r.v + e : d);
  },
  misconceptions: ({ a, b, d, e }): Misconception[] => {
    const q = b === 0 ? 0 : Math.trunc(a / b);
    return b === 0
      ? [
        { response: String(e), why: t`Division by ${0} is never attempted: ${code`safe_div`} checks first and returns ${code`None`}, which has no number inside.` },
        { response: String(d + e), why: t`The ${code`+ ${e}`} belongs to the ${code`Some`} case only; the ${code`None`} case gives ${d}.` },
      ]
      : [
        { response: String(q), why: t`The ${code`Some q`} case adds ${e} to ${code`q`}.` },
        { response: String(d), why: t`${code`None`} only comes back when the divisor is ${0}; here it is ${b}, so the result is ${code`Some ${q}`}.` },
      ];
  },
});

// ---------------------------------------------------------------- which value matches

/** Patterns over int option lists, with a printer and a matcher. */
type El = { k: 'any' } | { k: 'var' } | { k: 'none' } | { k: 'some'; v: number | null };
type Pat = { k: 'exact'; els: El[] } | { k: 'prefix'; els: El[] };
type Val = (number | null)[];

const elSrc = (e: El, name: string): string => (e.k === 'any' ? '_' : e.k === 'var' ? name : e.k === 'none' ? 'None' : `Some ${e.v === null ? 'x' : String(e.v)}`);
const patSrc = (p: Pat): string => {
  const names = ['h', 'h2', 'h3'];
  if (p.k === 'exact') return `[${p.els.map((e, i) => elSrc(e, names[i] as string)).join('; ')}]`;
  return [...p.els.map((e, i) => elSrc(e, names[i] as string)), 'tl'].join(' :: ');
};
const valSrc = (v: Val): string => `[${v.map((x) => (x === null ? 'None' : `Some ${x}`)).join('; ')}]`;
const elMatch = (e: El, x: number | null): boolean => e.k === 'any' || e.k === 'var' || (e.k === 'none' ? x === null : x !== null && (e.v === null || e.v === x));
const matches = (p: Pat, v: Val): boolean => (p.k === 'exact' ? v.length === p.els.length : v.length >= p.els.length) && p.els.every((e, i) => elMatch(e, v[i] ?? null));

function whyNot(p: Pat, v: Val): Rich {
  if (p.k === 'exact' && v.length !== p.els.length) return t`it has ${v.length} ${v.length === 1 ? 'element' : 'elements'}, and the pattern needs exactly ${p.els.length}.`;
  if (p.k === 'prefix' && v.length < p.els.length) return t`it has ${v.length} ${v.length === 1 ? 'element' : 'elements'}, and the pattern needs at least ${p.els.length}.`;
  const i = p.els.findIndex((e, j) => !elMatch(e, v[j] ?? null));
  const x = v[i] ?? null;
  return t`element ${i + 1} is ${code`${oc(x === null ? 'None' : `Some ${x}`)}`}, which does not fit ${code`${oc(elSrc(p.els[i] as El, 'x'))}`}.`;
}

const PATS: readonly ((n: number) => Pat)[] = [
  () => ({ k: 'prefix', els: [{ k: 'some', v: null }] }),
  (n) => ({ k: 'exact', els: [{ k: 'some', v: n }, { k: 'none' }] }),
  () => ({ k: 'exact', els: [{ k: 'some', v: null }, { k: 'any' }] }),
  () => ({ k: 'prefix', els: [{ k: 'var' }, { k: 'var' }] }),
  () => ({ k: 'prefix', els: [{ k: 'any' }, { k: 'none' }] }),
  () => ({ k: 'exact', els: [{ k: 'none' }] }),
];

interface MatchP { i: number; n: number; vals: Val[]; right: number }

function randVal(rng: Rng, n: number): Val {
  const len = int(rng, 0, 3);
  return Array.from({ length: len }, () => (int(rng, 0, 2) === 0 ? null : pick(rng, [n, n + 1, 0])));
}

const whichMatches = generator<MatchP>({
  id: 'which-matches',
  skill: 'Decide which value matches a pattern on an int option list: list shape first, then each element against its sub-pattern.',
  params: (rng) => {
    const i = int(rng, 0, PATS.length - 1);
    const n = int(rng, 1, 9);
    const p = (PATS[i] as (n: number) => Pat)(n);
    for (;;) {
      const vals: Val[] = [];
      const seen = new Set<string>();
      let hits = 0;
      while (vals.length < 4) {
        const v = randVal(rng, n);
        if (seen.has(valSrc(v))) continue;
        const m = matches(p, v);
        if (m && hits === 1) continue;
        seen.add(valSrc(v));
        vals.push(v);
        if (m) hits++;
      }
      if (hits === 1) return { i, n, vals, right: vals.findIndex((v) => matches(p, v)) };
    }
  },
  sane: ({ i, n, vals, right }) => {
    const p = (PATS[i] as (n: number) => Pat)(n);
    return vals.filter((v) => matches(p, v)).length === 1 && matches(p, vals[right] as Val) ? null : 'out of range';
  },
  problem: ({ i, n, vals, right }) => {
    const p = (PATS[i] as (n: number) => Pat)(n);
    const options: ChoiceOption[] = vals.map((v, j) => ({ id: `v${j}`, label: [code`${oc(valSrc(v))}`] }));
    return {
      prompt: t`Which of these values of type ${code`int option list`} matches the pattern ${code`${oc(patSrc(p))}`}?`,
      answer: { kind: 'choice', options, correct: `v${right}` },
      solution: [
        p.k === 'exact' ? t`A pattern in square brackets matches lists of exactly ${p.els.length} ${p.els.length === 1 ? 'element' : 'elements'}; a pattern ending ${code`:: tl`} matches lists with at least as many elements as there are before ${code`tl`}.` : t`A pattern ending ${code`:: tl`} matches any list with at least ${p.els.length} ${p.els.length === 1 ? 'element' : 'elements'}; ${code`tl`} takes the rest, which may be empty.`,
        t`Then each element must fit its part: ${code`_`} or a variable fits anything, ${code`None`} only ${code`None`}, ${code`Some x`} any ${code`Some`}, and ${code`Some ${n}`} only that value.`,
        t`Only ${code`${oc(valSrc(vals[right] as Val))}`} passes both tests.`,
      ],
    };
  },
  solve: ({ i, n, vals }) => {
    const p = (PATS[i] as (n: number) => Pat)(n);
    return vals.map((v, j) => (matches(p, v) ? `v${j}` : null)).filter((x): x is string => x !== null);
  },
  misconceptions: ({ i, n, vals, right }): Misconception[] => {
    const p = (PATS[i] as (n: number) => Pat)(n);
    return vals.map((v, j) => ({ v, j })).filter(({ j }) => j !== right).map(({ v, j }) => ({ response: [`v${j}`], why: t`${code`${oc(valSrc(v))}`} does not match: ${whyNot(p, v)}` }));
  },
});

// ---------------------------------------------------------------- Cambridge problems

const matchingWorked = auto({
  id: 'cs3110-ex3-matching-v',
  source: cite('cs3110-ex3', 'Exercise "matching", pattern h :: tl'),
  title: t`A pattern every non-empty list matches`,
  prompt: t`Give a value of type ${code`int option list`} that does not match the pattern ${code`h :: tl`} and is not the empty list, or explain why that is impossible.`,
  answer: {
    kind: 'choice',
    options: [
      { id: 'none', label: [code`[None]`] },
      { id: 'two', label: [code`[Some ${1}; None]`] },
      { id: 'impossible', label: t`Impossible: every non-empty list matches ${code`h :: tl`}.` },
      { id: 'nested', label: [code`[Some ${1}; Some ${2}; Some ${3}]`] },
    ],
    correct: 'impossible',
  },
  solution: [
    t`A list is either ${code`[]`} or ${code`x :: xs`}. A non-empty list is therefore some ${code`x :: xs`}.`,
    t`The pattern ${code`h :: tl`} has variables in both places, and a variable matches any value. So it matches every ${code`x :: xs`}, binding ${code`h`} to ${code`x`} and ${code`tl`} to ${code`xs`}.`,
    t`So no non-empty list fails to match: it is impossible. (${code`[None]`} matches with ${code`h`} equal to ${code`None`} and ${code`tl`} equal to ${code`[]`}.)`,
  ],
  reference: ['impossible'],
  // OCaml 4.11.1: (function h :: tl -> true | _ -> false) is true on every non-empty list; checked here on all lists of length 1 to 3 over None, Some 0, Some 1.
  verify: () => {
    const els: (number | null)[] = [null, 0, 1];
    const all: Val[] = [];
    for (let len = 1; len <= 3; len++) {
      const rec = (pre: Val): void => { if (pre.length === len) { all.push(pre); return; } for (const e of els) rec([...pre, e]); };
      rec([]);
    }
    return same('all non-empty lists match', all.every((v) => matches({ k: 'prefix', els: [{ k: 'var' }] }, v)), true);
  },
  misconceptions: [
    { response: ['none'], why: t`${code`[None]`} matches: ${code`h`} is ${code`None`} and ${code`tl`} is ${code`[]`}. A variable matches any value, including ${code`None`}.` },
    { response: ['two'], why: t`It matches with ${code`h`} equal to ${code`Some ${1}`} and ${code`tl`} equal to ${code`[None]`}.` },
  ],
});

const MP = 3110;
const matchingII = auto({
  id: 'cs3110-ex3-matching-ii',
  source: cite('cs3110-ex3', 'Exercise "matching", pattern [Some 3110; None]', true),
  title: t`A pattern of constants`,
  prompt: t`Which of these values of type ${code`int option list`} do not match the pattern ${code`[Some ${MP}; None]`}? Choose all that apply.`,
  answer: {
    kind: 'choice',
    options: [
      { id: 'same', label: [code`[Some ${MP}; None]`] },
      { id: 'short', label: [code`[Some ${MP}]`] },
      { id: 'order', label: [code`[None; Some ${MP}]`] },
      { id: 'other', label: [code`[Some ${MP}; Some ${0}]`] },
    ],
    correct: ['short', 'order', 'other'],
  },
  solution: [
    t`The pattern has no variables: it matches exactly one value, the list ${code`[Some ${MP}; None]`} itself.`,
    t`${code`[Some ${MP}]`} is too short; ${code`[None; Some ${MP}]`} has the elements in the wrong places; ${code`[Some ${MP}; Some ${0}]`} has ${code`Some ${0}`} where the pattern needs ${code`None`}.`,
  ],
  reference: ['short', 'order', 'other'],
  // OCaml 4.11.1: (function [Some 3110; None] -> true | _ -> false) is true only on [Some 3110; None].
  verify: () => {
    const p: Pat = { k: 'exact', els: [{ k: 'some', v: MP }, { k: 'none' }] };
    return same('matches', [[MP, null], [MP], [null, MP], [MP, 0]].map((v) => matches(p, v as Val)).join(' '), 'true false false false');
  },
  misconceptions: [
    { response: ['short', 'other'], why: t`Order matters in a list: ${code`[None; Some ${MP}]`} has ${code`None`} first, where the pattern needs ${code`Some ${MP}`}.` },
    { response: ['short', 'order'], why: t`${code`Some ${0}`} is not ${code`None`}: the second element must be ${code`None`}.` },
  ],
});

const QX = -3;
const QY = 5;
const quadrant = auto({
  id: 'cs3110-ex3-quadrant',
  source: cite('cs3110-ex3', 'Exercise "quadrant"', true),
  title: t`Which quadrant`,
  prompt: t`The exercise declares ${codeBlock(code`type quad = I | II | III | IV`, code`type sign = Neg | Zero | Pos`)} and asks for ${code`quadrant : int * int -> quad option`}, which gives the quadrant of a point, with ${code`I`} where both coordinates are positive and the quadrants numbered anticlockwise; a point on an axis is in no quadrant. Write it with a helper ${code`sign`} and a match on a pair. What is ${code`quadrant (${QX}, ${QY})`}?`,
  answer: {
    kind: 'choice',
    options: ['I', 'II', 'III', 'IV'].map((q) => ({ id: q, label: [code`Some ${q}`] })).concat([{ id: 'None', label: [code`None`] }]),
    correct: 'II',
  },
  solution: [
    t`${codeBlock(code`let sign x = if x < ${0} then Neg else if x = ${0} then Zero else Pos`, code`let quadrant (x, y) = match sign x, sign y with`, code`  | Pos, Pos -> Some I | Neg, Pos -> Some II`, code`  | Neg, Neg -> Some III | Pos, Neg -> Some IV`, code`  | _ -> None`)}`,
    t`${code`sign (${QX})`} is ${code`Neg`} and ${code`sign ${QY}`} is ${code`Pos`}, so the pair ${code`(Neg, Pos)`} matches the second case: ${code`Some II`}, the top left quadrant.`,
    t`The last case ${code`_`} catches every pair with a ${code`Zero`}, the points on an axis. Without it OCaml would warn that the match is not exhaustive.`,
  ],
  reference: ['II'],
  // OCaml 4.11.1: quadrant (-3, 5) = Some II; quadrant (0, 4) = None.
  verify: () => {
    const sgn = (x: number) => Math.sign(x);
    const q = (x: number, y: number) => (sgn(x) > 0 && sgn(y) > 0 ? 'I' : sgn(x) < 0 && sgn(y) > 0 ? 'II' : sgn(x) < 0 && sgn(y) < 0 ? 'III' : sgn(x) > 0 && sgn(y) < 0 ? 'IV' : 'None');
    return same('quadrant (-3, 5)', q(QX, QY), 'II');
  },
  misconceptions: [
    { response: ['I'], why: t`The ${math`x`} coordinate ${QX} is negative, so the point is to the left of the vertical axis.` },
    { response: ['IV'], why: t`Quadrant ${code`IV`} is bottom right: positive ${math`x`}, negative ${math`y`}. Here ${math`x`} is negative and ${math`y`} positive: top left, ${code`II`}.` },
  ],
});

const safeHdTl = supervision({
  id: 'cs3110-ex3-safe-hd-tl',
  source: cite('cs3110-ex3', 'Exercise "safe hd and tl"'),
  title: t`Safe head and tail`,
  prompt: t`Write ${code`safe_hd : 'a list -> 'a option`}, returning ${code`Some x`} if the head of the input list is ${code`x`} and ${code`None`} if the list is empty, and ${code`safe_tl : 'a list -> 'a list option`}, returning the tail or ${code`None`}. Explain why a caller of ${code`safe_hd`} cannot forget the empty case, while a caller of ${code`List.hd`} can.`,
  writeUp: 'explanation',
});
const focs61 = supervision({
  id: 'focs-6-1',
  source: cite('focs-notes', 'Lecture 6, Exercise 6.1'),
  title: t`Days of the week`,
  prompt: t`Give the declaration of an OCaml type for the days of the week. Comment on the practicality of such a type in a calendar application: what does it make easy, and what (such as "the day after", or counting days between dates) does it make awkward?`,
  writeUp: 'explanation',
});

// Computer Science Tripos Part IA 2025, Paper 1, Question 2(a), (b), and 2020, Paper 1, Question
// 1(a), (b). 2020 Q1(c) uses exceptions, a later topic.
const cst25expr = supervision({
  id: 'cst-2025-p1-q2-ab',
  source: cite('cst-y2025p1q2', '(a), (b)'),
  title: t`Expressions as a variant type`,
  prompt: t`The following type definition allows the representation of some mathematical expressions as an OCaml value: ${codeBlock(code`type expr =`, code`  | Add of expr * expr`, code`  | Mul of expr * expr`, code`  | Number of int`)} (a) Write the OCaml value that corresponds to the expression ${math`(${1} + ${4}) \times (${10} + ${2})`}. (b) Write a function that will evaluate the numerical result of an ${code`expr`} argument. What is the OCaml type of your function?`,
  writeUp: 'explanation',
});

const cst20trees = supervision({
  id: 'cst-2020-p1-q1-ab',
  source: cite('cst-y2020p1q1', '(a), (b)'),
  title: t`Counting trees in a wood`,
  prompt: t`You need to write OCaml code to help a local park ranger count the different types of trees present in a region of Cambridgeshire woodland. (a) Define an OCaml type ${code`tree`} that can distinguish between an oak, birch or maple tree, and also any other species with an arbitrary string name. (b) Define two OCaml values with the following signatures: (i) ${code`val describe : tree -> string`} that accepts a ${code`tree`} parameter and returns a human-readable string; (ii) ${code`val identify : string -> tree`} that accepts a lowercase string parameter and returns a ${code`tree`}. Explain briefly how the OCaml compiler can statically check if you have handled all the input possibilities for the input parameters to ${code`describe`} and ${code`identify`}.`,
  writeUp: 'explanation',
});

// ---------------------------------------------------------------- lesson

export const fpVariants: TopicContent = {
  topicId: 'fp.variants',
  goal: t`Declare a type by its constructors, such as ${code`'a option`}, and define functions on it by matching every case.`,
  objective: t`Declare variant types, build their values with constructors, and match on every case.`,
  why: t`Variants model data that comes in several kinds; with lists they are the basis of trees and every later datatype.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`Data of several kinds` },
    { kind: 'hook', text: t`How would you store a vehicle in a program? As the number ${0} for a bike and ${3} for a lorry, and hope nobody adds ${2} and ${3}? As the string ${code`"Bike"`}, and hope nobody types ${code`"MOtorbike"`}? FoCS's answer is to make a new type whose only values are the vehicles, so the type checker catches both mistakes.` },
    { kind: 'rule', text: [codeBlock(code`type vehicle = Bike | Motorbike | Car | Lorry`)] },
    {
      kind: 'definition',
      name: t`Variant type`,
      formal: t`A declaration ${code`type t = C${1} | ... | Cn`} or, with arguments, ${code`type t = C${1} of t${1} | ... | Cn of tn`} defines a [[variant-type|variant type]] ${code`t`} with [[constructor|constructors]] ${code`C${1}`}, ..., ${code`Cn`}. Every value of type ${code`t`} is ${code`Ci`} or ${code`Ci v`} with ${code`v : ti`}, for exactly one ${code`i`}; values made with different constructors are different. Constructor names begin with a capital letter.`,
      plain: t`The type lists every kind of value it can have, each with a name. ${code`Bike`} is a ${code`vehicle`} all by itself; with ${code`Lorry of int`}, ${code`Lorry ${18}`} is a vehicle carrying the number ${18}.`,
    },
    {
      kind: 'p',
      text: t`A function on a variant is a match with one case per constructor, exactly as a list function has one case for ${code`[]`} and one for ${code`::`}. In fact lists are a variant type with two constructors that OCaml writes specially.`,
      why: { q: t`How are lists a variant?`, a: t`FoCS shows the declaration ${code`type 'a mylist = Nil | Cons of 'a * 'a mylist`}: ${code`Nil`} plays ${code`[]`} and ${code`Cons (x, xs)`} plays ${code`x :: xs`}. Only the square bracket notation is built in.` },
    },
    { kind: 'rule', text: [WHEELS_DEF] },
    {
      kind: 'steps',
      steps: [
        { label: t`Find the constructor`, text: t`${code`wheels (Car true)`}: the value was made with ${code`Car`}, so only the ${code`Car robin`} case can match.` },
        { label: t`Bind the argument`, text: t`The pattern ${code`Car robin`} binds ${code`robin`} to the argument, ${code`true`}.` },
        { label: t`Evaluate the case`, text: t`${code`if true then ${3} else ${4}`} is ${3}: a Reliant Robin has three wheels.` },
      ],
    },
    checkFrom(wheelsGen, { vs: [{ c: 'Lorry', w: 6 }, { c: 'Motorbike', cc: 450 }, { c: 'Car', robin: false }] }, t`${6} for the lorry, ${2} for the motorbike whatever its engine, ${4} for an ordinary car: ${12}.`),
    { kind: 'section', title: t`A result that might not exist` },
    { kind: 'narrative', text: t`What is the head of the empty list? There is none. ${code`List.hd []`} fails while the program runs. A safer design is to make "no answer" a value: a function returns ${code`None`}, or ${code`Some x`} when the answer is ${code`x`}. That is the option type, and it is just a variant.` },
    {
      kind: 'definition',
      name: t`Option`,
      formal: t`OCaml's built in type ${code`type 'a option = None | Some of 'a`} is the [[option-type|option type]]: for each type ${code`'a`}, a value of type ${code`'a option`} is ${code`None`} or ${code`Some v`} with ${code`v : 'a`}.`,
      plain: t`An ${code`int option`} is either "no int", ${code`None`}, or "this int", such as ${code`Some ${42}`}. To use the int you must match, and the match makes you say what to do when there is none.`,
    },
    {
      kind: 'p',
      text: t`OCaml checks that a match covers every constructor. Leave one out and the compiler warns that the match is not exhaustive, with an example of a value it misses. FoCS points out the price of options: every caller must check for ${code`None`}. The benefit is that no caller can forget to.`,
      why: { q: t`Why is a warning enough?`, a: t`Because it is given before the program runs, for every function, with a counterexample. A missing case can then only reach a running program if the warning is ignored.` },
    },
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`A value of type ${code`int option`} can be used as an int.`, counterexample: t`${code`Some ${3} + ${1}`} is a type error: ${code`Some ${3}`} has type ${code`int option`}. Match to get the int out: ${code`match o with Some x -> x + ${1} | None -> ${0}`}.` },
    { kind: 'pitfall', claim: t`The order of the cases in a match does not matter.`, counterexample: t`Patterns are tried in order. In ${code`function _ -> ${0} | Bike -> ${2}`} the wildcard matches everything first, so ${code`Bike`} gives ${0}, and OCaml warns that the second case is unused.` },
    { kind: 'pitfall', claim: t`${code`Motorbike ${450}`} and ${code`Lorry ${450}`} are equal, because both carry ${450}.`, counterexample: t`Different constructors give different values: FoCS stresses that OCaml keeps any ${code`Motorbike`} distinct from any ${code`Lorry`}, and ${code`wheels`} gives ${2} and ${450}.` },
    { kind: 'takeaway', text: t`A variant type lists its constructors, each possibly carrying data; functions on it match one case per constructor, OCaml warns if one is missing, and ${code`'a option`} uses this to make "no result" a value.` },
  ],
  examples: [
    workedCambridge(matchingWorked),
    worked(optionGen, { a: 47, b: 5, d: -1, e: 3 }, t`Getting a result out of an option`),
    worked(whichMatches, { i: 3, n: 4, vals: [[4], [null, 5], [], [0]], right: 1 }, t`A pattern that needs two elements`),
  ],
  generators: [wheelsGen, optionGen, whichMatches],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['variant-type', 'constructor', 'option-type'],
  cambridge: [cst25expr, cst20trees, matchingII, quadrant, safeHdTl, focs61],
  // Best first: the 2025 and 2020 Tripos questions, then the CS3110 exercise.
  gate: ['cst-2025-p1-q2-ab', 'cst-2020-p1-q1-ab', 'cs3110-ex3-safe-hd-tl'],
  recall: [
    { front: t`What are the values of a variant type ${code`type t = C${1} of t${1} | ... | Cn of tn`}?`, back: t`Exactly the ${code`Ci v`} with ${code`v : ti`} (or ${code`Ci`} alone for a constant constructor); different constructors give different values.` },
    { front: t`What is ${code`'a option`}?`, back: t`${code`type 'a option = None | Some of 'a`}: no value, or one value of type ${code`'a`}.` },
    { front: t`In what order are a match's cases tried?`, back: t`Top to bottom; the first pattern that matches is used, and OCaml warns about cases never reached and values not covered.` },
  ],
};
