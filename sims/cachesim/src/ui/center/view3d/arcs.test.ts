import { describe, expect, it } from 'vitest';
import { arcControl, arcLift, bezier, dashIndex, type Vec3 } from '@/ui/center/view3d/arcs';

describe('arcs', () => {
  it('the arc starts and ends at the anchors and peaks at the lift', () => {
    const a: Vec3 = [0, 2, 0];
    const b: Vec3 = [100, 2, 40];
    const c = arcControl(a, b, 30);
    expect(bezier(a, c, b, 0)).toEqual(a);
    expect(bezier(a, c, b, 1)).toEqual(b);
    const mid = bezier(a, c, b, 0.5);
    expect(mid[1]).toBeCloseTo(32);
    expect(mid[0]).toBeCloseTo(50);
  });

  it('opposite directions get different heights', () => {
    expect(arcLift(100, true)).toBeGreaterThan(arcLift(100, false));
  });

  it('dashIndex keeps alternating runs of tube segments', () => {
    const radial = 2;
    const tubular = 8;
    const index = Array.from({ length: tubular * radial * 6 }, (_, i) => i);
    const out = dashIndex(index, tubular, radial, 2);
    // Segments 0, 1, 4, 5 kept: 4 segments × 12 indices.
    expect(out).toHaveLength(4 * radial * 6);
    expect(out.slice(0, 24)).toEqual(index.slice(0, 24));
    expect(out.slice(24)).toEqual(index.slice(48, 72));
    expect(out.length % 3).toBe(0);
  });
});
