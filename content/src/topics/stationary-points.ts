/**
 * calc.stationary-points: where f'(x) = 0, why a smooth maximum or minimum must be one
 * (Fermat), and how to tell a maximum from a minimum by the sign of f' either side or by
 * f''. The Cambridge problems: STEP Support Foundation Assignment 7, Q1(i) (y = x + 1/x and
 * y = x - 1/x, with the Assignment 7 hints), Assignment 9, Q2(ii)(b), and the NST
 * Mathematics Workbook, D1, whose printed answers are compared in the content checks.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { int, pick, q, str, type Rational } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { poly } from '../poly';
import { firstError, numDeriv, polyAt, polyDeriv, powerOfLinear } from '../prep-c';
import { computedMath as cm, math, t, type Rich } from '../rich';
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
  answer: { kind: 'exact', expected: '0' },
  solution: [
    t`${math`\frac{dy}{dx} = ${1} + \frac{${1}}{x^{${2}}}`}. Since ${math`x^{${2}} > ${0}`} for ${math`x \ne ${0}`}, this is always greater than ${1}, never ${0}.`,
    t`So there are no stationary points, and no turning points: the curve goes upwards everywhere on each branch.`,
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
  answer: { kind: 'choice', options: [{ id: 'left', label: t`the one at ${math`x = ${-2}`}` }, { id: 'right', label: t`the one at ${math`x = ${2}`}` }, { id: 'both', label: t`both are maxima` }], correct: 'left' },
  solution: [
    t`For large positive ${math`x`}, ${math`y`} is large and positive, so after the last turning point the curve goes up: the point at ${math`x = ${2}`} is the minimum.`,
    t`The curve rises to the other turning point and falls from it, so the maximum is at ${math`x = ${-2}`}. The second derivative ${math`${6}x`} agrees: ${-12} there.`,
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
  answer: { kind: 'witness', count: 2, example: '5, 1', check: (vals) => (vals.map(str).join(',') === '5,1' ? null : 'Find x from dy/dx = 0, then substitute into y.') },
  solution: [
    t`${math`\frac{dy}{dx} = ${cm(poly(polyDeriv(D1ii)))}`} is ${0} at ${math`x = \pm ${1}`}. ${math`\frac{d^{${2}}y}{dx^{${2}}} = ${6}x`}: negative at ${math`x = ${-1}`}, positive at ${math`x = ${1}`}.`,
    t`So the maximum is at ${math`(${-1}, ${polyAt(D1ii, -1)})`} and the minimum at ${math`(${1}, ${polyAt(D1ii, 1)})`}.`,
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
  answer: { kind: 'choice', options: OPTIONS, correct: 'neither' },
  solution: [
    t`${math`\frac{dy}{dx} = ${cm(poly(polyDeriv(D1iii)))} = ${3}(x - ${1})^{${2}}`}, which is ${0} only at ${math`x = ${1}`}, where ${math`y = ${polyAt(D1iii, 1)}`}.`,
    t`${math`${3}(x - ${1})^{${2}} \ge ${0}`} on both sides of ${math`x = ${1}`}: the curve rises, pauses, and rises again. So ${math`(${1}, ${1})`} is a stationary point of inflection.`,
  ],
  reference: ['neither'],
  verify: () => same('slope test at 1', slopeTest(D1iii, 1), 'neither'),
  misconceptions: [{ response: ['min'], why: t`The gradient ${math`${3}(x - ${1})^{${2}}`} is positive on both sides of ${math`x = ${1}`}, so the curve keeps rising: no minimum.` }],
  official: { source: cite(NST, 'Answers to Section 1, D1(iii)'), answer: ['neither'], agrees: true },
});

const sketchQ = supervision({
  id: 'a7-q1-i',
  source: cite(F07, 'Assignment 7, Q1(i)'),
  title: t`Sketch x plus and minus its reciprocal`,
  prompt: t`Sketch, on different axes, the graphs of ${math`y = x + \frac{${1}}{x}`} and ${math`y = x - \frac{${1}}{x}`} (for ${math`x \ne ${0}`}), paying particular attention to the turning points, if any; the behaviour as ${math`x \to \infty`} and ${math`x \to -\infty`}; the behaviour when ${math`x`} is close to ${0}; and the intercepts with the axes, if any.`,
  writeUp: 'sketch',
  official: cite(F07H, 'Assignment 7 hints, Q1(i)'),
});

// ---------------------------------------------------------------- lesson

const EX: CubicP = { s: 1, p: -2, q: 2, d: 1 };

export const stationaryPoints: TopicContent = {
  topicId: 'calc.stationary-points',
  goal: t`Find the stationary points of a curve from ${math`f'(x) = ${0}`}, and tell maxima from minima by the sign of ${math`f'`} either side or by ${math`f''`}.`,
  objective: t`Find where a curve is level and decide whether each point is a maximum, a minimum, or neither.`,
  why: t`Turning points are the skeleton of every sketch, and of every optimisation question on STEP.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`Where the curve is level` },
    { kind: 'hook', text: t`At the very top of a hill the ground is level for a moment: one step further and you are going down. The curve ${math`y = ${cm(poly(cubic(EX)))}`} rises, falls, then rises again. Where exactly does it turn, and how could you know without drawing it?` },
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
    { kind: 'narrative', text: t`So a stationary point might be a peak, a dip, or a pause on the way up. Two tests sort them. The first looks at the gradient just either side; the second asks whether the gradient is increasing or decreasing as it passes through ${0}.` },
    { kind: 'theorem', name: t`First derivative test`, statement: t`Let ${math`f'(a) = ${0}`}. If ${math`f' > ${0}`} just to the left of ${math`a`} and ${math`f' < ${0}`} just to the right, ${math`f`} has a local maximum at ${math`a`}; if ${math`f' < ${0}`} then ${math`f' > ${0}`}, a local minimum; if ${math`f'`} has the same sign on both sides, neither, and ${math`a`} is a stationary point of inflection.` },
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
    { kind: 'narrative', text: t`Back to the hook. For ${math`y = ${cm(poly(cubic(EX)))}`}, ${math`\frac{dy}{dx} = ${cm(poly(polyDeriv(cubic(EX))))}`} is ${0} at ${math`x = \pm ${2}`}, and ${math`\frac{d^{${2}}y}{dx^{${2}}} = ${6}x`} is ${-12} at ${math`x = ${-2}`} and ${12} at ${math`x = ${2}`}. So there is a maximum at ${math`(${-2}, ${polyAt(cubic(EX), -2)})`} and a minimum at ${math`(${2}, ${polyAt(cubic(EX), 2)})`}.` },
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
  cambridge: [minusTurns, whichMax, nstD1, nstD1iii, sketchQ],
  gate: ['a7-q1-i-minus', 'a7-q1-i'],
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
