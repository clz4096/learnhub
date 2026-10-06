/**
 * rv.expectation-general: E(X) = Σ_ω X(ω) p_ω = Σ_x x P(X = x), defined when the sum
 * converges absolutely, and E(g(X)) = Σ g(x) P(X = x) without first finding the
 * distribution of g(X). From the Faculty schedule ("Expectation. Functions of a random
 * variable"), IA Probability Example Sheet 3 Q6 (V(x) = E((X - x)^2) = σ^2 + (x - μ)^2, so
 * E(V(X)) = 2σ^2), Sheet 2 Q8 (E(S^2) = (n - 1)σ^2) and Q10 (Liam's spaghetti). The sheets
 * have no official solutions; the answers are checked by exact sums over every outcome
 * and, for the spaghetti, by following every sequence of joins.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { add, div, int, mul, pick, q, str, sub, type Rational } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { distinctFrom, expect, population, variance, type Dist } from '../partv-c';
import { computedTex, listOf, math, t, texOfRational, type Rich } from '../rich';
import { worked, workedCambridge, type TopicContent } from '../topic';

const S2 = 'ia-prob-sheet-2' as const;
const S3 = 'ia-prob-sheet-3' as const;

const DISTS: readonly Dist[] = [
  { xs: [-2, -1, 0, 1, 2], ps: [q(1, 10), q(1, 5), q(1, 5), q(3, 10), q(1, 5)] },
  { xs: [-1, 0, 2], ps: [q(1, 4), q(1, 4), q(1, 2)] },
  { xs: [0, 1, 2, 3], ps: [q(1, 8), q(3, 8), q(3, 8), q(1, 8)] },
  { xs: [-3, 1, 2], ps: [q(1, 6), q(1, 2), q(1, 3)] },
  { xs: [1, 2, 4], ps: [q(1, 2), q(1, 4), q(1, 4)] },
  { xs: [-2, 0, 1, 3], ps: [q(1, 5), q(2, 5), q(1, 10), q(3, 10)] },
  { xs: [-1, 1, 3], ps: [q(1, 3), q(1, 3), q(1, 3)] },
  { xs: [0, 2, 5], ps: [q(1, 2), q(3, 10), q(1, 5)] },
];
const distText = (d: Dist): Rich => t`${math`X`} takes the values ${listOf(d.xs)} with probabilities ${computedTex(d.ps.map(texOfRational).join(', '))}, in that order.`;
const popMean = (xs: readonly Rational[]): Rational => mul(xs.reduce((a, b) => add(a, b), q(0)), q(1, xs.length));

// ---------------------------------------------------------------- E(g(X))

type G = 'square' | 'cube' | 'abs' | 'pow2';
interface FunP { d: Dist; g: G }
const gOf = (g: G) => (x: number): Rational => (g === 'square' ? q(x * x) : g === 'cube' ? q(x * x * x) : g === 'abs' ? q(Math.abs(x)) : x >= 0 ? q(2 ** x) : q(1, 2 ** -x));
const gTex = (g: G, v: string): string => (g === 'square' ? `${v}^{${2}}` : g === 'cube' ? `${v}^{${3}}` : g === 'abs' ? `|${v}|` : `${2}^{${v}}`);
const funVal = ({ d, g }: FunP): Rational => expect(d, gOf(g));
function funMis({ d, g }: FunP): [Rational, Rich][] {
  const m = expect(d);
  const gm = g === 'square' ? mul(m, m) : g === 'cube' ? mul(mul(m, m), m) : g === 'abs' ? (m.num < 0n ? q(-m.num, m.den) : m) : null;
  const out: [Rational, Rich][] = [
    [popMean(d.xs.map(gOf(g))), t`That averages the values of ${computedTex(gTex(g, 'x'))} as if they were equally likely. Weight each by ${math`\mathbb{P}(X = x)`}.`],
    [m, t`That is ${math`\mathbb{E}(X)`}. Apply the function to each value first: ${computedTex(`\\sum_{x} ${gTex(g, 'x')}\\,\\mathbb{P}(X = x)`)}.`],
  ];
  if (gm !== null) out.push([gm, t`That is ${computedTex(gTex(g, '\\mathbb{E}(X)'))}. In general ${computedTex(`\\mathbb{E}(${gTex(g, 'X')}) \\ne ${gTex(g, '\\mathbb{E}(X)')}`)}: apply the function before averaging.`]);
  return out;
}

const expectFunction = generator<FunP>({
  id: 'expect-function',
  skill: 'Compute E(g(X)) as the sum of g(x) P(X = x), without finding the distribution of g(X).',
  params: (rng) => {
    for (;;) {
      const p: FunP = { d: pick(rng, DISTS), g: pick(rng, ['square', 'cube', 'abs', 'pow2'] as const) };
      if (p.g === 'abs' && p.d.xs.every((x) => x >= 0)) continue;
      if (distinctFrom(str(funVal(p)), funMis(p).map(([x]) => str(x))) >= 2) return p;
    }
  },
  sane: ({ d }) => (d.xs.length === d.ps.length ? null : 'out of range'),
  problem: (p) => ({
    prompt: t`${distText(p.d)} Find ${computedTex(`\\mathbb{E}\\left(${gTex(p.g, 'X')}\\right)`)}.`,
    answer: { kind: 'exact', expected: str(funVal(p)) },
    solution: [
      t`${computedTex(`\\mathbb{E}\\left(${gTex(p.g, 'X')}\\right) = \\sum_{x} ${gTex(p.g, 'x')}\\,\\mathbb{P}(X = x)`)}: apply the function to each value and weight by its probability.`,
      t`${computedTex(p.d.xs.map((x, i) => `${texOfRational(gOf(p.g)(x))} \\cdot ${texOfRational(p.d.ps[i] as Rational)}`).join(' + '))} ${math`= ${funVal(p)}`}.`,
    ],
  }),
  solve: (p) => str(popMean(population(p.d).map(gOf(p.g)))),
  misconceptions: (p): Misconception[] => funMis(p).map(([x, why]) => ({ response: str(x), why })),
});

// ---------------------------------------------------------------- does the mean exist?

type Verdict = 'finite' | 'infinite' | 'undefined';
type Family = 'power' | 'alt-power' | 'zeta' | 'harmonic' | 'alt-harmonic';
interface ExistP { family: Family; a: number; b: number }
const zetaCache = new Map<number, number>();
/** ζ(s), from 1,000 terms and the integral tail; plenty for telling a growing sum from a converging one. */
function zetaApprox(s: number): number {
  let z = zetaCache.get(s);
  if (z === undefined) {
    z = 0;
    for (let n = 1; n <= 1000; n++) z += n ** -s;
    z += 1000 ** (1 - s) / (s - 1);
    zetaCache.set(s, z);
  }
  return z;
}
/** The kth atom's sign and its term |x| P(X = x), computed so that huge values and tiny masses do not overflow. */
function atom({ family, a, b: bb }: ExistP, k: number): { sign: number; term: number } {
  const alt = (-1) ** k;
  switch (family) {
    case 'power': return { sign: 1, term: (1 - 1 / bb) * bb * (a / bb) ** k };
    case 'alt-power': return { sign: alt, term: (1 - 1 / bb) * bb * (a / bb) ** k };
    case 'zeta': return { sign: 1, term: k * k ** -a / zetaApprox(a) };
    case 'harmonic': return { sign: 1, term: k / (k * (k + 1)) };
    case 'alt-harmonic': return { sign: alt, term: k / (k * (k + 1)) };
  }
}
const existVal = ({ family, a, b }: ExistP): Verdict => {
  if (family === 'harmonic') return 'infinite';
  if (family === 'alt-harmonic') return 'undefined';
  if (family === 'zeta') return a > 2 ? 'finite' : 'infinite';
  if (a < b) return 'finite';
  return family === 'power' ? 'infinite' : 'undefined';
};
const OPTIONS: ChoiceOption[] = [
  { id: 'finite', label: t`${math`\mathbb{E}(X)`} exists and is finite` },
  { id: 'infinite', label: t`${math`\mathbb{E}(X) = +\infty`}` },
  { id: 'undefined', label: t`${math`\mathbb{E}(X)`} is not defined: the positive and negative parts both diverge` },
];
function existText({ family, a, b }: ExistP): Rich {
  switch (family) {
    case 'power': return t`${math`\mathbb{P}(X = ${a}^{k}) = \left(${1} - \frac{${1}}{${b}}\right) ${b}^{-(k - ${1})}`} for ${math`k = ${1}, ${2}, \ldots`}`;
    case 'alt-power': return t`${math`\mathbb{P}\left(X = (-${1})^{k} ${a}^{k}\right) = \left(${1} - \frac{${1}}{${b}}\right) ${b}^{-(k - ${1})}`} for ${math`k = ${1}, ${2}, \ldots`}`;
    case 'zeta': return t`${math`\mathbb{P}(X = k) = c\,k^{-${a}}`} for ${math`k = ${1}, ${2}, \ldots`}, with ${math`c`} the normalising constant`;
    case 'harmonic': return t`${math`\mathbb{P}(X = k) = \frac{${1}}{k(k + ${1})}`} for ${math`k = ${1}, ${2}, \ldots`}`;
    case 'alt-harmonic': return t`${math`\mathbb{P}\left(X = (-${1})^{k} k\right) = \frac{${1}}{k(k + ${1})}`} for ${math`k = ${1}, ${2}, \ldots`}`;
  }
}
function existSolution(p: ExistP): Rich[] {
  const v = existVal(p);
  const terms: Rich = p.family === 'power' || p.family === 'alt-power'
    ? t`${math`|x_{k}|\,\mathbb{P}(X = x_{k}) = \left(${1} - \frac{${1}}{${b(p)}}\right) ${b(p)} \left(\frac{${p.a}}{${p.b}}\right)^{k}`}, a geometric series with ratio ${q(p.a, p.b)}`
    : p.family === 'zeta' ? t`${math`k \cdot c\,k^{-${p.a}} = c\,k^{-${p.a - 1}}`}, which converges exactly when ${math`${p.a - 1} > ${1}`}`
      : t`${math`k \cdot \frac{${1}}{k(k + ${1})} = \frac{${1}}{k + ${1}}`}, a harmonic series`;
  return [
    t`Check absolute convergence: the terms of ${math`\sum |x|\,\mathbb{P}(X = x)`} are ${terms}.`,
    v === 'finite' ? t`That converges, so ${math`\mathbb{E}(X)`} is defined and finite.`
      : v === 'infinite' ? t`That diverges, and ${math`X \ge ${0}`}, so the sum is ${math`+\infty`}: ${math`\mathbb{E}(X) = +\infty`}.`
        : t`That diverges, and both the positive values (even ${math`k`}) and the negative values (odd ${math`k`}) have infinite sums on their own. The sum ${math`\infty - \infty`} has no value: ${math`\mathbb{E}(X)`} is not defined.`,
  ];
}
const b = (p: ExistP): number => p.b;

const meanExists = generator<ExistP>({
  id: 'mean-exists',
  skill: 'Decide whether a random variable on a countable set has a finite mean, an infinite one, or none, by testing absolute convergence.',
  params: (rng) => {
    const family = pick(rng, ['power', 'alt-power', 'power', 'alt-power', 'zeta', 'harmonic', 'alt-harmonic'] as const);
    if (family === 'zeta') return { family, a: int(rng, 2, 5), b: 0 };
    if (family === 'harmonic' || family === 'alt-harmonic') return { family, a: 0, b: 0 };
    return { family, a: int(rng, 2, 5), b: int(rng, 2, 5) };
  },
  sane: ({ family, a, b: bb }) => (family === 'power' || family === 'alt-power' ? (a >= 2 && bb >= 2 ? null : 'out of range') : null),
  problem: (p) => ({
    prompt: t`A random variable ${math`X`} has ${existText(p)}. Which is true?`,
    answer: { kind: 'choice', options: OPTIONS, correct: existVal(p) },
    solution: existSolution(p),
  }),
  solve: (p) => {
    // Partial sums of the positive and negative parts, each term capped; a part that keeps growing between 200 and 2,000 terms diverges.
    const part = (n: number, sign: number): number => {
      let total = 0;
      for (let k = 1; k <= n; k++) {
        const { sign: sg, term } = atom(p, k);
        if (sg === sign) total += Math.min(term, 1e6);
      }
      return total;
    };
    const grows = (sign: number): boolean => part(2000, sign) - part(200, sign) > 0.3;
    const [pos, neg] = [grows(1), grows(-1)];
    return [pos && neg ? 'undefined' : pos || neg ? 'infinite' : 'finite'];
  },
  misconceptions: (p): Misconception[] => {
    const right = existVal(p);
    return OPTIONS.filter((o) => o.id !== right).map((o) => ({
      response: o.id,
      why: o.id === 'finite' ? t`The masses add to ${1}, but that does not make ${math`\sum |x|\,\mathbb{P}(X = x)`} converge: the large values can outweigh their small probabilities.`
        : o.id === 'infinite' ? (right === 'finite' ? t`Test ${math`\sum |x|\,\mathbb{P}(X = x)`}: its terms shrink fast enough to converge.` : t`${math`X`} takes negative values too. When the positive and negative parts are both infinite there is no value at all, not ${math`+\infty`}.`)
          : (right === 'finite' ? t`The sum converges absolutely, so the order of the terms does not matter and the mean exists.` : t`${math`X`} is never negative, so the sum can only be finite or ${math`+\infty`}; it cannot be undefined.`),
    }));
  },
});

// ---------------------------------------------------------------- mean squared distance from a point

interface VP { d: Dist; x0: number }
const vVal = ({ d, x0 }: VP): Rational => expect(d, (x) => q((x - x0) * (x - x0)));
function vMis({ d, x0 }: VP): [Rational, Rich][] {
  const m = expect(d);
  const dev = sub(q(x0), m);
  return [
    [variance(d), t`That is ${math`\sigma^{${2}}`}, the value at ${math`x = \mu`}. Away from the mean add ${math`(x - \mu)^{${2}}`}.`],
    [mul(dev, dev), t`That is only ${math`(x - \mu)^{${2}}`}. The spread of ${math`X`} about its own mean, ${math`\sigma^{${2}}`}, is there too.`],
    [sub(variance(d), mul(dev, dev)), t`The cross term vanishes and the square adds: ${math`V(x) = \sigma^{${2}} + (x - \mu)^{${2}}`}, never less than ${math`\sigma^{${2}}`}.`],
  ];
}

const meanSquaredDistance = generator<VP>({
  id: 'mean-squared-distance',
  skill: 'Compute V(x) = E((X - x)^2), the mean squared distance of X from a point, as in Sheet 3 Q6.',
  params: (rng) => {
    for (;;) {
      const p: VP = { d: pick(rng, DISTS), x0: int(rng, -3, 4) };
      if (distinctFrom(str(vVal(p)), vMis(p).map(([x]) => str(x))) >= 2) return p;
    }
  },
  sane: ({ d }) => (d.xs.length === d.ps.length ? null : 'out of range'),
  problem: (p) => {
    const m = expect(p.d);
    return {
      prompt: t`${distText(p.d)} Let ${math`V(x) = \mathbb{E}\left((X - x)^{${2}}\right)`}. Find ${math`V(${p.x0})`}.`,
      answer: { kind: 'exact', expected: str(vVal(p)) },
      solution: [
        t`Expand about the mean ${math`\mu = ${m}`}: ${math`(X - x)^{${2}} = (X - \mu)^{${2}} + ${2}(X - \mu)(\mu - x) + (\mu - x)^{${2}}`}, and the middle term has mean ${0}. So ${math`V(x) = \sigma^{${2}} + (x - \mu)^{${2}}`}.`,
        t`Here ${math`\sigma^{${2}} = ${variance(p.d)}`} and ${math`(${p.x0} - ${m})^{${2}} = ${mul(sub(q(p.x0), m), sub(q(p.x0), m))}`}, so ${math`V(${p.x0}) = ${vVal(p)}`}.`,
      ],
    };
  },
  solve: ({ d, x0 }) => str(popMean(population(d).map((x) => q((x - x0) * (x - x0))))),
  misconceptions: (p): Misconception[] => vMis(p).map(([x, why]) => ({ response: str(x), why })),
});

// ---------------------------------------------------------------- Cambridge problems

const V_DOM = { x: { kind: 'real' as const, min: -5, max: 5 }, mu: { kind: 'real' as const, min: -5, max: 5 }, sigma: { kind: 'real' as const, min: 0.1, max: 4 } };
const q6 = auto({
  id: 'ia-s3-q6',
  source: cite(S3, 'Q6'),
  title: t`Mean squared distance from a point`,
  prompt: t`For a random variable ${math`X`} with mean ${math`\mu`} and variance ${math`\sigma^{${2}} < \infty`}, define ${math`V(x) = \mathbb{E}\left((X - x)^{${2}}\right)`}. Express ${math`V(x)`} in terms of ${math`\mu`}, ${math`\sigma`}, and ${math`x`}, typing ${math`\mu`} as mu and ${math`\sigma`} as sigma; then find ${math`\mathbb{E}(V(X))`}.`,
  answer: { kind: 'expression', expected: 'sigma^2 + (x - mu)^2', variables: ['x', 'mu', 'sigma'], domains: V_DOM },
  solution: [
    t`Write ${math`X - x = (X - \mu) + (\mu - x)`} and expand: ${math`V(x) = \mathbb{E}\left((X - \mu)^{${2}}\right) + ${2}(\mu - x)\,\mathbb{E}(X - \mu) + (\mu - x)^{${2}}`}.`,
    t`${math`\mathbb{E}(X - \mu) = ${0}`}, so ${math`V(x) = \sigma^{${2}} + (x - \mu)^{${2}}`}. It is smallest at ${math`x = \mu`}.`,
    t`So the random variable ${math`V(X) = \sigma^{${2}} + (X - \mu)^{${2}}`}, and ${math`\mathbb{E}(V(X)) = \sigma^{${2}} + \sigma^{${2}} = ${2}\sigma^{${2}}`}.`,
  ],
  reference: '(x - mu)^2 + sigma^2',
  verify: () => {
    for (const d of DISTS) {
      const m = expect(d);
      const v = variance(d);
      for (let x0 = -3; x0 <= 3; x0++) {
        const e = same(`V(${x0})`, str(expect(d, (x) => q((x - x0) * (x - x0)))), str(add(v, mul(sub(q(x0), m), sub(q(x0), m)))));
        if (e !== null) return e;
      }
      // E(V(X)) over the population: each value's V, averaged.
      const evx = popMean(population(d).map((y) => expect(d, (x) => q((x - y) * (x - y)))));
      const e = same('E(V(X))', str(evx), str(mul(q(2), v)));
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [
    { response: 'sigma^2', why: t`That is ${math`V(\mu)`}. For other ${math`x`} the squared distance from the mean adds ${math`(x - \mu)^{${2}}`}.` },
    { response: 'sigma^2 + x^2 - mu^2', why: t`Expand ${math`(X - x)^{${2}}`} about ${math`\mu`}, not about ${0}: the extra term is ${math`(x - \mu)^{${2}}`}.` },
  ],
});

const N_DOM = { n: { kind: 'integer' as const, min: 2, max: 30 }, sigma: { kind: 'real' as const, min: 0.1, max: 4 } };
/** E(S^2) for n i.i.d. copies of a finite distribution, by summing over every outcome. */
function sampleSumSquares(d: Dist, n: number): Rational {
  let total = q(0);
  const idx = new Array<number>(n).fill(0);
  for (;;) {
    let w = q(1);
    const xs = idx.map((i) => { w = mul(w, d.ps[i] as Rational); return q(d.xs[i] as number); });
    const bar = popMean(xs);
    const s2 = xs.reduce((acc, x) => add(acc, mul(sub(x, bar), sub(x, bar))), q(0));
    total = add(total, mul(w, s2));
    let j = 0;
    while (j < n && idx[j] === d.xs.length - 1) { idx[j] = 0; j++; }
    if (j === n) return total;
    idx[j] = (idx[j] as number) + 1;
  }
}
const q8 = auto({
  id: 'ia-s2-q8',
  source: cite(S2, 'Q8'),
  title: t`The mean of the sum of squared deviations`,
  prompt: t`Let ${math`X_{${1}}, \ldots, X_{n}`} be independent identically distributed random variables with mean ${math`\mu`} and variance ${math`\sigma^{${2}}`}. Let ${math`\bar{X} = \frac{${1}}{n}\sum_{i} X_{i}`} and ${math`S^{${2}} = \sum_{i = ${1}}^{n} (X_{i} - \bar{X})^{${2}}`}. Find ${math`\mathbb{E}(S^{${2}})`} as an expression in ${math`n`} and ${math`\sigma`}, typing ${math`\sigma`} as sigma.`,
  answer: { kind: 'expression', expected: '(n - 1)*sigma^2', variables: ['n', 'sigma'], domains: N_DOM },
  solution: [
    t`By linearity ${math`\mathbb{E}(\bar{X}) = \mu`}. Expand: ${math`S^{${2}} = \sum_{i} X_{i}^{${2}} - n\bar{X}^{${2}}`}.`,
    t`${math`\mathbb{E}(X_{i}^{${2}}) = \sigma^{${2}} + \mu^{${2}}`}, and ${math`\mathbb{E}(\bar{X}^{${2}}) = \operatorname{var}(\bar{X}) + \mu^{${2}} = \frac{\sigma^{${2}}}{n} + \mu^{${2}}`}, using independence for the variance of the mean.`,
    t`So ${math`\mathbb{E}(S^{${2}}) = n(\sigma^{${2}} + \mu^{${2}}) - n\left(\frac{\sigma^{${2}}}{n} + \mu^{${2}}\right) = (n - ${1})\sigma^{${2}}`}.`,
  ],
  reference: '(n - 1)sigma^2',
  verify: () => {
    for (const d of [DISTS[1] as Dist, DISTS[4] as Dist, { xs: [0, 1], ps: [q(2, 3), q(1, 3)] }]) {
      for (const n of [2, 3, 4]) {
        const e = same(`E(S^2), n = ${n}`, str(sampleSumSquares(d, n)), str(mul(q(n - 1), variance(d))));
        if (e !== null) return e;
      }
    }
    return null;
  },
  misconceptions: [
    { response: 'n*sigma^2', why: t`The deviations are from ${math`\bar{X}`}, not from ${math`\mu`}, and ${math`\bar{X}`} is fitted to the data: it removes one ${math`\sigma^{${2}}`}.` },
    { response: 'sigma^2', why: t`That is the variance of one ${math`X_{i}`}. ${math`S^{${2}}`} adds ${math`n`} squared deviations.` },
    { response: '(n - 1)*sigma^2/n', why: t`That is the mean of ${math`S^{${2}}/n`}. The question sums the squares without dividing.` },
  ],
});

/** Expected number of hoops when 2n ends are joined in uniformly random pairs, one join at a time, followed exactly. */
function spaghettiExact(n: number): Rational {
  // partner[e] is the other end of e's strand; joined ends are removed.
  const go = (partner: Map<number, number>): Rational => {
    const ends = [...partner.keys()];
    if (ends.length === 0) return q(0);
    let total = q(0);
    let pairs = 0;
    for (let i = 0; i < ends.length; i++) for (let j = i + 1; j < ends.length; j++) {
      const [a, c] = [ends[i] as number, ends[j] as number];
      const next = new Map(partner);
      const hoop = partner.get(a) === c;
      const [pa, pc] = [partner.get(a) as number, partner.get(c) as number];
      next.delete(a);
      next.delete(c);
      if (!hoop) { next.set(pa, pc); next.set(pc, pa); }
      total = add(total, add(q(hoop ? 1 : 0), go(next)));
      pairs++;
    }
    return div(total, q(pairs));
  };
  const start = new Map<number, number>();
  for (let s = 0; s < n; s++) { start.set(2 * s, 2 * s + 1); start.set(2 * s + 1, 2 * s); }
  return go(start);
}
const STRANDS = 4;
const HOOPS = Array.from({ length: STRANDS }, (_, k) => q(1, 2 * (k + 1) - 1)).reduce((a, x) => add(a, x), q(0));
const q10 = auto({
  id: 'ia-s2-q10',
  source: cite(S2, 'Q10', true),
  title: t`Liam's spaghetti`,
  prompt: t`Liam's bowl of spaghetti contains ${STRANDS} strands. He selects two ends at random and joins them together, and repeats this until no ends are left. What is the expected number of spaghetti hoops in the bowl?`,
  answer: { kind: 'exact', expected: str(HOOPS) },
  solution: [
    t`Let ${math`I_{k}`} be the indicator that the join made when ${math`k`} strands remain closes a hoop. Then the number of hoops is ${math`\sum_{k} I_{k}`}, and by linearity its mean is ${math`\sum_{k} \mathbb{P}(I_{k} = ${1})`}.`,
    t`With ${math`k`} strands there are ${math`${2}k`} free ends. Whatever the first end chosen, the second is one of the other ${math`${2}k - ${1}`} ends, and exactly one of them is the other end of the same strand. So ${math`\mathbb{P}(I_{k} = ${1}) = \frac{${1}}{${2}k - ${1}}`}.`,
    t`${math`\sum_{k = ${1}}^{${STRANDS}} \frac{${1}}{${2}k - ${1}} = ${HOOPS}`}.`,
  ],
  reference: str(HOOPS),
  verify: () => same('every sequence of joins', str(spaghettiExact(STRANDS)), str(HOOPS)),
  misconceptions: [
    { response: '1', why: t`Hoops can close early, before the last join: every join with ${math`k`} strands left closes one with probability ${math`\frac{${1}}{${2}k - ${1}}`}.` },
    { response: str(Array.from({ length: STRANDS }, (_, k) => q(1, k + 1)).reduce((a, x) => add(a, x), q(0))), why: t`With ${math`k`} strands there are ${math`${2}k`} ends, so the chance the second end matches the first is ${math`\frac{${1}}{${2}k - ${1}}`}, not ${math`\frac{${1}}{k}`}.` },
  ],
});

const q10proof = supervision({
  id: 'ia-s2-q10-general',
  source: cite(S2, 'Q10'),
  title: t`Spaghetti hoops for ${math`n`} strands`,
  prompt: t`Show that with ${math`n`} strands the expected number of hoops is ${math`\sum_{k = ${1}}^{n} \frac{${1}}{${2}k - ${1}}`}. Why may you add the probabilities of the separate joins even though the joins are not independent? Roughly how does the answer grow with ${math`n`}?`,
  writeUp: 'proof',
});
const scheduleExpectation = supervision({
  id: 'schedule-expectation',
  source: cite('tripos-schedules', 'IA Probability, Discrete random variables: "Expectation. Functions of a random variable"', true),
  title: t`Grouping the sum by values`,
  prompt: t`On a countable ${math`\Omega`}, define ${math`\mathbb{E}(X) = \sum_{\omega} X(\omega) p_{\omega}`} when ${math`\sum_{\omega} |X(\omega)| p_{\omega} < \infty`}. Prove that then ${math`\mathbb{E}(g(X)) = \sum_{x} g(x)\,\mathbb{P}(X = x)`} whenever ${math`\sum_{x} |g(x)|\,\mathbb{P}(X = x) < \infty`}, and that ${math`\mathbb{E}(aX + bY) = a\mathbb{E}(X) + b\mathbb{E}(Y)`}. Where is absolute convergence used? Give a random variable for which ${math`\sum_{\omega} X(\omega)p_{\omega}`} can be made to add to different values by reordering.`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

export const expectationGeneral: TopicContent = {
  topicId: 'rv.expectation-general',
  goal: t`Define ${math`\mathbb{E}(X)`} on a countable space, decide when it exists, and compute ${math`\mathbb{E}(g(X)) = \sum_{x} g(x)\,\mathbb{P}(X = x)`}.`,
  lesson: [
    { kind: 'p', text: t`The mean of a random variable weights each value by its probability. On a countable ${math`\Omega`} the sum can be infinite, so the definition must say when it makes sense.` },
    { kind: 'rule', text: t`The [[expectation-general|expectation]] of ${math`X`} is ${math`\mathbb{E}(X) = \sum_{\omega \in \Omega} X(\omega)\,p_{\omega} = \sum_{x} x\,\mathbb{P}(X = x)`}, defined when ${math`\sum_{x} |x|\,\mathbb{P}(X = x) < \infty`}. For ${math`X \ge ${0}`} the sum always has a value, possibly ${math`+\infty`}.` },
    { kind: 'p', text: t`Absolute convergence is what lets the sum over outcomes be regrouped by values, and lets the order of the terms not matter. Without it things fail: ${math`\mathbb{P}(X = ${2}^{k}) = ${2}^{-k}`} for ${math`k \ge ${1}`} gives ${math`\sum_{k} ${2}^{k} \cdot ${2}^{-k} = ${1} + ${1} + \cdots = +\infty`}, and if the signs alternate, as in ${math`\mathbb{P}\left(X = (-${2})^{k}\right) = ${2}^{-k}`}, the positive and negative parts are both infinite and ${math`\mathbb{E}(X)`} is not defined at all.` },
    { kind: 'rule', text: t`[[expectation-of-function|The expectation of a function]]: ${math`\mathbb{E}(g(X)) = \sum_{x} g(x)\,\mathbb{P}(X = x)`}, when the sum converges absolutely. There is no need to find the distribution of ${math`g(X)`} first. In general ${math`\mathbb{E}(g(X)) \ne g(\mathbb{E}(X))`}.` },
    { kind: 'p', text: t`Linearity, ${math`\mathbb{E}(aX + bY) = a\mathbb{E}(X) + b\mathbb{E}(Y)`}, holds for any random variables with finite means, independent or not: it is linearity of the sum over ${math`\Omega`}. So the mean of ${math`\bar{X} = \frac{${1}}{n}\sum_{i} X_{i}`} is ${math`\mu`}, and in Sheet ${2} Q${8}, ${math`\mathbb{E}\left(\sum_{i} (X_{i} - \bar{X})^{${2}}\right) = (n - ${1})\sigma^{${2}}`}.` },
    { kind: 'p', text: t`Sheet ${3} Q${6}: the mean squared distance from a point ${math`x`}, ${math`V(x) = \mathbb{E}\left((X - x)^{${2}}\right)`}, equals ${math`\sigma^{${2}} + (x - \mu)^{${2}}`}. It is least at the mean, where it is the variance.` },
  ],
  examples: [
    workedCambridge(q6),
    worked(expectFunction, { d: DISTS[0] as Dist, g: 'square' }, t`The mean of a square is not the square of the mean`),
    worked(meanExists, { family: 'alt-power', a: 3, b: 2 }, t`A random variable with no mean`),
  ],
  generators: [expectFunction, meanExists, meanSquaredDistance],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['expectation-general', 'expectation-of-function'],
  cambridge: [q8, q10, q10proof, scheduleExpectation],
  gate: ['ia-s2-q8', 'ia-s2-q10', 'ia-s2-q10-general'],
};
