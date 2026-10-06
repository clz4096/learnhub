/**
 * The timed ladder and blind mixed review screens in the app: routing and focus mode, the
 * rung locks and why, a rung run in the timed screen and recorded through the ladder store
 * (so the outcome panel sees the half paper), the topic hidden until a problem is answered,
 * the answers recorded, and the ways in from Today and the palette.
 */
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/preact';
import { IDBFactory } from 'fake-indexeddb';
import * as adm from '@learnhub/content/admissions';
import { gateOf, type Instance, type TopicContent } from '@learnhub/content';
import { TOPIC_CONTENT, contentFor } from '@learnhub/content/all';
import { DAY_MS, newMemory, type IdbFactoryLike, type Progress } from '@learnhub/mastery';
import { newCampaign } from '@/model/campaign';
import { saveCampaign } from '@/model/campaignStore';
import { contentStore } from '@/model/content';
import { titleOf } from '@/model/courses';
import { finishAttempt, recordAttemptMarks, startAttempt } from '@/model/ladder';
import { LADDER_KEY, ladder, loadLadder } from '@/model/ladderStore';
import { DEFAULT_COURSES, ensureSession, recordCambridgeAnswer, startLearner } from '@/model/learner';
import { mixedInstance, parseMixedSitting } from '@/model/mixedReview';
import { MIXED_KEY } from '@/model/mixedStore';
import { predictions } from '@/model/outcome';
import { go, parseRoute, route } from '@/model/route';
import { commit, flush, init, progress, setClock } from '@/model/store';
import { NO_NUMBERS, emptyStory } from '@/model/story';
import { saveStory } from '@/model/storyStore';
import { App } from '@/ui/App';
import { admissions } from '@/ui/campaignShared';
import { paletteOpen } from '@/ui/shell/state';
import { readyFor } from '@/test/ready';

const T0 = Date.UTC(2026, 9, 5, 15, 0);
const MIN = 60_000;
let t = T0;

beforeEach(async () => {
  Element.prototype.scrollTo ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
  window.scrollBy ??= () => {};
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('mastery.tour.v1', '1');
  history.replaceState(null, '', '#/');
  route.value = parseRoute('#/');
  paletteOpen.value = false;
  t = T0;
  setClock(() => t);
  saveStory({ ...emptyStory(), seen: { prologue: { first: T0, last: T0, plays: 1, n: { ...NO_NUMBERS } } } });
  saveCampaign(null);
  admissions.value = adm;
  ladder.value = [];
  await init(new IDBFactory() as unknown as IdbFactoryLike);
  await commit(ensureSession(startLearner(T0, DEFAULT_COURSES, 60), T0));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  saveCampaign(null);
  paletteOpen.value = false;
});

const heading = (): string | null | undefined => document.querySelector('main h1')?.textContent;
const nav = (): Element | null => document.querySelector('nav.ds-nav');
const rung = (r: string): HTMLElement => document.querySelector(`.ds-rail li[data-rung="${r}"]`) as HTMLElement;

/** A learner who has mastered the STEP syllabus, so the ladder's first rung is open. */
const readyStep = async (): Promise<void> => {
  await commit(ensureSession(readyFor(startLearner(T0 - 30 * DAY_MS, DEFAULT_COURSES, 60), 'STEP', T0), T0));
};

describe('the timed ladder before the topics are ready', () => {
  it('locks every rung, says what unlocks the first, and offers nothing to sit', async () => {
    render(<App />);
    go({ view: 'ladder', exam: 'STEP' });
    await flush();
    expect(rung('question').querySelector('.ds-r')?.textContent).toBe('locked');
    expect(rung('question').textContent).toContain('First timed STEP question unlocks after 60 more topics mastered (60 of the 100 in its syllabus).');
    expect(screen.getByText(/^Not ready yet: 0 of 100 syllabus topics mastered \(60 needed\), from the book's STEP Foundation Blocks 1 to 6 and the STEP 2 modules\.$/)).toBeTruthy();
    expect(screen.queryAllByRole('button', { name: /^Start the clock/ })).toEqual([]);
    expect(screen.getByText(/^Nothing to sit until the first rung opens/)).toBeTruthy();
  });
});

describe('the timed ladder', () => {
  beforeEach(readyStep);

  it('is reached from Admission › Papers, one ladder per exam, with Papers marked as the tab', async () => {
    saveCampaign(newCampaign('maths', T0));
    render(<App />);
    go({ view: 'papers' });
    await flush();
    const ladders = await screen.findByRole('heading', { name: 'Timed ladder' });
    const list = ladders.closest('section') as HTMLElement;
    expect([...list.querySelectorAll('a.ds-li')].map((a) => a.getAttribute('href'))).toEqual(['#/ladder/step', '#/ladder/tmua', '#/ladder/a-level']);
    fireEvent.click(list.querySelector('a[href="#/ladder/tmua"]') as Element);
    await flush();
    expect(location.hash).toBe('#/ladder/tmua');
    expect(heading()).toBe('Timed ladder: TMUA');
    expect(document.querySelector('nav.ds-subtabs[aria-label="Admission"] a.on')?.textContent).toBe('Papers');
    expect(nav()).not.toBeNull();
  });

  it('shows each rung\'s lock and why, and opens the half after two timed passes', async () => {
    render(<App />);
    go({ view: 'ladder', exam: 'STEP' });
    await flush();
    expect(rung('question').getAttribute('aria-current')).toBe('step');
    expect(rung('half').textContent).toContain('Opens after 2 timed questions passed (14 of 20 or better); 0 so far.');
    expect(rung('half').querySelector('.ds-r')?.textContent).toBe('locked');
    expect(rung('full').textContent).toContain('Opens after a timed half paper reaches grade 1');
    // Only the open rung is offered.
    const next = screen.getByRole('heading', { name: 'Sit next' }).closest('section') as HTMLElement;
    expect(within(next).getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual(['Start the clock: One question, STEP 2 2025, question 1, 30 minutes']);

    let list = ladder.value;
    for (const [q, at] of [[1, 0], [2, 60]] as const) {
      list = startAttempt(adm, list, 'step-2025-2', 'question', [q], T0 + at * MIN);
      const id = list.at(-1)!.id;
      list = recordAttemptMarks(adm, finishAttempt(list, id, T0 + (at + 25) * MIN), id, { marks: [15] });
    }
    ladder.value = list;
    await flush();
    expect(rung('half').getAttribute('aria-current')).toBe('step');
    expect(rung('question').querySelector('.ds-r')?.textContent).toBe('passed');
    expect(within(screen.getByRole('heading', { name: 'Your timed work' }).closest('section') as HTMLElement).getAllByText('15 / 20')).toHaveLength(2);
  });

  it('runs a half paper in the timed focus screen, then records its marks through the ladder store for the outcome panel', async () => {
    // Two passed questions open the half.
    let list = startAttempt(adm, [], 'step-2025-2', 'question', [1], T0 - 200 * MIN);
    list = recordAttemptMarks(adm, finishAttempt(list, list[0]!.id, T0 - 180 * MIN), list[0]!.id, { marks: [16] });
    list = startAttempt(adm, list, 'step-2025-2', 'question', [2], T0 - 100 * MIN);
    list = recordAttemptMarks(adm, finishAttempt(list, list[1]!.id, T0 - 80 * MIN), list[1]!.id, { marks: [16] });
    localStorage.setItem(LADDER_KEY, JSON.stringify(list));
    loadLadder(adm);
    render(<App />);
    go({ view: 'ladder', exam: 'STEP' });
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Start the clock: Half a paper, STEP 2 2025, any three questions, 90 minutes' }));
    await flush();
    // Focus mode: the tabs hide; the timed screen shows the big clock, flags, and Finish and mark.
    expect(nav()).toBeNull();
    expect(document.querySelector('.ds-fbar-mid')?.textContent).toBe('timed · no hints');
    expect(heading()).toBe('STEP 2 2025, any three questions');
    expect(screen.getByRole('timer').textContent).toBe('1:30:00');
    expect(screen.getByRole('button', { name: '+ flag a part' })).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(LADDER_KEY) as string).at(-1)).toMatchObject({ rung: 'half', finishedAt: null });

    t = T0 + 85 * MIN;
    fireEvent.click(screen.getByRole('button', { name: 'Finish and mark' }));
    await flush();
    expect(nav()).not.toBeNull();
    const mark = screen.getByRole('group', { name: 'Mark: STEP 2 2025, any three questions' });
    expect(within(mark).getByRole('button', { name: 'Copy for supervision' })).toBeTruthy();
    const inputs = within(mark).getAllByRole('spinbutton');
    expect(inputs).toHaveLength(12);
    for (const [i, m] of [[0, 20], [1, 15], [2, 10]] as const) fireEvent.input(inputs[i] as HTMLElement, { target: { value: String(m) } });
    fireEvent.click(within(mark).getByRole('button', { name: 'Save the marks' }));
    await flush();
    expect(screen.queryByRole('group', { name: /^Mark: / })).toBeNull();
    const stored = JSON.parse(localStorage.getItem(LADDER_KEY) as string).at(-1);
    expect(stored).toMatchObject({ rung: 'half', finishedAt: T0 + 85 * MIN, marks: [20, 15, 10, null, null, null, null, null, null, null, null, null] });
    // The outcome model reads the same store: the half paper is evidence, 45 of 60.
    const step2 = predictions(adm, null, ladder.value).find((x) => x.key === 'STEP 2');
    expect(step2?.evidence).toEqual([expect.objectContaining({ kind: 'half', mark: 45, max: 60, timed: true })]);
  });

  it('a running rung keeps focus mode after a reload, and Escape goes back to Papers', async () => {
    const list = startAttempt(adm, [], 'tmua-2023-p1', 'question', [1], T0);
    localStorage.setItem(LADDER_KEY, JSON.stringify(list));
    ladder.value = [];
    history.replaceState(null, '', '#/ladder/tmua');
    route.value = parseRoute('#/ladder/tmua');
    render(<App />);
    await flush();
    await waitFor(() => expect(nav()).toBeNull());
    expect(heading()).toBe('TMUA 2023 Paper 1, question 1');
    // Mastered topics may start a story scene, which takes Escape; the bar's back button is the same way out.
    const back = document.querySelector('.ds-fbar-back') as HTMLElement;
    expect(back.textContent).toContain('Admission');
    fireEvent.click(back);
    await flush();
    expect(route.value).toEqual({ view: 'papers' });
  });
});

/** Topics with generators, a gate, and no table answers, so the test can type the reference answer. */
const CONTENTS: TopicContent[] = TOPIC_CONTENT.filter((c) => c.generators.length > 0 && gateOf(c.topicId).length > 0
  && c.generators.every((g) => g.instance(1).problem.answer.kind !== 'table')).slice(0, 3);

async function masterThree(): Promise<Progress> {
  const memory: Progress['memory'] = {};
  CONTENTS.forEach((c, i) => { memory[c.topicId] = { ...newMemory(T0 - 3 * DAY_MS), intervalDays: 10, due: i === 0 ? T0 - DAY_MS : T0 + DAY_MS }; });
  let p: Progress = { ...ensureSession(startLearner(T0 - 3 * DAY_MS, DEFAULT_COURSES, 60), T0), memory };
  for (const c of CONTENTS) p = recordCambridgeAnswer(p, `${c.topicId}/${gateOf(c.topicId)[0]}`, true, { hints: 0 }, T0 - 2 * DAY_MS);
  await commit(p);
  vi.spyOn(contentStore, 'load').mockImplementation((id) => Promise.resolve(contentFor(id)));
  return p;
}

/** Answers the problem on screen with its reference answer. */
function answer(inst: Instance): void {
  const a = inst.problem.answer;
  if (a.kind === 'choice') {
    const ids = typeof inst.reference === 'string' ? [inst.reference] : inst.reference;
    for (const id of ids) fireEvent.click(document.querySelector(`.choices input[value="${id}"]`) as Element);
  } else {
    fireEvent.input(screen.getByLabelText('Your answer'), { target: { value: inst.reference as string } });
  }
  fireEvent.click(screen.getByRole('button', { name: 'Check' }));
  const anyway = screen.queryByRole('button', { name: 'Check anyway' });
  if (anyway !== null) fireEvent.click(anyway);
}

describe('blind mixed review', () => {
  it('needs three mastered topics, and says so', async () => {
    render(<App />);
    go({ view: 'mixed' });
    await flush();
    expect(heading()).toBe('Not enough to mix yet');
    expect(document.querySelector('.ds-fbar-mid')?.textContent).toBe('mixed review · topic hidden');
  });

  it('hides the topic until the problem is answered, then records the answer', async () => {
    expect(CONTENTS).toHaveLength(3);
    const before = await masterThree();
    render(<App />);
    go({ view: 'mixed' });
    await flush();
    await waitFor(() => expect(heading()).toMatch(/^Problem 1 of \d+$/));
    // Let the card's mount effects run before typing, as a learner would.
    await new Promise((r) => setTimeout(r, 50));
    const s = parseMixedSitting(localStorage.getItem(MIXED_KEY))!;
    const item = s.items[0]!;
    const title = titleOf(item.topicId);
    // Hidden: neither the heading nor anything visible on the page names the topic.
    expect(heading()).toBe(`Problem 1 of ${s.items.length}`);
    expect(document.querySelector('main')?.textContent).not.toContain(title);
    const inst = mixedInstance(CONTENTS, item)!;
    answer(inst);
    await flush();
    await waitFor(() => expect(heading()).toBe(`Problem 1 of ${s.items.length}: ${title}`));
    const last = progress.value!.history.at(-1);
    expect(progress.value!.history.length).toBe(before.history.length + 1);
    expect(last).toMatchObject({ topicId: item.topicId, correct: true, item: { id: item.id, seed: item.seed, hints: 0 } });
    expect(['quiz', 'drill']).toContain(last?.kind);
    expect(parseMixedSitting(localStorage.getItem(MIXED_KEY))?.results).toEqual([true]);
    // Next problem: hidden again.
    fireEvent.click(screen.getByRole('button', { name: 'Next problem' }));
    await flush();
    expect(heading()).toBe(`Problem 2 of ${s.items.length}`);
  });

  it('is on Today\'s planner as "Review: mixed", and in the palette', async () => {
    await masterThree();
    render(<App />);
    await flush();
    const link = await waitFor(() => {
      const a = [...document.querySelectorAll<HTMLAnchorElement>('a[href="#/mixed"]')].find((x) => x.textContent?.includes('Review: mixed'));
      expect(a).toBeDefined();
      return a as HTMLAnchorElement;
    });
    fireEvent.click(link);
    await flush();
    expect(route.value).toEqual({ view: 'mixed' });
    go({ view: 'today' });
    await flush();
    // Mastering topics may start a story scene, which holds the palette key; open it directly.
    await new Promise((r) => setTimeout(r, 50));
    paletteOpen.value = true;
    const opts = await waitFor(() => {
      const xs = [...document.querySelectorAll('.ds-cmd-res [role="option"]')].map((o) => o.textContent);
      expect(xs.length).toBeGreaterThan(0);
      return xs;
    });
    expect(opts).toContain('Start a mixed review');
    expect(opts).toContain('Climb the timed ladder');
    fireEvent.click([...document.querySelectorAll('.ds-cmd-res [role="option"]')].find((o) => o.textContent === 'Start a mixed review') as Element);
    await flush();
    expect(route.value).toEqual({ view: 'mixed' });
  });
});

describe('Today and the palette for the ladder', () => {
  it('Up next says what unlocks the first rung for a new learner', async () => {
    render(<App />);
    await flush();
    const row = await waitFor(() => {
      const el = document.querySelector('.d-ladder a.d-qlink');
      expect(el).not.toBeNull();
      return el as HTMLAnchorElement;
    });
    expect(row.textContent).toContain('First timed STEP question unlocks after 60 more topics mastered');
    expect(row.textContent).toContain('until then: lessons, practice, and review');
  });

  it('Up next offers the ladder\'s open rung, and the palette climbs it', async () => {
    await readyStep();
    render(<App />);
    await flush();
    const row = await waitFor(() => {
      const el = document.querySelector('.d-ladder a.d-qlink');
      expect(el).not.toBeNull();
      return el as HTMLAnchorElement;
    });
    expect(row.textContent).toContain('STEP ladder: STEP 2 2025, question 1');
    expect(row.textContent).toContain('One question · 30 min · timed ladder');
    expect(row.getAttribute('href')).toBe('#/ladder/step');
    await new Promise((r) => setTimeout(r, 50));
    paletteOpen.value = true;
    await waitFor(() => expect(document.querySelectorAll('.ds-cmd-res [role="option"]').length).toBeGreaterThan(0));
    fireEvent.click([...document.querySelectorAll('.ds-cmd-res [role="option"]')].find((o) => o.textContent === 'Climb the timed ladder') as Element);
    await flush();
    expect(route.value).toEqual({ view: 'ladder', exam: 'STEP' });
  });
});
