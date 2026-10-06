/**
 * OCaml code in lessons and problems, for the functional programming topics (groups E and F
 * of the Preparation map, graph/reviews/cambridge-prep.md). Code is shown in typewriter type
 * inside LaTeX (`\texttt`), so the content checks render it with KaTeX like any mathematics,
 * and the relation signs it is full of (=, <, ->, ::) never sit in plain text. It follows the
 * same rule as all text: a number in code is computed and interpolated, never typed. A digit
 * in a literal part is a typed digit and the content checks reject it.
 *
 * Two template families share the escaping below; they differ in how they treat spaces and
 * lines, so each keeps its own output:
 * - `code` and `codeBlock` (group E): runs of spaces are kept as hard spaces; `codeBlock`
 *   joins lines built with `code`. `oc` wraps computed source, and a number array is shown
 *   as an OCaml list, [1; 2; 3].
 * - `ml` and `mlBlock` (group F): `mlBlock` takes the whole display as one template, one
 *   line of code per template line, with its leading spaces kept as indentation. `codeOf`
 *   and `mlList` wrap computed source.
 */
import type { Span } from './rich';

/** LaTeX's special characters escaped for \texttt. */
function escapeTt(s: string): string {
  return s.replace(/[\\{}$&#%_^~]/g, (c) => {
    if (c === '\\') return '\\textbackslash{}';
    if (c === '^') return '\\textasciicircum{}';
    if (c === '~') return '\\textasciitilde{}';
    return `\\${c}`;
  });
}

/** Text for \texttt: LaTeX's special characters escaped, and runs of spaces kept as hard spaces. */
export function ttEscape(s: string): string {
  return escapeTt(s).replace(/^ +| {2,}/g, (m) => '\\ '.repeat(m.length));
}

// `code` and `codeBlock`.

/** A fragment of OCaml already set as \texttt source, built by code from computed values. */
export interface Ocaml {
  readonly ocaml: string;
}

export type CodeInterp = number | string | readonly number[] | Ocaml | Span;

/** An OCaml int as written in source: a negative one in brackets when it is an argument is the caller's choice. */
export const showInt = (n: number): string => String(n);

/** An int list as OCaml prints it: [1; 2; 3]. */
export const showList = (xs: readonly number[]): string => `[${xs.join('; ')}]`;

/** A list of int lists as OCaml prints it: [[1; 2]; []]. */
export const showLists = (xss: readonly (readonly number[])[]): string => `[${xss.map(showList).join('; ')}]`;

/** Computed OCaml source (from the printers above), for interpolation into `code`. */
export const oc = (source: string): Ocaml => ({ ocaml: ttEscape(source) });

function part(v: CodeInterp, typed: string[]): string {
  if (typeof v === 'number') return ttEscape(String(v));
  if (typeof v === 'string') {
    if (v !== '') typed.push(v);
    return ttEscape(v);
  }
  if (Array.isArray(v)) return ttEscape(showList(v as readonly number[]));
  if ('ocaml' in (v as object)) return (v as Ocaml).ocaml;
  const sp = v as Span;
  typed.push(...sp.typed);
  return sp.text.replace(/^\\texttt\{([\s\S]*)\}$/, '$1');
}

function build(strings: TemplateStringsArray, vals: readonly CodeInterp[]): { text: string; typed: string[] } {
  let text = '';
  const typed: string[] = [];
  strings.raw.forEach((s, i) => {
    if (s !== '') typed.push(s);
    text += ttEscape(s);
    if (i < vals.length) text += part(vals[i] as CodeInterp, typed);
  });
  return { text, typed };
}

/** Inline OCaml: code`let x = ${3} + ${4}`. Typed parts are checked for digits; numbers are interpolated. */
export function code(strings: TemplateStringsArray, ...vals: CodeInterp[]): Span {
  const { text, typed } = build(strings, vals);
  return { kind: 'math', text: `\\texttt{${text}}`, typed };
}

/** Several lines of OCaml, displayed on their own, left aligned. Build each line with `code`. */
export function codeBlock(...lines: Span[]): Span {
  const body = lines.map((l) => (l.text.startsWith('\\texttt{') ? l.text : `\\texttt{${l.text}}`)).join(' \\\\ ');
  return { kind: 'math', text: `\\begin{array}{l} ${body} \\end{array}`, typed: lines.flatMap((l) => [...l.typed]), display: true };
}

// `ml` and `mlBlock`.

/** Code assembled by program from computed values (a list literal, a tree). */
export interface Code {
  kind: 'code';
  text: string;
}

export type MlInterp = number | string | Code;

/** Code built by program; like `computed`, never for text with a typed digit. */
export function codeOf(text: string): Code {
  return { kind: 'code', text };
}

/** An OCaml list literal of computed values: [3; 1; 4]. */
export function mlList(xs: readonly (number | string)[]): Code {
  return codeOf(`[${xs.map(String).join('; ')}]`);
}

const numText = (n: number): string => (n < 0 ? `-${String(-n)}` : String(n));

function assemble(strings: readonly string[], vals: readonly MlInterp[]): { text: string; typed: string[] } {
  let text = '';
  const typed: string[] = [];
  strings.forEach((s, i) => {
    text += s;
    if (s !== '') typed.push(s);
    if (i < vals.length) {
      const v = vals[i] as MlInterp;
      if (typeof v === 'number') text += numText(v);
      else if (typeof v === 'string') {
        text += v;
        if (v !== '') typed.push(v);
      } else text += v.text;
    }
  });
  return { text, typed };
}

/** One line of code, inline: `ml\`List.map f xs\``. */
export function ml(strings: TemplateStringsArray, ...vals: MlInterp[]): Span {
  const { text, typed } = assemble(strings.raw, vals);
  return { kind: 'math', text: `\\texttt{${escapeTt(text)}}`, typed };
}

/**
 * Several lines of code, displayed: each line of the template is a line of code, and
 * its leading spaces are kept as indentation. A first or last line that is empty is
 * dropped, so the template can open and close on lines of its own.
 */
export function mlBlock(strings: TemplateStringsArray, ...vals: MlInterp[]): Span {
  const { text, typed } = assemble(strings.raw, vals);
  const lines = text.split('\n');
  if (lines[0]?.trim() === '') lines.shift();
  if (lines[lines.length - 1]?.trim() === '') lines.pop();
  const indent = Math.min(...lines.filter((l) => l.trim() !== '').map((l) => l.length - l.trimStart().length));
  const rows = lines.map((l) => {
    const body = l.slice(Math.min(indent, l.length - l.trimStart().length));
    const lead = body.length - body.trimStart().length;
    return `\\texttt{${'~'.repeat(lead)}${escapeTt(body.trimStart())}}`;
  });
  return { kind: 'math', text: `\\begin{array}{l}${rows.join(' \\\\ ')}\\end{array}`, typed, display: true };
}
