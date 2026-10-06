/**
 * Area `generating-functions`. Probability and moment generating functions from IA
 * Probability "Discrete random variables" and "Inequalities and limits"
 * (graph/reviews/cambridge-batch-2.md).
 */
import type { Topic } from '@learnhub/mastery';
import { IA_DISCRETE_RV, IA_INEQUALITIES, IA_PROB_PART_V, TRIPOS } from '../sources';

export const generatingFunctions: Topic[] = [
  {
    id: 'gf.pgf',
    title: 'Probability generating functions',
    summary: 'Use $G_X(t) = E(t^X)$ to find moments from derivatives at $t = 1$ and the distribution of a sum of independent variables.',
    level: 'tripos-ia',
    area: 'generating-functions',
    prereqs: ['rv.independence', 'an.power-series', 'calc.derivatives'],
    encompasses: { 'an.power-series': 0.5, 'rv.independence': 0.5, 'calc.derivatives': 0.4, 'rv.expectation-general': 0.4 },
    sources: [{ doc: TRIPOS, course: IA_PROB_PART_V, section: IA_DISCRETE_RV, note: 'Schedule: "Generating functions: sums of independent random variables, random sum formula, moments."', verified: true }],
    estMinutes: 25,
  },
  {
    id: 'gf.random-sums',
    title: 'Random sums',
    summary: 'For $S_N = X_1 + \\cdots + X_N$ with $N$ independent of the $X_i$, show $G_{S_N} = G_N \\circ G_X$ and find $E(S_N)$ and $\\mathrm{Var}(S_N)$.',
    level: 'tripos-ia',
    area: 'generating-functions',
    prereqs: ['gf.pgf', 'rv.conditional-expectation'],
    encompasses: { 'gf.pgf': 0.6, 'rv.conditional-expectation': 0.5 },
    sources: [{ doc: TRIPOS, course: IA_PROB_PART_V, section: IA_DISCRETE_RV, note: 'Schedule: "random sum formula".', verified: true }],
    estMinutes: 20,
  },
  {
    id: 'gf.combinatorial',
    title: 'Counting with generating functions',
    summary: 'Count selections and partitions by reading coefficients of a product of power series.',
    level: 'tripos-ia',
    area: 'generating-functions',
    prereqs: ['gf.pgf', 'comb.binomial-theorem'],
    encompasses: { 'gf.pgf': 0.4, 'comb.binomial-theorem': 0.5, 'an.power-series': 0.3 },
    sources: [{ doc: TRIPOS, course: IA_PROB_PART_V, section: IA_DISCRETE_RV, note: 'Schedule: "Combinatorial applications of generating functions." No sheet problem (batch 2, question 5).', verified: true }],
    estMinutes: 20,
  },
  {
    id: 'gf.mgf',
    title: 'Moment generating functions',
    summary: 'Use $M_X(\\theta) = E(e^{\\theta X})$ for moments and sums, and state the continuity theorem.',
    level: 'tripos-ia',
    area: 'generating-functions',
    prereqs: ['gf.pgf', 'rv.continuous-summaries', 'an.exp-series'],
    encompasses: { 'gf.pgf': 0.5, 'an.exp-series': 0.4, 'rv.continuous-summaries': 0.4 },
    sources: [{ doc: TRIPOS, course: IA_PROB_PART_V, section: IA_INEQUALITIES, note: 'Schedule: "Moment generating functions and statement (no proof) of continuity theorem."', verified: true }],
    estMinutes: 20,
  },
];
