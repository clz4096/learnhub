/**
 * Shared by the Campaign, paper, Report, and Letters screens: the paper registry loaded on
 * demand (its own chunk, out of the main bundle), a copy-to-clipboard block with the
 * read-only fallback, an in-app link, letter delivery, and the entry line.
 */
import type { ComponentChildren } from 'preact';
import { signal } from '@preact/signals';
import { useEffect, useRef, useState } from 'preact/hooks';
import { deliverLetters, type Admissions } from '@/model/campaign';
import type { Projection } from '@/model/campaignCalendar';
import { campaignFixed, type Summary } from '@/model/campaignSummary';
import { campaign, saveCampaign } from '@/model/campaignStore';
import { planDate, type FixedBlock } from '@/model/day';
import { ladder } from '@/model/ladderStore';
import { go, hrefOf, type Route } from '@/model/route';
import { now, progress } from '@/model/store';

export const admissions = signal<Admissions | null>(null);
export const admissionsError = signal<string | null>(null);
let pending: Promise<void> | null = null;

/** Downloads the paper registry once; a failure is shown and the next call tries again. */
export function loadAdmissions(): Promise<void> {
  if (admissions.value !== null) return Promise.resolve();
  pending ??= import('@learnhub/content/admissions').then(
    (m) => {
      admissions.value = m;
      admissionsError.value = null;
    },
    (e: unknown) => {
      pending = null;
      admissionsError.value = String(e);
    },
  );
  return pending;
}

/** Renders its children with the registry, after loading it. */
export function WithAdmissions({ children }: { children: (adm: Admissions) => ComponentChildren }) {
  const adm = admissions.value;
  useEffect(() => {
    if (adm === null) void loadAdmissions();
  }, [adm]);
  if (adm !== null) return <>{children(adm)}</>;
  if (admissionsError.value !== null) {
    return (
      <section class="camp">
        <p class="c-note" role="alert">The paper registry could not be downloaded. Check the connection and try again.</p>
        <button type="button" class="c-btn" onClick={() => void loadAdmissions()}>Try again</button>
      </section>
    );
  }
  return <p class="camp c-tiny">Loading the paper registry.</p>;
}

export function AppLink({ to, children, class: cls, 'aria-current': current }: { to: Route; children: ComponentChildren; class?: string; 'aria-current'?: 'page' }) {
  return (
    <a
      href={hrefOf(to)} class={cls} aria-current={current}
      onClick={(e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        go(to);
      }}
    >
      {children}
    </a>
  );
}

/** Must run in the click handler before anything is awaited: iPhone Safari allows clipboard writes only in the gesture. */
function startCopy(text: string): Promise<boolean> {
  try {
    const c = typeof navigator === 'undefined' ? undefined : navigator.clipboard;
    if (c === undefined || typeof c.writeText !== 'function') return Promise.resolve(false);
    return c.writeText(text).then(() => true, () => false);
  } catch {
    return Promise.resolve(false);
  }
}

/** A copy button for a text block; where the clipboard is refused, a read-only box with Select all. */
export function CopyBlock({ id, label, make, after }: { id: string; label: string; make: () => string; after: string }) {
  const [state, setState] = useState<{ text: string; ok: boolean } | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  return (
    <div class="c-copy">
      <button
        type="button" class="c-btn quiet"
        onClick={() => {
          const text = make();
          void startCopy(text).then((ok) => setState({ text, ok }));
        }}
      >
        {label}
      </button>
      <p class="c-tiny" role="status">
        {state === null ? '' : state.ok ? `Copied. ${after}` : 'This browser did not let the app copy. Press Select all, then copy the selected text.'}
      </p>
      {state !== null && !state.ok && (
        <div class="c-copybox">
          <label for={id} class="c-label">The block to paste</label>
          <textarea id={id} ref={box} readOnly rows={8} value={state.text} />
          <button
            type="button" class="c-btn quiet"
            onClick={() => {
              const el = box.current;
              if (el === null) return;
              el.focus();
              el.setSelectionRange(0, el.value.length);
            }}
          >
            Select all
          </button>
        </div>
      )}
    </div>
  );
}

/** A New York date (YYYY-MM-DD) as "March 30, 2028". */
export function longDay(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

/** A timestamp as "Oct 5, 2026". */
export function shortStamp(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' });
}

export const ROMAN: readonly string[] = ['I', 'II', 'III', 'IV', 'V'];

/**
 * The planner's fixed blocks from the campaign (see campaignFixed). Reads signals, so a
 * planner that calls it while rendering updates when the registry arrives; none without a
 * campaign.
 */
export function campaignFixedFor(date: string): readonly FixedBlock[] {
  const c = campaign.value;
  const p = progress.value;
  if (c === null || p === null) return [];
  const adm = admissions.value;
  if (adm === null) {
    void loadAdmissions();
    return [];
  }
  return campaignFixed(adm, c, p, date, planDate(now()), ladder.value);
}

/** Files the letters a summary says are due, once each, whichever screen shows it first. */
export function useDeliverLetters(s: Summary): void {
  const due = s.lettersDue.join(',');
  useEffect(() => {
    const c = campaign.value;
    if (c !== null && s.lettersDue.length > 0) saveCampaign(deliverLetters(c, s.lettersDue, now()));
  }, [due]);
}

/** "On course for October 2028 entry", or where it has slipped to. */
export function entryLine(pr: Projection): string {
  if (pr.entry === null) return 'Beyond ten years at this pace';
  return pr.slipped ? `Slipped to October ${pr.entry} entry` : `On course for October ${pr.entry} entry`;
}
