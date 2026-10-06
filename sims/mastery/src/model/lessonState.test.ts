// @vitest-environment jsdom
/**
 * Lesson places and write-up drafts on the device: kept in localStorage past the tab,
 * moved from the sessionStorage of earlier builds, reported to sync, cleared when the
 * lesson ends or the progress document shows it finished, and dropped after 60 days.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_COURSES, startLearner } from './learner';
import { onLearnerChange } from './learnerChange';
import {
  DRAFT_TTL_MS, PLACE_KEY, SALT_KEY, WRITEUP_KEY, clearLearnSalt, clearPlace, learnSalt, loadPlace, loadPlaces, loadWriteUp,
  placeEntry, savePlace, saveWriteUp, type LessonPlace,
} from './lessonState';
import { progress, setClock } from './store';

const T0 = new Date(2026, 9, 6, 9, 0).getTime();
const MIN = 60_000;
const DAY = 24 * 60 * MIN;
let t = T0;
const TOPIC = 'pre.fractions';
const KEY = `lesson-1-0.${TOPIC}`;
const PLACE: LessonPlace = { stage: 'practice', practice: { attempts: 2, streak: 1, results: [false, true] }, section: 0, furthest: 3 };

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  t = T0;
  setClock(() => t);
  progress.value = startLearner(T0 - DAY, DEFAULT_COURSES, 60);
});
afterEach(() => {
  progress.value = null;
});

/** The progress document with a lesson on `topicId` ended at `at`. */
function finished(topicId: string, at: number): void {
  const p = progress.value!;
  progress.value = { ...p, history: [...p.history, { at, kind: 'lesson', topicId, correct: true }] };
}

describe('a lesson place', () => {
  it('outlives the tab: kept in localStorage with the time it was saved, and reported to sync', () => {
    const seen: string[] = [];
    const off = onLearnerChange((c) => seen.push(c.part));
    savePlace(KEY, PLACE);
    off();
    sessionStorage.clear();
    expect(loadPlace(KEY)).toEqual(PLACE);
    expect(JSON.parse(localStorage.getItem(PLACE_KEY) ?? 'null')).toEqual({ [KEY]: { updatedAt: T0, place: PLACE } });
    expect(seen).toEqual(['lesson']);
  });

  it('a save always stamps after the entry it replaces, even when the clock went back', () => {
    savePlace(KEY, PLACE);
    t = T0 - 5 * MIN;
    savePlace(KEY, { ...PLACE, stage: 'cambridge' });
    expect(placeEntry(KEY)).toMatchObject({ updatedAt: T0 + 1, place: { stage: 'cambridge' } });
  });

  it('finishing leaves a cleared entry, so an older copy from another device cannot bring it back', () => {
    savePlace(KEY, PLACE);
    t = T0 + MIN;
    clearPlace(KEY);
    expect(loadPlace(KEY)).toBeNull();
    expect(placeEntry(KEY)).toEqual({ updatedAt: T0 + MIN, place: null });
  });

  it('a place saved before the lesson last ended in the progress document is not resumed', () => {
    savePlace(KEY, PLACE);
    finished(TOPIC, T0 + MIN);
    expect(loadPlace(KEY)).toBeNull();
    expect(placeEntry(KEY)).toEqual({ updatedAt: T0 + 1, place: null });
    // A lesson begun again after that finish resumes.
    t = T0 + 2 * MIN;
    savePlace(KEY, PLACE);
    expect(loadPlace(KEY)).toEqual(PLACE);
  });

  it('is dropped after 60 days untouched', () => {
    savePlace(KEY, PLACE);
    t = T0 + DRAFT_TTL_MS;
    expect(loadPlace(KEY)).toEqual(PLACE);
    t = T0 + DRAFT_TTL_MS + 1;
    expect(loadPlaces()).toEqual({});
  });

  it('ignores what does not parse', () => {
    localStorage.setItem(PLACE_KEY, JSON.stringify({ [KEY]: { updatedAt: T0, place: { stage: 'nowhere' } }, other: 'x' }));
    expect(loadPlaces()).toEqual({});
    localStorage.setItem(PLACE_KEY, '{');
    expect(loadPlace(KEY)).toBeNull();
  });
});

describe('moving from sessionStorage', () => {
  it('moves places, write-ups and map salts once, keeps what localStorage already has, and reports it', () => {
    sessionStorage.setItem(`mastery.lesson.${KEY}`, JSON.stringify(PLACE));
    sessionStorage.setItem('mastery.lesson.learn-5.pre.ratio', JSON.stringify({ stage: 'learn', practice: { attempts: 0, streak: 0, results: [] }, section: 2 }));
    sessionStorage.setItem('mastery.lesson.bad.x', '{');
    sessionStorage.setItem('mastery.lesson.writeup.pre.ratio.q1', 'Half of it.');
    sessionStorage.setItem('mastery.lesson.salt.pre.ratio', 'learn-5');
    localStorage.setItem(PLACE_KEY, JSON.stringify({ 'learn-5.pre.ratio': { updatedAt: T0 - MIN, place: { stage: 'examples', practice: { attempts: 0, streak: 0, results: [] } } } }));
    const seen: string[] = [];
    const off = onLearnerChange((c) => seen.push(c.part));
    expect(loadPlace(KEY)).toEqual(PLACE);
    off();
    expect(seen).toEqual(['lesson']);
    expect(placeEntry(KEY)?.updatedAt).toBe(T0);
    expect(loadPlace('learn-5.pre.ratio')?.stage).toBe('examples');
    expect(loadWriteUp('pre.ratio', 'q1')).toBe('Half of it.');
    expect(JSON.parse(localStorage.getItem(SALT_KEY) ?? 'null')).toEqual({ 'pre.ratio': 'learn-5' });
    expect(sessionStorage.length).toBe(0);
  });
});

describe('the map lesson salt', () => {
  it('is kept on the device until the lesson ends', () => {
    expect(learnSalt(TOPIC, T0)).toBe(`learn-${T0}`);
    expect(learnSalt(TOPIC, T0 + MIN)).toBe(`learn-${T0}`);
    clearLearnSalt(TOPIC);
    expect(learnSalt(TOPIC, T0 + MIN)).toBe(`learn-${T0 + MIN}`);
  });

  it('follows a lesson begun on another device: the latest unfinished map-lesson place for the topic', () => {
    expect(learnSalt(TOPIC, T0)).toBe(`learn-${T0}`);
    savePlace(`learn-7.${TOPIC}`, PLACE);
    t = T0 + MIN;
    savePlace(`learn-9.${TOPIC}`, PLACE);
    savePlace(`lesson-1-0.${TOPIC}`, PLACE);
    expect(learnSalt(TOPIC, T0 + 2 * MIN)).toBe('learn-9');
    t = T0 + 2 * MIN;
    clearPlace(`learn-9.${TOPIC}`);
    expect(learnSalt(TOPIC, T0 + 3 * MIN)).toBe('learn-7');
  });

  it('starts afresh when this device\'s salt belongs to a lesson finished elsewhere', () => {
    expect(learnSalt(TOPIC, T0)).toBe(`learn-${T0}`);
    savePlace(`learn-${T0}.${TOPIC}`, PLACE);
    finished(TOPIC, T0 + MIN);
    expect(learnSalt(TOPIC, T0 + 2 * MIN)).toBe(`learn-${T0 + 2 * MIN}`);
  });
});

describe('write-up drafts', () => {
  it('are kept with their time, cleared when emptied, and dropped after 60 days', () => {
    saveWriteUp(TOPIC, 'q1', 'First line.');
    sessionStorage.clear();
    expect(loadWriteUp(TOPIC, 'q1')).toBe('First line.');
    t = T0 + MIN;
    saveWriteUp(TOPIC, 'q1', '');
    expect(loadWriteUp(TOPIC, 'q1')).toBe('');
    expect(JSON.parse(localStorage.getItem(WRITEUP_KEY) ?? 'null')).toEqual({ [`${TOPIC}.q1`]: { updatedAt: T0 + MIN, text: '' } });
    t = T0 + MIN + DRAFT_TTL_MS + 1;
    expect(loadWriteUp(TOPIC, 'q1')).toBe('');
    saveWriteUp(TOPIC, 'q2', 'x');
    expect(Object.keys(JSON.parse(localStorage.getItem(WRITEUP_KEY) ?? 'null') as object)).toEqual([`${TOPIC}.q2`]);
  });
});
