/**
 * fp.trees: Binary trees. The lesson follows FoCS Lectures 6 and 7 (binary trees as a
 * recursive datatype; count, depth, leaves; leaves t = count t + 1; preorder, inorder, and
 * postorder; their quadratic cost and the accumulator versions) and CS3110 Section 3.11.
 * The problems are FoCS Exercises 6.2, 6.3, and 7.6, and the CS3110 Chapter 3 exercises
 * "depth" and "shape".
 *
 * Every OCaml answer was run in the OCaml 4.11.1 toplevel (scratch file ocamlE/t11.ml):
 *   ftree 1 3 = Br (1, Br (2, Br (4, Lf, Lf), Br (5, Lf, Lf)), Br (3, Br (6, Lf, Lf), Br (7, Lf, Lf)))
 *   inorder (ftree 1 3) = [4; 2; 5; 1; 6; 3; 7]
 *   for t = Br (1, Br (2, Br (4, Lf, Lf), Br (5, Lf, Lf)), Br (3, Lf, Lf)):
 *   preorder t = [1; 2; 4; 5; 3]; (count t, depth t, leaves t) = (5, 3, 6)
 */
import { auto, cite, same, supervision } from '../cambridge';
import { code, codeBlock, oc, showList } from '../ocaml-code';
import { int, pick } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { dmath, math, t, type Rich } from '../rich';
import { checkFrom, workedCambridge, worked, type TopicContent } from '../topic';
import type { Rng } from '@learnhub/mastery';

/** A binary tree: null is Lf, an object is Br (v, l, r). */
export type Tree = null | { v: number; l: Tree; r: Tree };

const br = (v: number, l: Tree, r: Tree): Tree => ({ v, l, r });
export const treeSrc = (t: Tree): string => (t === null ? 'Lf' : `Br (${t.v}, ${treeSrc(t.l)}, ${treeSrc(t.r)})`);
export const count = (t: Tree): number => (t === null ? 0 : 1 + count(t.l) + count(t.r));
export const depth = (t: Tree): number => (t === null ? 0 : 1 + Math.max(depth(t.l), depth(t.r)));
export const leaves = (t: Tree): number => (t === null ? 1 : leaves(t.l) + leaves(t.r));
const leafNodes = (t: Tree): number => (t === null ? 0 : t.l === null && t.r === null ? 1 : leafNodes(t.l) + leafNodes(t.r));
const preorder = (t: Tree): number[] => (t === null ? [] : [t.v, ...preorder(t.l), ...preorder(t.r)]);
const inorder = (t: Tree): number[] => (t === null ? [] : [...inorder(t.l), t.v, ...inorder(t.r)]);
const postorder = (t: Tree): number[] => (t === null ? [] : [...postorder(t.l), ...postorder(t.r), t.v]);

/** A random shape of n nodes, labelled from `labels` in preorder. */
function randTree(rng: Rng, n: number, labels: number[]): Tree {
  if (n === 0) return null;
  const v = labels.shift() as number;
  const k = int(rng, 0, n - 1);
  const l = randTree(rng, k, labels);
  return br(v, l, randTree(rng, n - 1 - k, labels));
}
function shuffled(rng: Rng, xs: readonly number[]): number[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) { const j = int(rng, 0, i); [a[i], a[j]] = [a[j] as number, a[i] as number]; }
  return a;
}

const TREE_DECL = code`type 'a tree = Lf | Br of 'a * 'a tree * 'a tree`;

// ---------------------------------------------------------------- measuring a tree

type Measure = 'count' | 'depth' | 'leaves';
const MEASURES: readonly Measure[] = ['count', 'depth', 'leaves'];
const MEASURE_DEF: Readonly<Record<Measure, Rich[number]>> = {
  count: codeBlock(code`let rec count = function`, code`  | Lf -> ${0}`, code`  | Br (v, t${1}, t${2}) -> ${1} + count t${1} + count t${2}`),
  depth: codeBlock(code`let rec depth = function`, code`  | Lf -> ${0}`, code`  | Br (v, t${1}, t${2}) -> ${1} + max (depth t${1}) (depth t${2})`),
  leaves: codeBlock(code`let rec leaves = function`, code`  | Lf -> ${1}`, code`  | Br (v, t${1}, t${2}) -> leaves t${1} + leaves t${2}`),
};

interface MeasureP { m: number; tree: Tree }

const measure = generator<MeasureP>({
  id: 'measure',
  quick: true,
  skill: 'Compute count, depth, or leaves of a tree written as an OCaml value, following FoCS\'s recursive definitions.',
  params: (rng) => ({ m: int(rng, 0, 2), tree: randTree(rng, int(rng, 3, 6), shuffled(rng, [1, 2, 3, 4, 5, 6, 7, 8, 9])) }),
  sane: ({ m, tree }) => (m >= 0 && m <= 2 && count(tree) >= 3 ? null : 'out of range'),
  problem: ({ m, tree }) => {
    const which = MEASURES[m] as Measure;
    const val = which === 'count' ? count(tree) : which === 'depth' ? depth(tree) : leaves(tree);
    return {
      prompt: t`With ${TREE_DECL} and ${MEASURE_DEF[which]} what is ${code`${which} (${oc(treeSrc(tree))})`}?`,
      answer: { kind: 'exact', expected: String(val) },
      solution: [
        which === 'count'
          ? t`${code`count`} adds ${1} for each ${code`Br`} and ${0} for each ${code`Lf`}: it counts the labels, ${code`${oc(showList(preorder(tree)))}`}.`
          : which === 'depth'
            ? t`${code`depth`} counts the ${code`Br`} nodes on a longest path from the root down to an ${code`Lf`}; here such a path has ${val}.`
            : t`${code`leaves`} counts the ${code`Lf`}s. The tree has ${count(tree)} ${code`Br`} nodes, each with two subtrees, and every ${code`Lf`} hangs below one of them.`,
        which === 'leaves' ? t`So there are ${val} of them: one more than the ${count(tree)} branch nodes, as the theorem in the lesson says.` : t`So the answer is ${val}.`,
      ],
    };
  },
  solve: ({ m, tree }) => {
    // Walk the tree with an explicit stack instead of the recursive definitions.
    let [br_, lf, best] = [0, 0, 0];
    const stack: [Tree, number][] = [[tree, 0]];
    while (stack.length > 0) {
      const [t_, d] = stack.pop() as [Tree, number];
      if (t_ === null) { lf++; best = Math.max(best, d); continue; }
      br_++;
      stack.push([t_.l, d + 1], [t_.r, d + 1]);
    }
    return String([br_, best, lf][m]);
  },
  misconceptions: ({ m, tree }): Misconception[] => {
    const which = MEASURES[m] as Measure;
    if (which === 'count') return [
      { response: String(count(tree) + 1), why: t`That counts the ${code`Lf`}s, which is ${code`leaves`}. ${code`count`} gives ${0} for ${code`Lf`} and counts only the labelled nodes.` },
      { response: String(2 * count(tree) + 1), why: t`${code`Lf`} contributes ${0} to ${code`count`}: only the ${code`Br`} nodes count.` },
    ];
    if (which === 'depth') return [
      { response: String(depth(tree) - 1), why: t`FoCS's ${code`depth`} counts nodes on the longest path, not edges between them: a single ${code`Br`} has depth ${1}.` },
      { response: String(depth(tree) + 1), why: t`${code`Lf`} has depth ${0}, so the empty subtrees at the bottom add nothing.` },
    ];
    return [
      { response: String(count(tree)), why: t`${code`leaves`} counts the ${code`Lf`}s, and there is always one more of them than there are ${code`Br`} nodes.` },
      { response: String(leafNodes(tree)), why: t`That counts the labelled nodes with two empty subtrees. FoCS's ${code`leaves`} counts the empty trees ${code`Lf`} themselves.` },
    ];
  },
});

// ---------------------------------------------------------------- traversals

type Order = 'preorder' | 'inorder' | 'postorder';
const ORDERS: readonly Order[] = ['preorder', 'inorder', 'postorder'];
const ORDER_FN: Readonly<Record<Order, (t: Tree) => number[]>> = { preorder, inorder, postorder };

interface TravP { o: number; tree: Tree }

function travOptions(tree: Tree): { options: ChoiceOption[]; idOf: (l: readonly number[]) => string } {
  const lists = [...ORDERS.map((o) => ORDER_FN[o](tree)), [...preorder(tree)].reverse()];
  const keys = [...new Set(lists.map(showList))].sort();
  return { options: keys.map((k, i) => ({ id: `o${i}`, label: [code`${oc(k)}`] })), idOf: (l) => `o${keys.indexOf(showList(l))}` };
}

const traversal = generator<TravP>({
  id: 'traversal',
  skill: 'List a tree\'s labels in preorder (label first), inorder (label between the subtrees), or postorder (label last).',
  params: (rng) => {
    for (;;) {
      const tree = randTree(rng, int(rng, 4, 6), shuffled(rng, [1, 2, 3, 4, 5, 6, 7, 8, 9]));
      const ls = [...ORDERS.map((o) => ORDER_FN[o](tree)), [...preorder(tree)].reverse()].map(showList);
      if (new Set(ls).size === 4) return { o: int(rng, 0, 2), tree };
    }
  },
  sane: ({ o, tree }) => {
    const ls = [...ORDERS.map((x) => ORDER_FN[x](tree)), [...preorder(tree)].reverse()].map(showList);
    return o >= 0 && o <= 2 && new Set(ls).size === 4 ? null : 'out of range';
  },
  problem: ({ o, tree }) => {
    const ord = ORDERS[o] as Order;
    const opts = travOptions(tree);
    const root = (tree as { v: number }).v;
    return {
      prompt: t`What is ${code`${ord} (${oc(treeSrc(tree))})`}, where ${code`${ord}`} lists the labels with each node's label ${ord === 'preorder' ? 'before' : ord === 'inorder' ? 'between' : 'after'} its left and right subtrees?`,
      answer: { kind: 'choice', options: opts.options, correct: opts.idOf(ORDER_FN[ord](tree)) },
      solution: [
        t`The root's label is ${root}. ${ord === 'preorder' ? t`In preorder it comes first, then the whole left subtree in preorder, then the right.` : ord === 'inorder' ? t`In inorder the whole left subtree comes first, then ${root}, then the right subtree.` : t`In postorder both subtrees come first, left then right, and ${root} last.`}`,
        t`Applying the same rule inside each subtree gives ${code`${oc(showList(ORDER_FN[ord](tree)))}`}.`,
      ],
    };
  },
  solve: ({ o, tree }) => {
    // Visit with an explicit stack, emitting the label at the visit the order asks for.
    const out: number[] = [];
    const stack: [Tree, number][] = [[tree, 0]];
    while (stack.length > 0) {
      const [n, stage] = stack.pop() as [Tree, number];
      if (n === null) continue;
      if (stage === o) out.push(n.v);
      if (stage < 3) {
        stack.push([n, stage + 1]);
        if (stage === 0) stack.push([n.l, 0]);
        if (stage === 1) stack.push([n.r, 0]);
      }
    }
    return [travOptions(tree).idOf(out)];
  },
  misconceptions: ({ o, tree }): Misconception[] => {
    const opts = travOptions(tree);
    const ord = ORDERS[o] as Order;
    const out: Misconception[] = ORDERS.filter((x) => x !== ord).map((x) => ({ response: [opts.idOf(ORDER_FN[x](tree))], why: t`That is the ${x}: the label comes ${x === 'preorder' ? 'before' : x === 'inorder' ? 'between' : 'after'} the subtrees. ${ord === 'preorder' ? 'Preorder puts it first.' : ord === 'inorder' ? 'Inorder puts it between them.' : 'Postorder puts it last.'}` }));
    out.push({ response: [opts.idOf([...preorder(tree)].reverse())], why: t`Postorder is not preorder backwards: both still visit the left subtree before the right.` });
    return out.filter((m) => m.response[0] !== opts.idOf(ORDER_FN[ord](tree)));
  },
});

// ---------------------------------------------------------------- how much a tree of depth d holds

interface BoundP { form: number; x: number }

const bound = generator<BoundP>({
  id: 'size-bound',
  quick: true,
  skill: 'Use count t <= 2^(depth t) - 1: the most labels a tree of depth d holds, and the least depth that holds n labels.',
  params: (rng) => {
    const form = int(rng, 0, 1);
    if (form === 0) return { form, x: int(rng, 3, 20) };
    for (;;) {
      const x = int(rng, 5, 2000);
      // Not one less than a power of two, so the floor and ceiling slips differ.
      if (!Number.isInteger(Math.log2(x + 1)) && !Number.isInteger(Math.log2(x))) return { form, x };
    }
  },
  sane: ({ form, x }) => (form === 0 ? x >= 3 && x <= 20 : x >= 5 && !Number.isInteger(Math.log2(x + 1)) && !Number.isInteger(Math.log2(x))) ? null : 'out of range',
  problem: ({ form, x }) => {
    if (form === 0) {
      return {
        prompt: t`FoCS states that every tree ${code`t`} has ${math`\mathrm{count}(t) \le ${2}^{\mathrm{depth}(t)} - ${1}`}. What is the largest number of labels a tree of depth ${x} can hold?`,
        answer: { kind: 'exact', expected: String(2 ** x - 1) },
        solution: [
          t`The bound is reached by the complete tree, every level full: ${math`${1} + ${2} + \cdots + ${2}^{${x - 1}}`} nodes on ${x} levels.`,
          t`That sum is ${math`${2}^{${x}} - ${1} = ${2 ** x - 1}`}.`,
        ],
      };
    }
    const d = Math.ceil(Math.log2(x + 1));
    return {
      prompt: t`Every tree has ${math`\mathrm{count}(t) \le ${2}^{\mathrm{depth}(t)} - ${1}`}, and complete trees reach it. What is the smallest depth of a tree holding ${x} labels?`,
      answer: { kind: 'exact', expected: String(d) },
      solution: [
        t`We need ${math`${2}^{d} - ${1} \ge ${x}`}, that is ${math`${2}^{d} \ge ${x + 1}`}.`,
        t`${math`${2}^{${d - 1}} = ${2 ** (d - 1)}`} is too small and ${math`${2}^{${d}} = ${2 ** d}`} is enough, so the smallest depth is ${d}: short paths, compared with a list of ${x}.`,
      ],
    };
  },
  solve: ({ form, x }) => {
    if (form === 0) { let s = 0; for (let i = 0; i < x; i++) s += 2 ** i; return String(s); }
    let d = 0;
    while (2 ** d - 1 < x) d++;
    return String(d);
  },
  misconceptions: ({ form, x }): Misconception[] => form === 0
    ? [
      { response: String(2 ** x), why: t`A tree of depth ${x} has ${x} levels, holding ${1}, ${2}, ${4}, and so on: the total is one less than ${math`${2}^{${x}}`}.` },
      { response: String(2 ** (x - 1)), why: t`That is only the bottom level. Add all ${x} levels: ${math`${2}^{${x}} - ${1}`}.` },
    ]
    : [
      { response: String(Math.floor(Math.log2(x))), why: t`At that depth a tree holds at most ${2 ** Math.floor(Math.log2(x)) - 1} labels, fewer than ${x}.` },
      { response: String(Math.ceil(Math.log2(x + 1)) + 1), why: t`One level fewer is already enough: ${math`${2}^{${Math.ceil(Math.log2(x + 1))}} - ${1} \ge ${x}`}.` },
    ],
});

// ---------------------------------------------------------------- Cambridge problems

const ftree = (k: number, n: number): Tree => (n === 0 ? null : br(k, ftree(2 * k, n - 1), ftree(2 * k + 1, n - 1)));
const FT_N = 3;
const FT = ftree(1, FT_N);
const FTREE_DEF = codeBlock(code`let rec ftree k n =`, code`  if n = ${0} then Lf`, code`  else Br (k, ftree (${2} * k) (n - ${1}), ftree (${2} * k + ${1}) (n - ${1}))`);

const ftreeWorked = auto({
  id: 'focs-6-3',
  source: cite('focs-notes', 'Lecture 6, Exercise 6.3'),
  title: t`What ftree builds`,
  prompt: t`With ${TREE_DECL}, examine ${FTREE_DEF} What does ${code`ftree ${1} n`} accomplish?`,
  answer: {
    kind: 'choice',
    options: [
      { id: 'complete', label: t`It builds the complete tree of depth ${math`n`}, every level full, labelled ${1} to ${math`${2}^{n} - ${1}`} level by level, left to right: node ${math`k`} has children ${math`${2}k`} and ${math`${2}k + ${1}`}.` },
      { id: 'path', label: t`It builds a path of ${math`n`} nodes labelled ${1} to ${math`n`}.` },
      { id: 'inorder', label: t`It builds a complete tree of depth ${math`n`} whose labels read ${1} to ${math`${2}^{n} - ${1}`} in inorder.` },
      { id: 'loop', label: t`It does not terminate, because the labels grow without bound.` },
    ],
    correct: 'complete',
  },
  solution: [
    t`For ${math`n > ${0}`} every call makes a ${code`Br`} with two recursive calls on ${math`n - ${1}`}, so all paths have length ${math`n`}: the tree is complete, of depth ${math`n`}, with ${math`${2}^{n} - ${1}`} nodes. It terminates because ${math`n`} decreases.`,
    t`The root is labelled ${1}. A node labelled ${math`k`} gets children ${math`${2}k`} and ${math`${2}k + ${1}`}, so level ${2} holds ${2}, ${3}; level ${3} holds ${4} to ${7}; and so on: the labels count ${1}, ${2}, ${3}, ... level by level, left to right.`,
    t`For example ${code`ftree ${1} ${FT_N}`} is ${code`${oc(treeSrc(FT))}`}. This is the numbering used to store a complete tree in an array, as in a heap.`,
  ],
  reference: ['complete'],
  // OCaml 4.11.1: ftree 1 3 = Br (1, Br (2, Br (4, Lf, Lf), Br (5, Lf, Lf)), Br (3, Br (6, Lf, Lf), Br (7, Lf, Lf))).
  verify: () => {
    // Breadth-first labels of ftree 1 n are 1, 2, ..., 2^n - 1, for n up to 6.
    for (let n = 1; n <= 6; n++) {
      const t_ = ftree(1, n);
      const q: Tree[] = [t_];
      const seen: number[] = [];
      while (q.length > 0) { const x = q.shift() as Tree; if (x !== null) { seen.push(x.v); q.push(x.l, x.r); } }
      if (seen.join(',') !== Array.from({ length: 2 ** n - 1 }, (_, i) => i + 1).join(',') || depth(t_) !== n) return `n = ${n}`;
    }
    return same('ftree 1 3', treeSrc(FT), 'Br (1, Br (2, Br (4, Lf, Lf), Br (5, Lf, Lf)), Br (3, Br (6, Lf, Lf), Br (7, Lf, Lf)))');
  },
  misconceptions: [
    { response: ['path'], why: t`Each call with ${math`n > ${0}`} makes two recursive calls, so the tree branches at every level.` },
    { response: ['inorder'], why: t`The inorder of ${code`ftree ${1} ${FT_N}`} is ${code`${oc(showList(inorder(FT)))}`}, not ${1} to ${7}: the labels count up level by level.` },
  ],
});

const ftreeInorder = auto({
  id: 'focs-6-3-inorder',
  source: cite('focs-notes', 'Lecture 6, Exercise 6.3, with Lecture 7, Section 7.5', true),
  title: t`The inorder of ftree`,
  prompt: t`With FoCS's ${FTREE_DEF} and ${codeBlock(code`let rec inorder = function`, code`  | Lf -> []`, code`  | Br (v, t${1}, t${2}) -> inorder t${1} @ [v] @ inorder t${2}`)} what is ${code`inorder (ftree ${1} ${FT_N})`}?`,
  answer: {
    kind: 'choice',
    options: [
      { id: 'right', label: [code`${oc(showList(inorder(FT)))}`] },
      { id: 'pre', label: [code`${oc(showList(preorder(FT)))}`] },
      { id: 'level', label: [code`${oc(showList([1, 2, 3, 4, 5, 6, 7]))}`] },
      { id: 'post', label: [code`${oc(showList(postorder(FT)))}`] },
    ],
    correct: 'right',
  },
  solution: [
    t`${code`ftree ${1} ${FT_N}`} is ${code`${oc(treeSrc(FT))}`}.`,
    t`Inorder lists the left subtree, then the root, then the right subtree. The left subtree, rooted at ${2}, gives ${code`[${4}; ${2}; ${5}]`}; then ${1}; then the right subtree gives ${code`[${6}; ${3}; ${7}]`}.`,
    t`So the result is ${code`${oc(showList(inorder(FT)))}`}.`,
  ],
  reference: ['right'],
  // OCaml 4.11.1: inorder (ftree 1 3) = [4; 2; 5; 1; 6; 3; 7].
  verify: () => same('inorder (ftree 1 3)', showList(inorder(FT)), '[4; 2; 5; 1; 6; 3; 7]'),
  misconceptions: [
    { response: ['pre'], why: t`That is preorder, root first. Inorder puts the root between its subtrees.` },
    { response: ['level'], why: t`That is the order the labels were assigned, level by level. Inorder visits the whole left subtree before the root.` },
  ],
});

const depthEx = supervision({
  id: 'cs3110-ex3-depth',
  source: cite('cs3110-ex3', 'Exercise "depth"'),
  title: t`The depth of a tree`,
  prompt: t`Write ${code`depth : 'a tree -> int`}, returning the number of nodes in any longest path from the root to a leaf, so that the depth of ${code`Leaf`} is ${0}. (CS${3110} writes ${code`Leaf`} and ${code`Node`} where FoCS writes ${code`Lf`} and ${code`Br`}.) Use the library function ${code`max`}, and explain why ${code`depth`} visits each node exactly once.`,
  writeUp: 'explanation',
});
const shapeEx = supervision({
  id: 'cs3110-ex3-shape',
  source: cite('cs3110-ex3', 'Exercise "shape"'),
  title: t`Trees of the same shape`,
  prompt: t`Write ${code`same_shape : 'a tree -> 'b tree -> bool`}, which decides whether two trees have the same shape, regardless of the values they carry at each node. Use a pattern match with three branches on the pair of trees, and explain why three branches are enough.`,
  writeUp: 'explanation',
});
const focs62 = supervision({
  id: 'focs-6-2',
  source: cite('focs-notes', 'Lecture 6, Exercise 6.2'),
  title: t`The sum of a tree`,
  prompt: t`Write an OCaml function taking a binary tree labelled with integers and returning their sum. Give its type, and say what it returns for ${code`Lf`} and why.`,
  writeUp: 'explanation',
});
const focs76 = supervision({
  id: 'focs-7-6',
  source: cite('focs-notes', 'Lecture 7, Exercise 7.6'),
  title: t`Traversals with append are quadratic`,
  prompt: t`Show that the functions ${code`preorder`}, ${code`inorder`}, and ${code`postorder`}, written with ${code`@`}, all require ${math`O(n^{${2}})`} time in the worst case, where ${math`n`} is the size of the tree. Find a family of trees on which the cost really is quadratic, and count the conses.`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

const EX = br(1, br(2, br(4, null, null), br(5, null, null)), br(3, null, null));

export const fpTrees: TopicContent = {
  topicId: 'fp.trees',
  goal: t`Define binary trees as a recursive datatype, compute their size and depth, and list their labels in preorder, inorder, and postorder.`,
  objective: t`Define binary trees, measure their size and depth, and list their labels in the three orders.`,
  why: t`Trees store data with short access paths; search trees, expression trees, and structural induction all start here.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`A type that contains itself` },
    { kind: 'hook', text: t`A list of a million elements has a million steps from its first element to its last. FoCS observes that a tree of depth ${20} can hold ${math`${2}^{${20}} - ${1}`}, about a million, elements, with every one at most ${20} steps from the root. All it takes is to let each cell point to two smaller structures instead of one.` },
    {
      kind: 'definition',
      name: t`Binary tree`,
      formal: t`${TREE_DECL} declares the type of [[binary-tree|binary trees]]: a value of type ${code`'a tree`} is either ${code`Lf`}, the empty tree, or ${code`Br (v, t${1}, t${2})`}, a branch node with label ${code`v : 'a`} and left and right subtrees ${code`t${1}`}, ${code`t${2} : 'a tree`}. Every tree is built by finitely many uses of these two constructors.`,
      plain: t`A tree is empty, or a labelled node with two trees under it. FoCS's example ${code`${oc(treeSrc(EX))}`} has root ${1}, children ${2} and ${3}, and ${4}, ${5} under ${2}.`,
    },
    {
      kind: 'p',
      text: t`The type is recursive, like lists: ${code`'a tree`} appears in its own definition. So functions on trees are recursive too, with one case for ${code`Lf`} and one for ${code`Br`}, recursing into both subtrees.`,
      why: { q: t`How is a list a special case?`, a: t`A list is a tree in which every node has only one subtree: ${code`x :: xs`} is a node with label ${code`x`} and one child ${code`xs`}. Two children is what makes trees shallow.` },
    },
    { kind: 'section', title: t`Measuring a tree` },
    { kind: 'rule', text: [MEASURE_DEF.count] },
    { kind: 'rule', text: [MEASURE_DEF.depth] },
    { kind: 'rule', text: [MEASURE_DEF.leaves] },
    { kind: 'narrative', text: t`For the example tree these give ${count(EX)} labelled nodes, depth ${depth(EX)}, and ${leaves(EX)} ${code`Lf`}s. One more ${code`Lf`} than ${code`Br`}: FoCS notes that this always holds, which makes ${code`leaves`} redundant. Here is why.` },
    {
      kind: 'theorem',
      name: t`Leaves and branch nodes`,
      statement: t`For every tree ${code`t`}, ${math`\mathrm{leaves}(t) = \mathrm{count}(t) + ${1}`}.`,
    },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Set up the induction`, text: t`We prove it by [[strong-induction|strong induction]] on ${math`\mathrm{count}(t)`}, assuming it for every tree with fewer branch nodes than ${code`t`}.` },
        { label: t`The empty tree`, text: t`If ${code`t`} is ${code`Lf`}: ${math`\mathrm{leaves}(t) = ${1}`} and ${math`\mathrm{count}(t) = ${0}`}, so the equation holds.` },
        { label: t`A branch node`, text: t`If ${code`t`} is ${code`Br (v, t${1}, t${2})`}, then ${math`\mathrm{count}(t) = ${1} + \mathrm{count}(t_{${1}}) + \mathrm{count}(t_{${2}})`}, so each subtree has fewer branch nodes and the hypothesis applies to it.`, eq: [dmath`\mathrm{leaves}(t) = \mathrm{leaves}(t_{${1}}) + \mathrm{leaves}(t_{${2}}) = (\mathrm{count}(t_{${1}}) + ${1}) + (\mathrm{count}(t_{${2}}) + ${1})`] },
        { label: t`Simplify`, text: t`The right side is ${math`(${1} + \mathrm{count}(t_{${1}}) + \mathrm{count}(t_{${2}})) + ${1} = \mathrm{count}(t) + ${1}`}, which completes the induction.` },
      ],
    },
    {
      kind: 'p',
      text: t`A similar induction gives FoCS's bound ${math`\mathrm{count}(t) \le ${2}^{\mathrm{depth}(t)} - ${1}`}: a tree of depth ${math`d`} has at most ${math`${1} + ${2} + \cdots + ${2}^{d - ${1}}`} nodes, one level at a time. The next lessons make "induction on the structure of a tree" a method of its own.`,
      why: { q: t`How does the induction for the bound go?`, a: t`For ${code`Br (v, t${1}, t${2})`} with depth ${math`d`}, both subtrees have depth at most ${math`d - ${1}`}, so ${math`\mathrm{count} \le ${1} + ${2}(${2}^{d - ${1}} - ${1}) = ${2}^{d} - ${1}`}.` },
    },
    checkFrom(measure, { m: 1, tree: br(5, br(3, null, br(4, null, null)), br(8, null, null)) }, t`The longest path is ${5}, ${3}, ${4}: three ${code`Br`} nodes, so the depth is ${3}.`),
    { kind: 'section', title: t`Three ways to list the labels` },
    { kind: 'narrative', text: t`To turn a tree into a list you must decide when to write down a node's label: before its subtrees, between them, or after them. Knuth named the three orders, and FoCS codes each with appends.` },
    { kind: 'rule', text: [codeBlock(code`let rec preorder = function Lf -> [] | Br (v, t${1}, t${2}) -> [v] @ preorder t${1} @ preorder t${2}`, code`let rec inorder = function Lf -> [] | Br (v, t${1}, t${2}) -> inorder t${1} @ [v] @ inorder t${2}`, code`let rec postorder = function Lf -> [] | Br (v, t${1}, t${2}) -> postorder t${1} @ postorder t${2} @ [v]`)] },
    {
      kind: 'definition',
      name: t`Traversals`,
      formal: t`The [[tree-traversal|traversals]] of ${code`Br (v, t${1}, t${2})`} are: preorder, ${code`v`} then the preorder of ${code`t${1}`} then of ${code`t${2}`}; inorder, the inorder of ${code`t${1}`}, then ${code`v`}, then the inorder of ${code`t${2}`}; postorder, the postorder of ${code`t${1}`}, then of ${code`t${2}`}, then ${code`v`}. Each traversal of ${code`Lf`} is empty.`,
      plain: t`For the example tree: preorder ${code`${oc(showList(preorder(EX)))}`}, inorder ${code`${oc(showList(inorder(EX)))}`}, postorder ${code`${oc(showList(postorder(EX)))}`}. All three go left before right.`,
    },
    {
      kind: 'p',
      text: t`These definitions are clear but can be slow: each ${code`@`} copies its left list, and on a tree shaped like a long path the copying adds up to a quadratic number of conses (FoCS Exercise ${7.6}). FoCS removes the appends with an accumulator, exactly as ${code`rev_app`} did for reverse, giving traversals in linear time.`,
    },
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`The depth of a tree is the number of edges on its longest path.`, counterexample: t`Conventions differ, and FoCS counts nodes: ${code`Br (${1}, Lf, Lf)`} has depth ${1}, and ${code`Lf`} depth ${0}. With edges, the single node would have depth ${0}. Check the definition before you answer.` },
    { kind: 'pitfall', claim: t`Postorder is preorder read backwards.`, counterexample: t`For the example tree, preorder backwards is ${code`${oc(showList([...preorder(EX)].reverse()))}`}, but postorder is ${code`${oc(showList(postorder(EX)))}`}: both orders visit the left subtree first.` },
    { kind: 'pitfall', claim: t`${code`leaves`} counts the nodes with no children.`, counterexample: t`FoCS's ${code`leaves`} counts the empty trees ${code`Lf`}. The example tree has ${leafNodes(EX)} labelled nodes without children but ${leaves(EX)} ${code`Lf`}s.` },
    { kind: 'takeaway', text: t`A binary tree is ${code`Lf`} or ${code`Br (v, t${1}, t${2})`}; functions on it recurse into both subtrees, ${math`\mathrm{leaves}(t) = \mathrm{count}(t) + ${1}`} by induction, and preorder, inorder, and postorder differ only in when the label is written.` },
  ],
  examples: [
    workedCambridge(ftreeWorked),
    worked(traversal, { o: 2, tree: br(6, br(2, br(1, null, null), br(4, null, null)), br(9, null, null)) }, t`Postorder, step by step`),
    worked(bound, { form: 1, x: 1000 }, t`How shallow a tree of a thousand labels can be`),
  ],
  generators: [measure, traversal, bound],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['binary-tree', 'tree-traversal'],
  cambridge: [ftreeInorder, depthEx, shapeEx, focs62, focs76],
  gate: ['focs-6-3-inorder', 'cs3110-ex3-depth', 'focs-7-6'],
  recall: [
    { front: t`State the relation between ${code`leaves`} and ${code`count`}.`, back: t`${math`\mathrm{leaves}(t) = \mathrm{count}(t) + ${1}`} for every tree, by induction on the tree.` },
    { front: t`How many labels can a tree of depth ${math`d`} hold?`, back: t`At most ${math`${2}^{d} - ${1}`}, reached by the complete tree.` },
    { front: t`Where does the label go in preorder, inorder, and postorder?`, back: t`Before the subtrees, between them, and after them; the left subtree always comes before the right.` },
  ],
  proofOrder: [
    {
      title: t`${math`\mathrm{leaves}(t) = \mathrm{count}(t) + ${1}`}`,
      steps: [
        t`For ${code`Lf`}: one leaf and no branch nodes.`,
        t`For ${code`Br (v, t${1}, t${2})`}: assume the result for both subtrees.`,
        t`Then the leaves are ${math`(\mathrm{count}(t_{${1}}) + ${1}) + (\mathrm{count}(t_{${2}}) + ${1})`}.`,
        t`That is ${math`\mathrm{count}(t) + ${1}`}, since ${code`count`} adds ${1} for the root.`,
      ],
    },
  ],
};
