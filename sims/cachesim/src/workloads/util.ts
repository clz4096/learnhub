import type { Params } from './types';

/** Integer param with fallback and clamping. */
export function intParam(p: Params, key: string, def: number, min: number, max: number): number {
  const v = p[key];
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.trunc(v) : def;
  return Math.min(max, Math.max(min, n));
}

/** Choice param restricted to `allowed`; falls back to `def`. */
export function choiceParam<T extends string>(p: Params, key: string, def: T, allowed: readonly T[]): T {
  const v = p[key];
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : def;
}

/**
 * 1-based line of the unique line in `code` containing `marker`. Line numbers are
 * derived from the code itself so editing a snippet can never desync the trace.
 */
export function lineOf(code: string, marker: string): number {
  const lines = code.split('\n');
  let found = 0;
  for (let i = 0; i < lines.length; ++i) {
    if (lines[i]!.includes(marker)) {
      if (found !== 0) throw new Error(`marker not unique: ${marker}`);
      found = i + 1;
    }
  }
  if (found === 0) throw new Error(`marker not found: ${marker}`);
  return found;
}

/** Joins snippet lines; keeps the layout explicit and stable. */
export function code(lines: string[]): string {
  return lines.join('\n');
}

/** Maps a thread index onto the simulated cores (identity when threads <= cores). */
export function coreOf(thread: number, cores: number): number {
  return thread % Math.max(1, cores);
}
