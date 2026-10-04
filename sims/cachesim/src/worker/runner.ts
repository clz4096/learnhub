/**
 * The worker's logic, independent of the Worker global so tests can drive it directly.
 * Owns the Simulator and the lazy trace iterator; never materializes the trace.
 */
import { Simulator, type AccessOutcome } from '@/engine';
import { customWorkloadFromParsed, parseTraceText, workloadById } from '@/workloads';
import type { Access } from '@/engine/types';
import type { Params, Workload } from '@/workloads/types';
import {
  batchTransferables, encodeOutcomes, type BatchMsg, type ConfigureMsg, type Reply, type Request,
} from '@/worker/protocol';
import { emptyHistory, historyPoint, levelNames, offerPoint, wantsPoint, type HistoryState, type LevelNames } from '@/worker/history';

export type Post = (msg: Reply, transfer?: Transferable[]) => void;

/** Accesses simulated between yields during runTo (keeps the worker responsive to reset). */
const RUN_CHUNK = 50_000;
/** Upper bound on one step request, so a bad request cannot stall the worker. */
const MAX_STEP = 10_000;

export class SimRunner {
  private sim: Simulator | null = null;
  private iter: Iterator<Access> | null = null;
  private done = false;
  private ahead: IteratorResult<Access> | null = null;
  private cfg: ConfigureMsg | null = null;
  /** The configured workload, built once per configure (reset reuses it; a custom trace is parsed once). */
  private wl: { w: Workload; traceErrors: string[] } | null = null;
  /** The most recent access simulated, so runTo can report it even when nothing was left to run. */
  private last: AccessOutcome | null = null;
  private names: LevelNames = { l1: 'L1d', l2: 'L2' };
  private history: HistoryState = emptyHistory();
  /** Latest gen seen; a running runTo stops when this moves past its own gen. */
  private latestGen = 0;
  private chain: Promise<void> = Promise.resolve();

  constructor(private readonly post: Post, private readonly yieldFn: () => Promise<void> = defaultYield) {}

  /** Entry point for every request. Requests run in order; configure/reset cancel a running runTo. */
  receive(msg: Request): Promise<void> {
    if (msg.gen > this.latestGen) this.latestGen = msg.gen;
    this.chain = this.chain.then(() => this.handle(msg)).catch((e: unknown) => {
      this.post({ type: 'error', gen: msg.gen, message: e instanceof Error ? e.message : String(e) });
    });
    return this.chain;
  }

  private async handle(msg: Request): Promise<void> {
    switch (msg.type) {
      case 'configure':
        // Drop the previous run first, so a bad workload leaves nothing stale to step.
        this.sim = null;
        this.iter = null;
        this.cfg = null;
        this.wl = this.workload(msg);
        this.cfg = msg;
        this.start(msg.gen);
        return;
      case 'reset':
        if (!this.cfg) throw new Error('reset before configure');
        this.start(msg.gen);
        return;
      case 'step':
        this.step(msg.gen, msg.n);
        return;
      case 'runTo':
        await this.runTo(msg.gen, msg.index);
        return;
    }
  }

  private workload(cfg: ConfigureMsg): { w: Workload; traceErrors: string[] } {
    if (cfg.workloadId === 'custom' && cfg.traceText !== undefined) {
      const parsed = parseTraceText(cfg.traceText);
      return { w: customWorkloadFromParsed(parsed), traceErrors: parsed.errors };
    }
    const w = workloadById(cfg.workloadId);
    if (!w) throw new Error(`unknown workload "${cfg.workloadId}"`);
    return { w, traceErrors: [] };
  }

  private start(gen: number): void {
    const cfg = this.cfg!;
    this.sim = null;
    this.iter = null;
    this.last = null;
    const { w, traceErrors } = this.wl!;
    // Throws a readable message on an impossible config; receive() turns it into an error reply.
    const sim = new Simulator(cfg.config);
    const params: Params = cfg.params;
    const ctx = { lineBytes: cfg.config.l1d.lineBytes, cores: cfg.config.cores, seed: cfg.config.seed };
    this.sim = sim;
    this.iter = w.trace(params, ctx)[Symbol.iterator]();
    this.done = false;
    this.ahead = null;
    this.history = emptyHistory();
    this.names = levelNames(cfg.config);
    this.post({
      type: 'configured', gen, caches: sim.infos.map((c) => ({ ...c })),
      estimate: w.estimateLength(params, ctx), source: w.source(params), traceErrors,
    });
  }

  private next(): AccessOutcome | null {
    if (this.done || !this.sim || !this.iter) return null;
    const r = this.ahead ?? this.iter.next();
    this.ahead = null;
    if (r.done) {
      this.done = true;
      return null;
    }
    const o = this.sim.access(r.value);
    this.last = o;
    if (wantsPoint(this.history, o.index + 1)) offerPoint(this.history, historyPoint(this.sim.stats(), this.names));
    return o;
  }

  private step(gen: number, n: number): void {
    if (!this.sim) throw new Error('step before configure');
    const outs: AccessOutcome[] = [];
    const want = Math.max(0, Math.min(MAX_STEP, Math.floor(n)));
    for (let k = 0; k < want; k++) {
      const o = this.next();
      if (!o) break;
      outs.push(o);
    }
    // Peek so `done` is reported with the last real batch, not one empty batch later.
    this.peekDone();
    this.postBatch(gen, outs, false);
  }

  private async runTo(gen: number, index: number | 'end'): Promise<void> {
    if (!this.sim) throw new Error('runTo before configure');
    const sim = this.sim;
    const target = index === 'end' ? Infinity : index;
    let sinceYield = 0;
    while (sim.accessCount < target) {
      const o = this.next();
      if (!o) break;
      if (++sinceYield >= RUN_CHUNK) {
        sinceYield = 0;
        this.post({ type: 'progress', gen, done: sim.accessCount, target: Number.isFinite(target) ? target : -1 });
        await this.yieldFn();
        if (this.latestGen !== gen || this.sim !== sim) return; // cancelled by a newer request
      }
    }
    this.peekDone();
    // Report the latest access even when playback had already pulled every access out of
    // the worker, so the UI's current access is not left at the last one it animated.
    this.postBatch(gen, this.last ? [this.last] : [], true);
    const caches = sim.caches.map((c) => ({ lines: c.lines.slice(), state: c.state.slice() }));
    this.post({ type: 'snapshot', gen, caches }, caches.flatMap((c) => [c.lines.buffer, c.state.buffer]));
  }

  /** Pull one access ahead to learn whether the trace is over; next() consumes it first. */
  private peekDone(): void {
    if (this.done || !this.iter || this.ahead) return;
    this.ahead = this.iter.next();
    if (this.ahead.done) this.done = true;
  }

  private postBatch(gen: number, outs: AccessOutcome[], fast: boolean): void {
    const enc = encodeOutcomes(outs);
    const msg: BatchMsg = { type: 'batch', gen, ...enc, stats: this.sim!.stats(), done: this.done, fast };
    if (fast) msg.history = { points: this.history.points.slice(), stride: this.history.stride };
    this.post(msg, batchTransferables(enc));
  }
}

function defaultYield(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}
