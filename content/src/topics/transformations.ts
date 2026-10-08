/**
 * rv.transformations: the joint density of (U, V) = T(X, Y), by the change of variables
 * formula f_{U,V}(u, v) = f_{X,Y}(x(u, v), y(u, v)) |J|, with J the Jacobian of the inverse.
 * From the Faculty schedule ("transformation of random variables (including Jacobians)")
 * and IA Probability Example Sheet 4 Q7 (rotating two independent standard normals), Q8
 * (X + Y and X/(X + Y) for independent exponentials), and Q9(a) (polar coordinates for a
 * shot at a target). Sheet 4 has no official solutions; the answers are checked by
 * numerical integration and simulation.
 */
import { mulberry32 } from '@learnhub/mastery';
import { auto, cite, supervision, withUses } from '../cambridge';
import { int, pick, q, str } from '../math';
import { expSample, near, normalSample, PhiSeries, round, simpson } from '../partv-b';
import { generator, type Misconception } from '../problem';
import { computedMath, dmath, math, paren, t } from '../rich';
import { checkFrom, worked, workedCambridge, type ProbabilityClaim, type TopicContent } from '../topic';

const [mX, mY, mU, mV] = [math`X`, math`Y`, math`U`, math`V`];
const SH4 = 'ia-prob-sheet-4' as const;
const r4 = (x: number): number => round(x, 4);

// ---------------------------------------------------------------- a linear map of two uniforms

interface LinP { a: number; b: number; c: number; d: number }
const det = (p: LinP): number => p.a * p.d - p.b * p.c;

const linearJacobian = generator<LinP>({
  id: 'linear-jacobian',
  skill: 'For a linear map (U, V) = (aX + bY, cX + dY) of a uniform point in the unit square, the joint density of (U, V) is 1/|ad - bc| on the image.',
  params: (rng) => {
    for (;;) {
      const p = { a: int(rng, -3, 3), b: int(rng, -3, 3), c: int(rng, -3, 3), d: int(rng, -3, 3) };
      if (Math.abs(det(p)) >= 2) return p;
    }
  },
  sane: (p) => (Math.abs(det(p)) >= 2 ? null : 'out of range'),
  problem: (p) => {
    const D = det(p);
    // A point of the image: the image of (1/2, 1/3).
    const u0 = q(3 * p.a + 2 * p.b, 6);
    const v0 = q(3 * p.c + 2 * p.d, 6);
    const lin = (x: number, y: number, name: string) => {
      const terms = [[x, 'X'], [y, 'Y']].filter(([k]) => k !== 0).map(([k, v]) => `${k === 1 ? '' : k === -1 ? '-' : k}${v}`);
      return `${name} = ${terms.join(' + ').replace(/\+ -/g, '- ')}`;
    };
    return {
      prompt: t`${mX} and ${mY} are independent and uniform on ${math`[${0}, ${1}]`}. Let ${computedMath(lin(p.a, p.b, 'U'))} and ${computedMath(lin(p.c, p.d, 'V'))}. Find the joint density of ${math`(U, V)`} at ${math`(${u0}, ${v0})`}, a point of its range.`,
      answer: { kind: 'exact', expected: str(q(1, Math.abs(D))) },
      solution: [
        t`The map is linear and one to one, since ${math`ad - bc = ${paren(p.a)} \times ${paren(p.d)} - ${paren(p.b)} \times ${paren(p.c)} = ${D} \ne ${0}`}. Its inverse is linear too, with Jacobian ${math`\frac{\partial(x, y)}{\partial(u, v)} = ${q(1, D)}`}, the reciprocal of the forward determinant.`,
        t`So ${math`f_{U,V}(u, v) = f_{X,Y}(x, y)\,\left|${q(1, D)}\right| = ${1} \times ${q(1, Math.abs(D))}`} on the image of the square, a parallelogram of area ${Math.abs(D)}, and ${0} elsewhere: ${math`${q(1, Math.abs(D))}`}.`,
      ],
    };
  },
  solve: (p) => {
    // The image of the unit square has area |det|; a uniform density on it is 1/area. Measure the area by the shoelace formula.
    const pts = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([x, y]) => [p.a * (x as number) + p.b * (y as number), p.c * (x as number) + p.d * (y as number)] as const);
    let s = 0;
    for (let i = 0; i < 4; i++) {
      const [x1, y1] = pts[i] as readonly [number, number];
      const [x2, y2] = pts[(i + 1) % 4] as readonly [number, number];
      s += x1 * y2 - x2 * y1;
    }
    return str(q(1, Math.abs(s) / 2));
  },
  misconceptions: (p): Misconception[] => {
    const D = det(p);
    return [
      { response: String(Math.abs(D)), why: t`${Math.abs(D)} is the forward determinant: areas grow by that factor, so the density shrinks by it. Use the Jacobian of the inverse map, ${math`${q(1, D)}`}.` },
      { response: str(q(1, D)), why: t`A density cannot be negative: take the absolute value of the Jacobian.` },
      { response: '1', why: t`The map stretches areas by ${Math.abs(D)}, so the density is not still ${1}: multiply by ${math`|J|`}.` },
    ];
  },
});

// ---------------------------------------------------------------- the sum of two exponentials (Sheet 4 Q8)

interface SumP { lam: number; s: number }
const LAMS: readonly number[] = [0.5, 1, 2, 3];
const sumCdf = ({ lam, s }: SumP): number => 1 - Math.exp(-lam * s) * (1 + lam * s);

const sumOfExponentials = generator<SumP>({
  id: 'sum-of-exponentials',
  skill: 'Use the density λ^2 u e^(-λu) of X + Y, for independent Exp(λ) variables, found by the Jacobian in Sheet 4 Q8.',
  params: (rng) => {
    for (;;) { const p = { lam: pick(rng, LAMS), s: pick(rng, [0.5, 1, 1.5, 2, 3, 4]) }; if (p.lam * p.s <= 8) return p; }
  },
  sane: ({ lam, s }) => (lam > 0 && s > 0 && lam * s <= 8 ? null : 'out of range'),
  problem: (p) => {
    const v = sumCdf(p);
    return {
      prompt: t`${mX} and ${mY} are independent, each ${math`\mathrm{Exp}(${p.lam})`}. Find ${math`P(X + Y \le ${p.s})`}, to four decimal places.`,
      answer: { kind: 'numeric', expected: r4(v), absTol: 0.00015, relTol: 0 },
      solution: [
        t`By the change of variables ${math`U = X + Y`}, ${math`V = X/(X + Y)`} (Sheet ${4} Q${8}), ${math`U`} has density ${math`\lambda^{${2}}u\,e^{-\lambda u}`} for ${math`u > ${0}`}.`,
        t`${math`P(U \le ${p.s}) = \int_{${0}}^{${p.s}} \lambda^{${2}}u\,e^{-\lambda u}\,du = ${1} - e^{-\lambda s}(${1} + \lambda s)`} by parts, with ${math`\lambda s = ${p.lam * p.s}`}: about ${r4(v)}.`,
      ],
    };
  },
  solve: (p) => {
    // Integrate the joint density over the triangle x + y ≤ s numerically.
    const f = (x: number): number => p.lam * Math.exp(-p.lam * x) * (1 - Math.exp(-p.lam * (p.s - x)));
    return String(r4(simpson(f, 0, p.s, 2000)));
  },
  misconceptions: (p): Misconception[] => [
    { response: String(r4(1 - Math.exp(-p.lam * p.s))), why: t`That is ${math`P(X \le ${p.s})`} for one variable. The sum is not exponential: its density is ${math`\lambda^{${2}}u\,e^{-\lambda u}`}.` },
    { response: String(r4((1 - Math.exp(-p.lam * p.s)) ** 2)), why: t`That is ${math`P(X \le ${p.s},\ Y \le ${p.s})`}, a square. ${math`X + Y \le ${p.s}`} is the triangle below the line ${math`x + y = ${p.s}`}.` },
    { response: String(r4(1 - Math.exp(-2 * p.lam * p.s))), why: t`Rates add for the minimum, not for the sum: ${math`\min\{X, Y\} \sim \mathrm{Exp}(${2 * p.lam})`}, but ${math`X + Y`} takes longer than either.` },
  ],
});

// ---------------------------------------------------------------- polar coordinates (Sheet 4 Q9)

interface PolP { sigma: number; r: number }

const polarNormal = generator<PolP>({
  id: 'polar-normal',
  skill: 'For independent N(0, σ²) coordinates, R = √(X² + Y²) has P(R ≤ r) = 1 - e^(-r²/(2σ²)), by polar coordinates.',
  params: (rng) => {
    for (;;) {
      const p = { sigma: int(rng, 1, 3), r: pick(rng, [0.5, 1, 1.5, 2, 2.5, 3, 4, 5]) };
      if (p.r / p.sigma <= 3.5 && p.r / p.sigma >= 0.25) return p;
    }
  },
  sane: ({ sigma, r }) => (sigma > 0 && r > 0 && r / sigma <= 3.5 && r / sigma >= 0.25 ? null : 'out of range'),
  problem: (p) => {
    const v = 1 - Math.exp(-(p.r * p.r) / (2 * p.sigma * p.sigma));
    return {
      prompt: t`A shot lands at ${math`(X, Y)`}, where ${mX} and ${mY} are independent ${math`N(${0}, ${p.sigma * p.sigma})`}. Find the probability that it lands within ${p.r} of the centre, to four decimal places.`,
      answer: { kind: 'numeric', expected: r4(v), absTol: 0.00015, relTol: 0 },
      solution: [
        t`In polar coordinates ${math`x = r\cos\theta`}, ${math`y = r\sin\theta`}, with Jacobian ${math`r`}, the joint density ${math`\frac{${1}}{${2}\pi\sigma^{${2}}}e^{-(x^{${2}} + y^{${2}})/(${2}\sigma^{${2}})}`} becomes ${math`\frac{r}{${2}\pi\sigma^{${2}}}e^{-r^{${2}}/(${2}\sigma^{${2}})}`}. Integrating ${math`\theta`} out, ${math`R`} has density ${math`\frac{r}{\sigma^{${2}}}e^{-r^{${2}}/(${2}\sigma^{${2}})}`}.`,
        t`${math`P(R \le ${p.r}) = ${1} - e^{-${p.r * p.r}/${2 * p.sigma * p.sigma}} \approx ${r4(v)}`}.`,
      ],
    };
  },
  solve: (p) => {
    // In Cartesian coordinates: integrate the density of X times P(|Y| ≤ √(r² - x²)).
    const s = p.sigma;
    const f = (x: number): number => (Math.exp(-(x * x) / (2 * s * s)) / (s * Math.sqrt(2 * Math.PI))) * (2 * PhiSeries(Math.sqrt(Math.max(0, p.r * p.r - x * x)) / s) - 1);
    return String(r4(simpson(f, -p.r, p.r, 4000)));
  },
  misconceptions: (p): Misconception[] => [
    { response: String(r4((2 * PhiSeries(p.r / p.sigma) - 1) ** 2)), why: t`That is ${math`P(|X| \le ${p.r},\ |Y| \le ${p.r})`}, a square around the centre. Within ${p.r} of the centre is a disc: use polar coordinates.` },
    { response: String(r4(1 - Math.exp(-(p.r * p.r) / 2))), why: t`The variance is ${p.sigma * p.sigma}: the exponent is ${math`-r^{${2}}/(${2}\sigma^{${2}})`}.` },
    { response: String(r4(Math.exp(-(p.r * p.r) / (2 * p.sigma * p.sigma)))), why: t`${math`e^{-r^{${2}}/(${2}\sigma^{${2}})}`} is ${math`P(R > r)`}, landing outside the disc.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

function simSumAndRatio(lam: number, n: number): { sum: number; ratio: number } {
  const rng = mulberry32(8);
  let [a, b] = [0, 0];
  for (let i = 0; i < n; i++) {
    const [x, y] = [expSample(rng, lam), expSample(rng, lam)];
    if (x + y <= 1.5 / lam) a++;
    if (x / (x + y) <= 0.3) b++;
  }
  return { sum: a / n, ratio: b / n };
}

const q8sum = auto({
  id: 'ia4-q8-sum',
  source: cite(SH4, 'Q8'),
  title: t`The sum of two independent exponential variables`,
  prompt: t`${mX} and ${mY} are independent and exponentially distributed, each with parameter ${math`\lambda`}. Use the change of variables ${math`U = X + Y`}, ${math`V = X/(X + Y)`} to find the density of ${math`X + Y`} at ${math`u > ${0}`}. (Type ${math`\lambda`} as lambda.)`,
  answer: { kind: 'expression', expected: 'lambda^2 u e^(-lambda u)', variables: ['u', 'lambda'], domains: { u: { kind: 'real', min: 0.1, max: 6 }, lambda: { kind: 'real', min: 0.2, max: 3 } } },
  solution: [
    t`The map ${math`(x, y) \mapsto (u, v) = (x + y,\ x/(x + y))`} takes ${math`(${0}, \infty)^{${2}}`} one to one onto ${math`(${0}, \infty) \times (${0}, ${1})`}, with inverse ${math`x = uv`}, ${math`y = u(${1} - v)`}.`,
    t`The Jacobian is ${math`\frac{\partial(x, y)}{\partial(u, v)} = \det\begin{pmatrix} v & u \\ ${1} - v & -u \end{pmatrix} = -uv - u(${1} - v) = -u`}, so ${math`|J| = u`}.`,
    t`${math`f_{U,V}(u, v) = \lambda e^{-\lambda uv}\,\lambda e^{-\lambda u(${1} - v)}\,u = \lambda^{${2}}u\,e^{-\lambda u}`} for ${math`u > ${0}`} and ${math`${0} < v < ${1}`}. It factorises as ${math`\lambda^{${2}}u\,e^{-\lambda u}`} times ${1}: ${mU} and ${mV} are independent, ${mU} has density ${math`\lambda^{${2}}u\,e^{-\lambda u}`}, and ${mV} is uniform on ${math`(${0}, ${1})`}.`,
  ],
  reference: 'lambda^2 u e^(-lambda u)',
  verify: () => {
    const n = 20000;
    const lam = 2;
    const sim = simSumAndRatio(lam, n);
    const exact = simpson((u) => lam * lam * u * Math.exp(-lam * u), 0, 1.5 / lam, 2000);
    return near('P(X + Y ≤ 1.5/λ) by simulation against the integrated density', sim.sum, exact, 4.5 * Math.sqrt((exact * (1 - exact)) / n))
      ?? near('P(X/(X + Y) ≤ 0.3) by simulation against the uniform', sim.ratio, 0.3, 4.5 * Math.sqrt((0.3 * 0.7) / n))
      ?? near('the density integrates to 1 - e^(-x)(1 + x) at x = 1.5', exact, 1 - Math.exp(-1.5) * 2.5, 1e-10);
  },
  misconceptions: [
    { response: 'lambda^2 e^(-lambda u)', why: t`The Jacobian ${math`|J| = u`} multiplies the joint density: the density of the sum is ${math`\lambda^{${2}}u\,e^{-\lambda u}`}.` },
    { response: '2lambda e^(-2lambda u)', why: t`That is the density of the minimum. The sum is larger than either variable, and its density starts at ${0}.` },
  ],
});

const DIST_OPTIONS = [
  { id: 'uniform', label: t`Uniform on ${math`(${0}, ${1})`}` },
  { id: 'exp-lambda', label: t`${math`\mathrm{Exp}(\lambda)`}` },
  { id: 'exp-2lambda', label: t`${math`\mathrm{Exp}(${2}\lambda)`}` },
  { id: 'beta', label: t`Density ${math`${2}v`} on ${math`(${0}, ${1})`}` },
];
const q8ratio = auto({
  id: 'ia4-q8-ratio',
  source: cite(SH4, 'Q8'),
  title: t`The share of the first variable in the sum`,
  prompt: t`${mX} and ${mY} are independent, each ${math`\mathrm{Exp}(\lambda)`}. What is the distribution of ${math`X/(X + Y)`}?`,
  nudge: t`Not quite. Find the joint density of the sum and the share, and see how it depends on the share.`,
  hints: [
    t`With ${math`u = x + y`} and ${math`v = x/(x + y)`}, what are ${math`x`} and ${math`y`} in terms of ${math`u`} and ${math`v`}?`,
    t`What is the Jacobian, and so the joint density of ${math`(U, V)`}?`,
    t`Does that density depend on ${math`v`}, and what range does ${math`v`} take?`,
  ],
  answer: { kind: 'choice', options: DIST_OPTIONS, correct: 'uniform' },
  solution: [
    t`With ${math`u = x + y`} and ${math`v = x/(x + y)`}, the joint density of ${math`(U, V)`} is ${math`\lambda^{${2}}u\,e^{-\lambda u}`} for ${math`u > ${0}`}, ${math`${0} < v < ${1}`}, with ${math`|J| = u`}.`,
    t`It does not depend on ${math`v`}, so ${mV} is uniform on ${math`(${0}, ${1})`}, and independent of ${mU}, for every ${math`\lambda`}.`,
    t`A joint density with no dependence on a variable makes that variable uniform on its range.`,
  ],
  reference: 'uniform',
  verify: () => {
    const n = 20000;
    const sim = simSumAndRatio(0.7, n);
    return near('P(X/(X + Y) ≤ 0.3) by simulation, λ = 0.7', sim.ratio, 0.3, 4.5 * Math.sqrt((0.3 * 0.7) / n));
  },
  misconceptions: [
    { response: 'exp-lambda', why: t`${math`X/(X + Y)`} lies between ${0} and ${1}, so it cannot be exponential.` },
    { response: 'beta', why: t`The joint density ${math`\lambda^{${2}}u\,e^{-\lambda u}`} has no factor of ${math`v`}: the share is uniform.` },
  ],
});

const NORMAL_OPTIONS = [
  { id: 'n01', label: t`${math`N(${0}, ${1})`}` },
  { id: 'ncos', label: t`${math`N(${0}, \cos^{${2}}\theta)`}` },
  { id: 'n02', label: t`${math`N(${0}, ${2})`}` },
  { id: 'ncs', label: t`${math`N(${0}, (\cos\theta + \sin\theta)^{${2}})`}` },
];
const q7dist = auto({
  id: 'ia4-q7-distribution',
  source: cite(SH4, 'Q7'),
  title: t`Rotating two standard normals`,
  prompt: t`${mX} and ${mY} are independent ${math`N(${0}, ${1})`}, and for a fixed ${math`\theta`}, ${math`U = X\cos\theta + Y\sin\theta`}. What is the distribution of ${mU}?`,
  nudge: t`Not quite. Independent variances add; standard deviations do not.`,
  hints: [
    t`What are the means and variances of ${math`X\cos\theta`} and ${math`Y\sin\theta`}?`,
    t`For independent normals, what is the distribution of their sum?`,
    t`What is ${math`\cos^{${2}}\theta + \sin^{${2}}\theta`}?`,
  ],
  answer: { kind: 'choice', options: NORMAL_OPTIONS, correct: 'n01' },
  solution: [
    t`${math`(U, V) = (X\cos\theta + Y\sin\theta,\ -X\sin\theta + Y\cos\theta)`} is a rotation, with Jacobian ${1}, and it keeps ${math`x^{${2}} + y^{${2}} = u^{${2}} + v^{${2}}`}.`,
    t`So ${math`f_{U,V}(u, v) = \frac{${1}}{${2}\pi}e^{-(u^{${2}} + v^{${2}})/${2}}`}: ${mU} and ${mV} are independent ${math`N(${0}, ${1})`}. The variance checks: ${math`\cos^{${2}}\theta + \sin^{${2}}\theta = ${1}`}.`,
    t`A rotation of independent standard normals is again independent standard normals.`,
  ],
  reference: 'n01',
  verify: () => {
    // The sample variance of U for θ = 1 over 20,000 draws is near 1, and P(U ≤ 1) near Φ(1).
    const rng = mulberry32(7);
    const n = 20000;
    let below = 0;
    for (let i = 0; i < n; i++) if (normalSample(rng) * Math.cos(1) + normalSample(rng) * Math.sin(1) <= 1) below++;
    const p = PhiSeries(1);
    return near('P(U ≤ 1) by simulation, θ = 1', below / n, p, 4.5 * Math.sqrt((p * (1 - p)) / n));
  },
  misconceptions: [
    { response: 'ncs', why: t`The two terms are independent, so their variances add: ${math`\cos^{${2}}\theta + \sin^{${2}}\theta = ${1}`}. Standard deviations do not add.` },
    { response: 'n02', why: t`Each term has variance ${math`\cos^{${2}}\theta`} or ${math`\sin^{${2}}\theta`}, not ${1}.` },
  ],
});

const q7proof = supervision({
  id: 'ia4-q7',
  source: cite(SH4, 'Q7'),
  title: t`Rotations keep independent standard normals`,
  prompt: t`${mX} and ${mY} are independent ${math`N(${0}, ${1})`}. Show that, for any fixed ${math`\theta`}, ${math`U = X\cos\theta + Y\sin\theta`} and ${math`V = -X\sin\theta + Y\cos\theta`} are independent, and find their distributions.`,
  hints: [
    t`What is the inverse of the map ${math`(x, y) \mapsto (u, v)`}, and what is its Jacobian?`,
    t`How does ${math`u^{${2}} + v^{${2}}`} compare with ${math`x^{${2}} + y^{${2}}`}?`,
    t`Does the joint density of ${math`(U, V)`} factorise, and into which densities?`,
  ],
  writeUp: 'proof',
});
const q8proof = supervision({
  id: 'ia4-q8',
  source: cite(SH4, 'Q8'),
  title: t`The sum and the share are independent`,
  prompt: t`${mX} and ${mY} are independent ${math`\mathrm{Exp}(\lambda)`}. Show that ${math`X + Y`} and ${math`X/(X + Y)`} are independent, and find their distributions. Check that the map is one to one, and state onto which region.`,
  hints: [
    t`What is the inverse of ${math`(x, y) \mapsto (x + y,\ x/(x + y))`}, and onto which region does it map ${math`(${0}, \infty)^{${2}}`}?`,
    t`What is the absolute value of the Jacobian?`,
    t`Does the joint density of the sum and the share factorise, and what are the two factors?`,
  ],
  writeUp: 'proof',
});
const q9a = supervision({
  id: 'ia4-q9-a',
  source: cite(SH4, 'Q9(a)'),
  title: t`The distance of a shot from the centre`,
  prompt: t`A shot is fired at a circular target; the coordinates of the hole, from the centre, are independent ${math`N(${0}, ${1})`}. Show that the distance of the hole from the centre has density ${math`r e^{-r^{${2}}/${2}}`} on ${math`[${0}, \infty)`}.`,
  hints: [
    t`What is the joint density of the two coordinates, written with ${math`r^{${2}} = x^{${2}} + y^{${2}}`}?`,
    t`In polar coordinates, what Jacobian factor appears, and what is the joint density of ${math`(R, \Theta)`}?`,
    t`Integrating out ${math`\Theta`} over ${math`[${0}, ${2}\pi)`}, what is the density of ${math`R`}?`,
  ],
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

const claims: ProbabilityClaim[] = [
  { what: 'X uniform on [0, 1]: 2X is at most 1', exact: q(1, 2), trial: (rng) => 2 * rng() <= 1 },
];
const HALF = 0.5;
const prodCdf = (u: number): number => u - u * Math.log(u);
const [mJ, mT] = [math`J`, math`T`];

export const transformations: TopicContent = {
  topicId: 'rv.transformations',
  goal: t`Find the joint density of ${math`(U, V) = T(X, Y)`} by the change of variables formula with the Jacobian, and read off independence and the marginals.`,
  objective: t`Find the joint density of new random variables with the Jacobian, and read off marginals and independence.`,
  why: t`Sums, ratios and polar coordinates of random variables all follow from it; it also proves Box-Muller.`,
  minutes: 35,
  lesson: [
    { kind: 'section', title: t`Multiplying two random numbers` },
    { kind: 'hook', text: t`Pick two numbers uniformly from ${math`[${0}, ${1}]`}, independently, and multiply them. Is the product uniform too? A moment's thought says no: the product is never bigger than either factor, so small values should be more common. How much more common, exactly?` },
    { kind: 'narrative', text: t`For one variable you already have a tool: if ${math`Y = g(X)`} with ${math`g`} smooth and one to one, then ${math`f_{Y}(y) = f_{X}(h(y))\,\lvert h'(y) \rvert`}, where ${math`h = g^{-${1}}`}. The factor ${math`\lvert h'(y) \rvert`} says how much ${math`h`} stretches lengths: probability is conserved, so density must shrink where the map stretches. With two variables, lengths become areas, and the stretch factor becomes a determinant.` },
    { kind: 'section', title: t`The change of variables formula` },
    {
      kind: 'definition',
      name: t`Jacobian`,
      formal: t`For a smooth map ${math`(u, v) \mapsto (x(u, v), y(u, v))`}, the [[jacobian|Jacobian]] is ${dmath`J = \frac{\partial(x, y)}{\partial(u, v)} = \det\begin{pmatrix} \partial x/\partial u & \partial x/\partial v \\ \partial y/\partial u & \partial y/\partial v \end{pmatrix}.`}`,
      plain: t`In plain words: the factor by which the map scales small areas, with a sign for orientation. For ${math`x = u + v`}, ${math`y = u - v`}, ${math`J = (${1})(-${1}) - (${1})(${1}) = -${2}`}: areas double.`,
    },
    {
      kind: 'theorem',
      name: t`Change of variables`,
      statement: t`Let ${math`(X, Y)`} have joint density ${math`f_{X,Y}`}, and let ${mT} map the region where ${math`f_{X,Y} > ${0}`} one to one onto a region ${math`R`}, with smooth inverse ${math`x = x(u, v)`}, ${math`y = y(u, v)`}. Then ${math`(U, V) = T(X, Y)`} has density ${dmath`f_{U,V}(u, v) = f_{X,Y}\big(x(u, v), y(u, v)\big)\,\lvert J \rvert \quad \text{on } R,`} and ${0} outside ${math`R`}.`,
    },
    {
      kind: 'p',
      text: t`This is the [[change-of-variables|change of variables formula]]. It is the substitution rule for double integrals read as a statement about probability: a small rectangle of area ${math`du\,dv`} near ${math`(u, v)`} comes from a region of area about ${math`\lvert J \rvert\,du\,dv`} near ${math`(x, y)`}, and both must carry the same probability.`,
      why: { q: t`Why the inverse map's Jacobian, not the forward one's?`, a: t`The density of ${math`(U, V)`} is a probability per unit area in the ${math`(u, v)`} plane. The probability comes from the ${math`(x, y)`} plane, so we need the area there per unit area here: that is the stretch of the map from ${math`(u, v)`} back to ${math`(x, y)`}.` },
    },
    {
      kind: 'list',
      items: [
        t`Check the map is one to one, and find the region ${math`R`} of possible ${math`(u, v)`}.`,
        t`Invert: write ${math`x`} and ${math`y`} in terms of ${math`u`} and ${math`v`}, and compute ${mJ}.`,
        t`Substitute into ${math`f_{X,Y}`} and multiply by ${math`\lvert J \rvert`}. Integrate out a variable for a marginal.`,
      ],
    },
    { kind: 'section', title: t`The product, worked` },
    {
      kind: 'steps',
      steps: [
        { label: t`Add a partner variable`, text: t`To use the formula we need two new variables. Keep ${math`V = X`} alongside ${math`U = XY`}. The point ${math`(X, Y)`} is uniform on the unit square, ${math`f_{X,Y} = ${1}`} there.`, plain: t`The partner is a free choice; pick one that makes the inverse easy.` },
        { label: t`Find the region`, text: t`For ${math`${0} < x, y < ${1}`}: ${math`v = x \in (${0}, ${1})`} and ${math`u = xy \in (${0}, v)`}. So ${math`R = \{(u, v) : ${0} < u < v < ${1}\}`}, and the map is one to one there.` },
        { label: t`Invert and compute J`, text: t`${math`x = v`} and ${math`y = u/v`}, so`, eq: [dmath`J = \det\begin{pmatrix} ${0} & ${1} \\ ${1}/v & -u/v^{${2}} \end{pmatrix} = -\frac{${1}}{v}.`] },
        { label: t`The joint density`, text: t`${math`f_{U,V}(u, v) = ${1} \cdot \lvert J \rvert = \frac{${1}}{v}`} for ${math`${0} < u < v < ${1}`}.` },
        { label: t`The marginal`, text: t`Integrate out ${math`v`} over ${math`u < v < ${1}`}:`, eq: [dmath`f_{U}(u) = \int_{u}^{${1}} \frac{dv}{v} = -\ln u, \quad ${0} < u < ${1}.`], plain: t`Large near ${0}, as the hook suggested, and ${0} at ${math`u = ${1}`}.` },
      ],
    },
    { kind: 'p', text: t`So ${math`P(XY \le \tfrac{${1}}{${2}}) = \int_{${0}}^{${1}/${2}} (-\ln u)\,du = \tfrac{${1}}{${2}} + \tfrac{${1}}{${2}}\ln ${2} \approx ${r4(prodCdf(HALF))}`}, well above a half.` },
    checkFrom(linearJacobian, { a: 2, b: 1, c: 1, d: -1 }, t`Here ${math`ad - bc = -${2} - ${1} = -${3}`}. The inverse map scales area by ${math`\frac{${1}}{${3}}`}, so the density is ${math`${1} \times \frac{${1}}{${3}}`} on the image.`),
    { kind: 'pitfall', claim: t`If ${mX} is uniform on ${math`[${0}, ${1}]`}, then ${math`U = ${2}X`} has density ${2} on ${math`[${0}, ${2}]`}: the map doubles.`, counterexample: t`A density of ${2} on an interval of length ${2} has total probability ${4}. The inverse ${math`x = u/${2}`} has ${math`\lvert J \rvert = \tfrac{${1}}{${2}}`}, so the density is ${q(1, 2)}: stretching spreads the probability thinner.` },
    { kind: 'section', title: t`Independence, polar coordinates, rotations` },
    { kind: 'narrative', text: t`If the joint density of ${math`(U, V)`} factorises as ${math`g(u)h(v)`} on a rectangle, then ${mU} and ${mV} are independent. Both conditions matter. In the product example, ${math`\frac{${1}}{v}`} looks like a function of ${math`v`} alone, but the region ${math`${0} < u < v < ${1}`} is a triangle, so ${mU} and ${mV} are not independent: knowing ${math`V = v`} forces ${math`U < v`}.` },
    { kind: 'p', text: t`Two maps come up again and again. Polar coordinates, ${math`x = r\cos\theta`} and ${math`y = r\sin\theta`}, have ${math`J = r`}: a thin ring far from the centre has more area. A rotation has ${math`J = ${1}`} and keeps ${math`x^{${2}} + y^{${2}}`} unchanged. IA Probability Sheet ${4} uses both, in questions ${7} and ${9}, and question ${8} splits two exponential times into their sum and the first one's share, the worked example below.` },
    checkFrom(polarNormal, { sigma: 2, r: 2 }, t`In polar coordinates the distance has ${math`P(R \le r) = ${1} - e^{-r^{${2}}/(${2}\sigma^{${2}})}`}; with ${math`r = \sigma = ${2}`}, that is ${math`${1} - e^{-${1}/${2}} \approx ${r4(1 - Math.exp(-0.5))}`}.`),
    { kind: 'pitfall', claim: t`A joint density of the form ${math`g(u)h(v)`} always means ${mU} and ${mV} are independent.`, counterexample: t`Only on a product region. ${math`f_{U,V} = \frac{${1}}{v}`} on ${math`${0} < u < v < ${1}`} has that form, yet ${math`P(U > \tfrac{${1}}{${2}}, V < \tfrac{${1}}{${2}}) = ${0}`} while both events have positive probability.` },
    { kind: 'takeaway', text: t`Invert the map, multiply the old density by ${math`\lvert J \rvert`} on the new region, and integrate out what you do not need.` },
  ],
  examples: [
    workedCambridge(q8sum),
    worked(linearJacobian, { a: 1, b: 1, c: 1, d: -1 }, t`The sum and difference of two uniforms`),
    worked(polarNormal, { sigma: 1, r: 1 }, t`Within one unit of the centre`),
  ],
  generators: [linearJacobian, sumOfExponentials, polarNormal],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['change-of-variables', 'jacobian'],
  claims,
  cambridge: withUses([q8ratio, q7dist, q7proof, q8proof, q9a], {
    'ia4-q8': { sections: ['The change of variables formula'], note: t`The sum and the share of two exponentials are independent` },
    'ia4-q7': { sections: ['Independence, polar coordinates, rotations'], note: t`Rotating independent standard normals` },
    'ia4-q9-a': { sections: ['Independence, polar coordinates, rotations'], note: t`The distance of a normal point from the centre` },
  }),
  // Best first: the three Sheet 4 write-ups. The two choice questions (the distribution of
  // X/(X + Y), and of a rotated normal) can be guessed, so they do not gate.
  gate: ['ia4-q8', 'ia4-q7', 'ia4-q9-a'],
  recall: [
    { front: t`State the change of variables formula.`, back: t`${math`f_{U,V}(u, v) = f_{X,Y}(x(u, v), y(u, v))\,\lvert J \rvert`} on the image, with ${mJ} the Jacobian of the inverse map.` },
    { front: t`Jacobian of polar coordinates?`, back: t`${math`J = r`}.` },
    { front: t`When does a joint density show independence?`, back: t`When it factorises as ${math`g(u)h(v)`} on a product region.` },
  ],
  proofOrder: [
    {
      title: t`The density of the product of two uniforms`,
      steps: [
        t`Pair ${math`U = XY`} with ${math`V = X`}; the region is ${math`${0} < u < v < ${1}`}.`,
        t`Invert: ${math`x = v`}, ${math`y = u/v`}, so ${math`\lvert J \rvert = \frac{${1}}{v}`}.`,
        t`Joint density: ${math`f_{U,V}(u, v) = \frac{${1}}{v}`} on the region.`,
        t`Integrate out ${math`v`}: ${math`f_{U}(u) = -\ln u`}.`,
      ],
    },
  ],
};
