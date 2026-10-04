/** Workload picker: the 10 access patterns, their params, and the custom trace editor. */
import { useEffect, useRef, useState } from 'preact/hooks';
import { WORKLOADS } from '@/workloads';
import { defaultParams } from '@/workloads/types';
import { LONG_TRACE, estimate, params, traceErrors, traceText, workload, workloadId } from '@/ui/state';
import { ParamControls } from '@/ui/panels/ParamControls';

export function WorkloadPanel() {
  const w = workload.value;
  const est = estimate.value;
  return (
    <section class="panel" aria-labelledby="wl-title">
      <h2 id="wl-title">Workload</h2>
      <p class="small muted">A workload is a small C++ loop. The simulator replays every memory access it makes, in order.</p>
      <div class="workload-list" role="radiogroup" aria-label="Access pattern">
        {WORKLOADS.map((x) => (
          <button
            key={x.id}
            type="button"
            role="radio"
            aria-checked={workloadId.value === x.id}
            class="workload-item"
            onClick={() => {
              if (workloadId.value === x.id) return;
              workloadId.value = x.id;
              params.value = defaultParams(x);
            }}
          >
            <span class="workload-num">{x.number}</span>
            <span class="workload-text">
              <span class="workload-title">{x.title}</span>
              {workloadId.value === x.id && <span class="workload-summary small">{x.summary}</span>}
            </span>
          </button>
        ))}
      </div>

      <ParamControls
        specs={w.params}
        values={params.value}
        onChange={(k, v) => { params.value = { ...params.value, [k]: v }; }}
      />

      {workloadId.value === 'custom' && <CustomTrace />}

      <p class="small estimate">
        This run makes about <strong class="mono">{est.toLocaleString()}</strong> memory accesses.
      </p>
      {est > LONG_TRACE && (
        <p class="warning small" role="status">
          Long run: playing it one access at a time would take hours. Press <strong>Run to end</strong> to compute it all in the background.
        </p>
      )}
    </section>
  );
}

/** Quiet time after the last keystroke before a pasted or typed trace is parsed. */
const TRACE_DEBOUNCE_MS = 250;

function CustomTrace() {
  const errs = traceErrors.value;
  // The textarea edits a local draft; parsing (a large trace takes a while) waits for a pause.
  const [draft, setDraft] = useState(traceText.value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<string | null>(null);
  const commit = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const text = pending.current;
    pending.current = null;
    if (text !== null && traceText.value !== text) traceText.value = text;
  };
  // Leaving the panel (phone tabs, workload switch) keeps what was typed.
  useEffect(() => commit, []);
  // Text set from elsewhere (Help's "Load this example") replaces the draft unless the user is mid-edit.
  const committed = traceText.value;
  useEffect(() => {
    if (pending.current === null) setDraft(committed);
  }, [committed]);
  return (
    <div class="custom-trace">
      <label class="field" for="trace-text">
        <span>Trace (<span class="mono">&lt;hex address&gt; &lt;R|W|I&gt; &lt;core&gt;</span> per line)</span>
      </label>
      <textarea
        id="trace-text"
        class="mono"
        rows={10}
        spellcheck={false}
        value={draft}
        aria-invalid={errs.length > 0}
        aria-describedby={errs.length ? 'trace-errors' : undefined}
        onInput={(e) => {
          const text = (e.currentTarget as HTMLTextAreaElement).value;
          setDraft(text);
          pending.current = text;
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(commit, TRACE_DEBOUNCE_MS);
        }}
        onBlur={commit}
      />
      {errs.length > 0 && (
        <ul id="trace-errors" class="error small" role="alert">
          {errs.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      )}
    </div>
  );
}
