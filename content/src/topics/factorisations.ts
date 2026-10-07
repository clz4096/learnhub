/**
 * alg.factorisations: the difference of two squares, the sum and difference of two cubes,
 * a^n - b^n from a geometric sum, and the trick of completing a square to get a difference
 * of squares, as in x^4 + 1 = (x^2 + 1)^2 - 2x^2. Sources: STEP Support Foundation
 * Assignment 2 Q1(i), (iv), Assignment 10 Q4(ii), and Assignment 14 Q1. Factorisations are
 * graded by the expression grader (equal at random points, and a product); the
 * Cambridge answers are checked by expanding at many points.
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { int, pick, q } from '../math';
import { generator, type Misconception } from '../problem';
import { computedMath, math, t } from '../rich';
import { checkFrom, workedCambridge, worked, type TopicContent } from '../topic';
import { poly } from '../poly';
import { setAnswer, withExaminer } from '../prep-a';

const near = (a: number, b: number): boolean => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));
const lin = (a: number, b: number): string => poly([a, b]);

// ---------------------------------------------------------------- difference of two squares

interface DsP { p: number; q: number; r: number; s: number }
const dsSum = (d: DsP): [number, number] => [d.p + d.r, d.q + d.s];
const dsDiff = (d: DsP): [number, number] => [d.p - d.r, d.q - d.s];
const prod = (a: [number, number], b: [number, number]): string => `(${lin(...a)})(${lin(...b)})`;

const differenceOfSquares = generator<DsP>({
  id: 'difference-of-squares',
  skill: 'Factorise A^2 - B^2 as (A - B)(A + B), with A and B linear expressions.',
  quick: true,
  params: (rng) => {
    for (;;) {
      const d: DsP = { p: int(rng, 1, 4), q: int(rng, -5, 5), r: int(rng, 1, 3), s: int(rng, -5, 5) };
      const [a, b] = dsSum(d);
      const [c, e] = dsDiff(d);
      if (d.p === d.r || a === 0 || c === 0 || (b === 0 && e === 0) || d.q === d.s || d.s === 0) continue;
      return d;
    }
  },
  sane: (d) => (d.p !== d.r ? null : 'degenerate'),
  problem: (d) => {
    const A = lin(d.p, d.q);
    const B = lin(d.r, d.s);
    const ans = prod(dsDiff(d), dsSum(d));
    return {
      prompt: t`Factorise ${computedMath(`(${A})^${2} - (${B})^${2}`)} into two linear factors.`,
      answer: { kind: 'expression', expected: ans, variables: ['x'], form: 'product' },
      solution: [
        t`Use ${math`A^{${2}} - B^{${2}} = (A - B)(A + B)`} with ${computedMath(`A = ${A}`)} and ${computedMath(`B = ${B}`)}.`,
        t`${computedMath(`A - B = ${lin(...dsDiff(d))}`)} (subtract every term of ${math`B`}) and ${computedMath(`A + B = ${lin(...dsSum(d))}`)}, so the answer is ${computedMath(ans)}.`,
      ],
    };
  },
  solve: (d) => prod(dsDiff(d), dsSum(d)),
  misconceptions: (d): Misconception[] => [
    { response: prod([d.p - d.r, d.q + d.s], dsSum(d)), why: t`In ${math`A - B`}, subtract all of ${math`B`}: the constant ${d.s} changes sign too.` },
    { response: prod(dsDiff(d), dsDiff(d)), why: t`${math`A^{${2}} - B^{${2}} = (A - B)(A + B)`}, not ${math`(A - B)^{${2}}`}: one factor is the sum.` },
  ],
});

// ---------------------------------------------------------------- sum and difference of cubes

interface CuP { k: number; plus: boolean; c: number }
const cuForm = (c: number, k: number, s1: string, s2: string): string => `(${c}x ${s1} ${k})(${c * c}x^2 ${s2} ${c * k}x + ${k * k})`.replace(/\(1x/g, '(x').replace(/ 1x/g, ' x');
const cuAns = ({ k, plus, c }: CuP): string => (plus ? cuForm(c, k, '+', '-') : cuForm(c, k, '-', '+'));

const cubes = generator<CuP>({
  id: 'cubes',
  skill: 'Factorise a sum or difference of two cubes: a^3 - b^3 = (a - b)(a^2 + ab + b^2).',
  params: (rng) => ({ k: int(rng, 1, 6), plus: rng() < 0.5, c: pick(rng, [1, 1, 2, 3]) }),
  sane: (p) => (p.k >= 1 ? null : 'bad'),
  problem: (p) => {
    const e = `${p.c ** 3 === 1 ? '' : p.c ** 3}x^3 ${p.plus ? '+' : '-'} ${p.k ** 3}`;
    return {
      prompt: t`Factorise ${computedMath(e)} into a linear factor and a quadratic factor.`,
      answer: { kind: 'expression', expected: cuAns(p), variables: ['x'], form: 'product' },
      solution: [
        t`It is ${math`a^{${3}} ${p.plus ? '+' : '-'} b^{${3}}`} with ${computedMath(`a = ${p.c === 1 ? '' : p.c}x`)} and ${math`b = ${p.k}`}.`,
        t`${p.plus ? t`${math`a^{${3}} + b^{${3}} = (a + b)(a^{${2}} - ab + b^{${2}})`}` : t`${math`a^{${3}} - b^{${3}} = (a - b)(a^{${2}} + ab + b^{${2}})`}`}, so the answer is ${computedMath(cuAns(p))}.`,
      ],
    };
  },
  solve: (p) => cuAns(p),
  misconceptions: (p): Misconception[] => [
    { response: p.plus ? cuForm(p.c, p.k, '+', '+') : cuForm(p.c, p.k, '-', '-'), why: t`The middle sign of the quadratic is opposite to the sign in the linear factor: ${math`a^{${3}} + b^{${3}} = (a + b)(a^{${2}} - ab + b^{${2}})`}.` },
    { response: p.plus ? `(${p.c === 1 ? '' : p.c}x + ${p.k})^3` : `(${p.c === 1 ? '' : p.c}x - ${p.k})^3`, why: t`${math`(a + b)^{${3}}`} has the extra terms ${math`${3}a^{${2}}b + ${3}ab^{${2}}`}; a sum of two cubes is not a cube.` },
  ],
});

// ---------------------------------------------------------------- a difference of squares in disguise

interface SgP { k: number }
/** x^4 + 4k^4 = (x^2 + 2k^2)^2 - (2kx)^2. */
const sgAns = ({ k }: SgP): string => `(x^2 - ${2 * k}x + ${2 * k * k})(x^2 + ${2 * k}x + ${2 * k * k})`;

const disguised = generator<SgP>({
  id: 'disguised-square',
  skill: 'Complete a square to turn a sum into a difference of two squares, as in x^4 + 4 = (x^2 + 2)^2 - (2x)^2.',
  params: (rng) => ({ k: int(rng, 1, 8) }),
  sane: ({ k }) => (k >= 1 ? null : 'bad'),
  problem: ({ k }) => ({
    prompt: t`Factorise ${computedMath(`x^${4} + ${4 * k ** 4}`)} into two quadratic factors.`,
    answer: { kind: 'expression', expected: sgAns({ k }), variables: ['x'], form: 'product' },
    solution: [
      t`Add and subtract the middle term that would make a square: ${computedMath(`x^${4} + ${4 * k ** 4} = (x^${2} + ${2 * k * k})^${2} - ${4 * k * k}x^${2}`)}.`,
      t`${math`${4 * k * k}x^{${2}} = (${2 * k}x)^{${2}}`}, so this is a difference of two squares: ${computedMath(sgAns({ k }))}.`,
    ],
  }),
  solve: (p) => sgAns(p),
  misconceptions: ({ k }): Misconception[] => [
    { response: `(x^2 + ${2 * k * k})^2`, why: t`That expands to ${computedMath(`x^${4} + ${4 * k * k}x^${2} + ${4 * k ** 4}`)}: it has an extra ${math`x^{${2}}`} term. Subtract it, and factorise the difference of squares.` },
    { response: `(x^2 + ${2 * k * k})(x^2 - ${2 * k * k})`, why: t`That is ${computedMath(`x^${4} - ${4 * k ** 4}`)}, a difference. A sum of squares needs the trick of adding and subtracting a middle term.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const a14ii = auto({
  id: 'a14-q1-ii-a',
  source: cite('step-f14', 'Q1(ii)(a)'),
  title: t`A sum of two cubes`,
  prompt: t`Factorise ${math`x^{${3}} + ${125}`} into a linear and a quadratic factor.`,
  answer: { kind: 'expression', expected: '(x + 5)(x^2 - 5x + 25)', variables: ['x'], form: 'product' },
  solution: [
    t`${math`${125} = ${5}^{${3}}`}, so this is ${math`a^{${3}} + b^{${3}}`} with ${math`a = x`}, ${math`b = ${5}`}.`,
    t`Replace ${math`b`} by ${math`-b`} in ${math`a^{${3}} - b^{${3}} = (a - b)(a^{${2}} + ab + b^{${2}})`}: ${math`a^{${3}} + b^{${3}} = (a + b)(a^{${2}} - ab + b^{${2}})`}. So ${math`x^{${3}} + ${125} = (x + ${5})(x^{${2}} - ${5}x + ${25})`}.`,
  ],
  reference: '(x + 5)(x^2 - 5x + 25)',
  verify: () => { for (const x of [-3, 0.5, 2, 7]) if (!near((x + 5) * (x * x - 5 * x + 25), x ** 3 + 125)) return `x = ${x}`; return null; },
  misconceptions: [{ response: '(x + 5)(x^2 + 5x + 25)', why: t`The middle term has the opposite sign to the ${5} in the linear factor: ${math`x^{${2}} - ${5}x + ${25}`}.` }],
  official: { source: cite('step-f14-hints', 'Q1(ii)(a)'), answer: '(x + 5)(x^2 - 5x + 25)', agrees: true },
});

const a2i = auto({
  id: 'a2-q1-i',
  source: cite('step-f02', 'Q1(i)'),
  title: t`Two squares of brackets`,
  prompt: t`Simplify ${math`(${2}x - ${3})^{${2}} - (x - ${1})^{${2}}`}, giving your answer in factorised form.`,
  answer: { kind: 'expression', expected: '(3x - 4)(x - 2)', variables: ['x'], form: 'product' },
  solution: [
    t`Difference of two squares: ${math`[(${2}x - ${3}) + (x - ${1})][(${2}x - ${3}) - (x - ${1})]`}.`,
    t`Simplify each bracket: ${math`(${3}x - ${4})(x - ${2})`}. Check at ${math`x = ${1}`}: ${math`${1} - ${0} = ${1}`} and ${math`(-${1})(-${1}) = ${1}`}.`,
  ],
  reference: '(3x - 4)(x - 2)',
  verify: () => { for (const x of [-2, 0, 1, 2.5, 6]) if (!near((2 * x - 3) ** 2 - (x - 1) ** 2, (3 * x - 4) * (x - 2))) return `x = ${x}`; return null; },
  misconceptions: [{ response: '(3x - 4)(x - 4)', why: t`In the second bracket subtract all of ${math`x - ${1}`}: ${math`${2}x - ${3} - x + ${1} = x - ${2}`}.` }],
  official: { source: cite('step-f02-hints', 'Q1(i)'), answer: '(3x - 4)(x - 2)', agrees: true },
});

const a14six = auto({
  id: 'a14-q1-ii-b',
  source: cite('step-f14', 'Q1(ii)(b)'),
  title: t`A difference of sixth powers`,
  prompt: t`Factorise ${math`x^{${6}} - y^{${6}}`} into four factors: two linear and two quadratic.`,
  answer: { kind: 'expression', expected: '(x - y)(x + y)(x^2 + xy + y^2)(x^2 - xy + y^2)', variables: ['x', 'y'], form: 'product' },
  solution: [
    t`First as a difference of squares: ${math`(x^{${3}})^{${2}} - (y^{${3}})^{${2}} = (x^{${3}} - y^{${3}})(x^{${3}} + y^{${3}})`}.`,
    t`Then each cube: ${math`(x - y)(x^{${2}} + xy + y^{${2}})(x + y)(x^{${2}} - xy + y^{${2}})`}.`,
  ],
  reference: '(x - y)(x + y)(x^2 + xy + y^2)(x^2 - xy + y^2)',
  verify: () => { for (const [x, y] of [[2, 1], [-1.5, 3], [0.7, -2]] as const) if (!near((x - y) * (x + y) * (x * x + x * y + y * y) * (x * x - x * y + y * y), x ** 6 - y ** 6)) return `at ${x}, ${y}`; return null; },
  misconceptions: [{ response: '(x - y)(x + y)(x^2 + y^2)^2', why: t`${math`x^{${3}} - y^{${3}}`} factorises as ${math`(x - y)(x^{${2}} + xy + y^{${2}})`}, with an ${math`xy`} term, not as a sum of squares.` }],
  official: { source: cite('step-f14-hints', 'Q1(ii)(b)'), answer: '(x + y)(x - y)(x^2 + xy + y^2)(x^2 - xy + y^2)', agrees: true },
});

const a10ii = auto({
  id: 'a10-q4-ii',
  source: cite('step-f10', 'Q4(ii)'),
  title: t`An ${1858} problem on cubes`,
  prompt: t`From the ${1858} Local Examinations: the difference between two numbers is ${3}, and the difference of their cubes is ${279}. Find the numbers. There are two pairs: give the larger number of each pair.`,
  answer: setAnswer([q(7), q(-4)], 'Use a^3 - b^3 = (a - b)(a^2 + ab + b^2) and substitute a = b + 3.'),
  solution: [
    t`Let the numbers be ${math`a`} and ${math`b`} with ${math`a - b = ${3}`}. Then ${math`a^{${3}} - b^{${3}} = (a - b)(a^{${2}} + ab + b^{${2}}) = ${279}`}, so ${math`a^{${2}} + ab + b^{${2}} = ${93}`}.`,
    t`Put ${math`a = b + ${3}`}: ${math`${3}b^{${2}} + ${9}b + ${9} = ${93}`}, so ${math`b^{${2}} + ${3}b - ${28} = (b + ${7})(b - ${4}) = ${0}`}.`,
    t`${math`b = ${4}`} gives ${7} and ${4}; ${math`b = -${7}`} gives ${math`-${4}`} and ${math`-${7}`}. The larger numbers are ${7} and ${math`-${4}`}.`,
  ],
  reference: '7, -4',
  verify: () => {
    const found: number[] = [];
    for (let b = -50; b <= 50; b++) if ((b + 3) ** 3 - b ** 3 === 279) found.push(b + 3);
    return same('larger numbers', found.join(','), '-4,7');
  },
  misconceptions: [{ response: '7, 4', why: t`The question asks for the larger number of each of the two pairs: ${math`(${7}, ${4})`} and ${math`(-${4}, -${7})`}.` }],
});

const a14q1 = supervision({
  id: 'a14-q1',
  source: cite('step-f14', 'Q1(i), (iii), (iv)'),
  title: t`Cubes, fifth powers, and ${math`x^{${4}} = -${1}`}`,
  prompt: t`(i) Show that ${math`(a - b)(a^{${2}} + ab + b^{${2}}) = a^{${3}} - b^{${3}}`}, and find a similar factorisation for ${math`a^{${3}} + b^{${3}}`}. (iii) Find the sum of ${math`${1} + t + t^{${2}} + t^{${3}} + t^{${4}}`}, and deduce, by choosing ${math`t`} suitably, that ${math`a^{${5}} - b^{${5}} = (a - b)(a^{${4}} + a^{${3}}b + a^{${2}}b^{${2}} + ab^{${3}} + b^{${4}})`}; write down a factorisation of ${math`a^{${5}} + b^{${5}}`}. (iv) Simplify ${math`(x^{${2}} + y^{${2}} - \sqrt{${2}}xy)(x^{${2}} + y^{${2}} + \sqrt{${2}}xy)`}, and use it to find the four values of ${math`x`} with ${math`x^{${4}} = -${1}`}.`,
  writeUp: 'proof',
  official: cite('step-f14-hints', 'Q1'),
});

// ---------------------------------------------------------------- lesson

export const factorisations: TopicContent = {
  topicId: 'alg.factorisations',
  goal: t`Factorise ${math`a^{${3}} \pm b^{${3}}`} and ${math`a^{n} - b^{n}`}, and spot a difference of two squares such as ${math`x^{${4}} + ${1} = (x^{${2}} + ${1})^{${2}} - ${2}x^{${2}}`}.`,
  objective: t`Use the standard factorisations, and spot a difference of squares in disguise.`,
  why: t`STEP expects these identities instantly; they unlock equations and number theory alike.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`The idea` },
    { kind: 'hook', text: t`${math`x^{${4}} + ${4}`} looks impossible to factorise: it is a sum of two squares, and those never split over the reals. Yet ${math`x^{${4}} + ${4} = (x^{${2}} - ${2}x + ${2})(x^{${2}} + ${2}x + ${2})`}. The trick is to add and subtract a well-chosen term.` },
    { kind: 'narrative', text: t`A handful of identities do most of the factorising in STEP. Each is checked by multiplying out, but you should know them on sight, and know how to make one appear.` },
    { kind: 'section', title: t`Squares and cubes` },
    {
      kind: 'definition',
      name: t`Difference of two squares`,
      formal: t`For all ${math`a`} and ${math`b`}, ${math`a^{${2}} - b^{${2}} \equiv (a - b)(a + b)`}. This is the [[difference-of-two-squares|difference of two squares]].`,
      plain: t`Any expression of the form "square minus square" splits. ${math`${101}^{${2}} - ${99}^{${2}} = ${2} \times ${200} = ${400}`}.`,
    },
    { kind: 'theorem', name: t`Sum and difference of two cubes`, statement: t`For all ${math`a`} and ${math`b`}: ${math`a^{${3}} - b^{${3}} = (a - b)(a^{${2}} + ab + b^{${2}})`} and ${math`a^{${3}} + b^{${3}} = (a + b)(a^{${2}} - ab + b^{${2}})`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Multiply out`, text: t`${math`(a - b)(a^{${2}} + ab + b^{${2}}) = a^{${3}} + a^{${2}}b + ab^{${2}} - a^{${2}}b - ab^{${2}} - b^{${3}}`}.` },
        { label: t`Cancel`, text: t`The middle terms cancel in pairs, leaving ${math`a^{${3}} - b^{${3}}`}.` },
        { label: t`Replace b by minus b`, text: t`The identity holds for every ${math`b`}, so also for ${math`-b`}: ${math`a^{${3}} + b^{${3}} = (a + b)(a^{${2}} - ab + b^{${2}})`}.`, plain: t`One identity gives the other for free: the [[sum-of-cubes|sum of two cubes]].` },
      ],
    },
    checkFrom(cubes, { k: 2, plus: false, c: 1 }, t`${math`x^{${3}} - ${8} = (x - ${2})(x^{${2}} + ${2}x + ${4})`}.`),
    { kind: 'pitfall', claim: t`${math`a^{${3}} + b^{${3}} = (a + b)^{${3}}`}.`, counterexample: t`${math`a = b = ${1}`}: ${math`${1} + ${1} = ${2}`}, but ${math`(${1} + ${1})^{${3}} = ${8}`}.` },
    { kind: 'section', title: t`Higher powers` },
    { kind: 'theorem', name: t`Difference of nth powers`, statement: t`For every integer ${math`n \ge ${1}`}, ${math`a^{n} - b^{n} = (a - b)(a^{n - ${1}} + a^{n - ${2}}b + \cdots + ab^{n - ${2}} + b^{n - ${1}})`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Name the long bracket`, text: t`Let ${math`S = a^{n - ${1}} + a^{n - ${2}}b + \cdots + ab^{n - ${2}} + b^{n - ${1}}`}: the terms ${math`a^{n - ${1} - k}b^{k}`} for ${math`k = ${0}, ${1}, \ldots, n - ${1}`}.`, plain: t`With ${math`n = ${4}`}, ${math`S = a^{${3}} + a^{${2}}b + ab^{${2}} + b^{${3}}`}.` },
        { label: t`Multiply by a`, text: t`${math`aS = a^{n} + a^{n - ${1}}b + \cdots + ab^{n - ${1}}`}: the terms ${math`a^{n - k}b^{k}`} for ${math`k = ${0}, \ldots, n - ${1}`}.`, plain: t`Each power of ${math`a`} goes up by one.` },
        { label: t`Multiply by b`, text: t`${math`bS = a^{n - ${1}}b + \cdots + ab^{n - ${1}} + b^{n}`}: the terms ${math`a^{n - k}b^{k}`} for ${math`k = ${1}, \ldots, n`}.`, plain: t`Each power of ${math`b`} goes up by one.` },
        { label: t`Subtract`, text: t`${math`(a - b)S = aS - bS`}. The terms with ${math`k = ${1}, \ldots, n - ${1}`} appear once in each list, so they cancel, leaving ${math`a^{n} - b^{n}`}.`, why: { q: t`Which terms survive?`, a: t`Only the ${math`k = ${0}`} term of ${math`aS`}, which is ${math`a^{n}`}, and the ${math`k = n`} term of ${math`bS`}, which is ${math`b^{n}`}. With ${math`n = ${4}`}: ${math`aS = a^{${4}} + a^{${3}}b + a^{${2}}b^{${2}} + ab^{${3}}`} and ${math`bS = a^{${3}}b + a^{${2}}b^{${2}} + ab^{${3}} + b^{${4}}`}.` } },
      ],
    },
    { kind: 'p', text: t`Nothing was divided, so the identity holds for every ${math`a`} and ${math`b`}, including ${math`a = ${0}`} and ${math`a = b`}. For odd ${math`n`}, replacing ${math`b`} by ${math`-b`} gives ${math`a^{n} + b^{n}`} with the factor ${math`a + b`}.`, why: { q: t`Why only odd ${math`n`}?`, a: t`For odd ${math`n`}, ${math`(-b)^{n} = -b^{n}`}, so ${math`a^{n} - (-b)^{n} = a^{n} + b^{n}`}. For even ${math`n`} the sign does not change.` } },
    { kind: 'section', title: t`Making a difference of squares` },
    { kind: 'narrative', text: t`Back to ${math`x^{${4}} + ${4}`}. Compare it with ${math`(x^{${2}} + ${2})^{${2}} = x^{${4}} + ${4}x^{${2}} + ${4}`}: it is that square minus ${math`${4}x^{${2}}`}, and ${math`${4}x^{${2}} = (${2}x)^{${2}}`}. So ${math`x^{${4}} + ${4} = (x^{${2}} + ${2})^{${2}} - (${2}x)^{${2}}`}, a difference of two squares. The same move gives ${math`x^{${4}} + ${1} = (x^{${2}} + ${1})^{${2}} - (\sqrt{${2}}x)^{${2}}`}.` },
    checkFrom(disguised, { k: 1 }, t`${math`x^{${4}} + ${4} = (x^{${2}} + ${2})^{${2}} - (${2}x)^{${2}} = (x^{${2}} - ${2}x + ${2})(x^{${2}} + ${2}x + ${2})`}.`),
    { kind: 'takeaway', text: t`Know ${math`a^{${2}} - b^{${2}}`}, ${math`a^{${3}} \pm b^{${3}}`}, and ${math`a^{n} - b^{n}`} on sight, and when you meet a sum, add and subtract a term to make a difference of squares.` },
  ],
  examples: [
    withExaminer(workedCambridge(a14ii), t`The cube recognised, the identity quoted, and the quadratic factor with the correct middle sign.`),
    worked(differenceOfSquares, { p: 2, q: 1, r: 1, s: -3 }, t`A difference of squares of brackets`),
    worked(disguised, { k: 2 }, t`A sum made into a difference`),
  ],
  generators: [differenceOfSquares, cubes, disguised],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['difference-of-two-squares', 'sum-of-cubes'],
  cambridge: withUses([a2i, a14six, a10ii, a14q1], {
    'a14-q1-ii-b': { sections: ['Squares and cubes', 'Higher powers'], note: t`Factorising a difference of sixth powers completely` },
    'a10-q4-ii': { sections: ['Squares and cubes'], note: t`Using the difference of cubes to solve for two numbers` },
  }),
  gate: ['a14-q1-ii-b', 'a10-q4-ii'],
  recall: [
    { front: t`${math`a^{${3}} - b^{${3}} = \ ?`}`, back: t`${math`(a - b)(a^{${2}} + ab + b^{${2}})`}.` },
    { front: t`${math`a^{${3}} + b^{${3}} = \ ?`}`, back: t`${math`(a + b)(a^{${2}} - ab + b^{${2}})`}.` },
    { front: t`How do you factorise ${math`x^{${4}} + ${4}`}?`, back: t`${math`(x^{${2}} + ${2})^{${2}} - (${2}x)^{${2}}`}, a difference of squares.` },
  ],
  proofOrder: [{
    title: t`The sum of two cubes`,
    steps: [
      t`Multiply out ${math`(a - b)(a^{${2}} + ab + b^{${2}})`}.`,
      t`The middle terms cancel, giving ${math`a^{${3}} - b^{${3}}`}.`,
      t`The identity holds for every ${math`b`}, so replace ${math`b`} by ${math`-b`}.`,
      t`That gives ${math`a^{${3}} + b^{${3}} = (a + b)(a^{${2}} - ab + b^{${2}})`}.`,
    ],
  }],
};
