/**
 * gf.random-sums: S_N = X_1 + ... + X_N with N independent of the independent, identically
 * distributed X_i has pgf G_N(G_X(t)), mean E(N)E(X), and variance
 * E(N) var(X) + var(N) E(X)^2. From the Faculty schedule ("random sum formula") and IA
 * Probability Example Sheet 3 Q8(a), (b) (the mean and variance of a random sum) and Q10
 * (immature and mature generations, two compositions of pgfs). The sheet has no official
 * solutions: Q10 is adapted to a concrete offspring pgf, and every answer is checked by
 * listing every outcome or by exact composition of polynomials.
 */
import type { Rng } from '@learnhub/mastery';
import { auto, cite, supervision, withUses } from '../cambridge';
import { add, int, mul, pick, q, str, sub, toFloat, type Rational } from '../math';
import { meanQ, polyCompose, polyMul, polyPow, polyTex, polyText, sampleFrom, samplePoisson, varQ, type Poly } from '../partv-d';
import { generator, type Misconception } from '../problem';
import { computedMath, computedTex, dmath, math, t, type Rich } from '../rich';
import { checkFrom, worked, workedCambridge, type ProbabilityClaim, type TopicContent } from '../topic';

const [mN, mS, mt] = [math`N`, math`S_{N}`, math`t`];
const SH3 = 'ia-prob-sheet-3' as const;
const ONE = q(1);

// ---------------------------------------------------------------- mean and variance

interface Law { name: Rich; mean: Rational; variance: Rational; dist?: Rational[]; sample: (rng: Rng) => number }
const binom = (n: number, p: Rational): Rational[] => polyPow([sub(ONE, p), p], n);
const nLaw = (k: number, a: number, pr: Rational): Law => {
  if (k === 0) return { name: t`${math`\text{Po}(${a})`}`, mean: q(a), variance: q(a), sample: (rng) => samplePoisson(a, rng) };
  if (k === 1) { const d = binom(a, pr); return { name: t`${math`B(${a}, ${pr})`}`, mean: meanQ(d), variance: varQ(d), dist: d, sample: (rng) => sampleFrom(d, rng) }; }
  const d = Array.from({ length: a + 1 }, () => q(1, a + 1));
  return { name: t`uniform on ${math`\{${0}, ${1}, \ldots, ${a}\}`}`, mean: meanQ(d), variance: varQ(d), dist: d, sample: (rng) => sampleFrom(d, rng) };
};
const xLaw = (k: number, b: number, pr: Rational): Law => {
  if (k === 0) { const d = [q(0), ...Array.from({ length: 6 }, () => q(1, 6))]; return { name: t`the score on a fair die`, mean: meanQ(d), variance: varQ(d), dist: d, sample: (rng) => sampleFrom(d, rng) }; }
  if (k === 1) { const d = [sub(ONE, pr), pr]; return { name: t`${1} with probability ${pr} and ${0} otherwise`, mean: meanQ(d), variance: varQ(d), dist: d, sample: (rng) => sampleFrom(d, rng) }; }
  const d = [q(0), ...Array.from({ length: b }, () => q(1, b))];
  return { name: t`uniform on ${math`\{${1}, \ldots, ${b}\}`}`, mean: meanQ(d), variance: varQ(d), dist: d, sample: (rng) => sampleFrom(d, rng) };
};

interface MvP { nk: number; a: number; nr: Rational; xk: number; b: number; xr: Rational; ask: 'mean' | 'variance' }
const PRS = [q(1, 2), q(1, 3), q(2, 3), q(1, 4), q(3, 4)];
const mvVal = (p: MvP): Rational => {
  const N = nLaw(p.nk, p.a, p.nr);
  const X = xLaw(p.xk, p.b, p.xr);
  return p.ask === 'mean' ? mul(N.mean, X.mean) : add(mul(N.mean, X.variance), mul(N.variance, mul(X.mean, X.mean)));
};
function mvMis(p: MvP): { v: Rational; why: Rich }[] {
  const N = nLaw(p.nk, p.a, p.nr);
  const X = xLaw(p.xk, p.b, p.xr);
  if (p.ask === 'mean') return [
    { v: add(N.mean, X.mean), why: t`The means multiply: on average ${math`E(N)`} terms, each of mean ${math`E(X)`}.` },
    { v: X.mean, why: t`That is one term. There are ${math`E(N)`} of them on average.` },
  ];
  return [
    { v: mul(N.mean, X.variance), why: t`That is the spread from the ${math`X_{i}`} alone. The number of terms is random too: add ${math`\operatorname{Var}(N)E(X)^{${2}}`}.` },
    { v: mul(N.variance, mul(X.mean, X.mean)), why: t`That is the spread from ${mN} alone. Add ${math`E(N)\operatorname{Var}(X)`}, the spread of the terms.` },
    { v: add(mul(N.mean, X.variance), mul(N.variance, X.mean)), why: t`The second term is ${math`\operatorname{Var}(N)E(X)^{${2}}`}: square the mean of ${math`X`}.` },
  ];
}

const meanVar = generator<MvP>({
  id: 'mean-variance',
  skill: 'Find E(S_N) = E(N)E(X) and Var(S_N) = E(N)Var(X) + Var(N)E(X)^2 for a random sum.',
  params: (rng) => {
    for (;;) {
      const p: MvP = { nk: int(rng, 0, 2), a: int(rng, 2, 5), nr: pick(rng, PRS), xk: int(rng, 0, 2), b: int(rng, 2, 4), xr: pick(rng, PRS), ask: pick(rng, ['mean', 'variance'] as const) };
      const right = str(mvVal(p));
      if (new Set(mvMis(p).map((m) => str(m.v)).filter((m) => m !== right)).size >= 2) return p;
    }
  },
  sane: ({ a, b }) => (a >= 2 && b >= 2 ? null : 'out of range'),
  problem: (p) => {
    const N = nLaw(p.nk, p.a, p.nr);
    const X = xLaw(p.xk, p.b, p.xr);
    return {
      prompt: t`${mN} is ${N.name}, and ${math`X_{${1}}, X_{${2}}, \ldots`} are independent of ${mN} and of each other, each ${X.name}. Let ${math`S_{N} = X_{${1}} + \cdots + X_{N}`}. Find ${p.ask === 'mean' ? math`E(S_{N})` : math`\operatorname{Var}(S_{N})`}.`,
      answer: { kind: 'exact', expected: str(mvVal(p)) },
      solution: [
        t`${math`E(N) = ${N.mean}`}, ${math`\operatorname{Var}(N) = ${N.variance}`}, ${math`E(X) = ${X.mean}`}, and ${math`\operatorname{Var}(X) = ${X.variance}`}.`,
        p.ask === 'mean'
          ? t`Given ${math`N = n`}, the mean is ${math`nE(X)`}; averaging over ${mN}, ${math`E(S_{N}) = E(N)E(X) = ${N.mean} \times ${X.mean} = ${mvVal(p)}`}.`
          : t`${math`\operatorname{Var}(S_{N}) = E(N)\operatorname{Var}(X) + \operatorname{Var}(N)E(X)^{${2}} = ${N.mean} \times ${X.variance} + ${N.variance} \times \left(${X.mean}\right)^{${2}} = ${mvVal(p)}`}.`,
      ],
    };
  },
  solve: (p) => {
    const N = nLaw(p.nk, p.a, p.nr);
    const X = xLaw(p.xk, p.b, p.xr) as Required<Law>;
    if (N.dist !== undefined) {
      // The whole distribution of S_N, by composing the pgfs exactly, then its moments.
      const s = polyCompose(N.dist, X.dist);
      return str(p.ask === 'mean' ? meanQ(s) : varQ(s));
    }
    // N Poisson: E(S) = lambda E(X), and Var(S) = lambda E(X^2), from G_S(t) = exp(lambda(G_X(t) - 1)).
    const ex2 = X.dist.reduce((s, pk, k) => add(s, mul(q(k * k), pk)), q(0));
    return str(p.ask === 'mean' ? mul(N.mean, X.mean) : mul(N.mean, ex2));
  },
  misconceptions: (p): Misconception[] => mvMis(p).map((m) => ({ response: str(m.v), why: m.why })),
});

// ---------------------------------------------------------------- a probability, by composing pgfs

interface PmfP { n: Rational[]; x: Rational[]; k: number }
const pmfVal = ({ n, x, k }: PmfP): Rational => polyCompose(n, x)[k] ?? q(0);
const pmfMis = ({ n, x, k }: PmfP): Rational[] => [polyCompose(x, n)[k] ?? q(0), polyMul(n, x)[k] ?? q(0), n[k] ?? q(0)];
function randDist(rng: Rng, s: number, d: number): Rational[] {
  const cuts = new Set<number>();
  while (cuts.size < s - 1) cuts.add(int(rng, 1, d - 1));
  const pts = [0, ...[...cuts].sort((a, b) => a - b), d];
  return pts.slice(1).map((v, i) => q(v - (pts[i] as number), d));
}

const pmf = generator<PmfP>({
  id: 'probability',
  skill: 'Find P(S_N = k) as a coefficient of G_N(G_X(t)).',
  params: (rng) => {
    for (;;) {
      const p: PmfP = { n: randDist(rng, 3, pick(rng, [4, 5, 6])), x: randDist(rng, 2, pick(rng, [2, 3, 4, 5])), k: int(rng, 0, 2) };
      const right = str(pmfVal(p));
      if (pmfVal(p).num > 0n && new Set(pmfMis(p).map(str).filter((m) => m !== right)).size >= 2) return p;
    }
  },
  sane: ({ n, x }) => (n.length === 3 && x.length === 2 ? null : 'out of range'),
  problem: (p) => {
    const { n, x, k } = p;
    const comp = polyCompose(n, x);
    return {
      prompt: t`${mN} has pgf ${math`G_{N}(s) = ${computedTex(polyTex(n, 's'))}`}, and ${math`X_{${1}}, X_{${2}}, \ldots`} are independent of ${mN} and of each other, each with pgf ${math`G_{X}(t) = ${computedTex(polyTex(x))}`}. Find ${math`P(S_{N} = ${k})`}, where ${math`S_{N} = X_{${1}} + \cdots + X_{N}`}.`,
      answer: { kind: 'exact', expected: str(pmfVal(p)) },
      solution: [
        t`Given ${math`N = m`}, ${mS} is a sum of ${math`m`} independent terms, with pgf ${math`G_{X}(t)^{m}`}. Averaging over ${mN}: ${math`G_{S}(t) = \sum_{m} P(N = m)G_{X}(t)^{m} = G_{N}(G_{X}(t))`}.`,
        t`Substituting, ${math`G_{S}(t) = ${computedTex(polyTex(comp))}`}, and the coefficient of ${math`t^{${k}}`} is ${pmfVal(p)}.`,
      ],
    };
  },
  solve: ({ n, x, k }) => {
    // Condition on N and list every value of the X_i, by brute force.
    let s = q(0);
    n.forEach((pn, m) => {
      const ways = (left: number, sum: number, pr: Rational): void => {
        if (left === 0) { if (sum === k) s = add(s, mul(pn, pr)); return; }
        x.forEach((px, v) => ways(left - 1, sum + v, mul(pr, px)));
      };
      ways(m, 0, ONE);
    });
    return str(s);
  },
  misconceptions: (p): Misconception[] => {
    const [rev, prod, nOnly] = pmfMis(p) as [Rational, Rational, Rational];
    return [
      { response: str(rev), why: t`The order is ${math`G_{N}(G_{X}(t))`}: the outer function is the pgf of the number of terms. ${math`G_{X}(G_{N}(t))`} answers a different question.` },
      { response: str(prod), why: t`${math`G_{N}(t)G_{X}(t)`} is the pgf of ${math`N + X`}, a sum of two variables, not a random sum. Substitute ${math`G_{X}(t)`} into ${math`G_{N}`}.` },
      { response: str(nOnly), why: t`That is ${math`P(N = ${p.k})`}, the chance of ${p.k} terms. Their total depends on the values of the terms too.` },
    ];
  },
  trial: ({ n, x, k }, rng) => {
    const m = sampleFrom(n, rng);
    let s = 0;
    for (let i = 0; i < m; i++) s += sampleFrom(x, rng);
    return s === k;
  },
});

// ---------------------------------------------------------------- the pgf of a random sum, in closed form

type CKind = 'poi-ber' | 'bin-ber' | 'poi-bin' | 'bin-poi';
interface CompP { kind: CKind; a: number; r: Rational; m: number; p: Rational }
const paren = (r: Rational): string => `(${str(r)})`;
function compTexts({ kind, a, r, m, p }: CompP): { gn: Rich; gx: Rich; right: string; reversed: string; product: string } {
  const qp = sub(ONE, p);
  const qr = sub(ONE, r);
  const ber = `(${paren(qp)} + ${paren(p)}*t)`;
  switch (kind) {
    case 'poi-ber': return {
      gn: t`${math`G_{N}(s) = e^{${a}(s - ${1})}`}`, gx: t`${math`G_{X}(t) = ${qp} + ${p}t`}`,
      right: `exp(${a}*(${ber} - 1))`, reversed: `${paren(qp)} + ${paren(p)}*exp(${a}*(t - 1))`, product: `exp(${a}*(t - 1))*${ber}`,
    };
    case 'bin-ber': return {
      gn: t`${math`G_{N}(s) = \left(${qr} + ${r}s\right)^{${a}}`}`, gx: t`${math`G_{X}(t) = ${qp} + ${p}t`}`,
      right: `(${paren(qr)} + ${paren(r)}*${ber})^${a}`, reversed: `${paren(qp)} + ${paren(p)}*(${paren(qr)} + ${paren(r)}*t)^${a}`, product: `(${paren(qr)} + ${paren(r)}*t)^${a}*${ber}`,
    };
    case 'poi-bin': return {
      gn: t`${math`G_{N}(s) = e^{${a}(s - ${1})}`}`, gx: t`${math`G_{X}(t) = \left(${qp} + ${p}t\right)^{${m}}`}`,
      right: `exp(${a}*(${ber}^${m} - 1))`, reversed: `(${paren(qp)} + ${paren(p)}*exp(${a}*(t - 1)))^${m}`, product: `exp(${a}*(t - 1))*${ber}^${m}`,
    };
    case 'bin-poi': return {
      gn: t`${math`G_{N}(s) = \left(${qr} + ${r}s\right)^{${a}}`}`, gx: t`${math`G_{X}(t) = e^{${m}(t - ${1})}`}`,
      right: `(${paren(qr)} + ${paren(r)}*exp(${m}*(t - 1)))^${a}`, reversed: `exp(${m}*((${paren(qr)} + ${paren(r)}*t)^${a} - 1))`, product: `(${paren(qr)} + ${paren(r)}*t)^${a}*exp(${m}*(t - 1))`,
    };
  }
}
const T_DOM = { t: { kind: 'real' as const, min: -1, max: 1 } };

const compose = generator<CompP>({
  id: 'compose',
  skill: 'Write the pgf of a random sum as G_N(G_X(t)) for named distributions.',
  params: (rng) => ({ kind: pick(rng, ['poi-ber', 'bin-ber', 'poi-bin', 'bin-poi'] as const), a: int(rng, 2, 5), r: pick(rng, PRS), m: int(rng, 2, 4), p: pick(rng, PRS) }),
  sane: ({ a, m }) => (a >= 2 && m >= 2 ? null : 'out of range'),
  problem: (p) => {
    const tx = compTexts(p);
    const special = p.kind === 'poi-ber' ? t` It is ${math`e^{${a2(p)}(t - ${1})}`}: the sum is ${math`\text{Po}(${a2(p)})`}, the thinning of a Poisson count.` : t``;
    return {
      prompt: t`${mN} has pgf ${tx.gn}, and ${math`X_{${1}}, X_{${2}}, \ldots`} are independent of ${mN} and of each other, each with pgf ${tx.gx}. Give the pgf of ${math`S_{N} = X_{${1}} + \cdots + X_{N}`} as an expression in ${mt}.`,
      answer: { kind: 'expression', expected: tx.right, variables: ['t'], domains: T_DOM },
      solution: [
        t`${math`G_{S}(t) = E\left(E(t^{S_{N}} \mid N)\right) = E\left(G_{X}(t)^{N}\right) = G_{N}(G_{X}(t))`}: put ${math`G_{X}(t)`} in place of ${math`s`} in ${math`G_{N}(s)`}.`,
        t`So ${math`G_{S}(t) = ${computedMath(tx.right)}`}.${special}`,
      ],
    };
  },
  // The same pgfs, simplified or expanded another way.
  solve: ({ kind, a, r, m, p }) => {
    const rp = str(mul(r, p));
    switch (kind) {
      case 'poi-ber': return `exp(${str(mul(q(a), p))}*(t - 1))`;
      case 'bin-ber': return `(1 - ${rp} + ${rp}*t)^${a}`;
      case 'poi-bin': return `exp(${a}*(${polyText(polyPow([sub(ONE, p), p], m))} - 1))`;
      case 'bin-poi': return `(1 - (${str(r)})*(1 - exp(${m}*(t - 1))))^${a}`;
    }
  },
  misconceptions: (p): Misconception[] => {
    const tx = compTexts(p);
    return [
      { response: tx.reversed, why: t`That is ${math`G_{X}(G_{N}(t))`}. The pgf of the number of terms goes outside: ${math`G_{N}(G_{X}(t))`}.` },
      { response: tx.product, why: t`${math`G_{N}(t)G_{X}(t)`} is the pgf of ${math`N + X`} for independent ${mN} and ${math`X`}. A random sum substitutes one pgf into the other.` },
    ];
  },
});
const a2 = (p: CompP): Rational => mul(q(p.a), p.p);

// ---------------------------------------------------------------- Cambridge problems

const MOM_DOM = { mu: { kind: 'real' as const, min: -3, max: 3 }, sigma: { kind: 'real' as const, min: 0.1, max: 3 }, m: { kind: 'real' as const, min: 0.1, max: 5 }, v: { kind: 'real' as const, min: 0.1, max: 5 } };
const q8b = auto({
  id: 'ia-s3-q8-b',
  source: cite(SH3, 'Q8(b)', true),
  title: t`The variance of a random sum`,
  prompt: t`${math`X_{${1}}, X_{${2}}, \ldots`} are independent and identically distributed with mean ${math`\mu`} and variance ${math`\sigma^{${2}}`}; ${math`S_{n} = X_{${1}} + \cdots + X_{n}`}; and ${mN} is a bounded non-negative integer random variable, independent of the ${math`X_{i}`}, with ${math`E(N) = m`} and ${math`\operatorname{var}(N) = v`}. Given ${math`E(S_{N}^{${2}} \mid N = n) = n\sigma^{${2}} + n^{${2}}\mu^{${2}}`}, find ${math`\operatorname{var}(S_{N})`} in terms of ${math`\mu`}, ${math`\sigma`}, ${math`m`}, and ${math`v`}.`,
  answer: { kind: 'expression', expected: 'sigma^2*m + mu^2*v', variables: ['mu', 'sigma', 'm', 'v'], domains: MOM_DOM },
  solution: [
    t`Average over ${mN}: ${math`E(S_{N}^{${2}}) = E(N)\sigma^{${2}} + E(N^{${2}})\mu^{${2}} = m\sigma^{${2}} + (v + m^{${2}})\mu^{${2}}`}.`,
    t`By part (a), ${math`E(S_{N}) = \mu m`}. So ${math`\operatorname{var}(S_{N}) = m\sigma^{${2}} + (v + m^{${2}})\mu^{${2}} - \mu^{${2}}m^{${2}} = m\sigma^{${2}} + v\mu^{${2}}`}.`,
  ],
  reference: 'm sigma^2 + v mu^2',
  verify: () => {
    // Exact distributions of S_N for bounded N, by composing pgfs, against the formula.
    const cases: [Poly, Poly][] = [
      [[q(1, 4), q(1, 4), q(1, 4), q(1, 4)], [q(1, 2), q(1, 4), q(1, 4)]],
      [binom(3, q(1, 3)), [q(0), q(1, 6), q(1, 6), q(1, 6), q(1, 6), q(1, 6), q(1, 6)]],
      [[q(1, 2), q(0), q(1, 2)], [q(2, 3), q(1, 3)]],
    ];
    for (const [n, x] of cases) {
      const s = polyCompose(n, x);
      const want = add(mul(meanQ(n), varQ(x)), mul(varQ(n), mul(meanQ(x), meanQ(x))));
      if (str(varQ(s)) !== str(want)) return `computed ${str(varQ(s))}, formula ${str(want)}`;
    }
    return null;
  },
  misconceptions: [
    { response: 'sigma^2*m', why: t`That treats the number of terms as fixed at its mean. ${mN} varies too, which adds ${math`v\mu^{${2}}`}.` },
    { response: 'sigma^2*m + mu^2*m^2', why: t`${math`\mu^{${2}}m^{${2}}`} is ${math`E(S_{N})^{${2}}`}, which the variance subtracts. What is left of ${math`E(N^{${2}})\mu^{${2}}`} is ${math`v\mu^{${2}}`}.` },
  ],
});

// Q10, adapted: each mature individual has 0, 1, or 2 offspring, each with probability 1/3; k = 3.
const F: Poly = [q(1, 3), q(1, 3), q(1, 3)];
const K = 3;
const P_DOM = { p: { kind: 'real' as const, min: 0.05, max: 0.95 }, t: { kind: 'real' as const, min: -1, max: 1 } };
/** P(next generation = j) by listing every individual's outcome, for a rational p. */
function listImmature(p: Rational): Rational[] {
  // Each of the K immature individuals: does not mature (no offspring), or matures and has 0, 1, or 2.
  const one: Rational[] = [add(sub(ONE, p), mul(p, F[0] as Rational)), mul(p, F[1] as Rational), mul(p, F[2] as Rational)];
  let out: Rational[] = [ONE];
  for (let i = 0; i < K; i++) {
    const next = Array.from({ length: out.length + 2 }, () => q(0));
    out.forEach((a, s) => one.forEach((b, v) => { next[s + v] = add(next[s + v] as Rational, mul(a, b)); }));
    out = next;
  }
  return out;
}
function listMature(p: Rational): Rational[] {
  // Each of the K mature parents has 0, 1, or 2 offspring; each offspring matures with probability p.
  let out: Rational[] = [ONE];
  for (let i = 0; i < K; i++) {
    const one: Rational[] = [q(0), q(0), q(0)];
    F.forEach((pf, c) => {
      for (let j = 0; j <= c; j++) {
        // j of the c offspring mature: C(c, j) p^j (1 - p)^(c - j).
        const ways = c === 2 && j === 1 ? 2 : 1;
        let pr = mul(pf, q(ways));
        for (let u = 0; u < j; u++) pr = mul(pr, p);
        for (let u = 0; u < c - j; u++) pr = mul(pr, sub(ONE, p));
        one[j] = add(one[j] as Rational, pr);
      }
    });
    const next = Array.from({ length: out.length + 2 }, () => q(0));
    out.forEach((a, s) => one.forEach((b, v) => { next[s + v] = add(next[s + v] as Rational, mul(a, b)); }));
    out = next;
  }
  return out;
}
const evalAt = (dist: readonly Rational[], x: number): number => dist.reduce((s, c, k) => s + toFloat(c) * x ** k, 0);
const Q10A = '(1 - p + p*(1 + t + t^2)/3)^3';
const Q10B = '((1 + (1 - p + p*t) + (1 - p + p*t)^2)/3)^3';
const q10Intro = t`Each mature animal has ${0}, ${1}, or ${2} offspring, each with probability ${q(1, 3)}, so its offspring pgf is ${math`F(t) = \frac{${1} + t + t^{${2}}}{${3}}`}. Each immature animal grows to maturity with probability ${math`p`}, independently of the others.`;

const q10a = auto({
  id: 'ia-s3-q10-a',
  source: cite(SH3, 'Q10(a)', true),
  title: t`Immature individuals in the next generation`,
  prompt: t`${q10Intro} Starting with ${K} immature individuals, find the generating function of the number of immature individuals in the next generation, as an expression in ${math`p`} and ${mt}.`,
  nudge: t`Not quite. Build the pgf of one immature individual's contribution first; independence does the rest.`,
  hints: [
    t`What does one immature individual contribute to the next generation if it fails to mature, and what if it matures?`,
    t`Seen as a random sum whose number of terms is ${0} or ${1}, what is the pgf of one individual's contribution?`,
    t`How is the pgf of a sum of ${K} independent contributions built from the pgf of one?`,
  ],
  answer: { kind: 'expression', expected: Q10A, variables: ['p', 't'], domains: P_DOM },
  solution: [
    t`Each immature individual contributes no offspring if it fails to mature, and ${math`F`}-distributed offspring if it matures: its contribution has pgf ${math`${1} - p + pF(t)`}, a random sum with ${math`N`} equal to ${0} or ${1}.`,
    t`The ${K} contributions are independent, so the pgf is ${math`(${1} - p + pF(t))^{${K}} = \left(${1} - p + \frac{p(${1} + t + t^{${2}})}{${3}}\right)^{${3}}`}.`,
    t`Find the pgf of one independent unit, then raise it to the number of units.`,
  ],
  reference: '(1 - p + p(1 + t + t^2)/3)^3',
  verify: () => {
    for (const p of [q(1, 3), q(1, 2), q(4, 5)]) {
      const d = listImmature(p);
      for (const x of [-0.6, 0.25, 0.9]) {
        const pp = toFloat(p);
        const closed = (1 - pp + (pp * (1 + x + x * x)) / 3) ** 3;
        if (Math.abs(evalAt(d, x) - closed) > 1e-12) return `p = ${str(p)}, t = ${x}`;
      }
    }
    return null;
  },
  misconceptions: [{ response: '((1 + (1 - p + p*t) + (1 - p + p*t)^2)/3)^3', why: t`That is part (b): mature parents whose offspring then mature. Here the parents are immature: each first matures, then reproduces.` }],
});

const q10b = auto({
  id: 'ia-s3-q10-b',
  source: cite(SH3, 'Q10(b)', true),
  title: t`Mature individuals in the next generation`,
  prompt: t`${q10Intro} Given ${K} mature individuals in the parent generation, find the generating function of the number of mature individuals in the next generation, as an expression in ${math`p`} and ${mt}.`,
  nudge: t`Not quite. The order of the two random steps matters; check which one happens first.`,
  hints: [
    t`For one mature parent, which random count comes first, and what happens to each individual it counts?`,
    t`What is the pgf of the indicator that one offspring matures?`,
    t`In a random sum, which pgf is applied to which, and how do ${K} independent parents combine?`,
  ],
  answer: { kind: 'expression', expected: Q10B, variables: ['p', 't'], domains: P_DOM },
  solution: [
    t`Each parent has ${math`F`}-distributed offspring, and each offspring matures with pgf ${math`${1} - p + pt`}: a random sum, with pgf ${math`F(${1} - p + pt)`}.`,
    t`The ${K} parents are independent: ${math`F(${1} - p + pt)^{${K}}`}, that is ${math`\left(\frac{${1} + (${1} - p + pt) + (${1} - p + pt)^{${2}}}{${3}}\right)^{${3}}`}.`,
    t`In a random sum the pgf of the count is applied to the pgf of each term.`,
  ],
  reference: Q10B,
  verify: () => {
    for (const p of [q(1, 3), q(1, 2), q(4, 5)]) {
      const d = listMature(p);
      for (const x of [-0.6, 0.25, 0.9]) {
        const y = 1 - toFloat(p) + toFloat(p) * x;
        if (Math.abs(evalAt(d, x) - ((1 + y + y * y) / 3) ** 3) > 1e-12) return `p = ${str(p)}, t = ${x}`;
      }
    }
    return null;
  },
  misconceptions: [{ response: Q10A, why: t`That is part (a), immature parents. Here the parents are mature and their offspring mature with probability ${math`p`}: the order of the two pgfs is reversed.` }],
});

const q8a = supervision({
  id: 'ia-s3-q8-a',
  source: cite(SH3, 'Q8(a), (b)'),
  title: t`The mean and variance of a random sum`,
  prompt: t`Let ${math`(X_{n})`} be independent and identically distributed with mean ${math`\mu`} and variance ${math`\sigma^{${2}} < \infty`}, ${math`S_{${0}} = ${0}`}, ${math`S_{n} = X_{${1}} + \cdots + X_{n}`}, and ${mN} a bounded non-negative integer-valued random variable independent of the ${math`X_{n}`}. Show that ${math`E(S_{N}) = \mu E(N)`}. Show that ${math`E(S_{N}^{${2}} \mid N = n) = n\sigma^{${2}} + n^{${2}}\mu^{${2}}`} and hence express ${math`\operatorname{var}(S_{N})`} in terms of ${math`\operatorname{var}(N)`}.`,
  hints: [
    t`Conditional on ${math`N = n`}, what are ${math`E(S_{N})`} and ${math`E(S_{N}^{${2}})`} in terms of ${math`n`}, ${math`\mu`}, and ${math`\sigma`}?`,
    t`How does ${math`E(Y) = E(E(Y \mid N))`} turn those conditional answers into unconditional ones?`,
    t`In ${math`\operatorname{var}(S_{N}) = E(S_{N}^{${2}}) - E(S_{N})^{${2}}`}, how does writing ${math`E(N^{${2}}) = \operatorname{var}(N) + E(N)^{${2}}`} simplify the result?`,
  ],
  writeUp: 'proof',
});

const q10c = supervision({
  id: 'ia-s3-q10-c',
  source: cite(SH3, 'Q10'),
  title: t`Same mean, different variance`,
  prompt: t`Each mature individual has offspring with generating function ${math`F`}, and each immature individual matures with probability ${math`p`}, independently. Starting from ${math`k`} immature individuals, the number of immature individuals in the next generation has generating function ${math`A(t) = (${1} - p + pF(t))^{k}`}; starting from ${math`k`} mature individuals, the number of mature individuals in the next generation has generating function ${math`B(t) = F(${1} - p + pt)^{k}`}. Explain where each comes from, then show that the two distributions have the same mean, but not necessarily the same variance.`,
  hints: [
    t`In each case, which random count comes first, and so which generating function goes inside the other?`,
    t`Differentiating ${math`A`} and ${math`B`} at ${math`t = ${1}`} by the chain rule, what are the two means?`,
    t`For the variances, which simple ${math`F`}, such as every mature individual having exactly two offspring, gives a quick test?`,
  ],
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

const LN: Poly = [q(1, 3), q(1, 3), q(1, 3)];
const LX: Poly = [q(1, 2), q(1, 2)];
const claims: ProbabilityClaim[] = [
  { what: 'S_N = 1 with N uniform on {0, 1, 2} and fair coin terms', exact: polyCompose(LN, LX)[1] as Rational, trial: (rng) => { const m = sampleFrom(LN, rng); let s = 0; for (let i = 0; i < m; i++) s += sampleFrom(LX, rng); return s === 1; } },
];
const HEN = { lambda: 6, p: q(1, 2) };
const henMean = mul(q(HEN.lambda), HEN.p);
const henVar = add(mul(q(HEN.lambda), mul(HEN.p, sub(ONE, HEN.p))), mul(q(HEN.lambda), mul(HEN.p, HEN.p)));
const mGN = math`G_{N}`;

export const randomSums: TopicContent = {
  topicId: 'gf.random-sums',
  goal: t`For ${math`S_{N} = X_{${1}} + \cdots + X_{N}`} with ${mN} independent of the ${math`X_{i}`}, show that ${math`G_{S_{N}} = G_{N} \circ G_{X}`} and find ${math`E(S_{N})`} and ${math`\operatorname{Var}(S_{N})`}.`,
  objective: t`Find the pgf, mean and variance of a sum of a random number of random terms.`,
  why: t`Random sums model claims, offspring and arrivals; they are the engine of branching processes, next.`,
  minutes: 35,
  lesson: [
    { kind: 'section', title: t`Two layers of chance` },
    { kind: 'hook', text: t`A hen lays a random number of eggs, on average ${HEN.lambda}, and each egg hatches with probability ${HEN.p}, independently. How many chicks? The total is random twice over: you do not know how many eggs there are, and you do not know which of them hatch. Yet the answer turns out to be strikingly simple.` },
    { kind: 'narrative', text: t`The trick is to take the two layers one at a time. If you knew there were exactly ${math`n`} eggs, the chicks would be a sum of ${math`n`} independent zero-or-one terms, and you know how to handle a sum of a fixed number of independent terms: multiply their pgfs. Then average over the number of eggs.` },
    {
      kind: 'definition',
      name: t`Random sum`,
      formal: t`Let ${math`X_{${1}}, X_{${2}}, \ldots`} be independent and identically distributed non-negative integer random variables, and ${mN} a non-negative integer random variable independent of them. The [[random-sum|random sum]] is ${dmath`S_{N} = X_{${1}} + \cdots + X_{N},`} with ${math`S_{N} = ${0}`} when ${math`N = ${0}`}.`,
      plain: t`In plain words: a total of a random number of random terms. For the hen, ${mN} is the number of eggs and ${math`X_{i}`} is ${1} if egg ${math`i`} hatches, ${0} if not.`,
    },
    { kind: 'narrative', text: t`Recall the probability generating function: ${math`G_{X}(t) = E(t^{X}) = \sum_{k} P(X = k)t^{k}`}, defined at least for ${math`\lvert t \rvert \le ${1}`}. For independent ${math`X`} and ${math`Y`}, ${math`G_{X + Y} = G_{X}G_{Y}`}.` },
    { kind: 'section', title: t`The random sum formula` },
    { kind: 'theorem', name: t`Random sum formula`, statement: t`With ${mS} as above, ${math`G_{S_{N}}(t) = G_{N}(G_{X}(t))`} for ${math`\lvert t \rvert \le ${1}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Split by the value of N`, text: t`The events ${math`\{N = n\}`}, ${math`n = ${0}, ${1}, \ldots`}, partition the sample space, so`, eq: [dmath`G_{S_{N}}(t) = E(t^{S_{N}}) = \sum_{n = ${0}}^{\infty} P(N = n)\, E(t^{S_{N}} \mid N = n).`], why: { q: t`Why may we split the expectation like this?`, a: t`It is the law of total expectation: average within each case ${math`N = n`}, then weight each case by its probability.` } },
        { label: t`Fix the number of terms`, text: t`On ${math`\{N = n\}`}, ${math`S_{N} = X_{${1}} + \cdots + X_{n}`}, and since ${mN} is independent of the ${math`X_{i}`}, conditioning on ${math`N = n`} does not change their distribution:`, eq: [dmath`E(t^{S_{N}} \mid N = n) = E(t^{X_{${1}} + \cdots + X_{n}}) = G_{X}(t)^{n}.`], plain: t`The last step is the product rule for pgfs of independent terms: ${math`n`} equal factors ${math`G_{X}(t)`}. For ${math`n = ${0}`} both sides are ${1}.` },
        { label: t`Recognise a pgf`, text: t`Substitute back:`, eq: [dmath`G_{S_{N}}(t) = \sum_{n = ${0}}^{\infty} P(N = n)\, G_{X}(t)^{n} = G_{N}(G_{X}(t)).`], plain: t`The sum is ${mGN} evaluated at ${math`s = G_{X}(t)`}, which lies in ${math`[-${1}, ${1}]`} because ${math`\lvert G_{X}(t) \rvert \le ${1}`}.` },
      ],
    },
    { kind: 'p', text: t`The order matters. If ${math`N = ${2}`} always, then ${math`G_{N}(s) = s^{${2}}`} and the formula gives ${math`G_{X}(t)^{${2}}`}, the pgf of ${math`X_{${1}} + X_{${2}}`}, as it should. The other order, ${math`G_{X}(G_{N}(t))`}, would describe something else entirely.` },
    checkFrom(pmf, { n: LN, x: LX, k: 1 }, t`${math`G_{N}(G_{X}(t)) = \frac{${1}}{${3}}\left(${1} + \frac{${1} + t}{${2}} + \left(\frac{${1} + t}{${2}}\right)^{${2}}\right)`}; its coefficient of ${mt} is ${math`\frac{${1}}{${3}}\left(\frac{${1}}{${2}} + \frac{${2}}{${4}}\right) = ${polyCompose(LN, LX)[1] as Rational}`}.`),
    { kind: 'section', title: t`Mean and variance` },
    { kind: 'theorem', statement: t`If ${mN} and ${math`X`} have finite means and variances, then ${math`E(S_{N}) = E(N)E(X)`} and ${dmath`\operatorname{Var}(S_{N}) = E(N)\operatorname{Var}(X) + \operatorname{Var}(N)E(X)^{${2}}.`}` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Differentiate once`, text: t`By the chain rule, ${math`G_{S}'(t) = G_{N}'(G_{X}(t))\,G_{X}'(t)`}. At ${math`t = ${1}`}, ${math`G_{X}(${1}) = ${1}`}, so`, eq: [dmath`E(S_{N}) = G_{S}'(${1}) = G_{N}'(${1})G_{X}'(${1}) = E(N)E(X).`], why: { q: t`What if ${math`t = ${1}`} is the edge of where the series converges?`, a: t`Then the derivatives at ${1} are taken from the left, as in the pgf lesson; with finite means and variances they exist and equal the moments.` } },
        { label: t`Differentiate again`, text: t`By the product and chain rules,`, eq: [dmath`G_{S}''(t) = G_{N}''(G_{X}(t))\,G_{X}'(t)^{${2}} + G_{N}'(G_{X}(t))\,G_{X}''(t).`] },
        { label: t`Evaluate at one`, text: t`Write ${math`\mu = E(X)`}. Using ${math`G''(${1}) = E(Y(Y - ${1}))`} for each pgf,`, eq: [dmath`G_{S}''(${1}) = E(N(N - ${1}))\mu^{${2}} + E(N)E(X(X - ${1})).`] },
        { label: t`Form the variance`, text: t`${math`\operatorname{Var}(S) = G_{S}''(${1}) + G_{S}'(${1}) - G_{S}'(${1})^{${2}}`}. Expand ${math`E(N(N - ${1})) = E(N^{${2}}) - E(N)`} and ${math`E(X(X - ${1})) = E(X^{${2}}) - \mu`}:`, eq: [dmath`\operatorname{Var}(S) = E(N^{${2}})\mu^{${2}} - E(N)\mu^{${2}} + E(N)E(X^{${2}}) - E(N)\mu + E(N)\mu - E(N)^{${2}}\mu^{${2}}.`] },
        { label: t`Collect terms`, text: t`The ${math`E(N)\mu`} terms cancel. Group the rest:`, eq: [dmath`\operatorname{Var}(S) = \mu^{${2}}\big(E(N^{${2}}) - E(N)^{${2}}\big) + E(N)\big(E(X^{${2}}) - \mu^{${2}}\big) = \operatorname{Var}(N)\mu^{${2}} + E(N)\operatorname{Var}(X).`] },
      ],
    },
    { kind: 'p', text: t`Read the variance as two sources of spread: the terms themselves vary (${math`E(N)\operatorname{Var}(X)`}), and how many terms there are varies (${math`\operatorname{Var}(N)E(X)^{${2}}`}). IA Probability Sheet ${3}, question ${8}, asks you to prove the same by conditioning on ${mN} instead of differentiating.` },
    checkFrom(meanVar, { nk: 1, a: 4, nr: q(1, 2), xk: 0, b: 2, xr: q(1, 2), ask: 'mean' }, t`${math`E(N) = ${4} \times ${q(1, 2)} = ${2}`} and a fair die has mean ${q(7, 2)}, so ${math`E(S_{N}) = ${2} \times ${q(7, 2)} = ${7}`}.`),
    { kind: 'pitfall', claim: t`${math`\operatorname{Var}(S_{N}) = E(N)\operatorname{Var}(X)`}: the variance of one term times the average number of terms.`, counterexample: t`Take every ${math`X_{i} = ${1}`}. Then ${math`S_{N} = N`}, so ${math`\operatorname{Var}(S_{N}) = \operatorname{Var}(N)`}, but ${math`E(N)\operatorname{Var}(X) = ${0}`}. The spread of ${mN} must be added.` },
    { kind: 'section', title: t`The hen, and thinning` },
    { kind: 'narrative', text: t`Back to the hen. Suppose the number of eggs is ${math`N \sim \text{Po}(${HEN.lambda})`}, so ${math`G_{N}(s) = e^{${HEN.lambda}(s - ${1})}`}, and each egg hatches with probability ${HEN.p}, so ${math`G_{X}(t) = ${sub(ONE, HEN.p)} + ${HEN.p}t`}.` },
    {
      kind: 'steps',
      steps: [
        { label: t`Compose`, text: t`${math`G_{S}(t) = G_{N}(G_{X}(t)) = e^{${HEN.lambda}(${sub(ONE, HEN.p)} + ${HEN.p}t - ${1})}`}.` },
        { label: t`Simplify`, text: t`${math`${sub(ONE, HEN.p)} + ${HEN.p}t - ${1} = ${HEN.p}(t - ${1})`}, so ${math`G_{S}(t) = e^{${henMean}(t - ${1})}`}.` },
        { label: t`Recognise it`, text: t`That is the pgf of ${math`\text{Po}(${henMean})`}, and a pgf determines the distribution. So the number of chicks is Poisson with mean ${henMean}.`, plain: t`Check with the theorem: ${math`E(N)\operatorname{Var}(X) + \operatorname{Var}(N)E(X)^{${2}} = ${HEN.lambda} \times ${mul(HEN.p, sub(ONE, HEN.p))} + ${HEN.lambda} \times ${mul(HEN.p, HEN.p)} = ${henVar}`}, the variance of ${math`\text{Po}(${henMean})`}.` },
      ],
    },
    { kind: 'p', text: t`In general a Poisson count of mean ${math`\lambda`}, each kept with probability ${math`p`}, is Poisson with mean ${math`\lambda p`}. This is thinning. Sheet ${3}, question ${10}, uses the formula twice, in the two orders: animals that must mature before they breed, and parents whose offspring must then mature. In each, the whole question is which random count comes first.` },
    { kind: 'pitfall', claim: t`The pgf of a random sum is ${math`G_{X}(G_{N}(t))`}, or ${math`G_{N}(t)G_{X}(t)`}.`, counterexample: t`With ${math`N = ${2}`} always, the sum is ${math`X_{${1}} + X_{${2}}`}, whose pgf is ${math`G_{X}(t)^{${2}} = G_{N}(G_{X}(t))`}. ${math`G_{X}(G_{N}(t)) = G_{X}(t^{${2}})`} is the pgf of ${math`${2}X`}, and ${math`G_{N}(t)G_{X}(t)`} is that of ${math`N + X`}.` },
    { kind: 'takeaway', text: t`Condition on the number of terms: ${math`G_{S_{N}} = G_{N} \circ G_{X}`}, so the mean is ${math`E(N)E(X)`} and the variance adds the spread of the terms to the spread of their number.` },
  ],
  examples: [
    workedCambridge(q8b),
    worked(pmf, { n: [q(1, 4), q(1, 2), q(1, 4)], x: [q(2, 3), q(1, 3)], k: 1 }, t`A probability from ${math`G_{N}(G_{X}(t))`}`),
    worked(compose, { kind: 'poi-ber', a: 4, r: q(1, 2), m: 2, p: q(1, 4) }, t`Thinning a Poisson count`),
  ],
  generators: [meanVar, pmf, compose],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['random-sum'],
  claims,
  cambridge: withUses([q10a, q10b, q8a, q10c], {
    'ia-s3-q8-a': { sections: ['Mean and variance'], note: t`The mean and variance of a random sum` },
    'ia-s3-q10-c': { sections: ['The random sum formula', 'Mean and variance'], note: t`Means and variances of two compositions of generating functions` },
    'ia-s3-q10-a': { sections: ['The hen, and thinning'], note: t`The generating function of a thinned count` },
    'ia-s3-q10-b': { sections: ['The random sum formula'], note: t`The generating function of a random sum of offspring` },
  }),
  // Q10's comparison of the two compositions gates; its prompt states both generating functions, since the
  // auto-checked parts (a) and (b) work them for a concrete F and so are practice. The mean and variance
  // proof stays practice: the worked example ia-s3-q8-b works its part (b).
  gate: ['ia-s3-q10-c'],
  recall: [
    { front: t`State the random sum formula.`, back: t`${math`G_{S_{N}}(t) = G_{N}(G_{X}(t))`}, for ${mN} independent of the i.i.d. ${math`X_{i}`}.` },
    { front: t`Mean of a random sum?`, back: t`${math`E(S_{N}) = E(N)E(X)`}.` },
    { front: t`Variance of a random sum?`, back: t`${math`E(N)\operatorname{Var}(X) + \operatorname{Var}(N)E(X)^{${2}}`}.` },
    { front: t`A Poisson count of mean ${math`\lambda`}, each kept with probability ${math`p`}: what is the total?`, back: t`${math`\text{Po}(\lambda p)`}, since ${math`e^{\lambda(${1} - p + pt - ${1})} = e^{\lambda p(t - ${1})}`}.` },
  ],
  proofOrder: [
    {
      title: t`The random sum formula`,
      steps: [
        t`Split ${math`E(t^{S_{N}})`} over the values of ${mN}.`,
        t`Given ${math`N = n`}, ${math`S_{N}`} is a sum of ${math`n`} independent terms.`,
        t`So ${math`E(t^{S_{N}} \mid N = n) = G_{X}(t)^{n}`}.`,
        t`Then ${math`\sum_{n} P(N = n)G_{X}(t)^{n} = G_{N}(G_{X}(t))`}.`,
      ],
    },
  ],
};
