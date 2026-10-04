/**
 * The answer box's symbol keypad, its hint line, and its input mode (design decision 19c).
 * Keys are chosen by the kind of answer: a number gets the fraction bar and the signs a
 * phone's number pad lacks; an expression gets powers, roots, pi, and brackets. Set and
 * logic keys appear only for expression answers in those areas, since no other grader
 * can read the symbols.
 */
import type { AnswerSpec } from '@learnhub/content';

export type TextSpec = Exclude<AnswerSpec, { kind: 'choice' }>;

export interface Key {
  /** What the key shows. */
  label: string;
  /** What a screen reader says, and the tooltip. */
  name: string;
  /** Text inserted at the cursor. With `close`, the selection (if any) is wrapped: insert, selection, close. */
  insert: string;
  close?: string;
}

const k = (label: string, name: string, insert: string, close?: string): Key => (close === undefined ? { label, name, insert } : { label, name, insert, close });

const FRACTION = k('/', 'fraction bar', '/');
const MINUS = k('−', 'minus', '-');
const POINT = k('.', 'decimal point', '.');
const RATIO = k(':', 'ratio colon', ':');
const POWER = k('xⁿ', 'power', '^');
const SQUARE = k('x²', 'squared', '^2');
const TIMES = k('×', 'times', '×');
const DIVIDE = k('÷', 'divide', '÷');
const ROOT = k('√', 'square root', '√(', ')');
const PI = k('π', 'pi', 'π');
const OPEN = k('(', 'open bracket', '(');
const CLOSE = k(')', 'close bracket', ')');
const FACTORIAL = k('!', 'factorial', '!');
const CHOOSE = k('C(n, k)', 'n choose k', 'C(', ', )');
const SETS = [k('∪', 'union', '∪'), k('∩', 'intersection', '∩'), k('∈', 'element of', '∈'), k('∅', 'empty set', '∅'), k('{', 'open brace', '{'), k('}', 'close brace', '}')];
const LOGIC = [k('∧', 'and', '∧'), k('∨', 'or', '∨'), k('¬', 'not', '¬'), k('⇒', 'implies', '⇒')];

/** The keys for an answer, in a fixed order so they never move under the learner's thumb. */
export function keypadFor(spec: TextSpec, topicId: string): Key[] {
  if (spec.kind !== 'expression') return spec.kind === 'exact' && spec.ratio === true ? [FRACTION, MINUS, POINT, RATIO] : [FRACTION, MINUS, POINT];
  const keys = [POWER, SQUARE, FRACTION, TIMES, DIVIDE, ROOT, PI, OPEN, CLOSE, FACTORIAL];
  if (spec.binomial === true) keys.push(CHOOSE);
  if (topicId.startsWith('sets.') || topicId === 'pre.set-notation') keys.push(...SETS);
  if (topicId.startsWith('logic.')) keys.push(...LOGIC);
  return keys;
}

/**
 * The text after pressing `key` with the selection [start, end), and where the cursor
 * goes: after the inserted text, or inside the brackets of a wrapping key when nothing
 * was selected, so √ then 2 gives √(2).
 */
export function insertKey(value: string, start: number, end: number, key: Key): { value: string; caret: number } {
  const a = Math.max(0, Math.min(start, value.length));
  const b = Math.max(a, Math.min(end, value.length));
  const selected = value.slice(a, b);
  if (key.close === undefined) return { value: value.slice(0, a) + key.insert + value.slice(b), caret: a + key.insert.length };
  const text = key.insert + selected + key.close;
  return { value: value.slice(0, a) + text + value.slice(b), caret: selected === '' ? a + key.insert.length : a + text.length };
}

/** The phone keyboard to ask for: the number pad for numbers (the keypad adds the signs it lacks), letters for expressions. */
export function inputModeFor(spec: TextSpec): 'decimal' | 'text' {
  return spec.kind === 'expression' ? 'text' : 'decimal';
}

/** One or two short sentences on what the box accepts. */
export function hintFor(spec: TextSpec): string {
  switch (spec.kind) {
    case 'exact':
      return `A whole number, a fraction like 3/8 or 3÷8, or an exact decimal like 0.375.${spec.ratio === true ? ' A ratio like 3:8 works too.' : ''} Enter checks it.`;
    case 'numeric':
      return 'A number, like 0.125, 1.5e-3, or 3/8. Enter checks it.';
    case 'expression': {
      const vars = spec.variables.join(' and ');
      const v = spec.variables[0] ?? 'x';
      const choose = spec.binomial === true ? ' C(n, k) or nCk means n choose k.' : '';
      return `An expression in ${vars}: 2${v} is 2 times ${v}, ${v}^2 is a power, √${v} or sqrt(${v}) a root, and π or pi is pi.${choose} Enter checks it.`;
    }
  }
}
