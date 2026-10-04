/** Transport controls and view toggles. Space = play/pause, → = step (see App). */
import { controller } from '@/ui/controller';
import { ACCESSES_PER_SECOND, SPEEDS } from '@/ui/playback';
import { PrefetchControls } from '@/ui/panels/HardwarePanel';
import { current, done, estimate, layout, playing, runProgress, showArrows, showBreakdown, speed, workerError } from '@/ui/state';

export function BottomBar() {
  const prog = runProgress.value;
  const played = current.value ? current.value.index + 1 : 0;
  const busy = prog !== null;
  const phone = layout.value === 'phone';
  const speedNote = `1× = ${ACCESSES_PER_SECOND} accesses per second`;
  const toggles = (
    <div class="toggles">
      <PrefetchControls compact />
      <label class="toggle" title="Draw an arrow when one core sends a line to another or makes it throw its copy away">
        <input type="checkbox" checked={showArrows.value} onChange={(e) => { showArrows.value = (e.currentTarget as HTMLInputElement).checked; }} />
        <span>Coherence arrows</span>
      </label>
      <label class="toggle" title="Show how each cache splits the current address into tag, set, and offset">
        <input type="checkbox" checked={showBreakdown.value} onChange={(e) => { showBreakdown.value = (e.currentTarget as HTMLInputElement).checked; }} />
        <span>Address breakdown</span>
      </label>
    </div>
  );
  return (
    <div class="bottom-bar" role="toolbar" aria-label="Playback">
      <div class="transport">
        <button type="button" class="btn btn-primary" aria-keyshortcuts="Space" disabled={busy || (done.value && !playing.value) || !!workerError.value}
          onClick={() => controller()?.togglePlay()}>
          {playing.value ? '❚❚ Pause' : '▶ Play'}
        </button>
        <button type="button" class="btn" aria-keyshortcuts="ArrowRight" disabled={busy || done.value || !!workerError.value}
          onClick={() => controller()?.step()}>
          Step ›
        </button>
        <button type="button" class="btn" aria-label="Run to end" disabled={busy || done.value || !!workerError.value} onClick={() => controller()?.runToEnd()}>
          <span class="label-long">Run to end ⇥</span><span class="label-short" aria-hidden="true">End ⇥</span>
        </button>
        <button type="button" class="btn" onClick={() => controller()?.reset()}>Reset ↺</button>
      </div>
      <div class="speed">
        <span id="speed-label" class="small">Speed</span>
        <div class="segmented" role="radiogroup" aria-labelledby="speed-label">
          {SPEEDS.map((s) => (
            <button key={s} type="button" role="radio" aria-checked={speed.value === s} onClick={() => { speed.value = s; }}>{s}×</button>
          ))}
        </div>
        {!phone && <span class="small muted speed-note">{speedNote}</span>}
      </div>
      {phone ? (
        <details class="bar-options">
          <summary class="small">Options</summary>
          <p class="small muted speed-note">{speedNote}</p>
          {toggles}
        </details>
      ) : toggles}
      <div class="status small mono" role="status" aria-live="polite">
        {busy
          ? <>Running… {prog.done.toLocaleString()}{prog.target > 0 ? ` / ~${prog.target.toLocaleString()}` : ''}<progress max={Math.max(1, prog.target)} value={prog.done} /></>
          : <>{played.toLocaleString()} of ~{estimate.value.toLocaleString()} accesses{done.value ? ' · done' : ''}</>}
      </div>
    </div>
  );
}
