/// <reference lib="webworker" />
/** Web Worker entry: runs the engine off the main thread. All logic lives in SimRunner. */
import type { Request } from '@/worker/protocol';
import { SimRunner } from '@/worker/runner';

const scope = self as unknown as DedicatedWorkerGlobalScope;
const runner = new SimRunner((msg, transfer) => scope.postMessage(msg, transfer ?? []));
scope.onmessage = (e: MessageEvent<Request>) => {
  void runner.receive(e.data);
};
