/**
 * The knowledge map: every topic of the chosen courses, laid out in level bands from the
 * foundations at the top to the Tripos at the bottom, coloured by status. Zoom, filter by
 * course, or switch to a list. Selecting a topic shows its summary, sources, and status.
 *
 * Edges: with all of them drawn the map is a tangle, so by default only the selected
 * topic's edges are drawn, to its prerequisites above and its dependents below, and none
 * when nothing is selected. "Show all connections" draws every edge; the choice is kept
 * per browser.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { catalogProblem, gateOf, hasContent } from '@learnhub/content';
import { AREAS } from '@learnhub/graph';
import { LEVELS, type Progress, type Topic } from '@learnhub/mastery';
import { AREA_NAMES, LEVEL_NAMES, closureTopics, coursesWith, shortName, titleOf, topicOf } from '@/model/courses';
import { daysFrom, masteryOf, statusMap, type TopicStatus } from '@/model/learner';
import { NODE_H, NODE_W, layout } from '@/model/layout';
import { go } from '@/model/route';
import { now, progress } from '@/model/store';
import { Sources, gateRule } from '@/ui/views/Lesson';
import { TexText } from '@/ui/Tex';

export const STATUS_TEXT: Record<TopicStatus, string> = {
  mastered: 'Mastered',
  gate: 'Learned: needs the Cambridge problem',
  due: 'Learned, review due',
  ready: 'Ready to learn',
  unwritten: 'Lesson not written yet',
  locked: 'Locked: learn its prerequisites first',
};

export const ALL_EDGES_KEY = 'learnhub.mastery.map.allEdges';

/** The stored "Show all connections" choice; off when storage is blocked or holds anything else. */
export function readAllEdges(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(ALL_EDGES_KEY) === '1';
  } catch {
    return false;
  }
}

function writeAllEdges(on: boolean): void {
  try {
    if (typeof localStorage === 'undefined') return;
    if (on) localStorage.setItem(ALL_EDGES_KEY, '1');
    else localStorage.removeItem(ALL_EDGES_KEY);
  } catch {
    // Storage blocked: the choice lasts for this visit only.
  }
}

export interface DrawnEdge {
  from: string;
  to: string;
  /** `up`: from a prerequisite of the selected topic; `down`: to a topic that builds on it; null: unrelated. */
  dir: 'up' | 'down' | null;
}

/** The edges to draw: the selected topic's own, or every edge when `all` is on. */
export function edgesToDraw(edges: readonly { from: string; to: string }[], selected: string | null, all: boolean): DrawnEdge[] {
  const out: DrawnEdge[] = [];
  for (const e of edges) {
    const dir = e.to === selected ? 'up' : e.from === selected ? 'down' : null;
    if (all || dir !== null) out.push({ ...e, dir });
  }
  return out;
}

const AREA_ORDER = Object.keys(AREAS);

/** Label size in map units, and its line height; `.node text` in app.css matches. */
const LABEL_PX = 15;
const LINE_PX = 17;
/**
 * The zoom the map opens at: fit to the width, but never so small that labels drop below
 * about 11 px on screen. At 1280 px, fitting all nine topics of the widest row needs 0.54,
 * which draws labels at 8 px; the learner pans sideways instead, and Fit still shows it all.
 */
const READABLE_SCALE = 0.75;

/** Up to `maxLines` lines of at most `max` characters, breaking at spaces; the rest is cut with an ellipsis. */
export function wrap(title: string, max = 19, maxLines = 3): string[] {
  const words = title.split(' ');
  const lines: string[] = [''];
  for (const w of words) {
    const cur = lines[lines.length - 1] as string;
    if (cur === '' || cur.length + 1 + w.length <= max) lines[lines.length - 1] = cur === '' ? w : `${cur} ${w}`;
    else lines.push(w);
  }
  if (lines.length <= maxLines) return lines;
  const last = lines.slice(maxLines - 1).join(' ');
  return [...lines.slice(0, maxLines - 1), `${last.slice(0, max - 1).trimEnd()}…`];
}

/** A learned topic waiting for its Cambridge gate: its gate problems, each a link to its page. */
function GateLinks({ id }: { id: string }) {
  const gate = gateOf(id);
  if (gate.length === 0) return <p class="small muted">No Cambridge-standard problem is written for this topic yet, so it cannot be mastered until one is.</p>;
  return (
    <>
      <h3 class="small">To master it</h3>
      <p class="small">{gateRule()}</p>
      <ul class="small links">
        {gate.map((pid) => (
          <li key={pid}>
            <button type="button" class="linklike" onClick={() => go({ view: 'problem', topicId: id, problemId: pid })}>{catalogProblem(id, pid)?.title ?? pid}</button>
          </li>
        ))}
      </ul>
    </>
  );
}

function Details({ p, id, status }: { p: Progress; id: string; status: TopicStatus | undefined }) {
  const t = topicOf(id);
  if (t === undefined) return null;
  const written = hasContent(id);
  const mem = p.memory[id];
  const inCourses = coursesWith(id, p.courses).map((x) => shortName(x.id));
  const closure = new Set(closureTopics(p.courses).map((x) => x.id));
  const needs = t.prereqs;
  const neededBy = closureTopics(p.courses).filter((x) => x.prereqs.includes(id)).map((x) => x.id);
  const link = (x: string) => (
    <li key={x}><button type="button" class="linklike" onClick={() => go({ view: 'map', topicId: x })}>{titleOf(x)}</button></li>
  );
  return (
    <div class="details" aria-live="polite">
      <h2>{t.title}</h2>
      <p class="small muted">{LEVEL_NAMES[t.level]}, {AREA_NAMES[t.area] ?? t.area}. In {inCourses.join(' and ') || 'no chosen course'}.</p>
      <p><span class={`status-chip st-${status ?? 'locked'}`}>{status === undefined ? 'Not in your courses' : STATUS_TEXT[status]}</span></p>
      <p><TexText text={t.summary} /></p>
      {mem !== undefined && (
        <p class="small muted">
          Next review {daysFrom(now(), mem.due) <= 0 ? 'is due now' : `in ${daysFrom(now(), mem.due)} day${daysFrom(now(), mem.due) === 1 ? '' : 's'}`}.
          {' '}Reviewed {mem.reps} time{mem.reps === 1 ? '' : 's'} so far.
        </p>
      )}
      <p class="small">{written ? 'Lesson, worked examples, and practice are written.' : 'The lesson is not written yet.'} About {t.estMinutes} minutes.</p>
      {status === 'ready' && written && closure.has(id) && (
        <button type="button" class="btn btn-primary" onClick={() => go({ view: 'learn', topicId: id })}>Learn it now</button>
      )}
      {mem !== undefined && masteryOf(p, id).stage === 'needs-gate' && <GateLinks id={id} />}
      {needs.length > 0 && (<><h3 class="small">Builds on</h3><ul class="small links">{needs.map(link)}</ul></>)}
      {neededBy.length > 0 && (<><h3 class="small">Needed for</h3><ul class="small links">{neededBy.map(link)}</ul></>)}
      <Sources topicId={id} />
    </div>
  );
}

export function MapView({ topicId }: { topicId: string | null }) {
  const p = progress.value;
  const [filter, setFilter] = useState<string>('all');
  const [mode, setMode] = useState<'graph' | 'list'>('graph');
  const [scale, setScale] = useState(0);
  const [allEdges, setAllEdges] = useState(readAllEdges);
  const toggleAllEdges = (on: boolean): void => {
    setAllEdges(on);
    writeAllEdges(on);
  };
  const scroller = useRef<HTMLDivElement>(null);
  const courses = p?.courses ?? [];
  const shown = useMemo(() => closureTopics(filter === 'all' ? courses : [filter]), [filter, courses.join()]);
  const lay = useMemo(() => layout(shown, AREA_ORDER), [shown]);
  const status = useMemo(() => (p === null ? new Map<string, TopicStatus>() : statusMap(p, now())), [p]);

  const fitScale = (): number => Math.max(0.3, Math.min(1, ((scroller.current?.clientWidth ?? 800) - 8) / lay.width));
  const fit = (): void => setScale(fitScale());
  // Rows are centered, so a map wider than the screen opens at its middle, not its empty left edge.
  const center = useRef(false);
  useLayoutEffect(() => {
    if (mode !== 'graph') return;
    setScale(Math.max(READABLE_SCALE, fitScale()));
    center.current = topicId === null;
  }, [lay, mode]);
  useEffect(() => {
    const el = scroller.current;
    if (!center.current || el === null || scale === 0) return;
    center.current = false;
    el.scrollLeft = Math.max(0, (lay.width * scale - el.clientWidth) / 2);
  }, [scale, lay]);

  // Keep the selected topic in view.
  useEffect(() => {
    if (topicId === null || mode !== 'graph' || scroller.current === null) return;
    const n = lay.nodes.get(topicId);
    if (n === undefined) return;
    const el = scroller.current;
    const cx = (n.x + NODE_W / 2) * scale;
    const cy = (n.y + NODE_H / 2) * scale;
    if (cx < el.scrollLeft || cx > el.scrollLeft + el.clientWidth || cy < el.scrollTop || cy > el.scrollTop + el.clientHeight) {
      el.scrollTo({ left: cx - el.clientWidth / 2, top: cy - el.clientHeight / 2 });
    }
  }, [topicId, scale]);

  // Drag with the mouse to pan; touch scrolls natively.
  const drag = useRef<{ x: number; y: number; l: number; t: number } | null>(null);
  const onDown = (e: PointerEvent): void => {
    if (e.pointerType !== 'mouse' || scroller.current === null || (e.target as Element).closest('.node')) return;
    drag.current = { x: e.clientX, y: e.clientY, l: scroller.current.scrollLeft, t: scroller.current.scrollTop };
  };
  const onMove = (e: PointerEvent): void => {
    const d = drag.current;
    if (d === null || scroller.current === null) return;
    scroller.current.scrollLeft = d.l - (e.clientX - d.x);
    scroller.current.scrollTop = d.t - (e.clientY - d.y);
  };
  const onUp = (): void => { drag.current = null; };

  // Escape closes the topic sheet (on a phone it covers the map), like any overlay.
  useEffect(() => {
    if (topicId === null) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape' || e.defaultPrevented || document.querySelector('.modal-layer, .tour-layer') !== null) return;
      e.preventDefault();
      go({ view: 'map', topicId: null });
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [topicId]);

  if (p === null) return null;
  const related = new Set<string>();
  if (topicId !== null) {
    related.add(topicId);
    for (const e of lay.edges) {
      if (e.to === topicId) related.add(e.from);
      if (e.from === topicId) related.add(e.to);
    }
  }
  const counts = (s: TopicStatus): number => shown.filter((t) => status.get(t.id) === s).length;

  return (
    <section class="page map" aria-labelledby="map-title">
      <div class="map-head">
        <h1 id="map-title">Map</h1>
        <div class="map-controls">
          <label class="inline-field small">
            <span class="visually-hidden">Course</span>
            <select value={filter} onChange={(e) => setFilter((e.currentTarget as HTMLSelectElement).value)} aria-label="Show course">
              <option value="all">{courses.length > 1 ? 'Both courses' : 'My course'}</option>
              {courses.length > 1 && courses.map((c) => <option key={c} value={c}>{shortName(c)} only</option>)}
            </select>
          </label>
          <div class="segmented" role="group" aria-label="View">
            <button type="button" class={mode === 'graph' ? 'on' : ''} aria-pressed={mode === 'graph'} onClick={() => setMode('graph')}>Graph</button>
            <button type="button" class={mode === 'list' ? 'on' : ''} aria-pressed={mode === 'list'} onClick={() => setMode('list')}>List</button>
          </div>
          {mode === 'graph' && (
            <label class="toggle small all-edges">
              <input type="checkbox" checked={allEdges} onChange={(e) => toggleAllEdges((e.currentTarget as HTMLInputElement).checked)} />
              <span>Show all connections</span>
            </label>
          )}
          {mode === 'graph' && (
            <div class="segmented" role="group" aria-label="Zoom">
              <button type="button" aria-label="Zoom out" onClick={() => setScale(Math.max(0.25, scale / 1.25))}>−</button>
              <button type="button" onClick={fit}>Fit</button>
              <button type="button" aria-label="Zoom in" onClick={() => setScale(Math.min(2, scale * 1.25))}>+</button>
            </div>
          )}
        </div>
      </div>
      <p class="legend small">
        <span class="status-chip st-mastered">Mastered {counts('mastered')}</span>
        <span class="status-chip st-gate">Needs the Cambridge problem {counts('gate')}</span>
        <span class="status-chip st-due">Review due {counts('due')}</span>
        <span class="status-chip st-ready">Ready {counts('ready')}</span>
        <span class="status-chip st-unwritten">Lesson not written yet {counts('unwritten')}</span>
        <span class="status-chip st-locked">Locked {counts('locked')}</span>
        <span class="muted">
          {shown.length} topics. A dot marks a written lesson.
          {mode === 'graph' && !allEdges && (topicId === null ? ' Choose a topic to see its connections.' : ' Lines show what the chosen topic builds on and what builds on it.')}
        </span>
      </p>
      <div class="map-body">
        {mode === 'graph' ? (
          <div
            ref={scroller}
            class="map-scroll"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerLeave={onUp}
          >
            {scale > 0 && (
              <svg
                class="map-svg"
                width={lay.width * scale}
                height={lay.height * scale}
                viewBox={`0 0 ${lay.width} ${lay.height}`}
                role="img"
                aria-label={`Knowledge map of ${shown.length} topics. Use the List view to read it as text.`}
              >
                {lay.bands.map((b) => (
                  <g key={b.level}>
                    <rect class={`band band-${LEVELS.indexOf(b.level as Topic['level'])}`} x={0} y={b.y} width={lay.width} height={b.height} />
                    <text class="band-label" x={8} y={b.y + 18}>{LEVEL_NAMES[b.level]}</text>
                  </g>
                ))}
                {/* Unrelated edges first, so the selected topic's are drawn on top. */}
                {edgesToDraw(lay.edges, topicId, allEdges).sort((x, y) => Number(x.dir !== null) - Number(y.dir !== null)).map((e) => {
                  const a = lay.nodes.get(e.from);
                  const z = lay.nodes.get(e.to);
                  if (a === undefined || z === undefined) return null;
                  const x1 = a.x + NODE_W / 2;
                  const y1 = a.y + NODE_H;
                  const x2 = z.x + NODE_W / 2;
                  const y2 = z.y;
                  const my = (y1 + y2) / 2;
                  const cls = e.dir === null ? (topicId !== null ? ' faded' : '') : ` hot ${e.dir}`;
                  return <path key={`${e.from}>${e.to}`} class={`edge${cls}`} d={`M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`} />;
                })}
                {shown.map((t) => {
                  const n = lay.nodes.get(t.id);
                  if (n === undefined) return null;
                  const st = status.get(t.id) ?? 'locked';
                  const lines = wrap(t.title);
                  const sel = t.id === topicId;
                  return (
                    <g
                      key={t.id}
                      class={`node st-${st}${sel ? ' selected' : ''}${topicId !== null && !related.has(t.id) ? ' faded' : ''}`}
                      transform={`translate(${n.x},${n.y})`}
                      tabIndex={0}
                      role="button"
                      aria-label={`${t.title}: ${STATUS_TEXT[st]}`}
                      onClick={() => go({ view: 'map', topicId: t.id })}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go({ view: 'map', topicId: t.id }); } }}
                    >
                      <rect width={NODE_W} height={NODE_H} rx={8} />
                      {lines.map((l, i) => <text key={i} x={10} y={(NODE_H - lines.length * LINE_PX) / 2 + LABEL_PX * 0.8 + i * LINE_PX}>{l}</text>)}
                      {hasContent(t.id) && <circle class="has-lesson" cx={NODE_W - 9} cy={9} r={4} />}
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        ) : (
          <div class="map-list">
            {LEVELS.map((lv) => {
              const ts = shown.filter((t) => t.level === lv);
              if (ts.length === 0) return null;
              return (
                <section key={lv}>
                  <h2 class="small">{LEVEL_NAMES[lv]}</h2>
                  <ul>
                    {ts.map((t) => {
                      const st = status.get(t.id) ?? 'locked';
                      return (
                        <li key={t.id}>
                          <button type="button" class={`list-topic${t.id === topicId ? ' selected' : ''}`} onClick={() => go({ view: 'map', topicId: t.id })}>
                            <span class={`status-dot st-${st}`} aria-hidden="true" />
                            <span>{t.title}</span>
                            <span class="small muted">{STATUS_TEXT[st].split(':')[0]}{hasContent(t.id) ? ', lesson written' : ''}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
        <aside class={`map-details${topicId !== null ? ' open' : ''}`} aria-label="Topic details">
          {topicId !== null && <button type="button" class="btn btn-small sheet-close" onClick={() => go({ view: 'map', topicId: null })}>Close</button>}
          {topicId === null
            ? <p class="small muted">Choose a topic to see what it covers, where it is taught, and how far it has got.</p>
            : <Details p={p} id={topicId} status={status.get(topicId)} />}
        </aside>
      </div>
    </section>
  );
}
