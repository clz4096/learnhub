/**
 * Which cells of one 2D grid need repainting this frame. Pure, for testing.
 *
 * A cell needs repainting when the mirror changed it (state or a new highlight) or while
 * its highlight is fading, plus once more when the highlight ends. With 8 cores at 8x
 * that is a few hundred cells per frame, against tens of thousands for full repaints.
 * Cell indexes are view-relative: row × ways + way, row 0 being the view's first row.
 */
import { FLASH_MS, Flash, type CacheMirror } from '@/ui/mirror';

/** The part of Grid2D's view that maps mirror indexes to view cells. */
export interface GridView {
  /** True when rows are single sets; false when rows are the mirror's set groups. */
  exact: boolean;
  rows: number;
  /** First set of row 0 (exact views). */
  base: number;
}

export class GridDirt {
  private active: number[] = [];
  private readonly seen: Uint8Array;

  constructor(private readonly cells: number) {
    this.seen = new Uint8Array(cells);
  }

  /**
   * After a full repaint: discard pending changes and track the cells that are still
   * highlighted, so their fade continues cell by cell.
   */
  reset(m: CacheMirror, v: GridView, now: number, motion: boolean): void {
    m.changedSlots.take();
    m.changedCells.take();
    this.active = [];
    if (!motion) return;
    for (let c = 0; c < this.cells; c++) if (flashing(m, v, c, now)) this.active.push(c);
  }

  /**
   * Cells to repaint now, or null when the whole grid must be repainted (the mirror's
   * change log overflowed or was replaced by a snapshot).
   */
  frame(m: CacheMirror, v: GridView, now: number, motion: boolean): number[] | null {
    const slots = m.changedSlots.take();
    const groups = m.changedCells.take();
    const log = v.exact ? slots : groups;
    if (log === null) return null;
    const ways = m.info.ways;
    const out: number[] = [];
    const add = (c: number) => {
      if (c < 0 || c >= this.cells || this.seen[c]) return;
      this.seen[c] = 1;
      out.push(c);
    };
    for (const c of this.active) add(c);
    const first = v.base * ways;
    for (const i of log) add(v.exact ? i - first : i);
    const still: number[] = [];
    for (const c of out) {
      this.seen[c] = 0;
      if (motion && flashing(m, v, c, now)) still.push(c);
    }
    this.active = still;
    return out;
  }

  /** Cells currently tracked as fading (for tests). */
  get fading(): readonly number[] {
    return this.active;
  }
}

/** Highlight kind and start time of view cell c. */
export function cellFlash(m: CacheMirror, v: GridView, c: number): { kind: number; time: number } {
  if (v.exact) {
    const slot = v.base * m.info.ways + c;
    return { kind: m.flashKind[slot]!, time: m.flashTime[slot]! };
  }
  return { kind: m.aggFlashKind[c]!, time: m.aggFlashTime[c]! };
}

function flashing(m: CacheMirror, v: GridView, c: number, now: number): boolean {
  const slot = v.exact ? v.base * m.info.ways + c : c;
  const kind = v.exact ? m.flashKind[slot]! : m.aggFlashKind[slot]!;
  const age = now - (v.exact ? m.flashTime[slot]! : m.aggFlashTime[slot]!);
  return kind !== Flash.None && age >= 0 && age < FLASH_MS;
}
