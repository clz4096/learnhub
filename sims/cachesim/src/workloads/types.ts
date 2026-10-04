/**
 * Workload contract: a small C++ snippet plus a generator that emits the exact
 * address trace that snippet would produce. The generator is pure and deterministic
 * (same params + context = same trace), lazy (an iterator, so 1M-access traces never
 * sit in memory as objects), and tags each access with the 1-based C++ source line
 * that issued it, so the UI can highlight the executing line.
 */
import type { Access } from '@/engine/types';

export type ParamValue = number | string | boolean;
export type Params = Record<string, ParamValue>;

export interface ParamSpec {
  key: string;
  label: string;
  kind: 'int' | 'choice' | 'bool';
  default: ParamValue;
  /** int: inclusive bounds and slider step. */
  min?: number;
  max?: number;
  step?: number;
  /** int: show these values only (for example strides 1, 2, 4 ... 64). */
  values?: number[];
  /** choice: allowed values. */
  options?: Array<{ value: string; label: string }>;
  help?: string;
}

/** What a generator may depend on besides its own params. */
export interface TraceContext {
  /** Line size of the simulated hierarchy (used only by layouts that pad to a line). */
  lineBytes: number;
  cores: number;
  seed: number;
}

export interface WorkloadSource {
  /** The C++ code shown in the UI, exactly as the trace models it. */
  code: string;
  /** Short note on what the snippet assumes (element size, layout, alignment). */
  notes?: string;
}

export interface Workload {
  /** Stable id, also used for bench/ targets, e.g. "seq-sum". */
  id: string;
  /** Workload number from the spec (1 to 10). */
  number: number;
  title: string;
  /** One or two plain-English sentences: what it does and what to watch for. */
  summary: string;
  params: ParamSpec[];
  /** The C++ for the current params (variants such as row vs column change the code). */
  source(params: Params): WorkloadSource;
  /** Lazily emit the trace. Must be deterministic for the same params and context. */
  trace(params: Params, ctx: TraceContext): Iterable<Access>;
  /** Approximate number of accesses, for progress bars and limits. */
  estimateLength(params: Params, ctx: TraceContext): number;
  /** Name of the matching benchmark executable in bench/ (workloads 1 to 8), if any. */
  bench?: string;
}

/** Default params for a workload. */
export function defaultParams(w: Workload): Params {
  return Object.fromEntries(w.params.map((p) => [p.key, p.default]));
}
