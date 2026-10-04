/**
 * Colors and glyphs for cache cells and events. Canvas drawing cannot read CSS custom
 * properties cheaply per frame, so these live here; legends render from the same
 * table, so the canvas and the legend cannot drift apart.
 */
import { Flash } from '@/ui/mirror';

export interface FlashStyle { label: string; color: string; glyph: string }

/** Event highlight: color plus a glyph, so no meaning depends on color alone. */
export const FLASH_STYLE: Record<number, FlashStyle> = {
  [Flash.Hit]: { label: 'hit', color: '#1a7f37', glyph: '✓' },
  [Flash.Miss]: { label: 'miss / fill', color: '#cf222e', glyph: '✕' },
  [Flash.Evict]: { label: 'eviction', color: '#c4570a', glyph: '↥' },
  [Flash.Invalidate]: { label: 'invalidation', color: '#8250df', glyph: '⊘' },
  [Flash.Prefetch]: { label: 'prefetch', color: '#0969da', glyph: '»' },
  [Flash.State]: { label: 'state change', color: '#57606a', glyph: '◆' },
  [Flash.Writeback]: { label: 'write-back', color: '#7d4e00', glyph: '⇩' },
};

/** Cell fill by stored state. Private caches: MESI. Shared caches: 1 clean, 3 dirty. */
export const STATE_FILL = {
  empty: '#ffffff',
  grid: '#d8dee4',
  S: '#d3e3f4',
  E: '#d4ecd9',
  M: '#f3d9a4',
  clean: '#dde3ea',
  dirty: '#f3d9a4',
} as const;

export const OUTLINE = { current: '#1f2328', selected: '#0b5cad' } as const;

export function stateFill(st: number, shared: boolean): string {
  if (st === 0) return STATE_FILL.empty;
  if (shared) return st === 3 ? STATE_FILL.dirty : STATE_FILL.clean;
  return st === 1 ? STATE_FILL.S : st === 2 ? STATE_FILL.E : STATE_FILL.M;
}

export function stateLetter(st: number, shared: boolean): string {
  if (st === 0) return '';
  if (shared) return st === 3 ? 'D' : '';
  return st === 1 ? 'S' : st === 2 ? 'E' : 'M';
}

export function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}


const WHITE = rgb(STATE_FILL.empty);
const AGG_PRIVATE = rgb('#8fb4dc');
const AGG_SHARED = rgb('#9fb0c3');
const AGG_DIRTY = rgb('#e0a030');

/** Shading steps for aggregated cells; quantizing lets fill strings come from a table. */
const STEPS = 16;
const aggTable = (shared: boolean): string[] => {
  const out: string[] = [];
  const base = shared ? AGG_SHARED : AGG_PRIVATE;
  for (let vi = 0; vi <= STEPS; vi++) {
    for (let di = 0; di <= STEPS; di++) {
      const v = vi / STEPS;
      const d = (di / STEPS) * 0.8;
      const c = WHITE.map((w, i) => {
        const a = w + (base[i]! - w) * v;
        return Math.round(a + (AGG_DIRTY[i]! - a) * d);
      });
      out.push(`rgb(${c[0]},${c[1]},${c[2]})`);
    }
  }
  return out;
};
const AGG_FILL = { private: aggTable(false), shared: aggTable(true) };

/** Fill for an aggregated cell: shade by the fraction of valid slots, tinted by the dirty fraction. */
export function aggregateFill(valid: number, dirty: number, shared: boolean): string {
  const q = (f: number) => Math.round(Math.min(1, Math.max(0, f)) * STEPS);
  // Any valid line shows at least the first step, so a nearly empty row is not drawn as empty.
  const vi = valid > 0 ? Math.max(1, q(valid)) : 0;
  const di = dirty > 0 ? Math.max(1, q(dirty)) : 0;
  return (shared ? AGG_FILL.shared : AGG_FILL.private)[vi * (STEPS + 1) + di]!;
}
