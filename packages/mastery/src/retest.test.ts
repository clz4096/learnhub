import { describe, expect, it } from 'vitest';
import { gateKey, gateStatus, isMastered } from './gate';
import { DAY_MS, newMemory } from './memory';
import { canonicalJson, mergeProgress } from './merge';
import { exportProgress, importProgress, newProgress, type HistoryEntry, type Progress, type SupervisionAttempt } from './progress';
import { RETEST_DAYS, retestPassRate, retestState } from './retest';
import { mulberry32, randInt, type Rng } from './rng';

const NOW = Date.UTC(2026, 9, 5, 9);
const T = 'prob.bayes-formula';
const GATE = ['q1', 'q2', 'q3'] as const;
const D7 = RETEST_DAYS[0] * DAY_MS;
const D30 = RETEST_DAYS[1] * DAY_MS;

function learned(): Progress {
  const p = newProgress('mastery', NOW);
  p.memory = { [T]: newMemory(NOW) };
  return p;
}

const cam = (at: number, problem: string, correct: boolean, solution = false): HistoryEntry => ({
  at, kind: 'cambridge', topicId: T, correct, item: { id: gateKey(T, problem), hints: 0, attempt: 1, ...(solution ? { solution: true as const } : {}) },
});
const reveal = (at: number, problem: string): HistoryEntry => cam(at, problem, false, true);
const key = (id: string): string => gateKey(T, id);

function sup(problem: string, mark: number, at: number, nonce: string, gap?: string): SupervisionAttempt {
  return {
    problem: key(problem), nonce, writeUp: 'w', copiedAt: at - 1000,
    result: { mark, weakPoints: ['a', 'b', 'c'], redo: [], summary: 's', ...(gap === undefined ? {} : { gap }) }, importedAt: at,
  };
}

const doc = (history: HistoryEntry[], supervision: SupervisionAttempt[] = []): Progress => ({ ...learned(), history, supervision });

describe('cold retests (rule 6)', () => {
  it('a first solve masters the topic and sets the 7-day retest on a different problem', () => {
    const s = retestState(doc([cam(NOW, 'q2', true)]), T, GATE);
    expect(s).toEqual({ phase: 'mastered', masteredAt: NOW, log: [], missed: null, next: { step: 1, due: NOW + D7, problems: [key('q1'), key('q3')] } });
  });

  it('an untouched problem comes before one already answered', () => {
    const s = retestState(doc([cam(NOW - 5, 'q1', false), cam(NOW, 'q2', true)]), T, GATE);
    expect(s.next?.problems).toEqual([key('q3'), key('q1')]);
  });

  it('an answer before the due time decides nothing; the first answer on a candidate after it does', () => {
    const early = doc([cam(NOW, 'q2', true), cam(NOW + DAY_MS, 'q1', false)]);
    expect(retestState(early, T, GATE).phase).toBe('mastered');
    expect(retestState(early, T, GATE).log).toEqual([]);
    // After the due time an answer to the problem that mastered it is not the retest either.
    const same = doc([cam(NOW, 'q2', true), cam(NOW + D7 + 1, 'q2', false)]);
    expect(retestState(same, T, GATE).log).toEqual([]);
    const pass = doc([cam(NOW, 'q2', true), cam(NOW + D7 + 1, 'q3', true)]);
    expect(retestState(pass, T, GATE).log).toEqual([{ step: 1, due: NOW + D7, at: NOW + D7 + 1, outcome: 'passed', problem: key('q3') }]);
  });

  it('pass at 7 days, then the 30-day retest avoids the problem just passed', () => {
    const s = retestState(doc([cam(NOW, 'q2', true), cam(NOW + D7, 'q1', true)]), T, GATE);
    expect(s.phase).toBe('mastered');
    expect(s.next).toEqual({ step: 2, due: NOW + D30, problems: [key('q3'), key('q2')] });
  });

  it('a late first retest pushes the second at least 7 days past it', () => {
    const late = NOW + 28 * DAY_MS;
    const s = retestState(doc([cam(NOW, 'q2', true), cam(late, 'q1', true)]), T, GATE);
    expect(s.next?.due).toBe(late + D7);
  });

  it('both retests passed: mastered, nothing more due', () => {
    const s = retestState(doc([cam(NOW, 'q2', true), cam(NOW + D7, 'q1', true), cam(NOW + D30, 'q3', true)]), T, GATE);
    expect(s.phase).toBe('mastered');
    expect(s.next).toBeNull();
    expect(s.log.map((r) => r.outcome)).toEqual(['passed', 'passed']);
  });

  it('a miss sends the topic to needs review; a right answer on the missed problem masters it again and restarts the retests', () => {
    const missAt = NOW + D7 + 5;
    const p = doc([cam(NOW, 'q2', true), cam(missAt, 'q1', false)]);
    expect(retestState(p, T, GATE)).toMatchObject({ phase: 'needs-review', missed: key('q1'), next: null });
    expect(gateStatus(p, T, GATE).stage).toBe('needs-review');
    expect(isMastered(p, T, GATE)).toBe(false);
    p.history.push(cam(missAt + 60_000, 'q1', true));
    const s = retestState(p, T, GATE);
    expect(s).toMatchObject({ phase: 'mastered', masteredAt: missAt + 60_000, missed: null });
    expect(s.next).toEqual({ step: 1, due: missAt + 60_000 + D7, problems: [key('q3'), key('q2')] });
    expect(gateStatus(p, T, GATE).stage).toBe('mastered');
  });

  it('in needs review, re-entering a problem solved before the miss does not count; a new one does', () => {
    const missAt = NOW + D7;
    const p = doc([cam(NOW, 'q2', true), cam(missAt, 'q1', false), cam(missAt + 1, 'q2', true)]);
    expect(retestState(p, T, GATE).phase).toBe('needs-review');
    p.history.push(cam(missAt + 2, 'q3', true));
    expect(retestState(p, T, GATE).phase).toBe('mastered');
  });

  it('"Show me the solution" on the retest problem is a miss, and that problem can no longer master it again', () => {
    const p = doc([cam(NOW, 'q2', true), reveal(NOW + D7, 'q1'), cam(NOW + D7 + 1, 'q1', true)]);
    expect(retestState(p, T, GATE)).toMatchObject({ phase: 'needs-review', missed: key('q1') });
  });

  it('a supervision result decides a retest: 14 or more passes, below misses, below with a gap decides nothing', () => {
    const base = [cam(NOW, 'q2', true)];
    expect(retestState(doc(base, [sup('q1', 14, NOW + D7, 'ABCDEFGH')]), T, GATE).log[0]?.outcome).toBe('passed');
    expect(retestState(doc(base, [sup('q1', 13, NOW + D7, 'ABCDEFGH')]), T, GATE).phase).toBe('needs-review');
    const gap = retestState(doc(base, [sup('q1', 9, NOW + D7, 'ABCDEFGH', 'proof.direct')]), T, GATE);
    expect(gap.phase).toBe('mastered');
    expect(gap.log).toEqual([]);
  });

  it('one gate problem: reused when its solution was never shown', () => {
    const s = retestState(doc([cam(NOW, 'q1', true)]), T, ['q1']);
    expect(s.next).toEqual({ step: 1, due: NOW + D7, problems: [key('q1')] });
    const pass = retestState(doc([cam(NOW, 'q1', true), cam(NOW + D7, 'q1', true)]), T, ['q1']);
    expect(pass.log[0]?.outcome).toBe('passed');
  });

  it('one gate problem whose solution was shown: both retests skipped and recorded, the topic stays mastered', () => {
    const s = retestState(doc([cam(NOW, 'q1', true), reveal(NOW + 1, 'q1')]), T, ['q1']);
    expect(s.phase).toBe('mastered');
    expect(s.next).toBeNull();
    expect(s.log).toEqual([
      { step: 1, due: NOW + D7, at: NOW + D7, outcome: 'skipped', problem: null, reason: 'only-problem-seen' },
      { step: 2, due: NOW + D30, at: NOW + D30, outcome: 'skipped', problem: null, reason: 'only-problem-seen' },
    ]);
  });

  it('every other problem seen: skipped with that reason; a reveal after the due time leaves the open retest to its answer', () => {
    const s = retestState(doc([cam(NOW, 'q1', true), reveal(NOW + 1, 'q2')]), T, ['q1', 'q2']);
    expect(s.log.map((r) => [r.step, r.outcome, r.reason])).toEqual([[1, 'skipped', 'all-others-seen'], [2, 'skipped', 'all-others-seen']]);
    // q2 still open at the due time: the retest is pending until an answer.
    const open = retestState(doc([cam(NOW, 'q1', true)]), T, ['q1', 'q2']);
    expect(open.next?.problems).toEqual([key('q2')]);
  });

  it('a topic not yet mastered has no retest', () => {
    expect(retestState(doc([cam(NOW, 'q1', false)]), T, GATE)).toEqual({ phase: 'unmastered', masteredAt: null, log: [], missed: null, next: null });
    expect(retestState(doc([cam(NOW, 'q1', true)]), T, [])).toMatchObject({ phase: 'unmastered', next: null });
  });

  it('a migrated document schedules old masteries from its anchor, not from the mastery', () => {
    const from = NOW + 200 * DAY_MS;
    const p = { ...doc([cam(NOW, 'q2', true), cam(NOW + 10 * DAY_MS, 'q1', false)]), retestsFrom: from };
    const s = retestState(p, T, GATE);
    expect(s.phase).toBe('mastered');
    expect(s.next?.due).toBe(from + D7);
    // Through import: a version 6 document migrated at `from`.
    const d = JSON.parse(exportProgress(p));
    d.version = 6;
    delete d.retestsFrom;
    const r = importProgress(d, { now: from });
    expect(r.ok && retestState(r.value, T, GATE).next?.due).toBe(from + D7);
  });

  it('a reveal and a right answer at the same millisecond: the reveal first, so no pass', () => {
    const s = retestState(doc([cam(NOW, 'q2', true), cam(NOW + D7, 'q1', true), reveal(NOW + D7, 'q1')]), T, GATE);
    expect(s.phase).toBe('needs-review');
  });

  it('the pass rate counts passes and misses, not skips', () => {
    const a = retestState(doc([cam(NOW, 'q2', true), cam(NOW + D7, 'q1', true), cam(NOW + D30, 'q3', false)]), T, GATE);
    const b = retestState(doc([cam(NOW, 'q1', true), reveal(NOW + 1, 'q1')]), T, ['q1']);
    expect(retestPassRate([a, b])).toEqual({ passed: 1, taken: 2, rate: 0.5 });
    expect(retestPassRate([b])).toBeNull();
  });
});

// ---------------------------------------------------------------- property tests

const PROBS = ['q1', 'q2', 'q3'];
const NONCES = ['ABCDEFGH', 'JKMNPQRS', 'TVWXYZ23', '456789AB', 'CDEFGHJK', 'MNPQRSTV'];
const pick = <X>(rng: Rng, xs: readonly X[]): X => xs[randInt(rng, 0, xs.length - 1)] as X;
/** Times over 60 days, from a coarse set so devices collide on them. */
const when = (rng: Rng): number => NOW + randInt(rng, 0, 120) * (DAY_MS / 2);

function change(rng: Rng, p: Progress): Progress {
  const q = JSON.parse(JSON.stringify(p)) as Progress;
  const r = rng();
  if (r < 0.75) q.history.push(cam(when(rng), pick(rng, PROBS), rng() < 0.6, rng() < 0.15));
  else if (r < 0.9) {
    const free = NONCES.filter((n) => !q.supervision.some((a) => a.nonce === n));
    if (free.length > 0) q.supervision.push(sup(pick(rng, PROBS), randInt(rng, 8, 20), when(rng), pick(rng, free), rng() < 0.3 ? 'proof.direct' : undefined));
  } else q.retestsFrom = when(rng);
  return q;
}

function copies(seed: number): [Progress, Progress, Progress] {
  const rng = mulberry32(seed);
  let base = learned();
  for (let i = randInt(rng, 0, 6); i > 0; i--) base = change(rng, base);
  const one = (): Progress => {
    let x = base;
    for (let i = randInt(rng, 0, 8); i > 0; i--) x = change(rng, x);
    return x;
  };
  return [one(), one(), one()];
}

describe('retests read the same from every merge order (property tests)', () => {
  const RUNS = 300;
  const read = (p: Progress): string => canonicalJson([retestState(p, T, GATE), gateStatus(p, T, GATE).stage]);

  it('commutative, associative, idempotent: one state whatever order the copies meet in', () => {
    for (let s = 0; s < RUNS; s++) {
      const [a, b, c] = copies(s);
      const ab = mergeProgress(a, b);
      expect(read(ab)).toBe(read(mergeProgress(b, a)));
      expect(read(mergeProgress(ab, c))).toBe(read(mergeProgress(a, mergeProgress(b, c))));
      expect(read(mergeProgress(ab, ab))).toBe(read(ab));
      expect(read(mergeProgress(a, a))).toBe(read(a));
    }
  });

  it('the fold reads content, not list order: shuffled history and supervision give the same state', () => {
    for (let s = 0; s < RUNS; s++) {
      const [a] = copies(s);
      const rng = mulberry32(s + 7);
      const shuffle = <X>(xs: readonly X[]): X[] => {
        const out = [...xs];
        for (let i = out.length - 1; i > 0; i--) {
          const j = randInt(rng, 0, i);
          [out[i], out[j]] = [out[j] as X, out[i] as X];
        }
        return out;
      };
      expect(read({ ...a, history: shuffle(a.history), supervision: shuffle(a.supervision) })).toBe(read(a));
    }
  });

  it('invariants: needs review only after a recorded miss; a skip names no problem; retests decided in time order', () => {
    for (let s = 0; s < RUNS; s++) {
      const [a, b] = copies(s);
      const st = retestState(mergeProgress(a, b), T, GATE);
      if (st.phase === 'needs-review') expect(st.log.at(-1)?.outcome).toBe('missed');
      for (const r of st.log) {
        expect(r.outcome === 'skipped' ? r.problem === null && r.at === r.due : r.problem !== null && r.at >= r.due).toBe(true);
      }
      expect(st.log.map((r) => r.at)).toEqual([...st.log.map((r) => r.at)].sort((x, y) => x - y));
    }
  });
});
