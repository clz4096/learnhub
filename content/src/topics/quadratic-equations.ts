/**
 * pre.quadratic-equations (a bridge): solve ax^2 + bx + c = 0 by factorising, completing the
 * square, or the formula, and count the real roots with the discriminant; including
 * quadratics in a function of the unknown. The batch 2 sources assume it: STEP 2
 * Statistics Q5 (2010 S1 Q13) turns a Poisson waiting time into pe^(2λ) - e^λ + 1 = 0, a
 * quadratic in e^λ, whose two roots give Mildred's two phones. The official solution's
 * answers, λ1 + λ2 = -ln p and p(1 - p), are compared in the content checks.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { add, div, int, mul, pick, q, str, sub, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { computedMath, computedTex, frac, math, t } from '../rich';
import { worked, workedCambridge, type TopicContent } from '../topic';
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

const mildredWait = auto({
  id: 's2-q5-first-text',
  source: cite(S2, 'Q5'),
  title: t`Mildred's first text`,
  prompt: t`Texts on Mildred's two phones arrive as independent Poisson processes with rates ${math`\lambda_{${1}}`} and ${math`\lambda_{${2}}`}, where ${math`\lambda_{${1}} + \lambda_{${2}} = -\ln p`}. The texts on the two phones together arrive as a Poisson process with rate ${math`\lambda_{${1}} + \lambda_{${2}}`}. Find, in terms of ${math`p`}, the probability that she waits between ${1} and ${2} hours for her first text.`,
  answer: { kind: 'expression', expected: 'p(1 - p)', variables: ['p'], domains: P_DOM },
  solution: [
    t`No text in the first hour, then at least one in the second: with total rate ${math`\Lambda = \lambda_{${1}} + \lambda_{${2}}`}, the probability is ${math`e^{-\Lambda}(${1} - e^{-\Lambda})`}.`,
    t`${math`e^{-\Lambda} = e^{\ln p} = p`}, so the probability is ${math`p(${1} - p)`}.`,
  ],
  reference: 'p(1 - p)',
  verify: () => {
    for (const p of [0.05, 0.1, 0.2]) {
      const [l1, l2] = rates(p);
      if (far(waits(l1 + l2), p * (1 - p))) return `p = ${p}: the combined rate gives ${waits(l1 + l2)}`;
    }
    return null;
  },
  misconceptions: [{ response: 'p^2', why: t`The two phones' waits are not to be multiplied: the first text on either phone is the first event of the combined process, rate ${math`\lambda_{${1}} + \lambda_{${2}}`}.` }],
  official: { source: cite(S2S, 'Q5'), answer: 'p(1 - p)', agrees: true },
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
});

const showQuadratic = supervision({
  id: 's2-q5-show',
  source: cite(S2, 'Q5'),
  title: t`The quadratic, and two positive rates`,
  prompt: t`George's texts arrive as a Poisson process with rate ${math`\lambda`} per hour. Given that the probability that he waits between ${1} and ${2} hours for his first text is ${math`p`}, show that ${math`pe^{${2}\lambda} - e^{\lambda} + ${1} = ${0}`}. Given that ${math`${4}p < ${1}`}, show that two positive values of ${math`\lambda`} satisfy this equation. (Note that ${math`\lambda > ${0}`} exactly when ${math`e^{\lambda} > ${1}`}.)`,
  writeUp: 'proof',
  official: cite(S2S, 'Q5'),
});

// ---------------------------------------------------------------- lesson

const EXP = { a: 2, b: -7, c: 3 };

export const quadraticEquations: TopicContent = {
  topicId: 'pre.quadratic-equations',
  goal: t`Solve ${math`ax^{${2}} + bx + c = ${0}`} by factorising, completing the square, or the formula, tell from the discriminant how many real roots there are, and spot a quadratic in a function of the unknown.`,
  lesson: [
    { kind: 'p', text: t`A quadratic equation is ${math`ax^{${2}} + bx + c = ${0}`} with ${math`a \ne ${0}`}. If it factorises, each factor gives a root: ${computedMath(`${poly([EXP.a, EXP.b, EXP.c])} = (${poly([2, -1])})(${poly([1, -3])})`)}, so ${math`x = ${q(1, 2)}`} or ${math`x = ${3}`}.` },
    { kind: 'p', text: t`Every quadratic can be solved by completing the square: ${math`ax^{${2}} + bx + c = a\left(x + \frac{b}{${2}a}\right)^{${2}} - \frac{b^{${2}} - ${4}ac}{${4}a}`}. Setting this to ${0} and taking square roots gives the formula.` },
    { kind: 'rule', text: t`The [[quadratic-formula|quadratic formula]]: ${math`x = \frac{-b \pm \sqrt{b^{${2}} - ${4}ac}}{${2}a}`}. The [[discriminant|discriminant]] ${math`b^{${2}} - ${4}ac`} decides the number of real roots: two if it is positive, one repeated root if it is ${0}, none if it is negative.` },
    { kind: 'p', text: t`Adding and multiplying the two roots of the formula gives ${math`x_{${1}} + x_{${2}} = -\frac{b}{a}`} and ${math`x_{${1}} x_{${2}} = \frac{c}{a}`}, often quicker than finding the roots themselves.` },
    { kind: 'p', text: t`A quadratic can hide in a function of the unknown. STEP ${2} Statistics Q${5} reaches ${math`pe^{${2}\lambda} - e^{\lambda} + ${1} = ${0}`}: with ${math`y = e^{\lambda}`} it is ${math`py^{${2}} - y + ${1} = ${0}`}. Real roots need ${math`${1} - ${4}p \ge ${0}`}; a positive ${math`\lambda`} needs ${math`y > ${1}`}, since ${math`e^{\lambda}`} is always positive; and the product of the roots, ${math`\frac{${1}}{p}`}, gives the sum of the two rates.` },
  ],
  examples: [
    workedCambridge(mildredSum),
    worked(solveQuadratic, { a: 2, m: 3, n: -4 }, t`A quadratic with a fractional root`),
    worked(hiddenQuadratic, { base: 2, m: 1, n: 3, neg: false }, t`A quadratic in ${math`${2}^{x}`}`),
  ],
  generators: [solveQuadratic, repeatedRoot, hiddenQuadratic],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['quadratic-formula', 'discriminant'],
  cambridge: [mildredWait, twoRates, showQuadratic],
  gate: ['s2-q5-first-text', 's2-q5-two-values', 's2-q5-show'],
};
