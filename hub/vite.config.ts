import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import preact from '@preact/preset-vite';
import { buildCatalog, readManifests } from '../scripts/lib/sims.mjs';

const SIMS = fileURLToPath(new URL('../sims', import.meta.url));

// In dev there is no assembled site/, so serve catalog.json straight from the manifests,
// through the same validation assemble.mjs uses. Tool links 404 in dev; preview the
// assembled site (npm run build && npm run preview at the root) to follow them.
function devCatalog(): Plugin {
  return {
    name: 'learnhub-dev-catalog',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/catalog.json', (_req, res) => {
        try {
          const body = JSON.stringify(buildCatalog(readManifests(SIMS)));
          res.setHeader('Content-Type', 'application/json');
          res.end(body);
        } catch (e) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'text/plain');
          res.end(e instanceof Error ? e.message : String(e));
        }
      });
    },
  };
}

// Relative base so the site works under any path (GitHub Pages serves it at /<repo>/).
export default defineConfig({
  base: './',
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [preact(), devCatalog()],
  build: { target: 'es2022' },
  server: { host: '127.0.0.1' },
});
