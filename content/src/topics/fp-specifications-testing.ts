/**
 * fp.specifications-testing: Specifications and testing. The lesson follows CS3110 Sections
 * 8.1 to 8.6 (numbered 10.1 to 10.6 in the PDF edition): specifications with Requires,
 * Returns, and Raises clauses; black-box testing from the specification with typical and
 * boundary cases; glass-box testing and path completeness; randomized property testing with
 * QCheck. The problems are the CS3110 Chapter 8 exercises "qcheck odd divisor", "qcheck
 * avg", and "poly spec", and the Chapter 3 exercise "product test".
 *
 * Every OCaml answer was run in the OCaml 4.11.1 toplevel (scratch files ocamlE/t2.ml, t12.ml):
 *   odd_divisor: the smallest x >= 0 whose result is not an odd divisor of x is 4 (odd_divisor 4 = 5)
 *   the buggy avg [1; 1; 4] = 2.5, while the true average is 2
 *   is_odd (-3) = false for is_odd n = n mod 2 = 1; List.fold_left max 0 [-4; -2] = 0;
 *   the early-exit list_max [5; 3; 9] = 5; abs 1 = -1 for abs x = if x > 1 then x else -x
 */
import { auto, cite, same, supervision } from '../cambridge';
import { code, codeBlock, oc, showList } from '../ocaml-code';
import { int, pick } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { math, t, type Rich, type Span } from '../rich';
import { checkFrom, workedCambridge, worked, type TopicContent } from '../topic';
import type { Rng } from '@learnhub/mastery';

const omod = (a: number, b: number): number => a - b * Math.trunc(a / b);

// ---------------------------------------------------------------- which test reveals the bug

interface Bug {
  spec: Span;
  impl: Span;
  /** The specified answer and the implementation's, on one input. */
  right: (x: number[]) => number | boolean;
  impl_: (x: number[]) => number | boolean;
  /** A random input on which the two agree, and one on which they differ. */
  agree: (rng: Rng) => number[];
  differ: (rng: Rng) => number[];
  show: (x: number[]) => string;
  lesson: Rich;
}

const BUGS: readonly Bug[] = [
  {
    spec: codeBlock(code`(** [list_max xs] is the largest element of [xs].`, code`    Requires: [xs] is not empty. *)`),
    impl: codeBlock(code`let list_max xs = List.fold_left max ${0} xs`),
    right: (xs) => Math.max(...xs),
    impl_: (xs) => xs.reduce((m, x) => Math.max(m, x), 0),
    agree: (rng) => [int(rng, -9, 9), int(rng, 1, 9), int(rng, -9, 9)],
    differ: (rng) => [-int(rng, 1, 9), -int(rng, 1, 9)],
    show: (xs) => `list_max ${showList(xs)}`,
    lesson: t`The accumulator starts at ${0}, so the result is never below ${0}: only a list whose elements are all negative shows it. A boundary of the input space the specification did not mention.`,
  },
  {
    spec: codeBlock(code`(** [list_max xs] is the largest element of [xs].`, code`    Requires: [xs] is not empty. *)`),
    impl: codeBlock(code`let rec list_max = function`, code`  | [x] -> x`, code`  | x :: y :: t -> if x > y then x else list_max (y :: t)`, code`  | [] -> failwith "empty"`),
    right: (xs) => Math.max(...xs),
    impl_: (xs) => { let i = 0; while (i + 1 < xs.length && !((xs[i] as number) > (xs[i + 1] as number))) i++; return xs[i] as number; },
    agree: (rng) => { const a = int(rng, 1, 4); return [a, a + int(rng, 1, 3), a + int(rng, 5, 8)]; },
    differ: (rng) => { const b = int(rng, 1, 3); return [b + 4, b, b + int(rng, 6, 9)]; },
    show: (xs) => `list_max ${showList(xs)}`,
    lesson: t`It stops at the first element bigger than the next one, which need not be the largest. An increasing list hides that; a later, larger element after a drop reveals it.`,
  },
  {
    spec: codeBlock(code`(** [is_odd n] is [true] exactly when [n] is odd. *)`),
    impl: codeBlock(code`let is_odd n = n mod ${2} = ${1}`),
    right: ([n]) => Math.abs(n as number) % 2 === 1,
    impl_: ([n]) => omod(n as number, 2) === 1,
    agree: (rng) => [pick(rng, [int(rng, 0, 30), -2 * int(rng, 1, 15)])],
    differ: (rng) => [-(2 * int(rng, 0, 15) + 1)],
    show: ([n]) => `is_odd ${(n as number) < 0 ? `(${n})` : String(n)}`,
    lesson: t`In OCaml ${code`mod`} takes the sign of the number divided, so a negative odd ${code`n`} has ${code`n mod ${2}`} equal to ${-1}, not ${1}. Negative numbers are a class of input the tests must include.`,
  },
  {
    spec: codeBlock(code`(** [abs x] is the absolute value of [x]. *)`),
    impl: codeBlock(code`let abs x = if x > ${1} then x else -x`),
    right: ([x]) => Math.abs(x as number),
    impl_: ([x]) => ((x as number) > 1 ? (x as number) : -(x as number)),
    agree: (rng) => [pick(rng, [0, int(rng, 2, 40), -int(rng, 1, 40)])],
    differ: () => [1],
    show: ([x]) => `abs ${(x as number) < 0 ? `(${x})` : String(x)}`,
    lesson: t`The test should be ${code`x >= ${0}`}. The mistake only shows at the boundary value ${1}: typical positive and negative inputs, and even ${0}, all pass.`,
  },
];

interface RevealP { b: number; inputs: number[][]; right: number }

const reveal = generator<RevealP>({
  id: 'reveal-bug',
  skill: 'Choose the test case that reveals a bug: an input where the implementation and the specification disagree, often at a boundary.',
  params: (rng) => {
    const b = int(rng, 0, BUGS.length - 1);
    const bug = BUGS[b] as Bug;
    const seen = new Set<string>();
    const ins: number[][] = [];
    while (ins.length < 3) { const x = bug.agree(rng); if (!seen.has(bug.show(x)) && bug.right(x) === bug.impl_(x)) { seen.add(bug.show(x)); ins.push(x); } }
    const right = int(rng, 0, 3);
    ins.splice(right, 0, bug.differ(rng));
    return { b, inputs: ins, right };
  },
  sane: ({ b, inputs, right }) => {
    const bug = BUGS[b] as Bug;
    return inputs.length === 4 && inputs.filter((x) => bug.right(x) !== bug.impl_(x)).length === 1 && bug.right(inputs[right] as number[]) !== bug.impl_(inputs[right] as number[]) ? null : 'out of range';
  },
  problem: ({ b, inputs, right }) => {
    const bug = BUGS[b] as Bug;
    const options: ChoiceOption[] = inputs.map((x, i) => ({ id: `t${i}`, label: [code`${oc(bug.show(x))}`] }));
    const x = inputs[right] as number[];
    return {
      prompt: t`The specification is ${bug.spec} and the implementation is ${bug.impl} Of the test cases ${code`${oc(inputs.map(bug.show).join(', '))}`}, which reveals that the implementation is wrong?`,
      answer: { kind: 'choice', options, correct: `t${right}` },
      solution: [
        bug.lesson,
        t`On ${code`${oc(bug.show(x))}`} the specification requires ${code`${oc(String(bug.right(x)))}`}, but the implementation returns ${code`${oc(String(bug.impl_(x)))}`}. On the other inputs the two agree.`,
      ],
    };
  },
  solve: ({ b, inputs }) => {
    const bug = BUGS[b] as Bug;
    return inputs.map((x, i) => (bug.right(x) !== bug.impl_(x) ? `t${i}` : null)).filter((s): s is string => s !== null);
  },
  misconceptions: ({ b, inputs, right }): Misconception[] => {
    const bug = BUGS[b] as Bug;
    return inputs.map((x, i) => ({ x, i })).filter(({ i }) => i !== right).map(({ x, i }) => ({
      response: [`t${i}`],
      why: t`On ${code`${oc(bug.show(x))}`} the implementation gives ${code`${oc(String(bug.impl_(x)))}`}, which is what the specification asks for, so this test passes and reveals nothing.`,
    }));
  },
});

// ---------------------------------------------------------------- paths through the code

interface PathP { k: number; c: number[] }

const paths = generator<PathP>({
  id: 'paths',
  quick: true,
  skill: 'Count the execution paths through code with several independent if expressions: the number of tests a path complete glass-box suite needs.',
  params: (rng) => ({ k: int(rng, 3, 5), c: Array.from({ length: 5 }, () => int(rng, 1, 9)) }),
  sane: ({ k, c }) => (k >= 3 && k <= 5 && c.length === 5 ? null : 'out of range'),
  problem: ({ k, c }) => {
    const vars = ['a', 'b', 'c', 'd', 'e'].slice(0, k);
    const lines = vars.map((v, i) => code`  let s${i + 1} = if ${v} > ${c[i] as number} then s${i} + ${1} else s${i} * ${2} in`);
    return {
      prompt: t`How many execution paths are there through this function, and so how many test cases does a path complete glass-box test suite need at least? ${codeBlock(code`let f ${vars.join(' ')} =`, code`  let s${0} = ${0} in`, ...lines, code`  s${k}`)} (The conditions are on different arguments, so every combination can happen.)`,
      answer: { kind: 'exact', expected: String(2 ** k) },
      solution: [
        t`Each ${code`if`} has two branches, and the ${k} tests are independent, so each path is one choice of branch at each of the ${k} ${code`if`}s.`,
        t`That is ${math`${2}^{${k}} = ${2 ** k}`} paths, and one test case exercises exactly one path, so a path complete suite needs at least ${2 ** k} tests.`,
        t`Covering every branch once would need only ${2} tests (all conditions true, then all false). Path completeness asks for more, which is why CS${3110} calls it infeasible in general.`,
      ],
    };
  },
  solve: ({ k }) => {
    // Enumerate the outcomes of the k conditions.
    let n = 0;
    for (let mask = 0; mask < 1 << k; mask++) n++;
    return String(n);
  },
  misconceptions: ({ k }) => [
    { response: String(2 * k), why: t`That counts the branches, not the paths. A path makes a choice at every ${code`if`}, so the choices multiply: ${math`${2}^{${k}}`}.` },
    { response: String(k + 1), why: t`That would be right for ${code`if`}s nested so that each choice ends the function. Here every path passes through all ${k} of them, so the counts multiply.` },
  ],
});

// ---------------------------------------------------------------- preconditions

const NTH = [10, 20, 30];
const DIVIDEND = 17;
const arg = (v: number): string => (v < 0 ? `(${v})` : String(v));
interface PreItem { spec: Span; call: (v: number) => string; ok: (rng: Rng) => number; bad: (rng: Rng) => number; holds: (v: number) => boolean; what: Rich }
const PRE: readonly PreItem[] = [
  {
    spec: codeBlock(code`(** [nth xs k] is the element of [xs] at position [k], from ${0}.`, code`    Requires: ${0} <= k < length xs. *)`),
    call: (v) => `nth ${showList(NTH)} ${arg(v)}`, ok: (rng) => int(rng, 0, 2), bad: (rng) => pick(rng, [3, 4, -1]), holds: (v) => v >= 0 && v < 3,
    what: t`The list has ${NTH.length} elements, at positions ${0} to ${NTH.length - 1}.`,
  },
  {
    spec: codeBlock(code`(** [isqrt n] is the largest [r] with r * r <= n.`, code`    Requires: n >= ${0}. *)`),
    call: (v) => `isqrt ${arg(v)}`, ok: (rng) => int(rng, 0, 99), bad: (rng) => -int(rng, 1, 99), holds: (v) => v >= 0,
    what: t`Only non-negative arguments are allowed.`,
  },
  {
    spec: codeBlock(code`(** [div a b] is [a / b], rounded towards zero.`, code`    Requires: b <> ${0}. *)`),
    call: (v) => `div ${DIVIDEND} ${arg(v)}`, ok: (rng) => pick(rng, [-3, -2, -1, 1, 2, 3, 5]), bad: () => 0, holds: (v) => v !== 0,
    what: t`Any divisor but ${0} is allowed, negative ones included.`,
  },
];

interface PreP { i: number; vals: number[]; right: number }

const precondition = generator<PreP>({
  id: 'precondition',
  quick: true,
  skill: 'Read a specification\'s Requires clause and find the call that violates it, after which the function may do anything.',
  params: (rng) => {
    const i = int(rng, 0, PRE.length - 1);
    const it = PRE[i] as PreItem;
    const vals: number[] = [];
    while (vals.length < 3) { const v = it.ok(rng); if (!vals.includes(v)) vals.push(v); }
    const right = int(rng, 0, 3);
    vals.splice(right, 0, it.bad(rng));
    return { i, vals, right };
  },
  sane: ({ i, vals, right }) => {
    const it = PRE[i] as PreItem;
    return vals.length === 4 && vals.filter((v) => !it.holds(v)).length === 1 && !it.holds(vals[right] as number) ? null : 'out of range';
  },
  problem: ({ i, vals, right }) => {
    const it = PRE[i] as PreItem;
    return {
      prompt: t`Given the specification ${it.spec} which of the calls ${code`${oc(vals.map(it.call).join(', '))}`} violates the precondition?`,
      answer: { kind: 'choice', options: vals.map((v, j) => ({ id: `c${j}`, label: [code`${oc(it.call(v))}`] })), correct: `c${right}` },
      solution: [it.what, t`So ${code`${oc(it.call(vals[right] as number))}`} breaks the Requires clause. The specification then promises nothing: the function may return anything, raise, or loop. CS${3110} advises raising an exception early when the check is cheap.`],
    };
  },
  solve: ({ i, vals }) => vals.map((v, j) => ((PRE[i] as PreItem).holds(v) ? null : `c${j}`)).filter((s): s is string => s !== null),
  misconceptions: ({ i, vals, right }) => vals.map((v, j) => ({ v, j })).filter(({ j }) => j !== right).map(({ v, j }) => ({
    response: [`c${j}`],
    why: t`${code`${oc((PRE[i] as PreItem).call(v))}`} satisfies the Requires clause. ${(PRE[i] as PreItem).what}`,
  })),
});

// ---------------------------------------------------------------- Cambridge problems

/** The buggy odd_divisor of the exercise, run as written. */
function oddDivisor(x: number): number {
  if (x < 3) return 1;
  let y = 3;
  for (;;) {
    if (y >= x) return y;
    if (x % y === 0) return y;
    y += 2;
  }
}
const isOddDivisorOf = (d: number, x: number): boolean => d % 2 === 1 && x % d === 0;
const FIRST_BAD = (() => { for (let x = 0; ; x++) if (!isOddDivisorOf(oddDivisor(x), x)) return x; })();

const oddDiv = auto({
  id: 'cs3110-ex8-qcheck-odd-divisor',
  source: cite('cs3110-ex8', 'Exercise "qcheck odd divisor"'),
  title: t`Finding the bug a property test finds`,
  prompt: t`Here is a buggy function: ${codeBlock(
    code`(** [odd_divisor x] is an odd divisor of [x].`,
    code`    Requires: [x >= ${0}]. *)`,
    code`let odd_divisor x =`,
    code`  if x < ${3} then ${1} else`,
    code`  let rec search y =`,
    code`    if y >= x then y  (* exceeded upper bound *)`,
    code`    else if x mod y = ${0} then y  (* found a divisor *)`,
    code`    else search (y + ${2})  (* skip evens *)`,
    code`  in search ${3}`,
  )} A QCheck test checks, for many inputs, that the result is odd and divides the input. What is the smallest integer that triggers the bug?`,
  answer: { kind: 'exact', expected: String(FIRST_BAD) },
  solution: [
    t`The property to test is the postcondition: for ${code`x >= ${0}`}, ${code`odd_divisor x`} is odd and ${code`x mod (odd_divisor x) = ${0}`}.`,
    t`For ${code`x`} equal to ${0}, ${1}, ${2} the result is ${1}, which is odd and divides everything. For ${3} the search returns ${3} at once, which is fine.`,
    t`For ${FIRST_BAD}: ${3} does not divide it, so the search moves to ${5}, which is ${math`\ge ${FIRST_BAD}`}, and returns ${oddDivisor(FIRST_BAD)}. But ${oddDivisor(FIRST_BAD)} does not divide ${FIRST_BAD}. The smallest failing input is ${FIRST_BAD}.`,
    t`The bug: when no odd divisor below ${code`x`} is found, ${code`search`} returns a number at least ${code`x`}, instead of ${1}, which always works. Inputs with no odd divisor other than ${1}, the powers of ${2}, expose it.`,
  ],
  reference: String(FIRST_BAD),
  // OCaml 4.11.1: odd_divisor 4 = 5, and inputs 0 to 3 satisfy the property (scratch file ocamlE/t2.ml found 4).
  verify: () => same('smallest failing input', FIRST_BAD, 4),
  misconceptions: [
    { response: '8', why: t`${8} fails too, but a smaller input already does: check ${4}, where the search jumps from ${3} to ${5}.` },
    { response: '0', why: t`${code`odd_divisor ${0}`} is ${1}, and ${1} divides ${0}, so ${0} satisfies the property.` },
  ],
});

/** The buggy avg of the exercise, run as written. */
function buggyAvg(xs: readonly number[]): number {
  let [s, n, i] = [0, 0, 0];
  while (i < xs.length) {
    if (i + 1 >= xs.length) { s += xs[i] as number; n += 1; i += 1; } else if (xs[i] === xs[i + 1]) { s += xs[i] as number; n += 1; i += 2; } else { s += (xs[i] as number) + (xs[i + 1] as number); n += 2; i += 2; }
  }
  return s / n;
}
const AVG_IN = [1, 1, 4];
const AVG_BAD = buggyAvg(AVG_IN);
const qcAvg = auto({
  id: 'cs3110-ex8-qcheck-avg',
  source: cite('cs3110-ex8', 'Exercise "qcheck avg"', true),
  title: t`A buggy average`,
  prompt: t`Here is a buggy function: ${codeBlock(
    code`(** [avg [x${1}; ...; xn]] is [(x${1} + ... + xn) / n].`,
    code`    Requires: the input list is not empty. *)`,
    code`let avg lst =`,
    code`  let rec loop (s, n) = function`,
    code`    | [] -> (s, n)`,
    code`    | [ h ] -> (s + h, n + ${1})`,
    code`    | h${1} :: h${2} :: t -> if h${1} = h${2} then loop (s + h${1}, n + ${1}) t`,
    code`                       else loop (s + h${1} + h${2}, n + ${2}) t`,
    code`  in`,
    code`  let (s, n) = loop (${0}, ${0}) lst`,
    code`  in float_of_int s /. float_of_int n`,
  )} A QCheck test compares it with a simple reference implementation that is correct by inspection. What does the buggy ${code`avg ${AVG_IN}`} return?`,
  answer: { kind: 'numeric', expected: AVG_BAD, relTol: 0, absTol: 1e-9 },
  solution: [
    t`The first two elements are equal, ${1} and ${1}, so the third case adds only ${1} to the sum and ${1} to the count: one of the pair is lost.`,
    t`Then ${code`[${4}]`} adds ${4}. So ${code`s`} is ${5} and ${code`n`} is ${2}, and the result is ${math`\frac{${5}}{${2}} = ${AVG_BAD}`}.`,
    t`The true average is ${math`\frac{${1} + ${1} + ${4}}{${3}} = ${2}`}. A property test against a reference ${code`avg`} finds such an input quickly, because random lists often contain two equal neighbours.`,
  ],
  reference: String(AVG_BAD),
  // OCaml 4.11.1: avg [1; 1; 4] = 2.5.
  verify: () => same('avg [1; 1; 4]', AVG_BAD, 2.5),
  misconceptions: [{ response: '2', why: t`That is the true average, which the specification asks for; the question is what the buggy code returns.` }],
});

const productTest = supervision({
  id: 'cs3110-ex3-product-test',
  source: cite('cs3110-ex3', 'Exercise "product test"'),
  title: t`Testing product`,
  prompt: t`Write ${code`product`}, which returns the product of all the elements of an int list, the product of the empty list being ${1}. Then write a black-box test suite for it, from the specification alone: list your test cases, the class of inputs each represents (empty, one element, containing ${0}, negative elements, and so on), and the expected output of each.`,
  writeUp: 'explanation',
});
const polySpec = supervision({
  id: 'cs3110-ex8-poly-spec',
  source: cite('cs3110-ex8', 'Exercise "poly spec"'),
  title: t`Specifying polynomials`,
  prompt: t`Design an interface for immutable single variable integer polynomials ${math`c_{n}x^{n} + \cdots + c_{${1}}x + c_{${0}}`}, starting from ${code`val eval : int -> t -> int`}, where ${code`eval x p`} is ${code`p`} evaluated at ${code`x`}. Add operations a client would need to create, combine, and query polynomials, and write a specification comment for each, with its Requires, Returns, and Raises clauses. For one of them, say how a devious programmer could satisfy a weaker specification and how yours prevents it.`,
  writeUp: 'explanation',
});

// ---------------------------------------------------------------- lesson

export const fpSpecificationsTesting: TopicContent = {
  topicId: 'fp.specifications-testing',
  goal: t`Write a function's specification with its preconditions and postconditions, and test it with black-box and glass-box test cases.`,
  objective: t`Specify a function by its preconditions and postconditions, and design tests that find bugs.`,
  why: t`A specification says what correct means; testing checks it on chosen inputs, and proof, next, checks it on all.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`What does correct mean?` },
    { kind: 'hook', text: t`Is ${code`let list_max xs = List.fold_left max ${0} xs`} a correct maximum function? On ${code`[${3}; ${9}; ${4}]`} it gives ${9}. On ${code`[-${4}; -${2}]`} it gives ${0}, which is not even in the list. But you cannot call that a bug until someone has written down what the function is supposed to do.` },
    {
      kind: 'definition',
      name: t`Specification`,
      formal: t`A [[specification|specification]] of a function is a contract between its implementer and its clients. Its [[precondition|precondition]] (the Requires clause) states what the client must guarantee about the inputs; its [[postcondition|postcondition]] (the Returns and Raises clauses) states what the implementer guarantees about the result, for every input that satisfies the precondition. On an input that violates the precondition, the function may do anything.`,
      plain: t`"Give me a non-empty list, and I will give you its largest element." CS${3110} writes it as a comment: ${code`(** [list_max xs] is the largest element of [xs]. Requires: [xs] is not empty. *)`}.`,
    },
    {
      kind: 'p',
      text: t`A specification should be strong enough that a devious programmer cannot satisfy it with useless code, and weak enough to leave the implementer some freedom. "Returns an element of the list" lets ${code`List.hd`} pass; "returns the largest element" does not.`,
      why: { q: t`Why not check the precondition and raise an exception instead?`, a: t`You may: CS${3110} recommends it when the check is cheap. Then the condition moves from Requires to Raises, a postcondition, and the function is defined on every input.` },
    },
    checkFrom(precondition, { i: 0, vals: [0, 2, 3, 1], right: 2 }, t`Positions run from ${0} to ${2} in a list of ${3} elements, so ${code`nth [${10}; ${20}; ${30}] ${3}`} breaks the Requires clause.`),
    { kind: 'section', title: t`Choosing test cases` },
    { kind: 'narrative', text: t`You cannot test every input: CS${3110} counts about ${math`${2}^{${252}}`} inputs for adding two rationals. So you choose a few inputs, each standing for a whole class that should behave alike, and you choose them to be likely to fail.` },
    {
      kind: 'definition',
      name: t`Black-box testing`,
      formal: t`[[black-box-testing|Black-box testing]] chooses test cases from the specification alone, without looking at the implementation: typical inputs from each class of inputs the specification distinguishes, and boundary cases at the edges between classes.`,
      plain: t`For ${code`list_max`}: a typical list, a list of one element, a list of two, the largest element first, last, or in the middle, all elements equal, and all elements negative. The last one catches the accumulator bug above.`,
    },
    {
      kind: 'definition',
      name: t`Glass-box testing`,
      formal: t`[[glass-box-testing|Glass-box testing]] chooses test cases from the implementation: an execution path is a sequence of choices at the ${code`if`} and ${code`match`} expressions and function calls the code makes, and a test suite is path complete if it exercises every path.`,
      plain: t`CS${3110}'s ${code`max${3} x y z`}, written with nested ${code`if`}s, has four paths, so four tests such as ${code`max${3} ${3} ${2} ${1}`}, ${code`max${3} ${3} ${2} ${4}`}, ${code`max${3} ${1} ${2} ${1}`}, ${code`max${3} ${1} ${2} ${3}`} cover it.`,
    },
    {
      kind: 'steps',
      steps: [
        { label: t`Start from the specification`, text: t`Write black-box tests first: they do not depend on how the code happens to be written, so they survive rewrites.` },
        { label: t`Look inside`, text: t`Add glass-box tests for each branch of each ${code`if`} and ${code`match`}, each base case and recursive case, and each place an exception is raised.` },
        { label: t`Randomize`, text: t`State a property every output must have, the postcondition, and check it on many random inputs; QCheck does this, and reports a failing input.`, why: { q: t`Isn't a path complete suite enough?`, a: t`No. CS${3110}'s example: ${code`let max${3} x y z = x`} has one path, and ${code`max${3} ${2} ${1} ${1}`} covers it and passes, yet the function is wrong. Paths only tell you the code was run, not that it agreed with the specification.` } },
      ],
    },
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`If every test passes, the function is correct.`, counterexample: t`Testing can show the presence of bugs, not their absence. ${code`let abs x = if x > ${1} then x else -x`} passes tests at ${-5}, ${0}, and ${7}, yet ${code`abs ${1}`} is ${-1}.` },
    { kind: 'pitfall', claim: t`Typical inputs are the best tests.`, counterexample: t`Bugs live at boundaries: ${code`let is_odd n = n mod ${2} = ${1}`} is right on every non-negative input, and wrong on ${-3}, where ${code`mod`} gives ${-1}.` },
    { kind: 'pitfall', claim: t`A function must behave sensibly on every input.`, counterexample: t`Only on inputs meeting its precondition. ${code`list_max []`} may raise, loop, or return anything if the specification requires a non-empty list; a test of it tests nothing.` },
    { kind: 'takeaway', text: t`A specification is a contract, preconditions for the client and postconditions for the implementer; black-box tests come from it, typical and boundary cases, glass-box tests cover the code's paths, and passing tests still prove nothing.` },
  ],
  examples: [
    workedCambridge(oddDiv),
    worked(reveal, { b: 2, inputs: [[7], [-5], [10], [-4]], right: 1 }, t`A bug only negative numbers reveal`),
    worked(paths, { k: 3, c: [5, 2, 7, 1, 1] }, t`Counting paths`),
  ],
  generators: [reveal, paths, precondition],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['specification', 'precondition', 'postcondition', 'black-box-testing', 'glass-box-testing'],
  cambridge: [qcAvg, productTest, polySpec],
  gate: ['cs3110-ex8-poly-spec', 'cs3110-ex3-product-test', 'cs3110-ex8-qcheck-avg'],
  recall: [
    { front: t`What are a precondition and a postcondition?`, back: t`The precondition (Requires) is what the client guarantees about the inputs; the postcondition (Returns, Raises) is what the function guarantees about the result when the precondition holds.` },
    { front: t`Black-box against glass-box testing?`, back: t`Black-box tests come from the specification (typical and boundary cases); glass-box tests come from the code (every path, branch, base case, and raise).` },
    { front: t`When is a test suite path complete?`, back: t`When it exercises every execution path through the code; even then it can miss bugs.` },
  ],
};
