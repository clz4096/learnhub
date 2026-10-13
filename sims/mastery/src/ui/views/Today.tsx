/**
 * Today (mastery/design-v4.html): the live time to the second, a greeting that follows the
 * time of day, one line of status, the one planning control (the wake time and Plan from
 * now), the Now card with a single Start and why its item is planned, one quiet line on what
 * unlocks the first timed question while it is locked, and lines for the standup, a ready
 * scene, and Shabbat or yom tov. Then the day's timeline (the planner: blocks, ticks,
 * another day), which is the one list of the day's items: each item of today's session from
 * `planSession` (stored for the day, so a reload shows the same tasks) and of its forecast
 * appears once, there. Below it, supervision redos the plan does not hold and Paste result.
 * The week, Shabbat, and the streak sit in a quiet side column; below 900 px they fold into
 * one row under the day.
 */
import { useEffect, useId, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { currentProblemKey } from '@learnhub/content';
import type { Progress } from '@learnhub/mastery';
import { BOOK, placeOf } from '@learnhub/content/book';
import { hereChapter } from '@/model/book';
import { prefetchContent } from '@/model/content';
import { titleOf } from '@/model/courses';
import { CORE, addDays, fmtLong, planDate, sunsetMinutes, type Slot } from '@/model/day';
import { loadDays, type DayLog } from '@/model/dayLog';
import { learnerSynced } from '@/model/learnerChange';
import { withDayTasks, type DayItem } from '@/model/dayQueue';
import { ensureSession, localDay, planMore, recommendedNext } from '@/model/learner';
import { go, hrefOf, type Route } from '@/model/route';
import { LEARNER_NAME, clockText, greeting, nyClock } from '@/model/shell';
import { commit, now, progress } from '@/model/store';
import { sceneById } from '@/model/storyScenes';
import { playing, story } from '@/model/storyStore';
import { SupervisionToday } from '@/ui/Supervision';
import { admissions, campaignFixedFor, loadAdmissions } from '@/ui/campaignShared';
import { campaignUnlockLine, ladderSuggestion } from '@/ui/ladderShared';
import { nextDetail } from '@/model/ladderNext';
import { ensureLadder } from '@/model/ladderStore';
import { DayPlanner, PlanControl, WeekBars } from '@/ui/views/DayPlanner';
import { WEEK_TARGET_HOURS, dayView, shabbatOf, streakDays, weekMinutes, yomTovOfWeek, type DayView } from '@/ui/views/dayView';
import { yomTovOf } from '@/model/holidays';
import { stageOf } from '@/ui/views/stages';
import { STANDUP_LENGTH, isStandupDay } from '@/model/standup';
import { standup, withStandup } from '@/model/standupStore';
import '@/styles/screens/today.css';

/** The day's fixed blocks: the cohort's standup, pinned at its time, then the campaign's timed work. */
const dayFixed = withStandup(campaignFixedFor);

/** A locked ladder suggestion's detail: its title then only says what unlocks the first timed question. */
const LOCKED_DETAIL = nextDetail({ exam: 'STEP', state: 'locked', rung: 'question', title: '', minutes: null, to: { view: 'today' } });

const ITEM_KIND: Record<DayItem['kind'], string> = { lesson: 'Lesson', review: 'Review', quiz: 'Quiz', redo: 'Redo', mixed: 'Blind mixed review', retest: 'Cold retest' };

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
  /** Why the item is planned (a session task's reason); null for a block that is not a task. */
  why: string | null;
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
  if (s.kind === 'meeting') return { slot: s, title: s.title, meta: `${s.detail !== '' ? s.detail : 'Meeting'}`, to: s.fixed?.to ?? null, forecast: false, why: null };
  if (s.fixed !== undefined) return { slot: s, title: s.title, meta: `Timed work · ${len} min`, to: s.fixed.to ?? null, forecast: false, why: null };
  if (s.kind === 'gym') return { slot: s, title: 'Gym', meta: `gym mode · ${len} min`, to: { view: 'gym' }, forecast: false, why: null };
  if (s.kind === 'meal') return { slot: s, title: s.title, meta: `${len} min`, to: null, forecast: false, why: null };
  if (s.kind === 'study' || s.kind === 'optional') {
    const open = (v.fill.get(s) ?? []).filter((x) => !x.done);
    const x = open[0];
    if (x === undefined) return null;
    const ch = chapterOfItem(p, x);
    return { slot: s, title: x.title, meta: [ITEM_KIND[x.kind], ch].filter((y) => y !== null).join(' · '), to: x.to, forecast: x.forecast, why: x.reason ?? null };
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
  if (x !== undefined) return { slot: null, title: x.title, meta: ITEM_KIND[x.kind], to: x.to, forecast: x.forecast, why: x.reason ?? null };
  return null;
}

/** On a yom tov or its eve: when the rest begins or ends (Brooklyn sundown). */
function RestLine({ date, nowMin }: { date: string; nowMin: number }) {
  const sunset = sunsetMinutes(date);
  const today = yomTovOf(date);
  const tomorrow = yomTovOf(addDays(date, 1));
  const text = today !== null && nowMin < sunset
    ? <>{today}. Nothing scheduled until {today} ends.</>
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

/**
 * "Recommended next" when a supervisor named an earlier topic as the gap behind a mark below
 * the pass mark, while it is not mastered (`recommendedNext`): a link to the first, in book order.
 */
function RecommendedLine({ p }: { p: Progress }) {
  const next = recommendedNext(p);
  const id = next[0];
  if (id === undefined) return null;
  const to: Route = placeOf(id) !== undefined ? { view: 'learn', topicId: id, from: 'book' } : { view: 'learn', topicId: id };
  return (
    <Go to={to} cls="ds-sceneline ds-recommended">
      <span class="ds-dot" aria-hidden="true" />
      <span>Recommended next: <b>{titleOf(id)}</b>{next.length > 1 ? `, then ${next.slice(1).map(titleOf).join(', ')}` : ''}</span>
      <span class="ds-go" aria-hidden="true">open ›</span>
    </Go>
  );
}

/**
 * The header and the day: clock, greeting, status, the planning control, the Now card, the
 * day's lines, then `children` (the timeline and supervision) in the main column. `locked`
 * is the ladder's unlock line when its rung is locked, said under the Now card when the
 * campaign has none of its own.
 */
function Header({ p, v, log, onLog, locked, children }: {
  p: Progress; v: DayView; log: DayLog; onLog: (f: (l: DayLog) => DayLog) => void; locked: string | null; children: ComponentChildren;
}) {
  const [sideOpen, setSideOpen] = useState(false);
  const sideId = useId();
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
  const st = story.value;
  const ready = playing.value === null ? st.queued.map((q) => sceneById(q.id)).find((s) => s !== undefined && s.script !== null) : undefined;
  const wk = weekMinutes(log, v.date, dayFixed).reduce((a, d) => a + d.minutes, 0);
  const pct = Math.min(100, Math.round((100 * wk) / 60 / WEEK_TARGET_HOURS));
  const sh = shabbatOf(v.date);
  const yomTov = yomTovOfWeek(v.date);
  const streak = streakDays(p, log, t, dayFixed);
  const isCur = nowSlot !== null && v.cur === nowSlot;
  const { plan } = v;
  const ends = plan.coreEnd !== null ? `done by ${fmtLong(plan.coreEnd)}` : plan.core > 0 ? `${hours(Math.max(0, CORE - plan.core))} h carried to tomorrow` : 'no study fits today';
  // Before the campaign's exam topics are ready no paper is planned; say what unlocks the first timed question.
  const unlock = campaignUnlockLine() ?? locked;
  return (
    <div class="ds-split">
      <div>
        <div class="ds-clockrow"><span class="ds-eyebrow">{date}</span><LiveClock /></div>
        <Greeting />
        <p class="ds-meta">
          {hours(v.coreDone)} of {CORE / 60} h studied · {ends}{year !== undefined ? ` · ${stageOf(year).name}, week ${week}` : ''}
        </p>
        <PlanControl p={p} v={v} onLog={onLog} />
        <section class="ds-now" aria-labelledby="now-title">
          {card === null
            ? (
              <>
                <div class="ds-tag">DONE FOR TODAY</div>
                <h2 id="now-title" class="ds-now-t">Nothing is left in today's plan</h2>
                {/* With empty blocks left, the planner below offers this once, beside them. */}
                {v.dryBlocks === 0 && (
                  <div class="ds-row">
                    <button type="button" class="ds-btn" onClick={() => void commit(planMore(p, now()))}>Plan another session</button>
                  </div>
                )}
              </>
            )
            : (
              <>
                <div class="ds-tag">
                  {nowSlot === null ? 'NEXT' : isCur ? `NOW · ${upper(nowSlot.start)} to ${upper(nowSlot.end)}` : `NEXT · ${upper(nowSlot.start)} to ${upper(nowSlot.end)}`}
                </div>
                <h2 id="now-title" class="ds-now-t">{card.title}</h2>
                <div class="ds-meta">{card.meta}</div>
                {card.why !== null && <p class="ds-note ds-now-why">{card.why}</p>}
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
        <RecommendedLine p={p} />
        {ready !== undefined && (
          <button type="button" class="ds-sceneline" onClick={() => { playing.value = { id: ready.id, auto: false }; }}>
            <span class="ds-dot" aria-hidden="true" />
            <span>A scene is ready: <b>{ready.title}</b></span>
            <span class="ds-go" aria-hidden="true">play ›</span>
          </button>
        )}
        {children}
      </div>
      <aside class={`ds-side${sideOpen ? ' open' : ''}`} aria-label="This week">
        {/* Below 900 px the column folds into this one row; wider, the row is hidden and the column shows. */}
        <button type="button" class="ds-side-row" aria-expanded={sideOpen} aria-controls={sideId} onClick={() => setSideOpen((o) => !o)}>
          <span>This week <b>{hours(wk)}</b> of {WEEK_TARGET_HOURS} h · streak <b>{streak}</b> {streak === 1 ? 'day' : 'days'}</span>
          <svg class="ds-side-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
        </button>
        <div id={sideId} class="ds-side-body">
          <div class="ds-eyebrow">This week</div>
          <div class="ds-kv"><span>{hours(wk)} / {WEEK_TARGET_HOURS} h</span><span>{pct}%</span></div>
          <div class="ds-track" role="progressbar" aria-label="Hours this week" aria-valuemin={0} aria-valuemax={WEEK_TARGET_HOURS} aria-valuenow={Number(hours(wk))}>
            <i style={{ width: `${pct}%` }} />
          </div>
          <WeekBars log={log} date={v.date} fixed={dayFixed} />
          <p class="ds-note ds-side-note">Hours ticked off in this browser. The line marks the 6-hour day. Saturday is Shabbat{yomTov.length > 0 ? '; yom tov days are marked too' : ''}.</p>
          <div class="ds-sect"><div class="ds-eyebrow">Shabbat</div><div class="ds-meta ds-shab">Fri {fmtLong(sh.begins)} to Sat {fmtLong(sh.ends)}</div></div>
          {yomTov.map((y) => (
            <div key={y.first} class="ds-sect">
              <div class="ds-eyebrow">{y.name}</div>
              <div class="ds-meta">{weekday(y.eve)} {fmtLong(y.begins)} to {weekday(y.last)} {fmtLong(y.ends)}</div>
            </div>
          ))}
          <p class="ds-note ds-side-note">Brooklyn sundown, computed on this device. Nothing is scheduled in between.</p>
          <div class="ds-sect"><div class="ds-eyebrow">Streak</div><div class="ds-h1 ds-streak">{streak} {streak === 1 ? 'day' : 'days'}</div></div>
        </div>
      </aside>
    </div>
  );
}

export function Today() {
  const p = progress.value;
  const today = p === null ? null : localDay(now());
  useEffect(() => {
    if (p !== null && (p.session === null || p.session.day !== today)) void commit(ensureSession(p, now()));
  }, [p === null, p?.session?.day, today]);
  // Download today's lessons in the background, so a session started online carries on offline.
  const planned = p?.session?.tasks.filter((t) => !t.done).flatMap((t) => t.topicIds) ?? [];
  const redoTopics = p?.redos.filter((d) => d.doneAt === null).map((d) => currentProblemKey(d.problem)).map((k) => k.slice(0, k.indexOf('/'))) ?? [];
  useEffect(() => prefetchContent([...planned, ...redoTopics]), [[...planned, ...redoTopics].join()]);
  const [log, setLog] = useState<DayLog>(loadDays);
  // Sync may bring days planned or ticked on another device: read them again when it writes.
  const synced = learnerSynced.value;
  useEffect(() => { if (synced > 0) setLog(loadDays()); }, [synced]);
  // The timed ladder's next step, under the timeline, needs the paper registry and the stored attempts.
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
  // A locked rung only says what unlocks it: one quiet line under the Now card, not a row in the day.
  const lad = ladderSuggestion();
  const locked = lad !== null && lad.detail === LOCKED_DETAIL ? lad.title : null;
  const ladder = locked === null ? lad : null;
  if (p.session === null || p.session.day !== today) {
    return <section class="ds-page"><DayPlanner p={p} fixed={dayFixed} log={log} onLog={setLog} ladder={ladder} /><p class="page">Planning today.</p></section>;
  }
  const v = dayView(p, log, planDate(now()), now(), dayFixed);
  // Redos due today are in the timeline; the supervision part lists only the rest.
  const inPlan = new Set(v.queue.items.filter((x) => x.kind === 'redo').map((x) => x.key));

  return (
    <section class="ds-page ds-today" aria-labelledby="now-title">
      <Header p={p} v={v} log={log} onLog={setLog} locked={locked}>
        <DayPlanner p={p} fixed={dayFixed} log={log} onLog={setLog} ladder={ladder} control={false} />
        <SupervisionToday p={p} skip={(k) => inPlan.has(k)} />
      </Header>
    </section>
  );
}
