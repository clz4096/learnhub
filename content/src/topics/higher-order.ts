/**
 * fp.higher-order: Higher-order functions and currying. The lesson follows FoCS Lecture 8
 * ("Functions as Values": functions without names, curried functions, partial
 * application, the curried insertion sort) and CS3110 Sections 4.1 and 4.7
 * (higher-order functions, currying). The problems are CS3110 Chapter 4 exercises (twice,
 * mystery operators 1 and 2, repeat, library uncurried) and FoCS exercises 8.1 and 8.2.
 *
 * Answers checked in OCaml 4.11.1: quad and fourth have type int -> int; square $ 2 + 2 is
 * 16 and square 2 + 2 is 6; (String.length @@ string_of_int) gives 1, 2, 3 on 1, 10, 100;
 * sw has type ('a -> 'b -> 'c) -> 'b -> 'a -> 'c and sw (-) 2 10 is 8. The `verify`
 * functions recompute each answer by evaluating the code's meaning in TypeScript.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { int, pick } from '../math';
import { codeOf, ml, mlBlock } from '../ocaml-code';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { math, t, type Rich } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

// ---------------------------------------------------------------- generators

type FKind = 'add' | 'mul' | 'square' | 'sub';
interface Fn { kind: FKind; c: number }

const fnCode = (f: Fn): Rich => {
  switch (f.kind) {
    case 'add': return [ml`(fun x -> x + ${f.c})`];
    case 'mul': return [ml`(fun x -> ${f.c} * x)`];
    case 'square': return [ml`(fun x -> x * x)`];
    case 'sub': return [ml`(fun x -> x - ${f.c})`];
  }
};
const apply = (f: Fn, x: number): number => (f.kind === 'add' ? x + f.c : f.kind === 'mul' ? f.c * x : f.kind === 'square' ? x * x : x - f.c);
const iterate = (f: Fn, n: number, x: number): number => {
  let v = x;
  for (let i = 0; i < n; i++) v = apply(f, v);
  return v;
};

interface RepeatP { f: Fn; n: number; x: number; twice: boolean }

const repeatValue = generator<RepeatP>({
  id: 'repeat-value',
  skill: 'Evaluate a higher-order function applied to an anonymous function: twice f x and repeat f n x, as in the CS3110 Chapter 4 exercises.',
  quick: true,
  params: (rng) => {
    const twice = rng() < 0.4;
    const kind = pick(rng, ['add', 'mul', 'square', 'sub'] as const);
    const n = twice ? 2 : int(rng, 3, 5);
    const c = kind === 'mul' ? int(rng, 2, 3) : int(rng, 2, 9);
    const x = kind === 'square' ? int(rng, 2, 3) : int(rng, 1, 12);
    return { f: { kind, c }, n: kind === 'square' ? Math.min(n, 3) : n, x, twice: twice || (kind === 'square' && n === 2) };
  },
  sane: ({ n, x }) => (n >= 2 && n <= 5 && x >= 1 ? null : 'out of range'),
  problem: ({ f, n, x, twice }) => {
    const call = twice ? [ml`twice `, ...fnCode(f), ml` ${x}`] : [ml`repeat `, ...fnCode(f), ml` ${n} ${x}`];
    const defn = twice ? [ml`let twice f x = f (f x)`] : [ml`let rec repeat f n x = if n = ${0} then x else repeat f (n - ${1}) (f x)`];
    const steps: Rich[] = [];
    let v = x;
    for (let i = 1; i <= n; i++) {
      const w = apply(f, v);
      steps.push(t`Application ${i} of the function: ${math`${v} \mapsto ${w}`}.`);
      v = w;
    }
    return {
      prompt: t`With ${defn}, what is the value of ${call}?`,
      answer: { kind: 'exact', expected: String(v) },
      solution: [
        t`The argument ${math`f`} is the anonymous function ${fnCode(f)}; the function is applied ${n} times, each time to the previous result, starting from ${x}.`,
        ...steps,
        t`So the value is ${v}.`,
      ],
    };
  },
  solve: ({ f, n, x }) => String(iterate(f, n, x)),
  misconceptions: ({ f, n, x }): Misconception[] => [
    { response: String(iterate(f, 1, x)), why: t`That applies the function once. The higher-order function feeds each result back in: ${n} applications in all.` },
    { response: String(iterate(f, n + 1, x)), why: t`That is one application too many. Count them: the argument ${x} goes in, and the function runs exactly ${n} times.` },
    { response: String(iterate(f, n - 1, x)), why: t`That is one application too few: the function runs ${n} times, not ${n - 1}.` },
  ],
});

interface PartialP { k: number; m: number; cs: number[]; name: string }

const typeLabel = (arrows: number): Rich => [ml`${Array.from({ length: arrows }, () => 'int -> ').join('')}int`];
const partialOptions: ChoiceOption[] = [0, 1, 2, 3].map((a) => ({ id: `a${a}`, label: typeLabel(a) }));

const partialType = generator<PartialP>({
  id: 'partial-type',
  skill: 'Give the type of a curried function applied to some of its arguments (partial application), as in FoCS Lecture 8.',
  quick: true,
  params: (rng) => {
    const k = int(rng, 2, 3);
    return { k, m: int(rng, 1, k), cs: [int(rng, 1, 9), int(rng, 1, 9), int(rng, 1, 9)], name: pick(rng, ['f', 'g', 'h', 'combine', 'mix']) };
  },
  sane: ({ k, m }) => (k >= 2 && k <= 3 && m >= 1 && m <= k ? null : 'out of range'),
  problem: ({ k, m, cs, name }) => {
    const params = ['x', 'y', 'z'].slice(0, k);
    const body = k === 2 ? 'x * y + ' : 'x * y + z + ';
    const args = codeOf(cs.slice(0, m).join(' '));
    const left = k - m;
    return {
      prompt: t`Given ${ml`let ${name} ${params.join(' ')} = ${body}${cs[2] as number}`}, which has type ${typeLabel(k)}, what is the type of ${ml`${name} ${args}`}?`,
      answer: { kind: 'choice', options: partialOptions, correct: `a${left}` },
      solution: [
        t`The arrow associates to the right: ${typeLabel(k)} means ${ml`int -> (${k === 2 ? 'int -> int' : 'int -> int -> int'})`}. Each argument supplied peels off one ${ml`int ->`} from the front.`,
        t`Here ${m} ${m === 1 ? 'argument is' : 'arguments are'} supplied, so ${k} minus ${m} leaves ${left} ${left === 1 ? 'arrow' : 'arrows'}: ${typeLabel(left)}.`,
      ],
    };
  },
  solve: ({ k, m }) => [`a${k - m}`],
  misconceptions: ({ k, m }): Misconception[] => {
    const wrong = new Set([k, m, k - m + 1, Math.max(0, k - m - 1)].filter((a) => a !== k - m && a <= 3));
    return [...wrong].map((a) => ({
      response: [`a${a}`],
      why: a === k ? t`That is the type of the function itself. Applying it to arguments uses up one ${ml`int ->`} per argument.` : t`Count again: the function takes ${k} arguments and ${m} are given, so ${k - m} remain to be supplied.`,
    }));
  },
});

type Form = 'plain' | 'paren' | 'atat' | 'pipe';
interface PrecP { form: Form; f: 'square' | 'double' | 'triple'; a: number; b: number }

const fval = (f: PrecP['f'], x: number): number => (f === 'square' ? x * x : f === 'double' ? 2 * x : 3 * x);

const precedence = generator<PrecP>({
  id: 'application-precedence',
  skill: 'Evaluate expressions mixing function application with operators: application binds tightest, while @@ and |> apply a function to a whole expression.',
  quick: true,
  params: (rng) => {
    const a = int(rng, 1, 6);
    let b = int(rng, 2, 7);
    if (b === a) b = a + 1;
    return { form: pick(rng, ['plain', 'paren', 'atat', 'pipe'] as const), f: pick(rng, ['square', 'double', 'triple'] as const), a, b };
  },
  sane: ({ a, b }) => (a !== b && b >= 2 ? null : 'a and b must differ'),
  problem: ({ form, f, a, b }) => {
    const expr = form === 'plain' ? ml`${f} ${a} + ${b}` : form === 'paren' ? ml`${f} (${a} + ${b})` : form === 'atat' ? ml`${f} @@ ${a} + ${b}` : ml`${a} + ${b} |> ${f}`;
    const whole = form !== 'plain';
    const v = whole ? fval(f, a + b) : fval(f, a) + b;
    const defs: Record<PrecP['f'], Rich> = { square: [ml`let square x = x * x`], double: [ml`let double x = ${2} * x`], triple: [ml`let triple x = ${3} * x`] };
    return {
      prompt: t`With ${defs[f]}, what is the value of ${expr}?`,
      answer: { kind: 'exact', expected: String(v) },
      solution: whole
        ? [
          form === 'paren' ? t`The brackets are evaluated first: ${math`${a} + ${b} = ${a + b}`}.` : t`${form === 'atat' ? ml`@@` : ml`|>`} has lower precedence than ${ml`+`}, so the sum ${math`${a} + ${b} = ${a + b}`} is formed first and handed to ${ml`${f}`} whole.`,
          t`Then ${ml`${f} ${a + b}`} is ${v}.`,
        ]
        : [
          t`Function application binds more tightly than any operator, so ${ml`${f} ${a} + ${b}`} means ${ml`(${f} ${a}) + ${b}`}.`,
          t`${ml`${f} ${a}`} is ${fval(f, a)}, and ${math`${fval(f, a)} + ${b} = ${v}`}.`,
        ],
    };
  },
  solve: ({ form, f, a, b }) => String(form === 'plain' ? fval(f, a) + b : fval(f, a + b)),
  misconceptions: ({ form, f, a, b }): Misconception[] => {
    const tight = t`Application binds tighter than ${ml`+`}: ${ml`${f} ${a} + ${b}`} is ${ml`(${f} ${a}) + ${b}`}.`;
    const loose = t`The operator ${form === 'atat' ? ml`@@` : form === 'pipe' ? ml`|>` : ml`( )`} hands the whole sum ${math`${a + b}`} to the function.`;
    return [
      { response: String(form === 'plain' ? fval(f, a + b) : fval(f, a) + b), why: form === 'plain' ? tight : loose },
      { response: String(a + fval(f, b)), why: form === 'plain' ? tight : loose },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

const square = (x: number): number => x * x;

const mystery1 = auto({
  id: 'cs3110-4-mystery-1',
  source: cite('cs3110-ex4', 'Exercise: mystery operator 1', true),
  title: t`The mystery operator ${ml`$`}`,
  prompt: t`Define ${ml`let ( $ ) f x = f x`} and ${ml`let square x = x * x`}. What is the value of ${ml`square $ ${2} + ${2}`}? (Compare ${ml`square ${2} + ${2}`}.)`,
  answer: { kind: 'exact', expected: String(square(2 + 2)) },
  solution: [
    t`${ml`( $ ) f x = f x`}: the operator just applies a function to an argument. Its type is ${ml`('a -> 'b) -> 'a -> 'b`}.`,
    t`An operator that starts with ${ml`$`} has lower precedence than ${ml`+`}, so ${ml`square $ ${2} + ${2}`} parses as ${ml`square $ (${2} + ${2})`}, which is ${ml`square ${4}`}, that is ${square(2 + 2)}.`,
    t`Without it, application binds tightest: ${ml`square ${2} + ${2}`} is ${ml`(square ${2}) + ${2}`}, that is ${square(2) + 2}. So ${ml`$`} is application with low precedence: it saves writing brackets around an argument.`,
  ],
  reference: String(square(2 + 2)),
  verify: () => same('square $ 2 + 2', square(2 + 2), 16) ?? same('square 2 + 2', square(2) + 2, 6),
  misconceptions: [{ response: String(square(2) + 2), why: t`That is ${ml`square ${2} + ${2}`}, without the operator. ${ml`$`} has lower precedence than ${ml`+`}, so the sum is formed first.` }],
});

const digits = (n: number): number => String(n).length;
const mystery2 = auto({
  id: 'cs3110-4-mystery-2',
  source: cite('cs3110-ex4', 'Exercise: mystery operator 2', true),
  title: t`The mystery operator ${ml`@@`}`,
  prompt: t`Define ${ml`let ( @@ ) f g x = x |> g |> f`}. What is ${ml`(String.length @@ string_of_int) ${100}`}? (This ${ml`@@`} shadows the standard one.)`,
  answer: { kind: 'exact', expected: String(digits(100)) },
  solution: [
    t`${ml`x |> g |> f`} is ${ml`f (g x)`}, so ${ml`f @@ g`} is the composition of ${ml`f`} after ${ml`g`}.`,
    t`${ml`string_of_int ${100}`} is the string ${ml`"${100}"`}, and its length is ${digits(100)}. In general the composite counts the digits of a natural number: ${1}, ${digits(10)}, ${digits(100)} on ${1}, ${10}, ${100}.`,
  ],
  reference: String(digits(100)),
  verify: () => same('digits of 1, 10, 100', [1, 10, 100].map(digits).join(','), '1,2,3'),
  misconceptions: [{ response: '100', why: t`The string is not printed back: ${ml`String.length`} counts its characters.` }, { response: '1', why: t`${ml`string_of_int ${100}`} has three characters, not one.` }],
});

const twiceTypes: ChoiceOption[] = [
  { id: 'int', label: [ml`int`] },
  { id: 'int-int', label: [ml`int -> int`] },
  { id: 'fn', label: [ml`(int -> int) -> int -> int`] },
  { id: 'poly', label: [ml`('a -> 'a) -> 'a -> 'a`] },
];
const twiceNoArgs = auto({
  id: 'cs3110-4-twice',
  source: cite('cs3110-ex4', 'Exercise: twice, no arguments', true),
  title: t`The type of ${ml`quad`}`,
  prompt: t`With ${ml`let double x = ${2} * x`}, ${ml`let twice f x = f (f x)`}, and ${ml`let quad = twice double`}, what is the type of ${ml`quad`}? It is not written as a function of an argument: explain to yourself why it is one.`,
  answer: { kind: 'choice', options: twiceTypes, correct: 'int-int' },
  solution: [
    t`${ml`twice`} has type ${ml`('a -> 'a) -> 'a -> 'a`}: it is curried, so it takes ${ml`f`} and returns a function waiting for ${ml`x`}.`,
    t`Applying it to ${ml`double : int -> int`} fixes ${ml`'a`} as ${ml`int`} and leaves ${ml`int -> int`}. So ${ml`quad`} is a function by partial application, and ${ml`quad ${3}`} is ${2 * (2 * 3)}.`,
  ],
  reference: ['int-int'],
  verify: () => same('quad 3', 2 * (2 * 3), 12),
  misconceptions: [
    { response: ['poly'], why: t`That is the type of ${ml`twice`} itself. Giving it ${ml`double`} fixes ${ml`'a`} as ${ml`int`} and uses up the first argument.` },
    { response: ['int'], why: t`${ml`quad`} has not been given its number yet: it still waits for one, so it is a function.` },
  ],
});

const repeatEx = supervision({
  id: 'cs3110-4-repeat',
  source: cite('cs3110-ex4', 'Exercise: repeat'),
  title: t`Generalise ${ml`twice`} to ${ml`repeat`}`,
  prompt: t`Write ${ml`repeat`} such that ${ml`repeat f n x`} applies ${ml`f`} to ${ml`x`} a total of ${ml`n`} times: ${ml`repeat f ${0} x`} is ${ml`x`}, ${ml`repeat f ${1} x`} is ${ml`f x`}, ${ml`repeat f ${2} x`} is ${ml`f (f x)`}. Give its type and explain why it is a higher-order function.`,
  writeUp: 'explanation',
});
const uncurried = supervision({
  id: 'cs3110-4-uncurried',
  source: cite('cs3110-ex4', 'Exercise: library uncurried'),
  title: t`Uncurried library functions`,
  prompt: t`${ml`let uncurried_nth (lst, n) = List.nth lst n`} is an uncurried ${ml`List.nth`}. In the same way write uncurried versions of ${ml`List.append`}, ${ml`Char.compare`}, and ${ml`Stdlib.max`}, give the type of each, and say what partial application they lose.`,
  writeUp: 'explanation',
});
const focs81 = supervision({
  id: 'focs-8-1',
  source: cite('focs-notes', 'Lecture 8, Exercise 8.1'),
  title: t`What does ${ml`sw`} do?`,
  prompt: t`What does the function ${ml`let sw f x y = f y x`}, of type ${ml`('a -> 'b -> 'c) -> 'b -> 'a -> 'c`}, do, and what are its uses? Give an example with partial application.`,
  writeUp: 'explanation',
});
const focs82 = supervision({
  id: 'focs-8-2',
  source: cite('focs-notes', 'Lecture 8, Exercise 8.2'),
  title: t`Combining two orderings lexicographically`,
  prompt: t`The lexicographic ordering uses two keys: ${math`(x', y') < (x, y) \iff x' < x \lor (x' = x \land y' < y)`}. Write an OCaml function that combines two orderings, each supplied as a function, lexicographically. Explain how it lets the curried ${ml`insort`} of Lecture ${8} sort a list of pairs.`,
  writeUp: 'explanation',
});

// ---------------------------------------------------------------- lesson

const ex = { f: { kind: 'add' as const, c: 3 }, n: 2, x: 10, twice: true };

export const higherOrder: TopicContent = {
  topicId: 'fp.higher-order',
  goal: t`Pass functions as arguments, return them as results, write anonymous functions, and use currying for partial application.`,
  objective: t`Use functions as values: pass them, return them, write them without names, and apply them partially.`,
  why: t`Map, filter, fold, functors, and lazy sequences are all built from functions that take or return functions.`,
  minutes: 30,
  lesson: [
    { kind: 'section', title: t`Functions are values` },
    { kind: 'hook', text: t`In calculus, differentiation takes a function and hands back another function: feed it ${math`x^{${2}}`} and out comes ${math`${2}x`}. Nobody finds that strange. So why should a program not do the same, taking functions in and giving functions out?` },
    { kind: 'narrative', text: t`In OCaml it does. A function is a value like ${3} or ${ml`"hi"`}: you can bind it to a name, pass it to another function, return it, or put it in a list. Here is the simplest example worth having, from the CS${3110} exercises.` },
    { kind: 'rule', text: [mlBlock`
      let twice f x = f (f x)
      let double x = ${2} * x
      let a = twice double ${5}
    `] },
    { kind: 'p', text: t`${ml`twice`} takes a function ${ml`f`} and a value ${ml`x`}, and applies ${ml`f`} two times. So ${ml`twice double ${5}`} is ${ml`double (double ${5})`}, which is ${ml`double ${10}`}, which is ${20}.` },
    { kind: 'definition', name: t`Higher-order function`, formal: t`A [[higher-order-function|higher-order function]] (a functional) is a function that takes a function as an argument or returns a function as its result.`, plain: t`It works on functions the way ordinary functions work on numbers. ${ml`twice`} is one: its first argument ${ml`f`} is a function.` },
    { kind: 'narrative', text: t`Often the function you want to pass is small and used once, such as "add three". Declaring it with a name first would be clutter. So OCaml lets you write a function without a name.` },
    { kind: 'definition', name: t`Anonymous function`, formal: t`The expression ${ml`fun x -> E`} is the function that maps each argument ${math`x`} to the value of the expression ${math`E`}. It is an [[anonymous-function|anonymous function]]: it has no name.`, plain: t`${ml`fun n -> n * ${2}`} is the doubling function, written in place. ${ml`(fun n -> n * ${2}) ${17}`} is ${34}, as in FoCS Lecture ${8}.` },
    checkFrom(repeatValue, ex, t`${ml`twice`} applies the function two times: ${math`${10} \mapsto ${13} \mapsto ${16}`}.`),
    { kind: 'pitfall', claim: t`Two functions that give the same results can be compared with ${ml`=`}, like numbers.`, counterexample: t`${ml`(fun x -> x + ${1}) = (fun x -> x + ${1})`} raises the exception ${ml`Invalid_argument "compare: functional value"`}. Functions are values, but OCaml cannot test them for equality: in general no program can decide whether two functions agree on every input.` },
    { kind: 'section', title: t`Currying` },
    { kind: 'narrative', text: t`Now look again at the type OCaml gives ${ml`twice`}: ${ml`('a -> 'a) -> 'a -> 'a`}. Where are its "two arguments"? The answer is the idea that makes OCaml's functions so flexible.` },
    { kind: 'definition', name: t`Curried function`, formal: t`A function of ${math`n`} arguments is [[currying|curried]] when it takes the first argument and returns a function of the remaining ${math`n - ${1}`}. The declaration ${ml`let f x${1} x${2} = E`} means ${ml`let f = fun x${1} -> fun x${2} -> E`}.`, plain: t`It takes its arguments one at a time. Each time you give it one, you get back a function waiting for the next.` },
    { kind: 'theorem', name: t`Reading curried types and calls`, statement: t`The arrow associates to the right and application associates to the left: ${ml`t${1} -> t${2} -> t${3}`} means ${ml`t${1} -> (t${2} -> t${3})`}, and ${ml`f a b`} means ${ml`(f a) b`}.` },
    {
      kind: 'steps',
      steps: [
        { label: t`Declare it`, text: t`FoCS Lecture ${8} declares ${ml`let fn = fun k -> fun n -> n * ${2} + k`}, of type ${ml`int -> int -> int`}.`, plain: t`Two nested anonymous functions: the outer takes ${ml`k`}, the inner takes ${ml`n`}.` },
        { label: t`Give it one argument`, text: t`${ml`fn ${1}`} replaces ${ml`k`} by ${1} in the body, giving ${ml`fun n -> n * ${2} + ${1}`}, of type ${ml`int -> int`}.`, plain: t`The result is a function, not a number: it is waiting for ${ml`n`}.`, why: { q: t`Why is the type ${ml`int -> int`}?`, a: t`${ml`int -> int -> int`} is ${ml`int -> (int -> int)`}. Supplying the first ${ml`int`} leaves what is in the brackets.` } },
        { label: t`Give it the second`, text: t`${ml`fn ${1} ${3}`} is ${ml`(fn ${1}) ${3}`}, which is ${math`${3} \times ${2} + ${1} = ${7}`}.`, plain: t`Application to the left: first ${ml`fn ${1}`}, then that function applied to ${3}.` },
      ],
    },
    { kind: 'definition', name: t`Partial application`, formal: t`Applying a curried function to fewer arguments than it takes is [[partial-application|partial application]]; the result is a function of the arguments still missing.`, plain: t`${ml`fn ${1}`} is a partial application. So is ${ml`twice double`}: with ${ml`let quad = twice double`}, ${ml`quad`} is a function of type ${ml`int -> int`}, though no argument appears in its declaration.` },
    checkFrom(partialType, { k: 3, m: 1, cs: [4, 2, 7], name: 'f' }, t`Three ${ml`int`} arguments and one given: two remain, so two arrows.`),
    { kind: 'pitfall', claim: t`${ml`square ${2} + ${2}`} is ${ml`square ${4}`}.`, counterexample: t`Application binds tighter than any operator, so it is ${ml`(square ${2}) + ${2}`}, which is ${square(2) + 2}. Write ${ml`square (${2} + ${2})`}, or ${ml`square @@ ${2} + ${2}`}, to get ${square(4)}.` },
    { kind: 'section', title: t`Reading a type` },
    { kind: 'narrative', text: t`A higher-order type can look like a thicket of arrows. Read it from what the function does. FoCS Exercise ${8}.${1} asks about ${ml`let sw f x y = f y x`}. Work out its type one name at a time.` },
    {
      kind: 'steps',
      steps: [
        { label: t`Name the unknowns`, text: t`Let ${ml`y : 'a`} and ${ml`x : 'b`}, since nothing constrains them yet.`, plain: t`${ml`'a`} and ${ml`'b`} are type variables: any types at all.` },
        { label: t`Read the body`, text: t`${ml`f y x`} applies ${ml`f`} to ${ml`y`} then ${ml`x`}, so ${ml`f : 'a -> 'b -> 'c`} for some result type ${ml`'c`}.`, plain: t`${ml`f`} takes an ${ml`'a`} first, then a ${ml`'b`}.` },
        { label: t`Assemble`, text: t`${ml`sw`} takes ${ml`f`}, then ${ml`x : 'b`}, then ${ml`y : 'a`}, and returns ${ml`'c`}.`, eq: [ml`sw : ('a -> 'b -> 'c) -> 'b -> 'a -> 'c`], plain: t`So ${ml`sw f`} is ${ml`f`} with its arguments swapped: ${ml`sw (-) ${2} ${10}`} is ${ml`(-) ${10} ${2}`}, which is ${10 - 2}.` },
      ],
    },
    { kind: 'p', text: t`FoCS uses the same idea for a sorting function that takes its comparison as an argument: ${ml`insort (<=)`} sorts upwards and ${ml`insort (>=)`} downwards. One function, any ordering.` },
    { kind: 'takeaway', text: t`A curried function takes one argument at a time and returns a function for the rest, so partial application makes new functions for free.` },
  ],
  examples: [
    { ...workedCambridge(mystery1), examiner: t`The examiner wants the type of ${ml`( $ )`}, the parse of both expressions, and the point: it is application with low precedence.` },
    worked(partialType, { k: 2, m: 1, cs: [3, 5, 6], name: 'add' }, t`Partial application of a two-argument function`),
    worked(precedence, { form: 'pipe', f: 'square', a: 3, b: 4 }, t`A pipeline hands over the whole sum`),
  ],
  generators: [repeatValue, partialType, precedence],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['higher-order-function', 'anonymous-function', 'currying', 'partial-application'],
  cambridge: [mystery2, twiceNoArgs, repeatEx, uncurried, focs81, focs82],
  gate: ['focs-8-2', 'focs-8-1'],
  recall: [
    { front: t`What is a higher-order function?`, back: t`A function that takes a function as an argument or returns one as its result.` },
    { front: t`What does ${ml`let f x y = E`} abbreviate?`, back: t`${ml`let f = fun x -> fun y -> E`}: a curried function, taking one argument at a time.` },
    { front: t`How do arrows and application associate?`, back: t`Arrows to the right (${ml`a -> b -> c`} is ${ml`a -> (b -> c)`}); application to the left (${ml`f a b`} is ${ml`(f a) b`}).` },
    { front: t`What is partial application?`, back: t`Applying a curried function to fewer arguments than it takes; the result is a function of the rest.` },
  ],
  proofOrder: [{
    title: t`The type of ${ml`sw`}`,
    steps: [
      t`Give the unknown arguments type variables: ${ml`y : 'a`} and ${ml`x : 'b`}.`,
      t`The body ${ml`f y x`} forces ${ml`f : 'a -> 'b -> 'c`}.`,
      t`The arguments come in the order ${ml`f`}, ${ml`x`}, ${ml`y`}.`,
      t`So ${ml`sw : ('a -> 'b -> 'c) -> 'b -> 'a -> 'c`}.`,
    ],
  }],
};
