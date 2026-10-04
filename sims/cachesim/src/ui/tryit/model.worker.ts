/// <reference lib="webworker" />
/** Web Worker entry: computes the simulator's ratios for one workload off the main thread. */
import { computeModelRatios } from '@/ui/tryit/model';

export interface ModelRequest { workloadId: string }
export type ModelReply =
  | { workloadId: string; ratios: Record<string, number> }
  | { workloadId: string; error: string };

const scope = self as unknown as DedicatedWorkerGlobalScope;
scope.onmessage = (e: MessageEvent<ModelRequest>) => {
  const { workloadId } = e.data;
  let reply: ModelReply;
  try {
    reply = { workloadId, ratios: computeModelRatios(workloadId) };
  } catch (err) {
    reply = { workloadId, error: err instanceof Error ? err.message : String(err) };
  }
  scope.postMessage(reply);
};
