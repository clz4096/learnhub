/**
 * The Jewish holidays kept as rest days, like Shabbat: the full yom tov days of the diaspora
 * calendar (Brooklyn), computed on the device from the Hebrew date with Intl's `hebrew`
 * calendar (no table to go stale, no dependency).
 *
 * Rosh Hashanah (1 and 2 Tishrei), Yom Kippur (10 Tishrei), Sukkot (15 and 16 Tishrei),
 * Shemini Atzeret (22 Tishrei), Simchat Torah (23 Tishrei), Pesach (15, 16, 21 and 22
 * Nisan), Shavuot (6 and 7 Sivan). None of these months is Adar, so the leap month never
 * shifts them; the month is matched by name, which the leap year does not change.
 *
 * A rest day runs from sundown the evening before to sundown on the day (the app's Brooklyn
 * sundown, as for Shabbat). Pure: no clock, storage, or DOM. Where the browser has no Hebrew
 * calendar, no holiday is found and only Shabbat is kept.
 */

export type YomTov = 'Rosh Hashanah' | 'Yom Kippur' | 'Sukkot' | 'Shemini Atzeret' | 'Simchat Torah' | 'Pesach' | 'Shavuot';

/** Something that says whether a date is a holiday: a Set of dates, or YOM_TOV. */
export interface Holidays {
  has(date: string): boolean;
}

/** The month as CLDR names it in English ("Tishri", "Nisan", "Sivan"), and the yom tov days in it. */
const DAYS: readonly { month: RegExp; days: Readonly<Record<number, YomTov>> }[] = [
  {
    month: /^Tishr/,
    days: { 1: 'Rosh Hashanah', 2: 'Rosh Hashanah', 10: 'Yom Kippur', 15: 'Sukkot', 16: 'Sukkot', 22: 'Shemini Atzeret', 23: 'Simchat Torah' },
  },
  { month: /^Nisan/, days: { 15: 'Pesach', 16: 'Pesach', 21: 'Pesach', 22: 'Pesach' } },
  { month: /^Sivan/, days: { 6: 'Shavuot', 7: 'Shavuot' } },
];

function hebrewFormat(): Intl.DateTimeFormat | null {
  try {
    const f = new Intl.DateTimeFormat('en-u-ca-hebrew', { timeZone: 'UTC', day: 'numeric', month: 'long' });
    return f.resolvedOptions().calendar === 'hebrew' ? f : null;
  } catch {
    return null;
  }
}

let format: Intl.DateTimeFormat | null | undefined;
const memo = new Map<string, YomTov | null>();

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** The Hebrew month's English name and the day of the month for a civil date, or null. */
export function hebrewDate(date: string): { month: string; day: number } | null {
  if (!DATE.test(date)) return null;
  if (format === undefined) format = hebrewFormat();
  if (format === null) return null;
  // Noon UTC: the civil date's daytime whatever the device's zone. ICU turns the Hebrew day
  // at midnight, not sundown, so this is the Hebrew date of the day itself.
  const ms = Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)), 12);
  let month = '';
  let day = Number.NaN;
  for (const p of format.formatToParts(new Date(ms))) {
    if (p.type === 'month') month = p.value;
    else if (p.type === 'day') day = Number(p.value);
  }
  return month === '' || !Number.isInteger(day) ? null : { month, day };
}

/** The yom tov on a civil date (YYYY-MM-DD), or null. */
export function yomTovOf(date: string): YomTov | null {
  const hit = memo.get(date);
  if (hit !== undefined) return hit;
  const h = hebrewDate(date);
  const name = h === null ? null : DAYS.find((m) => m.month.test(h.month))?.days[h.day] ?? null;
  memo.set(date, name);
  return name;
}

export const isYomTov = (date: string): boolean => yomTovOf(date) !== null;

/** Every yom tov, as a holiday set for the standup schedule. */
export const YOM_TOV: Holidays = { has: isYomTov };

const addDay = (date: string, n: number): string => {
  const ms = Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)) + n, 12);
  return new Date(ms).toISOString().slice(0, 10);
};
const isSaturday = (date: string): boolean =>
  new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)), 12)).getUTCDay() === 6;

/** The rest day a date is (its yom tov, else "Shabbat" on a Saturday), or null for a working day. */
export function restOf(date: string): string | null {
  return yomTovOf(date) ?? (isSaturday(date) ? 'Shabbat' : null);
}

/** The yom tov days from `from` to `to`, both included, in order. */
export function yomTovBetween(from: string, to: string): { date: string; name: YomTov }[] {
  const out: { date: string; name: YomTov }[] = [];
  if (!DATE.test(from) || !DATE.test(to)) return out;
  for (let d = from; d <= to; d = addDay(d, 1)) {
    const name = yomTovOf(d);
    if (name !== null) out.push({ date: d, name });
  }
  return out;
}
