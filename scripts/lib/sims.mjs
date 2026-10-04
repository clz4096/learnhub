// Reads every sims/<dir>/sim.json and validates it. Used by assemble.mjs and the hub's dev server.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { catalogEntry, validateManifest } from './manifest.mjs';

/**
 * @param {string} simsDir absolute path to sims/
 * @returns {{ dir: string, manifest: any }[]} sorted by folder name
 * @throws {Error} listing every invalid manifest, so one build run shows all problems
 */
export function readManifests(simsDir) {
  const dirs = readdirSync(simsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(path.join(simsDir, d.name, 'sim.json')))
    .map((d) => d.name)
    .sort();
  const out = [];
  const problems = [];
  for (const dir of dirs) {
    const file = path.join('sims', dir, 'sim.json');
    let manifest;
    try {
      manifest = JSON.parse(readFileSync(path.join(simsDir, dir, 'sim.json'), 'utf8'));
    } catch (e) {
      problems.push(`${file}: not valid JSON (${e instanceof Error ? e.message : String(e)})`);
      continue;
    }
    const errors = validateManifest(manifest, dir);
    if (errors.length) problems.push(...errors.map((m) => `${file}: ${m}`));
    else out.push({ dir, manifest });
  }
  if (problems.length) throw new Error(`invalid tool manifest:\n  ${problems.join('\n  ')}`);
  return out;
}

/** The catalog.json document: ready tools only (owner decision, DESIGN.md). */
export function buildCatalog(manifests) {
  return { tools: manifests.filter((x) => x.manifest.status === 'ready').map((x) => catalogEntry(x.manifest)) };
}
