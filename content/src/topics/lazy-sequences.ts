/**
 * fp.lazy-sequences: Lazy sequences. The lesson follows FoCS Lecture 9 ("Sequences, or Lazy
 * Lists": the type 'a seq = Nil | Cons of 'a * (unit -> 'a seq), delaying with fun () ->,
 * from, get and forcing, appendq against interleave, filterq, iterates, Newton-Raphson
 * square roots with within) and CS3110 Section 9.4 (sequences). The problems are CS3110
 * Chapter 9 exercises (pow${2} and nth, interleave) and FoCS exercises 9.1, 9.2, 9.4, 9.5.
 *
 * Checked in OCaml 4.11.1 with the CS3110 sequence type: nth pow${2} 4 = 16; element 7 of
 * interleave nats pow${2} is 8. The generators model a sequence as a function from index to
 * element and compute the same values.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { int, pick } from '../math';
import { codeOf, ml, mlBlock } from '../ocaml-code';
import { generator, type Misconception } from '../problem';
import { math, t } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

// ---------------------------------------------------------------- generators

interface FilterP { k: number; m: number; n: number }
/** The first n elements of from k that are multiples of m, by walking the sequence. */
function filtered({ k, m, n }: FilterP): number[] {
  const out: number[] = [];
  for (let x = k; out.length < n; x++) if (x % m === 0) out.push(x);
  return out;
}

const filterGen = generator<FilterP>({
  id: 'get-filterq',
  skill: 'Take elements from a filtered infinite sequence: filterq forces the sequence until it finds elements that pass the test.',
  params: (rng) => {
    for (;;) {
      const fp = { k: int(rng, 2, 30), m: int(rng, 2, 7), n: int(rng, 2, 5) };
      const last = filtered(fp)[fp.n - 1] as number;
      if (last !== fp.k + fp.n - 1 && last + fp.m !== fp.k + fp.n - 1) return fp;
    }
  },
  sane: ({ m }) => (m >= 2 ? null : 'm'),
  problem: (fp) => {
    const xs = filtered(fp);
    return {
      prompt: t`With FoCS's ${ml`from`}, ${ml`filterq`}, and ${ml`get`}, the expression ${ml`get ${fp.n} (filterq (fun x -> x mod ${fp.m} = ${0}) (from ${fp.k}))`} returns a list of ${fp.n} numbers. What is the last of them?`,
      answer: { kind: 'exact', expected: String(xs[fp.n - 1]) },
      solution: [
        t`${ml`from ${fp.k}`} is the infinite sequence ${math`${fp.k}, ${fp.k + 1}, ${fp.k + 2}, \ldots`}; ${ml`filterq`} keeps the multiples of ${fp.m}, forcing the tail until it finds each one.`,
        t`${ml`get ${fp.n}`} takes the first ${fp.n} of them: ${ml`[${codeOf(xs.join('; '))}]`}. The last is ${xs[fp.n - 1] as number}.`,
      ],
    };
  },
  solve: (fp) => String(filtered(fp)[fp.n - 1]),
  misconceptions: (fp): Misconception[] => {
    const xs = filtered(fp);
    return [
      { response: String(fp.k + fp.n - 1), why: t`That is element ${fp.n} of ${ml`from ${fp.k}`} itself. ${ml`filterq`} skips the numbers that are not multiples of ${fp.m}.` },
      { response: String((xs[fp.n - 1] as number) + fp.m), why: t`One too many: ${ml`get ${fp.n}`} returns ${fp.n} elements, the first being ${xs[0] as number}.` },
    ];
  },
});

interface InterP { a: number; b: number; r: number; j: number }
const first = ({ a }: InterP, i: number): number => a + i;
const second = ({ b, r }: InterP, i: number): number => b * r ** i;
const interAt = (ip: InterP, j: number): number => (j % 2 === 0 ? first(ip, j / 2) : second(ip, (j - 1) / 2));

const interGen = generator<InterP>({
  id: 'interleave',
  skill: 'Index into the interleaving of two infinite sequences, which alternates between them, as FoCS interleave does.',
  params: (rng) => {
    for (;;) {
      const ip: InterP = { a: int(rng, 0, 9), b: int(rng, 1, 3), r: pick(rng, [2, 3]), j: int(rng, 3, 9) };
      const v = interAt(ip, ip.j);
      const swapped = ip.j % 2 === 0 ? second(ip, ip.j / 2) : first(ip, (ip.j - 1) / 2);
      if (new Set([v, first(ip, ip.j), swapped]).size === 3) return ip;
    }
  },
  sane: ({ j }) => (j >= 3 ? null : 'j'),
  problem: (ip) => {
    const shown = Array.from({ length: ip.j + 1 }, (_, i) => interAt(ip, i));
    return {
      prompt: t`With ${ml`let rec interleave xq yq = match xq with Nil -> yq | Cons (x, xf) -> Cons (x, fun () -> interleave yq (xf ()))`}, what is the element at position ${ip.j} (counting from ${0}) of ${ml`interleave (from ${ip.a}) (iterates (fun x -> ${ip.r} * x) ${ip.b})`}?`,
      answer: { kind: 'exact', expected: String(interAt(ip, ip.j)) },
      solution: [
        t`${ml`interleave`} takes the head of its first argument, then swaps the arguments: the result alternates, ${ml`from ${ip.a}`} at even positions and ${ml`iterates`} at odd ones.`,
        t`Positions ${0} to ${ip.j}: ${ml`${codeOf(shown.join(', '))}`}. So the answer is ${interAt(ip, ip.j)}.`,
      ],
    };
  },
  solve: (ip) => String(interAt(ip, ip.j)),
  misconceptions: (ip): Misconception[] => [
    { response: String(first(ip, ip.j)), why: t`That is position ${ip.j} of the first sequence alone, as ${ml`appendq`} would give. ${ml`interleave`} alternates the two.` },
    { response: String(ip.j % 2 === 0 ? second(ip, ip.j / 2) : first(ip, (ip.j - 1) / 2)), why: t`The first sequence comes first: position ${0} is ${ip.a}, from ${ml`from ${ip.a}`}.` },
  ],
});

interface IterP { x: number; mul: number; add: number; j: number }
const iterAt = ({ x, mul, add }: IterP, j: number): number => {
  let v = x;
  for (let i = 0; i < j; i++) v = v * mul + add;
  return v;
};
const iterGen = generator<IterP>({
  id: 'iterates',
  skill: 'Compute an element of iterates f x, the sequence x, f x, f (f x), and so on.',
  quick: true,
  params: (rng) => ({ x: int(rng, 0, 5), mul: int(rng, 2, 3), add: int(rng, 1, 4), j: int(rng, 2, 5) }),
  sane: ({ j }) => (j >= 2 ? null : 'j'),
  problem: (ip) => ({
    prompt: t`With ${ml`let rec iterates f x = Cons (x, fun () -> iterates f (f x))`}, what is the element at position ${ip.j} (counting from ${0}) of ${ml`iterates (fun x -> ${ip.mul} * x + ${ip.add}) ${ip.x}`}?`,
    answer: { kind: 'exact', expected: String(iterAt(ip, ip.j)) },
    solution: [
      t`Position ${0} is ${ip.x} itself; each later position applies the function once more.`,
      t`The elements are ${ml`${codeOf(Array.from({ length: ip.j + 1 }, (_, i) => iterAt(ip, i)).join(', '))}`}, so position ${ip.j} is ${iterAt(ip, ip.j)}.`,
    ],
  }),
  solve: (ip) => String(iterAt(ip, ip.j)),
  misconceptions: (ip): Misconception[] => [
    { response: String(iterAt(ip, ip.j + 1)), why: t`Position ${0} is the starting value, before any application: position ${ip.j} has the function applied ${ip.j} times.` },
    { response: String(iterAt(ip, ip.j - 1)), why: t`Count again from position ${0}, which is ${ip.x}.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const pow2At = (n: number): number => {
  let v = 1;
  for (let i = 0; i < n; i++) v *= 2;
  return v;
};
const nthPow2 = auto({
  id: 'cs3110-9-nth-pow2',
  source: cite('cs3110-ex9', 'Exercises: pow${2}, nth', true),
  title: t`The powers of two, lazily`,
  prompt: t`With ${ml`type 'a sequence = Cons of 'a * (unit -> 'a sequence)`}, define ${ml`pow${2} : int sequence`}, the powers of two ${math`${1}, ${2}, ${4}, ${8}, \ldots`}, and ${ml`nth : 'a sequence -> int -> 'a`}, the element at zero-based position ${math`n`}. What is ${ml`nth pow${2} ${4}`}?`,
  answer: { kind: 'exact', expected: String(pow2At(4)) },
  solution: [
    t`${ml`let rec from_pow p = Cons (p, fun () -> from_pow (${2} * p))`} and ${ml`let pow${2} = from_pow ${1}`}: the tail is a function, so only the head exists until it is asked for.`,
    t`${ml`let rec nth (Cons (h, tf)) n = if n = ${0} then h else nth (tf ()) (n - ${1})`} forces the tail ${4} times.`,
    t`Positions ${0} to ${4} hold ${1}, ${2}, ${4}, ${8}, ${16}, so ${ml`nth pow${2} ${4}`} is ${pow2At(4)}.`,
  ],
  reference: '16',
  verify: () => same('nth pow${2} 4', pow2At(4), 16),
  misconceptions: [{ response: '8', why: t`Positions count from ${0}: position ${0} is ${1}, so position ${4} is ${math`${2}^{${4}}`}.` }, { response: '32', why: t`Position ${4} is ${math`${2}^{${4}}`}, not ${math`${2}^{${5}}`}.` }],
});
const interleaveEx = auto({
  id: 'cs3110-9-interleave',
  source: cite('cs3110-ex9', 'Exercise: interleave', true),
  title: t`Interleaving the naturals and the powers of two`,
  prompt: t`${ml`interleave`} of ${ml`<a${1}; a${2}; ...>`} and ${ml`<b${1}; b${2}; ...>`} is ${ml`<a${1}; b${1}; a${2}; b${2}; ...>`}. What is the element at zero-based position ${7} of ${ml`interleave nats pow${2}`}, where ${ml`nats`} is ${math`${0}, ${1}, ${2}, \ldots`}?`,
  answer: { kind: 'exact', expected: String(pow2At(3)) },
  solution: [
    t`The sequence begins ${math`${0}, ${1}, ${1}, ${2}, ${2}, ${4}, ${3}, ${8}, \ldots`}: even positions from ${ml`nats`}, odd positions from ${ml`pow${2}`}.`,
    t`Position ${7} is odd, the fourth element of ${ml`pow${2}`}: ${pow2At(3)}.`,
  ],
  reference: '8',
  verify: () => same('position 7', interAt({ a: 0, b: 1, r: 2, j: 7 }, 7), 8),
  misconceptions: [{ response: '3', why: t`That is position ${6}, from ${ml`nats`}. Position ${7} is odd, so it comes from ${ml`pow${2}`}.` }, { response: '7', why: t`The two sequences alternate: position ${7} is not element ${7} of ${ml`nats`}.` }],
});
const focs91 = supervision({
  id: 'focs-9-1',
  source: cite('focs-notes', 'Lecture 9, Exercise 9.1'),
  title: t`${ml`map`} for sequences`,
  prompt: t`Code an analogue of ${ml`map`} for the sequences of the lecture, ${ml`'a seq = Nil | Cons of 'a * (unit -> 'a seq)`}. Explain why every force in your code must be inside a delay.`,
  writeUp: 'explanation',
});
const focs92 = supervision({
  id: 'focs-9-2',
  source: cite('focs-notes', 'Lecture 9, Exercise 9.2'),
  title: t`Concatenating a sequence of sequences`,
  prompt: t`The list function ${ml`concat`} concatenates a list of lists. Can it be generalised to concatenate a sequence of sequences? What can go wrong?`,
  writeUp: 'explanation',
});
const focs94 = supervision({
  id: 'focs-9-4',
  source: cite('focs-notes', 'Lecture 9, Exercise 9.4 (from 2008 Paper 1 Question 5)'),
  title: t`Lazy binary trees`,
  prompt: t`A lazy binary tree is either empty or a branch containing a label and two lazy binary trees, possibly to infinite depth. Present an OCaml datatype to represent lazy binary trees, and a function that accepts a lazy binary tree and produces a lazy list containing all of the tree's labels.`,
  writeUp: 'explanation',
});
const focs95 = supervision({
  id: 'focs-9-5',
  source: cite('focs-notes', 'Lecture 9, Exercise 9.5 (from 2003 Paper 1 Question 5)'),
  title: t`All lists of zeroes and ones`,
  prompt: t`Code the lazy list whose elements are all ordinary lists of zeroes and ones: ${ml`[]; [${0}]; [${1}]; [${0}; ${0}]; [${0}; ${1}]; [${1}; ${0}]; [${1}; ${1}]; [${0}; ${0}; ${0}]; ...`}. Explain why every such list eventually appears.`,
  writeUp: 'explanation',
});

// ---------------------------------------------------------------- lesson

export const lazySequences: TopicContent = {
  topicId: 'fp.lazy-sequences',
  goal: t`Represent an infinite sequence by a head and a function that computes the tail on demand, and define take, map, and filter on it.`,
  objective: t`Build infinite sequences whose tails are computed on demand, and take, filter, and combine them.`,
  why: t`Laziness lets a program produce a stream of answers only as far as they are needed, and search infinite trees.`,
  minutes: 35,
  lesson: [
    { kind: 'section', title: t`A list that is never finished` },
    { kind: 'hook', text: t`Write down the list of all natural numbers. You cannot: it never ends, and OCaml's lists are built in full before you can use them. Yet "the next one is one more" is a complete description of it. Can a program hold that description instead of the list?` },
    { kind: 'narrative', text: t`The trick is to delay. A function ${ml`fun () -> E`} does not evaluate ${math`E`} until it is called. So store the head of the sequence, and in place of the tail, a function that will compute the tail when asked.` },
    { kind: 'definition', name: t`Lazy sequence`, formal: t`FoCS defines ${ml`type 'a seq = Nil | Cons of 'a * (unit -> 'a seq)`}. A [[lazy-sequence|sequence]] ${ml`Cons (x, xf)`} has head ${math`x`} and tail function ${ml`xf`}; calling ${ml`xf ()`} is [[forcing|forcing]] the tail.`, plain: t`${ml`()`} is the only value of type ${ml`unit`}: it carries no information, so a function of it serves only to delay. The tail does not exist until someone forces it.` },
    { kind: 'rule', text: [mlBlock`
      let rec from k = Cons (k, fun () -> from (k + ${1}))
      let rec get n s = match n, s with
        | ${0}, _ -> []
        | n, Nil -> []
        | n, Cons (x, xf) -> x :: get (n - ${1}) (xf ())
    `] },
    { kind: 'p', text: t`${ml`from k`} terminates because the recursive call is inside ${ml`fun () -> ...`}: it builds one cell and stops. ${ml`get n`} forces the tail ${math`n`} times and collects the heads.` },
    {
      kind: 'steps',
      steps: [
        { label: t`Start`, text: t`${ml`get ${2} (from ${6})`} is ${ml`get ${2} (Cons (${6}, fun () -> from (${6} + ${1})))`}.`, plain: t`Only the head ${6} exists.` },
        { label: t`Take a head, force the tail`, text: t`It becomes ${ml`${6} :: get ${1} (from ${7})`}, then ${ml`${6} :: ${7} :: get ${0} (Cons (${8}, fun () -> ...))`}.` },
        { label: t`Stop`, text: t`${ml`get ${0}`} returns ${ml`[]`}, giving ${ml`[${6}; ${7}]`}.`, plain: t`FoCS notes that ${8} was computed though not needed: this implementation is slightly too eager. The tail after ${8} never is.` },
      ],
    },
    checkFrom(iterGen, { x: 1, mul: 2, add: 1, j: 3 }, t`${1}, ${3}, ${7}, ${15}: position ${3} is ${15}.`),
    { kind: 'section', title: t`Functionals on sequences` },
    { kind: 'narrative', text: t`Most list functionals have lazy versions. The rule FoCS gives: enclose every force within a delay, so the result is built only as it is demanded.` },
    { kind: 'rule', text: [mlBlock`
      let rec filterq p = function
        | Nil -> Nil
        | Cons (x, xf) ->
            if p x then Cons (x, fun () -> filterq p (xf ()))
            else filterq p (xf ())
      let rec appendq xq yq = match xq with
        | Nil -> yq
        | Cons (x, xf) -> Cons (x, fun () -> appendq (xf ()) yq)
      let rec interleave xq yq = match xq with
        | Nil -> yq
        | Cons (x, xf) -> Cons (x, fun () -> interleave yq (xf ()))
    `] },
    { kind: 'p', text: t`${ml`filterq`} has one unprotected force, in the ${ml`else`} branch: it keeps forcing until an element passes. ${ml`appendq`} gives every element of ${ml`xq`} and then, if ${ml`xq`} ends, those of ${ml`yq`}. ${ml`interleave`} swaps its arguments at each step, so it takes from both sequences fairly: ${ml`get ${4} (interleave (from ${1}) (from ${100}))`} is ${ml`[${1}; ${100}; ${2}; ${101}]`}.` },
    checkFrom(filterGen, { k: 10, m: 3, n: 4 }, t`The multiples of ${3} from ${10} are ${12}, ${15}, ${18}, ${21}.`),
    { kind: 'pitfall', claim: t`${ml`appendq xq yq`} combines two infinite sequences.`, counterexample: t`If ${ml`xq`} is infinite, ${ml`appendq`} never reaches ${ml`yq`}: every element of the result comes from ${ml`xq`}. Use ${ml`interleave`}, which alternates.` },
    { kind: 'pitfall', claim: t`${ml`filterq p s`} always returns.`, counterexample: t`If no element of the infinite ${ml`s`} satisfies ${ml`p`}, as for ${ml`filterq (fun x -> x < ${0}) (from ${1})`}, it forces the tail forever.` },
    { kind: 'section', title: t`An application: square roots` },
    { kind: 'narrative', text: t`FoCS builds Newton-Raphson as a pipeline. ${ml`iterates (next a) x${0}`} is the infinite sequence of approximations ${math`x_{k + ${1}} = (a/x_{k} + x_{k})/${2}`} to ${math`\sqrt{a}`}, and ${ml`within eps`} walks along it until two neighbours differ by at most ${ml`eps`}. Producer and consumer are written separately; laziness joins them.` },
    checkFrom(interGen, { a: 0, b: 1, r: 2, j: 5 }, t`${0}, ${1}, ${1}, ${2}, ${2}, ${4}: position ${5} is ${4}.`),
    { kind: 'takeaway', text: t`A lazy sequence stores its head and a function for its tail; forcing computes only what is demanded, so infinite sequences become ordinary values.` },
  ],
  examples: [
    { ...workedCambridge(nthPow2), examiner: t`The examiner wants the recursive call inside ${ml`fun () ->`}, a correct base case for ${ml`nth`}, and positions counted from ${0}.` },
    worked(filterGen, { k: 7, m: 4, n: 3 }, t`Taking from a filtered sequence`),
    worked(interGen, { a: 3, b: 1, r: 3, j: 6 }, t`Interleaving two sequences`),
  ],
  generators: [filterGen, interGen, iterGen],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['lazy-sequence', 'forcing'],
  cambridge: [interleaveEx, focs91, focs92, focs94, focs95],
  gate: ['focs-9-5', 'focs-9-4'],
  recall: [
    { front: t`What is FoCS's type of sequences?`, back: t`${ml`'a seq = Nil | Cons of 'a * (unit -> 'a seq)`}: a head and a function computing the tail.` },
    { front: t`What is forcing?`, back: t`Calling the tail function, ${ml`xf ()`}, to compute the next part of the sequence.` },
    { front: t`Why interleave rather than append infinite sequences?`, back: t`Append never reaches the second sequence if the first is infinite; interleave alternates, losing nothing.` },
  ],
};
