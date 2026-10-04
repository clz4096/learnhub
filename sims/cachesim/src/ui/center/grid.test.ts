import { describe, expect, it } from 'vitest';
import { EventKind, Mesi, type CacheInfo, type SimEvent } from '@/engine/types';
import { CacheMirror, FLASH_MS } from '@/ui/mirror';
import { GridDirt, type GridView } from '@/ui/center/gridDirty';
import { PAGE_ROWS, describeCell, moveCursor } from '@/ui/center/gridNav';

const info = (sets: number, ways: number, core = 0): CacheInfo => ({
  id: 0, level: 'L1d', core, sets, ways, lineBytes: 64, sizeBytes: sets * ways * 64, latency: 4, policy: 'lru',
});
const ev = (kind: EventKind, set: number, way: number, line: number, extra: Partial<SimEvent> = {}): SimEvent =>
  ({ cache: 0, set, way, kind, line, ...extra });
const exact = (m: CacheMirror): GridView => ({ exact: true, rows: m.info.sets, base: 0 });
const hex = (a: number) => `0x${a.toString(16)}`;

describe('GridDirt', () => {
  it('repaints changed cells, keeps fading ones, and drops them once the flash ends', () => {
    const m = new CacheMirror(info(4, 2));
    const v = exact(m);
    const d = new GridDirt(8);
    d.reset(m, v, 0, true);
    expect(d.frame(m, v, 0, true)).toEqual([]);
    m.apply(ev(EventKind.Fill, 2, 1, 9, { state: Mesi.E }), 100);
    expect(d.frame(m, v, 100, true)).toEqual([5]);
    expect(d.fading).toEqual([5]);
    // Still fading: repainted with no new change.
    expect(d.frame(m, v, 100 + FLASH_MS / 2, true)).toEqual([5]);
    // Ended: one last repaint to clear the highlight, then nothing.
    expect(d.frame(m, v, 100 + FLASH_MS, true)).toEqual([5]);
    expect(d.frame(m, v, 200 + FLASH_MS, true)).toEqual([]);
  });

  it('reduced motion repaints changes only', () => {
    const m = new CacheMirror(info(4, 2));
    const d = new GridDirt(8);
    m.apply(ev(EventKind.Hit, 0, 0, 1, { state: Mesi.S }), 5);
    expect(d.frame(m, exact(m), 5, false)).toEqual([0]);
    expect(d.frame(m, exact(m), 6, false)).toEqual([]);
  });

  it('maps slots into a zoomed view and ignores slots outside it', () => {
    const m = new CacheMirror(info(1024, 2, -1));
    const g = m.groupSize;
    const v: GridView = { exact: true, rows: g, base: 3 * g };
    const d = new GridDirt(g * 2);
    m.apply(ev(EventKind.Fill, 3 * g + 1, 1, 7), 1);
    m.apply(ev(EventKind.Fill, 0, 0, 8), 1);
    expect(d.frame(m, v, 1, true)).toEqual([3]);
  });

  it('uses aggregate cells for an aggregated view', () => {
    const m = new CacheMirror(info(1024, 2, -1));
    const v: GridView = { exact: false, rows: m.groups, base: 0 };
    const d = new GridDirt(m.groups * 2);
    m.apply(ev(EventKind.Fill, m.groupSize * 2, 1, 7), 1);
    expect(d.frame(m, v, 1, true)).toEqual([5]);
  });

  it('a snapshot asks for a full repaint; reset then tracks what is still fading', () => {
    const m = new CacheMirror(info(2, 2));
    const v = exact(m);
    const d = new GridDirt(4);
    m.apply(ev(EventKind.Fill, 0, 0, 1, { state: Mesi.E }), 1);
    m.applySnapshot(new Float64Array(4).fill(-1), new Uint8Array(4));
    expect(d.frame(m, v, 2, true)).toBeNull();
    m.apply(ev(EventKind.Fill, 1, 1, 2, { state: Mesi.E }), 3);
    d.reset(m, v, 3, true);
    expect(d.fading).toEqual([3]);
    expect(d.frame(m, v, 4, true)).toEqual([3]);
  });
});

describe('grid keyboard navigation', () => {
  it('moves with arrows, Home/End, and pages, clamped to the grid', () => {
    const at = { row: 1, way: 1 };
    expect(moveCursor(at, 'ArrowUp', 10, 4)).toEqual({ row: 0, way: 1 });
    expect(moveCursor({ row: 0, way: 1 }, 'ArrowUp', 10, 4)).toEqual({ row: 0, way: 1 });
    expect(moveCursor(at, 'ArrowDown', 10, 4)).toEqual({ row: 2, way: 1 });
    expect(moveCursor(at, 'ArrowLeft', 10, 4)).toEqual({ row: 1, way: 0 });
    expect(moveCursor({ row: 1, way: 3 }, 'ArrowRight', 10, 4)).toEqual({ row: 1, way: 3 });
    expect(moveCursor(at, 'Home', 10, 4)).toEqual({ row: 1, way: 0 });
    expect(moveCursor(at, 'End', 10, 4)).toEqual({ row: 1, way: 3 });
    expect(moveCursor(at, 'PageDown', 100, 4)).toEqual({ row: 1 + PAGE_ROWS, way: 1 });
    expect(moveCursor(at, 'PageDown', 5, 4)).toEqual({ row: 4, way: 1 });
    expect(moveCursor(at, 'PageUp', 100, 4)).toEqual({ row: 0, way: 1 });
    expect(moveCursor(at, 'a', 10, 4)).toBeNull();
  });

  it('describes exact and aggregated cells', () => {
    const m = new CacheMirror(info(4, 2));
    m.apply(ev(EventKind.Fill, 2, 1, 3, { state: Mesi.M }), 1);
    expect(describeCell(m, exact(m), { row: 2, way: 1 }, hex)).toBe('Set 2, way 1: line at 0xc0, M (modified).');
    expect(describeCell(m, exact(m), { row: 0, way: 0 }, hex)).toBe('Set 0, way 0: empty.');
    const big = new CacheMirror(info(1024, 2, -1));
    big.apply(ev(EventKind.Fill, 1, 0, 3), 1);
    const g = big.groupSize;
    expect(describeCell(big, { exact: false, rows: big.groups, base: 0 }, { row: 0, way: 0 }, hex))
      .toBe(`Sets 0 to ${g - 1}, way 0: 1 of ${g} hold a line, 0 dirty. Enter zooms in.`);
  });
});
