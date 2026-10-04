// Tool manifest (sims/<id>/sim.json): validation, catalog entries, and link rewriting.
// Pure functions only, so assemble.mjs, the hub's dev server, and the tests share one rule set.
import path from 'node:path';

export const REPO_URL = 'https://github.com/clz4096/learnhub';

export const LEVELS = ['visualizer', 'simulator', 'simulator-with-real-check', 'build-the-model-lab', 'research-instrument'];
export const STATUSES = ['ready', 'beta', 'planned'];

const FIELDS = ['id', 'title', 'summary', 'tracks', 'level', 'minutes', 'lessons', 'build', 'out', 'materials', 'status'];
const ID_RE = /^[a-z0-9][a-z0-9-]*$/;
const TRACK_RE = /^[A-Z][A-Z0-9-]*$/;

const isText = (v) => typeof v === 'string' && v.trim().length > 0;

// A path inside the tool folder: relative, forward slashes, no way out of the folder.
function isInsidePath(p) {
  if (!isText(p) || p.includes('\\') || path.posix.isAbsolute(p)) return false;
  const n = path.posix.normalize(p);
  return n !== '..' && !n.startsWith('../') && n !== '.';
}

/** Rendered page name for a material: GUIDE.md -> GUIDE.html, notes/a.md -> notes-a.html. */
export function materialPage(p) {
  return path.posix.normalize(p).replace(/\.md$/i, '').replaceAll('/', '-') + '.html';
}

/**
 * Checks one parsed sim.json. `dir` is the folder name under sims/; the id must match it,
 * because the URL (sims/<id>/) and the folder have to agree.
 * @returns {string[]} every problem found, empty when the manifest is valid.
 */
export function validateManifest(m, dir) {
  if (m === null || typeof m !== 'object' || Array.isArray(m)) return ['must be a JSON object'];
  const errors = [];
  for (const k of FIELDS) if (!(k in m)) errors.push(`missing field "${k}"`);
  for (const k of Object.keys(m)) if (!FIELDS.includes(k)) errors.push(`unknown field "${k}" (allowed: ${FIELDS.join(', ')})`);

  if ('id' in m && !(typeof m.id === 'string' && ID_RE.test(m.id))) errors.push('"id" must be lowercase letters, digits, and hyphens');
  else if ('id' in m && dir !== undefined && m.id !== dir) errors.push(`"id" is "${m.id}" but the folder is "${dir}"; they must match`);
  for (const k of ['title', 'summary', 'build']) if (k in m && !isText(m[k])) errors.push(`"${k}" must be a non-empty string`);

  if ('tracks' in m) {
    if (!Array.isArray(m.tracks) || m.tracks.length === 0) errors.push('"tracks" must be a non-empty array');
    else {
      for (const t of m.tracks) if (!(typeof t === 'string' && TRACK_RE.test(t))) errors.push(`track ${JSON.stringify(t)} must be uppercase, like "ML-SYS"`);
      if (new Set(m.tracks).size !== m.tracks.length) errors.push('"tracks" has duplicates');
    }
  }
  if ('level' in m && !LEVELS.includes(m.level)) errors.push(`"level" must be one of: ${LEVELS.join(', ')}`);
  if ('status' in m && !STATUSES.includes(m.status)) errors.push(`"status" must be one of: ${STATUSES.join(', ')}`);
  if ('minutes' in m && !(Number.isInteger(m.minutes) && m.minutes > 0)) errors.push('"minutes" must be a positive integer');
  if ('lessons' in m && !(Number.isInteger(m.lessons) && m.lessons >= 0)) errors.push('"lessons" must be an integer, 0 or more');
  if ('out' in m && !isInsidePath(m.out)) errors.push('"out" must be a relative path inside the tool folder');

  if ('materials' in m) {
    if (!Array.isArray(m.materials)) errors.push('"materials" must be an array');
    else {
      const pages = new Set();
      m.materials.forEach((x, i) => {
        if (x === null || typeof x !== 'object') { errors.push(`materials[${i}] must be an object`); return; }
        if (!isText(x.label)) errors.push(`materials[${i}].label must be a non-empty string`);
        if (!isInsidePath(x.path) || !/\.md$/i.test(x.path)) { errors.push(`materials[${i}].path must be a relative .md path inside the tool folder`); return; }
        const page = materialPage(x.path);
        if (pages.has(page)) errors.push(`materials[${i}].path "${x.path}" duplicates another material`);
        pages.add(page);
      });
    }
  }
  return errors;
}

/** The catalog.json entry for a valid manifest. Hrefs are relative to the site root. */
export function catalogEntry(m) {
  const base = `sims/${m.id}/`;
  return {
    id: m.id,
    title: m.title,
    summary: m.summary,
    tracks: [...m.tracks],
    level: m.level,
    minutes: m.minutes,
    lessons: m.lessons,
    status: m.status,
    href: base,
    materials: m.materials.map((x) => ({ label: x.label, href: `${base}materials/${materialPage(x.path)}` })),
  };
}

/**
 * Rewrites one link found in a material. Links to another listed material go to its rendered
 * page; other repo-relative links go to the file on GitHub; external links and same-page
 * anchors stay as they are.
 * @param {string} href the link as written in the Markdown
 * @param {{ id: string, from: string, materials: string[], raw?: boolean }} ctx
 *   from: path of the material being rendered; materials: every listed material path;
 *   raw: link to the raw file (for images) instead of the GitHub page.
 * @returns {string}
 */
export function rewriteHref(href, { id, from, materials, raw = false }) {
  if (href === '' || href.startsWith('#') || href.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(href)) return href;
  const cut = href.search(/[?#]/);
  const target = cut < 0 ? href : href.slice(0, cut);
  const suffix = cut < 0 ? '' : href.slice(cut);
  if (target === '') return href;

  // A leading slash means the repo root on GitHub; anything else is relative to the material.
  const repoPath = target.startsWith('/')
    ? path.posix.normalize(target.slice(1))
    : path.posix.normalize(path.posix.join('sims', id, path.posix.dirname(from), target));
  if (repoPath === '..' || repoPath.startsWith('../')) throw new Error(`link "${href}" in ${from} points outside the repository`);

  const prefix = `sims/${id}/`;
  if (!raw && repoPath.startsWith(prefix)) {
    const inTool = repoPath.slice(prefix.length);
    if (materials.some((p) => path.posix.normalize(p) === inTool)) return materialPage(inTool) + suffix;
  }
  // Keep a trailing slash for folders; GitHub redirects blob/ to tree/ for directories.
  const keepSlash = target.endsWith('/') && !repoPath.endsWith('/') ? '/' : '';
  return raw
    ? `${REPO_URL}/raw/main/${repoPath}${keepSlash}${suffix}`
    : `${REPO_URL}/blob/main/${repoPath}${keepSlash}${suffix}`;
}
