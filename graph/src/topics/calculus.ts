/** Area `calculus`. Only the calculus that the log n! proof and the exponential limit need. */
import type { Topic } from '@learnhub/mastery';
import { M1_PURE, STEP } from '../sources';

export const calculus: Topic[] = [
  {
    id: 'calc.derivatives',
    title: 'Differentiating powers, e^x, and ln x',
    summary: 'Differentiate x^n, e^(kx), and ln x, with sums and constant multiples.',
    level: 'a-level',
    area: 'calculus',
    prereqs: ['alg.exp-and-ln', 'pre.algebraic-manipulation'],
    encompasses: { 'alg.exp-and-ln': 0.5, 'pre.indices': 0.3 },
    sources: [{ doc: STEP, course: 'STEP Mathematics 1', section: `${M1_PURE}, Differentiation`, verified: true }],
    estMinutes: 25,
  },
  {
    id: 'calc.definite-integrals',
    title: 'Definite integrals and the fundamental theorem',
    summary: 'Evaluate a definite integral from an antiderivative and read it as an area.',
    level: 'a-level',
    area: 'calculus',
    prereqs: ['calc.derivatives'],
    encompasses: { 'calc.derivatives': 0.5 },
    sources: [{ doc: STEP, course: 'STEP Mathematics 1', section: `${M1_PURE}, Integration`, verified: true }],
    estMinutes: 20,
  },
  {
    id: 'calc.integration-by-parts',
    title: 'Integration by parts',
    summary: 'Integrate a product by reversing the product rule, for example the integral of ln x.',
    level: 'a-level',
    area: 'calculus',
    prereqs: ['calc.definite-integrals'],
    encompasses: { 'calc.definite-integrals': 0.6, 'calc.derivatives': 0.5 },
    sources: [{ doc: STEP, course: 'STEP Mathematics 1', section: `${M1_PURE}, Integration`, verified: true }],
    estMinutes: 20,
  },
];
