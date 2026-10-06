/**
 * rv.simulation: generating continuous random variables from uniform ones, by inverting the
 * distribution function, by the Box-Muller transform, and by rejection sampling. From the
 * Faculty schedule ("Simulation: generating continuous random variables, Box-Muller
 * transform, rejection sampling."); the example sheets set no simulation problem (batch 2,
 * question 5), so the Cambridge problems are the schedule's own results, set for
 * supervision, and Sheet 4 Q9 run backwards. Every sampler is checked by simulation.
 */
import { mulberry32 } from '@learnhub/mastery';
import { auto, cite, supervision } from '../cambridge';
import { int, mul, pick, q, str, sub, toFloat, type Rational } from '../math';
import { bisect, near, powQ, round, rootTex } from '../partv-b';
import { generator, type Misconception } from '../problem';
import { math, t } from '../rich';
import { worked, workedCambridge, type ProbabilityClaim, type TopicContent } from '../topic';

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

// ---------------------------------------------------------------- lesson

const claims: ProbabilityClaim[] = [
  { what: 'rejection sampling from 6x(1 - x) with a uniform proposal accepts a proposal', exact: q(2, 3), trial: (rng) => { const y = rng(); return rng() * 1.5 <= 6 * y * (1 - y); } },
  {
    what: 'Box-Muller: both samples positive',
    exact: q(1, 4),
    trial: (rng) => { const R = Math.sqrt(-2 * Math.log(1 - rng())); const th = 2 * Math.PI * rng(); return R * Math.cos(th) > 0 && R * Math.sin(th) > 0; },
  },
  { what: 'inverse transform for F(x) = x³ on [0, 1]: P(X ≤ 1/2)', exact: q(1, 8), trial: (rng) => rng() ** (1 / 3) <= 0.5 },
];

export const simulation: TopicContent = {
  topicId: 'rv.simulation',
  goal: t`Generate samples of a continuous random variable from uniform ones: by inverting the distribution function, by the Box-Muller transform, and by rejection sampling.`,
  lesson: [
    { kind: 'p', text: t`A computer supplies (pseudo)random numbers ${mU} uniform on ${math`(${0}, ${1})`}, independent of each other. Every other distribution is built from them, and each method below is a theorem about distributions, proved with the tools of this chapter.` },
    { kind: 'rule', text: t`[[inverse-transform-sampling|Inverse transform]]: if ${math`F`} is continuous and strictly increasing, then ${math`X = F^{-${1}}(U)`} has distribution function ${math`F`}, because ${math`P(F^{-${1}}(U) \le x) = P(U \le F(x)) = F(x)`}.` },
    { kind: 'p', text: t`For ${math`\mathrm{Exp}(\lambda)`}, ${math`F(x) = ${1} - e^{-\lambda x}`} inverts to ${math`x = -\frac{${1}}{\lambda}\ln(${1} - u)`}; since ${math`${1} - U`} is uniform too, ${math`-\frac{${1}}{\lambda}\ln U`} also works. For ${math`F(x) = x^{${3}}`} on ${math`[${0}, ${1}]`}, ${math`X = U^{${1}/${3}}`}, and ${math`P(X \le \tfrac{${1}}{${2}}) = P(U \le \tfrac{${1}}{${8}}) = ${q(1, 8)}`}. The method needs ${math`F^{-${1}}`} in a usable form, which the normal distribution lacks.` },
    { kind: 'rule', text: t`The [[box-muller|Box-Muller transform]]: for independent uniforms ${math`U_{${1}}, U_{${2}}`}, put ${math`R = \sqrt{-${2}\ln U_{${1}}}`} and ${math`\Theta = ${2}\pi U_{${2}}`}. Then ${math`X = R\cos\Theta`} and ${math`Y = R\sin\Theta`} are independent ${math`N(${0}, ${1})`}.` },
    { kind: 'p', text: t`It is Sheet ${4} Q${9} run backwards. Two independent standard normals, in polar coordinates, have a uniform angle and an independent distance with ${math`P(R > r) = e^{-r^{${2}}/${2}}`}; inverting that gives ${math`R = \sqrt{-${2}\ln U_{${1}}}`}. By the symmetry of the angle, both samples are positive with probability ${q(1, 4)}.` },
    { kind: 'rule', text: t`[[rejection-sampling|Rejection sampling]]: if ${math`f \le M`} on ${math`[${0}, ${1}]`}, propose ${math`Y`} uniform and accept it with probability ${math`f(Y)/M`}, otherwise try again. Accepted values have density ${math`f`}; each proposal is accepted with probability ${math`${1}/M`}, so a sample costs ${math`M`} proposals on average.` },
    { kind: 'p', text: t`For ${math`f(x) = ${6}x(${1} - x)`}, the maximum is ${math`f(\tfrac{${1}}{${2}}) = ${q(3, 2)}`}, so ${q(2, 3)} of the proposals are kept. The tighter the bound, the less is wasted; with a proposal density ${math`g`} and ${math`f \le Mg`}, accept with probability ${math`f(Y)/(Mg(Y))`}.` },
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
  cambridge: [rejectAuto, inverseProof, bmProof, rejectProof],
  gate: [],
};
