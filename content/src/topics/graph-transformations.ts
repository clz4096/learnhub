/**
 * fn.graph-transformations: from y = f(x) to y = f(x) + c, f(x + c), af(x), f(ax), f(-x),
 * and -f(x), point by point, and using a translation to count the roots of f(x) + k = 0. The
 * Cambridge problems are STEP Support Foundation Assignment 13, Q2(ii) (translations of
 * y = x^3 - 3x + 2), Assignment 22, Q3(iv) (y = sin(x^2)), Assignment 18, Q1(i), and the NST
 * Mathematics Workbook, FC2; the Assignment 13 and 22 hints' answers are compared in the
 * content checks.
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { div, int, pick, q, str } from '../math';
import { generator, type Misconception } from '../problem';
import { poly } from '../poly';
import { close, firstError, rootsOfLevel } from '../prep-c';
import { computedMath as cm, math, t, type Rich } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

const F13 = 'step-f13' as const;
const F13H = 'step-f13-hints' as const;
const F22 = 'step-f22' as const;
const F22H = 'step-f22-hints' as const;
const F18 = 'step-f18' as const;
const F18H = 'step-f18-hints' as const;
const NST = 'nst-workbook' as const;
const at = (x: string | number, y: string | number): string => `x = ${x}, y = ${y}`;
/** "x + 3", "x - 2", or "x": the inside of f( ) after a translation by -c. */
const shifted = (c: number): Rich => (c === 0 ? t`${math`x`}` : t`${cm(poly([1, c]))}`);

// ---------------------------------------------------------------- where a point goes

interface ImgP { p: number; qy: number; a: number; c: number; d: number }
const image = ({ p, qy, a, c, d }: ImgP): [number, number] => [p - c, a * qy + d];

const imagePoint = generator<ImgP>({
  id: 'image-point',
  skill: 'Find where a point of y = f(x) goes on y = af(x + c) + d: x moves by -c, then y is stretched by a and moved by d.',
  params: (rng) => {
    for (;;) {
      const g: ImgP = { p: int(rng, -4, 4), qy: int(rng, -5, 5), a: pick(rng, [2, 3, -2, -3]), c: pick(rng, [-3, -2, -1, 1, 2, 3]), d: int(rng, -4, 4) };
      const right = at(...image(g));
      const w1 = at(g.p + g.c, g.a * g.qy + g.d);
      const w2 = at(g.p - g.c, g.a * (g.qy + g.d));
      if (g.d !== 0 && g.qy !== 0 && new Set([right, w1, w2]).size === 3) return g;
    }
  },
  sane: ({ a, c }) => (a !== 0 && c !== 0 ? null : 'degenerate transformation'),
  problem: (g) => {
    const [x, y] = image(g);
    return {
      prompt: t`The point ${math`(${g.p}, ${g.qy})`} lies on the curve ${math`y = f(x)`}. Find the corresponding point on ${math`y = ${g.a}f(${shifted(g.c)}) ${g.d < 0 ? '-' : '+'} ${Math.abs(g.d)}`}. Give it as ${math`x = \ldots, y = \ldots`}.`,
      answer: { kind: 'witness', count: 2, names: ['x', 'y'], example: at(x, y), check: (vals) => (vals.map(str).join(',') === `${x},${y}` ? null : 'Find the x that makes the inside of f equal to the old x, then transform the height.') },
      solution: [
        t`Inside the bracket: the new curve uses ${math`f`} at ${shifted(g.c)}. To use the known value ${math`f(${g.p}) = ${g.qy}`}, we need ${math`${cm(poly([1, g.c]))} = ${g.p}`}, so ${math`x = ${x}`}.`,
        t`Outside: the height is ${math`${g.a} \times ${g.qy} ${g.d < 0 ? '-' : '+'} ${Math.abs(g.d)} = ${y}`}. So the point is ${math`(${x}, ${y})`}.`,
      ],
    };
  },
  // Substitute: the new curve at x is a f(x + c) + d, and f is known only at p.
  solve: (g) => {
    for (let x = -20; x <= 20; x++) if (x + g.c === g.p) return at(x, g.a * g.qy + g.d);
    return at(99, 99);
  },
  misconceptions: (g): Misconception[] => [
    { response: at(g.p + g.c, g.a * g.qy + g.d), why: t`${math`f(x + c)`} moves the graph ${math`c`} to the left, not the right: the new curve reaches the old ${math`x`} value ${math`c`} sooner.` },
    { response: at(g.p - g.c, g.a * (g.qy + g.d)), why: t`Stretch first, then add: ${math`af(x + c) + d`} multiplies the height by ${math`a`} and then adds ${math`d`}.` },
  ],
});

// ---------------------------------------------------------------- a horizontal stretch

interface StrP { p: number; qy: number; k: number }
const stretch = generator<StrP>({
  id: 'horizontal-stretch',
  skill: 'Find where a turning point goes on y = f(kx): its x coordinate is divided by k, its height unchanged.',
  quick: true,
  params: (rng) => {
    for (;;) {
      const g: StrP = { p: pick(rng, [-6, -4, -3, -2, 2, 3, 4, 6]), qy: pick(rng, [-5, -3, -2, 2, 3, 5, 7]), k: pick(rng, [2, 3, -2, 4]) };
      if (g.p !== g.qy) return g;
    }
  },
  sane: ({ k }) => (k !== 0 && k !== 1 ? null : 'not a stretch'),
  problem: (g) => {
    const x = div(q(g.p), q(g.k));
    return {
      prompt: t`The curve ${math`y = f(x)`} has a turning point at ${math`(${g.p}, ${g.qy})`}. Find the turning point of ${math`y = f(${g.k}x)`}. Give it as ${math`x = \ldots, y = \ldots`}.`,
      answer: { kind: 'witness', count: 2, names: ['x', 'y'], example: at(str(x), g.qy), check: (vals) => (vals.map(str).join(',') === `${str(x)},${g.qy}` ? null : 'The new curve takes the value f(p) where kx = p.') },
      solution: [
        t`The new curve at ${math`x`} is ${math`f(${g.k}x)`}. It takes the old turning value where ${math`${g.k}x = ${g.p}`}, that is ${math`x = ${x}`}.`,
        t`The height is unchanged, ${g.qy}. So the turning point is ${math`(${x}, ${g.qy})`}: the graph is squeezed towards the ${math`y`} axis by a factor ${math`${Math.abs(g.k)}`}${g.k < 0 ? t` and reflected in it` : t``}.`,
      ],
    };
  },
  solve: (g) => at(str(q(g.p * 6, g.k * 6)), g.qy),
  misconceptions: (g): Misconception[] => [
    { response: at(g.p * g.k, g.qy), why: t`${math`f(kx)`} reaches each value sooner, so ${math`x`} is divided by ${math`k`}, not multiplied.` },
    { response: at(g.p, g.qy * g.k), why: t`Multiplying inside the bracket acts on ${math`x`}, not on ${math`y`}: ${math`kf(x)`} would stretch the height.` },
  ],
});

// ---------------------------------------------------------------- counting roots by a translation

/** f(x) = x^3 - 3m^2 x + 2m^3 = (x - m)^2 (x + 2m): a minimum on the axis at x = m, a maximum of height 4m^3 at x = -m. */
interface TrP { m: number; c: number }
const base = (m: number): number[] => [1, 0, -3 * m * m, 2 * m ** 3];
const count = (m: number, c: number): number => rootsOfLevel(base(m), [-m, m], -c);

const translateCount = generator<TrP>({
  id: 'translate-count',
  skill: 'Count the distinct roots of f(x) + c = 0 by moving the graph of f up by c and watching its turning points.',
  params: (rng) => {
    const m = pick(rng, [1, 2]);
    const top = 4 * m ** 3;
    return { m, c: pick(rng, [-top - 3, -top, -top + 1, -1, -2, 1, 3, 5]) };
  },
  sane: ({ m }) => (m > 0 ? null : 'm must be positive'),
  problem: ({ m, c }) => {
    const co = base(m);
    const n = count(m, c);
    const top = 4 * m ** 3;
    return {
      prompt: t`${math`${cm(poly(co))} = (x - ${m})^{${2}}(x + ${2 * m})`}. How many distinct real roots has ${math`${cm(poly([1, 0, -3 * m * m, 2 * m ** 3 + c]))} = ${0}`}?`,
      answer: { kind: 'exact', expected: String(n) },
      solution: [
        t`The first curve touches the axis at its minimum ${math`(${m}, ${0})`} and has a maximum at ${math`(${-m}, ${top})`}. The new equation is the old curve plus ${c}: the graph moved ${c > 0 ? t`up by ${c}` : t`down by ${-c}`}.`,
        t`Moved, the turning points are ${math`(${-m}, ${top + c})`} and ${math`(${m}, ${c})`}. ${n === 3 ? t`One is above the axis and one below: ${3} roots.` : n === 2 ? t`One sits on the axis: ${2} distinct roots.` : t`Both are on the same side of the axis: ${1} root.`}`,
      ],
    };
  },
  solve: ({ m, c }) => {
    // Sign changes and zeros of the moved cubic on a fine grid.
    const f = (x: number): number => (x - m) ** 2 * (x + 2 * m) + c;
    let n = 0;
    const s = 1 / 128;
    for (let x = -20; x < 20; x += s) {
      const y0 = f(x);
      if (y0 === 0) n++;
      else if (f(x + s) !== 0 && Math.sign(y0) !== Math.sign(f(x + s))) n++;
    }
    return String(n);
  },
  misconceptions: ({ m, c }): Misconception[] => {
    const n = count(m, c);
    const pool: Misconception[] = [
      { response: String(count(m, -c)), why: t`Adding ${c} moves the graph ${c > 0 ? t`up` : t`down`}, not ${c > 0 ? t`down` : t`up`}: the turning points' heights change by ${c}.` },
      { response: '3', why: t`A cubic has at most three roots. After the move, check which side of the axis each turning point lies.` },
      { response: '2', why: t`Two distinct roots needs a turning point exactly on the axis. Work out the moved heights ${math`${4 * m ** 3} + c`} and ${math`${0} + c`}.` },
      { response: '1', why: t`One root needs both turning points on the same side of the axis. Work out their moved heights.` },
    ];
    const out: Misconception[] = [];
    for (const x of pool) if (x.response !== String(n) && !out.some((o) => o.response === x.response)) out.push(x);
    return out.slice(0, 2);
  },
});

// ---------------------------------------------------------------- Cambridge problems

const upTwo = auto({
  id: 'a13-q2-ii-b',
  source: cite(F13, 'Assignment 13, Q2(ii)(b)'),
  title: t`Moving a cubic up`,
  prompt: t`${math`y = x^{${3}} - ${3}x + ${2}`} has turning points ${math`(${-1}, ${4})`} and ${math`(${1}, ${0})`}. By considering ${math`y = x^{${3}} - ${3}x + ${4}`} as a transformation of it, find the minimum of ${math`y = x^{${3}} - ${3}x + ${4}`}, as ${math`x = \ldots, y = \ldots`}, and say how many distinct roots ${math`x^{${3}} - ${3}x + ${4} = ${0}`} has.`,
  answer: { kind: 'witness', count: 2, names: ['x', 'y'], example: 'x = 1, y = 2', check: (vals) => (vals.map(str).join(',') === '1,2' ? null : 'Adding 2 moves every point up by 2.') },
  solution: [
    t`${math`x^{${3}} - ${3}x + ${4} = (x^{${3}} - ${3}x + ${2}) + ${2}`}: the same curve moved up by ${2}. Every point keeps its ${math`x`} and gains ${2} in height.`,
    t`So the turning points move to ${math`(${-1}, ${6})`} and ${math`(${1}, ${2})`}: the minimum is ${math`(${1}, ${2})`}, and the ${math`y`} intercept moves from ${2} to ${4}.`,
    t`Both turning points are now above the axis, so the curve crosses it once: ${1} distinct root.`,
  ],
  reference: 'x = 1, y = 2',
  verify: () => firstError(same('y(1)', 1 - 3 + 4, 2), same('y(-1)', -1 + 3 + 4, 6), same('roots', rootsOfLevel([1, 0, -3, 4], [-1, 1], 0), 1)),
  misconceptions: [{ response: 'x = 3, y = 0', why: t`Adding a constant outside moves the curve up, not sideways: the ${math`x`} coordinate stays ${1}.` }],
  official: { source: cite(F13H, 'Assignment 13 hints, Q2(ii)(b)'), answer: 'x = 1, y = 2', agrees: true },
});

const downSix = auto({
  id: 'a13-q2-ii-c',
  source: cite(F13, 'Assignment 13, Q2(ii)(c)'),
  title: t`Moving a cubic down`,
  prompt: t`By considering ${math`y = x^{${3}} - ${3}x - ${4}`} as a translation of ${math`y = x^{${3}} - ${3}x + ${2}`} (turning points ${math`(${-1}, ${4})`} and ${math`(${1}, ${0})`}), state how many distinct roots ${math`x^{${3}} - ${3}x - ${4} = ${0}`} has.`,
  answer: { kind: 'exact', expected: '1' },
  solution: [
    t`${math`x^{${3}} - ${3}x - ${4} = (x^{${3}} - ${3}x + ${2}) - ${6}`}: the curve moved down by ${6}. The turning points go to ${math`(${-1}, ${-2})`} and ${math`(${1}, ${-6})`}.`,
    t`Both are below the axis, so the curve crosses it once, on its final rise: ${1} root.`,
  ],
  reference: '1',
  verify: () => same('roots', rootsOfLevel([1, 0, -3, -4], [-1, 1], 0), 1),
  misconceptions: [{ response: '3', why: t`After moving down by ${6}, even the maximum is at height ${-2}, below the axis. Only the final rising arm crosses.` }],
  official: { source: cite(F13H, 'Assignment 13 hints, Q2(ii)(c)'), answer: '1', agrees: true },
});

const evenQ = auto({
  id: 'a22-q3-iv-c',
  source: cite(F22, 'Assignment 22, Q3(iv)(c)'),
  title: t`A symmetry of sin of x squared`,
  prompt: t`If ${math`f(x) = \sin(x^{${2}})`}, express ${math`f(-a)`} in terms of ${math`f(a)`}.`,
  answer: { kind: 'choice', options: [{ id: 'same', label: t`${math`f(-a) = f(a)`}` }, { id: 'neg', label: t`${math`f(-a) = -f(a)`}` }, { id: 'none', label: t`no relation holds for every ${math`a`}` }], correct: 'same' },
  solution: [
    t`${math`f(-a) = \sin((-a)^{${2}}) = \sin(a^{${2}}) = f(a)`}, because ${math`(-a)^{${2}} = a^{${2}}`}.`,
    t`So ${math`f`} is even: the graph ${math`y = f(-x)`}, the reflection of ${math`y = f(x)`} in the ${math`y`} axis, is the same graph. Sketch it for ${math`x \ge ${0}`} and reflect.`,
  ],
  reference: ['same'],
  verify: () => {
    for (const a of [0.3, 1.1, 2.7]) {
      const e = close(`f(-${a}) against f(${a})`, Math.sin((-a) ** 2), Math.sin(a ** 2));
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [{ response: ['neg'], why: t`${math`\sin`} itself is odd, but here it is applied to ${math`x^{${2}}`}, and ${math`(-a)^{${2}} = a^{${2}}`}, so the sign never reaches the sine.` }],
  official: { source: cite(F22H, 'Assignment 22 hints, Q3(iv)(c)'), answer: ['same'], agrees: true },
});

const zerosQ = auto({
  id: 'a22-q3-iv-b',
  source: cite(F22, 'Assignment 22, Q3(iv)(b)', true),
  title: t`The zeros of sin of x squared`,
  prompt: t`Find the first four non-negative values of ${math`x`} for which ${math`\sin(x^{${2}}) = ${0}`}. Give the largest of the four, correct to ${3} significant figures.`,
  answer: { kind: 'numeric', expected: Math.sqrt(3 * Math.PI) },
  solution: [
    t`${math`\sin u = ${0}`} exactly when ${math`u`} is a multiple of ${math`\pi`}. Here ${math`u = x^{${2}} \ge ${0}`}, so ${math`x^{${2}} = ${0}, \pi, ${2}\pi, ${3}\pi, \ldots`}.`,
    t`The first four non-negative ${math`x`} are ${math`${0}, \sqrt{\pi}, \sqrt{${2}\pi}, \sqrt{${3}\pi}`}. They get closer together: the graph is ${math`y = \sin x`} with its ${math`x`} axis squeezed more and more. The largest is ${math`\sqrt{${3}\pi} \approx ${Number(Math.sqrt(3 * Math.PI).toPrecision(5))}`}.`,
  ],
  reference: String(Number(Math.sqrt(3 * Math.PI).toPrecision(6))),
  verify: () => {
    const zeros: number[] = [];
    for (let x = 0; x < 4 && zeros.length < 4; x += 1e-5) if (Math.abs(Math.sin(x * x)) < 1e-4 && (zeros.length === 0 || x - (zeros[zeros.length - 1] as number) > 0.1)) zeros.push(x);
    return close('fourth zero', zeros[3] ?? NaN, Math.sqrt(3 * Math.PI), 1e-3);
  },
  misconceptions: [{ response: String(Number((3 * Math.PI).toPrecision(6))), why: t`That is ${math`${3}\pi`}, the value of ${math`x^{${2}}`}. Take the square root to get ${math`x`}.` }],
  official: { source: cite(F22H, 'Assignment 22 hints, Q3(iv)(b)'), answer: String(Number(Math.sqrt(3 * Math.PI).toPrecision(6))), agrees: true },
});

const reciprocalQ = auto({
  id: 'a18-q1-i',
  source: cite(F18, 'Assignment 18, Q1(i)', true),
  title: t`One over x, moved`,
  prompt: t`The curve ${math`y = \frac{${1}}{x - ${1}}`} is a translation of ${math`y = \frac{${1}}{x}`}. Find its vertical asymptote ${math`x = c`}: give ${math`c`}.`,
  answer: { kind: 'exact', expected: '1' },
  solution: [
    t`${math`\frac{${1}}{x - ${1}} = f(x - ${1})`} with ${math`f(x) = \frac{${1}}{x}`}: the graph of ${math`\frac{${1}}{x}`} moved ${1} to the right.`,
    t`The asymptote ${math`x = ${0}`} moves with it to ${math`x = ${1}`}; the horizontal asymptote ${math`y = ${0}`} stays.`,
  ],
  reference: '1',
  verify: () => firstError(same('the denominator vanishes at 1', 1 - 1, 0), same('y blows up near 1', 1 / (1 + 1e-9 - 1) > 1e8, true)),
  misconceptions: [{ response: '-1', why: t`${math`f(x - ${1})`} moves the graph to the right by ${1}, so the asymptote moves from ${0} to ${1}.` }],
  official: { source: cite(F18H, 'Assignment 18 hints, Q1(i)'), answer: '1', agrees: true },
});

const nstFC2 = auto({
  id: 'nst-fc2-v',
  source: cite(NST, 'Functions and curve sketching, FC2(v)', true),
  title: t`Where the vertex goes`,
  prompt: t`Let ${math`f(x) = x^{${2}}`}. Find the lowest point of the curve ${math`y = f(${2}x + ${1}) + ${3}`}, as ${math`x = \ldots, y = \ldots`}.`,
  answer: { kind: 'witness', count: 2, names: ['x', 'y'], example: 'x = -1/2, y = 3', check: (vals) => (vals.map(str).join(',') === '-1/2,3' ? null : 'The lowest point of f is at 0: solve 2x + 1 = 0.') },
  solution: [
    t`${math`f`} is least at ${0}, where ${math`f(${0}) = ${0}`}. So ${math`f(${2}x + ${1})`} is least where ${math`${2}x + ${1} = ${0}`}, that is ${math`x = ${q(-1, 2)}`}.`,
    t`Then ${math`y = ${0} + ${3} = ${3}`}. The lowest point is ${math`(${q(-1, 2)}, ${3})`}: shift left by ${1}, squeeze by ${2} towards the ${math`y`} axis, and move up ${3}.`,
  ],
  reference: 'x = -1/2, y = 3',
  verify: () => {
    let best = Infinity;
    let arg = 0;
    for (let x = -3; x <= 3; x += 1 / 64) { const y = (2 * x + 1) ** 2 + 3; if (y < best) { best = y; arg = x; } }
    return firstError(same('arg min', arg, -0.5), same('min', best, 3));
  },
  misconceptions: [{ response: 'x = -1, y = 3', why: t`Solve ${math`${2}x + ${1} = ${0}`}: the squeeze by ${2} halves the shift as well, giving ${math`x = ${q(-1, 2)}`}.` }],
});

const sketchQ = supervision({
  id: 'a13-q2-ii',
  source: cite(F13, 'Assignment 13, Q2(ii)'),
  title: t`Three translations and a parameter`,
  prompt: t`By considering each of ${math`y = x^{${3}} - ${3}x`}, ${math`y = x^{${3}} - ${3}x + ${4}`}, and ${math`y = x^{${3}} - ${3}x - ${4}`} as a transformation of ${math`y = x^{${3}} - ${3}x + ${2}`}, sketch it, showing the coordinates of the turning points and the ${math`y`} intercept, and state how many distinct roots there are. State the values of ${math`k`} for which ${math`x^{${3}} - ${3}x + k = ${0}`} has (A) ${2} distinct roots and (B) ${3} distinct roots.`,
  writeUp: 'sketch',
  official: cite(F13H, 'Assignment 13 hints, Q2(ii)'),
});

// ---------------------------------------------------------------- lesson

export const graphTransformations: TopicContent = {
  topicId: 'fn.graph-transformations',
  goal: t`Sketch ${math`y = af(x)`}, ${math`y = f(x) + a`}, ${math`y = f(x + a)`}, and ${math`y = f(ax)`} from ${math`y = f(x)`}, and use a translation to count the roots of ${math`f(x) = k`}.`,
  objective: t`Move, stretch, and reflect a known graph, and count roots by sliding it up or down.`,
  why: t`One sketch then answers a whole family of questions, as STEP's parameter questions demand.`,
  minutes: 15,
  lesson: [
    { kind: 'section', title: t`Moving a graph` },
    { kind: 'hook', text: t`You have sketched ${math`y = x^{${3}} - ${3}x^{${2}} + ${1}`}. Now you are asked about ${math`x^{${3}} - ${3}x^{${2}} + ${5}`}, ${math`x^{${3}} - ${3}x^{${2}} - ${3}`}, and ${math`x^{${3}} - ${3}x^{${2}} + k`} for every ${math`k`}. Do you need a new sketch each time? No: they are all the same curve, moved.` },
    { kind: 'narrative', text: t`The idea is to follow points. If ${math`(p, q)`} is on ${math`y = f(x)`}, where does it end up on the new curve? Adding a number outside ${math`f`} changes heights; changing ${math`x`} inside ${math`f`} changes where things happen. The inside one runs backwards, and that is the part to get right.` },
    { kind: 'definition', name: t`Translation and stretch`, formal: t`A [[translation|translation]] by ${math`(u, v)`} sends each point ${math`(x, y)`} to ${math`(x + u, y + v)`}. A stretch parallel to the ${math`y`} axis with factor ${math`a`} sends ${math`(x, y)`} to ${math`(x, ay)`}; one parallel to the ${math`x`} axis with factor ${math`b`} sends ${math`(x, y)`} to ${math`(bx, y)`}.`, plain: t`Slide the whole graph, or pull it away from an axis. A translation by ${math`(${2}, ${-1})`} moves ${math`(${0}, ${0})`} to ${math`(${2}, ${-1})`}.` },
    { kind: 'theorem', name: t`The standard transformations`, statement: t`Let ${math`G`} be the graph of ${math`y = f(x)`} and let ${math`(p, q)`} lie on ${math`G`}. For constants ${math`c`} and ${math`a \ne ${0}`}: ${math`y = f(x) + c`} is ${math`G`} translated by ${math`(${0}, c)`}, through ${math`(p, q + c)`}; ${math`y = f(x + c)`} is ${math`G`} translated by ${math`(-c, ${0})`}, through ${math`(p - c, q)`}; ${math`y = af(x)`} is ${math`G`} stretched parallel to the ${math`y`} axis by ${math`a`}, through ${math`(p, aq)`}; ${math`y = f(ax)`} is ${math`G`} stretched parallel to the ${math`x`} axis by ${math`\frac{${1}}{a}`}, through ${math`\left(\frac{p}{a}, q\right)`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Inside: the translation`, text: t`A point ${math`(x, y)`} is on ${math`y = f(x + c)`} exactly when ${math`(x + c, y)`} is on ${math`G`}.`, plain: t`To read the new curve at ${math`x`}, look up the old curve at ${math`x + c`}.` },
        { label: t`Name the old point`, text: t`Write ${math`p = x + c`}. Then ${math`x = p - c`}: each point ${math`(p, q)`} of ${math`G`} appears at ${math`(p - c, q)`}.`, why: { q: t`Why left and not right?`, a: t`If ${math`c = ${2}`}, the new curve at ${math`x = ${0}`} shows what the old one showed at ${2}: everything arrives ${2} sooner, so the graph is ${2} to the left.` } },
        { label: t`Inside: the stretch`, text: t`Likewise ${math`(x, y)`} is on ${math`y = f(ax)`} exactly when ${math`(ax, y)`} is on ${math`G`}; with ${math`p = ax`}, ${math`x = \frac{p}{a}`}.` },
        { label: t`Outside`, text: t`${math`(x, y)`} is on ${math`y = af(x) + c`} exactly when ${math`\left(x, \frac{y - c}{a}\right)`} is on ${math`G`}: heights are multiplied by ${math`a`}, then raised by ${math`c`}.` },
      ],
    },
    { kind: 'narrative', text: t`Two special cases are reflections: ${math`y = -f(x)`} reflects ${math`G`} in the ${math`x`} axis, and ${math`y = f(-x)`} reflects it in the ${math`y`} axis. When ${math`f(-x) = f(x)`} for every ${math`x`}, the graph is its own mirror image, and ${math`f`} is called even; ${math`\sin(x^{${2}})`} is an example.` },
    checkFrom(imagePoint, { p: 3, qy: 2, a: 2, c: 1, d: -1 }, t`Inside: ${math`x + ${1} = ${3}`} gives ${math`x = ${2}`}. Outside: ${math`${2} \times ${2} - ${1} = ${3}`}.`),
    { kind: 'pitfall', claim: t`${math`y = f(x + ${2})`} is ${math`y = f(x)`} moved ${2} to the right.`, counterexample: t`${math`f(x) = x^{${2}}`} has its vertex at ${math`x = ${0}`}; ${math`(x + ${2})^{${2}}`} has it where ${math`x + ${2} = ${0}`}, at ${math`x = ${-2}`}: ${2} to the left.` },
    { kind: 'pitfall', claim: t`${math`y = f(${2}x)`} stretches the graph to twice its width.`, counterexample: t`${math`\sin(${2}x)`} completes a wave in ${math`\pi`}, half the ${math`${2}\pi`} of ${math`\sin x`}: the graph is squeezed to half its width.` },
    { kind: 'section', title: t`Counting roots by sliding` },
    { kind: 'narrative', text: t`The roots of ${math`f(x) + k = ${0}`} are the crossings of the axis by ${math`y = f(x) + k`}, which is the graph of ${math`f`} moved up by ${math`k`}. So follow the turning points: each moves up by ${math`k`}. For ${math`x^{${3}} - ${3}x^{${2}} + ${1}`}, with turning points ${math`(${0}, ${1})`} and ${math`(${2}, ${-3})`}, adding ${math`k - ${1}`} gives ${math`x^{${3}} - ${3}x^{${2}} + k`}, with turning heights ${math`k`} and ${math`k - ${4}`}. Three roots need them on opposite sides of the axis: ${math`${0} < k < ${4}`}.` },
    { kind: 'takeaway', text: t`Changes outside ${math`f`} act on heights as written; changes inside act on ${math`x`} backwards: ${math`f(x + c)`} moves left, ${math`f(ax)`} squeezes by ${math`a`}.` },
  ],
  examples: [
    { ...workedCambridge(upTwo), examiner: t`The examiner looks for the transformation named (up ${2}), the new turning points stated, and the root count justified from their positions.` },
    worked(stretch, { p: 6, qy: -2, k: 3 }, t`Squeezing towards the axis`),
    worked(translateCount, { m: 2, c: -2 }, t`Sliding a cubic down`),
  ],
  generators: [imagePoint, stretch, translateCount],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['translation'],
  cambridge: withUses([downSix, evenQ, zerosQ, reciprocalQ, nstFC2, sketchQ], {
    'a13-q2-ii': { sections: ['Moving a graph', 'Counting roots by sliding'], note: t`Translating a cubic and counting roots as it slides`, needs: ['calc.stationary-points'] },
  }),
  gate: ['a13-q2-ii'],
  recall: [
    { front: t`What does ${math`y = f(x + c)`} do to the graph of ${math`f`}?`, back: t`Translates it by ${math`c`} to the left.` },
    { front: t`What does ${math`y = f(ax)`} do?`, back: t`Stretches it parallel to the ${math`x`} axis by factor ${math`\frac{${1}}{a}`}.` },
    { front: t`How do you count the roots of ${math`f(x) + k = ${0}`}?`, back: t`Move the graph of ${math`f`} up by ${math`k`} and count its crossings of the ${math`x`} axis.` },
  ],
  proofOrder: [{
    title: t`Why ${math`f(x + c)`} moves the graph left`,
    steps: [
      t`${math`(x, y)`} is on ${math`y = f(x + c)`} exactly when ${math`(x + c, y)`} is on the old graph.`,
      t`Call the old point's coordinate ${math`p = x + c`}.`,
      t`Then the new point is at ${math`x = p - c`}.`,
      t`So every point moves ${math`c`} to the left.`,
    ],
  }],
};
