/**
 * rv.conditional-expectation: the conditional distribution P(X = x | Y = y), the
 * conditional expectation E(X | Y = y) and the random variable E(X | Y), and the tower law
 * E(E(X | Y)) = E(X). From the Faculty schedule ("Conditional expectation"), IA Probability
 * Example Sheet 2 Q6 (independent Poissons: X + Y is Poisson, and X given X + Y = n is
 * binomial) and Sheet 3 Q8(a), (b) (random sums: E(S_N) = μE(N) and
 * var(S_N) = σ^2 E(N) + μ^2 var(N)). The sheets have no official solutions; the answers are
 * checked by exact convolution of the Poisson weights and by summing over every outcome.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { add, div, int, mul, pick, q, str, sub, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { distinctFrom, expect, meanOf, variance, type Dist } from '../partv-c';
import { computedTex, listOf, math, t, texOfRational, type Rich, type Span } from '../rich';
import { worked, workedCambridge, type TopicContent } from '../topic';
import { choose } from '../numbers';

const S2 = 'ia-prob-sheet-2' as const;
const S3 = 'ia-prob-sheet-3' as const;

// ---------------------------------------------------------------- joint tables

interface TabP { xs: readonly number[]; ys: readonly number[]; counts: readonly (readonly number[])[]; total: number; x: number; y: number }
const cnt = (p: TabP, i: number, j: number): number => (p.counts[i] as number[])[j] as number;
const colSum = (p: TabP, j: number): number => p.xs.reduce((s, _, i) => s + cnt(p, i, j), 0);
const rowSum = (p: TabP, i: number): number => p.ys.reduce((s, _, j) => s + cnt(p, i, j), 0);
const tableText = (p: TabP): Span => computedTex(p.xs.flatMap((x, i) => p.ys.map((y, j) => `\\mathbb{P}(X = ${x}, Y = ${y}) = ${texOfRational(q(cnt(p, i, j), p.total))}`)).join(',\\ '));
function randomTable(rng: () => number): Omit<TabP, 'x' | 'y'> {
  const xs = pick(rng, [[0, 1], [1, 2], [0, 1, 2], [1, 2, 3], [0, 2, 4]]);
  const ys = pick(rng, [[0, 1], [1, 2], [0, 1, 2]]);
  const total = pick(rng, [12, 16, 20, 24]);
  const k = xs.length * ys.length;
  const cuts = new Set<number>();
  while (cuts.size < k - 1) cuts.add(int(rng, 1, total - 1));
  const sorted = [0, ...[...cuts].sort((a, b) => a - b), total];
  const flat = sorted.slice(1).map((c, i) => c - (sorted[i] as number));
  return { xs, ys, total, counts: xs.map((_, i) => flat.slice(i * ys.length, (i + 1) * ys.length)) };
}

// ---------------------------------------------------------------- a conditional probability

const condVal = (p: TabP): Rational => q(cnt(p, p.xs.indexOf(p.x), p.ys.indexOf(p.y)), colSum(p, p.ys.indexOf(p.y)));
function condMis(p: TabP): [Rational, Rich][] {
  const [i, j] = [p.xs.indexOf(p.x), p.ys.indexOf(p.y)];
  return [
    [q(cnt(p, i, j), p.total), t`That is the joint probability ${math`\mathbb{P}(X = ${p.x}, Y = ${p.y})`}. Divide by ${math`\mathbb{P}(Y = ${p.y})`} to condition.`],
    [q(rowSum(p, i), p.total), t`That is ${math`\mathbb{P}(X = ${p.x})`}, ignoring what is known about ${math`Y`}.`],
    [q(cnt(p, i, j), rowSum(p, i)), t`That is ${math`\mathbb{P}(Y = ${p.y} \mid X = ${p.x})`}: you divided by the row instead of the column. Condition on ${math`Y = ${p.y}`}.`],
  ];
}

const conditionalPmf = generator<TabP>({
  id: 'conditional-pmf',
  skill: 'Find a conditional probability P(X = x | Y = y) from a joint distribution.',
  params: (rng) => {
    for (;;) {
      const base = randomTable(rng);
      const p: TabP = { ...base, x: pick(rng, base.xs), y: pick(rng, base.ys) };
      if (distinctFrom(str(condVal(p)), condMis(p).map(([v]) => str(v))) >= 2) return p;
    }
  },
  sane: (p) => (p.counts.flat().every((c) => c > 0) ? null : 'empty cell'),
  problem: (p) => {
    const j = p.ys.indexOf(p.y);
    return {
      prompt: t`The joint distribution of ${math`X`} and ${math`Y`} is ${tableText(p)}. Find ${math`\mathbb{P}(X = ${p.x} \mid Y = ${p.y})`}.`,
      answer: { kind: 'exact', expected: str(condVal(p)) },
      solution: [
        t`${math`\mathbb{P}(Y = ${p.y}) = \sum_{x} \mathbb{P}(X = x, Y = ${p.y}) = ${q(colSum(p, j), p.total)}`}.`,
        t`${math`\mathbb{P}(X = ${p.x} \mid Y = ${p.y}) = \frac{\mathbb{P}(X = ${p.x}, Y = ${p.y})}{\mathbb{P}(Y = ${p.y})} = \frac{${q(cnt(p, p.xs.indexOf(p.x), j), p.total)}}{${q(colSum(p, j), p.total)}} = ${condVal(p)}`}.`,
      ],
    };
  },
  solve: (p) => {
    // A population of equally likely pairs; keep those with Y = y and count X = x among them.
    const pairs: [number, number][] = [];
    p.xs.forEach((x, i) => p.ys.forEach((y, j) => { for (let c = 0; c < cnt(p, i, j); c++) pairs.push([x, y]); }));
    const kept = pairs.filter(([, y]) => y === p.y);
    return str(q(kept.filter(([x]) => x === p.x).length, kept.length));
  },
  misconceptions: (p): Misconception[] => condMis(p).map(([v, why]) => ({ response: str(v), why })),
});

// ---------------------------------------------------------------- a conditional mean

const cmVal = (p: TabP): Rational => {
  const j = p.ys.indexOf(p.y);
  return q(p.xs.reduce((s, x, i) => s + x * cnt(p, i, j), 0), colSum(p, j));
};
function cmMis(p: TabP): [Rational, Rich][] {
  const j = p.ys.indexOf(p.y);
  const ex = q(p.xs.reduce((s, x, i) => s + x * rowSum(p, i), 0), p.total);
  return [
    [ex, t`That is ${math`\mathbb{E}(X)`}, averaging over every value of ${math`Y`}. Use only the column ${math`Y = ${p.y}`}.`],
    [q(p.xs.reduce((s, x, i) => s + x * cnt(p, i, j), 0), p.total), t`That is ${math`\sum_{x} x\,\mathbb{P}(X = x, Y = ${p.y})`}. Divide by ${math`\mathbb{P}(Y = ${p.y})`} so the conditional probabilities add to ${1}.`],
    [q(p.xs.reduce((s, x) => s + x, 0), p.xs.length), t`The values of ${math`X`} are not equally likely given ${math`Y = ${p.y}`}: weight each by ${math`\mathbb{P}(X = x \mid Y = ${p.y})`}.`],
  ];
}

const conditionalMean = generator<TabP>({
  id: 'conditional-mean',
  skill: 'Compute E(X | Y = y) as the mean of the conditional distribution of X given Y = y.',
  params: (rng) => {
    for (;;) {
      const base = randomTable(rng);
      const p: TabP = { ...base, x: base.xs[0] as number, y: pick(rng, base.ys) };
      if (distinctFrom(str(cmVal(p)), cmMis(p).map(([v]) => str(v))) >= 2) return p;
    }
  },
  sane: (p) => (p.counts.flat().every((c) => c > 0) ? null : 'empty cell'),
  problem: (p) => {
    const j = p.ys.indexOf(p.y);
    const conds = p.xs.map((_, i) => q(cnt(p, i, j), colSum(p, j)));
    return {
      prompt: t`The joint distribution of ${math`X`} and ${math`Y`} is ${tableText(p)}. Find ${math`\mathbb{E}(X \mid Y = ${p.y})`}.`,
      answer: { kind: 'exact', expected: str(cmVal(p)) },
      solution: [
        t`Given ${math`Y = ${p.y}`}, divide the column by ${math`\mathbb{P}(Y = ${p.y}) = ${q(colSum(p, j), p.total)}`}: ${math`X`} takes the values ${listOf(p.xs)} with conditional probabilities ${computedTex(conds.map(texOfRational).join(', '))}.`,
        t`${math`\mathbb{E}(X \mid Y = ${p.y}) = \sum_{x} x\,\mathbb{P}(X = x \mid Y = ${p.y}) = ${cmVal(p)}`}.`,
      ],
    };
  },
  solve: (p) => {
    const pairs: [number, number][] = [];
    p.xs.forEach((x, i) => p.ys.forEach((y, j) => { for (let c = 0; c < cnt(p, i, j); c++) pairs.push([x, y]); }));
    return str(meanOf(pairs.filter(([, y]) => y === p.y).map(([x]) => q(x))));
  },
  misconceptions: (p): Misconception[] => cmMis(p).map(([v, why]) => ({ response: str(v), why })),
});

// ---------------------------------------------------------------- the tower law

type Stage = 'binomial' | 'bernoulli-inverse';
interface TowerP { n: Dist; stage: Stage; p: Rational }
const condMean = (t0: TowerP, n: number): Rational => (t0.stage === 'binomial' ? mul(q(n), t0.p) : q(1, n));
const towerVal = (t0: TowerP): Rational => expect(t0.n, (n) => condMean(t0, n));
function towerMis(t0: TowerP): [Rational, Rich][] {
  const en = expect(t0.n);
  const unweighted = meanOf(t0.n.xs.map((n) => condMean(t0, n)));
  const out: [Rational, Rich][] = [[unweighted, t`The values of ${math`N`} are not equally likely: weight each conditional mean by ${math`\mathbb{P}(N = n)`}.`]];
  if (t0.stage === 'bernoulli-inverse') {
    out.push([div(q(1), en), t`${math`\mathbb{E}(${1}/N) \ne ${1}/\mathbb{E}(N)`}. Average ${math`\mathbb{E}(X \mid N = n) = ${1}/n`} over the distribution of ${math`N`}.`]);
    out.push([q(1, Math.max(...t0.n.xs)), t`That is ${math`\mathbb{E}(X \mid N = ${Math.max(...t0.n.xs)})`} for one value of ${math`N`}. Average over all of them.`]);
  } else {
    out.push([en, t`That is ${math`\mathbb{E}(N)`}, the mean number of tosses. Each toss is a head with probability ${t0.p}.`]);
    out.push([mul(q(Math.max(...t0.n.xs)), t0.p), t`That uses the largest value of ${math`N`} only. Average ${math`\mathbb{E}(X \mid N = n)`} over the distribution of ${math`N`}.`]);
  }
  return out;
}
const N_DISTS: readonly Dist[] = [
  { xs: [1, 2, 3], ps: [q(1, 2), q(1, 3), q(1, 6)] },
  { xs: [1, 2, 3, 4], ps: [q(1, 4), q(1, 4), q(1, 4), q(1, 4)] },
  { xs: [2, 4], ps: [q(1, 3), q(2, 3)] },
  { xs: [1, 3, 6], ps: [q(1, 2), q(1, 4), q(1, 4)] },
  { xs: [1, 2, 4], ps: [q(1, 5), q(2, 5), q(2, 5)] },
  { xs: [2, 3, 5], ps: [q(1, 2), q(1, 4), q(1, 4)] },
];

const towerLaw = generator<TowerP>({
  id: 'tower-law',
  skill: 'Find E(X) for a two-stage experiment with the tower law, E(X) = Σ E(X | N = n) P(N = n).',
  params: (rng) => {
    for (;;) {
      const p: TowerP = { n: pick(rng, N_DISTS), stage: pick(rng, ['binomial', 'bernoulli-inverse'] as const), p: pick(rng, [q(1, 2), q(1, 3), q(2, 3), q(1, 4), q(3, 4)]) };
      if (distinctFrom(str(towerVal(p)), towerMis(p).map(([v]) => str(v))) >= 2) return p;
    }
  },
  sane: ({ n }) => (n.xs.every((x) => x >= 1) ? null : 'out of range'),
  problem: (t0) => {
    const second = t0.stage === 'binomial'
      ? t`Then a coin that shows heads with probability ${t0.p} is tossed ${math`N`} times, and ${math`X`} is the number of heads.`
      : t`Then ${math`N`} cards, exactly one of them red, are shuffled, and ${math`X`} is ${1} if the top card is red and ${0} otherwise.`;
    return {
      prompt: t`${math`N`} takes the values ${listOf(t0.n.xs)} with probabilities ${computedTex(t0.n.ps.map(texOfRational).join(', '))}. ${second} Find ${math`\mathbb{E}(X)`}.`,
      answer: { kind: 'exact', expected: str(towerVal(t0)) },
      solution: [
        t0.stage === 'binomial'
          ? t`Given ${math`N = n`}, ${math`X`} is binomial, so ${math`\mathbb{E}(X \mid N = n) = n \cdot ${t0.p}`}, and ${math`\mathbb{E}(X \mid N) = ${t0.p}\,N`}.`
          : t`Given ${math`N = n`}, the red card is on top with probability ${math`${1}/n`}, so ${math`\mathbb{E}(X \mid N = n) = ${1}/n`}, and ${math`\mathbb{E}(X \mid N) = ${1}/N`}.`,
        t`Tower law: ${math`\mathbb{E}(X) = \mathbb{E}(\mathbb{E}(X \mid N)) = \sum_{n} \mathbb{E}(X \mid N = n)\,\mathbb{P}(N = n)`} ${computedTex(`= ${t0.n.xs.map((n, i) => `${texOfRational(condMean(t0, n))} \\cdot ${texOfRational(t0.n.ps[i] as Rational)}`).join(' + ')}`)} ${math`= ${towerVal(t0)}`}.`,
      ],
    };
  },
  solve: (t0) => {
    // The joint distribution of (N, X), every pair, then the mean of X.
    let total = q(0);
    t0.n.xs.forEach((n, i) => {
      const pn = t0.n.ps[i] as Rational;
      if (t0.stage === 'binomial') {
        for (let k = 0; k <= n; k++) {
          const pk = mul(q(choose(n, k)), mul(powR(t0.p, k), powR(sub(q(1), t0.p), n - k)));
          total = add(total, mul(mul(pn, pk), q(k)));
        }
      } else {
        // n positions for the red card, one of them on top.
        for (let pos = 0; pos < n; pos++) total = add(total, mul(mul(pn, q(1, n)), q(pos === 0 ? 1 : 0)));
      }
    });
    return str(total);
  },
  misconceptions: (t0): Misconception[] => towerMis(t0).map(([v, why]) => ({ response: str(v), why })),
});
function powR(r: Rational, k: number): Rational { let out = q(1); for (let i = 0; i < k; i++) out = mul(out, r); return out; }

// ---------------------------------------------------------------- Cambridge problems

/** P(X = k | X + Y = n) for independent Poissons, from the weights λ^a/a! μ^b/b! (the exponentials cancel), exactly. */
function poissonConditional(lambda: number, mu: number, n: number, k: number): Rational {
  const w = (a: number, b: number): Rational => q(lambda ** a * mu ** b, factorialN(a) * factorialN(b));
  let total = q(0);
  for (let a = 0; a <= n; a++) total = add(total, w(a, n - a));
  return div(w(k, n - k), total);
}
function factorialN(n: number): number { let f = 1; for (let i = 2; i <= n; i++) f *= i; return f; }
const [LAM, MU, NN, KK] = [2, 3, 3, 1];
const q6Val = mul(q(choose(NN, KK)), mul(powR(q(LAM, LAM + MU), KK), powR(q(MU, LAM + MU), NN - KK)));
const q6 = auto({
  id: 'ia-s2-q6-conditional',
  source: cite(S2, 'Q6', true),
  title: t`One Poisson given the total`,
  prompt: t`${math`X`} and ${math`Y`} are independent Poisson random variables with parameters ${math`\lambda = ${LAM}`} and ${math`\mu = ${MU}`}. Find ${math`\mathbb{P}(X = ${KK} \mid X + Y = ${NN})`}.`,
  answer: { kind: 'exact', expected: str(q6Val) },
  solution: [
    t`${math`\mathbb{P}(X = k, X + Y = n) = \mathbb{P}(X = k)\mathbb{P}(Y = n - k) = e^{-\lambda}\frac{\lambda^{k}}{k!} \cdot e^{-\mu}\frac{\mu^{n - k}}{(n - k)!}`}, and by the binomial theorem ${math`\mathbb{P}(X + Y = n) = e^{-(\lambda + \mu)}\frac{(\lambda + \mu)^{n}}{n!}`}: ${math`X + Y`} is Poisson with parameter ${math`\lambda + \mu`}.`,
    t`Dividing, ${math`\mathbb{P}(X = k \mid X + Y = n) = \binom{n}{k}\left(\frac{\lambda}{\lambda + \mu}\right)^{k}\left(\frac{\mu}{\lambda + \mu}\right)^{n - k}`}: binomial with parameters ${math`n`} and ${math`\lambda/(\lambda + \mu)`}.`,
    t`Here ${math`\binom{${NN}}{${KK}}\left(${q(LAM, LAM + MU)}\right)^{${KK}}\left(${q(MU, LAM + MU)}\right)^{${NN - KK}} = ${q6Val}`}.`,
  ],
  reference: str(q6Val),
  verify: () => {
    // The conditional distribution from the Poisson weights against the binomial, for several n and k.
    for (const [l, m] of [[LAM, MU], [1, 4], [3, 3]] as const) for (let n = 0; n <= 6; n++) for (let k = 0; k <= n; k++) {
      const bin = mul(q(choose(n, k)), mul(powR(q(l, l + m), k), powR(q(m, l + m), n - k)));
      const e = same(`lambda ${l}, mu ${m}, n ${n}, k ${k}`, str(poissonConditional(l, m, n, k)), str(bin));
      if (e !== null) return e;
    }
    return same('the asked value', str(poissonConditional(LAM, MU, NN, KK)), str(q6Val));
  },
  misconceptions: [
    { response: str(q(KK, NN)), why: t`The two Poissons have different rates, so given the total, each event comes from ${math`X`} with probability ${q(LAM, LAM + MU)}, not ${q(1, 2)}.` },
    { response: str(powR(q(LAM, LAM + MU), KK)), why: t`Given the total ${NN}, ${math`X`} is binomial: include ${math`\binom{${NN}}{${KK}}`} and the chance ${q(MU, LAM + MU)} for each of the other events.` },
  ],
});

const POI_L = 1;
const q6sumVal = Math.exp(-2 * POI_L) * (2 * POI_L) ** 2 / 2;
const q6sum = auto({
  id: 'ia-s2-q6-sum',
  source: cite(S2, 'Q6', true),
  title: t`The total of two Poissons`,
  prompt: t`${math`X`} and ${math`Y`} are independent Poisson random variables, each with parameter ${POI_L}. Find ${math`\mathbb{P}(X + Y = ${2})`}, to four significant figures.`,
  answer: { kind: 'numeric', expected: q6sumVal, relTol: 5e-4 },
  solution: [
    t`${math`X + Y`} is Poisson with parameter ${math`${POI_L} + ${POI_L} = ${2 * POI_L}`}: add the ways ${math`(${0}, ${2})`}, ${math`(${1}, ${1})`}, ${math`(${2}, ${0})`} and use the binomial theorem.`,
    t`${math`\mathbb{P}(X + Y = ${2}) = e^{-${2 * POI_L}}\frac{${2 * POI_L}^{${2}}}{${2}!} \approx ${q6sumVal}`}.`,
  ],
  reference: q6sumVal.toPrecision(4),
  verify: () => {
    const poi = (l: number, k: number): number => Math.exp(-l) * l ** k / factorialN(k);
    const conv = poi(POI_L, 0) * poi(POI_L, 2) + poi(POI_L, 1) * poi(POI_L, 1) + poi(POI_L, 2) * poi(POI_L, 0);
    return Math.abs(conv - q6sumVal) < 1e-12 ? null : `convolution ${conv}, closed form ${q6sumVal}`;
  },
  misconceptions: [
    { response: (Math.exp(-POI_L) * POI_L ** 2 / 2).toPrecision(4), why: t`That is ${math`\mathbb{P}(X = ${2})`} for one of them. The total is Poisson with parameter ${2 * POI_L}.` },
    { response: (Math.exp(-POI_L) * POI_L).toPrecision(4), why: t`That is only the way ${math`(${1}, ${1})`}. Add the ways ${math`(${0}, ${2})`} and ${math`(${2}, ${0})`}.` },
  ],
});

const DIE: Dist = { xs: [1, 2, 3, 4, 5, 6], ps: [q(1, 6), q(1, 6), q(1, 6), q(1, 6), q(1, 6), q(1, 6)] };
const NUM: Dist = { xs: [1, 2, 3], ps: [q(1, 3), q(1, 3), q(1, 3)] };
const randomSumVar = add(mul(variance(DIE), expect(NUM)), mul(mul(expect(DIE), expect(DIE)), variance(NUM)));
const q8b = auto({
  id: 'ia-s3-q8-b',
  source: cite(S3, 'Q8(b)', true),
  title: t`The variance of a random sum`,
  prompt: t`A fair die is rolled ${math`N`} times, where ${math`N`} is independent of the rolls and equally likely to be ${listOf(NUM.xs)}. Let ${math`S_{N}`} be the total score. Find ${math`\operatorname{var}(S_{N})`}.`,
  answer: { kind: 'exact', expected: str(randomSumVar) },
  solution: [
    t`One roll has ${math`\mu = ${expect(DIE)}`} and ${math`\sigma^{${2}} = ${variance(DIE)}`}; ${math`\mathbb{E}(N) = ${expect(NUM)}`} and ${math`\operatorname{var}(N) = ${variance(NUM)}`}.`,
    t`Given ${math`N = n`}, ${math`\mathbb{E}(S_{N} \mid N = n) = n\mu`} and ${math`\mathbb{E}(S_{N}^{${2}} \mid N = n) = n\sigma^{${2}} + n^{${2}}\mu^{${2}}`}. The tower law gives ${math`\mathbb{E}(S_{N}^{${2}}) = \sigma^{${2}}\mathbb{E}(N) + \mu^{${2}}\mathbb{E}(N^{${2}})`}, so ${math`\operatorname{var}(S_{N}) = \sigma^{${2}}\mathbb{E}(N) + \mu^{${2}}\operatorname{var}(N)`}.`,
    t`${math`${variance(DIE)} \cdot ${expect(NUM)} + ${mul(expect(DIE), expect(DIE))} \cdot ${variance(NUM)} = ${randomSumVar}`}.`,
  ],
  reference: str(randomSumVar),
  verify: () => {
    // Every value of N and every sequence of that many rolls.
    let [m1, m2] = [q(0), q(0)];
    NUM.xs.forEach((n, i) => {
      const w = mul(NUM.ps[i] as Rational, q(1, 6 ** n));
      for (let code = 0; code < 6 ** n; code++) {
        let s = 0;
        for (let r = 0, c = code; r < n; r++, c = Math.floor(c / 6)) s += (c % 6) + 1;
        m1 = add(m1, mul(w, q(s)));
        m2 = add(m2, mul(w, q(s * s)));
      }
    });
    return same('var(S_N) over every outcome', str(sub(m2, mul(m1, m1))), str(randomSumVar));
  },
  misconceptions: [
    { response: str(mul(variance(DIE), expect(NUM))), why: t`That is the spread from the rolls alone. The number of rolls is random too, adding ${math`\mu^{${2}}\operatorname{var}(N)`}.` },
    { response: str(mul(variance(DIE), q(Math.max(...NUM.xs)))), why: t`${math`N`} is random: average over it with the tower law, and include the variance it adds.` },
  ],
});

const q6proof = supervision({
  id: 'ia-s2-q6',
  source: cite(S2, 'Q6'),
  title: t`Two Poissons and their total`,
  prompt: t`Suppose ${math`X`} and ${math`Y`} are independent Poisson random variables with parameters ${math`\lambda`} and ${math`\mu`}. Find the distribution of ${math`X + Y`}. Prove that the conditional distribution of ${math`X`}, given that ${math`X + Y = n`}, is binomial with parameters ${math`n`} and ${math`\lambda/(\lambda + \mu)`}. What is ${math`\mathbb{E}(X \mid X + Y)`}?`,
  writeUp: 'proof',
});
const q8proof = supervision({
  id: 'ia-s3-q8-ab',
  source: cite(S3, 'Q8(a), (b)'),
  title: t`Random sums`,
  prompt: t`Let ${math`X_{${1}}, X_{${2}}, \ldots`} be i.i.d. with mean ${math`\mu`} and variance ${math`\sigma^{${2}} < \infty`}, ${math`S_{n} = X_{${1}} + \cdots + X_{n}`}, and ${math`N`} a bounded nonnegative integer random variable independent of the ${math`X_{i}`}. Show that ${math`\mathbb{E}(S_{N}) = \mu\mathbb{E}(N)`}, that ${math`\mathbb{E}(S_{N}^{${2}} \mid N = n) = n\sigma^{${2}} + n^{${2}}\mu^{${2}}`}, and hence express ${math`\operatorname{var}(S_{N})`} in terms of ${math`\operatorname{var}(N)`}. Where is the independence of ${math`N`} used?`,
  writeUp: 'proof',
});
const scheduleTower = supervision({
  id: 'schedule-tower-law',
  source: cite('tripos-schedules', 'IA Probability, Discrete random variables: "Conditional expectation."', true),
  title: t`The tower law`,
  prompt: t`For discrete ${math`X`} with finite mean and any discrete ${math`Y`}, define ${math`\psi(y) = \mathbb{E}(X \mid Y = y)`} when ${math`\mathbb{P}(Y = y) > ${0}`}. Prove that ${math`\mathbb{E}(\psi(Y)) = \mathbb{E}(X)`}, that ${math`\mathbb{E}(g(Y)X \mid Y) = g(Y)\,\mathbb{E}(X \mid Y)`} for bounded ${math`g`}, and that ${math`\mathbb{E}(X \mid Y) = \mathbb{E}(X)`} when ${math`X`} and ${math`Y`} are independent. Is the converse of the last statement true?`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

export const conditionalExpectation: TopicContent = {
  topicId: 'rv.conditional-expectation',
  goal: t`Find the distribution of ${math`X`} given ${math`Y = y`}, its mean ${math`\mathbb{E}(X \mid Y = y)`}, and use the tower law ${math`\mathbb{E}(X) = \mathbb{E}(\mathbb{E}(X \mid Y))`}.`,
  lesson: [
    { kind: 'p', text: t`Learning the value of ${math`Y`} changes what to expect of ${math`X`}. Conditioning on an event gives a new probability measure, so every idea about distributions and means applies to it.` },
    { kind: 'rule', text: t`The [[conditional-distribution|conditional distribution]] of ${math`X`} given ${math`Y = y`}, for ${math`\mathbb{P}(Y = y) > ${0}`}, is ${math`\mathbb{P}(X = x \mid Y = y) = \frac{\mathbb{P}(X = x, Y = y)}{\mathbb{P}(Y = y)}`}. Its mean is the [[conditional-expectation|conditional expectation]] ${math`\mathbb{E}(X \mid Y = y) = \sum_{x} x\,\mathbb{P}(X = x \mid Y = y)`}. Writing ${math`\psi(y)`} for it, the random variable ${math`\mathbb{E}(X \mid Y) = \psi(Y)`} is a function of ${math`Y`}.` },
    { kind: 'rule', text: t`The [[tower-law|tower law]]: ${math`\mathbb{E}(\mathbb{E}(X \mid Y)) = \mathbb{E}(X)`}, that is, ${math`\mathbb{E}(X) = \sum_{y} \mathbb{E}(X \mid Y = y)\,\mathbb{P}(Y = y)`}. It is the law of total probability for means: split by the value of ${math`Y`}, then weight.` },
    { kind: 'p', text: t`Sheet ${2} Q${6}: for independent Poissons with parameters ${math`\lambda`} and ${math`\mu`}, ${math`X + Y`} is Poisson with parameter ${math`\lambda + \mu`}, and given ${math`X + Y = n`}, ${math`X`} is binomial with parameters ${math`n`} and ${math`\lambda/(\lambda + \mu)`}. So ${math`\mathbb{E}(X \mid X + Y) = (X + Y)\frac{\lambda}{\lambda + \mu}`}. With ${math`\lambda = ${LAM}`}, ${math`\mu = ${MU}`}, ${math`\mathbb{P}(X = ${KK} \mid X + Y = ${NN}) = ${q6Val}`}.` },
    { kind: 'p', text: t`Random sums (Sheet ${3} Q${8}): roll a die ${math`N`} times, ${math`N`} independent of the rolls. Given ${math`N = n`} the total has mean ${math`n\mu`}, so ${math`\mathbb{E}(S_{N}) = \mu\,\mathbb{E}(N)`}. The variance has two parts, the spread of the rolls and the spread of their number: ${math`\operatorname{var}(S_{N}) = \sigma^{${2}}\mathbb{E}(N) + \mu^{${2}}\operatorname{var}(N)`}.` },
    { kind: 'p', text: t`Two rules make conditional expectations easy to handle: a function of ${math`Y`} acts like a constant, ${math`\mathbb{E}(g(Y)X \mid Y) = g(Y)\mathbb{E}(X \mid Y)`}; and if ${math`X`} is independent of ${math`Y`}, then ${math`\mathbb{E}(X \mid Y) = \mathbb{E}(X)`}.` },
  ],
  examples: [
    workedCambridge(q6),
    worked(conditionalMean, { xs: [0, 1, 2], ys: [0, 1], counts: [[3, 1], [2, 2], [1, 3]], total: 12, x: 0, y: 1 }, t`A mean given the value of ${math`Y`}`),
    worked(towerLaw, { n: N_DISTS[0] as Dist, stage: 'bernoulli-inverse', p: q(1, 2) }, t`The tower law where plugging in fails`),
  ],
  generators: [conditionalPmf, conditionalMean, towerLaw],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['conditional-distribution', 'conditional-expectation', 'tower-law'],
  cambridge: [q6sum, q8b, q6proof, q8proof, scheduleTower],
  gate: ['ia-s2-q6-sum', 'ia-s3-q8-b', 'ia-s2-q6', 'ia-s3-q8-ab'],
};
