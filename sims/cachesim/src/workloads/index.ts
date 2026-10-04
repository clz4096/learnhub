import { aosSoa } from './aos-soa';
import { custom } from './custom';
import { falseSharing } from './false-sharing';
import { hashVsMap } from './hash-vs-map';
import { listVsVector } from './list-vs-vector';
import { matmul } from './matmul';
import { matrixTraverse } from './matrix-traverse';
import { seqSum } from './seq-sum';
import { spscRing } from './spsc-ring';
import { strided } from './strided';
import type { Workload } from './types';

export { customWorkload, customWorkloadFromParsed, parseTraceText, DEFAULT_CUSTOM_TEXT, type ParsedTrace } from './custom';
export * from './types';

/** All workloads in spec order (1 to 10). Entry 10 replays DEFAULT_CUSTOM_TEXT; build others with customWorkload. */
export const WORKLOADS: Workload[] = [
  seqSum,
  strided,
  matrixTraverse,
  matmul,
  listVsVector,
  aosSoa,
  falseSharing,
  spscRing,
  hashVsMap,
  custom,
];

export function workloadById(id: string): Workload | undefined {
  return WORKLOADS.find((w) => w.id === id);
}
