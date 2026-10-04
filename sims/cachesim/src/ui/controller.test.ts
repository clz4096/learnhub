import { afterEach, describe, expect, it, vi } from 'vitest';
import { Controller } from '@/ui/controller';
import { MAX_RESTARTS, createWorkerClient, type SimClient, type WorkerLike } from '@/ui/simClient';
import { inProcessClient } from '@/ui/testClient';
import type { Reply, Request } from '@/worker/protocol';
import * as S from '@/ui/state';

class FakeWorker implements WorkerLike {
  onmessage: ((e: MessageEvent<Reply>) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  sent: Request[] = [];
  terminated = false;
  postMessage(msg: Request): void {
    this.sent.push(msg);
  }
  terminate(): void {
    this.terminated = true;
  }
  crash(): void {
    this.onerror?.({ message: 'boom', preventDefault: () => {} } as ErrorEvent);
  }
  reply(msg: Reply): void {
    this.onmessage?.({ data: msg } as MessageEvent<Reply>);
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  S.workerNotice.value = null;
  S.workerError.value = null;
});

describe('createWorkerClient', () => {
  it('replaces a crashed worker and reports the restart', () => {
    const workers: FakeWorker[] = [];
    const c = createWorkerClient(() => {
      const w = new FakeWorker();
      workers.push(w);
      return w;
    });
    const got: Reply[] = [];
    c.onReply((m) => got.push(m));
    workers[0]!.crash();
    expect(workers[0]!.terminated).toBe(true);
    expect(workers.length).toBe(2);
    expect(got[0]).toMatchObject({ type: 'error', gen: -1, restarted: true });
    c.send({ type: 'reset', gen: 1 });
    expect(workers[1]!.sent).toEqual([{ type: 'reset', gen: 1 }]);
    // Errors from the dead worker are ignored.
    workers[0]!.crash();
    expect(got.length).toBe(1);
  });

  it('stops replacing a worker that crashes before ever replying', () => {
    const workers: FakeWorker[] = [];
    const c = createWorkerClient(() => {
      const w = new FakeWorker();
      workers.push(w);
      return w;
    });
    const got: Reply[] = [];
    c.onReply((m) => got.push(m));
    for (let k = 0; k <= MAX_RESTARTS; k++) workers[workers.length - 1]!.crash();
    expect(workers.length).toBe(MAX_RESTARTS + 1);
    expect(got[got.length - 1]).toMatchObject({ type: 'error', restarted: false });
  });

  it('a reply resets the crash count', () => {
    const workers: FakeWorker[] = [];
    const c = createWorkerClient(() => {
      const w = new FakeWorker();
      workers.push(w);
      return w;
    });
    c.onReply(() => {});
    for (let k = 0; k < MAX_RESTARTS * 2; k++) {
      const w = workers[workers.length - 1]!;
      w.reply({ type: 'progress', gen: 0, done: 0, target: 0 });
      w.crash();
    }
    expect(workers.length).toBe(MAX_RESTARTS * 2 + 1);
  });
});

describe('Controller', () => {
  it('reconfigures after the worker was restarted and shows a notice', () => {
    const sent: Request[] = [];
    let handler: (m: Reply) => void = () => {};
    const client: SimClient = { send: (m) => sent.push(m), onReply: (h) => { handler = h; }, dispose: () => {} };
    const c = new Controller(client);
    c.configure();
    const before = sent.length;
    handler({ type: 'error', gen: -1, restarted: true, message: 'simulation worker failed: boom' });
    expect(sent.length).toBe(before + 1);
    expect(sent[sent.length - 1]!.type).toBe('configure');
    expect(S.workerNotice.value).toMatch(/boom/);
    expect(S.workerError.value).toBeNull();
    handler({ type: 'error', gen: -1, restarted: false, message: 'simulation worker failed: again' });
    expect(S.workerError.value).toMatch(/again/);
    expect(sent.length).toBe(before + 1);
  });

  it('keeps the frame loop alive when a frame throws', () => {
    const frames: Array<(t: number) => void> = [];
    vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => frames.push(cb));
    vi.stubGlobal('cancelAnimationFrame', () => {});
    const c = new Controller(inProcessClient());
    c.start();
    const tick = vi.spyOn(c, 'tick').mockImplementationOnce(() => { throw new Error('bad frame'); });
    expect(() => frames[0]!(16)).toThrow('bad frame');
    expect(frames.length).toBe(2);
    frames[1]!(32);
    expect(tick).toHaveBeenCalledTimes(2);
    expect(frames.length).toBe(3);
    c.dispose();
  });
});
