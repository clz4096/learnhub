/**
 * The standup screen, the voices, Today's standup line and the planner's block, the
 * settings in You, and the cohort's standing on the Story tab.
 */
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { IDBFactory } from 'fake-indexeddb';
import type { IdbFactoryLike } from '@learnhub/mastery';
import { CLASSMATES } from '@/model/cohort';
import { DEFAULT_COURSES, ensureSession, startLearner } from '@/model/learner';
import { parseRoute, route } from '@/model/route';
import { saveStandup as saveEntry } from '@/model/standupLog';
import { STANDUP_CFG_KEY, reloadStandup, standup } from '@/model/standupStore';
import { commit, init, setClock } from '@/model/store';
import { reloadStory } from '@/model/storyStore';
import { App } from '@/ui/App';
import { standupCalendarUrl } from '@/ui/cohort/CalendarLink';
import { pickVoices } from '@/ui/cohort/speech';
import { StandupView } from '@/ui/views/Standup';

// Monday 2026-10-05, 9:30 am in New York (EDT, UTC-4): before the 10:00 am standup.
const MON_930 = Date.UTC(2026, 9, 5, 13, 30);
// Saturday 2026-10-10, noon.
const SAT = Date.UTC(2026, 9, 10, 16, 0);

type Spoken = { text: string; pitch: number; rate: number; voice: unknown; onstart?: () => void; onend?: () => void };

function fakeSpeech(): { spoken: Spoken[]; cancelled: number } {
  const log = { spoken: [] as Spoken[], cancelled: 0 };
  class Utterance { text: string; pitch = 1; rate = 1; lang = ''; voice: unknown = null; onstart?: () => void; onend?: () => void; constructor(t: string) { this.text = t; } }
  (globalThis as Record<string, unknown>).SpeechSynthesisUtterance = Utterance;
  (globalThis as Record<string, unknown>).speechSynthesis = {
    getVoices: () => [{ name: 'Daniel', lang: 'en-GB' }, { name: 'Samantha', lang: 'en-US' }, { name: 'Thomas', lang: 'fr-FR' }],
    speak: (u: Spoken) => { log.spoken.push(u); },
    cancel: () => { log.cancelled++; },
  };
  return log;
}

function noSpeech(): void {
  delete (globalThis as Record<string, unknown>).speechSynthesis;
  delete (globalThis as Record<string, unknown>).SpeechSynthesisUtterance;
}

beforeEach(async () => {
  Element.prototype.scrollTo ??= () => {};
  localStorage.clear();
  localStorage.setItem('mastery.tour.v1', '1');
  reloadStandup();
  reloadStory();
  noSpeech();
  history.replaceState(null, '', '#/');
  route.value = parseRoute('#/');
  setClock(() => MON_930);
  await init(new IDBFactory() as unknown as IdbFactoryLike);
});
afterEach(() => {
  cleanup();
  noSpeech();
});

describe('the standup screen', () => {
  it('shows every classmate\'s update in order, with a portrait, and Albert\'s slot last', () => {
    render(<StandupView />);
    expect(screen.getByRole('heading', { name: 'Standup' })).toBeTruthy();
    expect(document.body.textContent).toContain('10:00 am · 15 minutes');
    expect(document.querySelector('.su-status')?.textContent).toBe('Starts at 10:00 am.');
    const rows = [...document.querySelectorAll('.su-row')];
    expect(rows).toHaveLength(7);
    for (const r of rows.slice(0, 6)) {
      expect(r.querySelector('svg.mono-art')).not.toBeNull();
      expect(r.textContent).toMatch(/Yesterday: .*Today: .*Blocked on: /);
    }
    expect(new Set(rows.slice(0, 6).map((r) => r.querySelector('b')?.textContent))).toEqual(new Set(CLASSMATES.map((c) => c.name)));
    expect(rows[6]?.textContent).toContain('Albert');
    expect(document.body.textContent).not.toMatch(/[–—]/);
  });

  it('counts Albert\'s update as given once the slot submits it, from the synced standup log', () => {
    render(<StandupView />);
    // No fallback button: the slot itself records the update.
    expect(screen.queryByRole('button', { name: 'I gave my update' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Type it' }));
    fireEvent.input(document.querySelector('textarea') as HTMLTextAreaElement, {
      target: { value: 'Yesterday I read about limits. Today I plan more limits. Nothing is blocking me.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit standup' }));
    expect(standup.value.attended).toEqual(['2026-10-05']);
    // Attendance is the log's, not the settings'.
    expect(localStorage.getItem(STANDUP_CFG_KEY) ?? '').not.toContain('attended');
    expect(document.querySelector('.su-status')?.textContent).toBe('You gave your update today.');
  });

  it('an entry synced from another device counts as attended', () => {
    saveEntry({ date: '2026-10-05', transcript: 'From the phone.', checkedAt: MON_930 - 60_000, flags: [], duration: 70 });
    reloadStandup();
    render(<StandupView />);
    expect(standup.value.attended).toEqual(['2026-10-05']);
    expect(document.querySelector('.su-status')?.textContent).toBe('You gave your update today.');
  });

  it('is not held on yom tov, and says which', () => {
    // Monday 2026-09-21, Yom Kippur, noon.
    setClock(() => Date.UTC(2026, 8, 21, 16));
    render(<StandupView />);
    expect(document.querySelector('.su-status')?.textContent).toBe('No standup today, Yom Kippur. The next is Tuesday, September 22, 10:00 am.');
  });

  it('offers Google Calendar first, then Apple Calendar', () => {
    render(<StandupView />);
    const options = [...document.querySelectorAll('.su-cal-opt > summary')].map((s) => s.textContent);
    expect(options).toEqual(['Google Calendar', 'Apple Calendar']);
    const google = document.querySelector('.su-cal-opt') as HTMLElement;
    expect(google.textContent).toContain('Next to Other calendars, click +, then From URL.');
    expect(google.textContent).toContain('Under Event notifications, add 10 minutes.');
    expect(google.textContent).toContain('iPhone Settings › Notifications › Google Calendar');
    expect(google.textContent).toContain('up to a day');
  });

  it('shows Google the https address of standup.ics under the app, and Copy writes it', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    try {
      render(<StandupView />);
      const want = new URL('standup.ics', document.baseURI).href;
      expect(want).toMatch(/^https?:\/\/.*\/standup\.ics$/);
      expect(standupCalendarUrl()).toBe(want);
      expect(standupCalendarUrl('https://x.github.io/learnhub/mastery/#/standup')).toBe('https://x.github.io/learnhub/mastery/standup.ics');
      expect((screen.getByRole('textbox', { name: 'Calendar address' }) as HTMLInputElement).value).toBe(want);
      fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
      expect(writeText).toHaveBeenCalledWith(want);
      await waitFor(() => expect(document.querySelector('.su-cal-copy [role="status"]')?.textContent).toBe('Copied'));
    } finally {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    }
  });

  it('when the clipboard is refused, says to copy the address by hand', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    render(<StandupView />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    await waitFor(() => expect(document.querySelector('.su-cal-copy [role="status"]')?.textContent).toContain('Select the address and copy it.'));
  });

  it('offers Apple Calendar the webcal link, with the iPhone alert note', () => {
    render(<StandupView />);
    const a = screen.getByRole('link', { name: 'Add standup to Apple Calendar' });
    expect(a.getAttribute('href')).toMatch(/^webcal:\/\/.*\/standup\.ics$/);
    expect(a.parentElement?.textContent).toContain('switch off Remove Alerts, or the alert won\'t fire');
  });

  it('on a day without one, shows the last standup and when the next is, and takes no update', () => {
    setClock(() => SAT);
    render(<StandupView />);
    expect(document.querySelector('.su-status')?.textContent).toBe('No standup today. The next is Monday, October 12, 10:00 am.');
    expect(document.querySelector('.su-list')?.getAttribute('aria-label')).toBe('Updates, Friday, October 9');
    expect(screen.queryByRole('button', { name: 'I gave my update' })).toBeNull();
  });

  it('cannot read aloud without speech synthesis, and says so', () => {
    render(<StandupView />);
    expect((screen.getByRole('button', { name: 'Play the standup' }) as HTMLButtonElement).disabled).toBe(true);
    expect(document.body.textContent).toContain('This browser cannot read aloud.');
  });

  it('reads the updates aloud in order, a voice and pitch per classmate, and Stop cancels', async () => {
    const log = fakeSpeech();
    render(<StandupView />);
    fireEvent.click(screen.getByRole('button', { name: 'Play the standup' }));
    expect(log.spoken).toHaveLength(6);
    const names = [...document.querySelectorAll('.su-row b')].slice(0, 6).map((b) => b.textContent?.split(' ')[0]);
    expect(log.spoken.map((u) => u.text.split('.')[0])).toEqual(names);
    expect(new Set(log.spoken.map((u) => u.pitch)).size).toBeGreaterThan(1);
    // The first speaker is highlighted when speech starts.
    log.spoken[0]?.onstart?.();
    await waitFor(() => expect(document.querySelector('.su-row.on')).not.toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(log.cancelled).toBeGreaterThanOrEqual(2);
    await waitFor(() => expect(document.querySelector('.su-row.on')).toBeNull());
    expect(screen.getByRole('button', { name: 'Play the standup' })).toBeTruthy();
  });

  it('never reads aloud while muted', () => {
    const log = fakeSpeech();
    render(<StandupView />);
    fireEvent.click(screen.getByRole('button', { name: 'Mute read aloud' }));
    expect(standup.value.muted).toBe(true);
    const play = screen.getByRole('button', { name: 'Play the standup' }) as HTMLButtonElement;
    expect(play.disabled).toBe(true);
    fireEvent.click(play);
    expect(log.spoken).toHaveLength(0);
  });
});

describe('voices', () => {
  it('give each classmate a different English voice while there are enough, preferred ones first', () => {
    const voices = [{ name: 'Daniel', lang: 'en-GB' }, { name: 'Samantha', lang: 'en-US' }, { name: 'Karen', lang: 'en-AU' }, { name: 'Amélie', lang: 'fr-CA' }];
    const m = pickVoices(voices, CLASSMATES);
    expect(m.get('marcus')?.name).toBe('Daniel');
    expect(m.get('rosa')?.name).toBe('Samantha');
    expect(m.get('wen')?.name).toBe('Karen');
    for (const v of m.values()) expect(v?.lang.startsWith('en')).toBe(true);
    expect(pickVoices([], CLASSMATES).get('marcus')).toBeNull();
  });
});

describe('the standup around the app', () => {
  async function withLearner(): Promise<void> {
    await commit(ensureSession(startLearner(MON_930, DEFAULT_COURSES, 60), MON_930));
  }

  it('Today says when it is, and the planner has its block at 10:00 am, linked to the standup', async () => {
    await withLearner();
    render(<App />);
    const line = await waitFor(() => document.querySelector('.ds-standupline') as HTMLAnchorElement);
    expect(line.textContent).toContain('Standup at 10:00 am');
    expect(line.getAttribute('href')).toBe('#/standup');
    const meet = document.querySelector('.d-tl li.meet') as HTMLElement;
    expect(meet.querySelector('.t')?.textContent).toBe('10:00 am');
    expect(meet.querySelector('a')?.getAttribute('href')).toBe('#/standup');
    expect(meet.querySelector('.d-check')).toBeNull();
    fireEvent.click(line);
    expect(route.value).toEqual({ view: 'standup' });
    await screen.findByRole('heading', { name: 'Standup' });
  });

  it('You sets the time and turns it off; the planner follows', async () => {
    await withLearner();
    history.replaceState(null, '', '#/progress');
    route.value = parseRoute('#/progress');
    render(<App />);
    const sel = await screen.findByLabelText('Standup time') as HTMLSelectElement;
    expect(sel.value).toBe('600');
    expect([...sel.options].map((o) => o.textContent)).toContain('11:30 am');
    fireEvent.change(sel, { target: { value: '690' } });
    expect(standup.value.minutes).toBe(690);
    fireEvent.click(screen.getByRole('button', { name: 'Off' }));
    expect(standup.value.enabled).toBe(false);
    expect(JSON.parse(localStorage.getItem(STANDUP_CFG_KEY) as string)).toMatchObject({ minutes: 690, enabled: false });
    expect(screen.getByRole('link', { name: 'Add standup to Apple Calendar' }).getAttribute('href')).toMatch(/^webcal:.*standup\.ics$/);
  });

  it('the Story tab shows where Albert stands in the cohort, next to the ratings', async () => {
    await withLearner();
    history.replaceState(null, '', '#/story');
    route.value = parseRoute('#/story');
    render(<App />);
    const card = await waitFor(() => document.querySelector('.story-cohort') as HTMLElement);
    expect(card.querySelectorAll('.co-list li')).toHaveLength(7);
    expect(card.querySelector('li.me')?.textContent).toContain('Albert (you)');
    expect(card.querySelector('.ds-sect-h span')?.textContent).toBe('7th of 7');
  });
});
