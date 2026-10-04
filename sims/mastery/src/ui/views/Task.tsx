/**
 * Runs one task of today's session (a lesson, a review, or a quiz) and records the
 * result in the progress document. Reviews and quizzes use the same problem runtime as
 * practice. Topics without content yet fall back to a labelled self-report.
 */
import { useState } from 'preact/hooks';
import { contentFor } from '@learnhub/content';
import type { Progress, SessionTask } from '@learnhub/mastery';
import { titleOf, topicOf } from '@/model/courses';
import { completeLesson, completeQuiz, completeReview, skipTask } from '@/model/learner';
import { REVIEW_PROBLEMS, instanceAt } from '@/model/practice';
import { go } from '@/model/route';
import { commit, now, progress } from '@/model/store';
import { ProblemCard } from '@/ui/ProblemCard';
import { LessonRunner, type LessonEnd } from '@/ui/views/Lesson';

function after(p: Progress, index: number): void {
  const next = p.session?.tasks.findIndex((t, i) => i > index && !t.done) ?? -1;
  go(next >= 0 ? { view: 'task', index: next } : { view: 'today' });
}

function Done({ p, task, index }: { p: Progress; task: SessionTask; index: number }) {
  const next = p.session?.tasks.findIndex((t) => !t.done) ?? -1;
  const what = task.kind === 'quiz' ? 'The quiz' : titleOf(task.topicIds[0] as string);
  const msg = task.passed === null
    ? 'Left for another day.'
    : task.kind === 'lesson'
      ? task.passed ? 'Learned. It will come back as a short review to make it stick.' : 'Not learned yet. It comes back in another session.'
      : task.passed ? 'Passed. The next review is further away now.' : 'Missed this time. It comes back sooner, which is how it sticks.';
  return (
    <section class="page task-done" aria-labelledby="td-title">
      <h1 id="td-title">{what}</h1>
      <p>{msg}</p>
      <div class="actions">
        {next >= 0 && next !== index && <button type="button" class="btn btn-primary" onClick={() => go({ view: 'task', index: next })}>Next task</button>}
        <button type="button" class={`btn${next < 0 ? ' btn-primary' : ''}`} onClick={() => go({ view: 'today' })}>Back to today</button>
      </div>
    </section>
  );
}

function SelfCheck({ topicId, onAnswer }: { topicId: string; onAnswer: (known: boolean) => void }) {
  const t = topicOf(topicId);
  return (
    <div class="self-report">
      <p class="badge badge-self">Self-report</p>
      <p class="small muted">No questions are written for this topic yet, so this review asks you directly. Be honest: a miss only brings it back sooner.</p>
      <p><strong>{t?.title}</strong>: {t?.summary}</p>
      <div class="actions">
        <button type="button" class="btn btn-primary" onClick={() => onAnswer(true)}>I still know this</button>
        <button type="button" class="btn" onClick={() => onAnswer(false)}>I have forgotten it</button>
      </div>
    </div>
  );
}

/** A review: two problems from different skills of one topic; it passes when both are right. */
function ReviewRunner({ p, task, index }: { p: Progress; task: SessionTask; index: number }) {
  const id = task.topicIds[0] as string;
  const c = contentFor(id);
  const [results, setResults] = useState<boolean[]>([]);
  const record = (correct: boolean): void => {
    void commit(completeReview(p, id, correct, now(), index));
  };
  return (
    <section class="page review" aria-labelledby="rv-title">
      <p class="small muted">Review</p>
      <h1 id="rv-title">{titleOf(id)}</h1>
      <p class="small muted">{task.reason}</p>
      {c === undefined
        ? <SelfCheck topicId={id} onAnswer={record} />
        : (
          <>
            <p class="small muted">Problem {results.length + 1} of {REVIEW_PROBLEMS}</p>
            <ProblemCard
              key={results.length}
              index={results.length}
              mode="review"
              topicId={id}
              instance={instanceAt(c, `review-${p.session?.startedAt ?? 0}-${index}`, results.length)}
              onDone={(r) => {
                const rs = [...results, r.correct];
                if (rs.length >= REVIEW_PROBLEMS) record(rs.every(Boolean));
                else setResults(rs);
              }}
            />
          </>
        )}
    </section>
  );
}

/** A quiz: one problem per topic; each answer is that topic's review. */
function QuizRunner({ p, task, index }: { p: Progress; task: SessionTask; index: number }) {
  const [results, setResults] = useState<Record<string, boolean>>({});
  const done = Object.keys(results).length;
  const id = task.topicIds[done] as string;
  const c = contentFor(id);
  const record = (correct: boolean): void => {
    const rs = { ...results, [id]: correct };
    if (Object.keys(rs).length >= task.topicIds.length) void commit(completeQuiz(p, rs, now(), index));
    else setResults(rs);
  };
  return (
    <section class="page quiz" aria-labelledby="qz-title">
      <p class="small muted">Quiz: item {done + 1} of {task.topicIds.length}, about {Math.round(task.minutes / task.topicIds.length)} minutes each</p>
      <progress class="bar" max={task.topicIds.length} value={done} aria-label="Quiz progress" />
      <h1 id="qz-title">{titleOf(id)}</h1>
      {c === undefined
        ? <SelfCheck key={id} topicId={id} onAnswer={record} />
        : <ProblemCard key={id} topicId={id} index={done} mode="quiz" instance={instanceAt(c, `quiz-${p.session?.startedAt ?? 0}-${index}`, done)} onDone={(r) => record(r.correct)} />}
    </section>
  );
}

export function TaskView({ index }: { index: number }) {
  const p = progress.value;
  const task = p?.session?.tasks[index];
  if (p === null || task === undefined) {
    return (
      <section class="page">
        <p>That task is not in today's plan.</p>
        <button type="button" class="btn btn-primary" onClick={() => go({ view: 'today' })}>Back to today</button>
      </section>
    );
  }
  if (task.done) return <Done p={p} task={task} index={index} />;
  if (task.kind === 'review') return <ReviewRunner key={index} p={p} task={task} index={index} />;
  if (task.kind === 'quiz') return <QuizRunner key={index} p={p} task={task} index={index} />;
  const id = task.topicIds[0] as string;
  const end = (e: LessonEnd): void => {
    void commit(completeLesson(p, id, e.passed, now(), index, task.minutes, task.course));
  };
  return (
    <LessonRunner
      key={index}
      topicId={id}
      salt={`lesson-${p.session?.startedAt ?? 0}-${index}`}
      onEnd={end}
      onSkip={() => { void commit(skipTask(p, index, now())).then(() => after(p, index)); }}
    />
  );
}

/** A lesson opened from the map, outside today's plan. */
export function LearnView({ topicId }: { topicId: string }) {
  const p = progress.value;
  const t = topicOf(topicId);
  const [done, setDone] = useState<boolean | null>(null);
  // Fixed for the visit, so problems do not change while they are answered.
  const [salt] = useState(() => `learn-${now()}`);
  if (p === null || t === undefined) return <p class="page">Unknown topic.</p>;
  if (done !== null) {
    return (
      <section class="page task-done">
        <h1>{t.title}</h1>
        <p>{done ? 'Learned. It will come back as a short review.' : 'Not learned yet. It stays ready for another session.'}</p>
        <div class="actions">
          <button type="button" class="btn btn-primary" onClick={() => go({ view: 'today' })}>Back to today</button>
          <button type="button" class="btn" onClick={() => go({ view: 'map', topicId })}>Back to the map</button>
        </div>
      </section>
    );
  }
  return (
    <LessonRunner
      topicId={topicId}
      salt={salt}
      onEnd={(e) => { void commit(completeLesson(p, topicId, e.passed, now(), null, t.estMinutes)).then(() => setDone(e.passed)); }}
      onSkip={() => go({ view: 'map', topicId })}
    />
  );
}
