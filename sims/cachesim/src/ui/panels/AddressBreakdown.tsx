/** The current address split into tag | set index | offset for L1, L2, and L3. */
import { bits, breakdown, hex } from '@/engine';
import type { CacheInfo } from '@/engine/types';
import { caches, current, selection } from '@/ui/state';
import { Term } from '@/ui/Term';

/** Address width shown in binary: at least 32 bits, rounded up to a nibble. */
export function addrWidth(addr: number): number {
  const need = addr > 0 ? Math.floor(Math.log2(addr)) + 1 : 1;
  return Math.max(32, Math.ceil(need / 4) * 4);
}

/** The caches an access by `core` of kind `kind` passes through, nearest first. */
export function pathCaches(infos: readonly CacheInfo[], core: number, kind: 'R' | 'W' | 'I'): CacheInfo[] {
  const priv = infos.filter((c) => c.core === core);
  const l1 = priv.find((c) => c.level === (kind === 'I' ? 'L1i' : 'L1d')) ?? priv.find((c) => c.level === 'L1d');
  const rest = priv.filter((c) => c !== l1 && !c.level.startsWith('L1'));
  return [...(l1 ? [l1] : []), ...rest, ...infos.filter((c) => c.core < 0)];
}

export function AddressBreakdown() {
  const a = current.value;
  if (!a) return null;
  const width = addrWidth(a.addr);
  const path = pathCaches(caches.value, a.core, a.kind);
  return (
    <section class="panel breakdown" aria-labelledby="bd-title">
      <h2 id="bd-title">Address breakdown</h2>
      <p class="mono small">{hex(a.addr)} = {a.addr.toLocaleString()}</p>
      {path.map((c) => <LevelRow key={c.id} info={c} addr={a.addr} width={width} events={a.events} />)}
      <p class="small muted">
        How each cache reads this <Term id="address">address</Term>. <Term id="offset">Offset</Term>: which byte inside
        the <Term id="cache-line">cache line</Term> (the 64 B block that moves as one unit). <Term id="set-index">Set index</Term>: which
        {' '}<Term id="set">set</Term> the line must go in. <Term id="tag">Tag</Term>: the rest, stored with the line to tell apart lines
        that share a set. Addresses are treated as physical (no <Term id="tlb">TLB</Term> is modeled).
      </p>
    </section>
  );
}

function LevelRow({ info, addr, width, events }: { info: CacheInfo; addr: number; width: number; events: { cache: number; set: number; way: number; line: number; kind: number }[] }) {
  const b = breakdown(addr, info.lineBytes, info.sets);
  const ev = events.find((e) => e.cache === info.id && e.line === b.line);
  const landed = ev ? `set ${ev.set}, way ${ev.way}` : `set ${b.set} (this access did not reach this cache)`;
  const title = info.core >= 0 ? `${info.level} (core ${info.core})` : `${info.level} (shared)`;
  const pick = () => { selection.value = { type: 'set', cacheId: info.id, set: b.set }; };
  if (!b.bitFields) {
    return (
      <div class="bd-level">
        <div class="bd-head"><strong>{title}</strong> <button type="button" class="linklike small" onClick={pick}>{landed}</button></div>
        <p class="small">
          set = line mod {info.sets.toLocaleString()} ({info.sets.toLocaleString()} is not a power of two), so the index is not a bit field.
          line = {b.line.toLocaleString()}, set = {b.set.toLocaleString()}, tag = {b.tag.toLocaleString()}, offset = {b.offset}.
        </p>
        <div class="bits mono" aria-label="offset bits">
          <span class="bits-rest">{bits(Math.floor(addr / info.lineBytes), width - b.offsetBits)}</span>
          <span class="bits-offset">{bits(b.offset, b.offsetBits)}</span>
        </div>
      </div>
    );
  }
  const idx = b.indexBits ?? 0;
  const tagBits = Math.max(0, width - idx - b.offsetBits);
  return (
    <div class="bd-level">
      <div class="bd-head"><strong>{title}</strong> <button type="button" class="linklike small" onClick={pick}>{landed}</button></div>
      <div class="bits mono" role="group" aria-label={`tag ${b.tag}, set ${b.set}, offset ${b.offset}`}>
        <span class="bits-tag" title={`tag = ${b.tag}`}>{bits(b.tag, tagBits)}</span>
        {idx > 0 && <span class="bits-index" title={`set = ${b.set}`}>{bits(b.set, idx)}</span>}
        <span class="bits-offset" title={`offset = ${b.offset}`}>{bits(b.offset, b.offsetBits)}</span>
      </div>
      <div class="bits-legend small">
        <span class="bits-tag">tag ({tagBits} b) = {b.tag.toLocaleString()}</span>
        <span class="bits-index">set ({idx} b) = {b.set}</span>
        <span class="bits-offset">offset ({b.offsetBits} b) = {b.offset}</span>
      </div>
    </div>
  );
}
