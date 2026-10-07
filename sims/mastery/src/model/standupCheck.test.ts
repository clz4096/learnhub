import { describe, expect, it } from 'vitest';
import { gateOf } from '@learnhub/content';
import type { HistoryEntry, MasteryStage } from '@learnhub/mastery';
import { ALL_TOPICS, titleOf } from './courses';
import { DEFAULT_COURSES, completeLesson, masteryOf, recordCambridgeAnswer, startLearner } from './learner';
import type { PlaceMap } from './lessonState';
import {
  DAY_MS, QUESTION_PROMPTS, checkStandup, factLines, gatherFacts, sinceOf, stem, type FactLookups, type StandupFacts, type TopicFact,
} from './standupCheck';

const T0 = Date.UTC(2026, 9, 7, 13);
const H = 60 * 60 * 1000;

const topic = (id: string, title: string, over: Partial<TopicFact> = {}): TopicFact =>
  ({ id, title, stage: 'unlearned', lesson: null, open: null, cambridge: null, ...over });

const facts = (topics: TopicFact[], timed: StandupFacts['timed'] = []): StandupFacts => ({ since: T0 - DAY_MS, until: T0, topics, timed });

/** Covers all three questions, so only the gaps show. */
const FULL = 'Today I will do more. Nothing is blocking me.';

describe('checkStandup: claims against the record', () => {
  const seq = (over: Partial<TopicFact> = {}) => topic('pre.sequences', 'Sequences and nth term rules', over);
  const ind = (over: Partial<TopicFact> = {}) => topic('alg.proof-by-induction', 'Proof by induction', over);

  it('a finished lesson whose Cambridge problem is open is a gap, in the learner\'s words', () => {
    const r = checkStandup(`Yesterday I finished sequences. ${FULL}`, facts([seq({ stage: 'needs-gate', lesson: 'passed' }), ind()]));
    expect(r.gaps).toEqual(['You said you finished sequences; its Cambridge problem is still open.']);
    expect(r.missing).toEqual([]);
    expect(r.flags).toEqual(r.gaps);
  });

  it('a mastered topic backs the claim: no gap', () => {
    expect(checkStandup(`I finished sequences. ${FULL}`, facts([seq({ stage: 'mastered', lesson: 'passed' })])).gaps).toEqual([]);
  });

  it('a lesson still in progress, a failed run, and no record at all are each named', () => {
    const open = checkStandup(`I finished sequences ${FULL}`, facts([seq({ open: { stage: 'learn', section: 2 } })]));
    expect(open.gaps).toEqual(['You said you finished sequences; the lesson on Sequences and nth term rules is still in progress, reading, section 3.']);
    const failed = checkStandup(`I passed sequences ${FULL}`, facts([seq({ lesson: 'failed' })]));
    expect(failed.gaps).toEqual(['You said you finished sequences; the last lesson run on Sequences and nth term rules did not pass.']);
    const none = checkStandup(`done with sequences ${FULL}`, facts([seq()]));
    expect(none.gaps).toEqual(['You said you finished sequences; nothing since your last standup shows Sequences and nth term rules done.']);
  });

  it('one claim naming two topics checks both', () => {
    const r = checkStandup(`I finished sequences and induction ${FULL}`, facts([seq({ stage: 'needs-gate' }), ind({ stage: 'needs-gate' })]));
    expect(r.gaps).toEqual([
      'You said you finished sequences; its Cambridge problem is still open.',
      'You said you finished induction; its Cambridge problem is still open.',
    ]);
  });

  it('plans, negations, and words past a change of subject are not claims (no punctuation needed)', () => {
    const f = facts([seq({ stage: 'needs-gate' }), ind()]);
    expect(checkStandup(`yesterday I finished sequences but today I will start induction ${FULL}`, f).gaps)
      .toEqual(['You said you finished sequences; its Cambridge problem is still open.']);
    expect(checkStandup(`I didn't finish sequences and I haven't finished induction ${FULL}`, f).gaps).toEqual([]);
    expect(checkStandup(`I'll have finished sequences by tonight ${FULL}`, f).gaps).toEqual([]);
    expect(checkStandup(`I want to have sequences done ${FULL}`, f).gaps).toEqual([]);
    // A negation before a change of subject does not reach the claim.
    expect(checkStandup(`I didn't sleep well but I finished sequences ${FULL}`, f).gaps).toHaveLength(1);
  });

  it('timed work said but not logged, or logged but not finished', () => {
    expect(checkStandup(`I sat a timed paper ${FULL}`, facts([])).gaps).toEqual(['You mentioned timed work; none is logged since your last standup.']);
    expect(checkStandup(`I did a mock ${FULL}`, facts([], [{ id: 'x@1', label: 'STEP 2 2019', finished: false }])).gaps)
      .toEqual(['You mentioned timed work; STEP 2 2019 is started but not finished.']);
    expect(checkStandup(`I sat a timed paper ${FULL}`, facts([], [{ id: 'x@1', label: 'STEP 2 2019', finished: true }])).gaps).toEqual([]);
  });

  it('asks for whichever of the three questions is missing', () => {
    const f = facts([]);
    expect(checkStandup('', f).missing).toEqual(['yesterday', 'today', 'blocked']);
    expect(checkStandup('', f).flags).toEqual([QUESTION_PROMPTS.yesterday, QUESTION_PROMPTS.today, QUESTION_PROMPTS.blocked]);
    expect(checkStandup('Yesterday I read about limits.', f).missing).toEqual(['today', 'blocked']);
    expect(checkStandup('Today I plan to do limits. I am stuck on epsilons.', f).missing).toEqual(['yesterday']);
  });

  it('stems meet across plurals', () => {
    expect(stem('sequences')).toBe(stem('Sequences'.toLowerCase()));
    expect(stem('probabilities')).toBe('probability');
    expect(stem('class')).toBe('class');
  });
});

describe('gatherFacts', () => {
  const look: FactLookups = {
    topics: [{ id: 'a', title: 'Alpha things' }, { id: 'b', title: 'Beta things' }, { id: 'c', title: 'Gamma' }],
    stageOf: (id): MasteryStage => (id === 'a' ? 'needs-gate' : 'mastered'),
    paperLabel: (id) => `Paper ${id}`,
  };
  const h = (at: number, kind: HistoryEntry['kind'], topicId: string, correct: boolean): HistoryEntry => ({ at, kind, topicId, correct });

  it('takes only what happened since the last standup: lessons, places, Cambridge answers, timed work', () => {
    const since = T0 - 10 * H;
    const history = [
      h(since - H, 'lesson', 'b', true), // before the window: not counted
      h(since + H, 'lesson', 'a', false),
      h(since + 2 * H, 'lesson', 'a', true), // the latest run wins
      h(since + 3 * H, 'cambridge', 'b', false),
      h(since + 4 * H, 'cambridge', 'b', true),
      h(since + 5 * H, 'cambridge', 'c', false),
    ];
    const places: PlaceMap = {
      'learn-1.c': { updatedAt: since + H, place: { stage: 'learn', practice: { attempts: 0, streak: 0, results: [] }, section: 1 } },
      'learn-2.b': { updatedAt: since + H, place: null },
      'learn-3.a': { updatedAt: since - H, place: { stage: 'practice', practice: { attempts: 0, streak: 0, results: [] } } },
    };
    const f = gatherFacts({
      progress: { history, memory: { a: {} as never, b: {} as never } },
      ladder: [{ id: 'p@1', paperId: 'p', rung: 'question', questions: [1], startedAt: since + H, finishedAt: since + 2 * H }],
      campaign: { sittings: [{ id: 'q@1', paperId: 'q', act: 1, startedAt: since - H, finishedAt: null }] },
      places, since, until: T0,
    }, look);
    expect(f.topics).toEqual([
      { id: 'a', title: 'Alpha things', stage: 'needs-gate', lesson: 'passed', open: null, cambridge: null },
      { id: 'b', title: 'Beta things', stage: 'mastered', lesson: null, open: null, cambridge: 'passed' },
      { id: 'c', title: 'Gamma', stage: 'unlearned', lesson: null, open: { stage: 'learn', section: 1 }, cambridge: 'failed' },
    ]);
    expect(f.timed).toEqual([{ id: 'p@1', label: 'Paper p', finished: true }]);
    expect(factLines(f)).toEqual([
      'Passed the lesson on Alpha things.',
      'Passed a Cambridge problem on Beta things.',
      'Gamma: lesson in progress, reading, section 2.',
      'Tried a Cambridge problem on Gamma; not yet right.',
      'Timed: Paper p.',
    ]);
  });

  it('the window starts at the last standup, or a day back when there is none', () => {
    expect(sinceOf(T0 - 3 * H, T0)).toBe(T0 - 3 * H);
    expect(sinceOf(null, T0)).toBe(T0 - DAY_MS);
    expect(sinceOf(T0 + H, T0)).toBe(T0 - DAY_MS);
  });

  it('end to end with the real catalog: a passed lesson with its gate open is flagged', () => {
    const id = 'pre.sequences';
    expect(gateOf(id).length).toBeGreaterThan(0);
    const p = completeLesson(startLearner(T0 - 2 * DAY_MS, DEFAULT_COURSES, 60), id, true, T0 - H, null, 30);
    expect(masteryOf(p, id).stage).toBe('needs-gate');
    const lookups: FactLookups = { topics: ALL_TOPICS, stageOf: (t) => masteryOf(p, t).stage, paperLabel: (x) => x };
    const f = gatherFacts({ progress: p, ladder: [], campaign: null, places: {}, since: sinceOf(null, T0), until: T0 }, lookups);
    const r = checkStandup(`Yesterday I finished sequences. ${FULL}`, f);
    expect(r.gaps).toEqual(['You said you finished sequences; its Cambridge problem is still open.']);
    // Once its Cambridge problem is right, the claim stands.
    const q = recordCambridgeAnswer(p, `${id}/${gateOf(id)[0]}`, true, { hints: 0 }, T0 - H / 2);
    const g = gatherFacts({ progress: q, ladder: [], campaign: null, places: {}, since: sinceOf(null, T0), until: T0 }, { ...lookups, stageOf: (t) => masteryOf(q, t).stage });
    expect(checkStandup(`Yesterday I finished sequences. ${FULL}`, g).gaps).toEqual([]);
    expect(titleOf(id)).toBe('Sequences and nth term rules');
  });
});
