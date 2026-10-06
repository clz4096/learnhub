/**
 * The Cambridge gate (decisions of 2026-10-05, mastery/TEACHING-STYLE.md): a topic is
 * mastered only when its drills are passed (it has a memory state) AND one of its gate
 * problems is done to Cambridge standard. That is either
 * - an auto-checked gate problem solved unaided: the first answer the document holds to
 *   that problem is right, with no hints. Any earlier answer showed the worked solution
 *   (a miss and "show the solution" both do), so a later right answer is not unaided; or
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
 * takes them as problem ids so the engine stays independent of the content package.
 */
import { SUPERVISION_PASS_MARK, type HistoryEntry, type Progress } from './progress';

/** A supervised write-up of a gate problem passes the gate at this mark or above: the supervision pass mark, 14 of 20. */
export const GATE_PASS_MARK = SUPERVISION_PASS_MARK;

/** What met the gate: the problem key ("topic id/problem id") and when. */
export type GateEvidence =
  | { kind: 'auto'; problem: string; at: number }
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

/** A Cambridge problem's key across the app, as `PROBLEM_KEY_RE` reads it. */
export const gateKey = (topicId: string, problemId: string): string => `${topicId}/${problemId}`;

/**
 * Whether the answers to one problem show it solved unaided: the first answer is right with
 * no hints. Answers at the same millisecond put a miss first, so a tie never helps.
 */
function firstAnswer(entries: readonly HistoryEntry[]): HistoryEntry | undefined {
  let first: HistoryEntry | undefined;
  for (const h of entries) {
    if (first === undefined || h.at < first.at || (h.at === first.at && first.correct && !h.correct)) first = h;
  }
  return first;
}

/**
 * The earliest evidence that `topicId` met its gate, given its gate problem ids; null when
 * there is none. Reads `cambridge` history entries and imported supervision results only.
 */
export function gateEvidence(p: Pick<GateDoc, 'history' | 'supervision'>, topicId: string, gate: readonly string[]): GateEvidence | null {
  const keys = new Set(gate.map((id) => gateKey(topicId, id)));
  if (keys.size === 0) return null;
  const found: GateEvidence[] = [];
  const byKey = new Map<string, HistoryEntry[]>();
  for (const h of p.history) {
    if (h.kind !== 'cambridge' || h.item === undefined || !keys.has(h.item.id)) continue;
    const list = byKey.get(h.item.id);
    if (list === undefined) byKey.set(h.item.id, [h]);
    else list.push(h);
  }
  for (const [problem, entries] of byKey) {
    const first = firstAnswer(entries);
    if (first !== undefined && first.correct && first.item?.hints === 0) found.push({ kind: 'auto', problem, at: first.at });
  }
  for (const a of p.supervision) {
    if (a.result === null || a.importedAt === null || !keys.has(a.problem) || a.result.mark < GATE_PASS_MARK) continue;
    found.push({ kind: 'supervision', problem: a.problem, at: a.importedAt, mark: a.result.mark });
  }
  // Earliest first; ties by problem key, then auto before supervision, so the pick is deterministic.
  found.sort((x, y) => x.at - y.at || (x.problem < y.problem ? -1 : x.problem > y.problem ? 1 : 0) || (x.kind === y.kind ? 0 : x.kind === 'auto' ? -1 : 1));
  return found[0] ?? null;
}

/** Where `topicId` stands against the gate. */
export function gateStatus(p: GateDoc, topicId: string, gate: readonly string[]): GateStatus {
  const evidence = gateEvidence(p, topicId, gate);
  const stage: MasteryStage = p.memory[topicId] === undefined ? 'unlearned' : evidence === null ? 'needs-gate' : 'mastered';
  return { stage, evidence, candidates: new Set(gate).size };
}

/** Whether `topicId` is mastered: drills passed and the gate met. */
export function isMastered(p: GateDoc, topicId: string, gate: readonly string[]): boolean {
  return gateStatus(p, topicId, gate).stage === 'mastered';
}

/** The learned topics still waiting for their gate, in id order. */
export function needsGate(p: GateDoc, gateOf: (topicId: string) => readonly string[]): string[] {
  return Object.keys(p.memory).filter((id) => gateEvidence(p, id, gateOf(id)) === null).sort();
}
