/**
 * Glue between the worker and the UI state, plus the requestAnimationFrame loop.
 *
 * Playback: each frame converts elapsed time × speed into whole accesses due
 * (playback.ts), then applies up to MAX_PER_FRAME of them from a local queue of
 * worker batches. The queue is refilled ahead of time (about one second of playback),
 * so a frame never waits on the worker. Per-frame work depends on the accesses due and
 * on cache geometry (dirty caches only), never on trace length.
 */
import { batch as signalBatch, effect } from '@preact/signals';
import { EventKind, type SimEvent } from '@/engine/types';
import {
  decodeAccess, decodeEvents, type BatchMsg, type Reply, type Request,
} from '@/worker/protocol';
import { emptyHistory, historyPoint, levelNames, offerPoint } from '@/worker/history';
import { CacheMirror } from '@/ui/mirror';
import { MAX_PER_FRAME, advance, batchSize, lowWater } from '@/ui/playback';
import type { SimClient } from '@/ui/simClient';
import { runDrawers } from '@/ui/frame';
import * as S from '@/ui/state';

/** How long a coherence arrow stays visible. */
export const ARROW_MS = 1200;
/** Debounce for config and param edits before the run restarts. */
const CONFIG_DEBOUNCE_MS = 200;

interface Queued { msg: BatchMsg; next: number }

export class Controller {
  private gen = 0;
  private queue: Queued[] = [];
  private buffered = 0;
  private inFlight = 0;
  private workerDone = false;
  private carry = 0;
  private lastT: number | null = null;
  private pendingSteps = 0;
  private configured = false;
  private raf = 0;
  private arrowId = 0;
  private disposeEffect: (() => void) | null = null;
  private debounce: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly client: SimClient) {
    client.onReply((m) => this.onReply(m));
  }

  /** Start reacting to config edits and run the frame loop. */
  start(): void {
    let first = true;
    this.disposeEffect = effect(() => {
      // Subscribe to everything that defines a run.
      void S.config.value; void S.workloadId.value; void S.params.value; void S.traceText.value;
      if (first) {
        first = false;
        this.configure();
        return;
      }
      S.workerNotice.value = null;
      if (this.debounce) clearTimeout(this.debounce);
      this.debounce = setTimeout(() => this.configure(), CONFIG_DEBOUNCE_MS);
    });
    if (typeof requestAnimationFrame === 'function') {
      const loop = (t: number) => {
        // Re-arm first: an exception in one frame must not stop playback for good.
        this.raf = requestAnimationFrame(loop);
        this.tick(t);
      };
      this.raf = requestAnimationFrame(loop);
    }
  }

  dispose(): void {
    this.disposeEffect?.();
    if (this.debounce) clearTimeout(this.debounce);
    if (this.raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this.raf);
    this.client.dispose();
  }

  private send(m: Request): void {
    this.client.send(m);
  }

  private clearQueue(): void {
    this.queue = [];
    this.buffered = 0;
    this.inFlight = 0;
    this.pendingSteps = 0;
    this.carry = 0;
  }

  /* ───────────────────────── commands ───────────────────────── */

  configure(): void {
    this.gen++;
    this.clearQueue();
    this.workerDone = false;
    this.configured = false;
    signalBatch(() => {
      S.playing.value = false;
      S.done.value = false;
      S.current.value = null;
      S.stats.value = null;
      S.history.value = emptyHistory();
      S.runProgress.value = null;
      S.arrows.value = [];
      if (S.selection.value?.type !== 'term') S.selection.value = null;
    });
    if (S.configError.value) {
      // The config panel shows the validation message inline; drop the stale run.
      signalBatch(() => {
        S.workerError.value = null;
        S.caches.value = [];
        S.mirrors.value = [];
      });
      return;
    }
    const msg: Request = {
      type: 'configure', gen: this.gen, config: S.config.value,
      workloadId: S.workloadId.value, params: S.params.value,
    };
    if (S.workloadId.value === 'custom') msg.traceText = S.traceText.value;
    this.send(msg);
  }

  reset(): void {
    S.workerNotice.value = null;
    if (!this.configured) {
      this.configure();
      return;
    }
    this.gen++;
    this.clearQueue();
    this.workerDone = false;
    this.configured = false;
    signalBatch(() => {
      S.playing.value = false;
      S.runProgress.value = null;
    });
    this.send({ type: 'reset', gen: this.gen });
  }

  togglePlay(): void {
    if (S.playing.value) {
      S.playing.value = false;
      return;
    }
    if (!this.configured || S.done.value || S.runProgress.value) return;
    this.lastT = null;
    S.playing.value = true;
    this.refill();
  }

  /** Advance exactly one access. */
  step(): void {
    if (!this.configured || S.runProgress.value) return;
    S.playing.value = false;
    if (this.buffered > 0) {
      this.applyNext(nowMs(), true);
      this.updateDone();
      this.refill();
      return;
    }
    if (this.workerDone) return;
    this.pendingSteps++;
    if (this.inFlight === 0) this.request(1);
  }

  runToEnd(): void {
    if (!this.configured || S.runProgress.value || S.done.value) return;
    this.gen++;
    this.clearQueue();
    signalBatch(() => {
      S.playing.value = false;
      S.runProgress.value = { done: S.current.value ? S.current.value.index + 1 : 0, target: S.estimate.value };
    });
    this.send({ type: 'runTo', gen: this.gen, index: 'end' });
  }

  /* ───────────────────────── worker replies ───────────────────────── */

  onReply(m: Reply): void {
    if (m.gen !== this.gen && m.gen !== -1) return; // stale: a newer configure/reset/runTo superseded it
    switch (m.type) {
      case 'configured': {
        this.configured = true;
        signalBatch(() => {
          S.caches.value = m.caches;
          S.mirrors.value = m.caches.map((c) => new CacheMirror(c));
          S.source.value = m.source;
          S.workerError.value = null;
          S.current.value = null;
          S.stats.value = null;
          S.history.value = emptyHistory();
          S.done.value = false;
          S.arrows.value = [];
        });
        this.refill();
        return;
      }
      case 'batch': {
        if (m.fast) {
          this.workerDone = m.done;
          const last = m.count - 1;
          signalBatch(() => {
            S.current.value = last >= 0 ? { ...decodeAccess(m, last), events: decodeEvents(m, last) } : S.current.value;
            S.stats.value = m.stats;
            if (m.history) S.history.value = m.history;
            S.runProgress.value = null;
            S.arrows.value = [];
          });
          this.updateDone();
          return;
        }
        this.inFlight = Math.max(0, this.inFlight - m.count);
        if (m.done) this.workerDone = true;
        if (m.count === 0) {
          this.inFlight = 0; // the worker had nothing left; do not wait for the rest
          S.stats.value = m.stats;
        } else {
          this.queue.push({ msg: m, next: 0 });
          this.buffered += m.count;
        }
        const now = nowMs();
        while (this.pendingSteps > 0 && this.buffered > 0) {
          this.pendingSteps--;
          this.applyNext(now, true);
        }
        if (this.workerDone && this.buffered === 0) this.pendingSteps = 0;
        this.updateDone();
        this.refill();
        return;
      }
      case 'snapshot': {
        const ms = S.mirrors.value;
        m.caches.forEach((c, i) => ms[i]?.applySnapshot(c.lines, c.state));
        return;
      }
      case 'progress':
        S.runProgress.value = { done: m.done, target: m.target > 0 ? m.target : S.estimate.value };
        return;
      case 'error':
        if (m.restarted) {
          // The worker crashed and a fresh one replaced it: start this run over there.
          S.workerNotice.value = `${m.message}. A new simulator was started and the run was reset.`;
          this.configure();
          return;
        }
        this.clearQueue();
        signalBatch(() => {
          S.workerError.value = m.message;
          S.playing.value = false;
          S.runProgress.value = null;
        });
        return;
    }
  }

  /* ───────────────────────── playback ───────────────────────── */

  private request(n: number): void {
    this.inFlight += n;
    this.send({ type: 'step', gen: this.gen, n });
  }

  /** Keep about a second of playback buffered while playing, one access while paused. */
  private refill(): void {
    if (!this.configured || this.workerDone || S.runProgress.value) return;
    const sp = S.speed.value;
    const want = S.playing.value ? lowWater(sp) : 1;
    if (this.buffered + this.inFlight < want) this.request(S.playing.value ? batchSize(sp) : 1);
  }

  private updateDone(): void {
    const d = this.workerDone && this.buffered === 0;
    if (d !== S.done.value) S.done.value = d;
    if (d && S.playing.value) S.playing.value = false;
  }

  /** Apply the next buffered access. `publish` sets it as the current access. */
  private applyNext(now: number, publish: boolean): void {
    const q = this.queue[0];
    if (!q) return;
    const m = q.msg;
    const i = q.next++;
    this.buffered--;
    const events = decodeEvents(m, i);
    const ms = S.mirrors.value;
    for (const ev of events) ms[ev.cache]?.apply(ev, now);
    const rec = decodeAccess(m, i);
    this.addArrows(rec.core, events, now);
    const lastOfBatch = q.next >= m.count;
    if (lastOfBatch) this.queue.shift();
    signalBatch(() => {
      if (publish) S.current.value = { ...rec, events };
      if (lastOfBatch) {
        // Stats arrive once per batch, so counters trail the animation by under a batch.
        S.stats.value = m.stats;
        const h = S.history.value;
        if (offerPoint(h, historyPoint(m.stats, levelNames(S.config.value)))) {
          S.history.value = { points: h.points, stride: h.stride };
        }
      }
    });
  }

  private addArrows(core: number, events: readonly SimEvent[], now: number): void {
    const infos = S.caches.value;
    const add: S.Arrow[] = [];
    const seen = new Set<string>();
    for (const ev of events) {
      const owner = infos[ev.cache]?.core ?? -1;
      if (owner < 0 || owner === core) continue;
      let a: S.Arrow | null = null;
      if (ev.kind === EventKind.Invalidate) a = { id: 0, from: core, to: owner, kind: 'invalidate', t: now };
      else if (ev.kind === EventKind.StateChange) a = { id: 0, from: owner, to: core, kind: 'transfer', t: now };
      if (!a) continue;
      const key = `${a.from}>${a.to}:${a.kind}`;
      if (seen.has(key)) continue;
      seen.add(key);
      a.id = ++this.arrowId;
      add.push(a);
    }
    // Reduced motion: no fading, so show only the current access's traffic.
    if (S.reducedMotion.value) {
      if (add.length || S.arrows.value.length) S.arrows.value = add;
    } else if (add.length) {
      // One arrow per (from, to, kind): a repeat restarts its fade instead of stacking.
      const keys = new Set(add.map((a) => `${a.from}>${a.to}:${a.kind}`));
      S.arrows.value = [...S.arrows.value.filter((a) => !keys.has(`${a.from}>${a.to}:${a.kind}`)), ...add];
    }
  }

  /** One animation frame. */
  tick(now: number): void {
    if (S.playing.value) {
      const dt = this.lastT === null ? 0 : now - this.lastT;
      this.lastT = now;
      const adv = advance(this.carry, dt, S.speed.value);
      const n = Math.min(adv.due, MAX_PER_FRAME, this.buffered);
      // When starved, do not bank more than one access of credit.
      this.carry = n < adv.due ? Math.min(adv.carry + (adv.due - n), 1) : adv.carry;
      for (let k = 0; k < n; k++) this.applyNext(now, k === n - 1);
      this.updateDone();
      this.refill();
    } else {
      this.lastT = null;
    }
    const arr = S.arrows.value;
    if (arr.length && now - arr[0]!.t > ARROW_MS && !S.reducedMotion.value) {
      S.arrows.value = arr.filter((a) => now - a.t <= ARROW_MS);
    }
    runDrawers(now);
  }
}

export function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

/* The app has one controller; components reach it through these. */
let active: Controller | null = null;
export function setController(c: Controller | null): void {
  active = c;
}
export function controller(): Controller | null {
  return active;
}
