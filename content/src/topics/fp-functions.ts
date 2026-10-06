/**
 * fp.functions: Defining and applying functions. The lesson follows CS3110 Section 2.4
 * (function definitions, anonymous functions, application, the substitution model, function
 * types, multiple arguments) and FoCS Lecture 1 (declaring functions, npower and power, type
 * constraints). The problems are the CS3110 Chapter 2 exercises "associativity", "RMS", and
 * "average", and FoCS Exercise 1.4.
 *
 * Every OCaml answer was run in the OCaml 4.11.1 toplevel (scratch file ocamlE/t2.ml, t4.ml):
 *   add 5 1 : int = 6; add 5 : int -> int; (add 5) 1 : int = 6; add (5 1): type error
 *   rms 3. 4. = 3.53553390593273775
 *   1.0 +/. 2.0 = 1.5; 1.0 +/. 2.0 +/. 4.0 = 2.75 (infix operators starting with + group to the left)
 *   square 3 + 1 = 10; f -3 with f : int -> int is a type error; f (-3) = -6
 */
import { auto, cite, same, supervision } from '../cambridge';
import { code, codeBlock } from '../ocaml-code';
import { int } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { dmath, math, t, type Rich } from '../rich';
import { checkFrom, workedCambridge, worked, type TopicContent } from '../topic';

// ---------------------------------------------------------------- application binds tightest

interface ApplyP { form: number; a: number; b: number; c: number; d: number }

const applyPrec = generator<ApplyP>({
  id: 'apply-precedence',
  quick: true,
  skill: 'Evaluate an application of a defined function: the argument is evaluated, substituted for the parameter, and application binds tighter than any operator.',
  params: (rng) => ({ form: int(rng, 0, 2), a: int(rng, 2, 6), b: int(rng, 1, 9), c: int(rng, 1, 9), d: int(rng, 1, 9) }),
  sane: ({ form, a, b, c, d }) => (form >= 0 && form <= 2 && a >= 2 && b >= 1 && c >= 1 && d >= 1 ? null : 'out of range'),
  problem: ({ form, a, b, c, d }) => {
    const f = (x: number): number => a * x + b;
    const def = code`let f x = ${a} * x + ${b}`;
    const expr = [code`f ${c} + ${d}`, code`f (${c} + ${d})`, code`f (f ${c})`][form] as Rich[number];
    const ans = [f(c) + d, f(c + d), f(f(c))][form] as number;
    const steps: Rich[] = [
      [
        t`Application binds tighter than ${code`+`}, so ${code`f ${c} + ${d}`} means ${code`(f ${c}) + ${d}`}. Substitute ${c} for ${code`x`} in the body: ${code`f ${c}`} is ${math`${a} \times ${c} + ${b} = ${f(c)}`}.`,
        t`Then add ${d}: ${math`${f(c)} + ${d} = ${ans}`}.`,
      ],
      [
        t`The brackets make the argument ${code`${c} + ${d}`}, which OCaml evaluates first, to ${c + d}.`,
        t`Substitute ${c + d} for ${code`x`}: ${math`${a} \times ${c + d} + ${b} = ${ans}`}.`,
      ],
      [
        t`Evaluate the inner application first, since it is the argument: ${code`f ${c}`} is ${math`${a} \times ${c} + ${b} = ${f(c)}`}.`,
        t`Then ${code`f ${f(c)}`} is ${math`${a} \times ${f(c)} + ${b} = ${ans}`}.`,
      ],
    ][form] as Rich[];
    return {
      prompt: t`After ${def}, what is the value of ${expr}?`,
      answer: { kind: 'exact', expected: String(ans) },
      solution: steps,
    };
  },
  solve: ({ form, a, b, c, d }) => {
    // Substitution model: evaluate the argument, then the body with x bound to it.
    const body = (x: number): number => a * x + b;
    const apply = (arg: () => number): number => body(arg());
    return String([apply(() => c) + d, apply(() => c + d), apply(() => apply(() => c))][form]);
  },
  misconceptions: ({ form, a, b, c, d }): Misconception[] => {
    const f = (x: number): number => a * x + b;
    switch (form) {
      case 0: return [
        { response: String(f(c + d)), why: t`Application binds tighter than ${code`+`}: ${code`f ${c} + ${d}`} is ${code`(f ${c}) + ${d}`}, not ${code`f (${c} + ${d})`}.` },
        { response: String(f(c)), why: t`That is ${code`f ${c}`} alone; the ${code`+ ${d}`} is still to be added.` },
      ];
      case 1: return [
        { response: String(f(c) + d), why: t`The brackets make ${code`${c} + ${d}`} the argument: it is added first, then passed to ${code`f`}.` },
        { response: String(f(c)), why: t`The argument is the whole bracket, ${c + d}, not just ${c}.` },
      ];
      default: return [
        { response: String(f(c)), why: t`That is the inner ${code`f ${c}`}; its result is then passed to ${code`f`} again.` },
        { response: String(a * a * c + b), why: t`The inner result is ${code`f ${c}`}, which is ${f(c)}, including its ${code`+ ${b}`}. Substitute all of it: ${math`${a} \times ${f(c)} + ${b}`}.` },
      ];
    }
  },
});

// ---------------------------------------------------------------- partial application

const ARROWS = ['int', 'int -> int', 'int -> int -> int', 'int -> int -> int -> int'] as const;
const PARTIAL_OPTIONS: readonly ChoiceOption[] = [
  ...ARROWS.map((s, i) => ({ id: `t${i}`, label: [code`${s}`] })),
  { id: 'error', label: t`a type error` },
];

interface PartialP { k: number; a: number; b: number; c: number }

const partial = generator<PartialP>({
  id: 'partial-type',
  quick: true,
  skill: 'Give the type of a function of three arguments applied to fewer arguments, or see that a misplaced bracket makes a type error.',
  params: (rng) => ({ k: int(rng, 0, 4), a: int(rng, 1, 20), b: int(rng, 1, 20), c: int(rng, 1, 20) }),
  sane: ({ k }) => (k >= 0 && k <= 4 ? null : 'out of range'),
  problem: ({ k, a, b, c }) => {
    const expr = [code`add${3}`, code`add${3} ${a}`, code`add${3} ${a} ${b}`, code`add${3} ${a} ${b} ${c}`, code`add${3} (${a} ${b})`][k] as Rich[number];
    const answer = k === 4 ? 'error' : `t${3 - k}`;
    return {
      prompt: t`After ${code`let add${3} x y z = x + y + z`}, which has type ${code`int -> int -> int -> int`}, what is the type of ${expr}?`,
      answer: { kind: 'choice', options: PARTIAL_OPTIONS, correct: answer },
      solution: k === 4
        ? [t`${code`(${a} ${b})`} applies ${a} to ${b} as if ${a} were a function. ${a} is an ${code`int`}, not a function, so OCaml reports a type error before anything runs.`]
        : [
          t`The type ${code`int -> int -> int -> int`} means ${code`int -> (int -> (int -> int))`}: give one int, get back a function waiting for the rest.`,
          t`Here ${k === 0 ? t`no argument is given, so the type is the whole type` : t`${k} ${k === 1 ? 'argument is' : 'arguments are'} given, so ${k} of the three ${code`int ->`} are used up`}, leaving ${code`${ARROWS[3 - k] as string}`}.`,
        ],
    };
  },
  solve: ({ k }) => {
    // Peel one argument type off the arrow type per argument given; an int in function position is an error.
    if (k === 4) return ['error'];
    let ty = ['int', 'int', 'int', 'int'];
    for (let i = 0; i < k; i++) ty = ty.slice(1);
    return [`t${ARROWS.indexOf(ty.join(' -> ') as (typeof ARROWS)[number])}`];
  },
  misconceptions: ({ k, a, b }): Misconception[] => {
    if (k === 4) return [
      { response: ['t1'], why: t`${code`(${a} ${b})`} is not two arguments: the brackets make it one expression, applying a number to a number, which is a type error.` },
      { response: ['t0'], why: t`OCaml rejects the expression before it runs: ${code`(${a} ${b})`} uses a number as a function.` },
    ];
    const out: Misconception[] = [];
    if (k < 3) out.push({ response: ['t0'], why: t`A function given fewer arguments than it takes is not an error and does not run: it is a function waiting for the rest.` });
    if (k > 0) out.push({ response: [`t${4 - k}`], why: t`Each argument given removes one ${code`int ->`} from the front of the type.` });
    if (k < 2) out.push({ response: ['error'], why: t`Giving fewer arguments than the function takes is allowed in OCaml: the result is a function.` });
    if (k === 3) out.push({ response: ['t3'], why: t`With all three arguments given, the function is applied in full and gives an ${code`int`}.` });
    return out;
  },
});

// ---------------------------------------------------------------- two arguments, in order

interface TwoP { c: number; a: number; b: number }

const twoArgs = generator<TwoP>({
  id: 'two-args',
  quick: true,
  skill: 'Apply a function of two arguments: arguments are matched to parameters in order, and the body is evaluated with the usual precedence.',
  params: (rng) => {
    for (;;) {
      const [c, a, b] = [int(rng, 2, 5), int(rng, 10, 60), int(rng, 2, 9)];
      if (a !== b) return { c, a, b };
    }
  },
  sane: ({ c, a, b }) => (c >= 2 && b >= 2 && a !== b ? null : 'out of range'),
  problem: ({ c, a, b }) => ({
    prompt: t`After ${code`let g x y = x - ${c} * y`}, what is ${code`g ${a} ${b}`}?`,
    answer: { kind: 'exact', expected: String(a - c * b) },
    solution: [
      t`The arguments go to the parameters in order: ${code`x`} is ${a} and ${code`y`} is ${b}.`,
      t`In the body, ${code`*`} comes before ${code`-`}: ${math`${a} - ${c} \times ${b} = ${a} - ${c * b} = ${a - c * b}`}.`,
    ],
  }),
  solve: ({ c, a, b }) => {
    const g = (x: number) => (y: number) => x - c * y;
    return String(g(a)(b));
  },
  misconceptions: ({ c, a, b }) => [
    { response: String(b - c * a), why: t`${code`x`} is the first argument, ${a}, and ${code`y`} the second, ${b}.` },
    { response: String((a - c) * b), why: t`Multiplication comes before subtraction: the body is ${code`x - (${c} * y)`}.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const ASSOC_OPTIONS: readonly ChoiceOption[] = [
  { id: 'a', label: [code`add ${5} ${1}`] },
  { id: 'b', label: [code`add ${5}`] },
  { id: 'c', label: [code`(add ${5}) ${1}`] },
  { id: 'd', label: [code`add (${5} ${1})`] },
];
const associativity = auto({
  id: 'cs3110-ex2-associativity',
  source: cite('cs3110-ex2', 'Exercise "associativity"'),
  title: t`Which applications give an integer`,
  prompt: t`Suppose ${code`let add x y = x + y`}. Of the four expressions below, which produce an integer? (Of the others, one produces a function and one is an error.) Choose all that apply.`,
  answer: { kind: 'choice', options: ASSOC_OPTIONS, correct: ['a', 'c'] },
  solution: [
    t`${code`add`} has type ${code`int -> int -> int`}, that is ${code`int -> (int -> int)`}. Application groups to the left, so ${code`add ${5} ${1}`} means ${code`(add ${5}) ${1}`}.`,
    t`${code`add ${5}`} is ${code`add`} applied to one argument: a function of type ${code`int -> int`}, which adds ${5} to its input.`,
    t`${code`(add ${5}) ${1}`} applies that function to ${1}: the integer ${6}. It is the same expression as ${code`add ${5} ${1}`}, with the brackets written out.`,
    t`${code`add (${5} ${1})`} first evaluates ${code`${5} ${1}`}, which applies the integer ${5} as if it were a function: OCaml reports a type error.`,
    t`So the integers are ${code`add ${5} ${1}`} and ${code`(add ${5}) ${1}`}; ${code`add ${5}`} is a function; ${code`add (${5} ${1})`} is an error.`,
  ],
  reference: ['a', 'c'],
  // OCaml 4.11.1: add 5 1 : int = 6; add 5 : int -> int; (add 5) 1 : int = 6; add (5 1): Error, this expression has type int, it is not a function.
  verify: () => {
    const add = (x: number) => (y: number) => x + y;
    return same('add 5 1 and (add 5) 1', `${add(5)(1)} ${typeof add(5)}`, '6 function');
  },
  misconceptions: [
    { response: ['a'], why: t`${code`(add ${5}) ${1}`} is the very same expression as ${code`add ${5} ${1}`}: application groups to the left.` },
    { response: ['a', 'c', 'd'], why: t`${code`(${5} ${1})`} applies the number ${5} to ${1}; a number is not a function, so this is a type error.` },
    { response: ['a', 'b', 'c'], why: t`${code`add ${5}`} is a function of type ${code`int -> int`}, still waiting for its second argument.` },
  ],
});

const RMS_X = 3;
const RMS_Y = 4;
const RMS = Math.sqrt((RMS_X * RMS_X + RMS_Y * RMS_Y) / 2);
const rms = auto({
  id: 'cs3110-ex2-rms',
  source: cite('cs3110-ex2', 'Exercise "RMS"', true),
  title: t`Root mean square`,
  prompt: t`Define a function ${code`rms`} that computes the root mean square of two floats, ${math`\sqrt{(x^{${2}} + y^{${2}}) / ${2}}`}. What does ${code`rms ${RMS_X}. ${RMS_Y}.`} evaluate to? Give ${3} decimal places.`,
  answer: { kind: 'numeric', expected: RMS, relTol: 0, absTol: 0.0006 },
  solution: [
    t`With float operators throughout: ${codeBlock(code`let rms x y = sqrt ((x *. x +. y *. y) /. ${2}.)`)}`,
    t`Then ${code`rms ${RMS_X}. ${RMS_Y}.`} is ${math`\sqrt{(${RMS_X * RMS_X} + ${RMS_Y * RMS_Y}) / ${2}} = \sqrt{${(RMS_X ** 2 + RMS_Y ** 2) / 2}} \approx ${Number(RMS.toFixed(3))}`}.`,
    t`The type is ${code`float -> float -> float`}. Writing ${code`*`} or ${code`/`} instead of the dotted operators would be a type error, because the arguments are floats.`,
  ],
  reference: RMS.toFixed(3),
  // OCaml 4.11.1: rms 3. 4. = 3.53553390593273775.
  verify: () => same('rms 3. 4.', RMS.toFixed(6), '3.535534'),
  misconceptions: [
    { response: String((RMS_X + RMS_Y) / 2), why: t`That is the ordinary mean. The root mean square squares first, averages, then takes the square root.` },
    { response: String((RMS_X ** 2 + RMS_Y ** 2) / 2), why: t`That is the mean of the squares; the square root is still to be taken.` },
  ],
});

const AVG = [1, 2, 4] as const;
const avgLeft = ((AVG[0] + AVG[1]) / 2 + AVG[2]) / 2;
const average = auto({
  id: 'cs3110-ex2-average',
  source: cite('cs3110-ex2', 'Exercise "average"', true),
  title: t`An infix operator`,
  prompt: t`The exercise defines an infix operator for the average of two floats: ${codeBlock(code`let ( +/. ) x y = (x +. y) /. ${2}.`)} so that ${code`${1}.${0} +/. ${2}.${0}`} is ${math`${1.5}`}. An operator that begins with ${code`+`} groups to the left, like ${code`+`} itself. What is ${code`${AVG[0]}.${0} +/. ${AVG[1]}.${0} +/. ${AVG[2]}.${0}`}?`,
  answer: { kind: 'numeric', expected: avgLeft, relTol: 0, absTol: 1e-9 },
  solution: [
    t`Grouping to the left, the expression is ${code`(${AVG[0]}.${0} +/. ${AVG[1]}.${0}) +/. ${AVG[2]}.${0}`}.`,
    t`The inner average is ${math`\frac{${AVG[0]} + ${AVG[1]}}{${2}} = ${(AVG[0] + AVG[1]) / 2}`}; then ${math`\frac{${(AVG[0] + AVG[1]) / 2} + ${AVG[2]}}{${2}} = ${avgLeft}`}.`,
    t`It is not the average of all three, ${math`\frac{${AVG[0] + AVG[1] + AVG[2]}}{${3}}`}: ${code`+/.`} only ever averages two things, so the last number counts for half.`,
  ],
  reference: String(avgLeft),
  // OCaml 4.11.1: 1.0 +/. 2.0 +/. 4.0 = 2.75.
  verify: () => same('left grouping', avgLeft, 2.75),
  misconceptions: [
    { response: String((AVG[0] + (AVG[1] + AVG[2]) / 2) / 2), why: t`That groups to the right. Operators beginning with ${code`+`} group to the left: the first two are averaged first.` },
    { response: `${AVG[0] + AVG[1] + AVG[2]}/3`, why: t`${code`+/.`} averages two numbers at a time; it is not the mean of all three.` },
  ],
});

const focs14 = supervision({
  id: 'focs-1-4',
  source: cite('focs-notes', 'Lecture 1, Exercise 1.4'),
  title: t`How OCaml knows power returns a float`,
  prompt: t`Functions ${code`npower`} and ${code`power`} both return a float. The definition of ${code`npower`} returns the float ${code`${1}.${0}`} in its base case. The definition of ${code`power`} (${code`if n = ${1} then x else if even n then power (x *. x) (n / ${2}) else x *. power (x *. x) (n / ${2})`}) does not, so how does the OCaml type checker know that ${code`power`} returns a float?`,
  writeUp: 'explanation',
});

// ---------------------------------------------------------------- lesson

const SQ = 3;

export const fpFunctions: TopicContent = {
  topicId: 'fp.functions',
  goal: t`Define functions with ${code`let`} and ${code`fun`}, apply them to arguments, and read a function of several arguments as one that returns a function.`,
  objective: t`Define and apply OCaml functions, and read their types, including those of several arguments.`,
  why: t`Functions are OCaml's building blocks; every recursion, list function, and proof later is about one.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`A puzzle about brackets` },
    { kind: 'hook', text: t`Define ${code`let square x = x * x`}. Then ${code`square ${SQ} + ${1}`} is ${SQ * SQ + 1}, not ${(SQ + 1) ** 2}. And if you define ${code`let f x = ${2} * x`}, then ${code`f -${3}`} is not ${-6} but a type error. Both surprises come from one rule about how OCaml reads a function next to its argument.` },
    { kind: 'narrative', text: t`In OCaml you apply a function just by writing it in front of its argument, with a space: ${code`square ${SQ}`}, no brackets needed. That is light to write, but it means you must know how tightly that invisible operation, "apply", holds on to its neighbours.` },
    {
      kind: 'definition',
      name: t`Function definition and type`,
      formal: t`The declaration ${code`let f x = e`} binds the name ${code`f`} to the [[ocaml-function|function]] ${code`fun x -> e`}, whose parameter is ${code`x`} and whose body is ${code`e`}. If, when ${code`x`} has type ${math`\tau_{${1}}`}, the body has type ${math`\tau_{${2}}`}, the function has the [[function-type|function type]] ${math`\tau_{${1}} \to \tau_{${2}}`}, written ${code`t -> u`} in OCaml.`,
      plain: t`A function is a value like any other, with a type that says what goes in and what comes out. ${code`let square x = x * x`} gives ${code`square`} the type ${code`int -> int`}: it takes an int and gives an int.`,
    },
    {
      kind: 'definition',
      name: t`Application`,
      formal: t`If ${math`f : \tau_{${1}} \to \tau_{${2}}`} and ${math`a : \tau_{${1}}`}, the [[function-application|application]] ${code`f a`} has type ${math`\tau_{${2}}`}. To evaluate it, evaluate ${code`f`} to ${code`fun x -> e`} and ${code`a`} to a value ${math`v`}; then evaluate ${code`e`} with ${math`v`} substituted for ${code`x`}. Application binds more tightly than every operator, and groups to the left: ${code`f a b`} is ${code`(f a) b`}.`,
      plain: t`Work out the argument, plug it into the body, and evaluate. Because application binds tightest, ${code`square ${SQ} + ${1}`} is ${code`(square ${SQ}) + ${1}`}, which is ${SQ * SQ + 1}.`,
    },
    {
      kind: 'steps',
      steps: [
        { label: t`Evaluate the argument`, text: t`To evaluate ${code`square (${SQ} + ${1})`}, first evaluate the argument ${code`${SQ} + ${1}`}.`, eq: [dmath`${SQ} + ${1} = ${SQ + 1}`] },
        { label: t`Substitute`, text: t`Put ${SQ + 1} in place of ${code`x`} in the body ${code`x * x`}.`, eq: [code`${SQ + 1} * ${SQ + 1}`], plain: t`This is the substitution model: the body with the parameter replaced by the value.` },
        { label: t`Evaluate the body`, text: t`Multiply.`, eq: [dmath`${SQ + 1} \times ${SQ + 1} = ${(SQ + 1) ** 2}`] },
      ],
    },
    checkFrom(applyPrec, { form: 0, a: 3, b: 2, c: 4, d: 5 }, t`${code`f ${4} + ${5}`} is ${code`(f ${4}) + ${5}`}: ${math`${3} \times ${4} + ${2} = ${14}`}, then add ${5} to get ${19}.`),
    { kind: 'section', title: t`Functions of several arguments` },
    { kind: 'narrative', text: t`Now define ${code`let add x y = x + y`}. The toplevel says ${code`val add : int -> int -> int`}. You might read that as "takes two ints, gives an int". That is right in spirit, but OCaml means something sharper: ${code`add`} takes one int and gives back a function, which takes the second int.` },
    {
      kind: 'definition',
      name: t`Functions of several arguments`,
      formal: t`${code`let f x y = e`} abbreviates ${code`let f = fun x -> (fun y -> e)`}. The arrow groups to the right, so ${code`int -> int -> int`} means ${code`int -> (int -> int)`}; application groups to the left, so ${code`f a b`} means ${code`(f a) b`}.`,
      plain: t`Give ${code`add`} one argument and you get a function that is still waiting for the other: ${code`add ${5}`} has type ${code`int -> int`}, and ${code`(add ${5}) ${1}`} is ${6}.`,
    },
    {
      kind: 'p',
      text: t`The two grouping rules are made to fit each other: the arrow to the right, application to the left. Each argument you supply strips one arrow from the front of the type.`,
      why: { q: t`Why do the two rules have to go opposite ways?`, a: t`Because ${code`f a b`} must mean ${code`(f a) b`}: first ${code`f a`}, a function of type ${code`int -> int`}, then that applied to ${code`b`}. For ${code`f a`} to have type ${code`int -> int`}, ${code`f`} must have type ${code`int -> (int -> int)`}, which is the arrow grouped to the right.` },
    },
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`${code`f -${3}`} applies ${code`f`} to minus three.`, counterexample: t`OCaml reads ${code`f -${3}`} as ${code`f - ${3}`}, subtracting ${3} from a function: a type error. Write ${code`f (-${3})`}, which for ${code`let f x = ${2} * x`} is ${-6}.` },
    { kind: 'pitfall', claim: t`Brackets around an argument pair are harmless, as in mathematics: ${code`add (${5} ${1})`} is ${code`add ${5} ${1}`}.`, counterexample: t`${code`(${5} ${1})`} applies ${5} to ${1}, and ${5} is not a function: a type error. In OCaml, brackets group a single expression; arguments are separated by spaces.` },
    checkFrom(partial, { k: 1, a: 4, b: 7, c: 2 }, t`One argument given removes one ${code`int ->`}: ${code`add${3} ${4}`} is a function waiting for two more ints.`),
    { kind: 'takeaway', text: t`Apply by writing ${code`f a`}: the argument is evaluated and substituted into the body; application binds tightest and groups left, the arrow groups right, so a function of two arguments is a function returning a function.` },
  ],
  examples: [
    workedCambridge(associativity),
    worked(applyPrec, { form: 2, a: 2, b: 3, c: 4, d: 1 }, t`A function applied to its own result`),
    worked(twoArgs, { c: 3, a: 20, b: 4 }, t`Arguments in order`),
  ],
  generators: [applyPrec, partial, twoArgs],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['ocaml-function', 'function-type', 'function-application'],
  cambridge: [rms, average, focs14],
  gate: ['focs-1-4', 'cs3110-ex2-average'],
  recall: [
    { front: t`What does ${code`let f x y = e`} abbreviate?`, back: t`${code`let f = fun x -> (fun y -> e)`}: a function that returns a function.` },
    { front: t`How do ${code`->`} and application group?`, back: t`The arrow groups to the right, ${code`a -> b -> c`} is ${code`a -> (b -> c)`}; application groups to the left, ${code`f x y`} is ${code`(f x) y`}.` },
    { front: t`How is ${code`f e`} evaluated?`, back: t`Evaluate ${code`e`} to a value, substitute it for the parameter in the body of ${code`f`}, and evaluate the body.` },
  ],
};
