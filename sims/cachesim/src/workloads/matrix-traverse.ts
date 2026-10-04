import type { Access } from '@/engine/types';
import { BumpAllocator, type Region } from './alloc';
import type { Params, TraceContext, Workload, WorkloadSource } from './types';
import { choiceParam, code, intParam, lineOf } from './util';

const ORDERS = ['row', 'col'] as const;

function cfg(p: Params) {
  return { n: intParam(p, 'N', 128, 1, 1024), order: choiceParam(p, 'order', 'row', ORDERS) };
}

function build(p: Params) {
  const c = cfg(p);
  const al = new BumpAllocator();
  const m = al.alloc('m', c.n * c.n * 8);
  return { ...c, m, regions: al.regions };
}

export function regions(p: Params, _ctx: TraceContext): Region[] {
  return build(p).regions;
}

const ACCESS = { row: 's += m[i * n + j];', col: 's += m[j * n + i];' };

function source(p: Params): WorkloadSource {
  const c = cfg(p);
  return {
    code: code([
      '#include <cstddef>',
      '#include <vector>',
      '',
      `// n = ${c.n}; m is n x n, stored row-major: m[r][c] lives at m[r * n + c]`,
      'double sum(const std::vector<double>& m, std::size_t n) {',
      '  double s = 0.0;',
      '  for (std::size_t i = 0; i < n; ++i)',
      '    for (std::size_t j = 0; j < n; ++j)',
      `      ${ACCESS[c.order]}${c.order === 'row' ? '  // walks along a row' : '  // walks down a column'}`,
      '  return s;',
      '}',
    ]),
    notes:
      'Each element is an 8-byte double, stored row-major (each row contiguous, as C++ does). Column order jumps n × 8 bytes per read, so each read lands on a different line.',
  };
}

function* trace(p: Params, _ctx: TraceContext): Generator<Access> {
  const b = build(p);
  const src = lineOf(source(p).code, ACCESS[b.order]);
  const n = b.n;
  for (let i = 0; i < n; ++i)
    for (let j = 0; j < n; ++j) {
      const idx = b.order === 'row' ? i * n + j : j * n + i;
      yield { addr: b.m + idx * 8, kind: 'R', core: 0, src };
    }
}

export const matrixTraverse: Workload = {
  id: 'matrix-traverse',
  number: 3,
  title: 'Row-major vs column-major traversal',
  summary:
    'Adds up an n × n matrix of doubles, row by row or column by column. Same work and same data, but column order uses only one double from each line it fetches.',
  params: [
    { key: 'N', label: 'Matrix size (n)', kind: 'int', default: 128, min: 16, max: 1024, step: 16, help: 'rows and columns; the matrix holds n × n doubles' },
    {
      key: 'order',
      label: 'Loop order',
      help: 'Row-major walks along each row (neighbors in memory); Column-major walks down each column (one row apart)',
      kind: 'choice',
      default: 'row',
      options: [
        { value: 'row', label: 'Row-major' },
        { value: 'col', label: 'Column-major' },
      ],
    },
  ],
  source,
  trace,
  estimateLength: (p) => cfg(p).n ** 2,
  bench: 'matrix-traverse',
};
