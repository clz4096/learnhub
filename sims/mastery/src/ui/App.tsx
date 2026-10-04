/**
 * The app shell: header with navigation, the current view, and the dialogs. A new
 * learner (no courses yet) or one still in placement always sees Start.
 */
import { useEffect } from 'preact/hooks';
import { go, listen, route, type Route } from '@/model/route';
import { loadErrors, loadState, loadWarnings, progress, saveError, volatile } from '@/model/store';
import { HelpDialog, Tour } from '@/ui/help/Help';
import { autoStartTour, helpOpen } from '@/ui/help/state';
import { TermDialog } from '@/ui/TermDialog';
import { GlossaryView } from '@/ui/views/Glossary';
import { MapView } from '@/ui/views/MapView';
import { ProgressView, StartOver } from '@/ui/views/ProgressView';
import { Start } from '@/ui/views/Start';
import { LearnView, TaskView } from '@/ui/views/Task';
import { Today } from '@/ui/views/Today';

const NAV: { id: 'today' | 'map' | 'progress' | 'glossary'; label: string; to: Route }[] = [
  { id: 'today', label: 'Today', to: { view: 'today' } },
  { id: 'map', label: 'Map', to: { view: 'map', topicId: null } },
  { id: 'progress', label: 'Progress', to: { view: 'progress' } },
  { id: 'glossary', label: 'Glossary', to: { view: 'glossary', termId: null } },
];

function navOf(r: Route): string {
  if (r.view === 'task' || r.view === 'today') return 'today';
  if (r.view === 'learn') return 'map';
  return r.view;
}

function View({ r }: { r: Route }) {
  switch (r.view) {
    case 'today': return <Today />;
    case 'start': return <Start />;
    case 'task': return <TaskView index={r.index} />;
    case 'learn': return <LearnView topicId={r.topicId} />;
    case 'map': return <MapView topicId={r.topicId} />;
    case 'progress': return <ProgressView />;
    case 'glossary': return <GlossaryView termId={r.termId} />;
  }
}

export function App() {
  useEffect(() => listen(), []);
  const r = route.value;
  const p = progress.value;
  const setUp = p !== null && p.courses.length > 0;
  const placed = setUp && p.placement?.done === true;
  const ready = loadState.value === 'ready';

  useEffect(() => {
    if (ready && placed && r.view === 'today') autoStartTour();
  }, [ready, placed, r.view]);

  let body;
  if (loadState.value === 'loading') body = <p class="page">Loading your progress.</p>;
  else if (loadState.value === 'error') {
    body = (
      <section class="page">
        <h1>Your saved progress could not be read</h1>
        <p>Nothing has been changed or erased. What is wrong:</p>
        <ul class="error small">{loadErrors.value.map((e, i) => <li key={i}>{e}</li>)}</ul>
        <p>If you have an exported progress file, you can start over here and then import it in Progress.</p>
        <StartOver />
      </section>
    );
  } else if (!placed && r.view !== 'glossary') body = <Start />;
  else body = <View r={r} />;

  const active = navOf(r);
  return (
    <div class="app">
      <a class="skip-link" href="#main">Skip to content</a>
      <header class="top">
        <a class="app-title" href="#/">Mastery courses</a>
        {placed && (
          <nav class="nav" aria-label="Main">
            {NAV.map((n) => (
              <a key={n.id} href={`#${n.id === 'today' ? '/' : `/${n.id}`}`} data-nav={n.id} class={active === n.id ? 'on' : ''}
                aria-current={active === n.id ? 'page' : undefined}
                onClick={(e) => { e.preventDefault(); go(n.to); }}>
                {n.label}
              </a>
            ))}
          </nav>
        )}
        <button type="button" class="btn help-button" onClick={() => { helpOpen.value = true; }}>Help</button>
      </header>
      {volatile.value && <p class="banner warning small">This browser does not offer storage here, so progress will be lost when the tab closes. Export a file in Progress to keep it.</p>}
      {saveError.value !== null && <p class="banner error small" role="alert">Saving failed: {saveError.value}. Export a progress file to keep your work.</p>}
      {loadWarnings.value.length > 0 && <p class="banner warning small">Some saved data was out of date and was dropped: {loadWarnings.value.slice(0, 3).join('; ')}.</p>}
      <main id="main" tabIndex={-1}>{body}</main>
      <TermDialog />
      <HelpDialog />
      <Tour />
    </div>
  );
}
