/**
 * num.extended-euclid: run Euclid's algorithm keeping each remainder as an integer linear
 * combination of the inputs, so that gcd(m, n) = s m + t n. The lesson follows the CST
 * notes (printed pages 245 to 258: Example 87, egcd(34, 13) by back-substitution; the
 * remark that s m + t n = r gives all (s + k n, t - k m); Theorem 88; egcd in ML and
 * Example 90; Theorem 92, the gcd is the least positive linear combination) and Book of
 * Proof Proposition 7.1 (the same fact from the well-ordering principle). The problems are
 * supervision exercises 3.1.4 and 3.1.5 with their 2023-24 official solutions.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { int, pick, sample } from '../math';
import { egcd, gcd } from '../numbers';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { computedTex, join, math, paren, t, type Span } from '../rich';
import { worked, workedCambridge, type TopicContent } from '../topic';

const [mm, mn] = [math`m`, math`n`];
const big = (v: { num: bigint; den: bigint } | undefined): number | null => (v === undefined || v.den !== 1n ? null : Number(v.num));
const comb = (a: number, x: number, b: number, y: number): Span => math`${a} \times ${paren(x)} + ${b} \times ${paren(y)}`;

/** The rows of the notes' egcd: ((s, t), r) with s m + t n = r, until the remainder is 0. */
function egcdRows(m: number, n: number): [number, number, number][] {
  const rows: [number, number, number][] = [[1, 0, m], [0, 1, n]];
  for (;;) {
    const [s1, t1, r1] = rows.at(-2) as [number, number, number];
    const [s2, t2, r2] = rows.at(-1) as [number, number, number];
    const q = Math.floor(r1 / r2);
    const r = r1 - q * r2;
    if (r === 0) return rows;
    rows.push([s1 - q * s2, t1 - q * t2, r]);
  }
}
const rowsTex = (m: number, n: number): Span => computedTex(egcdRows(m, n).map(([s, t, r]) => `${r} = ${s} \\cdot ${m} ${t < 0 ? '-' : '+'} ${Math.abs(t)} \\cdot ${n}`).join(',\\quad '));

// ---------------------------------------------------------------- Bezout coefficients

interface BezP { a: number; b: number }

const bezout = generator<BezP>({
  id: 'bezout',
  skill: 'Run the extended Euclidean algorithm to write gcd(a, b) as a x + b y with integers x and y.',
  params: (rng) => {
    for (;;) {
      const g = pick(rng, [1, 1, 2, 3, 4, 5, 6]);
      const [x, y] = [int(rng, 5, 60), int(rng, 3, 50)];
      if (x > y && gcd(x, y) === 1) return { a: g * x, b: g * y };
    }
  },
  sane: ({ a, b }) => (a > b && b >= 3 ? null : 'out of range'),
  problem: ({ a, b }) => {
    const { s, t: tt, g } = egcd(a, b);
    return {
      prompt: t`Find integers ${math`x`} and ${math`y`} with ${math`${a}x + ${b}y = \gcd(${a}, ${b})`}.`,
      answer: {
        kind: 'witness', count: 2, names: ['x', 'y'], example: `x = ${s}, y = ${tt}`,
        check: ([vx, vy]) => {
          const [x, y] = [big(vx), big(vy)];
          if (x === null || y === null) return 'Give two integers.';
          const v = a * x + b * y;
          return v === g ? null : `${a} × ${x} + ${b} × ${y} is ${v}, not gcd(${a}, ${b}) = ${g}.`;
        },
      },
      solution: [
        t`Run Euclid's algorithm, keeping each remainder as a combination of ${a} and ${b}: ${math`${rowsTex(a, b)}`}.`,
        t`The last nonzero remainder is ${math`\gcd(${a}, ${b}) = ${g}`}, and its row gives ${math`x = ${s}`}, ${math`y = ${tt}`}: ${math`${comb(a, s, b, tt)} = ${g}`}. Any ${math`(x + k \tfrac{${b}}{${g}}, y - k \tfrac{${a}}{${g}})`} works too.`,
      ],
    };
  },
  solve: ({ a, b }) => {
    // Search y from -a to a for one that makes gcd - b y a multiple of a.
    const g = gcd(a, b);
    for (let y = -a; y <= a; y++) if ((g - b * y) % a === 0) return `x = ${(g - b * y) / a}, y = ${y}`;
    return 'none';
  },
  misconceptions: ({ a, b }): Misconception[] => {
    const { s, t: tt } = egcd(a, b);
    return [
      { response: `x = ${-s}, y = ${-tt}`, why: t`Those signs give ${math`-\gcd`}. Keep the signs from the back-substitution.` },
      { response: `x = ${s + 1}, y = ${tt}`, why: t`Check the arithmetic: ${comb(a, s + 1, b, tt)} is not the gcd.` },
      { response: `x = ${tt}, y = ${s}`, why: t`The coefficients are swapped: ${math`x`} goes with ${a} and ${math`y`} with ${b}.` },
    ];
  },
});

// ---------------------------------------------------------------- another solution in a range

interface ShiftP { a: number; b: number }

const shiftSolution = generator<ShiftP>({
  id: 'shift-solution',
  skill: 'From one solution of a x + b y = g, find another with y in a given range, using (x + k b/g, y - k a/g), as in exercise 3.1.4.',
  params: (rng) => {
    for (;;) {
      const g = pick(rng, [1, 2, 3, 4]);
      const [x, y] = [int(rng, 5, 40), int(rng, 3, 30)];
      if (x > y && gcd(x, y) === 1) {
        const { t: tt } = egcd(g * x, g * y);
        if (tt < 0 || tt >= g * x) return { a: g * x, b: g * y };
      }
    }
  },
  sane: ({ a, b }) => (a > b ? null : 'out of range'),
  problem: ({ a, b }) => {
    const { s, t: tt, g } = egcd(a, b);
    const k = Math.floor(tt / (a / g));
    const [x2, y2] = [s + k * (b / g), tt - k * (a / g)];
    return {
      prompt: t`One solution of ${math`${a}x + ${b}y = ${g}`} is ${math`x = ${s}`}, ${math`y = ${tt}`}. Find a solution with ${math`${0} \le y < ${a}`}.`,
      answer: {
        kind: 'witness', count: 2, names: ['x', 'y'], example: `x = ${x2}, y = ${y2}`,
        check: ([vx, vy]) => {
          const [x, y] = [big(vx), big(vy)];
          if (x === null || y === null) return 'Give two integers.';
          if (a * x + b * y !== g) return `${a} × ${x} + ${b} × ${y} is ${a * x + b * y}, not ${g}.`;
          return y >= 0 && y < a ? null : `y = ${y} is not in the range from 0 to ${a - 1}.`;
        },
      },
      solution: [
        t`Adding ${math`k \cdot \frac{${b}}{${g}}`} to ${math`x`} and subtracting ${math`k \cdot \frac{${a}}{${g}}`} from ${math`y`} keeps the sum: ${math`${a} \cdot \frac{${b}}{${g}} = ${b} \cdot \frac{${a}}{${g}}`}.`,
        t`With ${math`k = ${k}`}: ${math`x = ${s} + ${paren(k)} \times ${b / g} = ${x2}`} and ${math`y = ${tt} - ${paren(k)} \times ${a / g} = ${y2}`}. Check: ${math`${comb(a, x2, b, y2)} = ${g}`}.`,
      ],
    };
  },
  solve: ({ a, b }) => {
    const g = gcd(a, b);
    for (let y = 0; y < a; y++) if ((g - b * y) % a === 0) return `x = ${(g - b * y) / a}, y = ${y}`;
    return 'none';
  },
  misconceptions: ({ a, b }): Misconception[] => {
    const { s, t: tt, g } = egcd(a, b);
    return [
      { response: `x = ${s}, y = ${tt}`, why: t`That is the given solution, but its ${math`y`} is not in the range from ${0} to ${a - 1}.` },
      { response: `x = ${s - b / g}, y = ${tt - a / g}`, why: t`The two shifts go in opposite directions: if ${math`x`} goes down by ${b / g}, ${math`y`} must go up by ${a / g}.` },
    ];
  },
});

// ---------------------------------------------------------------- which numbers are combinations

interface WhichP { a: number; b: number; cs: readonly number[] }
const nonneg = (a: number, b: number, c: number): boolean => { for (let x = 0; x * a <= c; x++) if ((c - x * a) % b === 0) return true; return false; };

const whichCombinations = generator<WhichP>({
  id: 'which-combinations',
  skill: 'Decide which numbers are integer combinations a x + b y: exactly the multiples of gcd(a, b), with negative coefficients allowed (Theorem 92).',
  params: (rng) => {
    for (;;) {
      const g = pick(rng, [2, 3, 4, 5, 6]);
      const [x, y] = [int(rng, 3, 9), int(rng, 2, 8)];
      if (x <= y || gcd(x, y) !== 1) continue;
      const [a, b] = [g * x, g * y];
      const pool = [g, 2 * g, g * int(rng, 3, 7), g * int(rng, 8, 20) + int(rng, 1, g - 1), g * int(rng, 1, 6) + int(rng, 1, g - 1), a + b, a - b];
      const cs = sample(rng, [...new Set(pool.filter((c) => c > 0))], 5);
      const right = cs.map((c) => c % g === 0).join();
      if (cs.map((c) => nonneg(a, b, c)).join() !== right && cs.map((c) => c % a === 0 || c % b === 0).join() !== right) return { a, b, cs };
    }
  },
  sane: ({ cs }) => (cs.length === 5 ? null : 'out of range'),
  problem: ({ a, b, cs }) => {
    const g = gcd(a, b);
    const options: ChoiceOption[] = cs.map((c, i) => ({ id: `c${i}`, label: [math`${c}`] }));
    return {
      prompt: t`Which of ${join(cs.map((c) => [math`${c}`]), ', ')} can be written as ${math`${a}x + ${b}y`} with integers ${math`x`} and ${math`y`} (negative allowed)? Choose all that can.`,
      answer: { kind: 'choice', options, correct: cs.flatMap((c, i) => (c % g === 0 ? [`c${i}`] : [])) },
      solution: [
        t`${math`\gcd(${a}, ${b}) = ${g}`} divides every combination, so only multiples of ${g} can be combinations.`,
        t`Every multiple of ${g} is one: the extended algorithm gives ${math`${comb(a, egcd(a, b).s, b, egcd(a, b).t)} = ${g}`}, and multiplying by ${math`c / ${g}`} gives ${math`c`}. So the answers are the multiples of ${g}.`,
      ],
    };
  },
  solve: ({ a, b, cs }) => cs.flatMap((c, i) => {
    // Search a window of coefficients.
    for (let x = -60; x <= 60; x++) if ((c - a * x) % b === 0) return [`c${i}`];
    return [];
  }),
  misconceptions: ({ a, b, cs }): Misconception[] => [
    { response: cs.flatMap((c, i) => (nonneg(a, b, c) ? [`c${i}`] : [])), why: t`Negative coefficients are allowed: ${math`${a}x + ${b}y`} with ${math`x`} or ${math`y`} negative can make small numbers such as ${gcd(a, b)}.` },
    { response: cs.flatMap((c, i) => (c % a === 0 || c % b === 0 ? [`c${i}`] : [])), why: t`Combinations mix both numbers: every multiple of ${math`\gcd(${a}, ${b}) = ${gcd(a, b)}`} is one, not only multiples of ${a} or ${b}.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const notes87 = auto({
  id: 'notes-246-example-87',
  source: cite('cst-dm-notes', 'printed pages 245 and 246, Example 87'),
  title: t`${math`\gcd(${34}, ${13})`} as a combination`,
  prompt: t`Example ${87} of the notes: write ${math`\gcd(${34}, ${13}) = ${1}`} as ${math`${34}x + ${13}y`}, by working back through Euclid's algorithm.`,
  answer: {
    kind: 'witness', count: 2, names: ['x', 'y'], example: 'x = 5, y = -13',
    check: ([vx, vy]) => {
      const [x, y] = [big(vx), big(vy)];
      if (x === null || y === null) return 'Give two integers.';
      return 34 * x + 13 * y === 1 ? null : `34 × ${x} + 13 × ${y} is ${34 * x + 13 * y}, not 1.`;
    },
  },
  solution: [
    t`Each remainder as a combination of ${34} and ${13}: ${math`${8} = ${34} - ${2} \cdot ${13}`}, ${math`${5} = ${13} - ${8} = -${34} + ${3} \cdot ${13}`}, ${math`${3} = ${8} - ${5} = ${2} \cdot ${34} - ${5} \cdot ${13}`}, ${math`${2} = ${5} - ${3} = -${3} \cdot ${34} + ${8} \cdot ${13}`}.`,
    t`Finally ${math`${1} = ${3} - ${2} = ${5} \cdot ${34} - ${13} \cdot ${13}`}: ${math`x = ${5}`}, ${math`y = -${13}`}.`,
  ],
  reference: 'x = 5, y = -13',
  verify: () => same('the notes\' egcd', [egcd(34, 13).s, egcd(34, 13).t, egcd(34, 13).g].join(), '5,-13,1'),
  misconceptions: [{ response: 'x = -13, y = 5', why: t`That is the pair for ${math`${13}x + ${34}y`} (Example ${90}): the coefficients follow their numbers.` }],
  official: { source: cite('cst-dm-notes', 'printed page 245, Example 87'), answer: 'x = 5, y = -13', agrees: true },
});

const sheet314a = auto({
  id: 'sheet-3-1-4-a',
  source: cite('cst-dm-sw1', 'Exercises 3, 3.1.4'),
  title: t`${math`x \cdot ${30} + y \cdot ${22} = \gcd(${30}, ${22})`}`,
  prompt: t`Find integers ${math`x`} and ${math`y`} such that ${math`x \cdot ${30} + y \cdot ${22} = \gcd(${30}, ${22})`}.`,
  answer: {
    kind: 'witness', count: 2, names: ['x', 'y'], example: 'x = 3, y = -4',
    check: ([vx, vy]) => {
      const [x, y] = [big(vx), big(vy)];
      if (x === null || y === null) return 'Give two integers.';
      return 30 * x + 22 * y === 2 ? null : `${x} × 30 + ${y} × 22 is ${30 * x + 22 * y}, not gcd(30, 22) = 2.`;
    },
  },
  solution: [t`${math`\gcd(${30}, ${22}) = ${2}`}: ${math`${8} = ${30} - ${22}`}, ${math`${6} = ${22} - ${2} \cdot ${8} = ${3} \cdot ${22} - ${2} \cdot ${30}`}, ${math`${2} = ${8} - ${6} = ${3} \cdot ${30} - ${4} \cdot ${22}`}. So ${math`x = ${3}`}, ${math`y = -${4}`}, as in the official solution.`],
  reference: 'x = 3, y = -4',
  verify: () => same('egcd(30, 22)', [egcd(30, 22).s, egcd(30, 22).t, egcd(30, 22).g].join(), '3,-4,2'),
  misconceptions: [{ response: 'x = -3, y = 4', why: t`That gives ${math`-${2}`}. Keep the signs from the back-substitution.` }],
  official: { source: cite('cst-dm-sols-2324-3', '3.1.4'), answer: 'x = 3, y = -4', agrees: true },
});

const sheet314b = auto({
  id: 'sheet-3-1-4-b',
  source: cite('cst-dm-sw1', 'Exercises 3, 3.1.4'),
  title: t`A solution with ${math`${0} \le y' < ${30}`}`,
  prompt: t`Now find integers ${math`x'`} and ${math`y'`} with ${math`${0} \le y' < ${30}`} such that ${math`x' \cdot ${30} + y' \cdot ${22} = \gcd(${30}, ${22})`}.`,
  answer: {
    kind: 'witness', count: 2, names: ["x'", "y'"], example: "x' = -8, y' = 11",
    check: ([vx, vy]) => {
      const [x, y] = [big(vx), big(vy)];
      if (x === null || y === null) return 'Give two integers.';
      if (30 * x + 22 * y !== 2) return `${x} × 30 + ${y} × 22 is ${30 * x + 22 * y}, not 2.`;
      return y >= 0 && y < 30 ? null : `y' = ${y} is not between 0 and 29.`;
    },
  },
  solution: [
    t`From ${math`(${3}, -${4})`}, the official solution uses ${math`(x + ${11}l) \cdot ${30} + (y - ${15}l) \cdot ${22} = ${2}`} for every integer ${math`l`}: ${math`${11} = ${22} / ${2}`} and ${math`${15} = ${30} / ${2}`}.`,
    t`${math`l = -${1}`} gives ${math`(-${8}, ${11})`} and ${math`l = -${2}`} gives ${math`(-${19}, ${26})`}; both have ${math`${0} \le y' < ${30}`}.`,
  ],
  reference: "x' = -8, y' = 11",
  verify: () => same('every y from 0 to 29 that works', Array.from({ length: 30 }, (_, y) => y).filter((y) => (2 - 22 * y) % 30 === 0).join(), '11,26'),
  misconceptions: [{ response: "x' = 3, y' = -4", why: t`That solves the equation, but ${math`y' = -${4}`} is negative.` }],
  official: { source: cite('cst-dm-sols-2324-3', '3.1.4'), answer: "x' = -8, y' = 11", agrees: true },
});

const notes90 = auto({
  id: 'notes-255-example-90',
  source: cite('cst-dm-notes', 'printed page 255, Example 90'),
  title: t`The notes' ${math`\mathrm{egcd}(${13}, ${34})`}`,
  prompt: t`The notes' ${math`\mathrm{egcd}`} starts from ${math`((${1}, ${0}), m)`} and ${math`((${0}, ${1}), n)`} and repeatedly replaces the older pair by the older minus ${math`q`} times the newer, until the remainder is ${0}. What does ${math`\mathrm{egcd}(${13}, ${34})`} return: the coefficients ${math`(s, t)`} with ${math`s \cdot ${13} + t \cdot ${34} = ${1}`}?`,
  answer: { kind: 'table', cell: 'exact', columns: [t`coefficient`, t`value`], rows: [[t`${math`s`}`, null], [t`${math`t`}`, null]], expected: [String(egcd(13, 34).s), String(egcd(13, 34).t)] },
  solution: [
    t`The rows ${math`((s, t), r)`} are ${math`${rowsTex(13, 34)}`}.`,
    t`The next remainder would be ${0}, so it returns ${math`((${egcd(13, 34).s}, ${egcd(13, 34).t}), ${1})`}, matching Example ${87} with the roles swapped (Proposition ${91}).`,
  ],
  reference: [String(egcd(13, 34).s), String(egcd(13, 34).t)],
  verify: () => same('13 s + 34 t', 13 * egcd(13, 34).s + 34 * egcd(13, 34).t, 1),
  misconceptions: [{ response: ['5', '-13'], why: t`That is ${math`\mathrm{egcd}(${34}, ${13})`}. With the arguments in this order, ${math`s`} goes with ${13}.` }],
  official: { source: cite('cst-dm-notes', 'printed page 255, Example 90'), answer: ['-13', '5'], agrees: true },
});

const sheet315 = supervision({
  id: 'sheet-3-1-5',
  source: cite('cst-dm-sw1', 'Exercises 3, 3.1.5'),
  title: t`One as a combination`,
  prompt: t`Prove that for all positive integers ${mm} and ${mn}, there exist integers ${math`k`} and ${math`l`} with ${math`k m + l n = ${1}`} if and only if ${math`\gcd(m, n) = ${1}`}. Which direction needs the extended algorithm?`,
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-3', '3.1.5'),
});
const bop71 = supervision({
  id: 'bop-7-4-proposition-7-1',
  source: cite('bop', 'Section 7.4, Proposition 7.1'),
  title: t`The gcd is the least positive combination`,
  prompt: t`Book of Proof proves ${math`\gcd(a, b) = ak + b\ell`} for some integers by taking ${math`d`}, the smallest positive element of ${math`\{ax + by : x, y \in \mathbb{Z}\}`}, and showing ${math`d \mid a`} with the division algorithm. Write out that proof, and explain how it differs from the CST notes' proof of Theorem ${92}, which uses the extended algorithm.`,
  writeUp: 'proof',
});
const allCombos = supervision({
  id: 'notes-249-all-combinations',
  source: cite('cst-dm-notes', 'printed page 249, the remark on linear combinations'),
  title: t`Every solution`,
  prompt: t`The notes remark that ${math`s m + t n = r`} implies ${math`(s + kn) m + (t - km) n = r`} for every integer ${math`k`}. Prove that when ${math`\gcd(m, n) = ${1}`} these are all the solutions: if ${math`s'm + t'n = r`} too, then ${math`s' = s + kn`} for some ${math`k`}. Where do you use coprimality?`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

export const extendedEuclid: TopicContent = {
  topicId: 'num.extended-euclid',
  goal: t`Run the extended Euclidean algorithm to write ${math`\gcd(m, n) = sm + tn`}, find all such pairs, and use that the combinations of ${mm} and ${mn} are exactly the multiples of the gcd.`,
  lesson: [
    { kind: 'p', text: t`Every remainder in Euclid's algorithm is ${math`r = r_{${1}} - q r_{${2}}`}, built from the two before. Starting from ${math`m = ${1} \cdot m + ${0} \cdot n`} and ${math`n = ${0} \cdot m + ${1} \cdot n`}, each remainder, and so the gcd, is an integer [[linear-combination|linear combination]] of ${mm} and ${mn}.` },
    { kind: 'rule', text: t`Theorem ${88}: ${math`\gcd(m, n) = s m + t n`} for integers ${math`s, t`}, which the [[extended-euclid|extended Euclidean algorithm]] computes by carrying the coefficients ${math`(s, t)`} along with each remainder.` },
    { kind: 'p', text: t`Example ${87}: ${math`\gcd(${34}, ${13})`}. The rows ${math`((s, t), r)`}: ${math`${rowsTex(34, 13)}`}. So ${math`${1} = ${5} \cdot ${34} - ${13} \cdot ${13}`}. Working back from the bottom by substitution gives the same pair.` },
    { kind: 'p', text: t`The pair is not unique: ${math`(s + kn, t - km)`} works for every ${math`k`}. With ${math`\gcd = g`}, steps of ${math`n / g`} and ${math`m / g`} suffice: exercise ${3}.${1}.${4} moves ${math`${3} \cdot ${30} - ${4} \cdot ${22} = ${2}`} to ${math`-${8} \cdot ${30} + ${11} \cdot ${22} = ${2}`}.` },
    { kind: 'p', text: t`Theorem ${92}: ${math`\gcd(m, n)`} is the least positive combination. Every combination is a multiple of the gcd (the gcd divides both terms), and the gcd is one. So ${math`${30}x + ${22}y`} takes exactly the even values, and ${math`km + ln = ${1}`} is possible exactly when ${mm} and ${mn} are coprime.` },
  ],
  examples: [
    workedCambridge(notes87),
    worked(bezout, { a: 240, b: 46 }, t`${math`\gcd(${240}, ${46})`} as a combination`),
    worked(shiftSolution, { a: 35, b: 15 }, t`Moving a solution into range`),
  ],
  generators: [bezout, shiftSolution, whichCombinations],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['linear-combination', 'extended-euclid'],
  cambridge: [sheet314a, sheet314b, notes90, sheet315, bop71, allCombos],
};
