/**
 * prob.independence: events A_1, ..., A_n are (mutually) independent when every
 * subfamily's intersection has probability the product of theirs; pairwise independence
 * is weaker. From IA Probability Example Sheet 1 Q11 (Mary's n + 1 coins against John's n:
 * the proof splits off Mary's last coin, which is independent of everything else) and the
 * Faculty schedule's "Independence". The sheet has no official solutions; every answer is
 * checked by listing the outcomes. Batch 7 adds Grinstead and Snell, Section 4.1, Exercises 8, 33
 * (with its printed odd answer), and 50.
 */
import type { Rng } from '@learnhub/mastery';
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { add, int, mul, pick, q, sample, str, sub, toFloat, type Rational } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { dmath, math, t, type Rich } from '../rich';
import { checkFrom, worked, workedCambridge, type ProbabilityClaim, type TopicContent } from '../topic';

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
  prompt: t`Mary tosses ${math`n + ${1}`} coins and John ${math`n`}. With ${math`W`}, ${math`T`}, ${math`H`} as in the three-coin case, prove that ${math`\mathbb{P}(\text{Mary gets more}) = \mathbb{P}(W) + \mathbb{P}(T)\mathbb{P}(H)`} and that ${math`\mathbb{P}(W) = (${1} - \mathbb{P}(T))/${2}`}, and deduce that the answer is ${q(1, 2)} for every ${math`n`}. State exactly which events are used as independent, and why they are.`,
  writeUp: 'proof',
  hints: [
    t`Which of ${math`W`}, ${math`T`}, and Mary's last coin make up "Mary gets more heads", and are those cases disjoint?`,
    t`Which coins does ${math`T`} depend on, and which coin does ${math`H`} depend on? Why does that make them independent?`,
    t`By symmetry between Mary's first ${math`n`} coins and John's ${math`n`}, how does ${math`\mathbb{P}(W)`} compare with the probability that John's coins show more, and what do the three cases add up to?`,
  ],
});
const bernstein = supervision({
  id: 'schedule-independence',
  source: cite('tripos-schedules', 'IA Probability, Axiomatic approach: "Independence"', true),
  title: t`Pairwise is not enough`,
  prompt: t`Define mutual independence of events ${math`A_{${1}}, \ldots, A_{n}`}. Toss two fair coins and let ${math`A`} be "the first is a head", ${math`B`} "the second is a head", ${math`C`} "they agree". Show that ${math`A`}, ${math`B`}, ${math`C`} are pairwise independent but not mutually independent. Then prove that if ${math`A`}, ${math`B`}, ${math`C`} are mutually independent, so are ${math`A`}, ${math`B^{c}`}, ${math`C`}.`,
  writeUp: 'proof',
  hints: [
    t`In mutual independence, for which collections of the events must the probability of the intersection be the product, and is it only pairs?`,
    t`With two fair coins, which of the four outcomes lie in ${math`A \cap B`}, ${math`A \cap C`}, ${math`B \cap C`}, and ${math`A \cap B \cap C`}?`,
    t`For the last part, how is ${math`\mathbb{P}(A \cap B^{c} \cap C)`} the difference of ${math`\mathbb{P}(A \cap C)`} and ${math`\mathbb{P}(A \cap B \cap C)`}, and does the same idea handle the pairs that contain ${math`B^{c}`}?`,
  ],
});

// ---------------------------------------------------------------- Cambridge problems: gates (batch 7)

/*
 * Outline for marking gs-4-1-50 (20 marks):
 * 1. For each of the 2^n choices of B_j in {A_j, complement of A_j}, the event B_1 n ... n B_n has
 *    probability P(B_1) ... P(B_n), since complements of independent events are independent (the
 *    lesson's theorem, applied once per complement) (6).
 * 2. Each factor is positive, as 0 < P(A_j) < 1; so each of the 2^n events is non-empty (5).
 * 3. Two different choices differ at some j: one lies in A_j and the other outside it, so the
 *    events are disjoint (5).
 * 4. Choosing one point from each gives 2^n different points of the sample space (4).
 */
const gs4150 = supervision({
  id: 'gs-4-1-50',
  source: cite('gs-ch4', 'Section 4.1, Exercise 50 (page 159)'),
  title: t`Independent events need room`,
  prompt: t`Prove that, if ${math`A_{${1}}, A_{${2}}, \ldots, A_{n}`} are independent events defined on a sample space ${math`\Omega`} and if ${math`${0} < \mathbb{P}(A_j) < ${1}`} for all ${math`j`}, then ${math`\Omega`} must have at least ${math`${2}^{n}`} points.`,
  writeUp: 'proof',
  hints: [
    t`In how many ways can each ${math`B_{j}`} be chosen as either ${math`A_{j}`} or its complement, for ${math`j = ${1}, \ldots, n`}?`,
    t`For each such choice, why does ${math`B_{${1}} \cap \cdots \cap B_{n}`} have positive probability, given independence and ${math`${0} < \mathbb{P}(A_{j}) < ${1}`}?`,
    t`Why are the intersections for two different choices disjoint, and what does picking one point from each give?`,
  ],
});

/*
 * Outline for marking gs-4-1-33 (20 marks):
 * 1. If A_1, A_2, A_3 are independent, so is any family with some events replaced by complements
 *    (the lesson's theorem, used up to three times); so all eight products hold (6).
 * 2. Conversely, the choice (A_1, A_2, A_3) gives the triple product (2).
 * 3. Pairs: P(A_1 n A_2) = P(A_1 n A_2 n A_3) + P(A_1 n A_2 n complement of A_3), which by two of the eight
 *    products is P(A_1)P(A_2)(P(A_3) + P(complement of A_3)) = P(A_1)P(A_2) (8).
 * 4. Likewise for the other two pairs; so all conditions of mutual independence hold (4).
 */
const gs4133 = supervision({
  id: 'gs-4-1-33',
  source: cite('gs-ch4', 'Section 4.1, Exercise 33 (page 155)'),
  title: t`Eight products for three events`,
  prompt: t`Let ${math`A_{${1}}, A_{${2}}, A_{${3}}`} be events, and let ${math`B_i`} represent either ${math`A_i`} or its complement ${math`A_i^{c}`}. Then there are eight possible choices for the triple ${math`(B_{${1}}, B_{${2}}, B_{${3}})`}. Prove that the events ${math`A_{${1}}, A_{${2}}, A_{${3}}`} are independent if and only if ${math`\mathbb{P}(B_{${1}} \cap B_{${2}} \cap B_{${3}}) = \mathbb{P}(B_{${1}})\,\mathbb{P}(B_{${2}})\,\mathbb{P}(B_{${3}})`} for all eight of the possible choices.`,
  writeUp: 'proof',
  official: cite('gs-answers-odd', 'Section 4.1, Exercise 33'),
  hints: [
    t`If ${math`A_{${1}}, A_{${2}}, A_{${3}}`} are independent, what is known about the family when one of them is replaced by its complement?`,
    t`Conversely, which one of the eight choices gives the condition on all three events at once?`,
    t`For a pair such as ${math`A_{${1}}, A_{${2}}`}, how does ${math`\mathbb{P}(A_{${1}} \cap A_{${2}})`} split according to ${math`A_{${3}}`} and its complement, and which two of the eight products then apply?`,
  ],
});

/** Grinstead and Snell 4.1.8: six outcomes with masses 1/8, 1/8, 3/16, 3/16, 3/16, 3/16. */
const MASS: Readonly<Record<string, Rational>> = { a: q(1, 8), b: q(1, 8), c: q(3, 16), d: q(3, 16), e: q(3, 16), f: q(3, 16) };
const EV8: Readonly<Record<'A' | 'B' | 'C', readonly string[]>> = { A: ['d', 'e', 'a'], B: ['c', 'e', 'a'], C: ['c', 'd', 'a'] };
const prob8 = (...evs: ('A' | 'B' | 'C')[]): Rational =>
  Object.keys(MASS).filter((w) => evs.every((e) => EV8[e].includes(w))).reduce((s, w) => add(s, MASS[w] as Rational), q(0));
const ROWS8: readonly { tex: string; evs: ('A' | 'B' | 'C')[] }[] = [
  { tex: 'A', evs: ['A'] }, { tex: 'B', evs: ['B'] }, { tex: 'C', evs: ['C'] },
  { tex: 'A \\cap B', evs: ['A', 'B'] }, { tex: 'A \\cap C', evs: ['A', 'C'] }, { tex: 'B \\cap C', evs: ['B', 'C'] },
  { tex: 'A \\cap B \\cap C', evs: ['A', 'B', 'C'] },
];

const gs418 = auto({
  id: 'gs-4-1-8',
  source: cite('gs-ch4', 'Section 4.1, Exercise 8 (page 151)', true),
  title: t`The triple product without the pairs`,
  prompt: t`Let ${math`\Omega = \{a, b, c, d, e, f\}`}, with ${math`m(a) = m(b) = \frac{${1}}{${8}}`} and ${math`m(c) = m(d) = m(e) = m(f) = \frac{${3}}{${16}}`}. Let ${math`A = \{d, e, a\}`}, ${math`B = \{c, e, a\}`}, ${math`C = \{c, d, a\}`}. Find each probability below. Then compare: ${math`\mathbb{P}(A \cap B \cap C) = \mathbb{P}(A)\mathbb{P}(B)\mathbb{P}(C)`}, but no two of these events are independent.`,
  answer: {
    kind: 'table', columns: [t`event`, t`probability`], cell: 'exact',
    rows: ROWS8.map(({ evs }) => [[math`\mathbb{P}(${evs.join(' \\cap ')})`], null]),
    expected: ROWS8.map(({ evs }) => str(prob8(...evs))),
  },
  solution: [
    t`Each of ${math`A, B, C`} holds ${math`a`} and two of ${math`c, d, e, f`}: ${math`\frac{${1}}{${8}} + \frac{${3}}{${16}} + \frac{${3}}{${16}} = ${prob8('A')}`}.`,
    t`Each pair shares ${math`a`} and one more letter, so its intersection has probability ${math`\frac{${1}}{${8}} + \frac{${3}}{${16}} = ${prob8('A', 'B')}`}, not ${math`${prob8('A')} \times ${prob8('B')} = ${mul(prob8('A'), prob8('B'))}`}: no pair is independent.`,
    t`All three share only ${math`a`}: ${math`\mathbb{P}(A \cap B \cap C) = ${prob8('A', 'B', 'C')} = \left(${prob8('A')}\right)^{${3}}`}, the product of the three.`,
    t`The triple product alone does not make events independent: every pair must multiply too.`,
  ],
  reference: ROWS8.map(({ evs }) => str(prob8(...evs))),
  verify: () => {
    const e = same('the masses add to 1', str(Object.values(MASS).reduce(add, q(0))), '1');
    if (e !== null) return e;
    const triple = same('the triple product', str(prob8('A', 'B', 'C')), str(mul(mul(prob8('A'), prob8('B')), prob8('C'))));
    if (triple !== null) return triple;
    const pairs = (['A', 'B', 'C'] as const).flatMap((x, i) => (['A', 'B', 'C'] as const).slice(i + 1).map((y) => str(prob8(x, y)) !== str(mul(prob8(x), prob8(y)))));
    return same('every pair dependent', pairs.every((b) => b), true);
  },
  nudge: t`Not quite. Listing the letters in each intersection before adding any masses avoids most slips.`,
  hints: [
    t`Which letters does each of ${math`A`}, ${math`B`}, ${math`C`} contain, and what are their masses?`,
    t`Which letters lie in each pairwise intersection, and which lie in all three events?`,
    t`For each pair, is the probability of the intersection equal to the product of the two probabilities?`,
  ],
});

// ---------------------------------------------------------------- lesson

const claims: ProbabilityClaim[] = [
  { what: 'Mary with three coins against John with two: more heads', exact: MORE, trial: (rng) => { let m = 0; let j = 0; for (let i = 0; i < 3; i++) if (rng() < 0.5) m++; for (let i = 0; i < 2; i++) if (rng() < 0.5) j++; return m > j; } },
  { what: 'two coins: first a head, second a head, and they agree, all at once', exact: q(1, 4), trial: (rng) => { const a = rng() < 0.5; const b = rng() < 0.5; return a && b && a === b; } },
];

const [mA, mB, mC, mn] = [math`A`, math`B`, math`C`, math`n`];
const half = q(1, 2);
const conditions = (n: number): number => 2 ** n - n - 1;

export const independence: TopicContent = {
  topicId: 'prob.independence',
  goal: t`Define mutual independence of several events, tell it apart from pairwise independence, and compute with independent events and their complements.`,
  objective: t`Define independence for several events, and tell it apart from independence of each pair.`,
  why: t`Almost every model assumes independent trials; next, independent random variables and their sums.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`Two coins, three events` },
    { kind: 'hook', text: t`Toss two fair coins. Let ${mA} be "the first is a head", ${mB} "the second is a head", and ${mC} "the two coins agree". Knowing whether ${mA} happened tells you nothing about ${mC}, and the same goes for any other pair. Yet if you know ${mA} and ${mB}, you know ${mC} for certain. Are these three events independent or not?` },
    { kind: 'narrative', text: t`For two events you already have a definition: ${mA} and ${mB} are independent when ${math`\mathbb{P}(A \cap B) = \mathbb{P}(A)\,\mathbb{P}(B)`}, the chance of both is the product of the chances. The puzzle shows that for three or more events there are two different things "independent" could mean, and they are not the same.` },

    { kind: 'section', title: t`The definitions` },
    { kind: 'definition', name: t`Mutual independence`, formal: t`Events ${math`A_{${1}}, \ldots, A_{n}`} are [[mutual-independence|mutually independent]] if for every choice of distinct indices ${math`i_{${1}} < \cdots < i_{k}`} with ${math`k \ge ${2}`}, ${dmath`\mathbb{P}(A_{i_{${1}}} \cap \cdots \cap A_{i_{k}}) = \mathbb{P}(A_{i_{${1}}}) \cdots \mathbb{P}(A_{i_{k}}).`}`, plain: t`Every subfamily multiplies: every pair, every triple, and so on up to all ${mn} together. For three events that is ${conditions(3)} equations: the three pairs and the triple.` },
    { kind: 'definition', name: t`Pairwise independence`, formal: t`Events ${math`A_{${1}}, \ldots, A_{n}`} are [[pairwise-independence|pairwise independent]] if ${math`\mathbb{P}(A_{i} \cap A_{j}) = \mathbb{P}(A_{i})\,\mathbb{P}(A_{j})`} for all ${math`i \ne j`}.`, plain: t`Only the pairs are required to multiply. For three events that is ${3} equations instead of ${conditions(3)}.` },
    { kind: 'p', text: t`Mutual independence includes the pair conditions, so mutually independent events are always pairwise independent. When people say "independent events" without qualification, they mean mutually independent.`, why: { q: t`How many equations does mutual independence need for ${mn} events?`, a: t`One for each subfamily of size at least ${2}: all ${math`${2}^{n}`} subsets, minus the ${mn} single events, minus the empty set, so ${math`${2}^{n} - n - ${1}`}. For ${math`n = ${4}`} that is ${conditions(4)}.` } },

    { kind: 'section', title: t`Pairwise is not enough` },
    { kind: 'narrative', text: t`Now settle the opening puzzle by listing outcomes. There are four equally likely outcomes, ${math`\Omega = \{HH, HT, TH, TT\}`}, each with probability ${q(1, 4)}.` },
    {
      kind: 'steps',
      steps: [
        { label: t`The single events`, text: t`${math`A = \{HH, HT\}`}, ${math`B = \{HH, TH\}`}, ${math`C = \{HH, TT\}`}. Each has two outcomes, so each has probability ${half}.` },
        { label: t`The pairs`, text: t`${math`A \cap B`}, ${math`A \cap C`}, and ${math`B \cap C`} are each ${math`\{HH\}`}, with probability ${q(1, 4)}.`, eq: [dmath`\mathbb{P}(A \cap B) = ${q(1, 4)} = ${half} \times ${half} = \mathbb{P}(A)\,\mathbb{P}(B),`], plain: t`and the same for the other two pairs. So the three events are pairwise independent.`, why: { q: t`Why is ${math`A \cap C = \{HH\}`}?`, a: t`${mA} needs the first coin to be a head; ${mC} needs the coins to agree. Both together force the second coin to be a head too, so the only outcome is ${math`HH`}.` } },
        { label: t`The triple`, text: t`${math`A \cap B \cap C = \{HH\}`} too, so`, eq: [dmath`\mathbb{P}(A \cap B \cap C) = ${q(1, 4)} \ne ${q(1, 8)} = \mathbb{P}(A)\,\mathbb{P}(B)\,\mathbb{P}(C).`], plain: t`The triple condition fails, so they are not mutually independent.` },
      ],
    },
    { kind: 'p', text: t`The picture to hold on to: any two of the events are unrelated, but the three together are tied by a rule (${mC} happens exactly when ${mA} and ${mB} agree). Pairwise checks cannot see a rule that involves three events at once.` },
    checkFrom(classifyThree, { ix: [0, 1, 3] }, t`Each pair multiplies (for example ${math`\mathbb{P}(A \cap C) = ${q(3, 36)} = ${half} \times ${q(1, 6)}`}), but two even dice cannot total ${7}, so ${math`\mathbb{P}(A \cap B \cap C) = ${0} \ne ${q(1, 24)}`}.`),

    { kind: 'section', title: t`Complements stay independent` },
    { kind: 'narrative', text: t`A question you will need constantly: if ${math`A_{${1}}, \ldots, A_{n}`} are independent, what is the chance that none of them happens? You would like to multiply ${math`${1} - \mathbb{P}(A_{i})`} over all ${math`i`}. That is legitimate, because of the following result.` },
    { kind: 'theorem', name: t`Complements`, statement: t`If ${math`A_{${1}}, A_{${2}}, \ldots, A_{n}`} are mutually independent, then so are ${math`A_{${1}}^{c}, A_{${2}}, \ldots, A_{n}`}.` },
    { kind: 'narrative', text: t`The idea in one line: the part of a set outside ${math`A_{${1}}`} is the whole set minus the part inside ${math`A_{${1}}`}, and both of those multiply.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`What must be checked`, text: t`Subfamilies not containing ${math`A_{${1}}^{c}`} are subfamilies of the original events, so they multiply. Take a subfamily containing ${math`A_{${1}}^{c}`}, and let ${math`I`} be the intersection of its other members (${math`I = \Omega`} if there are none).`, plain: t`For example, with the subfamily ${math`A_{${1}}^{c}, A_{${3}}, A_{${4}}`}, ${math`I = A_{${3}} \cap A_{${4}}`}.` },
        { label: t`Split ${math`I`} in two`, text: t`${math`I`} is the disjoint union of ${math`I \cap A_{${1}}`} and ${math`I \cap A_{${1}}^{c}`}, so`, eq: [dmath`\mathbb{P}(I \cap A_{${1}}^{c}) = \mathbb{P}(I) - \mathbb{P}(I \cap A_{${1}}).`], why: { q: t`Why may we subtract?`, a: t`Each outcome of ${math`I`} is either in ${math`A_{${1}}`} or not, never both, so the two pieces are disjoint and their probabilities add to ${math`\mathbb{P}(I)`}.` } },
        { label: t`Both terms multiply`, text: t`By mutual independence of the original events, ${math`\mathbb{P}(I)`} is the product of the probabilities of the members of ${math`I`}; call that product ${math`p`}. And ${math`\mathbb{P}(I \cap A_{${1}}) = p\,\mathbb{P}(A_{${1}})`}.`, plain: t`If ${math`I = \Omega`}, then ${math`p = ${1}`} and both statements still hold.` },
        { label: t`Factor`, text: t`Substitute and take out the common factor ${math`p`}:`, eq: [dmath`\mathbb{P}(I \cap A_{${1}}^{c}) = p - p\,\mathbb{P}(A_{${1}}) = p\,(${1} - \mathbb{P}(A_{${1}})) = p\,\mathbb{P}(A_{${1}}^{c}).`], plain: t`That is exactly the product condition for this subfamily, so every subfamily multiplies.` },
      ],
    },
    { kind: 'p', text: t`Apply the theorem once for each event, and you may complement any of them. In particular ${dmath`\mathbb{P}(\text{none of } A_{${1}}, \ldots, A_{n}) = \prod_{i = ${1}}^{n} (${1} - \mathbb{P}(A_{i})).`}` },
    checkFrom(independentSystem, { ps: [q(1, 2), q(2, 3), q(1, 4)], kind: 'none' }, t`The complements are independent too, so ${math`\left(${1} - ${half}\right)\left(${1} - ${q(2, 3)}\right)\left(${1} - ${q(1, 4)}\right) = ${q(1, 8)}`}.`),

    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`If every pair of events is independent, the events are independent.`, counterexample: t`The two coins: "first a head", "second a head", "they agree" are pairwise independent, but all three happen with probability ${q(1, 4)}, not ${q(1, 8)}.` },
    { kind: 'pitfall', claim: t`For three events it is enough to check ${math`\mathbb{P}(A \cap B \cap C) = \mathbb{P}(A)\,\mathbb{P}(B)\,\mathbb{P}(C)`}.`, counterexample: t`Let ${math`A = B`} be "a fair coin shows heads" and ${math`C = \varnothing`}. Both sides of the triple condition are ${0}, but ${math`\mathbb{P}(A \cap B) = ${half} \ne ${q(1, 4)}`}.` },
    { kind: 'pitfall', claim: t`Disjoint events are independent, since they have nothing to do with each other.`, counterexample: t`"Heads" and "tails" on one coin are disjoint, so ${math`\mathbb{P}(\text{both}) = ${0}`}, but the product is ${q(1, 4)}. Disjoint events with positive probability are as dependent as can be: one rules out the other.` },
    { kind: 'narrative', text: t`The Cambridge question, Example Sheet ${1} question ${11}, is a lovely use of independence. Mary tosses one more coin than John. Split off Mary's last coin: it is independent of all the others, and that is what makes the answer exactly ${half}.` },
    { kind: 'takeaway', text: t`Mutual independence means every subfamily multiplies, not just the pairs, and it survives replacing events by their complements.` },
  ],
  examples: [
    { ...workedCambridge(q11ind), examiner: t`The examiner looks for the events named precisely, and a sentence saying which coins make ${math`H`} independent of ${math`T`}.` },
    worked(classifyThree, { ix: [0, 1, 2] }, t`Two coins' worth of events on dice`),
    worked(independentSystem, { ps: [q(1, 2), q(1, 3), q(1, 4)], kind: 'exactly-one' }, t`Exactly one of three`),
  ],
  generators: [classifyThree, independentSystem, withComplement],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['mutual-independence', 'pairwise-independence'],
  claims,
  cambridge: withUses([q11proof, bernstein, gs4150, gs4133, gs418], {
    'ia-q11-by-independence': { sections: ['The definitions'], note: t`Splitting by the last coin with independent events` },
    'gs-4-1-50': { sections: ['The definitions'], note: t`Independent events need many outcomes` },
    'gs-4-1-33': { sections: ['The definitions', 'Complements stay independent'], note: t`Independence through all eight products` },
  }),
  // The sheet's question for general n, then Grinstead and Snell's counting of points (every choice of
  // events and complements has positive probability) and the eight products. The triple product
  // without the pairs is a computation, and the lesson's pitfall shows the idea, so it is practice.
  gate: ['ia-q11-by-independence', 'gs-4-1-50', 'gs-4-1-33'],
  recall: [
    { front: t`Define mutual independence of ${math`A_{${1}}, \ldots, A_{n}`}.`, back: t`For every subfamily of at least two of them, the probability of the intersection is the product of their probabilities.` },
    { front: t`Define pairwise independence.`, back: t`${math`\mathbb{P}(A_{i} \cap A_{j}) = \mathbb{P}(A_{i})\,\mathbb{P}(A_{j})`} for every pair ${math`i \ne j`}. It is weaker than mutual independence.` },
    { front: t`Give three events that are pairwise but not mutually independent.`, back: t`Two fair coins: first a head, second a head, the coins agree.` },
    { front: t`Complements of independent events.`, back: t`If ${math`A_{${1}}, \ldots, A_{n}`} are mutually independent, so are the events with any of them replaced by its complement.` },
  ],
  proofOrder: [{
    title: t`Complementing one of several independent events`,
    steps: [
      t`Take a subfamily containing ${math`A_{${1}}^{c}`}, and let ${math`I`} be the intersection of its other members.`,
      t`${math`I`} splits into the disjoint pieces ${math`I \cap A_{${1}}`} and ${math`I \cap A_{${1}}^{c}`}.`,
      t`So ${math`\mathbb{P}(I \cap A_{${1}}^{c}) = \mathbb{P}(I) - \mathbb{P}(I \cap A_{${1}})`}.`,
      t`By independence this is ${math`p - p\,\mathbb{P}(A_{${1}})`}, with ${math`p`} the product for ${math`I`}.`,
      t`Factor: ${math`p\,(${1} - \mathbb{P}(A_{${1}}))`}, the product the definition requires.`,
    ],
  }],
};
