import type { Access } from '@/engine/types';
import { BumpAllocator, type Region } from './alloc';
import type { Params, TraceContext, Workload, WorkloadSource } from './types';
import { code, intParam, lineOf } from './util';

const ELEM = 4;

function n(p: Params): number {
  return intParam(p, 'N', 16384, 1, 1 << 20);
}

function passes(p: Params): number {
  return intParam(p, 'passes', 2, 1, 16);
}

function build(p: Params) {
  const al = new BumpAllocator();
  const a = al.alloc('a', n(p) * ELEM);
  return { a, regions: al.regions };
}

export function regions(p: Params, _ctx: TraceContext): Region[] {
  return build(p).regions;
}

function source(p: Params): WorkloadSource {
  return {
    code: code([
      '#include <cstddef>',
      '#include <cstdint>',
      '#include <vector>',
      '',
      `// N = ${n(p)}`,
      'std::int64_t sum(const std::vector<std::int32_t>& a, int passes) {',
      '  std::int64_t s = 0;',
      '  for (int p = 0; p < passes; ++p)',
      '    for (std::size_t i = 0; i < a.size(); ++i)',
      '      s += a[i];',
      '  return s;',
      '}',
      '',
      `// called as sum(a, ${passes(p)})`,
    ]),
    notes: 'Each element is a 4-byte int32_t, read once per pass. With 64 B cache lines, 16 elements share a line, so one miss brings in the next 15.',
  };
}

function* trace(p: Params, _ctx: TraceContext): Generator<Access> {
  const { a } = build(p);
  const src = lineOf(source(p).code, 's += a[i];');
  const count = n(p);
  const reps = passes(p);
  for (let r = 0; r < reps; ++r)
    for (let i = 0; i < count; ++i) yield { addr: a + i * ELEM, kind: 'R', core: 0, src };
}

export const seqSum: Workload = {
  id: 'seq-sum',
  number: 1,
  title: 'Sequential array sum',
  summary:
    'Adds up an int array from front to back. Watch one miss per 64 B cache line, then 15 hits, and see how a prefetcher hides even that miss.',
  params: [
    { key: 'N', label: 'Elements (N)', kind: 'int', default: 16384, min: 256, max: 1 << 20, step: 256, help: 'how many 4-byte ints the array holds' },
    {
      key: 'passes',
      label: 'Passes',
      kind: 'int',
      default: 2,
      min: 1,
      max: 16,
      step: 1,
      help: 'how many times to sum the whole array. The first pass misses once per line; later passes hit if the array fits in a cache',
    },
  ],
  source,
  trace,
  estimateLength: (p) => n(p) * passes(p),
  bench: 'seq-sum',
};
