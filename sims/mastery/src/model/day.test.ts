import { describe, expect, it } from 'vitest';
import {
  BED, CORE, OPTIONAL, WIND_DOWN, addDays, clockValue, fillBlocks, fmt, isDate, nyParts, parseClock, planDate, planDay, planFor,
  planMinute, sunsetMinutes, tickedMinutes, weekOf, weekdayOf, type DayPlan, type Fillable,
} from './day';

const MON = '2026-10-05';
const FRI = '2026-10-09';
const SAT = '2026-10-10';
const at = (h: number, m = 0): number => h * 60 + m;
const rows = (p: DayPlan): string[] => p.slots.map((s) => `${fmt(s.start)}-${fmt(s.end)} ${s.kind}`);
const of = (p: DayPlan, kind: string): DayPlan['slots'] => p.slots.filter((s) => s.kind === kind);

describe('planDay, the prototype cases', () => {
  it('wake 9:00 on a weekday: 6 hours of core done by 6:30 pm, 2 optional hours, gym at 2:30', () => {
    const p = planFor(MON, at(9));
    expect(p.core).toBe(CORE);
    expect(p.optional).toBe(OPTIONAL);
    expect(fmt(p.coreEnd as number)).toBe('6:30pm');
    expect(fmt(p.gym as number)).toBe('2:30pm');
    expect(p.notes).toEqual([]);
    expect(rows(p)).toEqual([
      '9:45am-11:15am study', '11:15am-11:30am break', '11:30am-1:00pm study', '1:00pm-1:15pm break', '1:15pm-2:00pm study',
      '2:00pm-2:30pm meal', '2:30pm-4:00pm gym', '4:00pm-5:30pm study', '5:30pm-5:45pm break', '5:45pm-6:30pm study',
      '6:30pm-6:45pm break', '6:45pm-8:00pm optional', '8:00pm-9:00pm meal', '9:00pm-9:45pm optional',
    ]);
    // Full blocks take new material; the short ones are light.
    expect(of(p, 'study').map((s) => s.heavy)).toEqual([true, true, false, true, false]);
  });

  it('wake 1:00 pm: lunch before a 2:15 gym, 6 hours done by 11:30 pm', () => {
    const p = planFor(MON, at(13));
    expect(fmt(p.gym as number)).toBe('2:15pm');
    expect(rows(p).slice(0, 2)).toEqual(['1:45pm-2:15pm meal', '2:15pm-3:45pm gym']);
    expect(p.core).toBe(CORE);
    expect(fmt(p.coreEnd as number)).toBe('11:30pm');
    expect(p.optional).toBe(45);
  });

  it('wake 1:30 pm: lunch moves to right after the gym', () => {
    const p = planFor(MON, at(13, 30));
    expect(fmt(p.gym as number)).toBe('2:15pm');
    expect(rows(p).slice(0, 2)).toEqual(['2:15pm-3:45pm gym', '3:45pm-4:15pm meal']);
    expect(of(p, 'meal')[0]?.detail).toBe('After the gym today');
    expect(p.core).toBe(CORE);
  });

  it('wake 3:00 pm: no gym, still 6 hours by 11:30 pm', () => {
    const p = planFor(MON, at(15));
    expect(p.gym).toBeNull();
    expect(of(p, 'gym')).toEqual([]);
    expect(p.core).toBe(CORE);
    expect(fmt(p.coreEnd as number)).toBe('11:30pm');
    expect(p.notes).toEqual(['The gym window, 2:00 to 2:30 pm, has passed or does not fit today.']);
  });

  it('Friday ends at Brooklyn sundown', () => {
    const p = planFor(FRI, at(9));
    expect(p.stop).toBe(sunsetMinutes(FRI));
    expect(fmt(p.stop)).toBe('6:25pm');
    expect(Math.max(...p.slots.map((s) => s.end))).toBeLessThanOrEqual(p.stop);
    expect(p.notes).toEqual(['Friday: the plan ends at sundown, 6:25 pm.']);
    expect(p.core).toBe(355);
    expect(p.coreEnd).toBeNull();
    expect(p.optional).toBe(0);
  });

  it('Friday after sundown: nothing is planned', () => {
    const p = planFor(FRI, at(20));
    expect(p.slots).toEqual([]);
    expect(p.core).toBe(0);
  });

  it('Saturday starts after sundown, with no gym note', () => {
    const p = planFor(SAT, at(9));
    expect(p.start).toBe(sunsetMinutes(SAT));
    expect(Math.min(...p.slots.map((s) => s.start))).toBe(p.start);
    expect(p.gym).toBeNull();
    expect(p.notes).toEqual([`Shabbat: the plan starts after sundown, ${fmt(p.start).replace(/(am|pm)$/, ' $1')}.`]);
    expect(p.core).toBe(270);
  });

  it('Saturday, waking after sundown: the day starts after getting going', () => {
    const p = planFor(SAT, at(20));
    expect(p.start).toBe(at(20, 45));
    expect(p.notes).toEqual([]);
    expect(p.core).toBe(180);
  });

  it('ends with wind down before bed at 1:00 am', () => {
    const p = planFor(MON, at(13));
    expect(p.stop).toBe(BED - WIND_DOWN);
    expect(Math.max(...p.slots.map((s) => s.end))).toBeLessThanOrEqual(BED - WIND_DOWN);
  });

  it('never leaves a break with nothing after it before dinner', () => {
    const p = planFor(MON, at(13, 15));
    expect(rows(p)).not.toContain('7:15pm-7:30pm break');
    for (const [i, s] of p.slots.entries()) {
      if (s.kind !== 'break') continue;
      const next = p.slots[i + 1];
      expect(next?.start).toBe(s.end);
      expect(next?.kind === 'study' || next?.kind === 'optional').toBe(true);
    }
    const early = planFor(MON, at(5));
    expect(early.slots.at(-1)?.kind).toBe('meal');
    expect(rows(early)).not.toContain('4:45pm-5:00pm break');
  });

  it('every slot is in order and none overlap', () => {
    for (let w = at(5); w < at(24); w += 5) {
      for (const date of [MON, FRI, SAT]) {
        const p = planFor(date, w);
        for (let i = 1; i < p.slots.length; i++) expect(p.slots[i]?.start).toBeGreaterThanOrEqual(p.slots[i - 1]?.end as number);
        const study = p.slots.filter((s) => s.kind === 'study').reduce((a, s) => a + s.end - s.start, 0);
        expect(study).toBe(p.core);
        expect(p.core).toBeLessThanOrEqual(CORE);
        expect(p.optional).toBeLessThanOrEqual(OPTIONAL);
      }
    }
  });

  it('the latest wake for a full day is about 1:00 pm on a weekday; later the core shrinks', () => {
    expect(planFor(MON, at(15)).core).toBe(CORE);
    expect(planFor(MON, at(18)).core).toBeLessThan(CORE);
  });
});

describe('wake times after midnight', () => {
  it('reads 12:30 am and 4:59 am as the night before, where nothing fits', () => {
    expect(parseClock('00:30')).toBe(1470);
    expect(parseClock('04:59')).toBe(1739);
    const p = planDay(1470, 1, 1110);
    expect(p.slots).toEqual([]);
    expect(p.core).toBe(0);
    expect(p.coreEnd).toBeNull();
  });

  it('reads 5:00 am as an early start', () => {
    expect(parseClock('05:00')).toBe(300);
    const p = planFor(MON, 300);
    expect(p.core).toBe(CORE);
    expect(fmt(p.gym as number)).toBe('2:00pm');
  });

  it('rejects what is not a time, and writes plan minutes back as HH:MM', () => {
    expect(parseClock('')).toBeNull();
    expect(parseClock('24:00')).toBeNull();
    expect(parseClock('9:00')).toBeNull();
    expect(clockValue(1470)).toBe('00:30');
    expect(clockValue(at(9, 5))).toBe('09:05');
  });

  it('a moment before 5:00 am belongs to the previous plan day', () => {
    // 2026-10-06 00:30 in New York (EDT, UTC-4).
    const late = Date.UTC(2026, 9, 6, 4, 30);
    expect(planDate(late)).toBe('2026-10-05');
    expect(planMinute(late)).toBe(1470);
    const morning = Date.UTC(2026, 9, 6, 13, 0);
    expect(planDate(morning)).toBe('2026-10-06');
    expect(planMinute(morning)).toBe(at(9));
  });
});

describe('Brooklyn sundown', () => {
  it.each([
    ['2026-10-09', at(18, 25)],
    ['2026-12-18', at(16, 30)],
    ['2027-06-18', at(20, 29)],
  ])('%s within 2 minutes', (date, expected) => {
    expect(Math.abs(sunsetMinutes(date) - expected)).toBeLessThanOrEqual(2);
  });

  it('jumps by about an hour across the DST boundaries', () => {
    // DST ends 2026-11-01: clocks go back, so sundown is an hour earlier on the clock.
    const before = sunsetMinutes('2026-10-31');
    const after = sunsetMinutes('2026-11-01');
    expect(before - after).toBeGreaterThanOrEqual(59);
    expect(before - after).toBeLessThanOrEqual(63);
    // DST starts 2026-03-08.
    const s0 = sunsetMinutes('2026-03-07');
    const s1 = sunsetMinutes('2026-03-08');
    expect(s1 - s0).toBeGreaterThanOrEqual(59);
    expect(s1 - s0).toBeLessThanOrEqual(63);
  });

  it('converts with the New York time zone, not the machine one', () => {
    expect(nyParts(Date.UTC(2026, 0, 15, 17, 0))).toEqual({ date: '2026-01-15', minutes: at(12) });
    expect(nyParts(Date.UTC(2026, 6, 15, 17, 0))).toEqual({ date: '2026-07-15', minutes: at(13) });
  });
});

describe('dates', () => {
  it('weekdays, day arithmetic, and the week', () => {
    expect(weekdayOf(MON)).toBe(1);
    expect(weekdayOf(FRI)).toBe(5);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(weekOf(MON)).toEqual(['2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10']);
    expect(isDate('2026-02-30')).toBe(false);
    expect(isDate(MON)).toBe(true);
  });

  it('counts ticked study and optional minutes only', () => {
    const p = planFor(MON, at(9));
    const gym = of(p, 'gym')[0]?.start as number;
    expect(tickedMinutes(p, [at(9, 45), at(18, 45), gym])).toBe(90 + 75);
  });
});

describe('fillBlocks', () => {
  type Item = Fillable & { id: string };
  const item = (id: string, kind: Item['kind'], minutes: number): Item => ({ id, kind, minutes });
  const ids = (r: { filled: Item[][] }): string[][] => r.filled.map((b) => b.map((x) => x.id));

  it('puts new lessons in the earliest full blocks and reviews in light blocks and optional time', () => {
    const blocks = [
      { minutes: 90, heavy: true, optional: false },
      { minutes: 90, heavy: true, optional: false },
      { minutes: 45, heavy: false, optional: false },
      { minutes: 75, heavy: false, optional: true },
    ];
    const r = fillBlocks(blocks, [
      item('r1', 'review', 10), item('l1', 'lesson', 50), item('l2', 'lesson', 50), item('r2', 'review', 10), item('d1', 'redo', 30),
      item('r3', 'review', 40),
    ]);
    // l2 does not fit beside l1, so it opens block 2; the redo takes the room left in block 1.
    expect(ids(r)).toEqual([['l1', 'd1'], ['l2'], ['r1', 'r2'], ['r3']]);
    expect(r.left).toEqual([]);
  });

  it('leaves blocks empty when the queue runs dry, and places leftovers where they fit', () => {
    const blocks = [{ minutes: 90, heavy: true, optional: false }, { minutes: 90, heavy: true, optional: false }];
    const r = fillBlocks(blocks, [item('r1', 'review', 10), item('l1', 'lesson', 20)]);
    // No light block today, so the review joins the first block with room.
    expect(ids(r)).toEqual([['l1', 'r1'], []]);
  });

  it('gives an empty block one item even if it is longer, and reports what fits nowhere', () => {
    const r = fillBlocks([{ minutes: 30, heavy: true, optional: false }], [item('l1', 'lesson', 60), item('l2', 'lesson', 20)]);
    expect(ids(r)).toEqual([['l1']]);
    expect(r.left.map((x) => x.id)).toEqual(['l2']);
  });
});
