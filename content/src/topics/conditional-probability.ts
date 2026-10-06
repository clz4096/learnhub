/**
 * prob.conditional-probability: for P(B) > 0, P(· | B) is itself a probability measure, and
 * the multiplication rule extends to several events,
 * P(A_1 ∩ ... ∩ A_n) = P(A_1) P(A_2 | A_1) ... P(A_n | A_1 ∩ ... ∩ A_(n-1)). From IA
 * Probability Example Sheet 1 Q10 (the Pólya urn, whose sequences of draws are products of
 * conditional probabilities; the question itself is set in alg.proof-by-induction) and the
 * Faculty schedule's "Conditional probability". The sheet has no official solutions.
 */
import type { Rng } from '@learnhub/mastery';
import { auto, cite, same, supervision } from '../cambridge';
import { add, factorial, int, mul, pick, q, str, sub, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { join, math, t, type Rich } from '../rich';
import { worked, workedCambridge, type ProbabilityClaim, type TopicContent } from '../topic';

const S1 = 'ia-prob-sheet-1' as const;
const mB = math`B`;
const distinctFrom = (right: string, xs: readonly string[]): number => new Set(xs.filter((x) => x !== right)).size;
type Colour = 'R' | 'B' | 'G';
const NAME: Readonly<Record<Colour, string>> = { R: 'red', B: 'blue', G: 'green' };
const seqText = (s: readonly Colour[]): Rich => join(s.map((c) => t`${NAME[c]}`), ', ');

// ---------------------------------------------------------------- the multiplication rule along draws

interface ChainP { r: number; b: number; g: number; seq: readonly Colour[] }
const chainVal = ({ r, b, g, seq }: ChainP): Rational => {
  const left: Record<Colour, number> = { R: r, B: b, G: g };
  let n = r + b + g;
  let p = q(1);
  for (const c of seq) { p = mul(p, q(left[c], n)); left[c]--; n--; }
  return p;
};
const chainMis = (p: ChainP): string[] => {
  const n = p.r + p.b + p.g;
  const cnt: Record<Colour, number> = { R: p.r, B: p.b, G: p.g };
  const withRep = p.seq.reduce((acc, c) => mul(acc, q(cnt[c], n)), q(1));
  const orders = factorial(p.seq.length) / (['R', 'B', 'G'] as const).reduce((acc, c) => acc * factorial(p.seq.filter((x) => x === c).length), 1);
  return [str(withRep), str(mul(q(orders), chainVal(p))), str(q(cnt[p.seq[p.seq.length - 1] as Colour], n))];
};

const chainRule = generator<ChainP>({
  id: 'chain-rule',
  skill: 'Find the probability of a sequence of draws without replacement by the multiplication rule: each factor is conditional on the draws before it.',
  params: (rng) => {
    for (;;) {
      const p: ChainP = { r: int(rng, 2, 6), b: int(rng, 2, 6), g: int(rng, 1, 4), seq: Array.from({ length: 3 }, () => pick(rng, ['R', 'B', 'G'] as const)) };
      const need: Record<Colour, number> = { R: 0, B: 0, G: 0 };
      p.seq.forEach((c) => need[c]++);
      if (need.R <= p.r && need.B <= p.b && need.G <= p.g && distinctFrom(str(chainVal(p)), chainMis(p)) >= 2) return p;
    }
  },
  sane: ({ r, b, g }) => (r + b + g >= 5 ? null : 'out of range'),
  problem: (p) => {
    const left: Record<Colour, number> = { R: p.r, B: p.b, G: p.g };
    let n = p.r + p.b + p.g;
    const factors: Rational[] = [];
    for (const c of p.seq) { factors.push(q(left[c], n)); left[c]--; n--; }
    return {
      prompt: t`A bag holds ${p.r} red, ${p.b} blue, and ${p.g} green counters. Three are drawn at random, one after another, without replacement. What is the probability that they come out ${seqText(p.seq)}, in that order?`,
      answer: { kind: 'exact', expected: str(chainVal(p)) },
      solution: [
        t`By the multiplication rule for several events, ${math`\mathbb{P}(A_{${1}} \cap A_{${2}} \cap A_{${3}}) = \mathbb{P}(A_{${1}})\,\mathbb{P}(A_{${2}} \mid A_{${1}})\,\mathbb{P}(A_{${3}} \mid A_{${1}} \cap A_{${2}})`}, where ${math`A_{i}`} is "draw ${math`i`} has the stated colour".`,
        t`Each factor counts the counters left of that colour among those left: ${math`${factors[0] as Rational} \times ${factors[1] as Rational} \times ${factors[2] as Rational} = ${chainVal(p)}`}.`,
      ],
    };
  },
  solve: ({ r, b, g, seq }) => {
    // List every ordered triple of distinct counters.
    const bag: Colour[] = [...Array(r).fill('R'), ...Array(b).fill('B'), ...Array(g).fill('G')];
    let [good, all] = [0, 0];
    bag.forEach((x, i) => bag.forEach((y, j) => bag.forEach((z, k) => {
      if (i === j || j === k || i === k) return;
      all++;
      if (x === seq[0] && y === seq[1] && z === seq[2]) good++;
    })));
    return str(q(good, all));
  },
  misconceptions: (p): Misconception[] => {
    const [a, b, c] = chainMis(p);
    return [
      { response: a as string, why: t`Without replacement the bag changes: after each draw, one counter fewer of that colour, and one fewer in all.` },
      { response: b as string, why: t`The question fixes the order, so do not multiply by the number of orders.` },
      { response: c as string, why: t`That is only the chance of the last colour on a single draw. Multiply the conditional chances of all three draws.` },
    ];
  },
  trial: ({ r, b, g, seq }, rng) => {
    const bag: Colour[] = [...Array(r).fill('R'), ...Array(b).fill('B'), ...Array(g).fill('G')];
    for (let i = 0; i < 3; i++) {
      const j = i + Math.floor(rng() * (bag.length - i));
      [bag[i], bag[j]] = [bag[j] as Colour, bag[i] as Colour];
      if (bag[i] !== seq[i]) return false;
    }
    return true;
  },
});

// ---------------------------------------------------------------- the Pólya urn

type WB = 'W' | 'B';
interface PolyaP { w: number; b: number; seq: readonly WB[] }
const polyaVal = ({ w, b, seq }: PolyaP): Rational => {
  let [x, y] = [w, b];
  let p = q(1);
  for (const c of seq) { p = mul(p, q(c === 'W' ? x : y, x + y)); if (c === 'W') x++; else y++; }
  return p;
};
const polyaMis = (p: PolyaP): string[] => [
  str(p.seq.reduce((acc, c) => mul(acc, q(c === 'W' ? p.w : p.b, p.w + p.b)), q(1))),
  str(mul(polyaVal(p), q(factorial(p.seq.length), factorial(p.seq.filter((c) => c === 'W').length) * factorial(p.seq.filter((c) => c === 'B').length)))),
  str(q(1, 2 ** p.seq.length)),
];

const polyaSequence = generator<PolyaP>({
  id: 'polya-sequence',
  skill: 'Find the probability of a sequence of draws from a Pólya urn, where each ball drawn goes back with another of its colour, by the multiplication rule.',
  params: (rng) => {
    for (;;) {
      const p: PolyaP = { w: int(rng, 1, 3), b: int(rng, 1, 3), seq: Array.from({ length: int(rng, 3, 4) }, () => pick(rng, ['W', 'B'] as const)) };
      if (distinctFrom(str(polyaVal(p)), polyaMis(p)) >= 2) return p;
    }
  },
  sane: ({ w, b }) => (w >= 1 && b >= 1 ? null : 'out of range'),
  problem: (p) => {
    let [x, y] = [p.w, p.b];
    const factors: Rational[] = [];
    for (const c of p.seq) { factors.push(q(c === 'W' ? x : y, x + y)); if (c === 'W') x++; else y++; }
    return {
      prompt: t`A Pólya urn starts with ${p.w} white and ${p.b} black ${p.w + p.b === 1 ? 'ball' : 'balls'}. Each second a ball is drawn at random and put back together with one more ball of the same colour. What is the probability that the first ${p.seq.length} draws are ${join(p.seq.map((c) => t`${c === 'W' ? 'white' : 'black'}`), ', ')}, in that order?`,
      answer: { kind: 'exact', expected: str(polyaVal(p)) },
      solution: [
        t`Each draw's chance depends on the urn after the draws before it, which the multiplication rule allows: the factors are ${join(factors.map((f) => [math`${f}`]), ', ')}.`,
        t`Their product is ${polyaVal(p)}. The numerators count up the whites and the blacks separately, and the denominators count up the urn, so the answer depends only on how many of each colour are drawn, not their order.`,
      ],
    };
  },
  solve: ({ w, b, seq }) => {
    // Track the exact distribution of urns along the draws, keeping only the stated colours.
    let paths: { x: number; y: number; p: Rational }[] = [{ x: w, y: b, p: q(1) }];
    for (const c of seq) paths = paths.map(({ x, y, p }) => (c === 'W' ? { x: x + 1, y, p: mul(p, q(x, x + y)) } : { x, y: y + 1, p: mul(p, q(y, x + y)) }));
    return str(paths.reduce((s, z) => add(s, z.p), q(0)));
  },
  misconceptions: (p): Misconception[] => {
    const [a, b, c] = polyaMis(p);
    return [
      { response: a as string, why: t`The urn grows: after each draw it holds one more ball, of the colour just drawn. Each factor is conditional on the draws before.` },
      { response: b as string, why: t`The question fixes the order of colours: do not multiply by the number of orders.` },
      { response: c as string, why: t`The colours are not equally likely at each draw: the urn's make-up decides.` },
    ];
  },
  trial: ({ w, b, seq }, rng) => {
    let [x, y] = [w, b];
    for (const c of seq) {
      const white = rng() < x / (x + y);
      if ((c === 'W') !== white) return false;
      if (white) x++; else y++;
    }
    return true;
  },
});

// ---------------------------------------------------------------- P(· | B) is a probability

interface CondP { j: number; i: number; k: number }
const die = (rng: Rng): number => 1 + Math.floor(rng() * 6);
const CONDS: readonly { text: Rich; f: (a: number, b: number) => boolean }[] = [
  { text: t`the total is at least ${7}`, f: (a, b) => a + b >= 7 },
  { text: t`at least one die shows a six`, f: (a, b) => a === 6 || b === 6 },
  { text: t`the first die is odd`, f: (a) => a % 2 === 1 },
  { text: t`the dice differ`, f: (a, b) => a !== b },
];
const TOTALS = [5, 6, 7, 8, 9, 10, 11];

const conditionalUnion = generator<CondP>({
  id: 'conditional-union',
  skill: 'Use that P(· | B) is a probability measure: for disjoint A and C, P(A ∪ C | B) = P(A | B) + P(C | B).',
  params: (rng) => {
    for (;;) {
      const p: CondP = { j: int(rng, 0, CONDS.length - 1), i: pick(rng, TOTALS), k: pick(rng, TOTALS) };
      if (p.i === p.k) continue;
      const B = (CONDS[p.j] as (typeof CONDS)[number]).f;
      let [nb, ni, nk] = [0, 0, 0];
      for (let a = 1; a <= 6; a++) for (let c = 1; c <= 6; c++) if (B(a, c)) { nb++; if (a + c === p.i) ni++; if (a + c === p.k) nk++; }
      if (ni > 0 && nk > 0 && ni + nk < nb) return p;
    }
  },
  sane: ({ i, k }) => (i !== k ? null : 'out of range'),
  problem: ({ j, i, k }) => {
    const B = CONDS[j] as (typeof CONDS)[number];
    let [nb, ni, nk] = [0, 0, 0];
    for (let a = 1; a <= 6; a++) for (let c = 1; c <= 6; c++) if (B.f(a, c)) { nb++; if (a + c === i) ni++; if (a + c === k) nk++; }
    return {
      prompt: t`Two fair dice are thrown. Given that ${B.text}, what is the probability that the total is ${i} or ${k}?`,
      answer: { kind: 'exact', expected: str(q(ni + nk, nb)) },
      solution: [
        t`Given ${mB} ("${B.text}"), ${math`\mathbb{P}(\cdot \mid B)`} is a probability measure on the ${nb} outcomes in ${mB}, each now with probability ${q(1, nb)}.`,
        t`The totals ${i} and ${k} are disjoint events, so their conditional probabilities add: ${math`${q(ni, nb)} + ${q(nk, nb)} = ${q(ni + nk, nb)}`}.`,
      ],
    };
  },
  solve: ({ j, i, k }) => {
    const B = (CONDS[j] as (typeof CONDS)[number]).f;
    const inB: [number, number][] = [];
    for (let a = 1; a <= 6; a++) for (let c = 1; c <= 6; c++) if (B(a, c)) inB.push([a, c]);
    return str(q(inB.filter(([a, c]) => a + c === i || a + c === k).length, inB.length));
  },
  misconceptions: ({ j, i, k }): Misconception[] => {
    const B = (CONDS[j] as (typeof CONDS)[number]).f;
    let [nb, ni, nk, ui, uk] = [0, 0, 0, 0, 0];
    for (let a = 1; a <= 6; a++) for (let c = 1; c <= 6; c++) { if (a + c === i) ui++; if (a + c === k) uk++; if (B(a, c)) { nb++; if (a + c === i) ni++; if (a + c === k) nk++; } }
    return [
      { response: str(q(ui + uk, 36)), why: t`That ignores the condition. Given ${mB}, only the ${nb} outcomes in ${mB} remain.` },
      { response: str(mul(q(ni, nb), q(nk, nb))), why: t`"Or" for disjoint events adds probabilities, conditional ones included: ${math`\mathbb{P}(\cdot \mid B)`} is a probability measure.` },
      { response: str(q(ni + nk, 36)), why: t`That is ${math`\mathbb{P}((A \cup C) \cap B)`}. Divide by ${math`\mathbb{P}(B)`}.` },
    ];
  },
  trial: ({ j, i, k }, rng) => { for (;;) { const [a, c] = [die(rng), die(rng)]; if ((CONDS[j] as (typeof CONDS)[number]).f(a, c)) return a + c === i || a + c === k; } },
});

// ---------------------------------------------------------------- Cambridge problems

const WWB: readonly WB[] = ['W', 'W', 'B'];
const q10seq = auto({
  id: 'ia-q10-sequence',
  source: cite(S1, 'Q10', true),
  title: t`The Pólya urn: white, white, black`,
  prompt: t`The Pólya urn of Q${10}: start with one white ball and one black ball; at each second choose a ball at random and replace it together with one more ball of the same colour. What is the probability that the first three draws are white, white, black?`,
  answer: { kind: 'exact', expected: str(polyaVal({ w: 1, b: 1, seq: WWB })) },
  solution: [
    t`Multiplication rule: ${math`\mathbb{P}(W_{${1}}) = ${q(1, 2)}`}; given that, the urn has ${2} white of ${3}, so ${math`\mathbb{P}(W_{${2}} \mid W_{${1}}) = ${q(2, 3)}`}; then ${1} black of ${4}, so ${math`\mathbb{P}(B_{${3}} \mid W_{${1}} \cap W_{${2}}) = ${q(1, 4)}`}.`,
    t`The product is ${math`${q(1, 2)} \times ${q(2, 3)} \times ${q(1, 4)} = ${polyaVal({ w: 1, b: 1, seq: WWB })}`}. Any order of two whites and one black gives the same: ${math`\frac{${2}! \, ${1}!}{${4}!}`}.`,
  ],
  reference: str(polyaVal({ w: 1, b: 1, seq: WWB })),
  verify: () => same('the formula for k whites in n draws, k! (n - k)! / (n + 1)!', str(polyaVal({ w: 1, b: 1, seq: WWB })), str(q(factorial(2) * factorial(1), factorial(4)))),
  misconceptions: [{ response: str(q(1, 8)), why: t`The urn changes after each draw, so the draws are not independent halves.` }],
});

const third = (): Rational => {
  // Sum over the eight sequences of three draws those whose third is white.
  let s = q(0);
  for (const a of ['W', 'B'] as const) for (const b of ['W', 'B'] as const) s = add(s, polyaVal({ w: 1, b: 1, seq: [a, b, 'W'] }));
  return s;
};
const q10third = auto({
  id: 'ia-q10-third-white',
  source: cite(S1, 'Q10', true),
  title: t`The third draw`,
  prompt: t`In the same urn (one white and one black ball to start), what is the probability that the third ball drawn is white?`,
  answer: { kind: 'exact', expected: str(third()) },
  solution: [
    t`Split by the first two draws, a partition into four cases: ${math`WW`}, ${math`WB`}, ${math`BW`}, ${math`BB`}, with probabilities ${math`${q(1, 3)}, ${q(1, 6)}, ${q(1, 6)}, ${q(1, 3)}`}. Given each, the third draw is white with probability ${math`${q(3, 4)}, ${q(2, 4)}, ${q(2, 4)}, ${q(1, 4)}`}.`,
    t`Adding: ${math`${q(1, 3)} \cdot ${q(3, 4)} + ${q(1, 6)} \cdot ${q(1, 2)} + ${q(1, 6)} \cdot ${q(1, 2)} + ${q(1, 3)} \cdot ${q(1, 4)} = ${third()}`}. By symmetry between the colours this had to be ${q(1, 2)}, although the draws are far from independent.`,
  ],
  reference: str(third()),
  verify: () => same('the four sequences', str(third()), '1/2'),
  misconceptions: [{ response: str(q(3, 4)), why: t`That is the chance given two whites first. Without that information, weigh every history by its probability.` }],
});

const exchange = supervision({
  id: 'ia-q10-exchangeable',
  source: cite(S1, 'Q10', true),
  title: t`Order does not matter`,
  prompt: t`For the Pólya urn starting with one white and one black ball, use the multiplication rule to show that every sequence of ${math`n`} draws with ${math`k`} whites has probability ${math`\frac{k!\,(n - k)!}{(n + ${1})!}`}. Deduce the answer to Q${10}: with ${math`n + ${2}`} balls in the urn, each number of white balls from ${1} to ${math`n + ${1}`} has probability ${math`\frac{${1}}{n + ${1}}`}.`,
  writeUp: 'proof',
});
const measure = supervision({
  id: 'schedule-conditional-measure',
  source: cite('tripos-schedules', 'IA Probability, Axiomatic approach: "Conditional probability"', true),
  title: t`${math`\mathbb{P}(\cdot \mid B)`} is a probability measure`,
  prompt: t`Let ${mB} be an event with ${math`\mathbb{P}(B) > ${0}`}. Prove that ${math`\mathbb{Q}(A) = \mathbb{P}(A \mid B)`} satisfies the axioms: ${math`\mathbb{Q}(A) \ge ${0}`}, ${math`\mathbb{Q}(\Omega) = ${1}`}, and countable additivity. Then prove the multiplication rule for ${math`n`} events by induction, saying which conditional probabilities must be defined.`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

const claims: ProbabilityClaim[] = [
  { what: 'Pólya urn: white, white, black', exact: q(1, 12), trial: (rng) => { let [x, y] = [1, 1]; for (const c of WWB) { const w = rng() < x / (x + y); if ((c === 'W') !== w) return false; if (w) x++; else y++; } return true; } },
];

export const conditionalProbability: TopicContent = {
  topicId: 'prob.conditional-probability',
  goal: t`Show that ${math`\mathbb{P}(\cdot \mid B)`} is a probability measure, and use the multiplication rule for several events along a sequence of steps.`,
  lesson: [
    { kind: 'rule', text: t`For an event ${mB} with ${math`\mathbb{P}(B) > ${0}`}, ${math`\mathbb{P}(A \mid B) = \mathbb{P}(A \cap B)/\mathbb{P}(B)`} defines a [[conditional-measure|probability measure]] ${math`A \mapsto \mathbb{P}(A \mid B)`}: it is nonnegative, gives ${mB} (and ${math`\Omega`}) probability ${1}, and is countably additive.` },
    { kind: 'p', text: t`So every rule for probabilities holds for conditional ones with the same condition: ${math`\mathbb{P}(A^{c} \mid B) = ${1} - \mathbb{P}(A \mid B)`}, and disjoint events add. Given that two dice show different numbers, the total is ${7} or ${11} with probability ${math`\frac{${6}}{${30}} + \frac{${2}}{${30}} = ${q(8, 30)}`}.` },
    { kind: 'rule', text: t`The multiplication rule for ${math`n`} events: ${math`\mathbb{P}(A_{${1}} \cap \cdots \cap A_{n}) = \mathbb{P}(A_{${1}})\,\mathbb{P}(A_{${2}} \mid A_{${1}}) \cdots \mathbb{P}(A_{n} \mid A_{${1}} \cap \cdots \cap A_{n - ${1}})`}, provided the conditioning events have positive probability. It follows by induction from the two-event rule.` },
    { kind: 'p', text: t`It is the natural way to compute along a process where each step depends on the past. In Q${10}'s Pólya urn, starting with one white and one black ball, the draws white, white, black have probability ${math`\frac{${1}}{${2}} \cdot \frac{${2}}{${3}} \cdot \frac{${1}}{${4}} = ${q(1, 12)}`}, and so does every other order of two whites and a black: the urn's history is exchangeable.` },
  ],
  examples: [
    workedCambridge(q10seq),
    worked(chainRule, { r: 4, b: 3, g: 2, seq: ['R', 'B', 'R'] }, t`Red, blue, red`),
    worked(conditionalUnion, { j: 3, i: 7, k: 11 }, t`A total of ${7} or ${11}, given different dice`),
  ],
  generators: [chainRule, polyaSequence, conditionalUnion],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['conditional-measure'],
  claims,
  cambridge: [q10third, exchange, measure],
  gate: ['ia-q10-third-white', 'ia-q10-exchangeable'],
};
