/**
 * fp.polymorphism: Polymorphic types. The lesson follows CS3110 Section 2.4 (polymorphic
 * functions, type variables, instantiation) and FoCS Lectures 3 and 4 (the polymorphic
 * types of list functions, "a word on polymorphism"). The problems are the CS3110 Chapter 2
 * exercise "poly types" and FoCS Exercise 3.4.
 *
 * Every type below was printed by the OCaml 4.11.1 toplevel (scratch file ocamlE/t7.ml), and
 * each is checked again in the content checks by the unification inference of fp-types.ts:
 *   let f x = if x then x else x          val f : bool -> bool
 *   let g x y = if y then x else x        val g : 'a -> bool -> 'a
 *   let h x y z = if x then y else z      val h : bool -> 'a -> 'a -> 'a
 *   let i x y z = if x then y else y      val i : bool -> 'a -> 'b -> 'a
 *   and the generator items: int -> int, int -> 'a -> 'a, 'a -> 'a list, int list -> int list,
 *   bool -> int -> int, 'a list -> int, 'a -> 'a -> 'a, bool -> int list;
 *   push 3 [] : int list; push 3 [true] is a type error; [[]; []] : 'a list list.
 */
import { auto, cite, supervision } from '../cambridge';
import { code, codeBlock, oc } from '../ocaml-code';
import { ex, declSource, parseTy, source, typeOfDecl, typeOfExpr, type Decl, type Ex } from '../fp-types';
import { int } from '../math';
import { generator, type ChoiceOption } from '../problem';
import { math, t, type Rich } from '../rich';
import { checkFrom, workedCambridge, worked, type TopicContent } from '../topic';

const { v } = ex;

/** Choice options for type answers, ids from the types themselves so a misconception names the same option. */
function typeOptions(types: readonly string[]): ChoiceOption[] {
  return [...new Set(types)].sort().map((ty) => ({ id: tyId(ty), label: ty === 'error' ? t`a type error` : [code`${oc(ty)}`] }));
}
const tyId = (ty: string): string => (ty === 'error' ? 'error' : ty.replace(/'/g, 'q').replace(/ -> /g, '_to_').replace(/ \* /g, '_x_').replace(/[ ()]/g, '_'));

// ---------------------------------------------------------------- inferring a type

interface InferItem { decl: (n: number) => Decl; type: string; wrong: readonly [string, Rich][]; why: Rich }

const INFER_ITEMS: readonly InferItem[] = [
  {
    decl: (n) => ({ name: 'f', params: ['x'], body: ex.bin('+', v('x'), ex.int(n)) }), type: 'int -> int',
    why: t`${code`+`} takes two ints, so ${code`x`} must be an ${code`int`}, and so is the result.`,
    wrong: [["'a -> 'a", t`${code`x`} is added with ${code`+`}, which only takes ints: nothing is left free to vary.`], ["'a -> int", t`${code`x + `} forces ${code`x`} to be an ${code`int`} too.`]],
  },
  {
    decl: (n) => ({ name: 'f', params: ['x', 'y'], body: ex.if(ex.bin('=', v('x'), ex.int(n)), v('y'), v('y')) }), type: "int -> 'a -> 'a",
    why: t`${code`x`} is compared with an int, so it is an ${code`int`}. ${code`y`} is only passed through, so it can be anything, ${code`'a`}, and the result is ${code`y`}.`,
    wrong: [["'a -> 'b -> 'b", t`${code`x = `} an int forces ${code`x`} to be an ${code`int`}: ${code`=`} compares two values of one type.`], ["int -> 'a -> 'b", t`Both branches return ${code`y`}, so the result has the type of ${code`y`}: the same variable.`]],
  },
  {
    decl: () => ({ name: 'f', params: ['x'], body: ex.list(v('x'), v('x')) }), type: "'a -> 'a list",
    why: t`Nothing is done to ${code`x`}, so its type is a variable ${code`'a`}; the result is a list of two of them, an ${code`'a list`}.`,
    wrong: [["'a list -> 'a list", t`The argument is ${code`x`} itself, put into a list: the argument is an ${code`'a`}, the result an ${code`'a list`}.`], ["'a -> 'b list", t`The list holds ${code`x`}, so its elements have the type of ${code`x`}: the same variable.`]],
  },
  {
    decl: (n) => ({ name: 'f', params: ['xs'], body: ex.cons(ex.int(n), v('xs')) }), type: 'int list -> int list',
    why: t`An int is consed onto ${code`xs`}, so ${code`xs`} must be a list of ints.`,
    wrong: [["'a list -> 'a list", t`${code`::`} needs the head and the tail's elements to have one type, and the head is an int.`], ["'a -> int list", t`${code`xs`} is the tail of a cons, so it must be a list.`]],
  },
  {
    decl: (n) => ({ name: 'f', params: ['x', 'y'], body: ex.if(v('x'), v('y'), ex.int(n)) }), type: 'bool -> int -> int',
    why: t`${code`x`} is the condition, a ${code`bool`}. The branches must agree, and one is an int, so ${code`y`} is an ${code`int`} too.`,
    wrong: [["bool -> 'a -> int", t`Both branches of an ${code`if`} have one type, and the else branch is an int, so ${code`y`} is an int.`], ["'a -> int -> int", t`${code`x`} is the condition of the ${code`if`}, so it must be a ${code`bool`}.`]],
  },
  {
    decl: (n) => ({ name: 'f', rec: true, params: ['xs'], body: ex.matchList(v('xs'), ex.int(n), '_', 't', ex.app(v('f'), v('t'))) }), type: "'a list -> int",
    why: t`${code`xs`} is matched against list patterns, so it is a list, but its elements are never used: ${code`'a list`}. The result is the int in the base case.`,
    wrong: [['int list -> int', t`Nothing in the body uses an element, so nothing forces them to be ints: the function works on any list.`], ["'a -> int", t`${code`xs`} is matched against ${code`[]`} and ${code`_ :: t`}, so it must be a list.`]],
  },
  {
    decl: () => ({ name: 'f', params: ['x', 'y'], body: ex.if(ex.bin('>', v('x'), v('y')), v('x'), v('y')) }), type: "'a -> 'a -> 'a",
    why: t`${code`>`} compares two values of the same type, any type, so ${code`x`} and ${code`y`} share one variable ${code`'a`}, and the result is one of them.`,
    wrong: [['int -> int -> int', t`OCaml's comparisons are polymorphic: ${code`>`} works on any type, so nothing forces ints.`], ["'a -> 'b -> 'a", t`${code`x > y`} compares them, which needs both to have the same type.`]],
  },
  {
    decl: (n) => ({ name: 'f', params: ['x'], body: ex.if(v('x'), ex.list(), ex.list(ex.int(n))) }), type: 'bool -> int list',
    why: t`${code`x`} is a condition, a ${code`bool`}. The branches agree, so ${code`[]`} takes the type of the other branch, ${code`int list`}.`,
    wrong: [["bool -> 'a list", t`The two branches must have one type, and the else branch is an ${code`int list`}, which fixes the empty list's type too.`], ["'a -> int list", t`${code`x`} is used as the condition, so it is a ${code`bool`}.`]],
  },
];

interface InferP { i: number; n: number }

const inferType = generator<InferP>({
  id: 'infer-type',
  quick: true,
  skill: 'Infer the most general type of a function from how its body uses each argument: an argument nothing constrains gets a type variable.',
  params: (rng) => ({ i: int(rng, 0, INFER_ITEMS.length - 1), n: int(rng, 1, 99) }),
  sane: ({ i, n }) => (i >= 0 && i < INFER_ITEMS.length && n >= 1 ? null : 'out of range'),
  problem: ({ i, n }) => {
    const it = INFER_ITEMS[i] as InferItem;
    return {
      prompt: t`What type does OCaml infer for ${code`${oc(declSource(it.decl(n)))}`}?`,
      answer: { kind: 'choice', options: typeOptions([it.type, ...it.wrong.map(([w]) => w)]), correct: tyId(it.type) },
      solution: [it.why, t`So the type is ${code`${oc(it.type)}`}.`],
    };
  },
  solve: ({ i, n }) => [tyId(typeOfDecl((INFER_ITEMS[i] as InferItem).decl(n)) ?? 'error')],
  misconceptions: ({ i }) => (INFER_ITEMS[i] as InferItem).wrong.map(([w, why]) => ({ response: [tyId(w)], why })),
});

// ---------------------------------------------------------------- instances

const SCOPE = [
  ['push', parseTy("'a -> 'a list -> 'a list")],
  ['length', parseTy("'a list -> int")],
  ['twice', parseTy("'a -> 'a list")],
] as const;
const SIGS: Readonly<Record<string, string>> = { push: "'a -> 'a list -> 'a list", length: "'a list -> int", twice: "'a -> 'a list" };

interface InstItem { e: (n: number, m: number) => Ex; fn: string; type: string; why: Rich; wrong: readonly [string, Rich][] }
const INST_ITEMS: readonly InstItem[] = [
  {
    fn: 'push', e: (n) => ex.app(v('push'), ex.int(n), ex.list()), type: 'int list',
    why: t`The first argument is an int, so ${code`'a`} is ${code`int`} here, and the result ${code`'a list`} is an ${code`int list`}.`,
    wrong: [["'a list", t`At this use ${code`'a`} is fixed by the argument: it is ${code`int`}.`], ['error', t`${code`[]`} can be an empty list of any type, including ${code`int list`}.`]],
  },
  {
    fn: 'push', e: (n) => ex.app(v('push'), ex.int(n), ex.list(ex.bool(true))), type: 'error',
    why: t`The first argument makes ${code`'a`} equal to ${code`int`}, the second makes it ${code`bool`}. One variable cannot be both in one use, so it is a type error.`,
    wrong: [['int list', t`Both arguments mention the same ${code`'a`}: the element and the list's elements must have one type.`], ["'a list", t`A type variable stands for one type at each use; here the uses disagree.`]],
  },
  {
    fn: 'push', e: (n) => ex.app(v('push'), ex.list(ex.int(n)), ex.list()), type: 'int list list',
    why: t`The first argument is an ${code`int list`}, so ${code`'a`} is ${code`int list`}, and the result is a list of those.`,
    wrong: [['int list', t`${code`'a`} is the type of the first argument, which is itself a list: ${code`int list`}. The result is an ${code`'a list`}, so a list of lists.`], ['error', t`${code`'a`} may be any type, including a list type.`]],
  },
  {
    fn: 'length', e: (n) => ex.app(v('length'), ex.list(ex.list(ex.int(n)), ex.list())), type: 'int',
    why: t`The argument is an ${code`int list list`}, so ${code`'a`} is ${code`int list`}; the result type ${code`int`} does not mention ${code`'a`}.`,
    wrong: [['int list', t`The result type of ${code`length`} is ${code`int`}, whatever ${code`'a`} is.`], ['error', t`${code`'a`} can be ${code`int list`}: a list of lists is a list.`]],
  },
  {
    fn: 'twice', e: (n) => ex.app(v('twice'), ex.bool(n % 2 === 0)), type: 'bool list',
    why: t`The argument is a ${code`bool`}, so ${code`'a`} is ${code`bool`} and the result is a ${code`bool list`}.`,
    wrong: [["'a list", t`The argument fixes ${code`'a`} at this use.`], ['bool', t`The result type is ${code`'a list`}, a list.`]],
  },
  {
    fn: 'twice', e: (n) => ex.app(v('twice'), ex.list(ex.int(n))), type: 'int list list',
    why: t`The argument is an ${code`int list`}, so ${code`'a`} is ${code`int list`}, and the result is an ${code`int list list`}.`,
    wrong: [['int list', t`${code`'a`} is the whole argument type, ${code`int list`}; the result wraps it in one more list.`], ['error', t`${code`'a`} may be a list type.`]],
  },
];

interface InstP { i: number; n: number; m: number }

const instance = generator<InstP>({
  id: 'instance',
  quick: true,
  skill: 'Find the type of an application of a polymorphic function: each use fixes the type variables by its arguments, consistently.',
  params: (rng) => ({ i: int(rng, 0, INST_ITEMS.length - 1), n: int(rng, 1, 99), m: int(rng, 1, 99) }),
  sane: ({ i }) => (i >= 0 && i < INST_ITEMS.length ? null : 'out of range'),
  problem: ({ i, n, m }) => {
    const it = INST_ITEMS[i] as InstItem;
    return {
      prompt: t`Suppose ${code`${it.fn} : ${oc(SIGS[it.fn] as string)}`}. What is the type of ${code`${oc(source(it.e(n, m)))}`}?`,
      answer: { kind: 'choice', options: typeOptions([it.type, ...it.wrong.map(([w]) => w)]), correct: tyId(it.type) },
      solution: [it.why],
    };
  },
  solve: ({ i, n, m }) => [tyId(typeOfExpr((INST_ITEMS[i] as InstItem).e(n, m), SCOPE) ?? 'error')],
  misconceptions: ({ i }) => (INST_ITEMS[i] as InstItem).wrong.map(([w, why]) => ({ response: [tyId(w)], why })),
});

// ---------------------------------------------------------------- list literals

interface LitItem { e: (n: number, m: number) => Ex; type: string; why: Rich; wrong: readonly [string, Rich][] }
const LIT_ITEMS: readonly LitItem[] = [
  { e: (n, m) => ex.list(ex.int(n), ex.int(m)), type: 'int list', why: t`Two ints: an ${code`int list`}.`, wrong: [["'a list", t`The elements are ints, which fixes the element type.`], ['int', t`It is a list of ints, not an int.`]] },
  { e: (n) => ex.list(ex.int(n), ex.bool(true)), type: 'error', why: t`All elements of a list have one type; an int and a bool cannot share one.`, wrong: [["'a list", t`${code`'a`} is one type for all the elements, not a different one each.`], ['int list', t`${code`true`} is not an int.`]] },
  { e: (n) => ex.list(ex.list(ex.int(n)), ex.list()), type: 'int list list', why: t`The elements are lists; the first is an ${code`int list`}, which fixes the type of ${code`[]`} beside it.`, wrong: [["'a list list", t`The empty list next to the int list must have the same type, ${code`int list`}.`], ['error', t`${code`[]`} can be an empty ${code`int list`}.`]] },
  { e: () => ex.list(ex.list(), ex.list()), type: "'a list list", why: t`Two empty lists: nothing fixes their element type, so it stays a variable.`, wrong: [["'a list", t`The elements are themselves lists, so it is a list of lists.`], ['error', t`An empty list is a list of any type, and both have the same one.`]] },
  { e: (n, m) => ex.list(ex.list(ex.int(n)), ex.list(ex.int(m), ex.int(n))), type: 'int list list', why: t`Both elements are ${code`int list`}s, of different lengths, which the type does not record.`, wrong: [['error', t`A list's type does not include its length, so lists of different lengths have the same type.`], ['int list', t`The elements are lists, so it is a list of lists.`]] },
  { e: (n) => ex.cons(ex.int(n), ex.list()), type: 'int list', why: t`An int consed onto the empty list: an ${code`int list`} of one element.`, wrong: [["'a list", t`The head is an int, which fixes the type of the list.`], ['int', t`${code`::`} builds a list.`]] },
];

interface LitP { i: number; n: number; m: number }

const literal = generator<LitP>({
  id: 'list-literal-type',
  quick: true,
  skill: 'Give the type of a list expression, or see that its elements cannot share one type.',
  params: (rng) => {
    const n = int(rng, 1, 99);
    let m = int(rng, 1, 99);
    if (m === n) m = n + 1;
    return { i: int(rng, 0, LIT_ITEMS.length - 1), n, m };
  },
  sane: ({ i, n, m }) => (i >= 0 && i < LIT_ITEMS.length && n !== m ? null : 'out of range'),
  problem: ({ i, n, m }) => {
    const it = LIT_ITEMS[i] as LitItem;
    return {
      prompt: t`What is the type of ${code`${oc(source(it.e(n, m)))}`}?`,
      answer: { kind: 'choice', options: typeOptions([it.type, ...it.wrong.map(([w]) => w)]), correct: tyId(it.type) },
      solution: [it.why],
    };
  },
  solve: ({ i, n, m }) => [tyId(typeOfExpr((LIT_ITEMS[i] as LitItem).e(n, m)) ?? 'error')],
  misconceptions: ({ i }) => (LIT_ITEMS[i] as LitItem).wrong.map(([w, why]) => ({ response: [tyId(w)], why })),
});

// ---------------------------------------------------------------- Cambridge problems

const POLY: Readonly<Record<'f' | 'g' | 'h' | 'i', Decl>> = {
  f: { name: 'f', params: ['x'], body: ex.if(v('x'), v('x'), v('x')) },
  g: { name: 'g', params: ['x', 'y'], body: ex.if(v('y'), v('x'), v('x')) },
  h: { name: 'h', params: ['x', 'y', 'z'], body: ex.if(v('x'), v('y'), v('z')) },
  i: { name: 'i', params: ['x', 'y', 'z'], body: ex.if(v('x'), v('y'), v('y')) },
};
/** As the OCaml 4.11.1 toplevel printed them. */
const PRINTED: Readonly<Record<'f' | 'g' | 'h' | 'i', string>> = { f: 'bool -> bool', g: "'a -> bool -> 'a", h: "bool -> 'a -> 'a -> 'a", i: "bool -> 'a -> 'b -> 'a" };

function polyProblem(name: 'f' | 'g' | 'h' | 'i', wrong: readonly [string, Rich][], steps: readonly Rich[]) {
  const d = POLY[name];
  return auto({
    id: `cs3110-ex2-poly-types-${name}`,
    source: cite('cs3110-ex2', `Exercise "poly types", function ${name}`),
    title: t`The type of ${code`${name}`}`,
    prompt: t`What is the type of the function ${code`${oc(declSource(d))}`}?`,
    answer: { kind: 'choice', options: typeOptions([PRINTED[name], ...wrong.map(([w]) => w)]), correct: tyId(PRINTED[name]) },
    solution: steps,
    reference: [tyId(PRINTED[name])],
    // Checked against the toplevel's answer by independent unification inference.
    verify: () => (typeOfDecl(d) === PRINTED[name] ? null : `${name}: inferred ${String(typeOfDecl(d))}, toplevel ${PRINTED[name]}`),
    misconceptions: wrong.map(([w, why]) => ({ response: [tyId(w)], why })),
  });
}

const polyH = polyProblem('h', [
  ["bool -> 'a -> 'b -> 'a", t`${code`y`} and ${code`z`} are the two branches, and both branches of an ${code`if`} have one type: they share ${code`'a`}.`],
  ["'a -> 'b -> 'b -> 'b", t`${code`x`} is the condition of the ${code`if`}, so it must be a ${code`bool`}.`],
], [
  t`Give each argument an unknown type: ${code`x : t${1}`}, ${code`y : t${2}`}, ${code`z : t${3}`}, and the result ${code`r`}.`,
  t`${code`x`} is the condition of the ${code`if`}, so ${code`t${1}`} is ${code`bool`}.`,
  t`The branches ${code`y`} and ${code`z`} must have the same type, so ${code`t${2}`} and ${code`t${3}`} are equal, and the result is that type: ${code`r`} is ${code`t${2}`}.`,
  t`Nothing more is known about ${code`t${2}`}: it stays a variable, which OCaml names ${code`'a`}. So ${code`h : bool -> 'a -> 'a -> 'a`}.`,
]);
const polyF = polyProblem('f', [
  ["'a -> 'a", t`${code`x`} is used as the condition, so it must be a ${code`bool`}; the result is ${code`x`}, also a ${code`bool`}.`],
  ["bool -> 'a", t`The result is ${code`x`} in both branches, and ${code`x`} is a ${code`bool`}.`],
], [t`${code`x`} is the condition, so it is a ${code`bool`}; both branches are ${code`x`}, so the result is a ${code`bool`}: ${code`bool -> bool`}.`]);
const polyG = polyProblem('g', [
  ["bool -> 'a -> 'a", t`The condition is ${code`y`}, the second argument, so the ${code`bool`} is the second argument type.`],
  ["'a -> 'b -> 'a", t`${code`y`} is the condition of the ${code`if`}, which forces it to be a ${code`bool`}.`],
], [t`${code`y`} is the condition, so it is a ${code`bool`}. Both branches are ${code`x`}, which is otherwise unconstrained: ${code`'a`}. So ${code`g : 'a -> bool -> 'a`}.`]);
const polyI = polyProblem('i', [
  ["bool -> 'a -> 'a -> 'a", t`${code`z`} is never used, so nothing ties its type to that of ${code`y`}: it gets its own variable ${code`'b`}.`],
  ["bool -> 'a -> 'b -> 'b", t`Both branches are ${code`y`}, so the result has the type of ${code`y`}, the second argument.`],
], [t`${code`x`} is the condition: ${code`bool`}. Both branches are ${code`y`}: the result has the type of ${code`y`}, ${code`'a`}. ${code`z`} is never used, so it has its own variable ${code`'b`}: ${code`i : bool -> 'a -> 'b -> 'a`}.`]);

const focs34 = supervision({
  id: 'focs-3-4',
  source: cite('focs-notes', 'Lecture 3, Exercise 3.4'),
  title: t`Why ${code`'a -> 'b`} makes sense`,
  prompt: t`Consider ${code`let id x = x`}, with type ${code`'a -> 'a`}, and ${code`let rec loop x = loop x`}, with type ${code`'a -> 'b`}. Explain why these types make logical sense, preventing run time type errors, even for expressions like ${code`id [id [id ${0}]]`} or ${code`loop true / loop ${3}`}. (${code`/`} is integer division.) What does ${code`'b`} in the result type of ${code`loop`} tell you about what ${code`loop`} can return?`,
  writeUp: 'explanation',
});

// ---------------------------------------------------------------- lesson

export const fpPolymorphism: TopicContent = {
  topicId: 'fp.polymorphism',
  goal: t`Read types with type variables such as ${code`'a list -> int`}, and see how OCaml infers the most general type of a function.`,
  objective: t`Read types with type variables, and infer the most general type of a function by hand.`,
  why: t`Polymorphism lets one function work on lists of anything; reading types is how you read OCaml code.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`One function, many types` },
    { kind: 'hook', text: t`${code`length`} counts the elements of a list of ints, a list of strings, even a list of lists. Yet OCaml checks every type before running anything. So what is the type of ${code`length`}? The toplevel's answer is ${code`'a list -> int`}, and that little ${code`'a`} is the subject of this lesson.` },
    { kind: 'narrative', text: t`${code`length`} never looks at the elements: it only counts the cells. So whatever the elements are, it works the same way. OCaml records that in the type with a variable, ${code`'a`}, read "alpha", which stands for any type at all.` },
    {
      kind: 'definition',
      name: t`Type variable, polymorphic type, instance`,
      formal: t`A [[type-variable|type variable]] ${code`'a`}, ${code`'b`}, ... stands for an arbitrary type. A type that contains type variables is [[polymorphic-type|polymorphic]]. An instance of a type ${math`\tau`} is the result of replacing each of its type variables by a type, the same type at every occurrence of the same variable. A value of polymorphic type ${math`\tau`} may be used at any instance of ${math`\tau`}.`,
      plain: t`${code`'a list -> int`} has the instance ${code`int list -> int`} (put ${code`int`} for ${code`'a`}) and the instance ${code`string list list -> int`} (put ${code`string list`} for ${code`'a`}). So ${code`length`} can be applied to both kinds of list.`,
    },
    {
      kind: 'p',
      text: t`"The same type at every occurrence" is the whole force of a type variable. ${code`let id x = x`} has type ${code`'a -> 'a`}: whatever goes in, the same type comes out. ${code`id ${3}`} is an ${code`int`} and ${code`id true`} a ${code`bool`}, but no instance of ${code`'a -> 'a`} is ${code`int -> bool`}.`,
    },
    checkFrom(instance, { i: 0, n: 3, m: 5 }, t`At this use, ${code`'a`} is fixed by the first argument, an int: the result is an ${code`int list`}.`),
    { kind: 'section', title: t`How OCaml finds the type` },
    { kind: 'narrative', text: t`You never write these types; OCaml works them out. The method is the one a detective uses: give every unknown a name, collect the clues the code provides, and see what they force. Whatever is not forced stays a variable.` },
    {
      kind: 'steps',
      steps: [
        { label: t`Name the unknowns`, text: t`For ${code`let h x y z = if x then y else z`}, write ${code`x : t${1}`}, ${code`y : t${2}`}, ${code`z : t${3}`}, and call the result type ${code`r`}.` },
        { label: t`Collect the clues`, text: t`The condition of an ${code`if`} is a ${code`bool`}: so ${code`t${1}`} is ${code`bool`}. The two branches have one type, which is the type of the whole: so ${code`t${2}`}, ${code`t${3}`}, and ${code`r`} are all equal.`, why: { q: t`Where do the clues come from?`, a: t`From the typing rules: the rule for ${code`if`} in the first lesson, ${code`+`} forcing ints, ${code`::`} forcing the head and tail to agree, and so on. Each use of an argument in the body gives one equation between types.` } },
        { label: t`Solve`, text: t`Nothing fixes ${code`t${2}`}, so it remains a variable, printed ${code`'a`}.`, eq: [code`h : bool -> 'a -> 'a -> 'a`] },
      ],
    },
    {
      kind: 'definition',
      name: t`Most general type`,
      formal: t`A type ${math`\tau`} of an expression ${math`e`} is a [[most-general-type|most general type]] of ${math`e`} if every type that ${math`e`} can be given is an instance of ${math`\tau`}.`,
      plain: t`${code`fun x -> x`} can be given the type ${code`int -> int`} or ${code`bool -> bool`}, but ${code`'a -> 'a`} is the most general: both are instances of it.`,
    },
    {
      kind: 'theorem',
      name: t`Principal types (Damas and Milner)`,
      statement: t`In the core of OCaml used in these lessons (functions, ${code`let`}, ${code`if`}, lists, tuples, and pattern matching), every expression that has a type has a most general type, and OCaml's type inference computes it.`,
    },
    {
      kind: 'p',
      text: t`The proof belongs to a later course; the method is the clue solving above, made systematic as unification. What matters now is the consequence: the type the toplevel prints is the most general one, so it tells you exactly what a function can be used on.`,
      why: { q: t`Then why does ${code`let f x = x + ${1}`} not get ${code`'a -> 'a`}?`, a: t`Because ${code`'a -> 'a`} is not a type of it: ${code`f true`} would add ${1} to a bool. The clue from ${code`+`} forces ${code`int`}. "Most general" means most general among the types that are correct.` },
    },
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`A type variable means each element of a list may have its own type.`, counterexample: t`${code`[${1}; true]`} is a type error. In ${code`'a list`} the one variable ${code`'a`} stands for one type, shared by every element.` },
    { kind: 'pitfall', claim: t`If ${code`push : 'a -> 'a list -> 'a list`}, then ${code`push ${3} [true]`} is fine, because ${code`'a`} can be anything.`, counterexample: t`At one use, ${code`'a`} is one type: the ${3} makes it ${code`int`} and the ${code`[true]`} makes it ${code`bool`}. That is a type error.` },
    { kind: 'pitfall', claim: t`A result type variable that appears in no argument, as in ${code`loop : 'a -> 'b`}, means the function can return a value of any type.`, counterexample: t`No real value has every type at once. A function of type ${code`'a -> 'b`} can never return: ${code`let rec loop x = loop x`} runs for ever. That is why the type is safe, as FoCS Exercise ${3.4} asks you to explain.` },
    { kind: 'takeaway', text: t`A type variable stands for any type, the same type at each occurrence in one use; OCaml infers the most general type by collecting what each use of an argument forces and leaving the rest as variables.` },
  ],
  examples: [
    workedCambridge(polyH),
    worked(inferType, { i: 1, n: 7 }, t`One argument forced, one free`),
    worked(literal, { i: 3, n: 1, m: 2 }, t`A list of empty lists`),
  ],
  generators: [inferType, instance, literal],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['type-variable', 'polymorphic-type', 'most-general-type'],
  cambridge: [polyF, polyG, polyI, focs34],
  gate: ['cs3110-ex2-poly-types-g', 'cs3110-ex2-poly-types-i', 'focs-3-4'],
  recall: [
    { front: t`What is an instance of a polymorphic type?`, back: t`The type with each type variable replaced by a type, the same type at every occurrence of the same variable.` },
    { front: t`What is a most general type of ${math`e`}?`, back: t`A type of ${math`e`} of which every type of ${math`e`} is an instance; OCaml's inference finds it.` },
    { front: t`Why does ${code`let i x y z = if x then y else y`} have type ${code`bool -> 'a -> 'b -> 'a`}?`, back: t`${code`x`} is a condition, the result is ${code`y`}, and ${code`z`} is unused, so it gets a separate variable.` },
  ],
};

