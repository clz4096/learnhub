/**
 * fn.floor-function: [x], the greatest integer at most x; step graphs; areas under them as
 * sums of rectangles. Sources: STEP Support Foundation Assignment 3 Q2(ii) to (v) and Q3
 * (2004 STEP I Q2). Floors are computed exactly for rationals (and by integer search for
 * square roots); areas by adding the rectangles one unit at a time, and checked by a
 * Riemann sum in floating point.
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { add, int, mul, pick, q, str, sub, toFloat, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { math, t } from '../rich';
import { checkFrom, workedCambridge, worked, type TopicContent } from '../topic';
import { named, namedAnswer, withExaminer } from '../prep-a';

const F03 = 'step-f03' as const;
const F03H = 'step-f03-hints' as const;

/** floor of a rational, exactly. */
const floorR = (r: Rational): number => {
  const n = r.num;
  const d = r.den;
  const fl = n >= 0n ? n / d : -((-n + d - 1n) / d);
  return Number(fl);
};
/** floor of sqrt(n) by integer search. */
const floorSqrt = (n: number): number => { let k = 0; while ((k + 1) * (k + 1) <= n) k++; return k; };

// ---------------------------------------------------------------- values

type ValP = { kind: 'pos' | 'neg'; num: number; den: number } | { kind: 'sqrt'; n: number };
const valAns = (p: ValP): number => (p.kind === 'sqrt' ? floorSqrt(p.n) : floorR(q(p.kind === 'neg' ? -p.num : p.num, p.den)));

const floorValue = generator<ValP>({
  id: 'floor-value',
  skill: 'Evaluate the floor of a number: the greatest integer at most it, also for negatives and square roots.',
  quick: true,
  params: (rng) => {
    const kind = pick(rng, ['pos', 'neg', 'neg', 'sqrt'] as const);
    if (kind === 'sqrt') {
      for (;;) { const n = int(rng, 5, 150); if (floorSqrt(n) ** 2 !== n) return { kind, n }; }
    }
    for (;;) {
      const den = pick(rng, [2, 3, 4, 5, 7]);
      const num = int(rng, 3, 60);
      if (num % den !== 0) return { kind, num, den };
    }
  },
  sane: (p) => (p.kind === 'sqrt' ? (p.n > 0 ? null : 'bad') : p.den >= 2 ? null : 'bad'),
  problem: (p) => {
    const a = valAns(p);
    if (p.kind === 'sqrt') {
      return {
        prompt: t`Find ${math`\left[\sqrt{${p.n}}\right]`}, where ${math`[x]`} is the greatest integer less than or equal to ${math`x`}.`,
        answer: { kind: 'exact', expected: String(a) },
        solution: [
          t`Find the squares either side of ${p.n}: ${math`${a}^{${2}} = ${a * a} \le ${p.n} < ${(a + 1) ** 2} = ${a + 1}^{${2}}`}.`,
          t`Taking square roots keeps the order, so ${math`${a} \le \sqrt{${p.n}} < ${a + 1}`}, and ${math`\left[\sqrt{${p.n}}\right] = ${a}`}.`,
        ],
      };
    }
    const x = q(p.kind === 'neg' ? -p.num : p.num, p.den);
    return {
      prompt: t`Find ${math`\left[${x}\right]`}, where ${math`[x]`} is the greatest integer less than or equal to ${math`x`}.`,
      answer: { kind: 'exact', expected: String(a) },
      solution: [
        t`${math`${x}`} is about ${Number(toFloat(x).toFixed(3))}, and ${math`${a} \le ${x} < ${a + 1}`}.`,
        p.kind === 'neg'
          ? t`So ${math`\left[${x}\right] = ${a}`}. For a negative number the floor is further from ${0}: it rounds down, not towards ${0}.`
          : t`So ${math`\left[${x}\right] = ${a}`}.`,
      ],
    };
  },
  solve: (p) => {
    // Step down from a large integer until it is at most the number.
    const v = p.kind === 'sqrt' ? Math.sqrt(p.n) : (p.kind === 'neg' ? -p.num : p.num) / p.den;
    let k = 200;
    while (k > v + 1e-12) k--;
    return String(k);
  },
  misconceptions: (p): Misconception[] => {
    const a = valAns(p);
    if (p.kind === 'neg') {
      return [
        { response: String(a + 1), why: t`That rounds towards ${0}. The floor is the greatest integer at most the number, and for a negative number that is further from ${0}: ${math`[-${2.5}] = -${3}`}.` },
        { response: String(-a), why: t`Keep the sign: the number is negative, so its floor is negative too.` },
      ];
    }
    return [
      { response: String(a - 1), why: t`${a - 1} is at most the number, but ${a} is too, and it is greater. The floor is the greatest such integer.` },
      { response: String(a + 1), why: t`That is the integer just above. The floor is at most the number: round down, never up.` },
      { response: String(p.kind === 'sqrt' ? floorR(q(p.n, 2)) : floorR(q(p.num * p.den, 1))), why: p.kind === 'sqrt' ? t`The square root is not half the number. Find the squares on either side of ${p.n}.` : t`That multiplies instead of dividing. Divide first, then round down.` },
    ];
  },
});

// ---------------------------------------------------------------- areas under [x]

interface AreaP { whole: number; half: boolean }
const bEnd = ({ whole, half }: AreaP): Rational => (half ? q(2 * whole + 1, 2) : q(whole));
/** The area under y = [x] from 0 to b, adding the rectangles: height r on [r, r + 1). */
function areaRect(b: Rational): Rational {
  let s = q(0);
  for (let r = 0; r < floorR(b); r++) s = add(s, q(r));
  return add(s, mul(q(floorR(b)), sub(b, q(floorR(b)))));
}

const floorArea = generator<AreaP>({
  id: 'floor-area',
  skill: 'Find the area under y = [x] by adding the areas of the rectangles under the steps.',
  params: (rng) => ({ whole: int(rng, 3, 9), half: rng() < 0.5 }),
  sane: ({ whole }) => (whole >= 2 ? null : 'too small'),
  problem: (p) => {
    const b = bEnd(p);
    const n = p.whole;
    return {
      prompt: t`Find ${math`\int_{${0}}^{${b}} [x]\,dx`}, the area under ${math`y = [x]`} from ${math`x = ${0}`} to ${math`x = ${b}`}.`,
      answer: { kind: 'exact', expected: str(areaRect(b)) },
      solution: [
        t`On each interval ${math`r \le x < r + ${1}`}, ${math`[x] = r`}: the area there is a rectangle of width ${1} and height ${math`r`}.`,
        t`From ${0} to ${n} the rectangles give ${math`${0} + ${1} + \cdots + ${n - 1} = \frac{${n - 1} \times ${n}}{${2}} = ${(n * (n - 1)) / 2}`}.`,
        p.half
          ? t`Then from ${n} to ${b} the height is ${n} and the width ${q(1, 2)}: ${math`${n} \times ${q(1, 2)} = ${q(n, 2)}`}. The total is ${areaRect(b)}.`
          : t`So the area is ${areaRect(b)}.`,
      ],
    };
  },
  solve: (p) => {
    // A midpoint Riemann sum with steps of 1/1000, rounded to the nearest half.
    const b = toFloat(bEnd(p));
    let s = 0;
    const h = 1e-3;
    for (let x = h / 2; x < b; x += h) s += Math.floor(x) * h;
    return str(q(Math.round(2 * s), 2));
  },
  misconceptions: (p): Misconception[] => {
    const b = bEnd(p);
    const n = p.whole;
    return [
      { response: str(mul(mul(b, b), q(1, 2))), why: t`That is the area under ${math`y = x`}, a triangle. The floor graph is a staircase below it: each step is flat.` },
      { response: str(add(q((n * (n + 1)) / 2), p.half ? q(n, 2) : q(0))), why: t`The first step, ${math`${0} \le x < ${1}`}, has height ${0}, not ${1}: the heights run from ${0} to ${n - 1}.` },
      ...(p.half ? [{ response: String((n * (n - 1)) / 2), why: t`Do not forget the last piece, from ${n} to ${b}: a rectangle of height ${n} and width ${q(1, 2)}.` }] : []),
    ];
  },
});

// ---------------------------------------------------------------- solving [x + c] = m

interface EqP { c: number; m: number; k: number }
/** [kx + c] = m means m <= kx + c < m + 1, so (m - c)/k <= x < (m - c + 1)/k. */
const eqAns = ({ c, m, k }: EqP): [Rational, Rational] => [q(m - c, k), q(m - c + 1, k)];

const floorEquation = generator<EqP>({
  id: 'floor-equation',
  skill: 'Solve an equation [kx + c] = m by turning it into the inequality m <= kx + c < m + 1.',
  params: (rng) => ({ c: pick(rng, [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]), m: int(rng, -6, 9), k: pick(rng, [1, 1, 2, 3, 4]) }),
  sane: ({ k }) => (k >= 1 ? null : 'bad k'),
  problem: (p) => {
    const [a, b] = eqAns(p);
    const inner = p.k === 1 ? 'x' : `${p.k}x`;
    return {
      prompt: t`The real numbers ${math`x`} with ${math`\left[${p.k === 1 ? '' : p.k}x ${p.c < 0 ? '-' : '+'} ${Math.abs(p.c)}\right] = ${p.m}`} form an interval ${math`a \le x < b`}. Find ${math`a`} and ${math`b`}.`,
      answer: namedAnswer(['a', 'b'], [a, b], 'Write the floor equation as m <= kx + c < m + 1.'),
      solution: [
        t`${math`[y] = ${p.m}`} means ${math`${p.m} \le y < ${p.m + 1}`}: ${p.m} is the greatest integer at most ${math`y`}.`,
        t`So ${math`${p.m} \le ${inner === 'x' ? '' : p.k}x ${p.c < 0 ? '-' : '+'} ${Math.abs(p.c)} < ${p.m + 1}`}. Subtract ${math`${p.c}`}${p.k === 1 ? t`` : t`, then divide by ${p.k}`}: ${math`${a} \le x < ${b}`}.`,
      ],
    };
  },
  solve: (p) => {
    // Scan x in steps of 1/(12k) and keep the first and last that work.
    const ok: Rational[] = [];
    for (let i = -400; i <= 400; i++) { const x = q(i, 12 * p.k); if (floorR(add(mul(q(p.k), x), q(p.c))) === p.m) ok.push(x); }
    const first = ok[0] as Rational;
    const last = ok[ok.length - 1] as Rational;
    return named(['a', 'b'], [first, add(last, q(1, 12 * p.k))]);
  },
  misconceptions: (p): Misconception[] => {
    const nm = (a: Rational, b: Rational): string => named(['a', 'b'], [a, b]);
    return [
      { response: nm(q(p.m + p.c, p.k), q(p.m + p.c + 1, p.k)), why: t`To isolate ${math`x`}, subtract ${math`${p.c}`} from every part of the inequality, do not add it.` },
      { response: nm(q(p.m - c1(p), p.k), q(p.m - c1(p) + 1, p.k)), why: t`${math`[y] = ${p.m}`} means ${math`y`} is from ${p.m} up to, but not including, ${p.m + 1}. It does not start below ${p.m}.` },
    ];
  },
});
/** The slip of taking [y] = m to mean m - 1 < y <= m, shifting the interval down by one. */
const c1 = (p: EqP): number => p.c + 1;

// ---------------------------------------------------------------- Cambridge problems

const a3q2ii = auto({
  id: 'a3-q2-ii',
  source: cite(F03, 'Q2(ii)'),
  title: t`Four floors`,
  prompt: t`The notation ${math`[x]`} means the greatest integer less than or equal to ${math`x`}; for example ${math`[\pi] = ${3}`} and ${math`[\sqrt{${24}}] = ${4}`}. Find ${math`a = [${10.2}]`}, ${math`b = [\sqrt{${70}}]`}, ${math`c = [${6}]`}, and ${math`d = [${10}\pi]`}.`,
  answer: namedAnswer(['a', 'b', 'c', 'd'], [q(10), q(8), q(6), q(31)], 'Find the integers either side of each number.'),
  solution: [
    t`${math`${10} \le ${10.2} < ${11}`}, so ${math`a = ${10}`}. ${math`${64} \le ${70} < ${81}`}, so ${math`${8} \le \sqrt{${70}} < ${9}`} and ${math`b = ${8}`}.`,
    t`${6} is an integer, so ${math`[${6}] = ${6}`}. ${math`${3.14} < \pi < ${3.15}`}, so ${math`${31.4} < ${10}\pi < ${31.5}`} and ${math`d = ${31}`}.`,
  ],
  reference: 'a = 10, b = 8, c = 6, d = 31',
  verify: () => same('floors', [Math.floor(10.2), Math.floor(Math.sqrt(70)), Math.floor(6), Math.floor(10 * Math.PI)].join(','), '10,8,6,31'),
  misconceptions: [{ response: 'a = 10, b = 8, c = 5, d = 31', why: t`The floor of an integer is the integer itself: ${6} is at most ${6}.` }],
  official: { source: cite(F03H, 'Q2(ii)'), answer: 'a = 10, b = 8, c = 6, d = 31', agrees: true },
});

/** A midpoint Riemann sum of f on [0, b]. */
const riemann = (f: (x: number) => number, b: number): number => { let s = 0; const h = 1e-4; for (let x = h / 2; x < b; x += h) s += f(x) * h; return s; };

const a3q2iv = auto({
  id: 'a3-q2-iv',
  source: cite(F03, 'Q2(iii), (iv)'),
  title: t`The area under a staircase`,
  prompt: t`If ${math`${3} \le x < ${4}`}, what is ${math`[x]`}? Use a sketch of ${math`y = [x]`} for ${math`${0} \le x < ${4}`} to evaluate ${math`\int_{${0}}^{${4}} [x]\,dx`}.`,
  answer: { kind: 'exact', expected: '6' },
  solution: [
    t`For ${math`${3} \le x < ${4}`}, ${math`[x] = ${3}`}. The graph is four flat steps, at heights ${0}, ${1}, ${2}, ${3}.`,
    t`Each step is a rectangle of width ${1}: the area is ${math`${0} + ${1} + ${2} + ${3} = ${6}`}.`,
  ],
  reference: '6',
  verify: () => (Math.abs(riemann(Math.floor, 4) - 6) < 1e-6 ? same('rectangles', str(areaRect(q(4))), '6') : 'the Riemann sum is not 6'),
  misconceptions: [{ response: '10', why: t`The first step, from ${0} to ${1}, has height ${0}: the heights are ${0}, ${1}, ${2}, ${3}.` }],
  official: { source: cite(F03H, 'Q2(iv)'), answer: '6', agrees: true },
});

const a3q2v = auto({
  id: 'a3-q2-v',
  source: cite(F03, 'Q2(v)'),
  title: t`The area under ${math`y = x[x]`}`,
  prompt: t`Sketch ${math`y = x[x]`} for ${math`${0} \le x < ${3}`}, and use your sketch to evaluate ${math`\int_{${0}}^{${3}} x[x]\,dx`}.`,
  answer: { kind: 'exact', expected: '13/2' },
  solution: [
    t`On ${math`${0} \le x < ${1}`}, ${math`y = ${0}`}. On ${math`${1} \le x < ${2}`}, ${math`y = x`}: a trapezium from height ${1} to ${2}, area ${math`\frac{${1} + ${2}}{${2}} = ${q(3, 2)}`}.`,
    t`On ${math`${2} \le x < ${3}`}, ${math`y = ${2}x`}: from height ${4} to ${6}, area ${math`\frac{${4} + ${6}}{${2}} = ${5}`}.`,
    t`The total is ${math`${0} + ${q(3, 2)} + ${5} = ${q(13, 2)}`}.`,
  ],
  reference: '13/2',
  verify: () => (Math.abs(riemann((x) => x * Math.floor(x), 3) - 6.5) < 1e-6 ? null : 'the Riemann sum is not 13/2'),
  misconceptions: [{ response: '9/2', why: t`Each piece is a slanted segment, so its area is a trapezium, not a rectangle at the lower height: use the average of the two ends.` }],
  official: { source: cite(F03H, 'Q2(v)'), answer: '13/2', agrees: true },
});

const a3q3ii = auto({
  id: 'a3-q3-ii',
  source: cite(F03, 'Q3(ii) (2004 STEP I Q2)'),
  title: t`The area under ${math`y = ${2}^{[x]}`}`,
  prompt: t`Find ${math`\int_{${0}}^{a} ${2}^{[x]}\,dx`} when ${math`a`} is a positive integer, as an expression in ${math`a`}.`,
  answer: { kind: 'expression', expected: '2^a - 1', variables: ['a'], domains: { a: { kind: 'integer', min: 1, max: 12 } } },
  solution: [
    t`On ${math`r \le x < r + ${1}`}, ${math`${2}^{[x]} = ${2}^{r}`}: a rectangle of width ${1} and height ${math`${2}^{r}`}.`,
    t`So the integral is ${math`${1} + ${2} + ${2}^{${2}} + \cdots + ${2}^{a - ${1}}`}, a geometric series with ratio ${2}: its sum is ${math`\frac{${2}^{a} - ${1}}{${2} - ${1}} = ${2}^{a} - ${1}`}.`,
  ],
  reference: '2^a - 1',
  verify: () => {
    for (let a = 1; a <= 8; a++) if (Math.abs(riemann((x) => 2 ** Math.floor(x), a) - (2 ** a - 1)) > 1e-4 * 2 ** a) return `a = ${a}`;
    return null;
  },
  misconceptions: [{ response: '2^(a + 1) - 1', why: t`The last step is on ${math`a - ${1} \le x < a`}, with height ${math`${2}^{a - ${1}}`}: the powers run from ${math`${2}^{${0}}`} to ${math`${2}^{a - ${1}}`}.` }],
  official: { source: cite(F03H, 'Q3(ii)'), answer: '2^a - 1', agrees: true },
});

const step2004 = supervision({
  id: 'a3-q3',
  source: cite(F03, 'Q3 (2004 STEP I Q2)'),
  title: t`Integrals of the floor function`,
  prompt: t`The notation ${math`[x]`} means the greatest integer less than or equal to ${math`x`}. (i) Sketch the graph of ${math`y = \sqrt{[x]}`} and show that ${math`\int_{${0}}^{a} \sqrt{[x]}\,dx = \sum_{r = ${0}}^{a - ${1}} \sqrt{r}`} when ${math`a`} is a positive integer. (ii) Show that ${math`\int_{${0}}^{a} ${2}^{[x]}\,dx = ${2}^{a} - ${1}`} when ${math`a`} is a positive integer. (iii) Determine an expression for ${math`\int_{${0}}^{a} ${2}^{[x]}\,dx`} when ${math`a`} is positive but not an integer.`,
  writeUp: 'proof',
  official: cite(F03H, 'Q3'),
});

// ---------------------------------------------------------------- lesson

export const floorFunction: TopicContent = {
  topicId: 'fn.floor-function',
  goal: t`Use ${math`[x]`}, the greatest integer at most ${math`x`}, sketch step graphs, and find areas under them as sums of rectangles.`,
  objective: t`Evaluate and solve with the floor function, and find areas under its step graph.`,
  why: t`STEP loves a new function defined in the question; the floor is the classic one.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`The idea` },
    { kind: 'hook', text: t`${math`[${2.5}] = ${2}`}. So what is ${math`[-${2.5}]`}? If you said ${math`-${2}`}, you are in good company, and you are wrong. The definition, read carefully, says ${math`-${3}`}.` },
    { kind: 'narrative', text: t`STEP often defines a function in the question and then asks you to use it. The floor function is the classic: simple to state, easy to misread, and full of neat structure once you draw it.` },
    { kind: 'section', title: t`The definition` },
    {
      kind: 'definition',
      name: t`Floor function`,
      formal: t`For real ${math`x`}, the [[floor-function|floor]] ${math`[x]`} (also written ${math`\lfloor x \rfloor`}) is the greatest integer ${math`n`} with ${math`n \le x`}. Equivalently, ${math`[x]`} is the unique integer ${math`n`} with ${math`n \le x < n + ${1}`}.`,
      plain: t`Round down to a whole number. ${math`[\pi] = ${3}`}, ${math`[${5}] = ${5}`}, and ${math`[-${2.5}] = -${3}`}, because ${math`-${3}`} is the biggest whole number not above ${math`-${2.5}`}.`,
    },
    { kind: 'theorem', name: t`Shifting by an integer`, statement: t`For every real ${math`x`} and every integer ${math`k`}, ${math`[x + k] = [x] + k`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Use the second form`, text: t`Let ${math`n = [x]`}, so ${math`n \le x < n + ${1}`}.` },
        { label: t`Add k throughout`, text: t`${math`n + k \le x + k < n + k + ${1}`}.`, plain: t`Adding the same number to every part keeps the inequalities.` },
        { label: t`Read off the floor`, text: t`${math`n + k`} is an integer, so by the definition ${math`[x + k] = n + k = [x] + k`}.` },
      ],
    },
    checkFrom(floorValue, { kind: 'neg', num: 17, den: 4 }, t`${math`-${q(17, 4)}`} is ${math`-${4.25}`}, between ${math`-${5}`} and ${math`-${4}`}; the greatest integer at most it is ${math`-${5}`}.`),
    { kind: 'pitfall', claim: t`${math`[x]`} is ${math`x`} with its decimal part chopped off.`, counterexample: t`For ${math`x = -${2.5}`}, chopping gives ${math`-${2}`}, which is more than ${math`-${2.5}`}. The floor must be at most ${math`x`}: ${math`[-${2.5}] = -${3}`}. Chopping agrees with the floor only for ${math`x \ge ${0}`}.` },
    { kind: 'pitfall', claim: t`${math`[x + y] = [x] + [y]`} for all ${math`x, y`}.`, counterexample: t`${math`[${0.5} + ${0.5}] = [${1}] = ${1}`}, but ${math`[${0.5}] + [${0.5}] = ${0}`}. The theorem above only lets you pull out an integer.` },
    { kind: 'section', title: t`Equations with a floor` },
    { kind: 'narrative', text: t`The second form of the definition turns any equation ${math`[\ldots] = m`} into a pair of inequalities. For example ${math`[x + ${2}] = ${5}`} means ${math`${5} \le x + ${2} < ${6}`}, that is ${math`${3} \le x < ${4}`}: a whole interval of solutions, closed at the left and open at the right.` },
    checkFrom(floorEquation, { c: -1, m: 4, k: 2 }, t`${math`${4} \le ${2}x - ${1} < ${5}`}, so ${math`${5} \le ${2}x < ${6}`}, and ${math`${q(5, 2)} \le x < ${3}`}.`),
    { kind: 'section', title: t`The staircase and its area` },
    { kind: 'narrative', text: t`The graph of ${math`y = [x]`} is a staircase, a [[step-function|step function]]: flat at height ${math`r`} for ${math`r \le x < r + ${1}`}, with a jump at every integer. Draw each step with a filled dot at its left end and an open dot at its right end. Do not join the steps with solid vertical lines: the graph is a collection of separate pieces.` },
    {
      kind: 'p',
      text: t`So the area under ${math`y = [x]`} from ${0} to a positive integer ${math`a`} is a stack of rectangles of width ${1} and heights ${math`${0}, ${1}, \ldots, a - ${1}`}: ${math`\int_{${0}}^{a} [x]\,dx = ${0} + ${1} + \cdots + (a - ${1}) = \frac{a(a - ${1})}{${2}}`}. (Write the sum forwards and backwards and add the two rows: each of the ${math`a`} columns adds to ${math`a - ${1}`}, so twice the sum is ${math`a(a - ${1})`}.)`,
      why: { q: t`Why does the jump at each integer not matter?`, a: t`A single point has no width, so changing the value there changes no area.` },
    },
    checkFrom(floorArea, { whole: 5, half: false }, t`Heights ${0}, ${1}, ${2}, ${3}, ${4}, each of width ${1}: the area is ${10}.`),
    { kind: 'takeaway', text: t`${math`[x] = n`} means ${math`n \le x < n + ${1}`}: use that to evaluate, to solve, and to cut areas into rectangles.` },
  ],
  examples: [
    withExaminer(workedCambridge(a3q2ii), t`Each floor justified by the integers on either side, including a bound for ${math`\pi`} good enough to fix ${math`[${10}\pi]`}.`),
    worked(floorArea, { whole: 6, half: true }, t`An area that ends halfway along a step`),
    worked(floorEquation, { c: 3, m: -2, k: 1 }, t`An equation with a floor`),
  ],
  generators: [floorValue, floorArea, floorEquation],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['floor-function', 'step-function'],
  cambridge: withUses([a3q2iv, a3q2v, a3q3ii, step2004], {
    'a3-q3': { sections: ['The definition', 'The staircase and its area'], note: t`Areas under step graphs as sums, including a geometric sum` },
    'a3-q3-ii': { sections: ['The staircase and its area'], note: t`The area under a step graph as a geometric sum` },
    'a3-q2-v': { sections: ['The definition', 'The staircase and its area'], note: t`Sketching a product with the floor function and adding the areas piece by piece` },
  }),
  gate: ['a3-q3', 'a3-q3-ii', 'a3-q2-v'],
  recall: [
    { front: t`Define ${math`[x]`}.`, back: t`The greatest integer at most ${math`x`}: the integer ${math`n`} with ${math`n \le x < n + ${1}`}.` },
    { front: t`${math`[x + k]`} for an integer ${math`k`}?`, back: t`${math`[x] + k`}.` },
  ],
  proofOrder: [{
    title: t`An integer slides out of the floor`,
    steps: [
      t`Let ${math`n = [x]`}, so ${math`n \le x < n + ${1}`}.`,
      t`Add ${math`k`}: ${math`n + k \le x + k < n + k + ${1}`}.`,
      t`${math`n + k`} is an integer, so it is the floor of ${math`x + k`}.`,
    ],
  }],
};
