import { describe, expect, it } from 'vitest';
import { EventKind, Mesi, type CacheInfo } from '@/engine/types';
import { CacheMirror, FLASH_MS, Flash } from '@/ui/mirror';
import { FLASH_STYLE, STATE_FILL } from '@/ui/palette';
import {
  InstanceColors, STATIC_MIX, cellColor, mergeRanges, mix, packCss, srgbToLinear,
} from '@/ui/center/view3d/colors';
import { viewOf } from '@/ui/center/view3d/floorplan';

const info = (sets: number, ways: number, core = 0): CacheInfo => ({
  id: 0, level: 'L1d', core, sets, ways, lineBytes: 64, sizeBytes: sets * ways * 64, latency: 4, policy: 'lru',
});
const hex = (s: string) => packCss(s);

describe('color math', () => {
  it('parses hex and rgb() strings', () => {
    expect(packCss('#1a7f37')).toBe(0x1a7f37);
    expect(packCss('rgb(1,2,3)')).toBe(0x010203);
  });
  it('mix blends per channel', () => {
    expect(mix(0x000000, 0xffffff, 0)).toBe(0);
    expect(mix(0x000000, 0xffffff, 1)).toBe(0xffffff);
    expect(mix(0x000000, 0x00ff00, 0.5)).toBe(0x008000);
  });
  it('srgbToLinear matches the sRGB transfer function at its ends and midpoint', () => {
    expect(srgbToLinear(0)).toBe(0);
    expect(srgbToLinear(255)).toBeCloseTo(1, 6);
    expect(srgbToLinear(128)).toBeCloseTo(0.2158605, 5);
  });
});

describe('mergeRanges', () => {
  it('joins close indices, splits far ones, collapses when too many', () => {
    expect(mergeRanges([])).toEqual([]);
    expect(mergeRanges([3, 4, 5, 10], 8)).toEqual([[3, 8]]);
    expect(mergeRanges([0, 100], 8)).toEqual([[0, 1], [100, 1]]);
    expect(mergeRanges([0, 100, 200], 8, 2)).toEqual([[0, 201]]);
  });
});

describe('cellColor', () => {
  it('uses the 2D state fills and decays a flash like the 2D canvas', () => {
    const m = new CacheMirror(info(4, 2));
    const v = viewOf(m.info, m, null);
    expect(cellColor(m, v, 0, 0, 0, true, Flash.None)).toBe(hex(STATE_FILL.empty));
    m.apply({ cache: 0, set: 1, way: 0, kind: EventKind.Fill, line: 9, state: Mesi.M }, 1000);
    const miss = hex(FLASH_STYLE[Flash.Miss]!.color);
    const m0 = hex(STATE_FILL.M);
    expect(cellColor(m, v, 1, 0, 1000, true, Flash.None)).toBe(miss);
    expect(cellColor(m, v, 1, 0, 1000 + FLASH_MS / 2, true, Flash.None)).toBe(mix(m0, miss, 0.5));
    expect(cellColor(m, v, 1, 0, 1000 + FLASH_MS, true, Flash.None)).toBe(m0);
  });

  it('reduced motion: no flash, a static highlight only for the given kind', () => {
    const m = new CacheMirror(info(4, 2));
    const v = viewOf(m.info, m, null);
    m.apply({ cache: 0, set: 0, way: 1, kind: EventKind.Hit, line: 1, state: Mesi.E }, 50);
    const e = hex(STATE_FILL.E);
    expect(cellColor(m, v, 0, 1, 50, false, Flash.None)).toBe(e);
    expect(cellColor(m, v, 0, 1, 50_000, false, Flash.Hit)).toBe(mix(e, hex(FLASH_STYLE[Flash.Hit]!.color), STATIC_MIX));
  });

  it('aggregated rows shade from the mirror counts', () => {
    const m = new CacheMirror(info(1024, 2, -1));
    expect(m.groupSize).toBeGreaterThan(1);
    const v = viewOf(m.info, m, null);
    const empty = cellColor(m, v, 0, 0, 0, true, Flash.None);
    m.apply({ cache: 0, set: 1, way: 0, kind: EventKind.Fill, line: 1 }, 0);
    expect(cellColor(m, v, 0, 0, 10_000, true, Flash.None)).not.toBe(empty);
    expect(cellColor(m, v, 0, 1, 10_000, true, Flash.None)).toBe(empty);
  });
});

describe('InstanceColors', () => {
  it('writes everything once, then only what changed, in linear floats', () => {
    const m = new CacheMirror(info(8, 4));
    const v = viewOf(m.info, m, null);
    const ic = new InstanceColors(32);
    expect(ic.update(m, v, 0, true, null)).toEqual([[0, 32]]);
    expect(ic.update(m, v, 0, true, null)).toEqual([]);
    m.apply({ cache: 0, set: 5, way: 2, kind: EventKind.Fill, line: 3, state: Mesi.E }, 10);
    expect(ic.update(m, v, 10, true, null)).toEqual([[22, 1]]);
    const miss = hex(FLASH_STYLE[Flash.Miss]!.color);
    expect(ic.rgb[22 * 3]).toBeCloseTo(srgbToLinear((miss >> 16) & 255), 6);
    // After the flash decays the cell settles to its state fill: one more change, then none.
    expect(ic.update(m, v, 10 + FLASH_MS, true, null)).toEqual([[22, 1]]);
    expect(ic.update(m, v, 20 + FLASH_MS, true, null)).toEqual([]);
    ic.invalidate();
    expect(ic.update(m, v, 20 + FLASH_MS, true, null)).toEqual([[0, 32]]);
  });

  it('applies static highlights by instance', () => {
    const m = new CacheMirror(info(2, 2));
    const v = viewOf(m.info, m, null);
    const ic = new InstanceColors(4);
    ic.update(m, v, 0, false, null);
    expect(ic.update(m, v, 0, false, new Map([[3, Flash.Invalidate]]))).toEqual([[3, 1]]);
  });
});
