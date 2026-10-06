/**
 * fp.expressions: OCaml expressions, values, and types. The lesson follows CS3110 Section
 * 2.3 (expressions, values, types, the operators for int and float, if expressions,
 * structural and physical equality) and FoCS Lecture 1 (integer and floating-point
 * arithmetic, decisions and booleans). The problems are the CS3110 Chapter 2 exercises
 * "values" and "equality", and FoCS Exercises 1.3, 1.5, and 1.6.
 *
 * Every OCaml answer was run in the OCaml 4.11.1 toplevel (scratch file ocamlE/t1.ml):
 *   7 * (1 + 2 + 3)                 => - : int = 42
 *   "CS " ^ string_of_int 3110      => - : string = "CS 3110"
 *   "hi" = "hi", "hi" == "hi"       => true, false
 *   mul 0.1 10000 -. 1000.0         => 1.5882051229709759e-10  (JavaScript doubles agree)
 *   gamma 50                        => -0.61812184348574739    (JavaScript doubles agree)
 */
import { auto, cite, same, supervision } from '../cambridge';
import { code, codeBlock, oc } from '../ocaml-code';
import { int, pick } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { dmath, math, t, type Rich } from '../rich';
import { checkFrom, quickCheck, workedCambridge, worked, type TopicContent } from '../topic';

// ---------------------------------------------------------------- a small OCaml: syntax, types, values

type Ty = 'int' | 'float' | 'bool' | 'string';
type Op = '+' | '-' | '*' | '/' | 'mod' | '+.' | '-.' | '*.' | '/.' | '^' | '<' | '>' | '=';
type E =
  | { k: 'int'; v: number }
  | { k: 'float'; v: number }
  | { k: 'str'; s: string }
  | { k: 'bin'; op: Op; l: E; r: E }
  | { k: 'if'; c: E; t: E; e: E }
  | { k: 'app'; f: 'string_of_int' | 'float_of_int'; a: E };

const I = (v: number): E => ({ k: 'int', v });
const Fl = (v: number): E => ({ k: 'float', v });
const S = (s: string): E => ({ k: 'str', s });
const B = (op: Op, l: E, r: E): E => ({ k: 'bin', op, l, r });
const If = (c: E, th: E, e: E): E => ({ k: 'if', c, t: th, e });
const App = (f: 'string_of_int' | 'float_of_int', a: E): E => ({ k: 'app', f, a });

/** OCaml source for an expression; compound subexpressions in brackets. */
function render(e: E): string {
  const sub = (x: E): string => (x.k === 'bin' || x.k === 'if' || x.k === 'app' || (x.k === 'int' && x.v < 0) ? `(${render(x)})` : render(x));
  switch (e.k) {
    case 'int': return String(e.v);
    case 'float': return Number.isInteger(e.v) ? `${e.v}.` : String(e.v);
    case 'str': return JSON.stringify(e.s);
    case 'bin': return `${sub(e.l)} ${e.op} ${sub(e.r)}`;
    case 'if': return `if ${render(e.c)} then ${render(e.t)} else ${render(e.e)}`;
    case 'app': return `${e.f} ${sub(e.a)}`;
  }
}

/** The type OCaml gives an expression, or null for a type error: the typing rules of CS3110 Section 2.3. */
function typeOf(e: E): Ty | null {
  switch (e.k) {
    case 'int': return 'int';
    case 'float': return 'float';
    case 'str': return 'string';
    case 'app': return typeOf(e.a) === 'int' ? (e.f === 'string_of_int' ? 'string' : 'float') : null;
    case 'if': {
      const [c, a, b] = [typeOf(e.c), typeOf(e.t), typeOf(e.e)];
      return c === 'bool' && a !== null && a === b ? a : null;
    }
    case 'bin': {
      const [l, r] = [typeOf(e.l), typeOf(e.r)];
      if (l === null || r === null) return null;
      if (['+', '-', '*', '/', 'mod'].includes(e.op)) return l === 'int' && r === 'int' ? 'int' : null;
      if (['+.', '-.', '*.', '/.'].includes(e.op)) return l === 'float' && r === 'float' ? 'float' : null;
      if (e.op === '^') return l === 'string' && r === 'string' ? 'string' : null;
      return l === r ? 'bool' : null;
    }
  }
}

// ---------------------------------------------------------------- integer arithmetic

/** OCaml's integer division and remainder: the quotient is truncated towards zero, and the remainder takes the sign of the dividend. */
const odiv = (a: number, b: number): number => Math.trunc(a / b);
const omod = (a: number, b: number): number => a - b * odiv(a, b);

interface ArithP { form: number; a: number; b: number }

const FORMS = 5;
const arithText = ({ form, a, b }: ArithP): Rich => {
  switch (form) {
    case 0: return [code`${a} / ${b}`];
    case 1: return [code`-${a} / ${b}`];
    case 2: return [code`${a} mod ${b}`];
    case 3: return [code`-${a} mod ${b}`];
    default: return [code`${a} / ${b} * ${b} + ${a} mod ${b}`];
  }
};

const intArith = generator<ArithP>({
  id: 'int-arith',
  quick: true,
  skill: 'Evaluate integer division and remainder in OCaml: / truncates towards zero, and mod takes the sign of the dividend.',
  params: (rng) => {
    for (;;) {
      const form = int(rng, 0, FORMS - 1);
      const b = int(rng, 2, 9);
      const a = int(rng, b + 1, 60);
      const r = a % b;
      // A remainder that is not zero, and not half of b, so every slip gives a different answer.
      const qq = Math.floor(a / b);
      if (r !== 0 && 2 * r !== b && qq !== r && qq !== b - r) return { form, a, b };
    }
  },
  sane: ({ form, a, b }) => {
    const [qq, r] = [Math.floor(a / b), a % b];
    return form >= 0 && form < FORMS && b >= 2 && a > b && r !== 0 && 2 * r !== b && qq !== r && qq !== b - r ? null : 'out of range';
  },
  problem: (p) => {
    const { form, a, b } = p;
    const [qq, r] = [Math.floor(a / b), a % b];
    const lines: Rich[] = [
      t`Here ${math`${a} = ${qq} \times ${b} + ${r}`}: ${a} divided by ${b} is ${qq} remainder ${r}.`,
      t`OCaml's ${code`/`} on two ints truncates the exact quotient towards zero, and ${code`a mod b`} is the remainder that goes with it, ${code`a - b * (a / b)`}.`,
    ];
    const answer = [qq, -qq, r, -r, a][form] as number;
    const tail = [
      t`So ${code`${a} / ${b}`} is ${qq}: the fractional part of ${math`${a} / ${b}`} is dropped, not rounded.`,
      t`OCaml reads ${code`-${a} / ${b}`} as ${code`(-${a}) / ${b}`}. The exact quotient is ${math`-${a} / ${b}`}, between ${-qq - 1} and ${-qq}; truncating towards zero gives ${-qq}.`,
      t`So ${code`${a} mod ${b}`} is ${r}, the remainder.`,
      t`${code`(-${a}) / ${b}`} is ${-qq}, and ${math`-${a} - ${b} \times (${-qq}) = ${-r}`}. The remainder has the sign of the number divided, so the answer is ${-r}, not ${b - r}.`,
      t`${code`${a} / ${b}`} is ${qq} and ${code`${a} mod ${b}`} is ${r}, so the whole is ${math`${qq} \times ${b} + ${r} = ${a}`}. This is always ${code`a`} back again: that is what makes the pair of operators fit together.`,
    ][form] as Rich;
    return {
      prompt: t`What value does OCaml give for ${arithText(p)}?`,
      answer: { kind: 'exact', expected: String(answer) },
      solution: [...lines, tail],
    };
  },
  solve: ({ form, a, b }) => String([odiv(a, b), odiv(-a, b), omod(a, b), omod(-a, b), odiv(a, b) * b + omod(a, b)][form]),
  misconceptions: ({ form, a, b }): Misconception[] => {
    const [qq, r] = [Math.floor(a / b), a % b];
    const exact = t`OCaml's ${code`/`} on ints does not give a fraction: it drops the fractional part.`;
    switch (form) {
      case 0: return [
        { response: `${a}/${b}`, why: exact },
        { response: String(qq + 1), why: t`That rounds to the nearest whole number. Integer division truncates: it keeps ${qq} and drops the rest.` },
      ];
      case 1: return [
        { response: String(-qq - 1), why: t`That rounds down, towards minus infinity. OCaml truncates towards zero, so the answer is ${-qq}.` },
        { response: `-${a}/${b}`, why: exact },
      ];
      case 2: return [
        { response: String(qq), why: t`That is the quotient, ${code`${a} / ${b}`}. ${code`mod`} gives the remainder.` },
        { response: String(b - r), why: t`That is how far ${a} is below the next multiple of ${b}. The remainder is how far it is above the multiple below: ${r}.` },
      ];
      case 3: return [
        { response: String(r), why: t`The remainder in OCaml has the sign of the number being divided, here ${-a}, so it is ${-r}.` },
        { response: String(b - r), why: t`That is the remainder in mathematics, always from ${0} to ${b - 1}. OCaml's ${code`mod`} follows truncating division instead, and gives ${-r}.` },
      ];
      default: return [
        { response: String(qq * b), why: t`You dropped the ${code`+ ${a} mod ${b}`}: it adds back the remainder ${r}.` },
        { response: String(a + r), why: t`${code`${a} / ${b}`} is the whole number ${qq}, not the fraction ${math`\frac{${a}}{${b}}`}, so ${code`${a} / ${b} * ${b}`} is ${qq * b}, not ${a}.` },
      ];
    }
  },
});

// ---------------------------------------------------------------- types

const TY_OPTIONS: readonly ChoiceOption[] = [
  { id: 'int', label: [code`int`] },
  { id: 'float', label: [code`float`] },
  { id: 'bool', label: [code`bool`] },
  { id: 'string', label: [code`string`] },
  { id: 'error', label: t`It is a type error: OCaml rejects it.` },
];

interface TypeItem { e: (a: number, b: number) => E; answer: Ty | 'error'; why: Rich; wrong: readonly [Ty | 'error', Rich][] }

const TYPE_ITEMS: readonly TypeItem[] = [
  {
    e: (a, b) => B('+', I(a), I(b)), answer: 'int', why: t`${code`+`} takes two ints and gives an int.`,
    wrong: [['float', t`Nothing here has a decimal point, and ${code`+`} is the operator for ints.`], ['error', t`Both sides are ints, which is exactly what ${code`+`} needs.`]],
  },
  {
    e: (a, b) => B('+.', Fl(a), Fl(b)), answer: 'float', why: t`${code`+.`} takes two floats and gives a float; a number with a decimal point is a float.`,
    wrong: [['int', t`The dot makes each number a float, and ${code`+.`} gives a float.`], ['error', t`Both sides are floats, which is what ${code`+.`} needs.`]],
  },
  {
    e: (a, b) => B('+', I(a), Fl(b)), answer: 'error', why: t`${code`+`} needs two ints, and the right side is a float. OCaml never converts between them on its own.`,
    wrong: [['float', t`OCaml does not convert the int to a float for you. Mixing them is a type error.`], ['int', t`The right side has a decimal point, so it is a float, and ${code`+`} only takes ints.`]],
  },
  {
    e: (a, b) => B('+', Fl(a), Fl(b)), answer: 'error', why: t`${code`+`} is only for ints; floats are added with ${code`+.`}.`,
    wrong: [['float', t`Floats need ${code`+.`}, with the dot. ${code`+`} on floats is rejected.`], ['int', t`Both numbers are floats, and ${code`+`} takes ints: it is a type error.`]],
  },
  {
    e: (a, b) => B('<', I(a), I(b)), answer: 'bool', why: t`A comparison gives ${code`true`} or ${code`false`}, a value of type ${code`bool`}.`,
    wrong: [['int', t`The comparison does not give a number, it gives ${code`true`} or ${code`false`}.`], ['error', t`Comparing two ints is fine; the result is a ${code`bool`}.`]],
  },
  {
    e: (a) => B('^', App('string_of_int', I(a)), S('!')), answer: 'string', why: t`${code`string_of_int`} turns the int into a string, and ${code`^`} joins two strings.`,
    wrong: [['error', t`${code`string_of_int`} has already made the int a string, so ${code`^`} gets two strings.`], ['int', t`${code`^`} is not a power: it joins strings, and gives a string.`]],
  },
  {
    e: (a, b) => If(B('>', I(a), I(b)), I(a), Fl(b)), answer: 'error', why: t`The two branches of an ${code`if`} must have the same type, and here one is an int and the other a float.`,
    wrong: [['int', t`OCaml checks both branches before running anything, whichever is taken. One is a float, so the ${code`if`} is rejected.`], ['float', t`The branches must agree, and they do not: the whole expression is a type error.`]],
  },
  {
    e: (a, b) => If(B('>', I(a), I(b)), S('yes'), S('no')), answer: 'string', why: t`The condition is a ${code`bool`} and both branches are strings, so the ${code`if`} is a string.`,
    wrong: [['bool', t`The condition is the ${code`bool`}; the value of the ${code`if`} is a branch, a string.`], ['error', t`Both branches are strings, so the ${code`if`} is well typed.`]],
  },
  {
    e: (a, b) => B('/.', App('float_of_int', I(a)), Fl(b)), answer: 'float', why: t`${code`float_of_int`} makes a float, and ${code`/.`} divides two floats.`,
    wrong: [['error', t`${code`float_of_int`} converts first, so ${code`/.`} gets two floats.`], ['int', t`${code`/.`} divides floats and gives a float.`]],
  },
  {
    e: (a, b) => B('=', I(a), I(b)), answer: 'bool', why: t`In an expression ${code`=`} is a test for equality, not an assignment; it gives a ${code`bool`}.`,
    wrong: [['int', t`${code`=`} here asks a question, are the two equal, and the answer is a ${code`bool`}.`], ['error', t`Comparing two ints with ${code`=`} is allowed.`]],
  },
];

interface TypeP { i: number; a: number; b: number }

const typeOfExpr = generator<TypeP>({
  id: 'type-of',
  quick: true,
  skill: 'Give the type OCaml reports for an expression, or see that it is a type error: int and float operators differ, and both branches of an if have one type.',
  params: (rng) => {
    const a = int(rng, 2, 40);
    let b = int(rng, 2, 40);
    if (b === a) b = a + 1;
    return { i: int(rng, 0, TYPE_ITEMS.length - 1), a, b };
  },
  sane: ({ i, a, b }) => (i >= 0 && i < TYPE_ITEMS.length && a !== b ? null : 'out of range'),
  problem: ({ i, a, b }) => {
    const it = TYPE_ITEMS[i] as TypeItem;
    return {
      prompt: t`What type does OCaml give the expression ${code`${oc(render(it.e(a, b)))}`}?`,
      answer: { kind: 'choice', options: TY_OPTIONS, correct: it.answer },
      solution: [it.why],
    };
  },
  solve: ({ i, a, b }) => [typeOf((TYPE_ITEMS[i] as TypeItem).e(a, b)) ?? 'error'],
  misconceptions: ({ i }) => (TYPE_ITEMS[i] as TypeItem).wrong.map(([id, why]) => ({ response: [id], why })),
});

// ---------------------------------------------------------------- if expressions

interface IfP { form: number; x: number; p: number; q: number; u: number; v: number; w: number }

const ifValue = generator<IfP>({
  id: 'if-value',
  quick: true,
  skill: 'Evaluate a nested if expression: the condition is evaluated first, and only the branch it selects.',
  params: (rng) => {
    const form = int(rng, 0, 1);
    const [u, v, w] = [int(rng, 1, 30), int(rng, 31, 60), int(rng, 61, 99)];
    if (form === 0) {
      const p = int(rng, 5, 20);
      const q = p + int(rng, 3, 20);
      return { form, x: int(rng, 1, q + 10), p, q, u, v, w };
    }
    return { form, x: int(rng, 10, 99), p: pick(rng, [2, 3, 4, 5]), q: pick(rng, [6, 7, 9]), u, v, w };
  },
  sane: ({ u, v, w, p, q }) => (u !== v && v !== w && u !== w && p < q ? null : 'out of range'),
  problem: ({ form, x, p, q, u, v, w }) => {
    const prog = form === 0
      ? codeBlock(code`let x = ${x} in`, code`if x < ${p} then ${u}`, code`else if x < ${q} then ${v}`, code`else ${w}`)
      : codeBlock(code`let x = ${x} in`, code`if x mod ${p} = ${0} then ${u}`, code`else if x mod ${q} = ${0} then ${v}`, code`else ${w}`);
    const c1 = form === 0 ? x < p : x % p === 0;
    const c2 = form === 0 ? x < q : x % q === 0;
    const ans = c1 ? u : c2 ? v : w;
    const cond1 = form === 0 ? code`${x} < ${p}` : code`${x} mod ${p} = ${0}`;
    const cond2 = form === 0 ? code`${x} < ${q}` : code`${x} mod ${q} = ${0}`;
    return {
      prompt: t`What is the value of this expression? ${prog}`,
      answer: { kind: 'exact', expected: String(ans) },
      solution: [
        t`First the condition ${cond1}: it is ${code`${c1 ? 'true' : 'false'}`}${form === 1 ? t` (${x} divided by ${p} leaves ${x % p})` : t``}.`,
        c1 ? t`So the value is the first branch, ${u}; the rest is never evaluated.` : t`So OCaml evaluates the else branch, which is another ${code`if`}. Its condition ${cond2} is ${code`${c2 ? 'true' : 'false'}`}${form === 1 ? t` (${x} divided by ${q} leaves ${x % q})` : t``}, so the value is ${ans}.`,
      ],
    };
  },
  solve: ({ form, x, p, q, u, v, w }) => {
    // Evaluate as OCaml does: one test at a time, top to bottom.
    const tests: [boolean, number][] = form === 0 ? [[x < p, u], [x < q, v], [true, w]] : [[omod(x, p) === 0, u], [omod(x, q) === 0, v], [true, w]];
    return String((tests.find(([c]) => c) as [boolean, number])[1]);
  },
  misconceptions: ({ form, x, p, q, u, v, w }): Misconception[] => {
    const c1 = form === 0 ? x < p : x % p === 0;
    const c2 = form === 0 ? x < q : x % q === 0;
    const ans = c1 ? u : c2 ? v : w;
    return [u, v, w].filter((y) => y !== ans).map((y) => ({
      response: String(y),
      why: y === u
        ? t`${u} is chosen only when the first condition is ${code`true`}, and here it is ${code`false`}.`
        : y === v
          ? (c1 ? t`The first condition is already ${code`true`}, so OCaml takes ${u} and never looks at the second.` : t`${v} needs the second condition to be ${code`true`}, and it is ${code`false`}.`)
          : t`${w} is the value only when both conditions are ${code`false`}.`,
    }));
  },
});

// ---------------------------------------------------------------- Cambridge problems

const CS = 3110;
const valuesWorked = auto({
  id: 'cs3110-ex2-values-ii',
  source: cite('cs3110-ex2', 'Exercise "values", second expression'),
  title: t`A string from an int`,
  prompt: t`What is the type and value of the OCaml expression ${code`"CS " ^ string_of_int ${CS}`}?`,
  answer: {
    kind: 'choice',
    options: [
      { id: 'right', label: t`type ${code`string`}, value ${code`"CS ${CS}"`}` },
      { id: 'power', label: t`a type error, because ${code`^`} raises a number to a power` },
      { id: 'int', label: t`type ${code`int`}, value ${CS}` },
      { id: 'nospace', label: t`type ${code`string`}, value ${code`"CS${CS}"`}` },
    ],
    correct: 'right',
  },
  solution: [
    t`Evaluate the inside first. ${code`string_of_int ${CS}`} has type ${code`int -> string`} applied to an int, so it is the string ${code`"${CS}"`}.`,
    t`${code`^`} is string concatenation in OCaml, not a power (the exercise warns of this). It joins ${code`"CS "`}, which ends in a space, and ${code`"${CS}"`}.`,
    t`So the expression has type ${code`string`} and value ${code`"CS ${CS}"`}, as the toplevel reports: ${code`- : string = "CS ${CS}"`}.`,
  ],
  reference: ['right'],
  // OCaml 4.11.1 toplevel: - : string = "CS 3110".
  verify: () => same('concatenation', `CS ${String(CS)}`, 'CS 3110'),
  misconceptions: [
    { response: ['power'], why: t`In OCaml ${code`^`} joins strings. There is no built in power operator for ints.` },
    { response: ['nospace'], why: t`The left string is ${code`"CS "`}, with a space at the end, and concatenation keeps every character.` },
  ],
});

const valuesI = auto({
  id: 'cs3110-ex2-values-i',
  source: cite('cs3110-ex2', 'Exercise "values", first expression'),
  title: t`An int expression`,
  prompt: t`What is the value of the OCaml expression ${code`${7} * (${1} + ${2} + ${3})`}? (Its type is ${code`int`}.)`,
  answer: { kind: 'exact', expected: String(7 * (1 + 2 + 3)) },
  solution: [t`The brackets first: ${math`${1} + ${2} + ${3} = ${6}`}. Then ${math`${7} \times ${6} = ${42}`}.`],
  reference: String(42),
  // OCaml 4.11.1 toplevel: - : int = 42.
  verify: () => same('7 * (1 + 2 + 3)', 7 * (1 + 2 + 3), 42),
  misconceptions: [{ response: String(7 * 1 + 2 + 3), why: t`The brackets come first: the ${7} multiplies the whole sum ${6}.` }],
});

const equality = auto({
  id: 'cs3110-ex2-equality',
  source: cite('cs3110-ex2', 'Exercise "equality"'),
  title: t`Structural and physical equality`,
  prompt: t`In the toplevel, what are the results of ${code`"hi" = "hi"`} (structural equality) and ${code`"hi" == "hi"`} (physical equality)?`,
  answer: {
    kind: 'choice',
    options: [
      { id: 'tt', label: t`${code`true`} and ${code`true`}` },
      { id: 'tf', label: t`${code`true`} and ${code`false`}` },
      { id: 'ft', label: t`${code`false`} and ${code`true`}` },
      { id: 'ff', label: t`${code`false`} and ${code`false`}` },
    ],
    correct: 'tf',
  },
  solution: [
    t`${code`=`} compares structure: two strings are equal when they have the same characters. Both are ${code`"hi"`}, so ${code`"hi" = "hi"`} is ${code`true`}.`,
    t`${code`==`} asks whether the two sides are the same object in memory. Each string literal here makes its own string, so they are two objects with the same contents, and ${code`"hi" == "hi"`} is ${code`false`}.`,
    t`The lesson to take: use ${code`=`} (and ${code`<>`} for not equal) to compare values. ${code`==`} is about where values live, which is rarely what you mean.`,
  ],
  reference: ['tf'],
  // OCaml 4.11.1 toplevel: "hi" = "hi" gives true; "hi" == "hi" gives false.
  verify: () => same('structural, physical', `${'hi' === 'hi'}, ${false}`, 'true, false'),
  misconceptions: [
    { response: ['tt'], why: t`${code`==`} is physical equality: the two literals are equal in content but are two different strings in memory.` },
    { response: ['ft'], why: t`${code`=`} compares contents, and the contents are the same, so it is ${code`true`}; it is ${code`==`} that gives ${code`false`}.` },
  ],
});

/** FoCS Exercise 1.5: x added to itself n times, as the recursion adds it: x + (x + (... + 0.0)). */
const mulRec = (x: number, n: number): number => {
  // The innermost call adds first: x +. 0.0, then x +. that, and so on, as a loop to spare the stack.
  let r = 0;
  for (let i = 0; i < n; i++) r = x + r;
  return r;
};
const MUL_N = 10000;
const mulErr = mulRec(0.1, MUL_N) - 1000;
const focs15 = auto({
  id: 'focs-1-5',
  source: cite('focs-notes', 'Lecture 1, Exercise 1.5'),
  title: t`Adding ${math`${0.1}`} ten thousand times`,
  prompt: t`Write ${code`mul x n`}, which adds the float ${code`x`} to itself ${code`n`} times by repeated addition: ${codeBlock(code`let rec mul x n =`, code`  if n = ${0} then ${0}.${0} else x +. mul x (n - ${1})`)} The value of ${code`mul ${0.1} ${MUL_N}`} may print as ${code`${1000}.`}, which looks exact. Evaluate ${code`mul ${0.1} ${MUL_N} -. ${1000}.${0}`}. Give your answer to ${3} significant figures, in the form ${math`a\text{e}b`} for ${math`a \times ${10}^{b}`}.`,
  answer: { kind: 'numeric', expected: mulErr, relTol: 0.005, absTol: 1e-14 },
  solution: [
    t`The decimal ${math`${0.1}`} has no exact binary form, just as ${math`\frac{${1}}{${3}}`} has no exact decimal form. The float stored is very slightly more than ${math`${0.1}`}.`,
    t`Each addition rounds again. After ${MUL_N} of them the small errors add up to about ${math`${1.588} \times ${10}^{${-10}}`}: the toplevel prints ${code`${oc(mulErr.toPrecision(17))}`}.`,
    t`So exact looking output can hide an error. FoCS notes that an error of this kind, in a clock counting tenths of a second, has been blamed for the failure of a missile battery.`,
  ],
  reference: '1.588e-10',
  // OCaml 4.11.1: mul 0.1 10000 -. 1000.0 = 1.5882051229709759e-10; the same in JavaScript doubles, which follow the same IEEE 754 rules.
  verify: () => same('the error', mulErr.toPrecision(4), '1.588e-10'),
  misconceptions: [{ response: '0', why: t`The printed ${code`${1000}.`} is rounded for display. The stored value is a little more than ${1000}.` }],
});

const PHI = (1 + Math.sqrt(5)) / 2;
const gammaAt = (n: number): number => { let g = PHI; for (let i = 0; i < n; i++) g = 1 / (g - 1); return g; };
const G50 = gammaAt(50);
const focs16 = auto({
  id: 'focs-1-6',
  source: cite('focs-notes', 'Lecture 1, Exercise 1.6'),
  title: t`The golden ratio, iterated`,
  prompt: t`Let ${math`\gamma_{${0}} = \frac{${1} + \sqrt{${5}}}{${2}}`} and ${math`\gamma_{n + ${1}} = \frac{${1}}{\gamma_{n} - ${1}}`}. In exact arithmetic ${math`\gamma_{n} = \gamma_{${0}}`} for every ${math`n`}. Code the computation in OCaml with floats (in OCaml, ${math`\sqrt{${5}}`} is ${code`sqrt ${5}.${0}`}) and report ${math`\gamma_{${50}}`} to ${2} decimal places.`,
  answer: { kind: 'numeric', expected: G50, relTol: 0, absTol: 0.006 },
  solution: [
    t`Exactly, ${math`\gamma_{${0}} = \varphi`} satisfies ${math`\varphi^{${2}} = \varphi + ${1}`}, so ${math`\varphi - ${1} = \frac{${1}}{\varphi}`} and ${math`\frac{${1}}{\varphi - ${1}} = \varphi`}: every term is ${math`\varphi`}.`,
    t`But the float for ${math`\varphi`} is off by a tiny ${math`\varepsilon`}. The map ${math`g \mapsto \frac{${1}}{g - ${1}}`} has slope ${math`-\frac{${1}}{(g - ${1})^{${2}}} = -\varphi^{${2}}`} at ${math`\varphi`}, about ${math`-${2.618}`}: each step multiplies the error by about ${2.618}.`,
    t`After about ${40} steps the error is of order ${1}, and the iteration settles on the map's other fixed point, ${math`\frac{${1} - \sqrt{${5}}}{${2}} \approx ${-0.618}`}, where errors shrink instead. The program gives ${math`\gamma_{${50}} \approx ${Number(G50.toFixed(4))}`}.`,
  ],
  reference: G50.toFixed(2),
  // OCaml 4.11.1: gamma 50 = -0.61812184348574739; gamma 10 still prints 1.618...; JavaScript doubles agree.
  verify: () => same('gamma 50', G50.toFixed(4), '-0.6181'),
  misconceptions: [{ response: PHI.toFixed(2), why: t`That is the exact answer, but the question asks what the float program gives. The rounding error is multiplied by about ${2.6} at each step.` }],
});

const focs13 = supervision({
  id: 'focs-1-3',
  source: cite('focs-notes', 'Lecture 1, Exercise 1.3'),
  title: t`Why not if, then true, else false`,
  prompt: t`Why would no experienced programmer write an expression of the form ${code`if b then true else false`}? What about ${code`if b then false else true`}? Give the simpler expression each is equal to, and say why the two always have the same value.`,
  writeUp: 'explanation',
});

// ---------------------------------------------------------------- lesson

const [A, Bn] = [17, 5];

export const fpExpressions: TopicContent = {
  topicId: 'fp.expressions',
  goal: t`Evaluate OCaml expressions of type ${code`int`}, ${code`float`}, ${code`bool`}, and ${code`string`}, including ${code`if`} expressions, and read the type the toplevel reports.`,
  objective: t`Work out the type and value of an OCaml expression, as the toplevel would.`,
  why: t`Every OCaml program is built from expressions; reading their types is the first skill of the course.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`A calculator that knows types` },
    { kind: 'hook', text: t`Type ${code`${A} / ${Bn}`} into OCaml and it answers ${code`- : int = ${Math.trunc(A / Bn)}`}. Not ${math`${A / Bn}`}, and not an error either. Then type ${code`${A}. / ${Bn}.`} and OCaml refuses to run it at all. Why would a language be this fussy, and what is it telling you?` },
    { kind: 'narrative', text: t`OCaml's toplevel is a very strict calculator. You give it an [[ocaml-expression|expression]]; it first works out what kind of thing the answer will be, before computing anything, and only then computes the answer. Its reply always has both parts: ${code`- : int = ${Math.trunc(A / Bn)}`} reads "the value has type ${code`int`} and is ${Math.trunc(A / Bn)}".` },
    {
      kind: 'definition',
      name: t`Expression, value, type`,
      formal: t`An [[ocaml-expression|expression]] is a piece of OCaml syntax that can be evaluated. A [[ocaml-value|value]] is an expression that needs no further evaluation, such as ${code`${42}`}, ${code`${3.5}`}, ${code`true`}, or ${code`"hi"`}. We write ${math`e \Longrightarrow v`} when expression ${math`e`} evaluates to value ${math`v`}. Every well typed expression ${math`e`} has a [[ocaml-type|type]] ${math`\tau`}, written ${math`e : \tau`}, which OCaml computes from the text of ${math`e`} without running it; if ${math`e : \tau`} and ${math`e \Longrightarrow v`}, then ${math`v : \tau`}.`,
      plain: t`An expression is a question, a value is a finished answer, and the type says what sort of answer it can be. For example ${code`${2} + ${3}`} is an expression of type ${code`int`}, and it evaluates to the value ${code`${5}`}.`,
    },
    { kind: 'narrative', text: t`The four types you meet first are ${code`int`} (whole numbers), ${code`float`} (numbers with a decimal point, stored in binary to about ${16} significant figures), ${code`bool`} (just ${code`true`} and ${code`false`}), and ${code`string`} (text in double quotes). OCaml keeps them strictly apart. There is a separate set of arithmetic operators for floats, each with a dot: ${code`+.`}, ${code`-.`}, ${code`*.`}, ${code`/.`}.` },
    {
      kind: 'table',
      caption: t`The operators of this lesson and their types.`,
      head: [t`Operator`, t`Takes`, t`Gives`],
      rows: [
        [[code`+  -  *  /  mod`], [code`int`, ...t` and `, code`int`], [code`int`]],
        [[code`+.  -.  *.  /.`], [code`float`, ...t` and `, code`float`], [code`float`]],
        [[code`^`], [code`string`, ...t` and `, code`string`], t`their join, a ${code`string`}`],
        [[code`=  <>  <  >  <=  >=`], t`two values of the same type`, [code`bool`]],
      ],
    },
    { kind: 'section', title: t`Why is ${code`${A} / ${Bn}`} equal to ${Math.trunc(A / Bn)}?` },
    { kind: 'narrative', text: t`On two ints, ${code`/`} must give an int, because that is its type. So it cannot give ${math`${A / Bn}`}. It drops the fractional part: the exact quotient ${math`\frac{${A}}{${Bn}} = ${A / Bn}`} becomes ${Math.trunc(A / Bn)}. Its partner ${code`mod`} gives the remainder that goes with it.` },
    {
      kind: 'definition',
      name: t`Integer division and remainder`,
      formal: t`For ints ${math`a`} and ${math`b \neq ${0}`}, ${code`a / b`} is the exact quotient ${math`\frac{a}{b}`} truncated towards zero, and ${code`a mod b`} is ${math`a - b \times (a / b)`}, so that ${math`a = b \times (a / b) + (a \bmod b)`} always holds and the remainder has the sign of ${math`a`}.`,
      plain: t`Divide, then chop off everything after the decimal point. For ${math`a = ${A}`} and ${math`b = ${Bn}`}: ${math`\frac{${A}}{${Bn}} = ${A / Bn}`}, so ${code`${A} / ${Bn}`} is ${Math.trunc(A / Bn)}, and the remainder ${code`${A} mod ${Bn}`} is ${math`${A} - ${Bn} \times ${Math.trunc(A / Bn)} = ${A % Bn}`}.`,
    },
    {
      kind: 'steps',
      steps: [
        { label: t`Read the expression`, text: t`Take ${code`${7} * (${1} + ${2} + ${3})`}, the first expression of an exercise in the CS${3110} book. OCaml evaluates the inside of the brackets first.`, eq: [dmath`${1} + ${2} + ${3} = ${6}`] },
        { label: t`Check the types`, text: t`Each of ${7}, ${1}, ${2}, ${3} is an ${code`int`}; ${code`+`} and ${code`*`} take two ints and give an int. So the whole expression has type ${code`int`}, decided before any arithmetic.`, why: { q: t`Why does OCaml check types before computing?`, a: t`So that a mistake such as adding a string to a number is caught when you write the program, not when it is running. A program that passes the check can never apply ${code`+`} to a string.` } },
        { label: t`Multiply`, text: t`Then the outer product.`, eq: [dmath`${7} \times ${6} = ${42}`] },
        { label: t`Read the reply`, text: t`The toplevel prints ${code`- : int = ${42}`}: the dash means the value has no name, the type is ${code`int`}, the value is ${42}.` },
      ],
    },
    checkFrom(intArith, { form: 0, a: 23, b: 4 }, t`${math`\frac{${23}}{${4}} = ${23 / 4}`}, and OCaml truncates towards zero, so ${code`${23} / ${4}`} is ${Math.trunc(23 / 4)}.`),
    { kind: 'section', title: t`Decisions: the if expression` },
    { kind: 'narrative', text: t`In many languages ${code`if`} is a statement: do this, or do that. In OCaml it is an expression with a value, like ${code`${2} + ${3}`}. That one change has a consequence: both branches must have the same type, or OCaml could not say what type the whole thing has.` },
    {
      kind: 'definition',
      name: t`If expression`,
      formal: t`If ${math`b : \texttt{bool}`}, ${math`e_{${1}} : \tau`} and ${math`e_{${2}} : \tau`}, then ${code`if b then e${1} else e${2}`} has type ${math`\tau`}. To evaluate it, evaluate ${math`b`}; if ${math`b \Longrightarrow \texttt{true}`} the value is that of ${math`e_{${1}}`}, and if ${math`b \Longrightarrow \texttt{false}`} it is that of ${math`e_{${2}}`}. The other branch is not evaluated.`,
      plain: t`The condition picks one branch, and only that branch is computed. For example ${code`if ${2} > ${1} then ${42} else ${7}`} has type ${code`int`} and value ${42}.`,
    },
    {
      kind: 'p',
      text: t`"Only one branch is evaluated" matters. FoCS points out that a recursive function stops because of it: the branch that would call the function again is skipped once the condition says stop.`,
      why: { q: t`What would go wrong if both branches were evaluated?`, a: t`A recursive function such as ${code`if n = ${0} then ${1}.${0} else x *. npower x (n - ${1})`} would call itself again even at ${math`n = ${0}`}, then at ${math`-${1}`}, and so on for ever.` },
    },
    { kind: 'narrative', text: t`There are two kinds of equality. ${code`=`} is [[structural-equality|structural equality]]: are the two values the same, piece by piece? ${code`==`} is physical equality: are they the very same object in memory? For numbers and booleans you can ignore the difference. For strings and lists, use ${code`=`}.` },
    {
      kind: 'definition',
      name: t`Structural equality`,
      formal: t`For values ${math`x, y`} of the same type, ${code`x = y`} is ${code`true`} exactly when they have the same structure: equal numbers, equal booleans, or strings with the same characters in the same order. ${code`x <> y`} is its negation.`,
      plain: t`Same contents means equal. ${code`"ab" ^ "c" = "abc"`} is ${code`true`}: the join builds a new string in its own place in memory, apart from the written ${code`"abc"`}, but the characters agree one by one.`,
    },
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`OCaml turns an int into a float when it needs to, as a calculator would.`, counterexample: t`${code`${3} + ${2}.${5}`} is a type error. Write ${code`float_of_int ${3} +. ${2}.${5}`}, which is ${math`${5.5}`}.` },
    { kind: 'pitfall', claim: t`Integer division rounds to the nearest whole number.`, counterexample: t`${code`${19} / ${5}`} is ${Math.trunc(19 / 5)}, not ${4}: the exact ${math`${19 / 5}`} is truncated. And ${code`-${19} / ${5}`} is ${Math.trunc(-19 / 5)}, towards zero, not ${Math.floor(-19 / 5)}.` },
    { kind: 'pitfall', claim: t`Floats are exact decimals.`, counterexample: t`${code`${0.1} +. ${0.2} = ${0.3}`} is ${code`false`}: the sum is stored as ${code`${oc((0.1 + 0.2).toPrecision(17))}`}. Compare floats with a tolerance, never with ${code`=`}.` },
    quickCheck({
      prompt: t`What value does OCaml give for ${code`if ${A} mod ${Bn} = ${A % Bn} then "yes" else "no"`}?`,
      answer: { kind: 'choice', options: [{ id: 'yes', label: [code`"yes"`] }, { id: 'no', label: [code`"no"`] }, { id: 'err', label: t`a type error` }], correct: 'yes' },
      reference: ['yes'],
      why: t`${code`${A} mod ${Bn}`} is ${A % Bn}, so the condition is ${code`true`} and the first branch is the value. Both branches are strings, so it is well typed.`,
    }),
    { kind: 'takeaway', text: t`Every OCaml expression has a type, checked before it runs, and a value: ints and floats never mix, ${code`/`} on ints truncates, and an ${code`if`} has one type for both branches.` },
  ],
  examples: [
    workedCambridge(valuesWorked),
    worked(intArith, { form: 3, a: 19, b: 5 }, t`A negative remainder`),
    worked(typeOfExpr, { i: 6, a: 4, b: 9 }, t`Branches that disagree`),
  ],
  generators: [intArith, typeOfExpr, ifValue],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['ocaml-expression', 'ocaml-value', 'ocaml-type', 'structural-equality'],
  cambridge: [valuesI, equality, focs15, focs16, focs13],
  gate: ['focs-1-6', 'focs-1-3'],
  recall: [
    { front: t`What does ${code`a / b`} give on two ints?`, back: t`The exact quotient truncated towards zero; ${code`a mod b`} is the remainder ${math`a - b \times (a / b)`}, with the sign of ${math`a`}.` },
    { front: t`When is ${code`if b then e${1} else e${2}`} well typed?`, back: t`When ${math`b`} is a ${code`bool`} and ${math`e_{${1}}`}, ${math`e_{${2}}`} have the same type, which is the type of the whole.` },
    { front: t`What is the difference between ${code`=`} and ${code`==`}?`, back: t`${code`=`} compares structure (same contents); ${code`==`} compares identity (same object in memory).` },
  ],
};
