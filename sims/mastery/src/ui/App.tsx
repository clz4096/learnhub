/**
 * The app shell: header with navigation, the current view, and the dialogs. A new
 * learner (no courses yet) or one still in placement sees the Start step for the route
 * (#/start for courses and minutes, anything else for placement), or the glossary.
 *
 * Every screen has the same way home (design decision 19a): the header is always shown,
 * its title goes home, and the navigation starts with Home. Home is the Start step until
 * placement is done (it offers to resume the test, whose answers are kept) and Today
 * after. Leaving a lesson or the test by Home keeps its place, as the Back links do.
 *
 * Dialogs (help, a glossary term, the tour) close whenever the route changes, so the
 * browser's Back never leaves one open over a view it does not belong to.
 */
import type { ComponentChildren } from 'preact';
import { useEffect } from 'preact/hooks';
import { go, hrefOf, listen, route, type Route } from '@/model/route';
import { loadErrors, loadState, loadWarnings, progress, saveError, volatile } from '@/model/store';
import { HelpDialog, Tour } from '@/ui/help/Help';
import { autoStartTour, closeTour, helpOpen, tour } from '@/ui/help/state';
import { BackLink } from '@/ui/BackLink';
import { TermDialog } from '@/ui/TermDialog';
import { closeTerm } from '@/ui/termState';
import { GlossaryView } from '@/ui/views/Glossary';
import { MapView } from '@/ui/views/MapView';
import { ProgressView, StartOver } from '@/ui/views/ProgressView';
import { Start } from '@/ui/views/Start';
import { LearnView, TaskView } from '@/ui/views/Task';
import { Today } from '@/ui/views/Today';

type NavId = 'home' | 'map' | 'progress' | 'glossary';

/** Where Home goes: the Start step until placement is done, then Today. */
export function homeRoute(placed: boolean): Route {
  return placed ? { view: 'today' } : { view: 'start' };
}

/** The navigation items: before placement only Home and the glossary can be visited. */
function navItems(placed: boolean): { id: NavId; label: string; to: Route }[] {
  const glossary = { id: 'glossary' as const, label: 'Glossary', to: { view: 'glossary', termId: null } as Route };
  if (!placed) return [{ id: 'home', label: 'Home', to: homeRoute(false) }, glossary];
  return [
    { id: 'home', label: 'Home', to: homeRoute(true) },
    { id: 'map', label: 'Map', to: { view: 'map', topicId: null } },
    { id: 'progress', label: 'Progress', to: { view: 'progress' } },
    glossary,
  ];
}

function navOf(r: Route): NavId {
  if (r.view === 'task' || r.view === 'today' || r.view === 'start' || r.view === 'placement') return 'home';
  if (r.view === 'learn') return 'map';
  return r.view;
}

/** A link that moves within the app: a real href (open in a new tab works), handled by `go`. */
function NavLink({ to, children, ...rest }: { to: Route; children: ComponentChildren; class?: string; 'data-nav'?: string; 'aria-current'?: 'page' }) {
  return (
    <a href={hrefOf(to)} {...rest} onClick={(e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      go(to);
    }}>
      {children}
    </a>
  );
}

function View({ r }: { r: Route }) {
  switch (r.view) {
    case 'today': return <Today />;
    case 'start': return <Start step="courses" />;
    case 'placement': return <Start step="placement" />;
    case 'task': return <TaskView index={r.index} />;
    case 'learn': return <LearnView key={r.topicId} topicId={r.topicId} />;
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

  // Declared before the tour's auto start, so arriving at Today closes nothing it opens.
  const href = hrefOf(r);
  useEffect(() => {
    closeTerm();
    helpOpen.value = false;
    if (tour.value.open) closeTour();
  }, [href]);

  useEffect(() => {
    if (ready && placed && r.view === 'today') autoStartTour();
  }, [ready, placed, r.view]);

  // Before placement is done, any other URL shows a Start step: name that step in the URL
  // (replacing, not adding, the entry), so Back from the test reaches the courses step
  // instead of a URL that shows the test again.
  // The route is read when the effect runs, not when it was scheduled: a click on Home in
  // between must not be overwritten by a redirect meant for the URL before it.
  useEffect(() => {
    const now = route.peek().view;
    if (!ready || placed || now === 'start' || now === 'placement' || now === 'glossary') return;
    go({ view: setUp ? 'placement' : 'start' }, { replace: true });
  }, [ready, placed, setUp, href]);

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
  } else if (!placed && r.view !== 'glossary') body = <Start step={r.view === 'start' ? 'courses' : 'placement'} />;
  else if (!placed) {
    // Before placement the glossary is the only other place to go, so it also offers the way back to the test.
    body = (
      <>
        <div class="page"><BackLink to={{ view: setUp ? 'placement' : 'start' }} label={setUp ? 'Back to the placement test' : 'Back to the start'} /></div>
        <View r={r} />
      </>
    );
  } else body = <View r={r} />;

  const active = navOf(r);
  const home = homeRoute(placed);
  return (
    <div class="app">
      <a class="skip-link" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to content</a>
      <header class="top">
        <NavLink to={home} class="app-title">Mastery courses</NavLink>
        <nav class="nav" aria-label="Main">
          {navItems(placed).map((n) => (
            <NavLink key={n.id} to={n.to} data-nav={n.id} class={active === n.id ? 'on' : ''} aria-current={active === n.id ? 'page' : undefined}>
              {n.label}
            </NavLink>
          ))}
        </nav>
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
