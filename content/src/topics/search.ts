/**
 * fp.search: Depth-first and breadth-first search. The lesson follows FoCS Lecture 10
 * ("Queues and Search Strategies": depth-first against breadth-first traversal, nbreadth
 * with append, breadth with queues, iterative deepening and its cost, stacks, and the
 * survey "the data structure determines the search"). The problems are FoCS exercises
 * 10.2 to 10.5.
 *
 * The tree of Exercise 10.5, next n = [2n; 2n + 1] from 1, has the labels 2^d to
 * 2^(d+1) - 1 at depth d, so breadth-first order is 1, 2, 3, ... and the path right, left,
 * right from the root is 1, 3, 6, 13. The generators search this tree by running a stack
 * and a queue in TypeScript.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { int, pick } from '../math';
import { ml, mlBlock } from '../ocaml-code';
import { generator, type Misconception } from '../problem';
import { listOf, math, t } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

// ---------------------------------------------------------------- searching the tree of next

const next = (n: number): number[] => [2 * n, 2 * n + 1];
const depth = (n: number): number => Math.floor(Math.log2(n) + 1e-9);

/** Depth-first (a stack), visiting children in the given order, down to depth `bound`. */
function dfs(bound: number, rightFirst = false): number[] {
  const out: number[] = [];
  const stack = [1];
  while (stack.length > 0) {
    const n = stack.pop() as number;
    out.push(n);
    if (depth(n) < bound) {
      const kids = next(n);
      // The stack pops the last pushed first, so push the child to visit second first.
      stack.push(...(rightFirst ? kids : [...kids].reverse()));
    }
  }
  return out;
}
/** Breadth-first (a queue), down to depth `bound`. */
function bfs(bound: number): number[] {
  const out: number[] = [];
  const queue = [1];
  while (queue.length > 0) {
    const n = queue.shift() as number;
    out.push(n);
    if (depth(n) < bound) queue.push(...next(n));
  }
  return out;
}

// ---------------------------------------------------------------- generators

interface OrderP { bound: number; k: number }
const orderGen = generator<OrderP>({
  id: 'dfs-order',
  skill: 'Visit a tree depth first (a stack) and breadth first (a queue), and say which node comes k-th.',
  params: (rng) => {
    for (;;) {
      const bound = int(rng, 2, 3);
      const k = int(rng, 3, 2 ** (bound + 1) - 1);
      const d = dfs(bound)[k - 1];
      if (new Set([d, bfs(bound)[k - 1], dfs(bound, true)[k - 1]]).size === 3) return { bound, k };
    }
  },
  sane: ({ bound, k }) => (k <= 2 ** (bound + 1) - 1 ? null : 'k'),
  problem: ({ bound, k }) => {
    const order = dfs(bound);
    return {
      prompt: t`FoCS Exercise ${10}.${5} regards ${ml`let next n = [${2} * n; ${2} * n + ${1}]`} as a tree: the children of ${math`n`} are ${math`${2}n`} and ${math`${2}n + ${1}`}, from the root ${1}. Searching depth first, left child first, and going no deeper than depth ${bound} (the root has depth ${0}), which label is visited in position ${k}?`,
      answer: { kind: 'exact', expected: String(order[k - 1]) },
      solution: [
        t`Depth first finishes the whole left subtree before the right one: from ${1} go to ${2}, then ${4}, and so on down to depth ${bound}, then back up.`,
        t`The visiting order is ${math`${listOf(order.slice(0, Math.max(k, 6)))}, \ldots`}, so position ${k} is ${order[k - 1] as number}.`,
      ],
    };
  },
  solve: ({ bound, k }) => String(dfs(bound)[k - 1]),
  misconceptions: ({ bound, k }): Misconception[] => [
    { response: String(bfs(bound)[k - 1]), why: t`That is the breadth-first order, level by level. Depth first goes down the left branch before visiting the rest of a level.` },
    { response: String(dfs(bound, true)[k - 1]), why: t`That visits the right child first. Here the left child, ${math`${2}n`}, comes first.` },
  ],
});

interface FirstP { m: number; bound: number; method: 'bfs' | 'dfs' }
const firstFound = ({ m, bound, method }: FirstP): number => (method === 'bfs' ? bfs(bound) : dfs(bound)).find((x) => x > 1 && x % m === 0) as number;
const firstGen = generator<FirstP>({
  id: 'first-solution',
  skill: 'Find the first solution each search reaches: breadth first finds a nearest one, depth first the first in its left-to-right descent.',
  params: (rng) => {
    for (;;) {
      const fp: FirstP = { m: int(rng, 3, 9), bound: int(rng, 3, 4), method: pick(rng, ['bfs', 'dfs'] as const) };
      const v = firstFound(fp);
      const other = firstFound({ ...fp, method: fp.method === 'bfs' ? 'dfs' : 'bfs' });
      if (v !== undefined && other !== undefined && v !== other && 2 * fp.m !== v) return fp;
    }
  },
  sane: ({ m }) => (m >= 3 ? null : 'm'),
  problem: (fp) => {
    const order = (fp.method === 'bfs' ? bfs(fp.bound) : dfs(fp.bound)).slice(0, 8);
    const v = firstFound(fp);
    return {
      prompt: t`In the tree of ${ml`next n = [${2} * n; ${2} * n + ${1}]`} from ${1}, cut off below depth ${fp.bound}, a solution is a label greater than ${1} that is a multiple of ${fp.m}. Which solution does ${fp.method === 'bfs' ? 'breadth-first' : 'depth-first (left child first)'} search find first?`,
      answer: { kind: 'exact', expected: String(v) },
      solution: [
        fp.method === 'bfs' ? t`Breadth first visits the labels level by level, which here is in increasing order: ${math`${listOf(order)}, \ldots`}.` : t`Depth first goes down the left branches first: ${math`${listOf(order)}, \ldots`}.`,
        t`The first label in that order divisible by ${fp.m} is ${v}${fp.method === 'bfs' ? t`, at depth ${depth(v)}: no solution is nearer the root.` : t`, at depth ${depth(v)}.`}`,
      ],
    };
  },
  solve: (fp) => String(firstFound(fp)),
  misconceptions: (fp): Misconception[] => [
    { response: String(firstFound({ ...fp, method: fp.method === 'bfs' ? 'dfs' : 'bfs' })), why: fp.method === 'bfs' ? t`That is what depth first finds. Breadth first examines every node at one depth before the next, so it finds a nearest solution.` : t`That is the nearest solution, which breadth first finds. Depth first commits to the left branch and may find a deeper one first.` },
    { response: String(2 * fp.m), why: t`${fp.m} itself is a label in the tree, at depth ${depth(fp.m)}.` },
  ],
});

interface CountP { b: number; d: number }
const countGen = generator<CountP>({
  id: 'nodes-to-depth',
  skill: 'Count the nodes breadth-first search examines to depth d in a tree with branching factor b: 1 + b + ... + b^d.',
  quick: true,
  params: (rng) => ({ b: int(rng, 2, 5), d: int(rng, 2, 5) }),
  sane: ({ b }) => (b >= 2 ? null : 'b'),
  problem: ({ b, d }) => {
    let total = 0;
    for (let i = 0; i <= d; i++) total += b ** i;
    return {
      prompt: t`A search tree has branching factor ${b}: every node has ${b} children. How many nodes does breadth-first search examine down to depth ${d}, the root being depth ${0}, if no solution is found?`,
      answer: { kind: 'exact', expected: String(total) },
      solution: [
        t`Depth ${math`i`} has ${math`${b}^{i}`} nodes, so the total is ${math`${1} + ${b} + \cdots + ${b}^{${d}} = \frac{${b}^{${d + 1}} - ${1}}{${b} - ${1}} = ${total}`}.`,
        t`That is ${math`O(b^{d})`} in both time and space, since breadth first stores a whole level in its queue.`,
      ],
    };
  },
  solve: ({ b, d }) => String((b ** (d + 1) - 1) / (b - 1)),
  misconceptions: ({ b, d }): Misconception[] => [
    { response: String(b ** d), why: t`That counts only the deepest level. Breadth first examines every level above it too.` },
    { response: String(b ** (d + 1)), why: t`Add the levels ${math`${0}`} to ${d}: ${math`\frac{b^{d + ${1}} - ${1}}{b - ${1}}`}.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const path = (moves: readonly ('L' | 'R')[]): number => moves.reduce((n, mv) => (mv === 'L' ? 2 * n : 2 * n + 1), 1);
const focs105 = auto({
  id: 'focs-10-5',
  source: cite('focs-notes', 'Lecture 10, Exercise 10.5', true),
  title: t`The tree represented by ${ml`next`}`,
  prompt: t`Regard ${ml`let next n = [${2} * n; ${2} * n + ${1}]`} as a tree whose subtrees are computed from the current label. What tree does ${ml`next ${1}`} represent? Starting at the root ${1}, which label is reached by going right, then left, then right?`,
  answer: { kind: 'exact', expected: String(path(['R', 'L', 'R'])) },
  solution: [
    t`The children of ${math`n`} are ${math`${2}n`} (left) and ${math`${2}n + ${1}`} (right). It is the infinite complete binary tree whose labels, read level by level, are ${math`${1}, ${2}, ${3}, ${4}, \ldots`}: each positive integer exactly once, depth ${math`d`} holding ${math`${2}^{d}`} to ${math`${2}^{d + ${1}} - ${1}`}.`,
    t`Right from ${1} is ${3}; left from ${3} is ${6}; right from ${6} is ${13}.`,
    t`In binary, ${13} is ${ml`${1}${1}${0}${1}`}: after the leading ${1}, each bit is a step, ${0} for left and ${1} for right, as for FoCS's functional arrays.`,
  ],
  reference: '13',
  verify: () => same('right, left, right', path(['R', 'L', 'R']), 13) ?? same('breadth-first order', bfs(3).join(','), Array.from({ length: 15 }, (_, i) => i + 1).join(',')),
  misconceptions: [{ response: '10', why: t`That goes left, right, left. Right means the child ${math`${2}n + ${1}`}.` }],
});
const depthOf = auto({
  id: 'focs-10-5-depth',
  source: cite('focs-notes', 'Lecture 10, Exercise 10.5', true),
  title: t`How deep is ${100}?`,
  prompt: t`In the tree of ${ml`next n = [${2} * n; ${2} * n + ${1}]`} with root ${1} at depth ${0}, at what depth is the label ${100}, and so how many nodes does breadth-first search visit before it?`,
  answer: { kind: 'exact', expected: String(depth(100)) },
  solution: [
    t`Depth ${math`d`} holds the labels ${math`${2}^{d}`} to ${math`${2}^{d + ${1}} - ${1}`}, and ${math`${64} \le ${100} \le ${127}`}, so the depth is ${depth(100)}.`,
    t`Breadth first visits labels in increasing order, so it visits ${99} nodes before ${100}.`,
  ],
  reference: '6',
  verify: () => same('depth of 100', depth(100), 6) ?? same('position of 100 in breadth-first order', bfs(6).indexOf(100), 99),
  misconceptions: [{ response: '7', why: t`The root ${1} is at depth ${0}, so ${math`${2}^{${6}} = ${64}`} starts depth ${6}.` }, { response: '50', why: t`The parent of ${100} is ${50}; count the halvings down to ${1} instead.` }],
});
const focs102 = supervision({
  id: 'focs-10-2',
  source: cite('focs-notes', 'Lecture 10, Exercise 10.2'),
  title: t`An array queue for breadth-first search`,
  prompt: t`The traditional way to implement queues uses a fixed-length array, with two indices for the start and end of the queue, which wraps round from the end of the array to the start. How appropriate is such a data structure for implementing breadth-first search?`,
  writeUp: 'explanation',
});
const focs103 = supervision({
  id: 'focs-10-3',
  source: cite('focs-notes', 'Lecture 10, Exercise 10.3'),
  title: t`${ml`breadth`} with ${ml`let`}`,
  prompt: t`Write a version of the function ${ml`breadth`}, breadth-first traversal with the two-list queue, using a nested ${ml`let`} construction rather than ${ml`match`}.`,
  writeUp: 'explanation',
});
const focs104 = supervision({
  id: 'focs-10-4',
  source: cite('focs-notes', 'Lecture 10, Exercise 10.4'),
  title: t`When iterative deepening is wrong`,
  prompt: t`Iterative deepening is inappropriate if ${math`b \approx ${1}`}, where ${math`b`} is the branching factor. Explain why, using the cost of repeating the shallower searches, and say what search strategy is appropriate in this case.`,
  writeUp: 'explanation',
});

// ---------------------------------------------------------------- lesson

export const search: TopicContent = {
  topicId: 'fp.search',
  goal: t`Search a tree depth first with a stack and breadth first with a queue, and see why breadth first finds the nearest solution.`,
  objective: t`Search a tree depth first with a stack and breadth first with a queue, and compare what each finds.`,
  why: t`Puzzles, games, and planners are tree searches; the choice of data structure decides which answer you get.`,
  minutes: 35,
  lesson: [
    { kind: 'section', title: t`Two ways through a tree` },
    { kind: 'hook', text: t`A puzzle's possible moves form a tree: the start at the root, each move a branch. One solution lies twenty moves deep on the far left, another two moves away on the right. Which does your search find? It depends entirely on the order in which it visits the nodes.` },
    { kind: 'narrative', text: t`Preorder, inorder, and postorder traversals are all depth first: at each node the whole left subtree is explored before the right. FoCS points out the danger: if the left subtree is very deep, or infinite, the search never reaches the right.` },
    { kind: 'definition', name: t`Depth-first and breadth-first search`, formal: t`[[depth-first-search|Depth-first search]] explores one subtree of a node completely before moving on to the next. [[breadth-first-search|Breadth-first search]] visits every node at depth ${math`k`} before any node at depth ${math`k + ${1}`}.`, plain: t`Depth first dives; breadth first spreads out level by level. In the tree of ${ml`next n = [${2} * n; ${2} * n + ${1}]`}, breadth first visits ${math`${1}, ${2}, ${3}, ${4}, \ldots`} while depth first visits ${math`${1}, ${2}, ${4}, ${8}, \ldots`}.` },
    { kind: 'section', title: t`The data structure decides the search` },
    { kind: 'narrative', text: t`Both searches keep a collection of subtrees still to visit. Take one out, visit its root, put its children in. The only difference is which subtree comes out next.` },
    {
      kind: 'steps',
      steps: [
        { label: t`With a stack`, text: t`Take out the subtree added most recently (last in, first out): the children of the node just visited come out next, so the search dives. That is depth first.` },
        { label: t`With a queue`, text: t`Take out the subtree waiting longest (first in, first out): children wait behind everything already queued, which is all of the current level. That is breadth first.` },
        { label: t`The cost of the queue`, text: t`FoCS's ${ml`nbreadth`} uses a list and ${ml`ts @ [t; u]`}, copying the whole queue at every node. With the two-list queue each operation is ${math`O(${1})`} amortised: FoCS measured ${30} seconds against ${0.15} on a tree of ${4095} labels.` },
      ],
    },
    { kind: 'rule', text: [mlBlock`
      let rec breadth q =
        if qnull q then []
        else match qhd q with
          | Lf -> breadth (deq q)
          | Br (v, t, u) -> v :: breadth (enq (enq (deq q) t) u)
    `] },
    checkFrom(orderGen, { bound: 2, k: 4 }, t`Depth first visits ${1}, ${2}, ${4}, ${5}, ${3}, ${6}, ${7}: the fourth is ${5}.`),
    { kind: 'theorem', name: t`Breadth first finds the nearest solution`, statement: t`Breadth-first search visits the nodes of a finite-branching tree in order of nondecreasing depth. So the first solution it visits is at the least depth of any solution.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`The invariant`, text: t`Claim: at every moment the depths of the queued subtrees' roots, from front to back, are nondecreasing, and the last exceeds the first by at most ${1}.`, plain: t`For example depths ${math`${3}, ${3}, ${4}, ${4}`}, never ${math`${4}, ${3}`}.` },
        { label: t`It starts true`, text: t`Initially the queue holds only the root, at depth ${0}.` },
        { label: t`It stays true`, text: t`Removing the front, at depth ${math`d`}, leaves depths between ${math`d`} and ${math`d + ${1}`}; its children, at depth ${math`d + ${1}`}, join the back. The order is still nondecreasing and the spread still at most ${1}.` },
        { label: t`Conclude`, text: t`Nodes are visited from the front, so in nondecreasing depth: every node at depth ${math`k`} is visited before any at depth ${math`k + ${1}`}. The first solution visited has the least depth.` },
      ],
    },
    checkFrom(firstGen, { m: 3, bound: 3, method: 'dfs' }, t`Depth first visits ${1}, ${2}, ${4}, ${8}, ${9}: ${9} is the first multiple of ${3} it meets, though ${3} itself is nearer the root.`),
    { kind: 'section', title: t`Paying for breadth` },
    { kind: 'narrative', text: t`Breadth first is complete and finds the nearest solution, but it stores whole levels. With branching factor ${math`b`}, reaching depth ${math`d`} means examining and storing ${math`${1} + b + \cdots + b^{d} = \frac{b^{d + ${1}} - ${1}}{b - ${1}}`} nodes, which is ${math`O(b^{d})`}.` },
    checkFrom(countGen, { b: 2, d: 3 }, t`${math`${1} + ${2} + ${4} + ${8} = ${15}`}.`),
    { kind: 'p', text: t`Iterative deepening keeps the nearest-first property in little space: depth-first search to depth ${1}, then to depth ${2}, and so on, discarding each result. Is the repetition wasteful? Take a binary tree. A search to depth ${math`j`} examines ${math`${2}^{j + ${1}} - ${1}`} nodes, and the rounds before it, to depths ${0} up to ${math`j - ${1}`}, examine ${math`(${2}^{${1}} - ${1}) + \cdots + (${2}^{j} - ${1}) = ${2}^{j + ${1}} - ${2} - j`} together, fewer than the last round alone. So all the rounds together cost less than twice the last one.`, why: { q: t`Where does ${math`${2}^{j + ${1}} - ${2} - j`} come from?`, a: t`The powers ${math`${2}^{${1}} + \cdots + ${2}^{j}`} form a geometric series with sum ${math`${2}^{j + ${1}} - ${2}`}, and the ${math`j`} terms ${math`-${1}`} add to ${math`-j`}.` } },
    { kind: 'pitfall', claim: t`Depth-first search always finds a solution if one exists.`, counterexample: t`In an infinite tree, if the leftmost branch is infinite and has no solution, depth first descends it forever and never reaches a solution one step to the right. Breadth first reaches it at depth ${1}.` },
    { kind: 'takeaway', text: t`The same search with a stack is depth first and with a queue is breadth first; only breadth first is sure to find the nearest solution, at the price of storing whole levels.` },
  ],
  examples: [
    { ...workedCambridge(focs105), examiner: t`The examiner wants the tree described in general (children ${math`${2}n`} and ${math`${2}n + ${1}`}, every positive integer once, the levels) before any particular path.` },
    worked(firstGen, { m: 6, bound: 4, method: 'bfs' }, t`Breadth first finds the nearest solution`),
    worked(countGen, { b: 3, d: 4 }, t`How many nodes breadth first stores`),
  ],
  generators: [orderGen, firstGen, countGen],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['depth-first-search', 'breadth-first-search'],
  cambridge: [depthOf, focs102, focs103, focs104],
  gate: ['focs-10-4', 'focs-10-2'],
  recall: [
    { front: t`Which data structure gives depth-first search, and which breadth-first?`, back: t`A stack (last in, first out) gives depth first; a queue (first in, first out) gives breadth first.` },
    { front: t`Why does breadth-first search find a nearest solution?`, back: t`It visits nodes in nondecreasing depth: its queue's depths are always nondecreasing.` },
    { front: t`How many nodes does breadth first examine to depth ${math`d`}, branching ${math`b`}?`, back: t`${math`\frac{b^{d + ${1}} - ${1}}{b - ${1}}`}, which is ${math`O(b^{d})`}.` },
  ],
  proofOrder: [{
    title: t`Breadth first finds the nearest solution`,
    steps: [
      t`Initially the queue holds only the root, at depth ${0}.`,
      t`The queued depths are nondecreasing and span at most ${1}.`,
      t`Removing the front and appending its children keeps that true.`,
      t`So nodes are visited in nondecreasing depth, and the first solution is a nearest one.`,
    ],
  }],
};
