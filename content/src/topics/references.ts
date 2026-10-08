/**
 * fp.references: References and arrays. The lesson follows FoCS Lecture 11 ("Elements of
 * Procedural Programming": ref, !, and :=; assignment against binding; commands and
 * sequencing; while; private persistent references in makeAccount; arrays) and CS3110
 * Sections 6.1 to 6.3 (refs, mutable fields, arrays and loops). The problems are FoCS
 * exercises 11.1 to 11.5 and the makeAccount session of Section 11.7.
 *
 * Checked in OCaml 4.11.1: with q = p, q := !q + 3 then p := !p * 2 from 5 leaves !p = 16;
 * with q = ref !p the same leaves !q = 8 and !p = 10; swap exchanges 1 and 2; student 5 is
 * 495 and student 500 then raises TooMuch 5; the while loop with k = 3, n = 4 gives 30.
 * The generators run the same programs on a model of the store.
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { int, pick } from '../math';
import { ml, mlBlock } from '../ocaml-code';
import { generator, type Misconception } from '../problem';
import { math, t } from '../rich';
import { checkFrom, worked, workedProof, type TopicContent } from '../topic';

// ---------------------------------------------------------------- generators

interface AliasP { alias: boolean; a: number; b: number; c: number }

/** The program run on a store of cells: q either names p's cell or a fresh one. */
function runAlias({ alias, a, b, c }: AliasP): { p: number; q: number } {
  const store = [a];
  const p = 0;
  let q = p;
  if (!alias) {
    store.push(store[p] as number);
    q = 1;
  }
  store[q] = (store[q] as number) + b;
  store[p] = (store[p] as number) * c;
  return { p: store[p] as number, q: store[q] as number };
}

const aliasing = generator<AliasP>({
  id: 'ref-aliasing',
  skill: 'Trace assignments through references, telling a second name for the same cell (aliasing) from a new cell holding a copy.',
  quick: true,
  params: (rng) => ({ alias: rng() < 0.5, a: int(rng, 2, 9), b: int(rng, 1, 9), c: int(rng, 2, 5) }),
  sane: ({ c }) => (c >= 2 ? null : 'c'),
  problem: (ap) => {
    const r = runAlias(ap);
    const ask = ap.alias ? 'p' : 'q';
    return {
      prompt: t`What is the value of this expression?`.concat([mlBlock`
        let p = ref ${ap.a} in
        let q = ${ap.alias ? 'p' : 'ref !p'} in
        q := !q + ${ap.b};
        p := !p * ${ap.c};
        !${ask}
      `]),
      answer: { kind: 'exact', expected: String(ap.alias ? r.p : r.q) },
      solution: ap.alias
        ? [
          t`${ml`let q = p`} binds ${ml`q`} to the same reference as ${ml`p`}: one cell with two names.`,
          t`So ${ml`q := !q + ${ap.b}`} makes the cell ${ap.a + ap.b}, and ${ml`p := !p * ${ap.c}`} makes it ${math`${ap.a + ap.b} \times ${ap.c} = ${r.p}`}.`,
        ]
        : [
          t`${ml`ref !p`} creates a new cell holding a copy of the contents of ${ml`p`}, so ${ml`q`} and ${ml`p`} are different cells.`,
          t`${ml`q := !q + ${ap.b}`} changes only ${ml`q`}'s cell, to ${r.q}; the assignment to ${ml`p`} does not touch it. So ${ml`!q`} is ${r.q}.`,
        ],
    };
  },
  solve: (ap) => {
    const r = runAlias(ap);
    return String(ap.alias ? r.p : r.q);
  },
  misconceptions: (ap): Misconception[] => {
    const other = runAlias({ ...ap, alias: !ap.alias });
    return [
      { response: String(ap.alias ? other.p : other.q), why: ap.alias ? t`${ml`let q = p`} does not copy the cell: ${ml`q`} and ${ml`p`} are the same reference, so both assignments change it.` : t`${ml`ref !p`} makes a new cell: assigning to ${ml`p`} afterwards does not change ${ml`q`}.` },
      { response: String(ap.a), why: t`Assignment changes the contents of a reference; ${ml`!`} reads the current contents, not the initial value.` },
    ];
  },
});

interface LoopP { n: number; k: number; addFirst: boolean }
const loopValue = ({ n, k, addFirst }: LoopP): number => {
  let i = 0;
  let s = 0;
  while (i < n) {
    if (addFirst) {
      s += k * i;
      i += 1;
    } else {
      i += 1;
      s += k * i;
    }
  }
  return s;
};

const whileLoop = generator<LoopP>({
  id: 'while-loop',
  skill: 'Trace a while loop over references: the condition is tested before each pass, and the commands in the body run in sequence.',
  params: (rng) => ({ n: int(rng, 4, 9), k: int(rng, 1, 6), addFirst: rng() < 0.5 }),
  sane: ({ n }) => (n >= 4 ? null : 'n'),
  problem: (lp) => {
    const v = loopValue(lp);
    const body = lp.addFirst ? `s := !s + ${lp.k} * !i; i := !i + ${1}` : `i := !i + ${1}; s := !s + ${lp.k} * !i`;
    const range = lp.addFirst ? [0, lp.n - 1] : [1, lp.n];
    return {
      prompt: t`What is the value of this expression?`.concat([mlBlock`
        let i = ref ${0} and s = ref ${0} in
        while !i < ${lp.n} do ${{ kind: 'code', text: body }} done;
        !s
      `]),
      answer: { kind: 'exact', expected: String(v) },
      solution: [
        t`The loop runs while ${ml`!i < ${lp.n}`}: ${lp.n} passes, with ${ml`!i`} going from ${0} to ${lp.n}.`,
        lp.addFirst ? t`${ml`s`} is updated before ${ml`i`}, so it adds ${lp.k} times ${0}, ${1}, and so on up to ${lp.n - 1}.` : t`${ml`i`} is updated before ${ml`s`}, so it adds ${lp.k} times ${1}, ${2}, and so on up to ${lp.n}.`,
        t`Total ${math`${lp.k} \times (${range[0] as number} + \cdots + ${range[1] as number}) = ${v}`}.`,
      ],
    };
  },
  solve: (lp) => String(loopValue(lp)),
  misconceptions: (lp): Misconception[] => [
    { response: String(loopValue({ ...lp, addFirst: !lp.addFirst })), why: t`The order of the two assignments matters: ${ml`!i`} is read after the commands before it in the sequence have run.` },
    { response: String(lp.k * lp.n), why: t`${ml`s`} gains ${lp.k} times the current ${ml`!i`} on each pass, not ${lp.k}.` },
  ],
});

interface ArrP { n: number; m: number; j: number; k: number; v: number }
const arrayValue = ({ m, j, k, v }: ArrP): number => (j === k ? v : k * m);

const arrays = generator<ArrP>({
  id: 'array-update',
  skill: 'Create an array with Array.init, update an element in place with a.(j) <- v, and read an element: indices run from 0 to n - 1.',
  quick: true,
  params: (rng) => {
    const n = int(rng, 5, 9);
    const k = int(rng, 1, n - 2);
    return { n, m: int(rng, 2, 9), j: rng() < 0.35 ? k : int(rng, 0, n - 1), k, v: int(rng, 40, 99) };
  },
  sane: ({ n, j, k }) => (j < n && k < n - 1 && k >= 1 ? null : 'index'),
  problem: (ap) => ({
    prompt: t`What is the value of this expression?`.concat([mlBlock`
      let a = Array.init ${ap.n} (fun i -> i * ${ap.m}) in
      a.(${ap.j}) <- ${ap.v};
      a.(${ap.k})
    `]),
    answer: { kind: 'exact', expected: String(arrayValue(ap)) },
    solution: [
      t`${ml`Array.init ${ap.n} f`} makes the array ${ml`[|f ${0}; ...; f ${ap.n - 1}|]`}, so ${ml`a.(i)`} starts as ${math`i \times ${ap.m}`}.`,
      ap.j === ap.k ? t`${ml`a.(${ap.j}) <- ${ap.v}`} overwrites element ${ap.k}, so ${ml`a.(${ap.k})`} is ${ap.v}.` : t`${ml`a.(${ap.j}) <- ${ap.v}`} changes element ${ap.j} only, so ${ml`a.(${ap.k})`} is still ${math`${ap.k} \times ${ap.m} = ${ap.k * ap.m}`}.`,
    ],
  }),
  solve: (ap) => String(arrayValue(ap)),
  misconceptions: (ap): Misconception[] => [
    { response: String((ap.k - 1) * ap.m), why: t`Array indices start at ${0}: ${ml`a.(${ap.k})`} is the element made by ${ml`f ${ap.k}`}, not the ${ap.k}th one counting from ${1}.` },
    { response: String((ap.k + 1) * ap.m), why: t`${ml`Array.init`} passes the index itself, starting at ${0}, so element ${ap.k} is ${math`${ap.k} \times ${ap.m}`}.` },
    { response: String(ap.j === ap.k ? ap.k * ap.m : ap.v), why: ap.j === ap.k ? t`The update ${ml`a.(${ap.j}) <- ${ap.v}`} changed that very element: arrays are mutable.` : t`The update changed element ${ap.j}, not element ${ap.k}.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const swapWorked = workedProof({
  title: t`Exchanging two references`,
  source: cite('focs-notes', 'Lecture 11, Exercise 11.4'),
  prompt: t`Write a function to exchange the values of two references, ${ml`xr`} and ${ml`yr`}.`,
  steps: [
    t`An exchange needs somewhere to keep one value while the other is copied over it. A plain ${ml`let`} binding will do: it holds a value, not a cell.`,
    t`${ml`let swap xr yr = let t = !xr in xr := !yr; yr := t`}, of type ${ml`'a ref -> 'a ref -> unit`}.`,
    t`Trace it with ${ml`xr`} holding ${1} and ${ml`yr`} holding ${2}: ${ml`t`} is bound to ${1}; ${ml`xr := !yr`} makes ${ml`xr`} hold ${2}; ${ml`yr := t`} makes ${ml`yr`} hold ${1}.`,
    t`Without ${ml`t`}, ${ml`xr := !yr; yr := !xr`} would leave both holding ${2}: the first assignment destroys the old contents of ${ml`xr`} before they are read.`,
  ],
  answer: t`${ml`let swap xr yr = let t = !xr in xr := !yr; yr := t`}.`,
});

const account = auto({
  id: 'focs-11-accounts',
  source: cite('focs-notes', 'Lecture 11, Sections 11.6 and 11.7', true),
  title: t`Two bank accounts`,
  prompt: t`FoCS's ${ml`makeAccount initBalance`} creates a private reference ${ml`balance`} and returns ${ml`withdraw`}, which raises ${ml`TooMuch (amt - !balance)`} if ${ml`amt > !balance`} and otherwise subtracts ${ml`amt`} and returns the new balance. After ${ml`let student = makeAccount ${500}`} and ${ml`student ${5}`}, the call ${ml`student ${500}`} raises ${ml`TooMuch n`}. What is ${ml`n`}?`,
  nudge: t`Not quite. The private balance persists between calls; trace it through both withdrawals.`,
  hints: [
    t`What does the reference ${ml`balance`} hold after ${ml`student ${5}`}?`,
    t`Is ${500} more than that balance, and so which branch of ${ml`withdraw`} runs?`,
    t`What does the exception carry: the balance, or the shortfall?`,
  ],
  answer: { kind: 'exact', expected: String(500 - (500 - 5)) },
  solution: [
    t`${ml`student ${5}`} changes the private balance from ${500} to ${495}; the reference persists between calls because ${ml`withdraw`} holds on to it.`,
    t`${ml`student ${500}`}: ${math`${500} > ${495}`}, so it raises ${ml`TooMuch (${500} - ${495})`}, that is ${ml`TooMuch ${5}`}.`,
    t`A reference captured by a closure keeps its value between calls.`,
  ],
  reference: '5',
  verify: () => {
    let balance = 500;
    balance -= 5;
    return same('the overdraft', 500 > balance ? 500 - balance : 0, 5);
  },
  misconceptions: [{ response: '0', why: t`The balance is no longer ${500}: the first withdrawal changed the private reference, and the change persists.` }, { response: '495', why: t`The exception carries the shortfall, ${math`${500} - ${495}`}, not the balance.` }],
});

const focs111 = supervision({
  id: 'focs-11-1',
  source: cite('focs-notes', 'Lecture 11, Exercise 11.1'),
  title: t`${ml`int ref list`} against ${ml`int list ref`}`,
  prompt: t`Comment, with examples, on the differences between an ${ml`int ref list`} and an ${ml`int list ref`}. Which can change its length, which can change its elements, and how?`,
  hints: [
    t`In an ${ml`int ref list`}, what is fixed when the list is built, and what can still be assigned?`,
    t`In an ${ml`int list ref`}, what does an assignment to the reference replace?`,
    t`For each type, which operation changes an element, and which changes the length?`,
  ],
  writeUp: 'explanation',
});
const focs112 = supervision({
  id: 'focs-11-2',
  source: cite('focs-notes', 'Lecture 11, Exercise 11.2'),
  title: t`${ml`power`} with ${ml`while`}`,
  prompt: t`Write a version of the function ${ml`power`} (Lecture ${1}) using ${ml`while`} instead of recursion. Explain what each reference holds at the start of each pass of the loop.`,
  hints: [
    t`Which quantities does the recursive ${ml`power`} carry from one call to the next?`,
    t`Which references would hold those quantities, and how does each pass of the loop update them?`,
    t`What stays true of the references at the start of every pass, and why does it give the answer when the loop stops?`,
  ],
  writeUp: 'explanation',
});
const focs113 = supervision({
  id: 'focs-11-3',
  source: cite('focs-notes', 'Lecture 11, Exercise 11.3'),
  title: t`A command before the test`,
  prompt: t`What is the effect of ${ml`while C${1}; B do C${2} done`}? Express it with a plain ${ml`while B do C done`} loop and explain.`,
  hints: [
    t`In ${ml`while C${1}; B do C${2} done`}, when does ${ml`C${1}`} run, relative to each test of ${ml`B`}?`,
    t`How many times does ${ml`C${1}`} run when ${ml`B`} is false at the first test?`,
    t`Where must copies of ${ml`C${1}`} go in a plain loop so that it still runs before every test of ${ml`B`}?`,
  ],
  writeUp: 'explanation',
});
const focs115 = supervision({
  id: 'focs-11-5',
  source: cite('focs-notes', 'Lecture 11, Exercise 11.5'),
  title: t`Identity and transpose with arrays`,
  prompt: t`Arrays of several dimensions are arrays of arrays. Write functions to (a) create the ${math`n \times n`} identity matrix, given ${math`n`}, and (b) transpose an ${math`m \times n`} matrix. Watch for ${ml`Array.make n (Array.make n ${0})`}: explain what goes wrong with it.`,
  hints: [
    t`How many arrays does ${ml`Array.make n (Array.make n ${0})`} create, and what does each row refer to?`,
    t`How can each row be made a fresh array, for example with ${ml`Array.init`}?`,
    t`For the transpose of an ${math`m \times n`} matrix, what shape is the result, and which entry of the original goes in row ${math`j`}, column ${math`i`}?`,
  ],
  writeUp: 'explanation',
});

// ---------------------------------------------------------------- lesson

export const references: TopicContent = {
  topicId: 'fp.references',
  goal: t`Use refs, mutable fields, and arrays, and tell assignment from binding.`,
  objective: t`Create, read, and assign references and arrays, and trace programs that change state.`,
  why: t`Hash tables are arrays updated in place; references also give functions private memory.`,
  minutes: 30,
  lesson: [
    { kind: 'section', title: t`Names and cells` },
    { kind: 'hook', text: t`So far nothing in OCaml has ever changed. ${ml`let x = ${5}`} means ${ml`x`} is ${5}, forever. But a bank balance changes, and so does a hash table's array as keys arrive. How do you write "the balance is now ${320}" in a language where values never change?` },
    { kind: 'narrative', text: t`You do not change the value. You make a cell, a place in memory, and change what is in it. The name still means the same cell forever; only the cell's contents change. FoCS calls this the difference between address and contents.` },
    { kind: 'definition', name: t`Reference`, formal: t`For a type ${math`\tau`}, a [[reference|reference]] of type ${math`\tau`} ${ml`ref`} is a mutable cell holding a value of type ${math`\tau`}. ${ml`ref E`} creates a new cell holding the value of ${math`E`}; ${ml`!P`} returns the current contents of the cell ${math`P`}; ${ml`P := E`} stores the value of ${math`E`} in ${math`P`} and returns ${ml`()`}.`, plain: t`${ml`let p = ref ${5}`} makes a cell holding ${5}; ${ml`p := !p + ${1}`} reads ${5}, adds ${1}, and stores ${6}. The types: ${ml`ref : 'a -> 'a ref`}, ${ml`(!) : 'a ref -> 'a`}, ${ml`(:=) : 'a ref -> 'a -> unit`}.` },
    { kind: 'theorem', name: t`Assignment against binding`, statement: t`Assignment never changes a ${ml`let`} binding: after ${ml`let p = ref ${5}`}, the name ${ml`p`} denotes the same reference until a new binding of ${ml`p`} hides it. Only the contents of the reference change.` },
    {
      kind: 'steps',
      steps: [
        { label: t`One cell, two names`, text: t`${ml`let q = p`} binds ${ml`q`} to the same reference as ${ml`p`}.`, plain: t`This is aliasing: an assignment through either name is seen through both.` },
        { label: t`Two cells`, text: t`${ml`let q = ref !p`} creates a new cell holding a copy of the contents of ${ml`p`}.`, plain: t`Now the cells are independent.` },
        { label: t`See the difference`, text: t`From ${ml`p`} holding ${5}: ${ml`q := !q + ${3}; p := !p * ${2}`} leaves ${ml`!p`} as ${16} with the first, and as ${10} with the second.`, why: { q: t`Why ${16}?`, a: t`One cell: ${5} becomes ${8}, then ${math`${8} \times ${2} = ${16}`}.` } },
      ],
    },
    checkFrom(aliasing, { alias: true, a: 4, b: 2, c: 3 }, t`One cell: ${4} becomes ${6}, then ${math`${6} \times ${3} = ${18}`}.`),
    { kind: 'pitfall', claim: t`${ml`p := !p + ${1}`} changes ${ml`p`}.`, counterexample: t`It changes the contents of the cell ${ml`p`} names; ${ml`p`} itself still names the same cell. So any other name for that cell sees the change: after ${ml`let p = ref ${5}`} and ${ml`let q = p`}, the assignment ${ml`p := !p + ${1}`} makes ${ml`!q`} equal to ${6} too.` },
    { kind: 'section', title: t`Commands, loops, and private state` },
    { kind: 'definition', name: t`Sequencing and while`, formal: t`${ml`C${1}; ...; Cn`} evaluates the expressions in order and returns the value of the last. ${ml`while B do C done`} evaluates ${math`B`}; if it is ${ml`true`} it evaluates ${math`C`} and repeats, and if ${ml`false`} it stops, returning ${ml`()`}.`, plain: t`A command is an expression run for its effect, usually returning ${ml`()`}. The loop may run zero times.` },
    checkFrom(whileLoop, { n: 4, k: 3, addFirst: false }, t`${ml`i`} goes up first, so ${ml`s`} adds ${3} times ${1}, ${2}, ${3}, ${4}: ${30}.`),
    { kind: 'narrative', text: t`References also give a function memory that nobody else can touch. In FoCS's ${ml`makeAccount`}, each call creates a fresh ${ml`balance`} cell and returns a ${ml`withdraw`} function that alone can reach it.` },
    { kind: 'rule', text: [mlBlock`
      let makeAccount initBalance =
        let balance = ref initBalance in
        let withdraw amt =
          if amt > !balance then raise (TooMuch (amt - !balance))
          else begin balance := !balance - amt; !balance end
        in
        withdraw
    `] },
    { kind: 'section', title: t`Arrays` },
    { kind: 'definition', name: t`Array`, formal: t`An [[mutable-array|array]] of type ${math`\tau`} ${ml`array`} and length ${math`n`} is a block of ${math`n`} mutable cells, indexed ${math`${0}, \ldots, n - ${1}`}. ${ml`Array.make n x`} fills it with ${math`x`}; ${ml`Array.init n f`} puts ${ml`f i`} in cell ${math`i`}; ${ml`a.(i)`} reads cell ${math`i`} and ${ml`a.(i) <- v`} stores ${math`v`} there.`, plain: t`Like ${math`n`} references in a row, reached by number in constant time. ${ml`Array.init ${5} (fun i -> i * ${10})`} is ${ml`[|${0}; ${10}; ${20}; ${30}; ${40}|]`}.` },
    checkFrom(arrays, { n: 6, m: 4, j: 2, k: 3, v: 50 }, t`Element ${2} changed; element ${3} is still ${math`${3} \times ${4} = ${12}`}.`),
    { kind: 'pitfall', claim: t`Like lists, arrays cannot change, so ${ml`let b = a`} gives a separate copy to work on.`, counterexample: t`An array is a block of mutable cells, and ${ml`let b = a`} names the same block, as ${ml`let q = p`} names the same reference. After ${ml`let a = Array.make ${3} ${0}`}, ${ml`let b = a`} and ${ml`b.(${0}) <- ${9}`}, the value of ${ml`a.(${0})`} is ${9} too. For a separate copy, use ${ml`Array.copy a`}.` },
    { kind: 'pitfall', claim: t`An index out of range reads whatever is next in memory, as in C.`, counterexample: t`OCaml checks every index: ${ml`Array.get ar ${20}`} on an array of length ${20} raises ${ml`Invalid_argument "index out of bounds"`}.` },
    { kind: 'takeaway', text: t`A let binding names a cell forever; assignment changes only what the cell holds, so two names for one cell see each other's changes.` },
  ],
  examples: [
    { ...swapWorked, examiner: t`The examiner wants a temporary for the old contents, the type, and a trace showing why the naive two assignments fail.` },
    worked(aliasing, { alias: false, a: 7, b: 5, c: 2 }, t`A copy is a new cell`),
    worked(whileLoop, { n: 5, k: 2, addFirst: true }, t`The order of commands in a loop body`),
  ],
  generators: [aliasing, whileLoop, arrays],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['reference', 'mutable-array'],
  cambridge: withUses([account, focs111, focs112, focs113, focs115], {
    'focs-11-1': { sections: ['Names and cells'], note: t`Telling apart a list of references and a reference to a list` },
    'focs-11-5': { sections: ['Arrays'], note: t`Building matrices from arrays without sharing rows` },
  }),
  gate: ['focs-11-1', 'focs-11-5'],
  recall: [
    { front: t`What do ${ml`ref E`}, ${ml`!P`}, and ${ml`P := E`} do?`, back: t`Create a cell holding ${math`E`}; read the cell's contents; store ${math`E`} in the cell, returning ${ml`()`}.` },
    { front: t`Assignment against binding?`, back: t`A ${ml`let`} binding never changes: the name denotes the same reference. Assignment changes only the reference's contents.` },
    { front: t`What are the indices of an array of length ${math`n`}?`, back: t`${0} to ${math`n - ${1}`}; any other index raises ${ml`Invalid_argument`}.` },
  ],
};
