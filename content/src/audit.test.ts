/**
 * The generator audit (audit.ts): its checks on generators made to fail, then every
 * generator in the content over `AUDIT_SEEDS` seeds. A failure names the generator, the
 * issue, the number of seeds, and the first seed, so the generator can be fixed.
 */
import { describe, expect, it } from 'vitest';
import { AUDIT_SEEDS, AUDIT_WARNINGS, auditGenerator, auditInstance, summarizeAudit, type AuditCode } from './audit';
import { int } from './math';
import { generator, grade, type AnswerSpec, type Misconception } from './problem';
import { math, t } from './rich';
import { TOPIC_CONTENT } from './topics';

interface P { a: number; b: number }

/** A sum generator whose parts can be swapped for broken ones. */
function adder(over: {
  answer?: (p: P) => AnswerSpec;
  solve?: (p: P) => string | readonly string[];
  misconceptions?: (p: P) => Misconception[];
  prompt?: (p: P) => ReturnType<typeof t>;
  params?: (rng: () => number) => P;
} = {}) {
  return generator<P>({
    id: 'add', skill: 'Add.',
    params: over.params ?? ((rng) => ({ a: int(rng, 2, 9), b: int(rng, 2, 9) })),
    sane: () => null,
    problem: (p) => ({
      prompt: over.prompt?.(p) ?? t`What is ${math`${p.a} + ${p.b}`}?`,
      answer: over.answer?.(p) ?? { kind: 'exact', expected: String(p.a + p.b) },
      solution: [],
    }),
    solve: over.solve ?? ((p) => String(p.a + p.b)),
    misconceptions: over.misconceptions ?? ((p) => [
      { response: String(p.a * p.b + 100), why: t`Multiplied.` },
      { response: String(p.a - p.b + 100), why: t`Subtracted.` },
    ]),
  });
}

const codes = (issues: readonly { code: AuditCode }[]): AuditCode[] => [...new Set(issues.map((i) => i.code))].sort();

describe('the audit\'s checks', () => {
  it('passes a sound generator', () => {
    expect(auditGenerator(adder(), 200)).toEqual([]);
  });

  it('catches a solver that disagrees with the stated answer the grader still accepts', () => {
    // A witness problem accepts any valid witness; the example it shows after a miss must be one too.
    const g = adder({
      answer: (p) => ({ kind: 'witness', example: String(p.a + p.b + 1), count: 1, check: (v) => (Number(v[0]?.num) === p.a + p.b ? null : 'no') }),
      misconceptions: () => [{ response: '1000', why: t`x` }, { response: '1001', why: t`y` }],
    });
    expect(codes(auditGenerator(g, 20))).toEqual(['reference-disagrees']);
  });

  it('catches a rejected reference', () => {
    expect(codes(auditGenerator(adder({ solve: (p) => String(p.a + p.b + 1) }), 20))).toContain('reference-rejected');
  });

  it('catches choice problems without a unique answer', () => {
    const opts = (labels: string[]) => labels.map((l, i) => ({ id: `o${i}`, label: t`${l}` }));
    const twoAlike = adder({ answer: () => ({ kind: 'choice', options: opts(['yes', 'yes', 'no']), correct: 'o0' }), solve: () => 'o0', misconceptions: () => [{ response: 'o1', why: t`x` }, { response: 'o2', why: t`y` }] });
    expect(codes(auditGenerator(twoAlike, 3))).toEqual(['answer-not-unique']);
    const missing = adder({ answer: () => ({ kind: 'choice', options: opts(['yes', 'no', 'maybe']), correct: 'o9' }), solve: () => 'o9', misconceptions: () => [{ response: 'o1', why: t`x` }, { response: 'o2', why: t`y` }] });
    expect(codes(auditGenerator(missing, 3))).toContain('answer-not-unique');
    const notOption = adder({ answer: () => ({ kind: 'choice', options: opts(['yes', 'no', 'maybe']), correct: 'o0' }), solve: () => 'o0', misconceptions: () => [{ response: 'o1', why: t`x` }, { response: 'o7', why: t`y` }] });
    expect(codes(auditGenerator(notOption, 3))).toEqual(['misconception-not-an-option']);
  });

  it('catches a table whose blanks and expected values do not match', () => {
    const g = adder({
      answer: (p) => ({ kind: 'table', columns: [t`a`, t`b`], rows: [[t`x`, null], [null, null]], expected: [String(p.a), String(p.b)], cell: 'exact' }),
      solve: (p) => [String(p.a), String(p.b)],
      misconceptions: () => [{ response: ['100', '100'], why: t`x` }, { response: ['101', '101'], why: t`y` }],
    });
    expect(codes(auditGenerator(g, 3))).toContain('answer-not-unique');
  });

  it('catches too few misconceptions, and slips that agree (a warning)', () => {
    // The generator drops a slip that is right for its numbers, so a + b + 0 leaves one.
    const one = adder({ misconceptions: (p) => [{ response: String(p.a + p.b), why: t`Right by accident.` }, { response: '1000', why: t`Wrong.` }] });
    expect(codes(auditGenerator(one, 5))).toEqual(['too-few-misconceptions']);
    const alike = adder({ misconceptions: () => [{ response: '1000', why: t`One.` }, { response: '1000', why: t`Two.` }] });
    expect(codes(auditGenerator(alike, 5))).toEqual(['misconceptions-alike']);
    expect(AUDIT_WARNINGS.has('misconceptions-alike')).toBe(true);
  });

  it('a slip in the wrong form only is not "the answer"; one equal in value otherwise is', () => {
    const inst = adder().instance(1);
    const lowest = { ...inst, problem: { ...inst.problem, answer: { kind: 'exact', expected: '1/2', requireLowestTerms: true } as AnswerSpec }, reference: '1/2', misconceptions: [{ response: '2/4', why: t`Not reduced.` }, { response: '3/4', why: t`Wrong.` }] };
    expect(codes(auditInstance(lowest, 1))).toEqual([]);
  });

  it('catches degenerate text: a printed NaN, a sign pair, a coefficient or power of 1', () => {
    const cases: [string, ReturnType<typeof t>][] = [
      ['NaN', t`What is ${String(Number.NaN)} plus two?`],
      ['sign pair', [math`${3} + -${2}`]],
      ['coefficient', [math`${1}x + ${2}`]],
      ['zero coefficient', [math`${0}y + ${2}`]],
      ['power', [math`x^{${1}}`]],
    ];
    for (const [what, prompt] of cases) {
      expect(codes(auditGenerator(adder({ prompt: () => prompt }), 2)), what).toEqual(['degenerate']);
    }
    // Not degenerate: 10x, 21x, x_1, 1.5x, a power of 12.
    for (const prompt of [[math`${10}x`], [math`${21}x`], [math`x_{${1}}`], [math`${1.5}x`], [math`x^{${12}}`]]) {
      expect(auditGenerator(adder({ prompt: () => prompt }), 2), prompt[0]?.text).toEqual([]);
    }
  });

  it('records a generator that throws, and keeps going', () => {
    const g = adder({ params: () => { throw new Error('boom'); } });
    const issues = auditGenerator(g, 3);
    expect(issues.map((i) => [i.code, i.seed])).toEqual([['throws', 1], ['throws', 2], ['throws', 3]]);
    expect(summarizeAudit(issues)).toEqual(['throws: 3 seeds, first seed 1: boom']);
  });
});

describe('grading slips that agree', () => {
  it('gives both explanations when two slips give the same answer', () => {
    const inst = adder({ misconceptions: () => [{ response: '1000', why: t`One.` }, { response: '1000', why: t`Two.` }, { response: '1001', why: t`Three.` }] }).instance(1);
    const r = grade(inst.problem, '1000', inst.misconceptions);
    expect(r.misconception?.map((s) => s.text).join('')).toBe('One. Or another slip gives the same answer: Two.');
    expect(grade(inst.problem, '1001', inst.misconceptions).misconception?.map((s) => s.text).join('')).toBe('Three.');
  });
});

describe(`every generator, ${AUDIT_SEEDS} seeds`, () => {
  for (const c of TOPIC_CONTENT) {
    if (c.generators.length === 0) continue;
    it(c.topicId, () => {
      const failures: string[] = [];
      for (const g of c.generators) {
        const issues = auditGenerator(g).filter((i) => !AUDIT_WARNINGS.has(i.code));
        if (issues.length > 0) failures.push(`${g.id}: ${summarizeAudit(issues).join('; ')}`);
      }
      expect(failures).toEqual([]);
    }, 120_000);
  }
});
