/**
 * fp.structural-induction: Structural induction. The lesson follows CS3110 Section 8.8
 * (Section 10.8 of the PDF edition, "Structural Induction": induction on naturals as
 * a variant, the induction principle for lists and the proof that append is associative,
 * the principle for trees and the proof that reflect is an involution) and FoCS Lecture 6
 * (leaves t = count t + 1, "proved by induction"). The problems are the CS3110 Chapter 8
 * exercises "append nil", "rev dist append", "rev involutive", "reflect size", and
 * "propositions".
 *
 * The equations the generators use are checked by running both sides, in the content checks,
 * on every generated input: rev (xs @ ys) = rev ys @ rev xs, and inorder (reflect t) =
 * rev (inorder t).
 */
import { cite, supervision, withUses } from '../cambridge';
import { code, codeBlock, oc, showList } from '../ocaml-code';
import { int } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { dmath, math, t, type Rich } from '../rich';
import { checkFrom, workedProof, worked, type TopicContent } from '../topic';
import type { Rng } from '@learnhub/mastery';

// ---------------------------------------------------------------- how many hypotheses

interface Ctor { name: string; args: readonly string[] }
interface Datatype { decl: string; name: string; ctors: readonly Ctor[] }

const TYPES: readonly Datatype[] = [
  { name: 'nat', decl: 'type nat = Z | S of nat', ctors: [{ name: 'Z', args: [] }, { name: 'S', args: ['nat'] }] },
  { name: "'a mylist", decl: "type 'a mylist = Nil | Cons of 'a * 'a mylist", ctors: [{ name: 'Nil', args: [] }, { name: 'Cons', args: ["'a", "'a mylist"] }] },
  { name: "'a tree", decl: "type 'a tree = Leaf | Node of 'a tree * 'a * 'a tree", ctors: [{ name: 'Leaf', args: [] }, { name: 'Node', args: ["'a tree", "'a", "'a tree"] }] },
  { name: 'prop', decl: 'type prop = Atom of string | Not of prop | And of prop * prop | Or of prop * prop | Imp of prop * prop', ctors: [{ name: 'Atom', args: ['string'] }, { name: 'Not', args: ['prop'] }, { name: 'And', args: ['prop', 'prop'] }, { name: 'Imp', args: ['prop', 'prop'] }] },
  { name: 'expr', decl: 'type expr = Num of float | Var of string | Neg of expr | Add of expr * expr | Mul of expr * expr', ctors: [{ name: 'Num', args: ['float'] }, { name: 'Neg', args: ['expr'] }, { name: 'Add', args: ['expr', 'expr'] }] },
  { name: "'a ternary", decl: "type 'a ternary = TLeaf | TNode of 'a * 'a ternary * 'a ternary * 'a ternary", ctors: [{ name: 'TLeaf', args: [] }, { name: 'TNode', args: ["'a", "'a ternary", "'a ternary", "'a ternary"] }] },
  { name: 'shape', decl: 'type shape = Null | Join of shape * shape', ctors: [{ name: 'Null', args: [] }, { name: 'Join', args: ['shape', 'shape'] }] },
];

interface IhP { ti: number; ci: number }

const recursiveArgs = (d: Datatype, c: Ctor): number => c.args.filter((a) => a === d.name).length;

const ihCount = generator<IhP>({
  id: 'ih-count',
  quick: true,
  skill: 'State the case of a structural induction for one constructor: one induction hypothesis for each argument of the type itself.',
  params: (rng) => {
    const ti = int(rng, 0, TYPES.length - 1);
    return { ti, ci: int(rng, 0, (TYPES[ti] as Datatype).ctors.length - 1) };
  },
  sane: ({ ti, ci }) => (ti >= 0 && ti < TYPES.length && ci >= 0 && ci < (TYPES[ti] as Datatype).ctors.length ? null : 'out of range'),
  problem: ({ ti, ci }) => {
    const d = TYPES[ti] as Datatype;
    const c = d.ctors[ci] as Ctor;
    const r = recursiveArgs(d, c);
    return {
      prompt: t`For ${codeBlock(code`${oc(d.decl)}`)} a proof by structural induction of a property ${math`P`} of every value of type ${code`${oc(d.name)}`} has one case per constructor. How many induction hypotheses does the case for ${code`${c.name}`} have?`,
      answer: { kind: 'exact', expected: String(r) },
      solution: [
        c.args.length === 0
          ? t`${code`${c.name}`} has no arguments, so it is a base case: nothing smaller to assume ${math`P`} of.`
          : t`${code`${c.name}`} takes ${c.args.length} ${c.args.length === 1 ? 'argument' : 'arguments'}, of types ${code`${oc(c.args.join(', '))}`}. Only those of type ${code`${oc(d.name)}`} are smaller values of the same type, and each gets a hypothesis ${math`P`}; the others are just data.`,
        t`So the case has ${r} ${r === 1 ? 'hypothesis' : 'hypotheses'}.`,
      ],
    };
  },
  solve: ({ ti, ci }) => {
    const d = TYPES[ti] as Datatype;
    let n = 0;
    for (const a of (d.ctors[ci] as Ctor).args) if (a === d.name) n++;
    return String(n);
  },
  misconceptions: ({ ti, ci }): Misconception[] => {
    const d = TYPES[ti] as Datatype;
    const c = d.ctors[ci] as Ctor;
    const r = recursiveArgs(d, c);
    const cands: [number, Rich][] = [
      [c.args.length, t`Not every argument gets a hypothesis: only those of type ${code`${oc(d.name)}`}. The others are labels or data.`],
      [1, r === 0 ? t`A constructor with no argument of type ${code`${oc(d.name)}`} is a base case, with no hypothesis.` : t`Each argument of type ${code`${oc(d.name)}`} gets its own hypothesis, as a tree node gets one for each subtree.`],
      [0, t`An argument of type ${code`${oc(d.name)}`} is a smaller value, and the induction may assume ${math`P`} of it.`],
      [r + 1, t`Count only the arguments of type ${code`${oc(d.name)}`}; the value being built is what you must prove ${math`P`} of, not a hypothesis.`],
      [r + 2, t`Count only the arguments of type ${code`${oc(d.name)}`}: each gives one hypothesis.`],
    ];
    const seen = new Set<number>([r]);
    const out: Misconception[] = [];
    for (const [v, why] of cands) if (!seen.has(v)) { seen.add(v); out.push({ response: String(v), why }); }
    return out.slice(0, 2);
  },
});

// ---------------------------------------------------------------- rev over append

interface RevP { xs: number[]; ys: number[] }

const revOf = (l: readonly number[]): number[] => [...l].reverse();
function revOptions({ xs, ys }: RevP): { options: ChoiceOption[]; idOf: (l: readonly number[]) => string } {
  const lists = [[...revOf(ys), ...revOf(xs)], [...revOf(xs), ...revOf(ys)], [...ys, ...xs]];
  const keys = [...new Set(lists.map(showList))].sort();
  return { options: keys.map((k, i) => ({ id: `o${i}`, label: [code`${oc(k)}`] })), idOf: (l) => `o${keys.indexOf(showList(l))}` };
}

const revAppend = generator<RevP>({
  id: 'rev-append',
  quick: true,
  skill: 'Use the theorem rev (xs @ ys) = rev ys @ rev xs: reversing a join reverses each part and swaps them.',
  params: (rng: Rng) => {
    const pool = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let i = pool.length - 1; i > 0; i--) { const j = int(rng, 0, i); [pool[i], pool[j]] = [pool[j] as number, pool[i] as number]; }
    const a = int(rng, 2, 3);
    return { xs: pool.slice(0, a), ys: pool.slice(a, a + int(rng, 2, 3)) };
  },
  sane: ({ xs, ys }) => (xs.length >= 2 && ys.length >= 2 && new Set([...xs, ...ys]).size === xs.length + ys.length ? null : 'out of range'),
  problem: ({ xs, ys }) => {
    const o = revOptions({ xs, ys });
    const right = [...revOf(ys), ...revOf(xs)];
    return {
      prompt: t`With ${code`rev`} the list reversal, what is ${code`rev (${xs} @ ${ys})`}?`,
      answer: { kind: 'choice', options: o.options, correct: o.idOf(right) },
      solution: [
        t`The exercise "rev dist append" proves, by induction on the first list, that ${code`rev (xs @ ys) = rev ys @ rev xs`}.`,
        t`So the answer is ${code`rev ${ys} @ rev ${xs}`}, which is ${code`${oc(showList(right))}`}: the last element of the join comes first.`,
      ],
    };
  },
  solve: ({ xs, ys }) => [revOptions({ xs, ys }).idOf(revOf([...xs, ...ys]))],
  misconceptions: ({ xs, ys }) => {
    const o = revOptions({ xs, ys });
    return [
      { response: [o.idOf([...revOf(xs), ...revOf(ys)])], why: t`Each part is reversed, but the order of the parts must swap too: the end of ${code`${ys}`} is the end of the whole list.` },
      { response: [o.idOf([...ys, ...xs])], why: t`Swapping the parts is not enough: each part must be reversed as well.` },
    ];
  },
});

// ---------------------------------------------------------------- reflect

type Tree = null | { l: Tree; v: number; r: Tree };
const src = (t_: Tree): string => (t_ === null ? 'Leaf' : `Node (${src(t_.l)}, ${t_.v}, ${src(t_.r)})`);
const reflect = (t_: Tree): Tree => (t_ === null ? null : { l: reflect(t_.r), v: t_.v, r: reflect(t_.l) });
const inorder = (t_: Tree): number[] => (t_ === null ? [] : [...inorder(t_.l), t_.v, ...inorder(t_.r)]);
const preorder = (t_: Tree): number[] => (t_ === null ? [] : [t_.v, ...preorder(t_.l), ...preorder(t_.r)]);
function randTree(rng: Rng, n: number, labels: number[]): Tree {
  if (n === 0) return null;
  const k = int(rng, 0, n - 1);
  const l = randTree(rng, k, labels);
  const v = labels.shift() as number;
  return { l, v, r: randTree(rng, n - 1 - k, labels) };
}

interface ReflP { tree: Tree }
function reflOptions(tree: Tree): { options: ChoiceOption[]; idOf: (l: readonly number[]) => string } {
  const lists = [revOf(inorder(tree)), inorder(tree), preorder(reflect(tree))];
  const keys = [...new Set(lists.map(showList))].sort();
  return { options: keys.map((k, i) => ({ id: `o${i}`, label: [code`${oc(k)}`] })), idOf: (l) => `o${keys.indexOf(showList(l))}` };
}

const reflectGen = generator<ReflP>({
  id: 'reflect-inorder',
  skill: 'Use a structurally proved equation about trees: the inorder of the mirror image is the reverse of the inorder.',
  params: (rng) => {
    for (;;) {
      const pool = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      for (let i = pool.length - 1; i > 0; i--) { const j = int(rng, 0, i); [pool[i], pool[j]] = [pool[j] as number, pool[i] as number]; }
      const tree = randTree(rng, int(rng, 3, 6), pool);
      const ls = [revOf(inorder(tree)), inorder(tree), preorder(reflect(tree))].map(showList);
      if (new Set(ls).size === 3) return { tree };
    }
  },
  sane: ({ tree }) => (new Set([revOf(inorder(tree)), inorder(tree), preorder(reflect(tree))].map(showList)).size === 3 ? null : 'out of range'),
  problem: ({ tree }) => {
    const o = reflOptions(tree);
    return {
      prompt: t`With CS${3110}'s ${codeBlock(code`let rec reflect = function`, code`  | Leaf -> Leaf`, code`  | Node (l, v, r) -> Node (reflect r, v, reflect l)`)} and ${code`inorder`} listing the left subtree, then the label, then the right subtree, what is ${code`inorder (reflect (${oc(src(tree))}))`}?`,
      answer: { kind: 'choice', options: o.options, correct: o.idOf(revOf(inorder(tree))) },
      solution: [
        t`By structural induction, ${code`inorder (reflect t) = rev (inorder t)`}: for ${code`Node (l, v, r)`} the left side is ${code`inorder (reflect r) @ [v] @ inorder (reflect l)`}, and the two hypotheses turn it into ${code`rev (inorder r) @ [v] @ rev (inorder l)`}, which is ${code`rev (inorder l @ [v] @ inorder r)`}.`,
        t`Here ${code`inorder t`} is ${code`${oc(showList(inorder(tree)))}`}, so the answer is its reverse, ${code`${oc(showList(revOf(inorder(tree))))}`}.`,
      ],
    };
  },
  solve: ({ tree }) => [reflOptions(tree).idOf(inorder(reflect(tree)))],
  misconceptions: ({ tree }) => {
    const o = reflOptions(tree);
    return [
      { response: [o.idOf(inorder(tree))], why: t`Reflecting swaps left and right at every node, so the inorder runs backwards.` },
      { response: [o.idOf(preorder(reflect(tree)))], why: t`That is the preorder of the reflected tree, with each label before its subtrees. Inorder puts it between them.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

const appendNil = workedProof({
  title: t`Appending the empty list`,
  prompt: t`Prove that for all ${code`lst`}, ${code`lst @ [] = lst`}, by induction on ${code`lst`}, where ${codeBlock(code`let rec append lst${1} lst${2} = match lst${1} with`, code`  | [] -> lst${2}`, code`  | h :: t -> h :: append t lst${2}`, code`let ( @ ) = append`)}`,
  steps: [
    t`Proof by structural induction on ${code`lst`}, with ${math`P(\mathit{lst})`}: ${code`lst @ [] = lst`}.`,
    t`Base case ${code`lst = []`}: ${code`[] @ []`} ${math`=`} ${code`[]`} by evaluation (the first case of ${code`append`}). So ${math`P([\,])`} holds.`,
    t`Inductive case ${code`lst = h :: t`}, with hypothesis ${math`P(t)`}: ${code`t @ [] = t`}. Then ${code`(h :: t) @ []`} ${math`=`} ${code`h :: (t @ [])`} by evaluation, ${math`=`} ${code`h :: t`} by the hypothesis.`,
    t`So ${math`P(h :: t)`} holds, and by the induction principle for lists, ${code`lst @ [] = lst`} for every list. ${math`\blacksquare`}`,
    t`Note why induction is needed: ${code`[] @ lst = lst`} is one evaluation step, but ${code`append`} recurses on its first argument, so ${code`lst @ []`} only reaches ${code`[]`} after walking all of ${code`lst`}.`,
  ],
  answer: t`${code`lst @ [] = lst`} for every list ${code`lst`}, by structural induction.`,
  source: cite('cs3110-ex8', 'Exercise "append nil"'),
});

const revDist = supervision({
  id: 'cs3110-ex8-rev-dist-append',
  source: cite('cs3110-ex8', 'Exercise "rev dist append"'),
  title: t`Reverse distributes over append`,
  prompt: t`Prove that ${code`rev (lst${1} @ lst${2}) = rev lst${2} @ rev lst${1}`} for all lists, where ${code`let rec rev = function [] -> [] | h :: t -> rev t @ [h]`}. Choose which list to induct over, and say why. You will need "append nil" as a lemma, and the associativity of ${code`@`}, proved in the lesson.`,
  writeUp: 'proof',
});
const revInv = supervision({
  id: 'cs3110-ex8-rev-involutive',
  source: cite('cs3110-ex8', 'Exercise "rev involutive"'),
  title: t`Reversing twice`,
  prompt: t`Prove that ${code`rev (rev lst) = lst`} for every list ${code`lst`}, by induction on ${code`lst`}, with ${code`rev`} as in the previous exercise. You will need the previous exercise as a lemma: show exactly where.`,
  writeUp: 'proof',
});
const reflectSize = supervision({
  id: 'cs3110-ex8-reflect-size',
  source: cite('cs3110-ex8', 'Exercise "reflect size"'),
  title: t`Reflection keeps the size`,
  prompt: t`Prove that ${code`size (reflect t) = size t`} for every tree ${code`t`}, by induction on ${code`t`}, where ${codeBlock(code`let rec size = function Leaf -> ${0} | Node (l, v, r) -> ${1} + size l + size r`, code`let rec reflect = function Leaf -> Leaf | Node (l, v, r) -> Node (reflect r, v, reflect l)`)} State both induction hypotheses, and the law of arithmetic your last step uses.`,
  writeUp: 'proof',
});
const propositions = supervision({
  id: 'cs3110-ex8-propositions',
  source: cite('cs3110-ex8', 'Exercise "propositions"'),
  title: t`The induction principle for propositions`,
  prompt: t`In propositional logic there are atomic propositions, negation, conjunction, disjunction, and implication. Define an OCaml type to represent propositions. Then state the induction principle for that type: one case per constructor, with an induction hypothesis for each argument of the type itself.`,
  writeUp: 'explanation',
});

// ---------------------------------------------------------------- lesson

const XS = [1, 2, 3];

export const fpStructuralInduction: TopicContent = {
  topicId: 'fp.structural-induction',
  goal: t`Prove properties of functions on lists and trees, such as ${math`\mathrm{rev}(\mathrm{rev}\ xs) = xs`}, by induction on the structure of the data.`,
  objective: t`Prove properties of list and tree functions by induction on the structure of the data.`,
  why: t`Most functions recurse on lists and trees; structural induction is how their correctness is proved in the Tripos.`,
  minutes: 30,
  lesson: [
    { kind: 'section', title: t`Induction without numbers` },
    { kind: 'hook', text: t`Reversing a list twice gives it back: ${code`rev (rev ${XS})`} is ${code`${XS}`}. You believe it for every list. But ordinary induction runs over numbers ${math`${0}, ${1}, ${2}, \ldots`}, and a list is not a number. What do you induct on?` },
    { kind: 'narrative', text: t`Look at how lists are built: from ${code`[]`}, by putting one element on the front with ${code`::`}, again and again. That is exactly how the naturals are built from ${0} by adding ${1}; CS${3110} even defines ${code`type nat = Z | S of nat`} to make the likeness plain. So the same domino argument works: if ${math`P`} holds for ${code`[]`}, and passes from every list ${code`t`} to ${code`h :: t`}, it holds for every list.` },
    {
      kind: 'theorem',
      name: t`Induction principle for lists`,
      statement: t`Let ${math`P`} be a property of lists. If ${math`P([\,])`} holds, and for all ${code`h`} and ${code`t`}, ${math`P(t)`} implies ${math`P(h :: t)`}, then ${math`P(\mathit{lst})`} holds for every list ${code`lst`}.`,
    },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Reduce to numbers`, text: t`Let ${math`Q(n)`} be: ${math`P(\mathit{lst})`} holds for every list ${code`lst`} of length ${math`n`}. We prove ${math`Q(n)`} for all ${math`n \ge ${0}`} by ordinary induction.` },
        { label: t`Base case`, text: t`The only list of length ${0} is ${code`[]`}, and ${math`P([\,])`} holds by assumption.` },
        { label: t`Inductive step`, text: t`Assume ${math`Q(n)`}. A list of length ${math`n + ${1}`} is ${code`h :: t`} with ${code`t`} of length ${math`n`}, so ${math`P(t)`} holds by ${math`Q(n)`}, and then ${math`P(h :: t)`} by the second assumption. So ${math`Q(n + ${1})`} holds.` },
        { label: t`Conclude`, text: t`Every list has some finite length ${math`n`}, so ${math`Q(n)`} gives ${math`P`} for it.` },
      ],
    },
    {
      kind: 'definition',
      name: t`Structural induction`,
      formal: t`For a variant type ${code`t`}, [[structural-induction|structural induction]] proves a property ${math`P`} of every value of type ${code`t`} with one case per constructor: for a constructor ${code`C`} with arguments ${math`a_{${1}}, \ldots, a_{k}`}, assume ${math`P(a_{i})`} for each argument ${math`a_{i}`} of type ${code`t`} (the induction hypotheses), and prove ${math`P(C(a_{${1}}, \ldots, a_{k}))`}. Constructors with no argument of type ${code`t`} are the base cases.`,
      plain: t`One case per way of building the data, with a hypothesis for each smaller piece of the same type. For CS${3110}'s trees, ${code`type 'a tree = Leaf | Node of 'a tree * 'a * 'a tree`}, the ${code`Node (l, v, r)`} case has two hypotheses, ${math`P(l)`} and ${math`P(r)`}.`,
    },
    checkFrom(ihCount, { ti: 2, ci: 1 }, t`${code`Node`} has two arguments of type ${code`'a tree`}, the subtrees, so two hypotheses; the label ${code`v`} is just data.`),
    { kind: 'section', title: t`Append is associative` },
    { kind: 'narrative', text: t`CS${3110}'s first example. With ${code`append`} defined by recursion on its first argument, ${code`[] @ ys = ys`} and ${code`(h :: t) @ ys = h :: (t @ ys)`}, we prove ${code`xs @ (ys @ zs) = (xs @ ys) @ zs`}. Since ${code`@`} recurses on its left argument, induct on ${code`xs`}, the list that is taken apart.` },
    {
      kind: 'theorem',
      name: t`Associativity of append`,
      statement: t`For all lists ${code`xs`}, ${code`ys`}, ${code`zs`} of one type, ${code`xs @ (ys @ zs) = (xs @ ys) @ zs`}.`,
    },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`The property`, text: t`By induction on ${code`xs`}, with ${math`P(\mathit{xs})`}: for all ${code`ys`}, ${code`zs`}, ${code`xs @ (ys @ zs) = (xs @ ys) @ zs`}.` },
        { label: t`Base case`, text: t`${code`[] @ (ys @ zs)`} ${math`=`} ${code`ys @ zs`} by evaluation, and ${code`([] @ ys) @ zs`} ${math`=`} ${code`ys @ zs`} by evaluation of the inner append. Equal.` },
        { label: t`Inductive case, left side`, text: t`Let ${code`xs = h :: t`} and assume ${math`P(t)`}.`, eq: [code`(h :: t) @ (ys @ zs) = h :: (t @ (ys @ zs)) = h :: ((t @ ys) @ zs)`], plain: t`The first step is evaluation, the second the induction hypothesis.` },
        { label: t`Inductive case, right side`, text: t`Evaluate the inner append, then the outer one.`, eq: [code`((h :: t) @ ys) @ zs = (h :: (t @ ys)) @ zs = h :: ((t @ ys) @ zs)`] },
        { label: t`Conclude`, text: t`Both sides equal ${code`h :: ((t @ ys) @ zs)`}, so ${math`P(h :: t)`} holds, and by the induction principle the theorem holds for every ${code`xs`}.` },
      ],
    },
    { kind: 'section', title: t`Trees: two hypotheses` },
    { kind: 'narrative', text: t`On trees the method is the same, with one hypothesis per subtree. CS${3110} proves that reflecting a tree twice gives it back: for ${code`Node (l, v, r)`}, two reflections swap the subtrees twice, and the hypotheses ${code`reflect (reflect l) = l`} and ${code`reflect (reflect r) = r`} finish it.` },
    {
      kind: 'steps',
      steps: [
        { label: t`Unfold twice`, text: t`${code`reflect (reflect (Node (l, v, r)))`} ${math`=`} ${code`reflect (Node (reflect r, v, reflect l))`} ${math`=`} ${code`Node (reflect (reflect l), v, reflect (reflect r))`}, by evaluation twice.` },
        { label: t`Use both hypotheses`, text: t`By the two induction hypotheses this is ${code`Node (l, v, r)`}.`, eq: [dmath`\checkmark`] },
      ],
    },
    {
      kind: 'p',
      text: t`FoCS's fact ${math`\mathrm{leaves}(t) = \mathrm{count}(t) + ${1}`} from the lesson on trees is a structural induction too: the ${code`Lf`} case is a base case, and the ${code`Br`} case adds the two hypotheses. The strong induction on ${code`count`} used there is this principle with the bookkeeping written out.`,
    },
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`It does not matter which list you induct on.`, counterexample: t`For ${code`xs @ (ys @ zs)`}, induction on ${code`ys`} gets stuck: ${code`@`} recurses on its left argument, so ${code`xs @ (h :: t)`} cannot be evaluated further when ${code`xs`} is unknown. Induct on the argument the functions take apart.` },
    { kind: 'pitfall', claim: t`A tree case needs only one hypothesis, for the left subtree.`, counterexample: t`The case ${code`Node (l, v, r)`} has two smaller trees, and proofs like ${code`size (reflect t) = size t`} need ${math`P(l)`} and ${math`P(r)`} both.` },
    { kind: 'pitfall', claim: t`Fix ${code`ys`} and ${code`zs`} before the induction starts.`, counterexample: t`State ${math`P(\mathit{xs})`} with "for all ${code`ys`}, ${code`zs`}" inside, as CS${3110} does. Here it happens not to matter, but in proofs like the accumulator lemma the hypothesis must be used with other values, as in the lesson on proving functions correct.` },
    { kind: 'takeaway', text: t`To prove a property of every list or tree, prove it for each constructor, assuming it for each smaller piece of the same type: one hypothesis for the tail of a list, two for the subtrees of a node, and induct on the argument the functions recurse on.` },
  ],
  examples: [
    appendNil,
    worked(revAppend, { xs: [1, 2, 3], ys: [4, 5] }, t`Reversing a join`),
    worked(ihCount, { ti: 3, ci: 2 }, t`The hypotheses for a conjunction`),
  ],
  generators: [ihCount, revAppend, reflectGen],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['structural-induction'],
  cambridge: withUses([revDist, revInv, reflectSize, propositions], {
    'cs3110-ex8-rev-involutive': { sections: ['Induction without numbers', 'Append is associative'], note: t`Structural induction on lists with a lemma` },
    'cs3110-ex8-reflect-size': { sections: ['Trees: two hypotheses'], note: t`Structural induction on trees with two hypotheses` },
    'cs3110-ex8-rev-dist-append': { sections: ['Induction without numbers', 'Append is associative'], note: t`Choosing which list to induct on` },
  }),
  gate: ['cs3110-ex8-rev-involutive', 'cs3110-ex8-reflect-size', 'cs3110-ex8-rev-dist-append'],
  recall: [
    { front: t`State the induction principle for lists.`, back: t`If ${math`P([\,])`}, and ${math`P(t)`} implies ${math`P(h :: t)`} for all ${code`h`}, ${code`t`}, then ${math`P`} holds for every list.` },
    { front: t`State the induction principle for binary trees.`, back: t`If ${math`P(\texttt{Leaf})`}, and ${math`P(l)`} and ${math`P(r)`} imply ${math`P(\texttt{Node}(l, v, r))`} for all ${math`l, v, r`}, then ${math`P`} holds for every tree.` },
    { front: t`How many induction hypotheses does a constructor's case have?`, back: t`One for each of its arguments whose type is the type being defined.` },
  ],
  proofOrder: [
    {
      title: t`Append is associative`,
      steps: [
        t`Induct on ${code`xs`}, the argument ${code`@`} recurses on.`,
        t`Base case: both sides evaluate to ${code`ys @ zs`}.`,
        t`Inductive case: the left side evaluates to ${code`h :: (t @ (ys @ zs))`}, then by the hypothesis to ${code`h :: ((t @ ys) @ zs)`}.`,
        t`The right side evaluates to ${code`h :: ((t @ ys) @ zs)`} as well.`,
      ],
    },
  ],
};
