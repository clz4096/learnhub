/**
 * calc.stationary-points: where f'(x) = 0, why a smooth maximum or minimum must be one
 * (Fermat), and how to tell a maximum from a minimum by the sign of f' either side or by
 * f''. The Cambridge problems: STEP Support Foundation Assignment 7, Q1(i) (y = x + 1/x and
 * y = x - 1/x, with the Assignment 7 hints), Assignment 9, Q2(ii)(b), and the NST
 * Mathematics Workbook, D1, whose printed answers are compared in the content checks. The gate
 * adds STEP I 2015 Q7 and STEP I 1996 Q1 (STEP Questions Database) and STEP Support STEP 2
 * Equations and Inequalities Q4(i) (2010 STEP II Q7(i)).
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { div, int, mul, pick, q, str, sub, toFloat, type Rational } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { poly } from '../poly';
import { close, firstError, numDeriv, polyAt, polyDeriv, powerOfLinear } from '../prep-c';
import { computedMath as cm, dmath, math, t, type Rich } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

const F07 = 'step-f07' as const;
const F07H = 'step-f07-hints' as const;
const F09 = 'step-f09' as const;
const F09H = 'step-f09-hints' as const;
const NST = 'nst-workbook' as const;
const setKey = (xs: readonly Rational[]): string => xs.map(str).sort().join(',');


// ---------------------------------------------------------------- cubics with two turning points

/** y = s (x^3 - (3/2)(p + q)x^2 + 3pq x) + d, so y' = 3s(x - p)(x - q); p + q is even, so the coefficients are integers. */
interface CubicP { s: 1 | -1; p: number; q: number; d: number }
const cubic = ({ s, p, q: r, d }: CubicP): number[] => [s, (-s * 3 * (p + r)) / 2, s * 3 * p * r, d];
/** The x of the local maximum: the smaller root when the cubic rises first (s = 1), else the larger. */
const maxX = (c: CubicP): number => (c.s === 1 ? Math.min(c.p, c.q) : Math.max(c.p, c.q));
const minX = (c: CubicP): number => (c.s === 1 ? Math.max(c.p, c.q) : Math.min(c.p, c.q));
function cubicParams(rng: () => number): CubicP {
  for (;;) {
    const p = int(rng, -4, 4);
    const r = int(rng, -4, 4);
    if (p === r || (p + r) % 2 !== 0) continue;
    return { s: pick(rng, [1, -1] as const), p, q: r, d: int(rng, -9, 9) };
  }
}
/** The stationary x where the numerical slope vanishes and the numerical second difference is negative: a search, not the formula. */
function searchMax(c: number[]): number {
  for (let x = -10; x <= 10; x++) {
    const f = (u: number): number => polyAt(c, u);
    if (Math.abs(numDeriv(f, x)) < 1e-6 && f(x + 0.01) + f(x - 0.01) - 2 * f(x) < 0) return x;
  }
  return NaN;
}

const maxPoint = generator<CubicP>({
  id: 'local-max',
  skill: 'Find the stationary points of a cubic and decide which is the local maximum.',
  params: (rng) => {
    for (;;) {
      const c = cubicParams(rng);
      if (maxX(c) !== 0 && minX(c) !== -maxX(c)) return c;
    }
  },
  sane: (c) => (c.p !== c.q ? null : 'one stationary point only'),
  problem: (c) => {
    const co = cubic(c);
    const d1 = polyDeriv(co);
    return {
      prompt: t`Find the ${math`x`} coordinate of the local maximum of ${math`y = ${cm(poly(co))}`}.`,
      answer: { kind: 'exact', expected: String(maxX(c)) },
      solution: [
        t`Differentiate: ${math`\frac{dy}{dx} = ${cm(poly(d1))} = ${3 * c.s}(${cm(poly([1, -c.p]))})(${cm(poly([1, -c.q]))})`}, which is ${0} at ${math`x = ${c.p}`} and ${math`x = ${c.q}`}.`,
        t`${math`\frac{d^{${2}}y}{dx^{${2}}} = ${cm(poly(polyDeriv(d1)))}`}. At ${math`x = ${maxX(c)}`} it is ${polyAt(polyDeriv(d1), maxX(c))}, negative, so that point is a local maximum; at ${math`x = ${minX(c)}`} it is ${polyAt(polyDeriv(d1), minX(c))}, positive, a local minimum.`,
      ],
    };
  },
  solve: (c) => String(searchMax(cubic(c))),
  misconceptions: (c): Misconception[] => [
    { response: String(minX(c)), why: t`That is the local minimum: there ${math`\frac{d^{${2}}y}{dx^{${2}}} > ${0}`}, so the curve bends upwards. A maximum has ${math`\frac{d^{${2}}y}{dx^{${2}}} < ${0}`}.` },
    { response: String(-maxX(c)), why: t`Check the sign: the factor ${math`x - p`} is ${0} when ${math`x = p`}, not ${math`-p`}.` },
  ],
});

const minValue = generator<CubicP>({
  id: 'local-min-value',
  skill: 'Find the height of the local minimum of a cubic: locate it with dy/dx = 0, then substitute into y.',
  quick: true,
  params: (rng) => {
    for (;;) {
      const c = cubicParams(rng);
      const co = cubic(c);
      if (new Set([polyAt(co, minX(c)), polyAt(co, maxX(c)), minX(c)]).size === 3) return c;
    }
  },
  sane: (c) => (c.p !== c.q ? null : 'one stationary point only'),
  problem: (c) => {
    const co = cubic(c);
    return {
      prompt: t`Find the ${math`y`} coordinate of the local minimum of ${math`y = ${cm(poly(co))}`}.`,
      answer: { kind: 'exact', expected: String(polyAt(co, minX(c))) },
      solution: [
        t`${math`\frac{dy}{dx} = ${cm(poly(polyDeriv(co)))}`} is ${0} at ${math`x = ${c.p}`} and ${math`x = ${c.q}`}. The second derivative is positive at ${math`x = ${minX(c)}`}, so the minimum is there.`,
        t`Substitute: ${math`y = ${polyAt(co, minX(c))}`}.`,
      ],
    };
  },
  // The least value of y over a fine grid near the stationary points, rounded: the minimum found by looking.
  solve: (c) => {
    const co = cubic(c);
    const m = minX(c);
    let best = Infinity;
    for (let x = m - 0.5; x <= m + 0.5; x += 0.001) best = Math.min(best, polyAt(co, x));
    return String(Math.round(best));
  },
  misconceptions: (c): Misconception[] => [
    { response: String(polyAt(cubic(c), maxX(c))), why: t`That is the height of the local maximum. The minimum is where ${math`\frac{d^{${2}}y}{dx^{${2}}} > ${0}`}.` },
    { response: String(minX(c)), why: t`That is the ${math`x`} coordinate. Substitute it into ${math`y`} to get the height.` },
  ],
});

// ---------------------------------------------------------------- classify a stationary point

type Kind = 'max' | 'min' | 'neither';
type Shape = 'cubic' | 'cube' | 'fourth' | 'neg-fourth';
interface ClassP { shape: Shape; c: CubicP; p: number; k: number; atMax: boolean }
const OPTIONS: readonly ChoiceOption[] = [
  { id: 'max', label: t`a local maximum` },
  { id: 'min', label: t`a local minimum` },
  { id: 'neither', label: t`neither: a stationary point of inflection` },
];
function classCurve(p: ClassP): { coeffs: number[]; at: number; kind: Kind } {
  switch (p.shape) {
    case 'cubic': return { coeffs: cubic(p.c), at: p.atMax ? maxX(p.c) : minX(p.c), kind: p.atMax ? 'max' : 'min' };
    case 'cube': return { coeffs: powerOfLinear(p.p, 3).map((v, i) => (i === 3 ? v + p.k : v)), at: p.p, kind: 'neither' };
    case 'fourth': return { coeffs: powerOfLinear(p.p, 4).map((v, i) => (i === 4 ? v + p.k : v)), at: p.p, kind: 'min' };
    case 'neg-fourth': return { coeffs: powerOfLinear(p.p, 4).map((v, i) => -v + (i === 4 ? p.k : 0)), at: p.p, kind: 'max' };
  }
}
/** The kind by the sign of the slope just either side: the first derivative test, numerically. */
function slopeTest(coeffs: number[], a: number): Kind {
  const f = (x: number): number => polyAt(coeffs, x);
  const left = numDeriv(f, a - 0.01);
  const right = numDeriv(f, a + 0.01);
  if (left > 0 && right < 0) return 'max';
  if (left < 0 && right > 0) return 'min';
  return 'neither';
}
const WHY: Readonly<Record<Kind, Rich>> = {
  max: t`A local maximum needs the gradient to go from positive to negative. Check the sign of ${math`\frac{dy}{dx}`} just either side.`,
  min: t`A local minimum needs the gradient to go from negative to positive. Check the sign of ${math`\frac{dy}{dx}`} just either side.`,
  neither: t`A stationary inflection has the same sign of gradient on both sides. When ${math`\frac{d^{${2}}y}{dx^{${2}}} = ${0}`} the second derivative test says nothing, so look at the signs either side.`,
};

const classify = generator<ClassP>({
  id: 'classify',
  skill: 'Classify a stationary point as a maximum, a minimum, or neither, by the second derivative or by the sign of the gradient either side.',
  params: (rng) => ({
    shape: pick(rng, ['cubic', 'cubic', 'cube', 'fourth', 'neg-fourth'] as const),
    c: cubicParams(rng),
    p: int(rng, -3, 3),
    k: int(rng, -5, 5),
    atMax: rng() < 0.5,
  }),
  sane: () => null,
  problem: (p) => {
    const { coeffs, at, kind } = classCurve(p);
    const d1 = polyDeriv(coeffs);
    const d2 = polyDeriv(d1);
    const second = polyAt(d2, at);
    const f = (x: number): number => polyAt(d1, x);
    return {
      prompt: t`The curve ${math`y = ${cm(poly(coeffs))}`} has a stationary point at ${math`x = ${at}`}. Is it a local maximum, a local minimum, or neither?`,
      answer: { kind: 'choice', options: OPTIONS, correct: kind },
      solution: second !== 0
        ? [
          t`${math`\frac{dy}{dx} = ${cm(poly(d1))}`}, which is ${0} at ${math`x = ${at}`}, and ${math`\frac{d^{${2}}y}{dx^{${2}}} = ${cm(poly(d2))}`}, which is ${second} there.`,
          second < 0 ? t`Negative: the gradient is decreasing through ${0}, so the point is a local maximum.` : t`Positive: the gradient is increasing through ${0}, so the point is a local minimum.`,
        ]
        : [
          t`${math`\frac{dy}{dx} = ${cm(poly(d1))}`}, and the second derivative ${math`${cm(poly(d2))}`} is also ${0} at ${math`x = ${at}`}, so the second derivative test gives no answer.`,
          t`Look at the gradient either side instead: at ${math`x = ${at - 1}`} it is ${f(at - 1)} and at ${math`x = ${at + 1}`} it is ${f(at + 1)}. ${kind === 'neither' ? t`The sign does not change, so the point is a stationary point of inflection.` : kind === 'min' ? t`It goes from negative to positive, so the point is a local minimum.` : t`It goes from positive to negative, so the point is a local maximum.`}`,
        ],
    };
  },
  solve: (p) => {
    const { coeffs, at } = classCurve(p);
    return [slopeTest(coeffs, at)];
  },
  misconceptions: (p): Misconception[] => {
    const { kind } = classCurve(p);
    return (['max', 'min', 'neither'] as const).filter((k) => k !== kind).map((k) => ({ response: [k], why: WHY[kind] }));
  },
});

// ---------------------------------------------------------------- Cambridge problems

const reciprocalTurns = auto({
  id: 'a7-q1-i-plus',
  source: cite(F07, 'Assignment 7, Q1(i)(a)', true),
  title: t`The turning points of x plus its reciprocal`,
  prompt: t`Find the ${math`x`} coordinates of the turning points of ${math`y = x + \frac{${1}}{x}`} (for ${math`x \ne ${0}`}), and say which is a local maximum.`,
  answer: {
    kind: 'witness', count: 2, unordered: true, example: '-1, 1',
    check: (vals) => (setKey(vals) === setKey([q(-1), q(1)]) ? null : 'Solve 1 - 1/x^2 = 0.'),
  },
  solution: [
    t`Write ${math`\frac{${1}}{x} = x^{${-1}}`}, so ${math`\frac{dy}{dx} = ${1} - x^{${-2}} = ${1} - \frac{${1}}{x^{${2}}}`}.`,
    t`This is ${0} when ${math`x^{${2}} = ${1}`}, that is ${math`x = ${1}`} or ${math`x = ${-1}`}.`,
    t`${math`\frac{d^{${2}}y}{dx^{${2}}} = \frac{${2}}{x^{${3}}}`}: at ${math`x = ${1}`} it is ${2}, positive, a local minimum at ${math`(${1}, ${2})`}; at ${math`x = ${-1}`} it is ${-2}, a local maximum at ${math`(${-1}, ${-2})`}. The maximum is lower than the minimum: they are on different branches of the curve.`,
  ],
  reference: '-1, 1',
  verify: () => {
    const f = (x: number): number => x + 1 / x;
    return firstError(
      same('slope at 1 rounds to 0', Math.round(numDeriv(f, 1) * 1e6), 0),
      same('slope at -1 rounds to 0', Math.round(numDeriv(f, -1) * 1e6), 0),
      same('y(1)', f(1), 2),
      same('y(-1)', f(-1), -2),
    );
  },
  misconceptions: [{ response: '0, 1', why: t`The curve is not defined at ${math`x = ${0}`}. Solve ${math`${1} - \frac{${1}}{x^{${2}}} = ${0}`}: ${math`x^{${2}} = ${1}`}.` }],
});

const minusTurns = auto({
  id: 'a7-q1-i-minus',
  source: cite(F07, 'Assignment 7, Q1(i)(a)', true),
  title: t`Turning points of x minus its reciprocal`,
  prompt: t`How many turning points does ${math`y = x - \frac{${1}}{x}`} (for ${math`x \ne ${0}`}) have?`,
  nudge: t`Not quite. Crossing the axis is not turning; look at the sign of the gradient.`,
  hints: [
    t`What is ${math`\frac{dy}{dx}`}?`,
    t`Can ${math`${1} + \frac{${1}}{x^{${2}}}`} ever be ${0} for ${math`x \ne ${0}`}?`,
    t`So at how many points is the gradient zero?`,
  ],
  answer: { kind: 'exact', expected: '0' },
  solution: [
    t`${math`\frac{dy}{dx} = ${1} + \frac{${1}}{x^{${2}}}`}. Since ${math`x^{${2}} > ${0}`} for ${math`x \ne ${0}`}, this is always greater than ${1}, never ${0}.`,
    t`So there are no stationary points, and no turning points: the curve goes upwards everywhere on each branch.`,
    t`A turning point needs a zero gradient; check whether the derivative can vanish.`,
  ],
  reference: '0',
  verify: () => {
    let minSlope = Infinity;
    for (let x = -20; x <= 20; x += 0.01) if (Math.abs(x) > 1e-6) minSlope = Math.min(minSlope, numDeriv((u) => u - 1 / u, x));
    return same('the least slope exceeds 1', minSlope > 1, true);
  },
  misconceptions: [{ response: '2', why: t`${math`x - \frac{${1}}{x}`} crosses the axis twice, at ${math`x = \pm ${1}`}, but crossing is not turning: its gradient ${math`${1} + \frac{${1}}{x^{${2}}}`} is never ${0}.` }],
  official: { source: cite(F07H, 'Assignment 7 hints, Q1(i)(a)'), answer: '0', agrees: true },
});

const CUBIC = [1, 0, -12, 1];
const whichMax = auto({
  id: 'a9-q2-ii-b',
  source: cite(F09, 'Assignment 9, Q2(ii)(b)'),
  title: t`Which turning point is the maximum?`,
  prompt: t`The graph of ${math`y = ${cm(poly(CUBIC))}`} has turning points at ${math`x = ${-2}`} and ${math`x = ${2}`}. Which is the maximum?`,
  nudge: t`Not quite. Think about what the curve does for large positive ${math`x`}.`,
  hints: [
    t`For large positive ${math`x`}, which term dominates, and is ${math`y`} large and positive or large and negative?`,
    t`So after the last turning point, does the curve rise or fall?`,
    t`What does the second derivative say at each turning point?`,
  ],
  answer: { kind: 'choice', options: [{ id: 'left', label: t`the one at ${math`x = ${-2}`}` }, { id: 'right', label: t`the one at ${math`x = ${2}`}` }, { id: 'both', label: t`both are maxima` }], correct: 'left' },
  solution: [
    t`For large positive ${math`x`}, ${math`y`} is large and positive, so after the last turning point the curve goes up: the point at ${math`x = ${2}`} is the minimum.`,
    t`The curve rises to the other turning point and falls from it, so the maximum is at ${math`x = ${-2}`}. The second derivative ${math`${6}x`} agrees: ${-12} there.`,
    t`The end behaviour of a cubic orders its turning points.`,
  ],
  reference: ['left'],
  verify: () => same('second derivative at -2', polyAt(polyDeriv(polyDeriv(CUBIC)), -2), -12),
  misconceptions: [{ response: ['right'], why: t`For large ${math`x`} the ${math`x^{${3}}`} term wins, so ${math`y`} ends up rising. The last turning point, at ${math`x = ${2}`}, is therefore the minimum.` }],
  official: { source: cite(F09H, 'Assignment 9 hints, Q2(ii)(b)'), answer: ['left'], agrees: true },
});

const D1ii = [1, 0, -3, 3];
const nstD1 = auto({
  id: 'nst-d1-ii',
  source: cite(NST, 'Differentiation, D1(ii)'),
  title: t`Stationary points of a cubic`,
  prompt: t`Find the ${math`y`} coordinates of the stationary points of ${math`y = ${cm(poly(D1ii))}`}: the local maximum first, then the local minimum.`,
  nudge: t`Not quite. Find ${math`x`} from ${math`\frac{dy}{dx} = ${0}`}, classify each point, then substitute into ${math`y`}.`,
  hints: [
    t`What is ${math`\frac{dy}{dx}`}, and where is it ${0}?`,
    t`Which of those points is the maximum, by the sign of ${math`\frac{d^{${2}}y}{dx^{${2}}}`}?`,
    t`What are the ${math`y`} values at those ${math`x`}?`,
  ],
  answer: { kind: 'witness', count: 2, example: '5, 1', check: (vals) => (vals.map(str).join(',') === '5,1' ? null : 'Find x from dy/dx = 0, then substitute into y.') },
  solution: [
    t`${math`\frac{dy}{dx} = ${cm(poly(polyDeriv(D1ii)))}`} is ${0} at ${math`x = \pm ${1}`}. ${math`\frac{d^{${2}}y}{dx^{${2}}} = ${6}x`}: negative at ${math`x = ${-1}`}, positive at ${math`x = ${1}`}.`,
    t`So the maximum is at ${math`(${-1}, ${polyAt(D1ii, -1)})`} and the minimum at ${math`(${1}, ${polyAt(D1ii, 1)})`}.`,
    t`Solve for the stationary x, classify, then substitute for y.`,
  ],
  reference: '5, 1',
  verify: () => firstError(same('y(-1)', polyAt(D1ii, -1), 5), same('y(1)', polyAt(D1ii, 1), 1), same('slope at 1', polyAt(polyDeriv(D1ii), 1), 0)),
  misconceptions: [{ response: '1, 5', why: t`The maximum comes first. It is at ${math`x = ${-1}`}, where the second derivative ${math`${6}x`} is negative, with height ${5}.` }],
  official: { source: cite(NST, 'Answers to Section 1, D1(ii)'), answer: '5, 1', agrees: true },
});

const D1iii = [1, -3, 3, 0];
const nstD1iii = auto({
  id: 'nst-d1-iii',
  source: cite(NST, 'Differentiation, D1(iii)'),
  title: t`A stationary point that is neither`,
  prompt: t`Classify the stationary point of ${math`y = ${cm(poly(D1iii))}`}.`,
  nudge: t`Not quite. Check the sign of the gradient on both sides of the stationary point.`,
  hints: [
    t`What is ${math`\frac{dy}{dx}`}, written as a multiple of a square?`,
    t`Where is ${math`\frac{dy}{dx} = ${0}`}?`,
    t`What sign does ${math`\frac{dy}{dx}`} have just left and just right of that point?`,
  ],
  answer: { kind: 'choice', options: OPTIONS, correct: 'neither' },
  solution: [
    t`${math`\frac{dy}{dx} = ${cm(poly(polyDeriv(D1iii)))} = ${3}(x - ${1})^{${2}}`}, which is ${0} only at ${math`x = ${1}`}, where ${math`y = ${polyAt(D1iii, 1)}`}.`,
    t`${math`${3}(x - ${1})^{${2}} \ge ${0}`} on both sides of ${math`x = ${1}`}: the curve rises, pauses, and rises again. So ${math`(${1}, ${1})`} is a stationary point of inflection.`,
    t`A gradient that keeps its sign through zero gives a stationary point of inflection.`,
  ],
  reference: ['neither'],
  verify: () => same('slope test at 1', slopeTest(D1iii, 1), 'neither'),
  misconceptions: [{ response: ['min'], why: t`The gradient ${math`${3}(x - ${1})^{${2}}`} is positive on both sides of ${math`x = ${1}`}, so the curve keeps rising: no minimum.` }],
  official: { source: cite(NST, 'Answers to Section 1, D1(iii)'), answer: ['neither'], agrees: true },
});

// STEP I 2015 Q7 and STEP I 1996 Q1 (STEP Questions Database), and STEP Support STEP 2
// Equations and Inequalities Q4(i) (2010 STEP II Q7(i)).
const DB15 = 'stepdb-15-s1' as const;
const DB96 = 'stepdb-96-s1' as const;
const EQNS = 'step-s2-eqns' as const;
const EQNSS = 'step-s2-eqns-solutions' as const;

const db15q7 = supervision({
  id: 'step15-q7',
  source: cite(DB15, 'Q7'),
  title: t`The greatest value on an interval, as the cubic changes`,
  prompt: t`Let ${dmath`f(x) = ${3}ax^{${2}} - ${6}x^{${3}}`} and, for each real number ${math`a`}, let ${math`M(a)`} be the greatest value of ${math`f(x)`} in the interval ${math`-\frac{${1}}{${3}} \le x \le ${1}`}. Determine ${math`M(a)`} for ${math`a \ge ${0}`}. (The formula for ${math`M(a)`} is different in different ranges of ${math`a`}; you will need to identify three ranges.)`,
  hints: [
    t`Where are the stationary points of ${math`f`}, and which is a maximum for ${math`a > ${0}`}?`,
    t`For which ${math`a`} does the maximum at ${math`x = \frac{a}{${3}}`} lie in the interval, and what are the values of ${math`f`} at the two ends?`,
    t`Comparing the stationary value with the end values, at which values of ${math`a`} does the greatest one change?`,
  ],
  writeUp: 'explanation',
  official: cite('stepdb-15-hs', 'STEP I, Q7 (page 6)'),
});

/** M(a): the greatest of f at -1/3, at 1, and at the stationary point a/3 when it lies in the interval, exactly. */
const M15 = (a: Rational): Rational => {
  const f = (x: Rational): Rational => sub(mul(q(3), mul(a, mul(x, x))), mul(q(6), mul(x, mul(x, x))));
  const xs = [q(-1, 3), q(1)];
  const s = div(a, q(3));
  if (toFloat(s) >= -1 / 3 && toFloat(s) <= 1) xs.push(s);
  return xs.map(f).reduce((m, v) => (toFloat(v) > toFloat(m) ? v : m));
};
const A15: readonly Rational[] = [q(1), q(5, 2), q(4)];

const db15q7values = auto({
  id: 'step15-q7-values',
  source: cite(DB15, 'Q7', true),
  title: t`Three values of ${math`M(a)`}`,
  prompt: t`Let ${math`f(x) = ${3}ax^{${2}} - ${6}x^{${3}}`} and let ${math`M(a)`} be the greatest value of ${math`f(x)`} for ${math`-\frac{${1}}{${3}} \le x \le ${1}`}. Find ${math`M(a)`} for each value of ${math`a`}.`,
  nudge: t`Not quite. Compare the stationary value with both end values, and check that the stationary point is inside the interval.`,
  hints: [
    t`What is ${math`f'(x)`}, and where is it ${0}?`,
    t`Is ${math`x = \frac{a}{${3}}`} inside the interval for each given ${math`a`}?`,
    t`For each ${math`a`}, which is largest: ${math`f`} at ${math`-\frac{${1}}{${3}}`}, ${math`f`} at ${1}, or ${math`f`} at ${math`\frac{a}{${3}}`} when it is inside?`,
  ],
  answer: {
    kind: 'table',
    cell: 'exact',
    columns: [t`${math`a`}`, t`${math`M(a)`}`],
    rows: A15.map((a) => [t`${a}`, null]),
    expected: A15.map((a) => str(M15(a))),
  },
  solution: [
    t`${math`f'(x) = ${6}ax - ${18}x^{${2}} = ${6}x(a - ${3}x)`}, so the stationary points are ${math`x = ${0}`} (a minimum for ${math`a > ${0}`}) and ${math`x = \frac{a}{${3}}`}, a maximum, with ${math`f\left(\frac{a}{${3}}\right) = \frac{a^{${3}}}{${9}}`}. It lies in the interval when ${math`a \le ${3}`}.`,
    t`The ends: ${math`f\left(-\frac{${1}}{${3}}\right) = \frac{a}{${3}} + \frac{${2}}{${9}}`} and ${math`f(${1}) = ${3}a - ${6}`}.`,
    t`${math`\frac{a^{${3}}}{${9}} \ge \frac{a}{${3}} + \frac{${2}}{${9}}`} exactly when ${math`a^{${3}} - ${3}a - ${2} \ge ${0}`}, that is ${math`(a - ${2})(a + ${1})^{${2}} \ge ${0}`}, that is ${math`a \ge ${2}`}. For ${math`a \ge ${3}`}, ${math`f`} increases on ${math`[${0}, ${1}]`} and ${math`${3}a - ${6} \ge \frac{a}{${3}} + \frac{${2}}{${9}}`}.`,
    t`So ${math`M(a) = \frac{a}{${3}} + \frac{${2}}{${9}}`} for ${math`${0} \le a \le ${2}`}, ${math`\frac{a^{${3}}}{${9}}`} for ${math`${2} \le a \le ${3}`}, and ${math`${3}a - ${6}`} for ${math`a \ge ${3}`}: ${math`M(${1}) = ${M15(q(1))}`}, ${math`M\left(${q(5, 2)}\right) = ${M15(q(5, 2))}`}, ${math`M(${4}) = ${M15(q(4))}`}.`,
    t`The greatest value on an interval is at a stationary point inside it or at an end.`,
  ],
  reference: A15.map((a) => str(M15(a))),
  verify: () => {
    // A grid search for the maximum agrees with the three-range formula at many a.
    const formula = (a: number): number => (a <= 2 ? a / 3 + 2 / 9 : a <= 3 ? a ** 3 / 9 : 3 * a - 6);
    for (let i = 0; i <= 60; i++) {
      const a = i / 10;
      let best = -Infinity;
      for (let j = 0; j <= 40000; j++) {
        const x = -1 / 3 + (j / 40000) * (4 / 3);
        best = Math.max(best, 3 * a * x * x - 6 * x ** 3);
      }
      const e = close(`M(${a})`, best, formula(a), 1e-6) ?? close(`exact M(${a})`, toFloat(M15(q(i, 10))), formula(a), 1e-12);
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [
    { response: ['1/9', '125/72', '64/9'], why: t`The stationary value ${math`\frac{a^{${3}}}{${9}}`} is only a candidate when ${math`\frac{a}{${3}}`} is in the interval, and it must beat the ends: at ${math`a = ${1}`} the end ${math`x = -\frac{${1}}{${3}}`} gives more, and at ${math`a = ${4}`} the point ${math`\frac{${4}}{${3}}`} is outside.` },
  ],
});

const db96q1 = supervision({
  id: 'step96-q1',
  source: cite(DB96, 'Q1'),
  title: t`The best biscuit tin`,
  prompt: t`A cylindrical biscuit tin has volume ${math`V`} and surface area ${math`S`} (including the ends). Show that the minimum possible surface area for a given value of ${math`V`} is ${math`S = ${3}(${2}\pi V^{${2}})^{\frac{${1}}{${3}}}`}. For this value of ${math`S`} show that the volume of the largest sphere which can fit inside the tin is ${math`\frac{${2}}{${3}}V`}, and find the volume of the smallest sphere into which the tin fits.`,
  hints: [
    t`With radius ${math`r`} and height ${math`h`}, how is ${math`S`} written in terms of ${math`r`} and ${math`V`} alone?`,
    t`Where is ${math`\frac{dS}{dr} = ${0}`}, and what does it give for ${math`h`} in terms of ${math`r`}?`,
    t`For the spheres, which dimension limits the sphere inside, and how far is a rim from the centre of the tin?`,
  ],
  writeUp: 'proof',
});

const db96q1sphere = auto({
  id: 'step96-q1-sphere',
  source: cite(DB96, 'Q1'),
  title: t`The smallest sphere round the best tin`,
  prompt: t`A closed cylindrical tin of volume ${math`V`} has the least possible surface area for that volume. Find the volume of the smallest sphere into which the tin fits, as a multiple of ${math`V`}.`,
  nudge: t`Not quite. Find the shape of the best tin first, then the distance from its centre to a rim.`,
  hints: [
    t`Writing ${math`S`} in terms of ${math`r`} and ${math`V`}, where is ${math`\frac{dS}{dr} = ${0}`}?`,
    t`What is ${math`h`} in terms of ${math`r`} for the best tin?`,
    t`How far is the centre of the tin from a point on a rim?`,
  ],
  answer: { kind: 'expression', expected: '4 sqrt(2)/3 * V', variables: ['V'], domains: { V: { kind: 'real', min: 1, max: 10 } } },
  solution: [
    t`With radius ${math`r`} and height ${math`h`}: ${math`V = \pi r^{${2}}h`}, so ${math`S = ${2}\pi r^{${2}} + ${2}\pi rh = ${2}\pi r^{${2}} + \frac{${2}V}{r}`}.`,
    t`${math`\frac{dS}{dr} = ${4}\pi r - \frac{${2}V}{r^{${2}}} = ${0}`} when ${math`r^{${3}} = \frac{V}{${2}\pi}`}; ${math`\frac{d^{${2}}S}{dr^{${2}}} = ${4}\pi + \frac{${4}V}{r^{${3}}} > ${0}`}, so this is the minimum. Then ${math`h = \frac{V}{\pi r^{${2}}} = \frac{${2}\pi r^{${3}}}{\pi r^{${2}}} = ${2}r`}: the best tin is as tall as it is wide.`,
    t`The smallest sphere round it passes through the rims, so its radius is the distance from the centre of the tin to a rim: ${math`\sqrt{r^{${2}} + r^{${2}}} = \sqrt{${2}}\,r`}.`,
    t`Its volume is ${math`\frac{${4}}{${3}}\pi(\sqrt{${2}}r)^{${3}} = \frac{${4}}{${3}}\pi \cdot ${2}\sqrt{${2}}\,r^{${3}} = \frac{${8}\sqrt{${2}}}{${3}}\pi \cdot \frac{V}{${2}\pi} = \frac{${4}\sqrt{${2}}}{${3}}V`}.`,
    t`Optimise first, then read the geometry off the best shape.`,
  ],
  reference: '4 sqrt(2)/3 * V',
  verify: () => {
    // Search the radius that minimises S for V = 1, then the circumscribed sphere, by numbers.
    let best = Infinity;
    let r0 = 0;
    for (let i = 1; i <= 200000; i++) {
      const r = i / 100000;
      const S = 2 * Math.PI * r * r + 2 / r;
      if (S < best) { best = S; r0 = r; }
    }
    const h = 1 / (Math.PI * r0 * r0);
    const R = Math.sqrt(r0 * r0 + (h / 2) ** 2);
    return close('S', best, 3 * Math.cbrt(2 * Math.PI), 1e-6)
      ?? close('inscribed sphere', (4 / 3) * Math.PI * Math.min(r0, h / 2) ** 3, 2 / 3, 1e-3)
      ?? close('circumscribed sphere', (4 / 3) * Math.PI * R ** 3, (4 * Math.SQRT2) / 3, 1e-3);
  },
  misconceptions: [
    { response: '2/3 * V', why: t`That is the largest sphere inside the tin. The smallest sphere outside it must reach the rims, at distance ${math`\sqrt{${2}}\,r`} from the centre.` },
    { response: '10 sqrt(5)/3 * V', why: t`The centre of the sphere is the centre of the tin, halfway up: the rim is ${math`r`} along and ${math`\frac{h}{${2}} = r`} up, so the radius is ${math`\sqrt{${2}}\,r`}, not ${math`\sqrt{r^{${2}} + h^{${2}}}`}.` },
  ],
});

const eqns4 = supervision({
  id: 's2eqns-q4-i',
  source: cite(EQNS, 'Q4(i) (2010 STEP II Q7(i))'),
  title: t`A cubic that crosses once`,
  prompt: t`By considering the positions of its turning points, show that the curve with equation ${dmath`y = x^{${3}} - ${3}qx - q(${1} + q),`} where ${math`q > ${0}`} and ${math`q \ne ${1}`}, crosses the ${math`x`}-axis once only.`,
  hints: [
    t`Where are the turning points of the curve?`,
    t`What are the ${math`y`} values at those turning points, written to show their signs?`,
    t`If both turning values have the same sign, how many times can the curve cross the ${math`x`}-axis, and where does ${math`q \ne ${1}`} matter?`,
  ],
  writeUp: 'proof',
  official: cite(EQNSS, 'Q4(i)'),
});

const cubicTex = cm(poly(CUBIC));
// Rule 1 (2026-10-08): set here from calc.derivatives, the earliest topic that teaches everything it needs.
const sketch = supervision({
  id: 'a9-q2-ii',
  source: cite(F09, 'Assignment 9, Q2(ii)'),
  title: t`Sketch the cubic and count its roots`,
  prompt: t`Consider the graph of ${math`y = ${cubicTex}`}. Find the ${math`x`} coordinates of the turning points; by considering the shape of the graph, state which is the maximum and which the minimum; find where the graph meets the ${math`y`} axis; find the ${math`y`} coordinates of the turning points and sketch the graph. How many real roots does ${math`${cubicTex} = ${0}`} have? Do not find the roots.`,
  hints: [
    t`What is ${math`\frac{dy}{dx}`}, and where is it ${0}?`,
    t`Which turning point is the maximum, and what are the heights of both?`,
    t`Where does the curve meet the ${math`y`} axis, and how many times does it cross the ${math`x`} axis?`,
  ],
  writeUp: 'sketch',
  official: cite(F09H, 'Assignment 9 hints, Q2(ii)'),
});

// ---------------------------------------------------------------- lesson

const EX: CubicP = { s: 1, p: -2, q: 2, d: 1 };
/** The hook's cubic, x^3 - 27x + 5: not one of the Cambridge cubics this topic cites. */
const HOOK: CubicP = { s: 1, p: -3, q: 3, d: 5 };

export const stationaryPoints: TopicContent = {
  topicId: 'calc.stationary-points',
  goal: t`Find the stationary points of a curve from ${math`f'(x) = ${0}`}, and tell maxima from minima by the sign of ${math`f'`} either side or by ${math`f''`}.`,
  objective: t`Find where a curve is level and decide whether each point is a maximum, a minimum, or neither.`,
  why: t`Turning points are the skeleton of every sketch, and of every optimisation question on STEP.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`Where the curve is level` },
    { kind: 'hook', text: t`At the very top of a hill the ground is level for a moment: one step further and you are going down. The curve ${math`y = ${cm(poly(cubic(HOOK)))}`} rises, falls, then rises again. Where exactly does it turn, and how could you know without drawing it?` },
    { kind: 'narrative', text: t`The derivative measures the gradient. Going up, the gradient is positive; going down, negative. At the moment the curve turns from one to the other, it is neither: the gradient is ${0}. That suggests a plan: solve ${math`f'(x) = ${0}`}.` },
    { kind: 'definition', name: t`Stationary point`, formal: t`Let ${math`f`} be differentiable. A point ${math`a`} with ${math`f'(a) = ${0}`} is a [[stationary-point|stationary point]] of ${math`f`}, and ${math`(a, f(a))`} a stationary point of the curve ${math`y = f(x)`}.`, plain: t`A place where the tangent is horizontal. For ${math`y = x^{${2}}`}, ${math`\frac{dy}{dx} = ${2}x`} is ${0} at ${math`x = ${0}`}: the bottom of the bowl.` },
    { kind: 'definition', name: t`Local maximum and minimum`, formal: t`${math`f`} has a [[local-maximum|local maximum]] at ${math`a`} if there is ${math`\delta > ${0}`} with ${math`f(x) \le f(a)`} whenever ${math`|x - a| < \delta`}; a local minimum if ${math`f(x) \ge f(a)`} whenever ${math`|x - a| < \delta`}. Either is a turning point.`, plain: t`Higher (or lower) than every nearby point, though not necessarily than every point. The letter ${math`\delta`} is just how near "nearby" is, say ${q(1, 10)}.` },
    { kind: 'theorem', name: t`Turning points are stationary`, statement: t`If ${math`f`} is differentiable at ${math`a`} and has a local maximum or local minimum at ${math`a`}, then ${math`f'(a) = ${0}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Set up`, text: t`Take a local maximum (a minimum is the same with the inequalities reversed). For ${math`${0} < |h| < \delta`}, ${math`f(a + h) - f(a) \le ${0}`}.`, plain: t`Nearby points are no higher, so the rise to them is never positive.` },
        { label: t`Steps to the right`, text: t`For ${math`h > ${0}`} the chord quotient ${math`\frac{f(a + h) - f(a)}{h} \le ${0}`}, so its limit ${math`f'(a) \le ${0}`}.`, why: { q: t`Why does the limit keep the inequality?`, a: t`If every quotient is at most ${0}, the number they approach cannot be positive: a positive limit would force quotients near it to be positive too.` } },
        { label: t`Steps to the left`, text: t`For ${math`h < ${0}`} we divide a non-positive number by a negative one, so the quotient is ${math`\ge ${0}`}, and ${math`f'(a) \ge ${0}`}.` },
        { label: t`Combine`, text: t`${math`f'(a) \le ${0}`} and ${math`f'(a) \ge ${0}`}, so ${math`f'(a) = ${0}`}.` },
      ],
    },
    { kind: 'pitfall', claim: t`Every stationary point is a maximum or a minimum.`, counterexample: t`${math`y = x^{${3}}`} has ${math`\frac{dy}{dx} = ${3}x^{${2}} = ${0}`} at ${math`x = ${0}`}, but it rises on both sides. The theorem goes one way only: turning points are stationary, not the other way round.` },
    { kind: 'section', title: t`Maximum, minimum, or neither?` },
    { kind: 'narrative', text: t`So a stationary point might be a peak, a dip, or a pause on the way up. Two tests sort them. The first looks at the gradient just either side; the second asks whether the gradient is increasing or decreasing as it passes through ${0}. For that, differentiate twice: the derivative of ${math`f'`} is the second derivative, written ${math`f''`} or ${math`\frac{d^{${2}}y}{dx^{${2}}}`}. For ${math`f(x) = x^{${3}}`}, ${math`f'(x) = ${3}x^{${2}}`} and ${math`f''(x) = ${6}x`}.` },
    { kind: 'theorem', name: t`First derivative test`, statement: t`Let ${math`f'(a) = ${0}`}. If ${math`f' > ${0}`} just to the left of ${math`a`} and ${math`f' < ${0}`} just to the right, ${math`f`} has a local maximum at ${math`a`}; if ${math`f' < ${0}`} then ${math`f' > ${0}`}, a local minimum; if ${math`f'`} has the same sign on both sides, neither, and ${math`a`} is a stationary point of inflection.` },
    { kind: 'p', text: t`Read it from the picture: a positive gradient means the curve is climbing, so climbing into ${math`a`} and falling out of it makes ${math`a`} a peak. A full proof needs the mean value theorem, which you meet in analysis; here we use the test as stated.` },
    { kind: 'theorem', name: t`Second derivative test`, statement: t`Let ${math`f'(a) = ${0}`} and let ${math`f''(a)`} exist. If ${math`f''(a) < ${0}`}, ${math`f`} has a local maximum at ${math`a`}; if ${math`f''(a) > ${0}`}, a local minimum. If ${math`f''(a) = ${0}`}, the test gives no answer.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Read the second derivative as a limit`, text: t`${math`f''(a) = \lim_{h \to ${0}} \frac{f'(a + h) - f'(a)}{h} = \lim_{h \to ${0}} \frac{f'(a + h)}{h}`}, since ${math`f'(a) = ${0}`}.` },
        { label: t`Take f''(a) negative`, text: t`Then ${math`\frac{f'(a + h)}{h} < ${0}`} for all small ${math`h \ne ${0}`}.`, why: { q: t`Why for all small ${math`h`}?`, a: t`The quotients approach a negative number, so once ${math`h`} is close enough to ${0} they are all within half that number of it, and so negative.` } },
        { label: t`Read off the signs`, text: t`So ${math`f'(a + h)`} has the opposite sign to ${math`h`}: positive just left of ${math`a`}, negative just right.` },
        { label: t`Apply the first test`, text: t`By the first derivative test, ${math`a`} is a local maximum. The case ${math`f''(a) > ${0}`} is the mirror image.` },
      ],
    },
    { kind: 'narrative', text: t`Back to the hook. For ${math`y = ${cm(poly(cubic(HOOK)))}`}, ${math`\frac{dy}{dx} = ${cm(poly(polyDeriv(cubic(HOOK))))}`} is ${0} when ${math`x^{${2}} = ${9}`}, at ${math`x = \pm ${3}`}. Differentiating again, ${math`\frac{d^{${2}}y}{dx^{${2}}} = ${6}x`}, which is ${-18} at ${math`x = ${-3}`} (negative: a maximum) and ${18} at ${math`x = ${3}`} (positive: a minimum). So there is a maximum at ${math`(${-3}, ${polyAt(cubic(HOOK), -3)})`} and a minimum at ${math`(${3}, ${polyAt(cubic(HOOK), 3)})`}.` },
    checkFrom(classify, { shape: 'fourth', c: EX, p: 1, k: 2, atMax: false }, t`The second derivative is ${0} at ${math`x = ${1}`}, so look either side: the gradient ${math`${4}(x - ${1})^{${3}}`} goes from negative to positive, a local minimum.`),
    { kind: 'pitfall', claim: t`If ${math`f'(a) = ${0}`} and ${math`f''(a) = ${0}`}, then ${math`a`} is a point of inflection.`, counterexample: t`${math`y = x^{${4}}`} has both derivatives ${0} at ${math`x = ${0}`}, yet ${math`x^{${4}} \ge ${0}`} everywhere: it is a minimum. When ${math`f''(a) = ${0}`}, use the first derivative test.` },
    { kind: 'takeaway', text: t`Solve ${math`f'(x) = ${0}`} to find the stationary points; classify each by the sign of ${math`f''`}, or, when ${math`f'' = ${0}`}, by the sign of ${math`f'`} either side.` },
  ],
  examples: [
    { ...workedCambridge(reciprocalTurns), examiner: t`The examiner wants the derivative of ${math`x^{${-1}}`} done correctly, both roots of ${math`x^{${2}} = ${1}`}, and each point's nature justified, not guessed.` },
    worked(maxPoint, { s: -1, p: -1, q: 3, d: 2 }, t`A cubic that falls first`),
    worked(classify, { shape: 'cube', c: EX, p: 2, k: -1, atMax: false }, t`When the second derivative test fails`),
  ],
  generators: [maxPoint, minValue, classify],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['stationary-point', 'local-maximum'],
  cambridge: withUses([db15q7, db96q1, eqns4, db15q7values, db96q1sphere, minusTurns, whichMax, nstD1, nstD1iii, sketch], {
    'a9-q2-ii': { sections: ['Maximum, minimum, or neither?'], note: t`Turning points and the shape of a cubic` },
    'step15-q7': { sections: ['Where the curve is level', 'Maximum, minimum, or neither?'], note: t`The greatest value on an interval as a parameter moves the turning points` },
    'step96-q1': { sections: ['Where the curve is level', 'Maximum, minimum, or neither?'], note: t`Minimising surface area for a fixed volume` },
    's2eqns-q4-i': { sections: ['Where the curve is level', 'Maximum, minimum, or neither?'], note: t`Using the heights of the turning points to count crossings` },
    'step15-q7-values': { sections: ['Where the curve is level', 'Maximum, minimum, or neither?'], note: t`The greatest value on an interval for given parameters` },
    'step96-q1-sphere': { sections: ['Where the curve is level'], note: t`The best tin, then the sphere round it` },
  }),
  // Best first: STEP I 2015 Q7 (a maximum on an interval in three regimes), STEP I 1996 Q1 (the biscuit tin),
  // 2010 STEP II Q7(i), then the auto-checked parts of 2015 Q7 and 1996 Q1. Assignment 7 Q1(i) needs asymptotes,
  // so it is set in fn.rational-functions. Assignment 9 Q2(ii), set here from calc.derivatives, is practice: its
  // auto-checked part (b), which turning point is the maximum, is practice here too.
  gate: ['step15-q7', 'step96-q1', 's2eqns-q4-i', 'step15-q7-values', 'step96-q1-sphere'],
  recall: [
    { front: t`What is a stationary point?`, back: t`A point where ${math`f'(a) = ${0}`}: the tangent is horizontal.` },
    { front: t`State the second derivative test.`, back: t`If ${math`f'(a) = ${0}`}: ${math`f''(a) < ${0}`} gives a local maximum, ${math`f''(a) > ${0}`} a local minimum, and ${math`f''(a) = ${0}`} no conclusion.` },
    { front: t`What do you do when ${math`f''(a) = ${0}`} at a stationary point?`, back: t`Look at the sign of ${math`f'`} just either side: plus to minus is a maximum, minus to plus a minimum, no change a stationary inflection.` },
  ],
  proofOrder: [{
    title: t`A local maximum is stationary`,
    steps: [
      t`Near ${math`a`}, ${math`f(a + h) - f(a) \le ${0}`}.`,
      t`For ${math`h > ${0}`} the chord quotient is at most ${0}, so ${math`f'(a) \le ${0}`}.`,
      t`For ${math`h < ${0}`} the chord quotient is at least ${0}, so ${math`f'(a) \ge ${0}`}.`,
      t`Both together give ${math`f'(a) = ${0}`}.`,
    ],
  }],
};
