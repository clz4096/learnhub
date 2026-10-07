/**
 * trig.small-angles: sin(theta)/theta tends to 1, by comparing the areas of two triangles and
 * a sector (STEP Support Foundation Assignment 19 Q1(i) to (iii)), the approximations
 * sin theta ~ theta, tan theta ~ theta, and cos theta ~ 1 - theta^2/2 (Q1(iv), from
 * cos^2 + sin^2 = 1 and the binomial expansion), and why they need radians (Q1(v)). Problems
 * also from NST Maths Workbook SS6 (an approximation to third order, checked with sympy), and
 * the gate adds STEP I 1999 Q5 and STEP I 2006 Q4 (STEP Questions Database).
 */
import { auto, cite, supervision, withUses } from '../cambridge';
import { int, pick, q, str } from '../math';
import { generator, type Misconception } from '../problem';
import { computedTex, dmath, math, t } from '../rich';
import { close } from '../prep-c';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';
import { far } from '../partv-a';

const mth = math`\theta`;
const fnTex = (f: string) => computedTex(`\\${f}`);
const SMALL = { x: { kind: 'real' as const, min: -2, max: 2 } };

// ---------------------------------------------------------------- limits of ratios

interface RatioP { top: 'sin' | 'tan'; a: number; b: number }

const ratioLimit = generator<RatioP>({
  id: 'ratio-limit',
  skill: 'Find the limit of sin(ax)/(bx) or tan(ax)/(bx) as x tends to 0, from sin(u)/u and tan(u)/u tending to 1.',
  quick: true,
  params: (rng) => {
    for (;;) {
      const p = { top: pick(rng, ['sin', 'tan'] as const), a: int(rng, 1, 9), b: int(rng, 1, 9) };
      if (p.a !== p.b) return p;
    }
  },
  sane: ({ a, b }) => (a > 0 && b > 0 ? null : 'out of range'),
  problem: ({ top, a, b }) => {
    const ans = q(a, b);
    return {
      prompt: t`Find ${math`\lim_{x \to ${0}} \frac{${fnTex(top)} ${a === 1 ? '' : a}x}{${b === 1 ? '' : b}x}`}, with ${math`x`} in radians.`,
      answer: { kind: 'exact', expected: str(ans) },
      solution: [
        t`Put ${math`u = ${a}x`}, which tends to ${0} with ${math`x`}: ${math`\frac{${fnTex(top)} ${a}x}{${b}x} = \frac{${fnTex(top)} u}{u} \cdot \frac{${a}x}{${b}x} = \frac{${fnTex(top)} u}{u} \cdot \frac{${a}}{${b}}`}.`,
        t`As ${math`u \to ${0}`}, ${math`\frac{${fnTex(top)} u}{u} \to ${1}`}, so the limit is ${math`${ans}`}.`,
      ],
    };
  },
  solve: ({ top, a, b }) => {
    // Evaluate at a tiny x and round to the nearest fraction with denominator b.
    const x = 1e-6;
    const v = (top === 'sin' ? Math.sin(a * x) : Math.tan(a * x)) / (b * x);
    return str(q(Math.round(v * b), b));
  },
  misconceptions: ({ a, b }): Misconception[] => [
    { response: str(q(b, a)), why: t`Upside down: near ${0}, ${math`\sin ${a}x \approx ${a}x`}, so the ratio is about ${math`\frac{${a}x}{${b}x}`}.` },
    { response: '1', why: t`${math`\frac{\sin u}{u} \to ${1}`} needs the same ${math`u`} on top and bottom. Here the bottom is ${math`${b}x`}, not ${math`${a}x`}.` },
    { response: '0', why: t`Top and bottom both tend to ${0}, but that does not make the ratio ${0}: ${math`\frac{${0}}{${0}}`} has no value, so compare how fast each goes to ${0}.` },
  ],
});

// ---------------------------------------------------------------- the cosine limit

interface CosP { a: number; b: number }

const cosLimit = generator<CosP>({
  id: 'cos-limit',
  skill: 'Find the limit of (1 - cos ax)/(b x^2) as x tends to 0, from cos u ~ 1 - u^2/2.',
  params: (rng) => ({ a: int(rng, 1, 6), b: int(rng, 1, 6) }),
  sane: ({ a, b }) => (a > 0 && b > 0 ? null : 'out of range'),
  problem: ({ a, b }) => {
    const ans = q(a * a, 2 * b);
    return {
      prompt: t`Using ${math`\cos u \approx ${1} - \frac{u^{${2}}}{${2}}`} for small ${math`u`}, find ${math`\lim_{x \to ${0}} \frac{${1} - \cos ${a === 1 ? '' : a}x}{${b === 1 ? '' : b}x^{${2}}}`}.`,
      answer: { kind: 'exact', expected: str(ans) },
      solution: [
        t`With ${math`u = ${a}x`}: ${math`${1} - \cos ${a}x \approx \frac{(${a}x)^{${2}}}{${2}} = \frac{${a * a}x^{${2}}}{${2}}`}.`,
        t`So the ratio is about ${math`\frac{${a * a}x^{${2}}/${2}}{${b}x^{${2}}} = ${ans}`}, and the error in the approximation is of order ${math`x^{${4}}`}, which vanishes after dividing by ${math`x^{${2}}`}. The limit is ${math`${ans}`}.`,
      ],
    };
  },
  solve: ({ a, b }) => {
    // Use the exact identity 1 - cos u = 2 sin^2(u/2) at a small x, avoiding cancellation, and round over 2b.
    const x = 1e-4;
    const v = (2 * Math.sin((a * x) / 2) ** 2) / (b * x * x);
    return str(q(Math.round(v * 2 * b), 2 * b));
  },
  misconceptions: ({ a, b }): Misconception[] => [
    { response: str(q(a, 2 * b)), why: t`Square the ${a} as well: ${math`(${a}x)^{${2}} = ${a * a}x^{${2}}`}.` },
    { response: str(q(a * a, b)), why: t`The approximation is ${math`${1} - \frac{u^{${2}}}{${2}}`}: keep the half.` },
    { response: '0', why: t`${math`${1} - \cos ${a}x`} tends to ${0}, but so does ${math`${b}x^{${2}}`}, at the same rate. Compare them.` },
  ],
});

// ---------------------------------------------------------------- an approximation to second order

interface ApproxP { a: number; b: number; c: number }

const approx2 = generator<ApproxP>({
  id: 'second-order',
  skill: 'Approximate a combination such as cos ax + b sin x + c tan x by a quadratic in x, for small x.',
  params: (rng) => ({ a: int(rng, 1, 5), b: int(rng, -4, 4), c: int(rng, -3, 3) }),
  sane: ({ a }) => (a > 0 ? null : 'out of range'),
  problem: ({ a, b, c }) => {
    const lin = b + c;
    const parts = [`\\cos ${a === 1 ? '' : a}x`];
    if (b !== 0) parts.push(`${b < 0 ? '-' : '+'} ${Math.abs(b) === 1 ? '' : Math.abs(b)}\\sin x`);
    if (c !== 0) parts.push(`${c < 0 ? '-' : '+'} ${Math.abs(c) === 1 ? '' : Math.abs(c)}\\tan x`);
    const expected = `1 + ${lin}x - ${a * a}x^2/2`;
    return {
      prompt: t`For small ${math`x`} (in radians), use the small angle approximations to write ${computedTex(parts.join(' '))} as ${math`p + qx + rx^{${2}}`}. Enter the quadratic in ${math`x`}.`,
      answer: { kind: 'expression', expected, variables: ['x'], domains: SMALL },
      solution: [
        t`${math`\cos ${a}x \approx ${1} - \frac{(${a}x)^{${2}}}{${2}} = ${1} - ${computedTex(a * a === 1 ? '' : String(a * a))}\frac{x^{${2}}}{${2}}`}, and ${math`\sin x \approx x`}, ${math`\tan x \approx x`}.`,
        t`So the expression is about ${math`${1} ${computedTex(lin === 0 ? '' : `${lin < 0 ? '-' : '+'} ${Math.abs(lin) === 1 ? '' : Math.abs(lin)}x`)} - ${q(a * a, 2)}x^{${2}}`}.`,
      ],
    };
  },
  solve: ({ a, b, c }) => {
    // Fit the quadratic from values at tiny x: constant, slope, and curvature by finite differences.
    const f = (x: number): number => Math.cos(a * x) + b * Math.sin(x) + c * Math.tan(x);
    const h = 1e-3;
    const p0 = f(0);
    const p1 = (f(h) - f(-h)) / (2 * h);
    const p2 = (f(h) - 2 * p0 + f(-h)) / (2 * h * h);
    return `${Math.round(p0)} + ${Math.round(p1)}x + ${Math.round(p2 * 2) / 2}x^2`;
  },
  misconceptions: ({ a, b, c }): Misconception[] => [
    { response: `1 + ${b + c}x - ${a}x^2/2`, why: t`In ${math`\cos ${a}x`} the whole of ${math`${a}x`} is squared: ${math`\frac{(${a}x)^{${2}}}{${2}}`}.` },
    { response: `1 + ${b + c}x - ${a * a}x^2`, why: t`${math`\cos u \approx ${1} - \frac{u^{${2}}}{${2}}`}: keep the half.` },
    { response: `${1 + b + c}x - ${a * a}x^2/2`, why: t`${math`\cos ${0} = ${1}`}: the constant term is ${1}, and it does not multiply ${math`x`}.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const a19iv = auto({
  id: 'a19-q1-iv',
  source: cite('step-f19', 'Q1(iv)'),
  title: t`The small angle approximation for cosine`,
  prompt: t`Use ${math`\cos^{${2}}\theta + \sin^{${2}}\theta = ${1}`}, the approximation ${math`\sin\theta \approx \theta`}, and the binomial expansion ${math`(${1} + u)^{n} = ${1} + nu + \ldots`} (valid for ${math`|u| < ${1}`} and any ${math`n`}) to find the approximation of ${math`\cos\theta`} for small ${mth}, up to the term in ${math`\theta^{${2}}`}. Write ${mth} as ${math`x`}.`,
  answer: { kind: 'expression', expected: '1 - x^2/2', variables: ['x'], domains: SMALL },
  solution: [
    t`For small ${mth}, ${math`\cos\theta > ${0}`}, so ${math`\cos\theta = (${1} - \sin^{${2}}\theta)^{\frac{${1}}{${2}}}`}.`,
    t`Expand with ${math`n = \frac{${1}}{${2}}`} and ${math`u = -\sin^{${2}}\theta`}: ${math`\cos\theta = ${1} - \frac{${1}}{${2}}\sin^{${2}}\theta + \ldots`}, where the dots are terms in ${math`\sin^{${4}}\theta`} and higher.`,
    t`With ${math`\sin\theta \approx \theta`} and terms in ${math`\theta^{${4}}`} ignored: ${math`\cos\theta \approx ${1} - \frac{\theta^{${2}}}{${2}}`}.`,
  ],
  reference: '1 - x^2/2',
  verify: () => {
    for (const x of [0.01, 0.05, 0.1]) if (Math.abs(Math.cos(x) - (1 - (x * x) / 2)) > (x ** 4) / 20) return `x = ${x}: error too big`;
    return null;
  },
  misconceptions: [{ response: '1 - x^2', why: t`The binomial expansion with ${math`n = \frac{${1}}{${2}}`} gives a half: ${math`${1} - \frac{${1}}{${2}}\sin^{${2}}\theta`}.` }],
  official: { source: cite('step-f19-hints', 'Q1(iv)'), answer: '1 - x^2/2', agrees: true },
});

const a19q1 = supervision({
  id: 'a19-q1',
  source: cite('step-f19', 'Q1(i), (ii), (iii), (v)'),
  title: t`${math`\frac{\sin\theta}{\theta} \to ${1}`} by comparing areas`,
  prompt: t`A circle has radius ${math`r`} and centre ${math`O`}; ${math`OBT`} is a right-angled triangle with the right angle at ${math`B`} on the circle, ${math`\angle BOT = \theta`} with ${math`${0} < \theta < \frac{\pi}{${2}}`}, and ${math`A`} is where ${math`OT`} meets the circle. (i) By considering the areas of triangle ${math`OBT`}, sector ${math`OBA`}, and triangle ${math`OBA`}, show that ${math`\frac{${1}}{\cos\theta} > \frac{\theta}{\sin\theta} > ${1}`}. (ii) Given ${math`\lim_{\theta \to ${0}} \frac{${1}}{\cos\theta} = ${1}`}, find ${math`\lim_{\theta \to ${0}} \frac{\theta}{\sin\theta}`}, with a brief justification, and give an approximation for ${math`\sin\theta`} when ${mth} is small. (iii) Show similarly that ${math`\lim_{\theta \to ${0}} \frac{\theta}{\tan\theta} = ${1}`}. (v) Where in your proofs did you assume that ${mth} is measured in radians?`,
  writeUp: 'proof',
  official: cite('step-f19-hints', 'Q1'),
});

const ss6 = auto({
  id: 'nst-ss6',
  source: cite('nst-workbook', 'SS6'),
  title: t`Composing small angle approximations`,
  prompt: t`Given that, for small ${mth}, ${math`\sin\theta \approx \theta - \frac{${1}}{${6}}\theta^{${3}}`} and ${math`\cos\theta \approx ${1} - \frac{${1}}{${2}}\theta^{${2}}`}, find an approximation, ignoring powers of ${mth} greater than ${3}, for ${math`\sin\left(\frac{${1}}{${2}}\theta\right)\cos\theta + \sec ${2}\theta`}, where ${math`\sec u = \frac{${1}}{\cos u}`}. Write ${mth} as ${math`x`}.`,
  answer: { kind: 'expression', expected: '1 + x/2 + 2x^2 - 13x^3/48', variables: ['x'], domains: SMALL },
  solution: [
    t`${math`\sin\frac{\theta}{${2}} \approx \frac{\theta}{${2}} - \frac{\theta^{${3}}}{${48}}`}. Multiply by ${math`\cos\theta \approx ${1} - \frac{\theta^{${2}}}{${2}}`}, keeping powers up to ${3}: ${math`\frac{\theta}{${2}} - \frac{\theta^{${3}}}{${48}} - \frac{\theta^{${3}}}{${4}} = \frac{\theta}{${2}} - \frac{${13}\theta^{${3}}}{${48}}`}.`,
    t`${math`\cos ${2}\theta \approx ${1} - ${2}\theta^{${2}}`}, so ${math`\sec ${2}\theta \approx (${1} - ${2}\theta^{${2}})^{-${1}} \approx ${1} + ${2}\theta^{${2}}`} by the binomial expansion; the next term is in ${math`\theta^{${4}}`}.`,
    t`Total: ${math`${1} + \frac{\theta}{${2}} + ${2}\theta^{${2}} - \frac{${13}}{${48}}\theta^{${3}}`}.`,
  ],
  reference: '1 + x/2 + 2x^2 - 13x^3/48',
  verify: () => {
    // The error should shrink like x^4: compare at x and x/2.
    const f = (x: number): number => Math.sin(x / 2) * Math.cos(x) + 1 / Math.cos(2 * x) - (1 + x / 2 + 2 * x * x - (13 * x ** 3) / 48);
    const r = f(0.02) / f(0.01);
    return r > 12 && r < 20 ? null : `error ratio ${r}`;
  },
  misconceptions: [{ response: '1 + x/2 + 2x^2 - x^3/48', why: t`The product with ${math`\cos\theta`} adds ${math`-\frac{\theta}{${2}} \cdot \frac{\theta^{${2}}}{${2}} = -\frac{\theta^{${3}}}{${4}}`} to the cube term.` }],
});

// STEP I 1999 Q5 and STEP I 2006 Q4 (STEP Questions Database): small angles at work. The part of
// 2006 Q4 done by differentiation is left out (differentiation is not a prerequisite).
const DB99 = 'stepdb-99-s1' as const;
const DB06 = 'stepdb-06-s1' as const;

const db99q5 = supervision({
  id: 'step99-q5',
  source: cite(DB99, 'Q5'),
  title: t`How far a satellite can be seen`,
  prompt: t`For this question, you may use the following approximations, valid if ${math`\theta`} is small: ${math`\sin\theta \approx \theta`} and ${math`\cos\theta \approx ${1} - \frac{\theta^{${2}}}{${2}}`}. A satellite ${math`X`} is directly above the point ${math`Y`} on the Earth's surface and can just be seen (on the horizon) from another point ${math`Z`} on the Earth's surface. The radius of the Earth is ${math`R`} and the height of the satellite above the Earth is ${math`h`}. (i) Find the distance ${math`d`} of ${math`Z`} from ${math`Y`} along the Earth's surface. (ii) If the satellite is in low orbit (so that ${math`h`} is small compared with ${math`R`}), show that ${math`d \approx k(Rh)^{\frac{${1}}{${2}}}`}, where ${math`k`} is to be found. (iii) If the satellite is very distant from the Earth (so that ${math`R`} is small compared with ${math`h`}), show that ${math`d \approx aR + b\frac{R^{${2}}}{h}`}, where ${math`a`} and ${math`b`} are to be found.`,
  writeUp: 'explanation',
});

/** The exact distance along the surface: R arccos(R/(R + h)). */
const horizon = (R: number, h: number): number => R * Math.acos(R / (R + h));

const db99q5k = auto({
  id: 'step99-q5-ii',
  source: cite(DB99, 'Q5(ii)'),
  title: t`A low satellite`,
  prompt: t`A satellite at height ${math`h`} above a point ${math`Y`} on the Earth (radius ${math`R`}) can just be seen from ${math`Z`}, at distance ${math`d`} from ${math`Y`} along the surface. If ${math`h`} is small compared with ${math`R`}, then ${math`d \approx k(Rh)^{\frac{${1}}{${2}}}`}. Find ${math`k`}, using ${math`\cos\theta \approx ${1} - \frac{\theta^{${2}}}{${2}}`}.`,
  answer: { kind: 'expression', expected: 'sqrt(2)', variables: [] },
  solution: [
    t`The line of sight ${math`ZX`} touches the Earth at ${math`Z`}, so it is at right angles to the radius ${math`OZ`}. In the right triangle ${math`OZX`}, ${math`OZ = R`} and ${math`OX = R + h`}, so the angle ${math`\theta = \angle ZOX`} has ${math`\cos\theta = \frac{R}{R + h}`}, and ${math`d = R\theta`}.`,
    t`For small ${math`h`}, ${mth} is small: ${math`${1} - \frac{\theta^{${2}}}{${2}} \approx \frac{R}{R + h}`}, so ${math`\theta^{${2}} \approx ${2}\left(${1} - \frac{R}{R + h}\right) = \frac{${2}h}{R + h} \approx \frac{${2}h}{R}`}.`,
    t`So ${math`d = R\theta \approx R\sqrt{\frac{${2}h}{R}} = \sqrt{${2}}\,(Rh)^{\frac{${1}}{${2}}}`}: ${math`k = \sqrt{${2}}`}.`,
  ],
  reference: 'sqrt(2)',
  verify: () => close('d / sqrt(Rh) for small h', horizon(6400, 0.001) / Math.sqrt(6400 * 0.001), Math.SQRT2, 1e-6),
  misconceptions: [
    { response: '2', why: t`${math`\theta^{${2}} \approx \frac{${2}h}{R}`}, so ${math`\theta \approx \sqrt{\frac{${2}h}{R}}`}: the ${2} stays under the square root.` },
    { response: '1', why: t`From ${math`\cos\theta \approx ${1} - \frac{\theta^{${2}}}{${2}}`} the half doubles back: ${math`\theta^{${2}} \approx ${2}(${1} - \cos\theta)`}.` },
  ],
});

const RH = { R: { kind: 'real' as const, min: 1, max: 2 }, h: { kind: 'real' as const, min: 1000, max: 5000 } };
const db99q5ab = auto({
  id: 'step99-q5-iii',
  source: cite(DB99, 'Q5(iii)', true),
  title: t`A distant satellite`,
  prompt: t`With ${math`d = R\theta`} and ${math`\cos\theta = \frac{R}{R + h}`} as for a satellite at height ${math`h`} above an Earth of radius ${math`R`}, suppose ${math`R`} is small compared with ${math`h`}. Find the approximation ${math`d \approx aR + b\frac{R^{${2}}}{h}`}: give the expression ${math`aR + b\frac{R^{${2}}}{h}`} with ${math`a`} and ${math`b`} found.`,
  answer: { kind: 'expression', expected: 'pi/2 * R - R^2/h', variables: ['R', 'h'], domains: RH },
  solution: [
    t`${math`\frac{R}{R + h}`} is small, so ${mth} is close to ${math`\frac{\pi}{${2}}`}. Write ${math`\theta = \frac{\pi}{${2}} - \phi`}; then ${math`\sin\phi = \cos\theta = \frac{R}{R + h}`}, and ${math`\phi`} is small.`,
    t`So ${math`\phi \approx \sin\phi = \frac{R}{R + h} \approx \frac{R}{h}`}, because ${math`R + h \approx h`}.`,
    t`${math`d = R\theta = R\left(\frac{\pi}{${2}} - \phi\right) \approx \frac{\pi}{${2}}R - \frac{R^{${2}}}{h}`}: ${math`a = \frac{\pi}{${2}}`} and ${math`b = -${1}`}.`,
  ],
  reference: 'pi/2 * R - R^2/h',
  verify: () => {
    // The approximation's error is of order R^3/h^2, far smaller than the R^2/h term.
    for (const [R, h] of [[1, 1e4], [2, 5e4]] as const) {
      const e = close(`R = ${R}, h = ${h}`, horizon(R, h), (Math.PI / 2) * R - (R * R) / h, (10 * R ** 3) / (h * h));
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [
    { response: 'pi/2 * R + R^2/h', why: t`${mth} is a little less than ${math`\frac{\pi}{${2}}`}: ${math`\theta = \frac{\pi}{${2}} - \phi`}, so the correction is subtracted.` },
    { response: 'pi * R - R^2/h', why: t`The angle is close to a right angle, ${math`\frac{\pi}{${2}}`}, not ${math`\pi`}: the tangent from far away touches near the quarter circle.` },
  ],
});

const db06q4 = supervision({
  id: 'step06-q4',
  source: cite(DB06, 'Q4', true),
  title: t`Polygons that fill their circle`,
  prompt: t`By sketching on the same axes the graphs of ${math`y = \sin x`} and ${math`y = x`}, show that, for ${math`x > ${0}`}: (i) ${math`x > \sin x`}; (ii) ${math`\frac{\sin x}{x} \approx ${1}`} for small ${math`x`}. A regular polygon has ${math`n`} sides, and perimeter ${math`P`}. Show that the area of the polygon is ${dmath`\frac{P^{${2}}}{${4}n\tan\left(\frac{\pi}{n}\right)}.`} Show also that, for large ${math`n`}, the ratio of the area of the polygon to the area of the smallest circle which can be drawn around the polygon is approximately ${1}. (The paper also asks you to show, by differentiation, that the area increases with ${math`n`} for fixed ${math`P`}; that part is left out here.)`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

const TH = 0.1;

export const smallAngles: TopicContent = {
  topicId: 'trig.small-angles',
  goal: t`Show ${math`\frac{\sin\theta}{\theta} \to ${1}`} by comparing areas, and use ${math`\sin\theta \approx \theta`}, ${math`\tan\theta \approx \theta`}, and ${math`\cos\theta \approx ${1} - \frac{\theta^{${2}}}{${2}}`} for small ${mth} in radians.`,
  objective: t`Prove that sine of a small angle is about the angle, and use the small angle approximations.`,
  why: t`They make limits and derivatives of sine and cosine possible, and STEP uses them to estimate.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`A surprising coincidence` },
    { kind: 'hook', text: t`Type ${math`\sin(${TH})`} into a calculator set to radians. You get ${Number(Math.sin(TH).toFixed(5))}, almost exactly ${TH}. Try ${math`\sin(${0.01})`}: ${Number(Math.sin(0.01).toFixed(7))}. For small angles, the sine is very nearly the angle itself. Coincidence, or a theorem?` },
    { kind: 'narrative', text: t`Picture a thin slice of a circle of radius ${1}: angle ${mth} at the centre. The arc has length ${mth}, by the definition of the radian, and ${math`\sin\theta`} is the height of the arc's end above the starting radius. For a thin slice the arc is almost straight and almost vertical, so the two lengths almost agree. To turn "almost" into a proof, trap the arc between two straight lines, using areas.` },
    { kind: 'section', title: t`The squeeze` },
    { kind: 'theorem', name: t`Area inequality`, statement: t`For ${math`${0} < \theta < \frac{\pi}{${2}}`} (in radians), ${math`\sin\theta < \theta < \tan\theta`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`The figure`, text: t`On a circle of radius ${math`r`} with centre ${math`O`}, take ${math`B`} on the circle and ${math`A`} on the circle with ${math`\angle BOA = \theta`}. Let the tangent at ${math`B`} meet the line ${math`OA`} at ${math`T`}, so ${math`\angle OBT`} is a right angle and ${math`BT = r\tan\theta`}.` },
        { label: t`Three regions, nested`, text: t`Triangle ${math`OBA`} lies inside sector ${math`OBA`}, which lies inside triangle ${math`OBT`}, so their areas increase:`, eq: [dmath`\tfrac{${1}}{${2}}r^{${2}}\sin\theta < \tfrac{${1}}{${2}}r^{${2}}\theta < \tfrac{${1}}{${2}}r \cdot r\tan\theta.`], why: { q: t`Where do the three areas come from?`, a: t`Triangle ${math`OBA`}: ${math`\frac{${1}}{${2}}ab\sin C`} with sides ${math`r, r`} and angle ${mth}. The sector: ${math`\frac{${1}}{${2}}r^{${2}}\theta`}, which needs ${mth} in radians. Triangle ${math`OBT`}: half base ${math`r`} times height ${math`r\tan\theta`}.` } },
        { label: t`Cancel`, text: t`Divide by ${math`\frac{${1}}{${2}}r^{${2}}`}, which is positive: ${math`\sin\theta < \theta < \tan\theta`}.` },
      ],
    },
    { kind: 'theorem', name: t`Small angle limits`, statement: t`With ${mth} in radians, ${math`\frac{\sin\theta}{\theta} \to ${1}`} and ${math`\frac{\tan\theta}{\theta} \to ${1}`} as ${math`\theta \to ${0}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Divide by sine`, text: t`For ${math`${0} < \theta < \frac{\pi}{${2}}`}, ${math`\sin\theta > ${0}`}, so dividing ${math`\sin\theta < \theta < \tan\theta`} by it keeps the order:`, eq: [dmath`${1} < \frac{\theta}{\sin\theta} < \frac{${1}}{\cos\theta}.`] },
        { label: t`Squeeze`, text: t`As ${math`\theta \to ${0}`}, ${math`\cos\theta \to ${1}`}, so ${math`\frac{${1}}{\cos\theta} \to ${1}`}. The ratio ${math`\frac{\theta}{\sin\theta}`} is trapped between ${1} and something tending to ${1}, so it tends to ${1}, and so does its reciprocal ${math`\frac{\sin\theta}{\theta}`}.`, plain: t`For negative ${mth}: ${math`\sin(-\theta) = -\sin\theta`}, so ${math`\frac{\sin(-\theta)}{-\theta} = \frac{\sin\theta}{\theta}`}. The ratio takes the same values on both sides of ${0}, so the limit is the same from both sides.` },
        { label: t`Tangent`, text: t`${math`\frac{\tan\theta}{\theta} = \frac{\sin\theta}{\theta} \cdot \frac{${1}}{\cos\theta} \to ${1} \cdot ${1} = ${1}`}.` },
      ],
    },
    { kind: 'definition', name: t`Small angle approximations`, formal: t`For small ${mth} in radians, the [[small-angle-approximation|small angle approximations]] are ${math`\sin\theta \approx \theta`}, ${math`\tan\theta \approx \theta`}, and ${math`\cos\theta \approx ${1} - \frac{\theta^{${2}}}{${2}}`}.`, plain: t`"About equal" here means the relative error tends to ${0} as ${mth} does. At ${math`\theta = ${TH}`}: ${math`\cos ${TH} \approx ${Number(Math.cos(TH).toFixed(6))}`} and ${math`${1} - \frac{${TH}^{${2}}}{${2}} = ${1 - (TH * TH) / 2}`}.` },
    { kind: 'p', text: t`The cosine approximation follows from the sine one. ${math`\cos\theta = \sqrt{${1} - \sin^{${2}}\theta}`} for small ${mth}, and ${math`\sqrt{${1} - u} \approx ${1} - \frac{u}{${2}}`} for small ${math`u`}, so ${math`\cos\theta \approx ${1} - \frac{\sin^{${2}}\theta}{${2}} \approx ${1} - \frac{\theta^{${2}}}{${2}}`}.`, why: { q: t`Why is ${math`\sqrt{${1} - u} \approx ${1} - \frac{u}{${2}}`}?`, a: t`${math`\left(${1} - \frac{u}{${2}}\right)^{${2}} = ${1} - u + \frac{u^{${2}}}{${4}}`}, which differs from ${math`${1} - u`} only by ${math`\frac{u^{${2}}}{${4}}`}, tiny when ${math`u`} is.` } },
    checkFrom(ratioLimit, { top: 'sin', a: 3, b: 5 }, t`${math`\sin ${3}x \approx ${3}x`} near ${0}.`),
    checkFrom(cosLimit, { a: 4, b: 1 }, t`${math`${1} - \cos ${4}x \approx \frac{${16}x^{${2}}}{${2}}`}.`),
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`${math`\sin\theta \approx \theta`} works in degrees too.`, counterexample: t`${math`\sin ${6}^\circ \approx ${Number(Math.sin((6 * Math.PI) / 180).toFixed(4))}`}, nowhere near ${6}. The sector area ${math`\frac{${1}}{${2}}r^{${2}}\theta`} in the proof is true only in radians; in degrees, ${math`\sin x^\circ \approx \frac{\pi x}{${180}}`}.` },
    { kind: 'pitfall', claim: t`${math`\frac{\sin\theta}{\theta} \to \frac{${0}}{${0}} = ${1}`}.`, counterexample: t`${math`\frac{${0}}{${0}}`} has no value: ${math`\frac{x}{x^{${2}}}`} and ${math`\frac{${2}x}{x}`} also have top and bottom tending to ${0}, but their limits are infinite and ${2}. The limit ${1} needs the squeeze.` },
    { kind: 'takeaway', text: t`Squeezing the sector between two triangles proves ${math`\frac{\sin\theta}{\theta} \to ${1}`} in radians, which gives ${math`\sin\theta \approx \theta`}, ${math`\tan\theta \approx \theta`}, and ${math`\cos\theta \approx ${1} - \frac{\theta^{${2}}}{${2}}`}.` },
  ],
  examples: [
    workedCambridge(a19iv),
    worked(approx2, { a: 2, b: 3, c: 0 }, t`A quadratic approximation`),
    worked(cosLimit, { a: 3, b: 2 }, t`A limit with cosine`),
  ],
  generators: [ratioLimit, cosLimit, approx2],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['small-angle-approximation'],
  cambridge: withUses([db99q5, db06q4, db99q5k, db99q5ab, a19q1, ss6], {
    'step99-q5': { sections: ['The squeeze'], note: t`Small angle approximations for how far a satellite can be seen` },
    'step06-q4': { sections: ['The squeeze'], note: t`Comparing a polygon with its circle for many sides` },
    'nst-ss6': { sections: ['The squeeze'], note: t`Combining small angle approximations to a given power` },
    'step99-q5-ii': { sections: ['The squeeze'], note: t`A small angle approximation for a low satellite` },
  }),
  // Best first: STEP I 1999 Q5 (the horizon of a satellite), STEP I 2006 Q4 without its
  // differentiation part, the NST Workbook's SS6, then the auto-checked 1999 Q5(ii).
  gate: ['step99-q5', 'step06-q4', 'nst-ss6', 'step99-q5-ii'],
  recall: [
    { front: t`State the small angle approximations.`, back: t`For small ${mth} in radians: ${math`\sin\theta \approx \theta`}, ${math`\tan\theta \approx \theta`}, ${math`\cos\theta \approx ${1} - \frac{\theta^{${2}}}{${2}}`}.` },
    { front: t`Which areas prove ${math`\sin\theta < \theta < \tan\theta`}?`, back: t`The triangle inside the sector inside the tangent triangle: ${math`\frac{${1}}{${2}}r^{${2}}\sin\theta < \frac{${1}}{${2}}r^{${2}}\theta < \frac{${1}}{${2}}r^{${2}}\tan\theta`}.` },
  ],
  proofOrder: [
    {
      title: t`The limit of ${math`\frac{\sin\theta}{\theta}`}`,
      steps: [
        t`Nest the triangle, the sector, and the tangent triangle, and compare their areas.`,
        t`Cancel to get ${math`\sin\theta < \theta < \tan\theta`}.`,
        t`Divide by ${math`\sin\theta`} to trap ${math`\frac{\theta}{\sin\theta}`} between ${1} and ${math`\frac{${1}}{\cos\theta}`}.`,
        t`Let ${mth} tend to ${0}: the bound tends to ${1}, so the ratio does too.`,
      ],
    },
  ],
};
