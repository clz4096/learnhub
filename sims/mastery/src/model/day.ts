/**
 * The day planner, "Begin the day" (mastery/DESIGN-ADMISSIONS.md, "The day planner"): a
 * wake time becomes the day's schedule around fixed anchors (the gym, meals, bed), with
 * 6 core study hours in 90-minute blocks and up to 2 optional light hours. Pure: no clock,
 * storage, or app state, so every rule is tested in Node.
 *
 * Times are minutes after midnight, New York time, on the plan's day. A plan's day runs to
 * 5:00 am the next morning, so times after midnight continue past 1440 (bed at 1:00 am is
 * 1500), and a wake time before 5:00 am still belongs to the night before.
 *
 * Ported from the Cambridge Entry prototype's plan(); one change: a break is never left
 * at the end of a free stretch with nothing after it.
 */

/** Minutes to get going after waking. */
export const GET_GOING = 45;
export const LUNCH = 30;
/** The gym's possible starts, 2:00, 2:15, and 2:30 pm, tried in order. */
export const GYM_STARTS: readonly number[] = [840, 855, 870];
/** The gym with travel. */
export const GYM = 90;
export const DINNER = 1200;
export const DINNER_LENGTH = 60;
/** Bed at 1:00 am. */
export const BED = 1500;
export const WIND_DOWN = 30;
export const BLOCK = 90;
export const BREAK = 15;
export const CORE = 360;
export const OPTIONAL = 120;
/** Wake times before this (5:00 am) count as the night before. */
export const DAY_ROLLOVER = 300;
/** The shortest core block, unless it is the last of the core. */
const MIN_BLOCK = 40;
/** The shortest optional block, and the least room a break must leave after it. */
const MIN_LIGHT = 30;

export const BROOKLYN = { lat: 40.6782, lon: -73.9442 } as const;

export type SlotKind = 'study' | 'optional' | 'gym' | 'meal' | 'break';

export interface Slot {
  start: number;
  end: number;
  kind: SlotKind;
  title: string;
  detail: string;
  /** A full core block (90 minutes, or the last of the core and at least 60): new material goes here. Light blocks get reviews. */
  heavy: boolean;
}

export interface DayPlan {
  /** In time order: study, optional, breaks, the gym, and meals. */
  slots: Slot[];
  /** Core minutes planned, at most CORE. */
  core: number;
  /** Optional minutes planned, at most OPTIONAL. */
  optional: number;
  /** When the last core minute ends, or null if the full core does not fit. */
  coreEnd: number | null;
  /** The gym's start, or null if it does not fit today. */
  gym: number | null;
  /** Study can start here: after getting going, or after Saturday's sundown. */
  start: number;
  /** Nothing is planned after this: wind down before bed, or Friday's sundown. */
  stop: number;
  notes: string[];
}

/** 9:45am; times past midnight wrap. */
export function fmt(m: number): string {
  const x = ((Math.round(m) % 1440) + 1440) % 1440;
  const h = Math.floor(x / 60);
  const mi = x % 60;
  return `${h % 12 || 12}:${mi < 10 ? '0' : ''}${mi}${h >= 12 ? 'pm' : 'am'}`;
}

/** 9:45 am, for sentences. */
export const fmtLong = (m: number): string => fmt(m).replace(/(am|pm)$/, ' $1');

interface Built { slots: Slot[]; core: number; optional: number; coreEnd: number | null; gym: number | null }

function build(g: number | null, start: number, stop: number): Built {
  const events: Slot[] = [];
  const gymOk = g !== null && start <= g && g + GYM <= stop;
  const fixed = (s: number, e: number, kind: SlotKind, title: string, detail = ''): Slot => ({ start: s, end: e, kind, title, detail, heavy: false });
  if (gymOk) {
    if (start <= g - LUNCH) events.push(fixed(g - LUNCH, g, 'meal', 'Lunch'));
    else if (g + GYM + LUNCH <= stop) events.push(fixed(g + GYM, g + GYM + LUNCH, 'meal', 'Lunch', 'After the gym today'));
    events.push(fixed(g, g + GYM, 'gym', 'Gym', '90 minutes including travel'));
  }
  if (start <= DINNER && DINNER + DINNER_LENGTH <= stop) events.push(fixed(DINNER, DINNER + DINNER_LENGTH, 'meal', 'Dinner'));
  events.sort((a, b) => a.start - b.start);

  const free: [number, number][] = [];
  let t = start;
  for (const x of events) {
    if (x.start > t) free.push([t, x.start]);
    t = Math.max(t, x.end);
  }
  if (stop > t) free.push([t, stop]);

  const items: Slot[] = [];
  let core = 0;
  let optional = 0;
  let coreEnd: number | null = null;
  for (const [from, to] of free) {
    let u = from;
    for (;;) {
      const room = to - u;
      if (core < CORE && room >= Math.min(MIN_BLOCK, CORE - core)) {
        const len = Math.min(room, BLOCK, CORE - core);
        const heavy = len >= BLOCK || (len === CORE - core && len >= 60);
        items.push({ start: u, end: u + len, kind: 'study', title: heavy ? 'Study block' : 'Reviews', detail: '', heavy });
        core += len;
        u += len;
        if (core >= CORE) coreEnd = u;
      } else if (core >= CORE && optional < OPTIONAL && room >= MIN_LIGHT) {
        const len = Math.min(room, BLOCK, OPTIONAL - optional);
        items.push({ start: u, end: u + len, kind: 'optional', title: 'Light study', detail: 'Reviews and reading ahead. Skip it if you are tired.', heavy: false });
        optional += len;
        u += len;
      } else break;
      if (to - u >= BREAK + MIN_LIGHT) {
        items.push(fixed(u, u + BREAK, 'break', 'Break'));
        u += BREAK;
      } else break;
    }
    // A break with nothing after it in this stretch is just free time.
    if (items.length > 0 && items[items.length - 1]?.kind === 'break' && (items[items.length - 1]?.end ?? 0) > from) items.pop();
  }
  const slots = [...items, ...events].sort((a, b) => a.start - b.start);
  return { slots, core, optional, coreEnd, gym: gymOk ? g : null };
}

/** Whether `p` beats `best`: a gym that fits, then more core, then the core done earlier. */
function better(p: Built, best: Built): boolean {
  if (p.gym === null) return false;
  if (best.gym === null && p.core >= best.core) return true;
  if (p.core > best.core) return true;
  return best.gym !== null && p.core === best.core && (p.coreEnd ?? Infinity) < (best.coreEnd ?? Infinity);
}

/**
 * The day's plan. `wake` in plan minutes (see the file comment), `weekday` 0 for Sunday to
 * 6 for Saturday, `sunset` that day's Brooklyn sundown in minutes. Friday ends at sundown;
 * Saturday starts after it. The gym tries each start in GYM_STARTS and keeps the one that
 * fits the most core study, then finishes the core earliest.
 */
export function planDay(wake: number, weekday: number, sunset: number): DayPlan {
  let start = wake + GET_GOING;
  let stop = BED - WIND_DOWN;
  const notes: string[] = [];
  if (weekday === 5) {
    stop = Math.min(stop, sunset);
    notes.push(`Friday: the plan ends at sundown, ${fmtLong(sunset)}.`);
  }
  if (weekday === 6 && start < sunset) {
    notes.push(`Shabbat: the plan starts after sundown, ${fmtLong(sunset)}.`);
    start = sunset;
  }
  let best: Built | null = null;
  for (const g of [...GYM_STARTS, null]) {
    const p = build(g, start, stop);
    if (best === null || better(p, best)) best = p;
  }
  const chosen = best as Built;
  if (chosen.gym === null && weekday !== 6) notes.push('The gym window, 2:00 to 2:30 pm, has passed or does not fit today.');
  return { ...chosen, start, stop, notes };
}

// ---------------------------------------------------------------- Brooklyn sundown

/**
 * Sunset in Brooklyn on a calendar date, as a UTC timestamp, from the sunrise equation
 * (no network). Within a minute or two of published tables.
 */
export function sunsetUtcMs(y: number, m: number, d: number): number {
  const r = Math.PI / 180;
  const jd = Date.UTC(y, m - 1, d, 12) / 86400000 + 2440587.5;
  const n = Math.round(jd - 2451545.0 + 0.0008);
  const js = n - BROOKLYN.lon / 360;
  const M = (357.5291 + 0.98560028 * js) % 360;
  const C = 1.9148 * Math.sin(M * r) + 0.02 * Math.sin(2 * M * r) + 0.0003 * Math.sin(3 * M * r);
  const L = (M + C + 180 + 102.9372) % 360;
  const jt = 2451545.0 + js + 0.0053 * Math.sin(M * r) - 0.0069 * Math.sin(2 * L * r);
  const sd = Math.sin(L * r) * Math.sin(23.4397 * r);
  const cd = Math.cos(Math.asin(sd));
  const w = Math.acos((Math.sin(-0.833 * r) - Math.sin(BROOKLYN.lat * r) * sd) / (Math.cos(BROOKLYN.lat * r) * cd)) / r;
  return (jt + w / 360 - 2440587.5) * 86400000;
}

const NY = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: 'numeric', minute: 'numeric', hourCycle: 'h23',
});

/** A timestamp's New York date (YYYY-MM-DD) and minutes after midnight. */
export function nyParts(ms: number): { date: string; minutes: number } {
  const o: Record<string, string> = {};
  for (const x of NY.formatToParts(new Date(ms))) o[x.type] = x.value;
  return { date: `${o.year}-${o.month}-${o.day}`, minutes: Number(o.hour) * 60 + Number(o.minute) };
}

function ymd(date: string): [number, number, number] {
  return [Number(date.slice(0, 4)), Number(date.slice(5, 7)), Number(date.slice(8, 10))];
}

/** Brooklyn sundown on a date (YYYY-MM-DD), in New York minutes after midnight. */
export function sunsetMinutes(date: string): number {
  return nyParts(sunsetUtcMs(...ymd(date))).minutes;
}

/** 0 for Sunday to 6 for Saturday. */
export function weekdayOf(date: string): number {
  const [y, m, d] = ymd(date);
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
}

/** A date `n` days after `date`. */
export function addDays(date: string, n: number): string {
  const [y, m, d] = ymd(date);
  return new Date(Date.UTC(y, m - 1, d + n, 12)).toISOString().slice(0, 10);
}

/** Whether a string is a real YYYY-MM-DD date. */
export function isDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && addDays(s, 0) === s;
}

/** The plan for a date and a wake time in plan minutes. */
export function planFor(date: string, wake: number): DayPlan {
  return planDay(wake, weekdayOf(date), sunsetMinutes(date));
}

// ---------------------------------------------------------------- the clock

/** The plan's day a moment belongs to: its New York date, or the day before until 5:00 am. */
export function planDate(ms: number): string {
  const { date, minutes } = nyParts(ms);
  return minutes < DAY_ROLLOVER ? addDays(date, -1) : date;
}

/** A moment in plan minutes on its plan's day: after midnight runs past 1440. */
export function planMinute(ms: number): number {
  const { minutes } = nyParts(ms);
  return minutes < DAY_ROLLOVER ? minutes + 1440 : minutes;
}

/** A time input's HH:MM as plan minutes (before 5:00 am is the night before), or null if it is not a time. */
export function parseClock(s: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(s);
  if (m === null) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h > 23 || mi > 59) return null;
  const v = h * 60 + mi;
  return v < DAY_ROLLOVER ? v + 1440 : v;
}

/** Plan minutes as a time input's HH:MM. */
export function clockValue(m: number): string {
  const x = ((m % 1440) + 1440) % 1440;
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${pad(Math.floor(x / 60))}:${pad(x % 60)}`;
}

// ---------------------------------------------------------------- filling the blocks

export type ItemKind = 'lesson' | 'review' | 'quiz' | 'redo';

export interface Fillable {
  kind: ItemKind;
  minutes: number;
}

export interface Block {
  minutes: number;
  heavy: boolean;
  optional: boolean;
}

const HEAVY_ORDER: readonly ItemKind[] = ['lesson', 'redo', 'quiz'];
const LIGHT_ORDER: readonly ItemKind[] = ['review', 'quiz', 'redo'];

/**
 * Puts the queue into the day's study blocks, keeping each kind's order. Full core blocks
 * take new lessons, then redos and quizzes, from the earliest block on; light blocks and
 * optional time take reviews, then quizzes and redos. What is left (reviews on a day with
 * no light block, say) then goes to the first block with room, core before optional.
 * A block takes items while they fit; an empty block takes one item even if it is longer.
 * `left` holds what fits nowhere.
 */
export function fillBlocks<T extends Fillable>(blocks: readonly Block[], items: readonly T[]): { filled: T[][]; left: T[] } {
  const queue = new Map<ItemKind, T[]>((['lesson', 'review', 'quiz', 'redo'] as const).map((k) => [k, items.filter((x) => x.kind === k)]));
  const filled: T[][] = blocks.map(() => []);
  const used: number[] = blocks.map(() => 0);
  const take = (i: number, kinds: readonly ItemKind[]): void => {
    const b = blocks[i] as Block;
    const out = filled[i] as T[];
    for (const k of kinds) {
      const q = queue.get(k) as T[];
      while (q.length > 0 && (out.length === 0 || (used[i] as number) + (q[0] as T).minutes <= b.minutes)) {
        const x = q.shift() as T;
        out.push(x);
        used[i] = (used[i] as number) + x.minutes;
      }
    }
  };
  blocks.forEach((b, i) => take(i, b.heavy ? HEAVY_ORDER : LIGHT_ORDER));
  const rest: readonly ItemKind[] = ['lesson', 'redo', 'quiz', 'review'];
  const order = [...blocks.keys()].sort((a, b) => Number((blocks[a] as Block).optional) - Number((blocks[b] as Block).optional) || a - b);
  for (const i of order) take(i, rest);
  return { filled, left: [...queue.values()].flat() };
}

// ---------------------------------------------------------------- the week

/** The Sunday-to-Saturday dates of the week holding `date`. */
export function weekOf(date: string): string[] {
  const sunday = addDays(date, -weekdayOf(date));
  return Array.from({ length: 7 }, (_, i) => addDays(sunday, i));
}

/** Minutes of study and optional time ticked off on a day, from its plan and ticks (slot starts). */
export function tickedMinutes(plan: DayPlan, ticks: readonly number[]): number {
  const t = new Set(ticks);
  return plan.slots.filter((s) => (s.kind === 'study' || s.kind === 'optional') && t.has(s.start)).reduce((a, s) => a + s.end - s.start, 0);
}
