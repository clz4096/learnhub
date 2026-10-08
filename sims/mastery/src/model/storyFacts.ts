/**
 * The real data story mode reads (see story.ts), from the progress document, the campaign,
 * the paper registry, and the day planner's log. Pure: callers pass every input, including
 * the time and the registry (it loads on demand, so it may not be there yet).
 */
import { isMastered, isStudyEntry, type Progress } from '@learnhub/mastery';
import { currentProblemKey, gateOf } from '@learnhub/content';
import { BOOK } from '@learnhub/content/book';
import {
  SUBJECT_NAMES, aLevelRows, offerConditions, paperName, stepRows, tmuaRows,
  type ALevelGrade, type Admissions, type Campaign, type Condition, type Sitting,
} from './campaign';
import { TARGET_WEEK_HOURS, daysStudied, weekHours } from './campaignCalendar';
import { summarize } from './campaignSummary';
import { ALL_TOPICS } from './courses';
import type { LadderAttempt } from './ladder';
import { outcomeEvidence } from './outcome';
import { ratingInputs, ratingValues, ratings, type Rating, type TimedResult } from './ratings';
import { addDays, planDate, weekOf } from './day';
import type { DayLog } from './dayLog';
import type { StoryCampaign, StoryCondition, StoryFacts } from './story';

/** Every date: days studied count from the beginning, not from the campaign's start. */
const ALL_TIME = '0000-01-01';

/** A sitting counts as sat once it is finished and its marks are in, whatever the paper. */
export function papersSat(c: Campaign | null): number {
  if (c === null) return 0;
  return c.sittings.filter((s) => s.finishedAt !== null && (s.answers !== undefined || s.questionMarks !== undefined || s.total !== undefined)).length;
}

/**
 * Of the two full weeks (Sunday to Saturday) before the one containing `today`, those the
 * learner planned in the day planner whose ticked hours fell below the target. A week with
 * no planned day is not counted: the planner cannot say how it went.
 */
export function weeksShort(log: DayLog, today: string): number {
  let n = 0;
  for (const back of [7, 14]) {
    const day = addDays(today, -back);
    if (!weekOf(day).some((d) => log[d] !== undefined)) continue;
    if (weekHours(log, day) < TARGET_WEEK_HOURS) n++;
  }
  return n;
}

const A_ORDER: readonly ALevelGrade[] = ['A*', 'A', 'B', 'C', 'D', 'E', 'U'];
const STEP_ORDER: readonly string[] = ['S', '1', '2', '3', 'U'];

/** The latest sitting of each paper, oldest first: a resit replaces the earlier mark, as in the offer. */
function latestBy<T extends { sitting: Sitting }>(rows: readonly T[], key: (r: T) => string): T[] {
  const m = new Map<string, T>();
  for (const r of [...rows].sort((a, b) => a.sitting.startedAt - b.sitting.startedAt)) m.set(key(r), r);
  return [...m.values()];
}

/** The campaign's real results for a scene to read (see StoryCampaign). */
export function storyCampaign(adm: Admissions, c: Campaign, entry: number | null): StoryCampaign {
  const aRows = latestBy(aLevelRows(adm, c), (r) => r.paper.paper);
  const sRows = latestBy(stepRows(adm, c), (r) => r.paper);
  const aLevels = c.aLevelOrder.flatMap((sub) => aRows.filter((r) => r.subject === sub).map((r) => ({
    name: paperName(r.paper).replace(/:.*$/, ''), mark: r.mark, max: r.max, grade: r.grade as string | null, subject: SUBJECT_NAMES[sub],
  })));
  const tmua = tmuaRows(adm, c).flatMap((r) => [
    ...(r.p1 === null ? [] : [{ name: `TMUA ${r.year} Paper 1`, mark: r.p1, max: 20, grade: null }]),
    ...(r.p2 === null ? [] : [{ name: `TMUA ${r.year} Paper 2`, mark: r.p2, max: 20, grade: null }]),
  ]);
  const step = sRows.map((r) => ({ name: `${r.paper} ${r.year}`, mark: r.mark, max: 120, grade: r.grade as string | null }));
  // How far short each condition is: its weakest latest paper's grade against the need.
  const below = (x: Condition): number | null => {
    if (x.status === 'pending') return null;
    if (x.status === 'met') return 0;
    if (/^STEP \d$/.test(x.label)) {
      const r = sRows.find((y) => y.paper === x.label);
      return r === undefined ? null : Math.max(0, STEP_ORDER.indexOf(r.grade) - STEP_ORDER.indexOf('1'));
    }
    const need = A_ORDER.indexOf(x.need.split(' ')[0] as ALevelGrade);
    const rows = aRows.filter((r) => SUBJECT_NAMES[r.subject] === x.label);
    if (need < 0 || rows.length === 0) return null;
    return Math.max(0, Math.max(...rows.map((r) => A_ORDER.indexOf(r.grade))) - need);
  };
  const conditions: StoryCondition[] = offerConditions(adm, c).map((x) => ({ label: x.label, need: x.need, you: x.you, status: x.status, below: below(x) }));
  return {
    route: c.route, aLevels, tmua, step,
    interviews: c.interviews.flatMap((i) => (i.mark === null ? [] : [i.mark])),
    conditions, filedAt: c.applicationFiledAt, entry,
  };
}

/** The timed papers' results: full sittings and ladder halves kept to time (outcome.ts). Needs the registry. */
export function timedResults(adm: Admissions | null, c: Campaign | null, attempts: readonly LadderAttempt[]): TimedResult[] {
  if (adm === null) return [];
  return outcomeEvidence(adm, c, attempts).filter((e) => e.timed).map((e) => ({ mark: e.mark, max: e.max }));
}

/**
 * The player ratings from the progress document and the timed papers. Without the registry
 * (`adm` null) the timed papers cannot be marked, so Exam Temperament reads none yet: it
 * can only be low, never high, so no rating beat fires early.
 */
export function storyRatings(p: Progress, c: Campaign | null, adm: Admissions | null, attempts: readonly LadderAttempt[]): Rating[] {
  return ratings(ratingInputs(p, ALL_TOPICS, gateOf, timedResults(adm, c, attempts), currentProblemKey));
}

/**
 * The facts at `now`. With the paper registry (`adm`), a campaign, and a learner, the acts
 * complete and the campaign's results are known; without any of them they are null.
 */
export function storyFacts(
  p: Progress | null, c: Campaign | null, log: DayLog, now: number, adm: Admissions | null = null, attempts: readonly LadderAttempt[] = [],
): StoryFacts {
  // The story counts mastered topics (HOW-A-TOPIC-WORKS.md, "Reviews and the rest"): the gate met
  // and no cold retest missed since, not merely learned. A topic can sit in more than one step.
  const masteredMemo = new Map<string, boolean>();
  const mastered = (id: string): boolean => {
    if (p === null) return false;
    let m = masteredMemo.get(id);
    if (m === undefined) {
      m = isMastered(p, id, gateOf(id), currentProblemKey);
      masteredMemo.set(id, m);
    }
    return m;
  };
  let sectionsMastered = 0;
  const chaptersComplete: string[] = [];
  const termShare: Record<string, number> = {};
  for (const y of BOOK) {
    for (const t of y.terms) {
      let steps = 0;
      let done = 0;
      for (const ch of t.chapters) {
        let chSteps = 0;
        let chDone = 0;
        for (const sec of ch.sections) {
          const n = sec.steps.filter((s) => mastered(s.topicId)).length;
          if (sec.steps.length > 0 && n === sec.steps.length) sectionsMastered++;
          chSteps += sec.steps.length;
          chDone += n;
        }
        if (chSteps > 0 && chDone === chSteps) chaptersComplete.push(ch.id);
        steps += chSteps;
        done += chDone;
      }
      termShare[`${y.id}/${t.name}`] = steps === 0 ? 0 : done / steps;
    }
  }
  const history = p?.history ?? [];
  let actsComplete: number | null = null;
  let campaign: StoryCampaign | null = null;
  if (adm !== null && c !== null && p !== null) {
    const s = summarize(adm, c, p, log, now);
    // Acts complete in order, so the count is the number of acts done.
    actsComplete = s.acts.filter((a) => a.complete).length;
    campaign = storyCampaign(adm, c, s.projection.entry);
  }
  return {
    sectionsMastered,
    papersSat: papersSat(c),
    // A supervision entry's `correct` is its mark at or above the pass mark (SUPERVISION_PASS_MARK).
    supervisionsPassed: history.filter((h) => h.kind === 'supervision' && h.correct).length,
    // Gym work earns its own, lower REP (GYM_REP), so a gym-only day is not a day studied.
    daysStudied: daysStudied(log, history.filter(isStudyEntry).map((h) => planDate(h.at)), ALL_TIME),
    weekHours: weekHours(log, planDate(now)),
    weeksShort: weeksShort(log, planDate(now)),
    campaign,
    chaptersComplete,
    termShare,
    actsComplete,
    // A letter's scene reads the results behind it, so letters count once the results are known.
    letters: campaign === null || c === null ? [] : c.letters.map((l) => l.id),
    ratings: p === null ? null : ratingValues(storyRatings(p, c, adm, attempts)),
  };
}
