/**
 * Application state as signals. Components read these; the controller (controller.ts)
 * is the only writer of run state (mirrors, current access, stats, history).
 */
import { computed, signal } from '@preact/signals';
import {
  PRESETS, cloneConfig, validateConfig,
  type CacheInfo, type HierarchyConfig, type SimEvent, type Stats,
} from '@/engine';
import { DEFAULT_CUSTOM_TEXT, customWorkloadFromParsed, parseTraceText, workloadById, type ParsedTrace } from '@/workloads';
import { defaultParams, type Params, type Workload, type WorkloadSource } from '@/workloads/types';
import type { AccessRecord } from '@/worker/protocol';
import { emptyHistory, type HistoryState } from '@/worker/history';
import type { CacheMirror } from '@/ui/mirror';
import type { Speed } from '@/ui/playback';

/* ───────────────────────── hardware ───────────────────────── */

export const DEFAULT_PRESET = PRESETS[0]!;
export const presetId = signal<string>(DEFAULT_PRESET.id);
/** Editable copy of the selected preset. Changing it resets the run. */
export const config = signal<HierarchyConfig>(cloneConfig(DEFAULT_PRESET.config));
/** The engine's validation message for the current config, or null when valid. */
export const configError = computed<string | null>(() => {
  try {
    validateConfig(config.value);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
});

/* ───────────────────────── workload ───────────────────────── */

export const DEFAULT_WORKLOAD = 'seq-sum';
export const workloadId = signal<string>(DEFAULT_WORKLOAD);
export const params = signal<Params>(defaultParams(workloadById(DEFAULT_WORKLOAD)!));
export const traceText = signal<string>(DEFAULT_CUSTOM_TEXT);

/** The custom trace, parsed once per text change (null unless the custom workload is selected). */
export const parsedTrace = computed<ParsedTrace | null>(() =>
  workloadId.value === 'custom' ? parseTraceText(traceText.value) : null);

/** The workload the current selection describes (custom text builds its own). */
export const workload = computed<Workload>(() => {
  const parsed = parsedTrace.value;
  return parsed ? customWorkloadFromParsed(parsed) : workloadById(workloadId.value)!;
});

export const traceErrors = computed<string[]>(() => parsedTrace.value?.errors ?? []);

/** Estimated trace length, computed on the main thread so it updates as params change. */
export const estimate = computed<number>(() => {
  const cfg = config.value;
  try {
    return workload.value.estimateLength(params.value, { lineBytes: cfg.l1d.lineBytes, cores: cfg.cores, seed: cfg.seed });
  } catch {
    return 0;
  }
});
export const LONG_TRACE = 1_000_000;

/* ───────────────────────── playback ───────────────────────── */

export const playing = signal(false);
export const speed = signal<Speed>(1);
export const showArrows = signal(true);
export const showBreakdown = signal(true);

/* ───────────────────────── run state (written by the controller) ───────────────────────── */

export interface PlayedAccess extends AccessRecord {
  events: SimEvent[];
}

export const caches = signal<CacheInfo[]>([]);
/** One mirror per cache instance, indexed like CacheInfo.id. Replaced on configure. */
export const mirrors = signal<CacheMirror[]>([]);
export const current = signal<PlayedAccess | null>(null);
export const stats = signal<Stats | null>(null);
export const history = signal<HistoryState>(emptyHistory());
/** True when the trace has been fully played. */
export const done = signal(false);
/** Set while "run to end" is computing in the worker. */
export const runProgress = signal<{ done: number; target: number } | null>(null);
/** Readable error from the worker or engine (bad config, bad trace). */
export const workerError = signal<string | null>(null);
/** Set when the worker crashed and was restarted; the run was reset. */
export const workerNotice = signal<string | null>(null);
export const source = signal<WorkloadSource | null>(null);

export type ArrowKind = 'invalidate' | 'transfer';
export interface Arrow { id: number; from: number; to: number; kind: ArrowKind; t: number }
/** Coherence traffic between cores, drawn as fading arrows in the 2D view. */
export const arrows = signal<Arrow[]>([]);

/* ───────────────────────── modes, selection, layout ───────────────────────── */

export type Mode = 'free' | 'guided' | 'explain' | 'glossary';
export const mode = signal<Mode>('free');

/**
 * What the user last clicked; Explain mode explains it. Set by grid cells (slot),
 * set labels (set), cache titles (cache), the current access, its events, and Terms.
 */
export type Selection = {
  type: 'cache' | 'set' | 'slot' | 'access' | 'event' | 'term';
  cacheId?: number;
  set?: number;
  way?: number;
  accessIndex?: number;
  eventIndex?: number;
  term?: string;
} | null;
export const selection = signal<Selection>(null);

export type CenterViewKind = '2d' | '3d';
export const view = signal<CenterViewKind>('2d');

export type Layout = 'phone' | 'tablet' | 'desktop';
export function layoutFor(width: number): Layout {
  return width < 700 ? 'phone' : width < 1024 ? 'tablet' : 'desktop';
}
export const layout = signal<Layout>(layoutFor(typeof window === 'undefined' ? 1280 : window.innerWidth));

export type PhoneTab = 'config' | 'workload' | 'view' | 'metrics' | 'code';
export const phoneTab = signal<PhoneTab>('view');

export const reducedMotion = signal<boolean>(
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
