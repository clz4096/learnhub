/** The access just played: where it was served from and every event it caused. */
import { EventKind, type SimEvent } from '@/engine/types';
import { hex } from '@/engine';
import { Flash } from '@/ui/mirror';
import { FLASH_STYLE } from '@/ui/palette';
import { cacheTitle } from '@/ui/center/Grid2D';
import { caches, current, selection } from '@/ui/state';
import { Term } from '@/ui/Term';

const FLASH_OF: Record<number, Flash> = {
  [EventKind.Hit]: Flash.Hit, [EventKind.Fill]: Flash.Miss, [EventKind.Evict]: Flash.Evict,
  [EventKind.Invalidate]: Flash.Invalidate, [EventKind.Prefetch]: Flash.Prefetch,
  [EventKind.StateChange]: Flash.State, [EventKind.Writeback]: Flash.Writeback,
};
const MESI = ['I', 'S', 'E', 'M'];
const KIND = { R: 'read', W: 'write', I: 'instruction fetch' } as const;

export function describeEvent(ev: SimEvent, level: string): string {
  const where = `set ${ev.set}, way ${ev.way}`;
  const st = ev.state !== undefined ? ` (now ${MESI[ev.state] ?? ev.state})` : '';
  switch (ev.kind) {
    case EventKind.Hit: return `${level} hit at ${where}${st}`;
    case EventKind.Fill: return `${level} miss${ev.miss ? ` (${ev.miss})` : ''}: line ${ev.line} filled into ${where}${st}`;
    case EventKind.Evict: return `${level} evicted line ${ev.line} from ${where}`;
    case EventKind.Invalidate: return `${level} invalidated line ${ev.line} at ${where}`;
    case EventKind.Prefetch: return `${level} prefetched line ${ev.line} into ${where}`;
    case EventKind.Writeback: return `${level} took a write-back of line ${ev.line} at ${where} (now dirty)`;
    case EventKind.StateChange: return `${level} line ${ev.line} state change at ${where}${st}`;
    default: return `${level} event at ${where}`;
  }
}

export function CurrentAccess() {
  const a = current.value;
  const infos = caches.value;
  if (!a) {
    return (
      <section class="panel current-access" aria-labelledby="cur-title">
        <h2 id="cur-title">Current access</h2>
        <p class="small muted">
          Press ▶ Play or Step › in the bottom bar (or the → key) to run the first access. An access is one memory read or write by the
          program; this panel shows which cache answered it and what changed.
        </p>
      </section>
    );
  }
  return (
    <section class="panel current-access" aria-labelledby="cur-title" aria-live="polite">
      <h2 id="cur-title">Current access</h2>
      <button type="button" class="linklike access-line" onClick={() => { selection.value = { type: 'access', accessIndex: a.index }; }}>
        <span class="mono">#{a.index}</span> core {a.core} {KIND[a.kind]} <span class="mono">{hex(a.addr)}</span>
        {' → '}served by <strong>{a.servedBy === 'peer' ? 'another core (peer transfer)' : a.servedBy}</strong> in <strong>{a.cycles}</strong> cycles
      </button>
      <ol class="event-list small">
        {a.events.map((ev, i) => {
          const f = FLASH_STYLE[FLASH_OF[ev.kind] ?? Flash.State]!;
          const info = infos[ev.cache];
          const level = info ? cacheTitle(info) : `cache ${ev.cache}`;
          return (
            <li key={i}>
              <button type="button" class="linklike event-item"
                onClick={() => { selection.value = { type: 'event', accessIndex: a.index, eventIndex: i, cacheId: ev.cache, set: ev.set, way: ev.way }; }}>
                <span class="event-glyph" style={{ background: f.color }} aria-label={f.label}>{f.glyph}</span>
                {describeEvent(ev, level)}
              </button>
            </li>
          );
        })}
      </ol>
      <p class="small muted">✓ <Term id="hit">hit</Term>: the data was there. ✕ <Term id="miss">miss</Term>: it was not, so a copy was filled in. In Explain mode, click any line here for the full reason.</p>
      {a.events.some((e) => e.miss === 'coherence') && (
        <p class="small">A <Term id="coherence-miss">coherence miss</Term>: another core's write took this line away. If the cores touch different bytes of one line, that is <Term id="false-sharing">false sharing</Term>.</p>
      )}
    </section>
  );
}
