/**
 * Typed messages between the main thread and the simulation worker, plus the flat
 * encoding of per-access records and SimEvents. Batches travel as typed arrays so
 * they can be transferred (not copied) and so decode cost is a few array reads.
 *
 * Every request carries `gen`; the worker echoes it on every reply. The main thread
 * bumps gen on configure, reset, and runTo, and drops replies from older gens, so a
 * reply that was already in flight can never touch the state of a newer run.
 */
import type {
  AccessKind, CacheInfo, EventKind, HierarchyConfig, Mesi, MissKind, SimEvent, Source, Stats,
} from '@/engine/types';
import type { Params, WorkloadSource } from '@/workloads/types';
import type { HistoryState } from '@/worker/history';

/* ───────────────────────── requests (main → worker) ───────────────────────── */

export interface ConfigureMsg {
  type: 'configure';
  gen: number;
  config: HierarchyConfig;
  workloadId: string;
  params: Params;
  /** Workload 'custom' only: the trace text to replay. */
  traceText?: string;
}
export interface StepMsg { type: 'step'; gen: number; n: number }
export interface RunToMsg { type: 'runTo'; gen: number; index: number | 'end' }
export interface ResetMsg { type: 'reset'; gen: number }
export type Request = ConfigureMsg | StepMsg | RunToMsg | ResetMsg;

/* ───────────────────────── replies (worker → main) ───────────────────────── */

export interface ConfiguredMsg {
  type: 'configured';
  gen: number;
  caches: CacheInfo[];
  estimate: number;
  source: WorkloadSource;
  /** Line-numbered parse errors for a custom trace (empty otherwise). */
  traceErrors: string[];
}

export interface BatchMsg extends EncodedBatch {
  type: 'batch';
  gen: number;
  stats: Stats;
  /** True when the trace iterator is exhausted. */
  done: boolean;
  /**
   * True for the reply to runTo: only the last access is included, its events are
   * NOT to be applied to the mirror (the following snapshot replaces it), and
   * `history` carries the worker's samples for the whole run.
   */
  fast: boolean;
  history?: HistoryState;
}

export interface SnapshotMsg {
  type: 'snapshot';
  gen: number;
  /** Indexed like CacheInfo.id. */
  caches: Array<{ lines: Float64Array; state: Uint8Array }>;
}

export interface ProgressMsg { type: 'progress'; gen: number; done: number; target: number }
export interface ErrorMsg {
  type: 'error';
  gen: number;
  message: string;
  /** Set by the client (gen -1) when the worker crashed and a new one replaced it. */
  restarted?: boolean;
}
export type Reply = ConfiguredMsg | BatchMsg | SnapshotMsg | ProgressMsg | ErrorMsg;

/* ───────────────────────── flat encoding ───────────────────────── */

/** Int32 fields per access: core, kind, src, servedBy, cycles, first event, event count. */
export const ACC_INTS = 7;
/** Float64 fields per access: index, addr (addresses go up to 2^53). */
export const ACC_NUMS = 2;
/** Int32 fields per event: cache, set, way, kind, miss (-1 = none), state (-1 = none). */
export const EV_INTS = 6;

export const KINDS: readonly AccessKind[] = ['R', 'W', 'I'];
export const SOURCES: readonly Source[] = ['L1', 'L2', 'L3', 'DRAM', 'peer'];
export const MISS_KINDS: readonly MissKind[] = ['compulsory', 'capacity', 'conflict', 'coherence'];

export interface EncodedBatch {
  count: number;
  accNum: Float64Array;
  accInt: Int32Array;
  evInt: Int32Array;
  /** Line number per event (Float64: line numbers can exceed 2^31). */
  evLine: Float64Array;
}

/** One demand access as the UI sees it. */
export interface AccessRecord {
  index: number;
  addr: number;
  core: number;
  kind: AccessKind;
  src: number;
  servedBy: Source;
  cycles: number;
}

/** Minimal outcome shape the encoder needs (structurally an engine AccessOutcome). */
export interface OutcomeLike {
  index: number;
  access: { addr: number; kind: AccessKind; core: number; src?: number };
  servedBy: Source;
  cycles: number;
  events: readonly SimEvent[];
}

export function encodeOutcomes(outs: readonly OutcomeLike[]): EncodedBatch {
  let nev = 0;
  for (const o of outs) nev += o.events.length;
  const accNum = new Float64Array(outs.length * ACC_NUMS);
  const accInt = new Int32Array(outs.length * ACC_INTS);
  const evInt = new Int32Array(nev * EV_INTS);
  const evLine = new Float64Array(nev);
  let e = 0;
  outs.forEach((o, i) => {
    accNum[i * ACC_NUMS] = o.index;
    accNum[i * ACC_NUMS + 1] = o.access.addr;
    const b = i * ACC_INTS;
    accInt[b] = o.access.core;
    accInt[b + 1] = KINDS.indexOf(o.access.kind);
    accInt[b + 2] = o.access.src ?? 0;
    accInt[b + 3] = SOURCES.indexOf(o.servedBy);
    accInt[b + 4] = o.cycles;
    accInt[b + 5] = e;
    accInt[b + 6] = o.events.length;
    for (const ev of o.events) {
      const q = e * EV_INTS;
      evInt[q] = ev.cache;
      evInt[q + 1] = ev.set;
      evInt[q + 2] = ev.way;
      evInt[q + 3] = ev.kind;
      evInt[q + 4] = ev.miss === undefined ? -1 : MISS_KINDS.indexOf(ev.miss);
      evInt[q + 5] = ev.state === undefined ? -1 : ev.state;
      evLine[e] = ev.line;
      e++;
    }
  });
  return { count: outs.length, accNum, accInt, evInt, evLine };
}

export function decodeAccess(b: EncodedBatch, i: number): AccessRecord {
  const q = i * ACC_INTS;
  return {
    index: b.accNum[i * ACC_NUMS]!,
    addr: b.accNum[i * ACC_NUMS + 1]!,
    core: b.accInt[q]!,
    kind: KINDS[b.accInt[q + 1]!]!,
    src: b.accInt[q + 2]!,
    servedBy: SOURCES[b.accInt[q + 3]!]!,
    cycles: b.accInt[q + 4]!,
  };
}

export function decodeEvent(b: EncodedBatch, e: number): SimEvent {
  const q = e * EV_INTS;
  const ev: SimEvent = {
    cache: b.evInt[q]!,
    set: b.evInt[q + 1]!,
    way: b.evInt[q + 2]!,
    kind: b.evInt[q + 3]! as EventKind,
    line: b.evLine[e]!,
  };
  const miss = b.evInt[q + 4]!;
  const state = b.evInt[q + 5]!;
  if (miss >= 0) ev.miss = MISS_KINDS[miss]!;
  if (state >= 0) ev.state = state as Mesi;
  return ev;
}

/** Events of access i in batch b. */
export function decodeEvents(b: EncodedBatch, i: number): SimEvent[] {
  const first = b.accInt[i * ACC_INTS + 5]!;
  const n = b.accInt[i * ACC_INTS + 6]!;
  const out: SimEvent[] = [];
  for (let e = first; e < first + n; e++) out.push(decodeEvent(b, e));
  return out;
}

/** Buffers to pass in postMessage's transfer list. */
export function batchTransferables(b: EncodedBatch): ArrayBuffer[] {
  return [b.accNum.buffer, b.accInt.buffer, b.evInt.buffer, b.evLine.buffer] as ArrayBuffer[];
}
