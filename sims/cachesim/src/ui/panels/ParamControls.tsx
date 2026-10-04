/** Controls generated from a workload's ParamSpec list. */
import type { ParamSpec, ParamValue, Params } from '@/workloads/types';

export function ParamControls({ specs, values, onChange }: {
  specs: readonly ParamSpec[];
  values: Params;
  onChange: (key: string, value: ParamValue) => void;
}) {
  if (specs.length === 0) return null;
  return (
    <div class="params">
      {specs.map((s) => <ParamControl key={s.key} spec={s} value={values[s.key] ?? s.default} onChange={(v) => onChange(s.key, v)} />)}
    </div>
  );
}

export function ParamControl({ spec, value, onChange }: { spec: ParamSpec; value: ParamValue; onChange: (v: ParamValue) => void }) {
  const id = `param-${spec.key}`;
  const help = spec.help ? <p class="help small muted" id={`${id}-help`}>{spec.help}</p> : null;
  const describedBy = spec.help ? `${id}-help` : undefined;

  if (spec.kind === 'bool') {
    return (
      <div class="param">
        <label class="toggle">
          <input id={id} type="checkbox" checked={value === true} aria-describedby={describedBy}
            onChange={(e) => onChange((e.currentTarget as HTMLInputElement).checked)} />
          <span>{spec.label}</span>
        </label>
        {help}
      </div>
    );
  }

  if (spec.kind === 'choice') {
    const opts = spec.options ?? [];
    return (
      <div class="param">
        <span class="param-label" id={`${id}-label`}>{spec.label}</span>
        <div class="segmented wrap" role="radiogroup" aria-labelledby={`${id}-label`} aria-describedby={describedBy}>
          {opts.map((o) => (
            <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}>
              {o.label}
            </button>
          ))}
        </div>
        {help}
      </div>
    );
  }

  // int: a slider (discrete steps through `values` when given) plus a number box.
  const n = typeof value === 'number' ? value : Number(spec.default);
  const vals = spec.values;
  if (vals && vals.length > 0) {
    let idx = vals.indexOf(n);
    if (idx < 0) idx = nearestIndex(vals, n);
    return (
      <div class="param">
        <label class="param-label" for={id}>{spec.label}: <output class="mono">{vals[idx]}</output></label>
        <input id={id} type="range" min={0} max={vals.length - 1} step={1} value={idx} aria-describedby={describedBy}
          aria-valuetext={String(vals[idx])}
          onInput={(e) => onChange(vals[Number((e.currentTarget as HTMLInputElement).value)]!)} />
        <div class="range-ticks small muted" aria-hidden="true"><span>{vals[0]}</span><span>{vals[vals.length - 1]}</span></div>
        {help}
      </div>
    );
  }
  const min = spec.min ?? 0;
  const max = spec.max ?? Math.max(min + 1, n);
  const step = spec.step ?? 1;
  const commit = (raw: number) => {
    if (!Number.isFinite(raw)) return;
    onChange(Math.min(max, Math.max(min, Math.round(raw))));
  };
  return (
    <div class="param">
      <label class="param-label" for={id}>{spec.label}</label>
      <div class="range-pair">
        <input id={id} type="range" min={min} max={max} step={step} value={n} aria-describedby={describedBy}
          onInput={(e) => commit((e.currentTarget as HTMLInputElement).valueAsNumber)} />
        <input type="number" class="num" min={min} max={max} step={step} value={n} aria-label={`${spec.label} (number)`}
          onChange={(e) => commit((e.currentTarget as HTMLInputElement).valueAsNumber)} />
      </div>
      {help}
    </div>
  );
}

function nearestIndex(vals: readonly number[], n: number): number {
  let best = 0;
  for (let i = 1; i < vals.length; i++) if (Math.abs(vals[i]! - n) < Math.abs(vals[best]! - n)) best = i;
  return best;
}
