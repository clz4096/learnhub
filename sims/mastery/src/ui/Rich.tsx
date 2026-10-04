/**
 * Renders content Rich text: plain text with [[id|shown]] glossary marks, computed numbers,
 * and mathematics. Math is written in the graders' ASCII syntax (x^2, u_n, 3 * 4) and shown
 * with superscripts, subscripts, and proper signs, so what the learner reads matches what
 * they type.
 */
import { h, type ComponentChildren } from 'preact';
import { MARK, plain, type Rich as RichText, type Span } from '@learnhub/content';
import { openTerm } from '@/ui/termState';

/** The group after ^ or _: a bracketed group (brackets dropped) or a run like -2, 10, or n. */
function group(s: string, i: number): { body: string; end: number } {
  if (s[i] === '(') {
    let depth = 0;
    for (let j = i; j < s.length; j++) {
      if (s[j] === '(') depth++;
      else if (s[j] === ')' && --depth === 0) return { body: s.slice(i + 1, j), end: j + 1 };
    }
    return { body: s.slice(i + 1), end: s.length };
  }
  const m = /^-?[A-Za-z0-9.]+/.exec(s.slice(i));
  return m === null ? { body: '', end: i } : { body: m[0], end: i + m[0].length };
}

const SIGNS: [RegExp, string][] = [[/<=/g, '≤'], [/>=/g, '≥'], [/!=/g, '≠'], [/ \* /g, ' × '], [/\*/g, '·'], [/(^|[\s(])-(?=[\d\w(])/g, '$1−'], [/ - /g, ' − ']];

function signs(s: string): string {
  return SIGNS.reduce((acc, [re, to]) => acc.replace(re, to), s);
}

/** Math text to nodes: ^ and _ become sup and sub, operators become proper signs. */
export function mathNodes(s: string): ComponentChildren[] {
  const out: ComponentChildren[] = [];
  let buf = '';
  let i = 0;
  while (i < s.length) {
    const c = s[i] as string;
    if ((c === '^' || c === '_') && i + 1 < s.length) {
      const g = group(s, i + 1);
      if (g.end > i + 1) {
        if (buf !== '') out.push(signs(buf));
        buf = '';
        const inner = mathNodes(g.body);
        out.push(c === '^' ? <sup key={i}>{inner}</sup> : <sub key={i}>{inner}</sub>);
        i = g.end;
        continue;
      }
    }
    buf += c;
    i++;
  }
  if (buf !== '') out.push(signs(buf));
  return out;
}

export function Term({ id, children }: { id: string; children: ComponentChildren }) {
  return (
    <button type="button" class="term" data-term={id} onClick={() => openTerm(id)}>
      {children}
    </button>
  );
}

function textNodes(text: string, key: number): ComponentChildren[] {
  const out: ComponentChildren[] = [];
  let last = 0;
  for (const m of text.matchAll(MARK)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    out.push(<Term key={`${key}-${at}`} id={m[1] as string}>{m[2]}</Term>);
    last = at + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function spanNode(s: Span, i: number): ComponentChildren {
  if (s.kind === 'math') return <span key={i} class="math">{mathNodes(s.text)}</span>;
  if (s.kind === 'num') return <span key={i} class="num">{mathNodes(s.text)}</span>;
  return textNodes(s.text, i);
}

export function Rich({ text, as = 'span', class: cls }: { text: RichText; as?: 'span' | 'p' | 'div' | 'h2' | 'h3' | 'li' | 'figcaption' | 'caption'; class?: string }) {
  return h(as, { class: cls }, text.map(spanNode));
}

export { plain };
