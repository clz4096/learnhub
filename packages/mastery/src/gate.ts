/**
 * The Cambridge gate (decisions of 2026-10-05, mastery/TEACHING-STYLE.md): a topic is
 * mastered only when its drills are passed (it has a memory state) AND one of its gate
 * problems is done to Cambridge standard. That is either
 * - an auto-checked gate problem solved unaided: a right answer given before the worked
 *   solution was ever shown (mastery/HOW-A-TOPIC-WORKS.md, rule 3, approved 2026-10-08). A
 *   miss shows a nudge and, on request, hints, never the solution, so a right answer after
 *   misses and hints still counts; the hints it used are kept in the evidence. "Show me the
 *   solution" (`ItemData.solution`) means the problem can no longer count; or
 * - a supervised write-up of a gate problem marked `GATE_PASS_MARK` or more out of 20.
 *
 * Mastery is read from evidence in the document, never stored: so a merge of two copies
 * needs no rule of its own (history and supervision already merge as joins), and the
 * re-gating of documents mastered under the old rule is simply that they hold no
 * evidence yet. Their memory and review schedule are kept; they read as `needs-gate`.
 *
 * Gym work (`gym` entries) and generated drills never count: only `cambridge` entries and
 * supervision results are read here.
 *
 * The gate problems of a topic come from its content (`TopicContent.gate`); this module
 * takes them as problem ids so the engine stays independent of the content package. For the
 * same reason it takes the content's map of moved problems as a `KeyResolver`: a problem that
 * moved topic keeps its old key in the history and supervision it already holds, and every
 * read here sees that key as the current one. The document is never rewritten, so a merge
 * stays a join whatever map either copy was written under.
 */
import { SUPERVISION_PASS_MARK, type HistoryEntry, type Progress } from './progress';

/** A supervised write-up of a gate problem passes the gate at this mark or above: the supervision pass mark, 14 of 20. */
export const GATE_PASS_MARK = SUPERVISION_PASS_MARK;

/** What met the gate: the problem key ("topic id/problem id") and when; for an auto-checked answer, the hints it used. */
export type GateEvidence =
  | { kind: 'auto'; problem: string; at: number; hints: number }
  | { kind: 'supervision'; problem: string; at: number; mark: number };

/**
 * - `unlearned`: the drills are not passed (no memory state).
 * - `needs-gate`: the drills are passed, but no gate problem is done yet. The topic is
 *   reviewed and unlocks what builds on it, but does not count as mastered.
 * - `mastered`: both.
 */
export type MasteryStage = 'unlearned' | 'needs-gate' | 'mastered';

export interface GateStatus {
  stage: MasteryStage;
  /** The earliest evidence that met the gate, whatever the stage; null when none. */
  evidence: GateEvidence | null;
  /** How many gate problems the topic has. 0 means the gate cannot be met until one is written. */
  candidates: number;
}

/** The document fields the gate reads. */
export type GateDoc = Pick<Progress, 'memory' | 'history' | 'supervision'>;

/** The current key of a problem key: the key itself, or where the problem moved to. */
export type KeyResolver = (key: string) => string;

/** The resolver for documents and content with no moved problem. */
export const sameKey: KeyResolver = (key) => key;

/** A Cambridge problem's key across the app, as `PROBLEM_KEY_RE` reads it. */
export const gateKey = (topicId: string, problemId: string): string => `${topicId}/${problemId}`;

/**
 * The answer that solved one problem unaided, from all the `cambridge` entries on it: the
 * earliest right answer, if it came strictly before the first entry that showed the solution.
 * A reveal at the same millisecond as a right answer counts as first, so a tie never helps.
 * Of several right answers at that earliest time, the one with fewest hints. Undefined when
 * none counts. Read from the whole history, so it is the same after any merge.
 */
export function unaidedAnswer(entries: readonly HistoryEntry[]): HistoryEntry | undefined {
  let right: HistoryEntry | undefined;
  let reveal = Infinity;
  for (const h of entries) {
    if (h.item?.solution === true) reveal = Math.min(reveal, h.at);
    if (h.correct && (right === undefined || h.at < right.at || (h.at === right.at && (h.item?.hints ?? 0) < (right.item?.hints ?? 0)))) right = h;
  }
  return right !== undefined && right.at < reveal ? right : undefined;
}

/** Whether `entries` (the `cambridge` entries on one problem) ever showed its solution. */
export const solutionShown = (entries: readonly HistoryEntry[]): boolean => entries.some((h) => h.item?.solution === true);

/** The `cambridge` entries on one problem, under its current key or any old one, in document order. */
export function cambridgeEntries(history: readonly HistoryEntry[], key: string, resolve: KeyResolver = sameKey): HistoryEntry[] {
  const k = resolve(key);
  return history.filter((h) => h.kind === 'cambridge' && h.item !== undefined && resolve(h.item.id) === k);
}

/**
 * The earliest evidence that `topicId` met its gate, given its gate problem ids; null when
 * there is none. Reads `cambridge` history entries and imported supervision results only,
 * each by the current key of the problem it names (`resolve`), which the evidence reports.
 */
export function gateEvidence(
  p: Pick<GateDoc, 'history' | 'supervision'>, topicId: string, gate: readonly string[], resolve: KeyResolver = sameKey,
): GateEvidence | null {
  const keys = new Set(gate.map((id) => gateKey(topicId, id)));
  if (keys.size === 0) return null;
  const found: GateEvidence[] = [];
  const byKey = new Map<string, HistoryEntry[]>();
  for (const h of p.history) {
    if (h.kind !== 'cambridge' || h.item === undefined) continue;
    const key = resolve(h.item.id);
    if (!keys.has(key)) continue;
    const list = byKey.get(key);
    if (list === undefined) byKey.set(key, [h]);
    else list.push(h);
  }
  for (const [problem, entries] of byKey) {
    const right = unaidedAnswer(entries);
    if (right !== undefined) found.push({ kind: 'auto', problem, at: right.at, hints: right.item?.hints ?? 0 });
  }
  for (const a of p.supervision) {
    if (a.result === null || a.importedAt === null || a.result.mark < GATE_PASS_MARK) continue;
    const key = resolve(a.problem);
    if (keys.has(key)) found.push({ kind: 'supervision', problem: key, at: a.importedAt, mark: a.result.mark });
  }
  // Earliest first; ties by problem key, then auto before supervision, so the pick is deterministic.
  found.sort((x, y) => x.at - y.at || (x.problem < y.problem ? -1 : x.problem > y.problem ? 1 : 0) || (x.kind === y.kind ? 0 : x.kind === 'auto' ? -1 : 1));
  return found[0] ?? null;
}

/** Where `topicId` stands against the gate. */
export function gateStatus(p: GateDoc, topicId: string, gate: readonly string[], resolve: KeyResolver = sameKey): GateStatus {
  const evidence = gateEvidence(p, topicId, gate, resolve);
  const stage: MasteryStage = p.memory[topicId] === undefined ? 'unlearned' : evidence === null ? 'needs-gate' : 'mastered';
  return { stage, evidence, candidates: new Set(gate).size };
}

/** Whether `topicId` is mastered: drills passed and the gate met. */
export function isMastered(p: GateDoc, topicId: string, gate: readonly string[], resolve: KeyResolver = sameKey): boolean {
  return gateStatus(p, topicId, gate, resolve).stage === 'mastered';
}

/** The learned topics still waiting for their gate, in id order. */
export function needsGate(p: GateDoc, gateOf: (topicId: string) => readonly string[], resolve: KeyResolver = sameKey): string[] {
  return Object.keys(p.memory).filter((id) => gateEvidence(p, id, gateOf(id), resolve) === null).sort();
}
