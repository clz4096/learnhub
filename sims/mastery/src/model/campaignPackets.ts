/**
 * The copy-and-paste blocks for the campaign, in the supervision style (see supervision.ts):
 * a past paper sent for marking, and a mock interview. Plain text with the instructions
 * inside, so the same block works pasted into any Claude Code session.
 *
 * Neither is a supervision packet kind. Those bind a result to a Cambridge problem by a
 * nonce held in the progress document, whose schema this campaign does not change; a paper
 * or interview is not a problem in the catalog. So the marks the session prints are typed
 * into the campaign's own fields.
 */
import type { RegistryPaper } from '@learnhub/content/admissions';
import {
  INTERVIEW_MAX, INTERVIEW_PASS, ROUTE_NAMES, SHAPE_NAMES, STEP_COUNTED, STEP_MARKS_PER_QUESTION, STEP_QUESTIONS,
  collegeOf, paperLink, paperName, sourceUrls,
  type Campaign, type InterviewShape, type Sitting,
} from './campaign';

export const PAPER_HEADER = 'LEARNHUB PAPER MARKING v1';
export const PAPER_END = 'END LEARNHUB PAPER MARKING';
export const INTERVIEW_HEADER = 'LEARNHUB MOCK INTERVIEW v1';
export const INTERVIEW_END = 'END LEARNHUB MOCK INTERVIEW';

const stamp = (ms: number): string => `${new Date(ms).toISOString().slice(0, 16).replace('T', ' ')} UTC`;
const link = (x: { url: string; file?: string }): string => (x.file === undefined ? x.url : `${x.url} (the file ${x.file} inside the zip)`);

/** The block "Copy for supervision" copies for a finished STEP or A level sitting. */
export function paperPacket(paper: RegistryPaper, s: Sitting): string {
  if (paper.exam === 'TMUA') throw new Error('paperPacket: TMUA papers are checked by the app');
  const qp = paperLink(paper);
  const ms = sourceUrls(paper, 'mark_scheme');
  const took = s.finishedAt === null ? null : Math.round((s.finishedAt - s.startedAt) / 60_000);
  const step = paper.exam === 'STEP';
  const marking = step
    ? `Mark every question I attempted out of ${STEP_MARKS_PER_QUESTION}, against the official mark scheme. Every attempt is marked and the best ${STEP_COUNTED} count, so the paper is out of ${STEP_COUNTED * STEP_MARKS_PER_QUESTION}.`
    : `Mark each question against the official mark scheme, as a ${paper.board} examiner would, and total the paper out of ${paper.total_marks}.`;
  const result = step
    ? [...Array.from({ length: STEP_QUESTIONS }, (_, i) => `Q${i + 1}: <mark out of ${STEP_MARKS_PER_QUESTION}, or - if not attempted>`), `BEST ${STEP_COUNTED}: <total out of ${STEP_COUNTED * STEP_MARKS_PER_QUESTION}>`]
    : [`TOTAL: <whole number from 0 to ${paper.total_marks}>/${paper.total_marks}`];
  return [
    PAPER_HEADER,
    `PAPER: ${paper.id}`,
    `TITLE: ${paperName(paper)}${paper.code === undefined ? '' : ` (${paper.board} ${paper.code})`}`,
    `QUESTION PAPER: ${qp === null ? 'not published' : link(qp)}`,
    ...ms.map((m) => `MARK SCHEME (for the supervisor only): ${link(m)}`),
    `TIME ALLOWED: ${paper.duration_minutes} minutes`,
    `SAT: started ${stamp(s.startedAt)}${took === null ? '' : `, finished after ${took} minutes`}`,
    `RULES: ${paper.rules}`,
    '',
    '--- MY SCRIPT ---',
    'My handwritten answers are attached as photos, in question order.',
    '',
    '--- INSTRUCTIONS FOR THE SUPERVISOR ---',
    '1. You are my examiner for this past paper, sat timed under exam conditions.',
    `2. ${marking}`,
    '3. Credit correct reasoning and clear writing, not only final answers. Do not give full solutions to questions I did not attempt.',
    '4. For each question I attempted, say in one line where the marks were lost.',
    '5. Then print the result block below inside a code block, filled in, and nothing after it.',
    '',
    '--- RESULT FORMAT ---',
    'LEARNHUB PAPER RESULT',
    `PAPER: ${paper.id}`,
    ...result,
    'END LEARNHUB PAPER RESULT',
    '',
    PAPER_END,
  ].join('\n');
}

const SHAPE_SETUP: Readonly<Record<InterviewShape, (route: Campaign['route']) => string>> = {
  'pre-reading': (route) => `Set one unseen ${route === 'cs' ? 'computer science' : 'mathematics'} problem in 4 parts, with a short pre-reading passage I read first (about 5 minutes), in the style of CSAT section B and the sample interview questions published by Downing and Trinity. About 40 minutes in all.`,
  induction: () => 'Set three unseen mathematics questions that each need induction, in the style of the sample interview questions published by Downing and Trinity. About 35 minutes in all.',
};

/** The block "Copy interview packet" copies: a mock interview in the chosen college's real format. */
export function interviewPacket(c: Campaign, shape: InterviewShape, copiedAt: number): string {
  const college = collegeOf(c.college);
  const f = college?.formats[c.route];
  const test = f !== undefined && !/^none/i.test(f.test);
  return [
    INTERVIEW_HEADER,
    `COURSE: ${ROUTE_NAMES[c.route]}`,
    `COLLEGE: ${college?.name ?? 'not chosen yet'}`,
    `FORMAT: ${f === undefined ? 'one or two problem-solving interviews, 35 to 60 minutes in total' : `${f.interviews}${f.verified ? '' : ' (unverified)'}`}`,
    `TEST AT INTERVIEW: ${f?.test ?? 'none'}`,
    'MODE: online, as by Zoom',
    `THIS INTERVIEW: ${SHAPE_NAMES[shape]}`,
    `COPIED: ${stamp(copiedAt)}`,
    '',
    '--- WHAT TO SET ---',
    ...(test ? ['Start with the short task the college sets on the day (about 10 minutes, on my own), then discuss it in the interview.'] : []),
    SHAPE_SETUP[shape](c.route),
    '',
    '--- INSTRUCTIONS FOR THE INTERVIEWER ---',
    `1. You are a Cambridge interviewer for ${ROUTE_NAMES[c.route]}${college === undefined ? '' : ` at ${college.name}`}. Run a mock interview in the format above. This is practice for a real admissions interview, not affiliated with the University.`,
    '2. Never give a full solution, even if I ask. Ask one question at a time, then wait for my answer.',
    '3. Ask me to think aloud. Prompt me to simplify, try small cases, and keep going when I get stuck; that is expected.',
    '4. Where I am stuck, give the smallest hint that unblocks me, as an interviewer would, and note that you did.',
    `5. At the end, mark the interview out of ${INTERVIEW_MAX} as a supervision is marked (${INTERVIEW_PASS}/${INTERVIEW_MAX} is a pass): credit thinking aloud, use of hints, and progress, not only final answers.`,
    '6. Then print the result block below inside a code block, filled in, and nothing after it.',
    '',
    '--- RESULT FORMAT ---',
    'LEARNHUB INTERVIEW RESULT',
    `MARK: <whole number from 0 to ${INTERVIEW_MAX}>/${INTERVIEW_MAX}`,
    'NOTES: <two or three sentences on thinking aloud and problem solving>',
    'END LEARNHUB INTERVIEW RESULT',
    '',
    INTERVIEW_END,
  ].join('\n');
}
