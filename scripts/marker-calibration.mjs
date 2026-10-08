// The proof marker's calibration harness (rule 7); see mastery/MARKER-CALIBRATION.md.
//
//   node scripts/marker-calibration.mjs packets [--out DIR]
//       Writes each case of scripts/calibration/cases.json as a supervision block, DIR/<case id>.txt
//       (default scripts/calibration/packets, not committed). Same cases, same blocks.
//   node scripts/marker-calibration.mjs collect --kind ai|human --name NAME [--date YYYY-MM-DD] FILE...
//       Reads the result blocks the marker printed (one or more per file) and prints a results file.
//   node scripts/marker-calibration.mjs from-progress --name NAME [--date YYYY-MM-DD] PROGRESS.json
//       Prints the AI marks of real supervision attempts in an exported progress file, as results.
//   node scripts/marker-calibration.mjs score RESULTS.json
//       Scores one marker against the cases: exits 1 unless it is calibrated.
//   node scripts/marker-calibration.mjs compare A.json B.json
//       Compares two markers on the scripts both marked: exits 1 unless they agree.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  HUMAN_AGREEMENT, HUMAN_MEAN_DIFF, PASS_MARK, RESULTS_FORMAT, buildCalibrationPacket, collectMarks, compareMarkers, marksFromProgress,
  scoreAgainstCases, validateCases, validateFrame, validateResults,
} from './lib/calibration.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'scripts', 'calibration');
const read = (p) => JSON.parse(readFileSync(p, 'utf8'));

function fail(msg) {
  process.stderr.write(`${msg}\n`);
  process.exit(2);
}

function options(args) {
  const o = { files: [] };
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) o[args[i].slice(2)] = args[++i];
    else o.files.push(args[i]);
  }
  return o;
}

function load() {
  const frame = read(path.join(DIR, 'frame.json'));
  const cases = read(path.join(DIR, 'cases.json'));
  const errors = [...validateFrame(frame), ...validateCases(cases, frame)];
  if (errors.length > 0) fail(errors.join('\n'));
  return { frame, cases: cases.cases };
}

function results(file) {
  const r = read(file);
  const errors = validateResults(r);
  if (errors.length > 0) fail(`${file}:\n${errors.join('\n')}`);
  return r;
}

const pct = (x) => (x === null ? 'n/a' : `${Math.round(x * 100)}%`);
const num = (x) => (x === null ? 'n/a' : x.toFixed(1));
const today = () => new Date().toISOString().slice(0, 10);

const [cmd, ...rest] = process.argv.slice(2);
const o = options(rest);

if (cmd === 'packets') {
  const { frame, cases } = load();
  const out = path.resolve(o.out ?? path.join(DIR, 'packets'));
  mkdirSync(out, { recursive: true });
  for (const c of cases) writeFileSync(path.join(out, `${c.id}.txt`), `${buildCalibrationPacket(c, frame)}\n`);
  process.stdout.write(`${cases.length} blocks in ${out}\n`);
} else if (cmd === 'collect') {
  const { cases } = load();
  if ((o.kind !== 'ai' && o.kind !== 'human') || o.name === undefined || o.files.length === 0) fail('collect --kind ai|human --name NAME FILE...');
  // A file may hold several blocks: split before each header.
  const blocks = o.files.flatMap((f) => readFileSync(f, 'utf8').split(/(?=LEARNHUB RESULT v1)/).filter((b) => b.includes('LEARNHUB RESULT v1')));
  const { marks, errors } = collectMarks(cases, blocks);
  if (errors.length > 0) process.stderr.write(`${errors.join('\n')}\n`);
  process.stdout.write(`${JSON.stringify({ format: RESULTS_FORMAT, marker: { kind: o.kind, name: o.name, date: o.date ?? today() }, marks }, null, 2)}\n`);
} else if (cmd === 'from-progress') {
  if (o.name === undefined || o.files.length !== 1) fail('from-progress --name NAME PROGRESS.json');
  const marks = marksFromProgress(read(o.files[0]));
  process.stdout.write(`${JSON.stringify({ format: RESULTS_FORMAT, marker: { kind: 'ai', name: o.name, date: o.date ?? today() }, marks }, null, 2)}\n`);
} else if (cmd === 'score') {
  const { cases } = load();
  if (o.files.length !== 1) fail('score RESULTS.json');
  const s = scoreAgainstCases(cases, results(o.files[0]));
  const lines = [
    `Cases marked: ${s.n} of ${cases.length}`,
    `Agreement with the expected band (${PASS_MARK} of 20 splits high from low): ${pct(s.agreement)}`,
    `Mean mark, model answers: ${num(s.meanHigh)}; flawed copies: ${num(s.meanLow)}; mean gap per pair: ${num(s.gap)}`,
    ...s.misses.map((m) => `Out of band: ${m.case} expected ${m.expect}, marked ${m.mark}`),
    ...(s.missing.length > 0 ? [`Not marked: ${s.missing.join(', ')}`] : []),
    s.calibrated ? 'Calibrated.' : 'Not calibrated: adjust the marker instructions and run again.',
  ];
  process.stdout.write(`${lines.join('\n')}\n`);
  process.exit(s.calibrated ? 0 : 1);
} else if (cmd === 'compare') {
  if (o.files.length !== 2) fail('compare A.json B.json');
  const c = compareMarkers(results(o.files[0]), results(o.files[1]));
  const lines = [
    `Scripts marked by both: ${c.n}`,
    `Same pass or fail: ${pct(c.agreement)} (needs ${pct(HUMAN_AGREEMENT)})`,
    `Mean difference (first less second): ${num(c.meanDifference)} (needs within ${HUMAN_MEAN_DIFF}); mean absolute difference: ${num(c.meanAbsDifference)}`,
    c.agree ? 'The markers agree.' : 'The markers do not agree yet.',
  ];
  process.stdout.write(`${lines.join('\n')}\n`);
  process.exit(c.agree ? 0 : 1);
} else {
  fail('usage: node scripts/marker-calibration.mjs packets|collect|from-progress|score|compare (see the file comment)');
}
