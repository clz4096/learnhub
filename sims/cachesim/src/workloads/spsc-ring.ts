import type { Access } from '@/engine/types';
import { BumpAllocator, type Region } from './alloc';
import type { Params, TraceContext, Workload, WorkloadSource } from './types';
import { choiceParam, code, coreOf, intParam, lineOf } from './util';

const LAYOUTS = ['same-line', 'separate-lines'] as const;
const CAPS = [1, 2, 4, 8, 16, 32, 64, 128, 256];
const M = {
  pFull: 'while (t - r.head.load(std::memory_order_acquire) == kCap) {}',
  pSlot: 'r.buf[t % kCap] = v;',
  pTail: 'r.tail.store(++t, std::memory_order_release);',
  cEmpty: 'while (r.tail.load(std::memory_order_acquire) == h) {}',
  cSlot: 'const int v = r.buf[h % kCap];',
  cHead: 'r.head.store(++h, std::memory_order_release);',
};

function cfg(p: Params) {
  const raw = intParam(p, 'capacity', 16, 1, 256);
  return {
    cap: CAPS.includes(raw) ? raw : 16,
    items: intParam(p, 'items', 4096, 1, 1 << 17),
    layout: choiceParam(p, 'layout', 'same-line', LAYOUTS),
  };
}

function build(p: Params, ctx: TraceContext) {
  const c = cfg(p);
  const line = Math.max(64, ctx.lineBytes);
  const al = new BumpAllocator();
  const sep = c.layout === 'separate-lines';
  const headOff = 0;
  const tailOff = sep ? line : 8;
  const bufOff = sep ? 2 * line : 16;
  const r = al.alloc('ring', bufOff + c.cap * 4, { align: line, idents: [] });
  const head = r + headOff;
  const tail = r + tailOff;
  const buf = r + bufOff;
  al.label('head', head, 8);
  al.label('tail', tail, 8);
  al.label('buf', buf, c.cap * 4);
  // Only the member labels matter for lookups; drop the enclosing struct.
  const regions = al.regions.filter((g) => g.name !== 'ring');
  return { ...c, head, tail, buf, regions };
}

export function regions(p: Params, ctx: TraceContext): Region[] {
  return build(p, ctx).regions;
}

function source(p: Params): WorkloadSource {
  const c = cfg(p);
  const ring =
    c.layout === 'same-line'
      ? [
          'struct Ring {',
          '  std::atomic<std::size_t> head{0};  // consumer writes',
          '  std::atomic<std::size_t> tail{0};  // producer writes, same 64 B line',
          '  int buf[kCap];',
          '};',
        ]
      : [
          'constexpr std::size_t kLine = std::hardware_destructive_interference_size;  // or 64',
          'struct Ring {',
          '  alignas(kLine) std::atomic<std::size_t> head{0};  // consumer writes',
          '  alignas(kLine) std::atomic<std::size_t> tail{0};  // producer writes',
          '  alignas(kLine) int buf[kCap];',
          '};',
        ];
  return {
    code: code([
      '#include <atomic>',
      '#include <cstddef>',
      '#include <new>',
      '',
      `constexpr std::size_t kCap = ${c.cap};`,
      ...ring,
      '',
      'void sink(int v);',
      '',
      '// Core 0. t is the producer\'s private copy of tail.',
      'void producer(Ring& r, int items) {',
      '  std::size_t t = 0;',
      '  for (int v = 0; v < items; ++v) {',
      `    ${M.pFull}  // full: spin`,
      `    ${M.pSlot}`,
      `    ${M.pTail}`,
      '  }',
      '}',
      '',
      '// Core 1. h is the consumer\'s private copy of head.',
      'void consumer(Ring& r, int items) {',
      '  std::size_t h = 0;',
      '  for (int n = 0; n < items; ++n) {',
      `    ${M.cEmpty}  // empty: spin`,
      `    ${M.cSlot}`,
      `    ${M.cHead}`,
      '    sink(v);',
      '  }',
      '}',
    ]),
    notes:
      `items = ${c.items}. The producer and consumer take turns, one memory operation each; one pass of a spin loop counts as one operation. ` +
      'A store is visible to the other side from its next operation on. The producer keeps tail and the consumer keeps head in registers, so ' +
      'each item costs: producer load head, store slot, store tail; consumer load tail, load slot, store head (plus spin loads). ' +
      'Separate-lines pads to the simulated line size.',
  };
}

function* trace(p: Params, ctx: TraceContext): Generator<Access> {
  const b = build(p, ctx);
  const text = source(p).code;
  const L = Object.fromEntries(Object.entries(M).map(([k, m]) => [k, lineOf(text, m)])) as Record<
    keyof typeof M,
    number
  >;
  const pc = coreOf(0, ctx.cores);
  const cc = coreOf(1, ctx.cores);
  let head = 0; // committed values, visible to both sides
  let tail = 0;
  let t = 0;
  let h = 0;
  let pPhase = b.items > 0 ? 0 : 3; // 0 check, 1 write slot, 2 publish, 3 done
  let cPhase = b.items > 0 ? 0 : 3;
  while (pPhase !== 3 || cPhase !== 3) {
    if (pPhase !== 3) {
      if (pPhase === 0) {
        yield { addr: b.head, kind: 'R', core: pc, src: L.pFull };
        if (t - head !== b.cap) pPhase = 1;
      } else if (pPhase === 1) {
        yield { addr: b.buf + (t % b.cap) * 4, kind: 'W', core: pc, src: L.pSlot };
        pPhase = 2;
      } else {
        yield { addr: b.tail, kind: 'W', core: pc, src: L.pTail };
        tail = ++t;
        pPhase = t === b.items ? 3 : 0;
      }
    }
    if (cPhase !== 3) {
      if (cPhase === 0) {
        yield { addr: b.tail, kind: 'R', core: cc, src: L.cEmpty };
        if (tail !== h) cPhase = 1;
      } else if (cPhase === 1) {
        yield { addr: b.buf + (h % b.cap) * 4, kind: 'R', core: cc, src: L.cSlot };
        cPhase = 2;
      } else {
        yield { addr: b.head, kind: 'W', core: cc, src: L.cHead };
        head = ++h;
        cPhase = h === b.items ? 3 : 0;
      }
    }
  }
}

export const spscRing: Workload = {
  id: 'spsc-ring',
  number: 8,
  title: 'SPSC ring buffer',
  summary:
    'A producer on core 0 passes ints to a consumer on core 1 through a ring of slots. With head and tail on one line, every index update pulls the line away from the other core.',
  params: [
    { key: 'capacity', label: 'Capacity (slots)', kind: 'int', default: 16, values: CAPS, help: 'how many ints the ring holds at once' },
    { key: 'items', label: 'Items', kind: 'int', default: 4096, min: 64, max: 1 << 17, step: 64, help: 'how many ints pass through the ring' },
    {
      key: 'layout',
      label: 'Index layout',
      kind: 'choice',
      default: 'same-line',
      help: 'head is where the consumer reads next; tail is where the producer writes next',
      options: [
        { value: 'same-line', label: 'head and tail on one line' },
        { value: 'separate-lines', label: 'Each on its own line' },
      ],
    },
  ],
  source,
  trace,
  // Exact for the lockstep schedule (workloads.test.ts checks it against the generator):
  // 3 operations per item on each side, plus the spins. With 2 or more slots the
  // producer never waits and the consumer spins twice in all. With 1 slot each item
  // adds 4 spins, less 2 at the end.
  estimateLength: (p) => {
    const c = cfg(p);
    return c.cap === 1 ? 10 * c.items - 2 : 6 * c.items + 2;
  },
  bench: 'spsc-ring',
};
