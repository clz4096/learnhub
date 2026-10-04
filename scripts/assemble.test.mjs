// node --test: manifest validation, catalog filtering, and material link rewriting.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { catalogEntry, materialPage, REPO_URL, rewriteHref, validateManifest } from './lib/manifest.mjs';
import { renderMarkdown } from './lib/materials.mjs';
import { buildCatalog, readManifests } from './lib/sims.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const valid = () => ({
  id: 'demo', title: 'Demo', summary: 'A demo tool.', tracks: ['ALGO'], level: 'visualizer',
  minutes: 30, lessons: 3, build: 'npm run build', out: 'dist',
  materials: [{ label: 'Guide', path: 'GUIDE.md' }, { label: 'Notes', path: 'docs/notes.md' }],
  status: 'ready',
});

describe('validateManifest', () => {
  it('accepts every manifest in the repo', () => {
    for (const { manifest, dir } of readManifests(path.join(ROOT, 'sims'))) assert.deepEqual(validateManifest(manifest, dir), []);
  });

  it('accepts a minimal valid manifest', () => {
    assert.deepEqual(validateManifest(valid(), 'demo'), []);
    assert.deepEqual(validateManifest({ ...valid(), materials: [], lessons: 0 }, 'demo'), []);
  });

  it('reports each missing field', () => {
    const { title, out, ...rest } = valid();
    assert.deepEqual(validateManifest(rest, 'demo'), ['missing field "title"', 'missing field "out"']);
  });

  it('rejects wrong types and values with field names in the message', () => {
    const cases = [
      [{ id: 'Demo' }, /"id" must be lowercase/],
      [{ id: 'other' }, /"id" is "other" but the folder is "demo"/],
      [{ title: '  ' }, /"title" must be a non-empty string/],
      [{ tracks: [] }, /"tracks" must be a non-empty array/],
      [{ tracks: ['algo'] }, /track "algo" must be uppercase/],
      [{ tracks: ['ALGO', 'ALGO'] }, /"tracks" has duplicates/],
      [{ level: 'simulator-ish' }, /"level" must be one of/],
      [{ status: 'done' }, /"status" must be one of/],
      [{ minutes: 0 }, /"minutes" must be a positive integer/],
      [{ minutes: '90' }, /"minutes" must be a positive integer/],
      [{ lessons: 1.5 }, /"lessons" must be an integer/],
      [{ out: '../elsewhere' }, /"out" must be a relative path inside/],
      [{ out: '/abs' }, /"out" must be a relative path inside/],
      [{ materials: {} }, /"materials" must be an array/],
      [{ materials: [{ label: 'x', path: 'x.txt' }] }, /materials\[0\]\.path must be a relative \.md path/],
      [{ materials: [{ label: 'x', path: '../x.md' }] }, /materials\[0\]\.path must be a relative \.md path/],
      [{ materials: [{ label: '', path: 'x.md' }] }, /materials\[0\]\.label must be a non-empty string/],
      [{ materials: [{ label: 'a', path: 'a/b.md' }, { label: 'b', path: 'a-b.md' }] }, /materials\[1\]\.path "a-b\.md" duplicates/],
      [{ lesson: 3 }, /unknown field "lesson"/],
    ];
    for (const [patch, re] of cases) {
      const errors = validateManifest({ ...valid(), ...patch }, 'demo');
      assert.ok(errors.some((e) => re.test(e)), `${JSON.stringify(patch)} gave ${JSON.stringify(errors)}`);
    }
    assert.deepEqual(validateManifest([], 'demo'), ['must be a JSON object']);
  });
});

describe('readManifests and buildCatalog', () => {
  const withSims = (files, fn) => {
    const dir = mkdtempSync(path.join(tmpdir(), 'learnhub-'));
    try {
      for (const [name, body] of Object.entries(files)) {
        mkdirSync(path.join(dir, name));
        writeFileSync(path.join(dir, name, 'sim.json'), typeof body === 'string' ? body : JSON.stringify(body));
      }
      mkdirSync(path.join(dir, 'no-manifest'));
      return fn(dir);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };

  it('fails with every bad file named', () => {
    withSims({ demo: { ...valid(), level: 'x' }, broken: '{ nope', fine: { ...valid(), id: 'fine' } }, (dir) => {
      assert.throws(() => readManifests(dir), (e) => {
        assert.match(e.message, /sims\/demo\/sim\.json: "level" must be one of/);
        assert.match(e.message, /sims\/broken\/sim\.json: not valid JSON/);
        assert.doesNotMatch(e.message, /fine/);
        return true;
      });
    });
  });

  it('keeps only ready tools in the catalog, with site-relative links', () => {
    withSims({ a: { ...valid(), id: 'a' }, b: { ...valid(), id: 'b', status: 'beta' }, c: { ...valid(), id: 'c', status: 'planned' } }, (dir) => {
      const catalog = buildCatalog(readManifests(dir));
      assert.deepEqual(catalog.tools.map((t) => t.id), ['a']);
      assert.deepEqual(catalog.tools[0], catalogEntry({ ...valid(), id: 'a' }));
      assert.equal(catalog.tools[0].href, 'sims/a/');
      assert.deepEqual(catalog.tools[0].materials, [
        { label: 'Guide', href: 'sims/a/materials/GUIDE.html' },
        { label: 'Notes', href: 'sims/a/materials/docs-notes.html' },
      ]);
      assert.equal('build' in catalog.tools[0] || 'out' in catalog.tools[0], false);
    });
  });
});

describe('rewriteHref', () => {
  const ctx = { id: 'demo', from: 'GUIDE.md', materials: ['GUIDE.md', 'VERIFY.md', 'docs/notes.md'] };
  const blob = (p) => `${REPO_URL}/blob/main/${p}`;

  it('sends links between materials to the rendered pages', () => {
    assert.equal(rewriteHref('VERIFY.md', ctx), 'VERIFY.html');
    assert.equal(rewriteHref('./VERIFY.md#some-heading', ctx), 'VERIFY.html#some-heading');
    assert.equal(rewriteHref('docs/notes.md', ctx), 'docs-notes.html');
    assert.equal(rewriteHref('../GUIDE.md#top', { ...ctx, from: 'docs/notes.md' }), 'GUIDE.html#top');
    assert.equal(rewriteHref('GUIDE.md', ctx), 'GUIDE.html');
  });

  it('sends other repo files to GitHub', () => {
    assert.equal(rewriteHref('README.md#verify-against-real-hardware', ctx), blob('sims/demo/README.md#verify-against-real-hardware'));
    assert.equal(rewriteHref('bench/README.md', ctx), blob('sims/demo/bench/README.md'));
    assert.equal(rewriteHref('scripts/run.sh?plain=1', ctx), blob('sims/demo/scripts/run.sh?plain=1'));
    assert.equal(rewriteHref('bench/', ctx), blob('sims/demo/bench/'));
    assert.equal(rewriteHref('notes.md', { ...ctx, from: 'docs/notes.md' }), 'docs-notes.html');
    assert.equal(rewriteHref('../../DESIGN.md', ctx), blob('DESIGN.md'));
    assert.equal(rewriteHref('/DESIGN.md', ctx), blob('DESIGN.md'));
    assert.equal(rewriteHref('img/a.png', { ...ctx, raw: true }), `${REPO_URL}/raw/main/sims/demo/img/a.png`);
  });

  it('leaves external links and anchors alone', () => {
    for (const h of ['https://multipass.run', 'http://x.y/z.md', 'mailto:a@b.c', '//cdn.example/x', '#local', ''])
      assert.equal(rewriteHref(h, ctx), h);
  });

  it('fails on links that leave the repository', () => {
    assert.throws(() => rewriteHref('../../../etc/passwd', ctx), /outside the repository/);
  });
});

describe('renderMarkdown', () => {
  const ctx = { id: 'demo', from: 'GUIDE.md', materials: ['GUIDE.md', 'VERIFY.md'] };

  it('rewrites links in rendered output', () => {
    const html = renderMarkdown('See [verify](VERIFY.md#a), [bench](bench/README.md), and [site](https://multipass.run).', ctx);
    assert.match(html, /<a href="VERIFY.html#a">verify<\/a>/);
    assert.match(html, new RegExp(`<a href="${REPO_URL}/blob/main/sims/demo/bench/README.md">bench</a>`));
    assert.match(html, /<a href="https:\/\/multipass.run">site<\/a>/);
  });

  it('shows mermaid as code, escapes raw HTML, wraps tables, and adds heading ids', () => {
    const md = '# Model `limits` & scope\n\n## Model limits & scope\n\n```mermaid\ngraph LR\n  A[x<br/>y] --> B\n```\n\n<script>alert(1)</script>\n\n| a | b |\n|---|---|\n| 1 | 2 |\n';
    const html = renderMarkdown(md, ctx);
    assert.match(html, /<h1 id="model-limits--scope">Model <code>limits<\/code> &amp; scope<\/h1>/);
    assert.match(html, /<h2 id="model-limits--scope-1">/);
    assert.match(html, /<figure class="diagram"><pre tabindex="0"><code class="language-mermaid">graph LR\n {2}A\[x&lt;br\/&gt;y\] --&gt; B<\/code><\/pre><figcaption>/);
    assert.doesNotMatch(html, /<script>/);
    assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.match(html, /<div class="table-wrap"[^>]*><table>[\s\S]*<\/table><\/div>/);
  });

  it('renders the real materials without throwing', () => {
    for (const { manifest: m } of readManifests(path.join(ROOT, 'sims'))) {
      for (const x of m.materials) {
        const md = readFileSync(path.join(ROOT, 'sims', m.id, x.path), 'utf8');
        const html = renderMarkdown(md, { id: m.id, from: x.path, materials: m.materials.map((y) => y.path) });
        assert.ok(html.length > 0);
        assert.ok(materialPage(x.path).endsWith('.html'));
      }
    }
  });
});
