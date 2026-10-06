/**
 * The real data story mode reads (see story.ts), from the progress document, the campaign,
 * and the day planner's log. Pure: callers pass every input, including the time.
 */
import type { Progress } from '@learnhub/mastery';
import { BOOK } from '@learnhub/content/book';
import type { Campaign } from './campaign';
import { daysStudied, weekHours } from './campaignCalendar';
import { planDate } from './day';
import type { DayLog } from './dayLog';
import type { StoryFacts } from './story';

/** Every date: days studied count from the beginning, not from the campaign's start. */
const ALL_TIME = '0000-01-01';

/** A sitting counts as sat once it is finished and its marks are in, whatever the paper. */
export function papersSat(c: Campaign | null): number {
  if (c === null) return 0;
  return c.sittings.filter((s) => s.finishedAt !== null && (s.answers !== undefined || s.questionMarks !== undefined || s.total !== undefined)).length;
}

/**
 * The facts at `now`. `actsComplete` is passed in because the acts need the paper
 * registry, which loads on demand; null when it is not known.
 */
export function storyFacts(p: Progress | null, c: Campaign | null, log: DayLog, now: number, actsComplete: number | null = null): StoryFacts {
  const learned = (id: string): boolean => p !== null && p.memory[id] !== undefined;
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
          const n = sec.steps.filter((s) => learned(s.topicId)).length;
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
  return {
    sectionsMastered,
    papersSat: papersSat(c),
    // A supervision entry's `correct` is its mark at or above the pass mark (SUPERVISION_PASS_MARK).
    supervisionsPassed: history.filter((h) => h.kind === 'supervision' && h.correct).length,
    daysStudied: daysStudied(log, history.filter((h) => h.kind !== 'placement').map((h) => planDate(h.at)), ALL_TIME),
    weekHours: weekHours(log, planDate(now)),
    chaptersComplete,
    termShare,
    actsComplete,
    letters: c?.letters.map((l) => l.id) ?? [],
  };
}
