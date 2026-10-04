/**
 * Runs a Help page "try this" action: load its setup through the lesson runner (which
 * drives the controller and waits for the worker), run its playback, then switch the
 * mode, view, tab, lesson, glossary entry, or selection it names.
 */
import { batch } from '@preact/signals';
import { openTerm } from '@/ui/Term';
import { busy, runActions } from '@/ui/modes/lessonRunner';
import { updateProgress } from '@/ui/modes/progress';
import * as S from '@/ui/state';
import type { HelpAction } from '@/ui/help/content';
import { helpNotice } from '@/ui/help/state';

export async function runHelpAction(a: HelpAction): Promise<void> {
  if (busy.value) throw new Error('A lesson step is still running. Try again when it finishes.');
  // Set before the setup so the run it starts already replays this text.
  if (a.trace !== undefined) S.traceText.value = a.trace;
  await runActions([{ kind: 'setup', setup: a.setup }, ...(a.then ?? [])]);
  batch(() => {
    if (a.mode) S.mode.value = a.mode;
    if (a.view) S.view.value = a.view;
    if (a.phoneTab && S.layout.value === 'phone') S.phoneTab.value = a.phoneTab;
    if (a.lesson) {
      const id = a.lesson;
      updateProgress((p) => { p.lesson = id; });
      S.mode.value = 'guided';
    }
    if (a.select) S.selection.value = a.select;
  });
  if (a.term) openTerm(a.term);
  if (a.focus) focusSoon(a.focus);
}

/** Run an action and report a failure in helpNotice instead of throwing. */
export async function tryHelpAction(a: HelpAction): Promise<void> {
  helpNotice.value = null;
  try {
    await runHelpAction(a);
  } catch (e) {
    helpNotice.value = e instanceof Error ? e.message : String(e);
  }
}

/** Scroll to and focus `selector` once the panels have rendered. */
function focusSoon(selector: string): void {
  const go = () => {
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) return;
    // Center it: the sticky bottom bar covers the bottom of the viewport.
    el.scrollIntoView?.({ block: 'center' });
    if (el.tabIndex < 0 && !el.matches('input, textarea, select, button, a[href]')) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
  };
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => requestAnimationFrame(go));
  else setTimeout(go, 0);
}
