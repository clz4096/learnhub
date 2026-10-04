/** Area `conditioning`. Conditional probability, total probability, Bayes, and Simpson. */
import type { Topic } from '@learnhub/mastery';
import { IA_AXIOMATIC, TRIPOS } from '../sources';

export const conditioning: Topic[] = [
  {
    id: 'prob.conditional-probability',
    title: 'Conditional probability as a probability measure',
    summary: 'Show $P(\\cdot \\mid B)$ satisfies the axioms and use the multiplication rule for several events.',
    level: 'tripos-ia',
    area: 'conditioning',
    prereqs: ['prob.conditional-formula', 'prob.axiom-consequences'],
    encompasses: { 'prob.conditional-formula': 0.6, 'prob.axioms': 0.4 },
    sources: [{ doc: TRIPOS, course: 'IA Probability', section: IA_AXIOMATIC, note: 'Schedule: "Conditional probability."', verified: true }],
    estMinutes: 20,
  },
  {
    id: 'prob.total-probability',
    title: 'The law of total probability',
    summary: 'Split $P(A)$ over a finite or countable partition as the sum $\\sum_i P(A \\mid B_i) P(B_i)$.',
    level: 'tripos-ia',
    area: 'conditioning',
    prereqs: ['prob.conditional-probability'],
    encompasses: { 'prob.conditional-probability': 0.6, 'prob.axioms': 0.3, 'pre.tree-diagrams': 0.3 },
    sources: [{ doc: TRIPOS, course: 'IA Probability', section: IA_AXIOMATIC, note: 'Not named in the schedule; it is the step Bayes\'s formula needs.', verified: true }],
    estMinutes: 15,
  },
  {
    id: 'prob.bayes-formula',
    title: 'Bayes\'s formula',
    summary: 'Reverse a conditional probability with Bayes\'s formula, for example in a diagnostic test.',
    level: 'tripos-ia',
    area: 'conditioning',
    prereqs: ['prob.total-probability'],
    encompasses: { 'prob.total-probability': 0.6, 'prob.conditional-probability': 0.5, 'prob.conditional-formula': 0.3 },
    sources: [{
      doc: TRIPOS,
      course: 'IA Probability',
      section: IA_AXIOMATIC,
      note: 'Schedule: "Bayes\'s formula." External check: STEP Support Foundation Assignment 6 (the prosecutor\'s fallacy).',
      verified: true,
    }],
    estMinutes: 20,
  },
  {
    id: 'prob.simpsons-paradox',
    title: 'Simpson\'s paradox',
    summary: 'See how a comparison that holds in every group can reverse when the groups are pooled.',
    level: 'tripos-ia',
    area: 'conditioning',
    prereqs: ['prob.total-probability'],
    encompasses: { 'prob.total-probability': 0.7, 'prob.conditional-probability': 0.4, 'pre.two-way-tables': 0.3 },
    sources: [{ doc: TRIPOS, course: 'IA Probability', section: IA_AXIOMATIC, note: 'Schedule: "Examples, including Simpson\'s paradox."', verified: true }],
    estMinutes: 15,
  },
];
