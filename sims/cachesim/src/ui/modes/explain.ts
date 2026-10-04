/**
 * Explain mode's plain-English "why", as pure functions of model data. No signals and
 * no DOM: ExplainPanel gathers the inputs (mirror contents, replay provenance, the
 * current access) and renders the result.
 *
 * Each explanation leads with a one-line plain answer, then the detail. Paragraphs may
 * mark glossary terms as [[id|text]] (rendered by TermText in Term.tsx).
 */
import { breakdown, hex, isPow2, log2 } from '@/engine';
import {
  EventKind, Mesi,
  type Access, type CacheInfo, type HierarchyConfig, type LevelConfig, type LevelStats, type MissKind, type SimEvent, type Source,
} from '@/engine/types';
import type { TermId } from '@/ui/Term';
import type { LineHistory, VictimPrediction } from '@/ui/modes/replay';

export interface Explanation {
  title: string;
  /** paras[0] is the one-line plain answer; the rest is detail. */
  paras: string[];
  /** Glossary entries worth opening from here. */
  terms: TermId[];
}

const n = (v: number) => v.toLocaleString('en-US');
const pct = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(1)}%` : '0%');

export function bytes(v: number): string {
  const MiB = 1024 * 1024;
  if (v >= MiB && v % MiB === 0) return `${v / MiB} MiB`;
  if (v >= 1024 && v % 1024 === 0) return `${v / 1024} KiB`;
  return `${v} B`;
}

export function cacheName(info: CacheInfo): string {
  return info.core >= 0 ? `${info.level} of core ${info.core}` : `the shared ${info.level}`;
}

/** The LevelConfig a cache instance was built from (matched by name). */
export function levelConfig(cfg: HierarchyConfig, info: CacheInfo): LevelConfig | undefined {
  return [cfg.l1d, cfg.l1i, cfg.l2, cfg.l3].find((l) => l?.name === info.level);
}

const POLICY: Record<string, string> = {
  lru: 'LRU: a miss into a full set evicts the way used longest ago.',
  plru: 'tree pseudo-LRU: a few bits per set point toward a way not used recently; it is cheap and close to LRU, but not exact.',
  random: 'random: a miss into a full set evicts a way chosen at random (seeded, so runs repeat).',
};

const INCLUSION: Record<string, string> = {
  inclusive: 'Inclusive: every line in a private cache is also here, so evicting a line here removes it from every core (a back-invalidation).',
  'non-inclusive': 'Non-inclusive: filled on every miss, but evicting a line here leaves the private copies alone.',
  victim: 'Victim cache: filled only with lines the private caches evict, so it holds what just fell out of L2.',
};

/* ───────────────────────── cache ───────────────────────── */

/** One plain line: where this cache sits in the search order, and its size and speed. */
function cacheLead(info: CacheInfo, cfg: HierarchyConfig): string {
  const what = info.level === 'L1i' ? 'instructions' : 'data';
  const facts = `${bytes(info.sizeBytes)}, ${info.latency} cycles per hit`;
  if (info.level.startsWith('L1')) {
    return `This is the first [[cache|cache]] core ${info.core} checks for ${what}: the smallest and fastest (${facts}).`;
  }
  if (info.core >= 0) {
    return `Core ${info.core} checks this [[cache|cache]] when its L1 misses: bigger and slower than L1 (${facts}).`;
  }
  const last = !cfg.l3 || cfg.l3.name === info.level;
  return `All ${cfg.cores} core${cfg.cores === 1 ? '' : 's'} check this shared [[cache|cache]] after their own caches miss${last ? '; it is the last stop before [[dram|DRAM]]' : ''} (${facts}).`;
}

export function explainCache(info: CacheInfo, cfg: HierarchyConfig, s?: { instance?: LevelStats; level?: LevelStats; instances: number }): Explanation {
  const lc = levelConfig(cfg, info);
  const policy = lc?.policy ?? info.policy;
  const effective = policy === 'plru' && (!isPow2(info.ways) || info.ways < 2) ? 'lru' : policy;
  const paras: string[] = [cacheLead(info, cfg)];
  const full = info.sets === 1;
  paras.push(`Shape: ${bytes(info.sizeBytes)} of ${info.lineBytes} B [[cache-line|lines]], ${info.ways} [[way|ways]] (slots) per [[set|set]], so ${n(info.sizeBytes)} / (${info.lineBytes} × ${info.ways}) = ${n(info.sets)} set${info.sets === 1 ? '' : 's'}, ${n(info.sets * info.ways)} lines in all.${full ? ' One set holds every line, so it is fully associative.' : ''}`);
  const ob = log2(info.lineBytes);
  if (isPow2(info.sets)) {
    const ib = log2(info.sets);
    paras.push(ib > 0
      ? `An address picks its set with set = (address / ${info.lineBytes}) mod ${n(info.sets)}. That is bits ${ob} to ${ob + ib - 1} of the address. Bits 0 to ${ob - 1} are the offset in the line, and the bits above ${ob + ib - 1} are the tag.`
      : `Bits 0 to ${ob - 1} are the offset in the line; every other bit is the tag, since there is only one set.`);
  } else {
    paras.push(`An address picks its set with set = (address / ${info.lineBytes}) mod ${n(info.sets)}. ${n(info.sets)} is not a power of two, so the set is a remainder, not a bit field. Real CPUs with such caches hash the address across slices instead.`);
  }
  paras.push(`Replacement is ${POLICY[effective]}${effective !== policy ? ' (Pseudo-LRU needs a power-of-two way count, so this cache falls back to LRU.)' : ''}`);
  paras.push(`A hit here costs ${info.latency} cycles.`);
  if (info.core >= 0) {
    paras.push(info.level.startsWith('L1')
      ? `Private to core ${info.core}. Its lines carry a MESI state shared with the core's other private caches.`
      : `Private to core ${info.core}, and inclusive of its L1: evicting a line here also removes it from L1.`);
  } else {
    paras.push(`Shared by all ${cfg.cores} core${cfg.cores === 1 ? '' : 's'}. ${INCLUSION[lc?.inclusion ?? 'inclusive']}`);
  }
  const st = s?.instance;
  if (st && st.accesses > 0) {
    paras.push(`So far: ${n(st.accesses)} lookups, ${n(st.hits)} hits (${pct(st.hits, st.accesses)}), ${n(st.misses)} misses: ${n(st.compulsory)} compulsory, ${n(st.capacity)} capacity, ${n(st.conflict)} conflict, ${n(st.coherence)} coherence.`);
    paras.push(`It evicted ${n(st.evictions)} line${st.evictions === 1 ? '' : 's'} and lost ${n(st.invalidations)} to invalidations. The accesses it served cost ${n(st.servedCycles)} cycles in all.`);
  } else if (st) {
    paras.push('No lookups have reached this cache yet.');
  }
  if (s?.level && s.instances > 1 && s.level.accesses > 0) {
    paras.push(`All ${s.instances} ${info.level} caches together: ${n(s.level.misses)} misses of ${n(s.level.accesses)} lookups, ${n(s.level.evictions)} evictions, ${n(s.level.invalidations)} invalidations, and ${n(s.level.servedCycles)} cycles served.`);
  }
  const terms: TermId[] = ['set', 'way', 'associativity', 'set-index', effective === 'plru' ? 'pseudo-lru' : effective === 'random' ? 'random-replacement' : 'lru'];
  if (info.core < 0) terms.push(lc?.inclusion === 'victim' ? 'victim-cache' : lc?.inclusion === 'non-inclusive' ? 'non-inclusive' : 'inclusive');
  return { title: `${info.level}${info.core >= 0 ? `, core ${info.core}` : ', shared'}`, paras, terms };
}

/* ───────────────────────── set ───────────────────────── */

export interface SlotContent { line: number; state: number }

export function stateName(st: number, shared: boolean): string {
  if (st === 0) return 'empty';
  if (shared) return st === 3 ? 'dirty' : 'clean';
  return ['I', 'S', 'E', 'M'][st] ?? String(st);
}

export function explainSet(info: CacheInfo, set: number, contents: readonly SlotContent[]): Explanation {
  const span = info.sets * info.lineBytes;
  const paras: string[] = [`A [[set|set]] is the one shelf a line may go on. Every line that maps to set ${n(set)} must share its ${info.ways} slot${info.ways === 1 ? '' : 's'}.`];
  paras.push(`Set ${n(set)} of ${cacheName(info)} takes every line whose line number mod ${n(info.sets)} is ${n(set)}. Addresses ${bytes(span)} apart land here together${info.sets > 1 ? `, for example ${hex(set * info.lineBytes)} and ${hex(set * info.lineBytes + span)}` : ''}.`);
  paras.push(`It has ${info.ways} way${info.ways === 1 ? '' : 's'}, so at most ${info.ways} such line${info.ways === 1 ? '' : 's'} can stay at once; one more evicts one of them.`);
  const shared = info.core < 0;
  const held = contents.map((c, w) => {
    if (c.state === 0 || c.line < 0) return `way ${w}: empty`;
    const tag = Math.floor(c.line / info.sets);
    return `way ${w}: line ${n(c.line)} (tag ${n(tag)}, ${hex(c.line * info.lineBytes)}), ${stateName(c.state, shared)}`;
  });
  const used = contents.filter((c) => c.state !== 0 && c.line >= 0).length;
  paras.push(`Now ${used} of ${info.ways} ways hold a line. ${held.join('; ')}.`);
  return { title: `Set ${n(set)}, ${cacheName(info)}`, paras, terms: ['set', 'way', 'tag', 'conflict-miss'] };
}

/* ───────────────────────── slot ───────────────────────── */

const MESI_MEANING: Record<number, string> = {
  [Mesi.M]: 'M (Modified): this core has the only copy and has written it, so memory is stale. Evicting it writes it back; another core asking for it gets it from here.',
  [Mesi.E]: 'E (Exclusive): this core has the only copy and it matches memory. A write turns it into M without telling anyone.',
  [Mesi.S]: 'S (Shared): other cores may hold copies too. Before this core can write it, every other copy must be invalidated.',
};

export interface SlotProvenance {
  fillIndex: number;
  fillPrefetch: boolean;
  /** The access that caused the fill, when known. */
  fillAccess?: Access;
  lastUse: number;
}

const KIND_VERB = { R: 'read', W: 'write', I: 'instruction fetch' } as const;

export function describeAccess(a: Access): string {
  return `core ${a.core} ${KIND_VERB[a.kind]} of ${hex(a.addr)}`;
}

export function explainVictim(v: VictimPrediction, set: number): string {
  if (v.policy === 'random') {
    return v.empty > 0
      ? `Set ${n(set)} still has ${v.empty} empty way${v.empty === 1 ? '' : 's'}, filled first. After that, each miss into the set evicts a random way: a 1 in ${v.ways} chance for this one.`
      : `Each miss into set ${n(set)} evicts a random way: a 1 in ${v.ways} chance for this one.`;
  }
  if (v.policy === 'plru') {
    if (v.empty > 0) return `Set ${n(set)} still has ${v.empty} empty way${v.empty === 1 ? '' : 's'}, filled before anything is evicted. Then the pseudo-LRU tree decides.`;
    return v.plruWay === v.way
      ? `The pseudo-LRU tree points at this way now, so the next miss into set ${n(set)} evicts it, unless a hit in the set flips the tree first.`
      : `The pseudo-LRU tree points at way ${v.plruWay} now, so the next miss into set ${n(set)} evicts that way, not this one. Each hit in the set flips the tree.`;
  }
  const k = v.empty + v.older + 1;
  if (k === 1) return `This is the least recently used line in set ${n(set)}, so the next miss into the set evicts it.`;
  return `Under LRU, ${k} more misses into set ${n(set)} evict it, if nothing touches it first: ${v.empty ? `${v.empty} empty way${v.empty === 1 ? ' fills' : 's fill'} first, then ` : ''}${v.older ? `${v.older} older line${v.older === 1 ? '' : 's'} go${v.older === 1 ? 'es' : ''} before it` : 'it goes next'}.`;
}

export function explainSlot(info: CacheInfo, set: number, way: number, c: SlotContent, prov?: SlotProvenance, victim?: VictimPrediction): Explanation {
  const title = `Set ${n(set)}, way ${way}, ${cacheName(info)}`;
  if (c.state === 0 || c.line < 0) {
    return {
      title,
      paras: ['This slot is empty: it holds no data yet.', `The next line that maps to set ${n(set)} fills an empty way before anything is evicted.`],
      terms: ['set', 'way'],
    };
  }
  const shared = info.core < 0;
  const b = breakdown(c.line * info.lineBytes, info.lineBytes, info.sets);
  const paras: string[] = [`This slot holds a copy of one [[cache-line|cache line]]: ${info.lineBytes} bytes of memory that move together.`];
  paras.push(`Holds line ${n(c.line)}: bytes ${hex(c.line * info.lineBytes)} to ${hex(c.line * info.lineBytes + info.lineBytes - 1)}. Tag ${n(b.tag)}, set ${n(b.set)}.`);
  if (shared) {
    paras.push(c.state === 3
      ? 'State: dirty. A core wrote this line and its data came back here, so DRAM is stale. Evicting it writes it back to memory.'
      : 'State: clean. It matches memory, so evicting it costs nothing extra.');
  } else {
    paras.push(`State: ${MESI_MEANING[c.state] ?? stateName(c.state, false)}`);
  }
  if (prov && prov.fillIndex >= 0) {
    const who = prov.fillAccess ? describeAccess(prov.fillAccess) : 'an earlier access';
    paras.push(prov.fillPrefetch
      ? `It arrived by prefetch: access #${n(prov.fillIndex)} (${who}) made the prefetcher fetch it before anyone asked.`
      : `Access #${n(prov.fillIndex)} (${who}) missed here and filled it.`);
    if (prov.lastUse > prov.fillIndex) paras.push(`Last used by access #${n(prov.lastUse)}.`);
  }
  if (victim) paras.push(explainVictim(victim, set));
  if (!shared) paras.push('It can also leave early: another core\'s write invalidates it, and an eviction from an inclusive outer level removes it too.');
  const terms: TermId[] = shared ? ['write-back', 'inclusive'] : ['mesi', c.state === 3 ? 'mesi-modified' : c.state === 2 ? 'mesi-exclusive' : 'mesi-shared'];
  terms.push(victim?.policy === 'plru' ? 'pseudo-lru' : victim?.policy === 'random' ? 'random-replacement' : 'lru');
  return { title, paras, terms };
}

/* ───────────────────────── access ───────────────────────── */

export interface AccessView {
  index: number;
  addr: number;
  core: number;
  kind: Access['kind'];
  servedBy: Source;
  cycles: number;
  events: readonly SimEvent[];
}

/** The caches an access by `core` of `kind` looks in, nearest first. */
export function lookupPath(infos: readonly CacheInfo[], core: number, kind: Access['kind']): CacheInfo[] {
  const priv = infos.filter((c) => c.core === core);
  const l1 = priv.find((c) => c.level === (kind === 'I' ? 'L1i' : 'L1d')) ?? priv.find((c) => c.level === 'L1d');
  const rest = priv.filter((c) => c !== l1 && !c.level.startsWith('L1'));
  return [...(l1 ? [l1] : []), ...rest, ...infos.filter((c) => c.core < 0)];
}

export function explainMiss(info: CacheInfo, kind: MissKind, line: number, h?: LineHistory): string {
  const cap = info.sets * info.ways;
  const name = info.level;
  switch (kind) {
    case 'compulsory':
      return `${name}: compulsory miss. This cache had never held line ${n(line)}, so no cache of any size or shape could have hit. Only a prefetch could hide it.`;
    case 'coherence':
      return h?.invalidated
        ? `${name}: coherence miss. Core ${h.invalidated.core} wrote this line at access #${n(h.invalidated.index)}, which invalidated this core's copy. Without that write it would have hit.`
        : `${name}: coherence miss. Another core's write invalidated this core's copy of the line since it was last used.`;
    case 'capacity':
      if (h && h.lastUse < 0) {
        // Only a prefetch brought the line here before, and it left unused.
        return `${name}: capacity miss. No access had used line ${n(line)} here before. A prefetch at access #${n(h.prefetched)} brought it in, but it was evicted before any access used it. The model counts a line it has seen but cannot find as a capacity miss.`;
      }
      return h
        ? `${name}: capacity miss. Line ${n(line)} was last used at access #${n(h.lastUse)}. Since then ${name} was asked for ${n(h.distinct)} other distinct lines, at least its ${n(cap)}-line capacity, so even a fully associative cache this size would have evicted it.`
        : `${name}: capacity miss. More distinct lines came through since this line was last here than ${name} can hold (${n(cap)} lines).`;
    case 'conflict':
      if (h && h.lastUse >= 0 && h.evicted && h.evicted.by === null && h.evicted.index >= h.lastUse) {
        // No fill in this cache replaced it: an outer inclusive level evicted it and took this copy along.
        return `${name}: conflict miss. Line ${n(line)} was last used at access #${n(h.lastUse)}. ${name} did not evict it to make room. At access #${n(h.evicted.index)} an inclusive outer level evicted the line, and that removed this copy too (a back-invalidation). A fully associative ${name} would still hold it, so the model counts the miss as conflict.`;
      }
      return h && h.lastUse >= 0
        ? `${name}: conflict miss. Line ${n(line)} was last used at access #${n(h.lastUse)}. Since then ${name} saw only ${n(h.distinct)} other distinct lines, fewer than its ${n(cap)} lines, but ${n(h.distinctSameSet)} of them map to set ${n(line % info.sets)}, which has ${info.ways} way${info.ways === 1 ? '' : 's'}. A fully associative cache would have kept it.`
        : `${name}: conflict miss. Too many recent lines map to set ${n(line % info.sets)} (${info.ways} ways), though the cache as a whole had room.`;
  }
}

/** The shared level nearest the cores; a peer transfer is charged its latency. */
function nearestShared(cfg: HierarchyConfig): LevelConfig {
  if (cfg.l2.scope === 'shared') return cfg.l2;
  return cfg.l3 ?? cfg.l2;
}

function isVictimLevel(info: CacheInfo | undefined, cfg: HierarchyConfig): boolean {
  return !!info && info.core < 0 && levelConfig(cfg, info)?.inclusion === 'victim';
}

const SERVED: Record<Source, string> = {
  L1: 'L1', L2: 'L2', L3: 'the last-level cache', DRAM: 'DRAM', peer: 'another core\'s cache',
};

/** One plain line: where the data came from and what it cost. */
function accessLead(a: AccessView, infos: readonly CacheInfo[], cfg: HierarchyConfig): string {
  const cost = `${a.cycles} cycle${a.cycles === 1 ? '' : 's'}`;
  const near = lookupPath(infos, a.core, a.kind)[0]?.level ?? 'L1';
  switch (a.servedBy) {
    case 'L1':
      return a.cycles > cfg.l1d.latency
        ? `A [[hit|hit]] in ${near}, the nearest cache, but other cores' copies had to be thrown away before this write, so it cost ${cost}.`
        : `A [[hit|hit]]: core ${a.core} found the data in ${near}, its nearest cache, so it cost only ${cost}.`;
    case 'L2':
    case 'L3':
      return `${near} did not have the data, so core ${a.core} found it farther out, in ${a.servedBy === 'L3' ? cfg.l3?.name ?? 'L3' : cfg.l2.name}, for ${cost}.`;
    case 'DRAM':
      return `No cache had the data, so it came from [[dram|DRAM]], the main memory, for ${cost}: the slowest path.`;
    case 'peer':
      return `Another core held the line, so that core's cache sent it over directly (a [[peer-transfer|peer transfer]]) for ${cost}.`;
  }
}

export function explainAccess(a: AccessView, infos: readonly CacheInfo[], cfg: HierarchyConfig, history?: ReadonlyMap<number, LineHistory>): Explanation {
  const line = Math.floor(a.addr / cfg.l1d.lineBytes);
  const terms = new Set<TermId>(['hit', 'miss', 'amat']);
  const paras: string[] = [accessLead(a, infos, cfg)];
  paras.push(`Access #${n(a.index)}: ${describeAccess(a)}, line ${n(line)}.`);
  let stopped = false;
  for (const info of lookupPath(infos, a.core, a.kind)) {
    if (stopped) {
      paras.push(`${info.level}: not consulted; a nearer level already had the line.`);
      continue;
    }
    const ev = a.events.find((e) => e.cache === info.id && e.line === line && (e.kind === EventKind.Hit || (e.kind === EventKind.Fill && e.miss)));
    if (!ev) {
      if (a.servedBy === 'peer' && info.core < 0) {
        paras.push(`${info.level}: skipped. Another core held the line in M or E, so it came straight from that core.`);
        stopped = true;
        terms.add('mesi');
      } else {
        paras.push(`${info.level}: miss.`);
      }
      continue;
    }
    if (ev.kind === EventKind.Hit) {
      paras.push(`${info.level}: hit. The line was already in set ${n(ev.set)}, way ${ev.way}.`);
      stopped = true;
      continue;
    }
    paras.push(explainMiss(info, ev.miss!, line, history?.get(info.id)));
    terms.add(`${ev.miss!}-miss` as TermId);
  }
  const served = a.servedBy;
  const lat = served === 'L1' ? cfg.l1d.latency : served === 'L2' ? cfg.l2.latency : served === 'L3' ? cfg.l3?.latency ?? 0 : served === 'DRAM' ? cfg.dramLatency : 0;
  if (served === 'peer') {
    const near = nearestShared(cfg);
    paras.push(`Served by ${SERVED.peer}: a cache-to-cache transfer costs the ${near.name} latency (${near.latency}) plus ${cfg.coherencePenalty} transfer cycles = ${a.cycles} cycles.`);
  } else if (a.cycles > lat && (served === 'L1' || served === 'L2')) {
    paras.push(`Served by ${SERVED[served]} in ${lat} cycles, plus ${a.cycles - lat} to invalidate the other cores' copies first: the line was Shared, and a write needs it Modified. ${a.cycles} cycles in all.`);
    terms.add('mesi-shared');
  } else {
    paras.push(`Served by ${SERVED[served]} in ${a.cycles} cycles. The model charges each access the latency of the level that served it.`);
  }
  const inv = a.events.filter((e) => e.kind === EventKind.Invalidate);
  const invCores = new Set(inv.map((e) => infos[e.cache]?.core).filter((c): c is number => c !== undefined && c >= 0));
  if (invCores.size) {
    paras.push(`This ${a.kind === 'W' ? 'write' : 'access'} invalidated the copies in core${invCores.size > 1 ? 's' : ''} ${[...invCores].join(', ')}.`);
    terms.add('coherence-miss');
  }
  // The last state this core's private caches report for the line is where it ended up.
  const finalState = [...a.events].reverse().find((e) => infos[e.cache]?.core === a.core && e.line === line && e.state !== undefined && e.kind !== EventKind.Evict)?.state;
  if (finalState !== undefined && finalState !== Mesi.I) {
    paras.push(`Core ${a.core} now holds the line in ${MESI_MEANING[finalState]}`);
    terms.add('mesi');
  }
  const pf = a.events.filter((e) => e.kind === EventKind.Prefetch && infos[e.cache]?.level === 'L1d');
  if (pf.length) {
    paras.push(`It also triggered a prefetch of line${pf.length > 1 ? 's' : ''} ${pf.map((e) => n(e.line)).join(', ')}.`);
    terms.add('prefetcher');
  }
  // A victim-level hit hands the line to the core: that Evict is a move, not making room.
  const moved = a.events.filter((e) => e.kind === EventKind.Evict && e.line === line && isVictimLevel(infos[e.cache], cfg));
  for (const e of moved) paras.push(`Line ${n(line)} moved from ${infos[e.cache]!.level} into core ${a.core}'s caches. A victim cache keeps no copy of a line a core holds.`);
  const ev = a.events.filter((e) => e.kind === EventKind.Evict && !moved.includes(e));
  if (ev.length) {
    paras.push(`To make room it evicted ${ev.map((e) => `line ${n(e.line)} from ${infos[e.cache]?.level ?? 'cache'}${infos[e.cache] && infos[e.cache]!.core >= 0 ? ` (core ${infos[e.cache]!.core})` : ''}`).join(', ')}.`);
    terms.add('eviction');
  }
  return { title: `Access #${n(a.index)}`, paras, terms: [...terms] };
}

/* ───────────────────────── event ───────────────────────── */

export function explainEvent(ev: SimEvent, a: AccessView, infos: readonly CacheInfo[], cfg: HierarchyConfig, history?: ReadonlyMap<number, LineHistory>): Explanation {
  const info = infos[ev.cache];
  const where = info ? `${cacheName(info)}, set ${n(ev.set)}, way ${ev.way}` : `cache ${ev.cache}`;
  const paras: string[] = [];
  const terms: TermId[] = [];
  const shared = info ? info.core < 0 : false;
  switch (ev.kind) {
    case EventKind.Hit:
      paras.push('The data was already in this cache, so the search stopped here.');
      paras.push(`Hit in ${where}: line ${n(ev.line)} was already there, so the access stopped at this level.`);
      terms.push('hit');
      break;
    case EventKind.Fill:
      if (!ev.miss && isVictimLevel(info, cfg)) {
        paras.push('A line pushed out of a core\'s own caches was caught and kept here.');
        paras.push(`Fill into ${where}: a private cache evicted line ${n(ev.line)}, and this victim cache caught it. A later miss in the private caches can find it here instead of in DRAM.`);
        terms.push('victim-cache');
        break;
      }
      paras.push('A copy of the line was brought into this cache, so the next use can hit here.');
      paras.push(`Fill into ${where}: line ${n(ev.line)} was missing and has been copied in.`);
      if (ev.miss && info) { paras.push(explainMiss(info, ev.miss, ev.line, history?.get(ev.cache))); terms.push(`${ev.miss}-miss` as TermId); }
      else paras.push('This level filled on the way back from a farther level (or from another core), not because it was asked first.');
      terms.push('write-allocate');
      break;
    case EventKind.Evict:
      if (isVictimLevel(info, cfg) && ev.line === Math.floor(a.addr / cfg.l1d.lineBytes)) {
        paras.push('The line moved out of this cache and into the core that asked for it.');
        paras.push(`Line ${n(ev.line)} moved from ${where} into core ${a.core}'s caches. This victim cache hit, and it keeps no copy of a line a core holds.`);
        terms.push('victim-cache');
        break;
      }
      paras.push('A line left this cache, like a box going back to make room on a full shelf.');
      paras.push(`Eviction from ${where}: line ${n(ev.line)} left to make room, or because an inclusive level above it evicted the line.`);
      terms.push('eviction', 'inclusive');
      break;
    case EventKind.Invalidate:
      paras.push('This core\'s copy was thrown away, because another core is about to write the line.');
      paras.push(`Invalidation in ${where}: core ${a.core}'s write needs the only copy, so this core's copy of line ${n(ev.line)} was dropped. Its next use will be a coherence miss.`);
      terms.push('mesi-invalid', 'coherence-miss');
      break;
    case EventKind.Prefetch:
      paras.push('The prefetcher copied a line in early, before the program asked for it.');
      paras.push(`Prefetch into ${where}: the prefetcher fetched line ${n(ev.line)} ahead of demand. If the program uses it before it is evicted, that access hits.`);
      terms.push('prefetcher');
      break;
    case EventKind.Writeback:
      paras.push('Changed data from a cache closer to the core was saved here, so this copy is now newer than DRAM.');
      paras.push(`Write-back to ${where}: dirty data for line ${n(ev.line)} left a core and was written here, so this copy is now newer than DRAM.`);
      terms.push('write-back');
      break;
    case EventKind.StateChange:
      paras.push('The line\'s sharing state changed; no data moved.');
      paras.push(shared
        ? `State change in ${where}: line ${n(ev.line)} is now ${stateName(ev.state ?? 0, true)}.`
        : `State change in ${where}: line ${n(ev.line)} is now ${MESI_MEANING[ev.state ?? 0] ?? stateName(ev.state ?? 0, false)}`);
      terms.push('mesi');
      break;
  }
  paras.push(`Part of access #${n(a.index)}: ${describeAccess(a)}.`);
  return { title: `Event ${KIND_NAME[ev.kind] ?? ''}`.trim(), paras, terms };
}

const KIND_NAME: Record<number, string> = {
  [EventKind.Hit]: 'hit', [EventKind.Fill]: 'fill', [EventKind.Evict]: 'eviction', [EventKind.Invalidate]: 'invalidation',
  [EventKind.Prefetch]: 'prefetch', [EventKind.Writeback]: 'write-back', [EventKind.StateChange]: 'state change',
};
