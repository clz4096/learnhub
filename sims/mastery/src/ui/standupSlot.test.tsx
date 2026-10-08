/**
 * The standup slot: record with a fake MediaRecorder, live words from a fake speech
 * recognizer (and the typed fallback without one), the check against the record, the log
 * entry, and "Done for today".
 */
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { IDBFactory } from 'fake-indexeddb';
import type { IdbFactoryLike } from '@learnhub/mastery';
import { DEFAULT_COURSES, completeLesson, startLearner } from '@/model/learner';
import { STANDUP_KEY, loadStandups, saveStandup } from '@/model/standupLog';
import { commit, init, setClock } from '@/model/store';
import { storedValues } from '@/sync/local';
import { StandupSlot } from '@/ui/StandupSlot';

const T0 = Date.UTC(2026, 9, 7, 13, 0); // 9:00 am in New York
const DATE = '2026-10-07';
const H = 60 * 60 * 1000;

// ---------------------------------------------------------------- fakes

class FakeRecorder {
  static made: FakeRecorder[] = [];
  static isTypeSupported = (m: string): boolean => m === 'audio/mp4';
  state: 'inactive' | 'recording' = 'inactive';
  mimeType: string;
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  constructor(_s: unknown, o?: { mimeType?: string }) {
    this.mimeType = o?.mimeType ?? '';
    FakeRecorder.made.push(this);
  }
  start(): void {
    this.state = 'recording';
  }
  stop(): void {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['abc'], { type: this.mimeType }) });
    this.onstop?.();
  }
}

class FakeRecognition {
  static last: FakeRecognition | null = null;
  continuous = false;
  interimResults = false;
  lang = '';
  onresult: ((e: unknown) => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  running = false;
  starts = 0;
  start(): void {
    this.running = true;
    this.starts++;
    FakeRecognition.last = this;
  }
  stop(): void {
    this.running = false;
  }
  abort(): void {
    this.running = false;
  }
  /** The recognizer hears `text`; one result, final or not, at index `i` of this session. */
  say(text: string, final: boolean, i = 0): void {
    const results: unknown[] = [];
    results[i] = { isFinal: final, length: 1, 0: { transcript: text } };
    this.onresult?.({ resultIndex: i, results: Object.assign(results, { length: i + 1 }) });
  }
}

const tracks = { stop: vi.fn() };
const getUserMedia = vi.fn(async () => ({ getTracks: () => [tracks] }) as unknown as MediaStream);

function withRecorder(): void {
  vi.stubGlobal('MediaRecorder', FakeRecorder);
  Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true });
}
function withRecognition(): void {
  vi.stubGlobal('webkitSpeechRecognition', FakeRecognition);
}

beforeEach(async () => {
  localStorage.clear();
  FakeRecorder.made = [];
  FakeRecognition.last = null;
  getUserMedia.mockClear();
  tracks.stop.mockClear();
  setClock(() => T0);
  await init(new IDBFactory() as unknown as IdbFactoryLike);
  // The sequences lesson passed an hour ago; its Cambridge problem is still open.
  await commit(completeLesson(startLearner(T0 - 2 * 24 * H, DEFAULT_COURSES, 60), 'pre.sequences', true, T0 - H, null, 30));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
});

const textarea = (): HTMLTextAreaElement => document.querySelector('textarea') as HTMLTextAreaElement;
const flags = (): string[] => [...document.querySelectorAll('.ds-su-flags li')].map((li) => li.textContent ?? '');

async function startRecording(): Promise<void> {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Record' }));
  });
  await screen.findByRole('timer');
}

describe('StandupSlot', () => {
  it('records with live words, stops early, checks against the record, and logs the entry', async () => {
    withRecorder();
    withRecognition();
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'], now: T0 });
    const onDone = vi.fn();
    render(<StandupSlot date={DATE} onDone={onDone} />);
    expect(document.body.textContent).toContain('the browser asks to use the microphone');
    expect(document.body.textContent).toContain('never uploaded');
    await startRecording();
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(FakeRecorder.made[0]?.mimeType).toBe('audio/mp4');
    expect(document.querySelector('.ds-su-time')?.textContent).toBe('0:00');
    const r = FakeRecognition.last!;
    expect(r.continuous && r.interimResults).toBe(true);
    act(() => r.say('Yesterday I finished sequences.', true));
    act(() => r.say('and some', false, 1));
    expect(document.querySelector('.ds-su-live')?.textContent).toContain('Yesterday I finished sequences. and some');
    // A pause ends recognition; it starts again while recording.
    act(() => r.onend?.());
    expect(r.starts).toBe(2);
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(document.querySelector('.ds-su-time')?.textContent).toBe('0:30');
    fireEvent.click(screen.getByRole('button', { name: 'Stop early' }));
    expect(tracks.stop).toHaveBeenCalled();
    expect(r.running).toBe(false);
    expect(textarea().value).toBe('Yesterday I finished sequences. and some');
    expect(flags()).toEqual([
      'Sequences: said finished, but its Cambridge problem is still open.',
      'Say what is planned for today.',
      'Say what is blocking progress, or that nothing is.',
    ]);
    expect(document.body.textContent).toContain('Passed the lesson on Sequences and nth term rules.');
    fireEvent.input(textarea(), { target: { value: 'Yesterday I finished sequences. Today I will do its Cambridge problem. Nothing is blocking me.' } });
    expect(flags()).toEqual(['Sequences: said finished, but its Cambridge problem is still open.']);
    fireEvent.click(screen.getByRole('button', { name: 'Submit standup' }));
    expect(onDone).toHaveBeenCalledTimes(1);
    const e = loadStandups()[DATE];
    expect(e).toEqual({
      date: DATE, transcript: 'Yesterday I finished sequences. Today I will do its Cambridge problem. Nothing is blocking me.',
      checkedAt: T0, flags: ['Sequences: said finished, but its Cambridge problem is still open.'], duration: 30,
    });
    // It rides in the learner envelope's values; the audio does not.
    expect(storedValues().standup[DATE]).toEqual(e);
    expect(localStorage.getItem(STANDUP_KEY)).not.toContain('abc');
    expect(screen.getByRole('heading', { name: 'Done for today' })).toBeTruthy();
  });

  it('stops by itself at 1:30', async () => {
    withRecorder();
    withRecognition();
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'], now: T0 });
    render(<StandupSlot date={DATE} onDone={() => {}} />);
    await startRecording();
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(screen.getByRole('button', { name: 'Stop' })).toBeTruthy();
    act(() => { vi.advanceTimersByTime(31_000); });
    expect(screen.queryByRole('timer')).toBeNull();
    expect(document.body.textContent).toContain('Recorded 1:30');
    expect(FakeRecorder.made[0]?.state).toBe('inactive');
  });

  it('without speech recognition, records and lets him type what he said', async () => {
    withRecorder();
    const onDone = vi.fn();
    render(<StandupSlot date={DATE} onDone={onDone} />);
    await startRecording();
    expect(document.body.textContent).toContain('Live transcription is not available in this browser');
    fireEvent.click(screen.getByRole('button', { name: 'Stop early' }));
    expect(textarea().value).toBe('');
    expect(screen.getByRole('button', { name: 'Submit standup' })).toHaveProperty('disabled', true);
    fireEvent.input(textarea(), { target: { value: 'Yesterday I read about limits. Today I plan more limits. Stuck on epsilon proofs.' } });
    expect(document.body.textContent).toContain('Matches your record. Nothing missing.');
    fireEvent.click(screen.getByRole('button', { name: 'Submit standup' }));
    expect(onDone).toHaveBeenCalled();
    expect(loadStandups()[DATE]?.flags).toEqual([]);
  });

  it('a blocked microphone explains how to allow it and falls back to typing', async () => {
    withRecorder();
    getUserMedia.mockRejectedValueOnce(Object.assign(new Error('denied'), { name: 'NotAllowedError' }));
    render(<StandupSlot date={DATE} onDone={() => {}} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Record' }));
    });
    expect((await screen.findByRole('alert')).textContent).toContain('microphone is blocked');
    expect(textarea()).toBeTruthy();
  });

  it('a browser that cannot record offers typing only', () => {
    render(<StandupSlot date={DATE} onDone={() => {}} />);
    expect(screen.queryByRole('button', { name: 'Record' })).toBeNull();
    expect(document.body.textContent).toContain('cannot record audio here');
    fireEvent.click(screen.getByRole('button', { name: 'Type it' }));
    expect(textarea()).toBeTruthy();
  });

  it('shows "Done for today" with his entry when the date is already submitted', () => {
    withRecorder();
    saveStandup({ date: DATE, transcript: 'All done.', checkedAt: T0 - 2 * H, flags: ['Say what is planned for today.'], duration: 72 });
    const onDone = vi.fn();
    render(<StandupSlot date={DATE} onDone={onDone} />);
    expect(screen.getByRole('heading', { name: 'Done for today' })).toBeTruthy();
    expect(document.body.textContent).toContain('All done.');
    expect(document.body.textContent).toContain('Submitted at 7:00 am');
    expect(document.body.textContent).toContain('1:12 recorded');
    expect(flags()).toEqual(['Say what is planned for today.']);
    expect(screen.queryByRole('button', { name: 'Record' })).toBeNull();
    expect(onDone).not.toHaveBeenCalled();
  });
});
