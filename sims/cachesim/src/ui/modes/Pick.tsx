/**
 * Makes a piece of a panel selectable for Explain mode. In Explain mode it renders a
 * button (so it is keyboard reachable) that sets `selection`; in other modes it
 * renders its children unchanged, so Free mode looks and reads as before.
 */
import type { ComponentChildren } from 'preact';
import { caches, mode, selection, type Selection } from '@/ui/state';

export function Pick({ sel, label, block = false, children }: {
  sel: Selection;
  /** Accessible name; defaults to the children's text. */
  label?: string;
  /** Stretch to the parent's width (for bars). */
  block?: boolean;
  children: ComponentChildren;
}) {
  if (mode.value !== 'explain' || !sel) return <>{children}</>;
  const on = JSON.stringify(selection.value) === JSON.stringify(sel);
  return (
    <button type="button" class={`pick${block ? ' pick-block' : ''}`} aria-label={label} aria-pressed={on}
      onClick={() => { selection.value = sel; }}>
      {children}
    </button>
  );
}

/** Selection for a level name (L1d, L2, ...): its first instance, which the explanation sums over. */
export function levelSelection(level: string): Selection {
  const info = caches.value.find((c) => c.level === level);
  return info ? { type: 'cache', cacheId: info.id } : null;
}

/** Selection for a core's L1d. */
export function coreSelection(core: number): Selection {
  const info = caches.value.find((c) => c.core === core && c.level === 'L1d');
  return info ? { type: 'cache', cacheId: info.id } : null;
}
