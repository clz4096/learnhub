/**
 * alg.surds: simplify surds, multiply out brackets with them, and rationalise a
 * denominator. Sources: STEP Support Foundation Assignment 1 Q1 (the warm-up on surds),
 * Assignment 2 Q1(iii), Assignment 10 Q4(iv) (an 1858 Local Examinations question), and
 * Assignment 14 Q2(i), (ii). Every answer is computed: by exact arithmetic on pairs
 * (a, b) standing for a + b√n, and checked by floating point.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { int, pick, q, str, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { computedTex, math, t } from '../rich';
import { checkFrom, workedCambridge, worked, type TopicContent } from '../topic';
import { distinctFrom, named, namedAnswer, withExaminer } from '../prep-a';

const F01 = 'step-f01' as const;
const F01H = 'step-f01-hints' as const;
const SQUAREFREE = [2, 3, 5, 6, 7, 10, 11] as const;
const close = (a: number, b: number): boolean => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));

// ---------------------------------------------------------------- simplify and collect

interface SimP { a: number; b: number; d: number; m: number }
const simValue = ({ a, b, d }: SimP): number => a + b - d;
const simMis = ({ a, b, d }: SimP): number[] => [a * a + b * b - d * d, a + b + d, a * b - d];

const simplifySum = generator<SimP>({
  id: 'simplify-sum',
  skill: 'Simplify each surd by taking out its largest square factor, then collect the like surds.',
  quick: true,
  params: (rng) => {
    for (;;) {
      const p: SimP = { a: int(rng, 2, 6), b: int(rng, 2, 6), d: int(rng, 1, 5), m: pick(rng, SQUAREFREE) };
      if (p.a === p.b || simValue(p) === 0) continue;
      if (distinctFrom(String(simValue(p)), simMis(p).map(String)) >= 2) return p;
    }
  },
  sane: ({ a, b, d, m }) => (a >= 2 && b >= 2 && d >= 1 && SQUAREFREE.includes(m as never) ? null : 'out of range'),
  problem: (p) => {
    const { a, b, d, m } = p;
    const [A, B, C] = [a * a * m, b * b * m, d * d * m];
    return {
      prompt: t`Write ${math`\sqrt{${A}} + \sqrt{${B}} - \sqrt{${C}}`} in the form ${math`c\sqrt{${m}}`}. Find ${math`c`}.`,
      answer: { kind: 'exact', expected: String(simValue(p)) },
      solution: [
        t`Find the largest square factor of each number: ${math`${A} = ${a * a} \times ${m}`}, ${math`${B} = ${b * b} \times ${m}`}, and ${math`${C} = ${d * d} \times ${m}`}.`,
        t`Since ${math`\sqrt{xy} = \sqrt{x}\sqrt{y}`}: ${math`\sqrt{${A}} = ${a}\sqrt{${m}}`}, ${math`\sqrt{${B}} = ${b}\sqrt{${m}}`}, and ${math`\sqrt{${C}} = ${d === 1 ? '' : d}\sqrt{${m}}`}.`,
        t`Now they are like terms, all multiples of ${math`\sqrt{${m}}`}: ${math`${a} + ${b} - ${d} = ${simValue(p)}`}, so ${math`c = ${simValue(p)}`}.`,
      ],
    };
  },
  solve: (p) => {
    // Floating point: divide the whole sum by √m and round.
    const { a, b, d, m } = p;
    const v = (Math.sqrt(a * a * m) + Math.sqrt(b * b * m) - Math.sqrt(d * d * m)) / Math.sqrt(m);
    return String(Math.round(v));
  },
  misconceptions: (p): Misconception[] => {
    const [notRooted, sign, product] = simMis(p) as [number, number, number];
    return [
      { response: String(notRooted), why: t`You took out the square factor itself, not its square root. ${math`\sqrt{${p.a * p.a} \times ${p.m}} = ${p.a}\sqrt{${p.m}}`}, because ${math`\sqrt{${p.a * p.a}} = ${p.a}`}.` },
      { response: String(sign), why: t`The last surd is subtracted: ${math`-\sqrt{${p.d * p.d * p.m}} = -${p.d === 1 ? '' : p.d}\sqrt{${p.m}}`}.` },
      { response: String(product), why: t`Like surds add like like terms: ${math`${p.a}\sqrt{${p.m}} + ${p.b}\sqrt{${p.m}} = ${p.a + p.b}\sqrt{${p.m}}`}, just as ${math`${p.a}x + ${p.b}x = ${p.a + p.b}x`}. Nothing is multiplied.` },
    ];
  },
});

// ---------------------------------------------------------------- squaring a + b√n

interface SqP { p: number; r: number; n: number }
const sq = ({ p, r, n }: SqP): [number, number] => [p * p + r * r * n, 2 * p * r];
const sqMis = ({ p, r, n }: SqP): [number, number][] => [[p * p + r * r * n, 0], [p * p + r * r, 2 * p * r], [p * p + r * r * n, p * r]];
const SQ_NAMES = ['a', 'b'] as const;
const pairKey = (x: [number, number]): string => x.join(',');

const squareSurd = generator<SqP>({
  id: 'square-surd',
  skill: 'Square a bracket with a surd in it, remembering the middle term and that the square of a root is the number under it.',
  params: (rng) => {
    for (;;) {
      const p: SqP = { p: pick(rng, [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]), r: pick(rng, [-3, -2, -1, 1, 2, 3, 4]), n: pick(rng, SQUAREFREE) };
      if (distinctFrom(pairKey(sq(p)), sqMis(p).map(pairKey)) >= 2) return p;
    }
  },
  sane: ({ p, r, n }) => (p !== 0 && r !== 0 && SQUAREFREE.includes(n as never) ? null : 'out of range'),
  problem: (pp) => {
    const { p, r, n } = pp;
    const [a, b] = sq(pp);
    const inner = computedTex(`${p} ${r < 0 ? '-' : '+'} ${Math.abs(r) === 1 ? '' : Math.abs(r)}\\sqrt{${n}}`);
    return {
      prompt: t`Write ${math`(${inner})^{${2}}`} in the form ${math`a + b\sqrt{${n}}`}, where ${math`a`} and ${math`b`} are integers. Give ${math`a`} and ${math`b`}.`,
      answer: namedAnswer(SQ_NAMES, [q(a), q(b)], 'Multiply the bracket by itself term by term and check each of the four products.'),
      solution: [
        t`Use ${math`(x + y)^{${2}} = x^{${2}} + ${2}xy + y^{${2}}`} with ${math`x = ${p}`} and ${math`y = ${r}\sqrt{${n}}`}.`,
        t`${math`x^{${2}} = ${p * p}`}; ${math`${2}xy = ${2} \times ${p} \times ${r}\sqrt{${n}} = ${b}\sqrt{${n}}`}; ${math`y^{${2}} = ${r * r} \times (\sqrt{${n}})^{${2}} = ${r * r} \times ${n} = ${r * r * n}`}.`,
        t`Collect the whole numbers: ${math`${p * p} + ${r * r * n} = ${a}`}. So ${math`a = ${a}`} and ${math`b = ${b}`}.`,
      ],
    };
  },
  solve: ({ p, r, n }) => {
    // Search: the integers a, b with a + b√n equal to the square, found numerically.
    const target = (p + r * Math.sqrt(n)) ** 2;
    for (let b = -60; b <= 60; b++) {
      const a = Math.round(target - b * Math.sqrt(n));
      if (close(a + b * Math.sqrt(n), target)) return named(SQ_NAMES, [q(a), q(b)]);
    }
    return 'none';
  },
  misconceptions: (pp): Misconception[] => {
    const [each, rootSq, noTwo] = sqMis(pp);
    const nm = (x: [number, number] | undefined): string => named(SQ_NAMES, (x as [number, number]).map((v) => q(v)));
    return [
      { response: nm(each), why: t`A square of a sum is not the sum of the squares: ${math`(x + y)^{${2}} = x^{${2}} + ${2}xy + y^{${2}}`}. The middle term ${math`${2}xy`} gives the surd part.` },
      { response: nm(rootSq), why: t`${math`(\sqrt{${pp.n}})^{${2}} = ${pp.n}`}, not ${1}: so ${math`(${pp.r}\sqrt{${pp.n}})^{${2}} = ${pp.r * pp.r} \times ${pp.n}`}.` },
      { response: nm(noTwo), why: t`The middle term is ${math`${2}xy`}, twice the product: the two cross products ${math`xy`} and ${math`yx`} are equal.` },
    ];
  },
});

// ---------------------------------------------------------------- rationalising

interface RatP { p: number; r: number; n: number }
const den = ({ p, r, n }: RatP): number => p * p - r * r * n;
const ratAns = (x: RatP): [Rational, Rational] => [q(x.p, den(x)), q(-x.r, den(x))];
const ratMis = (x: RatP): [Rational, Rational][] => {
  const plus = x.p * x.p + x.r * x.r * x.n;
  const once = x.p * x.p - x.r * x.n;
  return [[q(x.p, den(x)), q(x.r, den(x))], [q(x.p, plus), q(-x.r, plus)], ...(once === 0 ? [] : [[q(x.p, once), q(-x.r, once)] as [Rational, Rational]])];
};
const ratKey = (x: [Rational, Rational]): string => x.map(str).join(',');

const rationalise = generator<RatP>({
  id: 'rationalise',
  skill: 'Rationalise a denominator by multiplying the top and bottom by the conjugate.',
  params: (rng) => {
    for (;;) {
      const x: RatP = { p: int(rng, 1, 6), r: pick(rng, [-3, -2, -1, 1, 2, 3]), n: pick(rng, SQUAREFREE) };
      if (distinctFrom(ratKey(ratAns(x)), ratMis(x).map(ratKey)) >= 2) return x;
    }
  },
  sane: (x) => (x.p >= 1 && x.r !== 0 && den(x) !== 0 ? null : 'out of range'),
  problem: (x) => {
    const { p, r, n } = x;
    const D = den(x);
    const [a, b] = ratAns(x);
    const sgn = r < 0 ? '-' : '+';
    const conjSgn = r < 0 ? '+' : '-';
    const R = computedTex(Math.abs(r) === 1 ? '' : String(Math.abs(r)));
    return {
      prompt: t`Write ${math`\frac{${1}}{${p} ${sgn} ${R}\sqrt{${n}}}`} in the form ${math`a + b\sqrt{${n}}`}, where ${math`a`} and ${math`b`} are rational. Give ${math`a`} and ${math`b`}.`,
      answer: namedAnswer(SQ_NAMES, [a, b], 'Multiply the top and the bottom by the conjugate, then simplify the bottom with the difference of two squares.'),
      solution: [
        t`Multiply the top and the bottom by the conjugate ${math`${p} ${conjSgn} ${R}\sqrt{${n}}`}: that multiplies the fraction by ${1}, so its value does not change.`,
        t`The bottom becomes a difference of two squares: ${math`${p}^{${2}} - (${R}\sqrt{${n}})^{${2}} = ${p * p} - ${r * r * n} = ${D}`}, a whole number.`,
        t`So the fraction is ${math`\frac{${p} ${conjSgn} ${R}\sqrt{${n}}}{${D}}`}: ${math`a = ${a}`} and ${math`b = ${b}`}.`,
      ],
    };
  },
  solve: ({ p, r, n }) => {
    // Equate coefficients: (a + b√n)(p + r√n) = 1 means ap + brn = 1 and ar + bp = 0; Cramer's rule.
    const det = p * p - r * n * r;
    return named(SQ_NAMES, [q(p, det), q(-r, det)]);
  },
  misconceptions: (x): Misconception[] => {
    const [sign, plus, once] = ratMis(x);
    const nm = (v: [Rational, Rational]): string => named(SQ_NAMES, v);
    const out: Misconception[] = [
      { response: nm(sign as [Rational, Rational]), why: t`The conjugate changes the sign in front of the surd, so the surd part of the top has the opposite sign to the one in the bottom.` },
      { response: nm(plus as [Rational, Rational]), why: t`${math`(p + q\sqrt{n})(p - q\sqrt{n}) = p^{${2}} - q^{${2}}n`}: the difference of two squares has a minus sign.` },
    ];
    if (once !== undefined) out.push({ response: nm(once), why: t`Square the whole of ${math`${Math.abs(x.r)}\sqrt{${x.n}}`}: ${math`(${Math.abs(x.r)}\sqrt{${x.n}})^{${2}} = ${x.r * x.r} \times ${x.n}`}, so the number in front is squared too.` });
    return out;
  },
});

// ---------------------------------------------------------------- Cambridge problems

const R5 = Math.sqrt(5);
const R2 = Math.sqrt(2);
const R3 = Math.sqrt(3);
const R6 = Math.sqrt(6);

const cube = auto({
  id: 'a1-q1-ii',
  source: cite(F01, 'Q1(ii)'),
  title: t`A cube of a surd`,
  prompt: t`Express ${math`(${3} + ${2}\sqrt{${5}})^{${3}}`} in the form ${math`a + b\sqrt{${5}}`}, where ${math`a`} and ${math`b`} are integers. Give ${math`a`} and ${math`b`}.`,
  answer: namedAnswer(SQ_NAMES, [q(207), q(94)], 'Square the bracket first, then multiply by the bracket once more.'),
  solution: [
    t`Square first, with ${math`(x + y)^{${2}} = x^{${2}} + ${2}xy + y^{${2}}`}: ${math`(${3} + ${2}\sqrt{${5}})^{${2}} = ${9} + ${12}\sqrt{${5}} + ${4} \times ${5} = ${29} + ${12}\sqrt{${5}}`}.`,
    t`Multiply by the bracket once more, every term by every term: ${math`(${29} + ${12}\sqrt{${5}})(${3} + ${2}\sqrt{${5}}) = ${87} + ${58}\sqrt{${5}} + ${36}\sqrt{${5}} + ${24} \times ${5}`}.`,
    t`Collect: ${math`${87} + ${120} = ${207}`} and ${math`${58} + ${36} = ${94}`}. So ${math`(${3} + ${2}\sqrt{${5}})^{${3}} = ${207} + ${94}\sqrt{${5}}`}.`,
  ],
  reference: 'a = 207, b = 94',
  verify: () => (close(207 + 94 * R5, (3 + 2 * R5) ** 3) ? same('29 + 12√5 times 3 + 2√5', `${29 * 3 + 24 * 5},${29 * 2 + 12 * 3}`, '207,94') : 'the cube does not match'),
  misconceptions: [{ response: 'a = 27, b = 40', why: t`Cubing each term gives ${math`${27} + ${40}\sqrt{${5}}`}, but ${math`(x + y)^{${3}} \ne x^{${3}} + y^{${3}}`}: the cross terms are missing.` }],
  official: { source: cite(F01H, 'Q1(ii)'), answer: 'a = 207, b = 94', agrees: true },
});

const simplest = auto({
  id: 'a1-q1-i',
  source: cite(F01, 'Q1(i)'),
  title: t`Two surds as one`,
  prompt: t`Simplify ${math`\sqrt{${50}} + \sqrt{${18}}`}, writing it as ${math`c\sqrt{m}`} with ${math`c`} and ${math`m`} whole numbers and ${math`m`} as small as possible. Give ${math`c`} and ${math`m`}.`,
  answer: namedAnswer(['c', 'm'], [q(8), q(2)], 'Take the largest square factor out of each root.'),
  solution: [
    t`${math`${50} = ${25} \times ${2}`} and ${math`${18} = ${9} \times ${2}`}, so ${math`\sqrt{${50}} = ${5}\sqrt{${2}}`} and ${math`\sqrt{${18}} = ${3}\sqrt{${2}}`}.`,
    t`Like surds add: ${math`${5}\sqrt{${2}} + ${3}\sqrt{${2}} = ${8}\sqrt{${2}}`}.`,
  ],
  reference: 'c = 8, m = 2',
  verify: () => (close(8 * R2, Math.sqrt(50) + Math.sqrt(18)) ? null : 'the sum is not 8√2'),
  misconceptions: [{ response: 'c = 1, m = 68', why: t`${math`\sqrt{${50}} + \sqrt{${18}}`} is not ${math`\sqrt{${68}}`}: roots do not add like that. Try it with ${math`\sqrt{${9}} + \sqrt{${16}} = ${7}`}, while ${math`\sqrt{${25}} = ${5}`}.` }],
  official: { source: cite(F01H, 'Q1(i)'), answer: 'c = 8, m = 2', agrees: true },
});

const threeTerms = auto({
  id: 'a1-q1-iii',
  source: cite(F01, 'Q1(iii)'),
  title: t`Squaring three terms`,
  prompt: t`Expand and simplify ${math`(${1} - \sqrt{${2}} + \sqrt{${6}})^{${2}}`}, writing it as ${math`a + b\sqrt{${2}} + c\sqrt{${3}} + d\sqrt{${6}}`} with ${math`a, b, c, d`} integers. Give ${math`a, b, c, d`}.`,
  answer: namedAnswer(['a', 'b', 'c', 'd'], [q(9), q(-2), q(-4), q(2)], 'Lay the nine products out in a three by three table, and simplify the square root of twelve.'),
  solution: [
    t`Multiply every term by every term (a three by three table): the squares are ${math`${1}`}, ${math`${2}`}, ${math`${6}`}; each cross product appears twice: ${math`${2} \times (-\sqrt{${2}})`}, ${math`${2} \times \sqrt{${6}}`}, ${math`${2} \times (-\sqrt{${2}})\sqrt{${6}}`}.`,
    t`${math`\sqrt{${2}}\sqrt{${6}} = \sqrt{${12}} = ${2}\sqrt{${3}}`}, so the last cross term is ${math`-${4}\sqrt{${3}}`}.`,
    t`Collect: ${math`${1} + ${2} + ${6} - ${2}\sqrt{${2}} + ${2}\sqrt{${6}} - ${4}\sqrt{${3}} = ${9} - ${2}\sqrt{${2}} - ${4}\sqrt{${3}} + ${2}\sqrt{${6}}`}.`,
  ],
  reference: 'a = 9, b = -2, c = -4, d = 2',
  verify: () => (close(9 - 2 * R2 - 4 * R3 + 2 * R6, (1 - R2 + R6) ** 2) ? null : 'the expansion does not match'),
  misconceptions: [{ response: 'a = 9, b = 0, c = 0, d = 0', why: t`Squaring each term and adding leaves out the six cross products, which carry all the surds.` }],
  official: { source: cite(F01H, 'Q1(iii)'), answer: 'a = 9, b = -2, c = -4, d = 2', agrees: true },
});

const hidden = auto({
  id: 'a1-q1-iv',
  source: cite(F01, 'Q1(iv)'),
  title: t`A hidden quadratic with surd roots`,
  prompt: t`Expand ${math`(${1} + \sqrt{${2}})^{${2}}`}. Then find the largest real ${math`x`} with ${math`x^{${2}} + \frac{${4}}{x^{${2}}} = ${12}`}, as a surd. (Type a square root as sqrt.)`,
  answer: { kind: 'expression', expected: '2 + sqrt(2)', variables: [] },
  solution: [
    t`${math`(${1} + \sqrt{${2}})^{${2}} = ${1} + ${2}\sqrt{${2}} + ${2} = ${3} + ${2}\sqrt{${2}}`}.`,
    t`Multiply by ${math`x^{${2}}`} (not ${0}): ${math`x^{${4}} - ${12}x^{${2}} + ${4} = ${0}`}, a quadratic in ${math`x^{${2}}`}, so ${math`x^{${2}} = \frac{${12} \pm \sqrt{${144} - ${16}}}{${2}} = ${6} \pm ${4}\sqrt{${2}}`}.`,
    t`${math`${6} + ${4}\sqrt{${2}} = ${2}(${3} + ${2}\sqrt{${2}}) = ${2}(${1} + \sqrt{${2}})^{${2}}`}, so its square roots are ${math`\pm\sqrt{${2}}(${1} + \sqrt{${2}}) = \pm(${2} + \sqrt{${2}})`}. In the same way ${math`${6} - ${4}\sqrt{${2}}`} gives ${math`\pm(${2} - \sqrt{${2}})`}.`,
    t`The four solutions are ${math`\pm(${2} + \sqrt{${2}})`} and ${math`\pm(${2} - \sqrt{${2}})`}; the largest is ${math`${2} + \sqrt{${2}}`}.`,
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

const conjugates = auto({
  id: 'a14-q2-i',
  source: cite('step-f14', 'Q2(i)'),
  title: t`Two conjugate fractions`,
  prompt: t`Simplify ${math`\frac{${1}}{${3} + \sqrt{${5}}} + \frac{${1}}{${3} - \sqrt{${5}}}`}.`,
  answer: { kind: 'exact', expected: '3/2' },
  solution: [
    t`Use the common denominator ${math`(${3} + \sqrt{${5}})(${3} - \sqrt{${5}}) = ${9} - ${5} = ${4}`}.`,
    t`The tops add to ${math`(${3} - \sqrt{${5}}) + (${3} + \sqrt{${5}}) = ${6}`}, so the sum is ${math`\frac{${6}}{${4}} = ${q(3, 2)}`}.`,
  ],
  reference: '3/2',
  verify: () => (close(1 / (3 + R5) + 1 / (3 - R5), 1.5) ? null : 'the sum is not 3/2'),
  misconceptions: [{ response: '3/7', why: t`The denominator is ${math`${9} - ${5}`}, not ${math`${9} + ${5}`}: the surd terms cancel when the brackets are multiplied.` }],
  official: { source: cite('step-f14-hints', 'Q2(i)'), answer: '3/2', agrees: true },
});

const geometric = auto({
  id: 'a14-q2-ii',
  source: cite('step-f14', 'Q2(ii)'),
  title: t`A geometric series with a surd ratio`,
  prompt: t`Explain why ${math`\frac{${1} + \sqrt{${3}}}{${3}} < ${1}`}, and find the sum of the infinite geometric series ${math`${1} + \frac{${1} + \sqrt{${3}}}{${3}} + \left(\frac{${1} + \sqrt{${3}}}{${3}}\right)^{${2}} + \cdots`} in the form ${math`a + b\sqrt{${3}}`}. Give ${math`a`} and ${math`b`}.`,
  answer: namedAnswer(SQ_NAMES, [q(6), q(3)], 'Use the sum to infinity, then rationalise the denominator.'),
  solution: [
    t`${math`\sqrt{${3}} < ${2}`} because ${math`${3} < ${4}`}, so the ratio ${math`r = \frac{${1} + \sqrt{${3}}}{${3}} < \frac{${1} + ${2}}{${3}} = ${1}`}; it is also positive, so the series converges.`,
    t`The sum is ${math`\frac{${1}}{${1} - r} = \frac{${1}}{\frac{${3} - ${1} - \sqrt{${3}}}{${3}}} = \frac{${3}}{${2} - \sqrt{${3}}}`}.`,
    t`Rationalise: multiply the top and bottom by ${math`${2} + \sqrt{${3}}`}; the bottom becomes ${math`${4} - ${3} = ${1}`}, so the sum is ${math`${3}(${2} + \sqrt{${3}}) = ${6} + ${3}\sqrt{${3}}`}.`,
  ],
  reference: 'a = 6, b = 3',
  verify: () => {
    const r = (1 + R3) / 3;
    let s = 0;
    for (let k = 0; k < 400; k++) s += r ** k;
    return Math.abs(s - (6 + 3 * R3)) < 1e-9 ? null : `partial sums reach ${s}`;
  },
  misconceptions: [{ response: 'a = 6, b = -3', why: t`Multiplying by the conjugate ${math`${2} + \sqrt{${3}}`} gives a plus sign on top. Check: ${math`${6} - ${3}\sqrt{${3}}`} is less than ${1}, but the series starts ${math`${1} + r + \cdots`} with ${math`r > ${0}`}.` }],
  official: { source: cite('step-f14-hints', 'Q2(ii)'), answer: 'a = 6, b = 3', agrees: true },
});

const local1858 = auto({
  id: 'a10-q4-iv',
  source: cite('step-f10', 'Q4(iv)'),
  title: t`An ${1858} examination surd`,
  prompt: t`From the first Cambridge Local Examinations, ${1858}: simplify ${math`\frac{\sqrt{${12} + ${6}\sqrt{${3}}}}{\sqrt{${3}} + ${1}}`}. (Type a square root as sqrt.)`,
  answer: { kind: 'expression', expected: 'sqrt(3)', variables: [] },
  solution: [
    t`Look for a square: ${math`(${3} + \sqrt{${3}})^{${2}} = ${9} + ${6}\sqrt{${3}} + ${3} = ${12} + ${6}\sqrt{${3}}`}, so ${math`\sqrt{${12} + ${6}\sqrt{${3}}} = ${3} + \sqrt{${3}}`} (it is positive).`,
    t`Factor the top: ${math`${3} + \sqrt{${3}} = \sqrt{${3}}(\sqrt{${3}} + ${1})`}, so the fraction is ${math`\sqrt{${3}}`}.`,
  ],
  reference: 'sqrt(3)',
  verify: () => (close(Math.sqrt(12 + 6 * R3) / (R3 + 1), R3) ? null : 'the value is not √3'),
  misconceptions: [{ response: '3', why: t`The square root of ${math`${12} + ${6}\sqrt{${3}}`} is ${math`${3} + \sqrt{${3}}`}, and dividing by ${math`\sqrt{${3}} + ${1}`} leaves ${math`\sqrt{${3}}`}, not ${3}.` }],
});

const largeX = supervision({
  id: 'a2-q1-iii',
  source: cite('step-f02', 'Q1(iii)'),
  title: t`A difference of roots for large ${math`x`}`,
  prompt: t`Show that ${math`\sqrt{${1} + x^{${2}}} - x = \frac{${1}}{\sqrt{${1} + x^{${2}}} + x}`}. Deduce that if ${math`x`} is very large, then ${math`\sqrt{${1} + x^{${2}}} - x`} is approximately equal to ${math`\frac{${1}}{${2}x}`}.`,
  writeUp: 'proof',
  official: cite('step-f02-hints', 'Q1(iii)'),
});

// ---------------------------------------------------------------- lesson

const SIM_EX: SimP = { a: 5, b: 3, d: 2, m: 2 };
const SQ_EX: SqP = { p: 2, r: 3, n: 5 };
const RAT_EX: RatP = { p: 3, r: 1, n: 5 };

export const surds: TopicContent = {
  topicId: 'alg.surds',
  goal: t`Simplify surds, multiply out brackets that contain them, and rationalise a denominator such as ${math`\frac{${1}}{${3} + \sqrt{${5}}}`}.`,
  objective: t`Simplify surds, expand brackets with them, and clear a surd from a denominator.`,
  why: t`STEP expects exact answers, never decimals; surds are how exact answers look.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`The idea` },
    { kind: 'hook', text: t`Here is a sum that looks stuck: ${math`\sqrt{${50}} + \sqrt{${18}}`}. Neither number is a perfect square, so neither root is a whole number. Yet the sum is exactly ${math`${8}\sqrt{${2}}`}, a single tidy term. Where did that come from?` },
    { kind: 'narrative', text: t`The trick is that ${50} hides a square: ${math`${50} = ${25} \times ${2}`}. If a square root of a product splits into a product of square roots, then ${math`\sqrt{${50}} = \sqrt{${25}}\sqrt{${2}} = ${5}\sqrt{${2}}`}. In the same way ${math`\sqrt{${18}} = ${3}\sqrt{${2}}`}. Now both are multiples of the same thing, ${math`\sqrt{${2}}`}, and they add like ${math`${5}x + ${3}x`}.` },
    { kind: 'narrative', text: t`This lesson makes that "if" precise, then uses it three ways: to simplify, to multiply out brackets, and to move a root out of the bottom of a fraction.` },
    { kind: 'section', title: t`Square roots and surds` },
    {
      kind: 'definition',
      name: t`Square root`,
      formal: t`For a real number ${math`a \ge ${0}`}, the [[surd|square root]] ${math`\sqrt{a}`} is the unique real number ${math`r \ge ${0}`} with ${math`r^{${2}} = a`}.`,
      plain: t`${math`\sqrt{a}`} is the non-negative number that squares to ${math`a`}. Both ${3} and ${math`-${3}`} square to ${9}, but ${math`\sqrt{${9}}`} means ${3} only.`,
    },
    {
      kind: 'definition',
      name: t`Surd`,
      formal: t`If ${math`n`} is a positive integer that is not a perfect square, ${math`\sqrt{n}`} is irrational, and it is called a [[surd|surd]]. An expression ${math`a + b\sqrt{n}`} with ${math`a, b \in \mathbb{Q}`} is in surd form.`,
      plain: t`A surd is a root you cannot write as a fraction, such as ${math`\sqrt{${2}}`} or ${math`\sqrt{${7}}`}. We keep it as a root, because any decimal for it is only approximate. (${math`\mathbb{Q}`} is the set of fractions. That ${math`\sqrt{n}`} is irrational is proved like the irrationality of ${math`\sqrt{${2}}`}; here we take it as known.)`,
    },
    { kind: 'theorem', name: t`Roots of a product`, statement: t`If ${math`a \ge ${0}`} and ${math`b \ge ${0}`}, then ${math`\sqrt{ab} = \sqrt{a}\sqrt{b}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Both sides are non-negative`, text: t`${math`\sqrt{a} \ge ${0}`} and ${math`\sqrt{b} \ge ${0}`}, so ${math`\sqrt{a}\sqrt{b} \ge ${0}`}.`, plain: t`A product of two non-negative numbers is non-negative.` },
        { label: t`Square the right side`, text: t`${math`(\sqrt{a}\sqrt{b})^{${2}} = (\sqrt{a})^{${2}}(\sqrt{b})^{${2}} = ab`}.`, plain: t`Squaring a product squares each factor, and each root squared gives back its number.` },
        { label: t`Use uniqueness`, text: t`So ${math`\sqrt{a}\sqrt{b}`} is a non-negative number whose square is ${math`ab`}. By the definition, that number is ${math`\sqrt{ab}`}.`, plain: t`There is only one non-negative number that squares to ${math`ab`}, and both sides are it.`, why: { q: t`Why is there only one?`, a: t`If ${math`r \ge ${0}`} and ${math`s \ge ${0}`} both square to ${math`ab`}, then ${math`${0} = r^{${2}} - s^{${2}} = (r - s)(r + s)`}. Either ${math`r = s`}, or ${math`r + s = ${0}`}, which for two non-negative numbers forces ${math`r = s = ${0}`}.` } },
      ],
    },
    { kind: 'narrative', text: t`So to simplify ${math`\sqrt{N}`}, write ${math`N = k^{${2}}m`} with ${math`k^{${2}}`} the largest square that divides ${math`N`}; then ${math`\sqrt{N} = k\sqrt{m}`}. For ${math`N = ${72}`}: the largest square factor is ${36}, so ${math`\sqrt{${72}} = \sqrt{${36}}\sqrt{${2}} = ${6}\sqrt{${2}}`}.` },
    checkFrom(simplifySum, SIM_EX, t`${math`\sqrt{${50}} = ${5}\sqrt{${2}}`}, ${math`\sqrt{${18}} = ${3}\sqrt{${2}}`}, and ${math`\sqrt{${8}} = ${2}\sqrt{${2}}`}, so ${math`c = ${5} + ${3} - ${2} = ${6}`}.`),
    { kind: 'pitfall', claim: t`${math`\sqrt{a + b} = \sqrt{a} + \sqrt{b}`}.`, counterexample: t`${math`\sqrt{${9} + ${16}} = \sqrt{${25}} = ${5}`}, but ${math`\sqrt{${9}} + \sqrt{${16}} = ${3} + ${4} = ${7}`}. Roots split over products, never over sums.` },
    { kind: 'section', title: t`Multiplying out` },
    { kind: 'narrative', text: t`Brackets with surds multiply out exactly like brackets with a letter, with one extra rule: whenever ${math`\sqrt{n}`} meets itself, it becomes ${math`n`}. So a product of two surd forms is again a surd form.` },
    {
      kind: 'rule',
      text: t`${math`(p + q\sqrt{n})(r + s\sqrt{n}) = (pr + qsn) + (ps + qr)\sqrt{n}`}`,
      why: { q: t`Where does the ${math`qsn`} come from?`, a: t`Multiply every term by every term: ${math`pr + ps\sqrt{n} + qr\sqrt{n} + qs(\sqrt{n})^{${2}}`}. The last product is ${math`qsn`}, because ${math`(\sqrt{n})^{${2}} = n`}; it joins the whole-number part.` },
    },
    {
      kind: 'steps',
      steps: [
        { label: t`Name the parts`, text: t`To square ${math`${2} + ${3}\sqrt{${5}}`}, use ${math`(x + y)^{${2}} = x^{${2}} + ${2}xy + y^{${2}}`} with ${math`x = ${2}`} and ${math`y = ${3}\sqrt{${5}}`}.` },
        { label: t`Each piece`, text: t`${math`x^{${2}} = ${4}`}, ${math`${2}xy = ${12}\sqrt{${5}}`}, and ${math`y^{${2}} = ${9} \times ${5} = ${45}`}.`, plain: t`The whole of ${math`${3}\sqrt{${5}}`} is squared: the ${3} gives ${9} and the root gives ${5}.` },
        { label: t`Collect`, text: t`${math`(${2} + ${3}\sqrt{${5}})^{${2}} = ${49} + ${12}\sqrt{${5}}`}.` },
      ],
    },
    checkFrom(squareSurd, { p: 1, r: 1, n: 2 }, t`${math`(${1} + \sqrt{${2}})^{${2}} = ${1} + ${2}\sqrt{${2}} + ${2} = ${3} + ${2}\sqrt{${2}}`}: the middle term gives the surd part.`),
    { kind: 'section', title: t`Rationalising a denominator` },
    { kind: 'narrative', text: t`A root on the bottom of a fraction is awkward: you cannot add ${math`\frac{${1}}{${3} + \sqrt{${5}}}`} to anything easily. Here is the way out. You already know ${math`(x + y)(x - y) = x^{${2}} - y^{${2}}`}. If ${math`y`} is a surd, then ${math`y^{${2}}`} is a whole number, so the product has no surd at all.` },
    {
      kind: 'definition',
      name: t`Conjugate`,
      formal: t`The [[conjugate|conjugate]] of ${math`p + q\sqrt{n}`} is ${math`p - q\sqrt{n}`}. To [[rationalise-denominator|rationalise the denominator]] of a fraction is to rewrite it with no surd in the denominator.`,
      plain: t`Same numbers, opposite sign in front of the root: the conjugate of ${math`${3} + \sqrt{${5}}`} is ${math`${3} - \sqrt{${5}}`}.`,
    },
    { kind: 'theorem', name: t`Conjugates multiply to a rational`, statement: t`Let ${math`p, q \in \mathbb{Q}`}, not both ${0}, and let ${math`n`} be a positive integer that is not a perfect square. Then ${math`(p + q\sqrt{n})(p - q\sqrt{n}) = p^{${2}} - q^{${2}}n`}, which is rational and not ${0}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Multiply out`, text: t`${math`(p + q\sqrt{n})(p - q\sqrt{n}) = p^{${2}} - pq\sqrt{n} + pq\sqrt{n} - q^{${2}}(\sqrt{n})^{${2}} = p^{${2}} - q^{${2}}n`}.`, plain: t`The two middle terms cancel, and the root squared is ${math`n`}.` },
        { label: t`It is rational`, text: t`${math`p`}, ${math`q`}, ${math`n`} are rational, and sums and products of rationals are rational.` },
        { label: t`It is not zero`, text: t`Suppose ${math`p^{${2}} = q^{${2}}n`}. If ${math`q = ${0}`} then ${math`p = ${0}`} too, which is excluded. If ${math`q \ne ${0}`} then ${math`n = (p/q)^{${2}}`}, so ${math`\sqrt{n} = |p/q|`} is rational, which contradicts the definition of a surd.`, why: { q: t`Why is ${math`\sqrt{n} = |p/q|`}?`, a: t`${math`|p/q|`} is non-negative and squares to ${math`n`}, and the square root is the unique such number.` } },
      ],
    },
    {
      kind: 'steps',
      steps: [
        { label: t`Multiply by one`, text: t`${math`\frac{${1}}{${3} + \sqrt{${5}}} = \frac{${1}}{${3} + \sqrt{${5}}} \times \frac{${3} - \sqrt{${5}}}{${3} - \sqrt{${5}}}`}.`, plain: t`The new fraction is ${1}, so the value is unchanged.` },
        { label: t`The bottom`, text: t`${math`(${3} + \sqrt{${5}})(${3} - \sqrt{${5}}) = ${9} - ${5} = ${4}`}.` },
        { label: t`The answer`, text: t`${math`\frac{${1}}{${3} + \sqrt{${5}}} = \frac{${3} - \sqrt{${5}}}{${4}}`}.`, plain: t`Check with decimals: both sides are about ${Number((1 / (3 + Math.sqrt(5))).toFixed(4))}.` },
      ],
    },
    checkFrom(rationalise, RAT_EX, t`Multiply top and bottom by ${math`${3} - \sqrt{${5}}`}: the bottom is ${math`${9} - ${5} = ${4}`}, so ${math`a = ${q(3, 4)}`} and ${math`b = ${q(-1, 4)}`}.`),
    { kind: 'pitfall', claim: t`To rationalise ${math`\frac{${1}}{${3} + \sqrt{${5}}}`}, multiply the bottom by ${math`${3} - \sqrt{${5}}`}.`, counterexample: t`Multiplying only the bottom changes the value: ${math`\frac{${1}}{${4}}`} is not ${math`\frac{${1}}{${3} + \sqrt{${5}}}`}. Multiply the top by the same thing, so you multiply by ${1}.` },
    { kind: 'takeaway', text: t`Take out square factors, treat ${math`\sqrt{n}`} like a letter that squares to ${math`n`}, and clear a surd from a denominator with its conjugate.` },
  ],
  examples: [
    withExaminer(workedCambridge(cube), t`A clear square-then-multiply layout, every product shown, and the root squared to ${5} before collecting. No decimals.`),
    worked(simplifySum, SIM_EX, t`Simplify, then collect`),
    worked(squareSurd, SQ_EX, t`Squaring a surd form`),
  ],
  generators: [simplifySum, squareSurd, rationalise],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['surd', 'conjugate', 'rationalise-denominator'],
  cambridge: [simplest, threeTerms, hidden, conjugates, geometric, local1858, largeX],
  gate: ['a1-q1-iii', 'a1-q1-iv', 'a14-q2-ii', 'a2-q1-iii'],
  recall: [
    { front: t`State the rule for the square root of a product.`, back: t`For ${math`a, b \ge ${0}`}: ${math`\sqrt{ab} = \sqrt{a}\sqrt{b}`}. There is no such rule for a sum.` },
    { front: t`How do you rationalise ${math`\frac{${1}}{p + q\sqrt{n}}`}?`, back: t`Multiply the top and bottom by the conjugate ${math`p - q\sqrt{n}`}; the bottom becomes ${math`p^{${2}} - q^{${2}}n`}.` },
    { front: t`What does ${math`\sqrt{a}`} mean, for ${math`a \ge ${0}`}?`, back: t`The unique non-negative number whose square is ${math`a`}.` },
  ],
  proofOrder: [{
    title: t`The root of a product is the product of the roots`,
    steps: [
      t`${math`\sqrt{a} \ge ${0}`} and ${math`\sqrt{b} \ge ${0}`}, so ${math`\sqrt{a}\sqrt{b} \ge ${0}`}.`,
      t`${math`(\sqrt{a}\sqrt{b})^{${2}} = (\sqrt{a})^{${2}}(\sqrt{b})^{${2}} = ab`}.`,
      t`So ${math`\sqrt{a}\sqrt{b}`} is a non-negative number whose square is ${math`ab`}.`,
      t`The non-negative square root of ${math`ab`} is unique, so ${math`\sqrt{a}\sqrt{b} = \sqrt{ab}`}.`,
    ],
  }],
};
