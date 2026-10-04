import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/preact';
import { App } from '@/ui/App';
import { inProcessClient } from '@/ui/testClient';
import { cloneConfig } from '@/engine';
import { defaultParams } from '@/workloads/types';
import { workloadById } from '@/workloads';
import * as S from '@/ui/state';
import { HUB_PROGRESS_KEY, PROGRESS_KEY, freshProgress, hubSummary, loadProgress, parseProgress, progress, saveProgress } from '@/ui/modes/progress';
import { LESSONS } from '@/ui/modes/lessons';

const WAIT = { timeout: 5000 };

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
});

function setWidth(w: number): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: w });
  S.layout.value = S.layoutFor(w);
}

beforeEach(() => {
  localStorage.clear();
  progress.value = freshProgress();
  S.presetId.value = S.DEFAULT_PRESET.id;
  S.config.value = cloneConfig(S.DEFAULT_PRESET.config);
  S.workloadId.value = S.DEFAULT_WORKLOAD;
  S.params.value = defaultParams(workloadById(S.DEFAULT_WORKLOAD)!);
});

afterEach(() => {
  cleanup();
  S.mode.value = 'free';
  S.selection.value = null;
  S.phoneTab.value = 'view';
  vi.restoreAllMocks();
});

async function ready(): Promise<void> {
  await waitFor(() => expect(S.caches.value.length).toBeGreaterThan(0), WAIT);
}

describe('Guided mode', () => {
  it('drives the app through a lesson and persists progress', async () => {
    setWidth(1280);
    render(<App client={inProcessClient()} />);
    await ready();
    fireEvent.click(screen.getByRole('radio', { name: 'Guided' }));
    expect(screen.getByRole('heading', { name: '1. Tag, set, and offset' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Step 1: Load' }));
    await waitFor(() => expect(S.params.value).toMatchObject({ N: 256, passes: 1 }), WAIT);
    await waitFor(() => expect((screen.getByRole('button', { name: 'Step 2: Step' }) as HTMLButtonElement).disabled).toBe(false), WAIT);
    expect(S.current.value).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Step 2: Step' }));
    await waitFor(() => expect(S.current.value?.index).toBe(0), WAIT);
    expect(S.current.value?.addr).toBe(0x10000000);

    fireEvent.click(screen.getByRole('button', { name: 'Step 4: Step 15' }));
    await waitFor(() => expect(S.current.value?.index).toBe(15), WAIT);

    fireEvent.click(screen.getByRole('button', { name: 'Step 6: Run to end' }));
    await waitFor(() => expect(S.done.value).toBe(true), WAIT);
    // The lesson's claim, seen in the live app.
    await waitFor(() => expect(S.stats.value?.levels['L1d']?.misses).toBe(16), WAIT);

    await waitFor(() => expect(JSON.parse(localStorage.getItem(PROGRESS_KEY)!).step['address-breakdown']).toBe(5), WAIT);
  });

  it('checks an answer, explains it, and marks the lesson done', async () => {
    setWidth(1280);
    render(<App client={inProcessClient()} />);
    S.mode.value = 'guided';
    await ready();
    fireEvent.click(await screen.findByRole('radio', { name: 'The tag.' }));
    expect(screen.getByText('Not quite.')).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: 'Only the offset.' }));
    expect(screen.getByText('Correct.')).toBeTruthy();
    expect(screen.getByRole('option', { name: /1\. Tag, set, and offset \(done\)/ })).toBeTruthy();
    expect(loadProgress().answer['address-breakdown']).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: /Next lesson/ }));
    expect(screen.getByRole('heading', { name: '2. Hits and spatial locality' })).toBeTruthy();
    expect(loadProgress().lesson).toBe('spatial-locality');
  });

  it('loads a setup with a changed L1d and runs it to the end', async () => {
    setWidth(1280);
    progress.value = { ...freshProgress(), lesson: 'conflict' };
    render(<App client={inProcessClient()} />);
    S.mode.value = 'guided';
    await ready();
    fireEvent.click(await screen.findByRole('button', { name: 'Step 3: Load and run' }));
    await waitFor(() => expect(S.done.value && S.config.value.l1d.ways === 16).toBe(true), WAIT);
    await waitFor(() => expect(S.stats.value?.levels['L1d']?.conflict).toBe(0), WAIT);
    expect(S.stats.value?.levels['L1d']?.misses).toBe(32);
  });
});

describe('progress storage', () => {
  it('writes the learnhub summary with lessons done out of the total', () => {
    const p = freshProgress();
    const lesson = LESSONS[0]!;
    p.answer[lesson.id] = lesson.question.choices.findIndex((c) => c.correct);
    p.answer[LESSONS[1]!.id] = LESSONS[1]!.question.choices.findIndex((c) => !c.correct);
    saveProgress(p);
    const s = JSON.parse(localStorage.getItem(HUB_PROGRESS_KEY)!);
    expect(s).toMatchObject({ done: 1, total: LESSONS.length });
    expect(Number.isNaN(Date.parse(s.updated))).toBe(false);
    expect(hubSummary(freshProgress()).done).toBe(0);
  });

  it('survives bad JSON, unknown lessons, and a throwing localStorage', () => {
    expect(parseProgress('{not json')).toEqual(freshProgress());
    expect(parseProgress(JSON.stringify({ lesson: 'nope', step: { stride: 2, nope: 1, conflict: -1 }, answer: { stride: 'x' } })))
      .toEqual({ lesson: freshProgress().lesson, step: { stride: 2 }, answer: {} });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(loadProgress()).toEqual(freshProgress());
    expect(() => saveProgress(freshProgress())).not.toThrow();
  });
});

describe('Explain mode', () => {
  it('explains a cache, a slot, the current access, and a metrics row', async () => {
    setWidth(1280);
    render(<App client={inProcessClient()} />);
    await ready();
    fireEvent.click(screen.getByRole('radio', { name: 'Explain' }));
    expect(screen.getByRole('heading', { name: 'Explain' })).toBeTruthy();

    S.selection.value = { type: 'cache', cacheId: 0 };
    await waitFor(() => expect(screen.getByTestId('explain-body').textContent).toContain('= 8 sets'), WAIT);

    fireEvent.click(screen.getByRole('button', { name: /Step/ }));
    await waitFor(() => expect(S.current.value?.index).toBe(0), WAIT);

    S.selection.value = { type: 'slot', cacheId: 0, set: 0, way: 0 };
    await waitFor(() => expect(screen.getByTestId('explain-body').textContent).toContain('Access #0 (core 0 read of 0x10000000) missed here and filled it.'), WAIT);

    fireEvent.click(screen.getByRole('button', { name: /served by/ }));
    expect(S.selection.value).toEqual({ type: 'access', accessIndex: 0 });
    await waitFor(() => expect(screen.getByTestId('explain-body').textContent).toContain('L1d: compulsory miss'), WAIT);

    // Metrics rows become buttons only in Explain mode.
    fireEvent.click(screen.getByRole('button', { name: 'L1D misses' }));
    expect(S.selection.value).toEqual({ type: 'cache', cacheId: 0 });
    fireEvent.click(screen.getByRole('button', { name: 'Explain L1d misses' }));
    expect(S.selection.value).toEqual({ type: 'cache', cacheId: 0 });
    fireEvent.click(screen.getByRole('button', { name: "Explain core 1's L1d" }));
    expect(S.selection.value).toEqual({ type: 'cache', cacheId: 2 });

    fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect(S.selection.value).toBeNull();
  });

  it('leaves metrics as plain text outside Explain mode', async () => {
    setWidth(1280);
    render(<App client={inProcessClient()} />);
    await ready();
    fireEvent.click(screen.getByRole('button', { name: /Step/ }));
    await waitFor(() => expect(S.stats.value).not.toBeNull(), WAIT);
    expect(screen.queryByRole('button', { name: 'L1D misses' })).toBeNull();
  });
});

describe('Glossary', () => {
  it('opens at a clicked Term, focuses it, searches, and links to a lesson', async () => {
    setWidth(1280);
    render(<App client={inProcessClient()} />);
    await ready();
    fireEvent.click(screen.getAllByRole('button', { name: 'AMAT' })[0]!);
    expect(S.mode.value).toBe('glossary');
    const entry = document.querySelector('[data-entry="amat"]')!;
    expect(entry.classList.contains('selected')).toBe(true);
    await waitFor(() => expect(document.activeElement?.id).toBe('gloss-amat'), WAIT);

    const search = screen.getByRole('searchbox');
    fireEvent.input(search, { target: { value: 'plru' } });
    const list = document.querySelector('.gloss-list') as HTMLElement;
    expect(within(list).getAllByRole('heading').map((h) => h.textContent)).toEqual(['Pseudo-LRU']);

    fireEvent.input(search, { target: { value: 'false sharing' } });
    fireEvent.click(within(list).getAllByRole('button', { name: /See it in the simulator: lesson "MESI and false sharing"/ })[0]!);
    expect(S.mode.value).toBe('guided');
    expect(progress.value.lesson).toBe('false-sharing');
  });

  it('a "see it" setup link loads that configuration', async () => {
    setWidth(1280);
    render(<App client={inProcessClient()} />);
    await ready();
    S.mode.value = 'glossary';
    fireEvent.click(await screen.findByRole('button', { name: /Zen 4, sequential sum/ }));
    await waitFor(() => expect(S.presetId.value).toBe('amd-zen4'), WAIT);
    await waitFor(() => expect(S.caches.value.some((c) => c.level === 'L3' && c.sizeBytes === 32 * 1024 * 1024)).toBe(true), WAIT);
  });
});

describe('phone layout', () => {
  it('shows each mode panel above the tabs', async () => {
    setWidth(360);
    render(<App client={inProcessClient()} />);
    await ready();
    for (const [m, name] of [['guided', 'Guided tour'], ['explain', 'Explain'], ['glossary', 'Glossary']] as const) {
      fireEvent.click(screen.getByRole('radio', { name: m[0]!.toUpperCase() + m.slice(1) }));
      expect(screen.getByRole('heading', { name })).toBeTruthy();
      expect(screen.getAllByRole('tab')).toHaveLength(5);
    }
  });
});
