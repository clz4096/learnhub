/**
 * fn.quadratic-graphs: complete the square to find the vertex of a parabola, and find the
 * greatest and least values of a quadratic on an interval. Sources: STEP Support
 * Foundation Assignment 2 Q2(iv) to (vii) and Q3 (1999 STEP I Q6), and the NST Maths
 * Workbook A4. Extreme values are checked by evaluating on a fine grid of the interval.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { add, div, int, mul, pick, q, str, sub, toFloat, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { computedMath, math, t } from '../rich';
import { checkFrom, workedCambridge, worked, type TopicContent } from '../topic';
import { poly } from '../poly';
import { distinctFrom, evalPoly, named, namedAnswer, withExaminer } from '../prep-a';

const F02 = 'step-f02' as const;
const F02H = 'step-f02-hints' as const;
const HK = ['h', 'k'] as const;
const GL = ['g', 'l'] as const;

// ---------------------------------------------------------------- completing the square

interface CsP { b: number; c: number }
/** x^2 + bx + c = (x + h)^2 + k with h = b/2, k = c - b^2/4. */
const cs = ({ b, c }: CsP): [Rational, Rational] => [q(b, 2), q(4 * c - b * b, 4)];
const csMis = ({ b, c }: CsP): [Rational, Rational][] => [[q(b), q(c - b * b)], [q(b, 2), q(4 * c + b * b, 4)], [q(-b, 2), q(4 * c - b * b, 4)]];
const key = (x: readonly Rational[]): string => x.map(str).join(',');

const completeSquare = generator<CsP>({
  id: 'complete-square',
  skill: 'Complete the square: write x^2 + bx + c as (x + h)^2 + k, with h half of b.',
  quick: true,
  params: (rng) => {
    for (;;) {
      const p: CsP = { b: pick(rng, [-10, -8, -7, -6, -5, -4, -3, -2, 2, 3, 4, 5, 6, 8, 10]), c: int(rng, -9, 12) };
      if (distinctFrom(key(cs(p)), csMis(p).map(key)) >= 2) return p;
    }
  },
  sane: ({ b }) => (b !== 0 ? null : 'no x term'),
  problem: (p) => {
    const [h, k] = cs(p);
    return {
      prompt: t`Write ${computedMath(poly([1, p.b, p.c]))} in the form ${math`(x + h)^{${2}} + k`}. Give ${math`h`} and ${math`k`}.`,
      answer: namedAnswer(HK, [h, k], 'Halve the coefficient of x for h, then subtract h squared from the constant.'),
      solution: [
        t`Half of the coefficient of ${math`x`} is ${math`h = ${h}`}. Then ${math`(x + ${h})^{${2}} = x^{${2}} + ${p.b}x + ${mul(h, h)}`}: it has the right ${math`x`} terms but an extra ${mul(h, h)}.`,
        t`Take that extra back off: ${math`k = ${p.c} - ${mul(h, h)} = ${k}`}.`,
      ],
    };
  },
  solve: (p) => {
    // Equate coefficients of (x + h)^2 + k = x^2 + 2hx + h^2 + k by searching h in halves.
    for (let j = -40; j <= 40; j++) {
      const h = q(j, 2);
      if (str(mul(q(2), h)) === String(p.b)) return named(HK, [h, sub(q(p.c), mul(h, h))]);
    }
    return 'none';
  },
  misconceptions: (p): Misconception[] => {
    const [noHalf, plus, sign] = csMis(p) as [[Rational, Rational], [Rational, Rational], [Rational, Rational]];
    return [
      { response: named(HK, noHalf), why: t`${math`(x + h)^{${2}} = x^{${2}} + ${2}hx + h^{${2}}`}, so ${math`${2}h`} is the coefficient of ${math`x`}: halve it.` },
      { response: named(HK, plus), why: t`The bracket adds ${math`h^{${2}}`} that the quadratic did not have, so subtract it: ${math`k = c - h^{${2}}`}.` },
      { response: named(HK, sign), why: t`Check the sign: ${math`(x + h)^{${2}}`} has middle term ${math`+${2}hx`}, so ${math`h`} has the same sign as the coefficient of ${math`x`}.` },
    ];
  },
});

// ---------------------------------------------------------------- the vertex

interface VxP { a: number; h: number; k: number }
/** a(x - h)^2 + k expanded. */
const vxCoeffs = ({ a, h, k }: VxP): number[] => [a, -2 * a * h, a * h * h + k];
const vxMis = (p: VxP): Rational[][] => {
  const [a, b] = vxCoeffs(p) as [number, number, number];
  const xw = q(b, 2 * a);
  const xh = q(-b, a);
  return [[xw, evalPoly(vxCoeffs(p), xw)], [xh, evalPoly(vxCoeffs(p), xh)]];
};

const vertex = generator<VxP>({
  id: 'vertex',
  skill: 'Find the vertex of a parabola y = ax^2 + bx + c by completing the square, a not 1.',
  params: (rng) => {
    for (;;) {
      const p: VxP = { a: pick(rng, [-3, -2, -1, 2, 3]), h: int(rng, -4, 4), k: int(rng, -9, 9) };
      if (p.h === 0) continue;
      return p;
    }
  },
  sane: ({ a, h }) => (a !== 0 && h !== 0 ? null : 'out of range'),
  problem: (p) => {
    const [a, b, c] = vxCoeffs(p) as [number, number, number];
    const XY = ['x', 'y'] as const;
    return {
      prompt: t`Find the coordinates of the vertex of ${computedMath(`y = ${poly([a, b, c])}`)}, and say whether it is the lowest or highest point. Give its ${math`x`} and ${math`y`}.`,
      answer: namedAnswer(XY, [q(p.h), q(p.k)], 'Take out the coefficient of x squared first, then complete the square inside the bracket.'),
      solution: [
        t`Take out ${a} from the ${math`x`} terms: ${computedMath(`y = ${a}(${poly([1, -2 * p.h, 0])}) + ${c}`.replace('+ -', '- '))}.`,
        t`Complete the square inside: ${computedMath(poly([1, -2 * p.h, 0]))} is ${math`(x - (${p.h}))^{${2}} - ${p.h * p.h}`}, so ${math`y = ${a}(x - (${p.h}))^{${2}} - ${a * p.h * p.h} + ${c} = ${a}(x - (${p.h}))^{${2}} + ${p.k}`}.`,
        t`The square is ${0} at ${math`x = ${p.h}`} and positive elsewhere. ${a > 0 ? t`Since ${a} is positive, ${math`y`} is least there: the vertex ${math`(${p.h}, ${p.k})`} is the lowest point.` : t`Since ${a} is negative, ${math`y`} is greatest there: the vertex ${math`(${p.h}, ${p.k})`} is the highest point.`}`,
      ],
    };
  },
  solve: (p) => {
    // The vertex is midway between any two points at equal height: x = 0 and x = -b/a.
    const [a, b] = vxCoeffs(p) as [number, number, number];
    const x = div(add(q(0), q(-b, a)), q(2));
    return named(['x', 'y'], [x, evalPoly(vxCoeffs(p), x)]);
  },
  misconceptions: (p): Misconception[] => {
    const [wrongSign, noTwo] = vxMis(p) as [Rational[], Rational[]];
    return [
      { response: named(['x', 'y'], wrongSign), why: t`${math`(x - h)^{${2}}`} is ${0} at ${math`x = h`}, so the vertex is at ${math`x = -\frac{b}{${2}a}`}, with the minus sign.` },
      { response: named(['x', 'y'], noTwo), why: t`The vertex is at ${math`x = -\frac{b}{${2}a}`}: halving is part of completing the square.` },
    ];
  },
});

// ---------------------------------------------------------------- greatest and least on an interval

interface ExP { b: number; c: number; lo: number; hi: number; want: 'g' | 'l' }
const f = (p: ExP, x: Rational): Rational => evalPoly([1, p.b, p.c], x);
/** The candidates: the two ends, and the vertex if it lies inside. */
function extremes(p: ExP): [Rational, Rational] {
  const v = q(-p.b, 2);
  const xs = [q(p.lo), q(p.hi), ...(toFloat(v) > p.lo && toFloat(v) < p.hi ? [v] : [])];
  const ys = xs.map((x) => f(p, x)).sort((a, b) => toFloat(a) - toFloat(b));
  return [ys[ys.length - 1] as Rational, ys[0] as Rational];
}
const exAns = (p: ExP): Rational => (p.want === 'g' ? extremes(p)[0] : extremes(p)[1]);
const exMis = (p: ExP): Rational[] => {
  const v = q(-p.b, 2);
  const [g, l] = extremes(p);
  return [f(p, v), p.want === 'g' ? l : g, f(p, q(p.lo)), f(p, q(p.hi))];
};

const onInterval = generator<ExP>({
  id: 'on-interval',
  skill: 'Find the greatest or least value of a quadratic on an interval: check the ends, and the vertex if it lies inside.',
  params: (rng) => {
    for (;;) {
      const lo = int(rng, -5, 2);
      const p: ExP = { b: pick(rng, [-8, -6, -4, -2, 2, 4, 6, 8]), c: int(rng, -6, 9), lo, hi: lo + int(rng, 2, 6), want: rng() < 0.5 ? 'g' : 'l' };
      const right = str(exAns(p));
      if (exMis(p).filter((m) => str(m) !== right).length >= 2) return p;
    }
  },
  sane: (p) => (p.hi > p.lo ? null : 'empty interval'),
  problem: (p) => {
    const v = q(-p.b, 2);
    const inside = toFloat(v) > p.lo && toFloat(v) < p.hi;
    const [g, l] = extremes(p);
    const word = p.want === 'g' ? 'greatest' : 'least';
    return {
      prompt: t`Find the ${word} value of ${computedMath(poly([1, p.b, p.c]))} for ${math`${p.lo} \le x \le ${p.hi}`}.`,
      answer: { kind: 'exact', expected: str(exAns(p)) },
      solution: [
        t`Complete the square: the vertex is at ${math`x = ${v}`}, where the value is ${f(p, v)}. The parabola opens upwards, so this is its lowest point.`,
        inside
          ? t`${math`x = ${v}`} lies inside the interval, so the least value is ${f(p, v)}. The greatest is at the end farther from the vertex: the ends give ${f(p, q(p.lo))} and ${f(p, q(p.hi))}.`
          : t`${math`x = ${v}`} lies outside the interval, so on the interval the parabola only rises or only falls: both extremes are at the ends, ${f(p, q(p.lo))} and ${f(p, q(p.hi))}.`,
        t`So the greatest value is ${g} and the least is ${l}; the ${word} is ${exAns(p)}.`,
      ],
    };
  },
  solve: (p) => {
    // A fine grid of the interval, including both ends; the vertex is at a half-integer, on the grid.
    let best: Rational | null = null;
    for (let i = 0; i <= (p.hi - p.lo) * 4; i++) {
      const y = f(p, q(4 * p.lo + i, 4));
      if (best === null || (p.want === 'g' ? toFloat(y) > toFloat(best) : toFloat(y) < toFloat(best))) best = y;
    }
    return str(best as Rational);
  },
  misconceptions: (p): Misconception[] => {
    const [vert, other, left, right] = exMis(p) as [Rational, Rational, Rational, Rational];
    return [
      { response: str(vert), why: t`That is the value at the vertex, ${math`x = ${q(-p.b, 2)}`}. ${toFloat(q(-p.b, 2)) > p.lo && toFloat(q(-p.b, 2)) < p.hi ? t`It is the least value, the lowest point of the curve, not the greatest.` : t`But the vertex is outside the interval, so the curve never reaches it here.`}` },
      { response: str(other), why: t`That is the ${p.want === 'g' ? 'least' : 'greatest'} value. Sketch the curve over the interval to see which is which.` },
      { response: str(left), why: t`That is the value at the end ${math`x = ${p.lo}`}. Compare it with the other end and with the vertex before deciding.` },
      { response: str(right), why: t`That is the value at the end ${math`x = ${p.hi}`}. Compare it with the other end and with the vertex before deciding.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

/** Greatest and least of a polynomial on [lo, hi] by a grid of quarter steps. */
function gridExtremes(coeffs: readonly number[], lo: number, hi: number): [Rational, Rational] {
  const ys: Rational[] = [];
  for (let i = 0; i <= (hi - lo) * 4; i++) ys.push(evalPoly(coeffs, q(4 * lo + i, 4)));
  ys.sort((a, b) => toFloat(a) - toFloat(b));
  return [ys[ys.length - 1] as Rational, ys[0] as Rational];
}

const a2q2vi = auto({
  id: 'a2-q2-vi',
  source: cite(F02, 'Q2(vi)'),
  title: t`Complete the square, then read off the extremes`,
  prompt: t`Write ${math`x^{${2}} - ${8}x + ${21}`} in the form ${math`(x + a)^{${2}} + b`}. Hence find the greatest value ${math`g`} and the least value ${math`l`} of ${math`x^{${2}} - ${8}x + ${21}`} for ${math`${0} \le x \le ${5}`}.`,
  answer: namedAnswer(GL, [q(21), q(5)], 'The vertex is inside the interval; the greatest value is at the end farther from it.'),
  solution: [
    t`Half of ${math`-${8}`} is ${math`-${4}`}, and ${math`(x - ${4})^{${2}} = x^{${2}} - ${8}x + ${16}`}, so ${math`x^{${2}} - ${8}x + ${21} = (x - ${4})^{${2}} + ${5}`}.`,
    t`A square is never negative, so the value is at least ${5}, reached at ${math`x = ${4}`}, which lies in ${math`${0} \le x \le ${5}`}. So ${math`l = ${5}`}.`,
    t`The value grows with the distance from ${4}. The farthest point of the interval is ${math`x = ${0}`}, at distance ${4}, giving ${math`${16} + ${5} = ${21}`}. So ${math`g = ${21}`}.`,
  ],
  reference: 'g = 21, l = 5',
  verify: () => same('grid extremes', key(gridExtremes([1, -8, 21], 0, 5)), '21,5'),
  misconceptions: [{ response: 'g = 21, l = 6', why: t`The least value is not at an end: the vertex ${math`x = ${4}`} is inside the interval, where the value is ${5}.` }],
  official: { source: cite(F02H, 'Q2(vi)'), answer: 'g = 21, l = 5', agrees: true },
});

const a2q2iv = auto({
  id: 'a2-q2-iv',
  source: cite(F02, 'Q2(iv)'),
  title: t`A vertex inside the range`,
  prompt: t`Sketch ${math`y = (x - ${1})^{${2}}`} for ${math`-${2} \le x \le ${2}`}. Give the greatest value ${math`g`} and least value ${math`l`} of ${math`(x - ${1})^{${2}}`} in this range.`,
  answer: namedAnswer(GL, [q(9), q(0)], 'The least value is at the vertex, not at an end.'),
  solution: [
    t`The vertex ${math`x = ${1}`} is inside the range, so the least value is ${0}.`,
    t`The greatest is at the end farther from ${1}: ${math`x = -${2}`}, giving ${math`(-${3})^{${2}} = ${9}`}.`,
  ],
  reference: 'g = 9, l = 0',
  verify: () => same('grid extremes', key(gridExtremes([1, -2, 1], -2, 2)), '9,0'),
  misconceptions: [{ response: 'g = 9, l = 1', why: t`The least is at the vertex ${math`x = ${1}`}, inside the range, where the value is ${0}, not at the end ${math`x = ${2}`}.` }],
  official: { source: cite(F02H, 'Q2(iv)'), answer: 'g = 9, l = 0', agrees: true },
});

const a2q2v = auto({
  id: 'a2-q2-v',
  source: cite(F02, 'Q2(v)'),
  title: t`A vertex outside the range`,
  prompt: t`Sketch ${math`y = (x - ${3})^{${2}}`}. Give the greatest value ${math`g`} and least value ${math`l`} of ${math`(x - ${3})^{${2}}`} for ${math`-${2} \le x \le ${2}`}.`,
  answer: namedAnswer(GL, [q(25), q(1)], 'The vertex is outside the range, so both extremes are at the ends.'),
  solution: [
    t`The vertex ${math`x = ${3}`} is outside the range, and the curve falls all the way from ${math`x = -${2}`} to ${math`x = ${2}`}.`,
    t`So ${math`g = (-${5})^{${2}} = ${25}`} at ${math`x = -${2}`} and ${math`l = (-${1})^{${2}} = ${1}`} at ${math`x = ${2}`}.`,
  ],
  reference: 'g = 25, l = 1',
  verify: () => same('grid extremes', key(gridExtremes([1, -6, 9], -2, 2)), '25,1'),
  misconceptions: [{ response: 'g = 25, l = 0', why: t`${0} is the value at the vertex ${math`x = ${3}`}, which is outside the range.` }],
  official: { source: cite(F02H, 'Q2(v)'), answer: 'g = 25, l = 1', agrees: true },
});

const a2q2vii = auto({
  id: 'a2-q2-vii',
  source: cite(F02, 'Q2(vii)'),
  title: t`A parameter moves the vertex`,
  prompt: t`Sketch ${math`y = x^{${2}} + ${2}kx`} for ${math`-${2} \le x \le ${2}`}, where ${math`-${2} < k < ${2}`}. Find the greatest value of ${math`x^{${2}} + ${2}kx`} on this range, as one expression in ${math`k`}. (Type ${math`|k|`} as abs(k).)`,
  answer: { kind: 'expression', expected: '4 + 4abs(k)', variables: ['k'], domains: { k: { kind: 'real', min: -1.99, max: 1.99 } } },
  solution: [
    t`${math`x^{${2}} + ${2}kx = (x + k)^{${2}} - k^{${2}}`}: the vertex is at ${math`x = -k`}, inside the range since ${math`-${2} < k < ${2}`}, so the least value is ${math`-k^{${2}}`}.`,
    t`The greatest is at the end farther from ${math`-k`}. The ends give ${math`${4} - ${4}k`} at ${math`x = -${2}`} and ${math`${4} + ${4}k`} at ${math`x = ${2}`}.`,
    t`The larger of ${math`${4} + ${4}k`} and ${math`${4} - ${4}k`} is ${math`${4} + ${4}|k|`}. (For ${math`k > ${2}`} the vertex is outside: the greatest is ${math`${4} + ${4}k`} and the least ${math`${4} - ${4}k`}.)`,
  ],
  reference: '4 + 4abs(k)',
  verify: () => {
    for (const k of [-1.5, -0.25, 0, 0.6, 1.9]) {
      let best = -Infinity;
      for (let i = 0; i <= 4000; i++) { const x = -2 + i / 1000; best = Math.max(best, x * x + 2 * k * x); }
      if (Math.abs(best - (4 + 4 * Math.abs(k))) > 1e-9) return `k = ${k}: ${best}`;
    }
    return null;
  },
  misconceptions: [{ response: '4 + 4k', why: t`For ${math`k < ${0}`} the far end is ${math`x = -${2}`}, giving ${math`${4} - ${4}k`}. Combine both cases with ${math`|k|`}.` }],
  official: { source: cite(F02H, 'Q2(vii)'), answer: '4 + 4abs(k)', agrees: true },
});

const nstA4 = auto({
  id: 'nst-a4',
  source: cite('nst-workbook', 'Algebra, A4'),
  title: t`Minimum values by completing the square`,
  prompt: t`By completing the square, find the minimum value ${math`p`} of ${math`x^{${2}} - ${2}x + ${6}`} and the minimum value ${math`q`} of ${math`x^{${4}} + ${2}x^{${2}} + ${2}`}, for real ${math`x`}. Then find the minimum value ${math`r`} of ${math`x^{${2}} - ${2}x + ${6}`} for ${math`${2} \le x \le ${3}`}.`,
  answer: namedAnswer(['p', 'q', 'r'], [q(5), q(2), q(6)], 'Complete each square; on the interval, check whether the vertex is inside.'),
  solution: [
    t`${math`x^{${2}} - ${2}x + ${6} = (x - ${1})^{${2}} + ${5}`}, least ${5} at ${math`x = ${1}`}: ${math`p = ${5}`}.`,
    t`${math`x^{${4}} + ${2}x^{${2}} + ${2} = (x^{${2}} + ${1})^{${2}} + ${1}`}. Since ${math`x^{${2}} \ge ${0}`}, ${math`x^{${2}} + ${1} \ge ${1}`}, so the value is at least ${math`${1} + ${1} = ${2}`}, reached at ${math`x = ${0}`}: ${math`q = ${2}`}.`,
    t`On ${math`${2} \le x \le ${3}`} the vertex ${math`x = ${1}`} is outside, and the curve rises, so the least value is at ${math`x = ${2}`}: ${math`r = ${1} + ${5} = ${6}`}.`,
  ],
  reference: 'p = 5, q = 2, r = 6',
  verify: () => {
    const [, l1] = gridExtremes([1, -2, 6], -5, 5);
    const [, l2] = gridExtremes([1, 0, 2, 0, 2], -5, 5);
    const [, l3] = gridExtremes([1, -2, 6], 2, 3);
    return same('grid minima', key([l1, l2, l3]), '5,2,6');
  },
  misconceptions: [{ response: 'p = 5, q = 1, r = 5', why: t`${math`(x^{${2}} + ${1})^{${2}}`} is at least ${1}, not ${0}, because ${math`x^{${2}} + ${1} \ge ${1}`}; and on ${math`${2} \le x \le ${3}`} the vertex is out of reach.` }],
});

const step1999 = supervision({
  id: 'a2-q3',
  source: cite(F02, 'Q3 (1999 STEP I Q6)'),
  title: t`Greatest and least values, by cases`,
  prompt: t`(i) Find the greatest and least values of ${math`bx + a`} for ${math`-${10} \le x \le ${10}`}, distinguishing carefully between the cases ${math`b > ${0}`}, ${math`b = ${0}`}, and ${math`b < ${0}`}. (ii) Find the greatest and least values of ${math`cx^{${2}} + bx + a`}, where ${math`c \ge ${0}`}, for ${math`-${10} \le x \le ${10}`}, distinguishing carefully between the cases that can arise for different values of ${math`b`} and ${math`c`}.`,
  writeUp: 'explanation',
  official: cite(F02H, 'Q3'),
});

// ---------------------------------------------------------------- lesson

const CS_EX: CsP = { b: -6, c: 11 };

export const quadraticGraphs: TopicContent = {
  topicId: 'fn.quadratic-graphs',
  goal: t`Complete the square to find the vertex of a parabola, and find the greatest and least values of a quadratic on an interval.`,
  objective: t`Find a parabola's vertex by completing the square, and its extremes on an interval.`,
  why: t`STEP max and min questions with parameters reduce to where the vertex sits.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`The idea` },
    { kind: 'hook', text: t`What is the smallest value ${math`x^{${2}} - ${8}x + ${21}`} can take? Try a few: ${math`x = ${0}`} gives ${21}, ${math`x = ${3}`} gives ${6}, ${math`x = ${5}`} gives ${6}. Somewhere between ${3} and ${5} it bottoms out. One line of algebra finds the exact spot, with no calculus at all.` },
    { kind: 'narrative', text: t`The line is ${math`x^{${2}} - ${8}x + ${21} = (x - ${4})^{${2}} + ${5}`}. A square is never negative, so the right side is at least ${5}, and it equals ${5} exactly when ${math`x = ${4}`}. Rewriting a quadratic as a square plus a constant is called completing the square.` },
    { kind: 'section', title: t`Completing the square` },
    {
      kind: 'definition',
      name: t`Completed square form`,
      formal: t`For ${math`a \ne ${0}`}, the [[completing-the-square|completed square form]] of ${math`ax^{${2}} + bx + c`} is ${math`a(x - h)^{${2}} + k`} with ${math`h, k \in \mathbb{R}`}. The point ${math`(h, k)`} is the [[vertex|vertex]] of the parabola ${math`y = ax^{${2}} + bx + c`}.`,
      plain: t`The quadratic written as a multiple of a square, plus a number. For ${math`x^{${2}} - ${8}x + ${21}`}: ${math`a = ${1}`}, ${math`h = ${4}`}, ${math`k = ${5}`}, so the vertex is ${math`(${4}, ${5})`}.`,
    },
    { kind: 'theorem', name: t`Completing the square`, statement: t`If ${math`a \ne ${0}`}, then for every real ${math`x`}, ${math`ax^{${2}} + bx + c = a\left(x + \frac{b}{${2}a}\right)^{${2}} + c - \frac{b^{${2}}}{${4}a}`}. If ${math`a > ${0}`} the least value is ${math`c - \frac{b^{${2}}}{${4}a}`}, at ${math`x = -\frac{b}{${2}a}`}; if ${math`a < ${0}`} that is the greatest value.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Expand the square`, text: t`${math`a\left(x + \frac{b}{${2}a}\right)^{${2}} = a\left(x^{${2}} + \frac{b}{a}x + \frac{b^{${2}}}{${4}a^{${2}}}\right) = ax^{${2}} + bx + \frac{b^{${2}}}{${4}a}`}.`, plain: t`The middle term of the square is ${math`${2} \times x \times \frac{b}{${2}a} = \frac{b}{a}x`}; multiplying by ${math`a`} gives ${math`bx`}.` },
        { label: t`Correct the constant`, text: t`Adding ${math`c - \frac{b^{${2}}}{${4}a}`} gives ${math`ax^{${2}} + bx + c`}, the identity.` },
        { label: t`Read off the extreme`, text: t`${math`\left(x + \frac{b}{${2}a}\right)^{${2}} \ge ${0}`}, with equality only at ${math`x = -\frac{b}{${2}a}`}. If ${math`a > ${0}`}, multiplying by ${math`a`} keeps the inequality, so the expression is at least ${math`c - \frac{b^{${2}}}{${4}a}`}; if ${math`a < ${0}`} it reverses, giving at most.` },
      ],
    },
    checkFrom(completeSquare, CS_EX, t`Half of ${math`-${6}`} is ${math`-${3}`}; ${math`(x - ${3})^{${2}} = x^{${2}} - ${6}x + ${9}`}, so ${math`k = ${11} - ${9} = ${2}`}.`),
    { kind: 'pitfall', claim: t`${math`x^{${2}} + ${6}x + ${1} = (x + ${6})^{${2}} - ${35}`}.`, counterexample: t`At ${math`x = ${0}`} the left side is ${1} and the right is ${math`${36} - ${35} = ${1}`}, but at ${math`x = ${1}`} the left is ${8} and the right is ${math`${49} - ${35} = ${14}`}. The bracket needs half the coefficient: ${math`(x + ${3})^{${2}} - ${8}`}.` },
    { kind: 'section', title: t`Extremes on an interval` },
    { kind: 'narrative', text: t`Now restrict ${math`x`} to an interval, say ${math`${0} \le x \le ${5}`}. An upward parabola falls until the vertex and rises after it. So on the interval, the smallest value is at the vertex if the vertex is inside, and otherwise at the nearer end; the largest is always at an end, the one farther from the vertex.` },
    { kind: 'theorem', name: t`Extremes of a quadratic on an interval`, statement: t`Let ${math`f(x) = a(x - h)^{${2}} + k`} with ${math`a > ${0}`}, on ${math`p \le x \le q`}. The greatest value of ${math`f`} is the larger of ${math`f(p)`} and ${math`f(q)`}. The least value is ${math`k`} if ${math`p \le h \le q`}, and otherwise the smaller of ${math`f(p)`} and ${math`f(q)`}.` },
    {
      kind: 'p',
      text: t`The reason: ${math`f(x)`} depends only on the distance ${math`|x - h|`}, and grows as that distance grows. On an interval the distance is largest at one of the ends; it is smallest at ${math`h`} itself when ${math`h`} is inside, and otherwise at the end nearer to ${math`h`}.`,
      why: { q: t`Why does ${math`f`} grow with the distance?`, a: t`${math`(x - h)^{${2}} = |x - h|^{${2}}`}, and squaring is increasing for non-negative numbers; multiplying by ${math`a > ${0}`} and adding ${math`k`} keep the order.` },
    },
    checkFrom(onInterval, { b: -4, c: 1, lo: -1, hi: 3, want: 'g' }, t`The vertex ${math`x = ${2}`} is inside, so the greatest is at the farther end ${math`x = -${1}`}: ${math`${1} + ${4} + ${1} = ${6}`}.`),
    { kind: 'pitfall', claim: t`The least value of a quadratic on an interval is always at the vertex.`, counterexample: t`${math`(x - ${3})^{${2}}`} on ${math`-${2} \le x \le ${2}`} has its vertex at ${math`x = ${3}`}, outside the interval; the least value there is ${1}, at ${math`x = ${2}`}, not ${0}.` },
    { kind: 'takeaway', text: t`Complete the square to find the vertex; then on an interval compare the ends, and the vertex if it is inside.` },
  ],
  examples: [
    withExaminer(workedCambridge(a2q2vi), t`The completed square stated, the vertex checked against the interval, and both extremes justified, not just read off a sketch.`),
    worked(vertex, { a: -2, h: 3, k: 7 }, t`A parabola that opens downwards`),
    worked(onInterval, { b: 2, c: -3, lo: 1, hi: 4, want: 'l' }, t`A vertex outside the interval`),
  ],
  generators: [completeSquare, vertex, onInterval],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['completing-the-square', 'vertex'],
  cambridge: [a2q2iv, a2q2v, a2q2vii, nstA4, step1999],
  gate: ['a2-q3', 'a2-q2-vii', 'nst-a4'],
  recall: [
    { front: t`Complete the square: ${math`ax^{${2}} + bx + c = \ ?`}`, back: t`${math`a\left(x + \frac{b}{${2}a}\right)^{${2}} + c - \frac{b^{${2}}}{${4}a}`}.` },
    { front: t`Where are the extremes of an upward parabola on an interval?`, back: t`The greatest at the end farther from the vertex; the least at the vertex if it is inside, else at the nearer end.` },
  ],
  proofOrder: [{
    title: t`The least value of ${math`x^{${2}} - ${8}x + ${21}`}`,
    steps: [
      t`Half of ${math`-${8}`} is ${math`-${4}`}, so compare with ${math`(x - ${4})^{${2}} = x^{${2}} - ${8}x + ${16}`}.`,
      t`So ${math`x^{${2}} - ${8}x + ${21} = (x - ${4})^{${2}} + ${5}`}.`,
      t`A square is never negative, so the value is at least ${5}.`,
      t`It equals ${5} at ${math`x = ${4}`}, so the least value is ${5}.`,
    ],
  }],
};
