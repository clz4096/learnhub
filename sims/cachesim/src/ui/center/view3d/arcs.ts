/**
 * Coherence arrow geometry helpers, kept pure for testing: the arc an arrow follows
 * between two core tiles, and the index filter that turns a solid tube into dashes.
 */

export type Vec3 = [number, number, number];

/** Arc height above the die for an arrow spanning `dist`; opposite directions differ so they do not overlap. */
export function arcLift(dist: number, reverse: boolean): number {
  return 30 + dist * 0.18 + (reverse ? 26 : 0);
}

/** Quadratic Bezier control point for an arc from a to b at height `lift`. */
export function arcControl(a: Vec3, b: Vec3, lift: number): Vec3 {
  return [(a[0] + b[0]) / 2, Math.max(a[1], b[1]) + 2 * lift, (a[2] + b[2]) / 2];
}

/** Point at t in [0, 1] on the quadratic Bezier a, c, b. */
export function bezier(a: Vec3, c: Vec3, b: Vec3, t: number): Vec3 {
  const u = 1 - t;
  return [
    u * u * a[0] + 2 * u * t * c[0] + t * t * b[0],
    u * u * a[1] + 2 * u * t * c[1] + t * t * b[1],
    u * u * a[2] + 2 * u * t * c[2] + t * t * b[2],
  ];
}

/**
 * Keep every other run of `on` tube segments. A TubeGeometry stores 6 indices per
 * (tubular segment, radial segment) pair, tubular segments outermost, so segment j
 * owns indices [j × radial × 6, (j + 1) × radial × 6).
 */
export function dashIndex(index: ArrayLike<number>, tubular: number, radial: number, on = 2): number[] {
  const per = radial * 6;
  const out: number[] = [];
  for (let j = 0; j < tubular; j++) {
    if (Math.floor(j / on) % 2 !== 0) continue;
    for (let k = j * per; k < (j + 1) * per && k < index.length; k++) out.push(index[k]!);
  }
  return out;
}
