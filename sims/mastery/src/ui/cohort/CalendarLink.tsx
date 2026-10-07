/**
 * "Add standup to Calendar": the published standup.ics (written by the build, beside
 * index.html) as a webcal:// link, so Calendar subscribes rather than importing a copy.
 */

/** The webcal:// address of standup.ics, relative to the app's own address. */
export function standupCalendarHref(base: string = typeof document === 'undefined' ? '' : document.baseURI): string {
  try {
    return new URL('standup.ics', base).href.replace(/^https?:/, 'webcal:');
  } catch {
    return 'standup.ics';
  }
}

export const IPHONE_NOTE = 'On iPhone, when you subscribe, switch off Remove Alerts, or the alert won\'t fire.';

export function CalendarLink({ cls = 'su-cal' }: { cls?: string }) {
  return (
    <p class={cls}>
      <a class="d-text" href={standupCalendarHref()}>Add standup to Calendar</a>
      <span class="ds-meta"> Weekdays at 10:00 am, not on Shabbat or yom tov. {IPHONE_NOTE}</span>
    </p>
  );
}
