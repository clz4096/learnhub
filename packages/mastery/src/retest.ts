/**
 * Cold retests (mastery/HOW-A-TOPIC-WORKS.md, rule 6, approved 2026-10-08): mastery has to
 * last. About `RETEST_DAYS[0]` days after a topic is mastered, a different gate problem of
 * that topic comes back cold, with no lesson first; again at about `RETEST_DAYS[1]` days.
 * A pass keeps the topic mastered. A miss sends it to `needs-review`; the next gate problem
 * solved masters it again, and the retests start over from then.
 *
 * Like the gate, this is read from evidence, never stored: one fold, in time order, over the
 * topic's gate events (the `cambridge` answers and the imported supervision results on its
 * gate problems). A merge therefore needs no rule of its own: history and supervision merge
 * as joins, the fold is a function of their contents, and its event order is a total order
 * on content, so both devices compute the same state whatever order the copies met in.
 *
 * The rules of the fold, in order:
 * - A solve is a right answer to a problem whose solution had not been shown (a reveal at
 *   the same millisecond counts first, as in gate.ts), or a supervision mark of
 *   `GATE_PASS_MARK` or more. The first solve masters the topic.
 * - A cycle's anchor is when it was mastered, or `retestsFrom` if later: a document migrated
 *   from version 6 has its old masteries retested from the day it was migrated, not at once.
 * - Retest 1 is due at anchor + 7 days. Retest 2 at anchor + 30 days, and never sooner than
 *   7 days after retest 1 was decided, so a late first retest is not followed by the second
 *   the next morning.
 * - At a due time the candidates are the gate problems whose solution has not been shown,
 *   other than the problem of the last solve that mastered the topic or passed a retest
 *   ("a different problem"). A topic with one gate problem may reuse it, if its solution has
 *   never been shown. Candidates never solved come first, then never answered, then gate
 *   order. None: the retest is skipped, recorded with the reason, and the next one is due.
 * - The first answer or supervision result at or after the due time on a candidate decides
 *   it: right is a pass; wrong, or "Show me the solution", is a miss. Answers to other
 *   problems before or after do not decide it. A supervision mark below the pass mark that
 *   names an earlier topic as the gap (`SupervisionResult.gap`) decides nothing, as it is
 *   not held against this topic anywhere else.
 * - In `needs-review`, a solve of the missed problem, or of a gate problem never solved
 *   before, masters the topic again. Re-entering the answer to a problem solved before
 *   the miss does not: that tests recall of an answer, not of the topic.
 * - After both retests pass the topic stays mastered with nothing further due.
 *
 * A skip is decided at its due time from the evidence before it; a due time still ahead is
 * read the same way, so a pending skip is what will happen unless a problem is answered first.
 */
import type { KeyResolver } from './gate';
import { DAY_MS } from './memory';
import { SUPERVISION_PASS_MARK, type Progress } from './progress';

// gate.ts reads this module, so its helpers are restated here rather than imported: the
// gate pass mark is the supervision pass mark, and a problem key is "topic id/problem id".
const GATE_PASS_MARK = SUPERVISION_PASS_MARK;
const gateKey = (topicId: string, problemId: string): string => `${topicId}/${problemId}`;
const sameKey: KeyResolver = (key) => key;

/** Days after mastery that the two cold retests fall due. */
export const RETEST_DAYS: readonly [number, number] = [7, 30];

/** The document fields the retest fold reads. `retestsFrom` absent reads as 0 (no migration anchor). */
export type RetestDoc = Pick<Progress, 'history' | 'supervision'> & Partial<Pick<Progress, 'retestsFrom'>>;

export type RetestOutcome = 'passed' | 'missed' | 'skipped';

/** Why a retest was skipped. */
export type SkipReason =
  /** The topic's only gate problem had its solution shown. */
  | 'only-problem-seen'
  /** Every other gate problem had its solution shown. */
  | 'all-others-seen';

/** One retest, decided. */
export interface RetestRecord {
  /** 1 for the 7-day retest, 2 for the 30-day one. */
  step: 1 | 2;
  due: number;
  /** When it was decided: the answer's time, or the due time for a skip. */
  at: number;
  outcome: RetestOutcome;
  /** The problem answered (current key); null for a skip. */
  problem: string | null;
  /** Set for a skip. */
  reason?: SkipReason;
}

export type RetestPhase = 'unmastered' | 'mastered' | 'needs-review';

export interface RetestState {
  phase: RetestPhase;
  /** When the current cycle was mastered (the solve, not the anchor); null when unmastered. */
  masteredAt: number | null;
  /** Every retest decided, oldest first, across every cycle. */
  log: RetestRecord[];
  /** The retest pending in this cycle, with its candidates best first; null when none is pending. */
  next: { step: 1 | 2; due: number; problems: string[] } | null;
  /** In `needs-review`: the problem whose miss sent it there. */
  missed: string | null;
}

interface GateEvent {
  at: number;
  problem: string;
  /** A right answer or a passing mark. */
  right: boolean;
  /** The answer showed the solution. */
  reveal: boolean;
  /** A supervision mark below the pass mark that named an earlier topic: decides nothing. */
  neutral: boolean;
}

const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Time order, then a total order on content: at one millisecond a reveal comes before a
 * right answer (so a tie never helps, as in `unaidedAnswer`), then wrong before right.
 */
function order(x: GateEvent, y: GateEvent): number {
  return x.at - y.at || Number(y.reveal) - Number(x.reveal) || Number(x.right) - Number(y.right)
    || Number(x.neutral) - Number(y.neutral) || cmp(x.problem, y.problem);
}

function events(p: RetestDoc, keys: ReadonlySet<string>, resolve: KeyResolver): GateEvent[] {
  const out: GateEvent[] = [];
  for (const h of p.history) {
    if (h.kind !== 'cambridge' || h.item === undefined) continue;
    const problem = resolve(h.item.id);
    if (!keys.has(problem)) continue;
    const reveal = h.item.solution === true;
    // An entry that showed the solution is never a solve, whatever its `correct`.
    out.push({ at: h.at, problem, right: h.correct && !reveal, reveal, neutral: false });
  }
  for (const a of p.supervision) {
    if (a.result === null || a.importedAt === null) continue;
    const problem = resolve(a.problem);
    if (!keys.has(problem)) continue;
    const right = a.result.mark >= GATE_PASS_MARK;
    out.push({ at: a.importedAt, problem, right, reveal: false, neutral: !right && a.result.gap !== undefined });
  }
  return out.sort(order);
}

/**
 * Where `topicId` stands on its cold retests, given its gate problem ids. Pure; reads the
 * document's history and supervision by the current key of each problem (`resolve`).
 */
export function retestState(p: RetestDoc, topicId: string, gate: readonly string[], resolve: KeyResolver = sameKey): RetestState {
  const keys = [...new Set(gate.map((id) => gateKey(topicId, id)))];
  const keySet = new Set(keys);
  const from = p.retestsFrom ?? 0;
  const log: RetestRecord[] = [];
  const revealed = new Set<string>();
  const solved = new Set<string>();
  const touched = new Set<string>();

  // In an object, not a `let`: the closures below change it, which flow analysis cannot see.
  const st: { phase: RetestPhase } = { phase: 'unmastered' };
  let masteredAt: number | null = null;
  let anchor = 0;
  let step: 1 | 2 | 3 = 1;
  let due = Infinity;
  let last = '';
  let missed: string | null = null;

  const candidates = (): string[] => {
    const open = keys.filter((k) => !revealed.has(k) && (keys.length === 1 || k !== last));
    const rank = (k: string): number => (solved.has(k) ? 2 : 0) + (touched.has(k) ? 1 : 0);
    return open.sort((a, b) => rank(a) - rank(b) || keys.indexOf(a) - keys.indexOf(b));
  };
  const master = (at: number, problem: string): void => {
    st.phase = 'mastered';
    masteredAt = at;
    anchor = Math.max(at, from);
    step = 1;
    due = anchor + RETEST_DAYS[0] * DAY_MS;
    last = problem;
    missed = null;
  };
  const advance = (decidedAt: number): void => {
    if (step === 1) {
      step = 2;
      due = Math.max(anchor + RETEST_DAYS[1] * DAY_MS, decidedAt + RETEST_DAYS[0] * DAY_MS);
    } else {
      step = 3;
      due = Infinity;
    }
  };
  /** Skips every retest due by `t` (inclusive) that has no candidate. */
  const skipDue = (t: number): void => {
    while (st.phase === 'mastered' && step < 3 && due <= t && candidates().length === 0) {
      log.push({ step: step as 1 | 2, due, at: due, outcome: 'skipped', problem: null, reason: keys.length === 1 ? 'only-problem-seen' : 'all-others-seen' });
      advance(due);
    }
  };

  if (keys.length > 0) {
    for (const e of events(p, keySet, resolve)) {
      skipDue(e.at);
      const solve = e.right && !revealed.has(e.problem);
      if (st.phase === 'unmastered') {
        if (solve) master(e.at, e.problem);
      } else if (st.phase === 'mastered') {
        if (step < 3 && e.at >= due && !e.neutral && candidates().includes(e.problem)) {
          const s = step as 1 | 2;
          if (solve) {
            log.push({ step: s, due, at: e.at, outcome: 'passed', problem: e.problem });
            last = e.problem;
            advance(e.at);
          } else {
            log.push({ step: s, due, at: e.at, outcome: 'missed', problem: e.problem });
            st.phase = 'needs-review';
            missed = e.problem;
            step = 3;
            due = Infinity;
          }
        }
      } else if (solve && (e.problem === missed || !solved.has(e.problem))) {
        master(e.at, e.problem);
      }
      if (solve) solved.add(e.problem);
      if (e.reveal) revealed.add(e.problem);
      touched.add(e.problem);
    }
    // Skips due after the last event are decided from everything known now.
    skipDue(Infinity);
  }

  const pending = st.phase === 'mastered' && step < 3 ? candidates() : [];
  return {
    phase: st.phase, masteredAt, log, missed,
    next: pending.length > 0 ? { step: step as 1 | 2, due, problems: pending } : null,
  };
}

/** The share of decided retests (skips aside) that passed, and how many there were; null with none. */
export function retestPassRate(states: readonly RetestState[]): { passed: number; taken: number; rate: number } | null {
  let passed = 0;
  let taken = 0;
  for (const s of states) {
    for (const r of s.log) {
      if (r.outcome === 'skipped') continue;
      taken++;
      if (r.outcome === 'passed') passed++;
    }
  }
  return taken === 0 ? null : { passed, taken, rate: passed / taken };
}
