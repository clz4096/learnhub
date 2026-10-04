import { describe, it, expect } from 'vitest';
import { DAY_MS, newMemory } from './memory';
import {
  MemoryStorage, PROGRESS_VERSION, exportProgress, importProgress, loadProgress, newProgress, saveProgress,
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
  return p;
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
    expect(p.settings).toEqual({ budgetMinutes: 60, implicitCredit: true });
    expect(importProgress(exportProgress(p)).ok).toBe(true);
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
    ['string version', mutate((d) => { d.version = '1'; }), /\$\.version: expected a version number, got "1"/],
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
  // Version 1 is the first version, so the shipped table is empty. These exercise the
  // migration path with a test-only version 0 that lacked settings.
  const migrations = {
    0: (d: Record<string, unknown>) => ({ ...d, version: 1, settings: { budgetMinutes: 60, implicitCredit: true } }),
  };

  it('migrates an older document forward and validates the result', () => {
    const v0 = mutate((d) => { d.version = 0; delete d.settings; });
    const r = importProgress(v0, { migrations });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual(sample());
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
    await s.put('probstats', '{"version":1,');
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
