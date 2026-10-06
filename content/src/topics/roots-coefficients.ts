/**
 * alg.roots-coefficients: relate the roots of a polynomial to its coefficients by
 * comparing (x - α)(x - β)(x - γ) with the expanded form, and use the relations to find
 * integer roots and symmetric expressions. Sources: STEP Support Foundation Assignment 7
 * Q2 and Q3 (2002 STEP I Q5), and Assignment 16 Q2(iv). Answers are checked by finding the
 * roots by brute force and evaluating the expressions exactly.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { add, div, int, mul, pick, q, str, sub, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { computedMath, math, t } from '../rich';
import { checkFrom, workedCambridge, worked, type TopicContent } from '../topic';
import { poly } from '../poly';
import { distinctFrom, evalPoly, fromRoots, integerRoots, named, namedAnswer, setAnswer, withExaminer } from '../prep-a';

// ---------------------------------------------------------------- symmetric expressions in two roots

interface SymP { a: number; b: number; c: number; kind: 'squares' | 'reciprocals' }
const S = (p: SymP): Rational => q(-p.b, p.a);
const P = (p: SymP): Rational => q(p.c, p.a);
const symAns = (p: SymP): Rational => (p.kind === 'squares' ? sub(mul(S(p), S(p)), mul(q(2), P(p))) : div(S(p), P(p)));
const symMis = (p: SymP): Rational[] => (p.kind === 'squares'
  ? [mul(S(p), S(p)), add(mul(S(p), S(p)), mul(q(2), P(p))), sub(mul(S(p), S(p)), P(p))]
  : [div(P(p), S(p)), div(q(p.b, p.a), P(p))]);

const symmetric = generator<SymP>({
  id: 'symmetric',
  skill: 'Find a symmetric expression in the roots, such as the sum of their squares, from the sum and product of the roots.',
  params: (rng) => {
    for (;;) {
      const p: SymP = { a: pick(rng, [1, 1, 2, 3]), b: int(rng, -9, 9), c: pick(rng, [-7, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6]), kind: rng() < 0.5 ? 'squares' : 'reciprocals' };
      if (p.b === 0) continue;
      if (distinctFrom(str(symAns(p)), symMis(p).map(str)) >= 2) return p;
    }
  },
  sane: (p) => (p.a !== 0 && p.c !== 0 ? null : 'degenerate'),
  problem: (p) => {
    const what = p.kind === 'squares' ? math`\alpha^{${2}} + \beta^{${2}}` : math`\frac{${1}}{\alpha} + \frac{${1}}{\beta}`;
    return {
      prompt: t`${math`\alpha`} and ${math`\beta`} are the roots of ${computedMath(`${poly([p.a, p.b, p.c])} = ${0}`)}. Without finding them, find ${what}.`,
      answer: { kind: 'exact', expected: str(symAns(p)) },
      solution: [
        t`Comparing ${math`${p.a === 1 ? '' : p.a}(x - \alpha)(x - \beta)`} with the quadratic: ${math`\alpha + \beta = -\frac{b}{a} = ${S(p)}`} and ${math`\alpha\beta = \frac{c}{a} = ${P(p)}`}.`,
        p.kind === 'squares'
          ? t`${math`\alpha^{${2}} + \beta^{${2}} = (\alpha + \beta)^{${2}} - ${2}\alpha\beta = ${mul(S(p), S(p))} - ${mul(q(2), P(p))} = ${symAns(p)}`}.`
          : t`${math`\frac{${1}}{\alpha} + \frac{${1}}{\beta} = \frac{\alpha + \beta}{\alpha\beta} = ${symAns(p)}`}.`,
      ],
    };
  },
  solve: (p) => {
    // Numerically from the actual roots (complex roots handled through their real and imaginary parts).
    const disc = p.b * p.b - 4 * p.a * p.c;
    const re = -p.b / (2 * p.a);
    const im = Math.sqrt(Math.abs(disc)) / (2 * p.a);
    let v: number;
    if (disc >= 0) { const r1 = re + im; const r2 = re - im; v = p.kind === 'squares' ? r1 * r1 + r2 * r2 : 1 / r1 + 1 / r2; } else { v = p.kind === 'squares' ? 2 * (re * re - im * im) : (2 * re) / (re * re + im * im); }
    const d = p.a * p.a * Math.abs(p.c);
    return str(q(Math.round(v * d), d));
  },
  misconceptions: (p): Misconception[] => {
    const ms = symMis(p);
    return p.kind === 'squares'
      ? [
          { response: str(ms[0] as Rational), why: t`${math`(\alpha + \beta)^{${2}} = \alpha^{${2}} + ${2}\alpha\beta + \beta^{${2}}`}: subtract the ${math`${2}\alpha\beta`}.` },
          { response: str(ms[1] as Rational), why: t`Subtract ${math`${2}\alpha\beta`}, do not add it: ${math`\alpha^{${2}} + \beta^{${2}} = (\alpha + \beta)^{${2}} - ${2}\alpha\beta`}.` },
          { response: str(ms[2] as Rational), why: t`The cross term of ${math`(\alpha + \beta)^{${2}}`} is ${math`${2}\alpha\beta`}, twice the product: subtract all of it.` },
        ]
      : [
          { response: str(ms[0] as Rational), why: t`Upside down: ${math`\frac{${1}}{\alpha} + \frac{${1}}{\beta} = \frac{\beta + \alpha}{\alpha\beta}`}, the sum over the product.` },
          { response: str(ms[1] as Rational), why: t`The sum of the roots is ${math`-\frac{b}{a}`}, with a minus sign.` },
        ];
  },
});

// ---------------------------------------------------------------- a quadratic with scaled roots

interface ScP { r: number; s: number; k: number }
const PQ = ['p', 'q'] as const;
/** Roots k r and k s: x^2 - k(r + s)x + k^2 rs. */
const scAns = ({ r, s, k }: ScP): [Rational, Rational] => [q(-k * (r + s)), q(k * k * r * s)];

const scaledRoots = generator<ScP>({
  id: 'scaled-roots',
  skill: 'Write down the quadratic whose roots are a multiple of the roots of a given quadratic, from the sum and product.',
  params: (rng) => {
    for (;;) {
      const p: ScP = { r: int(rng, -5, 5), s: int(rng, -5, 5), k: pick(rng, [2, 3, -1, -2]) };
      if (p.r * p.s !== 0 && p.r + p.s !== 0 && p.r !== p.s) return p;
    }
  },
  sane: (p) => (p.r * p.s !== 0 ? null : 'zero root'),
  problem: (p) => {
    const base = fromRoots([p.r, p.s]);
    const [pp, qq] = scAns(p);
    return {
      prompt: t`${math`\alpha`} and ${math`\beta`} are the roots of ${computedMath(`${poly(base)} = ${0}`)}. The equation with roots ${math`${p.k}\alpha`} and ${math`${p.k}\beta`} is ${math`x^{${2}} + px + q = ${0}`}. Find ${math`p`} and ${math`q`}.`,
      answer: namedAnswer(PQ, [pp, qq], 'The new sum is k times the old sum; the new product is k squared times the old product.'),
      solution: [
        t`${math`\alpha + \beta = ${p.r + p.s}`} and ${math`\alpha\beta = ${p.r * p.s}`}.`,
        t`New sum: ${math`${p.k}\alpha + ${p.k}\beta = ${p.k * (p.r + p.s)}`}. New product: ${math`(${p.k}\alpha)(${p.k}\beta) = ${p.k * p.k}\alpha\beta = ${p.k * p.k * p.r * p.s}`}.`,
        t`A monic quadratic is ${math`x^{${2}} - (\text{sum})x + \text{product}`}, so ${math`p = ${pp}`} and ${math`q = ${qq}`}.`,
      ],
    };
  },
  solve: (p) => {
    const nr = fromRoots([p.k * p.r, p.k * p.s]);
    return named(PQ, [q(nr[1] as number), q(nr[2] as number)]);
  },
  misconceptions: (p): Misconception[] => [
    { response: named(PQ, [q(-p.k * (p.r + p.s)), q(p.k * p.r * p.s)]), why: t`The product of ${math`${p.k}\alpha`} and ${math`${p.k}\beta`} has two factors of ${p.k}: ${math`${p.k * p.k}\alpha\beta`}.` },
    { response: named(PQ, [q(p.k * (p.r + p.s)), q(p.k * p.k * p.r * p.s)]), why: t`The coefficient of ${math`x`} is minus the sum of the roots.` },
  ],
});

// ---------------------------------------------------------------- substituting x = 1 or -1 in a cubic

interface CuP { roots: [number, number, number]; at: 1 | -1 }
const cuAns = ({ roots, at }: CuP): number => roots.reduce((acc, r) => acc * (at === 1 ? 1 - r : 1 + r), 1);

const cubicValues = generator<CuP>({
  id: 'cubic-values',
  skill: 'Find a product such as (1 + α)(1 + β)(1 + γ) by substituting a value into the factorised cubic.',
  params: (rng) => {
    for (;;) {
      const roots = [int(rng, -6, 6), int(rng, -6, 6), int(rng, -6, 6)] as [number, number, number];
      const p: CuP = { roots, at: rng() < 0.5 ? 1 : -1 };
      const v = cuAns(p);
      const f1 = Number(evalPoly(fromRoots(roots), q(p.at)).num);
      const f2 = Number(evalPoly(fromRoots(roots), q(-p.at)).num);
      const m1 = p.at === -1 ? f1 : -f1;
      if (v !== 0 && roots.every((r) => r !== 0) && distinctFrom(String(v), [String(m1), String(f2)]) >= 2) return p;
    }
  },
  sane: () => null,
  problem: (p) => {
    const c = fromRoots(p.roots);
    const what = p.at === 1 ? math`(${1} - \alpha)(${1} - \beta)(${1} - \gamma)` : math`(${1} + \alpha)(${1} + \beta)(${1} + \gamma)`;
    const f = evalPoly(c, q(p.at));
    return {
      prompt: t`${math`\alpha, \beta, \gamma`} are the roots of ${computedMath(`${poly(c)} = ${0}`)}. Find ${what} without finding the roots.`,
      answer: { kind: 'exact', expected: String(cuAns(p)) },
      solution: [
        t`${computedMath(poly(c))} is ${math`(x - \alpha)(x - \beta)(x - \gamma)`} for every ${math`x`}, so substitute ${math`x = ${p.at}`} into both.`,
        p.at === 1
          ? t`The left gives ${math`f(${1}) = ${f}`}; the right gives ${math`(${1} - \alpha)(${1} - \beta)(${1} - \gamma)`}. So the product is ${cuAns(p)}.`
          : t`The left gives ${math`f(-${1}) = ${f}`}; the right gives ${math`(-${1} - \alpha)(-${1} - \beta)(-${1} - \gamma) = -(${1} + \alpha)(${1} + \beta)(${1} + \gamma)`}. So the product is ${math`-(${f}) = ${cuAns(p)}`}.`,
      ],
    };
  },
  solve: (p) => {
    // The product of the shifted roots, from the roots themselves.
    return String(p.roots.map((r) => (p.at === 1 ? 1 - r : 1 + r)).reduce((a, b) => a * b, 1));
  },
  misconceptions: (p): Misconception[] => {
    const f = Number(evalPoly(fromRoots(p.roots), q(p.at)).num);
    return [
      p.at === -1
        ? { response: String(f), why: t`Substituting ${math`x = -${1}`} gives ${math`(-${1} - \alpha)(-${1} - \beta)(-${1} - \gamma)`}: three minus signs come out, so change the sign.` }
        : { response: String(-f), why: t`At ${math`x = ${1}`} the brackets are exactly ${math`${1} - \alpha`} and so on: no sign change is needed.` },
      { response: String(Number(evalPoly(fromRoots(p.roots), q(-p.at)).num)), why: t`Substitute ${math`x = ${p.at}`}: ${p.at === 1 ? t`${math`x - \alpha = ${1} - \alpha`}` : t`${math`x - \alpha`} becomes ${math`-${1} - \alpha`}`}.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

const a7v = auto({
  id: 'a7-q2-v',
  source: cite('step-f07', 'Q2(iv), (v)'),
  title: t`Integer roots from three substitutions`,
  prompt: t`Given that ${math`x^{${3}} - ${4}x^{${2}} - ${4}x + ${16} \equiv (x - \alpha)(x - \beta)(x - \gamma)`}, where ${math`\alpha, \beta, \gamma`} are integers, use the values at ${math`x = ${0}`}, ${math`${1}`}, and ${math`-${1}`} to find ${math`\alpha, \beta, \gamma`}.`,
  answer: setAnswer([q(-2), q(2), q(4)], 'Use (1 + α)(1 + β)(1 + γ) = -15 to list the candidates, then αβγ = -16 to rule some out.'),
  solution: [
    t`At ${math`x = ${0}`}: ${math`-\alpha\beta\gamma = ${16}`}, so ${math`\alpha\beta\gamma = -${16}`}. At ${math`x = -${1}`}: ${math`-${1} - ${4} + ${4} + ${16} = ${15} = -(${1} + \alpha)(${1} + \beta)(${1} + \gamma)`}, so the product is ${math`-${15}`}.`,
    t`So ${math`${1} + \alpha`} divides ${15}: ${math`\alpha \in \{${0}, -${2}, ${2}, -${4}, ${4}, -${6}, ${14}, -${16}\}`}. As ${math`\alpha`} divides ${16}, rule out ${0}, ${math`-${6}`}, ${14}.`,
    t`At ${math`x = ${1}`}: ${math`(${1} - \alpha)(${1} - \beta)(${1} - \gamma) = ${1} - ${4} - ${4} + ${16} = ${9}`}, so ${math`${1} - \alpha`} divides ${9}: that leaves ${math`-${2}, ${2}, ${4}`}. Their product is ${math`-${16}`}, as needed: ${math`\alpha, \beta, \gamma = -${2}, ${2}, ${4}`}.`,
  ],
  reference: '-2, 2, 4',
  verify: () => same('integer roots', integerRoots([1, -4, -4, 16]).join(','), '-2,2,4'),
  misconceptions: [{ response: '2, -2, -4', why: t`Check ${math`x = ${4}`}: ${math`${64} - ${64} - ${16} + ${16} = ${0}`}, while ${math`x = -${4}`} gives ${math`-${64} - ${64} + ${16} + ${16} \ne ${0}`}.` }],
  official: { source: cite('step-f07-hints', 'Q2(v)'), answer: '-2, 2, 4', agrees: true },
});

const a7q3 = auto({
  id: 'a7-q3-quartic',
  source: cite('step-f07', 'Q3 (2002 STEP I Q5)'),
  title: t`A quartic with integer roots`,
  prompt: t`Find the roots of ${math`x^{${4}} + ${22}x^{${3}} + ${172}x^{${2}} + ${552}x + ${576} = ${0}`}, given that they are all integers. List all four, repeating a repeated root.`,
  answer: setAnswer([q(-2), q(-6), q(-6), q(-8)], 'Write f(x) = (x + k1)(x + k2)(x + k3)(x + k4) and use f(0), f(1), f(-1).'),
  solution: [
    t`All coefficients are positive, so there is no positive root; write the roots as ${math`-k_{i}`} with ${math`f(x) = (x + k_{${1}})(x + k_{${2}})(x + k_{${3}})(x + k_{${4}})`}.`,
    t`${math`f(${0}) = k_{${1}}k_{${2}}k_{${3}}k_{${4}} = ${576}`}, ${math`f(${1}) = \prod(k_{i} + ${1}) = ${1323} = ${3}^{${3}} \times ${7}^{${2}}`}, and ${math`f(-${1}) = \prod(k_{i} - ${1}) = ${175} = ${5}^{${2}} \times ${7}`}.`,
    t`Each ${math`k_{i}`} divides ${math`${576} = ${2}^{${6}} \times ${3}^{${2}}`}, each ${math`k_{i} + ${1}`} divides ${1323}, and each ${math`k_{i} - ${1}`} divides ${175}. Only ${2}, ${6}, ${8} pass all three, and ${math`${2} \times ${6} \times ${6} \times ${8} = ${576}`} uses ${6} twice.`,
    t`So the roots are ${math`-${2}, -${6}, -${6}, -${8}`}.`,
  ],
  reference: '-2, -6, -6, -8',
  verify: () => same('the expansion of (x + 2)(x + 6)^2(x + 8)', fromRoots([-2, -6, -6, -8]).join(','), '1,22,172,552,576'),
  misconceptions: [{ response: '2, 6, 6, 8', why: t`The coefficients are all positive, so a positive ${math`x`} gives a positive value: the roots are negative.` }],
  official: { source: cite('step-f07-hints', 'Q3'), answer: '-2, -6, -6, -8', agrees: true },
});

const a7q3show = supervision({
  id: 'a7-q3-show',
  source: cite('step-f07', 'Q3 (2002 STEP I Q5)'),
  title: t`Products of the shifted roots`,
  prompt: t`Let ${math`f(x) = x^{n} + a_{${1}}x^{n - ${1}} + \cdots + a_{n}`}, where ${math`a_{${1}}, \ldots, a_{n}`} are given numbers, and suppose ${math`f(x) = (x + k_{${1}})(x + k_{${2}})\cdots(x + k_{n})`}. By considering ${math`f(${0})`}, or otherwise, show that ${math`k_{${1}}k_{${2}}\cdots k_{n} = a_{n}`}. Show also that ${math`(k_{${1}} + ${1})(k_{${2}} + ${1})\cdots(k_{n} + ${1}) = ${1} + a_{${1}} + a_{${2}} + \cdots + a_{n}`}, and give a corresponding result for ${math`(k_{${1}} - ${1})(k_{${2}} - ${1})\cdots(k_{n} - ${1})`}.`,
  writeUp: 'proof',
  official: cite('step-f07-hints', 'Q3'),
});

const a7iii = auto({
  id: 'a7-q2-iii',
  source: cite('step-f07', 'Q2(iii)'),
  title: t`Roots from their sum and product`,
  prompt: t`Write down two positive integers ${math`\alpha`} and ${math`\beta`} with ${math`\alpha\beta = ${10}`} and ${math`\alpha + \beta = ${7}`}. Hence give the roots of ${math`x^{${2}} - ${7}x + ${10} = ${0}`}.`,
  answer: setAnswer([q(2), q(5)], 'Find two numbers with product 10 and sum 7.'),
  solution: [
    t`${math`${10} = ${2} \times ${5}`} and ${math`${2} + ${5} = ${7}`}, so ${math`\alpha, \beta = ${2}, ${5}`}.`,
    t`Since ${math`(x - \alpha)(x - \beta) = x^{${2}} - (\alpha + \beta)x + \alpha\beta = x^{${2}} - ${7}x + ${10}`}, the roots are ${2} and ${5}.`,
  ],
  reference: '2, 5',
  verify: () => same('integer roots', integerRoots([1, -7, 10]).join(','), '2,5'),
  misconceptions: [{ response: '-2, -5', why: t`The sum of the roots is ${math`+${7}`}, minus the coefficient of ${math`x`}: the roots are positive.` }],
});

// ---------------------------------------------------------------- lesson

export const rootsCoefficients: TopicContent = {
  topicId: 'alg.roots-coefficients',
  goal: t`Relate the roots of a polynomial to its coefficients by comparing ${math`(x - \alpha)(x - \beta)(x - \gamma)`} with the expanded form, and use it to find integer roots.`,
  objective: t`Use the sums and products of roots to find roots and symmetric expressions.`,
  why: t`STEP often hides the roots and asks only for their sum, product, or squares.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`The idea` },
    { kind: 'hook', text: t`Without solving ${math`x^{${2}} - ${7}x + ${10} = ${0}`}, can you say what its roots add up to? Yes: ${7}. And multiply to? ${10}. The coefficients are the roots in disguise.` },
    { kind: 'narrative', text: t`Expand ${math`(x - \alpha)(x - \beta)`}: you get ${math`x^{${2}} - (\alpha + \beta)x + \alpha\beta`}. So if this is the same as ${math`x^{${2}} - ${7}x + ${10}`}, the sum of the roots is ${7} and the product is ${10}. Two numbers with sum ${7} and product ${10}: ${2} and ${5}.` },
    { kind: 'section', title: t`Quadratics` },
    {
      kind: 'definition',
      name: t`Identity`,
      formal: t`Two polynomials are identically equal, written ${math`p(x) \equiv q(x)`}, if ${math`p(x) = q(x)`} for every ${math`x`}. Then their coefficients agree term by term.`,
      plain: t`${math`${3}x + ${3} \equiv ${3}(x + ${1})`} holds for every ${math`x`}, while ${math`${3}x + ${3} = ${6}`} holds only for ${math`x = ${1}`}.`,
    },
    { kind: 'theorem', name: t`Roots and coefficients of a quadratic`, statement: t`If ${math`ax^{${2}} + bx + c \equiv a(x - \alpha)(x - \beta)`} with ${math`a \ne ${0}`}, then ${math`\alpha + \beta = -\frac{b}{a}`} and ${math`\alpha\beta = \frac{c}{a}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Expand`, text: t`${math`a(x - \alpha)(x - \beta) = ax^{${2}} - a(\alpha + \beta)x + a\alpha\beta`}.` },
        { label: t`Compare coefficients`, text: t`The two sides agree for every ${math`x`}, so the coefficients of ${math`x`} agree: ${math`b = -a(\alpha + \beta)`}; and the constants agree: ${math`c = a\alpha\beta`}.`, why: { q: t`Why must the coefficients agree?`, a: t`The difference of the two sides is a polynomial of degree at most ${2} that is ${0} for every ${math`x`}. Putting ${math`x = ${0}`}, then comparing values at two more points, forces each of its coefficients to be ${0}.` } },
        { label: t`Divide by a`, text: t`${math`a \ne ${0}`}, so ${math`\alpha + \beta = -\frac{b}{a}`} and ${math`\alpha\beta = \frac{c}{a}`}.` },
      ],
    },
    { kind: 'narrative', text: t`These are the [[vieta-formulas|relations between roots and coefficients]]. They let you compute any symmetric expression in the roots, one that does not change when ${math`\alpha`} and ${math`\beta`} swap, without knowing the roots: ${math`\alpha^{${2}} + \beta^{${2}} = (\alpha + \beta)^{${2}} - ${2}\alpha\beta`}.` },
    checkFrom(symmetric, { a: 1, b: -5, c: 3, kind: 'squares' }, t`${math`\alpha + \beta = ${5}`}, ${math`\alpha\beta = ${3}`}, so ${math`\alpha^{${2}} + \beta^{${2}} = ${25} - ${6} = ${19}`}.`),
    { kind: 'pitfall', claim: t`For ${math`x^{${2}} + ${5}x + ${6} = ${0}`}, the sum of the roots is ${5}.`, counterexample: t`The roots are ${math`-${2}`} and ${math`-${3}`}, with sum ${math`-${5}`}: the sum is minus the coefficient of ${math`x`}.` },
    { kind: 'section', title: t`Cubics and beyond` },
    { kind: 'theorem', name: t`Roots and coefficients of a cubic`, statement: t`If ${math`x^{${3}} + bx^{${2}} + cx + d \equiv (x - \alpha)(x - \beta)(x - \gamma)`}, then ${math`\alpha + \beta + \gamma = -b`}, ${math`\alpha\beta + \beta\gamma + \gamma\alpha = c`}, and ${math`\alpha\beta\gamma = -d`}.` },
    { kind: 'p', text: t`The proof is the same: expand the product and compare coefficients. A quick way to use an identity is to substitute values. At ${math`x = ${0}`}: ${math`d = -\alpha\beta\gamma`}. At ${math`x = ${1}`}: ${math`${1} + b + c + d = (${1} - \alpha)(${1} - \beta)(${1} - \gamma)`}. At ${math`x = -${1}`}: ${math`-${1} + b - c + d = -(${1} + \alpha)(${1} + \beta)(${1} + \gamma)`}.` },
    { kind: 'narrative', text: t`When the roots are integers, each substitution says that some shifted root divides a known number. Intersecting the lists of divisors usually leaves only a few candidates, which is how STEP expects you to factorise a quartic like ${math`x^{${4}} + ${22}x^{${3}} + ${172}x^{${2}} + ${552}x + ${576}`} without a calculator.` },
    checkFrom(cubicValues, { roots: [-2, 2, 4], at: -1 }, t`${math`f(-${1}) = -${1} - ${4} + ${4} + ${16} = ${15}`}, and ${math`f(-${1}) = -(${1} + \alpha)(${1} + \beta)(${1} + \gamma)`}, so the product is ${math`-${15}`}.`),
    { kind: 'takeaway', text: t`Expand ${math`(x - \alpha)(x - \beta)\cdots`} and compare coefficients, or substitute ${math`x = ${0}, \pm ${1}`}: the coefficients give the sums and products of the roots.` },
  ],
  examples: [
    withExaminer(workedCambridge(a7v), t`Each substitution stated with its result, the list of candidates written out, and every elimination justified.`),
    worked(scaledRoots, { r: 1, s: 3, k: 2 }, t`Doubling the roots`),
    worked(symmetric, { a: 2, b: 3, c: -4, kind: 'reciprocals' }, t`The sum of the reciprocals of the roots`),
  ],
  generators: [symmetric, scaledRoots, cubicValues],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['vieta-formulas'],
  cambridge: [a7q3, a7q3show, a7iii],
  gate: ['a7-q3-quartic', 'a7-q3-show'],
  recall: [
    { front: t`Sum and product of the roots of ${math`ax^{${2}} + bx + c`}?`, back: t`Sum ${math`-\frac{b}{a}`}, product ${math`\frac{c}{a}`}.` },
    { front: t`For ${math`x^{${3}} + bx^{${2}} + cx + d`} with roots ${math`\alpha, \beta, \gamma`}?`, back: t`${math`\sum\alpha = -b`}, ${math`\sum\alpha\beta = c`}, ${math`\alpha\beta\gamma = -d`}.` },
  ],
  proofOrder: [{
    title: t`Sum and product of the roots of a quadratic`,
    steps: [
      t`Expand: ${math`a(x - \alpha)(x - \beta) = ax^{${2}} - a(\alpha + \beta)x + a\alpha\beta`}.`,
      t`It equals ${math`ax^{${2}} + bx + c`} for every ${math`x`}, so the coefficients agree.`,
      t`So ${math`b = -a(\alpha + \beta)`} and ${math`c = a\alpha\beta`}.`,
      t`Dividing by ${math`a`}: ${math`\alpha + \beta = -\frac{b}{a}`}, ${math`\alpha\beta = \frac{c}{a}`}.`,
    ],
  }],
};
