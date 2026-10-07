/**
 * calc.inflection-points: points where a curve changes between concave and convex; why
 * f''(a) = 0 is necessary (for continuous f'') but not sufficient, as for y = (x - 1)^4;
 * stationary and non-stationary inflections. The Cambridge problems are STEP Support
 * Foundation Assignment 13, Q1 and Q2(iii), and Q3(ii) (2012 STEP I Q2), with the answers of
 * the Assignment 13 hints compared in the content checks.
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { int, pick, q, str, type Rational } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { poly } from '../poly';
import { firstError, numDeriv, polyAt, polyDeriv, powerOfLinear } from '../prep-c';
import { computedMath as cm, math, t, type Rich } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

const F13 = 'step-f13' as const;
const F13H = 'step-f13-hints' as const;
const setKey = (xs: readonly Rational[]): string => xs.map(str).sort().join(',');
const addPoly = (a: readonly number[], b: readonly number[]): number[] => {
  const n = Math.max(a.length, b.length);
  const pa = [...Array(n - a.length).fill(0), ...a] as number[];
  const pb = [...Array(n - b.length).fill(0), ...b] as number[];
  return pa.map((x, i) => x + (pb[i] as number));
};

// ---------------------------------------------------------------- the point of inflection of a cubic

/** y = a(x - h)^3 + m(x - h) + k: inflection at (h, k), with gradient m there. */
interface InfP { a: number; h: number; m: number; k: number }
const infCurve = ({ a, h, m, k }: InfP): number[] => addPoly(powerOfLinear(h, 3).map((c) => a * c), addPoly([m, -m * h], [k]));

const inflectionPoint = generator<InfP>({
  id: 'cubic-inflection',
  skill: 'Find the point of inflection of a cubic: solve the linear equation f\'\'(x) = 0 and substitute for y.',
  params: (rng) => {
    for (;;) {
      const p: InfP = { a: pick(rng, [1, -1, 2]), h: int(rng, -3, 3), m: int(rng, -6, 6), k: int(rng, -8, 8) };
      if (p.h !== 0 && p.h !== p.k && polyAt(infCurve(p), -p.h) !== p.k) return p;
    }
  },
  sane: ({ a }) => (a !== 0 ? null : 'not a cubic'),
  problem: (p) => {
    const co = infCurve(p);
    const d2 = polyDeriv(polyDeriv(co));
    return {
      prompt: t`Find the point of inflection of ${math`y = ${cm(poly(co))}`}. Give it as ${math`x = \ldots, y = \ldots`}.`,
      answer: { kind: 'witness', count: 2, names: ['x', 'y'], example: `x = ${p.h}, y = ${p.k}`, check: (vals) => (vals.map(str).join(',') === `${p.h},${p.k}` ? null : 'Solve d^2y/dx^2 = 0, then substitute that x into y.') },
      solution: [
        t`${math`\frac{d^{${2}}y}{dx^{${2}}} = ${cm(poly(d2))}`}, which is ${0} at ${math`x = ${p.h}`} and changes sign there, since it is a straight line with nonzero gradient.`,
        t`Substitute ${math`x = ${p.h}`} into ${math`y`}: ${math`y = ${p.k}`}. So the point of inflection is ${math`(${p.h}, ${p.k})`}.`,
      ],
    };
  },
  solve: (p) => {
    // Where the numerical second difference changes sign, on a grid of integers.
    const f = (x: number): number => polyAt(infCurve(p), x);
    const s2 = (x: number): number => f(x + 0.5) + f(x - 0.5) - 2 * f(x);
    for (let x = -10; x <= 10; x++) if (Math.abs(s2(x)) < 1e-9) return `x = ${x}, y = ${Math.round(f(x))}`;
    return 'x = 99, y = 99';
  },
  misconceptions: (p): Misconception[] => [
    { response: `x = ${p.k}, y = ${p.h}`, why: t`The coordinates are swapped: ${math`x`} comes from ${math`\frac{d^{${2}}y}{dx^{${2}}} = ${0}`}, and ${math`y`} from substituting it.` },
    { response: `x = ${-p.h}, y = ${polyAt(infCurve(p), -p.h)}`, why: t`Check the sign when solving ${math`\frac{d^{${2}}y}{dx^{${2}}} = ${0}`} for ${math`x`}.` },
  ],
});

// ---------------------------------------------------------------- the gradient at the inflection

const inflectionGradient = generator<InfP>({
  id: 'inflection-gradient',
  skill: 'Find the gradient at a point of inflection, which need not be 0.',
  quick: true,
  params: (rng) => {
    for (;;) {
      const p: InfP = { a: pick(rng, [1, -1, 2]), h: int(rng, -3, 3), m: int(rng, -6, 6), k: int(rng, -8, 8) };
      if (p.m !== 0 && p.m !== p.k && p.k !== 0) return p;
    }
  },
  sane: ({ a }) => (a !== 0 ? null : 'not a cubic'),
  problem: (p) => {
    const co = infCurve(p);
    return {
      prompt: t`Find the gradient of ${math`y = ${cm(poly(co))}`} at its point of inflection.`,
      answer: { kind: 'exact', expected: String(p.m) },
      solution: [
        t`${math`\frac{d^{${2}}y}{dx^{${2}}} = ${cm(poly(polyDeriv(polyDeriv(co))))}`} is ${0} at ${math`x = ${p.h}`}.`,
        t`${math`\frac{dy}{dx} = ${cm(poly(polyDeriv(co)))}`}, which at ${math`x = ${p.h}`} is ${p.m}. ${p.m === 0 ? t`` : t`Not ${0}: this is a non-stationary point of inflection.`}`,
      ],
    };
  },
  solve: (p) => String(Math.round(numDeriv((x) => polyAt(infCurve(p), x), p.h))),
  misconceptions: (p): Misconception[] => [
    { response: '0', why: t`A point of inflection is where the bending changes, not where the curve is level. Only a stationary point of inflection has gradient ${0}.` },
    { response: String(p.k), why: t`That is the height ${math`y`} at the point. The gradient is ${math`\frac{dy}{dx}`} there.` },
  ],
});

// ---------------------------------------------------------------- is it an inflection?

type Verdict = 'stationary' | 'non-stationary' | 'none';
interface PowP { n: 3 | 4 | 5 | 6; p: number; c: number; k: number }
const powCurve = ({ n, p, c, k }: PowP): number[] => addPoly(powerOfLinear(p, n), addPoly([c, -c * p], [k]));
const verdict = ({ n, c }: PowP): Verdict => (n % 2 === 0 ? 'none' : c === 0 ? 'stationary' : 'non-stationary');
const OPTS: readonly ChoiceOption[] = [
  { id: 'stationary', label: t`a stationary point of inflection` },
  { id: 'non-stationary', label: t`a point of inflection that is not stationary` },
  { id: 'none', label: t`not a point of inflection` },
];
/** The verdict from the signs of the numerical second difference and slope either side: no formula. */
function signVerdict(co: number[], a: number): Verdict {
  const f = (x: number): number => polyAt(co, x);
  const bend = (x: number): number => f(x + 0.01) + f(x - 0.01) - 2 * f(x);
  if (Math.sign(bend(a - 0.3)) === Math.sign(bend(a + 0.3))) return 'none';
  return Math.abs(numDeriv(f, a)) < 1e-6 ? 'stationary' : 'non-stationary';
}

const isInflection = generator<PowP>({
  id: 'is-inflection',
  skill: 'Decide whether a point where f\'\'(x) = 0 is a point of inflection, and whether it is stationary.',
  params: (rng) => ({ n: pick(rng, [3, 4, 5, 6] as const), p: int(rng, -2, 2), c: pick(rng, [0, 0, -3, -2, 2, 4]), k: int(rng, -4, 4) }),
  sane: () => null,
  problem: (pp) => {
    const co = powCurve(pp);
    const v = verdict(pp);
    const lin: Rich = pp.c === 0 ? t`` : t`, plus a straight line of gradient ${pp.c}`;
    const base = pp.p === 0 ? math`x` : math`(${cm(poly([1, -pp.p]))})`;
    return {
      prompt: t`At ${math`x = ${pp.p}`} the curve ${math`y = ${cm(poly(co))}`} has ${math`\frac{d^{${2}}y}{dx^{${2}}} = ${0}`}. What is the point?`,
      answer: { kind: 'choice', options: OPTS, correct: v },
      solution: [
        t`Write the curve as ${math`${base}^{${pp.n}}`}${lin}, plus a constant. A straight line does not bend, so ${math`\frac{d^{${2}}y}{dx^{${2}}} = ${pp.n * (pp.n - 1)}${base}^{${pp.n - 2}}`}.`,
        pp.n % 2 === 0
          ? t`The power ${pp.n - 2} is even, so the second derivative is ${math`\ge ${0}`} on both sides: the curve is convex on both sides, and the point is not an inflection.`
          : t`The power ${pp.n - 2} is odd, so the second derivative changes sign: a point of inflection. The gradient there is ${pp.c}, ${pp.c === 0 ? t`so it is stationary.` : t`not ${0}, so it is not stationary.`}`,
      ],
    };
  },
  solve: (pp) => [signVerdict(powCurve(pp), pp.p)],
  misconceptions: (pp): Misconception[] => {
    const v = verdict(pp);
    const why: Record<Verdict, Rich> = {
      none: t`${math`\frac{d^{${2}}y}{dx^{${2}}} = ${0}`} is not enough. The second derivative must change sign, and here it is never negative: the curve bends the same way on both sides.`,
      stationary: t`The second derivative changes sign, so it is an inflection, and the gradient there is ${0}, so it is stationary.`,
      'non-stationary': t`The second derivative changes sign, so it is an inflection; but the gradient there is ${pp.c}, not ${0}, so it is not stationary.`,
    };
    return (['stationary', 'non-stationary', 'none'] as const).filter((x) => x !== v).map((x) => ({ response: [x], why: why[v] }));
  },
});

// ---------------------------------------------------------------- Cambridge problems

const fourth = auto({
  id: 'a13-q1-iv',
  source: cite(F13, 'Assignment 13, Q1(iv)'),
  title: t`A second derivative of zero that is not an inflection`,
  prompt: t`For the graph ${math`y = (x - ${1})^{${4}}`}, find the point where ${math`\frac{d^{${2}}y}{dx^{${2}}} = ${0}`}. By considering the shape of the graph, decide what kind of point it is.`,
  answer: { kind: 'choice', options: [{ id: 'min', label: t`a minimum, not a point of inflection` }, { id: 'stationary', label: t`a stationary point of inflection` }, { id: 'max', label: t`a maximum, not a point of inflection` }], correct: 'min' },
  solution: [
    t`${math`\frac{dy}{dx} = ${4}(x - ${1})^{${3}}`} and ${math`\frac{d^{${2}}y}{dx^{${2}}} = ${12}(x - ${1})^{${2}}`}, which is ${0} only at ${math`x = ${1}`}, the point ${math`(${1}, ${0})`}.`,
    t`${math`${12}(x - ${1})^{${2}} \ge ${0}`} on both sides, so the curve is convex on both sides: no change of bending, no inflection.`,
    t`The gradient ${math`${4}(x - ${1})^{${3}}`} goes from negative to positive, and ${math`y \ge ${0} = y(${1})`}: it is a minimum. The graph is ${math`y = x^{${4}}`} moved ${1} to the right.`,
  ],
  reference: ['min'],
  verify: () => {
    const co = powerOfLinear(1, 4);
    return firstError(same('f\'\'(1)', polyAt(polyDeriv(polyDeriv(co)), 1), 0), same('verdict', signVerdict(co, 1), 'none'), same('slope signs', `${Math.sign(numDeriv((x) => polyAt(co, x), 0.9))},${Math.sign(numDeriv((x) => polyAt(co, x), 1.1))}`, '-1,1'));
  },
  misconceptions: [{ response: ['stationary'], why: t`${math`\frac{d^{${2}}y}{dx^{${2}}} = ${0}`} is necessary for an inflection, not sufficient. Here ${math`${12}(x - ${1})^{${2}}`} never changes sign.` }],
  official: { source: cite(F13H, 'Assignment 13 hints, Q1(iv)'), answer: ['min'], agrees: true },
});

const Q2iii = [3, 4, -6, -12, 5];
const nonStationary = auto({
  id: 'a13-q2-iii-b',
  source: cite(F13, 'Assignment 13, Q2(iii)(b)', true),
  title: t`The non-stationary inflection of a quartic`,
  prompt: t`The graph of ${math`y = ${3}x^{${4}} + ${4}x^{${3}} - ${6}x^{${2}} - ${12}x + ${5}`} has two points where ${math`\frac{d^{${2}}y}{dx^{${2}}} = ${0}`}. One is stationary. Find the other one, as ${math`x = \ldots, y = \ldots`}.`,
  answer: { kind: 'witness', count: 2, names: ['x', 'y'], example: 'x = 1/3, y = 14/27', check: (vals) => (vals.map(str).join(',') === '1/3,14/27' ? null : 'Solve 36x^2 + 24x - 12 = 0, and pick the root where dy/dx is not 0.') },
  solution: [
    t`${math`\frac{dy}{dx} = ${12}x^{${3}} + ${12}x^{${2}} - ${12}x - ${12} = ${12}(x + ${1})^{${2}}(x - ${1})`} and ${math`\frac{d^{${2}}y}{dx^{${2}}} = ${36}x^{${2}} + ${24}x - ${12} = ${12}(${3}x - ${1})(x + ${1})`}.`,
    t`The second derivative is ${0} at ${math`x = ${-1}`}, where ${math`\frac{dy}{dx} = ${0}`} too (a stationary inflection at ${math`(${-1}, ${10})`}), and at ${math`x = ${q(1, 3)}`}.`,
    t`At ${math`x = ${q(1, 3)}`}: ${math`y = ${3} \cdot \frac{${1}}{${81}} + ${4} \cdot \frac{${1}}{${27}} - ${6} \cdot \frac{${1}}{${9}} - ${4} + ${5} = ${q(14, 27)}`}, and the gradient is ${math`${12}\left(\frac{${4}}{${3}}\right)^{${2}}\left(-\frac{${2}}{${3}}\right) \ne ${0}`}. Both factors of the second derivative change sign simply, so both points are inflections.`,
  ],
  reference: 'x = 1/3, y = 14/27',
  verify: () => {
    const y = 3 / 81 + 4 / 27 - 6 / 9 - 4 + 5;
    return firstError(same('f\'\'(1/3) rounds to 0', Math.round(polyAt(polyDeriv(polyDeriv(Q2iii)), 1 / 3) * 1e9), 0), same('y(1/3) * 27', Math.round(y * 27 * 1e6) / 1e6, 14), same('verdict at 1/3', signVerdict(Q2iii, 1 / 3), 'non-stationary'), same('verdict at -1', signVerdict(Q2iii, -1), 'stationary'));
  },
  misconceptions: [{ response: 'x = -1, y = 10', why: t`That is the stationary one: ${math`\frac{dy}{dx} = ${0}`} there as well. The question asks for the other.` }],
  official: { source: cite(F13H, 'Assignment 13 hints, Q2(iii)(b)'), answer: 'x = 1/3, y = 14/27', agrees: true },
});

const stepA = auto({
  id: 'a13-q3-ii-a',
  source: cite(F13, 'Assignment 13, Q3(ii)'),
  title: t`STEP: a point where both derivatives vanish`,
  prompt: t`For which values of ${math`a`} does the curve ${math`y = x^{${4}} - ${6}x^{${2}} + ax + b`} have a point at which both ${math`\frac{dy}{dx} = ${0}`} and ${math`\frac{d^{${2}}y}{dx^{${2}}} = ${0}`}?`,
  answer: { kind: 'witness', count: 2, unordered: true, example: '-8, 8', check: (vals) => (setKey(vals) === setKey([q(-8), q(8)]) ? null : 'Solve d^2y/dx^2 = 0 for x first, then put each x into dy/dx = 0.') },
  solution: [
    t`${math`\frac{d^{${2}}y}{dx^{${2}}} = ${12}x^{${2}} - ${12}`} is ${0} at ${math`x = \pm ${1}`}.`,
    t`${math`\frac{dy}{dx} = ${4}x^{${3}} - ${12}x + a`}. At ${math`x = ${1}`}: ${math`${4} - ${12} + a = ${0}`}, so ${math`a = ${8}`}. At ${math`x = ${-1}`}: ${math`${-4} + ${12} + a = ${0}`}, so ${math`a = ${-8}`}.`,
    t`(For ${math`a = ${8}`}, ${math`\frac{dy}{dx} = ${4}(x - ${1})^{${2}}(x + ${2})`}, so ${math`x = ${1}`} is a stationary point of inflection.)`,
  ],
  reference: '8, -8',
  verify: () => firstError(same('dy/dx at 1 for a = 8', polyAt([4, 0, -12, 8], 1), 0), same('dy/dx at -1 for a = -8', polyAt([4, 0, -12, -8], -1), 0), same('verdict a = 8 at 1', signVerdict([1, 0, -6, 8, 0], 1), 'stationary')),
  misconceptions: [{ response: '-1, 1', why: t`Those are the ${math`x`} values where ${math`\frac{d^{${2}}y}{dx^{${2}}} = ${0}`}. Put each into ${math`\frac{dy}{dx} = ${0}`} to find ${math`a`}.` }],
  official: { source: cite(F13H, 'Assignment 13 hints, Q3(ii)'), answer: '8, -8', agrees: true },
});

const prepQ = supervision({
  id: 'a13-q2-iii',
  source: cite(F13, 'Assignment 13, Q2(iii)'),
  title: t`Stationary points and inflections of a quartic`,
  prompt: t`Consider the graph of ${math`y = ${3}x^{${4}} + ${4}x^{${3}} - ${6}x^{${2}} - ${12}x + ${5}`}. (a) Find the coordinates of the stationary points. (b) Find the points where ${math`\frac{d^{${2}}y}{dx^{${2}}} = ${0}`}, and state whether each one is stationary or non-stationary. (c) Sketch the graph. (d) Write down the value of ${math`k`} for which ${math`${3}x^{${4}} + ${4}x^{${3}} - ${6}x^{${2}} - ${12}x + k = ${0}`} has only one root.`,
  writeUp: 'sketch',
  official: cite(F13H, 'Assignment 13 hints, Q2(iii)'),
});

// ---------------------------------------------------------------- lesson

export const inflectionPoints: TopicContent = {
  topicId: 'calc.inflection-points',
  goal: t`Find where a curve changes between concave and convex, and see why ${math`f''(x) = ${0}`} is necessary but not sufficient, as for ${math`y = (x - ${1})^{${4}}`}.`,
  objective: t`Find the points where a curve changes its bending, and test each candidate properly.`,
  why: t`Inflections fix the shape of a sketch between turning points; STEP tests the trap in the definition.`,
  minutes: 15,
  lesson: [
    { kind: 'section', title: t`Where the bending changes` },
    { kind: 'hook', text: t`The curve ${math`y = (x - ${1})^{${4}}`} has ${math`\frac{d^{${2}}y}{dx^{${2}}} = ${0}`} at ${math`x = ${1}`}. Many people would call that a point of inflection. STEP Support Assignment ${13} asks you to show that it is not. What has gone wrong?` },
    { kind: 'narrative', text: t`Picture driving along a curve. A point of inflection is where you stop turning the wheel one way and start turning it the other. ${math`f''`} measures how hard you are turning; at the switch it passes through ${0}. But passing through ${0} and merely touching ${0} are different things.` },
    { kind: 'definition', name: t`Point of inflection`, formal: t`Let ${math`f`} be twice differentiable with ${math`f''`} continuous. ${math`a`} is a [[point-of-inflection|point of inflection]] of ${math`f`} if there is ${math`\delta > ${0}`} such that ${math`f''`} has one sign on ${math`(a - \delta, a)`} and the opposite sign on ${math`(a, a + \delta)`}. It is stationary if also ${math`f'(a) = ${0}`}, and non-stationary otherwise.`, plain: t`The curve is concave just on one side and convex just on the other. ${math`y = x^{${3}}`} at ${0} is a stationary one; ${math`y = x^{${3}} + x`} at ${0} is a non-stationary one, with gradient ${1}.` },
    { kind: 'theorem', name: t`Necessary condition`, statement: t`If ${math`f''`} is continuous and ${math`a`} is a point of inflection of ${math`f`}, then ${math`f''(a) = ${0}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`One side`, text: t`Say ${math`f'' > ${0}`} on ${math`(a, a + \delta)`}. ${math`f''`} is continuous, so ${math`f''(a) = \lim_{x \to a^{+}} f''(x) \ge ${0}`}.`, why: { q: t`Why can the limit not be negative?`, a: t`If it were some negative number, values of ${math`f''`} just to the right of ${math`a`} would be close to it and so negative too, contradicting ${math`f'' > ${0}`} there.` } },
        { label: t`Other side`, text: t`${math`f'' < ${0}`} on ${math`(a - \delta, a)`}, so likewise ${math`f''(a) = \lim_{x \to a^{-}} f''(x) \le ${0}`}.` },
        { label: t`Combine`, text: t`${math`f''(a) \ge ${0}`} and ${math`f''(a) \le ${0}`}, so ${math`f''(a) = ${0}`}. The other order of signs is the same.` },
      ],
    },
    { kind: 'pitfall', claim: t`If ${math`f''(a) = ${0}`}, then ${math`a`} is a point of inflection.`, counterexample: t`For ${math`y = (x - ${1})^{${4}}`}, ${math`\frac{d^{${2}}y}{dx^{${2}}} = ${12}(x - ${1})^{${2}}`} is ${0} at ${math`x = ${1}`} but positive on both sides. The curve is convex throughout, and ${math`(${1}, ${0})`} is its minimum. ${math`f''(a) = ${0}`} is necessary, not sufficient.` },
    { kind: 'section', title: t`Testing a candidate` },
    { kind: 'narrative', text: t`So ${math`f''(x) = ${0}`} only gives candidates. To confirm one, check that ${math`f''`} really changes sign: look at its sign just either side, or factorise it. A factor ${math`(x - a)`} to an odd power changes sign at ${math`a`}; to an even power it does not.` },
    { kind: 'theorem', name: t`A sufficient condition`, statement: t`If ${math`f''(a) = ${0}`} and ${math`f'''(a) \ne ${0}`}, then ${math`a`} is a point of inflection.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Write the third derivative as a limit`, text: t`${math`f'''(a) = \lim_{h \to ${0}} \frac{f''(a + h) - f''(a)}{h} = \lim_{h \to ${0}} \frac{f''(a + h)}{h}`}.` },
        { label: t`Fix the sign of the quotient`, text: t`Since the limit is not ${0}, for all small ${math`h \ne ${0}`} the quotient ${math`\frac{f''(a + h)}{h}`} has the sign of ${math`f'''(a)`}.` },
        { label: t`Read off f''`, text: t`So ${math`f''(a + h)`} has the sign of ${math`h \cdot f'''(a)`}: opposite signs for small positive and small negative ${math`h`}. That is a change of sign.` },
      ],
    },
    { kind: 'narrative', text: t`Take ${math`y = ${3}x^{${4}} - ${4}x^{${3}} + ${2}`}. Then ${math`\frac{dy}{dx} = ${12}x^{${3}} - ${12}x^{${2}}`} and ${math`\frac{d^{${2}}y}{dx^{${2}}} = ${36}x^{${2}} - ${24}x = ${12}x(${3}x - ${2})`}, which changes sign at both roots, since each is a simple root. At ${math`x = ${0}`} the gradient is also ${0}: a stationary inflection at ${math`(${0}, ${2})`}. At ${math`x = ${q(2, 3)}`} the gradient is ${math`-${q(16, 9)}`}, not ${0}: a non-stationary inflection.` },
    checkFrom(isInflection, { n: 5, p: 1, c: 2, k: 0 }, t`The second derivative ${math`${20}(x - ${1})^{${3}}`} changes sign at ${1}, and the gradient there is ${2}, not ${0}.`),
    { kind: 'pitfall', claim: t`A point of inflection is a stationary point.`, counterexample: t`${math`y = x^{${3}} + x`} has ${math`\frac{d^{${2}}y}{dx^{${2}}} = ${6}x`}, changing sign at ${0}, but its gradient there is ${1}. Most inflections are not stationary.` },
    { kind: 'takeaway', text: t`An inflection is where ${math`f''`} changes sign; ${math`f'' = ${0}`} only finds the candidates, so always check the sign either side.` },
  ],
  examples: [
    { ...workedCambridge(fourth), examiner: t`The examiner wants ${math`\frac{d^{${2}}y}{dx^{${2}}}`} found, and then an argument from the shape or the signs; stopping at ${math`\frac{d^{${2}}y}{dx^{${2}}} = ${0}`} earns little.` },
    worked(inflectionPoint, { a: 1, h: 2, m: -3, k: 1 }, t`The inflection of a cubic`),
    worked(isInflection, { n: 6, p: -1, c: 3, k: 2 }, t`An even power: no inflection`),
  ],
  generators: [inflectionPoint, inflectionGradient, isInflection],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['point-of-inflection'],
  cambridge: withUses([nonStationary, stepA, prepQ], {
    'a13-q3-ii-a': { sections: ['Where the bending changes', 'Testing a candidate'], note: t`A point where both derivatives vanish` },
    'a13-q2-iii': { sections: ['Where the bending changes', 'Testing a candidate'], note: t`Stationary points and inflections of a quartic, then counting roots` },
  }),
  gate: ['a13-q3-ii-a', 'a13-q2-iii'],
  recall: [
    { front: t`Define a point of inflection.`, back: t`A point where ${math`f''`} changes sign: concave on one side, convex on the other.` },
    { front: t`Is ${math`f''(a) = ${0}`} enough for an inflection?`, back: t`No: it is necessary, not sufficient. ${math`(x - ${1})^{${4}}`} has ${math`f''(${1}) = ${0}`} and a minimum there.` },
    { front: t`What is a stationary point of inflection?`, back: t`An inflection where also ${math`f'(a) = ${0}`}, like ${math`x^{${3}}`} at ${0}.` },
  ],
  proofOrder: [{
    title: t`At an inflection, the second derivative is zero`,
    steps: [
      t`${math`f''`} is positive just on one side of ${math`a`}.`,
      t`By continuity, ${math`f''(a) \ge ${0}`}.`,
      t`${math`f''`} is negative just on the other side, so ${math`f''(a) \le ${0}`}.`,
      t`Hence ${math`f''(a) = ${0}`}.`,
    ],
  }],
};
