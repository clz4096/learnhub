/**
 * rv.joint-densities: a joint density f(x, y) gives P((X, Y) ∈ A) as a double integral;
 * the marginals integrate out the other variable; X and Y are independent exactly when the
 * joint density factorises as f_X(x) f_Y(y). From the Faculty schedule ("Joint
 * distributions") and IA Probability Example Sheet 4 Q1 (Alice and Bob meet: an area in a
 * square) and Q4 (P(X > Y) for independent exponential variables). Sheet 4 has no official
 * solutions; the answers are checked by exact integration and by simulation.
 */
import { mulberry32 } from '@learnhub/mastery';
import { auto, cite, supervision } from '../cambridge';
import { add, int, mul, pick, q, str, sub, toFloat, type Rational } from '../math';
import { expSample, integrateToInfinity, near, powQ, pw } from '../partv-b';
import { generator, type Misconception } from '../problem';
import { dmath, math, t } from '../rich';
import { checkFrom, worked, workedCambridge, type ProbabilityClaim, type TopicContent } from '../topic';

const [mX, mY] = [math`X`, math`Y`];
const SH4 = 'ia-prob-sheet-4' as const;

// ---------------------------------------------------------------- a normalising constant in two variables

interface ConstP { i: number; j: number; a: number; b: number }
const constOf = ({ i, j, a, b }: ConstP): Rational => q((i + 1) * (j + 1), a ** (i + 1) * b ** (j + 1));

const jointConstant = generator<ConstP>({
  id: 'joint-constant',
  skill: 'Find the constant of a joint density c x^i y^j on a rectangle: the double integral is 1, and it splits into two single integrals.',
  params: (rng) => {
    for (;;) {
      const p = { i: int(rng, 0, 3), j: int(rng, 0, 3), a: int(rng, 1, 2), b: int(rng, 1, 3) };
      if (p.i + p.j > 0 && (p.a > 1 || p.b > 1 || p.i * p.j > 0)) return p;
    }
  },
  sane: (p) => (p.i + p.j > 0 && p.a >= 1 && p.b >= 1 ? null : 'out of range'),
  problem: (p) => {
    const c = constOf(p);
    const body = p.i === 0 ? math`c\,${pw('y', p.j)}` : p.j === 0 ? math`c\,${pw('x', p.i)}` : math`c\,${pw('x', p.i)}${pw('y', p.j)}`;
    const ix = q(p.a ** (p.i + 1), p.i + 1);
    const iy = q(p.b ** (p.j + 1), p.j + 1);
    return {
      prompt: t`${mX} and ${mY} have joint density ${math`f(x, y) = ${body}`} for ${math`${0} \le x \le ${p.a}`} and ${math`${0} \le y \le ${p.b}`}, and ${0} otherwise. Find ${math`c`}.`,
      answer: { kind: 'exact', expected: str(c) },
      solution: [
        t`The double integral over the rectangle is ${1}, and it splits: ${math`c \int_{${0}}^{${p.a}} ${pw('x', p.i)}\,dx \int_{${0}}^{${p.b}} ${pw('y', p.j)}\,dy = c \times ${ix} \times ${iy}`}.`,
        t`So ${math`c = ${c}`}.`,
      ],
    };
  },
  solve: (p) => {
    // A midpoint double sum on a fine grid, as a fraction over the known denominator.
    const N = 120;
    let s = 0;
    for (let u = 0; u < N; u++) for (let v = 0; v < N; v++) s += ((u + 0.5) * p.a / N) ** p.i * ((v + 0.5) * p.b / N) ** p.j;
    const area = (s * p.a * p.b) / (N * N);
    const den = p.a ** (p.i + 1) * p.b ** (p.j + 1);
    return str(q(Math.round(den / area), den));
  },
  misconceptions: (p): Misconception[] => {
    const c = constOf(p);
    return [
      { response: str(q(c.den, c.num)), why: t`That is the value of the double integral without ${math`c`}. ${math`c`} is its reciprocal, so that the total is ${1}.` },
      { response: str(q((p.i + 1) * (p.j + 1))), why: t`Integrate up to ${p.a} and ${p.b}, not up to ${1}: the limits bring ${math`${p.a}^{${p.i + 1}}`} and ${math`${p.b}^{${p.j + 1}}`}.` },
      { response: str(q(1, p.a ** (p.i + 1) * p.b ** (p.j + 1))), why: t`Integrating ${math`${pw('x', p.i)}`} divides by ${p.i + 1}, and integrating ${math`${pw('y', p.j)}`} by ${p.j + 1}: those factors stay in ${math`c`}.` },
      { response: str(q(p.i + p.j + 2, p.a ** (p.i + 1) * p.b ** (p.j + 1))), why: t`The double integral is a product of the two single integrals, so their factors multiply: ${math`(${p.i + 1})(${p.j + 1})`}, not ${math`${p.i + 1} + ${p.j + 1}`}.` },
    ];
  },
});

// ---------------------------------------------------------------- a rectangle under f(x, y) = x + y

interface RectP { a: Rational; b: Rational }
const FRACS: readonly Rational[] = [q(1, 4), q(1, 3), q(1, 2), q(2, 3), q(3, 4), q(1)];
const rectProb = ({ a, b }: RectP): Rational => mul(mul(a, b), mul(add(a, b), q(1, 2)));
const marginalCdf = (a: Rational): Rational => mul(add(mul(a, a), a), q(1, 2));
/** One draw from the density x + y on the unit square, by rejection from the uniform. */
function drawXplusY(rng: () => number): [number, number] {
  for (;;) {
    const [x, y] = [rng(), rng()];
    if (2 * rng() <= x + y) return [x, y];
  }
}

const rectangleProbability = generator<RectP>({
  id: 'rectangle-probability',
  skill: 'Integrate a joint density over a rectangle, and see that the answer is not the product of the marginal probabilities when the density does not factorise.',
  params: (rng) => {
    for (;;) {
      const p = { a: pick(rng, FRACS), b: pick(rng, FRACS) };
      if (toFloat(p.a) < 1 || toFloat(p.b) < 1) return p;
    }
  },
  sane: (p) => (toFloat(p.a) > 0 && toFloat(p.b) > 0 && (toFloat(p.a) < 1 || toFloat(p.b) < 1) ? null : 'out of range'),
  problem: (p) => {
    const v = rectProb(p);
    return {
      prompt: t`${mX} and ${mY} have joint density ${math`f(x, y) = x + y`} on ${math`${0} \le x, y \le ${1}`}. Find ${math`P(X \le ${p.a},\ Y \le ${p.b})`}.`,
      answer: { kind: 'exact', expected: str(v) },
      solution: [
        t`${math`\int_{${0}}^{${p.a}}\int_{${0}}^{${p.b}} (x + y)\,dy\,dx = \int_{${0}}^{${p.a}} \left(${p.b}\,x + \frac{${mul(p.b, p.b)}}{${2}}\right) dx = \frac{${mul(p.a, p.a)} \times ${p.b}}{${2}} + \frac{${p.a} \times ${mul(p.b, p.b)}}{${2}}`}.`,
        t`That is ${math`\frac{ab(a + b)}{${2}}`} with ${math`a = ${p.a}`}, ${math`b = ${p.b}`}: ${math`${v}`}.`,
      ],
    };
  },
  solve: (p) => {
    // A midpoint double sum, exact for this linear density on a grid that has the cut-offs as cell edges.
    const n = Number(p.a.den * p.b.den) * 4;
    const [a, b] = [toFloat(p.a), toFloat(p.b)];
    let s = 0;
    for (let u = 0; u < n; u++) for (let v = 0; v < n; v++) {
      const [x, y] = [(u + 0.5) / n, (v + 0.5) / n];
      if (x < a && y < b) s += x + y;
    }
    const D = 2 * Number(p.a.den * p.b.den) ** 2;
    return str(q(Math.round((s / (n * n)) * D), D));
  },
  misconceptions: (p): Misconception[] => [
    { response: str(mul(marginalCdf(p.a), marginalCdf(p.b))), why: t`Multiplying ${math`P(X \le ${p.a})`} by ${math`P(Y \le ${p.b})`} assumes independence, but ${math`x + y`} does not factorise. Integrate the joint density over the rectangle.` },
    { response: str(mul(p.a, p.b)), why: t`That is the area of the rectangle: right for the uniform density, not for ${math`x + y`}.` },
    { response: str(mul(mul(p.a, p.b), add(p.a, p.b))), why: t`Integrating ${math`x`} gives ${math`x^{${2}}/${2}`}: there is a factor ${q(1, 2)} in each term.` },
  ],
  trial: (p, rng) => {
    const [x, y] = drawXplusY(rng);
    return x <= toFloat(p.a) && y <= toFloat(p.b);
  },
});

// ---------------------------------------------------------------- an exponential race

interface RaceP { l: number; m: number; c: Rational }
const CS: readonly Rational[] = [q(1), q(1), q(2), q(1, 2), q(3)];
const raceProb = ({ l, m, c }: RaceP): Rational => q(BigInt(m) * c.den, BigInt(m) * c.den + BigInt(l) * c.num);

const exponentialRace = generator<RaceP>({
  id: 'exponential-race',
  skill: 'Find P(X > cY) for independent exponential variables by integrating the joint density over the region.',
  params: (rng) => {
    for (;;) {
      const p = { l: int(rng, 1, 4), m: int(rng, 1, 4), c: pick(rng, CS) };
      if (str(raceProb(p)) !== '1/2') return p;
    }
  },
  sane: (p) => (p.l > 0 && p.m > 0 && str(raceProb(p)) !== '1/2' ? null : 'out of range'),
  problem: (p) => {
    const v = raceProb(p);
    const one = toFloat(p.c) === 1;
    const event = one ? math`P(X > Y)` : math`P(X > ${p.c}\,Y)`;
    const lc = mul(q(p.l), p.c);
    /** rate e^(-rate v), written e^(-v) for rate 1. */
    const ex = (rate: Rational, v: string, lead: boolean) => (toFloat(rate) === 1 ? math`e^{-${v}}` : lead ? math`${rate}e^{-${rate}${v}}` : math`e^{-${rate}${v}}`);
    return {
      prompt: t`${mX} and ${mY} are independent, with ${math`X \sim \mathrm{Exp}(${p.l})`} and ${math`Y \sim \mathrm{Exp}(${p.m})`}. Find ${event}.`,
      answer: { kind: 'exact', expected: str(v) },
      solution: [
        t`By independence the joint density is ${math`${ex(q(p.l), 'x', true)} \cdot ${ex(q(p.m), 'y', true)}`} on ${math`x, y \ge ${0}`}. Integrate over the region, ${mX} first: for fixed ${math`y`}, ${math`P(X > ${one ? 'y' : math`${p.c}y`}) = ${ex(lc, 'y', false)}`}.`,
        t`Then ${math`\int_{${0}}^{\infty} ${ex(lc, 'y', false)} \cdot ${ex(q(p.m), 'y', true)}\,dy = \frac{${p.m}}{${p.m} + ${lc}} = ${v}`}.`,
      ],
    };
  },
  solve: (p) => {
    const l = p.l;
    const c = toFloat(p.c);
    const v = integrateToInfinity((y) => Math.exp(-l * c * y) * p.m * Math.exp(-p.m * y), 0, 4000, 1 / p.m);
    const den = Number(raceProb(p).den);
    return str(q(Math.round(v * den), den));
  },
  misconceptions: (p): Misconception[] => [
    { response: str(sub(q(1), raceProb(p))), why: t`That is the chance that ${mX} comes first. A larger rate means a shorter wait, so ${math`P(X > Y)`} uses ${mY}'s rate on top.` },
    { response: str(q(1, 2)), why: t`The two waits are not alike unless the rates are equal, and the event compares ${mX} with ${toFloat(p.c) === 1 ? t`${mY}` : t`a multiple of ${mY}`}. Integrate the joint density over the region.` },
    { response: str(q(BigInt(p.m) * p.c.num, BigInt(p.m) * p.c.num + BigInt(p.l) * p.c.den)), why: t`The factor ${p.c} multiplies ${mY}, so in the integral it scales ${mX}'s rate: ${math`P(X > ${p.c}y) = e^{-${p.l} \times ${p.c}y}`}.` },
    { response: str(q(p.m, p.m + p.l)), why: t`That is ${math`P(X > Y)`}. Here ${mX} must exceed ${math`${p.c}\,Y`}, so the rate of ${mX} is scaled by ${p.c} in the integral.` },
  ],
  trial: (p, rng) => expSample(rng, p.l) > toFloat(p.c) * expSample(rng, p.m),
});

// ---------------------------------------------------------------- Cambridge problems

/** The area of {|x - y| ≤ w} in [0, T]^2 over T^2, exactly: the integrand is piecewise linear, so the trapezium rule on its kinks is exact. */
function meetExact(T: number, w: number): Rational {
  const len = (x: number): Rational => sub(q(Math.min(x + w, T)), q(Math.max(x - w, 0)));
  const knots = [...new Set([0, w, T - w, T].filter((x) => x >= 0 && x <= T))].sort((a, b) => a - b);
  let s = q(0);
  for (let i = 0; i + 1 < knots.length; i++) {
    const [a, b] = [knots[i] as number, knots[i + 1] as number];
    s = add(s, mul(q(b - a, 2), add(len(a), len(b))));
  }
  return mul(s, q(1, T * T));
}
function meetSim(T: number, w: number, n: number): number {
  const rng = mulberry32(1100);
  let hits = 0;
  for (let i = 0; i < n; i++) if (Math.abs(rng() - rng()) * T <= w) hits++;
  return hits / n;
}

const q1 = auto({
  id: 'ia4-q1',
  source: cite(SH4, 'Q1'),
  title: t`Alice and Bob meet in the Copper Kettle`,
  prompt: t`Alice and Bob arrive at times independent and uniform between ${12} noon and ${1} pm. Each waits ${10} minutes for the other, then leaves. Find the probability that they meet.`,
  answer: { kind: 'exact', expected: str(meetExact(60, 10)) },
  solution: [
    t`Measure the arrivals ${mX} and ${mY} in minutes after noon. By independence the joint density is ${math`\frac{${1}}{${60}} \cdot \frac{${1}}{${60}}`} on the square ${math`[${0}, ${60}]^{${2}}`}, so a probability is an area divided by ${3600}.`,
    t`They meet when ${math`|X - Y| \le ${10}`}, a band along the diagonal. Its complement is two triangles with legs ${50}, of total area ${math`${2} \times \tfrac{${1}}{${2}} \times ${50}^{${2}} = ${2500}`}.`,
    t`So ${math`P(\text{meet}) = ${1} - \frac{${2500}}{${3600}} = ${meetExact(60, 10)}`}.`,
  ],
  reference: '11/36',
  verify: () => {
    const exact = meetExact(60, 10);
    const p = toFloat(exact);
    const n = 20000;
    return (str(exact) === str(sub(q(1), powQ(q(5, 6), 2))) ? null : `the band's area ${str(exact)} is not 1 - (5/6)^2`)
      ?? near('the meeting probability by simulation', meetSim(60, 10, n), p, 4.5 * Math.sqrt((p * (1 - p)) / n));
  },
  misconceptions: [
    { response: '1/6', why: t`${math`${10}/${60}`} is the waiting time as a share of the hour. Both arrival times vary: find the area of the band ${math`|X - Y| \le ${10}`} in the square.` },
    { response: '1/3', why: t`The band ${math`|X - Y| \le ${10}`} is ${20} minutes wide in the middle but narrower near the corners of the square. Subtract the two corner triangles.` },
    { response: '25/36', why: t`${q(25, 36)} is the area of the two triangles where they miss each other. They meet in the rest.` },
  ],
});

const q4race = auto({
  id: 'ia4-q4-race',
  source: cite(SH4, 'Q4'),
  title: t`The probability that ${mX} exceeds ${mY}`,
  prompt: t`${mX} and ${mY} are independent and exponentially distributed with parameters ${math`\lambda`} and ${math`\mu`}. Find the probability that ${mX} exceeds ${mY}. (Type ${math`\lambda`} as lambda and ${math`\mu`} as mu.)`,
  answer: { kind: 'expression', expected: 'mu/(lambda + mu)', variables: ['lambda', 'mu'], domains: { lambda: { kind: 'real', min: 0.1, max: 5 }, mu: { kind: 'real', min: 0.1, max: 5 } } },
  solution: [
    t`The joint density is ${math`\lambda e^{-\lambda x}\,\mu e^{-\mu y}`} on ${math`x, y \ge ${0}`}. Integrate over ${math`\{x > y\}`}, ${mX} first: ${math`P(X > Y) = \int_{${0}}^{\infty} \mu e^{-\mu y} \int_{y}^{\infty} \lambda e^{-\lambda x}\,dx\,dy = \int_{${0}}^{\infty} \mu e^{-(\lambda + \mu)y}\,dy`}.`,
    t`So ${math`P(X > Y) = \frac{\mu}{\lambda + \mu}`}: the larger ${mY}'s rate, the sooner ${mY} tends to come, and the likelier ${mX} is to exceed it.`,
  ],
  reference: 'mu/(lambda + mu)',
  verify: () => {
    const n = 20000;
    const rng = mulberry32(4);
    for (const [l, m] of [[1, 2], [3, 0.5]] as const) {
      let hits = 0;
      for (let i = 0; i < n; i++) if (expSample(rng, l) > expSample(rng, m)) hits++;
      const exact = m / (l + m);
      const r = near(`P(X > Y) by simulation, λ = ${l}, μ = ${m}`, hits / n, exact, 4.5 * Math.sqrt((exact * (1 - exact)) / n))
        ?? near(`P(X > Y) by numerical integration, λ = ${l}, μ = ${m}`, integrateToInfinity((y) => m * Math.exp(-m * y) * Math.exp(-l * y), 0), exact, 1e-9);
      if (r !== null) return r;
    }
    return null;
  },
  misconceptions: [
    { response: 'lambda/(lambda + mu)', why: t`That is ${math`P(X < Y)`}. A larger ${math`\lambda`} makes ${mX} smaller, so ${math`\lambda`} on top would favour ${mX} coming first.` },
    { response: '1/2', why: t`Only when ${math`\lambda = \mu`}. Integrate the joint density over ${math`\{x > y\}`}.` },
  ],
});

const q1general = supervision({
  id: 'ia4-q1-general',
  source: cite(SH4, 'Q1', true),
  title: t`Meeting with any waiting time`,
  prompt: t`Two people arrive independently and uniformly in an interval of length ${math`T`}, and each waits ${math`w \le T`} for the other. Show that they meet with probability ${math`${1} - (${1} - w/T)^{${2}}`}, drawing the region in the square. How does the answer change if only one of them is willing to wait?`,
  writeUp: 'proof',
});
const triangle = supervision({
  id: 'schedule-joint-triangle',
  source: cite('tripos-schedules', 'IA Probability, Continuous random variables: "Joint distributions"', true),
  title: t`A constant density that does not factorise`,
  prompt: t`Let ${math`f(x, y) = ${2}`} for ${math`${0} < y < x < ${1}`}, and ${0} otherwise. Show that ${math`f`} is a joint density, find the marginal densities of ${mX} and ${mY}, and show that ${mX} and ${mY} are not independent, although the formula for ${math`f`} is a constant. What exactly must factorise for independence?`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

const HALF = q(1, 2);
const both = rectProb({ a: HALF, b: HALF });
const margin = marginalCdf(HALF);
const claims: ProbabilityClaim[] = [
  { what: 'P(X ≤ 1/2, Y ≤ 1/2) for the joint density x + y on the unit square', exact: both, trial: (rng) => { const [x, y] = drawXplusY(rng); return x <= 0.5 && y <= 0.5; } },
  { what: 'P(X < 1/2) for the density 2 on 0 < y < x < 1 (X the larger of two uniforms)', exact: q(1, 4), trial: (rng) => Math.max(rng(), rng()) < 0.5 },
];

export const jointDensities: TopicContent = {
  topicId: 'rv.joint-densities',
  goal: t`Find probabilities from a joint density by double integrals, find the marginal densities, and test independence by factorising.`,
  objective: t`Find probabilities from a joint density by double integrals, find marginals, and test independence.`,
  why: t`Two continuous quantities at once, such as two arrival times, need it; next, transformations of pairs.`,
  minutes: 30,
  lesson: [
    { kind: 'section', title: t`Two random times` },
    { kind: 'hook', text: t`Alice and Bob each turn up at a café at a random time between noon and ${1} pm, independently, and each waits ${10} minutes for the other. What is the chance they meet? One random time has a density, a curve whose area gives probabilities. Two random times need a density over a plane, whose volume gives probabilities.` },
    { kind: 'narrative', text: t`For one continuous random variable ${mX} with density ${math`f_{X}`}, you already know ${math`P(a \le X \le b) = \int_{a}^{b} f_{X}(x)\,dx`}: the area under the curve. Now picture a surface ${math`z = f(x, y)`} floating over the ${math`(x, y)`} plane. The chance that the point ${math`(X, Y)`} lands in a region is the volume under the surface above that region.` },

    { kind: 'section', title: t`Joint and marginal densities` },
    { kind: 'definition', name: t`Joint density`, formal: t`Random variables ${mX}, ${mY} have [[joint-density|joint density]] ${math`f`} if ${math`f(x, y) \ge ${0}`}, ${math`\iint_{\mathbb{R}^{${2}}} f(x, y)\,dx\,dy = ${1}`}, and for every (reasonable) region ${math`A \subseteq \mathbb{R}^{${2}}`}, ${dmath`P((X, Y) \in A) = \iint_{A} f(x, y)\,dx\,dy.`}`, plain: t`Probability is volume under the surface. For example ${math`f(x, y) = x + y`} on the unit square ${math`[${0}, ${1}]^{${2}}`} (and ${0} elsewhere) is a joint density: it is never negative, and its total volume is ${1}.` },
    { kind: 'p', text: t`Checking that volume: integrate ${math`y`} first, holding ${math`x`} fixed. ${math`\int_{${0}}^{${1}} (x + y)\,dy = x + \tfrac{${1}}{${2}}`}, then ${math`\int_{${0}}^{${1}} (x + \tfrac{${1}}{${2}})\,dx = \tfrac{${1}}{${2}} + \tfrac{${1}}{${2}} = ${1}`}.`, why: { q: t`Why may we integrate one variable at a time?`, a: t`For a nonnegative (or absolutely integrable) function, a double integral equals the repeated integral, in either order. This is Fubini's theorem; at this level you may use it freely for densities.` } },
    { kind: 'definition', name: t`Marginal density`, formal: t`If ${mX}, ${mY} have joint density ${math`f`}, the [[marginal-density|marginal density]] of ${mX} is ${dmath`f_{X}(x) = \int_{-\infty}^{\infty} f(x, y)\,dy,`} and likewise ${math`f_{Y}(y) = \int_{-\infty}^{\infty} f(x, y)\,dx`}.`, plain: t`Integrate out the variable you do not care about. For ${math`x + y`} on the square, ${math`f_{X}(x) = x + \tfrac{${1}}{${2}}`} for ${math`${0} \le x \le ${1}`}.` },
    { kind: 'theorem', statement: t`The marginal ${math`f_{X}`} is the density of ${mX} on its own: ${math`P(X \le a) = \int_{-\infty}^{a} f_{X}(x)\,dx`} for every ${math`a`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Write the event as a region`, text: t`${math`\{X \le a\}`} is the event that ${math`(X, Y)`} lies in the half-plane ${math`A = \{(x, y) : x \le a\}`}, since ${mY} may be anything.` },
        { label: t`Use the joint density`, text: t`${math`P(X \le a) = \iint_{A} f(x, y)\,dx\,dy`}.` },
        { label: t`Integrate ${math`y`} first`, text: t`Doing the ${math`y`} integral inside,`, eq: [dmath`P(X \le a) = \int_{-\infty}^{a} \left(\int_{-\infty}^{\infty} f(x, y)\,dy\right) dx = \int_{-\infty}^{a} f_{X}(x)\,dx.`], plain: t`That is exactly what it means for ${math`f_{X}`} to be the density of ${mX}.` },
      ],
    },
    checkFrom(jointConstant, { i: 1, j: 0, a: 2, b: 1 }, t`${math`c\int_{${0}}^{${2}} x\,dx \int_{${0}}^{${1}} dy = c \times ${2} \times ${1}`}, and this must be ${1}.`),

    { kind: 'section', title: t`Probabilities as double integrals` },
    { kind: 'narrative', text: t`To find a probability, draw the region of the event, then integrate the density over it. Take ${math`f(x, y) = x + y`} on the square, and the event ${math`\{X \le \tfrac{${1}}{${2}},\ Y \le \tfrac{${1}}{${2}}\}`}: the bottom-left quarter of the square.` },
    {
      kind: 'steps',
      steps: [
        { label: t`Inner integral`, text: t`Hold ${math`x`} fixed and integrate over ${math`y`} from ${0} to ${math`\tfrac{${1}}{${2}}`}:`, eq: [dmath`\int_{${0}}^{${1}/${2}} (x + y)\,dy = \frac{x}{${2}} + \frac{${1}}{${8}}.`], why: { q: t`Where does ${math`\tfrac{${1}}{${8}}`} come from?`, a: t`${math`\int_{${0}}^{${1}/${2}} y\,dy = \left[\tfrac{y^{${2}}}{${2}}\right]_{${0}}^{${1}/${2}} = \tfrac{${1}}{${2}} \times \tfrac{${1}}{${4}} = \tfrac{${1}}{${8}}`}. And ${math`\int_{${0}}^{${1}/${2}} x\,dy = \tfrac{x}{${2}}`}, since ${math`x`} is a constant here.` } },
        { label: t`Outer integral`, text: t`Now over ${math`x`} from ${0} to ${math`\tfrac{${1}}{${2}}`}:`, eq: [dmath`\int_{${0}}^{${1}/${2}} \left(\frac{x}{${2}} + \frac{${1}}{${8}}\right) dx = \frac{${1}}{${16}} + \frac{${1}}{${16}} = ${both}.`] },
      ],
    },
    checkFrom(rectangleProbability, { a: q(2, 3), b: q(1, 3) }, t`${math`\frac{ab(a + b)}{${2}}`} with ${math`a = ${q(2, 3)}`}, ${math`b = ${q(1, 3)}`}: ${rectProb({ a: q(2, 3), b: q(1, 3) })}.`),

    { kind: 'section', title: t`Independence` },
    { kind: 'theorem', name: t`Independence and factorising`, statement: t`Jointly continuous ${mX} and ${mY} are independent if and only if their joint density can be taken to be ${math`f(x, y) = f_{X}(x)\,f_{Y}(y)`}.` },
    { kind: 'p', text: t`In plain words: independence means the surface is a product of a curve in ${math`x`} and a curve in ${math`y`}. Two arrival times, each uniform on ${math`[${0}, ${60}]`} minutes and independent, have joint density ${math`\tfrac{${1}}{${60}} \cdot \tfrac{${1}}{${60}}`} on the square, so every probability is an area divided by ${3600}. That is how the café question is solved below.`, why: { q: t`Why does a product density give independence?`, a: t`For a rectangle, ${math`P(X \le a, Y \le b) = \int_{-\infty}^{a}\int_{-\infty}^{b} f_{X}(x)f_{Y}(y)\,dy\,dx`}, and the double integral splits into ${math`P(X \le a)\,P(Y \le b)`}. The converse is part of the Tripos course.` } },
    { kind: 'narrative', text: t`For ${math`x + y`}, the formula does not factorise, so ${mX} and ${mY} are not independent. The numbers agree: ${math`P(X \le \tfrac{${1}}{${2}}) = \int_{${0}}^{${1}/${2}} (x + \tfrac{${1}}{${2}})\,dx = ${margin}`}, and ${math`${margin}^{${2}} = ${mul(margin, margin)}`}, not ${both}.` },

    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`A joint density given by a constant formula always factorises, so the variables are independent.`, counterexample: t`${math`f(x, y) = ${2}`} on the triangle ${math`${0} < y < x < ${1}`}. If ${math`X = \tfrac{${1}}{${10}}`}, then ${mY} is trapped in ${math`(${0}, \tfrac{${1}}{${10}})`}: knowing ${mX} changes ${mY}. The factorisation must hold everywhere, including the zero outside the triangle, and ${math`f_{X}(x)f_{Y}(y)`} is positive on the whole square.` },
    { kind: 'pitfall', claim: t`${math`P(X \le a, Y \le b) = P(X \le a)\,P(Y \le b)`} for any joint density.`, counterexample: t`For ${math`x + y`} with ${math`a = b = \tfrac{${1}}{${2}}`}, the left side is ${both} and the right side is ${mul(margin, margin)}. Only independence allows the product.` },
    { kind: 'pitfall', claim: t`To find ${math`f_{X}`}, integrate over ${math`x`}.`, counterexample: t`That gives a function of ${math`y`}, the marginal of ${mY}. Integrate out the other variable: ${math`f_{X}(x) = \int f(x, y)\,dy`}.` },
    { kind: 'takeaway', text: t`A probability for two continuous variables is the volume under the joint density over the event's region, and independence is a joint density that factorises on a rectangle.` },
  ],
  examples: [
    { ...workedCambridge(q1), examiner: t`The examiner looks for the joint density stated with the reason (independence), the region drawn, and the area of the two corner triangles subtracted.` },
    worked(rectangleProbability, { a: q(1, 2), b: q(1) }, t`A strip under ${math`x + y`}`),
    worked(exponentialRace, { l: 1, m: 3, c: q(2) }, t`One wait more than twice another`),
  ],
  generators: [jointConstant, rectangleProbability, exponentialRace],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['joint-density', 'marginal-density'],
  claims,
  cambridge: [q4race, q1general, triangle],
  // Both are the sheet's own questions: the general meeting problem as a write-up first, then Q4 in general.
  gate: ['ia4-q1-general', 'ia4-q4-race'],
  recall: [
    { front: t`What makes ${math`f`} a joint density of ${mX}, ${mY}?`, back: t`${math`f \ge ${0}`}, total integral ${1}, and ${math`P((X, Y) \in A) = \iint_{A} f`} for regions ${math`A`}.` },
    { front: t`The marginal density of ${mX}.`, back: t`${math`f_{X}(x) = \int_{-\infty}^{\infty} f(x, y)\,dy`}.` },
    { front: t`When are jointly continuous ${mX}, ${mY} independent?`, back: t`Exactly when the joint density factorises as ${math`f_{X}(x)\,f_{Y}(y)`}, on the whole plane.` },
  ],
  proofOrder: [{
    title: t`The marginal is the density of ${mX}`,
    steps: [
      t`Write ${math`\{X \le a\}`} as ${math`(X, Y)`} in the half-plane ${math`x \le a`}.`,
      t`Its probability is the double integral of ${math`f`} over the half-plane.`,
      t`Integrate over ${math`y`} first, inside.`,
      t`The inner integral is ${math`f_{X}(x)`}, so ${math`P(X \le a) = \int_{-\infty}^{a} f_{X}`}.`,
    ],
  }],
};
