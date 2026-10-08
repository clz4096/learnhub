import { describe, it, expect } from 'vitest';
import { DAY_MS, newMemory } from './memory';
import {
  MIGRATIONS, MemoryStorage, PROGRESS_VERSION, exportProgress, importProgress, isStudyEntry, loadProgress, newProgress, nextAttempt, resetProgress,
  saveProgress, withChoices, type HistoryEntry, type Progress, type ProgressStorage,
} from './progress';
import { gateStatus } from './gate';

const NOW = Date.UTC(2026, 9, 4);

function sample(): Progress {
  const p = newProgress('probstats', NOW);
  p.placement = { answers: [{ topicId: 'pre.fractions', correct: true, at: NOW }], done: true };
  p.memory = { 'pre.fractions': newMemory(NOW), 'pre.indices': { ...newMemory(NOW), reps: 2, implicitCredit: 0.4 } };
  p.learnedSinceQuiz = ['pre.indices'];
  p.history = [
    { at: NOW, kind: 'placement', topicId: 'pre.fractions', correct: true },
    { at: NOW + DAY_MS, kind: 'review', topicId: 'pre.indices', correct: false },
  ];
  p.courses = ['ia-probability', 'cst-discrete-maths'];
  p.settings.courseWeights = { 'cst-discrete-maths': 2 };
  p.courseMinutes = { 'ia-probability': 30, 'cst-discrete-maths': 15 };
  p.session = {
    day: '2026-10-05',
    startedAt: NOW + DAY_MS,
    tasks: [
      { kind: 'review', topicIds: ['pre.indices'], minutes: 3, reason: 'Review: due today.', done: true, passed: false },
      { kind: 'lesson', topicIds: ['pre.sequences'], minutes: 15, reason: 'New topic.', course: 'ia-probability', done: false, passed: null },
      { kind: 'quiz', topicIds: ['pre.fractions', 'pre.indices'], minutes: 4, reason: 'Quiz.', done: false, passed: null },
    ],
  };
  p.supervision = [
    {
      problem: 'pre.fractions/a6-show', nonce: 'K7Q2XMPA', writeUp: 'Multiply through by $q$.', copiedAt: NOW,
      result: { mark: 12, weakPoints: ['a', 'b', 'c'], redo: ['pre.fractions/a6-show'], summary: 'Close.' }, importedAt: NOW + 1000,
    },
    { problem: 'pre.indices/a12-q1-iii', nonce: 'ABCDEFGH', writeUp: '', copiedAt: NOW + 2000, result: null, importedAt: null },
  ];
  p.history.push({ at: NOW + 1000, kind: 'supervision', topicId: 'pre.fractions', correct: false });
  p.redos = [{ problem: 'pre.fractions/a6-show', from: 'K7Q2XMPA', setAt: NOW + 1000, due: NOW + 1000 + DAY_MS, doneAt: null }];
  return p;
}

/** The sample with the version 5 additions: item data, and drill, Cambridge, and gym entries. */
function sampleV5(): Progress {
  const p = sample();
  p.history.push(
    { at: NOW + 3000, kind: 'drill', topicId: 'pre.indices', correct: true, item: { id: 'pre.indices/laws', seed: 4_000_000_000, ms: 41_250, hints: 0, attempt: 1 } },
    { at: NOW + 4000, kind: 'cambridge', topicId: 'pre.fractions', correct: true, item: { id: 'pre.fractions/a6-q1', ms: 300_000, hints: 0, attempt: 1 } },
    { at: NOW + 5000, kind: 'gym', topicId: 'pre.indices', correct: false, item: { id: 'recall:pre.indices#0', hints: 0, attempt: 2 } },
    { at: NOW + 6000, kind: 'quiz', topicId: 'pre.indices', correct: true, item: { id: 'pre.indices/laws', seed: 7, hints: 0, attempt: 1 } },
  );
  return p;
}

/** The sample as a version 4 document: nothing of version 5 in it, so only the number differs. */
function sampleV4(): Record<string, any> {
  const d = JSON.parse(exportProgress(sample()));
  d.version = 4;
  return d;
}

/** The sample as a version 3 document: no times of choices, and no reset. */
function sampleV3(): Record<string, any> {
  const d = JSON.parse(exportProgress(sample()));
  d.version = 3;
  delete d.changedAt;
  delete d.resetAt;
  return d;
}

/** The sample as a version 2 document: no supervision attempts or redos, and no supervision history. */
function sampleV2(): Record<string, any> {
  const d = sampleV3();
  d.version = 2;
  delete d.supervision;
  delete d.redos;
  d.history = d.history.filter((h: { kind: string }) => h.kind !== 'supervision');
  return d;
}

/** The sample as a version 1 document: no courses, weights, minutes, or session. */
function sampleV1(): Record<string, any> {
  const d = sampleV2();
  d.version = 1;
  delete d.courses;
  delete d.courseMinutes;
  delete d.session;
  delete d.settings.courseWeights;
  return d;
}

/** The parsed export with one change applied, for malformed-input cases. */
function mutate(f: (d: Record<string, any>) => void): string {
  const d = JSON.parse(exportProgress(sample()));
  f(d);
  return JSON.stringify(d);
}

function errorsOf(input: unknown): string[] {
  const r = importProgress(input);
  expect(r.ok).toBe(false);
  return r.ok ? [] : r.errors;
}

describe('export and import', () => {
  it('round-trips exactly', () => {
    const p = sample();
    const r = importProgress(exportProgress(p));
    expect(r).toEqual({ ok: true, value: p, warnings: [] });
  });

  it('round-trips a result that names a prerequisite gap', () => {
    const p = sample();
    const r0 = p.supervision[0]?.result;
    if (r0 === null || r0 === undefined) throw new Error('the sample has a result');
    r0.gap = 'proof.direct';
    expect(importProgress(exportProgress(p))).toEqual({ ok: true, value: p, warnings: [] });
  });

  it('accepts an already parsed object', () => {
    expect(importProgress(JSON.parse(exportProgress(sample()))).ok).toBe(true);
  });

  it('a new document has the current version and default settings', () => {
    const p = newProgress('probstats', NOW);
    expect(p.version).toBe(PROGRESS_VERSION);
    expect(p.settings).toEqual({ budgetMinutes: 60, implicitCredit: true, courseWeights: {} });
    expect(p.courses).toEqual([]);
    expect(p.courseMinutes).toEqual({});
    expect(p.session).toBeNull();
    expect(p.changedAt).toEqual({ budgetMinutes: 0, implicitCredit: 0, courseWeights: 0, courses: 0 });
    expect(p.resetAt).toBe(0);
    expect(importProgress(exportProgress(p)).ok).toBe(true);
  });

  it('start over makes a blank document dated by its reset', () => {
    const p = resetProgress('probstats', NOW + 5);
    expect(p.resetAt).toBe(NOW + 5);
    expect({ ...p, resetAt: 0 }).toEqual(newProgress('probstats', NOW + 5));
  });

  it('new documents never share the default weights object', () => {
    const a = newProgress('a', NOW);
    a.settings.courseWeights['x-y'] = 3;
    expect(newProgress('b', NOW).settings.courseWeights).toEqual({});
  });

  it('exports readable, newline-terminated JSON', () => {
    const s = exportProgress(sample());
    expect(s.endsWith('}\n')).toBe(true);
    expect(s).toContain('\n  "courseId": "probstats"');
  });
});

describe('malformed input never throws and says what is wrong', () => {
  const cases: [string, unknown, RegExp][] = [
    ['empty string', '', /not valid JSON/],
    ['truncated file', exportProgress(sample()).slice(0, 100), /not valid JSON/],
    ['a number', '42', /expected a progress object, got 42/],
    ['null', null, /got null/],
    ['an array', '[]', /got an array/],
    ['undefined', undefined, /got undefined/],
    ['no version', mutate((d) => { delete d.version; }), /\$\.version: expected a version number/],
    ['string version', mutate((d) => { d.version = '2'; }), /\$\.version: expected a version number, got "2"/],
    ['newer version', mutate((d) => { d.version = 99; }), /newer build/],
    ['version 0 with no migration', mutate((d) => { d.version = 0; }), /no migration from version 0/],
    ['negative reps', mutate((d) => { d.memory['pre.fractions'].reps = -1; }), /\$\.memory\["pre\.fractions"\]\.reps: expected a non-negative integer, got -1/],
    ['fractional lapses', mutate((d) => { d.memory['pre.fractions'].lapses = 0.5; }), /lapses/],
    ['zero interval', mutate((d) => { d.memory['pre.fractions'].intervalDays = 0; }), /intervalDays: expected a positive number/],
    ['credit of 1', mutate((d) => { d.memory['pre.fractions'].implicitCredit = 1; }), /implicitCredit: expected a number in \[0, 1\)/],
    ['missing due', mutate((d) => { delete d.memory['pre.fractions'].due; }), /due: expected a time in ms, got undefined/],
    ['NaN as null', mutate((d) => { d.memory['pre.fractions'].due = null; }), /due: expected a time in ms, got null/],
    ['memory as array', mutate((d) => { d.memory = []; }), /\$\.memory: expected an object, got an array/],
    ['bad memory key', mutate((d) => { d.memory['Not An Id'] = d.memory['pre.fractions']; }), /not an id|Not An Id/i],
    ['__proto__ key', '{"version":1,"courseId":"c","createdAt":0,"updatedAt":0,"settings":{"budgetMinutes":60,"implicitCredit":true},"placement":null,"memory":{"__proto__":{"reps":0}},"learnedSinceQuiz":[],"history":[]}', /__proto__/],
    ['empty course id', mutate((d) => { d.courseId = ' '; }), /\$\.courseId/],
    ['budget of 0', mutate((d) => { d.settings.budgetMinutes = 0; }), /budgetMinutes/],
    ['credit flag as string', mutate((d) => { d.settings.implicitCredit = 'yes'; }), /implicitCredit: expected true or false, got "yes"/],
    ['bad history kind', mutate((d) => { d.history[0].kind = 'cram'; }), /\$\.history\[0\]\.kind: expected placement, lesson, review, quiz/],
    ['history not an array', mutate((d) => { d.history = {}; }), /\$\.history: expected an array/],
    ['placement answer without time', mutate((d) => { delete d.placement.answers[0].at; }), /\$\.placement\.answers\[0\]\.at/],
    ['placement as string', mutate((d) => { d.placement = 'done'; }), /\$\.placement: expected an object or null/],
    ['learnedSinceQuiz entry not an id', mutate((d) => { d.learnedSinceQuiz = [3]; }), /learnedSinceQuiz\[0\]/],
    ['courses not an array', mutate((d) => { d.courses = 'ia-probability'; }), /\$\.courses: expected an array/],
    ['course id with spaces', mutate((d) => { d.courses = ['IA Probability']; }), /\$\.courses\[0\]: expected a course id/],
    ['course listed twice', mutate((d) => { d.courses = ['a', 'a']; }), /\$\.courses\[1\]: "a" is listed twice/],
    ['negative weight', mutate((d) => { d.settings.courseWeights = { a: -1 }; }), /courseWeights\["a"\]: expected a weight in \[0, 100\]/],
    ['weight key __proto__', '{"version":2,"courseId":"c","createdAt":0,"updatedAt":0,"settings":{"budgetMinutes":60,"implicitCredit":true,"courseWeights":{"__proto__":1}},"courses":[],"placement":null,"memory":{},"learnedSinceQuiz":[],"history":[],"courseMinutes":{},"session":null}', /__proto__/],
    ['minutes as string', mutate((d) => { d.courseMinutes = { a: '30' }; }), /\$\.courseMinutes\["a"\]: expected minutes/],
    ['session as string', mutate((d) => { d.session = 'today'; }), /\$\.session: expected an object or null/],
    ['session day not a date', mutate((d) => { d.session.day = 'Monday'; }), /\$\.session\.day/],
    ['session task with no topics', mutate((d) => { d.session.tasks[0].topicIds = []; }), /\$\.session\.tasks\[0\]\.topicIds: expected a non-empty array/],
    ['session task of unknown kind', mutate((d) => { d.session.tasks[0].kind = 'nap'; }), /\$\.session\.tasks\[0\]\.kind/],
    ['session task passed as string', mutate((d) => { d.session.tasks[1].passed = 'yes'; }), /\$\.session\.tasks\[1\]\.passed/],
    ['supervision missing', mutate((d) => { delete d.supervision; }), /\$\.supervision: expected an array, got undefined/],
    ['redos missing', mutate((d) => { delete d.redos; }), /\$\.redos: expected an array/],
    ['problem id without a topic', mutate((d) => { d.supervision[0].problem = 'a6-show'; }), /\$\.supervision\[0\]\.problem: expected a problem id/],
    ['nonce with an O', mutate((d) => { d.supervision[0].nonce = 'K7Q2XMPO'; }), /\$\.supervision\[0\]\.nonce/],
    ['nonce used twice', mutate((d) => { d.supervision[1].nonce = 'K7Q2XMPA'; }), /\$\.supervision\[1\]\.nonce: "K7Q2XMPA" is used twice/],
    ['mark of 21', mutate((d) => { d.supervision[0].result.mark = 21; }), /\.result\.mark: expected a whole number from 0 to 20, got 21/],
    ['mark of 12.5', mutate((d) => { d.supervision[0].result.mark = 12.5; }), /\.result\.mark/],
    ['two weak points', mutate((d) => { d.supervision[0].result.weakPoints = ['a', 'b']; }), /\.result\.weakPoints: expected 3 weak points/],
    ['weak point over two lines', mutate((d) => { d.supervision[0].result.weakPoints[1] = 'a\nb'; }), /weakPoints\[1\]: expected one line/],
    ['four redos', mutate((d) => { d.supervision[0].result.redo = ['a.b/c', 'a.b/d', 'a.b/e', 'a.b/f']; }), /\.result\.redo: expected an array of at most 3/],
    ['empty summary', mutate((d) => { d.supervision[0].result.summary = ' '; }), /\.result\.summary/],
    ['gap that is not a topic id', mutate((d) => { d.supervision[0].result.gap = 'Writing proofs'; }), /\.result\.gap: expected a topic id/],
    ['gap that is a problem key', mutate((d) => { d.supervision[0].result.gap = 'proof.direct/q1'; }), /\.result\.gap: expected a topic id/],
    ['result without import time', mutate((d) => { d.supervision[0].importedAt = null; }), /\$\.supervision\[0\]\.importedAt: expected a time in ms/],
    ['import time without result', mutate((d) => { d.supervision[1].importedAt = 5; }), /\$\.supervision\[1\]\.importedAt: expected null/],
    ['write-up too long', mutate((d) => { d.supervision[1].writeUp = 'x'.repeat(20_001); }), /writeUp: expected text of at most 20000/],
    ['redo due missing', mutate((d) => { delete d.redos[0].due; }), /\$\.redos\[0\]\.due/],
    ['redo done as string', mutate((d) => { d.redos[0].doneAt = 'yes'; }), /\$\.redos\[0\]\.doneAt/],
    ['choice times missing', mutate((d) => { delete d.changedAt; }), /\$\.changedAt: expected an object, got undefined/],
    ['choice time negative', mutate((d) => { d.changedAt.courses = -1; }), /\$\.changedAt\.courses: expected a time in ms/],
    ['choice time missing one field', mutate((d) => { delete d.changedAt.budgetMinutes; }), /\$\.changedAt\.budgetMinutes/],
    ['reset as string', mutate((d) => { d.resetAt = 'never'; }), /\$\.resetAt: expected a time in ms/],
  ];
  for (const [name, input, re] of cases) {
    it(name, () => {
      let errors: string[] = [];
      expect(() => { errors = errorsOf(input); }).not.toThrow();
      expect(errors.join('\n')).toMatch(re);
      for (const e of errors) expect(e).not.toMatch(/[\u2013\u2014]/);
    });
  }

  it('reports every problem, not just the first', () => {
    const errors = errorsOf(mutate((d) => { d.memory['pre.fractions'].reps = -1; d.history[1].correct = 'no'; d.courseId = 5; }));
    expect(errors).toHaveLength(3);
  });

  it('rejects input over the size cap before parsing', () => {
    const r = importProgress('x'.repeat(101), { maxBytes: 100 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toMatch(/more than the 100 allowed/);
  });

  it('survives deeply nested JSON', () => {
    const deep = `${'['.repeat(100_000)}${']'.repeat(100_000)}`;
    expect(() => importProgress(deep)).not.toThrow();
    expect(importProgress(deep).ok).toBe(false);
  });

  it('survives getters that throw', () => {
    const evil = { version: 1, get courseId(): string { throw new Error('boom'); } };
    const r = importProgress(evil);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toMatch(/boom/);
  });
});

describe('warnings for recoverable input', () => {
  it('drops memory for topics no longer in the course, keeps history', () => {
    const r = importProgress(exportProgress(sample()), { knownTopicIds: ['pre.fractions'] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Object.keys(r.value.memory)).toEqual(['pre.fractions']);
    expect(r.value.learnedSinceQuiz).toEqual([]);
    expect(r.value.history).toHaveLength(3);
    expect(r.warnings.join('\n')).toMatch(/\$\.memory\["pre\.indices"\]: not in this course, dropped/);
  });

  it('ignores unknown fields with a warning', () => {
    const r = importProgress(mutate((d) => { d.theme = 'dark'; d.memory['pre.fractions'].ease = 2.5; }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.warnings).toEqual(['$.theme: unknown field, ignored', '$.memory["pre.fractions"].ease: unknown field, ignored']);
    expect('theme' in r.value).toBe(false);
    expect('ease' in (r.value.memory['pre.fractions'] ?? {})).toBe(false);
  });
});

describe('migrations', () => {
  // A test-only version 0 that lacked settings, chained onto the shipped migrations.
  const migrations = {
    ...MIGRATIONS,
    0: (d: Record<string, unknown>) => ({ ...d, version: 1, settings: { budgetMinutes: 60, implicitCredit: true } }),
  };

  it('migrates version 1 to 2 with no courses, even weights, no minutes, and no session', () => {
    const r = importProgress(JSON.stringify(sampleV1()));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.warnings).toEqual([]);
    expect(r.value).toEqual({
      ...sample(), courses: [], courseMinutes: {}, session: null, settings: { ...sample().settings, courseWeights: {} },
      history: sampleV2().history, supervision: [], redos: [],
    });
  });

  // The sample chose courses and a weight, so version 3 dates those two choices to its last change.
  const chosen = { budgetMinutes: 0, implicitCredit: 0, courseWeights: NOW, courses: NOW };

  it('migrates version 2 to 3 with no supervision attempts and no redos', () => {
    const r = importProgress(JSON.stringify(sampleV2()));
    expect(r).toEqual({
      ok: true, value: { ...sample(), history: sampleV2().history, supervision: [], redos: [], changedAt: chosen }, warnings: [],
    });
  });

  it('migrates version 3 to 4: choices that differ from the default are dated to the last change, defaults to 0', () => {
    const r = importProgress(JSON.stringify(sampleV3()));
    expect(r).toEqual({ ok: true, value: { ...sample(), changedAt: chosen }, warnings: [] });
    const fresh = JSON.parse(exportProgress(newProgress('x', NOW)));
    fresh.version = 3;
    delete fresh.changedAt;
    delete fresh.resetAt;
    const f = importProgress(fresh);
    expect(f.ok && f.value.changedAt).toEqual({ budgetMinutes: 0, implicitCredit: 0, courseWeights: 0, courses: 0 });
    const tuned = { ...fresh, settings: { budgetMinutes: 30, implicitCredit: false, courseWeights: {} } };
    const t = importProgress(tuned);
    expect(t.ok && t.value.changedAt).toEqual({ budgetMinutes: NOW, implicitCredit: NOW, courseWeights: 0, courses: 0 });
  });

  it('the version 3 to 4 migration tolerates a malformed document and leaves the errors to validation', () => {
    const r = importProgress({ version: 3, settings: 'x', courses: 5, updatedAt: 'y' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join('\n')).not.toMatch(/changedAt|resetAt|migration/);
  });

  it('a version 2 document keeps everything else, and saves as the current version', () => {
    const r = importProgress(sampleV2());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.version).toBe(PROGRESS_VERSION);
    expect(JSON.parse(exportProgress(r.value)).version).toBe(PROGRESS_VERSION);
    expect(r.value.session).toEqual(sample().session);
  });

  it('migrates version 4 to 5 (and on) changing nothing but the version: memory and the review schedule are kept', () => {
    const r = importProgress(JSON.stringify(sampleV4()));
    expect(r).toEqual({ ok: true, value: sample(), warnings: [] });
  });

  it('re-gates a version 4 document: its learned topics need the Cambridge problem, and keep their schedule', () => {
    const r = importProgress(sampleV4());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.memory).toEqual(sample().memory);
    // The sample's one supervision result is 12 of 20, below the gate.
    expect(gateStatus(r.value, 'pre.fractions', ['a6-show']).stage).toBe('needs-gate');
    expect(gateStatus(r.value, 'pre.indices', ['a12-q1-iii']).stage).toBe('needs-gate');
    // A result of 14 or more on a gate problem that a version 4 document already holds still counts.
    const passed = sampleV4();
    passed.supervision[0].result.mark = 14;
    const q = importProgress(passed);
    expect(q.ok && gateStatus(q.value, 'pre.fractions', ['a6-show']).stage).toBe('mastered');
  });

  it('a version 4 build cannot read version 5 entries, which is why the version moved', () => {
    const d = JSON.parse(exportProgress(sampleV5()));
    expect(importProgress(d).ok).toBe(true);
    // A build that reads only up to this version refuses a newer document whole instead of dropping entries.
    d.version = PROGRESS_VERSION + 1;
    expect(importProgress(d)).toEqual({ ok: false, errors: [`$.version: ${PROGRESS_VERSION + 1} was written by a newer build (this one reads up to ${PROGRESS_VERSION}); update the app`] });
  });

  it('migrates version 5 to 6: every Cambridge miss showed the solution, so its problem stays not counting', () => {
    const d = JSON.parse(exportProgress(sampleV5()));
    d.version = 5;
    d.history.push(
      { at: NOW + 7000, kind: 'cambridge', topicId: 'pre.indices', correct: false, item: { id: 'pre.indices/a12-q1-iii', hints: 0, attempt: 1 } },
      { at: NOW + 8000, kind: 'cambridge', topicId: 'pre.indices', correct: true, item: { id: 'pre.indices/a12-q1-iii', hints: 0, attempt: 2 } },
      { at: NOW + 9000, kind: 'drill', topicId: 'pre.indices', correct: false, item: { id: 'pre.indices/laws', hints: 0, attempt: 3 } },
    );
    const r = importProgress(d);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const h = r.value.history;
    // The miss is marked; the right answer, the drill miss, and every other entry are as they were.
    expect(h.filter((e) => e.item?.solution === true).map((e) => e.at)).toEqual([NOW + 7000]);
    expect(h.filter((e) => e.item?.solution !== true)).toEqual(d.history.filter((e: { at: number }) => e.at !== NOW + 7000));
    // Under the old rule the right answer after the miss did not count; it still does not.
    expect(gateStatus(r.value, 'pre.indices', ['a12-q1-iii']).stage).toBe('needs-gate');
    // A first answer that was right still counts.
    expect(gateStatus(r.value, 'pre.fractions', ['a6-q1']).evidence).toEqual({ kind: 'auto', problem: 'pre.fractions/a6-q1', at: NOW + 4000, hints: 0 });
  });

  it('the version 5 to 6 migration leaves malformed history to validation', () => {
    expect(MIGRATIONS[5]?.({ version: 5, history: 3 })).toEqual({ version: 6, history: 3 });
    expect(MIGRATIONS[5]?.({ version: 5, history: [null, { kind: 'cambridge', correct: false }] })).toEqual({ version: 6, history: [null, { kind: 'cambridge', correct: false }] });
  });

  it('migrates through every version in turn and validates the result', () => {
    const v0 = sampleV1();
    v0.version = 0;
    delete v0.settings;
    const r = importProgress(v0, { migrations });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.settings).toEqual({ budgetMinutes: 60, implicitCredit: true, courseWeights: {} });
  });

  it('reports a migration that throws', () => {
    const r = importProgress(mutate((d) => { d.version = 0; }), { migrations: { 0: () => { throw new Error('bad v0'); } } });
    expect(r).toEqual({ ok: false, errors: ['migration from version 0 failed: bad v0'] });
  });

  it('reports a migration that produces the wrong version', () => {
    const r = importProgress(mutate((d) => { d.version = 0; }), { migrations: { 0: (d) => d } });
    expect(r).toEqual({ ok: false, errors: ['migration from version 0 did not produce version 1'] });
  });

  it('a migrated document that is still invalid is rejected', () => {
    const r = importProgress(mutate((d) => { d.version = 0; delete d.settings; d.history = 3; }), { migrations });
    expect(r.ok).toBe(false);
  });
});

describe('item data (version 5)', () => {
  it('round-trips item data and the new kinds exactly', () => {
    const p = sampleV5();
    const r = importProgress(exportProgress(p));
    expect(r).toEqual({ ok: true, value: p, warnings: [] });
  });

  const withItem = (item: unknown): string => mutate((d) => { d.history.push({ at: NOW, kind: 'drill', topicId: 'pre.indices', correct: true, item }); });
  const bad: [string, unknown, RegExp][] = [
    ['an item that is not an object', 'x', /\.item: expected an object/],
    ['an empty id', { id: ' ', hints: 0, attempt: 1 }, /\.item\.id/],
    ['an id over two lines', { id: 'a\nb', hints: 0, attempt: 1 }, /\.item\.id/],
    ['a negative seed', { id: 'a', seed: -1, hints: 0, attempt: 1 }, /\.item\.seed/],
    ['a seed over 32 bits', { id: 'a', seed: 2 ** 32, hints: 0, attempt: 1 }, /\.item\.seed/],
    ['a negative time', { id: 'a', ms: -5, hints: 0, attempt: 1 }, /\.item\.ms/],
    ['a time over a day', { id: 'a', ms: 86_400_001, hints: 0, attempt: 1 }, /\.item\.ms/],
    ['fractional hints', { id: 'a', hints: 0.5, attempt: 1 }, /\.item\.hints/],
    ['missing hints', { id: 'a', attempt: 1 }, /\.item\.hints/],
    ['attempt 0', { id: 'a', hints: 0, attempt: 0 }, /\.item\.attempt/],
    ['a solution flag that is not true', { id: 'a', hints: 0, attempt: 1, solution: false }, /\.item\.solution/],
  ];
  for (const [name, item, re] of bad) {
    it(`rejects ${name}`, () => {
      const r = importProgress(withItem(item));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errors.join('\n')).toMatch(re);
    });
  }

  it('round-trips a Cambridge entry that showed the solution', () => {
    const p = sampleV5();
    p.history.push({ at: NOW + 7000, kind: 'cambridge', topicId: 'pre.fractions', correct: false, item: { id: 'pre.fractions/a6-q1', hints: 2, attempt: 2, solution: true } });
    expect(importProgress(exportProgress(p))).toEqual({ ok: true, value: p, warnings: [] });
  });

  it('warns about an unknown item field and drops it', () => {
    const r = importProgress(withItem({ id: 'a', hints: 0, attempt: 1, mood: 'good' }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.warnings.some((w) => /item\.mood: unknown field/.test(w))).toBe(true);
    expect(r.value.history.at(-1)?.item).toEqual({ id: 'a', hints: 0, attempt: 1 });
  });

  it('numbers attempts from the entries of one kind on one item', () => {
    const h: HistoryEntry[] = sampleV5().history;
    expect(nextAttempt(h, 'cambridge', 'pre.fractions/a6-q1')).toBe(2);
    expect(nextAttempt(h, 'cambridge', 'pre.fractions/other')).toBe(1);
    expect(nextAttempt(h, 'drill', 'pre.indices/laws')).toBe(2);
  });

  it('a gym entry or a placement answer alone does not make a day studied', () => {
    expect(sampleV5().history.filter(isStudyEntry).map((h) => h.kind)).toEqual(['review', 'supervision', 'drill', 'cambridge', 'quiz']);
  });
});

describe('choices', () => {
  it('dates each choice that changed, and only those', () => {
    const p = withChoices(sample(), { budgetMinutes: 45, courses: sample().courses, courseWeights: { 'cst-discrete-maths': 2 } }, NOW + 9);
    expect(p.settings.budgetMinutes).toBe(45);
    expect(p.changedAt).toEqual({ budgetMinutes: NOW + 9, implicitCredit: 0, courseWeights: 0, courses: 0 });
    expect(p.updatedAt).toBe(NOW + 9);
    const q = withChoices(p, { courses: ['ia-probability'], courseWeights: {}, implicitCredit: false }, NOW + 10);
    expect(q.changedAt).toEqual({ budgetMinutes: NOW + 9, implicitCredit: NOW + 10, courseWeights: NOW + 10, courses: NOW + 10 });
    expect(q.courses).toEqual(['ia-probability']);
    expect(importProgress(exportProgress(q)).ok).toBe(true);
  });

  it('weights in a different key order are the same choice', () => {
    const p = withChoices(sample(), { courseWeights: { a: 1, b: 2 } }, NOW + 1);
    const q = withChoices(p, { courseWeights: { b: 2, a: 1 } }, NOW + 2);
    expect(q.changedAt.courseWeights).toBe(NOW + 1);
  });

  it('never changes its input', () => {
    const p = sample();
    const before = exportProgress(p);
    withChoices(p, { budgetMinutes: 10, courseWeights: { a: 3 }, courses: [] }, NOW + 1);
    expect(exportProgress(p)).toBe(before);
  });
});

describe('storage', () => {
  it('save then load round-trips through MemoryStorage', async () => {
    const s = new MemoryStorage();
    expect(await loadProgress(s, 'probstats')).toEqual({ ok: true, value: null, warnings: [] });
    expect((await saveProgress(s, 'probstats', sample())).ok).toBe(true);
    expect(await loadProgress(s, 'probstats')).toEqual({ ok: true, value: sample(), warnings: [] });
  });

  it('load reports corrupt stored data instead of throwing', async () => {
    const s = new MemoryStorage();
    await s.put('probstats', '{"version":2,');
    const r = await loadProgress(s, 'probstats');
    expect(r.ok).toBe(false);
  });

  it('save refuses an invalid document and leaves storage alone', async () => {
    const s = new MemoryStorage();
    const bad = { ...sample(), memory: { 'pre.fractions': { ...newMemory(NOW), reps: Number.NaN } } };
    const r = await saveProgress(s, 'probstats', bad);
    expect(r.ok).toBe(false);
    expect(await s.get('probstats')).toBeUndefined();
  });

  it('storage failures come back as errors, not rejections', async () => {
    const broken: ProgressStorage = {
      get: () => Promise.reject(new Error('disk gone')),
      put: () => Promise.reject(new Error('quota exceeded')),
    };
    expect(await loadProgress(broken, 'k')).toEqual({ ok: false, errors: ['storage read failed: disk gone'] });
    expect(await saveProgress(broken, 'k', sample())).toEqual({ ok: false, errors: ['storage write failed: quota exceeded'] });
  });
});
