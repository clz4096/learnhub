// Serves site/ on localhost the way GitHub Pages does: directory index, trailing-slash
// redirect, 404.html for misses. --base serves it under a prefix (GitHub Pages uses /<repo>/).
//
//   node scripts/serve.mjs [--port 4173] [--base /learnhub/]
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
const { values } = parseArgs({ options: { port: { type: 'string', default: '4173' }, base: { type: 'string', default: '/' } } });
const port = Number(values.port);
const base = `/${values.base.replace(/^\/+|\/+$/g, '')}/`.replace('//', '/');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8', '.woff2': 'font/woff2',
};

function send(res, status, file) {
  res.writeHead(status, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
  createReadStream(file).pipe(res);
}

function notFound(res) {
  const page = path.join(SITE, '404.html');
  if (existsSync(page)) send(res, 404, page);
  else { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('not found'); }
}

const server = createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (url.pathname === base.slice(0, -1)) { res.writeHead(301, { Location: base + url.search }); res.end(); return; }
  if (!url.pathname.startsWith(base)) { notFound(res); return; }

  let rel;
  try { rel = decodeURIComponent(url.pathname.slice(base.length)); } catch { notFound(res); return; }
  const file = path.resolve(SITE, '.' + path.posix.normalize('/' + rel));
  if (file !== SITE && !file.startsWith(SITE + path.sep)) { notFound(res); return; }
  if (!existsSync(file)) { notFound(res); return; }
  if (statSync(file).isDirectory()) {
    if (!url.pathname.endsWith('/')) { res.writeHead(301, { Location: url.pathname + '/' + url.search }); res.end(); return; }
    const index = path.join(file, 'index.html');
    if (existsSync(index)) send(res, 200, index);
    else notFound(res);
    return;
  }
  send(res, 200, file);
});

if (!existsSync(SITE)) {
  console.error('serve: site/ is missing; run npm run build first');
  process.exit(1);
}
server.listen(port, '127.0.0.1', () => console.log(`serving site/ at http://127.0.0.1:${port}${base}`));
