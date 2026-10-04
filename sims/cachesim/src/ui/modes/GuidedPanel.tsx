/**
 * Guided mode: lessons with a goal, numbered steps that drive the app, the numbers to
 * notice, and a check question. Progress (open lesson, steps run, answers) persists
 * per viewer in localStorage (progress.ts).
 */
import { useState } from 'preact/hooks';
import { Term, TermText } from '@/ui/Term';
import { glossaryEntry } from '@/ui/modes/glossary';
import { LESSONS, actionLabel, lessonById, type Lesson } from '@/ui/modes/lessons';
import { isDone, progress, updateProgress } from '@/ui/modes/progress';
import { busy, runActions } from '@/ui/modes/lessonRunner';
import '@/ui/modes/modes.css';

export function GuidedPanel() {
  const p = progress.value;
  const lesson = lessonById(p.lesson) ?? LESSONS[0]!;
  const at = LESSONS.indexOf(lesson);
  const doneCount = LESSONS.filter((l) => isDone(p, l.id)).length;
  const open = (id: string) => updateProgress((q) => { q.lesson = id; });
  return (
    <section class="panel mode-panel guided" aria-labelledby="guided-title">
      <h2 id="guided-title">Guided tour</h2>
      <p class="small muted">Ten short lessons. Each step's button sets up the simulator for you; words with a dotted underline open the glossary.</p>
      <label class="field">
        <span>Lesson ({doneCount} of {LESSONS.length} done)</span>
        <select value={lesson.id} onChange={(e) => open((e.currentTarget as HTMLSelectElement).value)}>
          {LESSONS.map((l, i) => (
            <option key={l.id} value={l.id}>{i + 1}. {l.title}{isDone(p, l.id) ? ' (done)' : ''}</option>
          ))}
        </select>
      </label>
      <LessonView key={lesson.id} lesson={lesson} number={at + 1} />
      <nav class="lesson-nav" aria-label="Lessons">
        <button type="button" class="btn btn-small" disabled={at === 0} onClick={() => open(LESSONS[at - 1]!.id)}>‹ Previous lesson</button>
        <button type="button" class="btn btn-small" disabled={at === LESSONS.length - 1} onClick={() => open(LESSONS[at + 1]!.id)}>Next lesson ›</button>
      </nav>
    </section>
  );
}

function LessonView({ lesson, number }: { lesson: Lesson; number: number }) {
  const p = progress.value;
  const reached = p.step[lesson.id] ?? -1;
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState<number | null>(null);

  const run = async (i: number) => {
    const s = lesson.steps[i]!;
    setError(null);
    setRunning(i);
    try {
      await runActions(s.actions ?? [], s.show);
      updateProgress((q) => { q.step[lesson.id] = Math.max(q.step[lesson.id] ?? -1, i); });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(null);
    }
  };

  // The next step to do: the first one after the furthest run step.
  const next = Math.min(reached + 1, lesson.steps.length - 1);
  return (
    <article class="lesson" aria-labelledby={`lesson-${lesson.id}`}>
      <h3 id={`lesson-${lesson.id}`}>{number}. {lesson.title}</h3>
      <p class="small"><strong>Why it matters:</strong> <TermText text={lesson.why} /></p>
      <p class="small"><strong>Goal:</strong> <TermText text={lesson.goal} /></p>

      <h4>Steps</h4>
      <ol class="lesson-steps small">
        {lesson.steps.map((s, i) => (
          <li key={i} class={i === next ? 'current' : i <= reached ? 'past' : ''} aria-current={i === next ? 'step' : undefined}>
            <span><TermText text={s.text} /></span>
            {s.actions?.length ? (
              <button type="button" class="btn btn-small step-btn" disabled={busy.value} onClick={() => { void run(i); }}
                aria-label={`Step ${i + 1}: ${actionLabel(s)}`}>
                {running === i ? 'Working…' : actionLabel(s)}
              </button>
            ) : null}
            {i <= reached && s.actions?.length ? <span class="step-check" aria-label="done">✓</span> : null}
          </li>
        ))}
      </ol>
      {error && <p class="error small" role="alert">{error}</p>}

      <h4>What you should notice</h4>
      <ul class="lesson-notice small">
        {lesson.notice.map((t, i) => <li key={i}><TermText text={t} /></li>)}
      </ul>

      <Question lesson={lesson} />

      {lesson.terms.length > 0 && (
        <p class="small term-row">
          <span class="muted">Glossary: </span>
          {lesson.terms.map((t, i) => <span key={t}>{i > 0 && ', '}<Term id={t}>{glossaryEntry(t)?.term ?? t}</Term></span>)}
        </p>
      )}
    </article>
  );
}

function Question({ lesson }: { lesson: Lesson }) {
  const chosen = progress.value.answer[lesson.id];
  const c = chosen !== undefined ? lesson.question.choices[chosen] : undefined;
  const name = `check-${lesson.id}`;
  return (
    <fieldset class="check">
      <legend><span class="check-label">Check:</span> {lesson.question.prompt}</legend>
      {lesson.question.choices.map((ch, i) => (
        <label key={i} class={`choice${chosen === i ? (ch.correct ? ' right' : ' wrong') : ''}`}>
          <input type="radio" name={name} checked={chosen === i}
            onChange={() => updateProgress((q) => { q.answer[lesson.id] = i; })} />
          <span>{ch.text}</span>
        </label>
      ))}
      <div aria-live="polite">
        {c && (
          <p class={`small answer ${c.correct ? 'answer-right' : 'answer-wrong'}`}>
            <strong>{c.correct ? 'Correct.' : 'Not quite.'}</strong> {c.why}
          </p>
        )}
      </div>
    </fieldset>
  );
}
