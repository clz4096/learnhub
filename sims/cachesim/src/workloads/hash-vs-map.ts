import type { Access } from '@/engine/types';
import { BumpAllocator, type Region } from './alloc';
import { Rng } from './rng';
import type { Params, TraceContext, Workload, WorkloadSource } from './types';
import { choiceParam, code, intParam, lineOf } from './util';

const VARIANTS = ['open-addressing', 'std-map'] as const;
const SLOT = 16; // uint64 key + uint64 value
const MAP_NODE = 48; // libstdc++ _Rb_tree_node<pair<const uint64, uint64>>
const OFF = { color: 0, parent: 8, left: 16, right: 24, key: 32, value: 40 };
const KNUTH = 2654435761;

const HM = {
  probe: 'const std::uint64_t k = t[i].key;',
  hit: 'if (k == key) return t[i].value;',
};
const M = {
  walkKey: 'if (n->key >= key) {',
  left: 'n = n->left;',
  right: 'n = n->right;',
  bestKey: 'if (best != nullptr && best->key == key)',
  bestValue: 'return best->value;',
};

function cfg(p: Params) {
  return {
    n: intParam(p, 'N', 4096, 1, 1 << 18),
    lookups: intParam(p, 'lookups', 4096, 1, 1 << 17),
    variant: choiceParam(p, 'variant', 'open-addressing', VARIANTS),
  };
}

/** Power-of-two table with load factor in (0.25, 0.5]. */
function tableSize(n: number): number {
  let cap = 2;
  while (cap < 2 * n) cap *= 2;
  return cap;
}

function hash(key: number): number {
  return Math.imul(key, KNUTH) >>> 0;
}

/** N distinct nonzero 32-bit keys in insertion order, plus the lookup stream (all hits). */
function keys(n: number, lookups: number, seed: number) {
  const rng = new Rng(seed);
  const seen = new Set<number>();
  const ins = new Uint32Array(n);
  for (let i = 0; i < n; ) {
    const k = rng.u32();
    if (k === 0 || seen.has(k)) continue;
    seen.add(k);
    ins[i++] = k;
  }
  const q = new Rng(seed ^ 0x9e3779b9);
  const look = new Uint32Array(lookups);
  for (let i = 0; i < lookups; ++i) look[i] = ins[q.int(n)]!;
  return { ins, look };
}

function build(p: Params, ctx: TraceContext) {
  const c = cfg(p);
  const al = new BumpAllocator();
  const base =
    c.variant === 'open-addressing'
      ? al.alloc('table', tableSize(c.n) * SLOT, { idents: ['t'] })
      : al.alloc('nodes', c.n * MAP_NODE, { idents: ['n', 'best'] });
  return { ...c, base, regions: al.regions };
}

export function regions(p: Params, ctx: TraceContext): Region[] {
  return build(p, ctx).regions;
}

function source(p: Params): WorkloadSource {
  const c = cfg(p);
  const head = ['#include <cstddef>', '#include <cstdint>', '#include <vector>', '', `// N = ${c.n} keys, ${c.lookups} lookups`];
  if (c.variant === 'open-addressing') {
    return {
      code: code([
        ...head,
        'struct Slot {',
        '  std::uint64_t key;    // 0 = empty',
        '  std::uint64_t value;',
        '};  // 16 B',
        '',
        'inline std::size_t hash(std::uint64_t key) {',
        `  return static_cast<std::uint32_t>(key) * ${KNUTH}u;  // Knuth multiplicative`,
        '}',
        '',
        '// Linear probing; t.size() is a power of two, load factor <= 0.5.',
        'std::uint64_t find(const std::vector<Slot>& t, std::uint64_t key) {',
        '  const std::size_t mask = t.size() - 1;',
        '  std::size_t i = hash(key) & mask;',
        '  for (;;) {',
        `    ${HM.probe}  // one load per probe`,
        `    ${HM.hit}`,
        '    if (k == 0) return 0;  // empty slot: not present',
        '    i = (i + 1) & mask;',
        '  }',
        '}',
      ]),
      notes:
        `Table of ${tableSize(c.n)} 16 B slots (key at +0, value at +8). Keys are seeded random 32-bit values, and every lookup finds its key. ` +
        'Only lookups are traced: inserts and the list of keys to look up (kept in registers) are not modeled.',
    };
  }
  return {
    code: code([
      ...head,
      '// What std::map<uint64_t, uint64_t>::find touches (libstdc++ layout, 48 B node).',
      'struct Node {',
      '  int color;           // + 4 B padding',
      '  Node* parent;',
      '  Node* left;',
      '  Node* right;',
      '  std::uint64_t key;   // value_type starts at +32',
      '  std::uint64_t value;',
      '};',
      '',
      '// lower_bound walk from the root to a leaf, then one final compare.',
      'std::uint64_t find(const Node* n, std::uint64_t key) {',
      '  const Node* best = nullptr;',
      '  while (n != nullptr) {',
      `    ${M.walkKey}  // load the key`,
      '      best = n;',
      `      ${M.left}  // load a child pointer`,
      '    } else {',
      `      ${M.right}`,
      '    }',
      '  }',
      `  ${M.bestKey}`,
      `    ${M.bestValue}`,
      '  return 0;',
      '}',
    ]),
    notes:
      'Nodes are 48 B (color +0, parent +8, left +16, right +24, key +32, value +40), allocated back to back in insertion order of random keys, ' +
      'so tree neighbors are scattered in memory. The tree is modeled as perfectly balanced (a red-black tree is within 2x of that depth); ' +
      'inserts and rebalancing are not traced. Every lookup finds its key.',
  };
}

/** The linear-probing table after inserting `ins` in order. */
function fillTable(ins: Uint32Array, n: number): Uint32Array {
  const table = new Uint32Array(tableSize(n));
  const mask = table.length - 1;
  for (const k of ins) {
    let i = hash(k) & mask;
    while (table[i] !== 0) i = (i + 1) & mask;
    table[i] = k;
  }
  return table;
}

function* traceHash(b: ReturnType<typeof build>, ctx: TraceContext, text: string): Generator<Access> {
  const { ins, look } = keys(b.n, b.lookups, ctx.seed);
  const table = fillTable(ins, b.n);
  const mask = table.length - 1;
  const sProbe = lineOf(text, HM.probe);
  const sHit = lineOf(text, HM.hit);
  for (const key of look) {
    let i = hash(key) & mask;
    for (;;) {
      const slot = b.base + i * SLOT;
      yield { addr: slot, kind: 'R', core: 0, src: sProbe };
      if (table[i] === key) {
        yield { addr: slot + 8, kind: 'R', core: 0, src: sHit };
        break;
      }
      i = (i + 1) & mask;
    }
  }
}

function* traceMap(b: ReturnType<typeof build>, ctx: TraceContext, text: string): Generator<Access> {
  const { ins, look } = keys(b.n, b.lookups, ctx.seed);
  const n = b.n;
  // order[s] = insertion index of the s-th smallest key; node address follows insertion index.
  const order = Array.from({ length: n }, (_, i) => i).sort((x, y) => ins[x]! - ins[y]!);
  const sortedKey = new Float64Array(n);
  for (let s = 0; s < n; ++s) sortedKey[s] = ins[order[s]!]!;
  // Perfectly balanced BST over sorted positions: the root of [lo, hi) is the midpoint.
  const left = new Int32Array(n).fill(-1);
  const right = new Int32Array(n).fill(-1);
  const stack: Array<[number, number, number, number]> = []; // lo, hi, parent, side
  const root = n > 0 ? (n - 1) >> 1 : -1;
  stack.push([0, n, -1, 0]);
  while (stack.length > 0) {
    const [lo, hi, parent, side] = stack.pop()!;
    if (lo >= hi) continue;
    const mid = (lo + hi - 1) >> 1;
    if (parent >= 0) (side === 0 ? left : right)[parent] = mid;
    stack.push([lo, mid, mid, 0], [mid + 1, hi, mid, 1]);
  }
  const addr = (s: number) => b.base + order[s]! * MAP_NODE;
  const L = Object.fromEntries(Object.entries(M).map(([k, m]) => [k, lineOf(text, m)])) as Record<keyof typeof M, number>;
  for (const key of look) {
    let s = root;
    let best = -1;
    while (s >= 0) {
      const a = addr(s);
      yield { addr: a + OFF.key, kind: 'R', core: 0, src: L.walkKey };
      if (sortedKey[s]! >= key) {
        best = s;
        yield { addr: a + OFF.left, kind: 'R', core: 0, src: L.left };
        s = left[s]!;
      } else {
        yield { addr: a + OFF.right, kind: 'R', core: 0, src: L.right };
        s = right[s]!;
      }
    }
    if (best >= 0) {
      const a = addr(best);
      yield { addr: a + OFF.key, kind: 'R', core: 0, src: L.bestKey };
      if (sortedKey[best] === key) yield { addr: a + OFF.value, kind: 'R', core: 0, src: L.bestValue };
    }
  }
}

/**
 * Exact trace length without emitting it: the same keys, table, and tree walks, but
 * counted, so it costs no Access objects or generator steps.
 */
function countAccesses(p: Params, ctx: TraceContext): number {
  const c = cfg(p);
  const { ins, look } = keys(c.n, c.lookups, ctx.seed);
  let total = 0;
  if (c.variant === 'open-addressing') {
    // One load per probe, then the value load on the hit.
    const table = fillTable(ins, c.n);
    const mask = table.length - 1;
    for (const key of look) {
      let i = hash(key) & mask;
      while (table[i] !== key) { i = (i + 1) & mask; ++total; }
      total += 2;
    }
    return total;
  }
  // A lookup of the key at sorted position s walks to the empty child left of s: the
  // depth of gap s in the midpoint tree. Two loads per node, then key and value of best.
  const sorted = Uint32Array.from(ins).sort();
  const walk = new Int32Array(c.n + 1);
  const stack: Array<[number, number, number]> = [[0, c.n, 0]]; // lo, hi, depth
  while (stack.length > 0) {
    const [lo, hi, d] = stack.pop()!;
    if (lo >= hi) { walk[lo] = d; continue; }
    const mid = (lo + hi - 1) >> 1;
    stack.push([lo, mid, d + 1], [mid + 1, hi, d + 1]);
  }
  for (const key of look) {
    let lo = 0;
    let hi = c.n;
    while (lo < hi) { const m = (lo + hi) >> 1; if (sorted[m]! < key) lo = m + 1; else hi = m; }
    total += 2 * walk[lo]! + 2;
  }
  return total;
}

function* trace(p: Params, ctx: TraceContext): Generator<Access> {
  const b = build(p, ctx);
  const text = source(p).code;
  yield* b.variant === 'open-addressing' ? traceHash(b, ctx, text) : traceMap(b, ctx, text);
}

export const hashVsMap: Workload = {
  id: 'hash-vs-map',
  number: 9,
  title: 'Hash table vs std::map',
  summary:
    'Looks up random keys in a flat hash table (about one cache line per lookup) and in std::map, a balanced tree (one scattered node per level, about log2 N lines per lookup).',
  params: [
    { key: 'N', label: 'Keys (N)', kind: 'int', default: 4096, min: 64, max: 1 << 18, step: 64, help: 'how many keys the container holds' },
    { key: 'lookups', label: 'Lookups', kind: 'int', default: 4096, min: 64, max: 1 << 15, step: 64, help: 'how many keys to look up' },
    {
      key: 'variant',
      label: 'Container',
      kind: 'choice',
      default: 'open-addressing',
      help: 'open addressing stores keys in one flat array and checks the next slot on a collision',
      options: [
        { value: 'open-addressing', label: 'Open addressing (linear probing)' },
        { value: 'std-map', label: 'std::map (red-black tree)' },
      ],
    },
  ],
  source,
  trace,
  // Probe counts and path lengths depend on the keys, so count exactly.
  estimateLength: countAccesses,
};
