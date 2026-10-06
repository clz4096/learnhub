/**
 * rv.cdf-method: the density of Y = g(X) found through the distribution function: write
 * F_Y(y) = P(g(X) ≤ y) as an event about X, then differentiate. From the STEP 3 Statistics
 * topic notes (page 1: Y = X^2 from F_Y), STEP 2 Statistics Q4 (2012 S2 Q13: the distance to
 * the nearest supermarket, through P(Y > y)), STEP 3 Statistics Q4 (2005 S3 Q14: the time
 * T = s/V, a decreasing transformation), and IA Probability Example Sheet 4 Q3 (the area of
 * a circle whose radius is exponential). Answers are compared with the STEP 2 and STEP 3
 * solutions; Sheet 4 has none, and its answer is checked by numerical integration.
 */
import { mulberry32 } from '@learnhub/mastery';
import { auto, cite, supervision } from '../cambridge';
import { int, mul, pick, q, str, sub, toFloat, type Rational } from '../math';
import { integrateToInfinity, near, powQ, rootTex, simpson } from '../partv-b';
import { generator, type Misconception } from '../problem';
import { math, t, type Span } from '../rich';
import { worked, workedCambridge, type ProbabilityClaim, type TopicContent } from '../topic';

const [mX, mY] = [math`X`, math`Y`];
const S2 = 'step-s2-stats' as const;
const S3 = 'step-s3-stats' as const;
const SH4 = 'ia-prob-sheet-4' as const;
const minQ = (a: Rational, b: Rational): Rational => (toFloat(a) <= toFloat(b) ? a : b);

// ---------------------------------------------------------------- a power of X

interface PowP { j: number; n: number; r: Rational }
const RS: readonly Rational[] = [q(1, 2), q(1, 3), q(2, 3), q(1, 4), q(3, 4), q(2, 5), q(3, 5)];

const cdfOfPower = generator<PowP>({
  id: 'cdf-of-power',
  skill: 'Find P(X^n ≤ y) by turning it into P(X ≤ y^(1/n)) and using the distribution function of X.',
  params: (rng) => ({ j: int(rng, 0, 2), n: int(rng, 2, 3), r: pick(rng, RS) }),
  sane: ({ j, n }) => (j >= 0 && j <= 2 && n >= 2 && n <= 3 ? null : 'out of range'),
  problem: ({ j, n, r }) => {
    const y0 = powQ(r, n);
    const v = powQ(r, j + 1);
    const dens = j === 0 ? t`is uniform on ${math`[${0}, ${1}]`}` : t`has density ${j === 1 ? math`${j + 1}x` : math`${j + 1}x^{${j}}`} on ${math`[${0}, ${1}]`}`;
    return {
      prompt: t`${mX} ${dens}, and ${math`Y = X^{${n}}`}. Find ${math`P(Y \le ${y0})`}.`,
      answer: { kind: 'exact', expected: str(v) },
      solution: [
        t`${math`x^{${n}}`} is increasing on ${math`[${0}, ${1}]`}, so ${math`Y \le ${y0}`} exactly when ${math`X \le ${rootTex(n, math`${y0}`)} = ${r}`}.`,
        t`${mX} has distribution function ${math`F_{X}(x) = x^{${j + 1}}`} there, so ${math`P(Y \le ${y0}) = F_{X}(${r}) = ${v}`}.`,
      ],
    };
  },
  solve: ({ j, n, r }) => {
    // Integrate the density of X over {x : x^n ≤ y0} numerically, as a fraction over the denominator of r^(j+1).
    const y0 = toFloat(powQ(r, n));
    const den = Number(powQ(r, j + 1).den);
    const cells = 6000;
    let area = 0;
    for (let i = 0; i < cells; i++) { const x = (i + 0.5) / cells; if (x ** n <= y0) area += (j + 1) * x ** j; }
    return str(q(Math.round((area / cells) * den), den));
  },
  misconceptions: ({ j, n, r }): Misconception[] => {
    const y0 = powQ(r, n);
    return [
      { response: str(powQ(y0, j + 1)), why: t`That is ${math`F_{X}(${y0})`}, the chance that ${mX} is below ${y0}. The event is about ${math`X^{${n}}`}: take the ${n === 2 ? t`square` : t`cube`} root first.` },
      { response: str(y0), why: t`${mY} is not uniform: its distribution function is ${math`F_{X}(y^{${1}/${n}})`}, not ${math`y`}.` },
      { response: str(sub(q(1), powQ(r, j + 1))), why: t`That is ${math`P(Y > ${y0})`}. Small values of ${mY} come from small values of ${mX}.` },
      { response: str(r), why: t`${math`X \le ${r}`} is the right event, but its probability is ${math`F_{X}(${r})`}: use the density of ${mX}.` },
    ];
  },
  trial: ({ j, n, r }, rng) => (rng() ** (1 / (j + 1))) ** n <= toFloat(powQ(r, n)),
});

// ---------------------------------------------------------------- the square of a uniform variable

interface SqP { c: number; d: number; r: Rational }
const sqProb = ({ c, d, r }: SqP): Rational => mul(q(1, c + d), sumQ(minQ(r, q(c)), minQ(r, q(d))));
function sumQ(a: Rational, b: Rational): Rational {
  return q(a.num * b.den + b.num * a.den, a.den * b.den);
}
const SQ_R: readonly Rational[] = [q(1, 2), q(3, 2), q(5, 2), q(1, 3), q(4, 3), q(1), q(2), q(3)];

const squareOfUniform = generator<SqP>({
  id: 'square-of-uniform',
  skill: 'Find P(X^2 ≤ y) as P(-√y ≤ X ≤ √y): the square has two roots, and the interval may be cut off by the range of X.',
  params: (rng) => {
    for (;;) {
      const c = int(rng, 1, 4);
      const d = int(rng, 1, 4);
      const r = pick(rng, SQ_R);
      const p = { c, d, r };
      // Keep cases where at least two slips give a wrong answer, so feedback can name them.
      const right = str(sqProb(p));
      const wrong = new Set([str(mul(q(1, c + d), sumQ(minQ(r, q(d)), q(c)))), str(mul(q(1, c + d), minQ(r, q(d)))), str(sub(q(1), sqProb(p)))].filter((x) => x !== right));
      if (toFloat(r) < Math.max(c, d) && wrong.size >= 2) return p;
    }
  },
  sane: ({ c, d, r }) => (c >= 1 && d >= 1 && toFloat(r) > 0 && toFloat(r) < Math.max(c, d) ? null : 'out of range'),
  problem: (p) => {
    const y0 = mul(p.r, p.r);
    const v = sqProb(p);
    const lo = minQ(p.r, q(p.c));
    const hi = minQ(p.r, q(p.d));
    return {
      prompt: t`${mX} is uniform on ${math`[-${p.c}, ${p.d}]`}, and ${math`Y = X^{${2}}`}. Find ${math`P(Y \le ${y0})`}.`,
      answer: { kind: 'exact', expected: str(v) },
      solution: [
        t`${math`X^{${2}} \le ${y0}`} exactly when ${math`-${p.r} \le X \le ${p.r}`}: both roots count.`,
        t`Within the range of ${mX}, that is ${math`-${lo} \le X \le ${hi}`}, an interval of length ${math`${lo} + ${hi}`}. The density of ${mX} is ${q(1, p.c + p.d)}, so ${math`P(Y \le ${y0}) = \frac{${sumQ(lo, hi)}}{${p.c + p.d}} = ${v}`}.`,
      ],
    };
  },
  solve: (p) => {
    const y0 = toFloat(mul(p.r, p.r));
    const den = Number(p.r.den) * (p.c + p.d);
    const cells = 8000;
    let hits = 0;
    for (let i = 0; i < cells; i++) { const x = -p.c + ((i + 0.5) * (p.c + p.d)) / cells; if (x * x <= y0) hits++; }
    return str(q(Math.round((hits / cells) * den), den));
  },
  misconceptions: (p): Misconception[] => {
    const y0 = mul(p.r, p.r);
    const n = p.c + p.d;
    return [
      { response: str(mul(q(1, n), sumQ(minQ(p.r, q(p.d)), q(p.c)))), why: t`That is ${math`P(X \le ${p.r})`}. ${math`X^{${2}}`} is small only when ${mX} is near ${0} on either side: the event is ${math`-${p.r} \le X \le ${p.r}`}.` },
      { response: str(mul(q(2, n), p.r)), why: t`The interval ${math`[-${p.r}, ${p.r}]`} runs past the range of ${mX}. Cut it to ${math`[-${p.c}, ${p.d}]`} first.` },
      { response: str(mul(q(1, n), minQ(p.r, q(p.d)))), why: t`Count the negative values too: ${math`(-${p.r})^{${2}}`} is ${y0} as well.` },
      { response: str(mul(q(1, n), sumQ(minQ(y0, q(p.d)), minQ(y0, q(p.c))))), why: t`Take square roots: ${math`X^{${2}} \le ${y0}`} means ${math`|X| \le ${p.r}`}, not ${math`|X| \le ${y0}`}.` },
      { response: str(sub(q(1), sqProb(p))), why: t`That is ${math`P(Y > ${y0})`}: the values of ${mX} far from ${0}. ${math`Y \le ${y0}`} is the middle interval.` },
    ];
  },
  trial: (p, rng) => {
    const x = -p.c + (p.c + p.d) * rng();
    return x * x <= toFloat(mul(p.r, p.r));
  },
});

// ---------------------------------------------------------------- the density of a transformed exponential

type Kind = 'square' | 'root' | 'scale';
interface TrP { lam: Rational; kind: Kind; c: number; y: Rational }
const LAMS: readonly Rational[] = [q(1, 2), q(1), q(2), q(3)];
const YS: readonly Rational[] = [q(1, 4), q(1, 2), q(1), q(3, 2), q(2), q(4)];
/** h = g^(-1) and its derivative. */
const inv = (p: TrP): { h: (y: number) => number; dh: (y: number) => number } =>
  p.kind === 'square' ? { h: Math.sqrt, dh: (y) => 1 / (2 * Math.sqrt(y)) }
    : p.kind === 'root' ? { h: (y) => y * y, dh: (y) => 2 * y }
      : { h: (y) => y / p.c, dh: () => 1 / p.c };
const fExp = (lam: number, x: number): number => (x < 0 ? 0 : lam * Math.exp(-lam * x));
const trDensity = (p: TrP): number => {
  const { h, dh } = inv(p);
  const y = toFloat(p.y);
  return fExp(toFloat(p.lam), h(y)) * dh(y);
};
const sig4 = (x: number): number => Number(x.toPrecision(4));

const densityOfTransform = generator<TrP>({
  id: 'density-of-transform',
  skill: 'Differentiate F_Y(y) = F_X(h(y)) to get f_Y(y) = f_X(h(y)) h\'(y): the chain rule brings the factor h\'(y).',
  params: (rng) => ({ lam: pick(rng, LAMS), kind: pick(rng, ['square', 'root', 'scale'] as const), c: int(rng, 2, 3), y: pick(rng, YS) }),
  sane: (p) => (toFloat(p.lam) > 0 && toFloat(p.y) > 0 ? null : 'out of range'),
  problem: (p) => {
    const lam = p.lam;
    const yTex = p.kind === 'square' ? math`Y = X^{${2}}` : p.kind === 'root' ? math`Y = \sqrt{X}` : math`Y = ${p.c}X`;
    const hTex = p.kind === 'square' ? math`\sqrt{y}` : p.kind === 'root' ? math`y^{${2}}` : math`y / ${p.c}`;
    const dTex = p.kind === 'square' ? math`\frac{${1}}{${2}\sqrt{y}}` : p.kind === 'root' ? math`${2}y` : math`\frac{${1}}{${p.c}}`;
    const v = trDensity(p);
    // A rate of 1 is written e^{-x}, not 1 e^{-1x}.
    const one = lam.num === lam.den;
    const expOf = (arg: Span): Span => (one ? math`e^{-${arg}}` : math`${lam}\,e^{-${lam}\,${arg}}`);
    return {
      prompt: t`${mX} has the exponential density ${one ? math`e^{-x}` : math`${lam}\,e^{-${lam}x}`} for ${math`x \ge ${0}`}, and ${yTex}. Find the density of ${mY} at ${math`y = ${p.y}`}, to four significant figures.`,
      answer: { kind: 'numeric', expected: sig4(v), relTol: 0.001 },
      solution: [
        t`For ${math`y > ${0}`}, ${math`F_{Y}(y) = P(X \le ${hTex}) = ${1} - ${one ? math`e^{-${hTex}}` : math`e^{-${lam}\,${hTex}}`}`}, since the transformation is increasing.`,
        t`Differentiate by the chain rule: ${math`f_{Y}(y) = ${expOf(hTex)} \times ${dTex}`}. At ${math`y = ${p.y}`} that is about ${sig4(v)}.`,
      ],
    };
  },
  solve: (p) => {
    // Differentiate F_Y numerically: a central difference of P(X ≤ h(y)).
    const { h } = inv(p);
    const lam = toFloat(p.lam);
    const F = (y: number): number => 1 - Math.exp(-lam * h(y));
    const y = toFloat(p.y);
    const e = 1e-5;
    return String(sig4((F(y + e) - F(y - e)) / (2 * e)));
  },
  misconceptions: (p): Misconception[] => {
    const { h } = inv(p);
    const lam = toFloat(p.lam);
    const y = toFloat(p.y);
    return [
      { response: String(sig4(fExp(lam, h(y)))), why: t`${math`f_{X}(h(y))`} is only part of it. Differentiating ${math`F_{X}(h(y))`} brings the factor ${math`h'(y)`} by the chain rule.` },
      { response: String(sig4(fExp(lam, y))), why: t`That is the density of ${mX} at ${p.y}. ${mY} has its own density: go through ${math`F_{Y}(y) = P(Y \le y)`}.` },
      { response: String(sig4(1 - Math.exp(-lam * h(y)))), why: t`That is ${math`F_{Y}(y)`}, a probability. The density is its derivative.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

// IA Sheet 4 Q3: the area A = π R^2 with R ~ Exp(λ).
const areaDensity = (lam: number) => (a: number): number => (lam / (2 * Math.sqrt(Math.PI * a))) * Math.exp(-lam * Math.sqrt(a / Math.PI));
const q3 = auto({
  id: 'ia4-q3',
  source: cite(SH4, 'Q3'),
  title: t`The area of a circle with an exponential radius`,
  prompt: t`The radius ${math`R`} of a circle is exponentially distributed with parameter ${math`\lambda`}. Find the density of the area ${math`A = \pi R^{${2}}`} at ${math`a > ${0}`}. (Type ${math`\lambda`} as lambda.)`,
  answer: { kind: 'expression', expected: 'lambda/(2 sqrt(pi a)) e^(-lambda sqrt(a/pi))', variables: ['a', 'lambda'], domains: { a: { kind: 'real', min: 0.1, max: 10 }, lambda: { kind: 'real', min: 0.2, max: 3 } } },
  solution: [
    t`For ${math`a > ${0}`}: ${math`F_{A}(a) = P(\pi R^{${2}} \le a) = P\left(R \le \sqrt{a/\pi}\right) = ${1} - e^{-\lambda\sqrt{a/\pi}}`}, since ${math`R \ge ${0}`} and ${math`P(R \le r) = ${1} - e^{-\lambda r}`}.`,
    t`Differentiate, with ${math`\frac{d}{da}\sqrt{a/\pi} = \frac{${1}}{${2}\sqrt{\pi a}}`}: ${math`f_{A}(a) = \frac{\lambda}{${2}\sqrt{\pi a}}\,e^{-\lambda\sqrt{a/\pi}}`} for ${math`a > ${0}`}, and ${0} for ${math`a \le ${0}`}.`,
  ],
  reference: 'lambda/(2 sqrt(pi a)) e^(-lambda sqrt(a/pi))',
  verify: () => {
    // The density integrates to P(π R^2 ≤ a0) (substituting a = s^2 to remove the singularity at 0), and to 1 overall.
    for (const lam of [0.5, 2]) {
      const f = areaDensity(lam);
      for (const a0 of [1, 5]) {
        const r = near(`P(A ≤ ${a0}) for λ = ${lam}`, simpson((s) => f(s * s) * 2 * s, 1e-12, Math.sqrt(a0), 4000), 1 - Math.exp(-lam * Math.sqrt(a0 / Math.PI)), 1e-8);
        if (r !== null) return r;
      }
      const r = near(`total area for λ = ${lam}`, integrateToInfinity((s) => f(s * s) * 2 * s, 1e-12, 8000, 10 / lam), 1, 1e-6);
      if (r !== null) return r;
    }
    return null;
  },
  misconceptions: [
    { response: 'lambda e^(-lambda sqrt(a/pi))', why: t`Differentiating ${math`e^{-\lambda\sqrt{a/\pi}}`} brings the derivative of ${math`\sqrt{a/\pi}`}, ${math`\frac{${1}}{${2}\sqrt{\pi a}}`}, by the chain rule.` },
    { response: '1 - e^(-lambda sqrt(a/pi))', why: t`That is the distribution function ${math`F_{A}(a)`}. The density is its derivative.` },
    { response: 'lambda e^(-lambda a)', why: t`${math`A`} is not exponential: it is ${math`\pi R^{${2}}`}. Find ${math`P(A \le a)`} in terms of ${math`R`} first.` },
  ],
});

// STEP 2 Q4: no supermarket within y has probability e^(-k π y^2).
/** P(no point of a Poisson process of rate k within y of the centre of a square of side 2L), by simulation. */
function noneWithin(k: number, y: number, trials: number): number {
  const rng = mulberry32(2012);
  const L = 1;
  const mean = k * 4 * L * L;
  let none = 0;
  for (let i = 0; i < trials; i++) {
    // Knuth's Poisson sampler, then uniform points.
    let n = 0;
    let p = rng();
    while (p > Math.exp(-mean)) { n++; p *= rng(); }
    let hit = false;
    for (let j = 0; j < n; j++) {
      const [u, v] = [(2 * rng() - 1) * L, (2 * rng() - 1) * L];
      if (u * u + v * v < y * y) hit = true;
    }
    if (!hit) none++;
  }
  return none / trials;
}
const q4cdf = auto({
  id: 's2-q4-cdf',
  source: cite(S2, 'Q4'),
  title: t`The distribution function of the distance to a supermarket`,
  prompt: t`The number of supermarkets in any region is Poisson with mean ${math`k`} times the area of the region. ${mY} is the distance from a randomly chosen point to the nearest supermarket. Find ${math`P(Y < y)`} for ${math`y > ${0}`}.`,
  answer: { kind: 'expression', expected: '1 - e^(-k pi y^2)', variables: ['k', 'y'], domains: { k: { kind: 'real', min: 0.1, max: 3 }, y: { kind: 'real', min: 0.1, max: 2 } } },
  solution: [
    t`${math`Y \ge y`} means no supermarket within the circle of radius ${math`y`}, whose area is ${math`\pi y^{${2}}`}. The number there is Poisson with mean ${math`k\pi y^{${2}}`}, so ${math`P(Y \ge y) = e^{-k\pi y^{${2}}}`}.`,
    t`So ${math`P(Y < y) = ${1} - e^{-k\pi y^{${2}}}`}, and differentiating gives the density ${math`${2}\pi k y\,e^{-\pi k y^{${2}}}`}.`,
  ],
  reference: '1 - e^(-k pi y^2)',
  verify: () => {
    const sim = noneWithin(1, 0.5, 20000);
    const exact = Math.exp(-Math.PI * 0.25);
    const se = Math.sqrt((exact * (1 - exact)) / 20000);
    return near('P(no supermarket within 0.5) by simulating the process, k = 1', sim, exact, 4.5 * se)
      ?? near('the density integrates to the distribution function, k = 2, y = 0.7', simpson((u) => 2 * Math.PI * 2 * u * Math.exp(-Math.PI * 2 * u * u), 0, 0.7), 1 - Math.exp(-2 * Math.PI * 0.49), 1e-10);
  },
  misconceptions: [
    { response: 'e^(-k pi y^2)', why: t`${math`e^{-k\pi y^{${2}}}`} is the chance of no supermarket within ${math`y`}, that is ${math`P(Y \ge y)`}. Take its complement.` },
    { response: '1 - e^(-k y)', why: t`The region is a disc of area ${math`\pi y^{${2}}`}, so the Poisson mean is ${math`k\pi y^{${2}}`}, not ${math`ky`}.` },
  ],
  official: { source: cite('step-s2-stats-solutions', 'Q4'), answer: '1 - e^(-k pi y^2)', agrees: true },
});

// STEP 3 Q4: T = s/V.
const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1));
const Cof = (a: number): number => fact(2 * a + 1) / (fact(a) * fact(a));
const vDensity = (a: number, k: number) => (x: number): number => (Cof(a) * k ** (a + 1) * x ** a) / (x + k) ** (2 * a + 2);
const tDensity = (a: number, k: number, s: number) => (u: number): number => (Cof(a) * k ** (a + 1) * s ** (a + 1) * u ** a) / (s + k * u) ** (2 * a + 2);
const q4t = auto({
  id: 's3-q4-density-t',
  source: cite(S3, 'Q4'),
  title: t`The density of the travel time ${math`T = s / V`}`,
  prompt: t`The speed ${math`V`} has density ${math`\frac{C k^{a + ${1}} x^{a}}{(x + k)^{${2}a + ${2}}}`} for ${math`x \ge ${0}`}, where ${math`C = \frac{(${2}a + ${1})!}{a!\,a!}`}, ${math`a`} is a positive integer, and ${math`k > ${0}`}. The time to travel a fixed distance ${math`s`} is ${math`T = s/V`}. Find the density of ${math`T`} at ${math`t > ${0}`}, in terms of ${math`a`}, ${math`k`}, ${math`s`}, and ${math`t`}.`,
  answer: {
    kind: 'expression', expected: '(2a + 1)!/(a! a!) k^(a + 1) s^(a + 1) t^a/(s + k t)^(2a + 2)', variables: ['t', 's', 'k', 'a'],
    domains: { t: { kind: 'real', min: 0.2, max: 3 }, s: { kind: 'real', min: 0.5, max: 3 }, k: { kind: 'real', min: 0.5, max: 3 }, a: { kind: 'integer', min: 1, max: 4 } },
  },
  solution: [
    t`${math`T < t`} exactly when ${math`V > s/t`}: the transformation is decreasing, so the inequality turns over. ${math`P(T < t) = \int_{s/t}^{\infty} \frac{C k^{a + ${1}} x^{a}}{(x + k)^{${2}a + ${2}}}\,dx`}.`,
    t`Substitute ${math`u = s/x`}, so ${math`dx = -\frac{s}{u^{${2}}}\,du`} and the limits ${math`s/t`} and ${math`\infty`} become ${math`t`} and ${0}: ${math`P(T < t) = \int_{${0}}^{t} \frac{C k^{a + ${1}} s^{a + ${1}} u^{a}}{(s + ku)^{${2}a + ${2}}}\,du`}.`,
    t`The integrand is the density: ${math`f_{T}(t) = \frac{C k^{a + ${1}} s^{a + ${1}} t^{a}}{(s + kt)^{${2}a + ${2}}}`}, the density of ${math`V`} with ${math`k`} replaced by ${math`s/k`}.`,
  ],
  reference: '(2a + 1)!/(a! a!) k^(a + 1) s^(a + 1) t^a/(s + k t)^(2a + 2)',
  verify: () => {
    // P(T < t0) two ways: the tail of V beyond s/t0, and the integral of the density of T up to t0.
    for (const a of [1, 2]) for (const [k, s, t0] of [[1, 1, 0.8], [2, 3, 1.5]] as const) {
      const tail = integrateToInfinity(vDensity(a, k), s / t0, 20000, k);
      const r = near(`P(T < ${t0}), a = ${a}, k = ${k}, s = ${s}`, simpson(tDensity(a, k, s), 0, t0, 4000), tail, 1e-7);
      if (r !== null) return r;
    }
    return null;
  },
  misconceptions: [
    { response: '(2a + 1)!/(a! a!) k^(a + 1) (s/t)^a/(s/t + k)^(2a + 2)', why: t`That is ${math`f_{V}(s/t)`}. Differentiating ${math`P(V > s/t)`} brings the factor ${math`\left|\frac{d}{dt}\frac{s}{t}\right| = \frac{s}{t^{${2}}}`}.` },
  ],
  // The solutions print the density first as C k^(a+1) s^(a+1) u^a/(s + Ky)^(2a+2), a slip for (s + ku), then in the
  // form compared here, with u for the time.
  official: { source: cite('step-s3-stats-solutions', 'Q4'), answer: '(2a + 1)!/(a! a!) (s/k)^(a + 1) t^a/(s/k + t)^(2a + 2)', agrees: true },
});

const q4tProof = supervision({
  id: 's3-q4-tail',
  source: cite(S3, 'Q4'),
  title: t`The time through the tail of the speed`,
  prompt: t`With ${math`T = s/V`}, show that ${math`P(T < t) = \int_{s/t}^{\infty} \frac{C k^{a + ${1}} x^{a}}{(x + k)^{${2}a + ${2}}}\,dx`}, and explain why the limits run from ${math`s/t`} to ${math`\infty`} rather than from ${0} to ${math`s/t`}.`,
  writeUp: 'proof',
  official: cite('step-s3-stats-solutions', 'Q4'),
});
const squareRule = supervision({
  id: 's3-notes-square',
  source: cite('step-s3-stats-notes', 'page 1', true),
  title: t`The density of ${math`X^{${2}}`} in general`,
  prompt: t`${mX} has a continuous density ${math`f`}. Show that ${math`Y = X^{${2}}`} has density ${math`\frac{f(\sqrt{y}) + f(-\sqrt{y})}{${2}\sqrt{y}}`} for ${math`y > ${0}`}, and explain where each of the two terms comes from. What does the formula give when ${mX} is uniform on ${math`[-${1}, ${1}]`}?`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

const claims: ProbabilityClaim[] = [
  { what: 'P(X² ≤ 1) for X uniform on [-1, 2]', exact: q(2, 3), trial: (rng) => { const x = -1 + 3 * rng(); return x * x <= 1; } },
  { what: 'P(X² ≤ 1/4) for X uniform on [0, 1]', exact: q(1, 2), trial: (rng) => rng() ** 2 <= 0.25 },
];

export const cdfMethod: TopicContent = {
  topicId: 'rv.cdf-method',
  goal: t`Find the density of ${math`Y = g(X)`} by writing ${math`F_{Y}(y) = P(g(X) \le y)`} as an event about ${mX}, using ${math`F_{X}`}, and differentiating.`,
  lesson: [
    { kind: 'p', text: t`Knowing the density of ${mX}, what is the density of ${math`X^{${2}}`}, or of ${math`s/X`}? Densities do not transform by substitution alone, but probabilities do: ${math`P(Y \le y)`} is the probability of an event about ${mX}. This is the [[cdf-method|distribution function method]].` },
    { kind: 'rule', text: t`To find ${math`f_{Y}`} for ${math`Y = g(X)`}: write ${math`F_{Y}(y) = P(g(X) \le y)`}, solve the inequality for ${mX}, express the result with ${math`F_{X}`}, then ${math`f_{Y}(y) = F_{Y}'(y)`}.` },
    { kind: 'p', text: t`The STEP ${3} notes take ${math`Y = X^{${2}}`}: ${math`F_{Y}(y) = P(X^{${2}} \le y) = P(-\sqrt{y} \le X \le \sqrt{y}) = \int_{-\sqrt{y}}^{\sqrt{y}} f(t)\,dt`}. For ${mX} uniform on ${math`[${0}, ${1}]`} that is ${math`\sqrt{y}`}, so ${math`f_{Y}(y) = \frac{${1}}{${2}\sqrt{y}}`} on ${math`(${0}, ${1}]`}: a density may be unbounded. And ${math`P(X^{${2}} \le \tfrac{${1}}{${4}}) = P(X \le \tfrac{${1}}{${2}}) = ${q(1, 2)}`}. If ${mX} is uniform on ${math`[-${1}, ${2}]`}, both roots matter: ${math`P(X^{${2}} \le ${1}) = P(-${1} \le X \le ${1}) = ${q(2, 3)}`}.` },
    { kind: 'p', text: t`A decreasing ${math`g`} turns the inequality over. For the travel time ${math`T = s/V`} of STEP ${3} Q${4}, ${math`T < t`} exactly when ${math`V > s/t`}, so ${math`F_{T}(t) = ${1} - F_{V}(s/t)`} and ${math`f_{T}(t) = f_{V}(s/t)\,\frac{s}{t^{${2}}}`}.` },
    { kind: 'rule', text: t`For a strictly monotone ${math`g`} with inverse ${math`h`}: ${math`f_{Y}(y) = f_{X}(h(y))\,|h'(y)|`}. The factor ${math`|h'(y)|`} is the chain rule; forgetting it is the usual slip.` },
    { kind: 'p', text: t`Sometimes the complement is the natural event. In STEP ${2} Q${4}, the distance ${mY} to the nearest supermarket is at least ${math`y`} exactly when a disc of radius ${math`y`} holds none, so ${math`P(Y \ge y) = e^{-k\pi y^{${2}}}`}, ${math`F_{Y}(y) = ${1} - e^{-k\pi y^{${2}}}`}, and ${math`f_{Y}(y) = ${2}\pi k y\,e^{-\pi k y^{${2}}}`}.` },
  ],
  examples: [
    workedCambridge(q3),
    worked(squareOfUniform, { c: 1, d: 3, r: q(3, 2) }, t`The square of a uniform variable`),
    worked(densityOfTransform, { lam: q(1), kind: 'square', c: 2, y: q(1, 4) }, t`The density of ${math`X^{${2}}`} for an exponential ${mX}`),
  ],
  generators: [cdfOfPower, squareOfUniform, densityOfTransform],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['cdf-method'],
  claims,
  cambridge: [q4cdf, q4t, q4tProof, squareRule],
  gate: ['s2-q4-cdf', 's3-q4-density-t', 's3-q4-tail', 's3-notes-square'],
};
