import { describe, expect, it } from 'vitest';
import { COHORT_START } from './cohort';
import { STANDUP_DEFAULT } from './standup';
import { STANDUP_SERIES_START, STANDUP_UID, excludedDates, foldLine, standupIcs } from './standupIcs';

const BUILD = Date.UTC(2026, 9, 7, 15, 30);
const ics = standupIcs(BUILD);
/** The content lines, unfolded (RFC 5545 3.1). */
const lines = ics.replace(/\r\n /g, '').split('\r\n');
const value = (name: string): string[] => lines.filter((l) => l.startsWith(`${name}:`) || l.startsWith(`${name};`));

describe('standup.ics', () => {
  it('uses CRLF line endings only, and ends with one', () => {
    expect(ics.endsWith('\r\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
  });

  it('folds every physical line to at most 75 octets', () => {
    const enc = new TextEncoder();
    for (const l of ics.split('\r\n')) expect(enc.encode(l).length).toBeLessThanOrEqual(75);
    // The exclusions are long enough to need folding.
    expect(ics).toContain('\r\n ');
    // Folding never splits a character, and unfolds to the original.
    const long = `DESCRIPTION:${'é'.repeat(60)}`;
    const folded = foldLine(long);
    for (const l of folded.split('\r\n')) expect(enc.encode(l).length).toBeLessThanOrEqual(75);
    expect(folded.replace(/\r\n /g, '')).toBe(long);
  });

  it('is one weekly event, Monday to Friday at 10:00 am New York time, 15 minutes, with a stable UID', () => {
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(value('VERSION')).toEqual(['VERSION:2.0']);
    expect(lines.filter((l) => l === 'BEGIN:VEVENT')).toHaveLength(1);
    expect(value('UID')).toEqual([`UID:${STANDUP_UID}`]);
    expect(standupIcs(BUILD + 86_400_000)).toContain(`UID:${STANDUP_UID}`);
    expect(value('SUMMARY')).toEqual(['SUMMARY:NYMS standup']);
    expect(value('RRULE')).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR');
    expect(value('DTSTART')).toContain('DTSTART;TZID=America/New_York:20260908T100000');
    expect(STANDUP_DEFAULT).toBe(600);
    expect(value('DURATION')).toEqual(['DURATION:PT15M']);
    expect(value('DTSTAMP')).toEqual(['DTSTAMP:20261007T153000Z']);
  });

  it('carries the America/New_York VTIMEZONE', () => {
    const tz = lines.slice(lines.indexOf('BEGIN:VTIMEZONE'), lines.indexOf('END:VTIMEZONE') + 1);
    expect(tz).toContain('TZID:America/New_York');
    expect(tz).toContain('RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU');
    expect(tz).toContain('RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU');
    expect(tz).toContain('TZOFFSETTO:-0400');
    expect(tz).toContain('TZOFFSETTO:-0500');
  });

  it('alerts 10 minutes before', () => {
    const alarm = lines.slice(lines.indexOf('BEGIN:VALARM'), lines.indexOf('END:VALARM') + 1);
    expect(alarm).toContain('TRIGGER:-PT10M');
    expect(alarm).toContain('ACTION:DISPLAY');
    expect(alarm.some((l) => l.startsWith('DESCRIPTION:'))).toBe(true);
  });

  it('excludes every yom tov weekday from the series start (or a year back) to two years after the build', () => {
    const ex = value('EXDATE');
    expect(ex).toHaveLength(1);
    const dates = (ex[0] as string).replace('EXDATE;TZID=America/New_York:', '').split(',');
    expect(dates.every((d) => /^\d{8}T100000$/.test(d))).toBe(true);
    const iso = dates.map((d) => `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`);
    expect(iso).toEqual(excludedDates('2026-10-07'));
    // Yom Kippur 2026 (Monday), Pesach 2027 (Thursday, Friday; then Wednesday, Thursday), Yom Kippur 2027, Pesach 2028.
    expect(iso).toEqual(expect.arrayContaining(['2026-09-21', '2027-04-22', '2027-04-23', '2027-04-28', '2027-04-29', '2027-10-11', '2028-04-11']));
    // Weekends are never in the series, so never excluded; days past the window are not either.
    expect(iso).not.toContain('2027-06-12');
    expect(iso.every((d) => d >= STANDUP_SERIES_START && d <= '2028-10-07')).toBe(true);
    // Rosh Hashanah 2026 was a weekend; Shemini Atzeret 2026 a Saturday.
    expect(iso).not.toContain('2026-09-12');
    // Built later, the window moves: a year back, two years on.
    expect(excludedDates('2029-01-01')[0]).toBe('2028-04-11');
    // Simchat Torah 2028, Friday 2028-10-13, is past the window.
    expect(iso).not.toContain('2028-10-13');
  });

  it('starts on the programme\'s first day', () => {
    expect(STANDUP_SERIES_START).toBe(COHORT_START);
  });
});
