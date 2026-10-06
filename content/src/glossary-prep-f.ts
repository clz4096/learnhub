/**
 * Glossary entries for the Preparation group F topics (functional programming 2:
 * higher-order functions, modules, data structures, algorithms). Kept in their own file so
 * the shared glossary changes by one import and one spread; checked like every other entry.
 */
import type { GlossaryEntry } from './glossary';
import { ml, mlList } from './ocaml-code';
import { math, t, type Rich } from './rich';

const g = (topic: string, id: string, term: string, definition: Rich, example: Rich, aliases?: readonly string[]): GlossaryEntry =>
  (aliases === undefined ? { id, term, definition, example, topic } : { id, term, definition, example, topic, aliases });

const HO = 'fp.higher-order';
const MF = 'fp.map-filter-fold';
const CX = 'fp.complexity';
const MO = 'fp.modules';
const FQ = 'fp.functional-queues';
const FU = 'fp.functors';
const RF = 'fp.references';
const HT = 'fp.hash-tables';
const BS = 'fp.binary-search-trees';
const RB = 'fp.red-black-trees';
const LZ = 'fp.lazy-sequences';
const SO = 'fp.sorting';
const SE = 'fp.search';

export const PREP_F_GLOSSARY: readonly GlossaryEntry[] = [
  g(HO, 'higher-order-function', 'Higher-order function', t`A function that takes a function as an argument or returns a function as its result. Also called a functional.`, t`${ml`let twice f x = f (f x)`} takes a function ${ml`f`}; ${ml`twice (fun x -> x + ${3}) ${10}`} is ${16}.`, ['functional', 'function as a value']),
  g(HO, 'anonymous-function', 'Anonymous function', t`A function written without a name, as ${ml`fun x -> E`}: the function mapping each ${math`x`} to the value of ${math`E`}.`, t`${ml`(fun n -> n * ${2}) ${17}`} is ${34}.`, ['fun', 'lambda', 'nameless function']),
  g(HO, 'currying', 'Currying', t`Writing a function of several arguments as nested functions of one argument each, so that ${ml`let f x y = E`} means ${ml`let f = fun x -> fun y -> E`}.`, t`${ml`let fn k n = n * ${2} + k`} has type ${ml`int -> int -> int`}, and ${ml`fn ${1} ${3}`} is ${7}.`, ['curried function', 'curry']),
  g(HO, 'partial-application', 'Partial application', t`Applying a curried function to fewer arguments than it takes; the result is a function of the arguments still missing.`, t`With ${ml`let twice f x = f (f x)`}, ${ml`twice double`} is a function of type ${ml`int -> int`}.`, ['partially applied']),
  g(MF, 'map-functional', 'Map', t`The functional that applies a function to every element of a list, keeping the order: ${ml`map f [x${1}; ...; xn] = [f x${1}; ...; f xn]`}.`, t`${ml`List.map (fun x -> x + ${1}) ${mlList([1, 2, 3])}`} is ${ml`${mlList([2, 3, 4])}`}.`, ['List.map', 'apply to all']),
  g(MF, 'filter-functional', 'Filter', t`The functional that keeps the elements of a list satisfying a predicate, in order, and drops the rest.`, t`${ml`List.filter (fun x -> x > ${2}) ${mlList([1, 5, 2, 8])}`} is ${ml`${mlList([5, 8])}`}.`, ['List.filter', 'predicate functional']),
  g(MF, 'fold', 'Fold', t`A functional that combines the elements of a list into one value, starting from a given value: ${ml`fold_left`} from the left end, ${ml`fold_right`} from the right end.`, t`${ml`List.fold_left ( + ) ${0} ${mlList([1, 2, 3])}`} is ${6}.`, ['fold_left', 'fold_right', 'reduce']),
  g(CX, 'big-o', 'O-notation', t`${math`f(n) = O(g(n))`} when there are constants ${math`c > ${0}`} and ${math`n_{${0}}`} with ${math`|f(n)| \le c|g(n)|`} for all ${math`n \ge n_{${0}}`}: eventually ${math`f`} is at most a constant times ${math`g`}.`, t`${math`n^{${2}} + ${50}n + ${36} = O(n^{${2}})`}, with ${math`c = ${2}`} and ${math`n_{${0}} = ${51}`}.`, ['big O', 'asymptotic complexity', 'order of growth']),
  g(CX, 'cost-recurrence', 'Cost recurrence', t`Equations giving a function's cost ${math`T(n)`} on the base cases and in terms of the costs of its recursive calls.`, t`Naive summing has ${math`T(${0}) = ${1}`}, ${math`T(n + ${1}) = T(n) + ${1}`}, so ${math`T(n) = n + ${1}`}.`, ['recurrence', 'recurrence equation']),
  g(MO, 'module', 'Module', t`A named group of definitions of types, values, and exceptions, written ${ml`module M = struct ... end`}; its parts are used as ${ml`M.x`}. Also called a structure.`, t`${ml`ListStack.push ${3} ListStack.empty`} uses the ${ml`push`} and ${ml`empty`} of the module ${ml`ListStack`}.`, ['structure', 'struct']),
  g(MO, 'signature', 'Signature', t`A module type, ${ml`sig ... end`}: the types and values a module must provide, with their types. Sealing a module with a signature hides everything the signature does not list.`, t`${ml`module ListStack : STACK = struct ... end`} is checked against ${ml`STACK`}, and only its names are visible outside.`, ['module type', 'interface', 'sig']),
  g(MO, 'abstract-type', 'Abstract type', t`A type declared in a signature without its definition, ${ml`type t`}. Outside the module it equals no other type, so its values can be handled only by the module's operations.`, t`Outside ${ml`ListStack`}, ${ml`ListStack.empty = []`} is a type error, though the stack is a list inside.`, ['abstraction', 'opaque type']),
  g(MO, 'representation-invariant', 'Representation invariant', t`A property of a module's internal values that every operation may assume of its arguments and must establish for its results.`, t`Fractions as pairs ${ml`(n, d)`} kept with ${math`d > ${0}`} and ${math`\gcd(n, d) = ${1}`}.`, ['invariant', 'RI']),
  g(FQ, 'queue', 'Queue', t`A sequence with first in, first out access: elements are added at the end and removed from the head.`, t`Enqueue ${3}, ${5}, ${8}: the head is ${3}; after one dequeue it is ${5}.`, ['FIFO', 'enqueue', 'dequeue']),
  g(FQ, 'amortised-cost', 'Amortised cost', t`The cost per operation averaged over any complete sequence of operations from the empty structure: ${math`O(f(n))`} amortised when every sequence of ${math`m`} operations costs ${math`O(m \, f(n))`}.`, t`The two-list queue does at most ${math`${2}e`} conses for ${math`e`} enqueues, so it is ${math`O(${1})`} amortised, though one dequeue can cost ${math`O(n)`}.`, ['amortized', 'amortised analysis', 'amortized analysis']),
  g(FU, 'functor', 'Functor', t`A parameterised module, ${ml`module F (M : S) = struct ... end`}: a function from modules matching the signature ${ml`S`} to modules.`, t`${ml`Map.Make (Char)`} is a module of maps with character keys.`, ['Map.Make', 'Set.Make', 'parameterised module']),
  g(FU, 'total-order', 'Total order', t`An ordering in which any two elements are comparable, consistently: never both ${math`a < b`} and ${math`b < a`}, and ${math`a < b`}, ${math`b < c`} give ${math`a < c`}. ${ml`Map.Make`} needs one on its keys.`, t`Dates ordered by month, then by day.`, ['linear order', 'compare']),
  g(RF, 'reference', 'Reference', t`A mutable cell: ${ml`ref E`} creates one holding the value of ${math`E`}, ${ml`!p`} reads its contents, and ${ml`p := E`} replaces them. The name ${ml`p`} always denotes the same cell.`, t`After ${ml`let p = ref ${5}`} and ${ml`p := !p + ${1}`}, ${ml`!p`} is ${6}.`, ['ref', 'assignment', 'mutable variable']),
  g(RF, 'mutable-array', 'Array', t`A fixed-length block of mutable cells indexed from ${0}: ${ml`a.(i)`} reads cell ${math`i`} and ${ml`a.(i) <- v`} stores ${math`v`} in it, each in constant time.`, t`${ml`Array.init ${4} (fun i -> i * i)`} is ${ml`[|${0}; ${1}; ${4}; ${9}|]`}.`, ['Array', 'mutable array']),
  g(HT, 'hash-function', 'Hash function', t`A function from keys to integers, used to choose a bucket. Equal keys must get equal hash values, and a good one spreads different keys evenly.`, t`${ml`let hash k = k mod ${7}`} sends ${15} to ${1}.`, ['hash', 'Hashtbl.hash']),
  g(HT, 'hash-table', 'Hash table', t`A dictionary stored as an array of buckets: each binding goes in the bucket at the index given by hashing its key. With chaining, each bucket is a short list of bindings.`, t`With ${7} buckets and ${ml`hash k = k mod ${7}`}, the keys ${8} and ${15} share bucket ${1}.`, ['Hashtbl', 'chaining', 'bucket']),
  g(HT, 'load-factor', 'Load factor', t`The number of bindings in a hash table divided by its number of buckets: the average bucket length. Tables resize to keep it bounded.`, t`${31} bindings in ${16} buckets: load factor ${math`\frac{${31}}{${16}}`}.`, ['alpha']),
  g(BS, 'binary-search-tree', 'Binary search tree', t`A binary tree of bindings in which, at every node, all keys in the left subtree are smaller than the node's key and all keys in the right subtree are larger. Lookup follows one path down.`, t`Inserting ${12}, ${5}, ${30} gives root ${12} with ${5} on the left and ${30} on the right.`, ['BST', 'search tree']),
  g(BS, 'tree-height', 'Height of a tree', t`The number of nodes on the longest path from the root down to an empty subtree; a leaf has height ${0}. A tree of height ${math`h`} has at most ${math`${2}^{h} - ${1}`} nodes.`, t`Inserting ${1}, ${2}, ${3}, ${4} in order gives a path of height ${4}.`, ['depth of a tree']),
  g(RB, 'red-black-tree', 'Red-black tree', t`A binary search tree with each node red or black, a black root, no red node with a red child, and the same number of black nodes on every path from the root to a leaf. Its height is at most ${math`${2}\log_{${2}}(n + ${1})`}.`, t`Inserting ${1}, ${2}, ${3} gives root ${2}, black, with ${1} and ${3} below.`, ['RB tree', 'balanced tree']),
  g(RB, 'black-height', 'Black height', t`The number of black nodes on each path from the root of a red-black tree to a leaf, the same on every path by the global invariant.`, t`A perfect all-black tree of height ${3} has black height ${3} and ${7} nodes.`),
  g(RB, 'rotation', 'Rotation', t`A local rearrangement of a few nodes of a search tree that keeps the order of keys; in Okasaki's balance, the middle of three keys moves up.`, t`A black ${30} with red child ${20} and red grandchild ${10} becomes ${20} with ${10} and ${30} as black children.`, ['balance', 'rebalancing']),
  g(LZ, 'lazy-sequence', 'Lazy sequence', t`A possibly infinite list whose tail is a function, computed only when demanded: ${ml`'a seq = Nil | Cons of 'a * (unit -> 'a seq)`}.`, t`${ml`let rec from k = Cons (k, fun () -> from (k + ${1}))`} is the sequence ${math`k, k + ${1}, k + ${2}, \ldots`}.`, ['lazy list', 'stream', 'seq']),
  g(LZ, 'forcing', 'Forcing', t`Calling the delayed tail function of a lazy sequence, ${ml`xf ()`}, to compute the next part.`, t`${ml`get ${2} (from ${6})`} forces the tail twice and returns ${ml`[${6}; ${7}]`}.`, ['force', 'delay']),
  g(SO, 'insertion-sort', 'Insertion sort', t`Sort the tail of a list, then insert the head into its place in the sorted result. ${math`O(n^{${2}})`} comparisons in the worst and average case.`, t`${ml`insort [${3}; ${1}; ${2}]`} inserts ${2}, then ${1}, then ${3}, giving ${ml`[${1}; ${2}; ${3}]`}.`, ['insort']),
  g(SO, 'quicksort', 'Quicksort', t`Choose a pivot, partition the other items into those at most the pivot and those greater, sort both parts recursively, and join them around the pivot. ${math`O(n \log n)`} on average, ${math`O(n^{${2}})`} in the worst case.`, t`Pivot ${6} splits ${ml`[${3}; ${9}; ${1}; ${7}]`} into ${ml`[${1}; ${3}]`} and ${ml`[${7}; ${9}]`}.`, ['quick', 'Hoare']),
  g(SO, 'mergesort', 'Mergesort', t`Split a list into halves, sort each recursively, and merge the sorted halves. ${math`O(n \log n)`} comparisons in the worst case, which is optimal for comparison sorting.`, t`${ml`[${5}; ${2}; ${8}; ${1}]`} splits into ${ml`[${2}; ${5}]`} and ${ml`[${1}; ${8}]`} once sorted, which merge to ${ml`[${1}; ${2}; ${5}; ${8}]`}.`, ['merge sort', 'merging']),
  g(SE, 'depth-first-search', 'Depth-first search', t`Searching a tree by exploring one subtree of each node completely before the next, keeping the pending subtrees on a stack. It needs little space but may miss a nearby solution.`, t`In the tree of ${ml`next n = [${2} * n; ${2} * n + ${1}]`}, it visits ${math`${1}, ${2}, ${4}, ${8}, \ldots`}.`, ['DFS', 'depth first']),
  g(SE, 'breadth-first-search', 'Breadth-first search', t`Searching a tree level by level, keeping the pending subtrees in a queue. It finds a solution nearest the root, but stores whole levels.`, t`In the tree of ${ml`next n = [${2} * n; ${2} * n + ${1}]`}, it visits ${math`${1}, ${2}, ${3}, ${4}, \ldots`}.`, ['BFS', 'breadth first']),
];
