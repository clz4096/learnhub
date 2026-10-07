/**
 * The You tab (mastery/design-v4.html): predicted outcomes (the OutcomePanel slot, with how
 * predictions work), then settings as plain rows (the glossary, the map, help, the theme),
 * then Progress: each course, daily time and course split, sync, backups, and Start over.
 */
import { GLOSSARY } from '@learnhub/content';
import { hrefOf, go, type Route } from '@/model/route';
import { progress } from '@/model/store';
import { setTheme, theme, type Theme } from '@/model/theme';
import { helpOpen, startTour } from '@/ui/help/state';
import { OutcomeSlot } from '@/ui/OutcomeSlot';
import { ProgressView } from '@/ui/views/ProgressView';
import { fmtLong } from '@/model/day';
import { STANDUP_EARLIEST, STANDUP_LATEST } from '@/model/standup';
import { saveStandup, standup } from '@/model/standupStore';
import { CalendarLink } from '@/ui/cohort/CalendarLink';

/** The standup's possible start times, every quarter hour. */
const STANDUP_TIMES = Array.from({ length: (STANDUP_LATEST - STANDUP_EARLIEST) / 15 + 1 }, (_, i) => STANDUP_EARLIEST + 15 * i);

/** The standup on or off, its time, read aloud, and the calendar subscription, as settings rows. */
function StandupSettings() {
  const st = standup.value;
  return (
    <>
      <li class="ds-li">
        <span class="ds-x" id="standup-on">Daily standup</span>
        <span class="ds-seg" role="group" aria-labelledby="standup-on">
          <button type="button" aria-pressed={st.enabled} onClick={() => saveStandup({ ...st, enabled: true })}>On</button>
          <button type="button" aria-pressed={!st.enabled} onClick={() => saveStandup({ ...st, enabled: false })}>Off</button>
        </span>
      </li>
      <li class="ds-li">
        <label class="ds-x" for="standup-time">Standup time</label>
        <select
          id="standup-time" value={String(st.minutes)}
          onChange={(e) => saveStandup({ ...st, minutes: Number((e.currentTarget as HTMLSelectElement).value) })}
        >
          {STANDUP_TIMES.map((m) => <option key={m} value={String(m)}>{fmtLong(m)}</option>)}
        </select>
      </li>
      <li class="ds-li">
        <span class="ds-x" id="standup-voice">Standup read aloud</span>
        <span class="ds-seg" role="group" aria-labelledby="standup-voice">
          <button type="button" aria-pressed={!st.muted} onClick={() => saveStandup({ ...st, muted: false })}>On</button>
          <button type="button" aria-pressed={st.muted} onClick={() => saveStandup({ ...st, muted: true })}>Muted</button>
        </span>
      </li>
      <li class="ds-li su-cal-row"><CalendarLink /></li>
    </>
  );
}

const THEMES: readonly Theme[] = ['system', 'light', 'dark'];
const THEME_NAMES: Readonly<Record<Theme, string>> = { system: 'System', light: 'Light', dark: 'Dark' };

function RowLink({ to, label, right }: { to: Route; label: string; right: string }) {
  return (
    <li>
      <a
        class="ds-li" href={hrefOf(to)}
        onClick={(e) => {
          if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          e.preventDefault();
          go(to);
        }}
      >
        <span class="ds-x">{label}</span><span class="ds-r">{right}</span>
      </a>
    </li>
  );
}

export function YouView() {
  const p = progress.value;
  if (p === null) return null;
  const t = theme.value;
  return (
    <section class="ds-page you" aria-labelledby="you-title">
      <div class="ds-eyebrow">You</div>
      <h1 id="you-title" class="ds-h1">Predicted outcomes</h1>
      <p class="ds-meta">from timed work only · ranges show uncertainty</p>
      <details class="ds-how">
        <summary>How predictions work</summary>
        <p>
          Each prediction uses only papers you sat under time. Your marks are set against that year's real grade boundaries, and the
          range narrows as you sit more papers.
        </p>
      </details>
      <OutcomeSlot p={p} />

      <section class="ds-sect" aria-labelledby="you-settings">
        <div class="ds-eyebrow ds-sect-h"><h2 id="you-settings">Settings and help</h2></div>
        <ul class="ds-list plain">
          <RowLink to={{ view: 'glossary', termId: null }} label="Glossary" right={`${GLOSSARY.length} terms`} />
          <RowLink to={{ view: 'map', topicId: null }} label="Prerequisite map" right="every topic" />
          <li>
            <button type="button" class="ds-li help-button" onClick={() => { helpOpen.value = true; }}>
              <span class="ds-x">Help</span><span class="ds-r">how each part works</span>
            </button>
          </li>
          <li>
            <button type="button" class="ds-li" onClick={startTour}>
              <span class="ds-x">Take the tour again</span><span class="ds-r">five steps</span>
            </button>
          </li>
          <li class="ds-li">
            <span class="ds-x" id="theme-label">Theme</span>
            <span class="ds-seg" role="group" aria-labelledby="theme-label">
              {THEMES.map((x) => (
                <button key={x} type="button" aria-pressed={t === x} onClick={() => setTheme(x)}>{THEME_NAMES[x]}</button>
              ))}
            </span>
          </li>
          <StandupSettings />
        </ul>
      </section>

      <ProgressView embedded />
    </section>
  );
}
