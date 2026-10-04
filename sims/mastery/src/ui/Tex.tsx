/**
 * LaTeX rendered by KaTeX (design decision 19b). KaTeX and its fonts are bundled from the
 * npm package by Vite (see main.tsx), so nothing loads from a CDN.
 *
 * The output is HTML for the eye plus MathML for screen readers. The LaTeX comes from
 * content (checked by the content tests, which render every fragment strictly) or from
 * the answer preview, whose LaTeX is printed from a parsed expression tree and holds
 * only numbers, declared variable names, and fixed commands. `trust` stays off, so
 * \href, \url, and HTML commands are refused either way.
 */
import katex from 'katex';

const cache = new Map<string, string>();
const CACHE_MAX = 4000;

/** KaTeX HTML for `tex`. A malformed fragment shows as red source text instead of throwing. */
export function renderTex(tex: string, display = false): string {
  const key = `${display ? 'D' : 'I'}${tex}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const html = katex.renderToString(tex, { displayMode: display, throwOnError: false, output: 'htmlAndMathml', strict: 'ignore', trust: false });
  if (cache.size >= CACHE_MAX) cache.clear();
  cache.set(key, html);
  return html;
}

export function Tex({ tex, display = false }: { tex: string; display?: boolean }) {
  return <span class={display ? 'math math-display' : 'math'} dangerouslySetInnerHTML={{ __html: renderTex(tex, display) }} />;
}

/** Text with inline LaTeX between dollar signs, as in the graph's topic summaries. */
export function TexText({ text }: { text: string }) {
  const parts = text.split('$');
  // An odd number of dollar signs is a typo, not math: show the text as written.
  if (parts.length % 2 === 0) return <>{text}</>;
  return <>{parts.map((p, i) => (i % 2 === 1 ? <Tex key={i} tex={p} /> : p))}</>;
}
