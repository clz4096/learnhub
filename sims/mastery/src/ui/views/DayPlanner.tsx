/**
 * Begin the day (mastery/DESIGN-ADMISSIONS.md, "The day planner"), in the minimalist look:
 * the wake time ("woke 9:00 am", always 12-hour) and Plan from now (`PlanControl`, which
 * Today shows in its header, so the page has one planning control), then one timeline of
 * the day. Today's header already gives the date and the hours studied, so the day's name,
 * the date, and the progress line show only for another day. The wake time becomes the
 * schedule (`planDay`), its study blocks filled from the day's queue (the session's
 * lessons, reviews, and quizzes, more of them planned for the day's study minutes, and
 * redos due today). The timeline is the one list of the day's items, items with no block
 * left today and the timed ladder's next step included; below 900 px a block shows its
 * first item and folds the rest, so the day fits a phone. Another day's plan is a
 * disclosure under it. The week's hours and Shabbat are in Today's side column (`WeekBars`). Wake times, ticks, and replans are kept in the day log
 * (`dayLog`), which sync carries in the learner envelope. The progress document changes
 * only when the learner acts: opening a forecast item, planning the day, or replanning adds
 * the day's tasks to the session.
 */
import { useEffect, useId, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import type { Progress } from '@learnhub/mastery';
import {
  CORE, GET_GOING, clockValue, fmtLong, isDate, parseClock, planDate,
  replanDay, restDaysOf, type FixedBlock, type Slot,
} from '@/model/day';
import { isYomTov } from '@/model/holidays';
import { loadDays, saveDay, withAnchors, type DayEntry, type DayLog } from '@/model/dayLog';
import { learnerSynced } from '@/model/learnerChange';
import { replanDayTasks, withDayTasks, type DayItem } from '@/model/dayQueue';
import { planMore } from '@/model/learner';
import { go, hrefOf, type Route } from '@/model/route';
import { commit, now } from '@/model/store';
import { DEFAULT_WAKE, budgetFor, currentAnchors, dayView, weekMinutes, type DayView } from '@/ui/views/dayView';
import type { LadderSuggestion } from '@/ui/ladderShared';
import '@/styles/screens/dayplanner.css';

const BAR_MAX_HOURS = 8;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
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
function WakeTime({ value, onChange, label = 'Woke at' }: { value: string; onChange: (v: string) => void; label?: string }) {
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
        <select aria-label={`${label}: hour`} value={String(h12)} onChange={(e) => set(num(e), mi, pm)}>
          {HOURS_12.map((h) => <option key={h} value={String(h)}>{h}</option>)}
        </select>
        <span aria-hidden="true">:</span>
        <select aria-label={`${label}: minute`} value={String(mi)} onChange={(e) => set(h12, num(e), pm)}>
          {MINUTES.map((x) => <option key={x} value={String(x)}>{String(x).padStart(2, '0')}</option>)}
        </select>
        <select aria-label={`${label}: am or pm`} value={pm ? 'pm' : 'am'} onChange={(e) => set(h12, mi, (e.currentTarget as HTMLSelectElement).value === 'pm')}>
          <option value="am">am</option>
          <option value="pm">pm</option>
        </select>
      </span>
    </span>
  );
}

type OnLog = (f: (l: DayLog) => DayLog) => void;

/**
 * A new wake time for `v`'s day; it moves every block, so earlier ticks and replans no
 * longer name the same blocks. The day is planned afresh, with the anchors in Settings.
 */
function wakeSetter(p: Progress, v: DayView, onLog: OnLog): (w: string) => void {
  return (w) => {
    if (parseClock(w) === null) return;
    const e: DayEntry = w === v.entry.wake ? v.entry : { wake: w, ticks: [], ...withAnchors(currentAnchors(p)) };
    onLog((l) => saveDay(l, v.date, e));
  };
}

/**
 * Today's one planning control: the wake time, editable in place, and Plan from now, which
 * keeps ticked blocks and the past and plans the rest of the day again (`replanDay`), the
 * session's open tasks with it (`replanDayTasks`), with the anchors in Settings (a change
 * there reaches a day already planned this way). It also adds the day's forecast to the
 * session, so it covers what Plan my day did.
 */
export function PlanControl({ p, v, onLog }: { p: Progress; v: DayView; onLog: OnLog }) {
  const desc = useId();
  const canReplan = v.isToday && v.nowMin < v.plan.stop;
  const replan = (): void => {
    const at = v.nowMin;
    const ticks = [...v.ticks];
    const anchors = currentAnchors(p);
    const next = replanDay(v.plan, at, ticks, v.fixed, anchors);
    onLog((l) => saveDay(l, v.date, { ...v.entry, replans: [...(v.entry.replans ?? []), { at, ticks, ...withAnchors(anchors) }] }));
    const t = now();
    void commit(replanDayTasks(p, t, budgetFor(p, next, t)));
  };
  return (
    <div class="d-plan">
      <WakeTime value={v.entry.wake} onChange={wakeSetter(p, v, onLog)} />
      {canReplan && (
        <>
          <button type="button" class="ds-btn ghost d-replan" aria-describedby={desc} onClick={replan}>Plan from now</button>
          <span id={desc} class="visually-hidden">
            Keeps ticked blocks and the past; the rest of the day is planned again from {fmtLong(Math.max(v.nowMin, v.plan.start))}.
          </span>
        </>
      )}
    </div>
  );
}

/** The week holding `date` as seven bars of ticked hours, Sunday first, with the 6-hour day marked. */
export function WeekBars({ log, date, fixed }: { log: DayLog; date: string; fixed: (date: string) => readonly FixedBlock[] }) {
  return (
    <ol class="d-week" aria-label="Hours ticked off each day">
      {weekMinutes(log, date, fixed).map((d, i) => (
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
  );
}

const CHECK = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12.5l4 4L18 8" /></svg>;

/**
 * `fixed` gives a date's fixed blocks (timed papers), placed first in that day; none by
 * default. `log` and `onLog`, when given, share the day log with Today's header, so a new
 * wake time or a tick shows there at once; without them the planner keeps its own.
 * `control` false leaves today's `PlanControl` to the page (Today shows it in its header);
 * another day still shows its own wake time.
 */
export function DayPlanner({ p, fixed = NO_FIXED, log: shared, onLog, ladder = null, control = true }: {
  p: Progress; fixed?: (date: string) => readonly FixedBlock[]; log?: DayLog; onLog?: OnLog;
  /** The timed ladder's next rung, a row at the end of today's timeline; not a queue item, so in no block. */
  ladder?: LadderSuggestion | null;
  control?: boolean;
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
  const t = now();
  const today = planDate(t);
  const [date, setDate] = useState(today);
  // Blocks whose folded items are shown (below 900 px only; wider, every item shows).
  const [shown, setShown] = useState<ReadonlySet<number>>(() => new Set());
  const unfold = (k: number): void => setShown((o) => {
    const n = new Set(o);
    if (n.has(k)) n.delete(k);
    else n.add(k);
    return n;
  });
  const v = dayView(p, log, date, t, fixed);
  const { entry: current, wake, plan, isToday, nowMin, ticks, queue, studySlots, fill, left, cur, coreDone, dryBlocks } = v;
  const wakeText = current.wake;

  const save = (d: string, e: DayEntry): void => setLog((l) => saveDay(l, d, e));
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

  // Items the blocks could not hold: in the plan, so listed once, in a row at the end of the timeline.
  const leftOpen = isToday ? left.filter((x) => !x.done) : [];
  /** A block's items: the first leads; the rest fold below 900 px until the block's "more" is pressed. */
  const items = (its: readonly DayItem[]): ComponentChildren => (
    <>
      {its.map((x, i) => (
        <div key={x.key} class={`it${x.done ? ' done' : ''}${i > 0 ? ' d-folded' : ''}`}>
          <RouteLink to={x.to} cls="d-item" before={x.forecast ? addDay : undefined}>
            <span class="d-item-title">{x.title}</span>
          </RouteLink>
          {x.done && <span class="visually-hidden">, done</span>}
          {!x.done && x.notes !== undefined && <span class="d-item-note">Weak points from that supervision: {x.notes.join(' ')}</span>}
        </div>
      ))}
    </>
  );
  /** "5 more" at the end of a block's line; the hidden words say which block, for a screen reader. */
  const more = (k: number, n: number, at: string): ComponentChildren => n > 1 && (
    <button type="button" class="d-more" aria-expanded={shown.has(k)} onClick={() => unfold(k)}>
      {shown.has(k) ? 'Fewer' : `${n - 1} more`}<span class="visually-hidden"> {at}</span>
    </button>
  );
  const fold = (k: number, n: number): string => (n > 1 ? ` d-fold${shown.has(k) ? ' d-open' : ''}` : '');
  const empty = (s: Slot): { what: string; detail: string } => ({
    what: s.kind === 'optional' ? 'Light study' : 'Study',
    detail: isToday ? 'Today\'s queue has nothing more for this block.' : 'Filled from the queue on the day.',
  });

  const short = Math.max(0, CORE - plan.core);
  const state = (start: number, end: number): string => (!isToday ? '' : nowMin >= end ? ' past' : nowMin >= start ? ' now' : '');

  const rest = restDaysOf(date);

  return (
    <section class="day" aria-labelledby="today-title">
      {/* Today's header names the day; another day's plan says which day it is. */}
      {isToday
        ? <h2 id="today-title" class="visually-hidden">The day's plan</h2>
        : <h2 id="today-title" class="d-title">{dayTitle(date)}</h2>}
      {isToday
        ? control && <PlanControl p={p} v={v} onLog={setLog} />
        : (
          <div class="d-meta">
            <span>{longDate(date, { month: 'long', day: 'numeric' })}</span>
            <WakeTime value={wakeText} onChange={wakeSetter(p, v, setLog)} label={`Woke on ${dayTitle(date)} at`} />
          </div>
        )}
      {plan.notes.length > 0 && <p class="d-note">{plan.notes.join(' ')}</p>}

      {!isToday && (
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
      )}

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
                  {items(its as DayItem[])}
                  <div class="sub">{slotLabel(s)} · {len} min · {kinds(its as DayItem[])}{more(s.start, (its as DayItem[]).length, `in the ${fmtLong(s.start)} block`)}</div>
                </>
              );
          } else {
            body = (
              <>
                <div class="it">{s.kind === 'gym' ? <RouteLink to={{ view: 'gym' }} cls="d-item"><span class="d-item-title">{s.title}</span></RouteLink> : s.title}</div>
                {s.detail !== '' && <div class="sub">{s.detail}</div>}
              </>
            );
          }
          return (
            <li key={s.start} class={`${study ? 'study' : 'quiet'}${s.kind === 'meeting' ? ' meet' : ''}${s.kind === 'optional' ? ' opt' : ''}${done ? ' ticked' : ''}${st}${study ? fold(s.start, its?.length ?? 0) : ''}`}>
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
        {leftOpen.length > 0 && (
          <li class={`study left${fold(-1, leftOpen.length)}`}>
            <span class="t" /><span class="n" />
            <div class="w">
              {items(leftOpen)}
              <div class="sub">No block left today · {kinds(leftOpen)}{more(-1, leftOpen.length, 'with no block left today')}</div>
            </div>
          </li>
        )}
        {isToday && ladder !== null && (
          <li class="quiet d-ladder">
            <span class="t" /><span class="n" />
            <div class="w">
              <RouteLink to={ladder.to} cls="d-qlink">
                <span class="d-qt">{ladder.title}</span>
                <small>{ladder.detail}</small>
              </RouteLink>
            </div>
          </li>
        )}
        <li class={`end quiet${isToday && nowMin >= plan.stop ? ' now' : ''}`}>
          <span class="t">{fmtLong(plan.stop)}</span><span class="n" />
          <div class="w">
            <div class="it">{rest.tomorrow !== null ? `${rest.tomorrow} begins` : `Wind down · bed at ${fmtLong(plan.anchors.bed)}`}</div>
            {rest.tomorrow !== null && (
              <div class="sub">Nothing scheduled until {rest.tomorrow} ends.</div>
            )}
          </div>
        </li>
      </ol>
      <div class="qed" aria-hidden="true">∎</div>

      {dryBlocks > 0 && (
        <p class="d-small">
          Today's queue runs dry: {dryBlocks} of {studySlots.length} study blocks have nothing in them yet.{' '}
          <button type="button" class="d-text inline" onClick={() => void commit(planMore(p, now()))}>Plan another session</button>{' '}
          to add more lessons and reviews.
        </p>
      )}

      <details class="d-another" open={!isToday}>
        <summary>Another day</summary>
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
      </details>
    </section>
  );
}
