/**
 * alg.sums-of-powers: the sums of squares and of cubes, found by fitting a polynomial through
 * small cases (STEP Support Assignment 17, Q3, which is 2003 STEP I Q1) and proved by induction
 * (Assignment 20, Q2(b)) or by telescoping (r + 1)^3 - r^3. Also the NST Mathematics Workbook,
 * SE1. Every formula is checked against direct summation.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { int, pick } from '../math';
import { generator, type Misconception } from '../problem';
import { dmath, math, t } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

const [mn, mr, mk] = [math`n`, math`r`, math`k`];
const S1 = (n: number): number => (n * (n + 1)) / 2;
const S2 = (n: number): number => (n * (n + 1) * (2 * n + 1)) / 6;
const S3 = (n: number): number => S1(n) ** 2;
const direct = (lo: number, hi: number, f: (r: number) => number): number => {
  let s = 0;
  for (let r = lo; r <= hi; r++) s += f(r);
  return s;
};

// ---------------------------------------------------------------- generators

interface NP { n: number }

const sqGen = generator<NP>({
  id: 'squares',
  skill: 'Evaluate the sum of the first n squares with n(n + 1)(2n + 1)/6.',
  quick: true,
  params: (rng) => ({ n: int(rng, 5, 40) }),
  sane: ({ n }) => (n >= 5 ? null : 'out of range'),
  problem: ({ n }) => ({
    prompt: t`Find ${math`${1}^{${2}} + ${2}^{${2}} + \cdots + ${n}^{${2}}`}.`,
    answer: { kind: 'exact', expected: String(S2(n)) },
    solution: [t`${math`\sum_{r = ${1}}^{n} r^{${2}} = \frac{n(n + ${1})(${2}n + ${1})}{${6}}`} with ${math`n = ${n}`}: ${math`\frac{${n} \times ${n + 1} \times ${2 * n + 1}}{${6}} = ${S2(n)}`}.`],
  }),
  solve: ({ n }) => String(direct(1, n, (r) => r * r)),
  misconceptions: ({ n }): Misconception[] => [
    { response: String(S1(n) ** 2), why: t`That is ${math`(${1} + \cdots + ${n})^{${2}}`}, the sum of cubes. The sum of squares is ${math`\frac{n(n + ${1})(${2}n + ${1})}{${6}}`}.` },
    { response: String(n * (n + 1) * (2 * n + 1)), why: t`Divide by ${6}.` },
    { response: String(S2(n - 1)), why: t`That stops at ${math`${n - 1}^{${2}}`}; the last square is ${math`${n}^{${2}}`}.` },
  ],
});

const cubeGen = generator<NP>({
  id: 'cubes',
  skill: 'Evaluate the sum of the first n cubes with (n(n + 1)/2)^2.',
  quick: true,
  params: (rng) => ({ n: int(rng, 4, 30) }),
  sane: ({ n }) => (n >= 4 ? null : 'out of range'),
  problem: ({ n }) => ({
    prompt: t`Find ${math`${1}^{${3}} + ${2}^{${3}} + \cdots + ${n}^{${3}}`}.`,
    answer: { kind: 'exact', expected: String(S3(n)) },
    solution: [t`${math`\sum_{r = ${1}}^{n} r^{${3}} = \frac{n^{${2}}(n + ${1})^{${2}}}{${4}} = \left(\frac{n(n + ${1})}{${2}}\right)^{${2}}`}: the square of ${math`${1} + \cdots + n`}. Here ${math`${S1(n)}^{${2}} = ${S3(n)}`}.`],
  }),
  solve: ({ n }) => String(direct(1, n, (r) => r ** 3)),
  misconceptions: ({ n }): Misconception[] => [
    { response: String(S1(n)), why: t`That is ${math`${1} + ${2} + \cdots + ${n}`}. The sum of cubes is its square.` },
    { response: String(2 * S3(n)), why: t`The formula is ${math`\frac{n^{${2}}(n + ${1})^{${2}}}{${4}}`}: divide by ${4}, not ${2}.` },
  ],
});

interface RangeP { a: number; b: number; p: 2 | 3 }

const rangeGen = generator<RangeP>({
  id: 'from-a-to-b',
  skill: 'Sum squares or cubes from r = a to b as S(b) - S(a - 1).',
  params: (rng) => {
    const a = int(rng, 3, 15);
    return { a, b: a + int(rng, 4, 20), p: pick(rng, [2, 3] as const) };
  },
  sane: ({ a, b }) => (a >= 3 && b > a ? null : 'need 3 <= a < b'),
  problem: ({ a, b, p }) => {
    const S = p === 2 ? S2 : S3;
    return {
      prompt: t`Find ${math`\sum_{r = ${a}}^{${b}} r^{${p}}`}.`,
      answer: { kind: 'exact', expected: String(S(b) - S(a - 1)) },
      solution: [
        t`Take the sum from ${1} to ${b} and remove the sum from ${1} to ${a - 1}: the terms ${math`r = ${1}, \ldots, ${a - 1}`} are not wanted, and ${math`r = ${a}`} is.`,
        t`${math`${S(b)} - ${S(a - 1)} = ${S(b) - S(a - 1)}`}.`,
      ],
    };
  },
  solve: ({ a, b, p }) => String(direct(a, b, (r) => r ** p)),
  misconceptions: ({ a, b, p }): Misconception[] => {
    const S = p === 2 ? S2 : S3;
    return [
      { response: String(S(b) - S(a)), why: t`That also removes ${math`${a}^{${p}}`}, which is in the sum. Subtract the sum up to ${a - 1}.` },
      { response: String(S(b - a + 1)), why: t`That is the sum of the first ${b - a + 1} powers, from ${1}. The terms here are bigger: subtract ${math`S(${a - 1})`} from ${math`S(${b})`}.` },
    ];
  },
});

interface MixP { c: number }

const mixGen = generator<MixP>({
  id: 'combination',
  skill: 'Combine the standard sums: the sum of r(r + c) is the sum of r^2 plus c times the sum of r.',
  params: (rng) => ({ c: int(rng, 1, 6) }),
  sane: ({ c }) => (c >= 1 ? null : 'out of range'),
  problem: ({ c }) => ({
    prompt: t`Find ${math`\sum_{r = ${1}}^{n} r(r + ${c})`} as a formula in ${mn}.`,
    answer: { kind: 'expression', expected: `n*(n + 1)*(2*n + 1)/6 + ${c}*n*(n + 1)/2`, variables: ['n'], domains: { n: { kind: 'integer', min: 1, max: 30 } } },
    solution: [
      t`${math`r(r + ${c}) = r^{${2}} + ${c}r`}, and sums split term by term: ${math`\sum r^{${2}} + ${c}\sum r`}.`,
      t`${math`\frac{n(n + ${1})(${2}n + ${1})}{${6}} + \frac{${c}n(n + ${1})}{${2}} = \frac{n(n + ${1})(${2}n + ${1 + 3 * c})}{${6}}`}.`,
    ],
  }),
  solve: ({ c }) => {
    // Fit the cubic through n = 0, 1, 2, 3 by Lagrange interpolation, from direct sums.
    const v = [0, 1, 2, 3].map((n) => direct(1, n, (r) => r * (r + c)));
    return `(${v[0]})*(n-1)*(n-2)*(n-3)/(-6) + (${v[1]})*n*(n-2)*(n-3)/2 + (${v[2]})*n*(n-1)*(n-3)/(-2) + (${v[3]})*n*(n-1)*(n-2)/6`;
  },
  misconceptions: ({ c }): Misconception[] => [
    { response: `n*(n + 1)*(2*n + 1)/6 + ${c}*n`, why: t`${math`\sum_{r = ${1}}^{n} ${c}r = ${c}\cdot\frac{n(n + ${1})}{${2}}`}, not ${math`${c}n`}: it is ${c} times the sum of ${mr}.` },
    { response: `n*(n + 1)*(2*n + 1)/6 * ${c}*n*(n + 1)/2`, why: t`A sum of a sum splits into a sum of sums; it does not multiply. Add the two parts.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const F17 = 'step-f17';
const F17H = 'step-f17-hints';

const a17sq = auto({
  id: 'a17-q3-squares',
  source: cite(F17, 'Assignment 17, Q3'),
  title: t`Squares by fitting a cubic`,
  prompt: t`(${2003} STEP I, Question ${1}.) It is given that ${math`\sum_{r = -${1}}^{n} r^{${2}}`} can be written as ${math`pn^{${3}} + qn^{${2}} + rn + s`} for numbers ${math`p, q, r, s`}. By setting ${math`n = -${1}, ${0}, ${1}, ${2}`}, find them, and hence find ${math`\sum_{r = ${0}}^{n} r^{${2}}`} as a formula in ${mn}.`,
  answer: { kind: 'expression', expected: 'n*(n + 1)*(2*n + 1)/6', variables: ['n'], domains: { n: { kind: 'integer', min: 0, max: 30 } } },
  solution: [
    t`The sums at ${math`n = -${1}, ${0}, ${1}, ${2}`} are ${1}, ${1}, ${2}, ${6} (for instance ${math`n = ${0}`}: ${math`(-${1})^{${2}} + ${0}^{${2}} = ${1}`}). So ${math`-p + q - r + s = ${1}`}, ${math`s = ${1}`}, ${math`p + q + r + s = ${2}`}, ${math`${8}p + ${4}q + ${2}r + s = ${6}`}.`,
    t`Adding the first and third: ${math`${2}q + ${2}s = ${3}`}, so ${math`q = \frac{${1}}{${2}}`}. Then ${math`p + r = \frac{${1}}{${2}}`} and ${math`${8}p + ${2}r = ${3}`}, giving ${math`p = \frac{${1}}{${3}}`}, ${math`r = \frac{${1}}{${6}}`}.`,
    t`Remove the ${math`r = -${1}`} term, which is ${1}: ${math`\sum_{r = ${0}}^{n} r^{${2}} = \frac{n^{${3}}}{${3}} + \frac{n^{${2}}}{${2}} + \frac{n}{${6}} = \frac{n}{${6}}(${2}n^{${2}} + ${3}n + ${1}) = \frac{n(n + ${1})(${2}n + ${1})}{${6}}`}.`,
  ],
  reference: 'n(n + 1)(2n + 1)/6',
  verify: () => {
    for (let n = 0; n <= 40; n++) { const e = same(`n = ${n}`, direct(0, n, (r) => r * r), S2(n)); if (e !== null) return e; }
    return null;
  },
  misconceptions: [
    { response: 'n^3/3 + n^2/2 + n/6 + 1', why: t`That still includes the ${math`r = -${1}`} term, ${math`(-${1})^{${2}} = ${1}`}. The sum from ${math`r = ${0}`} is one less.` },
    { response: 'n*(n + 1)/2', why: t`That is the sum of ${mr}, not of ${math`r^{${2}}`}.` },
  ],
  official: { source: cite(F17H, 'Assignment 17, Q3'), answer: 'n(n + 1)(2n + 1)/6', agrees: true },
});

const a17cube = auto({
  id: 'a17-q3-cubes',
  source: cite(F17, 'Assignment 17, Q3'),
  title: t`Cubes by fitting a quartic`,
  prompt: t`(${2003} STEP I, Question ${1}, continued.) Given that ${math`\sum_{r = -${2}}^{n} r^{${3}}`} can be written as ${math`an^{${4}} + bn^{${3}} + cn^{${2}} + dn + e`}, find ${math`\sum_{r = ${0}}^{n} r^{${3}}`} as a formula in ${mn}, by choosing five values of ${mn}.`,
  answer: { kind: 'expression', expected: 'n^2*(n + 1)^2/4', variables: ['n'], domains: { n: { kind: 'integer', min: 0, max: 30 } } },
  solution: [
    t`Use ${math`n = -${2}, -${1}, ${0}, ${1}, ${2}`}: the sums are ${math`-${8}, -${9}, -${9}, -${8}, ${0}`}. So ${math`e = -${9}`}; ${math`n = \pm ${1}`} give ${math`${2}a + ${2}c + ${2}e = -${17}`} and ${math`${2}b + ${2}d = ${1}`}; ${math`n = \pm ${2}`} give ${math`${32}a + ${8}c + ${2}e = -${8}`} and ${math`${16}b + ${4}d = ${8}`}.`,
    t`Solving: ${math`b = \frac{${1}}{${2}}`}, ${math`d = ${0}`}, ${math`a = \frac{${1}}{${4}}`}, ${math`c = \frac{${1}}{${4}}`}.`,
    t`The terms ${math`r = -${2}, -${1}`} contribute ${math`-${9}`}; remove them: ${math`\sum_{r = ${0}}^{n} r^{${3}} = \frac{n^{${4}}}{${4}} + \frac{n^{${3}}}{${2}} + \frac{n^{${2}}}{${4}} = \frac{n^{${2}}(n + ${1})^{${2}}}{${4}}`}.`,
  ],
  reference: 'n^2(n + 1)^2/4',
  verify: () => {
    for (let n = 0; n <= 40; n++) { const e = same(`n = ${n}`, direct(0, n, (r) => r ** 3), S3(n)); if (e !== null) return e; }
    return null;
  },
  misconceptions: [{ response: 'n^4/4 + n^3/2 + n^2/4 - 9', why: t`That is the sum from ${math`r = -${2}`}. Add back the ${9} from ${math`(-${2})^{${3}} + (-${1})^{${3}}`}.` }],
  official: { source: cite(F17H, 'Assignment 17, Q3'), answer: 'n^2(n + 1)^2/4', agrees: true },
});

const a17sup = supervision({
  id: 'a17-q3-proof',
  source: cite(F17, 'Assignment 17, Q3'),
  title: t`The whole STEP question`,
  prompt: t`(${2003} STEP I, Question ${1}.) It is given that ${math`\sum_{r = -${1}}^{n} r^{${2}}`} can be written in the form ${math`pn^{${3}} + qn^{${2}} + rn + s`}. By setting ${math`n = -${1}, ${0}, ${1}, ${2}`}, obtain four equations for ${math`p, q, r, s`} and hence show that ${math`\sum_{r = ${0}}^{n} r^{${2}} = \frac{${1}}{${6}}n(n + ${1})(${2}n + ${1})`}. Given that ${math`\sum_{r = -${2}}^{n} r^{${3}}`} can be written as ${math`an^{${4}} + bn^{${3}} + cn^{${2}} + dn + e`}, show similarly that ${math`\sum_{r = ${0}}^{n} r^{${3}} = \frac{${1}}{${4}}n^{${2}}(n + ${1})^{${2}}`}.`,
  writeUp: 'proof',
  official: cite(F17H, 'Assignment 17, Q3'),
});

const a20sup = supervision({
  id: 'a20-q2-b',
  source: cite('step-f20', 'Assignment 20, Q2(b)'),
  title: t`Cubes by induction`,
  prompt: t`Use induction to prove that ${math`\sum_{i = ${1}}^{n} i^{${3}} = \frac{${1}}{${4}}n^{${2}}(n + ${1})^{${2}}`} for ${math`n \ge ${1}`}. When you consider the case ${math`n = k + ${1}`}, write down what you are required to prove, and factorise rather than expand.`,
  writeUp: 'proof',
  official: cite('step-f20-hints', 'Assignment 20, Q2(b)'),
});

const nstSE1 = auto({
  id: 'nst-se1',
  source: cite('nst-workbook', 'Section 2, Series, SE1'),
  title: t`A sum of ${math`r(r^{${2}} + ${2})`}`,
  prompt: t`Sum the series ${math`\sum_{r = ${1}}^{n} r(r^{${2}} + ${2})`}, as a formula in ${mn}.`,
  answer: { kind: 'expression', expected: 'n*(n + 1)*(n^2 + n + 4)/4', variables: ['n'], domains: { n: { kind: 'integer', min: 1, max: 30 } } },
  solution: [
    t`${math`r(r^{${2}} + ${2}) = r^{${3}} + ${2}r`}, so the sum is ${math`\frac{n^{${2}}(n + ${1})^{${2}}}{${4}} + ${2} \cdot \frac{n(n + ${1})}{${2}}`}.`,
    t`Take out ${math`\frac{n(n + ${1})}{${4}}`}: ${math`\frac{n(n + ${1})}{${4}}\left(n(n + ${1}) + ${4}\right) = \frac{n(n + ${1})(n^{${2}} + n + ${4})}{${4}}`}.`,
  ],
  reference: 'n(n + 1)(n^2 + n + 4)/4',
  verify: () => {
    for (let n = 1; n <= 30; n++) { const e = same(`n = ${n}`, direct(1, n, (r) => r * (r * r + 2)), (n * (n + 1) * (n * n + n + 4)) / 4); if (e !== null) return e; }
    return null;
  },
  misconceptions: [{ response: 'n^2*(n + 1)^2/4 + 2*n', why: t`${math`\sum ${2}r = ${2} \cdot \frac{n(n + ${1})}{${2}} = n(n + ${1})`}, not ${math`${2}n`}.` }],
});

// ---------------------------------------------------------------- lesson

export const sumsOfPowers: TopicContent = {
  topicId: 'alg.sums-of-powers',
  goal: t`Find ${math`\sum r^{${2}}`} and ${math`\sum r^{${3}}`} by fitting a polynomial through small cases, and prove the formulas by induction.`,
  objective: t`Find and prove the formulas for sums of squares and cubes, and use them in other sums.`,
  why: t`These sums appear across STEP and in counting and probability, and the fitting method generalises.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`Guess the shape, then fit it` },
    { kind: 'hook', text: t`${math`${1} + ${4} + ${9} + \cdots + ${100} = ${S2(10)}`}, and ${math`${1} + ${8} + ${27} + \cdots + ${1000} = ${S3(10)} = ${S1(10)}^{${2}}`}. The sum of the first ten cubes is the square of the sum of the first ten numbers. Coincidence?` },
    { kind: 'narrative', text: t`Adding ${math`r`} up to ${mn} gives ${math`\frac{n(n + ${1})}{${2}}`}, a quadratic in ${mn}. Adding one more power seems to add one more degree. So guess that the [[sum-of-squares|sum of squares]] ${math`\sum_{r = ${1}}^{n} r^{${2}}`} is a cubic, ${math`pn^{${3}} + qn^{${2}} + rn + s`}, and find the four unknowns from four values of the sum. That is the method of the STEP question below.` },
    { kind: 'theorem', name: t`Sums of squares and cubes`, statement: t`For every integer ${math`n \ge ${1}`}, ${dmath`\sum_{r = ${1}}^{n} r^{${2}} = \frac{n(n + ${1})(${2}n + ${1})}{${6}}, \qquad \sum_{r = ${1}}^{n} r^{${3}} = \frac{n^{${2}}(n + ${1})^{${2}}}{${4}} = \left(\sum_{r = ${1}}^{n} r\right)^{${2}}.`}` },
    { kind: 'p', text: t`Fitting: the sums for ${math`n = ${0}, ${1}, ${2}, ${3}`} are ${0}, ${1}, ${5}, ${14}. A cubic through those four points is unique, and ${math`\frac{n(n + ${1})(${2}n + ${1})}{${6}}`} passes through all four. But fitting assumed the answer is a cubic; that is why a proof is still needed. Here is one by induction.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Base case`, text: t`${math`n = ${1}`}: ${math`${1}^{${2}} = ${1}`} and ${math`\frac{${1} \cdot ${2} \cdot ${3}}{${6}} = ${1}`}.` },
        { label: t`Assume for k`, text: t`Suppose ${math`\sum_{r = ${1}}^{k} r^{${2}} = \frac{k(k + ${1})(${2}k + ${1})}{${6}}`}.` },
        { label: t`Add the next square`, text: t`Then ${math`\sum_{r = ${1}}^{k + ${1}} r^{${2}} = \frac{k(k + ${1})(${2}k + ${1})}{${6}} + (k + ${1})^{${2}} = \frac{(k + ${1})\left(k(${2}k + ${1}) + ${6}(k + ${1})\right)}{${6}}`}.`, why: { q: t`Why take out ${math`k + ${1}`} rather than expand?`, a: t`The target, ${math`\frac{(k + ${1})(k + ${2})(${2}k + ${3})}{${6}}`}, has the factor ${math`k + ${1}`}. Keeping it saves factorising a cubic later.` } },
        { label: t`Factorise`, text: t`${math`k(${2}k + ${1}) + ${6}(k + ${1}) = ${2}k^{${2}} + ${7}k + ${6} = (k + ${2})(${2}k + ${3})`}, so the sum is ${math`\frac{(k + ${1})(k + ${2})(${2}(k + ${1}) + ${1})}{${6}}`}: the formula for ${math`k + ${1}`}.` },
        { label: t`Conclude`, text: t`True for ${math`n = ${1}`}, and true for ${math`k + ${1}`} whenever true for ${mk}; so true for all ${math`n \ge ${1}`}.` },
      ],
    },
    { kind: 'p', text: t`A proof with no guessing: telescope ${math`(r + ${1})^{${3}} - r^{${3}} = ${3}r^{${2}} + ${3}r + ${1}`} from ${math`r = ${1}`} to ${mn}. The left side sums to ${math`(n + ${1})^{${3}} - ${1}`}, so ${math`${3}\sum r^{${2}} = (n + ${1})^{${3}} - ${1} - ${3}\cdot\frac{n(n + ${1})}{${2}} - n`}, which simplifies to the same formula.` },
    checkFrom(sqGen, { n: 10 }, t`${math`\frac{${10} \times ${11} \times ${21}}{${6}} = ${385}`}.`),
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`${math`\sum_{r = ${1}}^{n} r^{${2}} = \left(\sum_{r = ${1}}^{n} r\right)^{${2}}`}, just as for cubes.`, counterexample: t`For ${math`n = ${2}`}: ${math`${1} + ${4} = ${5}`}, but ${math`(${1} + ${2})^{${2}} = ${9}`}. Squaring a sum creates cross terms ${math`${2} \cdot ${1} \cdot ${2}`}; only for cubes do the totals coincide.` },
    { kind: 'pitfall', claim: t`A polynomial that matches the sum at four values of ${mn} is the formula.`, counterexample: t`Only if the sum is known to be a cubic. The STEP question gives that; otherwise prove it. The values ${1}, ${2}, ${4}, ${8} of ${math`${2}^{n}`} at ${math`n = ${0}, \ldots, ${3}`} fit a cubic too, which then fails at ${math`n = ${4}`}: it gives ${15}, not ${16}.` },
    { kind: 'takeaway', text: t`${math`\sum r^{${2}} = \frac{n(n + ${1})(${2}n + ${1})}{${6}}`} and ${math`\sum r^{${3}} = \left(\frac{n(n + ${1})}{${2}}\right)^{${2}}`}: guess by fitting, then prove.` },
  ],
  examples: [
    workedCambridge(a17sq),
    worked(rangeGen, { a: 11, b: 20, p: 2 }, t`Squares from ${11} to ${20}`),
    worked(mixGen, { c: 1 }, t`Splitting a sum`),
  ],
  generators: [sqGen, cubeGen, rangeGen, mixGen],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['sum-of-squares'],
  cambridge: [a17cube, a17sup, a20sup, nstSE1],
  gate: ['a17-q3-cubes', 'a17-q3-proof'],
  recall: [
    { front: t`State the sum of the first ${mn} squares.`, back: t`${math`\frac{n(n + ${1})(${2}n + ${1})}{${6}}`}.` },
    { front: t`State the sum of the first ${mn} cubes.`, back: t`${math`\frac{n^{${2}}(n + ${1})^{${2}}}{${4}}`}, the square of ${math`${1} + \cdots + n`}.` },
  ],
  proofOrder: [
    {
      title: t`The inductive step for ${math`\sum r^{${2}}`}`,
      steps: [
        t`Assume ${math`\sum_{r = ${1}}^{k} r^{${2}} = \frac{k(k + ${1})(${2}k + ${1})}{${6}}`}.`,
        t`Add ${math`(k + ${1})^{${2}}`} and take out ${math`\frac{k + ${1}}{${6}}`}.`,
        t`The bracket is ${math`${2}k^{${2}} + ${7}k + ${6} = (k + ${2})(${2}k + ${3})`}.`,
        t`That is the formula with ${math`k + ${1}`} in place of ${mk}.`,
      ],
    },
  ],
};

