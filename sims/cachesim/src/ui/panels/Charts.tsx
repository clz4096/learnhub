/** Hand-rolled SVG line chart (no chart library): a few polylines over ≤ 600 points. */
export interface Series {
  label: string;
  values: readonly number[];
  color: string;
  /** Dash pattern, so series differ by more than color. */
  dash?: string;
}

const W = 300;
const H = 120;
const PAD = { l: 38, r: 8, t: 8, b: 20 };

export function LineChart({ title, xs, series, yMax, yFormat = (v) => String(v), xLabel = 'accesses' }: {
  title: string;
  xs: readonly number[];
  series: readonly Series[];
  /** Fixed y max (e.g. 1 for rates); otherwise the data max. */
  yMax?: number;
  yFormat?: (v: number) => string;
  xLabel?: string;
}) {
  const xMax = Math.max(1, xs[xs.length - 1] ?? 1);
  let top = yMax ?? 0;
  if (yMax === undefined) for (const s of series) for (const v of s.values) if (Number.isFinite(v) && v > top) top = v;
  if (top <= 0) top = 1;
  const px = (x: number) => PAD.l + (x / xMax) * (W - PAD.l - PAD.r);
  const py = (y: number) => H - PAD.b - (y / top) * (H - PAD.t - PAD.b);
  const path = (vals: readonly number[]) => {
    let d = '';
    let pen = false;
    vals.forEach((v, i) => {
      if (!Number.isFinite(v)) { pen = false; return; }
      d += `${pen ? 'L' : 'M'}${px(xs[i] ?? 0).toFixed(1)},${py(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  };
  const last = (vals: readonly number[]) => {
    for (let i = vals.length - 1; i >= 0; i--) if (Number.isFinite(vals[i]!)) return vals[i]!;
    return NaN;
  };
  return (
    <figure class="chart">
      <figcaption class="small"><strong>{title}</strong></figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}: ${series.map((s) => `${s.label} ${Number.isFinite(last(s.values)) ? yFormat(last(s.values)) : 'n/a'}`).join(', ')}`}>
        <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} class="axis" />
        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={H - PAD.b} class="axis" />
        <text x={PAD.l - 4} y={PAD.t + 4} text-anchor="end" class="tick">{yFormat(top)}</text>
        <text x={PAD.l - 4} y={H - PAD.b} text-anchor="end" class="tick">{yFormat(0)}</text>
        <text x={W - PAD.r} y={H - 4} text-anchor="end" class="tick">{xMax.toLocaleString()} {xLabel}</text>
        {series.map((s) => (
          <path key={s.label} d={path(s.values)} fill="none" stroke={s.color} stroke-width="1.8" stroke-dasharray={s.dash} />
        ))}
      </svg>
      <div class="chart-legend small">
        {series.map((s) => (
          <span key={s.label} class="chart-key">
            <svg width="22" height="8" aria-hidden="true"><line x1="0" y1="4" x2="22" y2="4" stroke={s.color} stroke-width="2" stroke-dasharray={s.dash} /></svg>
            {s.label} {Number.isFinite(last(s.values)) ? yFormat(last(s.values)) : 'n/a'}
          </span>
        ))}
      </div>
    </figure>
  );
}
