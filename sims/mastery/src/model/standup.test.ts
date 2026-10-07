import { describe, expect, it } from 'vitest';
import { CLASSMATES, COHORT_START, classmateDay } from './cohort';
import { addDays, fmt, planFor, replanDay, sunsetMinutes, weekdayOf, CORE } from './day';
import {
  DEFAULT_STANDUP, STANDUP_DEFAULT, STANDUP_LENGTH, classmateUpdate, isStandupDay, missedStandups, nextStandup, previousStandup,
  spokenText, standupBlock, standupOrder, standupUpdates,
} from './standup';
import { parseStandupCfg } from './standupStore';

const MON = '2026-10-05';
const FRI = '2026-10-09';
const SAT = '2026-10-10';
const SUN = '2026-10-11';
const at = (h: number, m = 0): number => h * 60 + m;

describe('the standup schedule', () => {
  it('is Monday to Friday at 10:00 am New York time, 15 minutes', () => {
    expect(STANDUP_DEFAULT).toBe(at(10));
    expect(fmt(STANDUP_DEFAULT)).toBe('10:00am');
    expect(STANDUP_LENGTH).toBe(15);
    const week = Array.from({ length: 7 }, (_, i) => addDays(MON, i));
    expect(week.map((d) => isStandupDay(d))).toEqual([true, true, true, true, true, false, false]);
    expect(isStandupDay(SAT)).toBe(false);
    expect(isStandupDay(SUN)).toBe(false);
  });

  it('never runs into Shabbat: a Friday standup set past sundown is not held', () => {
    expect(isStandupDay(FRI)).toBe(true);
    // A Friday in December, sundown about 4:30 pm.
    const dec = '2026-12-18';
    expect(weekdayOf(dec)).toBe(5);
    const sundown = sunsetMinutes(dec);
    expect(isStandupDay(dec, { minutes: sundown - STANDUP_LENGTH })).toBe(true);
    expect(isStandupDay(dec, { minutes: sundown - 5 })).toBe(false);
    expect(isStandupDay('2026-12-17', { minutes: sundown })).toBe(true);
  });

  it('skips holidays it is given, days before the programme, and every day when off', () => {
    expect(isStandupDay(MON, DEFAULT_STANDUP, new Set([MON]))).toBe(false);
    expect(isStandupDay('2026-09-07')).toBe(false);
    expect(isStandupDay(COHORT_START)).toBe(true);
    expect(isStandupDay(MON, { minutes: STANDUP_DEFAULT, enabled: false })).toBe(false);
  });

  it('finds the previous and next standup across a weekend', () => {
    expect(previousStandup(MON)).toBe('2026-10-02');
    expect(previousStandup(COHORT_START)).toBeNull();
    expect(nextStandup(SAT)).toBe('2026-10-12');
    expect(nextStandup(MON)).toBe(MON);
    expect(nextStandup('2026-08-01')).toBe(COHORT_START);
  });

  it('is a block pinned at its time in the day planner, not study, with the core still whole', () => {
    const b = standupBlock(MON)!;
    expect(b).toMatchObject({ minutes: 15, at: 600, title: 'Standup', to: { view: 'standup' } });
    expect(standupBlock(SAT)).toBeNull();
    const p = planFor(MON, at(9), [b]);
    const meet = p.slots.filter((s) => s.kind === 'meeting');
    expect(meet.map((s) => `${fmt(s.start)}-${fmt(s.end)}`)).toEqual(['10:00am-10:15am']);
    for (const s of p.slots) if (s !== meet[0]) expect(s.end <= 600 || s.start >= 615, `${fmt(s.start)} ${s.kind}`).toBe(true);
    expect(p.core).toBe(CORE);
    expect(p.notes).toEqual([]);
    // A configured time moves it.
    const q = planFor(MON, at(9), [standupBlock(MON, { minutes: at(13) })!]);
    expect(q.slots.find((s) => s.kind === 'meeting')?.start).toBe(at(13));
  });

  it('is not planned when the day starts after it, and says so', () => {
    const p = planFor(MON, at(11), [standupBlock(MON)!]);
    expect(p.slots.some((s) => s.kind === 'meeting')).toBe(false);
    expect(p.notes).toContain('Standup at 10:00 am does not fit today.');
  });

  it('stays where it is when the day is replanned, before or after it', () => {
    const fixed = [standupBlock(MON)!];
    const p = planFor(MON, at(8), fixed);
    const before = replanDay(p, at(9, 30), [], fixed);
    expect(before.slots.filter((s) => s.kind === 'meeting').map((s) => s.start)).toEqual([600]);
    const after = replanDay(p, at(11), [], fixed);
    expect(after.slots.filter((s) => s.kind === 'meeting').map((s) => s.start)).toEqual([600]);
    expect(after.notes.some((n) => n.startsWith('Standup'))).toBe(false);
  });

  it('counts a standup missed only once it is over, from the day counting began', () => {
    const attended = new Set(['2026-10-06']);
    expect(missedStandups(MON, '2026-10-07', at(9), attended)).toEqual([MON]);
    expect(missedStandups(MON, '2026-10-07', at(10, 15), attended)).toEqual([MON, '2026-10-07']);
    expect(missedStandups(MON, SUN, at(12), new Set())).toEqual([MON, '2026-10-06', '2026-10-07', '2026-10-08', FRI]);
    expect(missedStandups(MON, MON, at(12), new Set(), { minutes: 600, enabled: false })).toEqual([]);
  });
});

describe('the stored settings', () => {
  it('read defaults from nothing, and keep only valid values', () => {
    expect(parseStandupCfg(null)).toEqual({ minutes: 600, muted: false, enabled: true, since: null });
    expect(parseStandupCfg('{bad')).toEqual(parseStandupCfg(null));
    // Attendance is not kept here (it is the standup log's), so an old field is ignored.
    const st = parseStandupCfg(JSON.stringify({ minutes: 615, muted: true, enabled: false, attended: ['2026-10-06'], since: '2026-10-01' }));
    expect(st).toEqual({ minutes: 615, muted: true, enabled: false, since: '2026-10-01' });
    expect(parseStandupCfg(JSON.stringify({ minutes: 601 })).minutes).toBe(600);
    expect(parseStandupCfg(JSON.stringify({ minutes: 1500 })).minutes).toBe(600);
    expect(parseStandupCfg(JSON.stringify({ since: 'yesterday' })).since).toBeNull();
  });
});

describe('the classmates\' updates', () => {
  const dates = Array.from({ length: 200 }, (_, i) => addDays(COHORT_START, i)).filter((d) => isStandupDay(d));

  it('say yesterday, today, and what blocks them, in short plain sentences without dashes', () => {
    for (const d of dates) {
      for (const u of standupUpdates(d)) {
        expect(u.yesterday).toMatch(/^Yesterday: /);
        expect(u.today).toMatch(/^Today: /);
        expect(u.blocked).toMatch(/^Blocked on: /);
        for (const x of [u.yesterday, u.today, u.blocked]) {
          expect(x).not.toMatch(/[–—]/);
          expect(x.length).toBeLessThan(260);
          expect(x).toMatch(/[.!?]$/);
        }
      }
    }
  });

  it('are the same for a date every time, and vary from day to day', () => {
    const d = dates[30]!;
    expect(standupUpdates(d)).toEqual(standupUpdates(d));
    for (const c of CLASSMATES) {
      const lines = new Set(dates.slice(5, 60).map((x) => classmateUpdate(c, x)!.yesterday.replace(/Yesterday: .*?\. /, '')));
      expect(lines.size, c.id).toBeGreaterThan(3);
      const blocked = new Set(dates.slice(5, 120).map((x) => classmateUpdate(c, x)!.blocked));
      expect(blocked.size, c.id).toBeGreaterThan(1);
    }
  });

  it('start with orientation on the first day, and follow the simulated days after', () => {
    for (const u of standupUpdates(COHORT_START)) expect(u.yesterday).toBe('Yesterday: orientation, and the reading list.');
    expect(classmateUpdate(CLASSMATES[0]!, SAT)).toBeNull();
    // A classmate in a stuck week says what they are stuck on, and asks for help.
    let stuck = 0;
    for (const c of CLASSMATES) {
      for (const d of dates) {
        if (classmateDay(c, d)?.mode !== 'stuck') continue;
        const u = classmateUpdate(c, d)!;
        expect(u.blocked).not.toMatch(/^Blocked on: (Nothing|Nope|All)/);
        stuck++;
      }
    }
    expect(stuck).toBeGreaterThan(0);
  });

  it('come in an order shuffled by the date, every classmate once', () => {
    const a = standupOrder(MON).map((c) => c.id);
    expect([...a].sort()).toEqual(CLASSMATES.map((c) => c.id).sort());
    expect(standupOrder(MON).map((c) => c.id)).toEqual(a);
    const orders = new Set(dates.slice(0, 20).map((d) => standupOrder(d).map((c) => c.id).join()));
    expect(orders.size).toBeGreaterThan(10);
  });

  it('read aloud with the classmate\'s name first and the labels as pauses', () => {
    const c = CLASSMATES[0]!;
    const u = classmateUpdate(c, MON)!;
    const t = spokenText(c, u);
    expect(t.startsWith(`${c.first}. Yesterday, `)).toBe(true);
    expect(t).toContain(' Today, ');
    expect(t).toContain(' Blocked on, ');
  });
});
