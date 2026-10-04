import type { Access } from '@/engine/types';
import { BumpAllocator, type Region } from './alloc';
import type { Params, TraceContext, Workload, WorkloadSource } from './types';
import { choiceParam, code, intParam, lineOf } from './util';

const VARIANTS = ['naive', 'tiled'] as const;
const TILES = [8, 16, 32];
const STMT = 'C[i * n + j] += A[i * n + k] * B[k * n + j];';

function cfg(p: Params) {
  const n = intParam(p, 'N', 32, 1, 128);
  const variant = choiceParam(p, 'variant', 'naive', VARIANTS);
  const raw = intParam(p, 'tile', 16, 1, 32);
  return { n, variant, tile: TILES.includes(raw) ? raw : 16 };
}

function build(p: Params) {
  const c = cfg(p);
  const al = new BumpAllocator();
  const bytes = c.n * c.n * 8;
  const A = al.alloc('A', bytes);
  const B = al.alloc('B', bytes);
  const C = al.alloc('C', bytes);
  return { ...c, A, B, C, regions: al.regions };
}

export function regions(p: Params, _ctx: TraceContext): Region[] {
  return build(p).regions;
}

function source(p: Params): WorkloadSource {
  const c = cfg(p);
  const head = [
    '#include <algorithm>',
    '#include <cstddef>',
    '#include <vector>',
    '',
    `// n = ${c.n}; A, B, C are n x n doubles, row-major`,
  ];
  const body =
    c.variant === 'naive'
      ? [
          'void matmul(const std::vector<double>& A, const std::vector<double>& B,',
          '            std::vector<double>& C, std::size_t n) {',
          '  for (std::size_t i = 0; i < n; ++i)',
          '    for (std::size_t j = 0; j < n; ++j)',
          '      for (std::size_t k = 0; k < n; ++k)',
          `        ${STMT}`,
          '}',
        ]
      : [
          `constexpr std::size_t T = ${c.tile};  // tile edge`,
          '',
          'void matmul(const std::vector<double>& A, const std::vector<double>& B,',
          '            std::vector<double>& C, std::size_t n) {',
          '  for (std::size_t ii = 0; ii < n; ii += T)',
          '    for (std::size_t jj = 0; jj < n; jj += T)',
          '      for (std::size_t kk = 0; kk < n; kk += T)',
          '        for (std::size_t i = ii; i < std::min(ii + T, n); ++i)',
          '          for (std::size_t j = jj; j < std::min(jj + T, n); ++j)',
          '            for (std::size_t k = kk; k < std::min(kk + T, n); ++k)',
          `              ${STMT}`,
          '}',
        ];
  return {
    code: code([...head, ...body]),
    notes:
      'Each inner step is modeled as load A, load B, load C, store C (C[i][j] is not kept in a register), ' +
      'so the run makes 4 × n³ accesses. In ijk order B is read down a column: n × 8 bytes per step.',
  };
}

function* trace(p: Params, _ctx: TraceContext): Generator<Access> {
  const b = build(p);
  const src = lineOf(source(p).code, STMT);
  const n = b.n;
  function* cell(i: number, j: number, k: number): Generator<Access> {
    yield { addr: b.A + (i * n + k) * 8, kind: 'R', core: 0, src };
    yield { addr: b.B + (k * n + j) * 8, kind: 'R', core: 0, src };
    const c = b.C + (i * n + j) * 8;
    yield { addr: c, kind: 'R', core: 0, src };
    yield { addr: c, kind: 'W', core: 0, src };
  }
  if (b.variant === 'naive') {
    for (let i = 0; i < n; ++i)
      for (let j = 0; j < n; ++j) for (let k = 0; k < n; ++k) yield* cell(i, j, k);
    return;
  }
  const T = b.tile;
  for (let ii = 0; ii < n; ii += T)
    for (let jj = 0; jj < n; jj += T)
      for (let kk = 0; kk < n; kk += T)
        for (let i = ii; i < Math.min(ii + T, n); ++i)
          for (let j = jj; j < Math.min(jj + T, n); ++j)
            for (let k = kk; k < Math.min(kk + T, n); ++k) yield* cell(i, j, k);
}

export const matmul: Workload = {
  id: 'matmul',
  number: 4,
  title: 'Matrix multiply: naive vs tiled',
  summary:
    'Computes C += A × B on n × n doubles. The naive loop reads B down its columns. The tiled loop works on T × T blocks small enough to stay cached, so each block is reused before it is evicted.',
  params: [
    {
      key: 'N',
      label: 'Matrix size (n)',
      kind: 'int',
      default: 32,
      min: 8,
      max: 128,
      step: 8,
      help: 'the run makes 4 × n³ accesses: 131k at n = 32, 1M at n = 64, 8.4M at n = 128',
    },
    {
      key: 'variant',
      label: 'Variant',
      kind: 'choice',
      default: 'naive',
      help: 'Naive is the textbook triple loop; Tiled splits the work into blocks',
      options: [
        { value: 'naive', label: 'Naive (ijk)' },
        { value: 'tiled', label: 'Tiled (blocked)' },
      ],
    },
    { key: 'tile', label: 'Tile size (T)', kind: 'int', default: 16, values: TILES, help: 'block width for the tiled variant' },
  ],
  source,
  trace,
  estimateLength: (p) => 4 * cfg(p).n ** 3,
  bench: 'matmul',
};
