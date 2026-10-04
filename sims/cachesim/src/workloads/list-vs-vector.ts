import type { Access } from '@/engine/types';
import { BumpAllocator, type Region } from './alloc';
import { iota, Rng, shuffle } from './rng';
import type { Params, TraceContext, Workload, WorkloadSource } from './types';
import { choiceParam, code, intParam, lineOf } from './util';

const VARIANTS = ['vector', 'list-shuffled', 'list-in-order'] as const;
const NODE = 16; // int value (4) + 4 padding + Node* next (8)
const NEXT_OFF = 8;

function cfg(p: Params) {
  return { n: intParam(p, 'N', 16384, 1, 1 << 21), variant: choiceParam(p, 'variant', 'list-shuffled', VARIANTS) };
}

function build(p: Params) {
  const c = cfg(p);
  const al = new BumpAllocator();
  const base =
    c.variant === 'vector' ? al.alloc('v', c.n * 4) : al.alloc('nodes', c.n * NODE, { idents: ['p'] });
  return { ...c, base, regions: al.regions };
}

export function regions(p: Params, _ctx: TraceContext): Region[] {
  return build(p).regions;
}

function source(p: Params): WorkloadSource {
  const c = cfg(p);
  const head = ['#include <cstddef>', '#include <cstdint>', '#include <vector>', '', `// N = ${c.n}`];
  if (c.variant === 'vector') {
    return {
      code: code([
        ...head,
        'std::int64_t sum_vector(const std::vector<int>& v) {',
        '  std::int64_t s = 0;',
        '  for (std::size_t i = 0; i < v.size(); ++i)',
        '    s += v[i];',
        '  return s;',
        '}',
      ]),
      notes: 'Each element is a 4-byte int, stored back to back: one read per element.',
    };
  }
  const order =
    c.variant === 'list-shuffled'
      ? '// Nodes sit in one contiguous pool, but next links them in a random order.'
      : '// Nodes sit in one contiguous pool and next links them in address order.';
  return {
    code: code([
      ...head,
      'struct Node {',
      '  int value;   // 4 B, then 4 B padding',
      '  Node* next;  // 8 B; sizeof(Node) == 16',
      '};',
      '',
      order,
      'std::int64_t sum_list(const Node* p) {',
      '  std::int64_t s = 0;',
      '  while (p != nullptr) {',
      '    s += p->value;',
      '    p = p->next;',
      '  }',
      '  return s;',
      '}',
    ]),
    notes:
      'Each Node is 16 B (value at +0, padding at +4, next at +8), allocated back to back from one pool, so 4 nodes share a 64 B line. ' +
      'Each visit reads value, then next. The shuffled list links the nodes in a seeded random order. Each read of next needs the one before it; the model does not charge for that wait.',
  };
}

function* trace(p: Params, ctx: TraceContext): Generator<Access> {
  const b = build(p);
  const text = source(p).code;
  if (b.variant === 'vector') {
    const src = lineOf(text, 's += v[i];');
    for (let i = 0; i < b.n; ++i) yield { addr: b.base + i * 4, kind: 'R', core: 0, src };
    return;
  }
  const srcValue = lineOf(text, 's += p->value;');
  const srcNext = lineOf(text, 'p = p->next;');
  const order = iota(b.n);
  if (b.variant === 'list-shuffled') shuffle(order, new Rng(ctx.seed));
  for (let i = 0; i < b.n; ++i) {
    const node = b.base + order[i]! * NODE;
    yield { addr: node, kind: 'R', core: 0, src: srcValue };
    yield { addr: node + NEXT_OFF, kind: 'R', core: 0, src: srcNext };
  }
}

export const listVsVector: Workload = {
  id: 'list-vs-vector',
  number: 5,
  title: 'Pointer chasing: list vs vector',
  summary:
    'Adds up N ints from a vector or from a linked list. A list whose nodes sit in address order still reads memory in order; a shuffled list misses on nearly every node once it outgrows the cache.',
  params: [
    { key: 'N', label: 'Elements (N)', kind: 'int', default: 16384, min: 256, max: 1 << 21, step: 256, help: 'number of ints, or of list nodes' },
    {
      key: 'variant',
      label: 'Container',
      kind: 'choice',
      default: 'list-shuffled',
      help: 'both lists hold the same nodes; only the order of the links differs',
      options: [
        { value: 'vector', label: 'std::vector<int>' },
        { value: 'list-shuffled', label: 'List, shuffled nodes' },
        { value: 'list-in-order', label: 'List, nodes in order' },
      ],
    },
  ],
  source,
  trace,
  estimateLength: (p) => {
    const c = cfg(p);
    return c.variant === 'vector' ? c.n : 2 * c.n;
  },
  bench: 'list-vs-vector',
};
