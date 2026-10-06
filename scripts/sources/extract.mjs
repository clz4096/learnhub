// Extracts readable text from every fetched source in sources/manifest.json:
// PDFs through macOS PDFKit (pdf2txt.swift, compiled once into sources/.tools/), HTML pages
// through a small tag stripper, LaTeX source as it is. Writes sources/<course>/<id>.txt next to each file and
// sources/extraction-report.json, which flags pages whose math probably did not survive and
// lists the links each HTML page points to (listed, never fetched).
//
//   node scripts/sources/extract.mjs
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const OUT = path.join(ROOT, 'sources');
const manifest = JSON.parse(readFileSync(path.join(OUT, 'manifest.json'), 'utf8'));

function pdfTool() {
  const src = path.join(HERE, 'pdf2txt.swift');
  const bin = path.join(OUT, '.tools', 'pdf2txt');
  if (!existsSync(bin) || statSync(bin).mtimeMs < statSync(src).mtimeMs) {
    mkdirSync(path.dirname(bin), { recursive: true });
    execFileSync('swiftc', ['-O', src, '-o', bin], { stdio: 'inherit' });
  }
  return bin;
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '-', mdash: '-', rsquo: "'", lsquo: "'", rdquo: '"', ldquo: '"', hellip: '...' };

function decode(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}

/** Readable text of an HTML page, and the links it contains. */
function htmlToText(html, base) {
  const links = [];
  for (const m of html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    try {
      const url = new URL(decode(m[1]), base).href;
      const label = decode(m[2].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
      links.push({ url, label });
    } catch { /* not a URL */ }
  }
  const text = decode(
    html
      .replace(/<(script|style|noscript|svg|head)\b[\s\S]*?<\/\1>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<(br|hr)\b[^>]*>/gi, '\n')
      .replace(/<\/?(p|div|li|ul|ol|h[1-6]|tr|table|section|article|header|footer|nav|main|dt|dd|blockquote|pre)\b[^>]*>/gi, '\n')
      .replace(/<li\b[^>]*>/gi, '\n- ')
      .replace(/<[^>]+>/g, ''),
  )
    .split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' ').trim())
    .filter((l, i, a) => l !== '' || (i > 0 && a[i - 1] !== ''))
    .join('\n')
    .trim();
  return { text, links };
}

/**
 * Pages whose math probably did not survive: glyphs from private-use code points or U+FFFD
 * (symbol fonts without a Unicode map), or many one- and two-character lines (fractions,
 * matrices, and displayed formulas broken into fragments). A heuristic, so the report says
 * "check", not "broken".
 */
function mathLoss(pageText) {
  const bad = (pageText.match(/[-�]/g) ?? []).length;
  const lines = pageText.split('\n').filter((l) => l.trim() !== '');
  const tiny = lines.filter((l) => l.trim().length <= 2).length;
  const tinyShare = lines.length > 0 ? tiny / lines.length : 0;
  // Math-alphabet letters (U+1D400 to U+1D7FF) come from equation fonts; in the TMUA notes
  // PDFKit emits them doubled and sometimes as the wrong letter, so they are never trusted.
  const mathLetters = (pageText.match(/[\u{1D400}-\u{1D7FF}]/gu) ?? []).length;
  const reasons = [];
  if (bad > 0) reasons.push(`${bad} unmapped glyphs`);
  if (mathLetters > 0) reasons.push(`${mathLetters} math-alphabet letters (equation font; read the PDF)`);
  if (lines.length >= 10 && tinyShare > 0.25) reasons.push(`${Math.round(tinyShare * 100)}% of lines are 1 or 2 characters (fragmented formulas)`);
  return reasons;
}

const tool = pdfTool();
const report = { generated_at: new Date().toISOString(), sources: [] };

for (const s of manifest.sources) {
  if (s.status !== 'ok') continue;
  const file = path.join(ROOT, s.path);
  const txt = file.replace(/\.[a-z]+$/, '.txt');
  const entry = { id: s.id, txt: path.relative(ROOT, txt) };
  if (s.path.endsWith('.pdf')) {
    const text = execFileSync(tool, [file], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
    writeFileSync(txt, text);
    const pages = text.split(/^=== page (\d+) ===$/m).slice(1);
    const flagged = [];
    for (let i = 0; i < pages.length; i += 2) {
      const reasons = mathLoss(pages[i + 1]);
      if (reasons.length > 0) flagged.push({ page: Number(pages[i]), reasons });
    }
    Object.assign(entry, { pages: pages.length / 2, chars: text.length, math_check: flagged });
    if (text.replace(/=== page \d+ ===/g, '').trim().length === 0) entry.warning = 'no text layer (scanned?)';
  } else if (s.path.endsWith('.html')) {
    const { text, links } = htmlToText(readFileSync(file, 'utf8'), s.url);
    writeFileSync(txt, `${text}\n`);
    const files = links.filter((l) => /\.(pdf|ps|tex|zip)(\?|#|$)/i.test(l.url));
    Object.assign(entry, { chars: text.length, linked_files: files });
  } else if (s.path.endsWith('.tex')) {
    // LaTeX source is already text: the mathematics is exactly as typeset, so it is copied as is.
    const text = readFileSync(file, 'utf8');
    writeFileSync(txt, text);
    Object.assign(entry, { chars: text.length });
  }
  report.sources.push(entry);
  const flags = entry.math_check?.length ? `, ${entry.math_check.length} pages to check` : '';
  console.log(`${s.id}: ${entry.pages ?? '-'} pages, ${entry.chars} chars${flags}${entry.warning ? `, ${entry.warning}` : ''}`);
}

writeFileSync(path.join(OUT, 'extraction-report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log('\nReport: sources/extraction-report.json');
