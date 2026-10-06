/**
 * ineq.jensen: convex functions, Jensen's inequality E(f(X)) ≥ f(E(X)), and the AM-GM
 * inequality from the concavity of log. From the Faculty schedule ("Convexity: Jensen's
 * inequality for general random variables, AM/GM inequality") and IA Probability Example
 * Sheet 3 Q1 (the harmonic mean is at most the arithmetic mean; (1/n) Σ y_i/x_i ≥ 1 for any
 * reordering y of x). The sheet has no official solutions; the reordering answers are
 * checked by trying every permutation, and the minima by a numerical search.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { int, pick, q, str, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { distinctFrom, expect, meanOf, nearestFraction, permutations, population, type Dist } from '../partv-c';
import { computedTex, listOf, math, t, texOfRational, type Rich } from '../rich';
import { worked, workedProof, type TopicContent } from '../topic';

const S3 = 'ia-prob-sheet-3' as const;
const recip = (r: Rational): Rational => q(r.den, r.num);

// ---------------------------------------------------------------- E(1/X)

const POS: readonly Dist[] = [
  { xs: [1, 2, 4], ps: [q(1, 4), q(1, 2), q(1, 4)] },
  { xs: [1, 3], ps: [q(1, 2), q(1, 2)] },
  { xs: [2, 3, 6], ps: [q(1, 3), q(1, 3), q(1, 3)] },
  { xs: [1, 2, 3, 6], ps: [q(1, 4), q(1, 4), q(1, 4), q(1, 4)] },
  { xs: [1, 4], ps: [q(2, 3), q(1, 3)] },
  { xs: [2, 5, 10], ps: [q(1, 5), q(2, 5), q(2, 5)] },
  { xs: [1, 2, 5], ps: [q(1, 2), q(1, 4), q(1, 4)] },
  { xs: [3, 4, 6], ps: [q(1, 6), q(1, 2), q(1, 3)] },
];
interface RecP { d: Dist }
const recVal = ({ d }: RecP): Rational => expect(d, (x) => q(1, x));
function recMis({ d }: RecP): [Rational, Rich][] {
  return [
    [recip(expect(d)), t`${math`\mathbb{E}(${1}/X) \ne ${1}/\mathbb{E}(X)`}: the reciprocal is convex, so Jensen's inequality makes ${math`\mathbb{E}(${1}/X)`} the larger. Average the reciprocals.`],
    [expect(d), t`That is ${math`\mathbb{E}(X)`}. Apply ${math`x \mapsto ${1}/x`} to each value, then weight by the probabilities.`],
    [meanOf(d.xs.map((x) => q(1, x))), t`The values are not equally likely: weight each ${math`${1}/x`} by ${math`\mathbb{P}(X = x)`}.`],
  ];
}

const reciprocalMean = generator<RecP>({
  id: 'reciprocal-mean',
  skill: 'Compute E(1/X) and see that it is at least 1/E(X), as Jensen\'s inequality says for the convex function 1/x.',
  params: (rng) => {
    for (;;) {
      const p: RecP = { d: pick(rng, POS) };
      if (distinctFrom(str(recVal(p)), recMis(p).map(([v]) => str(v))) >= 2) return p;
    }
  },
  sane: ({ d }) => (d.xs.every((x) => x > 0) ? null : 'not positive'),
  problem: ({ d }) => ({
    prompt: t`${math`X`} takes the values ${listOf(d.xs)} with probabilities ${computedTex(d.ps.map(texOfRational).join(', '))}, in that order. Find ${math`\mathbb{E}\left(\frac{${1}}{X}\right)`}.`,
    answer: { kind: 'exact', expected: str(recVal({ d })) },
    solution: [
      t`${math`\mathbb{E}(${1}/X) = \sum_{x} \frac{${1}}{x}\mathbb{P}(X = x) = ${recVal({ d })}`}.`,
      t`Compare ${math`${1}/\mathbb{E}(X) = ${recip(expect(d))}`}: smaller, as Jensen's inequality says, because ${math`x \mapsto ${1}/x`} is convex on ${math`(${0}, \infty)`}.`,
    ],
  }),
  solve: ({ d }) => str(meanOf(population(d).map((x) => q(1, x)))),
  misconceptions: (p): Misconception[] => recMis(p).map(([v, why]) => ({ response: str(v), why })),
});

// ---------------------------------------------------------------- AM-GM minimum

interface AmP { a: number; b: number }
const root = ({ a, b }: AmP): number => Math.round(Math.sqrt(a * b));
const amVal = (p: AmP): number => 2 * root(p);
function amMis(p: AmP): [Rational, Rich][] {
  return [
    [q(root(p)), t`AM-GM gives ${math`\frac{ax + b/x}{${2}} \ge \sqrt{ab}`}, so the sum is at least ${math`${2}\sqrt{ab}`}: double it.`],
    [q(p.a + p.b), t`That is the value at ${math`x = ${1}`}, which need not be the minimum.`],
    [q(root(p), p.a), t`That is where the minimum is, ${math`x = \sqrt{b/a}`}. The question asks for the minimum value.`],
  ];
}

const amgmMinimum = generator<AmP>({
  id: 'am-gm-minimum',
  skill: 'Find the minimum of ax + b/x for x > 0 with the AM-GM inequality, and where it is attained.',
  params: (rng) => {
    for (;;) {
      const a = int(rng, 1, 9);
      const s = int(rng, 1, 12);
      if ((s * s) % a !== 0) continue;
      const p: AmP = { a, b: (s * s) / a };
      if (p.a !== p.b && distinctFrom(String(amVal(p)), amMis(p).map(([v]) => str(v))) >= 2) return p;
    }
  },
  sane: (p) => (root(p) ** 2 === p.a * p.b ? null : 'ab is not a square'),
  problem: (p) => ({
    prompt: t`Find the minimum value of ${computedTex(`${p.a === 1 ? '' : p.a}x + \\frac{${p.b}}{x}`)} for ${math`x > ${0}`}.`,
    answer: { kind: 'exact', expected: String(amVal(p)) },
    solution: [
      t`AM-GM for the two positive numbers ${math`${p.a}x`} and ${math`${p.b}/x`}: ${math`\frac{${p.a}x + ${p.b}/x}{${2}} \ge \sqrt{${p.a}x \cdot \frac{${p.b}}{x}} = \sqrt{${p.a * p.b}} = ${root(p)}`}.`,
      t`So the sum is at least ${amVal(p)}, with equality when the two numbers are equal: ${math`${p.a}x = ${p.b}/x`}, that is ${math`x = ${q(root(p), p.a)}`}. The minimum is ${amVal(p)}.`,
    ],
  }),
  solve: (p) => {
    // Golden-section search on the convex function, then name the value.
    const f = (x: number): number => p.a * x + p.b / x;
    let [lo, hi] = [1e-3, 100];
    for (let i = 0; i < 200; i++) {
      const m1 = lo + (hi - lo) * 0.382;
      const m2 = lo + (hi - lo) * 0.618;
      if (f(m1) < f(m2)) hi = m2; else lo = m1;
    }
    return str(nearestFraction(f((lo + hi) / 2), 100));
  },
  misconceptions: (p): Misconception[] => amMis(p).map(([v, why]) => ({ response: str(v), why })),
});

// ---------------------------------------------------------------- harmonic mean

interface HmP { xs: readonly number[] }
const hmVal = ({ xs }: HmP): Rational => recip(meanOf(xs.map((x) => q(1, x))));
function hmMis({ xs }: HmP): [Rational, Rich][] {
  return [
    [meanOf(xs.map((x) => q(x))), t`That is the arithmetic mean. The harmonic mean is the reciprocal of the mean of the reciprocals, and never larger.`],
    [meanOf(xs.map((x) => q(1, x))), t`That is the mean of the reciprocals. Take its reciprocal.`],
    [q(xs.length, xs.reduce((a, b) => a + b, 0)), t`That is the reciprocal of the arithmetic mean. Average the reciprocals ${math`${1}/x_{i}`} first, then take the reciprocal.`],
  ];
}

const harmonicMean = generator<HmP>({
  id: 'harmonic-mean',
  skill: 'Compute a harmonic mean and compare it with the arithmetic mean, as in Sheet 3 Q1(a).',
  params: (rng) => {
    for (;;) {
      const n = int(rng, 2, 4);
      const xs = Array.from({ length: n }, () => int(rng, 1, 12));
      const p: HmP = { xs };
      if (new Set(xs).size === n && distinctFrom(str(hmVal(p)), hmMis(p).map(([v]) => str(v))) >= 2) return p;
    }
  },
  sane: ({ xs }) => (xs.every((x) => x > 0) ? null : 'not positive'),
  problem: (p) => ({
    prompt: t`Find the harmonic mean ${math`\left(\frac{${1}}{n}\sum_{i} \frac{${1}}{x_{i}}\right)^{-${1}}`} of the numbers ${listOf(p.xs)}.`,
    answer: { kind: 'exact', expected: str(hmVal(p)) },
    solution: [
      t`The mean of the reciprocals is ${computedTex(`\\frac{${1}}{${p.xs.length}}\\left(${p.xs.map((x) => `\\frac{${1}}{${x}}`).join(' + ')}\\right)`)} ${math`= ${meanOf(p.xs.map((x) => q(1, x)))}`}.`,
      t`Its reciprocal is ${hmVal(p)}, below the arithmetic mean ${meanOf(p.xs.map((x) => q(x)))}, as Q${1}(a) says.`,
    ],
  }),
  solve: ({ xs }) => {
    let s = 0;
    for (const x of xs) s += 1 / x;
    return str(nearestFraction(xs.length / s, 1_000_000));
  },
  misconceptions: (p): Misconception[] => hmMis(p).map(([v, why]) => ({ response: str(v), why })),
});

// ---------------------------------------------------------------- Cambridge problems

const q1a = workedProof({
  title: t`The harmonic mean is at most the arithmetic mean`,
  prompt: t`Let ${math`x_{${1}}, \ldots, x_{n}`} be positive real numbers. Show that ${math`\left(\frac{${1}}{n}\sum_{i = ${1}}^{n} \frac{${1}}{x_{i}}\right)^{-${1}} \le \frac{${1}}{n}\sum_{i = ${1}}^{n} x_{i}`}.`,
  steps: [
    t`Let ${math`X`} take each value ${math`x_{i}`} with probability ${math`${1}/n`} (counting repeats), so ${math`\mathbb{E}(X) = \frac{${1}}{n}\sum_{i} x_{i}`} and ${math`\mathbb{E}(${1}/X) = \frac{${1}}{n}\sum_{i} \frac{${1}}{x_{i}}`}.`,
    t`${math`f(x) = ${1}/x`} is convex on ${math`(${0}, \infty)`}: ${math`f''(x) = ${2}/x^{${3}} > ${0}`}. Jensen's inequality gives ${math`\mathbb{E}(${1}/X) \ge ${1}/\mathbb{E}(X)`}.`,
    t`Both sides are positive, so taking reciprocals reverses the inequality: ${math`\left(\mathbb{E}(${1}/X)\right)^{-${1}} \le \mathbb{E}(X)`}, which is the claim. Equality holds only when all the ${math`x_{i}`} are equal, since ${math`f`} is strictly convex.`,
  ],
  answer: t`Harmonic mean ${math`\le`} arithmetic mean, with equality exactly when all the numbers are equal.`,
  source: cite(S3, 'Q1(a)'),
});

const XS = [1, 2, 4];
const reorderValue = (ys: readonly number[]): Rational => meanOf(ys.map((y, i) => q(y, XS[i] as number)));
const allValues = permutations(XS.length).map((perm) => reorderValue(perm.map((j) => XS[j] as number)));
const byFloat = (r: Rational): number => Number(r.num) / Number(r.den);
const MAXV = allValues.reduce((m, v) => (byFloat(v) > byFloat(m) ? v : m));
const q1b = auto({
  id: 'ia-s3-q1-b-largest',
  source: cite(S3, 'Q1(b)', true),
  title: t`The largest value over all reorderings`,
  prompt: t`Let ${math`(x_{${1}}, x_{${2}}, x_{${3}}) = (${XS[0] as number}, ${XS[1] as number}, ${XS[2] as number})`}. Over all reorderings ${math`(y_{${1}}, y_{${2}}, y_{${3}})`} of these numbers, what is the largest value of ${math`\frac{${1}}{${3}}\sum_{i} \frac{y_{i}}{x_{i}}`}? (Q${1}(b) shows the smallest is ${1}.)`,
  answer: { kind: 'exact', expected: str(MAXV) },
  solution: [
    t`The ${6} reorderings give ${computedTex(allValues.map(texOfRational).join(', '))}.`,
    t`The largest, ${MAXV}, comes from the reversed order ${math`(${4}, ${2}, ${1})`}: put the largest ${math`y`} over the smallest ${math`x`}. The smallest is ${1}, at ${math`y = x`}, as AM-GM predicts: the product of the ${math`y_{i}/x_{i}`} is ${1}.`,
  ],
  reference: str(MAXV),
  verify: () => {
    const min = allValues.reduce((m, v) => (byFloat(v) < byFloat(m) ? v : m));
    const reversed = reorderValue([...XS].reverse());
    return same('min and max over every reordering', `${str(min)},${str(MAXV)}`, `1,${str(reversed)}`);
  },
  misconceptions: [
    { response: '1', why: t`${1} is the smallest value, at ${math`y = x`}. The largest pairs the largest ${math`y`} with the smallest ${math`x`}.` },
    { response: str(reorderValue([4, 1, 2])), why: t`Try the fully reversed order ${math`(${4}, ${2}, ${1})`}: it gives more.` },
  ],
});
// The value of the identity order, for the lesson.
const ID_VALUE = reorderValue(XS);

const q1bProof = supervision({
  id: 'ia-s3-q1-b',
  source: cite(S3, 'Q1(b)'),
  title: t`Any reordering gives at least ${1}`,
  prompt: t`Let ${math`x_{${1}}, \ldots, x_{n}`} be positive reals and ${math`y_{${1}}, \ldots, y_{n}`} any reordering of them. Show that ${math`\frac{${1}}{n}\sum_{i = ${1}}^{n} \frac{y_{i}}{x_{i}} \ge ${1}`}. Hint: what is ${math`\prod_{i} \frac{y_{i}}{x_{i}}`}? When does equality hold?`,
  writeUp: 'proof',
});
const scheduleJensen = supervision({
  id: 'schedule-jensen',
  source: cite('tripos-schedules', 'IA Probability, Inequalities and limits: "Convexity: Jensen\'s inequality for general random variables, AM/GM inequality."', true),
  title: t`Jensen for general random variables`,
  prompt: t`Let ${math`f: \mathbb{R} \to \mathbb{R}`} be convex. Show that at every point ${math`m`} there is a line ${math`\ell(x) = f(m) + \lambda(x - m)`} with ${math`f(x) \ge \ell(x)`} for all ${math`x`}, and deduce Jensen's inequality ${math`\mathbb{E}(f(X)) \ge f(\mathbb{E}(X))`} for any ${math`X`} with finite mean. Then prove the AM-GM inequality ${math`(x_{${1}} \cdots x_{n})^{${1}/n} \le \frac{${1}}{n}\sum_{i} x_{i}`} for positive reals, and say when equality holds.`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

const EX: Dist = POS[0] as Dist;

export const jensen: TopicContent = {
  topicId: 'ineq.jensen',
  goal: t`Recognise convex functions, prove and apply Jensen's inequality ${math`\mathbb{E}(f(X)) \ge f(\mathbb{E}(X))`}, and derive the AM-GM inequality from it.`,
  lesson: [
    { kind: 'p', text: t`A function curving upward, like ${math`x^{${2}}`} or ${math`e^{x}`}, lies below its chords. Averaging inputs and then applying it gives less than applying it and then averaging.` },
    { kind: 'rule', text: t`${math`f`} is a [[convex-function|convex function]] on an interval if ${math`f(tx + (${1} - t)y) \le tf(x) + (${1} - t)f(y)`} for all ${math`x, y`} in it and ${math`t \in [${0}, ${1}]`}. If ${math`f'' \ge ${0}`}, ${math`f`} is convex. A convex function lies above a line through each of its points: ${math`f(x) \ge f(m) + \lambda(x - m)`}. If ${math`-f`} is convex, ${math`f`} is concave.` },
    { kind: 'rule', text: t`[[jensen-inequality|Jensen's inequality]]: for convex ${math`f`} and ${math`X`} with finite mean, ${math`\mathbb{E}(f(X)) \ge f(\mathbb{E}(X))`}. Proof: take the line through ${math`(m, f(m))`} with ${math`m = \mathbb{E}(X)`}; then ${math`f(X) \ge f(m) + \lambda(X - m)`}, and taking means kills the last term. For concave ${math`f`} the inequality reverses.` },
    { kind: 'p', text: t`With ${math`f(x) = x^{${2}}`} it says ${math`\mathbb{E}(X^{${2}}) \ge \mathbb{E}(X)^{${2}}`}, that is, variance is never negative. With ${math`f(x) = ${1}/x`} on positive values it says ${math`\mathbb{E}(${1}/X) \ge ${1}/\mathbb{E}(X)`}: for ${math`X`} equal to ${listOf(EX.xs)} with probabilities ${computedTex(EX.ps.map(texOfRational).join(', '))}, ${math`\mathbb{E}(${1}/X) = ${recVal({ d: EX })}`}, against ${math`${1}/\mathbb{E}(X) = ${recip(expect(EX))}`}. For equally likely values this is Sheet ${3} Q${1}(a): the harmonic mean is at most the arithmetic mean.` },
    { kind: 'rule', text: t`The [[am-gm|AM-GM inequality]]: for positive ${math`x_{${1}}, \ldots, x_{n}`}, ${math`(x_{${1}} x_{${2}} \cdots x_{n})^{${1}/n} \le \frac{x_{${1}} + \cdots + x_{n}}{n}`}, with equality only when all are equal. Proof: ${math`\log`} is concave, so for ${math`X`} uniform on the ${math`x_{i}`}, ${math`\mathbb{E}(\log X) \le \log \mathbb{E}(X)`}; exponentiate.` },
    { kind: 'p', text: t`AM-GM finds minima without calculus: ${math`ax + b/x \ge ${2}\sqrt{ab}`} for ${math`x > ${0}`}, with equality at ${math`x = \sqrt{b/a}`}. And in Q${1}(b), the numbers ${math`y_{i}/x_{i}`} have product ${1}, so their mean is at least ${1}; for ${math`(${1}, ${2}, ${4})`} itself the mean is ${ID_VALUE}, and the largest over all reorderings is ${MAXV}.` },
  ],
  examples: [
    q1a,
    worked(reciprocalMean, { d: POS[1] as Dist }, t`The mean of a reciprocal`),
    worked(amgmMinimum, { a: 4, b: 9 }, t`A minimum by AM-GM`),
  ],
  generators: [reciprocalMean, amgmMinimum, harmonicMean],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['convex-function', 'jensen-inequality', 'am-gm'],
  cambridge: [q1b, q1bProof, scheduleJensen],
  gate: ['ia-s3-q1-b-largest', 'ia-s3-q1-b'],
};
