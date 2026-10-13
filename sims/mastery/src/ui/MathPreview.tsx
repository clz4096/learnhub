/**
 * A live preview of a write-up's maths (DESIGN-AUDIT, logic change 5): the text as typed, with
 * LaTeX between dollar signs typeset by the app's KaTeX (`renderTex`), so a learner can check
 * the maths before it goes to a supervisor. It follows the box after a short pause, and keeps
 * the last render on screen meanwhile, so typing never blanks it or shifts what is below.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { renderTex } from '@/ui/Tex';

/** The pause after the last keystroke before the preview follows. */
export const PREVIEW_MS = 250;

export interface MathPart {
  /** Plain text, inline maths (`$...$`), or display maths (`$$...$$`). */
  kind: 'text' | 'inline' | 'display';
  s: string;
}

/**
 * `text` split into plain runs and maths. `\$` is a literal dollar sign; a `$` or `$$` with no
 * closing partner, or with nothing between, stays text, so half-typed maths reads as typed.
 */
export function mathParts(text: string): MathPart[] {
  const out: MathPart[] = [];
  let plain = '';
  let i = 0;
  const flush = (): void => {
    if (plain !== '') out.push({ kind: 'text', s: plain });
    plain = '';
  };
  /** The index of the next unescaped `delim` at or after `from`, or -1. */
  const close = (delim: string, from: number): number => {
    for (let j = text.indexOf(delim, from); j >= 0; j = text.indexOf(delim, j + 1)) {
      if (text[j - 1] !== '\\') return j;
    }
    return -1;
  };
  while (i < text.length) {
    const c = text[i];
    if (c === '\\' && text[i + 1] === '$') {
      plain += '$';
      i += 2;
      continue;
    }
    if (c === '$') {
      const display = text[i + 1] === '$';
      const delim = display ? '$$' : '$';
      const start = i + delim.length;
      const end = close(delim, start);
      if (end > start && text.slice(start, end).trim() !== '') {
        flush();
        out.push({ kind: display ? 'display' : 'inline', s: text.slice(start, end) });
        i = end + delim.length;
        continue;
      }
    }
    plain += c;
    i++;
  }
  flush();
  return out;
}

/** The preview under a write-up box. `id` lets the box point at it with `aria-describedby`. */
export function MathPreview({ text, id }: { text: string; id: string }) {
  const [shown, setShown] = useState(text);
  useEffect(() => {
    if (text === shown) return undefined;
    const t = setTimeout(() => setShown(text), PREVIEW_MS);
    return () => clearTimeout(t);
  }, [text, shown]);
  const parts = useMemo(() => mathParts(shown), [shown]);
  const hasMath = parts.some((p) => p.kind !== 'text');
  return (
    <div class="sup-preview" id={id}>
      <p class="sup-preview-h">Preview</p>
      <div class="sup-preview-body" aria-live="off">
        {hasMath
          ? parts.map((p, i) => (p.kind === 'text'
            ? <span key={i}>{p.s}</span>
            : <span key={i} class={p.kind === 'display' ? 'math math-display' : 'math'} dangerouslySetInnerHTML={{ __html: renderTex(p.s, p.kind === 'display') }} />))
          : <span class="sup-preview-empty">Maths typed between dollar signs, such as $x^2$, is typeset here.</span>}
      </div>
    </div>
  );
}
