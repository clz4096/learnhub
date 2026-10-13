/**
 * A secondary section folded under its heading: closed on a phone, so a page opens on its
 * one primary thing, and open from 900 px, where there is room. The heading stays a real
 * heading inside the summary and still names the section, so every section keeps its
 * accessible name whether it is open or not. A page's `first` section opens on every screen,
 * so a page whose sections are all secondary (You, Settings) still opens on something. The
 * open state is set once, on first render; after that it is the learner's.
 */
import type { ComponentChildren, Ref } from 'preact';
import { useState } from 'preact/hooks';
import '@/styles/screens/fold.css';

/** A wide screen (the desktop rail's breakpoint). jsdom has no matchMedia: treated as wide. */
export const wideScreen = (): boolean =>
  typeof matchMedia !== 'function' || matchMedia('(min-width: 900px)').matches;

export function Fold({ id, title, aside, first = false, level = 2, cls, detailsRef, children }: {
  /** The heading's id; the section is labelled by it. */
  id: string;
  title: ComponentChildren;
  /** A short summary on the right of the heading, such as a count or the current value. */
  aside?: ComponentChildren;
  /** The page's first section: open on every screen. */
  first?: boolean;
  level?: 2 | 3;
  cls?: string;
  detailsRef?: Ref<HTMLDetailsElement>;
  children: ComponentChildren;
}) {
  const [open] = useState(() => first || wideScreen());
  const H = level === 2 ? 'h2' : 'h3';
  return (
    <section class={`ds-fold${cls === undefined ? '' : ` ${cls}`}`} aria-labelledby={id}>
      <details open={open} ref={detailsRef}>
        <summary>
          <H id={id} class="ds-fold-h">{title}</H>
          {aside !== undefined && <span class="ds-fold-s">{aside}</span>}
        </summary>
        <div class="ds-fold-b">{children}</div>
      </details>
    </section>
  );
}
