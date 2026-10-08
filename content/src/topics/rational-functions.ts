/**
 * fn.rational-functions: sketching y = p(x)/q(x) from its vertical asymptotes (zeros of the
 * denominator), its behaviour far out (polynomial division: p/q = s + r/q with deg r < deg q,
 * so y = s(x) is an asymptote when s is linear), and its turning points. The Cambridge
 * problems are STEP Support Foundation Assignment 18, Q1 (1/(x - 1), x/(x - 1), x^2/(x - 1),
 * and 1/(x - 1) + 1/(x + 1)), whose hints give x^2/(x - 1) = x + 1 + 1/(x - 1) and the turning
 * points (0, 0) and (2, 4), and Assignment 7, Q1(i). The gate adds STEP II 2012 Q5(i) (STEP
 * Questions Database), the sketch of 1/((x - a)^2 - 1).
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { int, pick, q, str, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { poly } from '../poly';
import { agreesAt, close, firstError, numDeriv } from '../prep-c';
import { computedMath as cm, dmath, math, t } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

const F18 = 'step-f18' as const;
const F18H = 'step-f18-hints' as const;
const F07 = 'step-f07' as const;
const F07H = 'step-f07-hints' as const;
const setKey = (xs: readonly Rational[]): string => xs.map(str).sort().join(',');

// ---------------------------------------------------------------- (ax + b)/(cx + d)

interface MobP { a: number; b: number; c: number; d: number }
const mobTex = ({ a, b, c, d }: MobP) => math`y = \frac{${cm(poly([a, b]))}}{${cm(poly([c, d]))}}`;
function mobParams(rng: () => number): MobP {
  for (;;) {
    const p: MobP = { a: pick(rng, [1, 2, 3, -1, -2, 4]), b: int(rng, -6, 6), c: pick(rng, [1, 2, 3, -1, -2]), d: int(rng, -6, 6) };
    if (p.a * p.d - p.b * p.c === 0 || p.d === 0 || p.b === 0) continue;
    return p;
  }
}

const vertical = generator<MobP>({
  id: 'vertical-asymptote',
  skill: 'Find the vertical asymptote of y = (ax + b)/(cx + d): where the denominator is 0 and the numerator is not.',
  quick: true,
  params: (rng) => {
    for (;;) {
      const p = mobParams(rng);
      const right = str(q(-p.d, p.c));
      if (right !== str(q(p.d, p.c)) && right !== str(q(-p.b, p.a)) && str(q(p.d, p.c)) !== str(q(-p.b, p.a))) return p;
    }
  },
  sane: (p) => (p.a * p.d !== p.b * p.c ? null : 'the fraction cancels to a constant'),
  problem: (p) => ({
    prompt: t`The curve ${mobTex(p)} has a vertical asymptote ${math`x = k`}. Find ${math`k`}.`,
    answer: { kind: 'exact', expected: str(q(-p.d, p.c)) },
    solution: [
      t`The denominator ${cm(poly([p.c, p.d]))} is ${0} when ${math`x = ${q(-p.d, p.c)}`}. There the numerator is ${math`${q(p.a * -p.d + p.b * p.c, p.c)}`}, not ${0}, so ${math`|y|`} grows without bound as ${math`x`} approaches it.`,
      t`So the vertical asymptote is ${math`x = ${q(-p.d, p.c)}`}.`,
    ],
  }),
  // Where |y| is largest on a fine grid: the pole found by looking.
  solve: (p) => {
    let best = 0;
    let at = 0;
    for (let i = -4000; i <= 4000; i++) {
      const x = i / 400 + 1e-7;
      const y = Math.abs((p.a * x + p.b) / (p.c * x + p.d));
      if (y > best) { best = y; at = x; }
    }
    return str(q(Math.round(at * 3 * 4 * 5 * 6), 3 * 4 * 5 * 6));
  },
  misconceptions: (p): Misconception[] => [
    { response: str(q(p.d, p.c)), why: t`Check the sign: ${math`cx + d = ${0}`} gives ${math`x = -\frac{d}{c}`}.` },
    { response: str(q(-p.b, p.a)), why: t`That is where the numerator is ${0}: the curve crosses the ${math`x`} axis there. The asymptote is where the denominator is ${0}.` },
  ],
});

const horizontal = generator<MobP>({
  id: 'horizontal-asymptote',
  skill: 'Find the horizontal asymptote of y = (ax + b)/(cx + d) by dividing top and bottom by x.',
  quick: true,
  params: (rng) => {
    for (;;) {
      const p = mobParams(rng);
      if (new Set([str(q(p.a, p.c)), str(q(p.b, p.d)), str(q(p.c, p.a))]).size === 3) return p;
    }
  },
  sane: (p) => (p.a * p.d !== p.b * p.c ? null : 'the fraction cancels to a constant'),
  problem: (p) => ({
    prompt: t`As ${math`x \to \pm\infty`}, the curve ${mobTex(p)} approaches a horizontal line ${math`y = L`}. Find ${math`L`}.`,
    answer: { kind: 'exact', expected: str(q(p.a, p.c)) },
    solution: [
      t`Divide the top and the bottom by ${math`x`}: ${math`y = \frac{${p.a} + \frac{${p.b}}{x}}{${p.c} + \frac{${p.d}}{x}}`}.`,
      t`As ${math`x \to \pm\infty`}, both small fractions tend to ${0}, so ${math`y \to ${q(p.a, p.c)}`}.`,
    ],
  }),
  solve: (p) => {
    const x = 1e9;
    const y = (p.a * x + p.b) / (p.c * x + p.d);
    return str(q(Math.round(y * 60), 60));
  },
  misconceptions: (p): Misconception[] => [
    { response: str(q(p.b, p.d)), why: t`That is the value at ${math`x = ${0}`}, the ${math`y`} intercept. Far out, the ${math`x`} terms dominate: ${math`y \to \frac{a}{c}`}.` },
    { response: str(q(p.c, p.a)), why: t`Upside down: the coefficient of ${math`x`} on top goes on top, ${math`\frac{a}{c}`}.` },
  ],
});

// ---------------------------------------------------------------- (x^2 + bx + c)/(x - p)

interface ObP { b: number; c: number; p: number }
const obNum = ({ b, c }: ObP): number[] => [1, b, c];
const remainder = ({ b, c, p }: ObP): number => p * p + b * p + c;

const oblique = generator<ObP>({
  id: 'oblique-asymptote',
  skill: 'Divide (x^2 + bx + c) by (x - p) to find the oblique asymptote y = x + (p + b).',
  params: (rng) => {
    for (;;) {
      const o: ObP = { b: int(rng, -5, 5), c: int(rng, -6, 6), p: pick(rng, [-3, -2, -1, 1, 2, 3, 4]) };
      if (remainder(o) !== 0 && o.p + o.b !== 0 && o.b !== 0) return o;
    }
  },
  sane: (o) => (remainder(o) !== 0 ? null : 'the fraction cancels'),
  problem: (o) => {
    const s = o.p + o.b;
    const r = remainder(o);
    return {
      prompt: t`Find the oblique asymptote of ${math`y = \frac{${cm(poly(obNum(o)))}}{${cm(poly([1, -o.p]))}}`}. Give it as ${math`y = mx + k`}, and type ${math`mx + k`}.`,
      answer: { kind: 'expression', expected: poly([1, s]), variables: ['x'] },
      solution: [
        t`Divide: ${math`${cm(poly(obNum(o)))} = (${cm(poly([1, s]))})(${cm(poly([1, -o.p]))}) + ${r}`}. Check by multiplying out: ${math`(${cm(poly([1, s]))})(${cm(poly([1, -o.p]))}) = ${cm(poly([1, s - o.p, -o.p * s]))}`}, and adding ${r} gives back the numerator.`,
        t`So ${math`y = ${cm(poly([1, s]))} + \frac{${r}}{${cm(poly([1, -o.p]))}}`}. The last fraction tends to ${0} as ${math`x \to \pm\infty`}, so the curve approaches the line ${math`y = ${cm(poly([1, s]))}`}.`,
      ],
    };
  },
  // y - x at a huge x tends to the constant of the asymptote.
  solve: (o) => {
    const x = 1e7;
    const y = (x * x + o.b * x + o.c) / (x - o.p);
    return `x + ${Math.round(y - x)}`;
  },
  misconceptions: (o): Misconception[] => [
    { response: 'x', why: t`The line is ${math`y = x + (p + b)`}, not ${math`y = x`}: the constant term of the quotient matters, because the gap ${math`y - x`} tends to it, not to ${0}.` },
    { response: poly([1, o.b]), why: t`Divide properly: the quotient is ${math`x + (p + b)`}, since ${math`(x + p + b)(x - p)`} has ${math`x`} coefficient ${math`b`}.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const sq = (x: number): number => (x * x) / (x - 1);
const obliqueQ = auto({
  id: 'a18-q1-iii',
  source: cite(F18, 'Assignment 18, Q1(iii)'),
  title: t`The oblique asymptote of x squared over x minus one`,
  prompt: t`Write ${math`y = \frac{x^{${2}}}{x - ${1}}`} in the form ${math`ax + b + \frac{c}{x - ${1}}`}, and hence find the line that the curve approaches as ${math`x \to \pm\infty`}. Type the right side of ${math`y = ax + b`}.`,
  answer: { kind: 'expression', expected: 'x + 1', variables: ['x'] },
  solution: [
    t`The aim is ${math`x^{${2}} \equiv (ax + b)(x - ${1}) + c`}. Multiply out the right side: ${math`ax^{${2}} + (b - a)x + (c - b)`}.`,
    t`Compare coefficients: ${math`a = ${1}`}; ${math`b - a = ${0}`}, so ${math`b = ${1}`}; ${math`c - b = ${0}`}, so ${math`c = ${1}`}. Hence ${math`\frac{x^{${2}}}{x - ${1}} = x + ${1} + \frac{${1}}{x - ${1}}`}.`,
    t`As ${math`x \to \pm\infty`}, ${math`\frac{${1}}{x - ${1}} \to ${0}`}, so the curve approaches the line ${math`y = x + ${1}`}.`,
    t`It never meets it: ${math`\frac{${1}}{x - ${1}}`} is never ${0}. Above the line for ${math`x > ${1}`}, below it for ${math`x < ${1}`}.`,
  ],
  reference: 'x + 1',
  verify: () => firstError(
    agreesAt('x^2/(x - 1) - 1/(x - 1)', 'x + 1', (x) => sq(x) - 1 / (x - 1), [-3, -0.5, 0.5, 2, 4]),
    close('the gap at x = 10^6', sq(1e6) - (1e6 + 1), 0, 1e-5),
  ),
  misconceptions: [{ response: 'x', why: t`The quotient is ${math`x + ${1}`}: the gap between the curve and ${math`y = x`} tends to ${1}, not ${0}.` }],
  official: { source: cite(F18H, 'Assignment 18 hints, Q1(iii)'), answer: 'x + 1', agrees: true },
});

const turnsQ = auto({
  id: 'a18-q1-iii-turns',
  source: cite(F18, 'Assignment 18, Q1(iii)', true),
  title: t`Turning points of x squared over x minus one`,
  prompt: t`Find the ${math`x`} coordinates of the turning points of ${math`y = \frac{x^{${2}}}{x - ${1}}`}.`,
  nudge: t`Not quite. Differentiating the divided form is quicker than differentiating the quotient.`,
  hints: [
    t`How can ${math`\frac{x^{${2}}}{x - ${1}}`} be split into a linear part plus a proper fraction?`,
    t`What is the derivative of ${math`(x - ${1})^{${-1}}`}?`,
    t`Setting ${math`\frac{dy}{dx} = ${0}`}, what equation does ${math`(x - ${1})^{${2}}`} satisfy, and which ${math`x`} solve it?`,
  ],
  answer: { kind: 'witness', count: 2, unordered: true, example: '0, 2', check: (vals) => (setKey(vals) === setKey([q(0), q(2)]) ? null : 'Differentiate x + 1 + 1/(x - 1) and set the derivative to 0.') },
  solution: [
    t`From ${math`y = x + ${1} + (x - ${1})^{${-1}}`}: ${math`\frac{dy}{dx} = ${1} - \frac{${1}}{(x - ${1})^{${2}}}`}, using the derivative ${math`-(x - ${1})^{${-2}}`} of ${math`(x - ${1})^{${-1}}`}.`,
    t`This is ${0} when ${math`(x - ${1})^{${2}} = ${1}`}, so ${math`x - ${1} = \pm ${1}`}: ${math`x = ${0}`} or ${math`x = ${2}`}, at ${math`(${0}, ${0})`} and ${math`(${2}, ${4})`}.`,
    t`Divide before differentiating: the simpler form gives the simpler derivative.`,
  ],
  reference: '0, 2',
  verify: () => firstError(close('slope at 0', numDeriv(sq, 0), 0), close('slope at 2', numDeriv(sq, 2), 0), same('y(2)', sq(2), 4)),
  misconceptions: [{ response: '-1, 1', why: t`Solve ${math`(x - ${1})^{${2}} = ${1}`} for ${math`x`}: ${math`x - ${1} = \pm ${1}`}, so ${math`x = ${0}`} or ${math`${2}`}.` }],
  official: { source: cite(F18H, 'Assignment 18 hints, Q1(iii)'), answer: '0, 2', agrees: true },
});

const horizQ = auto({
  id: 'a18-q1-ii',
  source: cite(F18, 'Assignment 18, Q1(ii)'),
  title: t`What happens far out?`,
  prompt: t`Write ${math`\frac{x}{x - ${1}}`} in the form ${math`a + \frac{b}{x - ${1}}`}. What value does ${math`y = \frac{x}{x - ${1}}`} approach as ${math`x \to \pm\infty`}?`,
  nudge: t`Not quite. Split off a whole part first; then only one piece changes far out.`,
  hints: [
    t`How can the numerator ${math`x`} be written as ${math`x - ${1}`} plus a constant?`,
    t`What values of ${math`a`} and ${math`b`} does that give?`,
    t`As ${math`x \to \pm\infty`}, which piece of ${math`a + \frac{b}{x - ${1}}`} tends to ${0}?`,
  ],
  answer: { kind: 'exact', expected: '1' },
  solution: [
    t`${math`x = (x - ${1}) + ${1}`}, so ${math`\frac{x}{x - ${1}} = ${1} + \frac{${1}}{x - ${1}}`}: the curve ${math`y = \frac{${1}}{x - ${1}}`} moved up by ${1}.`,
    t`As ${math`x \to \pm\infty`} the fraction tends to ${0}, so ${math`y \to ${1}`}.`,
    t`Split off the whole part; the proper fraction is what fades far out.`,
  ],
  reference: '1',
  verify: () => close('y at 10^8', 1e8 / (1e8 - 1), 1, 1e-6),
  misconceptions: [{ response: '0', why: t`${math`\frac{x}{x - ${1}} = ${1} + \frac{${1}}{x - ${1}}`}: only the fraction part tends to ${0}, leaving ${1}.` }],
  official: { source: cite(F18H, 'Assignment 18 hints, Q1(ii)'), answer: '1', agrees: true },
});

const sumQ = auto({
  id: 'a18-q1-iv',
  source: cite(F18, 'Assignment 18, Q1(iv)', true),
  title: t`Two reciprocals added`,
  prompt: t`How many turning points does ${math`y = \frac{${1}}{x - ${1}} + \frac{${1}}{x + ${1}}`} have?`,
  nudge: t`Not quite. The sign of the derivative settles this without solving an equation.`,
  hints: [
    t`What is ${math`\frac{dy}{dx}`}, term by term?`,
    t`What sign does each term of ${math`\frac{dy}{dx}`} have wherever it is defined?`,
    t`Can a derivative of that sign ever equal ${0}?`,
  ],
  answer: { kind: 'exact', expected: '0' },
  solution: [
    t`${math`\frac{dy}{dx} = -\frac{${1}}{(x - ${1})^{${2}}} - \frac{${1}}{(x + ${1})^{${2}}}`}.`,
    t`Each fraction is positive wherever it is defined, so the gradient is always negative: the curve heads downwards on every branch and has no turning points.`,
    t`A derivative that keeps one sign means no turning points.`,
  ],
  reference: '0',
  verify: () => {
    const f = (x: number): number => 1 / (x - 1) + 1 / (x + 1);
    let most = -Infinity;
    for (let x = -10; x <= 10; x += 0.0137) if (Math.abs(Math.abs(x) - 1) > 1e-3) most = Math.max(most, numDeriv(f, x, 1e-7));
    return same('the gradient is always negative', most < 0, true);
  },
  misconceptions: [{ response: '1', why: t`The curve crosses the axis at ${math`x = ${0}`}, but its gradient there is ${-2}. Both terms of ${math`\frac{dy}{dx}`} are negative everywhere, so it never levels out.` }],
  official: { source: cite(F18H, 'Assignment 18 hints, Q1(iv)'), answer: '0', agrees: true },
});

const crossQ = auto({
  id: 'a7-q1-i-cross',
  source: cite(F07, 'Assignment 7, Q1(i)(d)'),
  title: t`Where x minus its reciprocal crosses the axis`,
  prompt: t`Find the values of ${math`x`} where the graph of ${math`y = x - \frac{${1}}{x}`} crosses the ${math`x`} axis.`,
  nudge: t`Not quite. Clear the fraction, and remember which ${math`x`} is not on the curve.`,
  hints: [
    t`What equation in ${math`x`} does ${math`y = ${0}`} give?`,
    t`Multiplying by ${math`x`}, allowed because ${math`x \ne ${0}`} on the curve, what equation results?`,
    t`Which values of ${math`x`} solve it, and are they all on the curve?`,
  ],
  answer: { kind: 'witness', count: 2, unordered: true, example: '-1, 1', check: (vals) => (setKey(vals) === setKey([q(-1), q(1)]) ? null : 'Multiply x - 1/x = 0 by x (which is not 0).') },
  solution: [
    t`${math`y = ${0}`} means ${math`x = \frac{${1}}{x}`}. Multiply by ${math`x`}, allowed because ${math`x \ne ${0}`} on the curve: ${math`x^{${2}} = ${1}`}.`,
    t`So ${math`x = ${1}`} or ${math`x = ${-1}`}.`,
    t`Multiply through by a factor only after checking it is not zero.`,
  ],
  reference: '-1, 1',
  verify: () => firstError(same('y(1)', 1 - 1 / 1, 0), same('y(-1)', -1 - 1 / -1, 0)),
  misconceptions: [{ response: '0, 1', why: t`${math`x = ${0}`} is not on the curve: ${math`\frac{${1}}{x}`} is undefined there.` }],
  official: { source: cite(F07H, 'Assignment 7 hints, Q1(i)(d)'), answer: '-1, 1', agrees: true },
});

const sketchAll = supervision({
  id: 'a18-q1',
  source: cite(F18, 'Assignment 18, Q1'),
  title: t`Four rational curves`,
  prompt: t`Sketch the curves ${math`y = \frac{${1}}{x - ${1}}`}, ${math`y = \frac{x}{x - ${1}}`}, ${math`y = \frac{x^{${2}}}{x - ${1}}`}, and ${math`y = \frac{${1}}{x - ${1}} + \frac{${1}}{x + ${1}}`}, showing the intercepts with the axes, the turning points, and the asymptotes, and whether each curve approaches a horizontal asymptote from above or from below.`,
  hints: [
    t`For each curve, where is it undefined, and what does ${math`y`} do just either side of each such ${math`x`}?`,
    t`Written as a polynomial plus a proper fraction, what does each curve approach far out, and from which side?`,
    t`Where is ${math`\frac{dy}{dx} = ${0}`} on each curve, and where does each meet the axes?`,
  ],
  writeUp: 'sketch',
  official: cite(F18H, 'Assignment 18 hints, Q1'),
});

// STEP II 2012 Q5(i) (STEP Questions Database): a sketch with a parameter. Part (ii) needs the
// quotient rule, not a prerequisite.
const db12q5 = supervision({
  id: 'step12-q5-i',
  source: cite('stepdb-12-s2', 'Q5(i)'),
  title: t`A reciprocal quadratic, moved by ${math`a`}`,
  prompt: t`Sketch the curve ${math`y = f(x)`}, where ${dmath`f(x) = \frac{${1}}{(x - a)^{${2}} - ${1}} \qquad (x \ne a \pm ${1}),`} and ${math`a`} is a constant.`,
  hints: [
    t`With ${math`u = x - a`}, what curve in ${math`u`} is being sketched, and how does going back to ${math`x`} move it?`,
    t`For ${math`y = \frac{${1}}{u^{${2}} - ${1}}`}, where are the vertical asymptotes, and what sign is ${math`y`} between them and outside them?`,
    t`Where does ${math`u^{${2}} - ${1}`} take its least value, and what does that give for a turning point of the curve?`,
  ],
  writeUp: 'sketch',
});

// ---------------------------------------------------------------- lesson

export const rationalFunctions: TopicContent = {
  topicId: 'fn.rational-functions',
  goal: t`Sketch curves such as ${math`y = x + \frac{${1}}{x}`} and ${math`y = \frac{x^{${2}}}{x - ${1}}`} from their asymptotes, their behaviour near the poles, and their turning points.`,
  objective: t`Sketch a quotient of polynomials from its asymptotes, its turning points, and its intercepts.`,
  why: t`Many STEP sketches are rational curves, and inequalities such as ${math`x + \frac{${1}}{x} > ${2}`} are read off them.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`A curve with a gap` },
    { kind: 'hook', text: t`The curve ${math`y = \frac{${1}}{x + ${2}}`} has a hole in its domain: at ${math`x = -${2}`} you would divide by ${0}. What does the curve do as ${math`x`} creeps up to ${math`-${2}`}? And what does it do far away, where ${math`x`} is a million?` },
    { kind: 'narrative', text: t`Try numbers. At ${math`x = ${q(-19, 10)}`}, ${math`y = ${10}`}; at ${math`x = ${q(-199, 100)}`}, ${math`y = ${100}`}. Just to the left, at ${math`x = ${q(-201, 100)}`}, ${math`y = ${-100}`}. The curve shoots up on one side and down on the other. Far out, at ${math`x = ${998}`}, ${math`y = ${q(1, 1000)}`}: almost ${0}. These two behaviours, near the gap and far away, are what the word asymptote captures.` },
    { kind: 'definition', name: t`Rational function`, formal: t`A [[rational-function|rational function]] is ${math`f(x) = \frac{p(x)}{q(x)}`} where ${math`p`} and ${math`q`} are polynomials and ${math`q`} is not the zero polynomial, defined wherever ${math`q(x) \ne ${0}`}.`, plain: t`One polynomial divided by another, like ${math`\frac{x^{${2}} + ${3}}{x + ${1}}`}, defined everywhere except ${math`x = -${1}`}.` },
    { kind: 'definition', name: t`Asymptotes`, formal: t`The line ${math`x = a`} is a vertical [[asymptote|asymptote]] of ${math`y = f(x)`} if ${math`|f(x)| \to \infty`} as ${math`x \to a`} from at least one side. The line ${math`y = mx + k`} is an asymptote as ${math`x \to \infty`} if ${math`f(x) - (mx + k) \to ${0}`} as ${math`x \to \infty`} (similarly as ${math`x \to -\infty`}); it is horizontal when ${math`m = ${0}`} and oblique otherwise.`, plain: t`A line the curve hugs ever more closely. For ${math`y = \frac{${1}}{x + ${2}}`}: ${math`x = -${2}`} vertically and ${math`y = ${0}`} far out.` },
    { kind: 'section', title: t`What happens far out` },
    { kind: 'narrative', text: t`Near a zero of the denominator the curve usually blows up. Far out, the question is which part of the fraction wins. The trick is to divide, as you would divide numbers: ${math`\frac{${7}}{${2}} = ${3} + \frac{${1}}{${2}}`}, a whole part plus a proper fraction.` },
    { kind: 'theorem', name: t`Division of polynomials`, statement: t`Let ${math`p`} and ${math`q`} be polynomials with ${math`q`} not zero. There are polynomials ${math`s`} and ${math`r`} with ${math`p = sq + r`} and ${math`\deg r < \deg q`}. Then ${math`\frac{r(x)}{q(x)} \to ${0}`} as ${math`x \to \pm\infty`}, so when ${math`\deg s \le ${1}`} the line ${math`y = s(x)`} is an asymptote of ${math`y = \frac{p(x)}{q(x)}`} in both directions.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Divide`, text: t`Long division of ${math`p`} by ${math`q`}, stopped once the remainder's degree is below ${math`\deg q`}, gives ${math`s`} and ${math`r`}.`, plain: t`The same as dividing ${7} by ${2}: take out as many copies of the divisor as you can.` },
        { label: t`Split the fraction`, text: t`Divide ${math`p = sq + r`} by ${math`q`} where ${math`q(x) \ne ${0}`}:`, eq: [dmath`\frac{p(x)}{q(x)} = s(x) + \frac{r(x)}{q(x)}`] },
        { label: t`The remainder fades`, text: t`Let ${math`n = \deg q`}. Divide the top and bottom of ${math`\frac{r}{q}`} by ${math`x^{n}`}: every term of ${math`\frac{r(x)}{x^{n}}`} has a negative power of ${math`x`}, so tends to ${0}, while ${math`\frac{q(x)}{x^{n}}`} tends to the leading coefficient of ${math`q`}, which is not ${0}.`, why: { q: t`Why does every term of ${math`\frac{r(x)}{x^{n}}`} have a negative power?`, a: t`Each power in ${math`r`} is at most ${math`n - ${1}`}, because ${math`\deg r < n`}; dividing by ${math`x^{n}`} leaves a power of at most ${math`-${1}`}.` } },
        { label: t`Conclude`, text: t`So ${math`\frac{p(x)}{q(x)} - s(x) = \frac{r(x)}{q(x)} \to ${0}`}, which is the definition of ${math`y = s(x)`} being an asymptote.` },
      ],
    },
    { kind: 'narrative', text: t`For ${math`\frac{x^{${2}} + ${3}}{x + ${1}}`}: ${math`x^{${2}} + ${3} = (x - ${1})(x + ${1}) + ${4}`}, so ${math`\frac{x^{${2}} + ${3}}{x + ${1}} = x - ${1} + \frac{${4}}{x + ${1}}`}. The curve hugs the line ${math`y = x - ${1}`}, above it when ${math`x > -${1}`} (the extra fraction is positive) and below it when ${math`x < -${1}`}.` },
    checkFrom(horizontal, { a: 3, b: -1, c: 2, d: 5 }, t`Divide top and bottom by ${math`x`}: the constants fade and ${math`y \to \frac{${3}}{${2}}`}.`),
    { kind: 'section', title: t`Putting a sketch together` },
    { kind: 'narrative', text: t`A good sketch needs five things, in this order: the intercepts with the axes; the vertical asymptotes and the sign of ${math`y`} just either side of each; the asymptote far out, and whether the curve is above or below it; the turning points, from ${math`\frac{dy}{dx} = ${0}`}; and a final check that it all fits together.` },
    {
      kind: 'steps',
      steps: [
        { label: t`Intercepts`, text: t`For ${math`y = \frac{x^{${2}} + ${3}}{x + ${1}}`}: at ${math`x = ${0}`}, ${math`y = ${3}`}. The top ${math`x^{${2}} + ${3}`} is never ${0}, so the curve never meets the ${math`x`}-axis.` },
        { label: t`Vertical asymptote`, text: t`${math`x = -${1}`}. Just right of it, top and bottom are positive, so ${math`y \to +\infty`}; just left, the bottom is negative, so ${math`y \to -\infty`}.` },
        { label: t`Far out`, text: t`${math`y = x - ${1} + \frac{${4}}{x + ${1}}`}: the oblique asymptote is ${math`y = x - ${1}`}.` },
        { label: t`Turning points`, text: t`${math`\frac{dy}{dx} = ${1} - \frac{${4}}{(x + ${1})^{${2}}}`} is ${0} when ${math`(x + ${1})^{${2}} = ${4}`}, that is ${math`x + ${1} = \pm ${2}`}: at ${math`(-${3}, -${6})`}, a local maximum, and ${math`(${1}, ${2})`}, a local minimum.`, plain: t`Where does ${math`-\frac{${4}}{(x + ${1})^{${2}}}`} come from? The graph of ${math`\frac{${4}}{x + ${1}}`} is the graph of ${math`\frac{${4}}{x} = ${4}x^{-${1}}`} slid ${1} to the left, and sliding does not change gradients. The power rule gives ${math`-${4}x^{-${2}}`} for ${math`${4}x^{-${1}}`}, so at the slid point the gradient is ${math`-\frac{${4}}{(x + ${1})^{${2}}}`}. The heights: ${math`\frac{${9} + ${3}}{-${2}} = -${6}`} and ${math`\frac{${1} + ${3}}{${2}} = ${2}`}.`, why: { q: t`How do we know which is which?`, a: t`Left of ${math`-${1}`} the curve comes up from far below, along the line, turns at ${math`(-${3}, -${6})`}, and goes back down to ${math`-\infty`} near ${math`x = -${1}`}: a maximum. The right branch mirrors it, coming down from ${math`+\infty`} to ${math`(${1}, ${2})`} and rising along the line: a minimum.` } },
      ],
    },
    { kind: 'pitfall', claim: t`A curve never crosses its asymptote.`, counterexample: t`${math`y = \frac{x}{x^{${2}} + ${1}}`} has horizontal asymptote ${math`y = ${0}`}, yet it crosses that line at the origin. An asymptote describes behaviour far out, not a barrier.` },
    { kind: 'pitfall', claim: t`Every zero of the denominator gives a vertical asymptote.`, counterexample: t`${math`\frac{x^{${2}} - ${1}}{x - ${1}} = x + ${1}`} for ${math`x \ne ${1}`}: near ${math`x = ${1}`} it approaches ${2}, not infinity. The factor cancels, leaving a single missing point.` },
    { kind: 'takeaway', text: t`Divide first: ${math`\frac{p}{q} = s + \frac{r}{q}`} shows the asymptote ${math`y = s(x)`} far out, the zeros of ${math`q`} show the vertical ones, and ${math`\frac{dy}{dx} = ${0}`} gives the turns.` },
  ],
  examples: [
    { ...workedCambridge(obliqueQ), examiner: t`The examiner looks for the division done correctly and checked, the asymptote named as a line, and which side of it the curve lies.` },
    worked(oblique, { b: 1, c: -4, p: 2 }, t`An oblique asymptote by division`),
    worked(vertical, { a: 2, b: 3, c: 3, d: -6 }, t`Where the denominator vanishes`),
  ],
  generators: [vertical, horizontal, oblique],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['rational-function', 'asymptote'],
  cambridge: withUses([turnsQ, horizQ, sumQ, crossQ, sketchAll, db12q5], {
    'a18-q1': { sections: ['What happens far out', 'Putting a sketch together'], note: t`Sketching four rational curves with asymptotes and turning points` },
    'step12-q5-i': { sections: ['A curve with a gap', 'Putting a sketch together'], note: t`Sketching a reciprocal quadratic shifted by a parameter` },
  }),
  // Assignment 18 Q1 (2014 STEP I Q3) first; then STEP II 2012 Q5(i), a sketch with a parameter.
  gate: ['a18-q1', 'step12-q5-i'],
  recall: [
    { front: t`What is an asymptote ${math`y = mx + k`}?`, back: t`A line with ${math`f(x) - (mx + k) \to ${0}`} as ${math`x \to \infty`} or ${math`x \to -\infty`}.` },
    { front: t`How do you find the asymptote of ${math`\frac{p}{q}`} far out?`, back: t`Divide: ${math`\frac{p}{q} = s + \frac{r}{q}`} with ${math`\deg r < \deg q`}; then ${math`y = s(x)`}.` },
    { front: t`Where can a vertical asymptote be?`, back: t`Only where the denominator is ${0}, and only if the factor does not cancel with the numerator.` },
  ],
  proofOrder: [{
    title: t`The quotient is the asymptote`,
    steps: [
      t`Divide: ${math`p = sq + r`} with ${math`\deg r < \deg q`}.`,
      t`So ${math`\frac{p}{q} - s = \frac{r}{q}`}.`,
      t`Divide the top and bottom of ${math`\frac{r}{q}`} by the top power of ${math`q`}.`,
      t`The top tends to ${0} and the bottom to a nonzero number, so the gap tends to ${0}.`,
    ],
  }],
};
