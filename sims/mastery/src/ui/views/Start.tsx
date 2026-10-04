/**
 * Start: choose courses and daily minutes, then the placement test. Placement asks the
 * engine for the next topic to probe (`nextProbe`), uses a real problem where the topic
 * has content, and a clearly labelled self-report where it does not yet. Each answer is
 * saved as it is given, so a reload resumes the test.
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
import { ProblemCard } from '@/ui/ProblemCard';
import { ImportFile } from '@/ui/views/ProgressView';

export function Start() {
  const p = progress.value;
  if (p === null || p.courses.length === 0) return <ChooseCourses />;
  if (p.placement === null) return <PlacementIntro p={p} />;
  if (!p.placement.done) return <Placement p={p} />;
  return <PlacementDone p={p} />;
}

function ChooseCourses() {
  const [courses, setCourses] = useState<string[]>([...DEFAULT_COURSES]);
  const [minutes, setMinutes] = useState(String(DEFAULT_MINUTES));
  const m = Number(minutes);
  const minutesOk = Number.isInteger(m) && m >= MIN_MINUTES && m <= MAX_MINUTES;
  const ok = courses.length > 0 && minutesOk;
  const size = closureOf(courses).size;

  const toggle = (id: string): void => setCourses(courses.includes(id) ? courses.filter((c) => c !== id) : [...courses, id]);
  const begin = (): void => {
    if (!ok) return;
    // Keep the courses in catalog order, which is the planner's tie order.
    void commit(startLearner(now(), ALL_COURSES.map((c) => c.id).filter((id) => courses.includes(id)), m));
    go({ view: 'start' });
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
        <button type="submit" class="btn btn-primary" disabled={!ok}>Continue</button>
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
  const withContent = g.order.filter((id) => contentFor(id) !== undefined).length;
  const begin = (): void => {
    void commit({ ...p, placement: { answers: [], done: false } });
    go({ view: 'start' });
  };
  const skip = (): void => {
    void commit(finishPlacement({ ...p, placement: { answers: [], done: false } }, now())).then(() => go({ view: 'today' }));
  };
  return (
    <section class="page start" aria-labelledby="place-title">
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
          Lessons are written for {withContent} of the {g.order.length} topics so far. For those, you solve a real problem.
          For the others, you tell it whether you know the topic. Those questions are marked <em>self-report</em>.
        </li>
        <li>Your answers are saved as you go. You can close the tab and come back.</li>
      </ul>
      <div class="actions">
        <button type="button" class="btn btn-primary" onClick={begin}>Start the placement test</button>
        <button type="button" class="btn" onClick={skip}>Skip it: start from the first topic</button>
      </div>
    </section>
  );
}

function Placement({ p }: { p: Progress }) {
  const g = useMemo(() => placementGraphFor(p), [p.courses.join()]);
  const answers = p.placement?.answers ?? [];
  const next = nextProbe(g, answers);
  const budget = budgetFor(g);

  // Every topic is classified or the budget is spent: finish and save.
  useEffect(() => {
    if (next === null) void commit(finishPlacement(p, now()));
  }, [next === null]);
  if (next === null) return <p class="page">Working out your starting point.</p>;

  const t = topicOf(next);
  const c = contentFor(next);
  const record = (correct: boolean): void => void commit(answerPlacement(p, next, correct, now()));
  const n = answers.length + 1;

  return (
    <section class="page placement" aria-labelledby="pl-title">
      <p class="small muted">Placement: question {n} of at most {budget}</p>
      <progress class="bar" max={budget} value={answers.length} aria-label="Placement progress" />
      <h1 id="pl-title">{t?.title ?? next}</h1>
      {c !== undefined ? (
        <ProblemCard
          key={`${next}-${n}`}
          index={n}
          mode="placement"
          topicId={next}
          instance={instanceAt(c, seedFor('placement', p.createdAt), n)}
          onDone={(r) => record(r.correct)}
        />
      ) : (
        <div class="self-report">
          <p class="badge badge-self">Self-report</p>
          <p class="small muted">No questions are written for this topic yet, so tell it honestly whether you know it.</p>
          <p><strong>{t?.title}</strong>: {t?.summary}</p>
          <div class="actions">
            <button type="button" class="btn btn-primary" onClick={() => record(true)}>I know this</button>
            <button type="button" class="btn" onClick={() => record(false)}>I do not</button>
          </div>
        </div>
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
      <p class="small muted">Courses: {p.courses.map(shortName).join(' and ')}. {p.settings.budgetMinutes} minutes a day.</p>
      <button type="button" class="btn btn-primary" onClick={() => go({ view: 'today' })}>See today's plan</button>
    </section>
  );
}
