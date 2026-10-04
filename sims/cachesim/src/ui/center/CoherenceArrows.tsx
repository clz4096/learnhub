/**
 * Overlay arrows between cores' private caches for coherence traffic: an invalidation
 * (writer → victim) or a peer transfer / downgrade (holder → requester). Positions are
 * read from the rendered core columns ([data-core-anchor]) when they mount or resize,
 * not per arrow: reading layout every frame forces a synchronous layout pass.
 */
import { useLayoutEffect, useState } from 'preact/hooks';
import type { RefObject } from 'preact';
import { ARROW_MS } from '@/ui/controller';
import { arrows, caches, reducedMotion } from '@/ui/state';

interface Pt { x: number; y: number }

export function CoherenceArrows({ container }: { container: RefObject<HTMLElement> }) {
  const list = arrows.value;
  // The core columns are rebuilt only when the cache list changes.
  const infos = caches.value;
  const [anchors, setAnchors] = useState<Map<number, Pt>>(new Map());
  useLayoutEffect(() => {
    const root = container.current;
    if (!root) return;
    const measure = () => {
      const base = root.getBoundingClientRect();
      const m = new Map<number, Pt>();
      root.querySelectorAll<HTMLElement>('[data-core-anchor]').forEach((el) => {
        const r = el.getBoundingClientRect();
        m.set(Number(el.dataset.coreAnchor), { x: r.left - base.left + r.width / 2, y: r.top - base.top + 14 });
      });
      setAnchors(m);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    root.querySelectorAll('[data-core-anchor]').forEach((el) => ro.observe(el));
    return () => ro.disconnect();
  }, [container, infos]);

  if (list.length === 0) return null;
  return (
    <svg class="coherence-arrows" aria-hidden="true">
      <defs>
        <marker id="arrowhead-inv" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#8250df" />
        </marker>
        <marker id="arrowhead-xfer" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#0969da" />
        </marker>
      </defs>
      {list.map((a) => {
        const p = anchors.get(a.from);
        const q = anchors.get(a.to);
        if (!p || q === undefined) return null;
        const mx = (p.x + q.x) / 2;
        // Opposite directions between the same cores get different heights so labels do not overlap.
        const lift = 28 + Math.abs(q.x - p.x) * 0.08 + (a.from > a.to ? 22 : 0);
        const inv = a.kind === 'invalidate';
        return (
          <g key={a.id} class={reducedMotion.value ? '' : 'arrow-fade'} style={{ animationDuration: `${ARROW_MS}ms` }}>
            <path
              d={`M${p.x},${p.y} Q${mx},${Math.min(p.y, q.y) - lift} ${q.x},${q.y}`}
              fill="none"
              stroke={inv ? '#8250df' : '#0969da'}
              stroke-width="2.5"
              stroke-dasharray={inv ? '6 4' : undefined}
              marker-end={`url(#${inv ? 'arrowhead-inv' : 'arrowhead-xfer'})`}
            />
            <text x={mx} y={Math.min(p.y, q.y) - lift / 2 - 4} text-anchor="middle" class="arrow-label">
              {inv ? '⊘ invalidate' : '⇄ share'}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
