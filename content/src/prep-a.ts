/**
 * Helpers shared by the Preparation group A topics (algebra, functions, and inequalities:
 * STEP Support Foundation Blocks 1 to 5): answers that are sets of values or named values,
 * solution sets of inequalities as unions of intervals with a multiple-choice answer, and
 * a sign test that finds such a set by brute force, so a generator's reference solver
 * never shares the reasoning of its worked solution. A topic that imports it pulls it
 * into its own chunk.
 */
import { formatRational, parseRational } from '@learnhub/mastery';
import { auto, type AutoProblem, type AutoSpec, type Citation, type Official } from './cambridge';
import { eq, q, str, toFloat, type Rational } from './math';
import type { AnswerSpec, ChoiceOption, Misconception, Response } from './problem';
import { texOfRational, type Rich, type Span } from './rich';
import type { WorkedExample } from './topic';

/** A set of values as a key that ignores order. */
export const setKey = (xs: readonly Rational[]): string => xs.map(str).sort().join(',');
/** Values as typed: 3, -1/2. */
export const asList = (xs: readonly Rational[]): string => xs.map(str).join(', ');
/** How many of `xs` differ from `right` and from each other. */
export const distinctFrom = (right: string, xs: readonly string[]): number => new Set(xs.filter((x) => x !== right)).size;

/** An answer that is a set of values, in any order: the roots of an equation, say. */
export function setAnswer(expected: readonly Rational[], hint: string): AnswerSpec {
  const want = setKey(expected);
  return {
    kind: 'witness', count: expected.length, unordered: true, example: asList(expected),
    check: (vals) => (setKey(vals) === want ? null : hint),
  };
}

/** An answer of named values, such as a = 207, b = 94. */
export function namedAnswer(names: readonly string[], expected: readonly Rational[], hint: string): AnswerSpec {
  return {
    kind: 'witness', count: names.length, names, example: names.map((n, i) => `${n} = ${str(expected[i] as Rational)}`).join(', '),
    check: (vals) => (vals.every((v, i) => eq(v, expected[i] as Rational)) ? null : hint),
  };
}

/** Named values as the learner would type them. */
export const named = (names: readonly string[], vals: readonly Rational[]): string => names.map((n, i) => `${n} = ${str(vals[i] as Rational)}`).join(', ');

/** A worked example with the line on what the examiner looks for. */
export const withExaminer = (e: WorkedExample, examiner: Rich): WorkedExample => ({ ...e, examiner });

// ---------------------------------------------------------------- intervals

/** One interval of the real line; a null end is unbounded. */
export interface Interval {
  lo: Rational | null;
  loIn: boolean;
  hi: Rational | null;
  hiIn: boolean;
}

export const open = (lo: Rational | null, hi: Rational | null): Interval => ({ lo, loIn: false, hi, hiIn: false });
export const closed = (lo: Rational | null, hi: Rational | null): Interval => ({ lo, loIn: lo !== null, hi, hiIn: hi !== null });
export const point = (x: Rational): Interval => ({ lo: x, loIn: true, hi: x, hiIn: true });

/** A set of reals as a union of intervals, in order. */
export type RealSet = readonly Interval[];

const texR = (r: Rational): string => texOfRational(r);

/** One interval as an inequality in v: x < -1, -1 \le x < 4, x = 2. */
function intervalTex(i: Interval, v: string): string {
  if (i.lo !== null && i.hi !== null && eq(i.lo, i.hi)) return `${v} = ${texR(i.lo)}`;
  const left = i.lo === null ? '' : `${texR(i.lo)} ${i.loIn ? '\\le' : '<'} `;
  const right = i.hi === null ? '' : ` ${i.hiIn ? '\\le' : '<'} ${texR(i.hi)}`;
  if (i.lo === null && i.hi === null) return `${v} \\in \\mathbb{R}`;
  if (i.lo === null) return `${v}${right}`;
  if (i.hi === null) return `${v} ${i.loIn ? '\\ge' : '>'} ${texR(i.lo)}`;
  return `${left}${v}${right}`;
}

/** A set as LaTeX: "x < -1 or x > 4", "no real x", "every real x except 1". */
export function realSetTex(s: RealSet, v = 'x'): string {
  if (s.length === 0) return `\\text{no real } ${v}`;
  // Everything but a single point, written as such: it reads better than two rays.
  if (s.length === 2) {
    const [a, b] = s as [Interval, Interval];
    if (a.lo === null && b.hi === null && a.hi !== null && b.lo !== null && eq(a.hi, b.lo) && !a.hiIn && !b.loIn) return `${v} \\ne ${texR(a.hi)}`;
  }
  return s.map((i) => intervalTex(i, v)).join(' \\text{ or } ');
}

/** The set as a math span. */
export const realSetSpan = (s: RealSet, v = 'x'): Span => ({ kind: 'math', text: realSetTex(s, v), typed: [] });

/** Whether x lies in the set. */
export function inSet(s: RealSet, x: number): boolean {
  return s.some((i) => {
    const lo = i.lo === null ? -Infinity : toFloat(i.lo);
    const hi = i.hi === null ? Infinity : toFloat(i.hi);
    const okLo = i.loIn ? x >= lo - 1e-12 : x > lo + 1e-12;
    const okHi = i.hiIn ? x <= hi + 1e-12 : x < hi - 1e-12;
    return okLo && okHi;
  });
}

/**
 * The set { x : test(x) } by brute force, given every point where test can change its
 * value (the roots, and any points where the expression is undefined): test each such point
 * and a point inside each gap between them, then join neighbouring pieces. Exact at the
 * critical points (they are rational); the gaps are sampled at their midpoints.
 */
export function setWhere(test: (x: Rational) => boolean, critical: readonly Rational[]): Interval[] {
  const cs = [...critical].sort((a, b) => toFloat(a) - toFloat(b)).filter((c, i, a) => i === 0 || !eq(c, a[i - 1] as Rational));
  // Pieces in order: (-inf, c0), {c0}, (c0, c1), {c1}, ..., (ck, inf).
  const pieces: { iv: Interval; on: boolean }[] = [];
  const mid = (a: Rational, b: Rational): Rational => q(a.num * b.den + b.num * a.den, 2n * a.den * b.den);
  const below = (c: Rational): Rational => q(c.num - 5n * c.den, c.den);
  const above = (c: Rational): Rational => q(c.num + 5n * c.den, c.den);
  if (cs.length === 0) return test(q(0)) ? [open(null, null)] : [];
  pieces.push({ iv: open(null, cs[0] as Rational), on: test(below(cs[0] as Rational)) });
  cs.forEach((c, i) => {
    pieces.push({ iv: point(c), on: test(c) });
    const next = cs[i + 1];
    pieces.push(next === undefined ? { iv: open(c, null), on: test(above(c)) } : { iv: open(c, next), on: test(mid(c, next)) });
  });
  const out: Interval[] = [];
  for (const { iv, on } of pieces) {
    if (!on) continue;
    const last = out[out.length - 1];
    // Join when this piece starts where the last one ends.
    if (last !== undefined && last.hi !== null && iv.lo !== null && eq(last.hi, iv.lo) && (last.hiIn || iv.loIn)) {
      out[out.length - 1] = { lo: last.lo, loIn: last.loIn, hi: iv.hi, hiIn: iv.hiIn };
    } else out.push(iv);
  }
  return out;
}

/** Two sets are equal when they are written the same way (both are in lowest form). */
export const sameSet = (a: RealSet, b: RealSet): boolean => realSetTex(a) === realSetTex(b);

/** A wrong set the learner might choose, and why it is wrong. */
export interface WrongSet {
  set: RealSet;
  why: Rich;
}

/**
 * A choice among sets: the right one and the wrong ones (duplicates and any that equal
 * the right one dropped), in an order fixed by their LaTeX, so the right answer is not
 * always first.
 */
export function setChoice(right: RealSet, wrong: readonly WrongSet[], v = 'x'): { answer: AnswerSpec; misconceptions: Misconception[]; reference: Response; ids: Map<string, string> } {
  const texRight = realSetTex(right, v);
  const seen = new Map<string, Rich | null>([[texRight, null]]);
  for (const w of wrong) {
    const tx = realSetTex(w.set, v);
    if (!seen.has(tx)) seen.set(tx, w.why);
  }
  const order = [...seen.keys()].sort((a, b) => hash(a) - hash(b));
  const ids = new Map(order.map((tx, i) => [tx, String.fromCharCode(97 + i)]));
  const options: ChoiceOption[] = order.map((tx) => ({ id: ids.get(tx) as string, label: [{ kind: 'math', text: tx, typed: [] }] }));
  const rightId = ids.get(texRight) as string;
  const misconceptions: Misconception[] = [...seen].filter(([, why]) => why !== null).map(([tx, why]) => ({ response: [ids.get(tx) as string], why: why as Rich }));
  return { answer: { kind: 'choice', options, correct: rightId }, misconceptions, reference: [rightId], ids };
}

/** A small deterministic string hash, to shuffle options without a random source. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
}

/** The id of the option whose set is `s`, for a reference solver; '?' when none is. */
export function optionFor(ids: ReadonlyMap<string, string>, s: RealSet, v = 'x'): string {
  return ids.get(realSetTex(s, v)) ?? '?';
}

// ---------------------------------------------------------------- polynomials

/** Coefficients, highest power first, of lead * (x - r1)(x - r2)... for integer roots. */
export function fromRoots(roots: readonly number[], lead = 1): number[] {
  let out = [lead];
  for (const r of roots) {
    const next = Array.from({ length: out.length + 1 }, () => 0);
    out.forEach((c, i) => { next[i] = (next[i] as number) + c; next[i + 1] = (next[i + 1] as number) - c * r; });
    out = next;
  }
  return out;
}

/** The value of a polynomial (highest power first) at a rational, exactly. */
export function evalPoly(coeffs: readonly number[], x: Rational): Rational {
  let num = 0n;
  let den = 1n;
  // Horner: acc = acc * x + c, as a fraction num/den.
  for (const c of coeffs) {
    num = num * x.num + BigInt(c) * den * x.den;
    den = den * x.den;
  }
  return q(num, den);
}

/** Integer roots of an integer polynomial by trying every divisor of the constant term (and 0). */
export function integerRoots(coeffs: readonly number[]): number[] {
  const nz = [...coeffs];
  const out: number[] = [];
  while (nz.length > 1 && nz[nz.length - 1] === 0) { nz.pop(); if (!out.includes(0)) out.push(0); }
  const c = Math.abs(nz[nz.length - 1] as number);
  for (let d = 1; d <= c; d++) {
    if (c % d !== 0) continue;
    for (const r of [d, -d]) if (evalPoly(coeffs, q(r)).num === 0n && !out.includes(r)) out.push(r);
  }
  return out.sort((a, b) => a - b);
}

/** A rational from text, for checks; throws on a content bug. */
export function rat(s: string): Rational {
  const r = parseRational(s);
  if (!r.ok) throw new Error(`not a rational: ${s}`);
  return r.value;
}

/** A rational as typed text, for witness examples and references. */
export const typed = (r: Rational): string => formatRational(r);

// ---------------------------------------------------------------- Cambridge problems whose answer is a set

/** An auto-checked Cambridge problem whose answer is a solution set (a choice), verified by the sign test. */
export function setProblem(spec: {
  id: string; source: Citation; title: Rich; prompt: Rich; right: RealSet; wrong: readonly WrongSet[]; v?: string;
  solution: readonly Rich[]; test: (x: Rational) => boolean; critical: readonly Rational[]; official?: Official;
}): AutoProblem {
  const v = spec.v ?? 'x';
  const ch = setChoice(spec.right, spec.wrong, v);
  const out: AutoSpec = {
    id: spec.id, source: spec.source, title: spec.title, prompt: spec.prompt, answer: ch.answer, solution: spec.solution, reference: ch.reference,
    verify: () => (sameSet(setWhere(spec.test, spec.critical), spec.right) ? null : `the sign test gives ${realSetTex(setWhere(spec.test, spec.critical), v)}`),
    misconceptions: ch.misconceptions,
  };
  if (spec.official !== undefined) out.official = spec.official;
  return auto(out);
}
