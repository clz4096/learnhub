/**
 * "Start here" walkthrough: the steps, which part of the screen each one points at,
 * and the open/step state. The tour opens by itself on a viewer's first visit; that
 * fact is kept in localStorage. Storage can be missing, full, or blocked (private
 * windows, embedded iframes), so every access is guarded: when storage fails, the
 * tour simply shows again on the next visit.
 *
 * Text uses the [[id|shown text]] term marks (Term.tsx) and the analogy set at the top
 * of src/ui/modes/glossary.ts.
 */
import { signal } from '@preact/signals';
import type { PhoneTab } from '@/ui/state';

export const TOUR_KEY = 'cachesim.tour.v1';

export interface TourStep {
  id: string;
  title: string;
  text: string;
  /** CSS selector of the region to outline on desktop and tablet. */
  target: string;
  /** Phone layout: the tab that holds the region, and the region inside it. */
  phoneTab?: PhoneTab;
  phoneTarget?: string;
}

/** The phone layout shows one section at a time; its tab panel is the region. */
const TABPANEL = '#tabpanel';

export const TOUR_STEPS: readonly TourStep[] = [
  {
    id: 'what',
    title: 'What this is',
    text: 'This tool lets you watch a CPU [[cache|cache]] at work while a small C++ loop runs. '
      + 'Picture main memory ([[dram|DRAM]]) as a warehouse across town: every trip there is slow. '
      + 'A cache is a bookcase near your desk that keeps copies of the boxes you used lately. '
      + 'Each box is a [[cache-line|cache line]]: a block of neighboring bytes that always travels whole.',
    target: '.app-title',
  },
  {
    id: 'grids',
    title: 'The grids in the center',
    text: 'Each grid is one cache. A row is a [[set|set]]: the one shelf a box may go on. '
      + 'A column is a [[way|way]]: one slot on that shelf. A colored cell holds a line; white means empty. '
      + 'When the program reads or writes, the cell it used flashes: a green ✓ is a [[hit|hit]] (the box was already there), '
      + 'and a red ✕ is a [[miss|miss]] (it had to be fetched from farther away). The legend lists every color.',
    target: '.center-view',
    phoneTab: 'view',
    phoneTarget: '.center-view',
  },
  {
    id: 'bar',
    title: 'The bottom bar runs the program',
    text: 'Play runs the loop one memory access at a time; press it again to pause. '
      + 'Step runs exactly one access. Speed sets how fast Play goes. '
      + 'Run to end (End on a small phone) computes the rest at once and shows the final numbers. Reset starts over. '
      + 'Keys: Space plays or pauses, and the Right arrow steps.',
    target: '.bottom-bar',
  },
  {
    id: 'left',
    title: 'Hardware and workload',
    text: 'Hardware picks the CPU to model. Start with Textbook small cache: its caches are tiny, so you can see every slot. '
      + 'Workload picks the C++ loop to run and its settings, such as the array size. '
      + 'Changing anything here starts the run over. On a phone, these are the Config and Workload tabs.',
    target: '.body aside.left',
    phoneTab: 'config',
    phoneTarget: TABPANEL,
  },
  {
    id: 'right',
    title: 'The numbers',
    text: 'The metrics count what happened. Miss breakdown shows why each miss happened. '
      + 'Per level and Per core count hits and misses. Totals shows [[amat|AMAT]], the average cost of one access '
      + 'in [[latency|cycles]]: lower is faster. On a phone, this is the Metrics tab.',
    target: '.body aside.right',
    phoneTab: 'metrics',
    phoneTarget: TABPANEL,
  },
  {
    id: 'modes',
    title: 'Four ways to use it',
    text: 'Free lets you change anything. Guided walks you through 10 short lessons. '
      + 'Explain answers "why?" for anything you click. Glossary defines every term; '
      + 'words with a dotted underline open it. New here? Start with Guided, lesson 1.',
    target: '.mode-switch',
  },
  {
    id: 'tryit',
    title: 'Try it for real',
    text: 'Most loops here also exist as real C++ benchmarks. The Try it for real panel shows the commands for your computer. '
      + 'Run them, then load the results file to see whether your machine shows the same trend. '
      + 'Help, at the top, explains every part of the tool and lists the keyboard shortcuts.',
    target: 'section[aria-labelledby="try-title"]',
    phoneTab: 'code',
    phoneTarget: 'section[aria-labelledby="try-title"]',
  },
];

/* ───────────────────────── first visit ───────────────────────── */

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** localStorage, or null when it is missing or blocked. */
export function browserStorage(): StorageLike | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null; // some browsers throw on the property access itself when storage is blocked
  }
}

/** Set once the tour has been closed in this page, so a failed save does not reopen it here. */
let closedThisPage = false;

export function hasSeenTour(store: StorageLike | null = browserStorage()): boolean {
  if (closedThisPage) return true;
  try {
    return store?.getItem(TOUR_KEY) === '1';
  } catch {
    return false;
  }
}

export function markTourSeen(store: StorageLike | null = browserStorage()): void {
  closedThisPage = true;
  try {
    store?.setItem(TOUR_KEY, '1');
  } catch {
    // Quota or privacy mode: the tour will show again on the next visit.
  }
}

/** Test hook: forget the in-page flag. */
export function resetTourMemory(): void {
  closedThisPage = false;
}

/* ───────────────────────── open state and navigation ───────────────────────── */

export interface TourState {
  open: boolean;
  step: number;
}

export type TourAction = 'next' | 'back' | 'close' | { goto: number };

/** Pure transition: next on the last step closes; back on the first stays. */
export function reduceTour(s: TourState, a: TourAction, count = TOUR_STEPS.length): TourState {
  if (!s.open) return s;
  if (a === 'close') return { open: false, step: s.step };
  if (a === 'next') return s.step >= count - 1 ? { open: false, step: s.step } : { open: true, step: s.step + 1 };
  if (a === 'back') return { open: true, step: Math.max(0, s.step - 1) };
  return { open: true, step: Math.max(0, Math.min(count - 1, a.goto)) };
}

/** The action for a key pressed inside the tour, or null when the tour does not use it. */
export function tourKeyAction(key: string): TourAction | null {
  if (key === 'Escape' || key === 'Esc') return 'close';
  if (key === 'ArrowRight') return 'next';
  if (key === 'ArrowLeft') return 'back';
  return null;
}

export const tour = signal<TourState>({ open: false, step: 0 });

export function startTour(step = 0): void {
  tour.value = { open: true, step: Math.max(0, Math.min(TOUR_STEPS.length - 1, step)) };
}

/** Apply an action; closing (by any route) records that the tour was seen. */
export function dispatchTour(a: TourAction, store: StorageLike | null = browserStorage()): void {
  const before = tour.value;
  const after = reduceTour(before, a);
  if (after === before) return;
  tour.value = after;
  if (before.open && !after.open) markTourSeen(store);
}

/** Open the tour when this viewer has never closed it. Returns whether it opened. */
export function autoStartTour(store: StorageLike | null = browserStorage()): boolean {
  if (tour.value.open || hasSeenTour(store)) return false;
  startTour(0);
  return true;
}
