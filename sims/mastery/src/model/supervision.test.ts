/// <reference types="node" />
/**
 * Supervision by copy and paste (build step 3): the copied block, the result block and its
 * validation, and what an imported result does to the progress document and the schedule.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CONTENT_IDS, plain, t, math } from '@learnhub/content';
import { TOPIC_CONTENT } from '@learnhub/content/all';
import {
  DAY_MS, NONCE_RE, PROBLEM_KEY_RE, SUPERVISION_PASS_MARK, exportProgress, importProgress, newMemory, type Progress,
} from '@learnhub/mastery';
import {
  DEFAULT_COURSES, MAX_PENDING_COPIES, REDO_DUE_DAYS, completeLesson, completeRedoByCheck, importSupervisionResult, openRedos,
  recordSupervisionCopy, startLearner, waitingCopies,
} from '@/model/learner';
import {
  PACKET_END, PACKET_HEADER, RESULT_END, RESULT_HEADER, buildPacket, checkResultFor, findProblem, formatResult, newNonce, parseResult,
  catalogTitle, problemExists, problemKey, resultTemplate, richToText, type ParsedResult,
} from '@/model/supervision';
import { contentStore } from '@/model/content';

// A packet is built from a topic's content, which the app downloads when the lesson opens: download every topic first.
await Promise.all(CONTENT_IDS.map((id) => contentStore.load(id)));

const T0 = new Date(2026, 9, 5, 9, 0).getTime();
const PROOF = 'prob.event-spaces/q4-a-finite';
const OTHER = 'prob.event-spaces/q6-b-event';
const TABLE = 'prob.bayes-two-events/a6-q4-i-abc';
const NONCE = 'K7Q2XMPA';

/** Nonces from a fixed list, so tests know them. */
function nonces(...xs: string[]): () => string {
  let i = 0;
  return () => xs[i++] ?? newNonce();
}

function copied(p: Progress = startLearner(T0, DEFAULT_COURSES, 60), key = PROOF, writeUp = 'Pad with empty sets.', nonce = NONCE, at = T0): Progress {
  return recordSupervisionCopy(p, key, writeUp, at, nonces(nonce)).progress;
}

function result(over: Partial<ParsedResult['result']> = {}, problem = PROOF, nonce = NONCE): ParsedResult {
  return {
    problem, nonce,
    result: { mark: 12, weakPoints: ['Empty set not shown to be an event.', 'De Morgan used without saying why.', 'Set difference skipped.'], redo: [OTHER], summary: 'Right ideas, steps asserted.', ...over },
  };
}

const parsed = (text: string): ParsedResult => {
  const r = parseResult(text);
  if (!r.ok) throw new Error(r.error);
  return r.value;
};
const errorOf = (text: string): string => {
  const r = parseResult(text);
  expect(r.ok).toBe(false);
  return r.ok ? '' : r.error;
};

describe('problem ids', () => {
  it('every Cambridge problem has an id the formats accept, and it finds its way back', () => {
    let n = 0;
    for (const c of TOPIC_CONTENT) {
      for (const p of c.cambridge) {
        const key = problemKey(c.topicId, p.id);
        expect(PROBLEM_KEY_RE.test(key), key).toBe(true);
        expect(findProblem(key)?.problem).toBe(p);
        expect(problemExists(key), key).toBe(true);
        expect(catalogTitle(key)).toBe(plain(p.title));
        n++;
      }
    }
    expect(n).toBeGreaterThan(20);
    expect(findProblem('prob.event-spaces/nope')).toBeUndefined();
    expect(findProblem('not a key')).toBeUndefined();
    expect(problemExists('prob.event-spaces/nope')).toBe(false);
    expect(problemExists('num.gcd/q1')).toBe(false);
    expect(catalogTitle('not a key')).toBeUndefined();
  });

  it('nonces use the unambiguous alphabet', () => {
    for (let i = 0; i < 200; i++) expect(newNonce()).toMatch(NONCE_RE);
    expect(newNonce(() => 0)).toBe('AAAAAAAA');
  });
});

describe('the copied block', () => {
  it('rich text keeps its mathematics as LaTeX between dollar signs', () => {
    expect(richToText(t`Let ${math`A \cup B`} be an [[event|event]].`)).toBe('Let $A \\cup B$ be an event.');
  });

  it('has the header, the problem, its source, the write-up, recent attempts, the instructions, and the result format', () => {
    let p = completeLesson(startLearner(T0, DEFAULT_COURSES, 60), 'prob.event-spaces', true, T0 - DAY_MS, null, 20);
    p = copied(p);
    const text = buildPacket({ key: PROOF, nonce: NONCE, writeUp: 'Pad with empty sets.', copiedAt: T0, progress: p });
    const lines = text.split('\n');
    expect(lines[0]).toBe(PACKET_HEADER);
    expect(lines[1]).toBe(`PROBLEM: ${PROOF}`);
    expect(lines[2]).toBe(`NONCE: ${NONCE}`);
    expect(text).toContain('SOURCE: Adapted from IA Probability Example Sheet 1, Q4(a)');
    expect(text).toContain('ANSWER WANTED: a proof');
    expect(text).toMatch(/\$A_\{1\} \\cup \\cdots \\cup A_n\$/);
    expect(text).toContain('--- MY WRITE-UP ---\nPad with empty sets.');
    expect(text).toMatch(/--- RECENT ATTEMPTS ON THIS TOPIC ---\n2026-10-0\d lesson passed/);
    expect(text).toContain(`${OTHER}: "Infinitely often" is an event`);
    expect(text).toMatch(/Never give me a full solution/);
    expect(text).toMatch(/smallest hint/);
    expect(text).toMatch(/define it/);
    expect(text).toContain(resultTemplate(PROOF, NONCE));
    expect(lines[lines.length - 1]).toBe(`${PACKET_END} ${NONCE}`);
    expect(text).not.toMatch(/[–—]/);
  });

  it('says when nothing is typed, so the supervisor asks for the photos', () => {
    const text = buildPacket({ key: PROOF, nonce: NONCE, writeUp: '  ', copiedAt: T0, progress: copied() });
    expect(text).toContain('(Nothing typed. My handwritten work is attached as photos.)');
  });

  it('for a wrong auto-checked answer, gives the answer, the table to fill in, and the correct answer for the supervisor only', () => {
    const text = buildPacket({ key: TABLE, nonce: NONCE, writeUp: 'I used 18 out of 100.', copiedAt: T0, progress: copied(), checked: { given: '18/100, 1/2, 3/10' } });
    expect(text).toContain('The app marked my answer wrong.');
    expect(text).toMatch(/CORRECT ANSWER \(for the supervisor only, do not tell me\): /);
    expect(text).toContain('Table to fill in:');
    expect(text).toContain('My answer, marked wrong by the app: 18/100, 1/2, 3/10');
    expect(text).toContain('My working:\nI used 18 out of 100.');
  });

  it('recent attempts include earlier supervision marks and weak points', () => {
    let p = copied();
    p = importSupervisionResult(p, result(), T0 + 1000);
    const text = buildPacket({ key: OTHER, nonce: 'ABCDEFGH', writeUp: '', copiedAt: T0 + 2000, progress: p });
    expect(text).toContain(`supervision of ${PROOF}: 12/20. Weak points: Empty set not shown to be an event.; De Morgan`);
  });
});

describe('the result block', () => {
  it('round-trips: format then parse gives the same result', () => {
    for (const r of [result(), result({ redo: [] }), result({ mark: 0 }), result({ mark: 20, redo: [PROOF, OTHER, TABLE] })]) {
      expect(parsed(formatResult(r))).toEqual(r);
    }
  });

  it('reads a block in a code fence, with indentation and text around it', () => {
    const text = `Here is your result.\n\n\`\`\`text\n${formatResult(result()).split('\n').map((l) => `  ${l}`).join('\n')}\n\`\`\`\nGood luck.`;
    expect(parsed(text)).toEqual(result());
  });

  it('joins a long field wrapped by the terminal onto the line above', () => {
    const text = formatResult(result()).replace('SUMMARY: Right ideas, steps asserted.', 'SUMMARY: Right ideas,\nsteps asserted.');
    expect(parsed(text).result.summary).toBe('Right ideas, steps asserted.');
  });

  it('accepts a lower-case nonce and none for no redos', () => {
    const text = formatResult(result({ redo: [] })).replace(`NONCE: ${NONCE}`, `NONCE: ${NONCE.toLowerCase()}`).replace('REDO: none', 'REDO: None');
    expect(parsed(text).nonce).toBe(NONCE);
  });

  const good = formatResult(result());
  const cases: [string, string, RegExp][] = [
    ['nothing', '   ', /Nothing was pasted/],
    ['the copied block itself', buildPacket({ key: PROOF, nonce: NONCE, writeUp: 'x', copiedAt: T0, progress: copied() }), /supervision block copied from here, not the result/],
    ['no header (cut off at the top)', good.split('\n').slice(1).join('\n'), /must start with the line LEARNHUB RESULT v1/],
    ['no end line (cut off at the bottom)', good.split('\n').slice(0, -1).join('\n'), /end line .* is missing, so the paste was cut off/],
    ['cut off after MARK', [...good.split('\n').slice(0, 4), good.split('\n').at(-1)].join('\n'), /missing WEAK 1, WEAK 2, WEAK 3, REDO, SUMMARY/],
    ['a field twice', good.replace('WEAK 2:', 'WEAK 1:'), /WEAK 1 appears twice/],
    ['a fourth weak point', good.replace('REDO:', 'WEAK 4: also this\nREDO:'), /WEAK 4 is not a field/],
    ['end nonce differs', good.replace(`${RESULT_END} ${NONCE}`, `${RESULT_END} ABCDEFGH`), /does not repeat the NONCE/],
    ['two blocks', `${good}\n${good}`, /more than one result block/],
    ['mark over 20', good.replace('MARK: 12/20', 'MARK: 21/20'), /more than the most possible/],
    ['mark not whole', good.replace('MARK: 12/20', 'MARK: 12.5/20'), /MARK should be a whole number out of 20/],
    ['mark without the 20', good.replace('MARK: 12/20', 'MARK: 12'), /MARK should be a whole number out of 20, like 13\/20/],
    ['mark out of 10', good.replace('MARK: 12/20', 'MARK: 6/10'), /must be out of 20/],
    ['negative mark', good.replace('MARK: 12/20', 'MARK: -1/20'), /MARK should be a whole number/],
    ['the unfilled template', resultTemplate(PROOF, NONCE), /MARK should be a whole number/],
    ['an empty weak point', good.replace(/WEAK 2: .*/, 'WEAK 2:'), /WEAK 2 is empty/],
    ['a redo that is not a problem', good.replace(`REDO: ${OTHER}`, 'REDO: prob.event-spaces/q99'), /REDO lists "prob\.event-spaces\/q99", which is not a problem/],
    ['four redos', good.replace(`REDO: ${OTHER}`, `REDO: ${PROOF}, ${OTHER}, ${TABLE}, ${PROOF}`), /at most 3/],
    ['a bad problem id', good.replace(`PROBLEM: ${PROOF}`, 'PROBLEM: Q4(a)'), /PROBLEM should be a problem id/],
    ['a bad nonce', good.replace(`NONCE: ${NONCE}`, 'NONCE: 1234').replace(`${RESULT_END} ${NONCE}`, `${RESULT_END} 1234`), /NONCE should be the 8 letters/],
    ['an empty summary', good.replace(/SUMMARY: .*/, 'SUMMARY:'), /SUMMARY is empty/],
    ['a weak point far too long', good.replace(/WEAK 3: .*/, `WEAK 3: ${'x'.repeat(401)}`), /WEAK 3 is longer than 400/],
    ['a stray line in a short field', good.replace(`NONCE: ${NONCE}`, `NONCE: ${NONCE}\nand more`), /is not part of the result format/],
  ];
  for (const [name, text, re] of cases) {
    it(`rejects ${name}, with a plain message`, () => {
      const e = errorOf(text);
      expect(e).toMatch(re);
      expect(e).not.toMatch(/[–—]/);
    });
  }

  it('never throws on any truncation of a good block', () => {
    for (let i = 0; i < good.length; i += 3) {
      const r = parseResult(good.slice(0, i));
      expect(r.ok).toBe(false);
      const r2 = parseResult(good.slice(i));
      if (i > 0) expect(r2.ok).toBe(false);
    }
  });
});

describe('a result must answer a copy made here', () => {
  it('accepts the result for a waiting copy', () => {
    expect(checkResultFor(copied(), result())).toBeNull();
    expect(checkResultFor(copied(), result(), PROOF)).toBeNull();
  });

  it('refuses a result for another problem than the one it is pasted on', () => {
    expect(checkResultFor(copied(), result(), OTHER)).toMatch(/This result is for prob\.event-spaces\/q4-a-finite, not for this problem/);
  });

  it('refuses an unknown nonce, a nonce of another problem, and a second import', () => {
    expect(checkResultFor(copied(), result({}, PROOF, 'ABCDEFGH'))).toMatch(/No copy with NONCE ABCDEFGH was made in this browser/);
    expect(checkResultFor(copied(), result({}, OTHER, NONCE))).toMatch(/belongs to a copy of prob\.event-spaces\/q4-a-finite/);
    const p = importSupervisionResult(copied(), result(), T0 + 1000);
    expect(checkResultFor(p, result())).toMatch(/already imported on 2026-10-05/);
  });
});

describe('recording copies', () => {
  it('a copy is an attempt waiting for its result; copying again unchanged reuses it', () => {
    const p = copied();
    expect(p.supervision).toEqual([{ problem: PROOF, nonce: NONCE, writeUp: 'Pad with empty sets.', copiedAt: T0, result: null, importedAt: null }]);
    const again = recordSupervisionCopy(p, PROOF, 'Pad with empty sets.', T0 + 5, nonces('ABCDEFGH'));
    expect(again.progress).toBe(p);
    expect(again.attempt.nonce).toBe(NONCE);
    const changed = recordSupervisionCopy(p, PROOF, 'Pad with empty sets, and complements.', T0 + 5, nonces('ABCDEFGH'));
    expect(changed.progress.supervision.map((a) => a.nonce)).toEqual([NONCE, 'ABCDEFGH']);
    expect(waitingCopies(changed.progress).map((a) => a.nonce)).toEqual(['ABCDEFGH']);
  });

  it('never reuses a nonce, and keeps a bounded number of waiting copies per problem', () => {
    let p = copied();
    const again = recordSupervisionCopy(p, OTHER, '', T0, nonces(NONCE, 'ABCDEFGH'));
    expect(again.attempt.nonce).toBe('ABCDEFGH');
    for (let i = 0; i < MAX_PENDING_COPIES + 3; i++) p = recordSupervisionCopy(p, PROOF, `draft ${i}`, T0 + i, () => newNonce()).progress;
    expect(p.supervision.filter((a) => a.problem === PROOF)).toHaveLength(MAX_PENDING_COPIES);
    expect(p.supervision.at(-1)?.writeUp).toBe(`draft ${MAX_PENDING_COPIES + 2}`);
  });
});

describe('an imported result and the schedule', () => {
  const learned = (): Progress => {
    const p = startLearner(T0, DEFAULT_COURSES, 60);
    return { ...p, memory: { 'prob.event-spaces': { ...newMemory(T0 - 4 * DAY_MS), reps: 2, intervalDays: 9, due: T0 + 5 * DAY_MS } } };
  };
  const NOW = T0 + 3600_000;

  it('keeps the result with its import time and logs it, and the document still loads', () => {
    const p = importSupervisionResult(copied(learned()), result(), NOW);
    expect(p.supervision[0]).toMatchObject({ result: result().result, importedAt: NOW });
    expect(p.history.at(-1)).toEqual({ at: NOW, kind: 'supervision', topicId: 'prob.event-spaces', correct: false });
    const back = importProgress(exportProgress(p));
    expect(back.ok && back.value).toEqual(p);
  });

  it(`a mark below ${SUPERVISION_PASS_MARK} is a missed review: a lapse, and the topic comes back sooner`, () => {
    const before = learned().memory['prob.event-spaces'];
    const p = importSupervisionResult(copied(learned()), result({ mark: SUPERVISION_PASS_MARK - 1 }), NOW);
    const m = p.memory['prob.event-spaces'];
    expect(m?.lapses).toBe((before?.lapses ?? 0) + 1);
    expect(m?.reps).toBe((before?.reps ?? 0) - 1);
    expect(m?.due).toBeLessThan(before?.due ?? 0);
    expect(p.history.at(-1)?.correct).toBe(false);
  });

  it(`a mark of ${SUPERVISION_PASS_MARK} or more is a passed review: the interval grows`, () => {
    const before = learned().memory['prob.event-spaces'];
    const p = importSupervisionResult(copied(learned()), result({ mark: SUPERVISION_PASS_MARK }), NOW);
    const m = p.memory['prob.event-spaces'];
    expect(m?.reps).toBe((before?.reps ?? 0) + 1);
    expect(m?.lapses).toBe(0);
    expect(m?.intervalDays).toBeGreaterThan(before?.intervalDays ?? Infinity);
    expect(p.history.at(-1)?.correct).toBe(true);
  });

  it('a topic not learned yet keeps no memory: a supervision mark does not make it learned', () => {
    const p = importSupervisionResult(copied(), result({ mark: 20 }), NOW);
    expect(p.memory).toEqual({});
    expect(p.supervision[0]?.result?.mark).toBe(20);
  });

  it('each redo is due within 2 days, and shows as open', () => {
    const p = importSupervisionResult(copied(), result({ redo: [OTHER, PROOF] }), NOW);
    expect(REDO_DUE_DAYS).toBeLessThanOrEqual(2);
    expect(openRedos(p)).toEqual([
      { problem: OTHER, from: NONCE, setAt: NOW, due: NOW + REDO_DUE_DAYS * DAY_MS, doneAt: null },
      { problem: PROOF, from: NONCE, setAt: NOW, due: NOW + REDO_DUE_DAYS * DAY_MS, doneAt: null },
    ].sort((a, b) => (a.problem < b.problem ? -1 : 1)));
  });

  it('a redo already open keeps its earlier due time', () => {
    let p = importSupervisionResult(copied(), result({ redo: [OTHER] }), NOW);
    p = copied(p, TABLE, 'x', 'ABCDEFGH', NOW + 10);
    p = importSupervisionResult(p, result({ redo: [OTHER] }, TABLE, 'ABCDEFGH'), NOW + DAY_MS / 2);
    expect(openRedos(p).filter((d) => d.problem === OTHER)).toHaveLength(1);
    expect(openRedos(p)[0]?.due).toBe(NOW + REDO_DUE_DAYS * DAY_MS);
  });

  it('a later supervision of the redo problem closes it; a copy made before the redo was set does not', () => {
    let p = copied(startLearner(T0, DEFAULT_COURSES, 60), OTHER, 'old draft', 'BBBBBBBB', T0 - 10);
    p = importSupervisionResult(copied(p), result({ redo: [OTHER] }), NOW);
    // The old copy of OTHER predates the redo, so its result is not the redo.
    p = importSupervisionResult(p, result({ redo: [] }, OTHER, 'BBBBBBBB'), NOW + 5);
    expect(openRedos(p).map((d) => d.problem)).toEqual([OTHER]);
    p = copied(p, OTHER, 'cold redo', 'CCCCCCCC', NOW + DAY_MS);
    p = importSupervisionResult(p, result({ mark: 16, redo: [] }, OTHER, 'CCCCCCCC'), NOW + DAY_MS + 5);
    expect(openRedos(p)).toEqual([]);
    expect(p.redos[0]?.doneAt).toBe(NOW + DAY_MS + 5);
  });

  it('a right answer to an auto-checked redo closes it', () => {
    let p = importSupervisionResult(copied(), result({ redo: [TABLE] }), NOW);
    expect(completeRedoByCheck(p, OTHER, NOW + DAY_MS)).toBe(p);
    p = completeRedoByCheck(p, TABLE, NOW + DAY_MS);
    expect(openRedos(p)).toEqual([]);
  });

  it('a result for an attempt that is not waiting changes nothing', () => {
    const p = importSupervisionResult(copied(), result(), NOW);
    expect(importSupervisionResult(p, result(), NOW + 1)).toBe(p);
    expect(importSupervisionResult(copied(), result({}, PROOF, 'ZZZZZZZZ'), NOW).supervision[0]?.result).toBeNull();
  });
});

describe('the /supervise command', () => {
  const md = readFileSync(new URL('../../../../.claude/commands/supervise.md', import.meta.url), 'utf8');

  it('its filled-in example is a valid result block', () => {
    const blocks = [...md.matchAll(/```text\n([\s\S]*?)```/g)].map((m) => m[1] as string);
    const example = blocks.find((b) => b.includes('MARK: 12/20'));
    expect(example).toBeDefined();
    const r = parsed(example as string);
    expect(r.problem).toBe(PROOF);
    expect(r.result.redo).toEqual([PROOF, OTHER]);
  });

  it('lists the same fields, in the same order, as the app\'s template', () => {
    const labels = (s: string): string[] => s.split('\n').map((l) => /^([A-Z][A-Z0-9 ]*?):/.exec(l)?.[1]).filter((x): x is string => x !== undefined);
    const template = [...md.matchAll(/```text\n([\s\S]*?)```/g)][0]?.[1] ?? '';
    expect(labels(template)).toEqual(labels(resultTemplate(PROOF, NONCE)));
    expect(md).toContain(RESULT_HEADER);
    expect(md).toContain(PACKET_HEADER);
    expect(md).not.toMatch(/[–—]/);
  });

  it('says to supervise Cambridge style: one step at a time, smallest hint, no full solution, plain English', () => {
    expect(md).toMatch(/Never give a full solution/);
    expect(md).toMatch(/one step at a time/);
    expect(md).toMatch(/smallest hint/);
    expect(md).toMatch(/Plain English/);
  });
});
