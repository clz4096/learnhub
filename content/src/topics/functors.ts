/**
 * fp.functors: Functors. The lesson follows CS3110 Sections 5.8 and 5.9 (includes;
 * functors, Map.Make and Set.Make with Map.OrderedType, the Print functor) and FoCS
 * Lecture 7's dictionaries, which need only an ordering on keys. The problems are CS3110
 * Chapter 5 exercises (bindings, char ordered, ToString and Print, date order) and
 * Chapter 9's functorized BST.
 *
 * Checked in OCaml 4.11.1: the three bindings expressions all give [('x', 0); ('y', 1)];
 * Map.Make(Int) after add 5, add 2, add 5 again, remove 2, add 9 has find 5 = the second
 * value and cardinal 2; the date compare gives -1 for March 31 against April 1. The
 * generators run the same operations on a TypeScript Map, then sort the keys.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { int, pick, sample } from '../math';
import { codeOf, ml, mlBlock } from '../ocaml-code';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { math, t } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

// ---------------------------------------------------------------- generators

type MOp = { add: number; v: number } | { remove: number };
interface MapP { ops: MOp[]; ask: 'find' | 'cardinal'; key: number }

function runMap(ops: readonly MOp[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const o of ops) {
    if ('add' in o) m.set(o.add, o.v);
    else m.delete(o.remove);
  }
  return m;
}
const mapCode = (ops: readonly MOp[]): string => ops.map((o) => ('add' in o ? `|> add ${o.add} ${o.v}` : `|> remove ${o.remove}`)).join(' ');

const mapOps = generator<MapP>({
  id: 'map-operations',
  skill: 'Use a map made by the Map.Make functor: add replaces an earlier binding of the same key, remove deletes one, and find and cardinal read the result.',
  params: (rng) => {
    for (;;) {
      const keys = sample(rng, [1, 2, 3, 4, 5, 6, 7, 8, 9], 3);
      const ops: MOp[] = [];
      for (let i = 0; i < 6; i++) {
        const k = pick(rng, keys);
        ops.push(rng() < 0.75 || i === 0 ? { add: k, v: int(rng, 10, 99) } : { remove: k });
      }
      const m = runMap(ops);
      const ask = pick(rng, ['find', 'cardinal'] as const);
      const addsOf = (k: number) => ops.filter((o): o is { add: number; v: number } => 'add' in o && o.add === k);
      const twice = keys.find((k) => m.has(k) && addsOf(k).length >= 2 && addsOf(k)[0]?.v !== m.get(k));
      if (ask === 'find' && twice !== undefined) return { ops, ask, key: twice };
      const adds = ops.filter((o) => 'add' in o).length;
      const distinctAdded = new Set(ops.filter((o): o is { add: number; v: number } => 'add' in o).map((o) => o.add)).size;
      if (ask === 'cardinal' && new Set([m.size, adds, distinctAdded]).size === 3) return { ops, ask, key: 0 };
    }
  },
  sane: ({ ops }) => (ops.length === 6 ? null : 'ops'),
  problem: ({ ops, ask, key }) => {
    const m = runMap(ops);
    const sorted = [...m.keys()].sort((a, b) => a - b);
    const expr = ask === 'find' ? ml`IntMap.find ${key} m` : ml`IntMap.cardinal m`;
    return {
      prompt: t`With ${ml`module IntMap = Map.Make (Int)`} and ${ml`let m = IntMap.(empty ${codeOf(mapCode(ops))})`}, what is ${expr}?`,
      answer: { kind: 'exact', expected: String(ask === 'find' ? m.get(key) : m.size) },
      solution: [
        t`${ml`add k v`} binds ${ml`k`} to ${ml`v`}, replacing any earlier binding of ${ml`k`}; ${ml`remove k`} deletes the binding of ${ml`k`} if there is one.`,
        t`At the end ${ml`m`} binds ${sorted.length === 0 ? t`nothing` : t`${ml`${codeOf(sorted.map((k) => `${k} -> ${m.get(k) as number}`).join(', '))}`}`}.`,
        ask === 'find' ? t`So ${ml`IntMap.find ${key} m`} is ${m.get(key) as number}, the latest value bound to ${key}.` : t`So it has ${m.size} ${m.size === 1 ? 'binding' : 'bindings'}.`,
      ],
    };
  },
  solve: ({ ops, ask, key }) => {
    const m = runMap(ops);
    return String(ask === 'find' ? m.get(key) : m.size);
  },
  misconceptions: ({ ops, ask, key }): Misconception[] => {
    if (ask === 'find') {
      const adds = ops.filter((o): o is { add: number; v: number } => 'add' in o && o.add === key);
      return [
        { response: String(adds[0]?.v), why: t`That is the first value bound to ${key}. A later ${ml`add`} of the same key replaces it.` },
        { response: String(key), why: t`${ml`find`} returns the value bound to the key, not the key.` },
      ];
    }
    const adds = ops.filter((o): o is { add: number; v: number } => 'add' in o);
    return [
      { response: String(adds.length), why: t`Adding a key that is already bound replaces its binding, and ${ml`remove`} deletes one: count the distinct keys left.` },
      { response: String(new Set(adds.map((o) => o.add)).size), why: t`Some key was removed after it was added.` },
    ];
  },
});

interface OrdP { keys: number[]; j: number }
const bindingsOrder = generator<OrdP>({
  id: 'bindings-order',
  skill: 'Read the order of Map.bindings: increasing order of keys under the compare function given to Map.Make, whatever the order of insertion.',
  quick: true,
  params: (rng) => {
    for (;;) {
      const keys = sample(rng, [3, 7, 12, 15, 21, 26, 30, 34, 41, 48], 5);
      const j = int(rng, 0, 4);
      const sorted = [...keys].sort((a, b) => a - b);
      if (new Set([sorted[j], keys[j], sorted[4 - j]]).size === 3) return { keys, j };
    }
  },
  sane: ({ keys }) => (keys.length === 5 ? null : 'keys'),
  problem: ({ keys, j }) => {
    const sorted = [...keys].sort((a, b) => a - b);
    return {
      prompt: t`With ${ml`module IntMap = Map.Make (Int)`}, the keys ${ml`${codeOf(keys.join(', '))}`} are added to ${ml`IntMap.empty`} in that order, each bound to ${ml`"x"`}. What key is in position ${j} (counting from ${0}) of ${ml`IntMap.bindings m`}?`,
      answer: { kind: 'exact', expected: String(sorted[j]) },
      solution: [
        t`${ml`bindings`} returns the bindings in increasing order of keys, as ordered by the ${ml`compare`} of the module given to ${ml`Map.Make`}, here ${ml`Int.compare`}.`,
        t`Sorted, the keys are ${ml`${codeOf(sorted.join(', '))}`}, so position ${j} holds ${sorted[j] as number}.`,
      ],
    };
  },
  solve: ({ keys, j }) => String([...keys].sort((a, b) => a - b)[j]),
  misconceptions: ({ keys, j }): Misconception[] => [
    { response: String(keys[j]), why: t`A map does not remember the order of insertion: ${ml`bindings`} lists keys in increasing order.` },
    { response: String([...keys].sort((a, b) => b - a)[j]), why: t`The order is increasing, smallest key first.` },
  ],
});

interface DateP { m1: number; d1: number; m2: number; d2: number }
const dateCompare = ({ m1, d1, m2, d2 }: DateP): number => (m1 === m2 ? d1 - d2 : m1 - m2);
/** The difference of the key that does not decide: the days when the months differ, the months when they agree. */
const otherKey = ({ m1, d1, m2, d2 }: DateP): number => (m1 === m2 ? m1 - m2 : d1 - d2);
const dateOrder = generator<DateP>({
  id: 'ordered-type',
  skill: 'Evaluate the compare function of a module passed to Map.Make: negative, zero, or positive as the first argument is less than, equal to, or greater than the second.',
  params: (rng) => {
    for (;;) {
      const m1 = int(rng, 1, 12);
      const m2 = rng() < 0.4 ? m1 : int(rng, 1, 12);
      const p: DateP = { m1, d1: int(rng, 1, 28), m2, d2: int(rng, 1, 28) };
      const v = dateCompare(p);
      if (new Set([v, otherKey(p), -v]).size === 3) return p;
    }
  },
  sane: ({ m1, m2 }) => (m1 >= 1 && m2 <= 12 ? null : 'month'),
  problem: (p) => ({
    prompt: t`For a map with dates as keys, CS${3110} asks for a module matching ${ml`Map.OrderedType`}. With the module below, what is ${ml`Date.compare {month = ${p.m1}; day = ${p.d1}} {month = ${p.m2}; day = ${p.d2}}`}?`.concat([mlBlock`
      module Date = struct
        type t = {month : int; day : int}
        let compare d${1} d${2} =
          if d${1}.month = d${2}.month then d${1}.day - d${2}.day
          else d${1}.month - d${2}.month
      end
    `]),
    answer: { kind: 'exact', expected: String(dateCompare(p)) },
    solution: [
      p.m1 === p.m2 ? t`The months are equal, so the days decide: ${math`${p.d1} - ${p.d2} = ${p.d1 - p.d2}`}.` : t`The months differ, so the months decide, whatever the days: ${math`${p.m1} - ${p.m2} = ${p.m1 - p.m2}`}.`,
      t`The sign is what ${ml`Map.Make`} uses: negative means the first date comes earlier.`,
    ],
  }),
  solve: (p) => String(dateCompare(p)),
  misconceptions: (p): Misconception[] => [
    { response: String(otherKey(p)), why: p.m1 === p.m2 ? t`The months are equal, so their difference is ${0}: the days decide.` : t`The month is compared first; the day matters only when the months are equal.` },
    { response: String(-dateCompare(p)), why: t`The difference is first argument minus second, so an earlier first date gives a negative result.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const bindingsOptions: ChoiceOption[] = [
  { id: 'a', label: [ml`CharMap.(empty |> add 'x' ${0} |> add 'y' ${1} |> bindings)`] },
  { id: 'b', label: [ml`CharMap.(empty |> add 'y' ${1} |> add 'x' ${0} |> bindings)`] },
  { id: 'c', label: [ml`CharMap.(empty |> add 'x' ${2} |> add 'y' ${1} |> remove 'x' |> add 'x' ${0} |> bindings)`] },
];
/** The three expressions run on a model of Map.Make(Char): set, delete, then keys in increasing order. */
const bindingsOf = (ops: [string, string, number?][]): string => {
  const m = new Map<string, number>();
  for (const [op, k, v] of ops) if (op === 'add') m.set(k, v as number); else m.delete(k);
  return [...m.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${k}${v}`).join(';');
};
const bindingsEx = auto({
  id: 'cs3110-5-bindings',
  source: cite('cs3110-ex5', 'Exercise: bindings', true),
  title: t`Which bindings agree?`,
  prompt: t`With ${ml`module CharMap = Map.Make (Char)`}, which of these expressions return the same association list as the first? Choose all that apply, the first included.`,
  answer: { kind: 'choice', options: bindingsOptions, correct: ['a', 'b', 'c'] },
  solution: [
    t`The specification of ${ml`bindings`} in ${ml`Map.S`}: the list of all bindings, in increasing order of keys with respect to the ordering given to ${ml`Map.Make`}. The order of insertion is not recorded.`,
    t`The first two build the same map, ${ml`'x' -> ${0}`} and ${ml`'y' -> ${1}`}, so both give ${ml`[('x', ${0}); ('y', ${1})]`}.`,
    t`In the third, ${ml`remove 'x'`} deletes the binding to ${2}, and ${ml`add 'x' ${0}`} binds it again: the same map, so the same list. All three agree.`,
  ],
  reference: ['a', 'b', 'c'],
  verify: () => {
    const a = bindingsOf([['add', 'x', 0], ['add', 'y', 1]]);
    const b = bindingsOf([['add', 'y', 1], ['add', 'x', 0]]);
    const c = bindingsOf([['add', 'x', 2], ['add', 'y', 1], ['remove', 'x'], ['add', 'x', 0]]);
    return same('the three binding lists', [a, b, c].join(' | '), 'x0;y1 | x0;y1 | x0;y1');
  },
  misconceptions: [
    { response: ['a', 'c'], why: t`The map does not remember insertion order: adding ${ml`'y'`} first builds the same map, and ${ml`bindings`} sorts by key.` },
    { response: ['a', 'b'], why: t`After ${ml`remove 'x'`} and ${ml`add 'x' ${0}`}, the map is the same as the first: the binding to ${2} is gone.` },
  ],
});

const charOrdered = supervision({
  id: 'cs3110-5-char-ordered',
  source: cite('cs3110-ex5', 'Exercises: make char map, char ordered'),
  title: t`Why ${ml`Char`} can be passed to ${ml`Map.Make`}`,
  prompt: t`Type ${ml`module CharMap = Map.Make (Char)`} and explain the types of ${ml`CharMap.empty`}, ${ml`CharMap.add`}, and ${ml`CharMap.remove`}. Then compare the signatures of ${ml`Map.OrderedType`} and ${ml`Char`}, and explain why ${ml`Char`} may be the argument of ${ml`Map.Make`}.`,
  writeUp: 'explanation',
});
const printFunctor = supervision({
  id: 'cs3110-5-print',
  source: cite('cs3110-ex5', 'Exercises: ToString, Print, Print Int, Print String, Print Reuse'),
  title: t`The ${ml`Print`} functor`,
  prompt: t`Write a module type ${ml`ToString`} with an abstract type ${ml`t`} and ${ml`to_string : t -> string`}. Write a functor ${ml`Print`} taking ${ml`M : ToString`} and returning a module whose only value is ${ml`print : M.t -> unit`}. Apply it to make ${ml`PrintInt`} and ${ml`PrintString`}, explain why the argument modules must not be sealed, and say what code ${ml`Print`} reuses.`,
  writeUp: 'explanation',
});
const functorBst = supervision({
  id: 'cs3110-9-functorized-bst',
  source: cite('cs3110-ex9', 'Exercise: functorized BST'),
  title: t`A functorized binary search tree`,
  prompt: t`Implement a ${ml`BstSet`} abstraction as a functor parameterised on a structure that supplies the client's comparison, much like the standard library's ${ml`Set.Make`}, so that clients can, for example, ignore case in strings. Give the signatures of the parameter and the result.`,
  writeUp: 'explanation',
});

// ---------------------------------------------------------------- lesson

export const functors: TopicContent = {
  topicId: 'fp.functors',
  goal: t`Build a module from another module with a functor, as Map.Make and Set.Make build dictionaries and sets from an ordered type.`,
  objective: t`Write and apply functors, and build maps and sets from an ordered type with Map.Make and Set.Make.`,
  why: t`One functor gives a dictionary for any ordered key; balanced trees and hash tables are packaged this way.`,
  minutes: 30,
  lesson: [
    { kind: 'section', title: t`Functions from modules to modules` },
    { kind: 'hook', text: t`A dictionary needs only one thing from its keys: a way to compare them. Strings, dates, characters, pairs: write the dictionary once for each, and you have written the same code many times. What if the comparison could be handed to the dictionary as an argument, the way a function is handed to ${ml`map`}?` },
    { kind: 'narrative', text: t`The comparison is not alone, though: it comes with a type of keys. So the argument must be a whole module, a type together with its ${ml`compare`}. A function that takes a module and returns a module is called a functor.` },
    { kind: 'definition', name: t`Functor`, formal: t`A [[functor|functor]] is a parameterised module, ${ml`module F (M : S) = struct ... end`}: given any module ${ml`A`} matching the signature ${ml`S`}, the application ${ml`F (A)`} is a module, the body with ${ml`M`} replaced by ${ml`A`}.`, plain: t`A function on modules. Its argument must match a signature, as a function's argument must have a type.` },
    { kind: 'rule', text: [mlBlock`
      module type Addable = sig
        type t
        val zero : t
        val plus : t -> t -> t
      end
      module Sum (M : Addable) = struct
        let total xs = List.fold_left M.plus M.zero xs
      end
      module IntSum = Sum (struct
        type t = int
        let zero = ${0}
        let plus = ( + )
      end)
    `] },
    { kind: 'p', text: t`Now ${ml`IntSum.total [${3}; ${4}; ${5}]`} is ${3 + 4 + 5}. The functor wrote ${ml`total`} once; each application specialises it to one type. Apply ${ml`Sum`} to a structure with ${ml`type t = string`}, ${ml`zero = ""`}, and ${ml`plus = ( ^ )`}, and the same ${ml`total`} joins a list of strings: ${ml`["ab"; "c"; "d"]`} gives ${ml`"abcd"`}.` },
    { kind: 'section', title: t`Maps from an ordered type` },
    { kind: 'narrative', text: t`The standard library's ${ml`Map.Make`} is exactly the dictionary functor. Its argument must match ${ml`Map.OrderedType`}.` },
    { kind: 'definition', name: t`Ordered type`, formal: t`A module matches ${ml`Map.OrderedType`} when it has a type ${ml`t`} and ${ml`compare : t -> t -> int`}, where ${ml`compare a b`} is negative, zero, or positive as ${ml`a`} is less than, equal to, or greater than ${ml`b`}, for a [[total-order|total order]] on ${ml`t`}.`, plain: t`Total order: any two keys are comparable, and the comparisons are consistent (if ${math`a < b`} and ${math`b < c`} then ${math`a < c`}). ${ml`Char`}, ${ml`Int`}, and ${ml`String`} all qualify.` },
    {
      kind: 'steps',
      steps: [
        { label: t`Apply the functor`, text: t`${ml`module CharMap = Map.Make (Char)`} makes a module of maps whose keys are characters.`, plain: t`OCaml prints its signature: ${ml`key`} is ${ml`Char.t`} and ${ml`'a t`} is a map from keys to values of type ${ml`'a`}.` },
        { label: t`Read the types`, text: t`${ml`empty : 'a t`}, ${ml`add : key -> 'a -> 'a t -> 'a t`}, ${ml`remove : key -> 'a t -> 'a t`}.`, plain: t`Maps are persistent: ${ml`add`} returns a new map and leaves the old one unchanged.` },
        { label: t`Use it`, text: t`${ml`CharMap.(empty |> add 'A' "Alpha" |> add 'E' "Echo" |> find 'E')`} is ${ml`"Echo"`}.`, plain: t`${ml`M.(e)`} opens ${ml`M`} for the expression ${ml`e`}, so ${ml`add`} means ${ml`CharMap.add`}.` },
        { label: t`Read the order`, text: t`${ml`bindings`} returns the bindings in increasing order of keys, by the ${ml`compare`} the functor was given.`, plain: t`The map is a balanced search tree inside, which is why it needs the order.` },
      ],
    },
    checkFrom(mapOps, { ops: [{ add: 5, v: 10 }, { add: 2, v: 20 }, { add: 5, v: 30 }, { remove: 2 }, { add: 9, v: 40 }, { add: 7, v: 50 }], ask: 'find', key: 5 }, t`The second ${ml`add`} of ${5} replaced ${10} by ${30}.`),
    checkFrom(dateOrder, { m1: 3, d1: 31, m2: 4, d2: 1 }, t`The months differ, so ${math`${3} - ${4} = ${-1}`}: March ${31} comes before April ${1}.`),
    { kind: 'pitfall', claim: t`Any function returning an ${ml`int`} will do as ${ml`compare`}.`, counterexample: t`${ml`compare a b = ${1}`} for all ${ml`a`}, ${ml`b`} says every key is greater than every other, which is no order at all: a map built with it may fail to find a key it has just added. The specification asks for a total order, and the functor cannot check it.` },
    { kind: 'pitfall', claim: t`A functor can take a value, such as a comparison function, as its argument.`, counterexample: t`Its argument is a module. To pass a comparison, wrap it with its type: ${ml`Map.Make (struct type t = int let compare a b = compare b a end)`} makes maps whose ${ml`bindings`} come out largest key first. (Inside, ${ml`compare b a`} is the standard ${ml`compare`}, since the new one is not recursive.)` },
    { kind: 'takeaway', text: t`A functor is a function from modules to modules; Map.Make and Set.Make turn any type with a total order into dictionaries and sets.` },
  ],
  examples: [
    { ...workedCambridge(bindingsEx), examiner: t`The examiner wants the specification of ${ml`bindings`} quoted and applied: increasing order of keys, insertion order forgotten, a removed binding gone.` },
    worked(bindingsOrder, { keys: [26, 7, 41, 15, 30], j: 1 }, t`Bindings come out in key order`),
    worked(mapOps, { ops: [{ add: 3, v: 11 }, { add: 8, v: 22 }, { add: 3, v: 33 }, { add: 6, v: 44 }, { remove: 8 }, { add: 1, v: 55 }], ask: 'cardinal', key: 0 }, t`Counting the bindings of a map`),
  ],
  generators: [mapOps, bindingsOrder, dateOrder],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['functor', 'total-order'],
  cambridge: [charOrdered, printFunctor, functorBst],
  gate: ['cs3110-5-print', 'cs3110-9-functorized-bst'],
  recall: [
    { front: t`What is a functor?`, back: t`A parameterised module, ${ml`module F (M : S) = struct ... end`}: a function from modules matching ${ml`S`} to modules.` },
    { front: t`What must the argument of ${ml`Map.Make`} provide?`, back: t`A type ${ml`t`} and ${ml`compare : t -> t -> int`}, negative, zero, or positive for a total order.` },
    { front: t`In what order does ${ml`bindings`} list a map?`, back: t`Increasing order of keys under the module's ${ml`compare`}, whatever the order of insertion.` },
  ],
};
