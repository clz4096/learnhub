/**
 * geom.vectors: vectors in two and three dimensions: adding, scaling, magnitudes, and the
 * scalar product, with its geometric meaning |a||b|cos theta, for angles and
 * perpendicularity. Problems: NST Maths Workbook V1 (four vectors ordered by magnitude, and
 * a distance), and STEP Support Foundation Assignment 5 Q3(ii) (2006 STEP I Q8), whose angle
 * the scalar product finds in one line. The gate adds IA Vectors and Matrices Example Sheet 1
 * Q7 (DAMTP: the altitudes are concurrent) and STEP Support STEP 2 Vectors Q2 (2011 STEP II Q5)
 * and Q1, first paragraph (2002 STEP II Q7), with their official solutions.
 */
import { auto, cite, supervision, withUses } from '../cambridge';
import { colTex, dot, norm2, sub3, surd } from '../geometry';
import { int, pick, q, str } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { computedTex, dmath, math, t } from '../rich';
import { close } from '../prep-c';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';
import { far } from '../partv-a';

const [ma, mb, mth] = [math`\mathbf{a}`, math`\mathbf{b}`, math`\theta`];
const col = (v: readonly number[]) => computedTex(colTex(v));
const rv = (rng: () => number, lo: number, hi: number): number[] => [int(rng, lo, hi), int(rng, lo, hi), int(rng, lo, hi)];

// ---------------------------------------------------------------- magnitude

interface MagP { v: readonly number[] }

const magnitude = generator<MagP>({
  id: 'magnitude',
  skill: 'Find the magnitude of a vector in three dimensions: the square root of the sum of the squares of its components.',
  quick: true,
  params: (rng) => {
    for (;;) {
      const v = rv(rng, -7, 7);
      if (v.every((x) => x !== 0)) return { v };
    }
  },
  sane: ({ v }) => (v.every((x) => x !== 0) ? null : 'a zero component'),
  problem: ({ v }) => {
    const n = norm2(v);
    return {
      prompt: t`Find the exact magnitude of ${math`\mathbf{v} = ${col(v)}`}. Write square roots as sqrt.`,
      answer: { kind: 'expression', expected: surd(1, n).expr, variables: [] },
      solution: [
        t`${math`|\mathbf{v}|^{${2}} = ${computedTex(v.map((x) => (x < 0 ? `(${x})^{2}` : `${x}^{2}`)).join(' + '))} = ${n}`}.`,
        t`So ${math`|\mathbf{v}| = ${computedTex(surd(1, n).tex)}`}.`,
      ],
    };
  },
  solve: ({ v }) => surd(1, v.reduce((s, x) => s + x * x, 0)).expr,
  misconceptions: ({ v }): Misconception[] => [
    { response: String(norm2(v)), why: t`That is the square of the magnitude. Take the square root.` },
    { response: String(v.reduce((s, x) => s + x, 0)), why: t`Adding the components does not give a length; negative components would cancel. Square, add, and take the square root.` },
    { response: surd(1, v.reduce((s, x) => s + Math.abs(x), 0)).expr, why: t`Square each component before adding: ${math`|\mathbf{v}| = \sqrt{v_{${1}}^{${2}} + v_{${2}}^{${2}} + v_{${3}}^{${2}}}`}.` },
  ],
});

// ---------------------------------------------------------------- the angle between two vectors

interface AngP { a: readonly number[]; b: readonly number[] }

const angle = generator<AngP>({
  id: 'angle-cosine',
  skill: 'Find the cosine of the angle between two vectors from a . b = |a||b| cos theta.',
  params: (rng) => {
    for (;;) {
      const a = rv(rng, -4, 4);
      const b = rv(rng, -4, 4);
      if (norm2(a) > 0 && norm2(b) > 0 && dot(a, b) !== 0) return { a, b };
    }
  },
  sane: ({ a, b }) => (dot(a, b) !== 0 ? null : 'perpendicular'),
  problem: ({ a, b }) => {
    const d = dot(a, b);
    const P = norm2(a) * norm2(b);
    const ans = surd(d, P, P);
    return {
      prompt: t`Find the cosine of the angle between ${math`\mathbf{a} = ${col(a)}`} and ${math`\mathbf{b} = ${col(b)}`}. Write square roots as sqrt.`,
      answer: { kind: 'expression', expected: ans.expr, variables: [] },
      solution: [
        t`${math`\mathbf{a} \cdot \mathbf{b} = ${computedTex(a.map((x, i) => `${x < 0 ? `(${x})` : x} \\times ${(b[i] as number) < 0 ? `(${b[i]})` : b[i]}`).join(' + '))} = ${d}`}.`,
        t`${math`|\mathbf{a}| = \sqrt{${norm2(a)}}`} and ${math`|\mathbf{b}| = \sqrt{${norm2(b)}}`}.`,
        t`${math`\cos\theta = \frac{\mathbf{a} \cdot \mathbf{b}}{|\mathbf{a}||\mathbf{b}|} = \frac{${d}}{\sqrt{${P}}} = ${computedTex(ans.tex)}`}${d < 0 ? t`, negative, so the angle is obtuse` : t``}.`,
      ],
    };
  },
  solve: ({ a, b }) => {
    // Through the cosine rule on the triangle with sides a, b, a - b.
    const c2 = norm2(sub3(a, b));
    const twice = norm2(a) + norm2(b) - c2; // = 2 a . b
    const P = norm2(a) * norm2(b);
    return surd(twice / 2, P, P).expr;
  },
  misconceptions: ({ a, b }): Misconception[] => {
    const d = dot(a, b);
    const P = norm2(a) * norm2(b);
    return [
      { response: String(d), why: t`That is the scalar product. Divide by both magnitudes to get the cosine.` },
      { response: str(q(d, norm2(a) + norm2(b))), why: t`Divide by the product of the magnitudes, ${math`|\mathbf{a}||\mathbf{b}|`}, not the sum of their squares.` },
      { response: surd(-d, P, P).expr, why: t`Check the sign of the scalar product: multiply matching components, keeping their signs.` },
    ];
  },
});

// ---------------------------------------------------------------- perpendicular vectors

interface PerpP { a: readonly number[]; b: readonly number[] }

const kOf = ({ a, b }: PerpP) => q(-((a[0] as number) * (b[0] as number) + (a[2] as number) * (b[2] as number)), b[1] as number);

const perpendicular = generator<PerpP>({
  id: 'perpendicular',
  skill: 'Find the unknown component that makes two vectors perpendicular, by setting their scalar product to zero.',
  params: (rng) => {
    for (;;) {
      const a = [int(rng, -5, 5), 1, int(rng, -5, 5)];
      const b = [int(rng, -5, 5), pick(rng, [-3, -2, -1, 1, 2, 3]), int(rng, -5, 5)];
      const k = -((a[0] as number) * (b[0] as number) + (a[2] as number) * (b[2] as number));
      if (k !== 0 && a[0] !== 0 && a[2] !== 0) return { a, b };
    }
  },
  sane: ({ b }) => ((b[1] as number) !== 0 ? null : 'no solution'),
  problem: (p) => {
    const { a, b } = p;
    const k = kOf(p);
    const known = (a[0] as number) * (b[0] as number) + (a[2] as number) * (b[2] as number);
    return {
      prompt: t`Find ${math`k`} so that ${math`${computedTex(`\\begin{pmatrix} ${a[0] as number} \\\\ k \\\\ ${a[2] as number} \\end{pmatrix}`)}`} is perpendicular to ${math`${col(b)}`}.`,
      answer: { kind: 'exact', expected: str(k) },
      solution: [
        t`Two nonzero vectors are perpendicular exactly when their scalar product is ${0}.`,
        t`${math`${a[0] as number} \times ${b[0] as number} + k \times ${b[1] as number} + ${a[2] as number} \times ${b[2] as number} = ${known} + ${b[1] as number}k = ${0}`}, so ${math`k = ${k}`}.`,
      ],
    };
  },
  solve: (p) => {
    // Search k over fractions with denominator |b2| for a zero scalar product.
    const d = Math.abs(p.b[1] as number);
    for (let n = -200; n <= 200; n++) {
      const k = n / d;
      if (Math.abs(dot([p.a[0] as number, k, p.a[2] as number], p.b)) < 1e-12) return str(q(n, d));
    }
    return 'none';
  },
  misconceptions: (p): Misconception[] => {
    const k = kOf(p);
    const known = (p.a[0] as number) * (p.b[0] as number) + (p.a[2] as number) * (p.b[2] as number);
    return [
      { response: str(q(-Number(k.num), Number(k.den))), why: t`The sign is wrong: move ${known} to the other side before dividing.` },
      { response: String(-known), why: t`Divide by the coefficient of ${math`k`}, which is ${p.b[1] as number}.` },
      { response: str(q(-(p.a[0] as number) * (p.b[0] as number), p.b[1] as number)), why: t`The scalar product has three terms: include the product of the third components too.` },
      { response: str(q(-(p.a[2] as number) * (p.b[2] as number), p.b[1] as number)), why: t`The scalar product has three terms: include the product of the first components too.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

const VA = [16, -6, 1];
const VB = [4, 14, -9];
const VC = [-15, 7, 4];
const VD = [12, 12, 1];
const ORDERS: ChoiceOption[] = [
  { id: 'dcab', label: t`${math`|\mathbf{D}| < |\mathbf{C}| < |\mathbf{A}| = |\mathbf{B}|`}` },
  { id: 'cdab', label: t`${math`|\mathbf{C}| < |\mathbf{D}| < |\mathbf{A}| = |\mathbf{B}|`}` },
  { id: 'dcba', label: t`${math`|\mathbf{D}| < |\mathbf{C}| < |\mathbf{B}| < |\mathbf{A}|`}` },
  { id: 'cbda', label: t`${math`|\mathbf{C}| < |\mathbf{B}| < |\mathbf{D}| < |\mathbf{A}|`}` },
];

const v1i = auto({
  id: 'nst-v1-i',
  source: cite('nst-workbook', 'V1(i)'),
  title: t`Four vectors ordered by magnitude`,
  prompt: t`Order the vectors ${math`\mathbf{A} = ${col(VA)}`}, ${math`\mathbf{B} = ${col(VB)}`}, ${math`\mathbf{C} = ${col(VC)}`}, ${math`\mathbf{D} = ${col(VD)}`} by magnitude.`,
  answer: { kind: 'choice', options: ORDERS, correct: 'dcab' },
  solution: [
    t`Compare the squared magnitudes, which order the same way: ${math`|\mathbf{A}|^{${2}} = ${norm2(VA)}`}, ${math`|\mathbf{B}|^{${2}} = ${norm2(VB)}`}, ${math`|\mathbf{C}|^{${2}} = ${norm2(VC)}`}, ${math`|\mathbf{D}|^{${2}} = ${norm2(VD)}`}.`,
    t`So ${math`|\mathbf{D}| < |\mathbf{C}| < |\mathbf{A}| = |\mathbf{B}|`}. The largest components do not decide it: ${math`\mathbf{A}`} has a ${16}, yet ${math`\mathbf{B}`} is just as long.`,
  ],
  reference: ['dcab'],
  verify: () => {
    const m = [VA, VB, VC, VD].map((v) => Math.sqrt(norm2(v)));
    return m[3] as number < (m[2] as number) && (m[2] as number) < (m[0] as number) && m[0] === m[1] ? null : `magnitudes ${m.join(', ')}`;
  },
  misconceptions: [{ response: ['cdab'], why: t`${math`|\mathbf{C}|^{${2}} = ${norm2(VC)}`} and ${math`|\mathbf{D}|^{${2}} = ${norm2(VD)}`}: ${math`\mathbf{D}`} is the shortest, by a whisker.` }],
});

const v1ii = auto({
  id: 'nst-v1-ii',
  source: cite('nst-workbook', 'V1(ii)'),
  title: t`The distance between two position vectors`,
  prompt: t`Calculate the distance between the points with position vectors ${math`\mathbf{A} = ${col(VA)}`} and ${math`\mathbf{B} = ${col(VB)}`}. Write square roots as sqrt.`,
  answer: { kind: 'expression', expected: surd(1, norm2(sub3(VA, VB))).expr, variables: [] },
  solution: [
    t`The distance is ${math`|\mathbf{A} - \mathbf{B}|`}, with ${math`\mathbf{A} - \mathbf{B} = ${col(sub3(VA, VB))}`}.`,
    t`${math`|\mathbf{A} - \mathbf{B}|^{${2}} = ${144} + ${400} + ${100} = ${norm2(sub3(VA, VB))}`}, so the distance is ${math`\sqrt{${644}} = ${computedTex(surd(1, 644).tex)}`}.`,
  ],
  reference: '2 sqrt(161)',
  verify: () => (far(Math.hypot(...sub3(VA, VB)), 2 * Math.sqrt(161)) ? 'distance' : null),
  misconceptions: [{ response: '0', why: t`Equal magnitudes do not make the points equal: the distance is the magnitude of the difference.` }],
});

const a5angle = supervision({
  id: 'a5-q3-ii-scalar',
  source: cite('step-f05', 'Q3(ii)', true),
  title: t`The tetrahedron's angle by the scalar product`,
  prompt: t`The points ${math`A = (a, ${0}, ${0})`}, ${math`B = (${0}, b, ${0})`}, ${math`C = (${0}, ${0}, c)`} have ${math`a, b, c > ${0}`}, and ${math`\theta = \angle ACB`}. Using the scalar product of ${math`\overrightarrow{CA}`} and ${math`\overrightarrow{CB}`}, show that ${math`\cos\theta = \frac{c^{${2}}}{\sqrt{(a^{${2}} + c^{${2}})(b^{${2}} + c^{${2}})}}`}, and explain why ${mth} is always acute.`,
  writeUp: 'proof',
  official: cite('step-f05-hints', 'Q3'),
});


// IA Vectors and Matrices Example Sheet 1, Q7 (DAMTP), and STEP Support STEP 2 Vectors Q2
// (2011 STEP II Q5) and Q1, first paragraph (2002 STEP II Q7). The later parts of 2002 Q7 need
// vector equations of lines, a later topic.
const VEC = 'step-s2-vectors' as const;
const VECS = 'step-s2-vectors-solutions' as const;

const damtpQ7 = supervision({
  id: 'damtp-vm1-q7',
  source: cite('damtp-ia-vm1', 'Q7'),
  title: t`The altitudes of a triangle meet`,
  prompt: t`Show by vector methods that the altitudes of a triangle are concurrent. [Hint: let the altitudes ${math`AD`}, ${math`BE`} of ${math`\triangle ABC`} meet at ${math`H`}, and show that ${math`CH`} is perpendicular to ${math`AB`}.]`,
  writeUp: 'proof',
});

const vec2 = supervision({
  id: 's2vec-q2',
  source: cite(VEC, 'Q2 (2011 STEP II Q5)'),
  title: t`Two reflections`,
  prompt: t`The points ${math`A`} and ${math`B`} have position vectors ${math`\mathbf{a}`} and ${math`\mathbf{b}`} with respect to an origin ${math`O`}, and ${math`O`}, ${math`A`} and ${math`B`} are non-collinear. The point ${math`C`}, with position vector ${math`\mathbf{c}`}, is the reflection of ${math`B`} in the line through ${math`O`} and ${math`A`}. Show that ${math`\mathbf{c}`} can be written in the form ${math`\mathbf{c} = \lambda\mathbf{a} - \mathbf{b}`}, where ${math`\lambda = \frac{${2}\,\mathbf{a} \cdot \mathbf{b}}{\mathbf{a} \cdot \mathbf{a}}`}. The point ${math`D`}, with position vector ${math`\mathbf{d}`}, is the reflection of ${math`C`} in the line through ${math`O`} and ${math`B`}. Show that ${math`\mathbf{d}`} can be written in the form ${math`\mathbf{d} = \mu\mathbf{b} - \lambda\mathbf{a}`} for some scalar ${math`\mu`} to be determined. Given that ${math`A`}, ${math`B`} and ${math`D`} are collinear, find the relationship between ${math`\lambda`} and ${math`\mu`}. In the case ${math`\lambda = -\frac{${1}}{${2}}`}, determine the cosine of ${math`\angle AOB`} and describe the relative positions of ${math`A`}, ${math`B`} and ${math`D`}.`,
  writeUp: 'proof',
  official: cite(VECS, 'Q2'),
});

type P2 = readonly [number, number];
/** The reflection of p in the line through the origin along u. */
const reflect = (p: P2, u: P2): P2 => {
  const k = (2 * (p[0] * u[0] + p[1] * u[1])) / (u[0] * u[0] + u[1] * u[1]);
  return [k * u[0] - p[0], k * u[1] - p[1]];
};

const COS_AOB = '-sqrt(6)/4';
const vec2cos = auto({
  id: 's2vec-q2-cos',
  source: cite(VEC, 'Q2 (2011 STEP II Q5)', true),
  title: t`The angle that makes ${math`D`} the midpoint`,
  prompt: t`${math`C`} is the reflection of ${math`B`} in the line ${math`OA`}, so ${math`\mathbf{c} = \lambda\mathbf{a} - \mathbf{b}`} with ${math`\lambda = \frac{${2}\,\mathbf{a} \cdot \mathbf{b}}{\mathbf{a} \cdot \mathbf{a}}`}, and ${math`D`} is the reflection of ${math`C`} in the line ${math`OB`}, so ${math`\mathbf{d} = \mu\mathbf{b} - \lambda\mathbf{a}`} with ${math`\mu = \frac{${4}(\mathbf{a} \cdot \mathbf{b})^{${2}}}{(\mathbf{a} \cdot \mathbf{a})(\mathbf{b} \cdot \mathbf{b})} - ${1}`}. Given that ${math`A`}, ${math`B`} and ${math`D`} are collinear and ${math`\lambda = -\frac{${1}}{${2}}`}, find the cosine of ${math`\angle AOB`} exactly.`,
  answer: { kind: 'expression', expected: COS_AOB, variables: [] },
  solution: [
    t`${math`A`}, ${math`B`}, ${math`D`} are collinear exactly when ${math`\mathbf{d} = s\mathbf{a} + (${1} - s)\mathbf{b}`} for some ${math`s`}; as ${math`\mathbf{a}`} and ${math`\mathbf{b}`} are not parallel, compare coefficients: ${math`s = -\lambda`} and ${math`${1} - s = \mu`}, so ${math`\mu = \lambda + ${1}`}. With ${math`\lambda = -\frac{${1}}{${2}}`}, ${math`\mu = \frac{${1}}{${2}}`}.`,
    t`With ${math`\cos\theta = \frac{\mathbf{a} \cdot \mathbf{b}}{|\mathbf{a}||\mathbf{b}|}`}, the formula for ${math`\mu`} reads ${math`\mu = ${4}\cos^{${2}}\theta - ${1}`}. So ${math`${4}\cos^{${2}}\theta = \frac{${3}}{${2}}`} and ${math`\cos^{${2}}\theta = \frac{${3}}{${8}}`}.`,
    t`${math`\lambda`} has the sign of ${math`\mathbf{a} \cdot \mathbf{b}`}, which is negative, so ${math`\cos\theta = -\sqrt{\frac{${3}}{${8}}} = -\frac{\sqrt{${6}}}{${4}}`}. Then ${math`\mathbf{d} = \frac{${1}}{${2}}\mathbf{a} + \frac{${1}}{${2}}\mathbf{b}`}: ${math`D`} is the midpoint of ${math`AB`}.`,
  ],
  reference: COS_AOB,
  verify: () => {
    // Build a and b with this angle and lambda = -1/2, reflect twice, and land on the midpoint of AB.
    const cos = -Math.sqrt(6) / 4;
    const a: P2 = [1, 0];
    const lenB = -0.5 / (2 * cos); // lambda = 2|b|cos/|a|
    const b: P2 = [lenB * cos, lenB * Math.sqrt(1 - cos * cos)];
    const lambda = (2 * (a[0] * b[0] + a[1] * b[1])) / (a[0] * a[0] + a[1] * a[1]);
    const d = reflect(reflect(b, a), b);
    return close('lambda', lambda, -0.5, 1e-12) ?? close('d x', d[0], (a[0] + b[0]) / 2, 1e-12) ?? close('d y', d[1], (a[1] + b[1]) / 2, 1e-12);
  },
  misconceptions: [
    { response: 'sqrt(6)/4', why: t`${math`\lambda = \frac{${2}\,\mathbf{a} \cdot \mathbf{b}}{\mathbf{a} \cdot \mathbf{a}}`} is negative, so ${math`\mathbf{a} \cdot \mathbf{b} < ${0}`}: the angle is obtuse and the cosine negative.` },
    { response: '-3/8', why: t`That is ${math`\cos^{${2}}\theta`}. Take the square root, with the sign of ${math`\lambda`}.` },
  ],
  official: { source: cite(VECS, 'Q2'), answer: '-sqrt(3/8)', agrees: true },
});

const vec1 = supervision({
  id: 's2vec-q1',
  source: cite(VEC, 'Q1 (2002 STEP II Q7), first paragraph'),
  title: t`Two lines at ${math`\frac{\pi}{${4}}`} to two others`,
  prompt: t`In ${3}-dimensional space, the lines ${math`m_{${1}}`} and ${math`m_{${2}}`} pass through the origin and have directions ${math`\mathbf{i} + \mathbf{j}`} and ${math`\mathbf{i} + \mathbf{k}`}, respectively. Find the directions of the two lines ${math`m_{${3}}`} and ${math`m_{${4}}`} that pass through the origin and make angles of ${math`\frac{\pi}{${4}}`} with both ${math`m_{${1}}`} and ${math`m_{${2}}`}. Find also the cosine of the acute angle between ${math`m_{${3}}`} and ${math`m_{${4}}`}.`,
  writeUp: 'explanation',
  official: cite(VECS, 'Q1'),
});

const vec1cos = auto({
  id: 's2vec-q1-cos',
  source: cite(VEC, 'Q1 (2002 STEP II Q7), first paragraph'),
  title: t`The angle between the two new lines`,
  prompt: t`The lines ${math`m_{${1}}`} and ${math`m_{${2}}`} pass through the origin with directions ${math`\mathbf{i} + \mathbf{j}`} and ${math`\mathbf{i} + \mathbf{k}`}. The two lines ${math`m_{${3}}`} and ${math`m_{${4}}`} through the origin each make angles of ${math`\frac{\pi}{${4}}`} with both ${math`m_{${1}}`} and ${math`m_{${2}}`}. Find the cosine of the acute angle between ${math`m_{${3}}`} and ${math`m_{${4}}`}.`,
  answer: { kind: 'exact', expected: '1/3' },
  solution: [
    t`Let a unit direction be ${math`x\mathbf{i} + y\mathbf{j} + z\mathbf{k}`}. The angle with ${math`\mathbf{i} + \mathbf{j}`} (length ${math`\sqrt{${2}}`}) is ${math`\frac{\pi}{${4}}`}, so ${math`\frac{|x + y|}{\sqrt{${2}}} = \frac{${1}}{\sqrt{${2}}}`}: ${math`|x + y| = ${1}`}. Likewise ${math`|x + z| = ${1}`}.`,
    t`If ${math`x + y = ${1}`} and ${math`x + z = ${1}`} (or both ${math`-${1}`}, the same line reversed), then ${math`y = z = ${1} - x`} and ${math`x^{${2}} + ${2}(${1} - x)^{${2}} = ${1}`}, so ${math`${3}x^{${2}} - ${4}x + ${1} = ${0}`}: ${math`x = ${1}`} or ${math`x = \frac{${1}}{${3}}`}. Mixed signs give ${math`${3}x^{${2}} + ${2} = ${1}`}, impossible.`,
    t`The directions are ${math`\mathbf{i}`} and ${math`\frac{${1}}{${3}}(\mathbf{i} + ${2}\mathbf{j} + ${2}\mathbf{k})`}, both unit vectors, with scalar product ${math`\frac{${1}}{${3}}`}: the cosine of the acute angle is ${math`\frac{${1}}{${3}}`}.`,
  ],
  reference: '1/3',
  verify: () => {
    // Search unit directions on a fine grid of the sphere for those at pi/4 to both lines.
    const hits: number[][] = [];
    for (let i = 0; i <= 600; i++) for (let j = 0; j < 1200; j++) {
      const th = (i / 600) * Math.PI;
      const ph = (j / 1200) * 2 * Math.PI;
      const v = [Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th)] as const;
      if (Math.abs(Math.abs(v[0] + v[1]) - 1) < 2e-3 && Math.abs(Math.abs(v[0] + v[2]) - 1) < 2e-3) hits.push([...v]);
    }
    // Every hit is close to +-i or +-(i + 2j + 2k)/3.
    const near = (v: number[], w: number[]): boolean => Math.hypot(v[0]! - w[0]!, v[1]! - w[1]!, v[2]! - w[2]!) < 0.05;
    const known = [[1, 0, 0], [-1, 0, 0], [1 / 3, 2 / 3, 2 / 3], [-1 / 3, -2 / 3, -2 / 3]];
    if (hits.length === 0 || !hits.every((h) => known.some((k) => near(h, k)))) return `unexpected directions: ${hits.length}`;
    return close('cos', 1 / 3, (1 * 1 + 0 * 2 + 0 * 2) / 3, 1e-12);
  },
  misconceptions: [
    { response: '0', why: t`The two directions are ${math`\mathbf{i}`} and ${math`\frac{${1}}{${3}}(\mathbf{i} + ${2}\mathbf{j} + ${2}\mathbf{k})`}; their scalar product is ${math`\frac{${1}}{${3}}`}, not ${0}.` },
  ],
  official: { source: cite(VECS, 'Q1'), answer: '1/3', agrees: true },
});

// ---------------------------------------------------------------- lesson

const EXA = [1, 2, 2];
const EXB = [3, 0, 4];

export const vectors: TopicContent = {
  topicId: 'geom.vectors',
  goal: t`Add and scale vectors in two and three dimensions, find magnitudes, and use the scalar product for angles and perpendicularity.`,
  objective: t`Add and scale vectors, find their lengths, and use the scalar product for angles and right angles.`,
  why: t`Vectors carry direction and length in one object; lines, planes, and mechanics are all written with them.`,
  minutes: 30,
  lesson: [
    { kind: 'section', title: t`Arrows you can add` },
    { kind: 'hook', text: t`To find the angle between two edges of a box, you could build triangles and use the cosine rule, as in the tetrahedron question. Or you could multiply three pairs of numbers and add. The second way is the scalar product, and it turns a page of geometry into one line.` },
    { kind: 'definition', name: t`Vector`, formal: t`A [[vector|vector]] in three dimensions is an ordered triple ${math`\mathbf{a} = \begin{pmatrix} a_{${1}} \\ a_{${2}} \\ a_{${3}} \end{pmatrix}`} of real numbers. Vectors add componentwise, ${math`\mathbf{a} + \mathbf{b} = \begin{pmatrix} a_{${1}} + b_{${1}} \\ a_{${2}} + b_{${2}} \\ a_{${3}} + b_{${3}} \end{pmatrix}`}, and scale componentwise, ${math`\lambda\mathbf{a} = \begin{pmatrix} \lambda a_{${1}} \\ \lambda a_{${2}} \\ \lambda a_{${3}} \end{pmatrix}`}. The magnitude is ${math`|\mathbf{a}| = \sqrt{a_{${1}}^{${2}} + a_{${2}}^{${2}} + a_{${3}}^{${2}}}`}.`, plain: t`A vector is a step: so far along ${math`x`}, so far along ${math`y`}, so far along ${math`z`}. Adding is doing one step after the other; scaling stretches the step. The magnitude is the length of the step, by the distance formula: ${math`${col(EXA)}`} has length ${math`\sqrt{${1} + ${4} + ${4}} = ${3}`}.` },
    { kind: 'p', text: t`The position vector of a point ${math`P`} is the step from the origin to ${math`P`}. The step from ${math`P`} to ${math`Q`} is ${math`\overrightarrow{PQ} = \mathbf{q} - \mathbf{p}`}, so the distance ${math`PQ`} is ${math`|\mathbf{q} - \mathbf{p}|`}. In two dimensions everything is the same with two components.` },
    checkFrom(magnitude, { v: [2, -3, 6] }, t`${math`${4} + ${9} + ${36} = ${49}`}, and its square root is ${7}.`),
    { kind: 'section', title: t`The scalar product` },
    { kind: 'definition', name: t`Scalar product`, formal: t`The [[scalar-product|scalar product]] of ${ma} and ${mb} is the number ${math`\mathbf{a} \cdot \mathbf{b} = a_{${1}}b_{${1}} + a_{${2}}b_{${2}} + a_{${3}}b_{${3}}`}.`, plain: t`Multiply matching components and add. For ${math`${col(EXA)}`} and ${math`${col(EXB)}`}: ${math`${3} + ${0} + ${8} = ${dot(EXA, EXB)}`}. Note ${math`\mathbf{a} \cdot \mathbf{a} = |\mathbf{a}|^{${2}}`}.` },
    { kind: 'theorem', name: t`Geometric meaning`, statement: t`For nonzero vectors ${ma} and ${mb} with angle ${mth} between them (${math`${0} \le \theta \le \pi`}), ${math`\mathbf{a} \cdot \mathbf{b} = |\mathbf{a}||\mathbf{b}|\cos\theta`}. In particular, ${ma} and ${mb} are perpendicular if and only if ${math`\mathbf{a} \cdot \mathbf{b} = ${0}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`A triangle`, text: t`Draw ${ma} and ${mb} from one point ${math`O`}, ending at ${math`A`} and ${math`B`}. The third side is ${math`\overrightarrow{BA} = \mathbf{a} - \mathbf{b}`}.`, why: { q: t`What if ${ma} and ${mb} point the same way or opposite ways?`, a: t`Then the triangle is flat, ${math`\theta = ${0}`} or ${math`\pi`}, and the formula can be checked directly, since ${math`\mathbf{b} = \lambda\mathbf{a}`}.` } },
        { label: t`Cosine rule`, text: t`In triangle ${math`OAB`}:`, eq: [dmath`|\mathbf{a} - \mathbf{b}|^{${2}} = |\mathbf{a}|^{${2}} + |\mathbf{b}|^{${2}} - ${2}|\mathbf{a}||\mathbf{b}|\cos\theta.`] },
        { label: t`Expand in components`, text: t`The left side is ${math`\sum (a_{i} - b_{i})^{${2}} = \sum a_{i}^{${2}} + \sum b_{i}^{${2}} - ${2}\sum a_{i}b_{i} = |\mathbf{a}|^{${2}} + |\mathbf{b}|^{${2}} - ${2}\,\mathbf{a} \cdot \mathbf{b}`}.`, plain: t`Here ${math`\sum`} adds over the three components, ${math`i = ${1}, ${2}, ${3}`}.` },
        { label: t`Compare`, text: t`Cancel ${math`|\mathbf{a}|^{${2}} + |\mathbf{b}|^{${2}}`} and divide by ${math`-${2}`}: ${math`\mathbf{a} \cdot \mathbf{b} = |\mathbf{a}||\mathbf{b}|\cos\theta`}. As the magnitudes are positive, the product is ${0} exactly when ${math`\cos\theta = ${0}`}, that is ${math`\theta = \frac{\pi}{${2}}`}.` },
      ],
    },
    checkFrom(angle, { a: EXA, b: EXB }, t`${math`\cos\theta = \frac{${11}}{${3} \times ${5}}`}.`),
    checkFrom(perpendicular, { a: [2, 1, 3], b: [1, 2, -1] }, t`Set the scalar product to ${0}: ${math`${2} + ${2}k - ${3} = ${0}`}.`),
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`The vector with the biggest component is the longest.`, counterexample: t`${math`${col(VA)}`} has a ${16} and ${math`${col(VB)}`} has nothing above ${14}, yet both have magnitude ${math`\sqrt{${293}}`}. Only the sum of the squares decides length.` },
    { kind: 'pitfall', claim: t`If ${math`\mathbf{a} \cdot \mathbf{b} = \mathbf{a} \cdot \mathbf{c}`} with ${math`\mathbf{a} \neq \mathbf{${0}}`}, then ${math`\mathbf{b} = \mathbf{c}`}.`, counterexample: t`With ${math`\mathbf{a} = ${col([1, 0, 0])}`}, both ${math`${col([2, 1, 0])}`} and ${math`${col([2, 0, 5])}`} have scalar product ${2} with ${ma}. You cannot cancel ${ma}: it only says ${math`\mathbf{b} - \mathbf{c}`} is perpendicular to ${ma}.` },
    { kind: 'takeaway', text: t`Vectors add and scale component by component; the scalar product ${math`\mathbf{a} \cdot \mathbf{b} = |\mathbf{a}||\mathbf{b}|\cos\theta`} gives angles, and is ${0} exactly for perpendicular vectors.` },
  ],
  examples: [
    workedCambridge(v1i),
    worked(angle, { a: [2, -1, 2], b: [1, 2, -2] }, t`An obtuse angle between two vectors`),
    worked(perpendicular, { a: [3, 1, -2], b: [2, -3, 1] }, t`Making two vectors perpendicular`),
  ],
  generators: [magnitude, angle, perpendicular],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['vector', 'scalar-product'],
  cambridge: withUses([damtpQ7, vec2, vec1, vec2cos, vec1cos, v1ii, a5angle], {
    'damtp-vm1-q7': { sections: ['The scalar product'], note: t`Concurrent altitudes by scalar products` },
    's2vec-q2': { sections: ['The scalar product'], note: t`Reflections written with scalar products` },
    's2vec-q1': { sections: ['The scalar product'], note: t`Lines at a given angle to two others` },
    'a5-q3-ii-scalar': { sections: ['The scalar product'], note: t`An angle in a tetrahedron by the scalar product` },
    's2vec-q2-cos': { sections: ['The scalar product'], note: t`Two reflections and the angle that makes a midpoint` },
  }),
  // Best first: the IA sheet's altitudes (DAMTP), 2011 STEP II Q5 (two reflections), 2002 STEP II
  // Q7's first paragraph, Assignment 5 Q3(ii), then the auto-checked cosine of 2011 Q5.
  gate: ['damtp-vm1-q7', 's2vec-q2', 's2vec-q1', 'a5-q3-ii-scalar', 's2vec-q2-cos'],
  recall: [
    { front: t`Define the scalar product and state its geometric meaning.`, back: t`${math`\mathbf{a} \cdot \mathbf{b} = a_{${1}}b_{${1}} + a_{${2}}b_{${2}} + a_{${3}}b_{${3}} = |\mathbf{a}||\mathbf{b}|\cos\theta`}.` },
    { front: t`When are two nonzero vectors perpendicular?`, back: t`Exactly when their scalar product is ${0}.` },
  ],
  proofOrder: [
    {
      title: t`${math`\mathbf{a} \cdot \mathbf{b} = |\mathbf{a}||\mathbf{b}|\cos\theta`}`,
      steps: [
        t`Form the triangle with sides ${ma}, ${mb}, and ${math`\mathbf{a} - \mathbf{b}`}.`,
        t`Apply the cosine rule to the side ${math`\mathbf{a} - \mathbf{b}`}.`,
        t`Expand ${math`|\mathbf{a} - \mathbf{b}|^{${2}}`} in components to get ${math`|\mathbf{a}|^{${2}} + |\mathbf{b}|^{${2}} - ${2}\,\mathbf{a} \cdot \mathbf{b}`}.`,
        t`Compare the two expressions and cancel.`,
      ],
    },
  ],
};
