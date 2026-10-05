import { describe, expect, it } from 'vitest';
import * as adm from '@learnhub/content/admissions';
import {
  EFFECT_RULES, activeEffects, acts, aLevelRows, choiceLocks, currentAct, deliverLetters, finishSitting, newInterview,
  letterText, lettersDue, marked, moveSubject, newCampaign, offerConditions, parseCampaign, recordMarks, sittingScore,
  startSitting, stats, stepRows, stepTotal, timeLeft, tmuaRows,
  type Campaign, type Sitting, type Stat,
} from './campaign';
import {
  EARLIEST_ENTRY, TARGET_WEEK_HOURS, cycle, daysStudied, nextTimed, pace, passed, project, remainingHours, weekHours,
} from './campaignCalendar';
import { INTERVIEW_HEADER, PAPER_HEADER, interviewPacket, paperPacket } from './campaignPackets';
import { planFor, parseClock } from './day';

const T0 = Date.UTC(2026, 9, 5, 14);
const LESSONS_DONE = { lessons: { mastered: 10, total: 10 } };
const LESSONS_HALF = { lessons: { mastered: 5, total: 10 } };

/** Sits a paper and records its marks in one go. */
function sit(c: Campaign, paperId: string, marks: Pick<Sitting, 'answers' | 'questionMarks' | 'total'>, act = 1, at = T0): Campaign {
  const started = startSitting(c, paperId, act, at);
  const s = started.sittings[started.sittings.length - 1] as Sitting;
  return recordMarks(finishSitting(started, s.id, at + 60_000), s.id, marks);
}

const allRight = (year: number, paper: 1 | 2): string[] => [...(adm.tmuaKey(year, paper) as string)];
const step = (...firstSix: number[]): (number | null)[] => [...firstSix, ...Array<null>(12 - firstSix.length).fill(null)];

/** Act I complete for the maths route: two papers of each A level. */
function actOneDone(c: Campaign): Campaign {
  for (const id of ['edx-9ma0-1-2024', 'edx-9ma0-2-2024', 'edx-9fm0-1-2024', 'edx-9fm0-2-2024', 'ocr-h446-01-2024', 'ocr-h446-02-2024']) c = sit(c, id, { total: 50 });
  return c;
}

describe('the campaign state', () => {
  it('round-trips through storage and drops malformed entries one by one', () => {
    let c = newCampaign('maths', T0);
    c = sit(c, 'tmua-2016-p1', { answers: allRight(2016, 1) });
    c = { ...c, college: 'wolfson', interviews: [{ id: 'i1', shape: 'induction', college: 'wolfson', copiedAt: T0, mark: 15, notes: 'ok' }] };
    expect(parseCampaign(JSON.stringify(c))).toEqual(c);
    const raw = JSON.parse(JSON.stringify(c)) as Record<string, unknown>;
    raw.sittings = [...(raw.sittings as unknown[]), { id: 1 }, { id: 'x', paperId: 'p', startedAt: 'no' }];
    raw.college = 'trinity';
    raw.letters = [{ id: 'offer', at: T0 }, { id: 'fake', at: T0 }];
    const back = parseCampaign(JSON.stringify(raw));
    expect(back?.sittings).toHaveLength(1);
    expect(back?.college).toBeNull();
    expect(back?.letters).toEqual([{ id: 'offer', at: T0 }]);
    expect(parseCampaign('not json')).toBeNull();
    expect(parseCampaign(null)).toBeNull();
    expect(parseCampaign(JSON.stringify({ startedAt: T0, route: 'physics' }))).toBeNull();
  });

  it('allows one running sitting at a time and keeps its marks only once finished', () => {
    let c = startSitting(newCampaign('maths', T0), 'step-2019-2', 1, T0);
    expect(startSitting(c, 'step-2019-3', 1, T0)).toBe(c);
    const id = (c.sittings[0] as Sitting).id;
    expect(recordMarks(c, id, { total: 3 }).sittings[0]?.total).toBeUndefined();
    const paper = adm.registryPaper('step-2019-2');
    expect(paper).toBeDefined();
    if (paper === undefined) return;
    expect(timeLeft(paper, c.sittings[0] as Sitting, T0 + 60 * 60_000)).toBe(120 * 60_000);
    c = finishSitting(c, id, T0 + 1000);
    expect(c.sittings[0]?.finishedAt).toBe(T0 + 1000);
  });
});

describe('scoring', () => {
  it('counts the best six STEP questions', () => {
    expect(stepTotal([20, 3, null, 15, 18, 0, 7, 9, null, null, 12, 1])).toBe(20 + 18 + 15 + 12 + 9 + 7);
    expect(stepTotal(Array<null>(12).fill(null))).toBe(0);
  });

  it('marks TMUA answers against the official key, and unanswered as wrong', () => {
    const c = sit(newCampaign('cs', T0), 'tmua-2016-p1', { answers: allRight(2016, 1) });
    expect(sittingScore(adm, c.sittings[0] as Sitting)).toEqual({ mark: 20, max: 20 });
    const half = [...allRight(2016, 1).slice(0, 10), ...Array<null>(10).fill(null)];
    const d = sit(newCampaign('cs', T0), 'tmua-2016-p1', { answers: half });
    expect(sittingScore(adm, d.sittings[0] as Sitting)?.mark).toBe(10);
  });

  it('is null until a sitting is finished and marked', () => {
    const c = startSitting(newCampaign('maths', T0), 'edx-9ma0-1-2024', 1, T0);
    expect(sittingScore(adm, c.sittings[0] as Sitting)).toBeNull();
    expect(marked(adm, c)).toEqual([]);
  });
});

describe('the acts', () => {
  it('Act I needs the course lessons and two papers of each A level', () => {
    let c = newCampaign('maths', T0);
    expect(currentAct(acts(adm, c, LESSONS_DONE))).toBe(1);
    c = actOneDone(c);
    expect(currentAct(acts(adm, c, LESSONS_HALF))).toBe(1);
    const a = acts(adm, c, LESSONS_DONE);
    expect(a[0]?.complete).toBe(true);
    expect(currentAct(a)).toBe(2);
  });

  it('lists the A levels in the chosen order', () => {
    const c = { ...newCampaign('maths', T0), aLevelOrder: moveSubject(['maths', 'further-maths', 'cs'], 'cs', -1) };
    expect(c.aLevelOrder).toEqual(['maths', 'cs', 'further-maths']);
    expect(acts(adm, c, LESSONS_DONE)[0]?.requirements.map((r) => r.id)).toEqual(['lessons', 'a-maths', 'a-cs', 'a-further-maths']);
  });

  it('opens in order: a later act met early is not complete until those before it are', () => {
    let c = newCampaign('maths', T0);
    for (const id of ['tmua-2016-p1', 'tmua-2016-p2', 'tmua-2017-p1']) c = sit(c, id, { answers: Array<null>(20).fill(null) });
    const a = acts(adm, c, LESSONS_DONE);
    expect(a[1]?.met).toBe(true);
    expect(a[1]?.complete).toBe(false);
    expect(currentAct(a)).toBe(1);
  });

  it('runs the maths route to matriculation: STEP 2 and 3 in Act V', () => {
    let c = actOneDone(newCampaign('maths', T0));
    for (const id of ['tmua-2016-p1', 'tmua-2016-p2', 'tmua-2017-p1']) c = sit(c, id, { answers: Array<null>(20).fill(null) }, 2);
    c = { ...c, college: 'st-edmunds', applicationFiledAt: T0 };
    c = { ...c, interviews: [newInterview('i1', 'pre-reading', c, T0, 15), newInterview('i2', 'induction', c, T0, 9)] };
    expect(currentAct(acts(adm, c, LESSONS_DONE))).toBe(5);
    c = sit(c, 'step-2019-2', { questionMarks: step(20, 20, 20, 1) }, 5);
    expect(currentAct(acts(adm, c, LESSONS_DONE))).toBe(5);
    c = sit(c, 'step-2022-3', { questionMarks: step(20, 20, 20, 4) }, 5);
    expect(currentAct(acts(adm, c, LESSONS_DONE))).toBe(6);
  });

  it('the CS route has no STEP: Act V counts A level papers sat during it', () => {
    let c = actOneDone(newCampaign('cs', T0));
    for (const id of ['tmua-2016-p1', 'tmua-2016-p2', 'tmua-2017-p1']) c = sit(c, id, { answers: Array<null>(20).fill(null) }, 2);
    c = { ...c, college: 'wolfson', applicationFiledAt: T0 };
    c = { ...c, interviews: [newInterview('i1', 'pre-reading', c, T0, 15), newInterview('i2', 'induction', c, T0, 15)] };
    const before = acts(adm, c, LESSONS_DONE);
    expect(before[4]?.requirements.map((r) => r.id)).toEqual(['final']);
    expect(currentAct(before)).toBe(5);
    c = sit(c, 'edx-9ma0-1-2025', { total: 80 }, 5);
    c = sit(c, 'edx-9ma0-2-2025', { total: 80 }, 5);
    expect(currentAct(acts(adm, c, LESSONS_DONE))).toBe(6);
  });
});

describe('choices', () => {
  it('lock at their deadlines: route at Act III, college once filed, order after Act I, sitting after Act II', () => {
    const c = newCampaign('maths', T0);
    const open = { mca: false, tmua: false };
    expect(choiceLocks(c, 1, open)).toEqual({ route: null, college: null, order: null, sitting: null });
    const l = choiceLocks({ ...c, applicationFiledAt: T0 }, 3, open);
    expect(l.route).not.toBeNull();
    expect(l.college).not.toBeNull();
    expect(l.order).not.toBeNull();
    expect(l.sitting).not.toBeNull();
    expect(choiceLocks(c, 1, { mca: true, tmua: true }).college).not.toBeNull();
  });
});

describe('stats and effects', () => {
  const statOf = (list: Stat[], id: Stat['id']): number | null => list.find((s) => s.id === id)?.value ?? null;

  it('come from real data only, and are null without it', () => {
    const topics = [
      { area: 'proof', mastered: true }, { area: 'logic', mastered: true }, { area: 'sets', mastered: false },
      { area: 'calculus', mastered: false }, { area: 'counting', mastered: true },
    ];
    const list = stats(adm, newCampaign('maths', T0), { topics });
    expect(statOf(list, 'proof')).toBe(67);
    expect(statOf(list, 'pure')).toBe(0);
    expect(statOf(list, 'probability')).toBe(100);
    expect(statOf(list, 'programming')).toBeNull();
    expect(statOf(list, 'underTime')).toBeNull();
    expect(statOf(list, 'interview')).toBeNull();
    expect(activeEffects(list).map((e) => e.id)).toEqual(['step3-early']);
  });

  it('timed accuracy below 40 adds the drill; an interview below 50 schedules a second mock', () => {
    let c = sit(newCampaign('cs', T0), 'tmua-2016-p1', { answers: [...allRight(2016, 1).slice(0, 7), ...Array<null>(13).fill(null)] });
    c = { ...c, interviews: [newInterview('i1', 'induction', c, T0, 9)] };
    const list = stats(adm, c, { topics: [] });
    expect(statOf(list, 'underTime')).toBe(35);
    expect(statOf(list, 'interview')).toBe(45);
    expect(activeEffects(list).map((e) => e.id)).toEqual(['timed-drill', 'second-mock']);
  });

  it('has its thresholds in one table', () => {
    expect(EFFECT_RULES.map((r) => [r.stat, r.when, r.threshold])).toEqual([
      ['underTime', 'below', 40], ['proof', 'at-least', 60], ['interview', 'below', 50], ['programming', 'at-least', 70],
    ]);
  });
});

describe('the report', () => {
  it('grades a STEP mark on that year\'s boundaries and gives the share of real candidates at or below it', () => {
    const c = sit(newCampaign('maths', T0), 'step-2019-2', { questionMarks: step(20, 20, 20, 1) });
    const [r] = stepRows(adm, c);
    expect(r?.mark).toBe(61);
    expect(r?.grade).toBe('2');
    expect(r?.boundaries['1']).toBe(68);
    expect(r?.cumulative).toBe(38.8);
    expect(r?.atOrBelow).toBe(adm.stepPercentile(2019, 'STEP 2', 61));
    const cond = offerConditions(adm, c).find((x) => x.label === 'STEP 2');
    expect(cond).toEqual({ label: 'STEP 2', need: 'grade 1 needed', you: 'grade 2 on the 2019 paper (boundary for grade 1: 68)', status: 'short' });
  });

  it('grades A level papers on their boundaries and checks the offer per subject', () => {
    let c = sit(newCampaign('maths', T0), 'edx-9ma0-1-2024', { total: 81 });
    c = sit(c, 'edx-9ma0-2-2024', { total: 70 });
    const rows = aLevelRows(adm, c);
    expect(rows.map((r) => r.grade)).toEqual(['A*', 'A']);
    const cond = offerConditions(adm, c);
    expect(cond.map((x) => [x.label, x.status])).toEqual([
      ['A level Mathematics', 'short'], ['A level Further Mathematics', 'pending'], ['A level Computer Science', 'pending'],
      ['STEP 2', 'pending'], ['STEP 3', 'pending'],
    ]);
    expect(offerConditions(adm, { ...c, route: 'cs' }).map((x) => x.label)).toEqual(['A level Mathematics', 'A level Further Mathematics', 'A level Computer Science']);
  });

  it('adds TMUA papers of a year into raw marks out of 40', () => {
    let c = sit(newCampaign('cs', T0), 'tmua-2019-p1', { answers: allRight(2019, 1) });
    c = sit(c, 'tmua-2019-p2', { answers: Array<null>(20).fill(null) });
    expect(tmuaRows(adm, c)).toEqual([{ year: 2019, p1: 20, p2: 0 }]);
  });
});

describe('letters', () => {
  it('are due at milestones, delivered once, and written from the real numbers', () => {
    let c: Campaign = { ...newCampaign('maths', T0), college: 'hughes-hall', applicationFiledAt: T0 };
    expect(lettersDue(c, acts(adm, c, LESSONS_DONE))).toEqual(['received']);
    c = deliverLetters(c, ['received'], T0);
    expect(deliverLetters(c, ['received'], T0 + 1)).toBe(c);
    expect(lettersDue(c, acts(adm, c, LESSONS_DONE))).toEqual([]);
    const text = letterText(adm, c, 'received', 2029);
    expect(text.lines.join(' ')).toContain('Mathematics at Hughes Hall');
    expect(text.lines.join(' ')).toContain('October 2029');
    expect(letterText(adm, c, 'invitation', 2028).lines.join(' ')).toContain('Unverified');
  });
});

describe('the calendar', () => {
  it('uses the 2027 dates shifted a year for 2028 entry, and says so', () => {
    const y = cycle(2028, 'january');
    expect([y.ucas.date, y.mca.date, y.interviews.date, y.tmuaRegister?.date]).toEqual(['2028-01-13', '2028-01-20', '2028-03-30', '2027-12-21']);
    expect(y.ucas.basis).toBe('shifted');
    expect(cycle(2027, 'january').ucas.basis).toBe('published');
    expect(cycle(2028, 'october').tmua.date).toBe('2027-10-15');
  });

  it('projects each act and slips the entry year when a deadline is missed', () => {
    const today = '2026-10-05';
    const fast = project([100, 50, 8, 120, 120], 36, today, 'january');
    expect(fast.entry).toBe(EARLIEST_ENTRY);
    expect(fast.slipped).toBe(false);
    const slow = project([2000, 50, 8, 120, 120], 20, today, 'january');
    expect(slow.entry).toBeGreaterThan(EARLIEST_ENTRY);
    expect(slow.slipped).toBe(true);
    expect(slow.misses[0]?.act).toBe(2);
    // The October sitting is three months earlier, so the same pace can miss it.
    const p = project([1600, 50, 8, 120, 120], 30, today, 'october');
    const q = project([1600, 50, 8, 120, 120], 30, today, 'january');
    expect(p.misses.some((m) => m.act === 2)).toBe(true);
    expect(q.entry).toBe(EARLIEST_ENTRY);
  });

  it('takes the pace from the hours ticked off in the planner, or the 36-hour target with none', () => {
    const today = '2026-10-05';
    expect(pace({}, today)).toEqual({ hoursPerWeek: TARGET_WEEK_HOURS, logged: false });
    const plan = planFor(today, parseClock('09:00') as number);
    const study = plan.slots.filter((s) => s.kind === 'study');
    const ticks = study.map((s) => s.start);
    const minutes = study.reduce((a, s) => a + s.end - s.start, 0);
    const log = { [today]: { wake: '09:00', ticks } };
    expect(pace(log, today).hoursPerWeek).toBeCloseTo((minutes / 60) / 2);
    expect(weekHours(log, today)).toBeCloseTo(minutes / 60);
    expect(daysStudied(log, ['2026-10-01', '2026-10-05', '2026-09-01'], '2026-09-30')).toBe(2);
  });

  it('counts the hours left per act, zero for a complete act', () => {
    const c = newCampaign('maths', T0);
    const h = remainingHours(adm, c, acts(adm, c, LESSONS_HALF), 600);
    expect(h[0]).toBe(10 + 2 * 2 + 2 * 1.5 + 2 * 2.5);
    expect(h[4]).toBe(120 + 6);
    const done = actOneDone(c);
    expect(remainingHours(adm, done, acts(adm, done, LESSONS_DONE), 0)[0]).toBe(0);
  });

  it('knows when a cycle\'s choice deadlines have passed', () => {
    expect(passed(cycle(2028, 'january'), '2027-12-22')).toEqual({ mca: false, tmua: true });
    expect(passed(cycle(2028, 'january'), '2028-01-21')).toEqual({ mca: true, tmua: true });
  });
});

describe('the planner\'s inputs', () => {
  it('names the next timed paper of the open act: the first A level in the chosen order, then a TMUA sitting', () => {
    const c = { ...newCampaign('maths', T0), aLevelOrder: ['cs' as const, 'maths' as const, 'further-maths' as const] };
    expect(nextTimed(adm, c, acts(adm, c, LESSONS_DONE))).toEqual({ paperIds: ['ocr-h446-01-2024'], title: 'H446/01 June 2024', minutes: 150 });
    const d = actOneDone(newCampaign('maths', T0));
    expect(nextTimed(adm, d, acts(adm, d, LESSONS_DONE))).toEqual({ paperIds: ['tmua-2016-p1', 'tmua-2016-p2'], title: 'TMUA 2016, Papers 1 and 2', minutes: 150 });
  });
});

describe('packets', () => {
  it('a STEP paper packet names the paper, its zip file, the mark scheme, and the best-six rule', () => {
    const c = sit(newCampaign('maths', T0), 'step-2019-2', { questionMarks: step(1) });
    const paper = adm.registryPaper('step-2019-2');
    if (paper === undefined) throw new Error('missing');
    const text = paperPacket(paper, c.sittings[0] as Sitting);
    expect(text.startsWith(PAPER_HEADER)).toBe(true);
    expect(text).toContain('PAPER: step-2019-2');
    expect(text).toContain('STEP_2019_Paper2.pdf');
    expect(text).toContain('best 6 count');
    expect(text).toContain('Q12:');
    expect(text).not.toMatch(/[–—]/);
  });

  it('an interview packet carries the college\'s real format and the shape', () => {
    const c = { ...newCampaign('cs', T0), college: 'st-edmunds' as const };
    const text = interviewPacket(c, 'pre-reading', T0);
    expect(text.startsWith(INTERVIEW_HEADER)).toBe(true);
    expect(text).toContain('1, about 50 minutes');
    expect(text).toContain('short task');
    expect(text).toContain('computer science problem in 4 parts');
    expect(interviewPacket({ ...c, college: 'hughes-hall' }, 'induction', T0)).toContain('(unverified)');
    expect(text).not.toMatch(/[–—]/);
  });
});

describe('the planner\'s fixed blocks', () => {
  it('puts the next timed paper on today only, none once a paper was sat today, and the drill while Under time is below 40', async () => {
    const { campaignFixed, DRILL_MINUTES } = await import('./campaignSummary');
    const { startLearner, DEFAULT_COURSES } = await import('./learner');
    const { planDate } = await import('./day');
    const p = startLearner(T0, DEFAULT_COURSES, 60);
    const today = planDate(T0);
    const c = newCampaign('maths', T0);
    expect(campaignFixed(adm, c, p, today, today)).toEqual([
      { minutes: 120, title: 'Timed paper: 9MA0/01 June 2024', detail: 'From the campaign, to the clock', to: { view: 'paper', paperId: 'edx-9ma0-1-2024' } },
    ]);
    expect(campaignFixed(adm, c, p, '2026-10-06', today)).toEqual([]);
    const low = sit(c, 'edx-9ma0-1-2024', { total: 10 });
    const blocks = campaignFixed(adm, low, p, today, today);
    expect(blocks.map((b) => [b.title, b.minutes])).toEqual([['Timed drill', DRILL_MINUTES]]);
  });
});
