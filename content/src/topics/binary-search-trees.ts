/**
 * fp.binary-search-trees: Binary search trees. The lesson follows FoCS Lecture 7
 * ("Dictionaries and Functional Arrays": association lists against binary search trees,
 * lookup and update copying only the path, unbalanced trees from sorted insertions,
 * traversals) and CS3110's BST invariant (Chapter 5 exercise, binary search tree map). The
 * problems are FoCS exercises 7.1, 7.4, 7.6, 7.7 and CS3110 exercises is_bst and efficient
 * traversal.
 *
 * FoCS 7.1, by the insertion rule (string order): Alice, Tobias, Gerald, Lucy gives the path
 * Alice, Tobias, Gerald, Lucy, height 4; Gerald, Alice, Lucy, Tobias gives height 3. The
 * generators build the trees in TypeScript by the same rule.
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { int, pick, sample } from '../math';
import { codeOf, ml, mlBlock } from '../ocaml-code';
import { generator, type Misconception } from '../problem';
import { math, t } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

// ---------------------------------------------------------------- trees

type Tree<K> = null | { k: K; l: Tree<K>; r: Tree<K> };
function insert<K>(x: K, tr: Tree<K>): Tree<K> {
  if (tr === null) return { k: x, l: null, r: null };
  if (x < tr.k) return { ...tr, l: insert(x, tr.l) };
  if (tr.k < x) return { ...tr, r: insert(x, tr.r) };
  return tr;
}
const build = <K>(xs: readonly K[]): Tree<K> => xs.reduce<Tree<K>>((tr, x) => insert(x, tr), null);
const height = <K>(tr: Tree<K>): number => (tr === null ? 0 : 1 + Math.max(height(tr.l), height(tr.r)));
const preorder = <K>(tr: Tree<K>): K[] => (tr === null ? [] : [tr.k, ...preorder(tr.l), ...preorder(tr.r)]);
const inorder = <K>(tr: Tree<K>): K[] => (tr === null ? [] : [...inorder(tr.l), tr.k, ...inorder(tr.r)]);
/** Nodes examined by lookup: one per Br reached. */
function visits(x: number, tr: Tree<number>): number {
  if (tr === null) return 0;
  if (x < tr.k) return 1 + visits(x, tr.l);
  if (tr.k < x) return 1 + visits(x, tr.r);
  return 1;
}
const balancedHeight = (n: number): number => Math.ceil(Math.log2(n + 1));

const POOL = Array.from({ length: 40 }, (_, i) => i + 1);

// ---------------------------------------------------------------- generators

interface HeightP { keys: number[] }
const heightGen = generator<HeightP>({
  id: 'bst-height',
  skill: 'Build a binary search tree by inserting keys in a given order, and find its height: the insertion order decides the shape.',
  params: (rng) => {
    for (;;) {
      const keys = sample(rng, POOL, int(rng, 5, 8));
      if (rng() < 0.3) keys.sort((a, b) => a - b);
      const h = height(build(keys));
      if (h !== keys.length && h !== balancedHeight(keys.length)) return { keys };
    }
  },
  sane: ({ keys }) => (keys.length >= 5 ? null : 'keys'),
  problem: ({ keys }) => {
    const tr = build(keys);
    return {
      prompt: t`The keys ${ml`${codeOf(keys.join(', '))}`} are inserted, in that order, into an empty binary search tree. What is the height of the tree (the number of nodes on its longest path from the root)?`,
      answer: { kind: 'exact', expected: String(height(tr)) },
      solution: [
        t`Each key starts at the root and goes left if smaller, right if larger, until it reaches an empty place. The first key, ${keys[0] as number}, is the root.`,
        t`Reading the tree in preorder (root, then left subtree, then right) gives ${ml`${codeOf(preorder(tr).join(', '))}`}, and the longest path has ${height(tr)} nodes.`,
      ],
    };
  },
  solve: ({ keys }) => String(height(build(keys))),
  misconceptions: ({ keys }): Misconception[] => [
    { response: String(keys.length), why: t`Only a tree built from keys in sorted order (or a zigzag) is a single path. Trace where each key goes.` },
    { response: String(balancedHeight(keys.length)), why: t`That is the height of a perfectly balanced tree with ${keys.length} nodes. A binary search tree is only as balanced as its insertion order makes it.` },
  ],
});

interface LookupP { keys: number[]; x: number }
const lookupGen = generator<LookupP>({
  id: 'bst-lookup',
  skill: 'Count the nodes a lookup examines in a binary search tree: one per level on the path from the root.',
  quick: true,
  params: (rng) => {
    for (;;) {
      const keys = sample(rng, POOL, int(rng, 6, 9));
      const x = rng() < 0.7 ? pick(rng, keys) : pick(rng, POOL.filter((k) => !keys.includes(k)));
      const tr = build(keys);
      const v = visits(x, tr);
      const pos = keys.includes(x) ? keys.indexOf(x) + 1 : keys.length;
      if (new Set([v, pos, height(tr)]).size === 3) return { keys, x };
    }
  },
  sane: ({ keys }) => (keys.length >= 6 ? null : 'keys'),
  problem: ({ keys, x }) => {
    const tr = build(keys);
    const path: number[] = [];
    let cur = tr;
    while (cur !== null) {
      path.push(cur.k);
      if (x === cur.k) break;
      cur = x < cur.k ? cur.l : cur.r;
    }
    return {
      prompt: t`A binary search tree is built by inserting ${ml`${codeOf(keys.join(', '))}`} in that order. How many nodes does a lookup of ${x} examine${keys.includes(x) ? '' : ' before it reaches an empty subtree and raises Missing'}?`,
      answer: { kind: 'exact', expected: String(visits(x, tr)) },
      solution: [
        t`Lookup compares ${x} with the key at each node and goes left if smaller, right if larger, stopping at a match or an empty subtree.`,
        t`The path is ${ml`${codeOf(path.join(', '))}`}: ${path.length} ${path.length === 1 ? 'node' : 'nodes'}.`,
      ],
    };
  },
  solve: ({ keys, x }) => String(visits(x, build(keys))),
  misconceptions: ({ keys, x }): Misconception[] => [
    { response: String(keys.includes(x) ? keys.indexOf(x) + 1 : keys.length), why: t`That is a linear search through the keys, as in an association list. The tree discards one subtree at each comparison.` },
    { response: String(height(build(keys))), why: t`That is the height, the longest path; a lookup follows only the path towards its key.` },
  ],
});

interface TravP { keys: number[]; j: number }
const traversalGen = generator<TravP>({
  id: 'bst-preorder',
  skill: 'Traverse a binary search tree in preorder, and know that inorder lists the keys in increasing order.',
  params: (rng) => {
    for (;;) {
      const keys = sample(rng, POOL, int(rng, 5, 7));
      const j = int(rng, 2, keys.length);
      const tr = build(keys);
      if (new Set([preorder(tr)[j - 1], inorder(tr)[j - 1], keys[j - 1]]).size === 3) return { keys, j };
    }
  },
  sane: ({ keys, j }) => (j >= 2 && j <= keys.length ? null : 'j'),
  problem: ({ keys, j }) => {
    const tr = build(keys);
    return {
      prompt: t`The keys ${ml`${codeOf(keys.join(', '))}`} are inserted in that order into an empty binary search tree. What is key number ${j} of its preorder traversal, ${ml`[v] @ preorder t${1} @ preorder t${2}`} at each node?`,
      answer: { kind: 'exact', expected: String(preorder(tr)[j - 1]) },
      solution: [
        t`Preorder visits a node, then its whole left subtree, then its whole right subtree.`,
        t`Here it gives ${ml`${codeOf(preorder(tr).join(', '))}`}, so key number ${j} is ${preorder(tr)[j - 1] as number}. (Inorder would give the keys sorted.)`,
      ],
    };
  },
  solve: ({ keys, j }) => String(preorder(build(keys))[j - 1]),
  misconceptions: ({ keys, j }): Misconception[] => {
    const tr = build(keys);
    return [
      { response: String(inorder(tr)[j - 1]), why: t`That is the inorder traversal, which lists the keys sorted. Preorder puts each node before its subtrees.` },
      { response: String(keys[j - 1]), why: t`Preorder is not the insertion order: the whole left subtree comes before anything on the right.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

const ORDER1 = ['Alice', 'Tobias', 'Gerald', 'Lucy'];
const ORDER2 = ['Gerald', 'Alice', 'Lucy', 'Tobias'];
const focs71a = auto({
  id: 'focs-7-1-first',
  source: cite('focs-notes', 'Lecture 7, Exercise 7.1', true),
  title: t`Four names, first order`,
  prompt: t`Draw the binary search tree that arises from successively inserting ${ml`("Alice", ${6})`}, ${ml`("Tobias", ${2})`}, ${ml`("Gerald", ${8})`}, ${ml`("Lucy", ${9})`} into the empty tree, keys compared as strings. What is its height?`,
  answer: { kind: 'exact', expected: String(height(build(ORDER1))) },
  solution: [
    t`Alice is the root. Tobias comes after Alice, so it goes right. Gerald is after Alice and before Tobias: right of Alice, left of Tobias. Lucy is after Alice, before Tobias, after Gerald: right of Gerald.`,
    t`The tree is one path, Alice, Tobias, Gerald, Lucy, of height ${height(build(ORDER1))}: a lookup may take ${4} comparisons, no better than a list.`,
  ],
  reference: '4',
  verify: () => same('height of the first tree', height(build(ORDER1)), 4),
  misconceptions: [{ response: '3', why: t`Every name after Alice goes right of Alice, and each later name goes one level deeper: the tree is a single path of ${4} nodes.` }],
});
const focs71b = auto({
  id: 'focs-7-1-second',
  source: cite('focs-notes', 'Lecture 7, Exercise 7.1', true),
  title: t`Four names, second order`,
  prompt: t`Repeat with the order ${ml`("Gerald", ${8})`}, ${ml`("Alice", ${6})`}, ${ml`("Lucy", ${9})`}, ${ml`("Tobias", ${2})`}. What is the height of this tree, and why do the results differ?`,
  answer: { kind: 'exact', expected: String(height(build(ORDER2))) },
  hints: [
    t`Which name becomes the root?`,
    t`Where does each later name go, comparing alphabetically at each node on the way down?`,
    t`How many nodes lie on the longest path from the root?`,
  ],
  nudge: t`Not quite. Insert one name at a time from the root, comparing alphabetically at each node; the height counts the nodes on the longest path.`,
  solution: [
    t`Gerald is the root; Alice goes left; Lucy goes right; Tobias is after Gerald and after Lucy, so it goes right of Lucy.`,
    t`Height ${height(build(ORDER2))}. The same keys give different trees because the shape depends on the order of insertion: the first key is always the root.`,
    t`The first key inserted is the root: insertion order fixes the shape.`,
  ],
  reference: '3',
  verify: () => same('height of the second tree', height(build(ORDER2)), 3) ?? same('same inorder', inorder(build(ORDER1)).join(), inorder(build(ORDER2)).join()),
  misconceptions: [{ response: '4', why: t`Gerald is the root this time, with names on both sides: the tree is not a single path.` }, { response: '2', why: t`Tobias goes below Lucy, making a path of ${3} nodes.` }],
});
const focs74 = supervision({
  id: 'focs-7-4',
  source: cite('focs-notes', 'Lecture 7, Exercises 7.4 and 7.5'),
  title: t`Deleting from a binary search tree`,
  prompt: t`Describe an algorithm for deleting an entry from a binary search tree, covering a node with no subtrees, one, and two. Comment on the suitability of your approach, then code it.`,
  hints: [
    t`Which case is simplest, deleting a node with no subtrees, and what replaces it?`,
    t`With exactly one subtree, what can take the deleted node's place?`,
    t`With two subtrees, which entry, taken from which subtree, can replace the deleted one and keep the invariant?`,
  ],
  writeUp: 'explanation',
});
const focs76 = supervision({
  id: 'focs-7-6',
  source: cite('focs-notes', 'Lecture 7, Exercise 7.6'),
  title: t`Traversals with append are quadratic`,
  prompt: t`Show that the functions ${ml`preorder`}, ${ml`inorder`}, and ${ml`postorder`}, which use ${ml`@`}, all require ${math`O(n^{${2}})`} time in the worst case, where ${math`n`} is the size of the tree. Give a worst-case tree and its cost recurrence.`,
  hints: [
    t`What does ${ml`xs @ ys`} cost, in terms of the length of ${ml`xs`}?`,
    t`Which tree shape makes the list on the left of each ${ml`@`} as long as possible at every node?`,
    t`What recurrence does the cost ${math`T(n)`} satisfy for that shape, and what does it sum to?`,
  ],
  writeUp: 'proof',
});
const focs77 = supervision({
  id: 'focs-7-7',
  source: cite('focs-notes', 'Lecture 7, Exercise 7.7'),
  title: t`Traversals with an accumulator are linear`,
  prompt: t`Show that the functions ${ml`preord`}, ${ml`inord`}, and ${ml`postord`}, which take an accumulating list argument instead of using ${ml`@`}, all take linear time in the size of the tree.`,
  hints: [
    t`How many calls does each traversal make, counting nodes and empty subtrees?`,
    t`How much work does each call do, apart from its recursive calls?`,
    t`How does the number of empty subtrees compare with the number of nodes?`,
  ],
  writeUp: 'proof',
});
const isBst = supervision({
  id: 'cs3110-3-is-bst',
  source: cite('cs3110-ex3', 'Exercise: is_bst'),
  title: t`Checking the invariant`,
  prompt: t`Write ${ml`is_bst : ('a * 'b) tree -> bool`}, which returns whether a tree satisfies the binary search tree invariant on its keys. Explain why checking that each node is greater than its left child and less than its right child is not enough.`,
  hints: [
    t`What does the invariant require of every key in the left subtree, not only of the left child?`,
    t`Which small tree passes the parent and child comparison but breaks the invariant?`,
    t`What extra information, such as bounds on the keys, must the recursive check carry down?`,
  ],
  writeUp: 'explanation',
});

// ---------------------------------------------------------------- lesson

export const binarySearchTrees: TopicContent = {
  topicId: 'fp.binary-search-trees',
  goal: t`Store a dictionary in a binary search tree, look up and update keys in ${math`O(\log n)`} when the tree is balanced, and see how insertion order can unbalance it.`,
  objective: t`Store a dictionary in a binary search tree, and say when lookup costs ${math`O(\log n)`} and when ${math`O(n)`}.`,
  why: t`It is the standard ordered dictionary, and its weakness motivates the self-balancing red-black tree.`,
  minutes: 35,
  lesson: [
    { kind: 'section', title: t`Halving the search` },
    { kind: 'hook', text: t`To find a name in a list of a million you may check a million names. In a phone book you open the middle, see which half the name is in, and throw the other half away: about ${20} steps. Can a functional data structure throw away half at every step?` },
    { kind: 'narrative', text: t`A list cannot: it is reached only from the front. But a tree can, if every node knows which way to go. Put the smaller keys on the left and the larger ones on the right, and each comparison discards a whole subtree.` },
    { kind: 'definition', name: t`Binary search tree`, formal: t`A binary tree whose nodes hold bindings ${ml`(key, value)`} is a [[binary-search-tree|binary search tree]] when, at every node with key ${math`a`}, every key in its left subtree is less than ${math`a`} and every key in its right subtree is greater than ${math`a`}.`, plain: t`It needs a total order on keys, such as the order of strings. The invariant is about whole subtrees, not just children.` },
    { kind: 'rule', text: [mlBlock`
      let rec lookup b = function
        | Br ((a, x), t${1}, t${2}) ->
            if b < a then lookup b t${1}
            else if a < b then lookup b t${2}
            else x
        | Lf -> raise (Missing b)
    `] },
    { kind: 'p', text: t`${ml`update`} searches the same way, then rebuilds the nodes on the path, sharing every subtree it did not enter. So it copies only the path from the root, not the tree.` },
    checkFrom(lookupGen, { keys: [20, 8, 31, 5, 14, 26, 40], x: 14 }, t`${14} is less than ${20} (go left) and greater than ${8} (go right): ${20}, ${8}, ${14}, three nodes.`),
    { kind: 'section', title: t`Height decides the cost` },
    { kind: 'narrative', text: t`Lookup and update examine one node per level, so they cost at most the height of the tree. How small can the height be for ${math`n`} keys?` },
    { kind: 'definition', name: t`Height`, formal: t`The [[tree-height|height]] of a tree is ${0} for ${ml`Lf`} and ${math`${1} + \max(h_{${1}}, h_{${2}})`} for ${ml`Br (v, t${1}, t${2})`}, where ${math`h_{${1}}`}, ${math`h_{${2}}`} are the heights of the subtrees.`, plain: t`The number of nodes on the longest path from the root down.` },
    { kind: 'theorem', name: t`Size and height`, statement: t`A binary tree of height ${math`h`} has at most ${math`${2}^{h} - ${1}`} nodes. So a tree with ${math`n`} nodes has height at least ${math`\log_{${2}}(n + ${1})`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Base case`, text: t`${ml`Lf`} has height ${0} and ${0} nodes, and ${math`${2}^{${0}} - ${1} = ${0}`}.` },
        { label: t`Inductive step`, text: t`A node of height ${math`h \ge ${1}`} has two subtrees of height at most ${math`h - ${1}`}, each with at most ${math`${2}^{h - ${1}} - ${1}`} nodes by induction on the height.` },
        { label: t`Count`, text: t`So it has at most ${math`${1} + ${2}(${2}^{h - ${1}} - ${1}) = ${2}^{h} - ${1}`} nodes.`, plain: t`One for the root, plus both subtrees: multiply out the bracket.` },
        { label: t`Rearrange`, text: t`If ${math`n \le ${2}^{h} - ${1}`} then ${math`n + ${1} \le ${2}^{h}`}, and taking logarithms, ${math`h \ge \log_{${2}}(n + ${1})`}.` },
      ],
    },
    { kind: 'p', text: t`A balanced tree comes close to this bound, so lookup costs ${math`O(\log n)`}. FoCS notes that random insertions usually give a reasonably balanced tree.` },
    checkFrom(heightGen, { keys: [12, 5, 30, 8, 22, 3, 9], }, t`${12} is the root with ${5} and ${30} below; ${8} goes under ${5}, and ${9} under ${8}: four levels.`),
    { kind: 'pitfall', claim: t`A binary search tree always gives ${math`O(\log n)`} lookups.`, counterexample: t`Insert ${1}, ${2}, ${3}, ${4}, ${5} in that order: each key goes right of the last, and the tree is a path of height ${5}. Sorted input makes it a list, and lookups cost ${math`O(n)`}. The next lesson's red-black trees prevent this.` },
    { kind: 'section', title: t`Reading the tree back` },
    { kind: 'definition', name: t`Traversals`, formal: t`For ${ml`Br (v, t${1}, t${2})`}: preorder lists ${math`v`}, then ${math`t_{${1}}`}, then ${math`t_{${2}}`}; inorder lists ${math`t_{${1}}`}, then ${math`v`}, then ${math`t_{${2}}`}; postorder lists ${math`t_{${1}}`}, then ${math`t_{${2}}`}, then ${math`v`}.`, plain: t`In a binary search tree, inorder lists the keys in increasing order. Building a tree and reading it in order is a sorting algorithm, treesort.` },
    checkFrom(traversalGen, { keys: [15, 7, 22, 3, 10], j: 3 }, t`Preorder gives ${15}, ${7}, ${3}, ${10}, ${22}: the third is ${3}.`),
    { kind: 'pitfall', claim: t`Checking each node against its two children shows the invariant holds.`, counterexample: t`Root ${10} with left child ${5}, and ${5} with right child ${12}: each node is correct relative to its children, but ${12} is in the left subtree of ${10}. The invariant is about whole subtrees.` },
    { kind: 'takeaway', text: t`A binary search tree costs its height per operation: about ${math`\log_{${2}} n`} when balanced, but as much as ${math`n`} when keys arrive in order.` },
  ],
  examples: [
    { ...workedCambridge(focs71a), examiner: t`The examiner wants the tree drawn, each insertion placed by comparisons, and the point that order of insertion fixes the shape.` },
    worked(heightGen, { keys: [3, 8, 14, 20, 27] }, t`Sorted keys make a path`),
    worked(traversalGen, { keys: [18, 9, 25, 4, 13, 30], j: 4 }, t`Preorder of a binary search tree`),
  ],
  generators: [heightGen, lookupGen, traversalGen],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['binary-search-tree', 'tree-height'],
  cambridge: withUses([focs71b, focs74, focs76, focs77, isBst], {
    'focs-7-6': { sections: ['Height decides the cost', 'Reading the tree back'], note: t`The quadratic cost of traversals with append` },
    'focs-7-4': { sections: ['Halving the search', 'Reading the tree back'], note: t`Deleting from a binary search tree in every case` },
  }),
  gate: ['focs-7-6', 'focs-7-4'],
  recall: [
    { front: t`State the binary search tree invariant.`, back: t`At every node, all keys in the left subtree are smaller and all keys in the right subtree are larger.` },
    { front: t`What do lookup and update cost in a binary search tree?`, back: t`At most its height: ${math`O(\log n)`} if balanced, ${math`O(n)`} in the worst case.` },
    { front: t`How many nodes can a binary tree of height ${math`h`} have?`, back: t`At most ${math`${2}^{h} - ${1}`}.` },
  ],
  proofOrder: [{
    title: t`A tree of height ${math`h`} has at most ${math`${2}^{h} - ${1}`} nodes`,
    steps: [
      t`Base case: a leaf has height ${0} and ${0} nodes.`,
      t`A node of height ${math`h`} has subtrees of height at most ${math`h - ${1}`}.`,
      t`By induction each has at most ${math`${2}^{h - ${1}} - ${1}`} nodes.`,
      t`So the node has at most ${math`${1} + ${2}(${2}^{h - ${1}} - ${1}) = ${2}^{h} - ${1}`}.`,
    ],
  }],
};
