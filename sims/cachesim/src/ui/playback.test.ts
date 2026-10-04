import { describe, expect, it } from 'vitest';
import { ACCESSES_PER_SECOND, MAX_DT_MS, advance, batchSize, lowWater } from '@/ui/playback';
import { computeLayout, hitTest, cellOrigin } from '@/ui/center/gridLayout';

describe('advance', () => {
  it('1× for one second plays ACCESSES_PER_SECOND accesses', () => {
    let carry = 0;
    let total = 0;
    for (let f = 0; f < 100; f++) {
      const a = advance(carry, 10, 1);
      carry = a.carry;
      total += a.due;
    }
    expect(total).toBe(ACCESSES_PER_SECOND);
  });

  it('scales with speed and accumulates fractions', () => {
    const a = advance(0, 100, 0.5); // 0.5 × 20/s × 0.1 s = 1
    expect(a.due).toBe(1);
    expect(advance(0, 16, 1).due).toBe(0); // 0.32 of an access
    expect(advance(0.9, 16, 1)).toEqual({ due: 1, carry: expect.closeTo(0.22, 5) });
    expect(advance(0, 100, 8).due).toBe(16);
  });

  it('never goes negative and ignores bad input', () => {
    for (const [c, dt, s] of [[0, -50, 1], [-3, 10, 1], [0, 10, -2], [0, NaN, 1], [NaN, 10, 1], [0, 10, Infinity]] as const) {
      const a = advance(c, dt, s);
      expect(a.due).toBeGreaterThanOrEqual(0);
      expect(a.carry).toBeGreaterThanOrEqual(0);
      expect(a.carry).toBeLessThan(1);
    }
  });

  it('caps a long frame gap', () => {
    expect(advance(0, 10_000, 8).due).toBe(Math.floor((MAX_DT_MS * ACCESSES_PER_SECOND * 8) / 1000));
  });

  it('batch and buffer sizes are at least 1 and grow with speed', () => {
    expect(batchSize(0.5)).toBe(1);
    expect(batchSize(8)).toBe(16);
    expect(lowWater(0.5)).toBeGreaterThanOrEqual(4);
    expect(lowWater(8)).toBeGreaterThan(lowWater(1));
  });
});

describe('grid layout', () => {
  it('fits large row counts by wrapping into blocks, and hit-tests back', () => {
    const l = computeLayout(256, 12, 600, 0, 260);
    expect(l.height).toBeLessThanOrEqual(260);
    expect(l.width).toBeLessThanOrEqual(600);
    for (const [row, way] of [[0, 0], [255, 11], [100, 5]] as const) {
      const o = cellOrigin(l, row, way);
      expect(hitTest(l, o.x + 1, o.y + 1)).toEqual({ row, way });
    }
  });

  it('labels small caches with a gutter that hit-tests as way -1', () => {
    const l = computeLayout(8, 2, 300, 1);
    expect(l.gutter).toBeGreaterThan(0);
    expect(hitTest(l, 1, 1)).toEqual({ row: 0, way: -1 });
  });
});
