/**
 * Parsing for the results.csv that scripts/verify writes on every OS, and for raw
 * benchmark stdout (RESULT,... lines). Pure, plus a localStorage wrapper that never
 * throws (private browsing and full quotas must not break the panel).
 */

export interface ResultRow {
  bench: string;
  variant: string;
  param: string;
  medianNs: number;
  nsPerAccess: number;
}

export interface ParsedResults {
  rows: ResultRow[];
  /** 1-based line numbers and reasons for lines that looked like data but did not parse. */
  errors: string[];
}

export const RESULTS_HEADER = 'bench,variant,param,median_ns,ns_per_access';
/** Larger files are not results.csv (a full run is about 3 KiB). */
export const MAX_RESULTS_BYTES = 1 << 20;

/**
 * Accepts results.csv (header plus bare rows) or benchmark stdout (RESULT, prefix).
 * Other lines (the human-readable tables, comments, blanks) are ignored, not errors,
 * so a pasted .txt works too.
 */
export function parseResultsCsv(text: string): ParsedResults {
  const rows: ResultRow[] = [];
  const errors: string[] = [];
  const lines = text.split(/\r?\n/);
  const sawHeader = lines.some((l) => l.trim().toLowerCase() === RESULTS_HEADER);
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.toLowerCase() === RESULTS_HEADER) return;
    const prefixed = line.startsWith('RESULT,');
    // Without a header, only RESULT lines are data; the rest is benchmark chatter.
    if (!prefixed && !sawHeader) return;
    const f = (prefixed ? line.slice('RESULT,'.length) : line).split(',');
    if (f.length < 5) {
      if (prefixed || line.includes(',')) errors.push(`line ${i + 1}: expected 5 fields, found ${f.length}`);
      return;
    }
    // The param field is free text; anything between variant and the two numbers belongs to it.
    const medianNs = Number(f[f.length - 2]);
    const nsPerAccess = Number(f[f.length - 1]);
    const bench = f[0]!.trim();
    const variant = f[1]!.trim();
    const param = f.slice(2, f.length - 2).join(',').trim();
    if (!bench || !variant) {
      errors.push(`line ${i + 1}: missing benchmark or variant name`);
      return;
    }
    if (!Number.isFinite(medianNs) || !Number.isFinite(nsPerAccess) || medianNs < 0 || nsPerAccess <= 0) {
      errors.push(`line ${i + 1}: the last two fields must be positive numbers`);
      return;
    }
    rows.push({ bench, variant, param, medianNs, nsPerAccess });
  });
  return { rows, errors };
}

/* ───────────────────────── persistence ───────────────────────── */

export interface StoredResults {
  name: string;
  text: string;
  savedAt: string;
}

export const STORAGE_KEY = 'cachesim.tryit.results.v1';

/** The parts of Storage used here, so tests can pass a fake or a throwing one. */
export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function defaultStorage(): StorageLike | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    // Some browsers throw on the localStorage getter itself when storage is disabled.
    return null;
  }
}

export function loadStoredResults(storage: StorageLike | null = defaultStorage()): StoredResults | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<StoredResults>;
    if (typeof v.text !== 'string' || typeof v.name !== 'string') return null;
    return { name: v.name, text: v.text, savedAt: typeof v.savedAt === 'string' ? v.savedAt : '' };
  } catch {
    return null;
  }
}

/** Returns false when the browser refused to store (quota, privacy mode). */
export function saveStoredResults(value: StoredResults, storage: StorageLike | null = defaultStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function clearStoredResults(storage: StorageLike | null = defaultStorage()): void {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to recover: the stored copy just stays until the browser clears it.
  }
}
