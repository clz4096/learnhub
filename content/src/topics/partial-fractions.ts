/**
 * alg.partial-fractions: split a fraction such as 1/((x + 1)(x + 2)) into simpler fractions
 * by substituting values or equating coefficients, including a repeated factor, and use it
 * to sum a telescoping series. Sources: STEP Support Foundation Assignment 17 Q2(iii), (iv),
 * and the NST Maths Workbook A7. Coefficients are found by the cover-up rule in the
 * solutions and checked by solving the linear system from equating coefficients.
 */
import { auto, cite, same } from '../cambridge';
import { add, div, int, mul, pick, q, str, sub, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { computedTex, math, t } from '../rich';
import { checkFrom, workedCambridge, worked, type TopicContent } from '../topic';
import { distinctFrom, named, namedAnswer, withExaminer } from '../prep-a';

const fac = (r: number): string => (r === 0 ? 'x' : `x ${r < 0 ? '+' : '-'} ${Math.abs(r)}`);
const AB = ['A', 'B'] as const;
const ABC = ['A', 'B', 'C'] as const;

// ---------------------------------------------------------------- two distinct factors

interface TwoP { m: number; n: number; r: number; s: number }
/** (mx + n)/((x - r)(x - s)) = A/(x - r) + B/(x - s), with A = (mr + n)/(r - s), B = (ms + n)/(s - r). */
const twoAns = ({ m, n, r, s }: TwoP): [Rational, Rational] => [q(m * r + n, r - s), q(m * s + n, s - r)];

const twoFactors = generator<TwoP>({
  id: 'two-factors',
  skill: 'Split a fraction over two distinct linear factors by the cover-up rule: substitute each root.',
  quick: true,
  params: (rng) => {
    for (;;) {
      const p: TwoP = { m: int(rng, 0, 4), n: int(rng, -6, 8), r: int(rng, -5, 5), s: int(rng, -5, 5) };
      if (p.r === p.s || p.m * p.r + p.n === 0 || p.m * p.s + p.n === 0) continue;
      const [A, B] = twoAns(p);
      const right = named(AB, [A, B]);
      if (distinctFrom(right, [named(AB, [B, A]), named(AB, [q(p.m * p.r + p.n, p.s - p.r), q(p.m * p.s + p.n, p.r - p.s)])]) >= 2) return p;
    }
  },
  sane: (p) => (p.r !== p.s ? null : 'repeated factor'),
  problem: (p) => {
    const [A, B] = twoAns(p);
    const top = p.m === 0 ? `${p.n}` : `${p.m === 1 ? '' : p.m}x ${p.n < 0 ? '-' : '+'} ${Math.abs(p.n)}`;
    return {
      prompt: t`Find ${math`A`} and ${math`B`} with ${computedTex(`\\frac{${top}}{(${fac(p.r)})(${fac(p.s)})} \\equiv \\frac{A}{${fac(p.r)}} + \\frac{B}{${fac(p.s)}}`)}.`,
      answer: namedAnswer(AB, [A, B], 'Multiply through by both factors, then substitute each root.'),
      solution: [
        t`Multiply through by ${computedTex(`(${fac(p.r)})(${fac(p.s)})`)}: ${computedTex(`${top} \\equiv A(${fac(p.s)}) + B(${fac(p.r)})`)}, for every ${math`x`}.`,
        t`Put ${math`x = ${p.r}`}: the ${math`B`} term vanishes, so ${math`${p.m * p.r + p.n} = A \times (${p.r - p.s})`} and ${math`A = ${A}`}.`,
        t`Put ${math`x = ${p.s}`}: ${math`${p.m * p.s + p.n} = B \times (${p.s - p.r})`}, so ${math`B = ${B}`}.`,
      ],
    };
  },
  solve: (p) => {
    // Equate coefficients: A + B = m and -As - Br = n, solved by Cramer's rule.
    const det = q(-p.r + p.s);
    const A = div(sub(mul(q(p.m), q(-p.r)), q(p.n)), det);
    return named(AB, [A, sub(q(p.m), A)]);
  },
  misconceptions: (p): Misconception[] => {
    const [A, B] = twoAns(p);
    return [
      { response: named(AB, [B, A]), why: t`Swapped: putting ${math`x = ${p.r}`} removes the ${math`B`} term and gives ${math`A`}, the coefficient over ${computedTex(fac(p.r))}.` },
      { response: named(AB, [q(p.m * p.r + p.n, p.s - p.r), q(p.m * p.s + p.n, p.r - p.s)]), why: t`At ${math`x = ${p.r}`} the other factor is ${math`${p.r} - (${p.s}) = ${p.r - p.s}`}: substitute into ${computedTex(fac(p.s))}, carefully with signs.` },
    ];
  },
});

// ---------------------------------------------------------------- three factors

interface ThreeP { r: number; s: number; u: number; k: number }
/** k / ((x - r)(x - s)(x - u)): cover-up at each root. */
const threeAns = ({ r, s, u, k }: ThreeP): [Rational, Rational, Rational] => [q(k, (r - s) * (r - u)), q(k, (s - r) * (s - u)), q(k, (u - r) * (u - s))];

const threeFactors = generator<ThreeP>({
  id: 'three-factors',
  skill: 'Split a fraction over three distinct linear factors, finding each coefficient by substituting its root.',
  params: (rng) => {
    for (;;) {
      const p: ThreeP = { r: int(rng, -4, 4), s: int(rng, -4, 4), u: int(rng, -4, 4), k: pick(rng, [1, 2, 3, 6, 12]) };
      if (new Set([p.r, p.s, p.u]).size === 3 && p.r < p.s && p.s < p.u && str(threeAns(p)[0]) !== str(threeAns(p)[2])) return p;
    }
  },
  sane: (p) => (new Set([p.r, p.s, p.u]).size === 3 ? null : 'repeated'),
  problem: (p) => {
    const [A, B, C] = threeAns(p);
    return {
      prompt: t`Find ${math`A, B, C`} with ${computedTex(`\\frac{${p.k}}{(${fac(p.r)})(${fac(p.s)})(${fac(p.u)})} \\equiv \\frac{A}{${fac(p.r)}} + \\frac{B}{${fac(p.s)}} + \\frac{C}{${fac(p.u)}}`)}.`,
      answer: namedAnswer(ABC, [A, B, C], 'Cover up each factor in turn and substitute its root into what is left.'),
      solution: [
        t`Multiply through: ${computedTex(`${p.k} \\equiv A(${fac(p.s)})(${fac(p.u)}) + B(${fac(p.r)})(${fac(p.u)}) + C(${fac(p.r)})(${fac(p.s)})`)}.`,
        t`At ${math`x = ${p.r}`}: ${math`${p.k} = A(${p.r - p.s})(${p.r - p.u})`}, so ${math`A = ${A}`}. At ${math`x = ${p.s}`}: ${math`B = ${B}`}. At ${math`x = ${p.u}`}: ${math`C = ${C}`}.`,
        t`Check: the ${math`x^{${2}}`} coefficients must cancel, ${math`A + B + C = ${add(add(A, B), C)}`}.`,
      ],
    };
  },
  solve: (p) => {
    // Equate coefficients instead: A + B + C = 0, the x coefficients sum to 0, and the constants give k; solve by elimination.
    const [r, s, u] = [p.r, p.s, p.u];
    // x^1: -A(s + u) - B(r + u) - C(r + s) = 0; x^0: A su + B ru + C rs = k. With C = -A - B:
    const a1 = q(-(s + u) + (r + s)); const b1 = q(-(r + u) + (r + s));
    const a0 = q(s * u - r * s); const b0 = q(r * u - r * s);
    const det = sub(mul(a1, b0), mul(b1, a0));
    const A = div(sub(q(0), mul(b1, q(p.k))), det);
    const B = div(mul(a1, q(p.k)), det);
    return named(ABC, [A, B, sub(sub(q(0), A), B)]);
  },
  misconceptions: (p): Misconception[] => {
    const [A, B, C] = threeAns(p);
    const neg = (x: Rational): Rational => mul(q(-1), x);
    return [
      { response: named(ABC, [neg(A), neg(B), neg(C)]), why: t`Check the signs: at ${math`x = ${p.r}`} the other factors are ${math`${p.r - p.s}`} and ${math`${p.r - p.u}`}.` },
      { response: named(ABC, [C, B, A]), why: t`Each coefficient belongs to its own factor: putting ${math`x = ${p.r}`} gives the ${math`A`} over ${computedTex(fac(p.r))}.` },
    ];
  },
});

// ---------------------------------------------------------------- telescoping sums

interface TelP { a: number; b: number; d: number }
/** sum_{r=a}^{b} d/(r(r + d)) = 1/a + ... telescopes: sum of 1/r - 1/(r + d). */
function telSum({ a, b, d }: TelP): Rational {
  let s = q(0);
  for (let r = a; r <= b; r++) s = add(s, q(d, r * (r + d)));
  return s;
}

const telescope = generator<TelP>({
  id: 'telescope',
  skill: 'Sum a series by partial fractions: 1/(r(r + 1)) = 1/r - 1/(r + 1), and most terms cancel.',
  params: (rng) => {
    for (;;) {
      const p: TelP = { a: int(rng, 2, 6), b: 0, d: pick(rng, [1, 1, 2]) };
      p.b = p.a + int(rng, 4, 15);
      if (p.d === 1 || p.b - p.a >= 3) return p;
    }
  },
  sane: (p) => (p.b > p.a ? null : 'empty'),
  problem: (p) => {
    return {
      prompt: t`Evaluate ${math`\sum_{r = ${p.a}}^{${p.b}} \frac{${p.d}}{r(r + ${p.d})}`}.`,
      answer: { kind: 'exact', expected: str(telSum(p)) },
      solution: [
        t`Partial fractions: ${math`\frac{${p.d}}{r(r + ${p.d})} = \frac{${1}}{r} - \frac{${1}}{r + ${p.d}}`}.`,
        t`Writing out the terms, each ${math`\frac{${1}}{r}`} with ${math`r \ge ${p.a + p.d}`} is cancelled by a later minus term. What survives is ${p.d === 1 ? t`${math`\frac{${1}}{${p.a}} - \frac{${1}}{${p.b + 1}}`}` : t`${math`\frac{${1}}{${p.a}} + \frac{${1}}{${p.a + 1}} - \frac{${1}}{${p.b + 1}} - \frac{${1}}{${p.b + 2}}`}`}.`,
        t`That is ${telSum(p)}.`,
      ],
    };
  },
  solve: (p) => {
    // The surviving terms, added exactly.
    let s = q(0);
    for (let i = 0; i < p.d; i++) s = add(s, sub(q(1, p.a + i), q(1, p.b + 1 + i)));
    return str(s);
  },
  misconceptions: (p): Misconception[] => [
    { response: str(sub(q(1, p.a), q(1, p.b))), why: t`The last term surviving is ${math`-\frac{${1}}{${p.b + 1}}`}, from ${math`r = ${p.b}`}: ${math`-\frac{${1}}{r + ${1}}`} at the top of the sum.` },
    { response: str(telSum({ ...p, a: 1 })), why: t`The sum starts at ${math`r = ${p.a}`}, not at ${math`r = ${1}`}.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const a17iv = auto({
  id: 'a17-q2-iv',
  source: cite('step-f17', 'Q2(iv)'),
  title: t`Two fractions from one`,
  prompt: t`By setting ${math`x = ${0}`} and ${math`x = ${1}`} in turn, find ${math`a`} and ${math`b`} such that ${math`\frac{${1}}{x^{${2}} + ${3}x + ${2}} \equiv \frac{a}{x + ${1}} + \frac{b}{x + ${2}}`}.`,
  answer: namedAnswer(['a', 'b'], [q(1), q(-1)], 'Multiply through by (x + 1)(x + 2), then substitute.'),
  solution: [
    t`${math`x^{${2}} + ${3}x + ${2} = (x + ${1})(x + ${2})`}. Multiply through: ${math`${1} \equiv a(x + ${2}) + b(x + ${1})`}.`,
    t`${math`x = ${0}`}: ${math`${1} = ${2}a + b`}. ${math`x = ${1}`}: ${math`${1} = ${3}a + ${2}b`}. Subtracting twice the first from the second: ${math`-${1} = -a`}, so ${math`a = ${1}`}, ${math`b = -${1}`}.`,
    t`(Faster: ${math`x = -${1}`} gives ${math`a = ${1}`} at once, and ${math`x = -${2}`} gives ${math`b = -${1}`}.)`,
  ],
  reference: 'a = 1, b = -1',
  verify: () => same('cover-up', twoAns({ m: 0, n: 1, r: -1, s: -2 }).map(str).join(','), '1,-1'),
  misconceptions: [{ response: 'a = -1, b = 1', why: t`At ${math`x = -${1}`}: ${math`${1} = a \times ${1}`}, so ${math`a = ${1}`}.` }],
  official: { source: cite('step-f17-hints', 'Q2(iv)'), answer: 'a = 1, b = -1', agrees: true },
});

const a17iiiN = auto({
  id: 'a17-q2-iii-n',
  source: cite('step-f17', 'Q2(iii)'),
  title: t`A telescoping sum to ${math`n`}`,
  prompt: t`Show that ${math`\frac{${1}}{r(r + ${1})} = \frac{${1}}{r} - \frac{${1}}{r + ${1}}`}, and hence find ${math`\sum_{r = ${1}}^{n} \frac{${1}}{r(r + ${1})}`} in terms of ${math`n`}.`,
  answer: { kind: 'expression', expected: 'n/(n + 1)', variables: ['n'], domains: { n: { kind: 'integer', min: 1, max: 40 } } },
  solution: [
    t`${math`\frac{${1}}{r} - \frac{${1}}{r + ${1}} = \frac{(r + ${1}) - r}{r(r + ${1})} = \frac{${1}}{r(r + ${1})}`}.`,
    t`Sum: ${math`\left(${1} - \frac{${1}}{${2}}\right) + \left(\frac{${1}}{${2}} - \frac{${1}}{${3}}\right) + \cdots + \left(\frac{${1}}{n} - \frac{${1}}{n + ${1}}\right)`}: every middle term cancels, leaving ${math`${1} - \frac{${1}}{n + ${1}} = \frac{n}{n + ${1}}`}. Check at ${math`n = ${3}`}: ${math`\frac{${1}}{${2}} + \frac{${1}}{${6}} + \frac{${1}}{${12}} = \frac{${3}}{${4}}`}.`,
  ],
  reference: 'n/(n + 1)',
  verify: () => { for (let n = 1; n <= 30; n++) if (str(telSum({ a: 1, b: n, d: 1 })) !== str(q(n, n + 1))) return `n = ${n}`; return null; },
  misconceptions: [{ response: '1 - 1/n', why: t`The last bracket is ${math`\frac{${1}}{n} - \frac{${1}}{n + ${1}}`}, so ${math`-\frac{${1}}{n + ${1}}`} survives, not ${math`-\frac{${1}}{n}`}.` }],
  official: { source: cite('step-f17-hints', 'Q2(iii)'), answer: 'n/(n + 1)', agrees: true },
});

const a17iii200 = auto({
  id: 'a17-q2-iii-200',
  source: cite('step-f17', 'Q2(iii)'),
  title: t`From ${100} to ${200}`,
  prompt: t`Find ${math`\sum_{r = ${100}}^{${200}} \frac{${1}}{r(r + ${1})}`}.`,
  answer: { kind: 'exact', expected: '101/20100' },
  solution: [
    t`The terms telescope: ${math`\frac{${1}}{${100}} - \frac{${1}}{${201}}`}.`,
    t`${math`= \frac{${201} - ${100}}{${100} \times ${201}} = \frac{${101}}{${20100}}`}.`,
  ],
  reference: '101/20100',
  verify: () => same('the sum', str(telSum({ a: 100, b: 200, d: 1 })), '101/20100'),
  misconceptions: [{ response: '1/200', why: t`The surviving terms are ${math`\frac{${1}}{${100}}`} and ${math`-\frac{${1}}{${201}}`}: the last ${math`r`} is ${200}, so ${math`r + ${1} = ${201}`}.` }],
  official: { source: cite('step-f17-hints', 'Q2(iii)'), answer: '101/20100', agrees: true },
});

const nstA7ii = auto({
  id: 'nst-a7-ii',
  source: cite('nst-workbook', 'Algebra, A7(ii)'),
  title: t`Three linear factors`,
  prompt: t`Express ${math`\frac{x + ${13}}{(x + ${1})(x - ${2})(x + ${3})}`} in partial fractions as ${math`\frac{A}{x - ${2}} + \frac{B}{x + ${1}} + \frac{C}{x + ${3}}`}. Give ${math`A, B, C`}.`,
  answer: namedAnswer(ABC, [q(1), q(-2), q(1)], 'Cover up each factor and substitute its root.'),
  solution: [
    t`${math`x = ${2}`}: ${math`A = \frac{${15}}{(${3})(${5})} = ${1}`}. ${math`x = -${1}`}: ${math`B = \frac{${12}}{(-${3})(${2})} = -${2}`}. ${math`x = -${3}`}: ${math`C = \frac{${10}}{(-${2})(-${5})} = ${1}`}.`,
    t`Check: ${math`A + B + C = ${0}`}, as the ${math`x^{${2}}`} terms of the numerator must cancel.`,
  ],
  reference: 'A = 1, B = -2, C = 1',
  verify: () => {
    const f = (x: number): number => (x + 13) / ((x + 1) * (x - 2) * (x + 3));
    const g = (x: number): number => 1 / (x - 2) - 2 / (x + 1) + 1 / (x + 3);
    for (const x of [0, 0.5, 5, -7]) if (Math.abs(f(x) - g(x)) > 1e-12) return `x = ${x}`;
    return null;
  },
  misconceptions: [{ response: 'A = 1, B = 2, C = 1', why: t`At ${math`x = -${1}`}: ${math`(x - ${2})(x + ${3}) = (-${3})(${2}) = -${6}`}, so ${math`B = \frac{${12}}{-${6}} = -${2}`}.` }],
});

const nstA7iii = auto({
  id: 'nst-a7-iii',
  source: cite('nst-workbook', 'Algebra, A7(iii)'),
  title: t`A repeated factor`,
  prompt: t`Express ${math`\frac{${4}x + ${1}}{(x + ${1})^{${2}}(x - ${2})}`} as ${math`\frac{A}{x - ${2}} + \frac{B}{x + ${1}} + \frac{C}{(x + ${1})^{${2}}}`}. Give ${math`A, B, C`}.`,
  answer: namedAnswer(ABC, [q(1), q(-1), q(1)], 'Use x = 2 and x = -1 for A and C, then compare x^2 terms for B.'),
  solution: [
    t`Multiply through: ${math`${4}x + ${1} \equiv A(x + ${1})^{${2}} + B(x + ${1})(x - ${2}) + C(x - ${2})`}.`,
    t`${math`x = ${2}`}: ${math`${9} = ${9}A`}, so ${math`A = ${1}`}. ${math`x = -${1}`}: ${math`-${3} = -${3}C`}, so ${math`C = ${1}`}.`,
    t`No value of ${math`x`} isolates ${math`B`}, so compare ${math`x^{${2}}`} coefficients: ${math`${0} = A + B`}, so ${math`B = -${1}`}.`,
  ],
  reference: 'A = 1, B = -1, C = 1',
  verify: () => {
    const f = (x: number): number => (4 * x + 1) / ((x + 1) ** 2 * (x - 2));
    const g = (x: number): number => 1 / (x - 2) - 1 / (x + 1) + 1 / (x + 1) ** 2;
    for (const x of [0, 0.5, 5, -7]) if (Math.abs(f(x) - g(x)) > 1e-12) return `x = ${x}`;
    return null;
  },
  misconceptions: [{ response: 'A = 1, B = 0, C = 1', why: t`A repeated factor needs both ${math`\frac{B}{x + ${1}}`} and ${math`\frac{C}{(x + ${1})^{${2}}}`}; the ${math`x^{${2}}`} terms force ${math`B = -A = -${1}`}.` }],
});

// ---------------------------------------------------------------- lesson

export const partialFractions: TopicContent = {
  topicId: 'alg.partial-fractions',
  goal: t`Split a fraction such as ${math`\frac{${1}}{(x + ${1})(x + ${2})}`} into simpler fractions by substituting values or equating coefficients.`,
  objective: t`Split a fraction into partial fractions, and use them to sum a telescoping series.`,
  why: t`Partial fractions turn hard sums and integrals into easy ones; STEP uses both.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`The idea` },
    { kind: 'hook', text: t`Add up ${math`\frac{${1}}{${1} \times ${2}} + \frac{${1}}{${2} \times ${3}} + \cdots + \frac{${1}}{${99} \times ${100}}`}. It looks like a hundred fractions. In fact it is ${math`${1} - \frac{${1}}{${100}}`}, because each term splits as ${math`\frac{${1}}{r} - \frac{${1}}{r + ${1}}`} and almost everything cancels.` },
    { kind: 'narrative', text: t`Adding fractions is easy: find a common denominator. Partial fractions run that backwards, splitting one fraction with a factorised denominator into a sum of fractions with simpler denominators.` },
    { kind: 'section', title: t`Distinct linear factors` },
    {
      kind: 'definition',
      name: t`Partial fractions`,
      formal: t`If ${math`P`} is a polynomial of degree less than ${math`n`} and ${math`a_{${1}}, \ldots, a_{n}`} are distinct, the [[partial-fractions|partial fractions]] of ${math`\frac{P(x)}{(x - a_{${1}})\cdots(x - a_{n})}`} are the constants ${math`A_{i}`} with ${math`\frac{P(x)}{(x - a_{${1}})\cdots(x - a_{n})} \equiv \sum_{i} \frac{A_{i}}{x - a_{i}}`}.`,
      plain: t`${math`\frac{${1}}{(x + ${1})(x + ${2})} = \frac{${1}}{x + ${1}} - \frac{${1}}{x + ${2}}`}: here ${math`A_{${1}} = ${1}`} and ${math`A_{${2}} = -${1}`}.`,
    },
    { kind: 'theorem', name: t`The cover-up rule`, statement: t`In the setting above, ${math`A_{i} = \frac{P(a_{i})}{\prod_{j \ne i}(a_{i} - a_{j})}`}: the value at ${math`x = a_{i}`} of the fraction with the factor ${math`x - a_{i}`} removed.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Clear the denominator`, text: t`Multiply the identity by ${math`\prod_{j}(x - a_{j})`}: ${math`P(x) \equiv \sum_{i} A_{i}\prod_{j \ne i}(x - a_{j})`}, an identity of polynomials.`, why: { q: t`Why does it hold at ${math`x = a_{i}`}, where the fractions were undefined?`, a: t`Two polynomials equal at every other ${math`x`}, infinitely many points, are the same polynomial, so they are equal at ${math`a_{i}`} too.` } },
        { label: t`Substitute a root`, text: t`At ${math`x = a_{i}`}, every term except the ${math`i`}th contains the factor ${math`x - a_{i}`}, which is ${0}.` },
        { label: t`Read off the coefficient`, text: t`So ${math`P(a_{i}) = A_{i}\prod_{j \ne i}(a_{i} - a_{j})`}, and the product is not ${0} because the ${math`a_{j}`} are distinct.` },
      ],
    },
    { kind: 'narrative', text: t`That is the [[cover-up-rule|cover-up rule]]: to find the coefficient over ${math`x - a`}, cover that factor up and put ${math`x = a`} into the rest.` },
    checkFrom(twoFactors, { m: 0, n: 1, r: -1, s: -2 }, t`Cover up ${math`x + ${1}`} and put ${math`x = -${1}`}: ${math`\frac{${1}}{${1}} = ${1}`}. Cover up ${math`x + ${2}`} and put ${math`x = -${2}`}: ${math`\frac{${1}}{-${1}} = -${1}`}.`),
    { kind: 'pitfall', claim: t`${math`\frac{${4}x + ${1}}{(x + ${1})^{${2}}(x - ${2})} = \frac{A}{x - ${2}} + \frac{C}{(x + ${1})^{${2}}}`} for some constants.`, counterexample: t`Comparing ${math`x^{${2}}`} coefficients would force ${math`A = ${0}`}, but ${math`x = ${2}`} forces ${math`A = ${1}`}. A repeated factor needs both ${math`\frac{B}{x + ${1}}`} and ${math`\frac{C}{(x + ${1})^{${2}}}`}.` },
    { kind: 'section', title: t`Telescoping sums` },
    { kind: 'narrative', text: t`Now the hook: ${math`\frac{${1}}{r(r + ${1})} = \frac{${1}}{r} - \frac{${1}}{r + ${1}}`}. In the sum from ${math`r = ${1}`} to ${math`n`}, each ${math`-\frac{${1}}{r + ${1}}`} cancels the ${math`+\frac{${1}}{r + ${1}}`} of the next term. Only the first and last pieces survive: ${math`${1} - \frac{${1}}{n + ${1}} = \frac{n}{n + ${1}}`}.` },
    checkFrom(telescope, { a: 2, b: 9, d: 1 }, t`${math`\frac{${1}}{${2}} - \frac{${1}}{${10}} = ${q(2, 5)}`}.`),
    { kind: 'takeaway', text: t`Multiply out to a polynomial identity and substitute each root (cover-up); a repeated factor needs every power; and partial fractions make sums telescope.` },
  ],
  examples: [
    withExaminer(workedCambridge(a17iv), t`The identity written with ${math`\equiv`}, the substitutions shown, and the values checked in the original.`),
    worked(threeFactors, { r: -2, s: 0, u: 3, k: 6 }, t`Three factors by cover-up`),
    worked(telescope, { a: 1, b: 10, d: 2 }, t`A telescoping sum that skips`),
  ],
  generators: [twoFactors, threeFactors, telescope],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['partial-fractions', 'cover-up-rule'],
  cambridge: [a17iiiN, a17iii200, nstA7ii, nstA7iii],
  gate: ['a17-q2-iii-200', 'nst-a7-iii', 'a17-q2-iii-n'],
  recall: [
    { front: t`State the cover-up rule.`, back: t`The coefficient over ${math`x - a`} is the rest of the fraction evaluated at ${math`x = a`}.` },
    { front: t`Partial fractions for ${math`\frac{${1}}{r(r + ${1})}`}?`, back: t`${math`\frac{${1}}{r} - \frac{${1}}{r + ${1}}`}.` },
  ],
  proofOrder: [{
    title: t`Why the cover-up rule works`,
    steps: [
      t`Multiply through by all the factors to get a polynomial identity.`,
      t`It holds for every ${math`x`}, including the roots.`,
      t`At ${math`x = a_{i}`} every term but one has a factor ${math`${0}`}.`,
      t`So ${math`A_{i}`} is the remaining value divided by the product of the other factors at ${math`a_{i}`}.`,
    ],
  }],
};
