/**
 * The app shell, in the minimalist look: the course title, a row of text tabs (Today,
 * Course, Campaign, Report, Letters), the current view in a reading column, and a footer
 * with Progress, the glossary, Help, and the theme. A new learner (no course yet) sees the
 * Start step on every route but the glossary; a learner with a course goes to Today, and
 * #/start is no longer a step for them (decision 20).
 *
 * Every screen has the same way home (design decision 19a): the header is always shown,
 * its title goes home, and the tabs start with it. Home is the Start step until a course
 * is chosen and Today after. Leaving a lesson by Home keeps its place, as the Back links do.
 *
 * Dialogs (help, a glossary term, the tour) close whenever the route changes, so the
 * browser's Back never leaves one open over a view it does not belong to.
 */
import type { ComponentChildren } from 'preact';
import { useEffect } from 'preact/hooks';
import { go, hrefOf, listen, route, type Route } from '@/model/route';
import { loadErrors, loadState, loadWarnings, progress, saveError, volatile } from '@/model/store';
import { setTheme, theme, type Theme } from '@/model/theme';
import { HelpDialog, Tour } from '@/ui/help/Help';
import { autoStartTour, closeTour, helpOpen, tour } from '@/ui/help/state';
import { BackLink } from '@/ui/BackLink';
import { TermDialog } from '@/ui/TermDialog';
import { closeTerm } from '@/ui/termState';
import { GlossaryView } from '@/ui/views/Glossary';
import { BookView, ChapterView } from '@/ui/views/Book';
import { MapView } from '@/ui/views/MapView';
import { ProgressView, StartOver } from '@/ui/views/ProgressView';
import { Start } from '@/ui/views/Start';
import { LearnView, TaskView } from '@/ui/views/Task';
import { ProblemView } from '@/ui/views/Lesson';
import { Today } from '@/ui/views/Today';
import { CampaignView } from '@/ui/views/Campaign';
import { PaperView } from '@/ui/views/Paper';
import { ReportView } from '@/ui/views/Report';
import { LettersView } from '@/ui/views/Letters';
import { Arms, SealDefs } from '@/ui/Seal';

type NavId = 'home' | 'map' | 'progress' | 'glossary' | 'campaign' | 'report' | 'letters';

/** The displayed name; ids, routes, and storage keys keep "mastery". */
export const APP_TITLE = 'Computational Mathematics at the University of Cambridge';

const THEMES: readonly Theme[] = ['system', 'light', 'dark'];

/** Where Home goes: the Start step until a course is chosen, then Today. */
export function homeRoute(setUp: boolean): Route {
  return setUp ? { view: 'today' } : { view: 'start' };
}

type NavItem = { id: NavId; label: string; to: Route };
const GLOSSARY: NavItem = { id: 'glossary', label: 'Glossary', to: { view: 'glossary', termId: null } };

/** The tabs: before a course is chosen only Home and the glossary can be visited. */
function navItems(setUp: boolean): NavItem[] {
  if (!setUp) return [{ id: 'home', label: 'Home', to: homeRoute(false) }, GLOSSARY];
  return [
    { id: 'home', label: 'Today', to: homeRoute(true) },
    { id: 'map', label: 'Course', to: { view: 'book' } },
    { id: 'campaign', label: 'Campaign', to: { view: 'campaign' } },
    { id: 'report', label: 'Report', to: { view: 'report' } },
    { id: 'letters', label: 'Letters', to: { view: 'letters' } },
  ];
}

/** The footer's links, once a course is chosen (before, the glossary is a tab). */
const FOOT_ITEMS: readonly NavItem[] = [{ id: 'progress', label: 'Progress', to: { view: 'progress' } }, GLOSSARY];

function navOf(r: Route): NavId {
  if (r.view === 'task' || r.view === 'today' || r.view === 'start' || r.view === 'problem') return 'home';
  if (r.view === 'learn' || r.view === 'book' || r.view === 'chapter') return 'map';
  if (r.view === 'paper') return 'campaign';
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
    // A learner with a course has no start step: App moves the URL on to Today.
    case 'start': return <Today />;
    case 'task': return <TaskView index={r.index} />;
    case 'learn': return <LearnView key={r.topicId} topicId={r.topicId} fromBook={r.from === 'book'} />;
    case 'book': return <BookView />;
    case 'chapter': return <ChapterView key={r.chapterId} chapterId={r.chapterId} />;
    case 'problem': return <ProblemView key={`${r.topicId}/${r.problemId}`} topicId={r.topicId} problemId={r.problemId} />;
    case 'map': return <MapView topicId={r.topicId} />;
    case 'progress': return <ProgressView />;
    case 'glossary': return <GlossaryView termId={r.termId} />;
    // Only reached with a course chosen (see App), so the progress document is loaded.
    case 'campaign': return progress.value === null ? <Today /> : <CampaignView p={progress.value} />;
    case 'paper': return <PaperView key={r.paperId} paperId={r.paperId} />;
    case 'report': return progress.value === null ? <Today /> : <ReportView p={progress.value} />;
    case 'letters': return progress.value === null ? <Today /> : <LettersView p={progress.value} />;
  }
}

export function App() {
  useEffect(() => listen(), []);
  const r = route.value;
  const p = progress.value;
  const setUp = p !== null && p.courses.length > 0;
  const ready = loadState.value === 'ready';

  // Declared before the tour's auto start, so arriving at Today closes nothing it opens.
  const href = hrefOf(r);
  useEffect(() => {
    closeTerm();
    helpOpen.value = false;
    if (tour.value.open) closeTour();
  }, [href]);

  useEffect(() => {
    if (ready && setUp && r.view === 'today') autoStartTour();
  }, [ready, setUp, r.view]);

  // Name the view shown in the URL (replacing, not adding, the entry): Start for a new
  // learner on any URL but the glossary, Today for a learner with a course at #/start.
  // The route is read when the effect runs, not when it was scheduled: a click on Home in
  // between must not be overwritten by a redirect meant for the URL before it.
  useEffect(() => {
    const now = route.peek().view;
    if (!ready) return;
    if (setUp ? now === 'start' : now !== 'start' && now !== 'glossary') go(homeRoute(setUp), { replace: true });
  }, [ready, setUp, href]);

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
  } else if (!setUp && r.view !== 'glossary') body = <Start />;
  else if (!setUp) {
    // Before a course is chosen the glossary is the only other place to go, so it also offers the way back.
    body = (
      <>
        <div class="page"><BackLink to={{ view: 'start' }} label="Back to the start" /></div>
        <View r={r} />
      </>
    );
  } else body = <View r={r} />;

  const active = navOf(r);
  const home = homeRoute(setUp);
  const link = (n: NavItem) => (
    <NavLink key={n.id} to={n.to} data-nav={n.id} class={active === n.id ? 'on' : ''} aria-current={active === n.id ? 'page' : undefined}>
      {n.label}
    </NavLink>
  );
  const t = theme.value;
  return (
    <div class="app">
      <a class="skip-link" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to content</a>
      <SealDefs />
      <header class="top">
        <div class="brand">
          <Arms class="brand-arms" />
          <NavLink to={home} class="app-title">{APP_TITLE}</NavLink>
        </div>
        <nav class="nav" aria-label="Main">{navItems(setUp).map(link)}</nav>
      </header>
      {volatile.value && <p class="banner warning small">This browser does not offer storage here, so progress will be lost when the tab closes. Export a file in Progress to keep it.</p>}
      {saveError.value !== null && <p class="banner error small" role="alert">Saving failed: {saveError.value}. Export a progress file to keep your work.</p>}
      {loadWarnings.value.length > 0 && <p class="banner warning small">Some saved data was out of date and was dropped: {loadWarnings.value.slice(0, 3).join('; ')}.</p>}
      <main id="main" tabIndex={-1}>{body}</main>
      <footer class="app-foot">
        {setUp && <nav class="foot-nav" aria-label="More">{FOOT_ITEMS.map(link)}</nav>}
        <button type="button" class="foot-btn help-button" onClick={() => { helpOpen.value = true; }}>Help</button>
        <button
          type="button" class="foot-btn theme-button"
          onClick={() => setTheme(THEMES[(THEMES.indexOf(t) + 1) % THEMES.length] as Theme)}
        >
          Theme: {t}
        </button>
      </footer>
      <TermDialog />
      <HelpDialog />
      <Tour />
    </div>
  );
}
