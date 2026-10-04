import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/preact';
import { App } from '@/ui/App';
import { inProcessClient } from '@/ui/testClient';
import { cloneConfig } from '@/engine';
import { defaultParams } from '@/workloads/types';
import { workloadById } from '@/workloads';
import * as S from '@/ui/state';
import { freshProgress, progress } from '@/ui/modes/progress';
import { TOUR_KEY, TOUR_STEPS, resetTourMemory, tour } from '@/ui/help/walkthrough';
import { helpOpen } from '@/ui/help/state';
import { EXAMPLE_TRACE } from '@/ui/help/content';

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
  resetTourMemory();
  tour.value = { open: false, step: 0 };
  helpOpen.value = false;
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
  S.view.value = '2d';
  vi.restoreAllMocks();
});

const tourDialog = () => screen.getByRole('dialog', { name: TOUR_STEPS[tour.value.step]!.title });

describe('Start here walkthrough', () => {
  it('opens on a first visit, is keyboard operable, and returns focus on Esc', async () => {
    setWidth(1280);
    render(<App client={inProcessClient()} />);
    const d = tourDialog();
    expect(within(d).getByText(/step 1 of 7/)).toBeTruthy();
    // Focus starts on Next.
    await waitFor(() => expect(document.activeElement?.textContent).toMatch(/Next/));

    // Arrow keys inside the card move between steps and do not step the simulation.
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
    expect(tour.value.step).toBe(1);
    expect(screen.getByRole('dialog', { name: TOUR_STEPS[1]!.title })).toBeTruthy();
    expect(S.current.value).toBeNull();
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft' });
    expect(tour.value.step).toBe(0);

    // Buttons work too.
    fireEvent.click(within(tourDialog()).getByRole('button', { name: /Next/ }));
    fireEvent.click(within(tourDialog()).getByRole('button', { name: /Next/ }));
    expect(tour.value.step).toBe(2);
    fireEvent.click(within(tourDialog()).getByRole('button', { name: /Back/ }));
    expect(tour.value.step).toBe(1);

    // Tab stays inside the card.
    const card = tourDialog();
    const buttons = within(card).getAllByRole('button').filter((b) => !b.classList.contains('term'));
    const lastBtn = buttons[buttons.length - 1]!;
    lastBtn.focus();
    fireEvent.keyDown(lastBtn, { key: 'Tab' });
    expect(card.contains(document.activeElement)).toBe(true);

    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(tour.value.open).toBe(false);
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(document.activeElement?.classList.contains('help-button')).toBe(true));
    expect(localStorage.getItem(TOUR_KEY)).toBe('1');
  });

  it('does not open again once seen, and reopens from Help', async () => {
    localStorage.setItem(TOUR_KEY, '1');
    setWidth(1280);
    render(<App client={inProcessClient()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    const help = screen.getByRole('button', { name: 'Help' });
    help.focus();
    fireEvent.click(help);
    const page = screen.getByRole('dialog', { name: 'Help' });
    fireEvent.click(within(page).getByRole('button', { name: 'Take the tour' }));
    expect(tour.value).toEqual({ open: true, step: 0 });
    expect(screen.queryByRole('dialog', { name: 'Help' })).toBeNull();
    // Finish it with Next on every step.
    for (let i = 0; i < TOUR_STEPS.length - 1; i++) fireEvent.click(within(tourDialog()).getByRole('button', { name: /Next/ }));
    expect(within(tourDialog()).getByRole('button', { name: 'Start lesson 1' })).toBeTruthy();
    fireEvent.click(within(tourDialog()).getByRole('button', { name: 'Done' }));
    expect(tour.value.open).toBe(false);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Help' })));
  });

  it('Esc closes the tour even when focus is outside the card', () => {
    setWidth(1280);
    render(<App client={inProcessClient()} />);
    expect(tour.value.open).toBe(true);
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(tour.value.open).toBe(false);
  });

  it('still works when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    setWidth(1280);
    render(<App client={inProcessClient()} />);
    expect(tour.value.open).toBe(true);
    fireEvent.click(within(tourDialog()).getByRole('button', { name: 'Skip tour' }));
    expect(tour.value.open).toBe(false);
  });

  it('phone: switches to the tab each step points at, then restores the tab', async () => {
    setWidth(360);
    render(<App client={inProcessClient()} />);
    expect(S.phoneTab.value).toBe('view');
    const goTo = (id: string) => {
      while (TOUR_STEPS[tour.value.step]!.id !== id) fireEvent.click(within(tourDialog()).getByRole('button', { name: /Next/ }));
    };
    goTo('left');
    await waitFor(() => expect(S.phoneTab.value).toBe('config'));
    goTo('right');
    await waitFor(() => expect(S.phoneTab.value).toBe('metrics'));
    goTo('tryit');
    await waitFor(() => expect(S.phoneTab.value).toBe('code'));
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    await waitFor(() => expect(S.phoneTab.value).toBe('view'));
  });
});

describe('Help page', () => {
  beforeEach(() => { localStorage.setItem(TOUR_KEY, '1'); });

  it('opens from the Help button, closes on Esc, and returns focus', async () => {
    setWidth(1280);
    render(<App client={inProcessClient()} />);
    const help = screen.getByRole('button', { name: 'Help' });
    help.focus();
    fireEvent.click(help);
    const page = screen.getByRole('dialog', { name: 'Help' });
    expect(document.activeElement?.id).toBe('help-title');
    for (const h of ['How to learn with this', 'Free mode', 'Guided lessons', 'Explain: click anything', 'Glossary',
      '2D grids and the 3D view', 'Reading the metrics', 'Address breakdown', 'Custom traces', 'Try it for real', 'Keyboard shortcuts']) {
      expect(within(page).getByRole('heading', { name: h })).toBeTruthy();
    }
    fireEvent.keyDown(page, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Help' })).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(help));
  });

  it('"Try this" for Explain loads a run, steps once, and selects the access', async () => {
    setWidth(1280);
    render(<App client={inProcessClient()} />);
    await waitFor(() => expect(S.caches.value.length).toBeGreaterThan(0), WAIT);
    fireEvent.click(screen.getByRole('button', { name: 'Help' }));
    fireEvent.click(screen.getByRole('button', { name: 'Try this: Explain the first access' }));
    await waitFor(() => expect(S.mode.value).toBe('explain'), WAIT);
    expect(S.params.value).toMatchObject({ N: 256, passes: 1 });
    expect(S.current.value?.index).toBe(0);
    expect(S.selection.value).toEqual({ type: 'access', accessIndex: 0 });
  });

  it('"Try this" for custom traces loads the example', async () => {
    setWidth(1280);
    render(<App client={inProcessClient()} />);
    await waitFor(() => expect(S.caches.value.length).toBeGreaterThan(0), WAIT);
    fireEvent.click(screen.getByRole('button', { name: 'Help' }));
    fireEvent.click(screen.getByRole('button', { name: 'Try this: Load this example' }));
    await waitFor(() => expect(S.workloadId.value).toBe('custom'), WAIT);
    expect(S.traceText.value).toBe(EXAMPLE_TRACE);
    await waitFor(() => expect(S.estimate.value).toBe(6), WAIT);
    await waitFor(() => expect((document.getElementById('trace-text') as HTMLTextAreaElement).value).toBe(EXAMPLE_TRACE), WAIT);
  });

  it('"Try this" for custom traces replaces the text box when custom is already selected', async () => {
    setWidth(1280);
    S.workloadId.value = 'custom';
    S.traceText.value = '0x0 R 0';
    render(<App client={inProcessClient()} />);
    await waitFor(() => expect((document.getElementById('trace-text') as HTMLTextAreaElement).value).toBe('0x0 R 0'), WAIT);
    fireEvent.click(screen.getByRole('button', { name: 'Help' }));
    fireEvent.click(screen.getByRole('button', { name: 'Try this: Load this example' }));
    await waitFor(() => expect((document.getElementById('trace-text') as HTMLTextAreaElement).value).toBe(EXAMPLE_TRACE), WAIT);
  });

  it('"Try this" for Guided opens lesson 1', async () => {
    setWidth(1280);
    render(<App client={inProcessClient()} />);
    await waitFor(() => expect(S.caches.value.length).toBeGreaterThan(0), WAIT);
    fireEvent.click(screen.getByRole('button', { name: 'Help' }));
    fireEvent.click(screen.getByRole('button', { name: 'Try this: Open lesson 1' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: '1. Tag, set, and offset' })).toBeTruthy(), WAIT);
  });

  it('a glossary link closes the page and opens the glossary', () => {
    setWidth(1280);
    render(<App client={inProcessClient()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Help' }));
    const page = screen.getByRole('dialog', { name: 'Help' });
    fireEvent.click(within(page).getAllByRole('button', { name: 'ways' })[0]!);
    expect(S.mode.value).toBe('glossary');
    expect(screen.queryByRole('dialog', { name: 'Help' })).toBeNull();
  });
});
