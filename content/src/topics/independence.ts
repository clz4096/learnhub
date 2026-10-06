/**
 * prob.independence: events A_1, ..., A_n are (mutually) independent when every
 * subfamily's intersection has probability the product of theirs; pairwise independence
 * is weaker. From IA Probability Example Sheet 1 Q11 (Mary's n + 1 coins against John's n:
 * the proof splits off Mary's last coin, which is independent of everything else) and the
 * Faculty schedule's "Independence". The sheet has no official solutions; every answer is
 * checked by listing the outcomes.
 */
import type { Rng } from '@learnhub/mastery';
import { auto, cite, same, supervision } from '../cambridge';
import { add, int, mul, pick, q, sample, str, sub, toFloat, type Rational } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { math, t, type Rich } from '../rich';
import { worked, workedCambridge, type ProbabilityClaim, type TopicContent } from '../topic';

const S1 = 'ia-prob-sheet-1' as const;
const distinctFrom = (right: string, xs: readonly string[]): number => new Set(xs.filter((x) => x !== right)).size;
const eqR = (a: Rational, b: Rational): boolean => a.num === b.num && a.den === b.den;

// ---------------------------------------------------------------- classify three events on two dice

interface Ev { text: Rich; f: (a: number, b: number) => boolean }
const EVENTS: readonly Ev[] = [
  { text: t`the first die is even`, f: (a) => a % 2 === 0 },
  { text: t`the second die is even`, f: (_a, b) => b % 2 === 0 },
  { text: t`the total is even`, f: (a, b) => (a + b) % 2 === 0 },
  { text: t`the total is ${7}`, f: (a, b) => a + b === 7 },
  { text: t`the first die shows at most ${3}`, f: (a) => a <= 3 },
  { text: t`the second die shows ${1} or ${2}`, f: (_a, b) => b <= 2 },
  { text: t`the first die shows a multiple of ${3}`, f: (a) => a % 3 === 0 },
  { text: t`the total is a multiple of ${3}`, f: (a, b) => (a + b) % 3 === 0 },
  { text: t`the second die shows a multiple of ${3}`, f: (_a, b) => b % 3 === 0 },
];
const prob = (f: (a: number, b: number) => boolean): Rational => { let c = 0; for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (f(a, b)) c++; return q(c, 36); };
type Kind = 'mutual' | 'pairwise' | 'neither';
function classify(ix: readonly number[]): Kind {
  const fs = ix.map((i) => (EVENTS[i] as Ev).f);
  const P = fs.map(prob);
  const pairsOk = [[0, 1], [0, 2], [1, 2]].every(([i, j]) => eqR(prob((a, b) => (fs[i as number] as Ev['f'])(a, b) && (fs[j as number] as Ev['f'])(a, b)), mul(P[i as number] as Rational, P[j as number] as Rational)));
  if (!pairsOk) return 'neither';
  return eqR(prob((a, b) => fs.every((f) => f(a, b))), mul(mul(P[0] as Rational, P[1] as Rational), P[2] as Rational)) ? 'mutual' : 'pairwise';
}
const KIND_OPTIONS: ChoiceOption[] = [
  { id: 'mutual', label: t`mutually independent` },
  { id: 'pairwise', label: t`pairwise independent but not mutually independent` },
  { id: 'neither', label: t`not even pairwise independent` },
];
interface ClsP { ix: readonly number[] }

const classifyThree = generator<ClsP>({
  id: 'classify-three',
  skill: 'Decide whether three events are mutually independent, only pairwise independent, or neither, by checking the products of every pair and of all three.',
  params: (rng) => {
    const want = pick(rng, ['mutual', 'pairwise', 'neither', 'pairwise'] as const);
    for (;;) {
      const ix = sample(rng, EVENTS.map((_, i) => i), 3);
      if (classify(ix) === want) return { ix };
    }
  },
  sane: ({ ix }) => (new Set(ix).size === 3 ? null : 'out of range'),
  problem: ({ ix }) => {
    const evs = ix.map((i) => EVENTS[i] as Ev);
    const P = evs.map((e) => prob(e.f));
    const k = classify(ix);
    return {
      prompt: t`Two fair dice are thrown. Let ${math`A`} be "${(evs[0] as Ev).text}", ${math`B`} be "${(evs[1] as Ev).text}", and ${math`C`} be "${(evs[2] as Ev).text}". Are ${math`A`}, ${math`B`}, ${math`C`} independent?`,
      answer: { kind: 'choice', options: KIND_OPTIONS, correct: k },
      solution: [
        t`${math`\mathbb{P}(A) = ${P[0] as Rational}`}, ${math`\mathbb{P}(B) = ${P[1] as Rational}`}, ${math`\mathbb{P}(C) = ${P[2] as Rational}`}, counting among the ${36} pairs.`,
        t`Pairs: ${math`\mathbb{P}(A \cap B) = ${prob((a, b) => (evs[0] as Ev).f(a, b) && (evs[1] as Ev).f(a, b))}`}, ${math`\mathbb{P}(A \cap C) = ${prob((a, b) => (evs[0] as Ev).f(a, b) && (evs[2] as Ev).f(a, b))}`}, ${math`\mathbb{P}(B \cap C) = ${prob((a, b) => (evs[1] as Ev).f(a, b) && (evs[2] as Ev).f(a, b))}`}; all three: ${math`\mathbb{P}(A \cap B \cap C) = ${prob((a, b) => evs.every((e) => e.f(a, b)))}`}. Compare each with the product of the single probabilities.`,
        k === 'mutual' ? t`Every product matches, so they are mutually independent.` : k === 'pairwise' ? t`Every pair matches, but ${math`\mathbb{P}(A \cap B \cap C) \ne ${mul(mul(P[0] as Rational, P[1] as Rational), P[2] as Rational)}`}: pairwise but not mutually independent.` : t`Some pair fails, so they are not even pairwise independent.`,
      ],
    };
  },
  solve: ({ ix }) => {
    // Recount with a simulation-free list of the 36 outcomes, by subsets of the three events.
    const fs = ix.map((i) => (EVENTS[i] as Ev).f);
    const outcomes: [number, number][] = [];
    for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) outcomes.push([a, b]);
    const pr = (sel: readonly number[]): number => outcomes.filter(([a, b]) => sel.every((i) => (fs[i] as Ev['f'])(a, b))).length / 36;
    const near = (x: number, y: number): boolean => Math.abs(x - y) < 1e-12;
    const pairs = [[0, 1], [0, 2], [1, 2]].every(([i, j]) => near(pr([i as number, j as number]), pr([i as number]) * pr([j as number])));
    if (!pairs) return ['neither'];
    return [near(pr([0, 1, 2]), pr([0]) * pr([1]) * pr([2])) ? 'mutual' : 'pairwise'];
  },
  misconceptions: ({ ix }): Misconception[] => {
    const k = classify(ix);
    const why: Record<Kind, Rich> = {
      mutual: t`Mutual independence needs every pair and the triple to multiply. Check them all.`,
      pairwise: t`Pairwise independence is about the three pairs only; then check the triple separately.`,
      neither: t`Check each pair's intersection against the product of its probabilities.`,
    };
    return (['mutual', 'pairwise', 'neither'] as const).filter((x) => x !== k).map((x) => ({ response: x, why: why[k] }));
  },
});

// ---------------------------------------------------------------- independent events together

type SysKind = 'none' | 'all' | 'exactly-one';
interface SysP { ps: readonly Rational[]; kind: SysKind }
const sysVal = ({ ps, kind }: SysP): Rational => {
  if (kind === 'all') return ps.reduce((a, p) => mul(a, p), q(1));
  if (kind === 'none') return ps.reduce((a, p) => mul(a, sub(q(1), p)), q(1));
  return ps.reduce((acc, p, i) => add(acc, ps.reduce((a, r, j) => mul(a, i === j ? r : sub(q(1), r)), q(1))), q(0));
};
const sysMis = ({ ps, kind }: SysP): string[] => {
  const sum = ps.reduce((a, p) => add(a, p), q(0));
  return kind === 'none' ? [str(sub(q(1), sum)), str(sub(q(1), ps.reduce((a, p) => mul(a, p), q(1))))]
    : kind === 'all' ? [str(ps.reduce((a, p) => (a.num * p.den < p.num * a.den ? a : p))), str(mul(q(1, ps.length), sum))]
      : [str(sum), str(sub(q(1), ps.reduce((a, p) => mul(a, sub(q(1), p)), q(1))))];
};
const PROBS = [q(1, 2), q(1, 3), q(2, 3), q(1, 4), q(3, 4), q(1, 5), q(2, 5)];

const independentSystem = generator<SysP>({
  id: 'independent-system',
  skill: 'Combine several mutually independent events: none, all, or exactly one of them, multiplying probabilities and complements.',
  params: (rng) => {
    for (;;) {
      const p: SysP = { ps: Array.from({ length: int(rng, 2, 4) }, () => pick(rng, PROBS)), kind: pick(rng, ['none', 'all', 'exactly-one'] as const) };
      if (distinctFrom(str(sysVal(p)), sysMis(p)) >= 2) return p;
    }
  },
  sane: ({ ps }) => (ps.length >= 2 ? null : 'out of range'),
  problem: (p) => {
    const what = p.kind === 'none' ? t`none of them happens` : p.kind === 'all' ? t`all of them happen` : t`exactly one of them happens`;
    return {
      prompt: t`Events ${math`A_{${1}}, \ldots, A_{${p.ps.length}}`} are mutually independent, with probabilities ${p.ps.map((r, i) => [math`\mathbb{P}(A_{${i + 1}}) = ${r}`]).flatMap((r, i) => (i === 0 ? r : [...t`, `, ...r]))}. What is the probability that ${what}?`,
      answer: { kind: 'exact', expected: str(sysVal(p)) },
      solution: [
        p.kind === 'none'
          ? t`The complements of independent events are independent, so ${math`\mathbb{P}(\text{none}) = \prod_{i} (${1} - \mathbb{P}(A_{i})) = ${sysVal(p)}`}.`
          : p.kind === 'all'
            ? t`Mutual independence: ${math`\mathbb{P}(A_{${1}} \cap \cdots \cap A_{${p.ps.length}}) = \prod_{i} \mathbb{P}(A_{i}) = ${sysVal(p)}`}.`
            : t`Exactly one is a disjoint union over which event happens: for each ${math`i`}, ${math`\mathbb{P}(A_{i}) \prod_{j \ne i} (${1} - \mathbb{P}(A_{j}))`}. Adding them gives ${sysVal(p)}.`,
      ],
    };
  },
  solve: ({ ps, kind }) => {
    // Sum over all 2^k patterns of which events happen.
    let s = q(0);
    for (let m = 0; m < 1 << ps.length; m++) {
      const happened = ps.map((_, i) => ((m >> i) & 1) === 1);
      const ok = kind === 'none' ? happened.every((h) => !h) : kind === 'all' ? happened.every((h) => h) : happened.filter((h) => h).length === 1;
      if (ok) s = add(s, ps.reduce((a, p, i) => mul(a, happened[i] ? p : sub(q(1), p)), q(1)));
    }
    return str(s);
  },
  misconceptions: (p): Misconception[] => {
    const [a, b] = sysMis(p);
    const why: Record<SysKind, [Rich, Rich]> = {
      none: [t`Subtracting the probabilities from ${1} is right only for disjoint events. Multiply the complements.`, t`That is the chance that not all of them happen.`],
      all: [t`That is the smallest single probability. All must happen: multiply.`, t`Averaging is not how "and" works for independent events: multiply.`],
      'exactly-one': [t`Adding the probabilities counts outcomes where several happen. Each term needs the others not to happen.`, t`That is the chance of at least one. Exactly one excludes two or more.`],
    };
    return [{ response: a as string, why: why[p.kind][0] }, { response: b as string, why: why[p.kind][1] }];
  },
  trial: ({ ps, kind }, rng: Rng) => {
    const h = ps.map((p) => rng() < toFloat(p));
    return kind === 'none' ? h.every((x) => !x) : kind === 'all' ? h.every((x) => x) : h.filter((x) => x).length === 1;
  },
});

// ---------------------------------------------------------------- with a complement in the middle

interface MixP { a: Rational; b: Rational; c: Rational }
const mixMis = ({ a, b, c }: MixP): string[] => [str(mul(mul(a, b), c)), str(mul(a, c)), str(mul(mul(a, sub(q(1), b)), sub(q(1), c)))];

const withComplement = generator<MixP>({
  id: 'with-complement',
  skill: 'Use that complements of mutually independent events are independent: P(A ∩ B^c ∩ C) = P(A)(1 - P(B))P(C).',
  params: (rng) => {
    for (;;) {
      const p: MixP = { a: pick(rng, PROBS), b: pick(rng, PROBS), c: pick(rng, PROBS) };
      if (distinctFrom(str(mul(mul(p.a, sub(q(1), p.b)), p.c)), mixMis(p)) >= 2) return p;
    }
  },
  sane: () => null,
  problem: ({ a, b, c }) => ({
    prompt: t`${math`A`}, ${math`B`}, ${math`C`} are mutually independent with ${math`\mathbb{P}(A) = ${a}`}, ${math`\mathbb{P}(B) = ${b}`}, ${math`\mathbb{P}(C) = ${c}`}. Find ${math`\mathbb{P}(A \cap B^{c} \cap C)`}.`,
    answer: { kind: 'exact', expected: str(mul(mul(a, sub(q(1), b)), c)) },
    solution: [
      t`${math`\mathbb{P}(A \cap B^{c} \cap C) = \mathbb{P}(A \cap C) - \mathbb{P}(A \cap B \cap C) = ac - abc = a(${1} - b)c`}, using mutual independence for ${math`A \cap C`} and for all three.`,
      t`So it is ${math`${a} \times ${sub(q(1), b)} \times ${c} = ${mul(mul(a, sub(q(1), b)), c)}`}: ${math`A`}, ${math`B^{c}`}, ${math`C`} are mutually independent too.`,
    ],
  }),
  solve: ({ a, b, c }) => {
    // Subtract the triple from the pair, as in the proof.
    return str(sub(mul(a, c), mul(mul(a, b), c)));
  },
  misconceptions: (p): Misconception[] => [
    { response: str(mul(mul(p.a, p.b), p.c)), why: t`That is ${math`\mathbb{P}(A \cap B \cap C)`}. Here ${math`B`} must not happen: use ${math`${1} - \mathbb{P}(B)`}.` },
    { response: str(mul(p.a, p.c)), why: t`That is ${math`\mathbb{P}(A \cap C)`}, which includes the outcomes where ${math`B`} happens too.` },
    { response: str(mul(mul(p.a, sub(q(1), p.b)), sub(q(1), p.c))), why: t`Only ${math`B`} is complemented; ${math`C`} must happen.` },
  ],
  trial: ({ a, b, c }, rng) => rng() < toFloat(a) && rng() >= toFloat(b) && rng() < toFloat(c),
});

// ---------------------------------------------------------------- Cambridge problems

const heads = (bits: number, from: number, len: number): number => { let c = 0; for (let i = 0; i < len; i++) if ((bits >> (from + i)) & 1) c++; return c; };
/** Mary has n + 1 coins (bits 0..n) and John n (bits n + 1..2n): the probabilities of the three events of the proof. */
function q11(n: number): [Rational, Rational, Rational] {
  let [beat, tie, more] = [0, 0, 0];
  const total = 2 ** (2 * n + 1);
  for (let s = 0; s < total; s++) {
    const m = heads(s, 0, n);
    const j = heads(s, n + 1, n);
    if (m > j) beat++;
    if (m === j) tie++;
    if (m + ((s >> n) & 1) > j) more++;
  }
  return [q(beat, total), q(tie, total), q(more, total)];
}
const [BEAT, TIE, MORE] = q11(2);
const q11ind = auto({
  id: 'ia-q11-independence',
  source: cite(S1, 'Q11', true),
  title: t`Mary's last coin`,
  prompt: t`Mary tosses three coins and John tosses two. Split off Mary's third coin: let ${math`W`} be "Mary's first two coins show more heads than John's two", ${math`T`} be "they show the same number", and ${math`H`} be "Mary's third coin is a head". Find ${math`\mathbb{P}(W)`}, ${math`\mathbb{P}(T)`}, and the probability that Mary gets more heads in all.`,
  answer: { kind: 'table', cell: 'exact', columns: [t`event`, t`probability`], rows: [[t`${math`W`}`, null], [t`${math`T`}`, null], [t`Mary gets more heads`, null]], expected: [str(BEAT), str(TIE), str(MORE)] },
  solution: [
    t`Ties of two coins against two: ${math`\sum_{k} \binom{${2}}{k}^{${2}} / ${16} = \frac{${6}}{${16}} = ${TIE}`}. By symmetry Mary and John are equally likely to win the first two rounds: ${math`\mathbb{P}(W) = \frac{${1} - ${TIE}}{${2}} = ${BEAT}`}.`,
    t`Mary has more in all when ${math`W`} happens, or ${math`T`} happens and her third coin is a head. ${math`H`} depends on a different coin, so it is independent of ${math`T`}: ${math`${BEAT} + ${TIE} \times ${q(1, 2)} = ${MORE}`}, the ${q(1, 2)} the question conjectures.`,
  ],
  reference: [str(BEAT), str(TIE), str(MORE)],
  verify: () => same('the 32 outcomes listed, and the formula', [str(BEAT), str(TIE), str(MORE)].join(), [str(mul(sub(q(1), TIE), q(1, 2))), str(TIE), str(add(mul(sub(q(1), TIE), q(1, 2)), mul(TIE, q(1, 2))))].join()),
  misconceptions: [{ response: [str(BEAT), str(TIE), str(add(BEAT, TIE))], why: t`On a tie Mary still needs her third coin to be a head, probability ${q(1, 2)}: multiply by it, since the coins are independent.` }],
});

const q11proof = supervision({
  id: 'ia-q11-by-independence',
  source: cite(S1, 'Q11', true),
  title: t`The conjecture, by independence`,
  prompt: t`Mary tosses ${math`n + ${1}`} coins and John ${math`n`}. With ${math`W`}, ${math`T`}, ${math`H`} as in the three-coin case, prove that ${math`\mathbb{P}(\text{Mary gets more}) = \mathbb{P}(W) + \mathbb{P}(T)\mathbb{P}(H)`} and that ${math`\mathbb{P}(W) = (${1} - \mathbb{P}(T))/${2}`}, and deduce that the answer is ${q(1, 2)} for every ${math`n`}. Say exactly which events you use as independent, and why they are.`,
  writeUp: 'proof',
});
const bernstein = supervision({
  id: 'schedule-independence',
  source: cite('tripos-schedules', 'IA Probability, Axiomatic approach: "Independence"', true),
  title: t`Pairwise is not enough`,
  prompt: t`Define mutual independence of events ${math`A_{${1}}, \ldots, A_{n}`}. Toss two fair coins and let ${math`A`} be "the first is a head", ${math`B`} "the second is a head", ${math`C`} "they agree". Show that ${math`A`}, ${math`B`}, ${math`C`} are pairwise independent but not mutually independent. Then prove that if ${math`A`}, ${math`B`}, ${math`C`} are mutually independent, so are ${math`A`}, ${math`B^{c}`}, ${math`C`}.`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

const claims: ProbabilityClaim[] = [
  { what: 'Mary with three coins against John with two: more heads', exact: MORE, trial: (rng) => { let m = 0; let j = 0; for (let i = 0; i < 3; i++) if (rng() < 0.5) m++; for (let i = 0; i < 2; i++) if (rng() < 0.5) j++; return m > j; } },
];

export const independence: TopicContent = {
  topicId: 'prob.independence',
  goal: t`Define mutual independence of several events, tell it apart from pairwise independence, and compute with independent events and their complements.`,
  lesson: [
    { kind: 'rule', text: t`Events ${math`A_{${1}}, \ldots, A_{n}`} are [[mutual-independence|mutually independent]] when for every subfamily ${math`A_{i_{${1}}}, \ldots, A_{i_{k}}`}, ${math`\mathbb{P}(A_{i_{${1}}} \cap \cdots \cap A_{i_{k}}) = \mathbb{P}(A_{i_{${1}}}) \cdots \mathbb{P}(A_{i_{k}})`}. For three events that is the three pairs and the triple.` },
    { kind: 'p', text: t`Checking the pairs is not enough. Toss two fair coins: "the first is a head", "the second is a head", and "they agree" each have probability ${q(1, 2)}, and each pair meets with probability ${q(1, 4)}, so they are [[pairwise-independence|pairwise independent]]. But all three happen with probability ${q(1, 4)}, not ${q(1, 8)}: any two decide the third.` },
    { kind: 'p', text: t`Mutual independence survives complements: if ${math`A`}, ${math`B`}, ${math`C`} are independent, so are ${math`A`}, ${math`B^{c}`}, ${math`C`}, since ${math`\mathbb{P}(A \cap B^{c} \cap C) = \mathbb{P}(A \cap C) - \mathbb{P}(A \cap B \cap C) = \mathbb{P}(A)(${1} - \mathbb{P}(B))\mathbb{P}(C)`}. So "none happens" has probability ${math`\prod (${1} - \mathbb{P}(A_{i}))`}.` },
    { kind: 'p', text: t`Independence is usually a modelling assumption: separate coins, separate dice. Example Sheet ${1} Q${11}: Mary tosses three coins and John two. Mary's third coin is independent of the other four, so Mary wins when her first two beat John's (probability ${BEAT}) or tie them (probability ${TIE}) and her third is a head: ${math`${BEAT} + ${TIE} \cdot ${q(1, 2)} = ${MORE}`}.` },
  ],
  examples: [
    workedCambridge(q11ind),
    worked(classifyThree, { ix: [0, 1, 2] }, t`Two coins' worth of events on dice`),
    worked(independentSystem, { ps: [q(1, 2), q(1, 3), q(1, 4)], kind: 'exactly-one' }, t`Exactly one of three`),
  ],
  generators: [classifyThree, independentSystem, withComplement],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['mutual-independence', 'pairwise-independence'],
  claims,
  cambridge: [q11proof, bernstein],
};
