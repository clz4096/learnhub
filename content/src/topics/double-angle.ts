/**
 * trig.double-angle: sin 2A, cos 2A (in its three forms), tan 2A, and the triple angle
 * formulae cos 3A = 4cos^3 A - 3cos A and sin 3A = 3sin A - 4sin^3 A, derived from the
 * compound angle formulae. Problems: STEP Support Foundation Assignment 10 Q1(iii)
 * (cos 3A), Assignment 16 Q2(ii) (sin 3A), Assignment 23 Q2(iv) and Q3(i) (tan 2a, and
 * tan 2 alpha = 4/3 in 2009 STEP I Q8), and Assignment 25 Q2(v). Official answers are from
 * the hints. The gate adds STEP I 2005 Q4 and the identity of STEP I 2011 Q3 (STEP Questions
 * Database).
 */
import { auto, cite, supervision, withUses } from '../cambridge';
import { TRIPLES } from '../geometry';
import { add, div, int, mul, pick, q, str, sub, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { computedTex, dmath, math, t } from '../rich';
import { close } from '../prep-c';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';
import { far } from '../partv-a';

const mA = math`A`;
const fnTex = (f: string) => computedTex(`\\${f}`);
const ONE = q(1);
const TWO = q(2);

// ---------------------------------------------------------------- double angles from a triangle

interface DblP { i: number; swap: boolean; fn: 'sin' | 'cos' | 'tan' }

const sc = ({ i, swap }: DblP): [Rational, Rational] => {
  const [a, b, c] = TRIPLES[i] as readonly [number, number, number];
  return swap ? [q(b, c), q(a, c)] : [q(a, c), q(b, c)];
};
const dbl = (p: DblP): Rational => {
  const [s, c] = sc(p);
  if (p.fn === 'sin') return mul(TWO, mul(s, c));
  if (p.fn === 'cos') return sub(mul(c, c), mul(s, s));
  const tn = div(s, c);
  return div(mul(TWO, tn), sub(ONE, mul(tn, tn)));
};

const doubleFromCos = generator<DblP>({
  id: 'double-from-cos',
  skill: 'Given cos A for an acute angle, find sin A, then sin 2A, cos 2A, or tan 2A exactly from the double angle formulae.',
  params: (rng) => ({ i: int(rng, 0, 5), swap: rng() < 0.5, fn: pick(rng, ['sin', 'cos', 'tan'] as const) }),
  sane: () => null,
  problem: (p) => {
    const [s, c] = sc(p);
    const ans = dbl(p);
    const tn = div(s, c);
    const line = p.fn === 'sin'
      ? t`${math`\sin ${2}A = ${2}\sin A\cos A = ${2} \cdot ${s} \cdot ${c} = ${ans}`}.`
      : p.fn === 'cos'
        ? t`${math`\cos ${2}A = \cos^{${2}} A - \sin^{${2}} A = ${mul(c, c)} - ${mul(s, s)} = ${ans}`}.`
        : t`${math`\tan A = \frac{\sin A}{\cos A} = ${tn}`}, so ${math`\tan ${2}A = \frac{${2}\tan A}{${1} - \tan^{${2}} A} = \frac{${mul(TWO, tn)}}{${sub(ONE, mul(tn, tn))}} = ${ans}`}.`;
    return {
      prompt: t`The angle ${mA} is acute and ${math`\cos A = ${c}`}. Find ${math`${fnTex(p.fn)} ${2}A`} exactly.`,
      answer: { kind: 'exact', expected: str(ans) },
      solution: [t`${mA} is acute, so ${math`\sin A > ${0}`}: ${math`\sin A = \sqrt{${1} - \left(${c}\right)^{${2}}} = ${s}`}.`, line],
    };
  },
  solve: (p) => {
    // Through the angle: A = arccos, double it, and recover the fraction over c^2.
    const [, c] = sc(p);
    const A = Math.acos(Number(c.num) / Number(c.den));
    const v = p.fn === 'sin' ? Math.sin(2 * A) : p.fn === 'cos' ? Math.cos(2 * A) : Math.tan(2 * A);
    for (let d = 1; d <= 2000; d++) {
      const n = Math.round(v * d);
      if (Math.abs(n / d - v) < 1e-9 * Math.max(1, Math.abs(v))) return str(q(n, d));
    }
    return 'none';
  },
  misconceptions: (p): Misconception[] => {
    const [s, c] = sc(p);
    const tn = div(s, c);
    const out: Misconception[] = [];
    if (p.fn === 'sin') {
      out.push({ response: str(mul(TWO, s)), why: t`${math`\sin ${2}A`} is not ${math`${2}\sin A`}: use ${math`\sin ${2}A = ${2}\sin A\cos A`}.` });
      out.push({ response: str(mul(s, c)), why: t`That is half of it: ${math`\sin ${2}A = ${2}\sin A\cos A`}.` });
    } else if (p.fn === 'cos') {
      out.push({ response: str(mul(TWO, c)), why: t`${math`\cos ${2}A`} is not ${math`${2}\cos A`}: use ${math`\cos ${2}A = \cos^{${2}} A - \sin^{${2}} A`}.` });
      out.push({ response: str(sub(mul(s, s), mul(c, c))), why: t`The order is cosine squared minus sine squared.` });
      out.push({ response: str(sub(mul(TWO, mul(c, c)), q(0))), why: t`The form with only cosine is ${math`${2}\cos^{${2}} A - ${1}`}: subtract the ${1}.` });
    } else {
      out.push({ response: str(mul(TWO, tn)), why: t`${math`\tan ${2}A`} is not ${math`${2}\tan A`}: divide by ${math`${1} - \tan^{${2}} A`}.` });
      out.push({ response: str(div(mul(TWO, tn), add(ONE, mul(tn, tn)))), why: t`The denominator is ${math`${1} - \tan^{${2}} A`}, with a minus, from ${math`\tan(A + B)`} with ${math`B = A`}.` });
    }
    return out;
  },
});

// ---------------------------------------------------------------- cos 2A in the right form

interface FormP { given: 'cos' | 'sin'; n: number; d: number }

const cos2 = ({ given, n, d }: FormP): Rational => {
  const x = q(n, d);
  return given === 'cos' ? sub(mul(TWO, mul(x, x)), ONE) : sub(ONE, mul(TWO, mul(x, x)));
};

const cosForms = generator<FormP>({
  id: 'cos-double-forms',
  skill: 'Choose the form of cos 2A that uses what is given: 2cos^2 A - 1 from cos A, or 1 - 2sin^2 A from sin A.',
  quick: true,
  params: (rng) => {
    for (;;) {
      const d = int(rng, 2, 9);
      const n = int(rng, -d + 1, d - 1);
      if (n !== 0 && Math.abs(n) !== d) return { given: pick(rng, ['cos', 'sin'] as const), n, d };
    }
  },
  sane: ({ n, d }) => (Math.abs(n) < d ? null : 'not a sine or cosine'),
  problem: (p) => {
    const x = q(p.n, p.d);
    const ans = cos2(p);
    return {
      prompt: t`Given ${math`${fnTex(p.given)} A = ${x}`}, find ${math`\cos ${2}A`} exactly.`,
      answer: { kind: 'exact', expected: str(ans) },
      solution: [
        p.given === 'cos'
          ? t`Use the form with only cosine: ${math`\cos ${2}A = ${2}\cos^{${2}} A - ${1}`}. It needs no sign for ${math`\sin A`}, so ${mA} need not be acute.`
          : t`Use the form with only sine: ${math`\cos ${2}A = ${1} - ${2}\sin^{${2}} A`}.`,
        p.given === 'cos'
          ? t`${math`\cos ${2}A = ${2} \cdot ${mul(x, x)} - ${1} = ${ans}`}.`
          : t`${math`\cos ${2}A = ${1} - ${2} \cdot ${mul(x, x)} = ${ans}`}.`,
      ],
    };
  },
  solve: (p) => {
    // Numerically: A from the inverse function, then cos 2A, matched to a fraction over d^2.
    const x = p.n / p.d;
    const A = p.given === 'cos' ? Math.acos(x) : Math.asin(x);
    const den = p.d * p.d;
    return str(q(Math.round(Math.cos(2 * A) * den), den));
  },
  misconceptions: (p): Misconception[] => {
    const x = q(p.n, p.d);
    const other = p.given === 'cos' ? sub(ONE, mul(TWO, mul(x, x))) : sub(mul(TWO, mul(x, x)), ONE);
    return [
      { response: str(mul(TWO, x)), why: t`${math`\cos ${2}A`} is not twice ${math`${fnTex(p.given)} A`}: use a double angle formula.` },
      { response: str(other), why: p.given === 'cos' ? t`That is ${math`${1} - ${2}x^{${2}}`}, the form for a given sine. With ${math`\cos A`} given, use ${math`${2}\cos^{${2}} A - ${1}`}.` : t`That is ${math`${2}x^{${2}} - ${1}`}, the form for a given cosine. With ${math`\sin A`} given, use ${math`${1} - ${2}\sin^{${2}} A`}.` },
      { response: str(sub(mul(x, x), ONE)), why: t`The coefficient of the square is ${2}: ${math`\cos ${2}A = ${2}\cos^{${2}} A - ${1}`}.` },
    ];
  },
});

// ---------------------------------------------------------------- triple angles

interface TriP { fn: 'cos' | 'sin'; n: number; d: number }

const triple = ({ fn, n, d }: TriP): Rational => {
  const x = q(n, d);
  const x3 = mul(x, mul(x, x));
  return fn === 'cos' ? sub(mul(q(4), x3), mul(q(3), x)) : sub(mul(q(3), x), mul(q(4), x3));
};

const tripleAngle = generator<TriP>({
  id: 'triple-angle',
  skill: 'Use cos 3A = 4cos^3 A - 3cos A or sin 3A = 3sin A - 4sin^3 A to find a triple angle value exactly.',
  params: (rng) => {
    for (;;) {
      const d = int(rng, 2, 5);
      const n = int(rng, -d + 1, d - 1);
      if (n !== 0) return { fn: pick(rng, ['cos', 'sin'] as const), n, d };
    }
  },
  sane: ({ n, d }) => (Math.abs(n) < d ? null : 'out of range'),
  problem: (p) => {
    const x = q(p.n, p.d);
    const ans = triple(p);
    const x3 = mul(x, mul(x, x));
    return {
      prompt: t`Given ${math`${fnTex(p.fn)} A = ${x}`}, find ${math`${fnTex(p.fn)} ${3}A`} exactly.`,
      answer: { kind: 'exact', expected: str(ans) },
      solution: p.fn === 'cos'
        ? [t`${math`\cos ${3}A = ${4}\cos^{${3}} A - ${3}\cos A`}.`, t`${math`\cos^{${3}} A = ${x3}`}, so ${math`\cos ${3}A = ${4} \cdot ${x3} - ${3} \cdot ${x} = ${ans}`}.`]
        : [t`${math`\sin ${3}A = ${3}\sin A - ${4}\sin^{${3}} A`}.`, t`${math`\sin^{${3}} A = ${x3}`}, so ${math`\sin ${3}A = ${3} \cdot ${x} - ${4} \cdot ${x3} = ${ans}`}.`],
    };
  },
  solve: (p) => {
    const x = p.n / p.d;
    const A = p.fn === 'cos' ? Math.acos(x) : Math.asin(x);
    const v = p.fn === 'cos' ? Math.cos(3 * A) : Math.sin(3 * A);
    const den = p.d ** 3;
    return str(q(Math.round(v * den), den));
  },
  misconceptions: (p): Misconception[] => {
    const x = q(p.n, p.d);
    const x3 = mul(x, mul(x, x));
    return [
      { response: str(mul(q(3), x)), why: t`${math`${fnTex(p.fn)} ${3}A`} is not ${math`${3}${fnTex(p.fn)} A`}: expand ${math`${fnTex(p.fn)}(${2}A + A)`}.` },
      { response: str(p.fn === 'cos' ? sub(mul(q(3), x), mul(q(4), x3)) : sub(mul(q(4), x3), mul(q(3), x))), why: p.fn === 'cos' ? t`That is the sine pattern. For cosine the cube comes first: ${math`${4}\cos^{${3}} A - ${3}\cos A`}.` : t`That is the cosine pattern. For sine: ${math`${3}\sin A - ${4}\sin^{${3}} A`}.` },
      { response: str(x3), why: t`That is ${math`${fnTex(p.fn)}^{${3}} A`}, the cube of the value, not the value at three times the angle.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

const CDOM = { c: { kind: 'real' as const, min: -1, max: 1 } };
const SDOM = { s: { kind: 'real' as const, min: -1, max: 1 } };

const a10cos3 = auto({
  id: 'a10-q1-iii',
  source: cite('step-f10', 'Q1(iii)'),
  title: t`${math`\cos ${3}A`} in terms of ${math`\cos A`}`,
  prompt: t`By expressing ${math`\cos ${3}A`} as ${math`\cos(${2}A + A)`}, find an expression for ${math`\cos ${3}A`} in terms of ${math`\cos A`}. Write ${math`c`} for ${math`\cos A`}.`,
  answer: { kind: 'expression', expected: '4c^3 - 3c', variables: ['c'], domains: CDOM },
  solution: [
    t`${math`\cos(${2}A + A) = \cos ${2}A\cos A - \sin ${2}A\sin A`}.`,
    t`Use ${math`\cos ${2}A = ${2}\cos^{${2}} A - ${1}`} and ${math`\sin ${2}A = ${2}\sin A\cos A`}: ${math`\cos ${3}A = (${2}c^{${2}} - ${1})c - ${2}\sin^{${2}} A \cdot c`}.`,
    t`Replace ${math`\sin^{${2}} A`} by ${math`${1} - c^{${2}}`}: ${math`${2}c^{${3}} - c - ${2}c + ${2}c^{${3}} = ${4}c^{${3}} - ${3}c`}.`,
  ],
  reference: '4c^3 - 3c',
  verify: () => {
    for (const A of [0.2, 1.1, 2.5, -0.7]) if (far(Math.cos(3 * A), 4 * Math.cos(A) ** 3 - 3 * Math.cos(A))) return `A = ${A}`;
    return null;
  },
  misconceptions: [{ response: '3c', why: t`${math`\cos ${3}A`} is not ${math`${3}\cos A`}: at ${math`A = ${0}`} the left side is ${1}, the right side ${3}.` }],
  official: { source: cite('step-f10-hints', 'Q1(iii)'), answer: '4c^3 - 3c', agrees: true },
});

const a16sin3 = auto({
  id: 'a16-q2-ii-sin3a',
  source: cite('step-f16', 'Q2(ii)'),
  title: t`${math`\sin ${3}A`} in terms of ${math`\sin A`}`,
  prompt: t`By first writing ${math`\sin ${3}A = \sin(${2}A + A)`}, write ${math`\sin ${3}A`} in terms of ${math`\sin A`}. Write ${math`s`} for ${math`\sin A`}.`,
  answer: { kind: 'expression', expected: '3s - 4s^3', variables: ['s'], domains: SDOM },
  solution: [
    t`${math`\sin(${2}A + A) = \sin ${2}A\cos A + \cos ${2}A\sin A = ${2}s\cos^{${2}} A + (${1} - ${2}s^{${2}})s`}.`,
    t`Replace ${math`\cos^{${2}} A`} by ${math`${1} - s^{${2}}`}: ${math`${2}s - ${2}s^{${3}} + s - ${2}s^{${3}} = ${3}s - ${4}s^{${3}}`}.`,
  ],
  reference: '3s - 4s^3',
  verify: () => {
    for (const A of [0.2, 1.1, 2.5, -0.7]) if (far(Math.sin(3 * A), 3 * Math.sin(A) - 4 * Math.sin(A) ** 3)) return `A = ${A}`;
    return null;
  },
  misconceptions: [{ response: '4s^3 - 3s', why: t`That is the cosine pattern with the signs reversed. Check at ${math`A = ${90}^\circ`}: ${math`\sin ${270}^\circ = -${1}`}, and ${math`${3} - ${4} = -${1}`}.` }],
  official: { source: cite('step-f16-hints', 'Q2(ii)'), answer: '3s - 4s^3', agrees: true },
});

const a23tan = auto({
  id: 'a23-q3-tan2alpha',
  source: cite('step-f23', 'Q3(i)'),
  title: t`${math`\tan ${2}\alpha`} for the line to the centre ${math`(${2}t, t)`}`,
  prompt: t`The circle ${math`(x - ${2}t)^{${2}} + (y - t)^{${2}} = t^{${2}}`}, with ${math`t > ${0}`}, has centre ${math`(${2}t, t)`}. Let ${math`\alpha`} be the acute angle between the ${math`x`}-axis and the line from the origin to the centre. Find ${math`\tan ${2}\alpha`}.`,
  answer: { kind: 'exact', expected: '4/3' },
  solution: [
    t`The line from the origin to ${math`(${2}t, t)`} has gradient ${math`\frac{t}{${2}t} = \frac{${1}}{${2}}`}, so ${math`\tan\alpha = \frac{${1}}{${2}}`}.`,
    t`${math`\tan ${2}\alpha = \frac{${2}\tan\alpha}{${1} - \tan^{${2}}\alpha} = \frac{${1}}{${1} - \frac{${1}}{${4}}} = \frac{${4}}{${3}}`}.`,
    t`So the line through the origin at angle ${math`${2}\alpha`} is ${math`y = \frac{${4}}{${3}}x`}, that is ${math`${3}y = ${4}x`}: the second line the circle touches, by symmetry in the line to its centre.`,
  ],
  reference: '4/3',
  verify: () => (far(Math.tan(2 * Math.atan(0.5)), 4 / 3) ? 'tan 2 alpha' : null),
  misconceptions: [{ response: '1', why: t`${math`\tan ${2}\alpha`} is not ${math`${2}\tan\alpha`}: divide by ${math`${1} - \tan^{${2}}\alpha`}.` }],
  official: { source: cite('step-f23-hints', 'Q3(i)'), answer: '4/3', agrees: true },
});

const a23q2iv = supervision({
  id: 'a23-q2-iv',
  source: cite('step-f23', 'Q2(iv)'),
  title: t`The double angle formula for tangent`,
  prompt: t`Use the formulae for ${math`\sin ${2}\alpha`} and ${math`\cos ${2}\alpha`} in terms of ${math`\sin\alpha`} and ${math`\cos\alpha`} to show that ${math`\tan ${2}\alpha = \frac{${2}\tan\alpha}{${1} - \tan^{${2}}\alpha}`}. For which ${math`\alpha`} does the argument need care?`,
  writeUp: 'proof',
  official: cite('step-f23-hints', 'Q2(iv)'),
});

const a25q2v = supervision({
  id: 'a25-q2-v',
  source: cite('step-f25', 'Q2(v)'),
  title: t`A double angle identity with tangent`,
  prompt: t`Show that ${math`\frac{${1} + \sin ${2}\alpha}{${1} + \cos ${2}\alpha} = \frac{${1}}{${2}}(${1} + \tan\alpha)^{${2}}`}, stating where the identity is valid.`,
  writeUp: 'proof',
  official: cite('step-f25-hints', 'Q2(v)'),
});

// STEP I 2005 Q4 and STEP I 2011 Q3's identity (STEP Questions Database): triple angles.
// 2011 Q3(i) needs differentiation and (ii) reciprocal functions, later topics.
const DB05 = 'stepdb-05-s1' as const;
const DB11 = 'stepdb-11-s1' as const;

const db05q4 = supervision({
  id: 'step05-q4',
  source: cite(DB05, 'Q4'),
  title: t`Triple angles from a ${math`${3}`}, ${math`${4}`}, ${math`${5}`} triangle, and ${math`\tan ${3}\theta`}`,
  prompt: t`(i) Given that ${math`\cos\theta = \frac{${3}}{${5}}`} and that ${math`\frac{${3}\pi}{${2}} \le \theta \le ${2}\pi`}, show that ${math`\sin ${2}\theta = -\frac{${24}}{${25}}`}, and evaluate ${math`\cos ${3}\theta`}. (ii) Prove the identity ${dmath`\tan ${3}\theta \equiv \frac{${3}\tan\theta - \tan^{${3}}\theta}{${1} - ${3}\tan^{${2}}\theta}.`} Hence evaluate ${math`\tan\theta`}, given that ${math`\tan ${3}\theta = \frac{${11}}{${2}}`} and that ${math`\frac{\pi}{${4}} \le \theta \le \frac{\pi}{${2}}`}.`,
  writeUp: 'proof',
});

const COS = q(3, 5);
const COS3 = sub(mul(q(4), mul(COS, mul(COS, COS))), mul(q(3), COS));
const db05q4cos = auto({
  id: 'step05-q4-cos',
  source: cite(DB05, 'Q4(i)'),
  title: t`${math`\cos ${3}\theta`} from ${math`\cos\theta = \frac{${3}}{${5}}`}`,
  prompt: t`Given that ${math`\cos\theta = \frac{${3}}{${5}}`} and that ${math`\frac{${3}\pi}{${2}} \le \theta \le ${2}\pi`}, evaluate ${math`\cos ${3}\theta`}.`,
  answer: { kind: 'exact', expected: str(COS3) },
  solution: [
    t`${math`\cos ${3}\theta = ${4}\cos^{${3}}\theta - ${3}\cos\theta`}, which needs only ${math`\cos\theta`}.`,
    t`${math`${4} \cdot \frac{${27}}{${125}} - ${3} \cdot \frac{${3}}{${5}} = \frac{${108}}{${125}} - \frac{${225}}{${125}} = ${COS3}`}.`,
  ],
  reference: str(COS3),
  verify: () => close('cos 3 theta', Math.cos(3 * (2 * Math.PI - Math.acos(0.6))), Number(COS3.num) / Number(COS3.den), 1e-12),
  misconceptions: [
    { response: '117/125', why: t`${math`${4}\cos^{${3}}\theta = \frac{${108}}{${125}}`} is less than ${math`${3}\cos\theta = \frac{${225}}{${125}}`}, so the result is negative.` },
    { response: '-9/5', why: t`${math`\cos ${3}\theta`} is not ${math`${3}\cos\theta`}. Use ${math`\cos ${3}\theta = ${4}\cos^{${3}}\theta - ${3}\cos\theta`}.` },
  ],
});

const TAN = '8 + 5 sqrt(3)';
const db05q4tan = auto({
  id: 'step05-q4-tan',
  source: cite(DB05, 'Q4(ii)'),
  title: t`${math`\tan\theta`} from ${math`\tan ${3}\theta = \frac{${11}}{${2}}`}`,
  prompt: t`Given ${math`\tan ${3}\theta = \frac{${3}\tan\theta - \tan^{${3}}\theta}{${1} - ${3}\tan^{${2}}\theta}`}, evaluate ${math`\tan\theta`}, given that ${math`\tan ${3}\theta = \frac{${11}}{${2}}`} and that ${math`\frac{\pi}{${4}} \le \theta \le \frac{\pi}{${2}}`}. Give it exactly.`,
  answer: { kind: 'expression', expected: TAN, variables: [] },
  solution: [
    t`Let ${math`t = \tan\theta`}. Then ${math`${2}(${3}t - t^{${3}}) = ${11}(${1} - ${3}t^{${2}})`}, that is ${math`${2}t^{${3}} - ${33}t^{${2}} - ${6}t + ${11} = ${0}`}.`,
    t`${math`t = \frac{${1}}{${2}}`} is a root: ${math`\frac{${2}}{${8}} - \frac{${33}}{${4}} - ${3} + ${11} = ${0}`}. Dividing out, ${math`(${2}t - ${1})(t^{${2}} - ${16}t - ${11}) = ${0}`}, so ${math`t = \frac{${1}}{${2}}`} or ${math`t = ${8} \pm \sqrt{${75}} = ${8} \pm ${5}\sqrt{${3}}`}.`,
    t`For ${math`\frac{\pi}{${4}} \le \theta \le \frac{\pi}{${2}}`}, ${math`\tan\theta \ge ${1}`}: only ${math`t = ${8} + ${5}\sqrt{${3}}`} qualifies (${math`${8} - ${5}\sqrt{${3}}`} is negative).`,
  ],
  reference: TAN,
  verify: () => {
    const v = 8 + 5 * Math.sqrt(3);
    const th = Math.atan(v);
    if (!(th >= Math.PI / 4 && th <= Math.PI / 2)) return 'theta out of range';
    // The other roots of the cubic fall outside the range.
    if (Math.atan(0.5) >= Math.PI / 4 || 8 - 5 * Math.sqrt(3) >= 1) return 'another root in range';
    return close('tan 3 theta', Math.tan(3 * th), 5.5, 1e-9);
  },
  misconceptions: [
    { response: '1/2', why: t`${math`\tan\theta = \frac{${1}}{${2}}`} gives ${math`\theta < \frac{\pi}{${4}}`}, outside the range: ${math`\tan\theta \ge ${1}`} there.` },
    { response: '8 - 5 sqrt(3)', why: t`${math`${8} - ${5}\sqrt{${3}}`} is negative, but ${math`\tan\theta \ge ${1}`} for ${math`\frac{\pi}{${4}} \le \theta \le \frac{\pi}{${2}}`}.` },
  ],
});

const db11q3 = supervision({
  id: 'step11-q3',
  source: cite(DB11, 'Q3, identity (*)'),
  title: t`A product of three sines`,
  prompt: t`Prove the identity ${dmath`${4}\sin\theta\sin\left(\tfrac{${1}}{${3}}\pi - \theta\right)\sin\left(\tfrac{${1}}{${3}}\pi + \theta\right) = \sin ${3}\theta.`}`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

export const doubleAngle: TopicContent = {
  topicId: 'trig.double-angle',
  goal: t`Derive ${math`\sin ${2}A`}, ${math`\cos ${2}A`}, ${math`\tan ${2}A`}, and ${math`\cos ${3}A = ${4}\cos^{${3}} A - ${3}\cos A`} from the compound angle formulae.`,
  objective: t`Derive and use the double and triple angle formulae from the compound angle formulae.`,
  why: t`They turn equations in ${math`${2}A`} or ${math`${3}A`} into equations in ${math`A`}, and STEP solves cubics with them.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`Doubling an angle` },
    { kind: 'hook', text: t`If you know ${math`\cos A = \frac{${2}}{${3}}`}, do you know ${math`\cos ${2}A`}? It is not ${math`\frac{${4}}{${3}}`}, since no cosine is bigger than ${1}. Yet ${math`${2}A`} is fixed once ${mA} is, so its cosine must be some function of ${math`\cos A`}. Which one?` },
    { kind: 'narrative', text: t`You already own the answer. The compound angle formulae hold for any two angles, so let the two angles be equal. Put ${math`B = A`} in each, and the [[double-angle-formula|double angle formulae]] drop out.` },
    { kind: 'theorem', name: t`Double angle formulae`, statement: t`For every angle ${mA}: ${math`\sin ${2}A = ${2}\sin A\cos A`}, and ${math`\cos ${2}A = \cos^{${2}} A - \sin^{${2}} A = ${2}\cos^{${2}} A - ${1} = ${1} - ${2}\sin^{${2}} A`}. Where both sides are defined, ${math`\tan ${2}A = \frac{${2}\tan A}{${1} - \tan^{${2}} A}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Sine`, text: t`Put ${math`B = A`} in ${math`\sin(A + B) = \sin A\cos B + \cos A\sin B`}: the two terms are equal, so ${math`\sin ${2}A = ${2}\sin A\cos A`}.` },
        { label: t`Cosine`, text: t`Put ${math`B = A`} in ${math`\cos(A + B) = \cos A\cos B - \sin A\sin B`}:`, eq: [dmath`\cos ${2}A = \cos^{${2}} A - \sin^{${2}} A.`] },
        { label: t`The other two forms`, text: t`Replace ${math`\sin^{${2}} A`} by ${math`${1} - \cos^{${2}} A`} to get ${math`${2}\cos^{${2}} A - ${1}`}; or replace ${math`\cos^{${2}} A`} by ${math`${1} - \sin^{${2}} A`} to get ${math`${1} - ${2}\sin^{${2}} A`}.`, why: { q: t`Why is ${math`\sin^{${2}} A = ${1} - \cos^{${2}} A`} for every angle?`, a: t`The point ${math`(\cos A, \sin A)`} is at distance ${1} from the origin, so ${math`\cos^{${2}} A + \sin^{${2}} A = ${1}`} by Pythagoras, for any angle.` } },
        { label: t`Tangent`, text: t`Put ${math`B = A`} in ${math`\tan(A + B) = \frac{\tan A + \tan B}{${1} - \tan A\tan B}`}: ${math`\tan ${2}A = \frac{${2}\tan A}{${1} - \tan^{${2}} A}`}.` },
      ],
    },
    { kind: 'p', text: t`The hook: with ${math`\cos A = \frac{${2}}{${3}}`}, the form with only cosine gives ${math`\cos ${2}A = ${2} \cdot \frac{${4}}{${9}} - ${1} = -\frac{${1}}{${9}}`}. Choosing the form that uses what you are given saves a step.` },
    checkFrom(cosForms, { given: 'sin', n: 1, d: 3 }, t`With ${math`\sin A`} given, use ${math`\cos ${2}A = ${1} - ${2}\sin^{${2}} A`}.`),
    checkFrom(doubleFromCos, { i: 1, swap: false, fn: 'sin' }, t`Find ${math`\sin A`} first, then ${math`\sin ${2}A = ${2}\sin A\cos A`}.`),
    { kind: 'section', title: t`Tripling an angle` },
    { kind: 'narrative', text: t`Write ${math`${3}A = ${2}A + A`} and expand once more. Every ${math`\sin^{${2}}`} can be turned into cosines, so ${math`\cos ${3}A`} becomes a polynomial in ${math`\cos A`}. This is the formula STEP uses to solve cubic equations.` },
    { kind: 'theorem', name: t`Triple angle formulae`, statement: t`For every angle ${mA}: ${math`\cos ${3}A = ${4}\cos^{${3}} A - ${3}\cos A`} and ${math`\sin ${3}A = ${3}\sin A - ${4}\sin^{${3}} A`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Split the angle`, text: t`${math`\cos ${3}A = \cos(${2}A + A) = \cos ${2}A\cos A - \sin ${2}A\sin A`}.` },
        { label: t`Use the double angles`, text: t`With ${math`c = \cos A`}: ${math`\cos ${2}A = ${2}c^{${2}} - ${1}`} and ${math`\sin ${2}A\sin A = ${2}\sin^{${2}} A \cos A = ${2}(${1} - c^{${2}})c`}.` },
        { label: t`Collect`, text: t`${math`\cos ${3}A = (${2}c^{${2}} - ${1})c - ${2}(${1} - c^{${2}})c = ${2}c^{${3}} - c - ${2}c + ${2}c^{${3}} = ${4}c^{${3}} - ${3}c`}. The sine formula is proved the same way from ${math`\sin(${2}A + A)`}.`, plain: t`Check at ${math`A = ${0}`}: the left side is ${1}, and ${math`${4} - ${3} = ${1}`}.` },
      ],
    },
    checkFrom(tripleAngle, { fn: 'cos', n: 1, d: 2 }, t`${math`${4} \cdot \frac{${1}}{${8}} - ${3} \cdot \frac{${1}}{${2}} = -${1}`}: indeed ${math`\cos A = \frac{${1}}{${2}}`} for ${math`A = ${60}^\circ`}, and ${math`\cos ${180}^\circ = -${1}`}.`),
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`${math`\sin ${2}A = ${2}\sin A`}.`, counterexample: t`At ${math`A = ${90}^\circ`}: ${math`\sin ${180}^\circ = ${0}`}, but ${math`${2}\sin ${90}^\circ = ${2}`}. The factor ${math`\cos A`} is what makes the difference.` },
    { kind: 'pitfall', claim: t`${math`\tan ${2}A = \frac{${2}\tan A}{${1} - \tan^{${2}} A}`} for every ${mA} where ${math`\tan A`} is defined.`, counterexample: t`At ${math`A = ${45}^\circ`}, ${math`\tan A = ${1}`} and the denominator is ${0}: ${math`\tan ${90}^\circ`} is undefined. The formula holds only where both sides are defined.` },
    { kind: 'takeaway', text: t`Put ${math`B = A`} in the compound angle formulae for the double angles, and expand ${math`${2}A + A`} for the triple ones; pick the form of ${math`\cos ${2}A`} that uses what you know.` },
  ],
  examples: [
    workedCambridge(a10cos3),
    worked(doubleFromCos, { i: 1, swap: true, fn: 'tan' }, t`A double angle tangent from a cosine`),
    worked(cosForms, { given: 'cos', n: 2, d: 3 }, t`The cosine form of ${math`\cos ${2}A`}`),
  ],
  generators: [doubleFromCos, cosForms, tripleAngle],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['double-angle-formula'],
  cambridge: withUses([db05q4, db11q3, db05q4cos, db05q4tan, a16sin3, a23tan, a23q2iv, a25q2v], {
    'step05-q4': { sections: ['Doubling an angle', 'Tripling an angle'], note: t`Double and triple angles with the quadrant in radians`, needs: ['trig.radians-and-graphs'] },
    'a25-q2-v': { sections: ['Doubling an angle', 'Where it breaks'], note: t`A double angle identity, and where it holds` },
    'step11-q3': { sections: ['Tripling an angle'], note: t`A triple angle identity with angles in radians`, needs: ['trig.radians-and-graphs'] },
    'step05-q4-tan': { sections: ['Tripling an angle'], note: t`Solving for a tangent from the triple angle formula, choosing the root by the range`, needs: ['trig.radians-and-graphs'] },
    'a23-q2-iv': { sections: ['Doubling an angle', 'Where it breaks'], note: t`Deriving the double angle formula for tangent` },
    'a16-q2-ii-sin3a': { sections: ['Tripling an angle'], note: t`The sine of a triple angle from compound angles` },
  }),
  // STEP I 2005 Q4 and 2011 Q3 work in radians, taught later, so they are practice. Assignment 25 Q2(v), then
  // the tangent formula of Assignment 23 Q2(iv) and the sine of a triple angle of Assignment 16 Q2(ii).
  gate: ['a25-q2-v', 'a23-q2-iv', 'a16-q2-ii-sin3a'],
  recall: [
    { front: t`State the double angle formulae for sine and cosine.`, back: t`${math`\sin ${2}A = ${2}\sin A\cos A`}; ${math`\cos ${2}A = \cos^{${2}} A - \sin^{${2}} A = ${2}\cos^{${2}} A - ${1} = ${1} - ${2}\sin^{${2}} A`}.` },
    { front: t`State ${math`\tan ${2}A`}.`, back: t`${math`\frac{${2}\tan A}{${1} - \tan^{${2}} A}`}, where defined.` },
    { front: t`State the triple angle formulae.`, back: t`${math`\cos ${3}A = ${4}\cos^{${3}} A - ${3}\cos A`}; ${math`\sin ${3}A = ${3}\sin A - ${4}\sin^{${3}} A`}.` },
  ],
  proofOrder: [
    {
      title: t`The cosine of a triple angle`,
      steps: [
        t`Write ${math`\cos ${3}A`} as ${math`\cos(${2}A + A)`} and expand.`,
        t`Replace ${math`\cos ${2}A`} by ${math`${2}\cos^{${2}} A - ${1}`} and ${math`\sin ${2}A`} by ${math`${2}\sin A\cos A`}.`,
        t`Replace ${math`\sin^{${2}} A`} by ${math`${1} - \cos^{${2}} A`}.`,
        t`Collect the terms: ${math`${4}\cos^{${3}} A - ${3}\cos A`}.`,
      ],
    },
  ],
};
