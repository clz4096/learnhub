/**
 * Progress each tool reports to the catalog: `learnhub.progress.<id>` in localStorage,
 * written by the tool itself (same origin, so same storage). Anything malformed reads
 * as "no progress"; storage that throws reads the same way.
 */
export interface ToolProgress {
  done: number;
  total: number;
  updated: string;
}

export const progressKey = (id: string): string => `learnhub.progress.${id}`;

export function parseToolProgress(raw: string | null): ToolProgress | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<ToolProgress>;
    const { done, total, updated } = v;
    if (!Number.isInteger(done) || !Number.isInteger(total)) return null;
    if ((total as number) < 1 || (done as number) < 0 || (done as number) > (total as number)) return null;
    if (typeof updated !== 'string' || Number.isNaN(Date.parse(updated))) return null;
    return { done: done as number, total: total as number, updated };
  } catch {
    return null;
  }
}

export function readToolProgress(id: string): ToolProgress | null {
  try {
    return parseToolProgress(localStorage.getItem(progressKey(id)));
  } catch {
    return null;
  }
}
