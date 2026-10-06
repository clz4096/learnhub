/**
 * The synced row's document and the progress file share one shape: the progress document
 * with the learner envelope beside its fields, `{ ...progress, learner }`. A document
 * without `learner` (an older build's row or file) is a progress document as before.
 */
import { MAX_IMPORT_BYTES, importProgress, type Progress } from '@learnhub/mastery';
import { isObj } from './learner/join';
import { parseLearner, type LearnerState } from './learner/envelope';

export const LEARNER_FIELD = 'learner';

/** The document without the envelope, and the envelope as found (undefined when absent). */
export function splitDoc(doc: unknown): { progress: unknown; learner: unknown } {
  if (!isObj(doc) || !(LEARNER_FIELD in doc)) return { progress: doc, learner: undefined };
  const { [LEARNER_FIELD]: learner, ...progress } = doc;
  return { progress, learner };
}

/** The document to store or export: progress, plus the envelope when there is one. */
export function joinDoc(p: Progress, learner: unknown): Progress | (Progress & { learner: unknown }) {
  return learner === undefined ? p : { ...p, [LEARNER_FIELD]: learner };
}

/** A progress file's text, as Export writes it. */
export function backupText(p: Progress, learner: LearnerState | undefined): string {
  return `${JSON.stringify(joinDoc(p, learner), null, 2)}\n`;
}

export type BackupResult =
  | { ok: true; progress: Progress; warnings: string[]; learner: LearnerState | null }
  | { ok: false; errors: string[] };

/**
 * Reads a progress file: the progress document through the package importer (so an old
 * version is migrated), and the envelope when the file has one; a file without one (from an
 * older build) imports as before, with `learner` null.
 */
export function readBackup(text: string, knownTopicIds: readonly string[]): BackupResult {
  if (text.length > MAX_IMPORT_BYTES) return { ok: false, errors: [`input is ${text.length} characters, more than the ${MAX_IMPORT_BYTES} allowed`] };
  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch (e) {
    return { ok: false, errors: [`not valid JSON: ${e instanceof Error ? e.message : String(e)}`] };
  }
  const { progress, learner } = splitDoc(doc);
  const r = importProgress(progress, { knownTopicIds });
  if (!r.ok) return r;
  if (learner === undefined) return { ok: true, progress: r.value, warnings: r.warnings, learner: null };
  const l = parseLearner(learner);
  if (!l.ok) return { ok: false, errors: [l.error] };
  return { ok: true, progress: r.value, warnings: r.warnings, learner: l.value };
}
