/**
 * Begin the day (mastery/DESIGN-ADMISSIONS.md, "The day planner"): the wake time becomes
 * the day's schedule (`planDay`), its study blocks filled from today's real queue (the
 * session's lessons, reviews, and quizzes, and redos due today). Shows what is on now,
 * the day's totals, a strip of the day, the timeline with tick-off, the week's ticked
 * hours, and this week's Shabbat times. Wake times and ticks stay in this browser
 * (`dayLog`); the progress document is not changed except by Plan another session.
 */
import { useEffect, useState } from 'preact/hooks';
import type { Progress } from '@learnhub/mastery';
import {
  BED, CORE, GET_GOING, OPTIONAL, addDays, clockValue, fillBlocks, fmt, fmtLong, isDate, parseClock, planDate, planFor, planMinute,
  sunsetMinutes, tickedMinutes, weekOf, weekdayOf, type Slot,
} from '@/model/day';
import { loadDays, saveDay, type DayLog } from '@/model/dayLog';
import { dayItems, type DayItem } from '@/model/dayQueue';
import { planMore } from '@/model/learner';
import { go, hrefOf } from '@/model/route';
import { commit, now } from '@/model/store';

const DEFAULT_WAKE = '09:00';
const KIND: Record<DayItem['kind'], string> = { lesson: 'New lesson', review: 'Review', quiz: 'Quiz', redo: 'Supervision redo' };
const WEEK_TARGET_HOURS = 36;
const BAR_MAX_HOURS = 8;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const longDate = (date: string, o: Intl.DateTimeFormatOptions): string =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { ...o, timeZone: 'UTC' });
const hours = (m: number): string => (m / 60).toFixed(1);

function slotLabel(s: Slot): string {
  if (s.kind === 'study') return s.heavy ? 'Core study' : 'Core study, light';
  if (s.kind === 'optional') return 'Optional';
  if (s.kind === 'gym') return 'Gym';
  return 'Meal';
}

function ItemLink({ item }: { item: DayItem }) {
  return (
    <a
      class={`d-item${item.done ? ' done' : ''}`}
      href={hrefOf(item.to)}
      onClick={(e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        go(item.to);
      }}
    >
      <span class="d-item-title">{item.title}</span>
      <span class="d-item-meta">{KIND[item.kind]}, {Math.round(item.minutes)} min{item.done ? ', done' : ''}</span>
    </a>
  );
}

const CHECK = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;

export function DayPlanner({ p }: { p: Progress }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);
  const [log, setLog] = useState<DayLog>(loadDays);
  const t = now();
  const today = planDate(t);
  const [date, setDate] = useState(today);
  const entry = log[date];
  const wakeText = entry?.wake ?? DEFAULT_WAKE;
  const wake = parseClock(wakeText) ?? (parseClock(DEFAULT_WAKE) as number);
  const plan = planFor(date, wake);
  const isToday = date === today;
  const nowMin = planMinute(t);
  const ticks = new Set(entry?.ticks ?? []);

  const save = (d: string, w: string, tk: readonly number[]): void => setLog((l) => saveDay(l, d, { wake: w, ticks: [...tk] }));
  const setWake = (w: string): void => {
    if (parseClock(w) === null) return;
    // A new wake time moves every block, so earlier ticks no longer name the same blocks.
    save(date, w, w === wakeText ? [...ticks] : []);
  };
  const toggle = (start: number): void => {
    const next = new Set(ticks);
    if (next.has(start)) next.delete(start);
    else next.add(start);
    save(date, wakeText, [...next].sort((a, b) => a - b));
  };

  // Fill the study blocks from today's queue; other days have no queue yet.
  const studySlots = plan.slots.filter((s) => s.kind === 'study' || s.kind === 'optional');
  const items = isToday ? dayItems(p, t) : [];
  const { filled } = fillBlocks(studySlots.map((s) => ({ minutes: s.end - s.start, heavy: s.heavy, optional: s.kind === 'optional' })), items);
  const fill = new Map<Slot, DayItem[]>(studySlots.map((s, i) => [s, filled[i] ?? []]));
  const dryBlocks = isToday ? studySlots.filter((s) => (fill.get(s) ?? []).length === 0).length : 0;

  const cur = isToday ? plan.slots.find((s) => s.kind !== 'break' && nowMin >= s.start && nowMin < s.end) : undefined;
  const nextStudy = studySlots.find((s) => !isToday || s.end > nowMin);
  const headline = (s: Slot): { what: string; detail: string } => {
    const its = fill.get(s);
    if (its === undefined) return { what: s.title, detail: s.detail };
    const open = its.find((x) => !x.done) ?? its[0];
    if (open === undefined) return { what: s.kind === 'optional' ? 'Light study' : 'Study', detail: isToday ? 'Today\'s queue has nothing more for this block.' : 'Filled from the queue on the day.' };
    return { what: open.title, detail: `${KIND[open.kind]}${its.length > 1 ? `, then ${its.length - 1} more` : ''}` };
  };

  const short = Math.max(0, CORE - plan.core);
  const dow = weekdayOf(date);
  const fri = dow === 6 ? addDays(date, -1) : addDays(date, 5 - dow);
  const sat = addDays(fri, 1);
  const shortDate: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };

  const week = weekOf(date).map((d) => {
    const e = log[d];
    const w = e === undefined ? null : parseClock(e.wake);
    return { date: d, minutes: e === undefined || w === null ? 0 : tickedMinutes(planFor(d, w), e.ticks) };
  });
  const weekMinutes = week.reduce((a, d) => a + d.minutes, 0);

  // The strip runs from waking to bed.
  const s0 = wake;
  const span = Math.max(1, BED - s0);
  const pct = (m: number): string => `${(100 * (Math.min(Math.max(m, s0), BED) - s0)) / span}%`;
  const width = (a: number, b: number): string => `${(100 * (Math.min(b, BED) - Math.max(a, s0))) / span}%`;
  const firstTick = Math.ceil(s0 / 180) * 180;
  const stripTicks: number[] = [];
  for (let m = firstTick; m <= BED; m += 180) stripTicks.push(m);

  return (
    <section class="day" aria-labelledby="today-title">
      <div class="d-head">
        <div class="d-kicker">{longDate(date, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
        <h1 id="today-title">Today</h1>
      </div>

      <form class="d-card d-pad d-begin" onSubmit={(e) => { e.preventDefault(); save(date, wakeText, [...ticks]); }}>
        <div>
          <div class="d-label">Begin the day</div>
          <div class="d-fields">
            <label class="d-field">
              <span>Woke up at</span>
              <input type="time" value={wakeText} onChange={(e) => setWake((e.currentTarget as HTMLInputElement).value)} />
            </label>
            <label class="d-field">
              <span>Date</span>
              <input
                type="date" value={date}
                onChange={(e) => { const v = (e.currentTarget as HTMLInputElement).value; if (isDate(v)) setDate(v); }}
              />
            </label>
          </div>
        </div>
        <div class="d-acts">
          <button type="button" class="d-btn quiet" onClick={() => { setDate(today); save(today, clockValue(nowMin), today === date && clockValue(nowMin) === wakeText ? [...ticks] : []); }}>Now</button>
          <button type="submit" class="d-btn">Plan my day</button>
        </div>
      </form>

      {plan.notes.length > 0 && <div class="d-note">{plan.notes.join(' ')}</div>}

      <div class="d-cols">
        <div class="d-stack">
          {cur !== undefined ? (
            <div class="d-now">
              <div>
                <div class="d-label">Now: {slotLabel(cur)}</div>
                <div class="d-what">{headline(cur).what}</div>
                <div class="d-det">{headline(cur).detail}</div>
              </div>
              <div class="d-clock"><b>{cur.end - nowMin} min</b><span>left, until {fmtLong(cur.end)}</span></div>
              <div class="d-prog" role="progressbar" aria-label="Block progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((100 * (nowMin - cur.start)) / (cur.end - cur.start))}>
                <i style={{ width: `${(100 * (nowMin - cur.start)) / (cur.end - cur.start)}%` }} />
              </div>
            </div>
          ) : nextStudy !== undefined ? (
            <div class="d-now">
              <div>
                <div class="d-label">First up: {fmtLong(nextStudy.start)}</div>
                <div class="d-what">{headline(nextStudy).what}</div>
                <div class="d-det">{headline(nextStudy).detail}</div>
              </div>
              <div class="d-clock"><b>{nextStudy.end - nextStudy.start} min</b><span>{slotLabel(nextStudy)}</span></div>
            </div>
          ) : (
            <div class="d-now">
              <div>
                <div class="d-label">Today</div>
                <div class="d-what">{studySlots.length > 0 ? 'The day\'s study blocks are over.' : 'No study fits before bed.'}</div>
                <div class="d-det">{studySlots.length > 0 ? 'Wind down; bed at 1:00 am.' : 'The shortfall rolls into tomorrow.'}</div>
              </div>
            </div>
          )}

          <div class="d-card">
            <div class="d-kpis">
              <div class={`d-kpi ${short > 0 ? 'warn' : 'good'}`}><b>{hours(plan.core)}h</b><span>core study, of {CORE / 60}</span></div>
              <div class="d-kpi"><b>{hours(plan.optional)}h</b><span>optional, up to {OPTIONAL / 60}</span></div>
              <div class="d-kpi"><b>{plan.coreEnd === null ? 'n/a' : fmt(plan.coreEnd)}</b><span>core done by</span></div>
              <div class={`d-kpi ${short > 0 ? 'warn' : 'good'}`}><b>{short > 0 ? `${hours(short)}h` : 'none'}</b><span>{short > 0 ? 'carried to tomorrow' : 'carried over'}</span></div>
            </div>
            <div class="d-strip-wrap">
              <div class="d-strip" aria-hidden="true">
                {plan.start > s0 && <i class="seg-meal" style={{ left: pct(s0), width: width(s0, Math.min(plan.start, s0 + GET_GOING)) }} />}
                {plan.slots.filter((s) => s.kind !== 'break').map((s) => (
                  <i key={s.start} class={`seg-${s.kind}`} style={{ left: pct(s.start), width: width(s.start, s.end) }} />
                ))}
                {isToday && nowMin > s0 && nowMin < BED && <span class="d-nowline" style={{ left: pct(nowMin) }} />}
              </div>
              <div class="d-ticks" aria-hidden="true">
                {stripTicks.map((m) => <span key={m} style={{ left: pct(m) }}>{fmt(m).replace(':00', '')}</span>)}
              </div>
              <div class="d-legend">
                <span><i class="seg-study" />Study</span><span><i class="seg-optional" />Optional</span>
                <span><i class="seg-gym" />Gym</span><span><i class="seg-meal" />Meals and routine</span>
              </div>
            </div>
          </div>

          {dryBlocks > 0 && (
            <div class="d-note">
              Today's queue runs dry: {dryBlocks} of {studySlots.length} study blocks have nothing in them yet.{' '}
              <button type="button" class="d-link" onClick={() => void commit(planMore(p, now()))}>Plan another session</button>{' '}
              to add more lessons and reviews.
            </div>
          )}

          <div class="d-card d-pad">
            <div class="d-row"><h2>The plan</h2><span class="d-tiny">Tick blocks off as you go</span></div>
            <ol class="d-tl">
              <li class="rest">
                <span class="t">{fmt(wake)}</span><span class="dot" />
                <div class="body"><div class="kind">Routine</div><div class="ttl">Get going</div><div class="sub">{GET_GOING} minutes</div></div>
              </li>
              {plan.slots.map((s) => {
                if (s.kind === 'break') {
                  return (
                    <li key={`b${s.start}`} class="brk"><span class="t" /><span class="dot" /><div class="body">Break, {s.end - s.start} min</div></li>
                  );
                }
                const done = ticks.has(s.start);
                const isNow = cur === s;
                const its = fill.get(s);
                const canCheck = s.kind === 'study' || s.kind === 'optional' || s.kind === 'gym';
                const h = headline(s);
                return (
                  <li key={s.start} class={`${s.kind}${done ? ' done' : ''}${isNow ? ' isnow' : ''}`}>
                    <span class="t">{fmt(s.start)}<small>{s.end - s.start} min</small></span>
                    <span class="dot" />
                    <div class="body">
                      <div class="d-row">
                        <div class="d-grow">
                          <div class="kind">{slotLabel(s)}</div>
                          {its === undefined || its.length === 0
                            ? <><div class="ttl">{h.what}</div>{h.detail !== '' && <div class="sub">{h.detail}</div>}</>
                            : <div class="d-items">{its.map((x) => <ItemLink key={x.key} item={x} />)}</div>}
                        </div>
                        {canCheck && (
                          <button
                            type="button" class="d-check" aria-pressed={done}
                            aria-label={`Mark the ${fmt(s.start)} ${slotLabel(s).toLowerCase()} block done`}
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
              <li class="rest">
                <span class="t">{fmt(plan.stop)}</span><span class="dot" />
                <div class="body">
                  <div class="kind">{dow === 5 ? 'Shabbat' : 'Routine'}</div>
                  <div class="ttl">{dow === 5 ? 'Shabbat begins' : 'Wind down'}</div>
                  <div class="sub">{dow === 5 ? 'Nothing scheduled until Saturday sundown' : 'Bed at 1:00 am'}</div>
                </div>
              </li>
            </ol>
          </div>
        </div>

        <div class="d-stack">
          <div class="d-card d-pad">
            <div class="d-row"><h2>This week</h2><span class="d-tiny d-num">{hours(weekMinutes)} of {WEEK_TARGET_HOURS} h</span></div>
            <div class="d-week">
              {week.map((d, i) => (
                <div key={d.date} class={`d-day${d.date === date ? ' today' : ''}`}>
                  <div class={`col${i === 6 ? ' shab' : ''}`}>
                    {d.minutes > 0 && <i style={{ height: `${Math.min(100, (100 * d.minutes) / 60 / BAR_MAX_HOURS)}%` }} />}
                    <span class="tgt" style={{ bottom: `${(100 * CORE) / 60 / BAR_MAX_HOURS}%` }} />
                  </div>
                  <b>{d.minutes > 0 ? hours(d.minutes) : '0'}</b>
                  <span>{DAY_NAMES[i]}</span>
                </div>
              ))}
            </div>
            <div class="d-tiny">Hours ticked off in this browser. Dashed line: the 6-hour target. Hatched: Shabbat.</div>
          </div>
          <div class="d-card d-pad">
            <h2>Shabbat</h2>
            <div class="d-shab">
              <div><span>Begins {longDate(fri, shortDate)}</span><b>{fmtLong(sunsetMinutes(fri))}</b></div>
              <div><span>Ends {longDate(sat, shortDate)}</span><b>{fmtLong(sunsetMinutes(sat))}</b></div>
            </div>
            <div class="d-tiny">Brooklyn sundown, computed on this device. Nothing is scheduled in between.</div>
          </div>
        </div>
      </div>
    </section>
  );
}
