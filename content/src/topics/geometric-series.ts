/**
 * alg.geometric-series: The sum of a finite geometric series, a(1 - r^n)/(1 - r). From CST
 * supervision exercise 4.2.1: (a) (2^n - 1) Σ_{i<m} 2^{in} = 2^{mn} - 1, which the 2023-24
 * official solution proves first by telescoping, as here; and (b) if k is not prime, then
 * neither is 2^k - 1. Book of Proof Chapter 10, exercise 5 (the sum of powers of 2) is
 * added as practice, checked against its solution.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { add, int, mul, pick, q, str, sub, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { computedTex, dmath, listOf, math, t } from '../rich';
import { worked, workedCambridge, type TopicContent } from '../topic';

const [mn, mr, ma] = [math`n`, math`r`, math`a`];
const pow = (r: Rational, k: number): Rational => Array.from({ length: k }, () => r).reduce((x, y) => mul(x, y), q(1));
const gpSum = (a: Rational, r: Rational, n: number): Rational => Array.from({ length: n }, (_, i) => mul(a, pow(r, i))).reduce((x, y) => add(x, y), q(0));
const texR = (r: Rational): string => (r.den === 1n ? (r.num < 0n ? `(${r.num})` : `${r.num}`) : `\\left(${r.num < 0n ? '-' : ''}\\frac{${r.num < 0n ? -r.num : r.num}}{${r.den}}\\right)`);

// ---------------------------------------------------------------- generators

interface SumP { a: number; r: Rational; n: number }
const RATIOS: readonly Rational[] = [q(2), q(3), q(4), q(-2), q(-3), q(1, 2), q(1, 3), q(-1, 2), q(2, 3)];

const sumGp = generator<SumP>({
  id: 'sum',
  skill: 'Sum a finite geometric series with a(1 - r^n)/(1 - r).',
  params: (rng) => ({ a: pick(rng, [1, 2, 3, 5, -1, -2]), r: pick(rng, RATIOS), n: int(rng, 4, 9) }),
  sane: ({ n }) => (n >= 4 && n <= 9 ? null : 'out of range'),
  problem: ({ a, r, n }) => {
    const A = q(a);
    const total = gpSum(A, r, n);
    const terms = [0, 1, 2].map((i) => mul(A, pow(r, i)));
    return {
      prompt: t`Find the sum of the first ${n} terms of the geometric sequence ${math`${terms[0] as Rational}, ${terms[1] as Rational}, ${terms[2] as Rational}, \ldots`}.`,
      answer: { kind: 'exact', expected: str(total) },
      solution: [
        t`The first term is ${math`a = ${a}`} and the common ratio is ${math`r = ${r}`}.`,
        t`${math`S_{${n}} = \frac{a(${1} - r^{${n}})}{${1} - r} = \frac{${a}\left(${1} - ${computedTex(texR(r))}^{${n}}\right)}{${1} - ${computedTex(texR(r))}} = \frac{${a}(${1} - ${pow(r, n)})}{${sub(q(1), r)}} = ${total}`}.`,
      ],
    };
  },
  solve: ({ a, r, n }) => {
    // Add the terms one by one, each the last times r.
    let term = q(a);
    let s = q(0);
    for (let i = 0; i < n; i++) { s = add(s, term); term = mul(term, r); }
    return str(s);
  },
  misconceptions: ({ a, r, n }): Misconception[] => {
    const A = q(a);
    return [
      { response: str(gpSum(A, r, n + 1)), why: t`That is ${n + 1} terms: the formula's power is the number of terms, ${n}, because the first term is ${math`ar^{${0}}`}.` },
      { response: str(mul(A, pow(r, n - 1))), why: t`That is the last term, ${math`ar^{${n - 1}}`}, not the sum.` },
      { response: str(sub(q(0), gpSum(A, r, n))), why: t`The sign is wrong: ${math`\frac{${1} - r^{n}}{${1} - r}`} and ${math`\frac{r^{n} - ${1}}{r - ${1}}`} are equal; mixing the two flips it.` },
    ];
  },
});

interface TermP { a: number; r: number; n: number }

const nthTerm = generator<TermP>({
  id: 'nth-term',
  skill: 'Find a term of a geometric sequence: the nth term is ar^(n - 1).',
  params: (rng) => ({ a: pick(rng, [1, 2, 3, 5, 7, -3]), r: pick(rng, [2, 3, -2, 4, 5]), n: int(rng, 5, 10) }),
  sane: ({ n }) => (n >= 5 && n <= 10 ? null : 'out of range'),
  problem: ({ a, r, n }) => ({
    prompt: t`A geometric sequence begins ${listOf([a, a * r, a * r * r])}, and so on. What is its ${n}th term?`,
    answer: { kind: 'exact', expected: String(a * r ** (n - 1)) },
    solution: [t`Each term is the one before times ${math`r = ${r}`}. From term ${1} to term ${n} is ${n - 1} multiplications: ${math`${a} \times ${computedTex(r < 0 ? `(${r})` : `${r}`)}^{${n - 1}} = ${a * r ** (n - 1)}`}.`],
  }),
  solve: ({ a, r, n }) => {
    let x = a;
    for (let i = 1; i < n; i++) x *= r;
    return String(x);
  },
  misconceptions: ({ a, r, n }): Misconception[] => [
    { response: String(a * r ** n), why: t`Term ${n} is ${n - 1} steps from the first, so the power is ${n - 1}.` },
    { response: String(a + (n - 1) * r), why: t`That adds ${r} each time. A geometric sequence multiplies by ${r}.` },
  ],
});

interface ClosedP { r: number }

const closed = generator<ClosedP>({
  id: 'closed-form',
  skill: 'Write the sum of the first n powers of r in closed form, by the telescoping trick S - rS.',
  params: (rng) => ({ r: pick(rng, [2, 3, 4, 5, 6, 10]) }),
  sane: ({ r }) => (r >= 2 ? null : 'out of range'),
  problem: ({ r }) => ({
    prompt: t`Write ${math`\sum_{i = ${0}}^{n - ${1}} ${r}^{i} = ${1} + ${r} + ${r}^{${2}} + \cdots + ${r}^{n - ${1}}`} as a formula in ${mn}.`,
    answer: { kind: 'expression', expected: `(${r}^n - 1)/${r - 1}`, variables: ['n'], domains: { n: { kind: 'integer', min: 1, max: 12 } } },
    solution: [
      t`Call the sum ${math`S`}. Then ${math`${r}S = ${r} + ${r}^{${2}} + \cdots + ${r}^{n}`}, and subtracting, everything cancels except the ends: ${math`${r}S - S = ${r}^{n} - ${1}`}.`,
      t`So ${math`S = \frac{${r}^{n} - ${1}}{${r - 1}}`}.`,
    ],
  }),
  solve: ({ r }) => {
    // Fit from n = 1 and n = 2: S(n) = (r^n - 1)/(r - 1) is c·r^n + d with c = 1/(r - 1), d = -1/(r - 1).
    const s1 = 1;
    const s2 = 1 + r;
    const c = q(s2 - s1, r * r - r);
    return `${str(c)} * ${r}^n - ${str(c)}`;
  },
  misconceptions: ({ r }): Misconception[] => [
    { response: `(${r}^(n + 1) - 1)/${r - 1}`, why: t`The sum stops at ${math`${r}^{n - ${1}}`}, so it has ${mn} terms and the power in the formula is ${mn}.` },
    { response: `(${r}^n - 1)/${r}`, why: t`Subtracting ${math`S`} from ${math`${r}S`} leaves ${math`(${r} - ${1})S`}: divide by ${r - 1}.` },
  ],
});

interface MersP { m: number; n: number }

const mersenne = generator<MersP>({
  id: 'mersenne-factor',
  skill: 'Factor 2^k - 1 when k is composite, as in CST supervision exercise 4.2.1(b): 2^n - 1 divides 2^(mn) - 1.',
  params: (rng) => {
    const m = int(rng, 2, 5);
    return { m, n: int(rng, 2, 5) };
  },
  sane: ({ m, n }) => (m >= 2 && n >= 2 && m * n <= 25 ? null : 'out of range'),
  problem: ({ m, n }) => {
    const k = m * n;
    const N = 2 ** k - 1;
    return {
      prompt: t`${k} is not prime, since ${math`${k} = ${m} \times ${n}`}. Show that ${math`${2}^{${k}} - ${1} = ${N}`} is not prime: give a divisor ${math`d`} of it with ${math`${1} < d < ${N}`}.`,
      answer: {
        kind: 'witness', count: 1, names: ['d'], example: `d = ${2 ** n - 1}`,
        check: ([v]) => {
          const d = v !== undefined && v.den === 1n ? Number(v.num) : NaN;
          if (Number.isNaN(d)) return 'Give a whole number.';
          if (d <= 1 || d >= N) return `The divisor must be strictly between 1 and ${N}.`;
          return N % d === 0 ? null : `${d} does not divide ${N}.`;
        },
      },
      solution: [
        t`Use part (a) with ${math`x = ${2}^{${n}}`}: ${math`${2}^{${k}} - ${1} = (${2}^{${n}})^{${m}} - ${1} = (${2}^{${n}} - ${1})(${1} + ${2}^{${n}} + \cdots + ${2}^{${n * (m - 1)}})`}.`,
        t`So ${math`${2}^{${n}} - ${1} = ${2 ** n - 1}`} divides ${N}, and ${math`${1} < ${2 ** n - 1} < ${N}`}. (So does ${math`${2}^{${m}} - ${1} = ${2 ** m - 1}`}.)`,
      ],
    };
  },
  solve: ({ m, n }) => {
    const N = 2 ** (m * n) - 1;
    let d = 3;
    while (N % d !== 0) d += 2;
    return `d = ${d}`;
  },
  misconceptions: ({ m, n }): Misconception[] => [
    { response: `d = ${2 ** n}`, why: t`${math`${2}^{${n}}`} is even, and ${math`${2}^{${m * n}} - ${1}`} is odd. The factor is ${math`${2}^{${n}} - ${1}`}.` },
    { response: 'd = 1', why: t`Every number has the divisor ${1}. A number is composite when it has a divisor strictly between ${1} and itself.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const SW = 'cst-dm-sw1';
const SOLS = 'cst-dm-sols-2324-4';

const sw421a = auto({
  id: 'sw-4-2-1-a',
  source: cite(SW, 'Exercises 4, 4.2.1(a)', true),
  title: t`A sum of powers of ${math`${2}^{n}`}`,
  prompt: t`For positive integers ${math`m`} and ${mn}, find ${math`\sum_{i = ${0}}^{m - ${1}} ${2}^{i \cdot n}`} in closed form, in terms of ${math`m`} and ${mn}. (The exercise asks to establish ${math`(${2}^{n} - ${1}) \cdot \sum_{i = ${0}}^{m - ${1}} ${2}^{i \cdot n} = ${2}^{m \cdot n} - ${1}`}.)`,
  answer: { kind: 'expression', expected: '(2^(m n) - 1)/(2^n - 1)', variables: ['m', 'n'], domains: { m: { kind: 'integer', min: 1, max: 6 }, n: { kind: 'integer', min: 1, max: 6 } } },
  solution: [
    t`It is a geometric series with first term ${1} and ratio ${math`${2}^{n}`}, and ${math`m`} terms.`,
    t`As the official solution shows, no induction is needed: multiply by ${math`${2}^{n} - ${1}`} and the sum telescopes, ${dmath`(${2}^{n} - ${1})\sum_{i = ${0}}^{m - ${1}} ${2}^{i n} = \sum_{i = ${0}}^{m - ${1}} ${2}^{(i + ${1})n} - \sum_{i = ${0}}^{m - ${1}} ${2}^{i n} = ${2}^{m n} - ${2}^{${0}}.`}`,
    t`So ${math`\sum_{i = ${0}}^{m - ${1}} ${2}^{i n} = \frac{${2}^{m n} - ${1}}{${2}^{n} - ${1}}`}.`,
  ],
  reference: '(2^(m n) - 1)/(2^n - 1)',
  verify: () => {
    for (let m = 1; m <= 5; m++) for (let n = 1; n <= 5; n++) {
      const s = Array.from({ length: m }, (_, i) => 2 ** (i * n)).reduce((x, y) => x + y, 0);
      const e = same(`m = ${m}, n = ${n}`, s * (2 ** n - 1), 2 ** (m * n) - 1);
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [{ response: '(2^(m n) - 1)/(2^n)', why: t`Multiplying the sum by ${math`${2}^{n}`} and subtracting the sum leaves ${math`(${2}^{n} - ${1})`} times it. Divide by ${math`${2}^{n} - ${1}`}.` }],
  official: { source: cite(SOLS, '4.2.1(a)'), answer: '(2^(m n) - 1)/(2^n - 1)', agrees: true },
});

const K = 15;
const sw421b = auto({
  id: 'sw-4-2-1-b',
  source: cite(SW, 'Exercises 4, 4.2.1(b)', true),
  title: t`${math`${2}^{${K}} - ${1}`} is not prime`,
  prompt: t`Part (b): if ${math`k`} is a positive integer that is not prime, then ${math`${2}^{k} - ${1}`} is not prime. For ${math`k = ${K}`}, show it: give a divisor ${math`d`} of ${math`${2}^{${K}} - ${1} = ${2 ** K - 1}`} with ${math`${1} < d < ${2 ** K - 1}`}.`,
  answer: {
    kind: 'witness', count: 1, names: ['d'], example: `d = ${2 ** 3 - 1}`,
    check: ([v]) => {
      const N = 2 ** K - 1;
      const d = v !== undefined && v.den === 1n ? Number(v.num) : NaN;
      if (Number.isNaN(d) || d <= 1 || d >= N) return `Give a whole number strictly between 1 and ${N}.`;
      return N % d === 0 ? null : `${d} does not divide ${N}.`;
    },
  },
  solution: [
    t`${math`${K} = ${3} \times ${5}`}. By part (a) with ${math`n = ${3}`} and ${math`m = ${5}`}, ${math`${2}^{${K}} - ${1} = (${2}^{${3}} - ${1}) \sum_{i = ${0}}^{${4}} ${2}^{${3}i}`}.`,
    t`So ${math`${2}^{${3}} - ${1} = ${7}`} divides ${2 ** K - 1}: ${math`${2 ** K - 1} = ${7} \times ${(2 ** K - 1) / 7}`}. With ${math`n = ${5}`} instead, ${math`${2}^{${5}} - ${1} = ${31}`} is another divisor.`,
  ],
  reference: `d = ${2 ** 3 - 1}`,
  verify: () => {
    const N = 2 ** K - 1;
    return same('7 and 31 divide 2^15 - 1', N % 7 === 0 && N % 31 === 0, true);
  },
  misconceptions: [{ response: 'd = 8', why: t`${math`${2}^{${3}} = ${8}`} is even; ${math`${2}^{${K}} - ${1}`} is odd. Use ${math`${2}^{${3}} - ${1}`}.` }],
  official: { source: cite(SOLS, '4.2.1(b)'), answer: 'd = 7', agrees: true },
});

const bop105 = auto({
  id: 'bop-10-5',
  source: cite('bop', 'Chapter 10, exercise 5', true),
  title: t`Powers of ${2}`,
  prompt: t`Find ${math`${2}^{${1}} + ${2}^{${2}} + ${2}^{${3}} + \cdots + ${2}^{n}`} as a formula in ${mn}. (Book of Proof proves it by induction; here, use the geometric series.)`,
  answer: { kind: 'expression', expected: '2^(n + 1) - 2', variables: ['n'], domains: { n: { kind: 'integer', min: 1, max: 20 } } },
  solution: [t`First term ${2}, ratio ${2}, ${mn} terms: ${math`\frac{${2}(${2}^{n} - ${1})}{${2} - ${1}} = ${2}^{n + ${1}} - ${2}`}.`],
  reference: '2^(n + 1) - 2',
  verify: () => {
    for (let n = 1; n <= 20; n++) { const e = same(`n = ${n}`, Array.from({ length: n }, (_, i) => 2 ** (i + 1)).reduce((x, y) => x + y, 0), 2 ** (n + 1) - 2); if (e !== null) return e; }
    return null;
  },
  misconceptions: [{ response: '2^n - 1', why: t`That is ${math`${1} + ${2} + \cdots + ${2}^{n - ${1}}`}. This sum starts at ${math`${2}^{${1}}`} and ends at ${math`${2}^{n}`}.` }],
  official: { source: cite('bop', 'Solutions, Chapter 10, exercise 5'), answer: '2^(n + 1) - 2', agrees: true },
});

const sw421aProof = supervision({
  id: 'sw-4-2-1-a-proof',
  source: cite(SW, 'Exercises 4, 4.2.1(a)'),
  title: t`Establish the identity`,
  prompt: t`Establish: for all positive integers ${math`m`} and ${mn}, ${math`(${2}^{n} - ${1}) \cdot \sum_{i = ${0}}^{m - ${1}} ${2}^{i \cdot n} = ${2}^{m \cdot n} - ${1}`}. Give a direct proof by telescoping, and, once induction is taught, an inductive one.`,
  writeUp: 'proof',
  official: cite(SOLS, '4.2.1(a)'),
});
const sw421bProof = supervision({
  id: 'sw-4-2-1-b-proof',
  source: cite(SW, 'Exercises 4, 4.2.1(b)'),
  title: t`Composite exponents`,
  prompt: t`Suppose ${math`k`} is a positive integer that is not prime. Prove that ${math`${2}^{k} - ${1}`} is not prime. Take care with ${math`k = ${1}`}, which is not prime either.`,
  writeUp: 'proof',
  official: cite(SOLS, '4.2.1(b)'),
});

// ---------------------------------------------------------------- lesson

const EX = { a: 3, r: 2, n: 6 };

export const geometricSeries: TopicContent = {
  topicId: 'alg.geometric-series',
  goal: t`Sum a finite geometric series with the formula ${math`\frac{a(${1} - r^{n})}{${1} - r}`}, and use the telescoping trick behind it.`,
  lesson: [
    { kind: 'p', text: t`A geometric sequence multiplies by the same [[common-ratio|common ratio]] ${mr} each time: ${math`a, ar, ar^{${2}}, \ldots`}. Its ${mn}th term is ${math`ar^{n - ${1}}`}. For ${math`a = ${EX.a}`}, ${math`r = ${EX.r}`}: ${listOf([0, 1, 2, 3].map((i) => EX.a * EX.r ** i))}, and so on.` },
    { kind: 'p', text: t`To add ${mn} terms, ${math`S = a + ar + \cdots + ar^{n - ${1}}`}, multiply by ${mr} and subtract: ${math`rS = ar + \cdots + ar^{n - ${1}} + ar^{n}`}, and everything cancels except the ends, ${math`S - rS = a - ar^{n}`}.` },
    { kind: 'rule', text: t`For ${math`r \ne ${1}`}, the [[geometric-series|geometric series]] ${dmath`\sum_{i = ${0}}^{n - ${1}} ar^{i} = \frac{a(${1} - r^{n})}{${1} - r} = \frac{a(r^{n} - ${1})}{r - ${1}}.`} For ${math`r = ${1}`} the sum is just ${math`na`}.` },
    { kind: 'p', text: t`Example: ${math`${EX.a} + ${EX.a * EX.r} + \cdots + ${EX.a * EX.r ** (EX.n - 1)}`} has ${EX.n} terms, so the sum is ${math`\frac{${EX.a}(${EX.r}^{${EX.n}} - ${1})}{${EX.r} - ${1}} = ${(EX.a * (EX.r ** EX.n - 1)) / (EX.r - 1)}`}.` },
    { kind: 'p', text: t`The CST supervision exercise ${math`${4}.${2}.${1}`} uses this with ratio ${math`${2}^{n}`}: ${math`(${2}^{n} - ${1})\sum_{i = ${0}}^{m - ${1}} ${2}^{i n} = ${2}^{m n} - ${1}`}. Read as a factorisation, it says ${math`${2}^{n} - ${1}`} divides ${math`${2}^{m n} - ${1}`}. So if ${math`k = mn`} with ${math`m, n \ge ${2}`}, then ${math`${2}^{k} - ${1}`} is not prime: a prime of the form ${math`${2}^{k} - ${1}`}, a Mersenne prime, needs ${math`k`} prime.` },
  ],
  examples: [
    workedCambridge(sw421a),
    worked(sumGp, { a: 1, r: q(1, 2), n: 6 }, t`Halving each time`),
    worked(mersenne, { m: 2, n: 3 }, t`${math`${2}^{${6}} - ${1}`} is not prime`),
  ],
  generators: [sumGp, nthTerm, closed, mersenne],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['geometric-series', 'common-ratio'],
  cambridge: [sw421b, bop105, sw421aProof, sw421bProof],
  gate: ['sw-4-2-1-b', 'sw-4-2-1-a-proof', 'sw-4-2-1-b-proof'],
};
