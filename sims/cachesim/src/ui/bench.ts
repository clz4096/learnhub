/**
 * Benchmark sources from bench/, loaded lazily. A glob (not a static import) so a
 * missing file degrades to "not available" instead of failing the build.
 */
const loaders = import.meta.glob('../../bench/*.cpp', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>;

/** Workload id → bench/ file stem and executable name. */
export const BENCH_NAMES: Record<string, string> = {
  'seq-sum': 'seq_sum',
  strided: 'strided',
  'matrix-traverse': 'matrix_traverse',
  matmul: 'matmul',
  'list-vs-vector': 'list_vs_vector',
  'aos-soa': 'aos_soa',
  'false-sharing': 'false_sharing',
  'spsc-ring': 'spsc_ring',
};

/** The .cpp source for a workload's benchmark, or null when absent. */
export async function loadBenchSource(workloadId: string): Promise<string | null> {
  const name = BENCH_NAMES[workloadId];
  if (!name) return null;
  const load = loaders[`../../bench/${name}.cpp`];
  if (!load) return null;
  try {
    return await load();
  } catch {
    return null;
  }
}

export type Os = 'macos' | 'linux' | 'windows';

export function buildCommands(os: Os, name: string): string[] {
  if (os === 'windows') {
    return [
      'cmake -S bench -B bench/build',
      'cmake --build bench/build --config Release',
      `bench\\build\\Release\\${name}.exe`,
    ];
  }
  return [
    'cmake -S bench -B bench/build -DCMAKE_BUILD_TYPE=Release',
    'cmake --build bench/build',
    `./bench/build/${name}`,
  ];
}
