import { describe, expect, it } from 'vitest';
import {
  BED, CORE, GYM, OPTIONAL, WIND_DOWN, addDays, clockValue, fillBlocks, fmt, isDate, nyParts, parseClock, planDate, planDay, planFor,
  planMinute, replanDay, sunsetMinutes, tickedMinutes, weekOf, weekdayOf, type DayPlan, type Fillable, type FixedBlock,
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

/** Slots in order, none overlapping, all inside the plan's day. */
function sane(p: DayPlan): void {
  p.slots.forEach((s, i) => {
    expect(s.end).toBeGreaterThan(s.start);
    if (i > 0) expect(s.start).toBeGreaterThanOrEqual((p.slots[i - 1] as DayPlan['slots'][number]).end);
  });
  expect(Math.max(0, ...p.slots.map((s) => s.end))).toBeLessThanOrEqual(p.stop);
}

describe('fixed blocks (timed papers)', () => {
  const STEP: FixedBlock = { minutes: 180, title: 'STEP II', to: { view: 'progress' } };

  it('a 180-minute paper at 9:45 ends 12:45, before the gym, with lunch still before the gym', () => {
    const p = planFor(MON, at(9), [STEP]);
    sane(p);
    const first = of(p, 'study')[0];
    expect(first).toMatchObject({ start: at(9, 45), end: at(12, 45), title: 'STEP II', heavy: true, fixed: { index: 0, minutes: 180, to: { view: 'progress' } } });
    expect(p.gym).not.toBeNull();
    expect(first?.end).toBeLessThanOrEqual(p.gym as number);
    const lunch = of(p, 'meal').find((s) => s.title === 'Lunch');
    expect(lunch?.end).toBe(p.gym);
    expect(lunch?.start).toBeGreaterThanOrEqual(first?.end as number);
    // Counted as core: the paper plus 3 more hours of blocks make the 6.
    expect(p.core).toBe(CORE);
    expect(of(p, 'study').filter((s) => s.fixed === undefined).reduce((a, s) => a + s.end - s.start, 0)).toBe(CORE - 180);
    expect(p.notes).toEqual([]);
  });

  it.each([150, 120, 90])('a %i-minute paper goes first, before the 90-minute blocks', (minutes) => {
    const p = planFor(MON, at(9), [{ minutes, title: 'Paper' }]);
    sane(p);
    expect(of(p, 'study')[0]).toMatchObject({ start: at(9, 45), end: at(9, 45) + minutes, fixed: { index: 0 } });
    expect(p.core).toBe(CORE);
    expect(p.gym).not.toBeNull();
  });

  it('places several in order, each in the first stretch it fits', () => {
    const p = planFor(MON, at(9), [{ minutes: 150, title: 'TMUA 1' }, { minutes: 150, title: 'TMUA 2' }]);
    sane(p);
    const papers = p.slots.filter((s) => s.fixed !== undefined);
    expect(papers.map((s) => s.title)).toEqual(['TMUA 1', 'TMUA 2']);
    expect(papers[0]?.start).toBe(at(9, 45));
    // The second does not fit before the gym, so it goes after it.
    expect(papers[1]?.start).toBeGreaterThanOrEqual((p.gym as number) + GYM);
    expect(p.core).toBe(CORE);
  });

  it('a late start moves the gym so the paper still fits before it', () => {
    const p = planFor(MON, at(10, 15), [STEP]);
    sane(p);
    expect(of(p, 'study')[0]).toMatchObject({ start: at(11), end: at(14), title: 'STEP II' });
    expect(fmt(p.gym as number)).toBe('2:30pm');
    expect(of(p, 'meal')[0]).toMatchObject({ start: at(14), end: at(14, 30), title: 'Lunch' });
  });

  it('notes a paper that does not fit today', () => {
    const p = planFor(FRI, at(16), [STEP]);
    expect(p.slots.some((s) => s.fixed !== undefined)).toBe(false);
    expect(p.notes).toContain('STEP II, 180 minutes, does not fit today.');
  });

  it('with no fixed blocks, the plan is unchanged', () => {
    expect(planFor(MON, at(9), [])).toEqual(planFor(MON, at(9)));
  });
});

describe('replanDay', () => {
  const ends = (p: DayPlan): number => Math.max(...p.slots.map((s) => s.end));

  it('rebuilds from now, dropping an unticked block under way, with the same rules', () => {
    const plan = planFor(MON, at(9));
    const before = JSON.stringify(plan);
    const r = replanDay(plan, at(11), []);
    expect(JSON.stringify(plan)).toBe(before);
    sane(r);
    expect(r.slots[0]).toMatchObject({ start: at(11), kind: 'study' });
    expect(r.core).toBe(CORE);
    expect(r.gym).not.toBeNull();
    expect(of(r, 'gym')).toHaveLength(1);
    expect(of(r, 'meal').map((s) => s.title)).toEqual(['Lunch', 'Dinner']);
    expect(ends(r)).toBeLessThanOrEqual(BED - WIND_DOWN);
    expect(r.notes).toEqual(['Replanned from 11:00 am.']);
  });

  it('keeps ticked blocks and past ones where they are', () => {
    const plan = planFor(MON, at(9));
    const r = replanDay(plan, at(11), [at(9, 45)]);
    sane(r);
    expect(r.slots[0]).toEqual(plan.slots[0]);
    expect(r.slots[1]?.start).toBe(at(11, 15));
    expect(r.core).toBe(CORE);
    // Past and unticked: still there, and counted.
    const late = replanDay(plan, at(13, 10), []);
    sane(late);
    // The 1:00 pm break is under way, so it goes; the rest of the morning stays.
    expect(late.slots.slice(0, 3)).toEqual(plan.slots.slice(0, 3));
    expect(late.slots[3]).toMatchObject({ start: at(13, 10), kind: 'study' });
    expect(late.core).toBe(CORE);
  });

  it('keeps a ticked future block, and plans around it', () => {
    const plan = planFor(MON, at(9));
    const r = replanDay(plan, at(11), [at(16)]);
    sane(r);
    expect(r.slots).toContainEqual(plan.slots.find((s) => s.start === at(16)));
    expect(r.core).toBe(CORE);
  });

  it('keeps the gym under way and its lunch, and does not place it again', () => {
    const plan = planFor(MON, at(9));
    const r = replanDay(plan, at(15), []);
    sane(r);
    expect(of(r, 'gym')).toEqual(of(plan, 'gym'));
    expect(of(r, 'meal').map((s) => s.title)).toEqual(['Lunch', 'Dinner']);
    expect(r.gym).toBe(plan.gym);
    expect(r.slots.filter((s) => s.start >= at(15) && s.kind !== 'gym')[0]?.start).toBe(at(16));
    expect(r.core).toBe(CORE);
  });

  it('a gym that is over stays; a gym window that has passed is not planned, and says so', () => {
    const plan = planFor(MON, at(9));
    const r = replanDay(plan, at(17), []);
    expect(of(r, 'gym')).toEqual(of(plan, 'gym'));
    expect(r.notes).toEqual(['Replanned from 5:00 pm.']);
    const late = planFor(MON, at(15));
    const q = replanDay(late, at(17), []);
    expect(q.gym).toBeNull();
    expect(of(q, 'gym')).toEqual([]);
    expect(q.notes).toEqual(['The gym window, 2:00 to 2:30 pm, has passed or does not fit today.', 'Replanned from 5:00 pm.']);
  });

  it('a gym not yet started moves to a later start in the window if that fits better, and lunch moves with it', () => {
    const plan = planFor(MON, at(9));
    const r = replanDay(plan, at(13, 50), []);
    sane(r);
    expect(r.gym).not.toBeNull();
    expect(GYM_START_OK(r.gym as number)).toBe(true);
    const lunch = of(r, 'meal').find((s) => s.title === 'Lunch');
    expect(lunch === undefined || lunch.end === r.gym || lunch.start === (r.gym as number) + GYM).toBe(true);
  });

  it('respects Friday sundown and Shabbat', () => {
    const fri = planFor(FRI, at(9));
    const r = replanDay(fri, at(12), []);
    sane(r);
    expect(r.stop).toBe(fri.stop);
    expect(r.notes[0]).toBe('Friday: the plan ends at sundown, 6:25 pm.');
    const sat = planFor(SAT, at(9));
    const s = replanDay(sat, at(12), []);
    expect(Math.min(...s.slots.map((x) => x.start))).toBe(sat.start);
    expect(s.notes[0]).toBe(sat.notes[0]);
  });

  it('after the day ends, nothing new is planned', () => {
    const plan = planFor(MON, at(9));
    const r = replanDay(plan, BED, []);
    expect(r.slots).toEqual(plan.slots);
  });

  it('a replan of a replan keeps the first one\'s kept blocks', () => {
    const plan = planFor(MON, at(9));
    const r1 = replanDay(plan, at(11), [at(9, 45)]);
    const r2 = replanDay(r1, at(17), [at(9, 45)]);
    sane(r2);
    expect(r2.slots[0]).toEqual(plan.slots[0]);
    expect(r2.notes).toEqual(['Replanned from 5:00 pm.']);
  });

  it('a paper not started is placed again from now; a ticked one stays and is not repeated', () => {
    const fixed: FixedBlock[] = [{ minutes: 180, title: 'STEP II' }];
    const plan = planFor(MON, at(9), fixed);
    const moved = replanDay(plan, at(10), [], fixed);
    sane(moved);
    expect(moved.slots.filter((s) => s.fixed !== undefined).map((s) => [s.start, s.end])).toEqual([[at(10), at(13)]]);
    const done = replanDay(plan, at(13), [at(9, 45)], fixed);
    sane(done);
    expect(done.slots.filter((s) => s.fixed !== undefined)).toEqual([plan.slots[0]]);
    expect(done.core).toBe(CORE);
  });
});

const GYM_START_OK = (g: number): boolean => [at(14), at(14, 15), at(14, 30)].includes(g);
