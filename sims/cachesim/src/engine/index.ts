/** Public surface of the engine. No UI imports anywhere under src/engine. */
export * from '@/engine/types';
export { Simulator, validateConfig } from '@/engine/simulator';
export { LIMITS } from '@/engine/limits';
export { Cache } from '@/engine/cache';
export { Prng } from '@/engine/prng';
export { breakdown, bits, hex, isPow2, log2, type AddressBreakdown } from '@/engine/addr';
export { PRESETS, presetById, cloneConfig, type Preset } from '@/engine/presets';
