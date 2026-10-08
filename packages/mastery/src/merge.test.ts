import { describe, expect, it } from 'vitest';
import { DAY_MS, newMemory } from './memory';
import { canonicalJson, mergeProgress, sameProgress } from './merge';
import { gateEvidence } from './gate';
import {
  CHOICE_FIELDS, exportProgress, importProgress, newProgress, resetProgress, withChoices,
  type HistoryEntry, type Progress, type SessionTask, type SupervisionResult,
} from './progress';
import { mulberry32, randInt, type Rng } from './rng';

const T0 = Date.UTC(2026, 9, 5, 8);
const TOPICS = ['pre.fractions', 'pre.indices', 'pre.sequences', 'prob.bayes-formula', 'prob.event-spaces'];
const PROBLEMS = ['pre.fractions/q1', 'pre.indices/q2', 'prob.bayes-formula/q3', 'prob.event-spaces/q4-definitions'];
const NONCES = ['ABCDEFGH', 'JKMNPQRS', 'TVWXYZ23', '456789AB', 'CDEFGHJK', 'MNPQRSTV'];
const COURSES = ['ia-probability', 'cst-discrete-maths'];
const KINDS = ['lesson', 'review', 'quiz', 'supervision', 'drill', 'cambridge', 'gym'] as const;

const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[randInt(rng, 0, xs.length - 1)] as T;
/** Times from a small set, so independent devices collide on them often. */
const time = (rng: Rng): number => T0 + randInt(rng, 0, 12) * 60_000;

function result(rng: Rng): SupervisionResult {
  const r: SupervisionResult = { mark: randInt(rng, 0, 20), weakPoints: ['a', 'b', pick(rng, ['c', 'd'])], redo: rng() < 0.5 ? [pick(rng, PROBLEMS)] : [], summary: pick(rng, ['Good.', 'Close.']) };
  // A mark below the pass mark may name a prerequisite gap, so the properties cover results with one.
  if (r.mark < 14 && rng() < 0.4) r.gap = pick(rng, ['proof.direct', 'pre.indices']);
  return r;
}

const TASKS: SessionTask[] = [
  { kind: 'review', topicIds: ['pre.indices'], minutes: 3, reason: 'Due.', done: false, passed: null },
  { kind: 'lesson', topicIds: ['pre.sequences'], minutes: 15, reason: 'New.', course: 'ia-probability', done: false, passed: null },
  { kind: 'quiz', topicIds: ['pre.fractions', 'pre.indices'], minutes: 4, reason: 'Quiz.', done: false, passed: null },
  { kind: 'lesson', topicIds: ['prob.event-spaces'], minutes: 12, reason: 'New.', done: false, passed: null },
];

/** One random change, of the kinds the app makes, so a device's copy drifts from the base. */
function step(rng: Rng, p: Progress): Progress {
  const q: Progress = JSON.parse(JSON.stringify(p)) as Progress;
  switch (randInt(rng, 0, 12)) {
    case 0: {
      const h: HistoryEntry = { at: time(rng), kind: pick(rng, KINDS), topicId: pick(rng, TOPICS), correct: rng() < 0.7 };
      // Item data, as version 5 records it, from a small set so copies collide on it.
      // Version 6 adds the solution flag: a Cambridge "Show me the solution".
      if (rng() < 0.5) h.item = { id: pick(rng, PROBLEMS), hints: randInt(rng, 0, 1), attempt: randInt(rng, 1, 2), ...(rng() < 0.5 ? { seed: randInt(rng, 0, 3) } : {}), ...(rng() < 0.5 ? { ms: randInt(rng, 0, 2) * 1000 } : {}), ...(rng() < 0.25 ? { solution: true as const } : {}) };
      q.history.push(h);
      if (h.kind === 'lesson' && h.correct) q.learnedSinceQuiz = [...q.learnedSinceQuiz.filter((x) => x !== h.topicId), h.topicId];
      break;
    }
    case 1: {
      const id = pick(rng, TOPICS);
      q.memory[id] = { ...newMemory(time(rng)), reps: randInt(rng, 0, 3), lapses: randInt(rng, 0, 1), intervalDays: pick(rng, [1, 3, 7]) };
      break;
    }
    case 2: {
      const free = NONCES.filter((n) => !q.supervision.some((a) => a.nonce === n));
      if (free.length === 0) break;
      const r = rng() < 0.4 ? result(rng) : null;
      q.supervision.push({ problem: pick(rng, PROBLEMS), nonce: pick(rng, free), writeUp: pick(rng, ['', 'x']), copiedAt: time(rng), result: r, importedAt: r === null ? null : time(rng) });
      break;
    }
    case 3: {
      const open = q.supervision.filter((a) => a.result === null);
      if (open.length === 0) break;
      const a = pick(rng, open);
      a.result = result(rng);
      a.importedAt = time(rng);
      break;
    }
    case 4:
      q.redos.push({ problem: pick(rng, PROBLEMS), from: pick(rng, NONCES), setAt: time(rng), due: time(rng) + DAY_MS, doneAt: null });
      break;
    case 5: {
      const open = q.redos.filter((d) => d.doneAt === null);
      if (open.length > 0) pick(rng, open).doneAt = time(rng);
      break;
    }
    case 6: {
      const f = pick(rng, CHOICE_FIELDS);
      const at = time(rng);
      if (f === 'budgetMinutes') return withChoices(q, { budgetMinutes: pick(rng, [30, 45, 90]) }, at);
      if (f === 'implicitCredit') return withChoices(q, { implicitCredit: rng() < 0.5 }, at);
      if (f === 'courseWeights') return withChoices(q, { courseWeights: { [pick(rng, COURSES)]: randInt(rng, 0, 3) } }, at);
      return withChoices(q, { courses: rng() < 0.5 ? [...COURSES] : [pick(rng, COURSES)] }, at);
    }
    case 7: {
      const c = pick(rng, COURSES);
      q.courseMinutes[c] = (q.courseMinutes[c] ?? 0) + randInt(rng, 1, 30);
      break;
    }
    case 8: {
      const day = pick(rng, ['2026-10-05', '2026-10-06']);
      const startedAt = pick(rng, [T0, T0 + 1000]);
      if (q.session === null || q.session.day !== day || q.session.startedAt !== startedAt || rng() < 0.2) {
        q.session = { day, startedAt, tasks: TASKS.slice(0, randInt(rng, 1, 3)).map((t) => ({ ...t, topicIds: [...t.topicIds] })) };
      } else if (rng() < 0.3) {
        q.session.tasks.push({ ...pick(rng, TASKS), done: false, passed: null });
      } else {
        const t = pick(rng, q.session.tasks);
        t.done = true;
        t.passed = pick(rng, [null, true, false]);
      }
      break;
    }
    case 9:
      q.placement = { answers: [...(q.placement?.answers ?? []), { topicId: pick(rng, TOPICS), correct: rng() < 0.5, at: time(rng) }], done: rng() < 0.5 };
      break;
    case 10:
      // A quiz clears the list.
      q.learnedSinceQuiz = [];
      break;
    case 11:
      if (rng() < 0.15) return resetProgress('mastery', time(rng));
      break;
    case 12:
      // A version 6 copy migrated on this device: its retest anchor.
      q.retestsFrom = time(rng);
      break;
  }
  q.updatedAt = Math.max(q.updatedAt, time(rng));
  return q;
}

function drift(rng: Rng, p: Progress, steps: number): Progress {
  let q = p;
  for (let i = 0; i < steps; i++) q = step(rng, q);
  return q;
}

/** A shared starting copy and three devices that each changed it. */
function devices(seed: number): [Progress, Progress, Progress] {
  const rng = mulberry32(seed);
  const base = drift(rng, newProgress('mastery', T0), randInt(rng, 0, 10));
  return [drift(rng, base, randInt(rng, 0, 8)), drift(rng, base, randInt(rng, 0, 8)), drift(rng, base, randInt(rng, 0, 8))];
}

const RUNS = 400;
const same = (a: Progress, b: Progress): void => expect(canonicalJson(a)).toBe(canonicalJson(b));
const valid = (p: Progress): void => {
  const r = importProgress(exportProgress(p));
  expect(r.ok ? [] : r.errors).toEqual([]);
};

describe('the generated documents', () => {
  it('are valid, so the properties below test real documents', () => {
    for (let s = 0; s < 50; s++) for (const p of devices(s)) valid(p);
  });
});

describe('merge is a join (property tests over random divergent copies)', () => {
  it('idempotent: merging a copy with itself changes nothing more than the order of its lists', () => {
    for (let s = 0; s < RUNS; s++) {
      const [a] = devices(s);
      const n = mergeProgress(a, a);
      same(mergeProgress(n, n), n);
      same(mergeProgress(n, a), n);
      expect(sameProgress(n, a)).toBe(sameProgress(mergeProgress(a, a), a));
    }
  });

  it('commutative', () => {
    for (let s = 0; s < RUNS; s++) {
      const [a, b] = devices(s);
      same(mergeProgress(a, b), mergeProgress(b, a));
    }
  });

  it('associative', () => {
    for (let s = 0; s < RUNS; s++) {
      const [a, b, c] = devices(s);
      same(mergeProgress(mergeProgress(a, b), c), mergeProgress(a, mergeProgress(b, c)));
    }
  });

  it('absorbs: merging in a copy already merged changes nothing', () => {
    for (let s = 0; s < RUNS; s++) {
      const [a, b] = devices(s);
      const m = mergeProgress(a, b);
      same(mergeProgress(m, b), m);
      same(mergeProgress(m, a), m);
    }
  });

  it('always produces a valid document', () => {
    for (let s = 0; s < RUNS; s++) {
      const [a, b, c] = devices(s);
      valid(mergeProgress(mergeProgress(a, b), c));
    }
  });

  it('the gate reads the same from every merge order, and a solution shown on either copy still stops its problem counting', () => {
    const gates = PROBLEMS.map((k) => ({ topic: k.slice(0, k.indexOf('/')), id: k.slice(k.indexOf('/') + 1), key: k }));
    for (let s = 0; s < RUNS; s++) {
      const [a, b, c] = devices(s);
      const left = mergeProgress(mergeProgress(a, b), c);
      const right = mergeProgress(a, mergeProgress(c, b));
      for (const g of gates) {
        const ev = gateEvidence(left, g.topic, [g.id]);
        expect(ev).toEqual(gateEvidence(right, g.topic, [g.id]));
        if (ev === null || ev.kind !== 'auto' || a.resetAt !== b.resetAt || b.resetAt !== c.resetAt) continue;
        // Evidence from an answer means no copy showed the solution at or before it.
        for (const d of [a, b, c]) {
          expect(d.history.some((h) => h.kind === 'cambridge' && h.item?.id === g.key && h.item.solution === true && h.at <= ev.at)).toBe(false);
        }
      }
    }
  });

  it('never changes its inputs', () => {
    for (let s = 0; s < 50; s++) {
      const [a, b] = devices(s);
      const before = [exportProgress(a), exportProgress(b)];
      mergeProgress(a, b);
      expect([exportProgress(a), exportProgress(b)]).toEqual(before);
    }
  });
});

describe('merge loses no work between copies with the same reset', () => {
  const pairs = (): [Progress, Progress][] => {
    const out: [Progress, Progress][] = [];
    for (let s = 0; s < RUNS; s++) {
      const [a, b] = devices(s);
      if (a.resetAt === b.resetAt) out.push([a, b]);
    }
    return out;
  };

  it('keeps every imported supervision result', () => {
    for (const [a, b] of pairs()) {
      const m = mergeProgress(a, b);
      for (const x of [...a.supervision, ...b.supervision]) {
        if (x.result !== null) expect(m.supervision.find((y) => y.nonce === x.nonce)?.result).not.toBeNull();
      }
    }
  });

  it('keeps every history entry, as often as either copy holds it', () => {
    for (const [a, b] of pairs()) {
      const m = mergeProgress(a, b);
      const count = (xs: readonly HistoryEntry[], h: HistoryEntry): number => xs.filter((x) => canonicalJson(x) === canonicalJson(h)).length;
      for (const h of [...a.history, ...b.history]) expect(count(m.history, h)).toBe(Math.max(count(a.history, h), count(b.history, h)));
      expect(m.history.map((h) => h.at)).toEqual([...m.history.map((h) => h.at)].sort((x, y) => x - y));
    }
  });

  it('keeps a done redo done', () => {
    for (const [a, b] of pairs()) {
      const m = mergeProgress(a, b);
      for (const d of [...a.redos, ...b.redos]) {
        const got = m.redos.find((x) => x.problem === d.problem && x.from === d.from);
        expect(got).toBeDefined();
        if (d.doneAt !== null) expect(got?.doneAt).not.toBeNull();
      }
    }
  });

  it('keeps the newest review of every topic', () => {
    for (const [a, b] of pairs()) {
      const m = mergeProgress(a, b);
      for (const id of new Set([...Object.keys(a.memory), ...Object.keys(b.memory)])) {
        expect(m.memory[id]?.lastReviewed).toBe(Math.max(a.memory[id]?.lastReviewed ?? -Infinity, b.memory[id]?.lastReviewed ?? -Infinity));
      }
    }
  });

  it('keeps the newer of each choice', () => {
    for (const [a, b] of pairs()) {
      const m = mergeProgress(a, b);
      for (const f of CHOICE_FIELDS) {
        expect(m.changedAt[f]).toBe(Math.max(a.changedAt[f], b.changedAt[f]));
        const newer = a.changedAt[f] > b.changedAt[f] ? a : b.changedAt[f] > a.changedAt[f] ? b : null;
        if (newer !== null) {
          const v = (p: Progress): unknown => (f === 'courses' ? p.courses : p.settings[f]);
          expect(v(m)).toEqual(v(newer));
        }
      }
    }
  });
});

describe('merge rules, case by case', () => {
  const base = (): Progress => withChoices(newProgress('mastery', T0), { courses: [...COURSES] }, T0);

  it('a later Start over wins whole, and an earlier one loses whole', () => {
    const studied = { ...base(), history: [{ at: T0 + 5, kind: 'lesson' as const, topicId: 'pre.fractions', correct: true }] };
    const erased = resetProgress('mastery', T0 + 10);
    same(mergeProgress(studied, erased), erased);
    const after = { ...resetProgress('mastery', T0 + 10), history: [{ at: T0 + 20, kind: 'review' as const, topicId: 'pre.indices', correct: true }] };
    same(mergeProgress(after, resetProgress('mastery', T0 + 3)), after);
  });

  it('a device that chose nothing does not undo a choice made on another', () => {
    const mac = withChoices(base(), { budgetMinutes: 90 }, T0 + 100);
    const phone = newProgress('mastery', T0 + 500);
    const m = mergeProgress(mac, phone);
    expect(m.settings.budgetMinutes).toBe(90);
    expect(m.courses).toEqual(COURSES);
  });

  it('settings merge field by field, each to its newer choice', () => {
    const mac = withChoices(base(), { budgetMinutes: 90 }, T0 + 100);
    const phone = withChoices(base(), { courseWeights: { 'ia-probability': 2 } }, T0 + 50);
    const m = mergeProgress(mac, phone);
    expect(m.settings).toEqual({ budgetMinutes: 90, implicitCredit: true, courseWeights: { 'ia-probability': 2 } });
  });

  it('memory: the newer review wins, then more repetitions', () => {
    const a = { ...base(), memory: { 'pre.fractions': { ...newMemory(T0), reps: 3 } } };
    const b = { ...base(), memory: { 'pre.fractions': { ...newMemory(T0 + 1), reps: 1 }, 'pre.indices': newMemory(T0) } };
    const m = mergeProgress(a, b);
    expect(m.memory['pre.fractions']?.reps).toBe(1);
    expect(Object.keys(m.memory).sort()).toEqual(['pre.fractions', 'pre.indices']);
    const c = { ...base(), memory: { 'pre.fractions': { ...newMemory(T0 + 1), reps: 2 } } };
    expect(mergeProgress(b, c).memory['pre.fractions']?.reps).toBe(2);
  });

  it('a supervision result imported on one device joins the copy without it', () => {
    const copy = { problem: 'pre.fractions/q1', nonce: 'ABCDEFGH', writeUp: 'x', copiedAt: T0, result: null, importedAt: null };
    const r: SupervisionResult = { mark: 15, weakPoints: ['a', 'b', 'c'], redo: [], summary: 'Fine.' };
    const a = { ...base(), supervision: [copy] };
    const b = { ...base(), supervision: [{ ...copy, result: r, importedAt: T0 + 9 }] };
    expect(mergeProgress(a, b).supervision).toEqual([{ ...copy, result: r, importedAt: T0 + 9 }]);
    // Two results for one copy (pasted on both devices): the earlier import is kept on both.
    const c = { ...base(), supervision: [{ ...copy, result: { ...r, mark: 3 }, importedAt: T0 + 20 }] };
    expect(mergeProgress(c, b).supervision[0]?.result?.mark).toBe(15);
  });

  it('a done redo stays done', () => {
    const open = { problem: 'pre.fractions/q1', from: 'ABCDEFGH', setAt: T0, due: T0 + DAY_MS, doneAt: null };
    const a = { ...base(), redos: [open] };
    const b = { ...base(), redos: [{ ...open, doneAt: T0 + 7 }] };
    expect(mergeProgress(a, b).redos).toEqual([{ ...open, doneAt: T0 + 7 }]);
  });

  it('lesson minutes take the larger count per course', () => {
    const a = { ...base(), courseMinutes: { 'ia-probability': 30 } };
    const b = { ...base(), courseMinutes: { 'ia-probability': 15, 'cst-discrete-maths': 10 } };
    expect(mergeProgress(a, b).courseMinutes).toEqual({ 'cst-discrete-maths': 10, 'ia-probability': 30 });
  });

  it('topics learned since the quiz are unioned, in the order they were learned', () => {
    const lesson = (topicId: string, at: number): HistoryEntry => ({ at, kind: 'lesson', topicId, correct: true });
    const a = { ...base(), learnedSinceQuiz: ['pre.indices'], history: [lesson('pre.indices', T0 + 2)] };
    const b = { ...base(), learnedSinceQuiz: ['pre.fractions'], history: [lesson('pre.fractions', T0 + 1)] };
    expect(mergeProgress(a, b).learnedSinceQuiz).toEqual(['pre.fractions', 'pre.indices']);
  });

  it('session: the later day wins; on one day the first plan wins and done tasks stay done', () => {
    const tasks = TASKS.slice(0, 2);
    const plan = (day: string, startedAt: number, t: SessionTask[]): Progress => ({ ...base(), session: { day, startedAt, tasks: t } });
    expect(mergeProgress(plan('2026-10-05', T0, tasks), plan('2026-10-06', T0 - 5, tasks)).session?.day).toBe('2026-10-06');
    expect(mergeProgress(plan('2026-10-05', T0 + 9, tasks), plan('2026-10-05', T0, tasks)).session?.startedAt).toBe(T0);
    const mac = plan('2026-10-05', T0, [{ ...TASKS[0]!, done: true, passed: true }, TASKS[1]!]);
    const phone = plan('2026-10-05', T0, [TASKS[0]!, { ...TASKS[1]!, done: true, passed: false }, TASKS[2]!]);
    expect(mergeProgress(mac, phone).session?.tasks.map((t) => [t.done, t.passed])).toEqual([[true, true], [true, false], [false, null]]);
  });

  it('a version 3 copy is migrated by import first, then merges', () => {
    const v3 = JSON.parse(exportProgress(withChoices(base(), { budgetMinutes: 30 }, T0 + 1)));
    v3.version = 3;
    delete v3.changedAt;
    delete v3.resetAt;
    const old = importProgress(v3);
    expect(old.ok).toBe(true);
    if (!old.ok) return;
    const m = mergeProgress(old.value, withChoices(base(), { budgetMinutes: 45 }, T0 + 2));
    // The old copy's choice is dated to its updatedAt (T0 + 1), so the newer 45 wins.
    expect(m.settings.budgetMinutes).toBe(45);
    valid(m);
  });

  it('a document the app built merges with itself to an equal document', () => {
    const p = withChoices(base(), { budgetMinutes: 45 }, T0 + 1);
    p.history = [{ at: T0 + 2, kind: 'lesson', topicId: 'pre.fractions', correct: true }, { at: T0 + 3, kind: 'lesson', topicId: 'pre.indices', correct: true }];
    p.learnedSinceQuiz = ['pre.fractions', 'pre.indices'];
    p.memory = { 'pre.fractions': newMemory(T0 + 2), 'pre.indices': newMemory(T0 + 3) };
    p.courseMinutes = { 'ia-probability': 15 };
    expect(mergeProgress(p, p)).toEqual(p);
  });
});

describe('canonical JSON', () => {
  it('sorts keys at every depth and drops undefined fields', () => {
    expect(canonicalJson({ b: 1, a: { d: [1, { f: 2, e: 3 }], c: undefined } })).toBe('{"a":{"d":[1,{"e":3,"f":2}]},"b":1}');
  });
});
