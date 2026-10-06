/**
 * prob.subadditivity: P(∪ A_n) <= Σ P(A_n) for any countable family of events (the union
 * bound), proved by making the events disjoint. From IA Probability Example Sheet 1 Q6(b)
 * and (c): P(A_n infinitely often) <= Σ_(k >= n) P(A_k) for every n, so it is 0 when the
 * series converges (the first Borel-Cantelli lemma). Q6(a) and the first part of Q6(b) are
 * set in prob.event-spaces. The sheet has no official solutions.
 */
import type { Rng } from '@learnhub/mastery';
import { auto, cite, same, supervision } from '../cambridge';
import { int, pick, q, str, sub, type Rational } from '../math';
import { choose } from '../numbers';
import { generator, type Misconception } from '../problem';
import { listOf, math, t, type Rich, type Span } from '../rich';
import { worked, workedProof, type ProbabilityClaim, type TopicContent } from '../topic';

const S1 = 'ia-prob-sheet-1' as const;
const mn = math`n`;
const distinctFrom = (right: string, xs: readonly string[]): number => new Set(xs.filter((x) => x !== right)).size;

// ---------------------------------------------------------------- the tail bound of Q6(b)

interface Fam { tex: Span; tail: (n: number) => Rational; term: (k: number) => Rational; termF: (k: number) => number; why: Rich }
const FAMS: readonly Fam[] = [
  { tex: math`${2}^{-k}`, tail: (n) => q(1, 2 ** (n - 1)), term: (k) => q(1, 2 ** k), termF: (k) => 2 ** -k, why: t`a geometric series: ${math`\sum_{k \ge n} ${2}^{-k} = ${2}^{-(n - ${1})}`}` },
  { tex: math`\frac{${1}}{k(k + ${1})}`, tail: (n) => q(1, n), term: (k) => q(1, k * (k + 1)), termF: (k) => 1 / (k * (k + 1)), why: t`telescoping: ${math`\frac{${1}}{k} - \frac{${1}}{k + ${1}}`} summed from ${mn} leaves ${math`\frac{${1}}{n}`}` },
  { tex: math`${2} \cdot ${3}^{-k}`, tail: (n) => q(1, 3 ** (n - 1)), term: (k) => q(2, 3 ** k), termF: (k) => 2 * 3 ** -k, why: t`a geometric series: ${math`${2} \cdot \frac{${3}^{-n}}{${1} - ${1}/${3}} = ${3}^{-(n - ${1})}`}` },
  { tex: math`\frac{${2}}{k(k + ${1})(k + ${2})}`, tail: (n) => q(1, n * (n + 1)), term: (k) => q(2, k * (k + 1) * (k + 2)), termF: (k) => 2 / (k * (k + 1) * (k + 2)), why: t`telescoping: ${math`\frac{${1}}{k(k + ${1})} - \frac{${1}}{(k + ${1})(k + ${2})}`} summed from ${mn} leaves ${math`\frac{${1}}{n(n + ${1})}`}` },
];
interface TailP { f: number; n: number }

const tailBound = generator<TailP>({
  id: 'tail-bound',
  skill: 'Bound P(A_n infinitely often) by the tail sum Σ_(k >= n) P(A_k), as in Example Sheet 1 Q6(b).',
  params: (rng) => ({ f: int(rng, 0, FAMS.length - 1), n: int(rng, 2, 9) }),
  sane: ({ n }) => (n >= 2 ? null : 'out of range'),
  problem: ({ f, n }) => {
    const F = FAMS[f] as Fam;
    return {
      prompt: t`Events ${math`A_{${1}}, A_{${2}}, \ldots`} have ${math`\mathbb{P}(A_{k}) = ${F.tex}`}. By Q${6}(b), ${math`\mathbb{P}(A_{k} \text{ infinitely often}) \le \sum_{k \ge n} \mathbb{P}(A_{k})`} for every ${mn}. What bound does ${math`n = ${n}`} give?`,
      answer: { kind: 'exact', expected: str(F.tail(n)) },
      solution: [
        t`"Infinitely often" lies inside ${math`\bigcup_{k \ge ${n}} A_{k}`}, and countable subadditivity bounds that union by ${math`\sum_{k \ge ${n}} \mathbb{P}(A_{k})`}.`,
        t`The tail is ${F.why}: with ${math`n = ${n}`} it is ${F.tail(n)}. As ${mn} grows the bound tends to ${0}, so the probability of infinitely many ${math`A_{k}`} is ${0}.`,
      ],
    };
  },
  solve: ({ f, n }) => {
    // Add 200,000 terms numerically and recognise the fraction.
    const F = FAMS[f] as Fam;
    let x = 0;
    for (let k = n; k < n + 200000; k++) x += F.termF(k);
    for (let d = 1; d <= 7000; d++) { const m = Math.round(x * d); if (m > 0 && Math.abs(m / d - x) < 5e-5 * x) return str(q(m, d)); }
    return 'none';
  },
  misconceptions: ({ f, n }): Misconception[] => {
    const F = FAMS[f] as Fam;
    return [
      { response: str(F.term(n)), why: t`That is ${math`\mathbb{P}(A_{${n}})`} alone. The bound is the sum of the whole tail, from ${math`k = ${n}`} on.` },
      { response: str(F.tail(1)), why: t`That is the sum from ${math`k = ${1}`}. Q${6}(b) allows any starting point ${mn}; with ${math`n = ${n}`}, start there.` },
      { response: str(F.tail(n + 1)), why: t`Start the sum at ${math`k = ${n}`}, including ${math`\mathbb{P}(A_{${n}})`}.` },
    ];
  },
});

// ---------------------------------------------------------------- the disjoint pieces

interface PieceP { N: number; ds: readonly number[]; j: number }
const pieceCount = ({ N, ds, j }: PieceP): number => Array.from({ length: N }, (_, i) => i + 1).filter((x) => x % (ds[j] as number) === 0 && ds.slice(0, j).every((d) => x % d !== 0)).length;
const pieceMis = (p: PieceP): string[] => {
  const d = p.ds[p.j] as number;
  const own = Math.floor(p.N / d);
  const minusPairs = own - p.ds.slice(0, p.j).reduce((a, e) => a + Math.floor(p.N / (d * e)), 0);
  return [str(q(own, p.N)), str(q(minusPairs, p.N)), str(q(p.N - own, p.N))];
};

const disjointPiece = generator<PieceP>({
  id: 'disjoint-piece',
  skill: 'Make events disjoint as in the proof of subadditivity, B_j = A_j minus the earlier events, and find the probability of a piece.',
  params: (rng) => {
    for (;;) {
      const p: PieceP = { N: pick(rng, [30, 60, 120, 210, 420]), ds: pick(rng, [[2, 3, 5], [2, 3, 7], [3, 5, 7], [2, 5, 3]]), j: int(rng, 1, 2) };
      if (p.N % (p.ds as number[]).reduce((a, b) => a * b, 1) === 0 && distinctFrom(str(q(pieceCount(p), p.N)), pieceMis(p)) >= 2) return p;
    }
  },
  sane: ({ N, ds }) => (N % ds.reduce((a, b) => a * b, 1) === 0 ? null : 'out of range'),
  problem: (p) => {
    const { N, ds, j } = p;
    const c = pieceCount(p);
    const names = ds.map((d, i) => t`${math`A_{${i + 1}}`}, the multiples of ${d}`);
    return {
      prompt: t`A number is chosen at random from ${math`\{${1}, \ldots, ${N}\}`}. Let ${names[0] as Rich}; ${names[1] as Rich}; ${names[2] as Rich}. The proof of subadditivity uses ${math`B_{${1}} = A_{${1}}`} and ${math`B_{j} = A_{j} \setminus (A_{${1}} \cup \cdots \cup A_{j - ${1}})`}. Find ${math`\mathbb{P}(B_{${j + 1}})`}.`,
      answer: { kind: 'exact', expected: str(q(c, N)) },
      solution: [
        t`${math`B_{${j + 1}}`} is the multiples of ${ds[j] as number} that are not multiples of ${listOf(ds.slice(0, j))}. By inclusion-exclusion within ${math`A_{${j + 1}}`}, or by counting, there are ${c} of them.`,
        t`So ${math`\mathbb{P}(B_{${j + 1}}) = \frac{${c}}{${N}} = ${q(c, N)}`}, at most ${math`\mathbb{P}(A_{${j + 1}}) = ${q(Math.floor(N / (ds[j] as number)), N)}`}: each piece is inside its event, which is why ${math`\sum \mathbb{P}(B_{j}) \le \sum \mathbb{P}(A_{j})`}.`,
      ],
    };
  },
  solve: (p) => {
    // Remove earlier events from the j-th one, element by element.
    const xs = new Set(Array.from({ length: p.N }, (_, i) => i + 1).filter((x) => x % (p.ds[p.j] as number) === 0));
    for (const d of p.ds.slice(0, p.j)) for (const x of [...xs]) if (x % d === 0) xs.delete(x);
    return str(q(xs.size, p.N));
  },
  misconceptions: (p): Misconception[] => {
    const [a, b, c] = pieceMis(p);
    return [
      { response: a as string, why: t`That is ${math`\mathbb{P}(A_{${p.j + 1}})`}. The piece removes what the earlier events already cover.` },
      { response: b as string, why: t`Subtracting each overlap separately removes the numbers in both earlier events twice${p.j === 2 ? t`: add back the multiples of all three` : t``}. Or count directly.` },
      { response: c as string, why: t`That is the complement of ${math`A_{${p.j + 1}}`}.` },
    ];
  },
  trial: (p, rng: Rng) => { const x = 1 + Math.floor(rng() * p.N); return x % (p.ds[p.j] as number) === 0 && p.ds.slice(0, p.j).every((d) => x % d !== 0); },
});

// ---------------------------------------------------------------- the birthday bound

interface BdP { k: number; days: number }

const birthdayBound = generator<BdP>({
  id: 'birthday-bound',
  skill: 'Use the union bound over pairs: the chance that some two of k people share a birthday is at most C(k, 2) / 365.',
  params: (rng) => ({ k: int(rng, 3, 25), days: pick(rng, [365, 100, 52, 12, 30]) }),
  sane: ({ k, days }) => (k >= 3 && days >= 12 ? null : 'out of range'),
  problem: ({ k, days }) => ({
    prompt: t`Each of ${k} people has a birthday uniformly at random among ${days} days, independently. The union bound over the pairs of people gives an upper bound on the probability that some two share a birthday. What is it (before capping at ${1})?`,
    answer: { kind: 'exact', expected: str(q(choose(k, 2), days)) },
    solution: [
      t`Let ${math`A_{ij}`} be "${math`i`} and ${math`j`} share a birthday", with ${math`\mathbb{P}(A_{ij}) = \frac{${1}}{${days}}`}. "Some two share" is the union of the ${math`\binom{${k}}{${2}} = ${choose(k, 2)}`} events ${math`A_{ij}`}.`,
      t`Subadditivity: ${math`\mathbb{P}\left(\bigcup A_{ij}\right) \le ${choose(k, 2)} \times \frac{${1}}{${days}} = ${q(choose(k, 2), days)}`}${choose(k, 2) >= days ? t`, which exceeds ${1}, so here it says nothing` : t``}. The events overlap, so the true probability is smaller.`,
    ],
  }),
  solve: ({ k, days }) => {
    // Sum P(A_ij) over every pair (i, j) with i < j.
    let s = 0;
    for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) s++;
    return str(q(s, days));
  },
  misconceptions: ({ k, days }): Misconception[] => [
    { response: str(q(k, days)), why: t`The events are about pairs of people, and there are ${math`\binom{${k}}{${2}}`} pairs, not ${k}.` },
    { response: str(q(k * k, days)), why: t`Count unordered pairs of different people: ${math`\binom{${k}}{${2}} = ${choose(k, 2)}`}, not ${math`${k}^{${2}}`}.` },
    { response: str(q(k * (k - 1), days)), why: t`Each pair is counted twice that way: ${math`i, j`} and ${math`j, i`} are the same event.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const q6bc = workedProof({
  title: t`The first Borel-Cantelli lemma`,
  prompt: t`Example Sheet ${1}, Q${6}(b) and (c): with ${math`A = \{\omega : \omega \in A_{n} \text{ infinitely often}\}`}, show that ${math`\mathbb{P}(A) \le \sum_{k = n}^{\infty} \mathbb{P}(A_{k})`} for all ${mn}, and that ${math`\mathbb{P}(A) = ${0}`} if ${math`\sum_{n} \mathbb{P}(A_{n})`} converges.`,
  steps: [
    t`${math`A = \bigcap_{n} \bigcup_{k \ge n} A_{k}`} (Q${6}(a)): an outcome is in infinitely many ${math`A_{k}`} exactly when, for every ${mn}, it is in some ${math`A_{k}`} with ${math`k \ge n`}. So ${math`A \subseteq \bigcup_{k \ge n} A_{k}`} for each ${mn}.`,
    t`By monotonicity and countable subadditivity, ${math`\mathbb{P}(A) \le \mathbb{P}\left(\bigcup_{k \ge n} A_{k}\right) \le \sum_{k \ge n} \mathbb{P}(A_{k})`}.`,
    t`If ${math`\sum_{n} \mathbb{P}(A_{n})`} converges, its tails ${math`\sum_{k \ge n} \mathbb{P}(A_{k})`} tend to ${0} as ${math`n \to \infty`}. ${math`\mathbb{P}(A)`} is at most every one of them, and at least ${0}, so ${math`\mathbb{P}(A) = ${0}`}.`,
  ],
  answer: t`${math`\mathbb{P}(A) \le \sum_{k \ge n} \mathbb{P}(A_{k})`} for every ${mn}, and ${math`\mathbb{P}(A) = ${0}`} when the series converges.`,
  source: cite(S1, 'Q6(b), (c)'),
});

const N6 = 5;
const q6num = auto({
  id: 'ia-q6-numbers',
  source: cite(S1, 'Q6(b), (c)', true),
  title: t`The bound with numbers`,
  prompt: t`Events have ${math`\mathbb{P}(A_{k}) = ${2}^{-k}`}. What bound on ${math`\mathbb{P}(A_{k} \text{ infinitely often})`} does Q${6}(b) give with ${math`n = ${N6}`}, and what is that probability, by Q${6}(c)?`,
  answer: { kind: 'table', cell: 'exact', columns: [t`quantity`, t`value`], rows: [[t`the bound for ${math`n = ${N6}`}`, null], [t`${math`\mathbb{P}(A_{k} \text{ infinitely often})`}`, null]], expected: [str(q(1, 2 ** (N6 - 1))), '0'] },
  solution: [t`${math`\sum_{k \ge ${N6}} ${2}^{-k} = ${2}^{-${N6 - 1}} = ${q(1, 2 ** (N6 - 1))}`}. The series converges, so every tail bounds the probability and the tails tend to ${0}: the probability is ${0}.`],
  reference: [str(q(1, 2 ** (N6 - 1))), '0'],
  verify: () => { let x = 0; for (let k = N6; k < N6 + 60; k++) x += 2 ** -k; return same('the tail by partial sums', x.toFixed(12), (1 / 2 ** (N6 - 1)).toFixed(12)); },
  misconceptions: [{ response: [str(q(1, 2 ** N6)), '0'], why: t`${math`${2}^{-${N6}}`} is only the first term of the tail; add all the terms from ${math`k = ${N6}`}.` }],
});

const subaddProof = supervision({
  id: 'ia-q6-subadditivity',
  source: cite(S1, 'Q6(b)', true),
  title: t`Countable subadditivity from the axioms`,
  prompt: t`Q${6}(b) needs ${math`\mathbb{P}\left(\bigcup_{k} A_{k}\right) \le \sum_{k} \mathbb{P}(A_{k})`} for any events. Prove it from the axioms: define ${math`B_{${1}} = A_{${1}}`} and ${math`B_{k} = A_{k} \setminus (A_{${1}} \cup \cdots \cup A_{k - ${1}})`}, show the ${math`B_{k}`} are disjoint events with the same union as the ${math`A_{k}`}, and use countable additivity and monotonicity.`,
  writeUp: 'proof',
});
const converse = supervision({
  id: 'ia-q6-c-converse',
  source: cite(S1, 'Q6(c)', true),
  title: t`The converse fails`,
  prompt: t`Q${6}(c) says a convergent series ${math`\sum \mathbb{P}(A_{n})`} forces ${math`\mathbb{P}(A_{n} \text{ i.o.}) = ${0}`}. Show the converse is false: give events with ${math`\sum \mathbb{P}(A_{n}) = \infty`} but ${math`\mathbb{P}(A_{n} \text{ i.o.}) = ${0}`} (for example, nested events of probability ${math`${1}/n`}). What extra assumption does the second Borel-Cantelli lemma add?`,
  writeUp: 'explanation',
});

// ---------------------------------------------------------------- lesson

const claims: ProbabilityClaim[] = [
  { what: 'a number from 1 to 30: a multiple of 5 that is not a multiple of 2 or 3', exact: q(2, 30), trial: (rng) => { const x = 1 + Math.floor(rng() * 30); return x % 5 === 0 && x % 2 !== 0 && x % 3 !== 0; } },
];

export const subadditivity: TopicContent = {
  topicId: 'prob.subadditivity',
  goal: t`Prove countable subadditivity, ${math`\mathbb{P}\left(\bigcup A_{n}\right) \le \sum \mathbb{P}(A_{n})`}, and use it to bound probabilities of unions, including the first Borel-Cantelli lemma.`,
  lesson: [
    { kind: 'rule', text: t`Countable subadditivity, the [[union-bound|union bound]]: for any events ${math`A_{${1}}, A_{${2}}, \ldots`}, ${math`\mathbb{P}\left(\bigcup_{n} A_{n}\right) \le \sum_{n} \mathbb{P}(A_{n})`}, whether or not they are disjoint.` },
    { kind: 'p', text: t`Proof: replace the events by disjoint pieces, ${math`B_{n} = A_{n} \setminus (A_{${1}} \cup \cdots \cup A_{n - ${1}})`}. They have the same union, so ${math`\mathbb{P}(\bigcup A_{n}) = \sum \mathbb{P}(B_{n})`} by countable additivity, and ${math`B_{n} \subseteq A_{n}`} gives ${math`\mathbb{P}(B_{n}) \le \mathbb{P}(A_{n})`} by monotonicity.` },
    { kind: 'p', text: t`The bound is crude but needs no information about overlaps. For ${23} people and ${365} days, some pair shares a birthday with probability at most ${math`\binom{${23}}{${2}}/${365} = ${q(choose(23, 2), 365)}`}: the bound is useless here, since the true value is about one half. For ${10} people it gives ${q(choose(10, 2), 365)}, close to the truth.` },
    { kind: 'p', text: t`Its most important use is Example Sheet ${1} Q${6}: the event "${math`A_{n}`} infinitely often" lies inside ${math`\bigcup_{k \ge n} A_{k}`} for every ${mn}, so its probability is at most the tail ${math`\sum_{k \ge n} \mathbb{P}(A_{k})`}. If the series converges, the tails tend to ${0}, and only finitely many of the ${math`A_{n}`} happen, with probability ${1}.` },
  ],
  examples: [
    q6bc,
    worked(tailBound, { f: 1, n: 4 }, t`A telescoping tail`),
    worked(disjointPiece, { N: 30, ds: [2, 3, 5], j: 2 }, t`The third disjoint piece`),
  ],
  generators: [tailBound, disjointPiece, birthdayBound],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['union-bound'],
  claims,
  cambridge: [q6num, subaddProof, converse],
};
