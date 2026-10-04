/**
 * Extension point for the 3D die view (a later stage). The 3D component reads the same
 * state signals as the 2D grids (caches, mirrors, current, selection, arrows) and is
 * registered once at startup; until then the 3D toggle stays disabled.
 */
import { signal } from '@preact/signals';
import type { ComponentType } from 'preact';

/** Props passed to the 3D view. State comes from '@/ui/state' signals, not props. */
export interface CenterView3DProps {
  /** Width class of the current layout, for level-of-detail choices. */
  layout: 'phone' | 'tablet' | 'desktop';
}

export const centerView3D = signal<ComponentType<CenterView3DProps> | null>(null);

/** Register the 3D view component. Returns a function that unregisters it. */
export function registerCenterView3D(component: ComponentType<CenterView3DProps>): () => void {
  centerView3D.value = component;
  return () => {
    if (centerView3D.value === component) centerView3D.value = null;
  };
}
