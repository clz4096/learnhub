// The proof marker's calibration harness (rule 7, mastery/HOW-A-TOPIC-WORKS.md; how to run it:
// mastery/MARKER-CALIBRATION.md). The marker is an AI supervision outside the app, so the harness
// is three plain pieces around it:
//
//   packets   each calibration case as a supervision block, reproducibly (the nonce is a hash of
//             the case id), built from frame.json: the app's own instructions, rubric, and problem
//             statements, written by the app's tests so the two cannot drift apart;
//   results   one format for marks from any marker, AI or human, on calibration cases or on real
//             supervision attempts (by nonce);
//   score     agreement with what each case expects (a model answer high, a flawed copy low), the
//             mean marks and the gap between them, and, between two markers, agreement on pass or
//             fail and the mean difference.
//
// Pure functions; the CLI (scripts/marker-calibration.mjs) does the reading and writing.
import { createHash } from 'node:crypto';

export const CASES_FORMAT = 'learnhub-marker-cases/1';
export const RESULTS_FORMAT = 'learnhub-marker-results/1';
export const FRAME_FORMAT = 'learnhub-marker-frame/1';

/** As the app: 20 marks a question, 14 passes (packages/mastery progress.ts). */
export const MARK_MAX = 20;
export const PASS_MARK = 14;

/** The app's nonce letters and length (packages/mastery progress.ts). */
export const NONCE_ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';
export const NONCE_LENGTH = 8;
const NONCE_RE = /^[ABCDEFGHJKMNPQRSTVWXYZ23456789]{8}$/;

export const PACKET_HEADER = 'LEARNHUB SUPERVISION v1';
export const PACKET_END = 'END LEARNHUB SUPERVISION';
export const RESULT_HEADER = 'LEARNHUB RESULT v1';
export const RESULT_END = 'END LEARNHUB RESULT';

/**
 * The thresholds a marker must meet (MARKER-CALIBRATION.md says why). On the cases: every model
 * answer at the pass mark or above and every flawed copy below it. Against a human: the same
 * pass or fail on at least `HUMAN_AGREEMENT` of the scripts, and a mean difference within
 * `HUMAN_MEAN_DIFF` marks.
 */
export const CASE_AGREEMENT = 1;
export const HUMAN_AGREEMENT = 0.8;
export const HUMAN_MEAN_DIFF = 2;

/** The rule a calibration block adds first: the write-up is final, so mark at once. */
export const CALIBRATION_RULE = 'Calibration run: this write-up is final and nobody will answer questions. Skip the questioning and the hints; mark the write-up as it stands, following the instructions below on marking, and print the result block.';

const CASE_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PROBLEM_KEY_RE = /^[a-z][a-z0-9]*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)+\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
const isObj = (x) => typeof x === 'object' && x !== null && !Array.isArray(x);
const isText = (x) => typeof x === 'string' && x.trim() !== '';

/** A case's nonce: the first bytes of SHA-256 of its id, as nonce letters. The same case always gets the same block. */
export function caseNonce(id) {
  const h = createHash('sha256').update(`learnhub-calibration:${id}`).digest();
  let s = '';
  for (let i = 0; i < NONCE_LENGTH; i++) s += NONCE_ALPHABET[h[i] % NONCE_ALPHABET.length];
  return s;
}

/**
 * The cases file's problems, or errors. A case: `id`; `problem` (a key in frame.json);
 * `expect`, "high" or "low"; `origin`, "official" (typed from the cited document) or
 * "reference" (written for the harness, checked by hand); `pair`, the id shared by a model
 * answer and its flawed copy; `flaw`, the one deliberate flaw, on a low case only; `writeUp`.
 */
export function validateCases(doc, frame) {
  const errors = [];
  if (!isObj(doc) || doc.format !== CASES_FORMAT) return [`cases: expected format ${CASES_FORMAT}`];
  if (!Array.isArray(doc.cases) || doc.cases.length === 0) return ['cases: expected a non-empty "cases" array'];
  const ids = new Set();
  const pairs = new Map();
  doc.cases.forEach((c, i) => {
    const at = `cases[${i}]`;
    if (!isObj(c)) { errors.push(`${at}: expected an object`); return; }
    if (typeof c.id !== 'string' || !CASE_ID_RE.test(c.id)) errors.push(`${at}.id: expected a kebab-case id`);
    else if (ids.has(c.id)) errors.push(`${at}.id: ${c.id} is used twice`);
    else ids.add(c.id);
    if (typeof c.problem !== 'string' || !PROBLEM_KEY_RE.test(c.problem)) errors.push(`${at}.problem: expected a problem key`);
    else if (frame !== undefined && !isObj(frame.problems?.[c.problem])) errors.push(`${at}.problem: ${c.problem} is not in frame.json (regenerate it)`);
    if (c.expect !== 'high' && c.expect !== 'low') errors.push(`${at}.expect: expected "high" or "low"`);
    if (c.origin !== 'official' && c.origin !== 'reference') errors.push(`${at}.origin: expected "official" or "reference"`);
    if (c.origin === 'official' && !isText(c.citation)) errors.push(`${at}.citation: an official write-up says where it was typed from`);
    if (!isText(c.pair)) errors.push(`${at}.pair: expected the id of its model and flawed pair`);
    if (c.expect === 'low' && !isText(c.flaw)) errors.push(`${at}.flaw: a low case names its one deliberate flaw`);
    if (c.expect === 'high' && c.flaw !== undefined) errors.push(`${at}.flaw: a high case has no flaw`);
    if (!isText(c.writeUp)) errors.push(`${at}.writeUp: expected the write-up`);
    if (isText(c.pair)) {
      const p = pairs.get(c.pair) ?? { high: 0, low: 0, problem: c.problem };
      if (c.expect === 'high' || c.expect === 'low') p[c.expect]++;
      if (p.problem !== c.problem) errors.push(`${at}.pair: ${c.pair} mixes two problems`);
      pairs.set(c.pair, p);
    }
  });
  for (const [id, p] of pairs) if (p.high !== 1 || p.low < 1) errors.push(`pair ${id}: expected one model answer (high) and at least one flawed copy (low)`);
  return errors;
}

/** The frame written by the app's tests: errors when it is not one. */
export function validateFrame(frame) {
  if (!isObj(frame) || frame.format !== FRAME_FORMAT) return [`frame: expected format ${FRAME_FORMAT}`];
  const lists = ['supervisorRules', 'proofChecklist', 'rubricLines'];
  const errors = lists.filter((k) => !Array.isArray(frame[k]) || !frame[k].every(isText)).map((k) => `frame.${k}: expected lines of text`);
  for (const k of ['proofRule', 'markSchemeRule', 'outlineRule', 'markerOnly', 'resultTemplate']) if (!isText(frame[k])) errors.push(`frame.${k}: expected text`);
  if (!isObj(frame.problems)) errors.push('frame.problems: expected an object');
  return errors;
}

/**
 * One case as a supervision block, laid out as the app's (sims/mastery model/supervision.ts,
 * `buildPacket`), with the calibration rule first and no learner history. The marker-only
 * section (a mark scheme, an outline) is included, as the app includes it.
 */
export function buildCalibrationPacket(c, frame) {
  const pr = frame.problems[c.problem];
  const nonce = caseNonce(c.id);
  const proof = pr.writeUp === 'proof';
  const rules = [CALIBRATION_RULE, ...frame.supervisorRules, ...(proof ? [frame.proofRule] : []),
    ...(pr.markerOnly.some((l) => l.startsWith('Official STEP mark scheme: ')) ? [frame.markSchemeRule] : []),
    ...(pr.markerOnly.includes('Outline of a model answer:') ? [frame.outlineRule] : [])];
  return [
    PACKET_HEADER,
    `PROBLEM: ${c.problem}`,
    `NONCE: ${nonce}`,
    `SOURCE: ${pr.source}`,
    `TOPIC: ${pr.topic}`,
    ...pr.officialLines,
    `CALIBRATION CASE: ${c.id}`,
    '',
    '--- PROBLEM ---',
    pr.title,
    pr.statement,
    '',
    '--- MY WRITE-UP ---',
    c.writeUp.trim(),
    '',
    '--- RECENT ATTEMPTS ON THIS TOPIC ---',
    'None: a calibration run.',
    '',
    '--- REDO LIST (problems you may set me to redo) ---',
    ...pr.redoList,
    '',
    '--- GAP LIST (earlier topics you may name on the GAP line) ---',
    ...(pr.gapList.length === 0 ? ['None: write GAP: none.'] : pr.gapList),
    '',
    '--- INSTRUCTIONS FOR THE SUPERVISOR ---',
    ...rules.map((r, i) => `${i + 1}. ${r}`),
    '',
    ...(pr.markerOnly.length > 0 ? [frame.markerOnly, ...pr.markerOnly, ''] : []),
    ...(proof ? ['--- A PROOF NEEDS ---', ...frame.proofChecklist.map((x, i) => `${i + 1}. ${x}`), ''] : []),
    '--- MARKING RUBRIC ---',
    ...frame.rubricLines,
    '',
    '--- RESULT FORMAT ---',
    frame.resultTemplate.replaceAll('{{PROBLEM}}', c.problem).replaceAll('{{NONCE}}', nonce),
    '',
    `${PACKET_END} ${nonce}`,
  ].join('\n');
}

/**
 * The problem, nonce, and mark of a pasted result block; null when the text holds none. Only
 * what scoring needs is read, but the block must be whole: its header, PROBLEM, NONCE, MARK out
 * of 20, and an end line repeating the nonce.
 */
export function readResultBlock(text) {
  const lines = String(text).replace(/\r\n?/g, '\n').split('\n').map((l) => l.trim());
  const start = lines.indexOf(RESULT_HEADER);
  if (start < 0) return null;
  const end = lines.findIndex((l, i) => i > start && l.startsWith(RESULT_END));
  if (end < 0) return null;
  const field = (name) => {
    const l = lines.slice(start + 1, end).find((x) => x.startsWith(`${name}:`));
    return l === undefined ? undefined : l.slice(name.length + 1).trim();
  };
  const problem = field('PROBLEM');
  const nonce = field('NONCE')?.toUpperCase();
  const m = /^(\d{1,2})\s*\/\s*20$/.exec(field('MARK') ?? '');
  if (problem === undefined || nonce === undefined || !NONCE_RE.test(nonce) || m === null) return null;
  const mark = Number(m[1]);
  if (mark > MARK_MAX || lines[end].slice(RESULT_END.length).trim().toUpperCase() !== nonce) return null;
  return { problem, nonce, mark };
}

/** Result blocks to marks on cases, by nonce. Errors for a block that names no case or a different problem. */
export function collectMarks(cases, blocks) {
  const byNonce = new Map(cases.map((c) => [caseNonce(c.id), c]));
  const marks = [];
  const errors = [];
  blocks.forEach((text, i) => {
    const r = readResultBlock(text);
    if (r === null) { errors.push(`block ${i + 1}: not a whole result block`); return; }
    const c = byNonce.get(r.nonce);
    if (c === undefined) { errors.push(`block ${i + 1}: NONCE ${r.nonce} is no calibration case`); return; }
    if (c.problem !== r.problem) { errors.push(`block ${i + 1}: case ${c.id} is ${c.problem}, but the block says ${r.problem}`); return; }
    if (marks.some((x) => x.case === c.id)) { errors.push(`block ${i + 1}: case ${c.id} is marked twice`); return; }
    marks.push({ case: c.id, mark: r.mark });
  });
  return { marks, errors };
}

/**
 * Marks from a progress export (the app's Export): each imported supervision result as a mark
 * on a real attempt, by nonce, for comparing with a person's marks of the same write-ups.
 */
export function marksFromProgress(progress) {
  const out = [];
  for (const a of Array.isArray(progress?.supervision) ? progress.supervision : []) {
    if (isObj(a) && isObj(a.result) && Number.isInteger(a.result.mark)) out.push({ nonce: a.nonce, problem: a.problem, mark: a.result.mark });
  }
  return out;
}

/**
 * A results file's problems, or errors. `marker`: `kind` "ai" or "human", `name` (who or
 * which instructions), `date` (YYYY-MM-DD). `marks`: each with a whole `mark` from 0 to 20
 * and either `case` (a calibration case id) or `nonce` (a real supervision attempt).
 */
export function validateResults(doc) {
  const errors = [];
  if (!isObj(doc) || doc.format !== RESULTS_FORMAT) return [`results: expected format ${RESULTS_FORMAT}`];
  const m = doc.marker;
  if (!isObj(m) || (m.kind !== 'ai' && m.kind !== 'human') || !isText(m.name) || typeof m.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(m.date)) {
    errors.push('results.marker: expected { kind: "ai" or "human", name, date: "YYYY-MM-DD" }');
  }
  if (!Array.isArray(doc.marks)) return [...errors, 'results.marks: expected an array'];
  const seen = new Set();
  doc.marks.forEach((x, i) => {
    const at = `results.marks[${i}]`;
    if (!isObj(x)) { errors.push(`${at}: expected an object`); return; }
    const id = x.case !== undefined ? `case:${x.case}` : x.nonce !== undefined ? `nonce:${x.nonce}` : null;
    if (id === null || (x.case !== undefined && x.nonce !== undefined)) errors.push(`${at}: expected one of "case" or "nonce"`);
    else if (x.nonce !== undefined && !NONCE_RE.test(x.nonce)) errors.push(`${at}.nonce: expected ${NONCE_LENGTH} nonce letters`);
    else if (seen.has(id)) errors.push(`${at}: ${id} is marked twice`);
    else seen.add(id);
    if (!Number.isInteger(x.mark) || x.mark < 0 || x.mark > MARK_MAX) errors.push(`${at}.mark: expected a whole number from 0 to ${MARK_MAX}`);
  });
  return errors;
}

const mean = (xs) => (xs.length === 0 ? null : xs.reduce((a, x) => a + x, 0) / xs.length);
const idOf = (x) => (x.case !== undefined ? `case:${x.case}` : `nonce:${x.nonce}`);

/**
 * One marker against the cases: `agreement`, the share of marked cases in their expected band
 * (high: `PASS_MARK` or more; low: below); the mean mark of each band; `gap`, the mean over
 * pairs of the model's mark less its flawed copies' mean; `misses`, the cases out of band;
 * `missing`, cases not marked. `calibrated` when every case is marked and agreement is
 * `CASE_AGREEMENT`.
 */
export function scoreAgainstCases(cases, results) {
  const markOf = new Map(results.marks.filter((x) => x.case !== undefined).map((x) => [x.case, x.mark]));
  const marked = cases.filter((c) => markOf.has(c.id));
  const inBand = (c) => (c.expect === 'high' ? markOf.get(c.id) >= PASS_MARK : markOf.get(c.id) < PASS_MARK);
  const gaps = [];
  for (const pair of new Set(cases.map((c) => c.pair))) {
    const model = cases.find((c) => c.pair === pair && c.expect === 'high');
    const flawed = cases.filter((c) => c.pair === pair && c.expect === 'low' && markOf.has(c.id));
    if (model !== undefined && markOf.has(model.id) && flawed.length > 0) gaps.push(markOf.get(model.id) - mean(flawed.map((c) => markOf.get(c.id))));
  }
  const agreement = marked.length === 0 ? null : marked.filter(inBand).length / marked.length;
  const missing = cases.filter((c) => !markOf.has(c.id)).map((c) => c.id);
  return {
    n: marked.length,
    agreement,
    meanHigh: mean(marked.filter((c) => c.expect === 'high').map((c) => markOf.get(c.id))),
    meanLow: mean(marked.filter((c) => c.expect === 'low').map((c) => markOf.get(c.id))),
    gap: mean(gaps),
    misses: marked.filter((c) => !inBand(c)).map((c) => ({ case: c.id, expect: c.expect, mark: markOf.get(c.id) })),
    missing,
    calibrated: missing.length === 0 && agreement !== null && agreement >= CASE_AGREEMENT,
  };
}

/**
 * Two markers on the scripts both marked (by case or nonce): `agreement` on pass or fail,
 * `meanDifference` (a less b: positive when a marks higher), `meanAbsDifference`, and
 * `agree` against `HUMAN_AGREEMENT` and `HUMAN_MEAN_DIFF`.
 */
export function compareMarkers(a, b) {
  const bOf = new Map(b.marks.map((x) => [idOf(x), x.mark]));
  const both = a.marks.filter((x) => bOf.has(idOf(x))).map((x) => [x.mark, bOf.get(idOf(x))]);
  if (both.length === 0) return { n: 0, agreement: null, meanDifference: null, meanAbsDifference: null, agree: false };
  const agreement = both.filter(([x, y]) => (x >= PASS_MARK) === (y >= PASS_MARK)).length / both.length;
  const meanDifference = mean(both.map(([x, y]) => x - y));
  return {
    n: both.length, agreement, meanDifference, meanAbsDifference: mean(both.map(([x, y]) => Math.abs(x - y))),
    agree: agreement >= HUMAN_AGREEMENT && Math.abs(meanDifference) <= HUMAN_MEAN_DIFF,
  };
}
