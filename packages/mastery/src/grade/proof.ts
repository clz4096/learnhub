/**
 * Structured proofs: the learner orders the steps, fills the gaps, and picks each step's
 * justification. This is the mastery gate for proof topics (design decision 4); free-form
 * proofs are practice only.
 *
 * A proof usually has more than one valid order. The problem gives each step the steps it
 * depends on (`after`), and any order that puts every step after its dependencies is
 * accepted. Gaps are graded by the other graders, so a gap answer of 3/8, 0.375, or an
 * equivalent expression is judged exactly as it would be on its own.
 */
import { gradeChoice } from './choice';
import { gradeExpression, type VariableDomain } from './expression';
import { gradeNumeric } from './numeric';
import { gradeExact } from './rational';
import { problemError, type GradeResult } from './types';

export type GapSpec =
  | { kind: 'exact'; expected: string; requireLowestTerms?: boolean }
  | { kind: 'numeric'; expected: number; relTol?: number; absTol?: number }
  | { kind: 'expression'; expected: string; variables: readonly string[]; domains?: Readonly<Record<string, VariableDomain>> }
  | { kind: 'choice'; options: readonly string[]; correct: string | readonly string[] };

export interface ProofStepSpec {
  id: string;
  /** Steps that must come before this one. */
  after?: readonly string[];
  /** Gap id to how it is graded. */
  gaps?: Readonly<Record<string, GapSpec>>;
  /** The reason this step holds, chosen from options. */
  justification?: { options: readonly string[]; correct: string };
}

export interface ProofSpec {
  steps: readonly ProofStepSpec[];
}

export interface ProofAnswer {
  order: readonly string[];
  /** Step id to gap id to the learner's text. */
  gaps?: Readonly<Record<string, Readonly<Record<string, string>>>>;
  /** Step id to the chosen justification. */
  justifications?: Readonly<Record<string, string>>;
}

export interface ProofGrade extends GradeResult {
  /** Per part, so the UI can mark each step. */
  parts: {
    order: boolean;
    gaps: Record<string, Record<string, GradeResult>>;
    justifications: Record<string, boolean>;
  };
}

/** A problem error in the spec, or null. Duplicate ids, unknown dependencies, and cycles. */
export function checkProofSpec(spec: ProofSpec): string | null {
  const ids = spec.steps.map((s) => s.id);
  if (new Set(ids).size !== ids.length) return 'duplicate step ids';
  if (ids.length === 0) return 'no steps';
  for (const s of spec.steps) {
    for (const d of s.after ?? []) if (!ids.includes(d)) return `step ${s.id} depends on unknown step ${d}`;
    if (s.justification && !s.justification.options.includes(s.justification.correct)) return `step ${s.id}: the correct justification is not an option`;
  }
  // Kahn's algorithm: if some step never becomes free, the dependencies have a cycle.
  const placed = new Set<string>();
  for (let progress = true; progress;) {
    progress = false;
    for (const s of spec.steps) {
      if (!placed.has(s.id) && (s.after ?? []).every((d) => placed.has(d))) {
        placed.add(s.id);
        progress = true;
      }
    }
  }
  return placed.size === ids.length ? null : 'the step dependencies have a cycle';
}

function gradeGap(text: string, g: GapSpec): GradeResult {
  switch (g.kind) {
    case 'exact': return gradeExact(text, g.expected, { requireLowestTerms: g.requireLowestTerms });
    case 'numeric': return gradeNumeric(text, g.expected, { relTol: g.relTol, absTol: g.absTol });
    case 'expression': return gradeExpression(text, g.expected, { variables: g.variables, domains: g.domains });
    case 'choice': return gradeChoice(text, { options: g.options, correct: g.correct });
  }
}

/** Why `order` is not a valid order, or null when every step comes after its dependencies. */
function orderProblem(spec: ProofSpec, order: readonly string[]): string | null {
  const ids = spec.steps.map((s) => s.id);
  const unknown = order.find((id) => !ids.includes(id));
  if (unknown !== undefined) return `"${unknown}" is not a step of this proof.`;
  if (new Set(order).size !== order.length) return 'A step is used more than once.';
  const missing = ids.find((id) => !order.includes(id));
  if (missing !== undefined) return 'Every step must be placed.';
  const pos = new Map(order.map((id, i) => [id, i] as const));
  for (const s of spec.steps) {
    for (const d of s.after ?? []) {
      if ((pos.get(d) ?? 0) > (pos.get(s.id) ?? 0)) return `Step ${(pos.get(s.id) ?? 0) + 1} uses something that is only shown later.`;
    }
  }
  return null;
}

/** Grades every part; right only when the order, every gap, and every justification are right. */
export function gradeProof(answer: ProofAnswer, spec: ProofSpec): ProofGrade {
  const raw = Array.isArray(answer?.order) ? answer.order.join(' > ') : '';
  const bad = checkProofSpec(spec);
  if (bad !== null) return { ...problemError(bad, raw), parts: { order: false, gaps: {}, justifications: {} } };
  if (!Array.isArray(answer?.order) || answer.order.some((x) => typeof x !== 'string')) {
    return { correct: false, feedback: 'Put the steps in order.', normalizedAnswer: '', parts: { order: false, gaps: {}, justifications: {} } };
  }

  const feedback: string[] = [];
  const op = orderProblem(spec, answer.order);
  if (op !== null) feedback.push(op);

  const gaps: Record<string, Record<string, GradeResult>> = {};
  const justifications: Record<string, boolean> = {};
  const norm: string[] = [`order: ${answer.order.join(', ')}`];
  for (const s of spec.steps) {
    for (const [gid, g] of Object.entries(s.gaps ?? {})) {
      const text = answer.gaps?.[s.id]?.[gid];
      const r: GradeResult = typeof text === 'string' && text.trim() !== ''
        ? gradeGap(text, g)
        : { correct: false, feedback: 'Fill this gap.', normalizedAnswer: '' };
      (gaps[s.id] ??= {})[gid] = r;
      norm.push(`${s.id}.${gid}: ${r.normalizedAnswer}`);
      if (!r.correct) feedback.push(`Gap ${gid} in step ${s.id}: ${r.feedback ?? 'not right.'}`);
    }
    if (s.justification) {
      const pick = answer.justifications?.[s.id];
      const ok = pick === s.justification.correct;
      justifications[s.id] = ok;
      norm.push(`${s.id} because: ${pick ?? ''}`);
      if (!ok) feedback.push(pick === undefined ? `Step ${s.id} needs a justification.` : `The justification for step ${s.id} is not right.`);
    }
  }

  const correct = feedback.length === 0;
  return {
    correct,
    ...(correct ? {} : { feedback: feedback.join(' ') }),
    normalizedAnswer: norm.join('; '),
    parts: { order: op === null, gaps, justifications },
  };
}
