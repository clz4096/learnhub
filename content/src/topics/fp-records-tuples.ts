/**
 * fp.records-tuples: Tuples and records. The lesson follows CS3110 Section 3.4 (records and
 * tuples, field access, pattern matching on them, copying with "with") and FoCS Lecture 4
 * (building a list of pairs with zip, a pair of results with unzip). The problems are the
 * CS3110 Chapter 3 exercises "student", "pokerecord", and "date before", and FoCS Exercises
 * 4.3 and 4.6.
 *
 * Every OCaml answer was run in the OCaml 4.11.1 toplevel (scratch file ocamlE/t8.ml):
 *   fun s -> (s.first_name, s.last_name) : student -> string * string
 *   fun s -> s.first_name ^ s.last_name : student -> string; fun s -> [...] : student -> string list
 *   {name = "charizard"; hp = 78; ptype = Fire} = {hp = 78; ptype = Fire; name = "charizard"} is true;
 *   a tuple for a pokemon, or a record missing ptype, is an error
 *   zip [1; 2; 3] [4; 5] = [(1, 4); (2, 5)]; unzip [(1, 4); (2, 5)] = ([1; 2], [4; 5])
 *   p = {x = 3; y = 4}; q = {p with x = 10}; q.x * 2 + p.x = 23
 *   (7, "s", true) : int * string * bool; [(7, true); (8, false)] : (int * bool) list
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { code, codeBlock, oc } from '../ocaml-code';
import { ex, source, typeOfExpr, type Ex } from '../fp-types';
import { int } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { math, t, type Rich } from '../rich';
import { checkFrom, workedCambridge, worked, type TopicContent } from '../topic';

const tyId = (ty: string): string => (ty === 'error' ? 'error' : ty.replace(/'/g, 'q').replace(/ -> /g, '_to_').replace(/ \* /g, '_x_').replace(/[ ()]/g, '_'));
function typeOptions(types: readonly string[]): ChoiceOption[] {
  return [...new Set(types)].sort().map((ty) => ({ id: tyId(ty), label: ty === 'error' ? t`a type error` : [code`${oc(ty)}`] }));
}

// ---------------------------------------------------------------- tuple types

interface TupItem { e: (n: number, m: number) => Ex; type: string; why: Rich; wrong: readonly [string, Rich][] }
const TUP_ITEMS: readonly TupItem[] = [
  {
    e: (n) => ex.tuple(ex.int(n), ex.str('s'), ex.bool(true)), type: 'int * string * bool',
    why: t`A tuple of three components has a product type of three factors, in the same order.`,
    wrong: [['(int * string) * bool', t`Three components written together form one triple, not a pair whose first part is a pair.`], ['bool * string * int', t`The factors of the type are in the order of the components.`]],
  },
  {
    e: (n, m) => ex.list(ex.tuple(ex.int(n), ex.bool(true)), ex.tuple(ex.int(m), ex.bool(false))), type: '(int * bool) list',
    why: t`Each element is a pair of an int and a bool, so this is a list of such pairs.`,
    wrong: [['int * bool list', t`That would be a pair of an int and a list of bools. Here the list's elements are pairs: brackets go round the pair type.`], ['error', t`Both elements have type ${code`int * bool`}, so they can share a list.`]],
  },
  {
    e: (n) => ex.tuple(ex.list(ex.int(n)), ex.str('x')), type: 'int list * string',
    why: t`The first component is an ${code`int list`}, the second a ${code`string`}.`,
    wrong: [['(int * string) list', t`It is a single pair whose first component happens to be a list; it is not a list of pairs.`], ['int * string', t`The first component is the list ${code`[...]`}, so its type is ${code`int list`}.`]],
  },
  {
    e: (n, m) => ex.tuple(ex.tuple(ex.int(n), ex.int(m)), ex.bool(true)), type: '(int * int) * bool',
    why: t`The inner brackets make a pair, which is the first component of an outer pair.`,
    wrong: [['int * int * bool', t`The inner pair is one component: this is a pair, not a triple, and the type keeps the brackets.`], ['int * (int * bool)', t`The pair is the first component, so the brackets go round the first two.`]],
  },
  {
    e: (n) => ex.tuple(ex.int(n), ex.list(ex.bool(true), ex.bool(false))), type: 'int * bool list',
    why: t`A pair of an int and a list of bools. In types, ${code`list`} binds tighter than ${code`*`}, so no brackets are needed.`,
    wrong: [['(int * bool) list', t`That is a list of pairs. Here there is one pair, whose second component is a list.`], ['int * bool * bool', t`The second component is one value, a list, however many elements it has.`]],
  },
];

interface TupP { i: number; n: number; m: number }

const tupleType = generator<TupP>({
  id: 'tuple-type',
  quick: true,
  skill: 'Give the type of an expression built from tuples and lists: a product type lists its components in order, and list binds tighter than *.',
  params: (rng) => ({ i: int(rng, 0, TUP_ITEMS.length - 1), n: int(rng, 1, 99), m: int(rng, 1, 99) }),
  sane: ({ i }) => (i >= 0 && i < TUP_ITEMS.length ? null : 'out of range'),
  problem: ({ i, n, m }) => {
    const it = TUP_ITEMS[i] as TupItem;
    return {
      prompt: t`What is the type of ${code`${oc(source(it.e(n, m)))}`}?`,
      answer: { kind: 'choice', options: typeOptions([it.type, ...it.wrong.map(([w]) => w)]), correct: tyId(it.type) },
      solution: [it.why],
    };
  },
  solve: ({ i, n, m }) => [tyId(typeOfExpr((TUP_ITEMS[i] as TupItem).e(n, m)) ?? 'error')],
  misconceptions: ({ i }) => (TUP_ITEMS[i] as TupItem).wrong.map(([w, why]) => ({ response: [tyId(w)], why })),
});

// ---------------------------------------------------------------- records are copied, not changed

interface RecP { a: number; b: number; c: number; k: number }

const recordCopy = generator<RecP>({
  id: 'record-with',
  quick: true,
  skill: 'Evaluate field access after a record copy with "with": the new record differs in one field, and the old record is unchanged.',
  params: (rng) => {
    for (;;) {
      const p = { a: int(rng, 1, 20), b: int(rng, 1, 20), c: int(rng, 1, 20), k: int(rng, 2, 5) };
      if (p.a !== p.c) return p;
    }
  },
  sane: ({ a, c, k }) => (a !== c && k >= 2 ? null : 'out of range'),
  problem: ({ a, b, c, k }) => ({
    prompt: t`After ${codeBlock(code`type pt = { x : int; y : int }`, code`let p = { x = ${a}; y = ${b} }`, code`let q = { p with x = ${c} }`)} what is ${code`q.x * ${k} + p.x`}?`,
    answer: { kind: 'exact', expected: String(c * k + a) },
    solution: [
      t`${code`{ p with x = ${c} }`} builds a new record, a copy of ${code`p`} with ${code`x`} set to ${c}. So ${code`q.x`} is ${c} and ${code`q.y`} is ${b}.`,
      t`Records cannot be changed once built, so ${code`p.x`} is still ${a}.`,
      t`So ${math`${c} \times ${k} + ${a} = ${c * k + a}`}.`,
    ],
  }),
  solve: ({ a, b, c, k }) => {
    const p = Object.freeze({ x: a, y: b });
    const q = { ...p, x: c };
    return String(q.x * k + p.x);
  },
  misconceptions: ({ a, c, k }): Misconception[] => [
    { response: String(c * k + c), why: t`${code`with`} does not change ${code`p`}: it makes a new record ${code`q`}. ${code`p.x`} is still ${a}.` },
    { response: String(a * k + a), why: t`${code`q`} is the copy with ${code`x`} replaced: ${code`q.x`} is ${c}.` },
  ],
});

// ---------------------------------------------------------------- zip and unzip

interface ZipP { form: number; xs: number[]; ys: number[] }

const showPairs = (ps: readonly (readonly [number, number])[]): string => `[${ps.map(([x, y]) => `(${x}, ${y})`).join('; ')}]`;
const showPairOfLists = (xs: readonly number[], ys: readonly number[]): string => `([${xs.join('; ')}], [${ys.join('; ')}])`;
const zipF = (xs: readonly number[], ys: readonly number[]): [number, number][] => (xs.length === 0 || ys.length === 0 ? [] : [[xs[0] as number, ys[0] as number], ...zipF(xs.slice(1), ys.slice(1))]);

const zipUnzip = generator<ZipP>({
  id: 'zip-unzip',
  quick: true,
  skill: 'Evaluate FoCS\'s zip on lists of unequal length, and unzip on a list of pairs.',
  params: (rng) => {
    const form = int(rng, 0, 1);
    const n = int(rng, 2, 4);
    const xs = Array.from({ length: form === 0 ? n + 1 : n }, (_, i) => 10 * (i + 1) + int(rng, 1, 9));
    const ys = Array.from({ length: n }, () => int(rng, 1, 9));
    return { form, xs, ys };
  },
  sane: ({ form, xs, ys }) => ((form === 0 ? xs.length === ys.length + 1 : xs.length === ys.length) && ys.length >= 2 ? null : 'out of range'),
  problem: ({ form, xs, ys }) => {
    if (form === 0) {
      const right = showPairs(zipF(xs, ys));
      return {
        prompt: t`FoCS defines ${codeBlock(code`let rec zip xs ys = match xs, ys with`, code`  | (x :: xs, y :: ys) -> (x, y) :: zip xs ys`, code`  | _ -> []`)} What is ${code`zip ${xs} ${ys}`}?`,
        answer: {
          kind: 'choice',
          options: [
            { id: 'right', label: [code`${oc(right)}`] },
            { id: 'exn', label: t`It raises an exception, because the lists have different lengths.` },
            { id: 'swap', label: [code`${oc(showPairs(zipF(ys, xs)))}`] },
          ],
          correct: 'right',
        },
        solution: [
          t`The first case pairs the two heads and recurses on the tails, ${ys.length} times. Then the second list is empty, the first case no longer matches, and the wildcard ${code`_`} gives ${code`[]`}.`,
          t`So the surplus element ${xs[xs.length - 1] as number} is discarded: the result is ${code`${oc(right)}`}.`,
        ],
      };
    }
    const pairs = zipF(xs, ys);
    return {
      prompt: t`FoCS defines ${codeBlock(code`let rec unzip = function`, code`  | [] -> ([], [])`, code`  | (x, y) :: pairs -> let xs, ys = unzip pairs in (x :: xs, y :: ys)`)} What is ${code`unzip ${oc(showPairs(pairs))}`}?`,
      answer: {
        kind: 'choice',
        options: [
          { id: 'right', label: [code`${oc(showPairOfLists(xs, ys))}`] },
          { id: 'flat', label: [code`${oc(`[${xs.map((x, i) => `${x}; ${ys[i] as number}`).join('; ')}]`)}`] },
          { id: 'swap', label: [code`${oc(showPairOfLists(ys, xs))}`] },
        ],
        correct: 'right',
      },
      solution: [
        t`${code`unzip`} returns a pair of lists: the first components in order, and the second components in order.`,
        t`So the result is ${code`${oc(showPairOfLists(xs, ys))}`}, and ${code`zip`} applied to its two parts gives back the list of pairs.`,
      ],
    };
  },
  solve: ({ form, xs, ys }) => {
    if (form === 0) return [showPairs(zipF(xs, ys)) === showPairs(xs.slice(0, ys.length).map((x, i) => [x, ys[i] as number] as const)) ? 'right' : 'none'];
    const pairs = zipF(xs, ys);
    return [showPairOfLists(pairs.map((p) => p[0]), pairs.map((p) => p[1])) === showPairOfLists(xs, ys) ? 'right' : 'none'];
  },
  misconceptions: ({ form }): Misconception[] => form === 0
    ? [
      { response: ['exn'], why: t`The wildcard case ${code`_`} matches whenever either list is empty, so the extra elements are dropped quietly. (FoCS Exercise ${4.3} asks about a version without the wildcard.)` },
      { response: ['swap'], why: t`Each pair has the element of the first list first: ${code`(x, y)`}.` },
    ]
    : [
      { response: ['flat'], why: t`${code`unzip`} returns two lists, as a pair, not one list of all the numbers.` },
      { response: ['swap'], why: t`The first list collects the first components ${code`x`}.` },
    ],
});

// ---------------------------------------------------------------- Cambridge problems

const STUDENT_DECL = codeBlock(code`type student = { first_name : string; last_name : string; gpa : float }`);
const student = auto({
  id: 'cs3110-ex3-student',
  source: cite('cs3110-ex3', 'Exercise "student", second part', true),
  title: t`A function that extracts a name`,
  prompt: t`Assume ${STUDENT_DECL} Which expression has type ${code`student -> string * string`}, a function that extracts the student's name?`,
  answer: {
    kind: 'choice',
    options: [
      { id: 'pair', label: [code`fun s -> (s.first_name, s.last_name)`] },
      { id: 'concat', label: [code`fun s -> s.first_name ^ s.last_name`] },
      { id: 'list', label: [code`fun s -> [s.first_name; s.last_name]`] },
      { id: 'build', label: [code`fun f l g -> { first_name = f; last_name = l; gpa = g }`] },
    ],
    correct: 'pair',
  },
  solution: [
    t`${code`s.first_name`} and ${code`s.last_name`} read two fields; each is a ${code`string`}. OCaml knows ${code`s`} is a ${code`student`} because those field names belong to that record type.`,
    t`Putting them in a pair gives ${code`string * string`}, so ${code`fun s -> (s.first_name, s.last_name)`} has type ${code`student -> string * string`}.`,
    t`The others: ${code`^`} joins the strings into one ${code`string`}; square brackets make a ${code`string list`}; and the last builds a student, with type ${code`string -> string -> float -> student`}, which is the exercise's third part.`,
  ],
  reference: ['pair'],
  // OCaml 4.11.1: the four have types student -> string * string, student -> string, student -> string list, string -> string -> float -> student.
  verify: () => same('the pair type', typeOfExpr(ex.tuple(ex.str('a'), ex.str('b'))), 'string * string'),
  misconceptions: [
    { response: ['concat'], why: t`${code`^`} joins the two strings into one, of type ${code`string`}; the type asked for is a pair.` },
    { response: ['list'], why: t`Square brackets build a list, ${code`string list`}. A pair is written with round brackets and a comma.` },
    { response: ['build'], why: t`That builds a student from its parts: its type is ${code`string -> string -> float -> student`}.` },
  ],
});

const pokerecord = auto({
  id: 'cs3110-ex3-pokerecord',
  source: cite('cs3110-ex3', 'Exercise "pokerecord"', true),
  title: t`Building a record`,
  prompt: t`Given ${codeBlock(code`type poketype = Normal | Fire | Water`, code`type pokemon = { name : string; hp : int; ptype : poketype }`)} which of these define a ${code`pokemon`} named ${code`"charizard"`} with ${78} HP and type ${code`Fire`}? Choose all that apply.`,
  answer: {
    kind: 'choice',
    options: [
      { id: 'inorder', label: [code`{ name = "charizard"; hp = ${78}; ptype = Fire }`] },
      { id: 'reordered', label: [code`{ hp = ${78}; ptype = Fire; name = "charizard" }`] },
      { id: 'tuple', label: [code`("charizard", ${78}, Fire)`] },
      { id: 'missing', label: [code`{ name = "charizard"; hp = ${78} }`] },
    ],
    correct: ['inorder', 'reordered'],
  },
  solution: [
    t`A record value gives every field a value, by name, in braces. The fields are found by name, so their order does not matter: the first two are the same record, and OCaml says they are equal.`,
    t`A tuple has no field names: ${code`("charizard", ${78}, Fire)`} is a value of type ${code`string * int * poketype`}, not a ${code`pokemon`}.`,
    t`Leaving out ${code`ptype`} is an error: OCaml reports that some record fields are undefined.`,
  ],
  reference: ['inorder', 'reordered'],
  // OCaml 4.11.1: the two records are equal (charizard = c2 is true); the tuple and the record without ptype are errors.
  verify: () => {
    const a = { name: 'charizard', hp: 78, ptype: 'Fire' };
    const b = { hp: 78, ptype: 'Fire', name: 'charizard' };
    return same('field order', (Object.keys(a) as (keyof typeof a)[]).every((k) => a[k] === b[k]), true);
  },
  misconceptions: [
    { response: ['inorder'], why: t`Fields are matched by name, so they may be written in any order: the second is the same record.` },
    { response: ['inorder', 'reordered', 'tuple'], why: t`A tuple is not a record, even with the same values in the declared order: it has a product type, not ${code`pokemon`}.` },
  ],
});

const dateBefore = supervision({
  id: 'cs3110-ex3-date-before',
  source: cite('cs3110-ex3', 'Exercise "date before"'),
  title: t`Comparing dates`,
  prompt: t`A date is a triple of type ${code`int * int * int`}, year, month, day, such as ${code`(${2013}, ${2}, ${1})`}. Write ${code`is_before`}, taking two dates and returning ${code`true`} exactly when the first comes strictly before the second. Take the triples apart with a pattern, and explain why your function is right on dates even though it never checks that its inputs are valid dates.`,
  writeUp: 'explanation',
});
const focs43 = supervision({
  id: 'focs-4-3',
  source: cite('focs-notes', 'Lecture 4, Exercise 4.3'),
  title: t`A zip without the wildcard`,
  prompt: t`How does this version of ${code`zip`} differ from FoCS's? ${codeBlock(code`let rec zip xs ys = match xs, ys with`, code`  | (x :: xs, y :: ys) -> (x, y) :: zip xs ys`, code`  | ([], []) -> []`)} OCaml warns that the match is not exhaustive, with the example ${code`(_ :: _, [])`}. Say what happens on lists of different lengths, and when you might prefer this version.`,
  writeUp: 'explanation',
});
const focs46 = supervision({
  id: 'focs-4-6',
  source: cite('focs-notes', 'Lecture 4, Exercise 4.6'),
  title: t`What a type tells you`,
  prompt: t`We know nothing about the functions ${code`f`} and ${code`g`} other than their polymorphic types: ${code`f : 'a * 'b -> 'b * 'a`} and ${code`g : 'a -> 'a list`}. Suppose ${code`f (${1}, true)`} and ${code`g ${0}`} are evaluated and return results. State, with reasons, what you think the resulting values will be.`,
  writeUp: 'explanation',
});

// ---------------------------------------------------------------- lesson

const PAIR = [3, 8] as const;

export const fpRecordsTuples: TopicContent = {
  topicId: 'fp.records-tuples',
  goal: t`Group values in tuples and records, and take them apart by pattern matching, as ${code`zip`} and ${code`unzip`} do.`,
  objective: t`Build tuples and records, read their types, and take them apart by pattern matching.`,
  why: t`Most data has several parts; tuples and records hold them together, and datatypes and modules build on them.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`Several values as one` },
    { kind: 'hook', text: t`A function in OCaml returns one value. So how does ${code`unzip`} return two lists? It returns one value that holds two: a pair. And how does a program keep a student's first name, last name, and grade together without mixing them up? With a record, which gives each part a name.` },
    {
      kind: 'definition',
      name: t`Tuple and product type`,
      formal: t`If ${math`e_{${1}} : \tau_{${1}}, \ldots, e_{n} : \tau_{n}`} with ${math`n \ge ${2}`}, the [[tuple|tuple]] ${code`(e${1}, ..., en)`} has the product type ${math`\tau_{${1}} * \cdots * \tau_{n}`}. A tuple is taken apart by the pattern ${code`(x${1}, ..., xn)`}, which binds each variable to the component in its position.`,
      plain: t`A pair holds two values side by side, a triple three. ${code`(${PAIR[0]}, "eight")`} has type ${code`int * string`}, and ${code`let (a, b) = (${PAIR[0]}, ${PAIR[1]}) in a + b`} is ${PAIR[0] + PAIR[1]}.`,
    },
    {
      kind: 'p',
      text: t`The ${code`*`} in a type is not multiplication; it is named after the Cartesian product of sets, ${math`A \times B`}, the set of all pairs. In a type, ${code`list`} binds tighter than ${code`*`}: ${code`int * bool list`} is a pair of an int and a list of bools, while ${code`(int * bool) list`} is a list of pairs.`,
    },
    {
      kind: 'definition',
      name: t`Record`,
      formal: t`A declaration ${code`type r = { f${1} : t${1}; ...; fn : tn }`} defines a [[record-type|record type]] with fields ${code`f${1}`}, ..., ${code`fn`}. A value of type ${code`r`} is written ${code`{ f${1} = e${1}; ...; fn = en }`}, giving every field once, in any order. ${code`e.fi`} is the value of field ${code`fi`}, and ${code`{ e with fi = e' }`} is a new record equal to ${code`e`} except that field ${code`fi`} is ${code`e'`}.`,
      plain: t`A record is a tuple whose parts have names instead of positions. With ${code`type pt = { x : int; y : int }`}, the value ${code`{ x = ${PAIR[0]}; y = ${PAIR[1]} }`} has ${code`.x`} equal to ${PAIR[0]}.`,
    },
    {
      kind: 'p',
      text: t`Like lists, tuples and records cannot be changed. ${code`{ p with x = ${10} }`} does not alter ${code`p`}; it makes a new record. Any code still holding ${code`p`} sees exactly what it saw before.`,
      why: { q: t`Isn't copying slow?`, a: t`Only the record itself is copied, a handful of fields. The fields' values, such as long lists, are shared, not copied, which is safe precisely because nothing can change them.` },
    },
    checkFrom(recordCopy, { a: 3, b: 4, c: 10, k: 2 }, t`${code`q`} is a new record with ${code`x`} equal to ${10}, and ${code`p.x`} is still ${3}: ${math`${10} \times ${2} + ${3} = ${23}`}.`),
    { kind: 'section', title: t`Lists of pairs: zip and unzip` },
    { kind: 'narrative', text: t`FoCS pairs up two lists element by element with ${code`zip`}, matching on both lists at once by matching on the pair ${code`(xs, ys)`}.` },
    { kind: 'rule', text: [codeBlock(code`let rec zip xs ys = match xs, ys with`, code`  | (x :: xs, y :: ys) -> (x, y) :: zip xs ys`, code`  | _ -> []`)] },
    {
      kind: 'steps',
      steps: [
        { label: t`Match a pair of lists`, text: t`${code`zip [${1}; ${2}; ${3}] [${4}; ${5}]`}: both lists are non-empty, so the first case gives ${code`(${1}, ${4}) :: zip [${2}; ${3}] [${5}]`}.` },
        { label: t`Again`, text: t`Still both non-empty: ${code`(${2}, ${5}) :: zip [${3}] []`}.` },
        { label: t`The wildcard`, text: t`Now the second list is empty, so the first case fails and ${code`_`}, which matches anything, gives ${code`[]`}.`, eq: [code`[(${1}, ${4}); (${2}, ${5})]`], plain: t`Patterns are tried in order, so the wildcard only sees pairs where a list is empty. The surplus ${3} is dropped.` },
      ],
    },
    { kind: 'narrative', text: t`${code`unzip`} goes the other way and must build two lists at once. It does so by returning a pair, and taking apart the pair returned by the recursive call with a pattern in a ${code`let`}.` },
    { kind: 'rule', text: [codeBlock(code`let rec unzip = function`, code`  | [] -> ([], [])`, code`  | (x, y) :: pairs ->`, code`      let xs, ys = unzip pairs in (x :: xs, y :: ys)`)] },
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`${code`(int * int) * bool`} and ${code`int * int * bool`} are the same type.`, counterexample: t`${code`((${PAIR[0]}, ${PAIR[1]}), true)`} is a pair whose first part is a pair; ${code`(${PAIR[0]}, ${PAIR[1]}, true)`} is a triple. The pattern ${code`(a, b, c)`} matches the second but not the first.` },
    { kind: 'pitfall', claim: t`${code`{ p with x = ${10} }`} sets ${code`p.x`} to ${10}.`, counterexample: t`It returns a new record; ${code`p`} is unchanged. Bind the result, ${code`let q = { p with x = ${10} }`}, and use ${code`q`}.` },
    { kind: 'pitfall', claim: t`A record can leave out a field it does not need.`, counterexample: t`With ${code`type pt = { x : int; y : int }`}, the value ${code`{ x = ${PAIR[0]} }`} is an error: OCaml reports "Some record fields are undefined: y". Every field must be given, because a value of type ${code`pt`} must always have both an ${code`x`} and a ${code`y`} to read.` },
    { kind: 'takeaway', text: t`A tuple groups values by position and a record by name; both are taken apart by patterns, never changed in place, and a function returns several results as one tuple, as ${code`unzip`} does.` },
  ],
  examples: [
    workedCambridge(student),
    worked(zipUnzip, { form: 0, xs: [11, 22, 33], ys: [4, 5] }, t`Zipping lists of different lengths`),
    worked(tupleType, { i: 1, n: 7, m: 8 }, t`A list of pairs`),
  ],
  generators: [tupleType, recordCopy, zipUnzip],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['tuple', 'record-type'],
  cambridge: withUses([pokerecord, dateBefore, focs43, focs46], {
    'focs-4-3': { sections: ['Lists of pairs: zip and unzip'], note: t`What a non-exhaustive match does on lists of different lengths` },
    'cs3110-ex3-date-before': { sections: ['Several values as one'], note: t`Comparing triples with a pattern` },
    'focs-4-6': { sections: ['Several values as one'], note: t`What a polymorphic type says about a function` },
  }),
  gate: ['focs-4-3', 'cs3110-ex3-date-before', 'focs-4-6'],
  recall: [
    { front: t`What is the type of a tuple ${code`(e${1}, e${2})`}?`, back: t`The product type ${math`\tau_{${1}} * \tau_{${2}}`} of the components' types, in order.` },
    { front: t`What does ${code`{ r with f = v }`} do?`, back: t`It builds a new record equal to ${code`r`} except in field ${code`f`}; ${code`r`} itself is unchanged.` },
    { front: t`How does ${code`unzip`} build two lists in one pass?`, back: t`It returns a pair: ${code`let xs, ys = unzip pairs in (x :: xs, y :: ys)`} takes apart the pair from the recursive call and puts ${code`x`} and ${code`y`} on the front of its two lists.` },
  ],
};
