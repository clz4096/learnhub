/**
 * fp.complexity: The cost of a function. The lesson follows FoCS Lecture 2 ("Recursion and
 * Efficiency": nsum and summing, sillySum, the table of growth rates, O-notation and its
 * simple facts, sample costs, simple recurrence relations) and Lecture 1's power. The
 * problems are FoCS exercises 2.1 to 2.4.
 *
 * Exercise 2.2's 60-hour column (216,000,000 ms): n 216,000,000; n log n 9,338,370 (base 2,
 * the base the table's other entries use: 140, 4,895, and 204,095 all check); n^2 14,696;
 * n^3 600; 2^n 27. Computed here by search for the largest n with cost at most the time,
 * and checked in OCaml 4.11.1. Exercise 2.4: T(n) = 2n - 1 for n a power of 2, checked by
 * iterating the recurrence.
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { int, pick } from '../math';
import { ml, mlBlock } from '../ocaml-code';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { math, t, type Rich } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

// ---------------------------------------------------------------- generators

type Rec = 'add-const' | 'add-n' | 'halve' | 'double-halve' | 'merge';
interface RecP { kind: Rec; c: number; k: number }

/** The argument the question asks about: n for the additive forms, 2^k for the halving forms. */
const argOf = ({ kind, k }: RecP): number => (kind === 'add-const' || kind === 'add-n' ? k : 2 ** k);

/** The recurrence evaluated by unfolding it, step by step, not by its closed form. */
function T({ kind, c }: RecP, n: number): number {
  switch (kind) {
    case 'add-const': return n === 0 ? 1 : T({ kind, c, k: 0 }, n - 1) + c;
    case 'add-n': return n === 0 ? 1 : T({ kind, c, k: 0 }, n - 1) + (n - 1);
    case 'halve': return n === 1 ? 1 : T({ kind, c, k: 0 }, n / 2) + 1;
    case 'double-halve': return n === 1 ? 1 : 2 * T({ kind, c, k: 0 }, n / 2) + 1;
    case 'merge': return n === 1 ? 1 : 2 * T({ kind, c, k: 0 }, n / 2) + n;
  }
}

function recText({ kind, c }: RecP): Rich {
  switch (kind) {
    case 'add-const': return [math`T(${0}) = ${1},\ T(n + ${1}) = T(n) + ${c}`];
    case 'add-n': return [math`T(${0}) = ${1},\ T(n + ${1}) = T(n) + n`];
    case 'halve': return [math`T(${1}) = ${1},\ T(n) = T(n/${2}) + ${1}`];
    case 'double-halve': return [math`T(${1}) = ${1},\ T(n) = ${2}T(n/${2}) + ${1}`];
    case 'merge': return [math`T(${1}) = ${1},\ T(n) = ${2}T(n/${2}) + n`];
  }
}
const recOrder: Record<Rec, Rich> = {
  'add-const': [math`O(n)`], 'add-n': [math`O(n^{${2}})`], halve: [math`O(\log n)`], 'double-halve': [math`O(n)`], merge: [math`O(n \log n)`],
};

const recurrence = generator<RecP>({
  id: 'recurrence-value',
  skill: 'Unfold a cost recurrence read off a recursive function, as in FoCS Lecture 2, and compute its value.',
  params: (rng) => {
    const kind = pick(rng, ['add-const', 'add-n', 'halve', 'double-halve', 'merge'] as const);
    return { kind, c: int(rng, 2, 5), k: kind === 'add-const' || kind === 'add-n' ? int(rng, 5, 20) : int(rng, 3, 8) };
  },
  sane: ({ k }) => (k >= 3 && k <= 20 ? null : 'out of range'),
  problem: (rp) => {
    const n = argOf(rp);
    const v = T(rp, n);
    const small = rp.kind === 'add-const' || rp.kind === 'add-n' ? [0, 1, 2, 3] : [1, 2, 4, 8];
    return {
      prompt: t`A function's cost satisfies ${recText(rp)}. What is ${math`T(${n})`}?`,
      answer: { kind: 'exact', expected: String(v) },
      solution: [
        t`Unfold from the base case: ${small.map((m, i) => [...(i > 0 ? t`, ` : []), math`T(${m}) = ${T(rp, m)}`]).flat()}.`,
        t`Continuing the same way up to ${math`n = ${n}`} gives ${math`T(${n}) = ${v}`}. The cost grows like ${recOrder[rp.kind]}.`,
      ],
    };
  },
  solve: (rp) => String(T(rp, argOf(rp))),
  misconceptions: (rp): Misconception[] => {
    const n = argOf(rp);
    const v = T(rp, n);
    const pool: [number, Rich][] = [
      [n, t`Count the base case too: the recurrence starts from ${1}, not ${0}.`],
      [v - 1, t`One unit off: check the base case, which costs ${1}.`],
      [v + 1, t`One unit off: check the base case, which costs ${1}.`],
      [n * n, t`That is ${math`n^{${2}}`}. Unfold the recurrence itself rather than guessing its growth.`],
    ];
    return pool.filter(([w]) => w !== v).map(([w, why]) => ({ response: String(w), why }));
  },
});

type Cls = 'one' | 'log' | 'n' | 'nlog' | 'n2' | 'n3' | 'exp';
const CLASSES: { id: Cls; label: Rich }[] = [
  { id: 'one', label: [math`O(${1})`] }, { id: 'log', label: [math`O(\log n)`] }, { id: 'n', label: [math`O(n)`] },
  { id: 'nlog', label: [math`O(n \log n)`] }, { id: 'n2', label: [math`O(n^{${2}})`] }, { id: 'n3', label: [math`O(n^{${3}})`] }, { id: 'exp', label: [math`O(${2}^{n})`] },
];
const CLASS_OPTIONS: ChoiceOption[] = CLASSES.map((c) => ({ id: c.id, label: c.label }));
interface ClsP { top: Cls; a: number; b: number; c: number; lower: Cls }
const order: Cls[] = ['one', 'log', 'n', 'nlog', 'n2', 'n3', 'exp'];
const termTex = (cl: Cls, coef: number): string => {
  const co = coef === 1 ? '' : String(coef);
  switch (cl) {
    case 'one': return String(coef);
    case 'log': return `${co}\\log n`;
    case 'n': return `${co}n`;
    case 'nlog': return `${co}n \\log n`;
    case 'n2': return `${co}n^{${2}}`;
    case 'n3': return `${co}n^{${3}}`;
    case 'exp': return `${coef === 1 ? '' : `${coef} \\cdot `}${2}^{n}`;
  }
};

const bigO = generator<ClsP>({
  id: 'dominant-term',
  skill: 'State a cost formula in O-notation by keeping its most significant term and dropping constant factors.',
  quick: true,
  params: (rng) => {
    const ti = int(rng, 2, 6);
    const li = int(rng, 0, ti - 1);
    return { top: order[ti] as Cls, lower: order[li] as Cls, a: int(rng, 1, 9), b: pick(rng, [20, 50, 99, 100, 500]), c: int(rng, 10, 900) };
  },
  sane: ({ top, lower }) => (order.indexOf(lower) < order.indexOf(top) ? null : 'order'),
  problem: ({ top, lower, a, b, c }) => {
    const parts = [termTex(top, a), termTex(lower, b)];
    if (lower !== 'one') parts.push(String(c));
    const formula = { kind: 'math' as const, text: parts.join(' + '), typed: [] };
    return {
      prompt: t`A function costs ${[formula]} steps on an input of size ${math`n`}. In O-notation, its cost is`,
      answer: { kind: 'choice', options: CLASS_OPTIONS, correct: top },
      solution: [
        t`The most significant term eventually dominates: ${(CLASSES.find((x) => x.id === lower) as { label: Rich }).label} and smaller grow more slowly than ${(CLASSES.find((x) => x.id === top) as { label: Rich }).label}, however large their constants.`,
        t`Constant factors drop out of O-notation, so the cost is ${(CLASSES.find((x) => x.id === top) as { label: Rich }).label}.`,
      ],
    };
  },
  solve: ({ top }) => [top],
  misconceptions: ({ top, lower }): Misconception[] => {
    const up = order[order.indexOf(top) + 1];
    const out: Misconception[] = [{ response: [lower], why: t`The large coefficient of that term does not make it dominant: for large ${math`n`} the faster-growing term wins.` }];
    const down = order[order.indexOf(top) - 1];
    if (down !== undefined && down !== lower) out.push({ response: [down], why: t`That class grows more slowly than the leading term, so it is not an upper bound.` });
    if (up !== undefined) out.push({ response: [up], why: t`That is a valid upper bound but not the tight one: the formula grows no faster than its leading term.` });
    if (top !== 'one' && lower !== 'one') out.push({ response: ['one'], why: t`The cost grows with ${math`n`}, so it is not constant.` });
    return out;
  },
});

type Growth = 'n' | 'nlog' | 'n2' | 'n3' | 'exp';
interface TableP { g: Growth; secs: number }
const cost = (g: Growth, n: number): number => (g === 'n' ? n : g === 'nlog' ? n * Math.log2(n) : g === 'n2' ? n * n : g === 'n3' ? n ** 3 : 2 ** n);
/** The largest n >= 1 with cost(n) <= budget, by doubling then binary search. */
function largest(g: Growth, budget: number): number {
  if (cost(g, 1) > budget) return 0;
  let lo = 1;
  let hi = 2;
  while (cost(g, hi) <= budget) hi *= 2;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (cost(g, mid) <= budget) lo = mid;
    else hi = mid;
  }
  return lo;
}
const growthTex: Record<Growth, Rich> = { n: [math`n`], nlog: [math`n \log_{${2}} n`], n2: [math`n^{${2}}`], n3: [math`n^{${3}}`], exp: [math`${2}^{n}`] };
const timeWords = (secs: number): Rich => (secs % 3600 === 0 ? t`${secs / 3600} ${secs === 3600 ? 'hour' : 'hours'}` : secs % 60 === 0 ? t`${secs / 60} ${secs === 60 ? 'minute' : 'minutes'}` : t`${secs} ${secs === 1 ? 'second' : 'seconds'}`);

const table = generator<TableP>({
  id: 'largest-input',
  skill: 'Find the largest input a cost function can handle in a given time, as in the FoCS table of growth rates (Exercise 2.2).',
  params: (rng) => ({ g: pick(rng, ['n', 'nlog', 'n2', 'n3', 'exp'] as const), secs: pick(rng, [1, 10, 60, 600, 3600, 7200, 86400]) }),
  sane: ({ secs }) => (secs >= 1 ? null : 'time'),
  problem: ({ g, secs }) => {
    const budget = secs * 1000;
    const n = largest(g, budget);
    return {
      prompt: t`An algorithm takes ${growthTex[g]} milliseconds on an input of size ${math`n`}. What is the largest ${math`n`} it can process in ${timeWords(secs)}?`,
      answer: { kind: 'exact', expected: String(n) },
      solution: [
        t`${timeWords(secs)} is ${budget} milliseconds, so we want the largest ${math`n`} with cost at most ${budget}.`,
        t`At ${math`n = ${n}`} the cost is about ${Math.floor(cost(g, n))}, within the budget; at ${math`n = ${n + 1}`} it is about ${Math.floor(cost(g, n + 1))}, over it. So the answer is ${n}.`,
      ],
    };
  },
  solve: ({ g, secs }) => String(largest(g, secs * 1000)),
  misconceptions: ({ g, secs }): Misconception[] => [
    { response: String(largest(g, secs)), why: t`The cost is in milliseconds: convert the time to milliseconds first, ${secs * 1000} of them.` },
    { response: String(largest(g, secs * 1000) + 1), why: t`That input is just over the budget: round down to the last ${math`n`} whose cost fits.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const SIXTY_HOURS = 60 * 3600 * 1000;

const focs22n2 = auto({
  id: 'focs-2-2-square',
  source: cite('focs-notes', 'Lecture 2, Exercise 2.2', true),
  title: t`The ${60}-hour column, quadratic row`,
  prompt: t`In the FoCS table of growth rates, an algorithm of complexity ${math`n^{${2}}`} takes ${math`n^{${2}}`} milliseconds on an input of size ${math`n`}; it handles ${31} in a second, ${244} in a minute, and ${1897} in an hour. Add the column for ${60} hours: what is the largest ${math`n`} it handles?`,
  answer: { kind: 'exact', expected: String(largest('n2', SIXTY_HOURS)) },
  solution: [
    t`${60} hours is ${math`${60} \times ${3600} \times ${1000} = ${SIXTY_HOURS}`} milliseconds.`,
    t`We need the largest ${math`n`} with ${math`n^{${2}} \le ${SIXTY_HOURS}`}, that is ${math`n \le \sqrt{${SIXTY_HOURS}} \approx ${Math.sqrt(SIXTY_HOURS)}`}.`,
    t`So ${math`n = ${largest('n2', SIXTY_HOURS)}`}: ${math`${largest('n2', SIXTY_HOURS)}^{${2}} = ${largest('n2', SIXTY_HOURS) ** 2}`} fits and ${math`${largest('n2', SIXTY_HOURS) + 1}^{${2}} = ${(largest('n2', SIXTY_HOURS) + 1) ** 2}`} does not. The gain over one hour is a factor of about ${Math.round((largest('n2', SIXTY_HOURS) / 1897) * 100) / 100}, close to ${math`\sqrt{${60}}`}.`,
  ],
  reference: String(largest('n2', SIXTY_HOURS)),
  verify: () => same('the table rows', [largest('n2', 1000), largest('n2', 60000), largest('n2', 3600000)].join(','), '31,244,1897') ?? same('60 hours', largest('n2', SIXTY_HOURS), 14696),
  misconceptions: [{ response: String(1897 * 60), why: t`Sixty times the time does not give sixty times the input: for ${math`n^{${2}}`} the input grows by about ${math`\sqrt{${60}}`}.` }],
});

const focs22exp = auto({
  id: 'focs-2-2-exponential',
  source: cite('focs-notes', 'Lecture 2, Exercise 2.2', true),
  title: t`The ${60}-hour column, exponential row`,
  prompt: t`An algorithm of complexity ${math`${2}^{n}`} takes ${math`${2}^{n}`} milliseconds on an input of size ${math`n`}: ${9} in a second, ${15} in a minute, ${21} in an hour. What is the largest ${math`n`} it handles in ${60} hours?`,
  answer: { kind: 'exact', expected: String(largest('exp', SIXTY_HOURS)) },
  solution: [
    t`We need ${math`${2}^{n} \le ${SIXTY_HOURS}`}, that is ${math`n \le \log_{${2}} ${SIXTY_HOURS} \approx ${Math.log2(SIXTY_HOURS)}`}, so ${math`n = ${largest('exp', SIXTY_HOURS)}`}.`,
    t`Sixty times the time adds only about ${math`\log_{${2}} ${60} \approx ${Math.log2(60)}`} to the input: exponential cost is hopeless for large inputs.`,
  ],
  reference: String(largest('exp', SIXTY_HOURS)),
  verify: () => same('the table rows', [largest('exp', 1000), largest('exp', 60000), largest('exp', 3600000)].join(','), '9,15,21') ?? same('60 hours', largest('exp', SIXTY_HOURS), 27),
  misconceptions: [{ response: '28', why: t`${math`${2}^{${28}}`} is over the budget of ${SIXTY_HOURS}: round down.` }],
});

const doublingT = (n: number): number => (n === 1 ? 1 : 2 * doublingT(n / 2) + 1);
const focs24value = auto({
  id: 'focs-2-4-value',
  source: cite('focs-notes', 'Lecture 2, Exercise 2.4', true),
  title: t`A divide and conquer recurrence`,
  prompt: t`Let ${math`T(${1}) = ${1}`} and ${math`T(n) = ${2}T(n/${2}) + ${1}`}. Compute ${math`T(${1024})`}, and from the pattern guess a bound tighter than ${math`O(n \log n)`}.`,
  answer: { kind: 'exact', expected: String(doublingT(1024)) },
  solution: [
    t`${math`T(${2}) = ${doublingT(2)}`}, ${math`T(${4}) = ${doublingT(4)}`}, ${math`T(${8}) = ${doublingT(8)}`}: each is ${math`${2}n - ${1}`}.`,
    t`So ${math`T(${1024}) = ${2} \times ${1024} - ${1} = ${doublingT(1024)}`}, and the bound is ${math`O(n)`}.`,
  ],
  reference: String(doublingT(1024)),
  verify: () => same('T(1024) against 2n - 1', doublingT(1024), 2 * 1024 - 1),
  misconceptions: [{ response: String(1024 * 10), why: t`That is ${math`n \log_{${2}} n`}, the bound the question says can be beaten. Unfold the recurrence.` }],
});

const focs24proof = supervision({
  id: 'focs-2-4',
  source: cite('focs-notes', 'Lecture 2, Exercise 2.4'),
  title: t`A tighter bound for ${math`T(n) = ${2}T(n/${2}) + ${1}`}`,
  prompt: t`Find an upper bound for the recurrence ${math`T(${1}) = ${1}`}, ${math`T(n) = ${2}T(n/${2}) + ${1}`} that is tighter than ${math`O(n \log n)`}. Prove ${math`T(n) = ${2}n - ${1}`} for every power of ${2} by induction, and deduce the bound in O-notation.`,
  writeUp: 'proof',
});
const focs23 = supervision({
  id: 'focs-2-3',
  source: cite('focs-notes', 'Lecture 2, Exercise 2.3'),
  title: t`Constant factors inside a sum`,
  prompt: t`Let ${math`g_{${1}}, \ldots, g_{k}`} be functions with ${math`g_{i}(n) \ge ${0}`} for ${math`i = ${1}, \ldots, k`} and all sufficiently large ${math`n`}. Show that if ${math`f(n) = O(a_{${1}}g_{${1}}(n) + \cdots + a_{k}g_{k}(n))`} then ${math`f(n) = O(g_{${1}}(n) + \cdots + g_{k}(n))`}.`,
  writeUp: 'proof',
});
const focs21 = supervision({
  id: 'focs-2-1',
  source: cite('focs-notes', 'Lecture 2, Exercise 2.1'),
  title: t`An iterative ${ml`power`}`,
  prompt: t`Code an iterative (tail-recursive) version of the function ${ml`power`}, using an accumulator. State its time and space costs in O-notation and compare them with the original.`,
  writeUp: 'explanation',
});

// ---------------------------------------------------------------- lesson

export const complexity: TopicContent = {
  topicId: 'fp.complexity',
  goal: t`Estimate how the running time of a recursive function grows, and state it in O-notation.`,
  objective: t`Read a cost recurrence off a recursive function, solve it, and state the cost in O-notation.`,
  why: t`Every data structure that follows is chosen for its cost: queues, hash tables, balanced trees, sorting.`,
  minutes: 35,
  lesson: [
    { kind: 'section', title: t`How fast does it grow?` },
    { kind: 'hook', text: t`FoCS Lecture ${2} defines a silly way to add up ${math`${1} + \cdots + n`}: it calls itself twice at every step, so it makes about ${math`${2}^{n}`} calls. Buy a computer twice as fast and it can handle ${math`n + ${1}`} instead of ${math`n`}. One extra. Why does a faster machine help so little?` },
    { kind: 'narrative', text: t`Because what matters for large inputs is not the speed of each step but how the number of steps grows with the input. The FoCS table makes the point: an algorithm costing ${math`n`} milliseconds handles ${1000} items in a second and ${3600000} in an hour, a gain of ${60} per column; one costing ${math`${2}^{n}`} goes from ${9} to ${21}.` },
    { kind: 'definition', name: t`O-notation`, formal: t`For functions ${math`f`} and ${math`g`} on the natural numbers, ${math`f(n) = O(g(n))`} means there are constants ${math`c > ${0}`} and ${math`n_{${0}}`} with ${math`|f(n)| \le c\,|g(n)|`} for all ${math`n \ge n_{${0}}`}.`, plain: t`Eventually, ${math`f`} is at most a constant times ${math`g`}. The constant ${math`c`} absorbs constant factors; ${math`n_{${0}}`} ignores small inputs. This is [[big-o|O-notation]].` },
    {
      kind: 'steps',
      steps: [
        { label: t`The claim`, text: t`FoCS: ${math`n^{${2}} + ${50}n + ${36} = O(n^{${2}})`}. Take ${math`c = ${2}`}: we need ${math`n^{${2}} + ${50}n + ${36} \le ${2}n^{${2}}`}.`, plain: t`Doubling the constant leaves room for the smaller terms.` },
        { label: t`Rearrange`, text: t`Subtract ${math`n^{${2}}`} from both sides: we need ${math`${50}n + ${36} \le n^{${2}}`}.` },
        { label: t`Find the threshold`, text: t`At ${math`n = ${51}`}: ${math`${50 * 51 + 36} \le ${51 * 51}`}, true. For larger ${math`n`} the right side grows faster.`, why: { q: t`Why does it stay true after ${51}?`, a: t`Going from ${math`n`} to ${math`n + ${1}`} adds ${50} to the left and ${math`${2}n + ${1}`} to the right, which is more than ${50} once ${math`n \ge ${25}`}.` } },
        { label: t`Conclude`, text: t`So ${math`c = ${2}`} and ${math`n_{${0}} = ${51}`} work, and ${math`n^{${2}} + ${50}n + ${36} = O(n^{${2}})`}.` },
      ],
    },
    checkFrom(bigO, { top: 'n2', lower: 'n', a: 3, b: 99, c: 900 }, t`The ${math`n^{${2}}`} term dominates; its constant ${3} drops out.`),
    { kind: 'pitfall', claim: t`An ${math`O(n)`} algorithm is faster than an ${math`O(n^{${2}})`} one.`, counterexample: t`Only for large enough inputs. ${math`${100}n`} is ${math`O(n)`} and ${math`n^{${2}}`} is ${math`O(n^{${2}})`}, but at ${math`n = ${50}`} the first costs ${5000} and the second ${2500}. O-notation compares growth, not speed on small inputs.` },
    { kind: 'section', title: t`Reading the cost off the code` },
    { kind: 'narrative', text: t`To find the cost of a recursive function, write down what one call costs in terms of the calls it makes. FoCS's ${ml`nsum`} adds ${math`${1} + \cdots + n`} naively:` },
    { kind: 'rule', text: [mlBlock`
      let rec nsum n =
        if n = ${0} then ${0}
        else n + nsum (n - ${1})
    `] },
    { kind: 'definition', name: t`Cost recurrence`, formal: t`A [[cost-recurrence|recurrence]] for a function's cost ${math`T(n)`} gives the base cases and expresses ${math`T(n)`} through the costs of the recursive calls, counting the base case and each step's constant work as one unit.`, plain: t`${ml`nsum`} does one unit of work and calls itself on ${math`n - ${1}`}: ${math`T(${0}) = ${1}`}, ${math`T(n + ${1}) = T(n) + ${1}`}, so ${math`T(n) = n + ${1}`}, which is ${math`O(n)`}.` },
    { kind: 'table', caption: t`Recurrences from FoCS Lecture ${2}, with ${math`T(${1}) = ${1}`} or ${math`T(${0}) = ${1}`}`, head: [t`Recurrence`, t`Cost`, t`Example`], rows: [
      [[math`T(n + ${1}) = T(n) + ${1}`], [math`O(n)`], [ml`nsum`]],
      [[math`T(n + ${1}) = T(n) + n`], [math`O(n^{${2}})`], t`insertion sort`],
      [[math`T(n) = T(n/${2}) + ${1}`], [math`O(\log n)`], t`binary search`],
      [[math`T(n) = ${2}T(n/${2}) + n`], [math`O(n \log n)`], t`mergesort`],
    ] },
    { kind: 'theorem', name: t`FoCS Exercise ${2}.${4}`, statement: t`If ${math`T(${1}) = ${1}`} and ${math`T(n) = ${2}T(n/${2}) + ${1}`} for ${math`n \ge ${2}`}, then ${math`T(n) = ${2}n - ${1}`} for every power of two ${math`n = ${2}^{k}`}, ${math`k \ge ${0}`}. So ${math`T(n) = O(n)`} on powers of two.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Restate in k`, text: t`Let ${math`S(k) = T(${2}^{k})`}. Then ${math`S(${0}) = ${1}`} and ${math`S(k + ${1}) = ${2}S(k) + ${1}`}. We prove ${math`S(k) = ${2}^{k + ${1}} - ${1}`} by induction on ${math`k`}.`, plain: t`Halving ${math`${2}^{k + ${1}}`} gives ${math`${2}^{k}`}, so the recurrence steps ${math`k`} down by one.` },
        { label: t`Base case`, text: t`${math`S(${0}) = ${1} = ${2}^{${1}} - ${1}`}.` },
        { label: t`Inductive step`, text: t`If ${math`S(k) = ${2}^{k + ${1}} - ${1}`}, then ${math`S(k + ${1}) = ${2}(${2}^{k + ${1}} - ${1}) + ${1} = ${2}^{k + ${2}} - ${2} + ${1} = ${2}^{k + ${2}} - ${1}`}.`, plain: t`Multiply out the bracket, then collect the constants.` },
        { label: t`Translate back`, text: t`With ${math`n = ${2}^{k}`}, ${math`${2}^{k + ${1}} = ${2}n`}, so ${math`T(n) = ${2}n - ${1} \le ${2}n`}, which is ${math`O(n)`} with ${math`c = ${2}`}.` },
      ],
    },
    checkFrom(recurrence, { kind: 'merge', c: 2, k: 3 }, t`${math`T(${2}) = ${4}`}, ${math`T(${4}) = ${12}`}, ${math`T(${8}) = ${2} \times ${12} + ${8} = ${32}`}.`),
    { kind: 'section', title: t`What a faster computer buys` },
    { kind: 'narrative', text: t`Turn the question round: given a time budget, how large an input can each growth rate handle? Solve ${math`\text{cost}(n) \le \text{budget}`} for the largest ${math`n`}.` },
    checkFrom(table, { g: 'n3', secs: 60 }, t`${math`${39}^{${3}} = ${39 ** 3}`} fits in ${60000} milliseconds and ${math`${40}^{${3}} = ${40 ** 3}`} does not.`),
    { kind: 'pitfall', claim: t`The base of the logarithm matters in ${math`O(\log n)`}.`, counterexample: t`${math`\log_{${10}} n = \log_{${2}} n / \log_{${2}} ${10}`}, a constant multiple, and constant factors drop out. So ${math`O(\log_{${2}} n)`} and ${math`O(\ln n)`} are the same class.` },
    { kind: 'takeaway', text: t`Read a recurrence off the code, solve it, keep the dominant term: that is the cost in O-notation, and it decides which inputs are feasible.` },
  ],
  examples: [
    { ...workedCambridge(focs22n2), examiner: t`The examiner wants the conversion to milliseconds, the inequality solved for ${math`n`}, and the answer rounded down.` },
    worked(recurrence, { kind: 'double-halve', c: 2, k: 4 }, t`Unfolding a divide and conquer recurrence`),
    worked(bigO, { top: 'exp', lower: 'n3', a: 1, b: 500, c: 36 }, t`An exponential term beats any power`),
  ],
  generators: [recurrence, bigO, table],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['big-o', 'cost-recurrence'],
  cambridge: withUses([focs22exp, focs24value, focs24proof, focs23, focs21], {
    'focs-2-3': { sections: ['How fast does it grow?'], note: t`Constant factors disappear inside O-notation` },
    'focs-2-1': { sections: ['Reading the cost off the code'], note: t`The time and space cost of an iterative power` },
  }),
  gate: ['focs-2-3', 'focs-2-1'],
  recall: [
    { front: t`Define ${math`f(n) = O(g(n))`}.`, back: t`There are ${math`c > ${0}`} and ${math`n_{${0}}`} with ${math`|f(n)| \le c|g(n)|`} for all ${math`n \ge n_{${0}}`}.` },
    { front: t`Costs of ${math`T(n) = T(n/${2}) + ${1}`} and ${math`T(n) = ${2}T(n/${2}) + n`}?`, back: t`${math`O(\log n)`} and ${math`O(n \log n)`}.` },
    { front: t`Solve ${math`T(${1}) = ${1}`}, ${math`T(n) = ${2}T(n/${2}) + ${1}`} on powers of two.`, back: t`${math`T(n) = ${2}n - ${1}`}, so ${math`O(n)`}.` },
  ],
  proofOrder: [{
    title: t`${math`T(n) = ${2}n - ${1}`} on powers of two`,
    steps: [
      t`Set ${math`S(k) = T(${2}^{k})`}, so ${math`S(k + ${1}) = ${2}S(k) + ${1}`}.`,
      t`Base case: ${math`S(${0}) = ${1} = ${2}^{${1}} - ${1}`}.`,
      t`Inductive step: ${math`${2}(${2}^{k + ${1}} - ${1}) + ${1} = ${2}^{k + ${2}} - ${1}`}.`,
      t`With ${math`n = ${2}^{k}`}, ${math`T(n) = ${2}n - ${1}`}, which is ${math`O(n)`}.`,
    ],
  }],
};
