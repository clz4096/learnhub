/**
 * The Help page: a dialog with one section per way to use the tool. Each section has a
 * short "how to" and a "try this" button that closes the page and sets the app up.
 * Keyboard: focus starts on the title, Tab stays inside, Esc closes, and focus returns
 * to the Help button.
 */
import { useEffect, useRef } from 'preact/hooks';
import { TermText } from '@/ui/Term';
import { HELP_SECTIONS, LEARN_STEPS, type HelpSection } from '@/ui/help/content';
import { tryHelpAction } from '@/ui/help/actions';
import { helpOpen } from '@/ui/help/state';
import { setTourReturnFocus } from '@/ui/help/Tour';
import { startTour } from '@/ui/help/walkthrough';
import { trapTab } from '@/ui/help/focus';
import '@/ui/help/help.css';

function helpButton(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.help-button');
}

export function HelpDialog() {
  if (!helpOpen.value) return null;
  return <HelpPage />;
}

function HelpPage() {
  const ref = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    ref.current?.querySelector<HTMLElement>('#help-title')?.focus();
    return () => {
      const back = opener && opener.isConnected && opener !== document.body ? opener : helpButton();
      back?.focus();
    };
  }, []);

  const close = () => { helpOpen.value = false; };
  const tour = () => {
    setTourReturnFocus(helpButton());
    close();
    startTour(0);
  };
  const go = (s: HelpSection) => {
    if (!s.action) return;
    close();
    void tryHelpAction(s.action);
  };
  const jump = (id: string) => {
    const el = bodyRef.current?.querySelector<HTMLElement>(`#help-${id}`);
    el?.scrollIntoView?.({ block: 'start' });
    el?.focus({ preventScroll: true });
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' || e.key === 'Esc') {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === 'Tab' && ref.current) {
      trapTab(e, ref.current);
    }
  };
  // A glossary link opens Glossary mode behind this page, so close the page to show it.
  const onClick = (e: MouseEvent) => {
    if ((e.target as Element | null)?.closest?.('button.term')) close();
  };

  return (
    <div class="help-backdrop" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div ref={ref} class="help-dialog" role="dialog" aria-modal="true" aria-labelledby="help-title" onKeyDown={onKeyDown} onClick={onClick}>
        <header class="help-head">
          <h2 id="help-title" tabIndex={-1}>Help</h2>
          <button type="button" class="btn btn-small" onClick={close} aria-label="Close help">Close ✕</button>
        </header>
        <div ref={bodyRef} class="help-body">
          <p class="small">
            New here? Take the one-minute tour of the screen, then open Guided mode and start with lesson 1.
            Words with a dotted underline open the glossary.
          </p>
          <p><button type="button" class="btn btn-primary" onClick={tour}>Take the tour</button></p>

          <nav aria-label="Help topics" class="help-toc">
            <ul>
              <li><button type="button" class="linklike small" onClick={() => jump('learn')}>How to learn with this</button></li>
              {HELP_SECTIONS.map((s) => (
                <li key={s.id}><button type="button" class="linklike small" onClick={() => jump(s.id)}>{s.title}</button></li>
              ))}
            </ul>
          </nav>

          <section class="help-section" aria-labelledby="help-learn">
            <h3 id="help-learn" tabIndex={-1}>How to learn with this</h3>
            <ol class="small help-learn">
              {LEARN_STEPS.map((l) => <li key={l.name}><strong>{l.name}.</strong> {l.text}</li>)}
            </ol>
          </section>

          {HELP_SECTIONS.map((s) => (
            <section key={s.id} class="help-section" aria-labelledby={`help-${s.id}`}>
              <h3 id={`help-${s.id}`} tabIndex={-1}>{s.title}</h3>
              <p class="small"><TermText text={s.howTo} /></p>
              {s.blocks?.map((b) => (
                <div key={b.heading ?? b.text} class="help-block">
                  {b.heading && <h4>{b.heading}</h4>}
                  <p class="small">{b.text}</p>
                  {b.code && <pre class="cmd mono">{b.code}</pre>}
                </div>
              ))}
              {s.keys && (
                <div class="table-wrap">
                  <table class="small help-keys">
                    <thead><tr><th scope="col">Key</th><th scope="col">Where</th><th scope="col">Does</th></tr></thead>
                    <tbody>
                      {s.keys.map((k) => (
                        <tr key={k.keys + k.where}><th scope="row"><kbd>{k.keys}</kbd></th><td>{k.where}</td><td>{k.does}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {s.action && (
                <p>
                  <button type="button" class="btn btn-small" onClick={() => go(s)}>Try this: {s.action.label}</button>
                </p>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
