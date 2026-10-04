/** Test helper: a SimClient that runs SimRunner in-process instead of in a Worker. */
import { SimRunner } from '@/worker/runner';
import type { Reply, Request } from '@/worker/protocol';
import type { SimClient } from '@/ui/simClient';

export function inProcessClient(log?: Request[]): SimClient {
  let handler: (m: Reply) => void = () => {};
  const runner = new SimRunner((m) => handler(m), () => Promise.resolve());
  return {
    send: (m) => {
      log?.push(m);
      void runner.receive(m);
    },
    onReply: (h) => { handler = h; },
    dispose: () => {},
  };
}
