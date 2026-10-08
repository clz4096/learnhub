/**
 * How many hints the learner has opened on each Cambridge problem, kept in localStorage so a
 * problem that comes back days after a miss shows the hints already seen. The progress
 * document records the count with each answer (`ItemData.hints`), which is what the gate's
 * evidence reports; this only carries the count between a miss and the next answer. It is
 * not synced: on another device the count starts from the document's.
 */
export const HINTS_KEY = 'mastery.hints.v1';

function readAll(): Record<string, number> {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(HINTS_KEY) ?? '{}');
    if (typeof v !== 'object' || v === null || Array.isArray(v)) return {};
    const out: Record<string, number> = {};
    for (const [k, n] of Object.entries(v)) if (Number.isInteger(n) && (n as number) > 0) out[k] = n as number;
    return out;
  } catch {
    return {};
  }
}

/** Hints opened on a problem (its key, "topic id/problem id"), 0 when none. */
export function loadHints(key: string): number {
  const all = readAll();
  return Object.hasOwn(all, key) ? all[key] ?? 0 : 0;
}

export function saveHints(key: string, n: number): void {
  try {
    localStorage.setItem(HINTS_KEY, JSON.stringify({ ...readAll(), [key]: n }));
  } catch {
    // Not kept; the hints stay open for this page.
  }
}
