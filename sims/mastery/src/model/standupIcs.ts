/**
 * The standup as a calendar subscription (`standup.ics`, RFC 5545), written at build time by
 * the Vite plugin in vite.config.ts: Monday to Friday at the default 10:00 am New York
 * time, 15 minutes, an alert 10 minutes before, with every yom tov weekday excluded from a
 * year before the build (so the recent past reads right) to two years after it. A subscribed calendar fetches it again now and then, so
 * each build's exclusions reach it.
 *
 * Imports only pure modules with relative paths, so the build config can load it.
 */
import { yomTovBetween } from './holidays';
import { STANDUP_DEFAULT, STANDUP_LENGTH } from './standupSettings';

/** The first standup: the programme's first day (cohort.ts COHORT_START; a test keeps them equal). */
export const STANDUP_SERIES_START = '2026-09-08';
export const STANDUP_UID = 'nyms-standup@learnhub.mastery';
export const STANDUP_TITLE = 'NYMS standup';
export const ALARM_MINUTES = 10;
/** Years of yom tov exclusions written from the build date. */
export const EXCLUDE_YEARS = 2;

const TZID = 'America/New_York';
const CRLF = '\r\n';

const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  `TZID:${TZID}`,
  `X-LIC-LOCATION:${TZID}`,
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:-0500',
  'TZOFFSETTO:-0400',
  'TZNAME:EDT',
  'DTSTART:19700308T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:-0400',
  'TZOFFSETTO:-0500',
  'TZNAME:EST',
  'DTSTART:19701101T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
];

/** RFC 5545 3.3.11: backslash, semicolon, comma, and newline escaped in a TEXT value. */
export function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/**
 * RFC 5545 3.1: a content line longer than 75 octets is folded with CRLF and one space.
 * Breaks only between characters, so a UTF-8 sequence is never split.
 */
export function foldLine(line: string): string {
  const enc = new TextEncoder();
  const parts: string[] = [];
  let cur = '';
  let octets = 0;
  // The first line holds 75 octets; each continuation, after its leading space, 74.
  let limit = 75;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (octets + n > limit) {
      parts.push(cur);
      cur = '';
      octets = 0;
      limit = 74;
    }
    cur += ch;
    octets += n;
  }
  parts.push(cur);
  return parts.join(`${CRLF} `);
}

const compact = (date: string): string => date.replace(/-/g, '');
const clock = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}${String(minutes % 60).padStart(2, '0')}00`;
const localTime = (date: string, minutes: number): string => `${compact(date)}T${clock(minutes)}`;
const utcStamp = (ms: number): string => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

const isWeekday = (date: string): boolean => {
  const d = new Date(`${date}T12:00:00Z`).getUTCDay();
  return d >= 1 && d <= 5;
};

/** The yom tov weekdays from a year before `today` (not before the series) to `EXCLUDE_YEARS` years after. */
export function excludedDates(today: string): string[] {
  const y = Number(today.slice(0, 4));
  const back = `${y - 1}${today.slice(4)}`;
  const start = back < STANDUP_SERIES_START ? STANDUP_SERIES_START : back;
  return yomTovBetween(start, `${y + EXCLUDE_YEARS}${today.slice(4)}`).map((h) => h.date).filter(isWeekday);
}

/** The calendar file, CRLF line endings, folded. `now` stamps it and starts the exclusions. */
export function standupIcs(now: number): string {
  const today = new Date(now).toISOString().slice(0, 10);
  const at = STANDUP_DEFAULT;
  const ex = excludedDates(today);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//New York Mathematical Society//Standup//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(STANDUP_TITLE)}`,
    `X-WR-TIMEZONE:${TZID}`,
    ...VTIMEZONE,
    'BEGIN:VEVENT',
    `UID:${STANDUP_UID}`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART;TZID=${TZID}:${localTime(STANDUP_SERIES_START, at)}`,
    `DURATION:PT${STANDUP_LENGTH}M`,
    'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
    ...(ex.length === 0 ? [] : [`EXDATE;TZID=${TZID}:${ex.map((d) => localTime(d, at)).join(',')}`]),
    `SUMMARY:${escapeText(STANDUP_TITLE)}`,
    `DESCRIPTION:${escapeText('The New York Mathematical Society programme\'s daily standup, 15 minutes. Not held on Shabbat or yom tov.')}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(STANDUP_TITLE)}`,
    `TRIGGER:-PT${ALARM_MINUTES}M`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(foldLine).join(CRLF) + CRLF;
}
