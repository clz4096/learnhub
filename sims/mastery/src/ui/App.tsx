/**
 * The app shell (mastery/design-v4.html): five tabs, Today, Course, Admission, Story, and
 * You. A phone gets a bar of tabs at the bottom; a wide screen gets a left rail with the
 * arms and the title, the tabs with their number keys (1 to 5), and the search button.
 * Cmd+K (Ctrl+K) opens the command palette anywhere.
 *
 * Focus mode: a lesson (or review, quiz, or problem), blind mixed review, the gym, and a
 * past paper or ladder rung while its clock runs hide the tabs behind a thin bar with one
 * way back. Escape, or that bar's back
 * button, returns to the screen the learner came from (after a reload, the screen the
 * focus screen belongs to). Leaving keeps a lesson's place, as before.
 *
 * A new learner (no course yet) sees the Start step on every route but the glossary, and
 * the tabs are Home and Glossary; with a course, Home is Today (decision 20).
 *
 * Dialogs (help, a glossary term, the tour, the palette) close whenever the route changes,
 * so the browser's Back never leaves one open over a view it does not belong to.
 *
 * Story mode's scenes play over everything (StoryPlayer), started by the story director
 * when real progress triggers one; the tour waits until no scene is playing or due.
 */
import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { activeSitting } from '@/model/campaign';
import { campaign } from '@/model/campaignStore';
import { runningExam } from '@/model/ladderNext';
import { ladder } from '@/model/ladderStore';
import { placeOf } from '@learnhub/content/book';
import { go, hrefOf, listen, route, type Route } from '@/model/route';
import {
  TABS, backLabel, focusOf, isPaletteKey, isTyping, naturalParent, recentOf, tabOf, type FocusKind, type TabId,
} from '@/model/shell';
import { loadErrors, loadState, loadWarnings, now, progress, saveError, volatile } from '@/model/store';
import { HelpDialog, Tour } from '@/ui/help/Help';
import { autoStartTour, closeTour, helpOpen, tour } from '@/ui/help/state';
import { BackLink } from '@/ui/BackLink';
import { TermDialog } from '@/ui/TermDialog';
import { closeTerm, termOpen } from '@/ui/termState';
import { GlossaryView } from '@/ui/views/Glossary';
import { BookView, ChapterView } from '@/ui/views/Book';
import { MapView } from '@/ui/views/MapView';
import { StartOver } from '@/ui/views/ProgressView';
import { YouView } from '@/ui/views/You';
import { Start } from '@/ui/views/Start';
import { LearnView, TaskView } from '@/ui/views/Task';
import { ProblemView } from '@/ui/views/Lesson';
import { Today } from '@/ui/views/Today';
import { CampaignView, PapersView } from '@/ui/views/Campaign';
import { PaperView } from '@/ui/views/Paper';
import { LadderView } from '@/ui/views/Ladder';
import { MixedReviewView } from '@/ui/views/MixedReview';
import { admissions } from '@/ui/campaignShared';
import { ReportView } from '@/ui/views/Report';
import { LettersView } from '@/ui/views/Letters';
import { StoryView } from '@/ui/views/Story';
import { StandupView } from '@/ui/views/Standup';
import { GymView } from '@/ui/views/Gym';
import { StoryPlayer } from '@/ui/story/Player';
import { useStoryDirector } from '@/ui/story/director';
import { playing } from '@/model/storyStore';
import { Arms, SealDefs } from '@/ui/Seal';
import { SearchIcon, TabIcon } from '@/ui/shell/Icons';
import { Palette, timedPaperRoute } from '@/ui/shell/Palette';
import { RestTimer } from '@/ui/shell/RestTimer';
import { addRecent, focusOrigin, paletteOpen } from '@/ui/shell/state';

/** The displayed name; ids, routes, and storage keys keep "mastery". */
export const APP_TITLE = 'Computational Mathematics at the University of Cambridge';

/** Where Home goes: the Start step until a course is chosen, then Today. */
export function homeRoute(setUp: boolean): Route {
  return setUp ? { view: 'today' } : { view: 'start' };
}

/** The `data-nav` id of each tab; Today is "home", the way home from anywhere. */
const NAV_ID: Readonly<Record<TabId, string>> = { today: 'home', course: 'course', admission: 'admission', story: 'story', you: 'you' };

/** The palette's key, shown as the Mac writes it, or Ctrl+K elsewhere. */
const isMac = (): boolean => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const paletteKey = (): string => (isMac() ? '⌘K' : 'Ctrl K');

/** A link that moves within the app: a real href (open in a new tab works), handled by `go`. */
function NavLink({ to, children, ...rest }: { to: Route; children: ComponentChildren; class?: string; 'data-nav'?: string; 'aria-current'?: 'page'; 'aria-label'?: string }) {
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
    case 'progress': return <YouView />;
    case 'glossary': return <GlossaryView termId={r.termId} />;
    case 'gym': return <GymView />;
    // Only reached with a course chosen (see App), so the progress document is loaded.
    case 'campaign': return progress.value === null ? <Today /> : <CampaignView p={progress.value} />;
    case 'papers': return progress.value === null ? <Today /> : <PapersView p={progress.value} />;
    case 'paper': return <PaperView key={r.paperId} paperId={r.paperId} />;
    case 'ladder': return <LadderView key={r.exam} exam={r.exam} />;
    case 'mixed': return <MixedReviewView />;
    case 'report': return progress.value === null ? <Today /> : <ReportView p={progress.value} />;
    case 'letters': return progress.value === null ? <Today /> : <LettersView p={progress.value} />;
    case 'story': return progress.value === null ? <Today /> : <StoryView p={progress.value} />;
    case 'standup': return <StandupView />;
  }
}

const FOCUS_LABEL: Readonly<Record<FocusKind, string>> = { lesson: '', gym: 'gym · REP ×0.5', paper: 'timed · no hints', mixed: 'mixed review · topic hidden' };

/** The exam whose ladder rung is running, if any, for focus mode. */
const ladderRunning = (): string | null => runningExam(admissions.value, ladder.value);

/** Leaves a focus screen for where the learner came from. */
export function exitFocus(): void {
  const r = route.peek();
  go(focusOrigin.peek() ?? naturalParent(r, (id) => placeOf(id)?.chapter.id));
}

function FocusBar({ kind }: { kind: FocusKind }) {
  const r = route.value;
  const to = focusOrigin.value ?? naturalParent(r, (id) => placeOf(id)?.chapter.id);
  return (
    <div class="ds-fbar" role="navigation" aria-label="Focus mode">
      <button type="button" class="ds-fbar-back" onClick={exitFocus} aria-label={`Back to ${backLabel(to)} (Escape)`}>
        <span aria-hidden="true">← </span>{backLabel(to)}
      </button>
      <span class="ds-fbar-mid">{FOCUS_LABEL[kind]}</span>
      {kind === 'gym'
        ? <RestTimer />
        : <button type="button" class="ds-fbar-k" onClick={() => { paletteOpen.value = true; }} aria-label={`Search (${paletteKey()})`}>{paletteKey()}</button>}
    </div>
  );
}

/** Something is open over the page that takes Escape and the keys for itself. */
const overlayOpen = (): boolean =>
  paletteOpen.peek() || playing.peek() !== null || helpOpen.peek() || termOpen.peek() !== null || tour.peek().open
  || (typeof document !== 'undefined' && document.querySelector('.modal-layer, .tour-layer, .map-details.open') !== null);

export function App() {
  useEffect(() => listen(), []);
  const r = route.value;
  const p = progress.value;
  const setUp = p !== null && p.courses.length > 0;
  const ready = loadState.value === 'ready';
  const running = campaign.value === null ? undefined : activeSitting(campaign.value);
  const focus = setUp ? focusOf(r, running?.paperId ?? null, ladderRunning()) : null;

  // Declared before the tour's auto start, so arriving at Today closes nothing it opens.
  const href = hrefOf(r);
  const prev = useRef<{ r: Route; focus: boolean } | null>(null);
  useEffect(() => {
    closeTerm();
    helpOpen.value = false;
    paletteOpen.value = false;
    if (tour.value.open) closeTour();
    // Remember where a focus screen was entered from; forget it on leaving focus mode.
    const before = prev.current;
    if (focus === null || before === null) focusOrigin.value = null;
    else if (!before.focus) focusOrigin.value = before.r;
    prev.current = { r, focus: focus !== null };
    const recent = recentOf(r, now());
    if (recent !== null) addRecent(recent);
  }, [href]);

  // Declared before the tour's auto start, so a scene that starts now holds the tour back.
  useStoryDirector(ready, r, href);
  const scene = playing.value !== null;

  useEffect(() => {
    if (ready && setUp && r.view === 'today' && playing.peek() === null) autoStartTour();
  }, [ready, setUp, r.view, scene]);

  // Name the view shown in the URL (replacing, not adding, the entry): Start for a new
  // learner on any URL but the glossary, Today for a learner with a course at #/start.
  // The route is read when the effect runs, not when it was scheduled: a click on Home in
  // between must not be overwritten by a redirect meant for the URL before it.
  useEffect(() => {
    const at = route.peek().view;
    if (!ready) return;
    if (setUp ? at === 'start' : at !== 'start' && at !== 'glossary') go(homeRoute(setUp), { replace: true });
  }, [ready, setUp, href]);

  // The keys that work everywhere: the palette, Escape out of focus mode, 1 to 5 for the
  // tabs, G for the gym, and T for a timed paper. Single keys never act while typing.
  useEffect(() => {
    const on = (e: KeyboardEvent): void => {
      if (isPaletteKey(e)) {
        if (playing.peek() !== null) return;
        e.preventDefault();
        paletteOpen.value = !paletteOpen.peek();
        return;
      }
      if (e.defaultPrevented || overlayOpen()) return;
      const doc = progress.peek();
      if (doc === null || doc.courses.length === 0) return;
      const c = campaign.peek();
      const inFocus = focusOf(route.peek(), c === null ? null : activeSitting(c)?.paperId ?? null, runningExam(admissions.peek(), ladder.peek())) !== null;
      if (e.key === 'Escape') {
        if (inFocus && !isTyping(e.target)) { e.preventDefault(); exitFocus(); }
        return;
      }
      if (inFocus || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      const tab = TABS.find((t) => t.key === e.key);
      if (tab !== undefined) { e.preventDefault(); go(tab.to); return; }
      if (e.key === 'g' || e.key === 'G') { e.preventDefault(); go({ view: 'gym' }); return; }
      if (e.key === 't' || e.key === 'T') { e.preventDefault(); go(timedPaperRoute()); }
    };
    document.addEventListener('keydown', on);
    return () => document.removeEventListener('keydown', on);
  }, []);

  let body;
  if (loadState.value === 'loading') body = <p class="page">Loading progress.</p>;
  else if (loadState.value === 'error') {
    body = (
      <section class="page">
        <h1>The saved progress could not be read</h1>
        <p>Nothing has been changed or erased. What is wrong:</p>
        <ul class="error small">{loadErrors.value.map((e, i) => <li key={i}>{e}</li>)}</ul>
        <p>With an exported progress file, start over here and then import it in Progress.</p>
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

  const active = tabOf(r);
  const home = homeRoute(setUp);
  const k = paletteKey();
  return (
    <>
      <div class={`app${focus !== null ? ' focus' : ''}`} inert={scene || paletteOpen.value}>
        <a class="skip-link" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to content</a>
        <SealDefs />
        {focus === null && (
          <nav class="ds-nav" aria-label="Main">
            <div class="ds-brand">
              <Arms class="ds-arms" />
              <NavLink to={home} class="app-title" aria-label={`${APP_TITLE}, home`}>
                <b>Computational Mathematics</b><span>University of Cambridge</span>
              </NavLink>
            </div>
            {setUp
              ? TABS.map((t) => (
                <NavLink
                  key={t.id} to={t.to} data-nav={NAV_ID[t.id]} class={`ds-tab${active === t.id ? ' on' : ''}`}
                  aria-current={active === t.id ? 'page' : undefined}
                >
                  <TabIcon id={t.id} /><span class="ds-tab-l">{t.label}</span><kbd aria-hidden="true">{t.key}</kbd>
                </NavLink>
              ))
              : (
                <>
                  <NavLink to={home} data-nav="home" class={`ds-tab${r.view !== 'glossary' ? ' on' : ''}`} aria-current={r.view !== 'glossary' ? 'page' : undefined}>
                    <TabIcon id="today" /><span class="ds-tab-l">Home</span>
                  </NavLink>
                  <NavLink to={{ view: 'glossary', termId: null }} data-nav="glossary" class={`ds-tab${r.view === 'glossary' ? ' on' : ''}`} aria-current={r.view === 'glossary' ? 'page' : undefined}>
                    <TabIcon id="course" /><span class="ds-tab-l">Glossary</span>
                  </NavLink>
                </>
              )}
            {setUp && (
              <button type="button" class="ds-kbtn" onClick={() => { paletteOpen.value = true; }} aria-label={`Search or jump to (${k})`}>
                <SearchIcon /><span>Search or jump to…</span><kbd aria-hidden="true">{k}</kbd>
              </button>
            )}
          </nav>
        )}
        <div class="ds-main">
          {focus !== null && <FocusBar kind={focus} />}
          {focus === null && setUp && (
            <button type="button" class="ds-msearch" onClick={() => { paletteOpen.value = true; }} aria-label="Search or jump to">
              <SearchIcon />
            </button>
          )}
          {volatile.value && <p class="banner warning small">This browser does not offer storage here, so progress will be lost when the tab closes. Export a file in You to keep it.</p>}
          {saveError.value !== null && <p class="banner error small" role="alert">Saving failed: {saveError.value}. Export a progress file to keep the work.</p>}
          {loadWarnings.value.length > 0 && <p class="banner warning small">Some saved data was out of date and was dropped: {loadWarnings.value.slice(0, 3).join('; ')}.</p>}
          <main id="main" tabIndex={-1}>{body}</main>
        </div>
        <TermDialog />
        <HelpDialog />
        <Tour />
      </div>
      <Palette />
      <StoryPlayer />
    </>
  );
}
