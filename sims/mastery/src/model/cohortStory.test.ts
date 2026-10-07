import { describe, expect, it } from 'vitest';
import { CLASSMATES, campaignEvents, cohortSteps, outcomeOf } from './cohort';
import {
  BEAT_FAR_BEHIND, BEAT_MISSED, BEAT_MISSED_THREE, COHORT_SCENES, FAR_BEHIND, MISSED_ONE, MISSED_THREE, albertCounts, albertStanding, cohortEvents,
  type CohortInputs,
} from './cohortStory';
import { DEFAULT_STANDUP } from './standup';
import { NO_NUMBERS, emptyStory, isChoice, newlyDue, strandOf, triggerText, triggered, type StoryFacts } from './story';
import { SCENES } from './storyScenes';
import { storyFacts } from './storyFacts';

const T0 = Date.UTC(2026, 9, 5, 14, 0);
const facts = (cohort: string[] | null | undefined): StoryFacts => ({ ...storyFacts(null, null, {}, T0), cohort });
const inputs = (o: Partial<CohortInputs>): CohortInputs => ({
  p: null, today: '2026-10-07', nowMin: 600, settings: DEFAULT_STANDUP, attended: new Set(), since: '2026-10-05', ...o,
});

describe('cohort events', () => {
  it('count a missed standup once it is over, and three in two weeks', () => {
    expect(cohortEvents(inputs({ today: '2026-10-05', nowMin: 600, since: '2026-10-05' }))).not.toContain(MISSED_ONE);
    expect(cohortEvents(inputs({ today: '2026-10-05', nowMin: 620, since: '2026-10-05' }))).toContain(MISSED_ONE);
    const two = cohortEvents(inputs({ today: '2026-10-06', nowMin: 700 }));
    expect(two).toContain(MISSED_ONE);
    expect(two).not.toContain(MISSED_THREE);
    expect(cohortEvents(inputs({ today: '2026-10-07', nowMin: 700 }))).toContain(MISSED_THREE);
    const went = new Set(['2026-10-05', '2026-10-06', '2026-10-07']);
    expect(cohortEvents(inputs({ today: '2026-10-07', nowMin: 700, attended: went }))).toEqual([]);
  });

  it('count far behind only after four weeks of Albert\'s own, never on the first day', () => {
    expect(cohortEvents(inputs({ today: '2026-11-20', since: '2026-11-20', nowMin: 500 }))).not.toContain(FAR_BEHIND);
    expect(cohortEvents(inputs({ today: '2026-11-20', since: '2026-10-01', nowMin: 500, attended: new Set() }))).toContain(FAR_BEHIND);
  });

  it('include a classmate\'s news once its day has come', () => {
    const decided = cohortEvents(inputs({ today: '2028-04-27', since: '2028-04-27', nowMin: 500 }));
    for (const c of CLASSMATES) expect(decided).toContain(`${outcomeOf(c).decision}:${c.id}`);
    expect(cohortEvents(inputs({ today: '2028-04-26', since: '2028-04-26', nowMin: 500 })).some((e) => e.includes(':'))).toBe(false);
  });
});

describe('cohort beats', () => {
  it('are in the story, after the other beats, one per classmate event', () => {
    for (const s of COHORT_SCENES) expect(SCENES).toContain(s);
    expect(COHORT_SCENES.length).toBe(3 + campaignEvents().length);
    expect(new Set(SCENES.map((s) => s.id)).size).toBe(SCENES.length);
    for (const s of COHORT_SCENES) {
      expect(strandOf(s)).toBe('beat');
      expect(s.script!.lines.length).toBeLessThanOrEqual(6);
      expect(s.script!.lines.some(isChoice)).toBe(false);
    }
  });

  it('fire on their event and never without cohort facts', () => {
    expect(triggered(BEAT_MISSED.trigger, facts([MISSED_ONE]))).toBe(true);
    expect(triggered(BEAT_MISSED.trigger, facts([]))).toBe(false);
    expect(triggered(BEAT_MISSED.trigger, facts(null))).toBe(false);
    expect(triggered(BEAT_MISSED.trigger, facts(undefined))).toBe(false);
    expect(triggered(BEAT_MISSED_THREE.trigger, facts([MISSED_THREE]))).toBe(true);
    expect(triggered(BEAT_FAR_BEHIND.trigger, facts([FAR_BEHIND]))).toBe(true);
    const due = newlyDue(SCENES, emptyStory(), facts([MISSED_ONE])).map((s) => s.id);
    expect(due).toContain('cohort-missed-standup');
    expect(triggerText(BEAT_MISSED.trigger)).toBe('plays when you miss a standup');
  });

  it('name the classmate in the title, never the outcome', () => {
    for (const s of COHORT_SCENES.slice(3)) {
      expect(s.title).not.toMatch(/offer|reject|miss|met|place|resit/i);
      expect(triggerText(s.trigger)).not.toMatch(/offer|reject|miss|met|resit/i);
      const who = CLASSMATES.find((c) => s.id.endsWith(`-${c.id}`))!;
      expect(s.title).toContain(who.first);
    }
  });

  it('read without dashes, and with a single speaker per message', () => {
    for (const s of COHORT_SCENES) {
      for (const l of s.script!.lines) {
        if (isChoice(l)) continue;
        const t = typeof l.text === 'string' ? l.text : l.text({ n: NO_NUMBERS });
        expect(t, s.id).not.toMatch(/[–—]/);
        if (l.kind === 'message') expect(l.speaker).toBeTruthy();
      }
    }
  });
});

describe('Albert against the cohort', () => {
  it('counts nothing for no learner, and ranks him last on nothing', () => {
    expect(albertCounts(null)).toEqual({ learned: 0, gated: 0 });
    const s = albertStanding(null, '2026-11-20');
    expect(s.rows).toHaveLength(7);
    expect(s.rank).toBe(7);
  });

  it('counts learned topics and the gate as the app does', () => {
    const p = { memory: { [cohortSteps()[0] as string]: { intervalDays: 1 } }, history: [], supervision: [] } as never;
    const c = albertCounts(p);
    expect(c.gated).toBe(0);
    expect(c.learned).toBe(1);
  });
});
