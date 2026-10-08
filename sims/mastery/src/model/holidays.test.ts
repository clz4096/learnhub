import { describe, expect, it } from 'vitest';
import { COHORT_START } from './cohort';
import { addDays, fmt, planFor, sunsetMinutes } from './day';
import { hebrewDate, isYomTov, restOf, yomTovBetween, yomTovOf } from './holidays';
import { DEFAULT_STANDUP, STANDUP_LENGTH, isStandupDay, nextStandup, previousStandup, standupBlock } from './standup';
import { isShabbat, restNow } from './story';

/** Published diaspora yom tov dates (each day observed, civil date of the daytime). */
const KNOWN: Record<number, Record<string, string[]>> = {
  2025: {
    Pesach: ['2025-04-13', '2025-04-14', '2025-04-19', '2025-04-20'],
    Shavuot: ['2025-06-02', '2025-06-03'],
    'Rosh Hashanah': ['2025-09-23', '2025-09-24'],
    'Yom Kippur': ['2025-10-02'],
    Sukkot: ['2025-10-07', '2025-10-08'],
    'Shemini Atzeret': ['2025-10-14'],
    'Simchat Torah': ['2025-10-15'],
  },
  2026: {
    Pesach: ['2026-04-02', '2026-04-03', '2026-04-08', '2026-04-09'],
    Shavuot: ['2026-05-22', '2026-05-23'],
    'Rosh Hashanah': ['2026-09-12', '2026-09-13'],
    'Yom Kippur': ['2026-09-21'],
    Sukkot: ['2026-09-26', '2026-09-27'],
    'Shemini Atzeret': ['2026-10-03'],
    'Simchat Torah': ['2026-10-04'],
  },
  2027: {
    Pesach: ['2027-04-22', '2027-04-23', '2027-04-28', '2027-04-29'],
    Shavuot: ['2027-06-11', '2027-06-12'],
    'Rosh Hashanah': ['2027-10-02', '2027-10-03'],
    'Yom Kippur': ['2027-10-11'],
    Sukkot: ['2027-10-16', '2027-10-17'],
    'Shemini Atzeret': ['2027-10-23'],
    'Simchat Torah': ['2027-10-24'],
  },
  2028: {
    Pesach: ['2028-04-11', '2028-04-12', '2028-04-17', '2028-04-18'],
    Shavuot: ['2028-05-31', '2028-06-01'],
    'Rosh Hashanah': ['2028-09-21', '2028-09-22'],
    'Yom Kippur': ['2028-09-30'],
    Sukkot: ['2028-10-05', '2028-10-06'],
    'Shemini Atzeret': ['2028-10-12'],
    'Simchat Torah': ['2028-10-13'],
  },
};

describe('the yom tov calendar', () => {
  it('reads the Hebrew date with Intl, leap years included', () => {
    expect(hebrewDate('2026-09-12')).toEqual({ month: 'Tishri', day: 1 });
    expect(hebrewDate('2027-04-22')).toEqual({ month: 'Nisan', day: 15 });
    // 5787 is a leap year: Adar I and Adar II, and Nisan still lands right after.
    expect(hebrewDate('2027-02-20')?.month).toBe('Adar I');
    expect(hebrewDate('2027-03-10')?.month).toBe('Adar II');
    expect(hebrewDate('not a date')).toBeNull();
  });

  it('matches the published dates, 2025 to 2028, and finds nothing else', () => {
    for (const [year, days] of Object.entries(KNOWN)) {
      const want = Object.entries(days).flatMap(([name, ds]) => ds.map((date) => ({ date, name }))).sort((a, b) => (a.date < b.date ? -1 : 1));
      expect(yomTovBetween(`${year}-01-01`, `${year}-12-31`)).toEqual(want);
    }
  });

  it('names the checks the brief gave: Rosh Hashanah 2026, Yom Kippur 2026, Pesach 2027', () => {
    expect(['2026-09-12', '2026-09-13'].map(yomTovOf)).toEqual(['Rosh Hashanah', 'Rosh Hashanah']);
    expect(yomTovOf('2026-09-11')).toBeNull();
    expect(yomTovOf('2026-09-21')).toBe('Yom Kippur');
    expect(yomTovOf('2027-04-22')).toBe('Pesach');
    expect(yomTovOf('2027-04-21')).toBeNull();
    // Chol hamoed is not yom tov.
    expect(isYomTov('2027-04-25')).toBe(false);
  });

  it('a rest day is its yom tov, else Shabbat on a Saturday', () => {
    expect(restOf('2026-09-12')).toBe('Rosh Hashanah');
    expect(restOf('2026-09-19')).toBe('Shabbat');
    expect(restOf('2026-09-22')).toBeNull();
  });
});

describe('yom tov kept like Shabbat', () => {
  // New York is UTC-4 in September and April (EDT).
  const ny = (date: string, h: number, m = 0): number => Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)), h + 4, m);

  it('no scene plays itself from sundown the evening before to sundown on the day', () => {
    const eve = '2026-09-20';
    const sunset = sunsetMinutes(eve);
    expect(isShabbat(ny(eve, 12))).toBe(false);
    expect(isShabbat(ny(eve, Math.floor((sunset + 1) / 60), (sunset + 1) % 60))).toBe(true);
    expect(restNow(ny('2026-09-21', 12))).toBe('Yom Kippur');
    const end = sunsetMinutes('2026-09-21');
    expect(isShabbat(ny('2026-09-21', Math.floor((end + 1) / 60), (end + 1) % 60))).toBe(false);
  });

  it('no standup on a yom tov weekday, and none past sundown on its eve', () => {
    expect(isStandupDay('2026-09-21')).toBe(false);
    expect(standupBlock('2026-09-21')).toBeNull();
    expect(previousStandup('2026-09-22')).toBe('2026-09-18');
    expect(nextStandup('2026-09-21')).toBe('2026-09-22');
    // Pesach 2027, Thursday and Friday: the next standup is Monday.
    expect(nextStandup('2027-04-22')).toBe('2027-04-26');
    // The eve of Shavuot 2027, Thursday 2027-06-10: held only if over by sundown.
    const eve = '2027-06-10';
    expect(isStandupDay(eve)).toBe(true);
    expect(isStandupDay(eve, { minutes: sunsetMinutes(eve) - STANDUP_LENGTH })).toBe(true);
    expect(isStandupDay(eve, { minutes: sunsetMinutes(eve) - 5 })).toBe(false);
    // Before the programme nothing is held anyway.
    expect(isStandupDay(addDays(COHORT_START, -1), DEFAULT_STANDUP)).toBe(false);
  });

  it('the planner plans nothing on yom tov before sundown, ends the eve at sundown, and keeps a two-day rest whole', () => {
    // Monday 2026-09-21, Yom Kippur.
    const yk = planFor('2026-09-21', 480);
    expect(yk.start).toBe(sunsetMinutes('2026-09-21'));
    expect(yk.notes[0]).toBe('Yom Kippur. Nothing scheduled until Yom Kippur ends.');
    expect(yk.slots.every((s) => s.start >= yk.start)).toBe(true);
    // Sunday 2026-09-20, its eve.
    const eve = planFor('2026-09-20', 480);
    expect(eve.stop).toBe(sunsetMinutes('2026-09-20'));
    expect(eve.notes[0]).toMatch(/^Yom Kippur begins at sundown: the plan ends then, /);
    expect(eve.slots.every((s) => s.end <= eve.stop)).toBe(true);
    // Friday 2026-04-03, Pesach and then Shabbat: nothing at all.
    const both = planFor('2026-04-03', 480);
    expect(both.slots).toEqual([]);
    expect(both.core).toBe(0);
    expect(both.notes[0]).toBe('Pesach, then Shabbat. Nothing scheduled until Shabbat ends.');
    // Saturday 2026-09-12, Rosh Hashanah on Shabbat, then the second day: nothing.
    expect(planFor('2026-09-12', 480).slots).toEqual([]);
  });

  it('an ordinary Friday and Saturday plan as before', () => {
    expect(planFor('2026-10-09', 480).notes[0]).toMatch(/^Friday: the plan ends at sundown, /);
    expect(planFor('2026-10-10', 480).notes[0]).toBe('Shabbat. Nothing scheduled until Shabbat ends.');
  });
});
