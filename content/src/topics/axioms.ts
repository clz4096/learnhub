/**
 * prob.axioms: the axioms of probability, countable case: P(A) >= 0, P(Ω) = 1, and
 * countable additivity; on a countable Ω a probability is the same as point masses p_ω >= 0
 * adding to 1. From IA Probability Example Sheet 1 Q4 (state what it means for P to be a
 * probability measure; prove P(∅) = 0 and finite additivity from the definitions) and the
 * Faculty schedule's "Axioms (countable case)". The sheet has no official solutions.
 */
import type { Rng } from '@learnhub/mastery';
import { auto, cite, same, supervision } from '../cambridge';
import { int, mul, pick, q, sample, str, sub, type Rational } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { join, math, t, type Rich, type Span } from '../rich';
import { checkFrom, worked, workedProof, type ProbabilityClaim, type TopicContent } from '../topic';

const [mO, mP] = [math`\Omega`, math`\mathbb{P}`];
const S1 = 'ia-prob-sheet-1' as const;

/**
 * The fraction with denominator up to maxDen nearest to x, if within tol: recognises an
 * exact value from a numerical sum. With the defaults, fractions are at least 2.5e-5 apart.
 */
function recognise(x: number, maxDen = 200, tol = 2e-5): string | null {
  for (let d = 1; d <= maxDen; d++) {
    const n = Math.round(x * d);
    if (Math.abs(n / d - x) < tol) return str(q(n, d));
  }
  return null;
}

// ---------------------------------------------------------------- the normalising constant

interface Fam { tex: Span; from: number; f: (n: number) => number; sum: Rational; first: Rational; why: Rich }
const FAMS: readonly Fam[] = [
  { tex: math`\frac{c}{${2}^{n}}`, from: 1, f: (n) => 1 / 2 ** n, sum: q(1), first: q(1, 2),  why: t`a geometric series, ${math`\frac{${1}}{${2}} + \frac{${1}}{${4}} + \cdots = ${1}`}` },
  { tex: math`\frac{c}{${3}^{n}}`, from: 1, f: (n) => 1 / 3 ** n, sum: q(1, 2), first: q(1, 3),  why: t`a geometric series with first term and ratio ${q(1, 3)}: ${math`\frac{${1}/${3}}{${1} - ${1}/${3}} = ${q(1, 2)}`}` },
  { tex: math`\frac{c}{${4}^{n}}`, from: 0, f: (n) => 1 / 4 ** n, sum: q(4, 3), first: q(1),  why: t`a geometric series from ${math`n = ${0}`}: ${math`\frac{${1}}{${1} - ${1}/${4}} = ${q(4, 3)}`}` },
  { tex: math`\frac{c}{n(n + ${1})}`, from: 1, f: (n) => 1 / (n * (n + 1)), sum: q(1), first: q(1, 2),  why: t`telescoping: ${math`\frac{${1}}{n(n + ${1})} = \frac{${1}}{n} - \frac{${1}}{n + ${1}}`}, so the sum is ${1}` },
  { tex: math`\frac{c}{n(n + ${2})}`, from: 1, f: (n) => 1 / (n * (n + 2)), sum: q(3, 4), first: q(1, 3),  why: t`telescoping: ${math`\frac{${1}}{n(n + ${2})} = \frac{${1}}{${2}}\left(\frac{${1}}{n} - \frac{${1}}{n + ${2}}\right)`}, so the sum is ${math`\frac{${1}}{${2}}\left(${1} + \frac{${1}}{${2}}\right) = ${q(3, 4)}`}` },
  { tex: math`\frac{c}{${4}n^{${2}} - ${1}}`, from: 1, f: (n) => 1 / (4 * n * n - 1), sum: q(1, 2), first: q(1, 3),  why: t`telescoping: ${math`\frac{${1}}{(${2}n - ${1})(${2}n + ${1})} = \frac{${1}}{${2}}\left(\frac{${1}}{${2}n - ${1}} - \frac{${1}}{${2}n + ${1}}\right)`}, so the sum is ${q(1, 2)}` },
  { tex: math`c \cdot \frac{n}{${2}^{n}}`, from: 1, f: (n) => n / 2 ** n, sum: q(2), first: q(1, 2),  why: t`${math`\sum_{n \ge ${1}} n x^{n} = \frac{x}{(${1} - x)^{${2}}}`}, which is ${2} at ${math`x = ${q(1, 2)}`}` },
  { tex: math`c \cdot \left(\frac{${2}}{${3}}\right)^{n}`, from: 1, f: (n) => (2 / 3) ** n, sum: q(2), first: q(2, 3),  why: t`a geometric series with first term and ratio ${q(2, 3)}: ${math`\frac{${2}/${3}}{${1} - ${2}/${3}} = ${2}`}` },
];

interface NormP { i: number }

const normalise = generator<NormP>({
  id: 'normalise',
  skill: 'Choose the constant c so that point masses c f(n) on a countable set add to 1, as the axioms require.',
  params: (rng) => ({ i: int(rng, 0, FAMS.length - 1) }),
  sane: ({ i }) => (i >= 0 && i < FAMS.length ? null : 'out of range'),
  problem: ({ i }) => {
    const f = FAMS[i] as Fam;
    const c = q(f.sum.den, f.sum.num);
    return {
      prompt: t`On ${math`\Omega = \{${f.from}, ${f.from + 1}, ${f.from + 2}, \ldots\}`}, let ${math`\mathbb{P}(\{n\}) = ${f.tex}`}. For which constant ${math`c`} does this define a probability measure?`,
      answer: { kind: 'exact', expected: str(c) },
      solution: [
        t`Every point mass is positive for ${math`c > ${0}`}, and ${math`\mathbb{P}(\Omega)`} must be ${1}: by countable additivity, ${math`\mathbb{P}(\Omega) = \sum_{n} \mathbb{P}(\{n\})`}.`,
        t`Without the ${math`c`}, the sum is ${f.sum}: ${f.why}. So ${math`c = ${1} / ${f.sum} = ${c}`}.`,
      ],
    };
  },
  solve: ({ i }) => {
    // Add many terms numerically and recognise the reciprocal.
    const f = FAMS[i] as Fam;
    let s = 0;
    for (let n = f.from; n < f.from + 100000; n++) s += f.f(n);
    return recognise(1 / s) ?? 'none';
  },
  misconceptions: ({ i }): Misconception[] => {
    const f = FAMS[i] as Fam;
    const rest = sub(f.sum, f.first);
    return [
      { response: str(f.sum), why: t`That is the sum of the terms without ${math`c`}. ${math`c`} must make the total ${1}, so it is the reciprocal.` },
      { response: '1', why: t`With ${math`c = ${1}`} the masses add to ${f.sum}, not ${1}.` },
      { response: str(q(rest.den, rest.num)), why: t`The sample space starts at ${math`n = ${f.from}`}: include the term ${math`n = ${f.from}`} in the sum.` },
      { response: str(q(f.first.den, f.first.num)), why: t`That makes the first mass alone equal to ${1}. All the masses together must add to ${1}.` },
    ];
  },
});

// ---------------------------------------------------------------- events of a geometric distribution

type GKind = 'even' | 'tail' | 'atmost' | 'three';
interface GeoP { r: Rational; kind: GKind; n: number }
const pow = (r: Rational, e: number): Rational => { let out = q(1); for (let i = 0; i < e; i++) out = mul(out, r); return out; };
const geoValue = ({ r, kind, n }: GeoP): Rational => {
  if (kind === 'even') return mul(r, q(r.den, r.num + r.den));
  if (kind === 'tail') return pow(r, n - 1);
  if (kind === 'atmost') return sub(q(1), pow(r, n));
  return q(r.num * r.num, r.num * r.num + r.num * r.den + r.den * r.den);
};
const geoSample = (r: Rational, rng: Rng): number => { let k = 1; while (rng() < Number(r.num) / Number(r.den)) k++; return k; };

const geometricEvents = generator<GeoP>({
  id: 'geometric-events',
  skill: 'Find the probability of an event on a countable sample space by countable additivity: add the point masses of its outcomes.',
  params: (rng) => ({ r: pick(rng, [q(1, 2), q(1, 3), q(2, 3), q(1, 4), q(3, 4), q(2, 5)]), kind: pick(rng, ['even', 'tail', 'atmost', 'three'] as const), n: int(rng, 2, 5) }),
  sane: ({ n }) => (n >= 2 ? null : 'out of range'),
  problem: (p) => {
    const { r, kind, n } = p;
    const one = sub(q(1), r);
    const event = kind === 'even' ? t`${math`k`} is even` : kind === 'tail' ? t`${math`k \ge ${n}`}` : kind === 'atmost' ? t`${math`k \le ${n}`}` : t`${math`k`} is a multiple of ${3}`;
    const how = kind === 'even'
      ? t`${math`\sum_{j \ge ${1}} \mathbb{P}(\{${2}j\}) = ${one} \left(r + r^{${3}} + r^{${5}} + \cdots\right) = ${one} \cdot \frac{r}{${1} - r^{${2}}} = \frac{r}{${1} + r}`} with ${math`r = ${r}`}`
      : kind === 'tail'
        ? t`${math`\sum_{k \ge ${n}} ${one}\, r^{k - ${1}} = ${one} \cdot \frac{r^{${n - 1}}}{${1} - r} = r^{${n - 1}}`} with ${math`r = ${r}`}`
        : kind === 'atmost'
          ? t`${math`${1} - \mathbb{P}(k \ge ${n + 1}) = ${1} - r^{${n}}`} with ${math`r = ${r}`}`
          : t`${math`\sum_{j \ge ${1}} ${one}\, r^{${3}j - ${1}} = ${one} \cdot \frac{r^{${2}}}{${1} - r^{${3}}} = \frac{r^{${2}}}{${1} + r + r^{${2}}}`} with ${math`r = ${r}`}`;
    return {
      prompt: t`On ${math`\Omega = \{${1}, ${2}, ${3}, \ldots\}`}, let ${math`\mathbb{P}(\{k\}) = (${1} - r)\, r^{k - ${1}}`} with ${math`r = ${r}`}: the number of tosses up to the first success. Find the probability that ${event}.`,
      answer: { kind: 'exact', expected: str(geoValue(p)) },
      solution: [
        t`By countable additivity the event's probability is the sum of the masses of its outcomes.`,
        t`${how}: ${geoValue(p)}.`,
      ],
    };
  },
  solve: ({ r, kind, n }) => {
    const x = Number(r.num) / Number(r.den);
    let s = 0;
    for (let k = 1; k < 3000; k++) if (kind === 'even' ? k % 2 === 0 : kind === 'tail' ? k >= n : kind === 'atmost' ? k <= n : k % 3 === 0) s += (1 - x) * x ** (k - 1);
    return recognise(s, 5000, 1e-10) ?? 'none';
  },
  misconceptions: (p): Misconception[] => {
    const { r, kind, n } = p;
    const out: Misconception[] = [];
    if (kind === 'even') out.push({ response: '1/2', why: t`Odd and even are not equally likely here: ${math`k = ${1}`} alone has mass ${sub(q(1), r)}. Add the masses of the even outcomes.` });
    if (kind === 'three') out.push({ response: '1/3', why: t`The three residues are not equally likely: small ${math`k`} carry more mass. Add the masses of the multiples of ${3}.` });
    if (kind === 'tail') out.push({ response: str(pow(r, n)), why: t`The event includes ${math`k = ${n}`} itself: it means the first ${n - 1} tosses fail, probability ${math`r^{${n - 1}}`}.` });
    if (kind === 'atmost') out.push({ response: str(sub(q(1), pow(r, n - 1))), why: t`${math`k \le ${n}`} includes ${math`k = ${n}`}: its complement is ${math`k \ge ${n + 1}`}, of probability ${math`r^{${n}}`}.` });
    out.push({ response: str(mul(sub(q(1), r), pow(r, n - 1))), why: t`That is the single outcome ${math`k = ${n}`}. The event is a union of outcomes: add their masses.` });
    out.push({ response: str(sub(q(1), geoValue(p))), why: t`That is the complement's probability.` });
    return out;
  },
  trial: ({ r, kind, n }, rng) => { const k = geoSample(r, rng); return kind === 'even' ? k % 2 === 0 : kind === 'tail' ? k >= n : kind === 'atmost' ? k <= n : k % 3 === 0; },
});

// ---------------------------------------------------------------- which assignments are probabilities

interface Cand { tex: Rich; nonneg: boolean; sumOne: boolean }
const CANDS: readonly Cand[] = [
  { tex: t`${math`\mathbb{P}(\{n\}) = ${2}^{-n}`} on ${math`\{${1}, ${2}, \ldots\}`}`, nonneg: true, sumOne: true },
  { tex: t`${math`\mathbb{P}(\{n\}) = \frac{${1}}{n(n + ${1})}`} on ${math`\{${1}, ${2}, \ldots\}`}`, nonneg: true, sumOne: true },
  { tex: t`${math`\mathbb{P}(\{k\}) = \frac{k}{${21}}`} on ${math`\{${1}, \ldots, ${6}\}`}`, nonneg: true, sumOne: true },
  { tex: t`${math`\mathbb{P}(\{n\}) = \frac{${1}}{n^{${2}}}`} on ${math`\{${1}, ${2}, \ldots\}`}`, nonneg: true, sumOne: false },
  { tex: t`${math`\mathbb{P}(\{n\}) = ${3}^{-n}`} on ${math`\{${1}, ${2}, \ldots\}`}`, nonneg: true, sumOne: false },
  { tex: t`${math`\mathbb{P}(\{k\}) = \frac{k}{${15}}`} on ${math`\{${1}, \ldots, ${6}\}`}`, nonneg: true, sumOne: false },
  { tex: t`${math`\mathbb{P}(\{${1}\}) = ${q(3, 2)}`}, ${math`\mathbb{P}(\{${2}\}) = -${q(1, 2)}`} on ${math`\{${1}, ${2}\}`}`, nonneg: false, sumOne: true },
  { tex: t`${math`\mathbb{P}(\{k\}) = \frac{k - ${2}}{${9}}`} on ${math`\{${1}, \ldots, ${6}\}`}`, nonneg: false, sumOne: true },
];
interface CheckP { idx: readonly number[] }

const axiomCheck = generator<CheckP>({
  id: 'axiom-check',
  skill: 'Check point masses against the axioms: each must be at least 0, and together they must add to 1 (countable additivity gives P(Ω) as the sum).',
  params: (rng) => {
    const good = sample(rng, [0, 1, 2], int(rng, 1, 2));
    const notSum = sample(rng, [3, 4, 5], 1);
    const neg = sample(rng, [6, 7], 1);
    return { idx: sample(rng, [...good, ...notSum, ...neg], good.length + 2) };
  },
  sane: ({ idx }) => (idx.length >= 3 ? null : 'out of range'),
  problem: ({ idx }) => {
    const options: ChoiceOption[] = idx.map((i, k) => ({ id: `a${k}`, label: (CANDS[i] as Cand).tex }));
    return {
      prompt: t`Which of these define a probability measure on their sample space, with every subset an event? ${join(idx.map((i) => (CANDS[i] as Cand).tex), '; ')}. Choose all that do.`,
      answer: { kind: 'choice', options, correct: idx.flatMap((i, k) => ((CANDS[i] as Cand).nonneg && (CANDS[i] as Cand).sumOne ? [`a${k}`] : [])) },
      solution: [
        t`On a countable ${mO}, point masses define a probability exactly when each is at least ${0} and they add to ${1}; then ${math`\mathbb{P}(A) = \sum_{\omega \in A} p_{\omega}`} satisfies countable additivity, because a sum of nonnegative terms can be regrouped.`,
        t`${math`\sum ${2}^{-n}`} and ${math`\sum \frac{${1}}{n(n + ${1})}`} are ${1}, and ${math`\frac{${1} + \cdots + ${6}}{${21}} = ${1}`}. But ${math`\sum \frac{${1}}{n^{${2}}} = \frac{\pi^{${2}}}{${6}}`}, ${math`\sum ${3}^{-n} = ${q(1, 2)}`}, and ${math`\frac{${21}}{${15}} \ne ${1}`}; and a negative mass breaks ${math`\mathbb{P}(A) \ge ${0}`} even when the total is ${1}.`,
      ],
    };
  },
  solve: ({ idx }) => idx.flatMap((i, k) => {
    // Check numerically: every listed mass at least 0, and the masses add to 1.
    const series = (f: (n: number) => number, terms: number): number[] => Array.from({ length: terms }, (_, n) => f(n + 1));
    const masses = i === 0 ? series((n) => 2 ** -n, 60)
      : i === 1 ? series((n) => 1 / (n * (n + 1)), 100000)
        : i === 2 ? [1, 2, 3, 4, 5, 6].map((x) => x / 21)
          : i === 3 ? series((n) => 1 / n ** 2, 100000)
            : i === 4 ? series((n) => 3 ** -n, 60)
              : i === 5 ? [1, 2, 3, 4, 5, 6].map((x) => x / 15)
                : i === 6 ? [1.5, -0.5] : [1, 2, 3, 4, 5, 6].map((x) => (x - 2) / 9);
    const ok = masses.every((m) => m >= 0) && Math.abs(masses.reduce((a, b) => a + b, 0) - 1) < 1e-4;
    return ok ? [`a${k}`] : [];
  }),
  misconceptions: ({ idx }): Misconception[] => [
    { response: idx.flatMap((i, k) => ((CANDS[i] as Cand).sumOne ? [`a${k}`] : [])), why: t`Adding to ${1} is not enough: every probability must be at least ${0}, so no negative mass is allowed.` },
    { response: idx.flatMap((i, k) => ((CANDS[i] as Cand).nonneg ? [`a${k}`] : [])), why: t`Nonnegative masses must also add to exactly ${1}, since ${math`\mathbb{P}(\Omega) = ${1}`}: check each sum.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const q4bEmpty = workedProof({
  title: t`${math`\mathbb{P}(\varnothing) = ${0}`} from the axioms`,
  prompt: t`Example Sheet ${1}, Q${4}(b), first part: show, starting from the definition of a probability measure, that ${math`\mathbb{P}(\varnothing) = ${0}`}.`,
  steps: [
    t`The definition: ${math`\mathbb{P}(A) \ge ${0}`} for every event, ${math`\mathbb{P}(\Omega) = ${1}`}, and for pairwise disjoint events ${math`A_{${1}}, A_{${2}}, \ldots`}, ${math`\mathbb{P}\left(\bigcup_{n} A_{n}\right) = \sum_{n} \mathbb{P}(A_{n})`}.`,
    t`Take every ${math`A_{n} = \varnothing`}. They are pairwise disjoint, and their union is ${math`\varnothing`}. So ${math`\mathbb{P}(\varnothing) = \sum_{n \ge ${1}} \mathbb{P}(\varnothing)`}.`,
    t`If ${math`\mathbb{P}(\varnothing) = x > ${0}`}, the right side is ${math`x + x + \cdots`}, which is infinite, not ${math`x`}. Since ${math`x \ge ${0}`}, the only possibility is ${math`x = ${0}`}.`,
  ],
  answer: t`${math`\mathbb{P}(\varnothing) = ${0}`}.`,
  source: cite(S1, 'Q4(b)'),
});

const disjointHalves = auto({
  id: 'ia-q4-countable-additivity',
  source: cite(S1, 'Q4', true),
  title: t`Countable additivity with numbers`,
  prompt: t`In a probability space, the events ${math`A_{${1}}, A_{${2}}, \ldots`} are pairwise disjoint and ${math`\mathbb{P}(A_{n}) = \frac{${1}}{${3}^{n}}`} for each ${math`n \ge ${1}`}. What is ${math`\mathbb{P}\left(\bigcup_{n} A_{n}\right)`}, and what is the probability that none of them happens?`,
  answer: { kind: 'table', cell: 'exact', columns: [t`event`, t`probability`], rows: [[t`${math`\bigcup_{n} A_{n}`}`, null], [t`none of them`, null]], expected: [str(q(1, 2)), str(q(1, 2))] },
  solution: [
    t`Countable additivity: ${math`\mathbb{P}\left(\bigcup A_{n}\right) = \sum_{n \ge ${1}} ${3}^{-n} = \frac{${1}/${3}}{${1} - ${1}/${3}} = ${q(1, 2)}`}.`,
    t`"None of them" is the complement of the union: ${math`${1} - ${q(1, 2)} = ${q(1, 2)}`}.`,
  ],
  reference: [str(q(1, 2)), str(q(1, 2))],
  verify: () => { let s = 0; for (let n = 1; n < 60; n++) s += 3 ** -n; return same('the partial sums', recognise(s), '1/2'); },
  misconceptions: [{ response: ['1', '0'], why: t`The events need not cover ${mO}: their probabilities add to ${q(1, 2)}, not ${1}.` }],
});

const q4c = supervision({
  id: 'ia-q4-c',
  source: cite(S1, 'Q4(c)'),
  title: t`Finite additivity from countable additivity`,
  prompt: t`Show, starting from the definitions, that if ${math`A_{${1}}`} and ${math`A_{${2}}`} are disjoint events then ${math`\mathbb{P}(A_{${1}} \cup A_{${2}}) = \mathbb{P}(A_{${1}}) + \mathbb{P}(A_{${2}})`}. Which earlier part do you need first, and why can't you apply countable additivity to just two events?`,
  writeUp: 'proof',
});
const countableCase = supervision({
  id: 'schedule-countable-case',
  source: cite('tripos-schedules', 'IA Probability, Axiomatic approach: "Axioms (countable case)"', true),
  title: t`Point masses give a probability measure`,
  prompt: t`Let ${mO} be countable and ${math`p_{\omega} \ge ${0}`} with ${math`\sum_{\omega \in \Omega} p_{\omega} = ${1}`}. Define ${math`\mathbb{P}(A) = \sum_{\omega \in A} p_{\omega}`} for every ${math`A \subseteq \Omega`}. Check that ${mP} satisfies the axioms, including countable additivity, and say where you use that the terms are nonnegative (rearranging a series). Conversely, why is every probability measure on all subsets of a countable ${mO} of this form?`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

const claims: ProbabilityClaim[] = [
  { what: 'first success on an even toss, r = 1/2', exact: q(1, 3), trial: (rng) => geoSample(q(1, 2), rng) % 2 === 0 },
];
const HALF = q(1, 2);

export const axioms: TopicContent = {
  topicId: 'prob.axioms',
  goal: t`State the axioms of probability, including countable additivity, and use them to define and compute probabilities on a countable sample space.`,
  objective: t`State the three axioms of probability and build probabilities on a countable sample space from them.`,
  why: t`Every rule of probability is proved from these three; they also handle infinitely many outcomes.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`When counting stops working` },
    { kind: 'hook', text: t`Toss a fair coin until the first head. The head comes on toss ${math`k`} with probability ${math`\frac{${1}}{${2}^{k}}`}, for ${math`k = ${1}, ${2}, ${3}, \ldots`}. What is the chance it comes on an even-numbered toss? Half the numbers are even, so ${HALF}? It is ${q(1, 3)}.` },
    { kind: 'narrative', text: t`Classical probability counts equally likely outcomes, and here neither condition holds: there are infinitely many outcomes, and toss ${1} is far likelier than toss ${10}. We need rules that say what any probability must obey, whatever the outcomes. Cambridge takes three such rules, the axioms, and derives everything else from them.` },
    { kind: 'section', title: t`The three axioms` },
    {
      kind: 'definition',
      name: t`Probability measure`,
      formal: t`Let ${mO} be a sample space and ${math`\mathcal{F}`} a collection of subsets of ${mO}, the events, containing ${mO} and closed under complements and countable unions. A [[probability-measure|probability measure]] is a function ${math`\mathbb{P} : \mathcal{F} \to \mathbb{R}`} with (i) ${math`\mathbb{P}(A) \ge ${0}`} for every ${math`A \in \mathcal{F}`}; (ii) ${math`\mathbb{P}(\Omega) = ${1}`}; (iii) [[countable-additivity|countable additivity]]: if ${math`A_{${1}}, A_{${2}}, \ldots \in \mathcal{F}`} are pairwise disjoint, then ${math`\mathbb{P}\left(\bigcup_{n \ge ${1}} A_{n}\right) = \sum_{n \ge ${1}} \mathbb{P}(A_{n})`}.`,
      plain: t`Probabilities are never negative, something certainly happens, and for events that cannot happen together, the chance one of them happens is the sum of their chances, even for an infinite list. Pairwise disjoint means no two share an outcome. When ${mO} is countable, we usually take every subset as an event.`,
    },
    { kind: 'p', text: t`Why insist on infinite lists in (iii)? Because the event "the first head comes on an even toss" is the union of infinitely many outcomes ${math`\{${2}\}, \{${4}\}, \{${6}\}, \ldots`}. A rule for two events at a time could never reach it.` },
    { kind: 'section', title: t`First consequences` },
    { kind: 'theorem', statement: t`${math`\mathbb{P}(\varnothing) = ${0}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`A list of empty sets`, text: t`Take ${math`A_{n} = \varnothing`} for every ${math`n \ge ${1}`}. They are pairwise disjoint, and their union is ${math`\varnothing`}.`, plain: t`Two empty sets share no outcome, since they have none.` },
        { label: t`Apply countable additivity`, text: t`${math`\mathbb{P}(\varnothing) = \sum_{n \ge ${1}} \mathbb{P}(\varnothing)`}.` },
        { label: t`Only zero works`, text: t`Let ${math`x = \mathbb{P}(\varnothing) \ge ${0}`}. If ${math`x > ${0}`}, the partial sums ${math`nx`} grow without bound, so the series diverges and cannot equal ${math`x`}. Hence ${math`x = ${0}`}.` },
      ],
    },
    { kind: 'theorem', name: t`Finite additivity`, statement: t`If ${math`A_{${1}}, \ldots, A_{m}`} are pairwise disjoint events, then ${math`\mathbb{P}(A_{${1}} \cup \cdots \cup A_{m}) = \mathbb{P}(A_{${1}}) + \cdots + \mathbb{P}(A_{m})`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Pad the list`, text: t`Set ${math`A_{n} = \varnothing`} for ${math`n > m`}. The infinite list is still pairwise disjoint, and its union is ${math`A_{${1}} \cup \cdots \cup A_{m}`}.` },
        { label: t`Apply countable additivity`, text: t`${math`\mathbb{P}\left(\bigcup_{n = ${1}}^{m} A_{n}\right) = \sum_{n = ${1}}^{m} \mathbb{P}(A_{n}) + \sum_{n > m} \mathbb{P}(\varnothing)`}.` },
        { label: t`Drop the padding`, text: t`Each ${math`\mathbb{P}(\varnothing) = ${0}`}, by the theorem above, so the second sum is ${0}.`, plain: t`This is why ${math`\mathbb{P}(\varnothing) = ${0}`} had to come first.` },
      ],
    },
    { kind: 'section', title: t`Countable sample spaces` },
    { kind: 'narrative', text: t`On a countable ${mO}, such as ${math`\{${1}, ${2}, ${3}, \ldots\}`}, the axioms reduce to something concrete: give each outcome a weight, and add weights.` },
    { kind: 'theorem', name: t`Point masses`, statement: t`Let ${mO} be countable and every subset an event. If ${math`p_{\omega} \ge ${0}`} and ${math`\sum_{\omega \in \Omega} p_{\omega} = ${1}`}, then ${math`\mathbb{P}(A) = \sum_{\omega \in A} p_{\omega}`} is a probability measure. Conversely, every probability measure on ${mO} is of this form, with ${math`p_{\omega} = \mathbb{P}(\{\omega\})`}.` },
    { kind: 'p', text: t`The converse is one line: ${math`A`} is the disjoint union of its countably many single outcomes ${math`\{\omega\}`}, so countable additivity gives ${math`\mathbb{P}(A) = \sum_{\omega \in A} \mathbb{P}(\{\omega\})`}. For the forward direction, (i) and (ii) are immediate, and (iii) says that adding the weights of a disjoint union piece by piece gives the same total as adding them all at once.`, why: { q: t`Why may the weights be added in any grouping?`, a: t`A series of nonnegative terms has the same sum, finite or infinite, however its terms are ordered or grouped. That fails for series with mixed signs, which is one reason the masses must be nonnegative.` } },
    { kind: 'p', text: t`Back to the hook. The first success, with failure probability ${math`r`} on each toss, has ${math`p_{k} = (${1} - r)r^{k - ${1}}`}; the masses add to ${math`(${1} - r) \cdot \frac{${1}}{${1} - r} = ${1}`}. The even tosses have total mass ${math`(${1} - r)(r + r^{${3}} + r^{${5}} + \cdots) = (${1} - r)\frac{r}{${1} - r^{${2}}} = \frac{r}{${1} + r}`}, which is ${q(1, 3)} at ${math`r = ${HALF}`}.`, why: { q: t`Where does ${math`\frac{r}{${1} - r^{${2}}}`} come from?`, a: t`${math`r + r^{${3}} + r^{${5}} + \cdots`} is geometric with first term ${math`r`} and ratio ${math`r^{${2}}`}, and ${math`${1} - r^{${2}} = (${1} - r)(${1} + r)`}.` } },
    checkFrom(normalise, { i: 4 }, t`Without ${math`c`} the masses add to ${q(3, 4)}, so ${math`c = ${q(4, 3)}`} makes the total ${1}.`),
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`Point masses that add to ${1} always define a probability.`, counterexample: t`${math`p_{${1}} = ${q(3, 2)}`} and ${math`p_{${2}} = -${HALF}`} add to ${1}, but ${math`\mathbb{P}(\{${2}\}) < ${0}`} breaks axiom (i).` },
    { kind: 'pitfall', claim: t`You can pick a whole number uniformly at random from ${math`\{${1}, ${2}, ${3}, \ldots\}`}.`, counterexample: t`Equal masses ${math`p_{n} = c`} add to ${0} if ${math`c = ${0}`} and to ${math`\infty`} if ${math`c > ${0}`}, never to ${1}. Countable additivity rules it out.` },
    { kind: 'takeaway', text: t`A probability is nonnegative, gives ${mO} probability ${1}, and adds over any countable list of disjoint events; on a countable space it is just point masses adding to ${1}.` },
  ],
  examples: [
    { ...q4bEmpty, examiner: t`The examiner looks for the definition stated, countable additivity applied to a disjoint list, and the case ${math`\mathbb{P}(\varnothing) > ${0}`} ruled out explicitly.` },
    worked(normalise, { i: 3 }, t`Point masses ${math`\frac{c}{n(n + ${1})}`}`),
    worked(geometricEvents, { r: q(1, 2), kind: 'even', n: 2 }, t`First success on an even toss`),
  ],
  generators: [normalise, geometricEvents, axiomCheck],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['probability-measure', 'countable-additivity'],
  claims,
  cambridge: [disjointHalves, q4c, countableCase],
  gate: ['ia-q4-c'],
  recall: [
    { front: t`The three axioms of a probability measure.`, back: t`${math`\mathbb{P}(A) \ge ${0}`}; ${math`\mathbb{P}(\Omega) = ${1}`}; for pairwise disjoint ${math`A_{${1}}, A_{${2}}, \ldots`}, ${math`\mathbb{P}\left(\bigcup A_{n}\right) = \sum \mathbb{P}(A_{n})`}.` },
    { front: t`A probability measure on a countable ${mO}, in terms of point masses.`, back: t`${math`\mathbb{P}(A) = \sum_{\omega \in A} p_{\omega}`}, with ${math`p_{\omega} \ge ${0}`} and ${math`\sum_{\omega} p_{\omega} = ${1}`}.` },
    { front: t`Why is ${math`\mathbb{P}(\varnothing) = ${0}`}?`, back: t`Countable additivity on ${math`\varnothing, \varnothing, \ldots`} makes ${math`\mathbb{P}(\varnothing)`} an infinite sum of copies of itself.` },
  ],
  proofOrder: [
    {
      title: t`${math`\mathbb{P}(\varnothing) = ${0}`} from the axioms`,
      steps: [
        t`Take ${math`A_{n} = \varnothing`} for every ${math`n`}: pairwise disjoint, with union ${math`\varnothing`}.`,
        t`Countable additivity gives ${math`\mathbb{P}(\varnothing) = \sum_{n} \mathbb{P}(\varnothing)`}.`,
        t`A positive value would make the right side infinite.`,
        t`Since ${math`\mathbb{P}(\varnothing) \ge ${0}`}, it must be ${0}.`,
      ],
    },
  ],
};
