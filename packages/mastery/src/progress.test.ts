import { describe, it, expect } from 'vitest';
import { DAY_MS, newMemory } from './memory';
import {
  MIGRATIONS, MemoryStorage, PROGRESS_VERSION, exportProgress, importProgress, loadProgress, newProgress, saveProgress,
  type Progress, type ProgressStorage,
} from './progress';

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
  return p;
}

/** The sample as a version 1 document: no courses, weights, minutes, or session. */
function sampleV1(): Record<string, any> {
  const d = JSON.parse(exportProgress(sample()));
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
    expect(importProgress(exportProgress(p)).ok).toBe(true);
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
    expect(r.value.history).toHaveLength(2);
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
    expect(r.value).toEqual({ ...sample(), courses: [], courseMinutes: {}, session: null, settings: { ...sample().settings, courseWeights: {} } });
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
