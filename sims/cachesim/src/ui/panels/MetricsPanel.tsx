/** Right panel: charts over time, miss breakdown, per-core table, profiler-style counters. */
import type { ComponentChildren } from 'preact';
import type { LevelStats, Stats } from '@/engine/types';
import { config, history, stats } from '@/ui/state';
import { LineChart } from '@/ui/panels/Charts';
import { Term } from '@/ui/Term';
import { Pick, coreSelection, levelSelection } from '@/ui/modes/Pick';

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const fixed1 = (v: number) => v.toFixed(1);
const big = (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e4 ? `${(v / 1e3).toFixed(0)}k` : String(Math.round(v)));

/** A collapsed "What is this?" note under a metrics heading: help on demand, no clutter. */
function WhatIsThis({ children }: { children: ComponentChildren }) {
  return (
    <details class="what-is-this small">
      <summary>What is this?</summary>
      <div class="muted">{children}</div>
    </details>
  );
}

export function MetricsPanel() {
  return (
    <div class="metrics">
      <Charts />
      <MissBreakdown />
      <PerLevel />
      <PerCore />
      <Counters />
    </div>
  );
}

function Charts() {
  const h = history.value;
  const cfg = config.value;
  const xs = h.points.map((p) => p.i);
  const series = [
    { label: cfg.l1d.name, values: h.points.map((p) => p.l1), color: '#0b5cad' },
    { label: cfg.l2.name, values: h.points.map((p) => p.l2), color: '#1a7f37', dash: '5 3' },
  ];
  if (cfg.l3) series.push({ label: cfg.l3.name, values: h.points.map((p) => p.l3), color: '#c4570a', dash: '2 2' });
  return (
    <section class="panel" aria-labelledby="charts-title">
      <h2 id="charts-title">Over time</h2>
      <WhatIsThis>
        <p><Term id="hit-rate">Hit rate</Term>: the share of lookups at each level that found the data there, counted from the start of the run.</p>
        <p>Total cycles: the memory time spent so far. A cycle is one tick of the CPU clock.</p>
        <p><Term id="amat">AMAT</Term>: the average cost of one access, in cycles. Lower is better.</p>
      </WhatIsThis>
      {h.points.length === 0 ? <p class="small muted">Charts fill in as accesses run.</p> : (
        <>
          <LineChart title="Hit rate per level (so far)" xs={xs} series={series} yMax={1} yFormat={pct} />
          <LineChart title="Total cycles so far" xs={xs} series={[{ label: 'cycles', values: h.points.map((p) => p.cycles), color: '#1f2328' }]} yFormat={big} />
          <LineChart title="AMAT (average cycles per access)" xs={xs} series={[{ label: 'AMAT', values: h.points.map((p) => p.amat), color: '#8250df' }]} yFormat={fixed1} />
        </>
      )}
      <p class="small muted"><Term id="amat">AMAT</Term> = average memory access time = total cycles ÷ accesses.</p>
    </section>
  );
}

const MISS_COLORS = { compulsory: '#57606a', capacity: '#c4570a', conflict: '#cf222e', coherence: '#8250df' } as const;
const MISS_KEYS = ['compulsory', 'capacity', 'conflict', 'coherence'] as const;
const MISS_TERM = { compulsory: 'compulsory-miss', capacity: 'capacity-miss', conflict: 'conflict-miss', coherence: 'coherence-miss' } as const;
const MISS_PATTERN = { compulsory: '', capacity: 'stripes', conflict: 'dots', coherence: 'cross' } as const;

function MissBreakdown() {
  const s = stats.value;
  const levels = s ? Object.entries(s.levels) : [];
  return (
    <section class="panel" aria-labelledby="miss-title">
      <h2 id="miss-title">Miss breakdown</h2>
      <WhatIsThis>
        <p>
          For each <Term id="cache-level">cache level</Term>: how many lookups were <Term id="miss">misses</Term> (the data was not
          there), split by cause. Compulsory: the first use of a line. Capacity: the cache is too small for the data. Conflict: too
          many lines want the same <Term id="set">set</Term>. Coherence: another core's write threw this copy away.
        </p>
      </WhatIsThis>
      <div class="miss-keys small">
        {MISS_KEYS.map((k) => (
          <span key={k} class="chart-key">
            <span class={`miss-swatch ${MISS_PATTERN[k]}`} style={{ background: MISS_COLORS[k] }} aria-hidden="true" />
            <Term id={MISS_TERM[k]}>{k}</Term>
          </span>
        ))}
      </div>
      {levels.length === 0 && <p class="small muted">No accesses yet.</p>}
      {levels.map(([name, l]) => <MissBar key={name} name={name} l={l} />)}
    </section>
  );
}

function MissBar({ name, l }: { name: string; l: LevelStats }) {
  const total = l.compulsory + l.capacity + l.conflict + l.coherence;
  return (
    <div class="miss-row">
      <div class="small"><Pick sel={levelSelection(name)}><strong>{name}</strong></Pick> {total.toLocaleString()} misses of {l.accesses.toLocaleString()} lookups</div>
      <Pick sel={levelSelection(name)} block label={`Explain ${name} misses`}>
        <span class="stacked" role="img" aria-label={`${name}: ${MISS_KEYS.map((k) => `${k} ${l[k]}`).join(', ')}`}>
          {total > 0 && MISS_KEYS.map((k) => l[k] > 0 && (
            <span key={k} class={`stacked-seg ${MISS_PATTERN[k]}`} style={{ width: `${(l[k] / total) * 100}%`, background: MISS_COLORS[k] }} title={`${k}: ${l[k]}`} />
          ))}
        </span>
      </Pick>
      <div class="miss-nums small mono">
        {MISS_KEYS.map((k) => <span key={k}>{k} {l[k].toLocaleString()}</span>)}
      </div>
    </div>
  );
}

function PerLevel() {
  const s = stats.value;
  if (!s) return null;
  const levels = Object.entries(s.levels);
  let served = 0;
  for (const [, l] of levels) served += l.servedCycles;
  return (
    <section class="panel" aria-labelledby="level-title">
      <h2 id="level-title">Per level</h2>
      <WhatIsThis>
        <p>
          <Term id="eviction">Evictions</Term>: lines pushed out to make room. <Term id="mesi-invalid">Invalidations</Term>: copies thrown
          away because another core wrote the line. Cycles served: the time of the accesses this level answered.
        </p>
      </WhatIsThis>
      {/* Focusable so keyboard users can scroll it sideways on a narrow screen. */}
      <div class="table-wrap" tabIndex={0} role="region" aria-labelledby="level-title">
        <table class="small mono">
          <thead>
            <tr><th scope="col">level</th><th scope="col"><Term id="eviction">evictions</Term></th>
              <th scope="col"><Term id="mesi-invalid">invalidations</Term></th><th scope="col">cycles served</th></tr>
          </thead>
          <tbody>
            {levels.map(([name, l]) => (
              <tr key={name}>
                <th scope="row"><Pick sel={levelSelection(name)} label={`Explain ${name}`}>{name}</Pick></th>
                <td>{l.evictions.toLocaleString()}</td><td>{l.invalidations.toLocaleString()}</td><td>{big(l.servedCycles)}</td>
              </tr>
            ))}
            <tr><th scope="row">DRAM, peer</th><td /><td /><td>{big(Math.max(0, s.cycles - served))}</td></tr>
          </tbody>
        </table>
      </div>
      <p class="small muted">Cycles served: the cycles of the accesses each level answered. DRAM and transfers from another core's cache make up the rest.</p>
    </section>
  );
}

function PerCore() {
  const s = stats.value;
  if (!s) return null;
  return (
    <section class="panel" aria-labelledby="core-title">
      <h2 id="core-title">Per core</h2>
      <WhatIsThis>
        <p>
          One row per <Term id="core">core</Term>. The L1 to peer columns count which place answered each of that core's accesses;
          peer means another core's cache sent the line (a <Term id="peer-transfer">peer transfer</Term>). Invalidations sent: how many
          times this core's writes made other cores throw away their copies.
        </p>
      </WhatIsThis>
      <div class="table-wrap" tabIndex={0} role="region" aria-labelledby="core-title">
        <table class="small mono">
          <thead>
            <tr><th scope="col">core</th><th scope="col">accesses</th><th scope="col">reads/writes</th><th scope="col">cycles</th><th scope="col"><Term id="amat">AMAT</Term></th>
              <th scope="col">L1</th><th scope="col">L2</th><th scope="col">{config.value.l3?.name ?? 'L3'}</th><th scope="col">DRAM</th><th scope="col">peer</th><th scope="col">invalidations sent</th></tr>
          </thead>
          <tbody>
            {s.cores.map((c, i) => (
              <tr key={i}>
                <th scope="row"><Pick sel={coreSelection(i)} label={`Explain core ${i}'s L1d`}>{i}</Pick></th><td>{c.accesses.toLocaleString()}</td><td>{c.reads}/{c.writes}</td><td>{big(c.cycles)}</td>
                <td>{c.accesses ? fixed1(c.cycles / c.accesses) : '0'}</td>
                <td>{c.servedBy.L1}</td><td>{c.servedBy.L2}</td><td>{c.servedBy.L3}</td><td>{c.servedBy.DRAM}</td><td>{c.servedBy.peer}</td><td>{c.invalidationsSent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** The counters a hardware profiler reports, computed from the model. */
export function profilerCounters(s: Stats, l1: string, llc: string | undefined) {
  const L1 = s.levels[l1];
  const LLC = llc ? s.levels[llc] : undefined;
  let inv = 0;
  for (const c of s.cores) inv += c.invalidationsSent;
  return {
    cycles: s.cycles,
    l1dMisses: L1?.misses ?? 0,
    llcMisses: LLC?.misses ?? 0,
    amat: s.amat,
    invalidations: inv,
  };
}

function Counters() {
  const s = stats.value;
  const cfg = config.value;
  const llcName = cfg.l3?.name ?? cfg.l2.name;
  const c = s ? profilerCounters(s, cfg.l1d.name, llcName) : null;
  return (
    <section class="panel" aria-labelledby="ctr-title">
      <h2 id="ctr-title">Totals</h2>
      <p class="small muted">The numbers a hardware profiler would report for this run.</p>
      <WhatIsThis>
        <p>
          Cycles: total memory time. L1D misses: lookups the first data cache could not answer. <Term id="llc">LLC</Term> misses: lookups
          the last cache before DRAM could not answer, so each one went to main memory. <Term id="amat">AMAT</Term> (average memory access
          time): total cycles ÷ accesses, the average cost of one access. Coherence invalidations: copies thrown away because another core wrote.
        </p>
      </WhatIsThis>
      {c && (
        <dl class="counters mono small">
          <dt>cycles (memory only)</dt><dd>{c.cycles.toLocaleString()}</dd>
          <dt><Pick sel={levelSelection(cfg.l1d.name)}>L1D misses</Pick></dt><dd>{c.l1dMisses.toLocaleString()}</dd>
          <dt><Pick sel={levelSelection(llcName)}>LLC ({llcName}) misses</Pick></dt><dd>{c.llcMisses.toLocaleString()}</dd>
          <dt><Term id="amat">AMAT</Term></dt><dd>{c.amat.toFixed(2)} cycles</dd>
          <dt>coherence invalidations</dt><dd>{c.invalidations.toLocaleString()}</dd>
        </dl>
      )}
      <div class="table-wrap">
        <table class="small">
          <thead><tr><th scope="col">OS</th><th scope="col">Tool and command</th></tr></thead>
          <tbody>
            <tr><th scope="row">Linux</th><td><code>perf stat -e cycles,L1-dcache-load-misses,LLC-load-misses ./prog</code></td></tr>
            <tr><th scope="row">macOS</th><td>Instruments → CPU Counters (<code>xcrun xctrace record --template 'CPU Counters' --launch ./prog</code>)</td></tr>
            <tr><th scope="row">Windows</th><td>Intel VTune (<code>vtune -collect memory-access ./prog.exe</code>) or AMD uProf</td></tr>
          </tbody>
        </table>
      </div>
      <p class="small muted">
        These are model numbers, not measurements: each access is charged its serving level's latency, with no
        out-of-order overlap, memory-level parallelism, or <Term id="tlb">TLB</Term>. Compare trends between
        patterns, not absolute values.
      </p>
    </section>
  );
}
