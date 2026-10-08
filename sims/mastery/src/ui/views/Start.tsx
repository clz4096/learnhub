/**
 * Start, for a new learner: choose a course option and the daily minutes, then go
 * straight to Today. There is no placement test (design decision 20): every course is
 * taught from its foundations, and progress is measured only by answers (decision 11).
 */
import { useState } from 'preact/hooks';
import { closureOf } from '@/model/courses';
import { COURSE_OPTIONS, DEFAULT_MINUTES, MAX_MINUTES, MIN_MINUTES, startLearner } from '@/model/learner';
import { go } from '@/model/route';
import { commit, now } from '@/model/store';
import { SyncCard } from '@/ui/Sync';
import { ImportFile } from '@/ui/views/ProgressView';

export function Start() {
  const [choice, setChoice] = useState<string>(COURSE_OPTIONS[0].id);
  const [minutes, setMinutes] = useState(String(DEFAULT_MINUTES));
  const option = COURSE_OPTIONS.find((o) => o.id === choice) ?? COURSE_OPTIONS[0];
  const m = Number(minutes);
  const ok = Number.isInteger(m) && m >= MIN_MINUTES && m <= MAX_MINUTES;

  const begin = (): void => {
    if (!ok) return;
    void commit(startLearner(now(), option.courses, m));
    go({ view: 'today' });
  };

  return (
    <section class="page start" aria-labelledby="start-title">
      <h1 id="start-title">Welcome</h1>
      <p>
        This course teaches Cambridge mathematics from the ground up, one small topic at a time. Each day it plans a
        session: new lessons, short reviews so nothing fades, and the odd quiz. A topic counts as learned once its practice
        problems are solved, not before.
      </p>
      <form onSubmit={(e) => { e.preventDefault(); begin(); }}>
        <fieldset class="fieldset">
          <legend>Your course</legend>
          {COURSE_OPTIONS.map((o) => (
            <label key={o.id} class="toggle">
              <input type="radio" name="start-course" checked={o.id === choice} onChange={() => setChoice(o.id)} />
              <span>{o.title}</span>
            </label>
          ))}
          <p class="small muted">
            {closureOf(option.courses).size} topics in all, from before A level up to the Tripos. Shared foundations are
            learned once, and each day splits new lessons evenly between the courses; the split can be changed later.
          </p>
        </fieldset>
        <div class="field narrow">
          <label for="start-minutes">Minutes a day</label>
          <input id="start-minutes" type="number" inputMode="numeric" min={MIN_MINUTES} max={MAX_MINUTES} step={5} value={minutes}
            onInput={(e) => setMinutes((e.currentTarget as HTMLInputElement).value)} />
          {!ok && <span class="small error-text">Choose a whole number of minutes from {MIN_MINUTES} to {MAX_MINUTES}.</span>}
        </div>
        <button type="submit" class="btn btn-primary" disabled={!ok}>Start learning</button>
      </form>
      <section class="card import-start" aria-labelledby="imp-title">
        <h2 id="imp-title" class="small">Coming back with a progress file?</h2>
        <p class="small muted">Import a file exported from this course on another device or before a start over.</p>
        <ImportFile onDone={() => go({ view: 'today' })} />
      </section>
      <SyncCard />
    </section>
  );
}
