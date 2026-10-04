import { useEffect, useState } from 'preact/hooks';
import {
  isCatalog, lessonsLabel, levelLabel, minutesLabel, readyTools, trackLabel, tracksOf,
  type Tool,
} from '@/catalog';

type Load = { state: 'loading' } | { state: 'error' } | { state: 'done'; tools: Tool[] };

/** Fetches catalog.json next to index.html, so the site works under any base path. */
export function App({ src = './catalog.json' }: { src?: string }) {
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  useEffect(() => {
    let live = true;
    fetch(src)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((v: unknown) => {
        if (!isCatalog(v)) throw new Error('catalog.json has no tools array');
        if (live) setLoad({ state: 'done', tools: readyTools(v) });
      })
      .catch(() => { if (live) setLoad({ state: 'error' }); });
    return () => { live = false; };
  }, [src]);

  return (
    <>
      <a class="skip" href="#tools">Skip to tools</a>
      <header class="site-head">
        <div class="wrap">
          <h1>learnhub</h1>
          <p class="lede">
            Interactive tools for learning systems, math, and computer science, each checked against real measurements.
          </p>
        </div>
      </header>
      <main id="tools" class="wrap" tabIndex={-1}>
        {load.state === 'loading' && <p class="muted" role="status">Loading tools…</p>}
        {load.state === 'error' && (
          <p class="notice-error" role="alert">Could not load the list of tools. Reload the page to try again.</p>
        )}
        {load.state === 'done' && <Catalog tools={load.tools} />}
      </main>
    </>
  );
}

/** The tool list with its track filter. Expects ready tools only. */
export function Catalog({ tools }: { tools: Tool[] }) {
  const [track, setTrack] = useState<string | null>(null);
  if (tools.length === 0) return <p class="muted">No tools are ready yet.</p>;

  const tracks = tracksOf(tools);
  const shown = track === null ? tools : tools.filter((t) => t.tracks.includes(track));
  // A filter over one tool changes nothing, so it only appears once there is a choice to make.
  const filterable = tools.length > 1;

  return (
    <section aria-labelledby="tools-heading">
      <div class="list-head">
        <h2 id="tools-heading">Tools</h2>
        {filterable && (
          <p class="muted small" role="status">
            {shown.length === tools.length ? `${tools.length} tools` : `${shown.length} of ${tools.length} tools`}
          </p>
        )}
      </div>
      {filterable && (
        <div class="filter" role="group" aria-label="Filter by track">
          <button type="button" class="chip-btn" aria-pressed={track === null} onClick={() => setTrack(null)}>
            All tracks
          </button>
          {tracks.map((k) => (
            <button key={k} type="button" class="chip-btn" aria-pressed={track === k} onClick={() => setTrack(k)}>
              {trackLabel(k)}
            </button>
          ))}
        </div>
      )}
      <ul class="cards">
        {shown.map((t) => (
          <li key={t.id}>
            <ToolCard tool={t} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ToolCard({ tool }: { tool: Tool }) {
  const headingId = `tool-${tool.id}`;
  return (
    <article class="card" aria-labelledby={headingId}>
      <div class="card-main">
        <h3 id={headingId}>{tool.title}</h3>
        <p class="summary">{tool.summary}</p>
        <ul class="chips" aria-label="Tracks">
          {tool.tracks.map((k) => <li key={k} class="chip">{trackLabel(k)}</li>)}
        </ul>
        <dl class="facts">
          <div><dt>Type</dt><dd>{levelLabel(tool.level)}</dd></div>
          <div><dt>Time</dt><dd>{minutesLabel(tool.minutes)}</dd></div>
          <div><dt>Lessons</dt><dd>{lessonsLabel(tool.lessons)}</dd></div>
        </dl>
        <ProgressSlot tool={tool} />
      </div>
      <div class="card-side">
        <a class="btn btn-primary btn-open" href={tool.href} aria-label={`Open ${tool.title}`}>
          Open
        </a>
        {tool.materials.length > 0 && (
          <nav class="materials" aria-label={`Materials for ${tool.title}`}>
            <h4>Materials</h4>
            <ul>
              {tool.materials.map((m) => <li key={m.href}><a href={m.href}>{m.label}</a></li>)}
            </ul>
          </nav>
        )}
      </div>
    </article>
  );
}

/** Lessons done for this tool. Filled in by MVP step 4 (learnhub.progress.<id>); renders nothing until then. */
export function ProgressSlot(_props: { tool: Tool }) {
  return null;
}
