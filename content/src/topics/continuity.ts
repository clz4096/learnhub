/**
 * prob.continuity: for increasing events, P(A_n) tends to the probability of their union;
 * for decreasing events, to the probability of their intersection. From IA Probability
 * Example Sheet 1 Q4(f) (prove it from the axioms) and Q6 (the events "A_n infinitely
 * often" and "A_n eventually", which are limits of monotone sequences). The sheet has no
 * official solutions; the numerical answers are checked by exact sums and by simulation.
 */
import type { Rng } from '@learnhub/mastery';
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { add, int, mul, pick, q, str, sub, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { math, t, type Rich } from '../rich';
import { checkFrom, worked, workedProof, type ProbabilityClaim, type TopicContent } from '../topic';

const S1 = 'ia-prob-sheet-1' as const;
const [mA, mn] = [math`A`, math`n`];
const R = [q(1, 2), q(1, 3), q(2, 3), q(1, 4), q(3, 4), q(2, 5)];
const pow = (r: Rational, e: number): Rational => { let out = q(1); for (let i = 0; i < e; i++) out = mul(out, r); return out; };
const geo = (r: Rational, rng: Rng): number => { let k = 1; while (rng() < Number(r.num) / Number(r.den)) k++; return k; };
const distinctFrom = (right: string, xs: readonly string[]): number => new Set(xs.filter((x) => x !== right)).size;
/** Exact P(X in S) for X geometric on {1, 2, ...}, summing 4000 terms numerically and checking against the closed form. */
const numeric = (r: Rational, f: (k: number) => boolean): number => { const x = Number(r.num) / Number(r.den); let s = 0; for (let k = 1; k < 4000; k++) if (f(k)) s += (1 - x) * x ** (k - 1); return s; };
const geoIntro = (r: Rational): Rich => t`A coin shows heads with probability ${sub(q(1), r)} on each toss, independently, and ${math`X`} is the number of tosses up to and including the first head, so ${math`\mathbb{P}(X = k) = ${sub(q(1), r)} \cdot \left(${r}\right)^{k - ${1}}`}.`;

// ---------------------------------------------------------------- the limit of an increasing sequence

type IncKind = 'even' | 'odd' | 'three';
interface IncP { r: Rational; kind: IncKind }
const incVal = ({ r, kind }: IncP): Rational => (kind === 'even' ? q(r.num, r.num + r.den) : kind === 'odd' ? q(r.den, r.num + r.den) : q(r.num * r.num, r.num * r.num + r.num * r.den + r.den * r.den));
const incF = (kind: IncKind) => (k: number): boolean => (kind === 'even' ? k % 2 === 0 : kind === 'odd' ? k % 2 === 1 : k % 3 === 0);
const incMis = (p: IncP): string[] => [p.kind === 'three' ? '1/3' : '1/2', '1', str(p.kind === 'even' ? mul(sub(q(1), p.r), p.r) : p.kind === 'odd' ? sub(q(1), p.r) : mul(sub(q(1), p.r), mul(p.r, p.r)))];

const increasingLimit = generator<IncP>({
  id: 'increasing-limit',
  skill: 'Find lim P(A_n) for increasing events as the probability of their union, by continuity.',
  params: (rng) => {
    for (;;) {
      const p: IncP = { r: pick(rng, R), kind: pick(rng, ['even', 'odd', 'three'] as const) };
      if (distinctFrom(str(incVal(p)), incMis(p)) >= 2) return p;
    }
  },
  sane: () => null,
  problem: (p) => {
    const { r, kind } = p;
    const An = kind === 'even' ? math`A_{n} = \{X \le ${2}n,\ X \text{ even}\}` : kind === 'odd' ? math`A_{n} = \{X \le ${2}n,\ X \text{ odd}\}` : math`A_{n} = \{X \le ${3}n,\ ${3} \mid X\}`;
    const U = kind === 'even' ? t`${math`X`} is even` : kind === 'odd' ? t`${math`X`} is odd` : t`${math`X`} is a multiple of ${3}`;
    return {
      prompt: t`${geoIntro(r)} Let ${An}. Find ${math`\lim_{n \to \infty} \mathbb{P}(A_{n})`}.`,
      answer: { kind: 'exact', expected: str(incVal(p)) },
      solution: [
        t`${math`A_{${1}} \subseteq A_{${2}} \subseteq \cdots`}, and their union is the event that ${U}. By continuity, ${math`\mathbb{P}(A_{n}) \to \mathbb{P}\left(\bigcup_{n} A_{n}\right)`}.`,
        t`That probability is a geometric series: ${incVal(p)}${kind === 'even' ? t`, which is ${math`\frac{r}{${1} + r}`} with ${math`r = ${r}`}` : kind === 'odd' ? t`, which is ${math`\frac{${1}}{${1} + r}`} with ${math`r = ${r}`}` : t`, which is ${math`\frac{r^{${2}}}{${1} + r + r^{${2}}}`} with ${math`r = ${r}`}`}.`,
      ],
    };
  },
  solve: ({ r, kind }) => {
    const s = numeric(r, incF(kind));
    for (let d = 1; d <= 400; d++) { const n = Math.round(s * d); if (Math.abs(n / d - s) < 1e-9) return str(q(n, d)); }
    return 'none';
  },
  misconceptions: (p): Misconception[] => [
    { response: p.kind === 'three' ? '1/3' : '1/2', why: t`The values of ${math`X`} are not equally likely: ${math`X = ${1}`} alone has probability ${sub(q(1), p.r)}. Add the masses.` },
    { response: '1', why: t`The union of increasing events is not always the whole space: here it is the event that ${p.kind === 'even' ? t`${math`X`} is even` : p.kind === 'odd' ? t`${math`X`} is odd` : t`${math`X`} is a multiple of ${3}`}.` },
    { response: incMis(p)[2] as string, why: t`That is ${math`\mathbb{P}(A_{${1}})`}. The limit is the probability of the union of all the ${math`A_{n}`}.` },
  ],
  trial: ({ r, kind }, rng) => incF(kind)(geo(r, rng)),
});

// ---------------------------------------------------------------- the limit of a decreasing sequence

type DecKind = 'odd-or-late' | 'even-or-late';
interface DecP { r: Rational; kind: DecKind }
const decVal = ({ r, kind }: DecP): Rational => (kind === 'odd-or-late' ? q(r.den, r.num + r.den) : q(r.num, r.num + r.den));

const decreasingLimit = generator<DecP>({
  id: 'decreasing-limit',
  skill: 'Find lim P(B_n) for decreasing events as the probability of their intersection, by continuity from above.',
  params: (rng) => ({ r: pick(rng, R), kind: pick(rng, ['odd-or-late', 'even-or-late'] as const) }),
  sane: () => null,
  problem: (p) => {
    const Bn = p.kind === 'odd-or-late' ? math`B_{n} = \{X \text{ odd}\} \cup \{X > n\}` : math`B_{n} = \{X \text{ even}\} \cup \{X > n\}`;
    return {
      prompt: t`${geoIntro(p.r)} Let ${Bn}. Find ${math`\lim_{n \to \infty} \mathbb{P}(B_{n})`}.`,
      answer: { kind: 'exact', expected: str(decVal(p)) },
      solution: [
        t`${math`B_{${1}} \supseteq B_{${2}} \supseteq \cdots`}: as ${mn} grows, ${math`\{X > n\}`} shrinks. An outcome is in every ${math`B_{n}`} exactly when ${math`X`} is ${p.kind === 'odd-or-late' ? 'odd' : 'even'}, since ${math`X`} is finite.`,
        t`By continuity from above, ${math`\mathbb{P}(B_{n}) \to \mathbb{P}\left(\bigcap_{n} B_{n}\right) = \mathbb{P}(X \text{ ${p.kind === 'odd-or-late' ? 'odd' : 'even'}}) = ${decVal(p)}`}.`,
      ],
    };
  },
  solve: ({ r, kind }) => {
    const s = numeric(r, (k) => (kind === 'odd-or-late' ? k % 2 === 1 : k % 2 === 0));
    for (let d = 1; d <= 400; d++) { const n = Math.round(s * d); if (Math.abs(n / d - s) < 1e-9) return str(q(n, d)); }
    return 'none';
  },
  misconceptions: (p): Misconception[] => [
    { response: '0', why: t`Decreasing events need not shrink to nothing: the outcomes with ${math`X`} ${p.kind === 'odd-or-late' ? 'odd' : 'even'} stay in every ${math`B_{n}`}.` },
    { response: '1', why: t`${math`\mathbb{P}(B_{${1}})`} may be close to ${1}, but the events shrink. Find their intersection.` },
    { response: '1/2', why: t`Odd and even values of ${math`X`} are not equally likely. Add the masses.` },
  ],
  trial: ({ r, kind }, rng) => { const k = geo(r, rng); return kind === 'odd-or-late' ? k % 2 === 1 : k % 2 === 0; },
});

// ---------------------------------------------------------------- a term of the sequence

interface StepP { r: Rational; n: number }
const stepVal = ({ r, n }: StepP): Rational => mul(q(r.num, r.num + r.den), sub(q(1), pow(r, 2 * n)));

const finiteStep = generator<StepP>({
  id: 'finite-step',
  skill: 'Compute P(A_n) for one member of an increasing sequence of events, and see it approach the limit.',
  params: (rng) => ({ r: pick(rng, R), n: int(rng, 1, 4) }),
  sane: ({ n }) => (n >= 1 ? null : 'out of range'),
  problem: (p) => {
    const { r, n } = p;
    return {
      prompt: t`${geoIntro(r)} Let ${math`A_{n} = \{X \le ${2}n,\ X \text{ even}\}`}. Find ${math`\mathbb{P}(A_{${n}})`}.`,
      answer: { kind: 'exact', expected: str(stepVal(p)) },
      solution: [
        t`${math`\mathbb{P}(A_{${n}}) = \sum_{j = ${1}}^{${n}} \mathbb{P}(X = ${2}j) = ${sub(q(1), r)} \left(r + r^{${3}} + \cdots + r^{${2 * n - 1}}\right)`} with ${math`r = ${r}`}, a finite geometric series.`,
        t`It equals ${math`\frac{r}{${1} + r}\left(${1} - r^{${2 * n}}\right) = ${stepVal(p)}`}. As ${mn} grows it increases to ${math`\frac{r}{${1} + r} = ${q(r.num, r.num + r.den)}`}, the probability that ${math`X`} is even.`,
      ],
    };
  },
  solve: ({ r, n }) => {
    // Add the masses of the even outcomes up to 2n one by one.
    let s = q(0);
    for (let j = 1; j <= n; j++) s = add(s, mul(sub(q(1), r), pow(r, 2 * j - 1)));
    return str(s);
  },
  misconceptions: ({ r, n }): Misconception[] => [
    { response: str(q(r.num, r.num + r.den)), why: t`That is the limit, the probability that ${math`X`} is even. ${math`A_{${n}}`} only includes even values up to ${2 * n}.` },
    { response: str(mul(sub(q(1), r), pow(r, 2 * n - 1))), why: t`That is only the largest outcome, ${math`X = ${2 * n}`}. ${math`A_{${n}}`} contains every even value up to ${2 * n}.` },
    { response: str(sub(q(1), pow(r, 2 * n))), why: t`That is ${math`\mathbb{P}(X \le ${2 * n})`}. Only the even values count.` },
  ],
  trial: ({ r, n }, rng) => { const k = geo(r, rng); return k <= 2 * n && k % 2 === 0; },
});

// ---------------------------------------------------------------- Cambridge problems

const q4f = workedProof({
  title: t`Continuity from the axioms`,
  prompt: t`Example Sheet ${1}, Q${4}(f): show, starting from the definitions, that if ${math`A_{n} \subseteq A_{n + ${1}}`} for all ${mn}, then ${math`\mathbb{P}(A_{n}) \to \mathbb{P}\left(\bigcup_{n} A_{n}\right)`}.`,
  steps: [
    t`Make the events disjoint: ${math`B_{${1}} = A_{${1}}`} and ${math`B_{n} = A_{n} \setminus A_{n - ${1}}`} for ${math`n \ge ${2}`}. These are events, pairwise disjoint, with ${math`A_{n} = B_{${1}} \cup \cdots \cup B_{n}`} (as the sequence increases) and ${math`\bigcup_{n} A_{n} = \bigcup_{n} B_{n}`}.`,
    t`By countable additivity, ${math`\mathbb{P}\left(\bigcup_{n} A_{n}\right) = \sum_{k = ${1}}^{\infty} \mathbb{P}(B_{k}) = \lim_{n \to \infty} \sum_{k = ${1}}^{n} \mathbb{P}(B_{k})`}, the limit of the partial sums.`,
    t`By finite additivity, the ${mn}th partial sum is ${math`\mathbb{P}(B_{${1}} \cup \cdots \cup B_{n}) = \mathbb{P}(A_{n})`}. So ${math`\mathbb{P}(A_{n}) \to \mathbb{P}\left(\bigcup_{n} A_{n}\right)`}.`,
  ],
  answer: t`For increasing events, ${math`\mathbb{P}(A_{n}) \to \mathbb{P}\left(\bigcup_{n} A_{n}\right)`}.`,
  source: cite(S1, 'Q4(f)'),
});

/** The alternating sequence: A_n = {X <= n} for even n, {X > n} for odd n. Whether outcome x is in A_n. */
const inAlt = (x: number, n: number): boolean => (n % 2 === 0 ? x <= n : x > n);
const q6alt = auto({
  id: 'ia-q6-alternating',
  source: cite(S1, 'Q6', true),
  title: t`Infinitely often but not eventually`,
  prompt: t`Toss a fair coin until the first head; ${math`X`} is the number of tosses. Let ${math`A_{n} = \{X \le n\}`} for even ${mn} and ${math`A_{n} = \{X > n\}`} for odd ${mn}. With Q${6}'s ${math`A = \{A_{n} \text{ infinitely often}\}`} and ${math`B = \{A_{n} \text{ for all sufficiently large } n\}`}, find ${math`\mathbb{P}(A)`} and ${math`\mathbb{P}(B)`}.`,
  answer: { kind: 'table', cell: 'exact', columns: [t`event`, t`probability`], rows: [[t`${mA}, infinitely often`, null], [t`${math`B`}, eventually`, null]], expected: ['1', '0'] },
  solution: [
    t`Fix an outcome with ${math`X = x`}, a finite number. For every even ${math`n \ge x`} it is in ${math`A_{n}`}, and for every odd ${math`n \ge x`} it is not. So it is in ${math`A_{n}`} infinitely often, but not for all large ${mn}: ${math`A`} contains every outcome with ${math`X`} finite, and ${math`B`} none.`,
    t`${math`X`} is finite with probability ${1}: ${math`\mathbb{P}(X \le n) = ${1} - ${2}^{-n} \to ${1}`}, by continuity. So ${math`\mathbb{P}(A) = ${1}`} and ${math`\mathbb{P}(B) = ${0}`}.`,
  ],
  reference: ['1', '0'],
  verify: () => {
    // For each x up to 60, look at n from 100 to 300: is x in some A_n (i.o.), and in all (eventually)?
    const io = Array.from({ length: 60 }, (_, i) => i + 1).every((x) => Array.from({ length: 200 }, (_, j) => j + 100).some((n) => inAlt(x, n)));
    const ev = Array.from({ length: 60 }, (_, i) => i + 1).some((x) => Array.from({ length: 200 }, (_, j) => j + 100).every((n) => inAlt(x, n)));
    return same('membership for x up to 60 and n from 100 to 300', `${io},${ev}`, 'true,false');
  },
  misconceptions: [{ response: ['1', '1'], why: t`"Eventually" means for every large ${mn}; at odd ${mn} beyond ${math`X`} the outcome leaves ${math`A_{n}`}. So no outcome is eventually in it.` }],
});

const q6cont = supervision({
  id: 'ia-q6-continuity',
  source: cite(S1, 'Q6', true),
  title: t`"Eventually" as a limit`,
  prompt: t`With ${math`B = \bigcup_{n} \bigcap_{k \ge n} A_{k}`} as in Q${6}(a), show that the events ${math`C_{n} = \bigcap_{k \ge n} A_{k}`} increase with ${mn}, and deduce ${math`\mathbb{P}(B) = \lim_{n} \mathbb{P}(C_{n})`}. Then state and prove the dual for the decreasing events ${math`D_{n} = \bigcup_{k \ge n} A_{k}`}, by taking complements.`,
  writeUp: 'proof',
});
const decreasingProof = supervision({
  id: 'ia-q4-f-decreasing',
  source: cite(S1, 'Q4(f)', true),
  title: t`Continuity from above`,
  prompt: t`Deduce from Q${4}(f) that if ${math`A_{n} \supseteq A_{n + ${1}}`} for all ${mn}, then ${math`\mathbb{P}(A_{n}) \to \mathbb{P}\left(\bigcap_{n} A_{n}\right)`}. Give an example of decreasing events with ${math`\bigcap_{n} A_{n} = \varnothing`} but every ${math`A_{n}`} nonempty, and explain why the probabilities still tend to ${0}.`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

const claims: ProbabilityClaim[] = [
  { what: 'a fair coin: the first head comes on an even toss', exact: q(1, 3), trial: (rng) => geo(q(1, 2), rng) % 2 === 0 },
];
const HALF = q(1, 2);

export const continuity: TopicContent = {
  topicId: 'prob.continuity',
  goal: t`Use continuity of probability: for increasing events ${math`\mathbb{P}(A_{n}) \to \mathbb{P}(\bigcup A_{n})`}, and for decreasing events ${math`\mathbb{P}(A_{n}) \to \mathbb{P}(\bigcap A_{n})`}.`,
  objective: t`Find the probability of a limit of events as the limit of their probabilities, for monotone sequences.`,
  why: t`It turns "eventually" and "infinitely often" into numbers, and it underlies extinction and limit theorems.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`Will a head ever come?` },
    { kind: 'hook', text: t`Toss a fair coin again and again. The chance of at least one head in the first ${mn} tosses is ${math`${1} - ${2}^{-n}`}: ${HALF}, then ${q(3, 4)}, then ${q(7, 8)}, creeping towards ${1}. But "a head eventually comes" is one event, not a sequence. Is its probability really the limit, ${1}?` },
    { kind: 'narrative', text: t`"A head eventually comes" is the union of the events "a head within ${mn} tosses", and those events grow with ${mn}. The axioms are about unions of disjoint events, so the plan is to slice a growing sequence into disjoint pieces and let countable additivity do the rest.` },
    { kind: 'section', title: t`Monotone sequences of events` },
    {
      kind: 'definition',
      name: t`Increasing and decreasing events`,
      formal: t`Events ${math`A_{${1}}, A_{${2}}, \ldots`} are increasing if ${math`A_{n} \subseteq A_{n + ${1}}`} for every ${mn}, with limit ${math`\bigcup_{n} A_{n}`}; decreasing if ${math`A_{n} \supseteq A_{n + ${1}}`} for every ${mn}, with limit ${math`\bigcap_{n} A_{n}`}.`,
      plain: t`Increasing events only gain outcomes, and their limit is everything they ever contain. With ${math`X`} the toss of the first head, the events ${math`\{X \le n\}`} increase, and their union is ${math`\{X \text{ finite}\}`}.`,
    },
    { kind: 'theorem', name: t`Continuity from below`, statement: t`If ${math`A_{${1}} \subseteq A_{${2}} \subseteq \cdots`}, then ${math`\mathbb{P}(A_{n}) \to \mathbb{P}\left(\bigcup_{n} A_{n}\right)`} as ${math`n \to \infty`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Slice into rings`, text: t`Let ${math`B_{${1}} = A_{${1}}`} and ${math`B_{n} = A_{n} \setminus A_{n - ${1}}`} for ${math`n \ge ${2}`}.`, plain: t`${math`B_{n}`} holds the outcomes that first appear at stage ${mn}, like the rings of a tree.` },
        { label: t`Check the slices`, text: t`The ${math`B_{n}`} are pairwise disjoint events, ${math`A_{n} = B_{${1}} \cup \cdots \cup B_{n}`}, and ${math`\bigcup_{n} A_{n} = \bigcup_{n} B_{n}`}.`, why: { q: t`Why is ${math`A_{n}`} the union of the first ${mn} slices?`, a: t`An outcome of ${math`A_{n}`} has a first stage ${math`k \le n`} at which it appears, and it lies in ${math`B_{k}`}; because the sequence increases, it stays in every later ${math`A_{j}`}.` } },
        { label: t`Countable additivity`, text: t`${math`\mathbb{P}\left(\bigcup_{n} A_{n}\right) = \sum_{k = ${1}}^{\infty} \mathbb{P}(B_{k}) = \lim_{n \to \infty} \sum_{k = ${1}}^{n} \mathbb{P}(B_{k})`}.`, plain: t`An infinite sum is, by definition, the limit of its partial sums.` },
        { label: t`Finite additivity`, text: t`${math`\sum_{k = ${1}}^{n} \mathbb{P}(B_{k}) = \mathbb{P}(A_{n})`}, so ${math`\mathbb{P}(A_{n}) \to \mathbb{P}\left(\bigcup_{n} A_{n}\right)`}.` },
      ],
    },
    { kind: 'p', text: t`This is [[continuity-of-probability|continuity of probability]]. For the hook: ${math`\mathbb{P}(X \text{ finite}) = \lim (${1} - ${2}^{-n}) = ${1}`}, so a head comes eventually with probability ${1}. Another limit: ${math`A_{n} = \{X \le ${2}n,\ X \text{ even}\}`} increases to ${math`\{X \text{ even}\}`}, and ${math`\mathbb{P}(A_{n}) = \frac{${1}}{${4}} + \frac{${1}}{${16}} + \cdots + \frac{${1}}{${4}^{n}} = \frac{${1}}{${3}}(${1} - ${4}^{-n}) \to ${q(1, 3)}`}.` },
    checkFrom(increasingLimit, { r: q(1, 3), kind: 'odd' }, t`The events increase to ${math`\{X \text{ odd}\}`}, whose probability is ${math`${q(2, 3)}\left(${1} + \frac{${1}}{${9}} + \frac{${1}}{${81}} + \cdots\right) = ${q(2, 3)} \cdot ${q(9, 8)} = ${q(3, 4)}`}.`),
    { kind: 'theorem', name: t`Continuity from above`, statement: t`If ${math`A_{${1}} \supseteq A_{${2}} \supseteq \cdots`}, then ${math`\mathbb{P}(A_{n}) \to \mathbb{P}\left(\bigcap_{n} A_{n}\right)`} as ${math`n \to \infty`}.` },
    { kind: 'p', text: t`It follows from continuity from below applied to the complements, which increase; writing that out is one of the gate problems. For example, ${math`B_{n} = \{X \text{ even}\} \cup \{X > n\}`} decreases to ${math`\{X \text{ even}\}`}, since ${math`X`} is finite.` },
    checkFrom(decreasingLimit, { r: HALF, kind: 'even-or-late' }, t`The intersection is ${math`\{X \text{ even}\}`}, probability ${q(1, 3)} for a fair coin.`),
    { kind: 'section', title: t`Infinitely often and eventually` },
    { kind: 'p', text: t`Example Sheet ${1} Q${6} builds limits of any sequence from monotone ones. "${math`A_{n}`} for all sufficiently large ${mn}" is ${math`\bigcup_{n} \bigcap_{k \ge n} A_{k}`}: the intersections ${math`\bigcap_{k \ge n} A_{k}`} increase with ${mn}. "${math`A_{n}`} infinitely often" is ${math`\bigcap_{n} \bigcup_{k \ge n} A_{k}`}, where the unions decrease. Continuity applies to each layer.` },
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`For any sequence of events, ${math`\mathbb{P}(A_{n}) \to \mathbb{P}\left(\bigcup_{n} A_{n}\right)`}.`, counterexample: t`Toss a coin once; let ${math`A_{n}`} be "heads" for even ${mn} and "tails" for odd ${mn}. Every ${math`\mathbb{P}(A_{n}) = ${HALF}`}, but the union is certain. The theorem needs the events to increase.` },
    { kind: 'pitfall', claim: t`If increasing events have a union of probability ${1}, one of them already has probability ${1}.`, counterexample: t`${math`\{X \le n\}`} increase to an event of probability ${1}, yet each has probability ${math`${1} - ${2}^{-n} < ${1}`}. Only the limit reaches ${1}.` },
    { kind: 'takeaway', text: t`For events that only grow, or only shrink, the probability of the limit is the limit of the probabilities.` },
  ],
  examples: [
    { ...q4f, examiner: t`The examiner looks for the disjoint slices defined and checked, countable additivity named, and the partial sums identified with ${math`\mathbb{P}(A_{n})`}.` },
    worked(increasingLimit, { r: q(1, 2), kind: 'even' }, t`The first head on an even toss, as a limit`),
    worked(finiteStep, { r: q(1, 2), n: 2 }, t`One member of the sequence`),
  ],
  generators: [increasingLimit, decreasingLimit, finiteStep],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['continuity-of-probability'],
  claims,
  cambridge: withUses([q6alt, q6cont, decreasingProof], {
    'ia-q6-continuity': { sections: ['Monotone sequences of events', 'Infinitely often and eventually'], note: t`"Eventually" as a limit of increasing events, and its dual` },
    'ia-q4-f-decreasing': { sections: ['Monotone sequences of events'], note: t`Continuity from above, with an example` },
    'ia-q6-alternating': { sections: ['Infinitely often and eventually'], note: t`Infinitely often but not eventually` },
  }),
  gate: ['ia-q6-continuity', 'ia-q4-f-decreasing', 'ia-q6-alternating'],
  recall: [
    { front: t`Continuity from below.`, back: t`If ${math`A_{n} \subseteq A_{n + ${1}}`} for all ${mn}, then ${math`\mathbb{P}(A_{n}) \to \mathbb{P}\left(\bigcup A_{n}\right)`}.` },
    { front: t`Continuity from above.`, back: t`If ${math`A_{n} \supseteq A_{n + ${1}}`} for all ${mn}, then ${math`\mathbb{P}(A_{n}) \to \mathbb{P}\left(\bigcap A_{n}\right)`}.` },
    { front: t`"${math`A_{n}`} eventually" as a set.`, back: t`${math`\bigcup_{n} \bigcap_{k \ge n} A_{k}`}.` },
  ],
  proofOrder: [
    {
      title: t`Continuity from below`,
      steps: [
        t`Slice: ${math`B_{${1}} = A_{${1}}`} and ${math`B_{n} = A_{n} \setminus A_{n - ${1}}`}.`,
        t`The slices are disjoint, with ${math`A_{n} = B_{${1}} \cup \cdots \cup B_{n}`} and the same union as the ${math`A_{n}`}.`,
        t`Countable additivity: ${math`\mathbb{P}\left(\bigcup A_{n}\right) = \lim_{n} \sum_{k \le n} \mathbb{P}(B_{k})`}.`,
        t`Finite additivity: each partial sum is ${math`\mathbb{P}(A_{n})`}.`,
      ],
    },
  ],
};
