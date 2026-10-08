/**
 * Begin the day (mastery/DESIGN-ADMISSIONS.md, "The day planner"), in the minimalist look:
 * the day's name, the date, the wake time ("woke 9:00 am", always 12-hour) and "now", a
 * thin progress line, then one timeline of the day. The wake time becomes the schedule
 * (`planDay`), its study blocks filled from the day's queue (the session's lessons,
 * reviews, and quizzes, more of them planned for the day's study minutes, and redos due
 * today). Below the timeline, quietly: Plan my day and Replan from now, Up next, the
 * week's ticked hours, this week's Shabbat times, and another day's plan. Wake times,
 * ticks, and replans are kept in the day log (`dayLog`), which sync carries in the learner
 * envelope. The progress document changes only
 * when the learner acts: opening a forecast item, planning the day, or replanning adds the
 * day's tasks to the session.
 */
import { useEffect, useState } from 'preact/hooks';
import { Fragment, type ComponentChildren } from 'preact';
import type { Progress } from '@learnhub/mastery';
import {
  CORE, GET_GOING, addDays, clockValue, fmtLong, isDate, parseClock, planDate,
  replanDay, restDaysOf, sunsetMinutes, weekdayOf, type FixedBlock, type Slot,
} from '@/model/day';
import { isYomTov } from '@/model/holidays';
import { loadDays, saveDay, type DayEntry, type DayLog } from '@/model/dayLog';
import { learnerSynced } from '@/model/learnerChange';
import { replanDayTasks, withDayTasks, type DayItem } from '@/model/dayQueue';
import { planMore } from '@/model/learner';
import { go, hrefOf, type Route } from '@/model/route';
import { commit, now } from '@/model/store';
import { DEFAULT_WAKE, WEEK_TARGET_HOURS, budgetFor, dayView, weekMinutes, yomTovOfWeek, type Next } from '@/ui/views/dayView';
import type { LadderSuggestion } from '@/ui/ladderShared';

const KIND: Record<DayItem['kind'], string> = { lesson: 'New lesson', review: 'Review', quiz: 'Quiz', redo: 'Redo', mixed: 'Blind mixed review', retest: 'Retest' };
const BAR_MAX_HOURS = 8;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** Up next shows this many items until Show all. */
const UP_NEXT = 8;
const NO_FIXED = (): readonly FixedBlock[] => [];
const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

const longDate = (date: string, o: Intl.DateTimeFormatOptions): string =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { ...o, timeZone: 'UTC' });
const hours = (m: number): string => (m / 60).toFixed(1);
const PLURAL: Record<DayItem['kind'], [string, string]> = {
  lesson: ['new lesson', 'new lessons'], review: ['review', 'reviews'], quiz: ['quiz', 'quizzes'], redo: ['redo', 'redos'],
  mixed: ['mixed review', 'mixed reviews'], retest: ['retest', 'retests'],
};
/** What a block holds, in a few words: "4 new lessons, 1 quiz". */
function kinds(items: readonly DayItem[]): string {
  return (['retest', 'lesson', 'review', 'mixed', 'quiz', 'redo'] as const)
    .map((k) => [k, items.filter((x) => x.kind === k).length] as const)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${n} ${PLURAL[k][n === 1 ? 0 : 1]}`)
    .join(', ');
}

/** The planner's heading for a date: the day's name, "Monday". */
export const dayTitle = (date: string): string => longDate(date, { weekday: 'long' });

function slotLabel(s: Slot): string {
  if (s.kind === 'meeting') return 'Meeting';
  if (s.fixed !== undefined) return 'Timed work';
  if (s.kind === 'study') return s.heavy ? 'Core study' : 'Core study, light';
  if (s.kind === 'optional') return 'Optional';
  if (s.kind === 'gym') return 'Gym';
  return 'Meal';
}

/** A link into the app. `before` runs first on a plain click: adding the forecast to the session, so the task it opens exists. */
function RouteLink({ to, cls, before, children }: { to: Route; cls: string; before?: () => void; children: ComponentChildren }) {
  return (
    <a
      class={cls}
      href={hrefOf(to)}
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

/**
 * The wake time as three small selects, hour, minute, and am or pm, so it reads in
 * 12-hour form on every device; a native time input follows the device's locale.
 */
function WakeTime({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const m = (parseClock(value) ?? (parseClock(DEFAULT_WAKE) as number)) % 1440;
  const h24 = Math.floor(m / 60);
  const mi = m % 60;
  const pm = h24 >= 12;
  const h12 = h24 % 12 || 12;
  const set = (h: number, min: number, p: boolean): void => onChange(clockValue(((h % 12) + (p ? 12 : 0)) * 60 + min));
  const num = (e: Event): number => Number((e.currentTarget as HTMLSelectElement).value);
  return (
    <span class="d-wake">
      woke{' '}
      <span class="d-wake-fields">
        <select aria-label="Woke at: hour" value={String(h12)} onChange={(e) => set(num(e), mi, pm)}>
          {HOURS_12.map((h) => <option key={h} value={String(h)}>{h}</option>)}
        </select>
        <span aria-hidden="true">:</span>
        <select aria-label="Woke at: minute" value={String(mi)} onChange={(e) => set(h12, num(e), pm)}>
          {MINUTES.map((x) => <option key={x} value={String(x)}>{String(x).padStart(2, '0')}</option>)}
        </select>
        <select aria-label="Woke at: am or pm" value={pm ? 'pm' : 'am'} onChange={(e) => set(h12, mi, (e.currentTarget as HTMLSelectElement).value === 'pm')}>
          <option value="am">am</option>
          <option value="pm">pm</option>
        </select>
      </span>
    </span>
  );
}

const CHECK = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12.5l4 4L18 8" /></svg>;

/**
 * `fixed` gives a date's fixed blocks (timed papers), placed first in that day; none by
 * default. `log` and `onLog`, when given, share the day log with Today's header, so a new
 * wake time or a tick shows there at once; without them the planner keeps its own.
 */
export function DayPlanner({ p, fixed = NO_FIXED, log: shared, onLog, ladder = null }: {
  p: Progress; fixed?: (date: string) => readonly FixedBlock[]; log?: DayLog; onLog?: (f: (l: DayLog) => DayLog) => void;
  /** The timed ladder's next step, offered under Up next today; not a queue item, so not counted in "to do". */
  ladder?: LadderSuggestion | null;
}) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);
  const [own, setOwn] = useState<DayLog>(loadDays);
  // Sync may bring days planned or ticked on another device: read them again when it writes.
  const synced = learnerSynced.value;
  useEffect(() => { if (synced > 0 && shared === undefined) setOwn(loadDays()); }, [synced]);
  const log = shared ?? own;
  const setLog = onLog ?? setOwn;
  const [showAll, setShowAll] = useState(false);
  const t = now();
  const today = planDate(t);
  const [date, setDate] = useState(today);
  const v = dayView(p, log, date, t, fixed);
  const { entry: current, wake, plan, isToday, nowMin, ticks, queue, studySlots, fill, upNext, cur, coreDone, dryBlocks } = v;
  const wakeText = current.wake;
  const fixedHere = v.fixed;

  const save = (d: string, e: DayEntry): void => setLog((l) => saveDay(l, d, e));
  const setWake = (w: string): void => {
    if (parseClock(w) === null) return;
    // A new wake time moves every block, so earlier ticks and replans no longer name the same blocks.
    save(date, w === wakeText ? current : { wake: w, ticks: [] });
  };
  const toggle = (start: number): void => {
    const next = new Set(ticks);
    if (next.has(start)) next.delete(start);
    else next.add(start);
    save(date, { ...current, ticks: [...next].sort((a, b) => a - b) });
  };

  const budget = v.budget;
  // The forecast is added at the moment it was planned, so its tasks are the ones shown.
  const addDay = (): void => {
    const next = withDayTasks(p, queue.at, budget);
    if (next !== p) void commit({ ...next, updatedAt: now() });
  };
  const replan = (): void => {
    const at = nowMin;
    const next = replanDay(plan, at, [...ticks], fixedHere);
    save(date, { ...current, replans: [...(current.replans ?? []), { at, ticks: [...ticks] }] });
    void commit(replanDayTasks(p, t, budgetFor(p, next, t)));
  };

  const shown = showAll ? upNext : upNext.slice(0, UP_NEXT);
  const empty = (s: Slot): { what: string; detail: string } => ({
    what: s.kind === 'optional' ? 'Light study' : 'Study',
    detail: isToday ? 'Today\'s queue has nothing more for this block.' : 'Filled from the queue on the day.',
  });

  const short = Math.max(0, CORE - plan.core);
  const state = (start: number, end: number): string => (!isToday ? '' : nowMin >= end ? ' past' : nowMin >= start ? ' now' : '');

  const dow = weekdayOf(date);
  const fri = dow === 6 ? addDays(date, -1) : addDays(date, 5 - dow);
  const sat = addDays(fri, 1);
  const rest = restDaysOf(date);
  const yomTov = yomTovOfWeek(date);
  const shortDate: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };

  const week = weekMinutes(log, date, fixed);
  const weekTotal = week.reduce((a, d) => a + d.minutes, 0);

  return (
    <section class="day" aria-labelledby="today-title">
      <h2 id="today-title" class="d-title">{dayTitle(date)}</h2>
      <div class="d-meta">
        <span>{longDate(date, { month: 'long', day: 'numeric' })}</span>
        <WakeTime value={wakeText} onChange={setWake} />
        <button
          type="button" class="d-text"
          onClick={() => { const w = clockValue(nowMin); setDate(today); save(today, today === date && w === wakeText ? current : { wake: w, ticks: [] }); }}
        >
          now
        </button>
      </div>
      {plan.notes.length > 0 && <p class="d-note">{plan.notes.join(' ')}</p>}

      <div class="d-progress">
        <div
          class="d-bar" role="progressbar" aria-label="Core study done"
          aria-valuemin={0} aria-valuemax={CORE / 60} aria-valuenow={Number(hours(coreDone))}
        >
          <i style={{ width: `${(100 * coreDone) / CORE}%` }} />
        </div>
        <div class="d-lbl">
          <span>{hours(coreDone)} of {CORE / 60} hours</span>
          <span>
            {plan.coreEnd !== null ? `done by ${fmtLong(plan.coreEnd)}` : plan.core > 0 ? `${hours(short)} h carried to tomorrow` : 'no study fits today'}
          </span>
        </div>
      </div>

      <ol class="tl d-tl">
        <li class={`quiet${state(wake, plan.start)}`}>
          <span class="t">{fmtLong(wake)}</span><span class="n" />
          <div class="w"><div class="it">Get going</div><div class="sub">{GET_GOING} min</div></div>
        </li>
        {plan.slots.map((s) => {
          const len = s.end - s.start;
          if (s.kind === 'break') {
            return (
              <li key={`b${s.start}`} class={`brk${state(s.start, s.end)}`}>
                <span class="t" /><span /><div class="w">break · {len} min</div>
              </li>
            );
          }
          const done = ticks.has(s.start);
          const its = fill.get(s);
          const study = s.kind === 'study' || s.kind === 'optional';
          const canCheck = study || s.kind === 'gym';
          const st = state(s.start, s.end);
          let body: ComponentChildren;
          if (s.kind === 'meeting') {
            body = (
              <>
                <div class="it">{s.fixed?.to !== undefined ? <RouteLink to={s.fixed.to} cls="d-item"><span class="d-item-title">{s.title}</span></RouteLink> : s.title}</div>
                <div class="sub">{len} min{s.detail !== '' ? ` · ${s.detail}` : ''}</div>
              </>
            );
          } else if (s.fixed !== undefined) {
            body = (
              <>
                <div class="it">{s.fixed.to !== undefined ? <RouteLink to={s.fixed.to} cls="d-item"><span class="d-item-title">{s.title}</span></RouteLink> : s.title}</div>
                <div class="sub">{slotLabel(s)} · {len} min{s.detail !== '' ? ` · ${s.detail}` : ''}</div>
              </>
            );
          } else if (study) {
            const e = its === undefined || its.length === 0 ? empty(s) : null;
            body = e !== null
              ? <><div class="it">{e.what}</div><div class="sub">{slotLabel(s)} · {len} min. {e.detail}</div></>
              : (
                <>
                  {(its as DayItem[]).map((x) => (
                    <div key={x.key} class={`it${x.done ? ' done' : ''}`}>
                      <RouteLink to={x.to} cls="d-item" before={x.forecast ? addDay : undefined}>
                        <span class="d-item-title">{x.title}</span>
                      </RouteLink>
                      {x.done && <span class="visually-hidden">, done</span>}
                    </div>
                  ))}
                  <div class="sub">{slotLabel(s)} · {len} min · {kinds(its as DayItem[])}</div>
                </>
              );
          } else {
            body = <><div class="it">{s.title}</div>{s.detail !== '' && <div class="sub">{s.detail}</div>}</>;
          }
          return (
            <li key={s.start} class={`${study ? 'study' : 'quiet'}${s.kind === 'meeting' ? ' meet' : ''}${s.kind === 'optional' ? ' opt' : ''}${done ? ' ticked' : ''}${st}`}>
              <span class="t">{fmtLong(s.start)}</span>
              <span class="n" />
              <div class="w">
                <div class="d-row">
                  <div class="d-grow">
                    {cur === s && <span class="tag">now · {s.end - nowMin} min left</span>}
                    {body}
                  </div>
                  {canCheck && (
                    <button
                      type="button" class="d-check" aria-pressed={done}
                      aria-label={`Mark the ${fmtLong(s.start)} ${slotLabel(s).toLowerCase()} block done`}
                      onClick={() => toggle(s.start)}
                    >
                      {CHECK}
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
        <li class={`end quiet${isToday && nowMin >= plan.stop ? ' now' : ''}`}>
          <span class="t">{fmtLong(plan.stop)}</span><span class="n" />
          <div class="w">
            <div class="it">{rest.tomorrow !== null ? `${rest.tomorrow} begins` : 'Wind down · bed at 1:00 am'}</div>
            {rest.tomorrow !== null && (
              <div class="sub">Nothing scheduled until {rest.tomorrow} ends.</div>
            )}
          </div>
        </li>
      </ol>
      <div class="qed" aria-hidden="true">∎</div>

      <div class="d-acts">
        {isToday && <button type="button" class="d-text" onClick={() => { save(date, current); addDay(); }}>Plan my day</button>}
        {isToday && nowMin < plan.stop && <button type="button" class="d-text" onClick={replan}>Replan from now</button>}
      </div>
      {isToday && nowMin < plan.stop && (
        <p class="d-small">Replan keeps ticked blocks and the past; the rest of the day is planned again from {fmtLong(Math.max(nowMin, plan.start))}.</p>
      )}
      {dryBlocks > 0 && (
        <p class="d-small">
          Today's queue runs dry: {dryBlocks} of {studySlots.length} study blocks have nothing in them yet.{' '}
          <button type="button" class="d-text inline" onClick={() => void commit(planMore(p, now()))}>Plan another session</button>{' '}
          to add more lessons and reviews.
        </p>
      )}

      {(isToday || upNext.length > 0) && (
        <section class="sec d-upnext" aria-labelledby="up-next">
          <div class="sec-h"><h2 id="up-next">Up next</h2><span>{upNext.length} to do</span></div>
          {upNext.length === 0
            ? <p class="d-small">Nothing is left in today's queue.</p>
            : (
              <ol class="ruled d-queue">
                {shown.map((n) => {
                  if ('paper' in n) {
                    const body = <><span class="d-qt">{n.paper.title}</span><small>Timed work, {n.paper.end - n.paper.start} min, at {fmtLong(n.paper.start)}</small></>;
                    return (
                      <li key={`paper-${n.paper.start}`}>
                        {n.paper.fixed?.to !== undefined ? <RouteLink to={n.paper.fixed.to} cls="d-qlink">{body}</RouteLink> : <div class="d-qlink">{body}</div>}
                      </li>
                    );
                  }
                  const x = n.item;
                  return (
                    <li key={x.key}>
                      <RouteLink to={x.to} cls="d-qlink" before={x.forecast ? addDay : undefined}>
                        <span class="d-qt">{x.title}</span>
                        <small>{KIND[x.kind]}, {Math.round(x.minutes)} min, {n.slot === null ? 'no block left today' : `${fmtLong(n.slot.start)} block`}</small>
                      </RouteLink>
                    </li>
                  );
                })}
              </ol>
            )}
          {isToday && ladder !== null && (
            <ol class="ruled d-ladder" aria-label="On the timed ladder">
              <li>
                <RouteLink to={ladder.to} cls="d-qlink">
                  <span class="d-qt">{ladder.title}</span>
                  <small>{ladder.detail}</small>
                </RouteLink>
              </li>
            </ol>
          )}
          {upNext.length > UP_NEXT && (
            <button type="button" class="d-text" aria-expanded={showAll} onClick={() => setShowAll(!showAll)}>
              {showAll ? 'Show fewer' : `Show all ${upNext.length}`}
            </button>
          )}
        </section>
      )}

      <section class="sec" aria-labelledby="this-week">
        <div class="sec-h"><h2 id="this-week">This week</h2><span>{hours(weekTotal)} of {WEEK_TARGET_HOURS} h</span></div>
        <ol class="d-week">
          {week.map((d, i) => (
            <li key={d.date} class={`${d.date === date ? 'cur' : ''}${i === 6 || isYomTov(d.date) ? ' shab' : ''}`}>
              <span class="col" aria-hidden="true">
                {d.minutes > 0 && <i style={{ height: `${Math.min(100, (100 * d.minutes) / 60 / BAR_MAX_HOURS)}%` }} />}
                <span class="tgt" style={{ bottom: `${(100 * CORE) / 60 / BAR_MAX_HOURS}%` }} />
              </span>
              <b>{d.minutes > 0 ? hours(d.minutes) : '0'}</b>
              <span>{DAY_NAMES[i]}</span>
            </li>
          ))}
        </ol>
        <p class="d-small">Hours ticked off in this browser. The line marks the 6-hour day. Saturday is Shabbat{yomTov.length > 0 ? '; yom tov days are marked too' : ''}.</p>
      </section>

      <section class="sec" aria-labelledby="shabbat">
        <div class="sec-h"><h2 id="shabbat">Shabbat</h2></div>
        <ul class="ruled d-shab">
          <li><span>Begins {longDate(fri, shortDate)}</span><span class="r">{fmtLong(sunsetMinutes(fri))}</span></li>
          <li><span>Ends {longDate(sat, shortDate)}</span><span class="r">{fmtLong(sunsetMinutes(sat))}</span></li>
          {yomTov.map((y) => (
            <Fragment key={y.first}>
              <li class="yt"><span>{y.name} begins {longDate(y.eve, shortDate)}</span><span class="r">{fmtLong(y.begins)}</span></li>
              <li class="yt"><span>{y.name} ends {longDate(y.last, shortDate)}</span><span class="r">{fmtLong(y.ends)}</span></li>
            </Fragment>
          ))}
        </ul>
        <p class="d-small">Brooklyn sundown, computed on this device. Nothing is scheduled in between.</p>
      </section>

      <section class="sec" aria-labelledby="other-day">
        <div class="sec-h"><h2 id="other-day">Another day</h2></div>
        <div class="d-other">
          <label>
            <span>Plan for</span>{' '}
            <input
              type="date" value={date}
              onChange={(e) => { const v = (e.currentTarget as HTMLInputElement).value; if (isDate(v)) setDate(v); }}
            />
          </label>
          {!isToday && <button type="button" class="d-text" onClick={() => setDate(today)}>back to today</button>}
        </div>
      </section>
    </section>
  );
}
