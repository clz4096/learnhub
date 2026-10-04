import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/preact';
import type { CacheInfo } from '@/engine/types';
import { CacheMirror } from '@/ui/mirror';
import { Grid2D } from '@/ui/center/Grid2D';
import * as S from '@/ui/state';

const info = (sets: number, ways: number, core = 0): CacheInfo => ({
  id: 0, level: 'L1d', core, sets, ways, lineBytes: 64, sizeBytes: sets * ways * 64, latency: 4, policy: 'lru',
});

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
});

afterEach(() => {
  cleanup();
  S.selection.value = null;
  S.mirrors.value = [];
});

describe('Grid2D keyboard', () => {
  it('arrows move the cursor, Enter selects the slot, and the cell is announced', () => {
    const i = info(8, 4);
    S.mirrors.value = [new CacheMirror(i)];
    const { container } = render(<Grid2D info={i} />);
    const canvas = container.querySelector('canvas')!;
    expect(canvas.tabIndex).toBe(0);
    fireEvent.focus(canvas);
    expect(container.querySelector('[aria-live]')!.textContent).toBe('Set 0, way 0: empty.');
    fireEvent.keyDown(canvas, { key: 'ArrowDown' });
    fireEvent.keyDown(canvas, { key: 'ArrowRight' });
    fireEvent.keyDown(canvas, { key: 'ArrowRight' });
    expect(container.querySelector('[aria-live]')!.textContent).toBe('Set 1, way 2: empty.');
    fireEvent.keyDown(canvas, { key: 'Enter' });
    expect(S.selection.value).toEqual({ type: 'slot', cacheId: 0, set: 1, way: 2 });
  });

  it('handled keys do not reach the window (playback shortcuts)', () => {
    const i = info(8, 4);
    S.mirrors.value = [new CacheMirror(i)];
    const { container } = render(<Grid2D info={i} />);
    const canvas = container.querySelector('canvas')!;
    let reached = 0;
    const onKey = () => { reached++; };
    window.addEventListener('keydown', onKey);
    fireEvent.focus(canvas);
    fireEvent.keyDown(canvas, { key: 'ArrowRight' });
    fireEvent.keyDown(canvas, { key: ' ' });
    fireEvent.keyDown(canvas, { key: 'x' });
    window.removeEventListener('keydown', onKey);
    expect(reached).toBe(1);
  });

  it('Enter on an aggregated row zooms in; Escape zooms back out', () => {
    const i = info(1024, 2, -1);
    S.mirrors.value = [new CacheMirror(i)];
    const { container } = render(<Grid2D info={i} />);
    const canvas = container.querySelector('canvas')!;
    const select = () => container.querySelector('select')!.value;
    fireEvent.focus(canvas);
    fireEvent.keyDown(canvas, { key: 'ArrowDown' });
    fireEvent.keyDown(canvas, { key: 'Enter' });
    expect(select()).toBe('1');
    expect(container.querySelector('[aria-live]')!.textContent).toMatch(/^Set \d+, way 0: empty\.$/);
    fireEvent.keyDown(canvas, { key: 'Escape' });
    expect(select()).toBe('');
  });
});
