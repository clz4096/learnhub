/** Hardware configuration: preset picker with sources, then every editable parameter. */
import { LIMITS, PRESETS, cloneConfig, presetById, type HierarchyConfig, type LevelConfig, type ReplacementPolicy } from '@/engine';
import { config, configError, presetId } from '@/ui/state';
import { formatBytes } from '@/ui/center/Grid2D';
import { Term } from '@/ui/Term';

type LevelKey = 'l1d' | 'l1i' | 'l2' | 'l3';

/** Apply an edit to a copy of the config; the run restarts (debounced) on change. */
export function updateConfig(edit: (c: HierarchyConfig) => void): void {
  const c = cloneConfig(config.value);
  edit(c);
  config.value = c;
}

function num(e: Event): number | null {
  const v = (e.currentTarget as HTMLInputElement).valueAsNumber;
  return Number.isFinite(v) ? v : null;
}

export function HardwarePanel() {
  const preset = presetById(presetId.value);
  const cfg = config.value;
  const modified = !!preset && JSON.stringify(preset.config) !== JSON.stringify(cfg);
  const err = configError.value;
  return (
    <section class="panel" aria-labelledby="hw-title">
      <h2 id="hw-title">Hardware</h2>
      <p class="small muted">
        Pick a CPU, or start with Textbook small cache to see every slot. Each <Term id="cache-level">cache level</Term> below has a size,
        {' '}<Term id="way">ways</Term> (slots per <Term id="set">set</Term>), a <Term id="latency">latency</Term> (cycles per hit), and
        a <Term id="replacement-policy">replacement</Term> rule. Edits restart the run.
      </p>
      <label class="field">
        <span>Preset</span>
        <select
          value={presetId.value}
          onChange={(e) => {
            const p = presetById((e.currentTarget as HTMLSelectElement).value);
            if (!p) return;
            presetId.value = p.id;
            config.value = cloneConfig(p.config);
          }}
        >
          {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </label>
      {preset && (
        <>
          <p class="small">{preset.note}{modified && <strong> (modified)</strong>}</p>
          {modified && (
            <button type="button" class="btn btn-small" onClick={() => { config.value = cloneConfig(preset.config); }}>
              Restore preset values
            </button>
          )}
          <details class="sources">
            <summary>Sources ({preset.sources.length})</summary>
            <ul>
              {preset.sources.map((s, i) => <li key={i}><SourceLine text={s} /></li>)}
            </ul>
          </details>
        </>
      )}

      {err && <p class="error" role="alert">Invalid configuration: {err}</p>}

      <div class="field-row">
        <label class="field">
          <span>Cores</span>
          <input type="number" min={1} max={8} step={1} value={cfg.cores}
            onChange={(e) => { const v = num(e); if (v !== null) updateConfig((c) => { c.cores = Math.round(v); }); }} />
        </label>
        <div class="field">
          <span id="line-label"><Term id="cache-line">Line size</Term></span>
          <div class="segmented" role="radiogroup" aria-labelledby="line-label">
            {[64, 128].map((b) => (
              <button key={b} type="button" role="radio" aria-checked={cfg.l1d.lineBytes === b}
                onClick={() => updateConfig((c) => {
                  for (const l of [c.l1d, c.l1i, c.l2, c.l3]) if (l) l.lineBytes = b;
                })}>
                {b} B
              </button>
            ))}
          </div>
        </div>
      </div>

      <LevelEditor k="l1d" level={cfg.l1d} />
      {cfg.l1i && <LevelEditor k="l1i" level={cfg.l1i} />}
      <LevelEditor k="l2" level={cfg.l2} />
      {cfg.l3 && <LevelEditor k="l3" level={cfg.l3} />}

      <div class="field-row">
        <label class="field">
          <span>DRAM latency (cycles)</span>
          <input type="number" min={1} max={5000} value={cfg.dramLatency}
            onChange={(e) => { const v = num(e); if (v !== null && v > 0) updateConfig((c) => { c.dramLatency = Math.round(v); }); }} />
        </label>
        <label class="field">
          <span>Core-to-core transfer extra (cycles)</span>
          <input type="number" min={0} max={1000} value={cfg.coherencePenalty}
            onChange={(e) => { const v = num(e); if (v !== null && v >= 0) updateConfig((c) => { c.coherencePenalty = Math.round(v); }); }} />
        </label>
      </div>

      <fieldset class="fieldset">
        <legend><Term id="prefetcher">Prefetcher</Term></legend>
        <PrefetchControls />
        <label class="field">
          <span>Degree (lines ahead)</span>
          <input type="number" min={1} max={8} value={cfg.prefetch.degree} disabled={!cfg.prefetch.enabled}
            onChange={(e) => { const v = num(e); if (v !== null) updateConfig((c) => { c.prefetch.degree = Math.min(8, Math.max(1, Math.round(v))); }); }} />
        </label>
      </fieldset>

      <label class="field">
        <span>Random seed (random replacement)</span>
        <input type="number" min={0} step={1} value={cfg.seed}
          onChange={(e) => { const v = num(e); if (v !== null) updateConfig((c) => { c.seed = Math.max(0, Math.round(v)); }); }} />
      </label>
    </section>
  );
}

/** Prefetcher on/off + kind. Also used in the bottom bar. */
export function PrefetchControls({ compact = false }: { compact?: boolean }) {
  const pf = config.value.prefetch;
  return (
    <div class={compact ? 'inline-controls' : 'field-row'}>
      <label class="toggle">
        <input type="checkbox" checked={pf.enabled}
          onChange={(e) => { const on = (e.currentTarget as HTMLInputElement).checked; updateConfig((c) => { c.prefetch.enabled = on; }); }} />
        <span>{compact ? 'Prefetch' : 'Enabled'}</span>
      </label>
      <label class={compact ? 'inline-field' : 'field'}>
        <span class={compact ? 'visually-hidden' : ''}>Prefetcher kind</span>
        <select value={pf.kind} disabled={!pf.enabled}
          onChange={(e) => { const k = (e.currentTarget as HTMLSelectElement).value as 'next-line' | 'stride'; updateConfig((c) => { c.prefetch.kind = k; }); }}>
          <option value="next-line">Next line</option>
          <option value="stride">Stride</option>
        </select>
      </label>
    </div>
  );
}

function LevelEditor({ k, level }: { k: LevelKey; level: LevelConfig }) {
  const sets = level.sizeBytes / (level.lineBytes * level.ways);
  const setsText = Number.isInteger(sets) ? `${sets.toLocaleString()} sets` : 'not a whole number of sets';
  const set = (edit: (l: LevelConfig) => void) => updateConfig((c) => { const l = c[k]; if (l) edit(l); });
  const id = `lvl-${k}`;
  // The engine rejects a level past these limits, so the inputs stop there.
  const maxKiB = (LIMITS.maxLinesPerLevel * level.lineBytes) / 1024;
  return (
    <fieldset class="fieldset level" aria-labelledby={`${id}-legend`}>
      <legend id={`${id}-legend`}>
        {level.name} <span class="muted small">({level.scope === 'core' ? 'one per core' : 'shared by all cores'}; {formatBytes(level.sizeBytes)}, {setsText})</span>
      </legend>
      <div class="field-grid">
        <label class="field">
          <span>Size (KiB)</span>
          <input type="number" min={1} max={maxKiB} step={1} value={level.sizeBytes / 1024}
            onChange={(e) => { const v = num(e); if (v !== null && v > 0) set((l) => { l.sizeBytes = Math.round(Math.min(v, maxKiB) * 1024); }); }} />
        </label>
        <label class="field">
          <span>Ways</span>
          <input type="number" min={1} max={LIMITS.maxWays} step={1} value={level.ways}
            onChange={(e) => { const v = num(e); if (v !== null && v >= 1) set((l) => { l.ways = Math.min(Math.round(v), LIMITS.maxWays); }); }} />
        </label>
        <label class="field">
          <span>Latency (cycles)</span>
          <input type="number" min={1} max={2000} step={1} value={level.latency}
            onChange={(e) => { const v = num(e); if (v !== null && v >= 1) set((l) => { l.latency = Math.round(v); }); }} />
        </label>
        <label class="field">
          <span>Replacement</span>
          <select value={level.policy}
            onChange={(e) => { const p = (e.currentTarget as HTMLSelectElement).value as ReplacementPolicy; set((l) => { l.policy = p; }); }}>
            <option value="lru">LRU</option>
            <option value="plru">Pseudo-LRU (tree)</option>
            <option value="random">Random</option>
          </select>
        </label>
        {level.scope === 'shared' && (
          <label class="field">
            <span>Inclusion</span>
            <select value={level.inclusion ?? 'inclusive'}
              onChange={(e) => { const v = (e.currentTarget as HTMLSelectElement).value as NonNullable<LevelConfig['inclusion']>; set((l) => { l.inclusion = v; }); }}>
              <option value="inclusive">Inclusive</option>
              <option value="non-inclusive">Non-inclusive</option>
              <option value="victim">Victim (exclusive)</option>
            </select>
          </label>
        )}
      </div>
    </fieldset>
  );
}

/** A source line with its VERIFIED / APPROXIMATE label and clickable URLs. */
function SourceLine({ text }: { text: string }) {
  // Some lines mix both (an approximate figure with one verified detail): the first label leads.
  const iv = text.indexOf('VERIFIED');
  const ia = text.indexOf('APPROXIMATE');
  const label = iv < 0 && ia < 0 ? null : ia < 0 || (iv >= 0 && iv < ia) ? 'VERIFIED' : 'APPROXIMATE';
  const parts = text.split(/(https?:\/\/[^\s)]+)/g);
  return (
    <>
      {label && <span class={`badge badge-${label.toLowerCase()}`}>{label}</span>}{' '}
      {parts.map((p, i) => (/^https?:\/\//.test(p)
        ? <a key={i} href={p.replace(/[.,;]$/, '')} target="_blank" rel="noreferrer noopener">{p.replace(/^https?:\/\//, '').replace(/[.,;]$/, '')}</a>
        : <span key={i}>{p}</span>))}
    </>
  );
}
