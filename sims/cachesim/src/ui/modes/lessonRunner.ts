/**
 * Applies lesson and glossary actions to the live app through the controller. A setup
 * changes the run-defining signals; the controller reconfigures (debounced) and the
 * worker replies 'configured', which replaces S.caches. Playback actions wait for
 * that reply, so "load, then run to end" works as one click.
 */
import { batch, effect, signal } from '@preact/signals';
import { controller } from '@/ui/controller';
import * as S from '@/ui/state';
import type { Action } from '@/ui/modes/lessons';
import { configFor, paramsFor, type Setup } from '@/ui/modes/setup';

/** True while a lesson action is running; buttons disable on it. */
export const busy = signal(false);

const TIMEOUT_MS = 60_000;

/** Resolve when `pred` becomes true (checked on every signal change it reads). */
export function until(pred: () => boolean, ms = TIMEOUT_MS): Promise<void> {
  return new Promise((resolve, reject) => {
    let dispose: (() => void) | null = null;
    let settled = false;
    const finish = (err?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      // The effect may fire during its own creation, before `dispose` is assigned.
      queueMicrotask(() => dispose?.());
      if (err) reject(err); else resolve();
    };
    const timer = setTimeout(() => finish(new Error('The simulator did not respond in time.')), ms);
    // Only a new error counts; a stale one is cleared by the next 'configured' reply.
    const staleError = S.workerError.peek();
    dispose = effect(() => {
      const err = S.workerError.value;
      if (err && err !== staleError) finish(new Error(err));
      else if (pred()) finish();
    });
  });
}

/** Load a setup and wait until the worker has configured it (a fresh, empty run). */
export async function applySetup(s: Setup): Promise<void> {
  const cfg = configFor(s);
  const params = paramsFor(s);
  const before = S.caches.value;
  const runChanged = JSON.stringify(S.config.value) !== JSON.stringify(cfg)
    || S.workloadId.value !== s.workload
    || JSON.stringify(S.params.value) !== JSON.stringify(params);
  batch(() => {
    S.presetId.value = s.preset;
    if (JSON.stringify(S.config.value) !== JSON.stringify(cfg)) S.config.value = cfg;
    if (S.workloadId.value !== s.workload) S.workloadId.value = s.workload;
    if (JSON.stringify(S.params.value) !== JSON.stringify(params)) S.params.value = params;
    if (s.arrows !== undefined) S.showArrows.value = s.arrows;
    if (s.breakdown !== undefined) S.showBreakdown.value = s.breakdown;
  });
  // Same run as before: restart it so the lesson starts from access 0.
  if (!runChanged) controller()?.reset();
  await until(() => S.caches.value !== before);
}

export async function runAction(a: Action): Promise<void> {
  const c = controller();
  if (!c) throw new Error('The simulator is not running.');
  switch (a.kind) {
    case 'setup':
      await applySetup(a.setup);
      return;
    case 'step': {
      const target = (S.current.value?.index ?? -1) + a.n;
      for (let k = 0; k < a.n; k++) c.step();
      await until(() => (S.current.value?.index ?? -1) >= target || S.done.value);
      return;
    }
    case 'play':
      if (!S.playing.value) c.togglePlay();
      return;
    case 'runToEnd':
      c.runToEnd();
      await until(() => S.done.value && S.runProgress.value === null);
      return;
  }
}

/** Run actions in order. Rejects with a readable error; never runs two lists at once. */
export async function runActions(actions: readonly Action[], show?: 'view' | 'metrics'): Promise<void> {
  if (busy.value) return;
  busy.value = true;
  try {
    for (const a of actions) await runAction(a);
    if (show && S.layout.value === 'phone') S.phoneTab.value = show;
  } finally {
    busy.value = false;
  }
}
