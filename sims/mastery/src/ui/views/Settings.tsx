/**
 * Settings, under You (#/settings): every setting in one place, each group a section that
 * folds to its heading. General (the theme, help, and the tour), the study plan (minutes a
 * day and the courses' split), the day (its anchors, the gym, dinner, and bed, and the
 * daily standup with its calendar), sync and backup, and Start over.
 */
import { useState } from 'preact/hooks';
import { withChoices, type Progress } from '@learnhub/mastery';
import { DINNER_LENGTH, GET_GOING, GYM, LUNCH, WIND_DOWN, anchorsProblem, fmtLong, type DayAnchors } from '@/model/day';
import { STANDUP_EARLIEST, STANDUP_LATEST } from '@/model/standup';
import { saveStandup, standup } from '@/model/standupStore';
import { commit, now, progress } from '@/model/store';
import { setTheme, theme, type Theme } from '@/model/theme';
import { BackLink } from '@/ui/BackLink';
import { CalendarLink } from '@/ui/cohort/CalendarLink';
import { Fold } from '@/ui/Fold';
import { helpOpen, startTour } from '@/ui/help/state';
import { SyncCard } from '@/ui/Sync';
import { Backup, StartOver, StudyPlan } from '@/ui/views/ProgressView';
import { currentAnchors } from '@/ui/views/dayView';
import '@/styles/screens/you.css';

const THEMES: readonly Theme[] = ['system', 'light', 'dark'];
const THEME_NAMES: Readonly<Record<Theme, string>> = { system: 'System', light: 'Light', dark: 'Dark' };

/** The standup's possible start times, every quarter hour. */
const STANDUP_TIMES = Array.from({ length: (STANDUP_LATEST - STANDUP_EARLIEST) / 15 + 1 }, (_, i) => STANDUP_EARLIEST + 15 * i);

/** Every quarter hour from `from` to `to` in plan minutes, with `keep` too if it falls outside (a time chosen on another build). */
function quarterHours(from: number, to: number, keep: number): number[] {
  const out = Array.from({ length: (to - from) / 15 + 1 }, (_, i) => from + 15 * i);
  return out.includes(keep) ? out : [...out, keep].sort((a, b) => a - b);
}

/** The anchors the learner may move (model/day.ts `DayAnchors`), each a select of quarter hours; bed runs past midnight. */
const ANCHOR_FIELDS: readonly { key: keyof DayAnchors; id: string; label: string; from: number; to: number }[] = [
  { key: 'gymStart', id: 'day-gym', label: 'Gym starts', from: 300, to: 1320 },
  { key: 'dinner', id: 'day-dinner', label: 'Dinner', from: 600, to: 1425 },
  { key: 'bed', id: 'day-bed', label: 'Bed', from: 1080, to: 1725 },
];

/**
 * The day's anchors, saved to the learner's settings. A day already planned keeps the
 * anchors it was planned with (model/dayLog.ts), so a change reaches it on Plan from now.
 */
function Anchors({ p }: { p: Progress }) {
  const [draft, setDraft] = useState<DayAnchors>(() => currentAnchors(p));
  const [saved, setSaved] = useState('');
  const problem = anchorsProblem(draft);
  const save = (): void => {
    if (problem !== null) return;
    void commit(withChoices(p, { dayAnchors: draft }, now()))
      .then(() => setSaved('Saved. A day already planned keeps its times; use "Plan from now" on Today to apply the change now.'));
  };
  return (
    <form class="day-anchors" onSubmit={(e) => { e.preventDefault(); save(); }}>
      <ul class="ds-list plain">
        {ANCHOR_FIELDS.map((f) => (
          <li key={f.key} class="ds-li">
            <label class="ds-x" for={f.id}>{f.label}</label>
            <select
              id={f.id} value={String(draft[f.key])}
              onChange={(e) => { setDraft({ ...draft, [f.key]: Number((e.currentTarget as HTMLSelectElement).value) }); setSaved(''); }}
            >
              {quarterHours(f.from, f.to, draft[f.key]).map((m) => <option key={m} value={String(m)}>{fmtLong(m)}</option>)}
            </select>
          </li>
        ))}
      </ul>
      <p class="small muted">
        The gym takes {GYM} min with travel; if its start does not fit, it tries 15 and 30 minutes later. Getting going
        takes {GET_GOING} min after waking, lunch {LUNCH} min, dinner {DINNER_LENGTH} min, and the wind down {WIND_DOWN} min before bed.
      </p>
      {problem !== null && <p class="small error-text">{problem}</p>}
      <button type="submit" class="btn btn-primary" disabled={problem !== null}>Save day times</button>
      <p class="small" role="status">{saved}</p>
    </form>
  );
}

function General() {
  const t = theme.value;
  return (
    <ul class="ds-list plain">
      <li class="ds-li">
        <span class="ds-x" id="theme-label">Theme</span>
        <span class="ds-seg" role="group" aria-labelledby="theme-label">
          {THEMES.map((x) => (
            <button key={x} type="button" aria-pressed={t === x} onClick={() => setTheme(x)}>{THEME_NAMES[x]}</button>
          ))}
        </span>
      </li>
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
    </ul>
  );
}

/** The day's anchors, then the standup on or off, its time, read aloud, and the calendar subscription. */
function Day({ p }: { p: Progress }) {
  const st = standup.value;
  return (
    <>
      <p class="small muted">The day planner builds each day around these times from the wake time.</p>
      <Anchors key={p.createdAt} p={p} />
      <ul class="ds-list plain">
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
      </ul>
    </>
  );
}

export function SettingsView() {
  const p = progress.value;
  if (p === null) return null;
  return (
    <section class="ds-page you settings" aria-labelledby="settings-title">
      <BackLink to={{ view: 'progress' }} label="Back to You" />
      <div class="ds-eyebrow">You</div>
      <h1 id="settings-title" class="ds-h1">Settings</h1>
      <Fold id="set-general" title="General" aside="theme, help" first><General /></Fold>
      <Fold id="set-plan" title="Study plan" aside={`${p.settings.budgetMinutes} min a day`}><StudyPlan key={p.createdAt} p={p} /></Fold>
      <Fold id="set-day" title="Day and standup" aside={standup.value.enabled ? `standup ${fmtLong(standup.value.minutes)}` : 'standup off'}><Day p={p} /></Fold>
      <Fold id="set-sync" title="Sync and backup"><SyncCard /><Backup p={p} /></Fold>
      <StartOver />
    </section>
  );
}
