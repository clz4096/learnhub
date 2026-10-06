/**
 * cx.complex-numbers: complex numbers x + iy: adding, multiplying, and dividing (by the
 * conjugate), the modulus and argument, multiplication as scaling and rotating (from the
 * compound angle formulae), and complex roots of real quadratics, such as those of x^4 + 1 = 0.
 * Problems: STEP Support Foundation Assignment 2 Q1(iv) (x^4 + 1 as a product of two
 * quadratics, with the official answer from the hints), Assignment 14 Q1(iv) (x^4 = -1), and
 * NST Maths Workbook Section 2 C1.
 */
import { auto, cite, supervision } from '../cambridge';
import { add, int, mul, pick, q, str, sub, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { computedTex, dmath, math, paren, t } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';
import { far } from '../partv-a';

const [mz, mw, mi, mth] = [math`z`, math`w`, math`i`, math`\theta`];
const XY = ['x', 'y'] as const;
/** a + bi as LaTeX, from integers or rationals. */
function cTex(a: Rational, b: Rational): string {
  const tex = (r: Rational): string => (r.den === 1n ? String(r.num < 0n ? -r.num : r.num) : `\\frac{${r.num < 0n ? -r.num : r.num}}{${r.den}}`);
  const re = a.num === 0n ? '' : `${a.num < 0n ? '-' : ''}${tex(a)}`;
  if (b.num === 0n) return re === '' ? '0' : re;
  const mag = b.num === b.den || -b.num === b.den ? '' : tex(b);
  const sign = b.num < 0n ? '-' : re === '' ? '' : '+';
  return `${re}${re === '' ? '' : ' '}${sign}${sign === '' || re === '' ? '' : ' '}${mag}i`;
}
const C = (a: number | Rational, b: number | Rational) => computedTex(cTex(typeof a === 'number' ? q(a) : a, typeof b === 'number' ? q(b) : b));
const xyAnswer = (x: Rational, y: Rational) => ({
  kind: 'witness' as const, count: 2, names: XY, example: `x = ${str(x)}, y = ${str(y)}`,
  check: (v: readonly Rational[]) => (v.map(str).join(',') === `${str(x)},${str(y)}` ? null : 'Collect the real terms and the terms in i separately, using i^2 = -1.'),
});

// ---------------------------------------------------------------- multiply and divide

interface ArP { a: number; b: number; c: number; d: number; op: 'mul' | 'div' }

const result = ({ a, b, c, d, op }: ArP): [Rational, Rational] => {
  if (op === 'mul') return [q(a * c - b * d), q(a * d + b * c)];
  const n = c * c + d * d;
  return [q(a * c + b * d, n), q(b * c - a * d, n)];
};

const arithmetic = generator<ArP>({
  id: 'multiply-divide',
  skill: 'Multiply complex numbers using i^2 = -1, and divide by multiplying top and bottom by the conjugate of the bottom.',
  params: (rng) => {
    for (;;) {
      const p: ArP = { a: int(rng, -5, 5), b: int(rng, -5, 5), c: int(rng, -4, 4), d: int(rng, -4, 4), op: pick(rng, ['mul', 'div'] as const) };
      if (p.b !== 0 && p.d !== 0 && p.a !== 0 && p.c !== 0) return p;
    }
  },
  sane: ({ c, d }) => (c * c + d * d > 0 ? null : 'division by zero'),
  problem: (p) => {
    const [x, y] = result(p);
    const z1 = C(p.a, p.b);
    const z2 = C(p.c, p.d);
    const n = p.c * p.c + p.d * p.d;
    return {
      prompt: p.op === 'mul'
        ? t`Write ${math`(${z1})(${z2})`} as ${math`x + iy`} with ${math`x`} and ${math`y`} real. Give ${math`x`} and ${math`y`}.`
        : t`Write ${math`\frac{${z1}}{${z2}}`} as ${math`x + iy`} with ${math`x`} and ${math`y`} real. Give ${math`x`} and ${math`y`}.`,
      answer: xyAnswer(x, y),
      solution: p.op === 'mul'
        ? [
          t`Multiply out as with any brackets: ${math`${p.a} \times ${p.c} + ${p.a} \times ${p.d}i + ${p.b}i \times ${p.c} + ${p.b}i \times ${p.d}i`}.`,
          t`The last term has ${math`i^{${2}} = -${1}`}, so it is ${math`${-p.b * p.d}`}: real. Collect: ${math`x = ${p.a * p.c} - (${p.b * p.d}) = ${x}`} and ${math`y = ${p.a * p.d} + ${p.b * p.c} = ${y}`}.`,
        ]
        : [
          t`Multiply top and bottom by the conjugate of the bottom, ${math`${C(p.c, -p.d)}`}, which makes the bottom real: ${math`(${z2})(${C(p.c, -p.d)}) = ${p.c}^{${2}} + ${Math.abs(p.d)}^{${2}} = ${n}`}.`,
          t`The top is ${math`(${z1})(${C(p.c, -p.d)}) = ${C(p.a * p.c + p.b * p.d, p.b * p.c - p.a * p.d)}`}.`,
          t`Divide each part by ${n}: ${math`x = ${x}`}, ${math`y = ${y}`}.`,
        ],
    };
  },
  solve: (p) => {
    // As 2 by 2 real matrices: a + bi is [[a, -b], [b, a]]; multiply, or multiply by the inverse.
    const [a, b, c, d] = [p.a, p.b, p.c, p.d];
    if (p.op === 'mul') return `x = ${a * c - b * d}, y = ${b * c + a * d}`;
    const det = c * c + d * d;
    // Inverse of [[c, -d], [d, c]] is [[c, d], [-d, c]] / det; apply to (a, b).
    return `x = ${str(q(c * a + d * b, det))}, y = ${str(q(-d * a + c * b, det))}`;
  },
  misconceptions: (p): Misconception[] => {
    const out: Misconception[] = [];
    if (p.op === 'mul') {
      out.push({ response: `x = ${p.a * p.c + p.b * p.d}, y = ${p.a * p.d + p.b * p.c}`, why: t`${math`i^{${2}} = -${1}`}, not ${1}: the product of the imaginary parts is subtracted from the real part.` });
      out.push({ response: `x = ${p.a * p.c}, y = ${p.b * p.d}`, why: t`Multiply every term by every term: the cross terms ${math`${p.a} \times ${p.d}i`} and ${math`${p.b}i \times ${p.c}`} belong in the imaginary part.` });
    } else {
      const n = p.c * p.c + p.d * p.d;
      out.push({ response: `x = ${str(q(p.a, p.c))}, y = ${str(q(p.b, p.d))}`, why: t`Complex numbers do not divide part by part. Multiply top and bottom by the conjugate of the bottom.` });
      out.push({ response: `x = ${str(q(p.a * p.c - p.b * p.d, n))}, y = ${str(q(p.a * p.d + p.b * p.c, n))}`, why: t`Multiply by the conjugate ${math`${C(p.c, -p.d)}`}, with the sign of the imaginary part changed, not by the bottom itself.` });
      out.push({ response: `x = ${p.a * p.c + p.b * p.d}, y = ${p.b * p.c - p.a * p.d}`, why: t`The bottom becomes ${math`${p.c}^{${2}} + ${p.d}^{${2}} = ${n}`}: divide both parts by it.` });
    }
    return out;
  },
});

// ---------------------------------------------------------------- complex roots of a quadratic

interface QuadP { p: number; qq: number }

const quadRoots = generator<QuadP>({
  id: 'complex-roots',
  skill: 'Solve a real quadratic with negative discriminant: the roots are a conjugate pair p + iq and p - iq.',
  params: (rng) => ({ p: int(rng, -5, 5), qq: int(rng, 1, 6) }),
  sane: ({ qq }) => (qq > 0 ? null : 'real roots'),
  problem: ({ p, qq }) => {
    const b = -2 * p;
    const c = p * p + qq * qq;
    const disc = b * b - 4 * c;
    const bTerm = b === 0 ? '' : `${b < 0 ? '-' : '+'} ${Math.abs(b) === 1 ? '' : Math.abs(b)}z `;
    return {
      prompt: t`The equation ${computedTex(`z^{${2}} ${bTerm}+ ${c} = ${0}`)} has a root with positive imaginary part, ${math`z = x + iy`}. Give ${math`x`} and ${math`y`}.`,
      answer: xyAnswer(q(p), q(qq)),
      solution: [
        t`The discriminant is ${math`${paren(b)}^{${2}} - ${4} \times ${c} = ${disc}`}, negative, so there are no real roots. Write ${math`\sqrt{${disc}} = \sqrt{${-disc}}\,i = ${2 * qq}i`}.`,
        t`The formula gives ${math`z = \frac{${-b} \pm ${2 * qq}i}{${2}} = ${p} \pm ${qq}i`}. The root with positive imaginary part has ${math`x = ${p}`}, ${math`y = ${qq}`}.`,
      ],
    };
  },
  solve: ({ p, qq }) => {
    // Check: the sum of the roots is 2p and the product p^2 + q^2; search for the pair.
    const b = -2 * p;
    const c = p * p + qq * qq;
    for (let x = -10; x <= 10; x++) for (let y = 1; y <= 10; y++) if (2 * x === -b && x * x + y * y === c) return `x = ${x}, y = ${y}`;
    return 'none';
  },
  misconceptions: ({ p, qq }): Misconception[] => [
    { response: `x = ${-p}, y = ${qq}`, why: t`The roots are ${math`\frac{-b \pm \sqrt{b^{${2}} - ${4}ac}}{${2}a}`}: the real part is ${math`-\frac{b}{${2}}`}, so check its sign.` },
    { response: `x = ${p}, y = ${2 * qq}`, why: t`Divide the whole numerator by ${math`${2}a = ${2}`}, the imaginary part as well.` },
    { response: `x = ${p}, y = ${-qq}`, why: t`That is the other root, the conjugate. The question asks for the one with positive imaginary part.` },
    { response: `x = ${p}, y = ${qq * qq}`, why: t`The imaginary part is ${math`\frac{\sqrt{${4}c - b^{${2}}}}{${2}}`}: take the square root.` },
  ],
});

// ---------------------------------------------------------------- the argument

interface ArgP { deg: number }
/** r(cos + i sin) with r = 2 for multiples of 30 degrees and sqrt 2 for odd multiples of 45: coordinates as LaTeX. */
function polarTex(deg: number): string {
  const s = Math.sin((deg * Math.PI) / 180);
  const c = Math.cos((deg * Math.PI) / 180);
  const tidy = (v: number): string => {
    if (Math.abs(v) < 1e-12) return '0';
    const m = Math.abs(v);
    const body = Math.abs(m - 1) < 1e-12 ? '1' : Math.abs(m - Math.sqrt(3)) < 1e-12 ? '\\sqrt{3}' : Math.abs(m - 2) < 1e-12 ? '2' : '?';
    return `${v < 0 ? '-' : ''}${body}`;
  };
  const r = deg % 90 === 45 ? Math.SQRT2 : 2;
  const [x, y] = [tidy(r * c), tidy(r * s)];
  if (x === '0') return `${y === '1' ? '' : y === '-1' ? '-' : y}i`;
  if (y === '0') return x;
  const yAbs = y.replace('-', '');
  return `${x} ${y.startsWith('-') ? '-' : '+'} ${yAbs === '1' ? '' : yAbs}i`;
}
/** The principal argument in (-180, 180], from degrees in [0, 360). */
const principal = (deg: number): number => (deg > 180 ? deg - 360 : deg);

const argument = generator<ArgP>({
  id: 'argument',
  skill: 'Find the principal argument of a complex number from its quadrant, as a multiple of pi in (-pi, pi].',
  quick: true,
  params: (rng) => ({ deg: pick(rng, [30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330]) }),
  sane: () => null,
  problem: ({ deg }) => {
    const k = q(principal(deg), 180);
    const ref = deg % 180 === 0 || deg % 180 === 90 ? null : deg % 90 === 45 ? 45 : Math.min(deg % 90, 90 - (deg % 90)) === 30 ? 30 : 60;
    return {
      prompt: t`Find the principal argument of ${math`z = ${computedTex(polarTex(deg))}`}. Write it as ${math`k\pi`} with ${math`-${1} < k \le ${1}`}, and give ${math`k`}.`,
      answer: { kind: 'exact', expected: str(k) },
      solution: [
        t`Plot ${mz} on the Argand diagram: real part across, imaginary part up. ${ref === null ? t`It lies on an axis.` : t`It lies in the quadrant given by the signs of its parts, at an angle whose tangent is ${math`\left|\frac{\text{Im}}{\text{Re}}\right|`} to the real axis.`}`,
        t`Measured anticlockwise from the positive real axis, and taken in ${math`(-\pi, \pi]`}, the angle is ${math`${k}\pi`}${principal(deg) < 0 ? t`, negative because ${mz} is below the real axis` : t``}.`,
      ],
    };
  },
  solve: ({ deg }) => {
    // Math.atan2 on the actual coordinates, then the nearest multiple of pi/12.
    const r = (deg * Math.PI) / 180;
    const a = Math.atan2(Math.sin(r), Math.cos(r));
    const k = Math.round((a / Math.PI) * 12);
    return str(q(k === -12 ? 12 : k, 12));
  },
  misconceptions: ({ deg }): Misconception[] => {
    const k = principal(deg);
    const out: Misconception[] = [];
    // arctan of Im/Re, ignoring the quadrant.
    if (deg % 90 !== 0) {
      const naive = Math.round((Math.atan(Math.tan((deg * Math.PI) / 180)) * 180) / Math.PI);
      out.push({ response: str(q(naive, 180)), why: t`${math`\arctan\frac{y}{x}`} only gives angles between ${math`-\frac{\pi}{${2}}`} and ${math`\frac{\pi}{${2}}`}. Check the quadrant from the signs of the real and imaginary parts.` });
    }
    if (k < 0) out.push({ response: str(q(deg, 180)), why: t`The principal argument lies in ${math`(-\pi, \pi]`}: subtract ${math`${2}\pi`}.` });
    out.push({ response: str(q(-k, 180)), why: t`That is the argument of the conjugate. Measure anticlockwise from the positive real axis.` });
    out.push({ response: String(deg), why: t`Give ${math`k`}, the multiple of ${math`\pi`}, not the angle in degrees.` });
    return out;
  },
});

// ---------------------------------------------------------------- Cambridge problems

const c1i = auto({
  id: 'nst-c1-i',
  source: cite('nst-workbook', 'Section 2, C1(i)'),
  title: t`The real and imaginary parts of a quotient`,
  prompt: t`Determine the real and imaginary parts of ${math`\frac{${1} + i}{${2} - i}`}. Give them as ${math`x`} and ${math`y`}, where the number is ${math`x + iy`}.`,
  answer: xyAnswer(q(1, 5), q(3, 5)),
  solution: [
    t`Multiply top and bottom by the conjugate ${math`${2} + i`}: the bottom becomes ${math`(${2} - i)(${2} + i) = ${4} + ${1} = ${5}`}.`,
    t`The top is ${math`(${1} + i)(${2} + i) = ${2} + i + ${2}i + i^{${2}} = ${1} + ${3}i`}.`,
    t`So the number is ${math`\frac{${1}}{${5}} + \frac{${3}}{${5}}i`}: real part ${math`\frac{${1}}{${5}}`}, imaginary part ${math`\frac{${3}}{${5}}`}.`,
  ],
  reference: 'x = 1/5, y = 3/5',
  verify: () => {
    // Check (x + iy)(2 - i) = 1 + i exactly.
    const [x, y] = [q(1, 5), q(3, 5)];
    const re = add(mul(x, q(2)), y);
    const im = sub(mul(y, q(2)), x);
    return str(re) === '1' && str(im) === '1' ? null : `product ${str(re)} + ${str(im)}i`;
  },
  misconceptions: [{ response: 'x = 1/2, y = -1', why: t`Complex numbers do not divide part by part: multiply by the conjugate of the bottom.` }],
});

const c1ii = auto({
  id: 'nst-c1-ii',
  source: cite('nst-workbook', 'Section 2, C1(ii)'),
  title: t`The roots of ${math`z^{${2}} - ${2}z + ${2} = ${0}`}, and their modulus`,
  prompt: t`Find the roots of ${math`z^{${2}} - ${2}z + ${2} = ${0}`}, and determine the modulus and argument of each. Enter the modulus (the same for both roots). Write square roots as sqrt.`,
  answer: { kind: 'expression', expected: 'sqrt(2)', variables: [] },
  solution: [
    t`The discriminant is ${math`${4} - ${8} = -${4}`}, so ${math`z = \frac{${2} \pm ${2}i}{${2}} = ${1} \pm i`}.`,
    t`${math`|${1} \pm i| = \sqrt{${1} + ${1}} = \sqrt{${2}}`}. The arguments are ${math`\pm\frac{\pi}{${4}}`}: ${math`${1} + i`} is on the diagonal of the first quadrant, ${math`${1} - i`} its mirror image.`,
  ],
  reference: 'sqrt(2)',
  verify: () => {
    // z = 1 + i: real part x^2 - y^2 - 2x + 2 and imaginary part 2xy - 2y of z^2 - 2z + 2 both vanish.
    const [x, y] = [1, 1];
    if (x * x - y * y - 2 * x + 2 !== 0 || 2 * x * y - 2 * y !== 0) return '1 + i is not a root';
    return far(Math.hypot(x, y), Math.SQRT2) ? 'modulus' : null;
  },
  misconceptions: [{ response: '2', why: t`That is the squared modulus, ${math`${1}^{${2}} + ${1}^{${2}}`}. Take the square root.` }],
});

const a2iv = auto({
  id: 'a2-q1-iv',
  source: cite('step-f02', 'Q1(iv)'),
  title: t`${math`x^{${4}} + ${1}`} as a product of two quadratics`,
  prompt: t`Simplify ${math`(x^{${2}} - \sqrt{${2}}x + ${1})(x^{${2}} + \sqrt{${2}}x + ${1})`}. Write square roots as sqrt.`,
  answer: { kind: 'expression', expected: 'x^4 + 1', variables: ['x'] },
  solution: [
    t`Write it as ${math`\left((x^{${2}} + ${1}) - \sqrt{${2}}x\right)\left((x^{${2}} + ${1}) + \sqrt{${2}}x\right)`}, a difference of two squares.`,
    t`${math`= (x^{${2}} + ${1})^{${2}} - ${2}x^{${2}} = x^{${4}} + ${2}x^{${2}} + ${1} - ${2}x^{${2}} = x^{${4}} + ${1}`}.`,
    t`So ${math`x^{${4}} + ${1} = ${0}`} splits into ${math`x^{${2}} \pm \sqrt{${2}}x + ${1} = ${0}`}, each with discriminant ${math`${2} - ${4} = -${2}`}: the four roots are ${math`x = \frac{\pm\sqrt{${2}} \pm i\sqrt{${2}}}{${2}}`}.`,
  ],
  reference: 'x^4 + 1',
  verify: () => {
    for (const x of [-1.3, 0.4, 2.2]) if (far((x * x - Math.SQRT2 * x + 1) * (x * x + Math.SQRT2 * x + 1), x ** 4 + 1)) return `x = ${x}`;
    // And (1 + i)/sqrt 2 has fourth power -1: its argument pi/4 times 4 is pi.
    return far(Math.cos(Math.PI), -1) ? 'fourth power' : null;
  },
  misconceptions: [{ response: 'x^4 + 2x^2 + 1', why: t`The cross terms give ${math`-(\sqrt{${2}}x)^{${2}} = -${2}x^{${2}}`}, which cancels the ${math`${2}x^{${2}}`}.` }],
  official: { source: cite('step-f02-hints', 'Q1(iv)'), answer: 'x^4 + 1', agrees: true },
});

const a14iv = supervision({
  id: 'a14-q1-iv',
  source: cite('step-f14', 'Q1(iv)'),
  title: t`The four values with ${math`x^{${4}} = -${1}`}`,
  prompt: t`Simplify ${math`(x^{${2}} + y^{${2}} - \sqrt{${2}}xy)(x^{${2}} + y^{${2}} + \sqrt{${2}}xy)`}. Use this result to find the four values of ${math`x`} that satisfy ${math`x^{${4}} = -${1}`}, and show that each has modulus ${1}. Mark them on an Argand diagram and say what their arguments are.`,
  writeUp: 'proof',
  official: cite('step-f14-hints', 'Q1(iv)'),
});

// ---------------------------------------------------------------- lesson

export const complexNumbers: TopicContent = {
  topicId: 'cx.complex-numbers',
  goal: t`Add, multiply, and divide ${math`x + iy`}, use the modulus and argument, and find complex roots such as those of ${math`x^{${4}} + ${1} = ${0}`}.`,
  objective: t`Calculate with complex numbers, use modulus and argument, and solve quadratics that have no real roots.`,
  why: t`Every polynomial has complex roots; Further Maths, STEP, and the first-year courses use them throughout.`,
  minutes: 30,
  lesson: [
    { kind: 'section', title: t`A square root of minus one` },
    { kind: 'hook', text: t`The equation ${math`x^{${4}} + ${1} = ${0}`} has no real solution: a fourth power is never negative. Assignment ${2} asks you to solve it anyway. The way in is to allow one new number, a square root of ${math`-${1}`}, and to find that every rule of algebra you know keeps working.` },
    { kind: 'definition', name: t`Complex number`, formal: t`A [[complex-number|complex number]] is an expression ${math`z = x + iy`} with ${math`x, y \in \mathbb{R}`}, where ${math`i^{${2}} = -${1}`}. Its real part is ${math`\operatorname{Re} z = x`} and its imaginary part is ${math`\operatorname{Im} z = y`}. Two complex numbers are equal when their real parts are equal and their imaginary parts are equal.`, plain: t`A pair of real numbers, written as ${math`x + iy`}, calculated with by the usual rules plus ${math`i^{${2}} = -${1}`}. For ${math`z = ${3} - ${2}i`}, the real part is ${3} and the imaginary part is ${math`-${2}`} (not ${math`-${2}i`}).` },
    { kind: 'p', text: t`Add and multiply as with brackets, replacing ${math`i^{${2}}`} by ${math`-${1}`} wherever it appears: ${math`(${2} + ${3}i)(${1} - i) = ${2} - ${2}i + ${3}i - ${3}i^{${2}} = ${5} + i`}.` },
    { kind: 'definition', name: t`Conjugate and modulus`, formal: t`The [[complex-conjugate|conjugate]] of ${math`z = x + iy`} is ${math`\bar{z} = x - iy`}, and its [[modulus-complex|modulus]] is ${math`|z| = \sqrt{x^{${2}} + y^{${2}}}`}. Then ${math`z\bar{z} = x^{${2}} + y^{${2}} = |z|^{${2}}`}, a real number.`, plain: t`Flip the sign of the imaginary part. Multiplying a number by its conjugate kills the ${mi}: ${math`(${3} + ${4}i)(${3} - ${4}i) = ${9} + ${16} = ${25}`}, and ${math`|${3} + ${4}i| = ${5}`}.` },
    { kind: 'p', text: t`That is how to divide: multiply top and bottom by the conjugate of the bottom, so the bottom becomes the real number ${math`|w|^{${2}}`}. For ${math`\frac{${1}}{${3} + ${4}i} = \frac{${3} - ${4}i}{${25}}`}.`, why: { q: t`Why is that allowed?`, a: t`Multiplying top and bottom by the same nonzero number does not change a fraction, and ${math`\bar{w} \neq ${0}`} whenever ${math`w \neq ${0}`}.` } },
    checkFrom(arithmetic, { a: 3, b: 2, c: 1, d: -2, op: 'div' }, t`Multiply top and bottom by ${math`${1} + ${2}i`}; the bottom becomes ${5}.`),
    { kind: 'section', title: t`Roots of quadratics` },
    { kind: 'theorem', name: t`Complex roots of a real quadratic`, statement: t`Let ${math`a, b, c`} be real with ${math`a \neq ${0}`} and ${math`b^{${2}} - ${4}ac < ${0}`}. Then ${math`az^{${2}} + bz + c = ${0}`} has exactly the two roots ${math`z = \frac{-b \pm i\sqrt{${4}ac - b^{${2}}}}{${2}a}`}, a conjugate pair.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Complete the square`, text: t`Divide by ${math`a`} and complete the square, exactly as for real roots:`, eq: [dmath`\left(z + \frac{b}{${2}a}\right)^{${2}} = \frac{b^{${2}} - ${4}ac}{${4}a^{${2}}} = -\frac{${4}ac - b^{${2}}}{${4}a^{${2}}}.`] },
        { label: t`Square roots of a negative`, text: t`Put ${math`k = \frac{\sqrt{${4}ac - b^{${2}}}}{${2}|a|} > ${0}`}. The equation ${math`w^{${2}} = -k^{${2}}`} has the roots ${math`w = ik`} and ${math`w = -ik`}, since ${math`(\pm ik)^{${2}} = i^{${2}}k^{${2}} = -k^{${2}}`}.`, why: { q: t`Why are there no other roots?`, a: t`${math`w^{${2}} + k^{${2}} = (w - ik)(w + ik)`}, and a product of complex numbers is ${0} only if a factor is: if ${math`uv = ${0}`} with ${math`u \neq ${0}`}, multiply by ${math`\frac{${1}}{u}`}.` } },
        { label: t`Solve for z`, text: t`Subtract ${math`\frac{b}{${2}a}`}: ${math`z = -\frac{b}{${2}a} \pm ik`}, which is the formula. The two roots differ only in the sign of the imaginary part: they are conjugates.` },
      ],
    },
    checkFrom(quadRoots, { p: 2, qq: 3 }, t`${math`z^{${2}} - ${4}z + ${13}`} has discriminant ${math`-${36}`}, so ${math`z = ${2} \pm ${3}i`}.`),
    { kind: 'section', title: t`Modulus and argument` },
    { kind: 'definition', name: t`Argand diagram and argument`, formal: t`Plot ${math`z = x + iy`} as the point ${math`(x, y)`}: the Argand diagram. For ${math`z \neq ${0}`}, an [[argument-complex|argument]] of ${mz} is an angle ${mth} with ${math`z = |z|(\cos\theta + i\sin\theta)`}; the principal argument ${math`\arg z`} is the one in ${math`(-\pi, \pi]`}.`, plain: t`The modulus is the distance from ${0}; the argument is the angle from the positive real axis, anticlockwise. ${math`-${2}`} has modulus ${2} and argument ${math`\pi`}; ${math`${1} + i`} has modulus ${math`\sqrt{${2}}`} and argument ${math`\frac{\pi}{${4}}`}.` },
    { kind: 'theorem', name: t`Multiplying multiplies moduli and adds arguments`, statement: t`If ${math`z = r(\cos\alpha + i\sin\alpha)`} and ${math`w = s(\cos\beta + i\sin\beta)`}, then ${math`zw = rs\left(\cos(\alpha + \beta) + i\sin(\alpha + \beta)\right)`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Multiply out`, text: t`${math`(\cos\alpha + i\sin\alpha)(\cos\beta + i\sin\beta) = \cos\alpha\cos\beta + i\cos\alpha\sin\beta + i\sin\alpha\cos\beta + i^{${2}}\sin\alpha\sin\beta`}.` },
        { label: t`Collect`, text: t`With ${math`i^{${2}} = -${1}`}: real part ${math`\cos\alpha\cos\beta - \sin\alpha\sin\beta`}, imaginary part ${math`\sin\alpha\cos\beta + \cos\alpha\sin\beta`}.` },
        { label: t`Recognise`, text: t`By the compound angle formulae these are ${math`\cos(\alpha + \beta)`} and ${math`\sin(\alpha + \beta)`}. Multiply by ${math`rs`}.`, plain: t`So multiplying by ${mw} scales by ${math`|w|`} and rotates by its argument. Multiplying by ${mi} rotates by a right angle.` },
      ],
    },
    { kind: 'p', text: t`Now the hook falls out. ${math`z = \cos\frac{\pi}{${4}} + i\sin\frac{\pi}{${4}} = \frac{${1} + i}{\sqrt{${2}}}`} has modulus ${1} and argument ${math`\frac{\pi}{${4}}`}, so ${math`z^{${4}}`} has modulus ${1} and argument ${math`\pi`}: ${math`z^{${4}} = -${1}`}. The other three roots are at ${math`\frac{${3}\pi}{${4}}`}, ${math`-\frac{\pi}{${4}}`}, and ${math`-\frac{${3}\pi}{${4}}`}: four points evenly spaced round the unit circle.` },
    checkFrom(argument, { deg: 120 }, t`${math`-${1} + \sqrt{${3}}i`} is in the second quadrant, at ${math`\frac{\pi}{${3}}`} from the negative real axis.`),
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`${math`\sqrt{a}\sqrt{b} = \sqrt{ab}`} for all numbers, so ${math`\sqrt{-${1}}\sqrt{-${1}} = \sqrt{${1}} = ${1}`}.`, counterexample: t`${math`i \cdot i = -${1}`}, not ${1}. The rule ${math`\sqrt{a}\sqrt{b} = \sqrt{ab}`} holds for ${math`a, b \ge ${0}`} only; write square roots of negatives as ${math`i\sqrt{\ldots}`} first.` },
    { kind: 'pitfall', claim: t`The argument of ${math`x + iy`} is ${math`\arctan\frac{y}{x}`}.`, counterexample: t`For ${math`-${1} - i`}, ${math`\arctan\frac{-${1}}{-${1}} = \frac{\pi}{${4}}`}, but the point is in the third quadrant: its argument is ${math`-\frac{${3}\pi}{${4}}`}. Always check the quadrant.` },
    { kind: 'takeaway', text: t`Calculate with ${math`x + iy`} using ${math`i^{${2}} = -${1}`}, divide by the conjugate, and multiply by multiplying moduli and adding arguments.` },
  ],
  examples: [
    workedCambridge(c1i),
    worked(arithmetic, { a: 2, b: -3, c: 4, d: 1, op: 'mul' }, t`A product of complex numbers`),
    worked(quadRoots, { p: -1, qq: 2 }, t`A quadratic with complex roots`),
  ],
  generators: [arithmetic, quadRoots, argument],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['complex-number', 'complex-conjugate', 'modulus-complex', 'argument-complex'],
  cambridge: [a2iv, a14iv, c1ii],
  gate: ['a2-q1-iv', 'a14-q1-iv', 'nst-c1-ii'],
  recall: [
    { front: t`How do you divide by a complex number?`, back: t`Multiply top and bottom by the conjugate of the bottom, making the bottom ${math`|w|^{${2}}`}, a real number.` },
    { front: t`What are the roots of a real quadratic with negative discriminant?`, back: t`The conjugate pair ${math`\frac{-b \pm i\sqrt{${4}ac - b^{${2}}}}{${2}a}`}.` },
    { front: t`What does multiplying complex numbers do to modulus and argument?`, back: t`Moduli multiply; arguments add.` },
  ],
  proofOrder: [
    {
      title: t`Arguments add when you multiply`,
      steps: [
        t`Write both numbers as a modulus times ${math`\cos + i\sin`} of an angle.`,
        t`Multiply out the brackets.`,
        t`Use ${math`i^{${2}} = -${1}`} to collect the real and imaginary parts.`,
        t`Recognise the compound angle formulae for the sum of the angles.`,
      ],
    },
  ],
};

