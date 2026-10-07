/**
 * Today (mastery/design-v4.html): the live time to the second, a greeting that follows the
 * time of day, one line of status, the Now card with a single Start, a line when a scene is
 * ready, and Later today as short rows. On a wide screen the week, Shabbat, and the streak
 * sit in a quiet side column.
 *
 * Below, folded under "The whole day", the full planner (Begin the day: wake time,
 * timeline, ticks, replan, Up next with the timed ladder's next step, week, Shabbat,
 * another day) and today's session from `planSession`, stored for the day so a reload
 * shows the same tasks. Each task says why
 * it is there; below the session, supervision redos and Paste result.
 */
import { useEffect, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import type { Progress, SessionTask } from '@learnhub/mastery';
import { BOOK, placeOf } from '@learnhub/content/book';
import { hereChapter } from '@/model/book';
import { prefetchContent } from '@/model/content';
import { shortName, titleOf } from '@/model/courses';
import { CORE, addDays, fmtLong, planDate, sunsetMinutes, type Slot } from '@/model/day';
import { loadDays, type DayLog } from '@/model/dayLog';
import { learnerSynced } from '@/model/learnerChange';
import { withDayTasks, type DayItem } from '@/model/dayQueue';
import { ensureSession, localDay, planMore, replanToday, sessionTime } from '@/model/learner';
import { go, hrefOf, type Route } from '@/model/route';
import { LEARNER_NAME, clockText, greeting, nyClock } from '@/model/shell';
import { commit, now, progress } from '@/model/store';
import { sceneById } from '@/model/storyScenes';
import { playing, story } from '@/model/storyStore';
import { SupervisionToday } from '@/ui/Supervision';
import { admissions, campaignFixedFor, loadAdmissions } from '@/ui/campaignShared';
import { campaignUnlockLine, ladderSuggestion } from '@/ui/ladderShared';
import { ensureLadder } from '@/model/ladderStore';
import { ContinueReading } from '@/ui/views/Book';
import { DayPlanner } from '@/ui/views/DayPlanner';
import { WEEK_TARGET_HOURS, dayView, shabbatOf, streakDays, weekMinutes, yomTovOfWeek, type DayView } from '@/ui/views/dayView';
import { yomTovOf } from '@/model/holidays';
import { stageOf } from '@/ui/views/stages';
import { STANDUP_LENGTH, isStandupDay } from '@/model/standup';
import { standup, withStandup } from '@/model/standupStore';

/** The day's fixed blocks: the cohort's standup, pinned at its time, then the campaign's timed work. */
const dayFixed = withStandup(campaignFixedFor);

const KIND: Record<SessionTask['kind'], string> = { lesson: 'New lesson', review: 'Review', quiz: 'Quiz' };
const ITEM_KIND: Record<DayItem['kind'], string> = { lesson: 'Lesson', review: 'Review', quiz: 'Quiz', redo: 'Supervision redo', mixed: 'Blind mixed review' };
const OPEN_KEY = 'mastery.wholeday.v1';

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

const hours = (m: number): string => {
  const h = Math.round((m / 60) * 10) / 10;
  return Number.isInteger(h) ? String(h) : h.toFixed(1);
};
const upper = (m: number): string => fmtLong(m).toUpperCase();
const weekday = (date: string): string => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });

/** The clock, to the second; only this re-renders each second. Not announced, so a screen reader is not interrupted. */
function LiveClock() {
  const [t, setT] = useState(now);
  useEffect(() => {
    const id = setInterval(() => setT(now()), 1000);
    return () => clearInterval(id);
  }, []);
  return <time class="ds-clock" aria-live="off">{clockText(t)}</time>;
}

/** The greeting, checked each minute. Before 5 am is still the evening. */
function Greeting() {
  const [h, setH] = useState(() => nyClock(now()).h);
  useEffect(() => {
    const id = setInterval(() => setH(nyClock(now()).h), 60_000);
    return () => clearInterval(id);
  }, []);
  return <h1 class="ds-h1">{greeting(h)}, {LEARNER_NAME}.</h1>;
}

/** A link into the app. `before` runs first on a plain click: adding the forecast to the session, so the task it opens exists. */
function Go({ to, cls, before, children, label }: { to: Route; cls: string; before?: () => void; children: ComponentChildren; label?: string }) {
  return (
    <a
      class={cls} href={hrefOf(to)} aria-label={label}
      onClick={(e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        before?.();
        go(to);
      }}
    >
      {children}
    </a>
  );
}

interface Card {
  slot: Slot | null;
  title: string;
  meta: string;
  to: Route | null;
  forecast: boolean;
}

/** Where an item sits in the book: "Writing proofs", for the Now card's line. */
function chapterOfItem(p: Progress, x: DayItem): string | null {
  const r = x.to;
  const topic = r.view === 'task' ? p.session?.tasks[r.index]?.topicIds[0] : r.view === 'learn' || r.view === 'problem' ? r.topicId : undefined;
  if (topic === undefined) return null;
  return placeOf(topic)?.chapter.title ?? null;
}

/** What a block holds, as a card: its first open item, the gym, a timed paper, or a meal. */
function cardOf(p: Progress, v: DayView, s: Slot): Card | null {
  const len = s.end - s.start;
  if (s.kind === 'meeting') return { slot: s, title: s.title, meta: `${s.detail !== '' ? s.detail : 'Meeting'}`, to: s.fixed?.to ?? null, forecast: false };
  if (s.fixed !== undefined) return { slot: s, title: s.title, meta: `Timed work · ${len} min`, to: s.fixed.to ?? null, forecast: false };
  if (s.kind === 'gym') return { slot: s, title: 'Gym', meta: `gym mode · ${len} min`, to: { view: 'gym' }, forecast: false };
  if (s.kind === 'meal') return { slot: s, title: s.title, meta: `${len} min`, to: null, forecast: false };
  if (s.kind === 'study' || s.kind === 'optional') {
    const open = (v.fill.get(s) ?? []).filter((x) => !x.done);
    const x = open[0];
    if (x === undefined) return null;
    const ch = chapterOfItem(p, x);
    return { slot: s, title: x.title, meta: [ITEM_KIND[x.kind], ch].filter((y) => y !== null).join(' · '), to: x.to, forecast: x.forecast };
  }
  return null;
}

/** The Now card: the block running now if it has something to start, else the next block that does. */
function nowCard(p: Progress, v: DayView): Card | null {
  const ahead = v.plan.slots.filter((s) => s.kind !== 'break' && s.end > v.nowMin && !v.ticks.has(s.start));
  for (const s of ahead) {
    if (s.kind === 'meal') continue;
    // A standup already given has nothing left to start.
    if (s.kind === 'meeting' && standup.peek().attended.includes(v.date)) continue;
    const c = cardOf(p, v, s);
    if (c !== null && c.to !== null) return c;
  }
  // Nothing left in a block: the queue's leftovers.
  const x = v.left.find((y) => !y.done);
  if (x !== undefined) return { slot: null, title: x.title, meta: ITEM_KIND[x.kind], to: x.to, forecast: x.forecast };
  return null;
}

/** On a yom tov or its eve: when the rest begins or ends (Brooklyn sundown). */
function RestLine({ date, nowMin }: { date: string; nowMin: number }) {
  const sunset = sunsetMinutes(date);
  const today = yomTovOf(date);
  const tomorrow = yomTovOf(addDays(date, 1));
  const text = today !== null && nowMin < sunset
    ? <>{today}: a rest day until sundown, <b>{fmtLong(sunset)}</b>. Nothing is planned before then.</>
    : tomorrow !== null
      ? <>{tomorrow} begins at sundown, <b>{fmtLong(sunset)}</b>. Nothing is planned after it.</>
      : null;
  if (text === null) return null;
  return (
    <p class="ds-sceneline ds-restline">
      <span class="ds-dot" aria-hidden="true" />
      <span>{text}</span>
    </p>
  );
}

/** "Standup at 10:00 am" on a day with one, with where it stands; a link to the standup. */
function StandupLine({ date, nowMin }: { date: string; nowMin: number }) {
  const st = standup.value;
  if (!isStandupDay(date, st)) return null;
  const end = st.minutes + STANDUP_LENGTH;
  const state = st.attended.includes(date) ? 'done' : nowMin < st.minutes ? '' : nowMin < end ? 'on now' : 'missed';
  return (
    <Go to={{ view: 'standup' }} cls={`ds-sceneline ds-standupline${state === 'missed' ? ' missed' : ''}`}>
      <span class="ds-dot" aria-hidden="true" />
      <span>Standup at {fmtLong(st.minutes)}{state === '' ? '' : <> · <b>{state}</b></>}</span>
      <span class="ds-go" aria-hidden="true">open ›</span>
    </Go>
  );
}

function Header({ p, v, log }: { p: Progress; v: DayView; log: DayLog }) {
  const t = now();
  const date = new Date(`${v.date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const here = hereChapter(p);
  const year = BOOK.find((y) => y.id === here?.yearId);
  const week = Math.floor((t - p.createdAt) / (7 * 86_400_000)) + 1;
  const card = nowCard(p, v);
  const addDay = (): void => {
    const next = withDayTasks(p, v.queue.at, v.budget);
    if (next !== p) void commit({ ...next, updatedAt: now() });
  };
  const nowSlot = card?.slot ?? null;
  const later = v.plan.slots.filter((s) => s.kind !== 'break' && s.start > (nowSlot?.start ?? v.nowMin) && s !== nowSlot && s.end > v.nowMin);
  const st = story.value;
  const ready = playing.value === null ? st.queued.map((q) => sceneById(q.id)).find((s) => s !== undefined && s.script !== null) : undefined;
  const wk = weekMinutes(log, v.date, dayFixed).reduce((a, d) => a + d.minutes, 0);
  const pct = Math.min(100, Math.round((100 * wk) / 60 / WEEK_TARGET_HOURS));
  const sh = shabbatOf(v.date);
  const streak = streakDays(p, log, t, dayFixed);
  const isCur = nowSlot !== null && v.cur === nowSlot;
  // Before the campaign's exam topics are ready no paper is planned; say what unlocks the first timed question.
  const unlock = campaignUnlockLine();
  return (
    <div class="ds-split">
      <div>
        <div class="ds-clockrow"><span class="ds-eyebrow">{date}</span><LiveClock /></div>
        <Greeting />
        <p class="ds-meta">
          woke {fmtLong(v.wake)} · {hours(v.coreDone)} of {CORE / 60} h studied{year !== undefined ? ` · ${stageOf(year).name}, week ${week}` : ''}
        </p>
        <section class="ds-now" aria-labelledby="now-title">
          {card === null
            ? (
              <>
                <div class="ds-tag">DONE FOR TODAY</div>
                <h2 id="now-title" class="ds-now-t">Nothing is left in today's plan</h2>
                <div class="ds-row">
                  <button type="button" class="ds-btn" onClick={() => void commit(planMore(p, now()))}>Plan another session</button>
                </div>
              </>
            )
            : (
              <>
                <div class="ds-tag">
                  {nowSlot === null ? 'NEXT' : isCur ? `NOW · ${upper(nowSlot.start)} to ${upper(nowSlot.end)}` : `NEXT · ${upper(nowSlot.start)} to ${upper(nowSlot.end)}`}
                </div>
                <h2 id="now-title" class="ds-now-t">{card.title}</h2>
                <div class="ds-meta">{card.meta}</div>
                <div class="ds-row">
                  <Go to={card.to as Route} cls="ds-btn" before={card.forecast ? addDay : undefined} label={`Start: ${card.title}`}>
                    Start
                  </Go>
                </div>
              </>
            )}
        </section>
        {unlock !== null && <p class="ds-note ds-unlock">{unlock}</p>}
        <RestLine date={v.date} nowMin={v.nowMin} />
        <StandupLine date={v.date} nowMin={v.nowMin} />
        {ready !== undefined && (
          <button type="button" class="ds-sceneline" onClick={() => { playing.value = { id: ready.id, auto: false }; }}>
            <span class="ds-dot" aria-hidden="true" />
            <span>A scene is ready: <b>{ready.title}</b></span>
            <span class="ds-go" aria-hidden="true">play ›</span>
          </button>
        )}
        <section class="ds-sect" aria-labelledby="later-title">
          <div class="ds-eyebrow ds-sect-h"><h2 id="later-title">Later today</h2><span>{later.length}</span></div>
          {later.length === 0
            ? <p class="ds-note">Nothing more is planned today.</p>
            : (
              <ul class="ds-list">
                {later.map((s) => {
                  const c = cardOf(p, v, s);
                  const len = s.end - s.start;
                  const items = v.fill.get(s) ?? [];
                  const title = c?.title ?? (s.kind === 'optional' ? 'Light study' : 'Study');
                  const sub = s.kind === 'meal' ? '' : s.kind === 'meeting' ? `${len} min` : s.kind === 'study' || s.kind === 'optional'
                    ? (s.fixed !== undefined ? `timed work · ${len} min` : `${items.length === 0 ? 'nothing planned yet' : `${items.length} ${items.length === 1 ? 'item' : 'items'}`} · ${len} min`)
                    : c?.meta ?? '';
                  const body = (
                    <>
                      <span class="ds-t">{fmtLong(s.start)}</span>
                      <span class={`ds-x${s.kind === 'meal' ? ' quiet' : ''}`}>{title}{sub !== '' && <small>{sub}</small>}</span>
                      <span class="ds-r" aria-hidden="true">{c?.to != null ? '›' : ''}</span>
                    </>
                  );
                  return (
                    <li key={s.start}>
                      {c !== null && c.to !== null
                        ? <Go to={c.to} cls="ds-li" before={c.forecast ? addDay : undefined}>{body}</Go>
                        : <div class="ds-li">{body}</div>}
                    </li>
                  );
                })}
              </ul>
            )}
        </section>
      </div>
      <aside class="ds-side" aria-label="This week">
        <div class="ds-eyebrow">This week</div>
        <div class="ds-kv"><span>{hours(wk)} / {WEEK_TARGET_HOURS} h</span><span>{pct}%</span></div>
        <div class="ds-track" role="progressbar" aria-label="Hours this week" aria-valuemin={0} aria-valuemax={WEEK_TARGET_HOURS} aria-valuenow={Number(hours(wk))}>
          <i style={{ width: `${pct}%` }} />
        </div>
        <div class="ds-sect"><div class="ds-eyebrow">Shabbat</div><div class="ds-meta">Fri {fmtLong(sh.begins)} to Sat {fmtLong(sh.ends)}</div></div>
        {yomTovOfWeek(v.date).map((y) => (
          <div key={y.first} class="ds-sect">
            <div class="ds-eyebrow">{y.name}</div>
            <div class="ds-meta">{weekday(y.eve)} {fmtLong(y.begins)} to {weekday(y.last)} {fmtLong(y.ends)}</div>
          </div>
        ))}
        <div class="ds-sect"><div class="ds-eyebrow">Streak</div><div class="ds-h1 ds-streak">{streak} {streak === 1 ? 'day' : 'days'}</div></div>
      </aside>
    </div>
  );
}

function openStored(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(OPEN_KEY) === '1';
  } catch {
    return false;
  }
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
  const [log, setLog] = useState<DayLog>(loadDays);
  // Sync may bring days planned or ticked on another device: read them again when it writes.
  const synced = learnerSynced.value;
  useEffect(() => { if (synced > 0) setLog(loadDays()); }, [synced]);
  const [open, setOpen] = useState(openStored);
  // The timed ladder's next step for Up next needs the paper registry and the stored attempts.
  const adm = admissions.value;
  useEffect(() => {
    if (adm === null) void loadAdmissions();
    else ensureLadder(adm);
  }, [adm]);
  // The header follows the clock; the planner has its own 30-second tick.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  if (p === null) return <p class="page">Planning today.</p>;
  const planner = <DayPlanner p={p} fixed={dayFixed} log={log} onLog={setLog} ladder={ladderSuggestion()} />;
  if (p.session === null || p.session.day !== today) return <section class="ds-page">{planner}<p class="page">Planning today.</p></section>;
  const s = p.session;
  const time = sessionTime(s);
  const nextIndex = s.tasks.findIndex((t) => !t.done);
  const v = dayView(p, log, planDate(now()), now(), dayFixed);

  return (
    <section class="ds-page ds-today" aria-labelledby="now-title">
      <Header p={p} v={v} log={log} />
      <details
        class="ds-more" open={open}
        onToggle={(e) => {
          const o = (e.currentTarget as HTMLDetailsElement).open;
          setOpen(o);
          try { localStorage.setItem(OPEN_KEY, o ? '1' : '0'); } catch { /* not kept */ }
        }}
      >
        <summary>The whole day<span class="ds-more-s">timeline, wake time, session, and redos</span></summary>
        {planner}
        <section class="page today" aria-labelledby="session-title">
          <div class="sec-h"><h2 id="session-title">Today's session</h2></div>
          <p class="small muted">Your daily time is {p.settings.budgetMinutes} minutes.</p>
          <ContinueReading p={p} />
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

          {s.tasks.length === 0 && <p>Nothing is due and nothing new fits today. Come back tomorrow, or change your daily time in You.</p>}

          <ol class="tasks">
            {s.tasks.map((t, i) => (
              <li key={i} class={`task task-${t.kind}${t.done ? ' done' : ''}${i === nextIndex ? ' next' : ''}`}>
                <div class="task-head">
                  <span class={`badge badge-${t.kind}`}>{KIND[t.kind]}</span>
                  {t.course !== undefined && <span class="badge badge-course">{shortName(t.course)}</span>}
                  <span class="small muted">{t.minutes} min</span>
                </div>
                <h3 class="task-title">{taskTitle(t)}</h3>
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
            ))}
          </ol>

          <SupervisionToday p={p} />

          {nextIndex < 0 && s.tasks.length > 0 && (
            <div class="done-today">
              <h3>Done for today</h3>
              <p>Well done. Reviews and new lessons will be ready tomorrow. If you have time now, you can plan another session.</p>
              <button type="button" class="btn" onClick={() => void commit(planMore(p, now()))}>Plan another session</button>
            </div>
          )}
          <p class="small muted">
            Changed your daily time or the course split?{' '}
            <button type="button" class="linklike" onClick={() => void commit(replanToday(p, now()))}>Plan the rest of today again</button>
          </p>
        </section>
      </details>
    </section>
  );
}
