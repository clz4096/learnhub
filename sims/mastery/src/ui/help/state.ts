/** Help and tour state. The tour opens by itself once, on the first visit to Today; that fact is kept in localStorage. */
import { signal } from '@preact/signals';
import { TOUR_STEPS } from '@/ui/help/content';

export const helpOpen = signal(false);
export const tour = signal<{ open: boolean; step: number }>({ open: false, step: 0 });
export const TOUR_KEY = 'mastery.tour.v1';

function store(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

let closedThisPage = false;

export function hasSeenTour(): boolean {
  if (closedThisPage) return true;
  try {
    return store()?.getItem(TOUR_KEY) === '1';
  } catch {
    return false;
  }
}

export function startTour(): void {
  tour.value = { open: true, step: 0 };
}

export function closeTour(): void {
  tour.value = { open: false, step: tour.value.step };
  closedThisPage = true;
  try {
    store()?.setItem(TOUR_KEY, '1');
  } catch {
    // The tour will show again next visit.
  }
}

export function stepTour(delta: number): void {
  const step = tour.value.step + delta;
  if (step >= TOUR_STEPS.length) closeTour();
  else tour.value = { open: true, step: Math.max(0, step) };
}

export function autoStartTour(): boolean {
  if (tour.value.open || hasSeenTour()) return false;
  startTour();
  return true;
}
