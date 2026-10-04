/**
 * Start over: erase lesson progress. Deliberately hard to reach and to trigger by
 * accident: it sits collapsed at the end of Help, and the button stays disabled
 * until the exact phrase is typed (a native confirm() is one stray Enter away).
 */
import { useState } from 'preact/hooks';
import { LESSONS } from '@/ui/modes/lessons';
import { isDone, progress, resetProgress } from '@/ui/modes/progress';

export const CONFIRM_PHRASE = 'start over';

export const confirms = (typed: string): boolean => typed.trim().toLowerCase() === CONFIRM_PHRASE;

export function StartOver() {
  const [typed, setTyped] = useState('');
  const [status, setStatus] = useState('');
  const done = LESSONS.filter((l) => isDone(progress.value, l.id)).length;
  const ready = confirms(typed);
  const erase = () => {
    if (!ready) return;
    resetProgress();
    setTyped('');
    setStatus('Progress erased. Guided mode starts again at lesson 1.');
  };
  return (
    <section class="help-section" aria-labelledby="help-progress">
      <h3 id="help-progress" tabIndex={-1}>Your progress</h3>
      <p class="small">
        {done} of {LESSONS.length} lessons done. Progress is saved in this browser only.
      </p>
      <details class="start-over">
        <summary>Start over</summary>
        <p class="small">
          This erases every lesson's steps and answers, so all {LESSONS.length} lessons show as not done, here and on the
          learnhub catalog. It cannot be undone. The tour and any results you imported are kept.
        </p>
        <label class="field small" for="start-over-confirm">
          <span>Type <strong>{CONFIRM_PHRASE}</strong> to confirm</span>
          <input
            id="start-over-confirm"
            type="text"
            autocomplete="off"
            spellcheck={false}
            value={typed}
            onInput={(e) => { setTyped((e.currentTarget as HTMLInputElement).value); setStatus(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); erase(); } }}
          />
        </label>
        <p>
          <button type="button" class="btn btn-small btn-danger" disabled={!ready} onClick={erase}>
            Erase my progress
          </button>
        </p>
      </details>
      <p class="small" role="status" aria-live="polite">{status}</p>
    </section>
  );
}
