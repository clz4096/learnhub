/**
 * Runs one task of today's session (a lesson, a review, or a quiz) and records the
 * result in the progress document. Reviews and quizzes use the same problem runtime as
 * practice. A topic without problems cannot be reviewed or quizzed; the planner never
 * schedules one, and a stored plan that still holds one only offers to leave it.
 */
import { useState } from 'preact/hooks';
import { contentFor } from '@learnhub/content';
import type { Progress, SessionTask } from '@learnhub/mastery';
import { titleOf, topicOf } from '@/model/courses';
import { completeLesson, completeQuiz, completeReview, hasContent, skipTask } from '@/model/learner';
import { clearLearnSalt, learnSalt } from '@/model/lessonState';
import { REVIEW_PROBLEMS, instanceAt } from '@/model/practice';
import { go } from '@/model/route';
import { commit, now, progress } from '@/model/store';
import { BackLink } from '@/ui/BackLink';
import { ProblemCard, type CardOutcome, type Consequence } from '@/ui/ProblemCard';
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

/** A task with nothing to answer: its problems are not written, so all it can do is wait. */
function NotWritten({ topicIds, onLeave }: { topicIds: readonly string[]; onLeave: () => void }) {
  return (
    <div class="not-written">
      <p class="badge badge-unwritten">Problems not written yet</p>
      <p class="small muted">{topicIds.map((id) => topicOf(id)?.title ?? id).join(', ')}: no problems are written yet, so there is nothing to check. Leave it for another day.</p>
      <div class="actions">
        <button type="button" class="btn btn-primary" onClick={onLeave}>Leave it for now</button>
      </div>
    </div>
  );
}

function leave(p: Progress, index: number): void {
  void commit(skipTask(p, index, now())).then(() => after(p, index));
}

/** What one review answer does, given the answers before it. */
export function reviewConsequence(before: readonly boolean[], o: CardOutcome): Consequence {
  const last = before.length + 1 >= REVIEW_PROBLEMS;
  const next = last ? 'Finish the review' : 'Next problem';
  const missed = before.indexOf(false);
  if (o !== 'correct') {
    return { effect: 'A review passes only when both problems are right, so this review is missed. The topic comes back sooner.', next };
  }
  if (missed >= 0) return { effect: `Right, but problem ${missed + 1} was missed, so this review is missed. The topic comes back sooner.`, next };
  return last
    ? { effect: 'Both problems right: the review passes, and the next one is further away.', next }
    : { effect: 'A review passes when both problems are right.', next };
}

/** What one quiz answer does: each item is a review of its topic. */
export function quizConsequence(title: string, last: boolean, o: CardOutcome): Consequence {
  return {
    effect: o === 'correct'
      ? `This counts as a passed review of ${title}: its next review moves further away.`
      : `This counts as a missed review of ${title}: it comes back sooner.`,
    next: last ? 'Finish the quiz' : 'Next item',
  };
}

/** A review: two problems from different skills of one topic; it passes when both are right. */
function ReviewRunner({ p, task, index }: { p: Progress; task: SessionTask; index: number }) {
  const id = task.topicIds[0] as string;
  const c = contentFor(id);
  const [results, setResults] = useState<boolean[]>([]);
  // A broken problem is replaced by a fresh one in the same slot; nothing is counted.
  const [fresh, setFresh] = useState({ k: -1, n: 0 });
  const k = results.length;
  const n = fresh.k === k ? fresh.n : 0;
  const salt = `review-${p.session?.startedAt ?? 0}-${index}`;
  const record = (correct: boolean): void => {
    void commit(completeReview(p, id, correct, now(), index));
  };
  return (
    <section class="page review" aria-labelledby="rv-title">
      <BackLink to={{ view: 'today' }} label="Back to today" />
      <p class="small muted">Review</p>
      <h1 id="rv-title">{titleOf(id)}</h1>
      <p class="small muted">{task.reason}</p>
      {c === undefined
        ? <NotWritten topicIds={[id]} onLeave={() => leave(p, index)} />
        : (
          <>
            <p class="small muted">Problem {results.length + 1} of {REVIEW_PROBLEMS}</p>
            <ProblemCard
              key={`${k}-${n}`}
              index={k}
              mode="review"
              topicId={id}
              instance={n === 0 ? instanceAt(c, salt, k) : instanceAt(c, `${salt}.fresh${n}`, k)}
              consequence={(o) => reviewConsequence(results, o)}
              onDone={(r) => {
                if (r.outcome === 'problem-error') {
                  setFresh({ k, n: n + 1 });
                  return;
                }
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
  // A broken problem is replaced by a fresh one for the same item; nothing is counted.
  const [fresh, setFresh] = useState({ k: -1, n: 0 });
  // Only items with problems can be asked; the planner schedules no others.
  const items = task.topicIds.filter(hasContent);
  const done = Object.keys(results).length;
  const id = items[done];
  if (id === undefined) {
    return (
      <section class="page quiz" aria-labelledby="qz-title">
        <BackLink to={{ view: 'today' }} label="Back to today" />
        <h1 id="qz-title">Quiz</h1>
        <NotWritten topicIds={task.topicIds} onLeave={() => leave(p, index)} />
      </section>
    );
  }
  const c = contentFor(id);
  const n = fresh.k === done ? fresh.n : 0;
  const salt = `quiz-${p.session?.startedAt ?? 0}-${index}`;
  const record = (correct: boolean): void => {
    const rs = { ...results, [id]: correct };
    if (Object.keys(rs).length >= items.length) void commit(completeQuiz(p, rs, now(), index));
    else setResults(rs);
  };
  return (
    <section class="page quiz" aria-labelledby="qz-title">
      <BackLink to={{ view: 'today' }} label="Back to today" />
      <p class="small muted">Quiz: item {done + 1} of {items.length}, about {Math.round(task.minutes / task.topicIds.length)} minutes each</p>
      <progress class="bar" max={items.length} value={done} aria-label="Quiz progress" />
      <h1 id="qz-title">{titleOf(id)}</h1>
      {c !== undefined && (
        <ProblemCard
          key={`${id}-${n}`}
          topicId={id}
          index={done}
          mode="quiz"
          instance={n === 0 ? instanceAt(c, salt, done) : instanceAt(c, `${salt}.fresh${n}`, done)}
          consequence={(o) => quizConsequence(titleOf(id), done + 1 >= items.length, o)}
          onDone={(r) => {
            if (r.outcome === 'problem-error') setFresh({ k: done, n: n + 1 });
            else record(r.correct);
          }}
        />
      )}
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
      onSkip={() => leave(p, index)}
      back={{ to: { view: 'today' }, label: 'Back to today' }}
    />
  );
}

/** A lesson opened from the map, outside today's plan. */
export function LearnView({ topicId }: { topicId: string }) {
  const p = progress.value;
  const t = topicOf(topicId);
  const [done, setDone] = useState<boolean | null>(null);
  // Fixed until the lesson ends, so problems do not change while they are answered or after leaving and coming back.
  const [salt] = useState(() => learnSalt(topicId, now()));
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
      onEnd={(e) => { clearLearnSalt(topicId); void commit(completeLesson(p, topicId, e.passed, now(), null, t.estMinutes)).then(() => setDone(e.passed)); }}
      onSkip={() => go({ view: 'map', topicId })}
      back={{ to: { view: 'map', topicId }, label: 'Back to the map' }}
    />
  );
}
