/**
 * Explain mode: a plain-English "why" for whatever the user selected (a cache, set,
 * slot, access, event, or term). The text comes from the pure functions in explain.ts.
 * Provenance (who filled a slot, reuse distance, who invalidated a line) comes from a
 * main-thread replay of the trace. It runs only while paused, and past
 * AUTO_REPLAY_LIMIT accesses only when the user asks.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { effect } from '@preact/signals';
import type { Access, CacheInfo, HierarchyConfig } from '@/engine';
import type { Workload } from '@/workloads';
import {
  caches, config, current, layout, mirrors, params, playing, selection, stats, workload, workloadId,
  type Selection,
} from '@/ui/state';
import { Term, TermText, openTerm, type TermId } from '@/ui/Term';
import { glossaryEntry } from '@/ui/modes/glossary';
import {
  explainAccess, explainCache, explainEvent, explainSet, explainSlot,
  type AccessView, type Explanation, type SlotContent, type SlotProvenance,
} from '@/ui/modes/explain';
import { AUTO_REPLAY_LIMIT, MAX_REPLAY, accessAt, predictVictim, replay, type ReplayResult, type VictimPrediction } from '@/ui/modes/replay';
import '@/ui/modes/modes.css';

const fmt = (v: number) => v.toLocaleString('en-US');

/*
 * One cached replay: selections and re-renders while paused reuse it. It is keyed on the
 * workload object (a custom trace is a new object per edit), and dropped as soon as the
 * run changes, so a stale replay never pins its simulator in memory.
 */
interface Cached {
  key: string;
  wl: Workload;
  result: ReplayResult;
  /** Fill sources looked up so far, by access index. */
  fills: Map<number, Access | null>;
}
let cached: Cached | null = null;
effect(() => {
  void config.value; void workload.value; void params.value;
  cached = null;
});

function replayKey(upto: number, focus: number | undefined): string {
  return JSON.stringify([config.value, workloadId.value, params.value, upto, focus ?? null]);
}

function traceCtx(cfg: HierarchyConfig) {
  return { lineBytes: cfg.l1d.lineBytes, cores: cfg.cores, seed: cfg.seed };
}

function runReplay(upto: number, focus: number | undefined): ReplayResult {
  const key = replayKey(upto, focus);
  const wl = workload.value;
  if (cached?.key === key && cached.wl === wl) return cached.result;
  const cfg = config.value;
  const result = replay(cfg, wl.trace(params.value, traceCtx(cfg)), upto, focus);
  cached = { key, wl, result, fills: new Map() };
  return result;
}

/** The access at `index` of the replayed run, read from the trace on demand. */
function fillAccess(r: ReplayResult, index: number): Access | undefined {
  if (index < 0) return undefined;
  if (r.outcome?.index === index) return r.outcome.access;
  const memo = cached?.result === r ? cached.fills : null;
  let a = memo?.get(index);
  if (a === undefined) {
    const cfg = config.value;
    a = accessAt(workload.value.trace(params.value, traceCtx(cfg)), index);
    memo?.set(index, a);
  }
  return a ?? undefined;
}

type Gate =
  | { kind: 'ok'; r: ReplayResult }
  | { kind: 'playing' }
  | { kind: 'ask'; n: number; key: string }
  | { kind: 'too-long' }
  | { kind: 'none' };

/** Replay up to `upto` if allowed now; otherwise say why not. */
function gate(upto: number, focus: number | undefined, allowed: string | null): Gate {
  if (upto < 0) return { kind: 'none' };
  if (playing.value) return { kind: 'playing' };
  const n = upto + 1;
  if (n > MAX_REPLAY) return { kind: 'too-long' };
  // Permission is per run and index; the focus line is derived from them.
  const key = replayKey(upto, undefined);
  if (n > AUTO_REPLAY_LIMIT && allowed !== key) return { kind: 'ask', n, key };
  try {
    return { kind: 'ok', r: runReplay(upto, focus) };
  } catch {
    return { kind: 'none' };
  }
}

interface Built {
  e: Explanation | null;
  note?: string;
  ask?: { n: number; key: string };
}

/** What to tell the user when provenance is not available yet. */
function gated(g: Gate, what: string): Omit<Built, 'e'> {
  switch (g.kind) {
    case 'playing': return { note: `Pause to see ${what}.` };
    case 'too-long': return { note: `The run is past ${fmt(MAX_REPLAY)} accesses, too long to replay here for ${what}.` };
    case 'ask': return { note: `To show ${what}, the panel replays ${fmt(g.n)} accesses here. That can take a few seconds.`, ask: { n: g.n, key: g.key } };
    default: return {};
  }
}

function slotContent(info: CacheInfo, set: number, way: number, r?: ReplayResult): SlotContent {
  const slot = set * info.ways + way;
  if (r) {
    const c = r.sim.caches[info.id]!;
    return { line: c.lines[slot]!, state: c.state[slot]! };
  }
  const m = mirrors.value[info.id];
  return m ? { line: m.lines[slot]!, state: m.state[slot]! } : { line: -1, state: 0 };
}

function viewOf(r: ReplayResult): AccessView | null {
  const o = r.outcome;
  return o ? { index: o.index, addr: o.access.addr, core: o.access.core, kind: o.access.kind, servedBy: o.servedBy, cycles: o.cycles, events: o.events } : null;
}

function build(sel: NonNullable<Selection>, allowed: string | null): Built {
  const infos = caches.value;
  const cfg = config.value;
  const cur = current.value;
  switch (sel.type) {
    case 'term': {
      const g = sel.term ? glossaryEntry(sel.term) : undefined;
      return { e: g ? { title: g.term, paras: [g.definition, ...(g.analogy ? [`Think of it as: ${g.analogy}`] : []), `Example: ${g.example}`], terms: [] } : null };
    }
    case 'cache': {
      const info = infos[sel.cacheId ?? -1];
      if (!info) return { e: null };
      const st = stats.value;
      const s = st ? { instance: st.caches[info.id], level: st.levels[info.level], instances: infos.filter((c) => c.level === info.level).length } : undefined;
      return { e: explainCache(info, cfg, s) };
    }
    case 'set':
    case 'slot': {
      const info = infos[sel.cacheId ?? -1];
      if (!info || sel.set === undefined || sel.set >= info.sets) return { e: null };
      const g: Gate = cur ? gate(cur.index, undefined, allowed) : { kind: 'none' };
      const r = g.kind === 'ok' ? g.r : undefined;
      if (sel.type === 'set') {
        return { e: explainSet(info, sel.set, Array.from({ length: info.ways }, (_, w) => slotContent(info, sel.set!, w, r))) };
      }
      if (sel.way === undefined || sel.way >= info.ways) return { e: null };
      const c = slotContent(info, sel.set, sel.way, r);
      let prov: SlotProvenance | undefined;
      let victim: VictimPrediction | undefined;
      if (r && c.state !== 0) {
        const t = r.tracks[info.id]!;
        const slot = sel.set * info.ways + sel.way;
        const fi = t.fillIndex[slot]!;
        prov = { fillIndex: fi, fillPrefetch: t.fillPrefetch[slot] === 1, fillAccess: fillAccess(r, fi), lastUse: t.lastUse[slot]! };
        victim = predictVictim(r, info.id, sel.set, sel.way);
      }
      const more = r || c.state === 0 ? {} : gated(g, 'which access filled this line and what evicts it next');
      return { e: explainSlot(info, sel.set, sel.way, c, prov, victim), ...more };
    }
    case 'access':
    case 'event': {
      const idx = sel.accessIndex;
      if (idx === undefined) return { e: null };
      let view: AccessView | null = cur && cur.index === idx ? cur : null;
      let focus: number | undefined;
      if (view) {
        focus = Math.floor(view.addr / cfg.l1d.lineBytes);
      } else if (!playing.value && (idx < AUTO_REPLAY_LIMIT || allowed === replayKey(idx, undefined))) {
        const a: Access | null = accessAt(workload.value.trace(params.value, traceCtx(cfg)), idx);
        if (a) focus = Math.floor(a.addr / cfg.l1d.lineBytes);
      }
      const g = gate(idx, focus, allowed);
      let history;
      if (g.kind === 'ok') {
        const rv = viewOf(g.r);
        // Use the replay only if it reproduces this access (the run may have changed since).
        if (rv && (!view || rv.addr === view.addr)) {
          view = view ?? rv;
          history = g.r.history;
        }
      }
      if (!view) {
        const more = gated(g, `access #${fmt(idx)}`);
        return { e: null, note: more.note ?? `Access #${fmt(idx)} has not run yet.`, ask: more.ask };
      }
      const more = history ? {} : gated(g, 'when this line was last used and who invalidated it');
      if (sel.type === 'event') {
        const ev = view.events[sel.eventIndex ?? -1];
        return ev ? { e: explainEvent(ev, view, infos, cfg, history), ...more } : { e: null };
      }
      return { e: explainAccess(view, infos, cfg, history), ...more };
    }
  }
}

export function ExplainPanel() {
  const sel = selection.value;
  const [allowed, setAllowed] = useState<string | null>(null);
  const ref = useRef<HTMLElement>(null);
  // Read what explanations depend on, so the panel follows the run.
  void current.value; void playing.value; void stats.value; void caches.value;
  const built: Built = sel ? build(sel, allowed) : { e: null };

  // Phone: the panel sits above the tabs, so bring it into view when the selection changes.
  useEffect(() => {
    if (sel && layout.value === 'phone') ref.current?.scrollIntoView?.({ block: 'nearest' });
  }, [sel]);

  return (
    <section ref={ref} class="panel mode-panel explain" aria-labelledby="explain-title">
      <h2 id="explain-title">Explain</h2>
      {!sel && (
        <p class="small muted">
          Click anything to get a plain answer to "why is it like this?": a cache's name above its grid, a number at the left of a grid row
          (a set), a cell (one slot), the access line or an event in Current access, a row in the metrics, or an underlined term.
        </p>
      )}
      {sel && (
        <div aria-live="polite" data-testid="explain-body">
          {built.e ? <ExplanationView e={built.e} /> : !built.note && <p class="small muted">Nothing to explain for this selection now.</p>}
          {built.note && <p class="small explain-note">{built.note}</p>}
          <div class="explain-actions">
            {built.ask && (
              <button type="button" class="btn btn-small" onClick={() => setAllowed(built.ask!.key)}>
                Replay {fmt(built.ask.n)} accesses
              </button>
            )}
            {sel.type === 'term' && sel.term && glossaryEntry(sel.term) && (
              <button type="button" class="btn btn-small" onClick={() => openTerm(sel.term as TermId)}>Open in the glossary</button>
            )}
            <button type="button" class="btn btn-small" onClick={() => { selection.value = null; }}>Clear selection</button>
          </div>
        </div>
      )}
    </section>
  );
}

function ExplanationView({ e }: { e: Explanation }) {
  return (
    <div class="explain-text">
      <h3>{e.title}</h3>
      {e.paras.map((p, i) => <p key={i} class={i === 0 ? 'small explain-lead' : 'small'}><TermText text={p} /></p>)}
      {e.terms.length > 0 && (
        <p class="small term-row">
          <span class="muted">Glossary: </span>
          {e.terms.map((t, i) => {
            const g = glossaryEntry(t);
            return g ? <span key={t}>{i > 0 && ', '}<Term id={t}>{g.term}</Term></span> : null;
          })}
        </p>
      )}
    </div>
  );
}
