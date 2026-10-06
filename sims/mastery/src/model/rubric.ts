/**
 * The supervision write-up rubric: how a supervisor splits the mark out of 20 for a written
 * answer (a proof, an explanation, a sketch). A Tripos question is marked out of 20 and
 * credits correct reasoning and clear writing, not only the final line; this rubric is the
 * app's own split of those 20 marks into four criteria, so a mark says what to work on.
 * It is not an official Cambridge scheme.
 *
 * The rubric is data: the copied supervision block prints it (supervision.ts, `buildPacket`),
 * and the supervisor returns one RUBRIC line with a mark per criterion. The parser checks the
 * line strictly and the criterion marks must add up to the MARK line, so a slip in either is
 * caught. The breakdown is shown on import and is not stored: the stored result is the mark,
 * which is what the gate (packages/mastery gate.ts) and the schedule read.
 */
import { SUPERVISION_MARK_MAX } from '@learnhub/mastery';

export const RUBRIC_CRITERIA = ['correctness', 'completeness', 'rigor', 'clarity'] as const;
export type RubricCriterion = (typeof RUBRIC_CRITERIA)[number];

export interface RubricBand {
  /** The lowest mark in the band. */
  min: number;
  text: string;
}

export interface RubricItem {
  id: RubricCriterion;
  label: string;
  max: number;
  /** The question the supervisor asks of the write-up. */
  asks: string;
  /** Highest band first; the last band starts at 0. */
  bands: readonly RubricBand[];
}

/** Criterion to its mark. */
export type RubricMarks = Readonly<Record<RubricCriterion, number>>;

/**
 * The rubric. Correctness carries the most: a wrong argument written well is still wrong.
 * The four maxima add up to `SUPERVISION_MARK_MAX`.
 */
export const WRITE_UP_RUBRIC: readonly RubricItem[] = [
  {
    id: 'correctness', label: 'Correctness', max: 8,
    asks: 'Is the mathematics right: every claim true, every calculation and final answer correct?',
    bands: [
      { min: 7, text: 'Everything is right, or one slip that does not affect the argument.' },
      { min: 4, text: 'The main line is right; an error spoils one part.' },
      { min: 1, text: 'Some right steps, but the central claim or answer is wrong.' },
      { min: 0, text: 'Nothing right towards the answer.' },
    ],
  },
  {
    id: 'completeness', label: 'Completeness', max: 4,
    asks: 'Is every part answered, every case covered (the edge cases, and the converse where asked)?',
    bands: [
      { min: 4, text: 'Every part and every case.' },
      { min: 2, text: 'A case or a minor part is missing.' },
      { min: 1, text: 'A whole part is missing.' },
      { min: 0, text: 'Most of the question is not attempted.' },
    ],
  },
  {
    id: 'rigor', label: 'Rigor', max: 4,
    asks: 'Is every step justified: hypotheses checked before a theorem is used, no step asserted that needs proof?',
    bands: [
      { min: 4, text: 'Every step follows from the one before, with its reason.' },
      { min: 2, text: 'One step asserted that needs an argument, or a hypothesis not checked.' },
      { min: 1, text: 'Several steps asserted; the argument has gaps.' },
      { min: 0, text: 'Claims without reasons.' },
    ],
  },
  {
    id: 'clarity', label: 'Clarity', max: 4,
    asks: 'Can an examiner follow it: notation defined, the structure signposted, the conclusion stated?',
    bands: [
      { min: 4, text: 'Clear structure, notation defined, conclusion stated.' },
      { min: 2, text: 'Followable, with effort: a symbol undefined or the order muddled.' },
      { min: 1, text: 'Hard to follow.' },
      { min: 0, text: 'Cannot be followed.' },
    ],
  },
];

export const RUBRIC_FIELD = 'RUBRIC';

/** The sum of the criterion marks. */
export function rubricTotal(m: RubricMarks): number {
  return RUBRIC_CRITERIA.reduce((a, c) => a + m[c], 0);
}

/** The band a criterion mark falls in. Throws on a mark outside 0 to the criterion's maximum. */
export function rubricBand(id: RubricCriterion, mark: number): RubricBand {
  const item = WRITE_UP_RUBRIC.find((r) => r.id === id) as RubricItem;
  if (!Number.isInteger(mark) || mark < 0 || mark > item.max) throw new Error(`${id}: mark must be a whole number from 0 to ${item.max}: ${mark}`);
  return item.bands.find((b) => mark >= b.min) as RubricBand;
}

/** The rubric as lines for the copied block. */
export function rubricLines(): string[] {
  return [
    `Mark the write-up out of ${SUPERVISION_MARK_MAX} in four parts, then add them up for MARK:`,
    ...WRITE_UP_RUBRIC.flatMap((r) => [
      `- ${r.label}, out of ${r.max}: ${r.asks}`,
      ...r.bands.map((b, i) => {
        const top = i === 0 ? r.max : (r.bands[i - 1] as RubricBand).min - 1;
        return `  ${b.min === top ? String(b.min) : `${b.min} to ${top}`}: ${b.text}`;
      }),
    ]),
  ];
}

/** The RUBRIC line of the result template, with the marks to fill in shown in angle brackets. */
export function rubricTemplate(): string {
  return `${RUBRIC_FIELD}: ${WRITE_UP_RUBRIC.map((r) => `${r.id} <0 to ${r.max}>/${r.max}`).join(', ')}`;
}

/** The value of a RUBRIC line for the marks: "correctness 6/8, completeness 4/4, rigor 2/4, clarity 3/4". */
export function formatRubric(m: RubricMarks): string {
  return WRITE_UP_RUBRIC.map((r) => `${r.id} ${m[r.id]}/${r.max}`).join(', ');
}

export type RubricParse = { ok: true; value: RubricMarks } | { ok: false; error: string };

const PART = /^([a-z]+)\s+(\d{1,3})\s*\/\s*(\d{1,3})$/i;

/**
 * Reads the value of a RUBRIC line, strictly: each criterion exactly once, in any order,
 * each a whole number out of its own maximum. Parts are separated by commas, semicolons, or
 * (a wrapped line) a space. Never throws.
 */
export function parseRubric(text: string): RubricParse {
  const fail = (error: string): RubricParse => ({ ok: false, error });
  // A terminal may wrap the line where a comma was dropped, so a new part may also start at a space.
  const parts = text.split(/[,;]|\s+(?=[A-Za-z]+\s+\d)/).map((s) => s.trim()).filter((s) => s !== '');
  const out: Partial<Record<RubricCriterion, number>> = {};
  for (const part of parts) {
    const m = PART.exec(part);
    if (m === null) return fail(`RUBRIC should read like ${formatRubric({ correctness: 6, completeness: 4, rigor: 2, clarity: 3 })}, but has "${part.slice(0, 40)}".`);
    const id = (m[1] as string).toLowerCase();
    const item = WRITE_UP_RUBRIC.find((r) => r.id === id);
    if (item === undefined) return fail(`RUBRIC has "${id}", which is not one of ${RUBRIC_CRITERIA.join(', ')}.`);
    if (out[item.id] !== undefined) return fail(`RUBRIC lists ${item.id} twice.`);
    if (Number(m[3]) !== item.max) return fail(`RUBRIC: ${item.id} is out of ${item.max}, not ${m[3]}.`);
    const mark = Number(m[2]);
    if (mark > item.max) return fail(`RUBRIC: ${item.id} is ${mark}/${item.max}, more than the most possible.`);
    out[item.id] = mark;
  }
  const missing = RUBRIC_CRITERIA.filter((c) => out[c] === undefined);
  if (missing.length > 0) return fail(`RUBRIC is missing ${missing.join(', ')}.`);
  return { ok: true, value: out as RubricMarks };
}

/** One sentence for the import message: each criterion's mark, then the weakest criterion by share. */
export function rubricSummary(m: RubricMarks): string {
  const parts = WRITE_UP_RUBRIC.map((r) => `${r.label.toLowerCase()} ${m[r.id]} of ${r.max}`);
  const weakest = [...WRITE_UP_RUBRIC].sort((a, b) => m[a.id] / a.max - m[b.id] / b.max)[0] as RubricItem;
  const full = WRITE_UP_RUBRIC.every((r) => m[r.id] === r.max);
  return `By the rubric: ${parts.join(', ')}.${full ? '' : ` Work on ${weakest.label.toLowerCase()} first: ${rubricBand(weakest.id, m[weakest.id]).text}`}`;
}
