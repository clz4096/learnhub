import { describe, it, expect } from 'vitest';
import { checkProofSpec, gradeProof, type ProofAnswer, type ProofSpec } from './proof';

/**
 * P(A or B) = P(A) + P(B) - P(A and B), as five steps:
 *   s1: A u B is the disjoint union of A and B \ A.
 *   s2: B is the disjoint union of A n B and B \ A.
 *   s3: so P(A u B) = P(A) + P(B \ A)                  after s1, by additivity
 *   s4: so P(B) = P(A n B) + P(B \ A)                  after s2, by additivity
 *   s5: so P(A u B) = [a + b - c]                      after s3 and s4
 * s1 and s2 may come in either order, and so may s3 and s4 as long as each follows its own.
 */
const spec: ProofSpec = {
  steps: [
    { id: 's1' },
    { id: 's2' },
    { id: 's3', after: ['s1'], justification: { options: ['additivity', 'monotonicity', 'complement'], correct: 'additivity' } },
    { id: 's4', after: ['s2'], justification: { options: ['additivity', 'monotonicity', 'complement'], correct: 'additivity' } },
    {
      id: 's5', after: ['s3', 's4'],
      gaps: {
        formula: { kind: 'expression', expected: 'a + b - c', variables: ['a', 'b', 'c'] },
        example: { kind: 'exact', expected: '3/8' },
      },
    },
  ],
};

const right = (order: string[]): ProofAnswer => ({
  order,
  gaps: { s5: { formula: 'b - c + a', example: '0.375' } },
  justifications: { s3: 'additivity', s4: 'additivity' },
});

describe('gradeProof', () => {
  it('accepts every order the dependencies allow', () => {
    const orders = [
      ['s1', 's2', 's3', 's4', 's5'],
      ['s2', 's1', 's3', 's4', 's5'],
      ['s1', 's3', 's2', 's4', 's5'],
      ['s2', 's4', 's1', 's3', 's5'],
      ['s1', 's2', 's4', 's3', 's5'],
    ];
    for (const o of orders) {
      const g = gradeProof(right(o), spec);
      expect(g.correct, o.join(' ')).toBe(true);
      expect(g.feedback).toBeUndefined();
      expect(g.parts.order).toBe(true);
    }
  });

  it('rejects an order that uses a step before it is shown', () => {
    const g = gradeProof(right(['s3', 's1', 's2', 's4', 's5']), spec);
    expect(g.correct).toBe(false);
    expect(g.parts.order).toBe(false);
    expect(g.feedback).toMatch(/Step 1 uses something that is only shown later/);
    // The other parts are still graded, so the UI can mark them.
    expect(g.parts.gaps.s5?.formula?.correct).toBe(true);
    expect(g.parts.justifications).toEqual({ s3: true, s4: true });
  });

  it('rejects missing, repeated, and unknown steps', () => {
    expect(gradeProof(right(['s1', 's2', 's3', 's4']), spec).feedback).toMatch(/Every step must be placed/);
    expect(gradeProof(right(['s1', 's1', 's2', 's3', 's4', 's5']), spec).feedback).toMatch(/more than once/);
    expect(gradeProof(right(['s1', 's2', 's3', 's4', 's5', 's9']), spec).feedback).toMatch(/"s9" is not a step/);
  });

  it('grades gaps with the other graders', () => {
    const a = right(['s1', 's2', 's3', 's4', 's5']);
    const wrongFormula = gradeProof({ ...a, gaps: { s5: { formula: 'a + b + c', example: '3/8' } } }, spec);
    expect(wrongFormula.correct).toBe(false);
    expect(wrongFormula.parts.gaps.s5?.formula?.correct).toBe(false);
    expect(wrongFormula.feedback).toMatch(/Gap formula in step s5: At a = .*does not match/);

    const unreduced = gradeProof({ ...a, gaps: { s5: { formula: 'a+b-c', example: '6/16' } } }, spec);
    expect(unreduced.correct).toBe(true);

    const malformed = gradeProof({ ...a, gaps: { s5: { formula: 'a + (b', example: '3/0' } } }, spec);
    expect(malformed.correct).toBe(false);
    expect(malformed.feedback).toMatch(/closing "\)"/);
    expect(malformed.feedback).toMatch(/denominator is zero/);

    const empty = gradeProof({ ...a, gaps: { s5: { formula: '  ' } } }, spec);
    expect(empty.feedback).toMatch(/Gap formula in step s5: Fill this gap\..*Gap example in step s5: Fill this gap\./);
  });

  it('grades justification picks', () => {
    const a = right(['s1', 's2', 's3', 's4', 's5']);
    const g = gradeProof({ ...a, justifications: { s3: 'monotonicity' } }, spec);
    expect(g.correct).toBe(false);
    expect(g.parts.justifications).toEqual({ s3: false, s4: false });
    expect(g.feedback).toMatch(/justification for step s3 is not right/);
    expect(g.feedback).toMatch(/Step s4 needs a justification/);
  });

  it('gives a stable normalized answer', () => {
    const g = gradeProof(right(['s2', 's1', 's3', 's4', 's5']), spec);
    expect(g.normalizedAnswer).toBe('order: s2, s1, s3, s4, s5; s3 because: additivity; s4 because: additivity; s5.formula: b - c + a; s5.example: 3/8');
  });

  it('numeric and choice gaps', () => {
    const s: ProofSpec = {
      steps: [{ id: 'only', gaps: { p: { kind: 'numeric', expected: Math.exp(-1) }, which: { kind: 'choice', options: ['x', 'y'], correct: 'y' } } }],
    };
    expect(gradeProof({ order: ['only'], gaps: { only: { p: '0.3679', which: 'y' } } }, s).correct).toBe(true);
    expect(gradeProof({ order: ['only'], gaps: { only: { p: '0.3679', which: 'x' } } }, s).correct).toBe(false);
  });

  it('malformed answers do not throw', () => {
    const bad = [null, undefined, {}, { order: 'not an array' }, { order: [1, 2] }, { order: null }] as unknown as ProofAnswer[];
    for (const a of bad) {
      expect(() => gradeProof(a, spec)).not.toThrow();
      expect(gradeProof(a, spec).correct).toBe(false);
    }
  });
});

describe('checkProofSpec', () => {
  it('accepts a valid spec', () => {
    expect(checkProofSpec(spec)).toBeNull();
  });

  it('reports broken specs, and gradeProof turns them into problem errors', () => {
    const cases: [ProofSpec, RegExp][] = [
      [{ steps: [] }, /no steps/],
      [{ steps: [{ id: 'a' }, { id: 'a' }] }, /duplicate step ids/],
      [{ steps: [{ id: 'a', after: ['z'] }] }, /unknown step z/],
      [{ steps: [{ id: 'a', after: ['b'] }, { id: 'b', after: ['a'] }] }, /cycle/],
      [{ steps: [{ id: 'a', after: ['a'] }] }, /cycle/],
      [{ steps: [{ id: 'a', justification: { options: ['p'], correct: 'q' } }] }, /justification is not an option/],
    ];
    for (const [s, re] of cases) {
      expect(checkProofSpec(s)).toMatch(re);
      const g = gradeProof({ order: s.steps.map((x) => x.id) }, s);
      expect(g.correct).toBe(false);
      expect(g.feedback).toMatch(/^Problem error/);
    }
  });
});
