/**
 * The generator audit (assessment that proves learning, phase 1): every generator, over
 * many seeds, is checked for the properties a problem must have before its result can be
 * trusted as evidence of learning. The content checks (content.test.ts) already require a
 * sane instance, an accepted reference answer, and rejected misconceptions; the audit adds
 * what those do not look at:
 *
 * - the reference solver agrees with the answer the problem states, not only with the
 *   grader (a solver and a spec that drift apart are both "accepted" by a lenient grader);
 * - the answer is unique: a choice problem has distinct options, its correct set is a
 *   proper, non-empty subset of them, and a table has exactly one expected value per blank;
 * - every misconception is distinct from the answer, and a choice misconception is an
 *   option the learner can pick. Two slips that give the same answer for some numbers are
 *   reported as a warning (`AUDIT_WARNINGS`), not a failure: grading then gives both
 *   explanations (problem.ts, `grade`), and such numbers are often the natural ones;
 * - no degenerate case: no NaN, Infinity, or undefined in the text, no "+ -" or a
 *   coefficient of 1 or 0 written out in the mathematics, and a numeric answer is finite.
 *
 * `auditGenerator` returns the issues it finds, so the audit test can name every one; it
 * never throws on a bad generator (a throwing generator is itself an issue).
 */
import type { Generator, Instance, Response } from './problem';
import { grade, sameAnswer } from './problem';
import { plain, type Rich } from './rich';

/** The audit's seed count: the same 1,000 as the content checks. */
export const AUDIT_SEEDS = 1000;

export type AuditCode =
  | 'throws'
  | 'not-sane'
  | 'reference-rejected'
  | 'reference-disagrees'
  | 'answer-not-unique'
  | 'too-few-misconceptions'
  | 'misconception-accepted'
  | 'misconception-is-answer'
  | 'misconceptions-alike'
  | 'misconception-not-an-option'
  | 'degenerate';

export interface AuditIssue {
  code: AuditCode;
  seed: number;
  detail: string;
}

/** Codes the audit reports but does not fail on. */
export const AUDIT_WARNINGS: ReadonlySet<AuditCode> = new Set(['misconceptions-alike']);

/** Text that only a bug produces: a JavaScript value printed into the problem. */
const BROKEN_TEXT = /\b(?:NaN|undefined|Infinity|null)\b|\[object /;

/**
 * LaTeX that a generator wrote without simplifying: a sign pair ("+ -", "- -", "+ +"), a
 * coefficient of 1 or 0 before a letter ("1x", "0n" not after another digit, a dot, or a
 * letter), or a power of 1 ("x^{1}", "x^1"). Each is a degenerate parameter choice.
 */
const DEGENERATE_TEX: readonly { re: RegExp; what: string }[] = [
  { re: /[+-]\s*[+-]/, what: 'a sign pair' },
  { re: /(?<![\d.,{}_A-Za-z\\])[01]\s?[a-z](?![a-z])/, what: 'a coefficient of 1 or 0' },
  { re: /\^\{?1\}?(?![\d.])/, what: 'a power of 1' },
];

function mathSpans(r: Rich): string[] {
  return r.filter((s) => s.kind === 'math').map((s) => s.text);
}

const show = (r: Response): string => JSON.stringify(r);

/** Every rich text of an instance a learner reads before answering. */
const promptTexts = (inst: Instance): Rich[] => [inst.problem.prompt, ...(inst.problem.answer.kind === 'choice' ? inst.problem.answer.options.map((o) => o.label) : [])];

/** The issues of one instance, made from `seed`. */
export function auditInstance(inst: Instance, seed: number): AuditIssue[] {
  const out: AuditIssue[] = [];
  const add = (code: AuditCode, detail: string): void => {
    out.push({ code, seed, detail });
  };
  const { problem, reference, misconceptions } = inst;
  const spec = problem.answer;

  if (inst.saneError !== null) add('not-sane', inst.saneError);
  const ok = grade(problem, reference);
  if (!ok.correct) add('reference-rejected', `${show(reference)}: ${ok.feedback ?? ''}`);

  // The reference solver against the stated answer, and the answer's uniqueness.
  switch (spec.kind) {
    case 'exact':
    case 'expression':
    case 'formula':
      if (!sameAnswer(spec, reference, spec.expected)) add('reference-disagrees', `solver ${show(reference)}, stated ${spec.expected}`);
      break;
    case 'numeric':
      if (!Number.isFinite(spec.expected)) add('degenerate', `numeric answer ${spec.expected}`);
      else if (!sameAnswer(spec, reference, String(spec.expected))) add('reference-disagrees', `solver ${show(reference)}, stated ${spec.expected}`);
      break;
    case 'choice': {
      const ids = spec.options.map((o) => o.id);
      const correct = typeof spec.correct === 'string' ? [spec.correct] : [...spec.correct];
      if (new Set(ids).size !== ids.length) add('answer-not-unique', `option ids repeat: ${ids.join(', ')}`);
      const labels = spec.options.map((o) => plain(o.label).replace(/\s+/g, ' ').trim());
      if (new Set(labels).size !== labels.length) add('answer-not-unique', `two options read alike: ${labels.join(' | ')}`);
      if (spec.options.length < 2) add('answer-not-unique', 'fewer than two options');
      if (correct.length === 0 || correct.some((c) => !ids.includes(c))) add('answer-not-unique', `correct ${correct.join(', ')} is not among the options`);
      // "Choose all that apply" may have every option right; a single choice cannot.
      if (typeof spec.correct === 'string' && correct.length === ids.length) add('answer-not-unique', 'every option is correct');
      if (!sameAnswer(spec, reference, correct)) add('reference-disagrees', `solver ${show(reference)}, stated ${correct.join(', ')}`);
      break;
    }
    case 'table': {
      const blanks = spec.rows.reduce((n, r) => n + r.filter((c) => c === null).length, 0);
      if (blanks !== spec.expected.length) add('answer-not-unique', `${blanks} blanks but ${spec.expected.length} expected values`);
      if (spec.rows.some((r) => r.length !== spec.columns.length)) add('degenerate', 'a row does not match the columns');
      if (!sameAnswer(spec, reference, spec.expected)) add('reference-disagrees', `solver ${show(reference)}, stated ${spec.expected.join(', ')}`);
      break;
    }
    case 'witness':
      if (!grade(problem, spec.example).correct) add('reference-disagrees', `the shown example ${spec.example} is not accepted`);
      break;
  }

  // Misconceptions: at least two, each wrong, each its own answer.
  if (misconceptions.length < 2) add('too-few-misconceptions', `${misconceptions.length} left after removing those that are right for these numbers`);
  misconceptions.forEach((m, i) => {
    const r = grade(problem, m.response, misconceptions);
    if (r.correct) add('misconception-accepted', show(m.response));
    // An answer with a required form (factorised, in lowest terms) is right in value and wrong in form, so its slip may share the value.
    const formOnly = (spec.kind === 'expression' && spec.form !== undefined) || (spec.kind === 'exact' && spec.requireLowestTerms === true);
    if (!formOnly && !r.correct && sameAnswer(spec, m.response, reference)) add('misconception-is-answer', show(m.response));
    if (spec.kind === 'choice') {
      const picks = typeof m.response === 'string' ? [m.response] : m.response;
      if (picks.some((p) => !spec.options.some((o) => o.id === p))) add('misconception-not-an-option', show(m.response));
    }
    for (let j = 0; j < i; j++) {
      const other = misconceptions[j];
      if (other !== undefined && sameAnswer(spec, m.response, other.response)) add('misconceptions-alike', `${show(other.response)} and ${show(m.response)}`);
    }
  });

  // Degenerate cases in what the learner reads.
  for (const r of promptTexts(inst)) {
    const text = plain(r);
    const bad = BROKEN_TEXT.exec(text);
    if (bad !== null) add('degenerate', `"${bad[0]}" in "${text.slice(0, 80)}"`);
    for (const tex of mathSpans(r)) {
      for (const d of DEGENERATE_TEX) {
        if (d.re.test(tex)) add('degenerate', `${d.what} in $${tex}$`);
      }
    }
  }
  return out;
}

/** Runs `g` over seeds 1 to `seeds` and returns every issue, in seed order. */
export function auditGenerator(g: Generator, seeds = AUDIT_SEEDS): AuditIssue[] {
  const out: AuditIssue[] = [];
  for (let seed = 1; seed <= seeds; seed++) {
    let inst: Instance;
    try {
      inst = g.instance(seed);
    } catch (e) {
      out.push({ code: 'throws', seed, detail: e instanceof Error ? e.message : String(e) });
      continue;
    }
    out.push(...auditInstance(inst, seed));
  }
  return out;
}

/** One line per issue code, with the count and the first seed: what the audit test prints. */
export function summarizeAudit(issues: readonly AuditIssue[]): string[] {
  const by = new Map<AuditCode, AuditIssue[]>();
  for (const i of issues) by.set(i.code, [...(by.get(i.code) ?? []), i]);
  return [...by].map(([code, list]) => {
    const first = list[0] as AuditIssue;
    return `${code}: ${list.length} seed${list.length === 1 ? '' : 's'}, first seed ${first.seed}: ${first.detail}`;
  });
}
