/**
 * Upper bounds on a cache level, so an edited config cannot exhaust memory (the worker
 * and the UI mirror each hold typed arrays per line) or make way search a long scan.
 * The largest preset level (Raptor Cove L3, 589,824 lines) fits.
 */
export const LIMITS = { maxWays: 64, maxLinesPerLevel: 1 << 20 } as const;
