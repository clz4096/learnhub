/**
 * "Add standup to your calendar": the published standup.ics (written by the build, beside
 * index.html) offered two ways. Google Calendar subscribes by pasting its https address on
 * a computer; Apple Calendar subscribes from a webcal:// link. Both subscribe rather than
 * import a copy, so each build's yom tov exclusions reach the calendar.
 */
import { useState } from 'preact/hooks';
import { ALARM_MINUTES, STANDUP_TITLE } from '@/model/standupIcs';

function appBase(): string {
  return typeof document === 'undefined' ? '' : document.baseURI;
}

/** The https address of standup.ics, relative to the app's own address. */
export function standupCalendarUrl(base: string = appBase()): string {
  try {
    return new URL('standup.ics', base).href;
  } catch {
    return 'standup.ics';
  }
}

/** The webcal:// address of standup.ics, relative to the app's own address. */
export function standupCalendarHref(base: string = appBase()): string {
  return standupCalendarUrl(base).replace(/^https?:/, 'webcal:');
}

export const IPHONE_NOTE = 'On iPhone, when you subscribe, switch off Remove Alerts, or the alert won\'t fire.';

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

function CopyUrl({ url }: { url: string }) {
  const [copied, setCopied] = useState<boolean | null>(null);
  return (
    <div class="su-cal-copy">
      <input
        class="su-cal-url" type="text" readOnly value={url} aria-label="Calendar address"
        onFocus={(e) => e.currentTarget.select()}
      />
      <button
        type="button" class="ds-btn ghost"
        onClick={() => { void startCopy(url).then(setCopied); }}
      >
        Copy
      </button>
      <span class="ds-meta" role="status">
        {copied === null ? '' : copied ? 'Copied' : 'This browser did not let the app copy. Select the address and copy it.'}
      </span>
    </div>
  );
}

export function CalendarLink({ cls = 'su-cal' }: { cls?: string }) {
  const url = standupCalendarUrl();
  return (
    <div class={cls}>
      <p class="su-cal-h">
        Add standup to your calendar
        <span class="ds-meta"> Weekdays at 10:00 am, not on Shabbat or yom tov.</span>
      </p>
      <details class="su-cal-opt">
        <summary>Google Calendar</summary>
        <p>Do this once, on a computer.</p>
        <ol>
          <li>Open <a class="d-text" href="https://calendar.google.com" target="_blank" rel="noopener noreferrer">calendar.google.com</a>.</li>
          <li>Next to Other calendars, click +, then From URL.</li>
          <li>
            Paste this address:
            <CopyUrl url={url} />
          </li>
          <li>Click Add calendar.</li>
        </ol>
        <p>
          Then set the reminder, because Google ignores the one in the file: hover over {STANDUP_TITLE},
          click ⋮, then Settings. Under Event notifications, add {ALARM_MINUTES} minutes.
        </p>
        <p>
          On iPhone, the Google Calendar app shows it on its own. To get the reminder, allow
          notifications in iPhone Settings › Notifications › Google Calendar.
        </p>
        <p class="ds-meta">Google can take up to a day to show it the first time.</p>
      </details>
      <details class="su-cal-opt">
        <summary>Apple Calendar</summary>
        <p>
          <a class="d-text" href={standupCalendarHref()}>Add standup to Apple Calendar</a>
          <span class="ds-meta"> {IPHONE_NOTE}</span>
        </p>
      </details>
    </div>
  );
}
