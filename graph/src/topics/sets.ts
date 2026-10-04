/** Area `sets`. Set notation, then countable unions for the countable additivity axiom, and set-builder notation for CST Discrete Mathematics. */
import type { Topic } from '@learnhub/mastery';
import { CST, CST_DM, CST_NUMBERS, GCSE, GCSE_PROB, STEP, STEP_SET_NOTATION, TRIPOS } from '../sources';

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
    summary: 'Read and write sets as $\\{x \\in A \\mid P(x)\\}$, and decide membership from the defining property.',
    level: 'a-level',
    area: 'sets',
    prereqs: ['pre.set-notation'],
    encompasses: { 'pre.set-notation': 0.4 },
    sources: [
      {
        doc: STEP,
        course: 'STEP Mathematics 2',
        section: STEP_SET_NOTATION,
        note: 'Page 32. The table defines membership (is an element of) and writes sets in set-builder form: Q as {p/q : p in Z, q in N} and [a, b] as {x in R : a <= x <= b}. The Papers column reads "2, 3" with no bullet, so the notation is in the A level guidance, not a STEP addition.',
        verified: true,
      },
      { doc: CST, course: CST_DM, section: CST_NUMBERS, note: 'Syllabus: "Sets: membership and comprehension".', verified: true },
    ],
    estMinutes: 15,
  },
];
