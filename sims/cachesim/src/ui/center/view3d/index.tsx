/**
 * Registers the 3D die view. This module stays small: Three.js and the scene load on
 * first use (a separate chunk), so the 2D-only path never downloads them. Without
 * WebGL 2 (which Three.js requires) the view falls back to the 2D grids with a notice.
 */
import type { ComponentType } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { registerCenterView3D, type CenterView3DProps } from '@/ui/center/registry';
import { Grids } from '@/ui/center/CenterView';
import type { DieViewProps } from '@/ui/center/view3d/DieView';

let supported: boolean | null = null;

/** True when a WebGL 2 context can be created. Probed once; the probe context is released. */
export function webgl2Available(): boolean {
  if (supported !== null) return supported;
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    supported = !!gl;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    supported = false;
  }
  return supported;
}

let loaded: ComponentType<DieViewProps> | null = null;

export function View3D(props: CenterView3DProps) {
  const [View, setView] = useState<ComponentType<DieViewProps> | null>(() => loaded);
  const [failed, setFailed] = useState<string | null>(() =>
    webgl2Available() ? null : 'This browser cannot run WebGL 2.');

  useEffect(() => {
    if (View || failed) return;
    let live = true;
    import('@/ui/center/view3d/DieView')
      .then((m) => {
        loaded = m.DieView;
        if (live) setView(() => m.DieView);
      })
      .catch(() => { if (live) setFailed('The 3D view could not load.'); });
    return () => { live = false; };
  }, []);

  if (failed) {
    return (
      <>
        <p class="warning small" role="status">{failed} Showing the 2D grids instead.</p>
        <Grids />
      </>
    );
  }
  if (!View) return <p class="muted empty-view">Loading the 3D view…</p>;
  return <View {...props} onFail={setFailed} />;
}

registerCenterView3D(View3D);
