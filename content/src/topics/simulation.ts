/**
 * rv.simulation: generating continuous random variables from uniform ones, by inverting the
 * distribution function, by the Box-Muller transform, and by rejection sampling. From the
 * Faculty schedule ("Simulation: generating continuous random variables, Box-Muller
 * transform, rejection sampling."); the example sheets set no simulation problem (batch 2,
 * question 5), so the Cambridge problems are the schedule's own results, set for
 * supervision, and Sheet 4 Q9 run backwards. Every sampler is checked by simulation. Batch 7 adds
 * Grinstead and Snell, Section 5.2, Exercises 3, 7, and 21 (7 and 21 with printed odd answers),
 * which give the topic its gate.
 */
import { mulberry32 } from '@learnhub/mastery';
import { auto, cite, supervision } from '../cambridge';
import { int, mul, pick, q, str, sub, toFloat, type Rational } from '../math';
import { bisect, near, powQ, round, rootTex } from '../partv-b';
import { generator, type Misconception } from '../problem';
import { dmath, math, t } from '../rich';
import { checkFrom, worked, workedCambridge, type ProbabilityClaim, type TopicContent } from '../topic';

const [mU, mX] = [math`U`, math`X`];
const SCHED = 'tripos-schedules' as const;
const SIM_AT = 'IA Probability, Continuous random variables: "Simulation: generating continuous random variables, Box-Muller transform, rejection sampling"';
const r4 = (x: number): number => round(x, 4);

// ---------------------------------------------------------------- inverting a distribution function

interface InvP { n: number; m: number; r: Rational }
const RS: readonly Rational[] = [q(1, 2), q(1, 3), q(2, 3), q(1, 4), q(3, 4), q(2, 5), q(3, 5), q(4, 5)];

const inversePower = generator<InvP>({
  id: 'inverse-power',
  skill: 'Turn a uniform value u into a sample x = F^(-1)(u) by solving F(x) = u.',
  params: (rng) => ({ n: int(rng, 2, 3), m: int(rng, 2, 6), r: pick(rng, RS) }),
  sane: ({ n, m }) => (n >= 2 && m >= 2 ? null : 'out of range'),
  problem: ({ n, m, r }) => {
    const u = powQ(r, n);
    const x = mul(q(m), r);
    return {
      prompt: t`${mX} has distribution function ${math`F(x) = \left(\frac{x}{${m}}\right)^{${n}}`} for ${math`${0} \le x \le ${m}`}. A computer returns the uniform value ${math`u = ${u}`}. What sample ${math`x = F^{-${1}}(u)`} does the inverse transform method give?`,
      answer: { kind: 'exact', expected: str(x) },
      solution: [
        t`Solve ${math`F(x) = u`}: ${math`\left(\frac{x}{${m}}\right)^{${n}} = ${u}`}, so ${math`\frac{x}{${m}} = ${rootTex(n, math`${u}`)} = ${r}`}.`,
        t`So ${math`x = ${m} \times ${r} = ${x}`}. Feeding a uniform ${mU} through ${math`F^{-${1}}`} gives a variable with distribution function ${math`F`}.`,
      ],
    };
  },
  solve: ({ n, m, r }) => {
    // Bisection on F(x) = u, then the nearest fraction with the denominator of r.
    const u = toFloat(powQ(r, n));
    const x = bisect((y) => (y / m) ** n - u, 0, m, 80);
    const den = Number(r.den);
    return str(q(Math.round(x * den), den));
  },
  misconceptions: ({ n, m, r }): Misconception[] => {
    const u = powQ(r, n);
    return [
      { response: str(mul(q(m), u)), why: t`That solves ${math`x / ${m} = u`}. ${math`F`} raises ${math`x/${m}`} to the power ${n}, so take the root of ${math`u`}.` },
      { response: str(r), why: t`${math`${rootTex(n, math`u`)} = ${r}`} is ${math`x / ${m}`}. Multiply by ${m}.` },
      { response: str(powQ(mul(u, q(1, m)), n)), why: t`That applies ${math`F`} to ${math`u`}. The method applies the inverse, ${math`F^{-${1}}`}.` },
    ];
  },
});

// ---------------------------------------------------------------- Box-Muller

interface BmP { u1: number; u2: number; which: 'x' | 'y' }
const bm = ({ u1, u2, which }: BmP): number => Math.sqrt(-2 * Math.log(u1)) * (which === 'x' ? Math.cos(2 * Math.PI * u2) : Math.sin(2 * Math.PI * u2));

const boxMuller = generator<BmP>({
  id: 'box-muller',
  skill: 'Apply the Box-Muller transform: R = √(-2 ln U1) and Θ = 2πU2 give X = R cos Θ and Y = R sin Θ, independent N(0, 1).',
  params: (rng) => {
    for (;;) {
      const p: BmP = { u1: int(rng, 5, 95) / 100, u2: int(rng, 1, 99) / 100, which: rng() < 0.5 ? 'x' : 'y' };
      if (Math.abs(bm({ ...p, which: 'x' })) > 0.01 && Math.abs(bm({ ...p, which: 'y' })) > 0.01) return p;
    }
  },
  sane: ({ u1, u2 }) => (u1 > 0 && u1 < 1 && u2 > 0 && u2 < 1 && Math.abs(bm({ u1, u2, which: 'x' })) > 0.01 && Math.abs(bm({ u1, u2, which: 'y' })) > 0.01 ? null : 'out of range'),
  problem: (p) => {
    const R = Math.sqrt(-2 * Math.log(p.u1));
    const th = 2 * Math.PI * p.u2;
    const v = bm(p);
    return {
      prompt: t`The Box-Muller transform is run on the uniform values ${math`u_{${1}} = ${p.u1}`} and ${math`u_{${2}} = ${p.u2}`}. Find the standard normal sample ${p.which === 'x' ? math`X = R\cos\Theta` : math`Y = R\sin\Theta`}, where ${math`R = \sqrt{-${2}\ln u_{${1}}}`} and ${math`\Theta = ${2}\pi u_{${2}}`}. Give four decimal places.`,
      answer: { kind: 'numeric', expected: r4(v), absTol: 0.00015, relTol: 0 },
      solution: [
        t`${math`R = \sqrt{-${2}\ln ${p.u1}} \approx ${r4(R)}`} and ${math`\Theta = ${2}\pi \times ${p.u2} \approx ${r4(th)}`} radians.`,
        t`${p.which === 'x' ? math`X = R\cos\Theta` : math`Y = R\sin\Theta`} ${math`\approx ${r4(v)}`}.`,
      ],
    };
  },
  solve: (p) => {
    // R from P(R > r) = e^(-r^2/2) = u1 by bisection, and the angle in turns.
    const R = bisect((r) => Math.exp(-r * r / 2) - p.u1, 0, 10, 100);
    const turn = p.u2 * 360;
    const rad = (turn * Math.PI) / 180;
    return String(r4(R * (p.which === 'x' ? Math.cos(rad) : Math.sin(rad))));
  },
  misconceptions: (p): Misconception[] => {
    const R = Math.sqrt(-2 * Math.log(p.u1));
    const trig = p.which === 'x' ? Math.cos : Math.sin;
    return [
      { response: String(r4(Math.sqrt(-Math.log(p.u1)) * trig(2 * Math.PI * p.u2))), why: t`${math`R = \sqrt{-${2}\ln u_{${1}}}`}: the factor ${2} makes ${math`P(R > r) = e^{-r^{${2}}/${2}}`}, the distance of a standard normal point.` },
      { response: String(r4(R * trig(p.u2))), why: t`The angle is ${math`${2}\pi u_{${2}}`}, uniform on a full turn, not ${math`u_{${2}}`} radians.` },
      { response: String(r4(R)), why: t`${math`R`} is the distance from the origin. The coordinate is ${math`R`} times ${p.which === 'x' ? math`\cos\Theta` : math`\sin\Theta`}.` },
    ];
  },
});

// ---------------------------------------------------------------- rejection sampling

interface RejP { j: number; k: number }
const fct = (n: number): number => (n <= 1 ? 1 : n * fct(n - 1));
const cOf = ({ j, k }: RejP): number => fct(j + k + 1) / (fct(j) * fct(k));
/** M = max of c x^j (1 - x)^k on [0, 1], at x = j/(j + k), exactly. */
const maxOf = (p: RejP): Rational => mul(q(cOf(p)), mul(powQ(q(p.j, p.j + p.k), p.j), powQ(q(p.k, p.j + p.k), p.k)));
const fOf = (p: RejP) => (x: number): number => cOf(p) * x ** p.j * (1 - x) ** p.k;

const rejection = generator<RejP>({
  id: 'rejection-acceptance',
  skill: 'In rejection sampling from a uniform proposal with bound M = max f, each proposal is accepted with probability 1/M.',
  params: (rng) => ({ j: int(rng, 1, 3), k: int(rng, 1, 3) }),
  sane: ({ j, k }) => (j >= 1 && k >= 1 ? null : 'out of range'),
  problem: (p) => {
    const M = maxOf(p);
    const c = cOf(p);
    const peak = q(p.j, p.j + p.k);
    const xp = p.j === 1 ? math`x` : math`x^{${p.j}}`;
    const yp = p.k === 1 ? math`(${1} - x)` : math`(${1} - x)^{${p.k}}`;
    const dens = math`f(x) = ${c}\,${xp}${yp}`;
    return {
      prompt: t`To sample from the density ${dens} on ${math`[${0}, ${1}]`}, propose ${math`Y`} uniform on ${math`[${0}, ${1}]`} and accept it with probability ${math`f(Y)/M`}, where ${math`M`} is the maximum of ${math`f`}. What is the probability that a proposal is accepted?`,
      answer: { kind: 'exact', expected: str(q(M.den, M.num)) },
      solution: [
        t`${math`f`} is largest where its derivative vanishes, at ${math`x = ${peak}`}, so ${math`M = f(${peak}) = ${M}`}.`,
        t`${math`P(\text{accept}) = \int_{${0}}^{${1}} \frac{f(y)}{M}\,dy = \frac{${1}}{M} = ${q(M.den, M.num)}`}, since ${math`f`} integrates to ${1}. The number of proposals per sample is geometric with mean ${math`M = ${M}`}.`,
      ],
    };
  },
  solve: (p) => {
    // Find M by bisection on f' and integrate f/M by Simpson's rule (exact for these polynomials).
    const f = fOf(p);
    const peak = bisect((x) => f(x + 1e-7) - f(x - 1e-7), 1e-6, 1 - 1e-6, 80);
    const M = f(peak);
    let area = 0;
    const n = 200;
    for (let i = 0; i <= n; i++) area += (i === 0 || i === n ? 1 : i % 2 === 1 ? 4 : 2) * f(i / n);
    area /= 3 * n;
    const exactM = maxOf(p);
    return str(q(Math.round((area / M) * Number(exactM.num)), exactM.num));
  },
  misconceptions: (p): Misconception[] => {
    const M = maxOf(p);
    const c = cOf(p);
    return [
      { response: str(M), why: t`${math`M`} is the expected number of proposals per accepted sample. The chance of accepting one proposal is ${math`${1}/M`}.` },
      { response: str(q(1, c)), why: t`The bound is the maximum of ${math`f`}, ${M}, not its constant ${c}.` },
      { response: str(sub(q(1), q(M.den, M.num))), why: t`That is the chance a proposal is rejected.` },
    ];
  },
  trial: (p, rng) => {
    const y = rng();
    return rng() * toFloat(maxOf(p)) <= fOf(p)(y);
  },
});

// ---------------------------------------------------------------- Cambridge problems

const q9back = auto({
  id: 'ia4-q9-backwards',
  source: cite('ia-prob-sheet-4', 'Q9', true),
  title: t`Sheet ${4} Q${9} backwards: a distance from a uniform`,
  prompt: t`Sheet ${4} Q${9} shows that the distance ${math`R`} of a standard normal point from the origin has ${math`P(R > r) = e^{-r^{${2}}/${2}}`}. To simulate ${math`R`}, set ${math`P(R > r) = u`} for a uniform value ${math`u`} and solve for ${math`r`}. Give ${math`r`} in terms of ${math`u`}.`,
  answer: { kind: 'expression', expected: 'sqrt(-2 ln(u))', variables: ['u'], domains: { u: { kind: 'real', min: 0.01, max: 0.99 } } },
  solution: [
    t`${math`e^{-r^{${2}}/${2}} = u`} gives ${math`r^{${2}} = -${2}\ln u`}, so ${math`r = \sqrt{-${2}\ln u}`}, positive because ${math`${0} < u < ${1}`}.`,
    t`This is the inverse transform with ${math`${1} - U`} in place of ${math`U`}, which is also uniform. With an independent angle ${math`\Theta = ${2}\pi U_{${2}}`}, the point ${math`(R\cos\Theta, R\sin\Theta)`} has the polar density of two independent standard normals: the Box-Muller transform.`,
  ],
  reference: 'sqrt(-2 ln(u))',
  verify: () => {
    // Simulate R = √(-2 ln U) and compare P(R ≤ 1) and P(R ≤ 2) with 1 - e^(-r^2/2).
    const rng = mulberry32(9);
    const N = 20000;
    let [a, b] = [0, 0];
    for (let i = 0; i < N; i++) {
      const R = Math.sqrt(-2 * Math.log(1 - rng()));
      if (R <= 1) a++;
      if (R <= 2) b++;
    }
    const [pa, pb] = [1 - Math.exp(-0.5), 1 - Math.exp(-2)];
    return near('P(R ≤ 1) by simulation', a / N, pa, 4.5 * Math.sqrt((pa * (1 - pa)) / N)) ?? near('P(R ≤ 2) by simulation', b / N, pb, 4.5 * Math.sqrt((pb * (1 - pb)) / N));
  },
  misconceptions: [
    { response: 'sqrt(-ln(u))', why: t`${math`e^{-r^{${2}}/${2}} = u`} gives ${math`r^{${2}} = -${2}\ln u`}: keep the ${2}.` },
    { response: '-2 ln(u)', why: t`That is ${math`r^{${2}}`}. Take the square root.` },
    { response: 'sqrt(2 ln(u))', why: t`${math`\ln u < ${0}`} for ${math`${0} < u < ${1}`}, so the minus sign is what makes ${math`r^{${2}}`} positive.` },
  ],
});

const BETA = { j: 1, k: 1 };
const rejectAuto = auto({
  id: 'schedule-rejection',
  source: cite(SCHED, SIM_AT, true),
  title: t`Rejection sampling from ${math`${6}x(${1} - x)`}`,
  prompt: t`To sample from ${math`f(x) = ${6}x(${1} - x)`} on ${math`[${0}, ${1}]`}, propose ${math`Y`} uniform on ${math`[${0}, ${1}]`} and accept with probability ${math`f(Y)/M`}, with ${math`M`} the smallest constant for which this is a probability. What fraction of proposals is accepted, on average?`,
  answer: { kind: 'exact', expected: '2/3' },
  solution: [
    t`${math`f'(x) = ${6} - ${12}x`} vanishes at ${math`x = \tfrac{${1}}{${2}}`}, so ${math`M = f(\tfrac{${1}}{${2}}) = ${maxOf(BETA)}`}.`,
    t`A proposal is accepted with probability ${math`\int_{${0}}^{${1}} \frac{f(y)}{M}\,dy = \frac{${1}}{M} = ${q(2, 3)}`}.`,
  ],
  reference: '2/3',
  verify: () => {
    const rng = mulberry32(6);
    const N = 20000;
    let acc = 0;
    let below = 0;
    for (let i = 0; i < N; i++) {
      const y = rng();
      if (rng() * 1.5 <= 6 * y * (1 - y)) { acc++; if (y <= 0.5) below++; }
    }
    const p = 2 / 3;
    return (str(maxOf(BETA)) === '3/2' ? null : `M is ${str(maxOf(BETA))}`)
      ?? near('acceptance rate by simulation', acc / N, p, 4.5 * Math.sqrt((p * (1 - p)) / N))
      ?? near('accepted samples below 1/2 (the density is symmetric)', below / acc, 0.5, 4.5 * Math.sqrt(0.25 / acc));
  },
  misconceptions: [
    { response: '3/2', why: t`${q(3, 2)} is ${math`M`}, the mean number of proposals per sample. The acceptance probability is ${math`${1}/M`}.` },
    { response: '1/6', why: t`The bound is the maximum of ${math`f`}, not the constant ${6} in front.` },
  ],
});

const inverseProof = supervision({
  id: 'schedule-inverse-transform',
  source: cite(SCHED, SIM_AT, true),
  title: t`Why the inverse transform works`,
  prompt: t`Let ${math`F`} be a continuous, strictly increasing distribution function and ${mU} uniform on ${math`(${0}, ${1})`}. Prove that ${math`F^{-${1}}(U)`} has distribution function ${math`F`}. Use it to give a way of simulating ${math`\mathrm{Exp}(\lambda)`}, and explain why ${math`-\frac{${1}}{\lambda}\ln U`} works as well as ${math`-\frac{${1}}{\lambda}\ln(${1} - U)`}.`,
  writeUp: 'proof',
});
const bmProof = supervision({
  id: 'schedule-box-muller',
  source: cite(SCHED, SIM_AT, true),
  title: t`The Box-Muller transform`,
  prompt: t`${math`U_{${1}}`} and ${math`U_{${2}}`} are independent and uniform on ${math`(${0}, ${1})`}. Let ${math`R = \sqrt{-${2}\ln U_{${1}}}`} and ${math`\Theta = ${2}\pi U_{${2}}`}. Prove that ${math`X = R\cos\Theta`} and ${math`Y = R\sin\Theta`} are independent ${math`N(${0}, ${1})`} variables, by finding the joint density of ${math`(R, \Theta)`} and changing variables.`,
  writeUp: 'proof',
});
const rejectProof = supervision({
  id: 'schedule-rejection-proof',
  source: cite(SCHED, SIM_AT, true),
  title: t`Why rejection sampling works`,
  prompt: t`A density ${math`f`} on ${math`[${0}, ${1}]`} satisfies ${math`f \le M`}. Repeatedly propose ${math`Y`} uniform on ${math`[${0}, ${1}]`} and an independent ${mU} uniform on ${math`[${0}, ${1}]`}, until ${math`U \le f(Y)/M`}, and output that ${math`Y`}. Prove that the output has density ${math`f`}, and that the number of proposals is geometric with mean ${math`M`}. How does the method change with a proposal density ${math`g`} and ${math`f \le Mg`}?`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- Cambridge problems: gates (batch 7)

/*
 * Outline for marking gs-5-2-21 (20 marks):
 * 1. F is continuous and strictly increasing on the range of X, so it has an inverse there, and for
 *    0 < y < 1, F(X) <= y exactly when X <= F^(-1)(y) (8).
 * 2. So P(Y <= y) = P(X <= F^(-1)(y)) = F(F^(-1)(y)) = y (6).
 * 3. With P(Y <= y) = 0 for y < 0 and 1 for y > 1 (Y takes values in [0, 1]), that is the uniform
 *    distribution function on [0, 1] (4). Says where continuity is used (2).
 */
const gs5221 = supervision({
  id: 'gs-5-2-21',
  source: cite('gs-ch5', 'Section 5.2, Exercise 21 (page 221)'),
  title: t`The distribution function makes a uniform`,
  prompt: t`Let ${math`X`} be a continuous random variable with cumulative distribution function ${math`F`} strictly increasing on the range of ${math`X`}. Let ${math`Y = F(X)`}. Show that ${math`Y`} is uniformly distributed in the interval ${math`[${0}, ${1}]`}. (The formula ${math`X = F^{-${1}}(Y)`} then tells us how to construct ${math`X`} from a uniform random variable ${math`Y`}.)`,
  writeUp: 'proof',
  official: cite('gs-answers-odd', 'Section 5.2, Exercise 21'),
});

/*
 * Outline for marking gs-5-2-3 (20 marks):
 * 1. The exponential distribution function F(y) = 1 - e^(-lambda y) for y >= 0 is continuous and
 *    strictly increasing where 0 < F(y) < 1 (4).
 * 2. Inverts it: u = 1 - e^(-lambda y) gives y = -(1/lambda) ln(1 - u) (6).
 * 3. So -(1/lambda) ln(1 - U) is exponential with parameter lambda, by the inverse transform (4).
 * 4. 1 - U is uniform on [0, 1] when U is, so -(1/lambda) ln U has the same distribution (6).
 */
const gs523 = supervision({
  id: 'gs-5-2-3',
  source: cite('gs-ch5', 'Section 5.2, Exercise 3 (page 219)', true),
  title: t`Exponential samples from uniform ones`,
  prompt: t`Grinstead and Snell's Corollary ${5.2} is the inverse transform: if ${math`F`} is a distribution function that is strictly increasing when ${math`${0} < F(y) < ${1}`}, and ${math`U`} is uniform on ${math`[${0}, ${1}]`}, then ${math`F^{-${1}}(U)`} has distribution function ${math`F`}. Use it to derive that ${math`Y = -\frac{${1}}{\lambda} \ln U`} is exponentially distributed with parameter ${math`\lambda`}, that is, ${math`P(Y \le y) = ${1} - e^{-\lambda y}`} for ${math`y \ge ${0}`}. (Hint: ${math`${1} - U`} and ${math`U`} are identically distributed.)`,
  writeUp: 'proof',
});

const gs527 = auto({
  id: 'gs-5-2-7',
  source: cite('gs-ch5', 'Section 5.2, Exercise 7 (page 220)', true),
  title: t`Sampling with distribution function x squared`,
  prompt: t`Explain how you can generate a random variable ${math`X`} whose cumulative distribution function is ${math`F(x) = ${0}`} for ${math`x < ${0}`}, ${math`F(x) = x^{${2}}`} for ${math`${0} \le x \le ${1}`}, and ${math`F(x) = ${1}`} for ${math`x > ${1}`}: give ${math`X`} as the inverse transform ${math`F^{-${1}}(U)`} of a uniform random number ${math`U`} on ${math`[${0}, ${1}]`}, as a formula in ${math`U`}.`,
  answer: { kind: 'expression', expected: 'sqrt(U)', variables: ['U'], domains: { U: { kind: 'real', min: 0.001, max: 1 } } },
  solution: [
    t`On ${math`[${0}, ${1}]`}, ${math`F`} is continuous and strictly increasing, and ${math`u = x^{${2}}`} with ${math`x \ge ${0}`} inverts to ${math`x = \sqrt{u}`}.`,
    t`So ${math`X = \sqrt{U}`}. Check: ${math`P(\sqrt{U} \le x) = P(U \le x^{${2}}) = x^{${2}}`} for ${math`${0} \le x \le ${1}`}.`,
  ],
  reference: 'sqrt(U)',
  verify: () => {
    // P(sqrt(U) <= x) = x^2, checked by simulation at three points.
    const rng = mulberry32(527);
    const xs = Array.from({ length: 200_000 }, () => Math.sqrt(rng()));
    for (const x of [0.3, 0.5, 0.8]) {
      const freq = xs.filter((v) => v <= x).length / xs.length;
      if (Math.abs(freq - x * x) > 0.005) return `P(sqrt(U) <= ${x}) is about ${freq}, not ${x * x}`;
    }
    return null;
  },
  misconceptions: [{ response: 'U^2', why: t`That applies ${math`F`} to ${math`U`}. The inverse transform applies ${math`F^{-${1}}`}: solve ${math`u = x^{${2}}`} for ${math`x`}.` }],
  official: { source: cite('gs-answers-odd', 'Section 5.2, Exercise 7'), answer: 'sqrt(U)', agrees: true },
});

// ---------------------------------------------------------------- lesson

const claims: ProbabilityClaim[] = [
  { what: 'rejection sampling from 2x with a uniform proposal accepts a proposal', exact: q(1, 2), trial: (rng) => { const y = rng(); return rng() * 2 <= 2 * y; } },
  {
    what: 'Box-Muller: both samples positive',
    exact: q(1, 4),
    trial: (rng) => { const R = Math.sqrt(-2 * Math.log(1 - rng())); const th = 2 * Math.PI * rng(); return R * Math.cos(th) > 0 && R * Math.sin(th) > 0; },
  },
  { what: 'inverse transform for F(x) = x³ on [0, 1]: P(X ≤ 1/2)', exact: q(1, 8), trial: (rng) => rng() ** (1 / 3) <= 0.5 },
];
const mF = math`F`;
const BM_CHECK: BmP = { u1: 0.25, u2: 0.1, which: 'x' };

export const simulation: TopicContent = {
  topicId: 'rv.simulation',
  goal: t`Generate samples of a continuous random variable from uniform ones: by inverting the distribution function, by the Box-Muller transform, and by rejection sampling.`,
  objective: t`Turn uniform random numbers into samples from any continuous distribution, three ways.`,
  why: t`Every simulation, Monte Carlo check and randomised algorithm starts from uniforms; these are the standard recipes.`,
  minutes: 35,
  lesson: [
    { kind: 'section', title: t`Only uniforms to work with` },
    { kind: 'hook', text: t`A computer's random number generator gives you one thing: numbers ${mU} spread evenly over ${math`(${0}, ${1})`}, independent of each other. Yet simulations need waiting times, heights, errors: exponential, normal, and stranger shapes. How do you bend a uniform number into one with the distribution you want?` },
    { kind: 'narrative', text: t`There are three classic answers in the Cambridge schedule. Each is a small theorem about distributions, and each has a picture: squash the number line with a function, rotate a point in the plane, or throw darts and keep only those under a curve.` },
    { kind: 'section', title: t`Inverting the distribution function` },
    { kind: 'narrative', text: t`Here is the idea. A distribution function ${mF} climbs from ${0} to ${1}. Pick a height ${mU} uniformly, and read off where ${mF} reaches that height. Where ${mF} climbs steeply, many heights land in a short stretch of ${mX}, so ${mX} lands there often: exactly where the density is large.` },
    {
      kind: 'theorem',
      name: t`Inverse transform`,
      statement: t`Let ${mF} be a continuous, strictly increasing distribution function and ${mU} uniform on ${math`(${0}, ${1})`}. Then ${math`X = F^{-${1}}(U)`} has distribution function ${mF}.`,
    },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Unwrap the inverse`, text: t`For any ${math`x`}, since ${mF} is strictly increasing, ${math`F^{-${1}}(U) \le x`} exactly when ${math`U \le F(x)`}.`, why: { q: t`Why does increasing matter?`, a: t`An increasing function keeps order: applying ${mF} to both sides of ${math`F^{-${1}}(U) \le x`} gives ${math`U \le F(x)`}, and applying ${math`F^{-${1}}`} undoes it. A decreasing function would flip the inequality.` } },
        { label: t`Use the uniform`, text: t`For ${math`${0} \le c \le ${1}`}, ${math`P(U \le c) = c`}. With ${math`c = F(x)`}:`, eq: [dmath`P(X \le x) = P(U \le F(x)) = F(x).`] },
        { label: t`Conclude`, text: t`So ${mX} has distribution function ${mF}.` },
      ],
    },
    { kind: 'p', text: t`This is [[inverse-transform-sampling|inverse transform sampling]]. For ${math`\mathrm{Exp}(\lambda)`}, solving ${math`${1} - e^{-\lambda x} = u`} gives ${math`x = -\frac{${1}}{\lambda}\ln(${1} - u)`}; since ${math`${1} - U`} is uniform too, ${math`-\frac{${1}}{\lambda}\ln U`} works as well. For ${math`F(x) = x^{${3}}`} on ${math`[${0}, ${1}]`}, ${math`X = U^{${1}/${3}}`}, and ${math`P(X \le \tfrac{${1}}{${2}}) = P(U \le \tfrac{${1}}{${8}}) = ${q(1, 8)}`}.` },
    checkFrom(inversePower, { n: 2, m: 3, r: q(2, 3) }, t`Solve ${math`\left(\frac{x}{${3}}\right)^{${2}} = ${q(4, 9)}`}: ${math`\frac{x}{${3}} = ${q(2, 3)}`}, so ${math`x = ${2}`}.`),
    { kind: 'pitfall', claim: t`To sample from ${mF}, compute ${math`F(U)`}.`, counterexample: t`For ${math`F(x) = x^{${3}}`}, ${math`F(U) = U^{${3}}`} gives ${math`P(U^{${3}} \le \tfrac{${1}}{${2}}) = \left(\tfrac{${1}}{${2}}\right)^{${1}/${3}}`}, about ${round(0.5 ** (1 / 3), 3)}, not ${math`F(\tfrac{${1}}{${2}}) = ${q(1, 8)}`}. The method applies the inverse.` },
    { kind: 'section', title: t`Box and Muller: normals from a rotation` },
    { kind: 'narrative', text: t`The normal distribution function has no formula to invert. Box and Muller found a way round it: generate two normals at once. Scatter two independent standard normals as a point in the plane. The cloud is perfectly round, so the angle of the point is uniform, and its distance from the origin turns out to have a simple law.` },
    {
      kind: 'theorem',
      name: t`Box-Muller transform`,
      statement: t`Let ${math`U_{${1}}, U_{${2}}`} be independent and uniform on ${math`(${0}, ${1})`}, and put ${math`R = \sqrt{-${2}\ln U_{${1}}}`}, ${math`\Theta = ${2}\pi U_{${2}}`}. Then ${math`X = R\cos\Theta`} and ${math`Y = R\sin\Theta`} are independent ${math`N(${0}, ${1})`}.`,
    },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Normals in polar form`, text: t`Independent standard normals have joint density ${math`\frac{${1}}{${2}\pi}e^{-(x^{${2}} + y^{${2}})/${2}}`}. In polar coordinates ${math`x = r\cos\theta`}, ${math`y = r\sin\theta`}, with Jacobian ${math`r`}, the density of ${math`(R, \Theta)`} is`, eq: [dmath`\frac{${1}}{${2}\pi} \cdot r e^{-r^{${2}}/${2}}, \quad r > ${0},\ ${0} \le \theta < ${2}\pi.`] },
        { label: t`Read off the parts`, text: t`It factorises: ${math`\Theta`} is uniform on ${math`[${0}, ${2}\pi)`}, independent of ${math`R`}, and ${math`R`} has density ${math`re^{-r^{${2}}/${2}}`}, so ${math`P(R > r) = e^{-r^{${2}}/${2}}`}.`, why: { q: t`How does the density give that tail?`, a: t`${math`\int_{r}^{\infty} se^{-s^{${2}}/${2}}\,ds = \big[-e^{-s^{${2}}/${2}}\big]_{r}^{\infty} = e^{-r^{${2}}/${2}}`}.` } },
        { label: t`Check the recipe`, text: t`${math`P(\sqrt{-${2}\ln U_{${1}}} > r) = P(U_{${1}} < e^{-r^{${2}}/${2}}) = e^{-r^{${2}}/${2}}`}, and ${math`${2}\pi U_{${2}}`} is uniform on ${math`[${0}, ${2}\pi)`}, independent of it.` },
        { label: t`Conclude`, text: t`So the recipe's ${math`(R, \Theta)`} has the same joint law as the polar form of two independent normals, and so ${math`(X, Y)`} has their joint law.` },
      ],
    },
    { kind: 'p', text: t`This is the [[box-muller|Box-Muller transform]], and it is IA Probability Sheet ${4}, question ${9}, run backwards. By the symmetry of the angle, both samples are positive with probability ${q(1, 4)}: the angle must fall in the first quarter turn.` },
    checkFrom(boxMuller, BM_CHECK, t`${math`R = \sqrt{-${2}\ln ${0.25}} \approx ${r4(Math.sqrt(-2 * Math.log(0.25)))}`} and ${math`\Theta = ${2}\pi \times ${0.1}`}, so ${math`X = R\cos\Theta \approx ${r4(bm(BM_CHECK))}`}.`),
    { kind: 'section', title: t`Rejection: darts under a curve` },
    { kind: 'narrative', text: t`The third method works for any bounded density on ${math`[${0}, ${1}]`}, with no inverse at all. Draw the graph of ${math`f`} inside a box of height ${math`M`}. Throw darts uniformly at the box, and keep only those that land under the curve. The ${math`x`} positions of the kept darts pile up exactly where ${math`f`} is tall.` },
    {
      kind: 'theorem',
      name: t`Rejection sampling`,
      statement: t`Let ${math`f`} be a density on ${math`[${0}, ${1}]`} with ${math`f \le M`}. Propose ${math`Y`} uniform on ${math`[${0}, ${1}]`} and an independent ${mU} uniform on ${math`[${0}, ${1}]`}; accept ${math`Y`} if ${math`U \le f(Y)/M`}, otherwise repeat. Then an accepted value has density ${math`f`}, and each proposal is accepted with probability ${math`${1}/M`}.`,
    },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Accept and land low`, text: t`Given ${math`Y = y`}, acceptance has probability ${math`f(y)/M`}. Integrating over ${math`y \le x`}:`, eq: [dmath`P(Y \le x,\ \text{accept}) = \int_{${0}}^{x} \frac{f(y)}{M}\,dy = \frac{F(x)}{M}.`] },
        { label: t`Accept at all`, text: t`Put ${math`x = ${1}`}: ${math`P(\text{accept}) = \frac{${1}}{M}`}, because ${math`f`} integrates to ${1}.` },
        { label: t`Condition`, text: t`So ${math`P(Y \le x \mid \text{accept}) = \frac{F(x)/M}{${1}/M} = F(x)`}: an accepted ${math`Y`} has density ${math`f`}.`, plain: t`Rounds are independent and alike, so the first accepted value has this law too, and the number of rounds is geometric with mean ${math`M`}.` },
      ],
    },
    { kind: 'p', text: t`This is [[rejection-sampling|rejection sampling]]. For ${math`f(x) = ${2}x`}, the maximum is ${math`M = ${2}`}, so half the proposals are kept. The tighter the box, the less is wasted, which is why ${math`M`} should be the maximum of ${math`f`}. With a proposal density ${math`g`} and ${math`f \le Mg`}, accept with probability ${math`f(Y)/(Mg(Y))`}.` },
    checkFrom(rejection, { j: 1, k: 2 }, t`${math`f(x) = ${12}x(${1} - x)^{${2}}`} peaks at ${math`x = ${q(1, 3)}`}, where it is ${q(16, 9)}; so a proposal is accepted with probability ${q(9, 16)}.`),
    { kind: 'pitfall', claim: t`For ${math`f(x) = ${12}x(${1} - x)^{${2}}`}, use the constant in front, ${math`M = ${12}`}.`, counterexample: t`That box is far too tall: only ${q(1, 12)} of the proposals would be kept. The smallest valid bound is the maximum of ${math`f`}, ${q(16, 9)}, which keeps ${q(9, 16)}.` },
    { kind: 'takeaway', text: t`Invert ${mF} when you can; for normals, rotate a Box-Muller point; otherwise throw darts under the density and keep the ones that land below it.` },
  ],
  examples: [
    workedCambridge(q9back),
    worked(rejection, { j: 2, k: 1 }, t`Rejection sampling from ${math`${12}x^{${2}}(${1} - x)`}`),
    worked(inversePower, { n: 2, m: 4, r: q(3, 4) }, t`Inverting a distribution function`),
  ],
  generators: [inversePower, boxMuller, rejection],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['inverse-transform-sampling', 'box-muller', 'rejection-sampling'],
  claims,
  cambridge: [rejectAuto, inverseProof, bmProof, rejectProof, gs5221, gs523, gs527],
  // The IA example sheets set no simulation problem, and the schedule is not a gate document, so the
  // gate is Grinstead and Snell's: the converse of the inverse transform, the exponential sampler,
  // and the sampler for F(x) = x^2.
  gate: ['gs-5-2-21', 'gs-5-2-3', 'gs-5-2-7'],
  recall: [
    { front: t`State the inverse transform method.`, back: t`If ${mF} is continuous and strictly increasing and ${mU} is uniform, ${math`F^{-${1}}(U)`} has distribution function ${mF}.` },
    { front: t`State the Box-Muller transform.`, back: t`${math`R = \sqrt{-${2}\ln U_{${1}}}`}, ${math`\Theta = ${2}\pi U_{${2}}`}; then ${math`R\cos\Theta`} and ${math`R\sin\Theta`} are independent ${math`N(${0}, ${1})`}.` },
    { front: t`In rejection sampling with bound ${math`M`}, what is the acceptance probability?`, back: t`${math`${1}/M`}; the number of proposals per sample is geometric with mean ${math`M`}.` },
  ],
  proofOrder: [
    {
      title: t`Why the inverse transform works`,
      steps: [
        t`${math`F^{-${1}}(U) \le x`} exactly when ${math`U \le F(x)`}, as ${mF} is increasing.`,
        t`${mU} is uniform, so ${math`P(U \le F(x)) = F(x)`}.`,
        t`So ${math`P(F^{-${1}}(U) \le x) = F(x)`}.`,
      ],
    },
  ],
};
