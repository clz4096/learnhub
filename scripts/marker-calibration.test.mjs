// node --test: the proof marker's calibration harness (rule 7, mastery/MARKER-CALIBRATION.md).
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  CALIBRATION_RULE, PACKET_END, PACKET_HEADER, PASS_MARK, RESULTS_FORMAT, buildCalibrationPacket, caseNonce, collectMarks, compareMarkers,
  marksFromProgress, readResultBlock, scoreAgainstCases, validateCases, validateFrame, validateResults,
} from './lib/calibration.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'scripts', 'calibration');
const CLI = path.join(ROOT, 'scripts', 'marker-calibration.mjs');
const frame = JSON.parse(readFileSync(path.join(DIR, 'frame.json'), 'utf8'));
const casesDoc = JSON.parse(readFileSync(path.join(DIR, 'cases.json'), 'utf8'));
const cases = casesDoc.cases;

const results = (marks, kind = 'ai') => ({ format: RESULTS_FORMAT, marker: { kind, name: 'test', date: '2026-10-08' }, marks });
const block = (problem, nonce, mark, end = nonce) => [
  '```text', 'LEARNHUB RESULT v1', `PROBLEM: ${problem}`, `NONCE: ${nonce}`, `MARK: ${mark}/20`, 'WEAK 1: a', 'WEAK 2: b', 'WEAK 3: c',
  'REDO: none', 'GAP: none', 'SUMMARY: s', `END LEARNHUB RESULT ${end}`, '```',
].join('\n');
/** Marks that put every case in its band: 17 for a model answer, 8 for a flawed copy. */
const ideal = () => cases.map((c) => ({ case: c.id, mark: c.expect === 'high' ? 17 : 8 }));

describe('the committed frame and cases', () => {
  it('are valid, with at least one model and flawed pair per problem', () => {
    assert.deepEqual(validateFrame(frame), []);
    assert.deepEqual(validateCases(casesDoc, frame), []);
    for (const p of new Set(cases.map((c) => c.problem))) {
      assert.ok(cases.some((c) => c.problem === p && c.expect === 'high'));
      assert.ok(cases.some((c) => c.problem === p && c.expect === 'low'));
    }
  });

  it('includes cases on problems with an official STEP mark scheme', () => {
    assert.ok(cases.some((c) => frame.problems[c.problem].markerOnly.some((l) => l.startsWith('Official STEP mark scheme: '))));
  });
});

describe('validateCases', () => {
  const one = (over) => ({ format: casesDoc.format, cases: [{ ...cases[0], ...over }, cases[1]] });
  it('reports each problem', () => {
    assert.match(validateCases(one({ expect: 'medium' }), frame).join('\n'), /expect/);
    assert.match(validateCases(one({ problem: 'pre.fractions/nope' }), frame).join('\n'), /not in frame\.json/);
    assert.match(validateCases(one({ origin: 'official' }), frame).join('\n'), /citation/);
    assert.match(validateCases({ format: casesDoc.format, cases: [cases[0], { ...cases[1], flaw: undefined }] }, frame).join('\n'), /flaw/);
    assert.match(validateCases({ format: casesDoc.format, cases: [cases[0], cases[0]] }, frame).join('\n'), /used twice/);
    assert.match(validateCases({ format: casesDoc.format, cases: [cases[0]] }, frame).join('\n'), /one model answer \(high\) and at least one flawed copy/);
    assert.deepEqual(validateCases({ format: 'x' }), ['cases: expected format learnhub-marker-cases/1']);
  });
});

describe('packets', () => {
  it('a case nonce is fixed by its id, in the app\'s alphabet, and differs between cases', () => {
    const ns = cases.map((c) => caseNonce(c.id));
    assert.deepEqual(ns, cases.map((c) => caseNonce(c.id)));
    for (const n of ns) assert.match(n, /^[ABCDEFGHJKMNPQRSTVWXYZ23456789]{8}$/);
    assert.equal(new Set(ns).size, ns.length);
  });

  it('a block is whole, tied to its case, marks at once, and keeps the marker-only material', () => {
    for (const c of cases) {
      const b = buildCalibrationPacket(c, frame);
      const lines = b.split('\n');
      assert.equal(lines[0], PACKET_HEADER);
      assert.equal(lines.at(-1), `${PACKET_END} ${caseNonce(c.id)}`);
      assert.ok(lines.includes(`PROBLEM: ${c.problem}`));
      assert.ok(lines.includes(`1. ${CALIBRATION_RULE}`));
      assert.ok(b.includes(c.writeUp.trim()));
      assert.ok(!b.includes(c.flaw ?? '\u0000'), 'the flaw is never in the block');
      assert.ok(!b.includes('{{'), 'the result template is filled in');
      for (const l of frame.problems[c.problem].markerOnly) assert.ok(lines.includes(l));
    }
  });

  it('the CLI writes the same blocks every run', () => {
    const a = mkdtempSync(path.join(tmpdir(), 'cal-a-'));
    const b = mkdtempSync(path.join(tmpdir(), 'cal-b-'));
    try {
      for (const d of [a, b]) assert.equal(spawnSync(process.execPath, [CLI, 'packets', '--out', d]).status, 0);
      const files = readdirSync(a).sort();
      assert.deepEqual(files, cases.map((c) => `${c.id}.txt`).sort());
      for (const f of files) assert.equal(readFileSync(path.join(a, f), 'utf8'), readFileSync(path.join(b, f), 'utf8'));
    } finally {
      rmSync(a, { recursive: true, force: true });
      rmSync(b, { recursive: true, force: true });
    }
  });
});

describe('results', () => {
  it('reads a whole result block inside a code fence; refuses a cut or mixed one', () => {
    const c = cases[0];
    const n = caseNonce(c.id);
    assert.deepEqual(readResultBlock(block(c.problem, n, 17)), { problem: c.problem, nonce: n, mark: 17 });
    assert.equal(readResultBlock(block(c.problem, n, 17, 'ABCDEFGH')), null);
    assert.equal(readResultBlock(block(c.problem, n, 21)), null);
    assert.equal(readResultBlock(block(c.problem, n, 17).replace(/END LEARNHUB RESULT.*/, '')), null);
  });

  it('collects marks by nonce, refusing unknown, mismatched, and repeated blocks', () => {
    const [x, y] = cases;
    const r = collectMarks(cases, [
      block(x.problem, caseNonce(x.id), 18), block(y.problem, caseNonce(y.id), 6), block(x.problem, 'ABCDEFGH', 9),
      block('pre.fractions/a6-q1', caseNonce(y.id), 9), block(x.problem, caseNonce(x.id), 18), 'nothing',
    ]);
    assert.deepEqual(r.marks, [{ case: x.id, mark: 18 }, { case: y.id, mark: 6 }]);
    assert.equal(r.errors.length, 4);
  });

  it('validates the results format, for cases and for real attempts by nonce', () => {
    assert.deepEqual(validateResults(results(ideal())), []);
    assert.deepEqual(validateResults(results([{ nonce: 'K7Q2XMPA', problem: 'proof.direct/x', mark: 12 }], 'human')), []);
    assert.match(validateResults(results([{ case: 'a', mark: 21 }])).join('\n'), /mark/);
    assert.match(validateResults(results([{ case: 'a', nonce: 'K7Q2XMPA', mark: 2 }])).join('\n'), /one of/);
    assert.match(validateResults(results([{ case: 'a', mark: 2 }, { case: 'a', mark: 3 }])).join('\n'), /twice/);
    assert.match(validateResults({ ...results([]), marker: { kind: 'robot', name: 'x', date: '2026-10-08' } }).join('\n'), /marker/);
  });

  it('reads the AI marks of real attempts from a progress export', () => {
    const progress = { supervision: [
      { problem: 'proof.direct/a', nonce: 'K7Q2XMPA', result: { mark: 15 } },
      { problem: 'proof.direct/b', nonce: 'ABCDEFGH', result: null },
    ] };
    assert.deepEqual(marksFromProgress(progress), [{ nonce: 'K7Q2XMPA', problem: 'proof.direct/a', mark: 15 }]);
    assert.deepEqual(marksFromProgress({}), []);
  });
});

describe('scoring', () => {
  it('calibrated: every case in its band; reports the means and the gap per pair', () => {
    const s = scoreAgainstCases(cases, results(ideal()));
    assert.equal(s.calibrated, true);
    assert.equal(s.agreement, 1);
    assert.equal(s.meanHigh, 17);
    assert.equal(s.meanLow, 8);
    assert.equal(s.gap, 9);
    assert.deepEqual(s.misses, []);
  });

  it('a flawed copy at the pass mark, or a missing case, is not calibrated', () => {
    const low = cases.find((c) => c.expect === 'low');
    const s = scoreAgainstCases(cases, results(ideal().map((m) => (m.case === low.id ? { ...m, mark: PASS_MARK } : m))));
    assert.equal(s.calibrated, false);
    assert.equal(s.agreement, (cases.length - 1) / cases.length);
    assert.deepEqual(s.misses, [{ case: low.id, expect: 'low', mark: PASS_MARK }]);
    const partial = scoreAgainstCases(cases, results(ideal().slice(1)));
    assert.equal(partial.calibrated, false);
    assert.deepEqual(partial.missing, [cases[0].id]);
  });

  it('two markers: agreement on pass or fail and the mean difference, on the scripts both marked', () => {
    const ai = results([{ nonce: 'K7Q2XMPA', mark: 16 }, { nonce: 'ABCDEFGH', mark: 12 }, { nonce: 'JKMNPQRS', mark: 15 }, { nonce: 'TVWXYZ23', mark: 3 }]);
    const human = results([{ nonce: 'K7Q2XMPA', mark: 15 }, { nonce: 'ABCDEFGH', mark: 13 }, { nonce: 'JKMNPQRS', mark: 12 }], 'human');
    const c = compareMarkers(ai, human);
    assert.equal(c.n, 3);
    assert.equal(c.agreement, 2 / 3);
    assert.equal(c.meanDifference, 1);
    assert.equal(c.meanAbsDifference, 5 / 3);
    assert.equal(c.agree, false);
    assert.equal(compareMarkers(ai, ai).agree, true);
    assert.equal(compareMarkers(ai, results([])).n, 0);
  });

  it('the CLI exits 0 when calibrated and 1 when not', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'cal-r-'));
    try {
      const good = path.join(dir, 'good.json');
      const bad = path.join(dir, 'bad.json');
      writeFileSync(good, JSON.stringify(results(ideal())));
      writeFileSync(bad, JSON.stringify(results(ideal().map((m) => ({ ...m, mark: 15 })))));
      const ok = spawnSync(process.execPath, [CLI, 'score', good], { encoding: 'utf8' });
      assert.equal(ok.status, 0, ok.stderr);
      assert.match(ok.stdout, /Calibrated\./);
      assert.equal(spawnSync(process.execPath, [CLI, 'score', bad]).status, 1);
      assert.equal(spawnSync(process.execPath, [CLI, 'compare', good, good]).status, 0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
