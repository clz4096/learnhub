/**
 * The ladder and mixed review screens' rules: their routes and focus mode, what the ladder
 * suggests next, the day's mixed review sitting, and the planner's "Review: mixed" item.
 */
import { describe, expect, it } from 'vitest';
import * as adm from '@learnhub/content/admissions';
import { gateOf, type TopicContent } from '@learnhub/content';
import { TOPIC_CONTENT } from '@learnhub/content/all';
import { DAY_MS, newMemory, type Progress } from '@learnhub/mastery';
import { finishSitting, newCampaign, recordMarks, startSitting } from './campaign';
import { fillBlocks } from './day';
import { MIXED_TITLE, dayItems } from './dayQueue';
import { finishAttempt, recordAttemptMarks, rungSets, startAttempt, type LadderAttempt, type PartRung } from './ladder';
import { ladderNext, nextDetail, partName, runningExam, suggestedExam, unmarkedAttempts } from './ladderNext';
import { DEFAULT_COURSES, recordCambridgeAnswer, startLearner } from './learner';
import { MIXED_MINUTES, answerMixed, mixedDoneOn, mixedReady, parseMixedSitting, planMixedReview, type MixedSitting } from './mixedReview';
import { hrefOf, parseRoute, type Route } from './route';
import { backLabel, focusOf, naturalParent, recentOf, tabOf } from './shell';

const T0 = Date.UTC(2026, 9, 5, 14);
const MIN = 60_000;

function sitPart(list: LadderAttempt[], paperId: string, rung: PartRung, questions: number[], marks: Pick<LadderAttempt, 'answers' | 'marks' | 'total' | 'outOf'> | null, took: number, at = T0): LadderAttempt[] {
  const started = startAttempt(adm, list, paperId, rung, questions, at);
  const a = started.at(-1)!;
  const done = finishAttempt(started, a.id, at + took * MIN);
  return marks === null ? done : recordAttemptMarks(adm, done, a.id, marks);
}

describe('routes', () => {
  const all: Route[] = [{ view: 'ladder', exam: 'STEP' }, { view: 'ladder', exam: 'TMUA' }, { view: 'ladder', exam: 'A level' }, { view: 'mixed' }];
  for (const r of all) it(`round-trips ${hrefOf(r)}`, () => expect(parseRoute(hrefOf(r))).toEqual(r));

  it('names exams in the URL by slug, and sends an unknown or missing exam to Papers', () => {
    expect(hrefOf({ view: 'ladder', exam: 'A level' })).toBe('#/ladder/a-level');
    expect(parseRoute('#/ladder/STEP')).toEqual({ view: 'papers' });
    expect(parseRoute('#/ladder/oxford')).toEqual({ view: 'papers' });
    expect(parseRoute('#/ladder')).toEqual({ view: 'papers' });
  });

  it('the ladder sits under Admission, mixed review under Today; neither is a recent item', () => {
    expect(tabOf({ view: 'ladder', exam: 'TMUA' })).toBe('admission');
    expect(tabOf({ view: 'mixed' })).toBe('today');
    expect(recentOf({ view: 'mixed' }, T0)).toBeNull();
    expect(recentOf({ view: 'ladder', exam: 'STEP' }, T0)).toBeNull();
  });

  it('focus mode: mixed review always; a ladder only while its own exam\'s clock runs', () => {
    expect(focusOf({ view: 'mixed' }, null)).toBe('mixed');
    expect(focusOf({ view: 'ladder', exam: 'STEP' }, null)).toBeNull();
    expect(focusOf({ view: 'ladder', exam: 'STEP' }, null, 'TMUA')).toBeNull();
    expect(focusOf({ view: 'ladder', exam: 'STEP' }, null, 'STEP')).toBe('paper');
    // A ladder clock does not put a campaign paper in focus mode.
    expect(focusOf({ view: 'paper', paperId: 'step-2025-2' }, null, 'STEP')).toBeNull();
  });

  it('Escape from a ladder rung goes to Papers; from mixed review to Today', () => {
    const r = naturalParent({ view: 'ladder', exam: 'STEP' }, () => undefined);
    expect(r).toEqual({ view: 'papers' });
    expect(backLabel(r)).toBe('Admission');
    expect(naturalParent({ view: 'mixed' }, () => undefined)).toEqual({ view: 'today' });
  });
});

describe('the ladder: what comes next', () => {
  it('a new learner starts with one question on the newest paper, locks shown as rungs not offered', () => {
    const n = ladderNext(adm, null, [], 'STEP');
    expect(n).toMatchObject({ exam: 'STEP', state: 'sit', rung: 'question', minutes: 30, to: { view: 'ladder', exam: 'STEP' } });
    expect(n?.title).toBe('STEP 2 2025, question 1');
    expect(nextDetail(n!)).toBe('One question · 30 min · timed ladder');
  });

  it('a running attempt comes first, then marks to enter, then the next rung', () => {
    let list = startAttempt(adm, [], 'tmua-2023-p1', 'question', [4], T0);
    expect(runningExam(adm, list)).toBe('TMUA');
    expect(runningExam(null, list)).toBeNull();
    expect(ladderNext(adm, null, list, 'TMUA')).toMatchObject({ state: 'running', title: 'TMUA 2023 Paper 1, question 4' });
    // The STEP ladder is not blocked in the model; the screen says another clock runs.
    expect(ladderNext(adm, null, list, 'STEP')?.state).toBe('sit');
    list = finishAttempt(list, list[0]!.id, T0 + 3 * MIN);
    expect(unmarkedAttempts(adm, list, 'TMUA')).toHaveLength(1);
    expect(ladderNext(adm, null, list, 'TMUA')).toMatchObject({ state: 'mark', minutes: null });
    list = recordAttemptMarks(adm, list, list[0]!.id, { answers: ['A'] });
    expect(ladderNext(adm, null, list, 'TMUA')).toMatchObject({ state: 'sit', rung: 'question' });
  });

  it('offers the highest open rung: half after two passes; the full paper only with a campaign', () => {
    let list = sitPart([], 'step-2025-2', 'question', [1], { marks: [15] }, 25);
    list = sitPart(list, 'step-2025-2', 'question', [2], { marks: [16] }, 25, T0 + 60 * MIN);
    const half = ladderNext(adm, null, list, 'STEP');
    expect(half).toMatchObject({ rung: 'half', minutes: 90, title: 'STEP 2 2025, any three questions' });
    const all = rungSets(adm.registryPaper('step-2025-2')!, 'half')[0]!;
    list = sitPart(list, 'step-2025-2', 'half', all, { marks: [20, 20, 20, null, null, null, null, null, null, null, null, null] }, 85, T0 + 200 * MIN);
    // Without a campaign the full paper cannot be sat, so the next half is offered.
    expect(ladderNext(adm, null, list, 'STEP')).toMatchObject({ rung: 'half' });
    const c = newCampaign('maths', T0);
    expect(ladderNext(adm, c, list, 'STEP')).toMatchObject({ rung: 'full', to: { view: 'paper', paperId: 'step-2025-2' }, minutes: 180 });
  });

  it('suggests the running exam, else the one last worked on, else the campaign\'s, else STEP', () => {
    expect(suggestedExam(adm, [], null)).toBe('STEP');
    expect(suggestedExam(adm, [], 'A level')).toBe('A level');
    const list = sitPart([], 'tmua-2023-p1', 'question', [1], { answers: ['A'] }, 3);
    expect(suggestedExam(adm, list, 'A level')).toBe('TMUA');
    const run = startAttempt(adm, list, 'step-2025-2', 'question', [1], T0 + 10 * MIN);
    expect(suggestedExam(adm, run, 'A level')).toBe('STEP');
  });

  it('names parts plainly', () => {
    const tmua = adm.registryPaper('tmua-2023-p1')!;
    expect(partName(tmua, 'half', rungSets(tmua, 'half')[1]!)).toBe('TMUA 2023 Paper 1, questions 11 to 20');
    expect(partName(tmua, 'full', [])).toBe('TMUA 2023 Paper 1');
  });

  it('a timed sitting in the campaign still counts toward the full rung only', () => {
    let c = newCampaign('maths', T0);
    c = startSitting(c, 'step-2025-2', 1, T0);
    const s = c.sittings[0]!;
    c = recordMarks(finishSitting(c, s.id, T0 + 170 * MIN), s.id, { questionMarks: [10, 10, 10, 10, 10, 10, null, null, null, null, null, null] });
    expect(ladderNext(adm, c, [], 'STEP')).toMatchObject({ rung: 'full', to: { view: 'paper', paperId: 'step-2025-3' } });
  });
});

describe('the day\'s mixed review', () => {
  const s0: MixedSitting = {
    day: '2026-10-05', results: [], done: false,
    items: [{ topicId: 'a', generatorId: 'g', seed: 1, id: 'a/g' }, { topicId: 'b', generatorId: 'g', seed: 2, id: 'b/g' }],
  };

  it('records answers in order and is done after the last; a second sitting the same day stays done', () => {
    const one = answerMixed(s0, true);
    expect(one).toMatchObject({ results: [true], done: false });
    const two = answerMixed(one, false);
    expect(two).toMatchObject({ results: [true, false], done: true });
    expect(answerMixed(two, true)).toBe(two);
    expect(mixedDoneOn(two, '2026-10-05')).toBe(true);
    expect(mixedDoneOn(two, '2026-10-06')).toBe(false);
    expect(mixedDoneOn(null, '2026-10-05')).toBe(false);
    expect(answerMixed({ ...s0, done: true }, true).done).toBe(true);
  });

  it('reads back what it stored and drops anything malformed', () => {
    expect(parseMixedSitting(JSON.stringify(s0))).toEqual(s0);
    expect(parseMixedSitting(null)).toBeNull();
    expect(parseMixedSitting('{oops')).toBeNull();
    expect(parseMixedSitting(JSON.stringify({ ...s0, results: [true, true, true] }))).toBeNull();
    expect(parseMixedSitting(JSON.stringify({ ...s0, items: [{ ...s0.items[0], seed: -1 }] }))).toBeNull();
    expect(parseMixedSitting(JSON.stringify({ ...s0, done: 'yes' }))).toBeNull();
  });

  /** Topics with generators and a gate, learned three days ago; the first `gated` meet their gate. */
  const CONTENTS: TopicContent[] = TOPIC_CONTENT.filter((c) => c.generators.length > 0 && gateOf(c.topicId).length > 0).slice(0, 4);
  function learner(gated: number): Progress {
    const memory: Progress['memory'] = {};
    for (const c of CONTENTS) memory[c.topicId] = { ...newMemory(T0 - 3 * DAY_MS), intervalDays: 10, due: T0 + DAY_MS };
    let p: Progress = { ...startLearner(T0 - 3 * DAY_MS, DEFAULT_COURSES, 60), memory };
    for (const c of CONTENTS.slice(0, gated)) p = recordCambridgeAnswer(p, `${c.topicId}/${gateOf(c.topicId)[0]}`, true, { hints: 0 }, T0 - 2 * DAY_MS);
    return p;
  }

  it('the planner offers "Review: mixed" once three topics are mastered, done once finished today', () => {
    expect(dayItems(learner(2), T0).some((x) => x.kind === 'mixed')).toBe(false);
    expect(mixedReady(learner(2))).toBe(false);
    const p = learner(3);
    expect(mixedReady(p)).toBe(true);
    expect(planMixedReview(p, CONTENTS, T0, 1).length).toBeGreaterThan(0);
    const item = dayItems(p, T0).find((x) => x.kind === 'mixed');
    expect(item).toEqual({ key: 'mixed', kind: 'mixed', minutes: MIXED_MINUTES, title: MIXED_TITLE, to: { view: 'mixed' }, done: false, forecast: false });
    expect(MIXED_TITLE).toBe('Review: mixed');
    expect(dayItems(p, T0, 0, true).find((x) => x.kind === 'mixed')?.done).toBe(true);
  });

  it('a light block takes the mixed review after reviews; a heavy block only when nothing else fits', () => {
    const items = [
      { kind: 'lesson' as const, minutes: 30 }, { kind: 'mixed' as const, minutes: 15 }, { kind: 'review' as const, minutes: 10 },
    ];
    const { filled } = fillBlocks([{ minutes: 90, heavy: true, optional: false }, { minutes: 30, heavy: false, optional: false }], items);
    expect(filled[0]!.map((x) => x.kind)).toEqual(['lesson']);
    expect(filled[1]!.map((x) => x.kind)).toEqual(['review', 'mixed']);
    const alone = fillBlocks([{ minutes: 90, heavy: true, optional: false }], items);
    expect(alone.filled[0]!.map((x) => x.kind)).toEqual(['lesson', 'review', 'mixed']);
  });
});
