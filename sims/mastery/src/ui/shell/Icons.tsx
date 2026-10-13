/** The tab icons (mastery/design-v4.html): 24 px strokes in the current colour. Decoration only. */
import type { TabId } from '@/model/shell';

const PATHS: Readonly<Record<TabId, preact.JSX.Element>> = {
  today: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 9.5h16M9 3v4M15 3v4" /></>,
  course: <path d="M4 5c3-1 6-1 8 1v14c-2-2-5-2-8-1zM20 5c-3-1-6-1-8 1v14c2-2 5-2 8-1z" />,
  admission: <path d="M6 20V4M6 4h11l-2 3.5 2 3.5H6" />,
  story: <><rect x="3" y="6" width="18" height="12" rx="1" /><path d="M10 9.5l5 2.5-5 2.5z" /></>,
  you: <><circle cx="12" cy="9" r="3.5" /><path d="M5 20c1.5-4 4-5.5 7-5.5s5.5 1.5 7 5.5" /></>,
};

export function TabIcon({ id }: { id: TabId }) {
  return <svg class="tab-ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false">{PATHS[id]}</svg>;
}

export function SearchIcon() {
  return <svg class="tab-ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5" /></svg>;
}

/** Small line icons for controls, in the current colour. Decoration only: the control carries the name. */
export function BackIcon() {
  return <svg class="ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>;
}

export function ChevIcon() {
  return <svg class="ic chev" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 6l6 6-6 6" /></svg>;
}

export function TickIcon() {
  return <svg class="ic tick" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;
}

export function CloseIcon() {
  return <svg class="ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18" /></svg>;
}

export function UpIcon() {
  return <svg class="ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 19V5M6 11l6-6 6 6" /></svg>;
}

/** An eye with a stroke through it: an action that shows what was held back. */
export function RevealIcon() {
  return <svg class="ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.8" /><path d="M4 20L20 4" /></svg>;
}

/** The mark of a mastered topic: a ring with a tick. */
export function MasteredMark() {
  return (
    <svg class="seal-mark" viewBox="0 0 56 56" aria-hidden="true" focusable="false">
      <circle cx="28" cy="28" r="25" stroke-width="2" />
      <circle cx="28" cy="28" r="20" stroke-width="1" stroke-dasharray="2 3" />
      <path d="M18.5 28.5l6.5 6.5 12.5-13" />
    </svg>
  );
}
