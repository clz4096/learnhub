/**
 * calc.curve-sketching: sketching a cubic or quartic from its roots, turning points,
 * intercept, and end behaviour, and counting the real roots of f(x) = k from the sketch:
 * the line y = k meets each monotone piece at most once. The Cambridge problems are STEP
 * Support Foundation Assignment 9, Q2(iii), (iv) and Q3 (1993 STEP I Q7), Assignment 13, Q2
 * and Q3 (2012 STEP I Q2), and Assignment 22, Q4 (2015 STEP I Q1); the hints' answers are
 * compared in the content checks.
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { int, pick, q, str, type Rational } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { poly } from '../poly';
import { close, firstError, numDeriv, polyAt, polyDeriv, rootsOfLevel } from '../prep-c';
import { computedMath as cm, math, t, type Rich } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

const F09 = 'step-f09' as const;
const F09H = 'step-f09-hints' as const;
const F13 = 'step-f13' as const;
const F13H = 'step-f13-hints' as const;
const F22 = 'step-f22' as const;
const F22H = 'step-f22-hints' as const;
const setKey = (xs: readonly Rational[]): string => xs.map(str).sort().join(',');

// ---------------------------------------------------------------- cubics with integer turning points

/** y = x^3 - (3/2)(p + q)x^2 + 3pq x + d with p < q and p + q even: y' = 3(x - p)(x - q). */
interface Cub { p: number; q: number; d: number }
const coeffs = ({ p, q: r, d }: Cub): number[] => [1, (-3 * (p + r)) / 2, 3 * p * r, d];
const hiVal = (c: Cub): number => polyAt(coeffs(c), c.p);
const loVal = (c: Cub): number => polyAt(coeffs(c), c.q);
function cubParams(rng: () => number): Cub {
  for (;;) {
    const p = int(rng, -4, 3);
    const r = int(rng, p + 1, 5);
    if ((p + r) % 2 !== 0) continue;
    return { p, q: r, d: int(rng, -8, 8) };
  }
}

type Level = 'below' | 'at-min' | 'between' | 'at-max' | 'above';
interface CountP { c: Cub; level: Level; off: number }
const levelK = ({ c, level, off }: CountP): number => {
  switch (level) {
    case 'below': return loVal(c) - off;
    case 'at-min': return loVal(c);
    case 'between': return loVal(c) + Math.min(off, hiVal(c) - loVal(c) - 1);
    case 'at-max': return hiVal(c);
    case 'above': return hiVal(c) + off;
  }
};
const countFor = (level: Level): number => (level === 'between' ? 3 : level === 'at-min' || level === 'at-max' ? 2 : 1);

const countRoots = generator<CountP>({
  id: 'count-roots',
  skill: 'Count the distinct real roots of f(x) = k for a cubic by comparing k with the heights of the turning points.',
  params: (rng) => ({ c: cubParams(rng), level: pick(rng, ['below', 'at-min', 'between', 'between', 'at-max', 'above'] as const), off: int(rng, 1, 6) }),
  sane: (p) => (hiVal(p.c) - loVal(p.c) >= 2 ? null : 'the turning values are too close'),
  problem: (p) => {
    const co = coeffs(p.c);
    const k = levelK(p);
    const n = countFor(p.level);
    const where: Rich = p.level === 'between'
      ? t`${k} lies strictly between them, so the line crosses all three pieces: ${3} roots.`
      : p.level === 'at-min' || p.level === 'at-max'
        ? t`${k} equals a turning value, so the line touches the curve at that turning point and crosses it once more: ${2} distinct roots.`
        : t`${k} is ${p.level === 'above' ? t`above the maximum` : t`below the minimum`}, so the line meets only the one piece that runs from ${math`-\infty`} to ${math`+\infty`}: ${1} root.`;
    return {
      prompt: t`How many distinct real roots does the equation ${math`${cm(poly(co))} = ${k}`} have?`,
      answer: { kind: 'exact', expected: String(n) },
      solution: [
        t`Let ${math`f(x) = ${cm(poly(co))}`}. Then ${math`f'(x) = ${cm(poly(polyDeriv(co)))} = ${3}(${cm(poly([1, -p.c.p]))})(${cm(poly([1, -p.c.q]))})`}: a local maximum at ${math`(${p.c.p}, ${hiVal(p.c)})`} and a local minimum at ${math`(${p.c.q}, ${loVal(p.c)})`}.`,
        t`The roots are where the line ${math`y = ${k}`} meets ${math`y = f(x)`}. The curve rises from ${math`-\infty`} to ${hiVal(p.c)}, falls to ${loVal(p.c)}, then rises to ${math`+\infty`}, and each piece meets a horizontal line at most once.`,
        where,
      ],
    };
  },
  solve: (p) => String(rootsOfLevel(coeffs(p.c), [p.c.p, p.c.q], levelK(p))),
  misconceptions: (p): Misconception[] => {
    const n = countFor(p.level);
    const deg: Misconception = { response: '3', why: t`A cubic has at most three roots, not always three. Count where the line ${math`y = k`} meets the curve: compare ${math`k`} with the heights of the turning points.` };
    const tangent: Misconception = { response: n === 2 ? '1' : '2', why: n === 2 ? t`When ${math`k`} equals a turning value, the line touches the curve at the turning point: that is a root as well as the crossing on the far side.` : t`Two is only for ${math`k`} equal to a turning value, where the line just touches the curve.` };
    const one: Misconception = { response: '1', why: t`Between the two turning values the line crosses the rising piece, the falling piece, and the rising piece again: three roots.` };
    return n === 3 ? [one, { response: '2', why: tangent.why }] : n === 2 ? [deg, tangent] : [deg, tangent];
  },
});

// ---------------------------------------------------------------- x^3 + ... + k = 0 with two roots

const twoRootK = generator<Cub>({
  id: 'two-root-k',
  skill: 'Find the values of k for which f(x) + k = 0 has exactly two distinct roots: a turning point must sit on the axis.',
  params: (rng) => {
    for (;;) {
      const c = { ...cubParams(rng), d: 0 };
      const right = setKey([q(-hiVal(c)), q(-loVal(c))]);
      if (hiVal(c) !== -loVal(c) && right !== setKey([q(c.p), q(c.q)]) && hiVal(c) !== 0 && loVal(c) !== 0) return c;
    }
  },
  sane: (c) => (c.d === 0 ? null : 'no constant term expected'),
  problem: (c) => {
    const co = coeffs(c);
    const want = [q(-hiVal(c)), q(-loVal(c))];
    return {
      prompt: t`Find the two values of ${math`k`} for which ${math`${cm(poly(co))} + k = ${0}`} has exactly two distinct real roots.`,
      answer: { kind: 'witness', count: 2, unordered: true, example: want.map(str).join(', '), check: (vals) => (setKey(vals) === setKey(want) ? null : 'Move a turning point onto the x axis.') },
      solution: [
        t`Let ${math`g(x) = ${cm(poly(co))}`}. Its turning points are ${math`(${c.p}, ${hiVal(c)})`}, a maximum, and ${math`(${c.q}, ${loVal(c)})`}, a minimum.`,
        t`The curve ${math`y = g(x) + k`} is ${math`y = g(x)`} moved up by ${math`k`}. It meets the axis in exactly two points when a turning point lands on the axis: ${math`${hiVal(c)} + k = ${0}`} or ${math`${loVal(c)} + k = ${0}`}.`,
        t`So ${math`k = ${-hiVal(c)}`} or ${math`k = ${-loVal(c)}`}.`,
      ],
    };
  },
  solve: (c) => {
    // Search integer k for which the level -k is met in exactly two places.
    const found: number[] = [];
    for (let k = -2000; k <= 2000; k++) if (rootsOfLevel(coeffs(c), [c.p, c.q], -k) === 2) found.push(k);
    return found.join(', ');
  },
  misconceptions: (c): Misconception[] => [
    { response: `${hiVal(c)}, ${loVal(c)}`, why: t`Those are the heights of the turning points. Moving the curve up by ${math`k`} puts a turning point of height ${math`h`} on the axis when ${math`h + k = ${0}`}, so ${math`k = -h`}.` },
    { response: `${c.p}, ${c.q}`, why: t`Those are the ${math`x`} coordinates of the turning points. The question is about ${math`k`}, which moves the curve up and down: compare it with the heights.` },
  ],
});

// ---------------------------------------------------------------- quartics x^4 - 2a^2 x^2 + b

interface QuartP { a: number; b: number }
const quart = ({ a, b }: QuartP): number[] => [1, 0, -2 * a * a, 0, b];
const quartCount = ({ a, b }: QuartP): number => rootsOfLevel([1, 0, -2 * a * a, 0, 0], [-a, 0, a], -b);
const quartic = generator<QuartP>({
  id: 'quartic-roots',
  skill: 'Count the distinct real roots of x^4 - 2a^2 x^2 + b = 0 from the W shape: a maximum at the y intercept and two equal minima.',
  params: (rng) => {
    for (;;) {
      const a = pick(rng, [1, 2]);
      const b = pick(rng, [-3, -1, 0, 1, 3, 8, 16, 20, a ** 4, a ** 4 + 2, a ** 4 - 1]);
      const p = { a, b };
      const n = quartCount(p);
      const wrongSign = rootsOfLevel([1, 0, -2 * a * a, 0, 0], [-a, 0, a], b);
      if (wrongSign !== n && wrongSign !== (n === 4 ? 2 : 4)) return p;
    }
  },
  sane: ({ a }) => (a > 0 ? null : 'a must be positive'),
  problem: (p) => {
    const co = quart(p);
    const a4 = p.a ** 4;
    return {
      prompt: t`How many distinct real roots does ${math`${cm(poly(co))} = ${0}`} have?`,
      answer: { kind: 'exact', expected: String(quartCount(p)) },
      solution: [
        t`Let ${math`f(x) = ${cm(poly(co))}`}. ${math`f'(x) = ${cm(poly(polyDeriv(co)))} = ${4}x(x - ${p.a})(x + ${p.a})`}: a local maximum at ${math`(${0}, ${p.b})`} and local minima at ${math`(\pm ${p.a}, ${p.b - a4})`}. The curve is a W, rising to ${math`+\infty`} at both ends.`,
        p.b > 0 && p.b - a4 > 0 ? t`Both minima are above the axis: no roots.`
          : p.b - a4 === 0 ? t`The minima sit on the axis and the maximum is above it: ${2} roots, at ${math`x = \pm ${p.a}`}.`
            : p.b > 0 ? t`The minima are below the axis and the maximum above: the W crosses the axis ${4} times.`
              : p.b === 0 ? t`The maximum touches the axis at ${math`x = ${0}`} and the minima are below it, so the curve also crosses once on each outer arm: ${3} roots.`
                : t`Even the maximum is below the axis: the curve crosses only on the two outer arms, ${2} roots.`,
      ],
    };
  },
  solve: (p) => {
    // Sign changes and zeros on a fine grid: an independent count.
    const f = (x: number): number => polyAt(quart(p), x);
    let n = 0;
    const step = 1 / 64;
    for (let x = -20; x < 20; x += step) {
      const y0 = f(x);
      const y1 = f(x + step);
      if (y0 === 0) n++;
      else if (y1 !== 0 && Math.sign(y0) !== Math.sign(y1)) n++;
    }
    return String(n);
  },
  misconceptions: (p): Misconception[] => [
    quartCount(p) === 4
      ? { response: '2', why: t`Both minima are below the axis and the maximum above it, so each minimum dips through the axis: two crossings around each, four in all.` }
      : { response: '4', why: t`A quartic has at most four roots, not always four. Count crossings: compare the heights of the maximum ${math`(${0}, b)`} and the minima with the axis.` },
    { response: String(rootsOfLevel([1, 0, -2 * p.a * p.a, 0, 0], [-p.a, 0, p.a], p.b)), why: t`Watch the sign: ${math`f(x) = ${0}`} means ${math`x^{${4}} - ${2 * p.a * p.a}x^{${2}} = -b`}, so the level to compare with the turning values is ${math`-b`}, not ${math`b`}.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const twoRootsQ = auto({
  id: 'a13-q2-ii-two',
  source: cite(F13, 'Assignment 13, Q2(ii)'),
  title: t`When does the cubic have two distinct roots?`,
  prompt: t`State the values of ${math`k`} for which the equation ${math`x^{${3}} - ${3}x + k = ${0}`} has exactly ${2} distinct roots.`,
  answer: { kind: 'witness', count: 2, unordered: true, example: '-2, 2', check: (vals) => (setKey(vals) === setKey([q(-2), q(2)]) ? null : 'Translate y = x^3 - 3x until a turning point touches the axis.') },
  solution: [
    t`${math`y = x^{${3}} - ${3}x`} has ${math`\frac{dy}{dx} = ${3}x^{${2}} - ${3}`}, zero at ${math`x = \pm ${1}`}: a maximum at ${math`(${-1}, ${2})`} and a minimum at ${math`(${1}, ${-2})`}.`,
    t`${math`y = x^{${3}} - ${3}x + k`} is that curve moved up by ${math`k`}. There are exactly two distinct roots when a turning point lies on the axis: ${math`${2} + k = ${0}`} or ${math`${-2} + k = ${0}`}.`,
    t`So ${math`k = ${-2}`} or ${math`k = ${2}`}. (For ${math`${-2} < k < ${2}`} there are three roots.)`,
  ],
  reference: '-2, 2',
  verify: () => firstError(
    same('roots for k = 2', rootsOfLevel([1, 0, -3, 0], [-1, 1], -2), 2),
    same('roots for k = -2', rootsOfLevel([1, 0, -3, 0], [-1, 1], 2), 2),
    same('roots for k = 1', rootsOfLevel([1, 0, -3, 0], [-1, 1], -1), 3),
  ),
  misconceptions: [{ response: '-1, 1', why: t`Those are the ${math`x`} coordinates of the turning points. The heights are ${math`\pm ${2}`}, and moving up by ${math`k`} puts one on the axis when ${math`k = \mp ${2}`}.` }],
  official: { source: cite(F13H, 'Assignment 13 hints, Q2(ii)'), answer: '2, -2', agrees: true },
});

const OPT6: readonly ChoiceOption[] = [
  { id: 'a', label: t`${math`y = x^{${3}} + ${3}x^{${2}} + ${1}`}` },
  { id: 'b', label: t`${math`y = ${2}x^{${3}} + ${6}x^{${2}} - ${3}`}` },
  { id: 'c', label: t`${math`y = ${4}x^{${3}} + ${6}x^{${2}} - ${3}`}` },
  { id: 'd', label: t`${math`y = x^{${3}} - ${6}x^{${2}} + ${2}`}` },
  { id: 'e', label: t`${math`y = ${2}x^{${3}} - ${3}x^{${2}} + ${2}`}` },
  { id: 'f', label: t`${math`y = x^{${3}} - ${12}x^{${2}} - ${6}`}` },
];
const SIX: Readonly<Record<string, number[]>> = { a: [1, 3, 0, 1], b: [2, 6, 0, -3], c: [4, 6, 0, -3], d: [1, -6, 0, 2], e: [2, -3, 0, 2], f: [1, -12, 0, -6] };
/** Each cubic ax^3 + bx^2 + d has turning points at 0 and -2b/(3a). */
const sixTurns = (c: number[]): number[] => [0, (-2 * (c[1] as number)) / (3 * (c[0] as number))];
const whichThree = auto({
  id: 'a9-q2-iv',
  source: cite(F09, 'Assignment 9, Q2(iii), (iv)'),
  title: t`Which cubics cross the axis three times?`,
  prompt: t`Each cubic below has a turning point on the ${math`y`} axis. Find the turning points, and decide which graphs have three ${math`x`} intercepts. Choose all that apply.`,
  answer: { kind: 'choice', options: OPT6, correct: ['b', 'd'] },
  solution: [
    t`For ${math`y = ax^{${3}} + bx^{${2}} + d`}, ${math`\frac{dy}{dx} = x(${3}ax + ${2}b)`}, so the turning points are at ${math`x = ${0}`} and ${math`x = -\frac{${2}b}{${3}a}`}.`,
    t`The turning points are: (a) ${math`(${-2}, ${5})`}, ${math`(${0}, ${1})`}; (b) ${math`(${-2}, ${5})`}, ${math`(${0}, ${-3})`}; (c) ${math`(${-1}, ${-1})`}, ${math`(${0}, ${-3})`}; (d) ${math`(${0}, ${2})`}, ${math`(${4}, ${-30})`}; (e) ${math`(${0}, ${2})`}, ${math`(${1}, ${1})`}; (f) ${math`(${0}, ${-6})`}, ${math`(${8}, ${-262})`}.`,
    t`A cubic has three ${math`x`} intercepts exactly when its turning points are on opposite sides of the axis: that is (b) and (d).`,
  ],
  reference: ['b', 'd'],
  verify: () => {
    const three = Object.entries(SIX).filter(([, c]) => rootsOfLevel(c, sixTurns(c), 0) === 3).map(([k]) => k).join(',');
    const heights = Object.values(SIX).map((c) => sixTurns(c).map((x) => polyAt(c, x)).join('/')).join(' ');
    return firstError(same('cubics with three roots', three, 'b,d'), same('turning heights', heights, '1/5 -3/5 -3/-1 2/-30 2/1 -6/-262'));
  },
  misconceptions: [{ response: ['b', 'c', 'd', 'f'], why: t`A negative ${math`y`} intercept is not enough. Both turning points of (c) are below the axis, and both of (f) too, so each crosses only once.` }],
  official: { source: cite(F09H, 'Assignment 9 hints, Q2(iv)'), answer: ['b', 'd'], agrees: true },
});

const sketchFRoots = auto({
  id: 'a13-q2-i',
  source: cite(F13, 'Assignment 13, Q2(i)'),
  title: t`A repeated root`,
  prompt: t`By factorising ${math`x^{${3}} - ${3}x + ${2}`} and finding its turning points, decide how many distinct roots the equation ${math`x^{${3}} - ${3}x + ${2} = ${0}`} has.`,
  answer: { kind: 'exact', expected: '2' },
  solution: [
    t`${math`x = ${1}`} is a root (${math`${1} - ${3} + ${2} = ${0}`}), and dividing out gives ${math`x^{${3}} - ${3}x + ${2} = (x - ${1})^{${2}}(x + ${2})`}.`,
    t`The turning points are ${math`(${-1}, ${4})`} and ${math`(${1}, ${0})`}: the minimum sits on the axis. The distinct roots are ${math`x = ${1}`} (repeated) and ${math`x = ${-2}`}, so there are ${2}.`,
  ],
  reference: '2',
  verify: () => firstError(same('distinct roots', rootsOfLevel([1, 0, -3, 2], [-1, 1], 0), 2), same('value at -2', polyAt([1, 0, -3, 2], -2), 0)),
  misconceptions: [{ response: '3', why: t`${math`(x - ${1})^{${2}}(x + ${2})`} has the root ${1} twice; distinct roots count it once.` }],
  official: { source: cite(F13H, 'Assignment 13 hints, Q2(i)'), answer: '2', agrees: true },
});

const step2012 = auto({
  id: 'a13-q3-i-three',
  source: cite(F13, 'Assignment 13, Q3(i)'),
  title: t`Exactly three roots of a quartic`,
  prompt: t`Let ${math`n`} be the number of distinct real values of ${math`x`} for which ${math`x^{${4}} - ${6}x^{${2}} + b = ${0}`}. For which value of ${math`b`} is ${math`n = ${3}`}?`,
  answer: { kind: 'exact', expected: '0' },
  solution: [
    t`${math`y = x^{${4}} - ${6}x^{${2}}`} has ${math`\frac{dy}{dx} = ${4}x(x^{${2}} - ${3})`}: a maximum at ${math`(${0}, ${0})`} and minima at ${math`(\pm\sqrt{${3}}, ${-9})`}.`,
    t`Adding ${math`b`} moves the W up by ${math`b`}. Three distinct roots need the maximum exactly on the axis (with the minima below), so ${math`${0} + b = ${0}`}: ${math`b = ${0}`}.`,
  ],
  reference: '0',
  verify: () => {
    const counts = [-1, 0, 1, 9, 10].map((b) => rootsOfLevel([1, 0, -6, 0, 0], [-Math.sqrt(3), 0, Math.sqrt(3)], -b)).join(',');
    return same('n for b = -1, 0, 1, 9, 10', counts, '2,3,4,2,0');
  },
  misconceptions: [{ response: '9', why: t`At ${math`b = ${9}`} the minima touch the axis and the maximum is above it: the roots are ${math`\pm\sqrt{${3}}`}, only ${2}.` }],
  official: { source: cite(F13H, 'Assignment 13 hints, Q3(i)'), answer: '0', agrees: true },
});

const g15 = (x: number): number => Math.exp(x) * (2 * x * x - 5 * x + 2);
const step2015 = auto({
  id: 'a22-q4-k-one',
  source: cite(F22, 'Assignment 22, Q4(i)', true),
  title: t`How many solutions for a given level?`,
  prompt: t`The curve ${math`y = e^{x}(${2}x^{${2}} - ${5}x + ${2})`} has stationary points at ${math`x = ${-1}`} and ${math`x = ${q(3, 2)}`}. How many real values of ${math`x`} satisfy ${math`e^{x}(${2}x^{${2}} - ${5}x + ${2}) = ${1}`}? You may assume that ${math`x^{n}e^{x} \to ${0}`} as ${math`x \to -\infty`}.`,
  answer: { kind: 'exact', expected: '3' },
  solution: [
    t`By the product rule, ${math`\frac{dy}{dx} = e^{x}(${2}x^{${2}} - x - ${3}) = e^{x}(${2}x - ${3})(x + ${1})`}: a maximum at ${math`(${-1}, \frac{${9}}{e})`} and a minimum at ${math`(${q(3, 2)}, -e^{${q(3, 2)}})`}. The curve crosses the axis at ${math`x = ${q(1, 2)}`} and ${math`x = ${2}`}.`,
    t`As ${math`x \to -\infty`}, ${math`y \to ${0}`} from above; as ${math`x \to \infty`}, ${math`y \to \infty`}.`,
    t`${math`\frac{${9}}{e}`} is about ${Math.round(900 / Math.E) / 100}, more than ${1}. So the line ${math`y = ${1}`} crosses the rising piece from ${0} up to the maximum, the falling piece, and the final rising piece: ${3} solutions.`,
  ],
  reference: '3',
  verify: () => {
    let n = 0;
    for (let x = -40; x < 10; x += 0.001) if (Math.sign(g15(x) - 1) !== Math.sign(g15(x + 0.001) - 1)) n++;
    return firstError(same('crossings of y = 1', n, 3), close('slope at -1', numDeriv(g15, -1), 0), close('slope at 3/2', numDeriv(g15, 1.5), 0), close('maximum', g15(-1), 9 / Math.E));
  },
  misconceptions: [{ response: '1', why: t`To the left of the maximum the curve rises from just above ${0} to ${math`\frac{${9}}{e}`}, which is more than ${1}, so it crosses ${math`y = ${1}`} there too.` }],
});

const step2015full = supervision({
  id: 'a22-q4',
  source: cite(F22, 'Assignment 22, Q4'),
  title: t`STEP: a cubic times an exponential`,
  prompt: t`(i) Sketch the curve ${math`y = e^{x}(${2}x^{${2}} - ${5}x + ${2})`}. Hence determine how many real values of ${math`x`} satisfy the equation ${math`e^{x}(${2}x^{${2}} - ${5}x + ${2}) = k`} in the different cases that arise according to the value of ${math`k`}. You may assume that ${math`x^{n}e^{x} \to ${0}`} as ${math`x \to -\infty`} for any integer ${math`n`}. (ii) Sketch the curve ${math`y = e^{x^{${2}}}(${2}x^{${4}} - ${5}x^{${2}} + ${2})`}.`,
  writeUp: 'sketch',
  official: cite(F22H, 'Assignment 22 hints, Q4'),
});

const step2012full = supervision({
  id: 'a13-q3',
  source: cite(F13, 'Assignment 13, Q3'),
  title: t`STEP: a quartic and its roots`,
  prompt: t`(i) Sketch the curve ${math`y = x^{${4}} - ${6}x^{${2}} + ${9}`}, giving the coordinates of the stationary points. Let ${math`n`} be the number of distinct real values of ${math`x`} for which ${math`x^{${4}} - ${6}x^{${2}} + b = ${0}`}. State the values of ${math`b`}, if any, for which ${math`n = ${0}`}, ${math`n = ${1}`}, ${math`n = ${2}`}, ${math`n = ${3}`}, ${math`n = ${4}`}. (ii) For which values of ${math`a`} does the curve ${math`y = x^{${4}} - ${6}x^{${2}} + ax + b`} have a point at which both ${math`\frac{dy}{dx} = ${0}`} and ${math`\frac{d^{${2}}y}{dx^{${2}}} = ${0}`}? For these values of ${math`a`}, find the number of distinct real values of ${math`x`} for which ${math`x^{${4}} - ${6}x^{${2}} + ax + b = ${0}`}, in the different cases that arise according to the value of ${math`b`}. (iii) Sketch the curve ${math`y = x^{${4}} - ${6}x^{${2}} + ax`} in the case ${math`a > ${8}`}.`,
  writeUp: 'explanation',
  official: cite(F13H, 'Assignment 13 hints, Q3'),
});

const step1993 = supervision({
  id: 'a9-q3',
  source: cite(F09, 'Assignment 9, Q3'),
  title: t`STEP: when a cubic has three real roots`,
  prompt: t`Sketch the curve ${math`f(x) = x^{${3}} + Ax^{${2}} + B`}, first in the case ${math`A > ${0}`} and ${math`B > ${0}`}, and then in the case ${math`A < ${0}`} and ${math`B > ${0}`}. Show that the equation ${math`x^{${3}} + ax^{${2}} + b = ${0}`}, where ${math`a`} and ${math`b`} are real, will have three distinct real roots if ${math`${27}b^{${2}} + ${4}a^{${3}}b < ${0}`}, but will have fewer than three if ${math`${27}b^{${2}} + ${4}a^{${3}}b > ${0}`}.`,
  writeUp: 'proof',
  official: cite(F09H, 'Assignment 9 hints, Q3'),
});

// ---------------------------------------------------------------- lesson

const EXC: Cub = { p: -1, q: 1, d: 2 };

export const curveSketching: TopicContent = {
  topicId: 'calc.curve-sketching',
  goal: t`Sketch a cubic or quartic from its roots, turning points, intercept, and end behaviour, and count the real roots of ${math`f(x) = k`} from the sketch.`,
  objective: t`Sketch a polynomial curve and use the sketch to count the roots of ${math`f(x) = k`} without solving.`,
  why: t`STEP asks "how many solutions" far more often than "find them"; a sketch answers it.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`Counting without solving` },
    { kind: 'hook', text: t`For which numbers ${math`k`} does ${math`x^{${3}} - ${27}x = k`} have three distinct real roots? There is a formula for the roots of a cubic, but it is a monster. STEP examiners want something better: an answer you can see. How can a picture count roots it never finds?` },
    { kind: 'narrative', text: t`The roots of ${math`f(x) = k`} are the ${math`x`} values where the curve ${math`y = f(x)`} meets the horizontal line ${math`y = k`}. So if you know the shape of the curve (where it rises, where it falls, and how high it gets) you can count meetings by sliding the line up and down. Two facts make that rigorous.` },
    { kind: 'theorem', name: t`Intermediate value theorem`, statement: t`If ${math`f`} is continuous on ${math`[a, b]`} and ${math`k`} lies strictly between ${math`f(a)`} and ${math`f(b)`}, then ${math`f(c) = k`} for some ${math`c`} with ${math`a < c < b`}.` },
    { kind: 'p', text: t`In plain words, the [[intermediate-value-theorem|intermediate value theorem]] says: a curve you can draw without lifting the pen cannot get from below a line to above it without crossing it. Polynomials are continuous. We use this theorem without proof; it is proved in IA Analysis.` },
    { kind: 'theorem', name: t`One crossing per monotone piece`, statement: t`If ${math`f'(x) > ${0}`} for all ${math`x`} in an interval except at finitely many points, then ${math`f`} is strictly increasing there, and ${math`f(x) = k`} has at most one solution in the interval. The same holds for ${math`f' < ${0}`}.` },
    { kind: 'narrative', text: t`Put them together for a cubic with a positive ${math`x^{${3}}`} term and two turning points: a local maximum of height ${math`M`} on the left and a local minimum of height ${math`m`} on the right, with ${math`m < M`}.` },
    { kind: 'theorem', name: t`Roots of a cubic`, statement: t`Let ${math`f`} be a cubic with positive leading coefficient, a local maximum value ${math`M`}, and a local minimum value ${math`m < M`}. Then ${math`f(x) = k`} has three distinct real roots if ${math`m < k < M`}; two if ${math`k = m`} or ${math`k = M`}; and one if ${math`k < m`} or ${math`k > M`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Three pieces`, text: t`Let the turning points be at ${math`p < q`}. Then ${math`f`} is strictly increasing on ${math`(-\infty, p]`}, strictly decreasing on ${math`[p, q]`}, and strictly increasing on ${math`[q, \infty)`}.`, why: { q: t`Why exactly these signs?`, a: t`${math`f'`} is a quadratic with positive leading coefficient and roots ${math`p`} and ${math`q`}, so it is positive outside ${math`[p, q]`} and negative inside.` } },
        { label: t`The values each piece takes`, text: t`Since ${math`f(x) \to -\infty`} as ${math`x \to -\infty`} and ${math`f(x) \to \infty`} as ${math`x \to \infty`}, the pieces take every value in ${math`(-\infty, M]`}, ${math`[m, M]`}, and ${math`[m, \infty)`} respectively, each exactly once.`, plain: t`By the intermediate value theorem each piece takes every value between its end heights, and by monotonicity only once.` },
        { label: t`Count`, text: t`If ${math`m < k < M`}, ${math`k`} is taken once on each piece: three roots. If ${math`k = M`}, it is taken at ${math`p`} (shared by the first two pieces) and once on the third: two. If ${math`k > M`} or ${math`k < m`}, only one piece takes it: one. ${math`k = m`} is like ${math`k = M`}.` },
      ],
    },
    checkFrom(countRoots, { c: EXC, level: 'between', off: 2 }, t`The turning values are ${hiVal(EXC)} and ${loVal(EXC)}, and ${levelK({ c: EXC, level: 'between', off: 2 })} lies strictly between them: three roots.`),
    { kind: 'pitfall', claim: t`A cubic equation always has three real roots.`, counterexample: t`${math`x^{${3}} + x + ${1} = ${0}`}: the derivative ${math`${3}x^{${2}} + ${1}`} is always positive, so the curve rises everywhere and crosses the axis exactly once.` },
    { kind: 'section', title: t`A sketching checklist` },
    { kind: 'narrative', text: t`To sketch ${math`y = f(x)`} for a polynomial, collect: the [[end-behaviour|end behaviour]] (the top power decides it); the ${math`y`} intercept ${math`f(${0})`}; the roots, if the polynomial factorises; the turning points from ${math`f'(x) = ${0}`}, with their heights. Then join them smoothly. Take ${math`y = x^{${3}} - ${3}x + ${2}`}.` },
    {
      kind: 'steps',
      steps: [
        { label: t`Ends`, text: t`The ${math`x^{${3}}`} term dominates: ${math`y \to -\infty`} on the left and ${math`+\infty`} on the right.` },
        { label: t`Intercept and roots`, text: t`${math`y(${0}) = ${2}`}. ${math`x = ${1}`} gives ${0}, and ${math`x^{${3}} - ${3}x + ${2} = (x - ${1})^{${2}}(x + ${2})`}: roots ${1} (repeated) and ${-2}.`, why: { q: t`How do you get the factorisation?`, a: t`Once ${math`x - ${1}`} is a factor, write ${math`x^{${3}} - ${3}x + ${2} = (x - ${1})(x^{${2}} + bx + c)`} and compare coefficients: ${math`b = ${1}`}, ${math`c = ${-2}`}, and ${math`x^{${2}} + x - ${2} = (x - ${1})(x + ${2})`}.` } },
        { label: t`Turning points`, text: t`${math`${3}x^{${2}} - ${3} = ${0}`} at ${math`x = \pm ${1}`}: ${math`(${-1}, ${4})`}, a maximum, and ${math`(${1}, ${0})`}, a minimum touching the axis.` },
        { label: t`Read off`, text: t`The minimum touches the axis, so the curve meets it at ${math`x = ${-2}`} and touches at ${math`x = ${1}`}: two distinct roots. Moving the curve up or down changes the count, as the theorem says.` },
      ],
    },
    { kind: 'narrative', text: t`Back to the hook: ${math`y = x^{${3}} - ${27}x`} has ${math`\frac{dy}{dx} = ${3}x^{${2}} - ${27}`}, which is ${0} at ${math`x = \pm ${3}`}, giving a local maximum value ${54} at ${math`x = -${3}`} and a local minimum value ${math`-${54}`} at ${math`x = ${3}`}. By the theorem, ${math`x^{${3}} - ${27}x = k`} has three distinct real roots exactly when ${math`-${54} < k < ${54}`}.` },
    { kind: 'narrative', text: t`The same reasoning works for quartics. ${math`y = x^{${4}} - ${8}x^{${2}} + b`} has ${math`\frac{dy}{dx} = ${4}x^{${3}} - ${16}x = ${4}x(x - ${2})(x + ${2})`}, so it is a W: a maximum at ${math`(${0}, b)`} and two minima at ${math`(\pm ${2}, b - ${16})`}. Slide it up and down and the number of crossings goes ${math`${2}, ${3}, ${4}, ${2}, ${0}`} as ${math`b`} rises through ${0} and ${16}.` },
    { kind: 'pitfall', claim: t`If both turning points of a cubic are above the axis, the cubic has no real root.`, counterexample: t`${math`y = x^{${3}} + ${3}x^{${2}} + ${1}`} has turning points ${math`(${-2}, ${5})`} and ${math`(${0}, ${1})`}, both above the axis, but it comes up from ${math`-\infty`} on the left, so it crosses once. Every cubic has at least one real root.` },
    { kind: 'takeaway', text: t`The roots of ${math`f(x) = k`} are meetings of the curve with a horizontal line: find the turning heights, and the line crosses each monotone piece at most once.` },
  ],
  examples: [
    { ...workedCambridge(twoRootsQ), examiner: t`The examiner looks for the turning points of the untranslated curve and a clear statement that two distinct roots means a turning point on the axis.` },
    worked(countRoots, { c: { p: -2, q: 2, d: 1 }, level: 'at-max', off: 1 }, t`A line through a turning point`),
    worked(quartic, { a: 1, b: -1 }, t`A W with its maximum below the axis`),
  ],
  generators: [countRoots, twoRootK, quartic],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['intermediate-value-theorem', 'end-behaviour'],
  cambridge: withUses([whichThree, sketchFRoots, step2012, step2015, step2015full, step2012full, step1993], {
    'a22-q4': { sections: ['A sketching checklist'], note: t`Sketching a polynomial times an exponential and counting solutions`, needs: ['calc.differentiation-rules'] },
    'a9-q3': { sections: ['Counting without solving', 'A sketching checklist'], note: t`When a cubic has three real roots, from its turning points` },
    'a13-q3': { sections: ['Counting without solving', 'A sketching checklist'], note: t`Counting the roots of a quartic as a constant changes` },
  }),
  // Assignment 22 Q4 differentiates a product with an exponential (the product rule, taught later), so it is practice.
  gate: ['a9-q3', 'a13-q3'],
  recall: [
    { front: t`State the intermediate value theorem.`, back: t`If ${math`f`} is continuous on ${math`[a, b]`} and ${math`k`} is strictly between ${math`f(a)`} and ${math`f(b)`}, then ${math`f(c) = k`} for some ${math`c`} in ${math`(a, b)`}.` },
    { front: t`A cubic with positive leading coefficient has turning values ${math`M > m`}. How many roots has ${math`f(x) = k`}?`, back: t`Three if ${math`m < k < M`}; two if ${math`k = m`} or ${math`k = M`}; one otherwise.` },
  ],
  proofOrder: [{
    title: t`Three roots between the turning values`,
    steps: [
      t`${math`f'`} is positive, then negative, then positive: three strictly monotone pieces.`,
      t`The pieces take the values ${math`(-\infty, M]`}, ${math`[m, M]`}, ${math`[m, \infty)`}.`,
      t`A level strictly between ${math`m`} and ${math`M`} is taken once on each piece.`,
      t`So ${math`f(x) = k`} has three distinct roots.`,
    ],
  }],
};
