import { describe, expect, it } from 'vitest';
import { PRESETS, Simulator, cloneConfig, type CacheInfo } from '@/engine';
import { CacheMirror } from '@/ui/mirror';
import {
  cellBox, computeFloorplan, pick, rowOfSet, viewOf, type Floorplan, type Rect,
} from '@/ui/center/view3d/floorplan';

function setup(presetId: string, zooms: Record<number, number> = {}) {
  const preset = PRESETS.find((p) => p.id === presetId)!;
  const infos = new Simulator(cloneConfig(preset.config)).infos;
  const mirrors = infos.map((c) => new CacheMirror(c));
  const fp = computeFloorplan(infos, (c) => mirrors[c.id]!, (c) => zooms[c.id] ?? null);
  return { infos, mirrors, fp };
}

const inside = (inner: Rect, outer: Rect) =>
  inner.x >= outer.x - 1e-9 && inner.z >= outer.z - 1e-9
  && inner.x + inner.w <= outer.x + outer.w + 1e-9 && inner.z + inner.d <= outer.z + outer.d + 1e-9;
const overlap = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.z < b.z + b.d && b.z < a.z + a.d;

/** Ray straight down onto (x, z). */
const down = (fp: Floorplan, x: number, z: number) => pick(fp, [x, 500, z], [0, -1, 0]);

describe('viewOf', () => {
  const info = { sets: 1000 } as CacheInfo;
  it('shows small caches exactly', () => {
    expect(viewOf(info, { groupSize: 1, groups: 1000 }, null)).toEqual({ zoom: null, exact: true, rows: 1000, base: 0 });
  });
  it('aggregates large caches and zooms into one group, short last group included', () => {
    const agg = { groupSize: 4, groups: 250 };
    expect(viewOf(info, agg, null)).toEqual({ zoom: null, exact: false, rows: 250, base: 0 });
    expect(viewOf(info, agg, 3)).toEqual({ zoom: 3, exact: true, rows: 4, base: 12 });
    expect(viewOf({ sets: 1001 } as CacheInfo, { groupSize: 4, groups: 251 }, 250).rows).toBe(1);
    expect(viewOf(info, agg, 999).exact).toBe(false);
  });
});

describe('computeFloorplan', () => {
  it('Raptor Cove: 8 cores in two rows flank the shared L3; plates never overlap', () => {
    const { infos, fp } = setup('intel-raptor-cove');
    expect(fp.cores).toHaveLength(8);
    const l3 = fp.caches[infos.find((c) => c.core < 0)!.id]!;
    const top = fp.cores.filter((t) => t.rect.z < l3.plate.z);
    const bottom = fp.cores.filter((t) => t.rect.z > l3.plate.z);
    expect(top.map((t) => t.core)).toEqual([0, 1, 2, 3]);
    expect(bottom.map((t) => t.core)).toEqual([4, 5, 6, 7]);
    const plates = fp.caches.map((p) => p.plate);
    for (let i = 0; i < plates.length; i++) {
      expect(inside(plates[i]!, fp.die)).toBe(true);
      for (let j = i + 1; j < plates.length; j++) expect(overlap(plates[i]!, plates[j]!)).toBe(false);
    }
    // Each private cache sits inside its core's tile.
    for (const c of infos.filter((x) => x.core >= 0)) {
      expect(inside(fp.caches[c.id]!.plate, fp.cores[c.core]!.rect)).toBe(true);
    }
    // The bottom row is mirrored: its L2 is nearer the L3 than its L1d.
    const l1d4 = fp.caches[infos.find((c) => c.core === 4 && c.level === 'L1d')!.id]!;
    const l24 = fp.caches[infos.find((c) => c.core === 4 && c.level === 'L2')!.id]!;
    expect(l24.plate.z).toBeLessThan(l1d4.plate.z);
    expect(fp.dram.z).toBeGreaterThan(fp.die.z + fp.die.d);
  });

  it('grids fit their plates, aggregated or zoomed, and zooming moves no plate', () => {
    const base = setup('intel-raptor-cove');
    const l3id = base.infos.find((c) => c.core < 0)!.id;
    const l2id = base.infos.find((c) => c.level === 'L2')!.id;
    const zoomed = setup('intel-raptor-cove', { [l3id]: 7, [l2id]: 3 });
    for (const fp of [base.fp, zoomed.fp]) {
      for (const p of fp.caches) {
        expect(inside({ x: p.gx, z: p.gz, w: p.grid.width, d: p.grid.height }, p.plate)).toBe(true);
      }
    }
    expect(zoomed.fp.caches.map((p) => p.plate)).toEqual(base.fp.caches.map((p) => p.plate));
    const l3 = zoomed.fp.caches[l3id]!;
    expect(l3.view).toMatchObject({ exact: true, zoom: 7, base: 7 * base.mirrors[l3id]!.groupSize });
    expect(base.fp.caches[l3id]!.view.exact).toBe(false);
    // The L3 is drawn from 256 aggregate rows of 12 ways: instance count is bounded.
    expect(base.fp.caches[l3id]!.view.rows * base.infos[l3id]!.ways).toBe(256 * 12);
  });

  it('one core (textbook) and an L1i side by side with the L1d', () => {
    const cfg = cloneConfig(PRESETS[0]!.config);
    cfg.cores = 1;
    cfg.l1i = { ...cfg.l1d, name: 'L1i' };
    const infos = new Simulator(cfg).infos;
    const fp = computeFloorplan(infos, (c) => new CacheMirror(c));
    const d = fp.caches[infos.find((c) => c.level === 'L1d')!.id]!.plate;
    const i = fp.caches[infos.find((c) => c.level === 'L1i')!.id]!.plate;
    expect(i.z).toBe(d.z);
    expect(i.x).toBeGreaterThan(d.x + d.w - 1e-9);
  });
});

describe('cells and picking', () => {
  it('pick finds the cell under a ray at every corner of a grid', () => {
    const { infos, fp } = setup('intel-coffee-lake');
    for (const c of infos.slice(0, 2)) {
      const p = fp.caches[c.id]!;
      const rows = p.view.rows;
      for (const [row, way] of [[0, 0], [0, c.ways - 1], [rows - 1, 0], [rows - 1, c.ways - 1], [rows >> 1, 1]] as const) {
        const b = cellBox(p, row, way);
        expect(down(fp, b.cx, b.cz)).toEqual({ cacheId: c.id, row, way });
      }
    }
  });

  it('pick on a plate margin selects the cache; off the die hits nothing', () => {
    const { fp } = setup('intel-coffee-lake');
    const p = fp.caches[0]!;
    expect(down(fp, p.plate.x + 1, p.plate.z + 1)).toEqual({ cacheId: 0, row: -1, way: -1 });
    expect(down(fp, -50, -50)).toBeNull();
    expect(pick(fp, [0, 500, 0], [1, 0, 0])).toBeNull();
  });

  it('an oblique ray hits the cell whose top it crosses', () => {
    const { fp } = setup('intel-coffee-lake');
    const p = fp.caches[0]!;
    const b = cellBox(p, 2, 3);
    const dir: [number, number, number] = [0.3, -1, 0.5];
    const t = 400;
    const o: [number, number, number] = [b.cx - dir[0] * t, p.cellHeight - dir[1] * t, b.cz - dir[2] * t];
    expect(pick(fp, o, dir)).toEqual({ cacheId: 0, row: 2, way: 3 });
  });

  it('rowOfSet maps sets to aggregate rows, or to zoomed rows only within the group', () => {
    const { infos, mirrors } = setup('intel-raptor-cove');
    const l3 = infos.find((c) => c.core < 0)!;
    const g = mirrors[l3.id]!.groupSize;
    const all = computeFloorplan(infos, (c) => mirrors[c.id]!).caches[l3.id]!;
    expect(rowOfSet(all, g, g * 5 + 1)).toBe(5);
    const z = computeFloorplan(infos, (c) => mirrors[c.id]!, (c) => (c.id === l3.id ? 5 : null)).caches[l3.id]!;
    expect(rowOfSet(z, g, g * 5 + 1)).toBe(1);
    expect(rowOfSet(z, g, g * 6)).toBe(-1);
  });
});
