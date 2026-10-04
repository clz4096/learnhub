import { describe, expect, it } from 'vitest';
import { EventKind, Mesi, type CacheInfo, type SimEvent } from '@/engine/types';
import { CacheMirror, ChangeLog, Flash, MAX_ROWS } from '@/ui/mirror';

const info = (sets: number, ways: number, core = 0): CacheInfo => ({
  id: 0, level: 'L1d', core, sets, ways, lineBytes: 64, sizeBytes: sets * ways * 64, latency: 4, policy: 'lru',
});
const ev = (kind: EventKind, set: number, way: number, line: number, extra: Partial<SimEvent> = {}): SimEvent =>
  ({ cache: 0, set, way, kind, line, ...extra });

describe('CacheMirror', () => {
  it('Fill sets line and state, and flashes as a miss', () => {
    const m = new CacheMirror(info(4, 2));
    m.apply(ev(EventKind.Fill, 1, 1, 5, { state: Mesi.E, miss: 'compulsory' }), 100);
    const slot = 1 * 2 + 1;
    expect(m.lines[slot]).toBe(5);
    expect(m.state[slot]).toBe(Mesi.E);
    expect(m.flashKind[slot]).toBe(Flash.Miss);
    expect(m.flashTime[slot]).toBe(100);
    expect(m.aggValid[slot]).toBe(1);
  });

  it('Prefetch sets line and state (shared caches default to clean = 1)', () => {
    const m = new CacheMirror(info(4, 2, -1));
    m.apply(ev(EventKind.Prefetch, 0, 0, 8), 1);
    expect(m.lines[0]).toBe(8);
    expect(m.state[0]).toBe(1);
    expect(m.flashKind[0]).toBe(Flash.Prefetch);
  });

  it('Evict after a Fill of the same slot keeps the new line (replace)', () => {
    const m = new CacheMirror(info(1, 1));
    m.apply(ev(EventKind.Fill, 0, 0, 1, { state: Mesi.E }), 1);
    m.apply(ev(EventKind.Fill, 0, 0, 2, { state: Mesi.E }), 2);
    m.apply(ev(EventKind.Evict, 0, 0, 1, { state: Mesi.I }), 2);
    expect(m.lines[0]).toBe(2);
    expect(m.state[0]).toBe(Mesi.E);
    // Same timestamp: the eviction outranks the miss, so replacements flash orange.
    expect(m.flashKind[0]).toBe(Flash.Evict);
    expect(m.aggFlashKind[0]).toBe(Flash.Evict);
    expect(m.aggValid[0]).toBe(1);
  });

  it('Evict of the held line clears the slot', () => {
    const m = new CacheMirror(info(1, 2));
    m.apply(ev(EventKind.Fill, 0, 1, 7, { state: Mesi.M }), 1);
    expect(m.aggDirty[1]).toBe(1);
    m.apply(ev(EventKind.Evict, 0, 1, 7, { state: Mesi.I }), 2);
    expect(m.lines[1]).toBe(-1);
    expect(m.state[1]).toBe(0);
    expect(m.flashKind[1]).toBe(Flash.Evict);
    expect(m.aggValid[1]).toBe(0);
    expect(m.aggDirty[1]).toBe(0);
  });

  it('Invalidate clears the slot', () => {
    const m = new CacheMirror(info(2, 1));
    m.apply(ev(EventKind.Fill, 1, 0, 3, { state: Mesi.S }), 1);
    m.apply(ev(EventKind.Invalidate, 1, 0, 3, { state: Mesi.I }), 2);
    expect(m.state[1]).toBe(0);
    expect(m.lines[1]).toBe(-1);
    expect(m.flashKind[1]).toBe(Flash.Invalidate);
  });

  it('StateChange sets the state and keeps the line', () => {
    const m = new CacheMirror(info(1, 1));
    m.apply(ev(EventKind.Fill, 0, 0, 9, { state: Mesi.S }), 1);
    m.apply(ev(EventKind.StateChange, 0, 0, 9, { state: Mesi.M }), 2);
    expect(m.lines[0]).toBe(9);
    expect(m.state[0]).toBe(Mesi.M);
    expect(m.aggDirty[0]).toBe(1);
    expect(m.flashKind[0]).toBe(Flash.State);
  });

  it('Hit keeps contents and flashes as a hit; Writeback marks a shared line dirty', () => {
    const m = new CacheMirror(info(1, 1, -1));
    m.apply(ev(EventKind.Fill, 0, 0, 4), 1);
    const v = m.version;
    m.apply(ev(EventKind.Hit, 0, 0, 4), 2);
    expect(m.state[0]).toBe(1);
    expect(m.flashKind[0]).toBe(Flash.Hit);
    expect(m.version).toBeGreaterThan(v);
    m.apply(ev(EventKind.Writeback, 0, 0, 4), 3);
    expect(m.state[0]).toBe(3);
  });

  it('ignores out-of-range events', () => {
    const m = new CacheMirror(info(2, 2));
    m.apply(ev(EventKind.Fill, 5, 0, 1), 1);
    m.apply(ev(EventKind.Fill, 0, 9, 1), 1);
    expect([...m.state]).toEqual([0, 0, 0, 0]);
  });

  it('aggregates large caches into at most MAX_ROWS rows', () => {
    const sets = 12288; // Coffee Lake L3
    const m = new CacheMirror(info(sets, 12, -1));
    expect(m.groupSize).toBe(Math.ceil(sets / MAX_ROWS));
    expect(m.groups).toBeLessThanOrEqual(MAX_ROWS);
    m.apply(ev(EventKind.Fill, 100, 3, 100), 1);
    m.apply(ev(EventKind.Fill, 101, 3, 101), 1);
    const cell = Math.floor(100 / m.groupSize) * 12 + 3;
    expect(m.aggValid[cell]).toBe(2);
    expect(m.aggFlashKind[cell]).toBe(Flash.Miss);
  });

  it('applySnapshot replaces contents and rebuilds aggregates', () => {
    const m = new CacheMirror(info(2, 2));
    m.apply(ev(EventKind.Fill, 0, 0, 1, { state: Mesi.E }), 1);
    const lines = new Float64Array([-1, 2, 3, -1]);
    const state = new Uint8Array([0, 3, 1, 0]);
    m.applySnapshot(lines, state);
    expect(m.lines[1]).toBe(2);
    expect([...m.aggValid]).toEqual([0, 1, 1, 0]);
    expect([...m.aggDirty]).toEqual([0, 1, 0, 0]);
    expect(m.flashKind[0]).toBe(Flash.None);
  });

  it('a later miss on the slot replaces an earlier eviction highlight', () => {
    const m = new CacheMirror(info(1, 1));
    m.apply(ev(EventKind.Fill, 0, 0, 1, { state: Mesi.E }), 1);
    m.apply(ev(EventKind.Fill, 0, 0, 2, { state: Mesi.E }), 2);
    m.apply(ev(EventKind.Evict, 0, 0, 1, { state: Mesi.I }), 2);
    m.apply(ev(EventKind.Fill, 0, 0, 3, { state: Mesi.E }), 3);
    expect(m.flashKind[0]).toBe(Flash.Miss);
  });

  it('records changed slots and aggregate cells once each, then drains', () => {
    const m = new CacheMirror(info(1024, 2, -1));
    const g = m.groupSize;
    m.apply(ev(EventKind.Fill, 0, 1, 10), 1);
    m.apply(ev(EventKind.Hit, 0, 1, 10), 2);
    m.apply(ev(EventKind.Fill, 1, 1, 11), 2); // same aggregate cell as set 0
    m.apply(ev(EventKind.Fill, g, 0, 12), 2);
    expect(m.changedSlots.take()).toEqual([1, 3, g * 2]);
    expect(m.changedCells.take()).toEqual([1, 2]);
    expect(m.changedSlots.take()).toEqual([]);
    m.apply(ev(EventKind.Fill, 0, 1, 10), 3);
    expect(m.changedSlots.take()).toEqual([1]);
  });

  it('applySnapshot asks for a full redraw', () => {
    const m = new CacheMirror(info(2, 2));
    m.apply(ev(EventKind.Fill, 0, 0, 1, { state: Mesi.E }), 1);
    m.applySnapshot(new Float64Array(4).fill(-1), new Uint8Array(4));
    expect(m.changedSlots.take()).toBeNull();
    expect(m.changedCells.take()).toBeNull();
    expect(m.changedSlots.take()).toEqual([]);
  });
});

describe('ChangeLog', () => {
  it('overflows past its cap and recovers after a take', () => {
    const log = new ChangeLog(100, 3);
    log.add(5); log.add(5); log.add(6); log.add(7);
    expect(log.take()).toEqual([5, 6, 7]);
    for (const i of [1, 2, 3, 4]) log.add(i);
    expect(log.take()).toBeNull();
    log.add(1);
    expect(log.take()).toEqual([1]);
  });
});
