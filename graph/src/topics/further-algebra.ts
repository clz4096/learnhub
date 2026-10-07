/** Area `further-algebra`. Complex numbers and matrices, the A level Further Mathematics the NST Maths Workbook asks for before CST Part IA (graph/reviews/cambridge-prep.md). */
import type { Topic } from '@learnhub/mastery';
import { M2_COMPLEX, M2_MATRICES, STEP } from '../sources';

export const furtherAlgebra: Topic[] = [
  {
    id: 'cx.complex-numbers',
    title: 'Complex numbers',
    summary: 'Add, multiply, and divide $x + iy$, use the modulus and argument, and find complex roots such as those of $x^4 + 1 = 0$.',
    level: 'a-level',
    area: 'further-algebra',
    prereqs: ['pre.quadratic-equations', 'trig.radians-and-graphs'],
    encompasses: { 'pre.quadratic-equations': 0.4, 'trig.compound-angles': 0.4, 'trig.radians-and-graphs': 0.4 },
    sources: [{ doc: STEP, course: 'STEP Mathematics 2', section: M2_COMPLEX, note: 'Spec: "Add, subtract, multiply, and divide complex numbers in the form x + iy" and "Convert between the Cartesian form and the modulus-argument form".', verified: true }],
    estMinutes: 25,
  },
  {
    id: 'mat.matrices',
    title: 'Matrices and determinants',
    summary: 'Multiply matrices, find the determinant and inverse of a $2 \\times 2$ matrix, and use them for transformations and linear systems.',
    level: 'a-level',
    area: 'further-algebra',
    prereqs: ['alg.simultaneous-equations'],
    encompasses: { 'alg.simultaneous-equations': 0.5 },
    sources: [{ doc: STEP, course: 'STEP Mathematics 2', section: M2_MATRICES, note: 'Spec: "Add, subtract, and multiply conformable matrices" and "Calculate and use the inverse of a non-singular 2 x 2 matrix."', verified: true }],
    estMinutes: 25,
  },
];
