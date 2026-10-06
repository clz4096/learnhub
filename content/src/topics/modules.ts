/**
 * fp.modules: Modules and interfaces. The lesson follows CS3110 Sections 5.1 to 5.5 and 5.7
 * (structures, signatures, sealing with a module type, encapsulation, abstract types,
 * representation invariants) with the stack as its example, and FoCS Lecture 7's point
 * that an abstract type provides its operations and hides its data structure. The
 * problems are CS3110 Chapter 5 exercises: complex encapsulation, stack option, fraction
 * reduced, and implementation with abstracted interface.
 *
 * The three complex encapsulation changes were run in OCaml 4.11.1: removing zero from the
 * structure is a signature mismatch (zero is required but not provided); removing add from
 * the signature compiles, and Complex.add is then unbound outside; zero = 0, 0 is a
 * signature mismatch (int * int is not included in t).
 */
import { cite, supervision } from '../cambridge';
import { gcd, int, pick, sample } from '../math';
import { ml, mlBlock } from '../ocaml-code';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { math, t } from '../rich';
import { checkFrom, quickCheck, worked, workedProof, type TopicContent } from '../topic';

// ---------------------------------------------------------------- generators

type Op = { push: number } | 'pop';
interface StackP { ops: Op[] }

function runStack(ops: readonly Op[]): number[] {
  const s: number[] = [];
  for (const o of ops) {
    if (o === 'pop') s.pop();
    else s.push(o.push);
  }
  return s;
}
function runQueue(ops: readonly Op[]): number[] {
  const q: number[] = [];
  for (const o of ops) {
    if (o === 'pop') q.shift();
    else q.push(o.push);
  }
  return q;
}

const stackTrace = generator<StackP>({
  id: 'stack-trace',
  skill: 'Trace a sequence of stack operations through a module: push and pop work at the same end (last in, first out).',
  quick: true,
  params: (rng) => {
    for (;;) {
      const vals = sample(rng, [2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13], 5);
      const ops: Op[] = [];
      let size = 0;
      let i = 0;
      while (i < vals.length) {
        if (size > 0 && rng() < 0.35) {
          ops.push('pop');
          size--;
        } else {
          ops.push({ push: vals[i] as number });
          i++;
          size++;
        }
      }
      if (rng() < 0.5 && size > 1) ops.push('pop');
      const st = runStack(ops);
      const qu = runQueue(ops);
      const top = st[st.length - 1];
      const pushes = ops.filter((o): o is { push: number } => o !== 'pop');
      const last = pushes[pushes.length - 1]?.push;
      const pops = ops.filter((o) => o === 'pop').length;
      if (pops >= 1 && st.length > 0 && qu.length > 0 && new Set([top, qu[0], last]).size === 3) return { ops };
    }
  },
  sane: ({ ops }) => (runStack(ops).length > 0 ? null : 'empty stack'),
  problem: ({ ops }) => {
    const chain = ops.map((o) => (o === 'pop' ? '|> pop' : `|> push ${o.push}`)).join(' ');
    const st = runStack(ops);
    return {
      prompt: t`With the module below, what is ${ml`ListStack.(empty ${{ kind: 'code', text: chain }} |> peek)`}?`.concat([mlBlock`
        module ListStack = struct
          type 'a t = 'a list
          exception Empty
          let empty = []
          let push x s = x :: s
          let peek = function [] -> raise Empty | x :: _ -> x
          let pop = function [] -> raise Empty | _ :: s -> s
        end
      `]),
      answer: { kind: 'exact', expected: String(st[st.length - 1]) },
      solution: [
        t`${ml`push`} puts an element on the front of the list and ${ml`pop`} removes the front element, so the most recent push is always on top.`,
        t`Following the pipeline, the stack (top first) ends as ${ml`[${{ kind: 'code', text: [...st].reverse().join('; ') }}]`}.`,
        t`${ml`peek`} returns the top: ${st[st.length - 1] as number}.`,
      ],
    };
  },
  solve: ({ ops }) => {
    const st = runStack(ops);
    return String(st[st.length - 1]);
  },
  misconceptions: ({ ops }): Misconception[] => {
    const qu = runQueue(ops);
    const pushes = ops.filter((o): o is { push: number } => o !== 'pop');
    return [
      { response: String(qu[0]), why: t`That treats it as a queue, removing the oldest element. A stack removes the newest: last in, first out.` },
      { response: String(pushes[pushes.length - 1]?.push), why: t`That is the last value pushed, but a later ${ml`pop`} removed it.` },
    ];
  },
});

interface SealP { k1: number; k2: number; order: number[]; name: string }
const sealedForms = ({ k1, k2, name }: SealP): { id: string; code: string; why: string }[] => [
  { id: 'ok', code: `${name}.get (${name}.add (${name}.make ${k1}) (${name}.make ${k2}))`, why: '' },
  { id: 'plus', code: `${name}.make ${k1} + ${k2}`, why: 'plus' },
  { id: 'get', code: `${name}.get ${k1}`, why: 'get' },
  { id: 'mixed', code: `${name}.add (${name}.make ${k1}) ${k2}`, why: 'mixed' },
];

const sealing = generator<SealP>({
  id: 'abstract-type',
  skill: 'Decide which expressions type-check against a signature with an abstract type: outside the module, its values can be made and used only through its operations.',
  quick: true,
  params: (rng) => ({ k1: int(rng, 1, 30), k2: int(rng, 1, 30), order: sample(rng, [0, 1, 2, 3], 4), name: pick(rng, ['Counter', 'Money', 'Score', 'Total']) }),
  sane: ({ order }) => (order.length === 4 ? null : 'order'),
  problem: (sp) => {
    const forms = sealedForms(sp);
    const options: ChoiceOption[] = sp.order.map((i) => ({ id: (forms[i] as { id: string }).id, label: [ml`${{ kind: 'code', text: (forms[i] as { code: string }).code }}`] }));
    return {
      prompt: t`The module is sealed by a signature in which ${ml`t`} is abstract, though inside it ${ml`t`} is ${ml`int`}. Outside the module, which of these expressions using ${sp.k1} and ${sp.k2} type-checks?`.concat([mlBlock`
        module ${sp.name} : sig
          type t
          val make : int -> t
          val add : t -> t -> t
          val get : t -> int
        end = struct
          type t = int
          let make n = n
          let add a b = a + b
          let get a = a
        end
      `]),
      answer: { kind: 'choice', options, correct: 'ok' },
      solution: [
        t`Outside, ${ml`${sp.name}.t`} is a type of its own: the signature does not say it is ${ml`int`}, so an ${ml`int`} cannot be used where a ${ml`${sp.name}.t`} is wanted, or the other way round.`,
        t`Only ${ml`${{ kind: 'code', text: (forms[0] as { code: string }).code }}`} passes values of type ${ml`${sp.name}.t`} to operations that expect them, and its result has type ${ml`int`}. Its value would be ${sp.k1 + sp.k2}, but outside code cannot rely on how that is computed.`,
      ],
    };
  },
  solve: () => ['ok'],
  misconceptions: (sp): Misconception[] => [
    { response: ['plus'], why: t`${ml`${sp.name}.make ${sp.k1}`} has the abstract type ${ml`${sp.name}.t`}, not ${ml`int`}, so ${ml`+`} cannot be applied to it outside the module.` },
    { response: ['get'], why: t`${ml`get`} expects a ${ml`${sp.name}.t`}; the number ${sp.k1} is an ${ml`int`}. Make one with ${ml`make`} first.` },
    { response: ['mixed'], why: t`The second argument of ${ml`add`} must be a ${ml`${sp.name}.t`}; ${sp.k2} is an ${ml`int`}.` },
  ],
});

interface FracP { n: number; d: number }
const fracNum = ({ n, d }: FracP): number => {
  const g = gcd(Math.abs(n), Math.abs(d));
  return (d < 0 ? -n : n) / g;
};

const fraction = generator<FracP>({
  id: 'fraction-invariant',
  skill: 'Apply a representation invariant: a fraction kept in lowest terms with a positive denominator, as in the CS3110 fraction reduced exercise.',
  params: (rng) => {
    for (;;) {
      const g = int(rng, 2, 6);
      const a = int(rng, 1, 9) * (rng() < 0.5 ? -1 : 1);
      const b = int(rng, 2, 9) * (rng() < 0.5 ? -1 : 1);
      if (gcd(Math.abs(a), Math.abs(b)) === 1) return { n: a * g, d: b * g };
    }
  },
  sane: ({ n, d }) => (d !== 0 && gcd(Math.abs(n), Math.abs(d)) > 1 ? null : 'need a common factor'),
  problem: ({ n, d }) => {
    const g = gcd(Math.abs(n), Math.abs(d));
    const num = fracNum({ n, d });
    return {
      prompt: t`A ${ml`Fraction`} module keeps the invariant that every value is in reduced form with a positive denominator. What is ${ml`Fraction.numerator (Fraction.make (${n}) (${d}))`}?`,
      answer: { kind: 'exact', expected: String(num) },
      solution: [
        t`${ml`make`} must establish the invariant. Divide both by their greatest common divisor ${g}: ${math`\frac{${n}}{${d}} = \frac{${n / g}}{${d / g}}`}.`,
        d < 0 ? t`The denominator is negative, so negate both: ${math`\frac{${-n / g}}{${-d / g}}`}. The numerator is ${num}.` : t`The denominator is already positive, so the numerator is ${num}.`,
      ],
    };
  },
  solve: (fp) => String(fracNum(fp)),
  misconceptions: ({ n, d }): Misconception[] => {
    const g = gcd(Math.abs(n), Math.abs(d));
    return [
      { response: String(n), why: t`That is the numerator before reducing. The invariant says ${ml`make`} divides out the common factor ${g}.` },
      { response: String(d < 0 ? n / g : -n / g), why: d < 0 ? t`Reduced, but the denominator is still negative: the invariant moves the sign to the numerator.` : t`The denominator is already positive, so the sign of the numerator stays.` },
      { response: String(Math.abs(d) / g), why: t`That is the denominator. The question asks for the numerator.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

const complexWorked = workedProof({
  title: t`Complex encapsulation`,
  source: cite('cs3110-ex5', 'Exercise: complex encapsulation'),
  prompt: t`${ml`module Complex : ComplexSig = struct type t = float * float let zero = (${0}., ${0}.) let add (r${1}, i${1}) (r${2}, i${2}) = r${1} +. r${2}, i${1} +. i${2} end`}, where ${ml`ComplexSig`} declares ${ml`type t = float * float`}, ${ml`val zero : t`}, and ${ml`val add : t -> t -> t`}. What happens, and why, if you make each change separately: remove ${ml`zero`} from the structure; remove ${ml`add`} from the signature; change ${ml`zero`} to ${ml`let zero = ${0}, ${0}`}?`,
  steps: [
    t`Sealing ${ml`Complex : ComplexSig`} asks OCaml to check that the structure provides every value the signature declares, at a type at least as general as declared.`,
    t`Remove ${ml`zero`} from the structure: a signature mismatch. The signature promises ${ml`zero`}, and the structure does not provide it.`,
    t`Remove ${ml`add`} from the signature: it compiles. A structure may have more than its signature lists; ${ml`add`} still exists inside but is hidden, so ${ml`Complex.add`} is unbound outside.`,
    t`Change ${ml`zero`} to ${ml`${0}, ${0}`}: a signature mismatch. Its type is ${ml`int * int`}, which is not ${ml`t = float * float`}; OCaml does not convert integers to floats.`,
  ],
  answer: t`An error, compiles with ${ml`add`} hidden, an error: the structure must provide everything in the signature at the right types, and only what the signature lists is visible outside.`,
});

const stackOption = supervision({
  id: 'cs3110-5-stack-option',
  source: cite('cs3110-ex5', 'Exercise: stack option'),
  title: t`A stack with options`,
  prompt: t`Write a module ${ml`Stack`} with ${ml`type 'a t = 'a list`} and ${ml`empty`}, ${ml`is_empty`}, ${ml`push`}, ${ml`peek`} (returning ${ml`None`} if empty, else ${ml`Some item`}), and ${ml`pop`} (returning ${ml`None`} or ${ml`Some remaining_stack`}). Then write a signature for it with ${ml`t`} abstract, and explain what the signature hides and why that is useful.`,
  writeUp: 'explanation',
});
const fractionReduced = supervision({
  id: 'cs3110-5-fraction-reduced',
  source: cite('cs3110-ex5', 'Exercises: fraction, fraction reduced'),
  title: t`Fractions with an invariant`,
  prompt: t`Implement the ${ml`Fraction`} module type (${ml`make`}, ${ml`numerator`}, ${ml`denominator`}, ${ml`to_string`}, ${ml`to_float`}, ${ml`add`}, ${ml`mul`}) so that every value returned by ${ml`make`}, ${ml`add`}, and ${ml`mul`} is in reduced form with a positive denominator. State the representation invariant and explain why the signature's abstract type means other code cannot break it.`,
  writeUp: 'explanation',
});
const abstracted = supervision({
  id: 'cs3110-5-abstracted-interface',
  source: cite('cs3110-ex5', 'Exercise: implementation with abstracted interface'),
  title: t`Making a type abstract`,
  prompt: t`A file ${ml`date.ml`} defines ${ml`type date = {month : int; day : int}`} with ${ml`make_date`}, ${ml`get_month`}, ${ml`get_day`}, and ${ml`to_string`}, and ${ml`date.mli`} declares them. Change the first declaration of ${ml`date.mli`} to ${ml`type date`}. Which uses of dates in the toplevel change their responses or stop working, and why?`,
  writeUp: 'explanation',
});

// ---------------------------------------------------------------- lesson

export const modules: TopicContent = {
  topicId: 'fp.modules',
  goal: t`Package a data structure in a module with a signature that hides its representation, as for a stack.`,
  objective: t`Write a module and a signature for it, and use an abstract type to hide the representation.`,
  why: t`Hiding the representation lets you change it safely: the next lesson swaps in a faster queue unseen.`,
  minutes: 30,
  lesson: [
    { kind: 'section', title: t`Hiding the representation` },
    { kind: 'hook', text: t`A stack is just a list: push is cons, pop is tail. So why not hand everyone the list? Because then anyone can reach into the middle of your stack, and the day you want a faster representation, every program that peeked at the list breaks.` },
    { kind: 'narrative', text: t`FoCS Lecture ${7} puts it this way: an abstract type should provide its operations and hide its internal data structures. OCaml does this with modules. A module groups definitions; a signature says which of them the outside world may see, and at what types.` },
    { kind: 'definition', name: t`Structure and signature`, formal: t`A [[module|structure]] ${ml`struct ... end`} is a sequence of definitions of types, values, and exceptions. A [[signature|signature]] ${ml`sig ... end`} (a module type) is a sequence of declarations ${ml`type t`} and ${ml`val x :`} ${math`\tau`}. Writing ${ml`module M : S = struct ... end`} seals ${ml`M`} with ${ml`S`}.`, plain: t`The structure is the implementation; the signature is the contract. Sealing checks the implementation against the contract and lets outside code see only what the contract lists.` },
    { kind: 'rule', text: [mlBlock`
      module type STACK = sig
        type 'a t
        exception Empty
        val empty : 'a t
        val push : 'a -> 'a t -> 'a t
        val peek : 'a t -> 'a
        val pop : 'a t -> 'a t
      end
      module ListStack : STACK = struct
        type 'a t = 'a list
        exception Empty
        let empty = []
        let push x s = x :: s
        let peek = function [] -> raise Empty | x :: _ -> x
        let pop = function [] -> raise Empty | _ :: s -> s
      end
    `] },
    { kind: 'definition', name: t`Abstract type`, formal: t`A type declared in a signature as ${ml`type t`}, with no definition, is [[abstract-type|abstract]]: outside the sealed module, ${ml`M.t`} is equal to no other type, so its values can be made, examined, and changed only by the module's operations.`, plain: t`Outside, nobody knows ${ml`'a ListStack.t`} is a list. ${ml`ListStack.empty = []`} is a type error there, though it is true inside.` },
    {
      kind: 'steps',
      steps: [
        { label: t`What sealing checks`, text: t`Every ${ml`val x :`} ${math`\tau`} in the signature must be defined in the structure, at a type at least as general as ${math`\tau`}; every type in the signature must be defined.`, plain: t`A missing value, or one of the wrong type, is a "signature mismatch" error.` },
        { label: t`What sealing hides`, text: t`Definitions in the structure but not in the signature are invisible outside; so are the definitions of abstract types.`, plain: t`A helper function you leave out of the signature is private to the module.` },
        { label: t`What it buys`, text: t`Code outside depends only on the signature, so the structure can be replaced by any other that matches it.`, plain: t`That is how the next lesson replaces a slow queue by a fast one without changing a single caller.` },
      ],
    },
    checkFrom(stackTrace, { ops: [{ push: 4 }, { push: 9 }, 'pop', { push: 7 }, { push: 2 }, 'pop'] }, t`Pushes and pops act at the top: after the two pops the top is ${7}.`),
    { kind: 'section', title: t`Invariants the module keeps` },
    { kind: 'narrative', text: t`Hiding the representation does more than tidy things up. It lets a module promise something about every value it hands out, because no one else can make one.` },
    { kind: 'definition', name: t`Representation invariant`, formal: t`A [[representation-invariant|representation invariant]] of a module is a property of its internal values that every operation may assume of its arguments and must establish for its results.`, plain: t`For sets of ints kept as lists: "the list is strictly increasing". Then ${ml`[${1}; ${4}; ${9}]`} is a valid value, while ${ml`[${4}; ${1}; ${9}]`} and ${ml`[${1}; ${1}; ${4}]`} are not. Each set has exactly one representation, so two sets are equal exactly when their lists are, and a membership test can stop as soon as it passes the element it seeks.` },
    quickCheck({
      prompt: t`A module keeps sets of ints as strictly increasing lists, with the type abstract. Its ${ml`insert`} receives the set ${ml`[${2}; ${5}; ${8}]`} and the element ${5}. Which list must it return?`,
      answer: { kind: 'choice', options: [{ id: 'same', label: [ml`[${2}; ${5}; ${8}]`] }, { id: 'dup', label: [ml`[${2}; ${5}; ${5}; ${8}]`] }, { id: 'front', label: [ml`[${5}; ${2}; ${5}; ${8}]`] }], correct: 'same' },
      reference: ['same'],
      why: t`${5} is already in the set, and a strictly increasing list has no repeats and no element out of order, so the list stays as it was.`,
    }),
    { kind: 'pitfall', claim: t`Once sealed, ${ml`ListStack.empty = []`} is true, because inside the module ${ml`empty`} is ${ml`[]`}.`, counterexample: t`Outside the module the type ${ml`'a ListStack.t`} is abstract, so the comparison does not even type-check. That is the point: outside code cannot depend on the list.` },
    { kind: 'pitfall', claim: t`A structure must define exactly the names in its signature.`, counterexample: t`It must define at least those; it may define more, and the extra ones are simply hidden. Removing ${ml`add`} from a signature compiles and makes ${ml`add`} private.` },
    { kind: 'takeaway', text: t`A signature is the contract and the structure the implementation; make the type abstract and only the module's operations can touch its values.` },
  ],
  examples: [
    { ...complexWorked, examiner: t`The examiner wants each change classified, an error or not, with the reason: what sealing requires and what it hides.` },
    worked(sealing, { k1: 12, k2: 5, order: [1, 0, 3, 2], name: 'Money' }, t`What an abstract type allows`),
    worked(stackTrace, { ops: [{ push: 3 }, { push: 8 }, { push: 5 }, 'pop', { push: 6 }] }, t`Tracing a stack`),
  ],
  generators: [stackTrace, sealing, fraction],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['module', 'signature', 'abstract-type', 'representation-invariant'],
  cambridge: [stackOption, fractionReduced, abstracted],
  gate: ['cs3110-5-fraction-reduced', 'cs3110-5-stack-option'],
  recall: [
    { front: t`What is a signature?`, back: t`A module type: declarations ${ml`type t`} and ${ml`val x :`} ${math`\tau`} that a structure must provide, and the only names visible outside a module sealed by it.` },
    { front: t`What is an abstract type?`, back: t`A type declared in a signature without its definition: outside, its values can be handled only by the module's operations.` },
    { front: t`What is a representation invariant?`, back: t`A property of a module's internal values that every operation assumes of its inputs and establishes for its outputs.` },
  ],
};
