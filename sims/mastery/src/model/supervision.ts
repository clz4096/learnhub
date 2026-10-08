/**
 * Supervision by copy and paste (mastery/DESIGN-CAMBRIDGE-CONTENT.md, build step 3): the
 * block the learner copies into a Claude Code session, and the result block the session
 * prints back. Both are plain text, so the same flow works on the Mac and on a phone, in
 * any browser, with no API keys or model calls in the site.
 *
 * The result format, and why it has no checksum. A checksum the supervisor computes (CRC32,
 * a hash, even a digit sum over the text) is arithmetic a language model does unreliably
 * in its head, so it would reject good results. Instead a result is accepted only when:
 * - it starts with the header line and ends with an end line that repeats the nonce, so a
 *   paste cut off at either end is caught;
 * - every field is present exactly once and well formed (a strict parser, no guessing), so
 *   a paste missing lines in the middle is caught;
 * - it echoes the problem id and the nonce printed in the copied block, so it is tied to
 *   one copy of one problem: a result for another problem, another copy, or one already
 *   imported is refused.
 * Long fields may be wrapped onto following lines, as a terminal copy can do; a wrapped
 * line joins the field above it.
 *
 * The learner never marks their own work: the only way a mark enters the app is a result
 * block that echoes a nonce the app made. That binds a result to a copy; it is not a
 * defence against a learner who types a fake block, which for one learner studying for
 * themselves is out of scope.
 */
import {
  answerText, catalogProblem, citationText, FIRST_PROOF_TOPIC, isProofWriteUp, MARK, plain,
  type AnswerSpec, type CambridgeProblem, type Rich, type TopicContent,
} from '@learnhub/content';
import {
  MAX_SUMMARY, MAX_WEAK_POINT, MAX_WRITE_UP, NONCE_ALPHABET, NONCE_LENGTH, NONCE_RE, PROBLEM_KEY_RE, SUPERVISION_MARK_MAX,
  SUPERVISION_MAX_REDOS, SUPERVISION_PASS_MARK, SUPERVISION_WEAK_POINTS,
  type Progress, type SupervisionResult,
} from '@learnhub/mastery';
import { contentStore } from './content';
import { titleOf, topicOf } from './courses';
import { RUBRIC_FIELD, formatRubric, parseRubric, rubricLines, rubricTemplate, rubricTotal, type RubricMarks } from './rubric';

export const PACKET_HEADER = 'LEARNHUB SUPERVISION v1';
export const PACKET_END = 'END LEARNHUB SUPERVISION';
export const RESULT_HEADER = 'LEARNHUB RESULT v1';
export const RESULT_END = 'END LEARNHUB RESULT';

/** "prob.event-spaces/q4-definitions": the topic id and the problem's id within the topic. */
export const problemKey = (topicId: string, problemId: string): string => `${topicId}/${problemId}`;

export interface FoundProblem {
  key: string;
  topic: TopicContent;
  problem: CambridgeProblem;
}

function splitKey(key: string): [topicId: string, problemId: string] | undefined {
  if (!PROBLEM_KEY_RE.test(key)) return undefined;
  const slash = key.indexOf('/');
  return [key.slice(0, slash), key.slice(slash + 1)];
}

/** Whether a key names a Cambridge problem in the app, from the catalog: no topic is downloaded. */
export function problemExists(key: string): boolean {
  const k = splitKey(key);
  return k !== undefined && catalogProblem(k[0], k[1]) !== undefined;
}

/** A problem's title as plain text, from the catalog, or undefined when there is no such problem. */
export function catalogTitle(key: string): string | undefined {
  const k = splitKey(key);
  return k === undefined ? undefined : catalogProblem(k[0], k[1])?.title;
}

/**
 * The Cambridge problem a key names, from its topic's downloaded content; undefined when
 * there is no such problem (a typo, or a problem since removed) or its topic is not
 * downloaded yet. Copying happens on a lesson or problem page, which has downloaded it.
 */
export function findProblem(key: string): FoundProblem | undefined {
  const k = splitKey(key);
  if (k === undefined) return undefined;
  const topic = contentStore.loaded(k[0]);
  const problem = topic?.cambridge.find((p) => p.id === k[1]);
  return topic === undefined || problem === undefined ? undefined : { key, topic, problem };
}

/** A fresh nonce. `random` returns integers in [0, n); the default is the browser's crypto. */
export function newNonce(random: (n: number) => number = cryptoRandom): string {
  let s = '';
  for (let i = 0; i < NONCE_LENGTH; i++) s += NONCE_ALPHABET[random(NONCE_ALPHABET.length)];
  return s;
}

function cryptoRandom(n: number): number {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c?.getRandomValues !== undefined) {
    // Rejection sampling, so every letter is equally likely.
    const limit = Math.floor(0x1_0000_0000 / n) * n;
    const buf = new Uint32Array(1);
    for (;;) {
      c.getRandomValues(buf);
      if ((buf[0] as number) < limit) return (buf[0] as number) % n;
    }
  }
  return Math.floor(Math.random() * n);
}

/** Rich text as plain text with its mathematics as LaTeX between dollar signs, the way the supervisor reads it best. */
export function richToText(r: Rich): string {
  return r.map((s) => {
    if (s.kind === 'math') return s.display === true ? `$$${s.text}$$` : `$${s.text}$`;
    return s.text.replace(MARK, (_m, _id: string, shown: string) => shown);
  }).join('');
}

const WRITE_UP_WANTED: Readonly<Record<string, string>> = {
  proof: 'a proof',
  explanation: 'an explanation',
  sketch: 'a sketch (described in words, or drawn on paper and attached as a photo)',
};

/** The parts of an auto-checked problem's answer that are in its spec, not its prompt: choice options, a table. */
function answerShape(a: AnswerSpec): string[] {
  if (a.kind === 'choice') return ['Options:', ...a.options.map((o) => `- ${o.id}: ${richToText(o.label)}`)];
  if (a.kind === 'table') {
    const head = a.columns.map(richToText).join(' | ');
    const rows = a.rows.map((r) => r.map((c) => (c === null ? '(blank to fill in)' : richToText(c))).join(' | '));
    return ['Table to fill in:', head, ...rows];
  }
  return [];
}

const stamp = (ms: number): string => `${new Date(ms).toISOString().slice(0, 16).replace('T', ' ')} UTC`;
const day = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/**
 * One line per recent result on the topic: lessons, reviews, quizzes, Cambridge problems
 * answered in the app, and supervision marks with their weak points. Single drills and gym
 * items are left out: the lesson or review they belong to says how the run went.
 */
export function recentAttempts(p: Readonly<Progress>, topicId: string, limit = 8): string[] {
  const lines: { at: number; text: string }[] = [];
  for (const h of p.history) {
    if (h.topicId !== topicId || h.kind === 'supervision' || h.kind === 'placement' || h.kind === 'drill' || h.kind === 'gym') continue;
    const what = h.kind === 'lesson' ? (h.correct ? 'lesson passed' : 'lesson not passed yet')
      : h.kind === 'cambridge' ? `Cambridge problem ${h.item?.id ?? ''} answered ${h.correct ? 'right' : 'wrong'}${h.item === undefined ? '' : ` (attempt ${h.item.attempt})`}`
        : `${h.kind} ${h.correct ? 'passed' : 'missed'}`;
    lines.push({ at: h.at, text: `${day(h.at)} ${what}` });
  }
  for (const a of p.supervision) {
    if (a.result === null || a.importedAt === null || !a.problem.startsWith(`${topicId}/`)) continue;
    lines.push({
      at: a.importedAt,
      text: `${day(a.importedAt)} supervision of ${a.problem}: ${a.result.mark}/${SUPERVISION_MARK_MAX}. Weak points: ${a.result.weakPoints.join('; ')}`,
    });
  }
  return lines.sort((x, y) => x.at - y.at).slice(-limit).map((l) => l.text);
}

/** For an auto-checked problem answered wrong: what the learner typed, and the app's answer. */
export interface CheckedAnswer {
  given: string;
}

export interface PacketInput {
  key: string;
  nonce: string;
  /** The learner's write-up, or their working for an auto-checked problem. */
  writeUp: string;
  copiedAt: number;
  progress: Readonly<Progress>;
  /** Set for an auto-checked problem the app marked wrong. */
  checked?: CheckedAnswer;
}

/**
 * What any proof needs (proof gate audit, 2026-10-08): the four points a learner new to
 * proof misses, shown above every problem whose answer is a proof and printed in its
 * supervision block, so the learner writes to them and the supervisor marks against them.
 */
export const PROOF_CHECKLIST: readonly string[] = [
  'State the general claim you are proving.',
  'Argue with letters, not examples: an example checks one case, a proof covers every case.',
  'Check every condition the question sets, such as distinct, whole number, or positive.',
  'End by stating what you have proved.',
];

/** The supervision instructions, adapted from the Meridian supervisor prompt. Shared with `.claude/commands/supervise.md`. */
export const SUPERVISOR_RULES: readonly string[] = [
  'You are my Cambridge supervisor for this one problem. (A supervision is a small weekly class, often one to one, where a tutor goes through your written work with you.)',
  'Never give me a full solution, at any point, even if I ask. Do not quote the official solution.',
  'Read the problem and my write-up, and any photos of handwritten work I attach. Then question me one step at a time: why is this step valid, what would break if a condition changed, is there a faster route? Ask one question, then wait for my answer.',
  'Where I am stuck or a step is missing, give the smallest hint that unblocks me, then let me continue.',
  'Use plain English. If you use a Cambridge or UK term (for example Tripos, example sheet, first-class), define it in a few words the first time.',
  `When I say I am done, or after about 30 minutes, mark my final work out of ${SUPERVISION_MARK_MAX} as a Cambridge examiner marks a written answer: credit correct reasoning and clear writing, not only the final line. Say in one sentence why that mark. A mark below ${SUPERVISION_PASS_MARK} means the topic comes back for review sooner.`,
  `If the mark is below ${SUPERVISION_PASS_MARK} and the main shortfall is an earlier skill rather than this topic (for example, the algebra is right but the proof writing is not), put that skill's topic id from the gap list on the GAP line. The app then does not count the mark against this topic, holds back the redo of this problem until that topic is mastered, and recommends it next. When this topic's own work is weak, or the mark is ${SUPERVISION_PASS_MARK} or more, write GAP: none.`,
  'Then print the result block below inside a code block, filled in, and nothing after it. Keep every field on one line. Copy PROBLEM and NONCE exactly. For REDO use only ids from the redo list, up to 3, separated by commas, or the word none. For GAP use only an id from the gap list, or the word none.',
];

/** The instructions a proof adds: mark against what a proof needs. */
export const PROOF_RULE = 'This answer is a proof. Mark it against what a proof needs, below: each point missing costs marks under rigor, completeness, or clarity, however right the algebra.';

/**
 * The topics a GAP may name for a problem, in order: the first proof lesson for a proof (unless
 * the problem is in it), the topic's prerequisites in the graph, then the later topics the
 * problem says it needs (`ProblemUses.needs`). Never the topic itself.
 */
export function gapCandidates(topicId: string, problem: CambridgeProblem): string[] {
  const out = [
    ...(isProofWriteUp(problem) ? [FIRST_PROOF_TOPIC] : []),
    ...(topicOf(topicId)?.prereqs ?? []),
    ...(problem.uses?.needs ?? []),
  ];
  return [...new Set(out)].filter((id) => id !== topicId);
}

/**
 * The result block the supervisor must print, with the fields to fill in shown in angle
 * brackets. `rubric`: a written answer, marked with the write-up rubric (rubric.ts), so the
 * block has a RUBRIC line under MARK.
 */
export function resultTemplate(key: string, nonce: string, rubric = false): string {
  return [
    RESULT_HEADER,
    `PROBLEM: ${key}`,
    `NONCE: ${nonce}`,
    `MARK: <whole number from 0 to ${SUPERVISION_MARK_MAX}>/${SUPERVISION_MARK_MAX}`,
    ...(rubric ? [rubricTemplate()] : []),
    'WEAK 1: <my weakest point, one line>',
    'WEAK 2: <my second weakest point, one line>',
    'WEAK 3: <my third weakest point, one line>',
    `REDO: <up to ${SUPERVISION_MAX_REDOS} problem ids from the redo list, separated by commas, or none>`,
    `GAP: <one topic id from the gap list when the mark is below ${SUPERVISION_PASS_MARK} because of an earlier skill, or none>`,
    'SUMMARY: <one or two sentences on the work as a whole>',
    `${RESULT_END} ${nonce}`,
  ].join('\n');
}

/** The block "Copy for supervision" copies. */
export function buildPacket(input: PacketInput): string {
  const found = findProblem(input.key);
  if (found === undefined) throw new Error(`buildPacket: no downloaded Cambridge problem ${input.key}`);
  const { topic, problem } = found;
  const topicId = topic.topicId;
  const head = [
    PACKET_HEADER,
    `PROBLEM: ${input.key}`,
    `NONCE: ${input.nonce}`,
    `SOURCE: ${citationText(problem.source)}`,
    `TOPIC: ${titleOf(topicId)} (${topicId})`,
  ];
  if (problem.mode === 'supervision') {
    head.push(`ANSWER WANTED: ${WRITE_UP_WANTED[problem.writeUp] ?? problem.writeUp}`);
    if (problem.official !== undefined) head.push(`OFFICIAL SOLUTION (for the supervisor only): ${citationText(problem.official)}`);
  } else {
    head.push('ANSWER WANTED: a value or expression, checked by the app. The app marked my answer wrong.');
    head.push(`CORRECT ANSWER (for the supervisor only, do not tell me): ${richToText(answerText(problem.instance.problem.answer))}`);
  }
  head.push(`COPIED: ${stamp(input.copiedAt)}`);

  const prompt = problem.mode === 'supervision' ? problem.prompt : problem.instance.problem.prompt;
  const statement = [richToText(problem.title), richToText(prompt)];
  if (problem.mode === 'auto') statement.push(...answerShape(problem.instance.problem.answer));

  const mine: string[] = [];
  if (input.checked !== undefined) mine.push(`My answer, marked wrong by the app: ${input.checked.given}`);
  const writeUp = input.writeUp.trim().slice(0, MAX_WRITE_UP);
  if (writeUp !== '') mine.push(input.checked !== undefined ? `My working:\n${writeUp}` : writeUp);
  else if (input.checked === undefined) mine.push('(Nothing typed. My handwritten work is attached as photos.)');

  const recent = recentAttempts(input.progress, topicId);
  const writeUpWanted = problem.mode === 'supervision';
  const proof = isProofWriteUp(problem);
  const redoList = topic.cambridge.map((c) => `${problemKey(topicId, c.id)}: ${plain(c.title)}`);
  const gapList = gapCandidates(topicId, problem).map((id) => `${id}: ${titleOf(id)}`);

  return [
    ...head,
    '',
    '--- PROBLEM ---',
    ...statement,
    '',
    '--- MY WRITE-UP ---',
    ...mine,
    '',
    '--- RECENT ATTEMPTS ON THIS TOPIC ---',
    ...(recent.length === 0 ? ['None yet.'] : recent),
    '',
    '--- REDO LIST (problems you may set me to redo) ---',
    ...redoList,
    '',
    '--- GAP LIST (earlier topics you may name on the GAP line) ---',
    ...(gapList.length === 0 ? ['None: write GAP: none.'] : gapList),
    '',
    '--- INSTRUCTIONS FOR THE SUPERVISOR ---',
    ...[...SUPERVISOR_RULES, ...(proof ? [PROOF_RULE] : [])].map((r, i) => `${i + 1}. ${r}`),
    '',
    ...(proof ? ['--- A PROOF NEEDS ---', ...PROOF_CHECKLIST.map((x, i) => `${i + 1}. ${x}`), ''] : []),
    ...(writeUpWanted ? ['--- MARKING RUBRIC ---', ...rubricLines(), ''] : []),
    '--- RESULT FORMAT ---',
    resultTemplate(input.key, input.nonce, writeUpWanted),
    '',
    `${PACKET_END} ${input.nonce}`,
  ].join('\n');
}

// ---------------------------------------------------------------- the result block

export interface ParsedResult {
  problem: string;
  nonce: string;
  result: SupervisionResult;
  /** The write-up rubric's marks, when the block has a RUBRIC line; they add up to the mark. Shown, not stored. */
  rubric?: RubricMarks;
}

export type ParseResult = { ok: true; value: ParsedResult } | { ok: false; error: string };

/** The result block for a parsed result, exactly as the supervisor prints it. */
export function formatResult(r: ParsedResult): string {
  return [
    RESULT_HEADER,
    `PROBLEM: ${r.problem}`,
    `NONCE: ${r.nonce}`,
    `MARK: ${r.result.mark}/${SUPERVISION_MARK_MAX}`,
    ...(r.rubric === undefined ? [] : [`${RUBRIC_FIELD}: ${formatRubric(r.rubric)}`]),
    ...r.result.weakPoints.map((w, i) => `WEAK ${i + 1}: ${w}`),
    `REDO: ${r.result.redo.length === 0 ? 'none' : r.result.redo.join(', ')}`,
    `GAP: ${r.result.gap ?? 'none'}`,
    `SUMMARY: ${r.result.summary}`,
    `${RESULT_END} ${r.nonce}`,
  ].join('\n');
}

const FIELDS = ['PROBLEM', 'NONCE', 'MARK', 'RUBRIC', 'WEAK 1', 'WEAK 2', 'WEAK 3', 'REDO', 'GAP', 'SUMMARY'] as const;
type Field = (typeof FIELDS)[number];
/** RUBRIC is printed for a written answer only, and a block copied before the rubric, or before GAP, has neither. */
const OPTIONAL: ReadonlySet<Field> = new Set(['RUBRIC', 'GAP']);
/** Fields a terminal may wrap onto several lines; the others are short and must be on one. */
const WRAPPABLE: ReadonlySet<Field> = new Set(['RUBRIC', 'WEAK 1', 'WEAK 2', 'WEAK 3', 'REDO', 'SUMMARY']);
const FIELD_LINE = /^([A-Z][A-Z0-9 ]*?)\s*:\s?(.*)$/;
const COPY_ALL = 'Copy the whole block, from its first line to its END line, and paste it again.';

const fail = (error: string): ParseResult => ({ ok: false, error });

/**
 * Reads a pasted result block. Text before the header and after the end line is ignored
 * (a code fence, a sentence from the supervisor). Never throws.
 */
export function parseResult(text: string): ParseResult {
  if (text.length > 50_000) return fail('That paste is far too long to be a result block. Copy only the result block.');
  const lines = text.replace(/\r\n?/g, '\n').split('\n').map((l) => l.trim());
  // The copied block holds the result template, so it is recognised first.
  if (lines.includes(PACKET_HEADER)) {
    return fail('This is the supervision block copied from here, not the result. Paste it into Claude, and paste back the result block Claude prints at the end.');
  }
  const start = lines.indexOf(RESULT_HEADER);
  if (start < 0) {
    if (text.trim() === '') return fail('Nothing was pasted. Paste the result block that Claude printed at the end of the supervision.');
    return fail(`The result must start with the line ${RESULT_HEADER}, and this paste does not have it. ${COPY_ALL}`);
  }
  if (lines.indexOf(RESULT_HEADER, start + 1) >= 0) return fail(`This paste has more than one result block. Paste one result at a time.`);
  const endAt = lines.findIndex((l, i) => i > start && l.startsWith(RESULT_END));
  if (endAt < 0) return fail(`The end line (${RESULT_END} and the nonce) is missing, so the paste was cut off. ${COPY_ALL}`);

  const values = new Map<Field, string>();
  let last: Field | null = null;
  for (const line of lines.slice(start + 1, endAt)) {
    if (line === '') continue;
    const m = FIELD_LINE.exec(line);
    const label = m?.[1];
    if (m !== null && label !== undefined && (FIELDS as readonly string[]).includes(label)) {
      const f = label as Field;
      if (values.has(f)) return fail(`${f} appears twice. ${COPY_ALL}`);
      values.set(f, (m[2] ?? '').trim());
      last = f;
      continue;
    }
    // An upper-case label that is not a field ("WEAK 4:", "GRADE:") is an error, not wrapped text.
    if (label !== undefined && /^[A-Z]{2,}(?: [0-9]+)?$/.test(label)) return fail(`${label} is not a field of the result block. ${COPY_ALL}`);
    // A long field wrapped by the terminal: the line joins the field above it.
    if (last === null || !WRAPPABLE.has(last)) return fail(`The line "${line.slice(0, 40)}" is not part of the result format. ${COPY_ALL}`);
    values.set(last, `${values.get(last) ?? ''} ${line}`.trim());
  }
  const missing = FIELDS.filter((f) => !values.has(f) && !OPTIONAL.has(f));
  if (missing.length > 0) {
    return fail(`The result is missing ${missing.join(', ')}, so part of it was not pasted. ${COPY_ALL}`);
  }
  const get = (f: Field): string => values.get(f) as string;

  const problem = get('PROBLEM');
  if (!PROBLEM_KEY_RE.test(problem)) return fail(`PROBLEM should be a problem id like prob.event-spaces/q4-definitions, but it is "${problem.slice(0, 60)}".`);
  const nonce = get('NONCE').toUpperCase();
  if (!NONCE_RE.test(nonce)) return fail(`NONCE should be the ${NONCE_LENGTH} letters and digits from the copied block, but it is "${get('NONCE').slice(0, 20)}".`);
  const end = lines[endAt] as string;
  if (end.slice(RESULT_END.length).trim().toUpperCase() !== nonce) {
    return fail(`The end line does not repeat the NONCE ${nonce}, so it belongs to a different result or the paste was mixed up. ${COPY_ALL}`);
  }

  const markText = get('MARK');
  const mm = /^(\d{1,3})\s*\/\s*(\d{1,3})$/.exec(markText);
  if (mm === null) return fail(`MARK should be a whole number out of ${SUPERVISION_MARK_MAX}, like 13/${SUPERVISION_MARK_MAX}, but it is "${markText.slice(0, 30)}".`);
  if (Number(mm[2]) !== SUPERVISION_MARK_MAX) return fail(`MARK must be out of ${SUPERVISION_MARK_MAX}, but it is out of ${mm[2]}.`);
  const mark = Number(mm[1]);
  if (mark > SUPERVISION_MARK_MAX) return fail(`MARK is ${mark}/${SUPERVISION_MARK_MAX}, which is more than the most possible. It must be from 0 to ${SUPERVISION_MARK_MAX}.`);

  let rubric: RubricMarks | undefined;
  const rubricText = values.get('RUBRIC');
  if (rubricText !== undefined) {
    const r = parseRubric(rubricText);
    if (!r.ok) return fail(`${r.error} Ask Claude to print the block again.`);
    if (rubricTotal(r.value) !== mark) {
      return fail(`The RUBRIC marks add up to ${rubricTotal(r.value)}, but MARK is ${mark}. Ask Claude to check the marks and print the block again.`);
    }
    rubric = r.value;
  }

  const weakPoints: string[] = [];
  for (let i = 1; i <= SUPERVISION_WEAK_POINTS; i++) {
    const w = get(`WEAK ${i}` as Field);
    if (w === '' || /^<.*>$/.test(w)) return fail(`WEAK ${i} is empty. The supervisor must name three weak points.`);
    if (w.length > MAX_WEAK_POINT) return fail(`WEAK ${i} is longer than ${MAX_WEAK_POINT} characters. Ask Claude to shorten it and print the block again.`);
    weakPoints.push(w);
  }

  const redoText = get('REDO');
  const redo: string[] = [];
  if (!/^none\.?$/i.test(redoText)) {
    const ids = redoText.split(/[,;\s]+/).filter((x) => x !== '');
    if (ids.length === 0) return fail('REDO is empty. It should list problem ids from the redo list, or say none.');
    if (ids.length > SUPERVISION_MAX_REDOS) return fail(`REDO lists ${ids.length} problems; at most ${SUPERVISION_MAX_REDOS} are allowed.`);
    for (const id of ids) {
      if (!problemExists(id)) return fail(`REDO lists "${id.slice(0, 60)}", which is not a problem in this app. Use ids from the redo list in the copied block.`);
      if (!redo.includes(id)) redo.push(id);
    }
  }

  // GAP: an earlier topic, by its graph id, behind a mark below the pass mark; none, or absent from an older block.
  const gapText = (values.get('GAP') ?? 'none').trim();
  let gap: string | undefined;
  if (!/^none\.?$/i.test(gapText)) {
    if (gapText === '' || /^<.*>$/.test(gapText)) return fail('GAP is empty. It should be a topic id from the gap list, or say none.');
    if (topicOf(gapText) === undefined) return fail(`GAP names "${gapText.slice(0, 60)}", which is not a topic in this app. Use an id from the gap list in the copied block, or none.`);
    if (gapText === problem.slice(0, problem.indexOf('/'))) return fail('GAP names the problem\'s own topic. GAP is for an earlier skill; for a shortfall in this topic, write GAP: none.');
    if (mark >= SUPERVISION_PASS_MARK) return fail(`GAP is only for a mark below ${SUPERVISION_PASS_MARK}. With ${mark}/${SUPERVISION_MARK_MAX}, write GAP: none.`);
    gap = gapText;
  }

  const summary = get('SUMMARY');
  if (summary === '' || /^<.*>$/.test(summary)) return fail('SUMMARY is empty.');
  if (summary.length > MAX_SUMMARY) return fail(`SUMMARY is longer than ${MAX_SUMMARY} characters. Ask Claude to shorten it and print the block again.`);

  const value: ParsedResult = { problem, nonce, result: gap === undefined ? { mark, weakPoints, redo, summary } : { mark, weakPoints, redo, summary, gap } };
  if (rubric !== undefined) value.rubric = rubric;
  return { ok: true, value };
}

/**
 * Checks a parsed result against the progress document: it must answer a copy made here,
 * of the expected problem when one is expected, and not be imported already.
 */
export function checkResultFor(p: Readonly<Progress>, r: ParsedResult, expected?: string): string | null {
  if (expected !== undefined && r.problem !== expected) {
    return `This result is for ${r.problem}, not for this problem (${expected}). Paste it on Today, or on that problem.`;
  }
  if (!problemExists(r.problem)) return `There is no problem ${r.problem} in this app.`;
  const a = p.supervision.find((x) => x.nonce === r.nonce);
  if (a === undefined) {
    return `No copy with NONCE ${r.nonce} was made in this browser. Results can only be pasted where the problem was copied; copy it again here and supervise that copy.`;
  }
  if (a.problem !== r.problem) return `The NONCE ${r.nonce} belongs to a copy of ${a.problem}, but the result says ${r.problem}. The result was mixed up; ask Claude to print it again.`;
  if (a.result !== null) return `This result was already imported${a.importedAt === null ? '' : ` on ${day(a.importedAt)}`}.`;
  return null;
}
