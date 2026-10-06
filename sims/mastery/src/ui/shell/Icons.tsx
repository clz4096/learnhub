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
