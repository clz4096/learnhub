/**
 * Import a results.csv from any OS run and compare its ratios between variants with
 * the simulator's ratios for the same variants. Client-side only: the file is read in
 * the browser and kept in localStorage, never sent anywhere.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import {
  MAX_RESULTS_BYTES, clearStoredResults, loadStoredResults, parseResultsCsv, saveStoredResults, type StoredResults,
} from '@/ui/tryit/results';
import { COMPARISONS, buildRows, formatRatio, hasBench, verdict, type TableRow } from '@/ui/tryit/compare';
import { modelRatios } from '@/ui/tryit/modelClient';
import '@/ui/tryit/tryit.css';

type ModelState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; ratios: Record<string, number> }
  | { kind: 'error'; message: string };

export function ImportResults({ workloadId, benchName }: { workloadId: string; benchName: string }) {
  const [stored, setStored] = useState<StoredResults | null>(() => loadStoredResults());
  const [notice, setNotice] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [model, setModel] = useState<ModelState>({ kind: 'idle' });

  const parsed = useMemo(() => (stored ? parseResultsCsv(stored.text) : null), [stored]);
  const relevant = !!parsed && hasBench(parsed.rows, benchName);

  useEffect(() => {
    // The model takes seconds for some workloads; only run it when there is something to compare.
    if (!relevant) {
      setModel({ kind: 'idle' });
      return;
    }
    let live = true;
    setModel({ kind: 'loading' });
    modelRatios(workloadId).then(
      (ratios) => { if (live) setModel({ kind: 'ready', ratios }); },
      (err: unknown) => { if (live) setModel({ kind: 'error', message: err instanceof Error ? err.message : String(err) }); },
    );
    return () => { live = false; };
  }, [workloadId, relevant]);

  const accept = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_RESULTS_BYTES) {
      setNotice(`${file.name} is too large to be a results.csv (over 1 MiB).`);
      return;
    }
    let text: string;
    try {
      text = await file.text();
    } catch {
      setNotice(`Could not read ${file.name}.`);
      return;
    }
    const p = parseResultsCsv(text);
    if (p.rows.length === 0) {
      setNotice(`${file.name} has no benchmark results. Choose the results.csv from a bench/results/ folder.`);
      return;
    }
    const value = { name: file.name, text, savedAt: new Date().toISOString() };
    setStored(value);
    setNotice(saveStoredResults(value) ? null : 'This browser would not save the file, so it is kept only until you reload.');
  };

  const onInput = (e: JSX.TargetedEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    void accept(input.files?.[0]);
    // Lets the same file be chosen again after it changes on disk.
    input.value = '';
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void accept(e.dataTransfer?.files[0]);
  };
  const clear = () => {
    clearStoredResults();
    setStored(null);
    setNotice(null);
  };

  const rows = parsed
    ? buildRows(parsed.rows, benchName, COMPARISONS[workloadId] ?? [], model.kind === 'ready' ? model.ratios : null)
    : [];

  return (
    <div class="tryit-import">
      <h3 id="tryit-import-title">Compare your results</h3>
      <p class="small">
        After a run, load its <span class="mono">results.csv</span> (from <span class="mono">bench/results/</span>) to see whether your
        machine and the simulator agree on which variant is slower. The file stays in this browser.
      </p>
      <div
        class={dragging ? 'tryit-drop dragging' : 'tryit-drop'}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <label class="small" for="tryit-file-input">Choose results.csv, or drop it here: </label>
        <input id="tryit-file-input" type="file" accept=".csv,.txt,text/csv,text/plain" onChange={onInput} />
      </div>
      {notice && <p class="small tryit-error" role="alert">{notice}</p>}
      {stored && parsed && (
        <div class="tryit-file small">
          <span>Loaded <span class="mono">{stored.name}</span>: {parsed.rows.length} results{parsed.errors.length > 0 && `, ${parsed.errors.length} lines skipped`}.</span>
          <button type="button" class="btn" onClick={clear}>Forget this file</button>
        </div>
      )}
      {parsed && !relevant && (
        <p class="small muted">This file has no results for <span class="mono">{benchName}</span>. Run that benchmark, or pick another workload.</p>
      )}
      {relevant && rows.length === 0 && (
        <p class="small muted">The file has <span class="mono">{benchName}</span> results, but not the variants this panel compares.</p>
      )}
      {relevant && rows.length > 0 && <RatioTable rows={rows} model={model} />}
    </div>
  );
}

function RatioTable({ rows, model }: { rows: TableRow[]; model: ModelState }) {
  // Bars use a log scale so 1.2x and 300x both fit; the numbers carry the meaning.
  const maxLog = Math.max(1, ...rows.flatMap((r) => [r.measured.ratio, r.model ?? 1].map((x) => Math.abs(Math.log2(x)))));
  const bar = (r: number, kind: 'measured' | 'model') => (
    <span
      class={`tryit-bar ${kind}${r < 1 ? ' faster' : ''}`}
      style={{ width: `${Math.max(2, (100 * Math.abs(Math.log2(r))) / maxLog)}%` }}
      aria-hidden="true"
    />
  );
  const v = verdict(rows);
  return (
    <>
      {model.kind === 'loading' && <p class="small muted" role="status">Running the simulator for the same variants (a few seconds)…</p>}
      {model.kind === 'error' && <p class="small tryit-error" role="alert">Simulator ratios unavailable: {model.message}.</p>}
      {v && (
        <p class="small" role="status">
          Verdict: <span class={`tryit-verdict ${v === 'same direction' ? 'same' : 'different'}`}>{v}</span>.{' '}
          {v === 'same direction'
            ? 'In every row, the variant that is slower on your machine is also slower in the simulator.'
            : 'In at least one row, your machine and the simulator disagree on which variant is slower. VERIFY.md lists known mismatches.'}
        </p>
      )}
      <div class="table-wrap">
        <table class="small">
          <caption class="small muted" style={{ textAlign: 'left', captionSide: 'top' }}>
            Each number is how many times longer the first variant takes per element than the second. Above 1x, the first is slower.
          </caption>
          <thead>
            <tr>
              <th scope="col">Comparison</th>
              <th scope="col">Size</th>
              <th scope="col">Your machine</th>
              <th scope="col">Simulator</th>
              <th scope="col">Same direction?</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.comparison.id + r.measured.param}>
                <th scope="row">{r.comparison.label}</th>
                <td class="mono">{r.measured.param}</td>
                <td>{formatRatio(r.measured.ratio)}{bar(r.measured.ratio, 'measured')}</td>
                <td>
                  {r.model !== null ? (
                    <>{formatRatio(r.model)}{bar(r.model, 'model')}<span class="muted"> {r.comparison.model?.note}</span></>
                  ) : r.comparison.model === null ? (
                    <span class="muted">not modeled: {r.comparison.why}</span>
                  ) : model.kind === 'loading' ? (
                    <span class="muted">computing</span>
                  ) : (
                    <span class="muted">unavailable</span>
                  )}
                </td>
                <td>{r.agrees === null ? 'not compared' : r.agrees ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
