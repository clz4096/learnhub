/**
 * ineq.jensen: convex functions, Jensen's inequality E(f(X)) ≥ f(E(X)), and the AM-GM
 * inequality from the concavity of log. From the Faculty schedule ("Convexity: Jensen's
 * inequality for general random variables, AM/GM inequality") and IA Probability Example
 * Sheet 3 Q1 (the harmonic mean is at most the arithmetic mean; (1/n) Σ y_i/x_i ≥ 1 for any
 * reordering y of x). The sheet has no official solutions; the reordering answers are
 * checked by trying every permutation, and the minima by a numerical search. The gate adds
 * MIT 18.600 Problem Set 10, C(a) (relative entropy is non-negative), asked through Jensen.
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { int, pick, q, str, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { distinctFrom, expect, meanOf, nearestFraction, permutations, population, type Dist } from '../partv-c';
import { computedTex, dmath, listOf, math, t, texOfRational, type Rich } from '../rich';
import { checkFrom, worked, workedProof, type TopicContent } from '../topic';

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
    t`To make a sum of ratios large, put large numerators over small denominators.`,
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
  nudge: t`Not quite. With only six reorderings, listing the value of each is quick and certain.`,
  hints: [
    t`How many reorderings of three numbers are there?`,
    t`Which ratios ${math`\frac{y_{i}}{x_{i}}`} grow when a large ${math`y`} sits over a small ${math`x`}?`,
    t`Which reordering puts the largest ${math`y`} over the smallest ${math`x`}, and what value does it give?`,
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
  hints: [
    t`What is the product of the ${math`n`} ratios ${math`\frac{y_{i}}{x_{i}}`}, and why?`,
    t`Which inequality links the mean of ${math`n`} positive numbers to their product?`,
    t`When does that inequality hold with equality, and what does that say about each ${math`y_{i}`} compared with ${math`x_{i}`}?`,
  ],
});
const scheduleJensen = supervision({
  id: 'schedule-jensen',
  source: cite('tripos-schedules', 'IA Probability, Inequalities and limits: "Convexity: Jensen\'s inequality for general random variables, AM/GM inequality."', true),
  title: t`Jensen for general random variables`,
  prompt: t`Let ${math`f: \mathbb{R} \to \mathbb{R}`} be convex. Show that at every point ${math`m`} there is a line ${math`\ell(x) = f(m) + \lambda(x - m)`} with ${math`f(x) \ge \ell(x)`} for all ${math`x`}, and deduce Jensen's inequality ${math`\mathbb{E}(f(X)) \ge f(\mathbb{E}(X))`} for any ${math`X`} with finite mean. Then prove the AM-GM inequality ${math`(x_{${1}} \cdots x_{n})^{${1}/n} \le \frac{${1}}{n}\sum_{i} x_{i}`} for positive reals, and say when equality holds.`,
  writeUp: 'proof',
  hints: [
    t`For convex ${math`f`}, how do the slopes of chords to the left and to the right of ${math`m`} compare, and which ${math`\lambda`} lies between them?`,
    t`With ${math`f(x) \ge f(m) + \lambda(x - m)`} for all ${math`x`}, what follows on putting ${math`x = X`}, ${math`m = \mathbb{E}(X)`}, and taking expectations?`,
    t`For AM-GM, which convex function and which random variable with ${math`n`} equally likely values turn Jensen's inequality into AM-GM?`,
  ],
});

// MIT 18.600 (Fall 2019) Problem Set 10, Problem C(a): relative entropy is never negative
// (Gibbs' inequality). The set suggests calculus; here it is asked through Jensen, so adapted.
const mitC = supervision({
  id: 'mit-ps10-c-a',
  source: cite('mit-18600-ps10', 'Problem C(a)', true),
  title: t`Expected smugness is never negative`,
  prompt: t`There are ${math`n`} possible outcomes of a tournament. I assign them probabilities ${math`p_{${1}}, \ldots, p_{n}`} and you assign ${math`q_{${1}}, \ldots, q_{n}`}, all positive. If outcome ${math`i`} occurs, my smugness is ${math`\log\frac{p_{i}}{q_{i}}`}, so before the event my expected smugness is ${math`\sum_{i} p_{i}\log\frac{p_{i}}{q_{i}}`}. Show, using Jensen's inequality, that my expected smugness is always non-negative, and that it is zero if and only if ${math`p_{i} = q_{i}`} for all ${math`i`}. State which random variable Jensen's inequality is applied to, and why the equality case follows.`,
  writeUp: 'proof',
  hints: [
    t`Is ${math`-\log`} convex or concave?`,
    t`Under the probabilities ${math`p_{i}`}, which random variable takes the value ${math`\frac{q_{i}}{p_{i}}`} on outcome ${math`i`}, and what is its mean?`,
    t`When does Jensen's inequality hold with equality for a strictly convex function?`,
  ],
});

// ---------------------------------------------------------------- lesson

const EX: Dist = POS[0] as Dist;
const SQ: Dist = { xs: [1, 3], ps: [q(1, 2), q(1, 2)] };
const sqMean = expect(SQ);
const sqOfMean = expect(SQ, (x) => q(x * x));

export const jensen: TopicContent = {
  topicId: 'ineq.jensen',
  goal: t`Recognise convex functions, prove and apply Jensen's inequality ${math`\mathbb{E}(f(X)) \ge f(\mathbb{E}(X))`}, and derive the AM-GM inequality from it.`,
  objective: t`Prove Jensen's inequality for convex functions, and derive the AM-GM inequality from it.`,
  why: t`It compares averages of functions with functions of averages; AM-GM finds minima with no calculus at all.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`Average, then square?` },
    { kind: 'hook', text: t`A random number ${math`X`} is ${1} or ${3}, each with probability ${q(1, 2)}. Average it and then square: ${math`(\mathbb{E}X)^{${2}} = ${sqMean}^{${2}} = ${sqMean.num * sqMean.num}`}. Square it and then average: ${math`\mathbb{E}(X^{${2}}) = \frac{${1} + ${9}}{${2}} = ${sqOfMean}`}. The second is bigger. Is that luck, or a law?` },
    { kind: 'narrative', text: t`Picture the parabola ${math`y = x^{${2}}`} and the two points on it above ${1} and ${3}. Join them with a straight line, a chord. The average of the squares, ${sqOfMean}, is the height of the chord above the midpoint ${sqMean}. The square of the average, ${sqMean.num * sqMean.num}, is the height of the curve there. The curve sags below its chord. Functions that always do that are the subject of this lesson.` },

    { kind: 'section', title: t`Convex functions` },
    { kind: 'definition', name: t`Convex function`, formal: t`A function ${math`f`} on an interval ${math`I`} is [[convex-function|convex]] if for all ${math`x, y \in I`} and all ${math`t \in [${0}, ${1}]`}, ${dmath`f(tx + (${1} - t)y) \le t f(x) + (${1} - t) f(y).`} It is concave if ${math`-f`} is convex.`, plain: t`The point ${math`tx + (${1} - t)y`} runs between ${math`x`} and ${math`y`} as ${math`t`} goes from ${1} to ${0}; the right side is the height of the chord there. Convex means the curve never rises above its chords. With ${math`f(x) = x^{${2}}`}, ${math`x = ${1}`}, ${math`y = ${3}`}, ${math`t = ${q(1, 2)}`}: ${math`${4} \le ${5}`}.` },
    { kind: 'p', text: t`A test you can use: if ${math`f`} is twice differentiable and ${math`f''(x) \ge ${0}`} on ${math`I`}, then ${math`f`} is convex. So ${math`x^{${2}}`}, ${math`e^{x}`}, and ${math`${1}/x`} on ${math`x > ${0}`} are convex, and ${math`\log x`} is concave, since its second derivative is ${math`-${1}/x^{${2}}`}.`, why: { q: t`Why does ${math`f'' \ge ${0}`} give convexity?`, a: t`${math`f'' \ge ${0}`} means the slope ${math`f'`} never decreases. A curve whose slope only increases bends upward, so it stays below each chord. (A proof uses the mean value theorem on each half of the chord.)` } },
    { kind: 'theorem', name: t`Supporting line`, statement: t`If ${math`f`} is convex on an open interval ${math`I`} and ${math`m \in I`}, there is a number ${math`\lambda`} with ${dmath`f(x) \ge f(m) + \lambda(x - m) \quad \text{for all } x \in I.`}` },
    { kind: 'p', text: t`In plain words: at every point you can lay a straight line that touches the curve there and stays below it everywhere. For a smooth ${math`f`}, the tangent works, with ${math`\lambda = f'(m)`}. For ${math`x^{${2}}`} at ${math`m = ${2}`}: ${math`x^{${2}} \ge ${4} + ${4}(x - ${2})`}, which rearranges to ${math`(x - ${2})^{${2}} \ge ${0}`}.`, why: { q: t`Why is there such a line for a general convex function?`, a: t`From the definition, the chord slopes ${math`\frac{f(x) - f(m)}{x - m}`} increase with ${math`x`}. So every chord slope to the left of ${math`m`} is at most every chord slope to the right. Choose ${math`\lambda`} between them: then the line lies below the curve on both sides. This proof is a supervision problem below.` } },

    { kind: 'section', title: t`Jensen's inequality` },
    { kind: 'theorem', name: t`Jensen's inequality`, statement: t`If ${math`f`} is convex on an open interval ${math`I`}, and ${math`X`} takes values in ${math`I`} with ${math`\mathbb{E}(X)`} and ${math`\mathbb{E}(f(X))`} finite, then ${dmath`\mathbb{E}(f(X)) \ge f(\mathbb{E}(X)).`} If ${math`f`} is concave, the inequality reverses.` },
    { kind: 'p', text: t`This is [[jensen-inequality|Jensen's inequality]]. The idea in one line: put the supporting line at the mean, and take expectations of both sides.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Choose the point`, text: t`Let ${math`m = \mathbb{E}(X)`}. It lies in ${math`I`}, because ${math`X`} does.`, why: { q: t`Why is the mean in ${math`I`}?`, a: t`An average of numbers in an interval lies in that interval: if ${math`X > a`} always, then ${math`\mathbb{E}(X) > a`}, and likewise for an upper end.` } },
        { label: t`Lay the line`, text: t`By the supporting line theorem there is a ${math`\lambda`} with ${math`f(x) \ge f(m) + \lambda(x - m)`} for every ${math`x \in I`}. Put ${math`x = X`}:`, eq: [dmath`f(X) \ge f(m) + \lambda(X - m).`], plain: t`This holds for every outcome, so it holds as an inequality between random variables.` },
        { label: t`Take means`, text: t`Expectation keeps inequalities and is linear, so`, eq: [dmath`\mathbb{E}(f(X)) \ge f(m) + \lambda(\mathbb{E}(X) - m) = f(m).`], plain: t`The last term is ${0}, because ${math`m`} was chosen to be ${math`\mathbb{E}(X)`}.` },
        { label: t`Concave case`, text: t`If ${math`f`} is concave, apply the result to the convex ${math`-f`}, and multiply by ${math`-${1}`}, which reverses the inequality.` },
      ],
    },
    { kind: 'p', text: t`Two quick consequences. With ${math`f(x) = x^{${2}}`}: ${math`\mathbb{E}(X^{${2}}) \ge (\mathbb{E}X)^{${2}}`}, so a variance is never negative. With ${math`f(x) = ${1}/x`} on positive values: ${math`\mathbb{E}(${1}/X) \ge ${1}/\mathbb{E}(X)`}. For ${math`X`} equal to ${listOf(EX.xs)} with probabilities ${computedTex(EX.ps.map(texOfRational).join(', '))}: ${math`\mathbb{E}(${1}/X) = ${recVal({ d: EX })}`}, against ${math`${1}/\mathbb{E}(X) = ${recip(expect(EX))}`}.` },
    checkFrom(reciprocalMean, { d: POS[2] as Dist }, t`${math`\frac{${1}}{${3}}\left(\frac{${1}}{${2}} + \frac{${1}}{${3}} + \frac{${1}}{${6}}\right) = \frac{${1}}{${3}}`}, which is more than ${math`${1}/\mathbb{E}(X) = ${recip(expect(POS[2] as Dist))}`}, as Jensen says.`),

    { kind: 'section', title: t`AM-GM` },
    { kind: 'theorem', name: t`AM-GM`, statement: t`For positive real numbers ${math`x_{${1}}, \ldots, x_{n}`}, ${dmath`(x_{${1}} x_{${2}} \cdots x_{n})^{${1}/n} \le \frac{x_{${1}} + x_{${2}} + \cdots + x_{n}}{n},`} with equality only when all the ${math`x_{i}`} are equal.` },
    { kind: 'p', text: t`This is the [[am-gm|AM-GM inequality]]: the geometric mean (left) is at most the arithmetic mean (right). For ${math`${2}`} and ${math`${8}`}: ${math`\sqrt{${16}} = ${4} \le ${5}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Make it a random variable`, text: t`Let ${math`X`} take each value ${math`x_{i}`} with probability ${math`${1}/n`}. Then ${math`\mathbb{E}(X) = \frac{${1}}{n}\sum_{i} x_{i}`}.` },
        { label: t`Apply Jensen to ${math`\log`}`, text: t`${math`\log`} is concave on ${math`(${0}, \infty)`}, so ${math`\mathbb{E}(\log X) \le \log \mathbb{E}(X)`}, that is`, eq: [dmath`\frac{${1}}{n}\sum_{i} \log x_{i} \le \log\left(\frac{${1}}{n}\sum_{i} x_{i}\right).`] },
        { label: t`Tidy the left side`, text: t`${math`\frac{${1}}{n}\sum_{i} \log x_{i} = \frac{${1}}{n}\log(x_{${1}} \cdots x_{n}) = \log\left((x_{${1}} \cdots x_{n})^{${1}/n}\right)`}.`, why: { q: t`Which rules of logarithms is that?`, a: t`A sum of logs is the log of the product, and ${math`c \log y = \log(y^{c})`}.` } },
        { label: t`Exponentiate`, text: t`${math`e^{x}`} is increasing, so applying it to both sides keeps the inequality, and ${math`e^{\log y} = y`}. This gives AM-GM.`, plain: t`Equality in Jensen for a strictly concave function needs ${math`X`} to be constant, so all the ${math`x_{i}`} equal.` },
      ],
    },
    { kind: 'p', text: t`AM-GM finds minima without calculus. For ${math`x > ${0}`}, apply it to the two numbers ${math`ax`} and ${math`b/x`}: their product is ${math`ab`}, so ${math`ax + b/x \ge ${2}\sqrt{ab}`}, with equality when ${math`ax = b/x`}.` },
    checkFrom(amgmMinimum, { a: 1, b: 16 }, t`${math`x + ${16}/x \ge ${2}\sqrt{${16}} = ${8}`}, with equality at ${math`x = ${4}`}.`),

    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`${math`\mathbb{E}(f(X)) = f(\mathbb{E}(X))`}, so the mean of ${math`${1}/X`} is ${math`${1}`} over the mean.`, counterexample: t`For ${math`X`} equal to ${1} or ${3} with equal chances, ${math`\mathbb{E}(${1}/X) = ${q(2, 3)}`} but ${math`${1}/\mathbb{E}(X) = ${q(1, 2)}`}. Equality needs ${math`f`} linear or ${math`X`} constant.` },
    { kind: 'pitfall', claim: t`Jensen's inequality works the same way for every function.`, counterexample: t`For the concave ${math`\log`}, it reverses: ${math`\mathbb{E}(\log X) \le \log \mathbb{E}(X)`}. Check the direction of curvature first.` },
    { kind: 'pitfall', claim: t`AM-GM holds for any real numbers.`, counterexample: t`With ${math`-${1}`} and ${math`-${4}`}, the geometric mean ${math`\sqrt{${4}} = ${2}`} exceeds the arithmetic mean ${math`-${q(5, 2)}`}. The numbers must be positive, so that ${math`\log`} applies.` },
    { kind: 'takeaway', text: t`For convex ${math`f`}, the average of ${math`f`} is at least ${math`f`} of the average, because the curve lies above a line through its mean point.` },
  ],
  examples: [
    { ...q1a, examiner: t`The examiner looks for the numbers turned into a random variable, convexity of ${math`${1}/x`} justified, and the reversal of the inequality when taking reciprocals explained.` },
    worked(reciprocalMean, { d: POS[1] as Dist }, t`The mean of a reciprocal`),
    worked(amgmMinimum, { a: 4, b: 9 }, t`A minimum by AM-GM`),
  ],
  generators: [reciprocalMean, amgmMinimum, harmonicMean],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['convex-function', 'jensen-inequality', 'am-gm'],
  cambridge: withUses([q1b, q1bProof, scheduleJensen, mitC], {
    'ia-s3-q1-b': { sections: ['AM-GM'], note: t`AM-GM on ratios of a reordering` },
    'mit-ps10-c-a': { sections: ["Jensen's inequality"], note: t`Jensen with the logarithm: expected smugness` },
  }),
  // The sheet's proof is the test; the largest reordering is a search over six cases, which does
  // not need Jensen. MIT 18.600's relative entropy (Gibbs' inequality) is the second gate.
  gate: ['ia-s3-q1-b', 'mit-ps10-c-a'],
  recall: [
    { front: t`Define a convex function.`, back: t`${math`f(tx + (${1} - t)y) \le tf(x) + (${1} - t)f(y)`} for all ${math`x, y`} and ${math`t \in [${0}, ${1}]`}: the curve lies below its chords.` },
    { front: t`State Jensen's inequality.`, back: t`For convex ${math`f`}, ${math`\mathbb{E}(f(X)) \ge f(\mathbb{E}(X))`}; reversed for concave ${math`f`}.` },
    { front: t`State AM-GM.`, back: t`For positive ${math`x_{i}`}, ${math`(x_{${1}} \cdots x_{n})^{${1}/n} \le \frac{${1}}{n}\sum x_{i}`}, with equality only when all are equal.` },
  ],
  proofOrder: [
    {
      title: t`Jensen's inequality`,
      steps: [
        t`Let ${math`m = \mathbb{E}(X)`}.`,
        t`Take a supporting line at ${math`m`}: ${math`f(x) \ge f(m) + \lambda(x - m)`}.`,
        t`Put ${math`x = X`} and take expectations.`,
        t`The term ${math`\lambda(\mathbb{E}X - m)`} is ${0}, leaving ${math`\mathbb{E}f(X) \ge f(m)`}.`,
      ],
    },
    {
      title: t`AM-GM from Jensen`,
      steps: [
        t`Let ${math`X`} be uniform on ${math`x_{${1}}, \ldots, x_{n}`}.`,
        t`${math`\log`} is concave, so ${math`\mathbb{E}(\log X) \le \log \mathbb{E}(X)`}.`,
        t`The left side is the log of the geometric mean.`,
        t`Exponentiate, which keeps the inequality.`,
      ],
    },
  ],
};
