import { describe, expect, it } from 'vitest';
import { canonicalJson, mulberry32, randInt, type Rng } from '@learnhub/mastery';
import { DEFAULT_STANDUP, type StandupSettings } from '@/model/standupSettings';
import {
  emptyStandupCfgSync, mergeStandupCfg, normalizeStandupCfg, observeStandupCfg, parseStandupCfgSync, standupSettingsOf,
  type StandupCfgSync,
} from './standupCfg';

const T0 = Date.UTC(2026, 9, 6, 13);
const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[randInt(rng, 0, xs.length - 1)] as T;

/** A device's history: settings changed at times from a small set, so stamps collide often. */
function history(rng: Rng, from: StandupCfgSync = emptyStandupCfgSync()): StandupCfgSync {
  let s = from;
  const v: StandupSettings = standupSettingsOf(s);
  for (let i = randInt(rng, 0, 8); i > 0; i--) {
    const f = randInt(rng, 0, 2);
    if (f === 0) v.enabled = pick(rng, [true, false]);
    else if (f === 1) v.minutes = pick(rng, [420, 600, 615, 1080]);
    else v.muted = pick(rng, [true, false]);
    s = observeStandupCfg(s, v, T0 + randInt(rng, 0, 5) * 60_000);
  }
  return s;
}

const eq = (a: StandupCfgSync, b: StandupCfgSync): void => expect(canonicalJson(a)).toBe(canonicalJson(b));

describe('standup settings in the envelope', () => {
  it('merge is idempotent, commutative, and associative on 300 random histories', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const rng = mulberry32(seed);
      const base = history(rng);
      const [a, b, c] = [history(rng, base), history(rng, base), history(rng, base)];
      eq(mergeStandupCfg(a, a), normalizeStandupCfg(a));
      eq(mergeStandupCfg(a, b), mergeStandupCfg(b, a));
      eq(mergeStandupCfg(mergeStandupCfg(a, b), c), mergeStandupCfg(a, mergeStandupCfg(b, c)));
    }
  });

  it('each field is the value written last; a merged copy taken in again changes nothing', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const rng = mulberry32(500 + seed);
      const [a, b] = [history(rng), history(rng)];
      const m = mergeStandupCfg(a, b);
      for (const f of ['minutes', 'muted', 'enabled'] as const) {
        const later = a[f].at >= b[f].at ? a[f] : b[f];
        expect(m[f].at).toBe(later.at);
        if (a[f].at !== b[f].at) expect(m[f].value).toBe(later.value);
      }
      eq(observeStandupCfg(m, standupSettingsOf(m), T0 + 99 * 60_000), m);
      eq(parseStandupCfgSync(JSON.parse(JSON.stringify(m)))!, m);
    }
  });

  it('a change beats the value it replaced even when the clock went back', () => {
    const s = observeStandupCfg(emptyStandupCfgSync(), { ...DEFAULT_STANDUP, minutes: 690 }, T0);
    const back = observeStandupCfg(s, { ...DEFAULT_STANDUP, minutes: 540 }, T0 - 3_600_000);
    expect(back.minutes.at).toBeGreaterThan(s.minutes.at);
    expect(standupSettingsOf(mergeStandupCfg(s, back)).minutes).toBe(540);
  });

  it('parses missing as the defaults, refuses a non-object, and drops a bad field to its default', () => {
    eq(parseStandupCfgSync(undefined)!, emptyStandupCfgSync());
    expect(parseStandupCfgSync('x')).toBeNull();
    expect(parseStandupCfgSync([])).toBeNull();
    const p = parseStandupCfgSync({
      minutes: { value: 601, at: T0 }, muted: { value: true, at: T0 }, enabled: { value: 'no', at: T0 },
    })!;
    expect(standupSettingsOf(p)).toEqual({ ...DEFAULT_STANDUP, muted: true });
    expect(p.minutes.at).toBe(0);
  });
});
