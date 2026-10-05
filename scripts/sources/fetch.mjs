// Downloads the sources of a batch into sources/<course>/<id>.<ext> and records
// sources/manifest.json (id, url, fetched_at, sha256, bytes, content type, status, batch).
// The manifest keeps the entries of every batch fetched so far.
//
//   node scripts/sources/fetch.mjs [batch.json] [--refresh]
//
// Only the URLs listed in the batch are fetched; nothing is crawled. A redirect is followed
// only when it stays on a host the batch lists in `hosts`; any other redirect is recorded as
// a failure with its target, so a new host is always visible before it is trusted.
// Without --refresh, a source already in the manifest with status "ok" and its file on disk
// is kept as is, so re-running after a partial failure fetches only what is missing.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'sources');
const MANIFEST = path.join(OUT, 'manifest.json');
const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 60_000;

const args = process.argv.slice(2);
const refresh = args.includes('--refresh');
const batchPath = args.find((a) => !a.startsWith('--')) ?? path.join(path.dirname(fileURLToPath(import.meta.url)), 'batch-1.json');
const batch = JSON.parse(readFileSync(batchPath, 'utf8'));
const hosts = new Set(batch.hosts);

/** Throws unless the URL is HTTPS on a listed host. */
function checkUrl(url) {
  const u = new URL(url);
  if (u.protocol !== 'https:') throw new Error(`not https: ${url}`);
  if (!hosts.has(u.hostname)) throw new Error(`host not listed in the batch: ${u.hostname}`);
  return u;
}

function extFor(source, contentType) {
  if (source.kind === 'pdf' || contentType.includes('application/pdf')) return 'pdf';
  if (source.kind === 'html' || contentType.includes('text/html')) return 'html';
  return 'bin';
}

const USER_AGENT = 'learnhub-sources/1 (personal study cache)';

/** One GET without following redirects, through Node's fetch. */
async function hopNode(url) {
  const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS), headers: { 'user-agent': USER_AGENT } });
  return { status: res.status, location: res.headers.get('location'), contentType: res.headers.get('content-type') ?? '', body: Buffer.from(await res.arrayBuffer()) };
}

/**
 * One GET through the system curl. Used only when a server omits its intermediate
 * certificate: Node trusts only complete chains, while macOS curl completes the chain from
 * the certificate's issuer URL. Verification stays on; nothing here weakens TLS.
 */
function hopCurl(url) {
  const tmp = path.join(OUT, `.curl-${process.pid}.part`);
  mkdirSync(OUT, { recursive: true });
  const out = execFileSync('curl', [
    '--silent', '--show-error', '--proto', '=https', '--max-time', String(TIMEOUT_MS / 1000),
    '--user-agent', USER_AGENT, '--output', tmp,
    '--write-out', '%{http_code}\n%{content_type}\n%{redirect_url}', url,
  ], { encoding: 'utf8' });
  const [status, contentType, location] = out.split('\n');
  const body = existsSync(tmp) ? readFileSync(tmp) : Buffer.alloc(0);
  rmSync(tmp, { force: true });
  return { status: Number(status), location: location || null, contentType: contentType ?? '', body };
}

const INCOMPLETE_CHAIN = new Set(['UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY']);

async function hop(url) {
  try {
    return { ...(await hopNode(url)), via: 'node' };
  } catch (err) {
    if (!INCOMPLETE_CHAIN.has(err?.cause?.code)) throw new Error(String(err?.cause?.message ?? err.message ?? err));
    return { ...hopCurl(url), via: 'curl' };
  }
}

/** GET with redirects followed by hand, so each hop's host is checked. */
async function get(url) {
  let current = checkUrl(url).href.replace(/#.*$/, '');
  const hops = [];
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const res = await hop(current);
    if (res.status >= 300 && res.status < 400) {
      if (res.location === null) throw new Error(`HTTP ${res.status} without a location`);
      const next = new URL(res.location, current).href;
      if (!hosts.has(new URL(next).hostname)) throw new Error(`redirect to an unlisted host, not followed: ${next}`);
      hops.push(next);
      current = next;
      continue;
    }
    if (res.status < 200 || res.status >= 300) throw new Error(`HTTP ${res.status}`);
    return { body: res.body, contentType: res.contentType, finalUrl: current, hops, via: res.via };
  }
  throw new Error(`more than ${MAX_REDIRECTS} redirects`);
}

const previous = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : { sources: [] };
const prevById = new Map(previous.sources.map((s) => [s.id, s]));
const results = [];

for (const source of batch.sources) {
  const prev = prevById.get(source.id);
  if (!refresh && prev?.status === 'ok' && prev.url === source.url && existsSync(path.join(ROOT, prev.path))) {
    results.push(prev);
    continue;
  }
  const entry = { id: source.id, course: source.course, kind: source.kind, role: source.role, title: source.title, url: source.url };
  try {
    const { body, contentType, finalUrl, hops, via } = await get(source.url);
    const ext = extFor(source, contentType);
    if (source.kind === 'pdf' && body.subarray(0, 5).toString('latin1') !== '%PDF-') {
      throw new Error(`expected a PDF, got ${contentType || 'unknown type'}`);
    }
    const dir = path.join(OUT, source.course);
    mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${source.id}.${ext}`);
    writeFileSync(`${file}.part`, body);
    renameSync(`${file}.part`, file);
    Object.assign(entry, {
      path: path.relative(ROOT, file),
      fetched_at: new Date().toISOString(),
      sha256: createHash('sha256').update(body).digest('hex'),
      bytes: body.length,
      content_type: contentType,
      status: 'ok',
      ...(via === 'curl' ? { via: 'curl (server sends an incomplete certificate chain)' } : {}),
      ...(hops.length > 0 ? { redirects: hops, final_url: finalUrl } : {}),
    });
    console.log(`ok    ${source.id} (${body.length} bytes)`);
  } catch (err) {
    Object.assign(entry, { fetched_at: new Date().toISOString(), status: 'failed', error: String(err.message ?? err) });
    console.log(`FAIL  ${source.id}: ${entry.error}`);
  }
  results.push(entry);
}

// The manifest covers every batch fetched so far: entries of other batches are kept as they
// were, so fetching batch 2 does not drop batch 1's record (extract.mjs reads them all).
const batchIds = new Set(batch.sources.map((s) => s.id));
const kept = previous.sources.filter((s) => !batchIds.has(s.id));
for (const r of results) r.batch ??= batch.batch;
mkdirSync(OUT, { recursive: true });
const manifest = {
  batch: batch.batch,
  generated_at: new Date().toISOString(),
  hosts: [...new Set([...(previous.hosts ?? []), ...hosts])],
  sources: [...kept, ...results],
};
writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
const failed = results.filter((r) => r.status !== 'ok');
console.log(`\n${results.length - failed.length} ok, ${failed.length} failed. Manifest: ${path.relative(ROOT, MANIFEST)}`);
for (const f of failed) console.log(`  failed: ${f.id} ${f.url} (${f.error})`);
process.exitCode = failed.length > 0 ? 1 : 0;
