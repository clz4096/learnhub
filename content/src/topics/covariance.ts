/**
 * rv.covariance: cov(X, Y) = E(XY) - E(X)E(Y), the variance of a sum
 * var(X + Y) = var X + var Y + 2 cov(X, Y), bilinearity, and the correlation coefficient.
 * From the Faculty schedule ("Covariance"; "Correlation coefficient"), IA Probability
 * Example Sheet 2 Q9 (the variance of a sum of independent indicators) and Q12 (the
 * variance of the number of record years), and Sheet 4 Q12(a) (cov(Σ a_i X_i, Σ b_i X_i)
 * = σ^2 Σ a_i b_i). The sheets have no official solutions; the answers are checked by
 * summing over every outcome and listing every permutation.
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { add, int, mul, pick, q, str, sub, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { distinctFrom, expect, meanOf, permutations, variance, type Dist } from '../partv-c';
import { computedTex, math, t, texOfRational, type Rich } from '../rich';
import { quickCheck, worked, workedCambridge, type TopicContent } from '../topic';

const S2 = 'ia-prob-sheet-2' as const;
const S4 = 'ia-prob-sheet-4' as const;

// ---------------------------------------------------------------- covariance from a joint table

interface TabP { xs: readonly number[]; ys: readonly number[]; counts: readonly (readonly number[])[]; total: number }
const cell = (p: TabP, i: number, j: number): Rational => q((p.counts[i] as number[])[j] as number, p.total);
const ex = (p: TabP): Rational => p.xs.reduce((a, x, i) => add(a, mul(q(x), p.ys.reduce((s, _, j) => add(s, cell(p, i, j)), q(0)))), q(0));
const ey = (p: TabP): Rational => p.ys.reduce((a, y, j) => add(a, mul(q(y), p.xs.reduce((s, _, i) => add(s, cell(p, i, j)), q(0)))), q(0));
const exy = (p: TabP): Rational => p.xs.reduce((a, x, i) => p.ys.reduce((s, y, j) => add(s, mul(q(x * y), cell(p, i, j))), a), q(0));
const covVal = (p: TabP): Rational => sub(exy(p), mul(ex(p), ey(p)));
function covMis(p: TabP): [Rational, Rich][] {
  return [
    [exy(p), t`That is ${math`\mathbb{E}(XY)`}. Subtract ${math`\mathbb{E}(X)\mathbb{E}(Y) = ${mul(ex(p), ey(p))}`}.`],
    [mul(ex(p), ey(p)), t`That is ${math`\mathbb{E}(X)\mathbb{E}(Y)`}. The covariance is ${math`\mathbb{E}(XY) - \mathbb{E}(X)\mathbb{E}(Y)`}.`],
    [add(exy(p), mul(ex(p), ey(p))), t`Check the sign: ${math`\operatorname{cov}(X, Y) = \mathbb{E}(XY) - \mathbb{E}(X)\mathbb{E}(Y)`}.`],
  ];
}
const VALUE_SETS: readonly (readonly number[])[] = [[0, 1], [1, 2], [-1, 1], [0, 2], [0, 1, 2], [-1, 0, 1], [1, 2, 3]];

const covFromTable = generator<TabP>({
  id: 'cov-from-table',
  skill: 'Compute a covariance from a joint table as E(XY) - E(X)E(Y).',
  params: (rng) => {
    for (;;) {
      const xs = pick(rng, VALUE_SETS.filter((v) => v.length === 2));
      const ys = pick(rng, VALUE_SETS);
      const total = pick(rng, [10, 12, 16, 20]);
      const k = xs.length * ys.length;
      // A random composition of the total into k positive counts.
      const cuts = new Set<number>();
      while (cuts.size < k - 1) cuts.add(int(rng, 1, total - 1));
      const sorted = [0, ...[...cuts].sort((a, b) => a - b), total];
      const flat = sorted.slice(1).map((c, i) => c - (sorted[i] as number));
      const counts = xs.map((_, i) => flat.slice(i * ys.length, (i + 1) * ys.length));
      const p: TabP = { xs, ys, counts, total };
      if (covVal(p).num !== 0n && distinctFrom(str(covVal(p)), covMis(p).map(([v]) => str(v))) >= 2) return p;
    }
  },
  sane: (p) => (p.counts.flat().every((c) => c > 0) && p.counts.flat().reduce((a, b) => a + b, 0) === p.total ? null : 'not a distribution'),
  problem: (p) => {
    const cells = computedTex(p.xs.flatMap((x, i) => p.ys.map((y, j) => `\\mathbb{P}(X = ${x}, Y = ${y}) = ${texOfRational(cell(p, i, j))}`)).join(',\\ '));
    return {
      prompt: t`The joint distribution of ${math`X`} and ${math`Y`} is ${cells}. Find ${math`\operatorname{cov}(X, Y)`}.`,
      answer: { kind: 'exact', expected: str(covVal(p)) },
      solution: [
        t`From the margins, ${math`\mathbb{E}(X) = ${ex(p)}`} and ${math`\mathbb{E}(Y) = ${ey(p)}`}. From the cells, ${math`\mathbb{E}(XY) = \sum_{x, y} xy\,\mathbb{P}(X = x, Y = y) = ${exy(p)}`}.`,
        t`${math`\operatorname{cov}(X, Y) = \mathbb{E}(XY) - \mathbb{E}(X)\mathbb{E}(Y) = ${exy(p)} - ${mul(ex(p), ey(p))} = ${covVal(p)}`}.`,
      ],
    };
  },
  solve: (p) => {
    // The definition, E((X - E X)(Y - E Y)), over a population of total equally likely pairs.
    const pairs: [number, number][] = [];
    p.xs.forEach((x, i) => p.ys.forEach((y, j) => { for (let c = 0; c < ((p.counts[i] as number[])[j] as number); c++) pairs.push([x, y]); }));
    const mx = meanOf(pairs.map(([x]) => q(x)));
    const my = meanOf(pairs.map(([, y]) => q(y)));
    return str(meanOf(pairs.map(([x, y]) => mul(sub(q(x), mx), sub(q(y), my)))));
  },
  misconceptions: (p): Misconception[] => covMis(p).map(([v, why]) => ({ response: str(v), why })),
});

// ---------------------------------------------------------------- the variance of a combination

interface CombP { a: number; b: number; sx: number; sy: number; rho: Rational; viaRho: boolean }
const covOf = (p: CombP): Rational => mul(p.rho, q(p.sx * p.sy));
const combVal = (p: CombP): Rational => add(q(p.a * p.a * p.sx * p.sx + p.b * p.b * p.sy * p.sy), mul(q(2 * p.a * p.b), covOf(p)));
function combMis(p: CombP): [Rational, Rich][] {
  const base = q(p.a * p.a * p.sx * p.sx + p.b * p.b * p.sy * p.sy);
  const out: [Rational, Rich][] = [
    [base, t`That leaves out the covariance term. Variances add only when ${math`X`} and ${math`Y`} are uncorrelated: here add ${math`${2}ab\operatorname{cov}(X, Y)`}.`],
    [add(q(p.a * p.sx * p.sx + p.b * p.sy * p.sy), mul(q(2 * p.a * p.b), covOf(p))), t`Constants come out of a variance squared: ${math`\operatorname{var}(aX) = a^{${2}}\operatorname{var}(X)`}.`],
    [sub(base, mul(q(2 * p.a * p.b), covOf(p))), t`Check the sign of the cross term: ${math`\operatorname{var}(aX + bY) = a^{${2}}\operatorname{var} X + b^{${2}}\operatorname{var} Y + ${2}ab\operatorname{cov}(X, Y)`}, with ${math`a = ${p.a}`} and ${math`b = ${p.b}`} as they are.`],
  ];
  if (p.viaRho) out.push([add(base, mul(q(2 * p.a * p.b), p.rho)), t`The correlation is not the covariance: ${math`\operatorname{cov}(X, Y) = \rho\,\sigma_{X}\sigma_{Y} = ${covOf(p)}`}.`]);
  return out;
}
const RHOS: readonly Rational[] = [q(1, 2), q(-1, 2), q(1, 4), q(-1, 4), q(1, 3), q(-1, 3), q(3, 4), q(-3, 4)];
const COEFS = [-3, -2, -1, 1, 2, 3];

const varianceOfCombination = generator<CombP>({
  id: 'variance-of-combination',
  skill: 'Find the variance of aX + bY from the variances and the covariance or correlation.',
  params: (rng) => {
    for (;;) {
      const p: CombP = { a: pick(rng, COEFS), b: pick(rng, COEFS), sx: int(rng, 1, 4), sy: int(rng, 1, 4), rho: pick(rng, RHOS), viaRho: rng() < 0.5 };
      if (distinctFrom(str(combVal(p)), combMis(p).map(([v]) => str(v))) >= 2) return p;
    }
  },
  sane: (p) => (combVal(p).num >= 0n ? null : 'negative variance'),
  problem: (p) => {
    const given = p.viaRho
      ? t`standard deviations ${math`\sigma_{X} = ${p.sx}`} and ${math`\sigma_{Y} = ${p.sy}`}, and correlation coefficient ${math`\rho = ${p.rho}`}`
      : t`${math`\operatorname{var}(X) = ${p.sx * p.sx}`}, ${math`\operatorname{var}(Y) = ${p.sy * p.sy}`}, and ${math`\operatorname{cov}(X, Y) = ${covOf(p)}`}`;
    return {
      prompt: t`Random variables ${math`X`} and ${math`Y`} have ${given}. Find ${computedTex(`\\operatorname{var}(${p.a === 1 ? '' : p.a === -1 ? '-' : String(p.a)}X ${p.b < 0 ? '-' : '+'} ${Math.abs(p.b) === 1 ? '' : String(Math.abs(p.b))}Y)`)}.`,
      answer: { kind: 'exact', expected: str(combVal(p)) },
      solution: [
        ...(p.viaRho ? [t`First ${math`\operatorname{cov}(X, Y) = \rho\,\sigma_{X}\sigma_{Y} = ${p.rho} \cdot ${p.sx} \cdot ${p.sy} = ${covOf(p)}`}.`] : []),
        t`By bilinearity, ${math`\operatorname{var}(aX + bY) = a^{${2}}\operatorname{var}(X) + b^{${2}}\operatorname{var}(Y) + ${2}ab\operatorname{cov}(X, Y)`}.`,
        t`${computedTex(`${p.a * p.a} \\cdot ${p.sx * p.sx} + ${p.b * p.b} \\cdot ${p.sy * p.sy} + ${2 * p.a * p.b < 0 ? `(${2 * p.a * p.b})` : 2 * p.a * p.b} \\cdot ${covOf(p).num < 0n ? `\\left(${texOfRational(covOf(p))}\\right)` : texOfRational(covOf(p))}`)} ${math`= ${combVal(p)}`}.`,
      ],
    };
  },
  solve: (p) => {
    // The quadratic form c^T Σ c with the covariance matrix, entry by entry.
    const c = [p.a, p.b];
    const sigma = [[q(p.sx * p.sx), covOf(p)], [covOf(p), q(p.sy * p.sy)]];
    let total = q(0);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) total = add(total, mul(q((c[i] as number) * (c[j] as number)), (sigma[i] as Rational[])[j] as Rational));
    return str(total);
  },
  misconceptions: (p): Misconception[] => combMis(p).map(([v, why]) => ({ response: str(v), why })),
});

// ---------------------------------------------------------------- variance of a count of independent successes

interface IndP { ps: readonly Rational[] }
const indVal = ({ ps }: IndP): Rational => ps.reduce((a, p) => add(a, mul(p, sub(q(1), p))), q(0));
function indMis({ ps }: IndP): [Rational, Rich][] {
  const mean = ps.reduce((a, b) => add(a, b), q(0));
  const avg = mul(mean, q(1, ps.length));
  return [
    [mean, t`That is ${math`\mathbb{E}(N) = \sum_{i} p_{i}`}. Each indicator has variance ${math`p_{i}(${1} - p_{i})`}, and these add by independence.`],
    [ps.reduce((a, p) => add(a, mul(p, p)), q(0)), t`The variance of an indicator is ${math`\mathbb{E}(I^{${2}}) - \mathbb{E}(I)^{${2}} = p - p^{${2}}`}, not ${math`p^{${2}}`}.`],
    [mul(q(ps.length), mul(avg, sub(q(1), avg))), t`The trials have different probabilities, so ${math`N`} is not binomial. Add the variances ${math`p_{i}(${1} - p_{i})`} one trial at a time.`],
  ];
}
const PROBS: readonly Rational[] = [q(1, 2), q(1, 3), q(2, 3), q(1, 4), q(3, 4), q(1, 5), q(2, 5), q(1, 6), q(5, 6)];

const indicatorVariance = generator<IndP>({
  id: 'indicator-variance',
  skill: 'Find the variance of the number of successes in independent trials with different probabilities, as in Sheet 2 Q9.',
  params: (rng) => {
    for (;;) {
      const n = int(rng, 3, 4);
      const ps = Array.from({ length: n }, () => pick(rng, PROBS));
      const p: IndP = { ps };
      if (new Set(ps.map(str)).size >= 2 && distinctFrom(str(indVal(p)), indMis(p).map(([v]) => str(v))) >= 2) return p;
    }
  },
  sane: ({ ps }) => (ps.every((p) => p.num > 0n && p.num < p.den) ? null : 'out of range'),
  problem: (p) => ({
    prompt: t`In a sequence of ${p.ps.length} independent trials, the probabilities of success are ${computedTex(p.ps.map(texOfRational).join(', '))}. Let ${math`N`} be the total number of successes. Find ${math`\operatorname{var}(N)`}.`,
    answer: { kind: 'exact', expected: str(indVal(p)) },
    solution: [
      t`${math`N = \sum_{i} I_{i}`}, where ${math`I_{i}`} indicates success at trial ${math`i`}: ${math`\operatorname{var}(I_{i}) = p_{i}(${1} - p_{i})`}.`,
      t`The ${math`I_{i}`} are independent, so all covariances vanish and ${math`\operatorname{var}(N) = \sum_{i} p_{i}(${1} - p_{i})`} ${computedTex(`= ${p.ps.map((r) => `${texOfRational(r)} \\cdot ${texOfRational(sub(q(1), r))}`).join(' + ')}`)} ${math`= ${indVal(p)}`}.`,
    ],
  }),
  solve: ({ ps }) => {
    // Every pattern of successes and failures, with its probability: E(N^2) - E(N)^2.
    let [m1, m2] = [q(0), q(0)];
    for (let mask = 0; mask < 1 << ps.length; mask++) {
      let w = q(1);
      let n = 0;
      ps.forEach((p, i) => { if ((mask >> i) & 1) { w = mul(w, p); n++; } else w = mul(w, sub(q(1), p)); });
      m1 = add(m1, mul(w, q(n)));
      m2 = add(m2, mul(w, q(n * n)));
    }
    return str(sub(m2, mul(m1, m1)));
  },
  misconceptions: (p): Misconception[] => indMis(p).map(([v, why]) => ({ response: str(v), why })),
});

// ---------------------------------------------------------------- Cambridge problems

const RN = 5;
const recordVar = Array.from({ length: RN }, (_, k) => sub(q(1, k + 1), q(1, (k + 1) * (k + 1)))).reduce((a, b) => add(a, b), q(0));
/** var(N) for the number of record years in a uniformly random ranking of n years, over every permutation. */
function recordVarBrute(n: number): Rational {
  const perms = permutations(n);
  const counts = perms.map((a) => a.filter((v, k) => a.slice(0, k).every((x) => x > v)).length);
  const m1 = meanOf(counts.map((c) => q(c)));
  const m2 = meanOf(counts.map((c) => q(c * c)));
  return sub(m2, mul(m1, m1));
}
const q12 = auto({
  id: 'ia-s2-q12-variance',
  source: cite(S2, 'Q12', true),
  title: t`The variance of the number of record years`,
  prompt: t`The yearly rainfalls in Cambridge over the next ${RN} years are ranked by a uniformly random permutation ${math`a_{${1}}, \ldots, a_{${RN}}`} of ${math`${1}, \ldots, ${RN}`}, and year ${math`k`} is a record year if ${math`a_{k} < a_{i}`} for all ${math`i < k`}. The record indicators ${math`Y_{k}`} are independent with ${math`\mathbb{P}(Y_{k} = ${1}) = ${1}/k`}. Find the variance of the number ${math`N`} of record years.`,
  answer: { kind: 'exact', expected: str(recordVar) },
  solution: [
    t`${math`N = Y_{${1}} + \cdots + Y_{${RN}}`}, and ${math`\operatorname{var}(Y_{k}) = \frac{${1}}{k}\left(${1} - \frac{${1}}{k}\right) = \frac{${1}}{k} - \frac{${1}}{k^{${2}}}`}.`,
    t`Independent variables have zero covariance, so the variances add: ${math`\operatorname{var}(N) = \sum_{k = ${1}}^{${RN}} \left(\frac{${1}}{k} - \frac{${1}}{k^{${2}}}\right) = ${recordVar}`}. Year ${1} is always a record and adds nothing.`,
  ],
  reference: str(recordVar),
  verify: () => same(`var(N) over all ${RN}! rankings`, str(recordVarBrute(RN)), str(recordVar)),
  misconceptions: [
    { response: str(Array.from({ length: RN }, (_, k) => q(1, k + 1)).reduce((a, b) => add(a, b), q(0))), why: t`That is ${math`\mathbb{E}(N) = \sum_{k} ${1}/k`}. Each indicator has variance ${math`\frac{${1}}{k}\left(${1} - \frac{${1}}{k}\right)`}.` },
    { response: str(Array.from({ length: RN }, (_, k) => q(1, (k + 1) * (k + 1))).reduce((a, b) => add(a, b), q(0))), why: t`The variance of an indicator with mean ${math`p`} is ${math`p - p^{${2}}`}, not ${math`p^{${2}}`}.` },
  ],
});

const Q9_PS = [q(1, 2), q(1, 3), q(1, 5)];
const q9Var = Q9_PS.reduce((a, p) => add(a, mul(p, sub(q(1), p))), q(0));
const q9 = auto({
  id: 'ia-s2-q9',
  source: cite(S2, 'Q9', true),
  title: t`Successes in trials of different difficulty`,
  prompt: t`In a sequence of ${3} independent trials the probabilities of success are ${Q9_PS[0] as Rational}, ${Q9_PS[1] as Rational}, and ${Q9_PS[2] as Rational}. Let ${math`N`} be the total number of successes. Find ${math`\operatorname{var}(N)`}.`,
  answer: { kind: 'exact', expected: str(q9Var) },
  hints: [
    t`How can ${math`N`} be written as a sum of indicators?`,
    t`What is the variance of one indicator with success probability ${math`p`}?`,
    t`Why may the variances be added here?`,
  ],
  nudge: t`Not quite. Write ${math`N`} as a sum of independent indicators and add their variances, not their means.`,
  solution: [
    t`${math`N`} is a sum of independent indicators, so ${math`\mathbb{E}(N) = \sum_{i} p_{i}`} and ${math`\operatorname{var}(N) = \sum_{i} p_{i}(${1} - p_{i})`}.`,
    t`${math`${Q9_PS[0] as Rational} \cdot ${sub(q(1), Q9_PS[0] as Rational)} + ${Q9_PS[1] as Rational} \cdot ${sub(q(1), Q9_PS[1] as Rational)} + ${Q9_PS[2] as Rational} \cdot ${sub(q(1), Q9_PS[2] as Rational)} = ${q9Var}`}.`,
    t`For independent indicators, the variances add.`,
  ],
  reference: str(q9Var),
  verify: () => same('var(N) over the 8 outcomes', indicatorVariance.at({ ps: Q9_PS }).reference, str(q9Var)),
  misconceptions: [{ response: str(Q9_PS.reduce((a, b) => add(a, b), q(0))), why: t`That is the mean. The variance adds ${math`p_{i}(${1} - p_{i})`} over the trials.` }],
});

/** X_i = μ_i + Z_i with Z_i in {-2, 0, 2} with probabilities 1/4, 1/2, 1/4: variance 2. */
const Z: Dist = { xs: [-2, 0, 2], ps: [q(1, 4), q(1, 2), q(1, 4)] };
const [A12, B12, MU12] = [[1, 2, -1], [3, -1, 2], [1, 0, 2]];
const SIG2 = variance(Z);
const q12aVal = mul(SIG2, q(A12.reduce((s, a, i) => s + a * (B12[i] as number), 0)));
const lin = (c: readonly number[]): string => c.map((x, i) => `${i === 0 ? (x < 0 ? '-' : '') : x < 0 ? ' - ' : ' + '}${Math.abs(x) === 1 ? '' : Math.abs(x)}X_{${i + 1}}`).join('');
const q12a = auto({
  id: 'ia-s4-q12-a',
  source: cite(S4, 'Q12(a)', true),
  title: t`Covariance of two linear combinations`,
  prompt: t`Let ${math`X_{${1}}, X_{${2}}, X_{${3}}`} be independent with means ${listMu()} and common variance ${math`\sigma^{${2}} = ${SIG2}`}. Let ${computedTex(`Y_{${1}} = ${lin(A12)}`)} and ${computedTex(`Y_{${2}} = ${lin(B12)}`)}. Find ${math`\operatorname{cov}(Y_{${1}}, Y_{${2}})`}.`,
  answer: { kind: 'exact', expected: str(q12aVal) },
  hints: [
    t`What is ${math`\operatorname{cov}(X_{i}, X_{j})`} when ${math`i = j`}, and when ${math`i \ne j`}?`,
    t`Expanding ${math`\operatorname{cov}(Y_{${1}}, Y_{${2}})`} by bilinearity, which terms survive?`,
    t`Do the means ${math`\mu_{i}`} affect the covariance?`,
  ],
  nudge: t`Not quite. Expand by bilinearity; independence removes every cross term, and the means play no part.`,
  solution: [
    t`Covariance is bilinear, and ${math`\operatorname{cov}(X_{i}, X_{j})`} is ${math`\sigma^{${2}}`} when ${math`i = j`} and ${0} otherwise, by independence. The means do not matter.`,
    t`So ${math`\operatorname{cov}(Y_{${1}}, Y_{${2}}) = \sigma^{${2}} \sum_{i} a_{i} b_{i}`} ${computedTex(`= ${SIG2.num} \\cdot (${A12.map((a, i) => `${a < 0 ? `(${a})` : a} \\cdot ${(B12[i] as number) < 0 ? `(${B12[i] as number})` : B12[i] as number}`).join(' + ')})`)} ${math`= ${q12aVal}`}.`,
    t`Covariance is bilinear; independence removes the cross terms.`,
  ],
  reference: str(q12aVal),
  verify: () => {
    // Every one of the 27 outcomes of (Z_1, Z_2, Z_3), with X_i = μ_i + Z_i.
    let [e1, e2, e12] = [q(0), q(0), q(0)];
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) for (let c = 0; c < 3; c++) {
      const w = mul(mul(Z.ps[a] as Rational, Z.ps[b] as Rational), Z.ps[c] as Rational);
      const x = [(MU12[0] as number) + (Z.xs[a] as number), (MU12[1] as number) + (Z.xs[b] as number), (MU12[2] as number) + (Z.xs[c] as number)];
      const y1 = x.reduce((s, v, i) => s + v * (A12[i] as number), 0);
      const y2 = x.reduce((s, v, i) => s + v * (B12[i] as number), 0);
      e1 = add(e1, mul(w, q(y1)));
      e2 = add(e2, mul(w, q(y2)));
      e12 = add(e12, mul(w, q(y1 * y2)));
    }
    return same('cov(Y1, Y2) over 27 outcomes', str(sub(e12, mul(e1, e2))), str(q12aVal));
  },
  misconceptions: [
    { response: String(A12.reduce((s, a, i) => s + a * (B12[i] as number), 0)), why: t`Each ${math`\operatorname{cov}(X_{i}, X_{i}) = \sigma^{${2}} = ${SIG2}`}: multiply ${math`\sum_{i} a_{i} b_{i}`} by it.` },
    { response: str(mul(SIG2, q(A12.reduce((s, a) => s + a, 0) * B12.reduce((s, b) => s + b, 0)))), why: t`The cross terms ${math`\operatorname{cov}(X_{i}, X_{j})`} with ${math`i \ne j`} vanish by independence: only ${math`\sum_{i} a_{i} b_{i}`} is left.` },
  ],
});
function listMu(): Rich { return t`${MU12[0] as number}, ${MU12[1] as number}, and ${MU12[2] as number}`; }

const q12aProof = supervision({
  id: 'ia-s4-q12-a-proof',
  source: cite(S4, 'Q12(a)'),
  title: t`Bilinearity of covariance`,
  prompt: t`Let ${math`X_{${1}}, \ldots, X_{n}`} be independent with ${math`\mathbb{E}(X_{i}) = \mu_{i}`} and ${math`\operatorname{var}(X_{i}) = \sigma^{${2}} < \infty`}, and let ${math`Y_{${1}} = \sum_{i} a_{i} X_{i}`}, ${math`Y_{${2}} = \sum_{i} b_{i} X_{i}`}. Show that ${math`\operatorname{cov}(Y_{${1}}, Y_{${2}}) = \sigma^{${2}} \sum_{i = ${1}}^{n} a_{i} b_{i}`}. Where is independence used, and what is the answer without it?`,
  hints: [
    t`What is ${math`\operatorname{cov}(X_{i}, X_{j})`} for ${math`i \ne j`}, and for ${math`i = j`}?`,
    t`How does bilinearity expand ${math`\operatorname{cov}\left(\sum_{i} a_{i}X_{i}, \sum_{j} b_{j}X_{j}\right)`}?`,
    t`Without independence, which extra terms remain?`,
  ],
  writeUp: 'proof',
});
const q9proof = supervision({
  id: 'ia-s2-q9-general',
  source: cite(S2, 'Q9'),
  title: t`Mean and variance of a count of successes`,
  prompt: t`In a sequence of ${math`n`} independent trials the probability of a success at trial ${math`i`} is ${math`p_{i}`}, and ${math`N`} is the total number of successes. Find ${math`\mathbb{E}(N)`} and ${math`\operatorname{var}(N)`}. For a fixed mean ${math`\sum_{i} p_{i}`}, which choice of the ${math`p_{i}`} makes the variance largest?`,
  hints: [
    t`How is ${math`N`} a sum of indicators, and what are the mean and variance of each?`,
    t`Why do the variances add?`,
    t`For a fixed sum of the ${math`p_{i}`}, which choice makes ${math`\sum_{i} p_{i}^{${2}}`} smallest, and which inequality shows it?`,
  ],
  writeUp: 'proof',
});
const scheduleCorrelation = supervision({
  id: 'schedule-correlation',
  source: cite('tripos-schedules', 'IA Probability, Continuous random variables: "Correlation coefficient"', true),
  title: t`The correlation coefficient lies in ${math`[-${1}, ${1}]`}`,
  prompt: t`For random variables with positive finite variances, define ${math`\rho(X, Y) = \operatorname{cov}(X, Y)/\sqrt{\operatorname{var}(X)\operatorname{var}(Y)}`}. By considering ${math`\operatorname{var}(tX + Y) \ge ${0}`} for every real ${math`t`}, prove that ${math`|\rho| \le ${1}`}, and that ${math`|\rho| = ${1}`} exactly when ${math`Y = aX + b`} with probability ${1} for some constants ${math`a \ne ${0}`} and ${math`b`}.`,
  hints: [
    t`What is ${math`\operatorname{var}(tX + Y)`} as a quadratic in ${math`t`}?`,
    t`What does a quadratic that is never negative say about its discriminant?`,
    t`When the discriminant is ${0}, what does ${math`\operatorname{var}(tX + Y) = ${0}`} at the double root say about ${math`tX + Y`}?`,
  ],
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

const EX_TABLE: TabP = { xs: [0, 1], ys: [0, 1], counts: [[3, 1], [1, 3]], total: 8 };
const UNCORR: Dist = { xs: [-1, 0, 1], ps: [q(1, 3), q(1, 3), q(1, 3)] };

const [mX, mY] = [math`X`, math`Y`];
const uncorrCov = sub(expect(UNCORR, (x) => q(x ** 3)), mul(expect(UNCORR), expect(UNCORR, (x) => q(x * x))));
/** Two fair bits that always agree: X = Y, each 0 or 1 with probability 1/2. */
const SAME: TabP = { xs: [0, 1], ys: [0, 1], counts: [[1, 0], [0, 1]], total: 2 };

export const covariance: TopicContent = {
  topicId: 'rv.covariance',
  goal: t`Compute ${math`\operatorname{cov}(X, Y)`} and the correlation coefficient, and the variance of a sum of dependent or independent random variables.`,
  objective: t`Compute covariance and correlation, and the variance of a sum of dependent variables.`,
  why: t`Real variables move together; this is the tool for sums of them, and leads to the bivariate normal and the weak law.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`Moving together` },
    { kind: 'hook', text: t`Two fair bits ${mX} and ${mY}, each ${0} or ${1}. If they are independent, ${math`X + Y`} has variance ${q(1, 2)}. If they always agree, ${math`X + Y`} is ${0} or ${2}, with variance ${1}. Same parts, same means, twice the spread. What number captures the difference?` },
    { kind: 'narrative', text: t`The mean of a sum is the sum of the means, always. The variance of a sum is not: it depends on whether the variables tend to be large together. If ${math`X - \mathbb{E}X`} and ${math`Y - \mathbb{E}Y`} usually have the same sign, the product of the two is usually positive.` },
    {
      kind: 'definition',
      name: t`Covariance`,
      formal: t`For random variables ${mX} and ${mY} with finite variances, the [[covariance|covariance]] is ${math`\operatorname{cov}(X, Y) = \mathbb{E}\big((X - \mathbb{E}X)(Y - \mathbb{E}Y)\big)`}.`,
      plain: t`the average product of the two deviations from the mean. Positive when the variables tend to be above their means together, negative when one tends to be above while the other is below.`,
    },
    {
      kind: 'p',
      text: t`Multiplying out gives the form used for calculation: ${math`\operatorname{cov}(X, Y) = \mathbb{E}(XY) - \mathbb{E}(X)\mathbb{E}(Y)`}. Covariance is symmetric, ${math`\operatorname{cov}(X, X) = \operatorname{var}(X)`}, adding a constant to either variable does not change it, and it is bilinear: ${math`\operatorname{cov}(aX + bZ, Y) = a\operatorname{cov}(X, Y) + b\operatorname{cov}(Z, Y)`}.`,
      why: { q: t`How does the multiplying out go?`, a: t`Write ${math`\mu = \mathbb{E}X`}, ${math`\nu = \mathbb{E}Y`}. Then ${math`(X - \mu)(Y - \nu) = XY - \nu X - \mu Y + \mu\nu`}. Taking means by linearity: ${math`\mathbb{E}(XY) - \nu\mu - \mu\nu + \mu\nu = \mathbb{E}(XY) - \mu\nu`}.` },
    },
    { kind: 'p', text: t`Example: two fair bits that agree with probability ${q(3, 4)}, so ${math`\mathbb{P}(X = Y = ${1}) = ${cell(EX_TABLE, 1, 1)}`}. Then ${math`\mathbb{E}(XY) = ${exy(EX_TABLE)}`}, ${math`\mathbb{E}(X) = \mathbb{E}(Y) = ${ex(EX_TABLE)}`}, and ${math`\operatorname{cov}(X, Y) = ${exy(EX_TABLE)} - ${mul(ex(EX_TABLE), ey(EX_TABLE))} = ${covVal(EX_TABLE)}`}: positive, because they tend to agree.` },
    { kind: 'section', title: t`The variance of a sum` },
    { kind: 'theorem', statement: t`For random variables ${mX} and ${mY} with finite variances, ${math`\operatorname{var}(X + Y) = \operatorname{var}(X) + \operatorname{var}(Y) + ${2}\operatorname{cov}(X, Y)`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Centre both`, text: t`Let ${math`\mu = \mathbb{E}X`}, ${math`\nu = \mathbb{E}Y`}. Then ${math`\mathbb{E}(X + Y) = \mu + \nu`}, so ${math`(X + Y) - \mathbb{E}(X + Y) = (X - \mu) + (Y - \nu)`}.`, plain: t`The deviation of the sum is the sum of the deviations, by linearity of the mean.` },
        { label: t`Square`, text: t`${math`\big((X - \mu) + (Y - \nu)\big)^{${2}} = (X - \mu)^{${2}} + (Y - \nu)^{${2}} + ${2}(X - \mu)(Y - \nu)`}.`, plain: t`${math`(a + b)^{${2}} = a^{${2}} + b^{${2}} + ${2}ab`}.` },
        { label: t`Take the mean`, text: t`${math`\operatorname{var}(X + Y) = \mathbb{E}(X - \mu)^{${2}} + \mathbb{E}(Y - \nu)^{${2}} + ${2}\,\mathbb{E}\big((X - \mu)(Y - \nu)\big)`}.`, plain: t`Linearity again, term by term.` },
        { label: t`Recognise each term`, text: t`That is ${math`\operatorname{var}(X) + \operatorname{var}(Y) + ${2}\operatorname{cov}(X, Y)`}.`, plain: t`The first two are the variances by definition, the last is twice the covariance.` },
      ],
    },
    {
      kind: 'p',
      text: t`The hook, checked: for bits that always agree, ${math`\operatorname{cov}(X, Y) = ${covVal(SAME)}`}, so ${math`\operatorname{var}(X + Y) = ${q(1, 4)} + ${q(1, 4)} + ${2} \times ${covVal(SAME)} = ${add(q(1, 2), mul(q(2), covVal(SAME)))}`}. For many variables, ${math`\operatorname{var}\big(\sum_{i} X_{i}\big) = \sum_{i} \operatorname{var}(X_{i}) + ${2}\sum_{i < j} \operatorname{cov}(X_{i}, X_{j})`}. Independent variables have covariance ${0}, so then the variances simply add.`,
    },
    quickCheck({
      prompt: t`${math`\operatorname{var}(X) = ${4}`}, ${math`\operatorname{var}(Y) = ${9}`}, and ${math`\operatorname{cov}(X, Y) = ${-2}`}. Find ${math`\operatorname{var}(X + Y)`}.`,
      answer: { kind: 'exact', expected: String(4 + 9 - 4) },
      reference: String(4 + 9 - 4),
      why: t`${math`${4} + ${9} + ${2} \times (${-2}) = ${4 + 9 - 4}`}. Negative covariance means the two partly cancel.`,
    }),
    { kind: 'section', title: t`Correlation` },
    {
      kind: 'definition',
      name: t`Correlation coefficient`,
      formal: t`For ${mX} and ${mY} with positive finite variances, the [[correlation-coefficient|correlation coefficient]] is ${math`\rho(X, Y) = \frac{\operatorname{cov}(X, Y)}{\sqrt{\operatorname{var}(X)\operatorname{var}(Y)}}`}.`,
      plain: t`covariance with the units divided out. It always lies in ${math`[${-1}, ${1}]`}, and is ${math`\pm ${1}`} exactly when ${mY} is a linear function of ${mX}; the proof is a supervision problem below.`,
    },
    {
      kind: 'pitfall',
      claim: t`Zero covariance means ${mX} and ${mY} are independent.`,
      counterexample: t`Let ${mX} be uniform on ${math`\{${-1}, ${0}, ${1}\}`} and ${math`Y = X^{${2}}`}. Then ${math`\operatorname{cov}(X, Y) = \mathbb{E}(X^{${3}}) - \mathbb{E}(X)\mathbb{E}(X^{${2}}) = ${uncorrCov}`}, yet ${mY} is determined by ${mX}: ${math`\mathbb{P}(Y = ${0} \mid X = ${0}) = ${1}`}, while ${math`\mathbb{P}(Y = ${0}) = ${q(1, 3)}`}.`,
    },
    { kind: 'takeaway', text: t`${math`\operatorname{cov}(X, Y) = \mathbb{E}(XY) - \mathbb{E}X\,\mathbb{E}Y`} measures moving together; ${math`\operatorname{var}(X + Y) = \operatorname{var}X + \operatorname{var}Y + ${2}\operatorname{cov}(X, Y)`}, and zero covariance does not imply independence.` },
  ],
  examples: [
    { ...workedCambridge(q12), examiner: t`The count written as a sum of indicators, independence of the indicators used to drop every covariance, and each ${math`\operatorname{var}(Y_{k}) = p_{k}(${1} - p_{k})`} computed.` },
    worked(covFromTable, { xs: [0, 1], ys: [0, 1, 2], counts: [[3, 2, 1], [1, 2, 3]], total: 12 }, t`Covariance from a joint table`),
    worked(varianceOfCombination, { a: 2, b: -1, sx: 3, sy: 2, rho: q(1, 2), viaRho: true }, t`The variance of a difference with correlation`),
  ],
  generators: [covFromTable, varianceOfCombination, indicatorVariance],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['covariance', 'correlation-coefficient'],
  cambridge: withUses([q9, q12a, q12aProof, q9proof, scheduleCorrelation], {
    'ia-s2-q9-general': { sections: ['The variance of a sum'], note: t`The variance of a count of independent successes, and when it is largest` },
    'ia-s4-q12-a-proof': { sections: ['Moving together', 'The variance of a sum'], note: t`Bilinearity of covariance` },
    'ia-s4-q12-a': { sections: ['Moving together'], note: t`The covariance of two linear combinations` },
  }),
  // The IA sheets: Sheet 2 Q9 in general (with its optimisation) first, then Sheet 4 Q12(a) as a proof and
  // at numbers. Sheet 2 Q9 at three numbers is one sum, left out.
  gate: ['ia-s2-q9-general', 'ia-s4-q12-a-proof', 'ia-s4-q12-a'],
  recall: [
    { front: t`Define ${math`\operatorname{cov}(X, Y)`}.`, back: t`${math`\mathbb{E}\big((X - \mathbb{E}X)(Y - \mathbb{E}Y)\big) = \mathbb{E}(XY) - \mathbb{E}X\,\mathbb{E}Y`}.` },
    { front: t`${math`\operatorname{var}(X + Y)`}?`, back: t`${math`\operatorname{var}X + \operatorname{var}Y + ${2}\operatorname{cov}(X, Y)`}.` },
    { front: t`Define the correlation coefficient.`, back: t`${math`\rho = \frac{\operatorname{cov}(X, Y)}{\sqrt{\operatorname{var}X \operatorname{var}Y}}`}, in ${math`[${-1}, ${1}]`}.` },
    { front: t`Does zero covariance imply independence?`, back: t`No: ${mX} uniform on ${math`\{${-1}, ${0}, ${1}\}`} and ${math`Y = X^{${2}}`}.` },
  ],
  proofOrder: [
    {
      title: t`The variance of a sum`,
      steps: [
        t`The deviation of ${math`X + Y`} is ${math`(X - \mu) + (Y - \nu)`}.`,
        t`Its square is ${math`(X - \mu)^{${2}} + (Y - \nu)^{${2}} + ${2}(X - \mu)(Y - \nu)`}.`,
        t`Take means term by term, by linearity.`,
        t`That gives ${math`\operatorname{var}X + \operatorname{var}Y + ${2}\operatorname{cov}(X, Y)`}.`,
      ],
    },
  ],
};
