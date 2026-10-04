import type { Access } from '@/engine/types';
import { BumpAllocator, type Region } from './alloc';
import type { Params, TraceContext, Workload, WorkloadSource } from './types';
import { choiceParam, code, coreOf, intParam, lineOf } from './util';

const LAYOUTS = ['packed', 'padded'] as const;
const STMT = 'counters[t].value.fetch_add(1, std::memory_order_relaxed);';

function cfg(p: Params) {
  return {
    iters: intParam(p, 'iterations', 4096, 1, 1 << 17),
    threads: intParam(p, 'threads', 4, 2, 8),
    layout: choiceParam(p, 'layout', 'packed', LAYOUTS),
  };
}

function build(p: Params, ctx: TraceContext) {
  const c = cfg(p);
  const line = Math.max(64, ctx.lineBytes);
  // Padded counters take one simulated line each, so the fix also holds for 128 B lines.
  const stride = c.layout === 'padded' ? line : 8;
  const al = new BumpAllocator();
  const base = al.alloc('counters', c.threads * stride, { align: line });
  return { ...c, base, stride, regions: al.regions };
}

export function regions(p: Params, ctx: TraceContext): Region[] {
  return build(p, ctx).regions;
}

function source(p: Params): WorkloadSource {
  const c = cfg(p);
  const counter =
    c.layout === 'packed'
      ? ['struct Counter {', '  std::atomic<std::uint64_t> value{0};', '};  // 8 B: all counters share one line']
      : [
          '// If the constant is missing (older libc++), use alignas(64).',
          'struct alignas(std::hardware_destructive_interference_size) Counter {',
          '  std::atomic<std::uint64_t> value{0};',
          '};  // padded to a full cache line',
        ];
  return {
    code: code([
      '#include <atomic>',
      '#include <cstdint>',
      '#include <new>',
      '#include <thread>',
      '#include <vector>',
      '',
      `constexpr int kThreads = ${c.threads};`,
      `constexpr std::uint64_t kIters = ${c.iters};`,
      '',
      ...counter,
      '',
      'Counter counters[kThreads];',
      '',
      'void work(int t) {',
      '  for (std::uint64_t n = 0; n < kIters; ++n)',
      `    ${STMT}  // load + store`,
      '}',
      '',
      'int main() {',
      '  std::vector<std::jthread> pool;',
      '  for (int t = 0; t < kThreads; ++t) pool.emplace_back(work, t);',
      '}',
    ]),
    notes:
      'Each thread increments only its own counter, so no data is shared. Packed counters still share a line, so every write makes the other cores throw away their copies. ' +
      'The fetch_add is modeled as a load, then a store. Threads take turns, one iteration each; thread t runs on core t (mod the core count). ' +
      'Padded counters are spaced by the simulated line size, so they stay on separate lines with 128 B lines too.',
  };
}

function* trace(p: Params, ctx: TraceContext): Generator<Access> {
  const b = build(p, ctx);
  const src = lineOf(source(p).code, STMT);
  for (let n = 0; n < b.iters; ++n)
    for (let t = 0; t < b.threads; ++t) {
      const addr = b.base + t * b.stride;
      const core = coreOf(t, ctx.cores);
      yield { addr, kind: 'R', core, src };
      yield { addr, kind: 'W', core, src };
    }
}

export const falseSharing: Workload = {
  id: 'false-sharing',
  number: 7,
  title: 'False sharing',
  summary:
    'Each thread adds to its own counter. Packed counters share a cache line, so the line bounces between cores on every write. Padding each counter to a full line stops the bouncing.',
  params: [
    { key: 'iterations', label: 'Iterations per thread', kind: 'int', default: 4096, min: 64, max: 1 << 16, step: 64, help: 'how many times each thread adds to its counter' },
    { key: 'threads', label: 'Threads', kind: 'int', default: 4, min: 2, max: 8, step: 1, help: 'one counter per thread; thread t runs on core t mod the number of cores' },
    {
      key: 'layout',
      label: 'Layout',
      kind: 'choice',
      default: 'packed',
      options: [
        { value: 'packed', label: 'Packed (8 B apart)' },
        { value: 'padded', label: 'Padded (one line each)' },
      ],
    },
  ],
  source,
  trace,
  estimateLength: (p) => {
    const c = cfg(p);
    return 2 * c.iters * c.threads;
  },
  bench: 'false-sharing',
};
