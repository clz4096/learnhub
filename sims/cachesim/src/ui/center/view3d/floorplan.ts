/**
 * Die floorplan for the 3D view, in world units (1 unit = 1 px of the equivalent 2D grid;
 * x to the right, z toward the viewer, y up). Each cache is a plate holding its sets x ways
 * grid, laid out by the 2D layout (gridLayout.computeLayout) so rows wrap into blocks
 * exactly as in 2D. Cores sit in one row (up to 4 cores) or two rows flanking the shared
 * caches, the way real client dies put cores next to the last-level cache. Pure, for testing.
 */
import type { CacheInfo } from '@/engine/types';
import { cellOrigin, computeLayout, hitTest, type GridLayout } from '@/ui/center/gridLayout';

/** Which rows of a cache are drawn: all sets, aggregated rows, or one zoomed group exactly. */
export interface CacheView {
  /** null = all sets (aggregated if large); otherwise the zoomed group index. */
  zoom: number | null;
  exact: boolean;
  rows: number;
  /** First set of row 0 (exact views). */
  base: number;
}

/** How the mirror aggregates a cache (CacheMirror.groupSize and .groups). */
export interface Aggregation { groupSize: number; groups: number }

export function viewOf(info: CacheInfo, agg: Aggregation, zoom: number | null): CacheView {
  if (agg.groupSize === 1) return { zoom: null, exact: true, rows: info.sets, base: 0 };
  if (zoom !== null && zoom >= 0 && zoom < agg.groups) {
    const base = zoom * agg.groupSize;
    return { zoom, exact: true, rows: Math.min(agg.groupSize, info.sets - base), base };
  }
  return { zoom: null, exact: false, rows: agg.groups, base: 0 };
}

export interface Rect { x: number; z: number; w: number; d: number }

export interface CachePlacement {
  info: CacheInfo;
  view: CacheView;
  grid: GridLayout;
  /** The cache's footprint. Stable across zoom, so zooming never moves other caches. */
  plate: Rect;
  /** World position of the grid's top-left corner (cell (0, 0) starts here). */
  gx: number;
  gz: number;
  /** Height (y extent) of an unlifted cell. */
  cellHeight: number;
}

export interface CoreTile { core: number; rect: Rect; anchor: { x: number; z: number } }

export interface Floorplan {
  /** Indexed like CacheInfo.id. */
  caches: CachePlacement[];
  cores: CoreTile[];
  dram: Rect;
  die: Rect;
}

/** Inner width of a core tile and the widths and heights its grids aim for. */
export const TILE_W = 200;
const L1_MAX_H = 64;
const PRIVATE_MAX_H = 128;
const SHARED_MAX_H = 220;
/** Padding between a plate's edge and its grid. */
export const PLATE_PAD = 4;
const GAP = 12;
/** Room above a core tile's plates for the core label. */
export const TILE_HEAD = 24;
const DIE_PAD = 16;
const DRAM_GAP = 48;
const DRAM_D = 40;

const isL1 = (c: CacheInfo): boolean => c.level.startsWith('L1');

/** Height of a cell tile: proportional to the cell so small and large caches look alike. */
export function cellHeightFor(grid: GridLayout): number {
  return Math.max(1.2, Math.min(6, 0.45 * Math.min(grid.cellW, grid.cellH)));
}

/** The largest exact view a cache can show (one full group), for sizing its plate. */
function largestZoom(info: CacheInfo, agg: Aggregation): CacheView | null {
  return agg.groupSize > 1 ? viewOf(info, agg, 0) : null;
}

function gridFor(view: CacheView, ways: number, width: number, maxH: number): GridLayout {
  return computeLayout(view.rows, ways, width, 0, maxH);
}

interface Sized { info: CacheInfo; view: CacheView; grid: GridLayout; w: number; d: number; width: number; maxH: number }

function size(info: CacheInfo, agg: Aggregation, zoom: number | null, width: number, maxH: number): Sized {
  const view = viewOf(info, agg, zoom);
  const all = gridFor(viewOf(info, agg, null), info.ways, width, maxH);
  const zv = largestZoom(info, agg);
  const z = zv ? gridFor(zv, info.ways, width, maxH) : all;
  const grid = view.zoom === null ? all : gridFor(view, info.ways, width, maxH);
  return {
    info, view, grid, width, maxH,
    w: Math.max(all.width, z.width) + 2 * PLATE_PAD,
    d: Math.max(all.height, z.height) + 2 * PLATE_PAD,
  };
}

function place(s: Sized, x: number, z: number, w: number): CachePlacement {
  const plate = { x, z, w, d: s.d };
  return {
    info: s.info, view: s.view, grid: s.grid, plate,
    gx: x + (w - s.grid.width) / 2,
    gz: z + (s.d - s.grid.height) / 2,
    cellHeight: cellHeightFor(s.grid),
  };
}

/**
 * @param aggOf the mirror's aggregation for a cache
 * @param zoomOf the zoomed group of a cache, or null
 */
export function computeFloorplan(
  infos: readonly CacheInfo[],
  aggOf: (info: CacheInfo) => Aggregation,
  zoomOf: (info: CacheInfo) => number | null = () => null,
): Floorplan {
  const byCore = new Map<number, CacheInfo[]>();
  const shared: CacheInfo[] = [];
  for (const c of infos) {
    if (c.core < 0) shared.push(c);
    else (byCore.get(c.core) ?? byCore.set(c.core, []).get(c.core)!).push(c);
  }
  const coreIds = [...byCore.keys()].sort((a, b) => a - b);

  // Rows of plates inside each core tile: all L1s side by side, then each other level.
  const tileRows = new Map<number, Sized[][]>();
  let tileW = TILE_W;
  for (const core of coreIds) {
    const list = byCore.get(core)!;
    const l1 = list.filter(isL1);
    const rows: Sized[][] = [];
    if (l1.length) {
      const w = Math.floor((TILE_W - (l1.length - 1) * GAP) / l1.length) - 2 * PLATE_PAD;
      rows.push(l1.map((c) => size(c, aggOf(c), zoomOf(c), w, L1_MAX_H)));
    }
    for (const c of list) if (!isL1(c)) rows.push([size(c, aggOf(c), zoomOf(c), TILE_W - 2 * PLATE_PAD, PRIVATE_MAX_H)]);
    for (const r of rows) tileW = Math.max(tileW, r.reduce((a, s) => a + s.w, 0) + (r.length - 1) * GAP);
    tileRows.set(core, rows);
  }
  const rowDepth = (r: Sized[]): number => Math.max(...r.map((s) => s.d));
  let tileD = 0;
  for (const rows of tileRows.values()) {
    tileD = Math.max(tileD, TILE_HEAD + rows.reduce((a, r) => a + rowDepth(r), 0) + Math.max(0, rows.length - 1) * GAP + PLATE_PAD);
  }

  const n = coreIds.length;
  const cols = n <= 4 ? Math.max(1, n) : Math.ceil(n / 2);
  const rowW = cols * tileW + (cols - 1) * GAP;
  const caches: CachePlacement[] = [];
  const cores: CoreTile[] = [];

  const placeTile = (core: number, col: number, z0: number, mirrored: boolean): void => {
    const x0 = DIE_PAD + col * (tileW + GAP);
    const rect = { x: x0, z: z0, w: tileW, d: tileD };
    cores.push({ core, rect, anchor: { x: x0 + tileW / 2, z: z0 + tileD / 2 } });
    // The second core row is mirrored so its L2s face the shared cache, as on a real die.
    const rows = mirrored ? [...tileRows.get(core)!].reverse() : tileRows.get(core)!;
    let z = z0 + TILE_HEAD;
    for (const r of rows) {
      const used = r.reduce((a, s) => a + s.w, 0) + (r.length - 1) * GAP;
      // Stretch plates to the tile width so the tile reads as one block.
      const extra = (tileW - used) / r.length;
      let x = x0;
      for (const s of r) {
        caches[s.info.id] = place(s, x, z, s.w + extra);
        x += s.w + extra + GAP;
      }
      z += rowDepth(r) + GAP;
    }
  };

  let z = DIE_PAD;
  const top = coreIds.slice(0, cols);
  const bottom = coreIds.slice(cols);
  top.forEach((core, i) => placeTile(core, i, z, false));
  if (top.length) z += tileD + GAP;
  for (const c of shared) {
    const s = size(c, aggOf(c), zoomOf(c), rowW - 2 * PLATE_PAD, SHARED_MAX_H);
    caches[c.id] = place(s, DIE_PAD, z, Math.max(rowW, s.w));
    z += s.d + GAP;
  }
  if (bottom.length) {
    bottom.forEach((core, i) => placeTile(core, i, z, true));
    z += tileD + GAP;
  }
  const dieW = Math.max(rowW, ...caches.filter(Boolean).map((p) => p.plate.w)) + 2 * DIE_PAD;
  const die = { x: 0, z: 0, w: dieW, d: z - GAP + DIE_PAD };
  const dramW = Math.max(120, dieW * 0.7);
  const dram = { x: (dieW - dramW) / 2, z: die.d + DRAM_GAP, w: dramW, d: DRAM_D };
  return { caches, cores, dram, die };
}

/* ───────────────────────── cells and picking ───────────────────────── */

/** Center (x, z) and footprint (sx, sz) of the cell at (row, way) in the current view. */
export interface CellBox { cx: number; cz: number; sx: number; sz: number }

/** Fraction of a cell left as a gap, so cells read as separate tiles. */
const CELL_GAP = 0.18;

export function cellBox(p: CachePlacement, row: number, way: number): CellBox {
  const g = p.grid;
  const o = cellOrigin(g, row, way);
  const x = p.gx + o.x;
  const z = p.gz + o.y;
  const gap = Math.min(g.cellW, g.cellH) >= 3 ? CELL_GAP : 0.1;
  return { cx: x + g.cellW / 2, cz: z + g.cellH / 2, sx: g.cellW * (1 - gap), sz: g.cellH * (1 - gap) };
}

/** Row of the current view that shows `set`, or -1 when the view does not show it. */
export function rowOfSet(p: CachePlacement, groupSize: number, set: number): number {
  const v = p.view;
  if (!v.exact) return Math.floor(set / groupSize);
  const r = set - v.base;
  return r >= 0 && r < v.rows ? r : -1;
}

export type Pick = { cacheId: number; row: number; way: number } | { cacheId: number; row: -1; way: -1 };

/**
 * Cast a ray against the cell tops of every cache (analytic, so a click costs
 * O(caches), not O(instances)). Returns the cell under the ray, the cache when the ray
 * lands on a plate between cells, or null.
 */
export function pick(fp: Floorplan, o: readonly [number, number, number], d: readonly [number, number, number]): Pick | null {
  let best: Pick | null = null;
  let bestT = Infinity;
  for (const p of fp.caches) {
    if (!p) continue;
    if (Math.abs(d[1]) < 1e-9) continue;
    const t = (p.cellHeight - o[1]) / d[1];
    if (t <= 0 || t >= bestT) continue;
    const x = o[0] + t * d[0];
    const z = o[2] + t * d[2];
    const pl = p.plate;
    if (x < pl.x || x > pl.x + pl.w || z < pl.z || z > pl.z + pl.d) continue;
    bestT = t;
    const h = hitTest(p.grid, x - p.gx, z - p.gz);
    best = h && h.way >= 0 ? { cacheId: p.info.id, row: h.row, way: h.way } : { cacheId: p.info.id, row: -1, way: -1 };
  }
  return best;
}
