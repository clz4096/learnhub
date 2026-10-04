/** Area `ia-basic-concepts`. IA Probability "Basic concepts" [3 lectures]. */
import type { Topic } from '@learnhub/mastery';
import { IA_BASIC, TRIPOS } from '../sources';

export const iaBasicConcepts: Topic[] = [
  {
    id: 'prob.classical-probability',
    title: 'Classical probability on a finite sample space',
    summary: 'Model an experiment as a finite set of equally likely outcomes, with events as subsets.',
    level: 'tripos-ia',
    area: 'ia-basic-concepts',
    prereqs: ['prob.counting-probability', 'pre.set-notation'],
    encompasses: { 'prob.counting-probability': 0.5, 'pre.sample-spaces': 0.3, 'pre.set-notation': 0.3 },
    sources: [{ doc: TRIPOS, course: 'IA Probability', section: IA_BASIC, note: 'Schedule: "Classical probability, equally likely outcomes."', verified: true }],
    estMinutes: 15,
  },
  {
    id: 'prob.sampling-models',
    title: 'Ordered and unordered samples, with and without replacement',
    summary: 'Count samples of size k from n in all four cases, including k from n with repetition.',
    level: 'tripos-ia',
    area: 'ia-basic-concepts',
    prereqs: ['prob.classical-probability', 'comb.repeated-arrangements'],
    encompasses: { 'comb.repeated-arrangements': 0.5, 'comb.permutations': 0.5, 'comb.combinations': 0.5, 'prob.classical-probability': 0.4 },
    sources: [{ doc: TRIPOS, course: 'IA Probability', section: IA_BASIC, note: 'Schedule: "Combinatorial analysis, permutations and combinations."', verified: true }],
    estMinutes: 25,
  },
  {
    id: 'prob.stirling-log',
    title: 'Asymptotics of log n!',
    summary: 'Prove log n! is asymptotic to n log n by bounding the sum of log k with integrals.',
    level: 'tripos-ia',
    area: 'ia-basic-concepts',
    prereqs: ['calc.integration-by-parts', 'comb.factorial', 'an.limit-algebra'],
    encompasses: { 'calc.integration-by-parts': 0.5, 'calc.definite-integrals': 0.4, 'comb.factorial': 0.4, 'an.limit-algebra': 0.3 },
    sources: [{ doc: TRIPOS, course: 'IA Probability', section: IA_BASIC, note: 'Schedule: "Stirling\'s formula (asymptotics for log n! proved)." Defines a_n ~ b_n here.', verified: true }],
    estMinutes: 25,
  },
  {
    id: 'prob.stirling-formula',
    title: 'Stirling\'s formula',
    summary: 'Use n! ~ sqrt(2 pi n)(n/e)^n, for example to estimate the central binomial coefficient.',
    level: 'tripos-ia',
    area: 'ia-basic-concepts',
    prereqs: ['prob.stirling-log', 'comb.combinations'],
    encompasses: { 'prob.stirling-log': 0.6, 'comb.combinations': 0.3, 'comb.factorial': 0.3 },
    sources: [{ doc: TRIPOS, course: 'IA Probability', section: IA_BASIC, note: 'The schedule proves only the log asymptotics; the full formula is stated and used.', verified: true }],
    estMinutes: 20,
  },
];
