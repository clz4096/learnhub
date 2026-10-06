/**
 * Progress: per course, how much is learned and how the time has split; settings (daily
 * minutes, course weights, theme); export and import of the progress file; and a Start
 * over that needs the exact phrase typed, as in the cache simulator.
 */
import { useState } from 'preact/hooks';
import { MAX_COURSE_WEIGHT, exportProgress, importProgress, withChoices, type Progress } from '@learnhub/mastery';
import { ALL_COURSES, closureOf, courseOf, shortName } from '@/model/courses';
import { MAX_MINUTES, MIN_MINUTES, courseStats, finishOpenPlacement, localDay, withoutSelfReport } from '@/model/learner';
import { go } from '@/model/route';
import { KNOWN_IDS, commit, erase, now, progress, selfReportWarning } from '@/model/store';
import { setTheme, theme, type Theme } from '@/model/theme';
import { SyncCard, SyncOffNote, syncSignedIn } from '@/ui/Sync';

export const CONFIRM_PHRASE = 'start over';
export const confirms = (typed: string): boolean => typed.trim().toLowerCase() === CONFIRM_PHRASE;

function Courses({ p }: { p: Progress }) {
  const t = now();
  return (
    <section class="card" aria-labelledby="pc-title">
      <h2 id="pc-title">Your courses</h2>
      <div class="course-grid">
        {p.courses.map((id) => {
          const s = courseStats(p, id, t);
          const pct = s.total === 0 ? 0 : Math.round((100 * s.mastered) / s.total);
          return (
            <article key={id} class="course-card">
              <h3>{courseOf(id)?.title ?? id}</h3>
              <p class="big">{s.mastered} <span class="small muted">of {s.total} topics learned</span></p>
              <progress class="bar" max={s.total} value={s.mastered} aria-label={`${shortName(id)}: ${pct}% learned`} />
              <ul class="small plain">
                <li>{s.ready} ready to learn now</li>
                <li>{s.due} due for review</li>
                <li>{s.lessonMinutes} lesson minutes so far</li>
              </ul>
            </article>
          );
        })}
      </div>
      <p class="small muted">Topics shared by both courses count in each. You learn them once.</p>
    </section>
  );
}

function Settings({ p }: { p: Progress }) {
  const [minutes, setMinutes] = useState(String(p.settings.budgetMinutes));
  const [weights, setWeights] = useState<Record<string, string>>(
    Object.fromEntries(p.courses.map((c) => [c, String(p.settings.courseWeights[c] ?? 1)])),
  );
  const [courses, setCourses] = useState<string[]>(p.courses);
  const [saved, setSaved] = useState('');
  const m = Number(minutes);
  const minutesOk = Number.isInteger(m) && m >= MIN_MINUTES && m <= MAX_MINUTES;
  const w = Object.fromEntries(courses.map((c) => [c, Number(weights[c] ?? '1')]));
  const weightsOk = Object.values(w).every((x) => Number.isFinite(x) && x >= 0 && x <= MAX_COURSE_WEIGHT) && Object.values(w).some((x) => x > 0);
  const ok = minutesOk && weightsOk && courses.length > 0;
  const total = Object.values(w).reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);

  const save = (): void => {
    if (!ok) return;
    const ordered = ALL_COURSES.map((c) => c.id).filter((id) => courses.includes(id));
    void commit(withChoices(p, { courses: ordered, budgetMinutes: m, courseWeights: w }, now()))
      .then(() => setSaved('Saved. Today\'s plan keeps its tasks; use "Plan the rest of today again" on Today to apply the change now.'));
  };

  return (
    <section class="card" aria-labelledby="ps-title">
      <h2 id="ps-title">Settings</h2>
      <form onSubmit={(e) => { e.preventDefault(); save(); }}>
        <div class="field narrow">
          <label for="set-minutes">Minutes a day</label>
          <input id="set-minutes" type="number" inputMode="numeric" min={MIN_MINUTES} max={MAX_MINUTES} step={5} value={minutes}
            onInput={(e) => { setMinutes((e.currentTarget as HTMLInputElement).value); setSaved(''); }} />
          {!minutesOk && <span class="small error-text">Choose a whole number from {MIN_MINUTES} to {MAX_MINUTES}.</span>}
        </div>
        <fieldset class="fieldset">
          <legend>Courses and how to split new lessons</legend>
          <p class="small muted">Weights share the new-lesson time: 1 and 1 is an even split; 2 and 1 gives the first two thirds. A weight of 0 pauses a course's new lessons; its reviews continue.</p>
          {ALL_COURSES.map((c) => {
            const on = courses.includes(c.id);
            const share = on && total > 0 ? Math.round((100 * (w[c.id] ?? 0)) / total) : 0;
            return (
              <div key={c.id} class="weight-row">
                <label class="toggle">
                  <input type="checkbox" checked={on} onChange={() => { setCourses(on ? courses.filter((x) => x !== c.id) : [...courses, c.id]); setSaved(''); }} />
                  <span>{c.title}</span>
                </label>
                {on && (
                  <label class="inline-field small">
                    <span>Weight</span>
                    <input type="number" inputMode="decimal" min={0} max={MAX_COURSE_WEIGHT} step={0.5} value={weights[c.id] ?? '1'} class="weight"
                      onInput={(e) => { setWeights({ ...weights, [c.id]: (e.currentTarget as HTMLInputElement).value }); setSaved(''); }} />
                    <span class="muted">{share}% of new lessons</span>
                  </label>
                )}
              </div>
            );
          })}
          {!weightsOk && <p class="small error-text">Weights must be numbers from 0 to {MAX_COURSE_WEIGHT}, and at least one must be above 0.</p>}
          {courses.length === 0 && <p class="small error-text">Keep at least one course.</p>}
          <p class="small muted">{closureOf(courses).size} topics in the chosen courses.</p>
        </fieldset>
        <button type="submit" class="btn btn-primary" disabled={!ok}>Save settings</button>
        <p class="small" role="status">{saved}</p>
      </form>
      <fieldset class="fieldset">
        <legend>Appearance</legend>
        {(['system', 'light', 'dark'] as Theme[]).map((x) => (
          <label key={x} class="toggle">
            <input type="radio" name="theme" checked={theme.value === x} onChange={() => setTheme(x)} />
            <span>{x === 'system' ? 'Match this device' : x === 'light' ? 'Light' : 'Dark'}</span>
          </label>
        ))}
      </fieldset>
    </section>
  );
}

/** Import a progress file: shows what it holds, and replaces the current progress only when confirmed. */
export function ImportFile({ onDone }: { onDone?: () => void }) {
  const [status, setStatus] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, setPending] = useState<{ doc: Progress; warnings: string[] } | null>(null);

  const read = async (file: File | undefined): Promise<void> => {
    setErrors([]);
    setPending(null);
    setStatus('');
    if (file === undefined) return;
    const text = await file.text();
    const r = importProgress(text, { knownTopicIds: KNOWN_IDS });
    if (!r.ok) {
      setErrors(r.errors);
      return;
    }
    // A file exported by an earlier build is migrated like a stored document.
    const m = withoutSelfReport(finishOpenPlacement(r.value, now()));
    setPending({ doc: m.progress, warnings: m.dropped.length > 0 ? [...r.warnings, selfReportWarning(m.dropped)] : r.warnings });
  };

  const replace = (): void => {
    if (pending === null) return;
    void commit(pending.doc).then(() => {
      setStatus(`Imported: ${Object.keys(pending.doc.memory).length} topics learned, ${pending.doc.history.length} answers in the history.`);
      setPending(null);
      onDone?.();
    });
  };

  return (
    <div class="import-file">
      <label class="btn file-btn">
        Import progress file
        <input type="file" accept="application/json,.json" class="visually-hidden" data-import
          onChange={(e) => { const f = (e.currentTarget as HTMLInputElement).files?.[0]; void read(f); (e.currentTarget as HTMLInputElement).value = ''; }} />
      </label>
      {errors.length > 0 && (
        <div class="error" role="alert">
          <p>That file cannot be imported. Nothing was changed. What is wrong:</p>
          <ul class="small">{errors.slice(0, 12).map((e, i) => <li key={i}>{e}</li>)}</ul>
        </div>
      )}
      {pending !== null && (
        <div class="warning" role="alert">
          <p>
            This file has {Object.keys(pending.doc.memory).length} topics learned and {pending.doc.history.length} answers, saved{' '}
            {new Date(pending.doc.updatedAt).toLocaleString('en-GB')}. Importing replaces your progress in this browser.
          </p>
          {pending.warnings.length > 0 && <ul class="small">{pending.warnings.slice(0, 8).map((w, i) => <li key={i}>{w}</li>)}</ul>}
          <div class="actions">
            <button type="button" class="btn btn-primary" onClick={replace}>Replace my progress with this file</button>
            <button type="button" class="btn" onClick={() => setPending(null)}>Cancel</button>
          </div>
        </div>
      )}
      <p class="small" role="status">{status}</p>
    </div>
  );
}

function Backup({ p }: { p: Progress }) {
  const [status, setStatus] = useState('');

  const download = (): void => {
    const blob = new Blob([exportProgress(p)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mastery-progress-${localDay(now())}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus('Exported. Keep the file somewhere safe, or open it on another device with Import.');
  };

  return (
    <section class="card" aria-labelledby="pb-title">
      <h2 id="pb-title">Back up and move</h2>
      <p class="small muted">Progress is saved in this browser only. Export a file to keep a copy or to move to another device, then Import it there.</p>
      <SyncOffNote />
      <div class="actions">
        <button type="button" class="btn" onClick={download}>Export progress file</button>
      </div>
      <p class="small" role="status">{status}</p>
      <ImportFile />
    </section>
  );
}

export function StartOver() {
  const [typed, setTyped] = useState('');
  const ready = confirms(typed);
  const doErase = (): void => {
    if (!ready) return;
    void erase().then(() => go({ view: 'start' }));
  };
  return (
    <details class="start-over card">
      <summary>Start over</summary>
      <p class="small">
        This erases every learned topic, your review schedule, and your history in this browser, and the
        learnhub catalog shows no progress. It cannot be undone. Export a file first if you might want it back.
        {syncSignedIn() ? ' You are signed in to sync, so this also erases your progress on your other devices when they next sync.' : ''}
      </p>
      <label class="field small" for="start-over-confirm">
        <span>Type <strong>{CONFIRM_PHRASE}</strong> to confirm</span>
        <input id="start-over-confirm" type="text" autocomplete="off" spellcheck={false} value={typed}
          onInput={(e) => setTyped((e.currentTarget as HTMLInputElement).value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); doErase(); } }} />
      </label>
      <button type="button" class="btn btn-danger" disabled={!ready} onClick={doErase}>Erase my progress</button>
    </details>
  );
}

/** `embedded`: a section of the You tab, under its own heading, rather than a page. */
export function ProgressView({ embedded = false }: { embedded?: boolean }) {
  const p = progress.value;
  if (p === null) return null;
  return (
    <section class="page progress-page" aria-labelledby="pv-title">
      {embedded ? <h2 id="pv-title" class="ds-h2">Progress</h2> : <h1 id="pv-title">Progress</h1>}
      <Courses p={p} />
      <Settings key={p.createdAt} p={p} />
      <SyncCard />
      <Backup p={p} />
      <StartOver />
    </section>
  );
}
