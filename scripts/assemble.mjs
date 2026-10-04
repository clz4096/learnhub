// Assembles the static site in site/ from the hub build and every ready or beta tool.
// Run after every workspace has built (the root `npm run build` does both).
//
//   site/index.html, assets/   the hub (hub/dist)
//   site/catalog.json          ready tools, read by the hub at runtime
//                              (beta tools are built and served but not listed, so the owner can try
//                              them at sims/<id>/ before deciding they are ready)
//   site/materials.css         tokens + materials page styles
//   site/sims/<id>/            the tool's build output ("out" in sim.json)
//   site/sims/<id>/materials/  each material rendered from Markdown
//   site/404.html, .nojekyll   GitHub Pages extras
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { materialPage } from './lib/manifest.mjs';
import { renderMaterialPage } from './lib/materials.mjs';
import { buildCatalog, readManifests } from './lib/sims.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(ROOT, 'site');
const HUB_DIST = path.join(ROOT, 'hub', 'dist');

// GitHub Pages serves this file for any missing path at any depth, so a relative link
// cannot find the site root. On *.github.io the project site lives under /<repo>/;
// elsewhere (custom domain, local preview at /) the root is /.
const NOT_FOUND = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <link rel="icon" href="data:," />
    <title>Page not found | learnhub</title>
    <style>
      body { margin: 0; padding: 32px 16px; background: #f6f7f9; color: #1f2328;
        font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.5; }
      main { max-width: 640px; margin: 0 auto; }
      h1 { font-size: 1.5rem; margin: 0 0 8px; }
      a { color: #0b5cad; }
      a:focus-visible { outline: 3px solid #0b5cad; outline-offset: 2px; border-radius: 4px; }
    </style>
  </head>
  <body>
    <main>
      <h1>Page not found</h1>
      <p>This page does not exist. It may have moved.</p>
      <p><a id="home" href="/">Go to the learnhub catalog</a></p>
    </main>
    <script>
      (function () {
        var seg = location.pathname.split('/')[1];
        if (/\\.github\\.io$/.test(location.hostname) && seg) document.getElementById('home').href = '/' + seg + '/';
      })();
    </script>
  </body>
</html>
`;

function fail(msg) {
  console.error(`assemble: ${msg}`);
  process.exit(1);
}

function assemble() {
  let manifests;
  try {
    manifests = readManifests(path.join(ROOT, 'sims'));
  } catch (e) {
    fail(e instanceof Error ? e.message : String(e));
  }
  const ready = manifests.filter((x) => x.manifest.status === 'ready');
  const served = manifests.filter((x) => x.manifest.status === 'ready' || x.manifest.status === 'beta');

  // Check every input before touching site/, so a failed run leaves the last good site alone.
  if (!existsSync(path.join(HUB_DIST, 'index.html'))) fail('hub/dist/index.html is missing; build the hub first (npm run build)');
  const missing = [];
  for (const { manifest: m } of served) {
    const out = path.join(ROOT, 'sims', m.id, m.out);
    if (!existsSync(path.join(out, 'index.html'))) missing.push(`sims/${m.id}/${m.out}/index.html (build output; run the tool's build)`);
    if (existsSync(path.join(out, 'materials'))) missing.push(`sims/${m.id}/${m.out}/materials must not exist: assemble writes rendered materials there`);
    for (const x of m.materials) if (!existsSync(path.join(ROOT, 'sims', m.id, x.path))) missing.push(`sims/${m.id}/${x.path} (listed in materials)`);
  }
  if (missing.length) fail(`missing or conflicting files:\n  ${missing.join('\n  ')}`);

  rmSync(SITE, { recursive: true, force: true });
  cpSync(HUB_DIST, SITE, { recursive: true });

  for (const { manifest: m } of served) {
    const dest = path.join(SITE, 'sims', m.id);
    cpSync(path.join(ROOT, 'sims', m.id, m.out), dest, { recursive: true });
    if (m.materials.length) mkdirSync(path.join(dest, 'materials'));
    for (const x of m.materials) {
      const md = readFileSync(path.join(ROOT, 'sims', m.id, x.path), 'utf8');
      let html;
      try {
        html = renderMaterialPage(m, x, md);
      } catch (e) {
        fail(`sims/${m.id}/${x.path}: ${e instanceof Error ? e.message : String(e)}`);
      }
      writeFileSync(path.join(dest, 'materials', materialPage(x.path)), html);
    }
  }

  const tokens = readFileSync(path.join(ROOT, 'hub', 'src', 'styles', 'tokens.css'), 'utf8');
  const pageCss = readFileSync(path.join(ROOT, 'scripts', 'lib', 'materials.css'), 'utf8');
  writeFileSync(path.join(SITE, 'materials.css'), `${tokens}\n${pageCss}`);
  writeFileSync(path.join(SITE, 'catalog.json'), JSON.stringify(buildCatalog(manifests), null, 2) + '\n');
  writeFileSync(path.join(SITE, '.nojekyll'), '');
  writeFileSync(path.join(SITE, '404.html'), NOT_FOUND);

  const beta = served.filter((x) => x.manifest.status === 'beta').map((x) => x.manifest.id);
  const skipped = manifests.length - served.length;
  console.log(`assemble: site/ has ${ready.length} listed tool(s): ${ready.map((x) => x.manifest.id).join(', ') || 'none'}`
    + `${beta.length ? `; beta, served but not listed: ${beta.join(', ')}` : ''}${skipped ? `; ${skipped} planned and left out` : ''}`);
}

assemble();
