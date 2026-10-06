import { describe, expect, it } from 'vitest';
import { placedMemory, type Progress } from '@learnhub/mastery';
import { BOOK, chapterById } from '@learnhub/content/book';
import { DEFAULT_COURSES, startLearner } from './learner';
import { newCampaign, type Campaign } from './campaign';
import {
  NO_NUMBERS, REP_LEVELS, REP_TABLE, advance, autoPlay, calmView, choose, completeScene, emptyStory, enqueue, expand, firedFx,
  isChoice, isShabbat, metOf, newlyDue, nextScene, parseStory, relationWord, relationshipsOf, repLevel, repOf, skip, startPlayer, strandOf,
  triggerText, triggered, type PlayerState, type StoryFacts, type StoryNumbers,
} from './story';
import { CS0_PROOF, FIRST_LIGHT, PROLOGUE, SCENES, STAGE_A, STEP_BLOCK_1, firstLightVariant, fmtHours } from './storyScenes';
import { papersSat, storyFacts } from './storyFacts';

const T0 = Date.UTC(2026, 9, 5, 14, 0); // Monday 2026-10-05, 10:00 am in New York
const facts = (over: Partial<StoryFacts> = {}): StoryFacts => ({
  ...NO_NUMBERS, chaptersComplete: [], termShare: {}, actsComplete: null, letters: [], ...over,
});
const nums = (over: Partial<StoryNumbers> = {}): StoryNumbers => ({ ...NO_NUMBERS, ...over });

describe('REP', () => {
  it('is one table of real work and nothing else', () => {
    expect(REP_TABLE.map((r) => r.source)).toEqual(['sectionsMastered', 'papersSat', 'supervisionsPassed', 'daysStudied']);
    expect(repOf(NO_NUMBERS)).toBe(0);
    // Hours ticked do not count: they are what days studied measures.
    expect(repOf(nums({ weekHours: 40 }))).toBe(0);
    expect(repOf(nums({ sectionsMastered: 2, papersSat: 1, supervisionsPassed: 3, daysStudied: 12 }))).toBe(2 * 50 + 80 + 3 * 30 + 12 * 10);
  });

  it('ignores negative, fractional, and non-finite counts', () => {
    expect(repOf(nums({ sectionsMastered: -3, daysStudied: 2.9, papersSat: Number.NaN }))).toBe(20);
  });

  it('has the six levels in order, from Applicant to Fellow-in-Waiting', () => {
    expect(REP_LEVELS.map((l) => l.name)).toEqual(['Applicant', 'Offer Holder', 'Fresher', 'Scholar', 'Senior Scholar', 'Fellow-in-Waiting']);
    for (let i = 1; i < REP_LEVELS.length; i++) expect(REP_LEVELS[i]!.at).toBeGreaterThan(REP_LEVELS[i - 1]!.at);
    expect(REP_LEVELS[0]!.at).toBe(0);
  });

  it('reads the level at each boundary, and the next level', () => {
    expect(repLevel(0)).toEqual({ name: 'Applicant', at: 0, next: { name: 'Offer Holder', at: 500 } });
    expect(repLevel(499).name).toBe('Applicant');
    expect(repLevel(500).name).toBe('Offer Holder');
    expect(repLevel(2999).name).toBe('Fresher');
    expect(repLevel(10000)).toEqual({ name: 'Fellow-in-Waiting', at: 10000, next: null });
    expect(repLevel(1e9).name).toBe('Fellow-in-Waiting');
  });
});

describe('triggers', () => {
  it('fire on real data only', () => {
    expect(triggered({ kind: 'firstLaunch' }, facts())).toBe(true);
    const ch = { kind: 'chapter', chapterId: STEP_BLOCK_1, name: 'STEP Foundation, Block 1' } as const;
    expect(triggered(ch, facts())).toBe(false);
    expect(triggered(ch, facts({ chaptersComplete: [STEP_BLOCK_1] }))).toBe(true);
    const half = { kind: 'termHalf', term: STAGE_A, name: 'Stage A' } as const;
    expect(triggered(half, facts({ termShare: { [STAGE_A]: 0.49 } }))).toBe(false);
    expect(triggered(half, facts({ termShare: { [STAGE_A]: 0.5 } }))).toBe(true);
    const act = { kind: 'act', n: 2, name: 'Act II' } as const;
    expect(triggered(act, facts({ actsComplete: null }))).toBe(false);
    expect(triggered(act, facts({ actsComplete: 1 }))).toBe(false);
    expect(triggered(act, facts({ actsComplete: 2 }))).toBe(true);
    expect(triggered({ kind: 'letter', id: 'offer', name: 'the offer letter' }, facts({ letters: ['received', 'offer'] }))).toBe(true);
  });

  it('read as a clause for the Story tab and the end card', () => {
    expect(triggerText(FIRST_LIGHT.trigger)).toBe('plays when you finish STEP Foundation, Block 1');
    expect(triggerText(PROLOGUE.trigger)).toBe('plays the first time you open the app');
    expect(SCENES.map((s) => triggerText(s.trigger))).toContain('plays when Act IV, The interview, is complete');
    expect(SCENES.map((s) => triggerText(s.trigger))).toContain('plays when the offer letter arrives');
    expect(SCENES.map((s) => triggerText(s.trigger))).toContain('plays when your place is confirmed');
  });
});

describe('the scenes', () => {
  it('are the Prologue, First Light, then the rest of Book One in the design order, all written', () => {
    expect(SCENES.filter((s) => strandOf(s) === 'main').map((s) => s.title)).toEqual([
      'The Kitchen Table', 'First Light', 'Proof', 'The Long Winter (or Momentum)', 'Act I: Recent Qualifications',
      'Act II: The Admissions Test', 'Act III: The Application', 'Act IV: The Interview', 'The Offer', 'Results Day', 'Matriculation',
    ]);
    expect(SCENES.filter((s) => s.script === null)).toEqual([]);
    expect(SCENES.filter((s) => s.book === 1 && strandOf(s) === 'main').map((s) => s.chapter)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    // The side scenes and beats follow the main storyline.
    const firstExtra = SCENES.findIndex((s) => strandOf(s) !== 'main');
    expect(SCENES.slice(firstExtra).every((s) => strandOf(s) !== 'main')).toBe(true);
    expect(new Set(SCENES.map((s) => s.id)).size).toBe(SCENES.length);
  });

  it('name book chapters and terms that exist', () => {
    expect(chapterById(STEP_BLOCK_1)?.title).toBe('STEP Foundation, Block 1: Algebra and graphs');
    expect(chapterById(CS0_PROOF)?.title).toBe('CS-0 Proof');
    // The first STEP Foundation chapter of the book.
    const first = BOOK.flatMap((y) => y.terms.flatMap((t) => t.chapters)).find((c) => c.title.startsWith('STEP Foundation'));
    expect(first?.id).toBe(STEP_BLOCK_1);
    expect(BOOK.some((y) => y.terms.some((t) => `${y.id}/${t.name}` === STAGE_A))).toBe(true);
    for (const s of SCENES) if (s.trigger.kind === 'chapter') expect(chapterById(s.trigger.chapterId)).toBeDefined();
  });

  it('use no em or en dashes in any text', () => {
    const texts: string[] = [];
    for (const s of SCENES) {
      texts.push(s.title, s.kicker, s.place, triggerText(s.trigger));
      for (const l of s.script?.lines ?? []) {
        if (isChoice(l)) for (const o of l.options) texts.push(o.text, o.note, typeof o.reply?.text === 'string' ? o.reply.text : '');
        else texts.push(typeof l.text === 'string' ? l.text : l.text({ n: nums({ sectionsMastered: 3, weekHours: 12.5 }) }));
      }
    }
    for (const t of texts) expect(t).not.toMatch(/[\u2013\u2014]/);
  });

  it('every choice has two or three options with distinct ids', () => {
    for (const s of SCENES) {
      for (const l of s.script?.lines ?? []) {
        if (!isChoice(l)) continue;
        expect(l.options.length).toBeGreaterThanOrEqual(2);
        expect(l.options.length).toBeLessThanOrEqual(3);
        expect(new Set(l.options.map((o) => o.id)).size).toBe(l.options.length);
      }
    }
  });

  it('First Light has a variant for a full week, a short one, and none logged, and reads real numbers', () => {
    expect(firstLightVariant(nums({ weekHours: 36 }))).toBe('full');
    expect(firstLightVariant(nums({ weekHours: 12.25 }))).toBe('short');
    expect(firstLightVariant(nums())).toBe('unlogged');
    const text = (n: StoryNumbers): string => expand(FIRST_LIGHT.script!, { n }).map((l) => (l.kind === 'choice' ? '' : l.text)).join(' ');
    expect(text(nums({ sectionsMastered: 2, weekHours: 12.25 }))).toContain('2 sections of the book mastered.');
    expect(text(nums({ sectionsMastered: 2, weekHours: 12.25 }))).toContain('12.3 hours this week, short of the 36');
    expect(text(nums({ sectionsMastered: 1, weekHours: 40 }))).toContain('1 section of the book mastered.');
    expect(text(nums({ weekHours: 40 }))).toContain('40 hours this week. The plan asked for 36.');
    expect(text(nums())).toContain('no hours ticked off this week');
    expect(text(nums())).not.toContain('hours this week.');
    expect(fmtHours(7)).toBe('7');
  });
});

describe('the player', () => {
  const ctx = { n: NO_NUMBERS };
  const seq = expand(PROLOGUE.script!, ctx);
  const choiceAt = seq.findIndex((l) => l.kind === 'choice');
  const toChoice = (): PlayerState => {
    let s = advance(startPlayer(seq));
    while (s.i < choiceAt) s = advance(s);
    return s;
  };

  it('goes from the title card through the lines to the end card', () => {
    let s = startPlayer(seq);
    expect(s.phase).toBe('title');
    s = advance(s);
    expect([s.phase, s.i]).toEqual(['lines', 0]);
    let steps = 0;
    while (s.phase !== 'end' && steps++ < 100) {
      const cur = s.seq[s.i];
      s = cur?.kind === 'choice' ? choose(s, 'focus', ctx) : advance(s);
    }
    expect(s.phase).toBe('end');
    expect(s.chosen).toEqual({ reply: 'focus' });
    expect(advance(s)).toBe(s);
  });

  it('never passes an open choice, and puts the chosen reply next', () => {
    const s = toChoice();
    expect(s.seq[s.i]?.kind).toBe('choice');
    expect(advance(s)).toBe(s);
    const after = choose(s, 'already', ctx);
    expect(after.chosen).toEqual({ reply: 'already' });
    expect(after.seq[after.i]).toMatchObject({ kind: 'message', speaker: 'Priya', text: '"Of course you are. Send me case one when you have it."' });
    expect(after.seq.length).toBe(seq.length + 1);
    // A choice with no reply moves straight on.
    const focus = choose(s, 'focus', ctx);
    expect(focus.seq.length).toBe(seq.length);
    expect(focus.i).toBe(choiceAt + 1);
    expect(choose(s, 'nonsense', ctx)).toBe(s);
  });

  it('skips to the end card, and fires the art hooks line by line', () => {
    let s = advance(startPlayer(seq));
    expect(firedFx(s)).toEqual([]);
    while (s.phase === 'lines' && !(s.seq[s.i]?.kind !== 'choice' && (s.seq[s.i] as { fx: string | null }).fx === 'buzz')) s = advance(s);
    expect(firedFx(s)).toEqual(['cert', 'buzz']);
    const sk = skip(s);
    expect(sk).toMatchObject({ phase: 'end', skipped: true });
    expect(firedFx(sk)).toEqual(['cert', 'buzz', 's1', 's2']);
    expect(skip(sk)).toBe(sk);
  });
});

describe('story state', () => {
  it('relationships are the sum of the latest choices, so a replay replaces instead of adding', () => {
    let st = completeScene(SCENES, emptyStory(), 'prologue', { reply: 'already' }, NO_NUMBERS, 0, T0);
    expect(st.relationships.priya).toBe(1);
    st = completeScene(SCENES, st, 'first-light', { reply: 'together' }, NO_NUMBERS, 0, T0 + 1);
    expect(st.relationships).toEqual({ lambda: 0, priya: 3, tomasz: 0, okafor: 0 });
    st = completeScene(SCENES, st, 'first-light', { reply: 'down' }, NO_NUMBERS, 0, T0 + 2);
    expect(st.relationships.priya).toBe(0);
    expect(relationshipsOf(SCENES, st.choices)).toEqual(st.relationships);
    expect(st.seen['first-light']).toMatchObject({ first: T0 + 1, last: T0 + 2, plays: 2 });
  });

  it('a skipped play keeps the choices made before', () => {
    let st = completeScene(SCENES, emptyStory(), 'prologue', { reply: 'already' }, NO_NUMBERS, 0, T0);
    st = completeScene(SCENES, st, 'prologue', {}, NO_NUMBERS, 0, T0 + 1);
    expect(st.choices.prologue).toEqual({ reply: 'already' });
    expect(st.relationships.priya).toBe(1);
  });

  it('keeps the numbers of the first play, so a replay plays as it did, and records REP', () => {
    let st = completeScene(SCENES, emptyStory(), 'first-light', {}, nums({ sectionsMastered: 2 }), 120, T0);
    st = completeScene(SCENES, st, 'first-light', {}, nums({ sectionsMastered: 9 }), 400, T0 + 1);
    expect(st.seen['first-light']?.n.sectionsMastered).toBe(2);
    expect(st.rep).toBe(400);
  });

  it('words a relationship and knows who has been met', () => {
    expect([-3, -1, 0, 1, 3, 5].map(relationWord)).toEqual(['distant', 'cooler', 'acquainted', 'friendly', 'close', 'trusted']);
    const st = completeScene(SCENES, emptyStory(), 'prologue', {}, NO_NUMBERS, 0, T0);
    expect([...metOf(SCENES, st.seen)]).toEqual(['priya']);
    expect(metOf(SCENES, {}).size).toBe(0);
  });

  it('queues what has triggered, once, in story order, with the numbers then', () => {
    const f = facts({ chaptersComplete: [STEP_BLOCK_1], sectionsMastered: 2, weekHours: 9 });
    const due = newlyDue(SCENES, emptyStory(), f);
    expect(due.map((s) => s.id)).toEqual(['prologue', 'first-light']);
    const st = enqueue(emptyStory(), due, f, T0);
    expect(st.queued.map((q) => [q.id, q.at, q.n.sectionsMastered, q.n.weekHours])).toEqual([['prologue', T0, 2, 9], ['first-light', T0, 2, 9]]);
    expect(newlyDue(SCENES, st, f)).toEqual([]);
    expect(enqueue(st, [], f, T0)).toBe(st);
    // Playing removes it from the queue; a seen scene never triggers again.
    const done = completeScene(SCENES, st, 'prologue', {}, NO_NUMBERS, 0, T0);
    expect(done.queued.map((q) => q.id)).toEqual(['first-light']);
    expect(newlyDue(SCENES, done, f)).toEqual([]);
  });

  it('never queues a scene not yet written, however its trigger stands', () => {
    const f = facts({ chaptersComplete: [CS0_PROOF], actsComplete: 5, letters: ['offer', 'results'], termShare: { [STAGE_A]: 1 } });
    const unwritten = SCENES.map((s) => ({ ...s, script: null }));
    expect(newlyDue(unwritten, emptyStory(), f)).toEqual([]);
  });

  it('parses what it saves, and drops what it cannot read', () => {
    let st = completeScene(SCENES, emptyStory(), 'prologue', { reply: 'already' }, nums({ daysStudied: 3 }), 30, T0);
    st = enqueue(st, [FIRST_LIGHT], facts({ sectionsMastered: 2 }), T0);
    expect(parseStory(JSON.stringify(st), SCENES)).toEqual(st);
    expect(parseStory(null, SCENES)).toEqual(emptyStory());
    expect(parseStory('{not json', SCENES)).toEqual(emptyStory());
    expect(parseStory('[]', SCENES)).toEqual(emptyStory());
    const messy = parseStory(JSON.stringify({
      seen: { prologue: { first: 1, last: 2, plays: 1 }, nope: { first: 1, last: 1, plays: 1 }, 'first-light': { first: 'x' } },
      choices: { prologue: { reply: 'already', bad: 3 }, nope: { a: 'b' } },
      relationships: { priya: 99 },
      rep: -4,
      queued: [{ id: 'prologue', at: 1 }, { id: 'first-light', at: 5 }, { id: 'first-light', at: 6 }, { id: 'zzz', at: 1 }, 'x'],
    }), SCENES);
    expect(Object.keys(messy.seen)).toEqual(['prologue']);
    expect(messy.seen.prologue?.n).toEqual(NO_NUMBERS);
    expect(messy.choices).toEqual({ prologue: { reply: 'already' } });
    // Relationships come from the choices, never from the stored numbers.
    expect(messy.relationships.priya).toBe(1);
    expect(messy.rep).toBeNull();
    expect(messy.queued.map((q) => [q.id, q.at])).toEqual([['first-light', 5]]);
  });

  it('names the next scene for the end card', () => {
    expect(nextScene(SCENES, 'prologue')?.id).toBe('first-light');
    expect(nextScene(SCENES, 'first-light')?.title).toBe('Proof');
    expect(nextScene(SCENES, 'matriculation')).toBeUndefined();
  });
});

describe('playing by itself', () => {
  // 2026-10-09 is a Friday; Brooklyn sundown is about 6:25 pm (22:25 UTC).
  const ny = (d: number, h: number, m = 0): number => Date.UTC(2026, 9, d, h + 4, m);

  it('Shabbat runs from Friday sundown to Saturday sundown in Brooklyn', () => {
    expect(isShabbat(ny(9, 12))).toBe(false);
    expect(isShabbat(ny(9, 18, 0))).toBe(false);
    expect(isShabbat(ny(9, 19, 0))).toBe(true);
    expect(isShabbat(ny(10, 1))).toBe(true);
    expect(isShabbat(ny(10, 12))).toBe(true);
    expect(isShabbat(ny(10, 20))).toBe(false);
    expect(isShabbat(ny(11, 12))).toBe(false);
    expect(isShabbat(ny(8, 23))).toBe(false);
  });

  it('waits out Shabbat and a timed paper, and otherwise plays the first queued scene at once, even mid-lesson', () => {
    const st = enqueue(emptyStory(), [PROLOGUE, FIRST_LIGHT], facts(), T0);
    expect(autoPlay(st, ny(12, 9), { view: 'today' })).toBe('prologue');
    expect(autoPlay(st, ny(9, 20), { view: 'today' })).toBeNull();
    expect(autoPlay(st, ny(10, 20), { view: 'today' })).toBe('prologue');
    expect(autoPlay(st, ny(12, 9), { view: 'task', index: 0 })).toBe('prologue');
    expect(autoPlay(st, ny(12, 9), { view: 'today' }, true)).toBeNull();
    expect(autoPlay(emptyStory(), ny(12, 9), { view: 'today' })).toBeNull();
  });

  it('holds scenes back only on a past paper\'s screen', () => {
    expect(calmView({ view: 'paper', paperId: 'x' })).toBe(false);
    expect(calmView({ view: 'learn', topicId: 'x' })).toBe(true);
    expect(calmView({ view: 'problem', topicId: 'x', problemId: 'y' })).toBe(true);
    for (const view of ['today', 'start', 'book', 'campaign', 'letters', 'report', 'story', 'progress', 'gym'] as const) expect(calmView({ view })).toBe(true);
  });
});

describe('the facts, from real data', () => {
  const block1 = chapterById(STEP_BLOCK_1)!;
  const block1Topics = block1.sections.flatMap((s) => s.steps.map((x) => x.topicId));
  const learner = (ids: readonly string[]): Progress => ({ ...startLearner(T0, DEFAULT_COURSES, 60), memory: placedMemory(ids, T0) });

  it('a new learner has nothing', () => {
    const f = storyFacts(null, null, {}, T0);
    expect(f).toMatchObject({ sectionsMastered: 0, papersSat: 0, supervisionsPassed: 0, daysStudied: 0, weekHours: 0, chaptersComplete: [], letters: [] });
  });

  it('completes STEP Foundation, Block 1 when every step is learned, and counts its sections', () => {
    const partial = storyFacts(learner(block1Topics.slice(1)), null, {}, T0);
    expect(partial.chaptersComplete).not.toContain(STEP_BLOCK_1);
    const done = storyFacts(learner(block1Topics), null, {}, T0);
    expect(done.chaptersComplete).toContain(STEP_BLOCK_1);
    expect(done.sectionsMastered).toBe(block1.sections.filter((s) => s.steps.length > 0).length);
    expect(triggered(FIRST_LIGHT.trigger, done)).toBe(true);
    expect(done.termShare[STAGE_A]).toBeGreaterThan(0);
    expect(done.termShare[STAGE_A]).toBeLessThan(0.5);
  });

  it('counts days studied, passed supervisions, ticked hours, papers, and letters', () => {
    const p: Progress = {
      ...learner([]),
      history: [
        { at: T0 - 86_400_000, kind: 'lesson', topicId: 'pre.fractions', correct: true },
        { at: T0, kind: 'lesson', topicId: 'pre.indices', correct: true },
        { at: T0 + 1000, kind: 'supervision', topicId: 'pre.indices', correct: true },
        { at: T0 + 2000, kind: 'supervision', topicId: 'pre.indices', correct: false },
        { at: T0 - 5 * 86_400_000, kind: 'placement', topicId: 'pre.indices', correct: true },
      ],
    };
    const c: Campaign = {
      ...newCampaign('maths', T0),
      sittings: [
        { id: 'a', paperId: 'x', act: 2, startedAt: T0, finishedAt: T0 + 1, answers: [] },
        { id: 'b', paperId: 'y', act: 2, startedAt: T0, finishedAt: T0 + 1 },
        { id: 'c', paperId: 'z', act: 1, startedAt: T0, finishedAt: null, total: 3 },
        { id: 'd', paperId: 'w', act: 5, startedAt: T0, finishedAt: T0 + 1, questionMarks: [20, null] },
      ],
      letters: [{ id: 'received', at: T0 }],
    };
    // A ticked 90-minute block on the day of T0 (wake 7:00, first block after getting going).
    const log = { '2026-10-05': { wake: '07:00', ticks: [465] } };
    const f = storyFacts(p, c, log, T0);
    expect(f.daysStudied).toBe(2);
    expect(f.supervisionsPassed).toBe(1);
    expect(f.papersSat).toBe(2);
    expect(papersSat(null)).toBe(0);
    expect(f.weekHours).toBe(1.5);
    // Without the paper registry the results are unknown, so neither the acts nor the letters count yet.
    expect(f.actsComplete).toBeNull();
    expect(f.campaign).toBeNull();
    expect(f.letters).toEqual([]);
  });
});
