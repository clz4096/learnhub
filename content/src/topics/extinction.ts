/**
 * bp.extinction: in a branching process with offspring pgf G, generation n has pgf
 * G composed with itself n times, and the extinction probability is the smallest root of
 * t = G(t) in [0, 1], which is 1 exactly when the mean number of offspring is at most 1
 * (unless G(t) = t). From the Faculty schedule ("Branching processes: generating functions
 * and extinction probability") and IA Probability Example Sheet 3 Q9 (the blood culture)
 * and Q12 (F(t) = 1 - p(1 - t)^beta). The sheet has no official solutions; each answer is
 * checked by exact recursion, iteration of the pgf, or simulation.
 */
import { mulberry32, type Rng } from '@learnhub/mastery';
import { auto, cite, same, supervision } from '../cambridge';
import { add, int, mul, pick, q, str, sub, toFloat, type Rational } from '../math';
import { meanQ, polyCompose, polyEval, polyTex, varQ, type Poly } from '../partv-d';
import { generator, type Misconception } from '../problem';
import { computedTex, math, t, type Rich } from '../rich';
import { worked, workedCambridge, type ProbabilityClaim, type TopicContent } from '../topic';

const [mZ, mG] = [math`Z_{n}`, math`G`];
const SH3 = 'ia-prob-sheet-3' as const;
const SCHEDULE = cite('tripos-schedules', 'IA Probability, Discrete random variables: "Branching processes: generating functions and extinction probability"', true);
const ZERO = q(0);
const ONE = q(1);

const samplers = new Map<string, (rng: Rng) => number>();
/** A sampler for a distribution on {0, 1, 2, ...} with float cumulative sums, for fast simulation; one per distribution. */
function sampler(dist: readonly Rational[]): (rng: Rng) => number {
  const key = dist.map(str).join(' ');
  const known = samplers.get(key);
  if (known !== undefined) return known;
  const made = makeSampler(dist);
  samplers.set(key, made);
  return made;
}
function makeSampler(dist: readonly Rational[]): (rng: Rng) => number {
  const cum: number[] = [];
  let s = 0;
  for (const p of dist) { s += toFloat(p); cum.push(s); }
  return (rng) => { const u = rng(); for (let k = 0; k < cum.length; k++) if (u < (cum[k] as number)) return k; return cum.length - 1; };
}
/** One run of the process from one ancestor: true if it dies out within `gens` generations, stopping early once the population reaches `cap`. */
function diesOut(draw: (rng: Rng) => number, rng: Rng, gens: number, cap: number): boolean {
  let z = 1;
  for (let g = 0; g < gens; g++) {
    if (z === 0) return true;
    if (z >= cap) return false;
    let next = 0;
    for (let i = 0; i < z; i++) next += draw(rng);
    z = next;
  }
  return z === 0;
}
/** G_n(0) = P(Z_n = 0), by iterating G from 0 exactly. */
function zeroAt(dist: Poly, n: number): Rational {
  let x = ZERO;
  for (let i = 0; i < n; i++) x = polyEval(dist, x);
  return x;
}
const distOf = (w: readonly number[], d: number): Rational[] => w.map((x) => q(x, d));

// ---------------------------------------------------------------- the extinction probability

interface ExtP { w: number[]; d: number }
const extVal = ({ w, d }: ExtP): Rational => {
  // t = p0 + p1 t + p2 t^2 has roots 1 and p0/p2.
  const r = q(w[0] as number, w[2] as number);
  return r.num < r.den ? r : ONE;
};
const extMis = ({ w, d }: ExtP): Rational[] => {
  const r = q(w[0] as number, w[2] as number);
  return [r.num < r.den ? ONE : r, q(w[0] as number, d), zeroAt(distOf(w, d), 2)];
};
const meanOf = ({ w, d }: ExtP): Rational => q((w[1] as number) + 2 * (w[2] as number), d);

const extinction = generator<ExtP>({
  id: 'extinction',
  skill: 'Find the extinction probability as the smallest root of t = G(t) in [0, 1].',
  params: (rng) => {
    for (;;) {
      const d = pick(rng, [4, 5, 6, 8, 10, 12]);
      const p0 = int(rng, 1, d - 2);
      const p2 = int(rng, 1, d - p0 - 1 + 1);
      const p1 = d - p0 - p2;
      if (p1 < 0) continue;
      const p: ExtP = { w: [p0, p1, p2], d };
      const m = toFloat(meanOf(p));
      const ext = toFloat(extVal(p));
      if (Math.abs(m - 1) < 0.25 || ext > 0.8 && ext < 1) continue;
      const right = str(extVal(p));
      if (new Set(extMis(p).filter((x) => x.num <= x.den).map(str).filter((x) => x !== right)).size >= 2) return p;
    }
  },
  sane: ({ w, d }) => (w.reduce((a, b) => a + b, 0) === d && (w[0] as number) > 0 && (w[2] as number) > 0 ? null : 'not a distribution'),
  problem: (p) => {
    const dist = distOf(p.w, p.d);
    const m = meanOf(p);
    const r = q(p.w[0] as number, p.w[2] as number);
    return {
      prompt: t`In a branching process each individual has ${0}, ${1}, or ${2} offspring with probabilities ${dist[0] as Rational}, ${dist[1] as Rational}, and ${dist[2] as Rational}, independently of the others. Starting from one individual, what is the probability that the population eventually dies out?`,
      answer: { kind: 'exact', expected: str(extVal(p)) },
      solution: [
        t`The offspring pgf is ${math`G(t) = ${computedTex(polyTex(dist))}`}. The extinction probability is the smallest root of ${math`t = G(t)`} in ${math`[${0}, ${1}]`}.`,
        t`${math`G(t) - t = ${dist[2] as Rational}(t - ${1})\left(t - ${r}\right)`}: ${1} is always a root, and the other is ${math`\frac{p_{${0}}}{p_{${2}}} = ${r}`}.`,
        r.num < r.den
          ? t`The mean is ${math`G'(${1}) = ${m} > ${1}`}, and the smaller root ${r} is the answer: the population survives with probability ${sub(ONE, r)}.`
          : t`The mean is ${math`G'(${1}) = ${m} \le ${1}`}, the other root is not below ${1}, and extinction is certain: probability ${1}.`,
      ],
    };
  },
  solve: (p) => {
    // Iterate G from 0 in floating point and recognise the limit among fractions.
    const dist = distOf(p.w, p.d).map(toFloat);
    let x = 0;
    for (let i = 0; i < 20_000; i++) x = (dist[0] as number) + (dist[1] as number) * x + (dist[2] as number) * x * x;
    for (let den = 1; den <= 12; den++) for (let num = 0; num <= den; num++) if (Math.abs(num / den - x) < 1e-6) return str(q(num, den));
    return String(x);
  },
  misconceptions: (p): Misconception[] => {
    const [other, p0, two] = extMis(p) as [Rational, Rational, Rational];
    const out: Misconception[] = [];
    if (other.num <= other.den) out.push(other.num === other.den
      ? { response: '1', why: t`${1} is always a root of ${math`t = G(t)`}, but the extinction probability is the smallest root in ${math`[${0}, ${1}]`}. Here the mean is above ${1}, so it is less than ${1}.` }
      : { response: str(other), why: t`The mean number of offspring is at most ${1}, so extinction is certain: the smallest root in ${math`[${0}, ${1}]`} is ${1}.` });
    out.push({ response: str(p0), why: t`${math`G(${0}) = p_{${0}}`} is the chance of dying out in the first generation. Later generations can die out too: solve ${math`t = G(t)`}.` });
    out.push({ response: str(two), why: t`${math`G(G(${0}))`} is the chance of dying out within two generations. The extinction probability is the limit of ${math`G_{n}(${0})`}, a root of ${math`t = G(t)`}.` });
    return out;
  },
  trial: (p, rng) => diesOut(sampler(distOf(p.w, p.d)), rng, 2000, 100),
});

// ---------------------------------------------------------------- dying out within n generations

interface GenP { w: number[]; d: number; n: number }
const genVal = ({ w, d, n }: GenP): Rational => zeroAt(distOf(w, d), n);
const genMis = ({ w, d, n }: GenP): Rational[] => {
  let pw = ONE;
  for (let i = 0; i < n; i++) pw = mul(pw, q(w[0] as number, d));
  return [pw, q(w[0] as number, d), mul(q(n), q(w[0] as number, d))];
};

const generation = generator<GenP>({
  id: 'dead-by-generation',
  skill: 'Find P(Z_n = 0) = G(G(...G(0))) by iterating the offspring pgf.',
  params: (rng) => {
    for (;;) {
      const d = pick(rng, [3, 4, 5, 6]);
      const p0 = int(rng, 1, d - 1);
      const p2 = int(rng, 0, d - p0);
      const p: GenP = { w: [p0, d - p0 - p2, p2], d, n: int(rng, 2, 3) };
      const right = str(genVal(p));
      if (new Set(genMis(p).map(str).filter((x) => x !== right)).size >= 2) return p;
    }
  },
  sane: ({ w, d, n }) => (w.reduce((a, b) => a + b, 0) === d && n >= 2 ? null : 'out of range'),
  problem: (p) => {
    const dist = distOf(p.w, p.d);
    const steps: Rational[] = [];
    let x = ZERO;
    for (let i = 0; i < p.n; i++) { x = polyEval(dist, x); steps.push(x); }
    return {
      prompt: t`Each individual has ${0}, ${1}, or ${2} offspring with probabilities ${dist[0] as Rational}, ${dist[1] as Rational}, and ${dist[2] as Rational}, independently. Starting from one individual, what is the probability that generation ${p.n} is empty, ${math`P(Z_{${p.n}} = ${0})`}?`,
      answer: { kind: 'exact', expected: str(genVal(p)) },
      solution: [
        t`${math`Z_{n}`} has pgf ${math`G_{n} = G \circ G_{n - ${1}}`}, so ${math`P(Z_{n} = ${0}) = G_{n}(${0}) = G(G_{n - ${1}}(${0}))`}, with ${math`G(t) = ${computedTex(polyTex(dist))}`}.`,
        t`Iterating from ${0}: ${computedTex(steps.map((s) => texR(s)).join(',\\ '))}. So ${math`P(Z_{${p.n}} = ${0}) = ${genVal(p)}`}.`,
      ],
    };
  },
  solve: (p) => {
    // The whole distribution of Z_n by composing polynomials, and its constant term.
    const dist = distOf(p.w, p.d);
    let g: Rational[] = [ZERO, ONE];
    for (let i = 0; i < p.n; i++) g = polyCompose(g, dist);
    return str(g[0] as Rational);
  },
  misconceptions: (p): Misconception[] => {
    const [pow, one, times] = genMis(p) as [Rational, Rational, Rational];
    return [
      { response: str(pow), why: t`${math`p_{${0}}^{${p.n}}`} treats the generations as independent single individuals. Generation ${p.n} can be empty in many ways: iterate ${math`G`} from ${0}.` },
      { response: str(one), why: t`That is ${math`P(Z_{${1}} = ${0})`}. Generation ${p.n} may also be empty because a later generation fails.` },
      { response: str(times), why: t`The events "empty by generation ${math`k`}" are nested, not disjoint: do not add. Iterate ${math`G`}.` },
    ];
  },
  trial: (p, rng) => diesOut(sampler(distOf(p.w, p.d)), rng, p.n, Number.POSITIVE_INFINITY),
});
const texR = (r: Rational): string => (r.den === 1n ? r.num.toString() : `\\frac{${r.num}}{${r.den}}`);

// ---------------------------------------------------------------- mean and variance of a generation

interface MomP { w: number[]; d: number; n: number; ask: 'mean' | 'variance' }
const momVal = (p: MomP): Rational => {
  const dist = distOf(p.w, p.d);
  const m = meanQ(dist);
  const v = varQ(dist);
  let mn = ONE;
  for (let i = 0; i < p.n; i++) mn = mul(mn, m);
  if (p.ask === 'mean') return mn;
  // sigma^2 m^(n-1) (1 + m + ... + m^(n-1)).
  let geo = ZERO;
  let pw = ONE;
  for (let i = 0; i < p.n; i++) { geo = add(geo, pw); pw = mul(pw, m); }
  return mul(v, mul(powR(m, p.n - 1), geo));
};
function powR(r: Rational, e: number): Rational { let o = ONE; for (let i = 0; i < e; i++) o = mul(o, r); return o; }
function momMis(p: MomP): { v: Rational; why: Rich }[] {
  const dist = distOf(p.w, p.d);
  const m = meanQ(dist);
  const v = varQ(dist);
  if (p.ask === 'mean') return [
    { v: mul(q(p.n), m), why: t`The mean multiplies each generation: ${math`E(Z_{n}) = mE(Z_{n - ${1}})`}, so it is ${math`m^{n}`}, not ${math`nm`}.` },
    { v: powR(m, p.n - 1), why: t`From one ancestor, generation ${1} has mean ${math`m`}, so generation ${p.n} has mean ${math`m^{${p.n}}`}.` },
  ];
  return [
    { v: mul(q(p.n), v), why: t`The variance grows with the population: ${math`\operatorname{Var}(Z_{n}) = \sigma^{${2}}m^{n - ${1}}(${1} + m + \cdots + m^{n - ${1}})`}.` },
    { v: mul(v, powR(m, p.n)), why: t`Use the random sum formula one generation at a time: ${math`\operatorname{Var}(Z_{n}) = m^{${2}}\operatorname{Var}(Z_{n - ${1}}) + \sigma^{${2}}E(Z_{n - ${1}})`}.` },
    { v: powR(v, p.n), why: t`Variances do not multiply like means. Use ${math`\operatorname{Var}(Z_{n}) = m^{${2}}\operatorname{Var}(Z_{n - ${1}}) + \sigma^{${2}}m^{n - ${1}}`}.` },
  ];
}

const moments = generator<MomP>({
  id: 'generation-moments',
  skill: 'Find E(Z_n) = m^n and Var(Z_n) from the random sum formula, one generation at a time.',
  params: (rng) => {
    for (;;) {
      const d = pick(rng, [2, 3, 4, 6]);
      const p0 = int(rng, 0, d - 1);
      const p2 = int(rng, 1, d - p0);
      const p: MomP = { w: [p0, d - p0 - p2, p2], d, n: int(rng, 2, 4), ask: pick(rng, ['mean', 'variance'] as const) };
      const right = str(momVal(p));
      if (new Set(momMis(p).map((x) => str(x.v)).filter((x) => x !== right)).size >= 2) return p;
    }
  },
  sane: ({ w, d }) => (w.reduce((a, b) => a + b, 0) === d ? null : 'not a distribution'),
  problem: (p) => {
    const dist = distOf(p.w, p.d);
    const m = meanQ(dist);
    const v = varQ(dist);
    return {
      prompt: t`Each individual has ${0}, ${1}, or ${2} offspring with probabilities ${dist[0] as Rational}, ${dist[1] as Rational}, and ${dist[2] as Rational}, independently. From one individual, find ${p.ask === 'mean' ? math`E(Z_{${p.n}})` : math`\operatorname{Var}(Z_{${p.n}})`}, the ${p.ask} of the size of generation ${p.n}.`,
      answer: { kind: 'exact', expected: str(momVal(p)) },
      solution: [
        t`One individual's offspring have mean ${math`m = ${m}`} and variance ${math`\sigma^{${2}} = ${v}`}. Generation ${math`n`} is a random sum of ${math`Z_{n - ${1}}`} offspring counts.`,
        p.ask === 'mean'
          ? t`So ${math`E(Z_{n}) = mE(Z_{n - ${1}})`} and ${math`E(Z_{${p.n}}) = m^{${p.n}} = ${momVal(p)}`}.`
          : t`So ${math`\operatorname{Var}(Z_{n}) = \sigma^{${2}}E(Z_{n - ${1}}) + m^{${2}}\operatorname{Var}(Z_{n - ${1}})`}, which gives ${math`\sigma^{${2}}m^{n - ${1}}(${1} + m + \cdots + m^{n - ${1}})`}. With ${math`n = ${p.n}`}: ${momVal(p)}.`,
      ],
    };
  },
  solve: (p) => {
    // The whole distribution of Z_n, by composing the pgf exactly.
    const dist = distOf(p.w, p.d);
    let g: Rational[] = [ZERO, ONE];
    for (let i = 0; i < p.n; i++) g = polyCompose(g, dist);
    return str(p.ask === 'mean' ? meanQ(g) : varQ(g));
  },
  misconceptions: (p): Misconception[] => momMis(p).map((x) => ({ response: str(x.v), why: x.why })),
});

// ---------------------------------------------------------------- Cambridge problems

const BLOOD: Poly = [q(1, 12), q(2, 3), q(1, 4)];
const q9b = auto({
  id: 'ia-s3-q9-b',
  source: cite(SH3, 'Q9(b)'),
  title: t`Does the blood culture die out?`,
  prompt: t`At time ${0}, a blood culture starts with one red cell. At the end of one minute, the red cell dies and is replaced by ${2} red cells with probability ${BLOOD[2] as Rational}, by ${1} red and ${1} white with probability ${BLOOD[1] as Rational}, or by ${2} white with probability ${BLOOD[0] as Rational}. Each red cell lives for one minute and reproduces in the same way; each white cell lives for one minute and dies without reproducing; cells behave independently. What is the probability that the entire culture dies out eventually?`,
  answer: { kind: 'exact', expected: '1/3' },
  solution: [
    t`White cells never reproduce, so the culture dies out exactly when the red cells do. The number of red cells is a branching process whose offspring pgf counts red children: ${math`G(t) = ${computedTex(polyTex(BLOOD))}`}.`,
    t`${math`t = G(t)`} becomes ${math`${12}t = ${1} + ${8}t + ${3}t^{${2}}`}, that is ${math`${3}t^{${2}} - ${4}t + ${1} = (${3}t - ${1})(t - ${1}) = ${0}`}.`,
    t`The mean is ${math`G'(${1}) = ${meanQ(BLOOD)} > ${1}`}, so the smallest root, ${q(1, 3)}, is the extinction probability.`,
  ],
  reference: '1/3',
  verify: () => {
    const e = same('G(1/3)', str(polyEval(BLOOD, q(1, 3))), '1/3');
    if (e !== null) return e;
    // G_n(0) increases to the root: the iterates rise, stay below 1/3, and come within 1e-12 of it.
    const g = BLOOD.map(toFloat) as [number, number, number];
    let x = 0;
    for (let i = 0; i < 400; i++) {
      const next = g[0] + g[1] * x + g[2] * x * x;
      if (next < x || next > 1 / 3 + 1e-15) return `G_${i + 1}(0) = ${next} breaks the pattern`;
      x = next;
    }
    if (1 / 3 - x > 1e-12) return 'iterates do not approach 1/3';
    // And a simulation of the culture.
    const rng = mulberry32(9);
    const draw = sampler(BLOOD);
    let dead = 0;
    const runs = 20_000;
    for (let i = 0; i < runs; i++) if (diesOut(draw, rng, 5000, 100)) dead++;
    return Math.abs(dead / runs - 1 / 3) < 4.5 * Math.sqrt((2 / 9) / runs) + 1 / runs ? null : `simulated ${dead / runs}`;
  },
  misconceptions: [
    { response: '1', why: t`${1} is always a root of ${math`t = G(t)`}. The mean number of red children is ${meanQ(BLOOD)}, above ${1}, so extinction is not certain: take the smaller root.` },
    { response: '1/12', why: t`That is the chance the first cell has two white children. The culture can also die out later.` },
  ],
});

const N_DOM = { n: { kind: 'integer' as const, min: 0, max: 5 } };
const q9a = auto({
  id: 'ia-s3-q9-a',
  source: cite(SH3, 'Q9(a)'),
  title: t`No white cells yet`,
  prompt: t`In the blood culture of Q${9} (one red cell at time ${0}; each red cell, after a minute, becomes ${2} red with probability ${q(1, 4)}, ${1} red and ${1} white with probability ${q(2, 3)}, or ${2} white with probability ${q(1, 12)}), what is the probability that no white cells have appeared by time ${math`n + \tfrac{${1}}{${2}}`} minutes? Give an expression in ${math`n`}.`,
  answer: { kind: 'expression', expected: '(1/4)^(2^n - 1)', variables: ['n'], domains: N_DOM },
  solution: [
    t`No white cell by time ${math`n + \tfrac{${1}}{${2}}`} means every division so far gave two red cells. Generation ${math`k`} then has ${math`${2}^{k}`} red cells, each dividing into two red cells with probability ${q(1, 4)}.`,
    t`The divisions at times ${math`${1}, \ldots, n`} involve ${math`${1} + ${2} + \cdots + ${2}^{n - ${1}} = ${2}^{n} - ${1}`} cells, so the probability is ${math`\left(\tfrac{${1}}{${4}}\right)^{${2}^{n} - ${1}}`}.`,
  ],
  reference: '4^(1 - 2^n)',
  verify: () => {
    // a_0 = 1, a_n = (1/4) a_(n-1)^2: the first cell splits into two red cells, each of which then has no white descendant for n - 1 more minutes.
    let a = ONE;
    for (let n = 1; n <= 5; n++) {
      a = mul(q(1, 4), mul(a, a));
      const e = same(`n = ${n}`, str(a), str(q(1n, 4n ** BigInt(2 ** n - 1))));
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [
    { response: '(1/4)^n', why: t`The number of red cells doubles each minute, and every one of them must divide into two red cells: ${math`${2}^{n} - ${1}`} divisions in all, not ${math`n`}.` },
    { response: '(1/4)^(2^n)', why: t`Count the divisions that have happened by time ${math`n + \tfrac{${1}}{${2}}`}: ${math`${1} + ${2} + \cdots + ${2}^{n - ${1}} = ${2}^{n} - ${1}`}.` },
  ],
});

const PB_DOM = { p: { kind: 'real' as const, min: 0.05, max: 0.95 }, beta: { kind: 'real' as const, min: 0.05, max: 0.95 } };
const q12 = auto({
  id: 'ia-s3-q12-extinction',
  source: cite(SH3, 'Q12'),
  title: t`Extinction for ${math`F(t) = ${1} - p(${1} - t)^{\beta}`}`,
  prompt: t`Let ${math`F(t) = ${1} - p(${1} - t)^{\beta}`}, where ${math`p \in (${0}, ${1})`} and ${math`\beta \in (${0}, ${1})`} are constants; it is the generating function of a distribution on ${math`\{${0}, ${1}, ${2}, \ldots\}`}. Find the extinction probability of the branching process whose offspring distribution has generating function ${math`F`}, in terms of ${math`p`} and ${math`\beta`}.`,
  answer: { kind: 'expression', expected: '1 - p^(1/(1 - beta))', variables: ['p', 'beta'], domains: PB_DOM },
  solution: [
    t`Solve ${math`t = F(t)`}: ${math`${1} - t = p(${1} - t)^{\beta}`}. Either ${math`t = ${1}`}, or ${math`(${1} - t)^{${1} - \beta} = p`}, that is ${math`t = ${1} - p^{${1}/(${1} - \beta)}`}.`,
    t`The second root lies in ${math`(${0}, ${1})`}, so it is the smallest root in ${math`[${0}, ${1}]`}: the extinction probability is ${math`${1} - p^{${1}/(${1} - \beta)}`}. Consistently, the mean is infinite: ${math`F'(t) = p\beta(${1} - t)^{\beta - ${1}} \to \infty`} as ${math`t \uparrow ${1}`}.`,
  ],
  reference: '1 - exp(ln(p)/(1 - beta))',
  verify: () => {
    for (const [p, b] of [[0.3, 0.5], [0.7, 0.2], [0.5, 0.8]] as const) {
      let x = 0;
      for (let i = 0; i < 200_000; i++) x = 1 - p * (1 - x) ** b;
      const want = 1 - p ** (1 / (1 - b));
      if (Math.abs(x - want) > 1e-6) return `iterating F from 0 at p = ${p}, beta = ${b} gives ${x}, not ${want}`;
    }
    return null;
  },
  misconceptions: [
    { response: '1 - p', why: t`${math`${1} - p = F(${0})`} is the chance of dying out in the first generation. Solve ${math`t = F(t)`}.` },
    { response: 'p^(1/(1 - beta))', why: t`That is ${math`${1} - t`} at the root: the survival probability. Extinction is ${math`${1} - p^{${1}/(${1} - \beta)}`}.` },
  ],
});

const q12proof = supervision({
  id: 'ia-s3-q12',
  source: cite(SH3, 'Q12'),
  title: t`The iterates of ${math`F`}`,
  prompt: t`Let ${math`F(t) = ${1} - p(${1} - t)^{\beta}`}, where ${math`p, \beta \in (${0}, ${1})`}. Show that ${math`F`} is the generating function of a probability distribution on ${math`\mathbb{Z}^{+}`} and that its iterates are ${math`F_{n}(t) = ${1} - p^{${1} + \beta + \cdots + \beta^{n - ${1}}}(${1} - t)^{\beta^{n}}`} for ${math`n = ${1}, ${2}, \ldots`}. Find the mean ${math`m`} of the distribution and the extinction probability of the branching process with offspring generating function ${math`F`}.`,
  writeUp: 'proof',
});

const theorem = supervision({
  id: 'schedule-extinction',
  source: SCHEDULE,
  title: t`The extinction theorem`,
  prompt: t`In a branching process from one individual with offspring pgf ${mG}, prove that ${mZ} has pgf ${math`G_{n} = G \circ G_{n - ${1}}`}, that the extinction probability ${math`q`} is the smallest non-negative root of ${math`t = G(t)`}, and that ${math`q = ${1}`} if and only if ${math`G'(${1}) \le ${1}`}, unless ${math`G(t) = t`}. Say where continuity of probability and the convexity of ${mG} are used.`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

const HALF: Poly = [q(1, 2), ZERO, q(1, 2)];
const claims: ProbabilityClaim[] = [
  { what: 'offspring 0 or 2 equally likely: generation 2 empty', exact: zeroAt(HALF, 2), trial: (rng) => diesOut(sampler(HALF), rng, 2, Number.POSITIVE_INFINITY) },
];
const EX: Poly = [q(1, 4), q(1, 4), q(1, 2)];

export const extinctionTopic: TopicContent = {
  topicId: 'bp.extinction',
  goal: t`Show that the generation sizes of a branching process have pgf ${math`G \circ \cdots \circ G`}, and find the extinction probability as the least root of ${math`t = G(t)`} in ${math`[${0}, ${1}]`}.`,
  lesson: [
    { kind: 'p', text: t`A [[branching-process|branching process]] starts from one individual, ${math`Z_{${0}} = ${1}`}. Each individual of each generation has a random number of offspring, independently, all with the same pgf ${mG}; ${mZ} is the size of generation ${math`n`}. Family names, cell cultures, and chain reactions all work this way.` },
    { kind: 'rule', text: t`${math`Z_{n + ${1}}`} is a random sum of ${mZ} offspring counts, so ${math`G_{n + ${1}}(t) = G_{n}(G(t))`} and ${math`G_{n} = G \circ G \circ \cdots \circ G`}, with ${math`n`} copies. In particular ${math`E(Z_{n}) = m^{n}`}, where ${math`m = G'(${1})`}.` },
    { kind: 'p', text: t`The events ${math`\{Z_{n} = ${0}\}`} increase with ${math`n`} (once empty, always empty), and their union is extinction. By continuity of probability, the [[extinction-probability|extinction probability]] is ${math`q = \lim_{n} P(Z_{n} = ${0}) = \lim_{n} G_{n}(${0})`}. Since ${math`G_{n + ${1}}(${0}) = G(G_{n}(${0}))`} and ${mG} is continuous, ${math`q = G(q)`}.` },
    { kind: 'rule', text: t`${math`q`} is the smallest root of ${math`t = G(t)`} in ${math`[${0}, ${1}]`}: for any root ${math`s \ge ${0}`}, ${math`G_{n}(${0}) \le s`} for every ${math`n`} by induction, since ${mG} is increasing. And ${math`q = ${1}`} exactly when ${math`m \le ${1}`} (unless ${math`G(t) = t`}), because ${mG} is convex with ${math`G(${1}) = ${1}`}.` },
    { kind: 'p', text: t`Example: offspring ${0}, ${1}, ${2} with probabilities ${EX[0] as Rational}, ${EX[1] as Rational}, ${EX[2] as Rational}. ${math`m = ${meanQ(EX)}`}, and ${math`t = G(t)`} is ${math`(${2}t - ${1})(t - ${1}) = ${0}`}: ${math`q = ${q(1, 2)}`}. The iterates ${math`G_{n}(${0})`} creep up to it: ${computedTex([1, 2, 3, 4].map((n) => texR(zeroAt(EX, n))).join(',\\ '))}.` },
  ],
  examples: [
    workedCambridge(q9b),
    worked(extinction, { w: [1, 1, 2], d: 4 }, t`A root below one`),
    worked(generation, { w: [1, 0, 1], d: 2, n: 2 }, t`Empty by generation two`),
  ],
  generators: [extinction, generation, moments],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['branching-process', 'extinction-probability'],
  claims,
  cambridge: [q9a, q12, q12proof, theorem],
};
