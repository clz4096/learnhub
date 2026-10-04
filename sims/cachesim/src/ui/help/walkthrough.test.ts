import { beforeEach, describe, expect, it } from 'vitest';
import {
  TOUR_KEY, TOUR_STEPS, autoStartTour, dispatchTour, hasSeenTour, markTourSeen, reduceTour, resetTourMemory,
  startTour, tour, tourKeyAction, type StorageLike,
} from '@/ui/help/walkthrough';

class MemStore implements StorageLike {
  data = new Map<string, string>();
  getItem(k: string): string | null { return this.data.get(k) ?? null; }
  setItem(k: string, v: string): void { this.data.set(k, v); }
}

const throwing: StorageLike = {
  getItem() { throw new Error('SecurityError'); },
  setItem() { throw new Error('QuotaExceededError'); },
};

beforeEach(() => {
  resetTourMemory();
  tour.value = { open: false, step: 0 };
});

describe('first visit', () => {
  it('opens on a first visit and not after it was closed', () => {
    const s = new MemStore();
    expect(hasSeenTour(s)).toBe(false);
    expect(autoStartTour(s)).toBe(true);
    expect(tour.value).toEqual({ open: true, step: 0 });
    dispatchTour('close', s);
    expect(s.getItem(TOUR_KEY)).toBe('1');
    // A later visit (fresh page) reads the stored flag.
    resetTourMemory();
    expect(hasSeenTour(s)).toBe(true);
    expect(autoStartTour(s)).toBe(false);
    expect(tour.value.open).toBe(false);
  });

  it('does not reopen while already open', () => {
    const s = new MemStore();
    startTour(3);
    expect(autoStartTour(s)).toBe(false);
    expect(tour.value.step).toBe(3);
  });

  it('works when storage throws: shows the tour, closes cleanly, and does not reopen in the same page', () => {
    expect(hasSeenTour(throwing)).toBe(false);
    expect(autoStartTour(throwing)).toBe(true);
    expect(() => dispatchTour('close', throwing)).not.toThrow();
    expect(tour.value.open).toBe(false);
    expect(autoStartTour(throwing)).toBe(false);
    // Next page load: nothing was saved, so it shows again.
    resetTourMemory();
    expect(autoStartTour(throwing)).toBe(true);
  });

  it('works with no storage at all', () => {
    expect(hasSeenTour(null)).toBe(false);
    expect(() => markTourSeen(null)).not.toThrow();
    expect(hasSeenTour(null)).toBe(true);
  });

  it('ignores a stored value other than "1"', () => {
    const s = new MemStore();
    s.setItem(TOUR_KEY, 'garbage');
    expect(hasSeenTour(s)).toBe(false);
  });
});

describe('step navigation', () => {
  const n = TOUR_STEPS.length;

  it('has 5 to 7 steps, each with a title, text, and target', () => {
    expect(n).toBeGreaterThanOrEqual(5);
    expect(n).toBeLessThanOrEqual(7);
    for (const s of TOUR_STEPS) {
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.text.length).toBeGreaterThan(0);
      expect(s.target.length).toBeGreaterThan(0);
      if (s.phoneTarget) expect(s.phoneTab).toBeDefined();
    }
  });

  it('moves forward and back within bounds', () => {
    let s = { open: true, step: 0 };
    s = reduceTour(s, 'back');
    expect(s).toEqual({ open: true, step: 0 });
    for (let i = 1; i < n; i++) {
      s = reduceTour(s, 'next');
      expect(s).toEqual({ open: true, step: i });
    }
    s = reduceTour(s, 'back');
    expect(s.step).toBe(n - 2);
    expect(reduceTour(s, { goto: 99 })).toEqual({ open: true, step: n - 1 });
    expect(reduceTour(s, { goto: -4 })).toEqual({ open: true, step: 0 });
  });

  it('next on the last step finishes the tour', () => {
    expect(reduceTour({ open: true, step: n - 1 }, 'next')).toEqual({ open: false, step: n - 1 });
  });

  it('a closed tour ignores every action', () => {
    const closed = { open: false, step: 2 };
    expect(reduceTour(closed, 'next')).toBe(closed);
    expect(reduceTour(closed, 'back')).toBe(closed);
    expect(reduceTour(closed, 'close')).toBe(closed);
  });

  it('finishing by Next records the tour as seen', () => {
    const s = new MemStore();
    startTour(n - 1);
    dispatchTour('next', s);
    expect(tour.value.open).toBe(false);
    expect(s.getItem(TOUR_KEY)).toBe('1');
  });

  it('Back and Next do not record the tour as seen', () => {
    const s = new MemStore();
    startTour(0);
    dispatchTour('next', s);
    dispatchTour('back', s);
    expect(s.getItem(TOUR_KEY)).toBeNull();
  });
});

describe('keys', () => {
  it('Esc closes, arrows navigate, other keys pass through', () => {
    expect(tourKeyAction('Escape')).toBe('close');
    expect(tourKeyAction('Esc')).toBe('close');
    expect(tourKeyAction('ArrowRight')).toBe('next');
    expect(tourKeyAction('ArrowLeft')).toBe('back');
    expect(tourKeyAction(' ')).toBeNull();
    expect(tourKeyAction('Enter')).toBeNull();
    expect(tourKeyAction('Tab')).toBeNull();
  });

  it('Esc from the middle of the tour closes it and records it as seen', () => {
    const s = new MemStore();
    startTour(2);
    dispatchTour(tourKeyAction('Escape')!, s);
    expect(tour.value.open).toBe(false);
    expect(s.getItem(TOUR_KEY)).toBe('1');
  });
});
