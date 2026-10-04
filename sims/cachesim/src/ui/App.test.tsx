import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { App } from '@/ui/App';
import { controller } from '@/ui/controller';
import { inProcessClient } from '@/ui/testClient';
import type { Request } from '@/worker/protocol';
import * as S from '@/ui/state';

beforeAll(() => {
  // jsdom has no canvas; drawing is skipped when there is no 2D context.
  HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
});

afterEach(() => {
  cleanup();
  S.mode.value = 'free';
  S.selection.value = null;
  S.phoneTab.value = 'view';
});

function setWidth(w: number): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: w });
  S.layout.value = S.layoutFor(w);
}

describe('App', () => {
  it('renders the desktop layout with all three columns and the bottom bar', async () => {
    setWidth(1280);
    const log: Request[] = [];
    render(<App client={inProcessClient(log)} />);
    expect(log[0]?.type).toBe('configure');
    expect(screen.getByRole('heading', { name: 'Hardware' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Workload' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'C++ source' })).toBeTruthy();
    expect(screen.getByRole('toolbar', { name: 'Playback' })).toBeTruthy();
    // The configured reply creates one grid per cache (textbook: 2 cores × L1d, L2 + shared L3).
    await waitFor(() => expect(document.querySelectorAll('section.grid2d').length).toBe(5));
    expect(screen.getByRole('radio', { name: '3D view coming' }).hasAttribute('disabled')).toBe(true);
  });

  it('steps exactly one access and shows it', async () => {
    setWidth(1280);
    render(<App client={inProcessClient()} />);
    await waitFor(() => expect(S.caches.value.length).toBe(5));
    await waitFor(() => expect(screen.getByRole('button', { name: /Step/ }).hasAttribute('disabled')).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: /Step/ }));
    await waitFor(() => expect(S.current.value?.index).toBe(0));
    expect(screen.getByText(/served by/)).toBeTruthy();
    controller()?.step();
    await waitFor(() => expect(S.current.value?.index).toBe(1));
  });

  it('renders phone tabs and switches between them', async () => {
    setWidth(360);
    render(<App client={inProcessClient()} />);
    const tabs = screen.getAllByRole('tab').map((t) => t.textContent);
    expect(tabs).toEqual(['Config', 'Workload', 'View', 'Metrics', 'Code']);
    expect(screen.queryByRole('heading', { name: 'Hardware' })).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: 'Config' }));
    expect(screen.getByRole('heading', { name: 'Hardware' })).toBeTruthy();
    expect(screen.getByRole('toolbar', { name: 'Playback' })).toBeTruthy();
    // Phone: 2D only, no 3D toggle.
    fireEvent.click(screen.getByRole('tab', { name: 'View' }));
    expect(screen.queryByRole('radio', { name: '3D view coming' })).toBeNull();
  });

  it('shows an invalid config inline and does not crash', async () => {
    setWidth(1280);
    render(<App client={inProcessClient()} />);
    const ways = screen.getAllByRole('spinbutton', { name: 'Ways' })[0]!;
    fireEvent.change(ways, { target: { value: '3' } });
    await waitFor(() => expect(screen.getAllByRole('alert').some((a) => /Invalid configuration: L1d/.test(a.textContent ?? ''))).toBe(true));
    await waitFor(() => expect(screen.getByText('Fix the hardware configuration to start.')).toBeTruthy());
    S.config.value = (await import('@/engine')).cloneConfig(S.DEFAULT_PRESET.config);
  });

  it('keyboard: → steps one access, space toggles play', async () => {
    setWidth(1280);
    render(<App client={inProcessClient()} />);
    await waitFor(() => expect(S.caches.value.length).toBe(5));
    await new Promise((r) => setTimeout(r, 0));
    fireEvent.keyDown(document.body, { key: 'ArrowRight' });
    await waitFor(() => expect(S.current.value?.index).toBe(0));
    fireEvent.keyDown(document.body, { key: ' ' });
    expect(S.playing.value).toBe(true);
    fireEvent.keyDown(document.body, { key: ' ' });
    expect(S.playing.value).toBe(false);
  });

  it('a Term opens the glossary with the term selected; Explain shows the selection', () => {
    setWidth(1280);
    render(<App client={inProcessClient()} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'associativity' })[0]!);
    expect(S.mode.value).toBe('glossary');
    expect(S.selection.value).toEqual({ type: 'term', term: 'associativity' });
    fireEvent.click(screen.getByRole('radio', { name: 'Explain' }));
    expect(screen.getByTestId('explain-body').textContent).toContain('Associativity');
  });
});
