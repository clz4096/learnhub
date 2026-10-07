/**
 * prob.subadditivity: P(∪ A_n) <= Σ P(A_n) for any countable family of events (the union
 * bound), proved by making the events disjoint. From IA Probability Example Sheet 1 Q6(b)
 * and (c): P(A_n infinitely often) <= Σ_(k >= n) P(A_k) for every n, so it is 0 when the
 * series converges (the first Borel-Cantelli lemma). Q6(a) and the first part of Q6(b) are
 * set in prob.event-spaces. The sheet has no official solutions.
 */
import type { Rng } from '@learnhub/mastery';
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { int, pick, q, str, sub, type Rational } from '../math';
import { choose } from '../numbers';
import { generator, type Misconception } from '../problem';
import { dmath, listOf, math, t, type Rich, type Span } from '../rich';
import { checkFrom, worked, workedProof, type ProbabilityClaim, type TopicContent } from '../topic';

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

/** P(some two of k people share a birthday among d days), exactly. */
const shareExact = (k: number, d: number): number => { let p = 1; for (let i = 0; i < k; i++) p *= (d - i) / d; return 1 - p; };
const BD = { small: 10, big: 23, days: 365 };
const round3 = (x: number): number => Number(x.toFixed(3));
const claims: ProbabilityClaim[] = [
  { what: 'a number from 1 to 30: a multiple of 5 that is not a multiple of 2 or 3', exact: q(2, 30), trial: (rng) => { const x = 1 + Math.floor(rng() * 30); return x % 5 === 0 && x % 2 !== 0 && x % 3 !== 0; } },
];
const [mA, mB] = [math`A_{n}`, math`B_{n}`];

export const subadditivity: TopicContent = {
  topicId: 'prob.subadditivity',
  goal: t`Prove countable subadditivity, ${math`\mathbb{P}\left(\bigcup A_{n}\right) \le \sum \mathbb{P}(A_{n})`}, and use it to bound probabilities of unions, including the first Borel-Cantelli lemma.`,
  objective: t`Prove the union bound from the axioms and use it to bound probabilities of unions.`,
  why: t`It bounds "something goes wrong" without knowing overlaps, and gives the first Borel-Cantelli lemma.`,
  minutes: 30,
  lesson: [
    { kind: 'section', title: t`A bound without the overlaps` },
    { kind: 'hook', text: t`In a room of ${BD.small} people, what is the chance that some two share a birthday? There are ${choose(BD.small, 2)} pairs, each sharing with probability ${q(1, BD.days)}. Adding gives ${q(choose(BD.small, 2), BD.days)}. That cannot be exactly right, because the pairs overlap. But is it at least a safe upper bound?` },
    { kind: 'narrative', text: t`Adding probabilities of events that overlap counts the overlaps more than once. So the sum can only be too big, never too small. That simple idea is countable subadditivity, and it works even for infinitely many events, when inclusion-exclusion is hopeless.` },
    { kind: 'section', title: t`The theorem` },
    {
      kind: 'theorem',
      name: t`Countable subadditivity`,
      statement: t`For any events ${math`A_{${1}}, A_{${2}}, \ldots`} in a probability space, ${dmath`\mathbb{P}\Big(\bigcup_{n} A_{n}\Big) \le \sum_{n} \mathbb{P}(A_{n}).`}`,
    },
    { kind: 'p', text: t`This is the [[union-bound|union bound]]. The only tools are the axioms: countable additivity (for disjoint events, the probability of the union is the sum) and monotonicity (if ${math`B \subseteq A`} then ${math`\mathbb{P}(B) \le \mathbb{P}(A)`}). The trick is to make the events disjoint without changing their union.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Make them disjoint`, text: t`Let ${math`B_{${1}} = A_{${1}}`} and ${math`B_{n} = A_{n} \setminus (A_{${1}} \cup \cdots \cup A_{n - ${1}})`} for ${math`n \ge ${2}`}. Each ${mB} is an event, since events are closed under unions, complements and intersections.`, plain: t`${mB} keeps the part of ${mA} that no earlier event has already covered.` },
        { label: t`They are disjoint`, text: t`If ${math`m < n`}, then ${math`B_{m} \subseteq A_{m}`} and ${mB} contains nothing in ${math`A_{m}`}, so ${math`B_{m} \cap B_{n} = \varnothing`}.` },
        { label: t`Same union`, text: t`${math`\bigcup B_{n} \subseteq \bigcup A_{n}`} since each ${math`B_{n} \subseteq A_{n}`}. Conversely, an outcome in some ${mA} has a first ${mn} with it in ${mA}, and then it is in ${mB}.`, why: { q: t`Why does a first such ${mn} exist?`, a: t`The set of ${mn} with the outcome in ${mA} is a non-empty set of positive integers, and every such set has a smallest element.` } },
        { label: t`Add and compare`, text: t`By countable additivity, then monotonicity (${math`B_{n} \subseteq A_{n}`}),`, eq: [dmath`\mathbb{P}\Big(\bigcup A_{n}\Big) = \mathbb{P}\Big(\bigcup B_{n}\Big) = \sum \mathbb{P}(B_{n}) \le \sum \mathbb{P}(A_{n}).`] },
      ],
    },
    checkFrom(disjointPiece, { N: 60, ds: [2, 3, 5], j: 1 }, t`${math`B_{${2}}`} is the multiples of ${3} that are not even: ${3}, ${9}, ${15}, and so on, ${10} of the ${60} numbers, so ${q(10, 60)}.`),
    { kind: 'section', title: t`How good is the bound?` },
    { kind: 'narrative', text: t`The bound is exact for disjoint events and loose when they overlap a lot. Back to birthdays, with ${math`A_{ij}`} the event that persons ${math`i`} and ${math`j`} share.` },
    {
      kind: 'table',
      caption: t`The union bound against the exact chance that some two share a birthday, ${BD.days} days.`,
      head: [t`people`, t`union bound`, t`exact`],
      rows: [BD.small, BD.big].map((k) => [t`${k}`, t`${round3(choose(k, 2) / BD.days)}`, t`${round3(shareExact(k, BD.days))}`]),
    },
    { kind: 'p', text: t`With ${BD.small} people the pairs rarely overlap and the bound is close. With ${BD.big} it is far too big: the true value is about a half.` },
    checkFrom(birthdayBound, { k: 6, days: 365 }, t`There are ${math`\binom{${6}}{${2}} = ${15}`} pairs, each with probability ${q(1, 365)}: ${q(15, 365)}.`),
    { kind: 'pitfall', claim: t`${math`\mathbb{P}(A \cup B) = \mathbb{P}(A) + \mathbb{P}(B)`} for any events.`, counterexample: t`For one fair die, ${math`A = \{${2}, ${4}, ${6}\}`} and ${math`B = \{${4}, ${5}, ${6}\}`}: the sum is ${1}, but ${math`A \cup B = \{${2}, ${4}, ${5}, ${6}\}`} has probability ${q(2, 3)}. Equality needs disjoint events; in general only "at most" holds.` },
    { kind: 'section', title: t`Infinitely often` },
    {
      kind: 'definition',
      name: t`Infinitely often`,
      formal: t`For events ${math`A_{${1}}, A_{${2}}, \ldots`}, ${dmath`\{A_{n} \text{ infinitely often}\} = \bigcap_{n \ge ${1}} \bigcup_{k \ge n} A_{k}.`}`,
      plain: t`In plain words: the outcomes that lie in infinitely many of the events. Reading the formula: for every ${mn}, the outcome is in some ${math`A_{k}`} with ${math`k \ge n`}, so however far you go, another one happens later.`,
    },
    { kind: 'narrative', text: t`For each ${mn}, this event sits inside ${math`\bigcup_{k \ge n} A_{k}`}, so the union bound gives ${math`\mathbb{P}(A_{n} \text{ i.o.}) \le \sum_{k \ge n} \mathbb{P}(A_{k})`}. If the series converges, its tails tend to ${0}, and so does the bound.` },
    { kind: 'theorem', name: t`First Borel-Cantelli lemma`, statement: t`If ${math`\sum_{n} \mathbb{P}(A_{n}) < \infty`}, then ${math`\mathbb{P}(A_{n} \text{ infinitely often}) = ${0}`}.` },
    { kind: 'p', text: t`The proof is IA Probability Sheet ${1}, question ${6}, worked below. In words: if the probabilities add up to something finite, then with probability ${1} only finitely many of the events happen.` },
    checkFrom(tailBound, { f: 0, n: 3 }, t`${math`\sum_{k \ge ${3}} ${2}^{-k} = \frac{${1}}{${8}} + \frac{${1}}{${16}} + \cdots = \frac{${1}}{${4}}`}, a geometric series.`),
    { kind: 'takeaway', text: t`Make the events disjoint without changing the union, and the axioms give ${math`\mathbb{P}(\bigcup A_{n}) \le \sum \mathbb{P}(A_{n})`}; summable probabilities mean only finitely many events happen.` },
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
  cambridge: withUses([q6num, subaddProof, converse], {
    'ia-q6-subadditivity': { sections: ['The theorem'], note: t`Countable subadditivity from disjoint pieces` },
    'ia-q6-c-converse': { sections: ['Infinitely often'], note: t`A divergent sum without infinitely many occurrences` },
  }),
  // Best first: the proof from the axioms, then the converse (a construction and the extra
  // assumption). The numerical tail is a geometric series, too slight to gate.
  gate: ['ia-q6-subadditivity', 'ia-q6-c-converse'],
  recall: [
    { front: t`State countable subadditivity.`, back: t`${math`\mathbb{P}(\bigcup A_{n}) \le \sum \mathbb{P}(A_{n})`} for any events.` },
    { front: t`What are the disjoint pieces in its proof?`, back: t`${math`B_{n} = A_{n} \setminus (A_{${1}} \cup \cdots \cup A_{n - ${1}})`}: same union, each inside ${mA}.` },
    { front: t`State the first Borel-Cantelli lemma.`, back: t`If ${math`\sum \mathbb{P}(A_{n}) < \infty`}, then ${math`\mathbb{P}(A_{n} \text{ i.o.}) = ${0}`}.` },
  ],
  proofOrder: [
    {
      title: t`Countable subadditivity`,
      steps: [
        t`Let ${math`B_{n} = A_{n} \setminus (A_{${1}} \cup \cdots \cup A_{n - ${1}})`}.`,
        t`The ${mB} are disjoint and have the same union as the ${mA}.`,
        t`Countable additivity: ${math`\mathbb{P}(\bigcup A_{n}) = \sum \mathbb{P}(B_{n})`}.`,
        t`Monotonicity: ${math`\mathbb{P}(B_{n}) \le \mathbb{P}(A_{n})`}, so the sum is at most ${math`\sum \mathbb{P}(A_{n})`}.`,
      ],
    },
  ],
};
