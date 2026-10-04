/**
 * Start: choose courses and daily minutes, then the placement test. Placement asks the
 * engine for the next topic to probe (`nextProbe`) and asks a real problem on it. Only
 * topics with written problems are asked about; the rest count as not known until their
 * lessons exist (design decisions 11 and 18). Each answer is saved as it is given, so a
 * reload resumes the test.
 *
 * Two routes, so Back works: #/start is the courses and minutes step and #/placement the
 * test. Going back from the test to change courses or minutes keeps the answers so far;
 * the courses step then offers to resume the test or start it over.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { contentFor } from '@learnhub/content';
import { nextProbe, placementResult, type Progress } from '@learnhub/mastery';
import { ALL_COURSES, closureOf, shortName, titleOf, topicOf } from '@/model/courses';
import {
  DEFAULT_COURSES, DEFAULT_MINUTES, MAX_MINUTES, MIN_MINUTES, answerPlacement, budgetFor, finishPlacement, placementGraphFor, startLearner,
} from '@/model/learner';
import { instanceAt, seedFor } from '@/model/practice';
import { go } from '@/model/route';
import { commit, now, progress } from '@/model/store';
import { BackLink } from '@/ui/BackLink';
import { ProblemCard, type CardOutcome, type Consequence } from '@/ui/ProblemCard';
import { ImportFile } from '@/ui/views/ProgressView';

/** `step` is the route's: the courses step, or placement (which needs courses chosen first). */
export function Start({ step = 'placement' }: { step?: 'courses' | 'placement' }) {
  const p = progress.value;
  if (p === null || p.courses.length === 0) return <ChooseCourses p={p} />;
  if (p.placement?.done === true) return <PlacementDone p={p} />;
  if (step === 'courses') return <ChooseCourses p={p} />;
  if (p.placement === null) return <PlacementIntro p={p} />;
  return <Placement p={p} />;
}

/** Back from placement to the courses step. */
const BackToCourses = () => <BackLink to={{ view: 'start' }} label="Back to courses and minutes" />;

function ChooseCourses({ p }: { p: Progress | null }) {
  const chosen = p !== null && p.courses.length > 0;
  const [courses, setCourses] = useState<string[]>(p !== null && chosen ? [...p.courses] : [...DEFAULT_COURSES]);
  const [minutes, setMinutes] = useState(String(p !== null && chosen ? p.settings.budgetMinutes : DEFAULT_MINUTES));
  const answered = p?.placement?.answers.length ?? 0;
  const m = Number(minutes);
  const minutesOk = Number.isInteger(m) && m >= MIN_MINUTES && m <= MAX_MINUTES;
  const ok = courses.length > 0 && minutesOk;
  const size = closureOf(courses).size;

  const toggle = (id: string): void => setCourses(courses.includes(id) ? courses.filter((c) => c !== id) : [...courses, id]);
  /** Saves the choice and goes on to placement. `over` clears the answers so far. */
  const begin = (over = false): void => {
    if (!ok) return;
    // Keep the courses in catalog order, which is the planner's tie order.
    const ids = ALL_COURSES.map((c) => c.id).filter((id) => courses.includes(id));
    const t = now();
    let next = p !== null && chosen
      ? { ...p, courses: ids, settings: { ...p.settings, budgetMinutes: m }, updatedAt: t }
      : startLearner(t, ids, m);
    // Answers already given stay valid after a change of courses: placement ignores
    // answers about topics outside the chosen courses.
    if (over) next = { ...next, placement: { answers: [], done: false } };
    void commit(next);
    go({ view: 'placement' });
  };

  return (
    <section class="page start" aria-labelledby="start-title">
      <h1 id="start-title">Welcome</h1>
      <p>
        This course teaches Cambridge mathematics from the ground up, one small topic at a time. Each day it plans a
        session for you: new lessons, short reviews so nothing fades, and the odd quiz. A topic counts as learned once you
        solve its practice problems, not before.
      </p>
      <form onSubmit={(e) => { e.preventDefault(); begin(); }}>
        <fieldset class="fieldset">
          <legend>Your courses</legend>
          <p class="small muted">Taking both shares the foundations, so you learn them once. Each day splits new lessons evenly between them; you can change the split later.</p>
          {ALL_COURSES.map((c) => (
            <label key={c.id} class="toggle">
              <input type="checkbox" checked={courses.includes(c.id)} onChange={() => toggle(c.id)} />
              <span>{c.title}</span>
            </label>
          ))}
          <p class="small muted">{courses.length === 0 ? 'Choose at least one course.' : `${size} topics in all, from before A level up to the Tripos.`}</p>
        </fieldset>
        <div class="field narrow">
          <label for="start-minutes">Minutes a day</label>
          <input id="start-minutes" type="number" inputMode="numeric" min={MIN_MINUTES} max={MAX_MINUTES} step={5} value={minutes}
            onInput={(e) => setMinutes((e.currentTarget as HTMLInputElement).value)} />
          {!minutesOk && <span class="small error-text">Choose a whole number of minutes from {MIN_MINUTES} to {MAX_MINUTES}.</span>}
        </div>
        {answered > 0 ? (
          <>
            <p class="small muted">You have answered {answered} placement question{answered === 1 ? '' : 's'}. Resume keeps those answers.</p>
            <div class="actions">
              <button type="submit" class="btn btn-primary" disabled={!ok}>Resume placement</button>
              <button type="button" class="btn" disabled={!ok} onClick={() => begin(true)}>Start placement over</button>
            </div>
          </>
        ) : <button type="submit" class="btn btn-primary" disabled={!ok}>Continue</button>}
      </form>
      <section class="card import-start" aria-labelledby="imp-title">
        <h2 id="imp-title" class="small">Coming back with a progress file?</h2>
        <p class="small muted">Import a file exported from this course on another device or before a start over.</p>
        <ImportFile onDone={() => go({ view: 'today' })} />
      </section>
    </section>
  );
}

function PlacementIntro({ p }: { p: Progress }) {
  const g = useMemo(() => placementGraphFor(p), [p.courses.join()]);
  const withContent = g.probeable.size;
  const begin = (): void => {
    void commit({ ...p, placement: { answers: [], done: false } });
  };
  const skip = (): void => {
    void commit(finishPlacement({ ...p, placement: { answers: [], done: false } }, now())).then(() => go({ view: 'today' }));
  };
  return (
    <section class="page start" aria-labelledby="place-title">
      <BackToCourses />
      <h1 id="place-title">The placement test</h1>
      <p>
        Before the first lesson, a short test finds what you already know, so you do not relearn it. It asks about one
        topic at a time and picks the next question from your answers: a right answer also counts every topic beneath it,
        and a wrong one rules out the topics that build on it.
      </p>
      <ul>
        <li>It asks at most {budgetFor(g)} questions, usually fewer.</li>
        <li><strong>A wrong answer is fine.</strong> It only means that topic starts with a lesson. If you do not know, say so.</li>
        <li>
          Lessons are written for {withContent} of the {g.order.length} topics so far, and every question is a real problem on
          one of those. The other topics count as not known until their lessons are written.
        </li>
        <li>Your answers are saved as you go. You can go back, or close the tab, and resume where you left off.</li>
      </ul>
      <div class="actions">
        <button type="button" class="btn btn-primary" onClick={begin}>Start the placement test</button>
        <button type="button" class="btn" onClick={skip}>Skip it: start from the first topic</button>
      </div>
    </section>
  );
}

/** What one placement answer does, as the result block says it. */
export function placementConsequence(o: CardOutcome): Consequence {
  return {
    effect: o === 'correct'
      ? 'Saved. This topic and the topics beneath it count as known.'
      : 'Saved. This topic starts with a lesson, and topics that build on it wait for it.',
  };
}

function Placement({ p }: { p: Progress }) {
  const g = useMemo(() => placementGraphFor(p), [p.courses.join()]);
  const answers = p.placement?.answers ?? [];
  const next = nextProbe(g, answers);
  const budget = budgetFor(g);
  // A broken problem is replaced by a fresh one on the same topic; nothing is recorded.
  const [fresh, setFresh] = useState({ k: '', n: 0 });

  // Every topic is classified or the budget is spent: finish and save.
  useEffect(() => {
    if (next === null) void commit(finishPlacement(p, now()));
  }, [next === null]);
  if (next === null) return <p class="page">Working out your starting point.</p>;

  const t = topicOf(next);
  const c = contentFor(next);
  const record = (correct: boolean): void => void commit(answerPlacement(p, next, correct, now()));
  const n = answers.length + 1;
  const slot = `${next}-${n}`;
  const f = fresh.k === slot ? fresh.n : 0;

  return (
    <section class="page placement" aria-labelledby="pl-title">
      <BackToCourses />
      <p class="small muted">Placement: question {n} of at most {budget}</p>
      <progress class="bar" max={budget} value={answers.length} aria-label="Placement progress" />
      <h1 id="pl-title">{t?.title ?? next}</h1>
      {/* nextProbe only returns topics with content (placementGraphFor's probeable). */}
      {c !== undefined && (
        <ProblemCard
          key={`${slot}-${f}`}
          index={n}
          mode="placement"
          topicId={next}
          instance={f === 0 ? instanceAt(c, seedFor('placement', p.createdAt), n) : instanceAt(c, seedFor('placement', p.createdAt, 'fresh', f), n)}
          consequence={placementConsequence}
          onDone={(r) => {
            if (r.outcome === 'problem-error') setFresh({ k: slot, n: f + 1 });
            else record(r.correct);
          }}
        />
      )}
      <p class="small muted">Answers so far: {answers.filter((a) => a.correct).length} known, {answers.filter((a) => !a.correct).length} to learn.</p>
    </section>
  );
}

function PlacementDone({ p }: { p: Progress }) {
  const g = useMemo(() => placementGraphFor(p), [p.courses.join()]);
  const r = placementResult(g, p.placement?.answers ?? []);
  return (
    <section class="page start" aria-labelledby="done-title">
      <h1 id="done-title">You are placed</h1>
      <p>
        {r.questions} questions. You start with {r.mastered.length} of {g.order.length} topics known
        {r.mastered.length > 0 ? '; they come back as short reviews over the next days to check they stick' : ''}.
      </p>
      <p>Ready to learn now: {r.frontier.slice(0, 6).map(titleOf).join(', ')}{r.frontier.length > 6 ? `, and ${r.frontier.length - 6} more` : ''}.</p>
      <p class="small muted">Courses: {p.courses.map(shortName).join(' and ')}. {p.settings.budgetMinutes} minutes a day. You can change both in Progress.</p>
      <button type="button" class="btn btn-primary" onClick={() => go({ view: 'today' })}>See today's plan</button>
    </section>
  );
}
