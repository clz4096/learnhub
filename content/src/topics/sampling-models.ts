/**
 * prob.sampling-models: count samples of size k from n in the four models (ordered or not,
 * with or without replacement), and choose the model whose outcomes are equally likely.
 * From IA Probability Example Sheet 1: Q12 (n balls into n boxes, exactly one box empty),
 * Q13 (a random non-decreasing function is strictly increasing), and the hint of Q2 (one
 * probability space for several questions). The sheet has no official solutions; every
 * answer is checked by listing every outcome.
 */
import type { Rng } from '@learnhub/mastery';
import { auto, cite, same, supervision } from '../cambridge';
import { factorial, int, pick, q, str, sub } from '../math';
import { choose } from '../numbers';
import { generator, type Misconception } from '../problem';
import { math, t, type Rich } from '../rich';
import { worked, workedCambridge, type ProbabilityClaim, type TopicContent } from '../topic';

const [mn, mk] = [math`n`, math`k`];
const falling = (n: number, k: number): number => { let p = 1; for (let i = 0; i < k; i++) p *= n - i; return p; };
/** Every sequence of k values from 1..n, as arrays. */
function sequences(n: number, k: number): number[][] {
  let out: number[][] = [[]];
  for (let i = 0; i < k; i++) out = out.flatMap((s) => Array.from({ length: n }, (_, v) => [...s, v + 1]));
  return out;
}
const throwBalls = (n: number, k: number, rng: Rng): number[] => Array.from({ length: k }, () => 1 + Math.floor(rng() * n));

// ---------------------------------------------------------------- the four models

type Model = 'ord-rep' | 'ord-norep' | 'unord-norep' | 'unord-rep';
interface Ctx { model: Model; text: (n: number, k: number) => Rich }
const CTX: readonly Ctx[] = [
  { model: 'ord-rep', text: (n, k) => t`A code is a sequence of ${k} symbols, each one of ${n} symbols, repeats allowed. How many codes are there?` },
  { model: 'ord-norep', text: (n, k) => t`${k} different prizes are given to ${k} of ${n} people, at most one prize each. In how many ways can the prizes be given?` },
  { model: 'unord-norep', text: (n, k) => t`A committee of ${k} is chosen from ${n} people. How many committees are there?` },
  { model: 'unord-rep', text: (n, k) => t`An order of ${k} scoops of ice cream is chosen from ${n} flavours; flavours may repeat and the order of the scoops does not matter. How many orders are there?` },
  { model: 'ord-rep', text: (n, k) => t`${k} distinguishable balls are each put into one of ${n} boxes. In how many ways can this be done?` },
  { model: 'unord-rep', text: (n, k) => t`${k} identical balls are put into ${n} boxes. In how many ways can this be done (only the number in each box matters)?` },
];
const count = (m: Model, n: number, k: number): number => (m === 'ord-rep' ? n ** k : m === 'ord-norep' ? falling(n, k) : m === 'unord-norep' ? choose(n, k) : choose(n + k - 1, k));
const MODELS: readonly Model[] = ['ord-rep', 'ord-norep', 'unord-norep', 'unord-rep'];
const modelName: Readonly<Record<Model, Rich>> = {
  'ord-rep': t`ordered, with replacement`,
  'ord-norep': t`ordered, without replacement`,
  'unord-norep': t`unordered, without replacement`,
  'unord-rep': t`unordered, with replacement`,
};
const formula: Readonly<Record<Model, (n: number, k: number) => Rich>> = {
  'ord-rep': (n, k) => t`${math`n^{k} = ${n}^{${k}} = ${n ** k}`}`,
  'ord-norep': (n, k) => t`${math`n(n - ${1})\cdots(n - k + ${1}) = ${falling(n, k)}`}`,
  'unord-norep': (n, k) => t`${math`\binom{n}{k} = \binom{${n}}{${k}} = ${choose(n, k)}`}`,
  'unord-rep': (n, k) => t`${math`\binom{n + k - ${1}}{k} = \binom{${n + k - 1}}{${k}} = ${choose(n + k - 1, k)}`}`,
};

interface FourP { c: number; n: number; k: number }

const fourModels = generator<FourP>({
  id: 'four-models',
  skill: 'Recognise which of the four sampling models a question describes, and count its samples.',
  params: (rng) => { const n = int(rng, 4, 7); return { c: int(rng, 0, CTX.length - 1), n, k: int(rng, 2, Math.min(4, n - 1)) }; },
  sane: ({ n, k }) => (k >= 2 && k < n ? null : 'out of range'),
  problem: ({ c, n, k }) => {
    const cx = CTX[c] as Ctx;
    return {
      prompt: cx.text(n, k),
      answer: { kind: 'exact', expected: String(count(cx.model, n, k)) },
      solution: [
        t`Samples of size ${math`k = ${k}`} from ${math`n = ${n}`}: ${modelName[cx.model]}.`,
        t`The count is ${formula[cx.model](n, k)}.`,
      ],
    };
  },
  solve: ({ c, n, k }) => {
    // List every sequence and keep the ones the model counts, once each.
    const m = (CTX[c] as Ctx).model;
    const seqs = sequences(n, k);
    if (m === 'ord-rep') return String(seqs.length);
    if (m === 'ord-norep') return String(seqs.filter((s) => new Set(s).size === k).length);
    if (m === 'unord-norep') return String(seqs.filter((s) => s.every((v, i) => i === 0 || v > (s[i - 1] as number))).length);
    return String(seqs.filter((s) => s.every((v, i) => i === 0 || v >= (s[i - 1] as number))).length);
  },
  misconceptions: ({ c, n, k }): Misconception[] => {
    const m = (CTX[c] as Ctx).model;
    return MODELS.filter((o) => o !== m).map((o) => ({
      response: String(count(o, n, k)),
      why: t`That counts samples ${modelName[o]}. Here the samples are ${modelName[m]}.`,
    }));
  },
});

// ---------------------------------------------------------------- all different

interface DiffP { n: number; k: number }

const allDifferent = generator<DiffP>({
  id: 'all-different',
  skill: 'Find the probability that k balls thrown at random into n boxes land in different boxes: ordered samples, equally likely.',
  params: (rng) => { const n = int(rng, 4, 10); return { n, k: int(rng, 2, Math.min(5, n - 1)) }; },
  sane: ({ n, k }) => (k >= 2 && k < n ? null : 'out of range'),
  problem: ({ n, k }) => ({
    prompt: t`${k} balls are thrown independently and at random into ${n} boxes. What is the probability that no two land in the same box?`,
    answer: { kind: 'exact', expected: str(q(falling(n, k), n ** k)) },
    solution: [
      t`Label the balls. The equally likely outcomes are the ordered samples with replacement: ${math`${n}^{${k}} = ${n ** k}`} ways to choose a box for each ball.`,
      t`The favourable ones are ordered samples without replacement: ${math`${n} \times ${n - 1} \times \cdots \times ${n - k + 1} = ${falling(n, k)}`}. So the probability is ${math`\frac{${falling(n, k)}}{${n ** k}} = ${q(falling(n, k), n ** k)}`}.`,
    ],
  }),
  solve: ({ n, k }) => str(q(sequences(n, k).filter((s) => new Set(s).size === k).length, n ** k)),
  misconceptions: ({ n, k }): Misconception[] => [
    { response: str(q(choose(n, k), n ** k)), why: t`The top counts sets of boxes but the bottom counts ordered outcomes. Count both the same way: ${math`${falling(n, k)}`} ordered ways.` },
    { response: str(q(choose(n, k), choose(n + k - 1, k))), why: t`The ${choose(n + k - 1, k)} unordered placements are not equally likely: two balls in one box can happen in fewer ways than two in different boxes. Label the balls.` },
    { response: str(sub(q(1), q(k, n))), why: t`Subtracting ${q(k, n)} does not account for every pair that could collide. Multiply the chances that each new ball misses the boxes already used.` },
  ],
  trial: ({ n, k }, rng) => new Set(throwBalls(n, k, rng)).size === k,
});

// ---------------------------------------------------------------- no box empty

interface FullP { n: number; k: number }
const surjections = (n: number, k: number): number => sequences(n, k).filter((s) => new Set(s).size === n).length;

const noEmptyBox = generator<FullP>({
  id: 'no-empty-box',
  skill: 'Find the probability that every box is occupied, counting labelled balls; the unordered count, by stars and bars, does not give equally likely outcomes.',
  params: (rng) => { const n = pick(rng, [2, 3, 3, 4]); return { n, k: int(rng, n + 1, n + 2) }; },
  sane: ({ n, k }) => (k > n && n >= 2 && k <= 6 ? null : 'out of range'),
  problem: ({ n, k }) => {
    const ie = Array.from({ length: n + 1 }, (_, j) => (-1) ** j * choose(n, j) * (n - j) ** k).reduce((a, b) => a + b, 0);
    return {
      prompt: t`${k} balls are thrown independently and at random into ${n} boxes. What is the probability that no box is empty?`,
      answer: { kind: 'exact', expected: str(q(ie, n ** k)) },
      solution: [
        t`Label the balls: the ${math`${n}^{${k}} = ${n ** k}`} ordered outcomes are equally likely.`,
        t`Count those that miss no box by inclusion-exclusion over the empty boxes: ${math`\sum_{j = ${0}}^{${n}} (-${1})^{j} \binom{${n}}{j} (${n} - j)^{${k}} = ${ie}`}. So the probability is ${math`\frac{${ie}}{${n ** k}} = ${q(ie, n ** k)}`}.`,
      ],
    };
  },
  solve: ({ n, k }) => str(q(surjections(n, k), n ** k)),
  misconceptions: ({ n, k }): Misconception[] => [
    { response: str(q(choose(k - 1, n - 1), choose(n + k - 1, k))), why: t`Stars and bars counts unordered placements, but they are not equally likely when balls are thrown at random. Count labelled balls.` },
    { response: str(sub(q(1), q((n - 1) ** k, n ** k))), why: t`That subtracts only the outcomes that miss one particular box. Any of the ${n} boxes could be empty, and the overlaps must be added back.` },
    { response: str(sub(q(1), q(n * (n - 1) ** k, n ** k))), why: t`Subtracting the outcomes that miss each box counts twice those that miss two boxes. Add them back: that is inclusion-exclusion.` },
  ],
  trial: ({ n, k }, rng) => new Set(throwBalls(n, k, rng)).size === n,
});

// ---------------------------------------------------------------- Cambridge problems

const N_DOM = { n: { kind: 'integer' as const, min: 2, max: 8 } };
/** Q12 by listing every way to put n labelled balls in n boxes. */
const oneEmpty = (n: number): string => str(q(sequences(n, n).filter((s) => new Set(s).size === n - 1).length, n ** n));

const q12 = auto({
  id: 'ia-q12-general',
  source: cite('ia-prob-sheet-1', 'Q12'),
  title: t`Exactly one empty box`,
  prompt: t`Suppose that ${mn} balls are tossed independently and at random into ${mn} boxes. What is the probability that exactly one box is empty? Give an expression in ${mn}.`,
  answer: { kind: 'expression', expected: 'choose(n, 2) * n! / n^n', variables: ['n'], domains: N_DOM, binomial: true },
  solution: [
    t`The ${math`n^{n}`} ways to place labelled balls are equally likely. Exactly one box empty means one box holds two balls, ${math`n - ${2}`} hold one each, and one holds none.`,
    t`Choose the two balls that share a box, ${math`\binom{n}{${2}}`}; then the ${math`n - ${1}`} groups (the pair and the single balls) go into different boxes, ${math`n(n - ${1})\cdots ${2} = n!`} ways, which also leaves one box empty. So the probability is ${math`\frac{\binom{n}{${2}} n!}{n^{n}}`}.`,
    t`Checks: ${math`n = ${2}`} gives ${q(1, 2)}, and ${math`n = ${3}`} gives ${q(2, 3)}.`,
  ],
  reference: 'C(n, 2) * n! / n^n',
  verify: () => {
    for (let n = 2; n <= 6; n++) {
      const e = same(`n = ${n}`, oneEmpty(n), str(q(choose(n, 2) * factorial(n), n ** n)));
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [{ response: 'n * (n - 1) * choose(n, 2) * (n - 2)! / n^n * 2', why: t`That counts each arrangement twice. Choosing the empty box and the double box, ${math`n(n - ${1})`}, then the pair, then the rest, ${math`(n - ${2})!`}, gives ${math`\binom{n}{${2}} n!`} exactly once.` }],
});

const N4 = 4;
const q12four = auto({
  id: 'ia-q12-four',
  source: cite('ia-prob-sheet-1', 'Q12', true),
  title: t`Four balls, four boxes`,
  prompt: t`${N4} balls are tossed independently and at random into ${N4} boxes. What is the probability that exactly one box is empty?`,
  answer: { kind: 'exact', expected: oneEmpty(N4) },
  solution: [t`${math`\binom{${N4}}{${2}} \times ${N4}! = ${choose(N4, 2)} \times ${factorial(N4)} = ${choose(N4, 2) * factorial(N4)}`} of the ${math`${N4}^{${N4}} = ${N4 ** N4}`} equally likely placements: ${math`${q(choose(N4, 2) * factorial(N4), N4 ** N4)}`}.`],
  reference: oneEmpty(N4),
  verify: () => same('the formula and the listing', oneEmpty(N4), str(q(choose(N4, 2) * factorial(N4), N4 ** N4))),
  misconceptions: [{ response: str(q(choose(N4, 2) * factorial(N4), choose(2 * N4 - 1, N4))), why: t`The ${choose(2 * N4 - 1, N4)} placements of identical balls are not equally likely. Count labelled balls: ${math`${N4}^{${N4}}`} outcomes.` }],
});

const NK_DOM = { n: { kind: 'integer' as const, min: 5, max: 9 }, k: { kind: 'integer' as const, min: 1, max: 4 } };
/** Q13 by listing every non-decreasing function. */
function q13(n: number, k: number): string {
  const nd = sequences(n, k).filter((s) => s.every((v, i) => i === 0 || v >= (s[i - 1] as number)));
  return str(q(nd.filter((s) => new Set(s).size === k).length, nd.length));
}
const q13auto = auto({
  id: 'ia-q13',
  source: cite('ia-prob-sheet-1', 'Q13'),
  title: t`A random increasing function`,
  prompt: t`What is the probability that a random increasing (that is, non-decreasing) function ${math`\{${1}, \ldots, k\} \to \{${1}, \ldots, n\}`} is strictly increasing? Every non-decreasing function is equally likely. Give an expression in ${mn} and ${mk}.`,
  answer: { kind: 'expression', expected: 'choose(n, k) / choose(n + k - 1, k)', variables: ['n', 'k'], domains: NK_DOM, binomial: true },
  solution: [
    t`A non-decreasing function is fixed by its multiset of values: ${mk} values from ${mn}, repeats allowed, order fixed. There are ${math`\binom{n + k - ${1}}{k}`} (unordered samples with replacement).`,
    t`A strictly increasing one is fixed by its set of ${mk} distinct values: ${math`\binom{n}{k}`}. So the probability is ${math`\binom{n}{k} \big/ \binom{n + k - ${1}}{k}`}.`,
  ],
  reference: 'C(n, k) / C(n + k - 1, k)',
  verify: () => {
    for (const [n, k] of [[5, 2], [6, 3], [7, 4], [4, 4]] as const) {
      const e = same(`n = ${n}, k = ${k}`, q13(n, k), str(q(choose(n, k), choose(n + k - 1, k))));
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [{ response: 'choose(n, k) * k! / n^k', why: t`That is for a random function. Here only the non-decreasing functions are possible outcomes, ${math`\binom{n + k - ${1}}{k}`} of them.` }],
});

const q13why = supervision({
  id: 'ia-q13-bijection',
  source: cite('ia-prob-sheet-1', 'Q13'),
  title: t`Counting non-decreasing functions`,
  prompt: t`Explain why the non-decreasing functions ${math`\{${1}, \ldots, k\} \to \{${1}, \ldots, n\}`} correspond one to one with the unordered samples of size ${mk} from ${mn} with replacement, and prove there are ${math`\binom{n + k - ${1}}{k}`} of them, for example by the map ${math`f \mapsto \{f(i) + i - ${1}\}`} onto the ${mk}-subsets of ${math`\{${1}, \ldots, n + k - ${1}\}`}.`,
  writeUp: 'proof',
});
const q12why = supervision({
  id: 'ia-q12-model',
  source: cite('ia-prob-sheet-1', 'Q12'),
  title: t`Which outcomes are equally likely?`,
  prompt: t`In Q${12}, a student counts "placements" by the number of balls in each box (unordered samples with replacement) and divides the number with exactly one empty box by the total. For ${math`n = ${3}`}, compute that student's answer and compare it with ${q(2, 3)}. Explain which sample space has equally likely outcomes when balls are tossed independently and at random, and why.`,
  writeUp: 'explanation',
});

// ---------------------------------------------------------------- lesson

const claims: ProbabilityClaim[] = [
  { what: 'three balls into three boxes: exactly one box empty', exact: q(2, 3), trial: (rng) => new Set(throwBalls(3, 3, rng)).size === 2 },
];

export const samplingModels: TopicContent = {
  topicId: 'prob.sampling-models',
  goal: t`Count samples of size ${mk} from ${mn} in the four models, ordered or not and with or without replacement, and use the model whose outcomes are equally likely.`,
  lesson: [
    { kind: 'p', text: t`Choosing ${mk} things from ${mn} can mean four different things, depending on whether order matters and whether a thing can be chosen again. IA Probability calls them the four [[sampling-model|sampling models]].` },
    { kind: 'table', caption: t`Samples of size ${mk} from ${mn}`, head: [t``, t`with replacement`, t`without replacement`], rows: [[t`ordered`, t`${math`n^{k}`}`, t`${math`n(n - ${1})\cdots(n - k + ${1})`}`], [t`unordered`, t`${math`\binom{n + k - ${1}}{k}`}`, t`${math`\binom{n}{k}`}`]] },
    { kind: 'p', text: t`The unordered count with replacement is the [[stars-and-bars|stars and bars]] count: a multiset of ${mk} items from ${mn} kinds is a row of ${mk} stars and ${math`n - ${1}`} bars, so ${math`\binom{n + k - ${1}}{k}`}. For ${math`n = ${3}`} flavours and ${math`k = ${2}`} scoops, ${choose(4, 2)} orders.` },
    { kind: 'p', text: t`For probability, counting is not enough: the outcomes must be equally likely. When balls are tossed independently and at random, label them: the ${math`n^{k}`} ordered placements are equally likely, the unordered ones are not. Two balls in two boxes: "one in each" happens ${2} ways out of ${4}, not ${1} out of ${3}.` },
    { kind: 'p', text: t`Sheet ${1} Q${12}: ${mn} balls into ${mn} boxes, exactly one box empty, has probability ${math`\binom{n}{${2}} n! / n^{n}`}, which is ${q(1, 2)} for ${math`n = ${2}`} and ${q(2, 3)} for ${math`n = ${3}`}. Q${13} is the exception that proves the rule: there the non-decreasing functions themselves are the equally likely outcomes, so the unordered count is the right denominator.` },
  ],
  examples: [
    workedCambridge(q12),
    worked(fourModels, { c: 3, n: 5, k: 3 }, t`Scoops of ice cream`),
    worked(allDifferent, { n: 6, k: 3 }, t`Three balls in different boxes`),
  ],
  generators: [fourModels, allDifferent, noEmptyBox],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['sampling-model', 'stars-and-bars'],
  claims,
  cambridge: [q12four, q13auto, q13why, q12why],
};
