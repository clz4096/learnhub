/**
 * fp.exceptions: Exceptions. The lesson follows FoCS Lecture 6 (error handling, exceptions
 * in OCaml, making change with exceptions and its trace) and CS3110 Section 3.10
 * (exceptions, raise, try ... with, Failure). The problems are the CS3110 Chapter 3
 * exercises "list max exn" and "list max exn string", and FoCS Exercises 6.4 and 6.5.
 *
 * Every OCaml answer was run in the OCaml 4.11.1 toplevel (scratch file ocamlE/t10.ml):
 *   change [5; 2] 6 = [2; 2; 2]; change [5; 2] 16 = [5; 5; 2; 2; 2]; change [5; 3] 7 raises Change;
 *   change [10; 3] 16 = [10; 3; 3]
 *   try f 3 + f (-1) with Neg -> 100 = 100, for f x = if x < 0 then raise Neg else x * 2
 *   try list_max [] with Failure s -> String.length s = 5, for list_max [] = failwith "empty"
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { code, codeBlock, oc, showList } from '../ocaml-code';
import { int, pick } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { math, t, type Rich } from '../rich';
import { checkFrom, workedCambridge, worked, type TopicContent } from '../topic';

// ---------------------------------------------------------------- a handler around a sum

interface TryP { a: number; b: number; c: number }

const tryEval = generator<TryP>({
  id: 'try-eval',
  quick: true,
  skill: 'Evaluate try ... with: an exception raised anywhere inside abandons the whole expression, and the handler\'s value replaces it.',
  params: (rng) => ({ a: pick(rng, [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9]), b: pick(rng, [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9]), c: int(rng, 50, 99) }),
  sane: ({ a, b, c }) => (c >= 50 && a !== 0 && b !== 0 ? null : 'out of range'),
  problem: ({ a, b, c }) => {
    const raises = a < 0 || b < 0;
    const first = a < 0 ? a : b;
    return {
      prompt: t`Given ${codeBlock(code`exception Neg`, code`let f x = if x < ${0} then raise Neg else x * ${2}`)} what is ${code`try f ${oc(a < 0 ? `(${a})` : String(a))} + f ${oc(b < 0 ? `(${b})` : String(b))} with Neg -> ${c}`}?`,
      answer: { kind: 'exact', expected: String(raises ? c : 2 * a + 2 * b) },
      solution: raises
        ? [
          t`${code`f ${oc(first < 0 ? `(${first})` : String(first))}`} has a negative argument, so it raises ${code`Neg`}.`,
          t`Raising abandons the whole expression inside ${code`try`}, including the addition; nothing is added. The handler ${code`Neg -> ${c}`} matches, so the value is ${c}.`,
        ]
        : [
          t`Both arguments are at least ${0}, so no exception is raised: ${code`f ${a}`} is ${2 * a} and ${code`f ${b}`} is ${2 * b}.`,
          t`The ${code`try`} expression's value is then the value of its body, ${math`${2 * a} + ${2 * b} = ${2 * a + 2 * b}`}; the handler is not used.`,
        ],
    };
  },
  solve: ({ a, b, c }) => {
    class Neg extends Error {}
    const f = (x: number): number => { if (x < 0) throw new Neg(); return x * 2; };
    try { return String(f(a) + f(b)); } catch (e) { if (e instanceof Neg) return String(c); throw e; }
  },
  misconceptions: ({ a, b, c }): Misconception[] => {
    if (a < 0 || b < 0) {
      const partial = (a < 0 ? c : 2 * a) + (b < 0 ? c : 2 * b);
      return [
        { response: String(partial), why: t`The handler does not replace only the call that failed: the exception abandons the whole body of the ${code`try`}, and its value is ${c}.` },
        { response: String(2 * a + 2 * b), why: t`${code`f`} never returns for a negative argument: it raises ${code`Neg`} instead of doubling.` },
      ];
    }
    return [
      { response: String(c), why: t`The handler runs only if an exception is raised, and here none is.` },
      { response: String(a + b), why: t`${code`f`} doubles a non-negative argument.` },
    ];
  },
});

// ---------------------------------------------------------------- the nearest handler

interface NestP { x: number; p: number; q: number; r: number }

const nearest = generator<NestP>({
  id: 'nearest-handler',
  quick: true,
  skill: 'Find which handler catches an exception: the innermost enclosing try whose cases match it; others pass it outwards.',
  params: (rng) => {
    const k = int(rng, 1, 9);
    return { x: pick(rng, [-k, 0, k]), p: int(rng, 10, 19), q: int(rng, 1, 9), r: int(rng, 50, 99) };
  },
  sane: ({ x, p, q, r }) => (Math.abs(x) <= 9 && p >= 10 && p <= 19 && q >= 1 && q <= 9 && r >= 50 ? null : 'out of range'),
  problem: ({ x, p, q, r }) => {
    const ans = x < 0 ? p + q : x === 0 ? r : x + q;
    const arg = oc(x < 0 ? `(${x})` : String(x));
    return {
      prompt: t`Given ${codeBlock(code`exception A`, code`exception B`, code`let g x = if x < ${0} then raise A else if x = ${0} then raise B else x`)} what is ${codeBlock(code`try (try g ${arg} with A -> ${p}) + ${q}`, code`with B -> ${r}`)}`,
      answer: { kind: 'exact', expected: String(ans) },
      solution: x < 0
        ? [t`${code`g ${arg}`} raises ${code`A`}. The innermost ${code`try`} around it has a case for ${code`A`}, so the inner expression's value is ${p}.`, t`Evaluation carries on normally: ${math`${p} + ${q} = ${ans}`}. The outer handler is not used.`]
        : x === 0
          ? [t`${code`g ${0}`} raises ${code`B`}. The inner handler has no case for ${code`B`}, so the exception passes outwards, abandoning the addition.`, t`The outer handler has a case for ${code`B`}: the value is ${r}.`]
          : [t`${code`g ${x}`} raises nothing and returns ${x}.`, t`So the value is ${math`${x} + ${q} = ${ans}`}; neither handler is used.`],
    };
  },
  solve: ({ x, p, q, r }) => {
    class A extends Error {}
    class B extends Error {}
    const g = (y: number): number => { if (y < 0) throw new A(); if (y === 0) throw new B(); return y; };
    try {
      let inner: number;
      try { inner = g(x); } catch (e) { if (e instanceof A) inner = p; else throw e; }
      return String(inner + q);
    } catch (e) { if (e instanceof B) return String(r); throw e; }
  },
  misconceptions: ({ x, p, q, r }): Misconception[] => x < 0
    ? [
      { response: String(r), why: t`The inner ${code`try`} catches ${code`A`}, so the exception never reaches the outer handler.` },
      { response: String(p), why: t`The inner handler replaces only the inner expression; ${code`+ ${q}`} is still evaluated afterwards.` },
    ]
    : x === 0
      ? [
        { response: String(p + q), why: t`The inner handler only has a case for ${code`A`}; ${code`B`} passes through it to the outer handler.` },
        { response: String(r + q), why: t`The exception abandons everything inside the outer ${code`try`}, including ${code`+ ${q}`}: the value is just ${r}.` },
      ]
      : [
        { response: String(r), why: t`No exception is raised for a positive argument, so no handler runs.` },
        { response: String(p + q), why: t`${code`g ${x}`} returns ${x} normally; the handler for ${code`A`} does not run.` },
      ],
});

// ---------------------------------------------------------------- backtracking change

class ChangeExn extends Error {}
/** FoCS's change: try the first coin, and on Change undo the choice and drop that coin. */
function change(till: readonly number[], amt: number): number[] {
  if (amt === 0) return [];
  if (till.length === 0) throw new ChangeExn();
  const [c, ...rest] = till as [number, ...number[]];
  if (amt < 0) throw new ChangeExn();
  try { return [c, ...change(till, amt - c)]; } catch (e) { if (e instanceof ChangeExn) return change(rest, amt); throw e; }
}
const changeOrRaise = (till: readonly number[], amt: number): number[] | null => { try { return change(till, amt); } catch (e) { if (e instanceof ChangeExn) return null; throw e; } };
/** Greedy without undoing: largest coins while they fit. */
function greedy(till: readonly number[], amt: number): number[] {
  const out: number[] = [];
  let left = amt;
  for (const c of till) while (left >= c) { out.push(c); left -= c; }
  return out;
}

const CHANGE_DEF = codeBlock(
  code`exception Change`,
  code`let rec change till amt = match till, amt with`,
  code`  | _, ${0} -> []`,
  code`  | [], _ -> raise Change`,
  code`  | c :: till, amt -> if amt < ${0} then raise Change`,
  code`      else try c :: change (c :: till) (amt - c)`,
  code`           with Change -> change till amt`,
);

const TILLS: readonly (readonly [number, number])[] = [[5, 2], [5, 3], [10, 3], [7, 3], [6, 4], [9, 4]];
interface ChangeP { ti: number; amt: number }

const changeKey = (r: number[] | null): string => (r === null ? 'raise' : showList(r));

function changeOptions({ ti, amt }: ChangeP): { options: ChoiceOption[]; right: string; wrong: { id: string; why: Rich }[] } {
  const till = TILLS[ti] as readonly number[];
  const r = changeOrRaise(till, amt);
  const g = greedy(till, amt);
  const wrongs: { key: string; why: Rich }[] = r === null
    ? [
      { key: showList(g), why: t`Those coins add up to ${g.reduce((s, x) => s + x, 0)}, not ${amt}. ${code`change`} only returns a list that adds up exactly; when none exists, ${code`Change`} escapes every handler.` },
      { key: '[]', why: t`${code`[]`} is returned only when the amount is ${0}. For an impossible amount every choice fails and ${code`Change`} is raised at the top.` },
    ]
    : [
      { key: 'raise', why: t`The first choice may fail, but the handler undoes it and tries the smaller coins. Here a combination exists, so no exception escapes.` },
      { key: showList([...r].reverse()), why: t`${code`change`} always tries the largest coin first, so the larger coins come first in the result.` },
    ];
  const keys = [...new Set([changeKey(r), ...wrongs.map((w) => w.key)])].sort();
  const id = (k: string): string => (k === 'raise' ? 'raise' : `l${keys.indexOf(k)}`);
  return {
    options: keys.map((k) => ({ id: id(k), label: k === 'raise' ? t`It raises ${code`Change`}.` : [code`${oc(k)}`] })),
    right: id(changeKey(r)),
    wrong: wrongs.filter((w) => w.key !== changeKey(r)).map((w) => ({ id: id(w.key), why: w.why })),
  };
}

const changeGen = generator<ChangeP>({
  id: 'change',
  skill: 'Evaluate FoCS\'s backtracking change: a failed choice raises Change, and the handler undoes it and tries without that coin.',
  params: (rng) => {
    for (;;) {
      const ti = int(rng, 0, TILLS.length - 1);
      const amt = int(rng, 4, 30);
      const r = changeOrRaise(TILLS[ti] as readonly number[], amt);
      // A result with two kinds of coin (so reversing it is a different list), or an impossible amount.
      if (r === null || new Set(r).size === 2) return { ti, amt };
    }
  },
  sane: ({ ti, amt }) => {
    const r = changeOrRaise(TILLS[ti] as readonly number[], amt);
    return ti >= 0 && ti < TILLS.length && (r === null || new Set(r).size === 2) ? null : 'out of range';
  },
  problem: (p) => {
    const till = TILLS[p.ti] as readonly number[];
    const r = changeOrRaise(till, p.amt);
    const o = changeOptions(p);
    return {
      prompt: t`FoCS makes change with exceptions: ${CHANGE_DEF} What does ${code`change ${till as number[]} ${p.amt}`} do?`,
      answer: { kind: 'choice', options: o.options, correct: o.right },
      solution: r === null
        ? [t`No combination of ${till[0] as number}s and ${till[1] as number}s adds up to ${p.amt}. Every attempt ends with the amount negative or the till empty, raising ${code`Change`}; each handler tries the remaining possibility, which also fails.`, t`Finally the outermost call raises ${code`Change`} with no handler left to catch it.`]
        : [t`${code`change`} takes the largest coin as long as it can. When that leads to a dead end, ${code`Change`} is raised, and the most recent handler undoes the last choice and drops that coin.`, t`The first combination found this way is ${code`${oc(showList(r))}`}.`],
    };
  },
  solve: (p) => {
    // Search the choices in the same order with explicit backtracking (no exceptions): coins in till order, as many of each as possible first.
    const till = TILLS[p.ti] as readonly number[];
    const search = (i: number, left: number): number[] | null => {
      if (left === 0) return [];
      if (i >= till.length || left < 0) return null;
      const c = till[i] as number;
      const withC = search(i, left - c);
      return withC !== null ? [c, ...withC] : search(i + 1, left);
    };
    const r = search(0, p.amt);
    const o = changeOptions(p);
    return [r === null ? 'raise' : (o.options.find((x) => x.id !== 'raise' && plainList(x.label) === showList(r))?.id ?? 'none')];
  },
  misconceptions: (p) => changeOptions(p).wrong.map((w) => ({ response: [w.id], why: w.why })),
});

/** The OCaml list shown in an option label, read back from its LaTeX. */
function plainList(label: Rich): string {
  const s = label[0];
  return s === undefined ? '' : s.text.replace(/^\\texttt\{/, '').replace(/\}$/, '').replace(/\\ /g, ' ');
}

// ---------------------------------------------------------------- Cambridge problems

const CH_TILL = [5, 2];
const CH_AMT = 6;
const CH = change(CH_TILL, CH_AMT);
const changeWorked = auto({
  id: 'focs-6-8-trace',
  source: cite('focs-notes', 'Lecture 6, Sections 6.7 and 6.8, making change', true),
  title: t`Making change with backtracking`,
  prompt: t`FoCS's ${code`change`}, with ${code`till`} the coin values, largest first: ${CHANGE_DEF} The greedy method of the lists lecture could not make ${CH_AMT} from ${5}s and ${2}s, because it always takes the largest coin. What does ${code`change ${CH_TILL} ${CH_AMT}`} return?`,
  answer: {
    kind: 'choice',
    options: [
      { id: 'right', label: [code`${oc(showList(CH))}`] },
      { id: 'raise', label: t`It raises ${code`Change`}.` },
      { id: 'five', label: [code`[${5}]`] },
      { id: 'empty', label: [code`[]`] },
    ],
    correct: 'right',
  },
  solution: [
    t`First choice: a ${5}, leaving ${1}. Then another ${5} makes the amount ${-4}: ${code`Change`} is raised, and the handler around that attempt drops the ${5}s and tries ${code`change [${2}] ${1}`}.`,
    t`${code`change [${2}] ${1}`} takes a ${2}, leaving ${-1}: raise; its handler tries ${code`change [] ${1}`}, which raises ${code`Change`} again. No handler at that level is left, so the exception reaches the handler around the very first ${5}.`,
    t`That handler undoes the first choice and evaluates ${code`change [${2}] ${6}`}: ${2}, then ${2}, then ${2}, reaching ${0}. The result is ${code`${oc(showList(CH))}`}.`,
    t`Each handler undoes only the most recent choice, leaving earlier ones to be undone by handlers further out: that is backtracking.`,
  ],
  reference: ['right'],
  // OCaml 4.11.1: change [5; 2] 6 = [2; 2; 2].
  verify: () => same('change [5; 2] 6', showList(CH), '[2; 2; 2]'),
  misconceptions: [
    { response: ['raise'], why: t`The first attempt with a ${5} fails, but its handler catches ${code`Change`} and tries the ${2}s, which succeed.` },
    { response: ['five'], why: t`A ${5} leaves ${1}, which cannot be made, so that choice is undone; a returned list always adds up to the amount.` },
  ],
});

const MAX_LEN = 'empty'.length;
const listMax = auto({
  id: 'cs3110-ex3-list-max-exn',
  source: cite('cs3110-ex3', 'Exercise "list max exn"', true),
  title: t`Catching Failure`,
  prompt: t`The exercise asks for ${code`list_max : int list -> int`}, returning the maximum, or raising ${code`Failure "empty"`} on the empty list; ${code`failwith s`} raises ${code`Failure s`}. With ${codeBlock(code`let rec list_max = function`, code`  | [] -> failwith "empty"`, code`  | [h] -> h`, code`  | h :: t -> max h (list_max t)`)} evaluate ${code`try list_max [] with Failure s -> String.length s`}.`,
  answer: { kind: 'exact', expected: String(MAX_LEN) },
  solution: [
    t`${code`list_max []`} matches the first case and raises ${code`Failure "empty"`}.`,
    t`The handler's pattern ${code`Failure s`} matches it and binds ${code`s`} to the string ${code`"empty"`}, just as a pattern binds a constructor's argument: exceptions are constructors of the type ${code`exn`}.`,
    t`${code`String.length "empty"`} is ${MAX_LEN}, the value of the whole expression.`,
    t`A handler pattern binds an exception's argument like any constructor pattern.`,
  ],
  nudge: t`Not quite. Follow the exception: which pattern catches it, and what is bound to ${code`s`}?`,
  hints: [
    t`Which case of ${code`list_max`} does ${code`[]`} match, and what does it raise?`,
    t`Does the handler's pattern ${code`Failure s`} match that exception, and what is ${code`s`}?`,
    t`What is the length of that string?`,
  ],
  reference: String(MAX_LEN),
  // OCaml 4.11.1: try list_max [] with Failure s -> String.length s = 5.
  verify: () => same('length of "empty"', MAX_LEN, 5),
  misconceptions: [
    { response: '0', why: t`The handler does not return a default of ${0}: it evaluates ${code`String.length s`} with ${code`s`} bound to the message ${code`"empty"`}.` },
  ],
});

const listMaxString = supervision({
  id: 'cs3110-ex3-list-max-exn-string',
  source: cite('cs3110-ex3', 'Exercise "list max exn string"'),
  title: t`From an exception to a string`,
  prompt: t`Write ${code`list_max_string : int list -> string`}, returning a string containing the maximum integer in a list, or the string ${code`"empty"`} (not the exception ${code`Failure "empty"`}, just the string) if the list is empty. Use ${code`list_max`} and a handler, and explain why the handler's value must have type ${code`string`}.`,
  writeUp: 'explanation',
  hints: [
    t`What does the normal branch need to do to the integer that ${code`list_max`} returns?`,
    t`Which exception pattern should the handler match, and what should it return?`,
    t`In ${code`try e with p -> h`}, why must ${code`e`} and ${code`h`} have the same type?`,
  ],
});
const focs65 = supervision({
  id: 'focs-6-5',
  source: cite('focs-notes', 'Lecture 6, Exercises 6.4 and 6.5'),
  title: t`An evaluator that raises`,
  prompt: t`Give the declaration of an OCaml type for arithmetic expressions with these possibilities: floating point numbers, variables (represented by strings), or expressions of the form ${math`-E`}, ${math`E + E`}, ${math`E \times E`}. Then write a function that evaluates an expression. If the expression contains any variables, the function should raise an exception indicating the variable name.`,
  writeUp: 'explanation',
  hints: [
    t`Which constructors does the type need, and what does each carry?`,
    t`Which exception declaration lets the variable's name travel with the exception?`,
    t`In the evaluator, which case raises, and how do the other cases recurse?`,
  ],
});

// ---------------------------------------------------------------- lesson

export const fpExceptions: TopicContent = {
  topicId: 'fp.exceptions',
  goal: t`Raise an exception when a function has no sensible result, and handle it with ${code`try ... with`}.`,
  objective: t`Raise exceptions, handle them with try ... with, and trace which handler catches each one.`,
  why: t`Exceptions report failure without threading options everywhere, and make backtracking searches simple.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`When there is no answer` },
    { kind: 'hook', text: t`What is the first element of the empty list? There is none, and an option type would make every caller check for ${code`None`}, even deep inside a search that just wants to give up and try something else. FoCS's answer is the exception: abandon the computation now, and let whoever is prepared to deal with it pick up the pieces.` },
    {
      kind: 'definition',
      name: t`Exception`,
      formal: t`${code`exception E`} or ${code`exception E of t`} declares a new constructor of the built in type ${code`exn`}. If ${code`e : exn`}, then ${code`raise e`} has every type, and evaluating it does not produce a value: it abandons the current computation and passes the [[exception|exception]] ${code`e`} outwards. ${code`failwith s`} is ${code`raise (Failure s)`}.`,
      plain: t`An exception is a signal that something went wrong, possibly carrying information. FoCS declares ${code`exception NoChange of int`}; then ${code`raise (NoChange ${1})`} stops whatever was being computed.`,
    },
    {
      kind: 'definition',
      name: t`Handler`,
      formal: t`In ${code`try e with p${1} -> e${1} | ... | pn -> en`}, the [[exception-handler|handler]] cases must have the type of ${code`e`}. If ${code`e`} evaluates to a value ${math`v`}, the whole expression has value ${math`v`}. If evaluating ${code`e`} raises an exception that matches some ${code`pi`}, the value is that of the first such ${code`ei`}; if no case matches, the exception passes outwards to the next enclosing handler.`,
      plain: t`${code`try`} marks an expression whose failure you are ready for. If it raises, the first matching case supplies the answer instead. The handler that catches an exception is the most recently entered one that has a matching case, found while the program runs.`,
    },
    {
      kind: 'p',
      text: t`Why can ${code`raise e`} have every type? Because it never returns a value, so it can stand where any value is expected: after ${code`exception Neg`}, in ${code`if n < ${0} then raise Neg else n * ${2}`} it acts as an ${code`int`}. Its type is ${code`exn -> 'a`}: since no value ever comes back, ${code`'a`} can be whatever type the context needs.`,
    },
    checkFrom(tryEval, { a: 3, b: -1, c: 100 }, t`${code`f (-${1})`} raises ${code`Neg`}, which abandons the whole sum; the handler gives ${100}.`),
    { kind: 'section', title: t`Backtracking: making change` },
    { kind: 'narrative', text: t`The lists lecture made change greedily, always taking the largest coin, and so failed to make ${6} from ${5}s and ${2}s. Exceptions give a clean fix: take the largest coin, and if that leads to a dead end, raise ${code`Change`}; a handler around the choice catches it and tries again without that coin.` },
    { kind: 'rule', text: [CHANGE_DEF] },
    {
      kind: 'steps',
      steps: [
        { label: t`Choose a ${5}`, text: t`${code`change [${5}; ${2}] ${6}`} enters a handler and tries ${code`${5} :: change [${5}; ${2}] ${1}`}.` },
        { label: t`Dead ends`, text: t`From ${1}: another ${5} gives ${-4}, raise; its handler tries the ${2}s, which give ${-1}, raise; then the empty till, raise. No handler inside has anything left to try.` },
        { label: t`Undo the first choice`, text: t`${code`Change`} reaches the handler around the first ${5}, which evaluates ${code`change [${2}] ${6}`} instead.`, plain: t`Each handler undoes only the most recent choice; earlier ones are undone by handlers further out.` },
        { label: t`Succeed`, text: t`Three ${2}s reach ${0}, and no exception escapes.`, eq: [code`[${2}; ${2}; ${2}]`] },
      ],
    },
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`A handler replaces only the call that failed, so ${code`try f ${3} + f (-${1}) with Neg -> ${100}`} is ${6 + 100}.`, counterexample: t`Raising abandons the whole body of the ${code`try`}, including the pending addition. The value is ${100}.` },
    { kind: 'pitfall', claim: t`A handler only catches exceptions raised in the code written inside it.`, counterexample: t`It catches exceptions raised anywhere during the evaluation, including inside functions called from there. With ${code`let half n = if n mod ${2} = ${0} then n / ${2} else failwith "odd"`}, the expression ${code`try half ${7} + ${1} with Failure _ -> ${0}`} is ${0}: the ${code`Failure "odd"`} is raised inside ${code`half`}, abandons the addition, and is caught by the handler outside.` },
    { kind: 'pitfall', claim: t`An exception is caught by the handler nearest to it in the program text.`, counterexample: t`It is caught by the most recently entered handler that is still active, which depends on how the program ran. In the change trace, the same handler text catches different exceptions at different moments.` },
    { kind: 'takeaway', text: t`${code`raise`} abandons the computation and passes an exception outwards to the most recently entered handler with a matching case, whose value replaces the whole ${code`try`} body; this makes giving up, and backtracking, simple.` },
  ],
  examples: [
    workedCambridge(changeWorked),
    worked(nearest, { x: 0, p: 12, q: 4, r: 70 }, t`An exception the inner handler ignores`),
    worked(changeGen, { ti: 1, amt: 7 }, t`An amount that cannot be made`),
  ],
  generators: [tryEval, nearest, changeGen],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['exception', 'exception-handler'],
  cambridge: withUses([listMax, listMaxString, focs65], {
    'focs-6-5': { sections: ['When there is no answer'], note: t`An evaluator that raises an exception for a variable` },
    'cs3110-ex3-list-max-exn-string': { sections: ['When there is no answer'], note: t`Handling an exception and the type of the handler` },
    'cs3110-ex3-list-max-exn': { sections: ['When there is no answer'], note: t`What a handled failure returns` },
  }),
  gate: ['focs-6-5', 'cs3110-ex3-list-max-exn-string', 'cs3110-ex3-list-max-exn'],
  recall: [
    { front: t`What does ${code`raise e`} do, and what is its type?`, back: t`It abandons the current computation and passes the exception ${code`e`} outwards; it has every type, since it returns no value.` },
    { front: t`Which handler catches an exception?`, back: t`The most recently entered ${code`try`} that is still active and has a case matching the exception; unmatched exceptions pass further out.` },
  ],
};
