/**
 * Today: the day planner (Begin the day) on top, then the session plan from
 * `planSession`, stored for the day so a reload shows the same tasks. Each task says why it is there, in the planner's words; the header shows
 * the time left and how today's lesson minutes split between the courses. Below the plan,
 * problems a supervisor set to redo, and Paste result for copies still waiting for one.
 */
import { useEffect } from 'preact/hooks';
import type { SessionTask } from '@learnhub/mastery';
import { prefetchContent } from '@/model/content';
import { shortName, titleOf } from '@/model/courses';
import { ensureSession, localDay, planMore, replanToday, sessionTime } from '@/model/learner';
import { go } from '@/model/route';
import { commit, now, progress } from '@/model/store';
import { SupervisionToday } from '@/ui/Supervision';
import { campaignFixedFor } from '@/ui/campaignShared';
import { DayPlanner } from '@/ui/views/DayPlanner';

const KIND: Record<SessionTask['kind'], string> = { lesson: 'New lesson', review: 'Review', quiz: 'Quiz' };

function taskTitle(t: SessionTask): string {
  if (t.kind === 'quiz') return `${t.topicIds.length} topics: ${t.topicIds.map(titleOf).join(', ')}`;
  return titleOf(t.topicIds[0] as string);
}

function result(t: SessionTask): string {
  if (!t.done) return '';
  if (t.passed === null) return 'Skipped for today';
  if (t.kind === 'lesson') return t.passed ? 'Learned' : 'Not yet: it comes back another day';
  return t.passed ? 'Passed' : 'Missed: it comes back sooner';
}

export function Today() {
  const p = progress.value;
  const today = p === null ? null : localDay(now());
  useEffect(() => {
    if (p !== null && (p.session === null || p.session.day !== today)) void commit(ensureSession(p, now()));
  }, [p === null, p?.session?.day, today]);
  // Download today's lessons in the background, so a session started online carries on offline.
  const planned = p?.session?.tasks.filter((t) => !t.done).flatMap((t) => t.topicIds) ?? [];
  const redoTopics = p?.redos.filter((d) => d.doneAt === null).map((d) => d.problem.slice(0, d.problem.indexOf('/'))) ?? [];
  useEffect(() => prefetchContent([...planned, ...redoTopics]), [[...planned, ...redoTopics].join()]);

  if (p === null) return <p class="page">Planning today.</p>;
  if (p.session === null || p.session.day !== today) return <><DayPlanner p={p} fixed={campaignFixedFor} /><p class="page">Planning today.</p></>;
  const s = p.session;
  const time = sessionTime(s);
  const nextIndex = s.tasks.findIndex((t) => !t.done);
  const date = new Date(now()).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <>
      <DayPlanner p={p} fixed={campaignFixedFor} />
      <section class="page today" aria-labelledby="session-title">
        <h2 id="session-title">Today's session</h2>
        <p class="small muted">{date}. Your daily time is {p.settings.budgetMinutes} minutes.</p>
        <div class="today-summary">
          <div class="stat"><span class="stat-value">{time.left}</span><span class="stat-label">minutes left</span></div>
          <div class="stat"><span class="stat-value">{time.done}</span><span class="stat-label">minutes done</span></div>
          {p.courses.map((c) => {
            const m = time.byCourse[c] ?? { done: 0, planned: 0 };
            return (
              <div key={c} class="stat">
                <span class="stat-value">{m.planned}</span>
                <span class="stat-label">lesson minutes for {shortName(c)}</span>
              </div>
            );
          })}
        </div>

        {s.tasks.length === 0 && <p>Nothing is due and nothing new fits today. Come back tomorrow, or change your daily time in Progress.</p>}

        <ol class="tasks">
          {s.tasks.map((t, i) => {
            return (
              <li key={i} class={`task task-${t.kind}${t.done ? ' done' : ''}${i === nextIndex ? ' next' : ''}`}>
                <div class="task-head">
                  <span class={`badge badge-${t.kind}`}>{KIND[t.kind]}</span>
                  {t.course !== undefined && <span class="badge badge-course">{shortName(t.course)}</span>}
                  <span class="small muted">{t.minutes} min</span>
                </div>
                <h2 class="task-title">{taskTitle(t)}</h2>
                <p class="small reason">{t.reason}</p>
                <div class="task-foot">
                  {t.done
                    ? <span class={`result ${t.passed === true ? 'good' : t.passed === false ? 'bad' : ''}`}>{result(t)}</span>
                    : (
                      <button type="button" class={`btn ${i === nextIndex ? 'btn-primary' : ''}`} onClick={() => go({ view: 'task', index: i })}>
                        {i === nextIndex ? 'Start' : 'Open'}
                      </button>
                    )}
                </div>
              </li>
            );
          })}
        </ol>

        <SupervisionToday p={p} />

        {nextIndex < 0 && s.tasks.length > 0 && (
          <div class="done-today">
            <h2>Done for today</h2>
            <p>Well done. Reviews and new lessons will be ready tomorrow. If you have time now, you can plan another session.</p>
            <button type="button" class="btn" onClick={() => void commit(planMore(p, now()))}>Plan another session</button>
          </div>
        )}
        <p class="small muted">
          Changed your daily time or the course split?{' '}
          <button type="button" class="linklike" onClick={() => void commit(replanToday(p, now()))}>Plan the rest of today again</button>
        </p>
      </section>
    </>
  );
}
