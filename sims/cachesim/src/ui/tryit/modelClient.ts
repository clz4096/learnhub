/**
 * Asks model.worker.ts for a workload's model ratios, one short-lived worker per
 * workload. Results are cached for the page's lifetime: the engine is deterministic,
 * so a ratio never changes.
 */
import type { ModelReply } from '@/ui/tryit/model.worker';

const cache = new Map<string, Promise<Record<string, number>>>();

export function modelRatios(workloadId: string): Promise<Record<string, number>> {
  const hit = cache.get(workloadId);
  if (hit) return hit;
  const p = new Promise<Record<string, number>>((resolve, reject) => {
    if (typeof Worker === 'undefined') {
      reject(new Error('this browser cannot run the simulator in the background (no Web Workers)'));
      return;
    }
    const w = new Worker(new URL('./model.worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (e: MessageEvent<ModelReply>) => {
      w.terminate();
      if ('error' in e.data) reject(new Error(e.data.error));
      else resolve(e.data.ratios);
    };
    w.onerror = (e) => {
      w.terminate();
      reject(new Error(e.message || 'the simulator worker failed'));
    };
    w.postMessage({ workloadId });
  });
  // A failure is not cached, so a later visit can retry.
  p.catch(() => cache.delete(workloadId));
  cache.set(workloadId, p);
  return p;
}
