/**
 * fp.red-black-trees: Red-black trees. The lesson follows CS3110 Section 9.3 (the local and
 * global invariants, black height, the theorem that height is at most 2 log2(n + 1) by its
 * two lemmas, and Okasaki's insertion with balance) and FoCS Lecture 7's remark that
 * self-balancing trees attain O(log n) in the worst case. The problems are CS3110 Chapter 9
 * exercises RB draw complete and RB draw insert.
 *
 * RB draw insert, run in OCaml 4.11.1 with the book's insert: D A T A S T R U C T U R E
 * gives root E, black height 3, 8 nodes, height 4. The `rbInsert` below is the same
 * algorithm in TypeScript. The drawing exercise is a gate, so no practice problem traces it.
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { int, sample } from '../math';
import { codeOf, ml, mlBlock } from '../ocaml-code';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { math, t } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

// ---------------------------------------------------------------- Okasaki's insertion

type Color = 'R' | 'B';
type RB<K> = null | { c: Color; k: K; l: RB<K>; r: RB<K> };
const node = <K>(c: Color, l: RB<K>, k: K, r: RB<K>): RB<K> => ({ c, k, l, r });

/** The four cases of a black grandparent with a red child and red grandchild, rotated to one shape. */
function balance<K>(c: Color, k: K, l: RB<K>, r: RB<K>): RB<K> {
  if (c === 'B') {
    if (l?.c === 'R' && l.l?.c === 'R') return node('R', node('B', l.l.l, l.l.k, l.l.r), l.k, node('B', l.r, k, r));
    if (l?.c === 'R' && l.r?.c === 'R') return node('R', node('B', l.l, l.k, l.r.l), l.r.k, node('B', l.r.r, k, r));
    if (r?.c === 'R' && r.l?.c === 'R') return node('R', node('B', l, k, r.l.l), r.l.k, node('B', r.l.r, r.k, r.r));
    if (r?.c === 'R' && r.r?.c === 'R') return node('R', node('B', l, k, r.l), r.k, node('B', r.r.l, r.r.k, r.r.r));
  }
  return node(c, l, k, r);
}
export function rbInsert<K>(x: K, s: RB<K>): RB<K> {
  const ins = (tr: RB<K>): RB<K> => {
    if (tr === null) return node('R', null, x, null);
    if (x < tr.k) return balance(tr.c, tr.k, ins(tr.l), tr.r);
    if (x > tr.k) return balance(tr.c, tr.k, tr.l, ins(tr.r));
    return tr;
  };
  const t1 = ins(s) as NonNullable<RB<K>>;
  return { ...t1, c: 'B' };
}
const rbBuild = <K>(xs: readonly K[]): RB<K> => xs.reduce<RB<K>>((tr, x) => rbInsert(x, tr), null);

// ---------------------------------------------------------------- generators

interface BoundP { n: number }
const bound = (n: number): number => Math.floor(2 * Math.log2(n + 1) + 1e-9);
const boundGen = generator<BoundP>({
  id: 'rb-height-bound',
  skill: 'Apply the red-black height theorem: a red-black tree with n nodes has height at most 2 log2(n + 1).',
  quick: true,
  params: (rng) => ({ n: int(rng, 7, 2000) }),
  sane: ({ n }) => (n >= 7 ? null : 'n'),
  problem: ({ n }) => ({
    prompt: t`A red-black tree has ${n} nodes. By the theorem ${math`h \le ${2}\log_{${2}}(n + ${1})`}, what is the largest height it could possibly have?`,
    answer: { kind: 'exact', expected: String(bound(n)) },
    solution: [
      t`${math`\log_{${2}}(${n + 1}) \approx ${Math.log2(n + 1)}`}, so ${math`${2}\log_{${2}}(${n + 1}) \approx ${2 * Math.log2(n + 1)}`}.`,
      t`The height is a whole number, so it is at most ${bound(n)}: a lookup examines at most ${bound(n)} nodes, against ${n} in the worst unbalanced tree.`,
    ],
  }),
  solve: ({ n }) => {
    let h = 0;
    while ((h + 1) <= 2 * Math.log2(n + 1) + 1e-9) h++;
    return String(h);
  },
  misconceptions: ({ n }): Misconception[] => [
    { response: String(Math.floor(Math.log2(n + 1))), why: t`That is the bound for a perfectly balanced tree. Red nodes can make some paths up to twice as long as others, hence the factor ${2}.` },
    { response: String(n), why: t`That is the worst case of an unbalanced binary search tree; the red-black invariants rule it out.` },
  ],
});

interface MinP { b: number }
const minGen = generator<MinP>({
  id: 'rb-min-nodes',
  skill: 'Use the second lemma of the height proof: a red-black tree of black height b has at least 2^b - 1 nodes.',
  quick: true,
  params: (rng) => ({ b: int(rng, 2, 12) }),
  sane: ({ b }) => (b >= 2 ? null : 'b'),
  problem: ({ b }) => ({
    prompt: t`A red-black tree has black height ${b}: every path from the root to a leaf has ${b} black nodes. What is the least number of nodes it can have?`,
    answer: { kind: 'exact', expected: String(2 ** b - 1) },
    solution: [
      t`The black nodes alone form a perfect binary tree of height ${b} (CS${3110}'s lemma), which has ${math`${2}^{${b}} - ${1} = ${2 ** b - 1}`} nodes.`,
      t`The tree with every node black and every path of length ${b} attains it, so the least is ${2 ** b - 1}.`,
    ],
  }),
  solve: ({ b }) => {
    let n = 0;
    for (let level = 0; level < b; level++) n += 2 ** level;
    return String(n);
  },
  misconceptions: ({ b }): Misconception[] => [
    { response: String(2 ** b), why: t`A perfect tree of height ${b} has ${math`${1} + ${2} + \cdots + ${2}^{${b - 1}} = ${2}^{${b}} - ${1}`} nodes.` },
    { response: String(b), why: t`Every path has ${b} black nodes, and paths branch: the black nodes form a perfect tree, not one path.` },
    { response: String(2 * b), why: t`That bounds the height of a path, not the number of nodes.` },
  ],
});

interface InsP { keys: number[] }
const insGen = generator<InsP>({
  id: 'rb-insert-root',
  skill: 'Insert keys into a red-black tree with Okasaki balance, and find the root: rotations move the middle key up.',
  params: (rng) => {
    for (;;) {
      const keys = sample(rng, Array.from({ length: 30 }, (_, i) => i + 1), int(rng, 3, 6));
      const root = (rbBuild(keys) as NonNullable<RB<number>>).k;
      if (new Set([root, keys[0], keys[keys.length - 1]]).size === 3) return { keys };
    }
  },
  sane: ({ keys }) => (keys.length >= 3 ? null : 'keys'),
  problem: ({ keys }) => {
    const steps = keys.map((_, i) => (rbBuild(keys.slice(0, i + 1)) as NonNullable<RB<number>>).k);
    return {
      prompt: t`Using Okasaki's insertion (insert red, call ${ml`balance`} on the way back up, colour the root black), the keys ${ml`${codeOf(keys.join(', '))}`} are inserted in that order into an empty red-black tree. Which key is at the root?`,
      answer: { kind: 'exact', expected: String(steps[steps.length - 1]) },
      solution: [
        t`A new key is red. When a red node gets a red child under a black grandparent, ${ml`balance`} rotates the three so the middle key goes up, red, with the other two black below it.`,
        t`Tracing the insertions, the root after each one is ${ml`${codeOf(steps.join(', '))}`}.`,
      ],
    };
  },
  solve: ({ keys }) => String((rbBuild(keys) as NonNullable<RB<number>>).k),
  misconceptions: ({ keys }): Misconception[] => [
    { response: String(keys[0]), why: t`In a plain binary search tree the first key stays the root, but here rotations move the middle of three keys up.` },
    { response: String(keys[keys.length - 1]), why: t`A new key is inserted at the bottom; it reaches the root only through rotations.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

// FoCS Exercise 7.1's keys, in its first order, which a plain binary search tree keeps lopsided.
const NAMES = ['Alice', 'Tobias', 'Gerald', 'Lucy'];
const namesRoot = (rbBuild(NAMES) as NonNullable<RB<string>>).k;
const nameOptions: ChoiceOption[] = ['Alice', 'Gerald', 'Lucy', 'Tobias'].map((c) => ({ id: c, label: [ml`"${c}"`] }));
const focs71rb = auto({
  id: 'focs-7-1-red-black',
  source: cite('focs-notes', 'Lecture 7, Exercise 7.1', true),
  title: t`Exercise ${7}.${1}'s names in a red-black tree`,
  prompt: t`FoCS Exercise ${7}.${1} inserts the keys ${ml`"Alice"`}, ${ml`"Tobias"`}, ${ml`"Gerald"`}, ${ml`"Lucy"`}, in that order, into an empty binary search tree, where ${ml`"Alice"`} stays at the root. Insert them instead into an empty red-black tree with Okasaki's algorithm. Which key is at the root?`,
  answer: { kind: 'choice', options: nameOptions, correct: namesRoot },
  solution: [
    t`Strings compare alphabetically: ${ml`"Alice" < "Gerald" < "Lucy" < "Tobias"`}.`,
    t`${ml`"Alice"`} becomes the root, coloured black. ${ml`"Tobias"`} goes to its right, red, under a black parent: nothing to repair.`,
    t`${ml`"Gerald"`} goes right of ${ml`"Alice"`} and left of ${ml`"Tobias"`}, red under red. The black ${ml`"Alice"`} now has a red right child with a red left child, so ${ml`balance`} lifts the middle key: ${ml`"Gerald"`}, red, with ${ml`"Alice"`} and ${ml`"Tobias"`} black below it. Colouring the root black gives black height ${2}.`,
    t`${ml`"Lucy"`} goes right of ${ml`"Gerald"`} and left of the black ${ml`"Tobias"`}: red under black, nothing to repair. The root is ${ml`"${namesRoot}"`}.`,
  ],
  reference: [namesRoot],
  verify: () => same('the roots after each insertion', NAMES.map((_, i) => (rbBuild(NAMES.slice(0, i + 1)) as NonNullable<RB<string>>).k).join(' '), 'Alice Alice Gerald Gerald'),
  misconceptions: [{ response: ['Alice'], why: t`That is the root of the plain binary search tree. In the red-black tree, inserting ${ml`"Gerald"`} sets off a rotation.` }],
});

const drawComplete = supervision({
  id: 'cs3110-9-rb-draw-complete',
  source: cite('cs3110-ex9', 'Exercise: RB draw complete'),
  title: t`Three colourings of one tree`,
  prompt: t`Draw the perfect binary tree on the values ${1}, ${2}, ..., ${15}. Colour its nodes in three different ways so that each is a red-black tree and the three have black heights ${2}, ${3}, and ${4}. Explain why each colouring satisfies both invariants.`,
  writeUp: 'sketch',
});
const drawInsertSketch = supervision({
  id: 'cs3110-9-rb-draw-insert',
  source: cite('cs3110-ex9', 'Exercise: RB draw insert'),
  title: t`Draw every step of an insertion sequence`,
  prompt: t`Draw the red-black tree after each insertion of the characters ${ml`D A T A S T R U C T U R E`} into an empty tree, marking each rotation by ${ml`balance`} and each recolouring of the root. Check your final tree against the implementation.`,
  writeUp: 'sketch',
});

// ---------------------------------------------------------------- lesson

export const redBlackTrees: TopicContent = {
  topicId: 'fp.red-black-trees',
  goal: t`Keep a search tree balanced with the red-black invariants, and insert by rebalancing locally.`,
  objective: t`State the red-black invariants, prove they bound the height, and insert by local rotations.`,
  why: t`It turns the binary search tree's bad worst case into ${math`O(\log n)`}; OCaml's Map is a balanced tree too.`,
  minutes: 40,
  lesson: [
    { kind: 'section', title: t`Two rules that force balance` },
    { kind: 'hook', text: t`Insert ${1}, ${2}, ..., ${1000} into a binary search tree and you get a path ${1000} nodes long. Rebalancing the whole tree after each insertion would cost too much. Is there a rule, cheap to keep, that stops the tree from ever getting badly lopsided?` },
    { kind: 'narrative', text: t`Colour every node red or black, and keep two rules. Neither says "balanced", yet together they squeeze the tree into logarithmic height.` },
    { kind: 'definition', name: t`Red-black tree`, formal: t`A [[red-black-tree|red-black tree]] is a binary search tree whose nodes are each coloured red or black, with a black root, such that (local invariant) no red node has a red child, and (global invariant) every path from the root to a leaf has the same number of black nodes, the [[black-height|black height]] ${math`b`}.`, plain: t`No two reds in a row; the same count of blacks on every path. A tree with every node black satisfies both only if it is perfect.` },
    { kind: 'rule', text: [mlBlock`
      type color = Red | Black
      type 'a rbtree = Leaf | Node of color * 'a * 'a rbtree * 'a rbtree
    `] },
    { kind: 'section', title: t`Why the height is logarithmic` },
    { kind: 'theorem', name: t`CS${3110} Section ${9}.${3}`, statement: t`A red-black tree with ${math`n`} nodes has height ${math`h \le ${2}\log_{${2}}(n + ${1})`}. So lookup costs ${math`O(\log n)`} in the worst case.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Lemma ${1}: ${math`h \le ${2}b`}`, text: t`A longest path has ${math`h`} nodes, ${math`b`} of them black by the global invariant. Its first node is the root, which is black, so every red node on it has a parent on the path, and by the local invariant that parent is black. Different nodes on the path have different parents, so this matches each red node with its own black node: there are at most ${math`b`} red nodes. Hence ${math`h \le ${2}b`}.`, plain: t`Pair each red with the black just above it: reds can at most double the length.`, why: { q: t`Why not pair each red with the black node below it?`, a: t`The last node on a path may be red, with nothing below it. Every node but the root has a node above it, and the root is black, so looking upwards always works.` } },
        { label: t`Lemma ${2}: ${math`n \ge ${2}^{b} - ${1}`}`, text: t`Every path from the root has ${math`b`} black nodes, so the black nodes contain a perfect binary tree of height ${math`b`}, with ${math`${2}^{b} - ${1}`} nodes. Hence ${math`n \ge ${2}^{b} - ${1}`}.`, why: { q: t`Why do the black nodes contain a perfect tree?`, a: t`Keep the black nodes. Delete each red node with no children; replace each red node that has children by one of them, which must be black, and drop the other. Every path in what remains still has exactly ${math`b`} nodes, all black, so it is a perfect tree of height ${math`b`}, and it uses only nodes of the original tree.` } },
        { label: t`Rearrange lemma ${2}`, text: t`${math`${2}^{b} \le n + ${1}`}, so ${math`b \le \log_{${2}}(n + ${1})`}, and doubling, ${math`${2}b \le ${2}\log_{${2}}(n + ${1})`}.` },
        { label: t`Combine`, text: t`By lemma ${1}, ${math`h \le ${2}b \le ${2}\log_{${2}}(n + ${1})`}.` },
      ],
    },
    checkFrom(boundGen, { n: 1000 }, t`${math`${2}\log_{${2}} ${1001} \approx ${2 * Math.log2(1001)}`}, so the height is at most ${bound(1000)}.`),
    { kind: 'section', title: t`Inserting without breaking the rules` },
    { kind: 'narrative', text: t`A new key goes where a binary search tree would put it. What colour? Black would add one black node to some paths only, breaking the global invariant. So colour it red: the global invariant survives, and the only possible damage is a red node under a red parent.` },
    { kind: 'definition', name: t`Okasaki's balance`, formal: t`Whenever a black node has a red child with a red child, in any of the four arrangements, ${ml`balance`} replaces the three by the middle key ${math`y`}, coloured red, with the smaller key ${math`x`} and larger key ${math`z`} as black children, and the four subtrees ${math`a < x < b < y < c < z < d`} hung below in order.`, plain: t`A [[rotation|rotation]]: the middle of three keys moves up. The order of keys is kept, and the black height of every path is unchanged.` },
    { kind: 'rule', text: [mlBlock`
      let balance = function
        | Black, z, Node (Red, y, Node (Red, x, a, b), c), d
        | Black, z, Node (Red, x, a, Node (Red, y, b, c)), d
        | Black, x, a, Node (Red, z, Node (Red, y, b, c), d)
        | Black, x, a, Node (Red, y, b, Node (Red, z, c, d)) ->
            Node (Red, y, Node (Black, x, a, b), Node (Black, z, c, d))
        | a, b, c, d -> Node (a, b, c, d)
    `] },
    {
      kind: 'steps',
      steps: [
        { label: t`Insert red`, text: t`${ml`ins`} goes down as in a binary search tree and replaces a leaf by a red node.` },
        { label: t`Repair on the way up`, text: t`Each step back up calls ${ml`balance`}. The rotation may leave the new red middle key under a red parent, so the repair can climb, one constant-time step per level.`, plain: t`At most ${math`O(\log n)`} levels, so insertion costs ${math`O(\log n)`}.` },
        { label: t`Blacken the root`, text: t`Finally the root is coloured black. If it was red, every path gains one black node: this is the only way the black height grows.` },
      ],
    },
    checkFrom(insGen, { keys: [1, 2, 3, 4, 5] }, t`Inserting ${1}, ${2}, ${3} rotates ${2} to the root; it stays there as ${4} and ${5} go right.`),
    { kind: 'pitfall', claim: t`A red-black tree is perfectly balanced: all paths have the same length.`, counterexample: t`Only the black counts agree. A path black, red, black, red has length ${4}, and one of two blacks has length ${2}, in the same tree: the longest path can be twice the shortest.` },
    { kind: 'pitfall', claim: t`Colouring the new node black avoids any repair.`, counterexample: t`It adds a black node to the paths through it and not to the others, breaking the global invariant, which is much harder to repair than two reds in a row.` },
    { kind: 'takeaway', text: t`No red under red and equal black counts on every path force height at most ${math`${2}\log_{${2}}(n + ${1})`}, and insertion keeps them with local rotations.` },
  ],
  examples: [
    { ...workedCambridge(focs71rb), examiner: t`The examiner wants each insertion placed by comparing keys, the red-under-red case named, the rotation drawn, and the root recoloured.` },
    worked(minGen, { b: 4 }, t`The fewest nodes for a black height`),
    worked(insGen, { keys: [10, 20, 30, 15, 25] }, t`A rotation moves the middle key up`),
  ],
  generators: [boundGen, minGen, insGen],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['red-black-tree', 'black-height', 'rotation'],
  cambridge: withUses([drawComplete, drawInsertSketch], {
    'cs3110-9-rb-draw-complete': { sections: ['Two rules that force balance', 'Why the height is logarithmic'], note: t`Colouring a tree to meet both invariants` },
    'cs3110-9-rb-draw-insert': { sections: ['Inserting without breaking the rules'], note: t`Following insertions with rotations and recolouring` },
  }),
  gate: ['cs3110-9-rb-draw-complete', 'cs3110-9-rb-draw-insert'],
  recall: [
    { front: t`State the red-black invariants.`, back: t`Black root; no red node has a red child; every root-to-leaf path has the same number of black nodes.` },
    { front: t`Bound the height of a red-black tree with ${math`n`} nodes.`, back: t`${math`h \le ${2}\log_{${2}}(n + ${1})`}, from ${math`h \le ${2}b`} and ${math`n \ge ${2}^{b} - ${1}`}.` },
    { front: t`What colour is a newly inserted node, and why?`, back: t`Red, so the global invariant holds; ${ml`balance`} then repairs any red under red.` },
  ],
  proofOrder: [{
    title: t`The height of a red-black tree`,
    steps: [
      t`On a longest path, reds are at most the blacks: ${math`h \le ${2}b`}.`,
      t`The black nodes contain a perfect tree of height ${math`b`}: ${math`n \ge ${2}^{b} - ${1}`}.`,
      t`So ${math`b \le \log_{${2}}(n + ${1})`}.`,
      t`Hence ${math`h \le ${2}\log_{${2}}(n + ${1})`}.`,
    ],
  }],
};
