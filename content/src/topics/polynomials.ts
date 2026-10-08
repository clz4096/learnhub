/**
 * alg.polynomials: the remainder and factor theorems; find a root by trial, divide out the
 * factor, and write a cubic as a product of linear factors. Sources: STEP Support
 * Foundation Assignment 4 Q2(ii), Assignment 15 Q1(ii), Assignment 16 Q2(iii), (iv),
 * Assignment 18 Q2(i) and Q3 (2014 STEP I Q3), and the NST Maths Workbook A6. Roots are
 * found by trying every divisor of the constant term, and checked by exact evaluation.
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { int, pick, q, str, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { computedMath, math, t } from '../rich';
import { checkFrom, workedCambridge, worked, type TopicContent } from '../topic';
import { poly } from '../poly';
import { asList, distinctFrom, evalPoly, fromRoots, integerRoots, named, namedAnswer, setAnswer, setKey, withExaminer } from '../prep-a';

const fac = (r: number): string => (r === 0 ? 'x' : `(x ${r < 0 ? '+' : '-'} ${Math.abs(r)})`);

// ---------------------------------------------------------------- the roots of a cubic

/** A root whose negative is not also a root, for the one-sign-slip misconception. */
const flipOne = (roots: readonly number[]): number => roots.find((r) => !roots.includes(-r)) as number;

interface CubP { roots: [number, number, number] }
const cubic = generator<CubP>({
  id: 'cubic-roots',
  skill: 'Find the roots of a cubic with integer roots: test divisors of the constant term, then divide out each factor.',
  params: (rng) => {
    for (;;) {
      const roots = [int(rng, -5, 5), int(rng, -5, 5), int(rng, -5, 5)] as [number, number, number];
      if (new Set(roots).size === 3 && !roots.includes(0) && roots.some((r) => !roots.includes(-r))) return { roots };
    }
  },
  sane: ({ roots }) => (new Set(roots).size === 3 ? null : 'repeated root'),
  problem: ({ roots }) => {
    const c = fromRoots(roots);
    const [r1, r2, r3] = [...roots].sort((a, b) => Math.abs(a) - Math.abs(b)) as [number, number, number];
    const quad = fromRoots([r2, r3]);
    return {
      prompt: t`Find the three roots of ${computedMath(`${poly(c)} = ${0}`)}.`,
      answer: setAnswer(roots.map((r) => q(r)), 'Substitute each value into the cubic: each must give 0.'),
      solution: [
        t`Any integer root divides the constant term ${c[3] as number}. Try small divisors: ${math`f(${r1}) = ${0}`}, so ${computedMath(fac(r1))} is a factor, by the factor theorem.`,
        t`Divide it out: ${computedMath(`${poly(c)} = ${fac(r1)}(${poly(quad)})`)}.`,
        t`Factorise the quadratic: ${computedMath(`${poly(quad)} = ${fac(r2)}${fac(r3)}`)}. So the roots are ${math`${r1}`}, ${math`${r2}`}, and ${math`${r3}`}.`,
      ],
    };
  },
  solve: ({ roots }) => asList(integerRoots(fromRoots(roots)).map((r) => q(r))),
  misconceptions: ({ roots }): Misconception[] => [
    { response: asList(roots.map((r) => q(-r))), why: t`Those are the roots with the signs flipped: the factor ${math`x - a`} is ${0} at ${math`x = a`}, not ${math`-a`}.` },
    { response: asList(roots.map((r) => q(r === flipOne(roots) ? -r : r))), why: t`Substitute each value back: ${math`f(${-flipOne(roots)}) \ne ${0}`}. One sign has slipped; the root is ${flipOne(roots)}.` },
  ],
});

// ---------------------------------------------------------------- the remainder theorem

interface RemP { c: number[]; a: number }
const remainder = generator<RemP>({
  id: 'remainder',
  skill: 'Find the remainder on dividing p(x) by x - a, without dividing: it is p(a).',
  quick: true,
  params: (rng) => {
    for (;;) {
      const c = [pick(rng, [1, 1, 2, 3]), int(rng, -6, 6), int(rng, -9, 9), int(rng, -12, 12)];
      const a = pick(rng, [-3, -2, -1, 2, 3]);
      const right = str(evalPoly(c, q(a)));
      if (distinctFrom(right, [str(evalPoly(c, q(-a))), str(evalPoly(c, q(1)))]) >= 2) return { c, a };
    }
  },
  sane: ({ c }) => (c[0] !== 0 ? null : 'not a cubic'),
  problem: ({ c, a }) => {
    const v = evalPoly(c, q(a));
    return {
      prompt: t`Find the remainder when ${computedMath(poly(c))} is divided by ${computedMath(fac(a).replace(/[()]/g, ''))}.`,
      answer: { kind: 'exact', expected: str(v) },
      solution: [
        t`By the remainder theorem, the remainder on division by ${math`x - a`} is ${math`p(a)`}, here with ${math`a = ${a}`}.`,
        t`${math`p(${a}) = ${c[0] as number}(${a})^{${3}} + (${c[1] as number})(${a})^{${2}} + (${c[2] as number})(${a}) + (${c[3] as number}) = ${v}`}.`,
      ],
    };
  },
  solve: ({ c, a }) => {
    // Synthetic division: the last number left is the remainder.
    let acc = 0;
    for (const k of c) acc = acc * a + k;
    return String(acc);
  },
  misconceptions: ({ c, a }): Misconception[] => [
    { response: str(evalPoly(c, q(-a))), why: t`Division by ${math`x - a`} gives the remainder ${math`p(a)`}; here ${computedMath(fac(a).replace(/[()]/g, ''))} is zero at ${math`x = ${a}`}, so evaluate at ${a}, not ${-a}.` },
    { response: str(evalPoly(c, q(1))), why: t`That is ${math`p(${1})`}, the sum of the coefficients. Substitute the root of the divisor instead.` },
  ],
});

// ---------------------------------------------------------------- dividing out a factor

interface DivP { r: number; s: number; u: number; lead: number }
const divCoeffs = ({ r, s, u, lead }: DivP): number[] => fromRoots([r, s, u], lead);
/** Quotient of p by (x - k), by synthetic division. */
const quotient = (c: readonly number[], k: number): number[] => {
  const out: number[] = [];
  let acc = 0;
  for (let i = 0; i < c.length - 1; i++) { acc = acc * k + (c[i] as number); out.push(acc); }
  return out;
};
const BC = ['a', 'b', 'c'] as const;
/** The slip of reading the constant as c = (constant)/r, forgetting the minus sign in -r. */
const constSlip = (c: readonly number[], r: number): number[] => { const qq = quotient(c, r); return [qq[0] as number, qq[1] as number, (c[3] as number) / r]; };

const divideOut = generator<DivP>({
  id: 'divide-out',
  skill: 'Divide a cubic by a known linear factor to leave a quadratic, by comparing coefficients.',
  params: (rng) => {
    for (;;) {
      const p: DivP = { r: pick(rng, [-4, -3, -2, 2, 3, 4]), s: int(rng, -5, 5), u: int(rng, -5, 5), lead: pick(rng, [1, 1, 2, 3]) };
      const c = divCoeffs(p);
      const right = quotient(c, p.r).join(',');
      if (p.s !== 0 && p.u !== 0 && distinctFrom(right, [quotient(c, -p.r).join(','), constSlip(c, p.r).join(',')]) >= 2) return p;
    }
  },
  sane: (p) => (p.lead >= 1 ? null : 'bad lead'),
  problem: (p) => {
    const c = divCoeffs(p);
    const [a, b, cc] = quotient(c, p.r) as [number, number, number];
    return {
      prompt: t`${computedMath(fac(p.r).replace(/[()]/g, ''))} is a factor of ${computedMath(poly(c))}. Write ${computedMath(`${poly(c)} = ${fac(p.r)}(ax^${2} + bx + c)`)} and find ${math`a`}, ${math`b`}, ${math`c`}.`,
      answer: namedAnswer(BC, [q(a), q(b), q(cc)], 'Compare coefficients from the top, or check by multiplying back out.'),
      solution: [
        t`Compare the ${math`x^{${3}}`} terms: ${math`a = ${a}`}. Compare the ${math`x^{${2}}`} terms: ${math`b - (${p.r})a = ${c[1] as number}`}, so ${math`b = ${b}`}.`,
        t`Compare the constants: ${math`-(${p.r})c = ${c[3] as number}`}, so ${math`c = ${cc}`}. Check the ${math`x`} terms: ${math`c - (${p.r})b = ${cc - p.r * b}`}, which matches ${c[2] as number}.`,
      ],
    };
  },
  solve: (p) => {
    // Search small integer coefficients whose product with the factor is the cubic.
    const c = divCoeffs(p);
    for (let b = -60; b <= 60; b++) for (let cc = -80; cc <= 80; cc++) {
      const prod = [p.lead, b - p.r * p.lead, cc - p.r * b, -p.r * cc];
      if (prod.every((v, i) => v === c[i])) return named(BC, [q(p.lead), q(b), q(cc)]);
    }
    return 'none';
  },
  misconceptions: (p): Misconception[] => {
    const c = divCoeffs(p);
    return [
      { response: named(BC, quotient(c, -p.r).map((v) => q(v))), why: t`The factor ${computedMath(fac(p.r).replace(/[()]/g, ''))} has root ${p.r}, so divide using ${p.r}, not ${-p.r}. Multiply back out to check.` },
      { response: named(BC, constSlip(c, p.r).map((v) => q(v))), why: t`Compare the constants with their signs: ${math`(-${p.r}) \times c = ${c[3] as number}`} gives ${math`c = ${quotient(c, p.r)[2] as number}`}. Multiply back out to check.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

const a4q2ii = auto({
  id: 'a4-q2-ii',
  source: cite('step-f04', 'Q2(ii)'),
  title: t`A root, then the other two`,
  prompt: t`Show that ${math`x = ${3}`} is a root of ${math`x^{${3}} - ${2}x^{${2}} - ${5}x + ${6} = ${0}`}. Find the other two roots, and give all three.`,
  answer: setAnswer([q(3), q(1), q(-2)], 'Divide by x - 3, then factorise the quadratic.'),
  solution: [
    t`${math`f(${3}) = ${27} - ${18} - ${15} + ${6} = ${0}`}, so ${math`x - ${3}`} is a factor.`,
    t`Divide: ${math`x^{${3}} - ${2}x^{${2}} - ${5}x + ${6} = (x - ${3})(x^{${2}} + x - ${2}) = (x - ${3})(x - ${1})(x + ${2})`}.`,
    t`The roots are ${3}, ${1}, and ${math`-${2}`}.`,
  ],
  reference: '3, 1, -2',
  verify: () => same('integer roots', integerRoots([1, -2, -5, 6]).join(','), '-2,1,3'),
  misconceptions: [{ response: '-3, -1, 2', why: t`The factor ${math`x + ${2}`} gives the root ${math`-${2}`}: each root has the opposite sign to the number in its bracket.` }],
  official: { source: cite('step-f04-hints', 'Q2(ii)'), answer: '3, 1, -2', agrees: true },
});

const a15 = auto({
  id: 'a15-q1-ii',
  source: cite('step-f15', 'Q1(ii)'),
  title: t`A quartic with two integer roots`,
  prompt: t`Show that ${math`x = ${15}`} is a root of ${math`x^{${4}} - ${18}x^{${3}} + ${35}x^{${2}} + ${180}x - ${450} = ${0}`}, and find all its roots. Give ${math`p`} and ${math`q`} with ${math`x^{${4}} - ${18}x^{${3}} + ${35}x^{${2}} + ${180}x - ${450} = (x - ${15})(x - ${3})(x^{${2}} + px + q)`}.`,
  answer: namedAnswer(['p', 'q'], [q(0), q(-10)], 'Divide by x - 15, find a root of the cubic, and divide again.'),
  solution: [
    t`Factor out ${math`${15}^{${2}}`} to keep the numbers small: ${math`f(${15}) = ${15}^{${2}}(${225} - ${270} + ${35} + ${12} - ${2}) = ${0}`}.`,
    t`Divide by ${math`x - ${15}`}: the quotient is ${math`x^{${3}} - ${3}x^{${2}} - ${10}x + ${30} = x^{${2}}(x - ${3}) - ${10}(x - ${3}) = (x - ${3})(x^{${2}} - ${10})`}.`,
    t`So ${math`p = ${0}`}, ${math`q = -${10}`}, and the roots are ${15}, ${3}, ${math`\sqrt{${10}}`}, and ${math`-\sqrt{${10}}`}.`,
    t`Divide out a known root, then look for grouping in what remains.`,
  ],
  reference: 'p = 0, q = -10',
  verify: () => {
    // (x - 15)(x - 3)(x^2 - 10), expanded, against the quartic.
    const prod = fromRoots([15, 3]);
    const full = [1, prod[1] as number, (prod[2] as number) - 10, -10 * (prod[1] as number), -10 * (prod[2] as number)];
    return same('the expansion', full.join(','), '1,-18,35,180,-450');
  },
  misconceptions: [{ response: 'p = 0, q = 10', why: t`${math`x^{${2}}(x - ${3}) - ${10}(x - ${3}) = (x - ${3})(x^{${2}} - ${10})`}: the sign of the ${10} carries into the bracket.` }],
  nudge: t`Not quite. After dividing by ${math`x - ${15}`}, the cubic factorises by grouping; watch the sign in the last factor.`,
  hints: [
    t`How can ${math`f(${15})`} be checked without large numbers, for example by taking out a factor ${math`${15}^{${2}}`}?`,
    t`Which cubic is left after dividing by ${math`x - ${15}`}?`,
    t`How does that cubic factorise by grouping, and which quadratic factor remains?`,
  ],
});

const a16iii = auto({
  id: 'a16-q2-iii',
  source: cite('step-f16', 'Q2(iii)'),
  title: t`A surd root of a cubic`,
  prompt: t`Show that ${math`${1} + \sqrt{${2}}`} is a root of ${math`${2}x^{${3}} - (${2}\sqrt{${2}} + ${6})x^{${2}} + (${4}\sqrt{${2}} + ${5})x - \sqrt{${2}} - ${1} = ${0}`}. Hence find the other two roots, and give the smaller of them. (Type a square root as sqrt.)`,
  answer: { kind: 'expression', expected: '1 - sqrt(2)/2', variables: [] },
  solution: [
    t`Each term at ${math`x = ${1} + \sqrt{${2}}`} has the factor ${math`${1} + \sqrt{${2}}`}: the value is ${math`(${1} + \sqrt{${2}})\left[${2}(${3} + ${2}\sqrt{${2}}) - (${8}\sqrt{${2}} + ${10}) + (${4}\sqrt{${2}} + ${5}) - ${1}\right] = (${1} + \sqrt{${2}}) \times ${0} = ${0}`}.`,
    t`Divide by ${math`x - ${1} - \sqrt{${2}}`}: the quotient is ${math`${2}x^{${2}} - ${4}x + ${1}`}, as multiplying back out confirms.`,
    t`${math`${2}x^{${2}} - ${4}x + ${1} = ${0}`} gives ${math`x = \frac{${4} \pm \sqrt{${16} - ${8}}}{${4}} = ${1} \pm \frac{\sqrt{${2}}}{${2}}`}. The smaller is ${math`${1} - \frac{\sqrt{${2}}}{${2}}`}.`,
    t`Conjugate surd roots come in pairs only when the coefficients are rational.`,
  ],
  reference: '1 - sqrt(2)/2',
  verify: () => {
    const r2 = Math.SQRT2;
    const f = (x: number): number => 2 * x ** 3 - (2 * r2 + 6) * x ** 2 + (4 * r2 + 5) * x - r2 - 1;
    const bad = [1 + r2, 1 + r2 / 2, 1 - r2 / 2].find((x) => Math.abs(f(x)) > 1e-9);
    return bad === undefined ? null : `${bad} is not a root`;
  },
  misconceptions: [{ response: '1 - sqrt(2)', why: t`${math`${1} - \sqrt{${2}}`} is the conjugate of the given root, but the cubic has surd coefficients, so conjugates need not be roots. Divide out the factor and solve the quadratic.` }],
  nudge: t`Not quite. The coefficients involve ${math`\sqrt{${2}}`}, so the conjugate need not be a root; divide by the known factor instead.`,
  hints: [
    t`What common factor do all the terms share at ${math`x = ${1} + \sqrt{${2}}`}?`,
    t`Which quadratic is left after dividing the cubic by ${math`x - ${1} - \sqrt{${2}}`}?`,
    t`What are the roots of that quadratic, and which is smaller?`,
  ],
});

const a16iv = auto({
  id: 'a16-q2-iv',
  source: cite('step-f16', 'Q2(iv)'),
  title: t`A substitution that rescales the roots`,
  prompt: t`Solve ${math`${2}x^{${3}} - ${5}x^{${2}} - ${6}x + ${9} = ${0}`}. Using a substitution ${math`x = ky`} for a suitable ${math`k`}, find the solutions of ${math`${6}y^{${3}} - ${5}y^{${2}} - ${2}y + ${1} = ${0}`}.`,
  answer: setAnswer([q(1, 3), q(1), q(-1, 2)], 'Find k by substituting x = ky, then divide each root for x by k.'),
  solution: [
    t`${math`x = ${1}`} is a root, and ${math`${2}x^{${3}} - ${5}x^{${2}} - ${6}x + ${9} = (x - ${1})(${2}x^{${2}} - ${3}x - ${9}) = (x - ${1})(x - ${3})(${2}x + ${3})`}: roots ${1}, ${3}, ${math`-${q(3, 2)}`}.`,
    t`Put ${math`x = ky`}: ${math`${2}k^{${3}}y^{${3}} - ${5}k^{${2}}y^{${2}} - ${6}ky + ${9} = ${0}`}. Dividing by ${9}, ${math`k = ${3}`} gives ${math`${6}y^{${3}} - ${5}y^{${2}} - ${2}y + ${1} = ${0}`}.`,
    t`So ${math`y = \frac{x}{${3}}`}: ${math`y = ${q(1, 3)}, ${1}, -${q(1, 2)}`}.`,
    t`A substitution ${math`x = ky`} rescales every root by the same factor.`,
  ],
  reference: '1/3, 1, -1/2',
  verify: () => {
    const ys = [q(1, 3), q(1), q(-1, 2)];
    const bad = ys.find((y) => evalPoly([6, -5, -2, 1], y).num !== 0n);
    return bad === undefined ? same('the x roots', setKey([q(1), q(3), q(-3, 2)].filter((x) => evalPoly([2, -5, -6, 9], x).num === 0n)), setKey([q(1), q(3), q(-3, 2)])) : `${str(bad)} is not a root`;
  },
  misconceptions: [{ response: '3, 9, -9/2', why: t`${math`x = ${3}y`}, so ${math`y = \frac{x}{${3}}`}: divide the roots by ${3}, do not multiply.` }],
  nudge: t`Not quite. Solve the cubic in ${math`x`} first; the substitution only rescales its roots.`,
  hints: [
    t`Which small integer is a root of ${math`${2}x^{${3}} - ${5}x^{${2}} - ${6}x + ${9}`}?`,
    t`After putting ${math`x = ky`}, which ${math`k`} makes the coefficients proportional to those of the cubic in ${math`y`}?`,
    t`With ${math`x = ky`}, how are the roots in ${math`y`} obtained from the roots in ${math`x`}?`,
  ],
});

const a18i = auto({
  id: 'a18-q2-i',
  source: cite('step-f18', 'Q2(i)'),
  title: t`A quadratic with a parameter`,
  prompt: t`Solve ${math`(a + ${2})x^{${2}} - ${2}x - a = ${0}`}, where ${math`a \ne -${2}`}. One root is ${1}: give the other in terms of ${math`a`}.`,
  answer: { kind: 'expression', expected: '-a/(a + 2)', variables: ['a'], domains: { a: { kind: 'real', min: 0, max: 5 } } },
  solution: [
    t`At ${math`x = ${1}`}: ${math`a + ${2} - ${2} - a = ${0}`}, so ${math`x - ${1}`} is a factor.`,
    t`${math`(a + ${2})x^{${2}} - ${2}x - a = (x - ${1})((a + ${2})x + a)`}, as expanding confirms. The other root is ${math`x = -\frac{a}{a + ${2}}`}.`,
    t`With one root known, use the product or the sum of the roots.`,
  ],
  reference: '-a/(a + 2)',
  verify: () => {
    for (const a of [0.5, 1, 3, 7]) { const x = -a / (a + 2); if (Math.abs((a + 2) * x * x - 2 * x - a) > 1e-12) return `a = ${a}`; }
    return null;
  },
  misconceptions: [{ response: 'a/(a + 2)', why: t`The product of the roots is ${math`\frac{-a}{a + ${2}}`}; with one root ${1}, the other is ${math`-\frac{a}{a + ${2}}`}.` }],
  official: { source: cite('step-f18-hints', 'Q2(i)'), answer: '-a/(a + 2)', agrees: true },
  nudge: t`Not quite. With one root known, the product of the roots gives the other at once.`,
  hints: [
    t`Why is ${math`x - ${1}`} a factor?`,
    t`What is the product of the roots of ${math`(a + ${2})x^{${2}} - ${2}x - a = ${0}`}?`,
    t`With one root equal to ${1}, what must the other be?`,
  ],
});

const nstA6 = auto({
  id: 'nst-a6-i',
  source: cite('nst-workbook', 'Algebra, A6(i), (ii)'),
  title: t`Divide, then factorise completely`,
  prompt: t`Divide ${math`x^{${3}} + ${5}x^{${2}} - ${2}x - ${24}`} by ${math`x + ${4}`} and hence factorise it completely. Give its three roots.`,
  answer: setAnswer([q(-4), q(-3), q(2)], 'Divide by x + 4, then factorise the quadratic.'),
  solution: [
    t`${math`x^{${3}} + ${5}x^{${2}} - ${2}x - ${24} = (x + ${4})(x^{${2}} + x - ${6})`}: compare the ${math`x^{${2}}`} terms, ${math`${4} + ${1} = ${5}`}, and the constants, ${math`${4} \times (-${6}) = -${24}`}.`,
    t`${math`x^{${2}} + x - ${6} = (x + ${3})(x - ${2})`}, so the roots are ${math`-${4}`}, ${math`-${3}`}, and ${2}.`,
    t`The factor ${math`x + ${4}`} gives the root ${math`-${4}`}: the sign flips.`,
  ],
  reference: '-4, -3, 2',
  verify: () => same('integer roots', integerRoots([1, 5, -2, -24]).join(','), '-4,-3,2'),
  misconceptions: [{ response: '4, 3, -2', why: t`The factor ${math`x + ${4}`} is ${0} at ${math`x = -${4}`}: the root has the opposite sign.` }],
  nudge: t`Not quite. After dividing, factorise the quadratic; each factor ${math`x - r`} gives the root ${math`r`}, sign included.`,
  hints: [
    t`Which quadratic results from dividing by ${math`x + ${4}`}?`,
    t`How does that quadratic factorise?`,
    t`Which value of ${math`x`} makes each factor zero?`,
  ],
});

const step2014 = supervision({
  id: 'a18-q3',
  source: cite('step-f18', 'Q3 (2014 STEP I Q3)'),
  title: t`Two integrals and a cubic`,
  prompt: t`The numbers ${math`a`} and ${math`b`}, where ${math`b > a \ge ${0}`}, are such that ${math`\int_{a}^{b} x^{${2}}\,dx = \left(\int_{a}^{b} x\,dx\right)^{${2}}`}. (i) In the case ${math`a = ${0}`} and ${math`b > ${0}`}, find the value of ${math`b`}. (ii) In the case ${math`a = ${1}`}, show that ${math`b`} satisfies ${math`${3}b^{${3}} - b^{${2}} - ${7}b - ${7} = ${0}`}. Show further, with the help of a sketch, that there is only one real value of ${math`b`} that satisfies this equation and that it lies between ${2} and ${3}. (iii) Show that ${math`${3}p^{${2}} + q^{${2}} = ${3}p^{${2}}q`}, where ${math`p = b + a`} and ${math`q = b - a`}, and express ${math`p^{${2}}`} in terms of ${math`q`}. Deduce that ${math`${1} < b - a \le ${q(4, 3)}`}.`,
  writeUp: 'proof',
  official: cite('step-f18-hints', 'Q3'),
  hints: [
    t`For (i), what are the two integrals when ${math`a = ${0}`}, and which ${math`b > ${0}`} makes them agree?`,
    t`For (ii), after evaluating both integrals with ${math`a = ${1}`}, what do clearing fractions and dividing by ${math`b - ${1}`} give?`,
    t`For (iii), how are ${math`b^{${3}} - a^{${3}}`} and ${math`(b^{${2}} - a^{${2}})^{${2}}`} written using ${math`p`} and ${math`q`}, and why does ${math`p \ge q`} bound ${math`q`}?`,
  ],
});

// ---------------------------------------------------------------- lesson

export const polynomials: TopicContent = {
  topicId: 'alg.polynomials',
  goal: t`Find a root by trial, divide out the factor, and write a cubic as a product of linear factors.`,
  objective: t`Use the factor theorem to find roots and factorise cubics completely.`,
  why: t`Cubics and quartics with a guessable root appear in nearly every STEP paper.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`The idea` },
    { kind: 'hook', text: t`There is a formula for the roots of a cubic, but it is so ugly that nobody uses it in an exam. Yet STEP asks you to solve cubics all the time. The trick: guess one root, and the cubic collapses to a quadratic.` },
    { kind: 'narrative', text: t`Take ${math`f(x) = x^{${3}} - ${2}x^{${2}} - ${5}x + ${6}`}. Try ${math`x = ${3}`}: ${math`${27} - ${18} - ${15} + ${6} = ${0}`}. That single fact tells you ${math`x - ${3}`} divides ${math`f(x)`} exactly, so ${math`f(x) = (x - ${3}) \times`} (a quadratic), and quadratics you can solve. Why does a root give a factor?` },
    { kind: 'section', title: t`The remainder and factor theorems` },
    {
      kind: 'definition',
      name: t`Polynomial`,
      formal: t`A [[polynomial|polynomial]] of degree ${math`n`} is ${math`p(x) = a_{n}x^{n} + a_{n - ${1}}x^{n - ${1}} + \cdots + a_{${1}}x + a_{${0}}`} with ${math`a_{n} \ne ${0}`}. A root of ${math`p`} is a number ${math`\alpha`} with ${math`p(\alpha) = ${0}`}.`,
      plain: t`A sum of whole-number powers of ${math`x`}, each times a constant. ${math`x^{${3}} - ${2}x^{${2}} - ${5}x + ${6}`} has degree ${3}, and ${3} is a root.`,
    },
    { kind: 'theorem', name: t`Remainder theorem`, statement: t`For every polynomial ${math`p`} and every number ${math`c`}, there is a polynomial ${math`q`} with ${math`p(x) = (x - c)q(x) + p(c)`} for all ${math`x`}. So the remainder on dividing ${math`p(x)`} by ${math`x - c`} is ${math`p(c)`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Subtract the value`, text: t`${math`p(x) - p(c) = \sum_{k} a_{k}(x^{k} - c^{k})`}.`, plain: t`The constant terms cancel, and each power of ${math`x`} is paired with the same power of ${math`c`}.` },
        { label: t`Each bracket has the factor`, text: t`${math`x^{k} - c^{k} = (x - c)(x^{k - ${1}} + x^{k - ${2}}c + \cdots + c^{k - ${1}})`} for ${math`k \ge ${1}`}.`, why: { q: t`Why does that identity hold?`, a: t`Multiply out the right side: the terms cancel in pairs (it telescopes), leaving ${math`x^{k} - c^{k}`}. For ${math`k = ${2}`}: ${math`(x - c)(x + c) = x^{${2}} - c^{${2}}`}.` } },
        { label: t`Collect`, text: t`So ${math`p(x) - p(c) = (x - c)q(x)`}, where ${math`q`} is the sum of the second brackets times the ${math`a_{k}`}: a polynomial.` },
      ],
    },
    { kind: 'theorem', name: t`Factor theorem`, statement: t`${math`x - c`} is a factor of the polynomial ${math`p(x)`} if and only if ${math`p(c) = ${0}`}.` },
    { kind: 'p', text: t`The [[factor-theorem|factor theorem]] follows at once from the [[remainder-theorem|remainder theorem]]: if ${math`p(c) = ${0}`}, the remainder theorem gives ${math`p(x) = (x - c)q(x)`}; and conversely if ${math`p(x) = (x - c)q(x)`}, putting ${math`x = c`} gives ${math`p(c) = ${0}`}.` },
    checkFrom(remainder, { c: [1, -2, -5, 6], a: 2 }, t`${math`p(${2}) = ${8} - ${8} - ${10} + ${6} = -${4}`}, so the remainder is ${math`-${4}`}.`),
    { kind: 'section', title: t`Finding a root, then the rest` },
    { kind: 'theorem', name: t`Integer roots divide the constant`, statement: t`If ${math`p(x) = x^{n} + a_{n - ${1}}x^{n - ${1}} + \cdots + a_{${0}}`} has integer coefficients and ${math`\alpha`} is an integer root, then ${math`\alpha`} divides ${math`a_{${0}}`}.` },
    { kind: 'p', text: t`Rearrange ${math`p(\alpha) = ${0}`}: ${math`a_{${0}} = -\alpha(\alpha^{n - ${1}} + a_{n - ${1}}\alpha^{n - ${2}} + \cdots + a_{${1}})`}, and the bracket is an integer. So for ${math`x^{${3}} - ${2}x^{${2}} - ${5}x + ${6}`}, the only integer candidates are the divisors of ${6}: ${math`\pm ${1}, \pm ${2}, \pm ${3}, \pm ${6}`}.` },
    {
      kind: 'steps',
      steps: [
        { label: t`Find a root`, text: t`${math`f(${1}) = ${1} - ${2} - ${5} + ${6} = ${0}`}, so ${math`x - ${1}`} is a factor.` },
        { label: t`Divide it out`, text: t`Write ${math`x^{${3}} - ${2}x^{${2}} - ${5}x + ${6} = (x - ${1})(x^{${2}} + sx + t)`}. Comparing ${math`x^{${2}}`} terms, ${math`s - ${1} = -${2}`}, so ${math`s = -${1}`}; comparing constants, ${math`-t = ${6}`}, so ${math`t = -${6}`}.`, plain: t`Check the ${math`x`} terms: ${math`t - s = -${6} + ${1} = -${5}`}, as it should be.` },
        { label: t`Factorise the quadratic`, text: t`${math`x^{${2}} - x - ${6} = (x - ${3})(x + ${2})`}.` },
        { label: t`Read off the roots`, text: t`${math`f(x) = (x - ${1})(x - ${3})(x + ${2})`}: the roots are ${1}, ${3}, ${math`-${2}`}.` },
      ],
    },
    checkFrom(divideOut, { r: 2, s: -1, u: 4, lead: 1 }, t`Comparing coefficients: ${math`a = ${1}`}, ${math`b = -${3}`}, ${math`c = -${4}`}, and ${math`(x - ${2})(x^{${2}} - ${3}x - ${4})`} multiplies back to the cubic.`),
    { kind: 'pitfall', claim: t`If ${math`f(-${2}) = ${0}`}, then ${math`x - ${2}`} is a factor of ${math`f(x)`}.`, counterexample: t`For ${math`f(x) = x + ${2}`}, ${math`f(-${2}) = ${0}`}, but ${math`x - ${2}`} does not divide ${math`x + ${2}`}. The factor is ${math`x - (-${2}) = x + ${2}`}.` },
    { kind: 'takeaway', text: t`A root ${math`c`} means a factor ${math`x - c`}: guess a root among the divisors of the constant, divide it out, and solve what is left.` },
  ],
  examples: [
    withExaminer(workedCambridge(a4q2ii), t`The substitution shown in full, the division or factorisation written out, and the roots stated as roots, not only as factors.`),
    worked(cubic, { roots: [-1, 2, 5] }, t`Three integer roots`),
    worked(divideOut, { r: -3, s: 1, u: 2, lead: 2 }, t`Dividing out a factor`),
  ],
  generators: [cubic, remainder, divideOut],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['polynomial', 'factor-theorem', 'remainder-theorem'],
  cambridge: withUses([a15, a16iii, a16iv, a18i, nstA6, step2014], {
    'a18-q3': { sections: ['The remainder and factor theorems'], note: t`A cubic from two integrals, and bounds from a sketch`, needs: ['calc.definite-integrals', 'calc.curve-sketching'] },
    'a15-q1-ii': { sections: ['The remainder and factor theorems', 'Finding a root, then the rest'], note: t`Checking a root, then factorising a quartic` },
    'a16-q2-iv': { sections: ['Finding a root, then the rest'], note: t`Solving a cubic, then rescaling its roots by a substitution` },
  }),
  // Assignment 15 Q1(ii) and Assignment 16 Q2(iv). Assignment 18 Q3 needs integrals and a sketch, taught later, so it is practice.
  gate: ['a15-q1-ii', 'a16-q2-iv'],
  recall: [
    { front: t`State the factor theorem.`, back: t`${math`x - c`} is a factor of ${math`p(x)`} if and only if ${math`p(c) = ${0}`}.` },
    { front: t`State the remainder theorem.`, back: t`The remainder on dividing ${math`p(x)`} by ${math`x - c`} is ${math`p(c)`}.` },
    { front: t`Which integers can be roots of a monic integer polynomial?`, back: t`Only divisors of its constant term.` },
  ],
  proofOrder: [{
    title: t`The remainder theorem`,
    steps: [
      t`Write ${math`p(x) - p(c) = \sum_{k} a_{k}(x^{k} - c^{k})`}.`,
      t`Each ${math`x^{k} - c^{k}`} has the factor ${math`x - c`}.`,
      t`So ${math`p(x) - p(c) = (x - c)q(x)`} for a polynomial ${math`q`}.`,
      t`Hence ${math`p(x) = (x - c)q(x) + p(c)`}: the remainder is ${math`p(c)`}.`,
    ],
  }],
};
