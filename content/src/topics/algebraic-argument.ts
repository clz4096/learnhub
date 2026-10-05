/**
 * pre.algebraic-argument: Even, odd, and consecutive integers as 2k, 2k + 1, and n, n + 1,
 * and algebra that shows a claim for all of them. From STEP Support Assignment 12, Q1 (the
 * warm-up: products of consecutive integers; n - 1 = 3k, so n³ - 1 is a multiple of 9) and
 * Book of Proof Sections 4.1 to 4.5 with Chapter 4, exercises 1 to 5 (parity by direct
 * proof), checked against the hints and the book's solutions to odd exercises.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { gcd, int, pick, upTo } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { poly } from '../poly';
import { computedMath as cm, dmath, math, t, type Rich } from '../rich';
import { worked, workedCambridge, workedProof, type TopicContent } from '../topic';

const [mk, mn] = [math`k`, math`n`];
const KINT = { k: { kind: 'integer' as const, min: -20, max: 20 } };

/** Evaluates a polynomial (highest power first) at x. */
const at = (coeffs: readonly number[], x: number): number => coeffs.reduce((acc, c) => acc * x + c, 0);
const mod2 = (x: number): number => ((x % 2) + 2) % 2;

// ---------------------------------------------------------------- generators

interface TwoMP { a: number; b: number; r: 0 | 1 }

/** n² + an + b with n = 2k + r, written 2m + s: the coefficients of m in k, and s. */
function twoM({ a, b, r }: TwoMP): { m: number[]; s: number; full: number[] } {
  const c0 = r * r + a * r + b;
  const s = mod2(c0);
  return { m: [2, 2 * r + a, (c0 - s) / 2], s, full: [4, 4 * r + 2 * a, c0] };
}

const writeTwoM = generator<TwoMP>({
  id: 'write-2m',
  skill: 'Substitute n = 2k or n = 2k + 1 and write the result as 2m or 2m + 1, as in Book of Proof Chapter 4, exercise 3.',
  params: (rng) => ({ a: int(rng, -5, 5), b: int(rng, -5, 9), r: rng() < 0.5 ? 0 : 1 }),
  sane: ({ a, b }) => (a >= -5 && a <= 5 && b >= -5 && b <= 9 ? null : 'out of range'),
  problem: (p) => {
    const { a, b, r } = p;
    const f = poly([1, a, b], 'n');
    const { m, s, full } = twoM(p);
    const form = s === 0 ? math`${2}m` : math`${2}m + ${1}`;
    return {
      prompt: t`${mn} is ${r === 0 ? 'even' : 'odd'}, so ${r === 0 ? math`n = ${2}k` : math`n = ${2}k + ${1}`} for some integer ${mk}. Write ${cm(f)} in the form ${form} with ${math`m`} an integer: what is ${math`m`}, in terms of ${mk}?`,
      answer: { kind: 'expression', expected: poly(m, 'k'), variables: ['k'], domains: KINT },
      solution: [
        t`Substitute and expand: ${math`${cm(f.replace(/n/g, r === 0 ? `(${2}k)` : `(${2}k + ${1})`))} = ${cm(poly(full, 'k'))}`}.`,
        t`Take out a ${2} from everything but the remainder ${s}: ${math`${cm(poly(full, 'k'))} = ${2}(${cm(poly(m, 'k'))})${s === 0 ? '' : math` + ${1}`}`}.`,
        t`So ${math`m = ${cm(poly(m, 'k'))}`}, an integer because ${mk} is, and ${cm(f)} is ${s === 0 ? 'even' : 'odd'}.`,
      ],
    };
  },
  solve: (p) => {
    // Recover m's coefficients from values: m(k) = (f(2k + r) - s) / 2 at k = 0, 1, 2, then fit a quadratic.
    const { a, b, r } = p;
    const f = (n: number): number => n * n + a * n + b;
    const s = mod2(f(r));
    const [y0, y1, y2] = [0, 1, 2].map((k) => (f(2 * k + r) - s) / 2) as [number, number, number];
    const A = (y2 - 2 * y1 + y0) / 2;
    const B = y1 - y0 - A;
    return poly([A, B, y0], 'k');
  },
  misconceptions: (p): Misconception[] => {
    const { a, b, r } = p;
    const { full, s } = twoM(p);
    // The slip of squaring 2k + r as 4k² + r² (or 2k as 2k²).
    const slip = r === 1 ? [4, 2 * a, 1 + a + b] : [2, 2 * a, b];
    const ss = mod2(slip[2] as number);
    return [
      { response: poly([full[0] as number, full[1] as number, (full[2] as number) - s], 'k'), why: t`That is ${math`${2}m`}, not ${math`m`}. Take the factor ${2} out of every term.` },
      { response: poly([(slip[0] as number) / 2, (slip[1] as number) / 2, ((slip[2] as number) - ss) / 2], 'k'), why: r === 1 ? t`${math`(${2}k + ${1})^{${2}} = ${4}k^{${2}} + ${4}k + ${1}`}: the middle term ${math`${4}k`} is easy to lose.` : t`${math`(${2}k)^{${2}} = ${4}k^{${2}}`}: the ${2} is squared too.` },
    ];
  },
});

interface DivP { i: number }
/** Expressions in n that are divisible by a fixed number for every positive integer n, each with the common slip. */
const DIVIDES: readonly { show: Rich; f: (n: number) => number; slip: number; why: Rich; factored: Rich }[] = [
  { show: [math`n(n + ${1})(n + ${2})`], f: (n) => n * (n + 1) * (n + 2), slip: 3, why: t`Three consecutive integers include a multiple of ${3}, and also at least one even number: the product is divisible by ${6}.`, factored: [math`n(n + ${1})(n + ${2})`] },
  { show: [math`n(n + ${1})(n + ${2})(n + ${3})`], f: (n) => n * (n + 1) * (n + 2) * (n + 3), slip: 12, why: t`Four consecutive integers include two even numbers, one of them a multiple of ${4}: that gives ${8}, not ${4}, besides the ${3}.`, factored: [math`n(n + ${1})(n + ${2})(n + ${3})`] },
  { show: [math`n^{${3}} - n`], f: (n) => n ** 3 - n, slip: 3, why: t`${math`n^{${3}} - n = (n - ${1})n(n + ${1})`} is three consecutive integers: divisible by ${3} and by ${2}.`, factored: [math`(n - ${1})n(n + ${1})`] },
  { show: [math`n^{${5}} - n^{${3}}`], f: (n) => n ** 5 - n ** 3, slip: 6, why: t`${math`n^{${3}}(n - ${1})(n + ${1})`} has the ${6} of three consecutive integers, and more twos: if ${mn} is even, ${math`n^{${3}}`} gives ${8}; if odd, ${math`n - ${1}`} and ${math`n + ${1}`} are consecutive even numbers, which give ${8}.`, factored: [math`n^{${3}}(n - ${1})(n + ${1})`] },
  { show: [math`n^{${5}} - n`], f: (n) => n ** 5 - n, slip: 6, why: t`Besides the ${6} from ${math`(n - ${1})n(n + ${1})`}, check ${5}: ${math`n^{${5}} - n`} is a multiple of ${5} for every ${mn}.`, factored: [math`n(n - ${1})(n + ${1})(n^{${2}} + ${1})`] },
  { show: [math`n^{${2}}(n^{${2}} - ${1})`], f: (n) => n * n * (n * n - 1), slip: 6, why: t`${math`(n - ${1})n(n + ${1})`} gives ${6}, and the extra ${mn} gives another ${2}: when ${mn} is even it is a factor twice, and when ${mn} is odd, ${math`n^{${2}} - ${1}`} is a multiple of ${8}.`, factored: [math`n^{${2}}(n - ${1})(n + ${1})`] },
  { show: [math`n(n + ${1})(${2}n + ${1})`], f: (n) => n * (n + 1) * (2 * n + 1), slip: 2, why: t`Check ${3} too: if ${mn} leaves remainder ${1} on division by ${3}, then ${math`${2}n + ${1}`} is a multiple of ${3}.`, factored: [math`n(n + ${1})(${2}n + ${1})`] },
];

/** The largest number dividing f(n) for every n in 1..60. */
const alwaysDivides = (f: (n: number) => number): number => upTo(60).reduce((g, n) => gcd(g, f(n)), 0);

const divides = generator<DivP>({
  id: 'always-divides',
  skill: 'Find the largest number that divides an expression for every positive integer n, by factorising into consecutive integers, as in STEP Support Assignment 12, Q1.',
  params: (rng) => ({ i: int(rng, 0, DIVIDES.length - 1) }),
  // No larger number divides it: the values at n = 1 and n = 2 already have greatest common divisor g.
  sane: ({ i }) => {
    const d = DIVIDES[i];
    return d !== undefined && gcd(d.f(1), d.f(2)) === alwaysDivides(d.f) ? null : 'out of range';
  },
  problem: ({ i }) => {
    const d = DIVIDES[i] as (typeof DIVIDES)[number];
    const g = alwaysDivides(d.f);
    return {
      prompt: t`What is the largest whole number that divides ${d.show} for every positive integer ${mn}?`,
      answer: { kind: 'exact', expected: String(g) },
      solution: [
        t`Factorise: ${d.show} is ${d.factored}.`,
        d.why,
        t`So ${g} always divides it. No larger number does: at ${math`n = ${1}`} it is ${d.f(1)} and at ${math`n = ${2}`} it is ${d.f(2)}, and ${math`\gcd(${d.f(1)}, ${d.f(2)}) = ${gcd(d.f(1), d.f(2))}`}.`,
      ],
    };
  },
  solve: ({ i }) => String(alwaysDivides((DIVIDES[i] as (typeof DIVIDES)[number]).f)),
  misconceptions: ({ i }): Misconception[] => {
    const d = DIVIDES[i] as (typeof DIVIDES)[number];
    return [
      { response: String(d.slip), why: d.why },
      { response: String(d.f(3)), why: t`That is its value at ${math`n = ${3}`}. The question asks for a number dividing it for every ${mn}.` },
    ];
  },
});

type Cond = 'even' | 'odd' | 'any';
interface ParP { a: number; b: number; c: Cond }

const PARITY: readonly ChoiceOption[] = [
  { id: 'even', label: t`Always even` },
  { id: 'odd', label: t`Always odd` },
  { id: 'depends', label: t`It depends on ${mn}` },
];

function parityOf({ a, b, c }: ParP, ns: readonly number[]): 'even' | 'odd' | 'depends' {
  const vals = new Set(ns.filter((n) => (c === 'any' ? true : c === 'even' ? mod2(n) === 0 : mod2(n) === 1)).map((n) => mod2(n * n + a * n + b)));
  return vals.size === 2 ? 'depends' : vals.has(0) ? 'even' : 'odd';
}

const parity = generator<ParP>({
  id: 'parity',
  skill: 'Decide the parity of n² + an + b for even, odd, or any integer n by substituting 2k or 2k + 1.',
  params: (rng) => ({ a: int(rng, -4, 5), b: int(rng, -3, 8), c: pick(rng, ['even', 'odd', 'any'] as const) }),
  sane: ({ a, b }) => (a >= -4 && a <= 5 && b >= -3 && b <= 8 ? null : 'out of range'),
  problem: (p) => {
    const { a, b, c } = p;
    const f = poly([1, a, b], 'n');
    const ans = parityOf(p, upTo(10).map((x) => x - 5));
    const evenCase = twoM({ a, b, r: 0 });
    const oddCase = twoM({ a, b, r: 1 });
    const line = (r: 0 | 1, x: { m: number[]; s: number }): Rich => t`With ${r === 0 ? math`n = ${2}k` : math`n = ${2}k + ${1}`}: ${math`${cm(f)} = ${2}(${cm(poly(x.m, 'k'))})${x.s === 0 ? '' : math` + ${1}`}`}, which is ${x.s === 0 ? 'even' : 'odd'}.`;
    return {
      prompt: c === 'any'
        ? t`${mn} is an integer. Is ${cm(f)} even or odd?`
        : t`${mn} is an ${c} integer. Is ${cm(f)} even or odd?`,
      answer: { kind: 'choice', options: PARITY, correct: ans },
      solution: c === 'even' ? [line(0, evenCase)] : c === 'odd' ? [line(1, oddCase)] : [
        line(0, evenCase), line(1, oddCase),
        ans === 'depends' ? t`The two cases differ, so it depends on ${mn}.` : t`Both cases agree: it is always ${ans}.`,
      ],
    };
  },
  solve: (p) => [parityOf(p, upTo(41).map((x) => x - 21))],
  misconceptions: (p): Misconception[] => {
    const ans = parityOf(p, upTo(41).map((x) => x - 21));
    const allowed = upTo(9).map((x) => x - 1).filter((n) => (p.c === 'any' ? true : p.c === 'even' ? mod2(n) === 0 : mod2(n) === 1));
    return PARITY.filter((o) => o.id !== ans).map((o) => {
      if (o.id === 'depends') return { response: [o.id], why: t`Substitute ${p.c === 'any' ? t`both ${math`n = ${2}k`} and ${math`n = ${2}k + ${1}`}` : t`the general ${p.c} number`} and expand: the result is always ${ans}.` };
      // A value of n where the expression does not have the parity claimed.
      const n = allowed.find((x) => mod2(at([1, p.a, p.b], x)) !== (o.id === 'even' ? 0 : 1)) as number;
      const v = at([1, p.a, p.b], n);
      return { response: [o.id], why: t`Try ${math`n = ${n}`}: the expression is ${v}, which is ${mod2(v) === 0 ? 'even' : 'odd'}. Then substitute the general case to see the whole pattern.` };
    });
  },
});

interface SubP { m: number; p: 2 | 3 }

/** (mk + 1)^p - 1 as coefficients in k, highest first, and the gcd of its coefficients. */
function substituted({ m, p }: SubP): { full: number[]; g: number } {
  const full = p === 2 ? [m * m, 2 * m, 0] : [m ** 3, 3 * m * m, 3 * m, 0];
  return { full, g: full.reduce((a, b) => gcd(a, b), 0) };
}

const substitute = generator<SubP>({
  id: 'substitute',
  skill: 'Write n = mk + 1 and expand, to show a divisibility, as in STEP Support Assignment 12, Q1(v).',
  params: (rng) => ({ m: int(rng, 2, 5), p: pick(rng, [2, 3] as const) }),
  sane: ({ m }) => (m >= 2 && m <= 5 ? null : 'out of range'),
  problem: (sp) => {
    const { m, p } = sp;
    const { full, g } = substituted(sp);
    const inner = full.map((c) => c / g);
    return {
      prompt: t`${math`n - ${1}`} is divisible by ${m}, so ${math`n = ${m}k + ${1}`} for some integer ${mk}. Write ${math`n^{${p}} - ${1}`} as ${g} times an expression in ${mk}: what is the expression?`,
      answer: { kind: 'expression', expected: poly(inner, 'k'), variables: ['k'], domains: KINT },
      solution: [
        t`Expand: ${math`(${m}k + ${1})^{${p}} - ${1} = ${cm(poly(full, 'k'))}`}. The ${math`${1}`} cancels, so every term has a factor ${mk}.`,
        t`Every coefficient is a multiple of ${g}: ${math`${cm(poly(full, 'k'))} = ${g}(${cm(poly(inner, 'k'))})`}.`,
        t`So ${math`n^{${p}} - ${1}`} is divisible by ${g} whenever ${m} divides ${math`n - ${1}`}.`,
      ],
    };
  },
  solve: ({ m, p }) => {
    // Values at k = 0..3 divided by the gcd of the coefficients, fitted back to a polynomial.
    const vals = [0, 1, 2, 3].map((k) => (m * k + 1) ** p - 1);
    const { g } = substituted({ m, p });
    const ys = vals.map((v) => v / g);
    // Newton differences, then back to coefficients.
    const d1 = ys.slice(1).map((y, i) => y - (ys[i] as number));
    const d2 = d1.slice(1).map((y, i) => y - (d1[i] as number));
    const d3 = (d2[1] as number) - (d2[0] as number);
    const c3 = d3 / 6;
    const c2 = (d2[0] as number) / 2 - 3 * c3;
    const c1 = (d1[0] as number) - c2 - c3;
    return poly(p === 3 ? [c3, c2, c1, ys[0] as number] : [c2, c1, ys[0] as number], 'k');
  },
  misconceptions: (sp): Misconception[] => {
    const { m, p } = sp;
    const { full, g } = substituted(sp);
    return [
      { response: poly(full, 'k'), why: t`That is all of ${math`n^{${p}} - ${1}`}. Take the factor ${g} out of every term.` },
      { response: `${m ** p}k^${p}/${g}`, why: t`${math`(${m}k + ${1})^{${p}}`} is not ${math`${m ** p}k^{${p}} + ${1}`}: expand it fully, keeping the middle terms.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

/** The hints' bracket: (3k + 1)^3 - 1 = 9(3k^3 + 3k^2 + k). */
const A12V = [3, 3, 1, 0];
const a12v = auto({
  id: 'a12-q1-v',
  source: cite('step-f12', 'Q1(v)', true),
  title: t`If ${math`n - ${1}`} is divisible by ${3}`,
  prompt: t`Show that, if ${math`n - ${1}`} is divisible by ${3}, then ${math`n^{${3}} - ${1}`} is divisible by ${9}. Factorising is not the easiest method: write ${math`n - ${1} = ${3}k`} with ${mk} an integer, and find the expression ${math`E`} in ${mk} with ${math`n^{${3}} - ${1} = ${9}E`}.`,
  answer: { kind: 'expression', expected: '3k^3 + 3k^2 + k', variables: ['k'], domains: KINT },
  solution: [
    t`${math`n - ${1} = ${3}k`}, so ${math`n = ${3}k + ${1}`}.`,
    t`Substitute and expand: ${math`(${3}k + ${1})^{${3}} - ${1} = ${cm(poly(substituted({ m: 3, p: 3 }).full, 'k'))}`}.`,
    t`Every coefficient is a multiple of ${9}: ${math`${cm(poly(substituted({ m: 3, p: 3 }).full, 'k'))} = ${9}(${cm(poly(A12V, 'k'))})`}. Since ${cm(poly(A12V, 'k'))} is an integer, ${math`n^{${3}} - ${1}`} is divisible by ${9}.`,
  ],
  reference: '3k^3 + 3k^2 + k',
  verify: () => {
    // n^3 - 1 = 9E at every n = 3k + 1 with k from -10 to 10.
    for (let k = -10; k <= 10; k++) {
      const n = 3 * k + 1;
      const e = same(`k = ${k}`, n ** 3 - 1, 9 * (3 * k ** 3 + 3 * k ** 2 + k));
      if (e !== null) return e;
    }
    return same('the generator agrees', substitute.at({ m: 3, p: 3 }).reference as string, '3k^3 + 3k^2 + k');
  },
  misconceptions: [{ response: '27k^3 + 27k^2 + 9k', why: t`That is ${math`n^{${3}} - ${1}`} itself. Take out the ${9}.` }],
  official: { source: cite('step-f12-hints', 'Q1(v)'), answer: '3k^3 + 3k^2 + k', agrees: true },
});

const a12i = workedProof({
  title: t`Products of consecutive integers`,
  prompt: t`Show that ${math`n(n + ${1})`} is divisible by ${2}, and that ${math`n(n + ${1})(n + ${2})`} is divisible by ${3}, for every positive integer ${mn}.`,
  steps: [
    t`${math`n(n + ${1})`} is the product of two consecutive integers. One of any two consecutive integers is even, so the product is divisible by ${2}.`,
    t`${math`n(n + ${1})(n + ${2})`} is the product of three consecutive integers. One of any three consecutive integers is a multiple of ${3}: the remainders on division by ${3} run through ${math`${0}, ${1}, ${2}`} in turn. So the product is divisible by ${3}.`,
    t`The hints add: no fancy argument is needed. The same reasoning shows a product of ${mk} consecutive integers is divisible by ${mk}.`,
  ],
  answer: t`${math`n(n + ${1})`} is even, and ${math`n(n + ${1})(n + ${2})`} is a multiple of ${3}.`,
  source: cite('step-f12', 'Q1(i)'),
});

function bopParity(o: { n: number; title: Rich; prompt: Rich; expected: string; vars: string[]; steps: Rich[]; official: string; check: () => string | null; wrong: Misconception[] }) {
  return auto({
    id: `bop-4-${o.n}`,
    source: cite('bop', `Chapter 4, exercise ${o.n}`, true),
    title: o.title,
    prompt: o.prompt,
    answer: { kind: 'expression', expected: o.expected, variables: o.vars, domains: Object.fromEntries(o.vars.map((v) => [v, { kind: 'integer' as const, min: -20, max: 20 }])) },
    solution: o.steps,
    reference: o.expected,
    verify: o.check,
    misconceptions: o.wrong,
    official: { source: cite('bop', `Solutions, Chapter 4, exercise ${o.n}`), answer: o.official, agrees: true },
  });
}

const bop41 = bopParity({
  n: 1, title: t`An even number squared`, vars: ['a'], expected: '2a^2', official: '2a^2',
  prompt: t`Prove: if ${math`x`} is an even integer, then ${math`x^{${2}}`} is even. Suppose ${math`x = ${2}a`} for an integer ${math`a`}. Then ${math`x^{${2}} = ${2}b`} for which integer ${math`b`}? Give ${math`b`} in terms of ${math`a`}.`,
  steps: [t`${math`x^{${2}} = (${2}a)^{${2}} = ${4}a^{${2}} = ${2}(${2}a^{${2}})`}, so ${math`b = ${2}a^{${2}}`}, an integer. So ${math`x^{${2}}`} is even, by the definition of even.`],
  check: () => {
    for (let a = -10; a <= 10; a++) { const e = same(`a = ${a}`, (2 * a) ** 2, 2 * (2 * a * a)); if (e !== null) return e; }
    return null;
  },
  wrong: [{ response: '4a^2', why: t`That is ${math`x^{${2}}`} itself. Write it as ${2} times something: ${math`${4}a^{${2}} = ${2}(${2}a^{${2}})`}.` }],
});
const bop43 = bopParity({
  n: 3, title: t`An odd number in a quadratic`, vars: ['c'], expected: '2c^2 + 5c + 4', official: '2c^2 + 5c + 4',
  prompt: t`Prove: if ${math`a`} is an odd integer, then ${math`a^{${2}} + ${3}a + ${5}`} is odd. Suppose ${math`a = ${2}c + ${1}`} for an integer ${math`c`}. Then ${math`a^{${2}} + ${3}a + ${5} = ${2}b + ${1}`} for which integer ${math`b`}? Give ${math`b`} in terms of ${math`c`}.`,
  steps: [
    t`${math`(${2}c + ${1})^{${2}} + ${3}(${2}c + ${1}) + ${5} = ${4}c^{${2}} + ${4}c + ${1} + ${6}c + ${3} + ${5} = ${4}c^{${2}} + ${10}c + ${9}`}.`,
    t`Split off the ${1}: ${math`${4}c^{${2}} + ${10}c + ${8} + ${1} = ${2}(${2}c^{${2}} + ${5}c + ${4}) + ${1}`}. So ${math`b = ${2}c^{${2}} + ${5}c + ${4}`}, and the expression is odd.`,
  ],
  check: () => {
    for (let c = -10; c <= 10; c++) { const a = 2 * c + 1; const e = same(`c = ${c}`, a * a + 3 * a + 5, 2 * (2 * c * c + 5 * c + 4) + 1); if (e !== null) return e; }
    return same('the generator agrees', writeTwoM.at({ a: 3, b: 5, r: 1 }).reference as string, '2k^2 + 5k + 4');
  },
  wrong: [{ response: '4c^2 + 10c + 8', why: t`That is ${math`${2}b`}. Take out the factor ${2}.` }],
});
const bop45 = bopParity({
  n: 5, title: t`An even factor`, vars: ['a', 'y'], expected: 'ay', official: 'ay',
  prompt: t`Suppose ${math`x, y \in \mathbb{Z}`}. Prove: if ${math`x`} is even, then ${math`xy`} is even. With ${math`x = ${2}a`} for an integer ${math`a`}, ${math`xy = ${2}b`} for which integer ${math`b`}? Give ${math`b`} in terms of ${math`a`} and ${math`y`}.`,
  steps: [t`${math`xy = (${2}a)y = ${2}(ay)`}, so ${math`b = ay`}, an integer because ${math`a`} and ${math`y`} are. So ${math`xy`} is even.`],
  check: () => {
    for (let a = -5; a <= 5; a++) for (let y = -5; y <= 5; y++) { const e = same(`a = ${a}, y = ${y}`, 2 * a * y, 2 * (a * y)); if (e !== null) return e; }
    return null;
  },
  wrong: [{ response: '2ay', why: t`That is ${math`xy`} itself. Take out the ${2}.` }],
});

const bop42 = supervision({
  id: 'bop-4-2',
  source: cite('bop', 'Chapter 4, exercise 2'),
  title: t`An odd number cubed`,
  prompt: t`Use the method of direct proof to prove: if ${math`x`} is an odd integer, then ${math`x^{${3}}`} is odd.`,
  writeUp: 'proof',
});
const bop44 = supervision({
  id: 'bop-4-4',
  source: cite('bop', 'Chapter 4, exercise 4'),
  title: t`Odd times odd`,
  prompt: t`Suppose ${math`x, y \in \mathbb{Z}`}. Use direct proof to prove: if ${math`x`} and ${math`y`} are odd, then ${math`xy`} is odd. Use different letters in ${math`x = ${2}a + ${1}`} and ${math`y = ${2}b + ${1}`}: why does it matter?`,
  writeUp: 'proof',
});
const a12ii = supervision({
  id: 'a12-q1-ii-six',
  source: cite('step-f12', 'Q1(ii)'),
  title: t`${math`n^{${3}} - n`} and ${6}`,
  prompt: t`Factorise ${math`n^{${3}} - n`} completely, and deduce that it is divisible by ${6} for every positive integer ${mn}.`,
  writeUp: 'proof',
  official: cite('step-f12-hints', 'Q1(ii)'),
});

// ---------------------------------------------------------------- lesson

export const algebraicArgument: TopicContent = {
  topicId: 'pre.algebraic-argument',
  goal: t`Write even, odd, and consecutive integers in algebra, and use algebra to show a claim holds for all of them.`,
  lesson: [
    { kind: 'p', text: t`Checking examples cannot show that something holds for every integer: there are infinitely many. Algebra can, by working with a general one. Book of Proof's definitions make this possible.` },
    {
      kind: 'list', items: [
        t`An integer ${mn} is even if ${math`n = ${2}k`} for some integer ${mk}, and odd if ${math`n = ${2}k + ${1}`} for some integer ${mk}.`,
        t`Two integers have the same [[parity|parity]] if both are even or both are odd.`,
        t`[[consecutive|Consecutive]] integers follow one another: ${math`n, n + ${1}, n + ${2}`}.`,
      ],
    },
    { kind: 'rule', text: t`To show an expression is even, write it as ${math`${2} \times (\text{an integer})`}; to show it is odd, as ${math`${2} \times (\text{an integer}) + ${1}`}. To show it is divisible by ${math`d`}, write it as ${math`d \times (\text{an integer})`}.` },
    { kind: 'p', text: t`Example: if ${math`x`} is odd then ${math`x^{${2}}`} is odd. Write ${math`x = ${2}a + ${1}`}. Then ${dmath`x^{${2}} = ${4}a^{${2}} + ${4}a + ${1} = ${2}(${2}a^{${2}} + ${2}a) + ${1},`} and ${math`${2}a^{${2}} + ${2}a`} is an integer, so ${math`x^{${2}}`} is odd.` },
    { kind: 'p', text: t`Use a new letter for each number. If ${math`x`} and ${math`y`} are both odd, write ${math`x = ${2}a + ${1}`} and ${math`y = ${2}b + ${1}`}: writing both as ${math`${2}a + ${1}`} would assume ${math`x = y`}.` },
    { kind: 'p', text: t`Consecutive integers carry divisibility. Of two consecutive integers one is even; of three, one is a multiple of ${3}. The STEP hints use this: ${math`n^{${3}} - n = (n - ${1})n(n + ${1})`} is three consecutive integers, so it is divisible by ${2} and by ${3}, hence by ${6}.` },
    { kind: 'p', text: t`Watch for false shortcuts. Two consecutive odd numbers need not include a multiple of ${3}: ${5} and ${7} do not. A claim about "one of them" needs a reason that always applies.` },
  ],
  examples: [
    workedCambridge(a12v),
    a12i,
    worked(writeTwoM, { a: 1, b: 1, r: 0 }, t`Is ${cm(poly([1, 1, 1], 'n'))} odd when ${mn} is even?`),
  ],
  generators: [writeTwoM, divides, parity, substitute],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['parity', 'consecutive'],
  cambridge: [bop41, bop43, bop45, bop42, bop44, a12ii],
};
