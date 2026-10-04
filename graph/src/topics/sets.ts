/** Area `sets`. Set notation, then countable unions for the countable additivity axiom, and set-builder notation for CST Discrete Mathematics. */
import type { Topic } from '@learnhub/mastery';
import { CST, CST_DM, CST_NUMBERS, GCSE, GCSE_PROB, TRIPOS } from '../sources';

export const sets: Topic[] = [
  {
    id: 'pre.set-notation',
    title: 'Sets and Venn diagrams',
    summary: 'Use set notation for union, intersection, and complement, and draw them as Venn diagrams.',
    level: 'pre-a-level',
    area: 'sets',
    prereqs: [],
    encompasses: {},
    sources: [{ doc: GCSE, course: 'GCSE Mathematics', section: GCSE_PROB, note: 'Item 6 (Venn diagrams); set notation also in Algebra item 22.', verified: true }],
    estMinutes: 15,
  },
  {
    id: 'sets.countable-unions',
    title: 'Countable sets and countable unions',
    summary: 'Recognise countable sets and work with unions and intersections of a sequence of sets.',
    level: 'tripos-ia',
    area: 'sets',
    prereqs: ['pre.set-notation', 'pre.sequences'],
    encompasses: { 'pre.set-notation': 0.5, 'pre.sequences': 0.2 },
    sources: [{ doc: TRIPOS, course: 'IA Numbers and Sets', section: 'Countability and uncountability', note: 'Unions and intersections from "Sets, relations and functions".', verified: true }],
    estMinutes: 20,
  },
  {
    id: 'sets.comprehension',
    title: 'Membership and set-builder notation',
    summary: 'Read and write sets as {x in A | P(x)}, and decide membership from the defining property.',
    level: 'tripos-ia',
    area: 'sets',
    prereqs: ['pre.set-notation'],
    encompasses: { 'pre.set-notation': 0.4 },
    sources: [{ doc: CST, course: CST_DM, section: CST_NUMBERS, note: 'Syllabus: "Sets: membership and comprehension".', verified: true }],
    estMinutes: 15,
  },
];
