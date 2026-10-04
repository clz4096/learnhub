// Renders one Markdown material to a standalone HTML page that sits at
// site/sims/<id>/materials/<page>.html and loads site/materials.css.
import { Marked } from 'marked';
import { materialPage, REPO_URL, rewriteHref } from './manifest.mjs';

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);
const UNESC = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" };
const textOf = (html) => html.replace(/<[^>]*>/g, '').replace(/&(amp|lt|gt|quot|#39);/g, (_, e) => UNESC[e]);

// GitHub-style heading anchors, so links like VERIFY.md#some-heading keep working.
function slugger() {
  const seen = new Map();
  return (text) => {
    const base = text.toLowerCase().trim().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-');
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return n === 0 ? base : `${base}-${n}`;
  };
}

/**
 * Markdown to an HTML fragment. Raw HTML in the source is shown as text: materials are
 * documents, and escaping it means a stray <tag> can never inject markup into the site.
 * @param {string} md
 * @param {{ id: string, from: string, materials: string[] }} ctx see rewriteHref
 */
export function renderMarkdown(md, ctx) {
  const slug = slugger();
  const marked = new Marked({
    gfm: true,
    walkTokens(t) {
      if (t.type === 'link') t.href = rewriteHref(t.href, ctx);
      else if (t.type === 'image') t.href = rewriteHref(t.href, { ...ctx, raw: true });
    },
    renderer: {
      heading({ tokens, depth }) {
        const inner = this.parser.parseInline(tokens);
        return `<h${depth} id="${escapeHtml(slug(textOf(inner)))}">${inner}</h${depth}>\n`;
      },
      code({ text, lang }) {
        const language = (lang ?? '').trim().split(/\s+/)[0] ?? '';
        const cls = language ? ` class="language-${escapeHtml(language)}"` : '';
        const pre = `<pre tabindex="0"><code${cls}>${escapeHtml(text.replace(/\n$/, ''))}</code></pre>`;
        if (language !== 'mermaid') return pre + '\n';
        // Mermaid is not loaded on the site (no third-party scripts); show the source instead.
        return `<figure class="diagram">${pre}<figcaption>Diagram source (Mermaid). GitHub draws it on the source page.</figcaption></figure>\n`;
      },
      html({ text }) {
        return escapeHtml(text);
      },
    },
  });
  const html = marked.parse(md, { async: false });
  // Wide tables scroll inside their own box so the page never scrolls sideways at 320 px.
  return html
    .replaceAll('<table>', '<div class="table-wrap" role="region" aria-label="Table" tabindex="0"><table>')
    .replaceAll('</table>', '</table></div>');
}

/**
 * The full page for one material.
 * @param {{ id: string, title: string, materials: { label: string, path: string }[] }} tool
 * @param {{ label: string, path: string }} material
 * @param {string} md the Markdown source
 */
export function renderMaterialPage(tool, material, md) {
  const body = renderMarkdown(md, { id: tool.id, from: material.path, materials: tool.materials.map((x) => x.path) });
  const others = tool.materials
    .map((x) => x.path === material.path
      ? `<li><span aria-current="page">${escapeHtml(x.label)}</span></li>`
      : `<li><a href="${escapeHtml(materialPage(x.path))}">${escapeHtml(x.label)}</a></li>`)
    .join('');
  const source = `${REPO_URL}/blob/main/sims/${tool.id}/${material.path}`;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <link rel="icon" href="data:," />
    <title>${escapeHtml(material.label)}: ${escapeHtml(tool.title)} | learnhub</title>
    <link rel="stylesheet" href="../../../materials.css" />
  </head>
  <body>
    <a class="skip" href="#main">Skip to content</a>
    <header class="page-head">
      <nav aria-label="Breadcrumb" class="crumbs">
        <a href="../../../">learnhub</a>
        <span aria-hidden="true">/</span>
        <a href="../">${escapeHtml(tool.title)}</a>
        <span aria-hidden="true">/</span>
        <span aria-current="page">${escapeHtml(material.label)}</span>
      </nav>
      <a class="btn btn-primary" href="../">Open the tool</a>
    </header>
    <main id="main" class="doc">
${body}
    </main>
    <footer class="page-foot">
      <nav aria-label="Materials">
        <h2>Materials for ${escapeHtml(tool.title)}</h2>
        <ul>${others}</ul>
      </nav>
      <p><a href="${escapeHtml(source)}">View the Markdown source on GitHub</a></p>
    </footer>
  </body>
</html>
`;
}
