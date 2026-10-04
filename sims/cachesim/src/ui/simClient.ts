/** Main-thread wrapper around the simulation worker. Tests substitute their own SimClient. */
import type { Reply, Request } from '@/worker/protocol';

export interface SimClient {
  send(msg: Request): void;
  /** Register the single reply handler. */
  onReply(handler: (msg: Reply) => void): void;
  dispose(): void;
}

/** The parts of a Worker the client uses (a fake in tests). */
export interface WorkerLike {
  onmessage: ((e: MessageEvent<Reply>) => void) | null;
  onerror: ((e: ErrorEvent) => void) | null;
  postMessage(msg: Request): void;
  terminate(): void;
}

/** Crashes in a row (no reply in between) after which the client stops replacing the worker. */
export const MAX_RESTARTS = 3;

function spawnSimWorker(): WorkerLike {
  return new Worker(new URL('../worker/sim.worker.ts', import.meta.url), { type: 'module' }) as WorkerLike;
}

/**
 * A crashed worker is replaced by a fresh one and the handler gets an error reply with
 * `restarted: true`; the controller then configures the new worker. A worker that keeps
 * crashing before it ever replies (a load failure) is not replaced after MAX_RESTARTS,
 * so the error stays on screen instead of looping.
 */
export function createWorkerClient(spawn: () => WorkerLike = spawnSimWorker): SimClient {
  let handler: (msg: Reply) => void = () => {};
  let crashes = 0;
  let disposed = false;
  const start = (): WorkerLike => {
    const w = spawn();
    w.onmessage = (e) => {
      crashes = 0;
      handler(e.data);
    };
    w.onerror = (e) => {
      e.preventDefault();
      if (w !== worker || disposed) return;
      w.terminate();
      const restarted = ++crashes <= MAX_RESTARTS;
      if (restarted) worker = start();
      handler({
        type: 'error', gen: -1, restarted,
        message: `simulation worker failed: ${e.message || 'unknown error'}`,
      });
    };
    return w;
  };
  let worker = start();
  return {
    send: (msg) => worker.postMessage(msg),
    onReply: (h) => { handler = h; },
    dispose: () => {
      disposed = true;
      worker.terminate();
    },
  };
}
