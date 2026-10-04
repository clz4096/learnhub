/** Area `distributions`. Binomial, Poisson, and geometric, and the Poisson limit. */
import type { Topic } from '@learnhub/mastery';
import { IA_AXIOMATIC, M1_PROB, STEP, TRIPOS } from '../sources';

export const distributions: Topic[] = [
  {
    id: 'prob.binomial-distribution',
    title: 'The binomial distribution',
    summary: 'Model the number of successes in $n$ independent trials and compute $B(n, p)$ probabilities.',
    level: 'a-level',
    area: 'distributions',
    prereqs: ['prob.discrete-distributions', 'comb.combinations', 'prob.independent-events'],
    encompasses: { 'comb.combinations': 0.5, 'prob.independent-events': 0.5, 'prob.discrete-distributions': 0.4, 'pre.tree-diagrams': 0.3 },
    sources: [{ doc: STEP, course: 'STEP Mathematics 1', section: `${M1_PROB}, Statistical distributions`, verified: true }],
    estMinutes: 20,
  },
  {
    id: 'prob.poisson-distribution',
    title: 'The Poisson distribution',
    summary: 'Compute Poisson probabilities $\\frac{e^{-\\lambda} \\lambda^k}{k!}$ and check they sum to one.',
    level: 'step',
    area: 'distributions',
    prereqs: ['prob.discrete-distributions', 'an.exp-series'],
    encompasses: { 'an.exp-series': 0.5, 'prob.discrete-distributions': 0.4 },
    sources: [{ doc: STEP, course: 'STEP Mathematics 2', section: 'Section C: Probability/Statistics, Probability distributions', verified: true }],
    estMinutes: 15,
  },
  {
    id: 'prob.geometric-distribution',
    title: 'The geometric distribution',
    summary: 'Model the wait for the first success in independent trials, in both common conventions.',
    level: 'tripos-ia',
    area: 'distributions',
    prereqs: ['prob.point-mass-spaces', 'prob.independence'],
    encompasses: { 'prob.point-mass-spaces': 0.5, 'alg.geometric-sum-to-infinity': 0.5, 'prob.independence': 0.4 },
    sources: [{ doc: TRIPOS, course: 'IA Probability', section: IA_AXIOMATIC, note: 'Schedule: "Binomial, Poisson and geometric distributions."', verified: true }],
    estMinutes: 15,
  },
  {
    id: 'prob.poisson-binomial-limit',
    title: 'The Poisson limit of the binomial',
    summary: 'Prove that $B(n, \\lambda/n)$ probabilities tend to $\\mathrm{Poisson}(\\lambda)$ probabilities as $n$ grows.',
    level: 'tripos-ia',
    area: 'distributions',
    prereqs: ['prob.binomial-distribution', 'prob.poisson-distribution', 'an.exp-limit', 'prob.point-mass-spaces'],
    encompasses: { 'an.exp-limit': 0.6, 'prob.binomial-distribution': 0.5, 'prob.poisson-distribution': 0.5, 'an.limit-algebra': 0.3 },
    sources: [{ doc: TRIPOS, course: 'IA Probability', section: IA_AXIOMATIC, note: 'Schedule: "Relation between Poisson and binomial distributions."', verified: true }],
    estMinutes: 25,
  },
];
