/**
 * calc.derivatives: the derivative as the limit of chord gradients, the power rule (proved
 * for positive integer powers from the binomial expansion), and the standard derivatives of
 * x^n, e^(kx), and ln x with sums and constant multiples. The Cambridge problems are STEP
 * Support Foundation Assignment 9, Q2(i) and (ii) (y = x^3 - 12x + 1), with the answers of
 * the Assignment 9 hints compared in the content checks. The STEP specification lists
 * differentiation under STEP 1, Section A; the TMUA specification has it as MM6.1 and MM6.2.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { add, int, mul, pick, q, str, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { poly } from '../poly';
import { firstError, numDeriv, polyAt, polyDeriv } from '../prep-c';
import { computedMath as cm, dmath, math, t, type Span } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

const F09 = 'step-f09' as const;
const F09H = 'step-f09-hints' as const;
const POS = { x: { kind: 'real' as const, min: 0.5, max: 5 } };
const setKey = (xs: readonly Rational[]): string => xs.map(str).sort().join(',');

// ---------------------------------------------------------------- powers of x

/** A term a x^n; n is never 0 or 1, so the power rule always changes it. */
interface Term { a: number; n: Rational }
interface PowP { terms: Term[] }
const POWERS: readonly Rational[] = [q(-2), q(-1), q(1, 2), q(2), q(3), q(4), q(-1, 2), q(3, 2)];

/** The term as LaTeX, in the form a learner meets it: a\sqrt{x}, a/x, a/x^2, or a x^n. */
function termTex({ a, n }: Term): Span {
  const m = Math.abs(a);
  const coef = m === 1 ? '' : String(m);
  const key = str(n);
  if (key === '1/2') return m === 1 ? math`\sqrt{x}` : math`${m}\sqrt{x}`;
  if (key === '-1') return math`\frac{${m}}{x}`;
  if (key === '-2') return math`\frac{${m}}{x^{${2}}}`;
  if (key === '-1/2') return math`\frac{${m}}{\sqrt{x}}`;
  if (key === '3/2') return m === 1 ? math`x\sqrt{x}` : math`${m}x\sqrt{x}`;
  return coef === '' ? math`x^{${n}}` : math`${m}x^{${n}}`;
}

/** The sum of terms as LaTeX, with each sign written once. */
function sumTex(terms: readonly Term[]): Span {
  let out: Span = math``;
  terms.forEach((tm, i) => {
    const body = termTex(tm);
    if (i === 0) out = tm.a < 0 ? math`-${body}` : math`${body}`;
    else out = tm.a < 0 ? math`${out} - ${body}` : math`${out} + ${body}`;
  });
  return out;
}

const pw = (c: Rational, n: Rational): string => `(${str(c)})*x^(${str(n)})`;
const mulQ = (a: number, n: Rational): Rational => q(BigInt(a) * n.num, n.den);
const minus1 = (n: Rational): Rational => q(n.num - n.den, n.den);

const powerRule = generator<PowP>({
  id: 'power-rule',
  skill: 'Differentiate a sum of multiples of powers of x, rewriting roots and reciprocals as powers first.',
  params: (rng) => {
    const k = int(rng, 2, 3);
    const used = new Set<string>();
    const terms: Term[] = [];
    while (terms.length < k) {
      const n = pick(rng, POWERS);
      if (used.has(str(n))) continue;
      used.add(str(n));
      terms.push({ a: pick(rng, [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6]), n });
    }
    return { terms };
  },
  sane: ({ terms }) => (terms.every((tm) => tm.a !== 0 && str(tm.n) !== '0' && str(tm.n) !== '1') ? null : 'a term is constant or linear'),
  problem: ({ terms }) => ({
    prompt: t`Differentiate ${math`y = ${sumTex(terms)}`} with respect to ${math`x`}, for ${math`x > ${0}`}.`,
    answer: { kind: 'expression', expected: terms.map((tm) => pw(mulQ(tm.a, tm.n), minus1(tm.n))).join(' + '), variables: ['x'], domains: POS },
    solution: [
      t`Write every term as a power of ${math`x`}: ${math`\sqrt{x} = x^{${q(1, 2)}}`}, ${math`\frac{${1}}{x} = x^{${-1}}`}, ${math`\frac{${1}}{x^{${2}}} = x^{${-2}}`}.`,
      t`Then each ${math`ax^{n}`} becomes ${math`anx^{n - ${1}}`}: ${cm(terms.map((tm) => pw(mulQ(tm.a, tm.n), minus1(tm.n))).join(' + '))}.`,
    ],
  }),
  // Logarithmic route: d/dx x^n = x^n (n/x), from ln y = n ln x.
  solve: ({ terms }) => terms.map((tm) => `${tm.a}*${str(tm.n).includes('/') ? `(${str(tm.n)})` : str(tm.n)}*x^(${str(tm.n)})/x`).join(' + '),
  misconceptions: ({ terms }): Misconception[] => [
    { response: terms.map((tm) => pw(mulQ(tm.a, tm.n), tm.n)).join(' + '), why: t`The power drops by one: ${math`x^{n}`} becomes ${math`nx^{n - ${1}}`}, not ${math`nx^{n}`}.` },
    { response: terms.map((tm) => pw(q(tm.a), minus1(tm.n))).join(' + '), why: t`Bring the old power down as a factor: ${math`ax^{n}`} becomes ${math`anx^{n - ${1}}`}.` },
  ],
});

// ---------------------------------------------------------------- e^(kx) and ln(mx)

interface ExpP { A: number; k: Rational; B: number; m: number }
const expLn = generator<ExpP>({
  id: 'exp-and-ln',
  skill: 'Differentiate A e^(kx) + B ln(mx): the k comes down, and ln(mx) = ln m + ln x has derivative 1/x.',
  params: (rng) => ({
    A: pick(rng, [-4, -3, -2, 2, 3, 4, 5]),
    k: pick(rng, [q(-3), q(-2), q(2), q(3), q(4), q(1, 2), q(-1, 2)]),
    B: pick(rng, [-5, -3, -2, 2, 3, 4, 6]),
    m: pick(rng, [2, 3, 5, 7]),
  }),
  sane: ({ m }) => (m >= 2 ? null : 'm too small'),
  problem: ({ A, k, B, m }) => ({
    prompt: t`Differentiate ${math`y = ${A}e^{${k}x} ${B < 0 ? '-' : '+'} ${Math.abs(B)}\ln(${m}x)`} for ${math`x > ${0}`}.`,
    answer: { kind: 'expression', expected: `(${str(mulQ(A, k))})*e^((${str(k)})*x) + ${B}/x`, variables: ['x'], domains: POS },
    solution: [
      t`The derivative of ${math`e^{kx}`} is ${math`ke^{kx}`}, so ${math`${A}e^{${k}x}`} gives ${math`${mulQ(A, k)}e^{${k}x}`}.`,
      t`By the laws of logarithms ${math`\ln(${m}x) = \ln ${m} + \ln x`}, and ${math`\ln ${m}`} is a constant, so its derivative is ${0} and ${math`${B}\ln(${m}x)`} gives ${math`\frac{${B}}{x}`}.`,
    ],
  }),
  // The difference quotient's limit, read off from e^(k(x + h)) = e^(kx) e^(kh): the factor (e^(kh) - 1)/h tends to k.
  solve: ({ A, k, B }) => `${A}*e^(${str(k).includes('/') ? `(${str(k)})` : str(k)}*x)*(${str(k)}) + ${B}*x^(-1)`,
  misconceptions: ({ A, k, B, m }): Misconception[] => [
    { response: `${A}*e^((${str(k)})*x) + ${B}/x`, why: t`The ${math`k`} in ${math`e^{kx}`} comes down as a factor: the derivative of ${math`e^{kx}`} is ${math`ke^{kx}`}.` },
    { response: `(${str(mulQ(A, k))})*e^((${str(k)})*x) + ${B * m}/x`, why: t`${math`\ln(${m}x) = \ln ${m} + \ln x`}, and the constant ${math`\ln ${m}`} has derivative ${0}. So the derivative is ${math`\frac{${1}}{x}`}, with no factor ${m}.` },
    { response: `(${str(mulQ(A, k))})*x*e^((${str(k)})*x - 1) + ${B}/x`, why: t`The power rule is for a variable raised to a fixed power. In ${math`e^{kx}`} the variable is in the exponent, so the rule is ${math`ke^{kx}`}.` },
  ],
});

// ---------------------------------------------------------------- the gradient at a point

interface GradP { c: number[]; a: number }
const gradAt = ({ c, a }: GradP): number => polyAt(polyDeriv(c), a);
/** The slip of keeping the power: sum of c_i n a^n. */
const keptPower = ({ c, a }: GradP): number => c.reduce((s, ci, i) => s + ci * (c.length - 1 - i) * a ** (c.length - 1 - i), 0);

const gradientAt = generator<GradP>({
  id: 'gradient-at-point',
  skill: 'Find the gradient of a polynomial curve at a point by differentiating and substituting.',
  quick: true,
  params: (rng) => {
    for (;;) {
      const p: GradP = { c: [pick(rng, [1, 2, -1, 3]), int(rng, -4, 4), int(rng, -9, 9), int(rng, -6, 6)], a: pick(rng, [-3, -2, -1, 2, 3]) };
      const right = gradAt(p);
      if (new Set([right, polyAt(p.c, p.a), keptPower(p)]).size === 3) return p;
    }
  },
  sane: ({ c }) => (c[0] !== 0 ? null : 'not a cubic'),
  problem: (p) => ({
    prompt: t`Find the gradient of the curve ${cm(`y = ${poly(p.c)}`)} at the point where ${math`x = ${p.a}`}.`,
    answer: { kind: 'exact', expected: String(gradAt(p)) },
    solution: [
      t`Differentiate term by term: ${math`\frac{dy}{dx} = ${cm(poly(polyDeriv(p.c)))}`}.`,
      t`Substitute ${math`x = ${p.a}`}: the gradient is ${gradAt(p)}.`,
    ],
  }),
  // The chord gradient over a tiny step, rounded: an independent route to the same number.
  solve: (p) => String(Math.round(numDeriv((x) => polyAt(p.c, x), p.a))),
  misconceptions: (p): Misconception[] => [
    { response: String(polyAt(p.c, p.a)), why: t`That is the height of the curve, ${math`y`}, at ${math`x = ${p.a}`}. The gradient is ${math`\frac{dy}{dx}`} there: differentiate first, then substitute.` },
    { response: String(keptPower(p)), why: t`Each power drops by one when you differentiate: ${math`x^{${3}}`} gives ${math`${3}x^{${2}}`}, not ${math`${3}x^{${3}}`}.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const CUBIC = [1, 0, -12, 1];
const cubicTex = cm(poly(CUBIC));

const turningX = auto({
  id: 'a9-q2-ii-a',
  source: cite(F09, 'Assignment 9, Q2(ii)(a)'),
  title: t`The turning points of a cubic`,
  prompt: t`Consider the graph of ${math`y = ${cubicTex}`}. Find the ${math`x`} coordinates of the turning points.`,
  answer: {
    kind: 'witness', count: 2, unordered: true, example: '-2, 2',
    check: (vals) => (setKey(vals) === setKey([q(-2), q(2)]) ? null : 'At a turning point the gradient is 0: solve dy/dx = 0.'),
  },
  solution: [
    t`Differentiate: ${math`\frac{dy}{dx} = ${cm(poly(polyDeriv(CUBIC)))}`}.`,
    t`At a turning point the gradient is ${0}: ${math`${3}x^{${2}} - ${12} = ${0}`}, so ${math`x^{${2}} = ${4}`}, and ${math`x = ${2}`} or ${math`x = ${-2}`}.`,
  ],
  reference: '-2, 2',
  verify: () => firstError(
    same('dy/dx at -2', polyAt(polyDeriv(CUBIC), -2), 0),
    same('dy/dx at 2', polyAt(polyDeriv(CUBIC), 2), 0),
    same('numeric slope at 2 rounds to 0', Math.round(numDeriv((x) => polyAt(CUBIC, x), 2)), 0),
  ),
  misconceptions: [{ response: '-4, 4', why: t`Solve ${math`x^{${2}} = ${4}`}: ${math`x`} is the square root of ${4}, that is ${math`\pm ${2}`}.` }],
  official: { source: cite(F09H, 'Assignment 9 hints, Q2(ii)(a)'), answer: '-2, 2', agrees: true },
});

const solveQuad = auto({
  id: 'a9-q2-i',
  source: cite(F09, 'Assignment 9, Q2(i)'),
  title: t`Solve without dividing`,
  prompt: t`Solve the equation ${math`${5}x^{${2}} + ${3}x = ${0}`}.`,
  answer: {
    kind: 'witness', count: 2, unordered: true, example: '0, -3/5',
    check: (vals) => (setKey(vals) === setKey([q(0), q(-3, 5)]) ? null : 'Factorise: x(5x + 3) = 0.'),
  },
  solution: [
    t`Factorise rather than divide by ${math`x`}, which might be ${0}: ${math`x(${5}x + ${3}) = ${0}`}.`,
    t`A product is ${0} only when a factor is: ${math`x = ${0}`} or ${math`x = ${q(-3, 5)}`}.`,
  ],
  reference: '0, -3/5',
  verify: () => {
    const r = q(-3, 5);
    return same('5x^2 + 3x at x = -3/5', str(add(mul(q(5), mul(r, r)), mul(q(3), r))), '0');
  },
  misconceptions: [{ response: '0, 3/5', why: t`Check the sign: ${math`${5}x + ${3} = ${0}`} gives ${math`${5}x = -${3}`}, so ${math`x = ${q(-3, 5)}`}.` }],
  official: { source: cite(F09H, 'Assignment 9 hints, Q2(i)'), answer: '0, -3/5', agrees: true },
});

const turningY = auto({
  id: 'a9-q2-ii-d',
  source: cite(F09, 'Assignment 9, Q2(ii)(b), (d)'),
  title: t`The heights of the turning points`,
  prompt: t`For the graph of ${math`y = ${cubicTex}`}, find the ${math`y`} coordinate of the maximum and then of the minimum. Give the two values in that order.`,
  answer: {
    kind: 'witness', count: 2, example: '17, -15',
    check: (vals) => (vals.map(str).join(',') === '17,-15' ? null : 'Substitute each turning point into y; the maximum is the one on the left for a cubic with positive x^3 term.'),
  },
  solution: [
    t`The turning points are at ${math`x = \pm ${2}`}. For large positive ${math`x`} the ${math`x^{${3}}`} term wins and ${math`y`} is large and positive, so the curve rises after the second turning point: the maximum is at ${math`x = ${-2}`} and the minimum at ${math`x = ${2}`}.`,
    t`At ${math`x = ${-2}`}: ${math`y = ${-8} + ${24} + ${1} = ${polyAt(CUBIC, -2)}`}. At ${math`x = ${2}`}: ${math`y = ${8} - ${24} + ${1} = ${polyAt(CUBIC, 2)}`}.`,
  ],
  reference: '17, -15',
  verify: () => firstError(same('y(-2)', polyAt(CUBIC, -2), 17), same('y(2)', polyAt(CUBIC, 2), -15), same('second derivative at -2 negative', polyAt(polyDeriv(polyDeriv(CUBIC)), -2) < 0, true)),
  misconceptions: [{ response: '-15, 17', why: t`The order is the maximum first. A cubic with a positive ${math`x^{${3}}`} term rises, falls, then rises, so its maximum is the left turning point, at ${math`x = ${-2}`}.` }],
  official: { source: cite(F09H, 'Assignment 9 hints, Q2(ii)(d)'), answer: '17, -15', agrees: true },
});

const rootCount = auto({
  id: 'a9-q2-ii-e',
  source: cite(F09, 'Assignment 9, Q2(ii)(e)'),
  title: t`How many real roots?`,
  prompt: t`The graph of ${math`y = ${cubicTex}`} has a maximum at ${math`(${-2}, ${17})`} and a minimum at ${math`(${2}, ${-15})`}. How many real roots does the equation ${math`${cubicTex} = ${0}`} have? You are not asked to find them.`,
  answer: { kind: 'exact', expected: '3' },
  solution: [
    t`The maximum is above the ${math`x`} axis and the minimum below it. Coming from the far left, where ${math`y`} is large and negative, the curve crosses the axis on its way up to the maximum.`,
    t`It crosses again on its way down to the minimum, and a third time on its way back up. So there are ${3} real roots.`,
  ],
  reference: '3',
  // Sign changes of y on a fine grid, an independent count.
  verify: () => {
    let n = 0;
    for (let x = -10; x < 10; x += 0.001) if (Math.sign(polyAt(CUBIC, x)) !== Math.sign(polyAt(CUBIC, x + 0.001))) n++;
    return same('sign changes', n, 3);
  },
  misconceptions: [{ response: '2', why: t`There are two turning points but three crossings: one before the maximum, one between the turning points, and one after the minimum.` }],
  official: { source: cite(F09H, 'Assignment 9 hints, Q2(ii)(e)'), answer: '3', agrees: true },
});

const sketch = supervision({
  id: 'a9-q2-ii',
  source: cite(F09, 'Assignment 9, Q2(ii)'),
  title: t`Sketch the cubic and count its roots`,
  prompt: t`Consider the graph of ${math`y = ${cubicTex}`}. Find the ${math`x`} coordinates of the turning points; by considering the shape of the graph, state which is the maximum and which the minimum; find where the graph meets the ${math`y`} axis; find the ${math`y`} coordinates of the turning points and sketch the graph. How many real roots does ${math`${cubicTex} = ${0}`} have? Do not find the roots.`,
  writeUp: 'sketch',
  official: cite(F09H, 'Assignment 9 hints, Q2(ii)'),
});

// ---------------------------------------------------------------- lesson

const H = [1, 0.1, 0.01];
const chord = (h: number): number => ((3 + h) ** 2 - 9) / h;
const L1: Term[] = [{ a: 4, n: q(1, 2) }, { a: -3, n: q(-1) }];

export const derivatives: TopicContent = {
  topicId: 'calc.derivatives',
  goal: t`Differentiate ${math`x^{n}`}, ${math`e^{kx}`}, and ${math`\ln x`}, with sums and constant multiples, and use the derivative as the gradient of a curve.`,
  objective: t`Differentiate powers of x, e to the kx, and ln x, and read the result as a gradient.`,
  why: t`Every later calculus lesson starts here: turning points, curve sketching, and integration.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`How steep is a curve?` },
    { kind: 'hook', text: t`A straight line has one gradient everywhere. The curve ${math`y = x^{${2}}`} does not: it is flat at the bottom and steeper the further out you go. So what could "the gradient at ${math`x = ${3}`}" even mean, when no straight line runs along the curve?` },
    { kind: 'narrative', text: t`Here is a way in. You know how to find the gradient of a straight line through two points. So take the point ${math`(${3}, ${9})`} on the curve and a second point a little further along, at ${math`x = ${3} + h`}, where ${math`h`} is a small number (say ${math`h = ${q(1, 10)}`}). The straight line through the two points is a chord. Its gradient you can compute.` },
    {
      kind: 'steps',
      steps: [
        { label: t`The two points`, text: t`The points are ${math`(${3}, ${9})`} and ${math`(${3} + h, (${3} + h)^{${2}})`}.`, plain: t`The second point is on the curve, so its height is its ${math`x`} squared.` },
        { label: t`Rise over run`, text: t`The gradient of the chord is the change in height over the change in ${math`x`}:`, eq: [dmath`\frac{(${3} + h)^{${2}} - ${9}}{h}`] },
        { label: t`Expand the square`, text: t`${math`(${3} + h)^{${2}} = ${9} + ${6}h + h^{${2}}`}, so the top is ${math`${6}h + h^{${2}}`}.`, why: { q: t`Why is ${math`(${3} + h)^{${2}} = ${9} + ${6}h + h^{${2}}`}?`, a: t`Multiply out ${math`(${3} + h)(${3} + h)`}: ${math`${3} \times ${3} = ${9}`}, two cross terms ${math`${3}h`} each, and ${math`h \times h = h^{${2}}`}.` } },
        { label: t`Divide by h`, text: t`Each term on top has a factor ${math`h`}, and ${math`h \ne ${0}`}, so we may divide:`, eq: [dmath`\frac{${6}h + h^{${2}}}{h} = ${6} + h`] },
      ],
    },
    { kind: 'table', caption: t`The chord gradient ${math`${6} + h`} as the second point slides towards the first`, head: [t`${math`h`}`, t`chord gradient`], rows: H.map((h) => [t`${h}`, t`${chord(h)}`]) },
    { kind: 'narrative', text: t`As ${math`h`} shrinks the chord swings round and settles on one line, the tangent, and its gradient settles on ${6}. We never set ${math`h = ${0}`} (the two points would coincide and the fraction would be ${math`\frac{${0}}{${0}}`}); we ask what the gradient approaches. That number is what we mean by the gradient of the curve at the point.` },
    {
      kind: 'definition',
      name: t`Derivative`,
      formal: t`Let ${math`f`} be a real function defined near ${math`a`}. ${math`f`} is [[differentiable|differentiable]] at ${math`a`} if the limit ${math`\displaystyle f'(a) = \lim_{h \to ${0}} \frac{f(a + h) - f(a)}{h}`} exists. The number ${math`f'(a)`} is the [[derivative|derivative]] of ${math`f`} at ${math`a`}. When ${math`y = f(x)`} we also write ${math`\frac{dy}{dx}`} for ${math`f'(x)`}.`,
      plain: t`The derivative is the gradient the chords settle on as the second point slides into the first. For ${math`f(x) = x^{${2}}`} at ${math`a = ${3}`}, the chords have gradient ${math`${6} + h`}, so ${math`f'(${3}) = ${6}`}.`,
    },
    checkFrom(gradientAt, { c: [1, 0, -2, 4], a: 2 }, t`Differentiate first: ${math`\frac{dy}{dx} = ${cm(poly(polyDeriv([1, 0, -2, 4])))}`}, then put ${math`x = ${2}`} to get ${gradAt({ c: [1, 0, -2, 4], a: 2 })}.`),
    { kind: 'section', title: t`The rules` },
    { kind: 'narrative', text: t`Computing a limit every time would be slow. The same algebra as for ${math`x^{${2}}`} works for any whole number power, and gives a rule you can use at once.` },
    { kind: 'theorem', name: t`Power rule`, statement: t`For every integer ${math`n \ge ${1}`} and every real ${math`x`}, ${math`\frac{d}{dx} x^{n} = nx^{n - ${1}}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Expand`, text: t`By the binomial theorem, ${math`(x + h)^{n} = x^{n} + nx^{n - ${1}}h + h^{${2}}P(x, h)`}, where ${math`P(x, h)`} is a polynomial in ${math`x`} and ${math`h`}.`, plain: t`Every term after the first two has at least ${math`h^{${2}}`} in it; we collect them all into ${math`h^{${2}}P`}.`, why: { q: t`Where do the first two terms come from?`, a: t`The binomial theorem says ${math`(x + h)^{n} = \sum_{k = ${0}}^{n} \binom{n}{k} x^{n - k} h^{k}`}. The ${math`k = ${0}`} term is ${math`x^{n}`}; the ${math`k = ${1}`} term is ${math`nx^{n - ${1}}h`}; every other term has ${math`k \ge ${2}`}.` } },
        { label: t`Form the quotient`, text: t`Subtract ${math`x^{n}`} and divide by ${math`h \ne ${0}`}:`, eq: [dmath`\frac{(x + h)^{n} - x^{n}}{h} = nx^{n - ${1}} + hP(x, h)`] },
        { label: t`Let h shrink`, text: t`For fixed ${math`x`}, ${math`P(x, h)`} stays bounded as ${math`h \to ${0}`}, so ${math`hP(x, h) \to ${0}`} and the quotient tends to ${math`nx^{n - ${1}}`}.`, plain: t`The leftover piece is ${math`h`} times something that stays a sensible size, so it vanishes.`, why: { q: t`Why does ${math`P(x, h)`} stay bounded?`, a: t`It is a polynomial, so for ${math`|h| \le ${1}`} each of its finitely many terms is at most a fixed number in size.` } },
      ],
    },
    { kind: 'narrative', text: t`The same rule holds for every real power ${math`n`} when ${math`x > ${0}`}; and the exponential and the logarithm have rules of their own. Their proofs come in the lessons on first principles and on the exponential series. Here we collect them and use them.` },
    { kind: 'theorem', name: t`Standard derivatives`, statement: t`For constants ${math`a`}, ${math`b`}, ${math`k`}, ${math`n`}: ${math`\frac{d}{dx} x^{n} = nx^{n - ${1}}`} (for ${math`x > ${0}`} when ${math`n`} is not a whole number); ${math`\frac{d}{dx} e^{kx} = ke^{kx}`}; ${math`\frac{d}{dx} \ln x = \frac{${1}}{x}`} for ${math`x > ${0}`}; and ${math`\frac{d}{dx}(af + bg) = af' + bg'`}.` },
    { kind: 'p', text: t`The last rule, linearity, lets you differentiate a sum one term at a time and carry constant multiples through.`, why: { q: t`Why may we split a sum?`, a: t`The chord quotient of ${math`af + bg`} is ${math`a`} times that of ${math`f`} plus ${math`b`} times that of ${math`g`}, and a limit of a sum is the sum of the limits.` } },
    { kind: 'section', title: t`Rewrite, then differentiate` },
    { kind: 'narrative', text: t`The rules are stated for powers, so first write roots and reciprocals as powers. Take ${math`y = ${sumTex(L1)}`}.` },
    {
      kind: 'steps',
      steps: [
        { label: t`Write as powers`, text: t`${math`${4}\sqrt{x} = ${4}x^{${q(1, 2)}}`} and ${math`\frac{${3}}{x} = ${3}x^{${-1}}`}, so ${math`y = ${4}x^{${q(1, 2)}} - ${3}x^{${-1}}`}.` },
        { label: t`Power rule on each term`, text: t`${math`${4} \times ${q(1, 2)} x^{${q(-1, 2)}} = ${2}x^{${q(-1, 2)}}`} and ${math`-${3} \times (${-1}) x^{${-2}} = ${3}x^{${-2}}`}.`, why: { q: t`Why is the new power ${math`-${2}`}?`, a: t`Subtract one from the old power: ${math`${-1} - ${1} = ${-2}`}.` } },
        { label: t`Tidy`, text: t`${math`\frac{dy}{dx} = \frac{${2}}{\sqrt{x}} + \frac{${3}}{x^{${2}}}`}.` },
      ],
    },
    { kind: 'pitfall', claim: t`By the power rule, the derivative of ${math`e^{x}`} is ${math`xe^{x - ${1}}`}.`, counterexample: t`The power rule needs the variable in the base and a fixed power. In ${math`e^{x}`} the variable is the power. At ${math`x = ${0}`} the curve ${math`y = e^{x}`} has gradient ${1} (its derivative is ${math`e^{x}`} itself), but ${math`xe^{x - ${1}}`} gives ${0}.` },
    { kind: 'pitfall', claim: t`The derivative of ${math`\ln(${2}x)`} is ${math`\frac{${2}}{x}`}.`, counterexample: t`${math`\ln(${2}x) = \ln ${2} + \ln x`}, and ${math`\ln ${2}`} is a constant, so the derivative is ${math`\frac{${1}}{x}`}. At ${math`x = ${1}`} that is ${1}, not ${2}.` },
    { kind: 'takeaway', text: t`The derivative is the limit of chord gradients; in practice, write each term as ${math`x^{n}`}, ${math`e^{kx}`}, or ${math`\ln x`} and apply its rule.` },
  ],
  examples: [
    { ...workedCambridge(turningX), examiner: t`The examiner looks for the derivative, the equation ${math`\frac{dy}{dx} = ${0}`}, and both roots, not just the positive one.` },
    worked(powerRule, { terms: [{ a: 6, n: q(3, 2) }, { a: -2, n: q(-2) }] }, t`Roots and reciprocals as powers`),
    worked(expLn, { A: 3, k: q(-2), B: 4, m: 5 }, t`An exponential and a logarithm`),
  ],
  generators: [powerRule, expLn, gradientAt],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['derivative', 'differentiable'],
  cambridge: [solveQuad, turningY, rootCount, sketch],
  gate: ['a9-q2-ii'],
  recall: [
    { front: t`Define the derivative ${math`f'(a)`}.`, back: t`${math`f'(a) = \lim_{h \to ${0}} \frac{f(a + h) - f(a)}{h}`}, when the limit exists.` },
    { front: t`State the power rule.`, back: t`${math`\frac{d}{dx} x^{n} = nx^{n - ${1}}`}.` },
    { front: t`What are the derivatives of ${math`e^{kx}`} and ${math`\ln x`}?`, back: t`${math`ke^{kx}`}, and ${math`\frac{${1}}{x}`} for ${math`x > ${0}`}.` },
  ],
  proofOrder: [{
    title: t`The power rule for whole number powers`,
    steps: [
      t`Expand ${math`(x + h)^{n}`} by the binomial theorem.`,
      t`Subtract ${math`x^{n}`}: every term left has a factor ${math`h`}.`,
      t`Divide by ${math`h`}: ${math`nx^{n - ${1}}`} plus ${math`h`} times a polynomial.`,
      t`Let ${math`h \to ${0}`}: the quotient tends to ${math`nx^{n - ${1}}`}.`,
    ],
  }],
};

