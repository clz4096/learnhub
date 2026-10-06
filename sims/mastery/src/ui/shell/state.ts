/**
 * The shell's own state: the command palette, where a focus screen was entered from, and
 * the palette's recent items (kept in localStorage in this browser only).
 */
import { signal } from '@preact/signals';
import { RECENT_KEY, parseRecent, pushRecent, type Recent } from '@/model/shell';
import type { Route } from '@/model/route';

export const paletteOpen = signal(false);

/** The screen a focus screen was entered from; Escape and the bar's back button return there. */
export const focusOrigin = signal<Route | null>(null);

function store(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadRecent(): Recent[] {
  try {
    return parseRecent(store()?.getItem(RECENT_KEY) ?? null);
  } catch {
    return [];
  }
}

export function addRecent(x: Recent): void {
  try {
    store()?.setItem(RECENT_KEY, JSON.stringify(pushRecent(loadRecent(), x)));
  } catch {
    // Not kept; the palette shows fewer recent items.
  }
}

/** A short buzz where the device has one; nothing elsewhere. */
export function buzz(ms: number | number[]): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(ms);
  } catch {
    // No vibration here.
  }
}

/** Whether the learner asked for less motion. */
export function reducedMotion(): boolean {
  try {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}
