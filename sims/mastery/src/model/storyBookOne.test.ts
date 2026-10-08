/**
 * Book One, chapters 2 to 10: each scene's trigger from fixture data built on the real paper
 * registry (real boundaries, the real TMUA keys), each variant from real marks, the end
 * cards reading those marks, Shabbat holding scenes back, and no scene queued or played twice.
 */
import { describe, expect, it } from 'vitest';
import * as adm from '@learnhub/content/admissions';
import { gateOf } from '@learnhub/content';
import { DAY_MS, placedMemory, type Progress } from '@learnhub/mastery';
import { BOOK, chapterById } from '@learnhub/content/book';
import {
  finishSitting, newCampaign, newInterview, recordMarks, startSitting,
  type Campaign, type InterviewShape, type Sitting,
} from './campaign';
import { closureTopics } from './courses';
import { DEFAULT_COURSES, recordCambridgeAnswer, startLearner } from './learner';
import {
  NO_NUMBERS, NO_RELATIONSHIPS, autoPlay, completeScene, emptyStory, enqueue, expand, isChoice, newlyDue, numbersOf, offerOutcome, parseStory,
  relationshipsOf, strandOf, titleOf, triggerText, triggered,
  type EndContext, type Scene, type StoryFacts, type StoryNumbers,
} from './story';
import {
  ACT_FOUR, ACT_ONE, ACT_THREE, ACT_TWO, CS0_PROOF, LONG_WINTER, MATRICULATION, PROOF, RESULTS_DAY, SCENES, STAGE_A, THE_OFFER,
  aLevelVariant, interviewMean, interviewVariant, matriculationVariant, resultsLine, resultsVariant, tmuaVariant, winterVariant,
} from './storyScenes';
import { storyCampaign, storyFacts, weeksShort } from './storyFacts';

const T0 = Date.UTC(2026, 9, 5, 14, 0); // Monday 2026-10-05, 10:00 am in New York
const DAY = 86_400_000;

// ---------------------------------------------------------------- fixtures

/** Sits a paper and records its marks in one go. */
function sit(c: Campaign, paperId: string, marks: Pick<Sitting, 'answers' | 'questionMarks' | 'total'>, at = T0): Campaign {
  const started = startSitting(c, paperId, 1, at);
  const s = started.sittings[started.sittings.length - 1] as Sitting;
  return recordMarks(finishSitting(started, s.id, at + 60_000), s.id, marks);
}

const allRight = (year: number, paper: 1 | 2): string[] => [...(adm.tmuaKey(year, paper) as string)];
/** The first `k` answers right, the rest left blank. */
const right = (year: number, paper: 1 | 2, k: number): (string | null)[] => allRight(year, paper).map((a, i) => (i < k ? a : null));
const step = (...marks: number[]): (number | null)[] => [...marks, ...Array<null>(12 - marks.length).fill(null)];

/** A learner who has mastered every lesson of the course, so Act I's chapter requirement is met. */
function scholar(): Progress {
  const p = startLearner(T0, DEFAULT_COURSES, 60);
  return { ...p, memory: placedMemory(closureTopics(p.courses).map((t) => t.id), T0) };
}

/** A level papers: 2024 boundaries. 9MA0/01 A* 81, 9MA0/02 A* 81, 9FM0/01 A* 67, 9FM0/02 A* 63, H446/01 A 101 (A* 115), H446/02 A 99 (A* 114). */
const A_STARS = { 'edx-9ma0-1-2024': 85, 'edx-9ma0-2-2024': 84, 'edx-9fm0-1-2024': 70, 'edx-9fm0-2-2024': 66, 'ocr-h446-01-2024': 118, 'ocr-h446-02-2024': 104 };

function actOne(c: Campaign, totals: Record<string, number> = A_STARS): Campaign {
  for (const [id, total] of Object.entries(totals)) c = sit(c, id, { total });
  return c;
}

function actTwo(c: Campaign, marks: readonly [number, number, number] = [16, 14, 15]): Campaign {
  c = sit(c, 'tmua-2016-p1', { answers: right(2016, 1, marks[0]) }, T0 + 1000);
  c = sit(c, 'tmua-2016-p2', { answers: right(2016, 2, marks[1]) }, T0 + 2000);
  return sit(c, 'tmua-2017-p1', { answers: right(2017, 1, marks[2]) }, T0 + 3000);
}

const actThree = (c: Campaign): Campaign => ({ ...c, college: 'st-edmunds', applicationFiledAt: T0 + 5 * DAY });

function actFour(c: Campaign, marks: readonly [number, number] = [16, 15]): Campaign {
  const shapes: InterviewShape[] = ['pre-reading', 'induction'];
  return { ...c, interviews: shapes.map((shape, i) => newInterview(`i${i}`, shape, c, T0, marks[i])) };
}

/** STEP 2019 boundaries for grade 1: STEP 2 68, STEP 3 57; grade 2: 55 and 48; grade 3: 30 and 27. */
function actFive(c: Campaign, step2: number, step3: number): Campaign {
  const marks = (total: number): (number | null)[] => {
    const out: number[] = [];
    for (let left = total; left > 0; left -= 20) out.push(Math.min(20, left));
    return step(...out);
  };
  c = sit(c, 'step-2019-2', { questionMarks: marks(step2) }, T0 + 10_000);
  return sit(c, 'step-2019-3', { questionMarks: marks(step3) }, T0 + 20_000);
}

const deliver = (c: Campaign, ...ids: ('received' | 'invitation' | 'offer' | 'results')[]): Campaign => ({ ...c, letters: ids.map((id) => ({ id, at: T0 + DAY })) });

/** A full maths campaign through Act V, with the STEP marks given. */
const fullCampaign = (step2: number, step3: number): Campaign =>
  deliver(actFive(actFour(actThree(actTwo(actOne(newCampaign('maths', T0))))), step2, step3), 'received', 'invitation', 'offer', 'results');

const factsOf = (c: Campaign | null, p: Progress | null = scholar()): StoryFacts => storyFacts(p, c, {}, T0, adm);
const nums = (over: Partial<StoryNumbers> = {}): StoryNumbers => ({ ...NO_NUMBERS, ...over });
const numsOf = (c: Campaign): StoryNumbers => numbersOf(factsOf(c));

/** A scene's lines for these numbers and relationships, choices left out, as one string. */
function text(s: Scene, n: StoryNumbers, rel = NO_RELATIONSHIPS): string {
  return expand(s.script!, { n, rel }).map((l) => (l.kind === 'choice' ? '' : l.text)).join(' | ');
}

function endCard(s: Scene, n: StoryNumbers): Record<string, string> {
  const ctx: EndContext = { n, rep: 0, repBefore: null, chosen: {}, before: NO_RELATIONSHIPS, after: NO_RELATIONSHIPS };
  return Object.fromEntries(s.script!.endCard.map((e) => [e.label, e.value(ctx)]));
}

const BOOK_ONE_LATER = [PROOF, LONG_WINTER, ACT_ONE, ACT_TWO, ACT_THREE, ACT_FOUR, THE_OFFER, RESULTS_DAY, MATRICULATION];

// ---------------------------------------------------------------- the scenes as written

describe('Book One, chapters 2 to 10', () => {
  it('are all written, in the design order, with art, a place card, a choice that moves someone, and an end card', () => {
    expect(SCENES.filter((s) => s.book === 1 && strandOf(s) === 'main').map((s) => s.id)).toEqual([
      'first-light', 'proof', 'long-winter', 'act-1', 'act-2', 'act-3', 'act-4', 'the-offer', 'results-day', 'matriculation',
    ]);
    for (const s of BOOK_ONE_LATER) {
      expect(s.script, s.id).not.toBeNull();
      expect(s.art, s.id).not.toBeNull();
      expect(s.place, s.id).toMatch(/\d{1,2}:\d{2} (am|pm)/);
      const choices = s.script!.lines.filter(isChoice);
      expect(choices.length, s.id).toBeGreaterThan(0);
      expect(choices.some((c) => c.options.some((o) => Object.values(o.effects ?? {}).some((v) => v !== 0))), s.id).toBe(true);
      expect(s.script!.endCard.some((e) => e.label === 'Triggered by'), s.id).toBe(true);
    }
  });

  it('no scene is set on Shabbat: no Friday evening, no Saturday', () => {
    for (const s of SCENES) expect(s.place, s.id).not.toMatch(/Saturday|Friday/);
  });

  it('use no em or en dashes, in any variant, with real campaign numbers or none', () => {
    const variants: [StoryNumbers, typeof NO_RELATIONSHIPS][] = [
      [NO_NUMBERS, NO_RELATIONSHIPS],
      [numsOf(fullCampaign(80, 70)), { ...NO_RELATIONSHIPS, priya: 2 }],
      [numsOf(fullCampaign(60, 70)), NO_RELATIONSHIPS],
      [nums({ weeksShort: 2 }), NO_RELATIONSHIPS],
    ];
    for (const s of SCENES) {
      for (const [n, rel] of variants) {
        const all = [titleOf(s, { n, rel }), s.place, triggerText(s.trigger), text(s, n, rel), ...Object.values(endCard(s, n))];
        for (const l of s.script!.lines) if (isChoice(l)) for (const o of l.options) all.push(o.text, o.note, typeof o.reply?.text === 'string' ? o.reply.text : '');
        for (const t of all) expect(t, s.id).not.toMatch(/[–—]/);
      }
    }
  });

  it('the interview has a real maths exchange, and the right answer in every variant', () => {
    for (const marks of [[17, 16], [13, 13], [8, 10]] as const) {
      const t = text(ACT_FOUR, numsOf(actFour(newCampaign('maths', T0), marks)));
      expect(t).toContain('Which is larger: e to the pi, or pi to the e?');
      expect(t).toMatch(/log x over x/i);
      expect(t).toMatch(/one minus log x, over x squared/);
      expect(t).toMatch(/e to the pi is larger/i);
    }
  });
});

// ---------------------------------------------------------------- triggers from fixture data

describe('triggers, from fixture data', () => {
  it('Proof plays when CS-0 Proof is complete', () => {
    // CS-0 Proof has no lesson steps in the book yet, so it cannot complete from real progress
    // until they are built; the trigger itself reads the chapter's completion.
    expect(chapterById(CS0_PROOF)).toBeDefined();
    const facts = (chaptersComplete: string[]): StoryFacts => ({ ...storyFacts(null, null, {}, T0), chaptersComplete });
    expect(triggered(PROOF.trigger, facts([]))).toBe(false);
    expect(triggered(PROOF.trigger, facts([CS0_PROOF]))).toBe(true);
    expect(newlyDue([PROOF], emptyStory(), facts([CS0_PROOF])).map((s) => s.id)).toEqual(['proof']);
  });

  it('The Long Winter plays at half of Stage A', () => {
    const [yearId, term] = STAGE_A.split('/') as [string, string];
    const stage = BOOK.find((y) => y.id === yearId)!.terms.find((t) => t.name === term)!;
    const ids = stage.chapters.flatMap((c) => c.sections.flatMap((s) => s.steps.map((x) => x.topicId)));
    // Every gate problem solved a day before; a step counts once its topic is also learned, so
    // learning in book order masters the steps in book order (the story counts mastered topics).
    let gated: Progress = startLearner(T0 - DAY_MS, DEFAULT_COURSES, 60);
    for (const id of new Set(ids)) gated = recordCambridgeAnswer(gated, `${id}/${gateOf(id)[0] as string}`, true, { hints: 0 }, T0 - DAY_MS);
    const learner = (k: number): Progress => ({ ...gated, memory: placedMemory(ids.slice(0, k), T0 - DAY_MS) });
    // Master the stage's steps in book order until half of them are mastered.
    let k = 0;
    while (k < ids.length && (storyFacts(learner(k), null, {}, T0).termShare[STAGE_A] ?? 0) < 0.5) k++;
    expect(k).toBeGreaterThan(0);
    expect(k).toBeLessThan(ids.length);
    expect(triggered(LONG_WINTER.trigger, storyFacts(learner(k - 1), null, {}, T0))).toBe(false);
    expect(triggered(LONG_WINTER.trigger, storyFacts(learner(k), null, {}, T0))).toBe(true);
  });

  it('the act scenes play as each act completes, read from the campaign through the real registry', () => {
    const steps: [string, Campaign][] = [];
    let c = newCampaign('maths', T0);
    steps.push(['none', c]);
    c = actOne(c); steps.push(['act-1', c]);
    c = actTwo(c); steps.push(['act-2', c]);
    c = actThree(c); steps.push(['act-3', c]);
    c = actFour(c); steps.push(['act-4', c]);
    expect(steps.map(([, x]) => factsOf(x).actsComplete)).toEqual([0, 1, 2, 3, 4]);
    for (const [id, x] of steps) {
      const due = newlyDue(SCENES, emptyStory(), factsOf(x)).map((s) => s.id).filter((s) => s.startsWith('act-'));
      expect(due.at(-1) ?? 'none', id).toBe(id);
    }
  });

  it('Act I needs the course and the papers: without the learner the acts are unknown', () => {
    const c = actOne(newCampaign('maths', T0));
    expect(factsOf(c, null).actsComplete).toBeNull();
    expect(storyFacts(scholar(), c, {}, T0).actsComplete).toBeNull();
    const half = { ...scholar(), memory: {} };
    expect(factsOf(c, half).actsComplete).toBe(0);
  });

  it('The Offer and Results Day play when their letters arrive, and only once the results are known', () => {
    const c = fullCampaign(80, 70);
    expect(triggered(THE_OFFER.trigger, factsOf(deliver(c, 'offer')))).toBe(true);
    expect(triggered(RESULTS_DAY.trigger, factsOf(deliver(c, 'offer')))).toBe(false);
    expect(triggered(RESULTS_DAY.trigger, factsOf(c))).toBe(true);
    // Without the registry, letters are not counted: the scene would have no results to read.
    expect(triggered(RESULTS_DAY.trigger, storyFacts(scholar(), c, {}, T0))).toBe(false);
  });

  it('Matriculation plays when the place is confirmed: met or a narrow miss, never a miss', () => {
    expect(triggered(MATRICULATION.trigger, factsOf(fullCampaign(80, 70)))).toBe(true);
    expect(triggered(MATRICULATION.trigger, factsOf(fullCampaign(80, 50)))).toBe(true);
    expect(triggered(MATRICULATION.trigger, factsOf(fullCampaign(60, 50)))).toBe(false);
    expect(triggered(MATRICULATION.trigger, factsOf(actFour(actThree(actTwo(actOne(newCampaign('maths', T0)))))))).toBe(false);
    expect(triggerText(MATRICULATION.trigger)).toBe('plays when your place is confirmed');
  });

  it('a full campaign queues every campaign scene at once, in story order', () => {
    const seen = Object.fromEntries(['prologue', 'first-light', 'proof', 'long-winter'].map((id) => [id, { first: 0, last: 0, plays: 1, n: NO_NUMBERS }]));
    const due = newlyDue(SCENES, { ...emptyStory(), seen }, factsOf(fullCampaign(80, 70)));
    // The fixture's timed papers also raise Exam Temperament past its beat.
    expect(due.filter((s) => strandOf(s) === 'main').map((s) => s.id)).toEqual(['act-1', 'act-2', 'act-3', 'act-4', 'the-offer', 'results-day', 'matriculation']);
  });
});

// ---------------------------------------------------------------- variants from real marks

describe('variants, from real marks', () => {
  it('The Long Winter plays when two planned weeks fell below the target, else Momentum', () => {
    expect(winterVariant(nums({ weeksShort: 2 }))).toBe('winter');
    expect(winterVariant(nums({ weeksShort: 1 }))).toBe('momentum');
    expect(titleOf(LONG_WINTER, { n: nums({ weeksShort: 2 }) })).toBe('The Long Winter');
    expect(titleOf(LONG_WINTER, { n: nums() })).toBe('Momentum');
    expect(text(LONG_WINTER, nums({ weeksShort: 2 }))).toContain('Two weeks running');
    expect(text(LONG_WINTER, nums())).not.toContain('Two weeks running');
    expect(endCard(LONG_WINTER, nums({ weeksShort: 2, weekHours: 12.5 }))).toMatchObject({ 'Hours that week': '12.5', 'Planned weeks below target': '2 of the last 2' });
  });

  it('weeks short counts the two full weeks before, planned ones only, against 36 hours', () => {
    // Monday 2026-10-05: the weeks before start Sunday 2026-09-27 and Sunday 2026-09-20.
    const planned = { wake: '07:00', ticks: [] as number[] };
    expect(weeksShort({}, '2026-10-05')).toBe(0);
    expect(weeksShort({ '2026-09-28': planned }, '2026-10-05')).toBe(1);
    expect(weeksShort({ '2026-09-28': planned, '2026-09-21': planned }, '2026-10-05')).toBe(2);
    // This week does not count; three weeks back does not count.
    expect(weeksShort({ '2026-10-05': planned, '2026-09-14': planned }, '2026-10-05')).toBe(0);
  });

  it('Act I reads every A level paper against the offer: ahead, close, behind', () => {
    const ahead = numsOf(actOne(newCampaign('maths', T0)));
    expect(aLevelVariant(ahead)).toBe('ahead');
    expect(text(ACT_ONE, ahead)).toContain('Mathematics, A* and A*. Further Mathematics, A* and A*. Computer Science, A* and A.');
    expect(endCard(ACT_ONE, ahead)).toMatchObject({ Mathematics: 'A* (85/100), A* (84/100)', 'Computer Science': 'A* (118/140), A (104/140)' });
    // H446/01 at 90 is a B (85 to 100): one grade below the A asked for.
    const close = numsOf(actOne(newCampaign('maths', T0), { ...A_STARS, 'ocr-h446-01-2024': 90 }));
    expect(aLevelVariant(close)).toBe('close');
    expect(text(ACT_ONE, close)).toContain('Computer Science is a grade short');
    // 9MA0/01 at 50 is a C (40 to 52): three below the A*.
    const behind = numsOf(actOne(newCampaign('maths', T0), { ...A_STARS, 'edx-9ma0-1-2024': 50 }));
    expect(aLevelVariant(behind)).toBe('behind');
    expect(text(ACT_ONE, behind)).toContain('Mathematics is more than a grade short');
    expect(aLevelVariant(NO_NUMBERS)).toBe('unknown');
  });

  it('Act II reads the real raw TMUA marks, checked against the official key', () => {
    const strong = numsOf(actTwo(newCampaign('maths', T0), [16, 14, 15]));
    expect(strong.campaign?.tmua.map((p) => [p.name, p.mark])).toEqual([['TMUA 2016 Paper 1', 16], ['TMUA 2016 Paper 2', 14], ['TMUA 2017 Paper 1', 15]]);
    expect(tmuaVariant(strong)).toBe('strong');
    expect(endCard(ACT_TWO, strong)).toMatchObject({ 'TMUA papers': '3', 'Raw marks': '16/20, 14/20, 15/20', Best: '16/20, TMUA 2016 Paper 1' });
    expect(text(ACT_TWO, strong)).toContain('best 16/20, TMUA 2016 Paper 1');
    expect(tmuaVariant(numsOf(actTwo(newCampaign('maths', T0), [10, 11, 9])))).toBe('fair');
    expect(tmuaVariant(numsOf(actTwo(newCampaign('maths', T0), [5, 6, 4])))).toBe('rough');
  });

  it('Act III reads the course and the day the application was filed', () => {
    const n = numsOf(actThree(actTwo(actOne(newCampaign('cs', T0)))));
    expect(endCard(ACT_THREE, n)).toMatchObject({ Course: 'Computer Science', College: 'Euclid College', Filed: 'October 10, 2026', 'Papers sat': '9' });
  });

  it('Act IV follows the real interview mark: 15 or more strong, 12 to 14 steady, under 12 shaky', () => {
    const v = (a: number, b: number): string => interviewVariant(numsOf(actFour(newCampaign('maths', T0), [a, b])));
    expect(v(16, 15)).toBe('strong');
    expect(v(15, 15)).toBe('strong');
    expect(v(15, 14)).toBe('steady');
    expect(v(12, 12)).toBe('steady');
    expect(v(12, 11)).toBe('shaky');
    expect(v(9, 10)).toBe('shaky');
    expect(interviewVariant(NO_NUMBERS)).toBe('steady');
    const n = numsOf(actFour(newCampaign('maths', T0), [15, 14]));
    expect(interviewMean(n)).toBe(14.5);
    expect(endCard(ACT_FOUR, n)).toMatchObject({ 'Interview marks': '15 and 14 of 20', Mean: '14.5 of 20, steady' });
    expect(text(ACT_FOUR, n)).toContain('It took a moment');
    expect(text(ACT_FOUR, numsOf(actFour(newCampaign('maths', T0), [17, 16])))).toContain('for which pairs');
    expect(text(ACT_FOUR, numsOf(actFour(newCampaign('maths', T0), [9, 10])))).toContain('Ninety seconds pass');
  });

  it('The Offer counts the real conditions and the projected entry', () => {
    const n = numsOf(fullCampaign(80, 70));
    expect(n.campaign?.conditions.map((x) => x.label)).toEqual(['A level Mathematics', 'A level Further Mathematics', 'A level Computer Science', 'STEP 2', 'STEP 3']);
    expect(text(THE_OFFER, n)).toContain('5 conditions. He reads every one.');
    expect(text(THE_OFFER, n)).toContain('Grade 1 in STEP 2 and STEP 3');
    expect(endCard(THE_OFFER, n)).toMatchObject({ Conditions: '5', Course: 'Mathematics', 'Interview mean': '15.5 of 20' });
    expect(endCard(THE_OFFER, n).Entry).toMatch(/^October 20\d\d$|^not projected$/);
  });

  it('Results Day reads the real STEP grades against the offer: met, narrow miss, missed', () => {
    const met = numsOf(fullCampaign(80, 70));
    expect(resultsVariant(met)).toBe('met');
    expect(resultsLine(met.campaign)).toBe('STEP 2 2019: 80 of 120, grade 1. STEP 3 2019: 70 of 120, grade 1.');
    expect(endCard(RESULTS_DAY, met)).toMatchObject({ 'Conditions met': '5 of 5', 'The College': 'place confirmed' });
    expect(text(RESULTS_DAY, met)).toContain('Every condition.');

    // STEP 3 at 50: grade 2 (48 to 56), one grade short.
    const narrow = numsOf(fullCampaign(80, 50));
    expect(resultsVariant(narrow)).toBe('narrow');
    expect(narrow.campaign?.conditions.find((x) => x.label === 'STEP 3')).toMatchObject({ status: 'short', below: 1 });
    const t = text(RESULTS_DAY, narrow);
    expect(t).toContain('One condition short: STEP 3, by one grade.');
    expect(t).toContain('Under review');
    expect(t).toContain('We are pleased to confirm your place.');
    expect(endCard(RESULTS_DAY, narrow)).toMatchObject({ 'Conditions met': '4 of 5', 'The College': 'place confirmed after review' });

    // STEP 3 at 30: grade 3, two grades short.
    expect(resultsVariant(numsOf(fullCampaign(80, 30)))).toBe('missed');
    // Both STEP papers one grade short: two conditions.
    const missed = numsOf(fullCampaign(60, 50));
    expect(resultsVariant(missed)).toBe('missed');
    expect(text(RESULTS_DAY, missed)).toContain('deferred place');
    expect(text(RESULTS_DAY, missed)).not.toContain('pleased to confirm');
    expect(endCard(RESULTS_DAY, missed)['The College']).toBe('deferred place, same conditions');
  });

  it('an A level short counts against the offer too', () => {
    const c = fullCampaign(80, 70);
    const lowCs = sit(c, 'ocr-h446-01-2024', { total: 90 }, T0 + 30_000);
    const sc = storyCampaign(adm, lowCs, null);
    expect(sc.conditions.find((x) => x.label === 'A level Computer Science')).toMatchObject({ status: 'short', below: 1 });
    expect(offerOutcome(sc)).toBe('narrow');
  });

  it('Matriculation has Priya there when the relationship allows', () => {
    const n = numsOf(fullCampaign(80, 70));
    expect(matriculationVariant(n, { ...NO_RELATIONSHIPS, priya: 1 })).toBe('priya');
    expect(matriculationVariant(n, NO_RELATIONSHIPS)).toBe('alone');
    expect(text(MATRICULATION, n, { ...NO_RELATIONSHIPS, priya: 3 })).toContain('"You came. I had a bet with myself."');
    expect(text(MATRICULATION, n, NO_RELATIONSHIPS)).not.toContain('You came.');
    expect(text(MATRICULATION, n)).toContain('Dr E. Noether-Gauss');
    // Relationships from earlier choices decide it.
    const rel = relationshipsOf(SCENES, { prologue: { reply: 'already' }, proof: { send: 'priya' } });
    expect(matriculationVariant(n, rel)).toBe('priya');
  });
});

// ---------------------------------------------------------------- Shabbat and duplicates

describe('Shabbat and duplicate plays', () => {
  // 2026-10-09 is a Friday; Brooklyn sundown is about 6:25 pm.
  const ny = (d: number, h: number, m = 0): number => Date.UTC(2026, 9, d, h + 4, m);

  it('a campaign scene triggered on Shabbat is queued, waits, and plays after sundown on Saturday', () => {
    const f = factsOf(fullCampaign(80, 70));
    const st = enqueue(emptyStory(), [RESULTS_DAY], f, ny(10, 12));
    expect(st.queued.map((q) => q.id)).toEqual(['results-day']);
    expect(autoPlay(st, ny(9, 19), { view: 'today' })).toBeNull();
    expect(autoPlay(st, ny(10, 12), { view: 'today' })).toBeNull();
    expect(autoPlay(st, ny(10, 20), { view: 'today' })).toBe('results-day');
  });

  it('a scene queues once and plays once by itself, however often its trigger is checked', () => {
    const f = factsOf(fullCampaign(80, 70));
    let st = emptyStory();
    for (let i = 0; i < 3; i++) st = enqueue(st, newlyDue(SCENES, st, f), f, T0 + i);
    const campaignScenes = ['act-1', 'act-2', 'act-3', 'act-4', 'the-offer', 'results-day', 'matriculation'];
    expect(st.queued.map((q) => q.id).filter((id) => campaignScenes.includes(id))).toEqual(campaignScenes);
    expect(new Set(st.queued.map((q) => q.id)).size).toBe(st.queued.length);
    st = completeScene(SCENES, st, 'results-day', { priya: 'call' }, st.queued.find((q) => q.id === 'results-day')!.n, 0, T0 + 10);
    expect(st.queued.some((q) => q.id === 'results-day')).toBe(false);
    expect(newlyDue(SCENES, st, f).map((s) => s.id)).toEqual([]);
    // A stored queue with a seen scene in it, or a scene twice, reads back without the repeats.
    const raw = JSON.parse(JSON.stringify(st)) as { queued: unknown[] };
    raw.queued.push(raw.queued[0], { id: 'results-day', at: 1, n: {} });
    const back = parseStory(JSON.stringify(raw), SCENES);
    expect(back.queued.map((q) => q.id)).toEqual(st.queued.map((q) => q.id));
  });

  it('a replay reads the results as they were when the scene first played', () => {
    const first = numsOf(fullCampaign(80, 50));
    let st = completeScene(SCENES, emptyStory(), 'results-day', {}, first, 0, T0);
    st = completeScene(SCENES, st, 'results-day', {}, numsOf(fullCampaign(80, 70)), 0, T0 + 1);
    const back = parseStory(JSON.stringify(st), SCENES);
    expect(back.seen['results-day']?.plays).toBe(2);
    expect(back.seen['results-day']?.n).toEqual(first);
    expect(resultsVariant(back.seen['results-day']!.n)).toBe('narrow');
  });

  it('drops an unreadable campaign snapshot whole, never half of it', () => {
    const n = numsOf(fullCampaign(80, 70));
    const st = completeScene(SCENES, emptyStory(), 'the-offer', {}, n, 0, T0);
    const raw = JSON.parse(JSON.stringify(st)) as { seen: Record<string, { n: { campaign: { step: unknown[] } } }> };
    raw.seen['the-offer']!.n.campaign.step.push({ name: 'x' });
    expect(parseStory(JSON.stringify(raw), SCENES).seen['the-offer']?.n.campaign).toBeNull();
  });
});
