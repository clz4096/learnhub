/**
 * The Help page (a dialog with one section per part of the app) and the first-visit tour
 * (a small card with an outline around each part of the screen). Keyboard: Tab stays
 * inside, Esc closes, arrows move through the tour, and focus returns where it was.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { HELP_SECTIONS, TOUR_STEPS } from '@/ui/help/content';
import { trapTab } from '@/ui/help/focus';
import { closeTour, helpOpen, startTour, stepTour, tour } from '@/ui/help/state';

export function HelpDialog() {
  if (!helpOpen.value) return null;
  return <HelpPage />;
}

function HelpPage() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    ref.current?.querySelector<HTMLElement>('#help-title')?.focus();
    return () => { (opener?.isConnected ? opener : document.querySelector<HTMLElement>('.help-button'))?.focus(); };
  }, []);
  const close = (): void => { helpOpen.value = false; };
  return (
    <div class="modal-layer" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div
        ref={ref}
        class="modal help"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        onKeyDown={(e) => {
          if (e.key === 'Escape') { e.preventDefault(); close(); }
          else if (e.key === 'Tab' && ref.current) trapTab(e, ref.current);
        }}
      >
        <div class="help-head">
          <h2 id="help-title" tabIndex={-1}>Help</h2>
          <button type="button" class="btn" onClick={close}>Close</button>
        </div>
        <p><button type="button" class="btn btn-primary" onClick={() => { close(); startTour(); }}>Take the short tour</button></p>
        {HELP_SECTIONS.map((s) => (
          <section key={s.id} class="help-section" aria-labelledby={`help-${s.id}`}>
            <h3 id={`help-${s.id}`}>{s.title}</h3>
            {s.paragraphs.map((t, i) => <p key={i} class="small">{t}</p>)}
          </section>
        ))}
      </div>
    </div>
  );
}

interface Box { top: number; left: number; width: number; height: number }

export function Tour() {
  const t = tour.value;
  if (!t.open) return null;
  return <TourCard step={t.step} />;
}

function TourCard({ step }: { step: number }) {
  const s = TOUR_STEPS[step];
  const ref = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const [box, setBox] = useState<Box | null>(null);
  const last = step === TOUR_STEPS.length - 1;

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => { (opener?.isConnected ? opener : document.querySelector<HTMLElement>('.help-button'))?.focus(); };
  }, []);
  useLayoutEffect(() => {
    const measure = (): void => {
      const el = s === undefined ? null : document.querySelector(s.target);
      const r = el?.getBoundingClientRect();
      setBox(r === undefined || (r.width === 0 && r.height === 0) ? null : { top: r.top - 4, left: r.left - 4, width: r.width + 8, height: r.height + 8 });
    };
    measure();
    nextRef.current?.focus();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [step]);
  if (s === undefined) return null;

  return (
    <div class="tour-layer">
      {box !== null && <div class="tour-outline" aria-hidden="true" style={{ top: `${box.top}px`, left: `${box.left}px`, width: `${box.width}px`, height: `${box.height}px` }} />}
      <div
        ref={ref}
        class="tour-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-text"
        onKeyDown={(e) => {
          if (e.key === 'Escape') { e.preventDefault(); closeTour(); }
          else if (e.key === 'ArrowRight') { e.preventDefault(); stepTour(1); }
          else if (e.key === 'ArrowLeft') { e.preventDefault(); stepTour(-1); }
          else if (e.key === 'Tab' && ref.current) trapTab(e, ref.current);
        }}
      >
        <p class="small muted">Tour: step {step + 1} of {TOUR_STEPS.length}</p>
        <h2 id="tour-title">{s.title}</h2>
        <p id="tour-text" class="small">{s.text}</p>
        <div class="actions">
          {!last && <button type="button" class="btn btn-small" onClick={closeTour}>Skip tour</button>}
          {step > 0 && <button type="button" class="btn btn-small" onClick={() => stepTour(-1)}>Back</button>}
          <button ref={nextRef} type="button" class="btn btn-small btn-primary" onClick={() => stepTour(1)}>{last ? 'Done' : 'Next'}</button>
        </div>
      </div>
    </div>
  );
}
