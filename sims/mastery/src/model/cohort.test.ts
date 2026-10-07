import { describe, expect, it, vi } from 'vitest';
import { cycle } from './campaignCalendar';
import {
  CLASSMATES, COHORT_CYCLE, COHORT_ENTRY, COHORT_START, GATEABLE, MILESTONES, PROGRAMME_TERMS, campaignEvents, classmateDay,
  cohortDayOf, cohortMedian, cohortSteps, draw, eventsBy, farBehind, gatedOn, outcomeOf, standing, stepsLearned, strengthWords, termOf,
  weekMode,
} from './cohort';
import { addDays, weekdayOf } from './day';

const DAYS = 600;
const dateAt = (d: number): string => addDays(COHORT_START, d);

describe('the classmates', () => {
  it('are six, with unconventional adult backgrounds, and distinct names, seeds, and strengths', () => {
    expect(CLASSMATES).toHaveLength(6);
    expect(new Set(CLASSMATES.map((c) => c.id)).size).toBe(6);
    expect(new Set(CLASSMATES.map((c) => c.seed)).size).toBe(6);
    for (const c of CLASSMATES) {
      expect(c.age).toBeGreaterThanOrEqual(21);
      expect(c.background.length).toBeGreaterThan(20);
      expect(c.background).not.toMatch(/[–—]/);
      for (const v of Object.values(c.strengths)) {
        expect(v).toBeGreaterThanOrEqual(0.6);
        expect(v).toBeLessThanOrEqual(1.4);
      }
      const w = strengthWords(c);
      expect(w.strong).toHaveLength(2);
      expect(w.strong).not.toContain(w.weak);
    }
    expect(new Set(CLASSMATES.map((c) => c.pronoun))).toEqual(new Set(['she', 'he']));
  });
});

describe('draws', () => {
  it('are in [0, 1), the same for the same key, and spread over the range', () => {
    const xs = Array.from({ length: 2000 }, (_, i) => draw('s', 'k', i));
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
    expect(draw('s', 'k', 7)).toBe(xs[7]);
    const mean = xs.reduce((a, x) => a + x, 0) / xs.length;
    expect(mean).toBeGreaterThan(0.45);
    expect(mean).toBeLessThan(0.55);
  });
});

describe('the progress curves', () => {
  it('are reproducible for a date: the same numbers whatever was asked before, and in a fresh module', async () => {
    const late = CLASSMATES.map((c) => classmateDay(c, dateAt(300)));
    const early = CLASSMATES.map((c) => classmateDay(c, dateAt(40)));
    vi.resetModules();
    const fresh = await import('./cohort');
    // The fresh module is asked for the early date first: it simulates fewer days, and must agree.
    expect(fresh.CLASSMATES.map((c) => fresh.classmateDay(c, dateAt(40)))).toEqual(early);
    expect(fresh.CLASSMATES.map((c) => fresh.classmateDay(c, dateAt(300)))).toEqual(late);
  });

  it('start at nothing on the first day and are null before it', () => {
    for (const c of CLASSMATES) {
      expect(classmateDay(c, addDays(COHORT_START, -1))).toBeNull();
      const d0 = classmateDay(c, COHORT_START)!;
      expect(d0.day).toBe(0);
      expect(d0.gated).toBe(0);
      expect(d0.learned).toBeLessThanOrEqual(2);
    }
    expect(cohortDayOf(COHORT_START)).toBe(0);
    expect(cohortDayOf('2026-10-07')).toBe(29);
  });

  it('only rise in topics mastered, and in topics learned rise overall (any dip is back within three weeks)', () => {
    for (const c of CLASSMATES) {
      const days = Array.from({ length: DAYS }, (_, d) => classmateDay(c, dateAt(d))!);
      for (let d = 1; d < DAYS; d++) {
        expect(days[d]!.gated, `${c.id} day ${d}`).toBeGreaterThanOrEqual(days[d - 1]!.gated);
        expect(days[d]!.reached).toBeGreaterThanOrEqual(days[d - 1]!.reached);
        expect(days[d]!.gated).toBeLessThanOrEqual(days[d]!.reached);
        expect(days[d]!.learned).toBeLessThanOrEqual(days[d]!.reached);
      }
      for (let d = 0; d + 21 < DAYS; d++) expect(days[d + 21]!.learned, `${c.id} day ${d}`).toBeGreaterThanOrEqual(days[d]!.learned);
      // The whole book is learned and every gate met in the end.
      expect(days[DAYS - 1]!.reached).toBe(cohortSteps().length);
      expect(days[DAYS - 1]!.gated).toBe(GATEABLE);
    }
  });

  it('have stuck weeks, bursts, and setbacks, and the less even classmates have more of them', () => {
    const modes = (id: string): string[] => {
      const c = CLASSMATES.find((x) => x.id === id)!;
      return Array.from({ length: 300 }, (_, d) => classmateDay(c, dateAt(d))!.mode);
    };
    const all = CLASSMATES.flatMap((c) => modes(c.id));
    for (const m of ['stuck', 'burst', 'setback', 'steady']) expect(all, m).toContain(m);
    // A setback lowers the topics learned that day.
    const c = CLASSMATES.find((x) => Array.from({ length: 300 }, (_, d) => classmateDay(x, dateAt(d))!.mode).includes('setback'))!;
    const d = Array.from({ length: 300 }, (_, i) => i).find((i) => classmateDay(c, dateAt(i))!.mode === 'setback')!;
    expect(classmateDay(c, dateAt(d))!.learned).toBeLessThan(classmateDay(c, dateAt(d - 1))!.learned);
    const uneven = (id: string): number => Array.from({ length: 200 }, (_, w) => weekMode(CLASSMATES.find((x) => x.id === id)!, w)).filter((m) => m !== 'steady').length;
    expect(uneven('dev')).toBeGreaterThan(uneven('wen'));
  });

  it('move faster in a strong subject: weekend days and stuck weeks are slower', () => {
    for (const c of CLASSMATES) {
      const per = (pick: (d: number) => boolean): number => {
        const ds = Array.from({ length: 150 }, (_, d) => d).filter((d) => d > 0 && pick(d));
        return ds.reduce((a, d) => a + classmateDay(c, dateAt(d))!.reached - classmateDay(c, dateAt(d - 1))!.reached, 0) / ds.length;
      };
      const weekday = per((d) => [1, 2, 3, 4, 5].includes(weekdayOf(dateAt(d))) && classmateDay(c, dateAt(d))!.mode === 'steady');
      const stuck = per((d) => classmateDay(c, dateAt(d))!.mode === 'stuck');
      expect(weekday).toBeGreaterThan(0.5);
      if (!Number.isNaN(stuck)) expect(stuck).toBeLessThan(weekday);
    }
  });

  it('list the steps learned in a window, each once, in book order', () => {
    const c = CLASSMATES[0]!;
    const a = stepsLearned(c, COHORT_START, dateAt(30));
    expect(a).toEqual([...a].sort((x, y) => x - y));
    expect(new Set(a).size).toBe(a.length);
    expect(a.length).toBe(classmateDay(c, dateAt(30))!.reached);
    expect(stepsLearned(c, dateAt(10), dateAt(9))).toEqual([]);
  });
});

describe('the calendar', () => {
  it('works to the 2028-entry cycle the campaign calendar computes', () => {
    const cy = cycle(COHORT_ENTRY, 'october');
    for (const k of ['tmua', 'ucas', 'mca', 'interviews', 'step', 'results'] as const) expect(COHORT_CYCLE[k]).toEqual(cy[k]);
  });

  it('has terms in order without overlaps, and milestones in date order', () => {
    for (let i = 1; i < PROGRAMME_TERMS.length; i++) expect(PROGRAMME_TERMS[i]!.start > PROGRAMME_TERMS[i - 1]!.end).toBe(true);
    expect(PROGRAMME_TERMS[0]!.start).toBe(COHORT_START);
    const dates = MILESTONES.map((m) => m.date);
    expect(dates).toEqual([...dates].sort());
    expect(termOf('2026-10-07')?.name).toBe('Autumn term 2026');
    expect(termOf('2026-12-25')).toBeNull();
    for (const m of MILESTONES) expect(m.label).not.toMatch(/[–—]/);
  });
});

describe('the admission campaign', () => {
  it('gives some offers, some rejections, and a resit, from the same simulation', () => {
    const os = CLASSMATES.map(outcomeOf);
    expect(os.filter((o) => o.decision === 'offer').length).toBeGreaterThanOrEqual(2);
    expect(os.filter((o) => o.decision === 'rejected').length).toBeGreaterThanOrEqual(1);
    expect(os.some((o) => o.again === 'resit')).toBe(true);
    expect(os.some((o) => o.result === 'met')).toBe(true);
  });

  it('is consistent: results only after an offer, a resit only after a miss, a reapplication only after a rejection', () => {
    for (const c of CLASSMATES) {
      const o = outcomeOf(c);
      expect(o.ready).toBeGreaterThan(0);
      expect(o.ready).toBeLessThanOrEqual(1);
      if (o.decision === 'rejected') expect(o.result).toBeNull();
      else expect(o.result).not.toBeNull();
      if (o.again === 'resit') expect(o.result).toBe('missed');
      if (o.again === 'reapply') expect(o.decision).toBe('rejected');
      if (o.again === null) expect(o.second).toBeNull();
      expect(outcomeOf(c)).toEqual(o);
    }
  });

  it('lists the events in date order, decisions before results, none before they happen', () => {
    const ev = campaignEvents();
    expect(ev.map((e) => e.date)).toEqual([...ev.map((e) => e.date)].sort());
    expect(new Set(ev.map((e) => e.id)).size).toBe(ev.length);
    for (const c of CLASSMATES) {
      const mine = ev.filter((e) => e.who === c.id);
      expect(mine[0]?.kind).toMatch(/^(offer|rejected)$/);
    }
    expect(eventsBy('2027-01-01')).toEqual([]);
    expect(eventsBy('2028-04-27').every((e) => e.kind === 'offer' || e.kind === 'rejected')).toBe(true);
    expect(eventsBy('2030-01-01')).toEqual(ev);
    // Every event falls Sunday to Thursday, so its beat is never set on Shabbat.
    for (const e of ev) expect([0, 1, 2, 3, 4]).toContain(weekdayOf(e.date));
  });
});

describe('the standing', () => {
  it('ranks by topics mastered, ties sharing a rank, with Albert after classmates he ties', () => {
    const date = dateAt(60);
    const top = Math.max(...CLASSMATES.map((c) => gatedOn(c, date)));
    const first = standing(date, { gated: top + 5, learned: 0 });
    expect(first[0]?.id).toBe('albert');
    expect(first[0]?.rank).toBe(1);
    const last = standing(date, { gated: 0, learned: 0 });
    expect(last[last.length - 1]?.id).toBe('albert');
    expect(last[last.length - 1]?.rank).toBe(7);
    const tie = standing(date, { gated: top, learned: 999 });
    const me = tie.findIndex((r) => r.id === 'albert');
    expect(tie[me]?.rank).toBe(1);
    expect(me).toBeGreaterThan(0);
    for (let i = 1; i < tie.length; i++) expect(tie[i]!.gated).toBeLessThanOrEqual(tie[i - 1]!.gated);
  });

  it('counts far behind only four weeks in, against half the middle of the cohort', () => {
    expect(farBehind(dateAt(10), 0)).toBe(false);
    const d = dateAt(60);
    const med = cohortMedian(d);
    expect(med).toBeGreaterThanOrEqual(8);
    expect(farBehind(d, 0)).toBe(true);
    expect(farBehind(d, Math.ceil(med / 2))).toBe(false);
  });
});
