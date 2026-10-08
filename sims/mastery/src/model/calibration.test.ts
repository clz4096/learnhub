/// <reference types="node" />
/**
 * The marker calibration harness (rule 7, mastery/MARKER-CALIBRATION.md) reads its instructions,
 * rubric, and problem statements from scripts/calibration/frame.json, which this test writes from
 * the app's own supervision code, so a calibration block is the block the app copies.
 *
 * After changing the supervision instructions, the rubric, or a calibration case's problem, write
 * the frame again and review the diff:
 *   LEARNHUB_WRITE_FRAME=1 npx vitest run src/model/calibration.test.ts   (in sims/mastery)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CONTENT_IDS, citationText, type SupervisionProblem } from '@learnhub/content';
import {
  CALIBRATION_RULE, FRAME_FORMAT, buildCalibrationPacket, caseNonce, validateCases, validateFrame, type CalibrationCase, type Frame,
} from '../../../../scripts/lib/calibration.mjs';
import { DEFAULT_COURSES, startLearner } from './learner';
import { contentStore } from './content';
import { titleOf } from './courses';
import { rubricLines } from './rubric';
import {
  MARKER_ONLY, MARK_SCHEME_RULE, OUTLINE_RULE, PROOF_CHECKLIST, PROOF_RULE, SUPERVISOR_RULES, buildPacket, findProblem, gapList, markerOnly,
  officialLines, redoList, resultTemplate, richToText,
} from './supervision';

await Promise.all(CONTENT_IDS.map((id) => contentStore.load(id)));

const DIR = new URL('../../../../scripts/calibration/', import.meta.url);
const CASES = JSON.parse(readFileSync(new URL('cases.json', DIR), 'utf8')) as { cases: CalibrationCase[] };

/** The frame as the app would write it now, for the problems the cases use. */
function appFrame(): Frame {
  const problems: Frame['problems'] = {};
  for (const key of [...new Set(CASES.cases.map((c) => c.problem))].sort()) {
    const found = findProblem(key);
    if (found === undefined || found.problem.mode !== 'supervision') throw new Error(`calibration case problem ${key} is not a supervision problem in the app`);
    const p: SupervisionProblem = found.problem;
    const topicId = found.topic.topicId;
    problems[key] = {
      topic: `${titleOf(topicId)} (${topicId})`, source: citationText(p.source), title: richToText(p.title), statement: richToText(p.prompt),
      writeUp: p.writeUp, officialLines: officialLines(p), redoList: redoList(found.topic), gapList: gapList(topicId, p), markerOnly: markerOnly(p),
    };
  }
  return {
    format: FRAME_FORMAT, supervisorRules: [...SUPERVISOR_RULES], proofRule: PROOF_RULE, markSchemeRule: MARK_SCHEME_RULE, outlineRule: OUTLINE_RULE,
    markerOnly: MARKER_ONLY, proofChecklist: [...PROOF_CHECKLIST], rubricLines: rubricLines(), resultTemplate: resultTemplate('{{PROBLEM}}', '{{NONCE}}', true),
    problems,
  };
}

const frame = appFrame();
if (process.env.LEARNHUB_WRITE_FRAME === '1') writeFileSync(fileURLToPath(new URL('frame.json', DIR)), `${JSON.stringify(frame, null, 2)}\n`);

/** A block without what a calibration run changes: the copy time, the case line, the calibration rule, the history, and rule numbers. */
function comparable(block: string): string[] {
  return block.split('\n')
    .filter((l) => !l.startsWith('COPIED: ') && !l.startsWith('CALIBRATION CASE: ') && !l.endsWith(CALIBRATION_RULE))
    .map((l) => l.replace(/^\d+\. /, ''))
    .filter((l) => l !== 'None yet.' && l !== 'None: a calibration run.');
}

describe('the calibration frame', () => {
  it('is the app\'s supervision code as it is now (regenerate it with LEARNHUB_WRITE_FRAME=1, see the file comment)', () => {
    const stored = JSON.parse(readFileSync(new URL('frame.json', DIR), 'utf8')) as Frame;
    expect(validateFrame(stored)).toEqual([]);
    expect(stored).toEqual(frame);
  });

  it('the cases are valid against it', () => {
    expect(validateCases(CASES, frame)).toEqual([]);
  });

  it('a calibration block is the app\'s block for the same write-up, but for the calibration rule, the case line, and no history', () => {
    const p = startLearner(new Date(2026, 9, 5, 9).getTime(), DEFAULT_COURSES, 60);
    for (const c of CASES.cases) {
      const nonce = caseNonce(c.id);
      const app = buildPacket({ key: c.problem, nonce, writeUp: c.writeUp, copiedAt: p.createdAt, progress: p });
      const cal = buildCalibrationPacket(c, frame);
      expect(cal.split('\n')[0]).toBe(app.split('\n')[0]);
      expect(cal).toContain(`1. ${CALIBRATION_RULE}`);
      expect(comparable(cal), c.id).toEqual(comparable(app));
    }
  });
});
