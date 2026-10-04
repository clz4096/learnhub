/**
 * Renders content Rich text: plain text with [[id|shown]] glossary marks, computed numbers,
 * and mathematics. Math spans hold LaTeX (content/src/rich.ts) and are rendered by KaTeX,
 * inline or displayed on their own line; screen readers get KaTeX's MathML.
 */
import { h, type ComponentChildren } from 'preact';
import { MARK, plain, type Rich as RichText, type Span } from '@learnhub/content';
import { openTerm } from '@/ui/termState';
import { Tex } from '@/ui/Tex';

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
  if (s.kind === 'math') return <Tex key={i} tex={s.text} display={s.display === true} />;
  if (s.kind === 'num') return <span key={i} class="num">{s.text}</span>;
  return textNodes(s.text, i);
}

export function Rich({ text, as = 'span', class: cls }: { text: RichText; as?: 'span' | 'p' | 'div' | 'h2' | 'h3' | 'li' | 'figcaption' | 'caption'; class?: string }) {
  return h(as, { class: cls }, text.map(spanNode));
}

export { plain };
