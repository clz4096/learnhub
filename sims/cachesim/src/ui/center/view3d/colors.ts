/**
 * Instance colors for the 3D cache grids. Colors are computed as packed sRGB integers
 * (the same palette as the 2D canvas), compared with what was last uploaded, and only
 * the changed instances are converted to linear floats and marked for upload. Pure (no
 * Three.js), for testing.
 */
import { FLASH_MS, Flash, type CacheMirror } from '@/ui/mirror';
import { FLASH_STYLE, aggregateFill, stateFill } from '@/ui/palette';
import type { CacheView } from '@/ui/center/view3d/floorplan';

/** Packed 0xRRGGBB from '#rrggbb' or 'rgb(r,g,b)'. Memoized: the palette has few strings. */
const parsed = new Map<string, number>();
export function packCss(s: string): number {
  let v = parsed.get(s);
  if (v !== undefined) return v;
  if (s.startsWith('#')) v = parseInt(s.slice(1, 7), 16);
  else {
    const m = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/.exec(s);
    v = m ? (Number(m[1]) << 16) | (Number(m[2]) << 8) | Number(m[3]) : 0;
  }
  parsed.set(s, v);
  return v;
}

/** Blend packed colors: t = 0 gives a, t = 1 gives b (in sRGB, like the 2D canvas's alpha). */
export function mix(a: number, b: number, t: number): number {
  const ch = (sh: number) => {
    const x = (a >> sh) & 255;
    return Math.round(x + (((b >> sh) & 255) - x) * t);
  };
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/** sRGB byte to linear float, as Three.js expects for instance colors under color management. */
export function srgbToLinear(c: number): number {
  const x = c / 255;
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
}
const LINEAR = Float32Array.from({ length: 256 }, (_, i) => srgbToLinear(i));

export function writeLinear(out: Float32Array, instance: number, packed: number): void {
  const o = instance * 3;
  out[o] = LINEAR[(packed >> 16) & 255]!;
  out[o + 1] = LINEAR[(packed >> 8) & 255]!;
  out[o + 2] = LINEAR[packed & 255]!;
}

const FLASH_PACKED: number[] = [];
for (const [k, st] of Object.entries(FLASH_STYLE)) FLASH_PACKED[Number(k)] = packCss(st.color);

/** Strength of the static (reduced motion) highlight. */
export const STATIC_MIX = 0.85;
/** Weakest visible flash, matching the 2D canvas's minimum alpha. */
const MIN_FLASH = 0.15;

/**
 * Color of one cell. `staticKind` (a Flash, or Flash.None) is the reduced-motion
 * highlight for the current access; with motion, flashes decay over FLASH_MS as in 2D.
 */
export function cellColor(
  m: CacheMirror, v: CacheView, row: number, way: number,
  now: number, motion: boolean, staticKind: number,
): number {
  const ways = m.info.ways;
  const shared = m.info.core < 0;
  let base: number;
  let fk: number;
  let ft: number;
  if (v.exact) {
    const slot = (v.base + row) * ways + way;
    base = packCss(stateFill(m.state[slot]!, shared));
    fk = m.flashKind[slot]!;
    ft = m.flashTime[slot]!;
  } else {
    const cell = row * ways + way;
    const n = m.groupSets(row);
    base = packCss(aggregateFill(m.aggValid[cell]! / n, m.aggDirty[cell]! / n, shared));
    fk = m.aggFlashKind[cell]!;
    ft = m.aggFlashTime[cell]!;
  }
  if (!motion) {
    const fc = staticKind !== Flash.None ? FLASH_PACKED[staticKind] : undefined;
    return fc === undefined ? base : mix(base, fc, STATIC_MIX);
  }
  const age = now - ft;
  if (fk !== Flash.None && age >= 0 && age < FLASH_MS) {
    const fc = FLASH_PACKED[fk];
    if (fc !== undefined) return mix(base, fc, Math.max(MIN_FLASH, 1 - age / FLASH_MS));
  }
  return base;
}

/** [first instance, instance count] */
export type Range = [number, number];

/**
 * Merge sorted, distinct instance indices into ranges. Indices closer than `maxGap` share
 * a range (one upload beats many tiny ones); past `maxRanges` everything becomes one range.
 */
export function mergeRanges(sorted: readonly number[], maxGap = 32, maxRanges = 8): Range[] {
  const out: Range[] = [];
  for (const i of sorted) {
    const last = out[out.length - 1];
    if (last && i - (last[0] + last[1]) <= maxGap) last[1] = i - last[0] + 1;
    else out.push([i, 1]);
  }
  if (out.length > maxRanges) {
    const first = out[0]!;
    const last = out[out.length - 1]!;
    return [[first[0], last[0] + last[1] - first[0]]];
  }
  return out;
}

const UNSET = 0xffffffff;

/**
 * Last uploaded color per instance, so a recolor touches only what changed. `rgb` is the
 * instance color buffer (linear floats, 3 per instance) shared with the GPU attribute.
 */
export class InstanceColors {
  readonly packed: Uint32Array;
  readonly rgb: Float32Array;
  private readonly changed: number[] = [];

  constructor(capacity: number) {
    this.packed = new Uint32Array(capacity).fill(UNSET);
    this.rgb = new Float32Array(capacity * 3);
  }

  /** Forget what was uploaded, so the next update rewrites every instance. */
  invalidate(): void {
    this.packed.fill(UNSET);
  }

  /**
   * Recolor the first `count` instances (instance = row × ways + way) and return the
   * changed ranges. `statics` maps instance to its reduced-motion highlight kind.
   */
  update(
    m: CacheMirror, v: CacheView, now: number, motion: boolean,
    statics: ReadonlyMap<number, number> | null,
  ): Range[] {
    const ways = m.info.ways;
    const changed = this.changed;
    changed.length = 0;
    for (let row = 0, i = 0; row < v.rows; row++) {
      for (let w = 0; w < ways; w++, i++) {
        const c = cellColor(m, v, row, w, now, motion, statics?.get(i) ?? Flash.None);
        if (c !== this.packed[i]) {
          this.packed[i] = c;
          writeLinear(this.rgb, i, c);
          changed.push(i);
        }
      }
    }
    return mergeRanges(changed);
  }
}
