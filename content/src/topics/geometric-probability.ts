/**
 * prob.geometric-probability: for a point uniform in a region, probabilities are areas;
 * Buffon's needle and Bertrand's paradox. From the Faculty schedule ("Geometrical
 * probability: Bertrand's paradox, Buffon's needle.") and IA Probability Example Sheet 4
 * Q1 (meeting times, here with unequal waits), Q2 (a stick broken in two places makes a
 * triangle), and Q10 (a uniform direction gives the Cauchy density). Sheet 4 has no
 * official solutions; the answers are checked by exact areas and simulation, Buffon's
 * probability by numerical integration, and Q10 is set for supervision.
 */
import { mulberry32, type Rng } from '@learnhub/mastery';
import { auto, cite, supervision } from '../cambridge';
import { add, int, mul, pick, q, str, sub, toFloat, type Rational } from '../math';
import { near, round, simpson } from '../partv-b';
import { generator, type Misconception } from '../problem';
import { math, t } from '../rich';
import { quickCheck, worked, workedCambridge, type ProbabilityClaim, type TopicContent } from '../topic';

const [mX, mY] = [math`X`, math`Y`];
const SH4 = 'ia-prob-sheet-4' as const;
const SCHED = 'tripos-schedules' as const;
const r4 = (x: number): number => round(x, 4);

// ---------------------------------------------------------------- meeting with unequal waits

interface MeetP { T: number; w1: number; w2: number }
const meetProb = ({ T, w1, w2 }: MeetP): Rational => sub(q(1), q((T - w1) ** 2 + (T - w2) ** 2, 2 * T * T));
const WAITS: readonly number[] = [5, 10, 15, 20, 30];

const meeting = generator<MeetP>({
  id: 'meeting',
  skill: 'Two uniform arrival times are a uniform point in a square; they meet in a band along the diagonal, whose area is the square minus two triangles.',
  params: (rng) => {
    for (;;) {
      const p = { T: 60, w1: pick(rng, WAITS), w2: pick(rng, WAITS) };
      const right = str(meetProb(p));
      if (str(q(p.w1 + p.w2, p.T)) !== right) return p;
    }
  },
  sane: (p) => (p.w1 > 0 && p.w2 > 0 && p.w1 < p.T && p.w2 < p.T ? null : 'out of range'),
  problem: (p) => {
    const v = meetProb(p);
    const same = p.w1 === p.w2;
    return {
      prompt: same
        ? t`Ann and Ben each arrive at a time uniform in an hour, independently, and each waits ${p.w1} minutes for the other before leaving. What is the probability that they meet?`
        : t`Ann and Ben each arrive at a time uniform in an hour, independently. Ann waits ${p.w1} minutes for Ben; Ben waits ${p.w2} minutes for Ann. What is the probability that they meet?`,
      answer: { kind: 'exact', expected: str(v) },
      solution: [
        t`Let ${math`(A, B)`} be the arrival times in minutes: a uniform point in the square ${math`[${0}, ${p.T}]^{${2}}`}, so a probability is an area over ${p.T * p.T}. They meet when ${math`${0} \le B - A \le ${p.w1}`} (Ann first) or ${math`${0} \le A - B \le ${p.w2}`} (Ben first).`,
        t`They miss in two corner triangles, with legs ${p.T - p.w1} and ${p.T - p.w2}: total area ${math`\tfrac{${1}}{${2}}(${(p.T - p.w1) ** 2} + ${(p.T - p.w2) ** 2}) = ${((p.T - p.w1) ** 2 + (p.T - p.w2) ** 2) / 2}`}.`,
        t`So the probability is ${math`${1} - \frac{${((p.T - p.w1) ** 2 + (p.T - p.w2) ** 2) / 2}}{${p.T * p.T}} = ${v}`}.`,
      ],
    };
  },
  solve: (p) => {
    // For Ann's arrival a, Ben's arrival must lie in [a - w2, a + w1] cut to [0, T]: a piecewise linear length, so the trapezium rule on its kinks is exact.
    const len = (a: number): Rational => q(Math.min(a + p.w1, p.T) - Math.max(a - p.w2, 0));
    const knots = [...new Set([0, p.w2, p.T - p.w1, p.T].filter((x) => x >= 0 && x <= p.T))].sort((x, y) => x - y);
    let area = q(0);
    for (let k = 0; k + 1 < knots.length; k++) {
      const [a, b] = [knots[k] as number, knots[k + 1] as number];
      area = add(area, mul(q(b - a, 2), add(len(a), len(b))));
    }
    return str(mul(area, q(1, p.T * p.T)));
  },
  misconceptions: (p): Misconception[] => {
    const out: Misconception[] = [
      { response: str(q(p.w1 + p.w2, p.T)), why: t`The band has width ${p.w1 + p.w2} minutes along the axes, but it is cut off at the corners of the square. Subtract the two corner triangles from the square instead.` },
      { response: str(q(p.w1 * p.w2, p.T * p.T)), why: t`Multiplying the two chances treats the waits as separate events. Draw the square of arrival times and find the area where they meet.` },
    ];
    const noHalf = sub(q(1), q((p.T - p.w1) ** 2 + (p.T - p.w2) ** 2, p.T * p.T));
    if (toFloat(noHalf) >= 0) out.push({ response: str(noHalf), why: t`Each corner region is a triangle, half of a square: include the factor ${q(1, 2)}.` });
    return out;
  },
  trial: (p, rng) => {
    const [a, b] = [rng() * p.T, rng() * p.T];
    return (b >= a && b - a <= p.w1) || (a > b && a - b <= p.w2);
  },
});

// ---------------------------------------------------------------- Buffon's needle

interface BufP { l: number; d: number }
const buffon = ({ l, d }: BufP): number => (2 * l) / (Math.PI * d);

const buffonNeedle = generator<BufP>({
  id: 'buffon',
  skill: 'For a needle no longer than the spacing of the lines, P(cross) = 2l/(πd): integrate over the angle the chance that the centre is close enough to a line.',
  params: (rng) => {
    const d = int(rng, 2, 10);
    return { l: int(rng, 1, d), d };
  },
  sane: ({ l, d }) => (l >= 1 && l <= d ? null : 'out of range'),
  problem: (p) => {
    const v = buffon(p);
    return {
      prompt: t`Parallel lines are drawn ${p.d} cm apart on a floor, and a needle of length ${p.l} cm is dropped at random. What is the probability that it crosses a line? Give four decimal places.`,
      answer: { kind: 'numeric', expected: r4(v), absTol: 0.00015, relTol: 0 },
      solution: [
        t`Let ${mX} be the distance from the centre of the needle to the nearest line, uniform on ${math`[${0}, ${p.d / 2}]`}, and ${math`\Theta`} its acute angle with the lines, uniform on ${math`[${0}, \pi/${2}]`}, independent. The needle crosses when ${math`X \le \tfrac{${p.l}}{${2}}\sin\Theta`}, which is possible as the needle is no longer than the spacing.`,
        t`${math`P = \int_{${0}}^{\pi/${2}} \frac{(${p.l}/${2})\sin\theta}{${p.d}/${2}} \cdot \frac{${2}}{\pi}\,d\theta = \frac{${2} \times ${p.l}}{\pi \times ${p.d}} \approx ${r4(v)}`}.`,
      ],
    };
  },
  solve: (p) => {
    // The area of {x ≤ (l/2) sin θ} in the rectangle [0, d/2] × [0, π/2], numerically.
    const area = simpson((th) => Math.min(p.d / 2, (p.l / 2) * Math.sin(th)), 0, Math.PI / 2, 2000);
    return String(r4(area / ((p.d / 2) * (Math.PI / 2))));
  },
  misconceptions: (p): Misconception[] => [
    { response: String(r4(p.l / p.d)), why: t`The needle reaches across ${math`\ell/d`} of the gap only when it lies across the lines. At an angle ${math`\theta`} it spans ${math`\ell\sin\theta`}: average over the angle.` },
    { response: String(r4(p.l / (Math.PI * p.d))), why: t`The centre's distance is uniform on ${math`[${0}, d/${2}]`}, half the spacing: that doubles the answer.` },
    { response: String(r4(Math.min(1, (2 * p.l) / p.d))), why: t`The needle reaches ${math`\tfrac{\ell}{${2}}\sin\theta`} from its centre, not ${math`\tfrac{\ell}{${2}}`}: average ${math`\sin\theta`} over the angle, which gives ${math`${2}/\pi`}.` },
  ],
});

// ---------------------------------------------------------------- a region in the unit square

interface SumP { s: Rational }
const SS: readonly Rational[] = [q(1, 4), q(1, 3), q(1, 2), q(2, 3), q(3, 4), q(5, 4), q(4, 3), q(3, 2), q(5, 3), q(7, 4)];
const sumBelow = (s: Rational): Rational => (toFloat(s) <= 1 ? mul(mul(s, s), q(1, 2)) : sub(q(1), mul(mul(sub(q(2), s), sub(q(2), s)), q(1, 2))));

const sumRegion = generator<SumP>({
  id: 'sum-region',
  skill: 'For X, Y independent uniform on [0, 1], P(X + Y ≤ s) is the area under the line x + y = s inside the unit square: a triangle, or the square minus one.',
  params: (rng) => ({ s: pick(rng, SS) }),
  sane: ({ s }) => (toFloat(s) > 0 && toFloat(s) < 2 ? null : 'out of range'),
  problem: ({ s }) => {
    const v = sumBelow(s);
    const small = toFloat(s) <= 1;
    return {
      prompt: t`${mX} and ${mY} are independent and uniform on ${math`[${0}, ${1}]`}. Find ${math`P(X + Y \le ${s})`}.`,
      answer: { kind: 'exact', expected: str(v) },
      solution: [
        t`${math`(X, Y)`} is uniform on the unit square, so the probability is the area of ${math`\{x + y \le ${s}\}`} inside it.`,
        small
          ? t`For ${math`s \le ${1}`} it is a triangle with legs ${s}: area ${math`\tfrac{${1}}{${2}} \times ${mul(s, s)} = ${v}`}.`
          : t`For ${math`s > ${1}`} it is the square minus the triangle above the line, with legs ${sub(q(2), s)}: ${math`${1} - \tfrac{${1}}{${2}} \times ${mul(sub(q(2), s), sub(q(2), s))} = ${v}`}.`,
      ],
    };
  },
  solve: ({ s }) => {
    // The length of {y : x + y ≤ s} in [0, 1] is piecewise linear in x; the trapezium rule on its kinks is exact.
    const len = (x: Rational): Rational => { const r = sub(s, x); return toFloat(r) <= 0 ? q(0) : toFloat(r) >= 1 ? q(1) : r; };
    const knots = [q(0), q(1), s, sub(s, q(1))].filter((x) => toFloat(x) >= 0 && toFloat(x) <= 1).sort((a, b) => toFloat(a) - toFloat(b));
    let area = q(0);
    for (let i = 0; i + 1 < knots.length; i++) area = add(area, mul(mul(sub(knots[i + 1] as Rational, knots[i] as Rational), q(1, 2)), add(len(knots[i] as Rational), len(knots[i + 1] as Rational))));
    return str(area);
  },
  misconceptions: ({ s }): Misconception[] => [
    { response: str(mul(s, q(1, 2))), why: t`${math`X + Y`} is not uniform on ${math`[${0}, ${2}]`}: its values pile up near ${1}. Find the area under the line.` },
    { response: str(mul(s, s)), why: t`The region is a triangle, half of the square with side ${s}: include the ${q(1, 2)}.` },
    { response: str(mul(mul(s, s), q(1, 2))), why: t`For ${math`s > ${1}`} the triangle ${math`\tfrac{${1}}{${2}}s^{${2}}`} spills outside the unit square. Take the square minus the corner above the line.` },
    { response: str(sub(q(1), sumBelow(s))), why: t`That is ${math`P(X + Y > ${s})`}, the region above the line.` },
  ],
  trial: ({ s }, rng) => rng() + rng() <= toFloat(s),
});

// ---------------------------------------------------------------- Cambridge problems

/** P(the three pieces of a stick broken at two uniform points make a triangle): every piece shorter than 1/2. */
const triangle = (u: number, v: number): boolean => {
  const [a, b] = u < v ? [u, v] : [v, u];
  return a < 0.5 && b - a < 0.5 && 1 - b < 0.5;
};
const q2 = auto({
  id: 'ia4-q2',
  source: cite(SH4, 'Q2'),
  title: t`A broken stick makes a triangle`,
  prompt: t`A stick is broken in two places, independently uniformly distributed along its length. What is the probability that the three pieces will make a triangle?`,
  answer: { kind: 'exact', expected: '1/4' },
  solution: [
    t`Take the stick to be ${math`[${0}, ${1}]`} and the breaks at ${mX} and ${mY}: a uniform point in the unit square. Three lengths make a triangle when each is less than the sum of the others, that is, each is less than ${q(1, 2)}.`,
    t`Where ${math`X < Y`}: the pieces are ${math`X`}, ${math`Y - X`}, ${math`${1} - Y`}, all below ${q(1, 2)} exactly when ${math`X < \tfrac{${1}}{${2}} < Y`} and ${math`Y - X < \tfrac{${1}}{${2}}`}. That is a triangle with vertices ${math`(${0}, \tfrac{${1}}{${2}})`}, ${math`(\tfrac{${1}}{${2}}, \tfrac{${1}}{${2}})`}, ${math`(\tfrac{${1}}{${2}}, ${1})`}, of area ${q(1, 8)}.`,
    t`The case ${math`X > Y`} is its mirror image, so the probability is ${math`${2} \times ${q(1, 8)} = ${q(1, 4)}`}.`,
  ],
  reference: '1/4',
  verify: () => {
    // A midpoint grid (exact up to the cells the boundary lines cut) and a simulation.
    const n = 1000;
    let hits = 0;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (triangle((i + 0.5) / n, (j + 0.5) / n)) hits++;
    const rng = mulberry32(2);
    let sim = 0;
    const N = 20000;
    for (let i = 0; i < N; i++) if (triangle(rng(), rng())) sim++;
    return near('the triangle region by a 1000 × 1000 grid', hits / (n * n), 0.25, 0.002) ?? near('by simulation', sim / N, 0.25, 4.5 * Math.sqrt(0.1875 / N));
  },
  misconceptions: [
    { response: '1/2', why: t`Each piece must be shorter than ${q(1, 2)}, not only the middle one. Draw the region in the unit square: two triangles of area ${q(1, 8)}.` },
    { response: '1/8', why: t`That is only the case where the first break is the left one. The mirror case, ${math`X > Y`}, adds another ${q(1, 8)}.` },
  ],
});

const q1unequal = auto({
  id: 'ia4-q1-unequal',
  source: cite(SH4, 'Q1', true),
  title: t`Meeting when one waits longer`,
  prompt: t`Alice and Bob arrive at times independent and uniform between ${12} noon and ${1} pm. Alice will wait ${10} minutes for Bob, but Bob will wait ${20} minutes for Alice. Find the probability that they meet.`,
  answer: { kind: 'exact', expected: str(meetProb({ T: 60, w1: 10, w2: 20 })) },
  solution: [
    t`The arrival times are a uniform point in the square ${math`[${0}, ${60}]^{${2}}`}. They miss when Bob comes more than ${10} minutes after Alice, or Alice more than ${20} minutes after Bob: corner triangles with legs ${50} and ${40}.`,
    t`${math`P(\text{meet}) = ${1} - \frac{\tfrac{${1}}{${2}}(${50}^{${2}} + ${40}^{${2}})}{${3600}} = ${1} - \frac{${2050}}{${3600}} = ${meetProb({ T: 60, w1: 10, w2: 20 })}`}.`,
  ],
  reference: str(meetProb({ T: 60, w1: 10, w2: 20 })),
  verify: () => {
    const rng = mulberry32(3);
    const N = 20000;
    let hits = 0;
    for (let i = 0; i < N; i++) {
      const [a, b] = [rng() * 60, rng() * 60];
      if ((b >= a && b - a <= 10) || (a > b && a - b <= 20)) hits++;
    }
    const p = toFloat(meetProb({ T: 60, w1: 10, w2: 20 }));
    return near('the meeting probability by simulation', hits / N, p, 4.5 * Math.sqrt((p * (1 - p)) / N));
  },
  misconceptions: [
    { response: '1/2', why: t`${math`(${10} + ${20})/${60}`} is the width of the band along the axes, but the band is cut off at the corners. Subtract the two corner triangles from the square.` },
    { response: '11/36', why: t`That is the answer when both wait ${10} minutes. Bob waits ${20}, so his corner triangle is smaller.` },
  ],
});

const buffonAuto = auto({
  id: 'schedule-buffon',
  source: cite(SCHED, 'IA Probability, Continuous random variables: "Buffon\'s needle"', true),
  title: t`Buffon's needle, a needle shorter than the gap`,
  prompt: t`A needle of length ${3} is dropped at random on a floor ruled with parallel lines ${4} apart. Find the probability that it crosses a line, to four decimal places.`,
  answer: { kind: 'numeric', expected: r4(buffon({ l: 3, d: 4 })), absTol: 0.00015, relTol: 0 },
  solution: [
    t`The distance ${mX} from the centre to the nearest line is uniform on ${math`[${0}, ${2}]`}, the angle ${math`\Theta`} uniform on ${math`[${0}, \pi/${2}]`}. The needle crosses when ${math`X \le \tfrac{${3}}{${2}}\sin\Theta`}.`,
    t`${math`P = \frac{${2}\ell}{\pi d} = \frac{${6}}{${4}\pi} \approx ${r4(buffon({ l: 3, d: 4 }))}`}.`,
  ],
  reference: String(r4(buffon({ l: 3, d: 4 }))),
  verify: () => {
    const rng: Rng = mulberry32(5);
    const N = 20000;
    let hits = 0;
    for (let i = 0; i < N; i++) if (rng() * 2 <= 1.5 * Math.sin(rng() * Math.PI / 2)) hits++;
    const p = buffon({ l: 3, d: 4 });
    return near('crossing frequency by simulation', hits / N, p, 4.5 * Math.sqrt((p * (1 - p)) / N));
  },
  misconceptions: [
    { response: String(r4(3 / 4)), why: t`${math`\ell/d`} assumes the needle always lies across the lines. Average ${math`\sin\theta`} over the angle: ${math`${2}/\pi`}.` },
    { response: String(r4(3 / (4 * Math.PI))), why: t`The centre is within ${math`d/${2} = ${2}`} of the nearest line, not ${4}: that doubles the answer.` },
  ],
});

const q10a = supervision({
  id: 'ia4-q10-a',
  source: cite(SH4, 'Q10(a)'),
  title: t`A uniform direction onto a plate`,
  prompt: t`A radioactive source emits particles in a random direction, all directions equally likely. It is held at distance ${math`a`} from a vertical infinite plane photographic plate. Show that, given the particle hits the plate, the horizontal coordinate of its point of impact (with the point nearest the source as origin) has the Cauchy density ${math`\frac{a}{\pi(a^{${2}} + x^{${2}})}`}.`,
  writeUp: 'proof',
});
const q10b = supervision({
  id: 'ia4-q10-b',
  source: cite(SH4, 'Q10(b)'),
  title: t`The Cauchy density has no mean`,
  prompt: t`Can you compute the mean of the Cauchy density ${math`\frac{a}{\pi(a^{${2}} + x^{${2}})}`}? Explain what goes wrong with ${math`\int x f(x)\,dx`}, and why the symmetric limit ${math`\lim_{M \to \infty}\int_{-M}^{M} x f(x)\,dx = ${0}`} does not make ${0} the mean.`,
  writeUp: 'explanation',
});
const bertrand = supervision({
  id: 'schedule-bertrand',
  source: cite(SCHED, 'IA Probability, Continuous random variables: "Bertrand\'s paradox"', true),
  title: t`Bertrand's paradox`,
  prompt: t`A chord of a circle is chosen "at random". Find the probability that it is longer than a side of the inscribed equilateral triangle when (i) its two endpoints are independent and uniform on the circle, (ii) its distance from the centre is uniform along a radius, and (iii) its midpoint is uniform in the disc. Explain why the three answers differ, and what the paradox says about the phrase "at random".`,
  writeUp: 'explanation',
});
const buffonProof = supervision({
  id: 'schedule-buffon-proof',
  source: cite(SCHED, 'IA Probability, Continuous random variables: "Buffon\'s needle"', true),
  title: t`Buffon's needle, and an estimate of ${math`\pi`}`,
  prompt: t`A needle of length ${math`\ell`} is dropped on a floor with parallel lines ${math`d \ge \ell`} apart. Stating your model for "dropped at random", show that it crosses a line with probability ${math`\frac{${2}\ell}{\pi d}`}. If the needle crosses ${math`k`} times in ${math`n`} drops, what estimate of ${math`\pi`} does this suggest?`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson: Bertrand's three chords

/** The chord is longer than √3 (the side of the triangle inscribed in the unit circle). */
const LONG = 3;
const claims: ProbabilityClaim[] = [
  {
    what: 'Bertrand: chord from two uniform endpoints is longer than the triangle side',
    exact: q(1, 3),
    trial: (rng) => { const d = 2 * Math.PI * Math.abs(rng() - rng()); return 4 * Math.sin(d / 2) ** 2 > LONG; },
  },
  { what: 'Bertrand: chord at a uniform distance along a radius', exact: q(1, 2), trial: (rng) => { const r = rng(); return 4 * (1 - r * r) > LONG; } },
  {
    what: 'Bertrand: chord with a uniform midpoint in the disc',
    exact: q(1, 4),
    trial: (rng) => { for (;;) { const [x, y] = [2 * rng() - 1, 2 * rng() - 1]; const r2 = x * x + y * y; if (r2 <= 1) return 4 * (1 - r2) > LONG; } },
  },
  { what: 'a stick broken at two uniform points makes a triangle', exact: q(1, 4), trial: (rng) => triangle(rng(), rng()) },
];

const [ml, md, mTh] = [math`\ell`, math`d`, math`\Theta`];

export const geometricProbability: TopicContent = {
  topicId: 'prob.geometric-probability',
  goal: t`Compute probabilities as areas for uniform points, as in the broken stick, Buffon's needle, and Bertrand's paradox, and see why "at random" must be specified.`,
  objective: t`Compute probabilities as areas for uniform random points, and say exactly what "at random" means.`,
  why: t`Pictures make continuous probability concrete; Buffon even estimates ${math`\pi`}, and Bertrand shows why models matter.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`Probability you can see` },
    { kind: 'hook', text: t`Drop a needle on a floor of parallel floorboards. In ${1777} the Comte de Buffon published the chance that it lands across a crack, and the answer contains ${math`\pi`}. Drop enough needles and you can estimate ${math`\pi`} from a floor. Where does a circle's constant come from, with no circle in sight?` },
    {
      kind: 'rule',
      text: t`If a point is uniform in a region ${math`D`} of the plane, then ${math`P(\text{point in } A) = \frac{\text{area of } A \cap D}{\text{area of } D}`}. Two independent uniform coordinates, ${mX} on ${math`[a, b]`} and ${mY} on ${math`[c, e]`}, give a point uniform in the rectangle.`,
      why: { q: t`Why does independence give a uniform point?`, a: t`The joint density of independent variables is the product of their densities: ${math`\frac{${1}}{b - a} \cdot \frac{${1}}{e - c}`}, a constant on the rectangle. A constant joint density is exactly what uniform in the rectangle means.` },
    },
    { kind: 'p', text: t`So a geometric probability is a joint density problem whose integrals are areas you can often see. Sheet ${4} Q${2}, worked below, breaks a stick at two uniform points and asks whether the three pieces make a triangle: draw the unit square and shade.` },
    quickCheck({
      prompt: t`${mX} and ${mY} are independent and uniform on ${math`[${0}, ${1}]`}. What is ${math`P(X > ${2}Y)`}?`,
      answer: { kind: 'exact', expected: str(q(1, 4)) },
      reference: str(q(1, 4)),
      why: t`In the unit square, ${math`x > ${2}y`} is the triangle below the line ${math`y = \frac{x}{${2}}`}, with corners ${math`(${0}, ${0})`}, ${math`(${1}, ${0})`}, ${math`(${1}, \frac{${1}}{${2}})`}: area ${math`\frac{${1}}{${2}} \times ${1} \times \frac{${1}}{${2}} = ${q(1, 4)}`}.`,
    }),
    { kind: 'section', title: t`Buffon's needle` },
    { kind: 'narrative', text: t`To compute anything we must say what "dropped at random" means. Describe a fallen needle by two numbers: ${mX}, the distance from its centre to the nearest line, and ${mTh}, the acute angle it makes with the lines. The model: ${mX} uniform on ${math`[${0}, \frac{d}{${2}}]`}, ${mTh} uniform on ${math`[${0}, \frac{\pi}{${2}}]`}, independent.` },
    { kind: 'theorem', name: t`Buffon's needle`, statement: t`In this model, a needle of length ${ml} dropped on lines ${md} apart, with ${math`\ell \le d`}, crosses a line with probability ${math`\frac{${2}\ell}{\pi d}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`When it crosses`, text: t`The needle reaches ${math`\frac{\ell}{${2}}\sin\Theta`} from its centre towards the nearest line, so it crosses exactly when ${math`X \le \frac{\ell}{${2}}\sin\Theta`}.`, plain: t`Half the needle, tilted at angle ${mTh}, covers a distance ${math`\frac{\ell}{${2}}\sin\Theta`} across the boards.` },
        { label: t`The region`, text: t`${math`(X, \Theta)`} is uniform on the rectangle ${math`[${0}, \frac{d}{${2}}] \times [${0}, \frac{\pi}{${2}}]`}, of area ${math`\frac{\pi d}{${4}}`}. The crossing region is ${math`\{(x, \theta) : x \le \frac{\ell}{${2}}\sin\theta\}`}.`, plain: t`Since ${math`\ell \le d`}, the curve ${math`x = \frac{\ell}{${2}}\sin\theta`} never leaves the rectangle.` },
        { label: t`Its area`, text: t`${math`\int_{${0}}^{\pi/${2}} \frac{\ell}{${2}}\sin\theta\,d\theta = \frac{\ell}{${2}}\left[-\cos\theta\right]_{${0}}^{\pi/${2}} = \frac{\ell}{${2}}`}.`, plain: t`${math`-\cos`} goes from ${math`-${1}`} at ${0} to ${0} at ${math`\frac{\pi}{${2}}`}, a change of ${1}.` },
        { label: t`Divide`, text: t`${math`P(\text{cross}) = \frac{\ell/${2}}{\pi d/${4}} = \frac{${2}\ell}{\pi d}`}.`, plain: t`Area of the crossing region over area of the rectangle. The ${math`\pi`} came from the uniform angle.` },
      ],
    },
    { kind: 'p', text: t`So with ${math`\ell = d`}, a needle crosses with probability ${math`\frac{${2}}{\pi}`}, about ${Number((2 / Math.PI).toFixed(4))}. That is [[buffons-needle|Buffon's needle]]. If ${math`k`} of ${math`n`} drops cross, ${math`\frac{${2}n\ell}{kd}`} estimates ${math`\pi`}.` },
    { kind: 'section', title: t`What "at random" means` },
    { kind: 'p', text: t`[[bertrands-paradox|Bertrand's paradox]] asks for the chance that a random chord of a circle is longer than a side of the inscribed equilateral triangle. Choose the two endpoints uniformly on the circle, and the answer is ${q(1, 3)}. Choose the chord's distance from the centre uniformly along a radius, and it is ${q(1, 2)}. Choose its midpoint uniformly in the disc, and it is ${q(1, 4)}.` },
    {
      kind: 'pitfall',
      claim: t`"A random chord" has one right probability of being longer than the triangle's side.`,
      counterexample: t`Each of ${q(1, 3)}, ${q(1, 2)}, and ${q(1, 4)} is right for its own model. "At random" means nothing until the uniform distribution and its sample space are named, as the needle's model was.`,
    },
    { kind: 'p', text: t`A uniform angle need not give a uniform position, either. Sheet ${4} Q${10} sends a particle in a uniformly random direction at a flat plate; where it lands is far from uniform. Finding its density is a supervision problem below.` },
    { kind: 'takeaway', text: t`For a uniform point, probability is area over area; name the model of "at random" first, as Buffon's needle does and Bertrand's paradox shows you must.` },
  ],
  examples: [
    { ...workedCambridge(q2), examiner: t`The two break points as a uniform point in the unit square, the triangle condition as "every piece shorter than half", and the region's area found exactly.` },
    worked(meeting, { T: 60, w1: 15, w2: 15 }, t`Meeting with a quarter hour's wait`),
    worked(buffonNeedle, { l: 5, d: 10 }, t`A needle half the gap`),
  ],
  generators: [meeting, buffonNeedle, sumRegion],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['buffons-needle', 'bertrands-paradox'],
  claims,
  cambridge: [q1unequal, buffonAuto, q10a, q10b, bertrand, buffonProof],
  // Sheet 4: Q10(a) first (a transformation, not just an area), then the unequal meeting times and the
  // Cauchy mean. The schedule problems are not from a sheet.
  gate: ['ia4-q10-a', 'ia4-q1-unequal', 'ia4-q10-b'],
  recall: [
    { front: t`Probability for a point uniform in ${math`D`}?`, back: t`${math`\frac{\text{area of } A \cap D}{\text{area of } D}`}.` },
    { front: t`Buffon's needle: chance of crossing?`, back: t`${math`\frac{${2}\ell}{\pi d}`}, for a needle of length ${ml} on lines ${md} apart, ${math`\ell \le d`}.` },
    { front: t`What does Bertrand's paradox show?`, back: t`"At random" has no meaning until the uniform distribution and its sample space are named: three models give ${q(1, 3)}, ${q(1, 2)}, ${q(1, 4)}.` },
  ],
  proofOrder: [
    {
      title: t`Buffon's needle`,
      steps: [
        t`The needle crosses when ${math`X \le \frac{\ell}{${2}}\sin\Theta`}.`,
        t`${math`(X, \Theta)`} is uniform on a rectangle of area ${math`\frac{\pi d}{${4}}`}.`,
        t`The crossing region has area ${math`\int_{${0}}^{\pi/${2}} \frac{\ell}{${2}}\sin\theta\,d\theta = \frac{\ell}{${2}}`}.`,
        t`So the probability is ${math`\frac{${2}\ell}{\pi d}`}.`,
      ],
    },
  ],
};
