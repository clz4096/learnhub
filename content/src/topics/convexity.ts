/**
 * calc.convexity: convex and concave functions, by the chord definition and by the sign of
 * f''; the tangent of a convex function lies below it (so e^x >= 1 + x and ln x <= x - 1).
 * The Cambridge problems are STEP Support Foundation Assignment 13, Q1, whose opening notes
 * define concave and convex by the sign of the second derivative, with the answers of the
 * Assignment 13 hints compared in the content checks. The STEP specification ties the second
 * derivative to "convex and concave sections of curves" (STEP 1, Differentiation).
 */
import { auto, cite, same, supervision } from '../cambridge';
import { add, div, int, mul, pick, q, str, sub, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { poly } from '../poly';
import { firstError, polyAt, polyDeriv } from '../prep-c';
import { computedMath as cm, math, t } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

const F13 = 'step-f13' as const;
const F13H = 'step-f13-hints' as const;
const setKey = (xs: readonly Rational[]): string => xs.map(str).sort().join(',');

// ---------------------------------------------------------------- where a cubic changes from concave to convex

interface CubP { a: number; b: number; c: number; d: number }
const cub = ({ a, b, c, d }: CubP): number[] => [a, b, c, d];
const switchX = ({ a, b }: CubP): Rational => q(-b, 3 * a);

const cubicSwitch = generator<CubP>({
  id: 'cubic-switch',
  skill: 'Find where a cubic changes between concave and convex: where the linear second derivative is 0.',
  quick: true,
  params: (rng) => {
    for (;;) {
      const p: CubP = { a: pick(rng, [1, 2, -1, 3]), b: pick(rng, [-9, -6, -4, -3, -2, 2, 3, 4, 6, 9]), c: int(rng, -6, 6), d: int(rng, -5, 5) };
      const right = str(switchX(p));
      if (new Set([right, str(q(p.b, 3 * p.a)), str(q(-p.b, 6 * p.a))]).size === 3) return p;
    }
  },
  sane: ({ a, b }) => (a !== 0 && b !== 0 ? null : 'degenerate cubic'),
  problem: (p) => {
    const co = cub(p);
    const d2 = polyDeriv(polyDeriv(co));
    const x0 = switchX(p);
    return {
      prompt: t`The curve ${math`y = ${cm(poly(co))}`} is concave on one side of ${math`x = c`} and convex on the other. Find ${math`c`}.`,
      answer: { kind: 'exact', expected: str(x0) },
      solution: [
        t`${math`\frac{dy}{dx} = ${cm(poly(polyDeriv(co)))}`} and ${math`\frac{d^{${2}}y}{dx^{${2}}} = ${cm(poly(d2))}`}.`,
        t`This is a straight line in ${math`x`}, ${0} at ${math`x = ${x0}`}, with one sign to the left and the other to the right. So the curve switches between concave and convex at ${math`c = ${x0}`}.`,
      ],
    };
  },
  // Bisection on the second derivative's sign change, then the nearest fraction with denominator dividing 36.
  solve: (p) => {
    const g = (x: number): number => polyAt(polyDeriv(polyDeriv(cub(p))), x);
    let lo = -20;
    let hi = 20;
    for (let i = 0; i < 80; i++) {
      const mid = (lo + hi) / 2;
      if (Math.sign(g(mid)) === Math.sign(g(lo))) lo = mid; else hi = mid;
    }
    return str(q(Math.round(lo * 36), 36));
  },
  misconceptions: (p): Misconception[] => [
    { response: str(q(p.b, 3 * p.a)), why: t`Check the sign: ${math`${6 * p.a}x + ${2 * p.b} = ${0}`} gives ${math`x = ${switchX(p)}`}.` },
    { response: str(q(-p.b, 6 * p.a)), why: t`The derivative of ${math`bx^{${2}}`} is ${math`${2}bx`}, and differentiating again gives ${math`${2}b`}, not ${math`b`}.` },
  ],
});

// ---------------------------------------------------------------- where x^4 - 2k x^3 is concave

interface QuP { k: number }
const quartC = ({ k }: QuP): number[] => [1, -2 * k, 0, 0, 0];
const concaveOn = ({ k }: QuP): Rational[] => [q(0), q(k)];

const quarticConcave = generator<QuP>({
  id: 'quartic-concave',
  skill: 'Find the interval on which a quartic is concave by solving f\'\'(x) < 0, not f\'(x) = 0.',
  params: (rng) => ({ k: pick(rng, [-6, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6]) }),
  sane: ({ k }) => (k !== 0 ? null : 'k must not be 0'),
  problem: (p) => {
    const co = quartC(p);
    const [lo, hi] = p.k > 0 ? [0, p.k] : [p.k, 0];
    return {
      prompt: t`The curve ${math`y = ${cm(poly(co))}`} is concave exactly on an interval ${math`a \le x \le b`}. Find ${math`a`} and ${math`b`}.`,
      answer: { kind: 'witness', count: 2, unordered: true, example: `${lo}, ${hi}`, check: (vals) => (setKey(vals) === setKey(concaveOn(p)) ? null : 'Solve d^2y/dx^2 = 0 and test the sign between the roots.') },
      solution: [
        t`${math`\frac{dy}{dx} = ${cm(poly(polyDeriv(co)))}`} and ${math`\frac{d^{${2}}y}{dx^{${2}}} = ${cm(poly(polyDeriv(polyDeriv(co))))} = ${12}x(x ${p.k < 0 ? '+' : '-'} ${Math.abs(p.k)})`}.`,
        t`The second derivative is a quadratic with positive leading coefficient, so it is negative exactly between its roots ${lo} and ${hi}. So ${math`a = ${lo}`} and ${math`b = ${hi}`}.`,
      ],
    };
  },
  solve: (p) => {
    // Scan the second derivative's sign on a fine grid for the ends of the negative stretch.
    const g = (x: number): number => polyAt(polyDeriv(polyDeriv(quartC(p))), x);
    const xs: number[] = [];
    for (let i = -800; i <= 800; i++) if (g(i / 100) <= 1e-9) xs.push(i / 100);
    return `${Math.round(Math.min(...xs))}, ${Math.round(Math.max(...xs))}`;
  },
  misconceptions: (p): Misconception[] => [
    { response: `0, ${str(q(3 * p.k, 2))}`, why: t`Those are the stationary points, from ${math`\frac{dy}{dx} = ${0}`}. Concavity is decided by the second derivative: solve ${math`\frac{d^{${2}}y}{dx^{${2}}} < ${0}`}.` },
    { response: `0, ${2 * p.k}`, why: t`Those are the roots of ${math`y`} itself. Concavity is about the second derivative, ${math`${12}x(x - k)`}.` },
  ],
});

// ---------------------------------------------------------------- the chord above the curve

interface ChP { a: number; b: number; c: number; u: number; v: number }
const fq = ({ a, b, c }: ChP, x: Rational): Rational => add(add(mul(q(a), mul(x, x)), mul(q(b), x)), q(c));
const chordGap = (p: ChP): Rational => sub(div(add(fq(p, q(p.u)), fq(p, q(p.v))), q(2)), fq(p, q(p.u + p.v, 2)));

const chord = generator<ChP>({
  id: 'chord-gap',
  skill: 'Measure how far the chord of a quadratic lies above it at the midpoint: a(u - v)^2/4, positive when a > 0.',
  quick: true,
  params: (rng) => {
    for (;;) {
      const p: ChP = { a: pick(rng, [1, 2, 3, -1, -2]), b: int(rng, -5, 5), c: int(rng, -5, 5), u: int(rng, -4, 4), v: int(rng, -4, 4) };
      if (p.u !== p.v) return p;
    }
  },
  sane: ({ u, v }) => (u !== v ? null : 'the chord needs two points'),
  problem: (p) => {
    const f = poly([p.a, p.b, p.c]);
    const m = q(p.u + p.v, 2);
    return {
      prompt: t`Let ${math`f(x) = ${cm(f)}`}. Find ${math`\frac{f(${p.u}) + f(${p.v})}{${2}} - f\left(${m}\right)`}: how far the midpoint of the chord lies above the curve.`,
      answer: { kind: 'exact', expected: str(chordGap(p)) },
      solution: [
        t`${math`f(${p.u}) = ${fq(p, q(p.u))}`} and ${math`f(${p.v}) = ${fq(p, q(p.v))}`}, so the chord's midpoint has height ${math`${div(add(fq(p, q(p.u)), fq(p, q(p.v))), q(2))}`}.`,
        t`${math`f(${m}) = ${fq(p, m)}`}, so the gap is ${chordGap(p)}. ${p.a > 0 ? t`Positive: a convex curve lies below its chords.` : t`Negative: this curve is concave, so its chords lie below it.`}`,
      ],
    };
  },
  // The formula a(u - v)^2/4, a second route to the same number.
  solve: (p) => str(q(p.a * (p.u - p.v) ** 2, 4)),
  misconceptions: (p): Misconception[] => [
    { response: str(sub(q(0), chordGap(p))), why: t`That is the curve minus the chord. The question asks for the chord's midpoint minus the curve.` },
    { response: str(mul(chordGap(p), q(2))), why: t`Halve the sum ${math`f(${p.u}) + f(${p.v})`}: the midpoint of the chord is at their average height.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const W = [1, 0, -6, 0, 9];
const concaveW = auto({
  id: 'a13-q1-ii',
  source: cite(F13, 'Assignment 13, Q1(ii)'),
  title: t`Where the W is concave`,
  prompt: t`Find the range of values of ${math`x`} for which the graph ${math`y = x^{${4}} - ${6}x^{${2}} + ${9}`} is concave. Give the two ends of the interval.`,
  answer: { kind: 'witness', count: 2, unordered: true, example: '-1, 1', check: (vals) => (setKey(vals) === setKey([q(-1), q(1)]) ? null : 'Solve 12x^2 - 12 < 0.') },
  solution: [
    t`${math`\frac{dy}{dx} = ${4}x^{${3}} - ${12}x`} and ${math`\frac{d^{${2}}y}{dx^{${2}}} = ${12}x^{${2}} - ${12} = ${12}(x - ${1})(x + ${1})`}.`,
    t`This is negative exactly when ${math`${-1} < x < ${1}`}, so the graph is concave there (and convex for ${math`|x| > ${1}`}).`,
  ],
  reference: '-1, 1',
  verify: () => {
    const g = (x: number): number => polyAt(polyDeriv(polyDeriv(W)), x);
    return firstError(same('f\'\' at 0', g(0) < 0, true), same('f\'\' at ±1', `${g(1)},${g(-1)}`, '0,0'), same('f\'\' at 2', g(2) > 0, true));
  },
  official: { source: cite(F13H, 'Assignment 13 hints, Q1(ii)'), answer: '-1, 1', agrees: true },
});

const C1 = [1, -2, -3, 0];
const switchQ = auto({
  id: 'a13-q1-i',
  source: cite(F13, 'Assignment 13, Q1(i)'),
  title: t`Where the bending changes`,
  prompt: t`For the graph ${math`y = x^{${3}} - ${2}x^{${2}} - ${3}x`}, find the value of ${math`x`} where ${math`\frac{d^{${2}}y}{dx^{${2}}} = ${0}`}.`,
  answer: { kind: 'exact', expected: '2/3' },
  solution: [
    t`${math`\frac{dy}{dx} = ${3}x^{${2}} - ${4}x - ${3}`}, so ${math`\frac{d^{${2}}y}{dx^{${2}}} = ${6}x - ${4}`}.`,
    t`${math`${6}x - ${4} = ${0}`} at ${math`x = ${q(2, 3)}`}, where ${math`y = ${q(-70, 27)}`}. To the left the curve is concave, to the right convex.`,
  ],
  reference: '2/3',
  verify: () => {
    const x0 = q(2, 3);
    const y = add(add(mul(x0, mul(x0, x0)), mul(q(-2), mul(x0, x0))), mul(q(-3), x0));
    return firstError(same('f\'\'(2/3)', polyAt(polyDeriv(polyDeriv(C1)), 2 / 3) === 0, true), same('y(2/3)', str(y), '-70/27'));
  },
  misconceptions: [{ response: '4/3', why: t`Differentiate ${math`-${2}x^{${2}}`} twice: ${math`-${4}x`}, then ${math`-${4}`}. So ${math`\frac{d^{${2}}y}{dx^{${2}}} = ${6}x - ${4}`}, which is ${0} at ${q(2, 3)}.` }],
  official: { source: cite(F13H, 'Assignment 13 hints, Q1(i)'), answer: '2/3', agrees: true },
});

const Q3 = [1, -2, 0, 0, 0];
const quarticQ = auto({
  id: 'a13-q1-iii',
  source: cite(F13, 'Assignment 13, Q1(iii)', true),
  title: t`Concave between the points where the second derivative vanishes`,
  prompt: t`For the graph ${math`y = x^{${4}} - ${2}x^{${3}}`}, find the points where ${math`\frac{d^{${2}}y}{dx^{${2}}} = ${0}`}, and hence the interval on which the curve is concave. Give the two ends.`,
  answer: { kind: 'witness', count: 2, unordered: true, example: '0, 1', check: (vals) => (setKey(vals) === setKey([q(0), q(1)]) ? null : 'Solve 12x^2 - 12x = 0.') },
  solution: [
    t`${math`\frac{dy}{dx} = ${4}x^{${3}} - ${6}x^{${2}}`} and ${math`\frac{d^{${2}}y}{dx^{${2}}} = ${12}x^{${2}} - ${12}x = ${12}x(x - ${1})`}, zero at ${math`(${0}, ${0})`} and ${math`(${1}, ${-1})`}.`,
    t`Between them it is negative, so the curve is concave for ${math`${0} \le x \le ${1}`}, and convex outside.`,
  ],
  reference: '0, 1',
  verify: () => {
    const g = (x: number): number => polyAt(polyDeriv(polyDeriv(Q3)), x);
    return firstError(same('zeros', `${g(0)},${g(1)}`, '0,0'), same('negative at 1/2', g(0.5) < 0, true), same('y(1)', polyAt(Q3, 1), -1));
  },
  misconceptions: [{ response: '0, 3/2', why: t`Those are the stationary points, from ${math`\frac{dy}{dx} = ${0}`}. The bending is decided by ${math`\frac{d^{${2}}y}{dx^{${2}}} = ${12}x(x - ${1})`}.` }],
  official: { source: cite(F13H, 'Assignment 13 hints, Q1(iii)'), answer: '0, 1', agrees: true },
});

const sketchQ = supervision({
  id: 'a13-q1',
  source: cite(F13, 'Assignment 13, Q1'),
  title: t`Concave, convex, and four curves`,
  prompt: t`(i) For the graph ${math`y = x^{${3}} - ${2}x^{${2}} - ${3}x`}, find the point where ${math`\frac{d^{${2}}y}{dx^{${2}}} = ${0}`}. (ii) Find a range of values of ${math`x`} for which the graph ${math`y = x^{${4}} - ${6}x^{${2}} + ${9}`} is concave. (iii) For the graph ${math`y = x^{${4}} - ${2}x^{${3}}`}, find the stationary points and the points where ${math`\frac{d^{${2}}y}{dx^{${2}}} = ${0}`}, and sketch it. (iv) For the graph ${math`y = (x - ${1})^{${4}}`}, find the point where ${math`\frac{d^{${2}}y}{dx^{${2}}} = ${0}`}, and by considering the shape of the graph show that it is not a point of inflection.`,
  writeUp: 'sketch',
  official: cite(F13H, 'Assignment 13 hints, Q1'),
});

// ---------------------------------------------------------------- lesson

export const convexity: TopicContent = {
  topicId: 'calc.convexity',
  goal: t`Recognise a convex function by ${math`f'' \ge ${0}`} or by its chords lying above the graph, and use that its tangents lie below it.`,
  objective: t`Tell convex from concave by chords or the second derivative, and use that tangents lie below a convex curve.`,
  why: t`Convexity proves inequalities in one line, from Jensen's inequality to the AM-GM inequality.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`Bending upwards` },
    { kind: 'hook', text: t`Here is a claim for every real number ${math`x`}: ${math`e^{x} \ge ${1} + x`}. Try it: at ${math`x = ${1}`}, ${math`e \approx ${2.718}`} beats ${2}; at ${math`x = ${-3}`}, ${math`e^{${-3}}`} is positive and ${math`${1} + x = ${-2}`}. Why should a curve never dip below one particular straight line?` },
    { kind: 'narrative', text: t`The line ${math`y = ${1} + x`} is the tangent to ${math`y = e^{x}`} at ${math`x = ${0}`}. And ${math`e^{x}`} bends upwards everywhere: its gradient keeps increasing. A curve that always bends upwards cannot come back down to meet a tangent. To make that precise we need a definition of "bends upwards" that does not depend on pictures.` },
    { kind: 'definition', name: t`Convex and concave`, formal: t`A function ${math`f`} is [[convex-function|convex]] on an interval ${math`I`} if for all ${math`x, y \in I`} and all ${math`t \in [${0}, ${1}]`}, ${math`f(tx + (${1} - t)y) \le tf(x) + (${1} - t)f(y)`}. It is [[concave-function|concave]] on ${math`I`} if ${math`-f`} is convex there.`, plain: t`Every chord lies on or above the curve. The left side is the curve at a point between ${math`x`} and ${math`y`}; the right side is the chord at the same point. For ${math`t = ${q(1, 2)}`} it says the curve at the midpoint is no higher than the average of the end heights.` },
    { kind: 'narrative', text: t`Check it for ${math`f(x) = x^{${2}}`} at the midpoint: is ${math`\left(\frac{x + y}{${2}}\right)^{${2}} \le \frac{x^{${2}} + y^{${2}}}{${2}}`}? Multiply by ${4} and expand: ${math`x^{${2}} + ${2}xy + y^{${2}} \le ${2}x^{${2}} + ${2}y^{${2}}`}, that is ${math`${0} \le x^{${2}} - ${2}xy + y^{${2}} = (x - y)^{${2}}`}. True, because a square is never negative.` },
    { kind: 'section', title: t`The second derivative` },
    { kind: 'narrative', text: t`Checking chords directly is hard. The derivative gives an easier test. ${math`f''`} is the rate of change of the gradient: if ${math`f'' \ge ${0}`} the gradient never decreases, and the curve bends upwards.` },
    { kind: 'theorem', name: t`Second derivative test for convexity`, statement: t`If ${math`f''(x) \ge ${0}`} for every ${math`x`} in an interval ${math`I`}, then ${math`f`} is convex on ${math`I`}; if ${math`f''(x) \le ${0}`} on ${math`I`}, ${math`f`} is concave on ${math`I`}.` },
    { kind: 'p', text: t`We use this test, as the STEP Support notes do, as the working definition; its proof from the chord definition uses the mean value theorem and comes in IA Analysis. What we prove is the property that makes convexity useful.` },
    { kind: 'theorem', name: t`Tangent lines lie below`, statement: t`Let ${math`f`} be differentiable on an interval ${math`I`} with ${math`f'' \ge ${0}`} there, and let ${math`a \in I`}. Then ${math`f(x) \ge f(a) + f'(a)(x - a)`} for every ${math`x \in I`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Measure the gap`, text: t`Let ${math`g(x) = f(x) - f(a) - f'(a)(x - a)`}, the height of the curve above the tangent. We must show ${math`g(x) \ge ${0}`}.` },
        { label: t`Differentiate the gap`, text: t`${math`g'(x) = f'(x) - f'(a)`}, since ${math`f(a)`} and ${math`f'(a)`} are constants.` },
        { label: t`Use the second derivative`, text: t`${math`f'' \ge ${0}`} means ${math`f'`} never decreases, so ${math`g'(x) \le ${0}`} for ${math`x < a`} and ${math`g'(x) \ge ${0}`} for ${math`x > a`}.`, why: { q: t`Why does ${math`f'' \ge ${0}`} mean ${math`f'`} never decreases?`, a: t`${math`f''`} is the derivative of ${math`f'`}, and a function whose derivative is never negative never decreases (the monotone pieces of the curve sketching lesson).` } },
        { label: t`Read off the minimum`, text: t`So ${math`g`} decreases up to ${math`a`} and increases after it: its least value on ${math`I`} is ${math`g(a) = ${0}`}. Hence ${math`g(x) \ge ${0}`} for all ${math`x \in I`}.` },
      ],
    },
    { kind: 'narrative', text: t`This is the [[tangent-below|tangent line inequality]]. Now the hook falls out. ${math`f(x) = e^{x}`} has ${math`f'' = e^{x} > ${0}`}, so it is convex; its tangent at ${math`a = ${0}`} is ${math`y = ${1} + x`}; so ${math`e^{x} \ge ${1} + x`} for every ${math`x`}. In the same way ${math`\ln x`} has second derivative ${math`-\frac{${1}}{x^{${2}}} < ${0}`}, so it is concave and lies below its tangent at ${math`x = ${1}`}: ${math`\ln x \le x - ${1}`} for ${math`x > ${0}`}.` },
    checkFrom(chord, { a: 1, b: 0, c: 0, u: 1, v: 5 }, t`The chord from ${math`(${1}, ${1})`} to ${math`(${5}, ${25})`} has midpoint height ${13}, and the curve at ${3} has height ${9}: the chord is ${4} above.`),
    { kind: 'pitfall', claim: t`A convex function has ${math`f'' > ${0}`} everywhere.`, counterexample: t`${math`f(x) = x^{${4}}`} is convex (${math`f'' = ${12}x^{${2}} \ge ${0}`}), but ${math`f''(${0}) = ${0}`}. Convexity needs ${math`f'' \ge ${0}`}, not strict.` },
    { kind: 'pitfall', claim: t`If ${math`f''(a) > ${0}`} at one point, ${math`f`} is convex.`, counterexample: t`${math`f(x) = x^{${3}}`} has ${math`f''(${1}) = ${6} > ${0}`}, but it is concave for ${math`x < ${0}`}: the chord from ${math`${-2}`} to ${math`${0}`} lies below the curve. Convexity is a property of an interval.` },
    { kind: 'takeaway', text: t`Convex means chords lie above and tangents below; on an interval, ${math`f'' \ge ${0}`} is the test you use.` },
  ],
  examples: [
    { ...workedCambridge(concaveW), examiner: t`The examiner wants the second derivative, its factorisation, and the interval read from its sign, not from the stationary points.` },
    worked(quarticConcave, { k: 3 }, t`A quartic that is concave between two points`),
    worked(cubicSwitch, { a: 2, b: -3, c: 1, d: 4 }, t`Where a cubic changes its bending`),
  ],
  generators: [cubicSwitch, quarticConcave, chord],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['concave-function', 'tangent-below'],
  cambridge: [switchQ, quarticQ, sketchQ],
  gate: ['a13-q1-iii', 'a13-q1'],
  recall: [
    { front: t`Define a convex function on an interval.`, back: t`${math`f(tx + (${1} - t)y) \le tf(x) + (${1} - t)f(y)`} for all ${math`x, y`} in it and ${math`t \in [${0}, ${1}]`}: chords lie above.` },
    { front: t`How do you test convexity with derivatives?`, back: t`${math`f'' \ge ${0}`} on the interval gives convex; ${math`f'' \le ${0}`} gives concave.` },
    { front: t`Where does the tangent of a convex function lie?`, back: t`Below the curve: ${math`f(x) \ge f(a) + f'(a)(x - a)`}.` },
  ],
  proofOrder: [{
    title: t`The tangent lies below a convex curve`,
    steps: [
      t`Let ${math`g(x) = f(x) - f(a) - f'(a)(x - a)`}.`,
      t`Then ${math`g'(x) = f'(x) - f'(a)`}.`,
      t`${math`f'`} never decreases, so ${math`g' \le ${0}`} before ${math`a`} and ${math`g' \ge ${0}`} after.`,
      t`So ${math`g`} is least at ${math`a`}, where it is ${0}.`,
    ],
  }],
};

