/**
 * App shell. Desktop (≥ 1024 px): config | view | metrics columns over a bottom bar.
 * Tablet: view on top, config and metrics side by side below. Phone (< 700 px): one
 * tab at a time (Config | Workload | View | Metrics | Code); the bottom bar stays.
 */
import { useEffect } from 'preact/hooks';
import { Controller, controller, setController } from '@/ui/controller';
import { createWorkerClient, type SimClient } from '@/ui/simClient';
import {
  layout, layoutFor, mode, phoneTab, reducedMotion, showBreakdown, workerError, workerNotice,
  type Mode, type PhoneTab,
} from '@/ui/state';
import { CenterView } from '@/ui/center/CenterView';
import { HardwarePanel } from '@/ui/panels/HardwarePanel';
import { WorkloadPanel } from '@/ui/panels/WorkloadPanel';
import { CodePanel } from '@/ui/panels/CodePanel';
import { TryItPanel } from '@/ui/panels/TryItPanel';
import { MetricsPanel } from '@/ui/panels/MetricsPanel';
import { CurrentAccess } from '@/ui/panels/CurrentAccess';
import { AddressBreakdown } from '@/ui/panels/AddressBreakdown';
import { BottomBar } from '@/ui/panels/BottomBar';
import { GuidedPanel } from '@/ui/modes/GuidedPanel';
import { ExplainPanel } from '@/ui/modes/ExplainPanel';
import { GlossaryPanel } from '@/ui/modes/GlossaryPanel';
import { HelpButton, HelpLayer } from '@/ui/help/Help';

const MODES: Array<{ id: Mode; label: string }> = [
  { id: 'free', label: 'Free' }, { id: 'guided', label: 'Guided' },
  { id: 'explain', label: 'Explain' }, { id: 'glossary', label: 'Glossary' },
];
const TABS: Array<{ id: PhoneTab; label: string }> = [
  { id: 'config', label: 'Config' }, { id: 'workload', label: 'Workload' }, { id: 'view', label: 'View' },
  { id: 'metrics', label: 'Metrics' }, { id: 'code', label: 'Code' },
];

/** Keys typed into these must not drive playback. */
function isInteractive(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  return t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A', 'SUMMARY'].includes(t.tagName);
}

export function App({ client }: { client?: SimClient }) {
  useEffect(() => {
    const c = new Controller(client ?? createWorkerClient());
    setController(c);
    c.start();
    return () => {
      c.dispose();
      setController(null);
    };
  }, []);

  useEffect(() => {
    const onResize = () => { layout.value = layoutFor(window.innerWidth); };
    window.addEventListener('resize', onResize);
    const mq = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    const onMotion = () => { reducedMotion.value = !!mq?.matches; };
    mq?.addEventListener?.('change', onMotion);
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || isInteractive(e.target)) return;
      if (e.key === ' ') {
        e.preventDefault();
        controller()?.togglePlay();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        controller()?.step();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', onResize);
      mq?.removeEventListener?.('change', onMotion);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const lay = layout.value;
  return (
    <div class={`app layout-${lay}`}>
      <header class="app-header">
        <h1 class="app-title">Cache hierarchy simulator</h1>
        <div class="header-controls">
          <nav class="segmented mode-switch" role="radiogroup" aria-label="Mode">
            {MODES.map((m) => (
              <button key={m.id} type="button" role="radio" aria-checked={mode.value === m.id} onClick={() => { mode.value = m.id; }}>{m.label}</button>
            ))}
          </nav>
          <HelpButton />
        </div>
      </header>
      {workerError.value && <p class="error banner" role="alert">Simulation error: {workerError.value}</p>}
      {workerNotice.value && !workerError.value && <p class="warning banner" role="status">{workerNotice.value}</p>}
      {lay === 'phone' ? <PhoneBody /> : <WideBody tablet={lay === 'tablet'} />}
      <BottomBar />
      <HelpLayer />
    </div>
  );
}

function ModePanel() {
  switch (mode.value) {
    case 'guided': return <GuidedPanel />;
    case 'explain': return <ExplainPanel />;
    case 'glossary': return <GlossaryPanel />;
    default: return null;
  }
}

function ViewColumn() {
  return (
    <>
      <CenterView />
      <div class="under-view">
        <CurrentAccess />
        {showBreakdown.value && <AddressBreakdown />}
      </div>
    </>
  );
}

function WideBody({ tablet }: { tablet: boolean }) {
  if (tablet) {
    return (
      <main class="body body-tablet">
        <ModePanel />
        <div class="center"><ViewColumn /></div>
        <div class="code-row"><CodePanel /><TryItPanel /></div>
        <div class="tablet-cols">
          <aside class="left" aria-label="Configuration"><HardwarePanel /><WorkloadPanel /></aside>
          <aside class="right" aria-label="Metrics"><MetricsPanel /></aside>
        </div>
      </main>
    );
  }
  return (
    <main class="body body-desktop">
      <aside class="left" aria-label="Configuration"><HardwarePanel /><WorkloadPanel /></aside>
      <div class="center">
        <ViewColumn />
        <div class="code-row"><CodePanel /><TryItPanel /></div>
      </div>
      <aside class="right" aria-label="Metrics"><ModePanel /><MetricsPanel /></aside>
    </main>
  );
}

function PhoneBody() {
  const tab = phoneTab.value;
  return (
    <main class="body body-phone">
      <ModePanel />
      <div class="tabs" role="tablist" aria-label="Sections">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls="tabpanel"
            onClick={() => { phoneTab.value = t.id; }}>
            {t.label}
          </button>
        ))}
      </div>
      <div id="tabpanel" role="tabpanel" aria-labelledby={`tab-${tab}`} class="tabpanel">
        {tab === 'config' && <HardwarePanel />}
        {tab === 'workload' && <WorkloadPanel />}
        {tab === 'view' && <ViewColumn />}
        {tab === 'metrics' && <MetricsPanel />}
        {tab === 'code' && <><CodePanel /><TryItPanel /></>}
      </div>
    </main>
  );
}
