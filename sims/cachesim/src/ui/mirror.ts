/**
 * Main-thread mirror of one cache's contents, updated only from SimEvents (and from a
 * full snapshot after "run to end"). Rendering reads this; it never asks the worker.
 *
 * Besides the exact slot arrays, the mirror keeps per-(set group, way) counts of valid
 * and dirty slots, updated incrementally on each change. A large cache (an L3 can hold
 * ~600k lines) is drawn from these aggregates, so drawing costs O(groups × ways),
 * independent of cache size and of trace length.
 */
import { EventKind, type CacheInfo, type SimEvent } from '@/engine/types';

/** Caches with more sets than this are drawn aggregated: several sets per row. */
export const MAX_ROWS = 256;
/** How long an event's highlight lasts. */
export const FLASH_MS = 600;

/** Highlight categories; numeric so they fit an Int8Array. -1 = none. */
export const enum Flash {
  None = -1,
  Hit = 0,
  Miss = 1,
  Evict = 2,
  Invalidate = 3,
  Prefetch = 4,
  State = 5,
  Writeback = 6,
}

const FLASH_OF: Record<EventKind, Flash> = {
  [EventKind.Hit]: Flash.Hit,
  [EventKind.Fill]: Flash.Miss,
  [EventKind.Evict]: Flash.Evict,
  [EventKind.Invalidate]: Flash.Invalidate,
  [EventKind.Prefetch]: Flash.Prefetch,
  [EventKind.Writeback]: Flash.Writeback,
  [EventKind.StateChange]: Flash.State,
};

/**
 * When one access produces several events on the same slot (a fill followed by the
 * eviction of the previous occupant), keep the most instructive one. Eviction outranks
 * the miss: the replacing fill always comes with its own Fill elsewhere in the hierarchy
 * or in the current-access outline, but an eviction is only visible here.
 */
const PRIORITY: Record<number, number> = {
  [Flash.Invalidate]: 6, [Flash.Evict]: 5, [Flash.Miss]: 4, [Flash.Prefetch]: 3,
  [Flash.Hit]: 2, [Flash.Writeback]: 1, [Flash.State]: 0,
};

/**
 * Indexes touched since the consumer last took them, deduplicated. Past `cap` entries it
 * stops recording and reports overflow instead: the consumer then redraws everything,
 * which is cheaper than many single cells and keeps memory bounded while nothing drains
 * the log (the 3D view does not use it).
 */
export class ChangeLog {
  private readonly marked: Uint8Array;
  private list: number[] = [];
  private full = false;

  constructor(size: number, private readonly cap = Math.max(64, size >> 2)) {
    this.marked = new Uint8Array(size);
  }

  add(i: number): void {
    if (this.full || this.marked[i]) return;
    if (this.list.length >= this.cap) {
      this.overflow();
      return;
    }
    this.marked[i] = 1;
    this.list.push(i);
  }

  /** Forget the entries and ask the consumer for a full redraw. */
  overflow(): void {
    for (const i of this.list) this.marked[i] = 0;
    this.list = [];
    this.full = true;
  }

  /** The touched indexes since the last take, or null when everything must be redrawn. */
  take(): number[] | null {
    if (this.full) {
      this.full = false;
      return null;
    }
    const out = this.list;
    for (const i of out) this.marked[i] = 0;
    this.list = [];
    return out;
  }
}

/** State value used for "dirty" in both private (M) and shared (dirty) caches. */
const DIRTY = 3;

export class CacheMirror {
  readonly info: CacheInfo;
  readonly slots: number;
  lines: Float64Array;
  state: Uint8Array;
  readonly flashKind: Int8Array;
  readonly flashTime: Float64Array;
  /** Sets per aggregate row (1 when the cache is drawn exactly). */
  readonly groupSize: number;
  readonly groups: number;
  readonly aggValid: Uint32Array;
  readonly aggDirty: Uint32Array;
  readonly aggFlashKind: Int8Array;
  readonly aggFlashTime: Float64Array;
  /** Bumped on every change; renderers redraw when it moves. */
  version = 0;
  /** Time of the most recent flash; renderers keep redrawing until it has decayed. */
  lastFlash = -Infinity;
  /**
   * Exact slots and aggregate cells whose state or highlight changed. One consumer (the
   * 2D grid) drains them each frame so it can redraw only those cells.
   */
  readonly changedSlots: ChangeLog;
  readonly changedCells: ChangeLog;

  constructor(info: CacheInfo) {
    this.info = info;
    this.slots = info.sets * info.ways;
    this.lines = new Float64Array(this.slots).fill(-1);
    this.state = new Uint8Array(this.slots);
    this.flashKind = new Int8Array(this.slots).fill(Flash.None);
    this.flashTime = new Float64Array(this.slots).fill(-Infinity);
    this.groupSize = info.sets > MAX_ROWS ? Math.ceil(info.sets / MAX_ROWS) : 1;
    this.groups = Math.ceil(info.sets / this.groupSize);
    const cells = this.groups * info.ways;
    this.aggValid = new Uint32Array(cells);
    this.aggDirty = new Uint32Array(cells);
    this.aggFlashKind = new Int8Array(cells).fill(Flash.None);
    this.aggFlashTime = new Float64Array(cells).fill(-Infinity);
    this.changedSlots = new ChangeLog(this.slots);
    this.changedCells = new ChangeLog(cells);
  }

  /** Number of sets in aggregate row g (the last row may be short). */
  groupSets(g: number): number {
    return Math.min(this.groupSize, this.info.sets - g * this.groupSize);
  }

  private aggCell(set: number, way: number): number {
    return Math.floor(set / this.groupSize) * this.info.ways + way;
  }

  private put(slot: number, set: number, way: number, line: number, st: number): void {
    const old = this.state[slot]!;
    const cell = this.aggCell(set, way);
    if ((old !== 0) !== (st !== 0)) this.aggValid[cell]! += st !== 0 ? 1 : -1;
    if ((old === DIRTY) !== (st === DIRTY)) this.aggDirty[cell]! += st === DIRTY ? 1 : -1;
    this.lines[slot] = st === 0 ? -1 : line;
    this.state[slot] = st;
  }

  private flash(slot: number, set: number, way: number, f: Flash, now: number): void {
    if (this.flashTime[slot] !== now || PRIORITY[f]! >= PRIORITY[this.flashKind[slot]!]!) {
      this.flashKind[slot] = f;
      this.flashTime[slot] = now;
    }
    const cell = this.aggCell(set, way);
    if (this.aggFlashTime[cell] !== now || PRIORITY[f]! >= PRIORITY[this.aggFlashKind[cell]!]!) {
      this.aggFlashKind[cell] = f;
      this.aggFlashTime[cell] = now;
    }
    // Every apply() ends here, so this also records the state change put() made.
    this.changedSlots.add(slot);
    this.changedCells.add(cell);
    this.lastFlash = now;
  }

  /** Apply one event. `now` is the timestamp (ms) used for highlight decay. */
  apply(ev: SimEvent, now: number): void {
    const { set, way } = ev;
    if (set < 0 || set >= this.info.sets || way < 0 || way >= this.info.ways) return;
    const slot = set * this.info.ways + way;
    const holds = this.lines[slot] === ev.line && this.state[slot] !== 0;
    switch (ev.kind) {
      case EventKind.Hit:
        if (ev.state !== undefined && ev.state !== 0) this.put(slot, set, way, ev.line, ev.state);
        break;
      case EventKind.Fill:
      case EventKind.Prefetch:
        // Shared caches carry no state on fills: 1 = valid clean.
        this.put(slot, set, way, ev.line, ev.state ?? 1);
        break;
      case EventKind.Evict:
        // The engine emits Fill(new line) then Evict(old line) for the same slot; only
        // clear when the slot still holds the evicted line (otherwise it was replaced).
        if (holds) this.put(slot, set, way, -1, 0);
        break;
      case EventKind.Invalidate:
        if (holds) this.put(slot, set, way, -1, 0);
        break;
      case EventKind.StateChange:
        if (ev.state !== undefined) this.put(slot, set, way, ev.state === 0 ? -1 : ev.line, ev.state);
        break;
      case EventKind.Writeback:
        if (holds) this.put(slot, set, way, ev.line, DIRTY);
        break;
    }
    this.flash(slot, set, way, FLASH_OF[ev.kind], now);
    this.version++;
  }

  /** Replace contents wholesale (after run to end). Clears highlights. */
  applySnapshot(lines: Float64Array, state: Uint8Array): void {
    if (lines.length !== this.slots || state.length !== this.slots) return;
    this.lines = lines;
    this.state = state;
    this.aggValid.fill(0);
    this.aggDirty.fill(0);
    const ways = this.info.ways;
    for (let s = 0; s < this.slots; s++) {
      const st = state[s]!;
      if (st === 0) continue;
      const cell = Math.floor(Math.floor(s / ways) / this.groupSize) * ways + (s % ways);
      this.aggValid[cell]!++;
      if (st === DIRTY) this.aggDirty[cell]!++;
    }
    this.flashKind.fill(Flash.None);
    this.flashTime.fill(-Infinity);
    this.aggFlashKind.fill(Flash.None);
    this.aggFlashTime.fill(-Infinity);
    this.lastFlash = -Infinity;
    this.changedSlots.overflow();
    this.changedCells.overflow();
    this.version++;
  }
}
