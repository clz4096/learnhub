/**
 * The "Start here" walkthrough: a small dialog card plus an outline around the part of
 * the screen each step describes. On phones it switches to the tab that holds the
 * region and restores the original tab on close. Keyboard: Tab stays inside the card,
 * Right and Left arrows move between steps, Esc closes (from anywhere on the page), and
 * focus returns to whatever opened the tour.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { TermText } from '@/ui/Term';
import { layout, mode, phoneTab, type PhoneTab } from '@/ui/state';
import { TOUR_STEPS, dispatchTour, tour, tourKeyAction } from '@/ui/help/walkthrough';
import { tryHelpAction } from '@/ui/help/actions';
import { HELP_SECTIONS } from '@/ui/help/content';
import { trapTab } from '@/ui/help/focus';
import '@/ui/help/help.css';

interface Box { top: number; left: number; width: number; height: number }

/** Space kept clear around the outlined region, and from the viewport edges. */
const PAD = 4;
const EDGE = 8;

/** Where focus goes when the tour closes; set by whoever opens it. */
let returnFocus: HTMLElement | null = null;
export function setTourReturnFocus(el: HTMLElement | null): void {
  returnFocus = el;
}

function targetFor(i: number): Element | null {
  const s = TOUR_STEPS[i];
  if (!s) return null;
  const sel = layout.value === 'phone' ? s.phoneTarget ?? s.target : s.target;
  return document.querySelector(sel);
}

/** The region's visible box. `floor` is the top of the sticky bottom bar, which covers whatever lies under it. */
function boxOf(el: Element | null, floor: number): Box | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  const vw = document.documentElement.clientWidth || window.innerWidth;
  const vh = Math.min(window.innerHeight, floor);
  // Clamp to the viewport: a tall panel is outlined where it is visible.
  const top = Math.max(PAD, r.top - PAD);
  const left = Math.max(PAD, r.left - PAD);
  const bottom = Math.min(vh - PAD, r.bottom + PAD);
  const right = Math.min(vw - PAD, r.right + PAD);
  if (bottom <= top || right <= left) return null;
  return { top, left, width: right - left, height: bottom - top };
}

export function Tour() {
  const t = tour.value;
  if (!t.open) return null;
  return <TourCard step={t.step} />;
}

function TourCard({ step }: { step: number }) {
  const s = TOUR_STEPS[step]!;
  const last = step === TOUR_STEPS.length - 1;
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [cardAtTop, setCardAtTop] = useState(false);
  const [barH, setBarH] = useState(0);
  const lay = layout.value;

  // Open and close: remember the phone tab, focus the card, and undo both on close.
  useEffect(() => {
    const tabBefore: PhoneTab = phoneTab.value;
    const opener = returnFocus ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    nextRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      // Esc closes even when focus has moved out of the card (a click on the page).
      if ((e.key === 'Escape' || e.key === 'Esc') && !cardRef.current?.contains(e.target as Node)) {
        dispatchTour('close');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (layout.value === 'phone') phoneTab.value = tabBefore;
      returnFocus = null;
      const back = opener && opener.isConnected ? opener : document.querySelector<HTMLElement>('.help-button');
      back?.focus();
    };
  }, []);

  // Each step: show its tab on phones, then measure once the tab has rendered.
  useLayoutEffect(() => {
    if (lay === 'phone' && s.phoneTab) phoneTab.value = s.phoneTab;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const el = targetFor(step);
      const bar = document.querySelector('.bottom-bar');
      const barTop = bar ? bar.getBoundingClientRect().top : window.innerHeight;
      const b = boxOf(el, el && bar && (bar === el || bar.contains(el)) ? window.innerHeight : barTop);
      setBox(b);
      setBarH(bar ? window.innerHeight - barTop : 0);
      // Put the card on the side away from the region, so it does not cover it.
      const mid = b ? b.top + b.height / 2 : 0;
      setCardAtTop(!!b && mid > window.innerHeight / 2);
    };
    const schedule = () => {
      if (raf || typeof requestAnimationFrame !== 'function') return;
      raf = requestAnimationFrame(measure);
    };
    const reveal = () => {
      const el = targetFor(step);
      el?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
      measure();
    };
    if (typeof requestAnimationFrame === 'function') raf = requestAnimationFrame(reveal);
    else reveal();
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
    };
  }, [step, lay]);

  // A removed button (Back on step 1, Next on the last step) must not strand focus.
  useEffect(() => {
    const card = cardRef.current;
    if (card && !card.contains(document.activeElement)) nextRef.current?.focus();
  }, [step]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'Tab') {
      if (cardRef.current) trapTab(e, cardRef.current);
      return;
    }
    const a = tourKeyAction(e.key);
    if (!a) return;
    // Arrows here must not also step the simulation (App listens on window).
    e.preventDefault();
    e.stopPropagation();
    dispatchTour(a);
  };

  const startLesson = () => {
    dispatchTour('close');
    const guided = HELP_SECTIONS.find((h) => h.id === 'guided')?.action;
    if (guided) void tryHelpAction(guided);
    else mode.value = 'guided';
  };

  const style = cardAtTop
    ? { top: `${EDGE}px` }
    : { bottom: `${Math.round(barH) + EDGE}px` };
  return (
    <div class="tour-layer">
      {box && (
        <div
          class="tour-outline"
          aria-hidden="true"
          style={{ top: `${box.top}px`, left: `${box.left}px`, width: `${box.width}px`, height: `${box.height}px` }}
        />
      )}
      <div
        ref={cardRef}
        class="tour-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-text"
        style={style}
        onKeyDown={onKeyDown}
      >
        <p class="tour-count small muted">Start here: step {step + 1} of {TOUR_STEPS.length}</p>
        <h2 id="tour-title" class="tour-title">{s.title}</h2>
        <p id="tour-text" class="small tour-text" aria-live="polite"><TermText text={s.text} /></p>
        <div class="tour-actions">
          {!last && <button type="button" class="btn btn-small tour-skip" onClick={() => dispatchTour('close')}>Skip tour</button>}
          <span class="tour-nav">
            {step > 0 && <button type="button" class="btn btn-small" onClick={() => dispatchTour('back')}>‹ Back</button>}
            {last ? (
              <>
                <button type="button" class="btn btn-small" onClick={() => dispatchTour('close')}>Done</button>
                <button ref={nextRef} type="button" class="btn btn-small btn-primary" onClick={startLesson}>Start lesson 1</button>
              </>
            ) : (
              <button ref={nextRef} type="button" class="btn btn-small btn-primary" onClick={() => dispatchTour('next')}>Next ›</button>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
