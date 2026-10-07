/**
 * calc.implicit-differentiation: differentiating an equation in x and y term by term, with
 * d/dx g(y) = g'(y) dy/dx by the chain rule; logarithmic differentiation (a^x, x^x); and
 * curves given parametrically, dy/dx = (dy/dt)/(dx/dt). The Cambridge problems are the NST
 * Mathematics Workbook, D3(ii), (iv), D4, and D5, whose printed answers are compared in the
 * content checks. The STEP 1 specification: "Differentiate simple functions and relations
 * defined implicitly or parametrically".
 */
import { auto, cite, supervision, withUses } from '../cambridge';
import { int, pick, q, str, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { agreesAt, close, numDeriv } from '../prep-c';
import { dmath, math, t } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

const NST = 'nst-workbook' as const;

// ---------------------------------------------------------------- a circle

const POINTS: readonly [number, number][] = [[3, 4], [4, 3], [-3, 4], [3, -4], [5, 12], [12, -5], [-8, 6], [6, 8], [-5, -12], [8, -15]];
interface CirP { i: number }
const circle = generator<CirP>({
  id: 'circle-gradient',
  skill: 'Differentiate x^2 + y^2 = r^2 implicitly to get dy/dx = -x/y at a point.',
  quick: true,
  params: (rng) => ({ i: int(rng, 0, POINTS.length - 1) }),
  sane: ({ i }) => (i >= 0 && i < POINTS.length ? null : 'no point'),
  problem: ({ i }) => {
    const [p, r] = POINTS[i] as [number, number];
    const R2 = p * p + r * r;
    return {
      prompt: t`Find the gradient of the circle ${math`x^{${2}} + y^{${2}} = ${R2}`} at the point ${math`(${p}, ${r})`}.`,
      answer: { kind: 'exact', expected: str(q(-p, r)) },
      solution: [
        t`Differentiate both sides with respect to ${math`x`}, treating ${math`y`} as a function of ${math`x`}: ${math`${2}x + ${2}y\frac{dy}{dx} = ${0}`}.`,
        t`So ${math`\frac{dy}{dx} = -\frac{x}{y} = -\frac{${p}}{${r}} = ${q(-p, r)}`}.`,
      ],
    };
  },
  // The slope of the explicit branch through the point, y = ±sqrt(R^2 - x^2), by a difference quotient.
  solve: ({ i }) => {
    const [p, r] = POINTS[i] as [number, number];
    const R2 = p * p + r * r;
    const branch = (x: number): number => Math.sign(r) * Math.sqrt(R2 - x * x);
    return str(q(Math.round(numDeriv(branch, p, 1e-6) * 60), 60));
  },
  misconceptions: ({ i }): Misconception[] => {
    const [p, r] = POINTS[i] as [number, number];
    return [
      { response: str(q(p, r)), why: t`Move ${math`${2}x`} to the other side: ${math`${2}y\frac{dy}{dx} = -${2}x`}, so the gradient is ${math`-\frac{x}{y}`}.` },
      { response: str(q(-r, p)), why: t`Upside down: divide by ${math`${2}y`}, the coefficient of ${math`\frac{dy}{dx}`}.` },
    ];
  },
});

// ---------------------------------------------------------------- x^2 + axy + y^2 = c

interface ConP { a: number; p: number; r: number }
const conVal = ({ a, p, r }: ConP): Rational => q(-(2 * p + a * r), a * p + 2 * r);
const conic = generator<ConP>({
  id: 'curve-gradient',
  skill: 'Differentiate an equation with an xy term implicitly: the product rule gives y + x dy/dx.',
  params: (rng) => {
    for (;;) {
      const g: ConP = { a: pick(rng, [1, 2, 3, -1, -3]), p: int(rng, -3, 3), r: int(rng, -3, 3) };
      const den = g.a * g.p + 2 * g.r;
      const num = 2 * g.p + g.a * g.r;
      if (den === 0 || num === 0 || 2 * g.r === 0) continue;
      const right = str(conVal(g));
      const m1 = str(q(-num, 2 * g.r));
      const m2 = str(q(num, den));
      if (new Set([right, m1, m2]).size === 3) return g;
    }
  },
  sane: (g) => (g.a * g.p + 2 * g.r !== 0 ? null : 'vertical tangent'),
  problem: (g) => {
    const c = g.p * g.p + g.a * g.p * g.r + g.r * g.r;
    return {
      prompt: t`The curve ${math`x^{${2}} ${g.a < 0 ? '-' : '+'} ${Math.abs(g.a) === 1 ? '' : Math.abs(g.a)}xy + y^{${2}} = ${c}`} passes through ${math`(${g.p}, ${g.r})`}. Find ${math`\frac{dy}{dx}`} there.`,
      answer: { kind: 'exact', expected: str(conVal(g)) },
      solution: [
        t`Differentiate term by term. By the product rule, ${math`\frac{d}{dx}(xy) = y + x\frac{dy}{dx}`}; by the chain rule, ${math`\frac{d}{dx}y^{${2}} = ${2}y\frac{dy}{dx}`}. So ${math`${2}x + ${g.a}\left(y + x\frac{dy}{dx}\right) + ${2}y\frac{dy}{dx} = ${0}`}.`,
        t`Collect: ${math`(${g.a}x + ${2}y)\frac{dy}{dx} = -(${2}x + ${g.a}y)`}. At ${math`(${g.p}, ${g.r})`}: ${math`\frac{dy}{dx} = \frac{${-(2 * g.p + g.a * g.r)}}{${g.a * g.p + 2 * g.r}} = ${conVal(g)}`}.`,
      ],
    };
  },
  // Newton's method on the curve near (p + h, r) for the branch through the point, then a difference quotient.
  solve: (g) => {
    const c = g.p * g.p + g.a * g.p * g.r + g.r * g.r;
    const yAt = (x: number): number => {
      let y = g.r;
      for (let k = 0; k < 60; k++) y -= (x * x + g.a * x * y + y * y - c) / (g.a * x + 2 * y);
      return y;
    };
    return str(q(Math.round(numDeriv(yAt, g.p, 1e-6) * 360360), 360360));
  },
  misconceptions: (g): Misconception[] => [
    { response: str(q(-(2 * g.p + g.a * g.r), 2 * g.r)), why: t`${math`xy`} is a product of two functions of ${math`x`}: its derivative is ${math`y + x\frac{dy}{dx}`}, and the ${math`x\frac{dy}{dx}`} part belongs with the other ${math`\frac{dy}{dx}`} terms.` },
    { response: str(q(2 * g.p + g.a * g.r, g.a * g.p + 2 * g.r)), why: t`Moving the terms without ${math`\frac{dy}{dx}`} to the other side changes their sign.` },
  ],
});

// ---------------------------------------------------------------- parametric

interface ParP { a: number; b: number; s: number }
const parVal = ({ a, b, s }: ParP): Rational => q(3 * b * s, 2 * a);
const parametric = generator<ParP>({
  id: 'parametric',
  skill: 'Find dy/dx for x = a t^2, y = b t^3 as (dy/dt)/(dx/dt).',
  quick: true,
  params: (rng) => {
    for (;;) {
      const g: ParP = { a: pick(rng, [1, 2, 3, -1]), b: pick(rng, [1, 2, -1, 4]), s: pick(rng, [-3, -2, -1, 1, 2, 3]) };
      if (new Set([str(parVal(g)), str(q(2 * g.a, 3 * g.b * g.s)), String(3 * g.b * g.s * g.s)]).size === 3) return g;
    }
  },
  sane: ({ s }) => (s !== 0 ? null : 't = 0 is a cusp'),
  problem: (g) => ({
    prompt: t`A curve is given by ${math`x = ${g.a === 1 ? '' : g.a === -1 ? '-' : g.a}t^{${2}}`}, ${math`y = ${g.b === 1 ? '' : g.b === -1 ? '-' : g.b}t^{${3}}`}. Find ${math`\frac{dy}{dx}`} at the point where ${math`t = ${g.s}`}.`,
    answer: { kind: 'exact', expected: str(parVal(g)) },
    solution: [
      t`${math`\frac{dx}{dt} = ${2 * g.a}t`} and ${math`\frac{dy}{dt} = ${3 * g.b}t^{${2}}`}.`,
      t`By the chain rule, ${math`\frac{dy}{dx} = \frac{dy/dt}{dx/dt} = \frac{${3 * g.b}t^{${2}}}{${2 * g.a}t}`}, which at ${math`t = ${g.s}`} is ${parVal(g)}.`,
    ],
  }),
  solve: (g) => {
    const h = 1e-6;
    const dx = g.a * ((g.s + h) ** 2 - (g.s - h) ** 2);
    const dy = g.b * ((g.s + h) ** 3 - (g.s - h) ** 3);
    return str(q(Math.round((dy / dx) * 12), 12));
  },
  misconceptions: (g): Misconception[] => [
    { response: str(q(2 * g.a, 3 * g.b * g.s)), why: t`That is ${math`\frac{dx}{dy}`}. Put ${math`\frac{dy}{dt}`} on top.` },
    { response: String(3 * g.b * g.s * g.s), why: t`That is ${math`\frac{dy}{dt}`}. Divide by ${math`\frac{dx}{dt}`} to get the gradient against ${math`x`}.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const d4 = auto({
  id: 'nst-d4',
  source: cite(NST, 'Differentiation, D4'),
  title: t`An equation you cannot solve for y`,
  prompt: t`If ${math`y + e^{y} = x + x^{${3}} + ${1}`}, find ${math`\frac{dy}{dx}`} in terms of ${math`y`} and ${math`x`}.`,
  answer: { kind: 'expression', expected: '(1 + 3x^2)/(1 + e^y)', variables: ['x', 'y'] },
  solution: [
    t`There is no way to write ${math`y`} as a formula in ${math`x`}, but we do not need one. Differentiate both sides with respect to ${math`x`}; by the chain rule ${math`\frac{d}{dx}e^{y} = e^{y}\frac{dy}{dx}`}:`,
    t`${math`\frac{dy}{dx} + e^{y}\frac{dy}{dx} = ${1} + ${3}x^{${2}}`}, so ${math`(${1} + e^{y})\frac{dy}{dx} = ${1} + ${3}x^{${2}}`} and ${math`\frac{dy}{dx} = \frac{${1} + ${3}x^{${2}}}{${1} + e^{y}}`}.`,
  ],
  reference: '(1 + 3x^2)/(1 + exp(y))',
  verify: () => {
    // Solve y + e^y = x + x^3 + 1 for y by Newton's method, differentiate numerically, compare.
    const yAt = (x: number): number => {
      let y = 0;
      for (let k = 0; k < 80; k++) y -= (y + Math.exp(y) - x - x ** 3 - 1) / (1 + Math.exp(y));
      return y;
    };
    for (const x of [0.3, 1, 1.4]) {
      const e = close(`dy/dx at x = ${x}`, numDeriv(yAt, x), (1 + 3 * x * x) / (1 + Math.exp(yAt(x))));
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [{ response: '1 + 3x^2 - e^y', why: t`${math`\frac{d}{dx}e^{y} = e^{y}\frac{dy}{dx}`}, not ${math`e^{y}`}: ${math`y`} depends on ${math`x`}, so the chain rule applies.` }],
  official: { source: cite(NST, 'Answers to Section 1, D4'), answer: '(1 + 3x^2)/(1 + e^y)', agrees: true },
});

const d5 = auto({
  id: 'nst-d5',
  source: cite(NST, 'Differentiation, D5'),
  title: t`A curve given by a parameter`,
  prompt: t`If ${math`y = \frac{t + ${1}}{t - ${2}}`} and ${math`x = \frac{${2}t + ${1}}{t - ${3}}`}, find ${math`\frac{dy}{dx}`} when ${math`t = ${1}`}.`,
  answer: { kind: 'exact', expected: '12/7' },
  solution: [
    t`By the quotient rule, ${math`\frac{dy}{dt} = \frac{(t - ${2}) - (t + ${1})}{(t - ${2})^{${2}}} = \frac{-${3}}{(t - ${2})^{${2}}}`} and ${math`\frac{dx}{dt} = \frac{${2}(t - ${3}) - (${2}t + ${1})}{(t - ${3})^{${2}}} = \frac{-${7}}{(t - ${3})^{${2}}}`}.`,
    t`${math`\frac{dy}{dx} = \frac{dy/dt}{dx/dt} = \frac{${3}(t - ${3})^{${2}}}{${7}(t - ${2})^{${2}}}`}, which at ${math`t = ${1}`} is ${math`\frac{${3} \cdot ${4}}{${7} \cdot ${1}} = ${q(12, 7)}`}.`,
  ],
  reference: '12/7',
  verify: () => {
    const y = (s: number): number => (s + 1) / (s - 2);
    const x = (s: number): number => (2 * s + 1) / (s - 3);
    return close('dy/dx at t = 1', numDeriv(y, 1) / numDeriv(x, 1), 12 / 7);
  },
  misconceptions: [{ response: '7/12', why: t`That is ${math`\frac{dx}{dy}`}: put ${math`\frac{dy}{dt}`} on top.` }],
  official: { source: cite(NST, 'Answers to Section 1, D5'), answer: '12/7', agrees: true },
});

const POSX = { x: { kind: 'real' as const, min: 0.3, max: 3 } };
const ax = auto({
  id: 'nst-d3-ii',
  source: cite(NST, 'Differentiation, D3(ii)'),
  title: t`A power with the variable on top`,
  prompt: t`Find the derivative of ${math`y = a^{x}`}, where ${math`a`} is a positive constant. (Hint: take logs.)`,
  answer: { kind: 'expression', expected: 'a^x ln(a)', variables: ['x', 'a'], domains: { x: { kind: 'real', min: -2, max: 2 }, a: { kind: 'real', min: 0.5, max: 5 } } },
  solution: [
    t`Take logs: ${math`\ln y = x\ln a`}. Differentiate implicitly: ${math`\frac{${1}}{y}\frac{dy}{dx} = \ln a`}.`,
    t`So ${math`\frac{dy}{dx} = y\ln a = a^{x}\ln a`}. (Not ${math`xa^{x - ${1}}`}: the variable is in the exponent.)`,
  ],
  reference: 'a^x ln(a)',
  verify: () => {
    for (const [a, x] of [[2, 0.5], [5, -1], [0.7, 1.3]] as const) {
      const e = close(`a = ${a}, x = ${x}`, numDeriv((u) => a ** u, x), a ** x * Math.log(a));
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [{ response: 'x a^(x - 1)', why: t`The power rule needs a fixed power. Here the power varies; take logs: ${math`\ln y = x\ln a`}.` }],
  official: { source: cite(NST, 'Answers to Section 1, D3(ii)'), answer: 'a^x ln(a)', agrees: true },
});

const xx = auto({
  id: 'nst-d3-iv',
  source: cite(NST, 'Differentiation, D3(iv)'),
  title: t`x to the power x`,
  prompt: t`Find the derivative of ${math`y = x^{x}`} for ${math`x > ${0}`}.`,
  answer: { kind: 'expression', expected: 'x^x (ln(x) + 1)', variables: ['x'], domains: POSX },
  solution: [
    t`Neither the power rule nor the exponential rule applies: both base and power vary. Take logs: ${math`\ln y = x\ln x`}.`,
    t`Differentiate implicitly, with the product rule on the right: ${math`\frac{${1}}{y}\frac{dy}{dx} = \ln x + x \cdot \frac{${1}}{x} = \ln x + ${1}`}. So ${math`\frac{dy}{dx} = x^{x}(\ln x + ${1})`}.`,
  ],
  reference: 'x^x ln(x) + x^x',
  verify: () => agreesAt('derivative of x^x', 'x^x (ln(x) + 1)', (x) => numDeriv((u) => u ** u, x), [0.4, 1, 2.5]),
  misconceptions: [{ response: 'x x^(x - 1)', why: t`The power rule treats the power as fixed; here it is ${math`x`} itself. Take logs and differentiate ${math`x\ln x`}.` }],
  official: { source: cite(NST, 'Answers to Section 1, D3(iv)'), answer: 'x^x (ln(x) + 1)', agrees: true },
});

const writeUp = supervision({
  id: 'nst-d4-d5',
  source: cite(NST, 'Differentiation, D4, D5'),
  title: t`Implicit and parametric, explained`,
  prompt: t`(i) If ${math`y + e^{y} = x + x^{${3}} + ${1}`}, find ${math`\frac{dy}{dx}`} in terms of ${math`y`} and ${math`x`}, explaining why the chain rule applies to ${math`e^{y}`}. (ii) If ${math`y = \frac{t + ${1}}{t - ${2}}`} and ${math`x = \frac{${2}t + ${1}}{t - ${3}}`}, find ${math`\frac{dy}{dx}`} when ${math`t = ${1}`}, justifying the formula ${math`\frac{dy}{dx} = \frac{dy/dt}{dx/dt}`}.`,
  writeUp: 'explanation',
});

// ---------------------------------------------------------------- lesson

export const implicitDifferentiation: TopicContent = {
  topicId: 'calc.implicit-differentiation',
  goal: t`Differentiate an equation such as ${math`x^{${2}} + y^{${2}} = ${25}`} term by term, treating ${math`y`} as a function of ${math`x`}, to find gradients and tangents.`,
  objective: t`Find gradients of curves given by an equation or a parameter, without solving for y.`,
  why: t`Curves such as ${math`y + e^{y} = x`} have no formula for ${math`y`}, but their tangents are routine.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`Differentiating an equation` },
    { kind: 'hook', text: t`The circle ${math`x^{${2}} + y^{${2}} = ${25}`} passes through ${math`(${3}, ${4})`}. What is its gradient there? You could solve for ${math`y = \sqrt{${25} - x^{${2}}}`} and differentiate, but then ${math`y + \sin y = x`} would defeat you: no formula for ${math`y`} exists. There is a way that never solves for ${math`y`} at all.` },
    { kind: 'narrative', text: t`Near ${math`(${3}, ${4})`}, the circle is the graph of some function ${math`y(x)`}, even if we never write it down. Then ${math`x^{${2}} + y(x)^{${2}} = ${25}`} holds for every ${math`x`} near ${3}: both sides are the same function of ${math`x`}, so their derivatives agree. Differentiate each term; ${math`y^{${2}}`} is a function of a function, so the chain rule applies.` },
    { kind: 'theorem', name: t`Implicit differentiation`, statement: t`Let ${math`y`} be a differentiable function of ${math`x`} on an interval, and ${math`g`} differentiable. Then ${math`\frac{d}{dx}g(y) = g'(y)\frac{dy}{dx}`}. In particular, if ${math`F(x, y) = ${0}`} holds identically, differentiating each term in this way gives an equation that can be solved for ${math`\frac{dy}{dx}`}.` },
    {
      kind: 'steps',
      steps: [
        { label: t`Differentiate each term`, text: t`${math`\frac{d}{dx}x^{${2}} = ${2}x`}, ${math`\frac{d}{dx}y^{${2}} = ${2}y\frac{dy}{dx}`}, and the constant gives ${0}:`, eq: [dmath`${2}x + ${2}y\frac{dy}{dx} = ${0}`], why: { q: t`Why ${math`${2}y\frac{dy}{dx}`} and not ${math`${2}y`}?`, a: t`${math`y^{${2}}`} is ${math`g(y)`} with ${math`g(u) = u^{${2}}`}; the chain rule gives ${math`g'(y)\frac{dy}{dx}`}.` } },
        { label: t`Solve for the gradient`, text: t`${math`\frac{dy}{dx} = -\frac{x}{y}`}, valid where ${math`y \ne ${0}`}.` },
        { label: t`Substitute the point`, text: t`At ${math`(${3}, ${4})`}: ${math`-\frac{${3}}{${4}}`}. The tangent is ${math`y - ${4} = -\frac{${3}}{${4}}(x - ${3})`}, perpendicular to the radius of gradient ${math`\frac{${4}}{${3}}`}.` },
      ],
    },
    { kind: 'p', text: t`This is [[implicit-differentiation|implicit differentiation]]. Products need the product rule: ${math`\frac{d}{dx}(xy) = y + x\frac{dy}{dx}`}.` },
    checkFrom(conic, { a: 1, p: 1, r: 2 }, t`${math`${2}x + y + x\frac{dy}{dx} + ${2}y\frac{dy}{dx} = ${0}`} at ${math`(${1}, ${2})`} gives ${math`${5}\frac{dy}{dx} = -${4}`}.`),
    { kind: 'pitfall', claim: t`${math`\frac{d}{dx}y^{${2}} = ${2}y`}.`, counterexample: t`On ${math`y = x^{${3}}`}, ${math`y^{${2}} = x^{${6}}`} has derivative ${math`${6}x^{${5}}`}, while ${math`${2}y = ${2}x^{${3}}`}. The missing factor is ${math`\frac{dy}{dx} = ${3}x^{${2}}`}.` },
    { kind: 'section', title: t`Logarithms and parameters` },
    { kind: 'narrative', text: t`Taking logs first turns powers into products. For ${math`y = x^{\sin x}`} with ${math`x > ${0}`}, neither rule for powers applies, since both the base and the power vary; but ${math`\ln y = \sin x \ln x`}, and differentiating implicitly, with the product rule on the right, gives ${math`\frac{${1}}{y}\frac{dy}{dx} = \cos x\ln x + \frac{\sin x}{x}`}. Multiply by ${math`y`}: ${math`\frac{dy}{dx} = x^{\sin x}\left(\cos x\ln x + \frac{\sin x}{x}\right)`}. This is logarithmic differentiation.` },
    { kind: 'theorem', name: t`Parametric differentiation`, statement: t`If ${math`x = x(t)`} and ${math`y = y(t)`} are differentiable and ${math`\frac{dx}{dt} \ne ${0}`}, then near that point ${math`y`} is a differentiable function of ${math`x`} and ${math`\frac{dy}{dx} = \frac{dy/dt}{dx/dt}`}.` },
    { kind: 'p', text: t`Given that ${math`y`} is a differentiable function of ${math`x`}, the chain rule gives ${math`\frac{dy}{dt} = \frac{dy}{dx}\frac{dx}{dt}`}; divide by ${math`\frac{dx}{dt}`}. (That ${math`\frac{dx}{dt} \ne ${0}`} makes ${math`y`} such a function is the inverse function theorem, proved in IA Analysis.)` },
    { kind: 'pitfall', claim: t`For a parametric curve, ${math`\frac{dy}{dx} = \frac{dy}{dt}`}.`, counterexample: t`${math`x = ${2}t`}, ${math`y = ${2}t`} is the line ${math`y = x`} of gradient ${1}, but ${math`\frac{dy}{dt} = ${2}`}. Divide by ${math`\frac{dx}{dt} = ${2}`}.` },
    { kind: 'takeaway', text: t`Differentiate every term with respect to ${math`x`}, attaching ${math`\frac{dy}{dx}`} to each function of ${math`y`} by the chain rule, then solve for ${math`\frac{dy}{dx}`}.` },
  ],
  examples: [
    { ...workedCambridge(d4), examiner: t`The examiner wants the chain rule factor on ${math`e^{y}`}, the ${math`\frac{dy}{dx}`} terms collected, and the answer in terms of both ${math`x`} and ${math`y`}.` },
    worked(circle, { i: 4 }, t`A gradient on a circle`),
    worked(parametric, { a: 2, b: 1, s: 2 }, t`A gradient from a parameter`),
  ],
  generators: [circle, conic, parametric],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['implicit-differentiation'],
  cambridge: withUses([d5, ax, xx, writeUp], {
    'nst-d4-d5': { sections: ['Differentiating an equation', 'Logarithms and parameters'], note: t`Implicit and parametric differentiation, explained` },
    'nst-d3-iv': { sections: ['Logarithms and parameters'], note: t`Differentiating by taking logarithms` },
    'nst-d5': { sections: ['Logarithms and parameters'], note: t`Differentiating a curve given by a parameter` },
  }),
  gate: ['nst-d4-d5', 'nst-d3-iv', 'nst-d5'],
  recall: [
    { front: t`What is ${math`\frac{d}{dx}g(y)`} when ${math`y`} depends on ${math`x`}?`, back: t`${math`g'(y)\frac{dy}{dx}`}, by the chain rule.` },
    { front: t`How do you find ${math`\frac{dy}{dx}`} for a parametric curve?`, back: t`${math`\frac{dy/dt}{dx/dt}`}, where ${math`\frac{dx}{dt} \ne ${0}`}.` },
  ],
  proofOrder: [{
    title: t`The gradient of a circle`,
    steps: [
      t`Treat ${math`y`} as a function of ${math`x`} on the circle.`,
      t`Differentiate: ${math`${2}x + ${2}y\frac{dy}{dx} = ${0}`}.`,
      t`Solve: ${math`\frac{dy}{dx} = -\frac{x}{y}`} where ${math`y \ne ${0}`}.`,
      t`Substitute the point to get the gradient there.`,
    ],
  }],
};

