/**
 * The 3D die view component (loaded on demand with Three.js). Owns one DieScene and
 * feeds it from the shared state signals; the scene draws from the app's frame loop.
 */
import { effect } from '@preact/signals';
import { useEffect, useRef, useState } from 'preact/hooks';
import { registerDrawer } from '@/ui/frame';
import { Legend } from '@/ui/center/Legend';
import { cacheTitle } from '@/ui/center/Grid2D';
import type { CenterView3DProps } from '@/ui/center/registry';
import {
  arrows, caches, configError, current, mirrors, reducedMotion, selection, showArrows, workerError,
} from '@/ui/state';
import { DieScene } from '@/ui/center/view3d/DieScene';
import '@/ui/center/view3d/view3d.css';

export interface DieViewProps extends CenterView3DProps {
  /** Called when WebGL fails, so the host can fall back to 2D. */
  onFail: (reason: string) => void;
}

interface Zoom { cacheId: number; first: number; last: number }

export function DieView({ onFail }: DieViewProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<DieScene | null>(null);
  const [zoom, setZoom] = useState<Zoom | null>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const overlay = overlayRef.current;
    if (!stage || !overlay) return;
    let scene: DieScene;
    try {
      scene = new DieScene(stage, overlay, {
        select: (s) => { selection.value = s; },
        zoomChanged: setZoom,
        lost: () => onFail('The WebGL context was lost.'),
      });
    } catch {
      onFail('WebGL could not start.');
      return;
    }
    sceneRef.current = scene;
    const measure = () => scene.setSize(stage.clientWidth, stage.clientHeight);
    measure();
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    ro?.observe(stage);
    // Off screen (scrolled away, or a hidden tab): skip frames entirely.
    const io = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver((entries) => {
      const vis = entries[entries.length - 1]?.isIntersecting ?? true;
      scene.visible = vis;
      if (vis) scene.invalidate();
    });
    io?.observe(stage);
    const stops = [
      effect(() => scene.setData(mirrors.value)),
      effect(() => scene.setMotion(!reducedMotion.value)),
      effect(() => scene.setCurrent(current.value)),
      effect(() => scene.setSelection(selection.value)),
      effect(() => scene.setArrows(showArrows.value ? arrows.value : [])),
    ];
    const unregister = registerDrawer((now) => scene.frame(now));
    return () => {
      unregister();
      for (const s of stops) s();
      ro?.disconnect();
      io?.disconnect();
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  const infos = caches.value;
  const empty = infos.length === 0;
  const zoomInfo = zoom ? infos[zoom.cacheId] : undefined;
  return (
    <div class="view3d-wrap">
      <Legend />
      <div class="view3d-toolbar small">
        <button type="button" class="btn btn-small" onClick={() => sceneRef.current?.reset()}>Full die</button>
        {zoom && zoomInfo && (
          <span>
            Showing sets {zoom.first} to {zoom.last} of {cacheTitle(zoomInfo)} exactly.{' '}
            <button type="button" class="btn btn-small" onClick={() => sceneRef.current?.zoomCache(zoom.cacheId, null)}>All sets</button>
          </span>
        )}
        <span id="view3d-help" class="muted">
          Drag to orbit, scroll to zoom, click a cache to fly to it, click a cell to select it. Double-click
          or Esc returns to the full die; Shift+arrows orbit and +/- zoom from the keyboard. Raised cells: the
          current access; the tallest is the selected line.
        </span>
      </div>
      <div
        class="view3d"
        tabIndex={0}
        role="group"
        aria-roledescription="3D die view"
        aria-label="3D die view of the cache hierarchy"
        aria-describedby="view3d-help"
        onKeyDown={(e) => {
          if (sceneRef.current?.key(e)) {
            e.preventDefault();
            // Shift+arrows would otherwise also reach the app's step shortcut.
            e.stopPropagation();
          }
        }}
      >
        <div class="view3d-stage" ref={stageRef} />
        <div class="view3d-overlay" ref={overlayRef} />
        {empty && (
          <p class="muted view3d-empty">
            {configError.value ? 'Fix the hardware configuration to start.'
              : workerError.value ? 'No simulation: fix the error above.' : 'Starting the simulator…'}
          </p>
        )}
      </div>
    </div>
  );
}
