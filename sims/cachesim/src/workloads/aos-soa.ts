import type { Access } from '@/engine/types';
import { BumpAllocator, type Region } from './alloc';
import type { Params, TraceContext, Workload, WorkloadSource } from './types';
import { choiceParam, code, intParam, lineOf } from './util';

const LAYOUTS = ['aos', 'soa'] as const;
const FIELDS = ['x', 'y', 'z', 'vx', 'vy', 'vz', 'id', 'mass'] as const;
const PARTICLE = 32;
const X_OFF = 0;
const VX_OFF = 12;

function cfg(p: Params) {
  return { n: intParam(p, 'N', 16384, 1, 1 << 18), layout: choiceParam(p, 'layout', 'aos', LAYOUTS) };
}

function build(p: Params) {
  const c = cfg(p);
  const al = new BumpAllocator();
  if (c.layout === 'aos') {
    const base = al.alloc('p', c.n * PARTICLE);
    return { ...c, x: base + X_OFF, vx: base + VX_OFF, elemStride: PARTICLE, regions: al.regions };
  }
  const bases: Record<string, number> = {};
  for (const f of FIELDS) bases[f] = al.alloc(f, c.n * 4);
  return { ...c, x: bases.x!, vx: bases.vx!, elemStride: 4, regions: al.regions };
}

export function regions(p: Params, _ctx: TraceContext): Region[] {
  return build(p).regions;
}

const STMT = { aos: 'p[i].x += p[i].vx;', soa: 's.x[i] += s.vx[i];' };

function source(p: Params): WorkloadSource {
  const c = cfg(p);
  const head = ['#include <cstddef>', '#include <vector>', '', `// N = ${c.n}`];
  if (c.layout === 'aos') {
    return {
      code: code([
        ...head,
        'struct Particle {',
        '  float x, y, z;',
        '  float vx, vy, vz;',
        '  int id;',
        '  float mass;',
        '};  // sizeof(Particle) == 32',
        '',
        'void step(std::vector<Particle>& p) {',
        '  for (std::size_t i = 0; i < p.size(); ++i)',
        `    ${STMT.aos}`,
        '}',
      ]),
      notes:
        'Array of structs: 32 B per particle, x at +0, vx at +12. Each 64 B line holds 2 particles, but the loop uses only 8 of every 32 bytes.',
    };
  }
  return {
    code: code([
      ...head,
      'struct Particles {',
      '  std::vector<float> x, y, z;',
      '  std::vector<float> vx, vy, vz;',
      '  std::vector<int> id;',
      '  std::vector<float> mass;',
      '};',
      '',
      'void step(Particles& s) {',
      '  for (std::size_t i = 0; i < s.x.size(); ++i)',
      `    ${STMT.soa}`,
      '}',
    ]),
    notes:
      'Struct of arrays: 8 separate float or int arrays of N elements each. The loop reads only x and vx, so every byte fetched is used.',
  };
}

function* trace(p: Params, _ctx: TraceContext): Generator<Access> {
  const b = build(p);
  const src = lineOf(source(p).code, STMT[b.layout]);
  for (let i = 0; i < b.n; ++i) {
    const x = b.x + i * b.elemStride;
    yield { addr: x, kind: 'R', core: 0, src };
    yield { addr: b.vx + i * b.elemStride, kind: 'R', core: 0, src };
    yield { addr: x, kind: 'W', core: 0, src };
  }
}

export const aosSoa: Workload = {
  id: 'aos-soa',
  number: 6,
  title: 'Array of structs vs struct of arrays',
  summary:
    'Updates x += vx for N particles. An array of structs (AoS) drags the unused fields through the cache; a struct of arrays (SoA) fetches only the two arrays it uses.',
  params: [
    { key: 'N', label: 'Particles (N)', kind: 'int', default: 16384, min: 256, max: 1 << 18, step: 256, help: 'number of particles to update' },
    {
      key: 'layout',
      label: 'Layout',
      kind: 'choice',
      default: 'aos',
      help: 'Array of structs keeps each particle\'s fields together; Struct of arrays gives each field its own array',
      options: [
        { value: 'aos', label: 'Array of structs' },
        { value: 'soa', label: 'Struct of arrays' },
      ],
    },
  ],
  source,
  trace,
  estimateLength: (p) => 3 * cfg(p).n,
  bench: 'aos-soa',
};
