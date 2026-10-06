/**
 * calc.separable-odes: first order differential equations dy/dx = f(x)g(y), solved by
 * separating the variables (justified by the chain rule), with the constant fixed by a
 * condition, and the constant solutions where g(y) = 0. The Cambridge problem is the NST
 * Mathematics Workbook, DE1, whose printed answer y = (1 - x^2)/(1 + x^2) is compared in the
 * content checks. The STEP 1 specification: "first order differential equations with
 * separable variables, including finding particular solutions".
 */
import { auto, cite, supervision } from '../cambridge';
import { add, int, mul, pick, q, str, sub, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { close, firstError } from '../prep-c';
import { dmath, math, t } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

const NST = 'nst-workbook' as const;

/** Runge-Kutta (classical, fourth order) for y' = F(x, y) from (x0, y0) to x1: an independent numerical solution. */
function rk4(F: (x: number, y: number) => number, x0: number, y0: number, x1: number, n = 2000): number {
  const h = (x1 - x0) / n;
  let x = x0;
  let y = y0;
  for (let i = 0; i < n; i++) {
    const k1 = F(x, y);
    const k2 = F(x + h / 2, y + (h * k1) / 2);
    const k3 = F(x + h / 2, y + (h * k2) / 2);
    const k4 = F(x + h, y + h * k3);
    y += (h * (k1 + 2 * k2 + 2 * k3 + k4)) / 6;
    x += h;
  }
  return y;
}

// ---------------------------------------------------------------- dy/dx = ky

interface ExpP { k: number; y0: number; a: number }
const growth = generator<ExpP>({
  id: 'exponential-growth',
  skill: 'Solve dy/dx = ky with y(0) = y0: separate, integrate to ln|y| = kx + C, and get y = y0 e^(kx).',
  params: (rng) => ({ k: pick(rng, [-3, -2, -1, 1, 2, 3]), y0: int(rng, 2, 6), a: pick(rng, [1, 2, 3]) }),
  sane: ({ y0 }) => (y0 >= 2 ? null : 'y0 too small'),
  problem: ({ k, y0, a }) => ({
    prompt: t`Solve ${math`\frac{dy}{dx} = ${k === 1 ? '' : k === -1 ? '-' : k}y`} with ${math`y = ${y0}`} when ${math`x = ${0}`}, and find ${math`y`} when ${math`x = ${a}`}.`,
    answer: { kind: 'expression', expected: `${y0}*e^(${k * a})`, variables: [] },
    solution: [
      t`Separate: ${math`\int \frac{dy}{y} = \int ${k}\,dx`}, so ${math`\ln|y| = ${k}x + C`}. Then ${math`|y| = e^{C}e^{${k}x}`}, and since ${math`y`} starts positive and is never ${0} (it would have to cross the solution ${math`y = ${0}`}), ${math`y = Ae^{${k}x}`}.`,
      t`${math`y(${0}) = A = ${y0}`}. So ${math`y(${a}) = ${y0}e^{${k * a}}`}.`,
    ],
  }),
  solve: ({ k, y0, a }) => String(rk4((_x, y) => k * y, 0, y0, a)),
  misconceptions: ({ k, y0, a }): Misconception[] => [
    { response: `${y0} + ${k * a}`, why: t`That treats the gradient as fixed at ${math`k`}. Here it is ${math`ky`}, which changes as ${math`y`} does: separate the variables.` },
    { response: `e^(${k * a})`, why: t`Fix the constant with the condition: at ${math`x = ${0}`}, ${math`y = ${y0}`}, so the solution is ${math`${y0}e^{${k}x}`}.` },
  ],
});

// ---------------------------------------------------------------- dy/dx = ky/x

interface PowP { k: number; c: number; m: number }
const powVal = ({ k, c, m }: PowP): Rational => mul(q(c), k >= 0 ? q(m ** k) : q(1, m ** -k));
const power = generator<PowP>({
  id: 'power-solution',
  skill: 'Solve dy/dx = ky/x with y(1) = c: ln|y| = k ln x + C gives y = c x^k, a product, not a sum.',
  params: (rng) => {
    for (;;) {
      const g: PowP = { k: pick(rng, [2, 3, -1, -2]), c: int(rng, 2, 5), m: pick(rng, [2, 3]) };
      const right = str(powVal(g));
      const m1 = str(powVal({ ...g, c: 1 }));
      const m2 = str(add(powVal({ ...g, c: 1 }), q(g.c - 1)));
      if (new Set([right, m1, m2]).size === 3) return g;
    }
  },
  sane: ({ c }) => (c >= 2 ? null : 'c too small'),
  problem: (g) => ({
    prompt: t`Solve ${math`\frac{dy}{dx} = \frac{${g.k === -1 ? '-' : g.k}y}{x}`} for ${math`x > ${0}`}, with ${math`y = ${g.c}`} when ${math`x = ${1}`}. Find ${math`y`} when ${math`x = ${g.m}`}.`,
    answer: { kind: 'exact', expected: str(powVal(g)) },
    solution: [
      t`Separate: ${math`\int \frac{dy}{y} = \int \frac{${g.k}}{x}\,dx`}, so ${math`\ln|y| = ${g.k}\ln x + C`}.`,
      t`Exponentiate: ${math`|y| = e^{C}x^{${g.k}}`}, a constant times ${math`x^{${g.k}}`}. With ${math`y(${1}) = ${g.c}`}: ${math`y = ${g.c}x^{${g.k}}`}, so ${math`y(${g.m}) = ${powVal(g)}`}.`,
    ],
  }),
  solve: (g) => {
    const v = rk4((x, y) => (g.k * y) / x, 1, g.c, g.m);
    return str(q(Math.round(v * 9 * 4), 9 * 4));
  },
  misconceptions: (g): Misconception[] => [
    { response: str(powVal({ ...g, c: 1 })), why: t`Use the condition: at ${math`x = ${1}`}, ${math`y = ${g.c}`}, so the constant multiplies ${math`x^{${g.k}}`} by ${g.c}.` },
    { response: str(add(powVal({ ...g, c: 1 }), q(g.c - 1))), why: t`${math`e^{k\ln x + C} = e^{C}x^{k}`}: the constant becomes a factor, not an added term.` },
  ],
});

// ---------------------------------------------------------------- dy/dx = x y^2

interface SqP { y0: number; a: number }
const sqVal = ({ y0, a }: SqP): Rational => {
  const d = sub(q(1, y0), q(a * a, 2));
  return q(d.den, d.num);
};
const sqMis = ({ y0, a }: SqP): Rational[] => {
  const plus = add(q(1, y0), q(a * a, 2));
  return [q(plus.den, plus.num), sub(q(1, y0), q(a * a, 2))];
};
const ySquared = generator<SqP>({
  id: 'y-squared',
  skill: 'Solve dy/dx = x y^2: the integral of dy/y^2 is -1/y, then rearrange for y.',
  params: (rng) => {
    for (;;) {
      const g: SqP = { y0: pick(rng, [1, 2, 3, -1, -2]), a: pick(rng, [1, 2, 3]) };
      const d = sub(q(1, g.y0), q(g.a * g.a, 2));
      // The solution must not blow up between 0 and a: 1/y0 - x^2/2 keeps its sign.
      if (d.num === 0n || Math.sign(Number(d.num)) !== Math.sign(1 / g.y0)) continue;
      if (add(q(1, g.y0), q(g.a * g.a, 2)).num === 0n) continue;
      const right = str(sqVal(g));
      const [m1, m2] = sqMis(g).map(str);
      if (new Set([right, m1, m2]).size === 3) return g;
    }
  },
  sane: (g) => (str(sub(q(1, g.y0), q(g.a * g.a, 2))) !== '0' ? null : 'blows up'),
  problem: (g) => ({
    prompt: t`Solve ${math`\frac{dy}{dx} = xy^{${2}}`} with ${math`y = ${g.y0}`} when ${math`x = ${0}`}, and find ${math`y`} when ${math`x = ${g.a}`}.`,
    answer: { kind: 'exact', expected: str(sqVal(g)) },
    solution: [
      t`Separate: ${math`\int y^{-${2}}\,dy = \int x\,dx`}, so ${math`-\frac{${1}}{y} = \frac{x^{${2}}}{${2}} + C`}.`,
      t`At ${math`x = ${0}`}: ${math`C = -\frac{${1}}{${g.y0}}`}. So ${math`\frac{${1}}{y} = ${q(1, g.y0)} - \frac{x^{${2}}}{${2}}`}, and at ${math`x = ${g.a}`}: ${math`\frac{${1}}{y} = ${sub(q(1, g.y0), q(g.a * g.a, 2))}`}, so ${math`y = ${sqVal(g)}`}.`,
    ],
  }),
  solve: (g) => {
    const v = rk4((x, y) => x * y * y, 0, g.y0, g.a, 20000);
    return str(q(Math.round(v * 232792560), 232792560));
  },
  misconceptions: (g): Misconception[] => {
    const [m1, m2] = sqMis(g);
    return [
      { response: str(m1 as Rational), why: t`${math`\int y^{-${2}}\,dy = -y^{-${1}}`}: the minus sign carries into the solution.` },
      { response: str(m2 as Rational), why: t`That is ${math`\frac{${1}}{y}`}. Take the reciprocal to find ${math`y`}.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

const solY = (x: number): number => (1 - x * x) / (1 + x * x);
const de1 = auto({
  id: 'nst-de1',
  source: cite(NST, 'Differential equations, DE1'),
  title: t`A separable equation with a condition`,
  prompt: t`Solve ${math`x\frac{dy}{dx} + (${1} - y^{${2}}) = ${0}`}, with ${math`y = ${0}`} when ${math`x = ${1}`}, for ${math`x > ${0}`}. Give ${math`y`} in terms of ${math`x`}.`,
  answer: { kind: 'expression', expected: '(1 - x^2)/(1 + x^2)', variables: ['x'], domains: { x: { kind: 'real', min: 0.2, max: 4 } } },
  solution: [
    t`Rearrange: ${math`x\frac{dy}{dx} = y^{${2}} - ${1}`}. Separate (where ${math`y \ne \pm ${1}`}): ${math`\int \frac{dy}{y^{${2}} - ${1}} = \int \frac{dx}{x}`}.`,
    t`Partial fractions: ${math`\frac{${1}}{y^{${2}} - ${1}} = \frac{${1}}{${2}}\left(\frac{${1}}{y - ${1}} - \frac{${1}}{y + ${1}}\right)`}, so ${math`\frac{${1}}{${2}}\ln\left|\frac{y - ${1}}{y + ${1}}\right| = \ln x + C`}, that is ${math`\left|\frac{y - ${1}}{y + ${1}}\right| = Ax^{${2}}`} with ${math`A = e^{${2}C} > ${0}`}.`,
    t`At ${math`x = ${1}`}, ${math`y = ${0}`}: ${math`\frac{y - ${1}}{y + ${1}} = -${1}`}, so the solution through it has ${math`\frac{y - ${1}}{y + ${1}} = -x^{${2}}`} (the sign cannot change, since ${math`y`} cannot cross ${math`\pm ${1}`}).`,
    t`Solve: ${math`y - ${1} = -x^{${2}}y - x^{${2}}`}, so ${math`y(${1} + x^{${2}}) = ${1} - x^{${2}}`} and ${math`y = \frac{${1} - x^{${2}}}{${1} + x^{${2}}}`}.`,
  ],
  reference: '(1 - x^2)/(1 + x^2)',
  verify: () => {
    const F = (x: number, y: number): number => (y * y - 1) / x;
    return firstError(close('RK4 at x = 2', rk4(F, 1, 0, 2), solY(2)), close('RK4 at x = 1/2', rk4(F, 1, 0, 0.5), solY(0.5)));
  },
  misconceptions: [{ response: '(x^2 - 1)/(x^2 + 1)', why: t`Check the condition's sign: at ${math`x = ${1}`} both are ${0}, but near it the equation gives ${math`\frac{dy}{dx} = -${1}`}, so ${math`y`} decreases through ${math`x = ${1}`}.` }],
  official: { source: cite(NST, 'Answers to Section 1, DE1'), answer: '(1 - x^2)/(1 + x^2)', agrees: true },
});

const de1Value = auto({
  id: 'nst-de1-value',
  source: cite(NST, 'Differential equations, DE1', true),
  title: t`Where the solution reaches minus a half`,
  prompt: t`The solution of ${math`x\frac{dy}{dx} + (${1} - y^{${2}}) = ${0}`} with ${math`y(${1}) = ${0}`} is ${math`y = \frac{${1} - x^{${2}}}{${1} + x^{${2}}}`}. For which ${math`x > ${0}`} is ${math`y = -\frac{${1}}{${2}}`}?`,
  answer: { kind: 'expression', expected: 'sqrt(3)', variables: [] },
  solution: [t`${math`\frac{${1} - x^{${2}}}{${1} + x^{${2}}} = -\frac{${1}}{${2}}`} gives ${math`${2} - ${2}x^{${2}} = -${1} - x^{${2}}`}, so ${math`x^{${2}} = ${3}`}.`, t`With ${math`x > ${0}`}, ${math`x = \sqrt{${3}}`}.`],
  reference: 'sqrt(3)',
  verify: () => close('y at sqrt 3', solY(Math.sqrt(3)), -0.5),
  misconceptions: [{ response: '3', why: t`${3} is ${math`x^{${2}}`}; take the positive square root.` }],
});

const de1Write = supervision({
  id: 'nst-de1-write',
  source: cite(NST, 'Differential equations, DE1', true),
  title: t`The full solution, with the constant solutions`,
  prompt: t`Solve ${math`x\frac{dy}{dx} + (${1} - y^{${2}}) = ${0}`} with ${math`y = ${0}`} when ${math`x = ${1}`}. In your write-up, say where you divide by ${math`y^{${2}} - ${1}`}, note the constant solutions ${math`y = ${1}`} and ${math`y = -${1}`}, and explain why the condition rules them out and fixes the sign inside the modulus.`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

export const separableOdes: TopicContent = {
  topicId: 'calc.separable-odes',
  goal: t`Solve ${math`\frac{dy}{dx} = f(x)g(y)`} by separating the variables and integrating, and fix the constant from a condition.`,
  objective: t`Solve separable differential equations and pick out the one solution that meets a condition.`,
  why: t`Growth, decay, cooling, and mixing are all separable; IA Differential Equations starts here.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`An equation for a function` },
    { kind: 'hook', text: t`A population grows at a rate proportional to its size: ${math`\frac{dy}{dx} = ${2}y`}. Which functions ${math`y`} do that? This is an equation whose unknown is a whole function, not a number, and you already have the tools to solve it.` },
    { kind: 'definition', name: t`Separable differential equation`, formal: t`A first order differential equation is ${math`\frac{dy}{dx} = h(x, y)`}; a solution on an interval is a differentiable function ${math`y(x)`} satisfying it there. It is [[separable-equation|separable]] if ${math`h(x, y) = f(x)g(y)`} for some functions ${math`f`} and ${math`g`}.`, plain: t`The right side splits into an ${math`x`} part times a ${math`y`} part. ${math`\frac{dy}{dx} = xy^{${2}}`} is separable; ${math`\frac{dy}{dx} = x + y`} is not.` },
    { kind: 'theorem', name: t`Separation of variables`, statement: t`Let ${math`f`} and ${math`g`} be continuous, let ${math`y(x)`} solve ${math`\frac{dy}{dx} = f(x)g(y)`} on an interval with ${math`g(y(x)) \ne ${0}`} there, and let ${math`G`} and ${math`F`} be antiderivatives of ${math`\frac{${1}}{g}`} and ${math`f`}. Then ${math`G(y(x)) = F(x) + C`} for a constant ${math`C`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Divide`, text: t`Since ${math`g(y) \ne ${0}`}, ${math`\frac{${1}}{g(y)}\frac{dy}{dx} = f(x)`}.` },
        { label: t`Recognise a chain rule`, text: t`${math`\frac{d}{dx}G(y(x)) = G'(y)\frac{dy}{dx} = \frac{${1}}{g(y)}\frac{dy}{dx}`}.` },
        { label: t`Integrate`, text: t`So ${math`\frac{d}{dx}\left(G(y(x)) - F(x)\right) = ${0}`}, and a function with zero derivative on an interval is constant.` },
      ],
    },
    { kind: 'p', text: t`In practice write ${math`\int \frac{dy}{g(y)} = \int f(x)\,dx`}, integrate both sides, and add one constant. Separately, each ${math`y_{${0}}`} with ${math`g(y_{${0}}) = ${0}`} gives a constant solution ${math`y = y_{${0}}`}, which the division missed.`, why: { q: t`Why is ${math`y = y_{${0}}`} a solution?`, a: t`Its derivative is ${0}, and the right side is ${math`f(x)g(y_{${0}}) = ${0}`} too.` } },
    {
      kind: 'steps',
      steps: [
        { label: t`Separate`, text: t`For ${math`\frac{dy}{dx} = ${2}y`}: ${math`\int \frac{dy}{y} = \int ${2}\,dx`}.` },
        { label: t`Integrate`, text: t`${math`\ln|y| = ${2}x + C`}.` },
        { label: t`Exponentiate`, text: t`${math`|y| = e^{C}e^{${2}x}`}. A solution never ${0} keeps one sign, so ${math`y = Ae^{${2}x}`} with ${math`A \ne ${0}`}; with the constant solution ${math`y = ${0}`}, every ${math`A`} works.`, eq: [dmath`y = Ae^{${2}x}`] },
        { label: t`Use a condition`, text: t`If ${math`y(${0}) = ${3}`}, then ${math`A = ${3}`}: ${math`y = ${3}e^{${2}x}`}, the [[ode-particular-solution|particular solution]].` },
      ],
    },
    checkFrom(power, { k: 2, c: 3, m: 2 }, t`${math`\ln|y| = ${2}\ln x + C`} gives ${math`y = Ax^{${2}}`}; ${math`y(${1}) = ${3}`} gives ${math`A = ${3}`}, and ${math`y(${2}) = ${12}`}.`),
    { kind: 'pitfall', claim: t`${math`\ln|y| = ${2}x + C`} gives ${math`y = e^{${2}x} + C`}.`, counterexample: t`${math`e^{${2}x + C} = e^{C}e^{${2}x}`}: the constant multiplies. Check: ${math`y = e^{${2}x} + ${1}`} has ${math`\frac{dy}{dx} = ${2}e^{${2}x}`}, but ${math`${2}y = ${2}e^{${2}x} + ${2}`}.` },
    { kind: 'pitfall', claim: t`Dividing by ${math`g(y)`} loses nothing.`, counterexample: t`${math`\frac{dy}{dx} = (y - ${3})\cos x`} has the solution ${math`y = ${3}`} for all ${math`x`}, since both sides are then ${0}, but ${math`\int \frac{dy}{y - ${3}}`} never produces it: dividing by ${math`y - ${3}`} assumed ${math`y \ne ${3}`}.` },
    { kind: 'takeaway', text: t`Separate as ${math`\int \frac{dy}{g(y)} = \int f(x)\,dx`}, add one constant, fix it with the condition, and remember the constant solutions where ${math`g(y) = ${0}`}.` },
  ],
  examples: [
    { ...workedCambridge(de1), examiner: t`The examiner wants the separation stated, partial fractions done correctly, one constant fixed by the condition, and ${math`y`} made the subject.` },
    worked(growth, { k: -2, y0: 5, a: 1 }, t`Exponential decay`),
    worked(ySquared, { y0: 1, a: 1 }, t`An equation that can blow up`),
  ],
  generators: [growth, power, ySquared],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['separable-equation', 'ode-particular-solution'],
  cambridge: [de1Value, de1Write],
  gate: ['nst-de1-write', 'nst-de1-value'],
  recall: [
    { front: t`How do you solve ${math`\frac{dy}{dx} = f(x)g(y)`}?`, back: t`${math`\int \frac{dy}{g(y)} = \int f(x)\,dx + C`}, then fix ${math`C`}; also check constant solutions where ${math`g(y) = ${0}`}.` },
    { front: t`Solve ${math`\frac{dy}{dx} = ky`}.`, back: t`${math`y = Ae^{kx}`}, with ${math`A = y(${0})`}.` },
  ],
  proofOrder: [{
    title: t`Why separating works`,
    steps: [
      t`Divide by ${math`g(y)`}, which is not ${0}.`,
      t`The left side is ${math`\frac{d}{dx}G(y(x))`} by the chain rule.`,
      t`So ${math`G(y(x)) - F(x)`} has derivative ${0}.`,
      t`Hence ${math`G(y(x)) = F(x) + C`}.`,
    ],
  }],
};

