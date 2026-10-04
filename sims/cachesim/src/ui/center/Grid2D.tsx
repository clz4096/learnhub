/**
 * One cache instance drawn as a sets × ways grid on a canvas.
 *
 * Small caches draw one row per set. Caches with more than MAX_ROWS sets draw one row
 * per group of sets (the mirror keeps per-group counts), shaded by how full each way
 * is across the group; clicking a row zooms into its exact sets. Each frame repaints
 * only the cells the mirror changed and the cells whose highlight is fading (see
 * gridDirty.ts); the whole canvas is repainted only when the view changes. An idle cache
 * costs nothing per frame.
 *
 * Keyboard: the canvas is focusable; arrow keys move a cursor, Enter or Space selects
 * the slot (or zooms into an aggregated row), Escape leaves the zoom. A live region
 * reads out the cell under the cursor.
 */
import { useSignalEffect } from '@preact/signals';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { hex } from '@/engine';
import type { CacheInfo } from '@/engine/types';
import { FLASH_MS, Flash, type CacheMirror } from '@/ui/mirror';
import { FLASH_STYLE, OUTLINE, STATE_FILL, aggregateFill, stateFill, stateLetter } from '@/ui/palette';
import { registerDrawer } from '@/ui/frame';
import { BLOCK_GAP, LABEL_CELL, cellOrigin, computeLayout, hitTest, type GridLayout } from '@/ui/center/gridLayout';
import { GridDirt, cellFlash } from '@/ui/center/gridDirty';
import { clampCursor, describeCell, moveCursor, type Cursor } from '@/ui/center/gridNav';
import { current, mirrors, reducedMotion, selection } from '@/ui/state';

export function cacheTitle(info: CacheInfo): string {
  return info.core >= 0 ? `${info.level} · core ${info.core}` : `${info.level} · shared`;
}

export function formatBytes(n: number): string {
  if (n >= 1024 * 1024 && n % (1024 * 1024) === 0) return `${n / (1024 * 1024)} MiB`;
  if (n >= 1024 && n % 1024 === 0) return `${n / 1024} KiB`;
  return `${n} B`;
}

interface View {
  /** null = all sets (aggregated if large); otherwise the zoomed group index. */
  zoom: number | null;
  exact: boolean;
  rows: number;
  /** First set of row 0 (exact views). */
  base: number;
}

function viewFor(m: CacheMirror, zoom: number | null): View {
  if (m.groupSize === 1) return { zoom: null, exact: true, rows: m.info.sets, base: 0 };
  if (zoom !== null) return { zoom, exact: true, rows: m.groupSets(zoom), base: zoom * m.groupSize };
  return { zoom: null, exact: false, rows: m.groups, base: 0 };
}

export function Grid2D({ info, maxHeight = 240 }: { info: CacheInfo; maxHeight?: number }) {
  const mirror = mirrors.value[info.id];
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(280);
  const [zoom, setZoom] = useState<number | null>(null);
  const [cursor, setCursor] = useState<Cursor | null>(null);
  const [focused, setFocused] = useState(false);
  const [announce, setAnnounce] = useState('');
  /** Repaint the whole canvas next frame. */
  const full = useRef(true);
  /** Outlines (current access, selection, keyboard cursor) moved. */
  const outlineMoved = useRef(false);
  /** The keyboard cursor while the canvas has focus, read by the drawer. */
  const focusCell = useRef<Cursor | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setWidth(Math.max(60, Math.floor(el.clientWidth || 280)));
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // A new run (new mirror) starts unzoomed.
  useEffect(() => {
    setZoom(null);
    setCursor(null);
  }, [mirror]);

  const v = mirror ? viewFor(mirror, zoom) : null;
  const layout = useMemo<GridLayout | null>(() => {
    if (!mirror || !v) return null;
    const digits = v.exact ? String(v.base + v.rows - 1).length : 0;
    return computeLayout(v.rows, info.ways, width, digits, maxHeight);
  }, [mirror, v?.rows, v?.exact, v?.base, info.ways, width, maxHeight]);

  // Repaint outlines only when this cache is involved now or was last frame; otherwise
  // one access would repaint every cache in the hierarchy.
  const outlined = useRef(false);
  useSignalEffect(() => {
    const cur = current.value;
    const sel = selection.value;
    const involved = (cur?.events.some((e) => e.cache === info.id) ?? false) || sel?.cacheId === info.id;
    if (involved || outlined.current) outlineMoved.current = true;
    outlined.current = involved;
  });
  useSignalEffect(() => {
    void reducedMotion.value;
    full.current = true;
  });
  useEffect(() => {
    full.current = true;
  }, [layout, zoom]);

  const shownCursor = focused && cursor && v ? clampCursor(cursor, v.rows, info.ways) : null;
  if (focusCell.current?.row !== shownCursor?.row || focusCell.current?.way !== shownCursor?.way) {
    focusCell.current = shownCursor;
    outlineMoved.current = true;
  }

  useEffect(() => {
    if (!mirror || !layout || !v) return;
    const dirt = new GridDirt(v.rows * info.ways);
    let outlinedCells: number[] = [];
    full.current = true;
    return registerDrawer((now) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const motion = !reducedMotion.value;
      const cells = full.current ? null : dirt.frame(mirror, v, now, motion);
      if (cells !== null && cells.length === 0 && !outlineMoved.current) return;
      const p = painter(canvas, mirror, v, layout, now, motion, cells === null);
      if (!p) return;
      if (cells === null || p.stale) {
        full.current = false;
        p.all();
        dirt.reset(mirror, v, now, motion);
      } else {
        // Outlines overlap their cells; repainting a cell erases its old outline.
        for (const c of outlinedCells) p.cell(c, true);
        for (const c of cells) p.cell(c, true);
      }
      outlineMoved.current = false;
      outlinedCells = p.outlines(focusCell.current);
    });
  }, [mirror, layout, v?.zoom]);

  if (!mirror || !layout || !v) return null;

  const g = mirror.groupSize;
  const selectCell = (row: number, way: number) => {
    if (!v.exact) {
      setZoom(row);
      return;
    }
    const set = v.base + row;
    selection.value = way < 0
      ? { type: 'set', cacheId: info.id, set }
      : { type: 'slot', cacheId: info.id, set, way };
  };

  const onClick = (e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    const hit = hitTest(layout, e.clientX - r.left, e.clientY - r.top);
    if (!hit) return;
    if (!v.exact) setCursor({ row: 0, way: Math.max(0, hit.way) });
    else if (hit.way >= 0) setCursor(hit);
    selectCell(hit.row, hit.way);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const at = clampCursor(cursor ?? { row: 0, way: 0 }, v.rows, info.ways);
    let view = v;
    let next: Cursor | null;
    if (e.key === 'Enter' || e.key === ' ') {
      selectCell(at.row, at.way);
      if (v.exact) {
        next = at;
      } else {
        view = viewFor(mirror, at.row);
        next = { row: 0, way: at.way };
      }
    } else if (e.key === 'Escape' && v.zoom !== null && g > 1) {
      setZoom(null);
      view = viewFor(mirror, null);
      next = { row: v.zoom, way: at.way };
    } else {
      next = moveCursor(at, e.key, v.rows, info.ways);
      if (!next) return;
    }
    // Keys handled here must not also drive playback (App listens on window).
    e.preventDefault();
    e.stopPropagation();
    setCursor(next);
    setAnnounce(describeCell(mirror, view, next, hex));
  };

  const rangeLabel = (row: number) => `sets ${row * g} to ${Math.min(info.sets, (row + 1) * g) - 1}`;

  return (
    <section class="grid2d" data-cache-id={info.id} aria-label={cacheTitle(info)}>
      <header class="grid2d-head">
        <button
          type="button"
          class="linklike grid2d-title"
          aria-pressed={selection.value?.type === 'cache' && selection.value.cacheId === info.id}
          onClick={() => { selection.value = { type: 'cache', cacheId: info.id }; }}
        >
          {cacheTitle(info)}
        </button>
        <span class="muted small">
          {formatBytes(info.sizeBytes)}, {info.ways}-way, {info.sets.toLocaleString()} sets, {info.latency}-cycle hit
        </span>
      </header>
      {g > 1 && (
        <div class="grid2d-zoom small">
          {v.exact ? (
            <>
              <span>Showing {rangeLabel(v.zoom!)} exactly.</span>{' '}
              <button type="button" class="btn btn-small" onClick={() => setZoom(null)}>All sets</button>
            </>
          ) : (
            <span class="muted" title="Darker = more of the row's sets hold a line in that way; amber = dirty lines.">
              {g} sets per row (row 0 = {rangeLabel(0)}); click a row to zoom.
            </span>
          )}
          <label class="visually-hidden-label">
            <span class="visually-hidden">Zoom into sets of {cacheTitle(info)}</span>
            <select
              class="select-small"
              value={zoom === null ? '' : String(zoom)}
              onChange={(e) => {
                const val = (e.currentTarget as HTMLSelectElement).value;
                setZoom(val === '' ? null : Number(val));
              }}
            >
              <option value="">All sets</option>
              {Array.from({ length: mirror.groups }, (_, row) => (
                <option key={row} value={row}>{rangeLabel(row)}</option>
              ))}
            </select>
          </label>
        </div>
      )}
      <div ref={wrapRef} class="grid2d-canvas-wrap">
        <canvas
          ref={canvasRef}
          class="grid2d-canvas"
          tabIndex={0}
          role="application"
          aria-roledescription="cache grid"
          aria-label={`${cacheTitle(info)}: ${info.sets} sets by ${info.ways} ways. `
            + `Arrow keys move, Enter ${v.exact ? 'selects a slot' : 'zooms into a row'}${v.zoom !== null && g > 1 ? ', Escape shows all sets' : ''}.`}
          style={{ width: `${layout.width}px`, height: `${layout.height}px` }}
          onClick={onClick}
          onKeyDown={onKeyDown}
          onFocus={() => {
            setFocused(true);
            const at = clampCursor(cursor ?? { row: 0, way: 0 }, v.rows, info.ways);
            setCursor(at);
            setAnnounce(describeCell(mirror, v, at, hex));
          }}
          onBlur={() => setFocused(false)}
        />
      </div>
      <p class="visually-hidden" aria-live="polite">{focused ? announce : ''}</p>
    </section>
  );
}
/* ───────────────────────── drawing ───────────────────────── */

/** Dashed outline of the keyboard cursor (solid outlines are the access and the selection). */
const FOCUS_DASH = [3, 2];

interface Painter {
  /** True when the canvas was resized (and so cleared): only all() is valid then. */
  stale: boolean;
  /** Repaint everything: grid lines, every cell, row labels. */
  all(): void;
  /** Repaint one view cell (row × ways + way); `ground` restores the grid line around it first. */
  cell(c: number, ground: boolean): void;
  /** Stroke the outlines and return the view cells they cover. */
  outlines(focus: { row: number; way: number } | null): number[];
}

function painter(
  canvas: HTMLCanvasElement, m: CacheMirror, v: View, l: GridLayout, now: number, motion: boolean, resize: boolean,
): Painter | null {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const pw = Math.round(l.width * dpr);
  const ph = Math.round(l.height * dpr);
  let stale = false;
  if (canvas.width !== pw || canvas.height !== ph) {
    if (!resize) stale = true;
    canvas.width = pw;
    canvas.height = ph;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const ways = m.info.ways;
  const shared = m.info.core < 0;
  const big = l.cellH >= LABEL_CELL;
  const glyphFont = `${Math.max(8, Math.floor(l.cellH * 0.7))}px system-ui, sans-serif`;
  const letterFont = `${Math.max(8, Math.floor(l.cellH * 0.55))}px system-ui, sans-serif`;
  // Grid lines come from the background showing through a 1 px inset, not one stroke per cell.
  const inset = l.cellW >= 4 && l.cellH >= 4 ? 1 : 0;
  const cw = l.cellW - inset;
  const ch = l.cellH - inset;
  // Canvas state writes are not free; skip repeats.
  let lastFill = '';
  const fillStyle = (f: string) => {
    if (f !== lastFill) {
      ctx.fillStyle = f;
      lastFill = f;
    }
  };

  const cell = (c: number, ground: boolean) => {
    const r = Math.floor(c / ways);
    const w = c - r * ways;
    const { x, y } = cellOrigin(l, r, w);
    if (ground && inset) {
      fillStyle(STATE_FILL.grid);
      ctx.fillRect(x, y, l.cellW, l.cellH);
    }
    let fill: string;
    let letter = '';
    if (v.exact) {
      const st = m.state[(v.base + r) * ways + w]!;
      fill = stateFill(st, shared);
      letter = stateLetter(st, shared);
    } else {
      const n = m.groupSets(r);
      fill = aggregateFill(m.aggValid[c]! / n, m.aggDirty[c]! / n, shared);
    }
    fillStyle(fill);
    ctx.fillRect(x, y, cw, ch);
    const f = cellFlash(m, v, c);
    const age = now - f.time;
    if (motion && f.kind !== Flash.None && age >= 0 && age < FLASH_MS) {
      drawFlash(ctx, f.kind, 1 - age / FLASH_MS, x, y, cw, ch, big, glyphFont);
      lastFill = '';
    } else if (big && letter) {
      fillStyle('#3d444d');
      ctx.font = letterFont;
      ctx.fillText(letter, x + l.cellW / 2, y + l.cellH / 2 + 0.5);
    }
  };

  const all = () => {
    ctx.clearRect(0, 0, l.width, l.height);
    fillStyle(STATE_FILL.grid);
    for (let b = 0; b < l.blocks; b++) {
      const rows = Math.min(l.blockRows, v.rows - b * l.blockRows);
      if (rows > 0) ctx.fillRect(b * (l.blockW + BLOCK_GAP) + l.gutter, 0, l.ways * l.cellW, rows * l.cellH);
    }
    const n = v.rows * ways;
    for (let c = 0; c < n; c++) cell(c, false);
    if (l.gutter > 0) {
      fillStyle('#57606a');
      ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = 'right';
      for (let r = 0; r < v.rows; r++) {
        const { x, y } = cellOrigin(l, r, -1);
        ctx.fillText(String(v.base + r), x + l.gutter - 4, y + l.cellH / 2 + 0.5);
      }
      ctx.textAlign = 'center';
    }
  };

  // Static outlines: the slots the current access touched (shown even with reduced motion),
  // the selected slot, and the keyboard cursor.
  const outlines = (focus: { row: number; way: number } | null): number[] => {
    const covered: number[] = [];
    const rowOf = (set: number): number => (v.exact ? set - v.base : Math.floor(set / m.groupSize));
    const stroke = (row: number, way: number, color: string, width: number) => {
      if (row < 0 || row >= v.rows || way < 0 || way >= ways) return;
      const { x, y } = cellOrigin(l, row, way);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.strokeRect(x + width / 2, y + width / 2, l.cellW - width, l.cellH - width);
      covered.push(row * ways + way);
    };
    const cur = current.value;
    if (cur) for (const ev of cur.events) if (ev.cache === m.info.id) stroke(rowOf(ev.set), ev.way, OUTLINE.current, l.cellW >= 6 ? 2 : 1);
    const sel = selection.value;
    if (sel && sel.cacheId === m.info.id && sel.set !== undefined) {
      if (sel.type === 'slot' && sel.way !== undefined) stroke(rowOf(sel.set), sel.way, OUTLINE.selected, 2);
      else if (sel.type === 'set') for (let w = 0; w < ways; w++) stroke(rowOf(sel.set), w, OUTLINE.selected, 1);
    }
    if (focus) {
      ctx.setLineDash(FOCUS_DASH);
      stroke(focus.row, focus.way, OUTLINE.selected, 2);
      ctx.setLineDash([]);
    }
    return covered;
  };

  return { stale, all, cell, outlines };
}

/**
 * Event highlight with a non-color cue: a glyph when the cell is large enough,
 * otherwise a distinct shape (ring, solid, half, slash, dot).
 */
function drawFlash(ctx: CanvasRenderingContext2D, kind: number, alpha: number, x: number, y: number, w: number, h: number, big: boolean, font: string): void {
  const style = FLASH_STYLE[kind];
  if (!style) return;
  ctx.globalAlpha = Math.max(0.15, alpha);
  ctx.fillStyle = style.color;
  ctx.strokeStyle = style.color;
  if (big) {
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff';
    ctx.font = font;
    ctx.fillText(style.glyph, x + w / 2, y + h / 2 + 0.5);
    return;
  }
  switch (kind) {
    case Flash.Hit: // ring
      ctx.lineWidth = Math.max(1, Math.min(w, h) / 4);
      ctx.strokeRect(x + ctx.lineWidth / 2, y + ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
      break;
    case Flash.Evict: // bottom half
      ctx.fillRect(x, y + h / 2, w, h / 2);
      break;
    case Flash.Prefetch: // top half
      ctx.fillRect(x, y, w, h / 2);
      break;
    case Flash.Invalidate: // slash
      // Clipped: the stroke's ends overhang the cell, and cells are repainted one at a time.
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      ctx.lineWidth = Math.max(1, Math.min(w, h) / 3);
      ctx.beginPath();
      ctx.moveTo(x, y + h);
      ctx.lineTo(x + w, y);
      ctx.stroke();
      ctx.restore();
      break;
    case Flash.State:
    case Flash.Writeback: // center dot
      ctx.fillRect(x + w / 4, y + h / 4, w / 2, h / 2);
      break;
    default: // miss: solid
      ctx.fillRect(x, y, w, h);
  }
  ctx.globalAlpha = 1;
}
