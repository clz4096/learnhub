import type { Access } from '@/engine/types';
import { BumpAllocator, type Region } from './alloc';
import type { Params, TraceContext, Workload, WorkloadSource } from './types';
import { choiceParam, code, intParam, lineOf } from './util';

const STRIDES = [1, 2, 4, 8, 16, 32, 64];
const ELEMS = ['int32', 'int64'] as const;

function cfg(p: Params) {
  const n = intParam(p, 'N', 65536, 1, 1 << 22);
  const raw = intParam(p, 'stride', 1, 1, 64);
  const stride = STRIDES.includes(raw) ? raw : 1;
  const elem = choiceParam(p, 'elem', 'int32', ELEMS);
  return { n, stride, elem, size: elem === 'int32' ? 4 : 8 };
}

function build(p: Params) {
  const c = cfg(p);
  const al = new BumpAllocator();
  const a = al.alloc('a', c.n * c.size);
  return { ...c, a, regions: al.regions };
}

export function regions(p: Params, _ctx: TraceContext): Region[] {
  return build(p).regions;
}

function source(p: Params): WorkloadSource {
  const c = cfg(p);
  const t = c.elem === 'int32' ? 'std::int32_t' : 'std::int64_t';
  return {
    code: code([
      '#include <cstddef>',
      '#include <cstdint>',
      '#include <vector>',
      '',
      `constexpr std::size_t kStride = ${c.stride};  // elements`,
      '',
      `// N = ${c.n}; sweeps the whole array once, touching every kStride-th element`,
      `std::int64_t strided_sum(const std::vector<${t}>& a) {`,
      '  std::int64_t s = 0;',
      '  for (std::size_t i = 0; i < a.size(); i += kStride)',
      '    s += a[i];',
      '  return s;',
      '}',
    ]),
    notes:
      `${c.size} B elements. The loop always spans the whole array, so it makes ceil(N / stride) reads. ` +
      'While stride × element size is at most one line, every line is still touched: fewer reads, the same number of misses.',
  };
}

function* trace(p: Params, _ctx: TraceContext): Generator<Access> {
  const b = build(p);
  const src = lineOf(source(p).code, 's += a[i];');
  for (let i = 0; i < b.n; i += b.stride) yield { addr: b.a + i * b.size, kind: 'R', core: 0, src };
}

export const strided: Workload = {
  id: 'strided',
  number: 2,
  title: 'Strided access',
  summary:
    'Adds up every stride-th element of a fixed-size array. Misses stay the same until the step reaches a whole cache line; from there on, every read misses.',
  params: [
    { key: 'N', label: 'Elements (N)', kind: 'int', default: 65536, min: 1024, max: 1 << 20, step: 1024, help: 'array length; it stays fixed as the stride changes' },
    { key: 'stride', label: 'Stride (elements)', kind: 'int', default: 1, values: STRIDES, help: 'read every element (1), every second (2), and so on' },
    {
      key: 'elem',
      label: 'Element type',
      kind: 'choice',
      default: 'int32',
      options: [
        { value: 'int32', label: 'int32_t (4 B)' },
        { value: 'int64', label: 'int64_t (8 B)' },
      ],
    },
  ],
  source,
  trace,
  estimateLength: (p) => {
    const c = cfg(p);
    return Math.ceil(c.n / c.stride);
  },
  bench: 'strided',
};
