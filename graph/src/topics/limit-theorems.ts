/**
 * Area `limit-theorems`. IA Probability "Inequalities and limits", without its moment
 * generating functions, which are in `generating-functions` (graph/reviews/cambridge-batch-2.md).
 */
import type { Topic } from '@learnhub/mastery';
import { IA_INEQUALITIES, IA_PROB_PART_V, TRIPOS } from '../sources';

export const limitTheorems: Topic[] = [
  {
    id: 'ineq.markov-chebyshev',
    title: 'Markov\'s and Chebyshev\'s inequalities',
    summary: 'Bound $P(X \\ge a) \\le E(X)/a$ for $X \\ge 0$, and $P(|X - \\mu| \\ge c) \\le \\mathrm{Var}(X)/c^2$.',
    level: 'tripos-ia',
    area: 'limit-theorems',
    prereqs: ['rv.expectation-general', 'prob.poisson-distribution'],
    encompasses: { 'rv.expectation-general': 0.6, 'rv.variance': 0.5 },
    sources: [{ doc: TRIPOS, course: IA_PROB_PART_V, section: IA_INEQUALITIES, note: 'Schedule: "Markov\'s inequality, Chebyshev\'s inequality."', verified: true }],
    estMinutes: 15,
  },
  {
    id: 'ineq.jensen',
    title: 'Convexity, Jensen\'s inequality, and AM-GM',
    summary: 'Prove $E(f(X)) \\ge f(E(X))$ for convex $f$ and derive the AM-GM inequality from it.',
    level: 'tripos-ia',
    area: 'limit-theorems',
    prereqs: ['rv.expectation-general', 'calc.convexity'],
    encompasses: { 'calc.convexity': 0.6, 'rv.expectation-general': 0.5 },
    sources: [{ doc: TRIPOS, course: IA_PROB_PART_V, section: IA_INEQUALITIES, note: 'Schedule: "Convexity: Jensen\'s inequality for general random variables, AM/GM inequality."', verified: true }],
    estMinutes: 20,
  },
  {
    id: 'lim.weak-law',
    title: 'The weak law of large numbers',
    summary: 'Prove that the sample mean of i.i.d. variables with finite variance converges in probability to $\\mu$, by Chebyshev.',
    level: 'tripos-ia',
    area: 'limit-theorems',
    prereqs: ['ineq.markov-chebyshev', 'rv.covariance'],
    encompasses: { 'ineq.markov-chebyshev': 0.6, 'rv.covariance': 0.5, 'an.epsilon-limit': 0.3 },
    sources: [{ doc: TRIPOS, course: IA_PROB_PART_V, section: IA_INEQUALITIES, note: 'Schedule: "Weak law of large numbers."', verified: true }],
    estMinutes: 20,
  },
  {
    id: 'lim.clt',
    title: 'The central limit theorem',
    summary: 'State the central limit theorem, sketch its proof by moment generating functions, and use it to size samples.',
    level: 'tripos-ia',
    area: 'limit-theorems',
    prereqs: ['gf.mgf', 'lim.weak-law', 'prob.normal-approximation'],
    encompasses: { 'gf.mgf': 0.5, 'prob.normal-approximation': 0.5, 'prob.normal-distribution': 0.5, 'lim.weak-law': 0.3 },
    sources: [{ doc: TRIPOS, course: IA_PROB_PART_V, section: IA_INEQUALITIES, note: 'Schedule: "Statement of central limit theorem and sketch of proof. Examples, including sampling."', verified: true }],
    estMinutes: 25,
  },
];
