/**
 * Area `random-processes`. Random walks and branching processes from IA Probability
 * "Discrete random variables" (graph/reviews/cambridge-batch-2.md).
 */
import type { Topic } from '@learnhub/mastery';
import { IA_DISCRETE_RV, IA_PROB_PART_V, TRIPOS } from '../sources';

export const randomProcesses: Topic[] = [
  {
    id: 'rw.gamblers-ruin',
    title: 'Random walks and gambler\'s ruin',
    summary: 'Find the probability that a simple random walk hits $a$ before $0$ by conditioning on the first step and solving the difference equation.',
    level: 'tripos-ia',
    area: 'random-processes',
    prereqs: ['alg.linear-recurrences', 'prob.first-step', 'prob.total-probability'],
    encompasses: { 'alg.linear-recurrences': 0.6, 'prob.first-step': 0.6, 'prob.total-probability': 0.4 },
    sources: [{ doc: TRIPOS, course: IA_PROB_PART_V, section: IA_DISCRETE_RV, note: 'Schedule: "Random walks: gambler\'s ruin, recurrence relations."', verified: true }],
    estMinutes: 25,
  },
  {
    id: 'rw.absorption-time',
    title: 'Mean time to absorption',
    summary: 'Find the expected duration of a random walk with absorbing barriers from a first-step difference equation.',
    level: 'tripos-ia',
    area: 'random-processes',
    prereqs: ['rw.gamblers-ruin', 'rv.conditional-expectation'],
    encompasses: { 'rw.gamblers-ruin': 0.6, 'rv.conditional-expectation': 0.4, 'alg.linear-recurrences': 0.5 },
    sources: [{ doc: TRIPOS, course: IA_PROB_PART_V, section: IA_DISCRETE_RV, note: 'Schedule: "Mean time to absorption."', verified: true }],
    estMinutes: 20,
  },
  {
    id: 'bp.extinction',
    title: 'Branching processes and extinction',
    summary: 'Show that the generation sizes have pgf $G \\circ \\cdots \\circ G$ and that the extinction probability is the least root of $t = G(t)$ in $[0, 1]$.',
    level: 'tripos-ia',
    area: 'random-processes',
    prereqs: ['gf.random-sums', 'prob.continuity'],
    encompasses: { 'gf.random-sums': 0.6, 'gf.pgf': 0.5, 'prob.continuity': 0.4 },
    sources: [{ doc: TRIPOS, course: IA_PROB_PART_V, section: IA_DISCRETE_RV, note: 'Schedule: "Branching processes: generating functions and extinction probability."', verified: true }],
    estMinutes: 25,
  },
];
