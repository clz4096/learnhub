/**
 * Rule 7 and the supervision outline (mastery/HOW-A-TOPIC-WORKS.md): an official STEP mark scheme
 * and a model outline go in the supervision block as marker-only material, never shown in the app,
 * and seeing the outline retires the problem as "Show me the solution" does.
 */
import { describe, expect, it } from 'vitest';
import { CONTENT_IDS, isMarkScheme, t, type SupervisionProblem } from '@learnhub/content';
import { TOPIC_CONTENT } from '@learnhub/content/all';
import { DAY_MS, newMemory, type Progress } from '@learnhub/mastery';
import { DEFAULT_COURSES, masteryOf, outlineState, recordSupervisionCopy, importSupervisionResult, showOutline, startLearner } from '@/model/learner';
import { MARKER_ONLY, MARK_SCHEME_RULE, OUTLINE_RULE, buildPacket, findProblem, markerOnly, withoutMarkerOnly } from '@/model/supervision';
import { contentStore } from '@/model/content';

await Promise.all(CONTENT_IDS.map((id) => contentStore.load(id)));

const T0 = new Date(2026, 9, 5, 9, 0).getTime();
const NONCE = 'K7Q2XMPA';

const supervisionProblems = TOPIC_CONTENT.flatMap((c) => c.cambridge.filter((p): p is SupervisionProblem => p.mode === 'supervision').map((p) => ({ key: `${c.topicId}/${p.id}`, topicId: c.topicId, p, gate: c.gate.includes(p.id) })));
const WITH_SCHEME = supervisionProblems.find((x) => x.p.official !== undefined && isMarkScheme(x.p.official));
const WITH_SOLUTION = supervisionProblems.find((x) => x.p.official !== undefined && !isMarkScheme(x.p.official));
/** A gate problem, so the gate tests below read its evidence. */
const PLAIN = supervisionProblems.find((x) => x.gate && x.p.official === undefined && x.p.outline === undefined);

const packet = (key: string, p: Progress = startLearner(T0, DEFAULT_COURSES, 60)): string =>
  buildPacket({ key, nonce: NONCE, writeUp: 'My proof.', copiedAt: T0, progress: p });

/** Runs `f` with an outline set on a loaded problem, then puts the problem back. */
function withOutline<R>(key: string, outline: SupervisionProblem['outline'], f: () => R): R {
  const found = findProblem(key);
  if (found === undefined || found.problem.mode !== 'supervision') throw new Error(`no supervision problem ${key}`);
  const prob = found.problem as { outline?: SupervisionProblem['outline'] };
  const before = prob.outline;
  prob.outline = outline;
  try {
    return f();
  } finally {
    if (before === undefined) delete prob.outline;
    else prob.outline = before;
  }
}

describe('marker-only material in the supervision block', () => {
  it('there are problems of each kind to test', () => {
    expect(WITH_SCHEME).toBeDefined();
    expect(WITH_SOLUTION).toBeDefined();
    expect(PLAIN).toBeDefined();
  });

  it('an official STEP mark scheme is cited as marker-only, and the supervisor is told to mark against it', () => {
    const text = packet(WITH_SCHEME!.key);
    expect(text).toMatch(/^OFFICIAL MARK SCHEME \(for the supervisor only, mark against it\): /m);
    expect(text).toContain(MARK_SCHEME_RULE);
    const at = text.split('\n').indexOf(MARKER_ONLY);
    expect(at).toBeGreaterThan(0);
    expect(text.split('\n')[at + 1]).toMatch(/^Official STEP mark scheme: /);
    // Marker-only comes after the instructions and before the result format.
    expect(at).toBeGreaterThan(text.indexOf('--- INSTRUCTIONS FOR THE SUPERVISOR ---') === -1 ? Infinity : text.split('\n').indexOf('--- INSTRUCTIONS FOR THE SUPERVISOR ---'));
    expect(at).toBeLessThan(text.split('\n').indexOf('--- RESULT FORMAT ---'));
  });

  it('hints or solutions that are not a mark scheme keep the official solution line and add no marker section', () => {
    const text = packet(WITH_SOLUTION!.key);
    expect(text).toMatch(/^OFFICIAL SOLUTION \(for the supervisor only\): /m);
    expect(text).not.toContain(MARK_SCHEME_RULE);
    expect(text).not.toContain(MARKER_ONLY);
    expect(packet(PLAIN!.key)).not.toContain(MARKER_ONLY);
  });

  it('an outline goes in the marker-only section, numbered, with the rule to check against it and never show it', () => {
    const outline = [t`Write ${'p'} and ${'q'} in terms of ${'m'}.`, t`Apply AM-GM to the two terms that vary.`];
    const text = withOutline(PLAIN!.key, outline, () => packet(PLAIN!.key));
    expect(text).toContain(OUTLINE_RULE);
    const lines = text.split('\n');
    const at = lines.indexOf(MARKER_ONLY);
    expect(lines.slice(at + 1, at + 4)).toEqual(['Outline of a model answer:', '1. Write p and q in terms of m.', '2. Apply AM-GM to the two terms that vary.']);
    expect(markerOnly(PLAIN!.p)).toEqual([]);
  });

  it('the app never shows the marker-only section: the shown text replaces it with one line, the rest unchanged', () => {
    const text = packet(WITH_SCHEME!.key);
    const shown = withoutMarkerOnly(text);
    expect(shown).not.toContain('Official STEP mark scheme: ');
    expect(shown).toContain('--- FOR THE MARKER ONLY: in the copied text, not shown here ---');
    expect(shown.split('\n').filter((l) => !l.startsWith('--- FOR THE MARKER ONLY'))).toEqual(
      text.split('\n').filter((l, i, all) => { const at = all.indexOf(MARKER_ONLY); const end = all.indexOf('', at); return i < at || i >= end; }),
    );
    expect(withoutMarkerOnly(packet(PLAIN!.key))).toBe(packet(PLAIN!.key));
  });
});

describe('seeing the outline (same retire rule as "Show me the solution")', () => {
  const learned = (topicId: string): Progress => ({ ...startLearner(T0, DEFAULT_COURSES, 60), memory: { [topicId]: newMemory(T0) } });

  it('is logged once, and a passing write-up imported after it no longer meets the gate', () => {
    const { key, topicId } = PLAIN!;
    let p = showOutline(learned(topicId), key, T0 + 1000);
    expect(outlineState(p, key)).toEqual({ passed: false, seen: true });
    expect(showOutline(p, key, T0 + 2000)).toBe(p);
    const copy = recordSupervisionCopy(p, key, 'x', T0 + 3000, () => NONCE);
    p = importSupervisionResult(copy.progress, { problem: key, nonce: NONCE, result: { mark: 18, weakPoints: ['a', 'b', 'c'], redo: [], summary: 's' } }, T0 + DAY_MS);
    const ev = masteryOf(p, topicId).evidence;
    expect(ev?.problem === key && ev.kind === 'supervision').toBe(false);
  });

  it('after a pass, the outline is offered freely and the pass still counts', () => {
    const { key, topicId } = PLAIN!;
    const copy = recordSupervisionCopy(learned(topicId), key, 'x', T0, () => NONCE);
    let p = importSupervisionResult(copy.progress, { problem: key, nonce: NONCE, result: { mark: 16, weakPoints: ['a', 'b', 'c'], redo: [], summary: 's' } }, T0 + 1000);
    expect(outlineState(p, key)).toEqual({ passed: true, seen: false });
    p = showOutline(p, key, T0 + 2000);
    expect(masteryOf(p, topicId).evidence).toMatchObject({ kind: 'supervision', problem: key, mark: 16 });
  });
});
