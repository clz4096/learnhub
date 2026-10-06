/**
 * The supervision write-up rubric: the data, its parser, and how the copied block and the
 * result block carry it.
 */
import { describe, expect, it } from 'vitest';
import { SUPERVISION_MARK_MAX } from '@learnhub/mastery';
import { DEFAULT_COURSES, startLearner } from '@/model/learner';
import {
  RUBRIC_CRITERIA, WRITE_UP_RUBRIC, formatRubric, parseRubric, rubricBand, rubricLines, rubricSummary, rubricTemplate, rubricTotal,
  type RubricMarks,
} from '@/model/rubric';
import { buildPacket, formatResult, parseResult, resultTemplate, type ParsedResult } from '@/model/supervision';
import { contentStore } from '@/model/content';

await Promise.all(['prob.event-spaces', 'prob.bayes-two-events'].map((id) => contentStore.load(id)));

const T0 = new Date(2026, 9, 5, 9, 0).getTime();
const PROOF = 'prob.event-spaces/q4-a-finite';
const TABLE = 'prob.bayes-two-events/a6-q4-i-abc';
const NONCE = 'K7Q2XMPA';
const MARKS: RubricMarks = { correctness: 6, completeness: 3, rigor: 1, clarity: 2 };

describe('the rubric data', () => {
  it('has the four criteria, once each, and adds up to the supervision mark', () => {
    expect(WRITE_UP_RUBRIC.map((r) => r.id)).toEqual([...RUBRIC_CRITERIA]);
    expect(WRITE_UP_RUBRIC.reduce((a, r) => a + r.max, 0)).toBe(SUPERVISION_MARK_MAX);
  });

  it('has bands from the maximum down to 0, highest first, with no gap or overlap', () => {
    for (const r of WRITE_UP_RUBRIC) {
      const mins = r.bands.map((b) => b.min);
      expect(mins.at(-1), r.id).toBe(0);
      expect(mins[0], r.id).toBeLessThanOrEqual(r.max);
      for (let i = 1; i < mins.length; i++) expect(mins[i], r.id).toBeLessThan(mins[i - 1] as number);
      for (let m = 0; m <= r.max; m++) expect(rubricBand(r.id, m).min).toBeLessThanOrEqual(m);
    }
  });

  it('band: the band a mark falls in; a mark out of range throws', () => {
    expect(rubricBand('correctness', 8).min).toBe(7);
    expect(rubricBand('correctness', 6).min).toBe(4);
    expect(rubricBand('correctness', 0).min).toBe(0);
    expect(() => rubricBand('rigor', 5)).toThrow(/0 to 4/);
    expect(() => rubricBand('rigor', 1.5)).toThrow();
    expect(() => rubricBand('rigor', -1)).toThrow();
  });

  it('total adds the four marks', () => {
    expect(rubricTotal(MARKS)).toBe(12);
    expect(rubricTotal({ correctness: 8, completeness: 4, rigor: 4, clarity: 4 })).toBe(20);
  });

  it('lines: every criterion with its maximum and every band range, no dashes', () => {
    const text = rubricLines().join('\n');
    expect(text).toContain('Correctness, out of 8');
    expect(text).toContain('  7 to 8: ');
    expect(text).toContain('  4: Every part and every case.');
    expect(text).toContain('  0: ');
    expect(text).not.toMatch(/[–—]/);
  });

  it('summary names each mark and the weakest criterion by share, or none at full marks', () => {
    expect(rubricSummary(MARKS)).toBe(
      'By the rubric: correctness 6 of 8, completeness 3 of 4, rigor 1 of 4, clarity 2 of 4. Work on rigor first: Several steps asserted; the argument has gaps.',
    );
    expect(rubricSummary({ correctness: 8, completeness: 4, rigor: 4, clarity: 4 })).toBe('By the rubric: correctness 8 of 8, completeness 4 of 4, rigor 4 of 4, clarity 4 of 4.');
  });
});

describe('parseRubric', () => {
  it('reads its own format, in any order, any case, with ; or , between parts', () => {
    expect(parseRubric(formatRubric(MARKS))).toEqual({ ok: true, value: MARKS });
    expect(parseRubric('Clarity 2/4; rigor 1 / 4, completeness 3/4, CORRECTNESS 6/8')).toEqual({ ok: true, value: MARKS });
  });

  it.each([
    ['correctness 6/8, completeness 3/4, rigor 1/4', /missing clarity/],
    ['correctness 6/8, correctness 6/8, completeness 3/4, rigor 1/4, clarity 2/4', /twice/],
    ['correctness 6/8, completeness 3/4, rigour 1/4, clarity 2/4', /"rigour", which is not one of/],
    ['correctness 6/20, completeness 3/4, rigor 1/4, clarity 2/4', /out of 8, not 20/],
    ['correctness 9/8, completeness 3/4, rigor 1/4, clarity 2/4', /more than the most possible/],
    ['correctness six/8', /should read like/],
    [rubricTemplate().slice('RUBRIC: '.length), /should read like/],
    ['', /missing correctness, completeness, rigor, clarity/],
  ])('refuses %j', (text, error) => {
    const r = parseRubric(text);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(error);
  });
});

describe('the rubric in supervision', () => {
  const p = startLearner(T0, DEFAULT_COURSES, 60);

  it('a write-up problem\'s block prints the rubric and asks for a RUBRIC line', () => {
    const text = buildPacket({ key: PROOF, nonce: NONCE, writeUp: 'x', copiedAt: T0, progress: p });
    expect(text).toContain('--- MARKING RUBRIC ---');
    expect(text).toContain(rubricLines().join('\n'));
    expect(text).toContain(resultTemplate(PROOF, NONCE, true));
    expect(resultTemplate(PROOF, NONCE, true)).toContain(`\n${rubricTemplate()}\n`);
  });

  it('an auto-checked problem\'s block has no rubric', () => {
    const text = buildPacket({ key: TABLE, nonce: NONCE, writeUp: 'x', copiedAt: T0, progress: p, checked: { given: '1' } });
    expect(text).not.toContain('MARKING RUBRIC');
    expect(text).not.toContain('RUBRIC:');
    expect(text).toContain(resultTemplate(TABLE, NONCE));
  });

  const base: ParsedResult = {
    problem: PROOF, nonce: NONCE,
    result: { mark: 12, weakPoints: ['a', 'b', 'c'], redo: [], summary: 'Fine.' },
  };

  it('a result with a RUBRIC line that adds up is read, and prints back the same', () => {
    const block = formatResult({ ...base, rubric: MARKS });
    expect(block).toContain('RUBRIC: correctness 6/8, completeness 3/4, rigor 1/4, clarity 2/4');
    const r = parseResult(block);
    expect(r).toEqual({ ok: true, value: { ...base, rubric: MARKS } });
  });

  it('a result without a RUBRIC line is read as before', () => {
    const r = parseResult(formatResult(base));
    expect(r).toEqual({ ok: true, value: base });
    expect(r.ok && 'rubric' in r.value).toBe(false);
  });

  it('a RUBRIC line wrapped by the terminal is joined', () => {
    const block = formatResult({ ...base, rubric: MARKS }).replace(', rigor 1/4', '\nrigor 1/4');
    expect(parseResult(block)).toEqual({ ok: true, value: { ...base, rubric: MARKS } });
  });

  it('refuses a RUBRIC that does not add up to MARK, or does not read', () => {
    const off = parseResult(formatResult({ ...base, rubric: { ...MARKS, clarity: 3 } }));
    expect(off.ok).toBe(false);
    if (!off.ok) expect(off.error).toMatch(/add up to 13, but MARK is 12/);
    const bad = parseResult(formatResult(base).replace('MARK: 12/20', `MARK: 12/20\n${rubricTemplate()}`));
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error).toMatch(/RUBRIC should read like/);
    const twice = parseResult(formatResult({ ...base, rubric: MARKS }).replace('MARK: 12/20', `MARK: 12/20\nRUBRIC: ${formatRubric(MARKS)}`));
    expect(twice.ok).toBe(false);
    if (!twice.ok) expect(twice.error).toMatch(/RUBRIC appears twice/);
  });
});
