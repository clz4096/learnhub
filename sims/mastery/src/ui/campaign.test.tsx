/**
 * The Cambridge Entry campaign end to end in the app: the nav, choosing the route, sitting
 * a paper in exam mode (TMUA checked by the app, STEP marked through supervision), the
 * interview packet, the letters with Euclid College's documents, and the report with its
 * cited figures.
 */
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/preact';
import { IDBFactory } from 'fake-indexeddb';
import type { IdbFactoryLike } from '@learnhub/mastery';
import * as adm from '@learnhub/content/admissions';
import { newCampaign, type Campaign } from '@/model/campaign';
import { CAMPAIGN_KEY, campaign, reloadCampaign, saveCampaign } from '@/model/campaignStore';
import { saveLadder } from '@/model/ladderStore';
import { DEFAULT_COURSES, ensureSession, startLearner } from '@/model/learner';
import { go, hrefOf, parseRoute, route, type Route } from '@/model/route';
import { commit, flush, init, setClock } from '@/model/store';
import { App } from '@/ui/App';
import { clock } from '@/ui/views/Paper';
import { readyFor } from '@/test/ready';

const T0 = new Date(2026, 9, 5, 9, 0).getTime();
let t = T0;
const heading = (): string | null | undefined => document.querySelector('main h1')?.textContent;
const navLabels = (): (string | null)[] => [...document.querySelectorAll('nav.ds-nav a.ds-tab .ds-tab-l')].map((a) => a.textContent);
const DASH = /[–—]/;

beforeEach(async () => {
  Element.prototype.scrollTo ??= () => {};
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('mastery.tour.v1', '1');
  reloadCampaign();
  history.replaceState(null, '', '#/');
  route.value = parseRoute('#/');
  t = T0;
  setClock(() => t);
  await init(new IDBFactory() as unknown as IdbFactoryLike);
  await commit(ensureSession(startLearner(T0, DEFAULT_COURSES, 60), T0));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('routes', () => {
  const all: Route[] = [{ view: 'campaign' }, { view: 'report' }, { view: 'letters' }, { view: 'paper', paperId: 'edx-9fm0-3a-2024' }];
  for (const r of all) it(`round-trips ${hrefOf(r)}`, () => expect(parseRoute(hrefOf(r))).toEqual(r));
  it('sends a malformed paper link to the campaign', () => {
    expect(parseRoute('#/paper')).toEqual({ view: 'campaign' });
    expect(parseRoute('#/paper/<x>')).toEqual({ view: 'campaign' });
  });
});

describe('the campaign screen', () => {
  it('is in the navigation, starts with the route choice, and saves the campaign in this browser', async () => {
    render(<App />);
    expect(navLabels()).toContain('Admission');
    fireEvent.click(document.querySelector('nav.ds-nav a[data-nav="admission"]') as Element);
    expect(location.hash).toBe('#/campaign');
    expect(heading()).toBe('Cambridge Entry');
    // The disclaimer line is gone from the app (the owner's decision); simulated letters still say what they are.
    expect(document.body.textContent).not.toMatch(/Not affiliated with the University of Cambridge/);
    fireEvent.click(screen.getByRole('button', { name: 'Computer Science' }));
    await waitFor(() => expect(document.querySelector('.ds-rail li[aria-current="step"]')).not.toBeNull());
    // The heading is the entry the learner is on course for; acts are explained in one line.
    expect(heading()).toMatch(/^October 20\d\d$/);
    expect(document.querySelector('.ds-actsnote')?.textContent).toBe('Five acts: the real steps to a Cambridge place, each finished by doing the work.');
    // Acts, Papers, Results, and Letters.
    expect([...document.querySelectorAll('nav.ds-subtabs a')].map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      ['Acts', '#/campaign'], ['Papers', '#/papers'], ['Results', '#/report'], ['Letters', '#/letters'],
    ]);
    expect(screen.getByRole('heading', { name: 'Act I: School exams' })).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(CAMPAIGN_KEY) as string).route).toBe('cs');
    // Act I's chapters are the course lessons until the book is restructured, and the UI says so.
    expect(screen.getByText(/Course lessons mastered/)).toBeTruthy();
    // The status line: route, college, and whether the entry is on course.
    expect(document.querySelector('.ds-admission > .ds-meta')?.textContent).toMatch(/^Computer Science · college not chosen · /);
    // The acts as a rail with Roman numerals: Act I is the current one, with why it is there; matriculation follows.
    const acts = [...document.querySelectorAll('ol.ds-rail > li')];
    expect(acts.map((li) => li.querySelector('.ds-rn')?.textContent)).toEqual(['I', 'II', 'III', 'IV', 'V', '∎']);
    expect(acts[0]?.getAttribute('aria-current')).toBe('step');
    expect(acts[0]?.querySelector('.ds-why')?.textContent).toBe('Cambridge does not accept the GED, and mature applicants need recent study at a high level.');
    expect(acts[1]?.querySelector('.ds-why')).toBeNull();
    // The calendar: 2028 entry at the earliest, dates labelled as estimates.
    expect(document.querySelector('.c-entry')?.textContent).toMatch(/On course for October 2028 entry|Slipped to October 20\d\d entry/);
    expect(screen.getByText(/2028 dates are not published/)).toBeTruthy();
    // The effects table and the stats with no data shown as none.
    expect(screen.getByText(/A daily timed drill/)).toBeTruthy();
    expect(document.querySelector('.c-stat .v')?.textContent).toBeDefined();
    expect(document.querySelector('main')?.textContent).not.toMatch(DASH);
  });

  it('switches the route until Act III and lists the real colleges, Hughes Hall unverified', async () => {
    saveCampaign(newCampaign('maths', T0));
    go({ view: 'campaign' });
    render(<App />);
    await waitFor(() => expect(document.querySelector('.ds-rail li[aria-current="step"]')).not.toBeNull());
    fireEvent.click(within(screen.getByRole('group', { name: 'Route' })).getByRole('button', { name: 'Computer Science' }));
    expect(campaign.value?.route).toBe('cs');
    const college = screen.getByRole('combobox', { name: 'College' }) as HTMLSelectElement;
    expect([...college.options].map((o) => o.textContent)).toEqual(['Not chosen', 'St Edmund\'s', 'Wolfson', 'Hughes Hall (unverified)']);
    fireEvent.change(college, { target: { value: 'st-edmunds' } });
    expect(campaign.value?.college).toBe('st-edmunds');
    expect(screen.getAllByText(/A short task on the day/).length).toBeGreaterThan(0);
    // The application opens in Act III.
    expect((screen.getByRole('button', { name: 'File the application' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('copies an interview packet in the college\'s format and records the mark out of 20', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    saveCampaign({ ...newCampaign('maths', T0), college: 'hughes-hall' });
    go({ view: 'campaign' });
    render(<App />);
    await waitFor(() => expect(document.querySelector('.ds-rail li[aria-current="step"]')).not.toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'Copy interview packet' }));
    const text = (writeText.mock.calls[0] as unknown as [string])[0];
    expect(text).toContain('LEARNHUB MOCK INTERVIEW v1');
    expect(text).toContain('Usually 2 of 20 to 30 minutes (unverified)');
    await screen.findByText(/Copied\./);
    const mark = screen.getByRole('spinbutton', { name: 'Mark out of 20' });
    fireEvent.input(mark, { target: { value: '21' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('alert').textContent).toContain('0 to 20');
    fireEvent.input(mark, { target: { value: '9' } });
    fireEvent.input(screen.getByRole('textbox', { name: 'Notes' }), { target: { value: 'Quiet when stuck' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(campaign.value?.interviews[0]).toMatchObject({ shape: 'pre-reading', mark: 9, notes: 'Quiet when stuck', college: 'hughes-hall' });
    // Interview 45 is below 50: a second mock is scheduled.
    await screen.findByText(/a second mock is scheduled before Act V/);
  });
});

describe('exam mode', () => {
  it('runs a TMUA paper to the clock with no pause, then checks the answers against the official key', async () => {
    saveCampaign(newCampaign('cs', T0));
    go({ view: 'paper', paperId: 'tmua-2016-p1' });
    render(<App />);
    await screen.findByRole('heading', { name: 'TMUA 2016 Paper 1' });
    expect(screen.getByText('75 minutes')).toBeTruthy();
    expect((screen.getByRole('link', { name: 'the official PDF' }) as HTMLAnchorElement).href).toContain('TMUA-2016-paper-1.pdf');
    fireEvent.click(screen.getByRole('button', { name: 'Start the clock' }));
    expect(screen.getByRole('timer').textContent).toBe('1:15:00');
    expect(screen.queryByRole('button', { name: /pause/i })).toBeNull();
    t = T0 + 80 * 60_000;
    fireEvent.click(screen.getByRole('button', { name: 'Finish and mark' }));
    const key = adm.tmuaKey(2016, 1) as string;
    const selects = screen.getAllByRole('combobox').filter((s) => /^Q\d+$/.test(s.closest('label')?.querySelector('span')?.textContent ?? ''));
    expect(selects).toHaveLength(20);
    selects.slice(0, 15).forEach((s, i) => fireEvent.change(s, { target: { value: key[i] } }));
    fireEvent.click(screen.getByRole('button', { name: 'Check my answers' }));
    await screen.findByText('15 / 20');
    expect(screen.getByText(/80 of 75 minutes/)).toBeTruthy();
  });

  it('marks a STEP paper through supervision: the packet, the marks per question, best six; the report grades it among real candidates', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    saveCampaign(newCampaign('maths', T0));
    go({ view: 'paper', paperId: 'step-2019-2' });
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Start the clock' }));
    t = T0 + 170 * 60_000;
    fireEvent.click(screen.getByRole('button', { name: 'Finish and mark' }));
    fireEvent.click(screen.getByRole('button', { name: 'Copy for supervision' }));
    expect((writeText.mock.calls[0] as unknown as [string])[0]).toContain('PAPER: step-2019-2');
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs).toHaveLength(12);
    [20, 20, 20, 1, 0, 0, 5].forEach((m, i) => fireEvent.input(inputs[i] as HTMLElement, { target: { value: String(m) } }));
    expect(screen.getByText(/Best 6 count: 66 of 120/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save the marks' }));
    await screen.findByText('66 / 120');

    fireEvent.click(screen.getByRole('link', { name: 'report' }));
    await screen.findByRole('heading', { name: 'Results report' });
    expect(screen.getAllByText('Grade 2').length).toBeGreaterThan(0);
    const share = Math.round(100 * adm.stepPercentile(2019, 'STEP 2', 66));
    expect(screen.getByText(new RegExp(`${share}% of that year's`))).toBeTruthy();
    expect(screen.getByText(/Explanation of results for STEP 2019/)).toBeTruthy();
    expect(screen.getByText(/grade 2 on the 2019 paper \(boundary for grade 1: 68\)/)).toBeTruthy();
    expect(screen.getByText('12.7%')).toBeTruthy();
    expect(screen.getByText(/FOI-2026-413/)).toBeTruthy();
    expect(document.querySelector('main')?.textContent).not.toMatch(DASH);
  });

  it('keeps one paper running at a time', async () => {
    const c: Campaign = { ...newCampaign('maths', T0), sittings: [{ id: 'x', paperId: 'step-2020-3', act: 1, startedAt: T0, finishedAt: null }] };
    saveCampaign(c);
    go({ view: 'paper', paperId: 'tmua-2017-p2' });
    render(<App />);
    await screen.findByText(/Another paper is running/);
    expect(screen.queryByRole('button', { name: 'Start the clock' })).toBeNull();
  });

  it('refuses to start a campaign paper while a ladder rung is running, as the ladder refuses the reverse', async () => {
    saveCampaign(newCampaign('cs', T0));
    saveLadder([{ id: `tmua-2016-p1/question/1@${T0}`, paperId: 'tmua-2016-p1', rung: 'question', questions: [1], startedAt: T0, finishedAt: null }]);
    go({ view: 'paper', paperId: 'tmua-2017-p2' });
    render(<App />);
    await screen.findByText(/on the TMUA ladder is running/);
    expect(screen.queryByRole('button', { name: 'Start the clock' })).toBeNull();
    expect(screen.getByRole('link', { name: 'the timed ladder' }).getAttribute('href')).toBe(hrefOf({ view: 'ladder', exam: 'TMUA' }));
    expect(campaign.value?.sittings).toEqual([]);
    saveLadder([]);
  });

  it('formats the clock', () => {
    expect(clock(75 * 60_000)).toBe('1:15:00');
    expect(clock(59_500)).toBe('1:00');
    expect(clock(-5)).toBe('0:00');
  });
});

describe('the day planner', () => {
  it('a new learner gets no timed paper on Today, only what unlocks the first timed question', async () => {
    saveCampaign(newCampaign('cs', T0));
    render(<App />);
    await screen.findAllByText(/^First timed A level question unlocks after \d+ more topics mastered/);
    expect(document.querySelector('.ds-unlock')?.textContent).toMatch(/^First timed A level question unlocks after 57 more topics mastered \(57 of the 95 in its syllabus\)\.$/);
    await flush();
    expect(screen.queryAllByRole('link', { name: /Timed (paper|ladder):/ })).toEqual([]);
    expect(document.querySelector('a[href^="#/paper/"]')).toBeNull();
  });

  it('with the topics mastered, Today holds the one-question rung, linked to the ladder', async () => {
    await commit(ensureSession(readyFor(startLearner(T0 - 30 * 86_400_000, DEFAULT_COURSES, 60), 'A level', T0), T0));
    saveCampaign(newCampaign('cs', T0));
    render(<App />);
    const links = await screen.findAllByRole('link', { name: /Timed ladder: 9MA0\/01 June 2024: .*, question 1/ });
    for (const l of links) expect(l.getAttribute('href')).toBe('#/ladder/a-level');
    expect(screen.queryByText(/^First timed .* question unlocks/)).toBeNull();
  });
});

describe('letters and the report', () => {
  it('delivers the application letter once, marked simulated, without a signature', async () => {
    saveCampaign({ ...newCampaign('maths', T0), college: 'wolfson', applicationFiledAt: T0 });
    go({ view: 'campaign' });
    render(<App />);
    await screen.findByText('Application received');
    await waitFor(() => expect(campaign.value?.letters.map((l) => l.id)).toEqual(['received']));
    // The campaign lists it; the Letters tab shows it in full.
    fireEvent.click(screen.getByRole('link', { name: 'Application received' }));
    expect(location.hash).toBe('#/letters');
    await screen.findByRole('heading', { name: 'Application received' });
    expect(screen.getAllByText('Simulated').length).toBe(1);
    expect(screen.getAllByText(/Mathematics at Wolfson/).length).toBeGreaterThan(0);
    expect(campaign.value?.letters.map((l) => l.id)).toEqual(['received']);
    await flush();
  });

  it('the Letters tab shows the seal, and the offer and certificate as labelled examples before their milestones', async () => {
    saveCampaign(newCampaign('maths', T0));
    go({ view: 'letters' });
    render(<App />);
    await screen.findByText(/None yet\. The first arrives/);
    expect(heading()).toBe('Letters');
    // The seal at the top, and on each document; the arms heading each document.
    const seal = document.querySelector('main svg.letters-seal') as SVGElement;
    expect(seal.getAttribute('role')).toBe('img');
    expect(seal.getAttribute('aria-label')).toBe('Seal of Euclid College');
    expect(screen.getAllByRole('img', { name: 'Seal of Euclid College' })).toHaveLength(3);
    expect(screen.getAllByRole('img', { name: 'Arms of the University of New Cambridge' })).toHaveLength(2);
    const offer = screen.getByRole('article', { name: 'Offer letter' });
    expect(offer.closest('.doc')?.classList.contains('doc-example')).toBe(true);
    expect(offer.textContent).toContain('EC-28-04142');
    expect(screen.getByText(/Your own offer letter is written here from your results when Act IV/)).toBeTruthy();
    const cert = screen.getByRole('article', { name: 'Certificate' });
    expect(cert.closest('.doc')?.classList.contains('doc-example')).toBe(true);
    expect(cert.textContent).toContain('Albert Burt');
    expect(cert.textContent).toContain('Universitas Novae Cantabrigiae');
    expect(cert.textContent).toContain('Mathematica Computationali');
    expect(cert.textContent).toContain('Ada Lambda');
    expect(cert.textContent).toContain('Registrarius Collegii');
    expect(cert.textContent).toContain('Q. E. Demonstrandum');
    expect(cert.textContent).toContain('Magister Collegii');
    expect(cert.textContent).toContain('Documentum simulatum · ludus studiorum · non gradus academicus');
    expect(cert.querySelector('svg.arms use')?.getAttribute('href')).toBe('#euclid-armsUni');
    expect(cert.querySelector('svg.cseal use')?.getAttribute('href')).toBe('#euclid-seal');
    expect(document.querySelector('main')?.textContent).not.toMatch(DASH);
  });

  it('once the offer arrives, the offer letter is written from the campaign', async () => {
    saveCampaign({ ...newCampaign('maths', T0), college: 'wolfson', applicationFiledAt: T0, letters: [{ id: 'offer', at: T0 }] });
    go({ view: 'letters' });
    render(<App />);
    const offer = await screen.findByRole('article', { name: 'Offer letter' });
    expect(offer.closest('.doc')?.classList.contains('doc-example')).toBe(false);
    expect(screen.queryByText(/Your own offer letter is written here/)).toBeNull();
    expect(offer.textContent).toContain('5 October 2026');
    expect(offer.textContent).toContain('Mathematics (Tripos)');
    expect(offer.textContent).toContain('University of New Cambridge');
    expect(offer.textContent).toContain('CollegeEuclid College');
    expect(offer.textContent).toContain('Conditional offer of admission: Mathematics');
    expect(offer.textContent).toContain('University of New Cambridge · Euclid College · Office of Undergraduate Admissions');
    expect(offer.textContent).toContain('Dr E. Noether-Gauss');
    expect([...offer.querySelectorAll('ol.numbered li')].map((li) => li.textContent)).toEqual([
      'A* in A level Mathematics', 'A* in A level Further Mathematics', 'A in A level Computer Science',
      'Grade 1 in Sixth Term Examination Paper (STEP) Mathematics 2', 'Grade 1 in Sixth Term Examination Paper (STEP) Mathematics 3',
    ]);
    expect([...offer.querySelectorAll('ol.numbered li b')].map((b) => b.textContent)).toEqual(['A*', 'A*', 'A', 'Grade 1', 'Grade 1']);
    expect(offer.querySelector('.close svg.lseal use')?.getAttribute('href')).toBe('#euclid-seal');
    expect(offer.textContent).toContain('Simulated document. Not issued by any real university or college.');
    await flush();
  });

  it('the Computer Science route\'s offer letter has no STEP conditions', async () => {
    saveCampaign({ ...newCampaign('cs', T0), college: 'wolfson', applicationFiledAt: T0, letters: [{ id: 'offer', at: T0 }] });
    go({ view: 'letters' });
    render(<App />);
    const offer = await screen.findByRole('article', { name: 'Offer letter' });
    expect(offer.textContent).toContain('Computer Science (Tripos)');
    const conditions = [...offer.querySelectorAll('ol.numbered li')].map((li) => li.textContent ?? '');
    expect(conditions.length).toBeGreaterThan(0);
    expect(conditions.some((x) => x.includes('STEP'))).toBe(false);
    await flush();
  });

  it('with no campaign, the report says there is nothing yet', async () => {
    go({ view: 'report' });
    render(<App />);
    expect(heading()).toBe('Results report');
    expect(screen.getByText(/Nothing to report yet/)).toBeTruthy();
  });
});
