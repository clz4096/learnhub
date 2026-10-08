import { describe, expect, it } from 'vitest';
import { canonicalJson, mulberry32, randInt, type Rng } from '@learnhub/mastery';
import { addDays } from '@/model/day';
import { STANDUP_KEEP_DAYS, type StandupEntry, type StandupLog } from '@/model/standupLog';
import { emptyLearner, learnerValues, mergeLearner, observeLearner, parseLearner } from './envelope';
import { plain, put, rec } from './join';
import { emptyStandupSync, mergeStandup, normalizeStandup, observeStandup, parseStandupSync, type StandupSync } from './standup';

const T0 = Date.UTC(2026, 9, 7, 13);
const MIN = 60_000;
const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[randInt(rng, 0, xs.length - 1)] as T;

const entry = (date: string, checkedAt: number, transcript = 'Did sequences.', flags: string[] = []): StandupEntry =>
  ({ date, transcript, checkedAt, flags, duration: 75 });

function sync(entries: readonly StandupEntry[]): StandupSync {
  const log = rec<StandupEntry>();
  for (const e of entries) put(log, e.date, e);
  return observeStandup(emptyStandupSync(), log);
}

/** A copy from a random history: dates from a range wide enough to cross the keep limit, stamps that often collide. */
function randomSync(rng: Rng): StandupSync {
  const n = randInt(rng, 0, 30);
  const start = pick(rng, ['2025-09-01', '2025-10-01', '2026-09-20']);
  const xs: StandupEntry[] = [];
  for (let i = 0; i < n; i++) {
    const d = addDays(start, pick(rng, [0, 1, 2, 200, 370, 400, 401]));
    xs.push(entry(d, T0 + randInt(rng, 0, 4) * MIN, pick(rng, ['A.', 'B.', '']), pick(rng, [[], ['x'], ['x', 'y']])));
  }
  // Later saves on one device overwrite earlier ones for a date, as the app's log does.
  return sync(xs);
}

const eq = (a: unknown, b: unknown): void => expect(canonicalJson(a)).toBe(canonicalJson(b));

describe('mergeStandup is a join', () => {
  it('idempotent, commutative, and associative on 300 random copies, including the keep limit', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const rng = mulberry32(seed);
      const [a, b, c] = [randomSync(rng), randomSync(rng), randomSync(rng)];
      eq(mergeStandup(a, a), normalizeStandup(a));
      eq(mergeStandup(a, b), mergeStandup(b, a));
      eq(mergeStandup(mergeStandup(a, b), c), mergeStandup(a, mergeStandup(b, c)));
      const ab = mergeStandup(a, b);
      eq(mergeStandup(ab, b), ab);
      eq(parseStandupSync(JSON.parse(JSON.stringify(ab))), ab);
    }
  });

  it('per date, the later submission wins; a tie settles the same way on both devices', () => {
    const d = '2026-10-07';
    const early = sync([entry(d, T0, 'First take.')]);
    const late = sync([entry(d, T0 + MIN, 'Second take.')]);
    expect(mergeStandup(early, late).entries[d]?.transcript).toBe('Second take.');
    expect(mergeStandup(late, early).entries[d]?.transcript).toBe('Second take.');
    const tieA = sync([entry(d, T0, 'A.')]);
    const tieB = sync([entry(d, T0, 'B.')]);
    eq(mergeStandup(tieA, tieB), mergeStandup(tieB, tieA));
    // Other dates from each side are all kept.
    const other = sync([entry('2026-10-06', T0 - 999 * MIN)]);
    expect(Object.keys(mergeStandup(late, other).entries)).toEqual(['2026-10-06', d]);
  });

  it(`keeps only the latest ${STANDUP_KEEP_DAYS} dates`, () => {
    const xs = Array.from({ length: STANDUP_KEEP_DAYS + 5 }, (_, i) => entry(addDays('2025-01-01', i), T0));
    const s = sync(xs);
    const keys = Object.keys(s.entries);
    expect(keys).toHaveLength(STANDUP_KEEP_DAYS);
    expect(keys[0]).toBe(addDays('2025-01-01', 5));
  });
});

describe('standups in the learner envelope', () => {
  const withStandup = (e: StandupEntry, from = emptyLearner()) => {
    const v = plain(learnerValues(from));
    put(v.standup, e.date, e);
    return observeLearner(from, v, e.checkedAt);
  };

  it('merges per date across devices and survives JSON; the audio is never in it', () => {
    const phone = withStandup(entry('2026-10-06', T0, 'Did fractions.'));
    const mac = withStandup(entry('2026-10-07', T0 + MIN, 'Did sequences.', ['Say what is blocking progress, or that nothing is.']));
    const m = mergeLearner(phone, mac);
    eq(m, mergeLearner(mac, phone));
    expect(Object.keys(learnerValues(m).standup)).toEqual(['2026-10-06', '2026-10-07']);
    const r = parseLearner(JSON.parse(JSON.stringify(m)));
    expect(r.ok && canonicalJson(r.value)).toBe(canonicalJson(m));
    expect(Object.keys(m.standup.entries['2026-10-07']!).sort()).toEqual(['checkedAt', 'date', 'duration', 'flags', 'transcript']);
    // Written back to the stores and taken in again, nothing changes.
    eq(observeLearner(m, plain(learnerValues(m)), T0 + 999 * MIN), m);
  });

  it('an envelope from a build before standups reads as having none, and still merges', () => {
    const raw = JSON.parse(JSON.stringify(withStandup(entry('2026-10-06', T0)))) as Record<string, unknown>;
    delete raw.standup;
    const r = parseLearner(raw);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    eq(r.value.standup, emptyStandupSync());
    const mine = withStandup(entry('2026-10-07', T0));
    const m = mergeLearner(mine, r.value);
    expect(Object.keys(m.standup.entries)).toEqual(['2026-10-07']);
    eq(m, mergeLearner(r.value, mine));
  });

  it('a standup part that is not an object refuses the envelope; bad entries inside it are dropped', () => {
    const raw = JSON.parse(JSON.stringify(emptyLearner())) as Record<string, unknown>;
    expect(parseLearner({ ...raw, standup: 'x' })).toMatchObject({ ok: false, error: expect.stringMatching(/standup/) });
    const entries: StandupLog = JSON.parse('{"2026-10-07":{"transcript":"ok","checkedAt":1,"flags":[],"duration":60},"not a date":{"transcript":"x","checkedAt":1,"flags":[],"duration":1},"2026-10-06":{"transcript":3},"__proto__":{"transcript":"x","checkedAt":1,"flags":[],"duration":1}}') as StandupLog;
    const r = parseLearner({ ...raw, standup: { entries } });
    expect(r.ok && Object.keys(r.value.standup.entries)).toEqual(['2026-10-07']);
    expect(r.ok && r.value.standup.entries['2026-10-07']?.date).toBe('2026-10-07');
  });
});
