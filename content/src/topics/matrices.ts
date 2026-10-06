/**
 * mat.matrices: matrix arithmetic, the determinant and inverse of a 2 x 2 matrix, and their
 * use for linear transformations and linear systems. From the STEP specification (STEP 2,
 * Matrices: "add, subtract, and multiply conformable matrices"; "calculate and use the
 * inverse of a non-singular 2 x 2 matrix") and the NST Mathematics Workbook, Section 2,
 * Matrices M1 to M3. Every product, determinant and inverse here is computed exactly and
 * checked by multiplying back.
 */
import type { Rational } from '@learnhub/mastery';
import { auto, cite, same, supervision } from '../cambridge';
import { add, div, int, mul, q, str, sub } from '../math';
import { generator, type AnswerSpec, type Misconception } from '../problem';
import { computedTex, dmath, math, t, type Span } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

type M = [[Rational, Rational], [Rational, Rational]];
const [mA, mB, mx] = [math`A`, math`B`, math`x`];
const mat = (a: number, b: number, c: number, d: number): M => [[q(a), q(b)], [q(c), q(d)]];
const mmul = (X: M, Y: M): M => [0, 1].map((i) => [0, 1].map((j) => add(mul(X[i]![0]!, Y[0]![j]!), mul(X[i]![1]!, Y[1]![j]!)))) as M;
const madd = (X: M, Y: M): M => [0, 1].map((i) => [0, 1].map((j) => add(X[i]![j]!, Y[i]![j]!))) as M;
const det = (X: M): Rational => sub(mul(X[0][0], X[1][1]), mul(X[0][1], X[1][0]));
const inv = (X: M): M => {
  const d = det(X);
  return [[div(X[1][1], d), div(q(-X[0][1].num, X[0][1].den), d)], [div(q(-X[1][0].num, X[1][0].den), d), div(X[0][0], d)]];
};
const flat = (X: M): string[] => [X[0][0], X[0][1], X[1][0], X[1][1]].map(str);
const texM = (X: M): Span => computedTex(`\\begin{pmatrix} ${[X[0][0], X[0][1]].map(texR).join(' & ')} \\\\ ${[X[1][0], X[1][1]].map(texR).join(' & ')} \\end{pmatrix}`);
const texR = (r: Rational): string => (r.den === 1n ? r.num.toString() : `${r.num < 0n ? '-' : ''}\\frac{${r.num < 0n ? -r.num : r.num}}{${r.den}}`);
const blank2x2 = (X: M): AnswerSpec => ({ kind: 'table', columns: [t`first column`, t`second column`], rows: [[null, null], [null, null]], expected: flat(X), cell: 'exact' });

// ---------------------------------------------------------------- generators

interface ProdP { a: number[]; b: number[] }
const entries = (rng: () => number): number[] => Array.from({ length: 4 }, () => int(rng, -4, 5));
const asM = (e: readonly number[]): M => mat(e[0] as number, e[1] as number, e[2] as number, e[3] as number);

const prodGen = generator<ProdP>({
  id: 'product',
  skill: 'Multiply two 2 x 2 matrices: row of the first times column of the second.',
  params: (rng) => {
    for (;;) {
      const p = { a: entries(rng), b: entries(rng) };
      const [A, B] = [asM(p.a), asM(p.b)];
      // AB, BA and the entrywise product all differ, so each slip shows.
      const ew = flat(asM(p.a.map((x, i) => x * (p.b[i] as number))));
      if (flat(mmul(A, B)).join() !== flat(mmul(B, A)).join() && flat(mmul(A, B)).join() !== ew.join()) return p;
    }
  },
  sane: () => null,
  problem: ({ a, b }) => {
    const [A, B] = [asM(a), asM(b)];
    const C = mmul(A, B);
    return {
      prompt: t`Let ${math`A = ${texM(A)}`} and ${math`B = ${texM(B)}`}. Find ${math`AB`}, entering its four entries in the table.`,
      answer: blank2x2(C),
      solution: [
        t`The entry in row ${math`i`}, column ${math`j`} of ${math`AB`} is row ${math`i`} of ${mA} times column ${math`j`} of ${mB}: multiply in pairs and add.`,
        t`Top left: ${math`(${a[0] as number})(${b[0] as number}) + (${a[1] as number})(${b[2] as number}) = ${C[0][0]}`}. Top right: ${math`(${a[0] as number})(${b[1] as number}) + (${a[1] as number})(${b[3] as number}) = ${C[0][1]}`}.`,
        t`Bottom left: ${math`(${a[2] as number})(${b[0] as number}) + (${a[3] as number})(${b[2] as number}) = ${C[1][0]}`}. Bottom right: ${math`(${a[2] as number})(${b[1] as number}) + (${a[3] as number})(${b[3] as number}) = ${C[1][1]}`}. So ${math`AB = ${texM(C)}`}.`,
      ],
    };
  },
  solve: ({ a, b }) => {
    // Apply AB to the basis vectors: AB e_j = A (B e_j).
    const Bcol = (j: number) => [b[j] as number, b[2 + j] as number];
    const Av = (v: number[]) => [(a[0] as number) * (v[0] as number) + (a[1] as number) * (v[1] as number), (a[2] as number) * (v[0] as number) + (a[3] as number) * (v[1] as number)];
    const c0 = Av(Bcol(0));
    const c1 = Av(Bcol(1));
    return [c0[0], c1[0], c0[1], c1[1]].map(String);
  },
  misconceptions: ({ a, b }): Misconception[] => [
    { response: flat(mmul(asM(b), asM(a))), why: t`That is ${math`BA`}. Matrix multiplication is not commutative: ${math`AB`} uses the rows of ${mA} and the columns of ${mB}.` },
    { response: flat(asM(a.map((x, i) => x * (b[i] as number)))), why: t`Matrices are not multiplied entry by entry. Each entry is a row times a column, two products added.` },
  ],
});

const detGen = generator<{ e: number[] }>({
  id: 'determinant',
  skill: 'Compute the determinant ad - bc of a 2 x 2 matrix.',
  quick: true,
  params: (rng) => {
    for (;;) {
      const e = Array.from({ length: 4 }, () => int(rng, -6, 9));
      const [a, b, c, d] = e as [number, number, number, number];
      if (a * d - b * c !== a * d + b * c && a * d - b * c !== a * b - c * d && b * c !== 0) return { e };
    }
  },
  sane: () => null,
  problem: ({ e }) => {
    const A = asM(e);
    return {
      prompt: t`Find the determinant of ${math`${texM(A)}`}.`,
      answer: { kind: 'exact', expected: str(det(A)) },
      solution: [t`${math`\det\begin{pmatrix} a & b \\ c & d \end{pmatrix} = ad - bc = (${e[0] as number})(${e[3] as number}) - (${e[1] as number})(${e[2] as number}) = ${det(A)}`}.`],
    };
  },
  solve: ({ e }) => {
    // Area scale factor: the signed area of the image of the unit square.
    const [a, b, c, d] = e as [number, number, number, number];
    return String(a * d - c * b);
  },
  misconceptions: ({ e }): Misconception[] => {
    const [a, b, c, d] = e as [number, number, number, number];
    return [
      { response: String(a * d + b * c), why: t`The two diagonal products are subtracted: ${math`ad - bc`}.` },
      { response: String(a * b - c * d), why: t`Multiply along the diagonals, top left times bottom right, minus top right times bottom left: ${math`ad - bc`}.` },
    ];
  },
});

const invGen = generator<{ e: number[] }>({
  id: 'inverse',
  skill: 'Invert a non-singular 2 x 2 matrix: swap a and d, negate b and c, divide by ad - bc.',
  params: (rng) => {
    for (;;) {
      const e = Array.from({ length: 4 }, () => int(rng, -5, 6));
      const D = det(asM(e));
      if (D.num !== 0n && D.num !== 1n && (e[1] !== 0 || e[2] !== 0)) return { e };
    }
  },
  sane: ({ e }) => (det(asM(e)).num !== 0n ? null : 'singular'),
  problem: ({ e }) => {
    const A = asM(e);
    const D = det(A);
    const Ai = inv(A);
    return {
      prompt: t`Find the inverse of ${math`A = ${texM(A)}`}, entering its entries as fractions where needed.`,
      answer: blank2x2(Ai),
      solution: [
        t`${math`\det A = ${D}`}, not ${0}, so ${mA} is invertible.`,
        t`${math`A^{-${1}} = \frac{${1}}{ad - bc}\begin{pmatrix} d & -b \\ -c & a \end{pmatrix} = \frac{${1}}{${D}}${texM(mat(e[3] as number, -(e[1] as number), -(e[2] as number), e[0] as number))} = ${texM(Ai)}`}.`,
        t`Check: ${math`AA^{-${1}} = I`}.`,
      ],
    };
  },
  solve: ({ e }) => {
    // Solve A x = e_1 and A x = e_2 by Cramer's rule, column by column.
    const A = asM(e);
    const D = det(A);
    const col = (b0: Rational, b1: Rational): [Rational, Rational] => [div(sub(mul(b0, A[1][1]), mul(A[0][1], b1)), D), div(sub(mul(A[0][0], b1), mul(b0, A[1][0])), D)];
    const c0 = col(q(1), q(0));
    const c1 = col(q(0), q(1));
    return [c0[0], c1[0], c0[1], c1[1]].map(str);
  },
  misconceptions: ({ e }): Misconception[] => {
    const adj = mat(e[3] as number, -(e[1] as number), -(e[2] as number), e[0] as number);
    return [
      { response: flat(adj), why: t`That is the adjugate, ${math`\begin{pmatrix} d & -b \\ -c & a \end{pmatrix}`}. Divide every entry by the determinant ${det(asM(e))}.` },
      { response: flat(inv(asM([e[0] as number, -(e[1] as number), -(e[2] as number), e[3] as number]))), why: t`Swap the diagonal entries ${math`a`} and ${math`d`}, and change the signs of ${math`b`} and ${math`c`}; not the other way round.` },
    ];
  },
});

interface SysP { e: number[]; x: number; y: number }

const sysGen = generator<SysP>({
  id: 'linear-system',
  skill: 'Solve two linear equations in two unknowns as A(x, y) = (p, q), with x, y = A^(-1)(p, q).',
  params: (rng) => {
    for (;;) {
      const e = Array.from({ length: 4 }, () => int(rng, -4, 5));
      const [x, y] = [int(rng, -5, 6), int(rng, -5, 6)];
      if (det(asM(e)).num !== 0n && e.every((v) => v !== 0) && x !== y && x !== 0 && y !== 0) return { e, x, y };
    }
  },
  sane: ({ e }) => (det(asM(e)).num !== 0n ? null : 'singular'),
  problem: ({ e, x, y }) => {
    const [a, b, c, d] = e as [number, number, number, number];
    const [p, qq] = [a * x + b * y, c * x + d * y];
    const A = asM(e);
    return {
      prompt: t`Solve ${math`${a === 1 ? '' : a === -1 ? '-' : a}x ${b < 0 ? '-' : '+'} ${Math.abs(b) === 1 ? '' : Math.abs(b)}y = ${p}`} and ${math`${c === 1 ? '' : c === -1 ? '-' : c}x ${d < 0 ? '-' : '+'} ${Math.abs(d) === 1 ? '' : Math.abs(d)}y = ${qq}`}, using the inverse of the matrix of coefficients.`,
      answer: {
        kind: 'witness', count: 2, names: ['x', 'y'], example: `x = ${x}, y = ${y}`,
        check: ([u, v]) => (u === undefined || v === undefined ? 'Give x and y.' : str(u) === String(x) && str(v) === String(y) ? null : 'Those values do not satisfy both equations.'),
      },
      solution: [
        t`In matrix form, ${math`${texM(A)}\begin{pmatrix} x \\ y \end{pmatrix} = \begin{pmatrix} ${p} \\ ${qq} \end{pmatrix}`}. ${math`\det = ${det(A)} \neq ${0}`}, so the matrix is invertible and there is exactly one solution.`,
        t`${math`\begin{pmatrix} x \\ y \end{pmatrix} = ${texM(inv(A))}\begin{pmatrix} ${p} \\ ${qq} \end{pmatrix} = \begin{pmatrix} ${x} \\ ${y} \end{pmatrix}`}.`,
      ],
    };
  },
  solve: ({ e, x, y }) => {
    const [a, b, c, d] = e as [number, number, number, number];
    const [p, qq] = [a * x + b * y, c * x + d * y];
    const D = a * d - b * c;
    return `x = ${str(q(p * d - b * qq, D))}, y = ${str(q(a * qq - c * p, D))}`;
  },
  misconceptions: ({ x, y }): Misconception[] => [
    { response: `x = ${y}, y = ${x}`, why: t`The first entry of ${math`A^{-${1}}\begin{pmatrix} p \\ q \end{pmatrix}`} is ${mx}, the second ${math`y`}. Check by substituting.` },
    { response: `x = ${-x}, y = ${-y}`, why: t`The signs are reversed: check the minus signs in ${math`\begin{pmatrix} d & -b \\ -c & a \end{pmatrix}`}, and substitute your answer back.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const NST = 'nst-workbook';
const NA = mat(1, 2, 3, 4);
const NB = mat(-2, -1, 4, 2);

const m1ab = auto({
  id: 'nst-m1-ab',
  source: cite(NST, 'Section 2, Matrices, M1'),
  title: t`The product ${math`AB`}`,
  prompt: t`Calculate ${math`AB`} for ${math`A = ${texM(NA)}`} and ${math`B = ${texM(NB)}`}.`,
  answer: blank2x2(mmul(NA, NB)),
  solution: [
    t`Row ${1} of ${mA} with the columns of ${mB}: ${math`${1} \cdot (-${2}) + ${2} \cdot ${4} = ${6}`} and ${math`${1} \cdot (-${1}) + ${2} \cdot ${2} = ${3}`}.`,
    t`Row ${2}: ${math`${3} \cdot (-${2}) + ${4} \cdot ${4} = ${10}`} and ${math`${3} \cdot (-${1}) + ${4} \cdot ${2} = ${5}`}. So ${math`AB = ${texM(mmul(NA, NB))}`}.`,
    t`Notice the second column is half the first: ${math`\det(AB) = ${0}`}, because ${math`\det B = -${4} + ${4} = ${0}`}.`,
  ],
  reference: flat(mmul(NA, NB)),
  verify: () => same('AB', flat(mmul(NA, NB)).join(','), '6,3,10,5'),
  misconceptions: [{ response: flat(mmul(NB, NA)), why: t`That is ${math`BA`}. ${math`AB`} takes rows from ${mA}.` }],
});

const m1ba = auto({
  id: 'nst-m1-ba',
  source: cite(NST, 'Section 2, Matrices, M1'),
  title: t`The product ${math`BA`}`,
  prompt: t`Calculate ${math`BA`} for ${math`A = ${texM(NA)}`} and ${math`B = ${texM(NB)}`}, and compare it with ${math`AB = ${texM(mmul(NA, NB))}`}.`,
  answer: blank2x2(mmul(NB, NA)),
  solution: [t`Rows of ${mB}, columns of ${mA}: ${math`BA = ${texM(mmul(NB, NA))}`}. It differs from ${math`AB`}: matrix multiplication is not commutative.`],
  reference: flat(mmul(NB, NA)),
  verify: () => same('BA', flat(mmul(NB, NA)).join(','), '-5,-8,10,16'),
  misconceptions: [{ response: flat(mmul(NA, NB)), why: t`That is ${math`AB`}; the order matters.` }],
});

const m1sum = auto({
  id: 'nst-m1-sum',
  source: cite(NST, 'Section 2, Matrices, M1'),
  title: t`The sum ${math`A + B`}`,
  prompt: t`Calculate ${math`A + B`} for ${math`A = ${texM(NA)}`} and ${math`B = ${texM(NB)}`}.`,
  answer: blank2x2(madd(NA, NB)),
  solution: [t`Add entry by entry: ${math`A + B = ${texM(madd(NA, NB))}`}.`],
  reference: flat(madd(NA, NB)),
  verify: () => same('A + B', flat(madd(NA, NB)).join(','), '-1,1,7,6'),
  misconceptions: [{ response: flat(mmul(NA, NB)), why: t`That is the product. Matrices are added entry by entry.` }],
});

const m2 = supervision({
  id: 'nst-m2',
  source: cite(NST, 'Section 2, Matrices, M2'),
  title: t`Zero one way, not the other`,
  prompt: t`Find ${math`${2} \times ${2}`} matrices ${mA} and ${mB} such that ${math`AB = ${0}`} (the zero matrix) and ${math`BA \neq ${0}`}. Explain how you found them, and why neither ${mA} nor ${mB} can be invertible.`,
  writeUp: 'explanation',
});

const m3 = supervision({
  id: 'nst-m3',
  source: cite(NST, 'Section 2, Matrices, M3'),
  title: t`A rotation and a scaling`,
  prompt: t`A linear transformation of the plane is described by the matrix ${math`${texM(mat(1, -1, 1, 1))}`}. Show that it is the composition of a rotation and a scaling, and find the angle and the scale factor.`,
  writeUp: 'proof',
});

const m3auto = auto({
  id: 'nst-m3-scale',
  source: cite(NST, 'Section 2, Matrices, M3', true),
  title: t`The scale factor`,
  prompt: t`The matrix ${math`${texM(mat(1, -1, 1, 1))}`} is a rotation followed by a scaling by a factor ${math`s > ${0}`}. Find ${math`s`}. (Type a square root as sqrt(${2}).)`,
  answer: { kind: 'expression', expected: 'sqrt(2)', variables: [] },
  solution: [
    t`Write it as ${math`s\begin{pmatrix} \cos\theta & -\sin\theta \\ \sin\theta & \cos\theta \end{pmatrix}`}: then ${math`s\cos\theta = ${1}`} and ${math`s\sin\theta = ${1}`}.`,
    t`Square and add: ${math`s^{${2}} = ${2}`}, so ${math`s = \sqrt{${2}}`}, and ${math`\theta = \frac{\pi}{${4}}`}. (Also ${math`\det = ${2} = s^{${2}}`}: area scales by ${math`s^{${2}}`}.)`,
  ],
  reference: 'sqrt(2)',
  verify: () => {
    const s = Math.SQRT2;
    const th = Math.PI / 4;
    return Math.abs(s * Math.cos(th) - 1) < 1e-12 && Math.abs(s * Math.sin(th) - 1) < 1e-12 ? null : 'does not match';
  },
  misconceptions: [{ response: '2', why: t`${2} is the determinant, which is ${math`s^{${2}}`}, the area scale factor. Lengths scale by ${math`s = \sqrt{${2}}`}.` }],
});

// ---------------------------------------------------------------- lesson

const EXA = mat(2, 1, 5, 3);

export const matrices: TopicContent = {
  topicId: 'mat.matrices',
  goal: t`Multiply matrices, find the determinant and inverse of a ${math`${2} \times ${2}`} matrix, and use them for transformations and linear systems.`,
  objective: t`Multiply matrices, and find and use the determinant and inverse of a two by two matrix.`,
  why: t`Matrices are the language of linear algebra, the first-year course behind graphics, statistics and machine learning.`,
  minutes: 30,
  lesson: [
    { kind: 'section', title: t`Arrays that act` },
    { kind: 'hook', text: t`The equations ${math`${2}x + y = ${4}`} and ${math`${5}x + ${3}y = ${11}`} can be packed into one: ${math`${texM(EXA)}\begin{pmatrix} x \\ y \end{pmatrix} = \begin{pmatrix} ${4} \\ ${11} \end{pmatrix}`}. If we could divide by the square array, we would be done. We can, almost.` },
    {
      kind: 'definition',
      name: t`Matrix, sum, product`,
      formal: t`An ${math`m \times n`} [[matrix|matrix]] is a rectangular array of numbers with ${math`m`} rows and ${math`n`} columns; ${math`a_{ij}`} is the entry in row ${math`i`}, column ${math`j`}. Matrices of the same size add entry by entry. If ${mA} is ${math`m \times n`} and ${mB} is ${math`n \times p`}, their product ${math`AB`} is the ${math`m \times p`} matrix with ${dmath`(AB)_{ij} = \sum_{k = ${1}}^{n} a_{ik}b_{kj}.`}`,
      plain: t`Entry ${math`(i, j)`} of ${math`AB`} is row ${math`i`} of ${mA} times column ${math`j`} of ${mB}: multiply in pairs and add. The number of columns of ${mA} must equal the number of rows of ${mB}.`,
    },
    { kind: 'p', text: t`Order matters. With ${math`A = ${texM(NA)}`} and ${math`B = ${texM(NB)}`}: ${math`AB = ${texM(mmul(NA, NB))}`} but ${math`BA = ${texM(mmul(NB, NA))}`}. Read ${math`AB\mathbf{v}`} as "do ${mB} to ${math`\mathbf{v}`}, then ${mA}": composing two transformations, and doing things in a different order usually gives a different result.` },
    checkFrom(detGen, { e: [3, 2, 4, 5] }, t`${math`ad - bc = ${3} \times ${5} - ${2} \times ${4} = ${7}`}.`),
    { kind: 'section', title: t`Determinant and inverse` },
    {
      kind: 'definition',
      name: t`Determinant, inverse`,
      formal: t`The [[determinant|determinant]] of ${math`A = \begin{pmatrix} a & b \\ c & d \end{pmatrix}`} is ${math`\det A = ad - bc`}. The identity is ${math`I = \begin{pmatrix} ${1} & ${0} \\ ${0} & ${1} \end{pmatrix}`}. A matrix ${math`A^{-${1}}`} with ${math`AA^{-${1}} = A^{-${1}}A = I`} is the [[inverse-matrix|inverse]] of ${mA}; ${mA} is non-singular if it has one.`,
      plain: t`The determinant is the factor by which the transformation scales areas (negative if it flips the plane over). The inverse undoes the transformation. For ${math`${texM(EXA)}`}, ${math`\det = ${2} \times ${3} - ${1} \times ${5} = ${1}`}.`,
    },
    { kind: 'theorem', name: t`Inverse of a ${math`${2} \times ${2}`} matrix`, statement: t`${math`A = \begin{pmatrix} a & b \\ c & d \end{pmatrix}`} is invertible if and only if ${math`ad - bc \neq ${0}`}, and then ${dmath`A^{-${1}} = \frac{${1}}{ad - bc}\begin{pmatrix} d & -b \\ -c & a \end{pmatrix}.`}` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Multiply out`, text: t`${math`\begin{pmatrix} a & b \\ c & d \end{pmatrix}\begin{pmatrix} d & -b \\ -c & a \end{pmatrix} = \begin{pmatrix} ad - bc & -ab + ba \\ cd - dc & -cb + da \end{pmatrix} = (ad - bc)I`}, and the same in the other order.` },
        { label: t`Divide by the determinant`, text: t`If ${math`ad - bc \neq ${0}`}, dividing by it gives ${math`AA^{-${1}} = A^{-${1}}A = I`} with ${math`A^{-${1}}`} as stated.` },
        { label: t`No inverse when it is zero`, text: t`If ${math`ad - bc = ${0}`} and ${math`AX = I`} for some ${math`X`}, multiply ${math`\begin{pmatrix} d & -b \\ -c & a \end{pmatrix}A = ${0}`} on the right by ${math`X`}: ${math`\begin{pmatrix} d & -b \\ -c & a \end{pmatrix} = ${0}`}, so ${math`a = b = c = d = ${0}`}, and then ${math`AX = ${0} \neq I`}. A contradiction.`, why: { q: t`Why is ${math`\begin{pmatrix} d & -b \\ -c & a \end{pmatrix}A`} zero here?`, a: t`By the first step with the order reversed, it equals ${math`(ad - bc)I`}, and ${math`ad - bc = ${0}`}.` } },
      ],
    },
    { kind: 'p', text: t`Back to the hook: ${math`\det = ${1}`}, so the inverse is ${math`${texM(inv(EXA))}`}, and ${math`\begin{pmatrix} x \\ y \end{pmatrix} = ${texM(inv(EXA))}\begin{pmatrix} ${4} \\ ${11} \end{pmatrix} = \begin{pmatrix} ${1} \\ ${2} \end{pmatrix}`}. Check: ${math`${2} + ${2} = ${4}`} and ${math`${5} + ${6} = ${11}`}.` },
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`If ${math`AB = ${0}`}, then ${math`A = ${0}`} or ${math`B = ${0}`}.`, counterexample: t`${math`${texM(mat(0, 1, 0, 0))}${texM(mat(0, 1, 0, 0))} = ${texM(mat(0, 0, 0, 0))}`}, yet neither factor is zero. Matrices can multiply to zero; that is why "dividing" needs a non-zero determinant.` },
    { kind: 'pitfall', claim: t`${math`(AB)^{-${1}} = A^{-${1}}B^{-${1}}`}.`, counterexample: t`It is ${math`B^{-${1}}A^{-${1}}`}: undo the last step first. ${math`(AB)(B^{-${1}}A^{-${1}}) = A(BB^{-${1}})A^{-${1}} = AA^{-${1}} = I`}, while ${math`A^{-${1}}B^{-${1}}`} generally fails, since ${math`AB \neq BA`}.` },
    { kind: 'takeaway', text: t`Multiply rows into columns, in order; a ${math`${2} \times ${2}`} matrix is invertible exactly when ${math`ad - bc \neq ${0}`}, with inverse ${math`\frac{${1}}{ad - bc}\begin{pmatrix} d & -b \\ -c & a \end{pmatrix}`}.` },
  ],
  examples: [
    workedCambridge(m1ab),
    worked(invGen, { e: [3, 1, 4, 2] }, t`An inverse with fractions`),
    worked(sysGen, { e: [2, 1, 5, 3], x: 1, y: 2 }, t`A system solved by the inverse`),
  ],
  generators: [prodGen, detGen, invGen, sysGen],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['matrix', 'determinant', 'inverse-matrix'],
  cambridge: [m2, m3, m3auto, m1ba, m1sum],
  gate: ['nst-m3', 'nst-m2'],
  recall: [
    { front: t`State the inverse of ${math`\begin{pmatrix} a & b \\ c & d \end{pmatrix}`}, and when it exists.`, back: t`${math`\frac{${1}}{ad - bc}\begin{pmatrix} d & -b \\ -c & a \end{pmatrix}`}, when ${math`ad - bc \neq ${0}`}.` },
    { front: t`What is entry ${math`(i, j)`} of ${math`AB`}?`, back: t`${math`\sum_{k} a_{ik}b_{kj}`}: row ${math`i`} of ${mA} times column ${math`j`} of ${mB}.` },
  ],
  proofOrder: [
    {
      title: t`The ${math`${2} \times ${2}`} inverse`,
      steps: [
        t`Multiply ${mA} by ${math`\begin{pmatrix} d & -b \\ -c & a \end{pmatrix}`}.`,
        t`The off-diagonal entries cancel, leaving ${math`(ad - bc)I`}.`,
        t`If ${math`ad - bc \neq ${0}`}, divide by it.`,
        t`So ${math`\frac{${1}}{ad - bc}\begin{pmatrix} d & -b \\ -c & a \end{pmatrix}`} is ${math`A^{-${1}}`}.`,
      ],
    },
  ],
};

