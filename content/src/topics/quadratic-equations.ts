/**
 * pre.quadratic-equations (a bridge): solve ax^2 + bx + c = 0 by factorising, completing the
 * square, or the formula, and count the real roots with the discriminant; including
 * quadratics in a function of the unknown. The batch 2 sources assume it: STEP 2
 * Statistics Q5 (2010 S1 Q13) turns a Poisson waiting time into pe^(2λ) - e^λ + 1 = 0, a
 * quadratic in e^λ, whose two roots give Mildred's two phones. The official solution's
 * answers, λ1 + λ2 = -ln p and p(1 - p), are compared in the content checks. Batch 7 adds STEP
 * Foundation Assignment 1 Q2(ii) and Assignment 2 Q2(vi) with their hints; Assignment 1 Q2(iii)
 * and Q3 are set in ineq.linear-quadratic. Batch 9 adds Assignment 1 Q2(i) as a second gate:
 * an equation with two fractions that clearing denominators turns into a quadratic.
 */
import { auto, cite, same, withUses } from '../cambridge';
import { add, div, int, mul, pick, q, str, sub, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { computedMath, computedTex, dmath, frac, math, t } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';
import { far } from '../partv-a';
import { poly } from '../poly';

const S2 = 'step-s2-stats' as const;
const S2S = 'step-s2-stats-solutions' as const;
const distinctFrom = (right: string, xs: readonly string[]): number => new Set(xs.filter((x) => x !== right)).size;
const setKey = (xs: readonly Rational[]): string => xs.map(str).sort().join(',');
const asList = (xs: readonly Rational[]): string => xs.map(str).join(', ');

// ---------------------------------------------------------------- solve by factorising

interface RootP { a: number; m: number; n: number }
const roots = ({ a, m, n }: RootP): Rational[] => [q(m, a), q(n)];
/** (ax - m)(x - n) = ax^2 - (an + m)x + mn. */
const coeffs = ({ a, m, n }: RootP): number[] => [a, -(a * n + m), m * n];
const rootMis = (p: RootP): Rational[][] => [roots(p).map((r) => sub(q(0), r)), [q(p.m), q(p.n)], roots(p).map((r) => div(q(1), r))];

const solveQuadratic = generator<RootP>({
  id: 'solve',
  skill: 'Solve a quadratic by factorising it into two linear factors, each giving a root.',
  params: (rng) => {
    for (;;) {
      const a = pick(rng, [1, 1, 2, 3]);
      const p: RootP = { a, m: pick(rng, [-7, -5, -4, -3, -2, 2, 3, 4, 5, 7]), n: pick(rng, [-6, -5, -4, -3, -2, 2, 3, 4, 5, 6]) };
      const right = setKey(roots(p));
      const wrong = rootMis(p).map(setKey);
      if (str(q(p.m, p.a)) !== str(q(p.n)) && distinctFrom(right, wrong) >= 2) return p;
    }
  },
  sane: ({ a, m, n }) => (a >= 1 && m !== 0 && n !== 0 ? null : 'out of range'),
  problem: (p) => {
    const [r1, r2] = roots(p) as [Rational, Rational];
    const expected = roots(p);
    return {
      prompt: t`Solve ${computedMath(`${poly(coeffs(p))} = ${0}`)}. Give both roots.`,
      answer: {
        kind: 'witness', count: 2, unordered: true, example: asList(expected),
        check: (vals) => (setKey(vals) === setKey(expected) ? null : 'Those are not both roots: substitute each value to check.'),
      },
      solution: [
        t`Factorise: ${computedMath(`${poly(coeffs(p))} = (${poly([p.a, -p.m])})(${poly([1, -p.n])})`)}.`,
        t`A product is ${0} only when a factor is ${0}: ${computedMath(`${poly([p.a, -p.m])} = ${0}`)} gives ${math`x = ${r1}`}, and ${computedMath(`${poly([1, -p.n])} = ${0}`)} gives ${math`x = ${r2}`}.`,
      ],
    };
  },
  solve: (p) => {
    // The quadratic formula, with an exact square root of the discriminant found by search.
    const [a, b, c] = coeffs(p) as [number, number, number];
    const d = b * b - 4 * a * c;
    let s = 0;
    while (s * s < d) s++;
    return asList([q(-b + s, 2 * a), q(-b - s, 2 * a)]);
  },
  misconceptions: (p): Misconception[] => {
    const [neg, noA, recip] = rootMis(p);
    return [
      { response: asList(neg as Rational[]), why: t`The signs are flipped. The factor ${math`x - n`} is ${0} when ${math`x = n`}, not ${math`-n`}.` },
      { response: asList(noA as Rational[]), why: t`The factor ${computedMath(poly([p.a, -p.m]))} is ${0} when ${math`x = ${q(p.m, p.a)}`}: divide by the coefficient of ${math`x`}.` },
      { response: asList(recip as Rational[]), why: t`Those are the reciprocals of the roots, the roots of the quadratic with ${math`a`} and ${math`c`} swapped.` },
    ];
  },
});

// ---------------------------------------------------------------- a repeated root

interface RepP { b: number; c: number }
const kVal = ({ b, c }: RepP): Rational => q(b * b, 4 * c);
const kMis = ({ b, c }: RepP): string[] => [str(q(b * b, 2 * c)), str(q(4 * c, b * b)), str(q(-b * b, 4 * c))];

const repeatedRoot = generator<RepP>({
  id: 'repeated-root',
  skill: 'Find the coefficient that makes the discriminant b^2 - 4ac zero, so the quadratic has a repeated root.',
  params: (rng) => {
    for (;;) {
      const p: RepP = { b: pick(rng, [-12, -10, -9, -8, -6, -5, -4, -3, 3, 4, 5, 6, 8, 9, 10, 12]), c: int(rng, 1, 9) };
      if (distinctFrom(str(kVal(p)), kMis(p)) >= 2) return p;
    }
  },
  sane: ({ c }) => (c >= 1 ? null : 'out of range'),
  problem: ({ b, c }) => ({
    prompt: t`For which value of ${math`k`} does ${math`kx^{${2}} ${b < 0 ? '-' : '+'} ${Math.abs(b)}x + ${c} = ${0}`} have a repeated root?`,
    answer: { kind: 'exact', expected: str(kVal({ b, c })) },
    solution: [
      t`A repeated root means the discriminant is ${0}: ${math`b^{${2}} - ${4}ac = ${b * b} - ${4} \times k \times ${c} = ${0}`}.`,
      t`So ${math`k = ${q(b * b, 4 * c).den === BigInt(4 * c) ? kVal({ b, c }) : frac(b * b, 4 * c)}`}${q(b * b, 4 * c).den === BigInt(4 * c) ? t`` : t`, that is ${kVal({ b, c })}`}. Then the root is ${math`x = -\frac{b}{${2}a} = ${div(q(-b), mul(q(2), kVal({ b, c })))}`}.`,
    ],
  }),
  solve: ({ b, c }) => {
    // Search k = j/(4c) for the one where the discriminant vanishes, checking exactly.
    for (let j = 1; j <= 1000; j++) { const k = q(j, 4 * c); if (str(sub(q(b * b), mul(q(4 * c), k))) === '0') return str(k); }
    return 'none';
  },
  misconceptions: (p): Misconception[] => {
    const [a, b, c] = kMis(p);
    return [
      { response: a as string, why: t`The discriminant is ${math`b^{${2}} - ${4}ac`}, with a ${4}, not a ${2}.` },
      { response: b as string, why: t`Upside down: solve ${math`b^{${2}} = ${4}kc`} for ${math`k`}, giving ${math`k = \frac{b^{${2}}}{${4}c}`}.` },
      { response: c as string, why: t`${math`b^{${2}}`} is positive whatever the sign of ${math`b`}, so ${math`k`} is positive here.` },
    ];
  },
});

// ---------------------------------------------------------------- a quadratic in B^x

interface HidP { base: number; m: number; n: number; neg: boolean }
const yVals = ({ base, m, n, neg }: HidP): [number, number] => [base ** m, neg ? -(base ** n) : base ** n];
const hidVal = (p: HidP): number => (p.neg ? p.m : p.m + p.n);
const hidMis = (p: HidP): string[] => {
  const [y1, y2] = yVals(p);
  return [String(y1 + y2), String(p.neg ? p.m + p.n : p.m * p.n), String(y1 * y2)];
};
/** A signed middle term such as "- 6 × 2^x", built from a computed coefficient; empty for 0. */
const coefTerm = (c: number, body: string): string => (c === 0 ? '' : `${c < 0 ? '-' : '+'} ${Math.abs(c) === 1 ? '' : `${Math.abs(c)} \\times `}${body}`);

const hiddenQuadratic = generator<HidP>({
  id: 'hidden-quadratic',
  skill: 'Solve a quadratic in a function of the unknown: put y = B^x, solve for y, and keep only the roots B^x can take.',
  params: (rng) => {
    for (;;) {
      const p: HidP = { base: pick(rng, [2, 3]), m: int(rng, 0, 4), n: int(rng, 0, 4), neg: rng() < 0.4 };
      if (!p.neg && p.m === p.n) continue;
      if (p.base === 3 && Math.max(p.m, p.n) > 3) continue;
      if (distinctFrom(String(hidVal(p)), hidMis(p)) >= 2) return p;
    }
  },
  sane: ({ m, n }) => (m >= 0 && n >= 0 ? null : 'out of range'),
  problem: (p) => {
    const [y1, y2] = yVals(p);
    const s = y1 + y2;
    const prod = y1 * y2;
    const B = p.base;
    const last = prod < 0 ? `- ${-prod}` : `+ ${prod}`;
    const eq = computedTex([`${B}^{${2}x}`, coefTerm(-s, `${B}^{x}`), last, `= ${0}`].filter((x) => x !== '').join(' '));
    const lin = (r: number): string => (r < 0 ? `y + ${-r}` : `y - ${r}`);
    const fac = computedTex(`(${lin(y1)})(${lin(y2)}) = ${0}`);
    return {
      prompt: t`Find the sum of all the real solutions ${math`x`} of ${eq}.`,
      answer: { kind: 'exact', expected: String(hidVal(p)) },
      solution: [
        t`Since ${math`${B}^{${2}x} = (${B}^{x})^{${2}}`}, put ${math`y = ${B}^{x}`}: the equation becomes ${computedMath(`${poly([1, -s, prod], 'y')} = ${0}`)}, that is ${fac}, so ${math`y = ${y1}`} or ${math`y = ${y2}`}.`,
        p.neg
          ? t`${math`${B}^{x}`} is always positive, so ${math`y = ${y2}`} gives no solution. ${math`${B}^{x} = ${y1}`} gives ${math`x = ${p.m}`}, the only solution.`
          : t`${math`${B}^{x} = ${y1}`} gives ${math`x = ${p.m}`}, and ${math`${B}^{x} = ${y2}`} gives ${math`x = ${p.n}`}. Their sum is ${p.m + p.n}.`,
      ],
    };
  },
  solve: (p) => {
    // Try every integer x in a range: B^(2x) - s B^x + P = 0 exactly.
    const [y1, y2] = yVals(p);
    let sum = 0;
    for (let x = -6; x <= 10; x++) { const u = p.base ** x; if (u * u - (y1 + y2) * u + y1 * y2 === 0) sum += x; }
    return String(sum);
  },
  misconceptions: (p): Misconception[] => {
    const [a, b, c] = hidMis(p);
    return [
      { response: a as string, why: t`That is the sum of the values of ${math`y = ${p.base}^{x}`}, not of ${math`x`}. Turn each ${math`y`} back into ${math`x`}.` },
      { response: b as string, why: p.neg ? t`${math`${p.base}^{x}`} is never negative, so the negative root for ${math`y`} gives no ${math`x`} at all.` : t`Add the solutions, do not multiply them.` },
      { response: c as string, why: t`That is the product of the values of ${math`y`}. The question asks for the solutions ${math`x`}.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

const P_DOM = { p: { kind: 'real' as const, min: 0.01, max: 0.24 } };
/** The two rates for a waiting probability p, from the formula for e^λ. */
const rates = (p: number): [number, number] => [Math.log((1 + Math.sqrt(1 - 4 * p)) / (2 * p)), Math.log((1 - Math.sqrt(1 - 4 * p)) / (2 * p))];
const waits = (lam: number): number => Math.exp(-lam) * (1 - Math.exp(-lam));

const mildredSum = auto({
  id: 's2-q5-sum-of-rates',
  source: cite(S2, 'Q5'),
  title: t`Mildred's two phones`,
  prompt: t`Texts arrive on a phone as a Poisson process with rate ${math`\lambda`} per hour. The probability ${math`p`} of waiting between ${1} and ${2} hours for the first text satisfies ${math`pe^{${2}\lambda} - e^{\lambda} + ${1} = ${0}`}. Mildred has two phones with different rates ${math`\lambda_{${1}}`} and ${math`\lambda_{${2}}`}, and for each phone this probability is the same ${math`p`}, with ${math`${4}p < ${1}`}. Find ${math`\lambda_{${1}} + \lambda_{${2}}`} in terms of ${math`p`}.`,
  answer: { kind: 'expression', expected: '-ln(p)', variables: ['p'], domains: P_DOM },
  solution: [
    t`Put ${math`y = e^{\lambda}`}: ${math`py^{${2}} - y + ${1} = ${0}`}, with roots ${math`y = \frac{${1} \pm \sqrt{${1} - ${4}p}}{${2}p}`}. The rates are different, so ${math`e^{\lambda_{${1}}}`} and ${math`e^{\lambda_{${2}}}`} are the two roots.`,
    t`The product of the roots of ${math`ay^{${2}} + by + c = ${0}`} is ${math`\frac{c}{a}`}, here ${math`\frac{${1}}{p}`}. So ${math`e^{\lambda_{${1}} + \lambda_{${2}}} = e^{\lambda_{${1}}} e^{\lambda_{${2}}} = \frac{${1}}{p}`}, and ${math`\lambda_{${1}} + \lambda_{${2}} = \ln \frac{${1}}{p} = -\ln p`}.`,
  ],
  reference: 'ln(1/p)',
  verify: () => {
    for (const p of [0.05, 0.1, 0.2, 2 / 9, 0.24]) {
      const [l1, l2] = rates(p);
      if (l1 <= 0 || l2 <= 0) return `p = ${p}: a rate is not positive`;
      if (far(waits(l1), p) || far(waits(l2), p)) return `p = ${p}: a rate does not give the waiting probability`;
      if (far(l1 + l2, -Math.log(p))) return `p = ${p}: the rates add to ${l1 + l2}`;
    }
    return null;
  },
  misconceptions: [{ response: 'ln(p)', why: t`The product of the roots is ${math`\frac{${1}}{p}`}, more than ${1}, so the sum of the rates is positive: ${math`\ln \frac{${1}}{p}`}.` }],
  official: { source: cite(S2S, 'Q5'), answer: '-ln(p)', agrees: true },
});

const P29 = q(2, 9);
const ROOTS29 = [q(3), q(3, 2)];
const twoRates = auto({
  id: 's2-q5-two-values',
  source: cite(S2, 'Q5', true),
  title: t`Two rates for the same waiting chance`,
  prompt: t`With ${math`p = ${P29}`}, the equation ${math`pe^{${2}\lambda} - e^{\lambda} + ${1} = ${0}`} becomes a quadratic in ${math`y = e^{\lambda}`}. Find both values of ${math`e^{\lambda}`}.`,
  answer: {
    kind: 'witness', count: 2, unordered: true, example: asList(ROOTS29),
    check: (vals) => (setKey(vals) === setKey(ROOTS29) ? null : 'Substitute each value into the quadratic to check it.'),
  },
  solution: [
    t`${math`${P29}y^{${2}} - y + ${1} = ${0}`}; multiply by ${9}: ${math`${2}y^{${2}} - ${9}y + ${9} = (${2}y - ${3})(y - ${3}) = ${0}`}.`,
    t`So ${math`e^{\lambda} = ${3}`} or ${math`${q(3, 2)}`}. Both exceed ${1}, so both rates, ${math`\ln ${3}`} and ${math`\ln \frac{${3}}{${2}}`}, are positive, as ${math`${4}p = ${mul(q(4), P29)} < ${1}`} promises.`,
    t`Substitute to see the quadratic, clear fractions, then factorise.`,
  ],
  reference: '3, 3/2',
  verify: () => {
    for (const y of ROOTS29) {
      const e = same(`y = ${str(y)} in py^2 - y + 1`, str(add(sub(mul(P29, mul(y, y)), y), q(1))), '0');
      if (e !== null) return e;
    }
    return same('the product of the roots', str(mul(ROOTS29[0] as Rational, ROOTS29[1] as Rational)), str(div(q(1), P29)));
  },
  misconceptions: [{ response: '-3, -3/2', why: t`The signs are flipped: ${math`y - ${3} = ${0}`} gives ${math`y = ${3}`}.` }],
  nudge: t`Not quite. Clear the fraction first, then factorise the quadratic in ${math`y`}.`,
  hints: [
    t`With ${math`p = ${P29}`}, which quadratic in ${math`y = e^{\lambda}`} results?`,
    t`After multiplying through to clear the fraction, how does it factorise?`,
    t`Which values of ${math`y`} make each factor zero?`,
  ],
});

// ---------------------------------------------------------------- Cambridge problems: STEP Foundation (batch 7)

/** 9x^2 + bx + 4 has a repeated root exactly when b^2 = 4 x 9 x 4. */
const REPEAT_B = [q(-12), q(12)];
const a1q2ii = auto({
  id: 'a1-q2-ii',
  source: cite('step-f01', 'Q2(ii)'),
  title: t`A repeated root`,
  prompt: t`Find the value(s) of ${math`b`} for which the following equation has a single (repeated) root: ${math`${9}x^{${2}} + bx + ${4} = ${0}`}. Give every value, separated by commas.`,
  answer: {
    kind: 'witness', count: { min: 1, max: 3 }, unordered: true, example: asList(REPEAT_B),
    check: (vals) => {
      if (setKey(vals) === setKey(REPEAT_B)) return null;
      if (vals.length === 1 && REPEAT_B.some((b) => setKey([b]) === setKey(vals))) return 'That value works, but there is another.';
      return 'A repeated root needs the discriminant to be zero: solve that for b.';
    },
  },
  solution: [
    t`A repeated root means the discriminant is zero: ${math`b^{${2}} - ${4} \times ${9} \times ${4} = ${0}`}, so ${math`b^{${2}} = ${144}`}.`,
    t`So ${math`b = ${12}`} or ${math`b = ${-12}`}: both values, since ${math`(${-12})^{${2}} = ${144}`} too.`,
    t`A repeated root needs a zero discriminant; keep both signs of the square root.`,
  ],
  reference: asList(REPEAT_B),
  verify: () => {
    for (const b of REPEAT_B) {
      const e = same(`the discriminant at b = ${str(b)}`, str(sub(mul(b, b), q(4 * 9 * 4))), '0');
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [{ response: '12', why: t`${math`b^{${2}} = ${144}`} has two solutions. The negative one, ${math`b = ${-12}`}, also gives a repeated root.` }],
  official: { source: cite('step-f01-hints', 'Q2(ii)'), answer: '12, -12', agrees: true },
  nudge: t`Not quite. A repeated root means a zero discriminant, and an equation ${math`b^{${2}} = c`} with ${math`c > ${0}`} has two solutions.`,
  hints: [
    t`Which condition on the discriminant gives a repeated root?`,
    t`What is the discriminant of ${math`${9}x^{${2}} + bx + ${4}`}?`,
    t`How many values of ${math`b`} make it zero?`,
  ],
});

// STEP Support Assignment 1, Q2(i): 2/(x + 3) + 1/(x + 1) = 1.
const FRAC_ROOTS = [q(1), q(-2)];
/** The left side of the equation at x, exactly; null where a denominator is zero. */
const fracLeft = (x: Rational): Rational | null => {
  const d1 = add(x, q(3));
  const d2 = add(x, q(1));
  if (d1.num === 0n || d2.num === 0n) return null;
  return add(div(q(2), d1), div(q(1), d2));
};
const a1q2i = auto({
  id: 'a1-q2-i',
  source: cite('step-f01', 'Q2(i)'),
  title: t`Two fractions that make a quadratic`,
  prompt: t`Solve the equation ${dmath`\frac{${2}}{x + ${3}} + \frac{${1}}{x + ${1}} = ${1}.`} Give every solution, separated by commas.`,
  answer: {
    kind: 'witness', count: { min: 1, max: 3 }, unordered: true, example: asList(FRAC_ROOTS),
    check: (vals) => {
      if (vals.some((v) => fracLeft(v) === null)) return 'That value makes a denominator zero, so it cannot be a solution.';
      if (setKey(vals) === setKey(FRAC_ROOTS)) return null;
      if (vals.length === 1 && FRAC_ROOTS.some((r) => setKey([r]) === setKey(vals))) return 'That value works, but there is another.';
      return 'Multiply both sides by (x + 3)(x + 1), collect everything on one side, and solve the quadratic.';
    },
  },
  solution: [
    t`The fractions need ${math`x \ne -${3}`} and ${math`x \ne -${1}`}. For any other ${math`x`}, multiplying both sides by ${math`(x + ${3})(x + ${1})`}, which is not zero, gives an equation with the same solutions: ${math`${2}(x + ${1}) + (x + ${3}) = (x + ${3})(x + ${1})`}.`,
    t`Expand: ${math`${3}x + ${5} = x^{${2}} + ${4}x + ${3}`}, so ${math`x^{${2}} + x - ${2} = ${0}`}, which factorises as ${math`(x + ${2})(x - ${1}) = ${0}`}.`,
    t`So ${math`x = ${1}`} or ${math`x = -${2}`}. Neither is ${math`-${3}`} or ${math`-${1}`}, and both check in the original equation: ${math`\frac{${2}}{${4}} + \frac{${1}}{${2}} = ${1}`} and ${math`\frac{${2}}{${1}} + \frac{${1}}{-${1}} = ${1}`}.`,
    t`Clear the denominators, solve, then check each root against the excluded values.`,
  ],
  reference: asList(FRAC_ROOTS),
  verify: () => {
    for (const r of FRAC_ROOTS) {
      const left = fracLeft(r);
      const e = same(`the left side at x = ${str(r)}`, left === null ? 'undefined' : str(left), '1');
      if (e !== null) return e;
    }
    // And no other root: x^2 + x - 2 has exactly these two roots, by the product of the roots.
    return same('the product of the roots', str(mul(FRAC_ROOTS[0] as Rational, FRAC_ROOTS[1] as Rational)), '-2');
  },
  misconceptions: [
    { response: '1', why: t`${math`x = ${1}`} works, and so does ${math`x = -${2}`}: the quadratic ${math`x^{${2}} + x - ${2} = ${0}`} has two roots, and neither makes a denominator zero.` },
    { response: '-1, 2', why: t`Check the signs: ${math`x^{${2}} + x - ${2} = (x + ${2})(x - ${1})`}, which is zero at ${math`x = -${2}`} and ${math`x = ${1}`}.` },
  ],
  official: { source: cite('step-f01-hints', 'Q2(i)'), answer: '1, -2', agrees: true },
  nudge: t`Not quite. Multiply through by both denominators, collect into a quadratic, and keep every root that does not make a denominator zero.`,
  hints: [
    t`Which values of ${math`x`} are excluded, and what do both sides become after multiplying by ${math`(x + ${3})(x + ${1})`}?`,
    t`Which quadratic results after expanding and collecting terms?`,
    t`What are its roots, and does either make a denominator zero?`,
  ],
});

const R2 = Math.sqrt(2);
const close = (a: number, b: number): boolean => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));
const F01 = 'step-f01' as const;
const F01H = 'step-f01-hints' as const;
// Rule 1 (2026-10-08): set here from alg.surds, the earliest topic that teaches everything it needs.
const hidden = auto({
  id: 'a1-q1-iv',
  source: cite(F01, 'Q1(iv)'),
  title: t`A hidden quadratic with surd roots`,
  prompt: t`Expand ${math`(${1} + \sqrt{${2}})^{${2}}`}. Then find the largest real ${math`x`} with ${math`x^{${2}} + \frac{${4}}{x^{${2}}} = ${12}`}, as a surd. (Type a square root as sqrt.)`,
  nudge: t`Not quite. Clear the fraction to get a quadratic in ${math`x^{${2}}`}, then compare its roots with the expansion.`,
  hints: [
    t`What is ${math`(${1} + \sqrt{${2}})^{${2}}`}?`,
    t`Multiplying by ${math`x^{${2}}`}, what quadratic in ${math`x^{${2}}`} results, and what are its roots?`,
    t`Which of those roots is twice the expansion, and what is its positive square root?`,
  ],
  answer: { kind: 'expression', expected: '2 + sqrt(2)', variables: [] },
  solution: [
    t`${math`(${1} + \sqrt{${2}})^{${2}} = ${1} + ${2}\sqrt{${2}} + ${2} = ${3} + ${2}\sqrt{${2}}`}.`,
    t`Multiply by ${math`x^{${2}}`} (not ${0}): ${math`x^{${4}} - ${12}x^{${2}} + ${4} = ${0}`}, a quadratic in ${math`x^{${2}}`}, so ${math`x^{${2}} = \frac{${12} \pm \sqrt{${144} - ${16}}}{${2}} = ${6} \pm ${4}\sqrt{${2}}`}.`,
    t`${math`${6} + ${4}\sqrt{${2}} = ${2}(${3} + ${2}\sqrt{${2}}) = ${2}(${1} + \sqrt{${2}})^{${2}}`}, so its square roots are ${math`\pm\sqrt{${2}}(${1} + \sqrt{${2}}) = \pm(${2} + \sqrt{${2}})`}. In the same way ${math`${6} - ${4}\sqrt{${2}}`} gives ${math`\pm(${2} - \sqrt{${2}})`}.`,
    t`The four solutions are ${math`\pm(${2} + \sqrt{${2}})`} and ${math`\pm(${2} - \sqrt{${2}})`}; the largest is ${math`${2} + \sqrt{${2}}`}.`,
    t`Treat an equation in even powers only as a quadratic in the square.`,
  ],
  reference: '2 + sqrt(2)',
  verify: () => {
    const roots = [2 + R2, 2 - R2, -2 + R2, -2 - R2];
    const bad = roots.find((r) => !close(r * r + 4 / (r * r), 12));
    if (bad !== undefined) return `${bad} is not a solution`;
    return same('the largest root', Math.max(...roots) === 2 + R2, true);
  },
  misconceptions: [{ response: '2 - sqrt(2)', why: t`That is a solution, but not the largest: ${math`${2} + \sqrt{${2}}`} is bigger, and it solves the equation too.` }],
  official: { source: cite(F01H, 'Q1(iv)'), answer: '2 + sqrt(2)', agrees: true },
});

// ---------------------------------------------------------------- lesson

const EXP = { a: 2, b: -7, c: 3 };
const mx = math`x`;
const HID = { y1: 4, y2: -1 };

export const quadraticEquations: TopicContent = {
  topicId: 'pre.quadratic-equations',
  goal: t`Solve ${math`ax^{${2}} + bx + c = ${0}`} by factorising, completing the square, or the formula, tell from the discriminant how many real roots there are, and spot a quadratic in a function of the unknown.`,
  objective: t`Solve any quadratic, count its real roots from the discriminant, and spot one in disguise.`,
  why: t`Quadratics turn up inside probability and statistics problems, as in a STEP question on Poisson waiting times.`,
  minutes: 30,
  lesson: [
    { kind: 'section', title: t`Have you found them all?` },
    { kind: 'hook', text: t`Find every ${mx} with ${computedMath(`${poly([EXP.a, EXP.b, EXP.c])} = ${0}`)}. Trying small numbers, ${math`x = ${3}`} works: ${math`${2} \times ${9} - ${21} + ${3} = ${0}`}. Is that the only one? Guessing can find a root, but it can never tell you that you have found them all.` },
    { kind: 'narrative', text: t`What we want is a method that produces every root and proves there are no others. There are three, and they are really one idea seen three ways.` },
    {
      kind: 'definition',
      name: t`Quadratic equation`,
      formal: t`A quadratic equation is ${math`ax^{${2}} + bx + c = ${0}`}, where ${math`a, b, c`} are real numbers and ${math`a \ne ${0}`}. A real number ${math`r`} is a root if ${math`ar^{${2}} + br + c = ${0}`}.`,
      plain: t`In plain words: an equation whose highest power of ${mx} is the square. A root is a value of ${mx} that makes it true. Above, ${math`a = ${EXP.a}`}, ${math`b = ${EXP.b}`}, ${math`c = ${EXP.c}`}, and ${3} is a root.`,
    },
    { kind: 'section', title: t`Factorising` },
    { kind: 'narrative', text: t`The key fact is about products. If two numbers multiply to ${0}, one of them must be ${0}. So if the quadratic splits into two factors, each factor hands you a root, and nothing else can be a root.` },
    { kind: 'theorem', name: t`Zero product`, statement: t`For real numbers ${math`u`} and ${math`v`}, if ${math`uv = ${0}`} then ${math`u = ${0}`} or ${math`v = ${0}`}.` },
    {
      kind: 'p',
      text: t`Then ${computedMath(`${poly([EXP.a, EXP.b, EXP.c])} = (${poly([2, -1])})(${poly([1, -3])})`)}, so the roots are exactly ${math`x = ${q(1, 2)}`} (from the first factor) and ${math`x = ${3}`} (from the second). The guess found one of two.`,
      why: { q: t`Why is the zero product fact true?`, a: t`Suppose ${math`uv = ${0}`} and ${math`u \ne ${0}`}. Divide both sides by ${math`u`}: ${math`v = \frac{${0}}{u} = ${0}`}. So if ${math`u`} is not ${0}, then ${math`v`} is.` },
    },
    { kind: 'section', title: t`The formula, derived` },
    { kind: 'narrative', text: t`Not every quadratic factorises with whole numbers. Completing the square always works: it rewrites the quadratic as a perfect square plus a constant, so solving needs only a square root.` },
    {
      kind: 'definition',
      name: t`Discriminant`,
      formal: t`The [[discriminant|discriminant]] of ${math`ax^{${2}} + bx + c`} is ${math`\Delta = b^{${2}} - ${4}ac`}.`,
      plain: t`In plain words: one number built from the coefficients that decides how many real roots there are. For ${computedMath(poly([EXP.a, EXP.b, EXP.c]))}, ${math`\Delta = (${EXP.b})^{${2}} - ${4} \times ${EXP.a} \times ${EXP.c} = ${EXP.b * EXP.b - 4 * EXP.a * EXP.c}`}.`,
    },
    {
      kind: 'theorem',
      name: t`Quadratic formula`,
      statement: t`Let ${math`a \ne ${0}`} and ${math`\Delta = b^{${2}} - ${4}ac`}. If ${math`\Delta > ${0}`}, ${math`ax^{${2}} + bx + c = ${0}`} has exactly two real roots, ${math`x = \frac{-b \pm \sqrt{\Delta}}{${2}a}`}. If ${math`\Delta = ${0}`}, it has exactly one, ${math`x = -\frac{b}{${2}a}`} (a repeated root). If ${math`\Delta < ${0}`}, it has none.`,
    },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Divide by a`, text: t`Since ${math`a \ne ${0}`}, the equation is equivalent to`, eq: [dmath`x^{${2}} + \frac{b}{a}x + \frac{c}{a} = ${0}.`] },
        { label: t`Complete the square`, text: t`${math`\left(x + \frac{b}{${2}a}\right)^{${2}} = x^{${2}} + \frac{b}{a}x + \frac{b^{${2}}}{${4}a^{${2}}}`}, so the equation is`, eq: [dmath`\left(x + \frac{b}{${2}a}\right)^{${2}} - \frac{b^{${2}}}{${4}a^{${2}}} + \frac{c}{a} = ${0}.`], why: { q: t`Why add half the coefficient of ${mx}?`, a: t`Expanding ${math`(x + h)^{${2}}`} gives ${math`x^{${2}} + ${2}hx + h^{${2}}`}. To match ${math`\frac{b}{a}x`} we need ${math`${2}h = \frac{b}{a}`}, so ${math`h = \frac{b}{${2}a}`}; the extra ${math`h^{${2}}`} is then taken away again.` } },
        { label: t`Isolate the square`, text: t`Move the constants right and put them over ${math`${4}a^{${2}}`}: ${math`-\frac{c}{a} = -\frac{${4}ac}{${4}a^{${2}}}`}, so`, eq: [dmath`\left(x + \frac{b}{${2}a}\right)^{${2}} = \frac{b^{${2}} - ${4}ac}{${4}a^{${2}}} = \frac{\Delta}{${4}a^{${2}}}.`] },
        { label: t`If the discriminant is negative`, text: t`The right side is negative, since ${math`${4}a^{${2}} > ${0}`}. A real square is never negative, so there is no real root.` },
        { label: t`If it is zero`, text: t`The square is ${0}, so ${math`x + \frac{b}{${2}a} = ${0}`}: the single root ${math`x = -\frac{b}{${2}a}`}.` },
        { label: t`If it is positive`, text: t`A number whose square is ${math`\frac{\Delta}{${4}a^{${2}}}`} is ${math`\pm\frac{\sqrt{\Delta}}{${2}a}`}, and there are exactly two such numbers, so`, eq: [dmath`x = -\frac{b}{${2}a} \pm \frac{\sqrt{\Delta}}{${2}a} = \frac{-b \pm \sqrt{\Delta}}{${2}a}.`], why: { q: t`Does the sign of ${math`a`} matter when taking the root?`, a: t`The square root of ${math`${4}a^{${2}}`} is ${math`${2}\lvert a \rvert`}, which is ${math`${2}a`} or ${math`-${2}a`}. Because we take both signs with ${math`\pm`}, the two roots come out the same either way.` } },
      ],
    },
    { kind: 'p', text: t`The result is the [[quadratic-formula|quadratic formula]]. For the hook, ${math`\Delta = ${EXP.b * EXP.b - 4 * EXP.a * EXP.c}`}, so ${math`x = \frac{${7} \pm ${5}}{${4}}`}, which is ${3} or ${q(1, 2)}, as factorising found.` },
    checkFrom(repeatedRoot, { b: 6, c: 3 }, t`A repeated root needs ${math`\Delta = ${0}`}: ${math`${36} - ${12}k = ${0}`}, so ${math`k = ${3}`}.`),
    { kind: 'section', title: t`Sum and product of the roots` },
    { kind: 'narrative', text: t`Sometimes you need only how the roots combine, not the roots themselves. The STEP question below needs exactly that.` },
    { kind: 'theorem', statement: t`If ${math`\Delta \ge ${0}`} and ${math`x_{${1}}, x_{${2}}`} are the roots of ${math`ax^{${2}} + bx + c = ${0}`} (equal when ${math`\Delta = ${0}`}), then ${math`x_{${1}} + x_{${2}} = -\frac{b}{a}`} and ${math`x_{${1}} x_{${2}} = \frac{c}{a}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Factorise by the roots`, text: t`By the formula, both roots exist, and ${math`ax^{${2}} + bx + c = a(x - x_{${1}})(x - x_{${2}})`}.`, why: { q: t`Why does that factorisation hold?`, a: t`Completing the square gave ${math`a\left[\left(x + \frac{b}{${2}a}\right)^{${2}} - \frac{\Delta}{${4}a^{${2}}}\right]`}. That is ${math`a`} times a difference of two squares, ${math`a(x - x_{${1}})(x - x_{${2}})`}.` } },
        { label: t`Expand`, text: t`${math`a(x - x_{${1}})(x - x_{${2}}) = ax^{${2}} - a(x_{${1}} + x_{${2}})x + ax_{${1}}x_{${2}}`}.` },
        { label: t`Compare coefficients`, text: t`Matching the ${mx} term and the constant with ${math`bx`} and ${math`c`}: ${math`-a(x_{${1}} + x_{${2}}) = b`} and ${math`ax_{${1}}x_{${2}} = c`}. Divide by ${math`a`}.` },
      ],
    },
    { kind: 'p', text: t`Check with the hook: ${math`${3} + ${q(1, 2)} = ${q(7, 2)} = -\frac{b}{a}`} and ${math`${3} \times ${q(1, 2)} = ${q(3, 2)} = \frac{c}{a}`}.` },
    { kind: 'section', title: t`Quadratics in disguise` },
    { kind: 'narrative', text: t`A quadratic can hide inside another function. ${math`${4}^{x} - ${3} \times ${2}^{x} - ${4} = ${0}`} has no ${math`x^{${2}}`} in sight. But ${math`${4}^{x} = (${2}^{x})^{${2}}`}, so with ${math`y = ${2}^{x}`} it reads ${math`y^{${2}} - ${3}y - ${4} = ${0}`}, that is ${math`(y - ${HID.y1})(y + ${-HID.y2}) = ${0}`}.` },
    { kind: 'p', text: t`So ${math`y = ${HID.y1}`} or ${math`y = ${HID.y2}`}. Now translate back: ${math`${2}^{x} = ${HID.y1}`} gives ${math`x = ${2}`}. But ${math`${2}^{x}`} is positive for every real ${mx}, so ${math`${2}^{x} = ${HID.y2}`} has no solution. One root of the quadratic in ${math`y`} gives no ${mx} at all.` },
    { kind: 'p', text: t`STEP ${2} Statistics question ${5} reaches ${math`pe^{${2}\lambda} - e^{\lambda} + ${1} = ${0}`}, a quadratic in ${math`y = e^{\lambda}`}: ${math`py^{${2}} - y + ${1} = ${0}`}. Real roots need ${math`\Delta = ${1} - ${4}p \ge ${0}`}; a positive ${math`\lambda`} needs ${math`y > ${1}`}; and the product of the roots, ${math`\frac{${1}}{p}`}, gives the sum of the two rates.` },
    checkFrom(hiddenQuadratic, { base: 3, m: 1, n: 0, neg: true }, t`With ${math`y = ${3}^{x}`}: ${math`(y - ${3})(y + ${1}) = ${0}`}. ${math`${3}^{x} = ${3}`} gives ${math`x = ${1}`}; ${math`${3}^{x} = -${1}`} is impossible.`),
    { kind: 'pitfall', claim: t`${math`x^{${2}} = ${3}x`}, so dividing by ${mx}, ${math`x = ${3}`} is the solution.`, counterexample: t`Dividing by ${mx} assumes ${math`x \ne ${0}`}, and ${math`x = ${0}`} is also a root. Factorise instead: ${math`x(x - ${3}) = ${0}`}, so ${math`x = ${0}`} or ${math`x = ${3}`}.` },
    { kind: 'pitfall', claim: t`Every root of the quadratic in ${math`y = ${2}^{x}`} gives a solution ${mx}.`, counterexample: t`${math`y = ${HID.y2}`} solves ${math`y^{${2}} - ${3}y - ${4} = ${0}`}, but no real ${mx} has ${math`${2}^{x} = ${HID.y2}`}.` },
    { kind: 'takeaway', text: t`Complete the square to get every root at once; the discriminant counts them, and a substitution can reveal a quadratic in disguise.` },
  ],
  examples: [
    workedCambridge(mildredSum),
    worked(solveQuadratic, { a: 2, m: 3, n: -4 }, t`A quadratic with a fractional root`),
    worked(hiddenQuadratic, { base: 2, m: 1, n: 3, neg: false }, t`A quadratic in ${math`${2}^{x}`}`),
  ],
  generators: [solveQuadratic, repeatedRoot, hiddenQuadratic],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['quadratic-formula', 'discriminant'],
  cambridge: withUses([twoRates, a1q2ii, a1q2i, hidden], {
    'a1-q1-iv': { sections: ['Quadratics in disguise'], note: t`Solving a quadratic in disguise with surd roots`, needs: ['alg.surds'] },
    'a1-q2-i': { sections: ['Factorising', 'Quadratics in disguise'], note: t`Clearing the fractions to reach a quadratic, then checking no root makes a denominator zero` },
    's2-q5-two-values': { sections: ['Quadratics in disguise', 'Factorising'], note: t`Spotting a quadratic in a new letter and solving it` },
  }),
  // The two values of the exponential test the quadratic. The write-up of STEP 2 Statistics Q5 and Mildred's first
  // text need Poisson processes, so they are left to prob.poisson-rates, which sets the first and works the
  // second (Rule 1, 2026-10-08). Assignment 2 Q2(vi) asks for greatest and
  // least values on an interval, so it is left to fn.quadratic-graphs, which works it. The repeated root is one step.
  // Assignment 1 Q2(i) hides a quadratic behind two fractions.
  gate: ['s2-q5-two-values', 'a1-q2-i'],
  recall: [
    { front: t`State the quadratic formula.`, back: t`${math`x = \frac{-b \pm \sqrt{b^{${2}} - ${4}ac}}{${2}a}`}, for ${math`a \ne ${0}`}.` },
    { front: t`How does the discriminant count the real roots?`, back: t`${math`\Delta > ${0}`}: two. ${math`\Delta = ${0}`}: one repeated root. ${math`\Delta < ${0}`}: none.` },
    { front: t`Sum and product of the roots of ${math`ax^{${2}} + bx + c = ${0}`}?`, back: t`Sum ${math`-\frac{b}{a}`}, product ${math`\frac{c}{a}`}.` },
    { front: t`State the zero product fact.`, back: t`If ${math`uv = ${0}`} then ${math`u = ${0}`} or ${math`v = ${0}`}.` },
  ],
  proofOrder: [
    {
      title: t`Deriving the quadratic formula`,
      steps: [
        t`Divide by ${math`a`}: ${math`x^{${2}} + \frac{b}{a}x + \frac{c}{a} = ${0}`}.`,
        t`Complete the square: ${math`\left(x + \frac{b}{${2}a}\right)^{${2}} - \frac{b^{${2}}}{${4}a^{${2}}} + \frac{c}{a} = ${0}`}.`,
        t`Isolate the square: ${math`\left(x + \frac{b}{${2}a}\right)^{${2}} = \frac{b^{${2}} - ${4}ac}{${4}a^{${2}}}`}.`,
        t`Take square roots: ${math`x = \frac{-b \pm \sqrt{b^{${2}} - ${4}ac}}{${2}a}`}.`,
      ],
    },
  ],
};
