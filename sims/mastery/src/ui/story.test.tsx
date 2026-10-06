/**
 * Story mode in the app: the Prologue on first launch (once, skippable, replayable), the
 * choices and the end card, First Light from real progress, scenes playing as soon as they
 * trigger except on Shabbat and during a timed paper (then Today says one is ready), the Story tab, and Book One's campaign scenes from a real campaign
 * (the registry loaded on demand, letters filed, real marks on the end cards).
 */
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { IDBFactory } from 'fake-indexeddb';
import { placedMemory, type IdbFactoryLike } from '@learnhub/mastery';
import { chapterById } from '@learnhub/content/book';
import * as adm from '@learnhub/content/admissions';
import { finishSitting, newCampaign, newInterview, recordMarks, startSitting, type Campaign, type Sitting } from '@/model/campaign';
import { campaign, saveCampaign } from '@/model/campaignStore';
import { closureTopics } from '@/model/courses';
import { DEFAULT_COURSES, ensureSession, startLearner } from '@/model/learner';
import { go, parseRoute, route } from '@/model/route';
import { commit, flush, init, setClock } from '@/model/store';
import { NO_NUMBERS, emptyStory, type Seen } from '@/model/story';
import { SCENES, STEP_BLOCK_1 } from '@/model/storyScenes';
import { STORY_KEY, playing, reloadStory, saveStory, story } from '@/model/storyStore';
import { App } from '@/ui/App';

/** Monday 2026-10-05, 10:00 am in New York. */
const T0 = Date.UTC(2026, 9, 5, 14, 0);
/** Saturday 2026-10-10, noon in New York: Shabbat. */
const SATURDAY = Date.UTC(2026, 9, 10, 16, 0);
const realMatchMedia = window.matchMedia;

beforeEach(async () => {
  Element.prototype.scrollTo ??= () => {};
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('mastery.tour.v1', '1');
  reloadStory();
  playing.value = null;
  history.replaceState(null, '', '#/');
  route.value = parseRoute('#/');
  setClock(() => T0);
  // Reduced motion: the title card lasts 300 ms and lines appear whole.
  window.matchMedia = ((q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
  await init(new IDBFactory() as unknown as IdbFactoryLike);
});
afterEach(() => {
  cleanup();
  playing.value = null;
  window.matchMedia = realMatchMedia;
});

const dialog = (): HTMLElement | null => document.querySelector('.sp-stage');
const click = (name: string | RegExp): void => { fireEvent.click(screen.getByRole('button', { name })); };
const endCard = (): Record<string, string> =>
  Object.fromEntries([...document.querySelectorAll('.sp-end li')].map((li) => [li.children[0]?.textContent ?? '', li.children[1]?.textContent ?? '']));

async function withCourse(memory: string[] = []): Promise<void> {
  const p = ensureSession(startLearner(T0, DEFAULT_COURSES, 60), T0);
  await commit({ ...p, memory: placedMemory(memory, T0) });
}

function prologueSeen(): void {
  saveStory({ ...emptyStory(), seen: { prologue: { first: T0, last: T0, plays: 1, n: { ...NO_NUMBERS } } } });
}

describe('the Prologue', () => {
  it('plays on first launch, before the start, and skips to an end card with real numbers', async () => {
    render(<App />);
    await flush();
    await waitFor(() => expect(dialog()).not.toBeNull());
    expect(dialog()?.getAttribute('aria-label')).toBe('Prologue: The Kitchen Table');
    expect(document.querySelector('.sp-title h1')?.textContent).toBe('The Kitchen Table');
    expect(document.querySelector('.sp-p')?.textContent).toBe('Brooklyn, 5:04 am');
    // The app behind is inert while a scene plays.
    expect(document.querySelector('.app')?.hasAttribute('inert')).toBe(true);
    await waitFor(() => expect(document.querySelector('.sp-txt')?.textContent).toBe('The radiator knocks twice. The city is still dark, except for the laptop.'));
    expect(document.querySelector('.sp-who')?.textContent).toBe('Narration');
    fireEvent.keyDown(dialog() as HTMLElement, { key: ' ' });
    await waitFor(() => expect(document.querySelector('.sp-txt')?.textContent).toMatch(/^On the screen: STEP 2005/));
    click('Skip');
    await waitFor(() => expect(document.querySelector('.sp-end')).not.toBeNull());
    expect(document.querySelector('.sp-end .sp-k')?.textContent).toBe('Prologue complete');
    expect(endCard()).toEqual({ REP: '0 · Applicant', Priya: 'unchanged', Focus: 'unchanged', 'Triggered by': 'first launch' });
    expect(document.querySelector('.sp-next')?.textContent).toBe('Next: First Light. It plays when you finish STEP Foundation, Block 1.');
    expect(story.value.seen.prologue?.plays).toBe(1);
    expect(JSON.parse(localStorage.getItem(STORY_KEY) ?? '{}').seen.prologue.plays).toBe(1);
    click('Continue');
    await waitFor(() => expect(dialog()).toBeNull());
    expect(document.querySelector('main h1')?.textContent).toBe('Welcome');

    // Never again by itself.
    cleanup();
    render(<App />);
    await flush();
    await new Promise((r) => setTimeout(r, 20));
    expect(dialog()).toBeNull();
  });

  it('a choice moves Priya, and the end card says so', async () => {
    render(<App />);
    await waitFor(() => expect(document.querySelector('.sp-txt')).not.toBeNull());
    for (let i = 0; i < 20 && document.querySelector('.sp-choices') === null; i++) fireEvent.click(document.querySelector('.sp-frame') as Element);
    const options = [...document.querySelectorAll('.sp-choices button')];
    expect(options.map((b) => b.textContent)).toEqual([
      '"Already on question one." Priya will remember this',
      '"Go back to sleep. I\'m only looking." Keep your cards close',
      'Turn the phone face down. Open the paper. Focus',
    ]);
    expect(document.activeElement).toBe(options[0]);
    // Space and Enter never pass an open choice.
    fireEvent.keyDown(dialog() as HTMLElement, { key: 'Enter' });
    expect(document.querySelector('.sp-choices')).not.toBeNull();
    fireEvent.click(options[0] as Element);
    await waitFor(() => expect(document.querySelector('.sp-txt')?.textContent).toBe('"Of course you are. Send me case one when you have it."'));
    expect(document.querySelector('.sp-who.sp-msg')?.textContent).toBe('Priya');
    for (let i = 0; i < 20 && document.querySelector('.sp-end') === null; i++) fireEvent.keyDown(dialog() as HTMLElement, { key: 'Enter' });
    await waitFor(() => expect(document.querySelector('.sp-end')).not.toBeNull());
    expect(endCard().Priya).toBe('closer (friendly)');
    expect(story.value.relationships.priya).toBe(1);
    expect(story.value.choices.prologue).toEqual({ reply: 'already' });

    // Replay plays it again from the title card; Escape skips, then closes.
    click('Replay scene');
    await waitFor(() => expect(document.querySelector('.sp-end')).toBeNull());
    fireEvent.keyDown(dialog() as HTMLElement, { key: 'Escape' });
    await waitFor(() => expect(document.querySelector('.sp-end')).not.toBeNull());
    expect(story.value.seen.prologue?.plays).toBe(2);
    // A skipped replay keeps the earlier choice.
    expect(story.value.relationships.priya).toBe(1);
    fireEvent.keyDown(dialog() as HTMLElement, { key: 'Escape' });
    await waitFor(() => expect(dialog()).toBeNull());
  });

  it('a choice made before skipping still counts', async () => {
    render(<App />);
    await waitFor(() => expect(document.querySelector('.sp-txt')).not.toBeNull());
    for (let i = 0; i < 20 && document.querySelector('.sp-choices') === null; i++) fireEvent.click(document.querySelector('.sp-frame') as Element);
    fireEvent.click(document.querySelector('.sp-choices button') as Element);
    click('Skip');
    await waitFor(() => expect(document.querySelector('.sp-end')).not.toBeNull());
    expect(endCard().Priya).toBe('closer (friendly)');
    expect(story.value.relationships.priya).toBe(1);
  });

  it('waits out Shabbat, and the Story tab offers it to play now', async () => {
    setClock(() => SATURDAY);
    await withCourse();
    go({ view: 'story' });
    render(<App />);
    await flush();
    await new Promise((r) => setTimeout(r, 20));
    expect(dialog()).toBeNull();
    expect(story.value.queued.map((q) => q.id)).toEqual(['prologue']);
    expect(document.querySelector('main')?.textContent).toContain('Ready. It waits until Saturday sundown to play by itself.');
    // The scene card leads the tab, with its art and a Play button.
    const card = document.querySelector('.ds-scenecard') as HTMLElement;
    expect(card.querySelector('b')?.textContent).toBe('The Kitchen Table');
    expect(card.querySelector('.ds-art svg')).not.toBeNull();
    fireEvent.click(card.querySelector('button') as HTMLElement);
    await waitFor(() => expect(dialog()).not.toBeNull());
  });

  it('on Shabbat a waiting scene shows on Today as one line, which plays it', async () => {
    setClock(() => SATURDAY);
    await withCourse();
    render(<App />);
    await flush();
    await new Promise((r) => setTimeout(r, 20));
    expect(dialog()).toBeNull();
    const line = await screen.findByRole('button', { name: /A scene is ready: The Kitchen Table/ });
    fireEvent.click(line);
    await waitFor(() => expect(dialog()).not.toBeNull());
  });

  it('plays at once even with a lesson open', async () => {
    await withCourse();
    go({ view: 'task', index: 0 });
    render(<App />);
    await waitFor(() => expect(dialog()).not.toBeNull());
  });

  it('waits while a timed paper runs, on any screen, and Today says it is ready', async () => {
    await withCourse();
    let c = newCampaign('cs', T0);
    c = startSitting(c, 'tmua-2016-p1', 1, T0);
    saveCampaign(c);
    render(<App />);
    await flush();
    await new Promise((r) => setTimeout(r, 20));
    expect(dialog()).toBeNull();
    expect(story.value.queued.map((q) => q.id)).toEqual(['prologue']);
    expect(await screen.findByRole('button', { name: /A scene is ready/ })).toBeTruthy();
    saveCampaign(null);
  });
});

describe('First Light', () => {
  it('plays when STEP Foundation, Block 1 is complete, with the real numbers on its end card', async () => {
    prologueSeen();
    const block1 = chapterById(STEP_BLOCK_1)!;
    await withCourse(block1.sections.flatMap((s) => s.steps.map((x) => x.topicId)));
    render(<App />);
    await flush();
    await waitFor(() => expect(dialog()?.getAttribute('aria-label')).toBe('Chapter 1: First Light'));
    expect(document.querySelector('.sp-p')?.textContent).toBe('Brooklyn, 6:40 am, the morning after');
    click('Skip');
    await waitFor(() => expect(document.querySelector('.sp-end')).not.toBeNull());
    const sections = String(block1.sections.filter((s) => s.steps.length > 0).length);
    expect(endCard()).toMatchObject({ 'Sections mastered': sections, 'Hours that week': '0', Priya: 'unchanged', 'Triggered by': 'STEP Foundation, Block 1 complete' });
    expect(document.querySelector('.sp-next')?.textContent).toBe('Next: Proof. It plays when you finish CS-0 Proof.');
  });

  it('does not play before the chapter is complete', async () => {
    prologueSeen();
    const block1 = chapterById(STEP_BLOCK_1)!;
    await withCourse(block1.sections.flatMap((s) => s.steps.map((x) => x.topicId)).slice(1));
    render(<App />);
    await flush();
    await new Promise((r) => setTimeout(r, 20));
    expect(dialog()).toBeNull();
  });
});

describe('the Story tab', () => {
  it('is the fourth tab and shows REP, relationships, and every scene with its real trigger', async () => {
    prologueSeen();
    await withCourse();
    render(<App />);
    await flush();
    expect([...document.querySelectorAll('nav.ds-nav a.ds-tab .ds-tab-l')].map((a) => a.textContent).slice(-2)).toEqual(['Story', 'You']);
    fireEvent.click(document.querySelector('nav.ds-nav a[data-nav="story"]') as Element);
    expect(location.hash).toBe('#/story');
    const main = (): string => document.querySelector('main')?.textContent ?? '';
    expect(document.querySelector('main h1')?.textContent).toBe('Story');
    expect(main()).toContain('Applicant');
    expect(main()).toContain('500 to Offer Holder');
    expect(main()).toContain('Priya Ramanacquainted');
    expect(main()).toContain('Dr Ada Lambdanot met yet');
    expect(main()).toContain('1. First Lightlocked');
    expect(main()).toContain('Plays when you finish STEP Foundation, Block 1.');
    expect(main()).toContain('2. ProoflockedPlays when you finish CS-0 Proof.');
    expect(main()).toContain('10. MatriculationlockedPlays when your place is confirmed.');
    expect(main()).toContain('Plays when you are halfway through Stage A.');
    expect(main()).toContain('Plays when the offer letter arrives.');
    expect(main()).toContain('Book Two: Part IA');
    expect(main()).not.toMatch(/[\u2013\u2014]/);
    click('Replay The Kitchen Table');
    await waitFor(() => expect(dialog()?.getAttribute('aria-label')).toBe('Prologue: The Kitchen Table'));
  });
});

// ---------------------------------------------------------------- Book One's campaign scenes

/** Sits a paper and records its marks in one go. */
function sit(c: Campaign, paperId: string, marks: Pick<Sitting, 'answers' | 'questionMarks' | 'total'>, at: number): Campaign {
  const started = startSitting(c, paperId, 1, at);
  const s = started.sittings[started.sittings.length - 1] as Sitting;
  return recordMarks(finishSitting(started, s.id, at + 60_000), s.id, marks);
}

/** A maths campaign with every act's work done: A* A levels, TMUA 16, 14, 15, filed, interviews 16 and 15, and STEP marks given. */
function campaignThrough(acts: 4 | 5, step2 = 80, step3 = 50): Campaign {
  let c = newCampaign('maths', T0);
  const aLevels: Record<string, number> = { 'edx-9ma0-1-2024': 85, 'edx-9ma0-2-2024': 84, 'edx-9fm0-1-2024': 70, 'edx-9fm0-2-2024': 66, 'ocr-h446-01-2024': 118, 'ocr-h446-02-2024': 104 };
  for (const [id, total] of Object.entries(aLevels)) c = sit(c, id, { total }, T0);
  const answers = (year: number, paper: 1 | 2, k: number): (string | null)[] => [...(adm.tmuaKey(year, paper) as string)].map((a, i) => (i < k ? a : null));
  c = sit(c, 'tmua-2016-p1', { answers: answers(2016, 1, 16) }, T0 + 1000);
  c = sit(c, 'tmua-2016-p2', { answers: answers(2016, 2, 14) }, T0 + 2000);
  c = sit(c, 'tmua-2017-p1', { answers: answers(2017, 1, 15) }, T0 + 3000);
  c = { ...c, college: 'st-edmunds', applicationFiledAt: T0 + 4000 };
  c = { ...c, interviews: [newInterview('i1', 'pre-reading', c, T0, 16), newInterview('i2', 'induction', c, T0, 15)] };
  if (acts === 5) {
    const marks = (total: number): (number | null)[] => {
      const out: (number | null)[] = [];
      for (let left = total; left > 0; left -= 20) out.push(Math.min(20, left));
      return [...out, ...Array<null>(12 - out.length).fill(null)];
    };
    c = sit(c, 'step-2019-2', { questionMarks: marks(step2) }, T0 + 10_000);
    c = sit(c, 'step-2019-3', { questionMarks: marks(step3) }, T0 + 20_000);
  }
  return c;
}

/** The rating beats: the campaign fixtures' timed papers raise Exam Temperament, and the beats have tests of their own. */
const BEATS = SCENES.filter((s) => s.strand === 'beat').map((s) => s.id);

/** Marks these scenes (and the beats) seen, so the next one in the queue is the one under test. */
function seenUpTo(...ids: string[]): void {
  const seen: Record<string, Seen> = Object.fromEntries([...ids, ...BEATS].map((id) => [id, { first: T0, last: T0, plays: 1, n: { ...NO_NUMBERS } }]));
  saveStory({ ...emptyStory(), seen });
}

/** A learner who has mastered every lesson of the course: Act I's chapters. */
async function scholar(): Promise<void> {
  const p = ensureSession(startLearner(T0, DEFAULT_COURSES, 60), T0);
  await commit({ ...p, memory: placedMemory(closureTopics(p.courses).map((t) => t.id), T0) });
}

const BEFORE_ACTS = ['prologue', 'first-light', 'proof', 'long-winter'];

describe('Book One, from a real campaign', () => {
  afterEach(() => { saveCampaign(null); });

  it('Act I plays when the campaign completes it, reading the real A level grades', async () => {
    seenUpTo(...BEFORE_ACTS);
    await scholar();
    let c = newCampaign('maths', T0);
    for (const [id, total] of Object.entries({ 'edx-9ma0-1-2024': 85, 'edx-9ma0-2-2024': 70, 'edx-9fm0-1-2024': 70, 'edx-9fm0-2-2024': 66, 'ocr-h446-01-2024': 118, 'ocr-h446-02-2024': 104 })) {
      c = sit(c, id, { total }, T0);
    }
    saveCampaign(c);
    render(<App />);
    await flush();
    await waitFor(() => expect(dialog()?.getAttribute('aria-label')).toBe('Chapter 4: Act I: Recent Qualifications'), { timeout: 5000 });
    expect(document.querySelector('.sp-p')?.textContent).toBe('Brooklyn, 7:30 pm, a Sunday in June');
    // Only Act I is complete, so only Act I queued.
    expect(story.value.queued.map((q) => q.id)).toEqual(['act-1']);
    click('Skip');
    await waitFor(() => expect(document.querySelector('.sp-end')).not.toBeNull());
    expect(endCard()).toMatchObject({ Mathematics: 'A* (85/100), A (70/100)', 'Further Mathematics': 'A* (70/75), A* (66/75)', 'Triggered by': 'Act I complete' });
  });

  it('The Offer shows the real offer letter inside the scene, filed by the director', async () => {
    seenUpTo(...BEFORE_ACTS, 'act-1', 'act-2', 'act-3', 'act-4');
    await scholar();
    saveCampaign(campaignThrough(4));
    render(<App />);
    await flush();
    await waitFor(() => expect(dialog()?.getAttribute('aria-label')).toBe('Chapter 8: The Offer'), { timeout: 5000 });
    // The director filed the letters due, so the Letters tab and the scene agree.
    expect(campaign.value?.letters.map((l) => l.id)).toEqual(['received', 'invitation', 'offer']);
    await waitFor(() => expect(document.querySelector('.sp-txt')).not.toBeNull());
    for (let i = 0; i < 20 && document.querySelector('.sp-doc .offer') === null; i++) fireEvent.click(document.querySelector('.sp-frame') as Element);
    await waitFor(() => expect(document.querySelector('.sp-doc .offer')).not.toBeNull());
    const letter = document.querySelector('.sp-doc .offer')?.textContent ?? '';
    expect(letter).toContain('Conditional offer of admission: Mathematics');
    expect(letter).toContain('Grade 1 in Sixth Term Examination Paper (STEP) Mathematics 3');
    expect(letter).toContain('Dr E. Noether-Gauss');
    // Tapping the letter does not move the scene on.
    const line = document.querySelector('.sp-txt')?.textContent;
    fireEvent.click(document.querySelector('.sp-doc') as Element);
    expect(document.querySelector('.sp-txt')?.textContent).toBe(line);
    click('Skip');
    await waitFor(() => expect(document.querySelector('.sp-end')).not.toBeNull());
    expect(document.querySelector('.sp-doc')).toBeNull();
    expect(endCard()).toMatchObject({ Conditions: '5', Course: 'Mathematics', 'Interview mean': '15.5 of 20', 'Triggered by': 'the offer letter' });
  });

  it('Results Day reads the real STEP grades: a narrow miss, then the reprieve, then Matriculation', async () => {
    seenUpTo(...BEFORE_ACTS, 'act-1', 'act-2', 'act-3', 'act-4', 'the-offer');
    await scholar();
    saveCampaign(campaignThrough(5, 80, 50));
    render(<App />);
    await flush();
    await waitFor(() => expect(dialog()?.getAttribute('aria-label')).toBe('Chapter 9: Results Day'), { timeout: 5000 });
    expect(story.value.queued.map((q) => q.id)).toEqual(['results-day', 'matriculation']);
    click('Skip');
    await waitFor(() => expect(document.querySelector('.sp-end')).not.toBeNull());
    expect(endCard()).toMatchObject({
      Results: 'STEP 2 2019: 80 of 120, grade 1. STEP 3 2019: 50 of 120, grade 2.',
      'Conditions met': '4 of 5',
      'The College': 'place confirmed after review',
    });
    click('Continue');
    await waitFor(() => expect(dialog()?.getAttribute('aria-label')).toBe('Chapter 10: Matriculation'));
    click('Skip');
    await waitFor(() => expect(document.querySelector('.sp-end')).not.toBeNull());
    expect(document.querySelector('.sp-next')).toBeNull();
    click('Continue');
    await waitFor(() => expect(dialog()).toBeNull());
    // Played once each; never again by itself.
    expect(story.value.queued).toEqual([]);
    expect(story.value.seen['results-day']?.plays).toBe(1);
    expect(story.value.seen.matriculation?.plays).toBe(1);
  });

  it('a missed offer plays the deferral and holds Matriculation back', async () => {
    seenUpTo(...BEFORE_ACTS, 'act-1', 'act-2', 'act-3', 'act-4', 'the-offer');
    await scholar();
    saveCampaign(campaignThrough(5, 60, 50));
    render(<App />);
    await flush();
    await waitFor(() => expect(dialog()?.getAttribute('aria-label')).toBe('Chapter 9: Results Day'), { timeout: 5000 });
    expect(story.value.queued.map((q) => q.id)).toEqual(['results-day']);
    click('Skip');
    await waitFor(() => expect(document.querySelector('.sp-end')).not.toBeNull());
    expect(endCard()['The College']).toBe('deferred place, same conditions');
  });

  it('on Shabbat a campaign scene waits in the Story tab', async () => {
    setClock(() => SATURDAY);
    seenUpTo(...BEFORE_ACTS, 'act-1', 'act-2', 'act-3', 'act-4');
    await scholar();
    saveCampaign(campaignThrough(4));
    go({ view: 'story' });
    render(<App />);
    await flush();
    await waitFor(() => expect(story.value.queued.map((q) => q.id)).toEqual(['the-offer']), { timeout: 5000 });
    await new Promise((r) => setTimeout(r, 20));
    expect(dialog()).toBeNull();
    expect(document.querySelector('main')?.textContent).toContain('8. The OfferPlayReady. It waits until Saturday sundown to play by itself.');
  });

  it('the Story tab names a seen variant by the title it played under', async () => {
    saveStory({ ...emptyStory(), seen: { prologue: { first: T0, last: T0, plays: 1, n: { ...NO_NUMBERS } }, 'long-winter': { first: T0, last: T0, plays: 1, n: { ...NO_NUMBERS, weeksShort: 2 } } } });
    await withCourse();
    go({ view: 'story' });
    render(<App />);
    await flush();
    expect(document.querySelector('main')?.textContent).toContain('3. The Long WinterReplay');
    click('Replay The Long Winter');
    await waitFor(() => expect(dialog()?.getAttribute('aria-label')).toBe('Chapter 3: The Long Winter'));
    expect(document.querySelector('.sp-title h1')?.textContent).toBe('The Long Winter');
  });
});

// ---------------------------------------------------------------- ratings, side scenes, beats

describe('ratings and side scenes', () => {
  it('the Story tab shows the ratings card, the overall, and the side scenes with their triggers', async () => {
    prologueSeen();
    await withCourse();
    go({ view: 'story' });
    render(<App />);
    await flush();
    const card = document.querySelector('.story-ratings');
    expect(card).not.toBeNull();
    expect(card?.querySelector('.rt-ovr')?.textContent).toBe('40');
    expect([...(card?.querySelectorAll('.rt-l') ?? [])].map((x) => x.textContent)).toEqual([
      'Analysis', 'Algebra', 'Probability', 'Proof', 'Programming', 'Exam Temperament',
    ]);
    expect([...(card?.querySelectorAll('.rt-v') ?? [])].map((x) => x.textContent)).toEqual(['40', '40', '40', '40', '40', '40']);
    expect(card?.textContent).toContain('drills and gym alone stop at 55');
    const main = document.querySelector('main')?.textContent ?? '';
    expect(main).toContain('Thursday NightlockedPlays after First Light, if you asked Priya to study together.');
    expect(main).toContain('The MarginlockedPlays when your Proof rating reaches 70.');
    expect(main).not.toMatch(/[–—]/);
  });

  it('a choice in First Light unlocks Thursday Night, which plays by itself and moves Priya', async () => {
    saveStory({
      ...emptyStory(),
      seen: Object.fromEntries(['prologue', 'first-light'].map((id) => [id, { first: T0, last: T0, plays: 1, n: { ...NO_NUMBERS } }])),
      choices: { 'first-light': { reply: 'together' } },
      relationships: { lambda: 0, priya: 2, tomasz: 0, okafor: 0 },
    });
    await withCourse();
    render(<App />);
    await flush();
    await waitFor(() => expect(dialog()?.getAttribute('aria-label')).toBe('Side scene: Thursday Night'), { timeout: 5000 });
    await waitFor(() => expect(document.querySelector('.sp-txt')).not.toBeNull());
    for (let i = 0; i < 20 && document.querySelector('.sp-choices') === null; i++) fireEvent.click(document.querySelector('.sp-frame') as Element);
    await waitFor(() => expect(document.querySelector('.sp-choices')).not.toBeNull());
    click(/how many ways can three coins land/);
    click('Skip');
    await waitFor(() => expect(document.querySelector('.sp-end')).not.toBeNull());
    expect(endCard().Priya).toBe('closer (close)');
    // A side scene names no "Next".
    expect(document.querySelector('.sp-next')).toBeNull();
    expect(story.value.relationships.priya).toBe(4);
  });
});
