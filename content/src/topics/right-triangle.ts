/**
 * trig.right-triangle: sine, cosine, and tangent of an acute angle from the sides of a right
 * triangle, the identity cos^2 + sin^2 = 1, and the exact values at 30, 45, and 60 degrees.
 * Follows STEP Support Foundation Assignment 5 Q1(i) (cos and sin from the sides; the
 * identity from Pythagoras) and uses the identity as Assignment 5 Q2(i) does (sin C from
 * cos C = 15/17, without finding C). The STEP specification asks for the definitions and
 * sin^2 + cos^2 = 1; the TMUA specification (MM4.3, MM4.5) for the exact values.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { exactValueError, sinDeg, cosDeg, tanDeg, TRIPLES } from '../geometry';
import { int, pick, q, str } from '../math';
import { generator, type Misconception } from '../problem';
import { computedTex, dmath, math, t } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

const mt = math`\theta`;
/** The function's LaTeX command, \sin, \cos, or \tan. */
const fnTex = (f: string) => computedTex(`\\${f}`);

// ---------------------------------------------------------------- ratios from the sides

type Fn = 'sin' | 'cos' | 'tan';
interface SideP { tri: number; k: number; fn: Fn }

const sides = ({ tri, k }: SideP): [number, number, number] => {
  const [a, b, c] = TRIPLES[tri] as readonly [number, number, number];
  return [a * k, b * k, c * k];
};

const ratioFromSides = generator<SideP>({
  id: 'ratio-from-legs',
  skill: 'Find sin, cos, or tan of an angle of a right triangle from the two shorter sides, finding the hypotenuse by Pythagoras first.',
  params: (rng) => ({ tri: int(rng, 0, 3), k: int(rng, 1, 3), fn: pick(rng, ['sin', 'cos', 'tan'] as const) }),
  sane: ({ k }) => (k >= 1 ? null : 'out of range'),
  problem: (p) => {
    const [a, b, c] = sides(p);
    const ans = p.fn === 'sin' ? q(a, c) : p.fn === 'cos' ? q(b, c) : q(a, b);
    return {
      prompt: t`Triangle ${math`ABC`} has a right angle at ${math`C`}, with ${math`BC = ${a}`} and ${math`CA = ${b}`}. Let ${math`\theta = \angle CAB`}. Find ${math`${fnTex(p.fn)} \theta`} as a fraction in lowest terms.`,
      answer: { kind: 'exact', expected: str(ans), requireLowestTerms: true },
      solution: [
        t`The hypotenuse is ${math`AB`}, opposite the right angle. Pythagoras: ${math`AB^{${2}} = ${a}^{${2}} + ${b}^{${2}} = ${c * c}`}, so ${math`AB = ${c}`}.`,
        t`Seen from ${math`A`}, the opposite side is ${math`BC = ${a}`} and the adjacent side is ${math`CA = ${b}`}.`,
        p.fn === 'sin'
          ? t`${math`\sin \theta = \frac{\text{opposite}}{\text{hypotenuse}} = \frac{${a}}{${c}} = ${ans}`}.`
          : p.fn === 'cos'
            ? t`${math`\cos \theta = \frac{\text{adjacent}}{\text{hypotenuse}} = \frac{${b}}{${c}} = ${ans}`}.`
            : t`${math`\tan \theta = \frac{\text{opposite}}{\text{adjacent}} = \frac{${a}}{${b}} = ${ans}`}.`,
      ],
    };
  },
  solve: (p) => {
    // Coordinates: C at the origin, A on the x-axis, B on the y-axis; compute the angle at A and its ratio.
    const [a, b] = sides(p);
    const th = Math.atan2(a, b);
    const v = p.fn === 'sin' ? Math.sin(th) : p.fn === 'cos' ? Math.cos(th) : Math.tan(th);
    // Recover the fraction with the smallest denominator up to 200 that matches.
    for (let d = 1; d <= 200; d++) {
      const n = Math.round(v * d);
      if (Math.abs(n / d - v) < 1e-9) return str(q(n, d));
    }
    return 'none';
  },
  misconceptions: (p): Misconception[] => {
    const [a, b, c] = sides(p);
    const out: Misconception[] = [];
    if (p.fn === 'sin') {
      out.push({ response: str(q(b, c)), why: t`That is the cosine: adjacent over hypotenuse. Sine is opposite over hypotenuse, and the side opposite ${mt} is ${math`BC`}.` });
      out.push({ response: str(q(c, a)), why: t`That is upside down. Sine is opposite over hypotenuse, so it is less than ${1}.` });
      out.push({ response: str(q(a, b)), why: t`That is the tangent: opposite over adjacent. For sine, divide by the hypotenuse, found by Pythagoras.` });
    } else if (p.fn === 'cos') {
      out.push({ response: str(q(a, c)), why: t`That is the sine. Cosine is adjacent over hypotenuse, and the side next to ${mt} (not the hypotenuse) is ${math`CA`}.` });
      out.push({ response: str(q(c, b)), why: t`That is upside down. Cosine is adjacent over hypotenuse, so it is less than ${1}.` });
      out.push({ response: str(q(b, a)), why: t`Cosine is adjacent over hypotenuse, not adjacent over opposite.` });
    } else {
      out.push({ response: str(q(b, a)), why: t`That is upside down: tangent is opposite over adjacent, with the opposite side ${math`BC`} on top.` });
      out.push({ response: str(q(a, c)), why: t`That is the sine. Tangent divides by the adjacent side, not the hypotenuse.` });
    }
    return out;
  },
});

// ---------------------------------------------------------------- exact values

interface ExactP { fn: Fn; deg: 30 | 45 | 60 }

const valueOf = (fn: Fn, d: number) => (fn === 'sin' ? sinDeg(d) : fn === 'cos' ? cosDeg(d) : (tanDeg(d) as NonNullable<ReturnType<typeof tanDeg>>));

const exactValues = generator<ExactP>({
  id: 'exact-values',
  skill: 'Give the exact value of sin, cos, or tan at 30, 45, or 60 degrees, from the half equilateral triangle and the half square.',
  quick: true,
  params: (rng) => ({ fn: pick(rng, ['sin', 'cos', 'tan'] as const), deg: pick(rng, [30, 45, 60] as const) }),
  sane: () => null,
  problem: ({ fn, deg }) => {
    const v = valueOf(fn, deg);
    const tri = deg === 45
      ? t`Use the half square: a right triangle with two sides ${1} and hypotenuse ${math`\sqrt{${2}}`}, angles ${math`${45}^\circ, ${45}^\circ, ${90}^\circ`}.`
      : t`Use the half equilateral triangle: sides ${1}, ${math`\sqrt{${3}}`}, and hypotenuse ${2}, angles ${math`${30}^\circ, ${60}^\circ, ${90}^\circ`}. The side ${1} is opposite ${math`${30}^\circ`}.`;
    return {
      prompt: t`Find the exact value of ${math`${fnTex(fn)} ${deg}^\circ`}. Write a square root as sqrt, for example sqrt(${5})/${4}.`,
      answer: { kind: 'expression', expected: v.expr, variables: [] },
      solution: [tri, t`So ${math`${fnTex(fn)} ${deg}^\circ = ${computedTex(v.tex)}`}.`],
    };
  },
  solve: ({ fn, deg }) => {
    // Compare numerically with every candidate in the table.
    const r = (deg * Math.PI) / 180;
    const target = fn === 'sin' ? Math.sin(r) : fn === 'cos' ? Math.cos(r) : Math.tan(r);
    const cands = ['1/2', 'sqrt(2)/2', 'sqrt(3)/2', '1', 'sqrt(3)/3', 'sqrt(3)'];
    const val = (s: string): number => ({ '1/2': 0.5, 'sqrt(2)/2': Math.SQRT2 / 2, 'sqrt(3)/2': Math.sqrt(3) / 2, '1': 1, 'sqrt(3)/3': Math.sqrt(3) / 3, 'sqrt(3)': Math.sqrt(3) })[s] as number;
    return cands.find((c) => Math.abs(val(c) - target) < 1e-12) ?? 'none';
  },
  misconceptions: ({ fn, deg }): Misconception[] => {
    const out: Misconception[] = [];
    if (fn === 'sin') out.push({ response: cosDeg(deg).expr, why: t`That is ${math`\cos ${deg}^\circ`}. Sine uses the side opposite the angle; in the half equilateral triangle the side ${1} is opposite the ${math`${30}^\circ`} angle.` });
    if (fn === 'cos') out.push({ response: sinDeg(deg).expr, why: t`That is ${math`\sin ${deg}^\circ`}. Cosine uses the side next to the angle, not the one opposite.` });
    if (fn === 'tan') {
      const other = tanDeg(90 - deg);
      if (other !== null) out.push({ response: other.expr, why: t`That is ${math`\tan ${90 - deg}^\circ`}, opposite and adjacent swapped. Tangent is opposite over adjacent.` });
      out.push({ response: `${sinDeg(deg).expr} + ${cosDeg(deg).expr}`, why: t`Tangent is sine divided by cosine, not their sum.` });
    }
    out.push({ response: `${valueOf(fn, deg).expr} + 1`, why: t`Each of sine and cosine is at most ${1}; check the sides of the special triangle again.` });
    out.push({ response: deg === 45 ? '1/2' : '1/sqrt(2)', why: deg === 45 ? t`The half square has sides ${1}, ${1}, ${math`\sqrt{${2}}`}: the ratios at ${math`${45}^\circ`} involve ${math`\sqrt{${2}}`}.` : t`That is a ${math`${45}^\circ`} value. At ${math`${30}^\circ`} and ${math`${60}^\circ`} use the half equilateral triangle.` });
    return out;
  },
});

// ---------------------------------------------------------------- one ratio from another

interface IdP { tri: number; swap: boolean; want: 'cos' | 'tan' }

const fromSine = generator<IdP>({
  id: 'one-ratio-from-another',
  skill: 'Given sin of an acute angle, find cos or tan from cos^2 + sin^2 = 1, without finding the angle.',
  params: (rng) => ({ tri: int(rng, 0, 5), swap: rng() < 0.5, want: pick(rng, ['cos', 'tan'] as const) }),
  sane: () => null,
  problem: ({ tri, swap, want }) => {
    const [x, y, c] = TRIPLES[tri] as readonly [number, number, number];
    const [a, b] = swap ? [y, x] : [x, y];
    const ans = want === 'cos' ? q(b, c) : q(a, b);
    return {
      prompt: t`The angle ${mt} is acute and ${math`\sin \theta = \frac{${a}}{${c}}`}. Find ${math`${fnTex(want)} \theta`} exactly.`,
      answer: { kind: 'exact', expected: str(ans) },
      solution: [
        t`From ${math`\cos^{${2}} \theta + \sin^{${2}} \theta = ${1}`}: ${math`\cos^{${2}} \theta = ${1} - \frac{${a * a}}{${c * c}} = \frac{${b * b}}{${c * c}}`}.`,
        t`${mt} is acute, so ${math`\cos \theta > ${0}`}, and ${math`\cos \theta = \frac{${b}}{${c}}`}.`,
        want === 'cos' ? t`So ${math`\cos \theta = ${ans}`}.` : t`Then ${math`\tan \theta = \frac{\sin \theta}{\cos \theta} = \frac{${a}/${c}}{${b}/${c}} = ${ans}`}.`,
      ],
    };
  },
  solve: ({ tri, swap, want }) => {
    const [x, y, c] = TRIPLES[tri] as readonly [number, number, number];
    const a = swap ? y : x;
    // Search for the adjacent side b with a^2 + b^2 = c^2.
    let b = 1;
    while (a * a + b * b < c * c) b++;
    return str(want === 'cos' ? q(b, c) : q(a, b));
  },
  misconceptions: ({ tri, swap, want }): Misconception[] => {
    const [x, y, c] = TRIPLES[tri] as readonly [number, number, number];
    const [a, b] = swap ? [y, x] : [x, y];
    return want === 'cos'
      ? [
        { response: str(q(c - a, c)), why: t`That uses ${math`\cos \theta = ${1} - \sin \theta`}. The identity is about squares: ${math`\cos^{${2}} \theta = ${1} - \sin^{${2}} \theta`}.` },
        { response: str(q(-b, c)), why: t`For an acute angle the cosine is positive: take the positive square root.` },
        { response: str(q(b * b, c * c)), why: t`That is ${math`\cos^{${2}} \theta`}. Take the square root.` },
      ]
      : [
        { response: str(q(b, a)), why: t`That is ${math`\frac{\cos \theta}{\sin \theta}`}, upside down. Tangent is sine over cosine.` },
        { response: str(q(a * b, c * c)), why: t`Divide the sine by the cosine, do not multiply them.` },
        { response: str(q(a, c - a)), why: t`The cosine comes from ${math`\cos^{${2}} \theta = ${1} - \sin^{${2}} \theta`}, not ${math`${1} - \sin \theta`}.` },
      ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

const SIN_C = q(8, 17);

const a5q2sin = auto({
  id: 'a5-q2-i-sin',
  source: cite('step-f05', 'Q2(i)', true),
  title: t`Sine from cosine without the angle`,
  prompt: t`In triangle ${math`ABC`} (Assignment ${5}, with ${math`AB = ${10}`}, ${math`BC = ${9}`}, ${math`CA = ${17}`}), the cosine rule gives ${math`\cos C = \frac{${15}}{${17}}`}. Using ${math`\cos^{${2}} C + \sin^{${2}} C = ${1}`}, find ${math`\sin C`} as a fraction in lowest terms.`,
  answer: { kind: 'exact', expected: str(SIN_C), requireLowestTerms: true },
  solution: [
    t`${math`\sin^{${2}} C = ${1} - \left(\frac{${15}}{${17}}\right)^{${2}} = \frac{${289} - ${225}}{${289}} = \frac{${64}}{${289}}`}.`,
    t`${math`C`} is an angle of a triangle, so ${math`${0} < C < ${180}^\circ`} and ${math`\sin C > ${0}`}. So ${math`\sin C = \frac{${8}}{${17}}`}.`,
  ],
  reference: '8/17',
  verify: () => {
    const table = exactValueError();
    if (table !== null) return `exact value table: ${table}`;
    const cosC = (9 * 9 + 17 * 17 - 10 * 10) / (2 * 9 * 17);
    const e = same('cos C', cosC.toFixed(12), (15 / 17).toFixed(12));
    if (e !== null) return e;
    return same('sin C', Math.sin(Math.acos(cosC)).toFixed(12), (8 / 17).toFixed(12));
  },
  misconceptions: [{ response: '2/17', why: t`That is ${math`${1} - \frac{${15}}{${17}}`}. The identity squares both: ${math`\sin^{${2}} C = ${1} - \cos^{${2}} C`}.` }],
  official: { source: cite('step-f05-hints', 'Q2(i)'), answer: '8/17', agrees: true },
});

const a5q1i = supervision({
  id: 'a5-q1-i',
  source: cite('step-f05', 'Q1(i)'),
  title: t`Cosine and sine from the sides; the Pythagorean identity`,
  prompt: t`The triangle ${math`ABC`} has a right angle at ${math`C`}. The lengths of the sides ${math`BC`}, ${math`CA`}, and ${math`AB`} are ${math`a`}, ${math`b`}, and ${math`c`}. Angle ${math`CAB`} is ${mt}. Express ${math`\cos \theta`} and ${math`\sin \theta`} in terms of ${math`a`}, ${math`b`}, and ${math`c`}, and hence show that ${math`\cos^{${2}} \theta + \sin^{${2}} \theta = ${1}`}. Is ${math`\cos \theta + \sin \theta = ${1}`} ever true for an acute ${mt}?`,
  writeUp: 'proof',
  official: cite('step-f05-hints', 'Q1(i)'),
});

// ---------------------------------------------------------------- lesson

const T = { a: 5, b: 12, c: 13 };

export const rightTriangle: TopicContent = {
  topicId: 'trig.right-triangle',
  goal: t`Define sine, cosine, and tangent from the sides of a right triangle, prove ${math`\cos^{${2}} \theta + \sin^{${2}} \theta = ${1}`}, and use the exact values at ${math`${30}^\circ`}, ${math`${45}^\circ`}, and ${math`${60}^\circ`}.`,
  objective: t`Find sine, cosine, and tangent from the sides of a right triangle, and prove the Pythagorean identity.`,
  why: t`Every later formula in trigonometry, from the cosine rule to complex numbers, starts from these ratios.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`Shape, not size` },
    { kind: 'hook', text: t`Draw a right triangle with an angle of ${math`${30}^\circ`}, any size you like. Measure the side opposite that angle and the longest side, and divide. Your friend draws a much bigger one and does the same. You both get exactly ${math`\frac{${1}}{${2}}`}. Why should a ratio of lengths care only about the angle?` },
    { kind: 'narrative', text: t`Because two right triangles with the same acute angle are the same shape: one is an enlargement of the other. Enlarging multiplies every side by the same factor, and a ratio of two sides does not notice. So each ratio of sides is a function of the angle alone, and it deserves a name.` },
    { kind: 'definition', name: t`Sine, cosine, and tangent`, formal: t`Let triangle ${math`ABC`} have a right angle at ${math`C`}, with ${math`BC = a`}, ${math`CA = b`}, ${math`AB = c`}, and let ${math`\theta = \angle CAB`}, so ${math`${0}^\circ < \theta < ${90}^\circ`}. Then ${math`\sin \theta = \frac{a}{c}`}, ${math`\cos \theta = \frac{b}{c}`}, and ${math`\tan \theta = \frac{a}{b}`}.`, plain: t`Stand at ${math`A`}. The [[hypotenuse|hypotenuse]] ${math`c`} is the longest side, opposite the right angle; ${math`a`} is the side opposite you and ${math`b`} the side next to you. Sine is opposite over hypotenuse, cosine adjacent over hypotenuse, tangent opposite over adjacent. In the ${T.a}, ${T.b}, ${T.c} triangle, ${math`\sin \theta = \frac{${T.a}}{${T.c}}`}.` },
    { kind: 'p', text: t`Dividing the first two ratios gives ${math`\frac{\sin \theta}{\cos \theta} = \frac{a/c}{b/c} = \frac{a}{b} = \tan \theta`}: tangent is sine over cosine.` },
    checkFrom(ratioFromSides, { tri: 1, k: 1, fn: 'cos' }, t`The hypotenuse is ${13} by Pythagoras, and the side next to ${mt} is ${12}.`),
    { kind: 'section', title: t`The Pythagorean identity` },
    { kind: 'theorem', name: t`Pythagorean identity`, statement: t`For every acute angle ${mt}, ${math`\cos^{${2}} \theta + \sin^{${2}} \theta = ${1}`}.` },
    { kind: 'p', text: t`Here ${math`\cos^{${2}} \theta`} means ${math`(\cos \theta)^{${2}}`}, the square of the cosine. The proof is Pythagoras's theorem, divided through by ${math`c^{${2}}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Write the ratios`, text: t`Take a right triangle as in the definition, with angle ${mt} at ${math`A`}. Then ${math`\cos \theta = \frac{b}{c}`} and ${math`\sin \theta = \frac{a}{c}`}.` },
        { label: t`Square and add`, text: t`Squaring each and adding:`, eq: [dmath`\cos^{${2}} \theta + \sin^{${2}} \theta = \frac{b^{${2}}}{c^{${2}}} + \frac{a^{${2}}}{c^{${2}}} = \frac{a^{${2}} + b^{${2}}}{c^{${2}}}.`], plain: t`The two fractions already share the denominator ${math`c^{${2}}`}, so add the tops.` },
        { label: t`Use Pythagoras`, text: t`The angle at ${math`C`} is right, so ${math`a^{${2}} + b^{${2}} = c^{${2}}`}, and the fraction is ${math`\frac{c^{${2}}}{c^{${2}}} = ${1}`}.`, why: { q: t`Why may we divide by ${math`c^{${2}}`}?`, a: t`${math`c`} is the length of a side, so it is positive and ${math`c^{${2}} \neq ${0}`}.` } },
      ],
    },
    { kind: 'narrative', text: t`The identity lets you find one ratio from another without ever finding the angle, which is exactly how STEP uses it. If ${math`\sin \theta = \frac{${3}}{${5}}`}, then ${math`\cos^{${2}} \theta = ${1} - \frac{${9}}{${25}} = \frac{${16}}{${25}}`}, and for an acute angle ${math`\cos \theta = \frac{${4}}{${5}}`}.` },
    checkFrom(fromSine, { tri: 2, swap: false, want: 'cos' }, t`${math`\cos^{${2}} \theta = ${1} - \sin^{${2}} \theta`}, and the positive root, since the angle is acute.`),
    { kind: 'section', title: t`The exact values` },
    { kind: 'narrative', text: t`Two triangles give the exact values you will use constantly. Cut a square of side ${1} along its diagonal: by Pythagoras the diagonal is ${math`\sqrt{${2}}`}, and the angles are ${math`${45}^\circ`}. Cut an equilateral triangle of side ${2} down its line of symmetry: you get a right triangle with hypotenuse ${2}, short side ${1}, and by Pythagoras the third side ${math`\sqrt{${4} - ${1}} = \sqrt{${3}}`}, with angles ${math`${30}^\circ`} and ${math`${60}^\circ`}.` },
    {
      kind: 'table',
      caption: t`Exact values, read off the half square and the half equilateral triangle`,
      head: [t`angle`, t`sine`, t`cosine`, t`tangent`],
      rows: ([30, 45, 60] as const).map((d) => [t`${math`${d}^\circ`}`, t`${computedTex(sinDeg(d).tex)}`, t`${computedTex(cosDeg(d).tex)}`, t`${computedTex((tanDeg(d) as NonNullable<ReturnType<typeof tanDeg>>).tex)}`]),
    },
    { kind: 'p', text: t`A pattern makes the sines easy to recall: at ${math`${30}^\circ`}, ${math`${45}^\circ`}, ${math`${60}^\circ`} they are ${math`\frac{\sqrt{${1}}}{${2}}`}, ${math`\frac{\sqrt{${2}}}{${2}}`}, ${math`\frac{\sqrt{${3}}}{${2}}`}, and the cosines run the same list backwards, because ${math`\cos \theta = \sin(${90}^\circ - \theta)`}.`, why: { q: t`Why is ${math`\cos \theta = \sin(${90}^\circ - \theta)`}?`, a: t`The other acute angle of the triangle is ${math`${90}^\circ - \theta`}, since the angles add to ${math`${180}^\circ`}. Seen from that corner, the side next to ${mt} becomes the opposite side, so its sine is ${math`\frac{b}{c}`}, which is ${math`\cos \theta`}.` } },
    checkFrom(exactValues, { fn: 'sin', deg: 60 }, t`In the half equilateral triangle, the side ${math`\sqrt{${3}}`} is opposite the ${math`${60}^\circ`} angle and the hypotenuse is ${2}.`),
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`${math`\cos \theta + \sin \theta = ${1}`}, since the squares add to ${1}.`, counterexample: t`At ${math`${45}^\circ`}, ${math`\cos \theta + \sin \theta = \sqrt{${2}}`}, about ${Number(Math.SQRT2.toFixed(3))}. Squares add to ${1}; the ratios themselves do not, just as ${math`\sqrt{${9} + ${16}} = ${5}`} while ${math`\sqrt{${9}} + \sqrt{${16}} = ${7}`}.` },
    { kind: 'pitfall', claim: t`The opposite side is always the vertical one in the picture.`, counterexample: t`Opposite and adjacent depend on which angle you stand at. In the ${T.a}, ${T.b}, ${T.c} triangle, the side ${T.a} is opposite one acute angle and adjacent to the other, so the sine of one is the cosine of the other.` },
    { kind: 'takeaway', text: t`Sine, cosine, and tangent are ratios of sides that depend only on the angle, and Pythagoras makes the squares of sine and cosine add to one.` },
  ],
  examples: [
    workedCambridge(a5q2sin),
    worked(ratioFromSides, { tri: 2, k: 2, fn: 'tan' }, t`A tangent from the two shorter sides`),
    worked(fromSine, { tri: 0, swap: true, want: 'tan' }, t`Tangent from sine, without the angle`),
  ],
  generators: [ratioFromSides, exactValues, fromSine],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['hypotenuse'],
  cambridge: [a5q1i],
  gate: ['a5-q1-i'],
  recall: [
    { front: t`Define ${math`\sin \theta`}, ${math`\cos \theta`}, ${math`\tan \theta`} for an acute angle of a right triangle.`, back: t`Opposite over hypotenuse, adjacent over hypotenuse, and opposite over adjacent.` },
    { front: t`State the Pythagorean identity and its proof in one line.`, back: t`${math`\cos^{${2}} \theta + \sin^{${2}} \theta = ${1}`}: divide ${math`a^{${2}} + b^{${2}} = c^{${2}}`} by ${math`c^{${2}}`}.` },
    { front: t`Give the sines of ${math`${30}^\circ`}, ${math`${45}^\circ`}, ${math`${60}^\circ`}.`, back: t`${math`\frac{${1}}{${2}}`}, ${math`\frac{\sqrt{${2}}}{${2}}`}, ${math`\frac{\sqrt{${3}}}{${2}}`}; the cosines are the same list backwards.` },
  ],
  proofOrder: [
    {
      title: t`The Pythagorean identity`,
      steps: [
        t`In a right triangle with hypotenuse ${math`c`}, write ${math`\cos \theta = \frac{b}{c}`} and ${math`\sin \theta = \frac{a}{c}`}.`,
        t`Square and add, over the common denominator ${math`c^{${2}}`}.`,
        t`Pythagoras turns the top into ${math`c^{${2}}`}, so the sum is ${1}.`,
      ],
    },
  ],
};
