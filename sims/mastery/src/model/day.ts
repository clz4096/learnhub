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
 * at the end of a free stretch with nothing after it. Added since: fixed blocks (timed
 * papers) placed first, and replanning the rest of the day from a given time.
 */
import { restOf } from './holidays';
import type { Route } from './route';

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

/** `meeting`: a fixed block pinned at a time (the cohort's standup); not study. */
export type SlotKind = 'study' | 'optional' | 'gym' | 'meal' | 'break' | 'meeting';

/**
 * A block of a set length placed first in the day, before the 90-minute blocks, and
 * counted as core study: a timed paper, say 180 minutes for a STEP paper, 150 for a TMUA
 * sitting, or 120 or 90 for an A level paper. The queue never fills it.
 */
export interface FixedBlock {
  minutes: number;
  /**
   * Pinned at this plan minute, as a meeting (the standup): placed where it is, not counted
   * as study, and dropped when the day has not started by then or something kept is there.
   */
  at?: number;
  title: string;
  /** A line under the title. */
  detail?: string;
  /** Where the block's link goes, if it has one. */
  to?: Route;
}

/** A fixed block as placed. `index` is its place in the list given to the planner, so a replan can tell which are done. */
export interface PlacedFixed extends FixedBlock {
  index: number;
}

export interface Slot {
  start: number;
  end: number;
  kind: SlotKind;
  title: string;
  detail: string;
  /** A full core block (90 minutes, or the last of the core and at least 60): new material goes here. Light blocks get reviews. */
  heavy: boolean;
  /** Set on a study slot that is a fixed block, and on a meeting. */
  fixed?: PlacedFixed;
}

export interface DayPlan {
  /** In time order: study, optional, breaks, the gym, and meals. */
  slots: Slot[];
  /** Core minutes planned: at most CORE, unless fixed blocks alone pass it. */
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

const GYM_NOTE = 'The gym window, 2:00 to 2:30 pm, has passed or does not fit today.';
const LUNCH_TITLE = 'Lunch';
const unplacedNote = (f: FixedBlock): string =>
  (f.at === undefined ? `${f.title}, ${f.minutes} minutes, does not fit today.` : `${f.title} at ${fmtLong(f.at)} does not fit today.`);
const REPLANNED = 'Replanned from ';

/** What a build starts from: an empty day, or for a replan, the slots that stay. */
interface Ctx {
  start: number;
  stop: number;
  /** Slots that stay as they are: past, in progress, or ticked. Nothing new overlaps them. */
  kept: readonly Slot[];
  /** Whether to place the gym, lunch, and dinner. */
  gym: boolean;
  lunch: boolean;
  dinner: boolean;
  fixed: readonly PlacedFixed[];
  /** Pinned blocks may start from here: the wake time, or a replan's time. */
  pinFrom: number;
}

interface Built { slots: Slot[]; core: number; optional: number; coreEnd: number | null; gym: number | null; unplaced: PlacedFixed[] }

const minutesOf = (slots: readonly Slot[], kind: SlotKind): number => slots.filter((s) => s.kind === kind).reduce((a, s) => a + s.end - s.start, 0);

function coreEndOf(slots: readonly Slot[]): number | null {
  let sum = 0;
  for (const s of slots) {
    if (s.kind !== 'study') continue;
    sum += s.end - s.start;
    if (sum >= CORE) return s.end;
  }
  return null;
}

function build(g: number | null, c: Ctx): Built {
  const b = buildOnce(g, c);
  // Blocks were kept short to leave core time for the fixed blocks; those that did not fit give it back.
  return b.unplaced.length === 0 ? b : { ...buildOnce(g, { ...c, fixed: c.fixed.filter((f) => !b.unplaced.includes(f)) }), unplaced: b.unplaced };
}

function buildOnce(g: number | null, c: Ctx): Built {
  const { start, stop } = c;
  const kept = c.kept.filter((s) => s.end > start);
  // Pinned blocks first, where they are: everything else is placed around them.
  const pins: Slot[] = [];
  const unpinned: PlacedFixed[] = [];
  for (const f of c.fixed) {
    if (f.at === undefined) continue;
    const a = f.at;
    const b = a + f.minutes;
    const free = c.pinFrom <= a && b <= stop && [...kept, ...pins].every((x) => x.end <= a || x.start >= b);
    if (free) pins.push({ start: a, end: b, kind: 'meeting', title: f.title, detail: f.detail ?? '', heavy: false, fixed: f });
    else unpinned.push(f);
  }
  const obstacles = [...kept, ...pins];
  const clear = (a: number, b: number): boolean => start <= a && b <= stop && obstacles.every((x) => x.end <= a || x.start >= b);
  const fixed = (s: number, e: number, kind: SlotKind, title: string, detail = ''): Slot => ({ start: s, end: e, kind, title, detail, heavy: false });
  const events: Slot[] = [...pins];
  const gymOk = c.gym && g !== null && clear(g, g + GYM);
  if (gymOk && g !== null) {
    if (c.lunch && clear(g - LUNCH, g)) events.push(fixed(g - LUNCH, g, 'meal', LUNCH_TITLE));
    else if (c.lunch && clear(g + GYM, g + GYM + LUNCH)) events.push(fixed(g + GYM, g + GYM + LUNCH, 'meal', LUNCH_TITLE, 'After the gym today'));
    events.push(fixed(g, g + GYM, 'gym', 'Gym', '90 minutes including travel'));
  }
  if (c.dinner && clear(DINNER, DINNER + DINNER_LENGTH)) events.push(fixed(DINNER, DINNER + DINNER_LENGTH, 'meal', 'Dinner'));
  const busy = [...kept, ...events].sort((a, b) => a.start - b.start);

  const free: [number, number][] = [];
  let t = start;
  for (const x of busy) {
    if (x.start > t) free.push([t, x.start]);
    t = Math.max(t, x.end);
  }
  if (stop > t) free.push([t, stop]);

  const items: Slot[] = [];
  const pending = c.fixed.filter((f) => f.at === undefined);
  let core = minutesOf(c.kept, 'study');
  let optional = minutesOf(c.kept, 'optional');
  for (const [from, to] of free) {
    let u = from;
    for (;;) {
      const room = to - u;
      const f = pending[0];
      // Core left for ordinary blocks once the fixed blocks still to place have theirs.
      const need = CORE - core - pending.reduce((a, x) => a + x.minutes, 0);
      if (f !== undefined && f.minutes <= room) {
        // Fixed blocks go first, in the order given, in the first stretch with room.
        pending.shift();
        items.push({ start: u, end: u + f.minutes, kind: 'study', title: f.title, detail: f.detail ?? '', heavy: true, fixed: f });
        core += f.minutes;
        u += f.minutes;
      } else if (need > 0 && room >= Math.min(MIN_BLOCK, need)) {
        const len = Math.min(room, BLOCK, need);
        const heavy = len >= BLOCK || (len === need && len >= 60);
        items.push({ start: u, end: u + len, kind: 'study', title: heavy ? 'Study block' : 'Reviews', detail: '', heavy });
        core += len;
        u += len;
      } else if (need <= 0 && pending.length === 0 && optional < OPTIONAL && room >= MIN_LIGHT) {
        const len = Math.min(room, BLOCK, OPTIONAL - optional);
        items.push({ start: u, end: u + len, kind: 'optional', title: 'Light study', detail: 'Reviews and reading ahead. Skip it when tired.', heavy: false });
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
  const slots = [...c.kept, ...items, ...events].sort((a, b) => a.start - b.start);
  return { slots, core, optional, coreEnd: coreEndOf(slots), gym: gymOk ? g : null, unplaced: [...unpinned, ...pending] };
}

/** Whether `p` beats `best`: a gym that fits, then every fixed block placed, then more core, then the core done earlier. */
function better(p: Built, best: Built): boolean {
  if (p.gym === null) return false;
  if (best.gym === null) return p.core >= best.core;
  if (p.unplaced.length !== best.unplaced.length) return p.unplaced.length < best.unplaced.length;
  if (p.core !== best.core) return p.core > best.core;
  return (p.coreEnd ?? Infinity) < (best.coreEnd ?? Infinity);
}

/** The gym tries each start in GYM_STARTS and keeps the best build (see `better`). */
function choose(c: Ctx): Built {
  let best: Built | null = null;
  for (const g of [...GYM_STARTS, null]) {
    const p = build(g, c);
    if (best === null || better(p, best)) best = p;
  }
  return best as Built;
}

/** Rest days by name ("Shabbat", "Rosh Hashanah"), or null for a working day. */
export interface RestDays {
  today: string | null;
  tomorrow: string | null;
}

const placed = (fixed: readonly FixedBlock[]): PlacedFixed[] => fixed.map((f, index) => ({ ...f, index }));

/**
 * The day's plan. `wake` in plan minutes (see the file comment), `weekday` 0 for Sunday to
 * 6 for Saturday, `sunset` that day's Brooklyn sundown in minutes. A day before a rest day
 * (Friday, or the eve of a yom tov) ends at sundown; a rest day (Saturday, a yom tov) starts
 * after it, and a rest day followed by another has no plan. `rest` names the rest days, today
 * and tomorrow (holidays.ts `restOf`); without it, Saturday is today's and Friday's tomorrow's.
 * The gym tries each start in GYM_STARTS and keeps the one that
 * places every fixed block, then fits the most core study, then finishes the core
 * earliest. `fixed` blocks go first, in order, each in the earliest free stretch it fits.
 */
export function planDay(
  wake: number, weekday: number, sunset: number, fixed: readonly FixedBlock[] = [],
  rest: RestDays = { today: weekday === 6 ? 'Shabbat' : null, tomorrow: weekday === 5 ? 'Shabbat' : null },
): DayPlan {
  let start = wake + GET_GOING;
  let stop = BED - WIND_DOWN;
  const notes: string[] = [];
  if (rest.today !== null && rest.tomorrow !== null) {
    // Plain, no wishes (mastery/APP-LANGUAGE.md): "Shabbat. Nothing scheduled until Shabbat ends."
    notes.push(`${rest.today}, then ${rest.tomorrow}. Nothing scheduled until ${rest.tomorrow} ends.`);
    start = Math.max(start, sunset);
    stop = Math.min(stop, sunset);
  } else {
    if (rest.tomorrow !== null) {
      stop = Math.min(stop, sunset);
      notes.push(rest.tomorrow === 'Shabbat' && weekday === 5
        ? `Friday: the plan ends at sundown, ${fmtLong(sunset)}.`
        : `${rest.tomorrow} begins at sundown: the plan ends then, ${fmtLong(sunset)}.`);
    }
    if (rest.today !== null && start < sunset) {
      notes.push(`${rest.today}. Nothing scheduled until ${rest.today} ends.`);
      start = sunset;
    }
  }
  const chosen = choose({ start, stop, kept: [], gym: true, lunch: true, dinner: true, fixed: placed(fixed), pinFrom: wake });
  if (chosen.gym === null && rest.today === null) notes.push(GYM_NOTE);
  notes.push(...chosen.unplaced.map(unplacedNote));
  return { slots: chosen.slots, core: chosen.core, optional: chosen.optional, coreEnd: chosen.coreEnd, gym: chosen.gym, start, stop, notes };
}

/**
 * The rest of the day planned again from `at` (plan minutes), by the same rules as
 * `planDay`. Slots that are over, ticked (`ticks` holds slot starts), or a meal or the gym
 * already under way stay as they are; everything else from `at` on is planned afresh
 * around them, for the core and optional minutes still missing. The gym is placed again
 * only if it has not been kept, and lunch only with it. `fixed` must be the list `plan`
 * was made with; blocks of it not kept are placed again.
 */
export function replanDay(plan: DayPlan, at: number, ticks: readonly number[], fixed: readonly FixedBlock[] = []): DayPlan {
  const ticked = new Set(ticks);
  const keepGym = plan.slots.find((s) => s.kind === 'gym' && (ticked.has(s.start) || s.start <= at));
  const kept = plan.slots.filter((s) =>
    s.end <= at
    || (s.kind !== 'break' && ticked.has(s.start))
    || ((s.kind === 'gym' || s.kind === 'meal' || s.kind === 'meeting') && s.start <= at)
    // Lunch is placed around the gym, so it stays with a gym that stays.
    || (keepGym !== undefined && s.kind === 'meal' && s.title === LUNCH_TITLE));
  const has = (f: (s: Slot) => boolean): boolean => kept.some(f);
  const done = new Set(kept.flatMap((s) => (s.fixed === undefined ? [] : [s.fixed.index])));
  const start = Math.max(at, plan.start);
  const chosen = choose({
    start, stop: plan.stop, kept,
    gym: keepGym === undefined,
    lunch: !has((s) => s.kind === 'meal' && s.title === LUNCH_TITLE),
    dinner: !has((s) => s.kind === 'meal' && s.start === DINNER),
    fixed: placed(fixed).filter((f) => !done.has(f.index)),
    pinFrom: at,
  });
  const gym = keepGym?.start ?? chosen.gym;
  const dropped = new Set([GYM_NOTE, ...placed(fixed).map(unplacedNote)]);
  const notes = plan.notes.filter((n) => !dropped.has(n) && !n.startsWith(REPLANNED));
  if (gym === null && (plan.gym !== null || plan.notes.includes(GYM_NOTE))) notes.push(GYM_NOTE);
  notes.push(...chosen.unplaced.map(unplacedNote));
  notes.push(`${REPLANNED}${fmtLong(start)}.`);
  return { slots: chosen.slots, core: chosen.core, optional: chosen.optional, coreEnd: chosen.coreEnd, gym, start: plan.start, stop: plan.stop, notes };
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
export function planFor(date: string, wake: number, fixed: readonly FixedBlock[] = []): DayPlan {
  return planDay(wake, weekdayOf(date), sunsetMinutes(date), fixed, restDaysOf(date));
}

/** The rest days (Shabbat or a yom tov) on `date` and the day after, by name. */
export function restDaysOf(date: string): RestDays {
  return { today: restOf(date), tomorrow: restOf(addDays(date, 1)) };
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

/**
 * `mixed`: the day's blind mixed review (mixedReview.ts), a review block of its own.
 * `retest`: a cold retest of a mastered topic, or a topic that needs review after one
 * (rule 6, the engine's retest.ts): one Cambridge problem, no lesson first.
 */
export type ItemKind = 'lesson' | 'review' | 'quiz' | 'redo' | 'mixed' | 'retest';

export interface Fillable {
  kind: ItemKind;
  minutes: number;
}

export interface Block {
  minutes: number;
  heavy: boolean;
  optional: boolean;
}

// A retest comes first in either kind of block: it is short, and only fair cold, before the day's lessons.
const HEAVY_ORDER: readonly ItemKind[] = ['retest', 'lesson', 'redo', 'quiz'];
const LIGHT_ORDER: readonly ItemKind[] = ['retest', 'review', 'mixed', 'quiz', 'redo'];

/**
 * Puts the queue into the day's study blocks, keeping each kind's order. Full core blocks
 * take new lessons, then redos and quizzes, from the earliest block on; light blocks and
 * optional time take reviews, then the mixed review, then quizzes and redos. What is left
 * (reviews on a day with no light block, say) then goes to the first block with room, core
 * before optional.
 * A block takes items while they fit; an empty block takes one item even if it is longer.
 * `left` holds what fits nowhere.
 */
export function fillBlocks<T extends Fillable>(blocks: readonly Block[], items: readonly T[]): { filled: T[][]; left: T[] } {
  const queue = new Map<ItemKind, T[]>((['retest', 'lesson', 'review', 'mixed', 'quiz', 'redo'] as const).map((k) => [k, items.filter((x) => x.kind === k)]));
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
  const rest: readonly ItemKind[] = ['retest', 'lesson', 'redo', 'quiz', 'review', 'mixed'];
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
