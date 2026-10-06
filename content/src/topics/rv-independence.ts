/**
 * rv.independence: X and Y are independent when P(X = x, Y = y) = P(X = x) P(Y = y) for all
 * x and y; then functions of them are independent and E(XY) = E(X) E(Y). From the Faculty
 * schedule ("independence of random variables"), IA Probability Example Sheet 2 Q5(c) (the
 * longest sequence of independent Bernoulli(1/2) variables on {0, 1}^3 has length 3) and
 * Q12 (record years: the indicators Y_i are independent Bernoulli(1/i)), and Sheet 3 Q7
 * (the Chebyshev order inequality, by independent copies). The sheets have no official
 * solutions; the answers are checked by searching every family of events and listing every
 * permutation.
 */
import type { Rng } from '@learnhub/mastery';
import { auto, cite, same, supervision } from '../cambridge';
import { add, int, mul, pick, q, str, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { distinctFrom, draw, expect, permutations, type Dist } from '../partv-c';
import { computedTex, listOf, math, t, texOfRational, type Rich } from '../rich';
import { worked, workedCambridge, type ProbabilityClaim, type TopicContent } from '../topic';

const S2 = 'ia-prob-sheet-2' as const;
const probsTex = (d: Dist) => computedTex(d.ps.map(texOfRational).join(', '));

// ---------------------------------------------------------------- the sum of two independent variables

const SMALL: readonly Dist[] = [
  { xs: [0, 1, 2], ps: [q(1, 4), q(1, 2), q(1, 4)] },
  { xs: [0, 1], ps: [q(2, 3), q(1, 3)] },
  { xs: [1, 2, 3], ps: [q(1, 2), q(1, 3), q(1, 6)] },
  { xs: [0, 2], ps: [q(1, 5), q(4, 5)] },
  { xs: [0, 1, 3], ps: [q(1, 3), q(1, 3), q(1, 3)] },
  { xs: [1, 2], ps: [q(3, 4), q(1, 4)] },
  { xs: [0, 1, 2, 3], ps: [q(1, 8), q(3, 8), q(3, 8), q(1, 8)] },
];
interface SumP { x: Dist; y: Dist; s: number }
const pairs = ({ x, y, s }: SumP): [number, number][] => {
  const out: [number, number][] = [];
  x.xs.forEach((a, i) => y.xs.forEach((b, j) => { if (a + b === s) out.push([i, j]); }));
  return out;
};
const sumVal = (p: SumP): Rational => pairs(p).reduce((acc, [i, j]) => add(acc, mul(p.x.ps[i] as Rational, p.y.ps[j] as Rational)), q(0));
function sumMis(p: SumP): [Rational, Rich][] {
  const ps = pairs(p);
  const terms = ps.map(([i, j]) => mul(p.x.ps[i] as Rational, p.y.ps[j] as Rational));
  const biggest = terms.reduce((m, x) => (Number(x.num) / Number(x.den) > Number(m.num) / Number(m.den) ? x : m), q(0));
  const [i0, j0] = ps[0] as [number, number];
  return [
    [q(ps.length, p.x.xs.length * p.y.xs.length), t`The pairs of values are not equally likely. Each pair ${math`(x, y)`} has probability ${math`\mathbb{P}(X = x)\mathbb{P}(Y = y)`}, by independence.`],
    [biggest, t`More than one pair of values gives the total ${p.s}: add the probabilities of all of them.`],
    [add(p.x.ps[i0] as Rational, p.y.ps[j0] as Rational), t`For independent variables the probability that both happen is the product ${math`\mathbb{P}(X = x)\mathbb{P}(Y = y)`}, not the sum.`],
  ];
}

const sumOfIndependent = generator<SumP>({
  id: 'sum-of-independent',
  skill: 'Find the distribution of a sum of independent random variables by adding products over the pairs of values.',
  params: (rng) => {
    for (;;) {
      const x = pick(rng, SMALL);
      const y = pick(rng, SMALL);
      const sums = [...new Set(x.xs.flatMap((a) => y.xs.map((b) => a + b)))];
      const p: SumP = { x, y, s: pick(rng, sums) };
      if (pairs(p).length >= 2 && distinctFrom(str(sumVal(p)), sumMis(p).map(([v]) => str(v))) >= 2) return p;
    }
  },
  sane: (p) => (pairs(p).length > 0 ? null : 'not a possible total'),
  problem: (p) => {
    const ps = pairs(p);
    return {
      prompt: t`${math`X`} and ${math`Y`} are independent. ${math`X`} takes the values ${listOf(p.x.xs)} with probabilities ${probsTex(p.x)}; ${math`Y`} takes the values ${listOf(p.y.xs)} with probabilities ${probsTex(p.y)}. Find ${math`\mathbb{P}(X + Y = ${p.s})`}.`,
      answer: { kind: 'exact', expected: str(sumVal(p)) },
      solution: [
        t`${math`X + Y = ${p.s}`} for the pairs ${computedTex(ps.map(([i, j]) => `(${p.x.xs[i] as number}, ${p.y.xs[j] as number})`).join(', '))}, which are disjoint events.`,
        t`By independence each pair has probability ${math`\mathbb{P}(X = x)\mathbb{P}(Y = y)`}: ${computedTex(ps.map(([i, j]) => `${texOfRational(p.x.ps[i] as Rational)} \\cdot ${texOfRational(p.y.ps[j] as Rational)}`).join(' + '))} ${math`= ${sumVal(p)}`}.`,
      ],
    };
  },
  solve: (p) => {
    // The joint table of the two variables, every cell, then the cells on the diagonal x + y = s.
    let total = q(0);
    for (let i = 0; i < p.x.xs.length; i++) for (let j = 0; j < p.y.xs.length; j++) {
      const cell = mul(p.x.ps[i] as Rational, p.y.ps[j] as Rational);
      if ((p.x.xs[i] as number) + (p.y.xs[j] as number) === p.s) total = add(total, cell);
    }
    return str(total);
  },
  misconceptions: (p): Misconception[] => sumMis(p).map(([v, why]) => ({ response: str(v), why })),
  trial: (p, rng) => draw(p.x, rng) + draw(p.y, rng) === p.s,
});

// ---------------------------------------------------------------- E(XY)

interface ProdP { xs: readonly number[]; ys: readonly number[]; cells: readonly (readonly Rational[])[]; given: 'table' | 'marginals' }
const margX = (p: ProdP): Dist => ({ xs: p.xs, ps: p.cells.map((row) => row.reduce((a, b) => add(a, b), q(0))) });
const margY = (p: ProdP): Dist => ({ xs: p.ys, ps: p.ys.map((_, j) => p.cells.reduce((a, row) => add(a, row[j] as Rational), q(0))) });
const prodVal = (p: ProdP): Rational => p.cells.reduce((acc, row, i) => row.reduce((a, c, j) => add(a, mul(c, q((p.xs[i] as number) * (p.ys[j] as number)))), acc), q(0));
function prodMis(p: ProdP): [Rational, Rich][] {
  const [ex, ey] = [expect(margX(p)), expect(margY(p))];
  const cells = p.xs.length * p.ys.length;
  const flat = p.xs.flatMap((x) => p.ys.map((y) => x * y)).reduce((a, b) => a + b, 0);
  return [
    [mul(ex, ey), t`${math`\mathbb{E}(XY) = \mathbb{E}(X)\mathbb{E}(Y)`} needs independence, and these variables are not independent: compute ${math`\sum_{x, y} xy\,\mathbb{P}(X = x, Y = y)`} from the table.`],
    [add(ex, ey), t`That is ${math`\mathbb{E}(X + Y)`}. The question asks for the mean of the product.`],
    [q(flat, cells), t`The cells of the table are not equally likely: weight each product ${math`xy`} by its probability.`],
  ];
}
const PAIRS_OF_MARGINALS: readonly [Dist, Dist][] = [
  [{ xs: [0, 1], ps: [q(1, 2), q(1, 2)] }, { xs: [1, 2], ps: [q(1, 3), q(2, 3)] }],
  [{ xs: [-1, 1], ps: [q(1, 4), q(3, 4)] }, { xs: [0, 1, 2], ps: [q(1, 2), q(1, 4), q(1, 4)] }],
  [{ xs: [1, 2], ps: [q(2, 5), q(3, 5)] }, { xs: [-1, 0, 2], ps: [q(1, 3), q(1, 3), q(1, 3)] }],
  [{ xs: [0, 2], ps: [q(1, 3), q(2, 3)] }, { xs: [1, 3], ps: [q(1, 2), q(1, 2)] }],
];
/** Tables with dependence: a product table with mass moved between two cells of one row and back in another. */
function dependentTable(rng: Rng, xs: Dist, ys: Dist): Rational[][] {
  const base = xs.ps.map((a) => ys.ps.map((b) => mul(a, b)));
  const shift = pick(rng, [q(1, 24), q(1, 12), q(1, 20), q(1, 40)]);
  const [j1, j2] = [0, ys.xs.length - 1];
  const row0 = base[0] as Rational[];
  const row1 = base[1] as Rational[];
  row0[j1] = add(row0[j1] as Rational, shift);
  row0[j2] = add(row0[j2] as Rational, q(-shift.num, shift.den));
  row1[j1] = add(row1[j1] as Rational, q(-shift.num, shift.den));
  row1[j2] = add(row1[j2] as Rational, shift);
  return base;
}

const expectProduct = generator<ProdP>({
  id: 'expect-product',
  skill: 'Compute E(XY): from the joint table in general, and as E(X)E(Y) when X and Y are independent.',
  params: (rng) => {
    for (;;) {
      const [dx, dy] = pick(rng, PAIRS_OF_MARGINALS);
      const given = rng() < 0.5 ? 'table' as const : 'marginals' as const;
      const cells = given === 'table' ? dependentTable(rng, dx, dy) : dx.ps.map((a) => dy.ps.map((b) => mul(a, b)));
      if (cells.some((row) => row.some((c) => c.num <= 0n))) continue;
      const p: ProdP = { xs: dx.xs, ys: dy.xs, cells, given };
      const mis = given === 'table' ? prodMis(p) : prodMis(p).slice(1);
      if (distinctFrom(str(prodVal(p)), mis.map(([v]) => str(v))) >= 2) return p;
    }
  },
  sane: (p) => (p.cells.length === p.xs.length ? null : 'out of range'),
  problem: (p) => {
    const [mx, my] = [margX(p), margY(p)];
    if (p.given === 'marginals') {
      return {
        prompt: t`${math`X`} and ${math`Y`} are independent. ${math`X`} takes the values ${listOf(mx.xs)} with probabilities ${probsTex(mx)}; ${math`Y`} takes the values ${listOf(my.xs)} with probabilities ${probsTex(my)}. Find ${math`\mathbb{E}(XY)`}.`,
        answer: { kind: 'exact', expected: str(prodVal(p)) },
        solution: [
          t`For independent ${math`X`} and ${math`Y`}, ${math`\mathbb{E}(XY) = \mathbb{E}(X)\mathbb{E}(Y)`}.`,
          t`${math`\mathbb{E}(X) = ${expect(mx)}`} and ${math`\mathbb{E}(Y) = ${expect(my)}`}, so ${math`\mathbb{E}(XY) = ${prodVal(p)}`}.`,
        ],
      };
    }
    const cellsText = computedTex(p.xs.flatMap((x, i) => p.ys.map((y, j) => `\\mathbb{P}(X = ${x}, Y = ${y}) = ${texOfRational((p.cells[i] as Rational[])[j] as Rational)}`)).join(',\\ '));
    return {
      prompt: t`The joint distribution of ${math`X`} and ${math`Y`} is ${cellsText}. Find ${math`\mathbb{E}(XY)`}.`,
      answer: { kind: 'exact', expected: str(prodVal(p)) },
      solution: [
        t`${math`\mathbb{E}(XY) = \sum_{x, y} xy\,\mathbb{P}(X = x, Y = y)`}, a function of the pair ${math`(X, Y)`}.`,
        t`Adding ${math`xy`} times each cell gives ${math`\mathbb{E}(XY) = ${prodVal(p)}`}. Compare ${math`\mathbb{E}(X)\mathbb{E}(Y) = ${expect(mx)} \cdot ${expect(my)} = ${mul(expect(mx), expect(my))}`}: the variables are not independent.`,
      ],
    };
  },
  solve: (p) => {
    // A population of equally likely pairs, built from the cells, averaging the products.
    const den = p.cells.flat().reduce((l, c) => (l % c.den === 0n ? l : l * c.den), 1n);
    let total = 0n;
    p.cells.forEach((row, i) => row.forEach((c, j) => { total += ((c.num * den) / c.den) * BigInt((p.xs[i] as number) * (p.ys[j] as number)); }));
    return str(q(total, den));
  },
  misconceptions: (p): Misconception[] => (p.given === 'table' ? prodMis(p) : prodMis(p).slice(1)).map(([v, why]) => ({ response: str(v), why })),
});

// ---------------------------------------------------------------- maximum and minimum of two independent dice

type MM = 'max-le' | 'min-ge' | 'min-gt';
interface MMP { n: number; m: number; k: number; kind: MM }
const mmVal = ({ n, m, k, kind }: MMP): Rational => {
  if (kind === 'max-le') return q(k * k, n * m);
  const j = kind === 'min-ge' ? k : k + 1;
  return q((n - j + 1) * (m - j + 1), n * m);
};
function mmMis(p: MMP): [Rational, Rich][] {
  const { n, m, k, kind } = p;
  if (kind === 'max-le') {
    return [
      [q(k, n), t`The larger is at most ${k} only when both dice are: multiply ${q(k, n)} by ${q(k, m)}, using independence.`],
      [q((k - 1) * (k - 1), n * m), t`"At most ${k}" includes ${k}: each die has ${k} faces from ${1} to ${k}.`],
      [q(k * m + k * n - k * k, n * m), t`That is the chance that at least one die is at most ${k}, which is the event for the smaller one.`],
    ];
  }
  const j = kind === 'min-ge' ? k : k + 1;
  return [
    [q(n - j + 1, n), t`The smaller is at least ${j} only when both dice are: multiply the two chances, using independence.`],
    [q((n - j) * (m - j), n * m), t`A die shows at least ${j} on the faces ${j} to its top face, which includes ${j} itself.`],
    [q((n - j + 1) * m + (m - j + 1) * n - (n - j + 1) * (m - j + 1), n * m), t`That is the chance that at least one die is that large, which is the event for the larger one.`],
  ];
}

const maxMin = generator<MMP>({
  id: 'max-min',
  skill: 'Find the distribution of the maximum or minimum of independent variables by multiplying the chances that each one is on the right side.',
  params: (rng) => {
    for (;;) {
      const n = pick(rng, [4, 6, 8, 10, 12]);
      const m = pick(rng, [4, 6, 8, 10, 12]);
      const kind = pick(rng, ['max-le', 'min-ge', 'min-gt'] as const);
      const k = int(rng, 2, Math.min(n, m) - 1);
      const p: MMP = { n, m, k, kind };
      if (distinctFrom(str(mmVal(p)), mmMis(p).map(([v]) => str(v))) >= 2) return p;
    }
  },
  sane: ({ n, m, k }) => (k >= 2 && k < Math.min(n, m) ? null : 'out of range'),
  problem: (p) => {
    const { n, m, k, kind } = p;
    const event = kind === 'max-le' ? math`\max(X, Y) \le ${k}` : kind === 'min-ge' ? math`\min(X, Y) \ge ${k}` : math`\min(X, Y) > ${k}`;
    const steps: Rich[] = kind === 'max-le'
      ? [t`${math`\max(X, Y) \le ${k}`} exactly when ${math`X \le ${k}`} and ${math`Y \le ${k}`}. These are independent events, so the probability is ${math`${q(k, n)} \cdot ${q(k, m)} = ${mmVal(p)}`}.`]
      : [t`${event} exactly when both dice are at least ${kind === 'min-ge' ? k : k + 1}. By independence the probability is ${math`${q(n - (kind === 'min-ge' ? k : k + 1) + 1, n)} \cdot ${q(m - (kind === 'min-ge' ? k : k + 1) + 1, m)} = ${mmVal(p)}`}.`];
    return {
      prompt: t`${math`X`} is the score on a fair ${n}-sided die and ${math`Y`} on an independent fair ${m}-sided die, each numbered from ${1}. Find ${math`\mathbb{P}(${event})`}.`,
      answer: { kind: 'exact', expected: str(mmVal(p)) },
      solution: steps,
    };
  },
  solve: ({ n, m, k, kind }) => {
    let hit = 0;
    for (let x = 1; x <= n; x++) for (let y = 1; y <= m; y++) {
      if (kind === 'max-le' ? Math.max(x, y) <= k : kind === 'min-ge' ? Math.min(x, y) >= k : Math.min(x, y) > k) hit++;
    }
    return str(q(hit, n * m));
  },
  misconceptions: (p): Misconception[] => mmMis(p).map(([v, why]) => ({ response: str(v), why })),
  trial: ({ n, m, k, kind }, rng) => {
    const x = 1 + Math.floor(rng() * n);
    const y = 1 + Math.floor(rng() * m);
    return kind === 'max-le' ? Math.max(x, y) <= k : kind === 'min-ge' ? Math.min(x, y) >= k : Math.min(x, y) > k;
  },
});

// ---------------------------------------------------------------- Cambridge problems

/**
 * The longest family of mutually independent events of probability 1/2 in {0, 1}^3 with
 * equally likely outcomes: events are 8-bit masks with 4 bits set, and a family is
 * independent when every subfamily's intersection has 8 / 2^size outcomes.
 */
function longestIndependentFamily(): number {
  const events: number[] = [];
  for (let m = 0; m < 256; m++) if (popcount(m) === 4) events.push(m);
  let best = 0;
  const grow = (family: number[], from: number): void => {
    best = Math.max(best, family.length);
    for (let i = from; i < events.length; i++) {
      const next = [...family, events[i] as number];
      if (independentFamily(next)) grow(next, i + 1);
    }
  };
  grow([], 0);
  return best;
}
function popcount(m: number): number { let c = 0; for (let x = m; x > 0; x >>= 1) c += x & 1; return c; }
function independentFamily(f: readonly number[]): boolean {
  for (let sub = 1; sub < 1 << f.length; sub++) {
    let inter = 255;
    let size = 0;
    for (let i = 0; i < f.length; i++) if ((sub >> i) & 1) { inter &= f[i] as number; size++; }
    if (popcount(inter) * 2 ** size !== 8) return false;
  }
  return true;
}
const q5c = auto({
  id: 'ia-s2-q5-c',
  source: cite(S2, 'Q5(c)'),
  title: t`The longest independent sequence`,
  prompt: t`Consider the probability space ${math`\Omega = \{${0}, ${1}\}^{${3}}`} with equally likely outcomes. What is the length of the longest sequence of independent Bernoulli random variables of parameter ${q(1, 2)} that can be defined on ${math`\Omega`}?`,
  answer: { kind: 'exact', expected: '3' },
  solution: [
    t`The three coordinates ${math`X_{i}(\omega) = \omega_{i}`} are independent Bernoulli(${q(1, 2)}) variables: each pattern of their values is one outcome, with probability ${math`${q(1, 8)} = ${q(1, 2)}^{${3}}`}.`,
    t`Four is impossible. Four independent Bernoulli(${q(1, 2)}) variables take each of their ${16} patterns of values with probability ${math`${q(1, 2)}^{${4}} = ${q(1, 16)}`}, but every event of ${math`\Omega`} has probability a multiple of ${q(1, 8)}.`,
    t`So the longest sequence has length ${3}.`,
  ],
  reference: '3',
  verify: () => same('longest independent family of events of size 4 in {0,1}^3', longestIndependentFamily(), 3),
  misconceptions: [
    { response: '70', why: t`There are ${70} Bernoulli(${q(1, 2)}) variables, but most pairs of them are not independent.` },
    { response: '8', why: t`Independence needs every pattern of values to have probability ${math`${2}^{-k}`} for ${math`k`} variables, and ${math`\Omega`} has only ${8} outcomes: at most ${3} fair bits.` },
  ],
});

/** P(years a and b are both records) for a uniformly random ranking of n years, by listing every permutation. */
function recordsBoth(n: number, a: number, b: number): Rational {
  const perms = permutations(n);
  const isRecord = (perm: readonly number[], k: number): boolean => perm.slice(0, k - 1).every((x) => x > (perm[k - 1] as number));
  return q(perms.filter((perm) => isRecord(perm, a) && isRecord(perm, b)).length, perms.length);
}
const [RN, RA, RB] = [5, 2, 4];
const q12 = auto({
  id: 'ia-s2-q12-two-records',
  source: cite(S2, 'Q12', true),
  title: t`Two record years`,
  prompt: t`Let ${math`a_{${1}}, \ldots, a_{${RN}}`} be a ranking of the yearly rainfalls in Cambridge over the next ${RN} years, a uniformly random permutation of ${math`${1}, \ldots, ${RN}`}. Year ${math`k`} is a record year if ${math`a_{k} < a_{i}`} for all ${math`i < k`}. What is the probability that years ${RA} and ${RB} are both record years?`,
  answer: { kind: 'exact', expected: str(q(1, RA * RB)) },
  solution: [
    t`Year ${math`k`} is a record when ${math`a_{k}`} is the smallest of ${math`a_{${1}}, \ldots, a_{k}`}. By symmetry each of these ${math`k`} values is equally likely to be the smallest, so ${math`\mathbb{P}(Y_{k} = ${1}) = ${1}/k`}.`,
    t`The ${math`Y_{k}`} are independent: whether ${math`a_{k}`} is the least of the first ${math`k`} does not depend on the order among the first ${math`k - ${1}`}. So ${math`\mathbb{P}(Y_{${RA}} = Y_{${RB}} = ${1}) = ${q(1, RA)} \cdot ${q(1, RB)} = ${q(1, RA * RB)}`}.`,
  ],
  reference: str(q(1, RA * RB)),
  verify: () => same(`records at ${RA} and ${RB} among ${RN}! permutations`, str(recordsBoth(RN, RA, RB)), str(q(1, RA * RB))),
  misconceptions: [
    { response: str(q(1, RB)), why: t`That is the chance year ${RB} is a record. Year ${RA} must be one too: multiply by ${q(1, RA)}, by independence.` },
    { response: str(q(1, RA + RB)), why: t`The chances multiply, ${q(1, RA)} times ${q(1, RB)}, because the record indicators are independent.` },
  ],
});

const q12proof = supervision({
  id: 'ia-s2-q12-independent',
  source: cite(S2, 'Q12'),
  title: t`Record years are independent`,
  prompt: t`In Q${12}, with ${math`Y_{i} = ${1}`} if year ${math`i`} is a record and ${math`${0}`} otherwise, find the distribution of ${math`Y_{i}`} and show that ${math`Y_{${1}}, \ldots, Y_{n}`} are independent. Hint: count the permutations with prescribed record years by placing the values of ${math`a_{n}, a_{n - ${1}}, \ldots`} in turn.`,
  writeUp: 'proof',
});
const q5cProof = supervision({
  id: 'ia-s2-q5-c-why',
  source: cite(S2, 'Q5(c)'),
  title: t`Why not four?`,
  prompt: t`Show that no four independent Bernoulli random variables of parameter ${q(1, 2)} can be defined on ${math`\{${0}, ${1}\}^{${3}}`} with equally likely outcomes. More generally, on a space of ${math`N`} equally likely outcomes, how long can a sequence of independent Bernoulli(${q(1, 2)}) variables be?`,
  writeUp: 'proof',
});
const q7order = supervision({
  id: 'ia-s3-q7',
  source: cite('ia-prob-sheet-3', 'Q7'),
  title: t`The Chebyshev order inequality`,
  prompt: t`Let ${math`X`} be a real-valued random variable and ${math`f, g: \mathbb{R} \to \mathbb{R}`} non-decreasing. Prove that ${math`\mathbb{E}(f(X))\,\mathbb{E}(g(X)) \le \mathbb{E}(f(X)g(X))`}. Hint: consider ${math`(f(X_{${1}}) - f(X_{${2}}))(g(X_{${1}}) - g(X_{${2}}))`}, where ${math`X_{${1}}`} and ${math`X_{${2}}`} are independent copies of ${math`X`}. Which property of independent variables do you use?`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

const UNCORR: Dist = { xs: [-1, 0, 1], ps: [q(1, 3), q(1, 3), q(1, 3)] };
const randomRanking = (rng: Rng, n: number): number[] => {
  const a = Array.from({ length: n }, (_, i) => i + 1);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j] as number, a[i] as number]; }
  return a;
};
const claims: ProbabilityClaim[] = [
  {
    what: `Sheet 2 Q12, n = ${RN}: years ${RA} and ${RB} both records`,
    exact: q(1, RA * RB),
    trial: (rng) => {
      const a = randomRanking(rng, RN);
      const rec = (k: number): boolean => a.slice(0, k - 1).every((x) => x > (a[k - 1] as number));
      return rec(RA) && rec(RB);
    },
  },
];

export const rvIndependence: TopicContent = {
  topicId: 'rv.independence',
  goal: t`Decide when random variables are independent, and use ${math`\mathbb{P}(X = x, Y = y) = \mathbb{P}(X = x)\mathbb{P}(Y = y)`} and ${math`\mathbb{E}(XY) = \mathbb{E}(X)\mathbb{E}(Y)`}.`,
  lesson: [
    { kind: 'p', text: t`Independence of events says one tells you nothing about the other. For random variables the same must hold for every pair of values at once.` },
    { kind: 'rule', text: t`Discrete random variables ${math`X`} and ${math`Y`} are [[independent-random-variables|independent]] if ${math`\mathbb{P}(X = x, Y = y) = \mathbb{P}(X = x)\,\mathbb{P}(Y = y)`} for all ${math`x`} and ${math`y`}. Then ${math`\{X \in A\}`} and ${math`\{Y \in B\}`} are independent events for all sets ${math`A, B`}, and ${math`f(X)`} and ${math`g(Y)`} are independent for any functions ${math`f, g`}. Several variables are independent when the joint probabilities of all of them factorise, and a sequence of independent variables with one distribution is [[iid|i.i.d.]]` },
    { kind: 'rule', text: t`If ${math`X`} and ${math`Y`} are independent with finite means, ${math`\mathbb{E}(XY) = \mathbb{E}(X)\,\mathbb{E}(Y)`}: the double sum ${math`\sum_{x, y} xy\,\mathbb{P}(X = x)\mathbb{P}(Y = y)`} factorises.` },
    { kind: 'p', text: t`The converse is false. Let ${math`X`} be uniform on ${listOf(UNCORR.xs)} and ${math`Y = X^{${2}}`}. Then ${math`\mathbb{E}(XY) = \mathbb{E}(X^{${3}}) = ${expect(UNCORR, (x) => q(x * x * x))} = \mathbb{E}(X)\mathbb{E}(Y)`}, yet ${math`\mathbb{P}(X = ${0}, Y = ${0}) = ${q(1, 3)}`} while ${math`\mathbb{P}(X = ${0})\mathbb{P}(Y = ${0}) = ${q(1, 9)}`}: ${math`Y`} is a function of ${math`X`}.` },
    { kind: 'p', text: t`Independence limits what a small space can hold. On ${math`\{${0}, ${1}\}^{${3}}`} with equally likely outcomes the three coordinates are independent fair bits, but four are impossible: they would need ${16} patterns of probability ${q(1, 16)}, and every event has probability a multiple of ${q(1, 8)} (Sheet ${2} Q${5}(c)).` },
    { kind: 'p', text: t`Independence can hide in a symmetric setup. For a uniformly random ranking of ${math`n`} years, year ${math`k`} is a record (lowest so far) with probability ${math`${1}/k`}, and the record indicators are independent (Sheet ${2} Q${12}): years ${RA} and ${RB} are both records among ${RN} with probability ${q(1, RA * RB)}.` },
  ],
  examples: [
    workedCambridge(q5c),
    worked(sumOfIndependent, { x: SMALL[0] as Dist, y: SMALL[2] as Dist, s: 3 }, t`The total of two independent variables`),
    worked(maxMin, { n: 6, m: 8, k: 4, kind: 'max-le' }, t`The larger of two independent dice`),
  ],
  generators: [sumOfIndependent, expectProduct, maxMin],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['independent-random-variables', 'iid'],
  claims,
  cambridge: [q12, q12proof, q5cProof, q7order],
};
