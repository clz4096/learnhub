/// <reference types="node" />
/** Plain-language rules for the app's own text: no em or en dashes anywhere in the UI or help. */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { HELP_SECTIONS, TOUR_STEPS } from '@/ui/help/content';

const SRC = new URL('..', import.meta.url).pathname;
const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? files(p) : /\.(tsx?|css)$/.test(f) && !/\.test\./.test(f) ? [p] : [];
});

describe('text rules', () => {
  it('no em or en dash in any source file of the app', () => {
    for (const f of files(SRC)) expect(/[–—]/.test(readFileSync(f, 'utf8')), f).toBe(false);
  });
  it('help and tour text is short sentences with no dashes', () => {
    for (const s of HELP_SECTIONS) for (const p of s.paragraphs) {
      expect(/[–—]/.test(p)).toBe(false);
      for (const sentence of p.split(/(?<=[.!?])\s/)) expect(sentence.split(/\s+/).length, sentence).toBeLessThanOrEqual(40);
    }
    for (const t of TOUR_STEPS) expect(/[–—]/.test(t.text)).toBe(false);
  });
});
